using Unity.Burst;
using Unity.Collections;
using Unity.Jobs;
using Unity.Mathematics;
using UnityEngine;

namespace SecondFace.Game.People
{
    // ArmClearance's step with the body's skin as one Burst job a person (docs/qa/gates/motion_waivers.json failing_tests, the
    // people's cost: 3-7 ms a person a frame in the editor, the main thread's, 2026-11-28). The step's own code, statement for
    // statement, over NativeArrays: the arm's bones as a small hierarchy of their own (each bone's local place, turn and scale,
    // its world place, turn and matrix kept as Unity keeps them: a turn set in the world sets the local one under the parent,
    // and the bones under it follow), the skin as BodySkin.SkinK reckons it. ClearanceSystem gathers, schedules every person's
    // job together across the worker threads, completes them and applies. The managed Step stays as the reference (ManagedStep)
    // and for what the job does not take (counted, with the reason, Fallbacks).
    public sealed partial class ArmClearance
    {
        /// <summary>The managed Step, not the job (the reference the job is checked against; tests only).</summary>
        public static bool ManagedStep;
        /// <summary>Why the last frame's step was the managed one (null: the job's).</summary>
        [System.NonSerialized] public string FallbackWhy;
        /// <summary>Every fall back to the managed step since the start, by reason (tests read it).</summary>
        public static readonly System.Collections.Generic.Dictionary<string, int> Fallbacks = new();

        internal struct Settings
        {
            public float SkinMargin, MoveMargin, RestGive, SkinGap, SkinRange, Release, FlankFull, FlankNone, SwingFull, SwingNone, RestFlex, RestFront,
                RestIn, RestOut2, RestReachMax, AbdMin, AbdMax, AbdStart, AbdRate, UpperForward, BackMax, BackRate, BendMin, BendMax, HandHang, HandTaper,
                SetMax, HandInMax, HandInGap, BendFloor, HangMax, PoleOut, FlexMore, ElbowRest, UpperAim, PoleIn, UpperMax, RestFrontMax, FrontRate,
                ClothGive, SleeveGive, UpperGive, SwingSoft, SwingKeep, PushRetry, OutRetryIn, PalmMax, PalmRate, MoveElbowMax, ElbowHandGrow, ElbowMargin, RestCap;
            public int SwingFirst, StrideEnd, OutRetry, RestOutRetry, KeepHand, ElbowFirst, ElbowForearm, TraceStages;
        }

        internal struct State
        {
            public float Clock, MovedAt, RestW, FlexVar, FrontVar, AdaptL, AdaptR, WantGapL, WantGapR, FrontL, FrontR, AbdL, AbdR, BackL, BackR,
                PoleOutL, PoleOutR, FlexAddL, FlexAddR, PalmL, PalmR, AngleL, AngleR, NeedDepth, FirstDepth, PushFwd, CarryL, CarryR;
            public float3 AxisL, AxisR;
            public int ElbowTurnedL, ElbowTurnedR, GapArm, GapBody, NeedAt, NeedFirst, PushMode, DiagResting;
        }

        /// <summary>What the main thread reads for the job each frame (what a job cannot ask: the animator, the camera, the
        /// foot plant).</summary>
        internal struct Inputs
        {
            public float Dt, UnscaledDt, ScaleY;
            public float3 Forward, Right, Cam, Hips, Neck, TL, KL, TR, KR;
            public int HasCam, Holding, Gesture, Moving, Halted, NoController, SitOrPick, HasNeck, HasLegsL, HasLegsR;
        }

        internal struct RigBone
        {
            public int Parent, Skel;
            public float3 LP, LS, WP;
            public float4 LR, WR;
            public float4x4 WM;
        }

        // the named bones' places in the rig (-1: none)
        internal const int NLU = 0, NLL = 1, NLH = 2, NRU = 3, NRL = 4, NRH = 5, NLIdx = 6, NLMid = 7, NLLit = 8, NLMidD = 9, NRIdx = 10, NRMid = 11, NRLit = 12, NRMidD = 13, NCount = 14;

        /// <summary>The outputs the gate's report and trace read, as one block (offsets below).</summary>
        internal const int ODiag = 0, OHandDepth = 20, OForearmDepth = 32, OStageA1 = 44, OHold = 58, OHoldFlank = 66, OPushDeg = 68, ORestDepth = 70,
            ORestBodyY = 72, ORestDeg = 74, OPushDepth = 76, OSwingDeg = 78, OSwingTrace = 80, ORestOutDeg = 100, OOutRetryCm = 102, OStrideEndDeg = 104,
            OFlank = 106, OFloats = 108;
        internal const int IDiagAt = 0, IPushPart = 8, IRestPart = 10, IRestBody = 12, IInts = 14;

        [BurstCompile(CompileSynchronously = true, FloatMode = FloatMode.Strict, FloatPrecision = FloatPrecision.Standard)]
        internal struct StepJob : IJob
        {
            public K Kernel;
            public void Execute()
            {
                ClearanceSystem.StepMarker.Begin();
                Kernel.Run();
                ClearanceSystem.StepMarker.End();
            }
        }

        /// <summary>The step, over the person's arrays.</summary>
        internal struct K
        {
            public Settings S;
            public NativeArray<State> StateIO;
            public NativeArray<Inputs> In;
            public BodySkin.SkinK Sk;
            public NativeArray<RigBone> Rig;
            public NativeArray<int> Named, Ranges;   // Ranges: left subtree [0, 1), right [2, 3)
            public NativeArray<float> OutF;
            public NativeArray<int> OutI;
            public NativeArray<float3> OutPushAt;
            public NativeArray<float3> KeptP, KeptN;   // 5 slots of the arm's points, each SlotLen long
            public NativeArray<float4> KeptRot;          // 5 slots x (upper, lower)
            public int SlotLen;

            private State St;
            private Inputs I;

            // ---------------------------------------------------------------- the rig
            private float3 Pos(int b) => Rig[b].WP;
            private float4 Rot(int b) => Rig[b].WR;
            private int Bone(int n) => Named[n];

            /// <summary>Transform.rotation = q: the local turn under the parent, and the bones under it after it.</summary>
            private void SetRot(int b, float4 q)
            {
                var r = Rig[b];
                var par = Rig[r.Parent];
                r.LR = CM.QNormalize(CM.QMul(CM.Inverse(par.WR), q));
                r.WR = CM.QMul(par.WR, r.LR);
                var wp = r.WP;
                r.WM = CM.MatMul(par.WM, CM.TRS(r.LP, r.LR, r.LS));
                r.WM.c3 = new float4(wp, 1f);
                Rig[b] = r;
                if (r.Skel >= 0) Sk.M[r.Skel] = r.WM;
                // (the bones after it in its side's range that hang from it)
                var end = b < Ranges[1] ? Ranges[1] : Ranges[3];
                var dirty = new FixedList4096Bytes<int>();
                dirty.Add(b);
                for (var j = b + 1; j < end; j++)
                {
                    var c = Rig[j];
                    var under = false;
                    for (var k = 0; k < dirty.Length; k++) if (dirty[k] == c.Parent) { under = true; break; }
                    if (!under) continue;
                    var p = Rig[c.Parent];
                    c.WR = CM.QMul(p.WR, c.LR);
                    c.WM = CM.MatMul(p.WM, CM.TRS(c.LP, c.LR, c.LS));
                    c.WP = c.WM.c3.xyz;
                    Rig[j] = c;
                    if (c.Skel >= 0) Sk.M[c.Skel] = c.WM;
                    if (dirty.Length < dirty.Capacity) dirty.Add(j);
                }
            }

            private float3 Outward(int side) => CM.Mul(I.Right, side);

            // ---------------------------------------------------------------- outputs
            private void Diag(int i, float v) => OutF[ODiag + i] = v;
            private float DiagGet(int i) => OutF[ODiag + i];
            private void DiagAt(int i, int v) => OutI[IDiagAt + i] = v;

            public void Run()
            {
                St = StateIO[0];
                I = In[0];
                Step();
                StateIO[0] = St;
                Sk.Clock[3] = Sk.Near;
            }

            // ---------------------------------------------------------------- ArmClearance.Step (the skin path)
            private bool Striding()
            {
                if (I.Holding != 0) return false;
                if (I.Gesture != 0) return false;
                if (I.Moving != 0) St.MovedAt = St.Clock;
                return St.Clock - St.MovedAt < 0.8f;
            }

            private bool Resting()
            {
                if (I.Holding != 0 || I.NoController != 0) return false;
                if (I.Moving != 0 && I.Halted == 0) return false;
                if (I.Gesture != 0) return false;
                return I.SitOrPick == 0;
            }

