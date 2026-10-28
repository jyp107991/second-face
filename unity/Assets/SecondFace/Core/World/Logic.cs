using System;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json.Linq;
using SecondFace.Core.Content;
using SecondFace.Core.Inventory;
using SecondFace.Core.State;
using SecondFace.Core.Stats;

namespace SecondFace.Core.World
{
    /// <summary>Hooks the game provides for effects that reach outside world data (quests, combat, UI).</summary>
    public interface ILogicHost
    {
        void QuestStart(string id);
        void QuestStage(string id, string stage);
        void QuestEnd(string id, string status);
        void Event(string name, JToken data);
        /// <summary>Called after XP is granted (UI toasts).</summary>
        void Xp(int amount, int levels);
        /// <summary>A companion's approval changed (UI reactions).</summary>
        void Approval(string npc, double by);
    }

    public class LogicHost : ILogicHost
    {
        public static readonly LogicHost None = new();
        public virtual void QuestStart(string id) { }
        public virtual void QuestStage(string id, string stage) { }
        public virtual void QuestEnd(string id, string status) { }
        public virtual void Event(string name, JToken data) { }
        public virtual void Xp(int amount, int levels) { }
        public virtual void Approval(string npc, double by) { }
    }

    /// <summary>
    /// Conditions and effects: the shared data language of dialogue, quests and triggers (port of world/logic.ts).
    /// Both are JSON objects keyed by their kind, exactly as content writes them.
    /// </summary>
    public static class Logic
    {
        private static bool InRange(double v, double? gte, double? lte) => (gte == null || v >= gte) && (lte == null || v <= lte);
        private static double? Num(JToken t) => t == null || t.Type == JTokenType.Null ? null : (double?)t.Value<double>();
        private static string Str(JToken t) => t == null || t.Type == JTokenType.Null ? null : (string)t;

