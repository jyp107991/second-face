using System.IO;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Combat;
using SecondFace.EditorTools;
using SecondFace.Game.Fighting;
using UnityEditor;
using UnityEditor.Animations;
using UnityEngine;

namespace SecondFace.Tests
{
    /// <summary>
    /// The fight's build scripts (COMBAT.md A1–A8: Editor/Build/CombatAnimatorBuild.cs, CombatImportPostprocessor.cs), in the
    /// editor: the layers built onto a copy of the people's controller as Core's table says (every state with its clip,
    /// speed by "CombatRate", every one-shot going on at its cut by the weapon held and the stance, the arms layer masked to
    /// the arms), built again without leaving anything of the old behind; the importer's clip settings by the table; the
    /// clips' beats from their sidecars; each weapon's lore materials in both paints, remapped onto its model, its nulls
    /// where its sidecar says (the axis conversion right).
    /// </summary>
    public class CombatBuildTests
    {
        private const string Copy = "Assets/SecondFace/Combat/_test_locomotion.controller";

        [TearDown]
        public void Out()
        {
            if (AssetDatabase.LoadMainAssetAtPath(Copy) != null) AssetDatabase.DeleteAsset(Copy);
        }

        private static AnimatorController CopyOfThePeoplesController()
        {
            if (AssetDatabase.LoadAssetAtPath<AnimatorController>(LocomotionBuild.ControllerPath) == null) Assert.Ignore("no locomotion controller built");
            if (!CombatAnimatorBuild.ClipsImported()) Assert.Ignore("the fight's clips are not imported");
            Assert.That(AssetDatabase.CopyAsset(LocomotionBuild.ControllerPath, Copy), Is.True, "copied");
            return AssetDatabase.LoadAssetAtPath<AnimatorController>(Copy);
        }

        [Test]
        public void TheLayersAreBuiltFromTheTable()
        {
            var ctl = CopyOfThePeoplesController();
            var baseLayers = ctl.layers.Count(l => l.name != CombatMotion.FullLayer && l.name != CombatMotion.ArmsLayer);
            CombatAnimatorBuild.AddLayers(ctl, true);
            Assert.That(CombatAnimatorBuild.HasLayers(ctl), Is.True);
            Assert.That(ctl.layers.Length, Is.EqualTo(baseLayers + 2), "the people's own layers kept, the two fight layers added");
            foreach (var p in new[] { CombatMotion.ArmsParam, CombatMotion.CrouchParam, CombatMotion.RateParam, CombatAnimatorBuild.VersionParam })
                Assert.That(ctl.parameters.Count(x => x.name == p), Is.EqualTo(1), p);
            Assert.That(ctl.parameters.First(x => x.name == CombatMotion.RateParam).defaultFloat, Is.EqualTo(1f));
            foreach (var l in ctl.layers.Where(l => l.name == CombatMotion.FullLayer || l.name == CombatMotion.ArmsLayer))
            {
                Assert.That(l.defaultWeight, Is.EqualTo(0f), l.name + " weighs nothing at rest");
                Assert.That(l.stateMachine.defaultState.name, Is.EqualTo(CombatMotion.None));
                var states = l.stateMachine.states.ToDictionary(s => s.state.name, s => s.state);
                foreach (var s in CombatMotion.States.Where(s => s.Layer == l.name))
                    foreach (var female in new[] { false, true })
                    {
                        Assert.That(states.TryGetValue(s.AnimName(female), out var st), Is.True, $"{l.name}: {s.AnimName(female)}");
                        var clip = st.motion as AnimationClip;
                        Assert.That(clip, Is.Not.Null, st.name + "'s clip");
                        Assert.That(AssetDatabase.GetAssetPath(clip), Does.EndWith("/" + s.ClipFor(female) + ".fbx"), st.name);
                        Assert.That(st.speed, Is.EqualTo(s.Speed), st.name + "'s speed");
                        Assert.That(st.speedParameterActive && st.speedParameter == CombatMotion.RateParam, Is.True, st.name + " at the fight's pace");
                        Assert.That(st.writeDefaultValues, Is.False, st.name);
                        if (s.Then == null) { Assert.That(st.transitions, Is.Empty, st.name + " holds"); continue; }
                        Assert.That(st.transitions, Is.Not.Empty, st.name + " goes on");
                        foreach (var t in st.transitions)
                        {
                            Assert.That(t.hasExitTime, Is.True, st.name);
                            Assert.That(t.exitTime, Is.EqualTo(Mathf.Min(s.Cut, 0.97f)).Within(1e-4f), st.name + " goes on at its cut");
                        }
                        // every weapon (and, going to the idle, both stances) has its way on
                        if (s.Then == CombatMotion.ToIdle || s.Then == CombatMotion.ToCover)
                            foreach (Arms arms in System.Enum.GetValues(typeof(Arms)))
                                Assert.That(st.transitions.Any(t => t.conditions.Any(c => c.parameter == CombatMotion.ArmsParam && (int)c.threshold == (int)arms)), Is.True, $"{st.name} → {arms}");
                    }
            }
            var mask = ctl.layers.First(l => l.name == CombatMotion.ArmsLayer).avatarMask;
            Assert.That(mask, Is.Not.Null);
            Assert.That(mask.GetHumanoidBodyPartActive(AvatarMaskBodyPart.LeftArm) && mask.GetHumanoidBodyPartActive(AvatarMaskBodyPart.RightArm), Is.True, "arms");
            Assert.That(mask.GetHumanoidBodyPartActive(AvatarMaskBodyPart.LeftLeg) || mask.GetHumanoidBodyPartActive(AvatarMaskBodyPart.Body) || mask.GetHumanoidBodyPartActive(AvatarMaskBodyPart.Root), Is.False, "the legs and trunk are the walk's");
        }

