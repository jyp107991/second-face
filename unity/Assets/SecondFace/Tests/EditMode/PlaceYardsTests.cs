using System;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Content;
using SecondFace.Core.World;

namespace SecondFace.Tests
{
    /// <summary>The yards' scenes (play-ch1 T43): open ground dressed, the ways people walk and the story's things left clear.</summary>
    public class PlaceYardsTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        [TestCase("c9_mouth")]
        [TestCase("shale")]
        [TestCase("overpass")]
        public void YardsAreDressedOffTheWays(string mapId)
        {
            var plan = PlacePlan.Build(Registry.Maps[mapId]);
            var a = PlaceYards.For(plan, 7);
            var b = PlaceYards.For(plan, 7);
            Assert.That(a.Count, Is.GreaterThan(4), $"{mapId}: its yards hold some scenes");
            Assert.That(a.Select(v => (v.Kind, v.X, v.Z)), Is.EqualTo(b.Select(v => (v.Kind, v.X, v.Z))), "the same place is dressed the same way");
            Assert.That(a.Select(v => v.Kind).Distinct().Count(), Is.GreaterThan(2), "more than one kind of scene");
            foreach (var v in a)
            {
                foreach (var m in plan.Markers)
                    Assert.That(Math.Sqrt((m.X - v.X) * (m.X - v.X) + (m.Z - v.Z) * (m.Z - v.Z)), Is.GreaterThan(v.Radius + PlaceYards.KeepClear - 1e-3), $"{mapId}: a {v.Kind} on the {m.Kind} {m.Id}");
                foreach (var it in plan.Items)
                    Assert.That(Math.Sqrt((it.X - v.X) * (it.X - v.X) + (it.Z - v.Z) * (it.Z - v.Z)), Is.GreaterThan(v.Radius + PlaceYards.KeepClear - 1e-3), $"{mapId}: a {v.Kind} on the story's {it.Kind}");
                Assert.That(plan.RoomOf((v.X + plan.Width / 2) / PlacePlan.Tile, (plan.Depth / 2 - v.Z) / PlacePlan.Tile), Is.EqualTo(-1), $"{mapId}: a {v.Kind} inside a building");
            }
            for (var i = 0; i < a.Count; i++)
                for (var j = i + 1; j < a.Count; j++)
                    Assert.That(Math.Sqrt((a[i].X - a[j].X) * (a[i].X - a[j].X) + (a[i].Z - a[j].Z) * (a[i].Z - a[j].Z)), Is.GreaterThan(a[i].Radius + a[j].Radius), $"{mapId}: two scenes on each other");
        }

        /// <summary>The yards never cut a way people walk (P8: the new places' posts were found cut off from the arrival): on
        /// the map's own grid, every person's post and every thing the story uses that the arrival reaches on foot is still
        /// reached with the yard scenes standing.</summary>
        [TestCase("c9_mouth")] [TestCase("shale")] [TestCase("overpass")] [TestCase("tollhouse")] [TestCase("signalhill")]
        [TestCase("drywells")] [TestCase("orchard")] [TestCase("wheel")] [TestCase("saltpan")] [TestCase("windpumps")]
        [TestCase("ninebridge")] [TestCase("openfield")] [TestCase("sump")]
        public void YardsLeaveEveryPostReachable(string mapId)
        {
            var map = Registry.Maps[mapId];
            var plan = PlacePlan.Build(map);
            int n = plan.Columns, m = plan.Rows;
            var open = new bool[n * m];
            for (var j = 0; j < m && j < map.Layout.Count; j++)
                for (var i = 0; i < n && i < map.Layout[j].Length; i++)
                {
                    var d = map.Legend != null && map.Legend.TryGetValue(map.Layout[j][i].ToString(), out var t) ? t : null;
                    open[j * n + i] = d != null && d.Empty != true && d.Wall == null && d.Blocks != true && (d.Prop == null || d.Blocks == false);
                }
            bool[] Reach(bool[] free, int si, int sj)
            {
                var seen = new bool[n * m];
                var q = new System.Collections.Generic.Queue<int>();
                if (si < 0 || sj < 0 || si >= n || sj >= m) return seen;
                seen[sj * n + si] = true; q.Enqueue(sj * n + si);
                while (q.Count > 0)
                {
                    var k = q.Dequeue(); int ci = k % n, cj = k / n;
                    foreach (var (di, dj) in new[] { (1, 0), (-1, 0), (0, 1), (0, -1) })
                    {
                        int a = ci + di, b = cj + dj;
                        if (a < 0 || b < 0 || a >= n || b >= m) continue;
                        var kk = b * n + a;
                        if (seen[kk] || !free[kk]) continue;
                        seen[kk] = true; q.Enqueue(kk);
                    }
                }
                return seen;
            }
            bool Near(bool[] r, int i, int j) { for (var dj = -1; dj <= 1; dj++) for (var di = -1; di <= 1; di++) { int a = i + di, b = j + dj; if (a >= 0 && b >= 0 && a < n && b < m && r[b * n + a]) return true; } return false; }
            var spawn = map.Spawns.FirstOrDefault(s => s.Id == "start") ?? map.Spawns.First();
            var before = Reach(open, spawn.X, spawn.Y);
            var withYards = (bool[])open.Clone();
            foreach (var v in PlaceYards.For(plan, 7))
                for (var j = 0; j < m; j++)
                    for (var i = 0; i < n; i++)
                    {
                        var (cx, cz) = plan.Centre(i, j);
                        if ((cx - v.X) * (cx - v.X) + (cz - v.Z) * (cz - v.Z) <= (v.Radius + PlacePlan.Tile * 0.5f) * (v.Radius + PlacePlan.Tile * 0.5f)) withYards[j * n + i] = false;
                    }
            var after = Reach(withYards, spawn.X, spawn.Y);
            var points = (map.Npcs ?? new System.Collections.Generic.List<SecondFace.Core.Scene.NpcPlacement>()).Select(p => (Id: "npc " + (p.Id ?? p.Def), p.X, p.Y)).ToList();
            var cut = points.Where(p => Near(before, p.X, p.Y) && !Near(after, p.X, p.Y)).Select(p => p.Id).ToList();
            var never = points.Where(p => !Near(before, p.X, p.Y)).Select(p => p.Id).ToList();
            System.Console.WriteLine($"{mapId}: {points.Count} posts; cut off by the yards: {(cut.Count == 0 ? "none" : string.Join(", ", cut))}; not reached on the bare grid: {(never.Count == 0 ? "none" : string.Join(", ", never))}");
            Assert.That(cut, Is.Empty, $"{mapId}: the yards cut off");
        }
    }
}
