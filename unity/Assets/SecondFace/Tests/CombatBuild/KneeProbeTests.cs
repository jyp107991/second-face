#if UNITY_EDITOR
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using NUnit.Framework;
using SecondFace.EditorTools;
using UnityEditor;
using UnityEngine;
using UnityEngine.Animations;
using UnityEngine.Playables;

namespace SecondFace.Tests
{
    // TEMP probe (never committed): the aim's straighter knee in the take as recorded, in its configured T-pose, on its own
    // avatar and on the bodies (the clip alone, no runtime system).
    public class KneeProbeTests
    {
        private static readonly string[] Legs = { "LeftUpperLeg", "LeftLowerLeg", "LeftFoot", "RightUpperLeg", "RightLowerLeg", "RightFoot" };

        private static float Ang(Vector3 hip, Vector3 knee, Vector3 ankle) => Vector3.Angle(knee - hip, ankle - knee);

        private static string Stats(List<float> v)
        {
            if (v.Count == 0) return "none";
            var s = v.OrderBy(x => x).ToList();
            return $"min {s[0]:0.0} med {s[s.Count / 2]:0.0} p98 {s[Mathf.Clamp(Mathf.RoundToInt(0.98f * (s.Count - 1)), 0, s.Count - 1)]:0.0} max {s[^1]:0.0}";
        }

        private static string TPose(string path)
        {
            var imp = (ModelImporter)AssetImporter.GetAtPath(path);
            var hd = imp.humanDescription;
            var model = AssetDatabase.LoadAssetAtPath<GameObject>(path);
            var w = TakeStance.World(hd.skeleton, model);
            var map = hd.human.ToDictionary(h => h.humanName, h => h.boneName);
            string Knee(int o)
            {
                var hip = w[map[Legs[o]]].p; var knee = w[map[Legs[o + 1]]].p; var ankle = w[map[Legs[o + 2]]].p;
                return $"{Ang(hip, knee, ankle):0.0}";
            }
            return $"T-pose knees L {Knee(0)} R {Knee(3)} (scale {imp.fileScale} useFileScale {imp.useFileScale})";
        }

        public static List<float> AnkL = new(), AnkR = new(), HipY = new();
        private static List<(float l, float r)> OnBody(GameObject body, Animator a, AnimationClip clip, int n, bool footIk = false)
        {
            AnkL.Clear(); AnkR.Clear(); HipY.Clear();
            var g = PlayableGraph.Create("k");
            var o = AnimationPlayableOutput.Create(g, "o", a);
            var cp = AnimationClipPlayable.Create(g, clip); cp.SetApplyFootIK(footIk);
            o.SetSourcePlayable(cp);
            var out_ = new List<(float, float)>();
            Transform B(HumanBodyBones b) => a.GetBoneTransform(b);
            for (var i = 0; i <= n; i++)
            {
                cp.SetTime(clip.length * i / n); g.Evaluate();
                AnkL.Add(a.transform.InverseTransformPoint(B(HumanBodyBones.LeftFoot).position).y * 100f);
                AnkR.Add(a.transform.InverseTransformPoint(B(HumanBodyBones.RightFoot).position).y * 100f);
                HipY.Add(a.transform.InverseTransformPoint(B(HumanBodyBones.Hips).position).y * 100f);
                out_.Add((Ang(B(HumanBodyBones.LeftUpperLeg).position, B(HumanBodyBones.LeftLowerLeg).position, B(HumanBodyBones.LeftFoot).position),
                          Ang(B(HumanBodyBones.RightUpperLeg).position, B(HumanBodyBones.RightLowerLeg).position, B(HumanBodyBones.RightFoot).position)));
            }
            g.Destroy();
            return out_;
        }

        private static List<(float l, float r)> Raw(string path)
        {
            var copy = "Assets/KneeProbe_" + Path.GetFileName(path);
            AssetDatabase.DeleteAsset(copy);
            File.Copy(path, copy, true);
            AssetDatabase.ImportAsset(copy, ImportAssetOptions.ForceSynchronousImport);
            var imp = (ModelImporter)AssetImporter.GetAtPath(copy);
            imp.animationType = ModelImporterAnimationType.Generic; imp.avatarSetup = ModelImporterAvatarSetup.NoAvatar;
            imp.importAnimation = true; imp.clipAnimations = imp.defaultClipAnimations; imp.materialImportMode = ModelImporterMaterialImportMode.None;
            imp.SaveAndReimport();
            var clip = AssetDatabase.LoadAllAssetsAtPath(copy).OfType<AnimationClip>().First(c => !c.name.StartsWith("__preview__"));
            var go = (GameObject)Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(copy));
            var all = go.GetComponentsInChildren<Transform>(true).GroupBy(t => t.name).ToDictionary(g => g.Key, g => g.First());
            var n = Mathf.Max(1, Mathf.RoundToInt(clip.length * clip.frameRate));
            var res = new List<(float, float)>();
            for (var k = 0; k <= n; k++)
            {
                clip.SampleAnimation(go, clip.length * k / n);
                res.Add((Ang(all[Legs[0]].position, all[Legs[1]].position, all[Legs[2]].position), Ang(all[Legs[3]].position, all[Legs[4]].position, all[Legs[5]].position)));
            }
            Object.DestroyImmediate(go);
            AssetDatabase.DeleteAsset(copy);
            return res;
        }

