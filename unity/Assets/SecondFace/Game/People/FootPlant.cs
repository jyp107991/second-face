using UnityEngine;

namespace SecondFace.Game.People
{
    /// <summary>
    /// Feet on the ground they stand on (BUILD_PLAN §6.E, P4 step 4; docs/PEOPLE_MOTION.md F1-F4, §2.3). The clips were
    /// captured on flat floors by bodies of other sizes, and the world is not flat. In the base layer's IK pass:
    /// <list type="bullet">
    /// <item>Soles on the ground: after each frame the ankle's height over the ground is compared with the body's own ankle
    /// height over a flat sole (from its bind pose), and the whole body is moved by the difference next frame (a feedback
    /// on the lower foot: a clip that would float the body or sink it is corrected, whatever the avatar).</item>
    /// <item>Uneven ground: each foot is moved by the height of the ground under it relative to the person's footing, turned
    /// to the slope, and the pelvis drops by the lower foot's depth so that leg can reach.</item>
    /// <item>Standing: the feet are planted. Each is held where it was put down (a body turning or shifting over it does not
    /// slide it), flat on the ground, no wider apart than <see cref="MaxStance"/>; when the place the clip wants it in has
    /// gone more than <see cref="StepReach"/> from it, or turned more than <see cref="StepTurn"/>, it steps there (lifted on
    /// an arc over <see cref="StepTime"/> s, one foot at a time).</item>
    /// <item>Walking: the clip's stride, nudged by the ground (a full plant would drag it).</item>
    /// </list>
    /// Humanoid IK (Animator.SetIKPosition), no rig: cheap enough for every person within the game camera's reach.
    /// </summary>
    [RequireComponent(typeof(Animator))]
    public sealed class FootPlant : MonoBehaviour
    {
        public LayerMask Ground = Physics.DefaultRaycastLayers;
        /// <summary>How far above and below its animated place a foot looks for ground, m.</summary>
        public float Reach = 0.45f;
        /// <summary>The weight while walking at a normal pace (standing is 1).</summary>
        public float WalkingWeight = 0.35f;
        public float Smoothing = 20f;
        /// <summary>Below this speed a person stands (m/s).</summary>
        public float StandSpeed = 0.12f;
        /// <summary>The widest a standing person's heels stand apart, m (the preferred quiet stance is 0.17 m; McIlroy &amp; Maki).</summary>
        public float MaxStance = 0.27f;
        /// <summary>The farthest one standing foot is ahead of the other, m.</summary>
        public float MaxStagger = 0.22f;
        public float StepReach = 0.13f, StepTurn = 28f, StepTime = 0.32f, StepLift = 0.07f;

        private static readonly int SpeedId = Animator.StringToHash("Speed");
        private Animator _animator;
        private bool _hasSpeed;
        private float _pelvis, _left, _right, _sink, _cL, _cR;
        private Transform _footL, _footR;
        private float _ankleL, _ankleR;   // the ankle's height over a flat sole, from the bind pose (world m at the body's scale)

        private struct Foot
        {
            public bool Planted, Stepping;
            public Vector3 Pin, From, To;
            public float PinYaw, FromYaw, ToYaw, T;
            /// <summary>The height the clip puts this foot down at (over the footing), the lowest it has been lately: a planted
            /// foot stays there, whatever the clip does with it.</summary>
            public float Down;
        }

        /// <summary>How far each foot bone ended from where its IK goal put it last frame (tests read it), m.</summary>
        public Vector2 GoalError { get; private set; }
        private Vector3 _goalL, _goalR;

        private Foot _l, _r;
        private float _plant;   // 0 walking .. 1 planted

        /// <summary>The last offsets applied (tests read them): left foot, right foot, pelvis, m.</summary>
        public Vector3 Offsets => new(_left, _right, _pelvis);
        /// <summary>How far the whole body is moved down to put its soles on the ground, m.</summary>
        public float Sink => _sink;

