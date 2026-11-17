using System;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;
using SecondFace.Core.Npc;
using SecondFace.Core.State;

namespace SecondFace.Core.World
{
    /// <summary>A prize played for instead of Tolls (the content's <c>dust</c> event's <c>prize</c>): what it is called, and
    /// the effects of a win and of a loss.</summary>
    public sealed class DustPrize
    {
        public string Label;
        public JArray Win, Lose;
    }

    /// <summary>What a game of Dust is played for: a stake in Tolls from each side, or a prize.</summary>
    public sealed class DustTerms
    {
        public int Stake = 5;
        public DustPrize Prize;

        /// <summary>The event's data, <c>{ stake?, prize?: { label, win, lose } }</c> (a stake of 5 when none is named).</summary>
        public static DustTerms From(JToken data)
        {
            var o = data as JObject;
            var t = new DustTerms();
            var stake = o?["stake"];
            if (stake != null && stake.Type != JTokenType.Null) t.Stake = Math.Max(0, (int)Math.Round(stake.Value<double>()));
            if (o?["prize"] is JObject p)
                t.Prize = new DustPrize { Label = (string)p["label"] ?? "", Win = p["win"] as JArray ?? new JArray(), Lose = p["lose"] as JArray ?? new JArray() };
            return t;
        }
    }

    public sealed class DustPlayer
    {
        public string Name;
        public int Score;
        /// <summary>The opponent banks when their run reaches this.</summary>
        public int Nerve;
    }

    /// <summary>One thing that happened at the table, for the screen to say in its own words: "stake" (both put in),
    /// "dusted" (a 1: the run lost), "bank" (a run kept), "level" (a tie past the target: another round), "pot" (the
    /// game decided).</summary>
    public sealed class DustLine
    {
        public string Kind;
        /// <summary>0 the player, 1 the opponent.</summary>
        public int Who;
        /// <summary>The run lost or banked; the stake or the pot.</summary>
        public int Value;
        /// <summary>Their score after it.</summary>
        public int Score;
    }

    /// <summary>A game of Dust as it stands.</summary>
    public sealed class DustGame
    {
        public DustPlayer[] Players;
        /// <summary>0: the player's turn; 1: the opponent's.</summary>
        public int Turn;
        /// <summary>The run on the table this turn.</summary>
        public int Run;
        /// <summary>The faces rolled this turn.</summary>
        public List<int> Rolls = new();
        public int Target;
        public int Stake;
        public int Round = 1;
        /// <summary>Set when the game is decided (0 the player, 1 the opponent).</summary>
        public int? Winner;
        public List<DustLine> Log = new();
        public bool Over => Winner != null;
    }

    /// <summary>
    /// Dust, the frontier's dice game (DESIGN §2f; port of minigames/dust.ts and the table's money in ui/dust.ts). On a
    /// turn a six-sided die is rolled as often as wanted, the faces added to a run; a 1 "dusts" the run (lost, and the
    /// turn with it). Banking keeps the run. First past the target at the end of a round takes the pot (a tie goes
    /// another round). Push your luck with a readable edge: the opponent's nerve comes from their courage. The dice are
    /// the game's own <see cref="Rng"/>. Played for Tolls (each side antes the stake, the winner takes both) or for a
    /// prize (its win or loss effects run through Core <see cref="Logic"/>); every game counts in the flags
    /// <c>dust_games</c> and <c>dust_wins</c>.
    /// </summary>
    public static class Dust
    {
        public const int Target = 30;

        public static DustGame New(string you, string them, int theirNerve, int stake, int target = Target)
        {
            var s = new DustGame
            {
                Players = new[] { new DustPlayer { Name = you, Nerve = 0 }, new DustPlayer { Name = them, Nerve = theirNerve } },
                Target = target, Stake = stake,
            };
            s.Log.Add(new DustLine { Kind = "stake", Who = 1, Value = stake });
            return s;
        }

        /// <summary>Rolls once: a 1 dusts the run and ends the turn. Returns the face (0 when the game is over).</summary>
        public static int Roll(DustGame s, Rng rng)
        {
            if (s.Over) return 0;
            var face = rng.Int(1, 6);
            s.Rolls.Add(face);
            if (face == 1)
            {
                s.Log.Add(new DustLine { Kind = "dusted", Who = s.Turn, Value = s.Run, Score = s.Players[s.Turn].Score });
                s.Run = 0;
                EndTurn(s);
            }
            else s.Run += face;
            return face;
        }

        /// <summary>Banks the run and passes the turn.</summary>
        public static void Bank(DustGame s)
        {
            if (s.Over) return;
            var p = s.Players[s.Turn];
            p.Score += s.Run;
            s.Log.Add(new DustLine { Kind = "bank", Who = s.Turn, Value = s.Run, Score = p.Score });
            s.Run = 0;
            EndTurn(s);
        }

