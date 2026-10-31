using System;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core;
using SecondFace.Core.Npc;

namespace SecondFace.Tests
{
    /// <summary>
    /// Faces from archetypes (owner, pass 9) and from real faces (owner, pass 10; R3): features in coherent bundles by
    /// ancestry, sex, build and age, never a patchwork of independent sliders. The owner's own examples are the tests: a
    /// woman's big jaw, a muscular man's gaunt face, a black man's very thin lips and an Asian woman's blue eyes are each
    /// unlikely. The sliders a frontal face shows come from real faces fitted on each sex's own base (FacesData), so their
    /// values mean different things on a man's base and a woman's; what those set is held where it shows, in the faces'
    /// measured proportions against the real faces' (the response model's prediction, Proportions.Predict2).
    /// </summary>
    public class FacesTests
    {
        private static List<Faces.Face> Draw(string cluster, bool male, int n, double age = 25, double build = 0, double muscle = 0, uint seed = 11)
        {
            var rng = new Rng(seed);
            return Enumerable.Range(0, n).Select(_ => Faces.Draw(rng, new Faces.Who { Male = male, Cluster = cluster, Age = age, Build = build, Muscle = muscle })).ToList();
        }

        private static double Mean(IEnumerable<Faces.Face> faces, string id) => faces.Average(f => f.Values[id]);

        // the peoples (one of each pair that share their real faces)
        private static readonly string[] Peoples = { "north_european", "mediterranean", "west_african", "east_asian", "southeast_asian", "south_asian", "latin_american" };

        private static int R(string ratio) => Array.IndexOf(ProportionsData.Ratios2, ratio);

        private static FacesData.Real[] RealOf(string cluster, bool male, Func<FacesData.Real, bool> where = null) =>
            RealFaces.Races(cluster).SelectMany(r => FacesData.Groups.TryGetValue($"{r}/{(male ? "m" : "f")}", out var g) ? g : Array.Empty<FacesData.Real>())
                .Where(where ?? (_ => true)).ToArray();

        /// <summary>A ratio's spread within a people and sex among the real faces, pooled.</summary>
        private static double RealSd(int k)
        {
            double ss = 0; var n = 0;
            foreach (var g in FacesData.Groups.Values)
            {
                var m = g.Average(f => f.R[k]);
                ss += g.Sum(f => (f.R[k] - m) * (f.R[k] - m)); n += g.Length - 1;
            }
            return Math.Sqrt(ss / n);
        }

        /// <summary>Our people's measured face proportions (each a whole person, as Bodies makes them), at an age, or at the
        /// real faces' own mix of ages (FairFace's age classes are small: a people's faces of one class are a noisy sample
        /// of the people).</summary>
        private static List<double[]> Measured(string cluster, bool male, int n, double age = double.NaN)
        {
            var real = RealOf(cluster, male);
            return Enumerable.Range(0, n).Select(i =>
            {
                var a = double.IsNaN(age) ? RealFaces.AgeOf(real[i * 7 % real.Length].Age) - 4 + i % 9 : age;
                return Proportions.Predict2(Bodies.For($"npc_meas_{cluster}_{(male ? "m" : "f")}_{age:F0}_{i}", male, a, "settler", ancestry: cluster), male);
            }).ToList();
        }

        /// <summary>A difference of means averaged over pairs of samples, and its standard error.</summary>
        private static (double Gap, double Se) Gap(IEnumerable<(IReadOnlyCollection<double> A, IReadOnlyCollection<double> B)> pairs)
        {
            double gap = 0, var = 0; var n = 0;
            foreach (var (a, b) in pairs)
            {
                double V(IReadOnlyCollection<double> x) { var m = x.Average(); return x.Sum(v => (v - m) * (v - m)) / (x.Count - 1) / x.Count; }
                gap += a.Average() - b.Average(); var += V(a) + V(b); n++;
            }
            return (gap / n, Math.Sqrt(var) / n);
        }

