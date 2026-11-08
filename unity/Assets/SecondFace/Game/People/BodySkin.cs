using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using Unity.Burst;
using Unity.Collections;
using Unity.Jobs;
using Unity.Mathematics;
using UnityEngine;

namespace SecondFace.Game.People
{
    /// <summary>
    /// The body's own skin where an arm meets it (the owner's rule: arms, hands and clothing never sink into a body;
    /// docs/PEOPLE_MOTION.md C1, A4). The torso, the hips and the thighs, and each arm's upper arm, forearm and hand, as
    /// points sampled from the body's mesh at build time (Editor <c>RocketboxLayers</c>: one about every 2.5 cm of the
    /// body, 2 cm of the hand, 3 cm of the arm), each skinned to its two strongest bones and posed every frame from the
    /// bones as the mesh itself is posed. A point stands out from the skin by the thickest layer worn over it
    /// (<see cref="Wear"/>, from <see cref="RbLayerSet"/>). <see cref="ArmClearance"/> holds the arms off this surface: the
    /// same surface the gate measures (MotionProbe), not a model of it (on the phone the meshes are not readable).
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class BodySkin : MonoBehaviour
    {
        public const int Version = 1;

        /// <summary>Where a point is: the body an arm may meet (torso, thighs), then each arm's parts.</summary>
        public enum Part : byte { Torso, ThighL, ThighR, UpperArmL, ForearmL, HandL, UpperArmR, ForearmR, HandR }
        public const int Parts = 9;

        /// <summary>The points (gzip): "RBS1", the layer ids, then the points by part: per part a count, and per point
        /// two bones, the first one's weight, the point and its normal in each bone's frame at bind, a flag byte
        /// (<see cref="LowFlag"/>) and the layers that cover it (a bit per layer id).</summary>
        public TextAsset Data;
        public SkinnedMeshRenderer Body;
        /// <summary>The body's carrying angle (degrees): the forearm's turn out from the upper arm's line with the elbow
        /// straight (women 15 ± 5°, men 11 ± 4°; docs/PEOPLE_MOTION.md A3).</summary>
        public float Carrying = 12f;
        public int Built;
        /// <summary>Each foot's sole from its own mesh (built with the skin): the heel's lowest point behind the ankle, the back
        /// of the heel at the sole, the ball under the toe joint (in the foot bone's frame) and the toe's tip (in the toes'
        /// frame). The foot plant holds and lifts the feet by them (a sole guessed from the ankle sat 1-2.5 cm over the real
        /// heel, which skated at 3-5 m/s, 2026-11-06).</summary>
        public Vector3[] SoleL = new Vector3[0], SoleR = new Vector3[0];

        /// <summary>A point of the hips or the thighs, beside which a resting hand hangs (A4).</summary>
        public const byte LowFlag = 1;

        private sealed class Set
        {
            public string[] Layers;
            public bool[] ThinSides;
            public readonly int[] Start = new int[Parts + 1];
            public byte[] B0, B1, Flags, Side;
            public float[] W;
            public Vector3[] P0, P1, N0, N1;
            public uint[] Mask;
            public int[] UsedBones;
            /// <summary>The flank corrective that moves each point (0 none, 1 left, 2 right; RBS3) and its move in each bone's frame.</summary>
            public byte[] FlankSide;
            public Vector3[] D0, D1;
            /// <summary>RBS4: the second bone's own weight (else 1 - W), and up to two more bones per point (2 slots each).</summary>
            public float[] W1;
            public byte[] XN, XB;
            public float[] XW;
            public Vector3[] XP, XNo, XD;
        }

        /// <summary>The flank correctives' weights now (0-1; ArmClearance sets them as it sets the body's own shapes).</summary>
        [System.NonSerialized] public float FlankL, FlankR;

        private static readonly Dictionary<TextAsset, Set> Cache = new();

        private Set _set;
        private Transform[] _bones;
        private Matrix4x4[] _m;
        private float[] _off;
        private uint _worn;
        /// <summary>Posed by <see cref="Pose"/> (world): each point on the surface (its layers' thickness out) and its normal.</summary>
        public Vector3[] P, N;

        // the body's points filed by cell, searched in the 27 cells about a point (as the gate's MotionProbe does: a
        // Rocketbox thigh has a vertex every 4-5 cm, so a point deep in it may have none within one cell's width)
        // 5 cm cells: the 27 about a point reach at least 5 cm (with 3 cm, an arm 3 cm into a torso whose points stand 4-5
        // cm apart found none near and read as outside, while the gate saw it 3 cm in, 2026-11-06)
        private const float Cell = 0.05f;
        private const int Buckets = 2048;
        private readonly int[] _head = new int[Buckets];
        private int[] _next;
        private Vector3Int[] _cell;
        // how far apart the body's points stand about each one (its fourth nearest neighbour, measured once)
        private float[] _spacing;

        public bool Ready => _set != null && _bones != null && P != null;
        public int Count => _set?.W.Length ?? 0;
        public int Begin(Part p) => _set.Start[(int)p];
        public int End(Part p) => _set.Start[(int)p + 1];
        public bool Low(int i) => (_set.Flags[i] & LowFlag) != 0;
        /// <summary>The body's point nearest to the last point <see cref="Depth"/> judged (-1: none near), for reports.</summary>
        public int Near = -1;
        /// <summary>The part a point belongs to.</summary>
        public Part PartOf(int i)
        {
            for (var p = Part.HandR; p > Part.Torso; p--) if (i >= _set.Start[(int)p]) return p;
            return Part.Torso;
        }
        /// <summary>How far point <paramref name="i"/> stands out from the bare skin (its layers), m.</summary>
        public float Off(int i) => _off[i];

        private void Awake() => Bind();

        /// <summary>Reads the points and finds the body's bones (again after a body is rebuilt).</summary>
        public void Bind()
        {
            _set = Read(Data);
            // this person's own body renderer, never one outside them (a reference that resolved to the prefab asset posed
            // every point at the scene's origin, 2026-11-06: the gate's fit check found them metres from the body)
            if (Body == null || !Body.transform.IsChildOf(transform))
            {
                Body = null;
                foreach (var r in GetComponentsInChildren<SkinnedMeshRenderer>(true))
                    if (!r.name.StartsWith("layer_") && r.sharedMesh != null && (Body == null || r.sharedMesh.vertexCount > Body.sharedMesh.vertexCount)) Body = r;
            }
            _bones = Body != null ? Body.bones : null;
            P = N = null;
            if (_set == null || _bones == null) { _set = null; return; }
            foreach (var b in _set.UsedBones)
                if (b >= _bones.Length || _bones[b] == null) { Debug.LogWarning($"BodySkin {name}: bone {b} missing"); _set = null; return; }
            var n = _set.W.Length;
            P = new Vector3[n]; N = new Vector3[n]; _next = new int[n]; _cell = new Vector3Int[n];
            _off ??= new float[n];
            if (_off.Length != n) _off = new float[n];
            _m = new Matrix4x4[_bones.Length];
        }

        private static Set Read(TextAsset data)
        {
            if (data == null) return null;
            if (Cache.TryGetValue(data, out var have)) return have;
            var s = new Set();
            using (var gz = new GZipStream(new MemoryStream(data.bytes), CompressionMode.Decompress))
            using (var r = new BinaryReader(gz))
            {
                var magic = new string(r.ReadChars(4));
                if (magic != "RBS1" && magic != "RBS2" && magic != "RBS3" && magic != "RBS4") throw new InvalidDataException("not a body skin");
                var v2 = magic != "RBS1";   // each layer's thinning at the sides, and each point's facing sideways
                var v4 = magic == "RBS4";   // every bone that moves a point
                var v3 = magic == "RBS3" || v4;   // the flank correctives
                var nl = r.ReadInt32();
                s.Layers = new string[nl]; s.ThinSides = new bool[nl];
                for (var k = 0; k < nl; k++) { s.Layers[k] = r.ReadString(); if (v2) s.ThinSides[k] = r.ReadByte() != 0; }
                var counts = new int[Parts];
                for (var p = 0; p < Parts; p++) counts[p] = r.ReadInt32();
                var n = 0;
                for (var p = 0; p < Parts; p++) { s.Start[p] = n; n += counts[p]; }
                s.Start[Parts] = n;
                s.B0 = new byte[n]; s.B1 = new byte[n]; s.Flags = new byte[n]; s.W = new float[n]; s.Mask = new uint[n]; s.Side = new byte[n];
                s.P0 = new Vector3[n]; s.P1 = new Vector3[n]; s.N0 = new Vector3[n]; s.N1 = new Vector3[n];
                if (v3) { s.FlankSide = new byte[n]; s.D0 = new Vector3[n]; s.D1 = new Vector3[n]; }
                if (v4) { s.W1 = new float[n]; s.XN = new byte[n]; s.XB = new byte[n * 2]; s.XW = new float[n * 2]; s.XP = new Vector3[n * 2]; s.XNo = new Vector3[n * 2]; s.XD = new Vector3[n * 2]; }
                var used = new HashSet<int>();
                Vector3 V() => new(r.ReadSingle(), r.ReadSingle(), r.ReadSingle());
                for (var i = 0; i < n; i++)
                {
                    s.B0[i] = r.ReadByte(); s.B1[i] = r.ReadByte();
                    if (v4) { s.W[i] = r.ReadSingle(); s.W1[i] = r.ReadSingle(); } else s.W[i] = r.ReadByte() / 255f;
                    s.P0[i] = V(); s.N0[i] = V(); s.P1[i] = V(); s.N1[i] = V();
                    if (v4)
                    {
                        s.XN[i] = r.ReadByte();
                        for (var x = 0; x < s.XN[i] && x < 2; x++) { s.XB[i * 2 + x] = r.ReadByte(); s.XW[i * 2 + x] = r.ReadSingle(); s.XP[i * 2 + x] = V(); s.XNo[i * 2 + x] = V(); used.Add(s.XB[i * 2 + x]); }
                    }
                    s.Flags[i] = r.ReadByte(); s.Mask[i] = r.ReadUInt32();
                    if (v2) s.Side[i] = r.ReadByte();
                    if (v3 && (s.FlankSide[i] = r.ReadByte()) != 0) { s.D0[i] = V(); s.D1[i] = V(); if (v4) for (var x = 0; x < s.XN[i] && x < 2; x++) s.XD[i * 2 + x] = V(); }
                    used.Add(s.B0[i]); used.Add(s.B1[i]);
                }
                s.UsedBones = new int[used.Count];
                used.CopyTo(s.UsedBones);
            }
            Cache[data] = s;
            return s;
        }

        /// <summary>What the person wears over the skin: each layer id with its thickness (m). Each point stands out by
        /// the thickest of them over it.</summary>
        public void Wear(IReadOnlyDictionary<string, float> layers)
        {
            if (_set == null) { _set = Read(Data); if (_set == null) return; }
            var n = _set.W.Length;
            if (_off == null || _off.Length != n) _off = new float[n];
            var thick = new float[32];
            uint worn = 0;
            for (var k = 0; k < _set.Layers.Length && k < 32; k++)
                if (layers != null && layers.TryGetValue(_set.Layers[k], out var t)) { worn |= 1u << k; thick[k] = t; }
            _worn = worn;
            for (var i = 0; i < n; i++)
            {
                var m = _set.Mask[i] & worn;
                var off = 0f;
                var side = _set.Side[i] / 255f;
                for (var k = 0; m != 0; k++, m >>= 1)
                    if ((m & 1) != 0) off = Mathf.Max(off, _set.ThinSides[k] ? Mathf.Lerp(thick[k], Mathf.Min(thick[k], SideThick), side) : thick[k]);
                _off[i] = off;
            }
        }

        /// <summary>Poses every point from the bones as they are now, and files the body's points (torso, thighs) by cell
        /// for <see cref="Depth"/>.</summary>
        /// <summary>For the gate's report: the time posing has taken (ms) and how often.</summary>
        [System.NonSerialized] public double PoseMs; [System.NonSerialized] public int Poses;
        private readonly System.Diagnostics.Stopwatch _poseCost = new();

        public void Pose()
        {
            if (!Ready) return;
            _poseCost.Restart();
            PoseCore();
            PoseMs += _poseCost.Elapsed.TotalMilliseconds; Poses++;
        }

        private void PoseCore()
        {
            foreach (var b in _set.UsedBones) _m[b] = _bones[b].localToWorldMatrix;
            var n = _set.W.Length;
            for (var i = 0; i < n; i++)
            {
                var w = _set.W[i];
                var w1 = _set.W1 != null ? _set.W1[i] : 1f - w;
                ref var m0 = ref _m[_set.B0[i]];
                ref var m1 = ref _m[_set.B1[i]];
                var p = m0.MultiplyPoint3x4(_set.P0[i]) * w + m1.MultiplyPoint3x4(_set.P1[i]) * w1;
                var nv = m0.MultiplyVector(_set.N0[i]) * w + m1.MultiplyVector(_set.N1[i]) * w1;
                var xn = _set.XN != null ? _set.XN[i] : 0;
                for (var x = 0; x < xn && x < 2; x++)
                {
                    ref var mx = ref _m[_set.XB[i * 2 + x]];
                    var wx = _set.XW[i * 2 + x];
                    p += mx.MultiplyPoint3x4(_set.XP[i * 2 + x]) * wx;
                    nv += mx.MultiplyVector(_set.XNo[i * 2 + x]) * wx;
                }
                var nn = nv.normalized;
                if (_set.FlankSide != null && _set.FlankSide[i] != 0)
                {
                    var fw = _set.FlankSide[i] == 1 ? FlankL : FlankR;
                    if (fw > 0f)
                    {
                        var dd = m0.MultiplyVector(_set.D0[i]) * w + m1.MultiplyVector(_set.D1[i]) * w1;
                        for (var x = 0; x < xn && x < 2; x++) dd += _m[_set.XB[i * 2 + x]].MultiplyVector(_set.XD[i * 2 + x]) * _set.XW[i * 2 + x];
                        p += dd * fw;
                    }
                }
                P[i] = p + nn * _off[i];
                N[i] = nn;
            }
            for (var h = 0; h < Buckets; h++) _head[h] = -1;
            var body = _set.Start[(int)Part.ThighR + 1];
            if (_spacing == null || _spacing.Length != body) Spacing(body);
            for (var i = 0; i < body; i++)
            {
                var c = CellOf(P[i]);
                _cell[i] = c;
                var h = Hash(c.x, c.y, c.z);
                _next[i] = _head[h];
                _head[h] = i;
            }
            // (after the filing: mirrored before it, the batch read last frame's cells and an empty table, and found no body
            // point near any arm's, 2026-11-08)
            Mirror(body);
        }

        /// <summary>One point's posing, for a report: its bones, their places, its stored offsets and where it is now.</summary>
        public string Explain(int i)
        {
            if (!Ready || i < 0 || i >= P.Length) return "not ready";
            var b0 = _bones[_set.B0[i]]; var b1 = _bones[_set.B1[i]];
            return $"point {i}: bones {b0.name} at {b0.position} and {b1.name} at {b1.position}, weight {_set.W[i]:0.00}, offsets {_set.P0[i]} / {_set.P1[i]}, posed at {P[i]}, used bones {_set.UsedBones.Length}";
        }

        /// <summary>Turns a range of points (one arm's, after its bone is turned) about a pivot.</summary>
        public void Turn(int from, int to, Vector3 pivot, Quaternion q)
        {
            for (var i = from; i < to; i++)
            {
                P[i] = pivot + q * (P[i] - pivot);
                N[i] = q * N[i];
            }
        }

        private void Spacing(int body)
        {
            _spacing = new float[body];
            var near = new float[4];
            for (var i = 0; i < body; i++)
            {
                for (var k = 0; k < 4; k++) near[k] = float.MaxValue;
                for (var j = 0; j < body; j++)
                {
                    if (j == i) continue;
                    var d = (P[j] - P[i]).sqrMagnitude;
                    if (d >= near[3]) continue;
                    var k2 = 3;
                    while (k2 > 0 && near[k2 - 1] > d) { near[k2] = near[k2 - 1]; k2--; }
                    near[k2] = d;
                }
                _spacing[i] = near[3] < float.MaxValue ? Mathf.Sqrt(near[3]) : 0.05f;
            }
        }

        private static Vector3Int CellOf(Vector3 p) => new(Mathf.FloorToInt(p.x / Cell), Mathf.FloorToInt(p.y / Cell), Mathf.FloorToInt(p.z / Cell));
        private static int Hash(int x, int y, int z) => (int)(((uint)(x * 73856093) ^ (uint)(y * 19349663) ^ (uint)(z * 83492791)) & (Buckets - 1));

        /// <summary>Where a point is against the body's surface, as the gate decides it: among the body's points in the
        /// 27 cells about it, the three nearest; inside only when all three face away from it (one nearest point may be the
        /// inside of a hem). False when no body point is near (more than a cell or so away: outside). <paramref name="depth"/>:
        /// how deep inside (m, positive), or outside, minus the gap to the surface's plane at the nearest point.</summary>
        /// <summary>Layers that thin at the torso's sides (a vest's, a jacket's, webbing's side panels under the arms) are
        /// this thick there (m), by how far the skin faces sideways (<see cref="SideShare"/>): at their full thickness a broad
        /// man's arm was held out off them, A1 21-29°, 2026-11-06.</summary>
        public const float SideThick = 0.004f;
        public static float SideShare(float lateralNormal) => Mathf.InverseLerp(0.55f, 0.85f, Mathf.Abs(lateralNormal));

        /// <summary>The widest patch of skin one point stands for (m).</summary>
        public const float PatchMax = 0.06f;
        /// <summary>How far across from a point, as a multiple of how deep behind its plane, a point is still read as under it.</summary>
        public const float DeepAcross = 3f;

        /// <summary>For the gate's report: how often <see cref="Depth"/> was asked.</summary>
        [System.NonSerialized] public long DepthCalls;

        // ---- many points at once (the arm clearance asks thousands a frame: 12-14 ms a person in the editor, 2026-11-08):
        // the body's points, their filing and spacing mirrored once a frame, and a range of points asked in one Burst job,
        // which reckons exactly as Depth does (the same filing, the same three nearest, the same tests, Vector3's own
        // normalising), each point's answer kept by its index
        /// <summary>After <see cref="DepthRange"/>: each asked point's depth, normal and nearest body point (-1: none near,
        /// Depth's false).</summary>
        [System.NonSerialized] public float[] QD; [System.NonSerialized] public Vector3[] QN; [System.NonSerialized] public int[] QNear;
        private NativeArray<float3> _nP, _nN, _qIn, _qNo;
        private NativeArray<int> _nHead, _nNext, _qNear;
        private NativeArray<int3> _nCell;
        private NativeArray<float> _nSpacing, _qD;
        private int _nBody = -1;
        private static readonly bool CheckBatch = System.Environment.GetEnvironmentVariable("SKIN_CHECK") == "1";
        private static int _checks;

        private void Mirror(int body)
        {
            if (_nBody != body)
            {
                Release();
                _nP = new NativeArray<float3>(body, Allocator.Persistent); _nN = new NativeArray<float3>(body, Allocator.Persistent);
                _nNext = new NativeArray<int>(body, Allocator.Persistent); _nCell = new NativeArray<int3>(body, Allocator.Persistent);
                _nSpacing = new NativeArray<float>(body, Allocator.Persistent); _nHead = new NativeArray<int>(Buckets, Allocator.Persistent);
                _nBody = body;
            }
            NativeArray<Vector3>.Copy(P, 0, _nP.Reinterpret<Vector3>(), 0, body);
            NativeArray<Vector3>.Copy(N, 0, _nN.Reinterpret<Vector3>(), 0, body);
            NativeArray<int>.Copy(_next, 0, _nNext, 0, body);
            NativeArray<Vector3Int>.Copy(_cell, 0, _nCell.Reinterpret<Vector3Int>(), 0, body);
            NativeArray<float>.Copy(_spacing, 0, _nSpacing, 0, body);
            _nHead.CopyFrom(_head);
        }

        private void Release()
        {
            if (_nP.IsCreated) { _nP.Dispose(); _nN.Dispose(); _nNext.Dispose(); _nCell.Dispose(); _nSpacing.Dispose(); _nHead.Dispose(); }
            if (_qIn.IsCreated) { _qIn.Dispose(); _qNo.Dispose(); _qNear.Dispose(); _qD.Dispose(); }
            _nBody = -1;
        }

        private void OnDestroy() => Release();

        /// <summary>Asks <see cref="Depth"/> of points <paramref name="from"/>..<paramref name="to"/> (every
        /// <paramref name="stride"/>th) at once; the answers in <see cref="QD"/>, <see cref="QN"/>, <see cref="QNear"/>.</summary>
        public void DepthRange(int from, int to, int stride = 1)
        {
            if (to <= from || !_nP.IsCreated) return;
            var m = (to - from + stride - 1) / stride;
            if (!_qIn.IsCreated || _qIn.Length < m)
            {
                if (_qIn.IsCreated) { _qIn.Dispose(); _qNo.Dispose(); _qNear.Dispose(); _qD.Dispose(); }
                var cap = Mathf.Max(m, 512);
                _qIn = new NativeArray<float3>(cap, Allocator.Persistent); _qNo = new NativeArray<float3>(cap, Allocator.Persistent);
                _qNear = new NativeArray<int>(cap, Allocator.Persistent); _qD = new NativeArray<float>(cap, Allocator.Persistent);
            }
            if (QD == null || QD.Length != P.Length) { QD = new float[P.Length]; QN = new Vector3[P.Length]; QNear = new int[P.Length]; }
            var qv = _qIn.Reinterpret<Vector3>();
            var k = 0;
            for (var i = from; i < to; i += stride) qv[k++] = P[i];
            new DepthJob { P = _nP, N = _nN, Head = _nHead, Next = _nNext, Cells = _nCell, Spacing = _nSpacing, Q = _qIn, D = _qD, No = _qNo, Near = _qNear, Count = m }.Run();
            var nv = _qNo.Reinterpret<Vector3>();
            k = 0;
            for (var i = from; i < to; i += stride) { QD[i] = _qD[k]; QN[i] = nv[k]; QNear[i] = _qNear[k]; k++; }
            DepthCalls += m;
            if (CheckBatch && _checks < 40)
                for (var i = from; i < to; i += stride)
                {
                    var ok = Depth(P[i], out var d, out var n);
                    var near = Near;
                    if ((ok ? near : -1) != QNear[i] || (ok && (Mathf.Abs(d - QD[i]) > 1e-6f || (n - QN[i]).sqrMagnitude > 1e-10f)))
                    {
                        _checks++;
                        var c = CellOf(P[i]);
                        var kq = (i - from) / stride;
                        var nb = near >= 0 ? near : 0;
                        Debug.Log($"BodySkin batch mismatch {name} point {i} (query {kq} of {m}, at {P[i].x:0.0000},{P[i].y:0.0000},{P[i].z:0.0000}, asked {_qIn[kq].x:0.0000},{_qIn[kq].y:0.0000},{_qIn[kq].z:0.0000}; cell {c}): managed {(ok ? near : -1)} {d:0.000000} {n}, batch {QNear[i]} {QD[i]:0.000000} {QN[i]}; mirrored {_nBody} of {_set.Start[(int)Part.ThighR + 1]}; body point {nb} live {P[nb]} cell {_cell[nb]}, mirror {_nP[nb]} cell {_nCell[nb]}; head live {_head[Hash(_cell[nb].x, _cell[nb].y, _cell[nb].z)]} mirror {_nHead[Hash(_cell[nb].x, _cell[nb].y, _cell[nb].z)]}");
                    }
                }
        }

        /// <summary>The answer <see cref="DepthRange"/> kept for point <paramref name="i"/>, as <see cref="Depth"/> gives it
        /// (and <see cref="Near"/> set as Depth sets it).</summary>
        public bool Got(int i, out float depth, out Vector3 normal)
        {
            Near = QNear[i];
            depth = Near >= 0 ? QD[i] : 0f; normal = Near >= 0 ? QN[i] : Vector3.zero;
            return Near >= 0;
        }

        [BurstCompile(CompileSynchronously = true, FloatMode = FloatMode.Strict, FloatPrecision = FloatPrecision.Standard)]
        private struct DepthJob : IJob
        {
            [ReadOnly] public NativeArray<float3> P, N, Q;
            [ReadOnly] public NativeArray<int> Head, Next;
            [ReadOnly] public NativeArray<int3> Cells;
            [ReadOnly] public NativeArray<float> Spacing;
            public NativeArray<float> D;
            public NativeArray<float3> No;
            public NativeArray<int> Near;
            public int Count;

            public void Execute()
            {
                for (var k = 0; k < Count; k++)
                {
                    var near = One(Q[k], out var d, out var n);
                    D[k] = d; No[k] = n; Near[k] = near;
                }
            }

            private static float Len(float3 v) => math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
            private static float Sq(float3 v) => v.x * v.x + v.y * v.y + v.z * v.z;
            private static float Dot(float3 a, float3 b) => a.x * b.x + a.y * b.y + a.z * b.z;
            // (as Vector3.normalized: divided by its length past 1e-5, else zero)
            private static float3 Norm(float3 v) { var m = Len(v); return m > 1E-05f ? v / m : float3.zero; }

            private float Under(float3 p, int c)
            {
                var v = p - P[c];
                var d = -Dot(v, N[c]);
                if (d <= 0f) return d;
                var across = Len(v + N[c] * d);
                return across <= math.max(math.min(Spacing[c], PatchMax), DeepAcross * d) ? d : -1f;
            }

            private int One(float3 p, out float depth, out float3 normal)
            {
                depth = 0f; normal = float3.zero;
                int c0 = -1, c1 = -1, c2 = -1;
                float d0 = float.MaxValue, d1 = float.MaxValue, d2 = float.MaxValue;
                int cx = (int)math.floor(p.x / Cell), cy = (int)math.floor(p.y / Cell), cz = (int)math.floor(p.z / Cell);
                for (var dx = -1; dx <= 1; dx++)
                    for (var dy = -1; dy <= 1; dy++)
                        for (var dz = -1; dz <= 1; dz++)
                            for (var j = Head[Hash(cx + dx, cy + dy, cz + dz)]; j >= 0; j = Next[j])
                            {
                                if (j == c0 || j == c1 || j == c2) continue;
                                var cj = Cells[j];
                                if (cj.x != cx + dx || cj.y != cy + dy || cj.z != cz + dz) continue;
                                var d = Sq(P[j] - p);
                                if (d >= d2) continue;
                                if (d < d0) { c2 = c1; d2 = d1; c1 = c0; d1 = d0; c0 = j; d0 = d; }
                                else if (d < d1) { c2 = c1; d2 = d1; c1 = j; d1 = d; }
                                else { c2 = j; d2 = d; }
                            }
                if (c0 < 0) return -1;
                float u0 = Under(p, c0), u1 = c1 >= 0 ? Under(p, c1) : -1f, u2 = c2 >= 0 ? Under(p, c2) : -1f;
                var ins = (u0 > 0f ? 1 : 0) + (u1 > 0f ? 1 : 0) + (u2 > 0f ? 1 : 0);
                var inside = ins >= 2 ? math.min(u0 > 0f ? u0 : float.MaxValue, math.min(u1 > 0f ? u1 : float.MaxValue, u2 > 0f ? u2 : float.MaxValue)) : -1f;
                var nn = N[c0] + (c1 >= 0 ? N[c1] : float3.zero) + (c2 >= 0 ? N[c2] : float3.zero);
                normal = Sq(nn) > 1e-8f ? Norm(nn) : N[c0];
                var v0 = p - P[c0];
                var plane = Dot(v0, N[c0]);
                var across = math.sqrt(math.max(0f, Sq(v0) - plane * plane));
                var patch = 0.5f * math.min(Spacing[c0], PatchMax);
                var gap = across <= patch ? math.abs(plane) : math.sqrt((across - patch) * (across - patch) + plane * plane);
                depth = inside > 0f ? inside : -gap;
                return c0;
            }
        }

        public bool Depth(Vector3 p, out float depth, out Vector3 normal)
        {
            DepthCalls++;
            Near = -1;
            depth = 0f; normal = Vector3.zero;
            int c0 = -1, c1 = -1, c2 = -1;
            float d0 = float.MaxValue, d1 = float.MaxValue, d2 = float.MaxValue;
            var c = CellOf(p);
            for (var dx = -1; dx <= 1; dx++)
                for (var dy = -1; dy <= 1; dy++)
                    for (var dz = -1; dz <= 1; dz++)
                        for (var j = _head[Hash(c.x + dx, c.y + dy, c.z + dz)]; j >= 0; j = _next[j])
                        {
                            if (j == c0 || j == c1 || j == c2) continue;
                            var cj = _cell[j];
                            if (cj.x != c.x + dx || cj.y != c.y + dy || cj.z != c.z + dz) continue;   // another cell in the bucket
                            var d = (P[j] - p).sqrMagnitude;
                            if (d >= d2) continue;
                            if (d < d0) { c2 = c1; d2 = d1; c1 = c0; d1 = d0; c0 = j; d0 = d; }
                            else if (d < d1) { c2 = c1; d2 = d1; c1 = j; d1 = d; }
                            else { c2 = j; d2 = d; }
                        }
            if (c0 < 0) return false;
            Near = c0;
            // inside only behind each of the three, and over it, not beside it: a point beside the top of a shoulder or
            // below a hem is behind their planes and outside the body (such false contacts pushed arms out, 2026-11-06)
            // (a point stands for a patch of skin no wider than PatchMax, however far its neighbours: a lone point on the
            // upper back, 17 cm from them, read an upper arm swinging 14 cm out to the side as inside the torso and pushed
            // it out to 41-44°, W3 and A1, 2026-11-06; 4 cm lost hands 3 cm into thighs whose points stand 4 cm apart)
            float Under(int c)
            {
                var v = p - P[c];
                var d = -Vector3.Dot(v, N[c]);
                if (d <= 0f) return d;
                var across = (v + N[c] * d).magnitude;
                // (and as far across as 2.2 times as deep: under the arm the chest's wall turns in, and an upper arm 1.6 cm
                // behind its plane lay 3.2 cm across from its nearest point, read as outside, C1, 2026-11-06)
                return across <= Mathf.Max(Mathf.Min(_spacing[c], PatchMax), DeepAcross * d) ? d : -1f;
            }
            // inside when two of the three say so (the linings that called for all three are left out of the skin now; with
            // points 1.5-2.5 cm apart one of three often lay on another facet, a vest's edge, and hid upper arms 1.5-2 cm in
            // under the arm, C1, 2026-11-06)
            float u0 = Under(c0), u1 = c1 >= 0 ? Under(c1) : -1f, u2 = c2 >= 0 ? Under(c2) : -1f;
            var ins = (u0 > 0f ? 1 : 0) + (u1 > 0f ? 1 : 0) + (u2 > 0f ? 1 : 0);
            var inside = ins >= 2 ? Mathf.Min(u0 > 0f ? u0 : float.MaxValue, Mathf.Min(u1 > 0f ? u1 : float.MaxValue, u2 > 0f ? u2 : float.MaxValue)) : -1f;
            var nn = N[c0] + (c1 >= 0 ? N[c1] : Vector3.zero) + (c2 >= 0 ? N[c2] : Vector3.zero);
            normal = nn.sqrMagnitude > 1e-8f ? nn.normalized : N[c0];
            // outside: the gap to the surface's plane at the nearest point (never more than to the point itself)
            // outside: the gap to the patch of skin the nearest point stands for (a disc in its plane, half its spacing
            // across): its whole plane read a hand hanging below a buttock or before a thigh as touching it, 2026-11-06
            var v0 = p - P[c0];
            var plane = Vector3.Dot(v0, N[c0]);
            var across = Mathf.Sqrt(Mathf.Max(0f, v0.sqrMagnitude - plane * plane));
            var patch = 0.5f * Mathf.Min(_spacing[c0], PatchMax);
            var gap = across <= patch ? Mathf.Abs(plane) : Mathf.Sqrt((across - patch) * (across - patch) + plane * plane);
            depth = inside > 0f ? inside : -gap;
            return true;
        }

        /// <summary>For the gate's report: the three nearest points <see cref="Depth"/> judges <paramref name="p"/> by, each with
        /// its part, place relative to <paramref name="origin"/> in <paramref name="frame"/> (cm), normal, clothes' offset,
        /// spacing and its verdict (cm behind its plane, or "out").</summary>
        public string ExplainDepth(Vector3 p, Vector3 origin, Quaternion frame)
        {
            if (!Ready) return "not ready";
            int c0 = -1, c1 = -1, c2 = -1;
            float d0 = float.MaxValue, d1 = float.MaxValue, d2 = float.MaxValue;
            var c = CellOf(p);
            for (var dx = -1; dx <= 1; dx++)
                for (var dy = -1; dy <= 1; dy++)
                    for (var dz = -1; dz <= 1; dz++)
                        for (var j = _head[Hash(c.x + dx, c.y + dy, c.z + dz)]; j >= 0; j = _next[j])
                        {
                            if (j == c0 || j == c1 || j == c2) continue;
                            var cj = _cell[j];
                            if (cj.x != c.x + dx || cj.y != c.y + dy || cj.z != c.z + dz) continue;
                            var d = (P[j] - p).sqrMagnitude;
                            if (d >= d2) continue;
                            if (d < d0) { c2 = c1; d2 = d1; c1 = c0; d1 = d0; c0 = j; d0 = d; }
                            else if (d < d1) { c2 = c1; d2 = d1; c1 = j; d1 = d; }
                            else { c2 = j; d2 = d; }
                        }
            var inv = Quaternion.Inverse(frame);
            var parts = new System.Collections.Generic.List<string>();
            foreach (var k in new[] { c0, c1, c2 })
            {
                if (k < 0) { parts.Add("none"); continue; }
                var v = p - P[k];
                var dd = -Vector3.Dot(v, N[k]);
                var across = (v + N[k] * dd).magnitude;
                var lim = Mathf.Max(Mathf.Min(_spacing[k], PatchMax), DeepAcross * dd);
                var verdict = dd <= 0f ? "out" : across <= lim ? $"in {dd * 100f:0.0}" : $"beside ({across * 100f:0.0} > {lim * 100f:0.0})";
                var r = inv * (P[k] - origin) * 100f; var nn = inv * N[k];
                parts.Add($"{PartOf(k)} {k} ({r.x:0},{r.y:0},{r.z:0}) n ({nn.x:0.0},{nn.y:0.0},{nn.z:0.0}) off {Off(k) * 100f:0.0} sp {_spacing[k] * 100f:0.0} {Mathf.Sqrt((P[k] - p).sqrMagnitude) * 100f:0.0} cm away: {verdict}");
            }
            return string.Join(" | ", parts);
        }

        /// <summary>The nearest point of the hips and thighs to <paramref name="p"/> (index; -1 none) and its distance.</summary>
        public float NearestLow(Vector3 p, out int at, int stride = 2)
        {
            at = -1;
            var best = float.MaxValue;
            var body = _set.Start[(int)Part.ThighR + 1];
            for (var j = 0; j < body; j += stride)
            {
                if ((_set.Flags[j] & LowFlag) == 0) continue;
                var d = (P[j] - p).sqrMagnitude;
                if (d < best) { best = d; at = j; }
            }
            return at >= 0 ? Mathf.Sqrt(best) : float.MaxValue;
        }
    }
}
