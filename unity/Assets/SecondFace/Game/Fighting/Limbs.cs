using SecondFace.Core.Combat;
using UnityEngine;

namespace SecondFace.Game.Fighting
{
    /// <summary>An analytic two-bone solve (a shoulder, an elbow and a hand; a hip, a knee and a foot): the elbow kept in the
    /// plane its own pose bends in (the clip's), the chain's end on the target exactly when it is in reach, the bones' twist
    /// as it was (each turned by the least rotation).</summary>
    public static class TwoBone
    {
        /// <summary>Puts <paramref name="end"/> at <paramref name="target"/> by turning <paramref name="upper"/> and
        /// <paramref name="lower"/>, blended from the pose by <paramref name="weight"/>; <paramref name="pole"/>: a point the
        /// middle joint bends towards (null: the way it bends now).</summary>
        public static void Solve(Transform upper, Transform lower, Transform end, Vector3 target, float weight, Vector3? pole = null)
        {
            if (upper == null || lower == null || end == null || weight <= 1e-4f) return;
            var a = upper.position; var b = lower.position; var c = end.position;
            var lab = (b - a).magnitude; var lbc = (c - b).magnitude;
            if (lab < 1e-5f || lbc < 1e-5f) return;
            var to = target - a;
            var dist = Mathf.Clamp(to.magnitude, Mathf.Abs(lab - lbc) + 1e-4f, lab + lbc - 1e-4f);
            var dir = to.sqrMagnitude > 1e-10f ? to.normalized : (c - a).normalized;
            var cosA = Mathf.Clamp((lab * lab + dist * dist - lbc * lbc) / (2f * lab * dist), -1f, 1f);
            var along = lab * cosA;
            var height = lab * Mathf.Sqrt(Mathf.Max(0f, 1f - cosA * cosA));
            var bend = Vector3.ProjectOnPlane((pole ?? b) - a, dir);
            if (bend.sqrMagnitude < 1e-8f) bend = Vector3.ProjectOnPlane(b - a, dir);
            if (bend.sqrMagnitude < 1e-8f) bend = Vector3.ProjectOnPlane(Vector3.down, dir);
            var elbow = a + dir * along + bend.normalized * height;
            var u0 = upper.rotation; var l0 = lower.rotation;
            upper.rotation = Quaternion.FromToRotation(b - a, elbow - a) * u0;
            var nb = lower.position; var nc = end.position;
            lower.rotation = Quaternion.FromToRotation(nc - nb, (a + dir * dist) - nb) * lower.rotation;
            if (weight < 0.9999f)
            {
                upper.rotation = Quaternion.Slerp(u0, upper.rotation, weight);
                lower.rotation = Quaternion.Slerp(l0, lower.rotation, weight);
            }
        }
    }

    /// <summary>
    /// One hand as a hold sees it (COMBAT.md A1): its palm's centre and frame (across the knuckles from the little finger to
    /// the index, and out of the palm) in the hand bone's own space, found from the knuckles' places (which a finger's bend
    /// does not move), and its fingers' joints for closing them round a grip. A weapon is held by matching the palm's frame to
    /// the grip's (Core <see cref="CombatMotion.Grip"/>), its centre on the grip's point.
    /// </summary>
    public sealed class Hand
    {
        private struct Joint { public Transform Bone, Parent, Next; public Vector3 Axis; public int Finger, Knuckle; }

        public readonly bool Left;
        public Transform Bone { get; private set; }
        public Transform Upper { get; private set; }
        public Transform Lower { get; private set; }
        /// <summary>The palm's centre (where a handle's axis lies in a closed hand), in the hand bone's space.</summary>
        public Vector3 Centre { get; private set; }
        /// <summary>The palm's frame in the hand bone's space: forward across the knuckles (little to index), up out of the palm.</summary>
        public Quaternion Frame { get; private set; } = Quaternion.identity;
        /// <summary>The hand's length (wrist to the middle finger's knuckle), m in world units at the bind.</summary>
        public float Length { get; private set; } = 0.09f;
        /// <summary>The arm's length (shoulder to the palm's centre), m.</summary>
        public float Reach { get; private set; } = 0.6f;
        private Joint[] _joints;
        private Transform _thumb;
        private Vector3 _thumbAxis;
        public bool Ready => Bone != null && Upper != null && Lower != null;

