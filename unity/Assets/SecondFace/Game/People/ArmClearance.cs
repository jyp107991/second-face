using UnityEngine;

namespace SecondFace.Game.People
{
    /// <summary>
    /// Arms that stay out of the body (the owner's note, 2026-10-29: hands melded into the hips). The captured motion was
    /// taken from bodies of other widths; on a wider hip, a fuller figure or a coat, a hanging arm or a hand at the back
    /// passes into the body. After the animation (and its IK) each frame, the elbow, the forearm, the wrist and the hand
    /// are tested against the body's own torso (<see cref="TorsoProfile"/>, turning with the hips: a crouch leans it) with
    /// <see cref="Margin"/> to spare, and the upper arm is turned at the shoulder just enough to bring the deepest of them
    /// out, then again for what is left. The turn comes at once (nothing is ever seen inside) and goes over
    /// <see cref="Release"/> degrees a second (no pop when the hand moves away). Off while seated (hands rest on the lap).
    /// </summary>
    [RequireComponent(typeof(Animator))]
    [DefaultExecutionOrder(10)]   // after the clip, the foot plant, the gaze and the hands (HandPose: 5)
    public sealed class ArmClearance : MonoBehaviour
    {
        /// <summary>With the body's own skin (<see cref="BodySkin"/>, within <see cref="SkinRange"/> m of the camera): an
        /// arm is held this far off the body's surface, or its clothes'.</summary>
        public float SkinMargin = 0.003f;
        /// <summary>Moving (not at rest), the arm is held this much further off the body's skin (m): the skin the game holds
        /// stands under a uniform's surface by about a centimetre in places, and a walking man's swinging arms went 0.8-1.1
        /// cm into his chest's side (C1, 2026-11-06). At rest the hand's place and the elbow's contact set it instead.</summary>
        public float MoveMargin = 0.006f;
        private float Margin3 => SkinMargin + MoveMargin * (1f - _restW);
        /// <summary>With the skin: a resting hand hangs this far from the side of the hip or thigh (A4), surface to surface.</summary>
        public float SkinGap = 0.006f;   // (1 cm off the clothes stood resting hands 6.0-6.5 cm from the thigh's skin, A4, 2026-11-06)
        /// <summary>With the skin: a resting hand that hangs behind the thigh's middle (into the buttock, the clip taken on
        /// a flatter body) is brought forward to the thigh's side, by at most this many degrees at the shoulder.</summary>
        public float RestForward = 14f;
        public float SkinRange = 1000f;   // (PeopleService turns the whole component off past 60 m; counted from the camera here, a walker the camera did not follow lost the skin, C1, 2026-11-06)
        public float Margin = 0.02f;
        public float Release = 90f;
        /// <summary>Standing still, no gesture: an arm hanging away from the body is drawn in until the hand rests this far
        /// from the side of the hip or thigh (docs/PEOPLE_MOTION.md A4), by at most <see cref="RestMax"/>°, at
        /// <see cref="RestRate"/>° a second.</summary>
        public float RestGap = 0.035f, RestMax = 18f, RestRate = 30f;

        private static readonly int SpeedId = Animator.StringToHash("Speed");
        private float _restL, _restR;
        private Vector3 _restAxisL, _restAxisR;
        private int _gestureLayer = -2;
        private bool _hasSpeed;

        private Animator _animator;
        private TorsoProfile _profile;
        private BodySkin _skin;
        private float _fwdL, _fwdR, _carryL = -1f, _carryR = -1f, _twistL, _twistR;
        private Transform _hips, _lu, _ll, _lh, _ru, _rl, _rh, _tl, _kl, _tr, _kr, _lm, _lt, _rm, _rt;
        private float _angleL, _angleR;
        private Vector3 _axisL = Vector3.forward, _axisR = Vector3.forward;

        /// <summary>For the gate's report (tests read it): resting, each arm's elbow and hand gaps (m), and its holds
        /// (in, forward, carry at the elbow, the push-out), this frame; left then right.</summary>
        public bool DiagResting;
        public float[] Diag = new float[20];
        /// <summary>For the gate's report: the arm's point and the body's point that gave each gap this frame (left elbow,
        /// left hand, right elbow, right hand; arm then body; -1 none).</summary>
        public int[] DiagAt = new int[8];
        private int _gapArm = -1, _gapBody = -1;

        /// <summary>The turn given to each upper arm this frame, degrees (tests read it).</summary>
        public Vector2 Turned => new(_angleL, _angleR);
        public bool Ready => (SkinReady || (_profile != null && _profile.Bins > 1)) && _hips != null && _lu != null && _ru != null;
        /// <summary>The arms are held off the body's own skin (not the torso's sections).</summary>
        public bool SkinReady => _skin != null && _skin.Ready;

        private void Awake() => Bind();

        /// <summary>Finds the profile and the bones again (after a body is dressed or rebuilt).</summary>
        public void Bind()
        {
            _animator = GetComponent<Animator>();
            _profile = GetComponent<TorsoProfile>();
            _skin = GetComponent<BodySkin>();
            if (_skin != null && !_skin.Ready) _skin.Bind();
            if (_animator == null || !_animator.isHuman) return;
            _hips = _animator.GetBoneTransform(HumanBodyBones.Hips);
            _lu = _animator.GetBoneTransform(HumanBodyBones.LeftUpperArm);
            _ll = _animator.GetBoneTransform(HumanBodyBones.LeftLowerArm);
            _lh = _animator.GetBoneTransform(HumanBodyBones.LeftHand);
            _ru = _animator.GetBoneTransform(HumanBodyBones.RightUpperArm);
            _rl = _animator.GetBoneTransform(HumanBodyBones.RightLowerArm);
            _rh = _animator.GetBoneTransform(HumanBodyBones.RightHand);
            _lm = _animator.GetBoneTransform(HumanBodyBones.LeftMiddleProximal); _lt = _animator.GetBoneTransform(HumanBodyBones.LeftMiddleDistal);
            _rm = _animator.GetBoneTransform(HumanBodyBones.RightMiddleProximal); _rt = _animator.GetBoneTransform(HumanBodyBones.RightMiddleDistal);
            _tl = _animator.GetBoneTransform(HumanBodyBones.LeftUpperLeg); _kl = _animator.GetBoneTransform(HumanBodyBones.LeftLowerLeg);
            _tr = _animator.GetBoneTransform(HumanBodyBones.RightUpperLeg); _kr = _animator.GetBoneTransform(HumanBodyBones.RightLowerLeg);
            _gestureLayer = -2;
            _hasSpeed = false;
            if (_animator.runtimeAnimatorController != null)
                foreach (var p in _animator.parameters) if (p.nameHash == SpeedId) _hasSpeed = true;
        }

        private float _movedAt = -10f;

        /// <summary>Walking or running, or stopping from it in the last 0.8 s, and not gesturing.</summary>
        private bool Striding()
        {
            if (_gestureLayer >= 0 && _animator.GetLayerWeight(_gestureLayer) > 0.05f) return false;
            if (_hasSpeed && _animator.GetFloat(SpeedId) > 0.1f) _movedAt = Time.time;
            return Time.time - _movedAt < 0.8f;
        }

        /// <summary>Standing still and not gesturing (the arms hang).</summary>
        private bool Resting()
        {
            if (_animator.runtimeAnimatorController == null) return false;
            if (_gestureLayer == -2)
            {
                _gestureLayer = _animator.GetLayerIndex(Ambient.GestureLayer);
                _hasSpeed = false;
                foreach (var p in _animator.parameters) if (p.nameHash == SpeedId) _hasSpeed = true;
            }
            if (_hasSpeed && _animator.GetFloat(SpeedId) > 0.1f) return false;
            if (_gestureLayer >= 0 && _animator.GetLayerWeight(_gestureLayer) > 0.05f) return false;
            var state = _animator.GetCurrentAnimatorStateInfo(0);
            return !state.IsTag("sit") && !state.IsName("pickup") && !state.IsName("sneak");
        }

        /// <summary>Draws a hanging arm in to rest at the body's side (and lets it go again, at the same rate, about the axis
        /// it was drawn in on).</summary>
        private void Rest(Transform upper, Transform lower, Transform hand, ref float angle, ref Vector3 axis, bool resting, float dt)
        {
            if (upper == null || lower == null || hand == null) return;
            var need = 0f;
            if (resting)
            {
                var along = hand.position - lower.position;
                var p = hand.position + along.normalized * 0.08f;   // the hand's middle
                if (Gap(p, out var gap, out var inward) && gap > RestGap)
                {
                    var arm = p - upper.position;
                    var ax = Vector3.Cross(arm, inward);
                    if (ax.sqrMagnitude > 1e-8f)
                    {
                        need = Mathf.Min(RestMax, Mathf.Atan2(gap - RestGap, arm.magnitude) * Mathf.Rad2Deg);
                        axis = ax.normalized;
                    }
                }
            }
            angle = Mathf.MoveTowards(angle, need, RestRate * dt);
            if (angle > 0.01f && axis.sqrMagnitude > 0.5f) upper.rotation = Quaternion.AngleAxis(angle, axis) * upper.rotation;
        }

