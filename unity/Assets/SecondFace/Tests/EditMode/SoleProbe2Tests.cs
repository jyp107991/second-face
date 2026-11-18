#if UNITY_EDITOR
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;
using UnityEngine.Animations;
using UnityEngine.Playables;

namespace SecondFace.Tests
{
    /// <summary>Temporary diagnostic (the gate agent's, not committed): what Unity reads for a clip's ground and an avatar's
    /// feet-bottom height. (A) the clip's Y reference: the clip as imported (Feet, at start), Original, Center of Mass, and
    /// Feet with the loop started at the left foot's mid-stance; (B) the feet-bottom estimate rebuilt by AvatarBuilder from
    /// the clip's own file: as is, the T-pose's toes moved, a proxy sole mesh under the feet; the bodies with and without
    /// their meshes.</summary>
    public class SoleProbe2Tests
    {
        private static AnimationClip Variant(AnimationClip src, string mode, float shiftShare)
        {
            var c = new AnimationClip { name = src.name + "_" + mode, frameRate = src.frameRate };
            foreach (var b in AnimationUtility.GetCurveBindings(src))
            {
                var curve = AnimationUtility.GetEditorCurve(src, b);
                if (shiftShare > 0f)
                {
                    var len = src.length; var t0 = len * shiftShare;
                    var keys = new List<Keyframe>();
                    var step = 1f / 60f;
                    for (var t = 0f; t <= len + 1e-4f; t += step)
                    {
                        var st = t0 + t; if (st > len) st -= len;
                        keys.Add(new Keyframe(t, curve.Evaluate(st)));
                    }
                    curve = new AnimationCurve(keys.ToArray());
                }
                AnimationUtility.SetEditorCurve(c, b, curve);
            }
            var s = AnimationUtility.GetAnimationClipSettings(src);
            if (mode == "original") { s.heightFromFeet = false; s.keepOriginalPositionY = true; }
            else if (mode == "com") { s.heightFromFeet = false; s.keepOriginalPositionY = false; }
            AnimationUtility.SetAnimationClipSettings(c, s);
            return c;
        }

        private static float LeftStanceShare(GameObject go, Animator a, AnimationClip clip)
        {
            var g = UnityEngine.Playables.PlayableGraph.Create("s");
            var o = UnityEngine.Animations.AnimationPlayableOutput.Create(g, "o", a);
            var cp = UnityEngine.Animations.AnimationClipPlayable.Create(g, clip); cp.SetApplyFootIK(false);
            o.SetSourcePlayable(cp);
            var fl = a.GetBoneTransform(HumanBodyBones.LeftFoot);
            var best = float.MaxValue; var at = 0f;
            for (var i = 0; i < 60; i++)
            {
                cp.SetTime(clip.length * i / 60f); g.Evaluate();
                var y = a.transform.InverseTransformPoint(fl.position).y;
                if (y < best) { best = y; at = i / 60f; }
            }
            g.Destroy();
            return at;
        }

        [Test]
        public void TheClipsGroundReference()
        {
            var sb = new StringBuilder();
            foreach (var clip in new[] { "jog", "jog_f", "sneak", "walk", "run_c", "idle_m" })
            {
                var path = "Assets/SecondFace/Motion/" + clip + ".fbx";
                var avatar = AssetDatabase.LoadAllAssetsAtPath(path).OfType<Avatar>().First();
                var c0 = SoleProbeTests.Clip(path);
                var model = AssetDatabase.LoadAssetAtPath<GameObject>(path);
                var go0 = Object.Instantiate(model); var a0 = SoleProbeTests.Prep(go0, avatar);
                var share = LeftStanceShare(go0, a0, c0);
                Object.DestroyImmediate(go0);
                var variants = new List<(string, AnimationClip)> { ("asis", c0), ("copy", Variant(c0, "feet", 0f)), ("original", Variant(c0, "original", 0f)), ("com", Variant(c0, "com", 0f)), ($"feet-start-at-L-stance({share:0.00})", Variant(c0, "feet", share)) };
                foreach (var (label, c) in variants)
                {
                    var go = Object.Instantiate(model); var a = SoleProbeTests.Prep(go, avatar);
                    sb.AppendLine($"CLIP {clip} {label} own: {SoleProbeTests.Bare(go, a, c, false)}");
                    Object.DestroyImmediate(go);
                    foreach (var id in new[] { "Sports_Male_04", "Medical_Female_01" })
                    {
                        var body = AssetDatabase.LoadAssetAtPath<GameObject>($"Assets/SecondFace/People/Rocketbox/{id}/{id}.prefab");
                        var gb = Object.Instantiate(body); var ab = SoleProbeTests.Prep(gb, null);
                        sb.AppendLine($"CLIP {clip} {label} {id}: {SoleProbeTests.Bare(gb, ab, c, false)}");
                        Object.DestroyImmediate(gb);
                    }
                }
            }
            File.WriteAllText(Path.Combine(Application.dataPath, "..", "test-results", "sole_probe2a.txt"), sb.ToString());
        }

