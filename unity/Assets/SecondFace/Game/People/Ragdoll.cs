using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AI;

namespace SecondFace.Game.People
{
    /// <summary>
    /// A person's ragdoll (BUILD_PLAN P4 step 5): built on the first fall from the Humanoid avatar's bones (eleven
    /// bodies: hips, spine, chest, head, upper and lower arms and legs; ~70 kg shared like a body's; character joints with
    /// limits a body allows), so the many who never fall carry no physics. <see cref="Fall"/> hands the body to physics
    /// with a push (death, a heavy hit, a blast); <see cref="StandUp"/> puts the person back under their hips, facing
    /// where the hips face, and blends from the lying pose to the animation. No get-up clip yet (none captured): the blend
    /// is the bridge.
    /// </summary>
    [RequireComponent(typeof(Animator))]
    public sealed class Ragdoll : MonoBehaviour
    {
        public float Mass = 70f;
        public float BlendSeconds = 0.7f;

        private sealed class Part
        {
            public HumanBodyBones Bone;
            public Transform T;
            public Rigidbody Body;
            public Collider Collider;
        }

        private Animator _animator;
        private readonly List<Part> _parts = new();
        private bool _built;
        private readonly List<(Transform t, Vector3 p, Quaternion r)> _snapshot = new();
        private float _blendT = -1f;

        public bool Fallen { get; private set; }
        public bool Blending => _blendT >= 0f;
        /// <summary>The ragdoll's hips (null until it is built).</summary>
        public Rigidbody Hips => _parts.Count > 0 ? _parts[0].Body : null;
        public IReadOnlyList<Rigidbody> Bodies { get { var l = new List<Rigidbody>(); foreach (var p in _parts) l.Add(p.Body); return l; } }

        private void Awake() => _animator = GetComponent<Animator>();

        /// <summary>Gives the body to physics, pushed by <paramref name="impulse"/> (N·s) at a point (the nearest part takes it).</summary>
        public void Fall(Vector3 impulse, Vector3 at)
        {
            Build();
            if (_parts.Count == 0) return;
            _blendT = -1f;
            Fallen = true;
            Others(false);
            _animator.enabled = false;
            foreach (var r in GetComponentsInChildren<SkinnedMeshRenderer>()) r.updateWhenOffscreen = true;   // bounds follow the body
            Part nearest = null; var best = float.MaxValue;
            foreach (var p in _parts)
            {
                p.Body.isKinematic = false;
                p.Body.linearVelocity = Vector3.zero; p.Body.angularVelocity = Vector3.zero;
                p.Collider.enabled = true;
                var d = (p.T.position - at).sqrMagnitude;
                if (d < best) { best = d; nearest = p; }
            }
            nearest?.Body.AddForceAtPosition(impulse, at, ForceMode.Impulse);
        }

        /// <summary>Back on their feet: under the hips, facing their way, the lying pose blended into the animation.</summary>
        public void StandUp()
        {
            if (!Fallen) return;
            var hips = _parts[0].T;
            // where to stand: the ground under the hips; which way: the hips' forward flattened (face up or down)
            var at = hips.position;
            if (Physics.Raycast(at + Vector3.up, Vector3.down, out var hit, 4f, Physics.DefaultRaycastLayers, QueryTriggerInteraction.Ignore)) at = hit.point;
            else at.y = transform.position.y;
            var forward = Vector3.ProjectOnPlane(hips.forward, Vector3.up);
            if (forward.sqrMagnitude < 1e-4f) forward = Vector3.ProjectOnPlane(-hips.up, Vector3.up);
            _snapshot.Clear();
            foreach (var t in hips.GetComponentsInChildren<Transform>()) _snapshot.Add((t, t.position, t.rotation));
            foreach (var p in _parts) { p.Body.isKinematic = true; p.Collider.enabled = false; }
            transform.SetPositionAndRotation(at, Quaternion.LookRotation(forward.normalized, Vector3.up));
            _animator.enabled = true;
            _animator.Rebind();
            _animator.Update(0f);
            foreach (var r in GetComponentsInChildren<SkinnedMeshRenderer>()) r.updateWhenOffscreen = false;
            Fallen = false;
            _blendT = 0f;
        }

