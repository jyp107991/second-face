using Unity.Collections;
using Unity.Mathematics;
using UnityEngine;

namespace SecondFace.Game.People
{
    // The body's skin for the arm clearance's job (ArmClearance.Job.cs): every array the step reads and writes as a NativeArray
    // (SkinNative, one block a person, made once and kept), and the skin's own reckonings (pose, turn, the batched depth and its
    // drawn-body reading, one point's depth) as the managed methods of this class do them, statement for statement, in SkinK, a
    // struct the job carries. The managed methods stay as they are: the reference the job is checked against (ArmClearance
    // .ManagedStep), and the reckoning every probe and test that asks the skin directly gets.
    public sealed partial class BodySkin
    {
        /// <summary>The skin's arrays for the job (null until <see cref="Native"/> makes them).</summary>
        internal sealed class SkinNative : System.IDisposable
        {
            public object Of; public int N, Body, BoneCount;
            public NativeArray<float3> P0, P1, N0, N1, XP, XNo, XD, D0, D1, P, Nn, Q, QNoj, QN, AskedAt;
            public NativeArray<float> W, W1, XW, Off, Spacing, QDj, QD;
            public NativeArray<byte> B0, B1, XN, XB, Flank, Flags;
            public NativeArray<int> Start, UsedBones, Head, Next, QNearj, QNear, AskedPose, AskIdx, Runs, DBones, DqIdx;
            public NativeArray<int3> Cell;
            public NativeArray<float4x4> M, DBind;
            public NativeArray<long> Count;   // DepthCalls, DepthKept, RobustRuns, DrawnAsks, DrawnFound, DrawnRefused, DrawnInside, DrawnPoses
            // (without a drawn body: one-long stand-ins, every array a job carries must be made)
            public NativeArray<float3> Z3; public NativeArray<int4> Zi4; public NativeArray<float4> Z4; public NativeArray<int> Zi; public NativeArray<byte> Zb;
            public NativeArray<int3> Zi3; public NativeArray<float4x4> Zm; public NativeArray<float> Zf;
            public NativeArray<float3> Z3b, Z3c, Z3d, Z3e, Z3f, Z3g; public NativeArray<int> Zib, Zic, Zid, Zie, Zif, Zig, Zih, Zii, Zij, Zik; public NativeArray<byte> Zbb, Zbc;
            public NativeArray<float> Zfb, Zfc;
            public NativeArray<int> Clock;    // the pose counter, the drawn body's pose, whether the spacing is measured
            public bool HasW1, HasX, HasFlank, Drawn;

            public void Dispose()
            {
                void D<T>(ref NativeArray<T> a) where T : struct { if (a.IsCreated) a.Dispose(); }
                D(ref P0); D(ref P1); D(ref N0); D(ref N1); D(ref XP); D(ref XNo); D(ref XD); D(ref D0); D(ref D1); D(ref P); D(ref Nn); D(ref Q);
                D(ref QNoj); D(ref QN); D(ref AskedAt); D(ref W); D(ref W1); D(ref XW); D(ref Off); D(ref Spacing); D(ref QDj); D(ref QD);
                D(ref B0); D(ref B1); D(ref XN); D(ref XB); D(ref Flank); D(ref Flags); D(ref Start); D(ref UsedBones); D(ref Head); D(ref Next);
                D(ref QNearj); D(ref QNear); D(ref AskedPose); D(ref AskIdx); D(ref Runs); D(ref DBones); D(ref DqIdx); D(ref Cell); D(ref M);
                D(ref DBind); D(ref Count); D(ref Clock);
                D(ref Z3); D(ref Zi4); D(ref Z4); D(ref Zi); D(ref Zb); D(ref Zi3); D(ref Zm); D(ref Zf); D(ref Z3b); D(ref Z3c); D(ref Z3d); D(ref Z3e); D(ref Z3f); D(ref Z3g);
                D(ref Zib); D(ref Zic); D(ref Zid); D(ref Zie); D(ref Zif); D(ref Zig); D(ref Zih); D(ref Zii); D(ref Zij); D(ref Zik); D(ref Zbb); D(ref Zbc); D(ref Zfb); D(ref Zfc);
            }
        }

