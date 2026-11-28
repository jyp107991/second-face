using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Combat;
using SecondFace.Core.Content;
using SecondFace.Core.Inventory;
using SecondFace.Core.Stats;
using SecondFace.Core.World;
using SecondFace.Game;
using SecondFace.Game.Fighting;
using SecondFace.Game.People;
using SecondFace.Game.Play;
using SecondFace.Game.World;
using UnityEngine;
using UnityEngine.TestTools;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace SecondFace.Tests
{
    /// <summary>
    /// The floating origin (Game/World/WorldOrigin.cs, docs/MOTION_ROOT_CAUSE.md §19): a rebase moves no bone of anyone, mid-walk,
    /// mid-fight, mid-fall or mid-conversation, and no agent loses its way; a save round-trips across a rebase; no transform keeps the old
    /// origin in its local place (the containers); a fight begins re-centred and ends with the world whole; the streamer's preparations in
    /// flight land where the world now is. How alike the people stand at the box's edge is FloatingOriginPrecisionTests'.
    /// </summary>
    public class FloatingOriginTests
    {
        private static readonly string[] Bodies = { "Female_Adult_01", "Business_Female_02", "Male_Adult_08", "Construction_Male_03" };
        private static readonly HumanBodyBones[] Chain =
        {
            HumanBodyBones.Hips, HumanBodyBones.Spine, HumanBodyBones.Chest, HumanBodyBones.Neck, HumanBodyBones.Head,
            HumanBodyBones.LeftShoulder, HumanBodyBones.RightShoulder, HumanBodyBones.LeftUpperArm, HumanBodyBones.RightUpperArm,
            HumanBodyBones.LeftLowerArm, HumanBodyBones.RightLowerArm, HumanBodyBones.LeftHand, HumanBodyBones.RightHand,
            HumanBodyBones.LeftUpperLeg, HumanBodyBones.RightUpperLeg, HumanBodyBones.LeftLowerLeg, HumanBodyBones.RightLowerLeg,
            HumanBodyBones.LeftFoot, HumanBodyBones.RightFoot,
        };
        private readonly List<GameObject> _made = new();

        [UnityTearDown]
        public IEnumerator CleanUp()
        {
            foreach (var g in _made) if (g != null) Object.Destroy(g);
            _made.Clear();
            SetManaged(false);
            yield return BootTests.Clear();   // (the origin back at Unity's too)
        }

        // (the clearance's managed step where the tree has the job beside it: the twins' tolerances are the managed step's)
        private static void SetManaged(bool on) => typeof(ArmClearance).GetField("ManagedStep", System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Static)?.SetValue(null, on);

        // ------------------------------------------------------------------------------------------------ the twins

        private sealed class Pair
        {
            public string Id; public Animator A, B; public Transform RA, RB; public bool Female; public AnimatedUnitView VA, VB;
            public readonly Vector3[] PA = new Vector3[Chain.Length], PB = new Vector3[Chain.Length];
            public readonly Quaternion[] QA = new Quaternion[Chain.Length], QB = new Quaternion[Chain.Length];
            public bool Has;
        }

        /// <summary>After every system: each bone root-relative in both twins, their difference, and each twin's own one-frame step
        /// (the rebase's frame is checked against its neighbours).</summary>
        [DefaultExecutionOrder(10000)]
        private sealed class Watcher : MonoBehaviour
        {
            public List<Pair> Pairs; public bool On;
            public float Deg, M; public string Where = "";
            // each frame's largest own step (root-relative, m and degrees) per twin, for the continuity check
            public readonly List<(int Frame, float M, float Deg)> Steps = new();
            private void LateUpdate()
            {
                if (!On) return;
                float sm = 0f, sd = 0f;
                foreach (var p in Pairs)
                {
                    var ia = Quaternion.Inverse(p.RA.rotation); var ib = Quaternion.Inverse(p.RB.rotation);
                    for (var i = 0; i < Chain.Length; i++)
                    {
                        var a = p.A.GetBoneTransform(Chain[i]); var b = p.B.GetBoneTransform(Chain[i]);
                        if (a == null || b == null) continue;
                        var pa = ia * (a.position - p.RA.position); var pb = ib * (b.position - p.RB.position);
                        var qa = ia * a.rotation; var qb = ib * b.rotation;
                        var d = (pa - pb).magnitude; var g = (float)ClearanceAngle(a.localRotation, b.localRotation);
                        if (d > M) { M = d; Where = $"{p.Id} {Chain[i]}"; }
                        Deg = Mathf.Max(Deg, g);
                        if (p.Has)
                        {
                            sm = Mathf.Max(sm, Mathf.Max((pa - p.PA[i]).magnitude, (pb - p.PB[i]).magnitude));
                            sd = Mathf.Max(sd, Mathf.Max((float)ClearanceAngle(p.QA[i], qa), (float)ClearanceAngle(p.QB[i], qb)));
                        }
                        p.PA[i] = pa; p.PB[i] = pb; p.QA[i] = qa; p.QB[i] = qb;
                    }
                    p.Has = true;
                }
                Steps.Add((Time.frameCount, sm, sd));
            }
        }

        /// <summary>The angle between two turns, in double (Quaternion.Angle reads under 0.162° as 0).</summary>
        private static double ClearanceAngle(Quaternion a, Quaternion b)
        {
            double rw = a.w * (double)b.w + a.x * (double)b.x + a.y * (double)b.y + a.z * (double)b.z;
            double rx = a.w * (double)b.x - a.x * (double)b.w - a.y * (double)b.z + a.z * (double)b.y;
            double ry = a.w * (double)b.y + a.x * (double)b.z - a.y * (double)b.w - a.z * (double)b.x;
            double rz = a.w * (double)b.z - a.x * (double)b.y + a.y * (double)b.x - a.z * (double)b.w;
            return 2.0 * System.Math.Atan2(System.Math.Sqrt(rx * rx + ry * ry + rz * rz), System.Math.Abs(rw)) * 180.0 / System.Math.PI;
        }

        private IEnumerator Make(List<Pair> pairs, Vector3 at, Vector3 twin)
        {
#if UNITY_EDITOR
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            var controller = AssetDatabase.LoadAssetAtPath<UnityEditor.Animations.AnimatorController>("Assets/SecondFace/People/Locomotion.controller");
#else
            RocketboxCatalog cat = null; RuntimeAnimatorController controller = null;
#endif
            if (cat == null || controller == null) { Assert.Ignore("the cast's catalogue or the locomotion controller are not built"); yield break; }
            foreach (var g0 in new[] { at, twin })
            {
                var g = GameObject.CreatePrimitive(PrimitiveType.Cube); _made.Add(g);
                g.transform.localScale = new Vector3(30f, 1f, 30f); g.transform.position = g0 + new Vector3(0f, -0.5f, 0f);
            }
            // identical ground under both twins from the first frame: the cubes' colliders synced where they were put (with the physics'
            // auto-sync off, the first frames' foot rays found the ground a twin was made on at its creation pose and the other's not,
            // and the twins' legs parted by 36-98°, MRC §19.3)
            Physics.SyncTransforms();
            var x = 0f;
            foreach (var id in Bodies)
            {
                var person = SecondFace.Core.Npc.RbPeople.Of(id);
                var pair = new Pair { Id = id, Female = !(person?.Male ?? id.Contains("Male")) };
                for (var k = 0; k < 2; k++)
                {
                    var w = Walker.Create(cat.Get(id), controller, (k == 0 ? at : twin) + new Vector3(x, 0f, 0f), 0f, person?.Male ?? id.Contains("Male"));
                    w.gameObject.name = "origin twin " + id;
                    _made.Add(w.gameObject);
                    RbDress.Apply(w.gameObject, SecondFace.Core.Npc.RbPeople.DyesFor(person, "walker_" + id, person?.Roles?.FirstOrDefault() ?? "settler", null));
                    if (w.Agent != null) w.Agent.enabled = false;
                    w.enabled = false;
                    if (k == 0) { pair.A = w.Animator; pair.RA = w.transform; } else { pair.B = w.Animator; pair.RB = w.transform; }
                }
                pairs.Add(pair);
                x += 1.8f;
            }
            yield return null;
        }

        private static IEnumerator Frames(int n) { for (var i = 0; i < n; i++) yield return null; }
        private static void Set(List<Pair> pairs, System.Action<Animator> f) { foreach (var p in pairs) { f(p.A); f(p.B); } }

        /// <summary>The town's states (standing, the walk, the jog, the sneak); <paramref name="rebaseAt"/> frames in, a rebase.</summary>
        private static IEnumerator Town(List<Pair> pairs, int rebaseAt = -1, Vector3 delta = default, List<int> rebased = null)
        {
            var f = 0;
            foreach (var (speed, sneak, n) in new[] { (0f, false, 90), (1.4f, false, 120), (3.2f, false, 90), (1f, true, 90), (0f, false, 60) })
            {
                Set(pairs, a => { a.SetFloat("Speed", speed); a.SetBool("Sneak", sneak); });
                for (var i = 0; i < n; i++, f++)
                {
                    if (f == rebaseAt) { WorldOrigin.Rebase(delta); rebased?.Add(Time.frameCount); }
                    yield return null;
                }
            }
        }

        private static IEnumerator FightLayer(List<Pair> pairs, int rebaseAt = -1, Vector3 delta = default, List<int> rebased = null)
        {
            var layer = pairs[0].A.GetLayerIndex(CombatMotion.FullLayer);
            Set(pairs, a => { a.SetLayerWeight(layer, 1f); var c = a.GetComponent<ArmClearance>(); if (c != null) c.Holding = true; });
            var f = 0;
            foreach (var s in CombatMotion.States.Where(s => s.Layer == CombatMotion.FullLayer && (s.Gate == "guard" || s.Gate == "ready" || s.Gate == "aim" || s.Gate == "strike")).Take(8))
            {
                foreach (var p in pairs)
                {
                    if (s.Only == (p.Female ? "m" : "f") || !p.A.HasState(layer, Animator.StringToHash(s.Name))) continue;
                    p.A.CrossFadeInFixedTime(s.Name, 0.1f, layer); p.B.CrossFadeInFixedTime(s.Name, 0.1f, layer);
                }
                for (var i = 0; i < 60; i++, f++)
                {
                    if (f == rebaseAt) { WorldOrigin.Rebase(delta); rebased?.Add(Time.frameCount); }
                    yield return null;
                }
            }
            Set(pairs, a => { a.SetLayerWeight(layer, 0f); var c = a.GetComponent<ArmClearance>(); if (c != null) c.Holding = false; });
            yield return Frames(30);
        }

        private (Watcher W, List<Pair> P) Watch(List<Pair> pairs)
        {
            var host = new GameObject("origin twins' watcher"); _made.Add(host);
            var w = host.AddComponent<Watcher>(); w.Pairs = pairs;
            return (w, pairs);
        }
        private static void Reset(Watcher w) { w.Deg = 0f; w.M = 0f; w.Where = ""; w.Steps.Clear(); foreach (var p in w.Pairs) p.Has = false; }

        /// <summary>A person made at the world's origin arrives as anyone made elsewhere does: FootPlant's first frame is an arrival
        /// wherever the body stands (its last place started at (0, 0, 0), and a body made within half a metre of it was taken as already
        /// standing there, MRC §19.3).</summary>
        [UnityTest, Timeout(300000)]
        public IEnumerator APersonMadeAtTheOriginArrivesAsAnyoneElse()
        {
#if UNITY_EDITOR
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            var controller = AssetDatabase.LoadAssetAtPath<UnityEditor.Animations.AnimatorController>("Assets/SecondFace/People/Locomotion.controller");
#else
            RocketboxCatalog cat = null; RuntimeAnimatorController controller = null;
#endif
            if (cat == null || controller == null) { Assert.Ignore("the cast's catalogue or the locomotion controller are not built"); yield break; }
            var g = GameObject.CreatePrimitive(PrimitiveType.Cube); _made.Add(g);
            g.transform.localScale = new Vector3(20f, 1f, 20f); g.transform.position = new Vector3(0f, -0.5f, 0f);
            Physics.SyncTransforms();
            var made = new List<(Vector3 At, FootPlant Plant)>();
            foreach (var at in new[] { Vector3.zero, new Vector3(0.3f, 0f, 0.2f), new Vector3(4f, 0f, 0f) })
            {
                var w = Walker.Create(cat.Get("Female_Adult_01"), controller, at, 0f, false);
                w.gameObject.name = "arriving " + at; _made.Add(w.gameObject);
                if (w.Agent != null) w.Agent.enabled = false;
                w.enabled = false;
                made.Add((at, w.Animator.GetComponent<FootPlant>()));
            }
            yield return Frames(10);
            foreach (var (at, plant) in made)
            {
                Assert.That(plant, Is.Not.Null, $"made at {at}: a foot plant");
                Assert.That(plant.Arrivals, Is.EqualTo(1), $"made at {at}: arrived once, on its first frame");
            }
        }

        /// <summary>The frame of a rebase against its neighbours: no bone's own root-relative step in it is more than its neighbours'
        /// largest and the floor (m, degrees).</summary>
        private static string Jumps(Watcher w, List<int> rebased, float floorM = 0.001f, float floorDeg = 0.5f)
        {
            var bad = new List<string>();
            foreach (var r in rebased)
            {
                var k = w.Steps.FindIndex(s => s.Frame >= r);
                if (k < 0) continue;
                // (the rebase's own frame and the next, the agents' and the NavMesh's)
                for (var j = k; j <= k + 1 && j < w.Steps.Count; j++)
                {
                    var near = w.Steps.Where((s, i) => System.Math.Abs(i - j) is >= 2 and <= 5).ToList();
                    if (near.Count == 0) continue;
                    float m = near.Max(s => s.M), d = near.Max(s => s.Deg);
                    if (w.Steps[j].M > m + floorM || w.Steps[j].Deg > d + floorDeg)
                        bad.Add($"frame {w.Steps[j].Frame}: a step of {w.Steps[j].M * 1000f:0.0} mm {w.Steps[j].Deg:0.00}° against its neighbours' {m * 1000f:0.0} mm {d:0.00}°");
                }
            }
            return string.Join("; ", bad);
        }

        /// <summary>(b) A rebase mid-walk, mid-fight's states and mid-fall moves no bone of anyone: each twin's own step in the rebase's
        /// frames no more than its neighbours' (how far the twins part is recorded: the branching systems have no bound until item (iv)).</summary>
        [UnityTest, Timeout(1800000)]
        public IEnumerator ARebaseMovesNoBoneMidWalkMidFightAndMidFall()
        {
            var keep = Time.captureDeltaTime; Time.captureDeltaTime = 1f / 60f;
            SetManaged(true);
            try
            {
                var pairs = new List<Pair>();
                // (both twins within the box, a chunk apart: the rebase takes one to the origin and the other a chunk the other way)
                yield return Make(pairs, Vector3.zero, new Vector3(WorldOrigin.Step, 0f, 0f));
                var (w, _) = Watch(pairs);
                yield return Frames(30);
                var rebased = new List<int>();
                Reset(w); w.On = true; yield return Town(pairs, 150, new Vector3(-WorldOrigin.Step, 0f, 0f), rebased); w.On = false;
                var walk = Jumps(w, rebased);
                // (the twins alike, recorded: with the branching systems on they part at any rounding, item (iv), MRC §19.4; the
                // continuous systems' precision is FloatingOriginPrecisionTests')
                var apart = $"walk {w.Deg:0.000}° {w.M * 1000f:0.0} mm ({w.Where})";
                rebased.Clear();
                Reset(w); w.On = true; yield return FightLayer(pairs, 200, new Vector3(WorldOrigin.Step, 0f, 0f), rebased); w.On = false;
                var fight = Jumps(w, rebased);
                apart += $"; the fight's states {w.Deg:0.000}° {w.M * 1000f:0.0} mm ({w.Where})";
                // the fall: the fight's own views, the ragdoll handed the body, a rebase while it falls
#if UNITY_EDITOR
                var assets = AssetDatabase.LoadAssetAtPath<WorldAssets>("Assets/SecondFace/World/WorldAssets.asset");
#else
                WorldAssets assets = null;
#endif
                var fall = "";
                if (assets != null && assets.Combat != null)
                {
                    if (Registry.Items.Count == 0)
                    {
                        var db = new ContentDb();
                        foreach (var name in ContentDb.Registries) db.Load(name, System.IO.File.ReadAllText(System.IO.Path.Combine(Application.streamingAssetsPath, "content", name + ".json")));
                        Registry.Load(db);
                    }
                    var fxRoot = new GameObject("origin fx"); _made.Add(fxRoot);
                    var fx = new CombatFx(fxRoot.transform);
                    foreach (var p in pairs)
                    {
                        BattleUnit U() { var u = new BattleUnit { C = new Combatant { Id = p.Id, Name = p.Id, Team = "gate", Sheet = Sheet.Empty(p.Id), Inv = Inv.Empty(), Ap = 8, Morale = 60 } }; u.Place(0, 0); return u; }
                        p.VA = CombatViews.ForBody(U(), p.RA, w, fx, assets.Combat, p.Female, theirs: false);
                        p.VB = CombatViews.ForBody(U(), p.RB, w, fx, assets.Combat, p.Female, theirs: false);
                    }
                    yield return Frames(60);
                    rebased.Clear();
                    Reset(w); w.On = true;
                    foreach (var p in pairs) { p.VA?.OnFall(p.RA.position + Vector3.forward * 2f); p.VB?.OnFall(p.RB.position + Vector3.forward * 2f); }
                    yield return Frames(40);
                    WorldOrigin.Rebase(new Vector3(-WorldOrigin.Step, 0f, 0f)); rebased.Add(Time.frameCount);
                    yield return Frames(150);
                    w.On = false;
                    // (the fall is chaotic: the twins part by the ragdoll's own band, 89-133 mm near the origin, §19.2; a missed holder
                    // would show as a jump in a twin's own step, which is what is checked)
                    fall = Jumps(w, rebased, 0.02f, 5f);
                }
                Debug.Log($"FloatingOriginTests: mid-walk [{walk}] mid-fight [{fight}] mid-fall [{fall}]; the twins apart (recorded): {apart}");
                Assert.That(walk, Is.Empty, "mid-walk: no bone jumps in the rebase's frames");
                Assert.That(fight, Is.Empty, "mid-fight: no bone jumps in the rebase's frames");
                Assert.That(fall, Is.Empty, "mid-fall: no bone jumps in the rebase's frames");
            }
            finally { Time.captureDeltaTime = keep; }
        }

        // ------------------------------------------------------------------------------------------------ in the game

        /// <summary>(b, c) In Shale with its people about: a rebase mid-walk keeps every agent on the NavMesh and the walker on their way
        /// (its goal shifted with the world); mid-conversation the camera keeps its framing; a save made before a rebase loads after it
        /// to the same world place.</summary>
        [UnityTest, Timeout(1800000)]
        public IEnumerator InShaleARebaseKeepsTheWayTheViewAndTheSave()
        {
            Bootstrap boot = null;
            yield return BootTests.Boot(b => boot = b);
            var walk = boot.Walkabout;
            yield return BootTests.TownSettled(() => walk.Townsfolk, "the town's people");
            Assert.That(System.Math.Abs(WorldOrigin.OX) + System.Math.Abs(WorldOrigin.OZ), Is.GreaterThan(0), "the walk began with the world rebased about Shale");
            Assert.That(walk.Walker.transform.position.magnitude, Is.LessThan(WorldOrigin.Box * 1.5f), "the walker near Unity's origin");
            int OnMesh() => Object.FindObjectsByType<UnityEngine.AI.NavMeshAgent>(FindObjectsSortMode.None).Count(a => a.isActiveAndEnabled && a.isOnNavMesh);
            // the walk
            var ahead = walk.Walker.transform.position + walk.Walker.transform.forward * 12f;
            if (UnityEngine.AI.NavMesh.SamplePosition(ahead, out var hit, 6f, UnityEngine.AI.NavMesh.AllAreas)) walk.Walker.GoTo(hit.position);
            for (var i = 0; i < 20; i++) yield return null;
            var agent = walk.Walker.Agent;
            var hadPath = agent.hasPath; var goalW = WorldOrigin.ToWorld(agent.destination); var atW = WorldOrigin.ToWorld(walk.Walker.transform.position);
            var on0 = OnMesh();
            var d = new Vector3(WorldOrigin.Step, 0f, -WorldOrigin.Step);
            WorldOrigin.Rebase(d);
            for (var i = 0; i < 4; i++) yield return null;
            var on1 = OnMesh();
            Debug.Log($"FloatingOriginTests: agents on the NavMesh {on0} -> {on1}; the walker's path {hadPath} -> {agent.hasPath}, goal {goalW} -> {WorldOrigin.ToWorld(agent.destination)}");
            Assert.That(on1, Is.EqualTo(on0), "no agent left the NavMesh in the rebase");
            Assert.That(Vector3.Distance(WorldOrigin.ToWorld(walk.Walker.transform.position), atW), Is.LessThan(1.5f), "the walker where they were in the world");
            if (hadPath && agent.hasPath) Assert.That(Vector3.Distance(WorldOrigin.ToWorld(agent.destination), goalW), Is.LessThan(0.2f), "on their way to the same world point");
            // the save before a rebase, loaded after it
            walk.Walker.Steer(Vector3.zero, 0f);
            for (var i = 0; i < 30; i++) yield return null;
            var savedW = WorldOrigin.ToWorld(walk.Walker.Footing);
            Assert.That(boot.Save("origin_trip"), Is.Not.Null, "saved");
            var file = boot.Session.Read("origin_trip");
            Assert.That(new Vector3(file.State.Spot.X, file.State.Spot.Y, file.State.Spot.Z), Is.EqualTo(savedW).Using(Vector3EqualityComparerWithin(0.01f)), "the save holds the world's own place");
            WorldOrigin.Rebase(new Vector3(-WorldOrigin.Step, 0f, WorldOrigin.Step));
            for (var i = 0; i < 3; i++) yield return null;
            Assert.That(boot.Load("origin_trip"), Is.True, "loaded");
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 120f && (boot.Walkabout == null || !boot.Walkabout.Ready)) yield return null;
            walk = boot.Walkabout;
            var loadedW = WorldOrigin.ToWorld(walk.Walker.Footing);
            Debug.Log($"FloatingOriginTests: saved at {savedW}, loaded at {loadedW} (offset {WorldOrigin.OX}, {WorldOrigin.OZ})");
            Assert.That(Vector3.Distance(new Vector3(loadedW.x, 0f, loadedW.z), new Vector3(savedW.x, 0f, savedW.z)), Is.LessThan(0.3f), "the walker set down at the saved world place");
            // the conversation's camera across a rebase
            yield return BootTests.TownSettled(() => walk.Townsfolk, "the town's people");
            var speaker = Object.FindObjectsByType<Interactable>(FindObjectsSortMode.None)
                .Where(i => Registry.Npcs.TryGetValue(i.Id, out var n) && !string.IsNullOrEmpty(n.Dialogue))
                .OrderBy(i => Vector3.Distance(i.transform.position, walk.Walker.transform.position)).FirstOrDefault();
            if (speaker != null && walk.OpenConversation(speaker))
            {
                for (var i = 0; i < 60; i++) yield return null;
                var cam = Camera.main.transform;
                var rel0 = cam.position - walk.Walker.transform.position;
                WorldOrigin.Rebase(new Vector3(WorldOrigin.Step, 0f, 0f));
                yield return null; yield return null;
                var rel1 = cam.position - walk.Walker.transform.position;
                Debug.Log($"FloatingOriginTests: the conversation's camera against the walker {rel0} -> {rel1}");
                Assert.That(walk.Conversation.IsOpen, Is.True, "the conversation goes on");
                Assert.That(Vector3.Distance(rel0, rel1), Is.LessThan(0.1f), "the conversation's framing kept");
                boot.UI.CloseAll();
            }
            else Assert.Inconclusive("no one to talk to near the walker");
        }

        private static IEqualityComparer<Vector3> Vector3EqualityComparerWithin(float e) => new Within(e);
        private sealed class Within : IEqualityComparer<Vector3>
        {
            private readonly float _e; public Within(float e) { _e = e; }
            public bool Equals(Vector3 a, Vector3 b) => Vector3.Distance(a, b) <= _e;
            public int GetHashCode(Vector3 v) => 0;
        }

        // ------------------------------------------------------------------------------------------------ the containers

        /// <summary>Every transform whose local place is farther out than its world place by more than the hard box: the child of a holder a
        /// rebase moved off Unity's origin (a holder not marked <see cref="WorldOrigin.Container"/>), which keeps the old origin in its local
        /// coordinates and with it the old origin's rounding (MRC §19.3). Grouped by the holder (its path and how many it holds so), then
        /// the first of them by path.</summary>
        private static List<string> FarLocals()
        {
            var bad = new List<Transform>();
            foreach (var t in Object.FindObjectsByType<Transform>(FindObjectsInactive.Include, FindObjectsSortMode.None))
                if (t.parent != null && t.localPosition.magnitude > t.position.magnitude + WorldOrigin.HardBox) bad.Add(t);
            if (bad.Count == 0) return new List<string>();
            var lines = bad.GroupBy(t => PathOf(t.parent)).OrderByDescending(gr => gr.Count()).Take(30)
                .Select(gr => $"under {gr.Key} (at {gr.First().parent.position}): {gr.Count()}").ToList();
            lines.AddRange(bad.Take(12).Select(t => $"{PathOf(t)}: local {t.localPosition}, world {t.position}"));
            return lines;
        }
        private static string PathOf(Transform t) { var s = t.name; for (var p = t.parent; p != null; p = p.parent) s = p.name + "/" + s; return s; }

        private static void Check(List<string> fails, string when)
        {
            var bad = FarLocals();
            Debug.Log($"FloatingOriginTests: {when}: {(bad.Count == 0 ? "no transform keeps the old origin" : string.Join("; ", bad))}");
            if (bad.Count > 0) fails.Add($"{when}: {string.Join("; ", bad)}");
        }

        /// <summary>(c, the containers) In Shale, after the walk's own rebase and three steps out and back, and in a fight before and after a
        /// rebase, no transform keeps the old origin in its local place.</summary>
        [UnityTest, Timeout(1800000)]
        public IEnumerator NoTransformKeepsTheOldOriginInTownOrInAFight()
        {
            Bootstrap boot = null;
            yield return BootTests.Boot(b => boot = b);
            var walk = boot.Walkabout;
            yield return BootTests.TownSettled(() => walk.Townsfolk, "the town's people");
            var fails = new List<string>();
            Check(fails, "in Shale after the walk's own rebase");
            for (var k = 1; k <= 3; k++) { WorldOrigin.Rebase(new Vector3(WorldOrigin.Step, 0f, 0f)); yield return Frames(4); Check(fails, $"{k} out"); }
            for (var k = 1; k <= 3; k++) { WorldOrigin.Rebase(new Vector3(-WorldOrigin.Step, 0f, 0f)); yield return Frames(4); Check(fails, $"{k} back"); }
            yield return TributeFight(walk);
            Assert.That(walk.Combat.Active, Is.True, "the fight began");
            yield return Frames(60);
            Check(fails, "in the fight");
            WorldOrigin.Rebase(new Vector3(WorldOrigin.Step, 0f, WorldOrigin.Step));
            yield return Frames(4);
            Check(fails, "in the fight, rebased");
            Assert.That(fails, Is.Empty, string.Join("\n", fails));
        }

        /// <summary>(c, the containers) After a fast travel (Shale to the Rust Dogs' camp: the game begun again under the road's card) and a
        /// rebase there, no transform keeps the old origin in its local place.</summary>
        [UnityTest, Timeout(1800000)]
        public IEnumerator NoTransformKeepsTheOldOriginAfterAFastTravel()
        {
            Bootstrap boot = null;
            yield return BootTests.Boot(b => boot = b);
            var walk = boot.Walkabout;
            yield return BootTests.TownSettled(() => walk.Townsfolk, "the town's people");
            var fails = new List<string>();
            Check(fails, "in Shale");
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 30f)
            {
                yield return Frames(30);
                if (walk.Conversation != null && walk.Conversation.IsOpen) { walk.Conversation.Close(); continue; }
                if (!walk.Busy) break;
            }
            Assert.That(walk.Busy, Is.False, "free to set out");
            boot.TravelTo("shale", "rustdogs");
            yield return null;
            t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 420f && (boot.Walkabout == null || !boot.Walkabout.Ready || !boot.Walkabout.Placed)) yield return null;
            Assert.That(boot.Walkabout != null && boot.Walkabout.Ready, Is.True, "set down at the Rust Dogs' camp");
            Assert.That(boot.Walkabout.Game.LocationId, Is.EqualTo("rustdogs"));
            yield return Frames(120);
            Check(fails, "after the fast travel");
            WorldOrigin.Rebase(new Vector3(0f, 0f, -WorldOrigin.Step));
            yield return Frames(4);
            Check(fails, "after the fast travel, rebased");
            Assert.That(fails, Is.Empty, string.Join("\n", fails));
        }

        /// <summary>The raiders' tribute in Shale, begun as PartyTests begins it: the raiders come to the town, the walker goes within 9 m
        /// of their lead, the fight is asked for; until it is on (at most 30 s).</summary>
        private static IEnumerator TributeFight(Walkabout walk)
        {
            var g = walk.Game;
            foreach (var id in new[] { "npc_rd_t1", "npc_rd_t2", "npc_rd_t3", "npc_rd_t4" }) g.Npcs[id] = new SecondFace.Core.State.NpcSave { Hp = 1 };
            g.SetFlag("tribute_day", true);
            walk.Settle();
            Townsperson raider = null;
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 60f && (raider = walk.People.StandingPeople.FirstOrDefault(p => p != null && p.Def != null && p.Def.Id == "npc_rd_t1")) == null)
            {
                PartyTests.Quiet(walk);
                yield return null;
            }
            Assert.That(raider, Is.Not.Null, "the raiders came to the town");
            var near = raider.transform.position + (walk.Walker.transform.position - raider.transform.position).normalized * 9f;
            if (UnityEngine.AI.NavMesh.SamplePosition(near, out var nh, 4f, UnityEngine.AI.NavMesh.AllAreas) && walk.Walker.GoTo(nh.position))
            {
                t0 = Time.realtimeSinceStartup;
                while (Time.realtimeSinceStartup - t0 < 60f && walk.Walker.Goal != null) { PartyTests.Quiet(walk); yield return null; }
            }
            g.SetFlag("tribute_fight", true);
            walk.Settle();
            t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 30f && !walk.Combat.Active)
            {
                PartyTests.Quiet(walk);
                if (!walk.Busy) walk.Combat.Check(true);
                for (var i = 0; i < 30; i++) yield return null;
            }
        }

        private static int AgentsOnTheMesh() => Object.FindObjectsByType<UnityEngine.AI.NavMeshAgent>(FindObjectsSortMode.None).Count(a => a.isActiveAndEnabled && a.isOnNavMesh);
        private static int AgentsOff() => Object.FindObjectsByType<UnityEngine.AI.NavMeshAgent>(FindObjectsSortMode.None).Count(a => a.isActiveAndEnabled && !a.isOnNavMesh);

        /// <summary>(c, the fight re-centred, MRC §19.4) A fight begun away from Unity's origin (the world moved a chunk off first) begins with
        /// its centre within 32 m of it along x and z (WorldOrigin.Recentre, whole 64 m steps); every fighter's body stands at its battle
        /// place and that place is the world's own (the battle's logical places unchanged); no agent leaves the NavMesh; and when it is over
        /// the world is whole, as after any rebase: no transform keeps the old origin, every agent on the NavMesh, a rebase after it the same.
        /// The fighters' extent is said (wider than a 64 m step, the farthest stand that much off the origin).</summary>
        [UnityTest, Timeout(1800000)]
        public IEnumerator AFightBeginsReCentredAndEndsWithTheWorldWhole()
        {
            Bootstrap boot = null;
            yield return BootTests.Boot(b => boot = b);
            var walk = boot.Walkabout;
            yield return BootTests.TownSettled(() => walk.Townsfolk, "the town's people");
            // (anywhere: the world a chunk off along both axes, so the fight does not begin near the origin by the walk's own rebase)
            WorldOrigin.Rebase(new Vector3(WorldOrigin.Step, 0f, -WorldOrigin.Step));
            yield return Frames(4);
            var rebases = WorldOrigin.Rebases;
            yield return TributeFight(walk);
            Assert.That(walk.Combat.Active, Is.True, "the fight began");
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 10f && WorldOrigin.Rebases == rebases) yield return null;
            yield return Frames(2);
            var battle = walk.Combat.Battle;
            Assert.That(battle, Is.Not.Null, "the battle");
            var units = battle.Units.Where(u => u.Alive).ToList();
            var at = units.Select(u => WorldOrigin.ToUnity(u.PX, 0, u.PZ)).ToList();
            float x0 = at.Min(p => p.x), x1 = at.Max(p => p.x), z0 = at.Min(p => p.z), z1 = at.Max(p => p.z);
            var centre = new Vector3((x0 + x1) * 0.5f, 0f, (z0 + z1) * 0.5f);
            Debug.Log($"FloatingOriginTests: the fight re-centred by {walk.Combat.LastRecentre}: its centre at Unity {centre}, its fighters spanning {walk.Combat.LastSpan:0.0} m ({units.Count} of them)");
            Assert.That(WorldOrigin.Rebases, Is.GreaterThan(rebases), "the fight began with a rebase");
            Assert.That(Mathf.Abs(centre.x), Is.LessThanOrEqualTo(WorldOrigin.FightStep * 0.5f + 0.01f), "the fight's centre within 32 m along x");
            Assert.That(Mathf.Abs(centre.z), Is.LessThanOrEqualTo(WorldOrigin.FightStep * 0.5f + 0.01f), "the fight's centre within 32 m along z");
            if (walk.Combat.LastSpan > WorldOrigin.FightStep) Debug.Log($"FloatingOriginTests: the fighters span {walk.Combat.LastSpan:0} m, more than a step: the farthest stand {walk.Combat.LastSpan * 0.5f:0} m off the origin");
            // every fighter where the battle has them, and the battle's places the world's own
            var misplaced = new List<string>();
            foreach (var u in units)
            {
                var body = walk.Combat.BodyOf(u);
                if (body == null) { misplaced.Add($"{u.C.Id} without a body"); continue; }
                var p = body.position; var want = WorldOrigin.ToUnity(u.PX, p.y, u.PZ);
                var off = new Vector2(p.x - want.x, p.z - want.z).magnitude;
                if (off > 0.3f) misplaced.Add($"{u.C.Id} {off:0.00} m from its battle place");
            }
            Assert.That(misplaced, Is.Empty, "every fighter at its battle place: " + string.Join("; ", misplaced));
            Assert.That(AgentsOff(), Is.Zero, "no agent off the NavMesh after the re-centring");
            // the fight to its end, the player's turns by the AI
            t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 600f && walk.Combat.Active)
            {
                if (walk.Combat.PlayersTurn) yield return walk.Combat.PlayerTurnByAi();
                yield return null;
            }
            Assert.That(walk.Combat.Active, Is.False, "the fight ended");
            yield return Frames(120);
            var fails = new List<string>();
            Check(fails, "after the fight");
            Assert.That(AgentsOff(), Is.Zero, "every agent on the NavMesh after the fight");
            WorldOrigin.Rebase(new Vector3(-WorldOrigin.Step, 0f, 0f));
            yield return Frames(4);
            Check(fails, "after the fight, rebased");
            Assert.That(AgentsOff(), Is.Zero, "every agent on the NavMesh after a rebase after the fight");
            Assert.That(walk.Ready, Is.True, "the walker on the NavMesh");
            Assert.That(fails, Is.Empty, string.Join("\n", fails));
        }

        /// <summary>(d) The streamer's preparations in flight survive a rebase: the chunks being prepared when the world moved are built
        /// where the world now is (each chunk's terrain at its world corner less the offset).</summary>
        [UnityTest, Timeout(900000)]
        public IEnumerator TheStreamersPreparationsLandWhereTheWorldIs()
        {
#if UNITY_EDITOR
            var assets = AssetDatabase.LoadAssetAtPath<WorldAssets>("Assets/SecondFace/World/WorldAssets.asset");
#else
            WorldAssets assets = null;
#endif
            if (assets == null || !assets.Complete) { Assert.Ignore("the world's assets are not built"); yield break; }
            var stageGo = new GameObject("origin stage"); _made.Add(stageGo);
            var stage = stageGo.AddComponent<WorldStage>();
            stage.Assets = assets;
            var camGo = new GameObject("origin camera"); _made.Add(camGo);
            stage.Camera = camGo.AddComponent<Camera>();
            yield return stage.Raise();
            Assert.That(stage.Raised, Is.True, stage.Status);
            var shaleW = stage.World.PlaceCentreWorld("shale");
            WorldOrigin.Rebase(WorldOrigin.ShiftFor(WorldOrigin.ToUnity(shaleW)));
            yield return stage.WaitAround(WorldOrigin.ToUnity(shaleW), null, 120f);
            // two chunks east: the streamer prepares them; while it does, the world moves
            stage.World.Focus = WorldOrigin.ToUnity(shaleW + new Vector3(2f * WorldGrid.Chunk, 0f, 0f));
            var preparing = typeof(WorldStreamer).GetField("_preparing", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            int Preparing() => (preparing?.GetValue(stage.Streamer) as System.Collections.ICollection)?.Count ?? 0;
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 30f && Preparing() == 0) yield return null;
            var inFlight = Preparing();
            var d = new Vector3(-WorldOrigin.Step, 0f, 0f);
            var focusW = stage.World.FocusWorld;
            WorldOrigin.Rebase(d);
            stage.World.Focus = WorldOrigin.ToUnity(focusW);
            t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 120f && (Preparing() > 0 || !WorldGrid.Around(focusW.x, focusW.z, 1).All(c => stage.Streamer.IsBuilt(c.cx, c.cz)))) yield return null;
            var wrong = new List<string>();
            foreach (var (cx, cz) in stage.Streamer.Built)
            {
                var t = stage.Streamer.TerrainAt(cx, cz);
                if (t == null) continue;
                var (x0, z0) = WorldGrid.Origin(cx, cz);
                var want = WorldOrigin.ToUnity(x0, ControlMap.Floor, z0);
                if ((t.transform.position - want).sqrMagnitude > 1e-6f) wrong.Add($"chunk {cx},{cz} at {t.transform.position}, not {want}");
            }
            Debug.Log($"FloatingOriginTests: {inFlight} chunks in preparation at the rebase; {stage.Streamer.Built.Count} built; wrong: {string.Join("; ", wrong)}");
            Assert.That(inFlight, Is.GreaterThan(0), "a chunk was being prepared when the world moved");
            Assert.That(wrong, Is.Empty, "every chunk built where the world now is");
        }
    }
}
