using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace SecondFace.Tests
{
    /// <summary>
    /// The motion and posture gate's instrument (docs/PEOPLE_MOTION.md §2): on one person, after everything the game does
    /// to the pose each frame (the animation, its IK, the arm clearance and the hands, which run in LateUpdate before
    /// this), measures every frame the arms, elbows, fingers, shoulders, head and feet, and at <see cref="BakeHz"/> the
    /// skinned mesh itself (soles against the ground, hands against the thighs, a hand or forearm inside the body). The
    /// measures are filed under <see cref="State"/>; <see cref="Kind"/> says which apply (null: none, a blend between
    /// states). Calibrated before the first animation frame from the avatar's own neutral pose (all muscles zero: the
    /// head and chest facing the body's front, upright; limbs apart for telling the mesh's parts).
    /// </summary>
    [DefaultExecutionOrder(10000)]
    public sealed class MotionProbe : MonoBehaviour
    {
        public enum K { Stand, Gesture, Turn, Walk }

        public string Person;
        public string State;
        public K? Kind;
        /// <summary>The ground the soles are measured against (rays hit only these).</summary>
        public Collider[] Ground = new Collider[0];
        public float BakeHz = 8f;

        /// <summary>state → measure → values (degrees, centimetres, cm/s, or a ratio).</summary>
        public readonly Dictionary<string, Dictionary<string, List<float>>> Samples = new();
        public string Error { get; private set; }
        /// <summary>Per state, the deepest a hand or forearm went into the body, and where (for the report).</summary>
        public readonly Dictionary<string, (float, string)> WorstClip = new();
        /// <summary>Per state, the furthest a resting hand stood off the hip or thigh past A4's limit, and where (for the
        /// report: the gate's nearest hand and body vertices, and what the game's skin read then).</summary>
        public readonly Dictionary<string, (float, string)> WorstHand = new();
        private float _traceA4L = -1f, _traceA4R = -1f;   // the hands' last sampled gaps (cm), for the trace

        private Animator _a;
        private HumanPoseHandler _hp;
        private HumanPose _pose;
        private Transform _root, _head, _chest, _hips;
        private Quaternion _faceOff = Quaternion.identity, _chestOff = Quaternion.identity;
        private int _shoulderL = -1, _shoulderR = -1;
        private SkinnedMeshRenderer _smr;
        private byte[] _seg;
        private bool[] _armLow;
        private Vector3[] _bindNormals;
        /// <summary>How well the game's skin points (BodySkin) lie on the mesh, at calibration (for the report).</summary>
        public string SkinFit, SkinWhy;
        private readonly List<(int I, int Near, float Depth)> _candidates = new();
        // the arm clearance's own view, per state (for the report: why the arms are where they are)
        public readonly Dictionary<string, (int N, int Resting, double[] Sum)> ArmDiag = new();
        /// <summary>Where each arm's nearest contact with the body is, once per resting state (arm point, body point, the
        /// body point's part, layer offset and facing, in the body's frame about the hips, cm).</summary>
        public readonly Dictionary<string, string> ArmWhere = new();
        /// <summary>Walking: each state's widest arm swing (degrees from down), and its forward/back and sideways parts.</summary>
        public readonly Dictionary<string, (float A, float Sag, float Side, string Arm)> SwingPeak = new();

        private string Where()
        {
            var skin = GetComponent<SecondFace.Game.People.BodySkin>();
            if (skin == null || !skin.Ready) return "no skin";
            var parts = new List<string>();
            string[] names = { "L push", "L hand", "R push", "R hand" };
            for (var q = 0; q < 4; q++) parts.Add(Where(q, names[q]));
            return string.Join("; ", parts);
        }

        /// <summary>One of the game's last arm-to-body points (0 left push, 1 left hand, 2 right push, 3 right hand).</summary>
        private string Where(int q, string name)
        {
            var skin = GetComponent<SecondFace.Game.People.BodySkin>();
            if (skin == null || !skin.Ready || _ac == null) return $"{name} no skin";
            var inv = Quaternion.Inverse(_root.rotation);
            string L(Vector3 w) { var v = inv * (w - _hips.position) * 100f; return $"({v.x:0},{v.y:0},{v.z:0})"; }
            string N(Vector3 n) { var v = inv * n; return $"({v.x:0.0},{v.y:0.0},{v.z:0.0})"; }
            int a = _ac.DiagAt[q * 2], b = _ac.DiagAt[q * 2 + 1];
            if (a < 0 || b < 0 || a >= skin.Count || b >= skin.Count) return $"{name} none";
            return $"{name} {skin.PartOf(a)} {L(skin.P[a])} -> {skin.PartOf(b)} {L(skin.P[b])} off {skin.Off(b) * 100f:0.0} n {N(skin.N[b])} d {(skin.P[a] - skin.P[b]).magnitude * 100f:0.0}";
        }
        private SecondFace.Game.People.ArmClearance _ac;
        private float _traceA1L, _traceA1R;   // the upper arms from down this frame, for the trace
        private int[] _bodyTris;
        private Vector3[] _cv;
        private float[] _tyLo, _tyHi;

        /// <summary>The body's torso and thighs as they are posed now (their triangles, and each one's height range).</summary>
        private void Collide(Vector3[] v)
        {
            if (_bodyTris == null)
            {
                var all = _baked.triangles;
                var keep = new List<int>();
                bool Body(int i) { var s = (Part)_seg[i]; return s == Part.Torso || s == Part.ThighL || s == Part.ThighR; }
                for (var t = 0; t + 2 < all.Length; t += 3)
                    if (Body(all[t]) && Body(all[t + 1]) && Body(all[t + 2])) { keep.Add(all[t]); keep.Add(all[t + 1]); keep.Add(all[t + 2]); }
                _bodyTris = keep.ToArray();
                _tyLo = new float[_bodyTris.Length / 3]; _tyHi = new float[_bodyTris.Length / 3];
            }
            _cv = v;
            for (int t = 0, k = 0; t < _bodyTris.Length; t += 3, k++)
            {
                float a = v[_bodyTris[t]].y, b = v[_bodyTris[t + 1]].y, c = v[_bodyTris[t + 2]].y;
                _tyLo[k] = Mathf.Min(a, Mathf.Min(b, c)); _tyHi[k] = Mathf.Max(a, Mathf.Max(b, c));
            }
        }

        /// <summary>Whether a point is inside the body's torso and thighs: level rays out from it (away from the body's
        /// middle, and to either side of that), each counting the surface's crossings, both faces, within 0.8 m; odd is
        /// in (two rays of three).</summary>
        private bool InBody(Vector3 p)
        {
            var away = p - _hips.position; away.y = 0f;
            away = away.sqrMagnitude > 1e-6f ? away.normalized : _root.right;
            var votes = 0;
            foreach (var dir in new[] { away, Quaternion.AngleAxis(90f, Vector3.up) * away, Quaternion.AngleAxis(-90f, Vector3.up) * away })
            {
                var crossings = 0;
                for (int t = 0, k = 0; t < _bodyTris.Length; t += 3, k++)
                {
                    if (p.y < _tyLo[k] || p.y > _tyHi[k]) continue;   // a level ray meets only triangles spanning its height
                    if (Hit(p, dir, _cv[_bodyTris[t]], _cv[_bodyTris[t + 1]], _cv[_bodyTris[t + 2]], 0.8f)) crossings++;
                }
                if ((crossings & 1) == 1) votes++;
            }
            return votes >= 2;
        }

        /// <summary>Möller-Trumbore, both faces: does the ray from o along d meet the triangle within max?</summary>
        private static bool Hit(Vector3 o, Vector3 d, Vector3 a, Vector3 b, Vector3 c, float max)
        {
            var e1 = b - a; var e2 = c - a;
            var q = Vector3.Cross(d, e2);
            var det = Vector3.Dot(e1, q);
            if (Mathf.Abs(det) < 1e-10f) return false;
            var f = 1f / det;
            var sv = o - a;
            var u = f * Vector3.Dot(sv, q);
            if (u < 0f || u > 1f) return false;
            var r = Vector3.Cross(sv, e1);
            var w = f * Vector3.Dot(d, r);
            if (w < 0f || u + w > 1f) return false;
            var t = f * Vector3.Dot(e2, r);
            return t > 1e-5f && t < max;
        }
        private float _ankleSoleL, _ankleSoleR, _toeSoleL, _toeSoleR;
        private Vector3 _prevAnkleL, _prevAnkleR, _prevToeL, _prevToeR, _prevRoot;
        private bool _havePrev;
        private string _minState;
        private float _minL = float.MaxValue, _minR = float.MaxValue;
        // F4: this visit's feet (height over the sole, horizontal speed cm/s, side), judged each frame against the lowest
        // each foot has been in the visit so far, so that once the visit ends against its lowest in the whole visit (a
        // foot still in the air when the state began, 7 cm up and stepping, was taken for one bearing weight against the
        // lowest so far and its step counted as a slide, 2026-11-07); _f4Base: the samples of earlier visits, final
        private readonly List<(float H, float V, int Side)> _f4Now = new();
        private int _f4Base;
        /// <summary>Where to write a per-frame trace of the feet (a CSV), for the states whose name starts with <see cref="TraceState"/>.</summary>
        public string TracePath, TraceState;
        private float _nextBake;
        /// <summary>The probe's own time (s, from 0, the frames' own steps): differences of Time.time, a float whose size
        /// depends on how long the editor took to start, came out a few thousandths apart from run to run.</summary>
        private float _clock;
        private int _bakeCount = int.MaxValue / 2;
        private Mesh _baked;

        private enum Part : byte { None, Torso, Head, UpperArmL, UpperArmR, ForearmL, ForearmR, HandL, HandR, ThighL, ThighR, ShinL, ShinR, FootL, FootR }

        private Transform B(HumanBodyBones b) => _a.GetBoneTransform(b);

        /// <summary>Call once, after the person is made and before their first animated frame.</summary>
        public bool Calibrate()
        {
            _a = GetComponent<Animator>();
            if (_a == null || !_a.isHuman || _a.avatar == null) { Error = "no humanoid animator"; return false; }
            _root = _a.transform;
            _head = B(HumanBodyBones.Head);
            _chest = B(HumanBodyBones.UpperChest) ?? B(HumanBodyBones.Chest) ?? B(HumanBodyBones.Spine);
            _hips = B(HumanBodyBones.Hips);
            _smr = GetComponentsInChildren<SkinnedMeshRenderer>(true).Where(r => r.sharedMesh != null).OrderByDescending(r => r.sharedMesh.vertexCount).FirstOrDefault();
            if (_head == null || _chest == null || _hips == null || _smr == null) { Error = "missing head, chest, hips or body mesh"; return false; }
            var names = HumanTrait.MuscleName;
            for (var i = 0; i < names.Length; i++)
            {
                if (names[i] == "Left Shoulder Down-Up") _shoulderL = i;
                if (names[i] == "Right Shoulder Down-Up") _shoulderR = i;
            }
            _hp = new HumanPoseHandler(_a.avatar, _root);
            var bind = Bake(out _bindNormals);   // the bind pose: standing, feet flat on the floor
            _bindAnkleL = B(HumanBodyBones.LeftFoot).position; _bindAnkleR = B(HumanBodyBones.RightFoot).position;
            _bindToeL = B(HumanBodyBones.LeftToes) != null ? B(HumanBodyBones.LeftToes).position : _bindAnkleL + _root.forward * 0.12f;
            _bindToeR = B(HumanBodyBones.RightToes) != null ? B(HumanBodyBones.RightToes).position : _bindAnkleR + _root.forward * 0.12f;
            _hp.GetHumanPose(ref _pose);
            var saved = (float[])_pose.muscles.Clone();
            for (var i = 0; i < _pose.muscles.Length; i++) _pose.muscles[i] = 0f;
            _hp.SetHumanPose(ref _pose);
            // the neutral pose faces the body's front: what the head's and chest's own axes are there
            _faceOff = Quaternion.Inverse(_head.rotation) * _root.rotation;
            _chestOff = Quaternion.Inverse(_chest.rotation) * _root.rotation;
            // the mesh's parts, told apart in the neutral pose (limbs away from the body), by the nearest bone
            var v = Bake(out _);
            var segs = Segments();
            _seg = new byte[v.Length];
            _armLow = new bool[v.Length];
            for (var i = 0; i < v.Length; i++)
            {
                var best = float.MaxValue; var part = Part.None; var along = 0f;
                foreach (var (a, b, p) in segs)
                {
                    var d = DistSeg(v[i], a, b);
                    if (d < best) { best = d; part = p; var ab = b - a; along = Mathf.Clamp01(Vector3.Dot(v[i] - a, ab) / Mathf.Max(ab.sqrMagnitude, 1e-8f)); }
                }
                _seg[i] = (byte)part;
                // the upper arm's third nearest the elbow (higher, it rests on the side of the chest: docs/PEOPLE_MOTION.md C1)
                _armLow[i] = (part == Part.UpperArmL || part == Part.UpperArmR) && along >= 0.65f;
            }
            for (var i = 0; i < saved.Length; i++) _pose.muscles[i] = saved[i];
            _hp.SetHumanPose(ref _pose);
            // how high the ankle stands over the heel's sole and the ball over its own, in the bind pose (feet flat)
            for (var side = 0; side < 2; side++)
            {
                var part = side == 0 ? Part.FootL : Part.FootR;
                var ankle = side == 0 ? _bindAnkleL : _bindAnkleR; var toes = side == 0 ? _bindToeL : _bindToeR;
                var fwd = Flat(toes - ankle).normalized; var toesAlong = Vector3.Dot(toes - ankle, fwd);
                float bh = float.MaxValue, bb = float.MaxValue;
                for (var i = 0; i < bind.Length; i++)
                {
                    if (_seg[i] != (byte)part) continue;
                    var along = Vector3.Dot(bind[i] - ankle, fwd);
                    if (along < -0.01f && bind[i].y < bh) { bh = bind[i].y; _solePoint[side * 2] = i; }
                    else if (along > toesAlong - 0.04f && along < toesAlong + 0.02f && bind[i].y < bb) { bb = bind[i].y; _solePoint[side * 2 + 1] = i; }
                }
            }
            _ankleSoleL = SoleOffset(bind, Part.FootL, _bindAnkleL, _bindToeL, out _toeSoleL);
            _ankleSoleR = SoleOffset(bind, Part.FootR, _bindAnkleR, _bindToeR, out _toeSoleR);
            Debug.Log($"MotionProbe {Person}: ankle over the heel's sole {_ankleSoleL * 100f:0.0}/{_ankleSoleR * 100f:0.0} cm, ball {_toeSoleL * 100f:0.0}/{_toeSoleR * 100f:0.0} cm, bind sole {MinFoot(bind) - _root.position.y:0.000} m from the root");
            return true;
        }

        private Vector3 _bindAnkleL, _bindAnkleR, _bindToeL, _bindToeR;
        private Vector3 BindAnkleL => _bindAnkleL;
        private Vector3 BindAnkleR => _bindAnkleR;

        private float MinFoot(Vector3[] v)
        {
            var low = float.MaxValue;
            for (var i = 0; i < v.Length; i++) if (_seg[i] == (byte)Part.FootL || _seg[i] == (byte)Part.FootR) low = Mathf.Min(low, v[i].y);
            return low;
        }

        private float SoleOffset(Vector3[] v, Part part, Vector3 ankle, Vector3 toes, out float toe)
        {
            var fwd = Flat(toes - ankle).normalized;
            var toesAlong = Vector3.Dot(toes - ankle, fwd);
            float heel = float.MaxValue, ball = float.MaxValue;
            for (var i = 0; i < v.Length; i++)
            {
                if (_seg[i] != (byte)part) continue;
                var along = Vector3.Dot(v[i] - ankle, fwd);
                if (along < -0.01f) heel = Mathf.Min(heel, v[i].y);
                else if (along > toesAlong - 0.04f && along < toesAlong + 0.02f) ball = Mathf.Min(ball, v[i].y);
            }
            toe = ball < float.MaxValue ? toes.y - ball : 0.03f;
            return heel < float.MaxValue ? ankle.y - heel : 0.08f;
        }

        private List<(Vector3, Vector3, Part)> Segments()
        {
            var s = new List<(Vector3, Vector3, Part)>();
            void Add(HumanBodyBones a, HumanBodyBones b, Part p)
            {
                var ta = B(a); var tb = B(b);
                if (ta != null && tb != null) s.Add((ta.position, tb.position, p));
            }
            void Tip(HumanBodyBones a, HumanBodyBones from, float len, Part p)
            {
                var ta = B(a); var tf = B(from);
                if (ta != null && tf != null) s.Add((ta.position, ta.position + (ta.position - tf.position).normalized * len, p));
            }
            Add(HumanBodyBones.Hips, HumanBodyBones.Spine, Part.Torso);
            Add(HumanBodyBones.Spine, HumanBodyBones.Chest, Part.Torso);
            if (B(HumanBodyBones.UpperChest) != null) { Add(HumanBodyBones.Chest, HumanBodyBones.UpperChest, Part.Torso); Add(HumanBodyBones.UpperChest, HumanBodyBones.Neck, Part.Torso); }
            else Add(HumanBodyBones.Chest, HumanBodyBones.Neck, Part.Torso);
            Add(HumanBodyBones.LeftShoulder, HumanBodyBones.LeftUpperArm, Part.Torso);
            Add(HumanBodyBones.RightShoulder, HumanBodyBones.RightUpperArm, Part.Torso);
            Add(HumanBodyBones.Neck, HumanBodyBones.Head, Part.Head);
            if (_head != null) s.Add((_head.position, _head.position + Vector3.up * 0.18f, Part.Head));
            Add(HumanBodyBones.LeftUpperArm, HumanBodyBones.LeftLowerArm, Part.UpperArmL);
            Add(HumanBodyBones.RightUpperArm, HumanBodyBones.RightLowerArm, Part.UpperArmR);
            Add(HumanBodyBones.LeftLowerArm, HumanBodyBones.LeftHand, Part.ForearmL);
            Add(HumanBodyBones.RightLowerArm, HumanBodyBones.RightHand, Part.ForearmR);
            Tip(HumanBodyBones.LeftHand, HumanBodyBones.LeftLowerArm, 0.17f, Part.HandL);
            Tip(HumanBodyBones.RightHand, HumanBodyBones.RightLowerArm, 0.17f, Part.HandR);
            Add(HumanBodyBones.LeftUpperLeg, HumanBodyBones.LeftLowerLeg, Part.ThighL);
            Add(HumanBodyBones.RightUpperLeg, HumanBodyBones.RightLowerLeg, Part.ThighR);
            Add(HumanBodyBones.LeftLowerLeg, HumanBodyBones.LeftFoot, Part.ShinL);
            Add(HumanBodyBones.RightLowerLeg, HumanBodyBones.RightFoot, Part.ShinR);
            Add(HumanBodyBones.LeftFoot, HumanBodyBones.LeftToes, Part.FootL);
            Add(HumanBodyBones.RightFoot, HumanBodyBones.RightToes, Part.FootR);
            Tip(HumanBodyBones.LeftToes, HumanBodyBones.LeftFoot, 0.07f, Part.FootL);
            Tip(HumanBodyBones.RightToes, HumanBodyBones.RightFoot, 0.07f, Part.FootR);
            return s;
        }

        private static float DistSeg(Vector3 p, Vector3 a, Vector3 b)
        {
            var ab = b - a;
            var t = Mathf.Clamp01(Vector3.Dot(p - a, ab) / Mathf.Max(ab.sqrMagnitude, 1e-8f));
            return Vector3.Distance(p, a + ab * t);
        }

        private Vector3[] Bake(out Vector3[] normals)
        {
            _baked ??= new Mesh();
            _smr.BakeMesh(_baked, true);
            var v = _baked.vertices;
            normals = _baked.normals;
            var l2w = Matrix4x4.TRS(_smr.transform.position, _smr.transform.rotation, Vector3.one);
            for (var i = 0; i < v.Length; i++) v[i] = l2w.MultiplyPoint3x4(v[i]);
            if (normals != null && normals.Length == v.Length)
                for (var i = 0; i < normals.Length; i++) normals[i] = _smr.transform.rotation * normals[i];
            return v;
        }

        private void Add(string measure, float value)
        {
            if (string.IsNullOrEmpty(State)) return;
            if (!Samples.TryGetValue(State, out var m)) Samples[State] = m = new Dictionary<string, List<float>>();
            if (!m.TryGetValue(measure, out var l)) m[measure] = l = new List<float>();
            l.Add(value);
        }

        /// <summary>The ground's height under a point (the probe's grounds only; NaN off them).</summary>
        private float GroundY(Vector3 p)
        {
            var ray = new Ray(new Vector3(p.x, p.y + 1f, p.z), Vector3.down);
            var best = float.NaN;
            foreach (var g in Ground)
                if (g != null && g.Raycast(ray, out var hit, 3f) && (float.IsNaN(best) || hit.point.y > best)) best = hit.point.y;
            return best;
        }

        /// <summary>The face's frame now: forward, up, right.</summary>
        public (Vector3 F, Vector3 U, Vector3 R) Face()
        {
            var q = _head.rotation * _faceOff;
            return (q * Vector3.forward, q * Vector3.up, q * Vector3.right);
        }

        /// <summary>The chest's forward now, level.</summary>
        public Vector3 ChestForward()
        {
            var f = _chest.rotation * _chestOff * Vector3.forward;
            f.y = 0f;
            return f.sqrMagnitude > 1e-6f ? f.normalized : _root.forward;
        }

        public Vector3 HeadPosition => _head.position;

        private void LateUpdate()
        {
            if (_a == null || _hp == null) return;
            var dt = Time.deltaTime;
            _clock += dt;
            var kind = Kind;
            var root = _root.position;
            var ankleL = B(HumanBodyBones.LeftFoot).position; var ankleR = B(HumanBodyBones.RightFoot).position;
            var toeLt = B(HumanBodyBones.LeftToes); var toeRt = B(HumanBodyBones.RightToes);
            var toeL = toeLt != null ? toeLt.position : ankleL; var toeR = toeRt != null ? toeRt.position : ankleR;
            if (kind != null && dt > 0f)
            {
                var k = kind.Value;
                // the arms (both sides into one list)
                foreach (var (up, lo, hand) in new[] { (HumanBodyBones.LeftUpperArm, HumanBodyBones.LeftLowerArm, HumanBodyBones.LeftHand), (HumanBodyBones.RightUpperArm, HumanBodyBones.RightLowerArm, HumanBodyBones.RightHand) })
                {
                    var u = B(up).position; var e = B(lo).position; var h = B(hand).position;
                    var a1 = Vector3.Angle(e - u, Vector3.down);
                    if (up == HumanBodyBones.LeftUpperArm) _traceA1L = a1; else _traceA1R = a1;
                    if (k == K.Stand) { Add("A1", a1); Add("A2", Vector3.Angle(e - u, h - e)); Add("A3", Vector3.Angle(h - e, Vector3.down)); }
                    if (k == K.Walk)
                    {
                        Add("W3", a1);
                        // the swing's makeup at its widest in each state (forward/back, out to the side), for the report
                        var dir = (e - u).normalized; var fw = _root.forward; var rt = _root.right;
                        var sag = Mathf.Atan2(Vector3.Dot(dir, fw), Mathf.Max(1e-4f, -dir.y)) * Mathf.Rad2Deg;
                        var side = Mathf.Asin(Mathf.Clamp(Mathf.Abs(Vector3.Dot(dir, rt)), 0f, 1f)) * Mathf.Rad2Deg;
                        if (State != null && (!SwingPeak.TryGetValue(State, out var pk) || pk.A < a1))
                        {
                            // what the game's swing did on that frame: its ease and the push out of the body after it
                            if (_ac == null) _ac = GetComponent<SecondFace.Game.People.ArmClearance>();
                            var l = up == HumanBodyBones.LeftUpperArm;
                            var what = _ac != null && _ac.Diag.Length >= 20 ? $" (ease {_ac.Diag[l ? 16 : 17]:0.0}, push {_ac.Diag[l ? 18 : 19]:0.000}{(Mathf.Abs(_ac.Diag[l ? 18 : 19]) > 0.01f ? ": " + Where(l ? 0 : 2, "at") : "")})" : "";
                            SwingPeak[State] = (a1, sag, side, (l ? "L" : "R") + what);
                        }
                    }
                }
                if (k == K.Stand) Fingers();
                // the shoulders, in the avatar's own muscle space (degrees above its neutral)
                _hp.GetHumanPose(ref _pose);
                if (_shoulderL >= 0 && (k == K.Stand || k == K.Gesture))
                {
                    var max = HumanTrait.GetMuscleDefaultMax(_shoulderL); var min = HumanTrait.GetMuscleDefaultMin(_shoulderL);
                    foreach (var i in new[] { _shoulderL, _shoulderR })
                    {
                        var m = _pose.muscles[i];
                        Add("S1", m >= 0 ? m * max : -m * min);
                    }
                }
                // the head
                var (f, uu, r) = Face();
                var pitch = Mathf.Asin(Mathf.Clamp(f.y, -1f, 1f)) * Mathf.Rad2Deg;
                var fl = new Vector3(f.x, 0, f.z);
                var yaw = fl.sqrMagnitude > 1e-6f ? Vector3.Angle(fl.normalized, ChestForward()) : 0f;
                var roll = Mathf.Asin(Mathf.Clamp(Vector3.Dot(r, Vector3.up), -1f, 1f)) * Mathf.Rad2Deg;
                if (k == K.Walk) { Add("W4", pitch); Add("W5", yaw); }
                else if (k != K.Turn) { Add("H1", pitch); Add("H2", yaw); Add("H3", Mathf.Abs(roll)); }
                // the feet: a foot is down (bearing weight) while its sole is within 2 cm of the lowest it has been in this
                // state (floating feet are caught by F1 and W6, not by missing every contact); sliding while down
                if (_minState != State)
                {
                    _minState = State; _minL = _minR = float.MaxValue; _f4Now.Clear();
                    _f4Base = State != null && Samples.TryGetValue(State, out var f4Was) && f4Was.TryGetValue("F4", out var f4WasList) ? f4WasList.Count : 0;
                }
                if (_havePrev)
                {
                    var body = Flat(root - _prevRoot).magnitude / dt;
                    var side = 0;
                    foreach (var (an, pan, to, pto, aS, tS) in new[] { (ankleL, _prevAnkleL, toeL, _prevToeL, _ankleSoleL, _toeSoleL), (ankleR, _prevAnkleR, toeR, _prevToeR, _ankleSoleR, _toeSoleR) })
                    {
                        var ga = GroundY(an); var gt = GroundY(to);
                        if (float.IsNaN(ga) || float.IsNaN(gt)) { side++; continue; }
                        // the ankle over its height above a flat sole (the toe bones of these rigs do not keep to the
                        // ball of the foot in motion; the sole itself is measured on the mesh: F1, W6)
                        var hh = an.y - ga - aS;
                        var h = hh;
                        if (side == 0) _minL = Mathf.Min(_minL, h); else _minR = Mathf.Min(_minR, h);
                        var v = Flat(an - pan).magnitude / dt;
                        if (k != K.Walk) _f4Now.Add((h, v * 100f, side));   // walking skate is measured on the soles themselves (MeshMeasures)
                        side++;
                    }
                    if (k != K.Walk && _f4Now.Count > 0 && !string.IsNullOrEmpty(State))
                    {
                        if (!Samples.TryGetValue(State, out var f4Map)) Samples[State] = f4Map = new Dictionary<string, List<float>>();
                        if (!f4Map.TryGetValue("F4", out var f4List)) f4Map["F4"] = f4List = new List<float>();
                        if (f4List.Count > _f4Base) f4List.RemoveRange(_f4Base, f4List.Count - _f4Base);
                        foreach (var (fh, fv, fs) in _f4Now)
                            if (fh <= (fs == 0 ? _minL : _minR) + 0.02f) f4List.Add(fv);
                    }
                    if (TracePath != null && State != null && TraceState != null && State.StartsWith(TraceState))
                        System.IO.File.AppendAllText(TracePath, $"{State},{Time.time:0.000},{root.x:0.000},{root.z:0.000},{ankleL.y - GroundY(ankleL) - _ankleSoleL:0.000},{toeL.y - GroundY(toeL) - _toeSoleL:0.000},{ankleL.z:0.000},{ankleR.y - GroundY(ankleR) - _ankleSoleR:0.000},{toeR.y - GroundY(toeR) - _toeSoleR:0.000},{ankleR.z:0.000},{_a.GetFloat("Speed"):0.000},{_hips.position.z - root.z:0.000},{FootDiag()},{_traceA1L:0.0},{_traceA1R:0.0},{ElbowTrace()},{StageTrace()},{HoldTrace()}\n");
                }
                // the stance
                if (k == K.Stand)
                {
                    var fwd = Flat(_root.forward).normalized;
                    var rt = Vector3.Cross(Vector3.up, fwd);
                    Add("F3w", Mathf.Abs(Vector3.Dot(ankleL - ankleR, rt)) * 100f);
                    Add("F3a", Mathf.Abs(Vector3.Dot(ankleL - ankleR, fwd)) * 100f);
                    Add("F3s", Vector3.Angle(Flat(toeL - ankleL).normalized, fwd));
                    Add("F3s", Vector3.Angle(Flat(toeR - ankleR).normalized, fwd));
                }
                // the mesh, a few times a second
                // (by frames when the gate's frames are fixed: by Time.time the frames baked shifted from run to run with the
                // editor's start, docs/PEOPLE_MOTION.md §1.9, 2026-11-07)
                var every = Time.captureDeltaTime > 0f ? Mathf.Max(1, Mathf.RoundToInt(1f / (BakeHz * Time.captureDeltaTime))) : 0;
                if (every > 0 ? (++_bakeCount >= every || k == K.Walk) : (Time.time >= _nextBake || k == K.Walk))
                {
                    _bakeCount = 0;
                    _nextBake = Time.time + 1f / BakeHz;
                    MeshMeasures(k);
                }
                if (k == K.Stand || k == K.Walk) Palms(k);
                if (_ac == null) _ac = GetComponent<SecondFace.Game.People.ArmClearance>();
                if (_ac != null && State != null)
                {
                    if (!ArmDiag.TryGetValue(State, out var ad)) ad = (0, 0, new double[_ac.Diag.Length]);
                    for (var q = 0; q < _ac.Diag.Length && q < ad.Sum.Length; q++) ad.Sum[q] += _ac.Diag[q];
                    ArmDiag[State] = (ad.N + 1, ad.Resting + (_ac.DiagResting ? 1 : 0), ad.Sum);
                    if (ad.N == 90 && _ac.DiagResting && !ArmWhere.ContainsKey(State)) ArmWhere[State] = Where();
                }
            }
            _prevAnkleL = ankleL; _prevAnkleR = ankleR; _prevToeL = toeL; _prevToeR = toeR; _prevRoot = root; _havePrev = true;
        }

        private static Vector3 Flat(Vector3 v) => new(v.x, 0f, v.z);

        /// <summary>What the game's own skin says at a clipping vertex: its nearest arm point, how deep it reads it, and the body
        /// point it judged by (for the report: a clip the game does not see is a skin problem, one it sees is a push undone).</summary>
        private string Runtime(Vector3[] v, int at)
        {
            var skin = GetComponent<SecondFace.Game.People.BodySkin>();
            if (skin == null || !skin.Ready || at < 0) return "";
            var p = v[at];
            int best = -1; var bd = float.MaxValue;
            for (int i = skin.Begin(SecondFace.Game.People.BodySkin.Part.UpperArmL), to = skin.End(SecondFace.Game.People.BodySkin.Part.HandR); i < to; i++)
            {
                var d = (skin.P[i] - p).sqrMagnitude;
                if (d < bd) { bd = d; best = i; }
            }
            if (best < 0) return "";
            var inside = skin.Depth(skin.P[best], out var depth, out var n);
            var near = skin.Near;
            var nearDesc = near >= 0 ? $"{skin.PartOf(near)} point {near} off {skin.Off(near) * 100f:0.0} cm, {(skin.P[near] - skin.P[best]).magnitude * 100f:0.0} cm away" : "none";
            return $"; the game's nearest arm point ({skin.PartOf(best)} {best}, {Mathf.Sqrt(bd) * 100f:0.0} cm from it) reads {(inside ? (depth * 100f).ToString("0.0") : "nothing")} cm, by {nearDesc}";
        }

        /// <summary>Whether the game's skin has a body point where the mesh's body vertex is (a missing one: a clip it cannot
        /// see; a near one: a clip its depth test misjudges).</summary>
        private string RuntimeBody(Vector3[] v, int at)
        {
            var skin = GetComponent<SecondFace.Game.People.BodySkin>();
            if (skin == null || !skin.Ready || at < 0) return "";
            var p = v[at];
            int best = -1; var bd = float.MaxValue;
            for (int i = skin.Begin(SecondFace.Game.People.BodySkin.Part.Torso), to = skin.End(SecondFace.Game.People.BodySkin.Part.ThighR); i < to; i++)
            {
                var d = (skin.P[i] - p).sqrMagnitude;
                if (d < bd) { bd = d; best = i; }
            }
            if (best < 0) return "";
            var inv = Quaternion.Inverse(_root.rotation);
            var rel = inv * (p - _hips.position) * 100f;
            return $"; the body vertex at ({rel.x:0},{rel.y:0},{rel.z:0}) has the game's {skin.PartOf(best)} point {best} {Mathf.Sqrt(bd) * 100f:0.0} cm off it (normal {(inv * skin.N[best]).x:0.0},{(inv * skin.N[best]).y:0.0},{(inv * skin.N[best]).z:0.0})";
        }

        private SecondFace.Game.People.FootPlant _fp;
        /// <summary>For the trace: how far (along the ground) the gate's ball point is from the foot plant's own (m).</summary>
        private string Gap(int side, Vector3[] v)
        {
            if (_fp == null || _solePoint[side * 2 + 1] < 0) return "";
            var b = side == 0 ? _fp.BallL : _fp.BallR; var g = v[_solePoint[side * 2 + 1]];
            return new Vector2(g.x - b.x, g.z - b.z).magnitude.ToString("0.000");
        }

        /// <summary>For the trace: each elbow's lean out (x100) and its bend added at rest (degrees), left then right.</summary>
        private string ElbowTrace()
        {
            if (_ac == null) _ac = GetComponent<SecondFace.Game.People.ArmClearance>();
            if (_ac == null || _ac.Diag == null || _ac.Diag.Length < 16) return ",,,,,,,,,";
            var d = _ac.Diag;
            // and each hand's place: the learned extra offset and the skin's furthest out beside the leg (cm), the hand's gap (m)
            return $"{d[12]:0},{d[13]:0},{d[14]:0.0},{d[15]:0.0},{d[4]:0.0},{d[10]:0.0},{d[5]:0.0},{d[11]:0.0},{d[1]:0.000},{d[3]:0.000}";
        }
        private readonly float[] _footLow = new float[2];
        /// <summary>Each hand's deepest point in the game's skin at each step of the arm clearance (cm; ArmClearance.HandDepth).</summary>
        private string HoldTrace()
        {
            var a4 = $",{_traceA4L:0.0},{_traceA4R:0.0}";
            if (_ac == null || _ac.Hold == null || _ac.Hold.Length < 8) return ",,,,,,," + a4;
            return string.Join(",", _ac.Hold.Select(x => x.ToString("0.00"))) + a4;
        }

        private string StageTrace()
        {
            if (_ac == null) _ac = GetComponent<SecondFace.Game.People.ArmClearance>();
            if (_ac == null || _ac.HandDepth == null || _ac.HandDepth.Length < 12) return ",,,,,,,,,,,";
            _ac.TraceStages = true;
            return string.Join(",", _ac.HandDepth.Select(x => (x * 100f).ToString("0.0")));
        }

        private string FootDiag()
        {
            if (_fp == null) _fp = GetComponent<SecondFace.Game.People.FootPlant>();
            if (_fp == null) return "";
            var d = _fp.Diag;
            var s = $"{d[0]:0.000},{d[1]:0.000},{d[2]:0.000},{d[3]:0.0},{d[4]:0.000},{d[5]:0.000},{d[6]:0.000},{d[7]:0.0}";
            s = d.Length >= 12 ? s + $",{d[8]:0.000},{d[9]:0.000},{d[10]:0.000},{d[11]:0.000}" : s + ",,,,";
            s = d.Length >= 14 ? s + $",{d[12]:0.000},{d[13]:0.000}" : s + ",,";
            s = d.Length >= 16 ? s + $",{d[14]:0.000},{d[15]:0.000}" : s + ",,";
            return d.Length >= 18 ? s + $",{d[16]:0.0},{d[17]:0.0}" : s + ",,";
        }

        private static readonly (HumanBodyBones Hand, HumanBodyBones P, HumanBodyBones M, HumanBodyBones D)[] Digits =
        {
            (HumanBodyBones.LeftHand, HumanBodyBones.LeftIndexProximal, HumanBodyBones.LeftIndexIntermediate, HumanBodyBones.LeftIndexDistal),
            (HumanBodyBones.LeftHand, HumanBodyBones.LeftMiddleProximal, HumanBodyBones.LeftMiddleIntermediate, HumanBodyBones.LeftMiddleDistal),
            (HumanBodyBones.LeftHand, HumanBodyBones.LeftRingProximal, HumanBodyBones.LeftRingIntermediate, HumanBodyBones.LeftRingDistal),
            (HumanBodyBones.LeftHand, HumanBodyBones.LeftLittleProximal, HumanBodyBones.LeftLittleIntermediate, HumanBodyBones.LeftLittleDistal),
            (HumanBodyBones.RightHand, HumanBodyBones.RightIndexProximal, HumanBodyBones.RightIndexIntermediate, HumanBodyBones.RightIndexDistal),
            (HumanBodyBones.RightHand, HumanBodyBones.RightMiddleProximal, HumanBodyBones.RightMiddleIntermediate, HumanBodyBones.RightMiddleDistal),
            (HumanBodyBones.RightHand, HumanBodyBones.RightRingProximal, HumanBodyBones.RightRingIntermediate, HumanBodyBones.RightRingDistal),
            (HumanBodyBones.RightHand, HumanBodyBones.RightLittleProximal, HumanBodyBones.RightLittleIntermediate, HumanBodyBones.RightLittleDistal),
        };

        private void Fingers()
        {
            foreach (var (hand, p, m, d) in Digits)
            {
                var th = B(hand); var tp = B(p); var tm = B(m); var td = B(d);
                if (th == null || tp == null || tm == null) continue;
                Add("A5", Vector3.Angle(tp.position - th.position, tm.position - tp.position));
                if (td != null) Add("A5", Vector3.Angle(tm.position - tp.position, td.position - tm.position));
            }
        }

        // the mesh: soles, hands at the thighs, nothing inside the body
        private readonly Vector3[] _sole = new Vector3[4];
        private readonly float[] _soleH = { 1f, 1f, 1f, 1f };
        private readonly Vector3[] _soleWas = new Vector3[4];
        private string _soleState;
        /// <summary>The vertices of each foot's heel and ball, chosen at rest (left heel, left ball, right heel, right ball).</summary>
        private readonly int[] _solePoint = { -1, -1, -1, -1 };
        private float _soleT;
        private Vector3 _soleRoot;

        /// <summary>Which way each palm faces against the body's front (A6, degrees: 0 facing forward, 90 facing the thigh,
        /// 180 facing back). Relaxed arms, hanging or swinging, never turn the palms forward.</summary>
        private void Palms(K k)
        {
            var fwd = Flat(_root.forward).normalized;
            foreach (var (hand, index, middle, little, thumb) in new[]
                     {
                         (HumanBodyBones.LeftHand, HumanBodyBones.LeftIndexProximal, HumanBodyBones.LeftMiddleProximal, HumanBodyBones.LeftLittleProximal, HumanBodyBones.LeftThumbDistal),
                         (HumanBodyBones.RightHand, HumanBodyBones.RightIndexProximal, HumanBodyBones.RightMiddleProximal, HumanBodyBones.RightLittleProximal, HumanBodyBones.RightThumbDistal),
                     })
            {
                var h = B(hand); var i = B(index); var m = B(middle); var l = B(little); var t = B(thumb);
                if (h == null || i == null || m == null || l == null) continue;
                var across = (l.position - i.position).normalized;
                var along = (m.position - h.position).normalized;
                var n = Vector3.Cross(across, along).normalized;
                // the palm's side is the side the curled fingers' tips and the thumb lie on
                var md = B(middle + 2);
                var probe = md != null ? md.position : (t != null ? t.position : m.position + n);
                if (Vector3.Dot(probe - m.position, n) < 0f) n = -n;
                Add("A6", Vector3.Angle(n, fwd));
            }
        }

        private readonly Dictionary<Vector3Int, List<int>> _grid = new();
        private const float Cell = 0.03f;

        private void MeshMeasures(K k)
        {
            var v = Bake(out var n);
            if (v.Length != _seg.Length) { Error = "the baked mesh changed its vertex count"; return; }
            var hasNormals = n != null && n.Length == v.Length;
            // walking, on the soles themselves: each foot's lowest skin over the ground and where it is; a sole within 2.5 cm
            // of the ground two samples running is down, and its sliding is the skate (W1, W2; Mir et al. 2023 measure on
            // foot vertices below H = 2.5 cm); the lower foot's sole is the stance's height (W6)
            // a new state starts the soles' history afresh (the gate sets the person back at the start of the next walk: a
            // teleport, not a step; it read as a 2-3 m/s skate, 2026-11-06)
            if (State != _soleState) { _soleT = 0f; _soleState = State; }
            if (k == K.Walk)
            {
                var lowest = float.MaxValue; var lowestSide = -1;
                var still = new[] { float.MaxValue, float.MaxValue };   // each foot's slowest sole point now (m/s)
                var body = _soleT > 0f && _clock > _soleT ? Flat(_root.position - _soleRoot).magnitude / (_clock - _soleT) : 0f;
                for (var side = 0; side < 2; side++)
                {
                    var part = side == 0 ? Part.FootL : Part.FootR;
                    var ankle = side == 0 ? B(HumanBodyBones.LeftFoot).position : B(HumanBodyBones.RightFoot).position;
                    var g = GroundY(ankle);
                    if (float.IsNaN(g)) continue;
                    var low = float.MaxValue;
                    for (var i = 0; i < v.Length; i++) if (_seg[i] == (byte)part) low = Mathf.Min(low, v[i].y);
                    if (low < float.MaxValue && low - g < lowest) { lowest = low - g; lowestSide = side; }
                    if (low < float.MaxValue) _footLow[side] = low - g;
                    // the skate on fixed points of the sole (its heel and its ball: a rolling foot's lowest point moves along
                    // the foot as a real one's does, a fixed point down on the ground does not move)
                    for (var q = 0; q < 2; q++)
                    {
                        var j = _solePoint[side * 2 + q];
                        if (j < 0) continue;
                        var h = v[j].y - g;
                        var slot = side * 2 + q;
                        if (_soleT > 0f && _clock > _soleT) still[side] = Mathf.Min(still[side], Flat(v[j] - _sole[slot]).magnitude / (_clock - _soleT));
                        if (h < 0.025f && _soleH[slot] < 0.025f && _soleT > 0f && _clock > _soleT)
                        {
                            var speed = Flat(v[j] - _sole[slot]).magnitude / (_clock - _soleT);
                            Add("W1", speed * 100f);
                            if (body > 0.3f) Add("W2", speed / body);
                        }
                        _sole[slot] = v[j]; _soleH[slot] = h;
                    }
                }
                // the stance's height: the lower foot's sole, while it bears weight (nearly still: not a swing, not a jog's
                // flight, when both feet are off the ground and moving)
                if (lowestSide >= 0 && still[lowestSide] < 0.5f) Add("W6", lowest * 100f);
                // the soles' trace (the gate's own heel and ball points, over the ground, and how fast each moves) beside
                // what the foot plant saw, frame by frame
                if (TracePath != null && State != null && TraceState != null && State.StartsWith(TraceState))
                {
                    var dtS = _soleT > 0f && _clock > _soleT ? _clock - _soleT : 0f;
                    string Sp(int q) => dtS > 0f && _solePoint[q] >= 0 ? (Flat(v[_solePoint[q]] - _soleWas[q]).magnitude / dtS).ToString("0.00") : "";
                    var path = TracePath.Replace(".csv", "_soles.csv");
                    if (!System.IO.File.Exists(path)) System.IO.File.WriteAllText(path, "state,t,body,hL,bL,hR,bR,vhL,vbL,vhR,vbR,dipL,clearL,liftL,lockL,dipR,clearR,liftR,lockR,sink,low,eL,eR,gL,gR,slipL,slipR,rL,rR,gapL,gapR,lowL,lowR\n");
                    System.IO.File.AppendAllText(path, $"{State},{Time.time:0.000},{body:0.00},{_soleH[0]:0.000},{_soleH[1]:0.000},{_soleH[2]:0.000},{_soleH[3]:0.000},{Sp(0)},{Sp(1)},{Sp(2)},{Sp(3)},{FootDiag()},{Gap(0, v)},{Gap(1, v)},{_footLow[0]:0.000},{_footLow[1]:0.000}\n");
                }
                for (var q = 0; q < 4; q++) if (_solePoint[q] >= 0) _soleWas[q] = v[_solePoint[q]];
                _soleT = _clock; _soleRoot = _root.position;
            }
            else _soleT = 0f;
            // soles
            if (k != K.Walk)
                foreach (var (part, ankle, toes) in new[] { (Part.FootL, B(HumanBodyBones.LeftFoot), B(HumanBodyBones.LeftToes)), (Part.FootR, B(HumanBodyBones.RightFoot), B(HumanBodyBones.RightToes)) })
                {
                    if (toes == null) continue;
                    var fwd = Flat(toes.position - ankle.position);
                    if (fwd.sqrMagnitude < 1e-6f) continue;
                    fwd.Normalize();
                    var toesAlong = Vector3.Dot(toes.position - ankle.position, fwd);
                    Vector3? heel = null, ball = null;
                    for (var i = 0; i < v.Length; i++)
                    {
                        if (_seg[i] != (byte)part) continue;
                        var along = Vector3.Dot(v[i] - ankle.position, fwd);
                        if (along < -0.01f) { if (heel == null || v[i].y < heel.Value.y) heel = v[i]; }
                        else if (along > toesAlong - 0.04f && along < toesAlong + 0.02f) { if (ball == null || v[i].y < ball.Value.y) ball = v[i]; }
                    }
                    if (heel == null || ball == null) continue;
                    var gh = GroundY(heel.Value); var gb = GroundY(ball.Value);
                    if (float.IsNaN(gh) || float.IsNaN(gb)) continue;
                    var hh = (heel.Value.y - gh) * 100f; var bh = (ball.Value.y - gb) * 100f;
                    // a lifted foot (a step) is not standing on anything: only a foot with some of its sole down is held to F1;
                    // how much of the time a standing foot is in the air is F5
                    var up = Mathf.Min(hh, bh) >= 3f;
                    if (k == K.Stand) Add("F5", up ? 1f : 0f);
                    if (!up) { Add("F1", hh); Add("F1", bh); Add("F2", hh - bh); }
                }
            // once, standing: the game's own skin points (BodySkin, posed from the bones as they are now) against this very
            // mesh: each should lie on one of its vertices (calibration is no moment for it: SetHumanPose there moves the
            // skeleton until the animation takes it back)
            if (SkinFit == null && k == K.Stand)
            {
                var skin = GetComponent<SecondFace.Game.People.BodySkin>();
                if (skin != null && skin.Ready)
                {
                    skin.Pose();
                    var worstFit = 0f; var sumFit = 0.0; var worstAt = -1; var normalOff = 0;
                    for (var q = 0; q < skin.Count; q++)
                    {
                        var best = float.MaxValue; var bi = -1;
                        for (var i = 0; i < v.Length; i++) { var d = (v[i] - skin.P[q]).sqrMagnitude; if (d < best) { best = d; bi = i; } }
                        var dist = Mathf.Max(0f, Mathf.Sqrt(best) - skin.Off(q));
                        sumFit += dist;
                        if (dist > worstFit) { worstFit = dist; worstAt = q; }
                        if (bi >= 0 && hasNormals && Vector3.Dot(n[bi], skin.N[q]) < 0.5f) normalOff++;
                    }
                    SkinFit = $"{State}: mean {sumFit / Mathf.Max(1, skin.Count) * 100:0.00} cm, worst {worstFit * 100:0.0} cm (point {worstAt}), normals off {normalOff} of {skin.Count}";
                    SkinWhy = skin.Explain(worstAt);
                }
            }
            // the body's surface near the hands: torso, hips and thighs, in a grid
            _grid.Clear();
            for (var i = 0; i < v.Length; i++)
            {
                var s = (Part)_seg[i];
                if (s != Part.Torso && s != Part.ThighL && s != Part.ThighR) continue;
                var c = new Vector3Int(Mathf.FloorToInt(v[i].x / Cell), Mathf.FloorToInt(v[i].y / Cell), Mathf.FloorToInt(v[i].z / Cell));
                if (!_grid.TryGetValue(c, out var l)) _grid[c] = l = new List<int>();
                l.Add(i);
            }
            var depthMax = 0f;
            string worst = null;
            var worstVertex = -1; var worstBody = -1;
            var gapL = float.MaxValue; var gapR = float.MaxValue;
            int hvL = -1, bvL = -1, hvR = -1, bvR = -1;
            _handL.Clear(); _handR.Clear();
            // the hips' and thighs' points for the hands' gap, every one (the gap may be wider than the grid's reach; every
            // third of a Rocketbox mesh's points, 4-5 cm apart, overstated the gap by several cm)
            var coarse = new List<int>();
            for (var i = 0; i < v.Length; i++)
            {
                var s = (Part)_seg[i];
                if (s == Part.ThighL || s == Part.ThighR || (s == Part.Torso && v[i].y < _hips.position.y + 0.15f)) coarse.Add(i);
            }
            if (_isCoarse == null || _isCoarse.Length != v.Length) _isCoarse = new bool[v.Length];
            System.Array.Clear(_isCoarse, 0, _isCoarse.Length);
            foreach (var j in coarse) _isCoarse[j] = true;
            for (var i = 0; i < v.Length; i++)
            {
                var s = (Part)_seg[i];
                var hand = s == Part.HandL || s == Part.HandR;
                if (!hand && s != Part.ForearmL && s != Part.ForearmR && !_armLow[i]) continue;
                var p = v[i];
                var c = new Vector3Int(Mathf.FloorToInt(p.x / Cell), Mathf.FloorToInt(p.y / Cell), Mathf.FloorToInt(p.z / Cell));
                // the three nearest points of the body's surface: inside only when all three face away from the point (a
                // single nearest point can be the inside of a hem or a layer, facing in)
                float b0 = float.MaxValue, b1 = float.MaxValue, b2 = float.MaxValue; int i0 = -1, i1 = -1, i2 = -1;
                for (var dx = -1; dx <= 1; dx++)
                    for (var dy = -1; dy <= 1; dy++)
                        for (var dz = -1; dz <= 1; dz++)
                            if (_grid.TryGetValue(new Vector3Int(c.x + dx, c.y + dy, c.z + dz), out var l))
                                foreach (var j in l)
                                {
                                    var d = (v[j] - p).sqrMagnitude;
                                    if (d < b0) { b2 = b1; i2 = i1; b1 = b0; i1 = i0; b0 = d; i0 = j; }
                                    else if (d < b1) { b2 = b1; i2 = i1; b1 = d; i1 = j; }
                                    else if (d < b2) { b2 = d; i2 = j; }
                                }
                if (i2 >= 0 && hasNormals)
                {
                    var depth = Mathf.Min(-Vector3.Dot(p - v[i0], n[i0]), Mathf.Min(-Vector3.Dot(p - v[i1], n[i1]), -Vector3.Dot(p - v[i2], n[i2])));
                    if (depth > 0f) _candidates.Add((i, i0, depth));
                }
                if (hand && k == K.Stand && (i % 2 == 0))
                {
                    var g = float.MaxValue; var gj = -1;
                    foreach (var j in coarse) { var dj = (v[j] - p).sqrMagnitude; if (dj < g) { g = dj; gj = j; } }
                    if (s == Part.HandL) { _handL.Add(i); if (g < gapL) { gapL = g; hvL = i; bvL = gj; } }
                    else { _handR.Add(i); if (g < gapR) { gapR = g; hvR = i; bvR = gj; } }
                }
            }
            // a candidate is in the body only if rays from it cross the body's surface an odd number of times (two of three
            // level rays): the three nearest points can all face away from a point beside the top of a shoulder or below
            // a hem, which is outside (2026-11-06)
            if (_candidates.Count > 0)
            {
                Collide(v);
                _candidates.Sort((x, y) => y.Depth.CompareTo(x.Depth));   // the deepest first: the first confirmed is the measure
                foreach (var (i, i0, depth) in _candidates)
                {
                    if (depth <= depthMax || !InBody(v[i])) continue;
                    depthMax = depth;
                    worstVertex = i; worstBody = i0;
                    worst = $"{(Part)_seg[i]} vertex {i} {depth * 100f:0.0} cm under {(Part)_seg[i0]} vertex {i0} (at {(v[i0].y - _root.position.y):0.00} m, normal {n[i0].x:0.00},{n[i0].y:0.00},{n[i0].z:0.00} in the body's frame {Quaternion.Inverse(_root.rotation) * n[i0]})";
                    break;
                }
                _candidates.Clear();
            }
            Add("C1", depthMax * 100f);
            if (depthMax > 0.005f && worst != null && (!WorstClip.TryGetValue(State, out var w) || w.Item1 < depthMax)) WorstClip[State] = (depthMax, worst + Runtime(v, worstVertex) + RuntimeBody(v, worstBody));
            // the hands' gap to the hips' and thighs' surface, not to their vertices: a coarse thigh's vertices stand 6-7 cm
            // apart, so a hand resting 1.5 cm off its skin read 6 cm from the nearest vertex (A4, 2026-11-08); the nearest
            // point on their triangles (the vertex's gap is never less: the surface passes through every vertex)
            var cpL = bvL >= 0 ? v[bvL] : Vector3.zero; var cpR = bvR >= 0 ? v[bvR] : Vector3.zero;
            if (k == K.Stand)
            {
                Surface(v, _handL, ref gapL, ref hvL, ref bvL, ref cpL);
                Surface(v, _handR, ref gapR, ref hvR, ref bvR, ref cpR);
            }
            if (k == K.Stand)
            {
                if (gapL < float.MaxValue) Add("A4", Mathf.Sqrt(gapL) * 100f);
                if (gapR < float.MaxValue) Add("A4", Mathf.Sqrt(gapR) * 100f);
                _traceA4L = gapL < float.MaxValue ? Mathf.Sqrt(gapL) * 100f : -1f;
                _traceA4R = gapR < float.MaxValue ? Mathf.Sqrt(gapR) * 100f : -1f;
                // (the worst past the limit, and where: the gate's vertices and the game's own nearest hand and body points)
                var inv = Quaternion.Inverse(_root.rotation);
                string Lc(Vector3 w) { var r = inv * (w - _hips.position) * 100f; return $"({r.x:0},{r.y:0},{r.z:0})"; }
                for (var side = 0; side < 2; side++)
                {
                    var a4 = side == 0 ? _traceA4L : _traceA4R;
                    int hv = side == 0 ? hvL : hvR, bv = side == 0 ? bvL : bvR;
                    var cp = side == 0 ? cpL : cpR;
                    if (a4 <= 6f || hv < 0 || bv < 0) continue;
                    if (WorstHand.TryGetValue(State, out var wh) && wh.Item1 >= a4) continue;
                    var game = _ac != null ? Where(side == 0 ? 1 : 3, side == 0 ? "L hand" : "R hand") : "no clearance";
                    var gate = $"{(side == 0 ? "L" : "R")} {(Part)_seg[hv]} vertex {hv} {Lc(v[hv])} -> {(Part)_seg[bv]} by vertex {bv} at {Lc(cp)} {a4:0.0} cm";
                    var arm = _ac != null && _ac.Diag.Length >= 4 ? $"; the game's hand gap then {_ac.Diag[side == 0 ? 1 : 3] * 100f:0.0} cm, resting {_ac.DiagResting}" : "";
                    WorstHand[State] = (a4, $"{gate}; the game's {game}{arm}; a1 {(side == 0 ? _traceA1L : _traceA1R):0.0}");
                }
            }
        }

        private readonly List<int> _handL = new(), _handR = new();
        private bool[] _isCoarse;
        private int[] _gapTris;

        /// <summary>A hand's gap (squared, m²) brought down to the nearest point on the hips' and thighs' triangles (those
        /// whose three vertices are among the gap's points), from its gap to their vertices.</summary>
        private void Surface(Vector3[] v, List<int> hand, ref float gap2, ref int hv, ref int bv, ref Vector3 cp)
        {
            if (hand.Count == 0 || gap2 == float.MaxValue) return;
            if (_gapTris == null)
            {
                var all = _baked.triangles;
                var keep = new List<int>();
                bool Body(int i) { var s = (Part)_seg[i]; return s == Part.Torso || s == Part.ThighL || s == Part.ThighR; }
                for (var t = 0; t + 2 < all.Length; t += 3)
                    if (Body(all[t]) && Body(all[t + 1]) && Body(all[t + 2])) { keep.Add(all[t]); keep.Add(all[t + 1]); keep.Add(all[t + 2]); }
                _gapTris = keep.ToArray();
            }
            var lo = v[hand[0]]; var hi = lo;
            foreach (var i in hand) { lo = Vector3.Min(lo, v[i]); hi = Vector3.Max(hi, v[i]); }
            var best = Mathf.Sqrt(gap2);
            for (var t = 0; t + 2 < _gapTris.Length; t += 3)
            {
                int a = _gapTris[t], b = _gapTris[t + 1], c = _gapTris[t + 2];
                if (!_isCoarse[a] || !_isCoarse[b] || !_isCoarse[c]) continue;
                var tlo = Vector3.Min(v[a], Vector3.Min(v[b], v[c])); var thi = Vector3.Max(v[a], Vector3.Max(v[b], v[c]));
                if (BoxGap(lo, hi, tlo, thi) >= best) continue;
                foreach (var i in hand)
                {
                    var p = v[i];
                    if (BoxGap(p, p, tlo, thi) >= best) continue;
                    var q = ClosestOnTriangle(p, v[a], v[b], v[c]);
                    var d = (q - p).magnitude;
                    if (d < best) { best = d; hv = i; bv = a; cp = q; }
                }
            }
            gap2 = best * best;
        }

        private static float BoxGap(Vector3 alo, Vector3 ahi, Vector3 blo, Vector3 bhi)
        {
            var dx = Mathf.Max(0f, Mathf.Max(blo.x - ahi.x, alo.x - bhi.x));
            var dy = Mathf.Max(0f, Mathf.Max(blo.y - ahi.y, alo.y - bhi.y));
            var dz = Mathf.Max(0f, Mathf.Max(blo.z - ahi.z, alo.z - bhi.z));
            return Mathf.Sqrt(dx * dx + dy * dy + dz * dz);
        }

        /// <summary>The nearest point to p on the triangle abc (Ericson, Real-Time Collision Detection, 5.1.5).</summary>
        private static Vector3 ClosestOnTriangle(Vector3 p, Vector3 a, Vector3 b, Vector3 c)
        {
            var ab = b - a; var ac = c - a; var ap = p - a;
            var d1 = Vector3.Dot(ab, ap); var d2 = Vector3.Dot(ac, ap);
            if (d1 <= 0f && d2 <= 0f) return a;
            var bp = p - b;
            var d3 = Vector3.Dot(ab, bp); var d4 = Vector3.Dot(ac, bp);
            if (d3 >= 0f && d4 <= d3) return b;
            var vc = d1 * d4 - d3 * d2;
            if (vc <= 0f && d1 >= 0f && d3 <= 0f) return a + ab * (d1 / (d1 - d3));
            var cp = p - c;
            var d5 = Vector3.Dot(ab, cp); var d6 = Vector3.Dot(ac, cp);
            if (d6 >= 0f && d5 <= d6) return c;
            var vb = d5 * d2 - d1 * d6;
            if (vb <= 0f && d2 >= 0f && d6 <= 0f) return a + ac * (d2 / (d2 - d6));
            var va = d3 * d6 - d5 * d4;
            if (va <= 0f && (d4 - d3) >= 0f && (d5 - d6) >= 0f) return b + (c - b) * ((d4 - d3) / ((d4 - d3) + (d5 - d6)));
            var denom = 1f / (va + vb + vc);
            return a + ab * (vb * denom) + ac * (vc * denom);
        }

        private void OnDestroy()
        {
            if (_baked != null) Destroy(_baked);
            _cv = null;
            _hp?.Dispose();
        }
    }
}
