using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core;
using SecondFace.Core.Combat;
using SecondFace.Core.Stats;

namespace SecondFace.Tests
{
    /// <summary>
    /// COMBAT.md B1–B11's pure parts (Core <c>CombatView</c>, <c>BattleUndo</c>, the surprise round): the shot card's
    /// reasons in the UI's words adding up to the chance, the walk's and the throw's cards, the turn order from the one
    /// acting with the round's divider, the reachable bands' lines where the walk runs out (whole, or worked out a few
    /// points at a time), the undo of a walk nobody saw (and not of one somebody did), what floats up over a hit, the
    /// pace, whose intent is shown by difficulty, the turn's actions open or not, the surprise round, the fight's end in
    /// words. Every word asked for is a line of UI/Strings/ui.tsv.
    /// </summary>
    public class CombatViewTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        // ---- the UI's words, read from the table itself ----------------------------------------------------------------

        private static Dictionary<string, string> _table;
        private readonly List<string> _missing = new();

        private static Dictionary<string, string> Table()
        {
            if (_table != null) return _table;
            string root = null;
            for (var d = new DirectoryInfo(Directory.GetCurrentDirectory()); d != null && root == null; d = d.Parent)
                foreach (var c in new[] { Path.Combine(d.FullName, "Assets", "SecondFace"), Path.Combine(d.FullName, "unity", "Assets", "SecondFace") })
                    if (Directory.Exists(Path.Combine(c, "UI", "Strings"))) { root = c; break; }
            Assert.That(root, Is.Not.Null, "Assets/SecondFace");
            _table = new Dictionary<string, string>();
            foreach (var line in File.ReadAllLines(Path.Combine(root, "UI/Strings/ui.tsv")))
            {
                if (line.Length == 0 || line.StartsWith("#")) continue;
                var tab = line.IndexOf('\t');
                if (tab > 0) _table[line.Substring(0, tab)] = line.Substring(tab + 1);
            }
            return _table;
        }

        private string W(string key, params object[] args)
        {
            if (!Table().TryGetValue(key, out var text)) { _missing.Add(key); return "?" + key; }
            return args.Length > 0 ? string.Format(text, args) : text;
        }

        [TearDown]
        public void EveryWordWasInTheTable() => Assert.That(_missing.Distinct(), Is.Empty, "keys the view models asked for that UI/Strings/ui.tsv lacks");

        private static Battle Start(GridField g, params BattleUnit[] us)
        {
            var b = new Battle(g, new Rng(11));
            b.Start(us);
            foreach (var u in us) u.C.Ap = CombatRules.MaxAp(u.C);
            return b;
        }

        // ---- B3 -------------------------------------------------------------------------------------------------------

        [Test]
        public void TheShotCardListsEveryReasonInWordsAndTheyAddUp()
        {
            var g = new GridField(30, 20).Set(10, 10, GridField.Low);
            var def = Arena.Unit("d", 9.5, 10.5, true, "w_pistol9", "a_9mm");
            var att = Arena.Unit("a", 17.5, 10.5, false, "w_pistol9", "a_9mm", skill: 40);
            var b = Start(g, def, att);
            var p = b.Preview(att, def, ShotOptions.Snap);
            var card = ShotCard.From(p, W);
            Assert.That(card.Ok, Is.True, card.Why);
            Assert.That(card.Chance, Is.EqualTo(p.Chance));
            Assert.That(card.Lines.Where(l => !l.Info).Sum(l => l.Points), Is.EqualTo(card.Raw).Within(2), "the terms add up to the raw chance (each rounded)");
            Assert.That(card.Lines[0].Key, Is.EqualTo("skill"), "the skill first");
            Assert.That(card.Lines[0].Note, Is.EqualTo(Table()["skill.firearms"]), "named in words");
            var cover = card.Lines.Single(l => l.Key == "cover");
            Assert.That(cover.Value, Is.EqualTo("-20"));
            Assert.That(cover.Note, Is.EqualTo(Table()["combat.cover.half"]));
            Assert.That(card.CoverLine, Is.EqualTo(Table()["combat.cover.half"]));
            Assert.That(card.Headline, Does.Contain(card.Chance.ToString()));
            Assert.That(card.Damage, Does.Contain(card.DamageMin.ToString()).And.Contain(card.DamageMax.ToString()));
            Assert.That(card.Kill, Is.InRange(0, 100));
            // from the flank: the cover goes, the card says so and why the crit is higher
            var south = Arena.Unit("s", 9.5, 2.5, false, "w_pistol9", "a_9mm", skill: 40);
            b.Units.Add(south);
            var flank = ShotCard.From(b.Preview(south, def, ShotOptions.Snap), W);
            Assert.That(flank.Flanked, Is.True);
            Assert.That(flank.CoverLine, Is.EqualTo(Table()["combat.flanked"]));
            var info = flank.Lines.Single(l => l.Key == "flanked");
            Assert.That(info.Info, Is.True);
            Assert.That(info.Value, Does.Contain(Tactics.FlankCrit.ToString()));
        }

