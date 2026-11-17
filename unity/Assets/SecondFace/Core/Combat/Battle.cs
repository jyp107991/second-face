using System;
using System.Collections.Generic;
using System.Linq;
using SecondFace.Core.Stats;
using Inv = SecondFace.Core.Inventory.Inv;

namespace SecondFace.Core.Combat
{
    /// <summary>What the world tells a battle (the Unity side: the NavMesh and raycasts to the hit zones). A field may also
    /// answer <see cref="IBattleGeometry"/> (height, cover around a point, paths, exits) for the full rules.</summary>
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

    /// <summary>One of a battle's sides' people: their combatant (sheet, pack, AP, morale, stance, statuses) and where they
    /// stand (metres), with what they hold ready (<see cref="Watch"/>) and how they left the fight.</summary>
    public sealed class BattleUnit
    {
        public Combatant C;
        public bool Hostile;
        public bool Fled, Surrendered, Leader;
        public double PX, PZ;
        /// <summary>Overwatch, an ambush, cover fire or a suppression held until this unit's next turn (null: none).</summary>
        public Watch Watch;
        /// <summary>Running for an exit (their nerve broke); <see cref="Fled"/> once out.</summary>
        public bool Fleeing;
        /// <summary>Surrendered and secured by the other side.</summary>
        public bool Prisoner;
        /// <summary>Surrendered, left unguarded, and slipped away.</summary>
        public bool Escaped;
        /// <summary>Not yet seen (an ambush): the first shot comes from hiding.</summary>
        public bool Hidden;
        /// <summary>The archetype the AI plays this unit by (<see cref="Archetypes"/>; null: from the content).</summary>
        public string Archetype;
        /// <summary>Whom the AI means to attack (its intent, shown by the UI; shared for focus fire).</summary>
        public BattleUnit Intent;
        /// <summary>Overwatch turns in a row that drew nothing (the AI grows tired of waiting).</summary>
        public int IdleWatches;
        public bool Alive => C.Sheet.Hp > 0;
        /// <summary>Still fighting: alive and not gone (fled, surrendered).</summary>
        public bool InFight => Alive && !Fled;
        public void Place(double x, double z) { PX = x; PZ = z; C.X = (int)Math.Round(x); C.Y = (int)Math.Round(z); }
        public override string ToString() => C?.Id ?? "?";
    }

    /// <summary>A shot held ready (COMBAT.md C3, C7): overwatch (anyone who moves in sight within the cone), an ambush
    /// (the same, held from hiding and steady, the group springing together), cover fire (also answers an attack), a
    /// suppression (the pinned one moving), a guard (a blade for whoever steps within reach).</summary>
    public sealed class Watch
    {
        public const string Overwatch = "overwatch", Ambush = "ambush", Cover = "cover", Suppress = "suppress", Guard = "guard";
        public string Mode = Overwatch;
        /// <summary>The cone's direction (ignored when <see cref="HalfAngle"/> is 180: all round).</summary>
        public double DirX, DirZ;
        public double HalfAngle = 180;
        public int Shots = 1;
        /// <summary>The suppressed (suppression), or the one covered (cover fire; null: the whole side).</summary>
        public BattleUnit Target;
        public int Group;
        /// <summary>The unit held it over the last enemy turn and nothing came (for the AI's patience).</summary>
        public bool Fired;
    }

