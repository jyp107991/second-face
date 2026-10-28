using System;
using System.Collections.Generic;
using System.Linq;

namespace SecondFace.Core.World
{
    public sealed class ModeDef
    {
        public double Kmh; public double HoursPerDay; public Dictionary<string, double> Terrain; public double Noise; public double Discovery;
    }

    public sealed class TripLeg
    {
        public string From;
        public string To;
        /// <summary>Overland mode (foot, mount, vehicle) when `Network` is null.</summary>
        public string Mode;
        /// <summary>The network ridden, or null.</summary>
        public string Network;
        public double Hours;
        public int Fare;
        /// <summary>Chance of an encounter on this leg.</summary>
        public double Risk;
        public bool Ride => Network != null;
    }

    public sealed class Trip { public List<TripLeg> Legs = new(); public double Hours; public int Fare; /// <summary>Made only on networks: fast travel.</summary>
        public bool Fast; }

    public sealed class TravelOptions
    {
        /// <summary>Overland modes available (foot always is).</summary>
        public List<string> Modes = new();
        /// <summary>Networks the player may ride.</summary>
        public List<string> Networks = new();
        /// <summary>Locations the player knows of; hidden unknown ones are skipped.</summary>
        public Func<string, bool> Known = _ => false;
        /// <summary>Current hour of day (0..24), for timetables.</summary>
        public double Hour = 8;
        public bool NetworksOnly;
    }

    /// <summary>World travel (port of world/travel.ts): moving camps, overland hours, timetables, the quickest trip, discoveries.</summary>
    public static class Travel
    {
        /// <summary>Moving hours per day and km/h by mode; terrain multiplies speed (0 = impassable).</summary>
        public static readonly Dictionary<string, ModeDef> Mode = new()
        {
            ["foot"] = new ModeDef { Kmh = 4, HoursPerDay = 10, Terrain = new() { ["road"] = 1, ["track"] = 0.85, ["rough"] = 0.6, ["mountain"] = 0.4, ["marsh"] = 0.45, ["glass"] = 0.7 }, Noise = 0.8, Discovery = 1 },
            ["mount"] = new ModeDef { Kmh = 4, HoursPerDay = 10, Terrain = new() { ["road"] = 1, ["track"] = 0.9, ["rough"] = 0.65, ["mountain"] = 0.35, ["marsh"] = 0.4, ["glass"] = 0.6 }, Noise = 1, Discovery = 0.7 },
            ["vehicle"] = new ModeDef { Kmh = 18, HoursPerDay = 12, Terrain = new() { ["road"] = 1, ["track"] = 0.7, ["rough"] = 0.35, ["mountain"] = 0, ["marsh"] = 0, ["glass"] = 0.5 }, Noise = 1.4, Discovery = 0.3 },
        };

        /// <summary>Put every moving location where the day says it is; the one the player is at does not move under them. Returns, per moved location, the settlement it is near.</summary>
        public static Dictionary<string, string> PlaceMoving(WorldMap m, int day, string freeze = null)
        {
            var outD = new Dictionary<string, string>();
            foreach (var loc in m.Locations.Values)
            {
                if (loc.Moves == null || loc.Moves.Route.Count == 0) continue;
                var stop = loc.Moves.Route[(int)Math.Floor(Math.Max(0, day) / (double)Math.Max(1, loc.Moves.Days)) % loc.Moves.Route.Count];
                if (loc.Id != freeze) { loc.X = stop.X; loc.Y = stop.Y; }
                var at = loc.Moves.Route.Find(r => r.X == loc.X && r.Y == loc.Y);
                outD[loc.Id] = at?.Near ?? stop.Near;
            }
            return outD;
        }

        public static double RouteKm(WorldMap m, RouteDef r)
        {
            if (r.Km is double km && km != 0) return km;
            var a = m.Locations[r.A]; var b = m.Locations[r.B];
            return Num.Round(Math.Sqrt((a.X - b.X) * (a.X - b.X) + (a.Y - b.Y) * (a.Y - b.Y)) * 1.25);
        }

        /// <summary>Elapsed hours to cover a route by an overland mode (moving time plus nights), or null if impassable.</summary>
        public static double? OverlandHours(WorldMap m, RouteDef r, string mode)
        {
            var M = Mode[mode];
            if (!M.Terrain.TryGetValue(r.Terrain, out var f) || f == 0) return null;
            double moving = RouteKm(m, r) / (M.Kmh * f);
            double days = Math.Floor(moving / M.HoursPerDay);
            return Num.Round((moving + days * (24 - M.HoursPerDay)) * 10) / 10;
        }

        /// <summary>Hours from `hour` (0..24, fractional) until the network's next departure.</summary>
        public static double WaitForDeparture(NetworkDef n, double hour)
        {
            if (n.Every <= 1) return n.Every / 2;
            double since = (((hour - n.FirstHour) % n.Every) + n.Every) % n.Every;
            return since == 0 ? 0 : n.Every - since;
        }

