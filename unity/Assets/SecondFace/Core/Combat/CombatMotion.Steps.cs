using System;
using System.Collections.Generic;

namespace SecondFace.Core.Combat
{
    /// <summary>Which hands a re-stance step may carry: most steps keep the arms quiet; a step out of a fighting guard lowers
    /// them, one into a guard raises them (combat set v4.4: admitted only when the transition leaves or enters a guard).</summary>
    public enum StepArms { Quiet, Lower, Raise }

    /// <summary>A captured re-stance step (combat sets v4.3 and v4.4, gate <c>step</c>): each foot's offset (x right, z forward, m
    /// at the reference body's 0.935 m hip height) and turn (degrees, + clockwise from above) from its first key to its last.</summary>
    public sealed class StepClip
    {
        public readonly string Name, Set;
        public readonly double Seconds;
        public readonly StepArms Arms;
        public readonly (double X, double Z, double Turn) Left, Right;
        public StepClip(string name, string set, double seconds, StepArms arms, (double, double, double) left, (double, double, double) right)
        { Name = name; Set = set; Seconds = seconds; Arms = arms; Left = left; Right = right; }
    }

    /// <summary>Where a body's feet stand: each ankle (x right, z forward, m) and its yaw (degrees, + clockwise from above) in
    /// the body's root frame, and the hips' height over the floor (m).</summary>
    public readonly struct Stance
    {
        public readonly (double X, double Z, double Yaw) Left, Right;
        public readonly double Hips;
        public Stance((double, double, double) left, (double, double, double) right, double hips = 0.935) { Left = left; Right = right; Hips = hips; }
    }

    /// <summary>What <see cref="CombatMotion.ChooseStep"/> decided: the step clips to play in order (none: the transition plays
    /// as before, the crossfade with Fighter.Feet stepping the feet), the plan's cost (the worse foot's residual against G13:
    /// 1 is the limit) and why.</summary>
    public sealed class StepPlan
    {
        public enum Why { Within, Crouched, Step, NoStep }
        public readonly string[] Steps;
        public readonly double Cost;
        public readonly Why Reason;
        public StepPlan(string[] steps, double cost, Why reason) { Steps = steps; Cost = cost; Reason = reason; }
        public bool None => Steps.Length == 0;
        public override string ToString() => None ? $"none ({Reason}, cost {Cost:0.00})" : $"{string.Join(" + ", Steps)} (cost {Cost:0.00})";
    }

    public static partial class CombatMotion
    {
        /// <summary>G13: two stances are one when both ankles stand within 1.5 cm and both feet within 5° at the reference body.</summary>
        public const double StanceCm = 1.5, StanceDeg = 5.0;
        /// <summary>The reference body's hip height (m): the steps' offsets and G13 are judged there.</summary>
        public const double StepHip = 0.935;
        /// <summary>No standing step bridges a crouch: a stance whose hips stand under this at the reference body (m).</summary>
        public const double StandingHips = 0.70;
        /// <summary>How far the runtime warps a step's stepping foot onto its landing: its captured offset scaled within ±20 % and
        /// turned within ±15° about its start, its own turn within ±15° (as leading games warp a captured step).</summary>
        public const double WarpScale = 0.20, WarpTurn = 15.0;
        /// <summary>A foot the step moves less than this (cm) is left where it stands.</summary>
        public const double StillCm = 3.0;

        /// <summary>The library of captured re-stance steps (staging combat/v4_4 steps_library.json: v4.3's 54 and v4.4's 16;
        /// CombatMotionTests holds this table to that file).</summary>
        public static StepClip[] Steps => StepTable.All;

