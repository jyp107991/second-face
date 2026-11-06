using UnityEngine;

namespace SecondFace.Game.People
{
    /// <summary>
    /// Where a person looks (BUILD_PLAN P4.8; docs/PEOPLE_MOTION.md H1-H3). The captured idles carry their subjects' own
    /// gaze (the common idle holds the face 16° up, at the capture studio's ceiling), so the head is drawn level ahead, or
    /// towards <see cref="Target"/> (a conversation partner, the player) when one is given. The look is held within what a
    /// real head does on a still body: at most <see cref="MaxYaw"/> round from the body's front and <see cref="MaxUp"/> /
    /// <see cref="MaxDown"/> up and down (the eyes take a gaze shift up to about 30° before the head joins; further round, a
    /// person turns the body, which the game does for a conversation). Humanoid look-at in the base layer's IK pass: the
    /// head mostly, the body a little, no clamp of Unity's own (the aim is already held in range).
    /// </summary>
    [RequireComponent(typeof(Animator))]
    public sealed class Gaze : MonoBehaviour
    {
        public Transform Target;
        public float HeadWeight = 0.9f;
        public float BodyWeight = 0.25f;
        public float MaxYaw = 20f, MaxUp = 10f, MaxDown = 14f;
        /// <summary>The most the head is let lean to one side (a clip's tilt beyond it is taken out), degrees.</summary>
        public float MaxRoll = 6f;
        /// <summary>The most the head is let turn on the chest (docs/PEOPLE_MOTION.md H2: the eyes take a look up to about
        /// 30° and the head joins beyond 25°; further round, the body turns). A clip's own turn beyond it (an idle that looks
        /// over its shoulder) is taken back to it, degrees.</summary>
        public float MaxNeckYaw = 26f;

        private Animator _animator;

        private Transform _head, _chest;
        private Quaternion _faceOff = Quaternion.identity, _chestOff = Quaternion.identity;

        private void Awake()
        {
            _animator = GetComponent<Animator>();
            // at rest the face and the chest look along the body's front: the bones' own axes against it
            _head = _animator != null && _animator.isHuman ? _animator.GetBoneTransform(HumanBodyBones.Head) : null;
            _chest = _animator != null && _animator.isHuman
                ? _animator.GetBoneTransform(HumanBodyBones.UpperChest) ?? _animator.GetBoneTransform(HumanBodyBones.Chest) ?? _animator.GetBoneTransform(HumanBodyBones.Spine)
                : null;
            if (_head != null) _faceOff = Quaternion.Inverse(_head.rotation) * transform.rotation;
            if (_chest != null) _chestOff = Quaternion.Inverse(_chest.rotation) * transform.rotation;
        }

        /// <summary>After the animation: a head turned on the chest beyond <see cref="MaxNeckYaw"/> is brought back to it
        /// (H2), and one leaning to one side beyond <see cref="MaxRoll"/> is brought upright to it (H3; look-at turns and
        /// nods the head, it does not level it).</summary>
        private void LateUpdate()
        {
            if (_head == null || !enabled) return;
            if (_chest != null)
            {
                var chest = _chest.rotation * _chestOff;
                var face = Quaternion.Inverse(chest) * (_head.rotation * _faceOff * Vector3.forward);
                var yaw = Mathf.Atan2(face.x, face.z) * Mathf.Rad2Deg;
                if (Mathf.Abs(yaw) > MaxNeckYaw)
                    _head.rotation = Quaternion.AngleAxis(-(yaw - Mathf.Sign(yaw) * MaxNeckYaw), chest * Vector3.up) * _head.rotation;
            }
            var q = _head.rotation * _faceOff;
            var right = q * Vector3.right;
            var roll = Mathf.Asin(Mathf.Clamp(Vector3.Dot(right, Vector3.up), -1f, 1f)) * Mathf.Rad2Deg;
            if (Mathf.Abs(roll) <= MaxRoll) return;
            var fix = roll - Mathf.Sign(roll) * MaxRoll;
            // (a turn about the face's forward by +a lifts its right side: lower it by the excess)
            _head.rotation = Quaternion.AngleAxis(-fix, q * Vector3.forward) * _head.rotation;
        }

        private void OnAnimatorIK(int layer)
        {
            if (layer != 0 || _animator == null) return;
            var head = _animator.GetBoneTransform(HumanBodyBones.Head);
            if (head == null) return;
            var front = transform.forward; front.y = 0f;
            front = front.sqrMagnitude > 1e-6f ? front.normalized : Vector3.forward;
            var to = Target != null ? Target.position - head.position : front;
            var flat = new Vector3(to.x, 0f, to.z);
            var yaw = flat.sqrMagnitude > 1e-6f ? Vector3.SignedAngle(front, flat, Vector3.up) : 0f;
            var pitch = Mathf.Atan2(to.y, Mathf.Max(flat.magnitude, 1e-4f)) * Mathf.Rad2Deg;
            yaw = Mathf.Clamp(yaw, -MaxYaw, MaxYaw);
            pitch = Mathf.Clamp(pitch, -MaxDown, MaxUp);
            var dir = Quaternion.AngleAxis(yaw, Vector3.up) * front;
            dir = dir * Mathf.Cos(pitch * Mathf.Deg2Rad) + Vector3.up * Mathf.Sin(pitch * Mathf.Deg2Rad);
            var reach = Target != null ? Mathf.Max(1.5f, to.magnitude) : 4f;
            _animator.SetLookAtWeight(1f, BodyWeight, HeadWeight, 1f, 0f);
            _animator.SetLookAtPosition(head.position + dir * reach);
        }
    }
}
