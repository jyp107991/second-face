using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using Newtonsoft.Json;
using NUnit.Framework;
using SecondFace.Core.Npc;
using SecondFace.Game.People;
using SecondFace.Game.Play;
using SecondFace.Game.World;
using UnityEngine;
using UnityEngine.TestTools;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace SecondFace.Tests
{
    /// <summary>
    /// The motion and posture gate (docs/PEOPLE_MOTION.md, binding: "humans that look and move like humans"). People made
    /// by the game's own code (<see cref="PeopleService.Animate"/> for residents, <see cref="Walker.Animate"/> for the
    /// player's body) with every runtime system on, played through every state the game shows them in (the four idles on
    /// flat and sloped ground, looking at someone round them, each gesture and its end, the conversation turn, walking,
    /// jogging, sneaking, straight and round a bend, two people talking), measured every frame by <see cref="MotionProbe"/>
    /// and held to the limits taken from real people (§2 there). Writes test-results/motion_gate.json and .md; captures
    /// from the game camera (default and closest zoom), the conversation view and human height. Any measure past its
    /// limit fails the gate (S2).
    /// </summary>
    public class HumanMotionGateTests
    {
        /// <summary>The quick set (every CI run): women and men, slim, broad and heavy, young and old, several peoples and
        /// trades' clothes; the last is made as the player's body.</summary>
        public static readonly string[] Quick =
        {
            "Female_Adult_01", "Female_Adult_09", "Business_Female_02", "Construction_Female_01", "Male_Adult_08", "Male_Adult_03",
            "Construction_Male_03", "Male_Adult_12", "Police_Male_07", "Female_Adult_04",
        };

        private const float Lane = 7f;
        private static readonly string[] Gestures = { "talk", "talk_b", "argue", "drink", "wave", "stretch", "yawn", "yawn_b" };

        // ---------------------------------------------------------------- limits (docs/PEOPLE_MOTION.md §2)

        public sealed class Lim
        {
            public string M;
            public float Lo = float.NegativeInfinity, Hi = float.PositiveInfinity, CapLo = float.NegativeInfinity, CapHi = float.PositiveInfinity;
            public float MeanMax = float.PositiveInfinity, Over = float.PositiveInfinity, OverFrac = 1f;
        }

        private const float Inf = float.PositiveInfinity;
        private static Lim L(string m, float lo, float hi, float capLo, float capHi) => new() { M = m, Lo = lo, Hi = hi, CapLo = capLo, CapHi = capHi };

        private static readonly Lim F4 = new() { M = "F4", MeanMax = 3f, Over = 10f, OverFrac = 0.02f };
        private static readonly Lim C1 = L("C1", -Inf, 0.5f, -Inf, 1.5f);
        private static readonly Lim A6 = L("A6", 50f, Inf, 35f, Inf);
        private static readonly Lim F1 = L("F1", -1.5f, 2.5f, -3f, 4f);
        private static readonly Lim F2 = L("F2", -2f, 2f, -4f, 4f);

        private static readonly Lim[] StandLimits =
        {
            L("A1", -Inf, 20f, -Inf, 28f), L("A2", 5f, 35f, 0f, 50f), L("A3", -Inf, 30f, -Inf, 40f), L("A4", -Inf, 6f, -Inf, 10f),
            L("A5", 8f, 55f, 3f, 75f), L("S1", -Inf, 6f, -Inf, 10f), L("H1", -15f, 8f, -25f, 12f), L("H2", -Inf, 30f, -Inf, 45f),
            L("H3", -Inf, 10f, -Inf, 15f), F1, F2, L("F3w", 8f, 32f, 5f, 40f), L("F3a", -Inf, 28f, -Inf, 35f), L("F3s", -Inf, 25f, -Inf, 35f), F4, C1,
            new() { M = "F5", MeanMax = 0.12f }, A6,
        };

        private static Lim[] GestureLimits(string g) => new[]
        {
            C1, F1, F2, F4, L("H1", -25f, 15f, -30f, 20f), L("H2", -Inf, 30f, -Inf, 45f),
            g is "stretch" or "yawn" or "yawn_b" ? L("S1", -Inf, 20f, -Inf, 20f) : L("S1", -Inf, 10f, -Inf, 10f),
        };

        private static readonly Lim[] TurnLimits = { F4, F1, F2, C1, L("T1", -Inf, 20f, -Inf, 20f) };

        private static readonly Lim[] WalkLimits =
        {
            new() { M = "W1", MeanMax = 8f, Over = 15f, OverFrac = 0.05f }, new() { M = "W2", MeanMax = 0.10f }, L("W6", -1.5f, 2.5f, -3f, 4f),
            L("W3", -Inf, 35f, -Inf, 45f), L("W4", -20f, 8f, -25f, 12f), L("W5", -Inf, 25f, -Inf, 35f), C1, A6,
        };

        /// <summary>Jogging swings the arms further than walking (no sourced limit yet: held at 45° and reviewed by eye).</summary>
        private static readonly Lim[] JogLimits = WalkLimits.Select(l => l.M == "W3" ? L("W3", -Inf, 45f, -Inf, 55f) : l).ToArray();

        private static readonly Lim[] TalkLimits = StandLimits.Concat(new[] { L("T2", -Inf, 20f, -Inf, 20f), L("T3", 0.9f, 1.6f, 0.9f, 1.6f) }).ToArray();

        private static Lim[] LimitsFor(string state)
        {
            if (state.StartsWith("gesture:")) return GestureLimits(state.Substring(8));
            if (state == "turn") return TurnLimits;
            if (state.EndsWith(":jog")) return JogLimits;
            if (state.StartsWith("walk:") || state.StartsWith("bend:")) return WalkLimits;
            if (state == "talk") return TalkLimits;
            return StandLimits;
        }

        // ---------------------------------------------------------------- the gate

        /// <summary>The feet, close (a review tool, run by name): four people as the game makes them, standing, then two talking
        /// as the game sets them, each pair of feet from four sides at shin height and from the game camera's pitch, 1200 px;
        /// and the lowest skin of each foot against the ground, logged.</summary>
        [UnityTest, Timeout(900000), Category("Heavy")]
        public IEnumerator FeetCloseUp()
        {
#if UNITY_EDITOR
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            var assets = AssetDatabase.LoadAssetAtPath<WorldAssets>("Assets/SecondFace/World/WorldAssets.asset");
            if (cat == null || assets == null) { Assert.Ignore("not built"); yield break; }
            yield return BootTests.Clear();
            var root = new GameObject("feet");
            var ground = GameObject.CreatePrimitive(PrimitiveType.Cube);
            ground.transform.SetParent(root.transform); ground.transform.localScale = new Vector3(40f, 1f, 40f); ground.transform.position = new Vector3(0f, -0.5f, 0f);
            ground.GetComponent<Renderer>().sharedMaterial.color = new Color(0.62f, 0.6f, 0.56f);
            var sun = new GameObject("sun").AddComponent<Light>(); sun.transform.SetParent(root.transform);
            sun.type = LightType.Directional; sun.intensity = 1.5f; sun.shadows = LightShadows.Soft; sun.transform.rotation = Quaternion.Euler(50f, 150f, 0f);
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat; RenderSettings.ambientLight = new Color(0.6f, 0.6f, 0.62f);
            var ids = new[] { "Female_Adult_01", "Male_Adult_01", "Business_Female_02", "Construction_Male_03" };
            var made = new List<(string Id, GameObject Go)>();
            for (var i = 0; i < ids.Length; i++)
            {
                var go = Object.Instantiate(cat.Get(ids[i]), new Vector3(i * 3f, 0f, 0f), Quaternion.identity, root.transform);
                var p = RbPeople.Of(ids[i]);
                RbDress.Apply(go, RbPeople.DyesFor(p, "feet_" + ids[i], p?.Roles?.FirstOrDefault() ?? "settler", null));
                var a = go.GetComponentInChildren<Animator>();
                var amb = PeopleService.Animate(a, assets.Locomotion, ids[i]); amb.MinGap = amb.MaxGap = 1e6f;
                a.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                made.Add((ids[i], go));
            }
            yield return Wait(3f);
            var cam = new GameObject("cam") { tag = "MainCamera" }.AddComponent<Camera>(); cam.transform.SetParent(root.transform);
            cam.clearFlags = CameraClearFlags.SolidColor; cam.backgroundColor = new Color(0.7f, 0.75f, 0.8f); cam.nearClipPlane = 0.05f;
            IEnumerator Shots(string tag)
            {
                foreach (var (id, go) in made)
                {
                    var a = go.GetComponentInChildren<Animator>();
                    var lf = a.GetBoneTransform(HumanBodyBones.LeftFoot).position; var rf = a.GetBoneTransform(HumanBodyBones.RightFoot).position;
                    var mid = (lf + rf) * 0.5f; mid.y = 0.08f;
                    // the lowest skin under each foot, against the ground (y 0)
                    var smr = go.GetComponentsInChildren<SkinnedMeshRenderer>().OrderByDescending(r => r.sharedMesh.vertexCount).First();
                    var mesh = new Mesh(); smr.BakeMesh(mesh, true);
                    var l2w = Matrix4x4.TRS(smr.transform.position, smr.transform.rotation, Vector3.one);
                    float lowL = 9f, lowR = 9f;
                    foreach (var v0 in mesh.vertices)
                    {
                        var v = l2w.MultiplyPoint3x4(v0);
                        if ((v - lf).sqrMagnitude < 0.2f * 0.2f) lowL = Mathf.Min(lowL, v.y);
                        if ((v - rf).sqrMagnitude < 0.2f * 0.2f) lowR = Mathf.Min(lowR, v.y);
                    }
                    Object.Destroy(mesh);
                    Debug.Log($"FeetCloseUp {tag} {id}: lowest skin by the left foot {lowL * 100f:0.0} cm, right {lowR * 100f:0.0} cm; ankles {lf.y * 100f:0.0} / {rf.y * 100f:0.0} cm up");
                    cam.fieldOfView = 35f;
                    for (var k = 0; k < 4; k++)
                    {
                        var dir = Quaternion.Euler(0f, 90f * k + go.transform.eulerAngles.y, 0f) * Vector3.forward;
                        cam.transform.SetPositionAndRotation(mid + dir * 1.3f + Vector3.up * 0.15f, Quaternion.LookRotation(-dir + Vector3.down * 0.1f, Vector3.up));
                        yield return ScreenshotTests.Capture($"feet_{tag}_{id}_{k}", 900, 600);
                    }
                    // as the game camera sees them (pitch 48°, closest zoom), the whole person
                    cam.fieldOfView = 28f;
                    var rot = Quaternion.Euler(48f, go.transform.eulerAngles.y + 180f, 0f);
                    cam.transform.SetPositionAndRotation(go.transform.position + Vector3.up * 1.0f - rot * Vector3.forward * 4.5f, rot);
                    yield return ScreenshotTests.Capture($"feet_{tag}_{id}_game", 900, 900);
                }
            }
            yield return Shots("stand");
            // two talking, as the game sets them: the first two face each other at 1.3 m and turn as the game turns them
            made[1].Go.transform.SetPositionAndRotation(made[0].Go.transform.position + Vector3.forward * 1.3f, Quaternion.Euler(0f, 180f, 0f));
            yield return Wait(0.5f);
            var runner = root.AddComponent<Runner>();
            runner.StartCoroutine(Walkabout.Face(made[0].Go.transform, made[1].Go.transform.position));
            yield return Wait(3f);
            yield return Shots("talk");
            Object.Destroy(root);
#else
            Assert.Ignore("editor only");
            yield break;
#endif
        }

        /// <summary>G1 and G2 (docs/PEOPLE_MOTION.md §2.6): every Rocketbox person's layers stand off the body as real clothes do
        /// (radial ease from apparel norms: a jacket ~1-1.6 cm), and each layer worn over another stands further out than it.</summary>
        [Test]
        public void LayersStandOffAsClothDoes()
        {
#if UNITY_EDITOR
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            if (cat == null || cat.People.Length == 0) { Assert.Ignore("no Rocketbox catalogue built"); return; }
            var limit = new Dictionary<string, float>
            {
                ["cargo"] = 0.7f, ["boots"] = 1.3f, ["gaiter"] = 0.9f, ["bomber"] = 1.0f, ["vest"] = 1.4f, ["straps"] = 1.8f,
                ["cape"] = 2.0f, ["belt"] = 1.8f, ["wraps"] = 0.4f, ["shins"] = 1.6f,
            };
            var over = new[] { ("straps", "vest"), ("vest", "bomber"), ("cape", "bomber"), ("belt", "cargo"), ("belt", "vest"), ("shins", "cargo"), ("shins", "boots"), ("boots", "cargo") };
            var wrong = new List<string>();
            var n = 0;
            foreach (var e in cat.People)
            {
                var set = e?.Prefab != null ? e.Prefab.GetComponentInChildren<RbLayerSet>(true) : null;
                if (set == null || set.Data == null) { wrong.Add($"{e?.Id}: no layers built"); continue; }
                var layers = set.Layers;
                n++;
                foreach (var (id, layer) in layers)
                    if (limit.TryGetValue(id, out var cm) && layer.Thickness * 100f > cm + 1e-3f) wrong.Add($"{e.Id} {id}: {layer.Thickness * 100f:0.0} cm off the body (G1 ≤ {cm})");
                foreach (var (outer, inner) in over)
                    if (layers.TryGetValue(outer, out var o) && layers.TryGetValue(inner, out var i) && o.Thickness <= i.Thickness && !(outer == "boots" && inner == "cargo"))
                        wrong.Add($"{e.Id}: {outer} ({o.Thickness * 100f:0.0} cm) not over {inner} ({i.Thickness * 100f:0.0} cm) (G2)");
            }
            Assert.That(n, Is.GreaterThan(0), "no layer sets");
            Assert.That(wrong, Is.Empty, string.Join("; ", wrong.Take(40)));
#else
            Assert.Ignore("editor only");
#endif
        }

        /// <summary>Every captured clip imported as its sidecar says (docs/PEOPLE_MOTION.md W1): a walk, an idle or a jog that
        /// does not loop plays one cycle and then holds its last frame, and the body is dragged along on it.</summary>
        [Test]
        public void TheCapturedClipsLoopAsTheirSidecarsSay()
        {
#if UNITY_EDITOR
            var wrong = new List<string>();
            var n = 0;
            foreach (var json in Directory.GetFiles(Path.Combine(Application.dataPath, "SecondFace", "Motion"), "*.json"))
            {
                var side = Newtonsoft.Json.Linq.JObject.Parse(File.ReadAllText(json));
                var loop = side.Value<bool?>("loop") ?? false;
                var path = "Assets/SecondFace/Motion/" + Path.GetFileNameWithoutExtension(json) + ".fbx";
                foreach (var clip in AssetDatabase.LoadAllAssetsAtPath(path).OfType<AnimationClip>().Where(c => !c.name.StartsWith("__preview")))
                {
                    n++;
                    if (clip.isLooping != loop) wrong.Add($"{Path.GetFileName(path)}: loops {clip.isLooping}, its sidecar says {loop}");
                    // and is the whole take its sidecar describes (not a stale cut of an older export)
                    var frames = side.Value<int?>("frames"); var fps = side.Value<float?>("fps") ?? 30f;
                    if (frames is { } f && f > 1 && Mathf.Abs(clip.length - (f - 1) / fps) > 1.5f / fps && Mathf.Abs(clip.length - f / fps) > 1.5f / fps)
                        wrong.Add($"{Path.GetFileName(path)}: {clip.length:0.00} s long, its sidecar says {f} frames ({f / fps:0.00} s)");
                }
                // the pace's table of the moving clips (Pace.Clips) as the sidecars have them
                var name = Path.GetFileNameWithoutExtension(json);
                foreach (var c in Pace.Clips.Where(c => c.Name == name))
                    if (Mathf.Abs(c.Speed - (side.Value<float?>("speed") ?? 0f)) > 0.002f || Mathf.Abs(c.Hip - (side.Value<float?>("hip") ?? 0f)) > 0.002f)
                        wrong.Add($"Pace.Clips {name}: {c.Speed} m/s, hip {c.Hip} m; its sidecar says {side.Value<float?>("speed")} m/s, hip {side.Value<float?>("hip")} m");
            }
            Assert.That(n, Is.GreaterThan(0), "no captured clips found");
            Assert.That(wrong, Is.Empty, string.Join("; ", wrong));
#else
            Assert.Ignore("editor only");
#endif
        }

        [UnityTest, Timeout(3600000)]
        public IEnumerator PeopleStandAndMoveLikePeople() => Fixed(Gate(Quick, "motion_gate", captures: true));

        /// <summary>The gate over the people named in GATE_PEOPLE (a comma list), for a look at a few of the whole cast's
        /// failures without its 35 minutes: written as test-results/motion_gate_pick.*, never a verdict (only the quick set's
        /// and the whole cast's are, docs/PEOPLE_MOTION.md §1.9).</summary>
        [UnityTest, Timeout(3600000)]
        public IEnumerator PickedPeopleStandAndMove()
        {
            var ids = (System.Environment.GetEnvironmentVariable("GATE_PEOPLE") ?? "").Split(',').Select(x => x.Trim()).Where(x => x.Length > 0).ToArray();
            if (ids.Length == 0) { Assert.Ignore("no GATE_PEOPLE"); yield break; }
            // (GATE_SHOTS=1: with the captures, every one picked, for a look at them as the gate measured them)
            yield return Fixed(Gate(ids, "motion_gate_pick", captures: System.Environment.GetEnvironmentVariable("GATE_SHOTS") == "1"));
        }

        /// <summary>The gate's frames each a fixed 1/60 s of game time (a phone's frame), whatever the machine running it
        /// takes to draw them: the same code measures the same, run after run (the test machine's frames ran 4-131 ms and
        /// the same code's verdicts differed by 3-6 failures a measure, so "no measure worse" compared noise,
        /// docs/PEOPLE_MOTION.md §1.9, 2026-11-06).</summary>
        private static IEnumerator Fixed(IEnumerator inner)
        {
            var keep = Time.captureDeltaTime;
            Time.captureDeltaTime = 1f / 60f;
            // (two fixed frames before anything is made: the step takes effect from the next frame, and people made in the
            // frame still timed by the editor's clock started from another pose, the first 18 s of two runs of the same code
            // apart, 2026-11-07)
            yield return null; yield return null;
            try { while (inner.MoveNext()) yield return inner.Current; }
            finally { Time.captureDeltaTime = keep; }
        }

        // (4 h: with the skin's points filled in, the whole cast ran past 2 h and the test was stopped in its last batch,
        // 2026-11-08)
        [UnityTest, Timeout(14400000), Category("Heavy")]
        public IEnumerator EveryPersonStandsAndMovesLikePeople() => Fixed(EveryPerson());

        private IEnumerator EveryPerson()
        {
#if UNITY_EDITOR
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            var ids = cat != null ? cat.People.Where(e => e != null && e.Prefab != null).Select(e => e.Id).OrderBy(s => s).ToArray() : new string[0];
#else
            var ids = new string[0];
#endif
            var failed = new List<string>();
            var measured = new int[1];
            var done = 0;
            for (var i = 0; i < ids.Length; i += 10)
            {
                var batch = ids.Skip(i).Take(10).ToArray();
                yield return Gate(batch, $"motion_gate_full_{i / 10}", captures: false, failures: failed, assert: false, measured: measured);
                done += batch.Length;
            }
            // one verdict for the whole cast (the lock counts the gate green only on it: docs/PEOPLE_MOTION.md §1.9), with the
            // people it measured (a run stopped in its last batch wrote a verdict of 70 of the 79 as the whole cast's,
            // 2026-11-08: tools/qa/people_gate.mjs holds a verdict short of the cast red)
            Verdict("motion_gate_full", measured[0], failed, done, ids.Length);
            Assert.That(failed, Is.Empty, $"{failed.Count} measures past their limits:\n" + string.Join("\n", failed.Take(80)));
        }

        private sealed class Subject
        {
            public string Id;
            public GameObject Go;
            public Animator A;
            public Ambient Ambient;
            public Gaze Gaze;
            public MotionProbe Probe;
            public Transform Mark;      // a partner's head where the looking states put it
            public GameObject Partner;  // the one they talk with
            public Vector3 Home;
        }

        private sealed class Runner : MonoBehaviour { }

        /// <summary>Waits this long, in frames when the gate's frames are fixed (docs/PEOPLE_MOTION.md §1.9): a wait by
        /// Time.time compared floats whose size depends on how long the editor took to start, so the same wait ended a frame
        /// sooner or later from run to run, every state after it began on another frame and the same code's verdicts differed
        /// (1073 and 1085, 174 lines, 2026-11-07).</summary>
        private static IEnumerator Wait(float seconds)
        {
            if (Time.captureDeltaTime > 0f) { for (int n = Frames(seconds), i = 0; i < n; i++) yield return null; yield break; }
            var t = Time.time; while (Time.time - t < seconds) yield return null;
        }

        private static int Frames(float seconds) => Time.captureDeltaTime > 0f ? Mathf.Max(1, Mathf.RoundToInt(seconds / Time.captureDeltaTime)) : int.MaxValue;

        private IEnumerator Gate(string[] ids, string report, bool captures, List<string> failures = null, bool assert = true, int[] measured = null)
        {
#if UNITY_EDITOR
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            var assets = AssetDatabase.LoadAssetAtPath<WorldAssets>("Assets/SecondFace/World/WorldAssets.asset");
            if (cat == null || cat.People.Length == 0 || assets == null || assets.Locomotion == null) { Assert.Ignore("no Rocketbox catalogue or locomotion built"); yield break; }
            yield return BootTests.Clear();
            foreach (var c in Object.FindObjectsByType<Camera>(FindObjectsSortMode.None)) { c.enabled = false; c.tag = "Untagged"; }
            var root = new GameObject("motion gate");
            var runner = root.AddComponent<Runner>();
            // the ground: flat, and a 10° slope beyond it
            var flat = GameObject.CreatePrimitive(PrimitiveType.Cube);
            flat.name = "flat"; flat.transform.SetParent(root.transform);
            flat.transform.localScale = new Vector3(200f, 1f, 70f); flat.transform.position = new Vector3(0f, -0.5f, 0f);
            var slope = GameObject.CreatePrimitive(PrimitiveType.Cube);
            slope.name = "slope"; slope.transform.SetParent(root.transform);
            slope.transform.localScale = new Vector3(200f, 1f, 30f);
            slope.transform.rotation = Quaternion.Euler(-10f, 0f, 0f);
            slope.transform.position = new Vector3(0f, 0f, 70f) - slope.transform.rotation * new Vector3(0f, 0.5f, 0f);
            var groundMat = flat.GetComponent<Renderer>().sharedMaterial;
            if (groundMat != null) groundMat.color = new Color(0.58f, 0.55f, 0.5f);
            var grounds = new Collider[] { flat.GetComponent<Collider>(), slope.GetComponent<Collider>() };
            var sun = new GameObject("sun").AddComponent<Light>();
            sun.transform.SetParent(root.transform);
            sun.type = LightType.Directional; sun.intensity = 1.6f; sun.shadows = LightShadows.Soft;
            sun.transform.rotation = Quaternion.Euler(45f, 150f, 0f);
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.55f, 0.56f, 0.6f);

            // the people, as the game makes them
            var people = new List<Subject>();
            for (var i = 0; i < ids.Length; i++)
            {
                var prefab = cat.Get(ids[i]);
                if (prefab == null) continue;
                var home = new Vector3((i - (ids.Length - 1) * 0.5f) * Lane, 0f, 0f);
                var go = Object.Instantiate(prefab, home, Quaternion.identity, root.transform);
                go.name = "gate_" + ids[i];
                var p = RbPeople.Of(ids[i]);
                RbDress.Apply(go, RbPeople.DyesFor(p, "gate_" + ids[i], p?.Roles?.FirstOrDefault() ?? "settler", null));
                var a = go.GetComponentInChildren<Animator>();
                Assert.That(a, Is.Not.Null, ids[i] + "'s animator");
                var asPlayer = ids.Length > 1 && i == ids.Length - 1 && report == "motion_gate";
                Ambient amb = null;
                if (asPlayer) Walker.Animate(a, assets.Locomotion);
                else amb = PeopleService.Animate(a, assets.Locomotion, ids[i]);
                a.cullingMode = AnimatorCullingMode.AlwaysAnimate;   // measured every frame, seen or not
                if (amb != null) { amb.MinGap = amb.MaxGap = 1e6f; }   // the gestures are played by the gate, each in turn
                var probe = a.gameObject.AddComponent<MotionProbe>();
                probe.Person = ids[i] + (asPlayer ? " (player)" : "");
                probe.Ground = grounds;
                // the first person, and the first man (their strides differ: one woman's trace hid the men's skate), traced
                var traced = i == 0 || (ids[i].Contains("Male") && !ids.Take(i).Any(x => x.Contains("Male")));
                // (and anyone named in GATE_TRACE, for a look at their frames: "_" and their name in the trace's file name)
                var also = System.Environment.GetEnvironmentVariable("GATE_TRACE");
                var named = !traced && !string.IsNullOrEmpty(also) && also.Split(',').Contains(ids[i]);
                if (traced || named)
                {
                    probe.TracePath = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "test-results", report + (named ? "_" + ids[i] : i == 0 ? "" : "_m") + "_trace.csv"));
                    File.Delete(probe.TracePath.Replace(".csv", "_soles.csv"));   // (it is appended to: each run afresh)
                    probe.TraceState = "";   // every state (the feet, frame by frame)
                    File.WriteAllText(probe.TracePath, "state,t,rootx,rootz,heelL,ballL,ankleLz,heelR,ballR,ankleRz,speed,hipsz,dipL,clearL,liftL,lockL,dipR,clearR,liftR,lockR,sink,low,eL,eR,gL,gR,slipL,slipR,rL,rR,a1L,a1R,poleL,poleR,flexL,flexR,adaptL,adaptR,surfL,surfR,hgapL,hgapR,dL0,dL1,dL2,dL3,dL4,dL5,dR0,dR1,dR2,dR3,dR4,dR5,holdtL,holdbL,holdyL,holdgL,holdtR,holdbR,holdyR,holdgR,a4L,a4R,flankL,flankR,outL,fwdL,outR,fwdR,saLclip,saL0,saL1,saL2,saL3,saL4,saL5,saRclip,saR0,saR1,saR2,saR3,saR4,saR5\n");
                }
                Assert.That(probe.Calibrate(), Is.True, $"{ids[i]}: {probe.Error}");
                var mark = new GameObject("mark_" + ids[i]).transform;
                mark.SetParent(root.transform);
                // (the player's body has no Ambient in the game: it neither idles by a hash nor gestures)
                people.Add(new Subject { Id = ids[i], Go = go, A = a, Ambient = amb, Gaze = a.GetComponent<Gaze>(), Probe = probe, Mark = mark, Home = home });
            }
            Assert.That(people.Count, Is.GreaterThan(0), "no people made");
            yield return Wait(1f);

            void Record(string state, MotionProbe.K? kind) { foreach (var s in people) { s.Probe.State = state; s.Probe.Kind = kind; } }
            void Stop() { foreach (var s in people) s.Probe.Kind = null; }
            void Place(Vector3 offset, float yaw)
            {
                foreach (var s in people)
                {
                    var at = s.Home + offset;
                    var ray = new Ray(at + Vector3.up * 5f, Vector3.down);
                    var y = 0f;
                    foreach (var g in grounds) if (g.Raycast(ray, out var hit, 20f)) y = Mathf.Max(y, hit.point.y);
                    s.Go.transform.SetPositionAndRotation(new Vector3(at.x, y, at.z), Quaternion.Euler(0f, yaw, 0f));
                }
            }

            // 1. standing: the four idles on the flat
            for (var idle = 0; idle < Ambient.IdleCount; idle++)
            {
                foreach (var s in people) s.A.SetFloat("Idle", idle);
                yield return Wait(1.2f);
                Record("idle" + idle, MotionProbe.K.Stand);
                yield return Wait(6f);
                Stop();
            }
            // (what the foot plant and the arm clearance did, for the report: a goal the foot did not reach, a body without
            // its torso measured)
            foreach (var s in people)
            {
                var fp = s.A.GetComponent<FootPlant>(); var ac = s.A.GetComponent<ArmClearance>();
                Debug.Log($"HumanMotionGate systems: {s.Probe.Person}: foot goals missed by {(fp != null ? fp.GoalError * 100f : Vector2.zero)} cm, sink {(fp != null ? fp.Sink * 100f : 0f):0.0} cm; arm clearance {(ac != null && ac.Ready ? (ac.SkinReady ? "ready on the skin" : "ready on the SECTIONS (no BodySkin)") : "NOT READY")}, depth {(ac != null ? ac.Depth() * 100f : 0f):0.0} cm, turned {(ac != null ? ac.Turned : Vector2.zero)}; cost {(ac != null && ac.CostFrames > 0 ? ac.CostMs / ac.CostFrames : 0):0.000} ms a frame, skin posed {(ac != null && ac.CostFrames > 0 && ac.Skin != null ? (float)ac.Skin.Poses / ac.CostFrames : 0):0.0}x a frame at {(ac != null && ac.Skin is { Poses: > 0 } sk2 ? sk2.PoseMs / sk2.Poses : 0):0.000} ms, {(ac != null && ac.Skin != null ? ac.Skin.Count : 0)} points, {(ac != null && ac.Skin != null && ac.CostFrames > 0 ? ac.Skin.DepthCalls / ac.CostFrames : 0)} depth asks a frame; stages {(ac != null && ac.CostFrames > 0 ? string.Join("/", ac.StageMs.Select(x => (x / ac.CostFrames).ToString("0.00"))) : "")} ms");
            }
            // 2. on the slope (facing up it), then back
            Place(new Vector3(0f, 0f, 70f), 0f);
            foreach (var s in people) s.A.SetFloat("Idle", 0f);
            yield return Wait(1.5f);
            Record("slope", MotionProbe.K.Stand);
            yield return Wait(5f);
            Stop();
            Place(Vector3.zero, 0f);
            yield return Wait(1.5f);
            // 3. looking at someone round them (the gaze alone)
            foreach (var angle in new[] { 0, 45, 90, 135 })
            {
                foreach (var s in people)
                {
                    s.Mark.position = s.Go.transform.position + Quaternion.Euler(0f, angle, 0f) * Vector3.forward * 1.3f + Vector3.up * 1.6f;
                    if (s.Gaze != null) s.Gaze.Target = s.Mark;
                }
                yield return Wait(1.2f);
                Record("look" + angle, MotionProbe.K.Stand);
                yield return Wait(3f);
                Stop();
            }
            foreach (var s in people) if (s.Gaze != null) s.Gaze.Target = null;
            yield return Wait(1f);
            // 4. each gesture, then the moments after it
            foreach (var g in Gestures)
            {
                foreach (var s in people) if (s.Ambient != null) s.Ambient.Gesture(g);
                Record("gesture:" + g, MotionProbe.K.Gesture);
                yield return Wait(0.5f);
                for (int n = Frames(15f), f0 = 0; f0 < n && people.Any(s => Playing(s.A)); f0++) yield return null;
                Stop();
                yield return Wait(0.6f);
                Record("after:" + g, MotionProbe.K.Stand);
                yield return Wait(2f);
                Stop();
            }
            // 5. the conversation turn: someone behind them speaks; they turn as the game turns them
            foreach (var s in people)
            {
                s.Mark.position = s.Go.transform.position - s.Go.transform.forward * 1.3f + Vector3.up * 1.6f;
                if (s.Gaze != null) s.Gaze.Target = s.Mark;
            }
            yield return Wait(0.5f);
            Record("turn", MotionProbe.K.Turn);
            foreach (var s in people) runner.StartCoroutine(Walkabout.Face(s.Go.transform, s.Mark.position));
            yield return Wait(1.1f);
            foreach (var s in people)
            {
                var to = s.Mark.position - s.Probe.HeadPosition; to.y = 0f;
                Add(s.Probe, "turn", "T1", Vector3.Angle(s.Probe.ChestForward(), to.normalized));
            }
            Stop();
            foreach (var s in people) if (s.Gaze != null) s.Gaze.Target = null;
            // 6. walking, jogging, sneaking: straight from a standstill to a stop, and round a 3 m bend
            Camera walkCam = null;
            foreach (var (name, v, sneak, accel) in new[] { ("sneak", 0.85f, true, 6f), ("walk", Townsfolk.WalkSpeed, false, 6f), ("walk_player", Walker.WalkSpeed, false, Walker.Acceleration), ("jog", Walker.JogSpeed, false, Walker.Acceleration) })
            {
                Place(new Vector3(0f, 0f, -30f), 0f);
                foreach (var s in people) { s.A.SetBool("Sneak", sneak); s.A.SetFloat("Speed", 0f); }
                yield return Wait(1.2f);
                Record("walk:" + name, MotionProbe.K.Walk);
                var speed = 0f;
                var travelled = 0f;
                var frames = 0; var nextFrame = 0f;
                var length = Mathf.Min(45f, v * 7f);
                while (travelled < length)
                {
                    var dt = Time.deltaTime;
                    var left = length - travelled;
                    var stopping = speed * speed / (2f * accel);
                    speed = left <= stopping ? Mathf.Max(0.05f, speed - accel * dt) : Mathf.Min(v, speed + accel * dt);
                    var step = Mathf.Min(left, speed * dt);
                    travelled += step;
                    foreach (var s in people)
                    {
                        s.Go.transform.position += Vector3.forward * step;
                        Pace.Set(s.A, speed, sneak, 0.12f, dt);   // as the game's walker sets it
                    }
                    if (captures && (name is "walk" or "jog") && travelled > length * 0.45f && frames < 10 && Time.time >= nextFrame)
                    {
                        nextFrame = Time.time + (name == "jog" ? 0.06f : 0.1f);
                        var s0 = people[0].Go.transform;
                        walkCam ??= new GameObject("walk camera") { tag = "MainCamera" }.AddComponent<Camera>();
                        walkCam.fieldOfView = 30f; walkCam.clearFlags = CameraClearFlags.SolidColor; walkCam.backgroundColor = new Color(0.7f, 0.75f, 0.8f);
                        walkCam.transform.SetPositionAndRotation(s0.position + Vector3.up * 0.95f - Vector3.right * 4.2f + Vector3.forward * 0.2f, Quaternion.LookRotation(Vector3.right, Vector3.up));
                        var keep = Time.timeScale; Time.timeScale = 0f;   // the frame held while it is captured
                        yield return ScreenshotTests.Capture($"motion_{name}_{frames}", 700, 700);
                        Time.timeScale = keep;
                        frames++;
                        continue;
                    }
                    yield return null;
                }
                foreach (var s in people) s.A.SetFloat("Speed", 0f);
                Stop();
                if (walkCam != null) { Object.Destroy(walkCam.gameObject); walkCam = null; }
                yield return Wait(1f);
                if (name is "walk" or "jog")
                {
                    // round a bend of 3 m radius, at speed
                    Place(new Vector3(0f, 0f, -10f), -90f);
                    var centres = people.Select(s => s.Go.transform.position + Vector3.forward * 3f).ToList();
                    var theta = 0f;
                    foreach (var s in people) Pace.Set(s.A, v, false, 0f);
                    yield return Wait(0.8f);
                    Record("bend:" + name, MotionProbe.K.Walk);
                    for (int n1 = Frames(6f), f1 = 0; f1 < n1; f1++)
                    {
                        var dt = Time.deltaTime;
                        theta += v / 3f * dt;
                        for (var i = 0; i < people.Count; i++)
                        {
                            var s = people[i];
                            var pos = centres[i] + new Vector3(-Mathf.Sin(theta), 0f, -Mathf.Cos(theta)) * 3f;
                            var tangent = new Vector3(-Mathf.Cos(theta), 0f, Mathf.Sin(theta));
                            s.Go.transform.SetPositionAndRotation(pos, Quaternion.LookRotation(tangent, Vector3.up));
                            Pace.Set(s.A, v, false, 0.12f, dt);
                        }
                        yield return null;
                    }
                    Stop();
                    foreach (var s in people) s.A.SetFloat("Speed", 0f);
                    yield return Wait(1f);
                }
                foreach (var s in people) s.A.SetBool("Sneak", false);
            }
            // 7. two people talking, as the game sets them: the other turned to face, both looking at each other's head, the
            // opening gesture, then the talk
            Place(Vector3.zero, 0f);
            yield return Wait(1f);
            var partnerId = cat.Get("Male_Adult_01") != null ? "Male_Adult_01" : people[0].Id;
            foreach (var s in people)
            {
                var pp = Object.Instantiate(cat.Get(partnerId), s.Go.transform.position + Vector3.forward * 1.3f + Vector3.right * 0.25f, Quaternion.Euler(0f, 180f, 0f), root.transform);
                var pa = pp.GetComponentInChildren<Animator>();
                var pam = PeopleService.Animate(pa, assets.Locomotion, "partner_" + s.Id);
                pam.MinGap = pam.MaxGap = 1e6f;
                pa.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                s.Partner = pp;
            }
            yield return Wait(0.3f);
            foreach (var s in people) runner.StartCoroutine(Walkabout.Face(s.Go.transform, s.Partner.transform.position));
            yield return Wait(0.8f);
            foreach (var s in people)
            {
                var ph = s.Partner.GetComponentInChildren<Animator>().GetBoneTransform(HumanBodyBones.Head);
                if (s.Gaze != null) s.Gaze.Target = ph;
                var pg = s.Partner.GetComponentInChildren<Gaze>();
                if (pg != null) pg.Target = s.A.GetBoneTransform(HumanBodyBones.Head);
                if (s.Ambient != null) s.Ambient.Gesture("talk");
            }
            Record("gesture:talk (conversation)", MotionProbe.K.Gesture);
            yield return Wait(0.5f);
            for (int n2 = Frames(15f), f2 = 0; f2 < n2 && people.Any(s => Playing(s.A)); f2++) yield return null;
            Stop();
            yield return Wait(0.6f);
            Record("talk", MotionProbe.K.Stand);
            yield return Wait(4f);
            foreach (var s in people)
            {
                var to = s.Partner.transform.position - s.Go.transform.position; to.y = 0f;
                Add(s.Probe, "talk", "T2", Vector3.Angle(s.Probe.ChestForward(), to.normalized));
                Add(s.Probe, "talk", "T3", to.magnitude);
            }
            Stop();

            // the captures: the game camera (default and closest zoom), the conversation view, human height
            if (captures)
            {
                var cam = new GameObject("gate camera") { tag = "MainCamera" }.AddComponent<Camera>();
                cam.transform.SetParent(root.transform);
                cam.clearFlags = CameraClearFlags.SolidColor; cam.backgroundColor = new Color(0.7f, 0.75f, 0.8f);
                cam.nearClipPlane = 0.2f; cam.farClipPlane = 500f;
                // the conversation view, as the game frames it
                {
                    var a0 = people[0];
                    var shots = ConversationCamera.Begin(cam, a0.Go.transform, a0.Partner.transform, 0f);
                    yield return Wait(0.3f);
                    yield return ScreenshotTests.Capture("motion_conversation", 1600, 720);
                    shots.End();
                    yield return Wait(0.3f);
                    foreach (var b in cam.GetComponents<Behaviour>()) if (b.GetType().Name == "CinemachineBrain") Object.Destroy(b);
                    yield return null;
                }
                foreach (var s in people) { Object.Destroy(s.Partner); if (s.Gaze != null) s.Gaze.Target = null; }
                yield return Wait(1f);
                foreach (var k in report == "motion_gate_pick" ? Enumerable.Range(0, people.Count).ToArray() : new[] { 0, people.Count / 2, people.Count - 1 })
                {
                    var s = people[k];
                    var focus = s.Go.transform.position + Vector3.up * 1.3f;
                    foreach (var (dist, label) in new[] { (OrbitRig.MinDistance, "8m"), (20f, "20m") })
                    {
                        cam.fieldOfView = 28f;
                        var rot = Quaternion.Euler(50f, 210f, 0f);
                        cam.transform.SetPositionAndRotation(focus - rot * Vector3.forward * dist, rot);
                        yield return ScreenshotTests.Capture($"motion_game_{label}_{s.Id}", 1600, 900);
                    }
                    cam.fieldOfView = 30f;
                    var side = Quaternion.LookRotation(-s.Go.transform.right, Vector3.up);
                    cam.transform.SetPositionAndRotation(s.Go.transform.position + Vector3.up * 0.95f + s.Go.transform.right * 4.2f, side);
                    yield return ScreenshotTests.Capture($"motion_side_{s.Id}", 1000, 1000);
                    var front = Quaternion.LookRotation(-s.Go.transform.forward, Vector3.up);
                    cam.transform.SetPositionAndRotation(s.Go.transform.position + Vector3.up * 0.95f + s.Go.transform.forward * 4.2f, front);
                    yield return ScreenshotTests.Capture($"motion_front_{s.Id}", 1000, 1000);
                }
                Object.Destroy(cam.gameObject);
            }

            // the verdict
            var fails = failures ?? new List<string>();
            var table = new List<Dictionary<string, object>>();
            foreach (var s in people)
            {
                if (s.Probe.Error != null) fails.Add($"{s.Probe.Person}: {s.Probe.Error}");
                foreach (var (st, (d, where)) in s.Probe.WorstClip) Debug.Log($"HumanMotionGate clip: {s.Probe.Person} {st}: {where}");
                foreach (var (st, (d, where)) in s.Probe.WorstHand) Debug.Log($"HumanMotionGate hand off: {s.Probe.Person} {st}: {where}");
                if (s.Probe.SkinFit != null) Debug.Log($"HumanMotionGate skin fit: {s.Probe.Person}: {s.Probe.SkinFit}; {s.Probe.SkinWhy}");
                foreach (var (st, where) in s.Probe.ArmWhere) Debug.Log($"HumanMotionGate arm contact: {s.Probe.Person} {st}: {where}");
                foreach (var (st, pk) in s.Probe.SwingPeak) Debug.Log($"HumanMotionGate swing peak: {s.Probe.Person} {st}: {pk.Arm} {pk.A:0.0}° (forward {pk.Sag:0.0}, out {pk.Side:0.0})");
                foreach (var (st, (nn, rest, sum)) in s.Probe.ArmDiag)
                {
                    if (nn == 0) continue;
                    string M(int q, float scale = 1f) => (sum[q] / nn * scale).ToString("0.0");
                    Debug.Log($"HumanMotionGate arms: {s.Probe.Person} {st}: resting {rest * 100 / nn}%, L gapE {M(0, 100)} gapH {M(1, 100)} cm in {M(4)} fwd {M(5)} carry {M(6)} out {M(7)} roll {M(12)} back {M(14)}; R gapE {M(2, 100)} gapH {M(3, 100)} cm in {M(10)} fwd {M(11)} carry {M(8)} out {M(9)} roll {M(13)} back {M(15)}");
                }
                foreach (var (state, measures) in s.Probe.Samples)
                    foreach (var lim in LimitsFor(state))
                    {
                        if (!measures.TryGetValue(lim.M, out var vals) || vals.Count == 0) continue;
                        var sorted = vals.OrderBy(x => x).ToList();
                        float P(double q) => sorted[Mathf.Clamp((int)System.Math.Round(q * (sorted.Count - 1)), 0, sorted.Count - 1)];
                        var p2 = P(0.02); var p50 = P(0.5); var p98 = P(0.98); var min = sorted[0]; var max = sorted[^1];
                        var mean = vals.Average();
                        var over = float.IsInfinity(lim.Over) ? 0f : vals.Count(x => x > lim.Over) / (float)vals.Count;
                        var why = new List<string>();
                        if (p98 > lim.Hi) why.Add($"p98 {p98:0.0} > {lim.Hi:0.0}");
                        if (p2 < lim.Lo) why.Add($"p2 {p2:0.0} < {lim.Lo:0.0}");
                        if (max > lim.CapHi) why.Add($"max {max:0.0} > cap {lim.CapHi:0.0}");
                        if (min < lim.CapLo) why.Add($"min {min:0.0} < cap {lim.CapLo:0.0}");
                        if (mean > lim.MeanMax) why.Add($"mean {mean:0.00} > {lim.MeanMax:0.00}");
                        if (over > lim.OverFrac) why.Add($"{over:P0} of frames over {lim.Over:0}");
                        table.Add(new Dictionary<string, object>
                        {
                            ["person"] = s.Probe.Person, ["state"] = state, ["measure"] = lim.M, ["n"] = vals.Count, ["p2"] = p2, ["p50"] = p50,
                            ["p98"] = p98, ["min"] = min, ["max"] = max, ["mean"] = mean, ["over"] = over, ["pass"] = why.Count == 0, ["why"] = string.Join("; ", why),
                        });
                        if (why.Count > 0) fails.Add($"{s.Probe.Person} {state} {lim.M}: {string.Join("; ", why)}");
                    }
            }
            var dir = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "test-results"));
            Directory.CreateDirectory(dir);
            File.WriteAllText(Path.Combine(dir, report + ".json"), JsonConvert.SerializeObject(table, Formatting.Indented));
            File.WriteAllText(Path.Combine(dir, report + ".md"), Markdown(table));
            Debug.Log($"HumanMotionGate {report}: {table.Count} measures, {table.Count(r => !(bool)r["pass"])} past their limits\n" + string.Join("\n", fails.Take(200)));
            if (measured != null) measured[0] += table.Count;
            if (report == "motion_gate") Verdict(report, table.Count, fails, ids.Length, ids.Length);
            Object.Destroy(root);
            yield return null;
            if (assert) Assert.That(fails, Is.Empty, $"{fails.Count} measures past their limits (docs/PEOPLE_MOTION.md):\n" + string.Join("\n", fails.Take(80)));
