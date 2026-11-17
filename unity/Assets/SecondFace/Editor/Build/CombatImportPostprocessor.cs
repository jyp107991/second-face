using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using SecondFace.Core.Combat;
using UnityEditor;
using UnityEngine;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// How the fight's staged assets import (COMBAT.md A1–A8; the staging's tools/unity/combat/stage_combat.py copies them in):
    /// <list type="bullet">
    /// <item>Clips (Combat/Motion/*.fbx): Humanoid, the avatar from the clip's own skeleton in its bind pose (the converters'
    /// true T-pose at frame 0, outside the take), the whole take, looping as the sidecar says, root motion by Core
    /// <see cref="CombatMotion.Clip"/> (README v2 §2's travel table): a clip whose travel is applied keeps it as root motion
    /// (the game's fighter applies it through the agent), the rest bake it into the pose and play in place; the height
    /// baked from the feet for a standing clip, as captured for a crouch, a get-up or a fall; the body's turn kept in the
    /// pose from its facing as the clip starts (a hook's hips, a throw's wind-up), extracted for a get-up whose turn the
    /// body takes, dropped for a stumble that spins on its capture.</item>
    /// <item>Weapons (Combat/Weapons/&lt;name&gt;/): the model in metres with its axis conversion baked (its nulls, grip_main
    /// at the origin, grip_off, muzzle, tip, where the sidecar says), materials remapped by name to the build's lore
    /// materials (CombatAnimatorBuild); maps as URP Lit takes them (normal maps as normal maps, the mask linear: R metallic,
    /// G occlusion, A smoothness), 1024 px for long guns and 512 otherwise, as staged.</item>
    /// </list>
    /// The motion's own postprocessor (Assets/SecondFace/Motion) is not used for these: the fight's clips are another
    /// folder with their own rules, and the people's locomotion stays exactly as it was.
    /// </summary>
    public sealed class CombatImportPostprocessor : AssetPostprocessor
    {
        /// <summary>Bump when the rules below change (Unity reimports only on a new version).</summary>
        public override uint GetVersion() => 1;

        public const string MotionDir = CombatMotion.Folder + "/";
        public const string WeaponDir = CombatMotion.WeaponFolder + "/";

        private bool IsClip => assetPath.StartsWith(MotionDir) && assetPath.EndsWith(".fbx");
        private bool IsWeapon => assetPath.StartsWith(WeaponDir) && assetPath.EndsWith(".fbx");
        private bool IsWeaponMap => assetPath.StartsWith(WeaponDir) && (assetPath.EndsWith(".png") || assetPath.EndsWith(".jpg"));

        private static readonly string[] LongGuns = { "rifle_auto", "rifle_bolt", "shotgun_sawn" };

        private JObject Sidecar()
        {
            var json = Path.ChangeExtension(assetPath, ".json");
            return File.Exists(json) ? JObject.Parse(File.ReadAllText(json)) : null;
        }

        private void OnPreprocessModel()
        {
            var imp = (ModelImporter)assetImporter;
            if (IsClip)
            {
                imp.animationType = ModelImporterAnimationType.Human;
                imp.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
                imp.importAnimation = true;
                imp.animationCompression = ModelImporterAnimationCompression.Optimal;
                imp.animationRotationError = 0.3f; imp.animationPositionError = 0.3f;
                imp.materialImportMode = ModelImporterMaterialImportMode.None;
                imp.isReadable = false;
                imp.resampleCurves = true;
                imp.importBlendShapes = false;
            }
            else if (IsWeapon)
            {
                imp.animationType = ModelImporterAnimationType.None;
                imp.importAnimation = false;
                imp.useFileScale = true;
                imp.globalScale = 1f;
                imp.bakeAxisConversion = true;
                imp.importBlendShapes = false;
                imp.importCameras = false; imp.importLights = false;
                imp.addCollider = false;
                imp.isReadable = false;
                imp.meshCompression = ModelImporterMeshCompression.Medium;
                imp.importNormals = ModelImporterNormals.Import;
                imp.importTangents = ModelImporterTangents.CalculateMikk;
                // (materials by name: CombatAnimatorBuild remaps each to its lore material)
                imp.materialImportMode = ModelImporterMaterialImportMode.ImportStandard;
                imp.materialLocation = ModelImporterMaterialLocation.InPrefab;
            }
        }

        private void OnPreprocessAnimation()
        {
            if (!IsClip) return;
            var imp = (ModelImporter)assetImporter;
            var name = Path.GetFileNameWithoutExtension(assetPath);
            var side = Sidecar();
            var loop = side?.Value<bool?>("loop") ?? false;
            var clip = CombatMotion.Clip(name);
            var defaults = imp.defaultClipAnimations;
            var clips = imp.clipAnimations != null && imp.clipAnimations.Length > 0 ? imp.clipAnimations : defaults;
            if (clips == null || clips.Length == 0) return;
            foreach (var c in clips)
            {
                // the whole take, every time (a range kept in a .meta from an older export would cut it)
                if (defaults != null)
                    foreach (var d in defaults)
                        if (d.takeName == c.takeName || defaults.Length == 1) { c.firstFrame = d.firstFrame; c.lastFrame = d.lastFrame; break; }
                Settings(c, loop, clip);
            }
            imp.clipAnimations = clips;
        }

        /// <summary>A clip's settings from the table (also what the build's tests check the imported clips against).</summary>
        public static void Settings(ModelImporterClipAnimation c, bool loop, MotionClip clip)
        {
            var apply = clip != null && clip.XZ == RootXZ.Apply;
            var keepY = clip != null && clip.Y == RootY.Keep;
            var turn = clip != null && (clip.Turn || clip.DropTurn);
            c.loopTime = loop; c.loopPose = loop;
            c.lockRootRotation = !turn; c.keepOriginalOrientation = false;
            c.lockRootPositionXZ = !apply; c.keepOriginalPositionXZ = false;
            c.lockRootHeightY = true; c.keepOriginalPositionY = keepY; c.heightFromFeet = !keepY;
        }

        private void OnPostprocessAnimation(GameObject root, AnimationClip clip)
        {
            if (!IsClip || clip == null) return;
            var name = Path.GetFileNameWithoutExtension(assetPath);
            var loop = Sidecar()?.Value<bool?>("loop") ?? false;
            var m = CombatMotion.Clip(name);
            var s = AnimationUtility.GetAnimationClipSettings(clip);
            var apply = m != null && m.XZ == RootXZ.Apply;
            var keepY = m != null && m.Y == RootY.Keep;
            var turn = m != null && (m.Turn || m.DropTurn);
            s.loopTime = loop; s.loopBlend = loop;
            s.loopBlendOrientation = !turn; s.keepOriginalOrientation = false;
            s.loopBlendPositionXZ = !apply; s.keepOriginalPositionXZ = false;
            s.loopBlendPositionY = true; s.keepOriginalPositionY = keepY; s.heightFromFeet = !keepY;
            AnimationUtility.SetAnimationClipSettings(clip, s);
        }

        private void OnPreprocessTexture()
        {
            if (!IsWeaponMap) return;
            var imp = (TextureImporter)assetImporter;
            var file = Path.GetFileNameWithoutExtension(assetPath);
            var weapon = Path.GetFileName(Path.GetDirectoryName(assetPath));
            imp.mipmapEnabled = true;
            imp.maxTextureSize = LongGuns.Contains(weapon) ? 1024 : 512;
            imp.textureCompression = TextureImporterCompression.Compressed;
            imp.wrapMode = TextureWrapMode.Repeat;
            if (file.EndsWith("_Normal")) { imp.textureType = TextureImporterType.NormalMap; imp.sRGBTexture = false; }
            else if (file.EndsWith("_Mask")) { imp.textureType = TextureImporterType.Default; imp.sRGBTexture = false; imp.alphaSource = TextureImporterAlphaSource.FromInput; }
            else
            {
                imp.textureType = TextureImporterType.Default;
                imp.sRGBTexture = true;
                // (the bottle's glass carries its alpha in its base map)
                imp.alphaSource = TextureImporterAlphaSource.FromInput;
                imp.alphaIsTransparency = assetPath.EndsWith(".png");
            }
        }

        /// <summary>The people's controller built again (LocomotionBuild clears every layer): the fight's layers put back
        /// on it, once the import is done.</summary>
        private static void OnPostprocessAllAssets(string[] imported, string[] deleted, string[] moved, string[] movedFrom)
        {
            if (!imported.Contains(LocomotionBuild.ControllerPath)) return;
            EditorApplication.delayCall += () =>
            {
                var ctl = AssetDatabase.LoadAssetAtPath<UnityEditor.Animations.AnimatorController>(LocomotionBuild.ControllerPath);
                if (ctl != null && !CombatAnimatorBuild.HasLayers(ctl) && CombatAnimatorBuild.ClipsImported()) CombatAnimatorBuild.AddLayers(ctl, false);
            };
        }
    }
}