        private SkinNative _native;

        private static NativeArray<float3> F3(Vector3[] a, int n)
        {
            var r = new NativeArray<float3>(System.Math.Max(1, n), Allocator.Persistent);
            if (a != null) NativeArray<Vector3>.Copy(a, 0, r.Reinterpret<Vector3>(), 0, System.Math.Min(n, a.Length));
            return r;
        }
        private static NativeArray<float> F1(float[] a, int n)
        {
            var r = new NativeArray<float>(System.Math.Max(1, n), Allocator.Persistent);
            if (a != null) NativeArray<float>.Copy(a, 0, r, 0, System.Math.Min(n, a.Length));
            return r;
        }
        private static NativeArray<byte> B1(byte[] a, int n)
        {
            var r = new NativeArray<byte>(System.Math.Max(1, n), Allocator.Persistent);
            if (a != null) NativeArray<byte>.Copy(a, 0, r, 0, System.Math.Min(n, a.Length));
            return r;
        }

        /// <summary>The skin's arrays for the job, made for the set it reads now (made again when the set or the bones change).</summary>
        internal SkinNative Native()
        {
            if (!Ready) return null;
            var s = _set; var n = s.W.Length;
            if (_native != null && _native.Of == (object)s && _native.N == n && _native.BoneCount == _bones.Length) return _native;
            _native?.Dispose();
            var k = new SkinNative { Of = s, N = n, Body = s.Start[(int)Part.ThighR + 1], BoneCount = _bones.Length, HasW1 = s.W1 != null, HasX = s.XN != null, HasFlank = s.FlankSide != null, Drawn = DrawnOn };
            k.P0 = F3(s.P0, n); k.P1 = F3(s.P1, n); k.N0 = F3(s.N0, n); k.N1 = F3(s.N1, n);
            k.W = F1(s.W, n); k.W1 = F1(s.W1, n); k.B0 = B1(s.B0, n); k.B1 = B1(s.B1, n);
            k.XN = B1(s.XN, n); k.XB = B1(s.XB, n * 2); k.XW = F1(s.XW, n * 2); k.XP = F3(s.XP, n * 2); k.XNo = F3(s.XNo, n * 2); k.XD = F3(s.XD, n * 2);
            k.Flank = B1(s.FlankSide, n); k.D0 = F3(s.D0, n); k.D1 = F3(s.D1, n); k.Flags = B1(s.Flags, n);
            k.Start = new NativeArray<int>(s.Start, Allocator.Persistent); k.UsedBones = new NativeArray<int>(s.UsedBones, Allocator.Persistent);
            k.Off = new NativeArray<float>(n, Allocator.Persistent);
            k.P = new NativeArray<float3>(n, Allocator.Persistent); k.Nn = new NativeArray<float3>(n, Allocator.Persistent);
            k.Spacing = new NativeArray<float>(System.Math.Max(1, k.Body), Allocator.Persistent);
            k.Head = new NativeArray<int>(Buckets, Allocator.Persistent); k.Next = new NativeArray<int>(n, Allocator.Persistent);
            k.Cell = new NativeArray<int3>(n, Allocator.Persistent);
            k.Q = new NativeArray<float3>(n, Allocator.Persistent); k.QDj = new NativeArray<float>(n, Allocator.Persistent);
            k.QNoj = new NativeArray<float3>(n, Allocator.Persistent); k.QNearj = new NativeArray<int>(n, Allocator.Persistent);
            k.QD = new NativeArray<float>(n, Allocator.Persistent); k.QN = new NativeArray<float3>(n, Allocator.Persistent); k.QNear = new NativeArray<int>(n, Allocator.Persistent);
            k.AskedAt = new NativeArray<float3>(n, Allocator.Persistent); k.AskedPose = new NativeArray<int>(n, Allocator.Persistent);
            k.AskIdx = new NativeArray<int>(n, Allocator.Persistent); k.DqIdx = new NativeArray<int>(n, Allocator.Persistent);
            k.Runs = new NativeArray<int>(1, Allocator.Persistent);
            k.M = new NativeArray<float4x4>(System.Math.Max(1, _bones.Length), Allocator.Persistent);
            k.DBones = new NativeArray<int>(s.DBones ?? new int[0], Allocator.Persistent);
            k.DBind = new NativeArray<float4x4>(System.Math.Max(1, s.DBind?.Length ?? 0), Allocator.Persistent);
            if (s.DBind != null) for (var b = 0; b < s.DBind.Length; b++) k.DBind[b] = s.DBind[b];
            k.Count = new NativeArray<long>(8, Allocator.Persistent);
            k.Clock = new NativeArray<int>(4, Allocator.Persistent);
            // (the managed reckoning's state, carried over: the pose counter, the drawn body's pose, the spacing once measured)
            k.Clock[0] = _pose; k.Clock[1] = -1; k.Clock[2] = _spacing != null && _spacing.Length == k.Body ? 1 : 0;
            if (k.Clock[2] == 1) k.Spacing.CopyFrom(_spacing);
            _native = k;
            return k;
        }