        /// <summary>That a difference between two kinds of people in ours is the real faces' difference within the sampling
        /// error of both (FairFace's groups are small), for every difference the real faces establish (twice its error). Three
        /// standard errors: a test makes about two dozen such comparisons, and at 2.5 a generator drawing exactly as real
        /// people are would fail one of them a quarter of the time (three keeps it to 5 %).</summary>
        private static void AsReal((double Gap, double Se) ours, (double Gap, double Se) real, double sd, string what)
        {
            if (Math.Abs(real.Gap) < 2 * real.Se) return;
            var tol = 3.0 * Math.Sqrt(real.Se * real.Se + ours.Se * ours.Se);
            var say = $"{what}: ours {ours.Gap / sd:F2} sd against real {real.Gap / sd:F2} (within {tol / sd:F2})";
            Assert.That(Math.Abs(ours.Gap - real.Gap), Is.LessThanOrEqualTo(tol), say);
            // the same way round, where either gap is clearly more than nothing (overhaul O2: a real gap of 0.16 sd and ours of
            // -0.03, both inside the tolerance of none, are the same finding)
            if (Math.Abs(ours.Gap) > tol || Math.Abs(real.Gap) > tol)
                Assert.That(Math.Sign(ours.Gap), Is.EqualTo(Math.Sign(real.Gap)), say);
        }

        private static List<double> Col(IEnumerable<double[]> xs, int k) => xs.Select(x => x[k]).ToList();
        private static List<double> Col(IEnumerable<FacesData.Real> fs, int k) => fs.Select(f => f.R[k]).ToList();

        [Test]
        public void EveryFaceCarriesEverySliderWithinItsSexsRange()
        {
            foreach (var male in new[] { false, true })
            foreach (var (cluster, _) in Bodies.Clusters)
            foreach (var f in Draw(cluster, male, 60))
            {
                Assert.That(f.Values.Keys, Is.EquivalentTo(Sculpt.Sliders.Select(s => s.Id)));
                foreach (var s in Sculpt.Sliders.Where(x => x.Paired))
                {
                    var (lo, hi) = Sculpt.Range(s.Id, male);
                    Assert.That(f.Values[s.Id], Is.InRange(lo - 1e-3f, hi + 1e-3f), $"{cluster} {(male ? "m" : "f")} {s.Id}");
                }
                Assert.That(Faces.Types, Does.Contain(f.Type));
            }
        }

        [Test]
        public void AWomansFaceIsAWomansAndAMansAMans()
        {
            // across the peoples, men's and women's measured proportions differ as real faces' do (the jaw, the eyes, the
            // brows' height, the lips, the lower face: R3); per people FairFace has too few faces at rest (34-91) to hold
            // each people's own difference
            var men = Peoples.ToDictionary(c => c, c => Measured(c, true, 60));
            var women = Peoples.ToDictionary(c => c, c => Measured(c, false, 60));
            for (var k = 0; k < ProportionsData.Ratios2.Length; k++)
            {
                var real = Gap(Peoples.Select(c => ((IReadOnlyCollection<double>)Col(RealOf(c, true), k), (IReadOnlyCollection<double>)Col(RealOf(c, false), k))));
                var ours = Gap(Peoples.Select(c => ((IReadOnlyCollection<double>)Col(men[c], k), (IReadOnlyCollection<double>)Col(women[c], k))));
                AsReal(ours, real, RealSd(k), $"men less women, {ProportionsData.Ratios2[k]}");
            }
            // the owner's example: a woman's big jaw is unlikely; no more of ours past the real women's 97.5th percentile than
            // real women
            var jaw = R("jaw_face");
            var past = Peoples.Sum(c =>
            {
                var real = RealOf(c, false).Select(f => f.R[jaw]).OrderBy(x => x).ToArray();
                var p975 = real[(int)(0.975 * (real.Length - 1))];
                return women[c].Count(x => x[jaw] > p975);
            });
            Assert.That(past, Is.LessThanOrEqualTo(0.05 * Peoples.Length * 60), "women with a jaw past real women's");
            // and what a frontal face does not show keeps the archetypes' rules: the brow ridge, the upper lip
            foreach (var (cluster, _) in Bodies.Clusters)
            {
                var w = Draw(cluster, false, 200);
                var m = Draw(cluster, true, 200);
                Assert.That(w.All(f => f.Values["brow-ridge"] <= 0.15f), Is.True, $"no brow ridge on a woman ({cluster})");
                // (inside the structure's natural range, ±0.35: O1)
                Assert.That(Mean(m, "brow-ridge") - Mean(w, "brow-ridge"), Is.GreaterThan(0.3), cluster);
                // (a woman's fuller lips are her base's own, measured above as real faces' lips_face: the bases' gap alone a
                // real sd and a half, so the sliders take some of it back, O3)
            }
        }

