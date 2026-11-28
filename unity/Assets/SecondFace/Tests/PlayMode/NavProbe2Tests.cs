using System.Collections;
using System.Collections.Generic;
using System.Reflection;
using NUnit.Framework;
using SecondFace.Game;
using SecondFace.Game.Play;
using SecondFace.Game.World;
using UnityEngine;
using UnityEngine.AI;
using UnityEngine.TestTools;

namespace SecondFace.Tests
{
    /// <summary>TEMP (relaunch 16, never committed): the world NavMesh's data place, area and builds against the walker, through a walk in
    /// Shale and a set-down at Cistern 9's mouth (BootTests.PeopleComeAndGo's walker off the mesh; PartyTests' companion left behind).</summary>
    public class NavProbe2Tests
    {
        private static string State(Walkabout walk, string tag)
        {
            var nav = walk.Nav;
            var dataF = typeof(WorldNav).GetField("_data", BindingFlags.NonPublic | BindingFlags.Instance);
            var pendF = typeof(WorldNav).GetField("_pending", BindingFlags.NonPublic | BindingFlags.Instance);
            var data = nav != null ? dataF.GetValue(nav) as NavMeshData : null;
            var w = walk.Walker != null ? walk.Walker.transform.position : Vector3.zero;
            var on = NavMesh.SamplePosition(w, out var hit, 2f, NavMesh.AllAreas);
            var all = Resources.FindObjectsOfTypeAll<NavMeshData>();
            var places = new List<string>();
            foreach (var d in all) if (d != data) places.Add($"{d.name}@{d.position}");
            return $"{tag}: offset ({WorldOrigin.OX}, {WorldOrigin.OZ}); walker {w}; on the mesh {on} ({(on ? (hit.position - w).magnitude.ToString("0.00") : "-")} m); agent on {walk.Walker?.Agent?.isOnNavMesh}; " +
                   $"WorldNav data {(data != null ? data.position.ToString() : "none")}, area {(nav != null ? nav.Area.ToString() : "-")}, pending {(nav != null ? pendF.GetValue(nav).ToString() : "-")}, builds {nav?.Builds}, ready {nav?.Ready}; " +
                   $"other data {places.Count}: {string.Join(" ", places)}; rebases {WorldOrigin.Rebases}";
        }

        [UnityTest, Timeout(1800000)]
        public IEnumerator TheWorldNavMeshAgainstTheWalker()
        {
            Bootstrap boot = null;
            yield return BootTests.Boot(b => boot = b);
            var walk = boot.Walkabout;
            var lines = new List<string> { State(walk, "set down in Shale") };
            yield return BootTests.TownSettled(() => walk.Townsfolk, "the town's people");
            lines.Add(State(walk, "settled"));
            // (v2: the world moved a chunk first, so the NavMesh data stands off (0, 0, 0) when the walk makes it rebuild: p_nav3's test)
            WorldOrigin.Rebase(new Vector3(WorldOrigin.Step, 0f, 0f));
            for (var i = 0; i < 6; i++) yield return null;
            lines.Add(State(walk, "rebased a chunk"));
            // a walk out of the mesh's inner square (it rebuilds round the walker)
            var start = walk.Walker.transform.position;
            foreach (var dir in new[] { Vector3.forward, Vector3.right, Vector3.back })
            {
                var to = walk.Walker.transform.position + dir * 45f;
                if (NavMesh.SamplePosition(to, out var h, 8f, NavMesh.AllAreas)) walk.Walker.GoTo(h.position);
                var t0 = Time.realtimeSinceStartup;
                var k = 0;
                while (Time.realtimeSinceStartup - t0 < 40f && walk.Walker.Goal != null)
                {
                    if (++k % 60 == 0) lines.Add(State(walk, $"walking {dir}"));
                    PartyTests.Quiet(walk);
                    yield return null;
                }
                lines.Add(State(walk, $"after the walk {dir}"));
            }
            // set down at Cistern 9's mouth (as PeopleComeAndGo)
            var mouth = boot.Stage.World.PlaceCentreWorld("cistern9");
            walk.Game.Spot = new SecondFace.Core.State.WorldSpot { X = mouth.x, Y = mouth.y, Z = mouth.z, CamYaw = 30f, CamPitch = 50f, CamDistance = 20f };
            walk.Begin(walk.Game);
            var t1 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t1 < 60f)
            {
                lines.Add(State(walk, $"at Cistern 9 +{Time.realtimeSinceStartup - t1:0} s"));
                var t2 = Time.realtimeSinceStartup; while (Time.realtimeSinceStartup - t2 < 3f) yield return null;
            }
            Debug.Log("NAV PROBE2\n" + string.Join("\n", lines));
            System.IO.File.WriteAllLines(System.IO.Path.Combine(Application.dataPath, "..", "test-results", "nav_probe2.txt"), lines);
        }
    }
}
