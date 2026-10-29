using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using Newtonsoft.Json;

namespace SecondFace.Core.World
{
    /// <summary>
    /// The world's chunk grid (BUILD_PLAN §6.A.1): metres, origin at the south-west corner, x east, z north; 512 m chunks,
    /// 47 × 32 of them over the 24 × 16 km world.
    /// </summary>
    public static class WorldGrid
    {
        public const float Width = 24000f, Depth = 16000f, Chunk = 512f;
        public static readonly int ChunksX = (int)Math.Ceiling(Width / Chunk), ChunksZ = (int)Math.Ceiling(Depth / Chunk);

        public static bool InWorld(float x, float z) => x >= 0 && z >= 0 && x < Width && z < Depth;
        public static bool ValidChunk(int cx, int cz) => cx >= 0 && cz >= 0 && cx < ChunksX && cz < ChunksZ;

        /// <summary>The chunk holding a point, clamped to the world.</summary>
        public static (int cx, int cz) ChunkAt(float x, float z) =>
            (Math.Clamp((int)Math.Floor(x / Chunk), 0, ChunksX - 1), Math.Clamp((int)Math.Floor(z / Chunk), 0, ChunksZ - 1));

        /// <summary>The south-west corner of a chunk.</summary>
        public static (float x, float z) Origin(int cx, int cz) => (cx * Chunk, cz * Chunk);

        /// <summary>The chunks within <paramref name="radius"/> chunks of the one holding a point (a square), nearest
        /// first by the distance from the point to each chunk's centre; the chunk holding the point first among equals
        /// (a point on a border is as near two centres), then by index, so the order is stable.</summary>
        public static List<(int cx, int cz)> Around(float x, float z, int radius)
        {
            var (ox, oz) = ChunkAt(x, z);
            var list = new List<(int cx, int cz, float d)>();
            for (var dz = -radius; dz <= radius; dz++)
                for (var dx = -radius; dx <= radius; dx++)
                {
                    int cx = ox + dx, cz = oz + dz;
                    if (!ValidChunk(cx, cz)) continue;
                    float mx = (cx + 0.5f) * Chunk - x, mz = (cz + 0.5f) * Chunk - z;
                    list.Add((cx, cz, mx * mx + mz * mz));
                }
            int Own((int cx, int cz, float d) c) => c.cx == ox && c.cz == oz ? 0 : 1;
            list.Sort((a, b) => a.d != b.d ? a.d.CompareTo(b.d) : Own(a) != Own(b) ? Own(a).CompareTo(Own(b)) : a.cz != b.cz ? a.cz.CompareTo(b.cz) : a.cx.CompareTo(b.cx));
            var result = new List<(int, int)>(list.Count);
            foreach (var c in list) result.Add((c.cx, c.cz));
            return result;
        }
    }

    /// <summary>What the control map says about a point: base height in metres (relative to sea level), roughness 0..1,
    /// the biome (index into <see cref="WorldLayout.Biomes"/>), water 0..1.</summary>
    public readonly struct ControlSample
    {
        public readonly float Height, Roughness, Water;
        public readonly int Biome;
        public ControlSample(float height, float roughness, int biome, float water) { Height = height; Roughness = roughness; Biome = biome; Water = water; }
    }

    /// <summary>
    /// The control map (BUILD_PLAN §6.A.2), written by tools/unity/world.py as StreamingAssets/world/control.bin: a grid
    /// of texels <see cref="MetresPerTexel"/> apart with texel (0,0) at the world origin, RGBA uint16 per texel:
    /// R base height (0..1 over <see cref="Floor"/>..Floor+<see cref="Span"/>), G roughness, B biome × 4096, A water.
    /// Sampled bilinearly anywhere; the biome is the nearest texel's.
    /// </summary>
    public sealed class ControlMap
    {
        public const float Floor = -50f, Span = 600f;
        public readonly int Width, Height, MetresPerTexel;
        private readonly ushort[] _data;

        public ControlMap(int width, int height, int metresPerTexel, ushort[] rgba)
        {
            if (rgba.Length != width * height * 4) throw new ArgumentException("control map: data does not match its size");
            Width = width; Height = height; MetresPerTexel = metresPerTexel; _data = rgba;
        }

        /// <summary>Reads control.bin ('SFCM', version 1, width, height, metres per texel, then the texels).</summary>
        public static ControlMap Read(byte[] bytes)
        {
            if (bytes.Length < 20 || Encoding.ASCII.GetString(bytes, 0, 4) != "SFCM") throw new InvalidDataException("control map: not an SFCM file");
            var version = BitConverter.ToInt32(bytes, 4);
            if (version != 1) throw new InvalidDataException($"control map: version {version} unknown");
            int w = BitConverter.ToInt32(bytes, 8), h = BitConverter.ToInt32(bytes, 12), m = BitConverter.ToInt32(bytes, 16);
            var n = w * h * 4;
            if (bytes.Length != 20 + n * 2) throw new InvalidDataException("control map: truncated");
            var data = new ushort[n];
            Buffer.BlockCopy(bytes, 20, data, 0, n * 2);   // little-endian on every platform the game runs on
            return new ControlMap(w, h, m, data);
        }

