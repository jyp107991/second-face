using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json.Linq;
using NUnit.Framework;
using SecondFace.Core;
using SecondFace.Core.Content;
using SecondFace.Core.State;
using SecondFace.Core.World;

namespace SecondFace.Tests
{
    /// <summary>
    /// Dust, the frontier's dice game (Core <see cref="Dust"/>, port of minigames/dust.ts and the table's money in
    /// ui/dust.ts): a run grows with each face and a 1 dusts it and the turn; banking keeps it; first past the target at
    /// the end of a round takes the pot (a tie plays another round); the opponent banks on their nerve, or on the win, and
    /// chases when behind; the same dice give the same game; the stakes go in the pot and the pot to the winner, or a
    /// prize pays by its effects; every game is counted.
    /// </summary>
    public class DustTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        private static DustGame Game(int nerve = 12, int stake = 5) => Dust.New("You", "Them", nerve, stake);

        [Test]
        public void ARunGrowsWithEachFaceAndAOneDustsItAndTheTurn()
        {
            var s = Game();
            var rng = new Rng(12345u);
            var sum = 0;
            for (var guard = 0; guard < 200; guard++)
            {
                var face = Dust.Roll(s, rng);
                Assert.That(face, Is.InRange(1, 6));
                if (face == 1)
                {
                    Assert.That(s.Run, Is.EqualTo(0), "the run is lost");
                    Assert.That(s.Turn, Is.EqualTo(1), "and the turn");
                    Assert.That(s.Rolls, Is.Empty);
                    var dusted = s.Log.Last();
                    Assert.That((dusted.Kind, dusted.Who, dusted.Value), Is.EqualTo(("dusted", 0, sum)));
                    Assert.That(s.Players[0].Score, Is.EqualTo(0), "nothing banked");
                    return;
                }
                sum += face;
                Assert.That(s.Run, Is.EqualTo(sum));
                Assert.That(s.Rolls.Last(), Is.EqualTo(face));
            }
            Assert.Fail("no 1 in 200 rolls");
        }

        [Test]
        public void BankingKeepsTheRunAndPassesTheTurn()
        {
            var s = Game();
            s.Run = 9;
            Dust.Bank(s);
            Assert.That(s.Players[0].Score, Is.EqualTo(9));
            Assert.That(s.Run, Is.EqualTo(0));
            Assert.That(s.Turn, Is.EqualTo(1));
            Assert.That(s.Log.Last().Kind, Is.EqualTo("bank"));
            Assert.That(s.Log.Last().Score, Is.EqualTo(9));
        }

        [Test]
        public void FirstPastTheTargetAtTheEndOfARoundTakesThePotAndATieGoesOn()
        {
            var s = Game(stake: 10);
            s.Run = 31; Dust.Bank(s);
            Assert.That(s.Over, Is.False, "the round is not over: they still have their turn");
            s.Run = 4; Dust.Bank(s);
            Assert.That(s.Winner, Is.EqualTo(0));
            Assert.That(s.Log.Last().Kind, Is.EqualTo("pot"));
            Assert.That(s.Log.Last().Value, Is.EqualTo(20), "both stakes");
            Assert.That(Dust.Roll(s, new Rng(1u)), Is.EqualTo(0), "nothing more once it is decided");

            var tie = Game();
            tie.Run = 30; Dust.Bank(tie);
            tie.Run = 30; Dust.Bank(tie);
            Assert.That(tie.Over, Is.False, "level: another round");
            Assert.That(tie.Log.Last().Kind, Is.EqualTo("level"));
            Assert.That(tie.Round, Is.EqualTo(2));
            Assert.That(tie.Turn, Is.EqualTo(0));
        }

        [Test]
        public void TheOpponentBanksOnTheirNerveOrTheWinAndChasesWhenBehind()
        {
            var s = Game(nerve: 10);
            s.Turn = 1; s.Run = 10;
            Assert.That(Dust.AiStep(s, new Rng(5u)), Is.EqualTo("bank"), "at their nerve");
            var win = Game(nerve: 16);
            win.Turn = 1; win.Players[1].Score = 26; win.Run = 5;
            Assert.That(Dust.AiStep(win, new Rng(5u)), Is.EqualTo("bank"), "banking wins it");
            var chase = Game(nerve: 8);
            chase.Players[0].Score = 34; chase.Players[1].Score = 20; chase.Turn = 1; chase.Run = 10;
            Assert.That(Dust.AiStep(chase, new Rng(5u)), Is.EqualTo("roll"), "behind at the end: 10 is not enough, they push on");
            var mine = Game();
            Assert.That(Dust.AiStep(mine, new Rng(5u)), Is.EqualTo("none"), "not their turn");
        }

