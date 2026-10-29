using System.Collections.Generic;
using System.IO;
using System.Linq;
using SecondFace.Game.World;
using UnityEditor;
using UnityEngine;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// The scatter catalog (Assets/SecondFace/World/ScatterCatalog.asset): every model id in the manifests (the nature
    /// scans, the card trees) with the Addressables addresses of its bound variants, as AddressablesBuild names them
    /// (&lt;group&gt;/&lt;prefab&gt;). Committed; rebuilt by this code in place before every player build (ContentBuildProcessor
    /// via AddressablesBuild.Prepare) and by the world's tests.
    /// </summary>
    public static class ScatterCatalogBuilder
    {
        public const string Path = "Assets/SecondFace/World/ScatterCatalog.asset";

        [MenuItem("Second Face/Build scatter catalog")]
        public static ScatterCatalog Build()
        {
            var entries = new List<ScatterCatalog.Entry>();
            foreach (var kv in ModelLibrary.Load().OrderBy(kv => kv.Key))
            {
                var addresses = ModelLibrary.VariantPaths(kv.Value)
                    .Where(p => File.Exists(ContentPrefabs.PathFor(p)))
                    .Select(p => $"{ContentPrefabs.GroupFor(p)}/{System.IO.Path.GetFileNameWithoutExtension(p)}")
                    .ToArray();
                if (addresses.Length > 0) entries.Add(new ScatterCatalog.Entry { Id = kv.Key, Addresses = addresses });
            }
            Directory.CreateDirectory(System.IO.Path.GetDirectoryName(Path));
            var catalog = AssetDatabase.LoadAssetAtPath<ScatterCatalog>(Path);
            var fresh = catalog == null;
            if (fresh) catalog = ScriptableObject.CreateInstance<ScatterCatalog>();
            catalog.Entries = entries.ToArray();
            if (fresh) AssetDatabase.CreateAsset(catalog, Path); else EditorUtility.SetDirty(catalog);
            AssetDatabase.SaveAssets();
            Debug.Log($"ScatterCatalogBuilder: {entries.Count} models, {entries.Sum(e => e.Addresses.Length)} variants");
            return catalog;
        }
    }
}