        [Test]
        public void ACardSaysWhyAShotCannotBeTaken()
        {
            var g = new GridField(30, 20).Set(13, 10, GridField.Wall);
            var def = Arena.Unit("d", 9.5, 10.5, true);
            var att = Arena.Unit("a", 17.5, 10.5, false, "w_pistol9", "a_9mm");
            var b = Start(g, def, att);
            Assert.That(ShotCard.From(b.Preview(att, def, ShotOptions.Snap), W).Why, Is.EqualTo(Table()["combat.why.no_sight"]));
            att.Place(12.5, 14.5);
            att.C.Ap = 1;
            var card = ShotCard.From(b.Preview(att, def, ShotOptions.Snap), W);
            Assert.That(card.Ok, Is.False);
            Assert.That(card.Why, Is.EqualTo(string.Format(Table()["combat.why.needs_ap"], card.Ap)));
            Assert.That(ShotCard.WhyText("something new", W), Is.EqualTo("something new"), "an unknown reason as it is");
        }

        // ---- B2, B4, B5 ---------------------------------------------------------------------------------------------------

        [Test]
        public void TheWalksCardSaysTheShotsItDrawsWhomItFlanksAndTheCoverAtItsEnd()
        {
            var g = new GridField(40, 30).Set(21, 15, GridField.Low);
            var u = Arena.Unit("u", 5.5, 5.5, false, "w_pistol9", "a_9mm", player: true);
            var watcher = Arena.Unit("w", 25.5, 5.5, true, "w_pistol9", "a_9mm");
            var hiding = Arena.Unit("h", 20.5, 15.5, true, "w_pistol9", "a_9mm");
            var b = Start(g, u, watcher, hiding);
            watcher.C.Ap = 8; b.Overwatch(watcher);
            u.C.Ap = 10;
            var plan = b.PlanMove(u, 14.5, 12.5);
            var card = MoveCard.From(plan, b.ThreatsAt(u, 14.5, 12.5), W);
            Assert.That(card.Ok, Is.True);
            Assert.That(card.Ap, Is.EqualTo(plan.Ap));
            Assert.That(card.Shots, Is.GreaterThanOrEqualTo(1), "the overwatch it draws");
            Assert.That(card.Lines.Any(l => l.Contains(watcher.C.Name)), Is.True);
            Assert.That(card.Headline, Is.EqualTo(plan.Act ? string.Format(Table()["combat.move.act"], plan.Ap) : string.Format(Table()["combat.move.dash"], plan.Ap)));
            Assert.That(card.SeenBy, Is.GreaterThan(0));
            var flank = MoveCard.From(b.PlanMove(u, 20.5, 22.5), null, W);
            Assert.That(flank.Flanks, Does.Contain(hiding));
            var far = MoveCard.From(b.PlanMove(u, 39.5, 29.5), null, W);
            Assert.That(far.Ok, Is.False);
            Assert.That(far.Why, Is.Not.Null.And.Not.Empty);
        }

