using UnityEngine;

namespace SecondFace.Game.People
{
    /// <summary>
    /// Feet on the ground they stand on (BUILD_PLAN §6.E, P4 step 4): the clips are captured on flat floors, the world is
    /// not. In the base layer's IK pass each foot is moved by the height of the ground under it relative to the person's
    /// own footing (a ray down from above the foot; the animated lift of a stride is kept), turned to the slope, and the
    /// pelvis drops by the lower foot's depth so that leg can reach. Full while standing, easing off with speed: the clips
    /// carry no contact curves, so a walking foot is only nudged (a full plant would drag it). Smoothed against pops.
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

        private static readonly int SpeedId = Animator.StringToHash("Speed");
        private Animator _animator;
        private bool _hasSpeed;
        private float _pelvis, _left, _right;

        /// <summary>The last offsets applied (tests read them): left foot, right foot, pelvis, m.</summary>
        public Vector3 Offsets => new(_left, _right, _pelvis);

        private void Awake()
        {
            _animator = GetComponent<Animator>();
            Bind();
        }

        /// <summary>Looks again at the controller's parameters (after a controller is given at runtime).</summary>
        public void Bind()
        {
            _hasSpeed = false;
            if (_animator != null && _animator.runtimeAnimatorController != null)
                foreach (var p in _animator.parameters) if (p.nameHash == SpeedId) _hasSpeed = true;
        }

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
            // the pelvis follows the lower foot's ground directly (from the smoothed feet it lagged a second step behind)
            var low = Mathf.Min(hitL ? targetL : 0f, hitR ? targetR : 0f);
            _pelvis = Mathf.Lerp(_pelvis, Mathf.Min(0f, low) * weight, k);
            _animator.bodyPosition += Vector3.up * _pelvis;
            Place(AvatarIKGoal.LeftFoot, _left, hitL ? normalL : Vector3.up, weight);
            Place(AvatarIKGoal.RightFoot, _right, hitR ? normalR : Vector3.up, weight);
        }

        /// <summary>The ground's height under a foot relative to the footing, and its normal.</summary>
        /// <summary>Where each foot was probed last (tests read them): left, right.</summary>
        public (Vector3, Vector3) Probed { get; private set; }

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

        private void Place(AvatarIKGoal goal, float offset, Vector3 normal, float weight)
        {
            var position = _animator.GetIKPosition(goal) + Vector3.up * offset;
            var rotation = Quaternion.FromToRotation(Vector3.up, normal) * _animator.GetIKRotation(goal);
            _animator.SetIKPositionWeight(goal, weight);
            _animator.SetIKRotationWeight(goal, weight);
            _animator.SetIKPosition(goal, position);
            _animator.SetIKRotation(goal, rotation);
        }
    }
}
