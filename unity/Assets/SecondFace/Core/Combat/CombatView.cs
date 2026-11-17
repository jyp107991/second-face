using System;
using System.Collections.Generic;
using System.Linq;
using SecondFace.Core.Inventory;
using SecondFace.Core.Stats;

namespace SecondFace.Core.Combat
{
    /// <summary>The interface's words for the fight's view models: a key of the UI table (UI/Strings/ui.tsv) and its
    /// arguments. The game passes <c>Strings.Get</c>; tests read the table itself.</summary>
    public delegate string Words(string key, params object[] args);

    // =====================================================================================================================
    // B3: the shot card (the hit chance with its reasons, the damage, the crit, the kill, the cost)
    // =====================================================================================================================

    /// <summary>One term of a hit chance as the card shows it: its label, its points (signed text) and a short note.</summary>
    public sealed class ShotLine
    {
        public string Key, Label, Note, Value;
        public int Points;
        /// <summary>A term worth no points that still says something (flanked: more crit; high ground denies low cover).</summary>
        public bool Info;
    }

    /// <summary>
    /// A shot before it is taken as the target card shows it (COMBAT.md B3; from <see cref="Battle.Preview(BattleUnit,
    /// BattleUnit, ShotOptions)"/>): the chance and every term behind it (skill first, then range, cover, flank, height,
    /// aim, stances, statuses, perks, the difficulty), the damage per hit after armour, the crit chance and its top, the
    /// chance it kills, the AP; warnings (an ally in the line of fire, cover fire that will answer); why it cannot be.
    /// </summary>
    public sealed class ShotCard
    {
        public bool Ok;
        /// <summary>Why it cannot be taken (in words), or null.</summary>
        public string Why;
        public int Chance, Crit, Ap, Rounds, Kill, DamageMin, DamageMax, CritMax;
        public string Cover = "none";
        public bool Flanked, HighGround;
        /// <summary>"62% to hit", "4 AP", "8–12 damage ×3", "Crit 9% · up to 18", "Kills 35%", the cover's word.</summary>
        public string Headline, Cost, Damage, CritLine, KillLine, CoverLine;
        public readonly List<ShotLine> Lines = new();
        public readonly List<string> Warnings = new();
        /// <summary>The terms' sum before the 5–95 clamp, and whether the clamp changed it.</summary>
        public int Raw;
        public bool Capped;

        public static ShotCard From(ShotPreview p, Words w)
        {
            var c = new ShotCard
            {
                Ok = p.Ok, Chance = p.Chance, Crit = p.Crit, Ap = p.Ap, Rounds = Math.Max(1, p.Rounds), DamageMin = p.DamageMin, DamageMax = p.DamageMax,
                CritMax = p.CritMax, Kill = (int)Math.Round(Math.Max(0, Math.Min(1, p.KillChance)) * 100),
            };
            var bd = p.Hit;
            if (bd != null)
            {
                c.Cover = bd.Cover ?? "none"; c.Flanked = bd.Flanked; c.HighGround = bd.HighGround;
                c.Raw = (int)Math.Round(bd.Raw);
                foreach (var r in bd.Reasons)
                {
                    var line = new ShotLine { Key = r.Key, Points = r.Value, Label = w("combat.reason." + r.Key), Note = NoteText(r.Key, r.Note, w) };
                    if (r.Value == 0) { line.Info = true; line.Value = r.Key == "flanked" ? w("combat.card.flank_crit", Tactics.FlankCrit) : ""; }
                    else line.Value = Signed(r.Value, r.Key == "skill");
                    c.Lines.Add(line);
                }
                c.Capped = !bd.OutOfReach && bd.Reasons.Count > 0 && (c.Raw > 95 || c.Raw < 5);
                if (c.Capped) c.Lines.Add(new ShotLine { Key = "capped", Info = true, Label = w(c.Raw > 95 ? "combat.card.capped_high" : "combat.card.capped_low"), Value = "" });
            }
            c.Headline = w("combat.card.chance", c.Chance);
            c.Cost = w("combat.card.ap", c.Ap);
            c.Damage = c.Rounds > 1 ? w("combat.card.damage_rounds", c.DamageMin, c.DamageMax, c.Rounds) : w("combat.card.damage", c.DamageMin, c.DamageMax);
            c.CritLine = w("combat.card.crit", c.Crit, c.CritMax);
            c.KillLine = w("combat.card.kill", c.Kill);
            c.CoverLine = c.Flanked ? w("combat.flanked") : w("combat.cover." + c.Cover);
            if (p.InTheWay != null) c.Warnings.Add(w("combat.card.in_the_way", p.InTheWay.C.Name));
            if (p.Answered.Count > 0) c.Warnings.Add(w("combat.card.answered", string.Join(", ", p.Answered.Select(u => u.C.Name))));
            if (!p.Ok) c.Why = WhyText(p.Reason, w);
            return c;
        }

        /// <summary>Points as the card writes them: "+10", "-20", the skill bare.</summary>
        public static string Signed(int v, bool bare = false) => bare || v <= 0 ? v.ToString() : "+" + v;

        private static readonly string[] Parts = { "head", "eyes", "torso", "armL", "armR", "legL", "legR", "groin", "weapon" };

