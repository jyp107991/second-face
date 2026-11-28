using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Combat;
using SecondFace.Core.Content;
using SecondFace.Core.Inventory;
using SecondFace.Core.Stats;
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
    /// The floating origin's precision (Game/World/WorldOrigin.cs, docs/MOTION_ROOT_CAUSE.md §19.4): the same people twice, twin A at Unity's
    /// origin and twin B where the game lets people stand, on identical (synced) ground, played alike frame for frame and compared after
    /// every frame root-relative (each bone's place in the root's frame, its local turn) and by the skin's drawn vertices.
    /// <para>(a1) Each system that is continuous in its inputs, alone, against the float step's curve:</para>
    /// <list type="bullet">
    /// <item>the town's (the Animator in the town's states, the skin) at the box's farthest point, within the curve's own value there ×1.5;</item>
    /// <item>the fight's (the Animator's fight layer, Fighter's TwoBone, PistolAim and springs) at 32 m, the farthest a re-centred fight's
    /// centre stands, within the near-origin control's (the twin 16 m out) ×2;</item>
    /// <item>Shale through the origin (the world started about it): the town's within the curve at 128 m ×1.5.</item>
    /// </list>
    /// <para>(a2) The branching systems (FootPlant, ArmClearance) part twin from twin at any rounding (their branch choices are not
    /// continuous: item (iv)), so their spread is recorded, at the near-origin control and at the box's edge, with no bound until (iv).</para>
    /// </summary>
    public class FloatingOriginPrecisionTests
    {
        // ---- the float step's curve (MRC §19.4: measured 2026-11-28, each system alone, four dressed bodies, three offsets a distance, the
        // worst of them; place mm, local turn °, the skin's drawn vertices mm; a float's step: 16 m 1.9 µm, 128 m 15 µm, 512-1023 m 61 µm,
        // 1024 m 0.12 mm, 2048 m 0.24 mm, Shale 0.98 mm):
        //   the Animator, town:        16 m 0.006, 0.025, 0.004 | 128 m 0.039, 0.025, 0.028 | 512 m 0.213, 0.051, 0.109 | 908 m 0.213, 0.051, 0.110
        //                              1024 m 0.307, 0.071, 0.208 | 2048 m 0.592, 0.122, 0.426 | Shale 2.18, 0.301, 1.50  (about 2.5 float steps)
        //   the Animator, fight layer: 16 m 0.178, 0.057, 0.021 | 128 m 0.537, 0.170, 0.123 | 512 m 4.93, 1.54, 0.65 | 908 m 4.93, 1.54, 0.32
        //                              1024 m 8.42, 2.37, 1.19 | 2048 m 23.1, 7.13, 3.24 | Shale 93.2, 26.7, 6.59  (35-95 float steps from the start)
        //   TwoBone, the rifle:        16 m 0.059, 0.041, 0.021 | 128 m 1.08, 0.85, 0.32 | 512 m to 2048 m 39 mm and 11.1-11.3° in the calves (a
        //                              discrete event, item (iv)) | Shale 127, 37.1, 22.2
        //   PistolAim:                 16 m 0.598, 0.195, 0.121 | 128 m 0.616, 0.202, 0.233 | 512-908 m 0.977, 0.208, 2.24 | 1024 m 1.11, 0.217, 2.50
        //                              2048 m 3.11, 0.476, 6.08 | Shale 7.38, 1.50, 27.6
        //   the springs, a heavy hit:  16 m 0.567, 0.157, 0.558 | 128 m 0.569, 0.164, 0.221 | 512-908 m 1.08, 0.183, 2.17 | 1024 m 1.09, 0.187, 2.23
        //                              2048 m 3.87, 0.517, 6.23 | Shale 8.63, 1.08, 27.9
        // The town box (WorldOrigin.Box 768 m, its farthest standing person at 908 m) keeps the town's systems at 0.21 mm and 0.05°; the fight's
        // grow with the step from the origin on, so a fight is re-centred (WorldOrigin.Recentre: its centre within 32 m).

        /// <summary>The farthest a person stands while the walker is inside the box (Box 768 m + PeopleService.Leave 140 m, along x and z).</summary>
        private static readonly Vector3 BoxEdge = new(908f, 0f, 908f);
        /// <summary>The farthest a re-centred fight's centre stands (half a FightStep along x and z).</summary>
        private static readonly Vector3 FightEdge = new(32f, 0f, 32f);
        private static readonly Vector3 Shale = new(15369f, 39f, 4493f);

        private readonly struct Bound
        {
            public readonly float Mm, Deg, SkinMm;
            public Bound(float mm, float deg, float skin) { Mm = mm; Deg = deg; SkinMm = skin; }
            public Bound Times(float k) => new(Mm * k, Deg * k, SkinMm * k);
        }
        // the town's at the box's edge: the curve at 908 m ×1.5 (its scatter there is under ×1.1; the margin a half for another machine's rounding)
        private static readonly Bound TownAtTheEdge = new Bound(0.213f, 0.0513f, 0.110f).Times(1.5f);
        // Shale through the origin: the twin about 115 m out (the world started on Shale's chunk), the curve at 128 m ×1.5
        private static readonly Bound TownAt128 = new Bound(0.039f, 0.0252f, 0.028f).Times(1.5f);
        // the fight's at 32 m: the near-origin control (16 m) ×2
        private static readonly Bound FightLayerControl = new Bound(0.178f, 0.0571f, 0.021f).Times(2f);
        private static readonly Bound TwoBoneControl = new Bound(0.059f, 0.0409f, 0.021f).Times(2f);
        private static readonly Bound PistolAimControl = new Bound(0.598f, 0.1952f, 0.121f).Times(2f);
        private static readonly Bound SpringsControl = new Bound(0.567f, 0.1569f, 0.558f).Times(2f);

        private static readonly string[] Bodies = { "Female_Adult_01", "Business_Female_02", "Male_Adult_08", "Construction_Male_03" };
        private static readonly HumanBodyBones[] Chain =
        {
            HumanBodyBones.Hips, HumanBodyBones.Spine, HumanBodyBones.Chest, HumanBodyBones.UpperChest, HumanBodyBones.Neck, HumanBodyBones.Head,
            HumanBodyBones.LeftShoulder, HumanBodyBones.RightShoulder, HumanBodyBones.LeftUpperArm, HumanBodyBones.RightUpperArm,
            HumanBodyBones.LeftLowerArm, HumanBodyBones.RightLowerArm, HumanBodyBones.LeftHand, HumanBodyBones.RightHand,
            HumanBodyBones.LeftUpperLeg, HumanBodyBones.RightUpperLeg, HumanBodyBones.LeftLowerLeg, HumanBodyBones.RightLowerLeg,
            HumanBodyBones.LeftFoot, HumanBodyBones.RightFoot, HumanBodyBones.LeftToes, HumanBodyBones.RightToes,
        };
        private static readonly System.Type[] Systems = { typeof(FootPlant), typeof(Gaze), typeof(HandPose), typeof(ArmClearance), typeof(SeatTurn), typeof(ClipTurnFirst) };

        private readonly List<GameObject> _made = new();
        private readonly List<GameObject> _twins = new();

        [UnityTearDown]
        public IEnumerator CleanUp()
        {
            foreach (var g in _twins) if (g != null) Object.Destroy(g);
            foreach (var g in _made) if (g != null) Object.Destroy(g);
            _twins.Clear(); _made.Clear();
            ArmClearance.ManagedStep = false;
            WorldOrigin.Reset();
            yield return null;
        }

        private sealed class Pair
        {
            public string Id; public Animator A, B; public Transform RA, RB; public bool Female;
            public AnimatedUnitView VA, VB;
        }

        /// <summary>A segment's largest root-relative place and local turn twin from twin (and where), and the skin's drawn vertices.</summary>
        private sealed class Seg
        {
            public string Name; public int Frames;
            public float Mm, Deg, SkinMm; public string WhereMm = "", WhereDeg = "", WhereSkin = "";
            public string Line() => $"{Name}: place {Mm:0.000} mm ({WhereMm}), turn {Deg:0.0000}° ({WhereDeg}), skin {SkinMm:0.000} mm ({WhereSkin}); {Frames} frames";
        }

        [DefaultExecutionOrder(10000)]   // (after every people system: the foot plant -20, the gaze 0, the hands 5, the clearance 9/10, the fighter 30)
        private sealed class Watcher : MonoBehaviour
        {
            public List<Pair> Pairs; public Seg S; public bool On;
            private Mesh _ma, _mb;
            private void LateUpdate()
            {
                if (!On || S == null) return;
                S.Frames++;
                foreach (var p in Pairs)
                {
                    var ia = Quaternion.Inverse(p.RA.rotation); var ib = Quaternion.Inverse(p.RB.rotation);
                    foreach (var hb in Chain)
                    {
                        var a = p.A.GetBoneTransform(hb); var b = p.B.GetBoneTransform(hb);
                        if (a == null || b == null) continue;
                        var mm = (ia * (a.position - p.RA.position) - ib * (b.position - p.RB.position)).magnitude * 1000f;
                        var deg = (float)ClearanceJobTests.Ang(a.localRotation, b.localRotation);
                        if (mm > S.Mm) { S.Mm = mm; S.WhereMm = $"{p.Id} {hb}"; }
                        if (deg > S.Deg) { S.Deg = deg; S.WhereDeg = $"{p.Id} {hb}"; }
                    }
                }
                if (S.Frames % 30 != 0) return;
                _ma ??= new Mesh(); _mb ??= new Mesh();
                foreach (var p in Pairs)
                {
                    var ra = Body(p.A); var rb = Body(p.B);
                    if (ra == null || rb == null) continue;
                    ra.BakeMesh(_ma, true); rb.BakeMesh(_mb, true);
                    var va = _ma.vertices; var vb = _mb.vertices;
                    if (va.Length != vb.Length) continue;
                    var m = 0f;
                    for (var k = 0; k < va.Length; k++) m = Mathf.Max(m, (va[k] - vb[k]).sqrMagnitude);
                    m = Mathf.Sqrt(m) * 1000f;
                    if (m > S.SkinMm) { S.SkinMm = m; S.WhereSkin = p.Id; }
                }
            }
            private static SkinnedMeshRenderer Body(Animator a)
            {
                var s = a.GetComponent<BodySkin>();
                if (s != null && s.Body != null) return s.Body;
                return a.GetComponentsInChildren<SkinnedMeshRenderer>().OrderByDescending(r => r.sharedMesh != null ? r.sharedMesh.vertexCount : 0).FirstOrDefault();
            }
        }

        private static IEnumerator Frames(int n) { for (var i = 0; i < n; i++) yield return null; }
        private static void Set(List<Pair> pairs, System.Action<Animator> f) { foreach (var p in pairs) { f(p.A); f(p.B); } }

        /// <summary>Every people system off but <paramref name="on"/>.</summary>
        private static void Only(List<Pair> pairs, params System.Type[] on)
        {
            foreach (var p in pairs)
                foreach (var a in new[] { p.A, p.B })
                    foreach (var t in Systems)
                        foreach (var c in a.GetComponentsInChildren(t, true)) if (c is Behaviour b) b.enabled = on.Contains(t);
        }

        /// <summary>The town's states: standing, the walk, the jog, standing; three gestures; the sneak; standing.</summary>
        private static IEnumerator Town(List<Pair> pairs)
        {
            foreach (var speed in new[] { 0f, 1.4f, 3.2f, 0f })
            {
                Set(pairs, a => { a.SetFloat("Speed", speed); a.SetBool("Sneak", false); });
                yield return Frames(90);
            }
            foreach (var g in new[] { "talk", "wave", "argue" })
            {
                Set(pairs, a => a.GetComponent<Ambient>()?.Gesture(g));
                yield return Frames(120);
            }
            Set(pairs, a => { a.SetBool("Sneak", true); a.SetFloat("Speed", 1f); });
            yield return Frames(90);
            Set(pairs, a => { a.SetBool("Sneak", false); a.SetFloat("Speed", 0f); });
            yield return Frames(60);
        }

        /// <summary>The fight layer's guard, ready, aim, strike and crouch states, a second each.</summary>
        private static IEnumerator FightLayer(List<Pair> pairs)
        {
            var layer = pairs[0].A.GetLayerIndex(CombatMotion.FullLayer);
            Set(pairs, a => { a.SetLayerWeight(layer, 1f); var c = a.GetComponent<ArmClearance>(); if (c != null) c.Holding = true; });
            foreach (var s in CombatMotion.States.Where(s => s.Layer == CombatMotion.FullLayer && (s.Gate == "guard" || s.Gate == "ready" || s.Gate == "aim" || s.Gate == "strike" || s.Gate == "crouch")).Take(12))
            {
                foreach (var p in pairs)
                {
                    if (s.Only == (p.Female ? "m" : "f")) continue;
                    var h = Animator.StringToHash(s.Name);
                    if (!p.A.HasState(layer, h)) continue;
                    p.A.CrossFadeInFixedTime(s.Name, 0.1f, layer); p.B.CrossFadeInFixedTime(s.Name, 0.1f, layer);
                }
                yield return Frames(60);
            }
            Set(pairs, a => { a.SetLayerWeight(layer, 0f); var c = a.GetComponent<ArmClearance>(); if (c != null) c.Holding = false; });
            yield return Frames(30);
        }

        private static BattleUnit Unit(string id, string item)
        {
            var inv = Inv.Empty();
            if (item != null) { Inv.AddItem(inv, Inv.MakeItem(item)); Inv.Equip(inv, 0); }
            var u = new BattleUnit { C = new Combatant { Id = id, Name = id, Team = "gate", Sheet = Sheet.Empty(id), Inv = inv, Ap = 8, Morale = 60 } };
            u.Place(0, 0);
            return u;
        }

        private static void Views(List<Pair> pairs, string item, MonoBehaviour host, CombatFx fx, CombatSet set)
        {
            foreach (var p in pairs)
            {
                p.VA = CombatViews.ForBody(Unit(p.Id, item), p.RA, host, fx, set, p.Female, theirs: false);
                p.VB = CombatViews.ForBody(Unit(p.Id, item), p.RB, host, fx, set, p.Female, theirs: false);
            }
        }

        /// <summary>Both twins' views given the same act on the same frame; waits until both are done (at most a cap).</summary>
        private static IEnumerator Both(List<Pair> pairs, MonoBehaviour host, System.Func<AnimatedUnitView, Transform, IEnumerator> act, float cap)
        {
            var running = 0;
            IEnumerator Counted(IEnumerator e) { running++; yield return e; running--; }
            foreach (var p in pairs)
            {
                if (p.VA != null) host.StartCoroutine(Counted(act(p.VA, p.RA)));
                if (p.VB != null) host.StartCoroutine(Counted(act(p.VB, p.RB)));
            }
            yield return null;
            for (var t = 0f; running > 0 && t < cap; t += Time.deltaTime) yield return null;
        }

        private static IEnumerator AimFire(AnimatedUnitView v, Transform r, Vector3 ahead, int rounds)
        {
            yield return v.OnAim(r.position + ahead);
            for (var i = 0; i < 60; i++) yield return null;
            for (var i = 0; i < rounds; i++) yield return v.OnFire(r.position + ahead, true, i, rounds);
        }
        private static IEnumerator Then(System.Action a, float s) { a(); for (var t = 0f; t < s; t += Time.deltaTime) yield return null; }

        // ---- the harness --------------------------------------------------------------------------------------------------------

        private RocketboxCatalog _cat; private RuntimeAnimatorController _controller; private WorldAssets _assets;
        private Watcher _watch; private CombatFx _fx;

        /// <summary>The catalogue, the controller, the world's assets and the content; false (and ignored) when not built.</summary>
        private bool Ready()
        {
#if UNITY_EDITOR
            _cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            _controller = AssetDatabase.LoadAssetAtPath<UnityEditor.Animations.AnimatorController>("Assets/SecondFace/People/Locomotion.controller");
            _assets = AssetDatabase.LoadAssetAtPath<WorldAssets>("Assets/SecondFace/World/WorldAssets.asset");
#endif
            if (_cat == null || _controller == null || _assets == null || _assets.Combat == null) return false;
            if (Registry.Items.Count == 0)
            {
                var db = new ContentDb();
                foreach (var name in ContentDb.Registries) db.Load(name, File.ReadAllText(Path.Combine(Application.streamingAssetsPath, "content", name + ".json")));
                Registry.Load(db);
            }
            var host = new GameObject("precision host"); _made.Add(host);
            _watch = host.AddComponent<Watcher>();
            var fxRoot = new GameObject("precision fx"); _made.Add(fxRoot);
            _fx = new CombatFx(fxRoot.transform);
            return true;
        }

        /// <summary>The four bodies twice, twin A at <paramref name="a"/> and twin B at <paramref name="b"/>, each row on its own ground,
        /// the grounds' colliders synced before anyone stands on them (MRC §19.3).</summary>
        private List<Pair> Make(Vector3 a, Vector3 b)
        {
            foreach (var at in new[] { a, b })
            {
                var g = GameObject.CreatePrimitive(PrimitiveType.Cube); _twins.Add(g);
                g.transform.localScale = new Vector3(30f, 1f, 30f); g.transform.position = at + new Vector3(0f, -0.5f, 0f);
            }
            Physics.SyncTransforms();
            var pairs = new List<Pair>();
            var x = 0f;
            foreach (var id in Bodies)
            {
                var person = SecondFace.Core.Npc.RbPeople.Of(id);
                var pair = new Pair { Id = id, Female = !(person?.Male ?? id.Contains("Male")) };
                for (var k = 0; k < 2; k++)
                {
                    var walker = Walker.Create(_cat.Get(id), _controller, (k == 0 ? a : b) + new Vector3(x, 0f, 0f), 0f, person?.Male ?? id.Contains("Male"));
                    walker.gameObject.name = "precision twin " + id;   // (alike: the same name, the same seeds)
                    _twins.Add(walker.gameObject);
                    RbDress.Apply(walker.gameObject, SecondFace.Core.Npc.RbPeople.DyesFor(person, "walker_" + id, person?.Roles?.FirstOrDefault() ?? "settler", null));
                    if (walker.Agent != null) walker.Agent.enabled = false;
                    walker.enabled = false;
                    if (k == 0) { pair.A = walker.Animator; pair.RA = walker.transform; } else { pair.B = walker.Animator; pair.RB = walker.transform; }
                }
                pairs.Add(pair);
                x += 1.8f;
            }
            _watch.Pairs = pairs;
            return pairs;
        }

        private IEnumerator Clear()
        {
            foreach (var g in _twins) if (g != null) Object.Destroy(g);
            _twins.Clear();
            yield return null; yield return null;
        }

        private IEnumerator Run(string name, IEnumerator seq, List<Seg> into)
        {
            _watch.S = new Seg { Name = name }; _watch.On = true;
            yield return seq;
            _watch.On = false;
            into.Add(_watch.S);
            Debug.Log("FloatingOriginPrecisionTests: " + _watch.S.Line());
        }

        private static void Within(List<string> fails, Seg s, Bound b, string basis)
        {
            if (s.Mm > b.Mm) fails.Add($"{s.Name}: place {s.Mm:0.000} mm over {b.Mm:0.000} ({basis}; {s.WhereMm})");
            if (s.Deg > b.Deg) fails.Add($"{s.Name}: turn {s.Deg:0.0000}° over {b.Deg:0.0000}° ({basis}; {s.WhereDeg})");
            if (s.SkinMm > b.SkinMm) fails.Add($"{s.Name}: the skin {s.SkinMm:0.000} mm over {b.SkinMm:0.000} ({basis}; {s.WhereSkin})");
        }

        // ---- (a1) --------------------------------------------------------------------------------------------------------------

        /// <summary>(a1) The town's continuous systems (the Animator in the town's states, every people system off; the skin's drawn
        /// vertices) at the farthest place the box lets anyone stand, within the curve's own value there ×1.5.</summary>
        [UnityTest, Timeout(1800000)]
        public IEnumerator TheTownsSystemsAtTheBoxsEdge()
        {
            if (!Ready()) { Assert.Ignore("the cast, the controller or the world's assets are not built"); yield break; }
            var keep = Time.captureDeltaTime; Time.captureDeltaTime = 1f / 60f;
            var segs = new List<Seg>();
            try
            {
                var pairs = Make(Vector3.zero, BoxEdge);
                yield return Frames(30);
                Only(pairs);
                yield return Frames(5);
                yield return Run($"every people system off, town, the twin at {BoxEdge}", Town(pairs), segs);
            }
            finally { Time.captureDeltaTime = keep; }
            var fails = new List<string>();
            Within(fails, segs[0], TownAtTheEdge, "the curve at 908 m ×1.5");
            Assert.That(fails, Is.Empty, string.Join("\n", fails));
        }

        /// <summary>(a1) The fight's continuous systems (the Animator's fight layer, every people system off; Fighter alone: TwoBone on the
        /// rifle, PistolAim, the springs of a heavy hit) at 32 m, the farthest a re-centred fight's centre stands, within the near-origin
        /// control's (the twin 16 m out) ×2.</summary>
        [UnityTest, Timeout(1800000)]
        public IEnumerator TheFightsSystemsAtAReCentredFightsEdge()
        {
            if (!Ready()) { Assert.Ignore("the cast, the controller or the world's assets are not built"); yield break; }
            var keep = Time.captureDeltaTime; Time.captureDeltaTime = 1f / 60f;
            var segs = new List<Seg>();
            var target = new Vector3(0f, 1.1f, 8f);
            try
            {
                var pairs = Make(Vector3.zero, FightEdge);
                yield return Frames(30);
                Only(pairs);
                yield return Frames(5);
                yield return Run("every people system off, the fight's layer", FightLayer(pairs), segs);
                Only(pairs, typeof(ClipTurnFirst));
                Views(pairs, "w_carbine556", _watch, _fx, _assets.Combat);
                yield return Frames(72);
                Only(pairs, typeof(ClipTurnFirst));
                yield return Run("Fighter alone: the rifle's aim and fire (TwoBone)", Both(pairs, _watch, (v, r) => AimFire(v, r, target, 3), 12f), segs);
                Views(pairs, "w_pistol9", _watch, _fx, _assets.Combat);
                yield return Frames(72);
                Only(pairs, typeof(ClipTurnFirst));
                yield return Run("Fighter alone: the pistol's aim and fire (PistolAim)", Both(pairs, _watch, (v, r) => AimFire(v, r, target, 2), 12f), segs);
                yield return Run("Fighter alone: a heavy hit (the springs)", Both(pairs, _watch, (v, r) => Then(() => v.OnHit(r.position + Vector3.forward * 8f, "torso", "crit"), 2.5f), 6f), segs);
                foreach (var p in pairs) { p.VA?.OnEnd(); p.VB?.OnEnd(); }
            }
            finally { Time.captureDeltaTime = keep; }
            var fails = new List<string>();
            Within(fails, segs[0], FightLayerControl, "the 16 m control ×2");
            Within(fails, segs[1], TwoBoneControl, "the 16 m control ×2");
            Within(fails, segs[2], PistolAimControl, "the 16 m control ×2");
            Within(fails, segs[3], SpringsControl, "the 16 m control ×2");
            Assert.That(fails, Is.Empty, string.Join("\n", fails));
        }

        /// <summary>(a1) Shale's place: raw, as the game stood before the floating origin (16 km out: for the record), and through the origin
        /// (the world started on Shale's chunk, the twin about 115 m out): the town's systems there within the curve at 128 m ×1.5.</summary>
        [UnityTest, Timeout(1800000)]
        public IEnumerator ShaleBeforeAndAfterTheFloatingOrigin()
        {
            if (!Ready()) { Assert.Ignore("the cast, the controller or the world's assets are not built"); yield break; }
            var keep = Time.captureDeltaTime; Time.captureDeltaTime = 1f / 60f;
            var before = new List<Seg>(); var after = new List<Seg>();
            try
            {
                foreach (var through in new[] { false, true })
                {
                    WorldOrigin.Reset();
                    if (through) WorldOrigin.StartAt(Shale.x, Shale.z);
                    var twin = WorldOrigin.ToUnity(Shale);
                    var pairs = Make(Vector3.zero, twin);
                    yield return Frames(30);
                    Only(pairs);
                    yield return Frames(5);
                    yield return Run($"every people system off, town, {(through ? "through the origin" : "raw")}: the twin at Unity {twin}", Town(pairs), through ? after : before);
                    yield return Clear();
                }
            }
            finally { Time.captureDeltaTime = keep; WorldOrigin.Reset(); }
            var fails = new List<string>();
            Within(fails, after[0], TownAt128, "the curve at 128 m ×1.5");
            Assert.That(fails, Is.Empty, string.Join("\n", fails));
        }

        // ---- (a2) --------------------------------------------------------------------------------------------------------------

        /// <summary>(a2) The branching systems' spread, recorded (no bound until item (iv)): FootPlant alone in town and ArmClearance alone
        /// (managed and the job) in town and the fight's layer, at the near-origin control (16 m) and at the box's edge (908 m), four offsets
        /// each. Explicit: it records for MRC §19.4, run by name. Writes test-results/origin_spreads.txt.</summary>
        [UnityTest, Explicit("records the branching systems' spread for MRC §19.4; run by name"), Timeout(3600000)]
        public IEnumerator TheBranchingSystemsSpreadRecorded()
        {
            if (!Ready()) { Assert.Ignore("the cast, the controller or the world's assets are not built"); yield break; }
            var keep = Time.captureDeltaTime; Time.captureDeltaTime = 1f / 60f;
            var segs = new List<Seg>();
            try
            {
                var offsets = new[] { Vector3.zero, new Vector3(0.37f, 0f, 0.71f), new Vector3(0.71f, 0f, 0.37f), new Vector3(1.13f, 0f, 0.29f) };
                foreach (var at in new[] { new Vector3(16f, 0f, 16f), BoxEdge })
                    foreach (var off in offsets)
                    {
                        var tag = $"the twin at {at + off}";
                        var pairs = Make(Vector3.zero, at + off);
                        yield return Frames(30);
                        Only(pairs, typeof(FootPlant));
                        yield return Frames(5);
                        yield return Run($"{tag}: FootPlant alone, town", Town(pairs), segs);
                        foreach (var managed in new[] { true, false })
                        {
                            ArmClearance.ManagedStep = managed;
                            Only(pairs, typeof(ArmClearance));
                            yield return Frames(5);
                            yield return Run($"{tag}: ArmClearance alone ({(managed ? "managed" : "the job")}), town", Town(pairs), segs);
                            yield return Run($"{tag}: ArmClearance alone ({(managed ? "managed" : "the job")}), the fight's layer", FightLayer(pairs), segs);
                        }
                        yield return Clear();
                    }
            }
            finally { Time.captureDeltaTime = keep; ArmClearance.ManagedStep = false; }
            File.WriteAllLines(Path.Combine(Application.dataPath, "..", "test-results", "origin_spreads.txt"), segs.Select(s => s.Line()));
        }
    }
}
