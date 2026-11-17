using System;
using System.Collections.Generic;
using System.Linq;
using SecondFace.Core.Inventory;
using SecondFace.Core.Stats;

namespace SecondFace.Core.Combat
{
    /// <summary>A throw as it went (COMBAT.md C4): where it was aimed and where it landed, its radius, who it hurt, what it
    /// left on the ground and what it set off.</summary>
    public sealed class ThrowResult
    {
        public string Item;
        /// <summary>blast, fire, smoke, flash, chem, shock.</summary>
        public string Kind;
        public double AimX, AimZ, X, Z, Radius, Scatter;
        public readonly List<(BattleUnit Unit, int Damage)> Hits = new();
        public readonly List<(BattleUnit Unit, string Status)> Statuses = new();
        public readonly List<BattleProp> Props = new();

        /// <summary>The throw as an attack record (the old area attack's shape: the blast point and the splash).</summary>
        public BattleHit AsHit(BattleUnit att, BattleUnit def, WeaponDef w)
        {
            var res = new AttackResult { RoundsFired = 1 };
            var onDef = Hits.FirstOrDefault(h => h.Unit == def);
            if (onDef.Unit != null) { res.Hits.Add(new HitResult { Hit = true, Damage = onDef.Damage, Part = "torso", Killed = !def.Alive }); res.Damage = onDef.Damage; res.Killed = !def.Alive; }
            else res.Hits.Add(new HitResult { Hit = false, Part = "torso" });
            var hit = new BattleHit { Attacker = att, Defender = def, Weapon = w, Result = res, BlastX = X, BlastZ = Z, Blast = Radius, Kind = "throw" };
            foreach (var h in Hits) if (h.Unit != def) hit.Splash.Add(h);
            return hit;
        }
    }

    /// <summary>A throw before it is made (COMBAT.md B5: the AoE footprint): whether it can be thrown and why not, its AP,
    /// range, radius and scatter, the cells it would cover and who stands in them (allies flagged: friendly fire).</summary>
    public sealed class ThrowPlan
    {
        public bool Ok;
        public string Reason;
        public string Kind;
        public int Ap;
        public double Range, Radius, Scatter;
        public readonly List<(int CX, int CZ)> Cells = new();
        public readonly List<(BattleUnit Unit, bool Ally, double ExpectedDamage)> Caught = new();
    }

    /// <summary>What an executed step did (the Unity side plays it: hits, a throw's landing).</summary>
    public sealed class StepResult
    {
        public bool Done;
        public readonly List<BattleHit> Hits = new();
        public ThrowResult Throw;
    }

    public sealed partial class Battle
    {
        // ---- throwables (C4) --------------------------------------------------------------------------------------------

        /// <summary>What a thrown weapon does by its damage type: explosive → blast, fire → fire, smoke, flash, chem
        /// (or poison), energy/shock → shock; a thrown blade or spike without an area is an attack (null).</summary>
        public static string ThrowKind(WeaponDef w)
        {
            if (w == null || w.Kind != "thrown") return null;
            switch (w.DmgType)
            {
                case "explosive": return "blast";
                case "fire": return "fire";
                case "smoke": return "smoke";
                case "flash": return "flash";
                case "chem": case "poison": return "chem";
                case "energy": case "shock": return "shock";
                default: return (w.Area ?? 0) > 0 ? "blast" : null;
            }
        }

        /// <summary>How far a unit throws a weapon (metres): its range in tiles at 1.5 m, and half a metre for each point
        /// of Brawn over 5.</summary>
        public static double ThrowRange(Combatant c, WeaponDef w) => w.Range * 1.5 + Math.Max(0, Sheet.Attr(c.Sheet, "brawn") - 5) * 0.5;

        /// <summary>The radius a throw covers (metres): the weapon's area in tiles at 1.5 m (Demolitions: one tile more);
        /// smoke at least 2.5 m, a flash 5 m.</summary>
        public static double ThrowRadius(Combatant c, WeaponDef w)
        {
            var k = ThrowKind(w);
            var r = Math.Max(1.5, (w.Area ?? 1) * 1.5);
            if (k == "blast" && Sheet.HasFlag(c.Sheet, "demolitions")) r += 1.5;
            if (k == "smoke") r = Math.Max(2.5, r);
            if (k == "flash") r = Math.Max(5, r);
            if (k == "chem") r = Math.Max(2, r);
            return r;
        }

        /// <summary>How far a throw may land from where it was aimed (metres): a share of the distance that falls with the
        /// Explosives skill (a third at 40, a sixth at 75).</summary>
        public static double ThrowScatter(Combatant c, WeaponDef w, double dist)
        {
            var skill = Sheet.Skill(c.Sheet, w.Skill ?? "explosives");
            return dist * Math.Max(0.03, Math.Min(0.5, (110 - skill) / 200.0));
        }

