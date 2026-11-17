using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SecondFace.Core.Content;
using SecondFace.Core.State;

namespace SecondFace.Core.World
{
    /// <summary>A thing set in a place while its group stands: a kind of stand-in (the game draws each kind), at a marker
    /// of a map (a spot, a spawn, a talking prop, any stamped id), offset in metres in the marker's own frame (x to its
    /// right, z ahead), turned by <see cref="Yaw"/> degrees; <see cref="Count"/> of them a <see cref="Step"/> apart.</summary>
    public sealed class DressingProp
    {
        [JsonProperty("map")] public string Map;
        [JsonProperty("anchor")] public string Anchor;
        [JsonProperty("kind")] public string Kind;
        [JsonProperty("x")] public float X;
        [JsonProperty("z")] public float Z;
        [JsonProperty("yaw")] public float Yaw;
        [JsonProperty("count")] public int? Count;
        /// <summary>Metres from one to the next (x, z in the marker's frame).</summary>
        [JsonProperty("step")] public float[] Step;
    }

    /// <summary>One group of a place's dressing (the dressing registry, <c>dressing.json</c>): shown while its condition
    /// holds, as stand-in things at markers and, over the places of a settlement, a darkened city (its lights and lamps
    /// out) or smoke over the sky.</summary>
    public sealed class DressingDef
    {
        [JsonProperty("if")] public JObject If;
        /// <summary>The settlement whose places the group's darkness and smoke cover.</summary>
        [JsonProperty("settlement")] public string Settlement;
        /// <summary>The city's lights out: its windows, signs and screens dark, its lamps off.</summary>
        [JsonProperty("cityDark")] public bool? CityDark;
        /// <summary>Smoke over the sky, 0..1 (<see cref="SkyTurn.Smoke"/>).</summary>
        [JsonProperty("smoke")] public float? Smoke;
        [JsonProperty("props")] public List<DressingProp> Props;
    }

    /// <summary>
    /// A place's dressing by the story (pure rules; Game <c>PlaceDressing</c> shows it): groups of stand-in things set at
    /// a map's markers and changes over a settlement's places (lights out, smoke over the sky), each standing while its
    /// condition on the game's flags holds. The groups are data (the dressing registry), so the story can change a place's
    /// look without engine changes.
    /// </summary>
    public static class Dressing
    {
        /// <summary>The registry's name (an optional one: a game without it is dressed by nothing).</summary>
        public const string Registry = "dressing";

        /// <summary>The kinds of stand-in the game draws.</summary>
        public static readonly string[] Kinds = { "wagon", "crate", "chalk", "lamp", "register", "fire_glow" };

        public static Dictionary<string, DressingDef> Load(ContentDb db) =>
            db != null && db.Has(Registry) ? Content.Registry.Table<DressingDef>(db, Registry) : new Dictionary<string, DressingDef>();

        /// <summary>The groups standing in a game, in the registry's order.</summary>
        public static List<string> Active(IReadOnlyDictionary<string, DressingDef> groups, GameState g)
        {
            var on = new List<string>();
            if (groups == null || g == null) return on;
            foreach (var kv in groups)
                if (kv.Value != null && (kv.Value.If == null || Logic.Test(kv.Value.If, g))) on.Add(kv.Key);
            return on;
        }

        /// <summary>What the standing groups do to a settlement's places: its city dark, and how much smoke is over its sky.</summary>
        public static (bool CityDark, float Smoke) Over(IReadOnlyDictionary<string, DressingDef> groups, IEnumerable<string> active, string settlement)
        {
            var dark = false;
            var smoke = 0f;
            if (groups == null || active == null || string.IsNullOrEmpty(settlement)) return (false, 0f);
            foreach (var id in active)
            {
                if (!groups.TryGetValue(id, out var d) || d == null || d.Settlement != settlement) continue;
                dark |= d.CityDark == true;
                if (d.Smoke is float s && s > smoke) smoke = System.Math.Min(1f, s);
            }
            return (dark, smoke);
        }

        /// <summary>Where each of a prop's things stands, in the marker's frame: (x, z) metres and its yaw in degrees.</summary>
        public static List<(float X, float Z, float Yaw)> Layout(DressingProp p)
        {
            var at = new List<(float, float, float)>();
            if (p == null) return at;
            var n = System.Math.Max(1, p.Count ?? 1);
            float sx = p.Step != null && p.Step.Length > 0 ? p.Step[0] : 0f, sz = p.Step != null && p.Step.Length > 1 ? p.Step[1] : 0f;
            for (var i = 0; i < n; i++) at.Add((p.X + sx * i, p.Z + sz * i, p.Yaw));
            return at;
        }
    }
}