        private void Awake()
        {
            _animator = GetComponent<Animator>();
            Bind();
            if (_animator != null && _animator.isHuman)
            {
                // at rest, before any clip: the body stands on its root
                _footL = _animator.GetBoneTransform(HumanBodyBones.LeftFoot);
                _footR = _animator.GetBoneTransform(HumanBodyBones.RightFoot);
                var y = transform.position.y;
                _bindScale = Mathf.Max(0.01f, transform.lossyScale.y);
                _ankleL = _footL != null ? Mathf.Clamp(_footL.position.y - y, 0.03f, 0.2f) : 0.08f;
                _ankleR = _footR != null ? Mathf.Clamp(_footR.position.y - y, 0.03f, 0.2f) : 0.08f;
            }
        }

        /// <summary>Looks again at the controller's parameters (after a controller is given at runtime).</summary>
        public void Bind()
        {
            _hasSpeed = false;
            if (_animator != null && _animator.runtimeAnimatorController != null)
                foreach (var p in _animator.parameters) if (p.nameHash == SpeedId) _hasSpeed = true;
        }

        private void OnDisable() { _l.Planted = _r.Planted = false; _l.Stepping = _r.Stepping = false; }

        private void OnAnimatorIK(int layer)
        {
            if (layer != 0 || _animator == null) return;
            var speed = _hasSpeed ? _animator.GetFloat(SpeedId) : 0f;
            var weight = Mathf.Lerp(1f, WalkingWeight, Mathf.Clamp01(speed / 1.4f));
            var footing = transform.position.y;
            var dt = Time.deltaTime > 0 ? Time.deltaTime : 1f / 30f;
            var k = 1f - Mathf.Exp(-Smoothing * dt);
            var hitL = Probe(AvatarIKGoal.LeftFoot, footing, out var targetL, out var normalL);
            var hitR = Probe(AvatarIKGoal.RightFoot, footing, out var targetR, out var normalR);
            _left = Mathf.Lerp(_left, hitL ? targetL : 0f, k);
            _right = Mathf.Lerp(_right, hitR ? targetR : 0f, k);
            // the pelvis follows the lower foot's ground directly (from the smoothed feet it lagged a second step behind),
            // and the whole body sinks or rises to put the soles on the ground
            var low = Mathf.Min(hitL ? targetL : 0f, hitR ? targetR : 0f);
            _pelvis = Mathf.Lerp(_pelvis, Mathf.Min(0f, low) * weight, k);
            _animator.bodyPosition += Vector3.up * (_pelvis + _sink);
            // standing: planted feet; walking: the clip's (a body set down somewhere else lifts its feet from where they were)
            if ((transform.position - _was).sqrMagnitude > 0.25f) { _l.Planted = _r.Planted = false; _l.Stepping = _r.Stepping = false; }
            _was = transform.position;
            var standing = speed < StandSpeed;
            _plant = Mathf.MoveTowards(_plant, standing ? 1f : 0f, dt / 0.15f);
            if (!standing) { _l.Planted = _r.Planted = false; _l.Stepping = _r.Stepping = false; }
            var animL = _animator.GetIKPosition(AvatarIKGoal.LeftFoot) + Vector3.up * (_left + _sink + _cL);
            var animR = _animator.GetIKPosition(AvatarIKGoal.RightFoot) + Vector3.up * (_right + _sink + _cR);
            var rotL = Quaternion.FromToRotation(Vector3.up, hitL ? normalL : Vector3.up) * _animator.GetIKRotation(AvatarIKGoal.LeftFoot);
            var rotR = Quaternion.FromToRotation(Vector3.up, hitR ? normalR : Vector3.up) * _animator.GetIKRotation(AvatarIKGoal.RightFoot);
            if (_plant > 0f)
            {
                var (wantL, wantR) = Narrow(animL, animR);
                Plant(ref _l, ref _r, wantL, Yaw(rotL), dt);
                Plant(ref _r, ref _l, wantR, Yaw(rotR), dt);
                animL = Vector3.Lerp(animL, Placed(ref _l, wantL, rotL, out rotL), _plant);
                animR = Vector3.Lerp(animR, Placed(ref _r, wantR, rotR, out rotR), _plant);
            }
            Set(AvatarIKGoal.LeftFoot, animL, rotL, weight);
            Set(AvatarIKGoal.RightFoot, animR, rotR, weight);
            _goalL = animL; _goalR = animR;
        }

