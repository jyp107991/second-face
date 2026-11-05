using System;
using System.Collections.Generic;
using System.Linq;
using SecondFace.Core.Stats;
using Inv = SecondFace.Core.Inventory.Inv;

namespace SecondFace.Core.Combat
{
    /// <summary>What the world tells a battle (the Unity side: the NavMesh and raycasts to the hit zones).</summary>
    public interface IBattleField
    {
        /// <summary>Metres along the ground from the unit to a point (infinity when it cannot get there).</summary>
        double PathLength(BattleUnit u, double x, double z);
        /// <summary>Whether a can see b (eye to the torso).</summary>
        bool LineOfSight(BattleUnit a, BattleUnit b);
        /// <summary>Whether someone standing at (x, z) would see b.</summary>
        bool LineOfSightFrom(double x, double z, BattleUnit b);
        /// <summary>The cover the defender has against the attacker: none, half or full.</summary>
        string Cover(BattleUnit att, BattleUnit def);
        /// <summary>The light and the place where the defender stands.</summary>
        CombatContext Context(BattleUnit def);
        /// <summary>A few points the unit could stand at this turn, for the AI to weigh (within its reach).</summary>
        IEnumerable<(double X, double Z)> Candidates(BattleUnit u, double reachMetres);
    }

    /// <summary>One of a battle's sides' people: their combatant (sheet, pack, AP, morale) and where they stand (metres).</summary>
    public sealed class BattleUnit
    {
        public Combatant C;
        public bool Hostile;
        public bool Fled, Surrendered, Leader;
        public double PX, PZ;
        public bool Alive => C.Sheet.Hp > 0;
        public void Place(double x, double z) { PX = x; PZ = z; C.X = (int)Math.Round(x); C.Y = (int)Math.Round(z); }
    }

    /// <summary>What an AI chose to do next (one step; the Unity side animates it, then asks again).</summary>
    public sealed class AiStep
    {
        public string Kind;          // attack, burst, move, reload, heal, flee, surrender, wait
        public BattleUnit Target;
        public double X, Z;
        public double Score;
        public string Why;
    }

    /// <summary>
    /// Turn-based combat in the open world (P6.4; DESIGN_UNITY §5.2): initiative order, AP each turn from the sheet
    /// (<see cref="CombatRules.MaxAp"/>), movement costing AP by distance over the ground (<see cref="MetresPerAp"/>,
    /// not tiles), attacks by the rules (<see cref="CombatRules"/>: hit chance with cover and light, criticals, called
    /// shots, bursts, splash), reload, swap and items, unspent AP banked as evasion, morale (breaking, fleeing,
    /// surrendering), kill XP. The web game's encounter (combat/encounter.ts) and utility AI (combat/ai.ts) in pure C#,
    /// stepwise: the Unity side asks for the next AI step, plays it, asks again.
    /// </summary>
    public sealed class Battle
    {
        public const double MetresPerAp = 1.5;
        public const string HealItem = "c_knitkit";

        public readonly List<BattleUnit> Units = new();
        public List<BattleUnit> Order = new();
        public int Round;
        public BattleUnit Current;
        public bool Active;
        public bool Pit;
        public int XpEarned;
        public string Outcome;
        public readonly List<string> Log = new();
        public readonly IBattleField Field;
        public readonly Rng Rng;
        /// <summary>Difficulty for the hostile side (hit chance change, damage multiplier).</summary>
        public double EnemyHitMod, EnemyDmgMul = 1;
        private int _idx;

        public Battle(IBattleField field, Rng rng) { Field = field; Rng = rng; }

        public BattleUnit Player => Units.FirstOrDefault(u => u.C.IsPlayer);
        public IEnumerable<BattleUnit> EnemiesOf(BattleUnit u) => Units.Where(o => o.Alive && !o.Fled && (u.Hostile ? !o.Hostile : o.Hostile));