        /// <summary>Before the job: what the managed side changes between frames (the clothes' offsets, the drawn body's arrays and
        /// offsets), copied in.</summary>
        internal void ToNative(SkinNative k)
        {
            NativeArray<float>.Copy(_off, 0, k.Off, 0, k.N);
            // (the managed reckoning may have run since: its pose counter and its spacing carried over)
            k.Clock[0] = _pose;
            if (k.Clock[2] == 0 && _spacing != null && _spacing.Length == k.Body) { k.Spacing.CopyFrom(_spacing); k.Clock[2] = 1; }
            if (k.Drawn)
            {
                if (!_dPos.IsCreated) { var was = _drawnAt; EnsureDrawnArrays(); _drawnAt = was; }
                if (_dOffDirty) { if (_dOffM != null && _dOffM.Length == _set.DN) _dOff.CopyFrom(_dOffM); else for (var i = 0; i < _set.DN; i++) _dOff[i] = 0f; _dOffDirty = false; }
                DrawnQueries(k.N);
            }
        }

        /// <summary>After the job: the posed skin, its filing, the depth answers and the counters back on the managed side (the
        /// probes and the reports read them there).</summary>
        internal void FromNative(SkinNative k)
        {
            NativeArray<Vector3>.Copy(k.P.Reinterpret<Vector3>(), 0, P, 0, k.N);
            NativeArray<Vector3>.Copy(k.Nn.Reinterpret<Vector3>(), 0, N, 0, k.N);
            if (QD == null || QD.Length != P.Length) { QD = new float[P.Length]; QN = new Vector3[P.Length]; QNear = new int[P.Length]; _askedAt = new Vector3[P.Length]; _askedPose = new int[P.Length]; }
            NativeArray<float>.Copy(k.QD, 0, QD, 0, k.N);
            NativeArray<Vector3>.Copy(k.QN.Reinterpret<Vector3>(), 0, QN, 0, k.N);
            NativeArray<int>.Copy(k.QNear, 0, QNear, 0, k.N);
            NativeArray<Vector3>.Copy(k.AskedAt.Reinterpret<Vector3>(), 0, _askedAt, 0, k.N);
            NativeArray<int>.Copy(k.AskedPose, 0, _askedPose, 0, k.N);
            NativeArray<int>.Copy(k.Next, 0, _next, 0, k.Body);
            NativeArray<Vector3Int>.Copy(k.Cell.Reinterpret<Vector3Int>(), 0, _cell, 0, k.Body);
            k.Head.CopyTo(_head);
            if (k.Clock[2] == 1 && (_spacing == null || _spacing.Length != k.Body)) { _spacing = new float[k.Body]; k.Spacing.CopyTo(_spacing); }
            Poses += k.Clock[0] - _pose;   // (the report's count of posings: the job's own)
            _pose = k.Clock[0];
            DepthCalls += k.Count[0]; DepthKept += k.Count[1]; RobustRuns += k.Count[2]; DrawnAsks += k.Count[3]; DrawnFound += k.Count[4];
            DrawnRefused += k.Count[5]; DrawnInside += k.Count[6]; DrawnPoses += (int)k.Count[7];
            for (var i = 0; i < 8; i++) k.Count[i] = 0;
            Near = k.Clock[3];
            Mirror(k.Body);
            _drawnAt = -1;   // (the managed drawn body was not posed: posed again when the managed side next asks)
        }

