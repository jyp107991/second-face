using System;
using System.IO;
using System.Linq;
using SecondFace.Game.People;
using UnityEditor;
using UnityEngine;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// P4 step 3: the player's bases and their wardrobes as runtime assets. For each <c>People/Player/&lt;base&gt;.wardrobe.json</c>
    /// (written by mh_build.py beside the garment models): a bound prefab per garment (Prefabs/people/wardrobe), a
    /// <see cref="WardrobeSet"/> (<c>People/Player/&lt;base&gt;_wardrobe.asset</c>), and the base as a bound prefab with its
    /// <see cref="FaceSculpt"/> and <see cref="Wardrobe"/> (Prefabs/people/&lt;base&gt;.prefab), which wears the set's outfit
    /// when it starts.
    /// </summary>
    public static class WardrobeBuild
    {
        public const string Dir = PlayerTestScene.Dir;
        public const string GarmentDir = WorldAssetsBuild.PeopleDir + "/wardrobe";

        [Serializable]
        private sealed class Manifest
        {
            public string @base;
            public string[] outfit;
            public Entry[] garments;
        }

        [Serializable]
        private sealed class Entry
        {
            public string id, slot, model;
            public bool hidesHair;
            public int[] hides;
        }

        [MenuItem("Second Face/Build player wardrobes")]
        public static void Build()
        {
            if (!Directory.Exists(Dir)) { Debug.LogWarning("WardrobeBuild: no player bases (BRIEF=briefs/player.json mh_build.py)"); return; }
            foreach (var json in Directory.GetFiles(Dir, "*.wardrobe.json").OrderBy(p => p)) BuildOne(json.Replace('\\', '/'));
            AssetDatabase.SaveAssets();
        }

        /// <summary>The base's bound prefab with its wardrobe (built when missing).</summary>
        public static GameObject Player(string baseId)
        {
            var path = $"{WorldAssetsBuild.PeopleDir}/{baseId}.prefab";
            var p = AssetDatabase.LoadAssetAtPath<GameObject>(path);
            if (p != null) return p;
            var json = $"{Dir}/{baseId}.wardrobe.json";
            if (File.Exists(json)) BuildOne(json);
            return AssetDatabase.LoadAssetAtPath<GameObject>(path);
        }

        private static void BuildOne(string jsonPath)
        {
            var m = JsonUtility.FromJson<Manifest>(File.ReadAllText(jsonPath));
            if (m == null || string.IsNullOrEmpty(m.@base)) { Debug.LogWarning($"WardrobeBuild: {jsonPath} unreadable"); return; }
            Directory.CreateDirectory(GarmentDir);
            var setPath = $"{Dir}/{m.@base}_wardrobe.asset";
            var set = AssetDatabase.LoadAssetAtPath<WardrobeSet>(setPath);
            var fresh = set == null;
            if (fresh) set = ScriptableObject.CreateInstance<WardrobeSet>();
            set.Base = m.@base;
            set.Outfit = m.outfit ?? Array.Empty<string>();
            set.Garments.Clear();
            foreach (var e in m.garments ?? Array.Empty<Entry>())
            {
                var prefab = Bound($"{Dir}/{e.model}.fbx", $"{GarmentDir}/{e.model}.prefab");
                if (prefab == null) continue;
                set.Garments.Add(new WardrobeSet.Garment { Id = e.id, Slot = e.slot, HidesHair = e.hidesHair, Hides = e.hides ?? Array.Empty<int>(), Prefab = prefab });
            }
            if (fresh) AssetDatabase.CreateAsset(set, setPath); else EditorUtility.SetDirty(set);

            // the base: bound, with its face and its wardrobe
            var model = AssetDatabase.LoadAssetAtPath<GameObject>($"{Dir}/{m.@base}.fbx");
            if (model == null) { Debug.LogWarning($"WardrobeBuild: no {m.@base}.fbx"); return; }
            // the skin's mask needs every body level's base indices (uv1: i % 128, i / 128)
            foreach (var r in model.GetComponentsInChildren<SkinnedMeshRenderer>(true).Where(r => r.name.StartsWith("Body_")))
            {
                var uv = new System.Collections.Generic.List<Vector2>();
                r.sharedMesh.GetUVs(1, uv);
                if (uv.Count != r.sharedMesh.vertexCount) { Debug.LogError($"WardrobeBuild: {m.@base} {r.name} has no base indices (uv1)"); continue; }
                var max = uv.Max(u => u.x + u.y * 128f);
                var whole = uv.All(u => Mathf.Abs(u.x - Mathf.Round(u.x)) < 0.01f && Mathf.Abs(u.y - Mathf.Round(u.y)) < 0.01f);
                Debug.Log($"WardrobeBuild: {m.@base} {r.name} base indices 0..{max:0} over {uv.Count} vertices, whole: {whole}");
            }
            var go = (GameObject)PrefabUtility.InstantiatePrefab(model);
            PeopleMaterials.Bind(go, Dir);
            // the skin's head frame for the marks drawn at creation (P5.3i)
            var rest = RestMap(model, m.@base);
            if (rest != null)
                foreach (var r in go.GetComponentsInChildren<SkinnedMeshRenderer>(true).Where(r => r.name.StartsWith("Body_")))
                    if (r.sharedMaterial != null && r.sharedMaterial.HasProperty("_RestMap"))
                    {
                        r.sharedMaterial.SetTexture("_RestMap", rest);
                        EditorUtility.SetDirty(r.sharedMaterial);
                    }
            var sculpt = go.AddComponent<FaceSculpt>();
            // the hair greyed for the aged face (mh_build bakes <id>__<hair>_aged_d beside the hair's own texture)
            var hairTex = go.GetComponentsInChildren<Renderer>(true).Where(r => r.name.StartsWith("Hair_") && r.sharedMaterial != null)
                .Select(r => r.sharedMaterial.GetTexture("_BaseMap")).FirstOrDefault(t => t != null);
            var hairPath = hairTex != null ? AssetDatabase.GetAssetPath(hairTex) : null;
            if (!string.IsNullOrEmpty(hairPath) && hairPath.EndsWith("_d.png"))
                sculpt.AgedHair = AssetDatabase.LoadAssetAtPath<Texture2D>(hairPath.Substring(0, hairPath.Length - 6) + "_aged_d.png");
            go.AddComponent<Wardrobe>().Set = set;
            PrefabUtility.SaveAsPrefabAsset(go, $"{WorldAssetsBuild.PeopleDir}/{m.@base}.prefab");
            UnityEngine.Object.DestroyImmediate(go);
            Debug.Log($"WardrobeBuild: {m.@base}, {set.Garments.Count} garments, wears {string.Join(", ", set.Outfit)}");
        }

        /// <summary>
        /// Each base vertex's rest position in the head frame of the web game's skin painter (the eyes at (±0.36, 0.1,
        /// 0.88) head radii from the centre; z the face's way, y up), written into a 128 x 128 half-float texture at the
        /// texel of its MakeHuman base index (uv1, as the wardrobe's mask): SecondFace/Skin reads it per vertex to draw the
        /// scars, tattoos and freckles chosen at creation where the web game drew them, fixed to the skin.
        /// </summary>
        public static Texture2D RestMap(GameObject model, string baseId)
        {
            var renderers = model.GetComponentsInChildren<SkinnedMeshRenderer>(true);
            var body = renderers.FirstOrDefault(r => r.name == "Body_LOD0") ?? renderers.FirstOrDefault(r => r.name.StartsWith("Body_"));
            var eyes = renderers.FirstOrDefault(r => r.name == "Eyes_LOD0") ?? renderers.FirstOrDefault(r => r.name.StartsWith("Eyes_"));
            if (body == null || eyes == null) { Debug.LogWarning($"WardrobeBuild: {baseId} has no body or eyes for the head frame"); return null; }
            var mesh = body.sharedMesh;
            var verts = mesh.vertices;
            var uv1 = new System.Collections.Generic.List<Vector2>();
            mesh.GetUVs(1, uv1);
            if (uv1.Count != verts.Length) { Debug.LogWarning($"WardrobeBuild: {baseId} body has no base indices"); return null; }
            // the eyes in the body's mesh space, split left and right
            var ev = eyes.sharedMesh.vertices.Select(v => body.transform.InverseTransformPoint(eyes.transform.TransformPoint(v))).ToArray();
            var mean = ev.Aggregate(Vector3.zero, (a, v) => a + v) / ev.Length;
            var left = ev.Where(v => v.x < mean.x).ToArray();
            var right = ev.Where(v => v.x >= mean.x).ToArray();
            if (left.Length == 0 || right.Length == 0) return null;
            var l = left.Aggregate(Vector3.zero, (a, v) => a + v) / left.Length;
            var r2 = right.Aggregate(Vector3.zero, (a, v) => a + v) / right.Length;
            var mid = (l + r2) * 0.5f;
            var rad = Vector3.Distance(l, r2) / (2f * 0.36f);
            // the face's way: from the head bone (at bind) towards the eyes, level
            var headIndex = System.Array.FindIndex(body.bones, b => b != null && b.name.ToLowerInvariant() == "head");
            var headPos = headIndex >= 0 ? mesh.bindposes[headIndex].inverse.MultiplyPoint(Vector3.zero) : mid - Vector3.forward * rad;
            var fwd = Vector3.ProjectOnPlane(mid - headPos, Vector3.up);
            fwd = fwd.sqrMagnitude > 1e-6f ? fwd.normalized : Vector3.forward;
            var side = Vector3.Cross(Vector3.up, fwd);
            var centre = mid - Vector3.up * (0.1f * rad) - fwd * (0.88f * rad);
            const int n = Wardrobe.MaskSize;
            var px = new Color[n * n];
            for (var i = 0; i < verts.Length; i++)
            {
                var idx = Mathf.RoundToInt(uv1[i].x) + Mathf.RoundToInt(uv1[i].y) * n;
                if (idx < 0 || idx >= px.Length) continue;
                var d = (verts[i] - centre) / rad;
                px[idx] = new Color(Vector3.Dot(d, side), d.y, Vector3.Dot(d, fwd), 1f);
            }
            var tex = new Texture2D(n, n, TextureFormat.RGBAHalf, false, true) { name = baseId + "_rest", filterMode = FilterMode.Point, wrapMode = TextureWrapMode.Clamp };
            tex.SetPixels(px);
            tex.Apply(false, false);
            var path = $"{Dir}/{baseId}_rest.asset";
            if (AssetDatabase.LoadAssetAtPath<Texture2D>(path) != null) AssetDatabase.DeleteAsset(path);
            AssetDatabase.CreateAsset(tex, path);
            Debug.Log($"WardrobeBuild: {baseId} head frame: radius {rad * 100f:0.0} cm, eyes {Vector3.Distance(l, r2) * 100f:0.0} cm apart, the face along {fwd}");
            return AssetDatabase.LoadAssetAtPath<Texture2D>(path);
        }

        private static GameObject Bound(string modelPath, string prefabPath)
        {
            var model = AssetDatabase.LoadAssetAtPath<GameObject>(modelPath);
            if (model == null) { Debug.LogWarning($"WardrobeBuild: no {modelPath}"); return null; }
            var go = (GameObject)PrefabUtility.InstantiatePrefab(model);
            PeopleMaterials.Bind(go, Dir);
            var prefab = PrefabUtility.SaveAsPrefabAsset(go, prefabPath);
            UnityEngine.Object.DestroyImmediate(go);
            return prefab;
        }
    }
}
