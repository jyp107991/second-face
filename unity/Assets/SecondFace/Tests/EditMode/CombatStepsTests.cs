using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using NUnit.Framework;
using SecondFace.Core.Combat;

namespace SecondFace.Tests
{
    /// <summary>
    /// The fight's re-stance steps and the early resolve, Core rules over the staged tables (staging combat/v4_3 and v4_4 README
    /// §2, v4_5 README §2; copied here as test data, CombatTables/): <see cref="CombatMotion.ChooseStep"/> picks the captured step
    /// (or chain of two) the reference implementation picks (tools/unity/motion/stance_continuity.py fit_step_feet), at its cost;
    /// the library is the staged one; <see cref="CombatMotion.ResolveAt"/> resolves a throw at its release, an order waits for it
    /// and the recovery plays to the still stance.
    /// </summary>
    public class CombatStepsTests
    {
        private static string Tables()
        {
            foreach (var start in new[] { System.AppContext.BaseDirectory, Directory.GetCurrentDirectory() })
                for (var d = new DirectoryInfo(start); d != null; d = d.Parent)
                    foreach (var rel in new[] { "unity/Assets/SecondFace/Tests/EditMode/CombatTables", "Assets/SecondFace/Tests/EditMode/CombatTables" })
                        if (Directory.Exists(Path.Combine(d.FullName, rel))) return Path.Combine(d.FullName, rel);
            Assert.Fail("Tests/EditMode/CombatTables");
            return null;
        }

        private static (double, double, double) Foot(JToken t) => ((double)t[0], (double)t[1], (double)t[2]);

        [Test]
        public void TheStepLibraryIsTheStagedOne()
        {
            var lib = (JArray)JObject.Parse(File.ReadAllText(Path.Combine(Tables(), "steps_library.json")))["steps"];
            Assert.That(CombatMotion.Steps.Select(s => s.Name), Is.EquivalentTo(lib.Select(e => (string)e["name"])));
            foreach (var e in lib)
            {
                var s = CombatMotion.Steps.First(x => x.Name == (string)e["name"]);
                Assert.That(s.Set, Is.EqualTo((string)e["set"]), s.Name);
                Assert.That(s.Arms.ToString().ToLowerInvariant(), Is.EqualTo(((string)e["arms"] ?? "quiet")), s.Name);
                Assert.That(s.Seconds, Is.EqualTo((double)e["seconds"]).Within(1e-9), s.Name);
                Assert.That(s.Left, Is.EqualTo(Foot(e["left"])), s.Name);
                Assert.That(s.Right, Is.EqualTo(Foot(e["right"])), s.Name);
            }
        }

        [Test]
        public void ChooseStepPicksWhatTheReferencePicks()
        {
            var cases = JArray.Parse(File.ReadAllText(Path.Combine(Tables(), "steps_cases.json")));
            var wrong = new List<string>();
            foreach (var c in cases)
            {
                var name = (string)c["case"]; var expect = (string)c["expect"]; var female = (string)c["sex"] == "f";
                var arms = c["arms"]?.Select(x => (string)x).ToArray() ?? new[] { "quiet" };
                StepPlan got;
                if (c["from"] == null)
                {
                    // (the crouched stance: hips under 0.70 m at the reference body, at either end)
                    var w = new Stance((-0.15, 0.0, -8.0), (0.15, 0.0, 8.0));
                    var low = new Stance((-0.15, 0.0, -8.0), (0.15, -0.2, 20.0), hips: 0.55);
                    got = CombatMotion.ChooseStep(w, low, female, 1.0);
                    var back = CombatMotion.ChooseStep(low, w, female, 1.0);
                    if (!got.None || got.Reason != StepPlan.Why.Crouched || !back.None || back.Reason != StepPlan.Why.Crouched)
                        wrong.Add($"{name}: {got} / {back}");
                    continue;
                }
                var from = new Stance(Foot(c["from"]["Left"]), Foot(c["from"]["Right"]));
                var to = new Stance(Foot(c["to"]["Left"]), Foot(c["to"]["Right"]));
                got = CombatMotion.ChooseStep(from, to, female, 1.0, leavesGuard: arms.Contains("lower"), entersGuard: arms.Contains("raise"));
                if (expect.StartsWith("none"))
                {
                    var why = expect.Contains("within") ? StepPlan.Why.Within : StepPlan.Why.NoStep;
                    if (!got.None || got.Reason != why) wrong.Add($"{name}: {got}, expected {expect}");
                }
                else if (got.None || string.Join(" + ", got.Steps) != expect) wrong.Add($"{name}: {got}, expected {expect}");
                // (the reference's cost, rounded to two places from stances themselves rounded: within 0.02)
                if (c["cost"] != null && System.Math.Abs(got.Cost - (double)c["cost"]) > 0.02) wrong.Add($"{name}: cost {got.Cost:0.000}, expected {(double)c["cost"]}");
            }
            Assert.That(wrong, Is.Empty, string.Join("\n", wrong));
        }

