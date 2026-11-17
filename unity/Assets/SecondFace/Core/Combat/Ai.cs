using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using SecondFace.Core.Inventory;
using SecondFace.Core.Stats;

namespace SecondFace.Core.Combat
{
    /// <summary>
    /// The combat AI (COMBAT.md D1–D6): a utility AI that, every step, scores every action it could take and takes the best.
    /// Its currency is damage: what an attack is expected to do (and the chance it downs someone, weighed by whom: the
    /// wounded, the exposed, the dangerous, the one its allies are on), against what the enemy side is expected to do back
    /// to wherever it stands at the end (each enemy's odds against that spot's cover, by their shots a turn), with the
    /// held shots its walk would draw, the blasts it would bunch up for, the hazards it would walk through. Throws are
    /// weighed by everyone in the footprint, friends counting against; overwatch, cover fire and suppression by what is
    /// coming and who needs covering; stances, reloads, healing, prisoners and a demand to yield by their moments. The
    /// archetype (<see cref="Archetypes"/>) weights the terms and sets the hard traits; the difficulty shapes them
    /// (<see cref="CombatDifficulty"/>). Hard rules then hold whatever the scores say (D5): it never shoots or throws
    /// through or onto its own, never walks into fire, chem or current without cause (fleeing), never ends a turn in the
    /// open when cover is in reach (unless charging, fleeing, or an animal), never wastes a turn it could use. It never
    /// rolls the battle's dice (its noise is a hash), and its budget is by candidates (D6), so a seed plays the same on
    /// any machine.
    /// </summary>
    public sealed class CombatAi
    {
        private readonly Battle _b;
        /// <summary>Standing points weighed per decision (D6).</summary>
        public int MaxPositions = 40;
        /// <summary>Aim points weighed per throwable.</summary>
        public int MaxThrowPoints = 8;

        /// <summary>The options the last decision weighed, best first (for the UI's "why" and for tests).</summary>
        public readonly List<AiStep> LastOptions = new();

        public CombatAi(Battle b) { _b = b; }

        /// <summary>What the AI knows of one enemy this decision (the cheap model of their fire and of ours).</summary>
        private sealed class Foe
        {
            public BattleUnit U;
            public WeaponDef W;
            public bool Melee, Shotgun, SeenNow;
            public double Dist, ReachNext, Avg, Rounds, Shots, Flat, Sight, Range;
            /// <summary>How far they can walk and still shoot next turn (metres).</summary>
            public double MoveShoot;
            // ours against them
            public double MyFlat, MyAvg, MyMin, MyMax, MyCrit, MyRounds;
            public double Value;
            public bool HasCover;
            public double HpFrac;
        }

        private sealed class Ctx
        {
            public BattleUnit U;
            public AiProfile P;
            public List<Foe> Foes;
            public List<BattleUnit> Allies;
            public WeaponDef W;
            public bool Melee;
            public int AtkAp;
            public double HpFrac, Wounded;
            public bool FoesThrow;
            public double MySight;
            public List<BattleUnit> Watchers;
            public Dictionary<BattleUnit, double> AllyHp = new();
        }

        public AiStep Choose(BattleUnit u)
        {
            var sw = Stopwatch.StartNew();
            try
            {
                var a = Decide(u);
                if (a.Target != null && (a.Kind == "attack" || a.Kind == "burst" || a.Kind == "suppress")) u.Intent = a.Target;
                return a;
            }
            finally { _b.LastDecisionMs = sw.Elapsed.TotalMilliseconds; }
        }