        [Test]
        public void TheThrowsCardFlagsTheAlliesInTheFootprint()
        {
            var g = new GridField(40, 30);
            var u = Arena.Unit("u", 10.5, 10.5, false, "w_pistol9", "a_9mm", player: true, pack: ("w_frag", 1));
            var ally = Arena.Unit("ally", 16.5, 10.5, false);
            var foe = Arena.Unit("foe", 17.5, 10.5, true);
            var b = Start(g, u, ally, foe);
            u.C.Ap = 10;
            var plan = b.PlanThrow(u, "w_frag", 17.5, 10.5);
            var card = ThrowCard.From(plan, "Frag", W);
            Assert.That(card.Ok, Is.True, card.Why);
            Assert.That(card.Allies, Is.EqualTo(1));
            Assert.That(card.Enemies, Is.EqualTo(1));
            Assert.That(card.Lines.Any(l => l.Contains("ally")), Is.True, "the ally named");
        }

        // ---- B6 -------------------------------------------------------------------------------------------------------

        [Test]
        public void TheTurnOrderRunsFromTheOneActingAndMarksTheNextRound()
        {
            var g = new GridField(40, 30);
            var us = new[]
            {
                Arena.Unit("a", 5.5, 5.5, false, "w_pistol9", "a_9mm", player: true), Arena.Unit("b", 6.5, 5.5, false),
                Arena.Unit("c", 30.5, 5.5, true), Arena.Unit("d", 31.5, 5.5, true),
            };
            var b = Start(g, us);
            b.NextTurn(); b.EndTurn();
            var second = b.NextTurn();
            var slots = new List<TurnSlot>();
            var n = TurnOrder.Fill(b, slots);
            Assert.That(n, Is.EqualTo(4));
            Assert.That(slots[0].Unit, Is.SameAs(second));
            Assert.That(slots[0].Current, Is.True);
            Assert.That(slots.Take(n).Count(s => s.NextRound), Is.EqualTo(1), "one divider where the round turns");
            Assert.That(slots.Take(n).TakeWhile(s => !s.NextRound).Count(), Is.EqualTo(b.Order.Count - b.Order.IndexOf(second)), "the rest of this round first");
            // the dead drop out; a status shows; the list is reused
            var dead = us.First(u => u != second && u.Hostile);
            b.Down(dead);
            Status.Add(second.C, Status.Bleeding, 2);
            n = TurnOrder.Fill(b, slots);
            Assert.That(n, Is.EqualTo(3));
            Assert.That(slots.Count, Is.EqualTo(4), "no new slots");
            Assert.That(slots.Take(n).Select(s => s.Unit), Has.No.Member(dead));
            Assert.That(slots[0].Statuses, Does.Contain((Status.Bleeding, 2)));
            Assert.That(slots[0].Health, Is.InRange(0f, 1f));
        }

        // ---- B1 -------------------------------------------------------------------------------------------------------

