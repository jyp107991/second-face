using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SecondFace.Core.Stats;

namespace SecondFace.Core.World
{
    public sealed class SettlementDef
    {
        [JsonProperty("id")] public string Id;
        [JsonProperty("name")] public string Name;
        /// <summary>Neighbours and travel days along the road.</summary>
        [JsonProperty("roads")] public Dictionary<string, double> Roads = new();
        /// <summary>0..1 how fast gossip moves.</summary>
        [JsonProperty("traffic")] public double Traffic;
        [JsonProperty("type")] public string Type;
        [JsonProperty("region")] public string Region;
        [JsonProperty("prosperity")] public double? Prosperity;
        [JsonProperty("kit")] public string Kit;
        [JsonProperty("owner")] public string Owner;
        [JsonProperty("crisis")] public string Crisis;
    }

    public sealed class LeadDef { [JsonProperty("id")] public string Id; [JsonProperty("text")] public string Text; [JsonProperty("label")] public string Label; }

    public sealed class ConclusionDef
    {
        [JsonProperty("id")] public string Id;
        [JsonProperty("text")] public string Text;
        /// <summary>Leads that together support it (all required).</summary>
        [JsonProperty("from")] public List<string> From = new();
        [JsonProperty("effects")] public JArray Effects;
    }

    public sealed class EventAt
    {
        [JsonProperty("day")] public int? Day;
        [JsonProperty("hour")] public double? Hour;
        [JsonProperty("where")] public string Where;
    }

    /// <summary>A scheduled world event: at a day and hour, or (the usual form) the next time the clock reaches an hour once armed, waiting for the player at `where`.</summary>
    public sealed class WorldEventDef
    {
        [JsonProperty("id")] public string Id;
        [JsonProperty("at")] public EventAt At = new();
        [JsonProperty("armedIf")] public JObject ArmedIf;
        [JsonProperty("preventedIf")] public JObject PreventedIf;
        [JsonProperty("effects")] public JArray Effects;
        [JsonProperty("preventedEffects")] public JArray PreventedEffects;
    }

    public sealed class RankDef
    {
        [JsonProperty("id")] public string Id;
        [JsonProperty("title")] public string Title;
        [JsonProperty("mods")] public List<Modifier> Mods;
        [JsonProperty("flags")] public List<string> Flags;
        [JsonProperty("priceMul")] public double? PriceMul;
        [JsonProperty("access")] public List<string> Access;
        [JsonProperty("requires")] public JObject Requires;
    }

    public sealed class FactionDef
    {
        [JsonProperty("id")] public string Id;
        [JsonProperty("name")] public string Name;
        [JsonProperty("desc")] public string Desc;
        [JsonProperty("home")] public string Home;
        [JsonProperty("ranks")] public List<RankDef> Ranks = new();
        [JsonProperty("conflicts")] public List<string> Conflicts;
        [JsonProperty("initiation")] public string Initiation;
        [JsonProperty("group")] public string Group;
    }

    public sealed class LetterReply { [JsonProperty("text")] public string Text; [JsonProperty("effects")] public JArray Effects; }

    public sealed class LetterDef
    {
        [JsonProperty("id")] public string Id;
        [JsonProperty("to")] public string To;
        [JsonProperty("topic")] public string Topic;
        [JsonProperty("if")] public JObject If;
        [JsonProperty("text")] public string Text;
        [JsonProperty("days")] public int Days;
        [JsonProperty("effects")] public JArray Effects;
        [JsonProperty("reply")] public LetterReply Reply;
        [JsonProperty("once")] public bool? Once;
    }
}
