using System;
using System.Collections.Generic;

namespace SecondFace.Core.Npc
{
    /// <summary>
    /// Heads, faces and necks held to real people (owner, pass 10; docs/PEOPLE_REALISM.md §4.1, §13). Each adult draws their
    /// head breadth and length, cheek width, face height, eye spacing, neck girth, the vault's height over the ears and the
    /// head and neck's height from the real people of their sex and ancestry (ANSUR II, <see cref="ProportionsData"/>: the
    /// group's covariance given their stature, so the measures vary together as real ones do), held inside the region that
    /// holds 97.5 % of the group's real people (the gate's 3D check, R3: not each measure to its own percentiles, which half
    /// of the real people fail). The sculptor's size shapes (<see cref="Free"/>) are then solved, with the bases' measured
    /// response to each, to reach those measures, moving the archetype's own values as little as they can.
    /// </summary>
    public static class Proportions
    {
        /// <summary>The shapes the solver moves: the head's size, the skull's width, the vault's height and the neck. The face's shape (its outline, jaw, chin,
        /// cheekbones) and its features are the archetype's (overhaul O2, docs/PEOPLE_REALISM.md §17: solved to the head's
        /// measured sizes and the face's measured proportions, the head's single shapes widened and rounded every face, eleven
        /// of its sliders past 0.6, and the faces read as non-human; with the shape left to the archetypes and only the size
        /// solved they read as people).</summary>
        public static readonly string[] Free =
        {
            "head-scale-horiz", "head-scale-vert", "head-scale-depth",
            // the skull's width (not the face's: R2's skull-width shape), the vault's height, the neck
            "head-cranium", "forehead-scale-vert", "neck-scale-horiz", "neck-scale-depth", "neck-scale-vert",
        };

        /// <summary>A free shape's range for a sex: <see cref="Limit"/> either way, but never a man's jaw on a woman (the
        /// archetypes' rule, Faces: no flared or squared mandible, no broad chin).</summary>
        public static (double Lo, double Hi) Range(string id, bool male)
        {
            // the real faces' range where they set the shape (R3: the hand-written women's jaw rules were narrower than real
            // women's jaws), never past the limit
            var limit = id == "head-scale-horiz" ? Limit : id.StartsWith("head-scale") ? DepthLimit
                : id is "head-cranium" or "neck-scale-horiz" or "neck-scale-depth" ? BodyLimit : ShapeLimit;
            // round the base as corrected to real people (Faces.WomanBase, ManBase, O3), never past the slider's own ends
            var off = Faces.BaseOffset(id, male);
            var s = Sculpt.Slider(id);
            double min = s?.Min ?? -1, max = s?.Max ?? 1;
            (double, double) Own(double lo, double hi) => (Math.Max(lo, min), Math.Min(hi, max));
            if (!id.StartsWith("neck-") && id != "head-cranium" && RealFaces.Range(id, male) is { } real)
                return Own(Math.Max(real.Lo, off - limit * Sculpt.Reach(id)), Math.Min(real.Hi, off + limit * Sculpt.Reach(id)));
            if (!male)
                switch (id)
                {
                    case "chin-bones": return (-Limit, 0.15);
                    case "chin-width": return (-Limit, 0.2);
                    case "head-square": return (0, 0.3);
                }
            return Own(off - limit, off + limit);
        }

        /// <summary>How far the head's width may go either way: a size, not a shape (overhaul O2: at 0.85 the head's scales
        /// made faces wide and round).</summary>
        public const double Limit = 0.2;

        /// <summary>How far the head's height and depth may go either way: further than its width (they draw the head out, not
        /// the face round; held to <see cref="Limit"/>, short women's heads stayed 3 sd short, the stature's scale taking
        /// their heads down with their bodies, O3).</summary>
        public const double DepthLimit = 0.4;

        /// <summary>How far the vault's height and the neck's length may go either way (they leave the face's shape as it
        /// is).</summary>
        public const double ShapeLimit = 0.35;

        /// <summary>How far the skull's width and the neck's girth may go either way: further, since they leave the face as it
        /// is and the bases start short of real people (the skulls 1.5 to 3 sd narrow, the women's necks 3 sd thin: O3).</summary>
        public const double BodyLimit = 0.8;

        // the cost of moving a shape by its whole range, against a measure missed by one of the group's sd
        private const double Stay = 0.12;

