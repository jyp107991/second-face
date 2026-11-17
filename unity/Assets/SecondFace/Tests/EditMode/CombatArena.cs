using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using SecondFace.Core;
using SecondFace.Core.Combat;
using SecondFace.Core.Content;
using SecondFace.Core.Inventory;
using SecondFace.Core.Stats;

namespace SecondFace.Tests
{
    /// <summary>
    /// Synthetic battlefields, squads and an AI turn loop for the combat tests and the AI-vs-AI harness (COMBAT.md D):
    /// the loop plays each step as the game's own does (Choose, then a walk along the field's path or Execute), and checks
    /// the AI's hard rules independently of it at every step and every turn's end.
    /// </summary>
    public static class Arena
    {
        // ---- fields (40 × 30 m) ---------------------------------------------------------------------------------------

        public static readonly string[] Fields = { "open", "cover", "height", "corridor", "yard" };

        public static GridField Field(string kind)
        {
            var g = new GridField(40, 30);
            switch (kind)
            {
                case "open": break;
                case "cover":
                    for (var j = 3; j < 27; j += 4) { g.Rect(10, j, 10, j + 1, GridField.Low); g.Rect(29, j, 29, j + 1, GridField.Low); g.Rect(19, j + 2, 19, j + 2, GridField.Low); }
                    g.Rect(15, 8, 16, 9, GridField.Wall); g.Rect(23, 20, 24, 21, GridField.Wall); g.Rect(15, 20, 16, 21, GridField.Wall); g.Rect(23, 8, 24, 9, GridField.Wall);
                    break;
                case "height":
                    // a rise in the middle (2 m) with ramps east and west, low walls on its rim
                    g.Raise(16, 8, 23, 21, 2.0);
                    g.Raise(13, 12, 13, 17, 0.5); g.Raise(14, 12, 14, 17, 1.0); g.Raise(15, 12, 15, 17, 1.5);
                    g.Raise(24, 12, 24, 17, 1.5); g.Raise(25, 12, 25, 17, 1.0); g.Raise(26, 12, 26, 17, 0.5);
                    g.Rect(17, 9, 17, 10, GridField.Low); g.Rect(22, 19, 22, 20, GridField.Low); g.Rect(17, 19, 17, 20, GridField.Low); g.Rect(22, 9, 22, 10, GridField.Low);
                    for (var j = 4; j < 27; j += 6) { g.Rect(8, j, 8, j + 1, GridField.Low); g.Rect(31, j, 31, j + 1, GridField.Low); }
                    break;
                case "corridor":
                    // two long walls make a street 13 m wide, crates along it, side doors
                    g.Rect(0, 7, 39, 7, GridField.Wall); g.Rect(0, 21, 39, 21, GridField.Wall);
                    g.Set(12, 7, GridField.Open); g.Set(27, 21, GridField.Open);
                    for (var i = 7; i < 34; i += 4) g.Set(i, i % 8 == 7 ? 10 : 18, GridField.Low);
                    g.Rect(19, 13, 20, 15, GridField.Low); g.Rect(13, 14, 13, 14, GridField.Low); g.Rect(26, 14, 26, 14, GridField.Low);
                    g.Exit(0.5, 14.5).Exit(39.5, 14.5);
                    break;
                case "yard":
                    // cover lines, oil and scrub to burn, a puddle, exits on the east and west edges
                    for (var j = 3; j < 27; j += 5) { g.Rect(9, j, 9, j + 1, GridField.Low); g.Rect(30, j, 30, j + 1, GridField.Low); }
                    g.Rect(19, 6, 20, 7, GridField.Wall); g.Rect(19, 22, 20, 23, GridField.Wall);
                    g.Ground(16, 12, 23, 17, "scrub"); g.Ground(26, 13, 28, 16, "water");
                    g.Exit(0.5, 14.5).Exit(39.5, 14.5).Exit(39.5, 2.5).Exit(0.5, 27.5);
                    break;
            }
            return g;
        }

        // ---- people ---------------------------------------------------------------------------------------------------

        /// <summary>A thrown item the content does not have yet (registered for a test; removed by <see cref="Forget"/>).</summary>
        public static void Ensure(string id, string dmgType, double area, int ap = 4)
        {
            if (Registry.Items.ContainsKey(id)) return;
            Registry.Items[id] = new ItemDef { Id = id, Name = id, Category = "weapon", Weight = 0.5, Value = 10, Stack = true, Weapon = new WeaponDef { Skill = "explosives", Kind = "thrown", Hands = 1, Dmg = new[] { 0, 0 }, DmgType = dmgType, Ap = ap, Range = 8, Area = area, Durability = 1, Consumable = true } };
        }

        public static void Forget(params string[] ids) { foreach (var id in ids) Registry.Items.Remove(id); }

