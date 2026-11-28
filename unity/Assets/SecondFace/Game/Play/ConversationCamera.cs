using Unity.Cinemachine;
using SecondFace.Game.World;
using UnityEngine;

namespace SecondFace.Game.Play
{
    /// <summary>
    /// The conversation view (CLAUDE.md §2 "Overhead, always", owner 2026-11-05: an overhead game like DOS2 and BG3's
    /// exploration). While two people talk the camera stays overhead: it eases (a 0.6 s blend) from the game view to a
    /// closer one over the two of them, at the game rig's own pitch range (<see cref="Pitch"/>), framing the pair in the
    /// part of the screen the conversation page leaves free (<see cref="Frame"/>: the left 54 %). It keeps the game view's
    /// turn when that shows the other's face; otherwise it turns the least it must to stand on the player's side of them.
    /// A wall or roof in the way turns it a little further round, then raises it. It never drops to eye level and never
    /// cuts between shots: every line keeps the one view. The world keeps running behind; <see cref="End"/> blends back.
    /// </summary>
    public sealed class ConversationCamera : MonoBehaviour, WorldOrigin.IRebase
    {
        /// <summary>The floating origin's rebase (§19.1): the conversation's framing moves with the world.</summary>
        public void OnRebase(Vector3 d) { Subject += d; _ph += d; _oh += d; _goalPos += d; }

        /// <summary>Kept for callers: every shot is the one overhead view.</summary>
        public enum Shot { TwoShot, Other, Player }

        /// <summary>Above the game camera's priority while the conversation lasts.</summary>
        public const int Priority = 50;
        public const float Blend = 0.6f;
        /// <summary>The view's pitch (inside the game rig's <see cref="OrbitRig.MinPitch"/>-<see cref="OrbitRig.MaxPitch"/>),
        /// its distance from the pair and its lens (the game camera's).</summary>
        public const float Pitch = 48f, Distance = 9f, FieldOfView = 28f;
        /// <summary>How far round from the line between them the camera may stand and still show the other's face.</summary>
        public const float FaceArc = 70f;

        /// <summary>The share of the screen's width to the left of the conversation page, where the people are framed.</summary>
        public float Frame = 0.54f;
        /// <summary>Where the pair's middle sits on the screen's height, 0 bottom to 1 top.</summary>
        public float Line = 0.5f;
        public Transform Player, Other;
        public Shot Current { get; private set; }
        public CinemachineCamera Virtual { get; private set; }
        /// <summary>The point the view frames (between the two heads, a little under them).</summary>
        public Vector3 Subject { get; private set; }
        /// <summary>The view's yaw and pitch, degrees.</summary>
        public float Yaw { get; private set; }
        public float ViewPitch { get; private set; }

        private Camera _camera;
        private float _startYaw;
        /// <summary>The distance this view stands off (more than <see cref="Distance"/> when the two stand far apart across it).</summary>
        public float ViewDistance { get; private set; } = Distance;
        private Vector3 _ph, _oh, _goalPos;
        private Quaternion _goalRot;
        private bool _easing;

