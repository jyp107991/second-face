using System;
using System.Collections.Generic;
using System.Linq;
using SecondFace.Core.State;

namespace SecondFace.Core.World
{
    /// <summary>Frontier systems (port of world/frontier.ts): news that travels with people, leads → conclusions, scheduled world events.</summary>
    public static class Frontier
    {
        public static NewsItem AddNews(GameState g, string tag, string text, double valence, double size, string origin, string about, string id = null)
        {
            int day = Clock.DayOf(g.Minutes);
            var item = new NewsItem { Id = id ?? $"{tag}@{origin}#{g.World.News.Count}", Tag = tag, Text = text, About = about, Valence = valence, Size = size, Origin = origin, Day = day };
            item.Heard[origin] = new HeardAt { Day = day, Distortion = 0 };
            g.World.News.Add(item);
            return item;
        }

        /// <summary>Advance gossip to `day`: a story reaches a neighbour after the road's travel days if the road carries it; each retelling distorts it. Deterministic per news id.</summary>
        public static void SpreadNews(GameState g, IReadOnlyDictionary<string, SettlementDef> roads, int? dayOpt = null)
        {
            int day = dayOpt ?? Clock.DayOf(g.Minutes);
            foreach (var n in g.World.News)
            {
                bool changed = true;
                while (changed)
                {
                    changed = false;
                    foreach (var kv in n.Heard.ToList())
                    {
                        if (!roads.TryGetValue(kv.Key, out var s)) continue;
                        var h = kv.Value;
                        foreach (var road in s.Roads)
                        {
                            string to = road.Key; double days = road.Value;
                            if (n.Heard.ContainsKey(to)) continue;
                            int arrive = h.Day + (int)Math.Ceiling(days / Math.Max(0.2, s.Traffic));
                            if (arrive > day) continue;
                            double reach = s.Traffic * (0.4 + n.Size / 10);
                            if (Hash(n.Id + to) > reach) continue;
                            n.Heard[to] = new HeardAt { Day = arrive, Distortion = Math.Min(1, h.Distortion + 0.15 + 0.1 * Hash(n.Id + to + "d")) };
                            changed = true;
                        }
                    }
                }
            }
        }

        /// <summary>What a settlement thinks of the player (-100..100) from news it has heard, fading with time.</summary>
        public static int Standing(GameState g, string settlement)
        {
            int day = Clock.DayOf(g.Minutes);
            double v = 0;
            foreach (var n in g.World.News)
            {
                if (!n.Heard.TryGetValue(settlement, out var h) || n.About != "player") continue;
                double age = Math.Max(0, day - h.Day);
                double fade = Math.Max(0.25, 1 - age / (20 + n.Size * 6));
                double told = n.Valence * (n.Valence < 0 ? 1 + h.Distortion * 0.5 : 1 - h.Distortion * 0.4);
                v += told * (n.Size / 10) * fade;
            }
            return (int)Math.Max(-100, Math.Min(100, Num.Round(v)));
        }

        public static bool Heard(GameState g, string settlement, string tag) => g.World.News.Any(n => n.Tag == tag && n.Heard.ContainsKey(settlement));

        /// <summary>Try to link the selected leads. Returns the conclusion formed, or null (costs a little time either way).</summary>
        public static ConclusionDef TryConclude(GameState g, IEnumerable<string> selected, IReadOnlyDictionary<string, ConclusionDef> conclusions, ILogicHost host = null)
        {
            g.Minutes += 10;
            var have = new HashSet<string>(selected.Where(l => g.World.Leads.Contains(l)));
            foreach (var c in conclusions.Values)
            {
                if (g.World.Conclusions.Contains(c.Id)) continue;
                if (c.From.Count == have.Count && c.From.All(have.Contains))
                {
                    g.World.Conclusions.Add(c.Id);
                    g.World.Knowledge.Add(c.Id);
                    Logic.Apply(c.Effects, g, host);
                    return c;
                }
            }
            return null;
        }

        /// <summary>Resolve due events. Each resolves once: world.events[id] = happened | prevented.</summary>
        public static List<string> RunWorldEvents(GameState g, IReadOnlyDictionary<string, WorldEventDef> events, ILogicHost host = null)
        {
            var fired = new List<string>();
            foreach (var e in events.Values)
            {
                if (g.World.Events.ContainsKey(e.Id)) continue;
                if (e.ArmedIf != null && !Logic.Test(e.ArmedIf, g)) continue;
                double due;
                if (e.At.Day != null) due = (e.At.Day.Value - 1) * 1440 + (e.At.Hour ?? 0) * 60;
                else
                {
                    // Armed now: the first `hour` o'clock after this moment, remembered so travel can jump past it.
                    var key = $"ev_armed_{e.Id}";
                    double armed;
                    if (g.Flag(key) is double a) armed = a; else { armed = g.Minutes; g.SetFlag(key, armed); }
                    double dayStart = Math.Floor(armed / 1440) * 1440;
                    due = dayStart + (e.At.Hour ?? 0) * 60;
                    if (due <= armed) due += 1440;
                    if (e.At.Where != null && g.LocationId != e.At.Where) continue;
                }
                if (g.Minutes < due) continue;
                bool prevented = e.PreventedIf != null && Logic.Test(e.PreventedIf, g);
                g.World.Events[e.Id] = prevented ? "prevented" : "happened";
                Logic.Apply(prevented ? e.PreventedEffects : e.Effects, g, host);
                fired.Add(e.Id);
            }
            return fired;
        }

        /// <summary>FNV-1a over UTF-16 code units, as the web game hashes news ids: [0, 1).</summary>
        public static double Hash(string s)
        {
            uint h = 2166136261;
            foreach (var ch in s) { h ^= ch; h = unchecked(h * 16777619); }
            return (h % 10000) / 10000.0;
        }
    }
}
