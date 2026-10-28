using System;
using System.Collections.Generic;
using System.Linq;
using SecondFace.Core.State;
using SecondFace.Core.Stats;

namespace SecondFace.Core.World
{
    public sealed class Discovery { public string Id; public string Name; public int Km; }

    /// <summary>The road between places (port of world/roads.ts): authored encounters and hidden places noticed from the way.</summary>
    public static class Roads
    {
        private static bool HourOk(Hours h, double minutes)
        {
            if (h == null) return true;
            double hour = (minutes / 60) % 24;
            return h.From <= h.To ? hour >= h.From && hour < h.To : hour >= h.From || hour < h.To;
        }

        private static string RegionOf(WorldMap m, string id) => m.Locations.TryGetValue(id, out var l) ? l.Region : null;

        private static string TerrainOf(WorldMap m, TripLeg leg) => m.Routes.Find(r => (r.A == leg.From && r.B == leg.To) || (r.A == leg.To && r.B == leg.From))?.Terrain;

        /// <summary>The encounters that could happen on this leg right now.</summary>
        public static List<RoadEncounterDef> Eligible(GameState g, WorldMap m, TripLeg leg, IReadOnlyDictionary<string, RoadEncounterDef> defs)
        {
            var regions = new HashSet<string>();
            foreach (var r in new[] { RegionOf(m, leg.From), RegionOf(m, leg.To) }) if (r != null) regions.Add(r);
            var terrain = TerrainOf(m, leg);
            var seen = g.World.RoadSeen;
            return defs.Values.Where(e =>
                (e.Regions == null || e.Regions.Any(regions.Contains)) &&
                (e.Terrain == null || (terrain != null && e.Terrain.Contains(terrain))) &&
                HourOk(e.Hours, g.Minutes) &&
                (e.Once != true || !seen.Contains(e.Id)) &&
                (e.If == null || Logic.Test(e.If, g))).ToList();
        }

        /// <summary>Roll the leg: nothing, or one encounter, weighted.</summary>
        public static RoadEncounterDef Roll(GameState g, WorldMap m, TripLeg leg, IReadOnlyDictionary<string, RoadEncounterDef> defs, Rng rng)
        {
            if (rng.Next() >= leg.Risk) return null;
            var pool = Eligible(g, m, leg, defs);
            double total = pool.Sum(e => e.Weight);
            if (total <= 0) return null;
            double r = rng.Next() * total;
            foreach (var e in pool) { r -= e.Weight; if (r <= 0) return e; }
            return pool[pool.Count - 1];
        }

        private static double SegmentKm(double px, double py, double ax, double ay, double bx, double by)
        {
            double dx = bx - ax, dy = by - ay;
            double len2 = dx * dx + dy * dy;
            double t = len2 != 0 ? Math.Max(0, Math.Min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
            double cx = ax + t * dx, cy = ay + t * dy;
            return Math.Sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy));
        }

        /// <summary>Hidden places near the way a traveller on foot can make out, with the Survival to read the land (anything within a few km is plain).</summary>
        public static List<Discovery> DiscoveriesOnLeg(GameState g, WorldMap m, TripLeg leg, Func<string, bool> known, double reachKm = 20)
        {
            var outList = new List<Discovery>();
            if (!m.Locations.TryGetValue(leg.From, out var a) || !m.Locations.TryGetValue(leg.To, out var b) || leg.Ride) return outList;
            int survival = Sheet.Skill(g.Pc.Sheet, "survival");
            foreach (var loc in m.Locations.Values)
            {
                if (loc.Hidden != true || known(loc.Id) || loc.Id == leg.From || loc.Id == leg.To) continue;
                double km = SegmentKm(loc.X, loc.Y, a.X, a.Y, b.X, b.Y);
                if (km > reachKm) continue;
                int dc = km <= 3 ? 0 : 15 + Num.RoundInt(km * 3);
                if (survival >= dc) outList.Add(new Discovery { Id = loc.Id, Name = loc.Name, Km = Num.RoundInt(km) });
            }
            return outList;
        }
    }

    public sealed class HuntOutcome { public double Hours; public int Meat; public int Hides; public string Text; }
    public sealed class TrapLine { public string MapId; public double SetAt; public int Count; }

    /// <summary>Hunting and trapping at camp (port of world/hunting.ts). Nothing here is a deadline: traps wait.</summary>
    public static class Hunting
    {
        public static HuntOutcome Hunt(CharacterSheet sheet, double abundance, Rng rng, double hourOfDay)
        {
            int s = Sheet.Skill(sheet, "survival");
            bool good = (hourOfDay >= 5 && hourOfDay < 8) || (hourOfDay >= 17 && hourOfDay < 20);
            int dc = Num.RoundInt(45 - abundance * 30 - (good ? 10 : 0));
            if (s < dc) return new HuntOutcome { Hours = 3, Meat = 0, Hides = 0, Text = good ? "Tracks, a shape at the edge of sight, nothing in the hand. Three hours." : "Nothing moves in the heat but you. Three hours, and the water you drank doing it." };
            int margin = s - dc;
            int meat = 1 + (margin >= 20 ? 1 : 0) + (margin >= 40 && rng.Next() < 0.5 ? 1 : 0);
            int hides = rng.Next() < 0.3 + abundance * 0.3 ? 1 : 0;
            string text = meat >= 3 ? "A good day: a hare run down in the rocks and a brace of something slower, dressed where they fell." : meat == 2 ? "Two kills, small and quick, and the sun on your neck while you dressed them." : "One, after a long stalk. Enough.";
            return new HuntOutcome { Hours = 3, Meat = meat, Hides = hides, Text = text };
        }

        /// <summary>What a trap line has caught since it was set: one piece of meat per trap per twelve hours, up to two per trap.</summary>
        public static int TrapYield(TrapLine line, double now, double abundance, CharacterSheet sheet)
        {
            double hours = (now - line.SetAt) / 60;
            if (hours < 8) return 0;
            int per = Math.Min(2, (int)Math.Floor(hours / 12));
            double skillBonus = Sheet.Skill(sheet, "survival") >= 40 ? 1 : 0.7;
            return Num.RoundInt(per * line.Count * (0.4 + abundance * 0.6) * skillBonus);
        }
    }
}
