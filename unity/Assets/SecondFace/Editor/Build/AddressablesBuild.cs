using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.AddressableAssets;
using UnityEditor.AddressableAssets.Settings;
using UnityEditor.AddressableAssets.Settings.GroupSchemas;
using UnityEditor.Build;
using UnityEngine;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// The Addressables content (BUILD_PLAN §6.A.7): one group per kit (kits-shelter, kits-frontier, kits-trees) and the
    /// nature models (nature), each entry a bound prefab (ContentPrefabs) at the address &lt;group&gt;/&lt;name&gt; with a
    /// label by kind (kit, tree, nature). Bundles are local (StreamingAssets, no remote in v1) and built with the player:
    /// <see cref="ContentBuildProcessor"/> refreshes the entries before every player build, CI's included. The groups
    /// grow with the world: places-&lt;region&gt; in P3, people-&lt;set&gt; in P4, motion, ui, audio-&lt;region&gt; after.
    /// </summary>
    public static class AddressablesBuild
    {
        /// <summary>Group, the folder its models come from, the label every entry carries.</summary>
        public static readonly (string Group, string Dir, string Label)[] Sources =
        {
            ("kits-shelter", "Assets/SecondFace/Kits/Shelter", "kit"),
            ("kits-frontier", "Assets/SecondFace/Kits/Frontier", "kit"),
            ("kits-trees", "Assets/SecondFace/Kits/Trees", "tree"),
            ("nature", "Assets/SecondFace/Models/Nature", "nature"),
        };

        /// <summary>The library materials, one bundle each: a prefab's bundle then holds only meshes, and loading a piece
        /// brings the textures of its own surfaces once, instead of every group carrying a copy of every texture it touches
        /// (the first build put 126 MB in the shelter kit's bundle).</summary>
        public const string MaterialsGroup = "materials";

        /// <summary>Creates the settings and groups if missing, rebuilds every source's bound prefab and makes the group's
        /// entries exactly those prefabs. Returns the number of entries.</summary>
        [MenuItem("Second Face/Build addressable content")]
        public static int Prepare()
        {
            var settings = AddressableAssetSettingsDefaultObject.GetSettings(true);
            settings.BuildAddressablesWithPlayerBuild = AddressableAssetSettings.PlayerBuildOption.BuildWithPlayer;
            var n = 0;
            foreach (var (groupName, dir, label) in Sources)
            {
                settings.AddLabel(label, false);
                var group = settings.FindGroup(groupName) ?? settings.CreateGroup(groupName, false, false, false, null,
                    typeof(BundledAssetGroupSchema), typeof(ContentUpdateGroupSchema));
                var bundled = group.GetSchema<BundledAssetGroupSchema>();
                bundled.BundleMode = BundledAssetGroupSchema.BundlePackingMode.PackTogether;
                bundled.Compression = BundledAssetGroupSchema.BundleCompressionMode.LZ4;
                bundled.BuildPath.SetVariableByName(settings, AddressableAssetSettings.kLocalBuildPath);
                bundled.LoadPath.SetVariableByName(settings, AddressableAssetSettings.kLocalLoadPath);
                var wanted = new HashSet<string>();
                var models = Directory.Exists(dir) ? Directory.GetFiles(dir, "*.fbx").Select(p => p.Replace('\\', '/')).OrderBy(p => p) : Enumerable.Empty<string>();
                foreach (var model in models)
                {
                    var prefab = ContentPrefabs.Bound(model);
                    if (prefab == null) { Debug.LogWarning($"AddressablesBuild: {model} did not import"); continue; }
                    var guid = AssetDatabase.AssetPathToGUID(AssetDatabase.GetAssetPath(prefab));
                    var entry = settings.CreateOrMoveEntry(guid, group, false, false);
                    entry.address = $"{groupName}/{prefab.name}";
                    entry.SetLabel(label, true, true, false);
                    wanted.Add(guid);
                    n++;
                }
                foreach (var stale in group.entries.Where(e => !wanted.Contains(e.guid)).ToList())
                    group.RemoveAssetEntry(stale, false);
                EditorUtility.SetDirty(group);
            }
            // the materials the prefabs above were bound to (built while binding), as their own group
            {
                var group = settings.FindGroup(MaterialsGroup) ?? settings.CreateGroup(MaterialsGroup, false, false, false, null,
                    typeof(BundledAssetGroupSchema), typeof(ContentUpdateGroupSchema));
                var bundled = group.GetSchema<BundledAssetGroupSchema>();
                bundled.BundleMode = BundledAssetGroupSchema.BundlePackingMode.PackSeparately;
                bundled.Compression = BundledAssetGroupSchema.BundleCompressionMode.LZ4;
                bundled.BuildPath.SetVariableByName(settings, AddressableAssetSettings.kLocalBuildPath);
                bundled.LoadPath.SetVariableByName(settings, AddressableAssetSettings.kLocalLoadPath);
                settings.AddLabel("material", false);
                var wanted = new HashSet<string>();
                foreach (var mat in Directory.GetFiles(MaterialLibrary.Dir, "*.mat").Select(p => p.Replace('\\', '/')).OrderBy(p => p))
                {
                    var guid = AssetDatabase.AssetPathToGUID(mat);
                    if (string.IsNullOrEmpty(guid)) continue;
                    var entry = settings.CreateOrMoveEntry(guid, group, false, false);
                    entry.address = $"{MaterialsGroup}/{Path.GetFileNameWithoutExtension(mat)}";
                    entry.SetLabel("material", true, true, false);
                    wanted.Add(guid);
                    n++;
                }
                foreach (var stale in group.entries.Where(e => !wanted.Contains(e.guid)).ToList())
                    group.RemoveAssetEntry(stale, false);
                EditorUtility.SetDirty(group);
            }
            EditorUtility.SetDirty(settings);
            AssetDatabase.SaveAssets();
            Debug.Log($"AddressablesBuild: {n} entries in {Sources.Length + 1} groups");
            ScatterCatalogBuilder.Build();   // the world's props name these addresses
            DetailMeshes.Build();            // the terrain's small scatter: its own group, "details"
            return n;
        }

        /// <summary>Prepare, then build the bundles for the active target (what the player build does on its own).</summary>
        [MenuItem("Second Face/Build addressable bundles")]
        public static void BuildBundles()
        {
            Prepare();
            AddressableAssetSettings.BuildPlayerContent(out var result);
            if (!string.IsNullOrEmpty(result.Error)) Debug.LogError($"AddressablesBuild: {result.Error}");
            else Debug.Log($"AddressablesBuild: bundles built in {result.Duration:0.0}s, {result.FileRegistry.GetFilePaths().Count()} files");
        }
    }

    /// <summary>Refreshes the Addressables entries before every player build (callbackOrder 0 runs before Addressables'
    /// own processor at 1, which then builds the bundles with the player).</summary>
    public sealed class ContentBuildProcessor : BuildPlayerProcessor
    {
        public override int callbackOrder => 0;
        public override void PrepareForBuild(BuildPlayerContext buildPlayerContext) => AddressablesBuild.Prepare();
    }
}