        [Test]
        public void TheBandsLinesLieWhereTheWalkRunsOut()
        {
            var g = new GridField(40, 40);
            var u = Arena.Unit("u", 20.5, 20.5, false, "w_pistol9", "a_9mm", player: true);
            var e = Arena.Unit("e", 39.5, 39.5, true);
            var b = Start(g, u, e);
            u.C.Ap = 8;
            var m = b.Reachable(u, 1.0);
            var lines = new BandLines();
            ReachBands.Lines(m, lines);
            Assert.That(lines.Act.Count, Is.EqualTo(1), "one edge round the move-and-act band");
            Assert.That(lines.Dash.Count, Is.EqualTo(1), "one round the dash");
            foreach (var (chain, limit) in new[] { (lines.Act[0], m.ActMetres), (lines.Dash[0], m.DashMetres) })
            {
                Assert.That(chain.First(), Is.EqualTo(chain.Last()), "a closed loop");
                foreach (var (x, z) in chain)
                {
                    var r = Tactics.Dist(x, z, u.PX, u.PZ);
                    // (the grid's walks are 8-way: a diagonal walks a little more than the line, so the edge comes in a little)
                    Assert.That(r, Is.InRange(limit * 0.88 - 1.0, limit + 1.0), $"an edge point {r:0.0} m out for {limit:0.0} m");
                }
            }
            Assert.That(ReachBands.Band(m, ReachBands.Field(m, u.PX + 1, u.PZ)), Is.EqualTo(1), "beside them: move and act");
            Assert.That(ReachBands.Band(m, ReachBands.Field(m, u.PX + (m.ActMetres + m.DashMetres) / 2, u.PZ)), Is.EqualTo(2), "between the edges: a dash");
            Assert.That(ReachBands.Band(m, ReachBands.Field(m, u.PX + m.DashMetres + 1.5, u.PZ)), Is.EqualTo(0), "past them: out of reach");
            foreach (var p in m.Points) Assert.That(ReachBands.Band(m, p.Metres), Is.EqualTo(p.Act ? 1 : 2), "the bands are the rules' AP");
            Assert.That(ReachBands.Weight(0, m.ActMetres, 1), Is.EqualTo(1f).Within(1e-6));
            Assert.That(ReachBands.Weight(m.ActMetres + 2, m.ActMetres, 1), Is.EqualTo(0f).Within(1e-6));
            Assert.That(ReachBands.Weight(m.ActMetres, m.ActMetres, 1), Is.EqualTo(0.5f).Within(1e-6), "soft at the edge");
        }

        [Test]
        public void TheBandsHugAWallAndAMapWorkedOutAFewPointsAtATimeIsTheSame()
        {
            // a wall two metres east, from top to bottom but for a gap far south: the walk round it is long
            var g = new GridField(40, 40).Rect(22, 4, 22, 39, GridField.Wall);
            var u = Arena.Unit("u", 20.5, 20.5, false, "w_pistol9", "a_9mm", player: true);
            var e = Arena.Unit("e", 2.5, 2.5, true);
            var b = Start(g, u, e);
            u.C.Ap = 8;
            var whole = b.Reachable(u, 1.0);
            Assert.That(ReachBands.Band(whole, whole.At(whole.GridN / 2 + 4, whole.GridN / 2)), Is.EqualTo(0), "beyond the wall: out of reach");
            Assert.That(ReachBands.Band(whole, ReachBands.Field(whole, 21.2, 20.5)), Is.EqualTo(1), "up to the wall: in");
            var job = b.BeginReach(u, 1.0);
            var rounds = 0;
            while (!b.ContinueReach(job, 25)) rounds++;
            Assert.That(rounds, Is.GreaterThan(3), "spread over calls");
            Assert.That(job.Map.Points.Count, Is.EqualTo(whole.Points.Count));
            Assert.That(job.Map.Grid, Is.EqualTo(whole.Grid));
            Assert.That(job.StaleFor(u), Is.False);
            u.Place(19.5, 20.5);
            Assert.That(job.StaleFor(u), Is.True, "moved: a new map is needed");
        }

        // ---- B8 -------------------------------------------------------------------------------------------------------