        /// <summary>The thrown weapon behind an item id the unit carries (in a weapon slot or in the pack).</summary>
        public static WeaponDef Throwable(Combatant c, string itemId)
        {
            if (itemId == null || !Items.Has(itemId)) return null;
            var w = Items.Def(itemId).Weapon;
            if (w == null || w.Kind != "thrown" || ThrowKind(w) == null) return null;
            var has = c.Inv.Equipped.Values.Any(i => i != null && i.Def == itemId && i.Qty > 0) || Inv.CountItem(c.Inv, itemId) > 0;
            return has ? w : null;
        }

        /// <summary>Every throwable (with an area) the unit carries, by item id.</summary>
        public static List<string> Throwables(Combatant c)
        {
            var ids = new List<string>();
            foreach (var i in c.Inv.Equipped.Values) if (i != null && i.Qty > 0 && !ids.Contains(i.Def) && Throwable(c, i.Def) != null) ids.Add(i.Def);
            foreach (var i in c.Inv.Items) if (i.Qty > 0 && !ids.Contains(i.Def) && Throwable(c, i.Def) != null) ids.Add(i.Def);
            return ids;
        }

        /// <summary>What a throw of an item at (x, z) would do (the footprint, before the scatter).</summary>
        public ThrowPlan PlanThrow(BattleUnit u, string itemId, double x, double z)
        {
            var p = new ThrowPlan();
            var w = Throwable(u.C, itemId);
            if (w == null) { p.Reason = "Nothing to throw"; return p; }
            p.Kind = ThrowKind(w); p.Ap = w.Ap; p.Range = ThrowRange(u.C, w); p.Radius = ThrowRadius(u.C, w);
            var dist = Tactics.Dist(u.PX, u.PZ, x, z);
            p.Scatter = ThrowScatter(u.C, w, dist);
            foreach (var c in Surfaces.Disc(x, z, p.Radius)) p.Cells.Add(c);
            foreach (var o in Units)
            {
                if (!o.Alive || (o.Fled && !o.Surrendered)) continue;
                var d = Tactics.Dist(o.PX, o.PZ, x, z);
                if (d > p.Radius) continue;
                double exp = 0;
                if (p.Kind == "blast") { var dd = Sheet.Derived(o.C.Sheet); exp = Math.Max(1, ((w.Dmg[0] + w.Dmg[1]) / 2.0 * (d <= p.Radius / 2 ? 1 : 0.5) * (u.Hostile ? EnemyDmgMul : 1) - dd.Dt) * (1 - dd.Dr / 100.0)); if (o.C.Stance == Stances.Prone) exp *= 0.5; }
                else if (p.Kind == "fire") exp = (w.Dmg[0] + w.Dmg[1]) / 4.0 + 9;
                else if (p.Kind == "chem") exp = 8;
                else if (p.Kind == "shock") exp = 6;
                p.Caught.Add((o, o.Hostile == u.Hostile, exp));
            }
            if (p.Kind == "flash")
            {
                p.Caught.Clear();
                foreach (var o in Units.Where(o => o.InFight && Tactics.Dist(o.PX, o.PZ, x, z) <= p.Radius && SeesPoint(o, x, z))) p.Caught.Add((o, o.Hostile == u.Hostile, 0));
            }
            if (u.C.Ap < p.Ap) { p.Reason = $"Needs {p.Ap} AP"; return p; }
            if (dist > p.Range) { p.Reason = "Too far to throw"; return p; }
            if (dist > 2 && Geometry != null && !SightCached(u.PX, u.PZ, x, z)) { p.Reason = "No clear throw"; return p; }
            if (Pit) { p.Reason = "No throwing in the pit"; return p; }
            p.Ok = true;
            return p;
        }

