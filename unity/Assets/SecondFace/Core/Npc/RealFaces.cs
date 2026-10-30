using System;
using System.Collections.Generic;
using System.Linq;

namespace SecondFace.Core.Npc
{
    /// <summary>
    /// Faces from real faces (R3, owner pass 10; docs/PEOPLE_REALISM.md §4.2): every adult's face is drawn from real faces of
    /// their people, sex and years (<see cref="FacesData"/>: FairFace's frontal faces at rest, each fitted in our sculptor's
    /// basis by tools/unity/people/gate/faces_fit.py), three of them blended, so the variety within a people is the real
    /// variety and no face is an invented rule. A person keeps which faces they came from (<see cref="PlayerLook.FaceSource"/>),
    /// so their portrait can be set beside them.
    /// </summary>
    public static class RealFaces
    {
        /// <summary>FairFace's races a people of ours is drawn from.</summary>
        public static string[] Races(string cluster) => cluster switch
        {
            "west_african" or "east_african" => new[] { "black" },
            "north_european" => new[] { "white" },
            "mediterranean" => new[] { "white", "middle_eastern" },
            "latin_american" or "indigenous_american" => new[] { "latino" },
            "east_asian" => new[] { "east_asian" },
            "southeast_asian" => new[] { "southeast_asian" },
            "south_asian" => new[] { "indian" },
            _ => new[] { "white" },
        };

        /// <summary>FairFace's age class for an age (3: 20-29 .. 8: 70+) and the class's middle.</summary>
        public static int AgeClass(double age) => age < 30 ? 3 : age < 40 ? 4 : age < 50 ? 5 : age < 60 ? 6 : age < 70 ? 7 : 8;
        public static double AgeOf(int cls) => cls switch { 3 => 25, 4 => 35, 5 => 45, 6 => 55, 7 => 65, _ => 75 };

        /// <summary>The real faces of a people and sex near some years: their own age class, widened a class at a time until
        /// there are <see cref="PoolSize"/> (wider pools blurred the years: old faces drawn from younger ones kept their lips
        /// and eyes, R3; the people of one place stay apart by blending three faces, <see cref="Pick"/>).</summary>
        public static List<FacesData.Real> Pool(bool male, string cluster, double age)
        {
            var sex = male ? "m" : "f";
            var all = Races(cluster).SelectMany(r => FacesData.Groups.TryGetValue($"{r}/{sex}", out var g) ? g : Array.Empty<FacesData.Real>()).ToList();
            var cls = AgeClass(age);
            for (var d = 0; d <= 5; d++)
            {
                var n = all.Where(f => Math.Abs(f.Age - cls) <= d).ToList();
                if (n.Count >= PoolSize) return n;
            }
            return all;
        }

        public const int PoolSize = 6;

        /// <summary>A blend of real faces: the faces and their weights (summing to one, none more than 0.6).</summary>
        public sealed class Mix
        {
            public FacesData.Real[] Faces;
            public double[] W;
            /// <summary>The weighted mean of the faces' age classes' middles.</summary>
            public double Years => Faces.Select((f, i) => W[i] * AgeOf(f.Age)).Sum();
        }

        /// <summary>Three real faces of the person's <see cref="Pool"/> blended (no one more than 0.6: two people sharing a face
        /// stay apart), whose blend (its difference from the pool's middle scaled by <paramref name="spread"/>) coheres with
        /// the real faces of their people and sex as the gate holds them (<see cref="Distance2"/>, <see cref="ShapeDistance"/>,
        /// each less <see cref="Proportions.Room2"/>; a few draws, the last kept); null where there are none.</summary>
        public static Mix Pick(Rng rng, bool male, string cluster, double age, double fullness = 0, double spread = 1)
        {
            var near = Pool(male, cluster, age);
            if (near.Count < 3) return null;
            var mean = Mean(near);
            // a face's fullness goes with the body's (facial adiposity follows BMI: Coetzee, Perrett and Stephen 2009): each real
            // face weighted by how likely its fullness is given the person's (in the pool's own sd), so the heavy draw the
            // full faces and the lean the hollow ones, and a muscled man is hardly ever gaunt (owner, pass 9)
            var kc = Array.IndexOf(FacesData.Sliders, "cheek-volume");
            var kf = Array.IndexOf(FacesData.Sliders, "head-fat");
            var fz = near.Select(f => (double)f.V[kc] + f.V[kf]).ToArray();
            var fm = fz.Average();
            var fs = Math.Sqrt(fz.Average(x => (x - fm) * (x - fm))) + 1e-6;
            const double rho = 0.6;
            var weights = fz.Select(x => Math.Exp(-Math.Pow((x - fm) / fs - rho * fullness, 2) / (2 * (1 - rho * rho)))).ToArray();
            var total = weights.Sum();
            FacesData.Real Draw(params FacesData.Real[] not)
            {
                for (var k = 0; k < 16; k++)
                {
                    var x = rng.Next() * total;
                    var f = near[near.Count - 1];
                    for (var i = 0; i < near.Count; i++) { x -= weights[i]; if (x <= 0) { f = near[i]; break; } }
                    if (Array.IndexOf(not, f) < 0) return f;
                }
                return near.First(f => Array.IndexOf(not, f) < 0);
            }
            Mix last = null;
            for (var tries = 0; tries < 12; tries++)
            {
                var a = Draw();
                var b = Draw(a);
                var c = Draw(a, b);
                var w1 = rng.Range(0.4, 0.6);
                var w2 = (1 - w1) * rng.Range(0.5, 0.75);
                last = new Mix { Faces = new[] { a, b, c }, W = new[] { w1, w2, 1 - w1 - w2 } };
                var r = Blend(last, f => f.R, mean.R, spread);
                var z = Blend(last, f => f.Z.Select(v => (double)v).ToArray(), mean.Z, spread);
                var (d2, lim2) = Distance2(r, male, cluster);
                var (ds, lims) = ShapeDistance(z, male, cluster);
                if (d2 <= lim2 - Proportions.Room2 && ds <= lims - Proportions.Room2) break;
            }
            return last;
        }