        public static bool Test(JToken cond, GameState g)
        {
            if (cond == null || cond.Type == JTokenType.Null) return true;
            var c = cond as JObject ?? throw new ArgumentException("A condition must be an object");
            var w = g.World; var sh = g.Pc.Sheet;
            if (c.TryGetValue("all", out var all)) return all.All(x => Test(x, g));
            if (c.TryGetValue("any", out var any)) return any.Any(x => Test(x, g));
            if (c.TryGetValue("not", out var not)) return !Test(not, g);
            if (c.TryGetValue("flag", out var flag))
            {
                var v = g.Flag((string)flag);
                if (c.TryGetValue("eq", out var eq)) return GameState.SameValue(v, eq);
                if (c.ContainsKey("gte") || c.ContainsKey("lte")) return v is double d && InRange(d, Num(c["gte"]), Num(c["lte"]));
                return GameState.Truthy(v);
            }
            if (c.TryGetValue("quest", out var quest))
            {
                w.Quests.TryGetValue((string)quest, out var q);
                var status = Str(c["status"]);
                if (status == "none") return q == null;
                if (q == null) return false;
                if (status != null && q.Status != status) return false;
                if (c.TryGetValue("stage", out var stage))
                {
                    var stages = stage is JArray sa ? sa.Select(s => (string)s) : new[] { (string)stage };
                    return stages.Contains(q.Stage);
                }
                return status != null ? true : q.Status == "active";
            }
            if (c.TryGetValue("attr", out var attr)) return InRange(Sheet.Attr(sh, (string)attr), Num(c["gte"]), Num(c["lte"]));
            if (c.TryGetValue("skill", out var skill)) return Sheet.Skill(sh, (string)skill) >= (Num(c["gte"]) ?? 0);
            if (c.TryGetValue("trait", out var trait)) return sh.Traits.Contains((string)trait);
            if (c.TryGetValue("perk", out var perk)) return sh.PerkRank((string)perk) > 0;
            if (c.TryGetValue("ability", out var ability)) return Sheet.HasFlag(sh, (string)ability);
            if (c.TryGetValue("item", out var item)) return Inv.CountItem(g.Pc.Inventory, (string)item) >= (int)(Num(c["count"]) ?? 1);
            if (c.TryGetValue("knows", out var knows)) return w.Knowledge.Contains((string)knows);
            if (c.TryGetValue("remembers", out var rem)) return w.Memories.TryGetValue((string)rem["npc"], out var ml) && ml.Any(m => m.Tag == (string)rem["tag"]);
            if (c.TryGetValue("trust", out var trust)) { w.Relations.TryGetValue((string)trust["npc"], out var r); return InRange(r?.Trust ?? 0, Num(trust["gte"]), Num(trust["lte"])); }
            if (c.TryGetValue("affection", out var aff)) { w.Relations.TryGetValue((string)aff["npc"], out var r); return InRange(r?.Affection ?? 0, Num(aff["gte"]), Num(aff["lte"])); }
            if (c.TryGetValue("approval", out var appr)) { w.Approval.TryGetValue((string)appr["companion"], out var a); return InRange(a, Num(appr["gte"]), Num(appr["lte"])); }
            if (c.TryGetValue("inParty", out var inParty)) return w.Party.Contains((string)inParty);
            if (c.TryGetValue("rep", out var rep))
            {
                w.ReputationOf.TryGetValue((string)rep["faction"], out var r);
                double respect = r?.Respect ?? 0, fear = r?.Fear ?? 0;
                return respect >= (Num(rep["respect"]) ?? double.NegativeInfinity) && fear >= (Num(rep["fear"]) ?? double.NegativeInfinity);
            }
            if (c.TryGetValue("origin", out var origin)) return g.Origin == (string)origin;
            if (c.TryGetValue("pronouns", out var pron)) return g.Pc.Pronouns == (string)pron;
            if (c.TryGetValue("seen", out var seen)) return w.Seen.TryGetValue((string)seen, out var sn) && sn != 0;
            if (c.TryGetValue("dead", out var dead))
            {
                var id = (string)dead;
                foreach (var kv in g.Npcs) if ((kv.Key == id || kv.Key.EndsWith("/" + id)) && kv.Value.Dead == true) return true;
                return false;
            }
            if (c.TryGetValue("hour", out var hour))
            {
                double h = (g.Minutes % 1440) / 60, from = (double)hour["from"], to = (double)hour["to"];
                return from <= to ? h >= from && h < to : h >= from || h < to;
            }
            if (c.TryGetValue("lead", out var lead)) return w.Leads.Contains((string)lead);
            if (c.TryGetValue("concluded", out var concl)) return w.Conclusions.Contains((string)concl);
            if (c.TryGetValue("heard", out var heard)) return Frontier.Heard(g, (string)heard["settlement"], (string)heard["tag"]);
            if (c.TryGetValue("standing", out var standing)) return InRange(Frontier.Standing(g, (string)standing["settlement"]), Num(standing["gte"]), Num(standing["lte"]));
            if (c.TryGetValue("event", out var ev))
            {
                w.Events.TryGetValue((string)ev, out var state);
                var isWhat = Str(c["is"]);
                return isWhat != null ? state == isWhat : state != null;
            }
            if (c.TryGetValue("masked", out var masked)) return w.Masked == (bool)masked;
            if (c.TryGetValue("chrome", out var chrome)) return sh.Chrome != null && sh.Chrome.Values.Any(p => p?.Id == (string)chrome);
            if (c.TryGetValue("chromeSlot", out var slot)) return sh.Chrome != null && sh.Chrome.TryGetValue((string)slot, out var p) && p != null;
            if (c.TryGetValue("drift", out var drift)) return InRange(sh.Drift ?? 0, Num(drift["gte"]), Num(drift["lte"]));
            if (c.TryGetValue("at", out var at)) return g.LocationId == (string)at;
            if (c.TryGetValue("wearing", out var wearing)) return g.Pc.Inventory.EquippedAt("body")?.Def == (string)wearing;
            if (c.TryGetValue("member", out var member))
            {
                var status = Str(c["status"]);
                if (status != null && status != "member") return w.MembershipOf.TryGetValue((string)member, out var m) && m.Status == status;
                return Factions.IsMember(g, Registry.Factions, (string)member, Str(c["rank"]));
            }
            return false;
        }