            private void Step()
            {
                St.Clock += I.Dt;
                Flank();
                var dt = I.Dt > 0f ? I.Dt : I.UnscaledDt;
                var resting = Resting();
                St.DiagResting = resting ? 1 : 0;
                Diag(16, 0f); Diag(17, 0f); Diag(18, 0f); Diag(19, 0f);
                // (Near: within SkinRange of the camera; the system takes only people with the skin and near)
                St.RestW = CM.MoveTowards(St.RestW, resting ? 1f : 0f, dt / (resting ? S.RestIn : S.RestOut2));
                Sk.Pose();
                RestArm(-1, BodySkin.Part.UpperArmL, St.RestW);
                RestArm(1, BodySkin.Part.UpperArmR, St.RestW);
                Diag(1, HandGap(BodySkin.Part.UpperArmL)); Diag(3, HandGap(BodySkin.Part.UpperArmR));
                Diag(0, 0f); Diag(2, 0f);
                Stage(BodySkin.Part.UpperArmL, 0); Stage(BodySkin.Part.UpperArmR, 0);
                SkinClear(BodySkin.Part.UpperArmL, true, dt);
                SkinClear(BodySkin.Part.UpperArmR, false, dt);
                if (St.RestW > 0.99f)
                {
                    SetHand(BodySkin.Part.UpperArmL, St.RestW, Outward(-1));
                    SetHand(BodySkin.Part.UpperArmR, St.RestW, Outward(1));
                    Stage(BodySkin.Part.UpperArmL, 4); Stage(BodySkin.Part.UpperArmR, 4);
                    KeepHang(BodySkin.Part.UpperArmL);
                    KeepHang(BodySkin.Part.UpperArmR);
                    HandIn(BodySkin.Part.UpperArmL);
                    HandIn(BodySkin.Part.UpperArmR);
                    Stage(BodySkin.Part.UpperArmL, 5); Stage(BodySkin.Part.UpperArmR, 5);
                }
                if (Striding()) { Swing(BodySkin.Part.UpperArmL); Swing(BodySkin.Part.UpperArmR); }
                if (S.ElbowFirst != 0 && St.RestW < 0.99f) { MoveElbowClear(BodySkin.Part.UpperArmL); MoveElbowClear(BodySkin.Part.UpperArmR); }
                LateTrace();
                Diag(6, St.CarryL); Diag(7, St.AngleL); Diag(8, St.CarryR); Diag(9, St.AngleR);
            }

            private int U(BodySkin.Part first) => Bone(first == BodySkin.Part.UpperArmL ? NLU : NRU);
            private int Lo(BodySkin.Part first) => Bone(first == BodySkin.Part.UpperArmL ? NLL : NRL);
            private int H(BodySkin.Part first) => Bone(first == BodySkin.Part.UpperArmL ? NLH : NRH);

            // ---------------------------------------------------------------- Flank (the weights; the blend shapes are the main thread's)
            private void Flank()
            {
                int lu = Bone(NLU), ll = Bone(NLL), ru = Bone(NRU), rl = Bone(NRL);
                if (I.HasNeck == 0 || lu < 0 || ll < 0 || ru < 0 || rl < 0) { OutF[OFlank] = Sk.FlankL; OutF[OFlank + 1] = Sk.FlankR; return; }
                var down = CM.Norm(CM.Sub(I.Hips, I.Neck));
                var ahead = CM.ProjectOnPlane(I.Forward, down);
                ahead = CM.SqrMag(ahead) > 1e-6f ? CM.Norm(ahead) : I.Forward;
                var wl = FlankWeight(Pos(lu), Pos(ll), down, ahead); var wr = FlankWeight(Pos(ru), Pos(rl), down, ahead);
                Sk.FlankL = wl; Sk.FlankR = wr;
                OutF[OFlank] = wl; OutF[OFlank + 1] = wr;
            }
            private float FlankWeight(float3 u, float3 l, float3 down, float3 ahead)
            {
                var arm = CM.Sub(l, u);
                var w = 1f - CM.SmoothStep(0f, 1f, CM.InverseLerp(S.FlankFull, S.FlankNone, CM.Angle(arm, down)));
                var swing = CM.Abs(CM.Atan2(CM.Dot(arm, ahead), CM.Max(1e-4f, CM.Dot(arm, down))) * CM.Rad2Deg);
                return w * (1f - CM.SmoothStep(0f, 1f, CM.InverseLerp(S.SwingFull, S.SwingNone, swing)));
            }

            // ---------------------------------------------------------------- the turns
            private void TurnArm(int upper, BodySkin.Part first, float degrees, float3 axis)
            {
                if (CM.Abs(degrees) <= 0.001f || CM.SqrMag(axis) < 1e-8f) return;
                var q = CM.AngleAxis(degrees, CM.Norm(axis));
                SetRot(upper, CM.QMul(q, Rot(upper)));
                Sk.Turn(Sk.Begin(first), Sk.End(first + 2), Pos(upper), q);
            }
            private void TurnForearm(int lower, BodySkin.Part first, float degrees, float3 axis)
            {
                if (CM.Abs(degrees) <= 0.001f || CM.SqrMag(axis) < 1e-8f) return;
                var q = CM.AngleAxis(degrees, CM.Norm(axis));
                SetRot(lower, CM.QMul(q, Rot(lower)));
                Sk.Turn(Sk.Begin(first + 1), Sk.End(first + 2), Pos(lower), q);
            }

            // ---------------------------------------------------------------- Keep / Back
            private void Keep(int upper, int lower, int from, int to, int slot)
            {
                KeptRot[slot * 2] = Rot(upper); KeptRot[slot * 2 + 1] = Rot(lower);
                var n = to - from;
                for (var i = 0; i < n && i < SlotLen; i++) { KeptP[slot * SlotLen + i] = Sk.P[from + i]; KeptN[slot * SlotLen + i] = Sk.Nn[from + i]; }
            }
            private void Back(int upper, int lower, int from, int to, int slot)
            {
                SetRot(upper, KeptRot[slot * 2]); SetRot(lower, KeptRot[slot * 2 + 1]);
                var n = to - from;
                for (var i = 0; i < n && i < SlotLen; i++) { Sk.P[from + i] = KeptP[slot * SlotLen + i]; Sk.Nn[from + i] = KeptN[slot * SlotLen + i]; }
            }

            // ---------------------------------------------------------------- Gap, Give, HandGap
            private float Gap(int from, int to, int stride, float far, bool hasWithin = false, float3 within = default, float radius = 0f, float soft = 0f)
            {
                var gap = float.MaxValue;
                St.GapArm = St.GapBody = -1;
                Sk.DepthRange(from, to, stride);
                for (var i = from; i < to; i += stride)
                {
                    if (hasWithin && CM.SqrMag(CM.Sub(Sk.P[i], within)) > radius * radius) continue;
                    if (!Sk.Got(i, out var d, out var cn)) continue;
                    var g = -d + (soft > 0f ? Give(i, cn, soft, S.SleeveGive) : 0f);
                    if (g < gap) { gap = g; St.GapArm = i; St.GapBody = Sk.Near; }
                }
                return gap == float.MaxValue ? far : gap;
            }
            private float Give(int i, float3 n, float cloth, float sleeve)
            {
                var g = 0f;
                var near = Sk.Near;
                if (cloth > 0f && near >= 0) g += cloth * Sk.OffAt(near) * CM.Max(0f, CM.Dot(Sk.Nn[near], n));
                var s = -CM.Dot(Sk.Nn[i], n);
                if (sleeve > 0f) g += Sk.OffAt(i) * (s >= 0f ? sleeve * s : s);
                return g;
            }
            private float HandGap(BodySkin.Part first)
            {
                var g = Gap(Sk.Begin(first + 2), Sk.End(first + 2), 2, float.MaxValue);
                var left = first == BodySkin.Part.UpperArmL;
                DiagAt(left ? 2 : 6, St.GapArm); DiagAt(left ? 3 : 7, St.GapBody);
                return g < float.MaxValue ? g : -1f;
            }