        /// <summary>How far a face's whole shape (its coordinates in its sex's whitened shape space, <see cref="FacesData.Real.Z"/>)
        /// lies from the real faces at rest of the person's people and sex, scaled by the spread within a people (the 2D gate's
        /// shape check, gate.py), and the distance real faces keep to.</summary>
        public static (double D, double Limit) ShapeDistance(double[] z, bool male, string cluster)
        {
            var sex = male ? "m" : "f";
            var pool = Races(cluster).SelectMany(x => FacesData.Groups.TryGetValue($"{x}/{sex}", out var g) ? g : Array.Empty<FacesData.Real>()).ToList();
            if (pool.Count == 0 || z == null) return (0, double.MaxValue);
            var mean = Mean(pool).Z;
            var sd = male ? FacesData.ShapeSd_m : FacesData.ShapeSd_f;
            double d2 = 0;
            for (var i = 0; i < z.Length && i < sd.Length; i++) { var e = (z[i] - mean[i]) / sd[i]; d2 += e * e; }
            return (Math.Sqrt(d2), male ? FacesData.LimShape_m : FacesData.LimShape_f);
        }

        /// <summary>Real faces' values blended with the real spread kept: each face's difference from its pool's mean, weighted,
        /// then scaled back to one face's spread (a plain mix lies nearer the middle than its faces: a 60/40 mix of two keeps 72 %
        /// of their spread, and people blended so came out alike, R3), then by <paramref name="spread"/>.</summary>
        public static double Blend(double[] values, double[] w, double mean, double spread = 1)
        {
            double d = 0, ww = 0;
            for (var i = 0; i < values.Length; i++) { d += w[i] * (values[i] - mean); ww += w[i] * w[i]; }
            return mean + d / Math.Sqrt(ww) * spread;
        }

        private static double[] Blend(Mix m, Func<FacesData.Real, double[]> of, double[] mean, double spread)
        {
            var xs = m.Faces.Select(of).ToArray();
            var r = new double[mean.Length];
            for (var i = 0; i < r.Length; i++) r[i] = Blend(xs.Select(x => x[i]).ToArray(), m.W, mean[i], spread);
            return r;
        }

        /// <summary>The blended slider values of a mix against its pool's mean (the sliders the real faces set and the rest
        /// alike: <see cref="FacesData.Sliders"/>' order).</summary>
        public static double[] Values(Mix m, double[] mean, double spread) => Blend(m, f => f.V.Select(v => (double)v).ToArray(), mean, spread);

        /// <summary>The mean slider values, ratios and shape of a pool.</summary>
        public static (double[] V, double[] R, double[] Z) Mean(List<FacesData.Real> pool)
        {
            var v = new double[FacesData.Sliders.Length];
            var r = new double[pool[0].R.Length];
            var z = new double[pool[0].Z.Length];
            foreach (var f in pool)
            {
                for (var k = 0; k < v.Length; k++) v[k] += f.V[k] / pool.Count;
                for (var k = 0; k < r.Length; k++) r[k] += f.R[k] / pool.Count;
                for (var k = 0; k < z.Length; k++) z[k] += f.Z[k] / pool.Count;
            }
            return (v, r, z);
        }

