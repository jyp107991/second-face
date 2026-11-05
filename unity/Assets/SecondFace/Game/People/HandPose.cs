using UnityEngine;

namespace SecondFace.Game.People
{
    /// <summary>
    /// Hands at rest (P4.14, the owner's note: hands flat and spread; docs/PEOPLE_MOTION.md A5: half-curled, never flat,
    /// never a claw or a fist). The captured clips carry no finger motion, so a Humanoid finger keeps whatever its avatar's
    /// neutral is: MakeHuman's straight and spread, Rocketbox's already bent. After the animation each frame, every finger
    /// joint is brought to a relaxed bend of its own (<see cref="Relaxed"/>, more at the middle joint than the knuckle and
    /// the tip, the little finger most, the index least), measured as the bend between the bone before and the bone after
    /// it in the finger's own plane (about an axis found once from the bind pose: across the finger, in the palm's plane).
    /// It sets the bend, it does not add to it, so a neutral already bent is not curled over into a claw.
    /// <see cref="Curl"/> at 0 leaves the fingers as they are.
    /// </summary>
    [RequireComponent(typeof(Animator))]
    public sealed class HandPose : MonoBehaviour
    {
        /// <summary>The curl's strength (1 relaxed; 0 the clip's own fingers).</summary>
        [Range(0f, 1f)] public float Curl = 1f;

        private struct Joint { public Transform Bone, Parent, Next; public Vector3 Axis; public float Degrees; public bool Thumb; }
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
        public static readonly float[] Relaxed = { 26f, 34f, 16f };

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
                    var parent = k == 0 ? hand : bones[k - 1];
                    var next = k + 1 < bones.Length ? bones[k + 1] : (b.childCount > 0 ? b.GetChild(0) : null);
                    var dir = next != null ? (next.position - b.position).normalized : along;
                    // the curl turns the finger's direction towards the palm: about the axis across it in the palm's plane
                    var axis = Vector3.Cross(dir, normal).normalized;
                    if (axis.sqrMagnitude < 1e-6f || parent == null) continue;
                    into.Add(new Joint { Bone = b, Parent = parent, Next = next, Axis = Quaternion.Inverse(b.rotation) * axis, Degrees = Relaxed[k] * f.Scale });
                }
            }
            // the thumb: a little in towards the palm at its root
            var thumb = animator.GetBoneTransform(thumbProx);
            if (thumb != null)
            {
                var dir = (tp != null && tp != thumb ? tp.position - thumb.position : across).normalized;
                var axis = Vector3.Cross(dir, normal).normalized;
                if (axis.sqrMagnitude > 1e-6f) into.Add(new Joint { Bone = thumb, Axis = Quaternion.Inverse(thumb.rotation) * axis, Degrees = 10f, Thumb = true });
            }
        }

        private Transform _armL, _armR, _wristL, _wristR, _idxL, _idxR, _midL, _midR, _litL, _litR, _tipL, _tipR;

        /// <summary>The forearm's roll that keeps a relaxed palm from facing forward (docs/PEOPLE_MOTION.md A6: retargeted
        /// clips turn some swinging hands palm-up, a waiter's carry): when the palm faces within <see cref="PalmFront"/>° of
        /// the body's front, the forearm is rolled about its own line towards the body's side, at most <see cref="MaxRoll"/>°.</summary>
        public float PalmFront = 60f, MaxRoll = 80f;

        private void Palms()
        {
            var a = GetComponent<Animator>();
            if (a == null || !a.isHuman) return;
            if (_armL == null)
            {
                _armL = a.GetBoneTransform(HumanBodyBones.LeftLowerArm); _armR = a.GetBoneTransform(HumanBodyBones.RightLowerArm);
                _wristL = a.GetBoneTransform(HumanBodyBones.LeftHand); _wristR = a.GetBoneTransform(HumanBodyBones.RightHand);
                _idxL = a.GetBoneTransform(HumanBodyBones.LeftIndexProximal); _idxR = a.GetBoneTransform(HumanBodyBones.RightIndexProximal);
                _midL = a.GetBoneTransform(HumanBodyBones.LeftMiddleProximal); _midR = a.GetBoneTransform(HumanBodyBones.RightMiddleProximal);
                _litL = a.GetBoneTransform(HumanBodyBones.LeftLittleProximal); _litR = a.GetBoneTransform(HumanBodyBones.RightLittleProximal);
                _tipL = a.GetBoneTransform(HumanBodyBones.LeftMiddleDistal); _tipR = a.GetBoneTransform(HumanBodyBones.RightMiddleDistal);
            }
            var fwd = transform.forward; fwd.y = 0f; fwd.Normalize();
            Roll(_armL, _wristL, _idxL, _midL, _litL, _tipL, fwd, transform.right);
            Roll(_armR, _wristR, _idxR, _midR, _litR, _tipR, fwd, -transform.right);
        }

        private void Roll(Transform arm, Transform wrist, Transform index, Transform middle, Transform little, Transform tip, Vector3 fwd, Vector3 inward)
        {
            if (arm == null || wrist == null || index == null || middle == null || little == null) return;
            var n = Vector3.Cross((little.position - index.position).normalized, (middle.position - wrist.position).normalized).normalized;
            var probe = tip != null ? tip.position : middle.position + n;
            if (Vector3.Dot(probe - middle.position, n) < 0f) n = -n;
            var facing = Vector3.Angle(n, fwd);
            if (facing >= PalmFront) return;
            var axis = (wrist.position - arm.position).normalized;
            var from = Vector3.ProjectOnPlane(n, axis); var to = Vector3.ProjectOnPlane(inward, axis);
            if (from.sqrMagnitude < 1e-6f || to.sqrMagnitude < 1e-6f) return;
            var turn = Mathf.Clamp(Vector3.SignedAngle(from, to, axis), -MaxRoll, MaxRoll) * Mathf.InverseLerp(PalmFront, PalmFront - 30f, facing);
            arm.rotation = Quaternion.AngleAxis(turn, axis) * arm.rotation;
        }

        private void LateUpdate()
        {
            Palms();
            if (_joints == null || Curl <= 0f) return;
            foreach (var j in _joints)
            {
                if (j.Bone == null) continue;
                if (j.Thumb || j.Parent == null || j.Next == null)
                {
                    // the thumb (and a tip with nothing beyond it to measure): a little in, as before
                    if (j.Thumb) j.Bone.localRotation = j.Bone.localRotation * Quaternion.AngleAxis(j.Degrees * Curl, j.Axis);
                    continue;
                }
                // the bend now, in the finger's plane: from the bone before's line to this bone's, about the curl axis
                var axis = j.Bone.rotation * j.Axis;
                var before = Vector3.ProjectOnPlane(j.Bone.position - j.Parent.position, axis);
                var after = Vector3.ProjectOnPlane(j.Next.position - j.Bone.position, axis);
                if (before.sqrMagnitude < 1e-10f || after.sqrMagnitude < 1e-10f) continue;
                var now = Vector3.SignedAngle(before, after, axis);
                var turn = Mathf.Clamp((j.Degrees - now) * Curl, -60f, 60f);
                j.Bone.rotation = Quaternion.AngleAxis(turn, axis) * j.Bone.rotation;
            }
        }
    }
}
