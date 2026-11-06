using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
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
            public readonly int[] Start = new int[Parts + 1];
            public byte[] B0, B1, Flags;
            public float[] W;
            public Vector3[] P0, P1, N0, N1;
            public uint[] Mask;
            public int[] UsedBones;
        }

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
        private const float Cell = 0.03f;
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
                if (new string(r.ReadChars(4)) != "RBS1") throw new InvalidDataException("not a body skin");
                var nl = r.ReadInt32();
                s.Layers = new string[nl];
                for (var k = 0; k < nl; k++) s.Layers[k] = r.ReadString();
                var counts = new int[Parts];
                for (var p = 0; p < Parts; p++) counts[p] = r.ReadInt32();
                var n = 0;
                for (var p = 0; p < Parts; p++) { s.Start[p] = n; n += counts[p]; }
                s.Start[Parts] = n;
                s.B0 = new byte[n]; s.B1 = new byte[n]; s.Flags = new byte[n]; s.W = new float[n]; s.Mask = new uint[n];
                s.P0 = new Vector3[n]; s.P1 = new Vector3[n]; s.N0 = new Vector3[n]; s.N1 = new Vector3[n];
                var used = new HashSet<int>();
                Vector3 V() => new(r.ReadSingle(), r.ReadSingle(), r.ReadSingle());
                for (var i = 0; i < n; i++)
                {
                    s.B0[i] = r.ReadByte(); s.B1[i] = r.ReadByte(); s.W[i] = r.ReadByte() / 255f;
                    s.P0[i] = V(); s.N0[i] = V(); s.P1[i] = V(); s.N1[i] = V();
                    s.Flags[i] = r.ReadByte(); s.Mask[i] = r.ReadUInt32();
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
                for (var k = 0; m != 0; k++, m >>= 1) if ((m & 1) != 0) off = Mathf.Max(off, thick[k]);
                _off[i] = off;
            }
        }

        /// <summary>Poses every point from the bones as they are now, and files the body's points (torso, thighs) by cell
        /// for <see cref="Depth"/>.</summary>
        public void Pose()
        {
            if (!Ready) return;
            foreach (var b in _set.UsedBones) _m[b] = _bones[b].localToWorldMatrix;
            var n = _set.W.Length;
            for (var i = 0; i < n; i++)
            {
                var w = _set.W[i];
                ref var m0 = ref _m[_set.B0[i]];
                ref var m1 = ref _m[_set.B1[i]];
                var p = m0.MultiplyPoint3x4(_set.P0[i]) * w + m1.MultiplyPoint3x4(_set.P1[i]) * (1f - w);
                var nn = (m0.MultiplyVector(_set.N0[i]) * w + m1.MultiplyVector(_set.N1[i]) * (1f - w)).normalized;
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
        public bool Depth(Vector3 p, out float depth, out Vector3 normal)
        {
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
            float Under(int c)
            {
                var v = p - P[c];
                var d = -Vector3.Dot(v, N[c]);
                if (d <= 0f) return d;
                var across = (v + N[c] * d).magnitude;
                return across <= Mathf.Max(_spacing[c], d) ? d : -1f;
            }
            var inside = Under(c0);
            if (c1 >= 0) inside = Mathf.Min(inside, Under(c1));
            if (c2 >= 0) inside = Mathf.Min(inside, Under(c2));
            var nn = N[c0] + (c1 >= 0 ? N[c1] : Vector3.zero) + (c2 >= 0 ? N[c2] : Vector3.zero);
            normal = nn.sqrMagnitude > 1e-8f ? nn.normalized : N[c0];
            // outside: the gap to the surface's plane at the nearest point (never more than to the point itself)
            // outside: the gap to the patch of skin the nearest point stands for (a disc in its plane, half its spacing
            // across): its whole plane read a hand hanging below a buttock or before a thigh as touching it, 2026-11-06
            var v0 = p - P[c0];
            var plane = Vector3.Dot(v0, N[c0]);
            var across = Mathf.Sqrt(Mathf.Max(0f, v0.sqrMagnitude - plane * plane));
            var patch = 0.5f * _spacing[c0];
            var gap = across <= patch ? Mathf.Abs(plane) : Mathf.Sqrt((across - patch) * (across - patch) + plane * plane);
            depth = inside > 0f ? inside : -gap;
            return true;
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