        [Test]
        public void AWalkNobodySawCanBeTakenBack()
        {
            // a wall between them: the walk along the west is out of the enemy's sight
            var g = new GridField(40, 30).Rect(20, 0, 20, 29, GridField.Wall);
            var u = Arena.Unit("u", 5.5, 10.5, false, "w_pistol9", "a_9mm", player: true);
            var e = Arena.Unit("e", 30.5, 10.5, true, "w_pistol9", "a_9mm");
            var b = Start(g, u, e);
            while (b.NextTurn() != u) b.EndTurn();
            var ap = u.C.Ap;
            var undo = b.BeginMove(u);
            var path = b.PathFor(u, 8.5, 14.5);
            var o = b.WalkTo(u, 8.5, 14.5);
            b.EndMove(undo, o, path);
            Assert.That(undo.Undoable, Is.True, undo.Blocked);
            Assert.That(b.CanUndo(undo), Is.True);
            Assert.That(u.C.Ap, Is.LessThan(ap));
            var logged = b.Log.Count;
            Assert.That(b.Undo(undo), Is.True);
            Assert.That((u.PX, u.PZ), Is.EqualTo((5.5, 10.5)), "back where they stood");
            Assert.That(u.C.Ap, Is.EqualTo(ap), "the AP back");
            Assert.That(b.Current, Is.SameAs(u), "still their turn");
            Assert.That(b.Log.Count, Is.LessThanOrEqualTo(logged));
            Assert.That(b.CanUndo(undo), Is.False, "once");
        }

        [Test]
        public void AWalkSomebodySawOrShotAtStays()
        {
            var g = new GridField(40, 30);
            var u = Arena.Unit("u", 5.5, 10.5, false, "w_pistol9", "a_9mm", player: true);
            var e = Arena.Unit("e", 25.5, 10.5, true, "w_pistol9", "a_9mm");
            var b = Start(g, u, e);
            while (b.NextTurn() != u) b.EndTurn();
            var undo = b.BeginMove(u);
            var path = b.PathFor(u, 8.5, 10.5);
            b.EndMove(undo, b.WalkTo(u, 8.5, 10.5), path);
            Assert.That(undo.Blocked, Is.EqualTo("seen"));
            Assert.That(b.Undo(undo), Is.False);
            Assert.That((u.PX, u.PZ), Is.EqualTo((8.5, 10.5)), "nothing changed");
            // a held shot that fires on the walk
            e.C.Ap = 8; b.Overwatch(e);
            u.C.Ap = 10;
            var shot = b.BeginMove(u);
            var p2 = b.PathFor(u, 12.5, 10.5);
            b.EndMove(shot, b.WalkTo(u, 12.5, 10.5), p2);
            Assert.That(shot.Blocked, Is.EqualTo("shot").Or.EqualTo("dice"));
        }

        // ---- B7 -------------------------------------------------------------------------------------------------------

        [Test]
        public void WhatFloatsUpSaysWhatAnAttackDid()
        {
            var att = Arena.Unit("a", 1.5, 1.5, false);
            var def = Arena.Unit("d", 5.5, 1.5, true);
            var res = new AttackResult { RoundsFired = 3 };
            res.Hits.Add(new HitResult { Hit = false });
            res.Hits.Add(new HitResult { Hit = true, Damage = 1 });
            res.Hits.Add(new HitResult { Hit = true, Crit = true, Damage = 18, Crippled = "legL" });
            var hit = new BattleHit { Attacker = att, Defender = def, Result = res };
            var ev = new List<FloatEvent>();
            Floats.FromHit(hit, ev, W);
            Assert.That(ev.Select(x => x.Kind), Is.EqualTo(new[] { "miss", "graze", "crit", "status" }));
            Assert.That(ev[2].Text, Does.Contain("18"));
            Assert.That(ev[3].Text, Is.EqualTo(Table()["combat.status.crippled_leg"]));
            // what the hits do not say: a status, a fall, a nerve that breaks
            var g = new GridField(20, 10);
            var b = Start(g, att, def);
            var before = Floats.Picture(b);
            Status.Add(att.C, Status.Burning, 2);
            def.C.Sheet.Hp = 0;
            att.Fleeing = true;
            var more = new List<FloatEvent>();
            Floats.Changes(b, before, more, W);
            Assert.That(more.Any(x => x.Unit == att && x.Kind == "status" && x.Text == Table()["combat.status.burning"]), Is.True);
            Assert.That(more.Any(x => x.Unit == def && x.Kind == "down"), Is.True);
            Assert.That(more.Any(x => x.Unit == att && x.Kind == "break"), Is.True);
            // damage the hits showed is not shown twice
            var picture = Floats.Picture(b);
            att.C.Sheet.Hp -= 5;
            var twice = new List<FloatEvent>();
            Floats.Changes(b, picture, twice, W, new Dictionary<BattleUnit, int> { [att] = 5 });
            Assert.That(twice.Where(x => x.Kind == "hit"), Is.Empty);
        }