            // ---------------------------------------------------------------- RestArm (UpperFirst)
            private bool Place(int side, BodySkin.Part first, float front, float3 S_, float l2, float reach, float3 outward, float3 hipP, float3 leg, BodySkin.Part thigh,
                bool fromElbow, float3 elbowPlaced, out float3 at, out float off)
            {
                var dir = CM.Norm(CM.Rotate(CM.AngleAxis(-side * front, new float3(0f, 1f, 0f)), outward));
                var wristY = fromElbow ? elbowPlaced.y - l2 * 0.97f : S_.y - reach * 0.985f;
                at = float3.zero; off = float.MaxValue;
                var any = false;
                for (var pass = 0; pass < 2; pass++)
                {
                    var t = CM.Clamp01((wristY - 0.08f - hipP.y) / CM.Min(-1e-3f, leg.y));
                    var axis = CM.Add(hipP, CM.Mul(leg, t));
                    var surf = float.MinValue;
                    surf = Look(Sk.Begin(thigh), Sk.End(thigh), false, wristY, axis, dir, outward, surf);
                    surf = Look(Sk.Begin(BodySkin.Part.Torso), Sk.End(BodySkin.Part.Torso), true, wristY, axis, dir, outward, surf);
                    if (surf == float.MinValue) break;
                    any = true;
                    var adapt = side < 0 ? St.AdaptL : St.AdaptR;
                    Diag(side < 0 ? 4 : 10, adapt * 100f); Diag(side < 0 ? 5 : 11, surf * 100f);
                    var flat = CM.Add(new float3(axis.x, 0f, axis.z), CM.Mul(dir, surf + 0.015f + S.SkinGap + adapt));
                    if (fromElbow)
                    {
                        float hx = flat.x - elbowPlaced.x, hz = flat.z - elbowPlaced.z;
                        var he = CM.Sqrt(hx * hx + hz * hz);   // (Vector2.magnitude)
                        var heMax = l2 * CM.Sin(S.HangMax * CM.Deg2Rad);
                        if (he > heMax) { var ef = new float3(elbowPlaced.x, 0f, elbowPlaced.z); flat = CM.Add(ef, CM.Mul(CM.Norm(CM.Sub(flat, ef)), heMax)); he = heMax; }
                        wristY = elbowPlaced.y - CM.Sqrt(CM.Max(0.2f * l2 * l2, l2 * l2 - he * he));
                        at = new float3(flat.x, wristY, flat.z);
                        off = he;
                        continue;
                    }
                    float sx = flat.x - S_.x, sz = flat.z - S_.z;
                    var h = CM.Sqrt(sx * sx + sz * sz);   // (Vector2.magnitude)
                    var hMax = reach * CM.Sin(S.RestReachMax * CM.Deg2Rad);
                    if (h > hMax) { var sf = new float3(S_.x, 0f, S_.z); flat = CM.Add(sf, CM.Mul(CM.Norm(CM.Sub(flat, sf)), hMax)); h = hMax; }
                    wristY = S_.y - CM.Sqrt(CM.Max(0.04f * reach * reach, reach * reach - h * h));
                    at = new float3(flat.x, wristY, flat.z);
                    off = h;
                }
                return any;
            }
            private float Look(int lo, int hi, bool lowOnly, float wristY, float3 axis, float3 dir, float3 outward, float surf)
            {
                for (var i = lo; i < hi; i++)
                {
                    if (lowOnly && !Sk.Low(i)) continue;
                    var p = Sk.P[i];
                    if (p.y > wristY + 0.02f || p.y < wristY - 0.19f) continue;
                    var o = CM.Sub(p, axis); o.y = 0f;
                    if (CM.Dot(o, dir) <= 0f || CM.Dot(o, outward) < -0.02f) continue;
                    surf = CM.Max(surf, CM.Dot(o, dir));
                }
                return surf;
            }

            private void RestArm(int side, BodySkin.Part first, float w)
            {
                int upper = U(first), lower = Lo(first), hand = H(first);
                if (w <= 0.001f || upper < 0 || lower < 0 || hand < 0) return;
                var hasLeg = side < 0 ? I.HasLegsL : I.HasLegsR;
                if (hasLeg == 0) return;
                var hipP = side < 0 ? I.TL : I.TR; var kneeP = side < 0 ? I.KL : I.KR;
                if (float.IsNaN(St.FlexVar)) return;   // (set on the main thread from the person's name, as the managed step does)
                var S_ = Pos(upper); var E = Pos(lower); var W_ = Pos(hand);
                var l1 = CM.Mag(CM.Sub(E, S_)); var l2 = CM.Mag(CM.Sub(W_, E));
                if (l1 < 0.05f || l2 < 0.05f) return;
                int lu = Bone(NLU), ru = Bone(NRU);
                var yaw = lu >= 0 && ru >= 0 ? CM.SignedAngle(I.Right, CM.ProjectOnPlane(CM.Sub(Pos(ru), Pos(lu)), new float3(0f, 1f, 0f)), new float3(0f, 1f, 0f)) : 0f;
                var turn = CM.AngleAxis(CM.Clamp(yaw, -45f, 45f), new float3(0f, 1f, 0f));
                var fwd = CM.Rotate(turn, I.Forward); var outward = CM.Rotate(turn, Outward(side));
                var poleOut = side < 0 ? St.PoleOutL : St.PoleOutR;
                var flexAdd = side < 0 ? St.FlexAddL : St.FlexAddR;
                var flex = CM.Clamp(S.RestFlex + St.FlexVar + flexAdd, 6f, 32f) * CM.Deg2Rad;
                var reach = CM.Sqrt(l1 * l1 + l2 * l2 + 2f * l1 * l2 * CM.Cos(flex));
                var leg = CM.Sub(kneeP, hipP);
                var thigh = side < 0 ? BodySkin.Part.ThighL : BodySkin.Part.ThighR;
                var baseFront = CM.Clamp(S.RestFront + St.FrontVar, 0f, 30f);
                var frontNow = side < 0 ? St.FrontL : St.FrontR;
                if (float.IsNaN(frontNow)) frontNow = baseFront;
                var best = frontNow; var bestH = Place(side, first, frontNow, S_, l2, reach, outward, hipP, leg, thigh, false, float3.zero, out _, out var hNow) ? hNow : float.MaxValue;
                for (var c = 0; c < 3; c++)
                {
                    var cand = CM.Min(S.RestFrontMax, baseFront + c * 30f);
                    if (CM.Abs(cand - frontNow) < 1f) continue;
                    if (Place(side, first, cand, S_, l2, reach, outward, hipP, leg, thigh, false, float3.zero, out _, out var hc) && hc < bestH - 0.005f) { best = cand; bestH = hc; }
                }
                frontNow = CM.MoveTowards(frontNow, best, S.FrontRate * I.Dt);
                if (side < 0) { St.FrontL = frontNow; St.WantGapL = S.SkinGap; } else { St.FrontR = frontNow; St.WantGapR = S.SkinGap; }
                var found = Place(side, first, frontNow, S_, l2, reach, outward, hipP, leg, thigh, false, float3.zero, out _, out _);
                if (!found) { StorePole(side, poleOut, flexAdd); return; }
                var abd = side < 0 ? St.AbdL : St.AbdR;
                var back = side < 0 ? St.BackL : St.BackR;
                if (float.IsNaN(abd)) abd = S.AbdStart;
                var ua = UpperDir(abd, back, fwd, outward);
                var elbowPlaced = CM.Add(S_, CM.Mul(ua, l1));
                if (!Place(side, first, frontNow, S_, l2, reach, outward, hipP, leg, thigh, true, elbowPlaced, out var wristE, out _))
                { StoreAbd(side, abd, back); StorePole(side, poleOut, flexAdd); return; }
                var bendNow = CM.Angle(ua, CM.Sub(wristE, elbowPlaced));
                var bendWant = CM.Max(S.BendMin, CM.Min(S.BendMax - 4f, S.RestFlex + St.FlexVar - 5f));
                if (w > 0.99f)
                {
                    if (bendNow < bendWant) back = CM.Min(S.BackMax, back + S.BackRate * I.Dt);
                    else if (bendNow > bendWant + 4f) back = CM.Max(0f, back - S.BackRate * I.Dt);
                }
                StoreAbd(side, abd, back);
                UpperFirstArm(upper, lower, hand, side, first, w, S_, E, l1, l2, wristE, fwd, outward, ua, ref abd);
                StoreAbd(side, abd, back);
                Diag(side < 0 ? 4 : 10, back);
                StorePole(side, poleOut, flexAdd);
            }
            private void StoreAbd(int side, float abd, float back) { if (side < 0) { St.AbdL = abd; St.BackL = back; } else { St.AbdR = abd; St.BackR = back; } }
            private void StorePole(int side, float poleOut, float flexAdd) { if (side < 0) { St.PoleOutL = poleOut; St.FlexAddL = flexAdd; } else { St.PoleOutR = poleOut; St.FlexAddR = flexAdd; } }

            private float3 UpperDir(float abd, float back, float3 fwd, float3 outward)
            {
                var ra = abd * CM.Deg2Rad; var rf = (S.UpperForward - back) * CM.Deg2Rad;
                var ua = CM.Add(CM.Mul(new float3(0f, -1f, 0f), CM.Cos(ra)), CM.Mul(outward, CM.Sin(ra)));
                return CM.Norm(CM.Add(CM.Mul(ua, CM.Cos(rf)), CM.Mul(fwd, CM.Sin(rf))));
            }

