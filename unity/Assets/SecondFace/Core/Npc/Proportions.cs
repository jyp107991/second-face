using System;
using System.Collections.Generic;

namespace SecondFace.Core.Npc
{
    /// <summary>
    /// Heads, faces and necks held to real people (owner, pass 10; docs/PEOPLE_REALISM.md §4.1). Each adult draws their head
    /// breadth and length, cheek width, face height, eye spacing, neck girth, the vault's height over the ears and the head
    /// and neck's height from the real people of their sex and ancestry (ANSUR II, <see cref="ProportionsData"/>: the group's covariance given their stature, so the measures vary
    /// together as real ones do), kept inside the group's 3rd-97th percentiles on every measure and on every proportion
    /// between them. The sculptor's size shapes (<see cref="Free"/>) are then solved, with the bases' measured response to
    /// each, to reach those measures, moving the archetype's own values as little as they can.
    /// </summary>
    public static class Proportions
    {
        /// <summary>The shapes the solver moves: the head's and the neck's size, the cheekbones, the eyes' spacing, the chin's
        /// height, and the features the face's measured proportions turn on. The face's character (its shape types, the
        /// nose's form, the lips' shape, the brows' angle) stays the archetype's.</summary>
        public static readonly string[] Free =
        {
            "head-scale-horiz", "head-scale-depth", "head-back-scale-depth", "head-scale-vert", "forehead-scale-vert", "chin-height",
            "cheek-bones", "eye-trans", "neck-scale-horiz", "neck-scale-depth", "neck-scale-vert",
            // and the features the face's proportions turn on (its width at the jaw, the eyes', nose's and mouth's size,
            // the lips, the brows' height)
            "chin-width", "chin-bones", "head-square", "head-fat", "eye-scale", "nose-scale-horiz", "nose-scale-vert",
            // the round and oval types widen the cheeks more than the skull: traded only where the cheeks would pass the
            // skull's width (R2: East and Southeast Asian faces)
            "head-round", "head-oval",
            "mouth-scale-horiz", "mouth-upperlip-volume", "mouth-lowerlip-volume", "mouth-lowerlip-height", "mouth-cupidsbow",
            "eyebrows-trans",
        };

        /// <summary>A free shape's range for a sex: <see cref="Limit"/> either way, but never a man's jaw on a woman (the
        /// archetypes' rule, Faces: no flared or squared mandible, no broad chin).</summary>
        public static (double Lo, double Hi) Range(string id, bool male)
        {
            if (!male)
                switch (id)
                {
                    case "chin-bones": return (-Limit, 0.15);
                    case "chin-width": return (-Limit, 0.2);
                    case "head-square": return (0, 0.3);
                }
            return (-Limit, Limit);
        }

        /// <summary>How far a free shape may go either way (a shape at its end distorts the mesh).</summary>
        public const double Limit = 0.85;

        // the cost of moving a shape by its whole range, against a measure missed by one of the group's sd
        private const double Stay = 0.25;

        /// <summary>The neck's shapes answer to the neck alone, its girth and the head and neck's height (fitted to the other
        /// measures as well, the solver found combinations the model got wrong: R2).</summary>
        private static bool NeckOnly(string id) => id.StartsWith("neck-");
        // a target is kept this share of each percentile range inside it: room for the response model's error, most for the
        // measures it predicts least well (the face's height and the neck's girth, which the chin's place moves: R2)
        private static readonly double[] Margins = { 0.08, 0.08, 0.08, 0.2, 0.08, 0.2, 0, 0.15, 0.15 };
        private static readonly double[] RatioMargins = { 0.25, 0.2, 0.08, 0.08, 0.08, 0.2, 0.08, 0.15 };

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
            var s = Bodies.ScaleOf(look);
            for (var i = 0; i < K; i++) m[i] *= s;
            return m;
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

