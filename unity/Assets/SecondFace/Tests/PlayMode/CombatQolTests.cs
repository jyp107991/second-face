using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using NUnit.Framework;
using SecondFace.Core.Combat;
using SecondFace.Core.Content;
using SecondFace.Core.Dialogue;
using SecondFace.Core.Inventory;
using SecondFace.Core.Save;
using SecondFace.Core.Stats;
using SecondFace.Game;
using SecondFace.Game.Play;
using SecondFace.Game.UI;
using UnityEngine;
using UnityEngine.AI;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using UnityEngine.UIElements;

namespace SecondFace.Tests
{
    /// <summary>
    /// The fight's presentation and QoL (COMBAT.md B1–B11, A9) at Shale as the phone plays it, in a fight started the way
    /// the content starts one (a word sets a flag that turns the nearest person hostile, the content's <c>combat</c>
    /// event): on the player's turn the reachable bands are on the ground, the turn order shows the fighters, a tap on the
    /// ground previews the walk (its path, its card, the AP it spends) and shields stand where cover is; an enemy's held
    /// shot is drawn and marked, an eye marks whoever would see the previewed point, intents are worked out; a walk nobody
    /// saw is undone with the button (the body back, the AP back); a tap on the enemy opens the radial and the shot card
    /// with its reasons; a throw is aimed with its footprint and put away; an attack floats its number; end turn asks
    /// again while AP are left; with skip on, the other side's turn plays without the camera framing it.
    /// </summary>
    public class CombatQolTests
    {
        [UnityTearDown]
        public IEnumerator CleanUp()
        {
            foreach (var id in _trees) Registry.Dialogues.Remove(id);
            _trees.Clear();
            foreach (var (def, cond) in _hostileIf) def.HostileIf = cond;
            _hostileIf.Clear();
            Combat.Pace = null;
            yield return BootTests.Clear();
        }

        private readonly List<string> _trees = new();
        private readonly List<(SecondFace.Core.Npc.NpcDef Def, JObject Cond)> _hostileIf = new();

        private static string SavesDir => Path.Combine(Application.temporaryCachePath, "combat-qol-saves");

        private static IEnumerator Wait(float seconds) { var t = Time.realtimeSinceStartup; while (Time.realtimeSinceStartup - t < seconds) yield return null; }
        private static float Flat(Vector3 a, Vector3 b) { a.y = 0; b.y = 0; return Vector3.Distance(a, b); }

        /// <summary>A new game at Shale, from the title through creation, until the walker stands on the NavMesh.</summary>
        private static IEnumerator Boot(System.Action<Bootstrap> done)
        {
            if (Directory.Exists(SavesDir)) Directory.Delete(SavesDir, true);
            Bootstrap.MakeSession = () => new Session(new DirectoryBackend(SavesDir));
            Walkabout.StartAt = "shale";
            if (Object.FindAnyObjectByType<Bootstrap>() != null) yield return BootTests.Clear();
            SceneManager.LoadScene("Boot");
            yield return null;
            var boot = Object.FindAnyObjectByType<Bootstrap>();
            Assert.That(boot, Is.Not.Null, "the Boot scene's Bootstrap");
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 120f && boot.Title == null) yield return null;
            Assert.That(boot.Title, Is.Not.Null, "the title");
            for (var i = 0; i < 2; i++) yield return null;
            BootTests.Press(boot.Title.NewButton);
            var creation = boot.UI.Top as CreationScreen;
            Assert.That(creation, Is.Not.Null, "character creation");
            for (var i = 0; i < 3; i++) yield return null;
            BootTests.Press(creation.Content.Q<Button>("origin-" + Creation.Origins()[0].Id));
            creation.Content.Q<TextField>("name").value = "Ash Corran";
            Assert.That(creation.Finish(), Is.True);
            while (Time.realtimeSinceStartup - t0 < 420f && (boot.Walkabout == null || !boot.Walkabout.Ready || !boot.Walkabout.Placed)) yield return null;
            Assert.That(boot.Walkabout.Ready, Is.True, $"set down ({boot.Walkabout.Line()})");
            done(boot);
        }

        /// <summary>For the animation package's tests (CombatMotionPlayTests): the same boot, fight and turn.</summary>
        internal static IEnumerator BootAt(System.Action<Bootstrap> done) => Boot(done);
        internal IEnumerator FightNearest(Walkabout walk, System.Action<Townsperson> done) => Fight(walk, done);
        internal static IEnumerator MyTurnOf(Walkabout walk) => MyTurn(walk);

