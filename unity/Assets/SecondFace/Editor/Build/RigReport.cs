using System.Collections.Generic;
using System.Linq;
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
            "Assets/SecondFace/People/Player/player_f.fbx",
            "Assets/SecondFace/Motion/walk.fbx", "Assets/SecondFace/Motion/idle.fbx",
            "Assets/SecondFace/People/Rocketbox/Female_Adult_01/Female_Adult_01.fbx", "Assets/SecondFace/People/Rocketbox/Male_Adult_08/Male_Adult_08.fbx",
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
            // (RIG_MODELS: a comma-separated list of model paths in place of the standing list)
            var only = System.Environment.GetEnvironmentVariable("RIG_MODELS");
            foreach (var path in string.IsNullOrEmpty(only) ? Models : only.Split(','))
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
                Width(sb, go, anim);
                Object.DestroyImmediate(go);
            }
            Debug.Log(sb.ToString());
        }

        /// <summary>In the avatar's pose: each shoulder joint's distance out from the spine, and the torso's half-width (its
        /// vertices weighted to the spine and chest, not the arms) 10, 15 and 20 cm under the joint: where a hanging upper arm's
        /// inner side meets the chest's.</summary>
        private static void Width(StringBuilder sb, GameObject go, Animator anim)
        {
            var smr = go.GetComponentsInChildren<SkinnedMeshRenderer>(true).Where(r => r.sharedMesh != null).OrderByDescending(r => r.sharedMesh.vertexCount).FirstOrDefault();
            if (smr == null) return;
            var baked = new Mesh(); smr.BakeMesh(baked, true);
            var v = baked.vertices; var bw = smr.sharedMesh.boneWeights; var bones = smr.bones;
            var l2w = Matrix4x4.TRS(smr.transform.position, smr.transform.rotation, Vector3.one);
            var hips = anim.GetBoneTransform(HumanBodyBones.Hips); var lu = anim.GetBoneTransform(HumanBodyBones.LeftUpperArm);
            var root = anim.transform; var right = root.right;
            var armBones = new HashSet<Transform>();
            foreach (var hb in new[] { HumanBodyBones.LeftUpperArm, HumanBodyBones.RightUpperArm, HumanBodyBones.LeftLowerArm, HumanBodyBones.RightLowerArm, HumanBodyBones.LeftHand, HumanBodyBones.RightHand })
            { var t = anim.GetBoneTransform(hb); if (t != null) foreach (var c in t.GetComponentsInChildren<Transform>(true)) armBones.Add(c); }
            var sx = Mathf.Abs(Vector3.Dot(lu.position - hips.position, right));
            sb.Append($"  width: joint out {sx * 100f:0.0} cm, up {(lu.position.y - hips.position.y) * 100f:0.0} cm;");
            foreach (var below in new[] { 0.10f, 0.15f, 0.20f })
            {
                var y = lu.position.y - below; var w = 0f;
                for (var i = 0; i < v.Length; i++)
                {
                    var b = bw[i];
                    var armW = (armBones.Contains(bones[b.boneIndex0]) ? b.weight0 : 0f) + (armBones.Contains(bones[b.boneIndex1]) ? b.weight1 : 0f) + (armBones.Contains(bones[b.boneIndex2]) ? b.weight2 : 0f) + (armBones.Contains(bones[b.boneIndex3]) ? b.weight3 : 0f);
                    if (armW > 0.1f) continue;
                    var wp = l2w.MultiplyPoint3x4(v[i]);
                    if (Mathf.Abs(wp.y - y) > 0.015f) continue;
                    w = Mathf.Max(w, Mathf.Abs(Vector3.Dot(wp - hips.position, right)));
                }
                sb.Append($" torso {below * 100f:0} cm under it {w * 100f:0.0} cm out ({(w - sx) * 100f:+0.0;-0.0});");
            }
            sb.AppendLine();
            Object.DestroyImmediate(baked);
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
