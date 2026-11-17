using SecondFace.Core.Combat;
using UnityEngine;

namespace SecondFace.Game.Play
{
    /// <summary>
    /// The fight's camera (COMBAT.md A9; DESIGN_UNITY §2 "combat framing"; CLAUDE.md "Overhead, always"): the game's own
    /// overhead rig (<see cref="OrbitRig"/>), never another camera, never a cut and never below its pitch. It follows the
    /// one acting (eased to them as their turn begins, kept on them as they walk), frames the shooter and the target for a
    /// shot (eased to the middle of the two and out as far as both need, within the rig's distance), and eases back to the
    /// one acting after. The pace divides every ease (the settings' combat speed); with skip on, the other side's actions
    /// are not framed. A tap on a portrait looks at that fighter until the next action. The player's own pinch, orbit and
    /// pan stay theirs throughout.
    /// </summary>
    public sealed class CombatCamera
    {
        public const float BaseFocusSeconds = 0.45f, Margin = 2.5f;

        private readonly OrbitRig _rig;
        private Transform _follow;
        private float _restDistance;
        private bool _framing;

        public CombatPace Pace = CombatPace.Normal;

        public CombatCamera(OrbitRig rig)
        {
            _rig = rig;
            if (_rig != null) _restDistance = _rig.DistanceGoal;
        }

        /// <summary>Whom the camera follows now (null: the walker, as out of a fight).</summary>
        public Transform Following => _follow;
        /// <summary>The camera is easing over a shot (the two in frame).</summary>
        public bool Framing => _framing;

        private void Ease() { if (_rig != null) _rig.FocusSeconds = BaseFocusSeconds / Mathf.Max(0.1f, Pace.Speed); }

        /// <summary>Follows a fighter (their turn has come): eased to them, then kept on them as they move. Not when it is
        /// the other side's and the pace skips their show, nor for one the player's side cannot see.</summary>
        public void Follow(Transform body, bool theirs, bool visible = true)
        {
            if (_rig == null || body == null) return;
            if (!Pace.Frames(theirs) || !visible) return;
            Ease();
            _follow = body;
            _framing = false;
            _rig.FocusOn(body.position);
        }

        /// <summary>Looks at a fighter for a while (a tap on their portrait): until the next action or turn moves it on.</summary>
        public void Look(Transform body)
        {
            if (_rig == null || body == null) return;
            Ease();
            _follow = body;
            _rig.FocusOn(body.position);
        }

        /// <summary>Frames a shot: the middle of the shooter and the target, out as far as both need (never in closer than
        /// the player had it), eased.</summary>
        public void Frame(Vector3 shooter, Vector3 target, bool theirs)
        {
            if (_rig == null || !Pace.Frames(theirs)) return;
            Ease();
            if (!_framing) _restDistance = _rig.DistanceGoal;
            _framing = true;
            var mid = (shooter + target) * 0.5f;
            var flat = target - shooter; flat.y = 0f;
            var half = Mathf.Tan(_rig.FieldOfView * 0.5f * Mathf.Deg2Rad);
            var need = (flat.magnitude * 0.5f + Margin) / Mathf.Max(0.05f, half) * 0.8f;
            _rig.FocusOn(mid, Mathf.Max(_restDistance, need));
        }

        /// <summary>The shot is over: back to the one followed, at the player's own distance.</summary>
        public void Release()
        {
            if (_rig == null) return;
            if (_framing) _rig.EaseDistance(_restDistance);
            _framing = false;
            if (_follow != null) _rig.FocusOn(_follow.position);
        }

        /// <summary>Keeps the focus on the one followed as they move (every frame of a fight).</summary>
        public void Tick()
        {
            if (_rig == null || _framing || _follow == null) return;
            _rig.FocusOn(_follow.position);
        }

        /// <summary>The fight is over: back to the walker and the player's distance, eased.</summary>
        public void End()
        {
            if (_rig == null) return;
            if (_framing) _rig.EaseDistance(_restDistance);
            _framing = false;
            _follow = null;
            _rig.ClearFocus();
        }
    }
}