        /// <summary>After the IK: how far the lower ankle stands off its flat-sole height over the ground; the body is moved by
        /// that next frame.</summary>
        private void LateUpdate()
        {
            if (_footL == null || _footR == null || !enabled || _animator == null || !_animator.enabled) return;
            GoalError = new Vector2(Vector3.Distance(_footL.position, _goalL), Vector3.Distance(_footR.position, _goalR));
            var gl = GroundUnder(_footL.position); var gr = GroundUnder(_footR.position);
            if (float.IsNaN(gl) && float.IsNaN(gr)) return;
            var scale = Mathf.Max(0.01f, transform.lossyScale.y);
            var el = float.IsNaN(gl) ? float.MaxValue : _footL.position.y - gl - _ankleL * scale / Mathf.Max(0.01f, _bindScale);
            var er = float.IsNaN(gr) ? float.MaxValue : _footR.position.y - gr - _ankleR * scale / Mathf.Max(0.01f, _bindScale);
            // (a foot in the air on a step is not standing on anything)
            if (_l.Stepping) el = float.MaxValue;
            if (_r.Stepping) er = float.MaxValue;
            var e = Mathf.Min(el, er);   // the lower foot bears the weight
            if (e == float.MaxValue || Mathf.Abs(e) > 0.3f) return;
            var dt = Time.deltaTime > 0 ? Time.deltaTime : 1f / 30f;
            var standing = _plant > 0.5f;
            var gain = standing ? 12f : 4f;   // gently while walking: the stance ankle rises and falls with the stride
            var k = 1f - Mathf.Exp(-gain * dt);
            _sink = Mathf.Clamp(_sink - e * k, -0.15f, 0.15f);
            // standing, both feet bear weight: the higher is brought down to the ground too (a clip's raised foot, a shift of
            // weight left hovering); walking, each foot is the clip's
            if (standing)
            {
                if (el != float.MaxValue) _cL = Mathf.Clamp(_cL - (el - e) * k, -0.12f, 0.02f);
                if (er != float.MaxValue) _cR = Mathf.Clamp(_cR - (er - e) * k, -0.12f, 0.02f);
            }
            else { _cL = Mathf.Lerp(_cL, 0f, k); _cR = Mathf.Lerp(_cR, 0f, k); }
        }

        private float _bindScale = 1f;
        private Vector3 _was;

        private Vector3 GroundNormal(Vector3 p)
        {
            var from = new Vector3(p.x, p.y + Reach, p.z);
            return Physics.Raycast(from, Vector3.down, out var hit, Reach * 2.5f, Ground, QueryTriggerInteraction.Ignore) ? hit.normal : Vector3.up;
        }

        private float GroundUnder(Vector3 p)
        {
            var from = new Vector3(p.x, p.y + Reach, p.z);
            return Physics.Raycast(from, Vector3.down, out var hit, Reach * 2.5f, Ground, QueryTriggerInteraction.Ignore) ? hit.point.y : float.NaN;
        }

        /// <summary>The feet the clip wants, drawn together to <see cref="MaxStance"/> across the body if it stands them wider.</summary>
        private (Vector3, Vector3) Narrow(Vector3 l, Vector3 r)
        {
            var right = transform.right; right.y = 0f; right.Normalize();
            var ahead = Vector3.Cross(right, Vector3.up);
            var size = Mathf.Max(0.5f, transform.lossyScale.y);
            var across = Vector3.Dot(r - l, right);
            var max = MaxStance * size;
            if (across > max) { var pull = (across - max) * 0.5f; l += right * pull; r -= right * pull; }
            var along = Vector3.Dot(r - l, ahead);
            var stagger = MaxStagger * size;
            if (Mathf.Abs(along) > stagger) { var pull = (Mathf.Abs(along) - stagger) * 0.5f * Mathf.Sign(along); l += ahead * pull; r -= ahead * pull; }
            return (l, r);
        }

