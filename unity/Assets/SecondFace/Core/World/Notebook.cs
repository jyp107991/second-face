using System;
using System.Collections.Generic;
using System.Linq;
using SecondFace.Core.Quest;
using SecondFace.Core.State;

namespace SecondFace.Core.World
{
    /// <summary>One line of a notebook entry that can be ticked off (a quest's objective).</summary>
    public sealed class NoteItem
    {
        public string Text;
        public bool Done;
        public bool Optional;
    }

    /// <summary>One entry of the notebook: a quest, a lead, a person, a letter or a decision.</summary>
    public sealed class NoteEntry
    {
        public string Id;
        public string Title;
        /// <summary>What it is now, for the screen to word: "" (open), done, failed, conclusion, received, sent.</summary>
        public string Status = "";
        /// <summary>The day it happened (met, received, sent, decided); 0 when none.</summary>
        public int Day;
        /// <summary>Where (a person met).</summary>
        public string Where;
        /// <summary>Finished, failed, read or past: listed after the open ones, dimmed.</summary>
        public bool Closed;
        /// <summary>The quest the HUD tracks.</summary>
        public bool Pinned;
        public List<NoteItem> Items = new();
        /// <summary>Paragraphs: a quest's journal, a lead's text, a letter.</summary>
        public List<string> Body = new();
    }

    /// <summary>
    /// The field notebook's pages from the game state (P5.3f, DESIGN_UNITY §6): the quests (open first, the tracked one
    /// at the top, each with its objectives and its journal), the leads (with what they add up to), the people met, the
    /// letters (sent and received) and the decisions taken, newest first. Pure data for the notebook screen; the
    /// content's definitions are passed in, so tests use their own.
    /// </summary>
    public static class Notebook
    {
        public static readonly string[] Sections = { "quests", "leads", "people", "letters", "decisions" };

        public static List<NoteEntry> Quests(GameState g, IReadOnlyDictionary<string, QuestDef> defs)
        {
            var list = new List<NoteEntry>();
            if (defs == null) return list;
            var journal = new QuestEngine(defs, g).Journal();
            foreach (var j in journal)
            {
                var e = new NoteEntry
                {
                    Id = j.Id, Title = j.Title ?? j.Id,
                    Status = j.Status == "active" ? "" : j.Status,
                    Closed = j.Status != "active",
                    Pinned = g.World.Pinned == j.Id,
                };
                foreach (var o in j.Objectives) e.Items.Add(new NoteItem { Text = o.Text, Done = o.Done, Optional = o.Optional });
                if (j.Log != null) e.Body.AddRange(Enumerable.Reverse(j.Log).Where(l => !string.IsNullOrEmpty(l)));
                list.Add(e);
            }
            var started = g.World.Quests;
            return list.OrderBy(e => e.Closed).ThenByDescending(e => e.Pinned)
                .ThenByDescending(e => started.TryGetValue(e.Id, out var q) ? q.StartedAt : 0).ToList();
        }

        /// <summary>Pins a quest for the HUD (null unpins).</summary>
        public static void Pin(GameState g, string questId) => g.World.Pinned = questId;

        /// <summary>The quest the HUD tracks: the pinned one if still open, else the most recently started open one.</summary>
        public static string Tracked(GameState g)
        {
            var w = g.World;
            if (w.Pinned != null && w.Quests.TryGetValue(w.Pinned, out var p) && p.Status == "active") return w.Pinned;
            return w.Quests.Where(kv => kv.Value.Status == "active").OrderByDescending(kv => kv.Value.StartedAt).Select(kv => kv.Key).FirstOrDefault();
        }

        public static List<NoteEntry> Leads(GameState g, IReadOnlyDictionary<string, LeadDef> leads, IReadOnlyDictionary<string, ConclusionDef> conclusions)
        {
            var list = new List<NoteEntry>();
            if (conclusions != null)
                foreach (var id in g.World.Conclusions)
                    if (conclusions.TryGetValue(id, out var c))
                    {
                        // what it rests on: the leads behind it, ticked
                        var e = new NoteEntry { Id = id, Title = c.Text, Status = "conclusion" };
                        foreach (var from in c.From)
                            if (leads != null && leads.TryGetValue(from, out var l))
                                e.Items.Add(new NoteItem { Text = string.IsNullOrEmpty(l.Label) ? l.Text : l.Label, Done = true });
                        list.Add(e);
                    }
            if (leads != null)
                foreach (var id in g.World.Leads)
                    if (leads.TryGetValue(id, out var l))
                        list.Add(new NoteEntry { Id = id, Title = string.IsNullOrEmpty(l.Label) ? l.Text : l.Label, Body = { l.Text } });
            return list;
        }

        public static List<NoteEntry> People(GameState g)
        {
            return g.World.MetPeople
                .OrderByDescending(kv => kv.Value.Day)
                .Select(kv => new NoteEntry
                {
                    Id = kv.Key, Title = kv.Value.Name ?? kv.Key,
                    Day = kv.Value.Day, Where = kv.Value.Where,
                })
                .ToList();
        }

        public static List<NoteEntry> Letters(GameState g, IReadOnlyDictionary<string, LetterDef> defs)
        {
            var list = new List<NoteEntry>();
            foreach (var p in Enumerable.Reverse(g.World.PostBag))
                list.Add(new NoteEntry { Id = $"post_{p.From}_{p.Day}", Title = p.From, Status = "received", Day = p.Day, Closed = p.Read, Body = { p.Text } });
            foreach (var s in Enumerable.Reverse(g.World.Letters))
            {
                LetterDef d = null;
                defs?.TryGetValue(s.Id, out d);
                var e = new NoteEntry { Id = s.Id, Title = s.To, Status = "sent", Day = s.Day, Closed = true };
                if (d != null && !string.IsNullOrEmpty(d.Text)) e.Body.Add(d.Text);
                list.Add(e);
            }
            return list;
        }

        public static List<NoteEntry> Decisions(GameState g)
        {
            return Enumerable.Reverse(g.World.Decisions)
                .Select(d => new NoteEntry { Id = d.Id, Title = d.Text, Day = Clock.DayOf(d.Minutes) })
                .ToList();
        }
    }
}
