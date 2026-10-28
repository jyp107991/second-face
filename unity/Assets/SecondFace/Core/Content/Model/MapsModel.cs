using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SecondFace.Core.Npc;
using SecondFace.Core.World;

namespace SecondFace.Core.Scene
{
    /// <summary>Line-of-sight and hit-chance cover a tile gives: none, half or full.</summary>
    public static class CoverKind
    {
        public const string None = "none", Half = "half", Full = "full";
        public static int Rank(string c) => c == Full ? 2 : c == Half ? 1 : 0;
        public static string Max(string a, string b) => Rank(a ?? None) >= Rank(b ?? None) ? (a ?? None) : b;
    }

    /// <summary>What a legend character means: a floor, a wall of some height, a prop, or nothing at all.</summary>
    public sealed class TileDef
    {
        [JsonProperty("floor")] public string Floor;
        [JsonProperty("wall")] public string Wall;
        /// <summary>Wall height in metres (default 2.6). Low walls (&lt;1.2) act as half cover and don't block sight.</summary>
        [JsonProperty("wallHeight")] public double? WallHeight;
        /// <summary>Roof for a building this wall encloses (default by wall kind; "none" leaves it open to the sky).</summary>
        [JsonProperty("roof")] public string Roof;
        [JsonProperty("prop")] public string Prop;
        [JsonProperty("propRot")] public double? PropRot;
        /// <summary>Explicit override; otherwise derived from wall/prop.</summary>
        [JsonProperty("blocks")] public bool? Blocks;
        [JsonProperty("cover")] public string Cover;
        /// <summary>Tile has no floor at all (void / outside the playable area).</summary>
        [JsonProperty("empty")] public bool? Empty;
    }

    public sealed class PropPlacement
    {
        [JsonProperty("kind")] public string Kind;
        [JsonProperty("x")] public int X;
        [JsonProperty("y")] public int Y;
        /// <summary>Rotation in quarter turns, or radians if `rad` is set.</summary>
        [JsonProperty("rot")] public double? Rot;
        [JsonProperty("rad")] public bool? Rad;
        [JsonProperty("scale")] public double? Scale;
        [JsonProperty("tint")] public int? Tint;
        /// <summary>Interactable id (container, door, terminal) referenced by scripts / content.</summary>
        [JsonProperty("id")] public string Id;
    }

    public sealed class LightDef
    {
        [JsonProperty("x")] public double X;
        [JsonProperty("y")] public double Y;
        [JsonProperty("height")] public double? Height;
        [JsonProperty("color")] public int Color;
        [JsonProperty("intensity")] public double Intensity;
        [JsonProperty("range")] public double Range;
        [JsonProperty("flicker")] public double? Flicker;
    }

    public sealed class SpawnDef
    {
        [JsonProperty("id")] public string Id;
        [JsonProperty("x")] public int X;
        [JsonProperty("y")] public int Y;
        [JsonProperty("facing")] public double? Facing;
    }

    /// <summary>Where an exit leads: another map's spawn, or the world map.</summary>
    public sealed class ExitTarget
    {
        [JsonProperty("location")] public string Location;
        [JsonProperty("spawn")] public string Spawn;
        [JsonProperty("worldMap")] public bool? WorldMap;
    }

    public sealed class ExitDef
    {
        [JsonProperty("x")] public int X;
        [JsonProperty("y")] public int Y;
        [JsonProperty("w")] public int? W;
        [JsonProperty("h")] public int? H;
        [JsonProperty("to")] public ExitTarget To;
        [JsonProperty("label")] public string Label;
        /// <summary>Usable only while this holds (a hatch you have opened, a gate you are allowed through).</summary>
        [JsonProperty("if")] public JObject If;
        /// <summary>Applied when taken (flags such as "left home").</summary>
        [JsonProperty("effects")] public JArray Effects;
    }

    /// <summary>Something that happens when the player steps on a tile: a message, flags, a quest beat, an ambush.</summary>
    public sealed class TriggerDef
    {
        [JsonProperty("id")] public string Id;
        [JsonProperty("x")] public int X;
        [JsonProperty("y")] public int Y;
        [JsonProperty("w")] public int? W;
        [JsonProperty("h")] public int? H;
        [JsonProperty("if")] public JObject If;
        /// <summary>Fire only the first time (default true).</summary>
        [JsonProperty("once")] public bool? Once;
        [JsonProperty("text")] public string Text;
        [JsonProperty("effects")] public JArray Effects;
    }

    public sealed class AmbientLight { [JsonProperty("color")] public int Color; [JsonProperty("intensity")] public double Intensity; }

    public sealed class AmbienceDef
    {
        [JsonProperty("indoor")] public bool Indoor;
        [JsonProperty("fogColor")] public int FogColor;
        [JsonProperty("fogDensity")] public double FogDensity;
        /// <summary>Dust particle density 0..1.</summary>
        [JsonProperty("dust")] public double Dust;
        [JsonProperty("ambient")] public AmbientLight Ambient;
        /// <summary>Colour grade strength 0..1.</summary>
        [JsonProperty("grade")] public double? Grade;
        /// <summary>Ambient sound bed id.</summary>
        [JsonProperty("sound")] public string Sound;
        /// <summary>The feel of the place (bright, peaceful, bustling, haze, grim): sets the grade and sound unless overridden.</summary>
        [JsonProperty("mood")] public string Mood;
    }