        private AiStep Decide(BattleUnit u)
        {
            _cands = null; _safeNear = null;
            var wait = new AiStep { Kind = "wait", Score = 0 };
            var foeUnits = _b.EnemiesOf(u).Where(f => !f.Surrendered).ToList();
            var p = _b.ProfileOf(u);
            // a fight gone quiet (everyone holding for everyone): caution, respect for held shots and the taste for holding
            // all wane round by round, so someone steps out
            var pressure = Math.Max(0, Math.Min(1, (_b.RoundsWithoutHarm - 2) / 4.0));
            if (pressure > 0)
            {
                p = p.Clone();
                p.Caution *= 1 - 0.75 * pressure; p.ReadThreats *= 1 - 0.85 * pressure; p.Overwatch *= 1 - 0.9 * pressure; p.Aggression *= 1 + 0.5 * pressure;
            }
            if (foeUnits.Count == 0)
            {
                // only the surrendered are left: take them prisoner if that is this side's way
                var cap = Capture(u, p);
                return cap ?? wait;
            }
            var x = Build(u, p, foeUnits);
            var acts = new List<AiStep> { wait };
            var s = u.C.Sheet;

            // ---- nerve: surrender, flight ------------------------------------------------------------------------------
            // (the player's own body never gives up or runs on the AI's say: an auto-turn fights or holds)
            var steadied = !u.Hostile && !u.C.IsPlayer && _b.Player is BattleUnit pl && pl.InFight && Sheet.HasFlag(pl.C.Sheet, "inspire");
            if (!u.C.IsPlayer && !p.NoMorale && !steadied)
            {
                var breakAt = 20 / Math.Max(0.3, p.Nerve);
                if (!p.Instinct && u.C.Morale < breakAt * 0.5 && x.HpFrac < 0.35) acts.Add(new AiStep { Kind = "surrender", Score = 120 });
                if (u.Fleeing || u.C.Morale < breakAt || (p.FleeHp > 0 && x.HpFrac < p.FleeHp))
                {
                    var (fx, fz) = FleePoint(x);
                    acts.Add(new AiStep { Kind = "flee", X = fx, Z = fz, Score = 100 });
                }
            }

            // ---- patching up, reloading ----------------------------------------------------------------------------------
            if (!p.Instinct)
            {
                var heals = Battle.HealItems(u.C);
                var bleeding = Status.Has(u.C, Status.Bleeding);
                if (heals.Count > 0)
                {
                    var hap = Items.Def(heals[0]).Consumable?.Ap ?? 2;
                    if (u.C.Ap >= hap && (x.HpFrac < 0.4 || (bleeding && x.HpFrac < 0.75)))
                        acts.Add(new AiStep { Kind = "heal", Item = heals[0], Score = 55 + (1 - x.HpFrac) * 40 + (bleeding ? 10 : 0) });
                    if (u.C.Ap >= hap && p.Protect > 0)
                        foreach (var a in x.Allies)
                        {
                            var af = a.C.Sheet.Hp / (double)Math.Max(1, Sheet.Derived(a.C.Sheet).MaxHp);
                            if (af < 0.35 && Battle.Distance(u, a) <= 1.8) acts.Add(new AiStep { Kind = "heal_ally", Target = a, Item = heals[0], Score = 40 * p.Protect * (1 - af) + (a.C.IsPlayer || a.Leader ? 8 : 0) });
                        }
                }
                var (wd, it) = CombatRules.WeaponOf(u.C);
                // a dry gun and nothing to load: the other hand (a sidearm, a blade, or bare fists)
                if (wd.Magazine != null && it != null && (it.Loaded ?? 0) == 0 && !HasAmmo(u.C, wd) && u.C.Ap >= CombatRules.SwapAp(u.C))
                {
                    var other = u.C.Inv.EquippedAt(u.C.Inv.Active == "primary" ? "secondary" : "primary");
                    var ow = other != null && Items.Has(other.Def) ? Items.Def(other.Def).Weapon : null;
                    var usable = ow == null || ow.Magazine == null || (other.Loaded ?? 0) > 0 || HasAmmo(u.C, ow);
                    if (usable) acts.Add(new AiStep { Kind = "swap", Score = 30, Why = ow == null ? "fists" : other.Def });
                }
                if (wd.Magazine != null && it != null && u.C.Ap >= CombatRules.ReloadAp(u.C) && HasAmmo(u.C, wd))
                {
                    if ((it.Loaded ?? 0) == 0) acts.Add(new AiStep { Kind = "reload", Score = 50 });
                    else if ((it.Loaded ?? 0) < wd.Magazine.Value && (it.Loaded ?? 0) < Math.Max(1, wd.Magazine.Value / 3)) acts.Add(new AiStep { Kind = "reload", Score = 7 });
                }
                if (Status.Has(u.C, Status.Burning) && (_b.Surfaces.Peek(u.PX, u.PZ)?.Fire ?? 0) == 0 && u.C.Stance != Stances.Prone && u.C.Ap >= Stances.ChangeAp(u.C.Stance, Stances.Prone, !u.C.MinorUsed))
                    acts.Add(new AiStep { Kind = "stance", Stance = Stances.Prone, Score = 22, Why = "put out the flames" });
            }

            // ---- attacks from here --------------------------------------------------------------------------------------
            var exposedHere = Exposed(x, u.PX, u.PZ);
            var threatHere = Threat(x, u.PX, u.PZ);
            double bestAttack = double.NegativeInfinity;
            var snapChance = new Dictionary<BattleUnit, int>();
            if (CombatRules.CanAttack(u.C).Ok)
            {
                foreach (var f in x.Foes)
                {
                    foreach (var o in ShotChoices(x, f))
                    {
                        var sp = _b.Preview(u, f.U, o);
                        if (!sp.Ok) continue;
                        if (o.Aimed == null && !o.Burst) snapChance[f.U] = sp.Chance;
                        // D5: never through one of its own
                        if (sp.InTheWay != null && sp.InTheWay.Hostile == u.Hostile) continue;
                        var val = Value(x, f, sp.KillChance);
                        var sc = 6 + val * (sp.Expected * 2 + sp.KillChance * 24) - sp.Ap * 0.6;
                        if (sp.Chance < 12) sc -= 20;
                        if (o.Aimed == "legL" && (f.U.Fleeing || (f.Melee && f.Dist < 10))) sc += 6;
                        if (o.Burst) sc -= 2;
                        if (sp.Answered.Count > 0) sc -= 4 * sp.Answered.Count * p.ReadThreats;
                        // locked in the open: the AP left after this shot does not reach the cover in reach now
                        sc -= LockIn(x, exposedHere, threatHere, u.C.Ap - sp.Ap);
                        acts.Add(new AiStep { Kind = o.Burst ? "burst" : "attack", Target = f.U, Aimed = o.Aimed, Score = sc });
                        bestAttack = Math.Max(bestAttack, sc);
                    }
                }
            }

            // ---- throws, props --------------------------------------------------------------------------------------------
            if (!p.Instinct && p.Throw > 0 && !_b.Pit) foreach (var t in Throws(x)) { acts.Add(t); bestAttack = Math.Max(bestAttack, t.Score); }
            if (!p.Instinct && !_b.Pit) foreach (var t in PropShots(x)) acts.Add(t);

            // ---- holding: overwatch, cover fire; suppression ---------------------------------------------------------------
            if (!p.Instinct && _b.CanHold(u) && !x.Melee)
            {
                var approaching = x.Foes.Count(f => !f.SeenNow && f.Dist <= f.ReachNext + x.W.Range + 4);
                var weakShots = x.Foes.Count(f => f.SeenNow && snapChance.TryGetValue(f.U, out var c) && c < 35);
                var want = approaching > 0 ? 9 : weakShots > 0 ? 5 : 2;
                var patience = (u.IdleWatches >= 2 ? 0.3 : 1) * (_b.RoundsWithoutHarm >= 2 ? 0.45 : 1);
                var sc = p.Overwatch * want * patience + (exposedHere ? -3 : 2) - Math.Max(0, bestAttack - 10) * 0.5;
                var covered = p.Protect >= 1 ? x.Allies.Where(a => Battle.Distance(u, a) <= 8 && (a.Leader || a.C.IsPlayer || a.C.Sheet.Hp < Sheet.Derived(a.C.Sheet).MaxHp * 0.5)).OrderBy(a => a.C.Sheet.Hp).FirstOrDefault() : null;
                if (covered != null) acts.Add(new AiStep { Kind = "cover", Target = covered, Score = sc + 1.5, Why = "covering " + covered.C.Id });
                else
                {
                    var dir = Centroid(x.Foes.Select(f => f.U));
                    acts.Add(new AiStep { Kind = "overwatch", X = dir.X - u.PX, Z = dir.Z - u.PZ, HalfAngle = 180, Score = sc });
                }
            }
            if (!p.Instinct && p.Suppress > 0)
                foreach (var f in x.Foes.Where(f => f.SeenNow))
                {
                    var cs = _b.CanSuppress(u, f.U);
                    if (!cs.Ok) continue;
                    if (_b.InTheWay(u, u.PX, u.PZ, f.U, f.U.PX, f.U.PZ) is BattleUnit iw && iw.Hostile == u.Hostile) continue;
                    snapChance.TryGetValue(f.U, out var sc0);
                    var danger = f.Avg * f.Shots * f.Rounds * 0.5;
                    var value = danger * 0.45 + (f.HasCover ? 2 : 0) + (p.Coordinate && x.Allies.Count > 0 && f.HasCover ? 5 : 0) + (p.ArrestFirst ? 3 : 0);
                    var sc = 2 + value * p.Suppress - (sc0 >= 50 ? 9 : 0) - LockIn(x, exposedHere, threatHere, 0);
                    acts.Add(new AiStep { Kind = "suppress", Target = f.U, Score = sc });
                }

            // ---- a demand to yield, prisoners ----------------------------------------------------------------------------
            if (p.ArrestFirst && !u.C.MinorUsed && !u.C.Used.Contains("shout") && x.Foes.Any(f => f.SeenNow && !f.U.C.IsPlayer && f.Dist <= 15))
                acts.Add(new AiStep { Kind = "shout", Score = 60, Why = "free" });
            var capture = Capture(u, p);
            if (capture != null) acts.Add(capture);

            // ---- moving ------------------------------------------------------------------------------------------------------
            var cands = u.C.Ap > 0 ? Candidates(x) : new List<(double X, double Z, int Cost)>();
            var here = Eval(x, u.PX, u.PZ, u.C.Ap, 0, null);
            AiStep bestMove = null; double bestMoveScore = double.NegativeInfinity;
            var evals = new List<(double X, double Z, int Cost, double Score, bool Exposed)>();
            foreach (var (cx, cz, cost) in cands)
            {
                var sc = Eval(x, cx, cz, u.C.Ap - cost, cost, PathIfNeeded(x, cx, cz));
                if (double.IsNegativeInfinity(sc)) continue;
                var exp = Exposed(x, cx, cz);
                evals.Add((cx, cz, cost, sc, exp));
                var imp = sc - here - cost * 0.4;
                if (imp > bestMoveScore) { bestMoveScore = imp; bestMove = new AiStep { Kind = "move", X = cx, Z = cz, Score = 4 + imp, Why = "position" }; }
            }
            if (bestMove != null && bestMoveScore > 1.5) acts.Add(bestMove);
            // (a hopeless long shot is no reason to stand still)
            var hasAttack = bestAttack > 8;
            if (!hasAttack && u.C.Ap > 0 && (bestMove == null || bestMoveScore <= 1.5 || x.Melee))
            {
                var ci = CloseIn(x, evals);
                if (ci != null) acts.Add(ci);
            }

            // ---- choose -------------------------------------------------------------------------------------------------
            acts.Sort((a, b) => b.Score.CompareTo(a.Score));
            LastOptions.Clear(); LastOptions.AddRange(acts.Take(10));
            var best = acts[0];
            if (p.Noise > 0 && acts.Count > 1 && best.Score < 100)
            {
                var h = Hash.Hash2(Stable(u.C.Id) ^ (int)_b.Rng.State, _b.Round * 64 + u.C.Ap, 7);
                var second = acts[1];
                if (h < p.Noise && second.Kind != "wait" && second.Score >= best.Score * 0.6) best = second;
            }

            // ---- the hard rules (D5) ------------------------------------------------------------------------------------
            // never waste a turn: nothing worth doing still holds a shot ready
            if (best.Kind == "wait" && u.C.Ap > 0 && !p.Instinct && _b.CanHold(u) && !x.Melee)
            {
                var hold = acts.FirstOrDefault(a => a.Kind == "overwatch" || a.Kind == "cover");
                if (hold != null) best = hold;
            }
            // a walk into the open when cover is in reach only for an attack worth it from there
            if (best.Kind == "move" && !Exempt(x) && pressure < 0.5 && Exposed(x, best.X, best.Z))
            {
                var safe = evals.Where(e => !e.Exposed).OrderByDescending(e => e.Score - e.Cost * 0.4).FirstOrDefault();
                if (safe.Cost <= 0) safe = SafeAnywhere(x);
                if (safe.Cost > 0)
                {
                    var cost = _b.MoveCost(u, best.X, best.Z);
                    var after = u.C.Ap - cost;
                    var shotAfter = after >= x.AtkAp && x.Foes.Any(f => OurChance(x, f, best.X, best.Z) >= 0.3);
                    var there = evals.FirstOrDefault(e => Math.Abs(e.X - best.X) < 1e-6 && Math.Abs(e.Z - best.Z) < 1e-6);
                    var margin = (there.Cost > 0 ? there.Score - there.Cost * 0.4 : double.NegativeInfinity) - (safe.Score - safe.Cost * 0.4);
                    if (!shotAfter || margin < 8) best = new AiStep { Kind = "move", X = safe.X, Z = safe.Z, Score = best.Score, Why = "to cover" };
                }
            }
            // never end a turn in the open when cover is in reach (unless charging, fleeing, or an animal)
            if (EndsTurn(best) && exposedHere && !Exempt(x))
            {
                var safe = evals.Where(e => !e.Exposed && e.Cost <= u.C.Ap).OrderByDescending(e => e.Score - e.Cost * 0.4).FirstOrDefault();
                if (safe.Cost <= 0) safe = SafeAnywhere(x);
                if (safe.Cost > 0) best = new AiStep { Kind = "move", X = safe.X, Z = safe.Z, Score = best.Score, Why = "to cover" };
            }
            // a crouch behind low cover to end the turn (the free minor action)
            if ((best.Kind == "wait" || best.Kind == "overwatch" || best.Kind == "cover") && !p.Instinct && u.C.Stance == Stances.Stand && !u.C.MinorUsed && HalfCoverHere(x))
                best = new AiStep { Kind = "stance", Stance = Stances.Crouch, Score = 3, Why = "behind low cover" };
            // up off the ground to walk, if it saves AP
            if (best.Kind == "move" && u.C.Stance != Stances.Stand && !u.Fleeing)
            {
                var crouched = _b.MoveCost(u, best.X, best.Z);
                var stand = Stances.ChangeAp(u.C.Stance, Stances.Stand, !u.C.MinorUsed);
                var cost = (int)Math.Ceiling(_b.PathCached(u, best.X, best.Z) / Battle.MetresPerAp - 1e-6) + stand;
                if (cost < crouched && u.C.Ap >= stand) best = new AiStep { Kind = "stance", Stance = Stances.Stand, Score = best.Score, Why = "to walk" };
            }
            if (best.Kind == "shout") u.C.Used.Add("shout");
            return best;
        }