            private void UpperFirstArm(int upper, int lower, int hand, int side, BodySkin.Part first, float w,
                float3 S_, float3 E, float l1, float l2, float3 wrist, float3 fwd, float3 outward, float3 ua, ref float abd)
            {
                var elbowAt = CM.Add(S_, CM.Mul(ua, l1));
                var fa = CM.Sub(wrist, elbowAt);
                fa = CM.SqrMag(fa) > 1e-6f ? CM.Norm(fa) : new float3(0f, -1f, 0f);
                var bendMin = CM.Max(S.BendMin, CM.Min(S.BendMax - 4f, S.RestFlex + St.FlexVar - 5f));
                var fwdPerp = CM.Norm(CM.ProjectOnPlane(fwd, ua));
                var backNow = side < 0 ? St.BackL : St.BackR;
                if (backNow >= S.BackMax - 0.01f)
                    for (var k = 0; k < 40 && CM.Angle(ua, fa) < bendMin; k++) fa = CM.Norm(CM.RotateTowards(fa, fwdPerp, CM.Deg2Rad, 0f));
                var bend = CM.Angle(ua, fa);
                if (bend > S.BendMax) fa = CM.Norm(CM.RotateTowards(fa, ua, (bend - S.BendMax) * CM.Deg2Rad, 0f));
                if (CM.Angle(fa, new float3(0f, -1f, 0f)) > S.HangMax) fa = CM.Norm(CM.RotateTowards(new float3(0f, -1f, 0f), fa, S.HangMax * CM.Deg2Rad, 0f));
                var dU = CM.Slerp(CM.Identity, CM.FromToRotation(CM.Sub(E, S_), CM.Sub(elbowAt, S_)), w);
                CM.ToAngleAxis(dU, out var aU, out var axU);
                if (aU > 0.01f && CM.SqrMag(axU) > 0.5f) TurnArm(upper, first, aU, axU);
                var E2 = Pos(lower); var W2 = Pos(hand);
                var dL = CM.Slerp(CM.Identity, CM.FromToRotation(CM.Sub(W2, E2), CM.Mul(fa, l2)), w);
                CM.ToAngleAxis(dL, out var aL, out var axL);
                if (aL > 0.01f && CM.SqrMag(axL) > 0.5f) TurnForearm(lower, first, aL, axL);
                PalmIn(lower, hand, side, first, w);
                HangHand(hand, side, first, w, fwd, outward);
                SetHand(first, w, outward);
                if (w < 0.99f) return;
                var gapU = Gap(Sk.Begin(first), Sk.End(first), 1, 0.08f, false, default, 0f, S.ClothGive);
                int holdArm = St.GapArm, holdBody = St.GapBody;
                var gapF = Gap(Sk.Begin(first + 1), Sk.End(first + 1), 1, 0.08f, true, Pos(lower), 0.08f, S.ClothGive);
                if (gapU <= gapF) { St.GapArm = holdArm; St.GapBody = holdBody; }
                var gapE = CM.Min(gapU, gapF);
                if (S.TraceStages != 0) HoldDiag(side, S_, Pos(lower), gapE);
                var dt = I.Dt;
                if (gapE < S.ElbowRest) abd = CM.Min(S.AbdMax, abd + S.AbdRate * dt);
                else if (gapE > S.ElbowRest + 0.01f) abd = CM.Max(S.AbdMin, abd - 0.5f * S.AbdRate * dt);
                Diag(side < 0 ? 12 : 13, abd); Diag(side < 0 ? 14 : 15, CM.Angle(CM.Sub(Pos(hand), Pos(lower)), new float3(0f, -1f, 0f)));
            }

            private void HoldDiag(int side, float3 shoulder, float3 elbow, float gap)
            {
                var o = side < 0 ? 0 : 4;
                if (St.GapArm < 0 || St.GapBody < 0) { OutF[OHold + o] = -1f; OutF[OHold + o + 1] = -1f; OutF[OHold + o + 2] = 0f; OutF[OHold + o + 3] = gap * 100f; return; }
                var p = Sk.P[St.GapArm];
                var part = Sk.PartOf(St.GapArm);
                var ua = CM.Sub(elbow, shoulder);
                OutF[OHold + o] = part == BodySkin.Part.UpperArmL || part == BodySkin.Part.UpperArmR
                    ? CM.Clamp01(CM.Dot(CM.Sub(p, shoulder), ua) / CM.Max(1e-6f, CM.SqrMag(ua)))
                    : 1f + CM.Clamp01(CM.Mag(CM.Sub(p, elbow)) / 0.27f);
                var bp = Sk.PartOf(St.GapBody);
                OutF[OHold + o + 1] = bp == BodySkin.Part.Torso ? 0f : bp == BodySkin.Part.ThighL ? 1f : bp == BodySkin.Part.ThighR ? 2f : 3f;
                OutF[OHold + o + 2] = (Sk.P[St.GapBody].y - I.Hips.y) * 100f;
                OutF[OHold + o + 3] = gap * 100f;
                OutF[OHoldFlank + (side < 0 ? 0 : 1)] = Sk.FlankMove(St.GapBody) * 100f;
            }

            // ---------------------------------------------------------------- PalmIn, HangHand
            private void PalmIn(int lower, int hand, int side, BodySkin.Part first, float w)
            {
                int idx = Bone(side < 0 ? NLIdx : NRIdx), mid = Bone(side < 0 ? NLMid : NRMid), lit = Bone(side < 0 ? NLLit : NRLit), midD = Bone(side < 0 ? NLMidD : NRMidD);
                var now = side < 0 ? St.PalmL : St.PalmR;
                if (idx < 0 || mid < 0 || lit < 0) return;
                var n = CM.Cross(CM.Norm(CM.Sub(Pos(lit), Pos(idx))), CM.Norm(CM.Sub(Pos(mid), Pos(hand))));
                if (CM.SqrMag(n) < 1e-8f) return;
                n = CM.Norm(n);
                var probe = midD >= 0 ? Pos(midD) : CM.Add(Pos(mid), n);
                if (CM.Dot(CM.Sub(probe, Pos(mid)), n) < 0f) n = CM.Neg(n);
                var axis = CM.Sub(Pos(hand), Pos(lower));
                if (CM.SqrMag(axis) < 1e-6f) return;
                axis = CM.Norm(axis);
                var a = CM.ProjectOnPlane(n, axis); var b = CM.ProjectOnPlane(CM.Sub(CM.Mul(CM.Neg(Outward(side)), 0.8f), CM.Mul(I.Forward, 0.6f)), axis);
                if (CM.SqrMag(a) < 1e-6f || CM.SqrMag(b) < 1e-6f) return;
                var want = CM.Clamp(CM.SignedAngle(a, b, axis), -S.PalmMax, S.PalmMax) * w;
                now = CM.MoveTowards(now, want, S.PalmRate * I.Dt);
                if (side < 0) St.PalmL = now; else St.PalmR = now;
                if (CM.Abs(now) < 0.01f) return;
                TurnForearm(lower, first, 0.5f * now, axis);
                var q = CM.AngleAxis(0.5f * now, axis);
                SetRot(hand, CM.QMul(q, Rot(hand)));
                Sk.Turn(Sk.Begin(first + 2), Sk.End(first + 2), Pos(hand), q);
            }

            private void HangHand(int hand, int side, BodySkin.Part first, float w, float3 fwd, float3 outward)
            {
                if (S.HandHang <= 0f) return;
                var mid = Bone(side < 0 ? NLMid : NRMid);
                if (mid < 0) return;
                var hd = CM.ProjectOnPlane(CM.Sub(Pos(mid), Pos(hand)), fwd);
                var want = CM.ProjectOnPlane(CM.Sub(CM.Mul(new float3(0f, -1f, 0f), CM.Cos(S.HandTaper * CM.Deg2Rad)), CM.Mul(outward, CM.Sin(S.HandTaper * CM.Deg2Rad))), fwd);
                if (CM.SqrMag(hd) < 1e-6f || CM.SqrMag(want) < 1e-6f) return;
                var a = CM.Clamp(CM.SignedAngle(hd, want, fwd), -S.HandHang, S.HandHang) * w;
                if (CM.Abs(a) < 0.01f) return;
                var q = CM.AngleAxis(a, fwd);
                SetRot(hand, CM.QMul(q, Rot(hand)));
                Sk.Turn(Sk.Begin(first + 2), Sk.End(first + 2), Pos(hand), q);
            }