        // (in a class of its own: a partial class's static fields across files are initialised in no set order, and the states,
        // built in the other file, read the steps)
        private static class StepTable
        {
            public static readonly StepClip[] All =
            {
                new("step_back_f_7604", "f", 0.833, StepArms.Quiet, (-0.0047, 0.0001, 2.5), (-0.0323, -0.2254, 15.2)),
                new("step_back_f_76042", "f", 1.133, StepArms.Quiet, (-0.0737, -0.1388, 9.5), (-0.0088, 0.0063, 5.7)),
                new("step_back_f_76042_mir", "f", 1.133, StepArms.Quiet, (0.0079, 0.0053, -5.0), (0.0738, -0.1356, -10.1)),
                new("step_back_f_7604_mir", "f", 0.833, StepArms.Quiet, (0.0331, -0.2293, -15.3), (0.0044, 0.0003, -2.3)),
                new("step_back_m_14320", "m", 0.767, StepArms.Quiet, (-0.0688, -0.1035, -9.0), (-0.0026, -0.0002, 1.3)),
                new("step_back_m_14320_mir", "m", 0.767, StepArms.Quiet, (0.0024, -0.0, -1.2), (0.0687, -0.1021, 9.3)),
                new("step_back_m_m2e2turnar", "m", 0.733, StepArms.Quiet, (0.1043, -0.1772, -43.8), (-0.0019, -0.0033, 1.0)),
                new("step_back_u_3301", "both", 1.1, StepArms.Quiet, (-0.0028, -0.0038, 2.1), (0.1028, -0.2732, -0.0)),
                new("step_back_u_3301_mir", "both", 1.1, StepArms.Quiet, (-0.1038, -0.2762, 0.1), (0.0032, -0.0036, -2.3)),
                new("step_back_u_3401", "both", 1.4, StepArms.Quiet, (-0.0056, -0.0016, 2.6), (0.0481, -0.104, 6.1)),
                new("step_back_u_3401_mir", "both", 1.4, StepArms.Quiet, (-0.0402, -0.1027, -6.0), (0.0048, -0.0019, -2.4)),
                new("step_fwd_m_m2e2turnar", "m", 0.7, StepArms.Quiet, (0.0116, 0.0044, -5.4), (-0.1608, 0.1716, -30.5)),
                new("step_fwd_m_m2e2turnar2", "m", 0.7, StepArms.Quiet, (0.009, -0.0011, -3.2), (-0.2034, 0.1585, -40.2)),
                new("step_fwd_m_m2e2turnar2_mir", "m", 0.7, StepArms.Quiet, (0.2027, 0.1563, 40.2), (-0.0089, -0.0015, 3.1)),
                new("step_fwd_m_m2e2turnar_mir", "m", 0.7, StepArms.Quiet, (0.1599, 0.1691, 30.6), (-0.0113, 0.004, 5.3)),
                new("step_fwd_u_7703", "both", 0.733, StepArms.Quiet, (0.0157, 0.0955, 1.8), (0.0015, -0.0002, -0.8)),
                new("step_fwd_u_7703_mir", "both", 0.733, StepArms.Quiet, (-0.0017, -0.0002, 0.8), (-0.0158, 0.0953, -1.8)),
                new("step_fwd_u_7717", "both", 0.833, StepArms.Quiet, (-0.0002, -0.0035, 0.9), (-0.0338, 0.1531, -14.0)),
                new("step_fwd_u_7717_mir", "both", 0.833, StepArms.Quiet, (0.0365, 0.1518, 14.8), (0.0008, -0.0031, -1.1)),
                new("step_left_f_11411", "f", 0.767, StepArms.Quiet, (-0.0726, 0.0605, -40.3), (-0.0154, -0.0069, 8.0)),
                new("step_left_f_11411_mir", "f", 0.767, StepArms.Quiet, (0.0154, -0.0071, -7.7), (0.0735, 0.056, 40.3)),
                new("step_left_m_m2e2jabrig", "m", 1.033, StepArms.Quiet, (-0.1151, -0.1087, 7.8), (-0.1469, -0.0675, 20.8)),
                new("step_left_m_m2e2jabrig_mir", "m", 1.033, StepArms.Quiet, (0.1469, -0.0673, -20.7), (0.1152, -0.1096, -8.0)),
                new("step_left_u_7709", "both", 0.933, StepArms.Quiet, (-0.0178, -0.011, 9.9), (-0.1902, 0.0165, -1.4)),
                new("step_narrow_m_14320", "m", 0.633, StepArms.Quiet, (-0.0017, -0.001, 1.0), (-0.068, 0.0085, -16.8)),
                new("step_narrow_m_14320_mir", "m", 0.633, StepArms.Quiet, (0.0693, 0.0104, 16.0), (0.0014, -0.0012, -0.8)),
                new("step_narrow_u_7718", "both", 0.833, StepArms.Quiet, (-0.006, -0.0099, 5.0), (-0.0755, -0.0867, 29.6)),
                new("step_narrow_u_7718_mir", "both", 0.833, StepArms.Quiet, (0.0741, -0.087, -29.8), (0.0055, -0.0083, -4.6)),
                new("step_narrow_u_crouchedid", "both", 0.833, StepArms.Quiet, (-0.0081, -0.0033, 2.4), (-0.1377, 0.048, 6.2)),
                new("step_narrow_u_crouchedid_mir", "both", 0.833, StepArms.Quiet, (0.1377, 0.048, -6.2), (0.0081, -0.0033, -2.4)),
                new("step_right_m_14320", "m", 0.833, StepArms.Quiet, (0.2106, 0.1364, 14.5), (0.0116, -0.0058, -6.5)),
                new("step_right_m_14320_mir", "m", 0.833, StepArms.Quiet, (-0.0104, -0.0051, 6.0), (-0.2104, 0.1389, -14.8)),
                new("step_turnL45_f_11411", "f", 1.3, StepArms.Quiet, (0.0083, -0.0003, -3.6), (0.0208, 0.3304, -111.0)),
                new("step_turnL45_f_11411_mir", "f", 1.3, StepArms.Quiet, (-0.0264, 0.3247, 111.0), (-0.0081, -0.0004, 3.6)),
                new("step_turnL45_m_m2e2turnar", "m", 0.633, StepArms.Quiet, (0.0138, 0.0013, -5.7), (-0.1374, 0.1245, -41.9)),
                new("step_turnL45_m_m2e2turnar2", "m", 0.7, StepArms.Quiet, (0.0804, -0.1131, -46.8), (0.0096, -0.0018, -4.2)),
                new("step_turnL45_m_m2e2turnar2_mir", "m", 0.7, StepArms.Quiet, (-0.0098, -0.0017, 4.2), (-0.0808, -0.1142, 46.9)),
                new("step_turnL45_m_m2e2turnar_mir", "m", 0.633, StepArms.Quiet, (0.1368, 0.1226, 42.0), (-0.0138, 0.001, 5.7)),
                new("step_turnL90_m_m2e2turnar", "m", 1.133, StepArms.Quiet, (0.1151, 0.0377, -64.9), (-0.262, 0.3119, -63.2)),
                new("step_turnL90_m_m2e2turnar2", "m", 1.333, StepArms.Quiet, (0.2297, 0.0538, -82.9), (-0.2912, 0.2792, -77.2)),
                new("step_turnL90_m_m2e2turnar2_mir", "m", 1.333, StepArms.Quiet, (0.2902, 0.2763, 77.2), (-0.2324, 0.0516, 82.9)),
                new("step_turnL90_m_m2e2turnar_mir", "m", 1.133, StepArms.Quiet, (0.2609, 0.3096, 63.4), (-0.116, 0.0363, 64.9)),
                new("step_turnR45_f_11133", "f", 0.967, StepArms.Quiet, (0.0153, -0.0043, -7.4), (0.0601, -0.3955, 61.5)),
                new("step_turnR45_f_11133_mir", "f", 0.967, StepArms.Quiet, (-0.057, -0.393, -61.2), (-0.0139, -0.0039, 6.3)),
                new("step_turnR45_f_11313", "f", 0.9, StepArms.Quiet, (0.0034, 0.0003, -1.7), (0.1699, 0.0612, 58.3)),
                new("step_turnR45_f_11313_mir", "f", 0.9, StepArms.Quiet, (-0.1767, 0.0629, -55.0), (-0.0049, 0.0004, 2.3)),
                new("step_turnR45_m_m2e1turnar", "m", 0.567, StepArms.Quiet, (-0.0299, 0.0722, 52.2), (0.0108, -0.0089, -5.9)),
                new("step_turnR45_m_m2e1turnar2", "m", 0.533, StepArms.Quiet, (-0.0608, 0.0118, 53.7), (0.0132, -0.0105, -7.2)),
                new("step_turnR45_m_m2e1turnar2_mir", "m", 0.533, StepArms.Quiet, (-0.0131, -0.0102, 7.1), (0.0608, 0.0116, -53.9)),
                new("step_turnR45_m_m2e1turnar_mir", "m", 0.567, StepArms.Quiet, (-0.0107, -0.0086, 5.7), (0.0299, 0.0725, -52.4)),
                new("step_widen_f_14426", "f", 1.633, StepArms.Quiet, (0.0224, 0.0102, -10.7), (-0.0563, 0.136, -19.9)),
                new("step_widen_f_14426_mir", "f", 1.633, StepArms.Quiet, (0.0562, 0.1343, 19.9), (-0.0236, 0.0108, 10.9)),
                new("step_widen_m_m2e6quickr", "m", 1.0, StepArms.Quiet, (-0.0078, -0.0357, -9.6), (0.0137, -0.0034, -6.1)),
                new("step_widen_m_m2e6quickr_mir", "m", 1.0, StepArms.Quiet, (-0.0137, -0.0033, 6.1), (0.008, -0.0356, 9.7)),
                new("step_guardin_f_14413", "f", 1.133, StepArms.Raise, (0.0071, -0.0353, -36.5), (0.0016, 0.3617, -20.7)),
                new("step_guardin_f_14413_mir", "f", 1.133, StepArms.Raise, (-0.0032, 0.3559, 21.1), (-0.0095, -0.043, 37.0)),
                new("step_guardin_f_14427", "f", 0.833, StepArms.Raise, (0.0317, 0.0173, -15.9), (0.2086, 0.4589, -18.6)),
                new("step_guardin_f_14427_mir", "f", 0.833, StepArms.Raise, (-0.2081, 0.4561, 18.5), (-0.0338, 0.0183, 16.3)),
                new("step_guardout_f_14413", "f", 1.633, StepArms.Lower, (0.07, 0.2041, 8.6), (0.0875, -0.3854, 23.5)),
                new("step_guardout_f_14413_mir", "f", 1.633, StepArms.Lower, (-0.0874, -0.3857, -23.4), (-0.0729, 0.199, -9.4)),
                new("step_guardout_f_14421", "f", 1.1, StepArms.Lower, (-0.0054, -0.0016, 2.4), (-0.153, 0.4062, -24.8)),
                new("step_guardout_f_14421_mir", "f", 1.1, StepArms.Lower, (0.1541, 0.4042, 24.2), (0.0064, -0.0016, -2.8)),
                new("step_pivot_f_11107", "f", 0.633, StepArms.Quiet, (-0.013, 0.0021, 5.4), (0.0489, -0.0334, -26.4)),
                new("step_pivot_f_11107_mir", "f", 0.633, StepArms.Quiet, (-0.0432, -0.0314, 25.3), (0.0129, -0.0014, -5.7)),
                new("step_pivot_u_1323", "both", 0.867, StepArms.Quiet, (-0.0018, 0.0005, 0.9), (0.056, 0.0291, 22.0)),
                new("step_pivot_u_1323_mir", "both", 0.867, StepArms.Quiet, (-0.0524, 0.0179, -23.3), (-0.0019, 0.0003, 1.0)),
                new("step_pivot_u_swatfw", "both", 0.767, StepArms.Quiet, (-0.0002, 0.0008, -0.1), (-0.0376, -0.0737, 26.5)),
                new("step_pivot_u_swatfw_mir", "both", 0.767, StepArms.Quiet, (0.0376, -0.0737, -26.5), (0.0002, 0.0008, 0.1)),
                new("step_right_f_11128b", "f", 0.9, StepArms.Quiet, (0.006, 0.002, -2.8), (0.2103, -0.09, 13.5)),
                new("step_right_f_11128b_mir", "f", 0.9, StepArms.Quiet, (-0.2042, -0.0906, -14.3), (-0.0053, 0.0015, 2.3)),
            };
        }