        public void Start(IEnumerable<BattleUnit> units, bool pit = false)
        {
            Units.Clear(); Units.AddRange(units);
            Pit = pit; Active = true; Round = 1; XpEarned = 0; Outcome = null; _idx = 0;
            Order = CombatRules.TurnOrder(Rng, Units.Select(u => u.C)).Select(c => Units.First(u => u.C == c)).ToList();
            Say("Combat!");
        }

        private void Say(string s) => Log.Add(s);

        /// <summary>The next unit whose turn it is (its AP refilled), or null when the battle is over. A stunned unit loses
        /// its turn (said in the log).</summary>
        public BattleUnit NextTurn()
        {
            if (!Active) return null;
            if (CheckEnd()) return null;
            for (var guard = 0; guard < Order.Count * 2 + 2; guard++)
            {
                var u = Order[_idx % Order.Count];
                _idx++;
                if (_idx % Order.Count == 0) Round++;
                if (!u.Alive || u.Fled) continue;
                u.C.Ap = CombatRules.MaxAp(u.C);
                u.C.Evasion = 0;
                if (u.C.Stunned) { u.C.Stunned = false; Say($"{u.C.Name} is stunned and loses the turn."); continue; }
                Current = u;
                return u;
            }
            return null;
        }

        /// <summary>The current unit's turn ends: unspent AP becomes evasion until its next.</summary>
        public void EndTurn()
        {
            if (Current != null) Current.C.Evasion = Math.Min(10, Current.C.Ap * 2);
            CheckEnd();
        }

        public bool CheckEnd()
        {
            if (!Active) return true;
            var p = Player;
            if (p == null || !p.Alive) { Finish("defeat"); return true; }
            if (!Units.Any(u => u.Hostile && u.Alive && !u.Fled))
            {
                Finish(Units.Any(u => u.Hostile && u.Fled && u.Alive && !u.Surrendered) ? "fled" : "victory");
                return true;
            }
            return false;
        }

        private void Finish(string outcome)
        {
            Active = false; Current = null; Outcome = outcome;
            var p = Player;
            if (p != null && outcome != "defeat" && XpEarned > 0)
            {
                var levels = Sheet.AddXp(p.C.Sheet, XpEarned);
                Say($"+{XpEarned} XP{(levels > 0 ? " - level up!" : "")}");
            }
        }

        /// <summary>The fight is over by talk, or everyone hostile out of sight.</summary>
        public void Truce() { if (Active) Finish("truce"); }

        // ---- moving ------------------------------------------------------------------------------------------------

        /// <summary>AP a walk to (x, z) costs (int.MaxValue when it cannot be reached).</summary>
        public int MoveCost(BattleUnit u, double x, double z)
        {
            var d = Field.PathLength(u, x, z);
            return double.IsInfinity(d) || double.IsNaN(d) ? int.MaxValue : d < 0.2 ? 0 : Math.Max(1, (int)Math.Ceiling(d / MetresPerAp - 1e-6));
        }

        /// <summary>How far the unit can walk with the AP it has (metres).</summary>
        public double Reach(BattleUnit u) => u.C.Ap * MetresPerAp;

        /// <summary>The unit walked to (x, z): its AP spent by the distance (the Unity side has moved the body).</summary>
        public void Moved(BattleUnit u, double x, double z, double metres)
        {
            var cost = Math.Max(1, (int)Math.Ceiling(metres / MetresPerAp - 1e-6));
            u.C.Ap = Math.Max(0, u.C.Ap - cost);
            u.Place(x, z);
        }

        // ---- attacking ---------------------------------------------------------------------------------------------

        public AttackOpts OptsFor(BattleUnit att, BattleUnit def, string aimed = null, bool burst = false)
        {
            var melee = CombatRules.IsMelee(CombatRules.WeaponOf(att.C).def);
            return new AttackOpts
            {
                Aimed = aimed, Burst = burst,
                HitMod = att.Hostile ? EnemyHitMod : 0, DmgMul = att.Hostile ? EnemyDmgMul : 1,
                Cover = melee ? "none" : Field.Cover(att, def), Ctx = Field.Context(def),
            };
        }

        public static double Distance(BattleUnit a, BattleUnit b) => Math.Sqrt((a.PX - b.PX) * (a.PX - b.PX) + (a.PZ - b.PZ) * (a.PZ - b.PZ));