        public Hand(Animator a, bool left)
        {
            Left = left;
            Bone = a.GetBoneTransform(left ? HumanBodyBones.LeftHand : HumanBodyBones.RightHand);
            Upper = a.GetBoneTransform(left ? HumanBodyBones.LeftUpperArm : HumanBodyBones.RightUpperArm);
            Lower = a.GetBoneTransform(left ? HumanBodyBones.LeftLowerArm : HumanBodyBones.RightLowerArm);
            if (!Ready) return;
            HumanBodyBones B(string name) => (HumanBodyBones)System.Enum.Parse(typeof(HumanBodyBones), (left ? "Left" : "Right") + name);
            var index = a.GetBoneTransform(B("IndexProximal"));
            var middle = a.GetBoneTransform(B("MiddleProximal"));
            var little = a.GetBoneTransform(B("LittleProximal")) ?? a.GetBoneTransform(B("RingProximal"));
            var thumbTip = a.GetBoneTransform(B("ThumbDistal")) ?? a.GetBoneTransform(B("ThumbIntermediate"));
            var scale = Mathf.Max(1e-4f, Bone.lossyScale.x);
            Vector3 across, along, normal;
            var wrist = Bone.position;
            if (index != null && middle != null && little != null)
            {
                across = (index.position - little.position).normalized;
                along = (middle.position - wrist).normalized;
                Length = (middle.position - wrist).magnitude;
            }
            else
            {
                // (a hand without fingers: along the forearm, across its own right)
                along = (wrist - Lower.position).normalized;
                across = Vector3.Cross(along, Bone.up).normalized;
                Length = 0.09f * Bone.lossyScale.y;
            }
            normal = Vector3.Cross(across, along).normalized;
            // the palm's side is the side the thumb's tip lies on (a thumb sits forward of the fingers' plane)
            var knuckles = middle != null ? middle.position : wrist + along * Length;
            if (thumbTip != null && Vector3.Dot(thumbTip.position - knuckles, normal) < 0f) normal = -normal;
            across = Vector3.ProjectOnPlane(across, normal).normalized;
            // the handle's axis in a closed hand: halfway from the wrist to the knuckles, a hand's thickness and a handle's
            // radius into the palm (a palm is ~3 cm thick at the metacarpals; handles 3-4 cm across)
            var centre = wrist + along * (Length * 0.55f) + normal * (Length * 0.33f);
            Centre = Bone.InverseTransformPoint(centre);
            Frame = Quaternion.Inverse(Bone.rotation) * Quaternion.LookRotation(across, normal);
            Reach = (Lower.position - Upper.position).magnitude + (wrist - Lower.position).magnitude + Length * 0.55f;
            // the fingers' joints, each turned about the axis across it in the palm's plane (as HandPose finds them)
            var l = new System.Collections.Generic.List<Joint>();
            var names = new[] { "Index", "Middle", "Ring", "Little" };
            for (var f = 0; f < names.Length; f++)
            {
                var bones = new[] { a.GetBoneTransform(B(names[f] + "Proximal")), a.GetBoneTransform(B(names[f] + "Intermediate")), a.GetBoneTransform(B(names[f] + "Distal")) };
                for (var k = 0; k < 3; k++)
                {
                    var bn = bones[k];
                    if (bn == null) continue;
                    var parent = k == 0 ? Bone : bones[k - 1];
                    var next = k + 1 < 3 ? bones[k + 1] : (bn.childCount > 0 ? bn.GetChild(0) : null);
                    if (parent == null || next == null) continue;
                    var dir = (next.position - bn.position).normalized;
                    var axis = Vector3.Cross(dir, normal).normalized;
                    if (axis.sqrMagnitude < 1e-6f) continue;
                    l.Add(new Joint { Bone = bn, Parent = parent, Next = next, Axis = Quaternion.Inverse(bn.rotation) * axis, Finger = f, Knuckle = k });
                }
            }
            _joints = l.ToArray();
            _thumb = a.GetBoneTransform(B("ThumbProximal"));
            if (_thumb != null && thumbTip != null && thumbTip != _thumb)
            {
                var axis = Vector3.Cross((thumbTip.position - _thumb.position).normalized, normal).normalized;
                if (axis.sqrMagnitude > 1e-6f) _thumbAxis = Quaternion.Inverse(_thumb.rotation) * axis;
            }
            _ = scale;
        }