        [Test]
        public void NerveComesFromCourageAndGreed()
        {
            Assert.That(Dust.NerveFor(), Is.EqualTo(12));
            Assert.That(Dust.NerveFor(0, 0), Is.EqualTo(8));
            Assert.That(Dust.NerveFor(100, 100), Is.EqualTo(16));
            Assert.That(Dust.NerveFor(85), Is.GreaterThan(Dust.NerveFor(40)));
        }

        /// <summary>A whole game, the player banking at 15 (or the win), the opponent by their nerve.</summary>
        private static DustGame Play(uint seed)
        {
            var s = Game(nerve: 13);
            var rng = new Rng(seed);
            for (var guard = 0; guard < 2000 && !s.Over; guard++)
            {
                if (s.Turn == 1) { Dust.AiTurn(s, rng); continue; }
                if (s.Run >= 15 || (s.Run > 0 && s.Players[0].Score + s.Run >= s.Target && s.Players[0].Score + s.Run > s.Players[1].Score)) Dust.Bank(s);
                else Dust.Roll(s, rng);
            }
            return s;
        }

        [Test]
        public void AGameEndsWithAWinnerAndTheSameDiceGiveTheSameGame()
        {
            var wins = new int[2];
            for (var seed = 1u; seed <= 40; seed++)
            {
                var a = Play(seed);
                Assert.That(a.Over, Is.True, $"seed {seed}: decided");
                Assert.That(a.Players[a.Winner.Value].Score, Is.GreaterThanOrEqualTo(a.Target));
                Assert.That(a.Players[a.Winner.Value].Score, Is.GreaterThan(a.Players[1 - a.Winner.Value].Score));
                wins[a.Winner.Value]++;
                var b = Play(seed);
                Assert.That(b.Log.Select(l => (l.Kind, l.Who, l.Value)), Is.EqualTo(a.Log.Select(l => (l.Kind, l.Who, l.Value))), "the same game");
            }
            Assert.That(wins[0], Is.GreaterThan(0), "the player can win");
            Assert.That(wins[1], Is.GreaterThan(0), "and lose: a readable edge, not a sure thing");
        }

        // ---- the money ----------------------------------------------------------------------------------------------

        private const string Opponent = "npc_sh_03";

        [Test]
        public void BothAnteTheStakeAndTheWinnerTakesThePot()
        {
            var g = States.NewGame("shale", 0, 0);
            var npc = Registry.Npcs[Opponent];
            g.Pc.Inventory.Tolls = 50;
            var purse = Dust.Purse(g, npc);
            Assert.That(purse, Is.EqualTo(npc.Tolls ?? 0), "what the content gives them");
            var terms = DustTerms.From(JObject.Parse("{\"stake\":10}"));
            Assert.That(Dust.CanSit(g, npc, terms), Is.Null);
            Assert.That(Dust.Ante(g, npc, terms), Is.True);
            Assert.That(g.Pc.Inventory.Tolls, Is.EqualTo(40));
            Assert.That(Dust.Purse(g, npc), Is.EqualTo(purse - 10), "their purse is theirs in the save now");
            var s = Dust.New("You", npc.Name, 12, 10);
            s.Winner = 0;
            Dust.Settle(g, npc, s, terms);
            Assert.That(g.Pc.Inventory.Tolls, Is.EqualTo(60), "both stakes");
            Assert.That(g.Flag("dust_games"), Is.EqualTo(1.0));
            Assert.That(g.Flag("dust_wins"), Is.EqualTo(1.0));
            // the next game they win
            Dust.Ante(g, npc, terms);
            var t = Dust.New("You", npc.Name, 12, 10);
            t.Winner = 1;
            Dust.Settle(g, npc, t, terms);
            Assert.That(g.Pc.Inventory.Tolls, Is.EqualTo(50));
            Assert.That(Dust.Purse(g, npc), Is.EqualTo(purse), "their stake and yours back to them");
            Assert.That(g.Flag("dust_games"), Is.EqualTo(2.0));
            Assert.That(g.Flag("dust_wins"), Is.EqualTo(1.0));
        }

