using System;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Combat;

namespace SecondFace.Tests
{
    /// <summary>
    /// The AI-vs-AI harness (COMBAT.md D, tests): seeded fights on synthetic fields (open ground, cover lines, a height,
    /// a corridor, a yard with fuel and water) between the player's side and each archetype, at each difficulty, both sides
    /// played by the AI. Asserts the hard rules on every step and turn (never through or onto its own, never into a hazard,
    /// never ending in the open with cover in reach, never a wasted turn), that every fight ends, the archetypes' different
    /// ways, win rates in order by difficulty, and the time a decision takes.
    /// </summary>
    public class CombatHarnessTests
    {
        [SetUp] public void Load() { ContentFixture.Db(); Arena.Kit(); }
        [TearDown] public void Clean() => Arena.Forget("w_smoke_t", "w_flash_t");

        private static readonly string[] Kinds = { Archetypes.Raider, Archetypes.Warden, Archetypes.Machine, Archetypes.Animal };

        private sealed class Tally
        {
            public int Fights, HostileWins, Unended;
            public readonly Dictionary<string, int> UnendedBy = new();
            public readonly List<double> Ms = new();
            public readonly Arena.Stats All = new();
            public readonly List<string> Breaches = new();
            public int ThroughAlly, OntoAllies, IntoHazard, EndedExposed, Wasted;
            public void Take(Arena.Stats s)
            {
                Fights++;
                if (s.Outcome == "defeat") HostileWins++;
                if (s.Outcome == "truce") { Unended++; UnendedBy[Arena.Context.Split(' ')[0] + "/" + Arena.Context.Split(' ')[1]] = UnendedBy.TryGetValue(Arena.Context.Split(' ')[0] + "/" + Arena.Context.Split(' ')[1], out var n) ? n + 1 : 1; }
                Ms.AddRange(s.DecisionMs);
                ThroughAlly += s.ThroughAlly; OntoAllies += s.OntoAllies; IntoHazard += s.IntoHazard; EndedExposed += s.EndedExposed; Wasted += s.Wasted;
                if (Breaches.Count < 30) Breaches.AddRange(s.Breaches.Take(30 - Breaches.Count));
                foreach (var (arch, d) in s.By) foreach (var (k, v) in d) All.Add(arch, k, v);
            }
            public double Rate(string arch, string key) => All.Get(arch, key) / Math.Max(1, All.Get(arch, "turns"));
            public double Dist(string arch) => All.Get(arch, "dist_sum") / Math.Max(1, All.Get(arch, "dist_n"));
            /// <summary>The mean distance to the nearest enemy at the end of turns in the first three rounds (the approach).</summary>
            public double Early(string arch) => All.Get(arch, "early_sum") / Math.Max(1, All.Get(arch, "early_n"));
        }

        private static Arena.Stats Fight(string field, string kind, uint seed, string difficulty, Action<Battle, BattleUnit> script = null)
        {
            Arena.Context = $"{field} {kind} {difficulty} {seed}";
            var g = Arena.Field(field);
            var b = Arena.New(g, seed, difficulty);
            var units = Arena.Party().Concat(Arena.Squad(kind)).ToList();
            if (field == "yard")
            {
                b.Props.Add(new BattleProp { Id = "drum1", Kind = "fuel", X = 20.5, Z = 10.5 });
                b.Props.Add(new BattleProp { Id = "drum2", Kind = "chem", X = 20.5, Z = 19.5 });
                b.Surfaces.Spill("oil", 14.5, 14.5, 1.5);
            }
            b.Start(units);
            return Arena.Play(b, 40, script);
        }

        private static Tally Run(IEnumerable<string> fields, IEnumerable<string> kinds, IEnumerable<string> diffs, uint seeds, uint seed0 = 1)
        {
            var t = new Tally();
            foreach (var f in fields) foreach (var k in kinds) foreach (var d in diffs)
                for (var s = seed0; s < seed0 + seeds; s++) t.Take(Fight(f, k, s, d));
            return t;
        }

