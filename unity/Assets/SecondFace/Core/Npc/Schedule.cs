using System.Collections.Generic;
using Newtonsoft.Json;

namespace SecondFace.Core.Npc
{
    public sealed class Tile { [JsonProperty("x")] public int X; [JsonProperty("y")] public int Y; public Tile() { } public Tile(int x, int y) { X = x; Y = y; } }

    /// <summary>A time-of-day entry of an NPC's routine: where they are and what they do.</summary>
    public sealed class ScheduleEntry
    {
        /// <summary>Hours 0–24; `from` > `to` wraps past midnight.</summary>
        [JsonProperty("from")] public double From;
        [JsonProperty("to")] public double To;
        [JsonProperty("spot")] public string Spot;
        [JsonProperty("at")] public Tile At;
        /// <summary>sleep, work, idle, drink, patrol, pray, trade, away.</summary>
        [JsonProperty("activity")] public string Activity;
    }

    /// <summary>NPC daily schedules (port of npc/schedule.ts): pure lookups; the game walks actors there.</summary>
    public static class Schedule
    {
        public static bool InHours(double from, double to, double hour) => from <= to ? hour >= from && hour < to : hour >= from || hour < to;

        /// <summary>The entry in force at `hour`, or null (the NPC stays where placed).</summary>
        public static ScheduleEntry At(IList<ScheduleEntry> entries, double hour)
        {
            if (entries == null) return null;
            foreach (var e in entries) if (InHours(e.From, e.To, hour)) return e;
            return null;
        }

        /// <summary>Resolve an entry's tile against the map's spots.</summary>
        public static Tile TileOf(ScheduleEntry e, IReadOnlyDictionary<string, Tile> spots)
        {
            if (e.At != null) return e.At;
            return e.Spot != null && spots != null && spots.TryGetValue(e.Spot, out var t) ? t : null;
        }
    }
}
