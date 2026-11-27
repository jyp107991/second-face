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
            StrideEndOff = ("," + (switches ?? "") + ",").Contains(",nostrideend,");
            OutRetryOff = ("," + (switches ?? "") + ",").Contains(",nooutretry,");
            RestOutOff = ("," + (switches ?? "") + ",").Contains(",norestout,");
            Debug.Log($"EVERYDAY SCREEN switches [{switches}]: stride end {(StrideEndOff ? "OFF" : "on")}, out retry {(OutRetryOff ? "OFF" : "on")}");
            var df = typeof(BodySkin).GetField("DrawnOff", Any);
            if (df != null) df.SetValue(null, ("," + (switches ?? "") + ",").Contains(",drawnoff,") || System.Environment.GetEnvironmentVariable("SKIN_DRAWN") == "off");
            Debug.Log($"EVERYDAY SCREEN switches [{switches}]: drawn reading {(df != null && (bool)df.GetValue(null) ? "OFF" : "on")}");
            var f = typeof(ArmClearance).GetField("BisectEnv", Any);
            if (f != null) f.SetValue(null, switches ?? (System.Environment.GetEnvironmentVariable("BISECT") ?? ""));
            else if (!string.IsNullOrEmpty(switches) && switches != "toes") Debug.LogWarning("EVERYDAY SCREEN: no ArmClearance.BisectEnv in this tree: switches " + switches + " not applied");
        }

        private static bool StrideEndOff, OutRetryOff, RestOutOff;
        public sealed class ToeSwitch : MonoBehaviour
        {
            public bool Off;
            private void Update()
            {
                var se = typeof(ArmClearance).GetField("StrideEnd", BindingFlags.Public | BindingFlags.Instance);
                var orr = typeof(ArmClearance).GetField("OutRetry", BindingFlags.Public | BindingFlags.Instance);
                var ror = typeof(ArmClearance).GetField("RestOutRetry", BindingFlags.Public | BindingFlags.Instance);
                foreach (var ac in Object.FindObjectsByType<ArmClearance>(FindObjectsSortMode.None)) { se?.SetValue(ac, !StrideEndOff); orr?.SetValue(ac, !OutRetryOff); ror?.SetValue(ac, !RestOutOff); }
                var f = typeof(FootPlant).GetField("ToeBendMax", BindingFlags.Public | BindingFlags.Instance);
                if (f == null) return;
                foreach (var fp in Object.FindObjectsByType<FootPlant>(FindObjectsSortMode.None)) f.SetValue(fp, Off ? 0f : 50f);
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
                watch.AddComponent<PhaseWatcher>();
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

        // TEMP (1127e): each traced person's base layer, frame by frame: the state's phase and the clips playing, by file
        public sealed class PhaseWatcher : MonoBehaviour
        {
            private static readonly string[] Who = (System.Environment.GetEnvironmentVariable("GATE_TRACE") ?? "").Split(',').Where(x => x.Length > 0).ToArray();
            private void Update()
            {
                foreach (var p in Object.FindObjectsByType<MotionProbe>(FindObjectsSortMode.None))
                {
                    if (p.Person == null || p.GetComponent<PhaseRec>() != null || !Who.Contains(p.Person)) continue;
                    var r = p.gameObject.AddComponent<PhaseRec>(); r.Probe = p;
                }
            }
        }

        [DefaultExecutionOrder(10006)]
        public sealed class PhaseRec : MonoBehaviour
        {
            public MotionProbe Probe; private StreamWriter _w; private Animator _a;
            private static readonly Dictionary<AnimationClip, string> Names = new();
            private void Start()
            {
                _a = GetComponent<Animator>();
                var dir = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "test-results"));
                _w = new StreamWriter(Path.Combine(dir, $"phase_{Probe.Person}.csv")) { AutoFlush = false };
                _w.WriteLine("state,t,norm,trans,nextnorm,clips");
            }
            private static string Name(AnimationClip c)
            {
                if (c == null) return "-";
                if (Names.TryGetValue(c, out var n)) return n;
#if UNITY_EDITOR
                n = Path.GetFileNameWithoutExtension(AssetDatabase.GetAssetPath(c));
#else
                n = c.name;
#endif
                Names[c] = n; return n;
            }
            private void LateUpdate()
            {
                if (_w == null || _a == null || Probe.State == null) return;
                if (!Probe.State.Contains("walk") && !Probe.State.Contains("jog") && !Probe.State.Contains("sneak")) return;
                var st = _a.GetCurrentAnimatorStateInfo(0); var tr = _a.IsInTransition(0);
                var nx = tr ? _a.GetNextAnimatorStateInfo(0) : default;
                var sb = new System.Text.StringBuilder();
                foreach (var ci in _a.GetCurrentAnimatorClipInfo(0)) if (ci.weight > 0.01f) sb.Append($"{Name(ci.clip)}:{ci.weight:0.000}:{ci.clip.length:0.0000}:{st.normalizedTime:0.0000};");
                if (tr) foreach (var ci in _a.GetNextAnimatorClipInfo(0)) if (ci.weight > 0.01f) sb.Append($"{Name(ci.clip)}:{ci.weight:0.000}:{ci.clip.length:0.0000}:{nx.normalizedTime:0.0000}:next;");
                _w.WriteLine($"{Probe.State},{Time.time:0.000},{st.normalizedTime:0.0000},{(tr ? _a.GetAnimatorTransitionInfo(0).normalizedTime : -1f):0.000},{(tr ? nx.normalizedTime : -1f):0.0000},{sb}");
            }
            private void OnDestroy() { _w?.Flush(); _w?.Close(); _w = null; }
        }
    }
}