        [Test]
        public void BuildingAgainLeavesNothingOfTheOldBehind()
        {
            var ctl = CopyOfThePeoplesController();
            CombatAnimatorBuild.AddLayers(ctl, true);
            var objects = AssetDatabase.LoadAllAssetsAtPath(Copy).Length;
            var layers = ctl.layers.Length; var parameters = ctl.parameters.Length;
            CombatAnimatorBuild.AddLayers(ctl, true);
            Assert.That(ctl.layers.Length, Is.EqualTo(layers));
            Assert.That(ctl.parameters.Length, Is.EqualTo(parameters));
            Assert.That(AssetDatabase.LoadAllAssetsAtPath(Copy).Length, Is.EqualTo(objects), "every state, transition and machine of the old layers removed");
            // and a build that finds this version's layers leaves them alone
            var machine = ctl.layers.First(l => l.name == CombatMotion.FullLayer).stateMachine;
            CombatAnimatorBuild.AddLayers(ctl, false);
            Assert.That(ctl.layers.First(l => l.name == CombatMotion.FullLayer).stateMachine, Is.SameAs(machine));
        }

        [Test]
        public void ClipSettingsFollowTheTable()
        {
            foreach (var c in CombatMotion.Clips.Concat(CombatMotion.Spare))
                foreach (var loop in new[] { false, true })
                foreach (var seated in new[] { false, true })
                foreach (var take in new[] { false, true })
                {
                    var a = new ModelImporterClipAnimation();
                    CombatImportPostprocessor.Settings(a, loop, c, seated, take);
                    Assert.That(a.loopTime, Is.EqualTo(loop), c.Name);
                    Assert.That(a.lockRootPositionXZ, Is.EqualTo(c.XZ == RootXZ.Bake), c.Name + ": XZ");
                    Assert.That(a.lockRootHeightY, Is.True, c.Name + ": never height as root motion");
                    // the take's own height over its floor (its T-pose stood on it), but a seated take's table Feet (2026-11-18)
                    var feet = seated && c.Y == RootY.Feet;
                    Assert.That(a.keepOriginalPositionY, Is.EqualTo(!feet), c.Name + ": Y as captured");
                    Assert.That(a.heightFromFeet, Is.EqualTo(feet), c.Name + ": Y from the feet");
                    Assert.That(a.lockRootRotation, Is.EqualTo(!(c.Turn || c.DropTurn)), c.Name + ": the turn");
                    // (a clip written in its take's frame is stood where the take stood it, based upon Original, its root still
                    // baked; any other from the body's facing and centre of mass, never the file's axes: v4.1 README §1)
                    Assert.That(a.keepOriginalOrientation, Is.EqualTo(take), c.Name + ": the facing's basis");
                    Assert.That(a.keepOriginalPositionXZ, Is.EqualTo(take), c.Name + ": the place's basis");
                }
        }

