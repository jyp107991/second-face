using System;
using System.Collections.Generic;
using System.Linq;
using SecondFace.Core.Stats;

namespace SecondFace.Core.Combat
{
    /// <summary>A point a unit can walk to this turn (COMBAT.md B1): its AP, whether an attack is still possible after
    /// (the move-and-act band) and the cover there.</summary>
    public sealed class ReachPoint
    {
        public double X, Z;
        public int Ap;
        /// <summary>Within the move-and-act band (an attack still affordable after the walk); otherwise a dash.</summary>
        public bool Act;
        /// <summary>The best cover there against the enemies who would see it (none, half, full).</summary>
        public string Cover;
        /// <summary>Some enemy would see it with no cover against them (in the open, or flanked).</summary>
        public bool Exposed;
    }

    /// <summary>The reachable area (B1): the two bands as metres and AP, and the sampled points.</summary>
    public sealed class ReachMap
    {
        public int ActAp, DashAp;
        public double ActMetres, DashMetres;
        public readonly List<ReachPoint> Points = new();
    }

    /// <summary>A walk before it is made (B2): its AP and band, the path, the shots it would draw (who, where, at what
    /// odds), the first hazard on it, the cover at the end against each enemy who would see it, and whom it flanks.</summary>
    public sealed class MovePlan
    {
        public bool Ok;
        public string Reason;
        public int Ap;
        public double Metres;
        public bool Act;
        public IReadOnlyList<(double X, double Z)> Path;
        public readonly List<(BattleUnit Watcher, double X, double Z, int Chance)> Reactions = new();
        public SurfaceCell Hazard;
        public readonly List<(BattleUnit Foe, CoverState Cover)> Cover = new();
        public readonly List<BattleUnit> Flanks = new();
        public bool Exposed;
    }

    /// <summary>What threatens a point (B5): the enemies who would see it and their odds, those holding a shot over it,
    /// the hazard under it, the props whose blast reaches it, the clouds and fires near.</summary>
    public sealed class ThreatInfo
    {
        public readonly List<(BattleUnit Foe, int Chance)> Seen = new();
        public readonly List<BattleUnit> Watching = new();
        public SurfaceCell Surface;
        public readonly List<BattleProp> Props = new();
        public bool Exposed;
    }

    /// <summary>A held shot as the UI draws it (B5): who, where, the cone and its reach.</summary>
    public sealed class WatchView
    {
        public BattleUnit Unit;
        public string Mode;
        public double X, Z, DirX, DirZ, HalfAngle, Range;
        public BattleUnit Target;
    }

    public sealed partial class Battle
    {
        // ---- caches (the geometry is fixed for a fight; sight and paths for a turn) ------------------------------------

        private readonly Dictionary<long, IReadOnlyList<CoverPiece>> _cover = new();
        private readonly Dictionary<long, double> _height = new();
        private readonly Dictionary<(long, long), bool> _los = new();
        private readonly Dictionary<(long, long), bool> _sight = new();
        private readonly Dictionary<(long, long), double> _paths = new();

        private static long Pt(double x, double z) => ((long)Math.Round(x * 8) << 32) ^ (uint)(int)Math.Round(z * 8);

        private void ClearCaches() { _cover.Clear(); _height.Clear(); ClearTurnCaches(); }
        /// <summary>Forget sight lines and paths (someone moved, a cloud rose): the next questions go to the field.</summary>
        public void ClearTurnCaches() { _los.Clear(); _sight.Clear(); _paths.Clear(); }

        internal IReadOnlyList<CoverPiece> CoverCached(double x, double z)
        {
            var k = Pt(x, z);
            if (_cover.TryGetValue(k, out var v)) return v;
            v = Geometry?.CoverAround(x, z) ?? Array.Empty<CoverPiece>();
            if (_cover.Count > 50000) _cover.Clear();
            return _cover[k] = v;
        }

        internal double HeightCached(double x, double z)
        {
            if (Geometry == null) return 0;
            var k = Pt(x, z);
            if (_height.TryGetValue(k, out var v)) return v;
            if (_height.Count > 50000) _height.Clear();
            return _height[k] = Geometry.Height(x, z);
        }

        internal bool LosCached(double x, double z, BattleUnit b)
        {
            var k = (Pt(x, z), Pt(b.PX, b.PZ));
            if (_los.TryGetValue(k, out var v)) return v;
            if (_los.Count > 50000) _los.Clear();
            return _los[k] = Field.LineOfSightFrom(x, z, b);
        }

