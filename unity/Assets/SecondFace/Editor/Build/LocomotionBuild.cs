using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Animations;
using UnityEngine;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// The locomotion controller people share (step 25, P4 step 4). Base layer: by sex ("Sex") and the person's gait set
    /// ("Gait", Pace.MenSets / WomenSets), a 1D blend on "Speed" (m/s) over the captured clips at their own speeds
    /// (Motion/&lt;clip&gt;.json), so the feet keep pace; the idle is itself a blend on "Idle" over the sex's captured idles
    /// (each person stands their own way);
    /// the base layer runs the IK pass (<see cref="SecondFace.Game.People.FootPlant"/>). "Gesture" layer: an upper-body
    /// mask (People/UpperBody.mask) over states played by name (talk, talk_b, argue, drink, wave, stretch, yawn, yawn_b),
    /// each going back to the empty "none" at its end; the layer weighs 0 at rest (<see cref="SecondFace.Game.People.Ambient"/>
    /// raises it while a gesture plays). Whole-body states on the base layer, played by name (P6.1): "pickup" (the
    /// captured stoop, from <see cref="PickupFrom"/> s in, at <see cref="PickupSpeed"/>, back to the locomotion as the
    /// body straightens) and the sits, "sit", "sit_stool", "sit_ground", which hold until the walker stands (played
    /// back to "Locomotion" by name). "sneak" (P6.3): the captured crouched walk while the Bool "Sneak" is on, played at
    /// "SneakRate" (the walker's speed over the clip's own, so standing still holds the crouch), to and from the
    /// locomotion by that Bool. Committed at <see cref="ControllerPath"/>; built when missing or
    /// older than <see cref="Version"/>, in place (its GUID stays: the world assets refer to it).
    /// </summary>
    public static class LocomotionBuild
    {
        public const string ControllerPath = "Assets/SecondFace/People/Locomotion.controller";
        public const string MaskPath = "Assets/SecondFace/People/UpperBody.mask";
        /// <summary>Bump when the layout changes; the controller carries it as the parameter "v&lt;Version&gt;".</summary>
        public const int Version = 11;
        /// <summary>The pickup clip (CMU 26_09, 6 s) stands still for its first 0.9 s, is lowest at 2.3 s and upright
        /// again by 3.7 s: it is played from 0.7 s in, 1.4 times as fast, and leaves for the locomotion at 62 %.</summary>
        public const float PickupFrom = 0.7f, PickupSpeed = 1.4f, PickupExit = 0.62f;
        public static readonly string[] Sits = { "sit", "sit_stool", "sit_ground" };
        /// <summary>The sits' tag: what the game knows a seated state by (ArmClearance leaves a seated person's arms unrested,
        /// SeatTurn turns the body back onto the sit's actor, CombatAnimatorBuild.Seats bakes that turn for each). Until
        /// 2026-11-27 the sits were built untagged, and ArmClearance's test for it never held (since b2a82298).</summary>
        public const string SitTag = "sit";
        public const string GestureLayer = "Gesture";
        /// <summary>The idles by sex (Ambient.MenIdles, WomenIdles: motion set v2, 2026-11-17).</summary>
        public static string[] Idles => SecondFace.Game.People.Ambient.MenIdles;
        public static string[] IdlesF => SecondFace.Game.People.Ambient.WomenIdles;
        public static readonly string[] Gestures = { "talk", "talk_b", "argue", "drink", "wave", "stretch", "yawn", "yawn_b" };

        [MenuItem("Second Face/Build locomotion controller")]
        public static RuntimeAnimatorController Build() => Build(false);
        /// <summary>For the command line (tools/unity/editor.sh run): built again whatever its version.</summary>
        public static void Rebuild() => Build(true);

        public static RuntimeAnimatorController Build(bool force)
        {
            var ctl = AssetDatabase.LoadAssetAtPath<AnimatorController>(ControllerPath);
            if (ctl != null && !force && ctl.parameters.Any(p => p.name == $"v{Version}")) return ctl;
            if (ctl == null) ctl = AnimatorController.CreateAnimatorControllerAtPath(ControllerPath);
            else
            {
                // in place: the layers and parameters cleared, then every sub-asset (states, trees, machines) out
                ctl.layers = new AnimatorControllerLayer[0];
                ctl.parameters = new AnimatorControllerParameter[0];
                foreach (var o in AssetDatabase.LoadAllAssetsAtPath(ControllerPath))
                    if (o != ctl && o != null) { AssetDatabase.RemoveObjectFromAsset(o); Object.DestroyImmediate(o, true); }
                ctl.AddLayer("Base Layer");
            }
            ctl.AddParameter("Speed", AnimatorControllerParameterType.Float);
            // 0 a man, 1 a woman: each plays their own sex's captures (Pace.SetSex)
            ctl.AddParameter("Sex", AnimatorControllerParameterType.Float);
            // the person's own gait set among their sex's (Pace.SetSex: by a hash of who they are)
            ctl.AddParameter("Gait", AnimatorControllerParameterType.Float);
            ctl.AddParameter("Idle", AnimatorControllerParameterType.Float);
            ctl.AddParameter("Sneak", AnimatorControllerParameterType.Bool);
            ctl.AddParameter(new AnimatorControllerParameter { name = "SneakRate", type = AnimatorControllerParameterType.Float, defaultFloat = 1f });
            // the cadence the one clip playing is sped up or slowed to (Pace: one captured stride at a time)
            ctl.AddParameter(new AnimatorControllerParameter { name = "LocoRate", type = AnimatorControllerParameterType.Float, defaultFloat = 1f });
            ctl.AddParameter($"v{Version}", AnimatorControllerParameterType.Bool);

            // base: idle variants, then the moving clips at their speeds
            var state = ctl.CreateBlendTreeInController("Locomotion", out var tree, 0);
            // Foot IK (§6.E): feet go where the capture put them; without it the retargeted legs, longer or shorter than
            // the captured subject's, left the feet 1-2 cm over the floor (P4.8)
            state.iKOnFeet = true;
            state.speedParameterActive = true;
            state.speedParameter = "LocoRate";
            // by sex ("Sex" 0 or 1: one tree plays), then by the person's gait set ("Gait": Pace.MenSets, WomenSets), each a
            // blend on "Speed" over its sex's idles and the set's moving clips
            tree.blendType = BlendTreeType.Simple1D;
            tree.blendParameter = "Sex";
            tree.useAutomaticThresholds = false;
            foreach (var (sexAt, idles, sets, label) in new[]
                     {
                         (0f, Idles, SecondFace.Game.People.Pace.MenSets, "Men"),
                         (1f, IdlesF, SecondFace.Game.People.Pace.WomenSets, "Women"),
                     })
            {
                var bySet = tree.CreateBlendTreeChild(sexAt);
                bySet.name = label;
                bySet.blendType = BlendTreeType.Simple1D;
                bySet.blendParameter = "Gait";
                bySet.useAutomaticThresholds = false;
                for (var g = 0; g < sets.Length; g++)
                {
                    var byPace = bySet.CreateBlendTreeChild(g);
                    byPace.name = $"{label} {g}";
                    byPace.blendType = BlendTreeType.Simple1D;
                    byPace.blendParameter = "Speed";
                    byPace.useAutomaticThresholds = false;
                    var idle = byPace.CreateBlendTreeChild(0f);
                    idle.name = "Idle";
                    idle.blendType = BlendTreeType.Simple1D;
                    idle.blendParameter = "Idle";
                    idle.useAutomaticThresholds = false;
                    for (var i = 0; i < idles.Length; i++)
                    {
                        var clip = Clip(idles[i]);
                        if (clip != null) idle.AddChild(clip, i);
                    }
                    foreach (var (name, _, _) in sets[g])
                    {
                        var clip = Clip(name);
                        if (clip != null) byPace.AddChild(clip, Speed(name));
                    }
                }
            }
            ctl.layers[0].stateMachine.defaultState = state;
            // whole-body states played by name: the pickup goes back to walking as the body straightens; a sit holds
            var baseSm = ctl.layers[0].stateMachine;
            var pickupClip = Clip("pickup");
            if (pickupClip != null)
            {
                var pickup = baseSm.AddState("pickup");
                pickup.motion = pickupClip;
                pickup.speed = PickupSpeed;
                pickup.iKOnFeet = true;
                var up = pickup.AddTransition(state);
                up.hasExitTime = true;
                up.exitTime = PickupExit;
                up.duration = 0.3f;
                up.hasFixedDuration = true;
            }
            // the sneak: crouched, at the pace the walker goes (still: held in the crouch)
            var sneakClip = Clip("sneak");
            if (sneakClip != null)
            {
                var sneak = baseSm.AddState("sneak");
                sneak.motion = sneakClip;
                sneak.iKOnFeet = true;
                sneak.speedParameterActive = true;
                sneak.speedParameter = "SneakRate";
                var down = state.AddTransition(sneak);
                down.hasExitTime = false;
                down.duration = 0.3f;
                down.hasFixedDuration = true;
                down.AddCondition(AnimatorConditionMode.If, 0, "Sneak");
                var rise = sneak.AddTransition(state);
                rise.hasExitTime = false;
                rise.duration = 0.3f;
                rise.hasFixedDuration = true;
                rise.AddCondition(AnimatorConditionMode.IfNot, 0, "Sneak");
            }
            foreach (var name in Sits)
            {
                var clip = Clip(name);
                if (clip == null) continue;
                var sit = baseSm.AddState(name);
                sit.motion = clip;
                sit.tag = SitTag;
            }
            var layers = ctl.layers;
            layers[0].iKPass = true;
            ctl.layers = layers;

            // gestures over the upper body
            ctl.AddLayer(GestureLayer);
            layers = ctl.layers;
            // at rest the layer weighs nothing: an empty state on an override layer would write the default pose over
            // the upper body (and undo the base layer's foot planting); Ambient raises it while a gesture plays
            layers[1].defaultWeight = 0f;
            layers[1].avatarMask = UpperBody();
            ctl.layers = layers;
            var sm = ctl.layers[1].stateMachine;
            var none = sm.AddState("none");
            none.writeDefaultValues = false;
            sm.defaultState = none;
            foreach (var name in Gestures)
            {
                var clip = Clip(name);
                if (clip == null) continue;
                var s = sm.AddState(name);
                s.motion = clip;
                s.writeDefaultValues = false;
                var back = s.AddTransition(none);
                back.hasExitTime = true;
                back.exitTime = clip.isLooping ? 1f : 0.9f;   // a looping talk goes once round
                back.duration = 0.3f;
                back.hasFixedDuration = true;
            }
            EditorUtility.SetDirty(ctl);
            AssetDatabase.SaveAssets();
            Steps(ctl);
            return ctl;
        }

        /// <summary>Arms, hands, head and the trunk: what a gesture moves while the legs keep the base layer's stance.</summary>
        private static AvatarMask UpperBody()
        {
            var mask = AssetDatabase.LoadAssetAtPath<AvatarMask>(MaskPath);
            var fresh = mask == null;
            if (fresh) mask = new AvatarMask();
            for (var p = 0; p < (int)AvatarMaskBodyPart.LastBodyPart; p++) mask.SetHumanoidBodyPartActive((AvatarMaskBodyPart)p, false);
            foreach (var p in new[] { AvatarMaskBodyPart.Body, AvatarMaskBodyPart.Head, AvatarMaskBodyPart.LeftArm, AvatarMaskBodyPart.RightArm,
                                      AvatarMaskBodyPart.LeftFingers, AvatarMaskBodyPart.RightFingers })
                mask.SetHumanoidBodyPartActive(p, true);
            if (fresh) AssetDatabase.CreateAsset(mask, MaskPath); else EditorUtility.SetDirty(mask);
            return mask;
        }

        private static AnimationClip Clip(string name)
        {
            var path = $"Assets/SecondFace/Motion/{name}.fbx";
            var clip = AssetDatabase.LoadAllAssetsAtPath(path).OfType<AnimationClip>().FirstOrDefault(c => !c.name.StartsWith("__preview"));
            if (clip == null) Debug.LogWarning($"LocomotionBuild: no clip in {path}");
            return clip;
        }

        /// <summary>For the command line (tools/unity/editor.sh run): the sits' tag (<see cref="SitTag"/>, as <see cref="Build"/>
        /// gives it) set on the committed controller's states, the controller not built again (a rebuild makes every state,
        /// transition and the fight's layers anew).</summary>
        public static void TagSits()
        {
            var ctl = AssetDatabase.LoadAssetAtPath<AnimatorController>(ControllerPath);
            if (ctl == null || ctl.layers.Length == 0) { Debug.LogError("LocomotionBuild: no controller to tag"); return; }
            var n = 0;
            foreach (var c in ctl.layers[0].stateMachine.states)
                if (Sits.Contains(c.state.name) && c.state.tag != SitTag) { c.state.tag = SitTag; EditorUtility.SetDirty(c.state); n++; }
            EditorUtility.SetDirty(ctl);
            AssetDatabase.SaveAssets();
            Debug.Log($"LocomotionBuild: {n} of the sits tagged \"{SitTag}\"");
        }

        // ------------------------------------------------------------------------------------------- the clips' record of contact

        public const string StepsPath = "Assets/SecondFace/Game/Resources/StepRecord.asset";
        /// <summary>The record's build (its version is in <see cref="StepStamp"/>).</summary>
        public const int StepsBake = 1;

        /// <summary>Every clip the base layer plays (its states' motions, through their blend trees), by file, in order.</summary>
        public static System.Collections.Generic.List<AnimationClip> BaseClips(AnimatorController ctl)
        {
            var seen = new System.Collections.Generic.HashSet<AnimationClip>();
            void Motion(Motion m)
            {
                if (m is AnimationClip c) seen.Add(c);
                else if (m is BlendTree t) foreach (var ch in t.children) Motion(ch.motion);
            }
            void Walk(AnimatorStateMachine sm)
            {
                foreach (var s in sm.states) Motion(s.state.motion);
                foreach (var c in sm.stateMachines) Walk(c.stateMachine);
            }
            if (ctl != null && ctl.layers.Length > 0) Walk(ctl.layers[0].stateMachine);
            return seen.Where(c => AssetDatabase.GetAssetPath(c).StartsWith("Assets/SecondFace/Motion/")).OrderBy(c => AssetDatabase.GetAssetPath(c), System.StringComparer.Ordinal).ToList();
        }

        /// <summary>What the record is built from: its version, each clip's sidecar, model and import settings, as committed.</summary>
        public static string StepStamp(System.Collections.Generic.IEnumerable<AnimationClip> clips)
        {
            ulong h = 14695981039346656037UL;
            void Add(byte b) { h ^= b; h *= 1099511628211UL; }
            void Text(string s) { foreach (var b in System.Text.Encoding.UTF8.GetBytes(s)) Add(b); }
            Text($"steps v{StepsBake};");
            foreach (var c in clips)
            {
                var path = AssetDatabase.GetAssetPath(c);
                Text(path + ":");
                foreach (var file in new[] { Path.ChangeExtension(path, ".json"), path + ".meta" })
                    if (File.Exists(file)) foreach (var b in File.ReadAllBytes(file)) if (b != (byte)'\r') Add(b);
                Text(";");
            }
            return h.ToString("x16", System.Globalization.CultureInfo.InvariantCulture);
        }

        /// <summary>One clip's record of contact from its sidecar (null: none): each stance's touchdown to toe-off, the take's
        /// frames at its rate, as the clip's normalized time.</summary>
        public static SecondFace.Game.People.StepRecord.Clip StepsOf(AnimationClip c)
        {
            var path = AssetDatabase.GetAssetPath(c);
            var json = Path.ChangeExtension(path, ".json");
            if (!File.Exists(json) || c.length <= 0f) return null;
            var j = Newtonsoft.Json.Linq.JObject.Parse(File.ReadAllText(json));
            var st = j["plant"]?["stances"] as Newtonsoft.Json.Linq.JObject;
            if (st == null) return null;
            var fps = j["fps"] != null ? (float)j["fps"] : 30f;
            float[] Spans(string side)
            {
                var l = new System.Collections.Generic.List<float>();
                if (st[side] is Newtonsoft.Json.Linq.JArray a)
                    foreach (var s in a)
                    {
                        float N(float frame) { var t = frame / fps / c.length; return t - Mathf.Floor(t); }
                        l.Add(N((float)s["touchdown"])); l.Add(N((float)s["toe_off"]));
                    }
                return l.ToArray();
            }
            var r = new SecondFace.Game.People.StepRecord.Clip { Name = Path.GetFileNameWithoutExtension(path), Motion = c, Length = c.length, DownL = Spans("Left"), DownR = Spans("Right") };
            return r.DownL.Length + r.DownR.Length > 0 ? r : null;
        }

        /// <summary>Builds the record (<see cref="StepsPath"/>) from the controller's base layer's clips; returns it.</summary>
        public static SecondFace.Game.People.StepRecord Steps(AnimatorController ctl)
        {
            var rec = AssetDatabase.LoadAssetAtPath<SecondFace.Game.People.StepRecord>(StepsPath);
            var fresh = rec == null;
            if (fresh) rec = ScriptableObject.CreateInstance<SecondFace.Game.People.StepRecord>();
            var clips = BaseClips(ctl);
            rec.Clips = clips.Select(StepsOf).Where(x => x != null).ToArray();
            rec.Stamp = StepStamp(clips);
            if (fresh) AssetDatabase.CreateAsset(rec, StepsPath); else EditorUtility.SetDirty(rec);
            AssetDatabase.SaveAssets();
            Debug.Log($"LocomotionBuild: the record of contact for {rec.Clips.Length} of the base layer's {clips.Count} clips ({string.Join(", ", rec.Clips.Select(x => x.Name))}); stamp {rec.Stamp}");
            return rec;
        }

        /// <summary>For the command line: the record of contact built again from the committed controller.</summary>
        public static void RefreshSteps() => Steps(AssetDatabase.LoadAssetAtPath<AnimatorController>(ControllerPath));

        /// <summary>A clip's ground speed from its sidecar (tools/unity/motion/cmu2fbx.py), m/s.</summary>
        private static float Speed(string name)
        {
            var json = $"Assets/SecondFace/Motion/{name}.json";
            if (!File.Exists(json)) return 0;
            return JsonUtility.FromJson<Sidecar>(File.ReadAllText(json)).speed;
        }

        [System.Serializable]
        private sealed class Sidecar { public float speed; }
    }
}