        /// <summary>A clip in its take's frame that travels (combat set v4.5: the break from the crouched hold into a run,
        /// cover_leave_m/f_built, set on the hold's feet) keeps its travel as root motion, Position XZ unbaked and based upon
        /// Original, so it leaves from where the hold stands; one in place has its place baked on the same basis; a clip on its
        /// own first key keeps Unity's default basis.</summary>
        [Test]
        public void ATakeFrameClipThatTravelsRunsOutOfItsTakesFrame()
        {
            ModelImporterClipAnimation Of(MotionClip m, bool take)
            {
                var c = new ModelImporterClipAnimation();
                CombatImportPostprocessor.Settings(c, false, m, seated: false, takeBasis: take);
                return c;
            }
            foreach (var name in new[] { "cover_leave_m_built", "cover_leave_f_built" })
            {
                var run = Of(new MotionClip { Name = name, XZ = RootXZ.Apply, Y = RootY.Keep }, true);
                Assert.That(run.lockRootPositionXZ, Is.False, name + ": its travel applied");
                Assert.That(run.keepOriginalPositionXZ, Is.True, name + ": from the take's frame");
                Assert.That(run.lockRootRotation && run.keepOriginalOrientation, Is.True, name + ": its turn baked on the take's frame");
            }
            var hold = Of(new MotionClip { Name = "crouch_hold_built", Y = RootY.Keep }, true);
            Assert.That(hold.lockRootPositionXZ && hold.keepOriginalPositionXZ && hold.keepOriginalOrientation, Is.True, "a hold in place on the take's frame");
            var own = Of(new MotionClip { Name = "throw_full_m_cmu", XZ = RootXZ.Apply }, false);
            Assert.That(own.keepOriginalPositionXZ || own.keepOriginalOrientation, Is.False, "a first-key clip on Unity's default basis");
        }

        /// <summary>Every clip whose sidecar says it is written in its take's frame ("root_basis": "take", combat set v4.1) is
        /// imported on that basis, its rotation and place still baked into the pose: based upon the body orientation and the
        /// centre of mass, Unity stands each clip at its own first key and a chain cut from one take parts at its joins (CMU
        /// 79_96's raise into its own aim 17.9 / 10.9 cm and 42°).</summary>
        [Test]
        public void EveryTakeFrameClipIsImportedOnItsTakesBasis()
        {
            var wrong = new System.Collections.Generic.List<string>();
            var n = 0;
            foreach (var json in Directory.GetFiles(CombatMotion.Folder, "*.json"))
            {
                var side = Newtonsoft.Json.Linq.JObject.Parse(File.ReadAllText(json));
                if (side.Value<string>("root_basis") != "take") continue;
                var name = Path.GetFileNameWithoutExtension(json);
                var fbx = $"{CombatMotion.Folder}/{name}.fbx";
                var imp = AssetImporter.GetAtPath(fbx) as ModelImporter;
                if (imp == null) { wrong.Add(name + ": not imported"); continue; }
                n++;
                foreach (var c in imp.clipAnimations)
                    if (!c.keepOriginalOrientation || !c.keepOriginalPositionXZ || !c.lockRootRotation && !(CombatMotion.Clip(name)?.Turn ?? false) || !c.lockRootPositionXZ && CombatMotion.Clip(name)?.XZ != RootXZ.Apply)
                        wrong.Add($"{name}: orientation {(c.keepOriginalOrientation ? "Original" : "body")}, XZ {(c.keepOriginalPositionXZ ? "Original" : "centre of mass")}, baked {c.lockRootRotation}/{c.lockRootPositionXZ}");
                var clip = AssetDatabase.LoadAllAssetsAtPath(fbx).OfType<AnimationClip>().FirstOrDefault(x => !x.name.StartsWith("__preview"));
                if (clip == null) { wrong.Add(name + ": no clip"); continue; }
                var s = AnimationUtility.GetAnimationClipSettings(clip);
                if (!s.keepOriginalOrientation || !s.keepOriginalPositionXZ) wrong.Add($"{name}: the imported clip's basis {s.keepOriginalOrientation}/{s.keepOriginalPositionXZ}");
            }
            Assert.That(n, Is.GreaterThan(0), "no clip in its take's frame (combat set v4.1 not imported)");
            Assert.That(wrong, Is.Empty, string.Join("\n", wrong));
        }