        /// <summary>The steps' state family: each step a one-shot state of its own (gate "step"), played in place on the root.</summary>
        public static string StepState(string clip) => "step:" + clip;

        /// <summary>The captured step (or chain of two) that carries the feet from one stance to the next (staging combat/v4_3
        /// README §2, with v4.4's admission by the hands; the reference is tools/unity/motion/stance_continuity.py
        /// fit_step_feet). <paramref name="hipScale"/>: the body's hip height over the reference body's. <paramref name="leavesGuard"/>,
        /// <paramref name="entersGuard"/>: whether the transition leaves or enters a fighting guard (a lowering step is admitted
        /// only out of one, a raising step only into one).</summary>
        public static StepPlan ChooseStep(Stance from, Stance to, bool female, double hipScale, bool leavesGuard = false, bool entersGuard = false)
        {
            if (hipScale <= 0) hipScale = 1;
            // 1. the required re-stance, per foot (cm, degrees) at the reference body
            var req = new double[2, 3];
            for (var k = 0; k < 2; k++)
            {
                var a = k == 0 ? from.Left : from.Right; var b = k == 0 ? to.Left : to.Right;
                req[k, 0] = (b.X - a.X) / hipScale * 100.0; req[k, 1] = (b.Z - a.Z) / hipScale * 100.0; req[k, 2] = Wrap(b.Yaw - a.Yaw);
            }
            // 2. within G13: nothing to do
            var within = 0.0;
            for (var k = 0; k < 2; k++) within = Math.Max(within, Cost(req[k, 0], req[k, 1], req[k, 2]));
            if (within <= 1.0) return new StepPlan(Array.Empty<string>(), within, StepPlan.Why.Within);
            // 3. no standing step bridges a crouch
            if (from.Hips / hipScale < StandingHips || to.Hips / hipScale < StandingHips) return new StepPlan(Array.Empty<string>(), within, StepPlan.Why.Crouched);
            var sex = female ? "f" : "m";
            var use = new List<StepClip>();
            foreach (var s in Steps)
                if ((s.Set == "both" || s.Set == sex) && (s.Arms == StepArms.Quiet || (s.Arms == StepArms.Lower && leavesGuard) || (s.Arms == StepArms.Raise && entersGuard)))
                    use.Add(s);
            if (use.Count == 0) return new StepPlan(Array.Empty<string>(), within, StepPlan.Why.NoStep);
            // 4. one step: each foot's nearest landing within the warp; the worse foot is the step's cost
            var best = double.MaxValue; string[] plan = null;
            foreach (var e in use)
            {
                var c = 0.0;
                for (var k = 0; k < 2; k++)
                {
                    var w = FootWarps(k == 0 ? e.Left : e.Right, 9, 13);
                    var m = double.MaxValue;
                    for (var i = 0; i < w.Length; i += 3) m = Math.Min(m, Cost(req[k, 0] - w[i], req[k, 1] - w[i + 1], req[k, 2] - w[i + 2]));
                    c = Math.Max(c, m);
                }
                if (c < best) { best = c; plan = new[] { e.Name }; }
            }
            // 5. two steps: the second's offsets in the frame the first leaves (turned by its mean captured turn), a coarser warp
            if (best > 1.0)
            {
                var warps = new double[2][][];
                for (var k = 0; k < 2; k++)
                {
                    warps[k] = new double[use.Count][];
                    for (var j = 0; j < use.Count; j++) warps[k][j] = FootWarps(k == 0 ? use[j].Left : use[j].Right, 5, 5);
                }
                for (var i = 0; i < use.Count; i++)
                {
                    var t1 = (use[i].Left.Turn + use[i].Right.Turn) / 2.0;
                    double cos = Math.Cos(t1 * Math.PI / 180.0), sin = Math.Sin(t1 * Math.PI / 180.0);
                    double bestJ = double.MaxValue; var jBest = -1;
                    for (var j = 0; j < use.Count; j++)
                    {
                        var cj = 0.0;
                        for (var k = 0; k < 2 && cj < best; k++)
                        {
                            var A = warps[k][i]; var B = warps[k][j];
                            var m = double.MaxValue;
                            for (var b = 0; b < B.Length; b += 3)
                            {
                                // the second step's landing turned into the frame the first leaves
                                double bx = B[b] * cos + B[b + 1] * sin, bz = B[b + 1] * cos - B[b] * sin, bt = B[b + 2];
                                double rx = req[k, 0] - bx, rz = req[k, 1] - bz, rt = req[k, 2] - bt;
                                for (var a = 0; a < A.Length; a += 3)
                                {
                                    var v = Cost(rx - A[a], rz - A[a + 1], rt - A[a + 2]);
                                    if (v < m) m = v;
                                }
                            }
                            cj = Math.Max(cj, m);
                        }
                        if (cj < bestJ) { bestJ = cj; jBest = j; }
                    }
                    if (jBest >= 0 && bestJ < best) { best = bestJ; plan = new[] { use[i].Name, use[jBest].Name }; }
                }
            }
            // 6. otherwise none: the transition plays as before
            return best <= 1.0 ? new StepPlan(plan, best, StepPlan.Why.Step) : new StepPlan(Array.Empty<string>(), best, StepPlan.Why.NoStep);
        }

