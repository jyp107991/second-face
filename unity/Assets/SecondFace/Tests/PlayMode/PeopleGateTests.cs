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
            /// <summary>The real faces their face was drawn from (<see cref="SecondFace.Core.Npc.PlayerLook.FaceSource"/>), set
            /// beside them on the boards (R3).</summary>
            public string FaceSource;
            /// <summary>Their cheek's lightness as dermatology measures it (Core SkinColour, R4c), beside the rendered one.</summary>
            public double SkinL;
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
                                                Sliders = SecondFace.Core.Npc.Looks.Shape(w.Look), Scale = SecondFace.Game.People.LookView.Scale(w.Look),
                                                FaceSource = w.Look.FaceSource, SkinL = SecondFace.Core.Npc.SkinColour.Lightness(w.Look) });
                if (studio != null && mm != null)
                {
                    // scaled to their stature as in the game: as they look (portraits_look, the boards), and with no beard
                    // for the landmarks (portraits: a beard hides the mouth's corners and the chin and widens the face's
                    // outline, so the face's own proportions are measured bare, R5)
                    go.transform.localScale = Vector3.one * SecondFace.Game.People.LookView.Scale(w.Look);
                    yield return null;
                    studio.Meter = Studio.MeterFor(w.Look);
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

        /// <summary>The sexes' cues, an experiment (docs/PEOPLE_REALISM.md §12): the gate's sample people as its portraits
        /// show them, once per variant (SF_SEX_VARIANTS, comma-separated: base; brows, a woman's finest brows and a man's
        /// heaviest; face, each sex's face pushed to its own side on the sliders that mark sex, inside the sex's range; both),
        /// into test-results/sexcues/&lt;variant&gt;/, for apparent.py's sex reading.</summary>
        [UnityTest, Timeout(3600000), Category("Heavy")]   // an experiment, run by name in the session's editor
        public IEnumerator SexCues()
        {
            GameObject F = null, M = null;
#if UNITY_EDITOR
            F = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/SecondFace/Prefabs/people/player_f.prefab");
            M = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/SecondFace/Prefabs/people/player_m.prefab");
#endif
            if (F == null || M == null) { Assert.Ignore("the bases are not built"); yield break; }
            UiTests.Content();
            var variants = (System.Environment.GetEnvironmentVariable("SF_SEX_VARIANTS") ?? "base,brows,face,both").Split(',');
            // the sliders that mark sex, each sex pushed to its own side by this much of its range's half
            var marks = new[] { "brow-ridge", "chin-width", "chin-bones", "chin-prominent", "nose-volume", "nose-scale-horiz",
                                "eye-scale", "mouth-upperlip-volume", "mouth-lowerlip-volume", "cheek-volume", "eyebrows-trans", "neck-scale-horiz" };
            var womanSide = new Dictionary<string, float> { ["brow-ridge"] = -1, ["chin-width"] = -1, ["chin-bones"] = -1, ["chin-prominent"] = -1,
                ["nose-volume"] = -1, ["nose-scale-horiz"] = -1, ["eye-scale"] = 1, ["mouth-upperlip-volume"] = 1, ["mouth-lowerlip-volume"] = 1,
                ["cheek-volume"] = 1, ["eyebrows-trans"] = 1, ["neck-scale-horiz"] = -1 };
            var studio = new Studio();
            var n = 0;
            foreach (var variant in variants)
                foreach (var c in SecondFace.Core.Npc.Bodies.Clusters)
                    foreach (var male in new[] { false, true })
                        foreach (var age in new[] { 22.0, 35.0, 50.0, 65.0 })
                            for (var k = 0; k < 3; k++)
                            {
                                var id = $"gate_{c.Id}_{(male ? "m" : "f")}_{age:0}_{k}";
                                var look = SecondFace.Core.Npc.Bodies.For(id, male, age, "settler", ancestry: c.Id);
                                SecondFace.Core.Npc.Bodies.Finish(look);
                                if (variant is "brows" or "both") look.Brows = male ? 2 : 0;
                                if (variant is "face" or "both")
                                    foreach (var id2 in marks)
                                    {
                                        var (lo, hi) = SecondFace.Core.Npc.Sculpt.Range(id2, male);
                                        var dir = womanSide[id2] * (male ? -1 : 1);
                                        var v = look.Face.TryGetValue(id2, out var x) ? x : 0f;
                                        look.Face[id2] = Mathf.Clamp(v + dir * 0.35f * (hi - lo) * 0.5f, lo, hi);
                                    }
                                var go = Object.Instantiate(male ? M : F, new Vector3(500f, 0f, 0f), Quaternion.identity);
                                SecondFace.Game.People.LookView.Apply(go, look);
                                yield return null;
                                if (Measure(go, 1f) != null)
                                {
                                    go.transform.localScale = Vector3.one * SecondFace.Game.People.LookView.Scale(look);
                                    yield return null;
                                    studio.Meter = Studio.MeterFor(look);
                                    studio.Shoot(go, id, Path.Combine("sexcues", variant));
                                    n++;
                                }
                                Object.Destroy(go);
                            }
            studio.Dispose();
            Debug.Log($"PeopleGate: sex cues, {n} portraits");
            Assert.That(n, Is.GreaterThan(0));
        }

        /// <summary>What the age reader answers to (R4d): the sample people at 35, 50 and 65, two of each people and sex, once per
        /// variant (SF_AGE_VARIANTS, comma-separated: base; lines, the years' lines at their deepest; bake, the aged bake whole;
        /// macro, the base's own ageing shape (MakeHuman's age, body-age) at seventy with the skin as the years have it; soft,
        /// the soft tissue's descent (body-faceage, face_years.py) at its full years; grey,
        /// the hair white; all), into test-results/agecues/&lt;variant&gt;/, each cue pushed past real alone, so the reading of
        /// each shows which our faces lack.</summary>
        [UnityTest, Timeout(3600000), Category("Heavy")]   // an experiment, run by name in the session's editor
        public IEnumerator AgeCues()
        {
            GameObject F = null, M = null;
#if UNITY_EDITOR
            F = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/SecondFace/Prefabs/people/player_f.prefab");
            M = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/SecondFace/Prefabs/people/player_m.prefab");
#endif
            if (F == null || M == null) { Assert.Ignore("the bases are not built"); yield break; }
            UiTests.Content();
            var variants = (System.Environment.GetEnvironmentVariable("SF_AGE_VARIANTS") ?? "base,lines,bake,macro,soft,grey,all").Split(',');
            var wrinkles = Shader.PropertyToID("_Wrinkles");
            var studio = new Studio();
            var n = 0;
            foreach (var variant in variants)
                foreach (var c in SecondFace.Core.Npc.Bodies.Clusters)
                    foreach (var male in new[] { false, true })
                        foreach (var age in new[] { 35.0, 50.0, 65.0 })
                            for (var k = 0; k < 2; k++)
                            {
                                var id = $"gate_{c.Id}_{(male ? "m" : "f")}_{age:0}_{k}";
                                var look = SecondFace.Core.Npc.Bodies.For(id, male, age, "settler", ancestry: c.Id);
                                SecondFace.Core.Npc.Bodies.Finish(look);
                                var lines = SecondFace.Core.Npc.Looks.Wrinkles(look);
                                var skin = SecondFace.Core.Npc.Looks.SkinAge(look);
                                if (variant is "macro" or "all") { look.Shape ??= new Dictionary<string, float>(); look.Shape["body-age"] = 1f; }
                                if (variant is "soft" or "all") { look.Shape ??= new Dictionary<string, float>(); look.Shape["body-faceage"] = 1f; }
                                if (variant is "grey" or "all") look.Grey = 1f;
                                if (variant is "lines" or "all") lines = 1f;
                                if (variant is "bake" or "all") skin = 1f;
                                var go = Object.Instantiate(male ? M : F, new Vector3(500f, 0f, 0f), Quaternion.identity);
                                SecondFace.Game.People.LookView.Apply(go, look);
                                // the skin's years set apart from the shape's (body-age carries both)
                                var face = go.GetComponentInChildren<SecondFace.Game.People.FaceSculpt>();
                                if (face != null) { face.SkinAge = skin; face.Apply(); }
                                var block = new MaterialPropertyBlock();
                                foreach (var r in go.GetComponentsInChildren<SkinnedMeshRenderer>(true))
                                    if (r.name.StartsWith("Body_") && r.sharedMaterial != null && r.sharedMaterial.HasProperty(wrinkles))
                                    {
                                        r.GetPropertyBlock(block);
                                        block.SetFloat(wrinkles, lines);
                                        r.SetPropertyBlock(block);
                                    }
                                yield return null;
                                if (Measure(go, 1f) != null)
                                {
                                    go.transform.localScale = Vector3.one * SecondFace.Game.People.LookView.Scale(look);
                                    yield return null;
                                    studio.Meter = Studio.MeterFor(look);
                                    studio.Shoot(go, id, Path.Combine("agecues", variant));
                                    n++;
                                }
                                Object.Destroy(go);
                            }
            studio.Dispose();
            Debug.Log($"PeopleGate: age cues, {n} portraits");
            Assert.That(n, Is.GreaterThan(0));
        }

        /// <summary>Looks rendered as written (overhaul §17, judged by eye): SF_PROBE names a JSON file of looks by name, each
        /// {"body": "f"|"m", "face": {slider: value}, "shape": {slider: value}, "hair": id, "skin": tone}, shot from the front,
        /// three-quarters and the side in the gate's studio into test-results/probe/&lt;name&gt;_&lt;view&gt;.png.</summary>
        [UnityTest, Timeout(1800000), Category("Heavy")]   // a tool, run by name in the session's editor
        public IEnumerator Probe()
        {
            GameObject F = null, M = null;
#if UNITY_EDITOR
            F = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/SecondFace/Prefabs/people/player_f.prefab");
            M = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/SecondFace/Prefabs/people/player_m.prefab");
#endif
            var path = System.Environment.GetEnvironmentVariable("SF_PROBE");
            if (F == null || M == null || string.IsNullOrEmpty(path) || !File.Exists(path)) { Assert.Ignore("no bases or no SF_PROBE file"); yield break; }
            UiTests.Content();
            var looks = JsonConvert.DeserializeObject<Dictionary<string, ProbeLook>>(File.ReadAllText(path));
            var studio = new Studio();
            var n = 0;
            foreach (var (name, p) in looks)
            {
                var male = p.body == "m";
                // a whole look as Core made it ("look"), or one written by hand
                var look = p.look ?? new SecondFace.Core.Npc.PlayerLook { Body = male ? "m" : "f", Hair = p.hair, Skin = p.skin };
                if (p.look != null) male = look.Body == "m";
                if (p.face != null) foreach (var kv in p.face) look.Face[kv.Key] = kv.Value;
                if (p.shape != null) foreach (var kv in p.shape) look.Shape[kv.Key] = kv.Value;
                var go = Object.Instantiate(male ? M : F, new Vector3(700f + n * 3f, 0f, 0f), Quaternion.identity);
                SecondFace.Game.People.LookView.Apply(go, look);
                // the skin's material overridden for a probe ("mat": float properties, "vec": vector and colour properties)
                if (p.mat != null || p.vec != null)
                    foreach (var r in go.GetComponentsInChildren<SkinnedMeshRenderer>(true))
                    {
                        if (!r.name.StartsWith("Body_")) continue;
                        var block = new MaterialPropertyBlock();
                        r.GetPropertyBlock(block);
                        if (p.mat != null) foreach (var kv in p.mat) block.SetFloat(kv.Key, kv.Value);
                        if (p.vec != null) foreach (var kv in p.vec) block.SetVector(kv.Key, new Vector4(kv.Value[0], kv.Value[1], kv.Value[2], kv.Value.Length > 3 ? kv.Value[3] : 1f));
                        r.SetPropertyBlock(block);
                    }
                studio.Light(p.key, p.fill, p.ambient);
                yield return null;
                if (Measure(go, 1f) == null) { Object.Destroy(go); continue; }
                studio.Meter = Studio.MeterFor(look);
                go.transform.localScale = Vector3.one * SecondFace.Game.People.LookView.Scale(look);
                yield return null;
                foreach (var (view, yaw) in new[] { ("front", 0f), ("three", 35f), ("side", 85f) })
                    studio.Shoot(go, $"{name}_{view}", "probe", 1.3f, yaw, -0.03f);
                n++;
                Object.Destroy(go);
            }
            studio.Dispose();
            Assert.That(n, Is.GreaterThan(0));
        }

        /// <summary>Microsoft Rocketbox avatars under evaluation (Assets/ThirdParty/Rocketbox, MIT; docs/PEOPLE_RESEARCH.md §7),
        /// in the gate's studio as ours are probed: front, three-quarters and the side into test-results/probe/rb_&lt;name&gt;_*.</summary>
        [UnityTest, Timeout(900000), Category("Heavy")]   // an evaluation tool, run by name in the session's editor
        public IEnumerator RocketboxProbe()
        {
            var root = "Assets/ThirdParty/Rocketbox";
            var dirs = Directory.Exists(root) ? Directory.GetDirectories(root) : new string[0];
            if (dirs.Length == 0) { Assert.Ignore("no Rocketbox avatars"); yield break; }
            var studio = new Studio();
            var n = 0;
            foreach (var dir in dirs)
            {
                var name = Path.GetFileName(dir);
                GameObject model = null;
#if UNITY_EDITOR
                model = AssetDatabase.LoadAssetAtPath<GameObject>($"{root}/{name}/{name}.fbx");
#endif
                if (model == null) continue;
                var go = Object.Instantiate(model, new Vector3(900f + n * 3f, 0f, 0f), Quaternion.identity);
                // the highest level of detail only
                foreach (var t in go.GetComponentsInChildren<Transform>(true))
                {
                    var low = t.name.ToLowerInvariant();
                    if (low.Contains("poly") && !low.Contains("hipoly")) t.gameObject.SetActive(false);
                }
                foreach (var r in go.GetComponentsInChildren<SkinnedMeshRenderer>(true))
                    foreach (var m in r.materials)
                    {
                        // the textures by the material's name (f003_head: f003_head_color, _normal, _specular; f003_opacity:
                        // f003_opacity_color), as the 3ds Max export left them unbound
                        var mat = m.name.Replace(" (Instance)", "");
                        Texture Tex(string suffix)
                        {
#if UNITY_EDITOR
                            return AssetDatabase.LoadAssetAtPath<Texture2D>($"{root}/{name}/{mat}_{suffix}.jpg")
                                   ?? AssetDatabase.LoadAssetAtPath<Texture2D>($"{root}/{name}/{mat}_{suffix}.png");
#else
                            return null;
#endif
                        }
                        if (Tex("color") is { } col) { m.SetTexture("_BaseMap", col); m.SetTexture("_MainTex", col); }
                        if (Tex("normal") is { } nrm) { m.SetTexture("_BumpMap", nrm); m.EnableKeyword("_NORMALMAP"); m.SetFloat("_BumpScale", 1f); }
                        var tex = m.HasProperty("_BaseMap") ? m.GetTexture("_BaseMap") : null;
                        Debug.Log($"Rocketbox {name}: {r.name} material {m.name} shader {m.shader.name} base {(tex != null ? tex.name : "-")}");
                        if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", Color.white);
                        if (m.HasProperty("_Smoothness")) m.SetFloat("_Smoothness", 0.35f);
                        // the hair, brows and lashes: cut out by the opacity texture's alpha, both faces drawn
                        if (tex != null && tex.name.ToLowerInvariant().Contains("opacity"))
                        {
                            m.SetFloat("_AlphaClip", 1f); m.EnableKeyword("_ALPHATEST_ON"); m.SetFloat("_Cutoff", 0.35f);
                            m.SetFloat("_Cull", 0f); m.SetFloat("_Smoothness", 0.25f);
                        }
                    }
                var anim = go.GetComponent<Animator>();
                var head = anim != null && anim.isHuman ? anim.GetBoneTransform(HumanBodyBones.Head) : go.GetComponentsInChildren<Transform>(true).FirstOrDefault(t => t.name == "Bip01 Head");
                if (head == null) { Debug.Log($"Rocketbox {name}: no head bone"); Object.Destroy(go); continue; }
                yield return null;
                var eye = go.transform.InverseTransformPoint(head.position) + new Vector3(0f, 0.085f, 0f);
                _eyes = (eye, Vector3.forward);
                foreach (var (view, yaw) in new[] { ("front", 0f), ("three", 35f), ("side", 85f) })
                    studio.Shoot(go, $"rb_{name}_{view}", "probe", 1.3f, yaw, -0.03f);
                n++;
                Object.Destroy(go);
                // RB2: the sculptor's shapes carried onto this head (<name>_sculpt.fbx), each pushed to its end
                GameObject sculpt = null;
#if UNITY_EDITOR
                sculpt = AssetDatabase.LoadAssetAtPath<GameObject>($"{root}/{name}/{name}_sculpt.fbx");
#endif
                if (sculpt == null) continue;
                var sg = Object.Instantiate(sculpt, new Vector3(950f + n * 3f, 0f, 0f), Quaternion.identity);
                foreach (var r in sg.GetComponentsInChildren<SkinnedMeshRenderer>(true))
                    foreach (var m in r.materials)
                    {
                        var mat = m.name.Replace(" (Instance)", "");
                        Texture2D T(string suffix)
                        {
#if UNITY_EDITOR
                            return AssetDatabase.LoadAssetAtPath<Texture2D>($"{root}/{name}/{mat}_{suffix}.jpg") ?? AssetDatabase.LoadAssetAtPath<Texture2D>($"{root}/{name}/{mat}_{suffix}.png");
#else
                            return null;
#endif
                        }
                        if (T("color") is { } col) { m.SetTexture("_BaseMap", col); m.SetTexture("_MainTex", col); }
                        if (T("normal") is { } nrm) { m.SetTexture("_BumpMap", nrm); m.EnableKeyword("_NORMALMAP"); }
                        m.SetColor("_BaseColor", Color.white); m.SetFloat("_Smoothness", 0.35f);
                        if (mat.EndsWith("_opacity")) { m.SetFloat("_AlphaClip", 1f); m.EnableKeyword("_ALPHATEST_ON"); m.SetFloat("_Cutoff", 0.35f); m.SetFloat("_Cull", 0f); m.SetFloat("_Smoothness", 0.25f); }
                    }
                var smr = sg.GetComponentsInChildren<SkinnedMeshRenderer>(true).First(r => r.sharedMesh != null && r.sharedMesh.blendShapeCount > 0);
                var sanim = sg.GetComponent<Animator>();
                var shead = sanim != null && sanim.isHuman ? sanim.GetBoneTransform(HumanBodyBones.Head) : sg.GetComponentsInChildren<Transform>(true).FirstOrDefault(t => t.name == "Bip01 Head");
                var variants = new (string Tag, (string Key, float W)[] Set)[]
                {
                    ("base", new (string, float)[0]),
                    ("nose_wide", new[] { ("nose-scale-horiz-incr", 100f), ("nose-flaring-incr", 60f) }),
                    ("nose_narrow", new[] { ("nose-scale-horiz-decr", 100f) }),
                    ("lips_full", new[] { ("mouth-upperlip-volume-incr", 100f), ("mouth-lowerlip-volume-incr", 100f) }),
                    ("jaw_strong", new[] { ("chin-width-incr", 100f), ("chin-bones-incr", 100f), ("chin-prominent-incr", 60f) }),
                    ("eyes_big", new[] { ("eye-scale-incr", 100f) }),
                    ("cheekbones", new[] { ("cheek-bones-incr", 100f), ("cheek-volume-decr", 60f) }),
                    ("face_long", new[] { ("chin-height-incr", 100f) }),
                    ("mouth_wide", new[] { ("mouth-scale-horiz-incr", 100f) }),
                };
                foreach (var (tag, set) in variants)
                {
                    for (var b = 0; b < smr.sharedMesh.blendShapeCount; b++) smr.SetBlendShapeWeight(b, 0f);
                    foreach (var (key, w) in set) { var bi = smr.sharedMesh.GetBlendShapeIndex(key); if (bi >= 0) smr.SetBlendShapeWeight(bi, w); }
                    yield return null;
                    _eyes = (sg.transform.InverseTransformPoint(shead.position) + new Vector3(0f, 0.085f, 0f), Vector3.forward);
                    foreach (var (view, yaw) in new[] { ("front", 0f), ("three", 35f) })
                        studio.Shoot(sg, $"rbs_{name}_{tag}_{view}", "probe", 1.3f, yaw, -0.03f);
                }
                Object.Destroy(sg);
            }
            studio.Dispose();
            Assert.That(n, Is.GreaterThan(0));
        }

        private sealed class ProbeLook
        {
            public string body, hair;
            public float skin;
            public Dictionary<string, float> face, shape, mat;
            public Dictionary<string, float[]> vec;
            public float key = 1.1f, fill = 0.45f, ambient = 0.45f;
            public SecondFace.Core.Npc.PlayerLook look;
        }

        /// <summary>The hair and the face up close (R5): a few of the sample people (SF_HAIR_IDS, "cluster_sex_age_k" each,
        /// comma-separated; a default spread of hairs, colours and ages without it) from the front, three-quarters and the
        /// side at 0.95 m in the gate's studio, into test-results/hair: the hairline, the strands and the grey seen as the
        /// conversation camera sees them, without the whole gate's round.</summary>
        [UnityTest, Timeout(900000), Category("Heavy")]   // a close-up tool, run by name in the session's editor
        public IEnumerator HairCloseups()
        {
            GameObject F = null, M = null;
#if UNITY_EDITOR
            F = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/SecondFace/Prefabs/people/player_f.prefab");
            M = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/SecondFace/Prefabs/people/player_m.prefab");
#endif
            if (F == null || M == null) { Assert.Ignore("the bases are not built"); yield break; }
            UiTests.Content();
            var ids = (System.Environment.GetEnvironmentVariable("SF_HAIR_IDS") ?? "north_european_f_65_0,mediterranean_f_50_0,east_asian_f_65_0,"
                       + "west_african_f_35_0,north_european_m_65_1,latin_american_m_35_0,east_african_f_65_0,south_asian_f_22_0").Split(',');
            var studio = new Studio();
            var n = 0;
            for (var i = 0; i < ids.Length; i++)
            {
                var parts = ids[i].Trim().Split('_');
                if (parts.Length < 4) continue;
                var cluster = string.Join("_", parts.Take(parts.Length - 3));
                var male = parts[parts.Length - 3] == "m";
                var age = double.Parse(parts[parts.Length - 2], System.Globalization.CultureInfo.InvariantCulture);
                var id = $"gate_{cluster}_{parts[parts.Length - 3]}_{parts[parts.Length - 2]}_{parts[parts.Length - 1]}";
                var look = SecondFace.Core.Npc.Bodies.For(id, male, age, "settler", ancestry: cluster);
                if (float.TryParse(System.Environment.GetEnvironmentVariable("SF_HAIR_GREY"), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var grey))
                    look.Grey = grey;   // (a probe: the same head at another share of grey)
                var go = Object.Instantiate(male ? M : F, new Vector3(500f + i * 3f, 0f, 0f), Quaternion.identity);
                SecondFace.Game.People.LookView.Apply(go, look);
                yield return null;
                if (Measure(go, 1f) == null) { Object.Destroy(go); continue; }
                go.transform.localScale = Vector3.one * SecondFace.Game.People.LookView.Scale(look);
                yield return null;
                studio.Meter = Studio.MeterFor(look);
                // (SF_CLOSE_DIST, SF_CLOSE_UP: the whole face for a lineup, 1.3 m aimed 3 cm under the eyes; the hair's close-up
                // by default)
                var dist = float.TryParse(System.Environment.GetEnvironmentVariable("SF_CLOSE_DIST"), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var dv) ? dv : 0.95f;
                var upBy = float.TryParse(System.Environment.GetEnvironmentVariable("SF_CLOSE_UP"), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var uv) ? uv : 0.03f;
                foreach (var (view, yaw) in new[] { ("front", 0f), ("three", 35f), ("side", 80f) })
                    studio.Shoot(go, $"{id}_{view}", "hair", dist, yaw, upBy);
                // SF_HAIR_PARTS: the same three-quarter view with only the hair, and with only the body (what shows through)
                if (System.Environment.GetEnvironmentVariable("SF_HAIR_PARTS") == "1")
                {
                    var rs = go.GetComponentsInChildren<SkinnedMeshRenderer>();
                    foreach (var r in rs) r.enabled = r.name.Contains("Hair_");
                    studio.Shoot(go, $"{id}_haironly", "hair", 0.95f, 35f, 0.03f);
                    foreach (var r in rs) r.enabled = !r.name.Contains("Hair_");
                    studio.Shoot(go, $"{id}_bodyonly", "hair", 0.95f, 35f, 0.03f);
                }
                n++;
                Object.Destroy(go);
            }
            studio.Dispose();
            Debug.Log($"PeopleGate: hair close-ups of {n} people");
            Assert.That(n, Is.GreaterThan(0));
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

            /// <summary>The exposure a camera metering on this face would give it, over a light-skinned face's (R4c): a
            /// photograph makes up about a third of the face's reflectance in its exposure (FairFace's darkest cheeks read
            /// 0.51 of the lightest in luminance where dermatology measures 0.36: 0.36^(1-k) = 0.51, k = 0.34), so their
            /// portraits are compared with photographs taken the same way. The game's scenes are not metered per face.</summary>
            public float Meter = 1f;

            public static float MeterFor(SecondFace.Core.Npc.PlayerLook look)
            {
                double Y(double l) { var f = (l + 16) / 116; return f * f * f; }
                return (float)System.Math.Pow(Y(SecondFace.Core.Npc.SkinColour.Lightness(look)) / Y(57), -0.34);
            }

            public Studio()
            {
                _cam = new GameObject("gate_camera").AddComponent<Camera>();
                _cam.fieldOfView = 16.1f; _cam.nearClipPlane = 0.1f; _cam.farClipPlane = 10f;
                _cam.clearFlags = CameraClearFlags.SolidColor; _cam.backgroundColor = new Color(0.42f, 0.43f, 0.45f);
                // rendered in linear HDR and graded on readback as the game's look grades it (Grade)
                _rt = new RenderTexture(512, 640, 24, RenderTextureFormat.ARGBHalf, RenderTextureReadWrite.Linear); _cam.targetTexture = _rt;
                _cam.allowHDR = true;
                foreach (var l in Object.FindObjectsByType<Light>(FindObjectsSortMode.None)) l.enabled = false;
                _key = new GameObject("gate_key").AddComponent<Light>(); _key.type = LightType.Directional; _key.intensity = 1.1f;
                _fill = new GameObject("gate_fill").AddComponent<Light>(); _fill.type = LightType.Directional; _fill.intensity = 0.45f;
                RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat; RenderSettings.ambientLight = new Color(0.45f, 0.45f, 0.47f);
            }

            /// <summary>The studio's lights for a probe (the gate's: key 1.1, fill 0.45, ambient 0.45).</summary>
            public void Light(float key, float fill, float ambient)
            {
                _key.intensity = key; _fill.intensity = fill;
                RenderSettings.ambientLight = new Color(ambient, ambient, ambient * 1.04f);
            }

            public void Shoot(GameObject go, string name, string folder = "portraits", float distance = 1.6f, float yaw = 0f, float up = 0f)
            {
                if (!_eyes.HasValue) return;
                var (eye, fwd) = _eyes.Value;
                var at = go.transform.TransformPoint(eye) + Vector3.up * up;
                var dir = Quaternion.AngleAxis(yaw, Vector3.up) * go.transform.TransformDirection(fwd);
                _cam.transform.position = at + dir * distance;
                _cam.transform.LookAt(at);
                _key.transform.rotation = _cam.transform.rotation * Quaternion.Euler(28f, 30f, 0f);
                _fill.transform.rotation = _cam.transform.rotation * Quaternion.Euler(8f, -35f, 0f);
                _cam.Render();
                var prev = RenderTexture.active; RenderTexture.active = _rt;
                var hdr = new Texture2D(_rt.width, _rt.height, TextureFormat.RGBAHalf, false, true);
                hdr.ReadPixels(new Rect(0, 0, _rt.width, _rt.height), 0, 0);
                RenderTexture.active = prev;
                var tex = new Texture2D(_rt.width, _rt.height, TextureFormat.RGB24, false);
                tex.SetPixels32(Grade(hdr.GetPixels(), Meter));
                tex.Apply();
                Object.Destroy(hdr);
                var png = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "test-results", folder, name + ".png"));
                Directory.CreateDirectory(Path.GetDirectoryName(png));
                File.WriteAllBytes(png, tex.EncodeToPNG());
                Object.Destroy(tex);
            }

            /// <summary>
            /// The game's look (Assets/SecondFace/Settings/Look.asset: post-exposure +0.25, contrast 12, saturation 10, ACES)
            /// applied to a linear HDR frame as URP's grading does (contrast in LogC about ACES's middle grey, saturation by
            /// luminance, then the tone curve; ACES by Narkowicz's fit), so a portrait shows what the phone shows. URP's own
            /// post-processing cannot run here: the GLES3 tier the editor renders has none, and given it the software GL driver
            /// crashed (R4, docs/PEOPLE_REALISM.md §14). Bloom and the vignette are left out: they hardly touch a face in the
            /// frame's middle.
            /// </summary>
            private static Color32[] Grade(Color[] px, float meter = 1f)
            {
                const float cut = 0.011361f, a = 5.555556f, b = 0.047996f, c = 0.244161f, d = 0.386036f, e = 5.301883f, f = 0.092819f;
                const float mid = 0.4135884f, contrast = 1.12f, saturation = 1.1f;
                var exposure = Mathf.Pow(2f, 0.25f) * meter;
                float LogC(float x) => x > cut ? c * Mathf.Log10(a * x + b) + d : e * x + f;
                float Lin(float x) => x > e * cut + f ? (Mathf.Pow(10f, (x - d) / c) - b) / a : (x - f) / e;
                float Aces(float x) { x *= 0.6f; return Mathf.Clamp01(x * (2.51f * x + 0.03f) / (x * (2.43f * x + 0.59f) + 0.14f)); }
                var o = new Color32[px.Length];
                for (var i = 0; i < px.Length; i++)
                {
                    var v = new Vector3(px[i].r, px[i].g, px[i].b) * exposure;
                    v = new Vector3(Lin((LogC(v.x) - mid) * contrast + mid), Lin((LogC(v.y) - mid) * contrast + mid), Lin((LogC(v.z) - mid) * contrast + mid));
                    var luma = Vector3.Dot(v, new Vector3(0.2126729f, 0.7151522f, 0.072175f));
                    v = new Vector3(luma, luma, luma) + (v - new Vector3(luma, luma, luma)) * saturation;
                    var g = new Color(Aces(Mathf.Max(v.x, 0f)), Aces(Mathf.Max(v.y, 0f)), Aces(Mathf.Max(v.z, 0f))).gamma;
                    o[i] = g;
                }
                return o;
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
