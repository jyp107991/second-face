using System.Collections.Generic;
using UnityEngine;

namespace SecondFace.Game.UI
{
    /// <summary>What the HUD shows (P5.3b): where and when, the tracked quest's next objective, the party's health and
    /// the objective's bearing on the compass. The game fills it from its state (Core quests, sheets, the clock); tests
    /// from fixtures.</summary>
    public sealed class HudState
    {
        /// <summary>The place's name (empty in the open).</summary>
        public string Place;
        public int Day = 1;
        /// <summary>The time of day as shown, "14:20".</summary>
        public string Clock = "";
        /// <summary>The tracked quest's title and its next objective (null: nothing pressing).</summary>
        public string Quest, Objective;
        public List<HudMember> Party = new();
        /// <summary>The objective's bearing from the leader, degrees clockwise from north (null: none to point at).</summary>
        public float? Bearing;
    }

    public sealed class HudMember
    {
        public string Name;
        public int Hp, MaxHp;
        /// <summary>The portrait (People.Portraits); null shows the name's initial.</summary>
        public Texture Portrait;
        public bool Leader;

        public float Health => MaxHp > 0 ? Mathf.Clamp01(Hp / (float)MaxHp) : 0f;
    }
}
