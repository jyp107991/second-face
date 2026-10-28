using System;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;

namespace SecondFace.Core.Content
{
    /// <summary>
    /// The content registries exported from the TypeScript source of truth (tools/port/export.ts) as JSON:
    /// maps, npcs, dialogues, quests, items, perks, traits, origins, chrome, leads, conclusions, settlements,
    /// regions, world_map, world_events, road_encounters, factions, letters, sites, garments, outfits, builds.
    /// Loaded as JSON trees first; typed views are built on top as each system is ported.
    /// </summary>
    public sealed class ContentDb
    {
        public static readonly string[] Registries =
        {
            "maps", "npcs", "dialogues", "quests", "items", "perks", "traits", "origins", "chrome", "leads", "conclusions",
            "settlements", "regions", "world_map", "world_events", "road_encounters", "factions", "letters", "sites",
            "garments", "outfits", "builds",
        };

        private readonly Dictionary<string, JToken> _tables = new();

        /// <summary>Install one registry from its JSON text.</summary>
        public void Load(string name, string json)
        {
            if (string.IsNullOrEmpty(json)) throw new ArgumentException($"Empty content registry {name}");
            _tables[name] = JToken.Parse(json);
        }

        public bool Has(string name) => _tables.ContainsKey(name);

        public JToken Table(string name) => _tables.TryGetValue(name, out var t) ? t : throw new KeyNotFoundException($"Content registry {name} not loaded");

        /// <summary>Number of entries in a keyed registry (maps, npcs, …).</summary>
        public int Count(string name) => Table(name) is JObject o ? o.Count : Table(name) is JArray a ? a.Count : 0;

        /// <summary>One entry of a keyed registry, or null.</summary>
        public JObject Entry(string name, string id) => Table(name) is JObject o && o.TryGetValue(id, out var v) ? v as JObject : null;

        public IEnumerable<string> Ids(string name) => Table(name) is JObject o ? Names(o) : Array.Empty<string>();

        private static IEnumerable<string> Names(JObject o) { foreach (var p in o.Properties()) yield return p.Name; }

        /// <summary>True when every registry the game needs is present.</summary>
        public bool Complete
        {
            get { foreach (var r in Registries) if (!_tables.ContainsKey(r)) return false; return true; }
        }
    }
}
