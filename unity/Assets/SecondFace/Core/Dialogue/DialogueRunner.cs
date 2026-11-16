using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using Newtonsoft.Json.Linq;
using SecondFace.Core.State;
using SecondFace.Core.Stats;
using SecondFace.Core.World;


namespace SecondFace.Core.Dialogue
{
    public sealed class OptionView
    {
        public string Id;
        public string Text;
        /// <summary>e.g. "Speech 50"; empty when there is no check.</summary>
        public string CheckLabel = "";
        public bool CheckMet = true;
        public List<string> CheckNotes = new();
        /// <summary>Picking it ends the conversation.</summary>
        public bool Exit;
        public bool Locked;
        public bool Seen;
    }

    public sealed class PassiveView { public string Label; public string Text; }

    /// <summary>A companion's word on the node (U7).</summary>
    public sealed class InterjectView { public string Companion; public string Text; }

    public sealed class NodeView
    {
        public string Speaker;
        public string Text;
        /// <summary>This node has been read before (skippable).</summary>
        public bool Seen;
        /// <summary>The conversation came back to this node (a hub after a topic): <see cref="Text"/> is its `again` line,
        /// or empty when the speaker only waits (U7).</summary>
        public bool Returned;
        /// <summary>An opening heard in an earlier talk: <see cref="Text"/> is a greeting by what has happened since (U7).</summary>
        public bool Greeting;
        public List<PassiveView> Passives = new();
        /// <summary>A travelling companion's word on this node (at most one; U7).</summary>
        public List<InterjectView> Interjections = new();
        public List<OptionView> Options = new();
    }

    /// <summary>Hooks a conversation reaches: the quest engine, plus XP for passing a check.</summary>
    public interface IDialogueHost : ILogicHost
    {
        /// <summary>XP for passing a check (once per option); 0 for none.</summary>
        int CheckXp { get; }
    }

    public class DialogueHost : LogicHost, IDialogueHost
    {
        public virtual int CheckXp => 0;
        public static new readonly DialogueHost None = new();
    }

    /// <summary>
    /// Dialogue trees and the runner (port of dialogue/dialogue.ts). Checks are deterministic and shown up front;
    /// an unmet check follows its `fail` branch. Passive checks interject. Options remember being chosen.
    /// </summary>
    public sealed class DialogueRunner
    {
        public readonly DialogueDef Def;
        public readonly GameState G;
        public readonly IDialogueHost Host;
        public string Node { get; private set; }
        private readonly HashSet<string> _passivesShown = new();
        /// <summary>The nodes this conversation has said (U7: a node said again shows its `again` line, or a wait).</summary>
        private readonly HashSet<string> _said = new();
        private bool _returned;
        /// <summary>The greeting said in place of an opening already heard in an earlier talk (null: the opening itself).</summary>
        private string _greeting;

        public DialogueRunner(DialogueDef def, GameState g, IDialogueHost host = null)
        {
            Def = def; G = g; Host = host ?? DialogueHost.None;
            Node = null;
            foreach (var s in def.Start) if (Logic.Test(s.If, g)) { Node = s.Node; break; }
            if (Node == null) return;
            // (U7: an opening said in an earlier talk is not said again; the speaker greets by what has happened since)
            g.World.Visited.TryGetValue($"{def.Id}.{Node}", out var before);
            var opening = def.Nodes.TryGetValue(Node, out var on) ? on : null;
            _greeting = before > 0 && opening != null && opening.Text is not JArray
                ? (opening.Again != null ? Render(opening.Again, g) : Greetings.For(g, def.Owner))
                : null;
            Greetings.Talked(g, def.Owner);
            _openedAt = Node;
            Enter(Node);
            if (_greeting != null) _returned = false;
        }

        public bool Ended => Node == null;
        private string _openedAt;

        private static readonly Regex Token = new(@"\{(\w+)\}", RegexOptions.Compiled);

        /// <summary>Pronoun and name substitution: {name}, {they} {them} {their} {theirs} {themself}, capitalised forms.</summary>
        public static string Render(JToken t, GameState g)
        {
            string raw = "";
            if (t == null || t.Type == JTokenType.Null) raw = "";
            else if (t.Type == JTokenType.String) raw = (string)t;
            else if (t is JArray variants)
            {
                foreach (var v in variants) if (Logic.Test(v["if"], g)) { raw = (string)v["text"]; break; }
            }
            var p = g.Pc.Pronouns;
            var P = p == "he" ? new Dictionary<string, string> { ["they"] = "he", ["them"] = "him", ["their"] = "his", ["theirs"] = "his", ["themself"] = "himself" }
                : p == "she" ? new Dictionary<string, string> { ["they"] = "she", ["them"] = "her", ["their"] = "her", ["theirs"] = "hers", ["themself"] = "herself" }
                : new Dictionary<string, string> { ["they"] = "they", ["them"] = "them", ["their"] = "their", ["theirs"] = "theirs", ["themself"] = "themself" };
            return Token.Replace(raw, m =>
            {
                var k = m.Groups[1].Value;
                if (k == "name") return string.IsNullOrEmpty(g.Pc.Sheet.Name) ? "stranger" : g.Pc.Sheet.Name;
                var low = k.ToLowerInvariant();
                if (P.TryGetValue(low, out var word)) return char.IsUpper(k[0]) ? char.ToUpperInvariant(word[0]) + word.Substring(1) : word;
                return m.Value;
            });
        }

