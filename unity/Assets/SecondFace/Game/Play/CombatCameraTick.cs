using UnityEngine;

namespace SecondFace.Game.Play
{
    /// <summary>The fight camera's tick (<see cref="CombatCamera.Tick"/>: the rig's focus kept on the one followed) at 40, with the
    /// cameras after every people system: before the rig (41) and the conversation's camera (42), so the rig eases to the focus set
    /// in the same frame. A correction, 2026-11-28: the tick ran in Combat's LateUpdate at 0, in no set order with the rig.</summary>
    [DefaultExecutionOrder(40)]
    public sealed class CombatCameraTick : MonoBehaviour
    {
        public Combat Combat;

        private void LateUpdate() { if (Combat != null) Combat.TickCamera(); }
    }
}
