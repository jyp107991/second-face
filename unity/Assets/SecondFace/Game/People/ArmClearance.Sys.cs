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
            public Transform[] Parents;      // each rig bone's parent when the rig was made (a bone gone or moved: made again)
            // the torso's sections (no skin, or past the skin's range): TorsoProfile's arrays, made again when they change
            public NativeArray<float> Cx, Cz, Rx, Rz, WornRx, WornRz, ShapeRx, ShapeRz, ShapeW, ThighL, ThighR;
            public object[] ProfRefs;
            public int Shapes;
            public void Dispose()
            {
                DisposeProfile();
                if (State.IsCreated) State.Dispose(); if (In.IsCreated) In.Dispose(); if (Rig.IsCreated) Rig.Dispose();
                if (Named.IsCreated) Named.Dispose(); if (Ranges.IsCreated) Ranges.Dispose(); if (OutF.IsCreated) OutF.Dispose();
                if (OutI.IsCreated) OutI.Dispose(); if (PushAt.IsCreated) PushAt.Dispose(); if (KeptP.IsCreated) KeptP.Dispose();
                if (KeptN.IsCreated) KeptN.Dispose(); if (KeptRot.IsCreated) KeptRot.Dispose();
            }
            public void DisposeProfile()
            {
                foreach (var a in new[] { Cx, Cz, Rx, Rz, WornRx, WornRz, ShapeRx, ShapeRz, ShapeW, ThighL, ThighR }) if (a.IsCreated) a.Dispose();
                Cx = Cz = Rx = Rz = WornRx = WornRz = ShapeRx = ShapeRz = ShapeW = ThighL = ThighR = default;
                ProfRefs = null;
            }
        }
        private JobData _job, _jobP, _used;
        // this frame's way: the skin's (K) or the torso's sections' (KP), set by JobWhyNot
        private bool _sectionsNow;

        private void OnDestroy() { _job?.Dispose(); _job = null; _jobP?.Dispose(); _jobP = null; _used = null; }

        /// <summary>The job's steps by way since the start (tests): on the body's skin (StepJob), on the torso's sections (SectionsJob).</summary>
        public static long JobSkinSteps, JobSectionSteps;

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
            if (_lu == null || _ll == null || _lh == null || _ru == null || _rl == null || _rh == null) return "an arm bone missing";
            // (Step's own fork: the skin's way when the skin is ready and the camera near, the torso's sections otherwise)
            _sectionsNow = !(SkinReady && Near());
            if (_sectionsNow) return null;
            if (!RestReach) return "RestReach off";
            if (!UpperFirst) return "UpperFirst off";
            return null;
        }

        /// <summary>The rig and the arrays for this body (made again when the body's skin or bones change).</summary>
        private JobData Data()
        {
            var skin = _skin.Native();
            if (skin == null) return null;
            if (_job != null && _job.Skin == skin && _job.Root == transform && RigLive(_job)) return _job;
            _job?.Dispose();
            var d = new JobData { Skin = skin, Root = transform };
            BuildRig(d);
            d.Skel = _skin.Body.bones;
            var skelIdx = new Dictionary<Transform, int>();
            for (var i = 0; i < d.Skel.Length; i++) if (d.Skel[i] != null && !skelIdx.ContainsKey(d.Skel[i])) skelIdx[d.Skel[i]] = i;
            d.SkelOfRig = new int[d.Bones.Length];
            for (var i = 0; i < d.Bones.Length; i++)
            {
                d.SkelOfRig[i] = d.Bones[i] != null && skelIdx.TryGetValue(d.Bones[i], out var s) ? s : -1;
                var r = d.Rig[i]; r.Skel = r.Parent < 0 ? -1 : d.SkelOfRig[i]; d.Rig[i] = r;
            }
            var arm = 0;
            foreach (var p in new[] { BodySkin.Part.UpperArmL, BodySkin.Part.UpperArmR })
                arm = Mathf.Max(arm, skin.Start[(int)p + 3] - skin.Start[(int)p]);
            d.SlotLen = Mathf.Max(1, arm);
            d.KeptP = new NativeArray<float3>(5 * d.SlotLen, Allocator.Persistent); d.KeptN = new NativeArray<float3>(5 * d.SlotLen, Allocator.Persistent);
            d.KeptRot = new NativeArray<float4>(10, Allocator.Persistent);
            _job = d;
            return d;
        }

        /// <summary>The rig and the arrays for this body's torso sections' step (no skin, or past the skin's range).</summary>
        private JobData DataP()
        {
            if (_profile == null) return null;
            if (_jobP == null || _jobP.Root != transform || !RigLive(_jobP))
            {
                _jobP?.Dispose();
                _jobP = new JobData { Root = transform };
                BuildRig(_jobP);
                for (var i = 0; i < _jobP.Bones.Length; i++) { var r = _jobP.Rig[i]; r.Skel = -1; _jobP.Rig[i] = r; }
                _jobP.KeptP = new NativeArray<float3>(1, Allocator.Persistent); _jobP.KeptN = new NativeArray<float3>(1, Allocator.Persistent);
                _jobP.KeptRot = new NativeArray<float4>(1, Allocator.Persistent);
            }
            ProfileArrays(_jobP);
            return _jobP;
        }

        /// <summary>Whether the rig made for this body still stands: every bone there and under the parent it had.</summary>
        private static bool RigLive(JobData d)
        {
            if (d.Bones == null || d.Parents == null) return false;
            for (var i = 0; i < d.Bones.Length; i++)
                if (d.Bones[i] == null || d.Bones[i].parent != d.Parents[i]) return false;
            return true;
        }

        /// <summary>TorsoProfile's arrays for the job (copied again when the profile's own arrays change), and the shapes'
        /// weights now (each frame).</summary>
        private void ProfileArrays(JobData d)
        {
            var pr = _profile;
            // (checked against what was copied without making anything: this runs every frame for each such person)
            bool Same()
            {
                var r = d.ProfRefs;
                if (r == null || r.Length != 9 + 2 * pr.Shapes.Count) return false;
                if (!ReferenceEquals(r[0], pr) || !ReferenceEquals(r[1], pr.Cx) || !ReferenceEquals(r[2], pr.Cz) || !ReferenceEquals(r[3], pr.Rx) || !ReferenceEquals(r[4], pr.Rz)
                    || !ReferenceEquals(r[5], pr.WornRx) || !ReferenceEquals(r[6], pr.WornRz) || !ReferenceEquals(r[7], pr.ThighL) || !ReferenceEquals(r[8], pr.ThighR)) return false;
                for (var s = 0; s < pr.Shapes.Count; s++) if (!ReferenceEquals(r[9 + 2 * s], pr.Shapes[s].Rx) || !ReferenceEquals(r[10 + 2 * s], pr.Shapes[s].Rz)) return false;
                return true;
            }
            if (!Same())
            {
                var list = new List<object> { pr, pr.Cx, pr.Cz, pr.Rx, pr.Rz, pr.WornRx, pr.WornRz, pr.ThighL, pr.ThighR };
                foreach (var sh in pr.Shapes) { list.Add(sh.Rx); list.Add(sh.Rz); }
                var refs = list.ToArray();
                d.DisposeProfile();
                var bins = pr.Bins;
                NativeArray<float> A(float[] a, int n) { var x = new NativeArray<float>(Mathf.Max(1, n), Allocator.Persistent); if (a != null) for (var i = 0; i < n && i < a.Length; i++) x[i] = a[i]; return x; }
                d.Cx = A(pr.Cx, bins); d.Cz = A(pr.Cz, bins); d.Rx = A(pr.Rx, bins); d.Rz = A(pr.Rz, bins);
                d.WornRx = A(pr.WornRx, pr.WornRx != null ? bins : 0); d.WornRz = A(pr.WornRz, pr.WornRz != null ? bins : 0);
                d.ThighL = A(pr.ThighL, pr.ThighL?.Length ?? 0); d.ThighR = A(pr.ThighR, pr.ThighR?.Length ?? 0);
                d.Shapes = pr.Shapes.Count;
                d.ShapeRx = new NativeArray<float>(Mathf.Max(1, d.Shapes * bins), Allocator.Persistent);
                d.ShapeRz = new NativeArray<float>(Mathf.Max(1, d.Shapes * bins), Allocator.Persistent);
                for (var s = 0; s < d.Shapes; s++)
                    for (var i = 0; i < bins; i++)
                    {
                        // (a shape's widths shorter than the sections: Sample would read past them; the job reads 0, never past)
                        d.ShapeRx[s * bins + i] = pr.Shapes[s].Rx != null && i < pr.Shapes[s].Rx.Length ? pr.Shapes[s].Rx[i] : 0f;
                        d.ShapeRz[s * bins + i] = pr.Shapes[s].Rz != null && i < pr.Shapes[s].Rz.Length ? pr.Shapes[s].Rz[i] : 0f;
                    }
                d.ShapeW = new NativeArray<float>(Mathf.Max(1, d.Shapes), Allocator.Persistent);
                d.ProfRefs = refs;
            }
            for (var s = 0; s < d.Shapes; s++) d.ShapeW[s] = pr.ShapeWeight(s);
        }

        /// <summary>The rig: each upper arm's parent (read, never turned), then the upper arm and everything under it.</summary>
        private void BuildRig(JobData d)
        {
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
            d.Parents = new Transform[d.Bones.Length];
            for (var i = 0; i < d.Bones.Length; i++) d.Parents[i] = d.Bones[i].parent;
            d.Rig = new NativeArray<RigBone>(d.Bones.Length, Allocator.Persistent);
            for (var i = 0; i < d.Bones.Length; i++) d.Rig[i] = new RigBone { Parent = parents[i], Skel = -1 };
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
        }

        private static readonly int[] ArmBones = { NLU, NLL, NLH, NRU, NRL, NRH };
        private static float3 F(Vector3 v) => new(v.x, v.y, v.z);
        private static float4 Q(Quaternion q) => new(q.x, q.y, q.z, q.w);

        /// <summary>Gathers this person's frame for the job and returns the job (the system schedules it).</summary>
        internal bool Prepare(out JobHandle handle)
        {
            handle = default;
            if (_sectionsNow)
            {
                var dp = DataP();
                if (dp == null) return false;
                _takenFrame = Time.frameCount;
                FallbackWhy = null;
                _used = dp;
                Gather(dp);
                dp.State[0] = ToState();
                for (var i = 0; i < OFloats; i++) dp.OutF[i] = 0f;
                CopyOutputsIn(dp);
                JobSectionSteps++;
                var pr = _profile;
                handle = new SectionsJob
                {
                    Kernel = new KP
                    {
                        S = SettingsNow(), StateIO = dp.State, In = dp.In, Rig = dp.Rig, Named = dp.Named, Ranges = dp.Ranges, OutF = dp.OutF,
                        Cx = dp.Cx, Cz = dp.Cz, Rx = dp.Rx, Rz = dp.Rz, WornRx = dp.WornRx, WornRz = dp.WornRz, ShapeRx = dp.ShapeRx, ShapeRz = dp.ShapeRz,
                        ShapeW = dp.ShapeW, ThighL = dp.ThighL, ThighR = dp.ThighR,
                        Bins = pr.Bins, HasWorn = pr.WornRx != null ? 1 : 0, Shapes = dp.Shapes,
                        ThighLLen = pr.ThighL?.Length ?? 0, ThighRLen = pr.ThighR?.Length ?? 0, HasThighL = pr.ThighL != null ? 1 : 0, HasThighR = pr.ThighR != null ? 1 : 0,
                        HasProfile = 1, Bottom = pr.Bottom, Step_ = pr.Step, Fork = pr.Fork, HipsRest = Q(pr.HipsRest),
                    },
                }.Schedule();
                return true;
            }
            if (!PrepareSkin(out var job)) return false;
            JobSkinSteps++;
            handle = job.Schedule();
            return true;
        }

        /// <summary>The frame's inputs (what Striding, Resting, Flank and the sections read) and the rig's bones as they stand.</summary>
        private void Gather(JobData d)
        {
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
                Dt = Time.deltaTime, UnscaledDt = Time.unscaledDeltaTime, ScaleY = Mathf.Max(0.01f, transform.lossyScale.y), LossyY = transform.lossyScale.y,
                HipsRot = _hips != null ? Q(_hips.rotation) : new float4(0f, 0f, 0f, 1f),
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
            for (var i = 0; i < d.Bones.Length; i++)
            {
                var t = d.Bones[i];
                var r = d.Rig[i];
                r.LP = F(t.localPosition); r.LR = Q(t.localRotation); r.LS = F(t.localScale);
                r.WP = F(t.position); r.WR = Q(t.rotation); r.WM = t.localToWorldMatrix;
                d.Rig[i] = r;
            }
        }

        private bool PrepareSkin(out StepJob job)
        {
            job = default;
            var d = Data();
            if (d == null) return false;
            _takenFrame = Time.frameCount;
            FallbackWhy = null;
            _used = d;
            // (the person's own flex and forward, from their name, as RestArm makes them)
            if (float.IsNaN(_flexVar))
            {
                var h = 17u;
                foreach (var ch in transform.root.name) h = h * 31u + ch;
                _flexVar = ((h % 1000u) / 999f - 0.5f) * 8f;
                _frontVar = (((h / 1000u) % 1000u) / 999f - 0.5f) * 16f;
            }
            // the animator's and the foot plant's answers, as Striding and Resting ask them, and the bones as they stand now
            Gather(d);
            d.State[0] = ToState();
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
            var d = _used;
            _used = null;
            if (d == null) return;
            foreach (var n in ArmBones)
            {
                var i = d.Named[n];
                if (i < 0) continue;
                var r = d.Rig[i];
                d.Bones[i].localRotation = new Quaternion(r.LR.x, r.LR.y, r.LR.z, r.LR.w);
            }
            FromState(d.State[0]);
            CopyOutputsOut(d);
            if (d.Skin != null) _skin.FromNative(d.Skin);
            // (the flank's weights: none when the neck or hips are missing, as Flank sets none then)
            float wl = d.OutF[OFlank], wr = d.OutF[OFlank + 1];
            if (wl < 0f) return;
            if (_skin != null) { _skin.FlankL = wl; _skin.FlankR = wr; }
            FlankShapes(wl, wr);
        }

        private Settings SettingsNow() => new()
        {
            RestGap = RestGap, RestMax = RestMax, RestRate = RestRate, Margin = Margin,
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
            RestL = _restL, RestR = _restR, RestAxisL = F(_restAxisL), RestAxisR = F(_restAxisR),
        };

        private void FromState(State s)
        {
            _clock = s.Clock; _movedAt = s.MovedAt; _restW = s.RestW; _flexVar = s.FlexVar; _frontVar = s.FrontVar; _adaptL = s.AdaptL; _adaptR = s.AdaptR;
            _wantGapL = s.WantGapL; _wantGapR = s.WantGapR; _frontL = s.FrontL; _frontR = s.FrontR; _abdL = s.AbdL; _abdR = s.AbdR; _backL = s.BackL; _backR = s.BackR;
            _poleOutL = s.PoleOutL; _poleOutR = s.PoleOutR; _flexAddL = s.FlexAddL; _flexAddR = s.FlexAddR; _palmL = s.PalmL; _palmR = s.PalmR;
            _angleL = s.AngleL; _angleR = s.AngleR; _axisL = (Vector3)s.AxisL; _axisR = (Vector3)s.AxisR; _needDepth = s.NeedDepth; _firstDepth = s.FirstDepth; _pushFwd = s.PushFwd;
            _carryL = s.CarryL; _carryR = s.CarryR; _elbowTurnedL = s.ElbowTurnedL != 0; _elbowTurnedR = s.ElbowTurnedR != 0; _gapArm = s.GapArm; _gapBody = s.GapBody;
            _needAt = s.NeedAt; _needFirst = s.NeedFirst; _pushMode = s.PushMode; DiagResting = s.DiagResting != 0;
            _restL = s.RestL; _restR = s.RestR; _restAxisL = (Vector3)s.RestAxisL; _restAxisR = (Vector3)s.RestAxisR;
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