        /// <summary>The neck's shapes answer to the neck alone, its girth and the head and neck's height (fitted to the other
        /// measures as well, the solver found combinations the model got wrong: R2).</summary>
        private static bool NeckOnly(string id) => id.StartsWith("neck-");

        // the measures in ProportionsData.Measures' order: the stature conditions the draw and sets the scale, the rest are
        // the person's to take
        private const int Hb = 0, Hl = 1, Zy = 2, Fh = 3, Ipd = 4, Neck = 5, Stature = 6, Vault = 7, HeadNeck = 8, K = 9;

        /// <summary>The ANSUR II group of a sex and people (Core <see cref="Bodies"/>' clusters).</summary>
        public static string Group(bool male, string cluster)
        {
            var race = cluster switch
            {
                "west_african" or "east_african" => "black",
                "latin_american" or "indigenous_american" => "hispanic",
                "east_asian" or "southeast_asian" or "south_asian" => "asian",
                _ => "white",
            };
            return race + (male ? "/m" : "/f");
        }

        /// <summary>The ratios between the measures the gate holds (tools/unity/people/gate/ansur_stats.py, in its order), the
        /// stature at its place in <paramref name="m"/>.</summary>
        public static double[] Ratios(double[] m)
        {
            var neckD = m[Neck] / Math.PI;
            var st = m[Stature];
            return new[]
            {
                m[Hb] / neckD, m[Fh] / m[Zy], m[Zy] / m[Hb], m[Hb] / m[Hl], m[Hb] / st, m[Fh] / st, m[Ipd] / m[Zy], m[HeadNeck] / st,
            };
        }

        /// <summary>The person's stature in mm.</summary>
        public static double StatureMm(PlayerLook look, bool male) =>
            10.0 * (look.Stature > 0 ? look.Stature : (male ? Bodies.BaseMan : Bodies.BaseWoman) * Bodies.ScaleOf(look));

        /// <summary>The measures (mm) the person's head and neck have, from their shapes and the bases' response, and their
        /// stature, in <see cref="ProportionsData.Measures"/>' order.</summary>
        public static double[] Predict(PlayerLook look, bool male)
        {
            var m = Base(Looks.Shape(look), male);
            var f = Factors(look);
            for (var i = 0; i < K; i++) m[i] *= f[i];
            return m;
        }

        /// <summary>Each measure's scale from the base's: the body's, and on the head the head's own on top
        /// (<see cref="Bodies.HeadScaleOf"/>; the head and neck's height takes it over the vault, under half).</summary>
        public static double[] Factors(PlayerLook look)
        {
            double s = Bodies.ScaleOf(look), h = Bodies.HeadScaleOf(look);
            var f = new double[K];
            for (var i = 0; i < K; i++)
                f[i] = s * (i is Hb or Hl or Zy or Fh or Ipd or Vault ? h : i == HeadNeck ? 1 + 0.45 * (h - 1) : 1);
            return f;
        }

        /// <summary>The body's height (mm) at the base's scale with the person's shapes: a longer neck or head makes a taller
        /// body, so the stature's scale allows for it (<see cref="Bodies.ScaleOf"/>); 0 without the response.</summary>
        public static double HeightMm(PlayerLook look)
        {
            var male = look.Body == "m";
            var n3 = male ? ProportionsData.Neutral_m : ProportionsData.Neutral_f;
            if (n3.Length <= Stature) return 0;
            var r = male ? ProportionsData.Response_m : ProportionsData.Response_f;
            var h = n3[Stature];
            foreach (var kv in Looks.Shape(look))
                if (kv.Value != 0f && r.TryGetValue(kv.Key + (kv.Value > 0 ? "_p" : "_n"), out var d) && d.Length > Stature)
                    h += Math.Abs(kv.Value) * d[Stature];
            return h;
        }

        /// <summary>The measures (base mm) a shape gives, then, with <paramref name="with2D"/>, its face's proportions.</summary>
        private static double[] Base(Dictionary<string, float> shape, bool male, bool with2D = false)
        {
            var n3 = male ? ProportionsData.Neutral_m : ProportionsData.Neutral_f;
            var n2 = with2D ? (male ? ProportionsData.Neutral2_m : ProportionsData.Neutral2_f) : null;
            var m = new double[K + (n2?.Length ?? 0)];
            Array.Copy(n3, m, K);
            if (n2 != null) Array.Copy(n2, 0, m, K, n2.Length);
            foreach (var kv in shape)
            {
                if (kv.Value == 0f) continue;
                var d = Response(kv.Key + (kv.Value > 0 ? "_p" : "_n"), male, n2 != null);
                if (d == null) continue;
                var w = Math.Abs(kv.Value);
                for (var i = 0; i < m.Length; i++) m[i] += w * d[i];
            }
            return m;
        }