        /// <summary>A term's note in words: the skill's name, the cover's level, a stance, the aimed part; metres as they are.</summary>
        public static string NoteText(string key, string note, Words w)
        {
            if (string.IsNullOrEmpty(note)) return null;
            switch (key)
            {
                case "skill": return w("skill." + note);
                case "cover":
                case "height_denies":
                {
                    var bits = note.Split(new[] { ", " }, StringSplitOptions.RemoveEmptyEntries);
                    return string.Join(", ", bits.Select(b => b == "half" || b == "full" ? w("combat.cover." + b) : b == Stances.Crouch || b == Stances.Prone ? w("combat.status." + b) : b));
                }
                case "target_stance":
                case "stance": return note == Stances.Crouch || note == Stances.Prone ? w("combat.status." + note) : note;
                case "aimed": return Array.IndexOf(Parts, note) >= 0 ? w("combat.part." + note) : note;
                case "flanked": return null;
                default: return note;
            }
        }

        /// <summary>Core's reason a shot cannot be taken, in the UI's words (unknown ones as they are).</summary>
        public static string WhyText(string reason, Words w)
        {
            if (string.IsNullOrEmpty(reason)) return w("combat.why.cannot");
            if (reason.StartsWith("Needs ") && reason.EndsWith(" AP") && int.TryParse(reason.Substring(6, reason.Length - 9), out var ap)) return w("combat.why.needs_ap", ap);
            switch (reason)
            {
                case "No line of sight": return w("combat.why.no_sight");
                case "Out of reach": return w("combat.why.out_of_reach");
                case "Out of the fight": return w("combat.why.out_of_fight");
                case "No burst": return w("combat.why.no_burst");
                case "No guns in the pit": return w("combat.why.pit");
                case "No throwing in the pit": return w("combat.why.pit");
                case "Weapon is broken": return w("combat.why.broken");
                case "Too heavy to use": return w("combat.why.heavy");
                case "Out of ammo — reload": case "Out of ammo": return w("combat.why.no_ammo");
                case "Needs a gun": return w("combat.why.needs_gun");
                case "Not enough rounds": return w("combat.why.rounds");
                case "Out of range": return w("combat.why.out_of_range");
                case "Too far to throw": return w("combat.why.too_far_throw");
                case "No clear throw": return w("combat.why.no_clear_throw");
                case "Nothing to throw": return w("combat.why.nothing_to_throw");
                case "No way there": return w("combat.why.no_way");
                case "Too far for the AP": return w("combat.too_far");
                default: return reason;
            }
        }
    }

    // =====================================================================================================================
    // B2 / B4 / B5: the walk's card (AP and band, the cover at its end, whom it flanks, the shots it draws, who sees it)
    // =====================================================================================================================

    /// <summary>
    /// A walk before it is made as the path's card shows it (COMBAT.md B2, B4, B5; from <see cref="Battle.PlanMove"/> and
    /// <see cref="Battle.ThreatsAt"/>): the AP and whether an attack is still affordable after (move-and-act) or it is a
    /// dash; the cover at its end against each enemy who would see it (the worst of them, and counts); flanked or exposed;
    /// whom it flanks; each held shot it would draw (who, at what odds); the ground's hazard on it; who would see the end
    /// and who watches it.
    /// </summary>
    public sealed class MoveCard
    {
        public bool Ok;
        public int Ap;
        public bool Act;
        /// <summary>The cover at the end against the enemies who would see it: the worst (what the bullets will find).</summary>
        public string Cover = "none";
        public bool Exposed;
        public int SeenBy, Watched, Shots;
        public string Headline, CoverLine, Why;
        public readonly List<string> Lines = new();
        public readonly List<BattleUnit> Flanks = new();
        public readonly List<BattleUnit> Watchers = new();
        public readonly List<BattleUnit> Seers = new();

        public static MoveCard From(MovePlan p, ThreatInfo t, Words w)
        {
            var c = new MoveCard { Ok = p.Ok, Ap = p.Ap == int.MaxValue ? 0 : p.Ap, Act = p.Act, Exposed = p.Exposed };
            c.Headline = !p.Ok ? ShotCard.WhyText(p.Reason, w) : p.Act ? w("combat.move.act", c.Ap) : w("combat.move.dash", c.Ap);
            if (!p.Ok) c.Why = c.Headline;
            int half = 0, full = 0, open = 0;
            string worst = null;
            foreach (var (_, cs) in p.Cover)
            {
                var lvl = cs.Level == "half" && cs.HighGround ? "none" : cs.Level ?? "none";
                if (lvl == "full") full++; else if (lvl == "half") half++; else open++;
                worst = worst == null || Tactics.CoverRank(lvl) < Tactics.CoverRank(worst) ? lvl : worst;
            }
            c.Cover = worst ?? "none";
            c.CoverLine = p.Cover.Count == 0 ? w("combat.move.unseen") : open > 0 ? w("combat.move.open_to", open) : full > 0 && half == 0 ? w("combat.cover.full") : w("combat.cover.half");
            foreach (var f in p.Flanks) { c.Flanks.Add(f); c.Lines.Add(w("combat.move.flanks", f.C.Name)); }
            foreach (var (watcher, _, _, chance) in p.Reactions) { c.Shots++; c.Lines.Add(w("combat.move.draws", watcher.C.Name, chance)); }
            if (p.Hazard != null) c.Lines.Add(w("combat.move.hazard", w(HazardKey(p.Hazard))));
            if (t != null)
            {
                foreach (var (f, _) in t.Seen) c.Seers.Add(f);
                foreach (var f in t.Watching) c.Watchers.Add(f);
                c.SeenBy = t.Seen.Count; c.Watched = t.Watching.Count;
                if (t.Watching.Count > 0 && c.Shots == 0) c.Lines.Add(w("combat.watching", string.Join(", ", t.Watching.Select(f => f.C.Name))));
                if (t.Props.Count > 0) c.Lines.Add(w("combat.move.near_blast"));
            }
            return c;
        }