        public static BattleUnit Unit(string id, double x, double z, bool hostile, string weapon = null, string ammo = null, bool player = false, int skill = 30, string archetype = null, string armour = null, params (string Item, int N)[] pack)
        {
            var inv = Inv.Empty();
            if (weapon != null) { Inv.AddItem(inv, Inv.MakeItem(weapon)); Inv.Equip(inv, inv.Items.FindIndex(i => i.Def == weapon)); }
            if (ammo != null) { Inv.AddItem(inv, Inv.MakeItem(ammo, 60)); Inv.Reload(inv); }
            if (armour != null) { Inv.AddItem(inv, Inv.MakeItem(armour)); Inv.Equip(inv, inv.Items.FindIndex(i => i.Def == armour)); }
            foreach (var (item, n) in pack) Inv.AddItem(inv, Inv.MakeItem(item, n));
            var sheet = Sheet.Empty(id);
            sheet.SkillBought["firearms"] = skill; sheet.SkillBought["melee"] = skill; sheet.SkillBought["explosives"] = skill;
            Inv.SyncGear(sheet, inv);
            var c = new Combatant { Id = id, Name = id, Team = hostile ? "them" : "player", Sheet = sheet, Inv = inv, Morale = CombatRules.InitialMorale(55), Courage = 55, IsPlayer = player };
            var u = new BattleUnit { C = c, Hostile = hostile, Archetype = archetype };
            u.Place(x, z);
            return u;
        }

        public static readonly WeaponDef Bite = new() { Skill = "melee", Kind = "unarmed", Hands = 1, Dmg = new[] { 4, 9 }, DmgType = "blade", Ap = 3, Range = 1, Durability = 0 };

        /// <summary>The player's side: the player and two companions, west.</summary>
        public static List<BattleUnit> Party(int skill = 32)
        {
            return new List<BattleUnit>
            {
                Unit("pc", 4.5, 14.5, false, "w_carbine556", "a_556", true, skill, pack: ("c_knitkit", 1)),
                Unit("ally1", 4.5, 10.5, false, "w_pump", "a_12ga", skill: skill),
                Unit("ally2", 4.5, 18.5, false, "w_pistol9", "a_9mm", skill: skill, pack: ("w_frag", 1)),
            };
        }

        /// <summary>A hostile squad of an archetype, east.</summary>
        public static List<BattleUnit> Squad(string kind, int skill = 32)
        {
            var l = new List<BattleUnit>();
            switch (kind)
            {
                case Archetypes.Raider:
                    l.Add(Unit("r_boss", 35.5, 14.5, true, "w_revolver38", "a_38", skill: skill + 5, archetype: kind, pack: ("w_molotov", 1)));
                    l.Add(Unit("r1", 34.5, 10.5, true, "w_sawnoff", "a_12ga", skill: skill, archetype: kind));
                    l.Add(Unit("r2", 34.5, 18.5, true, "w_machete", skill: skill, archetype: kind));
                    l.Add(Unit("r3", 36.5, 12.5, true, "w_zip38", "a_38", skill: skill, archetype: kind));
                    l[0].Leader = true;
                    break;
                case Archetypes.Warden:
                    l.Add(Unit("w_lead", 35.5, 14.5, true, "w_carbine556", "a_556", skill: skill, archetype: kind, armour: "r_riot", pack: ("w_smoke_t", 1)));
                    l.Add(Unit("w1", 34.5, 10.5, true, "w_pump", "a_12ga", skill: skill, archetype: kind, armour: "r_riot"));
                    l.Add(Unit("w2", 34.5, 18.5, true, "w_pistol9", "a_9mm", skill: skill, archetype: kind, pack: ("w_flash_t", 1)));
                    l[0].Leader = true;
                    break;
                case Archetypes.Machine:
                    l.Add(Unit("m1", 35.5, 12.5, true, "w_smg9", "a_9mm", skill: skill, archetype: kind, armour: "r_riot"));
                    l.Add(Unit("m2", 35.5, 16.5, true, "w_smg9", "a_9mm", skill: skill, archetype: kind, armour: "r_riot"));
                    break;
                case Archetypes.Animal:
                    for (var i = 0; i < 4; i++)
                    {
                        var a = Unit("a" + i, 35.5, 9.5 + i * 3.5, true, skill: skill + 10, archetype: kind);
                        a.C.Natural = Bite;
                        a.C.Sheet.BaseAttrs["reflex"] = 7;
                        a.C.Sheet.Hp = Sheet.Derived(a.C.Sheet).MaxHp * 2 / 3;
                        l.Add(a);
                    }
                    break;
            }
            return l;
        }

        public static void Kit()
        {
            Ensure("w_smoke_t", "smoke", 2);
            Ensure("w_flash_t", "flash", 3);
        }

        // ---- playing a fight ------------------------------------------------------------------------------------------

