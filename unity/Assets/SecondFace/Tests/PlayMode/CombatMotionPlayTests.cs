using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Combat;
using SecondFace.Core.Content;
using SecondFace.Core.Inventory;
using SecondFace.Core.Npc;
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
    /// The fight's motion with weapons in hands (COMBAT.md A1–A8), on the game's own people (a Rocketbox man and woman as the
    /// gate makes them, with the people's controller and every runtime system on) through the game's own view
    /// (<see cref="CombatViews.ForBody"/>, the path a fight takes): each action plays its state and comes back to the weapon's
    /// stance by itself; the weapon stays in the hand (its grip within 1 cm of the palm) and the off hand on its grip
    /// (within 2 cm) all through aim and fire; every one-shot state of the table goes on where the table says within its
    /// own length (none is left hanging); in a fight the game starts, the bodies are the animated views. Needs the fight's
    /// set built (Second Face/Build the fight's motion and weapons): ignored until then.
    /// </summary>
    public class CombatMotionPlayTests
    {
        private sealed class Host : MonoBehaviour { }

        private GameObject _root;
        private Host _host;
        private CombatFx _fx;
        private WorldAssets _assets;
        private RocketboxCatalog _cat;
        private readonly List<GameObject> _bodies = new();

        private const string Man = "Male_Adult_08", Woman = "Female_Adult_01";

        [UnityTearDown]
        public IEnumerator CleanUp()
        {
            if (_root != null) Object.Destroy(_root);
            _bodies.Clear();
            yield return null;
        }

        private static void Content()
        {
            if (Registry.Items.Count > 0) return;
            var db = new ContentDb();
            foreach (var name in ContentDb.Registries) db.Load(name, File.ReadAllText(Path.Combine(Application.streamingAssetsPath, "content", name + ".json")));
            Registry.Load(db);
        }

        /// <summary>Flat ground, a sun, the catalogue and the fight's set (ignored when it is not built).</summary>
        private IEnumerator Arena()
        {
#if UNITY_EDITOR
            _cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            _assets = AssetDatabase.LoadAssetAtPath<WorldAssets>("Assets/SecondFace/World/WorldAssets.asset");
#endif
            if (_cat == null || _assets == null || _assets.Locomotion == null) { Assert.Ignore("no Rocketbox catalogue or locomotion built"); yield break; }
            if (_assets.Combat == null || _assets.Combat.Controller == null) { Assert.Ignore("the fight's motion is not built (Second Face/Build the fight's motion and weapons)"); yield break; }
            yield return BootTests.Clear();
            Content();
            _root = new GameObject("combat arena");
            var ground = GameObject.CreatePrimitive(PrimitiveType.Cube);
            ground.transform.SetParent(_root.transform);
            ground.transform.localScale = new Vector3(80f, 1f, 80f); ground.transform.position = new Vector3(0f, -0.5f, 0f);
            var sun = new GameObject("sun").AddComponent<Light>();
            sun.transform.SetParent(_root.transform);
            sun.type = LightType.Directional; sun.transform.rotation = Quaternion.Euler(50f, 150f, 0f);
            _host = _root.AddComponent<Host>();
            _fx = new CombatFx(_root.transform);
        }

        private static BattleUnit Unit(string id, string weapon)
        {
            var inv = Inv.Empty();
            if (weapon != null) { Inv.AddItem(inv, Inv.MakeItem(weapon)); Inv.Equip(inv, 0); }
            var c = new Combatant { Id = id, Name = id, Team = "test", Sheet = Sheet.Empty(id), Inv = inv, Ap = 8, Morale = 60 };
            var u = new BattleUnit { C = c };
            u.Place(0, 0);
            return u;
        }

        /// <summary>A person as the game makes them, in a fight's view holding <paramref name="weapon"/>.</summary>
        private AnimatedUnitView Person(string id, Vector3 at, string weapon)
        {
            var go = Object.Instantiate(_cat.Get(id), at, Quaternion.identity, _root.transform);
            go.name = "fighter_" + id;
            var p = RbPeople.Of(id);
            RbDress.Apply(go, RbPeople.DyesFor(p, "combat_" + id, p?.Roles?.FirstOrDefault() ?? "settler", null));
            var a = go.GetComponentInChildren<Animator>();
            Assert.That(a, Is.Not.Null, id + "'s animator");
            var amb = PeopleService.Animate(a, _assets.Locomotion, id);
            if (amb != null) amb.MinGap = amb.MaxGap = 1e6f;
            a.cullingMode = AnimatorCullingMode.AlwaysAnimate;
            Assert.That(Fighter.HasLayers(a), Is.True, "the people's controller carries the fight's layers");
            _bodies.Add(go);
            var view = CombatViews.ForBody(Unit(id, weapon), go.transform, _host, _fx, _assets.Combat, female: p != null ? !p.Male : id.Contains("Female"), theirs: false);
            Assert.That(view, Is.Not.Null, id + "'s view");
            return view;
        }

        private static IEnumerator Wait(float s) { for (var t = 0f; t < s; t += Time.deltaTime) yield return null; }

        /// <summary>Runs <paramref name="act"/> and records every whole-body state the fighter goes through until
        /// <paramref name="after"/> seconds past its end.</summary>
        private IEnumerator Seen(AnimatedUnitView v, IEnumerator act, List<string> seen, float after)
        {
            var f = v.Fighter;
            var done = false;
            IEnumerator Run() { yield return act; done = true; }
            _host.StartCoroutine(Run());
            var tail = 0f;
            while (tail < after)
            {
                if (f.Current != null && (seen.Count == 0 || seen[^1] != f.Current)) seen.Add(f.Current);
                if (done) tail += Time.deltaTime;
                yield return null;
            }
        }

        private static IEnumerator Do(System.Action a) { a(); yield break; }

        private static readonly (string Item, Arms Arms)[] Kit =
        {
            ("w_carbine556", Arms.Rifle), ("w_pistol9", Arms.Pistol), ("w_machete", Arms.Melee), (null, Arms.Unarmed), ("w_sledge", Arms.Club2),
        };

        // ------------------------------------------------------------------------------------------------------------

        [UnityTest, Timeout(1800000)]
        public IEnumerator EveryActionPlaysItsStateAndComesBackToTheStance()
        {
            yield return Arena();
            var target = new Vector3(0f, 0f, 8f);
            var wrong = new List<string>();
            foreach (var (item, arms) in Kit)
                foreach (var id in new[] { Man, Woman })
                {
                    var v = Person(id, new Vector3(0f, 0f, 0f), item);
                    var f = v.Fighter;
                    var who = $"{id} with {item ?? "fists"}";
                    yield return Wait(1.2f);
                    var idle = CombatMotion.Idle(arms);
                    if (f.Current != idle) wrong.Add($"{who}: drew into {f.Current}, not {idle}");
                    if (f.Held.Shown && !f.InHand) wrong.Add($"{who}: the weapon not drawn");
                    IEnumerator Returns(string what, float within)
                    {
                        for (var t = 0f; t < within && f.Current != idle; t += Time.deltaTime) yield return null;
                        if (f.Current != idle) wrong.Add($"{who}: after {what}, {f.Current} (not back to {idle} within {within} s)");
                    }
                    var seen = new List<string>();
                    if (arms == Arms.Rifle || arms == Arms.Pistol)
                    {
                        yield return Seen(v, v.OnAim(target), seen, 0.1f);
                        if (!f.Is(CombatMotion.Aim(arms))) wrong.Add($"{who}: aimed into {f.Current}, not {CombatMotion.Aim(arms)}");
                        seen.Clear();
                        yield return Seen(v, v.OnFire(target + Vector3.up * 1.1f, true, 0, 1), seen, 0.1f);
                        if (arms == Arms.Rifle && !seen.Contains("rifle_fire")) wrong.Add($"{who}: a shot played {string.Join(",", seen)}");
                        if (arms == Arms.Rifle)
                        {
                            seen.Clear();
                            IEnumerator Burst() { for (var i = 0; i < 3; i++) yield return v.OnFire(target + Vector3.up * 1.1f, true, i, 3); }
                            yield return Seen(v, Burst(), seen, 0.1f);
                            if (!seen.Contains("rifle_burst")) wrong.Add($"{who}: a burst played {string.Join(",", seen)}");
                        }
                        yield return Returns("the shots (lowered)", 4f);
                        seen.Clear();
                        yield return Seen(v, v.OnReload(), seen, 0.2f);
                        if (!seen.Contains(CombatMotion.Reload(arms))) wrong.Add($"{who}: a reload played {string.Join(",", seen)}");
                        yield return Returns("the reload", 3f);
                    }
                    else
                    {
                        for (var n = 0; n < 2; n++)
                        {
                            seen.Clear();
                            var blow = CombatMotion.Strike(arms, f.Female, n);
                            yield return Seen(v, v.OnStrike(target, true), seen, 0.1f);
                            if (!seen.Contains(blow)) wrong.Add($"{who}: blow {n} played {string.Join(",", seen)}, not {blow}");
                            yield return Returns(blow, 4f);
                        }
                        seen.Clear();
                        yield return Seen(v, Do(() => v.OnMiss(target, true)), seen, 0.3f);
                        if (seen.Count == 0 || seen.All(s => s == idle)) wrong.Add($"{who}: a blow that missed played nothing");
                        yield return Returns("a miss", 4f);
                    }
                    // a crit from the front staggers; a graze from behind only turns the body (the procedural hit)
                    seen.Clear();
                    yield return Seen(v, Do(() => v.OnHit(target, "torso", "crit")), seen, 0.3f);
                    if (!seen.Contains(CombatMotion.Heavy(false, "torso"))) wrong.Add($"{who}: a crit played {string.Join(",", seen)}");
                    yield return Returns("a crit", 5f);
                    // down into cover and up
                    seen.Clear();
                    yield return Seen(v, Do(() => v.OnStance("crouch")), seen, 3.5f);
                    if (!seen.Contains("cover_down") || f.Current != CombatMotion.Cover(arms)) wrong.Add($"{who}: a crouch played {string.Join(",", seen)}, holds {f.Current}");
                    v.OnStance("stand");
                    yield return Returns("standing up", 2f);
                    // a throw (the weapon back in hand after it)
                    seen.Clear();
                    var arc = new List<Vector3>();
                    PlaceholderUnitView.ArcPoints(v.Body.position + Vector3.up * 1.5f, target, arc);
                    yield return Seen(v, v.OnThrow(arc, "w_frag"), seen, 0.2f);
                    if (!seen.Contains("throw")) wrong.Add($"{who}: a throw played {string.Join(",", seen)}");
                    yield return Returns("a throw", 3f);
                    if (f.Held.Shown && !f.InHand) wrong.Add($"{who}: the weapon not back in hand after the throw");
                    // hands up
                    seen.Clear();
                    yield return Seen(v, Do(v.OnYield), seen, 1.5f);
                    if (f.Current != "yield_hold") wrong.Add($"{who}: hands up played {string.Join(",", seen)}, holds {f.Current}");
                    v.OnEnd();
                    yield return Wait(1.5f);
                    if (f.FullWeight > 0.05f) wrong.Add($"{who}: the fight's layer still weighs {f.FullWeight:0.00} after the end");
                    Object.Destroy(v.Body.gameObject);
                    yield return null;
                }
            Assert.That(wrong, Is.Empty, string.Join("\n", wrong));
        }

        /// <summary>COMBAT.md A1: the weapon stays in the hand (its main grip within 1 cm of the palm's centre) in every frame,
        /// and the off hand on the weapon's grip_off (a pistol's support beside its grip) within 2 cm through the aim, the shot
        /// and the burst, and through the carry over a walk.</summary>
        [UnityTest, Timeout(900000)]
        public IEnumerator WeaponsStayInHandAndTheOffHandOnItsGrip()
        {
            yield return Arena();
            var target = new Vector3(0f, 0f, 9f);
            var wrong = new List<string>();
            foreach (var item in new[] { "w_carbine556", "w_bolt308", "w_sawnoff", "w_pistol9", "w_revolver38" })
                foreach (var id in new[] { Man, Woman })
                {
                    var v = Person(id, Vector3.zero, item);
                    var f = v.Fighter;
                    yield return Wait(1f);
                    var main = new List<float>(); var off = new List<float>();
                    var done = false;
                    IEnumerator Act()
                    {
                        yield return v.OnAim(target);
                        yield return Wait(1.5f);
                        yield return v.OnFire(target + Vector3.up * 1.1f, true, 0, 1);
                        for (var i = 0; i < 3; i++) yield return v.OnFire(target + Vector3.up * 1.1f, true, i, 3);
                        yield return Wait(0.3f);
                        done = true;
                    }
                    _host.StartCoroutine(Act());
                    while (!done)
                    {
                        if (f.InHand && f.MainError >= 0f) main.Add(f.MainError);
                        if (f.OffError >= 0f) off.Add(f.OffError);
                        yield return null;
                    }
                    var who = $"{id} with {item}";
                    if (main.Count < 30) wrong.Add($"{who}: the weapon in hand {main.Count} frames");
                    else if (main.Max() > 0.01f) wrong.Add($"{who}: the grip {main.Max() * 100f:0.0} cm from the palm (≤ 1)");
                    if (off.Count < 30) wrong.Add($"{who}: the off hand held {off.Count} frames of the aim and fire");
                    else if (off.Max() > 0.02f) wrong.Add($"{who}: the off hand {off.Max() * 100f:0.0} cm from its grip (p100; ≤ 2), p50 {off.OrderBy(x => x).ElementAt(off.Count / 2) * 100f:0.0}");
                    // the carry over a walk (long guns: two hands on it)
                    if (f.Arms == Arms.Rifle)
                    {
                        var carry = new List<float>();
                        f.Locomote(true, false);
                        var a = f.Animator;
                        for (var t = 0f; t < 3f; t += Time.deltaTime)
                        {
                            v.Body.position += v.Body.forward * Walker.WalkSpeed * Time.deltaTime;
                            Pace.Set(a, Walker.WalkSpeed, false, 0.12f, Time.deltaTime);
                            if (t > 0.6f && f.OffError >= 0f) carry.Add(f.OffError);
                            yield return null;
                        }
                        f.Locomote(false, false);
                        a.SetFloat("Speed", 0f);
                        if (carry.Count < 30) wrong.Add($"{who}: the off hand held {carry.Count} frames of the carried walk");
                        else if (carry.Max() > 0.02f) wrong.Add($"{who}: walking, the off hand {carry.Max() * 100f:0.0} cm from its grip (≤ 2)");
                    }
                    v.OnEnd();
                    yield return Wait(0.2f);
                    Object.Destroy(v.Body.gameObject);
                    yield return null;
                }
            Assert.That(wrong, Is.Empty, string.Join("\n", wrong));
        }

        /// <summary>Every one-shot state of the table, played on its own, goes on where the table says (the weapon's idle, its
        /// crouch, or the named state) within its own length at its speed; the loops hold; nothing is left hanging.</summary>
        [UnityTest, Timeout(1800000)]
        public IEnumerator NoStateIsLeftHanging()
        {
            yield return Arena();
            var wrong = new List<string>();
            foreach (var id in new[] { Man, Woman })
            {
                var v = Person(id, Vector3.zero, "w_carbine556");
                var f = v.Fighter;
                yield return Wait(1f);
                v.OnEnd();   // (the view's own beats stop: the states are played here by hand)
                yield return Wait(0.6f);
                foreach (var s in CombatMotion.States.Where(s => s.Layer == CombatMotion.FullLayer))
                {
                    if (s.Only == (f.Female ? "m" : "f")) continue;
                    // the weapon the state is for (its idle is where it goes)
                    var arms = s.Name.StartsWith("pistol") ? Arms.Pistol : s.Name.StartsWith("melee") ? Arms.Melee : s.Name.StartsWith("club2") ? Arms.Club2
                        : s.Name.StartsWith("unarmed") ? Arms.Unarmed : Arms.Rifle;
                    if (f.Arms != arms) f.Equip(new CombatMotion.Held(arms == Arms.Pistol ? "pistol" : arms == Arms.Melee ? "machete" : arms == Arms.Club2 ? "bat" : arms == Arms.Rifle ? "rifle_auto" : null, 1, arms), inHand: true);
                    f.Crouched = false;
                    Assert.That(f.Play(s.Name, 0.05f, restart: true), Is.True, s.Name + " plays");
                    var length = f.Set.Length(s.Name, f.Female) / Mathf.Max(0.05f, Mathf.Abs(s.Speed) * f.Rate);
                    var next = CombatMotion.Next(s, arms, false);
                    if (s.Loop || s.Speed == 0f)
                    {
                        yield return Wait(Mathf.Min(2f, length * 1.2f));
                        if (!f.Is(s.Name)) wrong.Add($"{id}: {s.Name} (a hold) left for {f.Current}");
                        continue;
                    }
                    var limit = length * (s.Cut - s.From) + 1f;
                    var t = 0f;
                    while (t < limit && f.Is(s.Name)) { t += Time.deltaTime; yield return null; }
                    yield return Wait(0.3f);
                    if (f.Is(s.Name)) wrong.Add($"{id}: {s.Name} still playing {t:0.0} s on (its part {length * (s.Cut - s.From):0.0} s)");
                    else if (next == CombatMotion.None)
                    {
                        var info = f.Animator.GetCurrentAnimatorStateInfo(f.Animator.GetLayerIndex(CombatMotion.FullLayer));
                        if (!info.IsName(CombatMotion.None)) wrong.Add($"{id}: {s.Name} went on to {f.Current}, not none");
                    }
                    else if (f.Current != next && !(f.Is(next))) wrong.Add($"{id}: {s.Name} went on to {f.Current}, not {next}");
                }
                Object.Destroy(v.Body.gameObject);
                yield return null;
            }
            Assert.That(wrong, Is.Empty, string.Join("\n", wrong));
        }

        /// <summary>The importer's clip settings as the table says (Humanoid, looping as the sidecar says, root motion by the
        /// travel table) and the controller's fight layers built from it.</summary>
        [Test]
        public void TheFightsClipsAndLayersAreAsTheTableSays()
        {
#if UNITY_EDITOR
            var set = AssetDatabase.LoadAssetAtPath<CombatSet>("Assets/SecondFace/Combat/CombatSet.asset");
            if (set == null) { Assert.Ignore("the fight's motion is not built"); return; }
            var wrong = new List<string>();
            foreach (var c in CombatMotion.Clips)
            {
                var path = $"{CombatMotion.Folder}/{c.Name}.fbx";
                var imp = AssetImporter.GetAtPath(path) as ModelImporter;
                if (imp == null) { wrong.Add(c.Name + ": not imported"); continue; }
                if (imp.animationType != ModelImporterAnimationType.Human) wrong.Add(c.Name + ": not Humanoid");
                var side = Newtonsoft.Json.Linq.JObject.Parse(File.ReadAllText(Path.ChangeExtension(path, ".json")));
                var loop = side.Value<bool?>("loop") ?? false;
                foreach (var clip in imp.clipAnimations)
                {
                    if (clip.loopTime != loop) wrong.Add($"{c.Name}: loops {clip.loopTime}, its sidecar {loop}");
                    if (clip.lockRootPositionXZ != (c.XZ == RootXZ.Bake)) wrong.Add($"{c.Name}: XZ baked {clip.lockRootPositionXZ}, the table {c.XZ}");
                    if (!clip.lockRootHeightY) wrong.Add($"{c.Name}: its height is root motion");
                    if (clip.keepOriginalPositionY != (c.Y == RootY.Keep)) wrong.Add($"{c.Name}: Y as captured {clip.keepOriginalPositionY}, the table {c.Y}");
                    if (clip.lockRootRotation == (c.Turn || c.DropTurn)) wrong.Add($"{c.Name}: turn baked {clip.lockRootRotation}");
                }
            }
            Assert.That(wrong, Is.Empty, string.Join("\n", wrong));
            var ctl = set.Controller as UnityEditor.Animations.AnimatorController;
            Assert.That(ctl, Is.Not.Null);
            foreach (var layer in new[] { CombatMotion.FullLayer, CombatMotion.ArmsLayer })
            {
                var l = ctl.layers.FirstOrDefault(x => x.name == layer);
                Assert.That(l, Is.Not.Null, layer);
                Assert.That(l.defaultWeight, Is.EqualTo(0f), layer + " weighs nothing at rest");
                var names = new HashSet<string>(l.stateMachine.states.Select(x => x.state.name));
                foreach (var s in CombatMotion.States.Where(s => s.Layer == layer))
                    foreach (var female in new[] { false, true })
                        Assert.That(names, Does.Contain(s.AnimName(female)), $"{layer}: {s.AnimName(female)}");
                foreach (var cs in l.stateMachine.states)
                {
                    var s = CombatMotion.State(cs.state.name.EndsWith("_f") && CombatMotion.State(cs.state.name) == null ? cs.state.name.Substring(0, cs.state.name.Length - 2) : cs.state.name);
                    if (s == null || s.Then == null) continue;
                    Assert.That(cs.state.transitions.Length, Is.GreaterThan(0), $"{cs.state.name}: a one-shot with no way on");
                    Assert.That(cs.state.transitions.All(t => t.hasExitTime), Is.True, $"{cs.state.name}: goes on at its end");
                }
            }
#else
            Assert.Ignore("editor only");
#endif
        }

        /// <summary>A fight the game starts at Shale takes its people as animated views: the player's weapon drawn into the
        /// hand at the start, and a turn played by the allies' AI plays the fight's states.</summary>
        [UnityTest, Timeout(1200000)]
        public IEnumerator AFightInTheGameUsesTheAnimatedBodies()
        {
#if UNITY_EDITOR
            var assets = AssetDatabase.LoadAssetAtPath<WorldAssets>("Assets/SecondFace/World/WorldAssets.asset");
            if (assets == null || assets.Combat == null) { Assert.Ignore("the fight's motion is not built"); yield break; }
#endif
            var qol = new CombatQolTests();
            Walkabout walk = null;
            yield return CombatQolTests.BootAt(b => walk = b.Walkabout);
            Townsperson them = null;
            yield return qol.FightNearest(walk, x => them = x);
            var c = walk.Combat;
            var me = c.Battle.Units.First(u => u.C.IsPlayer);
            var view = c.ViewFor(me) as AnimatedUnitView;
            Assert.That(view, Is.Not.Null, "the player's body is the animated view");
            yield return Wait(1.5f);
            Assert.That(view.Fighter.InHand, Is.True, "the weapon drawn as the fight begins");
            Assert.That(view.Fighter.Current, Is.EqualTo(CombatMotion.Idle(view.Fighter.Arms)), "the weapon's ready stance");
            var theirs = c.ViewFor(c.Battle.Units.First(u => u.Hostile));
            Assert.That(theirs, Is.InstanceOf<AnimatedUnitView>(), "their body too");
            var seen = new HashSet<string>();
            yield return CombatQolTests.MyTurnOf(walk);
            IEnumerator Watch()
            {
                while (c.Active) { if (view.Fighter.Current != null) seen.Add(view.Fighter.Current); yield return null; }
            }
            var w = walk.StartCoroutine(Watch());
            yield return c.PlayerTurnByAi();
            yield return Wait(2f);
            walk.StopCoroutine(w);
            Assert.That(seen.Count, Is.GreaterThan(0), "the turn played the fight's states");
            yield return qol.CleanUp();
        }
    }
}