        private sealed class Best { public double T; public List<TripLeg> Legs; }

        /// <summary>Quickest trip from `from` to `to` (Dijkstra over elapsed hours, timetable waits included), or null when unreachable.</summary>
        public static Trip PlanTrip(WorldMap m, string from, string to, TravelOptions o)
        {
            var modes = o.NetworksOnly ? new List<string>() : new[] { "foot" }.Concat(o.Modes).Distinct().ToList();
            var best = new Dictionary<string, Best> { [from] = new Best { T = 0, Legs = new List<TripLeg>() } };
            var open = new HashSet<string> { from };
            var done = new HashSet<string>();
            while (open.Count > 0)
            {
                string cur = null; double ct = double.PositiveInfinity;
                foreach (var id in open) { var t = best[id].T; if (t < ct) { ct = t; cur = id; } }
                open.Remove(cur);
                if (cur == to) break;
                done.Add(cur);
                var here = best[cur];
                void Relax(string next, TripLeg leg)
                {
                    if (done.Contains(next)) return;
                    if (m.Locations.TryGetValue(next, out var nl) && nl.Hidden == true && !o.Known(next)) return;
                    double t = here.T + leg.Hours;
                    if (!best.TryGetValue(next, out var b) || t < b.T)
                    {
                        var legs = new List<TripLeg>(here.Legs) { leg };
                        best[next] = new Best { T = t, Legs = legs };
                        open.Add(next);
                    }
                }
                foreach (var r in m.Routes)
                {
                    var next = r.A == cur ? r.B : r.B == cur ? r.A : null;
                    if (next == null) continue;
                    foreach (var mode in modes)
                    {
                        var h = OverlandHours(m, r, mode);
                        if (h == null) continue;
                        Relax(next, new TripLeg { From = cur, To = next, Mode = mode, Hours = h.Value, Fare = 0, Risk = Math.Min(0.95, r.Danger * (h.Value / 24) * Mode[mode].Noise) });
                    }
                }
                foreach (var nid in o.Networks)
                {
                    if (!m.Networks.TryGetValue(nid, out var n)) continue;
                    int i = n.Stops.IndexOf(cur);
                    if (i < 0) continue;
                    double hourNow = (o.Hour + here.T) % 24;
                    foreach (var j in new[] { i - 1, i + 1 })
                    {
                        if (j < 0 || j >= n.Stops.Count) continue;
                        double ride = n.LegHours[Math.Min(i, j)];
                        Relax(n.Stops[j], new TripLeg { From = cur, To = n.Stops[j], Network = nid, Hours = Num.Round((WaitForDeparture(n, hourNow) + ride) * 10) / 10, Fare = n.Fare, Risk = n.Danger });
                    }
                }
            }
            if (!best.TryGetValue(to, out var bt) || (from != to && bt.Legs.Count == 0))
                return from == to ? new Trip { Fast = true } : null;
            return new Trip { Legs = bt.Legs, Hours = Num.Round(bt.T * 10) / 10, Fare = bt.Legs.Sum(l => l.Fare), Fast = bt.Legs.All(l => l.Ride) };
        }

        /// <summary>Fast travel: the quickest trip made only on networks you can ride, if there is one.</summary>
        public static Trip FastTravel(WorldMap m, string from, string to, TravelOptions o)
        {
            var o2 = new TravelOptions { Modes = o.Modes, Networks = o.Networks, Known = o.Known, Hour = o.Hour, NetworksOnly = true };
            return PlanTrip(m, from, to, o2);
        }

        /// <summary>Hidden landmarks a leg can turn up: within `radiusKm` of the route's line, scaled by the mode's discovery factor. `roll(id)` gives 0..1.</summary>
        public static List<string> DiscoveriesAlong(WorldMap m, TripLeg leg, Func<string, double> roll, double radiusKm = 25)
        {
            var found = new List<string>();
            if (leg.Ride) return found;
            var a = m.Locations[leg.From]; var b = m.Locations[leg.To];
            double dx = b.X - a.X, dy = b.Y - a.Y, L2 = dx * dx + dy * dy; if (L2 == 0) L2 = 1;
            foreach (var loc in m.Locations.Values)
            {
                if (loc.Hidden != true) continue;
                double t = Math.Max(0, Math.Min(1, ((loc.X - a.X) * dx + (loc.Y - a.Y) * dy) / L2));
                double px = a.X + t * dx, py = a.Y + t * dy;
                double d = Math.Sqrt((loc.X - px) * (loc.X - px) + (loc.Y - py) * (loc.Y - py));
                if (d > radiusKm) continue;
                if (roll(loc.Id) < Mode[leg.Mode].Discovery * (1 - d / radiusKm) * 0.9) found.Add(loc.Id);
            }
            return found;
        }
    }
}
