using Unity.Cinemachine;
using Unity.Cinemachine.TargetTracking;
using UnityEngine;

namespace SecondFace.Game.Play
{
    /// <summary>
    /// The game camera (BUILD_PLAN §6.F.1, step 25): a Cinemachine 3 camera orbiting a look target that follows the
    /// leader (chest height, led by their velocity × <see cref="Lead"/> s) plus a pan of up to <see cref="PanLimit"/> m;
    /// yaw all round, pitch <see cref="MinPitch"/>–<see cref="MaxPitch"/>°, distance <see cref="MinDistance"/>–
    /// <see cref="MaxDistance"/> m, a 28° lens (orthographic feel, perspective for fog and scatter). Input moves goals;
    /// the camera eases to them over <see cref="Smoothing"/> s and a released orbit flings on, slowing over
    /// <see cref="FlingSeconds"/> s. Yaw is in the world's frame, not the leader's: turning to walk does not swing the view.
    /// </summary>
    public sealed class OrbitRig : MonoBehaviour
    {
        public const float MinPitch = 35f, MaxPitch = 62f, MinDistance = 8f, MaxDistance = 26f, PanLimit = 30f;
        public const float YawPerPixel = 0.22f, PitchPerPixel = 0.12f, Smoothing = 0.08f, FlingSeconds = 0.5f, Lead = 0.4f;

        public Transform Leader;
        public float Yaw = 30f, Pitch = 50f, Distance = 20f;

        public CinemachineCamera Virtual { get; private set; }
        public Transform Target { get; private set; }
        public Vector3 Pan { get; private set; }

        private CinemachineOrbitalFollow _orbit;
        private float _yawGoal, _pitchGoal, _distanceGoal;
        private float _yawFling, _pitchFling;   // degrees a second, from the last drag
        private bool _held;
        private Vector3 _lastLeader;

        /// <summary>Makes the rig on a camera (a brain on it, a virtual camera and a target beside).</summary>
        public static OrbitRig Create(Camera camera, Transform leader)
        {
            var go = new GameObject("Orbit rig");
            var rig = go.AddComponent<OrbitRig>();
            rig.Leader = leader;
            if (!camera.TryGetComponent<CinemachineBrain>(out var brain)) brain = camera.gameObject.AddComponent<CinemachineBrain>();
            brain.enabled = true;
            rig.Build();
            return rig;
        }

        private void Build()
        {
            Target = new GameObject("Look target").transform;
            Target.SetParent(transform, false);
            var vgo = new GameObject("Game camera");
            vgo.transform.SetParent(transform, false);
            Virtual = vgo.AddComponent<CinemachineCamera>();
            var lens = LensSettings.Default;
            lens.FieldOfView = 28f; lens.NearClipPlane = 0.3f; lens.FarClipPlane = 3000f;
            Virtual.Lens = lens;
            Virtual.Follow = Target;
            Virtual.LookAt = Target;
            _orbit = vgo.AddComponent<CinemachineOrbitalFollow>();
            _orbit.OrbitStyle = CinemachineOrbitalFollow.OrbitStyles.Sphere;
            var tracker = _orbit.TrackerSettings;
            tracker.BindingMode = BindingMode.WorldSpace;
            tracker.PositionDamping = Vector3.zero;
            _orbit.TrackerSettings = tracker;
            _orbit.HorizontalAxis.Range = new Vector2(-180f, 180f);
            _orbit.HorizontalAxis.Wrap = true;
            _orbit.VerticalAxis.Range = new Vector2(MinPitch, MaxPitch);
            _orbit.RadialAxis.Range = new Vector2(1f, 1f);
            _orbit.RadialAxis.Value = 1f;
            var composer = vgo.AddComponent<CinemachineRotationComposer>();
            composer.Damping = Vector2.zero;
            _yawGoal = Yaw; _pitchGoal = Pitch; _distanceGoal = Distance;
            if (Leader != null) { _lastLeader = Leader.position; Snap(); }
        }

        /// <summary>One finger dragged this many pixels this frame (held: no fling until released).</summary>
        public void Orbit(float dx, float dy, float dt)
        {
            _held = true;
            _yawGoal += dx * YawPerPixel;
            _pitchGoal = Mathf.Clamp(_pitchGoal - dy * PitchPerPixel, MinPitch, MaxPitch);
            if (dt > 0) { _yawFling = dx * YawPerPixel / dt; _pitchFling = -dy * PitchPerPixel / dt; }
        }

        /// <summary>The drag ended: the orbit flings on from its last speed.</summary>
        public void Release() => _held = false;

        /// <summary>Two fingers spread by this ratio: closer by it (log scale, as the fingers feel it).</summary>
        public void Zoom(float ratio)
        {
            if (ratio <= 0) return;
            _distanceGoal = Mathf.Clamp(_distanceGoal / ratio, MinDistance, MaxDistance);
        }

        /// <summary>The look target moved over the ground by this much (kept within <see cref="PanLimit"/> m).</summary>
        public void PanBy(Vector3 world)
        {
            world.y = 0;
            Pan = Vector3.ClampMagnitude(Pan + world, PanLimit);
        }

        /// <summary>Turns the view to a heading (degrees clockwise from north), eased or at once.</summary>
        public void TurnTo(float yaw, bool now = false)
        {
            _yawGoal = yaw;
            _yawFling = 0;
            if (now) Snap();
        }

        /// <summary>Back to the leader (a double tap on them).</summary>
        public void Recentre() => Pan = Vector3.zero;

        /// <summary>Puts the camera where its goals are at once (after a jump).</summary>
        public void Snap()
        {
            Yaw = _yawGoal; Pitch = _pitchGoal; Distance = _distanceGoal;
            _yawFling = _pitchFling = 0;
            Apply(Vector3.zero);
        }

        private void LateUpdate()
        {
            var dt = Time.unscaledDeltaTime;
            if (!_held)
            {
                var decay = Mathf.Exp(-dt * 4f / FlingSeconds);
                _yawGoal += _yawFling * dt; _pitchGoal = Mathf.Clamp(_pitchGoal + _pitchFling * dt, MinPitch, MaxPitch);
                _yawFling *= decay; _pitchFling *= decay;
            }
            var k = 1f - Mathf.Exp(-dt / Smoothing);
            Yaw = Mathf.LerpAngle(Yaw, _yawGoal, k);
            Pitch = Mathf.Lerp(Pitch, _pitchGoal, k);
            Distance = Mathf.Lerp(Distance, _distanceGoal, k);
            var velocity = Leader != null && dt > 0 ? (Leader.position - _lastLeader) / dt : Vector3.zero;
            if (Leader != null) _lastLeader = Leader.position;
            velocity.y = 0;
            Apply(Vector3.ClampMagnitude(velocity, 6f) * Lead);
        }

        private void Apply(Vector3 lead)
        {
            if (Leader != null) Target.position = Leader.position + Vector3.up * 1.3f + lead + Pan;
            if (_orbit == null) return;
            _orbit.Radius = Distance;
            _orbit.HorizontalAxis.Value = Mathf.DeltaAngle(0f, Yaw);
            _orbit.VerticalAxis.Value = Pitch;
        }
    }
}