        [Test]
        public void TheBeatsComeFromTheSidecars()
        {
            var facts = CombatAnimatorBuild.Facts();
            Assert.That(facts.Select(f => f.Name), Is.EquivalentTo(CombatMotion.Clips.Where(c => File.Exists($"{CombatMotion.Folder}/{c.Name}.json")).Select(c => c.Name)));
            // (a beat at its sidecar's frame over the clip's length: the jab's impact; the men's jab the table plays, CMU's since
            // combat set v4, the ACCAD take a spare)
            var jabName = CombatMotion.State(CombatMotion.Strike(Arms.Unarmed, false, 0)).ClipFor(false);
            var jab = facts.First(f => f.Name == jabName);
            var jabSide = Newtonsoft.Json.Linq.JObject.Parse(File.ReadAllText($"{CombatMotion.Folder}/{jabName}.json"));
            Assert.That(jab.Times.Zip(jab.Events, (t, e) => (t, e)).First(x => x.e == "impact").t,
                Is.EqualTo((float)jabSide["events"]["impact"][0] / ((int)jabSide["frames"] - 1)).Within(0.02f));
            foreach (var f in facts)
            {
                Assert.That(f.Length, Is.GreaterThan(0.1f), f.Name);
                // (on the clip, its first key to its last: v4's hits start at their impact, its side steps at their lift, a dodge is
                // clear on its last key; CombatSet.Beat reads -1 for none)
                Assert.That(f.Times.All(t => t >= 0f && t <= 1f), Is.True, f.Name + "'s beats on it");
            }
            foreach (var s in CombatMotion.States.Where(s => (s.Gate == "strike" || s.Gate == "strike2") && !s.Name.Contains("block")))
                Assert.That(facts.First(f => f.Name == s.Clip).Events, Does.Contain("impact"), s.Name);
        }

        [Test]
        public void EachWeaponIsBuiltWithItsPaintsAndItsGripsWhereTheSidecarSaysThem()
        {
            var weapons = CombatAnimatorBuild.Weapons();
            Assert.That(weapons.Select(w => w.Id), Is.EquivalentTo(CombatMotion.Models));
            // the nulls where the sidecar's points are, in the frame the game holds the weapon in (CombatSet.Weapon.Spawn: the
            // holder's +Z the barrel, +Y the top, origin the main grip): every weapon checked, every miss listed
            var wrong = new System.Collections.Generic.List<string>();
            foreach (var w in weapons)
            {
                var held = w.Spawn("_test_" + w.Id);
                try
                {
                    Transform Null(string n) => held.GetComponentsInChildren<Transform>(true).FirstOrDefault(t => t.name == n);
                    // (the main hand at the origin: the null of that name there, or where the sidecar's `hands` put the hand
                    // instead, the bat held as real right-handed people hold it, 2026-11-18)
                    var main = Null("grip_main");
                    var mainAt = w.Points().First(x => x.Name == "grip_main").At;
                    if (main != null && (held.transform.InverseTransformPoint(main.position) - mainAt).magnitude > 0.001f)
                        wrong.Add($"{w.Id}: grip_main {(held.transform.InverseTransformPoint(main.position) - mainAt).magnitude * 100f:0.0} cm from where the sidecar says, in the hand's frame");
                    Assert.That(w.PointNames, Is.Not.Empty, w.Id + ": its sidecar's points carried into the set");
                    foreach (var (n, p) in w.Points())
                    {
                        if (n == "grip_main") continue;
                        var t = Null(n);
                        if (t == null) { wrong.Add($"{w.Id}: no {n} null"); continue; }
                        var d = (held.transform.InverseTransformPoint(t.position) - p).magnitude;
                        if (d > 0.001f) wrong.Add($"{w.Id}: {n} {d * 100f:0.0} cm from where the sidecar says");
                    }
                    // the mesh along the frame: its far end at the sidecar's length along +Z, not across it
                    var r = held.GetComponentsInChildren<Renderer>(true);
                    if (r.Length > 0)
                    {
                        var b = r[0].bounds; foreach (var x in r) b.Encapsulate(x.bounds);
                        var size = held.transform.InverseTransformVector(b.size);
                        if (Mathf.Abs(size.z) < Mathf.Max(Mathf.Abs(size.x), Mathf.Abs(size.y))) wrong.Add($"{w.Id}: the model lies across its frame ({size})");
                    }
                }
                finally { Object.DestroyImmediate(held); }
            }
            Assert.That(wrong, Is.Empty, string.Join("\n", wrong));
            foreach (var w in weapons)
            {
                Assert.That(w.Prefab, Is.Not.Null, w.Id);
                Assert.That(w.Paint1.Length, Is.GreaterThan(0), w.Id);
                Assert.That(w.Paint2.Length, Is.EqualTo(w.Paint1.Length), w.Id);
                Assert.That(w.Paint1.All(m => m != null && m.shader.name == "Universal Render Pipeline/Lit"), Is.True, w.Id + ": URP Lit");
                Assert.That(w.Paint1.Zip(w.Paint2, (a, b) => a != b).Any(x => x), Is.True, w.Id + ": a second paint");
                var renderers = w.Prefab.GetComponentsInChildren<Renderer>(true);
                Assert.That(renderers.SelectMany(r => r.sharedMaterials).Any(m => w.Paint1.Contains(m)), Is.True, w.Id + ": its lore materials on the model");
                Assert.That(w.Fitted, Is.True, w.Id + ": its model fitted to its frame");
                Assert.That(w.Length, Is.GreaterThan(0.1f), w.Id);
                // a long gun's butt for the low ready's shoulder (CombatMotion.LongGunReady)
                if (CombatMotion.LongGun(w.Id))
                    Assert.That(w.HasButt, Is.True, w.Id + ": a long gun's butt");
            }
        }

