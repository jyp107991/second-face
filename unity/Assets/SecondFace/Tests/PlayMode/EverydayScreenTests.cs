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
            try
            {
                assets.Combat = null;
                foreach (var k in want.OrderBy(x => x))
                {
                    if (k < 0 || k >= batches.Length) continue;
                    buildCm.Clear(); buildTop.Clear();
                    var failed = new List<string>();
                    var measured = new int[1];
                    var t0 = System.DateTime.UtcNow;
                    var inner = (IEnumerator)gate.Invoke(new HumanMotionGateTests(), new object[] { batches[k], only.Length > 0 ? "motion_screen_p" : $"motion_screen_{k}", false, failed, false, measured });
                    while (inner.MoveNext()) yield return inner.Current;
                    var secs = (System.DateTime.UtcNow - t0).TotalSeconds;
                    var ev = failed.Where(f => !f.Contains(" combat:")).ToList();
                    everyday.AddRange(ev);
                    File.WriteAllText(Path.Combine(dir, only.Length > 0 ? "motion_screen_p.chunk.json" : $"motion_screen_{k}.chunk.json"), JsonConvert.SerializeObject(new Dictionary<string, object>
                    {
                        ["Hash"] = hash, ["Ids"] = batches[k], ["Measured"] = measured[0], ["Failures"] = failed, ["Seconds"] = secs,
                    }, Formatting.Indented));
                    Debug.Log($"EVERYDAY SCREEN chunk {k}: {batches[k].Length} people, {measured[0]} measures, {ev.Count} everyday failures, {secs:0} s\n" + string.Join("\n", ev));
                }
            }
            finally
            {
                assets.Combat = combat;
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