        // ---- B9, B5 ---------------------------------------------------------------------------------------------------

        [Test]
        public void ThePaceIsTheSettingsAndSkipCutsOnlyTheirShow()
        {
            var fast = new CombatPace(2f, false);
            Assert.That(fast.Seconds(1f, true), Is.EqualTo(0.5f).Within(1e-6));
            Assert.That(fast.Seconds(1f, false), Is.EqualTo(0.5f).Within(1e-6));
            var skip = new CombatPace(1f, true);
            Assert.That(skip.Seconds(1f, true), Is.LessThanOrEqualTo(0.05f));
            Assert.That(skip.Seconds(1f, false), Is.EqualTo(1f).Within(1e-6), "the player's own actions keep their pace");
            Assert.That(skip.Frames(true), Is.False);
            Assert.That(skip.Frames(false), Is.True);
            Assert.That(CombatPace.Normal.WaitsForWalk(true, false, false), Is.False, "their walk out of sight goes beside the others'");
            Assert.That(CombatPace.Normal.WaitsForWalk(true, false, true), Is.True, "one that comes into sight is watched");
            Assert.That(CombatPace.Normal.WaitsForWalk(false, false, false), Is.True, "ours always");
        }

        [Test]
        public void WhoseIntentIsShownGoesByTheDifficulty()
        {
            var raider = Arena.Unit("r", 1.5, 1.5, true, archetype: Archetypes.Raider);
            var machine = Arena.Unit("m", 2.5, 1.5, true, archetype: Archetypes.Machine);
            var story = CombatDifficulty.For("story"); var normal = CombatDifficulty.For("normal"); var hard = CombatDifficulty.For("hard");
            Assert.That(Intents.Shown(story, raider, false), Is.True);
            Assert.That(Intents.Shown(normal, raider, false), Is.False);
            Assert.That(Intents.Shown(normal, raider, true), Is.True);
            Assert.That(Intents.Shown(normal, machine, false), Is.True, "machines are predictable");
            Assert.That(Intents.Shown(hard, raider, true), Is.False);
            Assert.That(Intents.Shown(hard, machine, true), Is.True);
            raider.Hidden = true;
            Assert.That(Intents.Shown(story, raider, true), Is.False, "never a hidden one");
        }

        // ---- B8, B10 --------------------------------------------------------------------------------------------------

