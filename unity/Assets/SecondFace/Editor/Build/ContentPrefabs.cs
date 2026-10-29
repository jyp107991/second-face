using System.IO;
using UnityEditor;
using UnityEngine;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// A model with its library materials bound, saved as Assets/SecondFace/Prefabs/&lt;group&gt;/&lt;name&gt;.prefab: the unit
    /// the game instantiates and the Addressables groups hold (AddressablesBuild). Committed, like the library materials
    /// they bind, so their GUIDs survive a fresh clone; rebuilt from the model by this code, so the same model gives the
    /// same file.
    /// </summary>
    public static class ContentPrefabs
    {
        public const string Dir = "Assets/SecondFace/Prefabs";

        /// <summary>The content group a model belongs to, by where its baker wrote it: kits-&lt;kit&gt;, nature.</summary>
        public static string GroupFor(string modelPath)
        {
            const string kits = "Assets/SecondFace/Kits/";
            if (modelPath.StartsWith(kits)) return "kits-" + modelPath.Substring(kits.Length).Split('/')[0].ToLowerInvariant();
            if (modelPath.StartsWith("Assets/SecondFace/Models/Nature/")) return "nature";
            return "misc";
        }

        public static string PathFor(string modelPath) => $"{Dir}/{GroupFor(modelPath)}/{Path.GetFileNameWithoutExtension(modelPath)}.prefab";

        /// <summary>The bound prefab of a model, built (or rebuilt in place, keeping its GUID) from the model now.</summary>
        public static GameObject Bound(string modelPath)
        {
            var model = AssetDatabase.LoadAssetAtPath<GameObject>(modelPath);
            if (model == null) return null;
            var path = PathFor(modelPath);
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            var go = (GameObject)PrefabUtility.InstantiatePrefab(model);
            MaterialLibrary.Bind(go);
            var prefab = PrefabUtility.SaveAsPrefabAsset(go, path);
            Object.DestroyImmediate(go);
            return prefab;
        }
    }
}