        /// <summary>The key naming the worst of a cell's hazards.</summary>
        public static string HazardKey(SurfaceCell h) =>
            h.Fire > 0 ? "combat.ground.fire" : h.Cloud == "chem" ? "combat.ground.chem" : h.Shock > 0 ? "combat.ground.shock" : h.Cloud == "smoke" ? "combat.ground.smoke" : h.Ground == "oil" ? "combat.ground.oil" : "combat.ground.water";
    }

    // =====================================================================================================================
    // B5: the throw's card (the footprint and who is in it, allies flagged)
    // =====================================================================================================================

    public sealed class ThrowCard
    {
        public bool Ok;
        public string Why, Headline, Kind;
        public int Ap, Allies, Enemies;
        public double Radius, Scatter;
        public readonly List<string> Lines = new();

        public static ThrowCard From(ThrowPlan p, string itemName, Words w)
        {
            var c = new ThrowCard { Ok = p.Ok, Ap = p.Ap, Kind = p.Kind, Radius = p.Radius, Scatter = p.Scatter };
            foreach (var (u, ally, _) in p.Caught) { if (ally) c.Allies++; else c.Enemies++; }
            c.Headline = w("combat.throw.headline", itemName ?? "", c.Ap);
            if (!p.Ok) c.Why = ShotCard.WhyText(p.Reason, w);
            c.Lines.Add(w("combat.throw.caught", c.Enemies));
            if (c.Allies > 0) c.Lines.Add(w("combat.throw.allies", c.Allies, string.Join(", ", p.Caught.Where(x => x.Ally).Select(x => x.Unit.C.Name))));
            if (p.Scatter >= 0.5) c.Lines.Add(w("combat.throw.scatter", Math.Round(p.Scatter, 1)));
            return c;
        }
    }

    // =====================================================================================================================
    // B6: the turn order (who acts, in what order, how hurt, with what on them; where the round turns)
    // =====================================================================================================================

    public sealed class TurnSlot
    {
        public BattleUnit Unit;
        public bool Current, Hostile, Player, Controlled;
        /// <summary>The first of the next round (the bar draws the divider before it).</summary>
        public bool NextRound;
        public int Hp, MaxHp;
        /// <summary>Statuses for icons: id and turns left (0: lasting: a stance, a cripple).</summary>
        public readonly List<(string Id, int Turns)> Statuses = new();
        public float Health => MaxHp > 0 ? Math.Max(0, Math.Min(1, Hp / (float)MaxHp)) : 0f;
    }

    public static class TurnOrder
    {
        /// <summary>The order from the one acting on, through the rest of the round and round into the next up to them
        /// again (the dead, the fled and the surrendered left out), into a list kept between frames (its slots reused: no
        /// allocation once grown). Returns how many slots are in use.</summary>
        public static int Fill(Battle b, List<TurnSlot> into, Func<BattleUnit, bool> controlled = null)
        {
            var order = b.Order;
            var n = order.Count;
            var start = b.Current != null ? Math.Max(0, order.IndexOf(b.Current)) : 0;
            var used = 0;
            var divided = false;
            for (var i = 0; i < n; i++)
            {
                var pos = (start + i) % n;
                var u = order[pos];
                if (!u.InFight || u.Surrendered) continue;
                if (into.Count <= used) into.Add(new TurnSlot());
                var s = into[used++];
                s.Unit = u; s.Current = u == b.Current; s.Hostile = u.Hostile; s.Player = u.C.IsPlayer;
                s.Controlled = controlled != null ? controlled(u) : !u.Hostile && u.C.IsPlayer;
                s.NextRound = !divided && pos < start && used > 1;
                if (s.NextRound) divided = true;
                s.Hp = u.C.Sheet.Hp; s.MaxHp = Sheet.Derived(u.C.Sheet).MaxHp;
                StatusIcons(u.C, s.Statuses);
            }
            return used;
        }

        /// <summary>The statuses a fighter shows (as <see cref="Status.View"/>, into a kept list).</summary>
        public static void StatusIcons(Combatant c, List<(string Id, int Turns)> into)
        {
            into.Clear();
            if (c.Statuses != null) foreach (var s in c.Statuses) into.Add((s.Id, s.Turns));
            if (c.Stunned) into.Add(("stunned", 1));
            if (c.Stance == Stances.Prone) into.Add(("prone", 0));
            else if (c.Stance == Stances.Crouch) into.Add(("crouch", 0));
            var sh = c.Sheet;
            if (sh == null) return;
            if (sh.IsCrippled("armL") || sh.IsCrippled("armR")) into.Add(("crippled_arm", 0));
            if (sh.IsCrippled("legL") || sh.IsCrippled("legR")) into.Add(("crippled_leg", 0));
            if (sh.IsCrippled("eyes")) into.Add(("crippled_eyes", 0));
        }
    }

    // =====================================================================================================================
    // B1: the reachable area's bands as lines on the ground (marching squares over the walk's metres)
    // =====================================================================================================================