        /// <summary>Whatever conversation the moment brought closed first.</summary>
        private static IEnumerator Quiet(Walkabout walk)
        {
            for (var i = 0; i < 3; i++)
            {
                if (walk.Conversation != null && walk.Conversation.IsOpen) walk.Conversation.Close();
                yield return null;
            }
        }

        /// <summary>The townsperson standing nearest the walker (a placed person of the content, not travelling with them).</summary>
        private static Townsperson Nearest(Walkabout walk)
        {
            var at = walk.Walker.transform.position;
            return walk.People.StandingPeople
                .Where(p => p.Def != null && !p.Inside && p.GetComponent<Interactable>() != null && !walk.Game.World.Party.Contains(p.Def.Id) && p.Agent != null && p.Agent.enabled)
                .OrderBy(p => Flat(p.transform.position, at)).FirstOrDefault();
        }

        /// <summary>The player armed for the test (a pistol loaded, rounds to spare, a frag and a patch kit in the pack).</summary>
        private static void Arm(Walkabout walk)
        {
            var inv = walk.Game.Pc.Inventory;
            Inv.AddItem(inv, Inv.MakeItem("w_pistol9"));
            Inv.Equip(inv, inv.Items.FindIndex(i => i.Def == "w_pistol9"));
            Inv.AddItem(inv, Inv.MakeItem("a_9mm", 40));
            Inv.Reload(inv);
            Inv.AddItem(inv, Inv.MakeItem("w_frag", 1));
            Inv.AddItem(inv, Inv.MakeItem("c_knitkit", 1));
            Inv.SyncGear(walk.Game.Pc.Sheet, inv);
        }