        // ---- the decision's context --------------------------------------------------------------------------------

        private Ctx Build(BattleUnit u, AiProfile p, List<BattleUnit> foes)
        {
            var x = new Ctx { U = u, P = p, Foes = new List<Foe>(), Allies = _b.AlliesOf(u).ToList() };
            var (w, _) = CombatRules.WeaponOf(u.C);
            x.W = w; x.Melee = CombatRules.IsMelee(w); x.AtkAp = CombatRules.AttackAp(u.C);
            var md = Sheet.Derived(u.C.Sheet);
            x.HpFrac = u.C.Sheet.Hp / (double)Math.Max(1, md.MaxHp);
            x.Wounded = 1.6 - 0.6 * x.HpFrac;
            x.MySight = md.SightRange;
            x.Watchers = _b.Units.Where(o => o.InFight && o.Hostile != u.Hostile && o.Watch != null).ToList();
            foreach (var a in x.Allies) x.AllyHp[a] = a.C.Sheet.Hp / (double)Math.Max(1, Sheet.Derived(a.C.Sheet).MaxHp);
            foreach (var fu in foes)
            {
                var f = new Foe { U = fu };
                f.W = CombatRules.WeaponOf(fu.C).def;
                f.Melee = CombatRules.IsMelee(f.W); f.Shotgun = f.W.Kind == "shotgun";
                f.Dist = Battle.Distance(u, fu);
                f.SeenNow = !x.Melee ? _b.Sees(u, fu) : f.Dist <= CombatRules.MeleeReach(x.W);
                var fd = Sheet.Derived(fu.C.Sheet);
                f.HpFrac = fu.C.Sheet.Hp / (double)Math.Max(1, fd.MaxHp);
                f.ReachNext = CombatRules.MaxAp(fu.C) * Battle.MetresPerAp / Stances.MoveMul(fu.C.Stance);
                f.MoveShoot = Math.Max(0, CombatRules.MaxAp(fu.C) - CombatRules.AttackAp(fu.C)) * Battle.MetresPerAp;
                f.Sight = fd.SightRange; f.Range = f.W.Range;
                var (lo, hi, _) = CombatRules.DamageRange(fu.C, u.C, new AttackOpts { DmgMul = fu.Hostile ? _b.EnemyDmgMul : 1 });
                f.Avg = (lo + hi) / 2.0;
                f.Rounds = f.W.Burst != null ? Math.Max(1, f.W.Burst.Rounds * 0.45) : 1;
                f.Shots = Math.Max(1, CombatRules.MaxAp(fu.C) / Math.Max(1, CombatRules.AttackAp(fu.C)));
                f.Flat = CombatRules.Breakdown(fu.C, u.C, new AttackOpts { Distance = 1, HitMod = fu.Hostile ? _b.EnemyHitMod : 0 }).Raw - (f.Shotgun ? 10 : 0);
                if (!CombatRules.CanAttack(fu.C).Ok && !(f.W.Magazine != null && HasAmmo(fu.C, f.W))) { f.Avg *= 0.2; }
                var mine = CombatRules.Breakdown(u.C, fu.C, new AttackOpts { Distance = 1, HitMod = u.Hostile ? _b.EnemyHitMod : 0 });
                f.MyFlat = mine.Raw - (x.W.Kind == "shotgun" ? 10 : 0);
                f.MyCrit = mine.Crit;
                var (mlo, mhi, mcrit) = CombatRules.DamageRange(u.C, fu.C, new AttackOpts { DmgMul = u.Hostile ? _b.EnemyDmgMul : 1 });
                f.MyMin = mlo; f.MyMax = mhi; f.MyAvg = (mlo + mhi) / 2.0;
                f.MyRounds = 1;
                f.HasCover = _b.Geometry != null ? _b.CoverCached(fu.PX, fu.PZ).Count > 0 : _b.Field.Cover(u, fu) != "none";
                x.Foes.Add(f);
                if (Battle.Throwables(fu.C).Count > 0) x.FoesThrow = true;
            }
            foreach (var f in x.Foes) f.Value = 1;
            return x;
        }

