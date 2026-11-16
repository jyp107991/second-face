using System;
using SecondFace.Core.State;

namespace SecondFace.Core.Dialogue
{
    /// <summary>
    /// How someone greets the player the next time (BUILD_PLAN P9 U7, "greetings from state"): a conversation whose opening
    /// was said in an earlier talk does not say it again; the speaker greets by what has happened since: how long since
    /// the last talk, the hour, and how they stand with the player (trust, affection; wary when they fear or distrust
    /// them). Short, plain frontier speech, the same line for the same person on the same day and hour. A tree can give its
    /// own (`again` on the opening node) and that wins.
    /// </summary>
    public static class Greetings
    {
        /// <summary>The flag that remembers when the player last talked with someone (game minutes).</summary>
        public static string LastTalk(string npc) => $"talk.{npc}";

        private static readonly string[] Soon = { "Back already?", "Forget something?", "You again. What is it?" };
        private static readonly string[] Wary = { "What do you want now?", "Make it quick.", "You. What is it?" };
        private static readonly string[] Warm = { "There you are.", "Good to see you.", "Come here. Sit a minute." };
        private static readonly string[] Night = { "It's late. What is it?", "Keep your voice down. What?", "Can't sleep either?" };
        private static readonly string[] Morning = { "Morning.", "You're up early.", "Morning. What do you need?" };
        private static readonly string[] Evening = { "Evening.", "Evening. What is it?", "Long day. Go on." };
        private static readonly string[] Day = { "Well?", "What is it?", "Go on, then." };

        /// <summary>The greeting for someone the player has talked with before (null when they have not).</summary>
        public static string For(GameState g, string npc)
        {
            if (g == null || string.IsNullOrEmpty(npc)) return null;
            var last = g.Flag(LastTalk(npc)) is double d ? d : -1;
            if (last < 0) return null;
            var since = g.Minutes - last;
            var hour = (int)(g.Minutes % 1440 / 60);
            var r = g.World.RelationWith(npc);
            string[] set =
                since >= 0 && since < 90 ? Soon
                : r.Trust <= -30 ? Wary
                : r.Trust >= 40 || r.Affection >= 40 ? Warm
                : hour >= 22 || hour < 5 ? Night
                : hour < 11 ? Morning
                : hour >= 17 ? Evening
                : Day;
            var pick = Hash($"{npc}.{(int)(g.Minutes / 1440)}.{hour}") % (uint)set.Length;
            return set[pick];
        }

        /// <summary>Remembers this talk (called as a conversation opens).</summary>
        public static void Talked(GameState g, string npc)
        {
            if (g != null && !string.IsNullOrEmpty(npc)) g.SetFlag(LastTalk(npc), g.Minutes);
        }

        private static uint Hash(string s)
        {
            unchecked
            {
                uint h = 2166136261;
                foreach (var c in s) { h ^= c; h *= 16777619; }
                return h;
            }
        }
    }
}
