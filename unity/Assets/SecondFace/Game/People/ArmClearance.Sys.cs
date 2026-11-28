using System.Collections.Generic;
using Unity.Collections;
using Unity.Jobs;
using Unity.Mathematics;
using UnityEngine;

namespace SecondFace.Game.People
{
    // ArmClearance's side of the job (ArmClearance.Job.cs): whether the job takes this person this frame, the arrays it carries
    // (made once a body), the frame's gather (the animator's, the camera's and the bones' values a job cannot read), and after
    // the job the bones' turns and every report back on this component, so the managed step and the job hand over frame to frame.
    public sealed partial class ArmClearance
    {
        private int _takenFrame = -1;
        /// <summary>The job took this person's step this frame (the managed LateUpdate stands aside).</summary>
        internal bool Taken => _takenFrame == Time.frameCount;

        private sealed class JobData : System.IDisposable
        {
            public NativeArray<State> State;
            public NativeArray<Inputs> In;
            public NativeArray<RigBone> Rig;
            public NativeArray<int> Named, Ranges;
            public NativeArray<float> OutF;
            public NativeArray<int> OutI;
            public NativeArray<float3> PushAt, KeptP, KeptN;
            public NativeArray<float4> KeptRot;
            public int SlotLen;
            public Transform[] Bones;        // the rig's transforms (the upper arms' parents, then each side's subtree)
            public int[] SkelOfRig;          // each rig bone's index among the body renderer's bones (-1: none)
            public Transform[] Skel;         // the body renderer's bones
            public BodySkin.SkinNative Skin;
            public Transform Root;
            public void Dispose()
            {
                if (State.IsCreated) State.Dispose(); if (In.IsCreated) In.Dispose(); if (Rig.IsCreated) Rig.Dispose();
                if (Named.IsCreated) Named.Dispose(); if (Ranges.IsCreated) Ranges.Dispose(); if (OutF.IsCreated) OutF.Dispose();
                if (OutI.IsCreated) OutI.Dispose(); if (PushAt.IsCreated) PushAt.Dispose(); if (KeptP.IsCreated) KeptP.Dispose();
                if (KeptN.IsCreated) KeptN.Dispose(); if (KeptRot.IsCreated) KeptRot.Dispose();
            }
        }
        private JobData _job;

        private void OnDestroy() { _job?.Dispose(); _job = null; }

        /// <summary>This person's step by the managed step, not the job (tests: the twin the job is checked against).</summary>
        [System.NonSerialized] public bool ForceManaged;

        /// <summary>A frame this person's step fell back to the managed one, and why (counted; tests assert none).</summary>
        internal void NoteFallback(string why)
        {
            FallbackWhy = why;
            Fallbacks[why] = Fallbacks.TryGetValue(why, out var n) ? n + 1 : 1;
        }

        /// <summary>Why the job cannot take this person now (null: it can).</summary>
        internal string JobWhyNot()
        {
            if (ManagedStep || ForceManaged) return "the managed step asked for (tests)";
            if (!Ready) return "not ready (no skin and no torso profile, or no hips or upper arms)";
            if (!SkinReady) return "no body skin (the torso's sections)";
            if (!RestReach) return "RestReach off";
            if (!UpperFirst) return "UpperFirst off";
            if (!Near()) return "past the skin's range of the camera";
            if (_lu == null || _ll == null || _lh == null || _ru == null || _rl == null || _rh == null) return "an arm bone missing";
            return null;
        }