    /// <summary>The edges of the two bands as chains of points (metres, on the ground): <see cref="Act"/> where the
    /// move-and-act band ends, <see cref="Dash"/> where the dash band ends. Kept between turns (cleared and refilled).</summary>
    public sealed class BandLines
    {
        public readonly List<List<(double X, double Z)>> Act = new();
        public readonly List<List<(double X, double Z)>> Dash = new();
        public void Clear() { Act.Clear(); Dash.Clear(); }
    }

    public static class ReachBands
    {
        /// <summary>The band a grid node is in by its metres: 1 move-and-act, 2 dash, 0 out of reach.</summary>
        public static int Band(ReachMap m, double metres) => metres <= m.ActMetres + 1e-6 && m.ActAp > 0 ? 1 : metres <= m.DashMetres + 1e-6 ? 2 : 0;

        /// <summary>The walk's metres at any point inside the grid (bilinear between the four nodes round it; infinity
        /// where a node has no way).</summary>
        public static double Field(ReachMap m, double x, double z)
        {
            if (m.GridN < 2) return double.PositiveInfinity;
            var fx = (x - m.GridX0) / m.GridStep; var fz = (z - m.GridZ0) / m.GridStep;
            int i = (int)Math.Floor(fx), j = (int)Math.Floor(fz);
            if (i < 0 || j < 0 || i >= m.GridN - 1 || j >= m.GridN - 1) return double.PositiveInfinity;
            double tx = fx - i, tz = fz - j;
            double a = m.At(i, j), b = m.At(i + 1, j), c = m.At(i, j + 1), d = m.At(i + 1, j + 1);
            if (double.IsInfinity(a) || double.IsInfinity(b) || double.IsInfinity(c) || double.IsInfinity(d))
            {
                // the nearest node's own
                return m.At(i + (tx < 0.5 ? 0 : 1), j + (tz < 0.5 ? 0 : 1));
            }
            return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
        }

        /// <summary>How much of a band's tint a node takes (1 well inside, 0 well outside, a soft edge one feather wide).</summary>
        public static float Weight(double metres, double limit, double feather)
        {
            if (double.IsInfinity(metres) || double.IsNaN(metres)) return 0f;
            var t = (limit - metres) / Math.Max(1e-6, feather) + 0.5;
            t = Math.Max(0, Math.Min(1, t));
            return (float)(t * t * (3 - 2 * t));
        }

        /// <summary>Both bands' edges (into a kept <see cref="BandLines"/>).</summary>
        public static void Lines(ReachMap m, BandLines into)
        {
            into.Clear();
            if (m.ActAp > 0) Contour(m, m.ActMetres, into.Act);
            Contour(m, m.DashMetres, into.Dash);
        }

