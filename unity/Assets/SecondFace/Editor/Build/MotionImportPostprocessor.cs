using System.IO;
using Newtonsoft.Json.Linq;
using UnityEditor;
using UnityEngine;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// Captured-motion clips (Assets/SecondFace/Motion/*.fbx, written by tools/unity/motion/cmu2fbx.py) import as Humanoid
    /// animations: avatar from the clip's own skeleton, loop settings from the sidecar JSON, root motion kept only for
    /// clips that travel (falls); walks play in place and the game moves the body, their stride's surge and sway baked
    /// into the pose.
    /// The clip settings go in at <see cref="OnPreprocessAnimation"/>, where the file's takes are known (at
    /// OnPreprocessModel the default clips are still empty: until 2026-11-05 every clip imported with Unity's defaults, no
    /// loop, so a walk froze after one stride and was dragged; docs/PEOPLE_MOTION.md W1), and are made sure of again on
    /// the imported clip itself (<see cref="OnPostprocessAnimation"/>). The gate checks every clip against its sidecar
    /// (HumanMotionGateTests.TheCapturedClipsLoopAsTheirSidecarsSay).
    /// </summary>
    public sealed class MotionImportPostprocessor : AssetPostprocessor
    {
        /// <summary>Bump when the rules below change: Unity reimports affected assets only on a new version (cached Libraries otherwise keep stale imports).</summary>
        public override uint GetVersion() => 7;

        private bool IsClip => assetPath.StartsWith("Assets/SecondFace/Motion/") && assetPath.EndsWith(".fbx");

        private (bool Loop, bool Root) Sidecar() { var (l, r, _) = Sidecar3(); return (l, r); }

        /// <summary>Loop, travel, and whether the clip is a gait (a speed: it plays in place, its stride's own surge and
        /// sway kept in the pose).</summary>
        private (bool Loop, bool Root, bool Gait) Sidecar3()
        {
            var sidecar = Path.ChangeExtension(assetPath, ".json");
            if (!File.Exists(sidecar)) return (false, false, false);
            var j = JObject.Parse(File.ReadAllText(sidecar));
            return (j.Value<bool?>("loop") ?? false, j.Value<bool?>("root") ?? false, (j.Value<double?>("speed") ?? 0.0) > 0.0);
        }

        private void OnPreprocessModel()
        {
            if (!IsClip) return;
            var imp = (ModelImporter)assetImporter;
            imp.animationType = ModelImporterAnimationType.Human;
            imp.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
            imp.importAnimation = true;
            imp.animationCompression = ModelImporterAnimationCompression.Optimal;
            imp.animationRotationError = 0.3f; imp.animationPositionError = 0.3f;
            imp.materialImportMode = ModelImporterMaterialImportMode.None;
            imp.isReadable = false;
            imp.resampleCurves = true;
        }

        private void OnPreprocessAnimation()
        {
            if (!IsClip) return;
            var imp = (ModelImporter)assetImporter;
            var (loop, root, gait) = Sidecar3();
            var defaults = imp.defaultClipAnimations;
            var clips = imp.clipAnimations != null && imp.clipAnimations.Length > 0 ? imp.clipAnimations : defaults;
            if (clips == null || clips.Length == 0) return;
            foreach (var c in clips)
            {
                // the whole take, every time: a range kept in the .meta from an older export cut the re-exported sneak to
                // its first 15 of 39 frames, half a stride (2026-11-06)
                if (defaults != null)
                    foreach (var d in defaults)
                        if (d.takeName == c.takeName || defaults.Length == 1) { c.firstFrame = d.firstFrame; c.lastFrame = d.lastFrame; break; }
                // looping as the sidecar says; the body's height baked in from the feet (the soles stay on the root's
                // ground); its turn and travel left as root motion, which the game does not apply (applyRootMotion is off),
                // so the body stays upright, facing the root's way, in place. Baking the orientation from the original
                // (the capture file's own axes) laid the bodies over (2026-11-05).
                c.loopTime = loop; c.loopPose = loop;
                c.lockRootRotation = false; c.keepOriginalOrientation = false;
                // a gait's surge and sway (the stride's own changes of speed, left in by cmu2fbx.py) baked into the pose:
                // as root motion they were thrown away, the body held still while the game moved it at a constant pace,
                // and every stance foot slid by the difference (W1/W2, 2026-11-06)
                c.lockRootPositionXZ = gait; c.keepOriginalPositionXZ = false;
                c.lockRootHeightY = !root; c.keepOriginalPositionY = false; c.heightFromFeet = !root;
            }
            imp.clipAnimations = clips;
        }

        private void OnPostprocessAnimation(GameObject root, AnimationClip clip)
        {
            if (!IsClip || clip == null) return;
            var (loop, travels, gait) = Sidecar3();
            var s = AnimationUtility.GetAnimationClipSettings(clip);
            s.loopTime = loop; s.loopBlend = loop;
            s.loopBlendOrientation = false; s.keepOriginalOrientation = false;
            s.loopBlendPositionXZ = gait; s.keepOriginalPositionXZ = false;
            s.loopBlendPositionY = !travels; s.keepOriginalPositionY = false; s.heightFromFeet = !travels;
            AnimationUtility.SetAnimationClipSettings(clip, s);
        }
    }
}