            // ---------------------------------------------------------------- SetHand, KeepHang, HandIn
            private void SetHand(BodySkin.Part first, float w, float3 outward)
            {
                if (w < 0.99f) return;
                int lower = Lo(first), hand = H(first), upperB = U(first);
                for (var pass = 0; pass < 2; pass++)
                {
                    var g = HandGap(first);
                    var far = g <= -0.5f;
                    var gapWant = (first == BodySkin.Part.UpperArmL ? St.ElbowTurnedL : St.ElbowTurnedR) != 0 ? CM.Max(S.SkinGap, S.ElbowMargin) : S.SkinGap;
                    var move = far ? -S.SetMax : CM.Clamp(gapWant - g, -S.SetMax, S.SetMax);
                    if (CM.Abs(move) < 0.002f) return;
                    var dir = outward;
                    if (!far && St.GapBody >= 0) { var n = Sk.Nn[St.GapBody]; n.y = 0f; if (CM.SqrMag(n) > 0.09f) dir = CM.Norm(n); }
                    var E = Pos(lower); var W_ = Pos(hand);
                    var upperDir = CM.Sub(E, Pos(upperB));
                    var moved = false;
                    var inBefore = SkinNeed(lower, first, true).x;
                    for (var si = 0; si < 3; si++)
                    {
                        var share = si == 0 ? 1f : si == 1 ? 0.5f : 0.25f;
                        var to = CM.Add(W_, CM.Mul(dir, move * share));
                        var q = CM.FromToRotation(CM.Sub(W_, E), CM.Sub(to, E));
                        CM.ToAngleAxis(q, out var a, out var ax);
                        if (a < 0.01f || CM.SqrMag(ax) < 0.5f) return;
                        if (CM.Angle(CM.Rotate(q, CM.Sub(W_, E)), new float3(0f, -1f, 0f)) > S.HangMax + 3f && CM.Angle(CM.Rotate(q, CM.Sub(W_, E)), new float3(0f, -1f, 0f)) > CM.Angle(CM.Sub(W_, E), new float3(0f, -1f, 0f))) return;
                        var bendTo = CM.Angle(upperDir, CM.Rotate(q, CM.Sub(W_, E)));
                        if (bendTo > S.BendMax + 5f && bendTo > CM.Angle(upperDir, CM.Sub(W_, E))) return;
                        if (bendTo < S.BendFloor && bendTo < CM.Angle(upperDir, CM.Sub(W_, E))) return;
                        TurnForearm(lower, first, a, ax);
                        var inAfter = SkinNeed(lower, first, true).x;
                        if (inAfter > CM.Min(0.5f, inBefore + 0.01f)) { TurnForearm(lower, first, -a, ax); continue; }
                        inBefore = inAfter;
                        moved = true;
                        break;
                    }
                    if (!moved) return;
                }
            }

            private void KeepHang(BodySkin.Part first)
            {
                int upper = U(first), lower = Lo(first), hand = H(first);
                if (upper < 0 || lower < 0 || hand < 0) return;
                var S_ = Pos(upper); var E = Pos(lower); var Hh = Pos(hand);
                var fa = CM.Sub(Hh, E); var l1 = CM.Mag(CM.Sub(E, S_)); var l2 = CM.Mag(fa);
                if (l1 < 0.05f || l2 < 0.05f) return;
                var hang = CM.Angle(fa, new float3(0f, -1f, 0f));
                var max = S.HangMax + 3f;
                if (hang <= max) return;
                var lean = new float3(fa.x, 0f, fa.z);
                if (CM.SqrMag(lean) < 1e-6f) return;
                var move = l2 * (CM.Sin(hang * CM.Deg2Rad) - CM.Sin(max * CM.Deg2Rad));
                var axis = CM.Cross(CM.Sub(E, S_), CM.Norm(lean));
                if (CM.SqrMag(axis) < 1e-8f) return;
                var turn = CM.Min(10f, move / l1 * CM.Rad2Deg);
                var inBefore = SkinNeed(upper, first, false, true, true).x;
                TurnArm(upper, first, turn, axis);
                var E2 = Pos(lower); var W2 = Pos(hand);
                CM.ToAngleAxis(CM.FromToRotation(CM.Sub(W2, E2), CM.Sub(Hh, E2)), out var a, out var ax);
                if (a > 0.01f && CM.SqrMag(ax) > 0.5f) TurnForearm(lower, first, a, ax);
                if (CM.Angle(CM.Sub(Pos(lower), Pos(upper)), CM.Sub(Pos(hand), Pos(lower))) < S.BendFloor
                    || SkinNeed(upper, first, false, true, true).x > inBefore + 0.05f)
                {
                    if (a > 0.01f && CM.SqrMag(ax) > 0.5f) TurnForearm(lower, first, -a, ax);
                    TurnArm(upper, first, -turn, axis);
                }
            }

            private void HandIn(BodySkin.Part first)
            {
                var hand = H(first);
                if (S.HandInMax <= 0f || hand < 0) return;
                var done = 0f;
                for (var pass = 0; pass < 2 && done < S.HandInMax; pass++)
                {
                    var g = HandGap(first);
                    if (g < 0f || g <= S.HandInGap || St.GapArm < 0 || St.GapBody < 0) return;
                    var r = CM.Sub(Sk.P[St.GapArm], Pos(hand));
                    if (CM.SqrMag(r) < 0.0009f) return;
                    var axis = CM.Cross(r, CM.Neg(Sk.Nn[St.GapBody]));
                    if (CM.SqrMag(axis) < 1e-8f) return;
                    var full = CM.Min(S.HandInMax - done, CM.Atan2(g - S.HandInGap, CM.Mag(r)) * CM.Rad2Deg);
                    if (full < 0.2f) return;
                    var a = 0f;
                    for (var si = 0; si < 3; si++)
                    {
                        var share = si == 0 ? 1f : si == 1 ? 0.5f : 0.25f;
                        var q = CM.AngleAxis(full * share, CM.Norm(axis));
                        SetRot(hand, CM.QMul(q, Rot(hand)));
                        Sk.Turn(Sk.Begin(first + 2), Sk.End(first + 2), Pos(hand), q);
                        var into = false;
                        Sk.DepthRange(Sk.Begin(first + 2), Sk.End(first + 2));
                        for (int i = Sk.Begin(first + 2), to = Sk.End(first + 2); i < to && !into; i++)
                            if (Sk.Got(i, out var d, out _) && d > 0f) into = true;
                        if (!into) { a = full * share; break; }
                        var back = CM.Inverse(q);
                        SetRot(hand, CM.QMul(back, Rot(hand)));
                        Sk.Turn(Sk.Begin(first + 2), Sk.End(first + 2), Pos(hand), back);
                    }
                    if (a <= 0f) return;
                    done += a;
                }
            }

            // ---------------------------------------------------------------- SkinNeed, SkinNeedAbout, InDepth
            /// <summary>(angle, axis) as float4: x the angle, yzw the axis.</summary>
            private float4 SkinNeed(int upper, BodySkin.Part first, bool lowerOnly = false, bool noHand = false, bool nearElbow = false)
            {
                var shoulder = Pos(upper);
                var best = 0f; var axis = float3.zero; St.NeedAt = -1;
                var from = Sk.Begin(lowerOnly ? first + 1 : first); var to = noHand ? Sk.Begin(first + 2) : Sk.End(first + 2);
                var hand = Sk.Begin(first + 2);
                var lowerArm = Lo(first);
                var elbowAt = lowerArm >= 0 ? Pos(lowerArm) : Pos(upper);
                var forearm = Sk.Begin(first + 1);
                var upperLen = CM.Mag(CM.Sub(elbowAt, shoulder));
                var striding = St.RestW < 0.01f && Striding();
                Sk.DepthRange(from, to);
                for (var i = from; i < to; i++)
                {
                    var p = Sk.P[i];
                    if (nearElbow && i >= forearm && CM.SqrMag(CM.Sub(p, elbowAt)) >= 0.0144f) continue;
                    if (!Sk.Got(i, out var d, out var n)) continue;
                    if (St.RestW > 0.99f && i < hand && Sk.Near >= 0) d -= Give(i, n, S.ClothGive, S.SleeveGive);
                    var high = i < forearm && CM.Dot(CM.Sub(p, shoulder), CM.Sub(elbowAt, shoulder)) < 0.65f * upperLen * upperLen;
                    if (high && St.RestW < 0.99f) continue;
                    if (high) d -= S.UpperGive;
                    var m = i >= forearm ? CM.Lerp(S.SkinMargin + S.MoveMargin, -S.RestGive * CM.Clamp01(-CM.Dot(Sk.Nn[i], n)), St.RestW) : CM.Lerp(S.SkinMargin + S.MoveMargin, 0f, St.RestW);
                    if (d + m <= 0f) continue;
                    var arm = CM.Sub(p, shoulder);
                    var a = CM.Atan2(d + m, CM.Mag(arm)) * CM.Rad2Deg;
                    if (a <= best) continue;
                    var pushTo = n;
                    if (CM.Abs(CM.Dot(CM.Norm(arm), n)) > 0.6f)
                    {
                        var nh = new float3(n.x, 0f, n.z);
                        pushTo = CM.SqrMag(nh) > 0.09f ? CM.Norm(nh) : Outward(first == BodySkin.Part.UpperArmL ? -1 : 1);
                    }
                    if (striding && St.PushMode == 2) pushTo = Outward(first == BodySkin.Part.UpperArmL ? -1 : 1);
                    else if (striding && St.PushMode == 0)
                    {
                        var o = Outward(first == BodySkin.Part.UpperArmL ? -1 : 1);
                        var axN = CM.Cross(arm, pushTo); var axO = CM.Cross(arm, o);
                        if (CM.SqrMag(axN) > 1e-8f && CM.SqrMag(axO) > 1e-8f)
                            if (After(axO, arm, n, d + m, CM.Sub(elbowAt, shoulder)) < After(axN, arm, n, d + m, CM.Sub(elbowAt, shoulder))) pushTo = o;
                    }
                    var ax = CM.Cross(arm, pushTo);
                    if (CM.SqrMag(ax) < 1e-8f) continue;
                    best = a; axis = CM.Norm(ax); St.NeedAt = i; St.NeedDepth = d + m; St.PushFwd = CM.Dot(pushTo, I.Forward);
                    var left = first == BodySkin.Part.UpperArmL;
                    DiagAt(left ? 0 : 4, i); DiagAt(left ? 1 : 5, Sk.Near);
                    OutPushAt[left ? 0 : 1] = p;
                }
                return new float4(best, axis);
            }
            private static float After(float3 turnAx, float3 arm, float3 n, float dm, float3 upperVec)
            {
                turnAx = CM.Norm(turnAx);
                var mv = CM.Dot(CM.Cross(turnAx, arm), n);
                if (mv <= 1e-4f) return float.MaxValue;
                var deg = CM.Atan2(dm, mv) * CM.Rad2Deg;
                return CM.Angle(CM.Rotate(CM.AngleAxis(deg, turnAx), upperVec), new float3(0f, -1f, 0f));
            }

