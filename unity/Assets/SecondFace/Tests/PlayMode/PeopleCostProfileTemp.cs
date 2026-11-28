using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using SecondFace.Game;
using SecondFace.Game.People;
using SecondFace.Game.Play;
using UnityEngine;
using UnityEngine.AI;
using UnityEngine.TestTools;

#if UNITY_EDITOR
namespace SecondFace.Tests
{
    /// <summary>
    /// What the people cost a frame, held to a budget so that a crowd's cost is a failing test and not only a slow one
    /// (docs/qa/gates/motion_waivers.json failing_tests; the cause traced 2026-11-28: CI's four timing failures on 71ce5403).
    /// <para>The budget: <see cref="Budget"/> ms of <see cref="ArmClearance"/>'s own cost (its <see cref="ArmClearance.CostMs"/>
    /// over <see cref="ArmClearance.CostFrames"/>, the main thread) a person a frame, averaged over everyone it runs on. Its
    /// parts and their sources:</para>
    /// <list type="bullet">
    /// <item>8 ms of CPU main thread a frame on the Mid tier at 30 fps (docs/BUILD_PLAN_V1.md §6.K);</item>
    /// <item>12 skinned figures at close LOD on the Mid tier (docs/PORT.md §4);</item>
    /// <item>a quarter of that main thread for the arms' clearance of those 12: a design choice (the coordinator's, 2026-11-28),
    /// not a measured fact, and open to the owner. The rest of the 8 ms carries animation, culling and render submission,
    /// physics, navigation, play and UI, and the people's other passes (feet, gaze, hands).</item>
    /// </list>
    /// <para>So 8 / 4 / 12 = 0.167 ms. It is measured in the test editor (Debug Mono, the debugger attached), so it is a
    /// conservative proxy for the device; the frame measured on the device at the end of every phase stays the real test
    /// (docs/BUILD_PLAN_V1.md §1).</para>
    /// <para>Read twice, with the same crowd: in Shale at noon once its people have settled, and in the fight the raiders
    /// bring there, each over every person the clearance runs on for <see cref="Frames"/> frames. On 71ce5403 it read 5.2 ms
    /// in the town and 3.1 ms in the fight: the clearance's skin path (BodySkin.Pose and its point scans, managed) for
    /// everyone within its range; until the batch made people away from the origin stand where they are, it ran for almost no
    /// one in a town (their bodies were 16 km off, past its 1,000 m).</para>
    /// </summary>
    public class PeopleCostProfileTemp
    {
        public const float Budget = 8f / 4f / 12f;
        public const int Frames = 300;

        [UnityTearDown]
        public IEnumerator CleanUp() => BootTests.Clear();

        /// <summary>The clearance's cost a person a frame over <see cref="Frames"/> frames (ms), and how many it ran on, on
        /// average; each component counted only for the frames between two readings it was there for.</summary>
        private static IEnumerator Read(System.Func<bool> on, System.Action<double, double, int> done, System.Action eachFrame = null)
        {
            var was = new Dictionary<ArmClearance, (double Ms, int Frames)>();
            _start.Clear();
            foreach (var a in Object.FindObjectsByType<ArmClearance>(FindObjectsSortMode.None)) { was[a] = (a.CostMs, a.CostFrames); _start[a] = Vals(a); }
            var people = 0L; var frames = 0;
            while (frames < Frames && on())
            {
                eachFrame?.Invoke();
                yield return null;
                frames++;
                people += Object.FindObjectsByType<ArmClearance>(FindObjectsSortMode.None).Count(a => a.isActiveAndEnabled);
            }
            double ms = 0; long n = 0;
            foreach (var (a, w) in was)
            {
                if (a == null) continue;
                ms += a.CostMs - w.Ms; n += a.CostFrames - w.Frames;
            }
            // (TEMP: the clocks inside, summed over the same components, per person-frame)
            var names = new[] { "stage0", "stage1_pose", "stage2_rest", "stage3_clear", "stage4_hands", "stage5_hang", "stage6_swing", "Gap", "SkinNeed", "SkinNeedAbout", "RestArm", "SkinClear", "Skin.DepthRange", "Skin.Turn", "Skin.Pose", "Skin.DrawnPose", "Skin.DrawnRead", "Skin.DepthCalls(n)", "Skin.DepthKept(n)", "Gap(n)", "SkinNeed(n)", "Range(n)", "Turn(n)" };
            var now = new double[names.Length];
            foreach (var (a, w) in was)
            {
                if (a == null) continue;
                var v = Vals(a);
                for (var i = 0; i < v.Length; i++) now[i] += v[i] - (_start.TryGetValue(a, out var s0) ? s0[i] : 0);
            }
            var line = new System.Text.StringBuilder($"{(_label ?? "?")}: person-frames {n}, cost {ms / System.Math.Max(1, n):0.0000} ms");
            for (var i = 0; i < names.Length; i++) line.Append($"; {names[i]} {now[i] / System.Math.Max(1, n):0.0000}");
            System.IO.File.AppendAllText(System.IO.Path.Combine(Application.dataPath, "..", "test-results", "cost_profile.txt"), line + "\n");
            Debug.Log("PeopleCostProfileTemp: " + line);
            done(n > 0 ? ms / n : double.NaN, frames > 0 ? (double)people / frames : 0, frames);
        }