        [Test]
        public void PeoplesDifferAsTheyDoInLife()
        {
            foreach (var male in new[] { false, true })
            {
                var west = Draw("west_african", male, 300);
                var north = Draw("north_european", male, 300);
                var east = Draw("east_asian", male, 300);
                // the sliders a frontal face does not show: flared noses, low and projecting, full lips carried forward
                // (the frontal ones at the size the archetypes keep since their calibration to real faces' measured gaps,
                // overhaul O2: written by hand at 0.6, west African noses measured 2.5 real sds wider than north Europeans'
                // and lips 2.7 fuller, where real faces differ by 0.5 and 1.4; the bases' own ancestry shapes carry most of
                // it, body-african alone a lips' gap of a real sd)
                Assert.That(Mean(west, "nose-flaring") - Mean(north, "nose-flaring"), Is.GreaterThan(0.1));   // (the calibration, twice: O2)
                Assert.That(Mean(north, "nose-scale-depth") - Mean(west, "nose-scale-depth"), Is.GreaterThan(0.6));
                Assert.That(Mean(west, "mouth-upperlip-volume") - Mean(north, "mouth-upperlip-volume"), Is.GreaterThan(0.2));
                Assert.That(Mean(west, "mouth-trans") - Mean(north, "mouth-trans"), Is.GreaterThan(0.5));
                // a low crease and a low bridge
                Assert.That(Mean(north, "eye-eyefold") - Mean(east, "eye-eyefold"), Is.GreaterThan(0.4));
                Assert.That(Mean(north, "nose-scale-depth") - Mean(east, "nose-scale-depth"), Is.GreaterThan(0.7));
                // (inside the structure's natural range, ±0.35, O1, and a woman's brow ridge only ever slight)
                Assert.That(Mean(north, "brow-ridge") - Mean(east, "brow-ridge"), Is.GreaterThan(male ? 0.3 : 0.2));
                // and within a people, the spread is small next to the gaps between peoples
                var spread = Math.Sqrt(west.Average(f => Math.Pow(f.Values["mouth-upperlip-volume"] - Mean(west, "mouth-upperlip-volume"), 2)));
                Assert.That(spread, Is.LessThan(0.25), "a people's own spread");
                // what a frontal face shows (a broad nose, the lips' height, the eyes' spacing and size, the lower face) as
                // real faces of the peoples differ in it
                foreach (var (a, b) in new[] { ("west_african", "north_european"), ("east_asian", "north_european") })
                {
                    var ma = Measured(a, male, 80);
                    var mb = Measured(b, male, 80);
                    foreach (var r in new[] { "nose_icd", "lips_face", "icd_face", "eye_face", "lower_face", "jaw_face" })
                    {
                        var k = R(r);
                        AsReal(Gap(new[] { ((IReadOnlyCollection<double>)Col(ma, k), (IReadOnlyCollection<double>)Col(mb, k)) }),
                            Gap(new[] { ((IReadOnlyCollection<double>)Col(RealOf(a, male), k), (IReadOnlyCollection<double>)Col(RealOf(b, male), k)) }),
                            RealSd(k), $"{a} less {b} ({(male ? "m" : "f")}), {r}");
                    }
                }
            }
            // the owner's example: a black man with very thin lips is unlikely (as the lips are measured: the base's own
            // ancestry shape gives a west African man's lips a real sd of fullness, so his slider may sit under nought, O3)
            var lips = R("lips_face");
            var thin = RealOf("west_african", true).Select(f => f.R[lips]).OrderBy(x => x).ToArray()[0];
            Assert.That(Measured("west_african", true, 200).Count(x => x[lips] < thin), Is.LessThan(10), "lips thinner than any real west African man's");
        }