        /// <summary>Throws an item at (x, z) (C4): AP spent, the item used up, the landing scattered by the skill (the
        /// battle's dice), then the blast, fire, smoke, flash, chem or shock there; friendly fire is real. Null when it
        /// could not be thrown.</summary>
        public ThrowResult Throw(BattleUnit u, string itemId, double x, double z)
        {
            var plan = PlanThrow(u, itemId, x, z);
            if (!plan.Ok) { if (u.C.IsPlayer) Say(plan.Reason ?? "Cannot throw"); return null; }
            var w = Throwable(u.C, itemId);
            u.C.Ap -= plan.Ap;
            u.Hidden = false;
            // used up: from the hand first, else from the pack
            var slot = u.C.Inv.Equipped.FirstOrDefault(kv => kv.Value != null && kv.Value.Def == itemId).Key;
            if (slot != null) { var it = u.C.Inv.Equipped[slot]; it.Qty -= 1; if (it.Qty <= 0) u.C.Inv.Equipped.Remove(slot); }
            else Inv.RemoveItem(u.C.Inv, itemId, 1);
            var ang = Rng.Range(0, Math.PI * 2);
            var off = Rng.Next() * plan.Scatter;
            var r = new ThrowResult { Item = itemId, Kind = plan.Kind, AimX = x, AimZ = z, X = x + Math.Cos(ang) * off, Z = z + Math.Sin(ang) * off, Radius = plan.Radius, Scatter = plan.Scatter };
            Say($"{u.C.Name} throws {Items.Def(itemId).Name}.");
            Detonate(r, w, u);
            ClearTurnCaches();
            return r;
        }

        private void Detonate(ThrowResult r, WeaponDef w, BattleUnit by)
        {
            double x = r.X, z = r.Z, R = r.Radius;
            var from = by?.C.Id;
            switch (r.Kind)
            {
                case "blast":
                {
                    var dmg = new[] { w.Dmg[0], w.Dmg[1] };
                    var mul = by != null && Sheet.HasFlag(by.C.Sheet, "demolitions") ? 1.25 : 1;
                    var air = by != null && Sheet.HasFlag(by.C.Sheet, "airburst");
                    foreach (var o in Units.Where(o => o.Alive && !(o.Fled && !o.Surrendered)).ToList())
                    {
                        var d = BlastHit(o, x, z, R, dmg, by, "blast", mul, air);
                        if (d > 0) r.Hits.Add((o, d));
                    }
                    Surfaces.Blast(x, z, R, from);
                    PropsInBlast(x, z, R, dmg, by, r.Props);
                    break;
                }
                case "fire":
                {
                    Surfaces.Ignite(x, z, R, from);
                    foreach (var o in Units.Where(o => o.InFight && Tactics.Dist(o.PX, o.PZ, x, z) <= R).ToList())
                    {
                        var c = Surfaces.Peek(o.PX, o.PZ);
                        if (c != null && c.Ground == "water") continue;
                        var dd = Sheet.Derived(o.C.Sheet);
                        var d = Math.Max(1, Num.RoundInt((Rng.Int(w.Dmg[0], w.Dmg[1]) * 0.5 * (by != null && by.Hostile ? EnemyDmgMul : 1) - dd.Dt / 2.0) * (1 - Math.Min(90, dd.Dr) / 100.0)));
                        o.C.Sheet.Hp = Math.Max(0, o.C.Sheet.Hp - d);
                        Status.Add(o.C, Status.Burning, 3, 0, from);
                        r.Hits.Add((o, d)); r.Statuses.Add((o, Status.Burning));
                        Say($"{o.C.Name} is caught in the flames ({d}).");
                        Hurt(o, by, d);
                        if (!o.Alive) Killed(o, by);
                    }
                    foreach (var p in Props.Where(p => !p.Destroyed && Tactics.Dist(p.X, p.Z, x, z) <= R).ToList()) { p.Hp -= 5; if (p.Hp <= 0) { Explode(p, by); r.Props.Add(p); } }
                    break;
                }
                case "smoke":
                    Surfaces.Cloud("smoke", x, z, R, SurfaceGrid.SmokeRounds, from);
                    Say("Smoke spreads.");
                    break;
                case "chem":
                    Surfaces.Cloud("chem", x, z, R, SurfaceGrid.ChemRounds, from);
                    foreach (var o in Units.Where(o => o.InFight && Tactics.Dist(o.PX, o.PZ, x, z) <= R)) { Status.Add(o.C, Status.Choking, 1, 0, from); r.Statuses.Add((o, Status.Choking)); }
                    foreach (var (cx, cz, f) in Surfaces.Bursts.ToArray()) BurstChem(SurfaceGrid.Centre(cx, cz).X, SurfaceGrid.Centre(cx, cz).Z, UnitById(f));
                    Surfaces.Bursts.Clear();
                    break;
                case "flash":
                    foreach (var o in Units.Where(o => o.InFight && Tactics.Dist(o.PX, o.PZ, x, z) <= R).ToList())
                    {
                        if (!SeesPoint(o, x, z)) continue;
                        if (Geometry != null && Tactics.FromPieces(CoverCached(o.PX, o.PZ), x - o.PX, z - o.PZ, 0).Level == "full") continue;
                        var d = Tactics.Dist(o.PX, o.PZ, x, z);
                        Status.Add(o.C, Status.Blinded, d <= 2 ? 2 : 1, 0, from);
                        if (o.Watch != null) o.Watch = null;
                        r.Statuses.Add((o, Status.Blinded));
                        Say($"{o.C.Name} is blinded.");
                    }
                    break;
                case "shock":
                    foreach (var o in Units.Where(o => o.InFight && Tactics.Dist(o.PX, o.PZ, x, z) <= R).ToList()) { Shock(o, by); r.Statuses.Add((o, Status.Shocked)); }
                    Electrify(x, z, by);
                    break;
            }
            var bh = new BattleHit { Attacker = by, Defender = null, Weapon = w, BlastX = x, BlastZ = z, Blast = R, Kind = "blast" };
            foreach (var h in r.Hits) bh.Splash.Add(h);
            History.Add(bh);
        }

