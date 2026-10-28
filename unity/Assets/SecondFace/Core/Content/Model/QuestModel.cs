using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace SecondFace.Core.Quest
{
    public sealed class ObjectiveDef
    {
        [JsonProperty("id")] public string Id;
        [JsonProperty("text")] public string Text;
        [JsonProperty("done")] public JObject Done;
        [JsonProperty("optional")] public bool? Optional;
        [JsonProperty("hidden")] public bool? Hidden;
    }

    public sealed class Transition { [JsonProperty("if")] public JObject If; [JsonProperty("stage")] public string Stage; }

    public sealed class StageDef
    {
        [JsonProperty("journal")] public string Journal;
        [JsonProperty("objectives")] public List<ObjectiveDef> Objectives;
        [JsonProperty("onEnter")] public JArray OnEnter;
        /// <summary>Automatic transitions, tried in order.</summary>
        [JsonProperty("next")] public List<Transition> Next;
        /// <summary>Entering this stage ends the quest: done or failed.</summary>
        [JsonProperty("end")] public string End;
    }

    public sealed class RouteDef
    {
        [JsonProperty("id")] public string Id;
        [JsonProperty("kind")] public string Kind;
        [JsonProperty("label")] public string Label;
        [JsonProperty("requires")] public JObject Requires;
    }

    public sealed class QuestDef
    {
        [JsonProperty("id")] public string Id;
        [JsonProperty("title")] public string Title;
        /// <summary>ch1, a1, a2 or a3.</summary>
        [JsonProperty("act")] public string Act;
        [JsonProperty("critical")] public bool? Critical;
        [JsonProperty("start")] public string Start;
        [JsonProperty("stages")] public Dictionary<string, StageDef> Stages = new();
        [JsonProperty("xp")] public int? Xp;
        [JsonProperty("routes")] public List<RouteDef> Routes;
    }
}
