using Unity.Cinemachine;
using UnityEngine;

namespace SecondFace.Game.Play
{
    /// <summary>
    /// The conversation cameras (P5.3e, BUILD_PLAN §6.F.3, DESIGN_UNITY §2): while two people talk the camera leaves the
    /// game view (a 0.6 s blend) for shots worked out from where they stand, never authored per line: an over-the-shoulder
    /// two-shot from behind the player, a close insert on the other, and the reverse on the player. Cuts between shots
    /// are instant. Every shot frames its subject in the part of the screen the conversation page leaves free
    /// (<see cref="Frame"/>: the left 54 %), at eye height, and keeps a clear line to them (a wall in the way moves the
    /// shot to the other shoulder, then up). The world keeps running behind; <see cref="End"/> blends back.
    /// </summary>
    public sealed class ConversationCamera : MonoBehaviour
    {
        public enum Shot { TwoShot, Other, Player }

        /// <summary>Above the game camera's priority while the conversation lasts.</summary>
        public const int Priority = 50;
        public const float Blend = 0.6f;

        /// <summary>The share of the screen's width to the left of the conversation page, where the people are framed.</summary>
        public float Frame = 0.54f;
        public Transform Player, Other;
        public Shot Current { get; private set; }
        public CinemachineCamera Virtual { get; private set; }
        /// <summary>The point the current shot frames (a head).</summary>
        public Vector3 Subject { get; private set; }

        private Camera _camera;

        /// <summary>Starts the conversation shots on a camera (a brain is added if it has none). blend: seconds to blend in
        /// and out (0 cuts).</summary>
        public static ConversationCamera Begin(Camera camera, Transform player, Transform other, float blend = Blend)
        {
            var go = new GameObject("Conversation camera");
            var cc = go.AddComponent<ConversationCamera>();
            cc.Player = player;
            cc.Other = other;
            cc._camera = camera;
            if (!camera.TryGetComponent<CinemachineBrain>(out var brain)) brain = camera.gameObject.AddComponent<CinemachineBrain>();
            brain.enabled = true;
            brain.DefaultBlend = blend > 0f
                ? new CinemachineBlendDefinition(CinemachineBlendDefinition.Styles.EaseInOut, blend)
                : new CinemachineBlendDefinition(CinemachineBlendDefinition.Styles.Cut, 0f);
            cc.Virtual = go.AddComponent<CinemachineCamera>();
            var lens = LensSettings.Default;
            lens.FieldOfView = 30f; lens.NearClipPlane = 0.1f; lens.FarClipPlane = 3000f;
            cc.Virtual.Lens = lens;
            cc.Virtual.Priority = Priority;
            cc.Cut(Shot.TwoShot);
            return cc;
        }

        /// <summary>The head of a person (the humanoid head bone, else 1.6 m up).</summary>
        public static Vector3 Head(Transform person)
        {
            if (person == null) return Vector3.zero;
            var a = person.GetComponentInChildren<Animator>();
            if (a != null && a.isHuman)
            {
                var h = a.GetBoneTransform(HumanBodyBones.Head);
                if (h != null) return h.position + Vector3.up * 0.06f;
            }
            return person.position + Vector3.up * 1.6f;
        }

        /// <summary>Cuts to a shot.</summary>
        public void Cut(Shot shot)
        {
            Current = shot;
            Physics.SyncTransforms();   // a cut is rare; what moved this frame must be where the line checks look
            var ph = Head(Player);
            var oh = Head(Other);
            var axis = oh - ph;
            axis.y = 0f;
            var d = axis.sqrMagnitude > 1e-4f ? axis.normalized : (Player != null ? Player.forward : Vector3.forward);
            var right = Vector3.Cross(Vector3.up, d);
            float fov;
            Vector3 look;
            Vector3[] tries;
            switch (shot)
            {
                case Shot.Other:
                    look = oh; fov = 24f;
                    tries = new[] { oh - d * 1.5f + right * 0.35f + Vector3.up * 0.06f, oh - d * 1.5f - right * 0.35f + Vector3.up * 0.06f, oh - d * 1.3f + Vector3.up * 0.5f };
                    break;
                case Shot.Player:
                    look = ph; fov = 24f;
                    tries = new[] { ph + d * 1.5f - right * 0.35f + Vector3.up * 0.06f, ph + d * 1.5f + right * 0.35f + Vector3.up * 0.06f, ph + d * 1.3f + Vector3.up * 0.5f };
                    break;
                default:
                    look = Vector3.Lerp(ph, oh, 0.65f); fov = 32f;
                    tries = new[] { ph - d * 1.3f + right * 0.6f + Vector3.up * 0.12f, ph - d * 1.3f - right * 0.6f + Vector3.up * 0.12f, ph - d * 1.6f + Vector3.up * 0.9f };
                    break;
            }
            var pos = tries[0];
            foreach (var t in tries)
                if (Clear(t, look)) { pos = t; break; }
            Subject = shot == Shot.TwoShot ? oh : look;
            var lens = Virtual.Lens;
            lens.FieldOfView = fov;
            Virtual.Lens = lens;
            Virtual.transform.SetPositionAndRotation(pos, Aim(pos, Subject, fov));
        }

        /// <summary>Where the subject's eyes sit on the screen's height, 0 bottom to 1 top (the upper third, a little below).</summary>
        public float EyeLine = 0.62f;

        /// <summary>A rotation that puts the subject at the middle of the free part of the screen, its eyes on
        /// <see cref="EyeLine"/>.</summary>
        private Quaternion Aim(Vector3 from, Vector3 subject, float fov)
        {
            var aspect = _camera != null && _camera.aspect > 0f ? _camera.aspect : 16f / 9f;
            var halfH = Mathf.Atan(Mathf.Tan(fov * 0.5f * Mathf.Deg2Rad) * aspect);
            var ndc = Frame - 1f;   // the free part's centre, -1..1 across the screen (Frame/2 * 2 - 1)
            var offset = Mathf.Atan(ndc * Mathf.Tan(halfH)) * Mathf.Rad2Deg;
            var down = Mathf.Atan((EyeLine * 2f - 1f) * Mathf.Tan(fov * 0.5f * Mathf.Deg2Rad)) * Mathf.Rad2Deg;
            var to = subject - from;
            return Quaternion.AngleAxis(-offset, Vector3.up) * Quaternion.LookRotation(to.normalized, Vector3.up) * Quaternion.Euler(down, 0f, 0f);
        }

        /// <summary>No solid thing but the two people stands between a camera spot and the subject.</summary>
        private bool Clear(Vector3 from, Vector3 to)
        {
            var hits = Physics.RaycastAll(from, (to - from).normalized, Vector3.Distance(from, to) - 0.25f, ~0, QueryTriggerInteraction.Ignore);
            foreach (var h in hits)
            {
                var t = h.collider.transform;
                if ((Player != null && t.IsChildOf(Player)) || (Other != null && t.IsChildOf(Other))) continue;
                return false;
            }
            foreach (var c in Physics.OverlapSphere(from, 0.15f, ~0, QueryTriggerInteraction.Ignore))
            {
                var t = c.transform;
                if ((Player != null && t.IsChildOf(Player)) || (Other != null && t.IsChildOf(Other))) continue;
                return false;   // the spot itself is inside something
            }
            return true;
        }

        /// <summary>Back to the game camera (blended), then gone.</summary>
        public void End()
        {
            if (Virtual != null) Virtual.Priority = -1;
            Destroy(gameObject, Blend + 0.1f);
        }
    }
}