        private float Channel(int i, int j, int c) => _data[((Math.Clamp(j, 0, Height - 1) * Width) + Math.Clamp(i, 0, Width - 1)) * 4 + c] / 65535f;

        public ControlSample Sample(float x, float z)
        {
            float fx = x / MetresPerTexel, fz = z / MetresPerTexel;
            int i = (int)Math.Floor(fx), j = (int)Math.Floor(fz);
            float tx = fx - i, tz = fz - j;
            float Bilinear(int c) =>
                (Channel(i, j, c) * (1 - tx) + Channel(i + 1, j, c) * tx) * (1 - tz) + (Channel(i, j + 1, c) * (1 - tx) + Channel(i + 1, j + 1, c) * tx) * tz;
            var biome = (int)Math.Round(Channel((int)Math.Round(fx), (int)Math.Round(fz), 2) * 65535f / 4096f);
            return new ControlSample(Floor + Bilinear(0) * Span, Bilinear(1), biome, Bilinear(3));
        }
    }

    /// <summary>A location of the world: footprint (centre and size in metres), the ground level it stands at, the
    /// direction its main road leaves by (degrees clockwise from north), its region and the map it is built from.</summary>
    public sealed class PlaceInfo
    {
        [JsonProperty("id")] public string Id;
        [JsonProperty("name")] public string Name;
        [JsonProperty("kind")] public string Kind;
        [JsonProperty("region")] public string Region;
        [JsonProperty("biome")] public string Biome;
        [JsonProperty("map")] public string Map;
        [JsonProperty("hidden")] public bool Hidden;
        /// <summary>Stands in the sea on its own legs (the rigs): no ground is stamped for it.</summary>
        [JsonProperty("offshore")] public bool Offshore;
        [JsonProperty("centre")] public float[] Centre;
        [JsonProperty("size")] public float[] Size;
        [JsonProperty("elevation")] public float Elevation;
        [JsonProperty("entryYaw")] public float EntryYaw;

        public bool Contains(float x, float z, float margin = 0f) =>
            Math.Abs(x - Centre[0]) <= Size[0] / 2 + margin && Math.Abs(z - Centre[1]) <= Size[1] / 2 + margin;
    }

    /// <summary>A road, the rail line or a river: a polyline in world metres with a width.</summary>
    public sealed class WayInfo
    {
        [JsonProperty("id")] public string Id;
        [JsonProperty("kind")] public string Kind;
        [JsonProperty("width")] public float Width;
        [JsonProperty("points")] public List<float[]> Points = new();
    }

    /// <summary>
    /// The world's places and ways (StreamingAssets/world/places.json and roads.json, written by tools/unity/world.py
    /// from the content's world map): what stands where, before any of it is built.
    /// </summary>
    public sealed class WorldLayout
    {
        public string[] Biomes = Array.Empty<string>();
        public float SeaLevel;
        public Dictionary<string, PlaceInfo> Places = new();
        public List<WayInfo> Roads = new(), Rails = new(), Rivers = new();

        private sealed class PlacesFile
        {
            [JsonProperty("world")] public WorldHeader World;
            [JsonProperty("places")] public Dictionary<string, PlaceInfo> Places;
        }
        private sealed class WorldHeader
        {
            [JsonProperty("biomes")] public string[] Biomes;
            [JsonProperty("sea")] public float Sea;
        }
        private sealed class WaysFile
        {
            [JsonProperty("roads")] public List<WayInfo> Roads;
            [JsonProperty("rails")] public List<WayInfo> Rails;
            [JsonProperty("rivers")] public List<WayInfo> Rivers;
        }

        public static WorldLayout Read(string placesJson, string roadsJson)
        {
            var p = JsonConvert.DeserializeObject<PlacesFile>(placesJson);
            var w = JsonConvert.DeserializeObject<WaysFile>(roadsJson);
            return new WorldLayout
            {
                Biomes = p.World?.Biomes ?? Array.Empty<string>(),
                SeaLevel = p.World?.Sea ?? 0f,
                Places = p.Places ?? new Dictionary<string, PlaceInfo>(),
                Roads = w.Roads ?? new List<WayInfo>(),
                Rails = w.Rails ?? new List<WayInfo>(),
                Rivers = w.Rivers ?? new List<WayInfo>(),
            };
        }

        /// <summary>The places whose footprint, widened by <paramref name="margin"/>, overlaps a chunk.</summary>
        public IEnumerable<PlaceInfo> PlacesIn(int cx, int cz, float margin = 24f)
        {
            var (x0, z0) = WorldGrid.Origin(cx, cz);
            foreach (var p in Places.Values)
            {
                float hx = p.Size[0] / 2 + margin, hz = p.Size[1] / 2 + margin;
                if (p.Centre[0] + hx >= x0 && p.Centre[0] - hx < x0 + WorldGrid.Chunk && p.Centre[1] + hz >= z0 && p.Centre[1] - hz < z0 + WorldGrid.Chunk)
                    yield return p;
            }
        }
    }
}