        /// <summary>Whether att could attack def now, at what odds and cost (and why not).</summary>
        public (bool Ok, string Reason, int Chance, int Ap) Preview(BattleUnit att, BattleUnit def, string aimed = null, bool burst = false)
        {
            var w = CombatRules.WeaponOf(att.C).def;
            var ap = CombatRules.AttackAp(att.C, aimed != null, burst);
            var ca = CombatRules.CanAttack(att.C, burst);
            if (!ca.Ok) return (false, ca.Reason, 0, ap);
            var melee = CombatRules.IsMelee(w);
            if (Pit && !melee) return (false, "No guns in the pit", 0, ap);
            // (melee reach in metres: a tile's reach is an arm's length and a step, 1.6 m a tile)
            if (melee && Distance(att, def) > w.Range * 1.6 + 0.2) return (false, "Out of reach", 0, ap);
            if (!melee && !Field.LineOfSight(att, def)) return (false, "No line of sight", 0, ap);
            var chance = CombatRules.HitChance(att.C, def.C, OptsFor(att, def, aimed, burst));
            if (att.C.Ap < ap) return (false, $"Needs {ap} AP", chance, ap);
            return (true, null, chance, ap);
        }

        /// <summary>An attack resolved (AP spent, damage, splash, morale, kills). Null when it could not be made.</summary>
        public BattleHit Attack(BattleUnit att, BattleUnit def, string aimed = null, bool burst = false)
        {
            var pv = Preview(att, def, aimed, burst);
            if (!pv.Ok) { if (att.C.IsPlayer) Say(pv.Reason ?? "Cannot attack"); return null; }
            att.C.Ap -= pv.Ap;
            var w = CombatRules.WeaponOf(att.C).def;
            var res = CombatRules.ResolveAttack(Rng, att.C, def.C, OptsFor(att, def, aimed, burst));
            var hit = new BattleHit { Attacker = att, Defender = def, Result = res, Weapon = w };
            if (w.Area is double area && area > 0 && (w.DmgType == "explosive" || w.DmgType == "fire"))
            {
                var hitT = res.Hits.Any(h => h.Hit);
                double cx = def.PX + (hitT ? 0 : Rng.Range(-1.5, 1.5)), cz = def.PZ + (hitT ? 0 : Rng.Range(-1.5, 1.5));
                hit.BlastX = cx; hit.BlastZ = cz; hit.Blast = area;
                foreach (var o in Units)
                {
                    if (!o.Alive || (o == def && hitT)) continue;
                    var d = Math.Sqrt((o.PX - cx) * (o.PX - cx) + (o.PZ - cz) * (o.PZ - cz));
                    if (d > area * 1.5) continue;
                    var dr = Sheet.Derived(o.C.Sheet).Dr;
                    var dmg = Math.Max(1, (int)Math.Round(Rng.Int(w.Dmg[0], w.Dmg[1]) * (d < 0.8 ? 1 : 0.5) * (1 - dr / 100.0)));
                    o.C.Sheet.Hp = Math.Max(0, o.C.Sheet.Hp - dmg);
                    hit.Splash.Add((o, dmg));
                    Say($"{o.C.Name} is caught in the blast ({dmg}).");
                }
            }
            foreach (var m in res.Messages) Say(m);
            if (res.Damage > 0)
            {
                var frac = def.C.Sheet.Hp / (double)Sheet.Derived(def.C.Sheet).MaxHp;
                CombatRules.MoraleEvent(def.C, frac < 0.3 ? "badly_hurt" : "hurt", Sheet.HasFlag(att.C.Sheet, "terrifying"));
            }
            if (!def.Alive) Killed(def, att);
            foreach (var (o, _) in hit.Splash) if (!o.Alive && o != def) Killed(o, att);
            return hit;
        }