        /// <summary>How far a point outside the torso stands from its surface (m), and the way in (world, level).</summary>
        public bool Gap(Vector3 p, out float gap, out Vector3 inward)
        {
            gap = 0f; inward = Vector3.zero;
            if (!Ready) return false;
            var best = float.MaxValue;
            foreach (var (hip, knee, radii) in new[] { (_tl, _kl, _profile.ThighL), (_tr, _kr, _profile.ThighR) })
                if (ThighGap(p, hip, knee, radii, out var g, out var o) && g < best)
                {
                    best = g;
                    var flat = new Vector3(-o.x, 0f, -o.z);
                    inward = flat.sqrMagnitude > 1e-8f ? flat.normalized : -o;
                }
            var rot = _hips.rotation * Quaternion.Inverse(_profile.HipsRest);
            var scale = Mathf.Max(0.01f, transform.lossyScale.y);
            var local = Quaternion.Inverse(rot) * (p - _hips.position) / scale;
            var thighs = _profile.ThighL != null && local.y < _profile.Fork;
            if (thighs || !_profile.Sample(local.y, out var cx, out var cz, out var rx, out var rz))
            {
                if (best == float.MaxValue || best <= 0f) return false;
                gap = best;
                return true;
            }
            var dx = (local.x - cx) / rx;
            var dz = (local.z - cz) / rz;
            var q = Mathf.Sqrt(dx * dx + dz * dz);
            if (q <= 1f) return false;
            var d = new Vector2(local.x - cx, local.z - cz);
            var sectionGap = d.magnitude * (1f - 1f / q) * scale;
            if (sectionGap < best) { best = sectionGap; inward = rot * new Vector3(-d.x, 0f, -d.y).normalized; }
            if (best <= 0f) return false;
            gap = best;
            return true;
        }

        private void LateUpdate()
        {
            if (!Ready) return;
            Flank();
            var dt = Time.deltaTime > 0f ? Time.deltaTime : Time.unscaledDeltaTime;
            var resting = Resting();
            DiagResting = resting;
            Diag[16] = Diag[17] = Diag[18] = Diag[19] = 0f;
            if (SkinReady && Near())
            {
                if (RestReach)
                {
                    // at rest the hand is placed where a relaxed hand hangs and the arm reaches it (blended in and out)
                    _restW = Mathf.MoveTowards(_restW, resting ? 1f : 0f, dt / (resting ? RestIn : RestOut2));
                    _skin.Pose();
                    RestArm(_lu, _ll, _lh, -1, BodySkin.Part.UpperArmL, _restW);
                    RestArm(_ru, _rl, _rh, 1, BodySkin.Part.UpperArmR, _restW);
                    Diag[1] = HandGap(BodySkin.Part.UpperArmL); Diag[3] = HandGap(BodySkin.Part.UpperArmR);
                    // the place nudged by the gap the hand really has (its shape, the fingers' curl, a coat's hem)
                    if (_restW > 0.99f && !UpperFirst)
                    {
                        if (Diag[1] > -0.5f) _adaptL = Mathf.Clamp(_adaptL + Mathf.Clamp((_wantGapL - Diag[1]) * 0.5f, -0.01f, 0.01f), -0.03f, 0.12f);
                        if (Diag[3] > -0.5f) _adaptR = Mathf.Clamp(_adaptR + Mathf.Clamp((_wantGapR - Diag[3]) * 0.5f, -0.01f, 0.01f), -0.03f, 0.12f);
                    }
                    Diag[0] = Diag[2] = 0f;
                }
                else
                {
                    // what is held from the frames before, on the bones; then the skin posed from them
                    Held(_lu, _ll, _lh, -1, _restL, _fwdL, _twistL, _carryL);
                    Held(_ru, _rl, _rh, 1, _restR, _fwdR, _twistR, _carryR);
                    _skin.Pose();
                    SkinRest(_lu, _ll, _lh, BodySkin.Part.UpperArmL, -1, ref _restL, ref _fwdL, ref _twistL, ref _carryL, resting, dt);
                    SkinRest(_ru, _rl, _rh, BodySkin.Part.UpperArmR, 1, ref _restR, ref _fwdR, ref _twistR, ref _carryR, resting, dt);
                }
                SkinClear(_lu, BodySkin.Part.UpperArmL, ref _angleL, ref _axisL, dt);
                SkinClear(_ru, BodySkin.Part.UpperArmR, ref _angleR, ref _axisR, dt);
                // in the stride (and the last swings as the person stops), never in a gesture (a wave or a shrug is meant high)
                if (Striding()) { Swing(_lu, _ll, BodySkin.Part.UpperArmL); Swing(_ru, _rl, BodySkin.Part.UpperArmR); }
                if (!RestReach) { Diag[4] = _restL; Diag[5] = _fwdL; Diag[10] = _restR; Diag[11] = _fwdR; }
                Diag[6] = _carryL; Diag[7] = _angleL; Diag[8] = _carryR; Diag[9] = _angleR;
                if (!RestReach) { Diag[12] = _twistL; Diag[13] = _twistR; }
                return;
            }
            // the stride's swing eased far off too (past the skin's range a jogging arm still swung back to 45-47°, W3)
            if (Striding()) { Swing(_lu, _ll, BodySkin.Part.UpperArmL, false); Swing(_ru, _rl, BodySkin.Part.UpperArmR, false); }
            if (_profile == null || _profile.Bins < 2) return;
            Rest(_lu, _ll, _lh, ref _restL, ref _restAxisL, resting, dt);
            Rest(_ru, _rl, _rh, ref _restR, ref _restAxisR, resting, dt);
            Clear(_lu, _ll, _lh, ref _angleL, ref _axisL, dt);
            Clear(_ru, _rl, _rh, ref _angleR, ref _axisR, dt);
        }

        /// <summary>The flank correctives (Editor BodyCorrectives): the chest's side and the arm's inner side give where a
        /// hanging upper arm lies against them, as real flesh does, in full while the upper arm hangs within
        /// <see cref="FlankFull"/>° of the torso's line, not at all past <see cref="FlankNone"/>° (a raised arm leaves the
        /// side as it was). On the body's mesh, every shell cut from it, and the skin's points the arms are kept out of.</summary>
        public float FlankFull = 25f, FlankNone = 45f;
        private readonly System.Collections.Generic.List<(SkinnedMeshRenderer R, int L, int Rt)> _flank = new();
        private int _flankKids = -1;
        private float _flankWL = -1f, _flankWR = -1f;

        private void Flank()
        {
            var hips = _animator.GetBoneTransform(HumanBodyBones.Hips); var neck = _animator.GetBoneTransform(HumanBodyBones.Neck);
            if (hips == null || neck == null || _lu == null || _ll == null || _ru == null || _rl == null) return;
            var down = (hips.position - neck.position).normalized;
            float Weight(Transform u, Transform l) => 1f - Mathf.SmoothStep(0f, 1f, Mathf.InverseLerp(FlankFull, FlankNone, Vector3.Angle(l.position - u.position, down)));
            var wl = Weight(_lu, _ll); var wr = Weight(_ru, _rl);
            if (_skin != null) { _skin.FlankL = wl; _skin.FlankR = wr; }
            // (the shells are put on and off as the person dresses: found again when the renderers under the body change)
            var host = _skin != null && _skin.Body != null ? _skin.Body.transform.parent : transform;
            var kids = host != null ? host.childCount : 0;
            if (kids != _flankKids)
            {
                _flankKids = kids; _flank.Clear(); _flankWL = _flankWR = -1f;
                foreach (var r in GetComponentsInChildren<SkinnedMeshRenderer>(true))
                {
                    var m = r.sharedMesh;
                    if (m == null) continue;
                    int il = m.GetBlendShapeIndex(RbLayerSet.FlankL), ir = m.GetBlendShapeIndex(RbLayerSet.FlankR);
                    if (il >= 0 || ir >= 0) _flank.Add((r, il, ir));
                }
            }
            if (Mathf.Abs(wl - _flankWL) < 0.002f && Mathf.Abs(wr - _flankWR) < 0.002f) return;
            _flankWL = wl; _flankWR = wr;
            foreach (var (r, il, ir) in _flank)
            {
                if (r == null) continue;
                if (il >= 0) r.SetBlendShapeWeight(il, wl * 100f);
                if (ir >= 0) r.SetBlendShapeWeight(ir, wr * 100f);
            }
        }

        /// <summary>With the skin, at rest: the hand is placed where a relaxed hand hangs, beside the thigh with its middle
        /// <see cref="SkinGap"/> off the skin, a little forward of the side (<see cref="RestFront"/>°), at the height the arm
        /// reaches with the elbow bent <see cref="RestFlex"/>° (relaxed standing: 15.5°, IQR 13-18°, docs/PEOPLE_MOTION.md
        /// A2), and the shoulder and elbow are turned to reach it, the elbow back (an analytic two-bone solve). Four holds
        /// that each nudged one joint toward the thigh (in, forward, the upper arm's roll, the elbow's carry) left hands 5-10
        /// cm off it whatever their limits, 2026-11-06. Each person's flex and forward differ a little (from their name).
        /// Blended in over <see cref="RestIn"/> s on coming to rest, out over <see cref="RestOut2"/> s on moving or gesturing.</summary>
        public bool RestReach = true;
        public float RestFlex = 15f, RestFront = 15f, RestIn = 0.6f, RestOut2 = 0.25f, RestFar = 0.035f;
        /// <summary>At rest, the furthest the hand is placed from under the shoulder: the shoulder-to-wrist line this far off
        /// the vertical at most (degrees).</summary>
        public float RestReachMax = 24f;
        private float _restW, _flexVar = float.NaN, _frontVar, _adaptL, _adaptR, _wantGapL = 0.01f, _wantGapR = 0.01f;

