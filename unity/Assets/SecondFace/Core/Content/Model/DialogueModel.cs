using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace SecondFace.Core.Dialogue
{
    public sealed class CheckMod { [JsonProperty("if")] public JObject If; [JsonProperty("dc")] public int Dc; [JsonProperty("why")] public string Why; }

    public sealed class CheckDef
    {
        [JsonProperty("skill")] public string Skill;
        [JsonProperty("attr")] public string Attr;
        [JsonProperty("dc")] public int Dc;
        /// <summary>Situational DC changes, shown to the player when they apply.</summary>
        [JsonProperty("mods")] public List<CheckMod> Mods;
    }

    public sealed class OptionDef
    {
        /// <summary>Stable id (for "asked before" memory). Defaults to `tree.node.index`.</summary>
        [JsonProperty("id")] public string Id;
        /// <summary>A string, or a list of {if, text} variants (the first whose condition holds).</summary>
        [JsonProperty("text")] public JToken Text;
        [JsonProperty("if")] public JObject If;
        [JsonProperty("showLocked")] public bool? ShowLocked;
        [JsonProperty("check")] public CheckDef Check;
        [JsonProperty("effects")] public JArray Effects;
        [JsonProperty("next")] public string Next;
        [JsonProperty("fail")] public string Fail;
        [JsonProperty("failEffects")] public JArray FailEffects;
        [JsonProperty("once")] public bool? Once;
        [JsonProperty("exit")] public bool? Exit;
        /// <summary>A service asked as often as wanted (trade, travel, a drink): never closed as a spent topic (U7).</summary>
        [JsonProperty("repeat")] public bool? Repeat;
    }

    public sealed class PassiveDef
    {
        [JsonProperty("skill")] public string Skill;
        [JsonProperty("attr")] public string Attr;
        [JsonProperty("dc")] public int? Dc;
        [JsonProperty("if")] public JObject If;
        [JsonProperty("label")] public string Label;
        [JsonProperty("text")] public JToken Text;
        [JsonProperty("effects")] public JArray Effects;
    }

    /// <summary>A companion's word on a node (U7): said when they travel with the player, the first that applies.</summary>
    public sealed class InterjectDef
    {
        [JsonProperty("companion")] public string Companion;
        [JsonProperty("if")] public JObject If;
        [JsonProperty("text")] public JToken Text;
        [JsonProperty("effects")] public JArray Effects;
    }

    public sealed class NodeDef
    {
        /// <summary>Speaker id: an NPC id, 'pc', or 'narrator'. Defaults to the tree's owner.</summary>
        [JsonProperty("speaker")] public string Speaker;
        [JsonProperty("text")] public JToken Text;
        /// <summary>What is said when the conversation comes back here (a hub after a topic): a string or variants, like
        /// <see cref="Text"/>. Without it the speaker only waits (U7: a conversation never says a line twice).</summary>
        [JsonProperty("again")] public JToken Again;
        [JsonProperty("effects")] public JArray Effects;
        [JsonProperty("passives")] public List<PassiveDef> Passives;
        /// <summary>Companions' words on this node (U7): the first whose companion is present and whose condition holds.</summary>
        [JsonProperty("interject")] public List<InterjectDef> Interject;
        [JsonProperty("options")] public List<OptionDef> Options = new();
    }

    public sealed class StartDef { [JsonProperty("if")] public JObject If; [JsonProperty("node")] public string Node; }

    public sealed class DialogueDef
    {
        [JsonProperty("id")] public string Id;
        /// <summary>NPC who owns the conversation (default speaker).</summary>
        [JsonProperty("owner")] public string Owner;
        /// <summary>Entry points tried in order; first whose condition passes wins.</summary>
        [JsonProperty("start")] public List<StartDef> Start = new();
        [JsonProperty("nodes")] public Dictionary<string, NodeDef> Nodes = new();
    }
}
