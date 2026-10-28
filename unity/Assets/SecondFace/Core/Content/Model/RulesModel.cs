using System.Collections.Generic;
using Newtonsoft.Json;

namespace SecondFace.Core.Stats
{
    /// <summary>A change to a stat: the common currency of traits, perks, chems, injuries, gear and chrome.</summary>
    public sealed class Modifier
    {
        [JsonProperty("target")] public string Target;
        /// <summary>Additive change (points / percent points).</summary>
        [JsonProperty("add")] public double? Add;
        /// <summary>Multiplicative change applied after adds (1 = none).</summary>
        [JsonProperty("mul")] public double? Mul;

        public Modifier() { }
        public Modifier(string target, double? add = null, double? mul = null) { Target = target; Add = add; Mul = mul; }
    }

    public sealed class TraitDef
    {
        [JsonProperty("id")] public string Id;
        [JsonProperty("name")] public string Name;
        [JsonProperty("desc")] public string Desc;
        [JsonProperty("mods")] public List<Modifier> Mods = new();
        /// <summary>Verb/behaviour flags checked by systems (e.g. 'no_two_handed').</summary>
        [JsonProperty("flags")] public List<string> Flags;
    }

    public sealed class PerkReq
    {
        [JsonProperty("level")] public int Level;
        [JsonProperty("attrs")] public Dictionary<string, int> Attrs;
        [JsonProperty("skills")] public Dictionary<string, int> Skills;
        [JsonProperty("notTraits")] public List<string> NotTraits;
    }

    public sealed class PerkDef
    {
        [JsonProperty("id")] public string Id;
        [JsonProperty("name")] public string Name;
        [JsonProperty("desc")] public string Desc;
        [JsonProperty("ranks")] public int? Ranks;
        [JsonProperty("req")] public PerkReq Req = new();
        [JsonProperty("mods")] public List<Modifier> Mods;
        [JsonProperty("flags")] public List<string> Flags;
    }

    public sealed class ChromeUpkeep { [JsonProperty("item")] public string Item; [JsonProperty("everyDays")] public int EveryDays; }
    public sealed class ChromeSurgery { [JsonProperty("hours")] public double Hours; [JsonProperty("difficulty")] public int Difficulty; }

    /// <summary>A cybernetic piece: one per slot, superhuman verbs and modifiers, a Drift load, upkeep, surgery.</summary>
    public sealed class ChromeDef
    {
        [JsonProperty("id")] public string Id;
        [JsonProperty("name")] public string Name;
        [JsonProperty("desc")] public string Desc;
        [JsonProperty("slot")] public string Slot;
        /// <summary>old: salvaged pre-Burn; dark: Mender-built; concern: new, excellent, networked.</summary>
        [JsonProperty("grade")] public string Grade;
        [JsonProperty("drift")] public double Drift;
        [JsonProperty("price")] public int Price;
        [JsonProperty("mods")] public List<Modifier> Mods;
        [JsonProperty("abilities")] public List<string> Abilities;
        [JsonProperty("visible")] public bool Visible;
        [JsonProperty("upkeep")] public ChromeUpkeep Upkeep;
        [JsonProperty("surgery")] public ChromeSurgery Surgery = new();
        [JsonProperty("networked")] public bool? Networked;
    }

    public sealed class OriginDef
    {
        [JsonProperty("id")] public string Id;
        [JsonProperty("name")] public string Name;
        [JsonProperty("desc")] public string Desc;
        [JsonExtensionData] public IDictionary<string, Newtonsoft.Json.Linq.JToken> Rest;
    }
}