        [Test]
        public void AMuscledManIsNeverGauntAndAHeavyFaceIsFull()
        {
            foreach (var (cluster, _) in Bodies.Clusters)
            {
                // gaunt: cheeks and temples sunken together (a narrow forehead alone is the head's shape: 13 % of real white men's
                // faces fit so, FacesData)
                bool Gaunt(Faces.Face f) => f.Values["cheek-volume"] < -0.25f && f.Values["forehead-temple"] < -0.3f;
                var strong = Draw(cluster, true, 200, build: -0.3, muscle: 0.7);
                Assert.That(strong.Count(Gaunt), Is.LessThan(10), $"a muscled man's face is hardly ever gaunt: fewer than one in twenty ({cluster})");
                Assert.That(Draw(cluster, true, 200, build: -0.9, muscle: -0.4).Count(Gaunt), Is.GreaterThan(3 * strong.Count(Gaunt) + 10), $"the hungry and lean are ({cluster})");
                var lean = Draw(cluster, true, 200, build: -0.9, muscle: -0.4);
                Assert.That(Mean(lean, "cheek-volume"), Is.LessThan(Mean(strong, "cheek-volume") - 0.2), "the hungry and lean are the hollow-cheeked");
                // a heavy face is full (the real faces drawn for the body's fullness, and its build laid on them); the neck's
                // girth with the body's mass is the head's measures' (ProportionsTests.AHeavyOrMuscledBodyHasAThickerNeck)
                var heavy = Draw(cluster, false, 200, build: 0.9);
                var thin = Draw(cluster, false, 200, build: -0.9);
                // (the head's fullness inside its natural range, ±0.35: past it faces bloat, O1)
                Assert.That(Mean(heavy, "head-fat") - Mean(thin, "head-fat"), Is.GreaterThan(0.45), cluster);
                Assert.That(Mean(heavy, "cheek-volume") - Mean(thin, "cheek-volume"), Is.GreaterThan(0.4), cluster);
                Assert.That(Mean(heavy, "neck-double"), Is.GreaterThan(0.15));
            }
        }

        [Test]
        public void FacesShowTheirYearsAndAHardLifeSooner()
        {
            // what a frontal face does not show, by the archetypes' rules
            var young = Draw("mediterranean", false, 200, age: 22);
            var old = Draw("mediterranean", false, 200, age: 62);
            Assert.That(Mean(old, "eye-bag") - Mean(young, "eye-bag"), Is.GreaterThan(0.45));
            // (the lips' thinning as the photographs measure it is held below, lips_face; the slider's own share of it, with the
            // real faces' share on top since O2, at least a quarter)
            Assert.That(Mean(young, "mouth-upperlip-volume") - Mean(old, "mouth-upperlip-volume"), Is.GreaterThan(0.25), "lips thin");
            Assert.That(Mean(old, "mouth-laugh-lines") - Mean(young, "mouth-laugh-lines"), Is.GreaterThan(0.5));
            // what it shows, as the real faces of the years: the lips thinner and the eyes smaller with age (across peoples
            // and sexes: FairFace's age classes are small)
            var who = new[] { "north_european", "mediterranean", "east_asian", "south_asian" }.SelectMany(c => new[] { (c, false), (c, true) }).ToList();
            var olds = who.ToDictionary(w => w, w => Measured(w.Item1, w.Item2, 40, 64));
            var youngs = who.ToDictionary(w => w, w => Measured(w.Item1, w.Item2, 40, 24));
            foreach (var r in new[] { "lips_face", "eye_face" })
            {
                var k = R(r);
                var real = Gap(who.Select(w => ((IReadOnlyCollection<double>)Col(RealOf(w.Item1, w.Item2, f => f.Age >= 7), k), (IReadOnlyCollection<double>)Col(RealOf(w.Item1, w.Item2, f => f.Age <= 3), k))));
                var ours = Gap(who.Select(w => ((IReadOnlyCollection<double>)Col(olds[w], k), (IReadOnlyCollection<double>)Col(youngs[w], k))));
                AsReal(ours, real, RealSd(k), $"old less young, {r}");
            }
            Assert.That(Faces.Apparent(40, 1), Is.GreaterThan(Faces.Apparent(40, 0) + 5), "a hard life shows");
            Assert.That(Faces.Apparent(40, -0.3), Is.LessThan(40), "a sheltered one less");
        }

        [Test]
        public void TheStrikingAreCloserToTheirPeoplesFace()
        {
            var rng = new Rng(5);
            var plain = new List<Faces.Face>();
            var striking = new List<Faces.Face>();
            for (var i = 0; i < 300; i++)
            {
                plain.Add(Faces.Draw(rng, new Faces.Who { Male = false, Cluster = "south_asian", Attractive = 0.1 }, "oval"));
                striking.Add(Faces.Draw(rng, new Faces.Who { Male = false, Cluster = "south_asian", Attractive = 0.95 }, "oval"));
            }
            double Spread(List<Faces.Face> fs) => Sculpt.Sliders.Where(s => s.Paired).Average(s =>
            {
                var m = fs.Average(f => f.Values[s.Id]);
                return fs.Average(f => Math.Abs(f.Values[s.Id] - m));
            });
            Assert.That(Spread(striking), Is.LessThan(Spread(plain) * 0.75), "an average face is a handsome one");
            Assert.That(Mean(striking, "eye-scale"), Is.GreaterThan(Mean(plain, "eye-scale")));
        }

