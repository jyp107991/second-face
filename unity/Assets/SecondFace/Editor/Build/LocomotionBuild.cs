using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Animations;
using UnityEngine;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// The locomotion controller people share (step 25, P4 step 4). Base layer: a 1D blend on "Speed" (m/s) over the
    /// captured clips at their own speeds (Motion/&lt;clip&gt;.json): idle, walk_slow, walk, walk_brisk, jog, run, so the
    /// feet keep pace; the idle is itself a blend on "Idle" over four captured idles (each person stands their own way);
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
        public const int Version = 7;
        /// <summary>The pickup clip (CMU 26_09, 6 s) stands still for its first 0.9 s, is lowest at 2.3 s and upright
        /// again by 3.7 s: it is played from 0.7 s in, 1.4 times as fast, and leaves for the locomotion at 62 %.</summary>
        public const float PickupFrom = 0.7f, PickupSpeed = 1.4f, PickupExit = 0.62f;
        public static readonly string[] Sits = { "sit", "sit_stool", "sit_ground" };
        public const string GestureLayer = "Gesture";
        private static readonly string[] Moving = { "walk_slow", "walk", "walk_brisk", "jog", "run" };
        private static readonly string[] Idles = { "idle", "idle_b", "idle_c", "idle_d" };
        public static readonly string[] Gestures = { "talk", "talk_b", "argue", "drink", "wave", "stretch", "yawn", "yawn_b" };

        [MenuItem("Second Face/Build locomotion controller")]
        public static RuntimeAnimatorController Build() => Build(false);

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
            ctl.AddParameter("Idle", AnimatorControllerParameterType.Float);
            ctl.AddParameter("Sneak", AnimatorControllerParameterType.Bool);
            ctl.AddParameter(new AnimatorControllerParameter { name = "SneakRate", type = AnimatorControllerParameterType.Float, defaultFloat = 1f });
            ctl.AddParameter($"v{Version}", AnimatorControllerParameterType.Bool);

            // base: idle variants, then the moving clips at their speeds
            var state = ctl.CreateBlendTreeInController("Locomotion", out var tree, 0);
            // Foot IK (§6.E): feet go where the capture put them; without it the retargeted legs, longer or shorter than
            // the captured subject's, left the feet 1-2 cm over the floor (P4.8)
            state.iKOnFeet = true;
            tree.blendType = BlendTreeType.Simple1D;
            tree.blendParameter = "Speed";
            tree.useAutomaticThresholds = false;
            var idle = tree.CreateBlendTreeChild(0f);
            idle.name = "Idle";
            idle.blendType = BlendTreeType.Simple1D;
            idle.blendParameter = "Idle";
            idle.useAutomaticThresholds = false;
            for (var i = 0; i < Idles.Length; i++)
            {
                var clip = Clip(Idles[i]);
                if (clip != null) idle.AddChild(clip, i);
            }
            foreach (var name in Moving)
            {
                var clip = Clip(name);
                if (clip != null) tree.AddChild(clip, Speed(name));
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
