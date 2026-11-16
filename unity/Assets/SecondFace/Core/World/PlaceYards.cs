using System;
using System.Collections.Generic;
using System.Linq;

namespace SecondFace.Core.World
{
    /// <summary>
    /// A place's open ground dressed as people live on it (docs/UPGRADE.md "dense living places"; play-ch1 T43: Knock, Shale
    /// and the overpass read as empty lots at the game's camera). The map's own props stand where the story needs them; the
    /// yards, between the buildings and off the ways people walk, get the small scenes a lived-in place is made of: a cook
    /// fire with stools, a work corner, a kitchen garden, a water point, a junk pile, a generator, stores, a bench in the
    /// shade. Pure and seeded: the same place is always dressed the same way.
    /// </summary>
    public static class PlaceYards
    {
        /// <summary>One small scene, anchored at its middle (place metres), turned to face <see cref="Yaw"/>.</summary>
        public sealed class Vignette
        {
            public string Kind;
            public float X, Z, Yaw, Radius;
            public int Seed;
        }

        /// <summary>The scenes and the room each needs (m, radius).</summary>
        public static readonly (string Kind, float Radius)[] Kinds =
        {
            ("cookfire", 2.0f), ("workbench", 1.8f), ("garden", 2.2f), ("water", 1.4f), ("junk", 1.8f),
            ("generator", 1.4f), ("stores", 1.6f), ("rest", 1.6f), ("stove", 1.6f),
        };

        /// <summary>A walkway is kept this clear either side of the line between two points people go between (m).</summary>
        public const float LaneClear = 1.6f;
        /// <summary>The least room round a story prop, a marker or a door (m).</summary>
        public const float KeepClear = 2.0f;
        /// <summary>One scene for about this much open ground (m²), and never more than <see cref="MaxScenes"/>.</summary>
        public const float AreaPerScene = 70f;
        public const int MaxScenes = 26;

