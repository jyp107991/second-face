using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using SecondFace.Core.Combat;
using SecondFace.Game.Fighting;
using UnityEditor;
using UnityEditor.Animations;
using UnityEngine;

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
            foreach (var old in sm.states.Where(s => s.state.name == CombatMotion.StanceBase).Select(s => s.state).ToArray()) sm.RemoveState(old);
            var loco = sm.defaultState;
            if (loco == null) { Debug.LogWarning("CombatAnimatorBuild: the base layer has no default state for the fight's stance"); return; }
            var st = sm.AddState(CombatMotion.StanceBase);
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
                l.Add(f);
            }
            return l.ToArray();
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