            private float4 SkinNeedAbout(float3 pivot, int from, int to, BodySkin.Part first)
            {
                var best = 0f; var axis = float3.zero;
                var hand = Sk.Begin(first + 2);
                Sk.DepthRange(from, to);
                for (var i = from; i < to; i++)
                {
                    var p = Sk.P[i];
                    var arm = CM.Sub(p, pivot);
                    if (CM.SqrMag(arm) < 0.0144f) continue;
                    if (!Sk.Got(i, out var d, out var n)) continue;
                    if (i < hand && Sk.Near >= 0 && CM.SqrMag(arm) < 0.0064f) d -= Give(i, n, S.ClothGive, 0f);
                    if (d + S.ElbowMargin <= 0f) continue;
                    var a = CM.Atan2(d + S.ElbowMargin, CM.Mag(arm)) * CM.Rad2Deg;
                    if (a <= best) continue;
                    var nh = new float3(n.x, 0f, n.z);
                    var side = Outward(first == BodySkin.Part.UpperArmL ? -1 : 1);
                    var pushTo = CM.SqrMag(nh) > 0.09f ? CM.Norm(CM.Add(CM.Norm(nh), side)) : side;
                    var ax = CM.Cross(arm, pushTo);
                    if (CM.SqrMag(ax) < 1e-8f) continue;
                    best = a; axis = CM.Norm(ax);
                }
                return new float4(best, axis);
            }

            private float InDepth(int upper, BodySkin.Part first)
            {
                var lowerArm = Lo(first);
                var shoulder = Pos(upper); var elbowAt = lowerArm >= 0 ? Pos(lowerArm) : shoulder;
                var upperLen2 = CM.SqrMag(CM.Sub(elbowAt, shoulder)); var forearm = Sk.Begin(first + 1);
                int from = Sk.Begin(first), to = Sk.End(first + 2);
                Sk.DepthRange(from, to);
                var deep = 0f;
                for (var i = from; i < to; i++)
                {
                    if (i < forearm && CM.Dot(CM.Sub(Sk.P[i], shoulder), CM.Sub(elbowAt, shoulder)) < 0.65f * upperLen2) continue;
                    if (Sk.Got(i, out var d, out _) && d > deep) deep = d;
                }
                return deep;
            }

            // ---------------------------------------------------------------- SkinClear
            private float Margin3 => CM.Lerp(S.SkinMargin + S.MoveMargin, -S.RestGive, St.RestW);

            private void Angles(int upper, int lower, out float a, out float sag, out float side)
            {
                var dir = CM.Norm(CM.Sub(Pos(lower), Pos(upper)));
                a = CM.Angle(dir, new float3(0f, -1f, 0f));
                sag = CM.Atan2(CM.Dot(dir, I.Forward), CM.Max(1e-4f, -dir.y)) * CM.Rad2Deg;
                side = CM.Asin(CM.Clamp(CM.Abs(CM.Dot(dir, I.Right)), 0f, 1f)) * CM.Rad2Deg;
            }
            private void TraceAngles(int st, int k, int upper, int lower)
            {
                Angles(upper, lower, out var a, out var sg, out var sd);
                OutF[OSwingTrace + st + k] = a; OutF[OSwingTrace + st + k + 1] = sg; OutF[OSwingTrace + st + k + 2] = sd;
            }

            // (SkinClear's local Push and its captured state)
            private float _need; private float3 _dir; private float _ang; private float3 _ax; private float _pushed; private bool _forUpper;

            private void Push(int how, int upper, int lower, int handT, BodySkin.Part first, bool elbowFirst, bool elbowForearm, float dt, float3 wrist0)
            {
                St.PushMode = how;
                if (how != 0) { var r = SkinNeed(upper, first, false, elbowFirst, elbowForearm); _need = r.x; _dir = r.yzw; }
                St.NeedFirst = _need > 0f ? St.NeedAt : -1; St.FirstDepth = St.NeedDepth;
                _forUpper = St.NeedAt >= Sk.Begin(first) && St.NeedAt < Sk.Begin(first + 1);
                if (_need > 0f) _ax = _dir;
                _ang = _need >= _ang ? _need : CM.MoveTowards(_ang, _need, S.Release * dt);
                _pushed = 0f;
                if (_ang > 0.01f)
                {
                    TurnArm(upper, first, _ang, _ax);
                    _pushed += _ang;
                    for (var pass = 0; pass < 2; pass++)
                    {
                        var r = SkinNeed(upper, first, false, elbowFirst, elbowForearm);
                        if (r.x <= 0.01f) break;
                        TurnArm(upper, first, r.x, r.yzw);
                        _pushed += r.x;
                    }
                    if (S.KeepHand != 0 && _forUpper && St.RestW >= 0.99f && lower >= 0 && handT >= 0) KeepHandAt(upper, lower, handT, first, wrist0);
                }
                St.PushMode = 0;
            }

