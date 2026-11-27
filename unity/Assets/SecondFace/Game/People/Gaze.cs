using UnityEngine;

namespace SecondFace.Game.People
{
    /// <summary>
    /// Where a person looks (BUILD_PLAN P4.8; docs/PEOPLE_MOTION.md H1-H3). The captured idles carry their subjects' own
    /// gaze (the common idle holds the face 16° up, at the capture studio's ceiling), so the head is drawn level ahead, or
    /// towards <see cref="Target"/> (a conversation partner, the player) when one is given. The look is held within what a
    /// real head does on a still body: at most <see cref="MaxYaw"/> round from the body's front and <see cref="MaxUp"/> /
    /// <see cref="MaxDown"/> up and down (the eyes take a gaze shift up to about 30° before the head joins; further round, a
    /// person turns the body, which the game does for a conversation). The head turns at its own joint after the animation
    /// (<see cref="Look"/>), the neck and the shoulders as the clip has them; Unity's look-at in the base layer's IK pass
    /// turns only the eyes, and the trunk not at all (<see cref="BodyWeight"/>).
    /// </summary>
    [RequireComponent(typeof(Animator))]
    public sealed class Gaze : MonoBehaviour
    {
        public Transform Target;
        public float HeadWeight = 0.9f;
        /// <summary>How much of a look the trunk takes (Unity's look-at body weight): none. A standing person's torso takes no
        /// part in a gaze shift under 45° (Sidenmark &amp; Gellersen 2019, 7,600 gaze shifts of 20 people, ACM TOCHI 27(1):4; eyes
        /// and head do it, Cinelli, Patla &amp; Stuart 2007), and every look here is held within <see cref="MaxYaw"/>. At 0.25 the
        /// look-at turned the upper chest 7.4-7.6° on the pelvis for a 20° look (and 5° for one straight ahead, drawing the
        /// idle's raised face level), carrying a broad man's hanging arm across his belly (A1 21.7, 2026-11-18).</summary>
        public float BodyWeight = 0f;
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
            if (_head == null) return;
            // (in the avatar's neutral pose, every muscle at nought: Unity's human reference, by which the gate measures the
            // face (MotionProbe), not the pose the model was saved in: levelled by the saved head's axes, Female_Adult_01's
            // face stood 15.3-16.1° under the horizon in every idle, H1, 2026-11-26)
            if (_animator.avatar == null || !_animator.avatar.isHuman)
            {
                _faceOff = Quaternion.Inverse(_head.rotation) * transform.rotation;
                if (_chest != null) _chestOff = Quaternion.Inverse(_chest.rotation) * transform.rotation;
                return;
            }
            // (read with the person stood at the world's origin, square to its axes, and every bone put back as it was after:
            // Unity's GetHumanPose gives the body in the world and SetHumanPose places it from the person's own root, so the
            // round trip on someone standing away from the origin put their hips that far off again (a townsperson in Shale,
            // 16 km from the origin, had their pelvis 16 km away and 40 m up; the body's mesh hangs from the pelvis, so it was
            // never in view and, culled, never animated: ArmsStayOutOfTheBody read their arms "moving" past the skin's range),
            // and on someone turned from the world's axes it read the face's front off by that turn (137° and 180° turns read
            // it 110° and 154° off, 2026-11-27, docs/MOTION_ROOT_CAUSE.md §17))
            var bones = GetComponentsInChildren<Transform>(true);
            var at = new Vector3[bones.Length]; var turn = new Quaternion[bones.Length];
            for (var i = 0; i < bones.Length; i++) { at[i] = bones[i].localPosition; turn[i] = bones[i].localRotation; }
            transform.GetPositionAndRotation(out var where, out var facing);
            transform.SetPositionAndRotation(Vector3.zero, Quaternion.identity);
            var hp = new HumanPoseHandler(_animator.avatar, transform);
            var pose = new HumanPose();
            hp.GetHumanPose(ref pose);
            for (var i = 0; i < pose.muscles.Length; i++) pose.muscles[i] = 0f;
            hp.SetHumanPose(ref pose);
            _faceOff = Quaternion.Inverse(_head.rotation);
            if (_chest != null) _chestOff = Quaternion.Inverse(_chest.rotation);
            hp.Dispose();
            transform.SetPositionAndRotation(where, facing);
            for (var i = 0; i < bones.Length; i++) if (bones[i] != transform) { bones[i].localPosition = at[i]; bones[i].localRotation = turn[i]; }
        }