        /// <summary>What a fight did, and every breach of the AI's hard rules (counted, with a line each).</summary>
        public sealed class Stats
        {
            public string Outcome;
            public int Rounds, Turns;
            public readonly List<double> DecisionMs = new();
            public readonly List<string> Breaches = new();
            public int ThroughAlly, EndedExposed, IntoHazard, Wasted, OntoAllies;
            /// <summary>Per archetype: counts of step kinds, turns, the end-of-turn distance to the nearest enemy, attacks
            /// on a flanked target, attacks on the most hurt enemy in sight.</summary>
            public readonly Dictionary<string, Dictionary<string, double>> By = new();
            public void Add(string arch, string key, double v = 1)
            {
                if (!By.TryGetValue(arch, out var d)) By[arch] = d = new Dictionary<string, double>();
                d[key] = (d.TryGetValue(key, out var x) ? x : 0) + v;
            }
            public double Get(string arch, string key) => By.TryGetValue(arch, out var d) && d.TryGetValue(key, out var v) ? v : 0;
        }

        /// <summary>Plays a fight to its end with the AI on both sides. <paramref name="beforeTurn"/> may script things in.</summary>
        /// <summary>What fight is on (the field, the squad, the seed: written into every breach).</summary>
        public static string Context = "";
        /// <summary>Called with every step chosen (a probe's window into a fight).</summary>
        public static Action<Battle, BattleUnit, AiStep> Trace;

        public static Stats Play(Battle b, int maxRounds = 40, Action<Battle, BattleUnit> beforeTurn = null, bool checkRules = true)
        {
            var st = new Stats();
            for (var u = b.NextTurn(); u != null && b.Round <= maxRounds; u = b.NextTurn())
            {
                st.Turns++;
                beforeTurn?.Invoke(b, u);
                if (!b.Active) break;
                if (!u.InFight) { b.EndTurn(); continue; }
                var arch = Archetypes.Of(u);
                st.Add(arch, "turns");
                var ap0 = u.C.Ap; var stance0 = u.C.Stance;
                var acted = false;
                for (var step = 0; step < 14 && b.Active && u.InFight && u.C.Ap > 0; step++)
                {
                    var ap = u.C.Ap; var minor = u.C.MinorUsed; var stance = u.C.Stance;
                    var sw = Stopwatch.StartNew();
                    var a = b.Choose(u);
                    st.DecisionMs.Add(sw.Elapsed.TotalMilliseconds);
                    st.Add(arch, a.Kind);
                    Trace?.Invoke(b, u, a);
                    if (a.Kind == "wait") break;
                    if (checkRules) CheckStep(b, u, a, st);
                    if (a.Kind == "attack" || a.Kind == "burst")
                    {
                        if (b.CoverAt(u, u.PX, u.PZ, a.Target, a.Target.PX, a.Target.PZ).Flanked) st.Add(arch, "flank_shots");
                        var hurt = b.EnemiesOf(u).Where(f => !f.Surrendered && b.Sees(u, f)).OrderBy(f => f.C.Sheet.Hp / (double)Sheet.Derived(f.C.Sheet).MaxHp).FirstOrDefault();
                        if (hurt == a.Target) st.Add(arch, "focus_shots");
                        st.Add(arch, "shots");
                    }
                    if (a.Kind == "move" || a.Kind == "flee")
                    {
                        if (a.Kind == "flee") b.Flee(u);
                        var o = b.WalkTo(u, a.X, a.Z);
                        if (checkRules && !u.Fleeing && o.Entered.Any(e => e == "fire" || e == "chem" || e == "shock")) { st.IntoHazard++; st.Breaches.Add($"{u} walked into {string.Join(",", o.Entered)} (R{b.Round} {Context})"); }
                        if (a.Kind == "flee" && u.Fleeing && !u.Fled && !b.HasExits(u)) u.Fled = true;
                        acted = true;
                    }
                    else
                    {
                        var r = b.Execute(u, a);
                        if (a.Kind == "surrender") { acted = true; break; }
                        if (r.Done) acted = true;
                        if (!r.Done && u.C.Ap == ap) break;
                    }
                    if (u.C.Ap == ap && u.C.MinorUsed == minor && u.C.Stance == stance && a.Kind != "flee") break;
                }
                if (checkRules && b.Active && u.InFight) CheckTurnEnd(b, u, st, acted || u.C.Ap != ap0 || u.Watch != null || u.C.Stance != stance0);
                if (u.InFight && b.Active)
                {
                    var foes = b.EnemiesOf(u).Where(f => !f.Surrendered).ToList();
                    if (foes.Count > 0 && !u.Fleeing) { st.Add(arch, "dist_sum", foes.Min(f => Battle.Distance(u, f))); st.Add(arch, "dist_n"); }
                    if (foes.Count > 0 && !u.Fleeing && b.Round <= 3) { st.Add(arch, "early_sum", foes.Min(f => Battle.Distance(u, f))); st.Add(arch, "early_n"); }
                    var (_, exposed) = b.CoverVsAll(u, u.PX, u.PZ);
                    if (!exposed) st.Add(arch, "safe_ends");
                }
                b.EndTurn();
            }
            if (b.Active) b.Standoff();
            st.Outcome = b.Outcome; st.Rounds = b.Round;
            return st;
        }

