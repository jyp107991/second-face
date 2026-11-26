using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using Newtonsoft.Json;
using NUnit.Framework;
using SecondFace.Game.People;
using SecondFace.Game.World;
using UnityEngine;
using UnityEngine.TestTools;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace SecondFace.Tests
{
    // TEMP harness (never committed; not a gate input): the motion gate's own Gate() over the whole cast in its chunks of ten,
    // the everyday states only (the fight is skipped by holding the world assets' combat set back in memory for the run, so
    // Gate's "the fight's motion is not built" branch is taken; never saved). No measure, limit or state is changed; it writes
    // test-results/motion_screen_<k>.* (never motion_gate.json, never a verdict). SCREEN_CHUNKS: "0-7", "4,5" (default all).
    // StageProbeTests' watcher (REST_TRACE, W3_TRACE, FOOT_TRACE, W3_MODE, FOOT_MODE) can ride along with SCREEN_WATCH=1.
    public class EverydayScreenTests
    {
        private static readonly BindingFlags Any = BindingFlags.NonPublic | BindingFlags.Public | BindingFlags.Instance | BindingFlags.Static;

        private static IEnumerator Fixed(IEnumerator inner)
        {
            var keep = Time.captureDeltaTime;
            Time.captureDeltaTime = 1f / 60f;
            yield return null; yield return null;
            try { while (inner.MoveNext()) yield return inner.Current; }
            finally { Time.captureDeltaTime = keep; }
        }

        // (the bisect's switches, TEMP: ArmClearance.BisectEnv when the tree carries them; every FootPlant's ToeBendMax held at 0 for "toes")
        private static void SetBisect(string switches)
        {
            var f = typeof(ArmClearance).GetField("BisectEnv", Any);
            if (f != null) f.SetValue(null, switches ?? (System.Environment.GetEnvironmentVariable("BISECT") ?? ""));
            else if (!string.IsNullOrEmpty(switches) && switches != "toes") Debug.LogWarning("EVERYDAY SCREEN: no ArmClearance.BisectEnv in this tree: switches " + switches + " not applied");
        }

        public sealed class ToeSwitch : MonoBehaviour
        {
            public bool Off;
            private void Update()
            {
                foreach (var fp in Object.FindObjectsByType<FootPlant>(FindObjectsSortMode.None)) fp.ToeBendMax = Off ? 0f : 50f;
            }
        }

        [UnityTest, Timeout(14400000)]
        public IEnumerator EverydayScreen() => Fixed(Screen());

        private static IEnumerator Screen()
        {
#if UNITY_EDITOR
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            var assets = AssetDatabase.LoadAssetAtPath<WorldAssets>("Assets/SecondFace/World/WorldAssets.asset");
            Assert.That(cat, Is.Not.Null); Assert.That(assets, Is.Not.Null);
            var ids = cat.People.Where(e => e != null && e.Prefab != null).Select(e => e.Id).OrderBy(s => s).ToArray();
            var batches = Enumerable.Range(0, (ids.Length + 9) / 10).Select(k => ids.Skip(k * 10).Take(10).ToArray()).ToArray();
            // (SCREEN_PEOPLE: a comma list measured as one batch, "motion_screen_p", for a trace: never a screen of the cast)
            var only = (System.Environment.GetEnvironmentVariable("SCREEN_PEOPLE") ?? "").Split(',').Select(x => x.Trim()).Where(x => x.Length > 0).ToArray();
            if (only.Length > 0) batches = new[] { only };
            var want = new HashSet<int>();
            var spec = System.Environment.GetEnvironmentVariable("SCREEN_CHUNKS") ?? "";
            foreach (var part in spec.Split(',').Select(x => x.Trim()).Where(x => x.Length > 0))
            {
                var ab = part.Split('-');
                if (ab.Length == 2) for (var k = int.Parse(ab[0]); k <= int.Parse(ab[1]); k++) want.Add(k);
                else want.Add(int.Parse(part));
            }
            if (want.Count == 0) for (var k = 0; k < batches.Length; k++) want.Add(k);
            var gateType = typeof(HumanMotionGateTests);
            var gate = gateType.GetMethod("Gate", Any);
            var buildCm = (IDictionary)gateType.GetField("BuildCm", Any).GetValue(null);
            var buildTop = (IDictionary)gateType.GetField("BuildTop", Any).GetValue(null);
            var hash = HumanMotionGateTests.InputsHash("people") + "|" + HumanMotionGateTests.InputsHash("measures");
            var dir = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "test-results"));
            Directory.CreateDirectory(dir);
            GameObject watch = null;
            if (System.Environment.GetEnvironmentVariable("SCREEN_WATCH") == "1")
            {
                watch = new GameObject("stage watcher");
                Object.DontDestroyOnLoad(watch);
                watch.AddComponent<StageProbeTests.Watcher>();
            }
            var combat = assets.Combat;
            var everyday = new List<string>();
            var configs = (System.Environment.GetEnvironmentVariable("SCREEN_CONFIGS") ?? "").Split('|').Select(x => x.Trim()).Where(x => x.Length > 0)
                .Select(x => { var c = x.Split(':'); return (Label: c[0], Switches: c.Length > 1 ? c[1] : ""); }).ToList();
            if (configs.Count == 0) configs.Add(("", null));
            var toes = new GameObject("toe switch"); Object.DontDestroyOnLoad(toes); var ts = toes.AddComponent<ToeSwitch>();
            try
            {
                assets.Combat = null;
                foreach (var (label, switches) in configs)
                foreach (var k in want.OrderBy(x => x))
                {
                    if (switches != null) { SetBisect(switches); ts.Off = ("," + switches + ",").Contains(",toes,"); }
                    var tag = (only.Length > 0 ? "motion_screen_p" : $"motion_screen_{k}") + (label.Length > 0 ? "_" + label : "");
                    if (k < 0 || k >= batches.Length) continue;
                    buildCm.Clear(); buildTop.Clear();
                    var failed = new List<string>();
                    var measured = new int[1];
                    var t0 = System.DateTime.UtcNow;
                    var inner = (IEnumerator)gate.Invoke(new HumanMotionGateTests(), new object[] { batches[k], tag, false, failed, false, measured });
                    while (inner.MoveNext()) yield return inner.Current;
                    var secs = (System.DateTime.UtcNow - t0).TotalSeconds;
                    var ev = failed.Where(f => !f.Contains(" combat:")).ToList();
                    everyday.AddRange(ev);
                    File.WriteAllText(Path.Combine(dir, tag + ".chunk.json"), JsonConvert.SerializeObject(new Dictionary<string, object>
                    {
                        ["Hash"] = hash, ["Ids"] = batches[k], ["Measured"] = measured[0], ["Failures"] = failed, ["Seconds"] = secs, ["Switches"] = switches ?? "",
                    }, Formatting.Indented));
                    Debug.Log($"EVERYDAY SCREEN {tag} [{switches}]: {batches[k].Length} people, {measured[0]} measures, {ev.Count} everyday failures, {secs:0} s\n" + string.Join("\n", ev));
                }
            }
            finally
            {
                assets.Combat = combat;
                SetBisect(null);
                Object.Destroy(toes);
                if (watch != null) Object.Destroy(watch);
            }
            Debug.Log($"EVERYDAY SCREEN total: {everyday.Count} everyday failures\n" + string.Join("\n", everyday));
#else
            Assert.Ignore("editor only");
            yield break;
#endif
        }
    }
}