        private int CheckValue(CheckDef c) => c.Skill != null ? Checks.EffectiveSkill(G.Pc.Sheet, G.Pc.Inventory, c.Skill) : Sheet.Attr(G.Pc.Sheet, c.Attr);

        private (int dc, List<string> notes) CheckDc(CheckDef c)
        {
            int dc = c.Dc;
            var notes = new List<string>();
            if (c.Mods != null)
                foreach (var m in c.Mods)
                    if (Logic.Test(m.If, G)) { dc += m.Dc; notes.Add($"{(m.Dc > 0 ? "+" : "−")}{Math.Abs(m.Dc)}: {m.Why}"); }
            return (Math.Max(0, dc), notes);
        }

        private static string CheckName(string skill, string attr) => skill != null ? Rules.SkillInfos[skill].Name : Rules.AttributeInfos[attr].Name;

        private string OptionId(int i, OptionDef o) => o.Id ?? $"{Def.Id}.{Node}.{i}";

        private void Enter(string id)
        {
            if (!Def.Nodes.TryGetValue(id, out var n)) throw new ArgumentException($"Dialogue {Def.Id}: unknown node {id}");
            var key = $"{Def.Id}.{id}";
            G.World.Visited.TryGetValue(key, out var v);
            G.World.Visited[key] = v + 1;
            _returned = !_said.Add(id);
            if (!_returned) Logic.Apply(n.Effects, G, Host);
        }

        public NodeView View()
        {
            if (Node == null) return null;
            var n = Def.Nodes[Node];
            var greet = _greeting != null && Node == _openedAt && !_returned;
            var view = new NodeView { Speaker = n.Speaker ?? Def.Owner, Text = greet ? _greeting : _returned ? Render(n.Again, G) : Render(n.Text, G), Returned = _returned, Greeting = greet };
            G.World.Visited.TryGetValue($"{Def.Id}.{Node}", out var visits);
            view.Seen = visits > 1;
            if (n.Passives != null)
            {
                for (int i = 0; i < n.Passives.Count; i++)
                {
                    var p = n.Passives[i];
                    if (p.If != null && !Logic.Test(p.If, G)) continue;
                    if (p.Skill != null || p.Attr != null)
                    {
                        int value = p.Skill != null ? Sheet.Skill(G.Pc.Sheet, p.Skill) : Sheet.Attr(G.Pc.Sheet, p.Attr);
                        if (value < (p.Dc ?? 0)) continue;
                    }
                    var key = $"{Node}.{i}";
                    if (_passivesShown.Add(key)) Logic.Apply(p.Effects, G, Host);
                    string label = p.Skill != null || p.Attr != null ? CheckName(p.Skill, p.Attr)
                        : p.Label ?? (p.If != null && p.If.ContainsKey("origin") ? ((string)p.If["origin"]).Replace("_", " ") : "insight");
                    view.Passives.Add(new PassiveView { Label = label.ToUpperInvariant(), Text = Render(p.Text, G) });
                }
            }
            // (U7: a travelling companion's word, the first that applies; its effects once in the whole game)
            if (n.Interject != null && !_returned)
                foreach (var ij in n.Interject)
                {
                    if (string.IsNullOrEmpty(ij.Companion) || !Travelling(ij.Companion) || (ij.If != null && !Logic.Test(ij.If, G))) continue;
                    var key = $"interject.{Def.Id}.{Node}.{ij.Companion}";
                    G.World.Seen.TryGetValue(key, out var said);
                    if (said == 0) { G.World.Seen[key] = 1; Logic.Apply(ij.Effects, G, Host); }
                    view.Interjections.Add(new InterjectView { Companion = ij.Companion, Text = Render(ij.Text, G) });
                    break;
                }
            // (U7: a topic heard to its end closes; a node whose topics are all spent keeps them rather than strand the talk)
            var spent = new HashSet<int>();
            for (int i = 0; i < n.Options.Count; i++)
                if (Spent(Node, i, new HashSet<string> { Node })) spent.Add(i);
            var open = 0;
            for (int i = 0; i < n.Options.Count; i++)
                if (!spent.Contains(i) && (Logic.Test(n.Options[i].If, G) || n.Options[i].ShowLocked == true)) open++;
            if (open == 0) spent.Clear();
            for (int i = 0; i < n.Options.Count; i++)
            {
                var o = n.Options[i];
                var id = OptionId(i, o);
                bool ok = Logic.Test(o.If, G);
                if (!ok && o.ShowLocked != true) continue;
                G.World.Seen.TryGetValue(id, out var seen);
                if (o.Once == true && seen != 0) continue;
                if (spent.Contains(i)) continue;
                var ov = new OptionView { Id = id, Text = Render(o.Text, G), Locked = !ok, Seen = seen != 0, Exit = o.Exit == true && o.Check == null };
                if (o.Check != null)
                {
                    var (dc, notes) = CheckDc(o.Check);
                    ov.CheckLabel = $"{CheckName(o.Check.Skill, o.Check.Attr)} {dc}";
                    ov.CheckMet = CheckValue(o.Check) >= dc;
                    ov.CheckNotes = notes;
                }
                view.Options.Add(ov);
            }
            return view;
        }

