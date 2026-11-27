using System.Collections.Generic;
using UnityEngine;

namespace SecondFace.Game.People
{
    /// <summary>
    /// When each locomotion clip's actor had each foot on the ground (its sidecar's <c>plant.stances</c>, the captured take's
    /// own contacts: touchdown to toe-off), as spans of the clip's normalized time [start, end, start, end ...] (an end before
    /// its start wraps the loop's seam), the form of the fight's <c>CombatSet.ClipFacts.DownL/DownR</c>. Built with the
    /// people's controller (LocomotionBuild.Steps) from the clips the base layer plays; <see cref="FootPlant"/> holds a foot
    /// down by it (docs/MOTION_ROOT_CAUSE.md §17). Loaded from Resources, so every body that walks reads the same record.
    /// </summary>
    public sealed class StepRecord : ScriptableObject
    {
        [System.Serializable]
        public sealed class Clip
        {
            /// <summary>The clip's file (Motion/&lt;Name&gt;.fbx).</summary>
            public string Name;
            public AnimationClip Motion;
            public float Length;
            public float[] DownL = new float[0], DownR = new float[0];
        }

        public Clip[] Clips = new Clip[0];
        /// <summary>What it was built from (LocomotionBuild.StepStamp: the build's version, each clip's sidecar and import
        /// settings): a test fails when a clip or its record changed and the record was not built again.</summary>
        public string Stamp = "";

        private Dictionary<AnimationClip, Clip> _by;

        /// <summary>Whether <paramref name="motion"/> carries a record; if so whether each foot was down at normalized time
        /// <paramref name="t"/> (0-1).</summary>
        public bool Down(AnimationClip motion, float t, out bool left, out bool right)
        {
            left = right = false;
            if (motion == null) return false;
            if (_by == null) { _by = new Dictionary<AnimationClip, Clip>(); foreach (var c in Clips) if (c != null && c.Motion != null) _by[c.Motion] = c; }
            if (!_by.TryGetValue(motion, out var r)) return false;
            left = In(r.DownL, t); right = In(r.DownR, t);
            return true;
        }

        public static bool In(float[] spans, float t)
        {
            if (spans == null) return false;
            for (var i = 0; i + 1 < spans.Length; i += 2)
            {
                float a = spans[i], b = spans[i + 1];
                if (a <= b ? t >= a && t < b : t >= a || t < b) return true;
            }
            return false;
        }

        private static StepRecord _loaded; private static bool _tried;
        /// <summary>The game's record (Resources/StepRecord), or null where none was built.</summary>
        public static StepRecord Loaded { get { if (!_tried) { _tried = true; _loaded = Resources.Load<StepRecord>("StepRecord"); } return _loaded; } }
    }
}
