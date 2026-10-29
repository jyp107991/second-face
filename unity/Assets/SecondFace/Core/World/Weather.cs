using System;
using System.Collections.Generic;

namespace SecondFace.Core.World
{
    public enum WeatherKind { Clear, Haze, Dust, Storm, Rain, Fog, Snow }

    /// <summary>
    /// The weather (BUILD_PLAN §6.A.6): one kind per region per day, fixed by the day and the save's seed (a reload shows
    /// the same sky) and by the region's climate. Weather runs in spells of two or three days. Most days in the Sallow
    /// are clear and hard-lit; haze, dust and storms are events, never the default (DESIGN §12b). Nothing waits on the
    /// weather or expires because of it (CLAUDE.md §2: no time limits).
    /// </summary>
    public static class Weather
    {
        public static readonly WeatherKind[] Kinds = { WeatherKind.Clear, WeatherKind.Haze, WeatherKind.Dust, WeatherKind.Storm, WeatherKind.Rain, WeatherKind.Fog, WeatherKind.Snow };

        /// <summary>Per-region odds, in <see cref="Kinds"/> order.</summary>
        public static readonly IReadOnlyDictionary<string, float[]> Climate = new Dictionary<string, float[]>
        {
            ["sallow"] = new[] { 0.55f, 0.23f, 0.14f, 0.05f, 0.03f, 0f, 0f },
            ["glass_flats"] = new[] { 0.6f, 0.2f, 0.14f, 0.05f, 0.01f, 0f, 0f },
            ["rail_corridor"] = new[] { 0.42f, 0.25f, 0.08f, 0.06f, 0.14f, 0.05f, 0f },
            ["drowned_shore"] = new[] { 0.22f, 0.28f, 0.02f, 0.1f, 0.2f, 0.18f, 0f },
            ["meridian"] = new[] { 0.3f, 0.3f, 0.02f, 0.06f, 0.2f, 0.12f, 0f },
            ["teeth"] = new[] { 0.34f, 0.22f, 0.04f, 0.1f, 0.08f, 0.07f, 0.15f },
            ["ashlands"] = new[] { 0.3f, 0.3f, 0.28f, 0.1f, 0.02f, 0f, 0f },
            ["northern_wet"] = new[] { 0.18f, 0.3f, 0.02f, 0.1f, 0.26f, 0.14f, 0f },
        };

        /// <summary>The weather in a region on a day (1-based, as <c>Clock.DayOf</c>).</summary>
        public static WeatherKind For(string region, int day, int seed = 0)
        {
            var odds = Climate.TryGetValue(region, out var o) ? o : Climate["sallow"];
            var spell = (int)Math.Floor((day + Hash($"{region}/{seed}/spell") * 3) / 2.5);
            var r = Hash($"{region}/{seed}/{spell}");
            for (var i = 0; i < Kinds.Length; i++) { r -= odds[i]; if (r <= 0) return Kinds[i]; }
            return WeatherKind.Clear;
        }

        /// <summary>FNV-1a over the string, to 0..1 (the web game's hash, so a region's days match it).</summary>
        public static double Hash(string s)
        {
            unchecked
            {
                var h = 2166136261u;
                foreach (var c in s) { h ^= c; h *= 16777619u; }
                return h % 100000 / 100000.0;
            }
        }
    }
}