        /// <summary>D5, before a step: never through or onto one's own.</summary>
        private static void CheckStep(Battle b, BattleUnit u, AiStep a, Stats st)
        {
            if ((a.Kind == "attack" || a.Kind == "burst" || a.Kind == "suppress") && a.Target != null)
            {
                var w = CombatRules.WeaponOf(u.C).def;
                if (!CombatRules.IsMelee(w) && b.InTheWay(u, u.PX, u.PZ, a.Target, a.Target.PX, a.Target.PZ) is BattleUnit iw && iw.Hostile == u.Hostile)
                { st.ThroughAlly++; st.Breaches.Add($"{u} shot through {iw} at {a.Target} (R{b.Round} {Context})"); }
            }
            if (a.Kind == "throw")
            {
                var plan = b.PlanThrow(u, a.Item, a.X, a.Z);
                if (Battle.ThrowKind(Items.Def(a.Item).Weapon) != "smoke" && plan.Caught.Any(c => c.Ally)) { st.OntoAllies++; st.Breaches.Add($"{u} threw {a.Item} onto its own (R{b.Round} {Context})"); }
            }
        }

        /// <summary>D5, at a turn's end: never in the open with cover in reach (unless charging, fleeing, an animal); never a
        /// turn wasted that could have been used.</summary>
        private static void CheckTurnEnd(Battle b, BattleUnit u, Stats st, bool acted)
        {
            var foes = b.EnemiesOf(u).Where(f => !f.Surrendered).ToList();
            if (foes.Count == 0) return;
            var arch = Archetypes.Of(u);
            var w = CombatRules.WeaponOf(u.C).def;
            var melee = CombatRules.IsMelee(w);
            var charging = melee && foes.Any(f => Battle.Distance(u, f) <= CombatRules.MaxAp(u.C) * Battle.MetresPerAp + CombatRules.MeleeReach(w) + 1);
            if (!u.Fleeing && arch != Archetypes.Animal && !charging && u.C.Ap > 0 && b.CoverVsAll(u, u.PX, u.PZ).Exposed)
            {
                foreach (var (x, z) in b.Field.Candidates(u, b.Reach(u)))
                {
                    if (b.Units.Any(o => o != u && o.Alive && !o.Fled && Tactics.Dist(o.PX, o.PZ, x, z) < 0.8)) continue;
                    var cost = b.MoveCost(u, x, z);
                    if (cost <= 0 || cost > u.C.Ap) continue;
                    if (b.Surfaces.Count > 0 && (b.Surfaces.Peek(x, z)?.Hazard == true || b.Surfaces.HazardOn(b.PathFor(u, x, z)) != null)) continue;
                    if (b.Props.Any(p => !p.Destroyed && Tactics.Dist(p.X, p.Z, x, z) <= p.Radius)) continue;
                    if (!b.CoverVsAll(u, x, z).Exposed) { st.EndedExposed++; st.Breaches.Add($"{u} ended in the open at ({u.PX:0.#},{u.PZ:0.#}) with {u.C.Ap} AP and cover at ({x:0.#},{z:0.#}) for {cost} (R{b.Round} {Context})"); break; }
                }
            }
            if (!acted && !u.C.Stunned && u.C.Ap >= CombatRules.MaxAp(u.C) - 2)
            {
                // could it have done anything? a shot, or a step towards them
                var could = foes.Any(f => b.Preview(u, f).Ok);
                if (!could)
                {
                    var near = foes.Min(f => Battle.Distance(u, f));
                    foreach (var (x, z) in b.Field.Candidates(u, b.Reach(u)))
                    {
                        var cost = b.MoveCost(u, x, z);
                        if (cost <= 0 || cost > u.C.Ap) continue;
                        if (foes.Min(f => Tactics.Dist(f.PX, f.PZ, x, z)) < near - 1.5) { could = true; break; }
                    }
                }
                if (could) { st.Wasted++; st.Breaches.Add($"{u} wasted a turn with {u.C.Ap} AP (R{b.Round} {Context})"); }
            }
        }

        public static Battle New(GridField g, uint seed, string difficulty = "normal")
        {
            var b = new Battle(g, new Rng(seed));
            b.Difficulty = CombatDifficulty.For(difficulty);
            return b;
        }
    }
}