        /// <summary>The rig and the arrays for this body (made again when the body's skin or bones change).</summary>
        private JobData Data()
        {
            var skin = _skin.Native();
            if (skin == null) return null;
            if (_job != null && _job.Skin == skin && _job.Root == transform) return _job;
            _job?.Dispose();
            var d = new JobData { Skin = skin, Root = transform };
            var bones = new List<Transform>(); var parents = new List<int>();
            var ranges = new int[4];
            foreach (var (u, k) in new[] { (_lu, 0), (_ru, 2) })
            {
                bones.Add(u.parent); parents.Add(-1);   // (the shoulder: read, never turned)
                ranges[k] = bones.Count;
                void Add(Transform t, int parent)
                {
                    var me = bones.Count; bones.Add(t); parents.Add(parent);
                    for (var c = 0; c < t.childCount; c++) Add(t.GetChild(c), me);
                }
                Add(u, bones.Count - 1);
                ranges[k + 1] = bones.Count;
            }
            d.Bones = bones.ToArray();
            d.Skel = _skin.Body.bones;
            var skelIdx = new Dictionary<Transform, int>();
            for (var i = 0; i < d.Skel.Length; i++) if (d.Skel[i] != null && !skelIdx.ContainsKey(d.Skel[i])) skelIdx[d.Skel[i]] = i;
            d.SkelOfRig = new int[d.Bones.Length];
            d.Rig = new NativeArray<RigBone>(d.Bones.Length, Allocator.Persistent);
            for (var i = 0; i < d.Bones.Length; i++)
            {
                d.SkelOfRig[i] = d.Bones[i] != null && skelIdx.TryGetValue(d.Bones[i], out var s) ? s : -1;
                d.Rig[i] = new RigBone { Parent = parents[i], Skel = parents[i] < 0 ? -1 : d.SkelOfRig[i] };
            }
            d.Ranges = new NativeArray<int>(ranges, Allocator.Persistent);
            var named = new int[NCount];
            int Of(Transform t) => t == null ? -1 : System.Array.IndexOf(d.Bones, t, 1);
            named[NLU] = Of(_lu); named[NLL] = Of(_ll); named[NLH] = Of(_lh); named[NRU] = Of(_ru); named[NRL] = Of(_rl); named[NRH] = Of(_rh);
            named[NLIdx] = Of(_animator.GetBoneTransform(HumanBodyBones.LeftIndexProximal)); named[NLMid] = Of(_animator.GetBoneTransform(HumanBodyBones.LeftMiddleProximal));
            named[NLLit] = Of(_animator.GetBoneTransform(HumanBodyBones.LeftLittleProximal)); named[NLMidD] = Of(_animator.GetBoneTransform(HumanBodyBones.LeftMiddleDistal));
            named[NRIdx] = Of(_animator.GetBoneTransform(HumanBodyBones.RightIndexProximal)); named[NRMid] = Of(_animator.GetBoneTransform(HumanBodyBones.RightMiddleProximal));
            named[NRLit] = Of(_animator.GetBoneTransform(HumanBodyBones.RightLittleProximal)); named[NRMidD] = Of(_animator.GetBoneTransform(HumanBodyBones.RightMiddleDistal));
            d.Named = new NativeArray<int>(named, Allocator.Persistent);
            d.State = new NativeArray<State>(1, Allocator.Persistent);
            d.In = new NativeArray<Inputs>(1, Allocator.Persistent);
            d.OutF = new NativeArray<float>(OFloats, Allocator.Persistent);
            d.OutI = new NativeArray<int>(IInts + 1, Allocator.Persistent);
            d.PushAt = new NativeArray<float3>(2, Allocator.Persistent);
            var arm = 0;
            foreach (var p in new[] { BodySkin.Part.UpperArmL, BodySkin.Part.UpperArmR })
                arm = Mathf.Max(arm, _skin.Native().Start[(int)p + 3] - _skin.Native().Start[(int)p]);
            d.SlotLen = Mathf.Max(1, arm);
            d.KeptP = new NativeArray<float3>(5 * d.SlotLen, Allocator.Persistent); d.KeptN = new NativeArray<float3>(5 * d.SlotLen, Allocator.Persistent);
            d.KeptRot = new NativeArray<float4>(10, Allocator.Persistent);
            _job = d;
            return d;
        }

        private static float3 F(Vector3 v) => new(v.x, v.y, v.z);
        private static float4 Q(Quaternion q) => new(q.x, q.y, q.z, q.w);

