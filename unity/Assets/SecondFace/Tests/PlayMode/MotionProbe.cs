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

        private Animator _a;
        private HumanPoseHandler _hp;
        private HumanPose _pose;
        private Transform _root, _head, _chest, _hips;
        private Quaternion _faceOff = Quaternion.identity, _chestOff = Quaternion.identity;
        private int _shoulderL = -1, _shoulderR = -1;
        private SkinnedMeshRenderer _smr;
        private byte[] _seg;
        private float _ankleSoleL, _ankleSoleR, _toeSoleL, _toeSoleR;
        private Vector3 _prevAnkleL, _prevAnkleR, _prevToeL, _prevToeR, _prevRoot;
        private bool _havePrev;
        private string _minState;
        private float _minL = float.MaxValue, _minR = float.MaxValue;
        /// <summary>Where to write a per-frame trace of the feet (a CSV), for the states whose name starts with <see cref="TraceState"/>.</summary>
        public string TracePath, TraceState;
        private float _nextBake;
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
            var bind = Bake(out _);   // the bind pose: standing, feet flat on the floor
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
            for (var i = 0; i < v.Length; i++)
            {
                var best = float.MaxValue; var part = Part.None;
                foreach (var (a, b, p) in segs)
                {
                    var d = DistSeg(v[i], a, b);
                    if (d < best) { best = d; part = p; }
                }
                _seg[i] = (byte)part;
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
                    if (k == K.Stand) { Add("A1", a1); Add("A2", Vector3.Angle(e - u, h - e)); Add("A3", Vector3.Angle(h - e, Vector3.down)); }
                    if (k == K.Walk) Add("W3", a1);
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
                if (_minState != State) { _minState = State; _minL = _minR = float.MaxValue; }
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
                        var low = side == 0 ? _minL : _minR;
                        side++;
                        if (h > low + 0.02f) continue;
                        var v = Flat(an - pan).magnitude / dt;
                        if (k != K.Walk) Add("F4", v * 100f);   // walking skate is measured on the soles themselves (MeshMeasures)
                    }
                    if (TracePath != null && State != null && TraceState != null && State.StartsWith(TraceState))
                        System.IO.File.AppendAllText(TracePath, $"{State},{Time.time:0.000},{root.x:0.000},{root.z:0.000},{ankleL.y - GroundY(ankleL) - _ankleSoleL:0.000},{toeL.y - GroundY(toeL) - _toeSoleL:0.000},{ankleL.z:0.000},{ankleR.y - GroundY(ankleR) - _ankleSoleR:0.000},{toeR.y - GroundY(toeR) - _toeSoleR:0.000},{ankleR.z:0.000},{_a.GetFloat("Speed"):0.000},{_hips.position.z - root.z:0.000}\n");
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
                if (Time.time >= _nextBake || k == K.Walk)
                {
                    _nextBake = Time.time + 1f / BakeHz;
                    MeshMeasures(k);
                }
                if (k == K.Stand || k == K.Walk) Palms(k);
            }
            _prevAnkleL = ankleL; _prevAnkleR = ankleR; _prevToeL = toeL; _prevToeR = toeR; _prevRoot = root; _havePrev = true;
        }

        private static Vector3 Flat(Vector3 v) => new(v.x, 0f, v.z);

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
            if (k == K.Walk)
            {
                var lowest = float.MaxValue;
                var body = _soleT > 0f && Time.time > _soleT ? Flat(_root.position - _soleRoot).magnitude / (Time.time - _soleT) : 0f;
                for (var side = 0; side < 2; side++)
                {
                    var part = side == 0 ? Part.FootL : Part.FootR;
                    var ankle = side == 0 ? B(HumanBodyBones.LeftFoot).position : B(HumanBodyBones.RightFoot).position;
                    var g = GroundY(ankle);
                    if (float.IsNaN(g)) continue;
                    var low = float.MaxValue;
                    for (var i = 0; i < v.Length; i++) if (_seg[i] == (byte)part) low = Mathf.Min(low, v[i].y);
                    if (low < float.MaxValue) lowest = Mathf.Min(lowest, low - g);
                    // the skate on fixed points of the sole (its heel and its ball: a rolling foot's lowest point moves along
                    // the foot as a real one's does, a fixed point down on the ground does not move)
                    for (var q = 0; q < 2; q++)
                    {
                        var j = _solePoint[side * 2 + q];
                        if (j < 0) continue;
                        var h = v[j].y - g;
                        var slot = side * 2 + q;
                        if (h < 0.025f && _soleH[slot] < 0.025f && _soleT > 0f && Time.time > _soleT)
                        {
                            var speed = Flat(v[j] - _sole[slot]).magnitude / (Time.time - _soleT);
                            Add("W1", speed * 100f);
                            if (body > 0.3f) Add("W2", speed / body);
                        }
                        _sole[slot] = v[j]; _soleH[slot] = h;
                    }
                }
                if (lowest < float.MaxValue) Add("W6", lowest * 100f);
                _soleT = Time.time; _soleRoot = _root.position;
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
            var gapL = float.MaxValue; var gapR = float.MaxValue;
            // coarse body points for the hands' gap (the gap may be wider than the grid's reach)
            var coarse = new List<int>();
            for (var i = 0; i < v.Length; i += 3)
            {
                var s = (Part)_seg[i];
                if (s == Part.ThighL || s == Part.ThighR || (s == Part.Torso && v[i].y < _hips.position.y + 0.15f)) coarse.Add(i);
            }
            for (var i = 0; i < v.Length; i++)
            {
                var s = (Part)_seg[i];
                var hand = s == Part.HandL || s == Part.HandR;
                if (!hand && s != Part.ForearmL && s != Part.ForearmR) continue;
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
                    if (depth > depthMax)
                    {
                        depthMax = depth;
                        worst = $"{(Part)_seg[i]} vertex {i} {depth * 100f:0.0} cm under {(Part)_seg[i0]} vertex {i0} (at {(v[i0].y - _root.position.y):0.00} m, normal {n[i0].x:0.00},{n[i0].y:0.00},{n[i0].z:0.00} in the body's frame {Quaternion.Inverse(_root.rotation) * n[i0]})";
                    }
                }
                if (hand && k == K.Stand && (i % 2 == 0))
                {
                    var g = float.MaxValue;
                    foreach (var j in coarse) g = Mathf.Min(g, (v[j] - p).sqrMagnitude);
                    if (s == Part.HandL) gapL = Mathf.Min(gapL, g); else gapR = Mathf.Min(gapR, g);
                }
            }
            Add("C1", depthMax * 100f);
            if (depthMax > 0.015f && worst != null && (!WorstClip.TryGetValue(State, out var w) || w.Item1 < depthMax)) WorstClip[State] = (depthMax, worst);
            if (k == K.Stand)
            {
                if (gapL < float.MaxValue) Add("A4", Mathf.Sqrt(gapL) * 100f);
                if (gapR < float.MaxValue) Add("A4", Mathf.Sqrt(gapR) * 100f);
            }
        }

        private void OnDestroy()
        {
            if (_baked != null) Destroy(_baked);
            _hp?.Dispose();
        }
    }
}
