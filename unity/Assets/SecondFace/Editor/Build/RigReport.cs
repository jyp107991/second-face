using System.Collections.Generic;
using System.Text;
using UnityEditor;
using UnityEngine;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// The reference pose a Humanoid avatar was built from (BUILD_PLAN P4.8): for a person and a motion clip, the
    /// direction of each arm and leg bone in the avatar's skeleton pose (the T-pose Mecanim retargets against) and in
    /// the model's own default pose, in degrees from straight down and from the body's side. Retargeting is only right
    /// when both are a true T-pose: arms level along the side, legs straight down.
    /// </summary>
    public static class RigReport
    {
        private static readonly string[] Models =
        {
            "Assets/SecondFace/People/Cast/cast_sal_01.fbx", "Assets/SecondFace/People/Player/player_f.fbx",
            "Assets/SecondFace/Motion/walk.fbx", "Assets/SecondFace/Motion/idle.fbx",
        };

        private static readonly (HumanBodyBones bone, HumanBodyBones child)[] Limbs =
        {
            (HumanBodyBones.LeftUpperArm, HumanBodyBones.LeftLowerArm), (HumanBodyBones.LeftLowerArm, HumanBodyBones.LeftHand),
            (HumanBodyBones.RightUpperArm, HumanBodyBones.RightLowerArm), (HumanBodyBones.LeftUpperLeg, HumanBodyBones.LeftLowerLeg),
            (HumanBodyBones.LeftLowerLeg, HumanBodyBones.LeftFoot), (HumanBodyBones.Spine, HumanBodyBones.Chest),
        };

        [MenuItem("Second Face/Report rig poses")]
        public static void Report()
        {
            var sb = new StringBuilder("RigReport\n");
            foreach (var path in Models)
            {
                var imp = AssetImporter.GetAtPath(path) as ModelImporter;
                var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path);
                if (imp == null || prefab == null) { sb.AppendLine($"{path}: missing"); continue; }
                var go = Object.Instantiate(prefab);
                var anim = go.GetComponent<Animator>();
                if (anim == null || anim.avatar == null || !anim.avatar.isHuman) { sb.AppendLine($"{path}: no human avatar"); Object.DestroyImmediate(go); continue; }
                var desc = anim.avatar.humanDescription;
                sb.AppendLine($"{path}: skeleton {desc.skeleton.Length} bones, human {desc.human.Length}, armStretch {desc.armStretch}, legStretch {desc.legStretch}, feetSpacing {desc.feetSpacing}");
                Line(sb, "default", anim);
                // the avatar's skeleton pose applied to the instance
                var byName = new Dictionary<string, SkeletonBone>();
                foreach (var s in desc.skeleton) byName[s.name] = s;
                foreach (var t in go.GetComponentsInChildren<Transform>(true))
                    if (t != go.transform && byName.TryGetValue(t.name, out var s)) { t.localPosition = s.position; t.localRotation = s.rotation; }
                Line(sb, "avatar ", anim);
                Object.DestroyImmediate(go);
            }
            Debug.Log(sb.ToString());
        }

        private static void Line(StringBuilder sb, string label, Animator anim)
        {
            var root = anim.transform;
            var hips = anim.GetBoneTransform(HumanBodyBones.Hips);
            var l = anim.GetBoneTransform(HumanBodyBones.LeftUpperArm); var r = anim.GetBoneTransform(HumanBodyBones.RightUpperArm);
            var side = (l.position - r.position).normalized;   // the body's left
            var down = -root.up;
            sb.Append($"  {label}:");
            foreach (var (bone, child) in Limbs)
            {
                var a = anim.GetBoneTransform(bone); var b = anim.GetBoneTransform(child);
                if (a == null || b == null) continue;
                var d = (b.position - a.position).normalized;
                sb.Append($" {bone} down {Vector3.Angle(d, down):0} side {Vector3.Angle(d, side):0} |");
            }
            sb.AppendLine($" hips y {hips.position.y - root.position.y:0.00}");
        }
    }
}