        private void LateUpdate()
        {
            if (_blendT < 0f) return;
            _blendT += Time.deltaTime;
            var w = Mathf.Clamp01(_blendT / Mathf.Max(0.01f, BlendSeconds));
            w = w * w * (3f - 2f * w);
            // from the lying pose (world) to what the animator just wrote
            foreach (var (t, p, r) in _snapshot)
            {
                if (t == null) continue;
                t.SetPositionAndRotation(Vector3.Lerp(p, t.position, w), Quaternion.Slerp(r, t.rotation, w));
            }
            if (w >= 1f) { _blendT = -1f; Others(true); }
        }

        /// <summary>The navigation agent, the walker, the foot planting and the gestures stop while the body falls.</summary>
        private void Others(bool on)
        {
            foreach (var b in GetComponentsInParent<MonoBehaviour>())
                if (b != this && (b is FootPlant || b is Ambient || b.GetType().Name == "Walker")) b.enabled = on;
            var agent = GetComponentInParent<NavMeshAgent>();
            if (agent != null)
            {
                if (!on && agent.enabled && agent.isOnNavMesh) agent.ResetPath();
                agent.enabled = on;
            }
        }

        // ------------------------------------------------------------------------------------------------------------
        // the build: bodies, colliders and joints on the Humanoid bones
        // ------------------------------------------------------------------------------------------------------------
        /// <summary>The parts: bone, the bone its collider reaches to, its share of the mass, its radius (m).</summary>
        private static readonly (HumanBodyBones bone, HumanBodyBones child, float share, float radius)[] Layout =
        {
            (HumanBodyBones.Hips, HumanBodyBones.Spine, 0.16f, 0.13f),
            (HumanBodyBones.Spine, HumanBodyBones.Chest, 0.12f, 0.12f),
            (HumanBodyBones.Chest, HumanBodyBones.Neck, 0.14f, 0.14f),
            (HumanBodyBones.Head, HumanBodyBones.LastBone, 0.08f, 0.1f),
            (HumanBodyBones.LeftUpperArm, HumanBodyBones.LeftLowerArm, 0.03f, 0.05f),
            (HumanBodyBones.LeftLowerArm, HumanBodyBones.LeftHand, 0.025f, 0.045f),
            (HumanBodyBones.RightUpperArm, HumanBodyBones.RightLowerArm, 0.03f, 0.05f),
            (HumanBodyBones.RightLowerArm, HumanBodyBones.RightHand, 0.025f, 0.045f),
            (HumanBodyBones.LeftUpperLeg, HumanBodyBones.LeftLowerLeg, 0.1f, 0.075f),
            (HumanBodyBones.LeftLowerLeg, HumanBodyBones.LeftFoot, 0.07f, 0.055f),
            (HumanBodyBones.RightUpperLeg, HumanBodyBones.RightLowerLeg, 0.1f, 0.075f),
            (HumanBodyBones.RightLowerLeg, HumanBodyBones.RightFoot, 0.07f, 0.055f),
        };

        /// <summary>Twist (low, high) and swing (1, 2) limits by bone, degrees.</summary>
        private static (float lo, float hi, float s1, float s2) Limits(HumanBodyBones b) => b switch
        {
            HumanBodyBones.Spine or HumanBodyBones.Chest => (-20f, 20f, 20f, 10f),
            HumanBodyBones.Head => (-40f, 25f, 30f, 20f),
            HumanBodyBones.LeftUpperArm or HumanBodyBones.RightUpperArm => (-70f, 10f, 60f, 30f),
            HumanBodyBones.LeftLowerArm or HumanBodyBones.RightLowerArm => (-90f, 0f, 5f, 5f),
            HumanBodyBones.LeftUpperLeg or HumanBodyBones.RightUpperLeg => (-20f, 70f, 30f, 20f),
            HumanBodyBones.LeftLowerLeg or HumanBodyBones.RightLowerLeg => (-80f, 0f, 5f, 5f),
            _ => (-20f, 20f, 20f, 20f),
        };

