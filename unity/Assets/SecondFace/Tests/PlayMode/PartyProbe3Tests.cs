using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Content;
using SecondFace.Core.Npc;
using SecondFace.Core.Save;
using SecondFace.Core.State;
using SecondFace.Core.Stats;
using SecondFace.Core.World;
using SecondFace.Game;
using SecondFace.Game.People;
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
    /// The party in the world (<see cref="PartyFollowers"/>), at Shale as the phone plays it: a companion who joins stands
    /// near the player in a body the world made for them, walks and jogs with the player over 30 m by the townsfolk's own
    /// locomotion and ends a few metres off, never inside the player and never jumping; the HUD's party strip shows them
    /// with their face, name and health; a fight takes them as the player's side; dismissed with a bare "wait here" they
    /// stay where they were left, and a save and a load bring them back to that spot; asked back they come; leaving the road
    /// they walk off and are gone, and stand nowhere as a follower or a waiting figure after.
    /// </summary>
    /// <summary>TEMP (relaunch 16, never committed): the follower's steps past their top speed, traced (the agent's velocity, its desired
    /// velocity, the other agents about, the corner); the test ends after the first walk.</summary>
    public class PartyProbe3Tests
    {
        /// <summary>The game this test booted, gone after it (left running, its world NavMesh turned every later test's
        /// places' own off: PlacePlayTests failed after it, 2026-11-16).</summary>
        [UnityTearDown]
        public IEnumerator CleanUp() => BootTests.Clear();

        /// <summary>A companion whose own placement no longer holds once they have joined (their join sets the flag it
        /// waits on), so a wait leaves them where they stood.</summary>
        private const string Companion = "npc_of_03", Joined = "ash_joined";

        private static string SavesDir => Path.Combine(Application.temporaryCachePath, "party-tests-saves");

        private static IEnumerator Wait(float seconds) { var t = Time.realtimeSinceStartup; while (Time.realtimeSinceStartup - t < seconds) yield return null; }
        private static float Flat(Vector3 a, Vector3 b) { a.y = 0; b.y = 0; return Vector3.Distance(a, b); }

        /// <summary>A new game at Shale, from the title through creation, until the walker stands on the NavMesh.</summary>
        internal static IEnumerator Boot(System.Action<Bootstrap> done)
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

        /// <summary>Whatever conversation the moment brought (a trigger, someone come to say a word) closed: the party's
        /// moves are what is tested here.</summary>
        internal static void Quiet(Walkabout walk)
        {
            if (walk.Conversation != null && walk.Conversation.IsOpen) walk.Conversation.Close();
        }

        /// <summary>A walkable point about <paramref name="metres"/> m off with a whole path to it (null when none).</summary>
        private static Vector3? Away(Vector3 from, Vector3 forward, float metres)
        {
            forward.y = 0f;
            if (forward.sqrMagnitude < 1e-4f) forward = Vector3.forward;
            var path = new NavMeshPath();
            for (var k = 0; k < 15; k++)
            {
                var dir = Quaternion.Euler(0f, k * 24f, 0f) * forward.normalized;
                if (!NavMesh.SamplePosition(from + dir * metres, out var hit, 3f, NavMesh.AllAreas)) continue;
                if (Flat(hit.position, from) < metres * 0.8f) continue;
                if (!NavMesh.CalculatePath(from, hit.position, NavMesh.AllAreas, path) || path.status != NavMeshPathStatus.PathComplete) continue;
                var length = 0f;
                for (var i = 1; i < path.corners.Length; i++) length += Vector3.Distance(path.corners[i - 1], path.corners[i]);
                if (length < metres * 1.5f) return hit.position;
            }
            return null;
        }

        /// <summary>Walks the walker to a point, watching a follower every frame: the nearest they came to the player, the
        /// largest jump in a frame (a placement in view), and the highest pace their locomotion was set to.</summary>
        private sealed class Watch
        {
            public float Nearest = float.MaxValue, Pace;
            /// <summary>The frame whose step went furthest past what the follower can walk in it: by how much (m; at or under
            /// nought, a walk), the step and what their top speed walks in that frame.</summary>
            public float Excess = float.NegativeInfinity, Step, Allow;
        }

        /// <summary>
        /// A follower's step each frame against what they can walk in it: measured in LateUpdate, after the frame's
        /// navigation has moved them (the agent moves in the frame's AI update, before the scripts' LateUpdate, by that frame's
        /// time step), against their top speed times the frame's <see cref="Time.deltaTime"/>. The top speed is the agent's
        /// configured speed now or the fastest the party sends a follower at, <see cref="Walker.JogSpeed"/> (PartyFollowers
        /// uses only the walker's walk and jog), whichever is more; the only allowance beyond it is float32's spacing at their
        /// distance from the world's origin (each coordinate of the two positions rounded to it: 2 of its steps; 2 mm in
        /// Shale, 16 km out). A step past that is a placement, not a walk. A fixed 1 m a frame failed on a slow runner's
        /// 440-590 ms frames as the companion jogged (1.067 m, CI on 71ce5403, 2026-11-28).
        /// </summary>
        [DefaultExecutionOrder(10000)]
        private sealed class StepWatch : MonoBehaviour
        {
            public Townsperson Follower;
            public Watch Into;
            private Vector3 _last;
            private bool _have;
            public static readonly List<string> Lines = new();
            public static int Frames; public static float MaxVRatio;

            private static float Spacing(float v)
            {
                v = Mathf.Abs(v);
                return v < 1e-30f ? 0f : Mathf.Pow(2f, Mathf.Floor(Mathf.Log(v, 2f)) - 23f);
            }

            private void LateUpdate()
            {
                if (Follower == null || Into == null) { _have = false; return; }
                var p = Follower.transform.position;
                var agent = Follower.Agent;
                if (_have && agent != null && agent.enabled)
                {
                    var step = Flat(p, _last);
                    var allow = Mathf.Max(agent.speed, Walker.JogSpeed) * Time.deltaTime + 2f * Spacing(Mathf.Max(Mathf.Abs(p.x), Mathf.Abs(p.z)));
                    if (step - allow > Into.Excess) { Into.Excess = step - allow; Into.Step = step; Into.Allow = allow; }
                    var v = agent.velocity; v.y = 0f; var dv = agent.desiredVelocity; dv.y = 0f;
                    Frames++; MaxVRatio = Mathf.Max(MaxVRatio, v.magnitude / agent.speed);
                    var top = Mathf.Max(agent.speed, Walker.JogSpeed) * Time.deltaTime;
                    if (step > top && Lines.Count < 60)
                    {
                        var d = p - _last; d.y = 0f;
                        var nearest = float.MaxValue; var who = "";
                        foreach (var o in Object.FindObjectsByType<NavMeshAgent>(FindObjectsSortMode.None))
                        {
                            if (o == agent || !o.isActiveAndEnabled) continue;
                            var dd = Flat(o.transform.position, p);
                            if (dd < nearest) { nearest = dd; who = $"{o.name} r {o.radius:0.00} prio {o.avoidancePriority}"; }
                        }
                        Lines.Add($"frame {Time.frameCount}: dt {Time.deltaTime:0.00000}, step {step:0.000000} m, top x dt {top:0.000000}, |v| x dt {v.magnitude * Time.deltaTime:0.000000} (|v| {v.magnitude:0.0000}, speed {agent.speed:0.00}, accel {agent.acceleration:0.0}), |desired| {dv.magnitude:0.0000}, angle(step, v) {Vector3.Angle(d, v):0.00} deg, nextPosition-position {(agent.nextPosition - p).magnitude:0.000000}, the corner {Flat(p, agent.steeringTarget):0.000} m, remaining {agent.remainingDistance:0.00}, own r {agent.radius:0.00} prio {agent.avoidancePriority} avoid {agent.obstacleAvoidanceType}, nearest agent {nearest:0.000} m ({who}), dy {p.y - _last.y:0.0000}");
                    }
                }
                _last = p; _have = true;
            }
        }

        // (TEMP: the follower's root at checkpoints through LateUpdate, by execution order, every frame)
        internal static readonly int[] Orders = { -31000, -100, -25, -15, -5, 0, 1, 6, 9, 11, 20, 31, 100, 1000, 31000 };
        internal static readonly List<(int F, float Dt, Vector3[] P, Vector3[] N, Vector3 V)> Marks = new();
        internal static Townsperson Traced;
        private static void Mark(int k)
        {
            if (Traced == null || Traced.Agent == null) return;
            if (Marks.Count == 0 || Marks[Marks.Count - 1].F != Time.frameCount) Marks.Add((Time.frameCount, Time.deltaTime, new Vector3[Orders.Length], new Vector3[Orders.Length], Traced.Agent.velocity));
            var m = Marks[Marks.Count - 1];
            m.P[k] = Traced.transform.position; m.N[k] = Traced.Agent.nextPosition;
        }
        [DefaultExecutionOrder(-31000)] internal sealed class CP_M31000 : MonoBehaviour { private void LateUpdate() => Mark(0); }
        [DefaultExecutionOrder(-100)] internal sealed class CP_M100 : MonoBehaviour { private void LateUpdate() => Mark(1); }
        [DefaultExecutionOrder(-25)] internal sealed class CP_M25 : MonoBehaviour { private void LateUpdate() => Mark(2); }
        [DefaultExecutionOrder(-15)] internal sealed class CP_M15 : MonoBehaviour { private void LateUpdate() => Mark(3); }
        [DefaultExecutionOrder(-5)] internal sealed class CP_M5 : MonoBehaviour { private void LateUpdate() => Mark(4); }
        [DefaultExecutionOrder(0)] internal sealed class CP_P0 : MonoBehaviour { private void LateUpdate() => Mark(5); }
        [DefaultExecutionOrder(1)] internal sealed class CP_P1 : MonoBehaviour { private void LateUpdate() => Mark(6); }
        [DefaultExecutionOrder(6)] internal sealed class CP_P6 : MonoBehaviour { private void LateUpdate() => Mark(7); }
        [DefaultExecutionOrder(9)] internal sealed class CP_P9 : MonoBehaviour { private void LateUpdate() => Mark(8); }
        [DefaultExecutionOrder(11)] internal sealed class CP_P11 : MonoBehaviour { private void LateUpdate() => Mark(9); }
        [DefaultExecutionOrder(20)] internal sealed class CP_P20 : MonoBehaviour { private void LateUpdate() => Mark(10); }
        [DefaultExecutionOrder(31)] internal sealed class CP_P31 : MonoBehaviour { private void LateUpdate() => Mark(11); }
        [DefaultExecutionOrder(100)] internal sealed class CP_P100 : MonoBehaviour { private void LateUpdate() => Mark(12); }
        [DefaultExecutionOrder(1000)] internal sealed class CP_P1000 : MonoBehaviour { private void LateUpdate() => Mark(13); }
        [DefaultExecutionOrder(31000)] internal sealed class CP_P31000 : MonoBehaviour { private void LateUpdate() => Mark(14); }
        private static string Checkpoints()
        {
            static float F(Vector3 a, Vector3 b) { a.y = 0f; b.y = 0f; return Vector3.Distance(a, b); }
            var lines = new List<string>();
            var over = new int[Orders.Length]; var worst = new float[Orders.Length]; var off = new float[Orders.Length]; var moves = new float[Orders.Length];
            var shown = 0;
            for (var i = 0; i < Marks.Count; i++)
            {
                var b = Marks[i];
                for (var k = 0; k < Orders.Length; k++) off[k] = Mathf.Max(off[k], F(b.N[k], b.P[k]));
                for (var k = 1; k < Orders.Length; k++) moves[k] = Mathf.Max(moves[k], F(b.P[k], b.P[k - 1]));
                if (i == 0 || Marks[i - 1].F != b.F - 1) continue;
                var a = Marks[i - 1];
                var top = 3.2f * b.Dt;
                var any = false;
                for (var k = 0; k < Orders.Length; k++) { var st = F(b.P[k], a.P[k]); if (st > top) { over[k]++; any = true; } worst[k] = Mathf.Max(worst[k], st - top); }
                if (any && shown < 12)
                {
                    shown++;
                    var parts = new List<string>();
                    for (var k = 1; k < Orders.Length; k++) { var mv = F(b.P[k], b.P[k - 1]); if (mv > 1e-6f) parts.Add($"{Orders[k - 1]}->{Orders[k]} {mv * 1000f:0.0000} mm"); }
                    lines.Add($"f{b.F} dt {b.Dt:0.0000}: the root moved within LateUpdate: {(parts.Count == 0 ? "nowhere" : string.Join(", ", parts))}; agent-transform xz at -31000 {F(b.N[0], b.P[0]) * 1000f:0.0000} mm, at 31000 {F(b.N[Orders.Length - 1], b.P[Orders.Length - 1]) * 1000f:0.0000} mm");
                }
            }
            var head = new List<string>();
            for (var k = 0; k < Orders.Length; k++) head.Add($"{Orders[k]}: over {over[k]}, most over {worst[k] * 1000f:0.000} mm, agent-transform xz up to {off[k] * 1000f:0.0000} mm" + (k > 0 ? $", moved since the last checkpoint up to {moves[k] * 1000f:0.0000} mm" : ""));
            return $"{Marks.Count} frames\n" + string.Join("\n", head) + "\n" + string.Join("\n", lines);
        }

        private static StepWatch Steps(Townsperson follower, Watch watch)
        {
            if (follower == null) return null;
            var w = new GameObject("party test: step watch").AddComponent<StepWatch>();
            w.Follower = follower; w.Into = watch;
            return w;
        }

        private static void Done(StepWatch w) { if (w != null) Object.Destroy(w.gameObject); }

        private static IEnumerator WalkTo(Walkabout walk, Vector3 to, Townsperson follower, Watch watch, float timeout = 45f)
        {
            Assert.That(walk.Walker.GoTo(to), Is.True, $"the walker can go to {to}");
            var anim = follower != null ? follower.Animator : null;
            var steps = Steps(follower, watch);
            var t0 = Time.realtimeSinceStartup;
            yield return null;
            while (Time.realtimeSinceStartup - t0 < timeout && walk.Walker != null && walk.Walker.Goal != null)
            {
                Quiet(walk);
                if (follower != null)
                {
                    var p = follower.transform.position;
                    watch.Nearest = Mathf.Min(watch.Nearest, Flat(p, walk.Walker.transform.position));
                    if (anim != null) watch.Pace = Mathf.Max(watch.Pace, anim.GetFloat("Speed"));
                }
                yield return null;
            }
            Done(steps);
            Assert.That(walk.Walker.Goal, Is.Null, $"the walker arrived ({Flat(walk.Walker.transform.position, to):0.0} m short)");
        }

        /// <summary>Waits for a follower to settle (stopped) after the walker has, watching them as they come.</summary>
        private static IEnumerator Settled(Walkabout walk, Townsperson follower, Watch watch, float timeout = 12f)
        {
            var t0 = Time.realtimeSinceStartup;
            var steps = Steps(follower, watch);
            var still = 0f;
            while (Time.realtimeSinceStartup - t0 < timeout && still < 1f)
            {
                var p = follower.transform.position;
                watch.Nearest = Mathf.Min(watch.Nearest, Flat(p, walk.Walker.transform.position));
                still = follower.Agent != null && follower.Agent.enabled && follower.Agent.velocity.magnitude < 0.05f ? still + Time.deltaTime : 0f;
                yield return null;
            }
            Done(steps);
        }

        private static int HudShown(Bootstrap boot) => boot.Hud.Party.Children().Count(c => c.resolvedStyle.display == DisplayStyle.Flex);

        [UnityTest, Timeout(1800000)]
        public IEnumerator TheCompanyFollowsFightsWaitsAndLeaves()
        {
            Bootstrap boot = null;
            yield return Boot(b => boot = b);
            var walk = boot.Walkabout;
            var g = walk.Game;
            Assert.That(walk.Party, Is.Not.Null, "the party in the world");
            Assert.That(Registry.Npcs.ContainsKey(Companion), Is.True, "the companion is in the content");
            var def = Registry.Npcs[Companion];

            // ---- a companion joins: they stand near the player, made as the world makes a named person ----
            Logic.Apply(Logic.Fx($"[{{ 'join': '{Companion}' }}, {{ 'set': '{Joined}' }}]"), g, walk.Quests);
            walk.Settle();
            Townsperson follower = null;
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 30f)
            {
                Quiet(walk);
                follower = walk.Party.Of(Companion);
                if (follower != null && follower.Agent != null && follower.Agent.enabled && follower.Agent.isOnNavMesh
                    && Flat(follower.transform.position, walk.Walker.transform.position) < 6f) break;
                yield return null;
            }
            Assert.That(follower, Is.Not.Null, "the companion stands in the world");
            Assert.That(walk.Party.ModeOf(Companion), Is.EqualTo(PartyFollowers.Mode.Following));
            Assert.That(Flat(follower.transform.position, walk.Walker.transform.position), Is.LessThan(6f), "near the player");
            Assert.That(follower.Agent.isOnNavMesh, Is.True, "on the NavMesh");
            var anim = follower.Animator;
            Assert.That(anim, Is.Not.Null, "a body with an animator");
            Assert.That(anim.runtimeAnimatorController, Is.SameAs(boot.World.Locomotion), "the game's locomotion");
            Assert.That(anim.applyRootMotion, Is.False, "no root motion: the agent moves them");
            Assert.That(anim.GetComponent<Ambient>(), Is.Not.Null, "their own idle and gestures");
            Assert.That(anim.GetComponent<FootPlant>(), Is.Not.Null, "feet on the ground");
            Assert.That(anim.GetComponent<Gaze>(), Is.Not.Null, "their gaze");
            Assert.That(follower.GetComponent<Interactable>().Verbs, Does.Contain("talk"), "they can be talked to");
            Assert.That(walk.Party.Following, Is.EqualTo(new[] { follower }));
            Assert.That(g.Companions[Companion].Sheet, Is.Not.Null, "their sheet travels with them");

            // ---- the HUD lists them: their face, their name, their health ----
            yield return Wait(2.5f);
            var strip = boot.HudState.Party;
            Assert.That(strip.Count, Is.EqualTo(2), "the player and the companion");
            Assert.That(strip[1].Name, Is.EqualTo(def.Name));
            Assert.That(strip[1].Portrait, Is.Not.Null, "their portrait");
            Assert.That(strip[1].MaxHp, Is.EqualTo(Sheet.Derived(g.Companions[Companion].Sheet).MaxHp));
            Assert.That(strip[1].Hp, Is.EqualTo(g.Companions[Companion].Sheet.Hp));
            Assert.That(strip[0].MaxHp, Is.EqualTo(Sheet.Derived(g.Pc.Sheet).MaxHp), "the player's own health too");
            Assert.That(HudShown(boot), Is.EqualTo(2), "two faces in the strip");

            // ---- the player walks 30 m (a jog, as a tap that far sends them): the companion keeps up ----
            var dest = Away(walk.Walker.transform.position, walk.Walker.transform.forward, 30f);
            Assert.That(dest.HasValue, Is.True, "somewhere 30 m off to walk to");
            var watch = new Watch();
            var cps = new GameObject("party probe: checkpoints"); cps.AddComponent<CP_M31000>(); cps.AddComponent<CP_M100>(); cps.AddComponent<CP_M25>(); cps.AddComponent<CP_M15>(); cps.AddComponent<CP_M5>(); cps.AddComponent<CP_P0>(); cps.AddComponent<CP_P1>(); cps.AddComponent<CP_P6>(); cps.AddComponent<CP_P9>(); cps.AddComponent<CP_P11>(); cps.AddComponent<CP_P20>(); cps.AddComponent<CP_P31>(); cps.AddComponent<CP_P100>(); cps.AddComponent<CP_P1000>(); cps.AddComponent<CP_P31000>(); 
            Marks.Clear(); Traced = follower;
            yield return WalkTo(walk, dest.Value, follower, watch);
            yield return Settled(walk, follower, watch);
            Traced = null; Object.Destroy(cps);
            Debug.Log("PARTY PROBE3 checkpoints: " + Checkpoints());
            var gap = Flat(follower.transform.position, walk.Walker.transform.position);
            Debug.Log($"PARTY PROBE frames {StepWatch.Frames}, max |v|/speed {StepWatch.MaxVRatio:0.00000}, over the top speed: {StepWatch.Lines.Count}\n" + string.Join("\n", StepWatch.Lines));
            Debug.Log($"PartyTests: after 30 m the companion stands {gap:0.00} m off (nearest {watch.Nearest:0.00} m, the step furthest past its frame's walk {watch.Step:0.000} m against {watch.Allow:0.000}, top pace {watch.Pace:0.00})");
            yield break;
#pragma warning disable CS0162
            Assert.That(gap, Is.LessThanOrEqualTo(4f), "kept up: a few metres off when the player stops");
            Assert.That(gap, Is.GreaterThan(0.9f), "beside, not on top of the player");
            Assert.That(watch.Nearest, Is.GreaterThan(0.45f), "never inside the player");
            Assert.That(watch.Excess, Is.LessThanOrEqualTo(0f), $"walked the whole way (no jump in view): a step of {watch.Step:0.000} m in a frame its top speed walks {watch.Allow:0.000} m in");
            Assert.That(watch.Pace, Is.GreaterThan(1f), "their legs went at the pace (the locomotion's Speed)");

            // ---- a fight: they are among the player's side; down, they get up, never dead ----
            foreach (var id in new[] { "npc_rd_t1", "npc_rd_t2", "npc_rd_t3", "npc_rd_t4" }) g.Npcs[id] = new NpcSave { Hp = 1 };
            g.SetFlag("tribute_day", true);
            walk.Settle();
            Townsperson raider = null;
            t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 60f && (raider = walk.People.StandingPeople.FirstOrDefault(p => p != null && p.Def != null && p.Def.Id == "npc_rd_t1")) == null)
            {
                Quiet(walk);
                yield return null;
            }
            Assert.That(raider, Is.Not.Null, "the raiders came to the town");
            var near = raider.transform.position + (walk.Walker.transform.position - raider.transform.position).normalized * 9f;
            if (NavMesh.SamplePosition(near, out var nh, 4f, NavMesh.AllAreas)) yield return WalkTo(walk, nh.position, follower, new Watch(), 60f);
            yield return Settled(walk, follower, new Watch());
            g.SetFlag("tribute_fight", true);
            walk.Settle();
            t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 30f && !walk.Combat.Active)
            {
                Quiet(walk);
                if (!walk.Busy) walk.Combat.Check(true);
                yield return Wait(0.5f);
            }
            Assert.That(walk.Combat.Active, Is.True, "the fight began");
            Assert.That(walk.Combat.CompanionsFighting, Does.Contain(Companion), "the companion fights");
            Assert.That(walk.Combat.Allies, Does.Contain(Companion).And.Contain("pc"), "on the player's side");
            t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 600f && walk.Combat.Active)
            {
                if (walk.Combat.PlayersTurn) yield return walk.Combat.PlayerTurnByAi();
                yield return null;
            }
            Assert.That(walk.Combat.Active, Is.False, "the fight ended");
            yield return Wait(3f);
            Quiet(walk);
            Assert.That(walk.Walker, Is.Not.Null, "the player was not beaten out of the game");
            Assert.That(g.World.Party, Does.Contain(Companion), "still with the player");
            Assert.That(g.Companions[Companion].Sheet.Hp, Is.GreaterThan(0), "never dead");
            Assert.That(g.Npcs.TryGetValue(Companion, out var dead) && dead.Dead == true, Is.False, "never written dead");
            Assert.That(walk.Party.Of(Companion), Is.SameAs(follower), "the same body, following again");
            yield return Wait(4f);   // (up from the ground, if they went down)
            Assert.That(walk.Party.ModeOf(Companion), Is.EqualTo(PartyFollowers.Mode.Following));

            // ---- "wait here": they stay where they were left ----
            Logic.Apply(Logic.Fx($"[{{ 'leave': '{Companion}' }}]"), g, walk.Quests);
            walk.Settle();
            yield return Wait(1f);
            Assert.That(Party.StateOf(g, Companion), Is.EqualTo(CompanionState.Waiting));
            {
                var body = walk.Party.Of(Companion);
                var rag = body != null && body.Animator != null ? body.Animator.GetComponent<Ragdoll>() : null;
                Assert.That(walk.Party.ModeOf(Companion), Is.EqualTo(PartyFollowers.Mode.Waiting),
                    $"waiting where they stood (held {body?.Held}, fallen {rag?.Fallen}, blending {rag?.Blending}, content places them {Party.PlacedByContent(g, Companion)}, in party {g.World.Party.Contains(Companion)})");
            }
            var left = follower.transform.position;
            var spot = Party.Spot(g, Companion);
            Assert.That(spot != null && spot.HasPoint, Is.True, "their spot is in the game");
            Assert.That(Flat(new Vector3(spot.X, spot.Y, spot.Z), left), Is.LessThan(0.5f));
            dest = Away(walk.Walker.transform.position, walk.Walker.transform.position - left, 16f);
            Assert.That(dest.HasValue, Is.True, "somewhere 16 m off");
            yield return WalkTo(walk, dest.Value, null, new Watch());
            yield return Wait(4f);
            Assert.That(walk.Party.Of(Companion), Is.SameAs(follower), "still standing");
            Assert.That(Flat(follower.transform.position, left), Is.LessThan(0.6f), "where they were left");
            Assert.That(Flat(follower.transform.position, walk.Walker.transform.position), Is.GreaterThan(10f), "not following");
            Assert.That(HudShown(boot), Is.EqualTo(1), "the strip is the player's alone");

            // ---- saved and loaded: they wait at the same spot ----
            Assert.That(boot.Save(Session.Quick), Is.Not.Null, "saved");
            Assert.That(boot.Load(Session.Quick), Is.True, "loaded");
            t0 = Time.realtimeSinceStartup;
            yield return null;
            while (Time.realtimeSinceStartup - t0 < 300f && (walk.Walker == null || !walk.Ready || !walk.Placed)) yield return null;
            Assert.That(walk.Ready, Is.True, "set down again");
            g = walk.Game;
            Assert.That(Party.StateOf(g, Companion), Is.EqualTo(CompanionState.Waiting), "still waiting in the loaded game");
            t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 30f && walk.Party.Of(Companion) == null) { Quiet(walk); yield return null; }
            var waiting = walk.Party.Of(Companion);
            Assert.That(waiting, Is.Not.Null, "the waiting companion stands again");
            Assert.That(walk.Party.ModeOf(Companion), Is.EqualTo(PartyFollowers.Mode.Waiting));
            yield return Wait(1f);
            Assert.That(Flat(waiting.transform.position, left), Is.LessThan(1f), "at the spot they were left");

            // ---- asked back: they come ----
            Logic.Apply(Logic.Fx($"[{{ 'join': '{Companion}' }}]"), g, walk.Quests);
            walk.Settle();
            t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 40f && Flat(waiting.transform.position, walk.Walker.transform.position) > 4f) { Quiet(walk); yield return null; }
            Assert.That(walk.Party.ModeOf(Companion), Is.EqualTo(PartyFollowers.Mode.Following));
            Assert.That(Flat(waiting.transform.position, walk.Walker.transform.position), Is.LessThanOrEqualTo(4f), "back at the player's side");

            // ---- leaving the road: they walk off and are gone ----
            Logic.Apply(Logic.Fx($"[{{ 'leave': '{Companion}' }}, {{ 'set': 'ash_left' }}, {{ 'decision': {{ 'id': 'party_test_left', 'text': 'They went their own way.' }} }}]"), g, walk.Quests);
            walk.Settle();
            yield return Wait(1f);
            Assert.That(Party.StateOf(g, Companion), Is.EqualTo(CompanionState.Left));
            t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 90f && walk.Party.Of(Companion) != null) { Quiet(walk); yield return null; }
            Assert.That(walk.Party.Of(Companion), Is.Null, "gone");
            yield return Wait(3f);
            Assert.That(walk.Party.Of(Companion), Is.Null, "and not back as a follower or a waiting figure");
            Assert.That(Party.Waiting(g), Is.Empty, "nobody waits for the player");
            Assert.That(walk.Party.Following, Is.Empty);
            var standing = Object.FindObjectsByType<Interactable>(FindObjectsSortMode.None).Where(i => i.Id == Companion && Flat(i.transform.position, walk.Walker.transform.position) < 60f);
            Assert.That(standing, Is.Empty, "no body of theirs near the player");
            yield return Wait(1.5f);
            Assert.That(HudShown(boot), Is.EqualTo(1), "the strip is the player's alone");
        }
    }
}