        [Test]
        public void TwoPeoplesBlendAndTheStructureFollowsSexAndPeople()
        {
            var rng = new Rng(9);
            var mixed = Enumerable.Range(0, 300).Select(_ => Faces.Draw(rng, new Faces.Who { Male = false, Cluster = "west_african", Second = "east_asian", Share = 0.5 })).ToList();
            var west = Draw("west_african", false, 300);
            var east = Draw("east_asian", false, 300);
            var m = Mean(mixed, "nose-scale-depth");
            Assert.That(m, Is.InRange(Math.Min(Mean(west, "nose-scale-depth"), Mean(east, "nose-scale-depth")), Math.Max(Mean(west, "nose-scale-depth"), Mean(east, "nose-scale-depth"))));
            var women = Draw("east_african", false, 600);
            var men = Draw("east_african", true, 600);
            Assert.That(women.Count(f => f.Type == "heart"), Is.GreaterThan(men.Count(f => f.Type == "heart") * 2));
            Assert.That(women.Count(f => f.Type == "long"), Is.GreaterThan(women.Count / 4), "long faces among the east African");
            Assert.That(Draw("north_european", true, 400).Count(f => f.Type == "long"), Is.GreaterThan(Draw("southeast_asian", true, 400).Count(f => f.Type == "long")));
        }

        [Test]
        public void ThePeopleOfTheReachAreBuiltFromTheirArchetypes()
        {
            // the owner's example: an Asian woman with blue eyes is unlikely (light eyes are recessive, rare where they are)
            var asian = Enumerable.Range(0, 600).Select(i => Bodies.For("npc_t_ea_" + i, false, 30, "settler", ancestry: "east_asian")).ToList();
            Assert.That(asian.Count(l => l.Eyes == "blue" || l.Eyes == "grey" || l.Eyes == "green" || l.Eyes == "blue_grey"), Is.LessThan(12));
            Assert.That(asian.All(l => l.Heritage == "east_asian"), Is.True);
            var north = Enumerable.Range(0, 300).Select(i => Bodies.For("npc_t_ne_" + i, true, 30, "settler", ancestry: "north_european")).ToList();
            var west = Enumerable.Range(0, 300).Select(i => Bodies.For("npc_t_wa_" + i, true, 30, "settler", ancestry: "west_african")).ToList();
            Assert.That(west.Average(l => l.Face["nose-flaring"]) - north.Average(l => l.Face["nose-flaring"]), Is.GreaterThan(0.1));   // (calibrated, O2)
            // a labourer's face older than a rich merchant's of the same years
            var hard = Enumerable.Range(0, 200).Select(i => Bodies.For("npc_t_h_" + i, true, 45, "labourer", Bodies.Means.Destitute)).ToList();
            var soft = Enumerable.Range(0, 200).Select(i => Bodies.For("npc_t_s_" + i, true, 45, "trader", Bodies.Means.Rich)).ToList();
            Assert.That(hard.Average(l => l.Shape["body-age"]), Is.GreaterThan(soft.Average(l => l.Shape["body-age"]) + 0.15));
            Assert.That(hard.Average(l => l.Face["eye-bag"]), Is.GreaterThan(soft.Average(l => l.Face["eye-bag"]) + 0.1));
        }

        [Test]
        public void AnotherFaceIsSomeoneElseOfTheSamePeople()
        {
            var c = new Core.Stats.Creation();
            var rng = new Rng(21);
            c.Heritage("south_asian", rng);
            Assert.That(c.Look.Heritage, Is.EqualTo("south_asian"));
            Assert.That(c.Look.Shape["body-caucasian"], Is.EqualTo(0.6f).Within(1e-4));
            for (var i = 0; i < 20; i++)
            {
                var before = new Dictionary<string, float>(c.Look.Face);
                c.NewFace(rng, before);
                Assert.That(Sculpt.Distance(before, c.Look.Face), Is.GreaterThanOrEqualTo(Faces.RedrawDistance));
            }
        }
    }
}
