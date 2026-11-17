using System.IO;
using System.Linq;
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
    /// The avatar each clip is retargeted from is built from the clip's own file whenever the file changes, with the
    /// Humanoid hand on the hand bone itself (<see cref="Mapped"/>, <see cref="OnPreprocessModel"/>).
    /// </summary>
    public sealed class MotionImportPostprocessor : AssetPostprocessor
    {
        /// <summary>Bump when the rules below change: Unity reimports affected assets only on a new version (cached Libraries otherwise keep stale imports).</summary>
        public override uint GetVersion() => 12;

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

        /// <summary>The converters' skeleton (tools/unity/motion, convention D) as Humanoid bones, each by its own name: the hand
        /// is LeftHand/RightHand, the bone the captured wrist's turn is on, and the wrist-twist bone between it and the
        /// forearm is an in-between held at rest (as are Neck2 and the hip joints), the forearm's twist shared out by the
        /// avatar's own setting. Until 2026-11-17 the 28 clips first imported before motion set v2 had the twist bone as the
        /// hand, kept in their .meta, and Unity threw the wrist's turn away (up to 107° in `wave`, 71° in `argue`, 54° in
        /// `talk`, 28° in `walk`); the ten imported since had the hand bone.</summary>
        private static readonly string[] Mapped =
        {
            "Hips", "Spine", "Chest", "UpperChest", "Neck", "Head",
            "LeftShoulder", "LeftUpperArm", "LeftLowerArm", "LeftHand", "RightShoulder", "RightUpperArm", "RightLowerArm", "RightHand",
            "LeftUpperLeg", "LeftLowerLeg", "LeftFoot", "LeftToes", "RightUpperLeg", "RightLowerLeg", "RightFoot", "RightToes",
        };

        private static bool MappedAsWanted(HumanDescription hd) =>
            hd.human != null && hd.human.Length == Mapped.Length && hd.human.All(h => h.boneName == h.humanName && Mapped.Contains(h.humanName));

        private static string Stamp(string path)
        {
            using var sha = System.Security.Cryptography.SHA256.Create();
            return "rest " + System.BitConverter.ToString(sha.ComputeHash(File.ReadAllBytes(path))).Replace("-", "").ToLowerInvariant();
        }

        private void OnPreprocessModel()
        {
            if (!IsClip) return;
            var imp = (ModelImporter)assetImporter;
            // The avatar's configuration (the bones' rest every frame is retargeted against) from this file, never one kept
            // in the .meta from an earlier export of it: Unity builds it at a clip's first import from that take's first key
            // and reuses it on every later import, so each re-exported take was retargeted against its first export's pose
            // (Neck2 6-45° off on motion set v6's gaits, the "Rig Error" in the import log; the trunk and legs up to 20° on
            // other clips; v5 and the CMU clips not re-imported alike, 2026-11-17). Rebuilt whenever the file's bytes change
            // (their hash kept in the importer's userData), in two imports. The first reads the model without its take, so
            // Unity fills the emptied description from the file's default pose: the converters' T-pose (`t_pose_key`, the
            // FBX's default values), one reference for every clip, as the bodies' own avatars are T-posed. With the take on,
            // Unity fills it from the take's first key with every limb as captured (a jog's left touchdown, an idle's arms
            // down: two clips of one skeleton 90-160° apart), so each clip was retargeted from wherever its cut began
            // (v6.1's first keys raised every jogger's stance sole about 1 cm and moved the CMU gaits' strides 2-7 %,
            // 2026-11-17). The second (<see cref="Configure"/>) puts <see cref="Mapped"/> over that configuration, kept, and
            // imports the take.
            var stamp = Stamp(assetPath);
            var hd = imp.humanDescription;
            if (imp.userData != stamp && imp.userData != "fresh " + stamp)
            {
                hd.human = new HumanBone[0];
                hd.skeleton = new SkeletonBone[0];
                imp.humanDescription = hd;
                imp.userData = "fresh " + stamp;
            }
            var first = imp.userData == "fresh " + stamp;
            if (first || !MappedAsWanted(hd))
            {
                var path = assetPath;
                EditorApplication.delayCall += () => Configure(path);
            }
            imp.animationType = ModelImporterAnimationType.Human;
            imp.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
            imp.importAnimation = !first;
            imp.animationCompression = ModelImporterAnimationCompression.Optimal;
            imp.animationRotationError = 0.3f; imp.animationPositionError = 0.3f;
            imp.materialImportMode = ModelImporterMaterialImportMode.None;
            imp.isReadable = false;
            imp.resampleCurves = true;
        }

        /// <summary>The second of a changed clip's two imports (outside the import: from the editor's next update, or by
        /// <see cref="ConfigureAll"/>): the mapping <see cref="Mapped"/> over the configuration Unity filled from the file's
        /// T-pose, kept, and the take imported against it.</summary>
        public static bool Configure(string path)
        {
            var imp = AssetImporter.GetAtPath(path) as ModelImporter;
            if (imp == null) return false;
            var stamp = Stamp(path);
            var hd = imp.humanDescription;
            if (imp.userData == stamp && MappedAsWanted(hd)) return false;
            if (imp.userData != stamp && imp.userData != "fresh " + stamp) { imp.SaveAndReimport(); return Configure(path); }
            if (hd.skeleton == null || hd.skeleton.Length == 0) { Debug.LogError($"{path}: Unity filled no configuration from its T-pose"); return false; }
            hd.human = Mapped.Select(n => new HumanBone { boneName = n, humanName = n, limit = new HumanLimit { useDefaultValues = true } }).ToArray();
            imp.humanDescription = hd;
            imp.userData = stamp;
            imp.SaveAndReimport();
            return true;
        }

        /// <summary>Every clip whose configuration is not yet its file's T-pose and mapping (a batch run's first step: the
        /// editor's delayed calls do not run before -executeMethod or the tests).</summary>
        public static int ConfigureAll() =>
            Directory.GetFiles("Assets/SecondFace/Motion/", "*.fbx").Select(p => p.Replace('\\', '/')).Count(Configure);

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
                // and every stance foot slid by the difference (W1/W2, 2026-11-06); an idle's and a gesture's hips sway about
                // their mean the same way (motion set v2, 2026-11-17: as root motion the sway was dropped and the body stood
                // still over feet that shifted); only a clip that travels (a fall) keeps its root's way
                c.lockRootPositionXZ = gait || !root; c.keepOriginalPositionXZ = false;
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
            s.loopBlendPositionXZ = gait || !travels; s.keepOriginalPositionXZ = false;
            s.loopBlendPositionY = !travels; s.keepOriginalPositionY = false; s.heightFromFeet = !travels;
            AnimationUtility.SetAnimationClipSettings(clip, s);
        }
    }
}