        [Test]
        public void ChooseStepScalesTheStanceToTheBody()
        {
            // a woman's 20 cm back step on a body 10 % taller is 22 cm: the same step at the same cost
            var from = new Stance((-0.15, 0.0, -8.0), (0.15, 0.0, 8.0));
            var at1 = CombatMotion.ChooseStep(from, new Stance((-0.15, 0.0, -8.0), (0.15, -0.2, 20.0)), true, 1.0);
            var at11 = CombatMotion.ChooseStep(new Stance((-0.165, 0.0, -8.0), (0.165, 0.0, 8.0)), new Stance((-0.165, 0.0, -8.0), (0.165, -0.22, 20.0)), true, 1.1);
            Assert.That(at11.Steps, Is.EqualTo(at1.Steps));
            Assert.That(at11.Cost, Is.EqualTo(at1.Cost).Within(1e-6));
        }

        // the staged throws' facts (staging combat/v4_5: throw_full_m_cmu 132 keys, released at key 73; throw_full_f_cmu 110 keys,
        // at key 56; both at 30 fps, the throw state left at 0.97). Read from the imported clips once v4.6 is in the project.
        private static readonly Dictionary<string, (int Keys, int Release)> Throws = new() { ["throw_full_m_cmu"] = (132, 73), ["throw_full_f_cmu"] = (110, 56) };

        [Test]
        public void AThrowResolvesAtItsReleaseAndItsRecoveryPlaysOn()
        {
            var cases = JArray.Parse(File.ReadAllText(Path.Combine(Tables(), "resolve_cases.json")));
            var wrong = new List<string>();
            var state = new MotionState { Name = "throw", Cut = 0.97f, Speed = 1f };
            foreach (var c in cases)
            {
                var clip = (string)c["clip"]; var ex = c["expect"]; var given = c["given"];
                if (!Throws.TryGetValue(clip, out var t))
                {
                    // a clip without resolve_at resolves as now
                    if (CombatMotion.ResolveAt(state, new MotionClip { Name = clip }, 1.0) != null) wrong.Add($"{c["case"]}: resolves early");
                    continue;
                }
                var mc = new MotionClip { Name = clip, Resolve = t.Release };
                var seconds = (t.Keys - 1) / CombatMotion.ClipFps;
                bool Near(double a, JToken b) => System.Math.Abs(a - (double)b) <= 0.0015;
                if (ex["resolved_at_s"] != null && !Near(CombatMotion.ResolveAt(state, mc, seconds) ?? -1, ex["resolved_at_s"])) wrong.Add($"{c["case"]}: resolved at {CombatMotion.ResolveAt(state, mc, seconds)}");
                if (ex["resolved_at_frame"] != null && mc.Resolve != (int)ex["resolved_at_frame"]) wrong.Add($"{c["case"]}: frame");
                if (ex["next_state_starts_at_s"] != null)
                {
                    var at = CombatMotion.OrderStartsAt(state, mc, seconds, (double)given["order_at_s"]);
                    if (!Near(at, ex["next_state_starts_at_s"])) wrong.Add($"{c["case"]}: the next state starts at {at:0.000}");
                }
                if (ex["throw_state_left_at_s"] != null && !Near(CombatMotion.LeftAt(state, seconds), ex["throw_state_left_at_s"])) wrong.Add($"{c["case"]}: left at {CombatMotion.LeftAt(state, seconds):0.000}");
            }
            Assert.That(wrong, Is.Empty, string.Join("\n", wrong));
        }
    }
}
