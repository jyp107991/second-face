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
    /// body, 1.2 cm of the hand, 1.8 cm of the arm, and every arm vertex that stands out of its cell's point's plane by more
    /// than the resting give), each skinned to its two strongest bones and posed every frame from the
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
            /// <summary>RBS6: the drawn body (the torso's and thighs' own triangles as the gate takes them): the bones that skin
            /// it and their bind poses (by bone index), each vertex's index in the mesh, its place in the mesh, its bones and
            /// weights (four slots, strongest first, <see cref="DK"/> of them used), the layers over it, how far it faces sideways,
            /// the flank corrective's delta; each triangle's corners and whether its face is turned against its winding; each
            /// vertex's welded id (split vertices at one place are one), each welded vertex's triangles; and a bounding volume
            /// hierarchy over the triangles (built in the bind pose, refitted each pose).</summary>
            public int DN, DT;
            public int[] DBones;
            public Matrix4x4[] DBind;
            public int[] DMesh, DK, DFanStart, DFan, DWeld;
            public Vector3[] DPos, DDelta;
            public int4[] DB; public float4[] DW;
            public uint[] DMask; public byte[] DSide, DFlank, DFlip;
            public int3[] DTri;
            public int[] HLeft, HRight, HStart, HCount, HOrder;
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
        /// <summary>For the gate's report: how far the flank corrective moves point <paramref name="i"/> at full weight (m; 0 none).</summary>
        public float FlankMove(int i) => _set != null && _set.FlankSide != null && i >= 0 && i < _set.FlankSide.Length && _set.FlankSide[i] != 0 ? _set.D0[i].magnitude : 0f;

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
            ReleaseDrawn();
            var anim = GetComponent<Animator>() ?? GetComponentInParent<Animator>();
            _hipsT = anim != null && anim.isHuman ? anim.GetBoneTransform(HumanBodyBones.Hips) : null;
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
                if (magic != "RBS1" && magic != "RBS2" && magic != "RBS3" && magic != "RBS4" && magic != "RBS6") throw new InvalidDataException("not a body skin");
                var v2 = magic != "RBS1";   // each layer's thinning at the sides, and each point's facing sideways
                var v6 = magic == "RBS6";   // the drawn body
                var v4 = magic == "RBS4" || v6;   // every bone that moves a point
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
                if (v6)
                {
                    var nb = r.ReadInt32();
                    s.DBones = new int[nb];
                    var binds = new Matrix4x4[nb];
                    var maxB = 0;
                    for (var k = 0; k < nb; k++)
                    {
                        s.DBones[k] = r.ReadByte();
                        var m = new Matrix4x4();
                        for (var e = 0; e < 16; e++) m[e] = r.ReadSingle();
                        binds[k] = m; maxB = Mathf.Max(maxB, s.DBones[k]); used.Add(s.DBones[k]);
                    }
                    s.DBind = new Matrix4x4[maxB + 1];
                    for (var k = 0; k < nb; k++) s.DBind[s.DBones[k]] = binds[k];
                    var dn = r.ReadInt32(); s.DN = dn;
                    s.DMesh = new int[dn]; s.DPos = new Vector3[dn]; s.DK = new int[dn]; s.DB = new int4[dn]; s.DW = new float4[dn];
                    s.DMask = new uint[dn]; s.DSide = new byte[dn]; s.DFlank = new byte[dn]; s.DDelta = new Vector3[dn];
                    for (var i = 0; i < dn; i++)
                    {
                        s.DMesh[i] = r.ReadInt32(); s.DPos[i] = V();
                        int k = r.ReadByte();
                        var b4 = int4.zero; var w4 = float4.zero;
                        for (var x = 0; x < k; x++) { int b = r.ReadByte(); var wt = r.ReadSingle(); if (x < 4) { b4[x] = b; w4[x] = wt; } }
                        s.DK[i] = Mathf.Min(k, 4); s.DB[i] = b4; s.DW[i] = w4;
                        s.DMask[i] = r.ReadUInt32(); s.DSide[i] = r.ReadByte(); s.DFlank[i] = r.ReadByte();
                        if (s.DFlank[i] != 0) s.DDelta[i] = V();
                    }
                    var dt = r.ReadInt32(); s.DT = dt;
                    s.DTri = new int3[dt]; s.DFlip = new byte[dt];
                    for (var t = 0; t < dt; t++) { s.DTri[t] = new int3(r.ReadInt32(), r.ReadInt32(), r.ReadInt32()); s.DFlip[t] = r.ReadByte(); }
                    DrawnTopology(s);
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
            // (the drawn body's corners stand out by the same rule: the layered surface is the drawn one, out by the clothes)
            if (_set.DN > 0)
            {
                if (_dOffM == null || _dOffM.Length != _set.DN) _dOffM = new float[_set.DN];
                for (var i = 0; i < _set.DN; i++)
                {
                    var m = _set.DMask[i] & worn;
                    var off = 0f;
                    var side = _set.DSide[i] / 255f;
                    for (var k = 0; m != 0; k++, m >>= 1)
                        if ((m & 1) != 0) off = Mathf.Max(off, _set.ThinSides[k] ? Mathf.Lerp(thick[k], Mathf.Min(thick[k], SideThick), side) : thick[k]);
                    _dOffM[i] = off;
                }
                _dOffDirty = true;
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
            _pose++;
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
        /// <summary>How far across from a point, as a multiple of how deep behind its plane, a point is still read as under it,
        /// and never further than <see cref="DeepAcrossMax"/> (m): unbounded, arm points by the armpit 6-10 cm from the vests'
        /// points, 2.5-6 cm behind their planes and 5-8.5 cm across, read as inside and held the gear-held men's arms out at
        /// 30-40°, A1, 2026-11-08 (the case it was for: 1.6 cm deep, 3.2 cm across).</summary>
        public const float DeepAcross = 3f, DeepAcrossMax = 0.04f;

        /// <summary>For the gate's report: how often <see cref="Depth"/> was asked, and how often the robust reading's passes ran.</summary>
        [System.NonSerialized] public long DepthCalls, RobustRuns, DepthKept;
        // (each asked point's place when it was last asked, and the pose it was asked against: the same place against the same
        // posed body is the same answer, so it is not reckoned again)
        private Vector3[] _askedAt; private int[] _askedPose; private int[] _askIdx; private int _pose = 1;

        // ---- many points at once (the arm clearance asks thousands a frame: 12-14 ms a person in the editor, 2026-11-08):
        // the body's points, their filing and spacing mirrored once a frame, and a range of points asked in one Burst job,
        // which reckons exactly as Depth does (the same filing, the same three nearest, the same tests, Vector3's own
        // normalising), each point's answer kept by its index
        /// <summary>After <see cref="DepthRange"/>: each asked point's depth, normal and nearest body point (-1: none near,
        /// Depth's false).</summary>
        [System.NonSerialized] public float[] QD; [System.NonSerialized] public Vector3[] QN; [System.NonSerialized] public int[] QNear;
        private NativeArray<float3> _nP, _nN, _qIn, _qNo;
        private NativeArray<int> _nHead, _nNext, _qNear, _runs;
        private NativeArray<int3> _nCell;
        private NativeArray<float> _nSpacing, _qD;
        private NativeArray<byte> _nFlags;
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
                _nFlags = new NativeArray<byte>(body, Allocator.Persistent);
                _nBody = body;
            }
            NativeArray<Vector3>.Copy(P, 0, _nP.Reinterpret<Vector3>(), 0, body);
            NativeArray<Vector3>.Copy(N, 0, _nN.Reinterpret<Vector3>(), 0, body);
            NativeArray<int>.Copy(_next, 0, _nNext, 0, body);
            NativeArray<Vector3Int>.Copy(_cell, 0, _nCell.Reinterpret<Vector3Int>(), 0, body);
            NativeArray<float>.Copy(_spacing, 0, _nSpacing, 0, body);
            NativeArray<byte>.Copy(_set.Flags, 0, _nFlags, 0, body);
            _nHead.CopyFrom(_head);
        }

        private void Release()
        {
            if (_nP.IsCreated) { _nP.Dispose(); _nN.Dispose(); _nNext.Dispose(); _nCell.Dispose(); _nSpacing.Dispose(); _nHead.Dispose(); _nFlags.Dispose(); }
            if (_qIn.IsCreated) { _qIn.Dispose(); _qNo.Dispose(); _qNear.Dispose(); _qD.Dispose(); }
            if (_runs.IsCreated) _runs.Dispose();
            _nBody = -1;
        }

        private void OnDestroy() { Release(); ReleaseDrawn(); }

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
            if (QD == null || QD.Length != P.Length) { QD = new float[P.Length]; QN = new Vector3[P.Length]; QNear = new int[P.Length]; _askedAt = new Vector3[P.Length]; _askedPose = new int[P.Length]; }
            if (_askIdx == null || _askIdx.Length < m) _askIdx = new int[Mathf.Max(m, 512)];
            var qv = _qIn.Reinterpret<Vector3>();
            var k = 0;
            for (var i = from; i < to; i += stride)
            {
                var at = P[i]; var was = _askedAt[i];
                if (_askedPose[i] == _pose && at.x == was.x && at.y == was.y && at.z == was.z) continue;
                _askIdx[k] = i; qv[k++] = at;
            }
            DepthCalls += m; DepthKept += m - k;
            if (k == 0) return;
            if (!_runs.IsCreated) _runs = new NativeArray<int>(1, Allocator.Persistent);
            _runs[0] = 0;
            // (with the drawn body the robust reading is not run: every point within its band is read again against the drawn
            // triangles, which answer exactly where the robust surface was an estimate)
            new DepthJob { P = _nP, N = _nN, Head = _nHead, Next = _nNext, Cells = _nCell, Spacing = _nSpacing, Flags = _nFlags, Q = _qIn, D = _qD, No = _qNo, Near = _qNear, Runs = _runs, Count = k, UseRobust = DrawnOn ? 0 : 1 }.Run();
            RobustRuns += _runs[0];
            var nv = _qNo.Reinterpret<Vector3>();
            for (var j = 0; j < k; j++) { var i = _askIdx[j]; QD[i] = _qD[j]; QN[i] = nv[j]; QNear[i] = _qNear[j]; _askedAt[i] = qv[j]; _askedPose[i] = _pose; }
            if (DrawnOn) DrawnRange(k);
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
            [ReadOnly] public NativeArray<byte> Flags;
            public NativeArray<float> D;
            public NativeArray<float3> No;
            public NativeArray<int> Near;
            public NativeArray<int> Runs;
            public int Count;
            /// <summary>The robust reading in the low band (0 with the drawn body).</summary>
            public int UseRobust;

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
                return across <= math.max(math.min(Spacing[c], PatchMax), math.min(DeepAcross * d, DeepAcrossMax)) ? d : -1f;
            }

            // (as BodySkin.Robust, point for point in the same order: the points within its reach, from the cells its reach
            // touches, in the nearest-three search's order of cells and points; the sign test as they are gathered)
            private float Robust(float3 p, int c0, out bool ok, out bool ran, out float3 grad)
            {
                grad = float3.zero;
                var h = math.clamp(Spacing[c0], SurfaceHMin, SurfaceHMax);
                var reach = math.min(SurfaceReach * h, Cell); var reach2 = reach * reach; var ih2 = 1f / (h * h);
                var isr2 = 1f / (RobustResidual * RobustResidual * h * h); var isn2 = 1f / (RobustNormal * RobustNormal);
                var f = 0f; var g = float3.zero; ok = false; ran = false;
                var nb = new FixedList512Bytes<int>(); var r2s = new FixedList512Bytes<float>();
                var behind = false;
                int x0 = (int)math.floor((p.x - reach) / Cell), x1 = (int)math.floor((p.x + reach) / Cell);
                int y0 = (int)math.floor((p.y - reach) / Cell), y1 = (int)math.floor((p.y + reach) / Cell);
                int z0 = (int)math.floor((p.z - reach) / Cell), z1 = (int)math.floor((p.z + reach) / Cell);
                for (var x = x0; x <= x1; x++)
                    for (var y = y0; y <= y1; y++)
                        for (var z = z0; z <= z1; z++)
                            for (var j = Head[Hash(x, y, z)]; j >= 0; j = Next[j])
                            {
                                var cj = Cells[j];
                                if (cj.x != x || cj.y != y || cj.z != z) continue;
                                var d = Sq(P[j] - p);
                                if (d > reach2 || nb.Length >= RobustMax) continue;
                                nb.Add(j); r2s.Add(d);
                                if (!behind && Dot(p - P[j], N[j]) < 0f) behind = true;
                            }
                if (nb.Length == 0) return 0f;
                // a weighted mean of no plane distance below nought is none either: outside, without the passes
                if (!behind) { ok = true; return 0f; }
                ran = true;
                for (var it = 0; it < RobustIters; it++)
                {
                    float sw = 0f, sf = 0f; float3 sg = float3.zero, sgf = float3.zero, sn = float3.zero;
                    for (var k = 0; k < nb.Length; k++)
                    {
                        var r2 = r2s[k];
                        var j = nb[k];
                        var px = p - P[j];
                        var nj = N[j];
                        var fx = Dot(px, nj);
                        var e = fx - f; var dn = nj - g;
                        var w = it > 0 ? math.exp(-r2 * ih2 - e * e * isr2 - Sq(dn) * isn2) : math.exp(-r2 * ih2);
                        var dw = px * (-2f * w * ih2);
                        sw += w; sf += w * fx; sg += dw; sgf += dw * fx; sn += nj * w;
                    }
                    if (sw <= 1e-20f) break;
                    f = sf / sw; g = (sgf - sg * f + sn) / sw; ok = true;
                }
                grad = g;
                return f;
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
                var hr = math.clamp(Spacing[c0], SurfaceHMin, SurfaceHMax); var rr = math.min(SurfaceReach * hr, Cell);
                var grad = float3.zero;
                if (UseRobust != 0 && (Flags[c0] & LowFlag) != 0 && d0 <= rr * rr && math.abs(Dot(p - P[c0], N[c0])) <= hr)
                {
                    var f = Robust(p, c0, out var ok, out var ran, out grad);
                    if (ok) inside = f < 0f ? math.max(-f, DeepMin) : -1f;
                    if (ran) Runs[0]++;
                    if (!ran || !(inside > 0f)) grad = float3.zero;
                }
                var nn = N[c0] + (c1 >= 0 ? N[c1] : float3.zero) + (c2 >= 0 ? N[c2] : float3.zero);
                normal = Sq(grad) > 1e-8f ? Norm(grad) : Sq(nn) > 1e-8f ? Norm(nn) : N[c0];
                var v0 = p - P[c0];
                var plane = Dot(v0, N[c0]);
                var across = math.sqrt(math.max(0f, Sq(v0) - plane * plane));
                var patch = 0.5f * math.min(Spacing[c0], PatchMax);
                var gap = across <= patch ? math.abs(plane) : math.sqrt((across - patch) * (across - patch) + plane * plane);
                depth = inside > 0f ? inside : -gap;
                return c0;
            }
        }

        // ---- the drawn body (RBS6): an arm's depth read from the surface that is drawn ----
        // The points above read the body's surface from samples of it: the least of the three nearest points' planes, which
        // under-reads where the skin turns in (a resting forearm 0.53 cm into a waist under the ribs read 0.41 cm against the
        // layered 0.93, the nearest planes 0.41/0.56/1.42 cm, C1, Male_Adult_02, thirteen resting states, 2026-11-26), and every
        // reading of a point cloud (planes, IMLS, RIMLS) errs at concave or sharp places. Here the body's own vertices in the
        // torso and thighs are posed as the mesh is drawn (its own bones and weights, its flank correctives, the quality's bone
        // count) and an arm point near the body is read against its triangles: the nearest point on them (exact), inside by the
        // angle-weighted pseudo-normal of the nearest feature (Baerentzen and Aanaes 2005, IEEE TVCG 11(3), exact on a closed
        // surface), confirmed by the gate's own test (three level rays, odd crossings within 0.8 m), and out by the clothes over
        // the nearest point (the corners' layers, interpolated). The vote above still answers for points beyond DrawnBand.

        /// <summary>The drawn reading answers for an asked point the vote reads deeper than this outside the body (m), and finds a
        /// triangle within <see cref="DrawnReach"/> of it (m).</summary>
        public const float DrawnBand = 0.025f, DrawnReach = 0.06f;
        // TEMP (A/B only; never committed): SKIN_DRAWN=off reads by the vote alone (the everyday screen sets it per config)
        private static bool DrawnOff = System.Environment.GetEnvironmentVariable("SKIN_DRAWN") == "off";
        private bool DrawnOn => !DrawnOff && _set != null && _set.DN > 0 && _set.DT > 0;
        /// <summary>For reports: drawn readings asked, found within reach, inside, inside by the face and refused by the rays;
        /// the time the drawn body's posing and its readings have taken (ms) and how often it was posed.</summary>
        [System.NonSerialized] public long DrawnAsks, DrawnFound, DrawnInside, DrawnRefused;
        [System.NonSerialized] public double DrawnPoseMs, DrawnReadMs; [System.NonSerialized] public int DrawnPoses;
        private readonly System.Diagnostics.Stopwatch _drawnCost = new();
        private Transform _hipsT;
        private float[] _dOffM; private bool _dOffDirty = true;
        private int _drawnAt = -1;
        private NativeArray<float3> _dPos, _dDelta, _dV, _hLo, _hHi, _dq, _dqN;
        private NativeArray<int4> _dB; private NativeArray<float4> _dW;
        private NativeArray<int> _dK, _dWeld, _dFanStart, _dFan, _hLeft, _hRight, _hStart, _hCount, _hOrder, _dqF;
        private NativeArray<byte> _dFl, _dFlip;
        private NativeArray<int3> _dTri;
        private NativeArray<float4x4> _dM;
        private NativeArray<float> _dOff, _dqL, _dqB;
        private int[] _dqIdx;

        private const int HLeaf = 4;

        /// <summary>The drawn body's welded corners, their triangles, and its bounding volume hierarchy (median splits on the
        /// longest axis of the triangles' centres in the bind pose; each node after its parent, so a refit runs backwards).</summary>
        private static void DrawnTopology(Set s)
        {
            var weld = new Dictionary<Vector3, int>();
            s.DWeld = new int[s.DN];
            for (var i = 0; i < s.DN; i++)
            {
                if (!weld.TryGetValue(s.DPos[i], out var w)) { w = weld.Count; weld[s.DPos[i]] = w; }
                s.DWeld[i] = w;
            }
            var nw = weld.Count;
            var cnt = new int[nw + 1];
            for (var t = 0; t < s.DT; t++) { var c = s.DTri[t]; cnt[s.DWeld[c.x]]++; if (s.DWeld[c.y] != s.DWeld[c.x]) cnt[s.DWeld[c.y]]++; if (s.DWeld[c.z] != s.DWeld[c.x] && s.DWeld[c.z] != s.DWeld[c.y]) cnt[s.DWeld[c.z]]++; }
            s.DFanStart = new int[nw + 1];
            for (var w = 0; w < nw; w++) s.DFanStart[w + 1] = s.DFanStart[w] + cnt[w];
            s.DFan = new int[s.DFanStart[nw]];
            var fill = new int[nw];
            for (var t = 0; t < s.DT; t++)
            {
                var c = s.DTri[t];
                int a = s.DWeld[c.x], b = s.DWeld[c.y], d = s.DWeld[c.z];
                s.DFan[s.DFanStart[a] + fill[a]++] = t;
                if (b != a) s.DFan[s.DFanStart[b] + fill[b]++] = t;
                if (d != a && d != b) s.DFan[s.DFanStart[d] + fill[d]++] = t;
            }
            var cen = new Vector3[s.DT];
            for (var t = 0; t < s.DT; t++) { var c = s.DTri[t]; cen[t] = (s.DPos[c.x] + s.DPos[c.y] + s.DPos[c.z]) / 3f; }
            var order = new int[s.DT];
            for (var t = 0; t < s.DT; t++) order[t] = t;
            List<int> left = new(), right = new(), start = new(), count = new();
            int Node(int from, int to)
            {
                var id = left.Count;
                left.Add(-1); right.Add(-1); start.Add(from); count.Add(to - from);
                if (to - from <= HLeaf) return id;
                var lo = Vector3.one * float.MaxValue; var hi = -lo;
                for (var e = from; e < to; e++) { lo = Vector3.Min(lo, cen[order[e]]); hi = Vector3.Max(hi, cen[order[e]]); }
                var ext = hi - lo;
                var axis = ext.x >= ext.y && ext.x >= ext.z ? 0 : ext.y >= ext.z ? 1 : 2;
                System.Array.Sort(order, from, to - from, Comparer<int>.Create((x, y) => cen[x][axis].CompareTo(cen[y][axis])));
                var mid = (from + to) / 2;
                var l = Node(from, mid);
                var r = Node(mid, to);
                left[id] = l; right[id] = r; count[id] = 0;
                return id;
            }
            if (s.DT > 0) Node(0, s.DT);
            s.HLeft = left.ToArray(); s.HRight = right.ToArray(); s.HStart = start.ToArray(); s.HCount = count.ToArray(); s.HOrder = order;
        }

        private void ReleaseDrawn()
        {
            if (_dPos.IsCreated)
            {
                _dPos.Dispose(); _dDelta.Dispose(); _dV.Dispose(); _hLo.Dispose(); _hHi.Dispose(); _dB.Dispose(); _dW.Dispose(); _dK.Dispose();
                _dWeld.Dispose(); _dFanStart.Dispose(); _dFan.Dispose(); _hLeft.Dispose(); _hRight.Dispose(); _hStart.Dispose(); _hCount.Dispose();
                _hOrder.Dispose(); _dFl.Dispose(); _dFlip.Dispose(); _dTri.Dispose(); _dM.Dispose(); _dOff.Dispose();
            }
            if (_dq.IsCreated) { _dq.Dispose(); _dqN.Dispose(); _dqF.Dispose(); _dqL.Dispose(); _dqB.Dispose(); }
            _drawnAt = -1; _dOffDirty = true;
        }

        /// <summary>The drawn body posed from the bones as they are now (once a pose): its vertices skinned as the mesh is drawn,
        /// the hierarchy's boxes refitted.</summary>
        private void EnsureDrawn()
        {
            if (_drawnAt == _pose && _dPos.IsCreated) return;
            _drawnCost.Restart();
            var s = _set;
            if (!_dPos.IsCreated)
            {
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
            if (_dOffDirty) { if (_dOffM != null && _dOffM.Length == s.DN) _dOff.CopyFrom(_dOffM); else for (var i = 0; i < s.DN; i++) _dOff[i] = 0f; _dOffDirty = false; }
            foreach (var b in s.DBones) _dM[b] = _bones[b].localToWorldMatrix * s.DBind[b];
            // the bones the GPU blends a vertex by: the renderer's own quality, else the project's (the editor's tier 4, the
            // phone's Vulkan tier 2)
            var q = Body != null && Body.quality != SkinQuality.Auto ? (int)Body.quality : (int)QualitySettings.skinWeights;
            new DrawnPoseJob
            {
                Pos = _dPos, Delta = _dDelta, B = _dB, W = _dW, K = _dK, Flank = _dFl, M = _dM, Tri = _dTri,
                Left = _hLeft, Right = _hRight, Start = _hStart, Cnt = _hCount, Order = _hOrder, Out = _dV, Lo = _hLo, Hi = _hHi,
                FlankL = FlankL, FlankR = FlankR, KMax = Mathf.Clamp(q, 1, 4),
            }.Run();
            _drawnAt = _pose;
            DrawnPoses++;
            DrawnPoseMs += _drawnCost.Elapsed.TotalMilliseconds;
        }

        private void DrawnQueries(int m)
        {
            if (!_dq.IsCreated || _dq.Length < m)
            {
                if (_dq.IsCreated) { _dq.Dispose(); _dqN.Dispose(); _dqF.Dispose(); _dqL.Dispose(); _dqB.Dispose(); }
                var cap = Mathf.Max(m, 256);
                _dq = new NativeArray<float3>(cap, Allocator.Persistent); _dqN = new NativeArray<float3>(cap, Allocator.Persistent);
                _dqF = new NativeArray<int>(cap, Allocator.Persistent); _dqL = new NativeArray<float>(cap, Allocator.Persistent); _dqB = new NativeArray<float>(cap, Allocator.Persistent);
            }
        }

        private void RunDrawn(int m, bool alwaysRays)
        {
            var hips = _hipsT != null ? _hipsT.position : transform.position;
            new DrawnJob
            {
                V = _dV, Lo = _hLo, Hi = _hHi, Q = _dq, Tri = _dTri, Flip = _dFlip, Left = _hLeft, Right = _hRight, Start = _hStart, Cnt = _hCount,
                Order = _hOrder, Weld = _dWeld, FanStart = _dFanStart, Fan = _dFan, Off = _dOff, Layered = _dqL, Bare = _dqB, Normal = _dqN, Found = _dqF,
                Hips = hips, Right3 = transform.right, Reach = DrawnReach, Count = m, AlwaysRays = alwaysRays ? 1 : 0,
            }.Run();
        }

        /// <summary>After the vote's batch: every asked point it reads within <see cref="DrawnBand"/> of the body (or inside) read
        /// again against the drawn body, which answers where it finds a triangle within reach.</summary>
        private void DrawnRange(int k)
        {
            var m = 0;
            if (_dqIdx == null || _dqIdx.Length < k) _dqIdx = new int[Mathf.Max(k, 256)];
            for (var j = 0; j < k; j++)
            {
                var i = _askIdx[j];
                if (QNear[i] < 0 || QD[i] <= -DrawnBand) continue;
                _dqIdx[m++] = i;
            }
            if (m == 0) return;
            EnsureDrawn();
            _drawnCost.Restart();
            DrawnQueries(m);
            var qv = _dq.Reinterpret<Vector3>();
            for (var j = 0; j < m; j++) qv[j] = P[_dqIdx[j]];
            RunDrawn(m, false);
            var nv = _dqN.Reinterpret<Vector3>();
            for (var j = 0; j < m; j++)
            {
                var f = _dqF[j];
                DrawnAsks++;
                if ((f & 1) == 0) continue;
                DrawnFound++;
                if ((f & 2) != 0 && (f & 4) == 0) DrawnRefused++;
                var i = _dqIdx[j];
                QD[i] = _dqL[j]; QN[i] = nv[j];
                if (QD[i] > 0f) DrawnInside++;
            }
            DrawnReadMs += _drawnCost.Elapsed.TotalMilliseconds;
        }

        /// <summary>One point read against the drawn body (as <see cref="DrawnRange"/> reads each).</summary>
        private void DrawnOne(Vector3 p, ref float depth, ref Vector3 normal)
        {
            EnsureDrawn();
            DrawnQueries(1);
            _dq[0] = p;
            RunDrawn(1, false);
            if ((_dqF[0] & 1) == 0) return;
            depth = _dqL[0]; normal = _dqN[0];
        }

        /// <summary>For probes: point <paramref name="p"/> against the drawn body: its signed depth in the bare body (m, positive
        /// inside), in the layered body, whether the nearest feature's face and the gate's rays each say inside (the rays asked
        /// whatever the face says), and false when no triangle is within reach.</summary>
        public bool DrawnRead(Vector3 p, out float bare, out float layered, out bool faceIn, out bool rayIn)
        {
            bare = layered = 0f; faceIn = rayIn = false;
            if (_set == null || _set.DN == 0 || _set.DT == 0 || !Ready) return false;
            EnsureDrawn();
            DrawnQueries(1);
            _dq[0] = p;
            RunDrawn(1, true);
            var f = _dqF[0];
            if ((f & 1) == 0) return false;
            bare = _dqB[0]; layered = _dqL[0]; faceIn = (f & 2) != 0; rayIn = (f & 4) != 0;
            return true;
        }

        /// <summary>For probes: the drawn body's vertices posed from the bones as they are now against the drawn mesh's own
        /// (<paramref name="world"/>: every vertex of the body's mesh, baked, in the world): the largest and the mean distance (m).</summary>
        public float DrawnPoseError(Vector3[] world, out float mean)
        {
            mean = 0f;
            if (_set == null || _set.DN == 0 || !Ready) return -1f;
            _drawnAt = -1;
            EnsureDrawn();
            var worst = 0f; var sum = 0.0;
            for (var i = 0; i < _set.DN; i++)
            {
                var e = Vector3.Distance((Vector3)_dV[i], world[_set.DMesh[i]]);
                worst = Mathf.Max(worst, e); sum += e;
            }
            mean = (float)(sum / _set.DN);
            return worst;
        }
        public int DrawnCount => _set?.DN ?? 0;

        [BurstCompile(CompileSynchronously = true, FloatMode = FloatMode.Strict, FloatPrecision = FloatPrecision.Standard)]
        private struct DrawnPoseJob : IJob
        {
            [ReadOnly] public NativeArray<float3> Pos, Delta;
            [ReadOnly] public NativeArray<int4> B;
            [ReadOnly] public NativeArray<float4> W;
            [ReadOnly] public NativeArray<int> K, Left, Right, Start, Cnt, Order;
            [ReadOnly] public NativeArray<byte> Flank;
            [ReadOnly] public NativeArray<float4x4> M;
            [ReadOnly] public NativeArray<int3> Tri;
            public NativeArray<float3> Out, Lo, Hi;
            public float FlankL, FlankR;
            public int KMax;

            public void Execute()
            {
                for (var i = 0; i < Pos.Length; i++)
                {
                    var v = Pos[i];
                    var f = Flank[i];
                    if (f == 1) v += Delta[i] * FlankL; else if (f == 2) v += Delta[i] * FlankR;
                    var k = math.min(K[i], KMax);
                    var b = B[i]; var w = W[i];
                    var v4 = new float4(v, 1f);
                    var sw = 0f; var p = float3.zero;
                    for (var x = 0; x < k; x++) { var wx = w[x]; sw += wx; p += wx * math.mul(M[b[x]], v4).xyz; }
                    Out[i] = sw > 0f ? (k < K[i] ? p / sw : p) : v;
                }
                for (var n = Left.Length - 1; n >= 0; n--)
                {
                    float3 lo, hi;
                    if (Left[n] < 0)
                    {
                        lo = new float3(float.MaxValue); hi = new float3(-float.MaxValue);
                        for (var e = Start[n]; e < Start[n] + Cnt[n]; e++)
                        {
                            var t = Tri[Order[e]];
                            lo = math.min(lo, math.min(Out[t.x], math.min(Out[t.y], Out[t.z])));
                            hi = math.max(hi, math.max(Out[t.x], math.max(Out[t.y], Out[t.z])));
                        }
                    }
                    else { lo = math.min(Lo[Left[n]], Lo[Right[n]]); hi = math.max(Hi[Left[n]], Hi[Right[n]]); }
                    Lo[n] = lo; Hi[n] = hi;
                }
            }
        }

        [BurstCompile(CompileSynchronously = true, FloatMode = FloatMode.Strict, FloatPrecision = FloatPrecision.Standard)]
        private struct DrawnJob : IJob
        {
            [ReadOnly] public NativeArray<float3> V, Lo, Hi, Q;
            [ReadOnly] public NativeArray<int3> Tri;
            [ReadOnly] public NativeArray<byte> Flip;
            [ReadOnly] public NativeArray<int> Left, Right, Start, Cnt, Order, Weld, FanStart, Fan;
            [ReadOnly] public NativeArray<float> Off;
            public NativeArray<float> Layered, Bare;
            public NativeArray<float3> Normal;
            /// <summary>Bits: 1 a triangle within reach, 2 inside by the nearest feature's face, 4 inside by the rays (asked when
            /// the face says inside, or always with <see cref="AlwaysRays"/>).</summary>
            public NativeArray<int> Found;
            public float3 Hips, Right3;
            public float Reach;
            public int Count, AlwaysRays;

            private static float Box2(float3 p, float3 lo, float3 hi)
            {
                var d = math.max(lo - p, math.max(float3.zero, p - hi));
                return math.dot(d, d);
            }

            // the nearest point on a triangle and its region (Ericson 2005, Real-Time Collision Detection 5.1.5): 0 the face,
            // 1-3 corner a, b, c, 4-6 edge ab, bc, ca; with its barycentric weights
            private static float3 Closest(float3 p, float3 a, float3 b, float3 c, out int region, out float3 bary)
            {
                var ab = b - a; var ac = c - a; var ap = p - a;
                var d1 = math.dot(ab, ap); var d2 = math.dot(ac, ap);
                if (d1 <= 0f && d2 <= 0f) { region = 1; bary = new float3(1f, 0f, 0f); return a; }
                var bp = p - b;
                var d3 = math.dot(ab, bp); var d4 = math.dot(ac, bp);
                if (d3 >= 0f && d4 <= d3) { region = 2; bary = new float3(0f, 1f, 0f); return b; }
                var vc = d1 * d4 - d3 * d2;
                if (vc <= 0f && d1 >= 0f && d3 <= 0f) { var v = d1 / (d1 - d3); region = 4; bary = new float3(1f - v, v, 0f); return a + v * ab; }
                var cp = p - c;
                var d5 = math.dot(ab, cp); var d6 = math.dot(ac, cp);
                if (d6 >= 0f && d5 <= d6) { region = 3; bary = new float3(0f, 0f, 1f); return c; }
                var vb = d5 * d2 - d1 * d6;
                if (vb <= 0f && d2 >= 0f && d6 <= 0f) { var w = d2 / (d2 - d6); region = 6; bary = new float3(1f - w, 0f, w); return a + w * ac; }
                var va = d3 * d6 - d5 * d4;
                if (va <= 0f && d4 - d3 >= 0f && d5 - d6 >= 0f) { var w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); region = 5; bary = new float3(0f, 1f - w, w); return b + w * (c - b); }
                var den = 1f / (va + vb + vc);
                var vv = vb * den; var ww = vc * den;
                region = 0; bary = new float3(1f - vv - ww, vv, ww);
                return a + ab * vv + ac * ww;
            }

            private float3 FaceN(int t)
            {
                var c = Tri[t];
                var n = math.cross(V[c.y] - V[c.x], V[c.z] - V[c.x]);
                if (Flip[t] != 0) n = -n;
                var l = math.length(n);
                return l > 1e-12f ? n / l : float3.zero;
            }

            // the angle-weighted pseudo-normal of the nearest feature (a face's own normal, an edge's two faces' summed, a corner's
            // faces' weighted by their angles there), over the welded mesh
            private float3 PseudoNormal(int t, int region)
            {
                var c = Tri[t];
                if (region == 0) return FaceN(t);
                if (region <= 3)
                {
                    var v = region == 1 ? c.x : region == 2 ? c.y : c.z;
                    var w = Weld[v];
                    var sum = float3.zero;
                    for (var e = FanStart[w]; e < FanStart[w + 1]; e++)
                    {
                        var f = Fan[e]; var cf = Tri[f];
                        int a, b, o;
                        if (Weld[cf.x] == w) { a = cf.x; b = cf.y; o = cf.z; }
                        else if (Weld[cf.y] == w) { a = cf.y; b = cf.z; o = cf.x; }
                        else { a = cf.z; b = cf.x; o = cf.y; }
                        var e1 = V[b] - V[a]; var e2 = V[o] - V[a];
                        var l1 = math.length(e1); var l2 = math.length(e2);
                        if (l1 < 1e-9f || l2 < 1e-9f) continue;
                        sum += math.acos(math.clamp(math.dot(e1, e2) / (l1 * l2), -1f, 1f)) * FaceN(f);
                    }
                    var ls = math.length(sum);
                    return ls > 1e-12f ? sum / ls : FaceN(t);
                }
                int u = region == 4 ? c.x : region == 5 ? c.y : c.z, u2 = region == 4 ? c.y : region == 5 ? c.z : c.x;
                int wu = Weld[u], wv = Weld[u2];
                var s2 = float3.zero;
                for (var e = FanStart[wu]; e < FanStart[wu + 1]; e++)
                {
                    var f = Fan[e]; var cf = Tri[f];
                    if (Weld[cf.x] == wv || Weld[cf.y] == wv || Weld[cf.z] == wv) s2 += FaceN(f);
                }
                var l3 = math.length(s2);
                return l3 > 1e-12f ? s2 / l3 : FaceN(t);
            }

            private static bool RayBox(float3 o, float3 d, float3 lo, float3 hi, float max)
            {
                float t0 = 0f, t1 = max;
                for (var a = 0; a < 3; a++)
                {
                    if (math.abs(d[a]) < 1e-12f) { if (o[a] < lo[a] || o[a] > hi[a]) return false; continue; }
                    var ia = 1f / d[a];
                    var ta = (lo[a] - o[a]) * ia; var tb = (hi[a] - o[a]) * ia;
                    if (ta > tb) { var x = ta; ta = tb; tb = x; }
                    t0 = math.max(t0, ta); t1 = math.min(t1, tb);
                    if (t0 > t1) return false;
                }
                return true;
            }

            // (as MotionProbe.Hit: Moeller-Trumbore, both faces, within max)
            private static bool Hit(float3 o, float3 d, float3 a, float3 b, float3 c, float max)
            {
                var e1 = b - a; var e2 = c - a;
                var q = math.cross(d, e2);
                var det = math.dot(e1, q);
                if (math.abs(det) < 1e-10f) return false;
                var f = 1f / det;
                var sv = o - a;
                var u = f * math.dot(sv, q);
                if (u < 0f || u > 1f) return false;
                var r = math.cross(sv, e1);
                var w = f * math.dot(d, r);
                if (w < 0f || u + w > 1f) return false;
                var t = f * math.dot(e2, r);
                return t > 1e-5f && t < max;
            }

            private int Crossings(float3 o, float3 d)
            {
                var hits = 0;
                var stack = new FixedList512Bytes<int>();
                stack.Add(0);
                while (stack.Length > 0)
                {
                    var n = stack[stack.Length - 1];
                    stack.RemoveAt(stack.Length - 1);
                    if (!RayBox(o, d, Lo[n], Hi[n], 0.8f)) continue;
                    if (Left[n] < 0)
                    {
                        for (var e = Start[n]; e < Start[n] + Cnt[n]; e++) { var t = Tri[Order[e]]; if (Hit(o, d, V[t.x], V[t.y], V[t.z], 0.8f)) hits++; }
                        continue;
                    }
                    stack.Add(Left[n]); stack.Add(Right[n]);
                }
                return hits;
            }

            // the gate's own inside test (MotionProbe.InBody): level rays out from the point (away from the hips' middle, and to
            // either side of that), each counting the surface's crossings within 0.8 m, both faces; odd is in, two of three
            private bool Rays(float3 p)
            {
                var away = p - Hips; away.y = 0f;
                var l = math.length(away);
                away = l > 1e-3f ? away / l : Right3;
                var votes = 0;
                if ((Crossings(p, away) & 1) == 1) votes++;
                if ((Crossings(p, new float3(away.z, 0f, -away.x)) & 1) == 1) votes++;
                if (votes == 1 && (Crossings(p, new float3(-away.z, 0f, away.x)) & 1) == 1) votes++;
                return votes >= 2;
            }

            public void Execute()
            {
                for (var k = 0; k < Count; k++)
                {
                    var p = Q[k];
                    var best = Reach * Reach; var bt = -1; var bq = float3.zero; var br = 0; var bb = float3.zero;
                    var stack = new FixedList512Bytes<int>();
                    stack.Add(0);
                    while (stack.Length > 0)
                    {
                        var n = stack[stack.Length - 1];
                        stack.RemoveAt(stack.Length - 1);
                        if (Box2(p, Lo[n], Hi[n]) >= best) continue;
                        if (Left[n] < 0)
                        {
                            for (var e = Start[n]; e < Start[n] + Cnt[n]; e++)
                            {
                                var t = Order[e]; var c = Tri[t];
                                var q = Closest(p, V[c.x], V[c.y], V[c.z], out var region, out var bary);
                                var d = math.lengthsq(q - p);
                                if (d < best) { best = d; bt = t; bq = q; br = region; bb = bary; }
                            }
                            continue;
                        }
                        // (the nearer child popped first)
                        var dl = Box2(p, Lo[Left[n]], Hi[Left[n]]); var dr = Box2(p, Lo[Right[n]], Hi[Right[n]]);
                        if (dl < dr) { if (dr < best) stack.Add(Right[n]); if (dl < best) stack.Add(Left[n]); }
                        else { if (dl < best) stack.Add(Left[n]); if (dr < best) stack.Add(Right[n]); }
                    }
                    if (bt < 0) { Found[k] = 0; Layered[k] = Bare[k] = 0f; Normal[k] = float3.zero; continue; }
                    var dist = math.sqrt(best);
                    var pn = PseudoNormal(bt, br);
                    var faceIn = dist > 0f && math.dot(p - bq, pn) < 0f;
                    var flags = 1 | (faceIn ? 2 : 0);
                    var inside = false;
                    if (faceIn || AlwaysRays != 0)
                    {
                        var rayIn = Rays(p);
                        if (rayIn) flags |= 4;
                        inside = AlwaysRays != 0 ? rayIn : rayIn && faceIn;
                    }
                    var c3 = Tri[bt];
                    var off = bb.x * Off[c3.x] + bb.y * Off[c3.y] + bb.z * Off[c3.z];
                    var s = inside ? dist : -dist;
                    Bare[k] = s; Layered[k] = s + off; Found[k] = flags;
                    Normal[k] = dist > 1e-5f ? (inside ? (bq - p) / dist : (p - bq) / dist) : pn;
                }
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
                return across <= Mathf.Max(Mathf.Min(_spacing[c], PatchMax), Mathf.Min(DeepAcross * d, DeepAcrossMax)) ? d : -1f;
            }
            // inside when two of the three say so (the linings that called for all three are left out of the skin now; with
            // points 1.5-2.5 cm apart one of three often lay on another facet, a vest's edge, and hid upper arms 1.5-2 cm in
            // under the arm, C1, 2026-11-06)
            float u0 = Under(c0), u1 = c1 >= 0 ? Under(c1) : -1f, u2 = c2 >= 0 ? Under(c2) : -1f;
            var ins = (u0 > 0f ? 1 : 0) + (u1 > 0f ? 1 : 0) + (u2 > 0f ? 1 : 0);
            var inside = ins >= 2 ? Mathf.Min(u0 > 0f ? u0 : float.MaxValue, Mathf.Min(u1 > 0f ? u1 : float.MaxValue, u2 > 0f ? u2 : float.MaxValue)) : -1f;
            // against the hips and thighs, whether and how deep: the robust surface of the points near (Robust), where the vote
            // above is fooled by the gear's own facets; only within its bandwidth of the surface (the nearest point's plane): past
            // it the moving-least-squares surface is extrapolated and read points 2.5-4.3 cm off the body as 0.01-0.5 cm inside
            // (11 of 7292 such readings on the dumps of 2026-11-26, the vote none wrong there), and the vote's answer stands
            var grad = Vector3.zero;
            if (!DrawnOn && (_set.Flags[c0] & LowFlag) != 0 && d0 <= RobustNear2(_spacing[c0]) && Mathf.Abs(Vector3.Dot(p - P[c0], N[c0])) <= Mathf.Clamp(_spacing[c0], SurfaceHMin, SurfaceHMax))
            {
                var f = RobustAt(p, c0, out var ok, out var ran);
                if (ok) inside = f < 0f ? Mathf.Max(-f, DeepMin) : -1f;
                if (ran) RobustRuns++;
                if (ran && inside > 0f) grad = _grad;
            }
            // (inside by the robust surface, the contact's normal is that surface's own gradient: the three nearest points' normals
            // summed tilted a belt pouch's bottom 16° toward its bevelled edge and gave a sleeve whose offset points out through the
            // bottom a share of it as if pressed between, C1, Construction_Male_06, 2026-11-26)
            var nn = N[c0] + (c1 >= 0 ? N[c1] : Vector3.zero) + (c2 >= 0 ? N[c2] : Vector3.zero);
            normal = grad.sqrMagnitude > 1e-8f ? grad.normalized : nn.sqrMagnitude > 1e-8f ? nn.normalized : N[c0];
            // outside: the gap to the surface's plane at the nearest point (never more than to the point itself)
            // outside: the gap to the patch of skin the nearest point stands for (a disc in its plane, half its spacing
            // across): its whole plane read a hand hanging below a buttock or before a thigh as touching it, 2026-11-06
            var v0 = p - P[c0];
            var plane = Vector3.Dot(v0, N[c0]);
            var across = Mathf.Sqrt(Mathf.Max(0f, v0.sqrMagnitude - plane * plane));
            var patch = 0.5f * Mathf.Min(_spacing[c0], PatchMax);
            var gap = across <= patch ? Mathf.Abs(plane) : Mathf.Sqrt((across - patch) * (across - patch) + plane * plane);
            depth = inside > 0f ? inside : -gap;
            if (DrawnOn && depth > -DrawnBand) DrawnOne(p, ref depth, ref normal);
            return true;
        }

        /// <summary>
        /// Where a point near the hips and thighs (the low band, <see cref="LowFlag"/>: where a resting forearm and hand hang) is
        /// against the surface of the body points within <see cref="SurfaceReach"/> bandwidths of it: the signed distance (m,
        /// negative inside) of the robust implicit moving-least-squares surface (RIMLS: Oztireli, Guennebaud and Gross 2009,
        /// "Feature preserving point set surfaces based on non-linear kernel regression", Computer Graphics Forum 28(2)): each
        /// point's tangent plane weighted by a Gaussian of its distance, then, over <see cref="RobustIters"/> passes, by how far its
        /// plane disagrees with the surface found so far and how far its normal is from that surface's gradient. It decides both
        /// whether the point is inside and how deep. The least of the three nearest points' planes under-read where the hip's
        /// skin creases or turns (a forearm 1.1 cm into the hip read 0.2 cm, 2026-11-25); the plain IMLS that replaced it there
        /// blurs a sharp feature: where a belt pouch's top meets the trousers' side (Construction_Male_06) a forearm 1.0 cm inside
        /// the drawn hip read 0.53 cm, and in other frames the three nearest points (two on the pouch's facets) voted it outside
        /// (C1 0.5-0.8 cm in five states, 2026-11-26). Read against the drawn surface at the runtime's own arm points (five
        /// people's worst frames, 75 contacts): under-reads past 0.2 cm 22 -> 4, the inside test wrong on 71 -> 59 of 659 points
        /// (docs/MOTION_ROOT_CAUSE.md §12). <paramref name="ok"/>: false when no point is near enough to weigh. Read only within its
        /// bandwidth of the surface, its points gathered from the cells its reach touches and the passes skipped when no point
        /// has the arm's point behind its plane (exactly their answer: outside), it costs 0.5-2 ms a person a frame in the
        /// editor's idles (it doubled the arm clearance's cost read for every point near the hips, docs/MOTION_ROOT_CAUSE.md §13);
        /// inside, its gradient is the contact's normal.
        /// </summary>
        private float Robust(Vector3 p, int c0, int m, out bool ok)
        {
            var h = Mathf.Clamp(_spacing[c0], SurfaceHMin, SurfaceHMax);
            var reach = Mathf.Min(SurfaceReach * h, Cell); var reach2 = reach * reach; var ih2 = 1f / (h * h);
            var isr2 = 1f / (RobustResidual * RobustResidual * h * h); var isn2 = 1f / (RobustNormal * RobustNormal);
            var f = 0f; var g = Vector3.zero; ok = false;
            for (var it = 0; it < RobustIters; it++)
            {
                float sw = 0f, sf = 0f; Vector3 sg = Vector3.zero, sgf = Vector3.zero, sn = Vector3.zero;
                for (var k = 0; k < m; k++)
                {
                    var r2 = _r2[k];
                    var j = _nb[k];
                    var px = p - P[j];
                    var nj = N[j];
                    var fx = Vector3.Dot(px, nj);
                    var e = fx - f; var dn = nj - g;
                    var w = it > 0 ? Mathf.Exp(-r2 * ih2 - e * e * isr2 - dn.sqrMagnitude * isn2) : Mathf.Exp(-r2 * ih2);
                    var dw = px * (-2f * w * ih2);
                    sw += w; sf += w * fx; sg += dw; sgf += dw * fx; sn += nj * w;
                }
                if (sw <= 1e-20f) break;
                f = sf / sw; g = (sgf - sg * f + sn) / sw; ok = true;
            }
            _grad = g;
            return f;
        }
        private Vector3 _grad;

        /// <summary>The robust reading at <paramref name="p"/>: the body points within its reach of it gathered from the cells the
        /// reach touches (in the nearest-three search's order), then, unless none has the point behind its plane (outside: the
        /// surface is a weighted mean of their plane distances, every weight positive, so it cannot be below nought either, and
        /// the answer is exactly what the passes would give) or <paramref name="full"/> asks for the value, the passes.
        /// <paramref name="ran"/>: the passes ran.</summary>
        private float RobustAt(Vector3 p, int c0, out bool ok, out bool ran, bool full = false)
        {
            var reach2 = RobustNear2(_spacing[c0]); var reach = Mathf.Sqrt(reach2);
            var lo = CellOf(p - Vector3.one * reach); var hi = CellOf(p + Vector3.one * reach);
            var m = 0; var behind = false; ok = false; ran = false;
            for (var x = lo.x; x <= hi.x; x++)
                for (var y = lo.y; y <= hi.y; y++)
                    for (var z = lo.z; z <= hi.z; z++)
                        for (var j = _head[Hash(x, y, z)]; j >= 0; j = _next[j])
                        {
                            var cj = _cell[j];
                            if (cj.x != x || cj.y != y || cj.z != z) continue;
                            var d = (P[j] - p).sqrMagnitude;
                            if (d > reach2 || m >= RobustMax) continue;
                            _nb[m] = j; _r2[m] = d; m++;
                            if (!behind && Vector3.Dot(p - P[j], N[j]) < 0f) behind = true;
                        }
            if (m == 0) return 0f;
            if (!behind && !full) { ok = true; return 0f; }
            ran = true;
            return Robust(p, c0, m, out ok);
        }
        private readonly int[] _nb = new int[RobustMax];
        private readonly float[] _r2 = new float[RobustMax];

        /// <summary>The robust reading's passes, its residual scale (bandwidths) and its normals' scale (Oztireli et al. 2009's
        /// 0.5-1.5 for both; the readings above moved under 0.05 cm across 2-4 passes, 0.3-0.75 and 0.5-1.0), and how near the
        /// nearest body point must be for it (its reach: beyond, the vote's answer stands).</summary>
        public const int RobustIters = 3;
        /// <summary>The most body points within a cell of a point the robust reading weighs (within its reach of an arm point near
        /// the hips there are 1-38, median 8, on the dumps of 2026-11-26).</summary>
        public const int RobustMax = 120;
        public const float RobustResidual = 0.5f, RobustNormal = 0.75f;
        public static float RobustNear2(float spacing) { var h = Mathf.Clamp(spacing, SurfaceHMin, SurfaceHMax); var r = Mathf.Min(SurfaceReach * h, Cell); return r * r; }

        /// <summary>The surface reading's bandwidth bounds (m) and its reach (bandwidths; past 2 a point weighs under 2 %), and
        /// the least depth a point the vote finds inside is given (m).</summary>
        public const float SurfaceHMin = 0.015f, SurfaceHMax = 0.03f, SurfaceReach = 2f, DeepMin = 1e-5f;

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
                var lim = Mathf.Max(Mathf.Min(_spacing[k], PatchMax), Mathf.Min(DeepAcross * dd, DeepAcrossMax));
                var verdict = dd <= 0f ? "out" : across <= lim ? $"in {dd * 100f:0.0}" : $"beside ({across * 100f:0.0} > {lim * 100f:0.0})";
                var r = inv * (P[k] - origin) * 100f; var nn = inv * N[k];
                parts.Add($"{PartOf(k)} {k} ({r.x:0},{r.y:0},{r.z:0}) n ({nn.x:0.0},{nn.y:0.0},{nn.z:0.0}) off {Off(k) * 100f:0.0} sp {_spacing[k] * 100f:0.0} {Mathf.Sqrt((P[k] - p).sqrMagnitude) * 100f:0.0} cm away: {verdict}");
            }
            // (and the depth the robust surface gives, which Depth reports in the low band: positive inside)
            if (c0 >= 0) { var f = RobustAt(p, c0, out var ok, out _, true); parts.Add(ok ? $"robust {-f * 100f:0.0}" : "robust none"); }
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