        private void Killed(BattleUnit dead, BattleUnit killer)
        {
            if (Pit) { Say($"{dead.C.Name} goes down."); return; }
            if (killer.C.IsPlayer || !killer.Hostile) XpEarned += CombatRules.KillXp(dead.C);
            CombatRules.MoraleEvent(killer.C, "scored_kill");
            foreach (var u in Units)
                if (u != dead && u.Alive && u.Hostile == dead.Hostile) CombatRules.MoraleEvent(u.C, dead.Leader ? "leader_down" : "ally_down");
            Say($"{dead.C.Name} is down.");
        }

        public bool Reload(BattleUnit u)
        {
            var ap = CombatRules.ReloadAp(u.C);
            if (u.C.Ap < ap) return false;
            if (Inv.Reload(u.C.Inv) == 0) { if (u.C.IsPlayer) Say("No ammo to load."); return false; }
            u.C.Ap -= ap;
            Say($"{u.C.Name} reloads.");
            return true;
        }

        public bool Swap(BattleUnit u)
        {
            var ap = CombatRules.SwapAp(u.C);
            if (u.C.Ap < ap) return false;
            u.C.Inv.Active = u.C.Inv.Active == "primary" ? "secondary" : "primary";
            u.C.Ap -= ap;
            return true;
        }

        public bool UseItem(BattleUnit u, string itemId, int now)
        {
            var idx = u.C.Inv.Items.FindIndex(i => i.Def == itemId);
            if (idx < 0) return false;
            var ap = CombatRules.ItemAp(u.C.Inv.Items[idx]);
            if (u.C.Ap < ap) { if (u.C.IsPlayer) Say($"Needs {ap} AP"); return false; }
            var r = Inv.UseConsumable(u.C.Inv, idx, u.C.Sheet, now, () => Rng.Next());
            if (!r.Ok) return false;
            u.C.Ap -= ap;
            Say($"{u.C.Name}: {r.Message}");
            return true;
        }

        // ---- the AI (combat/ai.ts: every step, score every candidate action and take the best) -------------------------

        private static double AvgDamage(BattleUnit u) { var w = CombatRules.WeaponOf(u.C).def; return (w.Dmg[0] + w.Dmg[1]) / 2.0; }

        private double PositionScore(BattleUnit u, double x, double z, List<BattleUnit> foes, int apLeft)
        {
            double ox = u.PX, oz = u.PZ;
            u.Place(x, z);
            var w = CombatRules.WeaponOf(u.C).def;
            var atkAp = CombatRules.AttackAp(u.C);
            var melee = CombatRules.IsMelee(w);
            double best = 0, defence = 0;
            foreach (var f in foes)
            {
                var dist = Distance(u, f);
                if (melee) best = Math.Max(best, dist <= w.Range * 1.6 + 0.2 && apLeft >= atkAp ? 60 : 40 - dist * 3);
                else if (Field.LineOfSightFrom(x, z, f))
                    best = Math.Max(best, CombatRules.HitChance(u.C, f.C, OptsFor(u, f)) * (apLeft >= atkAp ? 0.8 : 0.4));
                var cov = Field.Cover(f, u);
                defence += cov == "full" ? 18 : cov == "half" ? 9 : Field.LineOfSightFrom(f.PX, f.PZ, u) ? -4 : 6;
            }
            u.Place(ox, oz);
            return best + defence / Math.Max(1, foes.Count);
        }