        /// <summary>A source as <see cref="PlayerLook.FaceSource"/> keeps it: "ff:A+B+C:wA,wB,wC:s" (the faces, their weights,
        /// the spread from the pool's middle).</summary>
        public static string Source(Mix m, double spread = 1) =>
            "ff:" + string.Join("+", m.Faces.Select(f => f.Id)) + ":" +
            string.Join(",", m.W.Select(w => w.ToString("0.000", System.Globalization.CultureInfo.InvariantCulture))) + ":" +
            spread.ToString("0.000", System.Globalization.CultureInfo.InvariantCulture);

        /// <summary>A source back as its mix and spread (also the two-face form "ff:A+B:w[:s]"), or null.</summary>
        public static (Mix Mix, double Spread)? Parse(string source)
        {
            if (string.IsNullOrEmpty(source) || !source.StartsWith("ff:")) return null;
            var inv = System.Globalization.CultureInfo.InvariantCulture;
            var parts = source.Substring(3).Split(':');
            if (parts.Length < 2) return null;
            var ids = parts[0].Split('+');
            var ws = parts[1].Split(',').Select(x => double.Parse(x, inv)).ToList();
            if (ids.Length == 2 && ws.Count == 1) ws.Add(1 - ws[0]);
            if (ws.Count != ids.Length) return null;
            var faces = new FacesData.Real[ids.Length];
            for (var i = 0; i < ids.Length; i++)
            {
                if (!int.TryParse(ids[i], out var id)) return null;
                foreach (var g in FacesData.Groups.Values)
                    foreach (var f in g) if (f.Id == id) faces[i] = f;
                if (faces[i] == null) return null;
            }
            return (new Mix { Faces = faces, W = ws.ToArray() }, parts.Length > 2 ? double.Parse(parts[2], inv) : 1);
        }

        /// <summary>The real faces' landmark ratios for a source (blended as the faces were, against the pool of the person's
        /// people, sex and years); null if it is not one.</summary>
        public static double[] Ratios(string source, bool male, string cluster, double age)
        {
            if (Parse(source) is not { } p) return null;
            return Blend(p.Mix, f => f.R, Mean(Pool(male, cluster, age)).R, p.Spread);
        }

        /// <summary>How far a face's proportions (<see cref="ProportionsData.Ratios2"/>' order) lie from the real faces at rest
        /// of the person's people and sex, whitened by the spread within a people (the 2D gate's proportions check, gate.py),
        /// and the distance real faces keep to.</summary>
        public static (double D, double Limit) Distance2(double[] r, bool male, string cluster)
        {
            var sex = male ? "m" : "f";
            var pool = Races(cluster).SelectMany(x => FacesData.Groups.TryGetValue($"{x}/{sex}", out var g) ? g : Array.Empty<FacesData.Real>()).ToList();
            var n = FacesData.Held.Length;
            if (pool.Count == 0 || r == null) return (0, double.MaxValue);
            var mean = Mean(pool).R;
            var c = male ? FacesData.Cov2_m : FacesData.Cov2_f;
            // the whitened difference by forward substitution on the covariance's Cholesky factor
            var L = new double[n, n];
            for (var i = 0; i < n; i++)
                for (var j = 0; j <= i; j++)
                {
                    var sum = c[i * n + j];
                    for (var k = 0; k < j; k++) sum -= L[i, k] * L[j, k];
                    L[i, j] = i == j ? Math.Sqrt(Math.Max(sum, 1e-12)) : sum / L[j, j];
                }
            var z = new double[n];
            double d2 = 0;
            for (var i = 0; i < n; i++)
            {
                var e = r[FacesData.Held[i]] - mean[FacesData.Held[i]];
                for (var k = 0; k < i; k++) e -= L[i, k] * z[k];
                z[i] = e / L[i, i];
                d2 += z[i] * z[i];
            }
            return (Math.Sqrt(d2), male ? FacesData.Lim2_m : FacesData.Lim2_f);
        }

        /// <summary>A slider's range over the real faces of a sex (its 2nd-98th percentiles, a little wider; always holding 0),
        /// or null for a slider the real faces do not set. It replaces the hand-written ranges (R3: those made women's eyes
        /// too large, their brows too high, their chins too narrow and their lower lips too full for most real women).</summary>
        public static (float Lo, float Hi)? Range(string id, bool male)
        {
            var k = Array.IndexOf(FacesData.Sliders, id);
            if (k < 0 || Array.IndexOf(FacesData.Set, id) < 0) return null;
            var lo = male ? FacesData.Lo_m[k] : FacesData.Lo_f[k];
            var hi = male ? FacesData.Hi_m[k] : FacesData.Hi_f[k];
            return (Math.Min(lo, 0f), Math.Max(hi, 0f));
        }
    }
}