        /// <summary>The room a target keeps inside the gate's limits for the response model's error, in whitened distance
        /// (its error is about a third of a real sd on most measures and three quarters on the neck's girth, R2; on the face's
        /// proportions about a quarter).</summary>
        public const double Room3 = 0.5, Room2 = 0.4;

        /// <summary>The whitened distance of a person's head and neck measures (<see cref="ProportionsData.Measures"/>' order)
        /// from their group's mean given their stature, the stature taken within 2.5 sd of the group's (the gate's 3D check,
        /// tools/unity/people/gate/ansur_stats.py cond_dist).</summary>
        public static double Joint(double[] m, ProportionsData.Group g)
        {
            var (mu, L, _) = Conditional(g, m[Stature]);
            var n = mu.Length;
            var z = new double[n];
            double d2 = 0;
            for (int a = 0, i = 0; i < K; i++)
            {
                if (i == Stature || i == Fh) continue;
                var e = m[i] - mu[a];
                for (var b = 0; b < a; b++) e -= L[a, b] * z[b];
                z[a] = e / L[a, a];
                d2 += z[a] * z[a];
                a++;
            }
            return Math.Sqrt(d2);
        }

        /// <summary>The group's head and neck measures given a stature (clamped to 2.5 sd of the group's) and, when given, the
        /// body's mass (<paramref name="bmi"/>: its body mass index given the stature, in sds; ANSUR II: a heavy body's neck
        /// is thicker, its face a little wider): their mean, the Cholesky factor of their covariance, and the indices they
        /// stand for.</summary>
        private static (double[] Mu, double[,] L, List<int> Idx) Conditional(ProportionsData.Group g, double stature, double? bmi = null,
            IReadOnlyDictionary<int, double> observed = null, double looseness = 0)
        {
            double C(int i, int j) => g.Cov[i * K + j];
            var sd = Math.Sqrt(C(Stature, Stature));
            var s = Math.Clamp(stature, g.Mean[Stature] - 2.5 * sd, g.Mean[Stature] + 2.5 * sd);
            var idx = new List<int>();
            for (var i = 0; i < K; i++) if (i != Stature && i != Fh) idx.Add(i);   // (the face's height not held, Unheld)
            var n = idx.Count;
            var mu = new double[n];
            var cov = new double[n, n];
            for (var a = 0; a < n; a++)
            {
                var i = idx[a];
                mu[a] = g.Mean[i] + C(i, Stature) / C(Stature, Stature) * (s - g.Mean[Stature]);
                for (var b = 0; b < n; b++) cov[a, b] = C(i, idx[b]) - C(i, Stature) * C(idx[b], Stature) / C(Stature, Stature);
            }
            if (bmi is { } z)
                for (var a = 0; a < n; a++)
                {
                    mu[a] += g.Bmi[idx[a]] * z;
                    for (var b = 0; b < n; b++) cov[a, b] -= g.Bmi[idx[a]] * g.Bmi[idx[b]];
                }
            // and given measures observed with an error of looseness times their spread (one at a time is the same as all at
            // once)
            if (observed != null)
                foreach (var kv in observed)
                {
                    var c = idx.IndexOf(kv.Key);
                    if (c < 0) continue;
                    var cc = cov[c, c] * (1 + looseness);
                    if (cc < 1e-12) continue;
                    var col = new double[n];
                    for (var a = 0; a < n; a++) col[a] = cov[a, c];
                    var d = kv.Value - mu[c];
                    for (var a = 0; a < n; a++)
                    {
                        mu[a] += col[a] / cc * d;
                        for (var b = 0; b < n; b++) cov[a, b] -= col[a] * col[b] / cc;
                    }
                }
            // (a measure observed exactly leaves no spread of its own: kept positive for the factor)
            for (var a = 0; a < n; a++) cov[a, a] = Math.Max(cov[a, a], 1e-6);
            return (mu, Cholesky(cov), idx);
        }