        /// <summary>Whether measures are inside the group's range on every measure and every ratio (with
        /// <paramref name="margins"/>, each range's share of room kept clear), skipping the ratios <paramref name="skip"/> marks.</summary>
        public static bool InRange(double[] m, ProportionsData.Group g, bool margins = false, bool[] skip = null)
        {
            for (var i = 0; i < K; i++)
            {
                if (i == Stature) continue;   // the person's own (Bodies), not the survey's
                var pad = (margins ? Margins[i] : 0) * (g.P97[i] - g.P3[i]);
                if (m[i] < g.P3[i] + pad || m[i] > g.P97[i] - pad) return false;
            }
            var r = Ratios(m);
            for (var i = 0; i < r.Length; i++)
            {
                if (skip != null && skip[i]) continue;
                var pad = (margins ? RatioMargins[i] : 0) * (g.RatioP97[i] - g.RatioP3[i]);
                if (r[i] < g.RatioP3[i] + pad || r[i] > g.RatioP97[i] - pad) return false;
            }
            return true;
        }

        /// <summary>The person's own measures (mm, in <see cref="ProportionsData.Measures"/>' order with their stature in
        /// its place), drawn from the real people of their sex and ancestry given their stature, inside every range (drawn
        /// towards the group's middle as far as a range needs).</summary>
        public static double[] Target(bool male, string cluster, double stature, uint seed)
        {
            var g = ProportionsData.Groups[Group(male, cluster)];
            double C(int i, int j) => g.Cov[i * K + j];
            // the group given the stature (a stature outside the group's own is taken at its edge)
            var sd = Math.Sqrt(C(Stature, Stature));
            var s = Math.Clamp(stature, g.Mean[Stature] - 2.5 * sd, g.Mean[Stature] + 2.5 * sd);
            var idx = new List<int>();
            for (var i = 0; i < K; i++) if (i != Stature) idx.Add(i);
            var n = idx.Count;
            var mu = new double[n];
            var cov = new double[n, n];
            for (var a = 0; a < n; a++)
            {
                var i = idx[a];
                mu[a] = g.Mean[i] + C(i, Stature) / C(Stature, Stature) * (s - g.Mean[Stature]);
                for (var b = 0; b < n; b++) cov[a, b] = C(i, idx[b]) - C(i, Stature) * C(idx[b], Stature) / C(Stature, Stature);
            }
            var L = Cholesky(cov);
            var rng = new Rng(seed);
            var z = new double[n];
            for (var i = 0; i < n; i++) z[i] = Bodies.Normal(rng);
            double[] At(double f)
            {
                var t = new double[K];
                t[Stature] = stature;
                for (var a = 0; a < n; a++)
                {
                    var v = mu[a];
                    for (var b = 0; b <= a; b++) v += f * L[a, b] * z[b];
                    t[idx[a]] = v;
                }
                return t;
            }
            // a ratio already out of range for the group's middle at this stature (the head against a stature beyond
            // the survey's) is not held: it cannot be met by the head
            var skip = new bool[ProportionsData.Ratios.Length];
            var rm = Ratios(At(0));
            for (var i = 0; i < rm.Length; i++) skip[i] = rm[i] < g.RatioP3[i] || rm[i] > g.RatioP97[i];
            if (InRange(At(1), g, true, skip)) return At(1);
            // the draw scaled towards the middle until it fits (along a line each measure and ratio is monotone, so the
            // fitting scales are one interval from zero)
            double lo = 0, hi = 1;
            for (var k = 0; k < 14; k++)
            {
                var f = (lo + hi) / 2;
                if (InRange(At(f), g, true, skip)) lo = f; else hi = f;
            }
            // a measure the group's middle at this stature already overshoots (a long neck on a stature past the
            // survey's) held at the range's edge
            var target = At(lo);
            for (var i = 0; i < K; i++)
            {
                if (i == Stature) continue;
                var pad = Margins[i] * (g.P97[i] - g.P3[i]);
                target[i] = Math.Clamp(target[i], g.P3[i] + pad, g.P97[i] - pad);
            }
            return target;
        }

