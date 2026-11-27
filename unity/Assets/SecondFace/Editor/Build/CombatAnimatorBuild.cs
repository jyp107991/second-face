using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using SecondFace.Core.Combat;
using SecondFace.Game.Fighting;
using UnityEditor;
using UnityEditor.Animations;
using UnityEngine;
using UnityEngine.Animations;
using UnityEngine.Playables;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// The fight's motion and weapons, built by code (COMBAT.md A1–A8; nothing here is made by hand):
    /// <list type="bullet">
    /// <item>The fight's Animator layers on the people's own controller (People/Locomotion.controller: every person can be
    /// in a fight, and one controller keeps every crossfade smooth and every IK pass): "Combat" (the whole body, override,
    /// weight 0 until a fight raises it) and "CombatArms" (the weapon carried over the walk: arms and fingers only), every
    /// state from Core <see cref="CombatMotion.States"/>, one per clip (a women's take as "&lt;state&gt;_f"), each at its own
    /// speed times "CombatRate" (the fight's pace), and every one-shot going on by itself where the table says (the weapon's
    /// idle or its crouch by "CombatArms" and "CombatCrouch", or a named state) at its cut, so no state is left hanging. The
    /// layers carry "combat_v&lt;Version&gt;"; LocomotionBuild clears every layer when it builds the controller again, and
    /// the import of the rebuilt controller puts these back (CombatImportPostprocessor).</item>
    /// <item>The weapons: each staged model's materials (URP Lit from its BaseColor, Normal and Mask: R metallic, G occlusion,
    /// A smoothness; the bottle's glass transparent, premultiplied) in both lore paints, remapped onto the model by name.</item>
    /// <item>The set (Combat/CombatSet.asset): the controller, the weapons with their grip, muzzle, tip and butt points (the
    /// sidecars' <c>points_unity</c>) and the model's place in that frame fitted from its own nulls, each clip's length and beats (impact, release, fire, the magazine) as normalized
    /// times; given to WorldAssets.Combat so the game's fights use it.</item>
    /// </list>
    /// </summary>
    public static class CombatAnimatorBuild
    {
        public const string SetPath = "Assets/SecondFace/Combat/CombatSet.asset";
        public const string MaskPath = "Assets/SecondFace/Combat/CombatArms.mask";
        public const string WorldAssetsPath = "Assets/SecondFace/World/WorldAssets.asset";
        public static string VersionParam => $"combat_v{CombatMotion.Version}";

        [MenuItem("Second Face/Build the fight's motion and weapons")]
        public static void BuildMenu() => Build(true);

        /// <summary>For the command line (tools/unity/editor.sh run): built again whatever its version.</summary>
        public static void Rebuild() => Build(true);

        /// <summary>For the command line: the set's clip facts only (beats, plant records) from the sidecars; the controller
        /// is not touched (a forced rebuild of the layers is what lost the base layer's motion once, docs/COMBAT_ROOT_CAUSE.md 10).</summary>
        public static void RefreshFacts()
        {
            var set = AssetDatabase.LoadAssetAtPath<CombatSet>(SetPath);
            if (set == null) { Debug.LogError("CombatAnimatorBuild: no CombatSet to refresh"); return; }
            set.Clips = Facts();
            set.TurnStamp = Turns(set.Clips);
            set.SeatStamp = Seats(set);
            EditorUtility.SetDirty(set);
            AssetDatabase.SaveAssets();
            Debug.Log($"CombatAnimatorBuild: facts refreshed: {set.Clips.Length} clips, {set.Clips.Count(c => c.DownL.Length > 0 || c.DownR.Length > 0)} with a plant record, {set.Clips.Count(c => c.Turns.Length > 0)} with turns");
        }

        public static CombatSet Build(bool force)
        {
            var ctl = AssetDatabase.LoadAssetAtPath<AnimatorController>(LocomotionBuild.ControllerPath);
            if (ctl == null) ctl = LocomotionBuild.Build() as AnimatorController;
            if (ctl == null) { Debug.LogError("CombatAnimatorBuild: no locomotion controller"); return null; }
            AddLayers(ctl, force);
            var set = AssetDatabase.LoadAssetAtPath<CombatSet>(SetPath);
            var fresh = set == null;
            if (fresh) set = ScriptableObject.CreateInstance<CombatSet>();
            set.Version = CombatMotion.Version;
            set.Controller = ctl;
            set.Clips = Facts();
            set.TurnStamp = Turns(set.Clips);
            set.SeatStamp = Seats(set);
            set.Weapons = Weapons();
            if (fresh) AssetDatabase.CreateAsset(set, SetPath); else EditorUtility.SetDirty(set);
            var world = AssetDatabase.LoadAssetAtPath<SecondFace.Game.World.WorldAssets>(WorldAssetsPath);
            if (world != null && world.Combat != set) { world.Combat = set; EditorUtility.SetDirty(world); }
            AssetDatabase.SaveAssets();
            Debug.Log($"CombatAnimatorBuild: {CombatMotion.States.Length} states on {ctl.name}, {set.Clips.Length} clips, {set.Weapons.Length} weapons");
            return set;
        }

        /// <summary>The controller carries this version's fight layers.</summary>
        public static bool HasLayers(AnimatorController ctl) =>
            ctl != null && ctl.parameters.Any(p => p.name == VersionParam) && ctl.layers.Any(l => l.name == CombatMotion.FullLayer) && ctl.layers.Any(l => l.name == CombatMotion.ArmsLayer)
            && ctl.layers.Length > 0 && ctl.layers[0].stateMachine.states.Any(s => s.state.name == CombatMotion.StanceBase);

        /// <summary>The fight's clips are in (every state's clip imported): a fresh checkout imports them before the
        /// controller is rebuilt.</summary>
        public static bool ClipsImported() => CombatMotion.States.All(s => Clip(s.Clip) != null && Clip(s.ClipFor(true)) != null);

        public static AnimationClip Clip(string name)
        {
            var path = $"{CombatMotion.Folder}/{name}.fbx";
            return AssetDatabase.LoadAllAssetsAtPath(path).OfType<AnimationClip>().FirstOrDefault(c => !c.name.StartsWith("__preview"));
        }

        // ------------------------------------------------------------------------------------------- the layers

        public static void AddLayers(AnimatorController ctl, bool force)
        {
            if (!force && HasLayers(ctl)) return;
            // the old fight layers out, with everything they made in the asset
            for (var i = ctl.layers.Length - 1; i >= 0; i--)
            {
                var l = ctl.layers[i];
                if (l.name != CombatMotion.FullLayer && l.name != CombatMotion.ArmsLayer) continue;
                var sm = l.stateMachine;
                ctl.RemoveLayer(i);
                Purge(ctl, sm);
            }
            var keep = ctl.parameters.Where(p => !p.name.StartsWith("combat_v") && p.name != CombatMotion.ArmsParam && p.name != CombatMotion.CrouchParam && p.name != CombatMotion.RateParam).ToArray();
            ctl.parameters = keep;
            ctl.AddParameter(CombatMotion.ArmsParam, AnimatorControllerParameterType.Int);
            ctl.AddParameter(CombatMotion.CrouchParam, AnimatorControllerParameterType.Bool);
            ctl.AddParameter(new AnimatorControllerParameter { name = CombatMotion.RateParam, type = AnimatorControllerParameterType.Float, defaultFloat = 1f });
            ctl.AddParameter(VersionParam, AnimatorControllerParameterType.Bool);
            Layer(ctl, CombatMotion.FullLayer, null);
            Layer(ctl, CombatMotion.ArmsLayer, ArmsMask());
            StanceBase(ctl);
            EditorUtility.SetDirty(ctl);
            AssetDatabase.SaveAssets();
        }

        /// <summary>The base layer's state for the fight's stance (<see cref="CombatMotion.StanceBase"/>): the base's own
        /// locomotion (its default state's motion, speed and parameter) without Foot IK, which Unity applies by the base
        /// layer's state under the fight's layers too. Fighter moves the base into it while the stance has the body and back
        /// after, at the same phase.</summary>
        private static void StanceBase(AnimatorController ctl)
        {
            var sm = ctl.layers[0].stateMachine;
            var loco = sm.defaultState;
            if (loco == null || loco.motion == null) { Debug.LogError("CombatAnimatorBuild: the base layer has no default state with a motion for the fight's stance"); return; }
            // (updated in place, never removed: AnimatorStateMachine.RemoveState destroys the state's blend tree with it, and the
            // two states share the locomotion's tree: a second build left every person's locomotion with no motion, 2026-11-18)
            var st = sm.states.Select(s => s.state).FirstOrDefault(s => s.name == CombatMotion.StanceBase) ?? sm.AddState(CombatMotion.StanceBase);
            st.motion = loco.motion;
            st.speed = loco.speed;
            st.speedParameterActive = loco.speedParameterActive;
            st.speedParameter = loco.speedParameter;
            st.writeDefaultValues = loco.writeDefaultValues;
            st.iKOnFeet = false;
        }

        private static void Purge(AnimatorController ctl, AnimatorStateMachine sm)
        {
            if (sm == null) return;
            var path = AssetDatabase.GetAssetPath(ctl);
            var doomed = new List<Object> { sm };
            foreach (var cs in sm.states)
            {
                doomed.Add(cs.state);
                if (cs.state.motion is BlendTree bt) doomed.Add(bt);
                doomed.AddRange(cs.state.transitions);
            }
            doomed.AddRange(sm.anyStateTransitions);
            doomed.AddRange(sm.entryTransitions);
            foreach (var o in doomed)
            {
                if (o == null) continue;
                if (AssetDatabase.GetAssetPath(o) == path) AssetDatabase.RemoveObjectFromAsset(o);
                Object.DestroyImmediate(o, true);
            }
        }

        /// <summary>A fight layer: an empty "none" (the default; the layer weighs nothing at rest) and every state of the
        /// table on it, each going on where the table says.</summary>
        private static void Layer(AnimatorController ctl, string name, AvatarMask mask)
        {
            ctl.AddLayer(name);
            var layers = ctl.layers;
            var index = layers.Length - 1;
            layers[index].defaultWeight = 0f;
            layers[index].blendingMode = AnimatorLayerBlendingMode.Override;
            layers[index].avatarMask = mask;
            layers[index].iKPass = false;
            ctl.layers = layers;
            var sm = ctl.layers[index].stateMachine;
            var none = sm.AddState(CombatMotion.None);
            none.writeDefaultValues = false;
            sm.defaultState = none;
            var made = new Dictionary<string, AnimatorState>();
            foreach (var s in CombatMotion.States.Where(s => s.Layer == name))
                foreach (var female in new[] { false, true })
                {
                    var anim = s.AnimName(female);
                    if (made.ContainsKey(anim)) continue;
                    var clip = Clip(s.ClipFor(female));
                    if (clip == null) { Debug.LogWarning($"CombatAnimatorBuild: {s.Name}: no clip {s.ClipFor(female)} imported"); continue; }
                    var st = sm.AddState(anim);
                    st.motion = clip;
                    st.writeDefaultValues = false;
                    st.iKOnFeet = false;
                    st.speed = s.Speed;
                    st.speedParameterActive = true;
                    st.speedParameter = CombatMotion.RateParam;
                    st.tag = s.Gate ?? "";
                    made[anim] = st;
                }
            // where each one-shot goes when it ends (by the weapon held, and crouched or not)
            foreach (var s in CombatMotion.States.Where(s => s.Layer == name && s.Then != null))
                foreach (var female in new[] { false, true })
                {
                    if (!made.TryGetValue(s.AnimName(female), out var from)) continue;
                    if (from.transitions.Length > 0) continue;   // (one sex's state shared by both: done)
                    var exit = Mathf.Min(s.Cut, 0.97f);
                    if (s.Then == CombatMotion.None) { Exit(from, none, exit); continue; }
                    if (s.Then != CombatMotion.ToIdle && s.Then != CombatMotion.ToCover)
                    {
                        var to = CombatMotion.State(s.Then);
                        if (to != null && made.TryGetValue(to.AnimName(female), out var target)) Exit(from, target, exit);
                        continue;
                    }
                    foreach (Arms arms in System.Enum.GetValues(typeof(Arms)))
                        foreach (var crouched in s.Then == CombatMotion.ToCover ? new[] { true } : new[] { false, true })
                        {
                            var to = CombatMotion.State(CombatMotion.Next(s, arms, crouched));
                            if (to == null || !made.TryGetValue(to.AnimName(female), out var target)) continue;
                            var t = Exit(from, target, exit);
                            t.AddCondition(AnimatorConditionMode.Equals, (int)arms, CombatMotion.ArmsParam);
                            if (s.Then == CombatMotion.ToIdle) t.AddCondition(crouched ? AnimatorConditionMode.If : AnimatorConditionMode.IfNot, 0, CombatMotion.CrouchParam);
                        }
                }
        }

        private static AnimatorStateTransition Exit(AnimatorState from, AnimatorState to, float at)
        {
            var t = from.AddTransition(to);
            t.hasExitTime = true;
            t.exitTime = at;
            t.duration = 0.25f;
            t.hasFixedDuration = true;
            t.interruptionSource = TransitionInterruptionSource.None;
            return t;
        }

        /// <summary>The arms and the fingers (the weapon carried over the locomotion's walk; the legs, hips, trunk and head
        /// are the walk's).</summary>
        public static AvatarMask ArmsMask()
        {
            var mask = AssetDatabase.LoadAssetAtPath<AvatarMask>(MaskPath);
            var fresh = mask == null;
            if (fresh) mask = new AvatarMask();
            for (var p = 0; p < (int)AvatarMaskBodyPart.LastBodyPart; p++) mask.SetHumanoidBodyPartActive((AvatarMaskBodyPart)p, false);
            foreach (var p in new[] { AvatarMaskBodyPart.LeftArm, AvatarMaskBodyPart.RightArm, AvatarMaskBodyPart.LeftFingers, AvatarMaskBodyPart.RightFingers })
                mask.SetHumanoidBodyPartActive(p, true);
            if (fresh) AssetDatabase.CreateAsset(mask, MaskPath); else EditorUtility.SetDirty(mask);
            return mask;
        }

        // ------------------------------------------------------------------------------------------- the clips' facts

        public static CombatSet.ClipFacts[] Facts()
        {
            var l = new List<CombatSet.ClipFacts>();
            foreach (var c in CombatMotion.Clips)
            {
                var json = $"{CombatMotion.Folder}/{c.Name}.json";
                if (!File.Exists(json)) continue;
                var side = JObject.Parse(File.ReadAllText(json));
                var frames = side.Value<int?>("frames") ?? 2;
                var fps = side.Value<float?>("fps") ?? 30f;
                var clip = Clip(c.Name);
                var f = new CombatSet.ClipFacts { Name = c.Name, Length = clip != null ? clip.length : (frames - 1) / fps, Loop = side.Value<bool?>("loop") ?? false };
                var names = new List<string>(); var times = new List<float>();
                if (side["events"] is JObject ev)
                    foreach (var p in ev.Properties())
                        foreach (var fr in p.Value.Values<int>())
                        {
                            names.Add(p.Name);
                            times.Add(Mathf.Clamp01(fr / (float)Mathf.Max(1, frames - 1)));
                        }
                f.Events = names.ToArray(); f.Times = times.ToArray();
                // the clip's own record of which foot its actor has down (frames of the staged clip, normalized as the beats)
                if (side["plant_record"]?["stances"] is JObject st)
                {
                    float[] Spans(string foot) => st[foot] is JArray a
                        ? a.OfType<JArray>().Where(p => p.Count >= 2).SelectMany(p => new[] { Mathf.Clamp01((int)p[0] / (float)Mathf.Max(1, frames - 1)), Mathf.Clamp01((int)p[1] / (float)Mathf.Max(1, frames - 1)) }).ToArray()
                        : new float[0];
                    f.DownL = Spans("Left"); f.DownR = Spans("Right");
                }
                l.Add(f);
            }
            return l.ToArray();
        }

        // ------------------------------------------------------------------------------------------- the clips' turns

        /// <summary>The turns' bake (its version is in <see cref="TurnStamp"/>: a change here bakes again).</summary>
        public const int TurnBake = 3;
        public const string CatalogPath = "Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset";
        /// <summary>The keys kept: a key between two kept ones is left out where easing between them errs by less than this
        /// (degrees, m).</summary>
        public const float TurnTolDeg = 0.1f, TurnTolM = 0.001f;

        /// <summary>The game's people by body skeleton (<see cref="CombatSet.SkeletonKey"/>): each key, the first person's prefab
        /// (by id) and every person who shares it.</summary>
        public static SortedDictionary<string, (GameObject Prefab, List<string> Ids)> Skeletons()
        {
            var d = new SortedDictionary<string, (GameObject Prefab, List<string> Ids)>(System.StringComparer.Ordinal);
            var cat = AssetDatabase.LoadAssetAtPath<SecondFace.Game.People.RocketboxCatalog>(CatalogPath);
            if (cat == null) return d;
            foreach (var e in cat.People.Where(e => e != null && e.Prefab != null && !string.IsNullOrEmpty(e.Id)).OrderBy(e => e.Id, System.StringComparer.Ordinal))
            {
                var go = Object.Instantiate(e.Prefab);
                go.hideFlags = HideFlags.HideAndDontSave;
                try
                {
                    var a = go.GetComponentInChildren<Animator>();
                    if (a == null) continue;
                    a.Rebind();
                    var k = CombatSet.SkeletonKey(a);
                    if (k == null) continue;
                    if (!d.TryGetValue(k, out var v)) d[k] = v = (e.Prefab, new List<string>());
                    v.Ids.Add(e.Id);
                }
                finally { Object.DestroyImmediate(go); }
            }
            return d;
        }

        /// <summary>The clips the fight's whole-body layer plays (its states' takes for both sexes).</summary>
        public static List<string> WholeBodyClips() => CombatMotion.States.Where(s => s.Layer == CombatMotion.FullLayer)
            .SelectMany(s => new[] { s.ClipFor(false), s.ClipFor(true) }).Where(n => n != null).Distinct().OrderBy(n => n, System.StringComparer.Ordinal).ToList();

        /// <summary>The turns' inputs: the bake's version, every whole-body clip's file and import settings (the .fbx and its
        /// .meta, as committed: the same on every machine) and every skeleton's key.</summary>
        public static string TurnStamp(IEnumerable<string> clips, IEnumerable<string> skeletons)
        {
            ulong h = 14695981039346656037UL;
            void Add(byte b) { h ^= b; h *= 1099511628211UL; }
            void Text(string s) { foreach (var b in System.Text.Encoding.UTF8.GetBytes(s)) Add(b); }
            Text($"turns v{TurnBake};");
            foreach (var c in clips)
            {
                Text(c + ":");
                var fbx = $"{CombatMotion.Folder}/{c}.fbx";
                foreach (var file in new[] { fbx, fbx + ".meta" })
                    if (File.Exists(file)) foreach (var b in File.ReadAllBytes(file)) if (b != (byte)'\r') Add(b);
                Text(";");
            }
            foreach (var k in skeletons) Text(k + ";");
            return h.ToString("x16", System.Globalization.CultureInfo.InvariantCulture);
        }

        /// <summary>Bakes every whole-body clip's turn for every body skeleton of the game's people into the facts; returns the
        /// stamp of what it was baked from.</summary>
        public static string Turns(CombatSet.ClipFacts[] facts)
        {
            var skels = Skeletons();
            var clips = WholeBodyClips();
            var log = new System.Text.StringBuilder($"CombatAnimatorBuild: turns for {clips.Count} whole-body clips on {skels.Count} body skeletons:\n");
            foreach (var (k, v) in skels) log.AppendLine($"  skeleton {k}: {v.Ids.Count} people ({string.Join(", ", v.Ids)})");
            var want = new HashSet<string>(clips);
            int keys = 0, samples = 0; var worst = 0f; var worstShift = 0f; var worstThigh = 0f; var worstResidual = 0f; var worstAt = "";
            foreach (var f in facts)
            {
                if (f == null || !want.Contains(f.Name)) { if (f != null) f.Turns = new CombatSet.ClipTurn[0]; continue; }
                var l = new List<CombatSet.ClipTurn>();
                foreach (var (k, v) in skels)
                {
                    var tu = BakeTurn(f.Name, k, v.Prefab, out var n, out var maxDeg, out var maxShift, out var maxThigh, out var residual);
                    if (tu == null) { log.AppendLine($"  {f.Name}: no turn baked (no clip or humanoid avatar)"); continue; }
                    l.Add(tu); keys += tu.Keys; samples += n;
                    if (maxDeg > worst) { worst = maxDeg; worstAt = $"{f.Name} on {k}"; }
                    worstShift = Mathf.Max(worstShift, maxShift); worstThigh = Mathf.Max(worstThigh, maxThigh); worstResidual = Mathf.Max(worstResidual, residual);
                    log.AppendLine(string.Format(System.Globalization.CultureInfo.InvariantCulture, "  {0} on {1}: {2} samples, {3} keys, hips up to {4:0.0}°, thighs up to {5:0.0}°, shift up to {6:0.0} cm, shanks and feet left within {7:0.00}°", f.Name, k, n, tu.Keys, maxDeg, maxThigh, maxShift * 100f, residual));
                }
                f.Turns = l.ToArray();
            }
            var stamp = TurnStamp(clips, skels.Keys);
            log.AppendLine(string.Format(System.Globalization.CultureInfo.InvariantCulture, "  {0} keys of {1} samples ({2:0.0} KB as floats); the largest hips turn {3:0.0}° ({4}), thighs {5:0.0}°, shift {6:0.0} cm; shanks and feet left within {7:0.00}°; stamp {8}",
                keys, samples, keys * CombatSet.ClipTurn.Stride * 4 / 1024f, worst, worstAt, worstThigh, worstShift * 100f, worstResidual, stamp));
            Debug.Log(log.ToString());
            return stamp;
        }

        /// <summary>
        /// One clip's turn for one skeleton (<see cref="CombatSet.ClipTurn"/>): the clip played bare (no Foot IK, no runtime
        /// system) on its own actor (the clip file's avatar) and on the skeleton's body, at every frame of the clip. At each: the
        /// hips' rotation from each one's own muscle-zero pose (Unity's definition of the same human pose) and the turn that takes
        /// the body's onto the actor's; with it on the body, each thigh's turn that lays it along the actor's thigh and its
        /// knee-to-toes line in the actor's leg plane; the shift along the ground that puts the middle of the hip joints at the
        /// actor's scaled by the two human scales. Keys left out where easing between their neighbours errs by less than the
        /// tolerance. <paramref name="residual"/>: the largest angle left between the body's and the actor's shanks and feet.
        /// </summary>
        public static CombatSet.ClipTurn BakeTurn(string clipName, string skeleton, GameObject bodyPrefab, out int samples, out float maxDeg, out float maxShift) =>
            BakeTurn(clipName, skeleton, bodyPrefab, out samples, out maxDeg, out maxShift, out _, out _);

        public static CombatSet.ClipTurn BakeTurn(string clipName, string skeleton, GameObject bodyPrefab, out int samples, out float maxDeg, out float maxShift, out float maxThigh, out float residual) =>
            BakeTurnAt($"{CombatMotion.Folder}/{clipName}.fbx", Clip(clipName), skeleton, bodyPrefab, out samples, out maxDeg, out maxShift, out maxThigh, out residual);

        /// <summary><see cref="BakeTurn"/> for a clip in any model file (its own actor: that file's avatar).</summary>
        public static CombatSet.ClipTurn BakeTurnAt(string path, AnimationClip clip, string skeleton, GameObject bodyPrefab, out int samples, out float maxDeg, out float maxShift, out float maxThigh, out float residual)
        {
            samples = 0; maxDeg = 0f; maxShift = 0f; maxThigh = 0f; residual = 0f;
            var own = AssetDatabase.LoadAllAssetsAtPath(path).OfType<Avatar>().FirstOrDefault();
            var model = AssetDatabase.LoadAssetAtPath<GameObject>(path);
            if (clip == null || own == null || !own.isHuman || model == null || bodyPrefab == null) return null;
            var actor = Object.Instantiate(model); actor.hideFlags = HideFlags.HideAndDontSave;
            var body = Object.Instantiate(bodyPrefab); body.hideFlags = HideFlags.HideAndDontSave;
            PlayableGraph ga = default, gb = default;
            try
            {
                static Animator Bare(GameObject go, Avatar av)
                {
                    foreach (var mb in go.GetComponentsInChildren<MonoBehaviour>(true)) mb.enabled = false;
                    var a = go.GetComponentInChildren<Animator>();
                    if (a == null) a = go.AddComponent<Animator>();
                    if (av != null) a.avatar = av;
                    a.runtimeAnimatorController = null; a.applyRootMotion = false; a.cullingMode = AnimatorCullingMode.AlwaysAnimate; a.enabled = true;
                    go.transform.SetPositionAndRotation(Vector3.zero, Quaternion.identity);
                    a.Rebind();
                    return a;
                }
                var aa = Bare(actor, own); var ab = Bare(body, null);
                // (the bones each one's muscle-zero pose is read for: Unity's definition of the same human pose on two skeletons)
                var Z = new[] { HumanBodyBones.Hips, HumanBodyBones.LeftUpperLeg, HumanBodyBones.RightUpperLeg, HumanBodyBones.LeftLowerLeg, HumanBodyBones.RightLowerLeg, HumanBodyBones.LeftFoot, HumanBodyBones.RightFoot };
                Quaternion[] Zero(Animator a)
                {
                    var hp = new HumanPoseHandler(a.avatar, a.transform);
                    var pose = new HumanPose();
                    hp.GetHumanPose(ref pose);
                    for (var i = 0; i < pose.muscles.Length; i++) pose.muscles[i] = 0f;
                    pose.bodyRotation = Quaternion.identity;
                    hp.SetHumanPose(ref pose);
                    var q = Z.Select(b => Quaternion.Inverse(a.transform.rotation) * a.GetBoneTransform(b).rotation).ToArray();
                    hp.Dispose();
                    return q;
                }
                var za = Zero(aa); var zb = Zero(ab);
                static (PlayableGraph, AnimationClipPlayable) Graph(Animator a, AnimationClip c)
                {
                    var g = PlayableGraph.Create("turn bake"); g.SetTimeUpdateMode(DirectorUpdateMode.Manual);
                    var o = AnimationPlayableOutput.Create(g, "o", a);
                    var cp = AnimationClipPlayable.Create(g, c); cp.SetApplyFootIK(false); cp.SetSpeed(1f);
                    o.SetSourcePlayable(cp); g.Play();
                    return (g, cp);
                }
                var (g1, ca) = Graph(aa, clip); ga = g1;
                var (g2, cb) = Graph(ab, clip); gb = g2;
                var scale = ab.humanScale / Mathf.Max(1e-4f, aa.humanScale);
                var n = Mathf.Max(2, Mathf.RoundToInt(clip.length * clip.frameRate) + 1);
                var S = CombatSet.ClipTurn.Stride;
                var F = new float[n * S];
                var prev = new[] { Quaternion.identity, Quaternion.identity, Quaternion.identity };
                Transform B(Animator a, HumanBodyBones b) => a.GetBoneTransform(b);
                Vector3 At(Animator a, HumanBodyBones b) => a.transform.InverseTransformPoint(B(a, b).position);
                for (var i = 0; i < n; i++)
                {
                    var t = i / (float)(n - 1);
                    var time = Mathf.Min(t * clip.length, clip.length - 1e-4f);
                    ca.SetTime(time); ca.SetDone(false); ga.Evaluate(0f);
                    cb.SetTime(time); cb.SetDone(false); gb.Evaluate(0f);
                    var rootB = ab.transform.rotation;
                    // each bone's rotation from its own muscle-zero pose, in its root's frame
                    Quaternion Ra(int j) => Quaternion.Inverse(aa.transform.rotation) * B(aa, Z[j]).rotation * Quaternion.Inverse(za[j]);
                    Quaternion Rb(int j) => Quaternion.Inverse(rootB) * B(ab, Z[j]).rotation * Quaternion.Inverse(zb[j]);
                    // (the body as the runtime will turn it: the hips, then each thigh, each taking the actor's)
                    var turns = new Quaternion[3];
                    for (var j = 0; j < 3; j++)
                    {
                        var tq = Quaternion.Normalize(Ra(j) * Quaternion.Inverse(Rb(j)));
                        var bone = B(ab, Z[j]);
                        bone.rotation = rootB * tq * Quaternion.Inverse(rootB) * bone.rotation;
                        turns[j] = tq;
                        if (j > 0) maxThigh = Mathf.Max(maxThigh, Quaternion.Angle(Quaternion.identity, tq));
                    }
                    var d = turns[0];
                    for (var j = 3; j < Z.Length; j++) residual = Mathf.Max(residual, Quaternion.Angle(Ra(j), Rb(j)));
                    Vector3 Mid(Animator a) => (At(a, HumanBodyBones.LeftUpperLeg) + At(a, HumanBodyBones.RightUpperLeg)) * 0.5f;
                    var sh = scale * Mid(aa) - Mid(ab);
                    var o = i * S;
                    F[o] = t;
                    for (var j = 0; j < 3; j++)
                    {
                        var q = turns[j];
                        if (Quaternion.Dot(q, prev[j]) < 0f) q = new Quaternion(-q.x, -q.y, -q.z, -q.w);
                        prev[j] = q;
                        F[o + 1 + 4 * j] = q.x; F[o + 2 + 4 * j] = q.y; F[o + 3 + 4 * j] = q.z; F[o + 4 + 4 * j] = q.w;
                    }
                    F[o + 13] = sh.x; F[o + 14] = sh.z;
                    maxDeg = Mathf.Max(maxDeg, Quaternion.Angle(Quaternion.identity, d));
                    maxShift = Mathf.Max(maxShift, new Vector2(sh.x, sh.z).magnitude);
                }
                samples = n;
                Quaternion Qk(int i, int j) => new(F[i * S + 1 + 4 * j], F[i * S + 2 + 4 * j], F[i * S + 3 + 4 * j], F[i * S + 4 + 4 * j]);
                Vector2 Sk(int i) => new(F[i * S + 13], F[i * S + 14]);
                var keep = new SortedSet<int> { 0, n - 1 };
                void Split(int lo, int hi)
                {
                    if (hi - lo < 2) return;
                    int at = -1; var err = 1f;
                    for (var i = lo + 1; i < hi; i++)
                    {
                        var k = (F[i * S] - F[lo * S]) / (F[hi * S] - F[lo * S]);
                        var e = (Sk(i) - Vector2.Lerp(Sk(lo), Sk(hi), k)).magnitude / TurnTolM;
                        for (var j = 0; j < 3; j++) e = Mathf.Max(e, Quaternion.Angle(Qk(i, j), Quaternion.Slerp(Qk(lo, j), Qk(hi, j), k)) / TurnTolDeg);
                        if (e > err) { err = e; at = i; }
                    }
                    if (at < 0) return;
                    keep.Add(at); Split(lo, at); Split(at, hi);
                }
                Split(0, n - 1);
                var kept = new float[keep.Count * S];
                var w = 0;
                foreach (var i in keep) { System.Array.Copy(F, i * S, kept, w * S, S); w++; }
                return new CombatSet.ClipTurn { Skeleton = skeleton, Data = CombatSet.ClipTurn.Pack(kept), Keys = keep.Count };
            }
            finally
            {
                if (ga.IsValid()) ga.Destroy();
                if (gb.IsValid()) gb.Destroy();
                Object.DestroyImmediate(actor); Object.DestroyImmediate(body);
            }
        }

        // ------------------------------------------------------------------------------------------- the seats' turns

        /// <summary>The base layer's seated states (the people's controller's states tagged <see cref="LocomotionBuild.SitTag"/>),
        /// each with its clip and the clip's model file, by name.</summary>
        public static List<(string State, AnimationClip Clip, string Path)> SeatStates()
        {
            var l = new List<(string, AnimationClip, string)>();
            var ctl = AssetDatabase.LoadAssetAtPath<AnimatorController>(LocomotionBuild.ControllerPath);
            if (ctl == null || ctl.layers.Length == 0) return l;
            void Walk(AnimatorStateMachine m)
            {
                foreach (var c in m.states)
                    if (c.state.tag == LocomotionBuild.SitTag && c.state.motion is AnimationClip clip) l.Add((c.state.name, clip, AssetDatabase.GetAssetPath(clip)));
                foreach (var sm in m.stateMachines) Walk(sm.stateMachine);
            }
            Walk(ctl.layers[0].stateMachine);
            return l.OrderBy(x => x.Item1, System.StringComparer.Ordinal).ToList();
        }

        /// <summary>The seats' turns' inputs: the bake's version, each seated state's name, its clip's file and import settings
        /// (as committed) and every skeleton's key.</summary>
        public static string SeatStamp(IEnumerable<(string State, AnimationClip Clip, string Path)> seats, IEnumerable<string> skeletons)
        {
            ulong h = 14695981039346656037UL;
            void Add(byte b) { h ^= b; h *= 1099511628211UL; }
            void Text(string s) { foreach (var b in System.Text.Encoding.UTF8.GetBytes(s)) Add(b); }
            Text($"seats v{TurnBake};");
            foreach (var (state, _, path) in seats)
            {
                Text(state + "=" + path + ":");
                foreach (var file in new[] { path, path + ".meta" })
                    if (File.Exists(file)) foreach (var b in File.ReadAllBytes(file)) if (b != (byte)'\r') Add(b);
                Text(";");
            }
            foreach (var k in skeletons) Text(k + ";");
            return h.ToString("x16", System.Globalization.CultureInfo.InvariantCulture);
        }

        /// <summary>
        /// Bakes each seated state's turn for every body skeleton of the game's people into <see cref="CombatSet.Seats"/>, as the
        /// fight's (<see cref="BakeTurnAt"/>: the sit on its own actor and on the skeleton, bare); returns the stamp. The sits are
        /// retargeted as the fight's clips are, and at a sit's hip bend (about 90°) the Biped bodies' thighs stand rolled and
        /// their pelvis turned from the actor's (docs/MOTION_ROOT_CAUSE.md §16): the walker's feet off the floor on a chair.
        /// </summary>
        public static string Seats(CombatSet set)
        {
            var skels = Skeletons();
            var seats = SeatStates();
            var log = new System.Text.StringBuilder($"CombatAnimatorBuild: turns for {seats.Count} seated states on {skels.Count} body skeletons:\n");
            var l = new List<CombatSet.ClipFacts>();
            foreach (var (state, clip, path) in seats)
            {
                var f = new CombatSet.ClipFacts { Name = state, Length = clip.length, Loop = clip.isLooping };
                var turns = new List<CombatSet.ClipTurn>();
                foreach (var (k, v) in skels)
                {
                    var tu = BakeTurnAt(path, clip, k, v.Prefab, out var n, out var maxDeg, out var maxShift, out var maxThigh, out var residual);
                    if (tu == null) { log.AppendLine($"  {state}: no turn baked on {k} (no clip or humanoid avatar in {path})"); continue; }
                    turns.Add(tu);
                    log.AppendLine(string.Format(System.Globalization.CultureInfo.InvariantCulture, "  {0} ({1}) on {2}: {3} samples, {4} keys, hips up to {5:0.0}°, thighs up to {6:0.0}°, shift up to {7:0.0} cm, shanks and feet left within {8:0.00}°", state, path, k, n, tu.Keys, maxDeg, maxThigh, maxShift * 100f, residual));
                }
                f.Turns = turns.ToArray();
                l.Add(f);
            }
            set.Seats = l.ToArray();
            var stamp = SeatStamp(seats, skels.Keys);
            log.AppendLine($"  stamp {stamp}");
            Debug.Log(log.ToString());
            return stamp;
        }

        /// <summary>For the command line: the seats' turns baked again (nothing else in the set touched).</summary>
        public static void RefreshSeats()
        {
            var set = AssetDatabase.LoadAssetAtPath<CombatSet>(SetPath);
            if (set == null) { Debug.LogError("CombatAnimatorBuild: no CombatSet to refresh"); return; }
            set.SeatStamp = Seats(set);
            EditorUtility.SetDirty(set);
            AssetDatabase.SaveAssets();
        }

        // ------------------------------------------------------------------------------------------- the weapons

        public static CombatSet.Weapon[] Weapons()
        {
            var l = new List<CombatSet.Weapon>();
            foreach (var id in CombatMotion.Models)
            {
                var dir = $"{CombatMotion.WeaponFolder}/{id}";
                var jsonPath = $"{dir}/{id}.json";
                var fbx = $"{dir}/{id}.fbx";
                if (!File.Exists(jsonPath) || !File.Exists(fbx)) { Debug.LogWarning($"CombatAnimatorBuild: weapon {id} not staged"); continue; }
                var j = JObject.Parse(File.ReadAllText(jsonPath));
                var pts = (JObject)j["points_unity"];
                Vector3 V(JToken t) => t is JArray a ? new Vector3(a[0].Value<float>(), a[1].Value<float>(), a[2].Value<float>()) : Vector3.zero;
                // where the hands hold, if not on the nulls of those names (`hands`: a two-handed club held as real right-handed
                // people hold it, the dominant hand toward the head and the off hand at the butt, 2026-11-18): the weapon's frame
                // is the main hand's, so every point is taken from there
                var hands = (JObject)j["hands"];
                var main = hands?["main"] != null ? V(hands["main"]) : Vector3.zero;
                Vector3 P(string k) => (pts?[k] is JArray ? V(pts[k]) : Vector3.zero) - (pts?[k] is JArray ? main : Vector3.zero);
                var w = new CombatSet.Weapon
                {
                    Id = id, HasOff = pts?["grip_off"] != null, HasMuzzle = pts?["muzzle"] != null,
                    GripOff = hands?["off"] != null ? V(hands["off"]) - main : P("grip_off"), Muzzle = P("muzzle"), Tip = pts?["tip"] != null ? P("tip") : P("muzzle"),
                    HasButt = pts?["butt"] != null, Butt = P("butt"),
                    PointNames = pts != null ? pts.Properties().Select(x => x.Name).ToArray() : new string[0],
                };
                w.PointsAt = w.PointNames.Select(P).ToArray();
                var size = j["size_m"] is JArray sz ? sz[2].Value<float>() : 0.4f;
                w.Length = Mathf.Max(size, Mathf.Max(Mathf.Abs(w.Tip.z), Mathf.Abs(w.Muzzle.z)));
                // both paints, the first on the model by name
                var paint1 = new List<Material>(); var paint2 = new List<Material>();
                var imp = (ModelImporter)AssetImporter.GetAtPath(fbx);
                var v1 = (JObject)j["variants"]?["v1"]?["materials"] ?? (JObject)j["materials"];
                var v2 = (JObject)j["variants"]?["v2"]?["materials"];
                var changed = false;
                foreach (var m in v1.Properties())
                {
                    var spec1 = (JObject)m.Value;
                    var spec2 = v2?[m.Name] as JObject;
                    var mat1 = Material(dir, id, m.Name, "v1", spec1, spec1);
                    var mat2 = spec2 != null ? Material(dir, id, m.Name, "v2", spec2, spec1) : mat1;
                    paint1.Add(mat1); paint2.Add(mat2);
                    if (imp != null)
                        // the model's material by the sidecar's slot name, or as the staging tool names it in the FBX,
                        // "<weapon>_<slot>" (bat's "baseball_bat" is "bat_baseball_bat" in bat.fbx: remapped by the plain
                        // name alone, the model kept its imported material and the test of the paints failed, 2026-11-17)
                        foreach (var name in new[] { m.Name, $"{id}_{m.Name}" })
                        {
                            var key = new AssetImporter.SourceAssetIdentifier(typeof(Material), name);
                            imp.GetExternalObjectMap().TryGetValue(key, out var now);
                            if (now != mat1) { imp.AddRemap(key, mat1); changed = true; }
                        }
                }
                if (changed) imp.SaveAndReimport();
                w.Prefab = AssetDatabase.LoadAssetAtPath<GameObject>(fbx);
                w.Paint1 = paint1.ToArray(); w.Paint2 = paint2.ToArray();
                l.Add(w);
            }
            // each model laid in its weapon's frame by its own nulls (the FBX root carries the exporter's axis turn); a weapon
            // whose points lie on one line takes its twist from one whose points fix it (one exporter, one import)
            Quaternion? like = null;
            foreach (var w in l) { w.Fit(); if (w.FittedFull && like == null) like = w.ModelRot; }
            foreach (var w in l)
            {
                var fit = w.FittedFull ? w.Fit() : w.Fit(like);
                if (fit > 0.001f) Debug.LogWarning($"CombatAnimatorBuild: {w.Id}: its nulls fit the sidecar's points within {fit * 100f:0.0} cm only");
            }
            return l.ToArray();
        }

        /// <summary>A weapon's material in one paint (URP Lit; maps by the sidecar, missing ones from the first paint).</summary>
        private static Material Material(string dir, string id, string slot, string paint, JObject spec, JObject first)
        {
            var shader = Shader.Find("Universal Render Pipeline/Lit");
            if (shader == null) { Debug.LogError("URP Lit shader not found"); return null; }
            var path = $"{dir}/{id}_{Safe(slot)}_{paint}.mat";
            var m = AssetDatabase.LoadAssetAtPath<Material>(path);
            var fresh = m == null;
            if (fresh) m = new Material(shader);
            Texture2D Map(string k) { var f = (string)spec[k] ?? (string)first[k]; return f != null ? AssetDatabase.LoadAssetAtPath<Texture2D>($"{dir}/{f}") : null; }
            var baseMap = Map("BaseColor"); var nrm = Map("Normal"); var mask = Map("Mask");
            m.SetTexture("_BaseMap", baseMap);
            m.SetColor("_BaseColor", Color.white);
            if (nrm != null) { m.SetTexture("_BumpMap", nrm); m.SetFloat("_BumpScale", 1f); m.EnableKeyword("_NORMALMAP"); }
            if (mask != null)
            {
                // mask: R metallic, G occlusion, A smoothness (the staging's own; its G carries the mesh's baked occlusion)
                m.SetTexture("_MetallicGlossMap", mask);
                m.SetFloat("_Smoothness", 1f); m.SetFloat("_Metallic", 1f);
                m.EnableKeyword("_METALLICSPECGLOSSMAP");
                m.SetTexture("_OcclusionMap", mask);
                m.SetFloat("_OcclusionStrength", 1f);
                m.EnableKeyword("_OCCLUSIONMAP");
            }
            var glass = ((string)first["material"]) == "glass";
            if (glass)
            {
                // URP Lit, transparent, premultiplied (keeps the highlights on clear glass), alpha from the base map
                m.SetFloat("_Surface", 1f); m.SetFloat("_Blend", 1f);
                m.SetFloat("_SrcBlend", (float)UnityEngine.Rendering.BlendMode.One);
                m.SetFloat("_DstBlend", (float)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
                m.SetFloat("_SrcBlendAlpha", (float)UnityEngine.Rendering.BlendMode.One);
                m.SetFloat("_DstBlendAlpha", (float)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
                m.SetFloat("_ZWrite", 0f);
                m.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");
                m.EnableKeyword("_ALPHAPREMULTIPLY_ON");
                m.SetOverrideTag("RenderType", "Transparent");
                m.renderQueue = (int)UnityEngine.Rendering.RenderQueue.Transparent;
            }
            m.name = $"{id}_{slot}_{paint}";
            if (fresh) AssetDatabase.CreateAsset(m, path); else EditorUtility.SetDirty(m);
            return m;
        }

        private static string Safe(string s) => new string(s.Select(c => char.IsLetterOrDigit(c) ? c : '_').ToArray());
    }
}