        private void RestArm(Transform upper, Transform lower, Transform hand, int side, BodySkin.Part first, float w)
        {
            if (w <= 0.001f || upper == null || lower == null || hand == null) return;
            var (hip, knee) = side < 0 ? (_tl, _kl) : (_tr, _kr);
            if (hip == null || knee == null) return;
            if (float.IsNaN(_flexVar))
            {
                // the person's own: from their name, stable from run to run
                var h = 17u;
                foreach (var ch in transform.root.name) h = h * 31u + ch;
                _flexVar = ((h % 1000u) / 999f - 0.5f) * 8f;            // ±4°
                _frontVar = (((h / 1000u) % 1000u) / 999f - 0.5f) * 16f; // ±8°
            }
            var S = upper.position; var E = lower.position; var W = hand.position;
            var l1 = (E - S).magnitude; var l2 = (W - E).magnitude;
            if (l1 < 0.05f || l2 < 0.05f) return;
            var fwd = transform.forward; var outward = Outward(side);
            ref var poleOut = ref (side < 0 ? ref _poleOutL : ref _poleOutR);
            ref var flexAdd = ref (side < 0 ? ref _flexAddL : ref _flexAddR);
            var flex = Mathf.Clamp(RestFlex + _flexVar + flexAdd, 6f, 32f) * Mathf.Deg2Rad;
            var reach = Mathf.Sqrt(l1 * l1 + l2 * l2 + 2f * l1 * l2 * Mathf.Cos(flex));
            var leg = knee.position - hip.position;
            var thigh = side < 0 ? BodySkin.Part.ThighL : BodySkin.Part.ThighR;
            var fromElbow = false; var elbowPlaced = Vector3.zero;
            // the hand's place beside the leg, turned this far forward from its side (degrees): the wrist's height under the
            // shoulder by the reach at that bend, over the place beside the leg (twice: the leg's width there depends on the
            // height), and how far that is from under the shoulder
            bool Place(float front, out Vector3 at, out float off)
            {
                var dir = (Quaternion.AngleAxis(-side * front, Vector3.up) * outward).normalized;
                var wristY = fromElbow ? elbowPlaced.y - l2 * 0.97f : S.y - reach * 0.985f;
                at = Vector3.zero; off = float.MaxValue;
                var any = false;
                for (var pass = 0; pass < 2; pass++)
                {
                    var t = Mathf.Clamp01((wristY - 0.08f - hip.position.y) / Mathf.Min(-1e-3f, leg.y));
                    var axis = hip.position + leg * t;
                    // the leg's (and hip's) side: the furthest its skin stands out that way along the hand's height, the
                    // wrist to the fingertips (a hand placed by the thigh at its middle sat 3-4 cm into the hip above)
                    var surf = float.MinValue;
                    void Look(int lo, int hi, bool lowOnly)
                    {
                        for (var i = lo; i < hi; i++)
                        {
                            if (lowOnly && !_skin.Low(i)) continue;
                            var p = _skin.P[i];
                            if (p.y > wristY + 0.02f || p.y < wristY - 0.19f) continue;
                            var o = p - axis; o.y = 0f;
                            if (Vector3.Dot(o, dir) <= 0f || Vector3.Dot(o, outward) < -0.02f) continue;
                            surf = Mathf.Max(surf, Vector3.Dot(o, dir));
                        }
                    }
                    Look(_skin.Begin(thigh), _skin.End(thigh), false);
                    Look(_skin.Begin(BodySkin.Part.Torso), _skin.End(BodySkin.Part.Torso), true);
                    if (surf == float.MinValue) break;
                    any = true;
                    var adapt = side < 0 ? _adaptL : _adaptR;
                    Diag[side < 0 ? 4 : 10] = adapt * 100f; Diag[side < 0 ? 5 : 11] = surf * 100f;
                    var flat = new Vector3(axis.x, 0f, axis.z) + dir * (surf + 0.015f + SkinGap + adapt);
                    if (fromElbow)
                    {
                        // from the placed elbow: the wrist where the forearm reaches, beside the leg, the forearm no further
                        // off the vertical than HangMax
                        var he = new Vector2(flat.x - elbowPlaced.x, flat.z - elbowPlaced.z).magnitude;
                        var heMax = l2 * Mathf.Sin(HangMax * Mathf.Deg2Rad);
                        if (he > heMax) { var ef = new Vector3(elbowPlaced.x, 0f, elbowPlaced.z); flat = ef + (flat - ef).normalized * heMax; he = heMax; }
                        wristY = elbowPlaced.y - Mathf.Sqrt(Mathf.Max(0.2f * l2 * l2, l2 * l2 - he * he));
                        at = new Vector3(flat.x, wristY, flat.z);
                        off = he;
                        continue;
                    }
                    var h = new Vector2(flat.x - S.x, flat.z - S.z).magnitude;
                    // never further out than a hanging arm reaches (the band below the wrist now and then caught something
                    // wide for a few frames and threw the arm out to 31-41°, A1, 2026-11-06)
                    var hMax = reach * Mathf.Sin(RestReachMax * Mathf.Deg2Rad);
                    if (h > hMax) { var sf = new Vector3(S.x, 0f, S.z); flat = sf + (flat - sf).normalized * hMax; h = hMax; }
                    wristY = S.y - Mathf.Sqrt(Mathf.Max(0.04f * reach * reach, reach * reach - h * h));
                    at = new Vector3(flat.x, wristY, flat.z);
                    off = h;
                }
                return any;
            }
            // beside the thigh, or on its front where that hangs nearer under the shoulder (a real arm hangs from the
            // shoulder: leaning away from the hip it stands over, the shoulder went 13 cm in from it and the hand kept at the
            // hip's side stood the arm 25-28° off the vertical, A1, 2026-11-06); the turn eased, kept unless 5 mm better
            var baseFront = Mathf.Clamp(RestFront + _frontVar, 0f, 30f);
            ref var frontNow = ref (side < 0 ? ref _frontL : ref _frontR);
            if (float.IsNaN(frontNow)) frontNow = baseFront;
            var best = frontNow; var bestH = Place(frontNow, out _, out var hNow) ? hNow : float.MaxValue;
            for (var c = 0; c < 3; c++)
            {
                var cand = Mathf.Min(RestFrontMax, baseFront + c * 30f);
                if (Mathf.Abs(cand - frontNow) < 1f) continue;
                if (Place(cand, out _, out var hc) && hc < bestH - 0.005f) { best = cand; bestH = hc; }
            }
            frontNow = Mathf.MoveTowards(frontNow, best, FrontRate * Time.deltaTime);
            if (side < 0) _wantGapL = SkinGap; else _wantGapR = SkinGap;
            var found = Place(frontNow, out var wrist, out _);
            if (!found) return;
            if (UpperFirst)
            {
                ref var abd = ref (side < 0 ? ref _abdL : ref _abdR);
                ref var back = ref (side < 0 ? ref _backL : ref _backR);
                if (float.IsNaN(abd)) abd = AbdStart;
                var ua = UpperDir(abd, back, fwd, outward);
                elbowPlaced = S + ua * l1; fromElbow = true;
                if (!Place(frontNow, out var wristE, out _)) return;
                // the elbow's bend from the elbow's place, not the hand's: the upper arm tilted back as far as the bend needs
                // (the forearm swung forward for it carried the hand round into the thigh's fuller front, 3 cm in, and the
                // push out of it stood the hand 6-9 cm off the thigh, A4, 2026-11-07)
                var bendNow = Vector3.Angle(ua, wristE - elbowPlaced);
                var bendWant = Mathf.Max(BendMin, Mathf.Min(BendMax - 4f, RestFlex + _flexVar - 5f));
                if (w > 0.99f)
                {
                    if (bendNow < bendWant) back = Mathf.Min(BackMax, back + BackRate * Time.deltaTime);
                    else if (bendNow > bendWant + 4f) back = Mathf.Max(0f, back - BackRate * Time.deltaTime);
                }
                UpperFirstArm(upper, lower, hand, side, first, w, S, E, l1, l2, wristE, fwd, outward, ua, ref abd);
                return;
            }
            // the two-bone solve, the elbow back (and a little out)
            var toW = wrist - S;
            var d = Mathf.Clamp(toW.magnitude, Mathf.Abs(l1 - l2) + 1e-3f, l1 + l2 - 1e-4f);
            var sw = toW.normalized;
            // (out to the side for a positive lean, in toward the waist for a negative one, back between)
            var pole = Vector3.ProjectOnPlane(-fwd * (1f - Mathf.Abs(poleOut)) + outward * poleOut, sw);
            if (pole.sqrMagnitude < 1e-6f) return;
            pole.Normalize();
            var x = (l1 * l1 - l2 * l2 + d * d) / (2f * d);
            var y = Mathf.Sqrt(Mathf.Max(0f, l1 * l1 - x * x));
            var elbowAt = S + sw * x + pole * y;
            var dU = Quaternion.Slerp(Quaternion.identity, Quaternion.FromToRotation(E - S, elbowAt - S), w);
            dU.ToAngleAxis(out var aU, out var axU);
            if (aU > 0.01f && axU.sqrMagnitude > 0.5f) TurnArm(upper, first, aU, axU);
            var E2 = lower.position; var W2 = hand.position;
            var dL = Quaternion.Slerp(Quaternion.identity, Quaternion.FromToRotation(W2 - E2, (S + sw * d) - E2), w);
            dL.ToAngleAxis(out var aL, out var axL);
            if (aL > 0.01f && axL.sqrMagnitude > 0.5f) TurnForearm(lower, first, aL, axL);
            PalmIn(lower, hand, side, first, w);
            // the elbow and the upper arm off the chest and waist: the elbow out to the side first (the pole), then bent
            // further (a broad man's elbow stands out and bends a little more, the hand still at the thigh): the line from
            // shoulder to thigh ran inside broad chests and vests, and the push-out at the shoulder took the hand 8-12 cm off
            // it, 2026-11-06
            if (w < 0.99f) return;
            var gapE = Mathf.Min(Gap(_skin.Begin(first), _skin.End(first), 1, 0.08f, null, 0f, ClothGive), Gap(_skin.Begin(first + 1), _skin.End(first + 1), 1, 0.08f, lower.position, 0.08f, ClothGive));
            Diag[side < 0 ? 12 : 13] = poleOut * 100f; Diag[side < 0 ? 14 : 15] = flexAdd;
            // the bend first (it swings the forearm forward off the hip, the belt, a vest's hem, and leaves the upper arm
            // hanging), the elbow out to the side only after (out first stood broad men's upper arms 19-28° off the
            // vertical, A1, 2026-11-06)
            // resting against the side is a contact, not a clip (the gate's C1 allows 0.5 cm into the skin; 0.5 cm off it
            // bent every elbow to its most, the forearms past 30°, A3)
            // the forearm hangs no further from the vertical than HangMax (A3 is 30°: a broad woman's bend with her upper
            // arm out stood her forearm 30.5-31° off it, 2026-11-06; held at 28 it still reached 29-31 at its p98, the push
            // out after it adding a degree or two): past it, the elbow straightens, and stands out instead
            var hang = Vector3.Angle(hand.position - lower.position, Vector3.down);
            var upperHang = Vector3.Angle(lower.position - upper.position, Vector3.down);
            var flexMin = 6f - (RestFlex + _flexVar);
            if (gapE < ElbowRest)
            {
                if (flexAdd < FlexMore && hang < HangMax) flexAdd = Mathf.Min(FlexMore, flexAdd + 1f);
                // out to the side only while the upper arm hangs within UpperMax: past it the arm rests against the side
                // (a contact) rather than standing out from it (the waist, pushed out as the weight shifted onto that leg,
                // stood the elbow out until the upper arm was 22-27° off the vertical, A1, 2026-11-06)
                else if (upperHang < UpperMax) poleOut = Mathf.Min(1f, poleOut + 0.05f);
            }
            else if (gapE > ElbowRest + 0.01f)
            {
                // clear of the body: the elbow in toward the waist while the upper arm stands out past UpperAim, bent a
                // little more if that is not enough (the upper arm hangs by the side and the forearm carries the hand out
                // past the hips, as a real arm does: the elbow back and out stood broad women's and men's upper arms
                // 20-27° off the vertical, A1, 2026-11-06); back out toward PoleOut once well inside it
                if (poleOut > PoleOut) poleOut = Mathf.Max(PoleOut, poleOut - 0.02f);
                else if (upperHang > UpperAim && poleOut > PoleIn) poleOut = Mathf.Max(PoleIn, poleOut - 0.02f);
                else if (upperHang > UpperAim && flexAdd < FlexMore && hang < HangMax) flexAdd = Mathf.Min(FlexMore, flexAdd + 0.5f);
                else if (upperHang < UpperAim - 3f && poleOut < PoleOut) poleOut = Mathf.Min(PoleOut, poleOut + 0.01f);
                else if (upperHang < UpperAim && flexAdd > 0f) flexAdd = Mathf.Max(0f, flexAdd - 0.5f);
            }
            if (hang > HangMax) flexAdd = Mathf.Max(flexMin, flexAdd - 0.5f);
            else if (flexAdd < 0f && hang < HangMax - 2f) flexAdd = Mathf.Min(0f, flexAdd + 0.5f);
        }