        /// <summary>A body's mass index given its stature, in sds of real people's, from its build and (a man's) muscle.</summary>
        public static double Bmi(PlayerLook look) => Math.Clamp(1.5 * look.Build + 0.5 * Math.Max(0, look.Muscle), -2.5, 2.5);

        /// <summary>The person's own measures (mm, in <see cref="ProportionsData.Measures"/>' order with their stature in
        /// its place), drawn from the real people of their sex and ancestry given their stature and their body's mass
        /// (<see cref="Bmi"/>), inside the region that holds 97.5 % of them given the stature less <see cref="Room3"/> (a draw
        /// past it taken towards the middle along its own direction).</summary>
        public static double[] Target(bool male, string cluster, double stature, uint seed, double bmi = 0, IReadOnlyDictionary<int, double> face = null)
        {
            var g = ProportionsData.Groups[Group(male, cluster)];
            var rng = new Rng(seed);
            var z = new double[K - 1];
            for (var i = 0; i < z.Length; i++) z[i] = Bodies.Normal(rng);
            var room = g.Joint - Room3;
            // given the face's own measures (FaceMeasures, from its real faces' proportions) taken as an observation as
            // uncertain as the group's own spread (a photograph's proportions carry the head's tilt, which a frontal render
            // does not: held exactly, the rendered faces' heights spread a quarter to a third wider than real people's), and
            // looser still where the face's measures alone would lie past the region
            var looseness = 1.0;
            if (face != null)
                while (looseness < 50 && Joint(AtLoose(0, 1, looseness), g) > room) looseness *= 2;
            double[] AtLoose(double f, double k, double loose)
            {
                var (mu, L, idx) = Conditional(g, stature, bmi * k, face, loose);
                var t = new double[K];
                t[Stature] = stature;
                for (var a = 0; a < mu.Length; a++)
                {
                    var v = mu[a];
                    for (var b = 0; b <= a; b++) v += f * L[a, b] * z[b];
                    t[idx[a]] = v;
                }
                return t;
            }
            double[] At(double f, double k)
            {
                if (face != null) return AtLoose(f, k, looseness);
                var (mu, L, idx) = Conditional(g, stature, bmi * k);
                var t = new double[K];
                t[Stature] = stature;
                for (var a = 0; a < mu.Length; a++)
                {
                    var v = mu[a];
                    for (var b = 0; b <= a; b++) v += f * L[a, b] * z[b];
                    t[idx[a]] = v;
                }
                return t;
            }
            // held by the gate's own measure (the distance given the stature alone); a body's mass past what real people of
            // the stature carry in their heads is taken in first, then the draw
            var kb = 1.0;
            while (kb > 0 && Joint(At(0, kb), g) > room) kb -= 0.125;
            kb = Math.Max(0, kb);
            if (Joint(At(1, kb), g) <= room) return At(1, kb);
            double lo = 0, hi = 1;
            for (var it = 0; it < 14; it++)
            {
                var f = (lo + hi) / 2;
                if (Joint(At(f, kb), g) <= room) lo = f; else hi = f;
            }
            return At(lo, kb);
        }

        /// <summary>The person's face proportions as the bases' response predicts them from their shapes, or null without
        /// the 2D response.</summary>
        public static double[] Predict2(PlayerLook look, bool male)
        {
            var n2 = (male ? ProportionsData.Neutral2_m : ProportionsData.Neutral2_f)?.Length ?? 0;
            if (n2 == 0) return null;
            var all = Base(Looks.Shape(look), male, true);
            var r = new double[n2];
            Array.Copy(all, K, r, 0, n2);
            return r;
        }

