using System;
using System.Collections.Generic;

namespace SecondFace.Core.World
{
    /// <summary>
    /// Which chunks to prepare, build and drop as the focus moves (BUILD_PLAN §6.A.4): chunks within
    /// <see cref="LoadRadius"/> are built (5 × 5 at 2), within <see cref="PrepareRadius"/> their ground is computed ahead
    /// on worker threads; a built terrain is dropped beyond <see cref="UnloadRadius"/> (the band between 2 and 3 keeps a
    /// chunk from flickering when the focus wanders across a border, and caps the terrains at 7 × 7), computed ground is
    /// forgotten beyond <see cref="ForgetRadius"/>. At most one build a frame, nearest first; the caller skips the build
    /// after a slow frame. Distances are in chunks, measured as the larger of the two axes.
    /// </summary>
    public sealed class StreamingPolicy
    {
        public int LoadRadius = 2, PrepareRadius = 3, UnloadRadius = 3, ForgetRadius = 4, MaxPreparing = 2;

        /// <summary>The most terrains the policy ever keeps (the pool size to create ahead).</summary>
        public int MaxBuilt => (2 * UnloadRadius + 1) * (2 * UnloadRadius + 1);

        public sealed class Step
        {
            public readonly List<(int cx, int cz)> Prepare = new();
            public (int cx, int cz)? Build;
            public readonly List<(int cx, int cz)> Unload = new();
            public readonly List<(int cx, int cz)> Forget = new();
        }

        public static int Distance((int cx, int cz) a, (int cx, int cz) b) => Math.Max(Math.Abs(a.cx - b.cx), Math.Abs(a.cz - b.cz));

        /// <param name="built">Chunks with a terrain in the scene.</param>
        /// <param name="prepared">Chunks whose ground is computed and waiting (or kept) for a build.</param>
        /// <param name="preparing">Chunks being computed now.</param>
        public Step Next(float fx, float fz, ICollection<(int cx, int cz)> built, ICollection<(int cx, int cz)> prepared, ICollection<(int cx, int cz)> preparing)
        {
            var step = new Step();
            var focus = WorldGrid.ChunkAt(fx, fz);
            foreach (var c in built) if (Distance(c, focus) > UnloadRadius) step.Unload.Add(c);
            foreach (var c in prepared) if (Distance(c, focus) > ForgetRadius) step.Forget.Add(c);
            var free = MaxPreparing - preparing.Count;
            foreach (var c in WorldGrid.Around(fx, fz, PrepareRadius))
            {
                var near = Distance(c, focus) <= LoadRadius;
                if (near && step.Build == null && !built.Contains(c) && prepared.Contains(c)) step.Build = c;
                if (free > 0 && !built.Contains(c) && !prepared.Contains(c) && !preparing.Contains(c)) { step.Prepare.Add(c); free--; }
            }
            return step;
        }
    }
}