        /// <summary>At rest, the upper arm placed first: it hangs from the shoulder, out to the side only as far as the elbow
        /// needs to clear the waist (<see cref="AbdMin"/> to <see cref="AbdMax"/>°, eased), <see cref="UpperForward"/>° forward;
        /// the forearm then reaches for the hand's place beside the thigh, no further than <see cref="HangMax"/>° off the
        /// vertical. A relaxed arm hangs this way: its upper arm near the vertical, its forearm carrying the hand past the hip.
        /// Solved from the hand's place back to the shoulder, the elbow bent back further and pushed out as it met the waist,
        /// and the men's upper arms stood 20-31° off the vertical at rest, every family of them (A1, 742 of 1513 across the
        /// cast, 2026-11-06).</summary>
        public bool UpperFirst = true;
        public float AbdMin = 3f, AbdMax = 17f, AbdStart = 8f, AbdRate = 30f, UpperForward = 0f;
        /// <summary>At rest, the furthest back the upper arm tilts for the elbow's bend (degrees), and how fast (degrees a second).</summary>
        public float BackMax = 12f, BackRate = 20f;
        private float _abdL = float.NaN, _abdR = float.NaN, _backL, _backR;

        /// <summary>The upper arm's direction at rest: down, <paramref name="abd"/>° out to the side, <see cref="UpperForward"/>°
        /// forward (negative: back).</summary>
        private Vector3 UpperDir(float abd, float back, Vector3 fwd, Vector3 outward)
        {
            var ra = abd * Mathf.Deg2Rad; var rf = (UpperForward - back) * Mathf.Deg2Rad;
            var ua = Vector3.down * Mathf.Cos(ra) + outward * Mathf.Sin(ra);
            return (ua * Mathf.Cos(rf) + fwd * Mathf.Sin(rf)).normalized;
        }

        /// <summary>At rest the elbow bends between these (degrees; the gate's A2 is 5-35, relaxed standing 15.5°, IQR 13-18):
        /// the hand placed straight under a hanging upper arm left women's arms 1-4° from straight (A2), 2026-11-07.</summary>
        public float BendMin = 10f, BendMax = 28f;

        private void UpperFirstArm(Transform upper, Transform lower, Transform hand, int side, BodySkin.Part first, float w,
            Vector3 S, Vector3 E, float l1, float l2, Vector3 wrist, Vector3 fwd, Vector3 outward, Vector3 ua, ref float abd)
        {
            var elbowAt = S + ua * l1;
            var fa = wrist - elbowAt;
            fa = fa.sqrMagnitude > 1e-6f ? fa.normalized : Vector3.down;
            // the bend held in its range: more by swinging the forearm forward (never further in, into the thigh), less by
            // bringing it back toward the upper arm's line
            var bendMin = Mathf.Max(BendMin, Mathf.Min(BendMax - 4f, RestFlex + _flexVar - 5f));
            var fwdPerp = Vector3.ProjectOnPlane(fwd, ua).normalized;
            var backNow = side < 0 ? _backL : _backR;
            if (backNow >= BackMax - 0.01f)
                for (var k = 0; k < 40 && Vector3.Angle(ua, fa) < bendMin; k++) fa = Vector3.RotateTowards(fa, fwdPerp, Mathf.Deg2Rad, 0f).normalized;
            var bend = Vector3.Angle(ua, fa);
            if (bend > BendMax) fa = Vector3.RotateTowards(fa, ua, (bend - BendMax) * Mathf.Deg2Rad, 0f).normalized;
            if (Vector3.Angle(fa, Vector3.down) > HangMax) fa = Vector3.RotateTowards(Vector3.down, fa, HangMax * Mathf.Deg2Rad, 0f).normalized;
            var dU = Quaternion.Slerp(Quaternion.identity, Quaternion.FromToRotation(E - S, elbowAt - S), w);
            dU.ToAngleAxis(out var aU, out var axU);
            if (aU > 0.01f && axU.sqrMagnitude > 0.5f) TurnArm(upper, first, aU, axU);
            var E2 = lower.position; var W2 = hand.position;
            var dL = Quaternion.Slerp(Quaternion.identity, Quaternion.FromToRotation(W2 - E2, fa * l2), w);
            dL.ToAngleAxis(out var aL, out var axL);
            if (aL > 0.01f && axL.sqrMagnitude > 0.5f) TurnForearm(lower, first, aL, axL);
            PalmIn(lower, hand, side, first, w);
            HangHand(hand, side, first, w, fwd, outward);
            SetHand(lower, hand, first, w, outward);
            if (w < 0.99f) return;
            // the elbow (and the forearm by it) off the waist and the chest's side: out only as far as it must, back in as
            // far as it may
            var gapE = Mathf.Min(Gap(_skin.Begin(first), _skin.End(first), 1, 0.08f, null, 0f, ClothGive), Gap(_skin.Begin(first + 1), _skin.End(first + 1), 1, 0.08f, lower.position, 0.08f, ClothGive));
            var dt = Time.deltaTime;
            if (gapE < ElbowRest) abd = Mathf.Min(AbdMax, abd + AbdRate * dt);
            else if (gapE > ElbowRest + 0.01f) abd = Mathf.Max(AbdMin, abd - 0.5f * AbdRate * dt);
            Diag[side < 0 ? 12 : 13] = abd; Diag[side < 0 ? 14 : 15] = Vector3.Angle(hand.position - lower.position, Vector3.down);
        }

        /// <summary>At rest the hand hangs along the leg (down, <see cref="HandTaper"/>° in, as the thigh narrows), turned at
        /// the wrist at most <see cref="HandHang"/>°: on the forearm's line, a forearm coming in from an elbow out over the
        /// waist carried the fingers 3 cm into the thigh, the place was pushed out 3-5 cm after them and the hand hung 6-9 cm
        /// off the thigh (A4, 2026-11-07).</summary>
        public float HandHang = 25f, HandTaper = 6f;

        private void HangHand(Transform hand, int side, BodySkin.Part first, float w, Vector3 fwd, Vector3 outward)
        {
            if (HandHang <= 0f) return;
            var mid = _animator.GetBoneTransform(side < 0 ? HumanBodyBones.LeftMiddleProximal : HumanBodyBones.RightMiddleProximal);
            if (mid == null) return;
            var hd = Vector3.ProjectOnPlane(mid.position - hand.position, fwd);
            var want = Vector3.ProjectOnPlane(Vector3.down * Mathf.Cos(HandTaper * Mathf.Deg2Rad) - outward * Mathf.Sin(HandTaper * Mathf.Deg2Rad), fwd);
            if (hd.sqrMagnitude < 1e-6f || want.sqrMagnitude < 1e-6f) return;
            var a = Mathf.Clamp(Vector3.SignedAngle(hd, want, fwd), -HandHang, HandHang) * w;
            if (Mathf.Abs(a) < 0.01f) return;
            var q = Quaternion.AngleAxis(a, fwd);
            hand.rotation = q * hand.rotation;
            _skin.Turn(_skin.Begin(first + 2), _skin.End(first + 2), hand.position, q);
        }

        /// <summary>At rest the hand is set at <see cref="SkinGap"/> off the leg as it really hangs: its gap measured on its own
        /// points, the wrist moved in or out by what is missing (the forearm turned at the elbow, never the arm at the shoulder),
        /// twice, at most <see cref="SetMax"/> a frame. Nudged over frames instead (the place pushed out by the gap seen before
        /// the arm was cleared of the body), the hand was placed 3 cm into the thigh in some frames and pushed out of it at the
        /// shoulder in others, 6-9 cm off it (A4, 2026-11-07).</summary>
        public float SetMax = 0.04f;

