namespace SecondFace.Core
{
    /// <summary>
    /// Seeded PRNG (mulberry32), the same algorithm and sequence as the web game's <c>core/rng.ts</c>, so every
    /// content seed gives the same results here. State is one uint32 so it serialises into saves.
    /// </summary>
    public sealed class Rng
    {
        public uint State;

        public Rng(uint state) { State = state; }

        public Rng() : this((uint)new System.Random().Next() ^ (uint)System.Environment.TickCount) { }

        /// <summary>Next value in [0, 1).</summary>
        public double Next()
        {
            uint t = State = unchecked(State + 0x6d2b79f5u);
            t = unchecked((t ^ (t >> 15)) * (t | 1u));
            t ^= unchecked(t + ((t ^ (t >> 7)) * (t | 61u)));
            return (t ^ (t >> 14)) / 4294967296.0;
        }

        public double Range(double min, double max) => min + (max - min) * Next();

        public int Int(int min, int maxInclusive) => (int)System.Math.Floor(Range(min, maxInclusive + 1));

        public bool Chance(double p) => Next() < p;

        public T Pick<T>(System.Collections.Generic.IReadOnlyList<T> items) => items[(int)System.Math.Floor(Next() * items.Count)];
    }

    public static class Hash
    {
        /// <summary>Deterministic hash of a grid point to [0, 1) for procedural placement that must not consume RNG state.</summary>
        public static double Hash2(int x, int y, int seed = 0)
        {
            int h = unchecked(x * 374761393 + y * 668265263 + seed * 2147483647);
            h = unchecked((h ^ (int)((uint)h >> 13)) * 1274126177);
            h ^= (int)((uint)h >> 16);
            return (uint)h / 4294967296.0;
        }
    }
}