        /// <summary>The FairFace group of a sex, people and age (as tools/unity/people/gate/gate.py chooses it: the age band
        /// when it has the faces, else all ages), or null.</summary>
        public static ProportionsData.Faces2 FaceGroup(bool male, string cluster, double age)
        {
            var race = cluster switch
            {
                "west_african" or "east_african" => "black",
                "latin_american" or "indigenous_american" => "latino",
                "east_asian" => "east_asian",
                "southeast_asian" => "southeast_asian",
                "south_asian" => "indian",
                _ => "white",
            };
            var band = age < 30 ? "20-29" : age < 40 ? "30-39" : age < 50 ? "40-49" : age < 60 ? "50-59" : "60+";
            var sex = male ? "m" : "f";
            return ProportionsData.FaceGroups.TryGetValue($"{race}/{sex}/{band}", out var g) ? g
                : ProportionsData.FaceGroups.TryGetValue($"{race}/{sex}/all", out g) ? g : null;
        }

        /// <summary>The person's face proportions (the landmark ratios of tools/unity/people/gate/landmarks.py), drawn from
        /// the real faces of their group (its covariance, so the proportions vary together as real faces' do), inside the
        /// group's 5th-95th percentiles on each. The ratios in <paramref name="given"/> (by index) are held at their values (kept
        /// in range) and the rest drawn given them: the head's measures already set them.</summary>
        public static double[] Target2(ProportionsData.Faces2 g, uint seed, IReadOnlyDictionary<int, double> given = null)
        {
            var n = g.Mean.Length;
            double Pad(int i) => 0.1 * (g.P95[i] - g.P5[i]);
            var mu = (double[])g.Mean.Clone();
            var cov = new double[n, n];
            for (var i = 0; i < n; i++)
                for (var j = 0; j < n; j++) cov[i, j] = g.Cov[i * n + j];
            if (given != null)
                foreach (var kv in given)
                {
                    // the Gaussian given each held ratio in turn: its mean moved by the regression on it, its spread what is
                    // left (one at a time is the same as all at once)
                    var c = kv.Key;
                    var v = Math.Clamp(kv.Value, g.P5[c] + Pad(c), g.P95[c] - Pad(c));
                    var cc = cov[c, c];
                    if (cc < 1e-12) continue;
                    var col = new double[n];
                    for (var i = 0; i < n; i++) col[i] = cov[i, c];
                    var d = v - mu[c];
                    for (var i = 0; i < n; i++)
                    {
                        mu[i] += col[i] / cc * d;
                        for (var j = 0; j < n; j++) cov[i, j] -= col[i] * col[j] / cc;
                    }
                    mu[c] = v;
                }
            var L = Cholesky(cov);
            var rng = new Rng(seed ^ 0x9e3779b9u);
            var z = new double[n];
            for (var i = 0; i < n; i++) z[i] = Bodies.Normal(rng);
            double[] At(double a)
            {
                var t = new double[n];
                for (var i = 0; i < n; i++)
                {
                    t[i] = mu[i];
                    for (var j = 0; j <= i; j++) t[i] += a * L[i, j] * z[j];
                }
                return t;
            }
            bool Fits(double[] t)
            {
                for (var i = 0; i < n; i++)
                    if (t[i] < g.P5[i] + Pad(i) - 1e-9 || t[i] > g.P95[i] - Pad(i) + 1e-9) return false;
                return true;
            }
            if (Fits(At(1))) return At(1);
            double lo = 0, hi = 1;
            for (var k = 0; k < 14; k++)
            {
                var a = (lo + hi) / 2;
                if (Fits(At(a))) lo = a; else hi = a;
            }
            return At(lo);
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
        /// (<see cref="Target"/>) and their face its own drawn proportions (<see cref="Target2"/>), each shape kept near
        /// the archetype's value.</summary>
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

        /// <summary>How far a person's predicted measures and face proportions fall outside the real ranges of their group
        /// (ANSUR II's 3rd-97th percentiles, FairFace's 5th-95th), each in shares of its range, with room kept for the
        /// response model's error (its out-of-sample error on the people rendered: R2); 0 when everything is inside.</summary>
        public static double Miss(PlayerLook look, bool male, string cluster, double age)
        {
            var g = ProportionsData.Groups[Group(male, cluster)];
            var m = Predict(look, male);
            double miss = 0;
            void Add(double x, double lo, double hi, double pad)
            {
                var r = hi - lo;
                lo += pad * r; hi -= pad * r;
                if (x < lo) miss += (lo - x) / r; else if (x > hi) miss += (x - hi) / r;
            }
            for (var i = 0; i < K; i++)
                if (i != Stature) Add(m[i], g.P3[i], g.P97[i], ModelError[i]);
            var beyond = m[Stature] < g.P3[Stature] || m[Stature] > g.P97[Stature];
            var r3 = Ratios(m);
            for (var i = 0; i < r3.Length; i++)
                if (!(beyond && ProportionsData.Ratios[i].EndsWith("_stature"))) Add(r3[i], g.RatioP3[i], g.RatioP97[i], RatioModelError[i]);
            var m2 = Predict2(look, male);
            var f = FaceGroup(male, cluster, age);
            if (m2 != null && f != null)
                for (var i = 0; i < m2.Length; i++) Add(m2[i], f.P5[i], f.P95[i], 0.08);
            return miss;
        }

        // the room each measure keeps for the model's error, in shares of its range (the neck's girth is the least
        // predictable: about 17 mm against a 90 mm range; the face's proportions about a quarter of a real sd)
        private static readonly double[] ModelError = { 0.04, 0.04, 0.04, 0.1, 0.02, 0.2, 0, 0.06, 0.1 };
        private static readonly double[] RatioModelError = { 0.15, 0.08, 0.05, 0.04, 0.04, 0.08, 0.04, 0.08 };

        private static void FitOnce(PlayerLook look, bool male, string cluster, double age, uint seed, Dictionary<string, float> anchors)
        {
            var g = ProportionsData.Groups[Group(male, cluster)];
            var stature = StatureMm(look, male);
            var scale = Bodies.ScaleOf(look);
            var target = Target(male, cluster, stature, seed);
            var faces = (male ? ProportionsData.Neutral2_m : ProportionsData.Neutral2_f) != null ? FaceGroup(male, cluster, age) : null;
            var n2 = faces != null ? ProportionsData.Ratios2.Length : 0;
            var D = K + n2;

            // what the shapes the solver leaves give, and the free shapes' own response (3D in base mm, then 2D)
            var fixedShape = Looks.Shape(look);
            var free = new List<(string Id, double[] P, double[] Nn, double A, double Lo, double Hi)>();
            var starts = new List<double>();
            foreach (var id in Free)
            {
                var p = Response(id + "_p", male, n2 > 0);
                var n = Response(id + "_n", male, n2 > 0);
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
            var baseM = Base(fixedShape, male, n2 > 0);
            // the targets in the base's units (the measures over the stature's scale), each weighed by the group's spread
            var t = new double[D];
            var w = new double[D];
            for (var i = 0; i < K; i++)
            {
                if (i == Stature) continue;   // set by the scale, not by shapes
                t[i] = target[i] / scale;
                var sd = Math.Sqrt(g.Cov[i * K + i]) / scale;
                w[i] = 1 / (sd * sd);
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
            // the head and neck first; then the face's proportions, drawn given the height over width the head now has
            var head = Solve();
            if (n2 > 0)
            {
                // the face's height over width and the inner eye spacing over width follow from the head's measures
                var target2 = Target2(faces, seed, new Dictionary<int, double> { [0] = head[K], [2] = head[K + 2] });
                for (var i = 0; i < n2; i++)
                {
                    t[K + i] = target2[i];
                    w[K + i] = 1 / faces.Cov[i * n2 + i];
                }
                Solve();
            }
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
