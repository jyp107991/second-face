using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Content;
using SecondFace.Game;
using SecondFace.Game.Play;
using UnityEngine;
using UnityEngine.TestTools;

namespace SecondFace.Tests
{
    /// <summary>TEMP (relaunch 16, never committed; the explicit orders' pre-check, ruled 2026-11-28): the camera's framing in Shale, before
    /// and after the orders: a conversation (the two heads' places on the screen, frame by frame, and settled) and a fight's first turns (the
    /// followed fighter's place on the screen and its step a frame, and the shot framing's two).</summary>
    public class CameraFramingProbeTests
    {
        private static IEnumerator Wait(float s) { var t = Time.realtimeSinceStartup; while (Time.realtimeSinceStartup - t < s) yield return null; }
        private static float Q(List<float> v, float q) { if (v.Count == 0) return float.NaN; var s = v.OrderBy(x => x).ToList(); return s[Mathf.Clamp(Mathf.CeilToInt(q * s.Count) - 1, 0, s.Count - 1)]; }
        private static string D(string what, List<float> v, string unit = "") => $"{what} p50 {Q(v, 0.5f):0.0000}{unit} p98 {Q(v, 0.98f):0.0000}{unit} max {(v.Count > 0 ? v.Max() : float.NaN):0.0000}{unit} (n {v.Count})";