        /// <summary>The line where the walk's metres cross <paramref name="limit"/> (marching squares, saddles by the cell's
        /// middle), chained into polylines by the grid edges they cross (a closed loop ends on its first point).</summary>
        public static void Contour(ReachMap m, double limit, List<List<(double X, double Z)>> into)
        {
            var n = m.GridN;
            if (n < 2) return;
            // the crossings on every edge, by edge id (horizontal 2k, vertical 2k+1 for node k)
            var next = new Dictionary<int, int>();
            var prev = new Dictionary<int, int>();
            var points = new Dictionary<int, (double X, double Z)>();
            double V(int i, int j) { var v = m.At(i, j); return double.IsInfinity(v) || double.IsNaN(v) ? limit + m.GridStep * 0.5 + 1e3 : v; }
            bool In(int i, int j) => m.At(i, j) <= limit;
            int EdgeH(int i, int j) => 2 * (j * n + i);
            int EdgeV(int i, int j) => 2 * (j * n + i) + 1;
            (double X, double Z) Cross(int i0, int j0, int i1, int j1)
            {
                double a = V(i0, j0), b = V(i1, j1);
                var bInf = double.IsInfinity(m.At(i1, j1)); var aInf = double.IsInfinity(m.At(i0, j0));
                // a node with no way: the edge sits half a step from the walkable node
                double t;
                if (aInf && !bInf) t = 0.5; else if (bInf && !aInf) t = 0.5;
                else t = Math.Abs(b - a) < 1e-9 ? 0.5 : (limit - a) / (b - a);
                t = Math.Max(0, Math.Min(1, t));
                return (m.GridX0 + (i0 + (i1 - i0) * t) * m.GridStep, m.GridZ0 + (j0 + (j1 - j0) * t) * m.GridStep);
            }
            void Seg(int e0, (double, double) p0, int e1, (double, double) p1)
            {
                points[e0] = p0; points[e1] = p1;
                // (each edge has at most one segment leaving and one arriving; a clash drops the newer)
                if (!next.ContainsKey(e0) && !prev.ContainsKey(e1)) { next[e0] = e1; prev[e1] = e0; }
            }
            for (var j = 0; j < n - 1; j++)
                for (var i = 0; i < n - 1; i++)
                {
                    // corners: 0 (i,j), 1 (i+1,j), 2 (i+1,j+1), 3 (i,j+1); edges: bottom, right, top, left
                    var c = (In(i, j) ? 1 : 0) | (In(i + 1, j) ? 2 : 0) | (In(i + 1, j + 1) ? 4 : 0) | (In(i, j + 1) ? 8 : 0);
                    if (c == 0 || c == 15) continue;
                    int eb = EdgeH(i, j), er = EdgeV(i + 1, j), et = EdgeH(i, j + 1), el = EdgeV(i, j);
                    (double, double) Pb() => Cross(i, j, i + 1, j);
                    (double, double) Pr() => Cross(i + 1, j, i + 1, j + 1);
                    (double, double) Pt() => Cross(i, j + 1, i + 1, j + 1);
                    (double, double) Pl() => Cross(i, j, i, j + 1);
                    // each segment oriented with the inside on its right (so the cells' shared crossings chain)
                    switch (c)
                    {
                        case 1: Seg(el, Pl(), eb, Pb()); break;
                        case 2: Seg(eb, Pb(), er, Pr()); break;
                        case 3: Seg(el, Pl(), er, Pr()); break;
                        case 4: Seg(er, Pr(), et, Pt()); break;
                        case 6: Seg(eb, Pb(), et, Pt()); break;
                        case 7: Seg(el, Pl(), et, Pt()); break;
                        case 8: Seg(et, Pt(), el, Pl()); break;
                        case 9: Seg(et, Pt(), eb, Pb()); break;
                        case 11: Seg(et, Pt(), er, Pr()); break;
                        case 12: Seg(er, Pr(), el, Pl()); break;
                        case 13: Seg(er, Pr(), eb, Pb()); break;
                        case 14: Seg(eb, Pb(), el, Pl()); break;
                        case 5:
                        case 10:
                        {
                            var mid = (V(i, j) + V(i + 1, j) + V(i + 1, j + 1) + V(i, j + 1)) / 4 <= limit;
                            if (c == 5 && mid) { Seg(el, Pl(), et, Pt()); Seg(er, Pr(), eb, Pb()); }
                            else if (c == 5) { Seg(el, Pl(), eb, Pb()); Seg(er, Pr(), et, Pt()); }
                            else if (mid) { Seg(eb, Pb(), el, Pl()); Seg(et, Pt(), er, Pr()); }
                            else { Seg(eb, Pb(), er, Pr()); Seg(et, Pt(), el, Pl()); }
                            break;
                        }
                    }
                }
            // chain: start at an edge with no predecessor (an open end at the grid's rim), then the loops
            var done = new HashSet<int>();
            void Walk(int from)
            {
                var line = new List<(double X, double Z)>();
                var e = from;
                while (true)
                {
                    line.Add(points[e]);
                    if (!done.Add(e)) break;
                    if (!next.TryGetValue(e, out var to)) break;
                    e = to;
                    if (e == from) { line.Add(points[e]); break; }
                }
                if (line.Count >= 2) into.Add(line);
            }
            foreach (var e in next.Keys.OrderBy(k => k)) if (!prev.ContainsKey(e) && !done.Contains(e)) Walk(e);
            foreach (var e in next.Keys.OrderBy(k => k)) if (!done.Contains(e)) Walk(e);
        }
    }

    // =====================================================================================================================
    // B7: what floats up over the fighters (damage, miss, graze, crit, down, statuses, a breaking nerve)
    // =====================================================================================================================

    public sealed class FloatEvent
    {
        public BattleUnit Unit;
        /// <summary>miss, graze, hit, crit, heal, down, status, break, yield, surprised.</summary>
        public string Kind;
        public int Amount;
        public string Text;
    }

    /// <summary>A fight's people as they stood before an action (<see cref="Floats.Changes"/> says what it did to them).</summary>
    public sealed class FightPicture
    {
        internal readonly Dictionary<BattleUnit, (int Hp, bool Alive, bool Fleeing, bool Surrendered, bool Prisoner, HashSet<string> Statuses)> At = new();
    }

    public static class Floats
    {
        /// <summary>Damage at or under this is a graze (the armour took most of it).</summary>
        public const int Graze = 2;

        public static FightPicture Picture(Battle b)
        {
            var p = new FightPicture();
            foreach (var u in b.Units)
                p.At[u] = (u.C.Sheet.Hp, u.Alive, u.Fleeing, u.Surrendered, u.Prisoner, new HashSet<string>(u.C.Statuses?.Select(s => s.Id) ?? Enumerable.Empty<string>()));
            return p;
        }

        /// <summary>The hits of an attack as they land, in the order they did (cover fire's answers first, then each round,
        /// the stray, the riposte or follow-through, the splash): a miss, a graze, a hit for its damage, a crit.</summary>
        public static void FromHit(BattleHit h, List<FloatEvent> into, Words w)
        {
            if (h == null) return;
            foreach (var i in h.Interrupts) FromHit(i, into, w);
            if (h.Result != null && h.Defender != null && h.Kind != "suppress")
                foreach (var r in h.Result.Hits)
                {
                    if (!r.Hit) { into.Add(new FloatEvent { Unit = h.Defender, Kind = "miss", Text = w("combat.float.miss") }); continue; }
                    var kind = r.Crit ? "crit" : r.Damage <= Graze ? "graze" : "hit";
                    into.Add(new FloatEvent
                    {
                        Unit = h.Defender, Kind = kind, Amount = r.Damage,
                        Text = kind == "crit" ? w("combat.float.crit", r.Damage) : kind == "graze" ? w("combat.float.graze", r.Damage) : w("combat.float.damage", r.Damage),
                    });
                    if (r.Crippled != null) into.Add(new FloatEvent { Unit = h.Defender, Kind = "status", Text = w(CrippleKey(r.Crippled)) });
                }
            if (h.Kind == "suppress" && h.Defender != null) into.Add(new FloatEvent { Unit = h.Defender, Kind = "status", Text = w("combat.status.suppressed") });
            foreach (var (u, dmg) in h.Splash) into.Add(new FloatEvent { Unit = u, Kind = dmg <= Graze ? "graze" : "hit", Amount = dmg, Text = w("combat.float.damage", dmg) });
            if (h.Stray != null) FromHit(h.Stray, into, w);
            foreach (var f in h.Followups) FromHit(f, into, w);
        }