        /// <summary>Solves the person's <see cref="Free"/> shapes so their head and neck take their own drawn measures
        /// (<see cref="Target"/>), each shape kept near the archetype's value.</summary>
        public static void Fit(PlayerLook look, bool male, string cluster, double age, uint seed)
        {
            if (look == null) return;
            look.Face ??= new Dictionary<string, float>();
            // the archetype's own values, the anchor of both passes; the second pass at the stature scale the first one's
            // neck and head lengths give
            var anchors = new Dictionary<string, float>();
            foreach (var id in Free) anchors[id] = look.Face.TryGetValue(id, out var v) ? v : 0f;
            // the plausibility gate at the source (owner, pass 10: no one is accepted who does not cohere with real people):
            // a person whose measures, as the model predicts them, still fall outside the real ranges is drawn again from
            // the real distribution, and the closest of a few draws kept
            var archetype = new Dictionary<string, float>(look.Face);
            Dictionary<string, float> best = null;
            var bestMiss = double.MaxValue;
            for (var attempt = 0; attempt < Attempts; attempt++)
            {
                look.Face = new Dictionary<string, float>(archetype);
                var s = attempt == 0 ? seed : unchecked(seed * 2654435761u + (uint)attempt * 40503u);
                FitOnce(look, male, cluster, age, s, anchors);
                FitOnce(look, male, cluster, age, s, anchors);
                var miss = Miss(look, male, cluster, age);
                if (miss < bestMiss) { bestMiss = miss; best = look.Face; }
                if (miss <= 0) break;
            }
            look.Face = best;
        }

        /// <summary>How many draws a person gets to cohere with real people.</summary>
        public const int Attempts = 10;

        /// <summary>How far a person's predicted measures fall outside the region that holds the real people of their group
        /// (the gate's 3D check: <see cref="Joint"/> against the group's limit, less its room for the response model's error),
        /// in shares of its limit; 0 inside. The face's proportions are the archetype's and the gate's 2D check guards them.</summary>
        public static double Miss(PlayerLook look, bool male, string cluster, double age)
        {
            var g = ProportionsData.Groups[Group(male, cluster)];
            return Math.Max(0, Joint(Predict(look, male), g) - (g.Joint - Room3)) / g.Joint;
        }


        private static void FitOnce(PlayerLook look, bool male, string cluster, double age, uint seed, Dictionary<string, float> anchors)
        {
            var g = ProportionsData.Groups[Group(male, cluster)];
            var stature = StatureMm(look, male);
            var scale = Factors(look);
            var target = Target(male, cluster, stature, seed, Bmi(look));
            const int D = K;

            // what the shapes the solver leaves give, and the free shapes' own response (3D in base mm, then 2D)
            var fixedShape = Looks.Shape(look);
            var free = new List<(string Id, double[] P, double[] Nn, double A, double Lo, double Hi)>();
            var starts = new List<double>();
            foreach (var id in Free)
            {
                var p = Response(id + "_p", male, false);
                var n = Response(id + "_n", male, false);
                if (p == null && n == null) continue;
                var a = anchors[id];
                var start = fixedShape.TryGetValue(id, out var v) ? v : 0f;
                fixedShape.Remove(id);
                var (lo, hi) = Range(id, male);
                lo = n != null ? Math.Min(lo, 0) : 0;
                hi = p != null ? Math.Max(hi, 0) : 0;
                free.Add((id, p ?? new double[D], n ?? new double[D], Math.Clamp(a, lo, hi), lo, hi));
                starts.Add(Math.Clamp(start, lo, hi));
            }
            var baseM = Base(fixedShape, male, false);
            // the targets in the base's units (the measures over the stature's scale), each weighed by the group's spread
            var t = new double[D];
            var w = new double[D];
            for (var i = 0; i < K; i++)
            {
                if (i == Stature) continue;   // set by the scale, not by shapes
                t[i] = target[i] / scale[i];
                var sd = Math.Sqrt(g.Cov[i * K + i]) / scale[i];
                w[i] = 1 / (sd * sd);
                // (the face's height not: the mesh's sellion and a caliper's differ with the nose's bridge; the photographs hold
                // the same anatomy, measured alike on ours and on real faces, overhaul O2)
                if (i == Fh) w[i] = 0;
            }
            var x = starts.ToArray();
            double[] Solve()
            {
                // res: the prediction less the target, kept up to date as each shape moves (no allocation in the loop)
                var res = new double[D];
                for (var i = 0; i < D; i++) res[i] = baseM[i] - t[i];
                for (var j = 0; j < x.Length; j++)
                {
                    var src = x[j] >= 0 ? free[j].P : free[j].Nn;
                    for (var i = 0; i < D; i++) res[i] += Math.Abs(x[j]) * src[i];
                }
                var wj = new double[D];
                // coordinate descent: each shape's best value with the rest held is the minimum of a quadratic on each side
                for (var sweep = 0; sweep < 80; sweep++)
                {
                    var moved = 0.0;
                    for (var j = 0; j < x.Length; j++)
                    {
                        var (_, P, Nn, A, Lo, Hi) = free[j];
                        // the residual without this shape, and the weights it answers to
                        var cur = x[j] >= 0 ? P : Nn;
                        var u0 = Math.Abs(x[j]);
                        var neckOnly = NeckOnly(free[j].Id);
                        for (var i = 0; i < D; i++)
                        {
                            res[i] -= u0 * cur[i];
                            wj[i] = neckOnly && i != Neck && i != HeadNeck ? 0 : w[i];
                        }
                        double Cost(double v)
                        {
                            var dir = v >= 0 ? P : Nn;
                            var u = Math.Abs(v);
                            var c = Stay * (v - A) * (v - A);
                            for (var i = 0; i < D; i++) { var e = res[i] + u * dir[i]; c += wj[i] * e * e; }
                            return c;
                        }
                        double Side(double[] dir, double sign, double bound)
                        {
                            // v = sign * u, u in [0, |bound|]: minimise sum w (res + u dir)^2 + Stay (sign u - a)^2
                            double num = Stay * sign * A, den = Stay;
                            for (var i = 0; i < D; i++) { num -= wj[i] * res[i] * dir[i]; den += wj[i] * dir[i] * dir[i]; }
                            return sign * Math.Clamp(num / den, 0, Math.Abs(bound));
                        }
                        double best = 0, bestCost = Cost(0);
                        var vp = Side(P, 1, Hi);
                        var cp = Cost(vp);
                        if (cp < bestCost) { best = vp; bestCost = cp; }
                        var vn = Side(Nn, -1, Lo);
                        if (Cost(vn) < bestCost) best = vn;
                        moved = Math.Max(moved, Math.Abs(best - x[j]));
                        x[j] = best;
                        var nd = best >= 0 ? P : Nn;
                        for (var i = 0; i < D; i++) res[i] += Math.Abs(best) * nd[i];
                    }
                    if (moved < 1e-4) break;
                }
                var pred = new double[D];
                for (var i = 0; i < D; i++) pred[i] = res[i] + t[i];
                return pred;
            }
            Solve();
            for (var j = 0; j < x.Length; j++) look.Face[free[j].Id] = (float)Math.Round(x[j], 3);
        }