        private static IEnumerable<ShotOptions> ShotChoices(Ctx x, Foe f)
        {
            yield return new ShotOptions();
            if (x.W.Burst != null) yield return new ShotOptions { Burst = true };
            if (!x.Melee && x.P.Id != Archetypes.Animal)
            {
                if (f.U.Fleeing || (f.Melee && f.Dist < 10) || x.P.ArrestFirst) yield return new ShotOptions { Aimed = "legL" };
                if (!x.P.ArrestFirst) yield return new ShotOptions { Aimed = "head" };
            }
        }

        // ---- valuing ---------------------------------------------------------------------------------------------------

        /// <summary>How much downing (or hurting) this enemy is worth (D4: the wounded, the dangerous, the player, the one
        /// the side is already on; the story difficulty's mercy).</summary>
        private double Value(Ctx x, Foe f, double killChance)
        {
            var p = x.P;
            var v = 1 + 0.7 * p.Focus * (1 - f.HpFrac);
            if (f.U.C.IsPlayer) v *= 1.1;
            v *= 0.85 + 0.3 * Math.Min(1.5, f.Avg * f.Shots * f.Rounds / 15);
            if (p.Coordinate && x.Allies.Any(a => a.Intent == f.U)) v *= 1.25;
            if (p.Mercy > 0 && killChance > 0.4 && !f.U.Hostile && x.Foes.Count > 1) v *= 1 - p.Mercy * 0.6;
            if (f.U.Fleeing) v *= p.Id == Archetypes.Raider ? 1.1 : 0.6;
            return v;
        }

        /// <summary>Our odds against an enemy from (px, pz) by the cheap model: the flat chance less range, cover (by its
        /// arcs, stance, height), smoke.</summary>
        private double OurChance(Ctx x, Foe f, double px, double pz)
        {
            var d = Tactics.Dist(px, pz, f.U.PX, f.U.PZ);
            if (x.Melee) return d <= CombatRules.MeleeReach(x.W) ? Clamp(f.MyFlat) : 0;
            if (!_b.SeesFrom(px, pz, f.U)) return 0;
            var c = f.MyFlat - RangePen(d, x.MySight, x.W.Range) + (x.W.Kind == "shotgun" && d <= 3 ? 10 : 0);
            var cs = _b.CoverAt(x.U, px, pz, f.U, f.U.PX, f.U.PZ);
            c -= CoverPen(cs, f.U.C.Stance, d);
            if (cs.HighGround) c += Tactics.HighGroundAim;
            if (_b.Surfaces.Count > 0 && d > 1.5 && _b.Surfaces.InSmoke(f.U.PX, f.U.PZ)) c -= Tactics.SmokePenalty;
            return Clamp(c);
        }

        /// <summary>An enemy's odds against us standing at (px, pz).</summary>
        private double TheirChance(Ctx x, Foe f, double px, double pz, out bool exposed)
        {
            exposed = false;
            var d = Tactics.Dist(px, pz, f.U.PX, f.U.PZ);
            if (f.Melee)
            {
                // a blade comes for us if it can walk to us next turn
                if (d > f.ReachNext + CombatRules.MeleeReach(f.W)) return 0;
                exposed = true;
                return Clamp(f.Flat) * (d <= CombatRules.MeleeReach(f.W) ? 1 : 0.8);
            }
            if (!_b.SeesPoint(f.U, px, pz)) return 0;
            // (they may walk closer before they shoot: out of their range now is not out of it next turn)
            var dEff = Math.Max(1, d - f.MoveShoot);
            var c = f.Flat - RangePen(dEff, f.Sight, f.Range) + (f.Shotgun && dEff <= 3 ? 10 : 0);
            var cs = _b.CoverAt(f.U, f.U.PX, f.U.PZ, x.U, px, pz);
            var pen = CoverPen(cs, x.U.C.Stance, d);
            if (cs.HighGround) c += Tactics.HighGroundAim;
            exposed = pen <= 0;
            c -= pen;
            if (_b.Surfaces.Count > 0 && d > 1.5 && _b.Surfaces.InSmoke(px, pz)) c -= Tactics.SmokePenalty;
            return Clamp(c);
        }

        private static double RangePen(double d, double sight, double range) => Math.Max(0, d - sight) * 4 + Math.Max(0, d - range) * 8;

        private static double CoverPen(CoverState cs, string stance, double d)
        {
            var lvl = cs.Level;
            if (lvl == "half" && cs.HighGround) lvl = "none";
            var low = stance == Stances.Crouch || stance == Stances.Prone;
            if (lvl == "half" && low) lvl = "full";
            if (lvl == "full") return 40;
            if (lvl == "half") return 20;
            if (stance == Stances.Prone && d > 4) return 20;
            if (stance == Stances.Crouch && d > 3) return 10;
            return 0;
        }

        private static double Clamp(double c) => Math.Max(5, Math.Min(95, c)) / 100.0;

        /// <summary>The fire we would take standing at (px, pz) over the enemy's coming turn (each enemy's expected damage
        /// by their shots a turn), in the AI's currency.</summary>
        private double Threat(Ctx x, double px, double pz)
        {
            double t = 0;
            foreach (var f in x.Foes)
            {
                var c = TheirChance(x, f, px, pz, out var open);
                if (c <= 0) continue;
                // (a walk first leaves them one shot)
                var shots = Tactics.Dist(px, pz, f.U.PX, f.U.PZ) > Math.Min(f.Range, f.Sight + 4) ? 1 : f.Shots;
                t += c * f.Avg * shots * f.Rounds * 2 + (open && !f.Melee ? 2 : 0);
            }
            return t;
        }

