using System.Collections.Generic;
using System.IO;
using System.Linq;
using SecondFace.Game.People;
using UnityEditor;
using UnityEngine;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// The game's Rocketbox people as prefabs (L3, owner 2026-11-05). Each folder of
    /// <see cref="RocketboxImportPostprocessor.People"/> (installed by tools/unity/people/rb_install.py) holds one person: its
    /// FBX (a humanoid, its vertices' heights in their colour) and its textures, named by the FBX's material slots
    /// (<c>m009_body</c>: <c>m009_body_color.jpg</c>, the outfit bake's neutral cloth; <c>_normal.jpg</c>; <c>_dye.png</c>, the
    /// dye groups and wear; <c>m009_head</c>, <c>m009_opacity</c> as photographed or opened). Each slot gets a material of the
    /// Person shader (the body dyed by its mask; the head as photographed; the hair and lashes cut out, both faces drawn),
    /// saved beside it, and the person a prefab; every prefab goes in the <see cref="RocketboxCatalog"/> that WorldAssets
    /// names (Second Face/Build world assets).
    /// </summary>
    public static class RocketboxPeopleBuild
    {
        public static string CatalogPath => RocketboxImportPostprocessor.People + "RocketboxCatalog.asset";

        [MenuItem("Second Face/Build Rocketbox people")]
        public static RocketboxCatalog Build()
        {
            var root = RocketboxImportPostprocessor.People.TrimEnd('/');
            // (no people installed, as on a checkout without them: no catalogue, and the game stands its own figures)
            if (!Directory.Exists(root)) { Debug.LogWarning($"RocketboxPeopleBuild: no {root} (tools/unity/people/rb_install.py)"); return null; }
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>(CatalogPath);
            var fresh = cat == null;
            if (fresh) cat = ScriptableObject.CreateInstance<RocketboxCatalog>();
            var shader = Shader.Find("SecondFace/Person");
            var entries = new List<RocketboxCatalog.Entry>();
            _cloths = null;
            // the flank correctives first: measured on each person as imported, written beside the FBX, and the FBX
            // imported again with them where they changed (RocketboxImportPostprocessor adds them to the body's mesh)
            if (Directory.Exists(root) && shader != null)
            {
                var again = new List<string>();
                foreach (var dir in Directory.GetDirectories(root).OrderBy(d => d))
                {
                    var id = Path.GetFileName(dir);
                    var fbx = $"{root}/{id}/{id}.fbx";
                    var model = AssetDatabase.LoadAssetAtPath<GameObject>(fbx);
                    if (model == null) continue;
                    var flank = BodyCorrectives.PathFor(fbx);
                    var before = File.Exists(flank) ? File.ReadAllBytes(flank) : null;
                    var go = (GameObject)PrefabUtility.InstantiatePrefab(model);
                    try { BodyCorrectives.Build(go, fbx, id); }
                    finally { Object.DestroyImmediate(go); }
                    var after = File.Exists(flank) ? File.ReadAllBytes(flank) : null;
                    if (after != null && (before == null || !before.SequenceEqual(after))) again.Add(fbx);
                }
                foreach (var fbx in again) { AssetDatabase.ImportAsset(BodyCorrectives.PathFor(fbx)); AssetDatabase.ImportAsset(fbx, ImportAssetOptions.ForceUpdate); }
                if (again.Count > 0) Debug.Log($"RocketboxPeopleBuild: flank correctives for {again.Count} people");
            }
            if (Directory.Exists(root) && shader != null)
                foreach (var dir in Directory.GetDirectories(root).OrderBy(d => d))
                {
                    var id = Path.GetFileName(dir);
                    var prefab = Person(id, $"{root}/{id}", shader);
                    if (prefab != null) entries.Add(new RocketboxCatalog.Entry { Id = id, Prefab = prefab });
                }
            if (shader == null) Debug.LogError("RocketboxPeopleBuild: no SecondFace/Person shader");
            cat.People = entries.ToArray();
            if (fresh) AssetDatabase.CreateAsset(cat, CatalogPath); else EditorUtility.SetDirty(cat);
            AssetDatabase.SaveAssets();
            Debug.Log($"RocketboxPeopleBuild: {entries.Count} people");
            return cat;
        }

        private static Texture2D Tex(string dir, string slot, string suffix)
        {
            foreach (var ext in new[] { ".jpg", ".png" })
            {
                var t = AssetDatabase.LoadAssetAtPath<Texture2D>($"{dir}/{slot}_{suffix}{ext}");
                if (t != null) return t;
            }
            return null;
        }

        private static Material[] _cloths;

        private static GameObject Person(string id, string dir, Shader shader)
        {
            var model = AssetDatabase.LoadAssetAtPath<GameObject>($"{dir}/{id}.fbx");
            if (model == null) { Debug.LogWarning($"RocketboxPeopleBuild: no {dir}/{id}.fbx"); return null; }
            var go = (GameObject)PrefabUtility.InstantiatePrefab(model);
            var made = new Dictionary<string, Material>();
            foreach (var r in go.GetComponentsInChildren<SkinnedMeshRenderer>(true))
            {
                var mats = r.sharedMaterials;
                for (var i = 0; i < mats.Length; i++)
                {
                    var slot = mats[i] != null ? mats[i].name : null;
                    if (slot == null) continue;
                    if (!made.TryGetValue(slot, out var m))
                    {
                        m = Material(dir, slot, shader);
                        made[slot] = m;
                    }
                    if (m != null) mats[i] = m;
                }
                r.sharedMaterials = mats;
                r.skinnedMotionVectors = false;
                r.updateWhenOffscreen = false;
            }
            // the torso's cross-sections at rest, so the arms are kept out of it and drawn in to rest at its sides
            // (ArmClearance; docs/PEOPLE_MOTION.md A4, C1)
            TorsoMeasure.Measure(go);
            // the layers worn over the body's own clothes, cut from its skin (the wardrobe rule)
            RocketboxLayers.Build(go, dir, id, _cloths ??= RocketboxLayers.Materials());
            var path = $"{dir}/{id}.prefab";
            var prefab = PrefabUtility.SaveAsPrefabAsset(go, path);
            Object.DestroyImmediate(go);
            return prefab;
        }

        private static Material Material(string dir, string slot, Shader shader)
        {
            var col = Tex(dir, slot, "color");
            if (col == null) return null;
            var path = $"{dir}/{slot}.mat";
            var m = AssetDatabase.LoadAssetAtPath<Material>(path);
            var fresh = m == null;
            if (fresh) m = new Material(shader);
            m.shader = shader;
            m.SetTexture("_BaseMap", col);
            var nrm = Tex(dir, slot, "normal");
            if (nrm != null) m.SetTexture("_BumpMap", nrm);
            m.SetFloat("_BumpScale", 1f);
            m.SetColor("_BaseColor", Color.white);
            var low = slot.ToLowerInvariant();
            if (low.EndsWith("_opacity"))
            {
                // hair, brows and lashes: cut out by the texture's alpha, both faces drawn, dull (the hair rule)
                m.SetFloat("_Cutoff", 0.35f);
                m.SetFloat("_Cull", 0f);
                m.SetFloat("_Smoothness", 0.22f);
                m.SetFloat("_HairSheen", 0.25f);
                m.SetFloat("_DyeOn", 0f);
            }
            else
            {
                m.SetFloat("_Cutoff", 0f);
                m.SetFloat("_Cull", 2f);
                var dye = Tex(dir, slot, "dye");
                if (dye != null && low.EndsWith("_body"))
                {
                    m.SetTexture("_DyeMask", dye);
                    m.SetFloat("_DyeOn", 1f);
                    m.SetFloat("_Smoothness", 0.28f);
                }
                else
                {
                    m.SetFloat("_DyeOn", 0f);
                    m.SetFloat("_Smoothness", low.EndsWith("_head") ? 0.36f : 0.3f);
                }
            }
            if (fresh) AssetDatabase.CreateAsset(m, path); else EditorUtility.SetDirty(m);
            return m;
        }
    }
}
