using System;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json.Linq;
using SecondFace.Core.Dialogue;
using SecondFace.Core.State;
using SecondFace.Core.World;

namespace SecondFace.Core.Quest
{
    public sealed class JournalObjective { public string Text; public bool Done; public bool Optional; }
    public sealed class JournalEntry { public string Id; public string Title; public string Status; public List<string> Log; public List<JournalObjective> Objectives; }

    /// <summary>
    /// Quests (port of quest/quest.ts): stages with state-based objectives, so any method that reaches the state
    /// completes them; stages advance when a transition's condition holds. The engine is also the logic host a
    /// conversation talks to.
    /// </summary>
    public sealed class QuestEngine : IDialogueHost
    {
        public readonly IReadOnlyDictionary<string, QuestDef> Defs;
        public readonly GameState G;
        public readonly ILogicHost Outer;
        /// <summary>Called when journal text changes (UI notification).</summary>
        public Action<string, string> OnJournal;
        public Action<string, string> OnEnd;
        public int CheckXp { get; set; }

        public QuestEngine(IReadOnlyDictionary<string, QuestDef> defs, GameState g, ILogicHost outer = null, int checkXp = 0)
        {
            Defs = defs; G = g; Outer = outer ?? LogicHost.None; CheckXp = checkXp;
        }

        private QuestDef Def(string id) => Defs.TryGetValue(id, out var d) ? d : throw new ArgumentException($"Unknown quest {id}");

        public void QuestStart(string id)
        {
            if (G.World.Quests.ContainsKey(id)) return;
            var d = Def(id);
            G.World.Quests[id] = new QuestState { Stage = d.Start, Status = "active", StartedAt = G.Minutes };
            EnterStage(id, d.Start);
        }

        public void QuestStage(string id, string stage)
        {
            if (!G.World.Quests.ContainsKey(id)) QuestStart(id);
            var q = G.World.Quests[id];
            if (q.Status != "active" || q.Stage == stage) return;
            EnterStage(id, stage);
        }

        public void QuestEnd(string id, string status)
        {
            if (!G.World.Quests.TryGetValue(id, out var q) || q.Status != "active") return;
            q.Status = status;
            var d = Def(id);
            if (status == "done" && d.Xp is int xp && xp > 0) Logic.Apply(new JArray { new JObject { ["xp"] = xp } }, G, Outer);
            OnEnd?.Invoke(id, status);
        }

        public void Event(string name, JToken data) => Outer.Event(name, data);
        public void Xp(int amount, int levels) => Outer.Xp(amount, levels);
        public void Approval(string npc, double by) => Outer.Approval(npc, by);

        private void EnterStage(string id, string stage)
        {
            var q = G.World.Quests[id];
            if (!Def(id).Stages.TryGetValue(stage, out var s)) throw new ArgumentException($"Quest {id}: unknown stage {stage}");
            q.Stage = stage;
            q.Done = new List<string>();
            q.Log.Add(s.Journal);
            OnJournal?.Invoke(id, s.Journal);
            Logic.Apply(s.OnEnter, G, this);
            if (s.End != null) QuestEnd(id, s.End);
        }

        /// <summary>Re-evaluate active quests against the world. Call after any batch of effects.</summary>
        public void Update()
        {
            for (int guard = 0; guard < 20; guard++)
            {
                bool moved = false;
                foreach (var kv in G.World.Quests.ToList())
                {
                    var id = kv.Key; var q = kv.Value;
                    if (q.Status != "active") continue;
                    var s = Def(id).Stages[q.Stage];
                    if (s.Objectives != null)
                        foreach (var o in s.Objectives)
                            if (!q.Done.Contains(o.Id) && Logic.Test(o.Done, G)) q.Done.Add(o.Id);
                    Transition t = null;
                    if (s.Next != null) foreach (var x in s.Next) if (Logic.Test(x.If, G)) { t = x; break; }
                    if (t != null) { EnterStage(id, t.Stage); moved = true; }
                }
                if (!moved) return;
            }
        }

        /// <summary>Journal view: quests with their current objectives.</summary>
        public List<JournalEntry> Journal()
        {
            var outList = new List<JournalEntry>();
            foreach (var kv in G.World.Quests)
            {
                var d = Def(kv.Key); var q = kv.Value; var s = d.Stages[q.Stage];
                var entry = new JournalEntry { Id = kv.Key, Title = d.Title, Status = q.Status, Log = q.Log, Objectives = new List<JournalObjective>() };
                if (s.Objectives != null)
                    foreach (var o in s.Objectives)
                        if (o.Hidden != true || q.Done.Contains(o.Id))
                            entry.Objectives.Add(new JournalObjective { Text = o.Text, Done = q.Done.Contains(o.Id), Optional = o.Optional == true });
                outList.Add(entry);
            }
            return outList;
        }
    }
}
