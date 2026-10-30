using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using NUnit.Framework;
using Newtonsoft.Json;
using UnityEngine;
using UnityEngine.TestTools;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace SecondFace.Tests
{
    /// <summary>
    /// The plausibility gate's 3D half (docs/PEOPLE_REALISM.md §3.1): every person made as the game makes them (the base,
    /// their look by <see cref="SecondFace.Game.People.LookView"/>), their body baked at rest and measured as ANSUR II
    /// measured real people: head breadth (euryon to euryon, above the ears), head length (glabella to opisthocranion),
    /// bizygomatic breadth, face height (sellion to menton), interpupillary breadth, neck circumference (just under the
    /// chin) and stature, in millimetres. Shale's people and a sample of every ancestry, sex and age. Written to
    /// test-results/people_measures.json for tools/unity/people/gate/gate.py, which holds them to the real ranges.
    /// </summary>
    public class PeopleGateTests
    {
        public sealed class Measured
        {
            public string Id, Name, Sex, Heritage, Source;
            public double Age;
            public Dictionary<string, double> Mm = new();
            /// <summary>Their slider values as the sculptor applies them (<see cref="SecondFace.Core.Npc.Looks.Shape"/>), and
            /// the stature scale: the response model predicts their measures from these.</summary>
            public Dictionary<string, float> Sliders = new();
            public double Scale;
        }

        /// <summary>The response of the head and neck to each of the sculptor's shapes (docs/PEOPLE_REALISM.md §4.1-4.2): each
        /// base with no slider set, then with each slider alone at its high end and (paired) its low end, each head dumped to
        /// test-results/heads/resp_&lt;base&gt;_&lt;slider&gt;_&lt;p|n&gt;.bin for tools/unity/people/gate/response.py and its
        /// portrait to test-results/portraits for response2d.py.</summary>
        [UnityTest, Timeout(1800000)]
        public IEnumerator MeasureShapeResponses()
        {
            GameObject F = null, M = null;
#if UNITY_EDITOR
            F = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/SecondFace/Prefabs/people/player_f.prefab");
            M = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/SecondFace/Prefabs/people/player_m.prefab");
#endif
            if (F == null || M == null) { Assert.Ignore("the bases are not built"); yield break; }
            var dir = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "test-results", "heads"));
            var studio = System.Environment.GetEnvironmentVariable("SF_GATE_PORTRAITS") != "0" ? new Studio() : null;
            var n = 0;
            // the whole body's height per case (the heads are cut under the chin): a longer neck or head makes a taller body
            var statures = new Dictionary<string, double>();
            foreach (var (name, model) in new[] { ("f", F), ("m", M) })
            {
                var go = Object.Instantiate(model, new Vector3(900f, 0f, 0f), Quaternion.identity);
                var face = go.GetComponentInChildren<SecondFace.Game.People.FaceSculpt>();
                Assert.That(face, Is.Not.Null, "the base carries the sculptor");
                var cases = new List<(string Tag, Dictionary<string, float> Values)> { ("neutral", new Dictionary<string, float>()) };
                foreach (var sl in SecondFace.Core.Npc.Sculpt.All)
                {
                    if (sl.Id == "body-child") continue;
                    cases.Add((sl.Id + "_p", new Dictionary<string, float> { [sl.Id] = 1f }));
                    if (sl.Paired) cases.Add((sl.Id + "_n", new Dictionary<string, float> { [sl.Id] = -1f }));
                }
                foreach (var (tag, values) in cases)
                {
                    // through the look, as the people are made (their brows, skin and hair as LookView draws them): a plain
                    // look with this one slider set
                    var look = new SecondFace.Core.Npc.PlayerLook { Body = name };
                    foreach (var kv in values)
                    {
                        if (kv.Key == "body-weight") look.Build = kv.Value;
                        else if (kv.Key == "body-muscle") look.Muscle = kv.Value;
                        else if (kv.Key.StartsWith("body-")) look.Shape[kv.Key] = kv.Value;
                        else look.Face[kv.Key] = kv.Value;
                    }
                    SecondFace.Game.People.LookView.Apply(go, look);
                    yield return null;
                    var mm = Measure(go, 1f, Path.Combine(dir, $"resp_{name}_{tag}.bin"));
                    if (mm != null) { n++; statures[$"resp_{name}_{tag}"] = mm["stature"]; }
                    // and its portrait, for the landmarks' response (response2d.py)
                    if (mm != null && studio != null) studio.Shoot(go, $"resp_{name}_{tag}");
                }
                Object.Destroy(go);
            }
            studio?.Dispose();
            File.WriteAllText(Path.Combine(dir, "resp_statures.json"), JsonConvert.SerializeObject(statures, Formatting.Indented));
            Debug.Log($"PeopleGate: shape responses measured {n}");
            Assert.That(n, Is.GreaterThan(100));
        }

        [UnityTest, Timeout(1800000)]
        public IEnumerator MeasureThePeople()
        {
            GameObject F = null, M = null;
#if UNITY_EDITOR
            F = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/SecondFace/Prefabs/people/player_f.prefab");
            M = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/SecondFace/Prefabs/people/player_m.prefab");
#endif
            if (F == null || M == null) { Assert.Ignore("the bases are not built"); yield break; }
            UiTests.Content();
            var who = new List<(string Id, string Name, bool Male, double Age, SecondFace.Core.Npc.PlayerLook Look, string Source)>();
            var map = SecondFace.Core.Content.Registry.Maps["shale"];
            foreach (var p in map.Npcs)
            {
                if (!SecondFace.Core.Content.Registry.Npcs.TryGetValue(p.Def, out var def)) continue;
                var male = SecondFace.Core.Npc.Routine.Male(def.Look);
                who.Add((p.Id ?? def.Id, def.Name, male, def.Look?.Age ?? 35, SecondFace.Game.Play.PeopleService.LookOf(def, male), "shale"));
            }
            foreach (var x in SecondFace.Core.Npc.Extras.Of(map))
                who.Add((x.Def.Id, x.Def.Name, x.Male, x.Def.Look.Age ?? 35, x.Look, "shale_extra"));
            // and a sample of the Reach: every people, both sexes, four ages, three each
            foreach (var c in SecondFace.Core.Npc.Bodies.Clusters)
                foreach (var male in new[] { false, true })
                    foreach (var age in new[] { 22.0, 35.0, 50.0, 65.0 })
                        for (var k = 0; k < 3; k++)
                        {
                            var id = $"gate_{c.Id}_{(male ? "m" : "f")}_{age:0}_{k}";
                            who.Add((id, id, male, age, SecondFace.Core.Npc.Bodies.For(id, male, age, "settler", ancestry: c.Id), "sample"));
                        }
            var only = System.Environment.GetEnvironmentVariable("SF_GATE_LIMIT");
            if (int.TryParse(only, out var limit)) who = who.Take(limit).ToList();

            var results = new List<Measured>();
            var failed = 0;
            var studio = System.Environment.GetEnvironmentVariable("SF_GATE_PORTRAITS") != "0" ? new Studio() : null;
            for (var i = 0; i < who.Count; i++)
            {
                var w = who[i];
                var go = Object.Instantiate(w.Male ? M : F, new Vector3(500f + i * 3f, 0f, 0f), Quaternion.identity);
                go.transform.localScale = Vector3.one;   // measured at the base's scale, then scaled by their stature
                SecondFace.Game.People.LookView.Apply(go, w.Look);
                yield return null;
                var mm = Measure(go, SecondFace.Game.People.LookView.Scale(w.Look), Path.GetFullPath(Path.Combine(Application.dataPath, "..", "test-results", "heads", w.Id + ".bin")));
                if (mm == null) failed++;
                else results.Add(new Measured { Id = w.Id, Name = w.Name, Sex = w.Male ? "m" : "f", Heritage = w.Look.Heritage, Age = w.Age, Source = w.Source, Mm = mm,
                                                Sliders = SecondFace.Core.Npc.Looks.Shape(w.Look), Scale = SecondFace.Game.People.LookView.Scale(w.Look) });
                if (studio != null && mm != null)
                {
                    // scaled to their stature as in the game: as they look (portraits_look, the boards), and with no beard
                    // for the landmarks (portraits: a beard hides the mouth's corners and the chin and widens the face's
                    // outline, so the face's own proportions are measured bare, R5)
                    go.transform.localScale = Vector3.one * SecondFace.Game.People.LookView.Scale(w.Look);
                    yield return null;
                    studio.Shoot(go, w.Id, "portraits_look");
                    var beard = w.Look.Beard;
                    if (beard != null)
                    {
                        w.Look.Beard = null;
                        SecondFace.Game.People.LookView.Apply(go, w.Look);
                        yield return null;
                        w.Look.Beard = beard;
                    }
                    studio.Shoot(go, w.Id);
                }
                Object.Destroy(go);
                if (i % 20 == 19) yield return null;
            }
            studio?.Dispose();
            var path = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "test-results", "people_measures.json"));
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            File.WriteAllText(path, JsonConvert.SerializeObject(results, Formatting.Indented));
            Debug.Log($"PeopleGate: measured {results.Count} people ({failed} could not be measured) -> {path}");
            Assert.That(failed, Is.EqualTo(0), "everyone measurable");
        }

        /// <summary>The portrait for the 2D half (faces2d.py against FairFace), as photographs are taken: an 85 mm lens at
        /// 1.6 m (16 degrees vertical) square to the face at eye height, a soft key from above the camera's left, a fill from
        /// its right, a plain grey ground. Shoots the person last measured (<see cref="Measure"/> finds their eyes) to
        /// test-results/portraits/&lt;name&gt;.png.</summary>
        private sealed class Studio : System.IDisposable
        {
            private readonly Camera _cam;
            private readonly RenderTexture _rt;
            private readonly Light _key, _fill;

            public Studio()
            {
                _cam = new GameObject("gate_camera").AddComponent<Camera>();
                _cam.fieldOfView = 16.1f; _cam.nearClipPlane = 0.1f; _cam.farClipPlane = 10f;
                _cam.clearFlags = CameraClearFlags.SolidColor; _cam.backgroundColor = new Color(0.42f, 0.43f, 0.45f);
                _rt = new RenderTexture(512, 640, 24, RenderTextureFormat.ARGB32); _cam.targetTexture = _rt;
                foreach (var l in Object.FindObjectsByType<Light>(FindObjectsSortMode.None)) l.enabled = false;
                _key = new GameObject("gate_key").AddComponent<Light>(); _key.type = LightType.Directional; _key.intensity = 1.1f;
                _fill = new GameObject("gate_fill").AddComponent<Light>(); _fill.type = LightType.Directional; _fill.intensity = 0.45f;
                RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat; RenderSettings.ambientLight = new Color(0.45f, 0.45f, 0.47f);
            }

            public void Shoot(GameObject go, string name, string folder = "portraits")
            {
                if (!_eyes.HasValue) return;
                var (eye, fwd) = _eyes.Value;
                var at = go.transform.TransformPoint(eye);
                var dir = go.transform.TransformDirection(fwd);
                _cam.transform.position = at + dir * 1.6f;
                _cam.transform.LookAt(at);
                _key.transform.rotation = _cam.transform.rotation * Quaternion.Euler(28f, 30f, 0f);
                _fill.transform.rotation = _cam.transform.rotation * Quaternion.Euler(8f, -35f, 0f);
                _cam.Render();
                var prev = RenderTexture.active; RenderTexture.active = _rt;
                var tex = new Texture2D(_rt.width, _rt.height, TextureFormat.RGB24, false);
                tex.ReadPixels(new Rect(0, 0, _rt.width, _rt.height), 0, 0); tex.Apply();
                RenderTexture.active = prev;
                var png = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "test-results", folder, name + ".png"));
                Directory.CreateDirectory(Path.GetDirectoryName(png));
                File.WriteAllBytes(png, tex.EncodeToPNG());
                Object.Destroy(tex);
            }

            public void Dispose()
            {
                _cam.targetTexture = null;
                _rt.Release();
                Object.Destroy(_cam.gameObject); Object.Destroy(_key.gameObject); Object.Destroy(_fill.gameObject);
            }
        }

        /// <summary>The last measured person's eye centre and facing, in their model's space (for the portrait).</summary>
        private static (Vector3 Eye, Vector3 Fwd)? _eyes;

        /// <summary>The ANSUR II measures of a person (mm), their body baked at rest; null if the landmarks were not found.</summary>
        public static Dictionary<string, double> Measure(GameObject go, float scale, string dump = null)
        {
            _eyes = null;
            var anim = go.GetComponent<Animator>();
            var body = go.GetComponentsInChildren<SkinnedMeshRenderer>(true).FirstOrDefault(r => r.name.StartsWith("Body_") && r.name.Contains("LOD0"))
                       ?? go.GetComponentsInChildren<SkinnedMeshRenderer>(true).FirstOrDefault(r => r.name.StartsWith("Body_"));
            var eyes = go.GetComponentsInChildren<SkinnedMeshRenderer>(true).FirstOrDefault(r => r.name.StartsWith("Eyes_") && r.name.Contains("LOD0"))
                       ?? go.GetComponentsInChildren<SkinnedMeshRenderer>(true).FirstOrDefault(r => r.name.StartsWith("Eyes_"));
            if (anim == null || body == null || eyes == null) return null;
            var head = anim.GetBoneTransform(HumanBodyBones.Head);
            if (head == null) return null;
            // baked at rest (the shipped meshes are not CPU-readable; the baked copy is)
            int[] tris = null;
            Vector3[] Baked(SkinnedMeshRenderer r, bool keepTris)
            {
                var m = new Mesh();
                r.BakeMesh(m, true);
                var v = m.vertices;
                if (keepTris) tris = m.triangles;
                var l2w = Matrix4x4.TRS(r.transform.position, r.transform.rotation, Vector3.one);
                for (var k = 0; k < v.Length; k++) v[k] = go.transform.InverseTransformPoint(l2w.MultiplyPoint3x4(v[k]));
                Object.Destroy(m);
                return v;
            }
            var V = Baked(body, true);
            var E = Baked(eyes, false);
            if (E.Length < 10) return null;
            // the frame: the eyes' centres say where the front is and the eye level
            var left = E.Where(p => p.x > 0).ToList();
            var right = E.Where(p => p.x <= 0).ToList();
            if (left.Count == 0 || right.Count == 0) return null;
            var el = left.Aggregate(Vector3.zero, (a, p) => a + p) / left.Count;
            var er = right.Aggregate(Vector3.zero, (a, p) => a + p) / right.Count;
            var eyeY = (el.y + er.y) / 2f;
            var midX = (el.x + er.x) / 2f;
            if (dump != null) Dump(dump, V, tris, el, er, scale);
            // the head: the skin from 16 cm under the eyes up, within 15 cm of the eyes' middle across and along
            var ec = (el + er) / 2f;
            var H = V.Where(p => p.y > eyeY - 0.16f && Mathf.Abs(p.x - midX) < 0.15f && Mathf.Abs(p.z - ec.z) < 0.2f).ToList();
            if (H.Count < 200) return null;
            var cz = H.Average(p => p.z);
            var fwd = ((el.z + er.z) / 2f) > cz ? 1f : -1f;   // the face's side along z
            _eyes = ((el + er) / 2f, new Vector3(0f, 0f, fwd));
            float Z(Vector3 p) => (p.z - cz) * fwd;            // forward from the head's middle
            var front = H.Where(p => Mathf.Abs(p.x - midX) < 0.012f && p.y > eyeY - 0.01f && p.y < eyeY + 0.06f).Select(Z).DefaultIfEmpty(0).Max();
            // head breadth: the widest above the ears (3-9 cm over the eyes)
            var crown = H.Where(p => p.y > eyeY + 0.03f && p.y < eyeY + 0.09f).ToList();
            var breadth = crown.Count > 0 ? crown.Max(p => p.x) - crown.Min(p => p.x) : 0;
            // head length: glabella to the back of the head on the midline, over the eyes
            var mid = H.Where(p => Mathf.Abs(p.x - midX) < 0.012f && p.y > eyeY - 0.01f && p.y < eyeY + 0.08f).ToList();
            var length = mid.Count > 0 ? mid.Max(Z) - mid.Min(Z) : 0;
            // bizygomatic: the widest of the cheekbones, in front of the ears (within 8 cm of the brow's front)
            var cheek = H.Where(p => p.y > eyeY - 0.035f && p.y < eyeY - 0.005f && Z(p) > front - 0.08f).ToList();
            var bizyg = cheek.Count > 0 ? cheek.Max(p => p.x) - cheek.Min(p => p.x) : 0;
            // sellion: the deepest point of the nose's root on the midline; menton: the chin's lowest
            var root = H.Where(p => Mathf.Abs(p.x - midX) < 0.006f && p.y > eyeY - 0.012f && p.y < eyeY + 0.018f && Z(p) > front - 0.035f).ToList();
            var sellion = root.Count > 0 ? root.OrderBy(Z).First() : new Vector3(0, eyeY, 0);
            var chin = H.Where(p => Mathf.Abs(p.x - midX) < 0.012f && p.y < eyeY - 0.06f && Z(p) > front - 0.05f).ToList();
            var menton = chin.Count > 0 ? chin.Min(p => p.y) : eyeY - 0.12f;
            var faceH = sellion.y - menton;
            // neck circumference: the body cut 3 cm under the chin, the hull of the cut round the neck
            var neckY = menton - 0.03f;
            var cut = new List<Vector2>();
            var nz = H.Where(p => p.y < menton + 0.03f).Select(p => p.z).DefaultIfEmpty(cz).Average();
            for (var t = 0; t + 2 < tris.Length; t += 3)
                for (var e = 0; e < 3; e++)
                {
                    var a = V[tris[t + e]]; var b = V[tris[t + (e + 1) % 3]];
                    if ((a.y - neckY) * (b.y - neckY) > 0 || Mathf.Approximately(a.y, b.y)) continue;
                    var f = (neckY - a.y) / (b.y - a.y);
                    var q = Vector3.Lerp(a, b, f);
                    if (Mathf.Abs(q.x - midX) < 0.09f && Mathf.Abs(q.z - nz) < 0.11f) cut.Add(new Vector2(q.x, q.z));
                }
            var neck = Perimeter(Hull(cut));
            var stature = V.Max(p => p.y) - V.Min(p => p.y);
            var ipd = Vector3.Distance(el, er);
            var s = 1000.0 * scale;
            return new Dictionary<string, double>
            {
                ["headbreadth"] = breadth * s, ["headlength"] = length * s, ["bizygomaticbreadth"] = bizyg * s, ["mentonsellionlength"] = faceH * s,
                ["interpupillarybreadth"] = ipd * s, ["neckcircumference"] = neck * s, ["stature"] = stature * s,
            };
        }

        /// <summary>The head and neck as measured (tools/unity/people/gate/measure.py measures from these): the scale, both
        /// eyes' centres, then the vertices from 30 cm under the eyes up (x y z, float32) and the triangles among them
        /// (int32), each block led by its count.</summary>
        private static void Dump(string path, Vector3[] V, int[] tris, Vector3 el, Vector3 er, float scale)
        {
            var eyeY = (el.y + er.y) / 2f;
            var keep = new int[V.Length];
            var verts = new List<Vector3>();
            for (var k = 0; k < V.Length; k++) { keep[k] = -1; if (V[k].y > eyeY - 0.3f) { keep[k] = verts.Count; verts.Add(V[k]); } }
            var faces = new List<int>();
            for (var t = 0; t + 2 < tris.Length; t += 3)
                if (keep[tris[t]] >= 0 && keep[tris[t + 1]] >= 0 && keep[tris[t + 2]] >= 0) { faces.Add(keep[tris[t]]); faces.Add(keep[tris[t + 1]]); faces.Add(keep[tris[t + 2]]); }
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            using var w = new BinaryWriter(File.Create(path));
            w.Write(scale);
            foreach (var p in new[] { el, er }) { w.Write(p.x); w.Write(p.y); w.Write(p.z); }
            w.Write(verts.Count);
            foreach (var p in verts) { w.Write(p.x); w.Write(p.y); w.Write(p.z); }
            w.Write(faces.Count / 3);
            foreach (var f in faces) w.Write(f);
        }

        private static List<Vector2> Hull(List<Vector2> pts)
        {
            var p = pts.Distinct().OrderBy(a => a.x).ThenBy(a => a.y).ToList();
            if (p.Count < 3) return p;
            float Cross(Vector2 o, Vector2 a, Vector2 b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
            var h = new List<Vector2>();
            foreach (var q in p) { while (h.Count >= 2 && Cross(h[h.Count - 2], h[h.Count - 1], q) <= 0) h.RemoveAt(h.Count - 1); h.Add(q); }
            var lower = h.Count + 1;
            for (var i = p.Count - 2; i >= 0; i--) { var q = p[i]; while (h.Count >= lower && Cross(h[h.Count - 2], h[h.Count - 1], q) <= 0) h.RemoveAt(h.Count - 1); h.Add(q); }
            h.RemoveAt(h.Count - 1);
            return h;
        }

        private static float Perimeter(List<Vector2> h)
        {
            var sum = 0f;
            for (var i = 0; i < h.Count; i++) sum += Vector2.Distance(h[i], h[(i + 1) % h.Count]);
            return sum;
        }
    }
}