        [Test]
        public void TheAimsKnees()
        {
            var sb = new StringBuilder();
            foreach (var name in new[] { "Combat/Motion/rifle_aim_b_cmu", "Combat/Motion/rifle_ready_built", "Combat/Motion/rifle_ready_f_built", "Motion/idle_m" })
            {
                var path = $"Assets/SecondFace/{name}.fbx";
                if (!File.Exists(path)) { sb.AppendLine(name + ": missing"); continue; }
                sb.AppendLine($"== {name}: {TPose(path)}");
                var raw = Raw(path);
                sb.AppendLine($"  raw (Generic, as recorded): straighter {Stats(raw.Select(x => Mathf.Min(x.l, x.r)).ToList())}; L {Stats(raw.Select(x => x.l).ToList())}; R {Stats(raw.Select(x => x.r).ToList())}");
                var clip = AssetDatabase.LoadAllAssetsAtPath(path).OfType<AnimationClip>().First(c => !c.name.StartsWith("__preview__"));
                var own = AssetDatabase.LoadAllAssetsAtPath(path).OfType<Avatar>().FirstOrDefault();
                var model = (GameObject)Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(path));
                var ma = model.GetComponent<Animator>() ?? model.AddComponent<Animator>(); ma.avatar = own; ma.enabled = true; ma.runtimeAnimatorController = null; ma.applyRootMotion = false; ma.cullingMode = AnimatorCullingMode.AlwaysAnimate; ma.Rebind();
                var o = OnBody(model, ma, clip, 90);
                sb.AppendLine($"  humanoid on its own avatar: straighter {Stats(o.Select(x => Mathf.Min(x.l, x.r)).ToList())}; L {Stats(o.Select(x => x.l).ToList())}; R {Stats(o.Select(x => x.r).ToList())}");
                sb.AppendLine($"     ankles over the root L {Stats(AnkL)} R {Stats(AnkR)}; hips {Stats(HipY)}; feetBottom {ma.leftFeetBottomHeight * 100f:0.00}; humanScale {ma.humanScale:0.0000}");
                Object.DestroyImmediate(model);
                foreach (var id in new[] { "Male_Adult_08", "Female_Adult_01" })
                {
                    var body = (GameObject)Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>($"Assets/SecondFace/People/Rocketbox/{id}/{id}.prefab"));
                    var a = body.GetComponentInChildren<Animator>(); a.enabled = true; a.runtimeAnimatorController = null; a.applyRootMotion = false; a.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                    foreach (var mb in body.GetComponentsInChildren<MonoBehaviour>()) mb.enabled = false;
                    a.Rebind();
                    sb.AppendLine($"  ({id}: avatar {(a.avatar != null ? a.avatar.name : "none")} human {a.isHuman} valid {(a.avatar != null && a.avatar.isValid)})");
                    foreach (var ik in new[] { false, true })
                    {
                        var b = OnBody(body, a, clip, 90, ik);
                        sb.AppendLine($"  on {id} footIK {ik}: straighter {Stats(b.Select(x => Mathf.Min(x.l, x.r)).ToList())}; L {Stats(b.Select(x => x.l).ToList())}; R {Stats(b.Select(x => x.r).ToList())}");
                        sb.AppendLine($"     ankles over the root L {Stats(AnkL)} R {Stats(AnkR)}; hips {Stats(HipY)}; feetBottom {a.leftFeetBottomHeight * 100f:0.00}; humanScale {a.humanScale:0.0000}");
                    }
                    Object.DestroyImmediate(body);
                }
            }
            foreach (var id in new[] { "Male_Adult_08", "Female_Adult_01" })
                sb.AppendLine($"body {id}: {TPose($"Assets/SecondFace/People/Rocketbox/{id}/{id}.fbx")}");
            File.WriteAllText(Path.Combine(Application.dataPath, "..", "test-results", "knee_probe.txt"), sb.ToString());
        }
    }
}
#endif
