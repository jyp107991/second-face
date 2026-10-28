using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SecondFace.Core.Dialogue;
using SecondFace.Core.Inventory;
using SecondFace.Core.Quest;
using SecondFace.Core.Stats;
using SecondFace.Core.World;

namespace SecondFace.Core.Content
{
    /// <summary>
    /// The typed registries the rules look things up in (the web game's registerRules/registerChrome/registerItems…).
    /// Filled from a ContentDb; tests and tools may also set them directly. Static because there is one game.
    /// </summary>
    public static class Registry
    {
        public static Dictionary<string, TraitDef> Traits = new();
        public static Dictionary<string, PerkDef> Perks = new();
        public static Dictionary<string, ChromeDef> Chrome = new();
        public static Dictionary<string, OriginDef> Origins = new();
        public static Dictionary<string, ItemDef> Items = new();
        public static Dictionary<string, FactionDef> Factions = new();
        public static Dictionary<string, SettlementDef> Settlements = new();
        public static Dictionary<string, LeadDef> Leads = new();
        public static Dictionary<string, ConclusionDef> Conclusions = new();
        public static Dictionary<string, WorldEventDef> WorldEvents = new();
        public static Dictionary<string, LetterDef> Letters = new();
        public static Dictionary<string, DialogueDef> Dialogues = new();
        public static Dictionary<string, QuestDef> Quests = new();
        public static WorldMap WorldMap = new();
        public static Dictionary<string, RegionDef> Regions = new();
        public static Dictionary<string, RoadEncounterDef> RoadEncounters = new();

        public static readonly JsonSerializer Strict = new() { MissingMemberHandling = MissingMemberHandling.Error };
        public static readonly JsonSerializer Lenient = new();

        /// <summary>A registry as a dictionary by id: exported either as an object keyed by id or as a list of entries with ids.</summary>
        public static Dictionary<string, T> Table<T>(ContentDb db, string name, bool strict = false)
        {
            var tok = db.Table(name);
            var ser = strict ? Strict : Lenient;
            if (tok is JArray arr)
            {
                var d = new Dictionary<string, T>();
                foreach (var e in arr) d[(string)e["id"]] = e.ToObject<T>(ser);
                return d;
            }
            return tok.ToObject<Dictionary<string, T>>(ser);
        }

        /// <summary>Install every registry the rules need from the loaded content.</summary>
        public static void Load(ContentDb db)
        {
            Traits = Table<TraitDef>(db, "traits");
            Perks = Table<PerkDef>(db, "perks");
            Chrome = Table<ChromeDef>(db, "chrome");
            Origins = Table<OriginDef>(db, "origins");
            Items = Table<ItemDef>(db, "items");
            Factions = Table<FactionDef>(db, "factions");
            Settlements = Table<SettlementDef>(db, "settlements");
            Leads = Table<LeadDef>(db, "leads");
            Conclusions = Table<ConclusionDef>(db, "conclusions");
            WorldEvents = Table<WorldEventDef>(db, "world_events");
            Letters = Table<LetterDef>(db, "letters");
            Dialogues = Table<DialogueDef>(db, "dialogues");
            Quests = Table<QuestDef>(db, "quests");
            WorldMap = db.Table("world_map").ToObject<WorldMap>(Lenient);
            Regions = Table<RegionDef>(db, "regions");
            RoadEncounters = Table<RoadEncounterDef>(db, "road_encounters");
        }
    }
}