        /// <summary>A companion who travels with the player now (joined and not left waiting somewhere).</summary>
        private bool Travelling(string id) => G.Companions != null && G.Companions.TryGetValue(id, out var c) && c != null
                                              && (c.WaitingAt == null || c.WaitingAt.Type == JTokenType.Null);

        /// <summary>Effects that do the same the second time (a flag set, a thing learned, a lead, a memory overwritten): an
        /// option carrying only these can close as a spent topic; anything else (items, approval, reputation, XP, news,
        /// quests) is the content's to gate.</summary>
        private static readonly HashSet<string> Idempotent = new() { "set", "learn", "lead", "memory" };

        private static bool Harmless(JArray effects)
        {
            if (effects == null) return true;
            foreach (var t in effects)
            {
                if (t is not JObject e) return false;
                var known = false;
                foreach (var p in e.Properties()) if (Idempotent.Contains(p.Name)) { known = true; break; }
                if (!known) return false;
            }
            return true;
        }

        /// <summary>Option i of a node is a spent topic (U7): asked before, nothing in it changes the world again, and
        /// everything it opens has been heard (the nodes it leads to said before, their own topics spent or leading back).
        /// Exits, services (`repeat`), checks and lines that read the world (variants) never close.</summary>
        private bool Spent(string nodeId, int i, HashSet<string> path)
        {
            var o = Def.Nodes[nodeId].Options[i];
            if (o.Exit == true || o.Repeat == true || o.Check != null || o.Next == null) return false;
            if (!Logic.Test(o.If, G)) return false;
            G.World.Seen.TryGetValue(OptionId(i, o, nodeId), out var seen);
            if (seen == 0 || !Harmless(o.Effects)) return false;
            return Heard(o.Next, path);
        }

        private bool Heard(string nodeId, HashSet<string> path)
        {
            if (path.Contains(nodeId)) return true;   // (back to where the topic began)
            if (!Def.Nodes.TryGetValue(nodeId, out var n)) return false;
            G.World.Visited.TryGetValue($"{Def.Id}.{nodeId}", out var visits);
            if (visits == 0 || n.Text is JArray || !Harmless(n.Effects)) return false;
            path.Add(nodeId);
            for (int k = 0; k < n.Options.Count; k++)
            {
                var o = n.Options[k];
                if (o.Exit == true || o.Repeat == true || o.Next == null || !Logic.Test(o.If, G)) continue;
                if (path.Contains(o.Next)) continue;
                if (!Spent(nodeId, k, path)) { path.Remove(nodeId); return false; }
            }
            path.Remove(nodeId);
            return true;
        }

        private string OptionId(int i, OptionDef o, string nodeId) => o.Id ?? $"{Def.Id}.{nodeId}.{i}";

        /// <summary>Choose an option by id. Returns whether a check passed (true when there was none).</summary>
        public bool Choose(string optionId)
        {
            if (Node == null) throw new InvalidOperationException("Dialogue has ended");
            var n = Def.Nodes[Node];
            int i = -1;
            for (int k = 0; k < n.Options.Count; k++) if (OptionId(k, n.Options[k]) == optionId) { i = k; break; }
            if (i < 0) throw new ArgumentException($"Dialogue {Def.Id}: no option {optionId} at {Node}");
            var o = n.Options[i];
            if (!Logic.Test(o.If, G)) throw new InvalidOperationException($"Dialogue {Def.Id}: option {optionId} is locked");
            G.World.Seen.TryGetValue(optionId, out var seen);
            bool firstTime = seen == 0;
            G.World.Seen[optionId] = seen + 1;
            bool passed = true;
            if (o.Check != null) { var (dc, _) = CheckDc(o.Check); passed = CheckValue(o.Check) >= dc; }
            if (passed)
            {
                Logic.Apply(o.Effects, G, Host);
                if (o.Check != null && firstTime && Host.CheckXp > 0) Logic.Apply(new JArray { new JObject { ["xp"] = Host.CheckXp } }, G, Host);
            }
            else Logic.Apply(o.FailEffects, G, Host);
            var next = passed ? o.Next : (o.Fail ?? o.Next);
            if (o.Exit == true || next == null) { Node = null; return passed; }
            Node = next;
            Enter(next);
            return passed;
        }
    }
}