        [Test]
        public void TheTurnsActionsSayWhatIsOpenAndWhatItCosts()
        {
            var g = new GridField(40, 30);
            var u = Arena.Unit("pc", 5.5, 10.5, false, "w_carbine556", "a_556", player: true, pack: new[] { ("w_frag", 1), ("c_knitkit", 1) });
            var ally = Arena.Unit("ally", 6.5, 10.5, false, "w_pistol9", "a_9mm");
            var foe = Arena.Unit("foe", 20.5, 10.5, true, "w_pistol9", "a_9mm");
            var b = Start(g, u, ally, foe);
            while (b.NextTurn() != u) b.EndTurn();
            var acts = CombatActions.For(b, u, null, W).ToDictionary(a => a.Id);
            Assert.That(acts.Keys, Is.EqualTo(new[] { "stance", "throw", "swap", "heal", "undo", "reload", "overwatch", "end_turn" }));
            Assert.That(acts["throw"].Open, Is.True);
            Assert.That(acts["heal"].Open, Is.True);
            Assert.That(acts["undo"].Open, Is.False, "nothing to take back");
            Assert.That(acts["end_turn"].Open, Is.True);
            Assert.That(acts["end_turn"].Note, Does.Contain(u.C.Ap.ToString()), "the AP left said");
            Assert.That(acts["overwatch"].Open, Is.True);
            var verbs = CombatActions.OnTarget(b, u, foe, W).Select(v => v.Action.Id).ToList();
            Assert.That(verbs, Does.Contain("attack").And.Contain("aim_head").And.Contain("aim_legs").And.Contain("suppress").And.Contain("demand"));
            Assert.That(CombatActions.OnTarget(b, u, foe, W).First().Shot, Is.Not.Null, "the attack's preview for the card");
            var onAlly = CombatActions.OnTarget(b, u, ally, W).ToDictionary(v => v.Action.Id, v => v.Action);
            Assert.That(onAlly["heal_ally"].Open, Is.True, "beside them");
            Assert.That(onAlly["cover_fire"].Open, Is.True);
            b.Surrender(foe);
            var yielded = CombatActions.OnTarget(b, u, foe, W).Select(v => v.Action).ToList();
            Assert.That(yielded.Select(a => a.Id), Is.EqualTo(new[] { "take_prisoner" }));
            Assert.That(yielded[0].Open, Is.False, "too far");
            Assert.That(CombatActions.StanceChoices(b, u, W).Select(a => a.Id), Is.EquivalentTo(new[] { "crouch", "prone" }));
            Assert.That(CombatActions.StanceChoices(b, u, W).All(a => a.Ap == 0), Is.True, "the turn's free change");
            u.C.Ap = 0;
            Assert.That(CombatActions.For(b, u, null, W).Where(a => a.Open).Select(a => a.Id), Is.EquivalentTo(new[] { "stance", "end_turn" }), "with no AP: the free stance change and the end");
        }

        // ---- B11 ------------------------------------------------------------------------------------------------------

        [Test]
        public void ASurpriseRoundCostsTheCaughtTheirFirstTurn()
        {
            var g = new GridField(40, 30);
            var pc = Arena.Unit("pc", 5.5, 10.5, false, "w_pistol9", "a_9mm", player: true);
            var foes = new[] { Arena.Unit("f1", 25.5, 10.5, true, "w_pistol9", "a_9mm"), Arena.Unit("f2", 25.5, 14.5, true, "w_pistol9", "a_9mm") };
            var b = new Battle(g, new Rng(3));
            b.Start(new[] { foes[0], pc, foes[1] });
            b.Surprise(foes);
            Assert.That(b.Order[0], Is.SameAs(pc), "the player's side first");
            var acted = new List<BattleUnit>();
            for (var i = 0; i < 3; i++) { var u = b.NextTurn(); acted.Add(u); b.EndTurn(); }
            Assert.That(acted.Take(2), Is.EqualTo(new[] { pc, pc }), "round one: only the player");
            Assert.That(foes, Does.Contain(acted[2]), "round two: everyone");
            Assert.That(b.Log.Count(l => l.Contains("caught off guard")), Is.EqualTo(2));
            Assert.That(foes.All(f => !f.Surprised), Is.True, "once");
        }

        [Test]
        public void TheEndSaysHowItWentInWords()
        {
            var g = new GridField(40, 30);
            var pc = Arena.Unit("pc", 5.5, 10.5, false, player: true);
            var a = Arena.Unit("a", 20.5, 10.5, true); var y = Arena.Unit("y", 21.5, 10.5, true); var r = Arena.Unit("r", 22.5, 10.5, true);
            var b = Start(g, pc, a, y, r);
            b.Down(a);
            b.Surrender(y);
            r.Fled = true;
            b.CheckEnd();
            var s = FightSummary.Of(b, W);
            Assert.That((s.Down, s.Prisoners, s.Fled), Is.EqualTo((1, 1, 1)));
            Assert.That(s.Outcome, Is.EqualTo("fled"));
            Assert.That(s.Title, Is.EqualTo(Table()["combat.end.fled"]));
            Assert.That(s.Lines.Count, Is.GreaterThanOrEqualTo(3));
        }
    }
}