        /// <summary>One unit caught in a blast at (x, z): full damage in the inner half, half beyond; prone halves it, so does
        /// full cover facing the blast (not an airburst); armour as it applies; the close may be knocked flat. Returns the
        /// damage done.</summary>
        internal int BlastHit(BattleUnit o, double x, double z, double R, int[] dmg, BattleUnit by, string kind, double mul = 1, bool airburst = false)
        {
            var d = Tactics.Dist(o.PX, o.PZ, x, z);
            if (d > R || !o.Alive) return 0;
            double raw = Rng.Int(dmg[0], dmg[1]) * (d <= R / 2 ? 1 : 0.5) * mul * (by != null && by.Hostile ? EnemyDmgMul : 1);
            if (o.C.Stance == Stances.Prone) raw *= 0.5;
            if (!airburst && Geometry != null && d > 0.8 && Tactics.FromPieces(CoverCached(o.PX, o.PZ), x - o.PX, z - o.PZ, 0).Level == "full") raw *= 0.5;
            var dd = Sheet.Derived(o.C.Sheet);
            var dmgDone = Math.Max(1, Num.RoundInt((raw - dd.Dt / 2.0) * (1 - Math.Min(90, dd.Dr) / 100.0)));
            o.C.Sheet.Hp = Math.Max(0, o.C.Sheet.Hp - dmgDone);
            Say($"{o.C.Name} is caught in the blast ({dmgDone}).");
            if (o.Alive && d <= R / 2 && o.C.Stance != Stances.Prone && Rng.Chance(0.5)) { o.C.Stance = Stances.Prone; Say($"{o.C.Name} is thrown down."); }
            Hurt(o, by, dmgDone);
            if (!o.Alive) Killed(o, by);
            return dmgDone;
        }

        private void PropsInBlast(double x, double z, double R, int[] dmg, BattleUnit by, List<BattleProp> set)
        {
            foreach (var p in Props.Where(p => !p.Destroyed && Tactics.Dist(p.X, p.Z, x, z) <= R).ToList())
            {
                p.Hp -= Rng.Int(dmg[0], dmg[1]);
                if (p.Hp <= 0) { Explode(p, by); set?.Add(p); }
            }
        }

        /// <summary>A prop goes up (C5): a fuel drum's fireball and burning spill, a chem drum's cloud, a generator's blast
        /// and current through the water about it; blasts set off the props near.</summary>
        public void Explode(BattleProp p, BattleUnit by)
        {
            if (p.Destroyed) return;
            p.Destroyed = true; p.Hp = 0;
            Say($"The {p.Kind} goes up!");
            var from = by?.C.Id;
            var R = p.Radius;
            var hit = new BattleHit { Attacker = by, BlastX = p.X, BlastZ = p.Z, Blast = R, Kind = "blast" };
            foreach (var o in Units.Where(o => o.Alive && !(o.Fled && !o.Surrendered)).ToList())
            {
                var d = BlastHit(o, p.X, p.Z, p.Kind == "chem" ? 2 : R, p.Dmg, by, "prop");
                if (d > 0) hit.Splash.Add((o, d));
            }
            if (p.Kind == "fuel") { Surfaces.Spill("oil", p.X, p.Z, 2, 0, from); Surfaces.Ignite(p.X, p.Z, 2, from); }
            else if (p.Kind == "chem") Surfaces.Cloud("chem", p.X, p.Z, 3, SurfaceGrid.ChemRounds, from);
            else if (p.Kind == "generator") { Electrify(p.X, p.Z, by); foreach (var o in Units.Where(o => o.InFight && Tactics.Dist(o.PX, o.PZ, p.X, p.Z) <= 2.5).ToList()) Shock(o, by); }
            Surfaces.Blast(p.X, p.Z, R, from);
            History.Add(hit);
            PropsInBlast(p.X, p.Z, R, p.Dmg, by, null);
            ClearTurnCaches();
        }

