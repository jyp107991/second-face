using System.Collections.Generic;
using System.IO;
using Newtonsoft.Json;
using UnityEngine;

namespace SecondFace.Game.World
{
    public sealed class ModelEntry
    {
        [JsonProperty("id")] public string Id;
        [JsonProperty("use")] public string Use;
        [JsonProperty("note")] public string Note;
        [JsonProperty("path")] public string Path;
        [JsonProperty("tris")] public int Tris;
        /// <summary>Width, height, depth in metres.</summary>
        [JsonProperty("size")] public float[] Size;
        /// <summary>"scatter" (a prop placed by the rules) or "patch" (a scanned ground feature placed deliberately).</summary>
        [JsonProperty("place")] public string Place;
        /// <summary>Every variant baked from the scan (one model each, re-centred on its own base).</summary>
        [JsonProperty("variants")] public List<ModelVariant> Variants;
        [JsonIgnore] public float Footprint => Size == null || Size.Length < 3 ? 0 : Mathf.Max(Size[0], Size[2]);
    }

    public sealed class ModelVariant
    {
        [JsonProperty("path")] public string Path;
        /// <summary>Width, height, depth in metres.</summary>
        [JsonProperty("size")] public float[] Size;
        [JsonProperty("tris")] public int Tris;
    }

    /// <summary>
    /// The baked nature models: the CC0 scans (unity/Assets/SecondFace/Models/Nature, written by tools/unity/models_bake.py
    /// from the Poly Haven fetch: decimated to phone budgets, one FBX per variant, textures in tex/) and the card trees
    /// (Kits/Trees, written by tools/unity/kits/trees.py, one FBX per seed), merged by id; the material library binds both.
    /// </summary>
    public static class ModelLibrary
    {
        public const string Dir = "Assets/SecondFace/Models/Nature";

        private static readonly string[][] Manifests = { new[] { "SecondFace", "Models", "Nature", "models.json" }, new[] { "SecondFace", "Kits", "Trees", "trees.json" } };

        public static Dictionary<string, ModelEntry> Load()
        {
            var all = new Dictionary<string, ModelEntry>();
            foreach (var parts in Manifests)
            {
                var p = System.IO.Path.Combine(Application.dataPath, System.IO.Path.Combine(parts));
                if (!File.Exists(p)) continue;
                var m = JsonConvert.DeserializeObject<Dictionary<string, ModelEntry>>(File.ReadAllText(p));
                if (m != null) foreach (var kv in m) all[kv.Key] = kv.Value;
            }
            return all;
        }

        /// <summary>Asset paths of a model's baked variants (empty when it is not baked).</summary>
        public static List<string> VariantPaths(ModelEntry e)
        {
            var paths = new List<string>();
            if (e?.Variants != null) foreach (var v in e.Variants) if (Exists(v.Path)) paths.Add(v.Path);
            if (paths.Count == 0 && e?.Path != null && Exists(e.Path)) paths.Add(e.Path);
            return paths;
        }

        private static bool Exists(string assetPath) => File.Exists(System.IO.Path.Combine(Application.dataPath, "..", assetPath));
    }
}