        private static double Wrap(double deg) { deg %= 360.0; if (deg >= 180.0) deg -= 360.0; if (deg < -180.0) deg += 360.0; return deg; }

        /// <summary>A foot's residual against G13: the worse of its offset over 1.5 cm and its turn over 5°.</summary>
        private static double Cost(double x, double z, double turn) => Math.Max(Math.Sqrt(x * x + z * z) / StanceCm, Math.Abs(turn) / StanceDeg);

        /// <summary>Every landing a step's foot can be warped to: its captured offset (cm) scaled within ±WarpScale and turned
        /// within ±WarpTurn about its start, its own turn within ±WarpTurn; a foot the step leaves still keeps its place (its
        /// turn still warped). n scales, m turns: (x, z, turn) triples.</summary>
        private static double[] FootWarps((double X, double Z, double Turn) foot, int n, int m)
        {
            double cx = foot.X * 100.0, cz = foot.Z * 100.0;
            var moving = Math.Sqrt(cx * cx + cz * cz) >= StillCm;
            var scales = moving ? Lin(1.0 - WarpScale, 1.0 + WarpScale, n) : new[] { 1.0 };
            var turns = moving ? Lin(-WarpTurn, WarpTurn, m) : new[] { 0.0 };
            var own = Lin(-WarpTurn, WarpTurn, m);
            var o = new double[scales.Length * turns.Length * own.Length * 3];
            var i = 0;
            foreach (var s in scales)
                foreach (var t in turns)
                {
                    double c = Math.Cos(t * Math.PI / 180.0), sn = Math.Sin(t * Math.PI / 180.0);
                    double x = cx * s, z = cz * s;
                    double px = x * c + z * sn, pz = z * c - x * sn;
                    foreach (var tt in own) { o[i++] = px; o[i++] = pz; o[i++] = foot.Turn + tt; }
                }
            return o;
        }

        private static double[] Lin(double a, double b, int n)
        {
            var o = new double[n];
            for (var i = 0; i < n; i++) o[i] = n == 1 ? a : a + (b - a) * i / (n - 1);
            return o;
        }
    }
}
