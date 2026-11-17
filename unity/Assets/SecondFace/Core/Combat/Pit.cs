using System;
using Newtonsoft.Json.Linq;
using SecondFace.Core.State;
using SecondFace.Core.Stats;
using SecondFace.Core.World;

namespace SecondFace.Core.Combat
{
    /// <summary>What a pit bout pays (the content's <c>fight</c> event with <c>{ pit: { win, lose } }</c>): the effects of a
    /// win and of a loss.</summary>
    public sealed class PitTerms
    {
        public JArray Win, Lose;

        /// <summary>The event's data as a bout's terms (null when it is a real fight: no <c>pit</c>).</summary>
        public static PitTerms From(JToken data)
        {
            if (!(data is JObject o) || !(o["pit"] is JObject pit)) return null;
            return new PitTerms { Win = pit["win"] as JArray ?? new JArray(), Lose = pit["lose"] as JArray ?? new JArray() };
        }
    }

    /// <summary>
    /// A pit bout (port of the web game's pit: its encounter's <c>pit</c> option and the game's <c>pitBout</c>): the
    /// player and one other, fists and blades only (<see cref="Battle.Pit"/>), nobody dies. When it ends both get back up,
    /// the one who went down at three tenths of their health; the other is nobody's enemy after; the stake pays through
    /// the outcome's effects (Core <see cref="Logic"/>). A bout called off (a truce, a flight) pays nothing.
    /// </summary>
    public static class Pit
    {
        /// <summary>The share of their health a fighter who went down gets back up with.</summary>
        public const double StandUpShare = 0.3;

        /// <summary>Back on their feet after going down: three tenths of their health, at least one (a fighter still up
        /// keeps what they have).</summary>
        public static void StandUp(CharacterSheet s)
        {
            if (s == null || s.Hp > 0) return;
            s.Hp = Math.Max(1, (int)Math.Round(Sheet.Derived(s).MaxHp * StandUpShare));
        }

        /// <summary>The bout is over (<paramref name="outcome"/> as the battle has it: victory, defeat, fled, truce): both
        /// fighters stand, the opponent's save keeps their health and is not hostile (nor dead), and the win's or the
        /// loss's effects run. Returns "won", "lost" or "called".</summary>
        public static string Settle(GameState g, CharacterSheet opponent, string opponentId, string outcome, PitTerms terms, ILogicHost host = null)
        {
            StandUp(g.Pc.Sheet);
            StandUp(opponent);
            if (!string.IsNullOrEmpty(opponentId))
            {
                if (!g.Npcs.TryGetValue(opponentId, out var save)) g.Npcs[opponentId] = save = new NpcSave();
                save.Hostile = false;
                save.Dead = null;
                if (opponent != null) save.Hp = opponent.Hp;
            }
            var result = outcome == "victory" ? "won" : outcome == "defeat" ? "lost" : "called";
            if (terms != null && result != "called") Logic.Apply(result == "won" ? terms.Win : terms.Lose, g, host);
            return result;
        }
    }
}
