using System.Collections.Generic;
using System.Text.RegularExpressions;
using Newtonsoft.Json.Linq;
using SecondFace.Core.State;

namespace SecondFace.Core.World
{
    /// <summary>
    /// The closing pages (pure rules; Game <c>EpilogueScreen</c> shows them). The content's epilogue is one narrator tree
    /// built from slide data: each page enters a node that fires the <c>slide</c> event (<see cref="SlideData"/>: where its
    /// still is composed and in what light) and records the page shown in a flag of its own; "next" and "skip" are exits
    /// that ask for the same tree again (the tree's start list routes to the next page that applies, so an interrupted
    /// epilogue resumes at the first page not yet shown); the closing page's one choice fires <c>credits</c>. The game
    /// keeps one screen across the pages (the tree reopened in place, no flicker between them), keeps a save at each page
    /// turned, and marks the game as being in its epilogue (<see cref="OpenFlag"/>) so a load sets the player straight back
    /// on the page they stood at (<see cref="Resumes"/>).
    /// </summary>
    public static class Epilogue
    {
        /// <summary>The content's epilogue tree.</summary>
        public const string Tree = "d_a3_epilogue";
        /// <summary>The game's own flag while the epilogue is open (set as it opens, cleared when the credits roll).</summary>
        public const string OpenFlag = "epilogue.open";

        /// <summary>The epilogue is under way in this game: a load reopens it at once.</summary>
        public static bool Resumes(GameState g) => g != null && g.Flags.ContainsKey(OpenFlag);

        /// <summary>A conversation asked for is the epilogue (shown on its own screen).</summary>
        public static bool Is(string tree) => tree == Tree;

        /// <summary>A choice's effects ask for the same tree again (the page turns in place).</summary>
        public static bool Reopens(JArray effects, string tree)
        {
            if (effects == null) return false;
            foreach (var e in effects)
                if (e is JObject o && (string)o["event"] == "dialogue" && (string)o["data"]?["tree"] == tree) return true;
            return false;
        }

        /// <summary>A choice's effects roll the credits.</summary>
        public static bool RollsCredits(JArray effects)
        {
            if (effects == null) return false;
            foreach (var e in effects)
                if (e is JObject o && (string)o["event"] == "credits") return true;
            return false;
        }
    }

    /// <summary>The <c>slide</c> event's data: the still a page is shown beside (a map and one of its spots, the people
    /// in it while their condition holds, the player aged by some years, the light and the weather).</summary>
    public sealed class SlideData
    {
        public string Slide, Variant;
        /// <summary>The map the still is composed on, and the spot on it.</summary>
        public string Place, Spot;
        public List<(string Npc, JToken If)> People = new();
        /// <summary>The player in the still, aged this many years (null: not in it).</summary>
        public double? PcYears;
        /// <summary>Who stands beside the player in the still (null: nobody).</summary>
        public string PcWith;
        /// <summary>dawn, day, dusk or night (null: the clock's own).</summary>
        public string Light;
        /// <summary>A weather by name (null: the day's own).</summary>
        public string Weather;

        public static SlideData From(JToken data)
        {
            if (data == null || data.Type != JTokenType.Object) return null;
            var s = new SlideData
            {
                Slide = (string)data["slide"], Variant = (string)data["variant"],
                Place = (string)data["place"], Spot = (string)data["spot"],
                Light = (string)data["light"], Weather = (string)data["weather"],
            };
            if (data["people"] is JArray people)
                foreach (var p in people)
                {
                    var npc = (string)p?["npc"];
                    if (!string.IsNullOrEmpty(npc)) s.People.Add((npc, p["if"]));
                }
            if (data["pc"] is JObject pc)
            {
                s.PcYears = (double?)pc["years"] ?? 0;
                s.PcWith = (string)pc["with"];
            }
            return string.IsNullOrEmpty(s.Place) ? null : s;
        }

        /// <summary>The people standing in the still in this game (their conditions tested now).</summary>
        public List<string> Present(GameState g)
        {
            var who = new List<string>();
            foreach (var (npc, cond) in People)
                if (cond == null || cond.Type == JTokenType.Null || Logic.Test(cond, g)) who.Add(npc);
            return who;
        }

        /// <summary>The hour the still is lit at (null: the clock's own).</summary>
        public double? Hour => SkyTurn.HourOf(Light);
    }

    /// <summary>
    /// The credits (the game's credits document, docs/CREDITS.md, shipped beside the game as text): its headings and
    /// paragraphs as a roll, the markdown taken off (emphasis, code marks, links kept as their words).
    /// </summary>
    public static class Credits
    {
        public sealed class Section
        {
            public string Heading;
            public List<string> Lines = new();
        }

        private static readonly Regex Link = new(@"\[([^\]]*)\]\([^)]*\)", RegexOptions.Compiled);
        private static readonly Regex Marks = new(@"(\*\*|__|`)", RegexOptions.Compiled);

        /// <summary>Plain words from a line of markdown.</summary>
        public static string Plain(string line)
        {
            if (line == null) return "";
            var s = Link.Replace(line, "$1");
            s = Marks.Replace(s, "");
            return s.Trim();
        }

        /// <summary>The roll: one section per heading (text before the first heading goes under an empty one); a paragraph
        /// wrapped over several lines is joined into one, each list item is a line of its own.</summary>
        public static List<Section> Parse(string markdown)
        {
            var sections = new List<Section>();
            Section cur = null;
            string para = null;
            void Flush()
            {
                if (para == null) return;
                cur ??= Add(sections, "");
                cur.Lines.Add(para);
                para = null;
            }
            foreach (var raw in (markdown ?? "").Replace("\r\n", "\n").Split('\n'))
            {
                var line = raw.TrimEnd();
                if (line.TrimStart().StartsWith("<!--")) continue;
                if (line.StartsWith("#"))
                {
                    Flush();
                    cur = Add(sections, Plain(line.TrimStart('#')));
                    continue;
                }
                if (line.Trim().Length == 0) { Flush(); continue; }
                var t = line.TrimStart();
                if (t.StartsWith("- ") || t.StartsWith("* "))
                {
                    Flush();
                    para = Plain(t.Substring(2));
                    continue;
                }
                para = para == null ? Plain(t) : para + " " + Plain(t);
            }
            Flush();
            sections.RemoveAll(x => x.Lines.Count == 0 && string.IsNullOrEmpty(x.Heading));
            return sections;
        }

        private static Section Add(List<Section> into, string heading)
        {
            var s = new Section { Heading = heading };
            into.Add(s);
            return s;
        }
    }
}