    /// <summary>What an AI chose to do next (one step; the Unity side animates it, then asks again).</summary>
    public sealed class AiStep
    {
        /// <summary>attack, burst, move, reload, heal, heal_ally, flee, surrender, wait, throw, shoot_prop, overwatch, cover,
        /// suppress, stance, capture, shout.</summary>
        public string Kind;
        public BattleUnit Target;
        public double X, Z;
        public double Score;
        public string Why;
        /// <summary>The aimed part for an attack (null: a snap shot).</summary>
        public string Aimed;
        /// <summary>The item thrown or used.</summary>
        public string Item;
        /// <summary>The stance taken.</summary>
        public string Stance;
        public BattleProp Prop;
        /// <summary>An overwatch's cone (degrees either side of (X, Z) as a direction; 180: all round).</summary>
        public double HalfAngle = 180;
        public override string ToString() => $"{Kind}{(Target != null ? " " + Target.C.Id : "")}{(Kind == "move" || Kind == "throw" || Kind == "flee" ? $" ({X:0.#},{Z:0.#})" : "")}{(Aimed != null ? " @" + Aimed : "")}{(Stance != null ? " " + Stance : "")} [{Score:0.#}{(Why != null ? " " + Why : "")}]";
    }

    /// <summary>A move as it went (COMBAT.md C3, C5): the reaction shots it drew and where, whether it was cut short (the
    /// mover fell), the hazards walked into, whether the mover got out of the fight.</summary>
    public sealed class MoveOutcome
    {
        public readonly List<BattleHit> Reactions = new();
        public bool Stopped;
        public double X, Z;
        public readonly List<string> Entered = new();
        public bool Escaped;
    }

    /// <summary>
    /// Turn-based combat in the open world (P6.4; DESIGN_UNITY §5.2; COMBAT.md C, D): initiative order, AP each turn from
    /// the sheet, movement costing AP by distance over the ground (<see cref="MetresPerAp"/>, by stance, oil twice),
    /// attacks by the rules (<see cref="CombatRules.Breakdown"/>: cover from the field's geometry with its arcs, flanking,
    /// height, stances, statuses, light, called shots, bursts), reaction fire (overwatch, ambushes, cover fire,
    /// suppression) and perk interrupts (riposte, follow-through), throwables with their areas and friendly fire,
    /// surfaces that spread and tick each round (<see cref="SurfaceGrid"/>), props that blow, statuses that tick each
    /// turn, morale (breaking, fleeing to an exit, surrendering, being taken prisoner), kill XP, and an AI that weighs
    /// all of it by archetype and difficulty (<see cref="CombatAi"/>). Stepwise: the Unity side asks for the next AI step,
    /// plays it, asks again. Deterministic on the battle's <see cref="Rng"/> (the AI itself never rolls).
    /// </summary>
    public sealed partial class Battle
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
        /// <summary>The field's geometry when it has one (null: flat ground, straight walks, cover by <see cref="IBattleField.Cover"/>).</summary>
        public readonly IBattleGeometry Geometry;
        public readonly Rng Rng;
        /// <summary>Difficulty for the hostile side (hit chance change, damage multiplier).</summary>
        public double EnemyHitMod, EnemyDmgMul = 1;
        private CombatDifficulty _difficulty = CombatDifficulty.Normal;
        /// <summary>How hard the fight is (C10): the hostile side's numbers and how its AI plays. Setting it sets
        /// <see cref="EnemyHitMod"/> and <see cref="EnemyDmgMul"/>.</summary>
        public CombatDifficulty Difficulty { get => _difficulty; set { _difficulty = value ?? CombatDifficulty.Normal; EnemyHitMod = _difficulty.HitMod; EnemyDmgMul = _difficulty.DmgMul; } }
        /// <summary>The ground: fire, oil, water, smoke, chem, current (C5).</summary>
        public readonly SurfaceGrid Surfaces = new();
        /// <summary>The things on the field that go up (barrels, generators: the Unity side lists them at the start).</summary>
        public readonly List<BattleProp> Props = new();
        /// <summary>Rounds in a row in which nobody was hurt (the AI pushes on after a few; a long quiet is a standoff).</summary>
        public int RoundsWithoutHarm;
        /// <summary>Milliseconds the last AI decision took (D6).</summary>
        public double LastDecisionMs;
        public readonly CombatAi Ai;
        /// <summary>Everything that happened as records (for tests, replays and the UI's numbers): every attack and blast.</summary>
        public readonly List<BattleHit> History = new();
        private int _idx;
        private bool _harm;
        private BattleUnit _lastHitTarget;

        public Battle(IBattleField field, Rng rng)
        {
            Field = field; Rng = rng; Geometry = field as IBattleGeometry;
            Ai = new CombatAi(this);
            if (Geometry != null) Surfaces.BaseGround = Geometry.GroundAt;
        }

        public BattleUnit Player => Units.FirstOrDefault(u => u.C.IsPlayer);
        public IEnumerable<BattleUnit> EnemiesOf(BattleUnit u) => Units.Where(o => o.Alive && !o.Fled && (u.Hostile ? !o.Hostile : o.Hostile));
        public IEnumerable<BattleUnit> AlliesOf(BattleUnit u) => Units.Where(o => o != u && o.Alive && !o.Fled && o.Hostile == u.Hostile);
        public BattleUnit UnitById(string id) => id == null ? null : Units.FirstOrDefault(u => u.C.Id == id);

        /// <param name="ourMove">The player's side started it (a signal, a word that turned to a fight): in initiative
        /// order still, but all of the player's side act before the other's.</param>
        public void Start(IEnumerable<BattleUnit> units, bool pit = false, bool ourMove = false)
        {
            Units.Clear(); Units.AddRange(units);
            Pit = pit; Active = true; Round = 1; XpEarned = 0; Outcome = null; _idx = 0; RoundsWithoutHarm = 0; _harm = false;
            Order = CombatRules.TurnOrder(Rng, Units.Select(u => u.C)).Select(c => Units.First(u => u.C == c)).ToList();
            if (ourMove) Order = Order.Where(u => !u.Hostile).Concat(Order.Where(u => u.Hostile)).ToList();
            foreach (var u in Units) { u.C.Statuses ??= new List<StatusEffect>(); u.C.Used ??= new HashSet<string>(); u.C.Stance ??= Stances.Stand; }
            ClearCaches();
            Say("Combat!");
        }

        internal void Say(string s) => Log.Add(s);

        // ---- turns -------------------------------------------------------------------------------------------------------

        /// <summary>The next unit whose turn it is (its AP refilled, less what its statuses take), or null when the battle
        /// is over. At a round's start the ground ticks (<see cref="SurfaceGrid.Tick"/>). At a unit's turn start what it
        /// held ready lapses, the ground under it acts (fire, chem, current, water), its statuses hurt; a stunned unit
        /// loses its turn (said in the log).</summary>
        public BattleUnit NextTurn()
        {
            if (!Active) return null;
            if (CheckEnd()) return null;
            for (var guard = 0; guard < Order.Count * 2 + 2; guard++)
            {
                var pos = _idx % Order.Count;
                if (pos == 0 && _idx > 0) { RoundStart(); if (CheckEnd()) return null; }
                var u = Order[pos];
                _idx++;
                if (!u.Alive || u.Fled) continue;
                if (u.Watch != null)
                {
                    u.IdleWatches = u.Watch.Fired ? 0 : u.IdleWatches + 1;
                    if (u.Watch.Mode == Watch.Suppress && u.Watch.Target != null) Status.Remove(u.Watch.Target.C, Status.Suppressed);
                    u.Watch = null;
                }
                u.C.Evasion = 0;
                u.C.MinorUsed = false;
                u.Intent = null;
                u.C.InTurn = true;
                GroundAtTurnStart(u);
                var (dmg, from, lines) = Status.TurnStart(Rng, u.C);
                foreach (var l in lines) Say(l);
                if (dmg > 0) { _harm = true; Hurt(u, null, dmg); }
                if (!u.Alive) { u.C.InTurn = false; Killed(u, UnitById(from)); if (CheckEnd()) return null; continue; }
                u.C.Ap = Math.Max(0, CombatRules.MaxAp(u.C) - Status.ApChange(u.C) + (Leads(u) ? 1 : 0));
                if (u.C.Stunned) { u.C.Stunned = false; Say($"{u.C.Name} is stunned and loses the turn."); u.C.InTurn = false; Status.TurnEnd(u.C); continue; }
                Current = u;
                _lastHitTarget = null;
                ClearTurnCaches();
                return u;
            }
            return null;
        }

        /// <summary>The player has the Leader perk and stands: companions get +1 AP.</summary>
        private bool Leads(BattleUnit u)
        {
            if (u.Hostile || u.C.IsPlayer) return false;
            var p = Player;
            return p != null && p.InFight && Sheet.HasFlag(p.C.Sheet, "leader");
        }

        private void RoundStart()
        {
            Round++;
            Surfaces.Tick(Rng);
            foreach (var (cx, cz, from) in Surfaces.Bursts.ToArray())
            {
                var (x, z) = SurfaceGrid.Centre(cx, cz);
                foreach (var o in Units.Where(o => o.InFight && SurfaceGrid.CellOf(o.PX) == cx && SurfaceGrid.CellOf(o.PZ) == cz).ToList())
                    BlastHit(o, x, z, 2, new[] { 6, 12 }, UnitById(from), "chem");
            }
            foreach (var p in Props.Where(p => !p.Destroyed).ToList())
            {
                var c = Surfaces.Peek(p.X, p.Z);
                if (c != null && c.Fire > 0) { p.Hp -= 5; if (p.Hp <= 0) Explode(p, UnitById(c.From)); }
            }
            // the surrendered nobody watches slip away
            foreach (var s in Units.Where(s => s.Surrendered && !s.Prisoner && !s.Escaped && s.Alive).ToList())
            {
                var guarded = Units.Any(o => o.InFight && o.Hostile != s.Hostile && Tactics.Dist(o.PX, o.PZ, s.PX, s.PZ) <= 8 && SeesPoint(o, s.PX, s.PZ));
                if (!guarded && Rng.Chance(0.25)) { s.Escaped = true; Say($"{s.C.Name} slips away."); }
            }
            RoundsWithoutHarm = _harm ? 0 : RoundsWithoutHarm + 1;
            _harm = false;
        }

        private void GroundAtTurnStart(BattleUnit u)
        {
            var c = Surfaces.Peek(u.PX, u.PZ);
            if (c == null) return;
            if (c.Ground == "water") Status.Doused(u.C);
            if (c.Fire > 0) { Status.Add(u.C, Status.Burning, 3, 0, c.From); Say($"{u.C.Name} stands in the fire."); }
            if (c.Cloud == "chem") Status.Add(u.C, Status.Choking, 1, 0, c.From);
            if (c.Shock > 0) Shock(u, UnitById(c.From));
        }

        /// <summary>The current unit's turn ends: unspent AP becomes evasion until its next (none while it holds a shot
        /// ready; the Overwatch perk holds one by itself with 4 AP or more left), its statuses count down.</summary>
        public void EndTurn()
        {
            var u = Current;
            if (u != null)
            {
                if (u.Watch == null && u.InFight && u.C.Ap >= 4 && Sheet.HasFlag(u.C.Sheet, "overwatch") && CanHold(u, false)) SetWatch(u, new Watch { Mode = Watch.Overwatch });
                u.C.Evasion = u.Watch == null ? Math.Min(10, u.C.Ap * 2) : 0;
                if (u.Watch != null) u.C.Ap = 0;
                u.C.InTurn = false;
                Status.TurnEnd(u.C);
            }
            _lastHitTarget = null;
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

        /// <summary>Nobody has done anything for rounds on end (no line, no path): the fight breaks off as a truce.</summary>
        public void Standoff() { if (Active) Finish("truce"); }

        /// <summary>A long quiet: nobody hurt for twelve rounds (the Unity side calls a standoff).</summary>
        public bool Stalemate => RoundsWithoutHarm >= 12;

        private void Finish(string outcome)
        {
            Active = false; Current = null; Outcome = outcome;
            if (outcome == "victory" || outcome == "fled")
                foreach (var s in Units.Where(s => s.Surrendered && s.Alive && !s.Escaped)) s.Prisoner = true;
            var p = Player;
            if (p != null && outcome != "defeat" && XpEarned > 0)
            {
                var levels = Sheet.AddXp(p.C.Sheet, XpEarned);
                Say($"+{XpEarned} XP{(levels > 0 ? " - level up!" : "")}");
            }
        }

        /// <summary>The fight is over by talk, or everyone hostile out of sight.</summary>
        public void Truce() { if (Active) Finish("truce"); }

        /// <summary>Everyone the player's side holds when it is over (surrendered and not slipped away; C9).</summary>
        public List<BattleUnit> Prisoners => Units.Where(u => u.Surrendered && u.Alive && !u.Escaped && (u.Prisoner || !Active)).ToList();

        // ---- sight -------------------------------------------------------------------------------------------------------

        /// <summary>Whether a sees b: the field's line, and no smoke along it.</summary>
        public bool Sees(BattleUnit a, BattleUnit b) => SeesFrom(a.PX, a.PZ, b);

        /// <summary>Whether someone standing at (x, z) would see b (the field's line, no smoke between).</summary>
        public bool SeesFrom(double x, double z, BattleUnit b)
        {
            if (!LosCached(x, z, b)) return false;
            return !Surfaces.BlocksSight(x, z, b.PX, b.PZ);
        }

        /// <summary>Whether a unit sees a point (someone standing there): the geometry's line when it has one, else the
        /// field's line taken the other way; never through smoke, never blinded beyond arm's length.</summary>
        public bool SeesPoint(BattleUnit a, double x, double z)
        {
            if (Status.Has(a.C, Status.Blinded) && Tactics.Dist(a.PX, a.PZ, x, z) > 2) return false;
            bool line;
            if (Geometry != null) line = SightCached(a.PX, a.PZ, x, z);
            else line = LosCached(x, z, a);
            return line && !Surfaces.BlocksSight(a.PX, a.PZ, x, z);
        }

        // ---- moving -------------------------------------------------------------------------------------------------------

        /// <summary>AP a walk to (x, z) costs (int.MaxValue when it cannot be reached): metres by the stance's pace, oil
        /// counted twice.</summary>
        public int MoveCost(BattleUnit u, double x, double z)
        {
            var d = PathCached(u, x, z);
            if (double.IsInfinity(d) || double.IsNaN(d)) return int.MaxValue;
            if (d < 0.2) return 0;
            var slow = Surfaces.Count > 0 ? Surfaces.SlowMetres(PathFor(u, x, z)) : 0;
            return Math.Max(1, (int)Math.Ceiling((d + slow) * Stances.MoveMul(u.C.Stance) / MetresPerAp - 1e-6));
        }

        /// <summary>How far the unit can walk with the AP it has (metres, at its stance's pace).</summary>
        public double Reach(BattleUnit u) => u.C.Ap * MetresPerAp / Stances.MoveMul(u.C.Stance);

        /// <summary>The walk to a point as corners: the geometry's path, else a straight line.</summary>
        public IReadOnlyList<(double X, double Z)> PathFor(BattleUnit u, double x, double z)
        {
            if (Geometry != null)
            {
                var p = Geometry.Path(u, x, z);
                if (p != null && p.Count > 0) return p;
            }
            return new[] { (u.PX, u.PZ), (x, z) };
        }

        /// <summary>The point a given distance along a path.</summary>
        public static (double X, double Z) Along(IReadOnlyList<(double X, double Z)> path, double metres)
        {
            if (path == null || path.Count == 0) return (0, 0);
            var left = metres;
            for (var i = 1; i < path.Count; i++)
            {
                var seg = Tactics.Dist(path[i - 1].X, path[i - 1].Z, path[i].X, path[i].Z);
                if (left <= seg) { var t = seg > 0 ? left / seg : 0; return (path[i - 1].X + (path[i].X - path[i - 1].X) * t, path[i - 1].Z + (path[i].Z - path[i - 1].Z) * t); }
                left -= seg;
            }
            return path[path.Count - 1];
        }

        /// <summary>The unit walked to (x, z) (the Unity side has moved the body): its AP spent by the distance at its
        /// stance's pace (oil twice); on the way the shots held for it fire where they see it (overwatch, an ambush, cover
        /// fire, its suppressor), the ground acts on it (fire sets it burning, water puts it out, chem chokes, current
        /// shocks); a fleeing unit at an exit is out of the fight. Returns how it went (the reactions to play).</summary>
        public MoveOutcome Moved(BattleUnit u, double x, double z, double metres)
        {
            var path = PathFor(u, x, z);
            var slow = Surfaces.Count > 0 ? Surfaces.SlowMetres(path) : 0;
            var cost = Math.Max(1, (int)Math.Ceiling((metres + slow) * Stances.MoveMul(u.C.Stance) / MetresPerAp - 1e-6));
            u.C.Ap = Math.Max(0, u.C.Ap - cost);
            var o = Travel(u, path);
            if (!o.Stopped) u.Place(x, z);
            o.X = u.PX; o.Z = u.PZ;
            if (u.Fleeing && u.Alive && !u.Fled)
            {
                var exits = Geometry?.Exits(u);
                if (exits == null || exits.Count == 0 || exits.Any(e => Tactics.Dist(e.X, e.Z, u.PX, u.PZ) <= 2.0))
                {
                    u.Fled = true; o.Escaped = true;
                    if (exits != null && exits.Count > 0) Say($"{u.C.Name} gets away.");
                    foreach (var f in EnemiesOf(u)) CombatRules.MoraleEvent(f.C, "enemy_fled");
                }
            }
            ClearTurnCaches();
            return o;
        }

        private MoveOutcome Travel(BattleUnit u, IReadOnlyList<(double X, double Z)> path)
        {
            var o = new MoveOutcome();
            var watchers = Units.Where(w => w.InFight && w.Hostile != u.Hostile && w.Watch != null).ToList();
            var fired = new HashSet<BattleUnit>();
            double sx = u.PX, sz = u.PZ;
            double walked = 0;
            // the held shots, where they see the mover
            SurfaceGrid.ForEachStep(path, 0.75, (x, z, step) =>
            {
                if (step <= 0) return true;
                walked += step;
                foreach (var w in watchers)
                {
                    if (fired.Contains(w) || !w.InFight || w.Watch == null || !u.Alive) continue;
                    if (!Triggers(w, u, x, z, Tactics.Dist(sx, sz, x, z))) continue;
                    fired.Add(w);
                    u.Place(x, z);
                    var hit = React(w, u, true);
                    if (hit != null) o.Reactions.Add(hit);
                    if (!u.Alive) { o.Stopped = true; return false; }
                }
                return true;
            });
            if (!u.Alive || Surfaces.Count == 0) return o;
            // the ground it crossed (every cell touched but the one it set off from, which did its work at the turn's start)
            int scx = SurfaceGrid.CellOf(sx), scz = SurfaceGrid.CellOf(sz);
            var burned = false; var choked = false;
            foreach (var (cx, cz) in SurfaceGrid.Cells(o.Stopped ? SurfaceGrid.Prefix(path, walked) : path))
            {
                if (cx == scx && cz == scz) continue;
                var c = Surfaces.Peek(cx, cz);
                if (c == null) continue;
                if (c.Ground == "water" && Status.Remove(u.C, Status.Burning)) o.Entered.Add("water");
                if (c.Fire > 0 && !burned) { burned = true; Status.Add(u.C, Status.Burning, 3, 0, c.From); o.Entered.Add("fire"); Say($"{u.C.Name} runs through the fire."); }
                if (c.Cloud == "chem" && !choked) { choked = true; Status.Add(u.C, Status.Choking, 1, 0, c.From); o.Entered.Add("chem"); }
                if (c.Shock > 0 && !o.Entered.Contains("shock"))
                {
                    o.Entered.Add("shock");
                    Shock(u, UnitById(c.From));
                    if (!u.Alive) { var (px, pz) = SurfaceGrid.Centre(cx, cz); u.Place(px, pz); o.Stopped = true; break; }
                }
            }
            return o;
        }

        /// <summary>Whether a held shot fires at a mover standing at (x, z), <paramref name="moved"/> metres from where it
        /// set off.</summary>
        internal bool Triggers(BattleUnit w, BattleUnit mover, double x, double z, double moved)
        {
            var wt = w.Watch;
            if (wt == null || w.C.Stunned || Status.Has(w.C, Status.Blinded)) return false;
            if (wt.Mode == Watch.Suppress) { if (wt.Target != mover || moved < 1.0) return false; }
            var wd = CombatRules.WeaponOf(w.C).def;
            var d = Tactics.Dist(w.PX, w.PZ, x, z);
            if (CombatRules.IsMelee(wd) || wt.Mode == Watch.Guard)
                return d <= CombatRules.MeleeReach(wd) && CombatRules.CanAttack(w.C).Ok;
            if (!CombatRules.CanAttack(w.C).Ok) return false;
            if (wt.Mode != Watch.Suppress && !Tactics.InCone(w.PX, w.PZ, wt.DirX, wt.DirZ, wt.HalfAngle, x, z)) return false;
            if (d > wd.Range + 4) return false;
            return SeesPoint(w, x, z);
        }

        /// <summary>A held shot fires at a target (it moved in sight, or attacked under cover fire): no AP (it was held),
        /// −15 unless steady (an ambush, the Overwatch perk, a suppression's answer); a moving target has no cover.</summary>
        internal BattleHit React(BattleUnit w, BattleUnit target, bool moving)
        {
            var wt = w.Watch;
            var opts = OptsFor(w, target);
            if (moving) { opts.Cover = "none"; opts.Flanked = false; }
            opts.Reaction = true;
            opts.Steady = wt.Mode == Watch.Ambush || wt.Mode == Watch.Suppress || Sheet.HasFlag(w.C.Sheet, "overwatch");
            if (wt.Mode == Watch.Ambush && w.Hidden && Sheet.HasFlag(w.C.Sheet, "sneak_crit")) opts.SureCrit = true;
            var res = CombatRules.ResolveAttack(Rng, w.C, target.C, opts);
            var hit = new BattleHit { Attacker = w, Defender = target, Result = res, Weapon = CombatRules.WeaponOf(w.C).def, Kind = wt.Mode == Watch.Suppress ? "suppression" : "reaction" };
            Say($"{w.C.Name} fires on {target.C.Name} ({wt.Mode}).");
            foreach (var m in res.Messages) Say(m);
            wt.Fired = true;
            if (--wt.Shots <= 0) w.Watch = null;
            if (wt.Mode == Watch.Ambush)
            {
                foreach (var o in Units.Where(o => o != w && o.Watch?.Mode == Watch.Ambush && o.Watch.Group == wt.Group && o.Hostile == w.Hostile)) { o.Hidden = false; }
                w.Hidden = false;
            }
            w.Hidden = false;
            AfterHit(hit);
            History.Add(hit);
            return hit;
        }

        // ---- attacking ---------------------------------------------------------------------------------------------

        public AttackOpts OptsFor(BattleUnit att, BattleUnit def, string aimed = null, bool burst = false) => OptsAt(att, att.PX, att.PZ, def, def.PX, def.PZ, aimed, burst);

        /// <summary>The attack's terms with the attacker standing at (ax, az) and the defender at (dx, dz): cover with its
        /// arcs and flanking, height, distance in metres, the light, smoke, anyone in the way, the side's difficulty.</summary>
        public AttackOpts OptsAt(BattleUnit att, double ax, double az, BattleUnit def, double dx, double dz, string aimed = null, bool burst = false)
        {
            var melee = CombatRules.IsMelee(CombatRules.WeaponOf(att.C).def);
            var o = new AttackOpts
            {
                Aimed = aimed, Burst = burst,
                HitMod = att.Hostile ? EnemyHitMod : 0, DmgMul = att.Hostile ? EnemyDmgMul : 1,
                Ctx = Field.Context(def), Distance = Tactics.Dist(ax, az, dx, dz),
            };
            if (!melee)
            {
                var cs = CoverAt(att, ax, az, def, dx, dz);
                o.Cover = cs.Level; o.Flanked = cs.Flanked; o.Height = cs.Height;
                o.Smoke = o.Distance > 1.5 && Surfaces.Count > 0 && Surfaces.InSmoke(dx, dz);
                o.Obstructed = InTheWay(att, ax, az, def, dx, dz) != null;
            }
            else o.Cover = "none";
            o.Inspired = !att.Hostile && !att.C.IsPlayer && Player is BattleUnit p && p.InFight && Sheet.HasFlag(p.C.Sheet, "inspire");
            return o;
        }

        /// <summary>The cover a defender at (dx, dz) has against an attacker at (ax, az) (C1): the geometry's pieces within
        /// their arcs (flanked when it has cover but none faces the attacker), height from the ground; without geometry the
        /// field's own answer.</summary>
        public CoverState CoverAt(BattleUnit att, double ax, double az, BattleUnit def, double dx, double dz)
        {
            if (Geometry != null)
            {
                var h = HeightCached(ax, az) - HeightCached(dx, dz);
                return Tactics.FromPieces(CoverCached(dx, dz), ax - dx, az - dz, h);
            }
            if (Tactics.Dist(ax, az, dx, dz) < 2.0) return new CoverState { Level = "none" };
            double oax = att.PX, oaz = att.PZ, odx = def.PX, odz = def.PZ;
            att.Place(ax, az); def.Place(dx, dz);
            var lvl = Field.Cover(att, def) ?? "none";
            att.Place(oax, oaz); def.Place(odx, odz);
            return new CoverState { Level = lvl, AnyCover = lvl != "none" };
        }

        /// <summary>Whoever stands in the line of fire between an attacker at (ax, az) and the target at (dx, dz) (within
        /// 0.6 m of the line, past the attacker's own arm's length), the nearest to the attacker first; null if nobody.</summary>
        public BattleUnit InTheWay(BattleUnit att, double ax, double az, BattleUnit def, double dx, double dz)
        {
            BattleUnit best = null; var bestT = 2.0;
            var len = Tactics.Dist(ax, az, dx, dz);
            if (len < 1.5) return null;
            foreach (var o in Units)
            {
                if (o == att || o == def || !o.Alive || o.Fled) continue;
                var d = Tactics.SegmentDistance(ax, az, dx, dz, o.PX, o.PZ, out var t);
                if (d > 0.6 || t * len < 0.9 || t > 0.97) continue;
                if (t < bestT) { bestT = t; best = o; }
            }
            return best;
        }

        public static double Distance(BattleUnit a, BattleUnit b) => Math.Sqrt((a.PX - b.PX) * (a.PX - b.PX) + (a.PZ - b.PZ) * (a.PZ - b.PZ));

        /// <summary>AP an attack costs this unit now (Double Tap: the next pistol or rifle shot at the one just hit is 2 less).</summary>
        public int AttackAp(BattleUnit att, BattleUnit def, string aimed = null, bool burst = false)
        {
            var ap = CombatRules.AttackAp(att.C, aimed != null, burst);
            var w = CombatRules.WeaponOf(att.C).def;
            if (def != null && def == _lastHitTarget && Current == att && !burst && (w.Kind == "pistol" || w.Kind == "rifle") && Sheet.HasFlag(att.C.Sheet, "double_tap")) ap = Math.Max(1, ap - 2);
            if (aimed != null && aimed != "weapon" && (w.Kind == "pistol" || w.Kind == "rifle") && Sheet.HasFlag(att.C.Sheet, "m_firearms_aim")) ap = Math.Max(1, ap - 1);
            return ap;
        }

        /// <summary>Whether att could attack def now, at what odds and cost (and why not). See also the full
        /// <see cref="Preview(BattleUnit, BattleUnit, ShotOptions)"/>.</summary>
        public (bool Ok, string Reason, int Chance, int Ap) Preview(BattleUnit att, BattleUnit def, string aimed = null, bool burst = false)
        {
            var p = Preview(att, def, new ShotOptions { Aimed = aimed, Burst = burst });
            return (p.Ok, p.Reason, p.Chance, p.Ap);
        }

        /// <summary>An attack resolved (AP spent, damage, splash, morale, kills): the defender's side's cover fire answers
        /// it first (an attacker hit is pinned); a miss may strike whoever is in the way; a missed blow may be answered
        /// (Riposte); a kill with a blade may carry on to the next (Follow-Through). A thrown weapon with an area goes to
        /// <see cref="Throw"/> at the defender's feet. Null when it could not be made.</summary>
        public BattleHit Attack(BattleUnit att, BattleUnit def, string aimed = null, bool burst = false)
        {
            var pv = Preview(att, def, aimed, burst);
            if (!pv.Ok) { if (att.C.IsPlayer) Say(pv.Reason ?? "Cannot attack"); return null; }
            var w = CombatRules.WeaponOf(att.C).def;
            if (w.Kind == "thrown" && (w.Area ?? 0) > 0)
            {
                var it = att.C.Inv.EquippedAt(att.C.Inv.Active);
                var tr = Throw(att, it?.Def, def.PX, def.PZ);
                return tr?.AsHit(att, def, w);
            }
            att.C.Ap -= pv.Ap;
            att.Hidden = false;
            var hit = new BattleHit { Attacker = att, Defender = def, Weapon = w, Kind = "attack" };
            // cover fire: the other side's held shots that see the attacker answer first
            foreach (var cf in Units.Where(o => o.InFight && o.Hostile != att.Hostile && o.Watch != null && (o.Watch.Mode == Watch.Cover || o.Watch.Mode == Watch.Guard)).ToList())
            {
                if (cf.Watch.Mode == Watch.Cover && cf.Watch.Target != null && cf.Watch.Target != def) continue;
                if (!Triggers(cf, att, att.PX, att.PZ, 0)) continue;
                var r = React(cf, att, false);
                if (r == null) continue;
                hit.Interrupts.Add(r);
                if (r.Result.Hits.Any(h => h.Hit)) Status.Add(att.C, Status.Suppressed, 1, 1, cf.C.Id);
                if (!att.Alive) break;
            }
            if (!att.Alive || att.C.Stunned) { hit.Result = new AttackResult(); History.Add(hit); return hit; }
            var opts = OptsFor(att, def, aimed, burst);
            var blocker = !CombatRules.IsMelee(w) ? InTheWay(att, att.PX, att.PZ, def, def.PX, def.PZ) : null;
            var res = CombatRules.ResolveAttack(Rng, att.C, def.C, opts);
            hit.Result = res;
            foreach (var m in res.Messages) Say(m);
            // a miss may strike whoever stands in the way
            if (blocker != null && res.Hits.Any(h => !h.Hit) && Rng.Chance(0.4)) hit.Stray = StrayHit(att, blocker, w);
            // a shot fired in a chem cloud sets it off
            if (!CombatRules.IsMelee(w) && Surfaces.Count > 0)
                foreach (var (x, z) in new[] { (att.PX, att.PZ), (def.PX, def.PZ) })
                {
                    var c = Surfaces.Peek(x, z);
                    if (c != null && c.Cloud == "chem") { Surfaces.Ignite(x, z, 0.5, att.C.Id); BurstChem(x, z, att); }
                }
            // an arc weapon's hit runs through the water the target stands in
            if (w.DmgType == "energy" && res.Hits.Any(h => h.Hit) && Surfaces.Peek(def.PX, def.PZ)?.Ground is "water" or "metal") Electrify(def.PX, def.PZ, att);
            AfterHit(hit);
            if (res.Hits.Any(h => h.Hit) && (w.Kind == "pistol" || w.Kind == "rifle")) _lastHitTarget = def;
            // interrupts from perks
            if (CombatRules.IsMelee(w) && def.InFight && res.Hits.All(h => !h.Hit) && Sheet.HasFlag(def.C.Sheet, "m_melee_riposte"))
            {
                var dw = CombatRules.WeaponOf(def.C).def;
                if (CombatRules.IsMelee(dw) && Distance(att, def) <= CombatRules.MeleeReach(dw) && CombatRules.CanAttack(def.C).Ok)
                {
                    var rr = CombatRules.ResolveAttack(Rng, def.C, att.C, OptsFor(def, att));
                    var riposte = new BattleHit { Attacker = def, Defender = att, Result = rr, Weapon = dw, Kind = "riposte" };
                    Say($"{def.C.Name} answers the blow.");
                    foreach (var m in rr.Messages) Say(m);
                    AfterHit(riposte); History.Add(riposte); hit.Followups.Add(riposte);
                }
            }
            if (CombatRules.IsMelee(w) && !def.Alive && att.InFight && Sheet.HasFlag(att.C.Sheet, "cleave"))
            {
                var next = EnemiesOf(att).Where(o => o != def && Distance(att, o) <= CombatRules.MeleeReach(w)).OrderBy(o => o.C.Sheet.Hp).FirstOrDefault();
                if (next != null && CombatRules.CanAttack(att.C).Ok)
                {
                    var cr = CombatRules.ResolveAttack(Rng, att.C, next.C, OptsFor(att, next));
                    var cleave = new BattleHit { Attacker = att, Defender = next, Result = cr, Weapon = w, Kind = "cleave" };
                    Say($"{att.C.Name} carries the blow on to {next.C.Name}.");
                    foreach (var m in cr.Messages) Say(m);
                    AfterHit(cleave); History.Add(cleave); hit.Followups.Add(cleave);
                }
            }
            History.Add(hit);
            return hit;
        }

        /// <summary>A shot that missed its mark and found someone in the way: one roll of the weapon's damage, armour as it
        /// applies.</summary>
        private BattleHit StrayHit(BattleUnit att, BattleUnit blocker, Inventory.WeaponDef w)
        {
            var dd = Sheet.Derived(blocker.C.Sheet);
            var dmg = Math.Max(1, Num.RoundInt((Rng.Int(w.Dmg[0], w.Dmg[1]) * (att.Hostile ? EnemyDmgMul : 1) - dd.Dt) * (1 - Math.Min(90, dd.Dr) / 100.0)));
            var res = new AttackResult { Damage = dmg };
            res.Hits.Add(new HitResult { Hit = true, Damage = dmg, Part = "torso" });
            blocker.C.Sheet.Hp = Math.Max(0, blocker.C.Sheet.Hp - dmg);
            if (blocker.C.Sheet.Hp == 0) { res.Killed = true; res.Hits[0].Killed = true; }
            res.Messages.Add($"The shot strikes {blocker.C.Name} ({dmg}).");
            Say(res.Messages[0]);
            var hit = new BattleHit { Attacker = att, Defender = blocker, Result = res, Weapon = w, Kind = "stray" };
            AfterHit(hit);
            History.Add(hit);
            return hit;
        }

        /// <summary>What follows any hit: morale, harm, kills.</summary>
        internal void AfterHit(BattleHit hit)
        {
            var def = hit.Defender; var att = hit.Attacker;
            if (hit.Result == null) return;
            if (hit.Result.Damage > 0)
            {
                _harm = true;
                var frac = def.C.Sheet.Hp / (double)Math.Max(1, Sheet.Derived(def.C.Sheet).MaxHp);
                CombatRules.MoraleEvent(def.C, frac < 0.3 ? "badly_hurt" : "hurt", att != null && Sheet.HasFlag(att.C.Sheet, "terrifying"));
            }
            if (!def.Alive && !_dead.Contains(def)) Killed(def, att);
        }

        private readonly HashSet<BattleUnit> _dead = new();

        private void Hurt(BattleUnit u, BattleUnit by, int dmg)
        {
            if (dmg <= 0) return;
            _harm = true;
            var frac = u.C.Sheet.Hp / (double)Math.Max(1, Sheet.Derived(u.C.Sheet).MaxHp);
            CombatRules.MoraleEvent(u.C, frac < 0.3 ? "badly_hurt" : "hurt");
        }

        /// <summary>A unit goes down outside an attack (a scripted death, a fall): its health to nothing, and the fight
        /// takes it as a kill (morale, XP to <paramref name="by"/>).</summary>
        public void Down(BattleUnit u, BattleUnit by = null)
        {
            if (u == null || _dead.Contains(u)) return;
            u.C.Sheet.Hp = 0;
            _harm = true;
            Killed(u, by);
            CheckEnd();
        }

        private void Killed(BattleUnit dead, BattleUnit killer)
        {
            if (!_dead.Add(dead)) return;
            dead.Watch = null;
            if (Pit) { Say($"{dead.C.Name} goes down."); return; }
            if (killer != null && (killer.C.IsPlayer || !killer.Hostile) && dead.Hostile) XpEarned += CombatRules.KillXp(dead.C);
            if (killer != null && killer != dead) CombatRules.MoraleEvent(killer.C, "scored_kill");
            foreach (var u in Units)
                if (u != dead && u.Alive && u.Hostile == dead.Hostile)
                {
                    var bond = dead.Leader ? ProfileOf(u).LeaderBond : 1;
                    var before = u.C.Morale;
                    CombatRules.MoraleEvent(u.C, dead.Leader ? "leader_down" : "ally_down");
                    if (bond != 1) u.C.Morale = Math.Max(0, Math.Min(100, before + (u.C.Morale - before) * bond));
                }
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

        /// <summary>Uses an item from the pack on oneself (a heal binds a bleeding wound too).</summary>
        public bool UseItem(BattleUnit u, string itemId, int now) => UseItemOn(u, u, itemId, now);

        /// <summary>Uses an item from the pack on oneself or on an ally within arm's reach (patching up the wounded).</summary>
        public bool UseItemOn(BattleUnit u, BattleUnit target, string itemId, int now)
        {
            if (target == null || !target.Alive) return false;
            if (target != u && Distance(u, target) > 1.8) return false;
            var idx = u.C.Inv.Items.FindIndex(i => i.Def == itemId);
            if (idx < 0) return false;
            var ap = CombatRules.ItemAp(u.C.Inv.Items[idx]);
            if (u.C.Ap < ap) { if (u.C.IsPlayer) Say($"Needs {ap} AP"); return false; }
            var def = Inventory.Items.Def(itemId);
            var heals = def.Consumable?.Effects?.Any(e => e.Kind == "heal" || e.Kind == "cureCripple") == true;
            Inventory.UseResult r;
            if (target == u) r = Inv.UseConsumable(u.C.Inv, idx, u.C.Sheet, now, () => Rng.Next());
            else
            {
                // (the item is the user's; it acts on the target's sheet)
                r = Inv.UseConsumable(u.C.Inv, idx, target.C.Sheet, now, () => Rng.Next());
            }
            if (!r.Ok) return false;
            u.C.Ap -= ap;
            if (heals) Status.Bound(target.C);
            Say(target == u ? $"{u.C.Name}: {r.Message}" : $"{u.C.Name} patches up {target.C.Name}: {r.Message}");
            return true;
        }

        /// <summary>The healing items a unit carries, best first.</summary>
        public static List<string> HealItems(Combatant c)
        {
            return c.Inv.Items.Where(i => i.Qty > 0 && Inventory.Items.Has(i.Def) && Inventory.Items.Def(i.Def).Consumable?.Effects?.Any(e => e.Kind == "heal" && (e.Amount ?? 0) >= 4) == true)
                .Select(i => i.Def).Distinct().OrderByDescending(id => Inventory.Items.Def(id).Consumable.Effects.Where(e => e.Kind == "heal").Sum(e => e.Amount ?? 0)).ToList();
        }

        // ---- the AI (CombatAi: every step, score every candidate action and take the best) ---------------------------

        /// <summary>The AI's next step for a unit (pure: nothing changes until the step is carried out; the dice are not
        /// touched).</summary>
        public AiStep Choose(BattleUnit u) => Ai.Choose(u);

        /// <summary>The AI's profile for a unit: its archetype's weights shaped by the difficulty (the hostile side only).</summary>
        public AiProfile ProfileOf(BattleUnit u) => Archetypes.Profile(Archetypes.Of(u), u.Hostile ? _difficulty : CombatDifficulty.Normal);
    }

    /// <summary>An attack as it happened (for the Unity side to show: tracers, impacts, floating numbers, the blast).</summary>
    public sealed class BattleHit
    {
        public BattleUnit Attacker, Defender;
        public AttackResult Result;
        public SecondFace.Core.Inventory.WeaponDef Weapon;
        public double BlastX, BlastZ, Blast;
        public readonly List<(BattleUnit Unit, int Damage)> Splash = new();
        /// <summary>attack, reaction, suppression, riposte, cleave, stray, blast, throw.</summary>
        public string Kind = "attack";
        /// <summary>Shots that answered this attack before it was made (cover fire).</summary>
        public readonly List<BattleHit> Interrupts = new();
        /// <summary>What it set off after (a riposte, a follow-through).</summary>
        public readonly List<BattleHit> Followups = new();
        /// <summary>A miss that struck whoever stood in the way.</summary>
        public BattleHit Stray;
    }
}