        /// <summary>Gathers this person's frame for the job and returns the job (the system schedules it).</summary>
        internal bool Prepare(out StepJob job)
        {
            job = default;
            var d = Data();
            if (d == null) return false;
            _takenFrame = Time.frameCount;
            FallbackWhy = null;
            // (the person's own flex and forward, from their name, as RestArm makes them)
            if (float.IsNaN(_flexVar))
            {
                var h = 17u;
                foreach (var ch in transform.root.name) h = h * 31u + ch;
                _flexVar = ((h % 1000u) / 999f - 0.5f) * 8f;
                _frontVar = (((h / 1000u) % 1000u) / 999f - 0.5f) * 16f;
            }
            // the animator's and the foot plant's answers, as Striding and Resting ask them
            if (_gestureLayer == -2 && _animator.runtimeAnimatorController != null)
            {
                _gestureLayer = _animator.GetLayerIndex(Ambient.GestureLayer);
                _hasSpeed = false;
                foreach (var p in _animator.parameters) if (p.nameHash == SpeedId) _hasSpeed = true;
            }
            var state0 = _animator.runtimeAnimatorController != null ? _animator.GetCurrentAnimatorStateInfo(0) : default;
            var cam = Camera.main;
            var neck = _animator.GetBoneTransform(HumanBodyBones.Neck);
            var hipsB = _animator.GetBoneTransform(HumanBodyBones.Hips);
            d.In[0] = new Inputs
            {
                Dt = Time.deltaTime, UnscaledDt = Time.unscaledDeltaTime, ScaleY = Mathf.Max(0.01f, transform.lossyScale.y),
                Forward = F(transform.forward), Right = F(transform.right), Cam = cam != null ? F(cam.transform.position) : float3.zero, HasCam = cam != null ? 1 : 0,
                Hips = hipsB != null ? F(hipsB.position) : float3.zero, Neck = neck != null ? F(neck.position) : float3.zero, HasNeck = neck != null && hipsB != null ? 1 : 0,
                TL = _tl != null ? F(_tl.position) : float3.zero, KL = _kl != null ? F(_kl.position) : float3.zero, HasLegsL = _tl != null && _kl != null ? 1 : 0,
                TR = _tr != null ? F(_tr.position) : float3.zero, KR = _kr != null ? F(_kr.position) : float3.zero, HasLegsR = _tr != null && _kr != null ? 1 : 0,
                Holding = Holding ? 1 : 0,
                Gesture = _gestureLayer >= 0 && _animator.GetLayerWeight(_gestureLayer) > 0.05f ? 1 : 0,
                Moving = _hasSpeed && _animator.GetFloat(SpeedId) > 0.1f ? 1 : 0,
                Halted = _plant != null && _plant.Halted ? 1 : 0,
                NoController = _animator.runtimeAnimatorController == null ? 1 : 0,
                SitOrPick = state0.IsTag("sit") || state0.IsName("pickup") || state0.IsName("sneak") ? 1 : 0,
            };
            d.State[0] = ToState();
            // the bones: each rig bone's local and world values as they stand now
            for (var i = 0; i < d.Bones.Length; i++)
            {
                var t = d.Bones[i];
                var r = d.Rig[i];
                r.LP = F(t.localPosition); r.LR = Q(t.localRotation); r.LS = F(t.localScale);
                r.WP = F(t.position); r.WR = Q(t.rotation); r.WM = t.localToWorldMatrix;
                d.Rig[i] = r;
            }
            var k = d.Skin;
            for (var b = 0; b < d.Skel.Length; b++) k.M[b] = d.Skel[b] != null ? (float4x4)d.Skel[b].localToWorldMatrix : float4x4.identity;
            _skin.ToNative(k);
            var sk = _skin.Kernel(k);
            for (var i = 0; i < OFloats; i++) d.OutF[i] = 0f;
            CopyOutputsIn(d);
            job = new StepJob
            {
                Kernel = new K
                {
                    S = SettingsNow(), StateIO = d.State, In = d.In, Sk = sk, Rig = d.Rig, Named = d.Named, Ranges = d.Ranges,
                    OutF = d.OutF, OutI = d.OutI, OutPushAt = d.PushAt, KeptP = d.KeptP, KeptN = d.KeptN, KeptRot = d.KeptRot, SlotLen = d.SlotLen,
                },
            };
            return true;
        }