            private void SkinClear(BodySkin.Part first, bool left, float dt)
            {
                var upper = U(first);
                if (upper < 0) return;
                var lower = Lo(first); var handT = H(first);
                var elbowFirst = S.ElbowFirst != 0 && St.RestW > 0.99f && lower >= 0 && handT >= 0;
                var wrist0 = handT >= 0 ? Pos(handT) : float3.zero;
                var elbowForearm = elbowFirst && S.ElbowForearm != 0;
                var st = left ? 0 : 10;
                if (S.TraceStages != 0 && lower >= 0) { TraceAngles(st, 0, upper, lower); for (var q = 3; q < 10; q++) OutF[OSwingTrace + st + q] = 0f; }
                var r0 = SkinNeed(upper, first, false, elbowFirst, elbowForearm); _need = r0.x; _dir = r0.yzw;
                var swung = 0f;
                if (S.SwingFirst != 0 && _need > 0f && lower >= 0 && St.RestW < 0.01f && Striding())
                {
                    var side = left ? -1f : 1f;
                    var rightAx = I.Right; rightAx.y = 0f; rightAx = CM.SqrMag(rightAx) > 1e-6f ? CM.Norm(rightAx) : new float3(1f, 0f, 0f);
                    var fwdAx = I.Forward; fwdAx.y = 0f; fwdAx = CM.SqrMag(fwdAx) > 1e-6f ? CM.Norm(fwdAx) : new float3(0f, 0f, 1f);
                    var ua = CM.Sub(Pos(lower), Pos(upper)); var h = new float3(ua.x, 0f, ua.z);
                    var across = -side * CM.Dot(h, rightAx);
                    var along = CM.Dot(h, fwdAx);
                    if (across > 0.005f && CM.Abs(along) > 0.01f)
                    {
                        var full = CM.SignedAngle(h, CM.Mul(fwdAx, CM.Sign(along)), new float3(0f, 1f, 0f));
                        var done = 0f;
                        for (var si = 0; si < 4; si++)
                        {
                            var share = si == 0 ? 0.25f : si == 1 ? 0.5f : si == 2 ? 0.75f : 1f;
                            TurnArm(upper, first, full * share - done, new float3(0f, 1f, 0f));
                            done = full * share;
                            var r = SkinNeed(upper, first, false, elbowFirst, elbowForearm); _need = r.x; _dir = r.yzw;
                            if (_need <= 0.01f) break;
                        }
                        swung = CM.Abs(done);
                    }
                }
                if (S.TraceStages != 0) { OutF[OSwingDeg + (left ? 0 : 1)] = swung; if (lower >= 0) OutF[OSwingTrace + st + 3] = CM.Angle(CM.Sub(Pos(lower), Pos(upper)), new float3(0f, -1f, 0f)); }
                _ang = left ? St.AngleL : St.AngleR; _ax = left ? St.AxisL : St.AxisR;
                _pushed = 0f; _forUpper = false;
                if (S.StrideEnd != 0 && _need > 0f && lower >= 0 && St.RestW < 0.01f && Striding())
                {
                    int from = Sk.Begin(first), to = Sk.End(first + 2);
                    Keep(upper, lower, from, to, 2);
                    var ang0 = _ang; var ax0 = _ax;
                    Push(1, upper, lower, handT, first, elbowFirst, elbowForearm, dt, wrist0);
                    Keep(upper, lower, from, to, 3);
                    var angN = _ang; var axN = _ax; var pushedN = _pushed; var nfN = St.NeedFirst; var fdN = St.FirstDepth; var fuN = _forUpper;
                    Swing(first);
                    var endN = CM.Angle(CM.Sub(Pos(lower), Pos(upper)), new float3(0f, -1f, 0f));
                    var inN = InDepth(upper, first);
                    Back(upper, lower, from, to, 2);
                    _ang = ang0; _ax = ax0;
                    Push(2, upper, lower, handT, first, elbowFirst, elbowForearm, dt, wrist0);
                    Keep(upper, lower, from, to, 4);
                    Swing(first);
                    var endO = CM.Angle(CM.Sub(Pos(lower), Pos(upper)), new float3(0f, -1f, 0f));
                    var inO = InDepth(upper, first);
                    if (CM.Abs(inN - inO) > 0.001f ? inN < inO : endN <= endO) { Back(upper, lower, from, to, 3); _ang = angN; _ax = axN; _pushed = pushedN; St.NeedFirst = nfN; St.FirstDepth = fdN; _forUpper = fuN; }
                    else Back(upper, lower, from, to, 4);
                    if (S.TraceStages != 0) OutF[OStrideEndDeg + (left ? 0 : 1)] = endO - endN;
                }
                else if (S.OutRetry != 0 && _need > 0f && lower >= 0 && St.RestW < 0.01f)
                {
                    int from = Sk.Begin(first), to = Sk.End(first + 2);
                    Keep(upper, lower, from, to, 2);
                    Push(0, upper, lower, handT, first, elbowFirst, elbowForearm, dt, wrist0);
                    var inN = InDepth(upper, first);
                    if (inN > S.OutRetryIn)
                    {
                        Keep(upper, lower, from, to, 3);
                        var angN = _ang; var axN = _ax; var pushedN = _pushed; var nfN = St.NeedFirst; var fdN = St.FirstDepth; var fuN = _forUpper;
                        Back(upper, lower, from, to, 2);
                        var o = Outward(left ? -1 : 1);
                        var sideAx = CM.Cross(CM.Sub(Pos(lower), Pos(upper)), o);
                        _pushed = 0f;
                        if (CM.SqrMag(sideAx) > 1e-8f)
                        {
                            _ax = CM.Norm(sideAx); _ang = _need;
                            TurnArm(upper, first, _ang, _ax);
                            _pushed += _ang;
                            for (var pass = 0; pass < 2; pass++)
                            {
                                var more = SkinNeed(upper, first, false, elbowFirst, elbowForearm).x;
                                if (more <= 0.01f) break;
                                var sa = CM.Cross(CM.Sub(Pos(lower), Pos(upper)), o);
                                if (CM.SqrMag(sa) < 1e-8f) break;
                                TurnArm(upper, first, more, sa);
                                _pushed += more;
                            }
                        }
                        var inO = InDepth(upper, first);
                        if (S.TraceStages != 0) OutF[OOutRetryCm + (left ? 0 : 1)] = (inN - inO) * 100f;
                        if (CM.SqrMag(sideAx) <= 1e-8f || inO + 0.001f >= inN) { Back(upper, lower, from, to, 3); _ang = angN; _ax = axN; _pushed = pushedN; St.NeedFirst = nfN; St.FirstDepth = fdN; _forUpper = fuN; }
                    }
                }
                else Push(0, upper, lower, handT, first, elbowFirst, elbowForearm, dt, wrist0);
                if (left) { St.AngleL = _ang; St.AxisL = _ax; } else { St.AngleR = _ang; St.AxisR = _ax; }
                if (S.TraceStages != 0 && lower >= 0)
                {
                    TraceAngles(st, 4, upper, lower);
                    OutF[OSwingTrace + st + 7] = St.PushFwd;
                }
                Stage(first, 1);
                if (S.TraceStages != 0)
                {
                    var k = left ? 0 : 1;
                    OutF[OPushDeg + k] = _pushed;
                    OutF[OPushDepth + k] = _need > 0f ? St.FirstDepth * 100f : 0f;
                    if (_pushed <= 0.01f || St.NeedFirst < 0) OutI[IPushPart + k] = -1;
                    else if (St.NeedFirst >= Sk.Begin(first + 2)) OutI[IPushPart + k] = 3;
                    else if (St.NeedFirst >= Sk.Begin(first + 1)) OutI[IPushPart + k] = 2;
                    else OutI[IPushPart + k] = lower >= 0 && CM.Mag(CM.Sub(Sk.P[St.NeedFirst], Pos(lower))) > CM.Mag(CM.Sub(Pos(lower), Pos(upper))) / 3f ? 0 : 1;
                }
                if (left) St.ElbowTurnedL = 0; else St.ElbowTurnedR = 0;
                Diag(left ? 5 : 11, _pushed);
                if (!elbowFirst) return;
                for (var ePass = 0; ePass < 2; ePass++)
                {
                    var rE = SkinNeedAbout(Pos(lower), Sk.Begin(elbowForearm ? first + 1 : first + 2), Sk.End(first + 2), first);
                    var nE = rE.x; var axE = rE.yzw;
                    if (nE <= 0.01f) break;
                    var eUa = CM.Norm(CM.Sub(Pos(lower), Pos(upper)));
                    var eFa0 = CM.Sub(Pos(handT), Pos(lower));
                    var eTurned = false;
                    var gh0 = elbowForearm ? HandGap(first) : 0f;
                    for (var si = 0; si < 3; si++)
                    {
                        var eShare = si == 0 ? 1f : si == 1 ? 0.5f : 0.25f;
                        var eFa = CM.Rotate(CM.AngleAxis(nE * eShare, axE), eFa0);
                        var eHang = CM.Angle(eFa, new float3(0f, -1f, 0f)); var eBend = CM.Angle(eUa, eFa);
                        if (eHang > S.HangMax + 3f && eHang > CM.Angle(eFa0, new float3(0f, -1f, 0f))) continue;
                        if (eBend > S.BendMax + 4f || eBend < S.BendFloor) continue;
                        TurnForearm(lower, first, nE * eShare, axE);
                        if (elbowForearm && gh0 > -0.5f)
                        {
                            var gh1 = HandGap(first);
                            if (gh1 <= -0.5f || gh1 > CM.Max(gh0, 0f) + S.ElbowHandGrow) { TurnForearm(lower, first, -nE * eShare, axE); continue; }
                        }
                        eTurned = true;
                        if (left) St.ElbowTurnedL = 1; else St.ElbowTurnedR = 1;
                        break;
                    }
                    if (!eTurned) break;
                }
                Stage(first, 2);
                var restDone = 0f;
                if (S.TraceStages != 0) { var k0 = left ? 0 : 1; OutI[IRestPart + k0] = -1; OutF[ORestDeg + k0] = 0f; OutF[ORestDepth + k0] = 0f; OutI[IRestBody + k0] = -1; OutF[ORestBodyY + k0] = 0f; }
                int rFrom = Sk.Begin(first), rTo = Sk.End(first + 2);
                var tryOut = S.RestOutRetry != 0 && lower >= 0;
                if (tryOut) Keep(upper, lower, rFrom, rTo, 2);
                restDone = RestPasses(false, upper, lower, first, left);
                if (tryOut)
                {
                    var remN = SkinNeed(upper, first).x;
                    if (remN > 0.01f)
                    {
                        Keep(upper, lower, rFrom, rTo, 3);
                        var doneN = restDone;
                        Back(upper, lower, rFrom, rTo, 2);
                        var doneO = RestPasses(true, upper, lower, first, left);
                        var remO = SkinNeed(upper, first).x;
                        if (S.TraceStages != 0) OutF[ORestOutDeg + (left ? 0 : 1)] = remN - remO;
                        if (remO + 0.01f >= remN) { Back(upper, lower, rFrom, rTo, 3); restDone = doneN; }
                        else restDone = doneO;
                    }
                }
                Diag(left ? 5 : 11, _pushed + restDone);
                if (S.TraceStages != 0) OutF[ORestDeg + (left ? 0 : 1)] = restDone;
                Stage(first, 3);
            }