        /// <summary>The drawn body's arrays made (EnsureDrawn's first part, without the posing).</summary>
        private void EnsureDrawnArrays()
        {
            var s = _set;
            _dPos = new NativeArray<float3>(s.DN, Allocator.Persistent); NativeArray<Vector3>.Copy(s.DPos, _dPos.Reinterpret<Vector3>());
            _dDelta = new NativeArray<float3>(s.DN, Allocator.Persistent); NativeArray<Vector3>.Copy(s.DDelta, _dDelta.Reinterpret<Vector3>());
            _dV = new NativeArray<float3>(s.DN, Allocator.Persistent);
            _dB = new NativeArray<int4>(s.DB, Allocator.Persistent); _dW = new NativeArray<float4>(s.DW, Allocator.Persistent);
            _dK = new NativeArray<int>(s.DK, Allocator.Persistent); _dWeld = new NativeArray<int>(s.DWeld, Allocator.Persistent);
            _dFanStart = new NativeArray<int>(s.DFanStart, Allocator.Persistent); _dFan = new NativeArray<int>(s.DFan, Allocator.Persistent);
            _hLeft = new NativeArray<int>(s.HLeft, Allocator.Persistent); _hRight = new NativeArray<int>(s.HRight, Allocator.Persistent);
            _hStart = new NativeArray<int>(s.HStart, Allocator.Persistent); _hCount = new NativeArray<int>(s.HCount, Allocator.Persistent);
            _hOrder = new NativeArray<int>(s.HOrder, Allocator.Persistent);
            _hLo = new NativeArray<float3>(s.HLeft.Length, Allocator.Persistent); _hHi = new NativeArray<float3>(s.HLeft.Length, Allocator.Persistent);
            _dFl = new NativeArray<byte>(s.DFlank, Allocator.Persistent); _dFlip = new NativeArray<byte>(s.DFlip, Allocator.Persistent);
            _dTri = new NativeArray<int3>(s.DTri, Allocator.Persistent);
            _dM = new NativeArray<float4x4>(s.DBind.Length, Allocator.Persistent);
            _dOff = new NativeArray<float>(s.DN, Allocator.Persistent);
            _dOffDirty = true;
        }