        private static readonly Dictionary<ArmClearance, double[]> _start = new();
        private static string _label;
        private static double[] Vals(ArmClearance a)
        {
            var sk = a.GetComponent<BodySkin>();
            var v = new double[23];
            for (var i = 0; i < 7; i++) v[i] = a.StageMs[i];
            v[7] = a.Prof_GapMs; v[8] = a.Prof_NeedMs; v[9] = a.Prof_NeedAboutMs; v[10] = a.Prof_RestArmMs; v[11] = a.Prof_ClearMs;
            if (sk != null) { v[12] = sk.Prof_RangeMs; v[13] = sk.Prof_TurnMs; v[14] = sk.PoseMs; v[15] = sk.DrawnPoseMs; v[16] = sk.DrawnReadMs; v[17] = sk.DepthCalls; v[18] = sk.DepthKept; v[21] = sk.Prof_RangeN; v[22] = sk.Prof_TurnN; }
            v[19] = a.Prof_GapN; v[20] = a.Prof_NeedN;
            return v;
        }

        [UnityTest, Timeout(1800000)]
        public IEnumerator ProfileTheClearance()
        {
            Bootstrap boot = null;
            yield return PartyTests.Boot(b => boot = b);
            var walk = boot.Walkabout;
            var g = walk.Game;
            var town = walk.People.Town("shale");
            Assert.That(town, Is.Not.Null, "Shale stands");

            // ---- the town at noon, from its plaza ----
            var plaza = boot.Stage.Marker("shale", "spot", "plaza").transform.position;
            NavMesh.SamplePosition(plaza, out var hit, 3f, NavMesh.AllAreas);
            walk.Walker.Agent.Warp(hit.position);
            boot.Stage.Clock.SetHour(12);
            yield return BootTests.TownSettled(() => town.People.Count, "Shale at noon");
            _label = "town";
            double townMs = 0, townOn = 0; var townFrames = 0;
            yield return Read(() => true, (ms, on, f) => { townMs = ms; townOn = on; townFrames = f; }, () => PartyTests.Quiet(walk));
            Debug.Log($"PeopleCostProfileTemp: the town: {townMs:0.000} ms a person a frame, {townOn:0.0} people on, {townFrames} frames, {town.People.Count} standing");

            // ---- the fight the raiders bring to it ----
            g.SetFlag("tribute_day", true);
            walk.Settle();
            Townsperson raider = null;
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 60f && (raider = walk.People.StandingPeople.FirstOrDefault(p => p != null && p.Def != null && p.Def.Id == "npc_rd_t1")) == null)
            {
                PartyTests.Quiet(walk);
                yield return null;
            }
            Assert.That(raider, Is.Not.Null, "the raiders came to the town");
            var near = raider.transform.position + (walk.Walker.transform.position - raider.transform.position).normalized * 9f;
            if (NavMesh.SamplePosition(near, out var nh, 4f, NavMesh.AllAreas)) walk.Walker.Agent.Warp(nh.position);
            g.SetFlag("tribute_fight", true);
            walk.Settle();
            t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 60f && !walk.Combat.Active)
            {
                PartyTests.Quiet(walk);
                if (!walk.Busy) walk.Combat.Check(true);
                yield return null;
            }
            Assert.That(walk.Combat.Active, Is.True, "the fight began");
            // (the player's turns played by the AI, so the fight goes on while it is read)
            var driving = false;
            IEnumerator Drive() { driving = true; yield return walk.Combat.PlayerTurnByAi(); driving = false; }
            _label = "fight";
            double fightMs = 0, fightOn = 0; var fightFrames = 0;
            yield return Read(() => walk.Combat.Active, (ms, on, f) => { fightMs = ms; fightOn = on; fightFrames = f; },
                () => { if (walk.Combat.PlayersTurn && !driving) boot.StartCoroutine(Drive()); });
            Debug.Log($"PeopleCostProfileTemp: the fight: {fightMs:0.000} ms a person a frame, {fightOn:0.0} people on, {fightFrames} frames");

        }
    }
}
#endif