        /// <summary>After the job: the arm bones' turns set, the reports and the state back on this component, the skin back on its
        /// managed side, the flank correctives' weights on the renderers.</summary>
        internal void Finish()
        {
            var d = _job;
            if (d == null) return;
            foreach (var n in new[] { NLU, NLL, NLH, NRU, NRL, NRH })
            {
                var i = d.Named[n];
                if (i < 0) continue;
                var r = d.Rig[i];
                d.Bones[i].localRotation = new Quaternion(r.LR.x, r.LR.y, r.LR.z, r.LR.w);
            }
            FromState(d.State[0]);
            CopyOutputsOut(d);
            _skin.FromNative(d.Skin);
            FlankShapes(d.OutF[OFlank], d.OutF[OFlank + 1]);
        }

        private Settings SettingsNow() => new()
        {
            SkinMargin = SkinMargin, MoveMargin = MoveMargin, RestGive = RestGive, SkinGap = SkinGap, SkinRange = SkinRange, Release = Release,
            FlankFull = FlankFull, FlankNone = FlankNone, SwingFull = SwingFull, SwingNone = SwingNone, RestFlex = RestFlex, RestFront = RestFront,
            RestIn = RestIn, RestOut2 = RestOut2, RestReachMax = RestReachMax, AbdMin = AbdMin, AbdMax = AbdMax, AbdStart = AbdStart, AbdRate = AbdRate,
            UpperForward = UpperForward, BackMax = BackMax, BackRate = BackRate, BendMin = BendMin, BendMax = BendMax, HandHang = HandHang, HandTaper = HandTaper,
            SetMax = SetMax, HandInMax = HandInMax, HandInGap = HandInGap, BendFloor = BendFloor, HangMax = HangMax, PoleOut = PoleOut, FlexMore = FlexMore,
            ElbowRest = ElbowRest, UpperAim = UpperAim, PoleIn = PoleIn, UpperMax = UpperMax, RestFrontMax = RestFrontMax, FrontRate = FrontRate,
            ClothGive = ClothGive, SleeveGive = SleeveGive, UpperGive = UpperGive, SwingSoft = SwingSoft, SwingKeep = SwingKeep, PushRetry = PushRetry,
            OutRetryIn = OutRetryIn, PalmMax = PalmMax, PalmRate = PalmRate, MoveElbowMax = MoveElbowMax, ElbowHandGrow = ElbowHandGrow,
            ElbowMargin = ElbowMargin, RestCap = RestCap,
            SwingFirst = SwingFirst ? 1 : 0, StrideEnd = StrideEnd ? 1 : 0, OutRetry = OutRetry ? 1 : 0, RestOutRetry = RestOutRetry ? 1 : 0,
            KeepHand = KeepHand ? 1 : 0, ElbowFirst = ElbowFirst ? 1 : 0, ElbowForearm = ElbowForearm ? 1 : 0, TraceStages = TraceStages ? 1 : 0,
        };

        private State ToState() => new()
        {
            Clock = _clock, MovedAt = _movedAt, RestW = _restW, FlexVar = _flexVar, FrontVar = _frontVar, AdaptL = _adaptL, AdaptR = _adaptR,
            WantGapL = _wantGapL, WantGapR = _wantGapR, FrontL = _frontL, FrontR = _frontR, AbdL = _abdL, AbdR = _abdR, BackL = _backL, BackR = _backR,
            PoleOutL = _poleOutL, PoleOutR = _poleOutR, FlexAddL = _flexAddL, FlexAddR = _flexAddR, PalmL = _palmL, PalmR = _palmR,
            AngleL = _angleL, AngleR = _angleR, AxisL = F(_axisL), AxisR = F(_axisR), NeedDepth = _needDepth, FirstDepth = _firstDepth, PushFwd = _pushFwd,
            CarryL = _carryL, CarryR = _carryR, ElbowTurnedL = _elbowTurnedL ? 1 : 0, ElbowTurnedR = _elbowTurnedR ? 1 : 0, GapArm = _gapArm, GapBody = _gapBody,
            NeedAt = _needAt, NeedFirst = _needFirst, PushMode = _pushMode, DiagResting = DiagResting ? 1 : 0,
        };

