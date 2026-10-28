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
        [JsonIgnore] public float Footprint => Size == null || Size.Length < 3 ? 0 : Mathf.Max(Size[0], Size[2]);
    }

    /// <summary>
    /// The baked CC0 nature models (unity/Assets/SecondFace/Models/Nature, written by tools/unity/models_bake.py from the
    /// Poly Haven fetch): decimated to phone budgets, 1K textures inside the .glb, imported by glTFast.
    /// </summary>
    public static class ModelLibrary
    {
        public const string Dir = "Assets/SecondFace/Models/Nature";

        public static Dictionary<string, ModelEntry> Load()
        {
            var p = System.IO.Path.Combine(Application.dataPath, "SecondFace", "Models", "Nature", "models.json");
            if (!File.Exists(p)) return new Dictionary<string, ModelEntry>();
            return JsonConvert.DeserializeObject<Dictionary<string, ModelEntry>>(File.ReadAllText(p)) ?? new Dictionary<string, ModelEntry>();
        }

        /// <summary>Asset path of the baked model, or null when it is not baked.</summary>
        public static string AssetPath(string key)
        {
            var p = $"{Dir}/{key}.glb";
            return File.Exists(System.IO.Path.Combine(Application.dataPath, "..", p)) ? p : null;
        }
    }
}