        private static string Fbh(GameObject go, HumanDescription hd, string label)
        {
            var av = AvatarBuilder.BuildHumanAvatar(go, hd);
            var a = go.GetComponent<Animator>() ?? go.AddComponent<Animator>();
            a.avatar = av; a.Rebind();
            return $"{label}: valid {av.isValid} humanScale {a.humanScale:0.0000} feetBottom L {a.leftFeetBottomHeight * 100f:0.00} R {a.rightFeetBottomHeight * 100f:0.00}";
        }

        /// <summary>A small skinned mesh under each foot: a 12 x 6 cm plate `depth` below the ankle (world, the model as
        /// instantiated in its default pose), bound to the foot bone.</summary>
        private static GameObject ProxySole(GameObject root, Animator a, float depth)
        {
            var feet = new[] { a.GetBoneTransform(HumanBodyBones.LeftFoot), a.GetBoneTransform(HumanBodyBones.RightFoot) };
            var toes = new[] { a.GetBoneTransform(HumanBodyBones.LeftToes), a.GetBoneTransform(HumanBodyBones.RightToes) };
            var holder = new GameObject("sole_proxy"); holder.transform.SetParent(root.transform, false);
            var smr = holder.AddComponent<SkinnedMeshRenderer>();
            var verts = new List<Vector3>(); var tris = new List<int>(); var bw = new List<BoneWeight>();
            for (var s = 0; s < 2; s++)
            {
                var an = feet[s].position; var fw = toes[s] != null ? toes[s].position - an : root.transform.forward * 0.12f; fw.y = 0f; fw.Normalize();
                var side = Vector3.Cross(Vector3.up, fw);
                var c = new Vector3(an.x, an.y - depth, an.z);
                var b0 = verts.Count;
                foreach (var (f, l) in new[] { (-0.05f, -0.03f), (0.1f, -0.03f), (0.1f, 0.03f), (-0.05f, 0.03f) })
                {
                    verts.Add(holder.transform.InverseTransformPoint(c + fw * f + side * l));
                    bw.Add(new BoneWeight { boneIndex0 = s, weight0 = 1f });
                }
                tris.AddRange(new[] { b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3 });
            }
            var m = new Mesh(); m.SetVertices(verts); m.SetTriangles(tris, 0); m.boneWeights = bw.ToArray();
            m.bindposes = new[] { feet[0].worldToLocalMatrix * holder.transform.localToWorldMatrix, feet[1].worldToLocalMatrix * holder.transform.localToWorldMatrix };
            smr.sharedMesh = m; smr.bones = feet; smr.rootBone = feet[0];
            return holder;
        }