        private void SetHand(Transform lower, Transform hand, BodySkin.Part first, float w, Vector3 outward)
        {
            if (w < 0.99f) return;
            for (var pass = 0; pass < 2; pass++)
            {
                var g = HandGap(first);
                if (g < 0f && g <= -0.5f) return;   // (no leg near the hand)
                var move = Mathf.Clamp(SkinGap - g, -SetMax, SetMax);
                if (Mathf.Abs(move) < 0.002f) return;
                // along the leg's own facing where the hand is nearest it, level (moved only sideways, a hand on the thigh's
                // front went 4 cm further out a pass without leaving it, the arm all but straight, A2 and A4, 2026-11-07)
                var dir = outward;
                if (_gapBody >= 0) { var n = _skin.N[_gapBody]; n.y = 0f; if (n.sqrMagnitude > 0.09f) dir = n.normalized; }
                var E = lower.position; var W = hand.position;
                var to = W + dir * move;
                var q = Quaternion.FromToRotation(W - E, to - E);
                q.ToAngleAxis(out var a, out var ax);
                if (a < 0.01f || ax.sqrMagnitude < 0.5f) return;
                // (within the forearm's hang: past it the hand stays where it is)
                if (Vector3.Angle(q * (W - E), Vector3.down) > HangMax + 2f && Vector3.Angle(q * (W - E), Vector3.down) > Vector3.Angle(W - E, Vector3.down)) return;
                TurnForearm(lower, first, a, ax);
            }
        }

        /// <summary>At rest: the most the forearm may hang off the vertical (degrees; the gate's A3 is 30).</summary>
        public float HangMax = 25f;

        /// <summary>At rest: the elbow's lean out to the side (0 straight back, 1 straight out) it starts from, and how much
        /// further the elbow may bend (degrees) to stand clear of a broad chest with the hand still at the thigh.</summary>
        public float PoleOut = 0.2f, FlexMore = 10f, ElbowRest = -0.002f;   // (at 0, with the cloth giving 30 %, broad men's elbows stood out: A1 54 → 67, 2026-11-06)
        /// <summary>At rest, clear of the body: the upper arm is kept within this of the vertical (degrees; the gate's A1 is
        /// 20) by the elbow's lean in toward the waist, as far as <see cref="PoleIn"/> (in, as a negative lean).</summary>
        public float UpperAim = 16f, PoleIn = -0.6f, UpperMax = 17f;   // (18.5 let the p98 overshoot to 20-24, A1)
        /// <summary>At rest, the furthest forward of the thigh's side the hand may be placed (degrees), and how fast its place
        /// turns there (degrees a second).</summary>
        public float RestFrontMax = 80f, FrontRate = 90f;
        private float _frontL = float.NaN, _frontR = float.NaN;

        /// <summary>The share of the clothes' thickness under the upper arm and the elbow that an arm at rest may press in
        /// (canvas and webbing give; the vest's 1.3 cm and the strap's 1.7 cm at the waist held broad men's elbows out and
        /// their upper arms 19-28° off the vertical, A1, 2026-11-06). Never the bare skin: the gate's C1 is on the body.</summary>
        public float ClothGive = 0.5f;
        private float _poleOutL = 0.2f, _poleOutR = 0.2f, _flexAddL, _flexAddR;

        /// <summary>The hand's gap to the body now (m), for the report.</summary>
        private float HandGap(BodySkin.Part first)
        {
            var g = Gap(_skin.Begin(first + 2), _skin.End(first + 2), 2, float.MaxValue);
            var left = first == BodySkin.Part.UpperArmL;
            DiagAt[left ? 2 : 6] = _gapArm; DiagAt[left ? 3 : 7] = _gapBody;
            return g < float.MaxValue ? g : -1f;
        }

        /// <summary>Close enough to the camera for the skin (a person further off is a few pixels high: the sections do).</summary>
        private bool Near()
        {
            var cam = Camera.main;
            return cam == null || (cam.transform.position - _hips.position).sqrMagnitude < SkinRange * SkinRange;
        }

        /// <summary>With the skin: an elbow is held this far from the waist at rest (A1: the upper arm hangs close by the
        /// side), surface to surface.</summary>
        public float ElbowGap = 0.005f;
        /// <summary>With the skin: how far the shoulder's hold may turn a resting arm out to bring the elbow off the waist
        /// (degrees; the captured arms hang 2-4 cm into these bodies' waists).</summary>
        public float RestOut = 15f;
        /// <summary>The forearm's turn out at the elbow is held within these (degrees: straight to a wide valgus).</summary>
        public float CarryMin = 0f, CarryMax = 22f;
        /// <summary>With the skin, at rest: how far the upper arm may be rolled inward about its own length (degrees; the
        /// shoulder's internal rotation, about 70° in life) to bring a bent forearm from pointing out to pointing forward, so the
        /// hand comes to the thigh (the captured arms hung their forearms 15-23° out, hands 12-17 cm off the thigh, 2026-11-06;
        /// 50° left broad men's hands 6-13 cm off), drawn in at <see cref="TwistRate"/>° a second.</summary>
        public float TwistMax = 65f, TwistRate = 60f;
        /// <summary>With the skin, at rest: the upper arm hangs no further behind the vertical than this (degrees; A1, a
        /// relaxed arm hangs straight down by the side).</summary>
        public float ArmBack = 4f;

        private Vector3 Outward(int side) => transform.right * side;

        /// <summary>The elbow's carrying angle for the arm's bend now (docs/PEOPLE_MOTION.md A3): with the elbow straight the
        /// forearm turns out from the upper arm's line, women's more than men's; it fades as the elbow bends (gone at a right
        /// angle). A Humanoid elbow is a hinge, so retargeted clips lose it.</summary>
        private float BaseCarry(Transform upper, Transform lower, Transform hand)
        {
            var k = Mathf.Cos(Vector3.Angle(lower.position - upper.position, hand.position - lower.position) * Mathf.Deg2Rad);
            return k <= 0f ? 0f : _skin.Carrying * k * k;
        }

        /// <summary>The axis that turns the forearm out from the body at the elbow (zero when the arm points along it).</summary>
        private Vector3 CarryAxis(Transform upper, Transform lower, Transform hand, int side)
        {
            var ua = (lower.position - upper.position).normalized;
            var outward = Outward(side);
            var lateral = outward - ua * Vector3.Dot(outward, ua);
            if (lateral.sqrMagnitude < 0.04f) return Vector3.zero;
            var ax = Vector3.Cross(hand.position - lower.position, lateral.normalized);
            return ax.sqrMagnitude > 1e-8f ? ax.normalized : Vector3.zero;
        }

        /// <summary>The turns held at the shoulder (forward, in, the upper arm's inward roll) and the elbow (out) put on the
        /// bones the clip has just posed.</summary>
        private void Held(Transform upper, Transform lower, Transform hand, int side, float inward, float forward, float twist, float carry)
        {
            if (upper == null || lower == null || hand == null) return;
            var shoulder = upper.position;
            if (forward > 0.001f) upper.rotation = Quaternion.AngleAxis(forward, Vector3.Cross(lower.position - shoulder, transform.forward).normalized) * upper.rotation;
            if (Mathf.Abs(inward) > 0.001f) upper.rotation = Quaternion.AngleAxis(inward, Vector3.Cross(lower.position - shoulder, -Outward(side)).normalized) * upper.rotation;
            if (twist > 0.001f) upper.rotation = Quaternion.AngleAxis(side * twist, (lower.position - shoulder).normalized) * upper.rotation;
            var c = carry >= 0f ? carry : BaseCarry(upper, lower, hand);
            var ax = CarryAxis(upper, lower, hand, side);
            if (c > 0.001f && ax != Vector3.zero) lower.rotation = Quaternion.AngleAxis(c, ax) * lower.rotation;
        }

        /// <summary>Moving: an upper arm's swing past <see cref="SwingSoft"/>° from the vertical is eased, a share
        /// <see cref="SwingKeep"/> of the excess kept, by its swing forward and back alone, after the clearance has set how
        /// far out it stands (docs/PEOPLE_MOTION.md W3: a jogging arm swings to about 45°; the captured jog's peaks, with the
        /// push-out round a coat, reached 55-61°; easing it toward the vertical drew it into the body and the clearance
        /// pushed it straight back, 2026-11-06); then cleared of the body again where the ease brought it in.</summary>
        public float SwingSoft = 30f, SwingKeep = 0.2f;

        private void Swing(Transform upper, Transform lower, BodySkin.Part first, bool skin = true)
        {
            if (upper == null || lower == null) return;
            var dir = (lower.position - upper.position).normalized;
            var a = Vector3.Angle(dir, Vector3.down);
            if (a <= SwingSoft) return;
            var want = SwingSoft + (a - SwingSoft) * SwingKeep;
            // the swing forward (+) or back (-) and the stand out to the side, degrees
            var fwd = transform.forward; var right = transform.right;
            var sag = Mathf.Atan2(Vector3.Dot(dir, fwd), Mathf.Max(1e-4f, -dir.y)) * Mathf.Rad2Deg;
            var side = Mathf.Asin(Mathf.Clamp(Mathf.Abs(Vector3.Dot(dir, right)), 0f, 1f)) * Mathf.Rad2Deg;
            var keep = Mathf.Sqrt(Mathf.Max(0f, want * want - side * side));
            if (Mathf.Abs(sag) <= keep) return;
            var turn = sag - Mathf.Sign(sag) * keep;   // about the body's right: + moves the arm back
            var left = first == BodySkin.Part.UpperArmL;
            Diag[left ? 16 : 17] = turn;
            if (!skin) { upper.rotation = Quaternion.AngleAxis(turn, right) * upper.rotation; return; }
            // eased, then pushed out of the body; when that push is large (the ease took the hand into the back), half the
            // ease is tried and whichever leaves the arm nearer the vertical kept (an arm swung 70° back on a curve was
            // eased into the back and pushed out to 57°, past W3's cap, 2026-11-06)
            int from = _skin.Begin(first), to = _skin.End(first + 2);
            Keep(upper, lower, from, to, 0);
            var aFull = EaseOut(upper, lower, first, turn, right, left, out var pushed);
            if (pushed <= PushRetry) return;
            Keep(upper, lower, from, to, 1);
            Back(upper, lower, from, to, 0);
            var aHalf = EaseOut(upper, lower, first, turn * 0.5f, right, left, out _);
            if (aHalf >= aFull) Back(upper, lower, from, to, 1);
        }