        /// <summary>Some enemy who would see (px, pz), or reach it with a blade, has no cover against them there.</summary>
        private bool Exposed(Ctx x, double px, double pz)
        {
            foreach (var f in x.Foes)
            {
                if (f.Melee) continue;
                if (!_b.SeesPoint(f.U, px, pz)) continue;
                var cs = _b.CoverAt(f.U, f.U.PX, f.U.PZ, x.U, px, pz);
                if (cs.Level == "none" || (cs.Level == "half" && cs.HighGround)) return true;
            }
            return false;
        }

        private bool HalfCoverHere(Ctx x)
        {
            foreach (var f in x.Foes)
            {
                if (f.Melee || !_b.SeesPoint(f.U, x.U.PX, x.U.PZ)) continue;
                var cs = _b.CoverAt(f.U, f.U.PX, f.U.PZ, x.U, x.U.PX, x.U.PZ);
                if (cs.Level == "half" && !cs.HighGround) return true;
            }
            return false;
        }

        /// <summary>The cost of shooting now from the open when the AP left after will not reach the cover reachable now.</summary>
        private double LockIn(Ctx x, bool exposedHere, double threatHere, int apAfter)
        {
            if (!exposedHere || Exempt(x) || x.P.Caution <= 0) return 0;
            var reach = apAfter * Battle.MetresPerAp / Stances.MoveMul(x.U.C.Stance);
            if (_safeNear == null) _safeNear = NearestSafe(x);
            if (_safeNear.Value.Cost == int.MaxValue) return 0;
            if (_safeNear.Value.Cost <= apAfter) return 0;
            return Math.Max(0, threatHere - _safeNear.Value.Threat) * x.P.Caution * x.Wounded * 0.8;
        }

        private (int Cost, double Threat)? _safeNear;

        /// <summary>Every standing point the field offers within the AP (not just the decision's sample), for the best one
        /// that is safe: the last word of "never in the open with cover in reach".</summary>
        private (double X, double Z, int Cost, double Score, bool Exposed) SafeAnywhere(Ctx x)
        {
            var u = x.U;
            (double X, double Z, int Cost, double Score, bool Exposed) best = default;
            var bestS = double.NegativeInfinity;
            foreach (var (cx, cz) in _b.Field.Candidates(u, _b.Reach(u)))
            {
                if (_b.Units.Any(o => o != u && o.Alive && !o.Fled && Tactics.Dist(o.PX, o.PZ, cx, cz) < 0.8)) continue;
                var cost = _b.MoveCost(u, cx, cz);
                if (cost <= 0 || cost > u.C.Ap || Exposed(x, cx, cz)) continue;
                var sc = Eval(x, cx, cz, u.C.Ap - cost, cost, PathIfNeeded(x, cx, cz));
                if (double.IsNegativeInfinity(sc)) continue;
                if (sc - cost * 0.4 > bestS) { bestS = sc - cost * 0.4; best = (cx, cz, cost, sc, false); }
            }
            return best;
        }

        private (int Cost, double Threat) NearestSafe(Ctx x)
        {
            var best = (Cost: int.MaxValue, Threat: 0.0);
            foreach (var (cx, cz, cost) in Candidates(x))
            {
                if (cost >= best.Cost || Exposed(x, cx, cz)) continue;
                best = (cost, Threat(x, cx, cz));
            }
            return best;
        }

        /// <summary>What standing at (px, pz) with apLeft is worth: the attack we could make from there (this turn, or the
        /// next at a discount), less the fire we would take, with flanks, height, our own near, the wounded we guard, the
        /// held shots the walk draws, the bunching a blast would punish, and the push to close a fight gone quiet.
        /// Negative infinity for a walk into a hazard.</summary>
        private double Eval(Ctx x, double px, double pz, int apLeft, int cost, IReadOnlyList<(double X, double Z)> path)
        {
            var p = x.P; var u = x.U;
            double standing = 0;
            if (_b.Surfaces.Count > 0)
            {
                var end = _b.Surfaces.Peek(px, pz);
                if (cost > 0)
                {
                    if (end != null && end.Hazard) return double.NegativeInfinity;
                    if (path != null && _b.Surfaces.HazardOn(path) != null) return double.NegativeInfinity;
                }
                else if (end != null && end.Hazard) standing = -25;
            }
            if (cost > 0 && NearBlast(px, pz)) return double.NegativeInfinity;
            double offence = 0, flank = 0;
            var thisTurn = apLeft >= x.AtkAp && CombatRules.CanAttack(u.C).Ok;
            foreach (var f in x.Foes)
            {
                double c, e;
                if (x.Melee)
                {
                    var d = Tactics.Dist(px, pz, f.U.PX, f.U.PZ);
                    var reach = CombatRules.MeleeReach(x.W);
                    c = Clamp(f.MyFlat);
                    e = c * f.MyAvg;
                    var kill = f.MyMax >= f.U.C.Sheet.Hp ? c * Math.Min(1, (f.MyMax - f.U.C.Sheet.Hp + 1) / Math.Max(1, f.MyMax - f.MyMin + 1)) : 0;
                    var v = Value(x, f, kill) * (e * 2 + kill * 24);
                    double got;
                    if (d <= reach) got = thisTurn ? v : v * 0.5;
                    else
                    {
                        var next = CombatRules.MaxAp(u.C) * Battle.MetresPerAp;
                        got = v * 0.4 * Math.Max(0, 1 - (d - reach) / Math.Max(1, next));
                    }
                    offence = Math.Max(offence, got * p.Melee);
                    continue;
                }
                c = OurChance(x, f, px, pz);
                if (c <= 0) continue;
                e = c * f.MyAvg * f.MyRounds;
                var hp = f.U.C.Sheet.Hp;
                var k = f.MyMin >= hp ? c : f.MyMax < hp ? c * f.MyCrit / 100.0 * 0.5 : c * (f.MyMax - hp + 1) / Math.Max(1, f.MyMax - f.MyMin + 1);
                var val = Value(x, f, k) * (e * 2 + k * 24);
                offence = Math.Max(offence, thisTurn ? val : val * 0.35);
                if (f.HasCover)
                {
                    var cs = _b.CoverAt(u, px, pz, f.U, f.U.PX, f.U.PZ);
                    if (cs.Flanked || (cs.HighGround && cs.Level != "full")) flank = Math.Max(flank, 3 * p.Flank);
                }
            }
            var threat = Threat(x, px, pz);
            var score = offence * p.Aggression + flank - threat * p.Caution * x.Wounded + standing;
            // a gun wants to be within its range: closer is better until then (cover to cover)
            if (!x.Melee)
            {
                var nearest = double.PositiveInfinity;
                foreach (var f in x.Foes) nearest = Math.Min(nearest, Tactics.Dist(px, pz, f.U.PX, f.U.PZ));
                var eff = Math.Min(x.W.Range, x.MySight + 4);
                score -= Math.Max(0, nearest - eff) * 0.3 * Math.Max(0.4, p.Aggression);
            }
            // our own: not too far apart, not bunched for a blast; the wounded and the leader guarded
            if (x.Allies.Count > 0)
            {
                var near = x.Allies.Min(a => Tactics.Dist(a.PX, a.PZ, px, pz));
                if (near > 14) score -= (near - 14) * 0.3 * p.Cohesion;
                var bunched = x.Allies.Count(a => Tactics.Dist(a.PX, a.PZ, px, pz) < 2.2);
                score -= bunched * 2.5 * (x.FoesThrow ? 1.6 : 0.5) * Math.Max(0.3, p.ReadThreats);
                if (p.Protect > 0)
                {
                    double guard = 0;
                    foreach (var a in x.Allies)
                    {
                        var af = x.AllyHp[a];
                        if (!(a.Leader || a.C.IsPlayer || af < 0.5)) continue;
                        if (Tactics.Dist(a.PX, a.PZ, px, pz) <= 3.5) guard = Math.Max(guard, p.Protect * (af < 0.5 ? 3 : 2));
                    }
                    score += guard;
                }
            }
            // the held shots the walk would draw
            if (path != null && x.Watchers.Count > 0 && p.ReadThreats > 0)
                score -= ReactionRisk(x, path) * p.ReadThreats;
            // a fight gone quiet: push on towards the nearest
            if (_b.RoundsWithoutHarm >= 2 && cost > 0)
            {
                var nowD = x.Foes.Min(f => f.Dist);
                var thenD = x.Foes.Min(f => Tactics.Dist(px, pz, f.U.PX, f.U.PZ));
                score += (nowD - thenD) * 0.8 * Math.Min(4, _b.RoundsWithoutHarm - 1);
            }
            // where the surrendered wait to be taken
            if (p.Prisoners > 0)
                foreach (var s in _b.Units)
                    if (s.Surrendered && !s.Prisoner && !s.Escaped && s.Alive && s.Hostile != u.Hostile && Tactics.Dist(s.PX, s.PZ, px, pz) <= 1.9) { score += 5 * p.Prisoners; break; }
            return score;
        }