        /// <summary>A throw's landing: each one caught for their damage (statuses come from <see cref="Changes"/>).</summary>
        public static void FromThrow(ThrowResult t, List<FloatEvent> into, Words w)
        {
            if (t == null) return;
            foreach (var (u, dmg) in t.Hits) if (dmg > 0) into.Add(new FloatEvent { Unit = u, Kind = dmg <= Graze ? "graze" : "hit", Amount = dmg, Text = w("combat.float.damage", dmg) });
        }

        public static string CrippleKey(string part) =>
            part != null && part.StartsWith("arm") ? "combat.status.crippled_arm" : part != null && part.StartsWith("leg") ? "combat.status.crippled_leg" : part == "eyes" ? "combat.status.crippled_eyes" : "combat.status.stunned";

        /// <summary>What an action did to everyone beyond its hits' own numbers: health lost that no hit accounts for (the
        /// fire, a bleed, a blast), health won (a patch), the fallen, the new statuses, a nerve that broke, a surrender.
        /// <paramref name="shown"/>: the damage the hits' events already show, by unit.</summary>
        public static void Changes(Battle b, FightPicture before, List<FloatEvent> into, Words w, IReadOnlyDictionary<BattleUnit, int> shown = null)
        {
            foreach (var u in b.Units)
            {
                if (!before.At.TryGetValue(u, out var was)) continue;
                var lost = was.Hp - u.C.Sheet.Hp;
                var told = shown != null && shown.TryGetValue(u, out var s) ? s : 0;
                if (lost > told) into.Add(new FloatEvent { Unit = u, Kind = "hit", Amount = lost - told, Text = w("combat.float.damage", lost - told) });
                else if (lost < 0) into.Add(new FloatEvent { Unit = u, Kind = "heal", Amount = -lost, Text = w("combat.float.heal", -lost) });
                if (was.Alive && !u.Alive) { into.Add(new FloatEvent { Unit = u, Kind = "down", Text = w("combat.float.down") }); continue; }
                if (!was.Surrendered && u.Surrendered) into.Add(new FloatEvent { Unit = u, Kind = "yield", Text = w("combat.float.yields") });
                else if (!was.Fleeing && u.Fleeing) into.Add(new FloatEvent { Unit = u, Kind = "break", Text = w("combat.float.breaks") });
                if (!was.Prisoner && u.Prisoner) into.Add(new FloatEvent { Unit = u, Kind = "status", Text = w("combat.float.prisoner") });
                if (u.C.Statuses != null)
                    foreach (var st in u.C.Statuses)
                        if (!was.Statuses.Contains(st.Id)) into.Add(new FloatEvent { Unit = u, Kind = "status", Text = w("combat.status." + st.Id) });
            }
        }

        /// <summary>The damage a list of events shows per unit (for <see cref="Changes"/>).</summary>
        public static Dictionary<BattleUnit, int> Shown(IEnumerable<FloatEvent> events)
        {
            var d = new Dictionary<BattleUnit, int>();
            foreach (var e in events)
                if (e.Kind == "hit" || e.Kind == "crit" || e.Kind == "graze") d[e.Unit] = (d.TryGetValue(e.Unit, out var v) ? v : 0) + e.Amount;
            return d;
        }
    }

    // =====================================================================================================================
    // B9: the pace of a fight (the speed setting, skipping the other side's show, their unseen walks at once)
    // =====================================================================================================================

    /// <summary>How fast the fight plays (COMBAT.md B9, the settings' combat speed and skip): every pause and camera ease
    /// divided by the speed; with skip the other side's turns lose their pauses and the camera's framing (walks still
    /// walk: people move like people); a walk of theirs that nobody on the player's side sees at either end is played at
    /// once, beside the others' (simultaneous moves out of sight).</summary>
    public readonly struct CombatPace
    {
        public readonly float Speed;
        public readonly bool Skip;
        public CombatPace(float speed, bool skip) { Speed = speed > 0.1f ? speed : 1f; Skip = skip; }
        public static CombatPace Normal => new(1f, false);

        /// <summary>A pause of <paramref name="seconds"/> at this pace (the other side's: nearly none when skipping).</summary>
        public float Seconds(float seconds, bool theirs) => theirs && Skip ? Math.Min(seconds, 0.05f) : seconds / Speed;
        /// <summary>The camera frames this side's actions (not the other's when skipping).</summary>
        public bool Frames(bool theirs) => !(theirs && Skip);
        /// <summary>A walk is waited for unless it is the other side's and nobody of the player's side sees its start or end.</summary>
        public bool WaitsForWalk(bool theirs, bool seenAtStart, bool seenAtEnd) => !theirs || seenAtStart || seenAtEnd;
    }

    // =====================================================================================================================
    // B5: whose coming target is shown (by difficulty)
    // =====================================================================================================================

