using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.World;

namespace SecondFace.Tests
{
    public class StreamingPolicyTests
    {
        private static readonly StreamingPolicy Policy = new StreamingPolicy();
        private const float X = 15000f, Z = 6000f;
        private static (int, int) Focus => WorldGrid.ChunkAt(X, Z);

        /// <summary>Runs the policy as the streamer does (preparing finishes at once) until nothing changes.</summary>
        private static (HashSet<(int, int)> built, HashSet<(int, int)> prepared) Settle(float x, float z, HashSet<(int, int)> built = null, HashSet<(int, int)> prepared = null)
        {
            built ??= new HashSet<(int, int)>(); prepared ??= new HashSet<(int, int)>();
            for (var frame = 0; frame < 500; frame++)
            {
                var s = Policy.Next(x, z, built, prepared, new HashSet<(int, int)>());
                foreach (var c in s.Unload) built.Remove(c);
                foreach (var c in s.Forget) prepared.Remove(c);
                foreach (var c in s.Prepare) prepared.Add(c);
                if (s.Build is { } b) { built.Add(b); }
                if (s.Prepare.Count == 0 && s.Build == null && s.Unload.Count == 0 && s.Forget.Count == 0) break;
            }
            return (built, prepared);
        }

        [Test]
        public void TheNearestChunksArePreparedFirstAndAtMostTwoAtOnce()
        {
            var s = Policy.Next(X, Z, new List<(int, int)>(), new List<(int, int)>(), new List<(int, int)>());
            Assert.That(s.Prepare.Count, Is.EqualTo(2));
            Assert.That(s.Prepare[0], Is.EqualTo(Focus));
            Assert.That(s.Build, Is.Null, "nothing is ready to build yet");
            var busy = Policy.Next(X, Z, new List<(int, int)>(), new List<(int, int)>(), new List<(int, int)> { (1, 1), (2, 2) });
            Assert.That(busy.Prepare, Is.Empty, "two already preparing");
        }

        [Test]
        public void OneBuildAFrameNearestFirst()
        {
            var prepared = WorldGrid.Around(X, Z, 3).ToList();
            var s = Policy.Next(X, Z, new List<(int, int)>(), prepared, new List<(int, int)>());
            Assert.That(s.Build, Is.EqualTo(Focus));
        }

        [Test]
        public void SettlingBuildsTheFiveByFiveAndPreparesTheRingBeyond()
        {
            var (built, prepared) = Settle(X, Z);
            Assert.That(built.Count, Is.EqualTo(25));
            Assert.That(built.All(c => StreamingPolicy.Distance(c, Focus) <= 2), Is.True);
            Assert.That(prepared.Count, Is.EqualTo(49), "radius 3 is prepared, radius 2 of it built");
        }

        [Test]
        public void MovingOnDropsWhatIsBeyondThreeAndKeepsTheBandBetween()
        {
            var (built, prepared) = Settle(X, Z);
            var (b2, p2) = Settle(X + 3 * WorldGrid.Chunk, Z, built, prepared);
            var newFocus = WorldGrid.ChunkAt(X + 3 * WorldGrid.Chunk, Z);
            Assert.That(b2.All(c => StreamingPolicy.Distance(c, newFocus) <= 3), Is.True, "no terrain beyond three stays");
            Assert.That(b2.Count, Is.LessThanOrEqualTo(Policy.MaxBuilt));
            Assert.That(p2.All(c => StreamingPolicy.Distance(c, newFocus) <= 4), Is.True, "no computed ground beyond four is kept");
            Assert.That(b2.Any(c => StreamingPolicy.Distance(c, newFocus) > 2), Is.True, "the band between is kept, not churned");
            Assert.That(WorldGrid.Around(X + 3 * WorldGrid.Chunk, Z, 2).All(b2.Contains), Is.True, "everything near the new focus is built");
        }
    }
}