    public sealed class ContainerDef
    {
        [JsonProperty("name")] public string Name;
        /// <summary>Pairs of [item id, count].</summary>
        [JsonProperty("items")] public List<JArray> Items;
        [JsonProperty("tolls")] public double? Tolls;
        /// <summary>Lock difficulty (Locks skill needed); absent = unlocked.</summary>
        [JsonProperty("lock")] public double? Lock;

        public IEnumerable<(string id, int count)> Entries()
        {
            if (Items == null) yield break;
            foreach (var e in Items) yield return ((string)e[0], (int)e[1]);
        }
    }

    public sealed class TalkDef { [JsonProperty("dialogue")] public string Dialogue; [JsonProperty("name")] public string Name; }

    public sealed class NpcPlacement
    {
        [JsonProperty("def")] public string Def;
        [JsonProperty("x")] public int X;
        [JsonProperty("y")] public int Y;
        [JsonProperty("facing")] public double? Facing;
        /// <summary>Instance id (defaults to def id; must be unique on the map).</summary>
        [JsonProperty("id")] public string Id;
        /// <summary>Present only while this holds (a prisoner until freed, visitors on a certain day).</summary>
        [JsonProperty("if")] public JObject If;
        /// <summary>Conversation for this placement (the same person says different things in a different place).</summary>
        [JsonProperty("dialogue")] public string Dialogue;
        /// <summary>Routine for this placement (empty = stays put; overrides the def's).</summary>
        [JsonProperty("schedule")] public List<ScheduleEntry> Schedule;
    }

    public sealed class Area { [JsonProperty("x")] public int X; [JsonProperty("y")] public int Y; [JsonProperty("w")] public int W; [JsonProperty("h")] public int H; }

    /// <summary>Background people generated on load: how many of what kind, where they wander, when they are about.</summary>
    public sealed class ExtrasDef
    {
        [JsonProperty("count")] public int Count;
        [JsonProperty("roles")] public List<string> Roles;
        [JsonProperty("life")] public string Life;
        [JsonProperty("faction")] public string Faction;
        [JsonProperty("team")] public string Team;
        [JsonProperty("hostileIf")] public JObject HostileIf;
        /// <summary>Ages drawn from this range.</summary>
        [JsonProperty("ages")] public List<double> Ages;
        [JsonProperty("area")] public Area Area;
        [JsonProperty("spots")] public List<string> Spots;
        /// <summary>Present only during these hours (wraps past midnight).</summary>
        [JsonProperty("hours")] public Hours Hours;
        [JsonProperty("barks")] public List<string> Barks;
        /// <summary>Generic talk tree (default by role).</summary>
        [JsonProperty("talk")] public string Talk;
    }

    /// <summary>An authored place: rows of legend characters, props, lights, spawns, exits, people and scripts.</summary>
    public sealed class MapDef
    {
        [JsonProperty("id")] public string Id;
        [JsonProperty("name")] public string Name;
        /// <summary>Rows of characters; row 0 is the north edge. Each char is looked up in `legend`.</summary>
        [JsonProperty("layout")] public List<string> Layout;
        [JsonProperty("legend")] public Dictionary<string, TileDef> Legend;
        [JsonProperty("props")] public List<PropPlacement> Props;
        [JsonProperty("lights")] public List<LightDef> Lights;
        [JsonProperty("spawns")] public List<SpawnDef> Spawns;
        [JsonProperty("exits")] public List<ExitDef> Exits;
        [JsonProperty("ambience")] public AmbienceDef Ambience;
        [JsonProperty("npcs")] public List<NpcPlacement> Npcs;
        /// <summary>Container contents keyed by prop id.</summary>
        [JsonProperty("containers")] public Dictionary<string, ContainerDef> Containers;
        /// <summary>Seed for procedural detail (scatter, texture variation).</summary>
        [JsonProperty("seed")] public double? Seed;
        /// <summary>Settlement this map belongs to (prices, standing, news).</summary>
        [JsonProperty("settlement")] public string Settlement;
        /// <summary>Named tiles for schedules and scripts.</summary>
        [JsonProperty("spots")] public Dictionary<string, Tile> Spots;
        [JsonProperty("triggers")] public List<TriggerDef> Triggers;
        /// <summary>Props (by id) that open a conversation when used: terminals, a sealed door, a body to examine.</summary>
        [JsonProperty("talk")] public Dictionary<string, TalkDef> Talk;
        /// <summary>Under a roof or under the ground: the field map opens but you cannot set out from here.</summary>
        [JsonProperty("interior")] public bool? Interior;
        /// <summary>How much game there is to hunt or trap at camp (0..1); none when absent.</summary>
        [JsonProperty("hunting")] public double? Hunting;
        [JsonProperty("extras")] public List<ExtrasDef> Extras;
    }
}