        /// <summary>A push out of the body after the stride's ease past which a gentler ease is tried (degrees).</summary>
        public float PushRetry = 8f;
        private readonly Quaternion[] _keptU = new Quaternion[2], _keptL = new Quaternion[2];
        private Vector3[][] _keptP = new Vector3[2][], _keptN = new Vector3[2][];

        private void Keep(Transform upper, Transform lower, int from, int to, int slot)
        {
            _keptU[slot] = upper.rotation; _keptL[slot] = lower.rotation;
            var n = to - from;
            if (_keptP[slot] == null || _keptP[slot].Length < n) { _keptP[slot] = new Vector3[n]; _keptN[slot] = new Vector3[n]; }
            System.Array.Copy(_skin.P, from, _keptP[slot], 0, n); System.Array.Copy(_skin.N, from, _keptN[slot], 0, n);
        }

        private void Back(Transform upper, Transform lower, int from, int to, int slot)
        {
            upper.rotation = _keptU[slot]; lower.rotation = _keptL[slot];
            var n = to - from;
            System.Array.Copy(_keptP[slot], 0, _skin.P, from, n); System.Array.Copy(_keptN[slot], 0, _skin.N, from, n);
        }

        /// <summary>The stride's ease at the shoulder, then what it brought into the body pushed out; the arm's angle from
        /// the vertical after, and how far the shoulder pushed (degrees).</summary>
        private float EaseOut(Transform upper, Transform lower, BodySkin.Part first, float turn, Vector3 right, bool left, out float pushed)
        {
            TurnArm(upper, first, turn, right);
            // what the ease brought into the body: a forearm or hand turned out at the elbow (pushed out at the shoulder,
            // a jogging arm swung straight back to 45-47°, W3, 2026-11-06), then the upper arm at the shoulder
            var elbow = lower.position;
            var best = 0f; var ax = Vector3.zero;
            for (int i = _skin.Begin(first + 1), to = _skin.End(first + 2); i < to; i++)
            {
                var p = _skin.P[i];
                if (!_skin.Depth(p, out var d, out var n) || d + Margin3 <= 0f) continue;
                var arm = p - elbow;
                if (arm.sqrMagnitude < 0.0025f) continue;
                var ang = Mathf.Atan2(d + Margin3, arm.magnitude) * Mathf.Rad2Deg;
                if (ang <= best) continue;
                var c = Vector3.Cross(arm, n);
                if (c.sqrMagnitude < 1e-8f) continue;
                best = ang; ax = c.normalized;
            }
            if (best > 0.01f) TurnForearm(lower, first, Mathf.Min(best, 30f), ax);
            var (more, dir2) = SkinNeed(upper, first);
            var outward = false;
            if (more > 0.01f)
            {
                // the push out of the body, back (the way it came in) or out to the side, whichever leaves the arm nearer
                // the vertical: pushed back off a tool belt a stride's arm stood 46° off it, past W3's cap, 2026-11-06
                TurnArm(upper, first, more, dir2);
                var aBack = Vector3.Angle(lower.position - upper.position, Vector3.down);
                TurnArm(upper, first, -more, dir2);
                var sideAx = Vector3.Cross(lower.position - upper.position, Outward(left ? -1 : 1));
                TurnArm(upper, first, more, sideAx);
                var (rest, dir3) = SkinNeed(upper, first);
                if (rest > 0.01f) TurnArm(upper, first, rest, dir3);
                var aOut = Vector3.Angle(lower.position - upper.position, Vector3.down);
                if (aOut + 0.5f < aBack) outward = true;
                else
                {
                    if (rest > 0.01f) TurnArm(upper, first, -rest, dir3);
                    TurnArm(upper, first, -more, sideAx);
                    TurnArm(upper, first, more, dir2);
                }
            }
            // the shoulder's push after the ease (negative: out to the side), and the elbow's in thousandths
            Diag[left ? 18 : 19] = (outward ? -more : more) + best * 0.001f;
            pushed = more;
            return Vector3.Angle(lower.position - upper.position, Vector3.down);
        }

        /// <summary>At rest: the hand turned about the forearm's length until its palm faces the leg, half in the forearm and
        /// half at the wrist, at most <see cref="PalmMax"/>°, eased at <see cref="PalmRate"/>° a second (a relaxed arm hangs
        /// palm in; the clips' hands hung palm back, their width across the leg, and the hand placed off the thigh by its
        /// nearest edge stood 4-6 cm further out with the arm after it, A1/A4, 2026-11-06).</summary>
        public float PalmMax = 35f, PalmRate = 120f;
        private float _palmL, _palmR;
        private void PalmIn(Transform lower, Transform hand, int side, BodySkin.Part first, float w)
        {
            Transform Bn(HumanBodyBones l, HumanBodyBones r) => _animator.GetBoneTransform(side < 0 ? l : r);
            var idx = Bn(HumanBodyBones.LeftIndexProximal, HumanBodyBones.RightIndexProximal);
            var mid = Bn(HumanBodyBones.LeftMiddleProximal, HumanBodyBones.RightMiddleProximal);
            var lit = Bn(HumanBodyBones.LeftLittleProximal, HumanBodyBones.RightLittleProximal);
            var midD = Bn(HumanBodyBones.LeftMiddleDistal, HumanBodyBones.RightMiddleDistal);
            ref var now = ref (side < 0 ? ref _palmL : ref _palmR);
            if (idx == null || mid == null || lit == null) return;
            // the palm's side as the gate reads it (A6): the side the curled fingers lie on
            var n = Vector3.Cross((lit.position - idx.position).normalized, (mid.position - hand.position).normalized);
            if (n.sqrMagnitude < 1e-8f) return;
            n.Normalize();
            var probe = midD != null ? midD.position : mid.position + n;
            if (Vector3.Dot(probe - mid.position, n) < 0f) n = -n;
            var axis = hand.position - lower.position;
            if (axis.sqrMagnitude < 1e-6f) return;
            axis.Normalize();
            // (in and a little back, the thumb forward, as a relaxed hand hangs: turned fully in, the curled fingers pointed at the
            // thigh and stood the hand further off it, A1 59 → 63, 2026-11-06)
            var a = Vector3.ProjectOnPlane(n, axis); var b = Vector3.ProjectOnPlane(-Outward(side) * 0.8f - transform.forward * 0.6f, axis);
            if (a.sqrMagnitude < 1e-6f || b.sqrMagnitude < 1e-6f) return;
            var want = Mathf.Clamp(Vector3.SignedAngle(a, b, axis), -PalmMax, PalmMax) * w;
            now = Mathf.MoveTowards(now, want, PalmRate * Time.deltaTime);
            if (Mathf.Abs(now) < 0.01f) return;
            TurnForearm(lower, first, 0.5f * now, axis);
            var q = Quaternion.AngleAxis(0.5f * now, axis);
            hand.rotation = q * hand.rotation;
            _skin.Turn(_skin.Begin(first + 2), _skin.End(first + 2), hand.position, q);
        }

        /// <summary>Turns an upper arm at the shoulder, and its points with it.</summary>
        private void TurnArm(Transform upper, BodySkin.Part first, float degrees, Vector3 axis)
        {
            if (Mathf.Abs(degrees) <= 0.001f || axis.sqrMagnitude < 1e-8f) return;
            var q = Quaternion.AngleAxis(degrees, axis.normalized);
            upper.rotation = q * upper.rotation;
            _skin.Turn(_skin.Begin(first), _skin.End(first + 2), upper.position, q);
        }

        /// <summary>Turns a forearm at the elbow, and its points (and the hand's) with it.</summary>
        private void TurnForearm(Transform lower, BodySkin.Part first, float degrees, Vector3 axis)
        {
            if (Mathf.Abs(degrees) <= 0.001f || axis.sqrMagnitude < 1e-8f) return;
            var q = Quaternion.AngleAxis(degrees, axis.normalized);
            lower.rotation = q * lower.rotation;
            _skin.Turn(_skin.Begin(first + 1), _skin.End(first + 2), lower.position, q);
        }

        /// <summary>The nearest a set of the arm's points comes to the body's surface (m; negative: inside), or
        /// <paramref name="far"/> when none is near.</summary>
        private float Gap(int from, int to, int stride, float far, Vector3? within = null, float radius = 0f, float soft = 0f)
        {
            var gap = float.MaxValue;
            _gapArm = _gapBody = -1;
            for (var i = from; i < to; i += stride)
            {
                if (within.HasValue && (_skin.P[i] - within.Value).sqrMagnitude > radius * radius) continue;
                if (!_skin.Depth(_skin.P[i], out var d, out _)) continue;
                // soft: a share of the clothes' thickness there may be pressed in (canvas and webbing give under an arm)
                var g = -d + (soft > 0f && _skin.Near >= 0 ? soft * _skin.Off(_skin.Near) : 0f);
                if (g < gap) { gap = g; _gapArm = i; _gapBody = _skin.Near; }
            }
            return gap == float.MaxValue ? far : gap;
        }