        /// <summary>The AI's next step for a unit (pure: nothing changes until the step is carried out).</summary>
        public AiStep Choose(BattleUnit u)
        {
            var foes = EnemiesOf(u).ToList();
            if (foes.Count == 0) return new AiStep { Kind = "wait" };
            var s = u.C.Sheet;
            var hpFrac = s.Hp / (double)Sheet.Derived(s).MaxHp;
            var acts = new List<AiStep> { new() { Kind = "wait", Score = 1 } };
            if (u.C.Morale < 10 && hpFrac < 0.35) acts.Add(new AiStep { Kind = "surrender", Score = 120 });
            if (u.C.Morale < 20)
            {
                (double X, double Z)? bestT = null; var bestD = double.NegativeInfinity;
                foreach (var t in Field.Candidates(u, Reach(u)))
                {
                    var minD = foes.Min(f => Math.Sqrt((t.X - f.PX) * (t.X - f.PX) + (t.Z - f.PZ) * (t.Z - f.PZ)));
                    var hidden = foes.All(f => !Field.LineOfSightFrom(t.X, t.Z, f)) ? 6 : 0;
                    if (minD + hidden > bestD) { bestD = minD + hidden; bestT = t; }
                }
                acts.Add(new AiStep { Kind = "flee", X = bestT?.X ?? u.PX, Z = bestT?.Z ?? u.PZ, Score = 100 });
            }
            if (hpFrac < 0.4 && Inv.CountItem(u.C.Inv, HealItem) > 0 && u.C.Ap >= 2) acts.Add(new AiStep { Kind = "heal", Score = 55 + (1 - hpFrac) * 40 });
            var wd = CombatRules.WeaponOf(u.C).def;
            var it = u.C.Inv.EquippedAt(u.C.Inv.Active);
            if (wd.Magazine != null && it != null && (it.Loaded ?? 0) == 0 && u.C.Ap >= CombatRules.ReloadAp(u.C)
                && u.C.Inv.Items.Any(i => i.Def.StartsWith("a_") && i.Qty > 0))
                acts.Add(new AiStep { Kind = "reload", Score = 50 });
            if (CombatRules.CanAttack(u.C).Ok)
                foreach (var f in foes)
                {
                    var pv = Preview(u, f);
                    if (!pv.Ok) continue;
                    var exp = pv.Chance / 100.0 * AvgDamage(u);
                    var kill = f.C.Sheet.Hp <= AvgDamage(u) ? 25 : 0;
                    acts.Add(new AiStep { Kind = "attack", Target = f, Score = 20 + exp * 3 + kill + (f.C.IsPlayer ? 3 : 0) + (pv.Chance < 12 ? -25 : 0) });
                    if (wd.Burst != null)
                    {
                        var pb = Preview(u, f, null, true);
                        if (pb.Ok) acts.Add(new AiStep { Kind = "burst", Target = f, Score = 18 + pb.Chance / 100.0 * AvgDamage(u) * wd.Burst.Rounds * 0.7 + kill });
                    }
                }
            if (u.C.Ap > 0)
            {
                var here = PositionScore(u, u.PX, u.PZ, foes, u.C.Ap);
                AiStep best = null;
                foreach (var t in Field.Candidates(u, Reach(u)).Take(48))
                {
                    var cost = MoveCost(u, t.X, t.Z);
                    if (cost > u.C.Ap) continue;
                    var sc = PositionScore(u, t.X, t.Z, foes, u.C.Ap - cost) - cost * 1.5;
                    if (best == null || sc > best.Score) best = new AiStep { Kind = "move", X = t.X, Z = t.Z, Score = sc };
                }
                if (CombatRules.IsMelee(wd) && (best == null || best.Score - here < 5))
                {
                    // close in on the nearest, as far as the AP goes, stopping an arm's length short
                    var target = foes.OrderBy(f => Distance(u, f)).First();
                    var d = Distance(u, target);
                    var go = Math.Min(Reach(u), Math.Max(0, d - 1.1));
                    if (go > 0.3)
                    {
                        var k = go / d;
                        acts.Add(new AiStep { Kind = "move", X = u.PX + (target.PX - u.PX) * k, Z = u.PZ + (target.PZ - u.PZ) * k, Score = 30, Why = "close in" });
                    }
                }
                else if (best != null && best.Score - here > 4)
                {
                    best.Score = 10 + (best.Score - here);
                    best.Why = "position";
                    acts.Add(best);
                }
            }
            return acts.OrderByDescending(a => a.Score).First();
        }
    }

    /// <summary>An attack as it happened (for the Unity side to show: tracers, impacts, floating numbers, the blast).</summary>
    public sealed class BattleHit
    {
        public BattleUnit Attacker, Defender;
        public AttackResult Result;
        public SecondFace.Core.Inventory.WeaponDef Weapon;
        public double BlastX, BlastZ, Blast;
        public readonly List<(BattleUnit Unit, int Damage)> Splash = new();
    }
}