        /// <summary>The scenes for a place: on open ground off the lanes between its doors, exits, spawns, people's spots
        /// and the things they use; never on a story prop, a marker or a doorway.</summary>
        public static List<Vignette> For(PlacePlan plan, int seed, Func<string, double> weight = null)
        {
            var points = new List<(float X, float Z)>();
            foreach (var m in plan.Markers) points.Add((m.X, m.Z));
            foreach (var w in plan.Walls)
                foreach (var o in w.Openings)
                {
                    if (o.Kind == PlacePlan.OpeningKind.Window) continue;
                    var len = w.Length;
                    if (len < 1e-3f) continue;
                    float dx = (w.Bx - w.Ax) / len, dz = (w.Bz - w.Az) / len;
                    var px = w.Ax + dx * o.At; var pz = w.Az + dz * o.At;
                    // (just outside the door, where the lane begins)
                    points.Add((px + w.OutX * 1.5f, pz + w.OutZ * 1.5f));
                }
            // the lanes: each point to its two nearest others and to the place's middle (a hamlet's ways meet in its square)
            var lanes = new List<(float Ax, float Az, float Bx, float Bz)>();
            for (var i = 0; i < points.Count; i++)
            {
                var near = points.Select((p, k) => (k, d: Sq(p.X - points[i].X, p.Z - points[i].Z))).Where(t => t.k != i).OrderBy(t => t.d).Take(2);
                foreach (var (k, _) in near) lanes.Add((points[i].X, points[i].Z, points[k].X, points[k].Z));
                lanes.Add((points[i].X, points[i].Z, 0f, 0f));
            }
            var blocks = plan.Items.Select(it => (it.X, it.Z)).Concat(plan.Markers.Select(m => (m.X, m.Z))).ToList();

            bool Open(float x, float z)
            {
                int i = (int)Math.Floor((x + plan.Width / 2) / PlacePlan.Tile), j = (int)Math.Floor((plan.Depth / 2 - z) / PlacePlan.Tile);
                if (i < 1 || j < 1 || i >= plan.Columns - 1 || j >= plan.Rows - 1) return false;   // (not on the place's rim)
                var k = j * plan.Columns + i;
                var g = plan.Ground != null ? plan.Ground[k] : null;
                if (g == null || plan.RoomAt[k] >= 0) return false;
                return g is "sand" or "dirt" or "rubble" or "gravel" or "grass" or "concrete" or "mud";
            }
            bool Fits(float x, float z, float r)
            {
                // the whole footprint on open ground, off every lane, clear of the story's things and of walls
                for (var a = 0; a < 8; a++)
                {
                    var t = a * Math.PI / 4;
                    if (!Open(x + (float)Math.Cos(t) * r, z + (float)Math.Sin(t) * r)) return false;
                }
                if (!Open(x, z)) return false;
                foreach (var l in lanes) if (SegDist(x, z, l.Ax, l.Az, l.Bx, l.Bz) < r + LaneClear) return false;
                foreach (var b in blocks) if (Sq(x - b.Item1, z - b.Item2) < (r + KeepClear) * (r + KeepClear)) return false;
                foreach (var w in plan.Walls) if (SegDist(x, z, w.Ax, w.Az, w.Bx, w.Bz) < r + 0.4f) return false;
                foreach (var f in plan.Fences) if (SegDist(x, z, f.Ax, f.Az, f.Bx, f.Bz) < r + 0.4f) return false;
                return true;
            }

            // open ground, for the scenes' count
            var open = 0;
            for (var j = 0; j < plan.Rows; j++)
                for (var i = 0; i < plan.Columns; i++)
                {
                    var (cx, cz) = plan.Centre(i, j);
                    if (Open(cx, cz)) open++;
                }
            var want = Math.Min(MaxScenes, (int)(open * PlacePlan.Tile * PlacePlan.Tile / AreaPerScene));
            var rng = new Rng((uint)(seed * 2654435761u + 7));
            var picked = new List<Vignette>();
            // candidates on a jittered grid, taken in a seeded order
            var cands = new List<(float X, float Z)>();
            const float Step = 3.5f;
            for (var z = -plan.Depth / 2 + Step; z < plan.Depth / 2 - Step / 2; z += Step)
                for (var x = -plan.Width / 2 + Step; x < plan.Width / 2 - Step / 2; x += Step)
                    cands.Add((x + (float)rng.Range(-1.2, 1.2), z + (float)rng.Range(-1.2, 1.2)));
            for (var i = cands.Count - 1; i > 0; i--) { var k = rng.Int(0, i); (cands[i], cands[k]) = (cands[k], cands[i]); }
            var total = Kinds.Sum(k => weight?.Invoke(k.Kind) ?? 1.0);
            foreach (var (x, z) in cands)
            {
                if (picked.Count >= want) break;
                // a kind by the place's weights
                var roll = rng.Range(0, total);
                var kind = Kinds[0];
                foreach (var k in Kinds) { roll -= weight?.Invoke(k.Kind) ?? 1.0; if (roll <= 0) { kind = k; break; } }
                if (!Fits(x, z, kind.Radius)) continue;
                if (picked.Any(v => Sq(v.X - x, v.Z - z) < (v.Radius + kind.Radius + 1.5f) * (v.Radius + kind.Radius + 1.5f))) continue;
                // facing the nearest lane (people sit and work facing the way)
                var best = float.MaxValue; var yaw = 0f;
                foreach (var l in lanes)
                {
                    var (d, qx, qz) = Closest(x, z, l.Ax, l.Az, l.Bx, l.Bz);
                    if (d < best) { best = d; yaw = (float)(Math.Atan2(qx - x, qz - z) * 180 / Math.PI); }
                }
                picked.Add(new Vignette { Kind = kind.Kind, X = x, Z = z, Yaw = yaw, Radius = kind.Radius, Seed = rng.Int(0, (1 << 30) - 1) });
                blocks.Add((x, z));
            }
            return picked;
        }

        private static float Sq(float a, float b) => a * a + b * b;

        private static float SegDist(float px, float pz, float ax, float az, float bx, float bz) => Closest(px, pz, ax, az, bx, bz).D;

        private static (float D, float X, float Z) Closest(float px, float pz, float ax, float az, float bx, float bz)
        {
            float dx = bx - ax, dz = bz - az;
            var l2 = dx * dx + dz * dz;
            var t = l2 < 1e-6f ? 0f : Math.Max(0f, Math.Min(1f, ((px - ax) * dx + (pz - az) * dz) / l2));
            float qx = ax + dx * t, qz = az + dz * t;
            return ((float)Math.Sqrt(Sq(px - qx, pz - qz)), qx, qz);
        }
    }
}