        private static string Report(Tally t)
        {
            var ms = t.Ms.OrderBy(x => x).ToList();
            var p = ms.Count == 0 ? 0 : ms[(int)(ms.Count * 0.99)];
            var lines = new List<string> { $"{t.Fights} fights, {ms.Count} decisions: mean {ms.DefaultIfEmpty().Average():0.00} ms, p99 {p:0.0} ms, max {ms.DefaultIfEmpty().Max():0.0} ms; hostile wins {t.HostileWins}, unended {t.Unended} ({string.Join(", ", t.UnendedBy.Select(kv => kv.Key + " " + kv.Value))})" };
            foreach (var a in t.All.By.Keys.OrderBy(x => x))
                lines.Add($"  {a}: turns {t.All.Get(a, "turns")}, hold {(t.Rate(a, "overwatch") + t.Rate(a, "cover")):0.00}/turn, suppress {t.Rate(a, "suppress"):0.00}, throw {t.Rate(a, "throw"):0.00}, stance {t.Rate(a, "stance"):0.00}, flee {t.All.Get(a, "flee")}, surrender {t.All.Get(a, "surrender")}, capture {t.All.Get(a, "capture")}, shout {t.All.Get(a, "shout")}, dist {t.Dist(a):0.0} m (early {t.Early(a):0.0}), safe ends {t.Rate(a, "safe_ends"):0.00}, flank {t.All.Get(a, "flank_shots") / Math.Max(1, t.All.Get(a, "shots")):0.00}, focus {t.All.Get(a, "focus_shots") / Math.Max(1, t.All.Get(a, "shots")):0.00}");
            return string.Join("\n", lines);
        }

        private static void Never(Tally t)
        {
            var msg = string.Join("\n", t.Breaches);
            Assert.That(t.ThroughAlly, Is.Zero, "shot through an ally\n" + msg);
            Assert.That(t.OntoAllies, Is.Zero, "threw onto allies\n" + msg);
            Assert.That(t.IntoHazard, Is.Zero, "walked into a hazard\n" + msg);
            Assert.That(t.EndedExposed, Is.Zero, "ended in the open with cover in reach\n" + msg);
            Assert.That(t.Wasted, Is.Zero, "wasted turns\n" + msg);
        }

        [Test]
        public void EveryFieldEveryArchetypeKeepsTheHardRulesAndEnds()
        {
            var t = Run(Arena.Fields, Kinds, new[] { "normal" }, 4);
            TestContext.WriteLine(Report(t));
            Never(t);
            Assert.That(t.Unended, Is.LessThanOrEqualTo(t.Fights / 20), "fights that never ended");
        }

        [Test]
        public void ArchetypesFightTheirOwnWays()
        {
            var t = Run(new[] { "cover", "height", "yard" }, Kinds, new[] { "normal" }, 8, 100);
            TestContext.WriteLine(Report(t));
            // wardens by the book: they hold, suppress and demand more than raiders; raiders close in; machines and animals
            // never give up; animals use no tools
            var hold = new Func<string, double>(a => t.Rate(a, "overwatch") + t.Rate(a, "cover") + t.Rate(a, "suppress"));
            Assert.That(hold(Archetypes.Warden), Is.GreaterThan(hold(Archetypes.Raider) * 1.3), "wardens hold and suppress more");
            Assert.That(t.All.Get(Archetypes.Warden, "shout"), Is.GreaterThan(0), "wardens demand a surrender");
            Assert.That(t.All.Get(Archetypes.Raider, "shout"), Is.Zero);
            Assert.That(t.Early(Archetypes.Raider), Is.LessThan(t.Early(Archetypes.Warden)), "raiders close in");
            Assert.That(t.Early(Archetypes.Animal), Is.LessThan(t.Early(Archetypes.Warden)), "animals close in");
            foreach (var a in new[] { "flee", "surrender" }) Assert.That(t.All.Get(Archetypes.Machine, a), Is.Zero, "machines never " + a);
            foreach (var k in new[] { "overwatch", "cover", "suppress", "throw", "stance", "reload" }) Assert.That(t.All.Get(Archetypes.Animal, k), Is.Zero, "animals never " + k);
            Assert.That(t.Rate(Archetypes.Warden, "safe_ends"), Is.GreaterThan(t.Rate(Archetypes.Raider, "safe_ends")), "wardens keep to cover");
        }