        /// <summary>A resting arm, with the body's skin, by three holds that each own one joint and one measure, so none
        /// works against another (they did, 2026-11-06: arms swung out and back): the elbow drawn in at the shoulder until it
        /// is <see cref="ElbowGap"/> off the waist (A1); the hand brought forward at the shoulder while it hangs behind the
        /// thigh's middle (into the buttock: the clip was taken on a flatter body); the forearm turned at the elbow until the
        /// hand is <see cref="SkinGap"/> off the hip or thigh (A4), within the elbow's carrying angle. Each moves at
        /// <see cref="RestRate"/>° a second, and back (to the anatomical carry) once the person moves or gestures.</summary>
        private void SkinRest(Transform upper, Transform lower, Transform hand, BodySkin.Part first, int side, ref float inward, ref float forward, ref float twist, ref float carry, bool resting, float dt)
        {
            if (upper == null || lower == null || hand == null) return;
            if (carry < 0f) carry = BaseCarry(upper, lower, hand);
            // drawn in at RestRate; let go faster once the person moves or gestures (a roll held into a jog's first strides
            // threw the arm's swing past its cap, W3, 2026-11-06)
            var step = (resting ? RestRate : Release) * dt;
            var shoulder = upper.position; var elbow = lower.position;
            var upperLen = Mathf.Max(0.15f, (elbow - shoulder).magnitude);
            var hs = _skin.Begin(first + 2); var he = _skin.End(first + 2);
            float wantIn = 0f, wantFwd = 0f, wantTwist = 0f, wantCarry = BaseCarry(upper, lower, hand);
            if (resting && he > hs)
            {
                // 1. the elbow to the waist: the lower upper arm and the forearm's first 8 cm
                var gapU = Gap(_skin.Begin(first), _skin.End(first), 1, 0.08f);
                int ua = _gapArm, ub = _gapBody;
                var gapF = Gap(_skin.Begin(first + 1), _skin.End(first + 1), 1, 0.08f, elbow, 0.08f);
                var gapE = Mathf.Min(gapU, gapF);
                if (gapU <= gapF) { _gapArm = ua; _gapBody = ub; }
                Diag[side < 0 ? 0 : 2] = gapE;
                DiagAt[side < 0 ? 0 : 4] = _gapArm; DiagAt[side < 0 ? 1 : 5] = _gapBody;
                // in or out (negative): the elbow held just off the waist, before the hand is judged (the push-out after
                // it carried the hand 10 cm off the thigh unseen, 2026-11-06)
                wantIn = Mathf.Clamp(inward + Mathf.Atan2(gapE - ElbowGap, upperLen) * Mathf.Rad2Deg, -RestOut, RestMax);
                // 2. the hand forward to the thigh's side: its middle against the thigh's middle line at its height
                var c = Vector3.zero;
                for (var i = hs; i < he; i++) c += _skin.P[i];
                c /= he - hs;
                var (hip, knee) = side < 0 ? (_tl, _kl) : (_tr, _kr);
                if (hip != null && knee != null)
                {
                    var leg = knee.position - hip.position;
                    var t = Mathf.Clamp01(Vector3.Dot(c - hip.position, leg) / Mathf.Max(1e-4f, leg.sqrMagnitude));
                    var behind = Vector3.Dot(hip.position + leg * t - c, transform.forward);
                    wantFwd = forward + Mathf.Atan2(behind, Mathf.Max(0.2f, (c - shoulder).magnitude)) * Mathf.Rad2Deg;
                }
                // and the upper arm no further back than ArmBack from the vertical (A1)
                var armDir = (elbow - shoulder).normalized;
                var back = Mathf.Asin(Mathf.Clamp(-Vector3.Dot(armDir, transform.forward), -1f, 1f)) * Mathf.Rad2Deg;
                Diag[side < 0 ? 14 : 15] = back;
                wantFwd = Mathf.Clamp(Mathf.Max(wantFwd, forward + back - ArmBack), 0f, RestForward);
                // 3. the hand off the thigh by the forearm's turn at the elbow
                var gapH = Gap(hs, he, 2, float.MaxValue);
                if (gapH == float.MaxValue)
                    for (var i = hs; i < he; i += 4)
                    {
                        var g = _skin.NearestLow(_skin.P[i], out var at, 2);
                        if (g < gapH) { gapH = g; _gapArm = i; _gapBody = at; }
                    }
                DiagAt[side < 0 ? 2 : 6] = _gapArm; DiagAt[side < 0 ? 3 : 7] = _gapBody;
                Diag[side < 0 ? 1 : 3] = gapH < float.MaxValue ? gapH : -1f;
                wantTwist = twist;
                wantCarry = carry;
                if (gapH < float.MaxValue)
                {
                    var err = gapH - SkinGap;   // > 0: the hand hangs too far off the thigh
                    // 4. the upper arm's inward roll: how far the hand's nearest point moves to the body per radian of it
                    var gain = 0f;
                    if (_gapArm >= 0 && _gapBody >= 0)
                    {
                        var to = _skin.P[_gapBody] - _skin.P[_gapArm];
                        var dir = to.sqrMagnitude > 1e-8f ? to.normalized : -Outward(side);
                        var off = _skin.P[_gapArm] - shoulder; off -= armDir * Vector3.Dot(off, armDir);
                        gain = Vector3.Dot(Vector3.Cross(armDir * side, off), dir);
                    }
                    var carryWant = Mathf.Clamp(carry + Mathf.Atan2(-err, Mathf.Max(0.2f, (c - elbow).magnitude)) * Mathf.Rad2Deg, CarryMin, CarryMax);
                    var rollWant = gain > 0.02f ? Mathf.Clamp(twist + Mathf.Clamp(err / gain, -0.5f, 0.5f) * Mathf.Rad2Deg, 0f, TwistMax) : twist;
                    // too far: the elbow's carry gives way first (to its least), then the roll; too near: the roll first, then
                    // the carry (each owns the hand in turn, so they do not fight)
                    if (err > 0f)
                    {
                        if (carry > CarryMin + 0.5f) wantCarry = carryWant;
                        else wantTwist = rollWant;
                    }
                    else
                    {
                        if (twist > 0.5f && gain > 0.02f) wantTwist = rollWant;
                        else wantCarry = carryWant;
                    }
                }
            }
            var nf = Mathf.MoveTowards(forward, wantFwd, step);
            var ni = Mathf.MoveTowards(inward, wantIn, step);
            // the roll comes back at twice the rate after a gesture (the hands hung wide for 1.7 s after each, A4, 2026-11-06)
            var nt = Mathf.MoveTowards(twist, wantTwist, (resting ? TwistRate : Release) * dt);
            var nc = Mathf.MoveTowards(carry, wantCarry, step);
            TurnArm(upper, first, nf - forward, Vector3.Cross(lower.position - upper.position, transform.forward));
            TurnArm(upper, first, ni - inward, Vector3.Cross(lower.position - upper.position, -Outward(side)));
            TurnArm(upper, first, side * (nt - twist), lower.position - upper.position);
            TurnForearm(lower, first, nc - carry, CarryAxis(upper, lower, hand, side));
            forward = nf; inward = ni; twist = nt; carry = nc;
        }

        /// <summary>With the body's skin: the upper arm turned at the shoulder just enough to bring the deepest point of
        /// the arm (the lower upper arm, the forearm, the hand and fingers) <see cref="SkinMargin"/> out of the body or its
        /// clothes, then again for what is left (twice); the turn comes at once and goes at <see cref="Release"/>° a second.</summary>
        private void SkinClear(Transform upper, BodySkin.Part first, ref float angle, ref Vector3 axis, float dt)
        {
            if (upper == null) return;
            var left = first == BodySkin.Part.UpperArmL;
            var lower = left ? _ll : _rl; var handT = left ? _lh : _rh;
            var wrist0 = handT != null ? handT.position : Vector3.zero;
            var (need, dir) = SkinNeed(upper, first);
            var forUpper = _needAt >= _skin.Begin(first) && _needAt < _skin.Begin(first + 1);
            if (need > 0f) axis = dir;
            angle = need >= angle ? need : Mathf.MoveTowards(angle, need, Release * dt);
            if (angle <= 0.01f) return;
            TurnArm(upper, first, angle, axis);
            for (var pass = 0; pass < 2; pass++)
            {
                var (more, dir2) = SkinNeed(upper, first);
                if (more <= 0.01f) break;
                TurnArm(upper, first, more, dir2);
            }
            // at rest, a push for the upper arm's own contact (against the chest's side) keeps the hand where it was placed:
            // the forearm turned back to it at the elbow, within the elbow's bend (turned out at the shoulder, the whole arm
            // carried the hand 5-9 cm off the thigh, A4, 2026-11-07)
            if (!KeepHand || !forUpper || _restW < 0.99f || lower == null || handT == null) return;
            var E = lower.position; var cur = handT.position - E; var want = wrist0 - E;
            if (cur.sqrMagnitude < 1e-6f || want.sqrMagnitude < 1e-6f) return;
            var ua = (E - upper.position).normalized;
            var fa = want.normalized;
            var bend = Vector3.Angle(ua, fa);
            if (bend > BendMax + 4f) fa = Vector3.RotateTowards(fa, ua, (bend - BendMax - 4f) * Mathf.Deg2Rad, 0f).normalized;
            Quaternion.FromToRotation(cur, fa * cur.magnitude).ToAngleAxis(out var aK, out var axK);
            if (aK > 0.01f && axK.sqrMagnitude > 0.5f) TurnForearm(lower, first, aK, axK);
            if (SkinNeed(upper, first, true).Angle > 0.01f) TurnForearm(lower, first, -aK, axK);   // (the forearm and hand never back into the body)
        }

        /// <summary>At rest: the hand kept where it was placed when the arm is pushed out for its upper arm's contact.</summary>
        public bool KeepHand = true;
        private int _needAt = -1;