        [UnityTest, Timeout(1800000)]
        public IEnumerator TheCameraFramesAConversationAndAFight()
        {
            LogAssert.ignoreFailingMessages = true;
            Bootstrap boot = null;
            yield return BootTests.Boot(b => boot = b);
            var walk = boot.Walkabout;
            yield return BootTests.TownSettled(() => walk.Townsfolk, "the town's people");
            var cam = boot.Stage.Camera;
            var lines = new List<string>();
            // the conversation: the nearest of the townsfolk with one in the content
            walk.Rig.Recentre(); walk.Rig.Snap();
            var speaker = Object.FindObjectsByType<Interactable>(FindObjectsSortMode.None)
                .Where(i => Registry.Npcs.TryGetValue(i.Id, out var n) && !string.IsNullOrEmpty(n.Dialogue))
                .OrderBy(i => (i.transform.position - walk.Walker.transform.position).sqrMagnitude).FirstOrDefault();
            Assert.That(speaker, Is.Not.Null, "one with a conversation");
            Assert.That(walk.OpenConversation(speaker), Is.True, "it opens");
            yield return null;
            var shots = Object.FindAnyObjectByType<ConversationCamera>();
            Assert.That(shots, Is.Not.Null, "the conversation's camera");
            var px = new List<float>(); var ox = new List<float>(); var py = new List<float>(); var oy = new List<float>(); var mid = new List<float>(); var stepC = new List<float>();
            var lastPos = cam.transform.position;
            string settled = "";
            for (var f = 0; f < 240; f++)
            {
                yield return null;
                if (shots == null) break;
                var vp = cam.WorldToViewportPoint(ConversationCamera.Head(walk.Walker.transform));
                var vo = cam.WorldToViewportPoint(ConversationCamera.Head(speaker.transform));
                var vm = cam.WorldToViewportPoint(shots.Subject);
                if (f >= 120) { px.Add(vp.x); py.Add(vp.y); ox.Add(vo.x); oy.Add(vo.y); mid.Add(Mathf.Abs(vm.x - shots.Frame * 0.5f)); }
                stepC.Add((cam.transform.position - lastPos).magnitude); lastPos = cam.transform.position;
                var pitch = Vector3.Angle(Vector3.ProjectOnPlane(cam.transform.forward, Vector3.up), cam.transform.forward);
                if (f == 239) settled = $"settled: the player's head ({vp.x:0.0000}, {vp.y:0.0000}), {speaker.Title}'s ({vo.x:0.0000}, {vo.y:0.0000}), the middle {vm.x:0.0000} (the free part's middle {shots.Frame * 0.5f:0.000}), pitch {pitch:0.00}°, {Vector3.Distance(cam.transform.position, shots.Subject):0.000} m off the pair";
            }
            lines.Add($"conversation with {speaker.Title}: {settled}");
            lines.Add("  frames 120-239: " + D("the player's head x", px) + "; " + D("y", py));
            lines.Add("  frames 120-239: " + D($"{speaker.Title}'s head x", ox) + "; " + D("y", oy));
            lines.Add("  " + D("the middle off the free part's middle", mid) + "; " + D("the camera's step a frame", stepC, " m"));
            boot.UI.CloseAll();
            yield return Wait(ConversationCamera.Blend + 0.6f);
            // the fight: the tribute raiders, the player's turn played by the AI
            var g = walk.Game;
            foreach (var id in new[] { "npc_rd_t1", "npc_rd_t2", "npc_rd_t3", "npc_rd_t4" }) g.Npcs[id] = new SecondFace.Core.State.NpcSave { Hp = 1 };
            g.SetFlag("tribute_day", true);
            walk.Settle();
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 60f && !walk.People.StandingPeople.Any(p => p != null && p.Def != null && p.Def.Id == "npc_rd_t1")) { PartyTests.Quiet(walk); yield return null; }
            yield return Wait(3f);
            PartyTests.Quiet(walk);
            g.SetFlag("tribute_fight", true);
            walk.Settle();
            t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 30f && !walk.Combat.Active) { PartyTests.Quiet(walk); if (!walk.Busy) walk.Combat.Check(true); yield return Wait(0.5f); }
            Assert.That(walk.Combat.Active, Is.True, "the fight began");
            var off = new List<float>(); var stepV = new List<float>(); var framedOut = 0; var framedFrames = 0; var pitches = new List<float>();
            Vector3? lastVp = null; Transform lastF = null;
            var running = true;
            IEnumerator Play() { while (walk.Combat.Active && running) { if (walk.Combat.PlayersTurn) yield return walk.Combat.PlayerTurnByAi(); yield return null; } }
            var co = walk.StartCoroutine(Play());
            for (var f = 0; f < 1500 && walk.Combat.Active; f++)
            {
                yield return null;
                var dir = walk.Combat.CameraDirector;
                if (dir == null) continue;
                pitches.Add(Vector3.Angle(Vector3.ProjectOnPlane(cam.transform.forward, Vector3.up), cam.transform.forward));
                var fol = dir.Following;
                if (dir.Framing) framedFrames++;
                if (fol == null) { lastVp = null; continue; }
                var vp = cam.WorldToViewportPoint(fol.position + Vector3.up * 1.0f);
                if (vp.z <= 0f || vp.x < 0f || vp.x > 1f || vp.y < 0f || vp.y > 1f) framedOut++;
                off.Add(new Vector2(vp.x - 0.5f, vp.y - 0.5f).magnitude);
                if (lastVp.HasValue && lastF == fol) stepV.Add(new Vector2(vp.x - lastVp.Value.x, vp.y - lastVp.Value.y).magnitude);
                lastVp = vp; lastF = fol;
            }
            running = false;
            lines.Add($"the fight: {off.Count} frames following someone, {framedFrames} framing a shot, {framedOut} with the followed off the screen");
            lines.Add("  " + D("the followed's chest off the screen's middle", off) + "; " + D("its step on the screen a frame", stepV));
            lines.Add("  " + D("the camera's pitch", pitches, "°"));
            if (walk.Combat.Active && walk.Combat.Battle != null) walk.Combat.Battle.Standoff();
            t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 120f && walk.Combat.Active) { if (walk.Combat.PlayersTurn) yield return walk.Combat.PlayerTurnByAi(); yield return null; }
            Debug.Log("CAMERA FRAMING\n" + string.Join("\n", lines));
            System.IO.File.WriteAllLines(System.IO.Path.Combine(Application.dataPath, "..", "test-results", "camera_framing.txt"), lines);
        }
    }
}