        /// <summary>After the animation: a head turned on the chest beyond <see cref="MaxNeckYaw"/> is brought back to it
        /// (H2), and one leaning to one side beyond <see cref="MaxRoll"/> is brought upright to it (H3; look-at turns and
        /// nods the head, it does not level it).</summary>
        private void LateUpdate()
        {
            if (_head == null || !enabled) return;
            Look();
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

        /// <summary>Where the face is to look from <paramref name="from"/>: towards <see cref="Target"/>, or level ahead, held
        /// within <see cref="MaxYaw"/> of the body's front and <see cref="MaxUp"/> / <see cref="MaxDown"/>.</summary>
        private Vector3 Aim(Vector3 from, out float reach)
        {
            var front = transform.forward; front.y = 0f;
            front = front.sqrMagnitude > 1e-6f ? front.normalized : Vector3.forward;
            var to = Target != null ? Target.position - from : front;
            var flat = new Vector3(to.x, 0f, to.z);
            var yaw = flat.sqrMagnitude > 1e-6f ? Vector3.SignedAngle(front, flat, Vector3.up) : 0f;
            var pitch = Mathf.Atan2(to.y, Mathf.Max(flat.magnitude, 1e-4f)) * Mathf.Rad2Deg;
            yaw = Mathf.Clamp(yaw, -MaxYaw, MaxYaw);
            pitch = Mathf.Clamp(pitch, -MaxDown, MaxUp);
            var dir = Quaternion.AngleAxis(yaw, Vector3.up) * front;
            reach = Target != null ? Mathf.Max(1.5f, to.magnitude) : 4f;
            return dir * Mathf.Cos(pitch * Mathf.Deg2Rad) + Vector3.up * Mathf.Sin(pitch * Mathf.Deg2Rad);
        }

        /// <summary>
        /// The head turned towards <see cref="Aim"/> at its own joint, by <see cref="HeadWeight"/> of the way: round the
        /// vertical, then up or down about the face's level right. The neck is left as the clip has it: on the Rocketbox
        /// (3ds Max Biped) skeleton both clavicles hang from the neck, so Unity's look-at, which gives the neck a share of the
        /// head's turn, carried both shoulders round on a still chest (the line between the shoulders 7.1° -> 16.4° for a look
        /// held at 20°, the chest unmoved; the right arm swung back behind the flank and was turned out 5°: A1 18.2 -> 22.8 on
        /// cap_Police_Male_01n and cap_Security_Male_01n, 2026-11-26). A real head's axial turn is made mostly at C1-C2, and
        /// the shoulders ride on the thorax, not on the cervical spine.
        /// </summary>
        private void Look()
        {
            var dir = Aim(_head.position, out _);
            var face = _head.rotation * _faceOff * Vector3.forward;
            var fFlat = new Vector3(face.x, 0f, face.z); var dFlat = new Vector3(dir.x, 0f, dir.z);
            if (fFlat.sqrMagnitude > 1e-6f && dFlat.sqrMagnitude > 1e-6f)
                _head.rotation = Quaternion.AngleAxis(Vector3.SignedAngle(fFlat, dFlat, Vector3.up) * HeadWeight, Vector3.up) * _head.rotation;
            face = _head.rotation * _faceOff * Vector3.forward;
            var right = Vector3.Cross(Vector3.up, face);
            if (right.sqrMagnitude < 1e-6f) return;
            var up = Mathf.Asin(Mathf.Clamp(dir.y, -1f, 1f)) - Mathf.Asin(Mathf.Clamp(face.y, -1f, 1f));
            // (a turn about the face's right by +a tips it down: up by -a)
            _head.rotation = Quaternion.AngleAxis(-up * Mathf.Rad2Deg * HeadWeight, right.normalized) * _head.rotation;
        }

        private void OnAnimatorIK(int layer)
        {
            if (layer != 0 || _animator == null) return;
            var head = _animator.GetBoneTransform(HumanBodyBones.Head);
            if (head == null) return;
            var dir = Aim(head.position, out var reach);
            // (the eyes only, and the trunk by BodyWeight: the head is turned in LateUpdate, Look)
            _animator.SetLookAtWeight(1f, BodyWeight, 0f, 1f, 0f);
            _animator.SetLookAtPosition(head.position + dir * reach);
        }
    }
}
