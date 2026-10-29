using System.Collections;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.World;
using SecondFace.Game.World;
using UnityEngine;
using UnityEngine.TestTools;

namespace SecondFace.Tests
{
    /// <summary>The world service reads the world files from StreamingAssets the way the player does and knows where
    /// things stand.</summary>
    public class WorldServiceTests
    {
        [UnityTest]
        public IEnumerator TheWorldLoadsFromStreamingAssets()
        {
            var go = new GameObject("World");
            var world = go.AddComponent<WorldService>();
            yield return world.Load();
            Assert.That(world.Error, Is.Null);
            Assert.That(world.Ready, Is.True);
            var shale = world.PlaceCentre("shale");
            Assert.That(WorldGrid.InWorld(shale.x, shale.z), Is.True);
            world.Focus = shale;
            var wanted = world.WantedChunks();
            Assert.That(wanted.Count, Is.EqualTo(25));
            Assert.That(wanted[0], Is.EqualTo(WorldGrid.ChunkAt(shale.x, shale.z)));
            Assert.That(world.Layout.PlacesIn(wanted[0].cx, wanted[0].cz).Select(p => p.Id), Does.Contain("shale"));
            Object.Destroy(go);
        }
    }
}
