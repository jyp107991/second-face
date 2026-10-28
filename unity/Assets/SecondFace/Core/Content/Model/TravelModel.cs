using System.Collections.Generic;
using Newtonsoft.Json;

namespace SecondFace.Core.World
{
    public sealed class MoveStop { [JsonProperty("x")] public double X; [JsonProperty("y")] public double Y; [JsonProperty("near")] public string Near; }
    public sealed class MovesDef { [JsonProperty("route")] public List<MoveStop> Route = new(); [JsonProperty("days")] public int Days; }

    public sealed class LocationDef
    {
        [JsonProperty("id")] public string Id;
        [JsonProperty("name")] public string Name;
        [JsonProperty("region")] public string Region;
        /// <summary>km on the world map (x east, y south).</summary>
        [JsonProperty("x")] public double X;
        [JsonProperty("y")] public double Y;
        /// <summary>major, minor or landmark.</summary>
        [JsonProperty("kind")] public string Kind;
        [JsonProperty("settlement")] public string Settlement;
        [JsonProperty("map")] public string Map;
        [JsonProperty("hidden")] public bool? Hidden;
        /// <summary>A camp that moves: it stands at each stop of its route for `days` days in turn.</summary>
        [JsonProperty("moves")] public MovesDef Moves;
    }

    public sealed class RouteDef
    {
        [JsonProperty("a")] public string A;
        [JsonProperty("b")] public string B;
        /// <summary>road, track, rough, mountain, marsh or glass.</summary>
        [JsonProperty("terrain")] public string Terrain;
        /// <summary>0..1 how likely trouble is per day on it.</summary>
        [JsonProperty("danger")] public double Danger;
        /// <summary>Length in km; straight-line distance × 1.25 when omitted.</summary>
        [JsonProperty("km")] public double? Km;
    }

    public sealed class NetworkDef
    {
        [JsonProperty("id")] public string Id;
        [JsonProperty("name")] public string Name;
        /// <summary>rail, barge, caravan, transit, runner or air.</summary>
        [JsonProperty("kind")] public string Kind;
        [JsonProperty("stops")] public List<string> Stops = new();
        [JsonProperty("legHours")] public List<double> LegHours = new();
        [JsonProperty("fare")] public int Fare;
        [JsonProperty("every")] public double Every;
        [JsonProperty("firstHour")] public double FirstHour;
        [JsonProperty("danger")] public double Danger;
    }

    public sealed class WorldMap
    {
        [JsonProperty("locations")] public Dictionary<string, LocationDef> Locations = new();
        [JsonProperty("routes")] public List<RouteDef> Routes = new();
        [JsonProperty("networks")] public Dictionary<string, NetworkDef> Networks = new();
    }

    public sealed class RegionDef
    {
        [JsonProperty("id")] public string Id;
        [JsonProperty("name")] public string Name;
        /// <summary>km: x0, y0, x1, y1.</summary>
        [JsonProperty("bounds")] public double[] Bounds;
        [JsonProperty("climate")] public string Climate;
    }
}
