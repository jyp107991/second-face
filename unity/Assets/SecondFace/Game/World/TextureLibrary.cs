using System.Collections.Generic;
using System.IO;
using Newtonsoft.Json;
using UnityEngine;

namespace SecondFace.Game.World
{
    /// <summary>One entry of the fetched texture library (unity/Assets/External/library.json).</summary>
    public sealed class LibraryEntry
    {
        [JsonProperty("id")] public string Id;
        [JsonProperty("metres")] public float Metres;
        [JsonProperty("use")] public string Use;
        [JsonProperty("note")] public string Note;
        [JsonProperty("dir")] public string Dir;
    }

    /// <summary>Reads the library manifest written by tools/unity/assets.py (editor and tests; the player uses materials built from it).</summary>
    public static class TextureLibrary
    {
        public static string Root => Path.Combine(Application.dataPath, "External");

        public static Dictionary<string, LibraryEntry> Load()
        {
            var p = Path.Combine(Root, "library.json");
            if (!File.Exists(p)) return new Dictionary<string, LibraryEntry>();
            return JsonConvert.DeserializeObject<Dictionary<string, LibraryEntry>>(File.ReadAllText(p));
        }

        /// <summary>Asset path of a map of an entry: d (base colour), n (normal), mask, h (height).</summary>
        public static string MapPath(string key, string map) => $"Assets/External/Textures/{key}/{key}_{map}.{(map == "d" ? "jpg" : "png")}";
    }
}