        /// <summary>A chem cloud's cell bursts into flame: whoever stands within two metres is caught.</summary>
        private void BurstChem(double x, double z, BattleUnit by)
        {
            Say("The chem cloud bursts into flame!");
            foreach (var o in Units.Where(o => o.Alive && !(o.Fled && !o.Surrendered)).ToList()) BlastHit(o, x, z, 2, new[] { 6, 12 }, by, "chem");
        }

        /// <summary>Current through the water (or metal) at a point: everyone standing in it is shocked.</summary>
        private void Electrify(double x, double z, BattleUnit by)
        {
            var cells = Surfaces.Electrify(x, z, 8, by?.C.Id);
            if (cells.Count == 0) return;
            var set = new HashSet<(int, int)>(cells);
            foreach (var o in Units.Where(o => o.InFight && set.Contains((SurfaceGrid.CellOf(o.PX), SurfaceGrid.CellOf(o.PZ)))).ToList()) Shock(o, by);
        }

        /// <summary>A shock: health now, and the chance of a lost turn.</summary>
        private void Shock(BattleUnit o, BattleUnit by)
        {
            var d = Math.Max(1, Rng.Int(4, 8) - Sheet.Derived(o.C.Sheet).Dt / 2);
            o.C.Sheet.Hp = Math.Max(0, o.C.Sheet.Hp - d);
            Say($"Current runs through {o.C.Name} ({d}).");
            if (o.Alive && Rng.Chance(0.3)) { o.C.Stunned = true; Say($"{o.C.Name} is stunned."); }
            Hurt(o, by, d);
            if (!o.Alive) Killed(o, by);
        }

        /// <summary>The odds of hitting a prop (a still, big target: no reflex or evasion, +20).</summary>
        public int PropChance(BattleUnit att, BattleProp p)
        {
            var w = CombatRules.WeaponOf(att.C).def;
            var s = att.C.Sheet;
            var d = Tactics.Dist(att.PX, att.PZ, p.X, p.Z);
            if (CombatRules.IsMelee(w)) return d <= CombatRules.MeleeReach(w) ? 95 : 0;
            double c = Sheet.Skill(s, w.Skill) + Sheet.ModSum(s, "hit_ranged") + 20 - Math.Max(0, d - Sheet.Derived(s).SightRange) * 4 - Math.Max(0, d - w.Range) * 8 - Status.AimPenalty(att.C, false);
            return Num.RoundInt(Math.Max(5, Math.Min(95, c)));
        }

        /// <summary>Shoots (or strikes) a prop: at no health it goes up (<see cref="Explode"/>).</summary>
        public BattleHit AttackProp(BattleUnit att, BattleProp p)
        {
            if (p == null || p.Destroyed) return null;
            var w = CombatRules.WeaponOf(att.C).def;
            var item = CombatRules.WeaponOf(att.C).item;
            var ap = CombatRules.AttackAp(att.C);
            if (att.C.Ap < ap || !CombatRules.CanAttack(att.C).Ok || w.Kind == "thrown") return null;
            var melee = CombatRules.IsMelee(w);
            if (!melee && Geometry != null && !SightCached(att.PX, att.PZ, p.X, p.Z)) return null;
            var chance = PropChance(att, p);
            if (chance <= 0) return null;
            att.C.Ap -= ap;
            att.Hidden = false;
            if (w.Magazine != null && item != null) item.Loaded = Math.Max(0, (item.Loaded ?? 0) - 1);
            if (item != null && w.Durability > 1) Inv.Wear(item, 1);
            var res = new AttackResult { RoundsFired = 1 };
            if (Rng.Next() * 100 < chance)
            {
                var dmg = Rng.Int(w.Dmg[0], w.Dmg[1]);
                p.Hp -= dmg;
                res.Hits.Add(new HitResult { Hit = true, Damage = dmg, Part = "prop" }); res.Damage = dmg;
                Say($"{att.C.Name} hits the {p.Kind}.");
            }
            else { res.Hits.Add(new HitResult { Hit = false, Part = "prop" }); Say($"{att.C.Name} misses the {p.Kind}."); }
            var hit = new BattleHit { Attacker = att, Weapon = w, Result = res, Kind = "prop", BlastX = p.X, BlastZ = p.Z };
            History.Add(hit);
            if (p.Hp <= 0) Explode(p, att);
            return hit;
        }

        // ---- stances (C2) -------------------------------------------------------------------------------------------------