        [Test]
        public void TheSetIsTheGamesAndCarriesTheController()
        {
            var set = AssetDatabase.LoadAssetAtPath<CombatSet>(CombatAnimatorBuild.SetPath);
            if (set == null) Assert.Ignore("not built (Second Face/Build the fight's motion and weapons)");
            Assert.That(set.Version, Is.EqualTo(CombatMotion.Version));
            Assert.That(AssetDatabase.GetAssetPath(set.Controller), Is.EqualTo(LocomotionBuild.ControllerPath), "the people's own controller");
            Assert.That(CombatAnimatorBuild.HasLayers((AnimatorController)set.Controller), Is.True);
            var world = AssetDatabase.LoadAssetAtPath<SecondFace.Game.World.WorldAssets>(CombatAnimatorBuild.WorldAssetsPath);
            if (world != null) Assert.That(world.Combat, Is.SameAs(set), "the game's fights use it");
            Assert.That(set.WeaponOf("rifle_auto"), Is.Not.Null);
            Assert.That(set.Beat("unarmed_jab", false, "impact"), Is.GreaterThan(0f).And.LessThan(1f));
        }

        /// <summary>The whole-body clips' turns onto their actors (CombatSet.ClipTurn, docs/COMBAT_ROOT_CAUSE.md 19) were baked
        /// from the clips and skeletons there are now (a clip or a body changed and the set not baked again fails here), every
        /// whole-body clip has one for every body skeleton of the game's people, and baking two of them again gives the same.</summary>
        [Test]
        public void TheClipTurnsAreBakedFromTheClipsAndSkeletonsThereAre()
        {
            var set = AssetDatabase.LoadAssetAtPath<CombatSet>(CombatAnimatorBuild.SetPath);
            if (set == null) Assert.Ignore("not built (Second Face/Build the fight's motion and weapons)");
            var skels = CombatAnimatorBuild.Skeletons();
            Assert.That(skels.Count, Is.GreaterThan(0), "the people's skeletons");
            var clips = CombatAnimatorBuild.WholeBodyClips();
            Assert.That(set.TurnStamp, Is.EqualTo(CombatAnimatorBuild.TurnStamp(clips, skels.Keys)),
                "the turns were baked from other clips or skeletons: bake them again (CombatAnimatorBuild.RefreshFacts)");
            var wrong = new System.Collections.Generic.List<string>();
            foreach (var c in clips)
            {
                var f = set.ClipOf(c);
                if (f == null) { wrong.Add($"{c}: no facts"); continue; }
                foreach (var k in skels.Keys)
                {
                    var tu = f.Turns.FirstOrDefault(x => x.Skeleton == k);
                    var fl = tu?.Floats();
                    if (tu == null || tu.Keys < 2 || fl.Length != tu.Keys * CombatSet.ClipTurn.Stride) { wrong.Add($"{c}: no turn for skeleton {k}"); continue; }
                    var times = Enumerable.Range(0, tu.Keys).Select(i => fl[i * CombatSet.ClipTurn.Stride]).ToArray();
                    if (times[0] != 0f || times[^1] != 1f || times.Zip(times.Skip(1), (a, b) => b > a).Any(x => !x)) wrong.Add($"{c} on {k}: its keys' times");
                }
            }
            foreach (var c in new[] { "fist_guard_accad", "club_overhead_cmu" }.Where(clips.Contains))
                foreach (var (k, v) in skels)
                {
                    var again = CombatAnimatorBuild.BakeTurn(c, k, v.Prefab, out _, out _, out _).Floats();
                    var was = set.ClipOf(c).Turns.First(x => x.Skeleton == k).Floats();
                    if (again.Length != was.Length) { wrong.Add($"{c} on {k}: baked again {again.Length} floats, stored {was.Length}"); continue; }
                    var off = again.Zip(was, (a, b) => Mathf.Abs(a - b)).Max();
                    if (off > 1e-4f) wrong.Add($"{c} on {k}: baked again differs by up to {off}");
                }
            Assert.That(wrong, Is.Empty, string.Join("\n", wrong));
        }

