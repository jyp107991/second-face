using UnityEngine;

namespace SecondFace.Game.People
{
    /// <summary>
    /// The locomotion's pace for a body moving at a speed (docs/PEOPLE_MOTION.md W1, W2): the shared controller's
    /// "Speed" is in the captured subjects' metres (their clips blend at their own speeds), and a retargeted stride is as
    /// long as the legs that take it, so the speed is scaled by the body's <see cref="FootPlant.PaceScale"/>: a shorter
    /// body steps a faster gait at the same speed, and its planted foot holds. Everything that moves a person sets the
    /// pace here (the walker, the gate).
    /// </summary>
    public static class Pace
    {
        private static readonly int SpeedId = Animator.StringToHash("Speed"), SneakRateId = Animator.StringToHash("SneakRate");
        /// <summary>The captured sneak's own speed (Motion/sneak.json), m/s.</summary>
        public const float SneakSpeed = 0.841f;

        public static float Scale(Animator a) => a != null && a.TryGetComponent<FootPlant>(out var fp) ? fp.PaceScale : 1f;

        /// <summary>Sets "Speed" (and "SneakRate" when sneaking) for a body moving at <paramref name="speed"/> m/s.</summary>
        public static void Set(Animator a, float speed, bool sneaking = false, float damp = 0.12f, float dt = -1f)
        {
            if (a == null) return;
            if (dt < 0f) dt = Time.deltaTime;
            var s = speed * Scale(a);
            if (damp > 0f) a.SetFloat(SpeedId, s, damp, dt); else a.SetFloat(SpeedId, s);
            if (sneaking) a.SetFloat(SneakRateId, Mathf.Clamp(s / SneakSpeed, 0f, 1.6f), 0.1f, dt);
        }
    }
}