#else
            Assert.Ignore("editor only");
            yield break;
#endif
        }

        /// <summary>The gate's verdict where the lock reads it (docs/qa/gates/motion_gate.json; tools/qa/people_gate.mjs, run by
        /// npm run check and CI): while it is red nothing with a person in it goes to the owner (docs/PEOPLE_MOTION.md §1.8).</summary>
        private static void Verdict(string report, int measures, List<string> fails, int people, int cast)
        {
            var path = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "..", "docs", "qa", "gates", "motion_gate.json"));
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            string lastGreen = null;
            try { if (File.Exists(path)) lastGreen = Newtonsoft.Json.Linq.JObject.Parse(File.ReadAllText(path)).Value<string>("lastGreen"); } catch (System.Exception) { }
            var now = System.DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ");
            var green = fails.Count == 0;
            var verdict = new Dictionary<string, object>
            {
                ["date"] = now, ["set"] = report, ["people"] = InputsHash("people"), ["measures"] = InputsHash("measures"),
                ["bodies"] = people, ["cast"] = cast, ["green"] = green, ["cells"] = measures, ["failures"] = fails.Count,
                // each measure's failures (the lock holds every later verdict to no more of any)
                ["byMeasure"] = fails.Select(f => f.Substring(0, Mathf.Max(0, f.IndexOf(": "))).Split(' ').Last()).GroupBy(m => m).OrderBy(g => g.Key, System.StringComparer.Ordinal)
                    .ToDictionary(g => g.Key, g => g.Count()),
                ["lastGreen"] = green ? now : lastGreen, ["failing"] = fails.Take(60).ToList(),
            };
            File.WriteAllText(path, JsonConvert.SerializeObject(verdict, Formatting.Indented));
        }

        /// <summary>What the verdict was measured on (docs/qa/gates/motion_gate_inputs.json, as tools/qa/people_gate.mjs
        /// hashes it): SHA-256 over each file's path and the SHA-256 of its bytes, in path order. A verdict whose hashes are
        /// not the tree's is stale and counts as red.</summary>
        public static string InputsHash(string key)
        {
            var root = Path.GetFullPath(Path.Combine(Application.dataPath, "..", ".."));
            var spec = Newtonsoft.Json.Linq.JObject.Parse(File.ReadAllText(Path.Combine(root, "docs", "qa", "gates", "motion_gate_inputs.json")));
            var files = new SortedSet<string>(System.StringComparer.Ordinal);
            foreach (var pattern in spec[key].Select(t => (string)t))
            {
                var paths = new List<string> { root };
                var segs = pattern.Split('/');
                for (var i = 0; i < segs.Length; i++)
                {
                    var last = i == segs.Length - 1;
                    var re = new System.Text.RegularExpressions.Regex("^" + System.Text.RegularExpressions.Regex.Escape(segs[i]).Replace("\\*", "[^/]*") + "$");
                    var next = new List<string>();
                    foreach (var p in paths)
                    {
                        if (!Directory.Exists(p)) continue;
                        var names = (last ? Directory.GetFiles(p) : Directory.GetDirectories(p)).Select(Path.GetFileName).OrderBy(n => n, System.StringComparer.Ordinal);
                        foreach (var n in names) if (re.IsMatch(n)) next.Add(Path.Combine(p, n));
                    }
                    paths = next;
                }
                foreach (var f in paths) files.Add(Path.GetRelativePath(root, f).Replace('\\', '/'));
            }
            using var sha = System.Security.Cryptography.SHA256.Create();
            var sb = new StringBuilder();
            foreach (var rel in files)
            {
                var h = sha.ComputeHash(File.ReadAllBytes(Path.Combine(root, rel)));
                sb.Append(rel).Append('\n').Append(System.BitConverter.ToString(h).Replace("-", "").ToLowerInvariant()).Append('\n');
            }
            return System.BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(sb.ToString()))).Replace("-", "").ToLowerInvariant();
        }

        /// <summary>A gesture is still playing on the gesture layer.</summary>
        private static bool Playing(Animator a)
        {
            var layer = a.GetLayerIndex(Ambient.GestureLayer);
            if (layer < 0) return false;
            return a.IsInTransition(layer) || !a.GetCurrentAnimatorStateInfo(layer).IsName("none") || a.GetLayerWeight(layer) > 0.05f;
        }

        private static void Add(MotionProbe probe, string state, string measure, float value)
        {
            if (!probe.Samples.TryGetValue(state, out var m)) probe.Samples[state] = m = new Dictionary<string, List<float>>();
            if (!m.TryGetValue(measure, out var l)) m[measure] = l = new List<float>();
            l.Add(value);
        }

        /// <summary>Each measure's worst person and state, and every failure.</summary>
        private static string Markdown(List<Dictionary<string, object>> table)
        {
            var sb = new StringBuilder();
            sb.AppendLine("# Motion and posture gate (docs/PEOPLE_MOTION.md)");
            sb.AppendLine();
            sb.AppendLine($"{table.Count} measures; {table.Count(r => !(bool)r["pass"])} past their limits.");
            sb.AppendLine();
            sb.AppendLine("| Measure | Worst person | State | p2 | p50 | p98 | min | max | mean | Pass |");
            sb.AppendLine("|---|---|---|---|---|---|---|---|---|---|");
            foreach (var g in table.GroupBy(r => (string)r["measure"]).OrderBy(g => g.Key))
            {
                var worst = g.OrderBy(r => (bool)r["pass"]).ThenByDescending(r => System.Convert.ToSingle(r["p98"])).First();
                sb.AppendLine($"| {g.Key} | {worst["person"]} | {worst["state"]} | {worst["p2"]:0.0} | {worst["p50"]:0.0} | {worst["p98"]:0.0} | {worst["min"]:0.0} | {worst["max"]:0.0} | {worst["mean"]:0.00} | {(g.All(r => (bool)r["pass"]) ? "yes" : $"**no** ({g.Count(r => !(bool)r["pass"])})")} |");
            }
            sb.AppendLine();
            sb.AppendLine("## Failures");
            foreach (var r in table.Where(r => !(bool)r["pass"]))
                sb.AppendLine($"- {r["person"]} · {r["state"]} · {r["measure"]}: {r["why"]}");
            return sb.ToString();
        }
    }
}
