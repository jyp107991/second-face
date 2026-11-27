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
            RateId = Animator.StringToHash("LocoRate"), SexId = Animator.StringToHash("Sex"), GaitId = Animator.StringToHash("Gait");
        /// <summary>The captured sneak's own speed (Motion/sneak.json), m/s, and its subject's hip height, m.</summary>
        public const float SneakSpeed = 0.780f, SneakHip = 0.9411f;
        /// <summary>The men's moving clips, by gait set, each slowest first (Motion/&lt;clip&gt;.json: their speed, m/s, and their
        /// subject's hip height, m; LocomotionBuild puts them at these speeds in the men's trees; the gate checks the two agree).
        /// Each man walks one set, by a hash of who he is (<see cref="SetSex"/>), so a crowd does not move in step; a set mixes
        /// subjects but plays one clip at a time. Motion set v6 (2026-11-17, docs/MOTION_ROOT_CAUSE.md §7): every gait's stance
        /// feet planted in the converter (the sole's contact point held still from touchdown to toe-off by leg IK) and its speed
        /// the one at which that point stands still; walks closed loops (v4's convention: v5's open walks lifted a stance foot
        /// 2.7-3.1 cm on two men in the game, W6), jogs and runs open (v5's); men's walks from CMU 07, 08, 104 and ACCAD
        /// Male1/Male2, jogs CMU 35_17 (`jog`) and 16_35 (`jog_b`); out: `walk_brisk` (138 steps/min at 1.97 m/s, past real
        /// walkers' 135), `walk_c` (its walk ratio past real people's), `jog_c` and `run_b` (CMU 104's runs: the capture's
        /// solver turns the feet over 60-160° between frames).</summary>
        public static readonly (string Name, float Speed, float Hip)[][] MenSets =
        {
            new[] { ("walk_slow", 0.959f, 0.9317f), ("walk", 1.356f, 0.9317f), ("jog", 3.119f, 1.0002f), ("run", 3.261f, 0.9924f) },
            new[] { ("walk_slow_b", 0.880f, 0.9337f), ("walk_d", 1.310f, 0.9859f), ("walk_brisk_b", 1.663f, 0.9082f), ("jog_b", 2.729f, 0.9684f), ("run_c", 3.726f, 0.9082f) },
            // (walk_b alone after the slow walk left the townsfolk's 1.25 m/s between the two, played at 0.78: P1)
            new[] { ("walk_slow", 0.959f, 0.9317f), ("walk", 1.356f, 0.9317f), ("walk_b", 1.567f, 0.8998f), ("jog", 3.119f, 1.0002f), ("run", 3.261f, 0.9924f) },
        };
        /// <summary>The women's (one set: the free captures hold one woman's normal walk and one usable jog): ACCAD Female1's
        /// walk (B13, 1.15 m/s, set v4's cut; the player's 1.4 m/s plays it at about 1.2, a brisk 120 steps a minute, the
        /// townsfolk's 1.25 at about 1.09: game speed never depends on sex) and CMU 141_02's jog (`jog_f`, a woman's capture, an
        /// open loop), with `jog` (CMU 35_17, set v6's plant of the take set v1's retired `jog_v1` cut) after it only for a woman
        /// whose legs would play `jog_f` past <see cref="RateMax"/> (P1). Her slower walks (`walk_f`, `walk_f_c`, `walk_f_long`, 0.96-1.08 m/s) would be picked at the townsfolk's pace
        /// past a natural cadence; `walk_f_n` fails the clip QA's slide check; `jog_f_b` (CMU 141_03) creeps through its stance
        /// in the clip itself, so its stride is 0.70 of its speed and it would play at 1.59 (P1).</summary>
        public static readonly (string Name, float Speed, float Hip)[][] WomenSets =
        {
            new[] { ("walk_f_b", 1.110f, 0.8747f), ("jog_f", 2.063f, 0.8433f), ("jog", 3.119f, 1.0002f) },
        };
        /// <summary>Every moving clip any set holds (the gate checks each against its sidecar).</summary>
        public static readonly (string Name, float Speed, float Hip)[] Clips =
            System.Linq.Enumerable.ToArray(System.Linq.Enumerable.Distinct(System.Linq.Enumerable.SelectMany(System.Linq.Enumerable.Concat(MenSets, WomenSets), x => x)));

        /// <summary>A woman's body (the controller's "Sex" set to 1 by <see cref="SetSex"/>).</summary>
        public static bool Female(Animator a) => a != null && Has(a, SexId) && a.GetFloat(SexId) > 0.5f;
        /// <summary>Gives a body its sex's clips (the locomotion's "Sex": 0 the men's trees, 1 the women's) and its own gait set
        /// among them ("Gait", by a hash of <paramref name="key"/>, the person's id; their object's name when none).</summary>
        public static void SetSex(Animator a, bool male, string key = null)
        {
            if (a == null) return;
            if (Has(a, SexId)) a.SetFloat(SexId, male ? 0f : 1f);
            if (Has(a, GaitId)) a.SetFloat(GaitId, Hash(key ?? a.gameObject.name) % (uint)(male ? MenSets : WomenSets).Length);
        }
        /// <summary>The moving clips this body's locomotion plays (its sex's, its gait set).</summary>
        public static (string Name, float Speed, float Hip)[] ClipsOf(Animator a)
        {
            var sets = Female(a) ? WomenSets : MenSets;
            var i = a != null && Has(a, GaitId) ? Mathf.Clamp(Mathf.RoundToInt(a.GetFloat(GaitId)), 0, sets.Length - 1) : 0;
            return sets[i];
        }
        private static readonly System.Collections.Generic.Dictionary<(RuntimeAnimatorController, int), bool> HasParam = new();
        private static bool Has(Animator a, int id)
        {
            var c = a.runtimeAnimatorController;
            if (c == null) return false;
            if (HasParam.TryGetValue((c, id), out var has)) return has;
            has = false;
            foreach (var p in a.parameters) if (p.nameHash == id) has = true;
            HasParam[(c, id)] = has;
            return has;
        }
        private static uint Hash(string s)
        {
            unchecked
            {
                var h = 2166136261u;
                foreach (var c in s) h = (h ^ c) * 16777619u;
                return h;
            }
        }

        /// <summary>The cadence a clip may be played at before the next (faster) clip takes over, as a share of its own.</summary>
        public const float RateMin = 0.8f, RateMax = 1.25f;

        /// <summary>This body's hip height, m (the foot plant measures it; the captured walkers' when it cannot).</summary>
        public static float Hip(Animator a) => a != null && a.TryGetComponent<FootPlant>(out var fp) ? FootPlant.SourceHip / Mathf.Max(0.01f, fp.PaceScale) : FootPlant.SourceHip;

        /// <summary>The "Speed" and "LocoRate" for a body with hips <paramref name="hip"/> m high moving at
        /// <paramref name="speed"/> m/s.</summary>
        public static (float Speed, float Rate) For(float speed, float hip) => For(speed, hip, MenSets[0], false);

        /// <summary>The stride each clip takes on a body, as a share of what its speed scaled by the body's hip height over its
        /// actor's gives: measured on the sole's contact points at their lowest (in contact in the capture), the clip played
        /// in place at its own cadence on bodies as the game makes them (PaceCalibrationTests: the same to three decimals on
        /// every body of a sex). Measured on motion set v6.1's planted gaits, each retargeted from its own file's T-pose
        /// (2026-11-17, Business_Female_01, Female_Adult_07, Construction_Male_02, Male_Adult_11: test-results/pace_calibration.txt;
        /// the clips' own factor is 1.000, so what is left is the retarget to the body; retargeted from configurations of the
        /// takes' first keys instead, as Unity fills them, they read up to 0.07 apart). Before it, the men's clips were played 4-13 % faster than their strides covered the ground and the
        /// women's jog 9 %: the planted foot ran back under a held foot, at a woman's jog's touchdown 0.3-0.45 m/s before the
        /// hold took it (W1 0 → 13 over the cast, docs/MOTION_ROOT_CAUSE.md §7). Measured again on 2026-11-18 (Business_Female_01,
        /// Construction_Male_02) with the T-poses stood on their ground (docs/MOTION_ROOT_CAUSE.md §9: each clip's as its actor
        /// stands in the take, the bodies' on their root, their humanScale 2.6 % smaller): 2-4 % shorter. 1 where unmeasured.</summary>
        public static readonly System.Collections.Generic.Dictionary<string, float> StrideMen = new()
        {
            ["walk_slow"] = 1.097f, ["walk_slow_b"] = 1.114f, ["walk_d"] = 1.008f, ["walk"] = 1.100f, ["walk_b"] = 1.102f, ["walk_brisk_b"] = 1.017f,
            ["jog"] = 1.085f, ["jog_b"] = 1.092f, ["run"] = 1.129f, ["run_c"] = 0.983f
        };
        public static readonly System.Collections.Generic.Dictionary<string, float> StrideWomen = new()
        {
            ["walk_f_b"] = 0.989f, ["jog_f"] = 1.068f, ["jog"] = 1.044f
        };
        public static float Stride(string clip, bool female) => (female ? StrideWomen : StrideMen).TryGetValue(clip, out var k) ? k : 1f;

        /// <summary>The same, over a set of clips (<see cref="ClipsOf"/>).</summary>
        public static (float Speed, float Rate) For(float speed, float hip, (string Name, float Speed, float Hip)[] Clips, bool female)
        {
            hip = Mathf.Max(0.3f, hip);
            float Rate(int i) => speed * Clips[i].Hip / (hip * Clips[i].Speed * Stride(Clips[i].Name, female));
            // the slowest gait that reaches the pace without hurrying past RateMax (people do not break into a run while a
            // jog will do: the run's arms swung past their cap at a jogging pace, W3, 2026-11-06)
            var best = Clips.Length - 1;
            for (var i = 0; i < Clips.Length; i++) if (Rate(i) <= RateMax) { best = i; break; }
            var rate = Rate(best);
            // slower than the slowest walk is played at its own cadence: blended with the idle
            if (best == 0 && rate < RateMin) return (speed * Clips[0].Hip / (hip * Stride(Clips[0].Name, female)), 1f);
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
            var (s, rate) = For(speed, hip, ClipsOf(a), Female(a));
            if (damp > 0f) { a.SetFloat(SpeedId, s, damp, dt); a.SetFloat(RateId, rate, damp, dt); }
            else { a.SetFloat(SpeedId, s); a.SetFloat(RateId, rate); }
            if (sneaking) a.SetFloat(SneakRateId, Mathf.Clamp(speed * SneakHip / (hip * SneakSpeed), 0f, 1.6f), 0.1f, dt);
        }
    }
}