        /// <summary>Takes a stance: the turn's free minor action covers one change, getting up from prone is 1 AP, any other
        /// change 1 AP. Dropping prone puts out the flames (if not lying in them).</summary>
        public bool SetStance(BattleUnit u, string stance)
        {
            if (stance != Stances.Stand && stance != Stances.Crouch && stance != Stances.Prone) return false;
            if (u.C.Stance == stance) return false;
            var cost = Stances.ChangeAp(u.C.Stance, stance, !u.C.MinorUsed);
            if (u.C.Ap < cost) return false;
            u.C.Ap -= cost;
            if (cost == 0) u.C.MinorUsed = true;
            u.C.Stance = stance;
            if (stance == Stances.Prone && Status.Has(u.C, Status.Burning) && (Surfaces.Peek(u.PX, u.PZ)?.Fire ?? 0) == 0) { Status.Doused(u.C); Say($"{u.C.Name} rolls the flames out."); }
            Say(stance == Stances.Prone ? $"{u.C.Name} drops flat." : stance == Stances.Crouch ? $"{u.C.Name} crouches." : $"{u.C.Name} stands.");
            return true;
        }

        // ---- reactions (C3, C7) -------------------------------------------------------------------------------------------

        /// <summary>Whether a unit can hold a shot ready now (a loaded gun, or a blade for a guard, and the AP for one attack).</summary>
        public bool CanHold(BattleUnit u, bool needAp = true)
        {
            if (Pit || !u.InFight) return false;
            var w = CombatRules.WeaponOf(u.C).def;
            if (w.Kind == "thrown" || !CombatRules.CanAttack(u.C).Ok) return false;
            return !needAp || u.C.Ap >= CombatRules.AttackAp(u.C);
        }

        private void SetWatch(BattleUnit u, Watch w)
        {
            u.Watch = w;
            Say(w.Mode == Watch.Cover ? $"{u.C.Name} gives cover." : w.Mode == Watch.Guard ? $"{u.C.Name} stands guard." : w.Mode == Watch.Ambush ? $"{u.C.Name} lies in wait." : $"{u.C.Name} watches.");
        }

        /// <summary>Overwatch (C3): the rest of the turn held for one shot at the first enemy who moves in sight within the
        /// cone (all round with <paramref name="halfAngle"/> 180) and in range, at −15 (none with the Overwatch perk). A
        /// blade holds a guard instead (a blow for whoever steps within reach). Ends the turn.</summary>
        public bool Overwatch(BattleUnit u, double dirX = 0, double dirZ = 0, double halfAngle = 180)
        {
            if (!CanHold(u)) return false;
            var melee = CombatRules.IsMelee(CombatRules.WeaponOf(u.C).def);
            SetWatch(u, new Watch { Mode = melee ? Watch.Guard : Watch.Overwatch, DirX = dirX, DirZ = dirZ, HalfAngle = halfAngle });
            u.C.Ap = 0;
            return true;
        }

        /// <summary>Cover fire (C7): like overwatch, but it also answers any enemy in sight who attacks (the one covered,
        /// or anyone of the side): the shot comes first, and a hit pins the attacker. Ends the turn.</summary>
        public bool CoverFire(BattleUnit u, BattleUnit covered = null)
        {
            if (!CanHold(u) || CombatRules.IsMelee(CombatRules.WeaponOf(u.C).def)) return false;
            SetWatch(u, new Watch { Mode = Watch.Cover, Target = covered });
            u.C.Ap = 0;
            return true;
        }

        /// <summary>An ambush (C3; B11's surprise): the unit lies hidden, holding a steady shot for the first enemy who moves
        /// in sight; when one of the group fires, all are revealed and fire as their targets show. Set before the fight
        /// (no AP) or as a turn's end.</summary>
        public bool Ambush(BattleUnit u, int group = 1, double dirX = 0, double dirZ = 0, double halfAngle = 180)
        {
            if (Pit || !u.InFight || !CombatRules.CanAttack(u.C).Ok) return false;
            u.Watch = new Watch { Mode = Watch.Ambush, Group = group, DirX = dirX, DirZ = dirZ, HalfAngle = halfAngle };
            u.Hidden = true;
            if (Active && Current == u) u.C.Ap = 0;
            return true;
        }

        /// <summary>Rounds a suppression fires (a burst's, else three) and its AP (a burst's, else a shot's and one).</summary>
        public static (int Rounds, int Ap) SuppressCost(Combatant c)
        {
            var w = CombatRules.WeaponOf(c).def;
            return w.Burst != null ? (w.Burst.Rounds, w.Burst.Ap) : (3, CombatRules.AttackAp(c) + 1);
        }