        /// <summary>The sits' turns (CombatSet.Seats, SeatTurn) are baked from the base layer's seated states (the people's
        /// controller's states tagged "sit") on every body skeleton there is, from the clips as committed: the stamp matches,
        /// each sit has a turn for each skeleton with ordered keys over the whole clip, and one baked again equals the stored.</summary>
        [Test]
        public void TheSeatsTurnsAreBakedFromTheSitsAndSkeletonsThereAre()
        {
            var set = AssetDatabase.LoadAssetAtPath<CombatSet>(CombatAnimatorBuild.SetPath);
            if (set == null) Assert.Ignore("not built (Second Face/Build the fight's motion and weapons)");
            var skels = CombatAnimatorBuild.Skeletons();
            var seats = CombatAnimatorBuild.SeatStates();
            Assert.That(seats.Count, Is.EqualTo(3), "the base layer's sits, tagged: " + string.Join(", ", seats.Select(s => s.State)));
            Assert.That(set.SeatStamp, Is.EqualTo(CombatAnimatorBuild.SeatStamp(seats, skels.Keys)),
                "the seats' turns were baked from other sits or skeletons: bake them again (CombatAnimatorBuild.RefreshSeats)");
            var wrong = new System.Collections.Generic.List<string>();
            foreach (var (state, clip, path) in seats)
            {
                var f = set.Seats.FirstOrDefault(x => x.Name == state);
                if (f == null) { wrong.Add($"{state}: no turns"); continue; }
                foreach (var (k, v) in skels)
                {
                    var tu = f.Turns.FirstOrDefault(x => x.Skeleton == k);
                    var fl = tu?.Floats();
                    if (tu == null || tu.Keys < 2 || fl.Length != tu.Keys * CombatSet.ClipTurn.Stride) { wrong.Add($"{state}: no turn for skeleton {k}"); continue; }
                    var times = Enumerable.Range(0, tu.Keys).Select(i => fl[i * CombatSet.ClipTurn.Stride]).ToArray();
                    if (times[0] != 0f || times[^1] != 1f || times.Zip(times.Skip(1), (a, b) => b > a).Any(x => !x)) wrong.Add($"{state} on {k}: its keys' times");
                    var again = CombatAnimatorBuild.BakeTurnAt(path, clip, k, v.Prefab, out _, out _, out _, out _, out _).Floats();
                    if (again.Length != fl.Length) { wrong.Add($"{state} on {k}: baked again {again.Length} floats, stored {fl.Length}"); continue; }
                    var off = again.Zip(fl, (a, b) => Mathf.Abs(a - b)).Max();
                    if (off > 1e-4f) wrong.Add($"{state} on {k}: baked again differs by up to {off}");
                }
            }
            Assert.That(wrong, Is.Empty, string.Join("\n", wrong));
        }
    }
}