        private void FromState(State s)
        {
            _clock = s.Clock; _movedAt = s.MovedAt; _restW = s.RestW; _flexVar = s.FlexVar; _frontVar = s.FrontVar; _adaptL = s.AdaptL; _adaptR = s.AdaptR;
            _wantGapL = s.WantGapL; _wantGapR = s.WantGapR; _frontL = s.FrontL; _frontR = s.FrontR; _abdL = s.AbdL; _abdR = s.AbdR; _backL = s.BackL; _backR = s.BackR;
            _poleOutL = s.PoleOutL; _poleOutR = s.PoleOutR; _flexAddL = s.FlexAddL; _flexAddR = s.FlexAddR; _palmL = s.PalmL; _palmR = s.PalmR;
            _angleL = s.AngleL; _angleR = s.AngleR; _axisL = (Vector3)s.AxisL; _axisR = (Vector3)s.AxisR; _needDepth = s.NeedDepth; _firstDepth = s.FirstDepth; _pushFwd = s.PushFwd;
            _carryL = s.CarryL; _carryR = s.CarryR; _elbowTurnedL = s.ElbowTurnedL != 0; _elbowTurnedR = s.ElbowTurnedR != 0; _gapArm = s.GapArm; _gapBody = s.GapBody;
            _needAt = s.NeedAt; _needFirst = s.NeedFirst; _pushMode = s.PushMode; DiagResting = s.DiagResting != 0;
        }

        // the reports and traces: what the job does not write this frame stays as it was (as the managed step leaves it)
        private void CopyOutputsIn(JobData d)
        {
            void F1(float[] a, int at) { for (var i = 0; i < a.Length; i++) d.OutF[at + i] = a[i]; }
            F1(Diag, ODiag); F1(HandDepth, OHandDepth); F1(ForearmDepth, OForearmDepth); F1(StageA1, OStageA1); F1(Hold, OHold); F1(HoldFlank, OHoldFlank);
            F1(PushDeg, OPushDeg); F1(RestDepth, ORestDepth); F1(RestBodyY, ORestBodyY); F1(RestDeg, ORestDeg); F1(PushDepth, OPushDepth); F1(SwingDeg, OSwingDeg);
            F1(SwingTrace, OSwingTrace); F1(RestOutDeg, ORestOutDeg); F1(OutRetryCm, OOutRetryCm); F1(StrideEndDeg, OStrideEndDeg);
            for (var i = 0; i < 8; i++) d.OutI[IDiagAt + i] = DiagAt[i];
            for (var i = 0; i < 2; i++) { d.OutI[IPushPart + i] = PushPart[i]; d.OutI[IRestPart + i] = RestPart[i]; d.OutI[IRestBody + i] = RestBody[i]; d.PushAt[i] = F(PushAt[i]); }
        }
        private void CopyOutputsOut(JobData d)
        {
            void F1(float[] a, int at) { for (var i = 0; i < a.Length; i++) a[i] = d.OutF[at + i]; }
            F1(Diag, ODiag); F1(HandDepth, OHandDepth); F1(ForearmDepth, OForearmDepth); F1(StageA1, OStageA1); F1(Hold, OHold); F1(HoldFlank, OHoldFlank);
            F1(PushDeg, OPushDeg); F1(RestDepth, ORestDepth); F1(RestBodyY, ORestBodyY); F1(RestDeg, ORestDeg); F1(PushDepth, OPushDepth); F1(SwingDeg, OSwingDeg);
            F1(SwingTrace, OSwingTrace); F1(RestOutDeg, ORestOutDeg); F1(OutRetryCm, OOutRetryCm); F1(StrideEndDeg, OStrideEndDeg);
            for (var i = 0; i < 8; i++) DiagAt[i] = d.OutI[IDiagAt + i];
            for (var i = 0; i < 2; i++) { PushPart[i] = d.OutI[IPushPart + i]; RestPart[i] = d.OutI[IRestPart + i]; RestBody[i] = d.OutI[IRestBody + i]; PushAt[i] = (Vector3)d.PushAt[i]; }
        }
    }
}
