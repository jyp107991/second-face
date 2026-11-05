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
    public sealed class ArmClearance : MonoBehaviour
    {
        public float Margin = 0.02f;
        public float Release = 90f;
        /// <summary>Standing still, no gesture: an arm hanging away from the body is drawn in until the hand rests this far
        /// from the side of the hip or thigh (docs/PEOPLE_MOTION.md A4), by at most <see cref="RestMax"/>°, at
        /// <see cref="RestRate"/>° a second.</summary>
        public float RestGap = 0.025f, RestMax = 18f, RestRate = 30f;

        private static readonly int SpeedId = Animator.StringToHash("Speed");
        private float _restL, _restR;
        private Vector3 _restAxisL, _restAxisR;
        private int _gestureLayer = -2;
        private bool _hasSpeed;

        private Animator _animator;
        private TorsoProfile _profile;
        private Transform _hips, _lu, _ll, _lh, _ru, _rl, _rh;
        private float _angleL, _angleR;
        private Vector3 _axisL = Vector3.forward, _axisR = Vector3.forward;

        /// <summary>The turn given to each upper arm this frame, degrees (tests read it).</summary>
        public Vector2 Turned => new(_angleL, _angleR);
        public bool Ready => _profile != null && _profile.Bins > 1 && _hips != null && _lu != null && _ru != null;

        private void Awake() => Bind();

        /// <summary>Finds the profile and the bones again (after a body is dressed or rebuilt).</summary>
        public void Bind()
        {
            _animator = GetComponent<Animator>();
            _profile = GetComponent<TorsoProfile>();
            if (_animator == null || !_animator.isHuman) return;
            _hips = _animator.GetBoneTransform(HumanBodyBones.Hips);
            _lu = _animator.GetBoneTransform(HumanBodyBones.LeftUpperArm);
            _ll = _animator.GetBoneTransform(HumanBodyBones.LeftLowerArm);
            _lh = _animator.GetBoneTransform(HumanBodyBones.LeftHand);
            _ru = _animator.GetBoneTransform(HumanBodyBones.RightUpperArm);
            _rl = _animator.GetBoneTransform(HumanBodyBones.RightLowerArm);
            _rh = _animator.GetBoneTransform(HumanBodyBones.RightHand);
            _gestureLayer = -2;
            _hasSpeed = false;
            if (_animator.runtimeAnimatorController != null)
                foreach (var p in _animator.parameters) if (p.nameHash == SpeedId) _hasSpeed = true;
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
            var rot = _hips.rotation * Quaternion.Inverse(_profile.HipsRest);
            var scale = Mathf.Max(0.01f, transform.lossyScale.y);
            var local = Quaternion.Inverse(rot) * (p - _hips.position) / scale;
            if (!_profile.Sample(local.y, out var cx, out var cz, out var rx, out var rz)) return false;
            var dx = (local.x - cx) / rx;
            var dz = (local.z - cz) / rz;
            var q = Mathf.Sqrt(dx * dx + dz * dz);
            if (q <= 1f) return false;
            var d = new Vector2(local.x - cx, local.z - cz);
            gap = d.magnitude * (1f - 1f / q) * scale;
            inward = rot * new Vector3(-d.x, 0f, -d.y).normalized;
            return true;
        }

        private void LateUpdate()
        {
            if (!Ready) return;
            var dt = Time.deltaTime > 0f ? Time.deltaTime : Time.unscaledDeltaTime;
            var resting = Resting();
            Rest(_lu, _ll, _lh, ref _restL, ref _restAxisL, resting, dt);
            Rest(_ru, _rl, _rh, ref _restR, ref _restAxisR, resting, dt);
            Clear(_lu, _ll, _lh, ref _angleL, ref _axisL, dt);
            Clear(_ru, _rl, _rh, ref _angleR, ref _axisR, dt);
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
            for (var k = 0; k < 4; k++)
            {
                var p = k switch
                {
                    0 => elbow,
                    1 => Vector3.Lerp(elbow, wrist, 0.5f),
                    2 => wrist,
                    _ => wrist + along.normalized * 0.08f,   // the hand's middle
                };
                if (!Inside(p, margin, out var push)) continue;
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

        /// <summary>Whether a point is inside the torso (grown by <paramref name="margin"/>), and the way out (world, m).</summary>
        public bool Inside(Vector3 p, float margin, out Vector3 push)
        {
            push = Vector3.zero;
            if (!Ready) return false;
            var rot = _hips.rotation * Quaternion.Inverse(_profile.HipsRest);
            var scale = Mathf.Max(0.01f, transform.lossyScale.y);
            var local = Quaternion.Inverse(rot) * (p - _hips.position) / scale;
            if (!_profile.Sample(local.y, out var cx, out var cz, out var rx, out var rz)) return false;
            rx += margin / scale; rz += margin / scale;
            var dx = (local.x - cx) / rx;
            var dz = (local.z - cz) / rz;
            var q = Mathf.Sqrt(dx * dx + dz * dz);
            if (q >= 1f) return false;
            // out along the line from the section's middle (straight out sideways from the very middle)
            Vector2 way = q > 0.05f ? new Vector2(dx, dz) / q : new Vector2(local.x >= cx ? 1f : -1f, 0f);
            var exit = new Vector2(cx + way.x * rx, cz + way.y * rz);
            var move = exit - new Vector2(local.x, local.z);
            push = rot * new Vector3(move.x, 0f, move.y) * scale;
            return true;
        }

        /// <summary>How deep the arms are in the torso now (no margin), m: what a viewer would see sunk in.</summary>
        public float Depth()
        {
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