        internal bool SightCached(double ax, double az, double bx, double bz)
        {
            if (Geometry == null) return true;
            var k = (Pt(ax, az), Pt(bx, bz));
            if (_sight.TryGetValue(k, out var v)) return v;
            if (_sight.Count > 50000) _sight.Clear();
            return _sight[k] = Geometry.SightBetween(ax, az, bx, bz);
        }

        internal double PathCached(BattleUnit u, double x, double z)
        {
            var k = (Pt(u.PX, u.PZ), Pt(x, z));
            if (_paths.TryGetValue(k, out var v)) return v;
            if (_paths.Count > 50000) _paths.Clear();
            return _paths[k] = Field.PathLength(u, x, z);
        }

        // ---- the shot preview (B3) --------------------------------------------------------------------------------------

        /// <summary>A shot before it is taken (B3): whether it can be, and why not; the hit chance with its itemised reasons
        /// (range, cover, flank, height, aim, stance, status, perks, the difficulty); the damage per hit after armour, the
        /// rounds, the crit chance, the AP; anyone in the line of fire; the cover fire that would answer it; the rough
        /// chance it kills. From another standing point with <see cref="ShotOptions.FromX"/>.</summary>
        public ShotPreview Preview(BattleUnit att, BattleUnit def, ShotOptions o)
        {
            o ??= ShotOptions.Snap;
            var sp = new ShotPreview();
            double ax = o.FromX ?? att.PX, az = o.FromZ ?? att.PZ;
            var (w, item) = CombatRules.WeaponOf(att.C);
            var burst = o.Burst && w.Burst != null;
            sp.Ap = AttackAp(att, def, o.Aimed, burst);
            var ca = CombatRules.CanAttack(att.C, burst);
            var melee = CombatRules.IsMelee(w);
            var dist = Tactics.Dist(ax, az, def.PX, def.PZ);
            string why = null;
            if (!ca.Ok) why = ca.Reason;
            else if (o.Burst && w.Burst == null) why = "No burst";
            else if (Pit && !melee) why = "No guns in the pit";
            else if (def.Surrendered || def.Fled || !def.Alive) why = "Out of the fight";
            else if (melee && dist > CombatRules.MeleeReach(w)) why = "Out of reach";
            else if (!melee && !SeesFrom(ax, az, def)) why = "No line of sight";
            var opts = OptsAt(att, ax, az, def, def.PX, def.PZ, o.Aimed, burst);
            var bd = CombatRules.Breakdown(att.C, def.C, opts);
            sp.Hit = bd; sp.Chance = bd.Chance; sp.Crit = bd.Crit;
            if (why == null && melee && bd.OutOfReach) why = "Out of reach";
            var (lo, hi, cmax) = CombatRules.DamageRange(att.C, def.C, opts);
            sp.DamageMin = lo; sp.DamageMax = hi; sp.CritMax = cmax;
            sp.Rounds = burst ? Math.Max(1, Math.Min(w.Burst.Rounds, w.Magazine != null ? item?.Loaded ?? 0 : w.Burst.Rounds)) : 1;
            if (!melee) sp.InTheWay = InTheWay(att, ax, az, def, def.PX, def.PZ);
            foreach (var cf in Units)
                if (cf.InFight && cf.Hostile != att.Hostile && cf.Watch != null && cf.Watch.Mode == Watch.Cover && (cf.Watch.Target == null || cf.Watch.Target == def) && SeesPoint(cf, ax, az))
                    sp.Answered.Add(cf);
            var p = sp.Chance / 100.0;
            var avg = (lo + hi) / 2.0;
            var critP = p * sp.Crit / 100.0;
            sp.Expected = (p - critP) * avg * sp.Rounds + critP * cmax * 0.8 * sp.Rounds;
            var hp = def.C.Sheet.Hp;
            double perKill = lo >= hp ? 1 : hi < hp ? 0 : (hi - hp + 1) / (double)(hi - lo + 1);
            var critKill = cmax >= hp ? 1.0 : 0;
            var single = (p - critP) * perKill + critP * Math.Max(perKill, critKill);
            if (sp.Rounds <= 1) sp.KillChance = single;
            else
            {
                var need = Math.Max(1, (int)Math.Ceiling(hp / Math.Max(1, avg)));
                double kill = 0;
                for (var k = need; k <= sp.Rounds; k++) kill += Binom(sp.Rounds, k) * Math.Pow(p, k) * Math.Pow(1 - p, sp.Rounds - k);
                sp.KillChance = Math.Max(single, kill);
            }
            sp.Ok = why == null && att.C.Ap >= sp.Ap;
            sp.Reason = why ?? (att.C.Ap < sp.Ap ? $"Needs {sp.Ap} AP" : null);
            if (why != null) sp.Chance = why == "Out of reach" ? 0 : sp.Chance;
            return sp;
        }

