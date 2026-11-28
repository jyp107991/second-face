using UnityEngine;

namespace SecondFace.Game.Fighting
{
    /// <summary>
    /// Turns the body back onto the fight clip's actor before any other system reads the pose (<see cref="CombatSet.ClipTurn"/>):
    /// after the Animator, before the standing foot plant (-20), the gaze (0), the hands (5), the arms' clearance (10) and the
    /// fighter itself (30), so each of them works on the pose as the actor stood it. Added by <see cref="Fighter.Bind"/>.
    /// </summary>
    [DefaultExecutionOrder(-30)]
    public sealed class ClipTurnFirst : MonoBehaviour
    {
        public Fighter Fighter;

        private void LateUpdate()
        {
            if (Fighter != null && Fighter.isActiveAndEnabled) Fighter.TurnOntoTheActor();
        }
    }
}
