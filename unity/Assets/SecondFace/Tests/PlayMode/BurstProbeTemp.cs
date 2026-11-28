#if UNITY_EDITOR
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

namespace SecondFace.Tests
{
    // TEMP (relaunch 16, never committed): is Burst compiling the people's jobs in the test editor? The arms' clearance's cost a
    // person a frame in Shale at noon with Burst on, off (the jobs run as managed code), and on again; written to
    // test-results/burst_probe.txt.
    public class BurstProbeTemp
    {
        // (the test assembly does not reference Unity.Burst: its options by reflection)
        private static readonly System.Type BC = System.Type.GetType("Unity.Burst.BurstCompiler, Unity.Burst");
        private static object Opt => BC.GetProperty("Options").GetValue(null);
        private static bool Get(string p) => (bool)Opt.GetType().GetProperty(p).GetValue(Opt);
        private static void Set(string p, bool v) => Opt.GetType().GetProperty(p).SetValue(Opt, v);
        private static bool IsEnabled => (bool)BC.GetProperty("IsEnabled").GetValue(null);

        [UnityTearDown]
        public IEnumerator CleanUp() { Set("EnableBurstCompilation", true); yield return BootTests.Clear(); }

        private static IEnumerator Read(int frames, System.Action<double, long> done)
        {
            var was = new Dictionary<ArmClearance, (double Ms, int F)>();
            foreach (var a in Object.FindObjectsByType<ArmClearance>(FindObjectsSortMode.None)) was[a] = (a.CostMs, a.CostFrames);
            for (var f = 0; f < frames; f++) yield return null;
            double ms = 0; long n = 0;
            foreach (var (a, w) in was) { if (a == null) continue; ms += a.CostMs - w.Ms; n += a.CostFrames - w.F; }
            done(n > 0 ? ms / n : double.NaN, n);
        }

        [UnityTest, Timeout(1800000)]
        public IEnumerator BurstOnAndOff()
        {
            Bootstrap boot = null;
            yield return PartyTests.Boot(b => boot = b);
            var walk = boot.Walkabout;
            var town = walk.People.Town("shale");
            var plaza = boot.Stage.Marker("shale", "spot", "plaza").transform.position;
            NavMesh.SamplePosition(plaza, out var hit, 3f, NavMesh.AllAreas);
            walk.Walker.Agent.Warp(hit.position);
            boot.Stage.Clock.SetHour(12);
            yield return BootTests.TownSettled(() => town.People.Count, "Shale at noon");
            var lines = new List<string> { $"code optimisation {UnityEditor.Compilation.CompilationPipeline.codeOptimization}, editor attaching {UnityEditor.EditorPrefs.GetBool("AllowAttachedDebuggingOfEditor", true)}, leak detection {Unity.Collections.NativeLeakDetection.Mode}, jobs debugger {Unity.Jobs.LowLevel.Unsafe.JobsUtility.JobDebuggerEnabled}",
                $"IsEnabled {IsEnabled}, EnableBurstCompilation {Get("EnableBurstCompilation")}, EnableBurstSafetyChecks {Get("EnableBurstSafetyChecks")}, CompileSynchronously {Get("EnableBurstCompileSynchronously")}" };
            foreach (var (on, label) in new[] { (true, "on"), (false, "off"), (true, "on again") })
            {
                Set("EnableBurstCompilation", on);
                for (var f = 0; f < 10; f++) yield return null;
                double ms = 0; long n = 0;
                yield return Read(150, (m, k) => { ms = m; n = k; });
                lines.Add($"Burst {label}: {ms:0.000} ms a person a frame over {n} person-frames ({town.People.Count} standing)");
            }
            // and with the safety checks, the leak detection and the jobs debugger off (as a device build has them)
            Set("EnableBurstCompilation", true);
            var safety = Get("EnableBurstSafetyChecks");
            var leak = Unity.Collections.NativeLeakDetection.Mode;
            var dbg = Unity.Jobs.LowLevel.Unsafe.JobsUtility.JobDebuggerEnabled;
            Set("EnableBurstSafetyChecks", false);
            Unity.Collections.NativeLeakDetection.Mode = Unity.Collections.NativeLeakDetectionMode.Disabled;
            Unity.Jobs.LowLevel.Unsafe.JobsUtility.JobDebuggerEnabled = false;
            for (var f = 0; f < 30; f++) yield return null;
            { double ms = 0; long n = 0; yield return Read(150, (m, k) => { ms = m; n = k; }); lines.Add($"Burst on, safety checks, leak detection and jobs debugger off: {ms:0.000} ms over {n}"); }
            Set("EnableBurstSafetyChecks", safety);
            Unity.Collections.NativeLeakDetection.Mode = leak;
            Unity.Jobs.LowLevel.Unsafe.JobsUtility.JobDebuggerEnabled = dbg;
            System.IO.File.WriteAllText(System.IO.Path.Combine(Application.dataPath, "..", "test-results", "burst_probe.txt"), string.Join("\n", lines) + "\n");
            Debug.Log("BurstProbeTemp: " + string.Join(" | ", lines));
        }
    }
}
#endif