        /// <summary>The palm's centre in the world now.</summary>
        public Vector3 CentreNow => Bone.TransformPoint(Centre);
        /// <summary>The palm's frame in the world now.</summary>
        public Quaternion FrameNow => Bone.rotation * Frame;

        /// <summary>A palm frame wanted in the world (forward across the knuckles, up out of the palm), as the hand bone's
        /// rotation and position that put the palm's centre at <paramref name="centre"/>.</summary>
        public (Vector3 Position, Quaternion Rotation) BoneFor(Vector3 centre, Quaternion palm)
        {
            var rot = palm * Quaternion.Inverse(Frame);
            var pos = centre - rot * Vector3.Scale(Centre, Bone.lossyScale);
            return (pos, rot);
        }

        /// <summary>The palm's frame for a grip on a weapon whose frame is <paramref name="weapon"/>.</summary>
        public static Quaternion PalmOn(Quaternion weapon, CombatMotion.Grip g) =>
            weapon * Quaternion.LookRotation(V(g.Across), V(g.Palm));

        public static Vector3 V((double X, double Y, double Z) v) => new((float)v.X, (float)v.Y, (float)v.Z);

        /// <summary>Puts the hand's palm on a frame and a centre by the arm (blended by <paramref name="weight"/>), the elbow
        /// bending as the pose has it, or towards <paramref name="pole"/>.</summary>
        public void Reach_(Vector3 centre, Quaternion palm, float weight, Vector3? pole = null)
        {
            if (!Ready || weight <= 1e-4f) return;
            var (pos, rot) = BoneFor(centre, palm);
            TwoBone.Solve(Upper, Lower, Bone, pos, weight, pole);
            Bone.rotation = Quaternion.Slerp(Bone.rotation, rot, weight);
        }

        /// <summary>Closes the fingers round a grip (sets each joint's bend, blended from the pose's by
        /// <paramref name="weight"/>).</summary>
        public void Close(CombatMotion.Grip g, float weight)
        {
            if (_joints == null || weight <= 1e-4f) return;
            foreach (var j in _joints)
            {
                if (j.Bone == null) continue;
                float want = j.Knuckle == 0 ? (float)g.Knuckle : j.Knuckle == 1 ? (float)g.Middle : (float)g.Tip;
                // (the index: its own knuckle, the rest of it in step)
                if (j.Finger == 0) want *= (float)(g.Index / System.Math.Max(1.0, g.Knuckle));
                var axis = j.Bone.rotation * j.Axis;
                var before = Vector3.ProjectOnPlane(j.Bone.position - j.Parent.position, axis);
                var after = Vector3.ProjectOnPlane(j.Next.position - j.Bone.position, axis);
                if (before.sqrMagnitude < 1e-10f || after.sqrMagnitude < 1e-10f) continue;
                var now = Vector3.SignedAngle(before, after, axis);
                var turn = Mathf.Clamp(want - now, -120f, 120f) * weight;
                j.Bone.rotation = Quaternion.AngleAxis(turn, axis) * j.Bone.rotation;
            }
            if (_thumb != null && _thumbAxis.sqrMagnitude > 0.5f)
                _thumb.localRotation = _thumb.localRotation * Quaternion.AngleAxis((float)g.Thumb * 0.5f * weight, _thumbAxis);
        }
    }
}
