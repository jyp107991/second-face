using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using SecondFace.Game;
using SecondFace.Game.Play;
using SecondFace.Game.World;
using UnityEngine;
using UnityEngine.TestTools;

namespace SecondFace.Tests
{
    /// <summary>TEMP (relaunch 16, never committed; ruled 16:15Z): the same fight twice from the same save and seed, once re-centred and once
    /// with the re-centring switched off: the first AI decision that differs, and the first geometry query whose inputs or result differ.</summary>
    public class FightCourseProbeTests
    {
        private static IEnumerator Wait(float s) { var t = Time.realtimeSinceStartup; while (Time.realtimeSinceStartup - t < s) yield return null; }

        [UnityTest, Timeout(3600000)]
        public IEnumerator TheSameFightReCentredAndNot()
        {
            LogAssert.ignoreFailingMessages = true;   // (a load during a fight leaves the old fight's coroutines to fault once: not this probe's matter)
            Bootstrap boot = null;
            yield return BootTests.Boot(b => boot = b);
            var walk = boot.Walkabout;
            yield return BootTests.TownSettled(() => walk.Townsfolk, "the town's people");
            var g = walk.Game;
            foreach (var id in new[] { "npc_rd_t1", "npc_rd_t2", "npc_rd_t3", "npc_rd_t4" }) g.Npcs[id] = new SecondFace.Core.State.NpcSave { Hp = 1 };
            g.SetFlag("tribute_day", true);
            walk.Settle();
            var t0 = Time.realtimeSinceStartup;
            Townsperson raider = null;
            while (Time.realtimeSinceStartup - t0 < 60f && (raider = walk.People.StandingPeople.FirstOrDefault(p => p != null && p.Def != null && p.Def.Id == "npc_rd_t1")) == null) { PartyTests.Quiet(walk); yield return null; }
            Assert.That(raider, Is.Not.Null, "the raiders came");
            var near = raider.transform.position + (walk.Walker.transform.position - raider.transform.position).normalized * 9f;
            if (UnityEngine.AI.NavMesh.SamplePosition(near, out var nh, 4f, UnityEngine.AI.NavMesh.AllAreas) && walk.Walker.GoTo(nh.position))
            {
                t0 = Time.realtimeSinceStartup;
                while (Time.realtimeSinceStartup - t0 < 60f && walk.Walker.Goal != null) { PartyTests.Quiet(walk); yield return null; }
            }
            yield return Wait(3f);
            PartyTests.Quiet(walk);
            Assert.That(boot.Save("course"), Is.Not.Null, "saved before the fight");
            var runs = new List<(string Start, List<string> Ai, List<string> Geo)>();
            foreach (var recentre in new[] { true, false })
            {
                Assert.That(boot.Load("course"), Is.True, "loaded");
                yield return null;
                t0 = Time.realtimeSinceStartup;
                while (Time.realtimeSinceStartup - t0 < 300f && (boot.Walkabout == null || !boot.Walkabout.Ready || !boot.Walkabout.Placed)) yield return null;
                walk = boot.Walkabout; g = walk.Game;
                if (boot.Stage.Clock != null) { boot.Stage.Clock.Minutes = g.Minutes; boot.Stage.Clock.Paused = true; }
                yield return BootTests.TownSettled(() => walk.Townsfolk, "the town's people");
                t0 = Time.realtimeSinceStartup;
                while (Time.realtimeSinceStartup - t0 < 60f && !walk.People.StandingPeople.Any(p => p != null && p.Def != null && p.Def.Id == "npc_rd_t1")) { PartyTests.Quiet(walk); yield return null; }
                yield return Wait(5f);
                PartyTests.Quiet(walk);
                Combat.RecentringTemp = recentre;
                // (the standoff that ended the first run keeps the town quiet for a minute: not for this probe)
                typeof(Combat).GetField("_quietUntil", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)?.SetValue(walk.Combat, -100f);
                var ai = new List<string>();
                void Grab(string msg, string st, LogType lt) { if (msg.StartsWith("Combat AI:") || msg.StartsWith("Combat log:") || msg.StartsWith("Combat:")) ai.Add(System.Text.RegularExpressions.Regex.Replace(msg, @" at [\d.]+s \([\d.]+ ms\)", "")); }
                Application.logMessageReceived += Grab;
                Combat.GeoTraceTemp = new List<string>();
                g.SetFlag("tribute_fight", true);
                walk.Settle();
                t0 = Time.realtimeSinceStartup;
                while (Time.realtimeSinceStartup - t0 < 30f && !walk.Combat.Active) { PartyTests.Quiet(walk); if (!walk.Busy) walk.Combat.Check(true); yield return Wait(0.5f); }
                Assert.That(walk.Combat.Active, Is.True, "the fight began");
                yield return null;
                var start = $"offset ({WorldOrigin.OX}, {WorldOrigin.OZ}), re-centred by {walk.Combat.LastRecentre}, seed {g.RngState}; units: " +
                            string.Join("; ", walk.Combat.Battle.Units.Select(u => $"{u.C.Id} {u.PX:R},{u.PZ:R} hp {u.C.Sheet.Hp}"));
                var decisions = 0;
                t0 = Time.realtimeSinceStartup;
                while (Time.realtimeSinceStartup - t0 < 400f && walk.Combat.Active && ai.Count(l => l.StartsWith("Combat AI:")) < 40)
                {
                    if (walk.Combat.PlayersTurn) yield return walk.Combat.PlayerTurnByAi();
                    yield return null;
                    decisions = ai.Count(l => l.StartsWith("Combat AI:"));
                }
                Application.logMessageReceived -= Grab;
                runs.Add((start, ai, Combat.GeoTraceTemp));
                // (the fight ended before the next load: a standoff, then its last turn played out)
                Combat.GeoTraceTemp = null;
                if (walk.Combat.Active && walk.Combat.Battle != null) walk.Combat.Battle.Standoff();
                t0 = Time.realtimeSinceStartup;
                while (Time.realtimeSinceStartup - t0 < 120f && walk.Combat.Active) { if (walk.Combat.PlayersTurn) yield return walk.Combat.PlayerTurnByAi(); yield return null; }
                Assert.That(walk.Combat.Active, Is.False, "the fight ended before the next load");
                Combat.GeoTraceTemp = null;
                Debug.Log($"FIGHT COURSE run re-centred {recentre}: {decisions} decisions, {runs[runs.Count - 1].Geo.Count} geometry queries; start: {start}");
            }
            Combat.RecentringTemp = true;
            var lines = new List<string> { "A (re-centred) start: " + runs[0].Start, "B (not re-centred) start: " + runs[1].Start };
            // the logical starts: the units and their places, compared
            var aiA = runs[0].Ai; var aiB = runs[1].Ai;
            var k = 0;
            while (k < aiA.Count && k < aiB.Count && aiA[k] == aiB[k]) k++;
            lines.Add($"the AI and the battle's log alike for {k} lines (of {aiA.Count} and {aiB.Count})");
            for (var i = System.Math.Max(0, k - 3); i < System.Math.Min(System.Math.Max(aiA.Count, aiB.Count), k + 3); i++)
                lines.Add($"  [{i}] A: {(i < aiA.Count ? aiA[i] : "-")}\n       B: {(i < aiB.Count ? aiB[i] : "-")}");
            var gA = runs[0].Geo; var gB = runs[1].Geo;
            var j = 0;
            while (j < gA.Count && j < gB.Count && gA[j] == gB[j]) j++;
            lines.Add($"the geometry queries alike for {j} (of {gA.Count} and {gB.Count})");
            for (var i = System.Math.Max(0, j - 2); i < System.Math.Min(System.Math.Max(gA.Count, gB.Count), j + 4); i++)
                lines.Add($"  [{i}] A: {(i < gA.Count ? gA[i] : "-")}\n       B: {(i < gB.Count ? gB[i] : "-")}");
            System.IO.File.WriteAllLines(System.IO.Path.Combine(Application.dataPath, "..", "test-results", "fight_course.txt"), lines);
            System.IO.File.WriteAllLines(System.IO.Path.Combine(Application.dataPath, "..", "test-results", "fight_course_geoA.txt"), gA);
            System.IO.File.WriteAllLines(System.IO.Path.Combine(Application.dataPath, "..", "test-results", "fight_course_geoB.txt"), gB);
            Debug.Log("FIGHT COURSE\n" + string.Join("\n", lines));
        }
    }
}