    public static class Intents
    {
        /// <summary>Whether the fight shows an enemy's intent over them: never a hidden one; then as the difficulty says
        /// (<see cref="CombatDifficulty.Intents"/>): every enemy, the seen and the machines, or the machines alone.</summary>
        public static bool Shown(CombatDifficulty d, BattleUnit enemy, bool seen)
        {
            if (enemy == null || !enemy.InFight || enemy.Surrendered || enemy.Hidden || !enemy.Hostile) return false;
            var machine = Archetypes.Of(enemy) == Archetypes.Machine;
            switch (d?.Intents ?? "seen")
            {
                case "all": return true;
                case "machines": return machine;
                default: return seen || machine;
            }
        }
    }

    // =====================================================================================================================
    // B8 / B10: the turn's actions (what the cluster and the radial offer the one acting, open or not, at what cost)
    // =====================================================================================================================

    public readonly struct CombatAction
    {
        public readonly string Id;
        public readonly bool Open;
        public readonly int Ap;
        /// <summary>A short note under the button (the cost; why not).</summary>
        public readonly string Note;
        public CombatAction(string id, bool open, int ap, string note) { Id = id; Open = open; Ap = ap; Note = note; }
    }

    public static class CombatActions
    {
        /// <summary>The cluster's actions for the one acting, in the cluster's order: a stance, a throw, a swap, a patch,
        /// undo, a reload, a held shot, end turn.</summary>
        public static List<CombatAction> For(Battle b, BattleUnit u, MoveUndo undo, Words w)
        {
            var l = new List<CombatAction>();
            var mine = b.Active && b.Current == u && u.InFight;
            // a stance: the radial of the others (the free change says 0 AP)
            var minorFree = !u.C.MinorUsed;
            var cheapest = new[] { Stances.Stand, Stances.Crouch, Stances.Prone }.Where(s => s != u.C.Stance).Min(s => Stances.ChangeAp(u.C.Stance, s, minorFree));
            l.Add(new CombatAction("stance", mine && !b.Pit && u.C.Ap >= cheapest, cheapest, w("combat.card.ap", cheapest)));
            var throws = Battle.Throwables(u.C);
            var tw = throws.Count > 0 ? Battle.Throwable(u.C, throws[0]) : null;
            l.Add(new CombatAction("throw", mine && !b.Pit && tw != null && u.C.Ap >= tw.Ap, tw?.Ap ?? 0, tw == null ? w("combat.why.nothing_to_throw") : w("combat.card.ap", tw.Ap)));
            var hasSecond = u.C.Inv.EquippedAt(u.C.Inv.Active == "primary" ? "secondary" : "primary") != null;
            var swap = CombatRules.SwapAp(u.C);
            l.Add(new CombatAction("swap", mine && hasSecond && u.C.Ap >= swap, swap, w("combat.card.ap", swap)));
            var heals = Battle.HealItems(u.C);
            var healAp = heals.Count > 0 ? CombatRules.ItemAp(u.C.Inv.Items.First(i => i.Def == heals[0])) : 2;
            l.Add(new CombatAction("heal", mine && heals.Count > 0 && u.C.Ap >= healAp, healAp, heals.Count == 0 ? w("combat.why.no_heal") : w("combat.card.ap", healAp)));
            var canUndo = undo != null && b.CanUndo(undo);
            l.Add(new CombatAction("undo", mine && canUndo, 0, canUndo ? w("combat.undo.ready") : undo != null && undo.Unit == u && undo.Blocked != null && undo.Blocked != "turn" ? w("combat.undo." + undo.Blocked) : null));
            var (wd, item) = CombatRules.WeaponOf(u.C);
            var reloadAp = CombatRules.ReloadAp(u.C);
            var canLoad = wd.Magazine != null && (item?.Loaded ?? 0) < wd.Magazine.Value && wd.Ammo != null && u.C.Inv.Items.Any(i => i.Qty > 0 && Items.Has(i.Def) && Items.Def(i.Def).Ammo?.Type == wd.Ammo);
            l.Add(new CombatAction("reload", mine && canLoad && u.C.Ap >= reloadAp, reloadAp, w("combat.card.ap", reloadAp)));
            var hold = b.CanHold(u);
            l.Add(new CombatAction("overwatch", mine && hold, CombatRules.AttackAp(u.C), w("combat.hold.ends_turn")));
            l.Add(new CombatAction("end_turn", mine, 0, u.C.Ap > 0 ? w("combat.end_turn.ap_left", u.C.Ap) : null));
            return l;
        }

        /// <summary>The stances the one acting can take, with their AP (the free minor action makes one change cost 0).</summary>
        public static List<CombatAction> StanceChoices(Battle b, BattleUnit u, Words w)
        {
            var l = new List<CombatAction>();
            var free = !u.C.MinorUsed;
            foreach (var (s, verb) in new[] { (Stances.Crouch, "crouch"), (Stances.Prone, "prone"), (Stances.Stand, "stand") })
            {
                if (s == u.C.Stance) continue;
                var ap = Stances.ChangeAp(u.C.Stance, s, free);
                l.Add(new CombatAction(verb, u.C.Ap >= ap, ap, ap == 0 ? w("combat.card.free") : w("combat.card.ap", ap)));
            }
            return l;
        }