        /// <summary>The skin's reckonings for the job, over this person's arrays.</summary>
        internal SkinK Kernel(SkinNative k)
        {
            var hips = _hipsT != null ? _hipsT.position : transform.position;
            var q = Body != null && Body.quality != SkinQuality.Auto ? (int)Body.quality : (int)QualitySettings.skinWeights;
            var r = new SkinK
            {
                N = k.N, Body = k.Body, HasW1 = k.HasW1 ? 1 : 0, HasX = k.HasX ? 1 : 0, HasFlank = k.HasFlank ? 1 : 0, Drawn = k.Drawn ? 1 : 0,
                P0 = k.P0, P1 = k.P1, N0 = k.N0, N1 = k.N1, XP = k.XP, XNo = k.XNo, XD = k.XD, D0 = k.D0, D1 = k.D1, P = k.P, Nn = k.Nn,
                W = k.W, W1 = k.W1, XW = k.XW, Off = k.Off, B0 = k.B0, B1 = k.B1, XN = k.XN, XB = k.XB, Flank = k.Flank, Flags = k.Flags,
                Start = k.Start, UsedBones = k.UsedBones, M = k.M, Spacing = k.Spacing, Head = k.Head, Next = k.Next, Cell = k.Cell,
                Q = k.Q, QDj = k.QDj, QNoj = k.QNoj, QNearj = k.QNearj, QD = k.QD, QN = k.QN, QNear = k.QNear, AskedAt = k.AskedAt, AskedPose = k.AskedPose,
                AskIdx = k.AskIdx, Runs = k.Runs, Count = k.Count, Clock = k.Clock, DBones = k.DBones, DBind = k.DBind, DqIdx = k.DqIdx,
                Anchor = _anchor = AnchorTemp ? transform.position : Vector3.zero,
                Hips = hips, Right3 = transform.right, KMax = Mathf.Clamp(q, 1, 4), Carrying = Carrying, FlankL = FlankL, FlankR = FlankR,
            };
            if (!k.Drawn)
            {
                if (!k.Z3.IsCreated)
                {
                    NativeArray<T> One<T>() where T : struct => new(1, Allocator.Persistent);
                    k.Z3 = One<float3>(); k.Z3b = One<float3>(); k.Z3c = One<float3>(); k.Z3d = One<float3>(); k.Z3e = One<float3>(); k.Z3f = One<float3>(); k.Z3g = One<float3>();
                    k.Zi4 = One<int4>(); k.Z4 = One<float4>(); k.Zi3 = One<int3>(); k.Zm = One<float4x4>(); k.Zf = One<float>(); k.Zfb = One<float>(); k.Zfc = One<float>();
                    k.Zi = One<int>(); k.Zib = One<int>(); k.Zic = One<int>(); k.Zid = One<int>(); k.Zie = One<int>(); k.Zif = One<int>(); k.Zig = One<int>(); k.Zih = One<int>(); k.Zii = One<int>(); k.Zij = One<int>(); k.Zik = One<int>();
                    k.Zb = One<byte>(); k.Zbb = One<byte>(); k.Zbc = One<byte>();
                }
                r.dPos = k.Z3; r.dDelta = k.Z3b; r.dV = k.Z3c; r.hLo = k.Z3d; r.hHi = k.Z3e; r.dq = k.Z3f; r.dqN = k.Z3g;
                r.dB = k.Zi4; r.dW = k.Z4; r.dTri = k.Zi3; r.dM = k.Zm; r.dOff = k.Zf; r.dqL = k.Zfb; r.dqB = k.Zfc;
                r.dK = k.Zi; r.dWeld = k.Zib; r.dFanStart = k.Zic; r.dFan = k.Zid; r.hLeft = k.Zie; r.hRight = k.Zif; r.hStart = k.Zig; r.hCount = k.Zih; r.hOrder = k.Zii; r.dqF = k.Zij;
                r.dFl = k.Zb; r.dFlip = k.Zbb; r.dqV = k.Zbc;
            }
            if (k.Drawn)
            {
                r.dPos = _dPos; r.dDelta = _dDelta; r.dV = _dV; r.hLo = _hLo; r.hHi = _hHi; r.dB = _dB; r.dW = _dW; r.dK = _dK; r.dWeld = _dWeld;
                r.dFanStart = _dFanStart; r.dFan = _dFan; r.hLeft = _hLeft; r.hRight = _hRight; r.hStart = _hStart; r.hCount = _hCount; r.hOrder = _hOrder;
                r.dFl = _dFl; r.dFlip = _dFlip; r.dTri = _dTri; r.dM = _dM; r.dOff = _dOff; r.dq = _dq; r.dqN = _dqN; r.dqF = _dqF; r.dqL = _dqL; r.dqB = _dqB; r.dqV = _dqV;
            }
            return r;
        }

        private void ReleaseNative() { _native?.Dispose(); _native = null; }