        private void Build()
        {
            if (_built) return;
            _built = true;
            if (_animator == null || !_animator.isHuman) return;
            var shares = 0f;
            foreach (var l in Layout) shares += l.share;
            foreach (var (bone, child, share, radius) in Layout)
            {
                var t = _animator.GetBoneTransform(bone);
                if (t == null) continue;
                var body = t.gameObject.AddComponent<Rigidbody>();
                body.mass = Mass * share / shares;
                body.isKinematic = true;
                body.interpolation = RigidbodyInterpolation.Interpolate;
                body.collisionDetectionMode = CollisionDetectionMode.ContinuousSpeculative;
                var c = Collider(t, bone, child, radius);
                c.enabled = false;
                _parts.Add(new Part { Bone = bone, T = t, Body = body, Collider = c });
            }
            // each part hangs from the nearest part above it in the skeleton (an avatar without a chest bone joins the
            // arms and head to the spine)
            foreach (var part in _parts)
            {
                if (part.Bone == HumanBodyBones.Hips) continue;
                Rigidbody up = null;
                for (var a = part.T.parent; a != null && up == null; a = a.parent)
                    foreach (var q in _parts) if (q.T == a) { up = q.Body; break; }
                if (up == null) continue;
                var child = HumanBodyBones.LastBone;
                foreach (var l in Layout) if (l.bone == part.Bone) child = l.child;
                var j = part.T.gameObject.AddComponent<CharacterJoint>();
                j.connectedBody = up;
                j.enablePreprocessing = false;
                var along = Along(part.T, child);
                j.axis = along;
                var swing = Vector3.Cross(along, part.T.InverseTransformDirection(transform.right));
                if (swing.sqrMagnitude < 1e-3f) swing = Vector3.Cross(along, part.T.InverseTransformDirection(transform.forward));
                j.swingAxis = swing.normalized;
                var (lo, hi, s1, s2) = Limits(part.Bone);
                j.lowTwistLimit = new SoftJointLimit { limit = lo };
                j.highTwistLimit = new SoftJointLimit { limit = hi };
                j.swing1Limit = new SoftJointLimit { limit = s1 };
                j.swing2Limit = new SoftJointLimit { limit = s2 };
            }
        }

        /// <summary>The bone's direction to its child in its own space (down the limb), or its local up for the ends.</summary>
        private Vector3 Along(Transform t, HumanBodyBones child)
        {
            var c = child != HumanBodyBones.LastBone ? _animator.GetBoneTransform(child) : null;
            if (c == null) return t.InverseTransformDirection(Vector3.up).normalized;
            return t.InverseTransformPoint(c.position).normalized;
        }

        private Collider Collider(Transform t, HumanBodyBones bone, HumanBodyBones child, float radius)
        {
            var scale = Mathf.Max(1e-4f, t.lossyScale.x);
            if (bone == HumanBodyBones.Head)
            {
                var s = t.gameObject.AddComponent<SphereCollider>();
                s.radius = radius / scale;
                s.center = t.InverseTransformDirection(Vector3.up) * (0.08f / scale);
                return s;
            }
            var c = child != HumanBodyBones.LastBone ? _animator.GetBoneTransform(child) : null;
            var local = c != null ? t.InverseTransformPoint(c.position) : Vector3.up * (0.2f / scale);
            var cap = t.gameObject.AddComponent<CapsuleCollider>();
            var axis = Mathf.Abs(local.x) > Mathf.Abs(local.y) ? (Mathf.Abs(local.x) > Mathf.Abs(local.z) ? 0 : 2) : (Mathf.Abs(local.y) > Mathf.Abs(local.z) ? 1 : 2);
            cap.direction = axis;
            cap.radius = radius / scale;
            cap.height = Mathf.Max(local.magnitude, cap.radius * 2f);
            cap.center = local * 0.5f;
            return cap;
        }
    }
}