        [Test]
        public void WhatTheFeetBottomIsReadFrom()
        {
            var sb = new StringBuilder();
            foreach (var clip in new[] { "jog", "idle_m", "sneak" })
            {
                var path = "Assets/SecondFace/Motion/" + clip + ".fbx";
                var imp = (ModelImporter)AssetImporter.GetAtPath(path);
                var hd = imp.humanDescription;
                var model = AssetDatabase.LoadAssetAtPath<GameObject>(path);
                var imported = AssetDatabase.LoadAllAssetsAtPath(path).OfType<Avatar>().First();
                var g = Object.Instantiate(model); g.name = model.name;
                var a = g.GetComponent<Animator>(); a.avatar = imported; a.Rebind();
                sb.AppendLine($"FBH {clip} imported avatar: humanScale {a.humanScale:0.0000} L {a.leftFeetBottomHeight * 100f:0.00} R {a.rightFeetBottomHeight * 100f:0.00}");
                // the default pose of the instance, world (the model's root turned 90° about X by the FBX axes)
                var fl = a.GetBoneTransform(HumanBodyBones.LeftFoot); var tl = a.GetBoneTransform(HumanBodyBones.LeftToes); var fr = a.GetBoneTransform(HumanBodyBones.RightFoot); var tr = a.GetBoneTransform(HumanBodyBones.RightToes);
                sb.AppendLine($"FBH {clip} default pose (world, cm): ankle L {fl.position.y * 100f:0.0} R {fr.position.y * 100f:0.0} toes L {tl.position.y * 100f:0.0} R {tr.position.y * 100f:0.0}; ankle-toes L {(fl.position.y - tl.position.y) * 100f:0.00} R {(fr.position.y - tr.position.y) * 100f:0.00}; |ankle-toes| L {(fl.position - tl.position).magnitude * 100f:0.00} R {(fr.position - tr.position).magnitude * 100f:0.00}; root y {g.transform.position.y * 100f:0.0} rot {g.transform.rotation.eulerAngles}");
                sb.AppendLine("FBH " + clip + " " + Fbh(g, hd, "rebuilt as is"));
                // the skeleton's own T-pose (the configuration): ankle and toes in the root's frame by forward kinematics
                var skel = hd.skeleton.ToDictionary(s => s.name, s => s);
                sb.AppendLine($"FBH {clip} configuration toes local L {skel["LeftToes"].position * 100f} R {skel["RightToes"].position * 100f}, foot local rot L {skel["LeftFoot"].rotation.eulerAngles}");
                // the toes moved: their local position scaled 1.5 (further from the ankle along the foot)
                var hd2 = hd; hd2.skeleton = hd.skeleton.Select(s => { if (s.name == "LeftToes" || s.name == "RightToes") s.position *= 1.5f; return s; }).ToArray();
                sb.AppendLine("FBH " + clip + " " + Fbh(g, hd2, "configuration toes x1.5"));
                foreach (var depth in new[] { 0.06f, 0.09f, 0.12f })
                {
                    var p = ProxySole(g, a, depth);
                    sb.AppendLine("FBH " + clip + " " + Fbh(g, hd, $"proxy sole {depth * 100f:0} cm under the ankle (default pose)"));
                    Object.DestroyImmediate(p);
                }
                Object.DestroyImmediate(g);
            }
            foreach (var id in new[] { "Sports_Male_04", "Medical_Female_01" })
            {
                var path = $"Assets/SecondFace/People/Rocketbox/{id}/{id}.fbx";
                var imp = (ModelImporter)AssetImporter.GetAtPath(path);
                var hd = imp.humanDescription;
                var model = AssetDatabase.LoadAssetAtPath<GameObject>(path);
                var g = Object.Instantiate(model); g.name = model.name;
                var a = g.GetComponent<Animator>(); a.Rebind();
                var fl = a.GetBoneTransform(HumanBodyBones.LeftFoot); var tl = a.GetBoneTransform(HumanBodyBones.LeftToes);
                var low = float.MaxValue; var lowFoot = float.MaxValue;
                foreach (var sk in g.GetComponentsInChildren<SkinnedMeshRenderer>())
                {
                    var bm = new Mesh(); sk.BakeMesh(bm, true);
                    var bw = sk.sharedMesh.boneWeights; var v = bm.vertices;
                    for (var i = 0; i < v.Length; i++)
                    {
                        var y = sk.transform.TransformPoint(v[i]).y; low = Mathf.Min(low, y);
                        var w = bw[i]; var bi = w.boneIndex0;
                        if (bi < sk.bones.Length && (sk.bones[bi] == fl || sk.bones[bi] == tl) && w.weight0 > 0.5f) lowFoot = Mathf.Min(lowFoot, y);
                    }
                    Object.DestroyImmediate(bm);
                }
                sb.AppendLine($"FBH {id} imported avatar: humanScale {a.humanScale:0.0000} L {a.leftFeetBottomHeight * 100f:0.00} R {a.rightFeetBottomHeight * 100f:0.00}; default pose ankle {fl.position.y * 100f:0.0} toes {tl.position.y * 100f:0.0} lowest skin {low * 100f:0.0} lowest left-foot skin {lowFoot * 100f:0.0}; root {g.transform.position.y * 100f:0.0}");
                sb.AppendLine("FBH " + id + " " + Fbh(g, hd, "rebuilt as is"));
                foreach (var sk in g.GetComponentsInChildren<SkinnedMeshRenderer>()) Object.DestroyImmediate(sk);
                sb.AppendLine("FBH " + id + " " + Fbh(g, hd, "rebuilt without its meshes"));
                Object.DestroyImmediate(g);
            }
            File.WriteAllText(Path.Combine(Application.dataPath, "..", "test-results", "sole_probe2b.txt"), sb.ToString());
        }
    }
}
#endif
