using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Animations;
using UnityEngine;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// The locomotion controller the walkabout's people share (step 25): one state, a 1D blend tree on "Speed" (m/s)
    /// over the captured clips at their own speeds (Motion/&lt;clip&gt;.json): idle 0, walk_slow, walk, walk_brisk, jog. A
    /// person moved at a speed between two clips blends them, so the feet keep pace. Committed at
    /// <see cref="ControllerPath"/>; built only when missing (a rebuild renumbers its sub-assets).
    /// </summary>
    public static class LocomotionBuild
    {
        public const string ControllerPath = "Assets/SecondFace/People/Locomotion.controller";
        private static readonly string[] Clips = { "idle", "walk_slow", "walk", "walk_brisk", "jog" };

        [MenuItem("Second Face/Build locomotion controller")]
        public static RuntimeAnimatorController Build() => Build(false);

        public static RuntimeAnimatorController Build(bool force)
        {
            var existing = AssetDatabase.LoadAssetAtPath<AnimatorController>(ControllerPath);
            if (existing != null && !force) return existing;
            if (existing != null) AssetDatabase.DeleteAsset(ControllerPath);
            var ctl = AnimatorController.CreateAnimatorControllerAtPath(ControllerPath);
            ctl.AddParameter("Speed", AnimatorControllerParameterType.Float);
            var state = ctl.CreateBlendTreeInController("Locomotion", out var tree, 0);
            tree.blendType = BlendTreeType.Simple1D;
            tree.blendParameter = "Speed";
            tree.useAutomaticThresholds = false;
            foreach (var name in Clips)
            {
                var path = $"Assets/SecondFace/Motion/{name}.fbx";
                var clip = AssetDatabase.LoadAllAssetsAtPath(path).OfType<AnimationClip>().FirstOrDefault(c => !c.name.StartsWith("__preview"));
                if (clip == null) { Debug.LogWarning($"LocomotionBuild: no clip in {path}"); continue; }
                tree.AddChild(clip, Speed(name));
            }
            ctl.layers[0].stateMachine.defaultState = state;
            EditorUtility.SetDirty(ctl);
            AssetDatabase.SaveAssets();
            return ctl;
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
