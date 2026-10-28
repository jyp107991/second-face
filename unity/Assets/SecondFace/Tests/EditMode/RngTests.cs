using NUnit.Framework;
using SecondFace.Core;

namespace SecondFace.Tests
{
    public class RngTests
    {
        [Test]
        public void MatchesTheWebGameSequence()
        {
            // mulberry32 seeded 1234: the first values the TypeScript Rng produces (core/rng.ts).
            var r = new Rng(1234);
            Assert.That(r.Next(), Is.EqualTo(0.07329497812315822).Within(1e-12));
            Assert.That(r.Next(), Is.EqualTo(0.7034119898453355).Within(1e-12));
            Assert.That(r.Next(), Is.EqualTo(0.9028560190927237).Within(1e-12));
        }

        [Test]
        public void RangesAndPicksStayInBounds()
        {
            var r = new Rng(7);
            for (int i = 0; i < 1000; i++)
            {
                var v = r.Int(2, 5);
                Assert.That(v, Is.InRange(2, 5));
                Assert.That(r.Range(-1, 1), Is.InRange(-1.0, 1.0));
            }
            Assert.That(new[] { "a", "b", "c" }, Does.Contain(r.Pick(new[] { "a", "b", "c" })));
        }

        [Test]
        public void Hash2IsStableAndInUnitRange()
        {
            var a = Hash.Hash2(3, 4, 9);
            Assert.That(Hash.Hash2(3, 4, 9), Is.EqualTo(a));
            Assert.That(a, Is.InRange(0.0, 1.0));
            Assert.That(Hash.Hash2(3, 5, 9), Is.Not.EqualTo(a));
        }
    }
}