        /// <summary>One shape side's response: the measures (base mm), then, with <paramref name="with2D"/>, the face's
        /// proportions; null when the shape moves neither.</summary>
        private static double[] Response(string tag, bool male, bool with2D)
        {
            var table = with2D ? (male ? _both_m ??= Combine(true, true) : _both_f ??= Combine(false, true))
                               : (male ? _three_m ??= Combine(true, false) : _three_f ??= Combine(false, false));
            return table.TryGetValue(tag, out var d) ? d : null;
        }

        // each shape side's response as one vector (the measures, then the face's proportions), built once per base
        private static Dictionary<string, double[]> _both_m, _both_f, _three_m, _three_f;

        private static Dictionary<string, double[]> Combine(bool male, bool with2D)
        {
            var r3 = male ? ProportionsData.Response_m : ProportionsData.Response_f;
            var r2 = male ? ProportionsData.Response2_m : ProportionsData.Response2_f;
            var n2 = with2D ? (male ? ProportionsData.Neutral2_m : ProportionsData.Neutral2_f)?.Length ?? 0 : 0;
            var table = new Dictionary<string, double[]>();
            var tags = new HashSet<string>(r3.Keys);
            if (n2 > 0) tags.UnionWith(r2.Keys);
            foreach (var tag in tags)
            {
                var d = new double[K + n2];
                if (r3.TryGetValue(tag, out var a)) Array.Copy(a, d, Math.Min(K, a.Length));
                if (n2 > 0 && r2.TryGetValue(tag, out var b)) Array.Copy(b, 0, d, K, n2);
                table[tag] = d;
            }
            return table;
        }

        private static double[,] Cholesky(double[,] a)
        {
            var n = a.GetLength(0);
            var l = new double[n, n];
            for (var i = 0; i < n; i++)
                for (var j = 0; j <= i; j++)
                {
                    var s = a[i, j];
                    for (var k = 0; k < j; k++) s -= l[i, k] * l[j, k];
                    l[i, j] = i == j ? Math.Sqrt(Math.Max(s, 1e-9)) : s / l[j, j];
                }
            return l;
        }
    }
}