        /// <summary>The expected damage of the held shots a walk would draw (in the AI's currency).</summary>
        private double ReactionRisk(Ctx x, IReadOnlyList<(double X, double Z)> path)
        {
            double risk = 0;
            var fired = new HashSet<BattleUnit>();
            SurfaceGrid.ForEachStep(path, 1.0, (px, pz, step) =>
            {
                if (step <= 0) return true;
                foreach (var w in x.Watchers)
                {
                    if (fired.Contains(w) || !_b.Triggers(w, x.U, px, pz, Tactics.Dist(x.U.PX, x.U.PZ, px, pz))) continue;
                    fired.Add(w);
                    var f = x.Foes.FirstOrDefault(o => o.U == w);
                    if (f == null) continue;
                    var d = Tactics.Dist(px, pz, w.PX, w.PZ);
                    var steady = w.Watch.Mode == Watch.Ambush || w.Watch.Mode == Watch.Suppress || Sheet.HasFlag(w.C.Sheet, "overwatch");
                    var c = Clamp(f.Flat - RangePen(d, f.Sight, f.Range) - (steady ? 0 : Tactics.ReactionPenalty));
                    risk += c * f.Avg * f.Rounds * 2;
                }
                return true;
            });
            return risk;
        }

        /// <summary>Within the blast of a prop that is about to go (burning under it or next to it, or nearly broken).</summary>
        private bool NearBlast(double px, double pz)
        {
            foreach (var pr in _b.Props)
            {
                if (pr.Destroyed || Tactics.Dist(pr.X, pr.Z, px, pz) > pr.Radius) continue;
                if (pr.Hp <= 5) return true;
                if (_b.Surfaces.Count == 0) continue;
                for (var i = -1; i <= 1; i++) for (var j = -1; j <= 1; j++) if ((_b.Surfaces.Peek(pr.X + i, pr.Z + j)?.Fire ?? 0) > 0) return true;
            }
            return false;
        }

        // ---- candidates ----------------------------------------------------------------------------------------------

        private List<(double X, double Z, int Cost)> _cands;
        private BattleUnit _candsFor; private double _candsX, _candsZ; private int _candsAp, _candsRound;

        /// <summary>The standing points to weigh this decision (D6: at most <see cref="MaxPositions"/>, those with cover first,
        /// the rest spread), reachable with the AP, free of others, plus a few made for the purpose (beside the surrendered).</summary>
        private List<(double X, double Z, int Cost)> Candidates(Ctx x)
        {
            var u = x.U;
            if (_cands != null && _candsFor == u && _candsX == u.PX && _candsZ == u.PZ && _candsAp == u.C.Ap && _candsRound == _b.Round) return _cands;
            _safeNear = null;
            var all = new List<(double X, double Z, int Cost, bool Cover)>();
            var foeC = Centroid(x.Foes.Where(f => !f.Melee).Select(f => f.U).DefaultIfEmpty(x.Foes[0].U));
            var seen = new HashSet<long>();
            foreach (var (cx, cz) in _b.Field.Candidates(u, _b.Reach(u)))
            {
                var key = ((long)Math.Round(cx * 4) << 32) ^ (uint)(int)Math.Round(cz * 4);
                if (!seen.Add(key)) continue;
                if (Tactics.Dist(cx, cz, u.PX, u.PZ) < 0.5) continue;
                if (_b.Units.Any(o => o != u && o.Alive && !o.Fled && Tactics.Dist(o.PX, o.PZ, cx, cz) < 0.8)) continue;
                var cost = _b.MoveCost(u, cx, cz);
                if (cost > u.C.Ap || cost <= 0) continue;
                var cov = false;
                if (_b.Geometry != null)
                {
                    // cover that faces the enemy (their centre) first
                    var pieces = _b.CoverCached(cx, cz);
                    cov = pieces.Count > 0 && Tactics.FromPieces(pieces, foeC.X - cx, foeC.Z - cz, 0).Level != "none";
                }
                all.Add((cx, cz, cost, cov));
            }
            foreach (var s in _b.Units.Where(s => s.Surrendered && !s.Prisoner && !s.Escaped && s.Alive && s.Hostile != u.Hostile))
            {
                var d = Battle.Distance(u, s);
                if (d < 1.9 || x.P.Prisoners <= 0) continue;
                var k = (d - 1.2) / d;
                var px = u.PX + (s.PX - u.PX) * k; var pz = u.PZ + (s.PZ - u.PZ) * k;
                var cost = _b.MoveCost(u, px, pz);
                if (cost <= u.C.Ap && cost > 0) all.Add((px, pz, cost, false));
            }
            List<(double, double, int)> pick;
            if (all.Count <= MaxPositions) pick = all.Select(a => (a.X, a.Z, a.Cost)).ToList();
            else
            {
                var covered = all.Where(a => a.Cover).ToList();
                var open = all.Where(a => !a.Cover).ToList();
                pick = new List<(double, double, int)>();
                var nc = Math.Min(covered.Count, MaxPositions * 2 / 3);
                for (var i = 0; i < nc; i++) { var a = covered[(int)((long)i * covered.Count / nc)]; pick.Add((a.X, a.Z, a.Cost)); }
                var no = Math.Min(open.Count, MaxPositions - nc);
                for (var i = 0; i < no; i++) { var a = open[(int)((long)i * open.Count / no)]; pick.Add((a.X, a.Z, a.Cost)); }
            }
            _cands = pick; _candsFor = u; _candsX = u.PX; _candsZ = u.PZ; _candsAp = u.C.Ap; _candsRound = _b.Round;
            return pick;
        }