        /// <summary>The skin's reckonings, as BodySkin's managed methods do them (Pose, Spacing, Turn, DepthRange, DrawnRange,
        /// EnsureDrawn, RunDrawn, Got, Depth), over NativeArrays, for Burst.</summary>
        internal struct SkinK
        {
            public int N, Body, HasW1, HasX, HasFlank, Drawn, KMax;
            public float FlankL, FlankR, Carrying;
            public float3 Hips, Right3;
            public NativeArray<float3> P0, P1, N0, N1, XP, XNo, XD, D0, D1, P, Nn, Q, QNoj, QN, AskedAt;
            public NativeArray<float> W, W1, XW, Off, Spacing, QDj, QD;
            public NativeArray<byte> B0, B1, XN, XB, Flank, Flags;
            public NativeArray<int> Start, UsedBones, Head, Next, QNearj, QNear, AskedPose, AskIdx, Runs, DBones, DqIdx;
            public NativeArray<int3> Cell;
            public float3 Anchor;   // TEMP (relaunch 16)
            /// <summary>Each of the renderer's bones' localToWorldMatrix, as the step has them now (it sets them).</summary>
            public NativeArray<float4x4> M, DBind;
            public NativeArray<long> Count;
            public NativeArray<int> Clock;
            // the drawn body
            public NativeArray<float3> dPos, dDelta, dV, hLo, hHi, dq, dqN;
            public NativeArray<int4> dB; public NativeArray<float4> dW;
            public NativeArray<int> dK, dWeld, dFanStart, dFan, hLeft, hRight, hStart, hCount, hOrder, dqF;
            public NativeArray<byte> dFl, dFlip, dqV;
            public NativeArray<int3> dTri;
            public NativeArray<float4x4> dM;
            public NativeArray<float> dOff, dqL, dqB;
            /// <summary>The nearest body point the last answer read (BodySkin.Near).</summary>
            public int Near;

            public bool Ready => N > 0;
            public int Begin(Part p) => Start[(int)p];
            public int End(Part p) => Start[(int)p + 1];
            public bool Low(int i) => (Flags[i] & LowFlag) != 0;
            public float OffAt(int i) => Off[i];
            public Part PartOf(int i)
            {
                for (var p = Part.HandR; p > Part.Torso; p--) if (i >= Start[(int)p]) return p;
                return Part.Torso;
            }
            public float FlankMove(int i) => HasFlank != 0 && i >= 0 && i < N && Flank[i] != 0 ? CM.Mag(D0[i]) : 0f;
            private int PoseNow => Clock[0];

            private static int3 CellOf(float3 p) => new((int)math.floor((double)(p.x / Cell_)), (int)math.floor((double)(p.y / Cell_)), (int)math.floor((double)(p.z / Cell_)));
            private const float Cell_ = BodySkin.Cell;
            private static int HashOf(int x, int y, int z) => (int)(((uint)(x * 73856093) ^ (uint)(y * 19349663) ^ (uint)(z * 83492791)) & (Buckets - 1));

