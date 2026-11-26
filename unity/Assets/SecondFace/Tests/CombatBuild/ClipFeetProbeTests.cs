#if UNITY_EDITOR
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using NUnit.Framework;
using SecondFace.Core.Combat;
using UnityEditor;
using UnityEngine;
using UnityEngine.Animations;
using UnityEngine.Playables;

namespace SecondFace.Tests
{
    // TEMP probe (never committed): every fight state's clip, bare (a playable, no runtime system, no Foot IK), on its own
    // avatar and on two bodies: each foot's sole over the root's ground (the ankle's height less the avatar's feet-bottom
    // height), the stance's width, the knees, over the part the state plays (From..Cut).
    public class ClipFeetProbeTests
    {
        private static float Ang(Vector3 hip, Vector3 knee, Vector3 ankle) => Vector3.Angle(knee - hip, ankle - knee);

        private static string P(List<float> v, float q)
        {
            if (v.Count == 0) return "";
            var s = v.OrderBy(x => x).ToList();
            return s[Mathf.Clamp(Mathf.RoundToInt(q * (s.Count - 1)), 0, s.Count - 1)].ToString("0.0", System.Globalization.CultureInfo.InvariantCulture);
        }

        private static string Measure(GameObject go, Animator a, AnimationClip clip, float from, float cut)
        {
            var g = PlayableGraph.Create("feet");
            var o = AnimationPlayableOutput.Create(g, "o", a);
            var cp = AnimationClipPlayable.Create(g, clip); cp.SetApplyFootIK(false);
            o.SetSourcePlayable(cp);
            Transform B(HumanBodyBones b) => a.GetBoneTransform(b);
            var lo = new List<float>(); var hi = new List<float>(); var wid = new List<float>(); var kmin = new List<float>(); var kmax = new List<float>();
            var sl = new List<float>(); var sr = new List<float>();
            var n = Mathf.Max(10, Mathf.RoundToInt(clip.length * (cut - from) * 30f));
            var bottom = a.leftFeetBottomHeight;
            for (var i = 0; i <= n; i++)
            {
                cp.SetTime(clip.length * (from + (cut - from) * i / n)); g.Evaluate();
                var root = a.transform;
                var al = root.InverseTransformPoint(B(HumanBodyBones.LeftFoot).position); var ar = root.InverseTransformPoint(B(HumanBodyBones.RightFoot).position);
                var l = al.y - bottom; var r = ar.y - bottom;
                sl.Add(l * 100f); sr.Add(r * 100f);
                lo.Add(Mathf.Min(l, r) * 100f); hi.Add(Mathf.Max(l, r) * 100f);
                wid.Add(Mathf.Abs(al.x - ar.x) * 100f);
                var kl = Ang(B(HumanBodyBones.LeftUpperLeg).position, B(HumanBodyBones.LeftLowerLeg).position, B(HumanBodyBones.LeftFoot).position);
                var kr = Ang(B(HumanBodyBones.RightUpperLeg).position, B(HumanBodyBones.RightLowerLeg).position, B(HumanBodyBones.RightFoot).position);
                kmin.Add(Mathf.Min(kl, kr)); kmax.Add(Mathf.Max(kl, kr));
            }
            g.Destroy();
            return $"soleL {P(sl, 0.02f)}/{P(sl, 0.5f)}/{P(sl, 0.98f)} soleR {P(sr, 0.02f)}/{P(sr, 0.5f)}/{P(sr, 0.98f)} lower {P(lo, 0.02f)}/{P(lo, 0.5f)}/{P(lo, 0.98f)} higher-lower {P(hi.Zip(lo, (x, y) => x - y).ToList(), 0.5f)}/{P(hi.Zip(lo, (x, y) => x - y).ToList(), 0.98f)} width {P(wid, 0.02f)}/{P(wid, 0.5f)}/{P(wid, 0.98f)} kStraight {P(kmin, 0.02f)}/{P(kmin, 0.5f)}/{P(kmin, 0.98f)} kBent {P(kmax, 0.5f)}/{P(kmax, 0.98f)}";
        }

        [Test]
        public void TheFightsClipsFeet()
        {
            var sb = new StringBuilder();
            var bodies = new Dictionary<bool, (GameObject Go, Animator A)>();
            foreach (var (female, id) in new[] { (true, "Business_Female_01"), (false, "Business_Male_01") })
            {
                var body = (GameObject)Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>($"Assets/SecondFace/People/Rocketbox/{id}/{id}.prefab"));
                var a = body.GetComponentInChildren<Animator>(); a.enabled = true; a.runtimeAnimatorController = null; a.applyRootMotion = false; a.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                foreach (var mb in body.GetComponentsInChildren<MonoBehaviour>()) mb.enabled = false;
                a.Rebind();
                bodies[female] = (body, a);
                sb.AppendLine($"body {id}: feetBottom {a.leftFeetBottomHeight * 100f:0.00} humanScale {a.humanScale:0.0000}");
            }
            var done = new HashSet<string>();
            foreach (var s in CombatMotion.States.Where(s => s.Layer == CombatMotion.FullLayer))
                foreach (var female in new[] { false, true })
                {
                    if (s.Only == (female ? "m" : "f")) continue;
                    var name = s.ClipFor(female);
                    if (name == null || !done.Add(name + "|" + female)) continue;
                    var path = $"{CombatMotion.Folder}/{name}.fbx";
                    var clip = AssetDatabase.LoadAllAssetsAtPath(path).OfType<AnimationClip>().FirstOrDefault(c => !c.name.StartsWith("__preview__"));
                    if (clip == null) { sb.AppendLine($"{s.Name} {name}: no clip"); continue; }
                    var from = s.From; var cut = s.Cut;
                    sb.AppendLine($"== {s.Name} [{s.Gate}] {(female ? "f" : "m")} {name} ({clip.length:0.00} s, {from:0.00}..{cut:0.00}, loop {s.Loop})");
                    var own = AssetDatabase.LoadAllAssetsAtPath(path).OfType<Avatar>().FirstOrDefault();
                    if (own != null && own.isHuman)
                    {
                        var model = (GameObject)Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(path));
                        var ma = model.GetComponent<Animator>() ?? model.AddComponent<Animator>(); ma.avatar = own; ma.enabled = true; ma.runtimeAnimatorController = null; ma.applyRootMotion = false; ma.cullingMode = AnimatorCullingMode.AlwaysAnimate; ma.Rebind();
                        sb.AppendLine($"   own   {Measure(model, ma, clip, from, cut)} (feetBottom {ma.leftFeetBottomHeight * 100f:0.00})");
                        Object.DestroyImmediate(model);
                    }
                    var (bgo, ba) = bodies[female];
                    sb.AppendLine($"   body  {Measure(bgo, ba, clip, from, cut)}");
                }
            foreach (var b in bodies.Values) Object.DestroyImmediate(b.Go);
            File.WriteAllText(Path.Combine(Application.dataPath, "..", "test-results", "clip_feet_probe.txt"), sb.ToString());
        }
    }
}
#endif