        private IReadOnlyList<(double X, double Z)> PathIfNeeded(Ctx x, double px, double pz)
        {
            if ((_b.Surfaces.Count > 0 || x.Watchers.Count > 0) && _b.Geometry != null) return _b.PathFor(x.U, px, pz);
            if (_b.Surfaces.Count > 0 || x.Watchers.Count > 0) return new[] { (x.U.PX, x.U.PZ), (px, pz) };
            return null;
        }

        /// <summary>No shot and nowhere better: walk towards the nearest enemy (through cover where it can), so a fight
        /// never stands still with everyone waiting for a line that never comes.</summary>
        private AiStep CloseIn(Ctx x, List<(double X, double Z, int Cost, double Score, bool Exposed)> evals)
        {
            var u = x.U;
            var target = x.Foes.OrderBy(f => f.Dist).First();
            var stop = x.Melee ? 1.1 : 4;
            // out of sight (round a wall, through a door): closeness is the walk, not the line
            var seen = target.SeenNow || (!x.Melee && _b.Sees(u, target.U));
            if (seen && target.Dist <= stop + 0.3) return null;
            double Walk(double px, double pz) { var d = _b.PathCached(target.U, px, pz); return double.IsInfinity(d) ? Tactics.Dist(px, pz, target.U.PX, target.U.PZ) : d; }
            var now = seen ? target.Dist : Walk(u.PX, u.PZ);
            var bestS = double.NegativeInfinity; (double X, double Z)? best = null;
            // from a safe spot only to another (cover to cover), unless a blade, or the fight has gone quiet
            var safeOnly = !x.Melee && !Exposed(x, u.PX, u.PZ) && _b.RoundsWithoutHarm < 3;
            foreach (var e in evals)
            {
                var d = seen ? Tactics.Dist(e.X, e.Z, target.U.PX, target.U.PZ) : Walk(e.X, e.Z);
                var progress = now - d;
                if (progress < 1) continue;
                if (safeOnly && e.Exposed) continue;
                if (Tactics.Dist(e.X, e.Z, target.U.PX, target.U.PZ) < stop - 0.5) continue;
                var s = progress + (e.Exposed ? 0 : 3) + e.Score * 0.05;
                if (s > bestS) { bestS = s; best = (e.X, e.Z); }
            }
            if (best == null && safeOnly) return null;
            if (best == null)
            {
                // towards them as far as the AP goes, along the walk (the Unity side walks it along the NavMesh)
                var path = _b.PathFor(u, target.U.PX, target.U.PZ);
                double len = 0;
                for (var i = 1; i < path.Count; i++) len += Tactics.Dist(path[i - 1].X, path[i - 1].Z, path[i].X, path[i].Z);
                var go = Math.Min(_b.Reach(u), Math.Max(0, len - stop));
                if (go <= 0.5) return null;
                var (sx, sz) = Battle.Along(path, go);
                if (_b.Surfaces.Count > 0 && _b.Surfaces.HazardOn(_b.PathFor(u, sx, sz)) != null && !u.Fleeing) return null;
                best = (sx, sz);
            }
            return new AiStep { Kind = "move", X = best.Value.X, Z = best.Value.Z, Score = x.Melee ? 8 : 5, Why = "close in" };
        }

        // ---- throws and props ----------------------------------------------------------------------------------------

        private IEnumerable<AiStep> Throws(Ctx x)
        {
            var u = x.U;
            var items = Battle.Throwables(u.C);
            if (items.Count == 0) yield break;
            foreach (var id in items)
            {
                var w = Battle.Throwable(u.C, id);
                var kind = Battle.ThrowKind(w);
                if (u.C.Ap < w.Ap) continue;
                var range = Battle.ThrowRange(u.C, w);
                var R = Battle.ThrowRadius(u.C, w);
                var pts = new List<(double X, double Z)>();
                if (kind == "smoke")
                {
                    // smoke over our own who stand exposed (and over ourselves when hurt)
                    var exposed = x.Allies.Concat(new[] { u }).Where(a => Exposed(x, a.PX, a.PZ)).ToList();
                    if (exposed.Count == 0) continue;
                    var c = Centroid(exposed);
                    if (Tactics.Dist(u.PX, u.PZ, c.X, c.Z) > range) continue;
                    var wounded = exposed.Count(a => a.C.Sheet.Hp < Sheet.Derived(a.C.Sheet).MaxHp * 0.5);
                    var sc = (exposed.Count * 3 + wounded * 5) * x.P.Throw * (x.P.ArrestFirst ? 1.3 : 1) - 8;
                    if (sc > 0) yield return new AiStep { Kind = "throw", Item = id, X = c.X, Z = c.Z, Score = sc, Why = "smoke" };
                    continue;
                }
                foreach (var f in x.Foes) pts.Add((f.U.PX, f.U.PZ));
                for (var i = 0; i < x.Foes.Count; i++)
                    for (var j = i + 1; j < x.Foes.Count; j++)
                        if (Battle.Distance(x.Foes[i].U, x.Foes[j].U) <= R * 2)
                            pts.Add(((x.Foes[i].U.PX + x.Foes[j].U.PX) / 2, (x.Foes[i].U.PZ + x.Foes[j].U.PZ) / 2));
                AiStep best = null;
                foreach (var (tx, tz) in pts.Take(MaxThrowPoints))
                {
                    var plan = _b.PlanThrow(u, id, tx, tz);
                    if (!plan.Ok) continue;
                    // D5: never onto its own (with a margin for the scatter)
                    var margin = R + plan.Scatter * 0.6 + 0.5;
                    if (_b.Units.Any(o => o.Alive && !o.Fled && o.Hostile == u.Hostile && Tactics.Dist(o.PX, o.PZ, tx, tz) <= margin)) continue;
                    double value = 0; var n = 0;
                    foreach (var (o, ally, exp) in plan.Caught)
                    {
                        if (ally) { value = double.NegativeInfinity; break; }
                        var f = x.Foes.FirstOrDefault(ff => ff.U == o);
                        if (f == null) continue;
                        n++;
                        var dmg = Math.Min(o.C.Sheet.Hp, exp);
                        var kill = exp >= o.C.Sheet.Hp ? 0.7 : 0;
                        var statusV = kind == "fire" ? 5 : kind == "flash" ? (f.Melee ? 3 : 8) : kind == "chem" ? 4 : kind == "shock" ? 4 : 0;
                        var hard = snapHard(x, f) ? 4 : 0;
                        value += Value(x, f, kill) * (dmg * 2 + kill * 24 + statusV + hard);
                    }
                    if (double.IsNegativeInfinity(value) || n == 0) continue;
                    var miss = Math.Min(0.6, plan.Scatter / Math.Max(0.5, R) * 0.5);
                    var sc = value * (1 - miss) * x.P.Throw - 9 + (n >= 2 ? 6 : 0);
                    if (best == null || sc > best.Score) best = new AiStep { Kind = "throw", Item = id, X = tx, Z = tz, Score = sc, Why = kind };
                }
                if (best != null && best.Score > 0) yield return best;
            }
        }

        private bool snapHard(Ctx x, Foe f) => !x.Melee && OurChance(x, f, x.U.PX, x.U.PZ) < 0.35;