        private static double Binom(int n, int k) { double r = 1; for (var i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; }

        // ---- the reachable area (B1) and the path preview (B2) ---------------------------------------------------------

        /// <summary>Where a unit can walk this turn (B1): the move-and-act band (AP left for its attack after) and the dash
        /// band (all its AP), as metres at its pace, and points sampled on a grid within the dash band with their AP, band
        /// and (with <paramref name="withCover"/>) cover. The Unity side draws the bands from the points (its own NavMesh
        /// sampling is the same question asked of the field).</summary>
        public ReachMap Reachable(BattleUnit u, double step = 1.0, bool withCover = false)
        {
            var m = new ReachMap();
            var atk = CombatRules.AttackAp(u.C);
            var mul = Stances.MoveMul(u.C.Stance);
            m.DashAp = u.C.Ap; m.ActAp = Math.Max(0, u.C.Ap - atk);
            m.DashMetres = m.DashAp * MetresPerAp / mul; m.ActMetres = m.ActAp * MetresPerAp / mul;
            var r = m.DashMetres;
            var n = (int)Math.Ceiling(r / step);
            var foes = EnemiesOf(u).Where(f => !f.Surrendered).ToList();
            for (var i = -n; i <= n; i++)
                for (var j = -n; j <= n; j++)
                {
                    double x = u.PX + i * step, z = u.PZ + j * step;
                    if (Tactics.Dist(x, z, u.PX, u.PZ) > r + 1e-6) continue;
                    var cost = MoveCost(u, x, z);
                    if (cost > u.C.Ap) continue;
                    var p = new ReachPoint { X = x, Z = z, Ap = cost, Act = cost <= m.ActAp };
                    if (withCover) { var (lvl, exp) = CoverVsAll(u, x, z, foes); p.Cover = lvl; p.Exposed = exp; }
                    m.Points.Add(p);
                }
            return m;
        }

        /// <summary>The best cover at a point against the enemies with guns who would see it, and whether any sees it
        /// with none (exposed: in the open or flanked; cover is nothing to a blade, so those do not count).</summary>
        public (string Cover, bool Exposed) CoverVsAll(BattleUnit u, double x, double z, IEnumerable<BattleUnit> foes = null)
        {
            string best = null; var exposed = false;
            foreach (var f in foes ?? EnemiesOf(u).Where(f => !f.Surrendered))
            {
                if (CombatRules.IsMelee(CombatRules.WeaponOf(f.C).def)) continue;
                if (!SeesPoint(f, x, z)) continue;
                var cs = CoverAt(f, f.PX, f.PZ, u, x, z);
                var lvl = cs.Level;
                if (lvl == "half" && cs.HighGround) lvl = "none";
                if (lvl == "none") exposed = true;
                best = best == null ? lvl : Tactics.CoverRank(lvl) < Tactics.CoverRank(best) ? lvl : best;
            }
            return (best ?? "none", exposed);
        }

        /// <summary>A walk before it is made (B2): AP, band, path, the shots it would draw, hazards, the end's cover per
        /// enemy who would see it, whom it would flank.</summary>
        public MovePlan PlanMove(BattleUnit u, double x, double z)
        {
            var mp = new MovePlan();
            mp.Ap = MoveCost(u, x, z);
            if (mp.Ap == int.MaxValue) { mp.Reason = "No way there"; return mp; }
            mp.Path = PathFor(u, x, z);
            double len = 0;
            for (var i = 1; i < mp.Path.Count; i++) len += Tactics.Dist(mp.Path[i - 1].X, mp.Path[i - 1].Z, mp.Path[i].X, mp.Path[i].Z);
            mp.Metres = len;
            mp.Act = mp.Ap <= u.C.Ap - CombatRules.AttackAp(u.C);
            mp.Hazard = Surfaces.Count > 0 ? Surfaces.HazardOn(mp.Path) : null;
            var fired = new HashSet<BattleUnit>();
            var watchers = Units.Where(w => w.InFight && w.Hostile != u.Hostile && w.Watch != null).ToList();
            if (watchers.Count > 0)
                SurfaceGrid.ForEachStep(mp.Path, 0.75, (px, pz, step) =>
                {
                    if (step <= 0) return true;
                    foreach (var w in watchers)
                    {
                        if (fired.Contains(w) || !Triggers(w, u, px, pz, Tactics.Dist(u.PX, u.PZ, px, pz))) continue;
                        fired.Add(w);
                        var opts = OptsAt(w, w.PX, w.PZ, u, px, pz); opts.Cover = "none"; opts.Flanked = false; opts.Reaction = true;
                        opts.Steady = w.Watch.Mode == Watch.Ambush || w.Watch.Mode == Watch.Suppress || Sheet.HasFlag(w.C.Sheet, "overwatch");
                        mp.Reactions.Add((w, px, pz, CombatRules.Breakdown(w.C, u.C, opts).Chance));
                    }
                    return true;
                });
            foreach (var f in EnemiesOf(u).Where(f => !f.Surrendered))
            {
                if (SeesPoint(f, x, z)) { var cs = CoverAt(f, f.PX, f.PZ, u, x, z); mp.Cover.Add((f, cs)); if (cs.Level == "none" || (cs.Level == "half" && cs.HighGround)) mp.Exposed = true; }
                var mine = CoverAt(u, x, z, f, f.PX, f.PZ);
                if (mine.Flanked) mp.Flanks.Add(f);
            }
            mp.Ok = mp.Ap <= u.C.Ap;
            mp.Reason = mp.Ok ? null : "Too far for the AP";
            return mp;
        }

        // ---- threats (B5) ----------------------------------------------------------------------------------------------

        /// <summary>What threatens a point for a unit of a side (B5): the enemies who would see it (and their odds against
        /// someone standing there), those holding a shot over it, the ground, the props whose blast reaches it.</summary>
        public ThreatInfo ThreatsAt(BattleUnit u, double x, double z)
        {
            var t = new ThreatInfo();
            double ox = u.PX, oz = u.PZ;
            foreach (var f in EnemiesOf(u).Where(f => !f.Surrendered))
            {
                if (f.Watch != null && Triggers(f, u, x, z, 2)) t.Watching.Add(f);
                if (!SeesPoint(f, x, z)) continue;
                u.Place(x, z);
                var o = OptsFor(f, u);
                u.Place(ox, oz);
                var bd = CombatRules.Breakdown(f.C, u.C, o);
                t.Seen.Add((f, bd.Chance));
                if (bd.Cover == "none") t.Exposed = true;
            }
            t.Surface = Surfaces.Peek(x, z);
            foreach (var p in Props) if (!p.Destroyed && Tactics.Dist(p.X, p.Z, x, z) <= p.Radius) t.Props.Add(p);
            return t;
        }

        /// <summary>Every shot held ready now, as the UI draws it.</summary>
        public List<WatchView> Watches()
        {
            var l = new List<WatchView>();
            foreach (var u in Units)
            {
                if (u.Watch == null || !u.InFight || (u.Hidden && u.Hostile)) continue;
                var w = CombatRules.WeaponOf(u.C).def;
                l.Add(new WatchView { Unit = u, Mode = u.Watch.Mode, X = u.PX, Z = u.PZ, DirX = u.Watch.DirX, DirZ = u.Watch.DirZ, HalfAngle = u.Watch.HalfAngle, Range = CombatRules.IsMelee(w) ? CombatRules.MeleeReach(w) : w.Range + 4, Target = u.Watch.Target });
            }
            return l;
        }

        /// <summary>What an AI unit means to do on its coming turn (B5, the intent shown over enemies): its first attack's
        /// target and kind as it would play the turn from where it stands now with full AP. Pure: everything is put back.</summary>
        public (BattleUnit Target, string Kind) PredictIntent(BattleUnit u)
        {
            if (!u.InFight) return (null, null);
            double ox = u.PX, oz = u.PZ; var oap = u.C.Ap; var ostance = u.C.Stance; var ominor = u.C.MinorUsed; var cur = Current;
            try
            {
                u.C.Ap = Math.Max(0, CombatRules.MaxAp(u.C) - Status.ApChange(u.C));
                Current = u;
                for (var i = 0; i < 3 && u.C.Ap > 0; i++)
                {
                    var a = Choose(u);
                    if (a.Kind == "move") { var c = MoveCost(u, a.X, a.Z); if (c == int.MaxValue) break; u.C.Ap -= Math.Min(u.C.Ap, Math.Max(1, c)); u.Place(a.X, a.Z); ClearTurnCaches(); continue; }
                    if (a.Kind == "stance") { u.C.Stance = a.Stance; u.C.MinorUsed = true; continue; }
                    if (a.Target != null || a.Kind == "throw") return (a.Target, a.Kind);
                    return (null, a.Kind);
                }
                return (null, "move");
            }
            finally { u.Place(ox, oz); u.C.Ap = oap; u.C.Stance = ostance; u.C.MinorUsed = ominor; Current = cur; ClearTurnCaches(); }
        }

        /// <summary>The statuses on a unit for its icons (with turns left).</summary>
        public List<(string Id, int Turns)> StatusesOf(BattleUnit u) => Status.View(u.C);
    }
}