        /// <summary>A fight with the nearest person, started as the content starts one (a word, the combat event): the
        /// player's side moves first.</summary>
        private IEnumerator Fight(Walkabout walk, System.Action<Townsperson> done)
        {
            yield return Quiet(walk);
            Arm(walk);
            var them = Nearest(walk);
            Assert.That(them, Is.Not.Null, "someone stands near");
            _hostileIf.Add((them.Def, them.Def.HostileIf));
            them.Def.HostileIf = JObject.Parse("{\"flag\":\"t_qol_turned\"}");
            const string tree = "t_qol_combat";
            Registry.Dialogues[tree] = new DialogueDef
            {
                Id = tree,
                Start = new List<StartDef> { new() { Node = "n" } },
                Nodes = new Dictionary<string, NodeDef>
                {
                    ["n"] = new()
                    {
                        Speaker = "narrator", Text = "That does it.",
                        Options = new List<OptionDef> { new() { Id = tree + ".go", Text = "Go on.", Effects = JArray.Parse("[{\"set\":\"t_qol_turned\"},{\"event\":\"combat\"}]"), Exit = true } },
                    },
                },
            };
            _trees.Add(tree);
            var panel = walk.OpenTree(tree, "Test");
            Assert.That(panel, Is.Not.Null, "the word opened");
            panel.Finish();
            panel.Choose(tree + ".go");
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 10f && !walk.Combat.Active) yield return null;
            Assert.That(walk.Combat.Active, Is.True, "the fight started");
            done(them);
        }

        /// <summary>Until it is the player's own turn and nothing is playing (a companion's turn played by the AI).</summary>
        private static IEnumerator MyTurn(Walkabout walk, float limit = 300f)
        {
            var c = walk.Combat;
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < limit && c.Active)
            {
                if (c.PlayersTurn && c.Acting != null && c.Acting.C.IsPlayer) yield break;
                if (c.PlayersTurn) yield return c.PlayerTurnByAi();
                yield return null;
            }
            Assert.That(c.Active && c.PlayersTurn && c.Acting.C.IsPlayer, Is.True, "the player's turn came");
        }

        /// <summary>Until the step under way is played out (the turn waits for a choice again, or has moved on).</summary>
        private static IEnumerator Played(Combat c, BattleUnit me, float limit = 30f)
        {
            var t0 = Time.realtimeSinceStartup;
            yield return null;
            while (Time.realtimeSinceStartup - t0 < limit && c.Active && !(c.PlayersTurn && c.Acting == me) && c.Battle.Current == me) yield return null;
        }

        private static Vector3 Ground(BattleUnit me, Combat c, double x, double z)
        {
            var y = c.BodyOf(me).position.y;
            return NavMesh.SamplePosition(new Vector3((float)x, y, (float)z), out var hit, 2f, NavMesh.AllAreas) ? hit.position : new Vector3((float)x, y, (float)z);
        }

        // ---- B1, B2, B4, B5, B6, B8 ---------------------------------------------------------------------------------

        [UnityTest, Timeout(1200000)]
        public IEnumerator APlayersTurnShowsTheBandsAPreviewItsCardTheMarksAndUndoesAnUnseenWalk()
        {
            Bootstrap boot = null;
            yield return Boot(x => boot = x);
            var walk = boot.Walkabout;
            Townsperson them = null;
            yield return Fight(walk, x => them = x);
            yield return MyTurn(walk);
            var c = walk.Combat; var b = c.Battle; var me = c.Acting;

            // ---- B1: the bands on the ground, worked out over frames ----
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 15f && !c.ReachReady) yield return null;
            Assert.That(c.ReachReady, Is.True, "the reachable area was worked out");
            Assert.That(c.Overlay.ReachShown, Is.True, "and drawn");
            Assert.That(c.Overlay.ActLines + c.Overlay.DashLines, Is.GreaterThan(0), "with a line where a band ends");
            Assert.That(c.Overlay.ReachVertices, Is.GreaterThan(10));
            Debug.Log($"CombatQolTests: reach {c.ReachMap.Points.Count} points, act {c.ReachMap.ActMetres:0.0} m, dash {c.ReachMap.DashMetres:0.0} m, {c.Overlay.ActLines}+{c.Overlay.DashLines} lines");

            // ---- B6: the turn order, with faces as they are drawn ----
            yield return Wait(1.5f);
            Assert.That(c.Hud.OrderShown, Is.EqualTo(b.Units.Count(u => u.InFight && !u.Surrendered)), "everyone in the order");
            Assert.That(c.Hud.Portraits, Is.GreaterThanOrEqualTo(1), "faces in it");

            // ---- B2: a walk previewed: its path, its card, the AP it would spend ----
            // (a point about 3.5 m off, inside the move-and-act band)
            var p = c.ReachMap.Points.Where(x => x.Act && x.Ap >= 1).OrderBy(x => System.Math.Abs(Tactics.Dist(x.X, x.Z, me.PX, me.PZ) - 3.5)).First();
            var at = Ground(me, c, p.X, p.Z);
            Assert.That(c.PreviewWalk(at), Is.True);
            yield return null;
            Assert.That(c.PreviewCard, Is.Not.Null);
            Assert.That(c.PreviewCard.Ok, Is.True, c.PreviewCard.Why);
            Assert.That(c.Overlay.PathShown, Is.True, "the path on the ground");
            Assert.That(c.Hud.PointShown, Is.True, "the card at its end");
            Assert.That(c.Hud.PointHeadline, Does.Contain(c.PreviewCard.Ap.ToString()), "with its AP");
            Assert.That(c.Hud.PipsSpent, Is.EqualTo(System.Math.Min(c.PreviewCard.Ap, me.C.Ap)), "the AP it spends lit");

            // ---- B4: shields where cover stands at a previewed point ----
            var covered = c.ReachMap.Points.FirstOrDefault(x => b.Geometry.CoverAround(x.X, x.Z).Count > 0);
            if (covered != null)
            {
                c.PreviewWalk(Ground(me, c, covered.X, covered.Z));
                yield return null;
                Assert.That(c.Hud.ShieldsShown, Is.GreaterThan(0), "a shield where the cover is");
            }
            else Debug.LogWarning("CombatQolTests: no cover within reach here; the shields were not looked at");

            // ---- B5: an enemy's held shot drawn and marked; an eye on whoever would see the previewed point; intents ----
            var foe = b.Units.First(u => u.Hostile && u.InFight);
            foe.C.Ap = CombatRules.MaxAp(foe.C);
            Assert.That(b.Overwatch(foe), Is.True, "they hold a shot");
            c.Redraw();
            var seen = c.ReachMap.Points.FirstOrDefault(x => b.SeesPoint(foe, x.X, x.Z));
            Assert.That(seen, Is.Not.Null, "somewhere in reach they see");
            c.PreviewWalk(Ground(me, c, seen.X, seen.Z));
            t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 5f && (c.Hud.Marks().Watching == 0 || c.Hud.Marks().Eyes == 0)) yield return null;
            Assert.That(c.Overlay.WatchesShown, Is.True, "their held shot on the ground");
            Assert.That(c.Hud.Marks().Watching, Is.GreaterThanOrEqualTo(1), "and marked over them");
            Assert.That(c.Hud.Marks().Eyes, Is.GreaterThanOrEqualTo(1), "an eye: they would see the point");
            Assert.That(c.PreviewCard.SeenBy, Is.GreaterThanOrEqualTo(1));
            var seenByUs = b.EnemiesOf(foe).Any(o => b.Sees(o, foe));
            if (Intents.Shown(b.Difficulty, foe, seenByUs))
            {
                t0 = Time.realtimeSinceStartup;
                while (Time.realtimeSinceStartup - t0 < 5f && !c.IntentsShown.ContainsKey(foe)) yield return null;
                Assert.That(c.IntentsShown.ContainsKey(foe), Is.True, "their intent worked out (shown at this difficulty)");
            }
            else Debug.LogWarning($"CombatQolTests: {foe.C.Name}'s intent is not shown here ({b.Difficulty.Id}, seen {seenByUs})");

            // ---- B8: a walk nobody saw (they are blinded) goes with a second tap, and is undone ----
            foreach (var h in b.Units.Where(u => u.Hostile)) Status.Add(h.C, Status.Blinded, 3);
            var start = c.BodyOf(me).position;
            var ap = me.C.Ap;
            var go = Ground(me, c, p.X, p.Z);
            c.CancelPreview();
            Assert.That(c.PreviewCard, Is.Null, "nothing previewed");
            c.TapGround(go);
            Assert.That(c.PreviewCard, Is.Not.Null, "the first tap previews");
            c.TapGround(go);
            yield return Played(c, me);
            Assert.That(Flat(c.BodyOf(me).position, go), Is.LessThan(1.2f), "walked there");
            Assert.That(me.C.Ap, Is.LessThan(ap), "the walk's AP spent");
            Assert.That(c.UndoReady, Is.True, "nobody saw it: it can be undone");
            yield return null;
            BootTests.Press(c.Hud.ActionButton("undo"));
            yield return null;
            Assert.That(Flat(c.BodyOf(me).position, start), Is.LessThan(0.6f), "back where they stood");
            Assert.That(me.C.Ap, Is.EqualTo(ap), "the AP back");
            Assert.That(c.UndoReady, Is.False, "once");
            Assert.That(c.PlayersTurn, Is.True, "still their turn");
        }

        // ---- B3, B5, B7, A9 -------------------------------------------------------------------------------------

        [UnityTest, Timeout(1200000)]
        public IEnumerator TheShotCardListsItsReasonsAThrowShowsItsFootprintAndAHitFloatsItsNumber()
        {
            Bootstrap boot = null;
            yield return Boot(x => boot = x);
            var walk = boot.Walkabout;
            Townsperson them = null;
            yield return Fight(walk, x => them = x);
            yield return MyTurn(walk);
            var c = walk.Combat; var b = c.Battle; var me = c.Acting;
            var foe = b.Units.First(u => u.Hostile && u.InFight);
            var cam = walk.Stage.Camera;

            // ---- B5: a throw aimed at their feet: its footprint, arc and card; put away again ----
            BootTests.Press(c.Hud.ActionButton("throw"));
            Assert.That(c.Throwing, Is.EqualTo("w_frag"), "aiming the frag");
            Assert.That(c.AimThrow(c.BodyOf(foe).position), Is.True);
            yield return null;
            Assert.That(c.ThrowPreview, Is.Not.Null);
            Assert.That(c.Overlay.AreaShown, Is.True, "the footprint on the ground");
            Assert.That(c.Hud.PointShown, Is.True, "the throw's card");
            BootTests.Press(c.Hud.ActionButton("throw"));
            Assert.That(c.Throwing, Is.Null, "put away");
            Assert.That(c.Overlay.AreaShown, Is.False);

            // ---- B3: the radial over them and the card with the reasons behind the odds ----
            var s = cam.WorldToScreenPoint(c.BodyOf(foe).position + Vector3.up * 1.2f);
            c.Target(foe, new Vector2(s.x, s.y));
            yield return null;
            Assert.That(c.LastRadial, Is.Not.Null);
            Assert.That(c.LastRadial.IsOpen, Is.True, "the radial over them");
            Assert.That(c.LastRadial.VerbButton("attack"), Is.Not.Null);
            Assert.That(c.LastRadial.VerbButton("aim_head"), Is.Not.Null, "called shots for a gun");
            Assert.That(c.LastRadial.VerbButton("suppress"), Is.Not.Null);
            Assert.That(c.Hud.CardShown, Is.True, "the shot card");
            Assert.That(c.Hud.CardReasons, Is.GreaterThanOrEqualTo(2), "with its reasons (the skill, their reflexes, ...)");
            Assert.That(c.Hud.CardChance, Does.Contain("%"));
            var preview = b.Preview(me, foe, ShotOptions.Snap);
            Debug.Log($"CombatQolTests: the shot {preview.Hit} ({(preview.Ok ? "ok" : preview.Reason)})");

            // ---- B7, A9: the attack floats its number (or a miss); the camera frames it and eases back ----
            var before = c.Hud.FloatsShown;
            if (preview.Ok)
            {
                c.LastRadial.Choose("attack");
                var framed = false;
                var t0 = Time.realtimeSinceStartup;
                yield return null;
                while (Time.realtimeSinceStartup - t0 < 30f && c.Active && !(c.PlayersTurn && c.Acting == me) && b.Current == me) { framed |= c.CameraDirector.Framing; yield return null; }
                Assert.That(c.Hud.FloatsShown, Is.GreaterThan(before), "a number (or a miss) floated up");
                Assert.That(c.Hud.LastFloat, Is.Not.Null.And.Not.Empty);
                Assert.That(framed, Is.True, "the camera framed the shot");
                Assert.That(c.CameraDirector.Framing, Is.False, "and eased back after");
                Assert.That(walk.Rig.Pitch, Is.InRange(OrbitRig.MinPitch - 0.5f, OrbitRig.MaxPitch + 0.5f), "overhead throughout");
            }
            else
            {
                c.LastRadial.Close();
                Assert.Inconclusive($"no shot at the nearest person from here ({preview.Reason})");
            }
            Assert.That(c.Hud.CardShown, Is.False, "the card goes with the radial");
        }

        // ---- B8, B9 ---------------------------------------------------------------------------------------------

        [UnityTest, Timeout(1200000)]
        public IEnumerator EndTurnAsksAgainAndSkipCutsTheOtherSidesShow()
        {
            Bootstrap boot = null;
            yield return Boot(x => boot = x);
            var walk = boot.Walkabout;
            Combat.Pace = () => new CombatPace(2f, true);
            Townsperson them = null;
            yield return Fight(walk, x => them = x);
            yield return MyTurn(walk);
            var c = walk.Combat; var me = c.Acting;
            Assert.That(c.CurrentPace.Skip, Is.True, "the settings' skip read");
            Assert.That(me.C.Ap, Is.GreaterThan(0));

            // ---- B8: with AP left, end turn asks again ----
            BootTests.Press(c.Hud.EndTurnButton);
            yield return null;
            Assert.That(c.EndTurnArmed, Is.True, "asked again");
            Assert.That(c.Hud.EndTurnArmed, Is.True, "the button lit");
            Assert.That(c.PlayersTurn && c.Acting == me, Is.True, "the turn goes on");
            BootTests.Press(c.Hud.EndTurnButton);
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 5f && c.PlayersTurn && c.Acting == me) yield return null;
            Assert.That(c.PlayersTurn && c.Acting == me, Is.False, "the second press ends it");

            // ---- B9: their turn plays without the camera framing it, and quickly ----
            var framed = false;
            t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 120f && c.Active && !c.PlayersTurn) { framed |= c.CameraDirector.Framing; yield return null; }
            var took = Time.realtimeSinceStartup - t0;
            Debug.Log($"CombatQolTests: their turn with skip took {took:0.0} s");
            Assert.That(framed, Is.False, "skip: their shots are not framed");
            Assert.That(c.PlayersTurn || !c.Active, Is.True, "their turn ended");
            Assert.That(took, Is.LessThan(60f));
        }
    }
}