        private IEnumerable<AiStep> PropShots(Ctx x)
        {
            var u = x.U;
            if (_b.Props.Count == 0 || !CombatRules.CanAttack(u.C).Ok || u.C.Ap < x.AtkAp || x.Melee || x.W.Kind == "thrown") yield break;
            foreach (var pr in _b.Props)
            {
                if (pr.Destroyed) continue;
                if (_b.Units.Any(o => o.Alive && !o.Fled && o.Hostile == u.Hostile && Tactics.Dist(o.PX, o.PZ, pr.X, pr.Z) <= pr.Radius + 0.5)) continue;
                if (_b.Geometry != null && !_b.SightCached(u.PX, u.PZ, pr.X, pr.Z)) continue;
                double value = 0;
                var avg = (pr.Dmg[0] + pr.Dmg[1]) / 2.0;
                foreach (var f in x.Foes)
                {
                    var d = Tactics.Dist(f.U.PX, f.U.PZ, pr.X, pr.Z);
                    if (d > pr.Radius) continue;
                    var dmg = Math.Min(f.U.C.Sheet.Hp, avg * (d <= pr.Radius / 2 ? 1 : 0.5));
                    value += Value(x, f, dmg >= f.U.C.Sheet.Hp ? 0.6 : 0) * (dmg * 2 + (dmg >= f.U.C.Sheet.Hp ? 14 : 0));
                }
                if (value <= 0) continue;
                var p = _b.PropChance(u, pr) / 100.0;
                var destroy = x.W.Dmg[1] >= pr.Hp ? Math.Min(1, (x.W.Dmg[1] - pr.Hp + 1) / (double)Math.Max(1, x.W.Dmg[1] - x.W.Dmg[0] + 1)) : 0.1;
                var sc = 4 + p * destroy * value - x.AtkAp * 0.6;
                if (sc > 6) yield return new AiStep { Kind = "shoot_prop", Prop = pr, X = pr.X, Z = pr.Z, Score = sc };
            }
        }

        // ---- flight, prisoners -----------------------------------------------------------------------------------------

        private (double X, double Z) FleePoint(Ctx x)
        {
            var u = x.U;
            var exits = _b.Geometry?.Exits(u);
            if (exits != null && exits.Count > 0)
            {
                // the exit with the shortest walk that does not run at an enemy
                (double X, double Z) best = exits[0]; var bestS = double.PositiveInfinity;
                foreach (var e in exits)
                {
                    var len = _b.PathCached(u, e.X, e.Z);
                    if (double.IsInfinity(len)) continue;
                    var nearFoe = x.Foes.Min(f => Tactics.Dist(f.U.PX, f.U.PZ, e.X, e.Z));
                    var s = len + Math.Max(0, 8 - nearFoe) * 3;
                    if (s < bestS) { bestS = s; best = e; }
                }
                return best;
            }
            (double X, double Z)? bestT = null; var bestD = double.NegativeInfinity;
            foreach (var t in _b.Field.Candidates(u, _b.Reach(u)))
            {
                if (_b.Surfaces.Count > 0 && (_b.Surfaces.Peek(t.X, t.Z)?.Hazard ?? false)) continue;
                var minD = x.Foes.Min(f => Tactics.Dist(t.X, t.Z, f.U.PX, f.U.PZ));
                var hidden = x.Foes.All(f => !_b.SeesFrom(t.X, t.Z, f.U)) ? 6 : 0;
                if (minD + hidden > bestD) { bestD = minD + hidden; bestT = t; }
            }
            return bestT ?? (u.PX, u.PZ);
        }

        private AiStep Capture(BattleUnit u, AiProfile p)
        {
            if (p.Prisoners <= 0 || u.C.Ap < 2) return null;
            var s = _b.Units.Where(o => o.Surrendered && !o.Prisoner && !o.Escaped && o.Alive && o.Hostile != u.Hostile).OrderBy(o => Battle.Distance(u, o)).FirstOrDefault();
            if (s == null) return null;
            if (Battle.Distance(u, s) <= 2.0) return new AiStep { Kind = "capture", Target = s, Score = 12 * p.Prisoners };
            if (!_b.EnemiesOf(u).Any(f => !f.Surrendered))
            {
                var d = Battle.Distance(u, s); var k = (d - 1.2) / d;
                double mx = u.PX + (s.PX - u.PX) * k, mz = u.PZ + (s.PZ - u.PZ) * k;
                if (_b.Surfaces.Count > 0 && (_b.Surfaces.HazardOn(_b.PathFor(u, mx, mz)) != null || (_b.Surfaces.Peek(mx, mz)?.Hazard ?? false))) return null;
                return new AiStep { Kind = "move", X = mx, Z = mz, Score = 6 * p.Prisoners, Why = "to take prisoner" };
            }
            return null;
        }

        // ---- the hard rules' helpers ----------------------------------------------------------------------------------

        private static bool EndsTurn(AiStep a) => a.Kind == "wait" || a.Kind == "overwatch" || a.Kind == "cover" || a.Kind == "suppress" || a.Kind == "stance";

        /// <summary>Who may end a turn in the open: the charging (a blade with an enemy within next turn's reach), the
        /// fleeing, animals.</summary>
        private bool Exempt(Ctx x)
        {
            if (x.P.Instinct || x.U.Fleeing) return true;
            if (x.Melee)
            {
                var next = CombatRules.MaxAp(x.U.C) * Battle.MetresPerAp + CombatRules.MeleeReach(x.W);
                if (x.Foes.Any(f => f.Dist <= next + 1)) return true;
            }
            return false;
        }

        private static bool HasAmmo(Combatant c, WeaponDef w) => w.Ammo != null && c.Inv.Items.Any(i => i.Qty > 0 && Items.Has(i.Def) && Items.Def(i.Def).Ammo?.Type == w.Ammo);

        private static (double X, double Z) Centroid(IEnumerable<BattleUnit> us)
        {
            double sx = 0, sz = 0; var n = 0;
            foreach (var o in us) { sx += o.PX; sz += o.PZ; n++; }
            return n == 0 ? (0, 0) : (sx / n, sz / n);
        }

        private static int Stable(string s)
        {
            unchecked { var h = 17; foreach (var ch in s ?? "") h = h * 31 + ch; return h; }
        }

        /// <summary>The AI's own check of the hard rules for a unit standing where it is (the harness asks it at each turn's
        /// end): whether it stands exposed while a safe point is within the AP it has left.</summary>
        public bool EndsExposedWithCoverInReach(BattleUnit u)
        {
            var foes = _b.EnemiesOf(u).Where(f => !f.Surrendered).ToList();
            if (foes.Count == 0 || u.C.Ap <= 0 || !u.InFight) return false;
            var x = Build(u, _b.ProfileOf(u), foes);
            if (Exempt(x) || !Exposed(x, u.PX, u.PZ)) return false;
            _cands = null;
            foreach (var (cx, cz, cost) in Candidates(x))
                if (cost <= u.C.Ap && !Exposed(x, cx, cz) && !double.IsNegativeInfinity(Eval(x, cx, cz, u.C.Ap - cost, cost, PathIfNeeded(x, cx, cz)))) return true;
            return false;
        }
    }
}
