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
    /// <summary>Temporary diagnostic (the gate agent's, not committed): where Unity puts a clip's ground. For each clip's
    /// source avatar (no mesh) and some bodies: humanScale, the feet-bottom heights Unity estimated, the bind pose's joints in
    /// the Animator's own frame; the clip's own normalized curves (RootT.y, the feet goals); the bare retarget (Animator only)
    /// on its own avatar and on the bodies, every height in the Animator's frame (its root is the clip's ground).</summary>
    public class SoleProbeTests
    {
        private static readonly string[] Clips = { "jog", "jog_b", "jog_f", "sneak", "run", "run_c", "walk", "walk_b", "walk_slow", "walk_d", "walk_f_b", "idle_m", "idle_m_b", "idle_f", "idle_f_c" };
        private static readonly string[] Bodies = { "Sports_Male_04", "Medical_Female_01", "Construction_Male_02", "Business_Female_01", "cap_Military_Male_03n", "Female_Adult_07" };

        private static float Q(IList<float> v, float q) { if (v.Count == 0) return float.NaN; var s = v.OrderBy(x => x).ToList(); return s[Mathf.Clamp((int)(s.Count * q), 0, s.Count - 1)]; }
        private static string P(IList<float> v) => $"p2 {Q(v, 0.02f):0.0} p10 {Q(v, 0.10f):0.0} p50 {Q(v, 0.5f):0.0} p98 {Q(v, 0.98f):0.0}";
        internal static AnimationClip Clip(string path) => AssetDatabase.LoadAllAssetsAtPath(path).OfType<AnimationClip>().First(c => !c.name.StartsWith("__preview__"));

        internal static Animator Prep(GameObject go, Avatar avatar)
        {
            var a = go.GetComponentInChildren<Animator>() ?? go.AddComponent<Animator>();
            if (avatar != null) a.avatar = avatar;
            a.enabled = true; a.runtimeAnimatorController = null; a.applyRootMotion = false; a.cullingMode = AnimatorCullingMode.AlwaysAnimate;
            foreach (var mb in go.GetComponentsInChildren<MonoBehaviour>()) mb.enabled = false;
            a.Rebind();
            return a;
        }

        private static string AvatarLine(Animator a)
        {
            var t = a.transform;
            float Y(HumanBodyBones b) { var x = a.GetBoneTransform(b); return x == null ? float.NaN : t.InverseTransformPoint(x.position).y * 100f; }
            return $"humanScale {a.humanScale:0.0000} feetBottom L {a.leftFeetBottomHeight * 100f:0.00} R {a.rightFeetBottomHeight * 100f:0.00} cm; bind (Animator frame, cm): hips {Y(HumanBodyBones.Hips):0.0} upperLeg {Y(HumanBodyBones.LeftUpperLeg):0.0}/{Y(HumanBodyBones.RightUpperLeg):0.0} ankle {Y(HumanBodyBones.LeftFoot):0.0}/{Y(HumanBodyBones.RightFoot):0.0} toes {Y(HumanBodyBones.LeftToes):0.0}/{Y(HumanBodyBones.RightToes):0.0}; root rot {t.rotation.eulerAngles}";
        }

        private static string Curves(AnimationClip clip)
        {
            var sb = new StringBuilder();
            foreach (var name in new[] { "RootT.y", "LeftFootT.y", "RightFootT.y" })
            {
                var b = AnimationUtility.GetCurveBindings(clip).FirstOrDefault(x => x.propertyName == name);
                if (b.propertyName != name) { sb.Append($" {name} none;"); continue; }
                var c = AnimationUtility.GetEditorCurve(clip, b);
                var v = c.keys.Select(k => k.value).ToList();
                sb.Append($" {name} start {c.Evaluate(0f):0.0000} min {v.Min():0.0000} max {v.Max():0.0000} low30-med {Q(v.Where(x => x <= Q(v, 0.3f)).ToList(), 0.5f):0.0000};");
            }
            return sb.ToString();
        }

        /// <summary>The bare retarget, sampled at 60 Hz: heights in the Animator's frame (cm): each ankle, each toe joint, the
        /// skin's lowest point (bodies), each foot's own lowest skin point (the vertices the foot or toes bone moves most).</summary>
        internal static string Bare(GameObject go, Animator a, AnimationClip clip, bool footIk)
        {
            var t = a.transform;
            var skins = go.GetComponentsInChildren<SkinnedMeshRenderer>();
            var fl = a.GetBoneTransform(HumanBodyBones.LeftFoot); var fr = a.GetBoneTransform(HumanBodyBones.RightFoot);
            var tl = a.GetBoneTransform(HumanBodyBones.LeftToes); var tr = a.GetBoneTransform(HumanBodyBones.RightToes);
            var hips = a.GetBoneTransform(HumanBodyBones.Hips);
            // which vertices belong to each foot (weight on foot/toes > 0.5), per skin
            var footSet = new List<(SkinnedMeshRenderer sk, int[] left, int[] right)>();
            foreach (var sk in skins)
            {
                var m = sk.sharedMesh; if (m == null) continue;
                var bones = sk.bones;
                bool IsL(int i) => i >= 0 && i < bones.Length && (bones[i] == fl || bones[i] == tl);
                bool IsR(int i) => i >= 0 && i < bones.Length && (bones[i] == fr || bones[i] == tr);
                var bw = m.boneWeights; var L = new List<int>(); var R = new List<int>();
                for (var i = 0; i < bw.Length; i++)
                {
                    var w = bw[i]; float wl = 0, wr = 0;
                    if (IsL(w.boneIndex0)) wl += w.weight0; if (IsL(w.boneIndex1)) wl += w.weight1; if (IsL(w.boneIndex2)) wl += w.weight2; if (IsL(w.boneIndex3)) wl += w.weight3;
                    if (IsR(w.boneIndex0)) wr += w.weight0; if (IsR(w.boneIndex1)) wr += w.weight1; if (IsR(w.boneIndex2)) wr += w.weight2; if (IsR(w.boneIndex3)) wr += w.weight3;
                    if (wl > 0.5f) L.Add(i); if (wr > 0.5f) R.Add(i);
                }
                footSet.Add((sk, L.ToArray(), R.ToArray()));
            }
            var baked = new Mesh();
            (float all, float l, float r) Lowest()
            {
                float m = float.MaxValue, ml = float.MaxValue, mr = float.MaxValue;
                foreach (var (sk, L, R) in footSet)
                {
                    sk.BakeMesh(baked, true);
                    var v = baked.vertices; var st = sk.transform;
                    for (var i = 0; i < v.Length; i++) m = Mathf.Min(m, t.InverseTransformPoint(st.TransformPoint(v[i])).y);
                    foreach (var i in L) ml = Mathf.Min(ml, t.InverseTransformPoint(st.TransformPoint(v[i])).y);
                    foreach (var i in R) mr = Mathf.Min(mr, t.InverseTransformPoint(st.TransformPoint(v[i])).y);
                }
                return (m * 100f, ml * 100f, mr * 100f);
            }
            var bind = footSet.Count > 0 ? Lowest() : (float.NaN, float.NaN, float.NaN);
            var g = PlayableGraph.Create("sole");
            var o = AnimationPlayableOutput.Create(g, "o", a);
            var cp = AnimationClipPlayable.Create(g, clip); cp.SetApplyFootIK(footIk);
            o.SetSourcePlayable(cp);
            var n = Mathf.Max(2, Mathf.RoundToInt(clip.length * 60f));
            var ankL = new List<float>(); var ankR = new List<float>(); var toeL = new List<float>(); var toeR = new List<float>(); var hip = new List<float>();
            var low = new List<float>(); var lowL = new List<float>(); var lowR = new List<float>();
            // stance: a foot whose ankle is in its own lowest 30 % of heights; the sole's lowest point there
            var first = "";
            for (var i = 0; i < n; i++)
            {
                cp.SetTime(clip.length * i / n); g.Evaluate();
                float Y(Transform x) => x == null ? float.NaN : t.InverseTransformPoint(x.position).y * 100f;
                ankL.Add(Y(fl)); ankR.Add(Y(fr)); toeL.Add(Y(tl)); toeR.Add(Y(tr)); hip.Add(Y(hips));
                if (footSet.Count > 0) { var (m, ml, mr) = Lowest(); low.Add(m); lowL.Add(ml); lowR.Add(mr); }
                if (i == 0) first = $"first frame: ankle {ankL[0]:0.0}/{ankR[0]:0.0} toes {toeL[0]:0.0}/{toeR[0]:0.0} hips {hip[0]:0.0}" + (low.Count > 0 ? $" sole {lowL[0]:0.0}/{lowR[0]:0.0}" : "");
            }
            g.Destroy(); Object.DestroyImmediate(baked);
            List<float> Stance(List<float> ank, List<float> val) { var c = Q(ank, 0.3f); return val.Where((x, i) => ank[i] <= c).ToList(); }
            var s = $"{first}; ankle L {P(ankL)} R {P(ankR)}; stance ankle L {Q(Stance(ankL, ankL), 0.5f):0.0} R {Q(Stance(ankR, ankR), 0.5f):0.0}; stance toes L {Q(Stance(ankL, toeL), 0.5f):0.0} R {Q(Stance(ankR, toeR), 0.5f):0.0}; hips {P(hip)}";
            if (low.Count > 0)
                s += $"; skin lowest {P(low)}, bind {bind.Item1:0.0}; stance sole L {Q(Stance(ankL, lowL), 0.5f):0.0} (p10 {Q(Stance(ankL, lowL), 0.1f):0.0}) R {Q(Stance(ankR, lowR), 0.5f):0.0} (p10 {Q(Stance(ankR, lowR), 0.1f):0.0}); bind sole L {bind.Item2:0.0} R {bind.Item3:0.0}";
            return s;
        }

        [Test]
        public void WhereUnityPutsTheGround()
        {
            var sb = new StringBuilder();
            foreach (var clip in Clips)
            {
                var path = "Assets/SecondFace/Motion/" + clip + ".fbx";
                var avatar = AssetDatabase.LoadAllAssetsAtPath(path).OfType<Avatar>().First();
                var c = Clip(path);
                var go = (GameObject)Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(path));
                var a = Prep(go, avatar);
                sb.AppendLine($"SRC {clip}: {AvatarLine(a)}");
                sb.AppendLine($"SRC {clip} curves:{Curves(c)} heightFromFeet {AnimationUtility.GetAnimationClipSettings(c).heightFromFeet} level {AnimationUtility.GetAnimationClipSettings(c).level:0.0000} lockY {AnimationUtility.GetAnimationClipSettings(c).loopBlendPositionY}");
                sb.AppendLine($"SRC {clip} bare on own avatar: {Bare(go, a, c, false)}");
                Object.DestroyImmediate(go);
            }
            foreach (var id in Bodies)
            {
                var prefab = AssetDatabase.LoadAssetAtPath<GameObject>($"Assets/SecondFace/People/Rocketbox/{id}/{id}.prefab");
                if (prefab == null) { sb.AppendLine($"BODY {id}: no prefab"); continue; }
                var go0 = (GameObject)Object.Instantiate(prefab);
                var a0 = Prep(go0, null);
                sb.AppendLine($"BODY {id}: {AvatarLine(a0)}");
                Object.DestroyImmediate(go0);
                foreach (var clip in new[] { "jog", "jog_b", "jog_f", "sneak", "run", "walk", "walk_f_b", "idle_m", "idle_f" })
                {
                    var c = Clip("Assets/SecondFace/Motion/" + clip + ".fbx");
                    foreach (var ik in new[] { false, true })
                    {
                        var go = (GameObject)Object.Instantiate(prefab);
                        var a = Prep(go, null);
                        sb.AppendLine($"BODY {id} {clip}{(ik ? " footIK" : "")}: {Bare(go, a, c, ik)}");
                        Object.DestroyImmediate(go);
                    }
                }
            }
            File.WriteAllText(Path.Combine(Application.dataPath, "..", "test-results", "sole_probe.txt"), sb.ToString());
            Debug.Log("SoleProbe\n" + sb);
        }
    }
}
#endif