            private float RestPasses(bool outSide, int upper, int lower, BodySkin.Part first, bool left)
            {
                var done = 0f;
                for (var rPass = 0; rPass < 3 && done < S.RestCap; rPass++)
                {
                    var r = SkinNeed(upper, first);
                    var rest = r.x; var dirR = r.yzw;
                    if (rest <= 0.01f) break;
                    if (outSide)
                    {
                        var sa = CM.Cross(CM.Sub(Pos(lower), Pos(upper)), Outward(left ? -1 : 1));
                        if (CM.SqrMag(sa) < 1e-8f) break;
                        dirR = CM.Norm(sa);
                    }
                    if (!outSide && S.TraceStages != 0 && rPass == 0 && St.NeedAt >= 0)
                    {
                        var k0 = left ? 0 : 1;
                        OutI[IRestPart + k0] = St.NeedAt >= Sk.Begin(first + 2) ? 3 : St.NeedAt >= Sk.Begin(first + 1) ? 2
                            : lower >= 0 && CM.Mag(CM.Sub(Sk.P[St.NeedAt], Pos(lower))) > CM.Mag(CM.Sub(Pos(lower), Pos(upper))) / 3f ? 0 : 1;
                        OutF[ORestDepth + k0] = St.NeedDepth * 100f;
                        var nb = Sk.Near;
                        if (nb >= 0) { var bp = Sk.PartOf(nb); OutI[IRestBody + k0] = bp == BodySkin.Part.Torso ? 0 : bp == BodySkin.Part.ThighL ? 1 : bp == BodySkin.Part.ThighR ? 2 : 3; OutF[ORestBodyY + k0] = (Sk.P[nb].y - I.Hips.y) * 100f; }
                    }
                    rest = CM.Min(rest, S.RestCap - done);
                    TurnArm(upper, first, rest, dirR);
                    done += rest;
                }
                return done;
            }

            private void KeepHandAt(int upper, int lower, int handT, BodySkin.Part first, float3 wrist0)
            {
                var E = Pos(lower); var cur = CM.Sub(Pos(handT), E); var want = CM.Sub(wrist0, E);
                if (CM.SqrMag(cur) < 1e-6f || CM.SqrMag(want) < 1e-6f) return;
                var ua = CM.Norm(CM.Sub(E, Pos(upper)));
                var fa = CM.Norm(want);
                var bend = CM.Angle(ua, fa);
                if (bend > S.BendMax + 4f) fa = CM.Norm(CM.RotateTowards(fa, ua, (bend - S.BendMax - 4f) * CM.Deg2Rad, 0f));
                if (CM.Angle(fa, new float3(0f, -1f, 0f)) > S.HangMax + 3f) fa = CM.Norm(CM.RotateTowards(new float3(0f, -1f, 0f), fa, (S.HangMax + 3f) * CM.Deg2Rad, 0f));
                CM.ToAngleAxis(CM.FromToRotation(cur, CM.Mul(fa, CM.Mag(cur))), out var aK, out var axK);
                if (aK > 0.01f && CM.SqrMag(axK) > 0.5f) TurnForearm(lower, first, aK, axK);
                if (SkinNeed(upper, first, true).x > 0.01f) TurnForearm(lower, first, -aK, axK);
            }

            private void MoveElbowClear(BodySkin.Part first)
            {
                var lower = Lo(first);
                if (lower < 0) return;
                for (var pass = 0; pass < 2; pass++)
                {
                    var r = SkinNeedAbout(Pos(lower), Sk.Begin(first + 1), Sk.End(first + 2), first);
                    if (r.x <= 0.01f) return;
                    TurnForearm(lower, first, CM.Min(r.x, S.MoveElbowMax), r.yzw);
                }
            }

            // ---------------------------------------------------------------- Swing, EaseOut
            private void Swing(BodySkin.Part first)
            {
                int upper = U(first), lower = Lo(first);
                if (upper < 0 || lower < 0) return;
                var dir = CM.Norm(CM.Sub(Pos(lower), Pos(upper)));
                var a = CM.Angle(dir, new float3(0f, -1f, 0f));
                if (a <= S.SwingSoft) return;
                var want = S.SwingSoft + (a - S.SwingSoft) * S.SwingKeep;
                var fwd = I.Forward; var right = I.Right;
                var sag = CM.Atan2(CM.Dot(dir, fwd), CM.Max(1e-4f, -dir.y)) * CM.Rad2Deg;
                var side = CM.Asin(CM.Clamp(CM.Abs(CM.Dot(dir, right)), 0f, 1f)) * CM.Rad2Deg;
                var keep = CM.Sqrt(CM.Max(0f, want * want - side * side));
                if (CM.Abs(sag) <= keep) return;
                var turn = sag - CM.Sign(sag) * keep;
                var left = first == BodySkin.Part.UpperArmL;
                Diag(left ? 16 : 17, turn);
                if (S.TraceStages != 0) OutF[OSwingTrace + (left ? 0 : 10) + 8] = turn;
                int from = Sk.Begin(first), to = Sk.End(first + 2);
                Keep(upper, lower, from, to, 0);
                var aFull = EaseOut(upper, lower, first, turn, right, left, out var pushed);
                if (pushed <= S.PushRetry) return;
                Keep(upper, lower, from, to, 1);
                Back(upper, lower, from, to, 0);
                var aHalf = EaseOut(upper, lower, first, turn * 0.5f, right, left, out _);
                if (aHalf >= aFull) Back(upper, lower, from, to, 1);
            }

            private float EaseOut(int upper, int lower, BodySkin.Part first, float turn, float3 right, bool left, out float pushed)
            {
                TurnArm(upper, first, turn, right);
                var elbow = Pos(lower);
                var best = 0f; var ax = float3.zero;
                Sk.DepthRange(Sk.Begin(first + 1), Sk.End(first + 2));
                for (int i = Sk.Begin(first + 1), to = Sk.End(first + 2); i < to; i++)
                {
                    var p = Sk.P[i];
                    if (!Sk.Got(i, out var d, out var n) || d + Margin3 <= 0f) continue;
                    var arm = CM.Sub(p, elbow);
                    if (CM.SqrMag(arm) < 0.0025f) continue;
                    var ang = CM.Atan2(d + Margin3, CM.Mag(arm)) * CM.Rad2Deg;
                    if (ang <= best) continue;
                    var c = CM.Cross(arm, n);
                    if (CM.SqrMag(c) < 1e-8f) continue;
                    best = ang; ax = CM.Norm(c);
                }
                if (best > 0.01f) TurnForearm(lower, first, CM.Min(best, 30f), ax);
                var r = SkinNeed(upper, first); var more = r.x; var dir2 = r.yzw;
                var outward = false;
                if (more > 0.01f)
                {
                    TurnArm(upper, first, more, dir2);
                    var aBack = CM.Angle(CM.Sub(Pos(lower), Pos(upper)), new float3(0f, -1f, 0f));
                    TurnArm(upper, first, -more, dir2);
                    var sideAx = CM.Cross(CM.Sub(Pos(lower), Pos(upper)), Outward(left ? -1 : 1));
                    TurnArm(upper, first, more, sideAx);
                    var r3 = SkinNeed(upper, first); var rest = r3.x; var dir3 = r3.yzw;
                    if (rest > 0.01f) TurnArm(upper, first, rest, dir3);
                    var aOut = CM.Angle(CM.Sub(Pos(lower), Pos(upper)), new float3(0f, -1f, 0f));
                    if (aOut + 0.5f < aBack) outward = true;
                    else
                    {
                        if (rest > 0.01f) TurnArm(upper, first, -rest, dir3);
                        TurnArm(upper, first, -more, sideAx);
                        TurnArm(upper, first, more, dir2);
                    }
                }
                Diag(left ? 18 : 19, (outward ? -more : more) + best * 0.001f);
                pushed = more;
                return CM.Angle(CM.Sub(Pos(lower), Pos(upper)), new float3(0f, -1f, 0f));
            }

            private void LateTrace()
            {
                if (S.TraceStages == 0) return;
                int lu = Bone(NLU), ll = Bone(NLL), ru = Bone(NRU), rl = Bone(NRL);
                if (lu >= 0 && ll >= 0) OutF[OSwingTrace + 9] = CM.Angle(CM.Sub(Pos(ll), Pos(lu)), new float3(0f, -1f, 0f));
                if (ru >= 0 && rl >= 0) OutF[OSwingTrace + 19] = CM.Angle(CM.Sub(Pos(rl), Pos(ru)), new float3(0f, -1f, 0f));
            }

            // ---------------------------------------------------------------- Stage (the gate's trace)
            private void Stage(BodySkin.Part first, int step)
            {
                if (S.TraceStages == 0) return;
                var l = first == BodySkin.Part.UpperArmL;
                int up = U(first), lo = Lo(first);
                if (up >= 0 && lo >= 0) OutF[OStageA1 + (l ? 0 : 7) + 1 + step] = CM.Angle(CM.Sub(Pos(lo), Pos(up)), new float3(0f, -1f, 0f));
                var deep = -1f;
                for (int i = Sk.Begin(first + 2), to = Sk.End(first + 2); i < to; i++)
                    if (Sk.Depth(Sk.P[i], out var d, out _)) deep = CM.Max(deep, d);
                OutF[OHandDepth + (l ? 0 : 6) + step] = deep;
                var deepF = -1f;
                for (int i = Sk.Begin(first + 1), to = Sk.End(first + 1); i < to; i++)
                    if (Sk.Depth(Sk.P[i], out var d, out _)) deepF = CM.Max(deepF, d);
                OutF[OForearmDepth + (l ? 0 : 6) + step] = deepF;
            }
        }
    }
}