        /// <summary>Whether a unit could suppress a target now (a gun with the rounds, the AP, a line).</summary>
        public (bool Ok, string Reason, int Ap) CanSuppress(BattleUnit att, BattleUnit def)
        {
            var (w, item) = CombatRules.WeaponOf(att.C);
            var (rounds, ap) = SuppressCost(att.C);
            if (Pit || CombatRules.IsMelee(w) || w.Kind == "thrown" || w.Magazine == null) return (false, "Needs a gun", ap);
            if (!CombatRules.CanAttack(att.C).Ok) return (false, "Out of ammo", ap);
            if ((item?.Loaded ?? 0) < Math.Min(rounds, w.Magazine.Value) || w.Magazine.Value < 3) return (false, "Not enough rounds", ap);
            if (!Sees(att, def)) return (false, "No line of sight", ap);
            if (Tactics.Dist(att.PX, att.PZ, def.PX, def.PZ) > w.Range + 8) return (false, "Out of range", ap);
            if (att.C.Ap < ap) return (false, $"Needs {ap} AP", ap);
            return (true, null, ap);
        }

        /// <summary>Suppression (C7): rounds poured at a target to pin it, no damage rolled: until its next turn ends it
        /// loses AP (1, 2 with Suppressing Fire) and 15 aim, its nerve shakes, and if it moves the suppressor fires on it.</summary>
        public BattleHit Suppress(BattleUnit att, BattleUnit def)
        {
            var cs = CanSuppress(att, def);
            if (!cs.Ok) { if (att.C.IsPlayer) Say(cs.Reason); return null; }
            var (w, item) = CombatRules.WeaponOf(att.C);
            var (rounds, ap) = SuppressCost(att.C);
            att.C.Ap -= ap;
            att.Hidden = false;
            rounds = Math.Min(rounds, item?.Loaded ?? rounds);
            if (item != null) { item.Loaded = Math.Max(0, (item.Loaded ?? 0) - rounds); if (w.Durability > 1) Inv.Wear(item, rounds); }
            Status.Add(def.C, Status.Suppressed, 1, Sheet.HasFlag(att.C.Sheet, "suppress") ? 2 : 1, att.C.Id);
            CombatRules.MoraleEvent(def.C, "suppressed");
            att.Watch = new Watch { Mode = Watch.Suppress, Target = def };
            att.C.Ap = 0;
            Say($"{att.C.Name} pins {def.C.Name} down.");
            var hit = new BattleHit { Attacker = att, Defender = def, Weapon = w, Kind = "suppress", Result = new AttackResult { RoundsFired = rounds } };
            History.Add(hit);
            return hit;
        }

        // ---- morale's ends (C9) -----------------------------------------------------------------------------------------

        /// <summary>The unit's nerve breaks: it runs for an exit (or, where the field has none, out of the fight at its move).</summary>
        public void Flee(BattleUnit u) { if (!u.Fleeing) { u.Fleeing = true; Say($"{u.C.Name} breaks and runs."); } }

        /// <summary>The field has somewhere to run to for this unit.</summary>
        public bool HasExits(BattleUnit u) => (Geometry?.Exits(u)?.Count ?? 0) > 0;

        /// <summary>The unit throws down its weapon (out of the fight; the other side may take it prisoner).</summary>
        public void Surrender(BattleUnit u)
        {
            if (u.Surrendered) return;
            u.Surrendered = true; u.Fled = true; u.Fleeing = false; u.Watch = null;
            foreach (var f in EnemiesOf(u)) CombatRules.MoraleEvent(f.C, "enemy_fled");
        }

        /// <summary>Takes a surrendered enemy prisoner (C9): within two metres, 2 AP; a prisoner cannot slip away.</summary>
        public bool TakePrisoner(BattleUnit captor, BattleUnit p)
        {
            if (p == null || !p.Surrendered || p.Prisoner || p.Escaped || !p.Alive || !captor.InFight || captor.Hostile == p.Hostile) return false;
            if (Distance(captor, p) > 2.0 || captor.C.Ap < 2) return false;
            captor.C.Ap -= 2;
            p.Prisoner = true;
            Say($"{captor.C.Name} takes {p.C.Name} prisoner.");
            return true;
        }

        /// <summary>A demand to yield (a warden's, the turn's free minor action): every enemy within 15 m loses nerve, the
        /// hurt and the pinned the more.</summary>
        public bool Shout(BattleUnit u)
        {
            if (u.C.MinorUsed || !u.InFight) return false;
            u.C.MinorUsed = true;
            Say($"{u.C.Name}: \"Down on the ground!\"");
            foreach (var f in EnemiesOf(u).Where(f => !f.C.IsPlayer && Distance(u, f) <= 15).ToList())
            {
                var before = f.C.Morale;
                CombatRules.MoraleEvent(f.C, "demand");
                var hurt = f.C.Sheet.Hp < Sheet.Derived(f.C.Sheet).MaxHp * 0.5 || Status.Has(f.C, Status.Suppressed);
                if (hurt) f.C.Morale = Math.Max(0, f.C.Morale - (before - f.C.Morale) * 0.5);
            }
            return true;
        }