        public static void Apply(JToken effects, GameState g, ILogicHost host = null)
        {
            if (effects == null || effects.Type == JTokenType.Null) return;
            host ??= LogicHost.None;
            var w = g.World;
            foreach (var tok in (JArray)effects)
            {
                var e = (JObject)tok;
                if (e.TryGetValue("set", out var set)) g.SetFlag((string)set, e.TryGetValue("value", out var val) ? GameState.Normalise(val) : true);
                else if (e.TryGetValue("inc", out var inc)) { var cur = g.Flag((string)inc); g.SetFlag((string)inc, (cur is double d ? d : 0) + (Num(e["by"]) ?? 1)); }
                else if (e.TryGetValue("learn", out var learn)) w.Knowledge.Add((string)learn);
                else if (e.TryGetValue("memory", out var mem))
                {
                    var m = new Memory { Tag = (string)mem["tag"], Valence = Num(mem["valence"]) ?? 0, Strength = Num(mem["strength"]) ?? 60, Day = Clock.DayOf(g.Minutes), Source = "witnessed" };
                    var npc = (string)mem["npc"];
                    if (!w.Memories.TryGetValue(npc, out var list)) w.Memories[npc] = list = new List<Memory>();
                    var old = list.Find(x => x.Tag == m.Tag);
                    if (old != null) { old.Valence = m.Valence; old.Strength = m.Strength; old.Day = m.Day; old.Source = m.Source; } else list.Add(m);
                }
                else if (e.TryGetValue("trust", out var trust)) { var r = w.RelationWith((string)trust["npc"]); r.Trust = WorldState.Clamp100(r.Trust + (double)trust["by"]); }
                else if (e.TryGetValue("affection", out var aff)) { var r = w.RelationWith((string)aff["npc"]); r.Affection = WorldState.Clamp100(r.Affection + (double)aff["by"]); }
                else if (e.TryGetValue("approval", out var appr))
                {
                    var id = (string)appr["companion"]; double by = (double)appr["by"];
                    w.Approval.TryGetValue(id, out var cur);
                    w.Approval[id] = WorldState.Clamp100(cur + by);
                    host.Approval(id, by);
                }
                else if (e.TryGetValue("rep", out var rep))
                {
                    var r = w.Rep((string)rep["faction"]);
                    r.Respect = WorldState.Clamp100(r.Respect + (Num(rep["respect"]) ?? 0), 0);
                    r.Fear = WorldState.Clamp100(r.Fear + (Num(rep["fear"]) ?? 0), 0);
                }
                else if (e.TryGetValue("give", out var give)) Inv.AddItem(g.Pc.Inventory, Inv.MakeItem((string)give, (int)(Num(e["count"]) ?? 1)));
                else if (e.TryGetValue("take", out var take)) Inv.RemoveItem(g.Pc.Inventory, (string)take, (int)(Num(e["count"]) ?? 1));
                else if (e.TryGetValue("xp", out var xp)) { int amount = (int)xp; int lv = Sheet.AddXp(g.Pc.Sheet, amount); host.Xp(amount, lv); }
                else if (e.TryGetValue("lead", out var lead)) w.Leads.Add((string)lead);
                else if (e.TryGetValue("news", out var news))
                    Frontier.AddNews(g, (string)news["tag"], Str(news["text"]), (double)news["valence"], Num(news["size"]) ?? 4, (string)news["at"], w.Masked ? "masked" : "player");
                else if (e.TryGetValue("quest", out var quest))
                {
                    var id = (string)quest;
                    if (e["start"]?.Value<bool>() == true) host.QuestStart(id);
                    if (e.TryGetValue("stage", out var st) && st.Type != JTokenType.Null) host.QuestStage(id, (string)st);
                    if (e["done"]?.Value<bool>() == true) host.QuestEnd(id, "done");
                    if (e["fail"]?.Value<bool>() == true) host.QuestEnd(id, "failed");
                }
                else if (e.TryGetValue("decision", out var dec))
                {
                    var id = (string)dec["id"];
                    if (!w.Decisions.Any(d => d.Id == id)) w.Decisions.Add(new Decision { Id = id, Text = (string)dec["text"], Minutes = g.Minutes });
                }
                else if (e.TryGetValue("after", out var after)) w.Timers.Add(new Timer { Id = (string)after["id"], At = g.Minutes + (double)after["minutes"], Effects = (JArray)after["effects"] });
                else if (e.TryGetValue("join", out var join)) { if (!w.Party.Contains((string)join)) w.Party.Add((string)join); }
                else if (e.TryGetValue("leave", out var leave)) w.Party.Remove((string)leave);
                else if (e.TryGetValue("time", out var time)) g.Minutes += (double)time;
                else if (e.TryGetValue("event", out var ev)) host.Event((string)ev, e["data"]);
                else if (e.TryGetValue("enlist", out var enlist))
                {
                    var defs = Registry.Factions;
                    var faction = (string)enlist;
                    foreach (var outF in Factions.Enlist(g, defs, faction, Str(e["rank"]), Str(e["cover"])))
                        w.Decisions.Add(new Decision { Id = $"expelled_{outF}_for_{faction}", Text = $"Joining {defs[faction].Name} cost you your place with {defs[outF].Name}.", Minutes = g.Minutes });
                    Factions.SyncMembership(g, defs);
                }
                else if (e.TryGetValue("promote", out var promote)) { Factions.SetRank(g, Registry.Factions, (string)promote["faction"], (string)promote["rank"]); Factions.SyncMembership(g, Registry.Factions); }
                else if (e.TryGetValue("expel", out var expel)) { Factions.Expel(g, (string)expel, Str(e["status"]) ?? "expelled"); Factions.SyncMembership(g, Registry.Factions); }
                else if (e.TryGetValue("post", out var post)) w.PostBag.Add(new Post { From = (string)post["from"], Text = (string)post["text"], Day = Clock.DayOf(g.Minutes) });
            }
        }

        /// <summary>Fire timers that are due (call when the clock advances). Returns how many fired.</summary>
        public static int RunTimers(GameState g, ILogicHost host = null)
        {
            var due = g.World.Timers.Where(t => t.At <= g.Minutes).ToList();
            if (due.Count == 0) return 0;
            g.World.Timers = g.World.Timers.Where(t => t.At > g.Minutes).ToList();
            foreach (var t in due) Apply(t.Effects, g, host);
            return due.Count;
        }

        /// <summary>Build a condition or effect from a JSON string (tests, tools).</summary>
        public static JObject J(string json) => JObject.Parse(json);
        public static JArray Fx(string json) => JArray.Parse(json);
    }
}
