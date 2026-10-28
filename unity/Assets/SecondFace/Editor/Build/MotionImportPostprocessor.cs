using System.IO;
using Newtonsoft.Json.Linq;
using UnityEditor;
using UnityEngine;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// Captured-motion clips (Assets/SecondFace/Motion/*.fbx, written by tools/unity/motion/cmu2fbx.py) import as Humanoid
    /// animations: avatar from the clip's own skeleton, loop settings from the sidecar JSON, root motion kept only for
    /// clips that travel (falls); walks play in place and the game moves the body.
    /// </summary>
    public sealed class MotionImportPostprocessor : AssetPostprocessor
    {
        private bool IsClip => assetPath.StartsWith("Assets/SecondFace/Motion/") && assetPath.EndsWith(".fbx");

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
            var sidecar = Path.ChangeExtension(assetPath, ".json");
            var loop = false; var root = false;
            if (File.Exists(sidecar))
            {
                var j = JObject.Parse(File.ReadAllText(sidecar));
                loop = j.Value<bool?>("loop") ?? false; root = j.Value<bool?>("root") ?? false;
            }
            var clips = imp.defaultClipAnimations;
            if (clips == null || clips.Length == 0) return;
            foreach (var c in clips)
            {
                c.name = Path.GetFileNameWithoutExtension(assetPath);
                c.loopTime = loop; c.loopPose = loop;
                c.lockRootRotation = true; c.lockRootHeightY = !root; c.lockRootPositionXZ = !root;
                c.keepOriginalOrientation = true; c.keepOriginalPositionY = root; c.keepOriginalPositionXZ = root;
                c.heightFromFeet = !root;
            }
            imp.clipAnimations = clips;
        }
    }
}