        private static void EndTurn(DustGame s)
        {
            s.Rolls.Clear();
            if (s.Turn == 1)
            {
                // the end of a round: has anyone crossed the target?
                var a = s.Players[0];
                var b = s.Players[1];
                if (a.Score >= s.Target || b.Score >= s.Target)
                {
                    if (a.Score != b.Score)
                    {
                        s.Winner = a.Score > b.Score ? 0 : 1;
                        s.Log.Add(new DustLine { Kind = "pot", Who = s.Winner.Value, Value = s.Stake * 2, Score = s.Players[s.Winner.Value].Score });
                        return;
                    }
                    s.Log.Add(new DustLine { Kind = "level", Who = 0, Score = a.Score });
                }
                s.Round++;
            }
            s.Turn = s.Turn == 0 ? 1 : 0;
        }

        /// <summary>One decision of the opponent's turn: bank if their nerve (or the win) says so, else roll. Returns
        /// "bank", "roll" or "none" (not their turn, or the game is over).</summary>
        public static string AiStep(DustGame s, Rng rng)
        {
            if (s.Turn != 1 || s.Over) return "none";
            var me = s.Players[1];
            var you = s.Players[0];
            var wouldWin = me.Score + s.Run >= s.Target && me.Score + s.Run > you.Score;
            // chase harder when behind at the end; stop when banking is enough
            var need = you.Score >= s.Target ? you.Score - me.Score + 1 : 0;
            if (wouldWin || (s.Run >= me.Nerve && s.Run >= need)) { Bank(s); return "bank"; }
            Roll(s, rng);
            return "roll";
        }

        /// <summary>The opponent's whole turn.</summary>
        public static void AiTurn(DustGame s, Rng rng)
        {
            for (var guard = 0; guard < 40 && AiStep(s, rng) != "none"; guard++) { }
        }

        /// <summary>Nerve from a personality: the brave and the greedy push further (8 to 16).</summary>
        public static int NerveFor(int courage = 50, int greed = 50) => Num.RoundInt(8 + courage / 100.0 * 5 + greed / 100.0 * 3);

        // ---- the table's money ------------------------------------------------------------------------------------------

        /// <summary>What someone has on them in Tolls: their save's purse once they have one, else what the content gives
        /// them.</summary>
        public static int Purse(GameState g, NpcDef npc)
        {
            if (npc == null) return 0;
            if (g.Npcs.TryGetValue(npc.Id, out var save) && save.Inventory != null) return save.Inventory.Tolls;
            return npc.Tolls ?? 0;
        }

        /// <summary>Their purse, made theirs in the save (from what the content gives them) when it changes first.</summary>
        private static Inventory.Inventory PurseOf(GameState g, NpcDef npc)
        {
            if (!g.Npcs.TryGetValue(npc.Id, out var save)) g.Npcs[npc.Id] = save = new NpcSave();
            save.Inventory ??= NpcStats.Build(npc).inv;
            return save.Inventory;
        }

        /// <summary>Whether the two can sit down to it: null when they can, "you_short" when the player cannot cover the
        /// stake, "they_short" when the opponent cannot (a prize needs no stake).</summary>
        public static string CanSit(GameState g, NpcDef npc, DustTerms terms)
        {
            if (terms.Prize != null || terms.Stake <= 0) return null;
            if (g.Pc.Inventory.Tolls < terms.Stake) return "you_short";
            if (Purse(g, npc) < terms.Stake) return "they_short";
            return null;
        }

        /// <summary>Both put the stake in the pot (nothing for a prize). False when either cannot.</summary>
        public static bool Ante(GameState g, NpcDef npc, DustTerms terms)
        {
            if (CanSit(g, npc, terms) != null) return false;
            if (terms.Prize != null || terms.Stake <= 0) return true;
            g.Pc.Inventory.Tolls -= terms.Stake;
            PurseOf(g, npc).Tolls -= terms.Stake;
            return true;
        }

        /// <summary>The game is decided: the pot to the winner (or the prize's effects), and the count of games and wins.
        /// Does nothing before a winner.</summary>
        public static void Settle(GameState g, NpcDef npc, DustGame s, DustTerms terms, ILogicHost host = null)
        {
            if (!s.Over) return;
            var won = s.Winner == 0;
            if (terms.Prize != null) Logic.Apply(won ? terms.Prize.Win : terms.Prize.Lose, g, host);
            else if (terms.Stake > 0)
            {
                var pot = terms.Stake * 2;
                if (won) g.Pc.Inventory.Tolls += pot;
                else if (npc != null) PurseOf(g, npc).Tolls += pot;
            }
            g.SetFlag("dust_games", (g.Flag("dust_games") is double n ? n : 0) + 1);
            if (won) g.SetFlag("dust_wins", (g.Flag("dust_wins") is double w ? w : 0) + 1);
        }
    }
}