        private static float Yaw(Quaternion q)
        {
            var f = q * Vector3.forward;
            if (Mathf.Abs(f.y) > 0.9f) f = q * Vector3.up;
            return Mathf.Atan2(f.x, f.z) * Mathf.Rad2Deg;
        }

        /// <summary>Puts a foot down where it is, or steps it to where the clip wants it (one foot at a time).</summary>
        private void Plant(ref Foot f, ref Foot other, Vector3 want, float wantYaw, float dt)
        {
            var over = want.y - transform.position.y;
            if (!f.Planted) { f.Planted = true; f.Pin = want; f.PinYaw = wantYaw; f.Stepping = false; f.Down = over; return; }
            f.Down = Mathf.Min(over, f.Down + 0.03f * dt);   // follows the clip down at once, up only slowly
            if (f.Stepping)
            {
                f.T += dt / StepTime;
                f.To = want; f.ToYaw = wantYaw;   // the place keeps moving with a turning body
                if (f.T >= 1f) { f.Stepping = false; f.Pin = want; f.PinYaw = wantYaw; }
                return;
            }
            if (other.Stepping) return;
            var off = Vector3.ProjectOnPlane(want - f.Pin, Vector3.up).magnitude;
            var turn = Mathf.Abs(Mathf.DeltaAngle(f.PinYaw, wantYaw));
            if (off > StepReach || turn > StepTurn)
            {
                f.Stepping = true; f.T = 0f; f.From = f.Pin; f.FromYaw = f.PinYaw; f.To = want; f.ToYaw = wantYaw;
            }
        }

        /// <summary>Where a planted foot is now and how it is turned: on its pin, or on its step's arc (at the height the clip
        /// and the ground give the place it is held).</summary>
        private Vector3 Placed(ref Foot f, Vector3 want, Quaternion animRot, out Quaternion rot)
        {
            Vector3 at; float yaw;
            if (f.Stepping)
            {
                var t = Mathf.Clamp01(f.T);
                var s = t * t * (3f - 2f * t);
                at = Vector3.Lerp(f.From, f.To, s);
                at.y = Mathf.Lerp(f.From.y, want.y, s) + StepLift * Mathf.Sqrt(Mathf.Sin(t * Mathf.PI));
                yaw = Mathf.LerpAngle(f.FromYaw, f.ToYaw, s);
            }
            else { at = f.Pin; at.y = transform.position.y + f.Down; yaw = f.PinYaw; }
            // flat on the ground under it, pointing its way (a standing foot bears weight: no heel or toes in the air)
            var n = GroundNormal(at);
            var dir = Quaternion.AngleAxis(yaw, Vector3.up) * Vector3.forward;
            rot = Quaternion.LookRotation(Vector3.ProjectOnPlane(dir, n).normalized, n);
            return at;
        }

        /// <summary>Where each foot was probed last (tests read them): left, right.</summary>
        public (Vector3, Vector3) Probed { get; private set; }

        /// <summary>The ground's height under a foot relative to the footing, and its normal.</summary>
        private bool Probe(AvatarIKGoal goal, float footing, out float offset, out Vector3 normal)
        {
            var foot = _animator.GetIKPosition(goal);
            Probed = goal == AvatarIKGoal.LeftFoot ? (foot, Probed.Item2) : (Probed.Item1, foot);
            var from = new Vector3(foot.x, footing + Reach, foot.z);
            if (Physics.Raycast(from, Vector3.down, out var hit, Reach * 2f, Ground, QueryTriggerInteraction.Ignore))
            {
                offset = hit.point.y - footing;
                normal = hit.normal;
                return true;
            }
            offset = 0f; normal = Vector3.up;
            return false;
        }

        private void Set(AvatarIKGoal goal, Vector3 position, Quaternion rotation, float weight)
        {
            var w = Mathf.Lerp(weight, 1f, _plant);
            _animator.SetIKPositionWeight(goal, w);
            _animator.SetIKRotationWeight(goal, w);
            _animator.SetIKPosition(goal, position);
            _animator.SetIKRotation(goal, rotation);
        }
    }
}
