using UnityEngine;

namespace SecondFace.Game.People
{
    /// <summary>
    /// Where a person looks (BUILD_PLAN P4.8): the captured idles carry their subjects' own gaze (the common idle holds the
    /// face 16° up, at the capture studio's ceiling), so the head is drawn level ahead, or toward <see cref="Target"/> (a
    /// conversation partner, the player) when one is given. Humanoid look-at in the base layer's IK pass: the head mostly,
    /// the body a little, clamped so a target behind the shoulder is not stared at over it.
    /// </summary>
    [RequireComponent(typeof(Animator))]
    public sealed class Gaze : MonoBehaviour
    {
        public Transform Target;
        public float HeadWeight = 0.75f;
        public float BodyWeight = 0.05f;
        public float Clamp = 0.6f;

        private Animator _animator;

        private void Awake() => _animator = GetComponent<Animator>();

        private void OnAnimatorIK(int layer)
        {
            if (layer != 0 || _animator == null) return;
            var head = _animator.GetBoneTransform(HumanBodyBones.Head);
            if (head == null) return;
            var at = Target != null ? Target.position : head.position + Vector3.up * 0.08f + transform.forward * 4f;   // level, ahead
            _animator.SetLookAtWeight(1f, BodyWeight, HeadWeight, 1f, Clamp);
            _animator.SetLookAtPosition(at);
        }
    }
}
