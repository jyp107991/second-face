using UnityEngine;

namespace SecondFace.Game.People
{
    /// <summary>
    /// Hands at rest (P4.14, the owner's note: hands flat and spread). The captured clips carry no finger motion
    /// (tools/unity/motion/cmu2fbx.py drops the capture's single finger bone), and a Humanoid finger no clip drives keeps
    /// the mesh's own bind pose, MakeHuman's: straight and spread. After the animation each frame, every finger is curled
    /// towards the palm by a relaxed amount (more at the knuckle than the tip, the little finger most, the index least),
    /// about an axis found once from the bind pose (across the finger, in the palm's plane), so the curl follows the hand
    /// wherever the clip takes it. Fingers a clip does drive would be curled over; none do yet, and <see cref="Curl"/> at
    /// 0 leaves the clip's own.
    /// </summary>
    [RequireComponent(typeof(Animator))]
    public sealed class HandPose : MonoBehaviour
    {
        /// <summary>The curl's strength (1 relaxed; 0 the clip's own fingers).</summary>
        [Range(0f, 1f)] public float Curl = 1f;

        private struct Joint { public Transform Bone; public Quaternion Bind; public Vector3 Axis; public float Degrees; }
        private Joint[] _joints;
        public bool Ready => _joints != null && _joints.Length > 0;

        private static readonly (HumanBodyBones Prox, HumanBodyBones Mid, HumanBodyBones Tip, float Scale)[] LeftFingers =
        {
            (HumanBodyBones.LeftIndexProximal, HumanBodyBones.LeftIndexIntermediate, HumanBodyBones.LeftIndexDistal, 0.7f),
            (HumanBodyBones.LeftMiddleProximal, HumanBodyBones.LeftMiddleIntermediate, HumanBodyBones.LeftMiddleDistal, 0.9f),
            (HumanBodyBones.LeftRingProximal, HumanBodyBones.LeftRingIntermediate, HumanBodyBones.LeftRingDistal, 1.05f),
            (HumanBodyBones.LeftLittleProximal, HumanBodyBones.LeftLittleIntermediate, HumanBodyBones.LeftLittleDistal, 1.2f),
        };
        private static readonly (HumanBodyBones Prox, HumanBodyBones Mid, HumanBodyBones Tip, float Scale)[] RightFingers =
        {
            (HumanBodyBones.RightIndexProximal, HumanBodyBones.RightIndexIntermediate, HumanBodyBones.RightIndexDistal, 0.7f),
            (HumanBodyBones.RightMiddleProximal, HumanBodyBones.RightMiddleIntermediate, HumanBodyBones.RightMiddleDistal, 0.9f),
            (HumanBodyBones.RightRingProximal, HumanBodyBones.RightRingIntermediate, HumanBodyBones.RightRingDistal, 1.05f),
            (HumanBodyBones.RightLittleProximal, HumanBodyBones.RightLittleIntermediate, HumanBodyBones.RightLittleDistal, 1.2f),
        };

        /// <summary>The relaxed curl at the knuckle, the middle joint and the tip (degrees, before a finger's scale).</summary>
        public static readonly float[] Relaxed = { 22f, 28f, 14f };

        private void Awake() => Bind();

        /// <summary>Finds the fingers and their curl axes from the pose the rig is in now (the bind pose, before any clip).</summary>
        public void Bind()
        {
            var animator = GetComponent<Animator>();
            if (animator == null || animator.avatar == null || !animator.isHuman) { _joints = null; return; }
            var l = new System.Collections.Generic.List<Joint>();
            Hand(animator, LeftFingers, HumanBodyBones.LeftHand, HumanBodyBones.LeftThumbProximal, HumanBodyBones.LeftThumbDistal, l);
            Hand(animator, RightFingers, HumanBodyBones.RightHand, HumanBodyBones.RightThumbProximal, HumanBodyBones.RightThumbDistal, l);
            _joints = l.ToArray();
        }

        private static void Hand(Animator animator, (HumanBodyBones Prox, HumanBodyBones Mid, HumanBodyBones Tip, float Scale)[] fingers,
            HumanBodyBones handBone, HumanBodyBones thumbProx, HumanBodyBones thumbTip, System.Collections.Generic.List<Joint> into)
        {
            var hand = animator.GetBoneTransform(handBone);
            var index = animator.GetBoneTransform(fingers[0].Prox);
            var little = animator.GetBoneTransform(fingers[3].Prox);
            var middle = animator.GetBoneTransform(fingers[1].Prox);
            var middleMid = animator.GetBoneTransform(fingers[1].Mid);
            if (hand == null || index == null || little == null || middle == null || middleMid == null) return;
            // the palm's plane: across the knuckles and along the middle finger; its palm side is the side the thumb's
            // tip lies on (a thumb at rest sits forward of the fingers' plane)
            var across = (little.position - index.position).normalized;
            var along = (middleMid.position - middle.position).normalized;
            var normal = Vector3.Cross(across, along).normalized;
            var tp = animator.GetBoneTransform(thumbTip) ?? animator.GetBoneTransform(thumbProx);
            if (tp != null && Vector3.Dot(tp.position - middle.position, normal) < 0f) normal = -normal;
            foreach (var f in fingers)
            {
                var bones = new[] { animator.GetBoneTransform(f.Prox), animator.GetBoneTransform(f.Mid), animator.GetBoneTransform(f.Tip) };
                for (var k = 0; k < bones.Length; k++)
                {
                    var b = bones[k];
                    if (b == null) continue;
                    var next = k + 1 < bones.Length ? bones[k + 1] : null;
                    var dir = next != null ? (next.position - b.position).normalized : along;
                    // the curl turns the finger's direction towards the palm: about the axis across it in the palm's plane
                    var axis = Vector3.Cross(dir, normal).normalized;
                    if (axis.sqrMagnitude < 1e-6f) continue;
                    into.Add(new Joint { Bone = b, Bind = b.localRotation, Axis = Quaternion.Inverse(b.rotation) * axis, Degrees = Relaxed[k] * f.Scale });
                }
            }
            // the thumb: a little in towards the palm at its root
            var thumb = animator.GetBoneTransform(thumbProx);
            if (thumb != null)
            {
                var dir = (tp != null && tp != thumb ? tp.position - thumb.position : across).normalized;
                var axis = Vector3.Cross(dir, normal).normalized;
                if (axis.sqrMagnitude > 1e-6f) into.Add(new Joint { Bone = thumb, Bind = thumb.localRotation, Axis = Quaternion.Inverse(thumb.rotation) * axis, Degrees = 10f });
            }
        }

        private void LateUpdate()
        {
            if (_joints == null || Curl <= 0f) return;
            foreach (var j in _joints)
                if (j.Bone != null) j.Bone.localRotation = j.Bone.localRotation * Quaternion.AngleAxis(j.Degrees * Curl, j.Axis);
        }
    }
}