            /// <summary>BodySkin.Pose (the point loop, the spacing measured once, the filing; Mirror needs nothing here: the depth
            /// reads the live arrays, whose body points do not move until the next pose).</summary>
            public void Pose()
            {
                if (!Ready) return;
                for (var i = 0; i < N; i++)
                {
                    var w = W[i];
                    var w1 = HasW1 != 0 ? W1[i] : 1f - w;
                    var m0 = M[B0[i]]; var m1 = M[B1[i]];
                    var p = CM.Add(CM.Mul(CM.Point(m0, P0[i]), w), CM.Mul(CM.Point(m1, P1[i]), w1));
                    var nv = CM.Add(CM.Mul(CM.Vec(m0, N0[i]), w), CM.Mul(CM.Vec(m1, N1[i]), w1));
                    int xn = HasX != 0 ? XN[i] : 0;
                    for (var x = 0; x < xn && x < 2; x++)
                    {
                        var mx = M[XB[i * 2 + x]];
                        var wx = XW[i * 2 + x];
                        p = CM.Add(p, CM.Mul(CM.Point(mx, XP[i * 2 + x]), wx));
                        nv = CM.Add(nv, CM.Mul(CM.Vec(mx, XNo[i * 2 + x]), wx));
                    }
                    var nn = CM.Norm(nv);
                    if (HasFlank != 0 && Flank[i] != 0)
                    {
                        var fw = Flank[i] == 1 ? FlankL : FlankR;
                        if (fw > 0f)
                        {
                            var dd = CM.Add(CM.Mul(CM.Vec(m0, D0[i]), w), CM.Mul(CM.Vec(m1, D1[i]), w1));
                            for (var x = 0; x < xn && x < 2; x++) dd = CM.Add(dd, CM.Mul(CM.Vec(M[XB[i * 2 + x]], XD[i * 2 + x]), XW[i * 2 + x]));
                            p = CM.Add(p, CM.Mul(dd, fw));
                        }
                    }
                    P[i] = CM.Add(p, CM.Mul(nn, Off[i]));
                    Nn[i] = nn;
                }
                for (var h = 0; h < Buckets; h++) Head[h] = -1;
                if (Clock[2] == 0) { MeasureSpacing(); Clock[2] = 1; }
                for (var i = 0; i < Body; i++)
                {
                    var c = CellOf(P[i] - Anchor);
                    Cell[i] = c;
                    var h = HashOf(c.x, c.y, c.z);
                    Next[i] = Head[h];
                    Head[h] = i;
                }
                Clock[0] = PoseNow + 1;
            }

            /// <summary>BodySkin.Spacing: each body point's fourth nearest neighbour's distance (measured once).</summary>
            private void MeasureSpacing()
            {
                var near = new float4();
                for (var i = 0; i < Body; i++)
                {
                    near = new float4(float.MaxValue, float.MaxValue, float.MaxValue, float.MaxValue);
                    for (var j = 0; j < Body; j++)
                    {
                        if (j == i) continue;
                        var d = CM.SqrMag(CM.Sub(P[j], P[i]));
                        if (d >= near[3]) continue;
                        var k2 = 3;
                        while (k2 > 0 && near[k2 - 1] > d) { near[k2] = near[k2 - 1]; k2--; }
                        near[k2] = d;
                    }
                    Spacing[i] = near[3] < float.MaxValue ? CM.Sqrt(near[3]) : 0.05f;
                }
            }

            /// <summary>BodySkin.Turn.</summary>
            public void Turn(int from, int to, float3 pivot, float4 q)
            {
                for (var i = from; i < to; i++)
                {
                    P[i] = CM.Add(pivot, CM.Rotate(q, CM.Sub(P[i], pivot)));
                    Nn[i] = CM.Rotate(q, Nn[i]);
                }
            }

            /// <summary>BodySkin.DepthRange.</summary>
            public void DepthRange(int from, int to, int stride = 1)
            {
                if (to <= from || Clock[2] == 0) return;   // (BodySkin: not before the first pose's mirror)
                var m = (to - from + stride - 1) / stride;
                var k = 0;
                var pose = PoseNow;
                for (var i = from; i < to; i += stride)
                {
                    var at = P[i]; var was = AskedAt[i];
                    if (AskedPose[i] == pose && at.x == was.x && at.y == was.y && at.z == was.z) continue;
                    AskIdx[k] = i; Q[k++] = at;
                }
                Count[0] += m; Count[1] += m - k;
                if (k == 0) return;
                Runs[0] = 0;
                new DepthJob { P = P, N = Nn, Head = Head, Next = Next, Cells = Cell, Anchor = Anchor, Spacing = Spacing, Flags = Flags, Q = Q, D = QDj, No = QNoj, Near = QNearj, Runs = Runs, Count = k, UseRobust = Drawn != 0 ? 0 : 1 }.Execute();
                Count[2] += Runs[0];
                for (var j = 0; j < k; j++) { var i = AskIdx[j]; QD[i] = QDj[j]; QN[i] = QNoj[j]; QNear[i] = QNearj[j]; AskedAt[i] = Q[j]; AskedPose[i] = pose; }
                if (Drawn != 0) DrawnRange(k);
            }

