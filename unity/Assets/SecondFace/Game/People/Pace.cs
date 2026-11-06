using UnityEngine;

namespace SecondFace.Game.People
{
    /// <summary>
    /// The locomotion's pace for a body moving at a speed (docs/PEOPLE_MOTION.md W1, W2). A retargeted stride is as long as
    /// the legs that take it, so each captured clip moves this body at its own speed times this body's hips over the
    /// subject's. One clip plays at a time, the one whose cadence needs the least change, sped up or slowed to the pace
    /// ("LocoRate" on the locomotion state): two captured strides blended (a long-legged man's walk fell between the slow
    /// walk and the walk, his jog between the brisk walk and the jog) put the planted foot of neither on the ground and slid
    /// it at up to 4 m/s, 2026-11-06. Below the slowest walk's range the walk blends with the idle (setting off, stopping).
    /// Everything that moves a person sets the pace here (the walker, the townsfolk, the gate).
    /// </summary>
    public static class Pace
    {
        private static readonly int SpeedId = Animator.StringToHash("Speed"), SneakRateId = Animator.StringToHash("SneakRate"),
            RateId = Animator.StringToHash("LocoRate");
        /// <summary>The captured sneak's own speed (Motion/sneak.json), m/s, and its subject's hip height, m.</summary>
        public const float SneakSpeed = 0.841f, SneakHip = 0.9411f;
        /// <summary>The moving clips the locomotion holds, slowest first (Motion/&lt;clip&gt;.json: their speed, m/s, and
        /// their subject's hip height, m; LocomotionBuild puts them at these speeds; the gate checks the two agree).</summary>
        public static readonly (string Name, float Speed, float Hip)[] Clips =
        {
            ("walk_slow", 0.923f, 0.9317f), ("walk", 1.368f, 0.9317f), ("walk_brisk", 1.95f, 0.9317f), ("jog", 3.159f, 1.0002f), ("run", 3.611f, 0.9924f),
        };
        /// <summary>The cadence a clip may be played at before the next (faster) clip takes over, as a share of its own.</summary>
        public const float RateMin = 0.8f, RateMax = 1.25f;

        /// <summary>This body's hip height, m (the foot plant measures it; the captured walkers' when it cannot).</summary>
        public static float Hip(Animator a) => a != null && a.TryGetComponent<FootPlant>(out var fp) ? FootPlant.SourceHip / Mathf.Max(0.01f, fp.PaceScale) : FootPlant.SourceHip;

        /// <summary>The "Speed" and "LocoRate" for a body with hips <paramref name="hip"/> m high moving at
        /// <paramref name="speed"/> m/s.</summary>
        public static (float Speed, float Rate) For(float speed, float hip)
        {
            hip = Mathf.Max(0.3f, hip);
            float Rate(int i) => speed * Clips[i].Hip / (hip * Clips[i].Speed);
            // the slowest gait that reaches the pace without hurrying past RateMax (people do not break into a run while a
            // jog will do: the run's arms swung past their cap at a jogging pace, W3, 2026-11-06)
            var best = Clips.Length - 1;
            for (var i = 0; i < Clips.Length; i++) if (Rate(i) <= RateMax) { best = i; break; }
            var rate = Rate(best);
            // slower than the slowest walk is played at its own cadence: blended with the idle
            if (best == 0 && rate < RateMin) return (speed * Clips[0].Hip / hip, 1f);
            // between two gaits' ranges: the nearer cadence
            if (best > 0 && rate < RateMin && Mathf.Abs(Mathf.Log(Rate(best - 1))) < Mathf.Abs(Mathf.Log(rate))) { best--; rate = Rate(best); }
            return (Clips[best].Speed, Mathf.Clamp(rate, 0.5f, 1.6f));
        }

        /// <summary>Sets "Speed" and "LocoRate" (and "SneakRate" when sneaking) for a body moving at <paramref name="speed"/> m/s.</summary>
        public static void Set(Animator a, float speed, bool sneaking = false, float damp = 0.12f, float dt = -1f)
        {
            if (a == null) return;
            if (dt < 0f) dt = Time.deltaTime;
            var hip = Hip(a);
            var (s, rate) = For(speed, hip);
            if (damp > 0f) { a.SetFloat(SpeedId, s, damp, dt); a.SetFloat(RateId, rate, damp, dt); }
            else { a.SetFloat(SpeedId, s); a.SetFloat(RateId, rate); }
            if (sneaking) a.SetFloat(SneakRateId, Mathf.Clamp(speed * SneakHip / (hip * SneakSpeed), 0f, 1.6f), 0.1f, dt);
        }
    }
}