        [Test]
        public void RaidersBreakWhenTheirLeaderFallsAndWardensHold()
        {
            int raidersRan = 0, wardensRan = 0, n = 24;
            for (uint s = 1; s <= n; s++)
            {
                foreach (var kind in new[] { Archetypes.Raider, Archetypes.Warden })
                {
                    var killed = false; var broke = false;
                    Fight("cover", kind, s, "normal", (b, u) =>
                    {
                        if (!killed)
                        {
                            killed = true;
                            b.Down(b.Units.First(x => x.Leader), b.Player);
                            foreach (var x in b.Units.Where(x => x.Hostile && x.Alive)) x.C.Sheet.Hp = Math.Max(1, x.C.Sheet.Hp * 2 / 3);
                        }
                        // (in the two rounds after it)
                        if (b.Round <= 2 && b.Units.Any(x => x.Hostile && (x.Fleeing || x.Surrendered || (x.Fled && x.Alive)))) broke = true;
                    });
                    if (kind == Archetypes.Raider) raidersRan += broke ? 1 : 0; else wardensRan += broke ? 1 : 0;
                }
            }
            TestContext.WriteLine($"leader down: raiders broke in {raidersRan}/{n} fights, wardens in {wardensRan}/{n}");
            Assert.That(raidersRan, Is.GreaterThan(wardensRan), "raiders break by nerve when their leader falls");
            Assert.That(raidersRan, Is.GreaterThanOrEqualTo(n / 3));
        }

        [Test]
        public void HarderDifficultyWinsMoreAndPlaysSharper()
        {
            var rates = new Dictionary<string, double>();
            var tallies = new Dictionary<string, Tally>();
            foreach (var d in new[] { "story", "normal", "hard" })
            {
                var t = Run(new[] { "cover", "height", "open" }, new[] { Archetypes.Raider, Archetypes.Warden }, new[] { d }, 14, 300);
                tallies[d] = t;
                rates[d] = t.HostileWins / (double)t.Fights;
                TestContext.WriteLine($"{d}: hostile win rate {rates[d]:0.00}\n" + Report(t));
            }
            foreach (var t in tallies.Values) Never(t);
            Assert.That(rates["story"], Is.LessThan(rates["normal"]), "story is easier than normal");
            Assert.That(rates["normal"], Is.LessThan(rates["hard"]), "hard is harder than normal");
            Assert.That(rates["story"], Is.LessThan(0.35), "the story difficulty is a story");
            Assert.That(rates["hard"], Is.GreaterThan(0.3), "hard bites");
            // behaviour, not only numbers: hard focuses its fire more than story
            double Focus(Tally t) => (t.All.Get(Archetypes.Raider, "focus_shots") + t.All.Get(Archetypes.Warden, "focus_shots")) / Math.Max(1, t.All.Get(Archetypes.Raider, "shots") + t.All.Get(Archetypes.Warden, "shots"));
            Assert.That(Focus(tallies["hard"]), Is.GreaterThan(Focus(tallies["story"])), "hard focuses its fire");
        }

        [Test]
        public void ADecisionIsQuick()
        {
            // (warmed up first; a phone is several times slower than this machine: the budget there is 150 ms)
            Fight("cover", Archetypes.Raider, 1, "normal");
            var t = Run(new[] { "cover", "yard" }, Kinds, new[] { "hard" }, 3, 700);
            var ms = t.Ms.OrderBy(x => x).ToList();
            var mean = ms.Average(); var p99 = ms[(int)(ms.Count * 0.99)];
            TestContext.WriteLine($"{ms.Count} decisions: mean {mean:0.00} ms, p99 {p99:0.0} ms, max {ms.Max():0.0} ms");
            Assert.That(mean, Is.LessThan(6), "mean decision time");
            Assert.That(p99, Is.LessThan(30), "p99 decision time");
        }

        [Test, Category("Heavy")]
        public void ThousandsOfFightsKeepTheHardRules()
        {
            // (dotnet's runner here cannot filter by category: SF_SKIP_HEAVY=1 skips it for quick local runs)
            if (Environment.GetEnvironmentVariable("SF_SKIP_HEAVY") == "1") Assert.Ignore("heavy");
            var t = Run(Arena.Fields, Kinds, new[] { "story", "normal", "hard" }, 34, 1000);
            TestContext.WriteLine(Report(t));
            Assert.That(t.Fights, Is.GreaterThanOrEqualTo(2000));
            Never(t);
            Assert.That(t.Unended, Is.LessThanOrEqualTo(t.Fights / 20));
        }
    }
}