        /// <summary>Starts the conversation view on a camera (a brain is added if it has none), from the yaw the game view
        /// has now. blend: seconds to blend in and out (0 cuts).</summary>
        public static ConversationCamera Begin(Camera camera, Transform player, Transform other, float blend = Blend)
        {
            var go = new GameObject("Conversation camera");
            var cc = go.AddComponent<ConversationCamera>();
            cc.Player = player;
            cc.Other = other;
            cc._camera = camera;
            cc._startYaw = camera != null ? camera.transform.eulerAngles.y : 0f;
            if (!camera.TryGetComponent<CinemachineBrain>(out var brain)) brain = camera.gameObject.AddComponent<CinemachineBrain>();
            brain.enabled = true;
            brain.DefaultBlend = blend > 0f
                ? new CinemachineBlendDefinition(CinemachineBlendDefinition.Styles.EaseInOut, blend)
                : new CinemachineBlendDefinition(CinemachineBlendDefinition.Styles.Cut, 0f);
            cc.Virtual = go.AddComponent<CinemachineCamera>();
            var lens = LensSettings.Default;
            lens.FieldOfView = FieldOfView; lens.NearClipPlane = 0.3f; lens.FarClipPlane = 3000f;
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

        /// <summary>Frames the pair again (every shot is the same overhead view; the name is kept for callers).</summary>
        public void Cut(Shot shot)
        {
            Current = shot;
            Physics.SyncTransforms();
            var ph = Head(Player);
            var oh = Head(Other);
            Subject = Vector3.Lerp(ph, oh, 0.5f) + Vector3.down * 0.35f;
            // the yaw: the game view's own if it sees the other's face (the camera on the player's side of them), else
            // the nearest that does
            var axis = oh - ph; axis.y = 0f;
            var along = axis.sqrMagnitude > 1e-4f ? Mathf.Atan2(axis.x, axis.z) * Mathf.Rad2Deg : _startYaw;
            var off = Mathf.DeltaAngle(along, _startYaw);
            var yaw = Mathf.Abs(off) <= FaceArc ? _startYaw : along + Mathf.Sign(off) * FaceArc;
            var tries = new[] { (yaw, Pitch), (yaw + 30f, Pitch), (yaw - 30f, Pitch), (yaw + 55f, Pitch), (yaw - 55f, Pitch), (yaw, OrbitRig.MaxPitch), (yaw, 70f) };
            var pick = tries[0];
            foreach (var t in tries)
            {
                ViewDistance = Fit(ph, oh, t.Item1);
                if (Clear(Place(t.Item1, t.Item2), Subject)) { pick = t; break; }
            }
            Yaw = pick.Item1; ViewPitch = pick.Item2;
            ViewDistance = Fit(ph, oh, Yaw);
            var pos = Place(Yaw, ViewPitch);
            var lens = Virtual.Lens;
            lens.FieldOfView = FieldOfView;
            Virtual.Lens = lens;
            _goalPos = pos; _goalRot = Aim(pos, Subject);
            if (!_easing) Virtual.transform.SetPositionAndRotation(_goalPos, _goalRot);
            _ph = ph; _oh = oh;
        }

        /// <summary>The distance that keeps both heads, with room round them, inside the free part of the screen (play-ch1 T45:
        /// at night the stranger stood half under the page): never nearer than <see cref="Distance"/>, never past 18 m.</summary>
        private float Fit(Vector3 ph, Vector3 oh, float yaw)
        {
            var right = Quaternion.Euler(0f, yaw, 0f) * Vector3.right;
            var across = Mathf.Abs(Vector3.Dot(oh - ph, right)) * 0.5f + 0.7f;   // half the pair across the view, and a shoulder's room
            var aspect = _camera != null && _camera.aspect > 0f ? _camera.aspect : 16f / 9f;
            var halfW = Mathf.Tan(FieldOfView * 0.5f * Mathf.Deg2Rad) * aspect * Frame;   // the free part's half width, per metre away
            var up = Mathf.Abs(oh.y - ph.y) * 0.5f + 0.9f;
            var halfH = Mathf.Tan(FieldOfView * 0.5f * Mathf.Deg2Rad) * 0.8f;
            return Mathf.Clamp(Mathf.Max(across / Mathf.Max(0.05f, halfW), up / halfH), Distance, 18f);
        }

        /// <summary>The pair moved (one still arriving, one turning to the other; play-ch1 T47: the view stayed on bare ground
        /// where they had been): the one view eases after them, its turn kept, never a cut.</summary>
        private void LateUpdate()
        {
            if (Virtual == null || Virtual.Priority < 0 || Player == null || Other == null) return;
            var ph = Head(Player); var oh = Head(Other);
            if ((ph - _ph).sqrMagnitude > 0.25f * 0.25f || (oh - _oh).sqrMagnitude > 0.25f * 0.25f)
            {
                _easing = true;
                Subject = Vector3.Lerp(ph, oh, 0.5f) + Vector3.down * 0.35f;
                ViewDistance = Fit(ph, oh, Yaw);
                var pos = Place(Yaw, ViewPitch);
                _goalPos = pos; _goalRot = Aim(pos, Subject);
                _ph = ph; _oh = oh;
            }
            if (!_easing) return;
            var k = 1f - Mathf.Exp(-Time.unscaledDeltaTime * 4f);
            var t = Virtual.transform;
            t.SetPositionAndRotation(Vector3.Lerp(t.position, _goalPos, k), Quaternion.Slerp(t.rotation, _goalRot, k));
            if ((t.position - _goalPos).sqrMagnitude < 1e-4f) { t.SetPositionAndRotation(_goalPos, _goalRot); _easing = false; }
        }

        private Vector3 Place(float yaw, float pitch) => Subject - Quaternion.Euler(pitch, yaw, 0f) * Vector3.forward * ViewDistance;

        /// <summary>A rotation that puts the subject at the middle of the free part of the screen, at <see cref="Line"/>.</summary>
        private Quaternion Aim(Vector3 from, Vector3 subject)
        {
            var aspect = _camera != null && _camera.aspect > 0f ? _camera.aspect : 16f / 9f;
            var halfH = Mathf.Atan(Mathf.Tan(FieldOfView * 0.5f * Mathf.Deg2Rad) * aspect);
            var ndc = Frame - 1f;   // the free part's centre, -1..1 across the screen
            var offset = Mathf.Atan(ndc * Mathf.Tan(halfH)) * Mathf.Rad2Deg;
            var down = Mathf.Atan((Line * 2f - 1f) * Mathf.Tan(FieldOfView * 0.5f * Mathf.Deg2Rad)) * Mathf.Rad2Deg;
            var look = Quaternion.LookRotation((subject - from).normalized, Vector3.up);
            return Quaternion.AngleAxis(-offset, Vector3.up) * look * Quaternion.Euler(down, 0f, 0f);
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