        /// <summary>The held shots the one acting can take (all-round overwatch, cover fire): each ends the turn.</summary>
        public static List<CombatAction> Holds(Battle b, BattleUnit u, Words w)
        {
            var l = new List<CombatAction>();
            var hold = b.CanHold(u);
            var gun = !CombatRules.IsMelee(CombatRules.WeaponOf(u.C).def);
            l.Add(new CombatAction("overwatch", hold, CombatRules.AttackAp(u.C), w("combat.hold.ends_turn")));
            if (gun) l.Add(new CombatAction("cover_fire", hold, CombatRules.AttackAp(u.C), w("combat.hold.ends_turn")));
            return l;
        }

        /// <summary>The verbs on the radial over another fighter for the one acting, with each shot's preview: on an enemy the
        /// attacks (snap, aimed at the head and the legs, a burst), suppression and the demand to yield; on a surrendered
        /// enemy taking them prisoner; on an ally cover fire over them and patching them up.</summary>
        public static List<(CombatAction Action, ShotPreview Shot)> OnTarget(Battle b, BattleUnit me, BattleUnit t, Words w)
        {
            var l = new List<(CombatAction, ShotPreview)>();
            if (t == null || me == null) return l;
            if (t.Hostile != me.Hostile)
            {
                if (t.Surrendered)
                {
                    var near = Battle.Distance(me, t) <= 2.0;
                    l.Add((new CombatAction("take_prisoner", !t.Prisoner && !t.Escaped && near && me.C.Ap >= 2, 2, near ? w("combat.card.ap", 2) : w("combat.why.walk_closer")), null));
                    return l;
                }
                if (!t.InFight) return l;
                ShotPreview Pv(string aimed, bool burst) => b.Preview(me, t, new ShotOptions { Aimed = aimed, Burst = burst });
                CombatAction Shot(string id, ShotPreview pv) => new(id, pv.Ok, pv.Ap, pv.Ok ? w("combat.odds", pv.Chance, pv.Ap) : ShotCard.WhyText(pv.Reason, w));
                var snap = Pv(null, false);
                l.Add((Shot("attack", snap), snap));
                var wd = CombatRules.WeaponOf(me.C).def;
                if (!CombatRules.IsMelee(wd) && wd.Kind != "thrown")
                {
                    var head = Pv("head", false); l.Add((Shot("aim_head", head), head));
                    var legs = Pv("legL", false); l.Add((Shot("aim_legs", legs), legs));
                    if (wd.Burst != null) { var burst = Pv(null, true); l.Add((Shot("burst", burst), burst)); }
                    var sup = b.CanSuppress(me, t);
                    l.Add((new CombatAction("suppress", sup.Ok, sup.Ap, sup.Ok ? w("combat.card.ap", sup.Ap) : ShotCard.WhyText(sup.Reason, w)), null));
                }
                if (!b.Pit) l.Add((new CombatAction("demand", !me.C.MinorUsed && Battle.Distance(me, t) <= 15, 0, w("combat.card.free")), null));
                return l;
            }
            if (t == me) return l;
            var hold = b.CanHold(me) && !CombatRules.IsMelee(CombatRules.WeaponOf(me.C).def);
            l.Add((new CombatAction("cover_fire", hold, CombatRules.AttackAp(me.C), w("combat.hold.ends_turn")), null));
            var heals = Battle.HealItems(me.C);
            var close = Battle.Distance(me, t) <= 1.8;
            var ap = heals.Count > 0 ? CombatRules.ItemAp(me.C.Inv.Items.First(i => i.Def == heals[0])) : 2;
            l.Add((new CombatAction("heal_ally", heals.Count > 0 && close && t.Alive && me.C.Ap >= ap, ap, !close ? w("combat.why.walk_closer") : heals.Count == 0 ? w("combat.why.no_heal") : w("combat.card.ap", ap)), null));
            return l;
        }
    }

    // =====================================================================================================================
    // B11: how it ended, in words (victory, flight, surrender, a truce, defeat) and what it left
    // =====================================================================================================================

    public sealed class FightSummary
    {
        public string Outcome, Title;
        public int Down, Prisoners, Fled, Escaped, Xp, OursDown;
        public readonly List<string> Lines = new();

        public static FightSummary Of(Battle b, Words w, string outcome = null)
        {
            var s = new FightSummary { Outcome = outcome ?? b.Outcome ?? "truce", Xp = b.XpEarned };
            foreach (var u in b.Units)
            {
                if (u.Hostile)
                {
                    if (!u.Alive) s.Down++;
                    else if (u.Surrendered && !u.Escaped) s.Prisoners++;
                    else if (u.Surrendered && u.Escaped) s.Escaped++;
                    else if (u.Fled) s.Fled++;
                }
                else if (!u.Alive) s.OursDown++;
            }
            s.Title = w("combat.end." + s.Outcome);
            if (s.Down > 0) s.Lines.Add(w("combat.end.tally_down", s.Down));
            if (s.Prisoners > 0) s.Lines.Add(w("combat.end.tally_prisoners", s.Prisoners));
            if (s.Fled > 0) s.Lines.Add(w("combat.end.tally_fled", s.Fled));
            if (s.Escaped > 0) s.Lines.Add(w("combat.end.tally_escaped", s.Escaped));
            if (s.OursDown > 0 && s.Outcome != "defeat") s.Lines.Add(w("combat.end.tally_ours_down", s.OursDown));
            if (s.Xp > 0 && s.Outcome != "defeat") s.Lines.Add(w("combat.end.tally_xp", s.Xp));
            return s;
        }
    }
}