        private (float Angle, Vector3 Axis) SkinNeed(Transform upper, BodySkin.Part first, bool lowerOnly = false)
        {
            var shoulder = upper.position;
            var best = 0f; var axis = Vector3.zero; _needAt = -1;
            var from = _skin.Begin(lowerOnly ? first + 1 : first); var to = _skin.End(first + 2);
            var hand = _skin.Begin(first + 2);
            var lowerArm = first == BodySkin.Part.UpperArmL ? _ll : _rl;
            var elbowAt = lowerArm != null ? lowerArm.position : upper.position;
            for (var i = from; i < to; i++)
            {
                var p = _skin.P[i];
                if (!_skin.Depth(p, out var d, out var n)) continue;
                // the upper arm and the forearm by the elbow may press into the clothes a little (ClothGive); the hand not
                if (_restW > 0.99f && i < hand && _skin.Near >= 0 && (i < _skin.Begin(first + 1) || (p - elbowAt).sqrMagnitude < 0.0064f)) d -= ClothGive * _skin.Off(_skin.Near);
                if (d + Margin3 <= 0f) continue;
                var arm = p - shoulder;
                var a = Mathf.Atan2(d + Margin3, arm.magnitude) * Mathf.Rad2Deg;
                if (a <= best) continue;
                var ax = Vector3.Cross(arm, n);
                if (ax.sqrMagnitude < 1e-8f) continue;
                best = a; axis = ax.normalized; _needAt = i;
                // for the gate's report: the arm's point and the body's point the push is for (the elbow slots at rest)
                var left = first == BodySkin.Part.UpperArmL;
                DiagAt[left ? 0 : 4] = i; DiagAt[left ? 1 : 5] = _skin.Near;
            }
            return (best, axis);
        }

        /// <summary>How deep the arms are in the body's skin now (m), as the gate measures it.</summary>
        private float SkinDepth()
        {
            _skin.Pose();
            var deepest = 0f;
            foreach (var first in new[] { BodySkin.Part.UpperArmL, BodySkin.Part.UpperArmR })
                for (int i = _skin.Begin(first), to = _skin.End(first + 2); i < to; i++)
                    if (_skin.Depth(_skin.P[i], out var d, out _)) deepest = Mathf.Max(deepest, d);
            return deepest;
        }

        private void Clear(Transform upper, Transform lower, Transform hand, ref float angle, ref Vector3 axis, float dt)
        {
            if (upper == null || lower == null || hand == null) return;
            var (need, dir) = Need(upper, lower, hand, Margin);
            if (need > 0f) axis = dir;
            angle = need >= angle ? need : Mathf.MoveTowards(angle, need, Release * dt);
            if (angle <= 0.01f) return;
            upper.rotation = Quaternion.AngleAxis(angle, axis) * upper.rotation;
            // a second look: bringing the elbow out can leave the hand in, or the other way round
            var (more, dir2) = Need(upper, lower, hand, Margin);
            if (more > 0.01f) upper.rotation = Quaternion.AngleAxis(more, dir2) * upper.rotation;
        }

        /// <summary>The turn at the shoulder that brings the deepest point of the arm out of the torso, and its axis.</summary>
        private (float Angle, Vector3 Axis) Need(Transform upper, Transform lower, Transform hand, float margin)
        {
            var shoulder = upper.position;
            var elbow = lower.position;
            var wrist = hand.position;
            var along = wrist - elbow;
            var best = 0f;
            var axis = Vector3.zero;
            // the elbow, the forearm, the wrist, the hand's middle and the fingers' ends (a hand at rest reaches a hand's
            // length past the wrist: the fingers sink in first)
            var (knuckle, tip) = hand == _lh ? (_lm, _lt) : (_rm, _rt);
            var handDir = knuckle != null ? (knuckle.position - wrist).normalized : along.normalized;
            var end = tip != null ? tip.position : wrist + handDir * 0.16f;
            // each point's own skin stands off its bone line (the forearm's ~4 cm, the wrist's 3, the hand's half-thickness):
            // the margin is the body's gap plus that
            var size = Mathf.Max(0.5f, transform.lossyScale.y);
            for (var k = 0; k < 6; k++)
            {
                var skin = size * (k switch { 0 => 0.045f, 1 => 0.04f, 2 => 0.03f, 3 => 0.02f, 4 => 0.015f, _ => 0.01f });
                var p = k switch
                {
                    0 => elbow,
                    1 => Vector3.Lerp(elbow, wrist, 0.5f),
                    2 => wrist,
                    3 => wrist + handDir * 0.08f,   // the hand's middle
                    4 => knuckle != null ? knuckle.position : wrist + handDir * 0.1f,
                    _ => end,
                };
                if (!Inside(p, margin + skin, out var push)) continue;
                var arm = p - shoulder;
                var a = Mathf.Atan2(push.magnitude, arm.magnitude) * Mathf.Rad2Deg;
                if (a <= best) continue;
                var ax = Vector3.Cross(arm, push);
                if (ax.sqrMagnitude < 1e-8f) continue;
                best = a;
                axis = ax.normalized;
            }
            return (best, axis);
        }

        /// <summary>A point's place against a thigh's skin (the thigh's bone line, its measured widths): how far outside it
        /// is (negative: inside), and the way out from the bone (world).</summary>
        private bool ThighGap(Vector3 p, Transform hip, Transform knee, float[] radii, out float gap, out Vector3 outward)
        {
            gap = float.MaxValue; outward = Vector3.zero;
            if (hip == null || knee == null || radii == null || radii.Length < 2 || _profile == null) return false;
            var axis = knee.position - hip.position;
            var len2 = axis.sqrMagnitude;
            if (len2 < 1e-6f) return false;
            var t = Vector3.Dot(p - hip.position, axis) / len2;
            if (t < -0.05f || t > 1f) return false;
            t = Mathf.Clamp01(t);
            var off = p - (hip.position + axis * t);
            var d = off.magnitude;
            if (d < 1e-5f) { off = transform.right; d = 1e-5f; }
            float r;
            var stations = TorsoProfile.ThighStations;
            if (radii.Length == stations * 4)
            {
                // four widths a station (out, front, in, back in the body's frame), blended by the point's direction
                var frame = _hips.rotation * Quaternion.Inverse(_profile.HipsRest);
                var lo = Quaternion.Inverse(frame) * off;
                var th = Mathf.Atan2(lo.z, lo.x);
                float c = Mathf.Cos(th), sn = Mathf.Sin(th);
                float R(int st) => radii[st * 4 + 0] * Mathf.Max(0f, c) * Mathf.Max(0f, c) + radii[st * 4 + 1] * Mathf.Max(0f, sn) * Mathf.Max(0f, sn)
                                 + radii[st * 4 + 2] * Mathf.Max(0f, -c) * Mathf.Max(0f, -c) + radii[st * 4 + 3] * Mathf.Max(0f, -sn) * Mathf.Max(0f, -sn);
                var f = t * (stations - 1);
                var i = Mathf.Min((int)f, stations - 2);
                r = Mathf.Lerp(R(i), R(i + 1), f - i);
            }
            else
            {
                var f = t * (radii.Length - 1);
                var i = Mathf.Min((int)f, radii.Length - 2);
                r = Mathf.Lerp(radii[i], radii[i + 1], f - i);
            }
            r *= Mathf.Max(0.01f, transform.lossyScale.y);
            gap = d - r;
            outward = off / d;
            return true;
        }

        /// <summary>Whether a point is inside the torso or a thigh (grown by <paramref name="margin"/>), and the way out (world,
        /// m).</summary>
        public bool Inside(Vector3 p, float margin, out Vector3 push)
        {
            push = Vector3.zero;
            if (!Ready) return false;
            foreach (var (hip, knee, radii) in new[] { (_tl, _kl, _profile.ThighL), (_tr, _kr, _profile.ThighR) })
                if (ThighGap(p, hip, knee, radii, out var g, out var o) && g < margin && (margin - g) > push.magnitude)
                    push = o * (margin - g);
            var rot = _hips.rotation * Quaternion.Inverse(_profile.HipsRest);
            var scale = Mathf.Max(0.01f, transform.lossyScale.y);
            var local = Quaternion.Inverse(rot) * (p - _hips.position) / scale;
            // below the fork, where the thighs are measured, the sections (round both legs) do not hold a hand off
            if (_profile.ThighL != null && local.y < _profile.Fork) return push.sqrMagnitude > 0f;
            if (!_profile.Sample(local.y, out var cx, out var cz, out var rx, out var rz)) return push.sqrMagnitude > 0f;
            rx += margin / scale; rz += margin / scale;
            var dx = (local.x - cx) / rx;
            var dz = (local.z - cz) / rz;
            var q = Mathf.Sqrt(dx * dx + dz * dz);
            if (q >= 1f) return push.sqrMagnitude > 0f;
            // out along the line from the section's middle (straight out sideways from the very middle)
            Vector2 way = q > 0.05f ? new Vector2(dx, dz) / q : new Vector2(local.x >= cx ? 1f : -1f, 0f);
            var exit = new Vector2(cx + way.x * rx, cz + way.y * rz);
            var move = exit - new Vector2(local.x, local.z);
            var section = rot * new Vector3(move.x, 0f, move.y) * scale;
            if (section.sqrMagnitude > push.sqrMagnitude) push = section;
            return true;
        }

        /// <summary>How deep the arms are in the body now (no margin), m: what a viewer would see sunk in (the body's own
        /// skin where it has one; the torso's sections otherwise).</summary>
        public float Depth()
        {
            if (SkinReady) return SkinDepth();
            if (_profile == null || _profile.Bins < 2) return 0f;
            var deepest = 0f;
            foreach (var (u, l, h) in new[] { (_lu, _ll, _lh), (_ru, _rl, _rh) })
            {
                if (u == null || l == null || h == null) continue;
                var along = h.position - l.position;
                foreach (var p in new[] { l.position, Vector3.Lerp(l.position, h.position, 0.5f), h.position, h.position + along.normalized * 0.08f })
                    if (Inside(p, 0f, out var push)) deepest = Mathf.Max(deepest, push.magnitude);
            }
            return deepest;
        }
    }
}