            /// <summary>BodySkin.DrawnRange.</summary>
            private void DrawnRange(int k)
            {
                var m = 0;
                for (var j = 0; j < k; j++)
                {
                    var i = AskIdx[j];
                    if (QNear[i] < 0 || QD[i] <= -DrawnBand) continue;
                    DqIdx[m++] = i;
                }
                if (m == 0) return;
                EnsureDrawn();
                for (var j = 0; j < m; j++) { dq[j] = P[DqIdx[j]]; dqV[j] = (byte)(QD[DqIdx[j]] > 0f ? 1 : 0); }
                RunDrawn(m, false);
                for (var j = 0; j < m; j++)
                {
                    var f = dqF[j];
                    Count[3]++;
                    if ((f & 1) == 0) continue;
                    Count[4]++;
                    if ((f & 2) != 0 && (f & 4) == 0) Count[5]++;
                    var i = DqIdx[j];
                    QD[i] = dqL[j];
                    if (QD[i] > 0f) Count[6]++;
                }
            }

            /// <summary>BodySkin.EnsureDrawn (the posing; the arrays are made on the managed side).</summary>
            private void EnsureDrawn()
            {
                if (Clock[1] == PoseNow) return;
                for (var x = 0; x < DBones.Length; x++) { var b = DBones[x]; dM[b] = CM.MatMul(M[b], DBind[b]); }
                new DrawnPoseJob
                {
                    Pos = dPos, Delta = dDelta, B = dB, W = dW, K = dK, Flank = dFl, M = dM, Tri = dTri,
                    Left = hLeft, Right = hRight, Start = hStart, Cnt = hCount, Order = hOrder, Out = dV, Lo = hLo, Hi = hHi,
                    FlankL = FlankL, FlankR = FlankR, KMax = KMax,
                }.Execute();
                Clock[1] = PoseNow;
                Count[7]++;
            }

            private void RunDrawn(int m, bool alwaysRays)
            {
                new DrawnJob
                {
                    V = dV, Lo = hLo, Hi = hHi, Q = dq, Tri = dTri, Flip = dFlip, Left = hLeft, Right = hRight, Start = hStart, Cnt = hCount,
                    Order = hOrder, Weld = dWeld, FanStart = dFanStart, Fan = dFan, Off = dOff, VoteIn = dqV, Layered = dqL, Bare = dqB, Normal = dqN, Found = dqF,
                    Hips = Hips, Right3 = Right3, Reach = DrawnReach, Count = m, AlwaysRays = alwaysRays ? 1 : 0,
                }.Execute();
            }

            /// <summary>BodySkin.Got.</summary>
            public bool Got(int i, out float depth, out float3 normal)
            {
                Near = QNear[i];
                depth = Near >= 0 ? QD[i] : 0f; normal = Near >= 0 ? QN[i] : float3.zero;
                return Near >= 0;
            }

            /// <summary>BodySkin.Depth for one point (as the batch reckons it, which is Depth's own reckoning), for the traces.</summary>
            public bool Depth(float3 p, out float depth, out float3 normal)
            {
                Count[0]++;
                Q[0] = p;
                Runs[0] = 0;
                new DepthJob { P = P, N = Nn, Head = Head, Next = Next, Cells = Cell, Anchor = Anchor, Spacing = Spacing, Flags = Flags, Q = Q, D = QDj, No = QNoj, Near = QNearj, Runs = Runs, Count = 1, UseRobust = Drawn != 0 ? 0 : 1 }.Execute();
                Count[2] += Runs[0];
                Near = QNearj[0];
                depth = Near >= 0 ? QDj[0] : 0f; normal = Near >= 0 ? QNoj[0] : float3.zero;
                if (Near < 0) return false;
                if (Drawn != 0 && depth > -DrawnBand)
                {
                    EnsureDrawn();
                    dq[0] = p; dqV[0] = (byte)(depth > 0f ? 1 : 0);
                    RunDrawn(1, false);
                    if ((dqF[0] & 1) != 0) depth = dqL[0];
                }
                return true;
            }
        }
    }
}