        [Test]
        public void NobodySitsDownWithoutTheStake()
        {
            var g = States.NewGame("shale", 0, 0);
            var npc = Registry.Npcs[Opponent];
            g.Pc.Inventory.Tolls = 3;
            var terms = DustTerms.From(JObject.Parse("{\"stake\":5}"));
            Assert.That(Dust.CanSit(g, npc, terms), Is.EqualTo("you_short"));
            Assert.That(Dust.Ante(g, npc, terms), Is.False);
            Assert.That(g.Pc.Inventory.Tolls, Is.EqualTo(3));
            g.Pc.Inventory.Tolls = 5000;
            var big = DustTerms.From(JObject.Parse("{\"stake\":" + ((npc.Tolls ?? 0) + 1) + "}"));
            Assert.That(Dust.CanSit(g, npc, big), Is.EqualTo("they_short"));
            Assert.That(DustTerms.From(null).Stake, Is.EqualTo(5), "a stake of 5 when none is named");
        }

        [Test]
        public void APrizeIsPlayedForByItsEffectsWithNoStake()
        {
            var g = States.NewGame("shale", 0, 0);
            var npc = Registry.Npcs[Opponent];
            g.Pc.Inventory.Tolls = 0;
            var terms = DustTerms.From(JObject.Parse("{\"stake\":20,\"prize\":{\"label\":\"a thing\",\"win\":[{\"set\":\"t_dust_won\"}],\"lose\":[{\"set\":\"t_dust_lost\"}]}}"));
            Assert.That(terms.Prize.Label, Is.EqualTo("a thing"));
            Assert.That(Dust.CanSit(g, npc, terms), Is.Null, "a prize needs no Tolls");
            Assert.That(Dust.Ante(g, npc, terms), Is.True);
            Assert.That(g.Pc.Inventory.Tolls, Is.EqualTo(0));
            var s = Dust.New("You", npc.Name, 12, 20);
            s.Winner = 1;
            Dust.Settle(g, npc, s, terms);
            Assert.That(g.Flags.ContainsKey("t_dust_lost"), Is.True);
            Assert.That(g.Flags.ContainsKey("t_dust_won"), Is.False);
            Assert.That(g.Pc.Inventory.Tolls, Is.EqualTo(0), "no pot for a prize");
            var unfinished = Dust.New("You", npc.Name, 12, 20);
            Dust.Settle(g, npc, unfinished, terms);
            Assert.That(g.Flag("dust_games"), Is.EqualTo(1.0), "an undecided game settles nothing");
        }

        [Test]
        public void EveryDustInTheContentReadsAsTermsWhosePrizesApply()
        {
            var found = new List<JObject>();
            void Walk(JToken t)
            {
                if (t is JObject o) { if ((string)o["event"] == "dust") found.Add(o); foreach (var p in o.Properties()) Walk(p.Value); }
                else if (t is JArray a) foreach (var e in a) Walk(e);
            }
            var db = ContentFixture.Db();
            Walk(db.Table("dialogues"));
            Walk(db.Table("quests"));
            Walk(db.Table("maps"));
            Assert.That(found, Is.Not.Empty);
            foreach (var e in found)
            {
                var terms = DustTerms.From(e["data"]);
                Assert.That(terms.Stake, Is.GreaterThanOrEqualTo(0));
                if (terms.Prize == null) { Assert.That(terms.Stake, Is.GreaterThan(0), "a game for nothing at all"); continue; }
                Assert.That(terms.Prize.Label, Is.Not.Empty, "a prize says what it is");
                Assert.DoesNotThrow(() => Logic.Apply(terms.Prize.Win, States.NewGame("shale", 0, 0)));
                Assert.DoesNotThrow(() => Logic.Apply(terms.Prize.Lose, States.NewGame("shale", 0, 0)));
            }
        }
    }
}
