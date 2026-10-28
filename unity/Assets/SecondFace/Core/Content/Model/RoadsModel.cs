using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace SecondFace.Core.World
{
    public sealed class Hours { [JsonProperty("from")] public double From; [JsonProperty("to")] public double To; }

    public sealed class EncounterNpc
    {
        [JsonProperty("def")] public string Def;
        [JsonProperty("spot")] public string Spot;
        [JsonProperty("id")] public string Id;
        [JsonProperty("facing")] public double? Facing;
        [JsonProperty("dialogue")] public string Dialogue;
    }

    /// <summary>Something that happens on the road: picked by where you are and what you have done.</summary>
    public sealed class RoadEncounterDef
    {
        [JsonProperty("id")] public string Id;
        [JsonProperty("regions")] public List<string> Regions;
        [JsonProperty("terrain")] public List<string> Terrain;
        [JsonProperty("hours")] public Hours Hours;
        [JsonProperty("if")] public JObject If;
        /// <summary>Relative chance against the others that qualify.</summary>
        [JsonProperty("weight")] public double Weight;
        [JsonProperty("once")] public bool? Once;
        /// <summary>The roadside map it plays on; without one it is a passing thing: text and effects, no stop.</summary>
        [JsonProperty("map")] public string Map;
        [JsonProperty("npcs")] public List<EncounterNpc> Npcs;
        [JsonProperty("dialogue")] public string Dialogue;
        [JsonProperty("text")] public string Text;
        [JsonProperty("effects")] public JArray Effects;
    }
}
