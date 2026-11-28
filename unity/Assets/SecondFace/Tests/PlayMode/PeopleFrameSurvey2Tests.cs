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
    /// TEMP (relaunch 16, never committed; v2: the grounds synced, and the float step's curve): the people at Shale's place against the same people at the world's origin, system by
    /// system. Each body twice, one at the origin and one at (15369, 39, 4493), on its own ground; the same states frame for frame;
    /// after every frame each bone down the chain compared root-relative (its place in the root's frame, its local turn) and its
    /// one-frame step against its twin's. Configurations: every people system off, then each alone, then all; then the fight's
    /// own (Fighter's IK, the springs, the ragdoll's fall and rise) alone and with all. The skin's drawn vertices (BakeMesh) every
    /// 30 frames. Writes test-results/frame_survey.txt.
    /// </summary>
    public class PeopleFrameSurvey2Tests
    {
        private static readonly string[] Bodies = { "Female_Adult_01", "Business_Female_02", "Male_Adult_08", "Construction_Male_03" };
        // (SURVEY_SHIFT "dx" or "x,y,z": twin B's offset; Shale's place by default)
        private static Vector3 Far
        {
            get
            {
                var v = (System.Environment.GetEnvironmentVariable("SURVEY_SHIFT") ?? "").Split(',');
                float F(int i) => i < v.Length && float.TryParse(v[i], System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var f) ? f : 0f;
                if (v.Length >= 3) return new Vector3(F(0), F(1), F(2));
                if (v[0].Length > 0) return new Vector3(F(0), 0f, 0f);
                return new Vector3(15369f, 39f, 4493f);
            }
        }
        /// <summary>SURVEY_BASE (m along x): both twins moved this far (the 0.1 mm chaos runs: the twins 16 m apart, so their ragdolls
        /// never meet, both within the same float step).</summary>
        private static Vector3 Base => float.TryParse(System.Environment.GetEnvironmentVariable("SURVEY_BASE"), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var b) ? new Vector3(b, 0f, 0f) : Vector3.zero;
        private static readonly HumanBodyBones[] Chain =
        {
            HumanBodyBones.Hips, HumanBodyBones.Spine, HumanBodyBones.Chest, HumanBodyBones.UpperChest, HumanBodyBones.Neck, HumanBodyBones.Head,
            HumanBodyBones.LeftShoulder, HumanBodyBones.RightShoulder, HumanBodyBones.LeftUpperArm, HumanBodyBones.RightUpperArm,
            HumanBodyBones.LeftLowerArm, HumanBodyBones.RightLowerArm, HumanBodyBones.LeftHand, HumanBodyBones.RightHand,
            HumanBodyBones.LeftUpperLeg, HumanBodyBones.RightUpperLeg, HumanBodyBones.LeftLowerLeg, HumanBodyBones.RightLowerLeg,
            HumanBodyBones.LeftFoot, HumanBodyBones.RightFoot, HumanBodyBones.LeftToes, HumanBodyBones.RightToes,
        };
        private readonly List<GameObject> _made = new();

        [UnityTearDown]
        public IEnumerator CleanUp()
        {
            foreach (var g in _made) if (g != null) Object.Destroy(g);
            _made.Clear();
            ArmClearance.ManagedStep = false;
            yield return null;
        }

        private sealed class Pair
        {
            public string Id; public Animator A, B; public Transform RA, RB; public bool Female;
            public readonly Vector3[] PA = new Vector3[Chain.Length], PB = new Vector3[Chain.Length];
            public readonly Quaternion[] QA = new Quaternion[Chain.Length], QB = new Quaternion[Chain.Length];
            public bool HasPrev;
            public AnimatedUnitView VA, VB;
        }

        private sealed class Seg
        {
            public string Name; public int Frames;
            public readonly float[] Pos = new float[Chain.Length], Rot = new float[Chain.Length], JumpCm = new float[Chain.Length], JumpDeg = new float[Chain.Length];
            public readonly string[] WherePos = new string[Chain.Length];
            public float Skin; public string WhereSkin = ""; public int SkinSamples;
            public string Line()
            {
                var parts = new List<string>();
                for (var i = 0; i < Chain.Length; i++)
                    parts.Add($"{Chain[i]} {Pos[i] * 1000f:0.0} mm {Rot[i]:0.000}° (step {JumpCm[i]:0.00} cm {JumpDeg[i]:0.00}°)");
                var worst = Enumerable.Range(0, Chain.Length).OrderByDescending(i => Pos[i]).First();
                var worstRot = Enumerable.Range(0, Chain.Length).OrderByDescending(i => Rot[i]).First();
                var worstJump = Enumerable.Range(0, Chain.Length).OrderByDescending(i => JumpCm[i]).First();
                var worstJumpDeg = Enumerable.Range(0, Chain.Length).OrderByDescending(i => JumpDeg[i]).First();
                return $"{Name}: {Frames} frames; largest place {Pos[worst] * 1000f:0.0} mm at {Chain[worst]} ({WherePos[worst]}); largest local turn {Rot[worstRot]:0.000}° at {Chain[worstRot]};"
                     + $" largest one-frame step beyond its twin {JumpCm[worstJump]:0.00} cm at {Chain[worstJump]}, {JumpDeg[worstJumpDeg]:0.00}° at {Chain[worstJumpDeg]};"
                     + $" skin's drawn vertices {Skin * 1000f:0.00} mm ({WhereSkin}, {SkinSamples} samples)\n    " + string.Join("; ", parts);
            }
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
                    for (var i = 0; i < Chain.Length; i++)
                    {
                        var a = p.A.GetBoneTransform(Chain[i]); var b = p.B.GetBoneTransform(Chain[i]);
                        if (a == null || b == null) continue;
                        var pa = ia * (a.position - p.RA.position); var pb = ib * (b.position - p.RB.position);
                        var qa = ia * a.rotation; var qb = ib * b.rotation;
                        var d = (pa - pb).magnitude;
                        if (d > S.Pos[i]) { S.Pos[i] = d; S.WherePos[i] = $"{p.Id} at the segment's frame {S.Frames}"; }
                        S.Rot[i] = Mathf.Max(S.Rot[i], (float)ClearanceJobTests.Ang(a.localRotation, b.localRotation));
                        if (p.HasPrev)
                        {
                            S.JumpCm[i] = Mathf.Max(S.JumpCm[i], ((pa - p.PA[i]) - (pb - p.PB[i])).magnitude * 100f);
                            S.JumpDeg[i] = Mathf.Max(S.JumpDeg[i], (float)ClearanceJobTests.Ang(Quaternion.Inverse(p.QA[i]) * qa, Quaternion.Inverse(p.QB[i]) * qb));
                        }
                        p.PA[i] = pa; p.PB[i] = pb; p.QA[i] = qa; p.QB[i] = qb;
                    }
                    p.HasPrev = true;
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
                    m = Mathf.Sqrt(m);
                    S.SkinSamples++;
                    if (m > S.Skin) { S.Skin = m; S.WhereSkin = $"{p.Id} at the segment's frame {S.Frames}"; }
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

        private static readonly System.Type[] Systems = { typeof(FootPlant), typeof(Gaze), typeof(HandPose), typeof(ArmClearance), typeof(SeatTurn), typeof(ClipTurnFirst) };
        private static void Only(List<Pair> pairs, params System.Type[] on)
        {
            foreach (var p in pairs)
                foreach (var a in new[] { p.A, p.B })
                    foreach (var t in Systems)
                        foreach (var c in a.GetComponentsInChildren(t, true)) if (c is Behaviour b) b.enabled = on.Contains(t);
        }

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

        [UnityTest, Timeout(3600000)]
        public IEnumerator PeopleAtShaleAgainstTheOrigin()
        {
#if UNITY_EDITOR
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            var controller = AssetDatabase.LoadAssetAtPath<UnityEditor.Animations.AnimatorController>("Assets/SecondFace/People/Locomotion.controller");
            var assets = AssetDatabase.LoadAssetAtPath<WorldAssets>("Assets/SecondFace/World/WorldAssets.asset");
#else
            RocketboxCatalog cat = null; RuntimeAnimatorController controller = null; WorldAssets assets = null;
#endif
            if (cat == null || controller == null || assets == null || assets.Combat == null) { Assert.Ignore("not built"); yield break; }
            if (Registry.Items.Count == 0)
            {
                var db = new ContentDb();
                foreach (var name in ContentDb.Registries) db.Load(name, File.ReadAllText(Path.Combine(Application.streamingAssetsPath, "content", name + ".json")));
                Registry.Load(db);
            }
            var keep = Time.captureDeltaTime; Time.captureDeltaTime = 1f / 60f;
            ArmClearance.ManagedStep = true;   // (the managed step: the reference)
            var lines = new List<string>();
            try
            {
                foreach (var at in new[] { Base, Base + Far })
                {
                    var g = GameObject.CreatePrimitive(PrimitiveType.Cube); _made.Add(g);
                    g.transform.localScale = new Vector3(30f, 1f, 30f); g.transform.position = at + new Vector3(0f, -0.5f, 0f);
                }
                Physics.SyncTransforms();   // (v2: the grounds where they were put before anyone stands on them)
                var host = new GameObject("survey host"); _made.Add(host);
                var watch = host.AddComponent<Watcher>();
                var fxRoot = new GameObject("survey fx"); _made.Add(fxRoot);
                var fx = new CombatFx(fxRoot.transform);
                var pairs = new List<Pair>();
                var x = 0f;
                foreach (var id in Bodies)
                {
                    var prefab = cat.Get(id);
                    var person = SecondFace.Core.Npc.RbPeople.Of(id);
                    var pair = new Pair { Id = id, Female = !(person?.Male ?? id.Contains("Male")) };
                    for (var k = 0; k < 2; k++)
                    {
                        var walker = Walker.Create(prefab, controller, Base + new Vector3(x, 0f, 0f) + (k == 1 ? Far : Vector3.zero), 0f, person?.Male ?? id.Contains("Male"));
                        walker.gameObject.name = "survey twin " + id;
                        _made.Add(walker.gameObject);
                        RbDress.Apply(walker.gameObject, SecondFace.Core.Npc.RbPeople.DyesFor(person, "walker_" + id, person?.Roles?.FirstOrDefault() ?? "settler", null));
                        if (walker.Agent != null) walker.Agent.enabled = false;
                        walker.enabled = false;
                        if (k == 0) { pair.A = walker.Animator; pair.RA = walker.transform; } else { pair.B = walker.Animator; pair.RB = walker.transform; }
                    }
                    pairs.Add(pair);
                    x += 1.8f;
                }
                watch.Pairs = pairs;
                yield return Frames(30);
                IEnumerator Run(string name, IEnumerator seq)
                {
                    foreach (var p in pairs) p.HasPrev = false;
                    watch.S = new Seg { Name = name }; watch.On = true;
                    yield return seq;
                    watch.On = false;
                    lines.Add(watch.S.Line());
                    Debug.Log("FRAME SURVEY " + watch.S.Line());
                }
                // the body's own systems, one at a time (SURVEY_ONLY=fight: the fight's own only)
                var onlyFight = System.Environment.GetEnvironmentVariable("SURVEY_ONLY") == "fight";
                foreach (var (label, on) in onlyFight ? new (string, System.Type[])[0] : new (string, System.Type[])[]
                {
                    ("every people system off", new System.Type[0]),
                    ("FootPlant alone", new[] { typeof(FootPlant) }),
                    ("Gaze alone", new[] { typeof(Gaze) }),
                    ("HandPose alone", new[] { typeof(HandPose) }),
                    ("SeatTurn and ClipTurnFirst alone", new[] { typeof(SeatTurn), typeof(ClipTurnFirst) }),
                    ("ArmClearance alone", new[] { typeof(ArmClearance) }),
                    ("all on", Systems),
                })
                {
                    Only(pairs, on);
                    yield return Frames(5);
                    yield return Run($"{label}, town", Town(pairs));
                    yield return Run($"{label}, the fight's layer", FightLayer(pairs));
                }
                // the fight's own: Fighter's IK and springs, the ragdoll
                var target = new Vector3(0f, 1.1f, 8f);
                foreach (var (label, on) in new (string, System.Type[])[] { ("Fighter alone", new System.Type[] { typeof(ClipTurnFirst) }), ("the fight, all on", Systems) })
                {
                    Only(pairs, on);
                    Views(pairs, "w_carbine556", host.GetComponent<Watcher>(), fx, assets.Combat);
                    yield return Frames(72);
                    Only(pairs, on);   // (a fighter's own components, ClipTurnFirst among them, as the configuration says)
                    yield return Run($"{label}: the rifle's aim and fire (TwoBone, the aim)", Both(pairs, watch, (v, r) => AimFire(v, r, target, 3), 12f));
                    yield return Run($"{label}: the rifle's reload", Both(pairs, watch, (v, r) => v.OnReload(), 8f));
                    Views(pairs, "w_pistol9", watch, fx, assets.Combat);
                    yield return Frames(72);
                    Only(pairs, on);
                    yield return Run($"{label}: the pistol's aim and fire (PistolAim)", Both(pairs, watch, (v, r) => AimFire(v, r, target, 2), 12f));
                    yield return Run($"{label}: a heavy hit (the springs)", Both(pairs, watch, (v, r) => Then(() => v.OnHit(r.position + Vector3.forward * 8f, "torso", "crit"), 2.5f), 6f));
                    Views(pairs, null, watch, fx, assets.Combat);
                    yield return Frames(72);
                    Only(pairs, on);
                    yield return Run($"{label}: the fall (the ragdoll)", Both(pairs, watch, (v, r) => Then(() => v.OnFall(r.position + Vector3.forward * 2f), 4f), 8f));
                    yield return Run($"{label}: the rise (the hand-back and the get-up)", Both(pairs, watch, (v, r) => Rise(v), 22f));
                    foreach (var p in pairs) { p.VA?.OnEnd(); p.VB?.OnEnd(); }
                    yield return Frames(60);
                }
            }
            finally { Time.captureDeltaTime = keep; ArmClearance.ManagedStep = false; }
            var path = Path.Combine(Application.dataPath, "..", "test-results", "frame_survey_synced.txt");
            File.WriteAllLines(path, lines);
            Debug.Log("FRAME SURVEY written: " + path);
        }

        /// <summary>v2: (a1) each continuous system alone (the Animator's evaluation and the skin's drawn vertices, with every people
        /// system off; Fighter's holds TwoBone, PistolAim and the springs) with twin B at a sweep of distances, three offsets each (the
        /// curve's own scatter); (a2) FootPlant and ArmClearance alone (managed and the job) at 16 m and 908 m, four offsets each.
        /// Writes test-results/frame_curve.txt.</summary>
        [UnityTest, Timeout(7200000)]
        public IEnumerator Curve()
        {
#if UNITY_EDITOR
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            var controller = AssetDatabase.LoadAssetAtPath<UnityEditor.Animations.AnimatorController>("Assets/SecondFace/People/Locomotion.controller");
            var assets = AssetDatabase.LoadAssetAtPath<WorldAssets>("Assets/SecondFace/World/WorldAssets.asset");
#else
            RocketboxCatalog cat = null; RuntimeAnimatorController controller = null; WorldAssets assets = null;
#endif
            if (cat == null || controller == null || assets == null || assets.Combat == null) { Assert.Ignore("not built"); yield break; }
            if (Registry.Items.Count == 0)
            {
                var db = new ContentDb();
                foreach (var name in ContentDb.Registries) db.Load(name, File.ReadAllText(Path.Combine(Application.streamingAssetsPath, "content", name + ".json")));
                Registry.Load(db);
            }
            var keep = Time.captureDeltaTime; Time.captureDeltaTime = 1f / 60f;
            var lines = new List<string>();
            var host = new GameObject("curve host"); _made.Add(host);
            var watch = host.AddComponent<Watcher>();
            var fxRoot = new GameObject("curve fx"); _made.Add(fxRoot);
            var fx = new CombatFx(fxRoot.transform);
            var twins = new List<GameObject>();
            List<Pair> Make(Vector3 a, Vector3 b)
            {
                foreach (var at in new[] { a, b })
                {
                    var g = GameObject.CreatePrimitive(PrimitiveType.Cube); twins.Add(g);
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
                        var walker = Walker.Create(cat.Get(id), controller, (k == 0 ? a : b) + new Vector3(x, 0f, 0f), 0f, person?.Male ?? id.Contains("Male"));
                        walker.gameObject.name = "curve twin " + id;
                        twins.Add(walker.gameObject);
                        RbDress.Apply(walker.gameObject, SecondFace.Core.Npc.RbPeople.DyesFor(person, "walker_" + id, person?.Roles?.FirstOrDefault() ?? "settler", null));
                        if (walker.Agent != null) walker.Agent.enabled = false;
                        walker.enabled = false;
                        if (k == 0) { pair.A = walker.Animator; pair.RA = walker.transform; } else { pair.B = walker.Animator; pair.RB = walker.transform; }
                    }
                    pairs.Add(pair);
                    x += 1.8f;
                }
                watch.Pairs = pairs;
                return pairs;
            }
            IEnumerator Clear() { foreach (var g in twins) if (g != null) Object.Destroy(g); twins.Clear(); yield return null; yield return null; }
            string tag = "";
            IEnumerator Run(List<Pair> pairs, string name, IEnumerator seq)
            {
                foreach (var p in pairs) p.HasPrev = false;
                watch.S = new Seg { Name = name }; watch.On = true;
                yield return seq;
                watch.On = false;
                var S = watch.S;
                var wp = Enumerable.Range(0, Chain.Length).OrderByDescending(k => S.Pos[k]).First();
                var wr = Enumerable.Range(0, Chain.Length).OrderByDescending(k => S.Rot[k]).First();
                var line = $"{tag} | {name}: place {S.Pos[wp] * 1000f:0.000} mm ({Chain[wp]}, {S.WherePos[wp]}); turn {S.Rot[wr]:0.0000}° ({Chain[wr]}); skin {S.Skin * 1000f:0.000} mm ({S.WhereSkin}); {S.Frames} frames";
                lines.Add(line);
                Debug.Log("FRAME CURVE " + line);
            }
            var target = new Vector3(0f, 1.1f, 8f);
            try
            {
                // (a1) the continuous systems
                var dists = new (string Name, Vector3 At)[]
                {
                    ("16 m", new Vector3(16f, 0f, 16f)), ("128 m", new Vector3(128f, 0f, 128f)), ("512 m", new Vector3(512f, 0f, 512f)), ("908 m", new Vector3(908f, 0f, 908f)),
                    ("1024 m", new Vector3(1024f, 0f, 1024f)), ("2048 m", new Vector3(2048f, 0f, 2048f)), ("Shale", new Vector3(15369f, 39f, 4493f)),
                };
                var offs = new[] { Vector3.zero, new Vector3(0.37f, 0f, 0.71f), new Vector3(0.71f, 0f, 0.37f) };
                foreach (var (dn, at) in dists)
                    foreach (var off in offs)
                    {
                        tag = $"a1 {dn} +({off.x:0.00}, {off.z:0.00})";
                        ArmClearance.ManagedStep = true;
                        var pairs = Make(Vector3.zero, at + off);
                        yield return Frames(30);
                        Only(pairs);
                        yield return Frames(5);
                        yield return Run(pairs, "every people system off, town", Town(pairs));
                        yield return Run(pairs, "every people system off, the fight's layer", FightLayer(pairs));
                        Only(pairs, typeof(ClipTurnFirst));
                        Views(pairs, "w_carbine556", watch, fx, assets.Combat);
                        yield return Frames(72);
                        Only(pairs, typeof(ClipTurnFirst));
                        yield return Run(pairs, "Fighter alone: the rifle's aim and fire (TwoBone)", Both(pairs, watch, (v, r) => AimFire(v, r, target, 3), 12f));
                        Views(pairs, "w_pistol9", watch, fx, assets.Combat);
                        yield return Frames(72);
                        Only(pairs, typeof(ClipTurnFirst));
                        yield return Run(pairs, "Fighter alone: the pistol's aim and fire (PistolAim)", Both(pairs, watch, (v, r) => AimFire(v, r, target, 2), 12f));
                        yield return Run(pairs, "Fighter alone: a heavy hit (the springs)", Both(pairs, watch, (v, r) => Then(() => v.OnHit(r.position + Vector3.forward * 8f, "torso", "crit"), 2.5f), 6f));
                        foreach (var p in pairs) { p.VA?.OnEnd(); p.VB?.OnEnd(); }
                        yield return Clear();
                    }
                // (a2) the branching systems: distributions at the near-origin control and at the box's edge
                var offs2 = new[] { Vector3.zero, new Vector3(0.37f, 0f, 0.71f), new Vector3(0.71f, 0f, 0.37f), new Vector3(1.13f, 0f, 0.29f) };
                foreach (var (dn, at) in new[] { ("16 m", new Vector3(16f, 0f, 16f)), ("908 m", new Vector3(908f, 0f, 908f)) })
                    foreach (var off in offs2)
                    {
                        tag = $"a2 {dn} +({off.x:0.00}, {off.z:0.00})";
                        var pairs = Make(Vector3.zero, at + off);
                        yield return Frames(30);
                        Only(pairs, typeof(FootPlant));
                        yield return Frames(5);
                        yield return Run(pairs, "FootPlant alone, town", Town(pairs));
                        foreach (var managed in new[] { true, false })
                        {
                            ArmClearance.ManagedStep = managed;
                            Only(pairs, typeof(ArmClearance));
                            yield return Frames(5);
                            yield return Run(pairs, $"ArmClearance alone ({(managed ? "managed" : "the job")}), town", Town(pairs));
                            yield return Run(pairs, $"ArmClearance alone ({(managed ? "managed" : "the job")}), the fight's layer", FightLayer(pairs));
                        }
                        yield return Clear();
                    }
            }
            finally { Time.captureDeltaTime = keep; ArmClearance.ManagedStep = false; }
            var path = Path.Combine(Application.dataPath, "..", "test-results", "frame_curve.txt");
            File.WriteAllLines(path, lines);
            Debug.Log("FRAME CURVE written: " + path);
        }

        private static IEnumerator AimFire(AnimatedUnitView v, Transform r, Vector3 ahead, int rounds)
        {
            yield return v.OnAim(r.position + ahead);
            for (var i = 0; i < 60; i++) yield return null;
            for (var i = 0; i < rounds; i++) yield return v.OnFire(r.position + ahead, true, i, rounds);
        }
        private static IEnumerator Then(System.Action a, float s) { a(); for (var t = 0f; t < s; t += Time.deltaTime) yield return null; }
        private static IEnumerator Rise(AnimatedUnitView v)
        {
            v.OnRise();
            yield return null;
            for (var t = 0f; t < 20f && v.Rising; t += Time.deltaTime) yield return null;
        }
    }
}
