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
            go.AddComponent<FaceSculpt>();
            go.AddComponent<Wardrobe>().Set = set;
            PrefabUtility.SaveAsPrefabAsset(go, $"{WorldAssetsBuild.PeopleDir}/{m.@base}.prefab");
            UnityEngine.Object.DestroyImmediate(go);
            Debug.Log($"WardrobeBuild: {m.@base}, {set.Garments.Count} garments, wears {string.Join(", ", set.Outfit)}");
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