        // ---- carrying out the AI's steps -----------------------------------------------------------------------------

        /// <summary>Carries out a step that is not a walk (the Unity side walks the body for move and flee, then calls
        /// <see cref="Moved"/>): attacks, throws, holds, stances, items, prisoners, a shout, a surrender. Returns what it did.</summary>
        public StepResult Execute(BattleUnit u, AiStep a, int now = 0)
        {
            var r = new StepResult();
            switch (a.Kind)
            {
                case "attack": case "burst": { var h = Attack(u, a.Target, a.Aimed, a.Kind == "burst"); if (h != null) { r.Hits.Add(h); r.Done = true; } break; }
                case "throw": { var t = Throw(u, a.Item, a.X, a.Z); if (t != null) { r.Throw = t; r.Done = true; } break; }
                case "shoot_prop": { var h = AttackProp(u, a.Prop); if (h != null) { r.Hits.Add(h); r.Done = true; } break; }
                case "overwatch": r.Done = Overwatch(u, a.X, a.Z, a.HalfAngle); break;
                case "cover": r.Done = CoverFire(u, a.Target); break;
                case "suppress": { var h = Suppress(u, a.Target); if (h != null) { r.Hits.Add(h); r.Done = true; } break; }
                case "stance": r.Done = SetStance(u, a.Stance); break;
                case "reload": r.Done = Reload(u); break;
                case "swap": r.Done = Swap(u); if (r.Done) Say($"{u.C.Name} switches to {(CombatRules.WeaponOf(u.C).item is Inventory.ItemInst wi ? Items.Def(wi.Def).Name : "bare hands")}."); break;
                case "heal": r.Done = UseItem(u, a.Item ?? HealItems(u.C).FirstOrDefault() ?? HealItem, now); break;
                case "heal_ally": r.Done = UseItemOn(u, a.Target, a.Item ?? HealItems(u.C).FirstOrDefault(), now); break;
                case "capture": r.Done = TakePrisoner(u, a.Target); break;
                case "shout": r.Done = Shout(u); break;
                case "surrender": Surrender(u); Say($"{u.C.Name} throws down their weapon."); r.Done = true; break;
                case "flee": Flee(u); r.Done = true; break;
                case "wait": break;
            }
            return r;
        }

        /// <summary>Plays a unit's whole turn by the AI with no one to show it (tests, the harness, an auto-resolve): walks
        /// along the field's paths as far as the AP goes.</summary>
        public List<AiStep> RunAiTurn(BattleUnit u, int maxSteps = 14)
        {
            var steps = new List<AiStep>();
            for (var i = 0; i < maxSteps && Active && u.InFight && u.C.Ap > 0; i++)
            {
                var ap = u.C.Ap; var minor = u.C.MinorUsed; var stance = u.C.Stance;
                var a = Choose(u);
                steps.Add(a);
                if (a.Kind == "wait") break;
                if (a.Kind == "move" || a.Kind == "flee")
                {
                    if (a.Kind == "flee") Flee(u);
                    WalkTo(u, a.X, a.Z);
                    if (a.Kind == "flee" && u.Fleeing && !u.Fled && !HasExits(u)) u.Fled = true;
                }
                else
                {
                    var r = Execute(u, a);
                    if (a.Kind == "surrender") break;
                    if (!r.Done && u.C.Ap == ap) break;
                }
                if (u.C.Ap == ap && u.C.MinorUsed == minor && u.C.Stance == stance && a.Kind != "flee") break;
            }
            return steps;
        }

        /// <summary>Walks a unit towards a point along the field's path, as far as its AP goes (no body to move: tests and
        /// auto-resolve).</summary>
        public MoveOutcome WalkTo(BattleUnit u, double x, double z)
        {
            var path = PathFor(u, x, z);
            double len = 0;
            for (var i = 1; i < path.Count; i++) len += Tactics.Dist(path[i - 1].X, path[i - 1].Z, path[i].X, path[i].Z);
            var slow = Surfaces.Count > 0 ? Surfaces.SlowMetres(path) : 0;
            var max = Reach(u) * (len > 0 ? len / (len + slow) : 1);
            var metres = Math.Min(len, max);
            if (metres < 0.2) { u.C.Ap = Math.Max(0, u.C.Ap - 1); return new MoveOutcome { X = u.PX, Z = u.PZ }; }
            var end = metres >= len - 1e-6 ? (x, z) : Along(path, metres);
            return Moved(u, end.Item1, end.Item2, metres);
        }
    }
}
