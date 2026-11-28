using SecondFace.Game.Fighting;
using UnityEngine;

namespace SecondFace.Game.People
{
    /// <summary>
    /// A sit turned back onto its actor's pose (docs/MOTION_ROOT_CAUSE.md §16). The base layer's sits (the controller's states
    /// tagged "sit": a chair, a stool, the ground) go through Unity's humanoid retarget as the fight's clips do, and on the
    /// Rocketbox bodies (3ds Max Biped: the thighs hang from the spine) and the sits' CMU actors (a hip joint bone between the
    /// pelvis and each thigh) the same human pose at a sit's hip bend of about 90° stands the pelvis turned and the thighs
    /// rolled from the actor's: the walker on a chair had a foot 0.32 m off the floor where the take keeps it at 0.05 m. The
    /// turn baked per sit and body skeleton (<see cref="CombatSet.Seats"/>, CombatAnimatorBuild.Seats, as the fight's:
    /// <see cref="CombatSet.ClipTurn"/>) is put on the hips and the thighs first in the frame (after the Animator, before the
    /// foot plant, the gaze, the hands and the arms' clearance), eased in and out by the crossfade into and out of the sit, and
    /// only as far as the fight's whole-body layer leaves the base. A compensating bake, not a cure: the import's re-parent of
    /// the Biped's thighs and clavicles (§16 (a)) takes it to nought on every clip, and then it goes.
    /// </summary>
    [DefaultExecutionOrder(-30)]
    public sealed class SeatTurn : MonoBehaviour
    {
        public const string Tag = "sit";
        /// <summary>The set the turns are in (the game's, <see cref="CombatViews.Set"/>, when not given).</summary>
        public CombatSet Set;

        /// <summary>What was put on the body this frame (tests read it): the hips' turn (degrees, and as a rotation in the
        /// root's frame), each thigh's, and the shift along the ground (world).</summary>
        public float TurnAngle { get; private set; }
        public Quaternion TurnRot { get; private set; } = Quaternion.identity;
        public Quaternion TurnThighL { get; private set; } = Quaternion.identity;
        public Quaternion TurnThighR { get; private set; } = Quaternion.identity;
        public Vector3 TurnShift { get; private set; }

        private Animator _a;
        private Transform _hips, _upL, _upR;
        private string _skel;
        private int _full = -2;

        private void Awake() => Bind();

        /// <summary>Finds the bones again (after a body is dressed or rebuilt).</summary>
        public void Bind()
        {
            _a = GetComponent<Animator>();
            _skel = null; _full = -2;
            if (_a == null || !_a.isHuman) { _hips = _upL = _upR = null; return; }
            _hips = _a.GetBoneTransform(HumanBodyBones.Hips);
            _upL = _a.GetBoneTransform(HumanBodyBones.LeftUpperLeg);
            _upR = _a.GetBoneTransform(HumanBodyBones.RightUpperLeg);
        }

        private void LateUpdate() => Turn();

        public void Turn()
        {
            TurnAngle = 0f; TurnShift = Vector3.zero; TurnRot = TurnThighL = TurnThighR = Quaternion.identity;
            if (_a == null || !_a.enabled || _hips == null || _a.runtimeAnimatorController == null) return;
            var cur = _a.GetCurrentAnimatorStateInfo(0);
            var crossing = _a.IsInTransition(0);
            var next = crossing ? _a.GetNextAnimatorStateInfo(0) : default;
            if (!cur.IsTag(Tag) && !(crossing && next.IsTag(Tag))) return;
            var set = Set != null ? Set : CombatViews.Set;
            if (set == null || set.Seats == null || set.Seats.Length == 0) return;
            _skel ??= CombatSet.SkeletonKey(_a);
            if (_skel == null) return;
            Of(set, cur, out var hips, out var tl, out var tr, out var shift);
            if (crossing)
            {
                Of(set, next, out var hn, out var ln, out var rn, out var sn);
                var k = Mathf.Clamp01(_a.GetAnimatorTransitionInfo(0).normalizedTime);
                hips = Quaternion.Slerp(hips, hn, k); tl = Quaternion.Slerp(tl, ln, k); tr = Quaternion.Slerp(tr, rn, k); shift = Vector3.Lerp(shift, sn, k);
            }
            // (only what the fight's whole-body layer leaves of the base)
            if (_full == -2) _full = _a.GetLayerIndex(SecondFace.Core.Combat.CombatMotion.FullLayer);
            var w = _full >= 0 ? 1f - Mathf.Clamp01(_a.GetLayerWeight(_full)) : 1f;
            if (w <= 0.001f) return;
            hips = Quaternion.Slerp(Quaternion.identity, hips, w); tl = Quaternion.Slerp(Quaternion.identity, tl, w); tr = Quaternion.Slerp(Quaternion.identity, tr, w); shift *= w;
            var root = _a.transform;
            var rr = root.rotation; var ir = Quaternion.Inverse(rr);
            // (the hips first, every bone under them with it; then each thigh about its own joint)
            _hips.rotation = rr * hips * ir * _hips.rotation;
            if (_upL != null) _upL.rotation = rr * tl * ir * _upL.rotation;
            if (_upR != null) _upR.rotation = rr * tr * ir * _upR.rotation;
            var move = root.TransformVector(shift);
            _hips.position += move;
            TurnAngle = Quaternion.Angle(Quaternion.identity, hips); TurnShift = move; TurnRot = hips; TurnThighL = tl; TurnThighR = tr;
        }

        private void Of(CombatSet set, AnimatorStateInfo info, out Quaternion hips, out Quaternion thighL, out Quaternion thighR, out Vector3 shift)
        {
            hips = thighL = thighR = Quaternion.identity; shift = Vector3.zero;
            if (!info.IsTag(Tag)) return;
            var t = info.loop ? info.normalizedTime - Mathf.Floor(info.normalizedTime) : Mathf.Clamp01(info.normalizedTime);
            set.SeatTurnOf(info.shortNameHash, _skel, t, out hips, out thighL, out thighR, out shift);
        }
    }
}
