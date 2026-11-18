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
    /// <summary>Temporary diagnostic (the gate agent's, not committed): candidate fixes for the bare retarget's stance soles.
    /// Each clip played on the bodies by the Animator alone, with (a) its import's Y reference (Feet, at start) or the
    /// capture's own (Original), (b) with and without Unity's Foot IK, (c) on the body's avatar as imported or with its
    /// configured T-pose stood on its root (the bind's ankle height: Unity reads the feet-bottom height as the T-pose ankle's
    /// height over the root).</summary>
    public class SoleProbe3Tests
    {
        private static readonly string[] Clips = { "jog", "jog_b", "jog_f", "run", "run_c", "walk", "walk_b", "walk_slow", "walk_d", "walk_f_b", "sneak", "idle_m", "idle_m_b", "idle_f", "idle_f_c" };
        private static readonly string[] Bodies = { "Sports_Male_04", "Medical_Female_01", "Construction_Male_02" };

        private static float Q(IList<float> v, float q) { if (v.Count == 0) return float.NaN; var s = v.OrderBy(x => x).ToList(); return s[Mathf.Clamp((int)(s.Count * q), 0, s.Count - 1)]; }

        /// <summary>The body's configuration with its T-pose lowered so the T-pose ankle stands at the bind's ankle height
        /// over the root (the bind stands its soles on the root).</summary>
        internal static Avatar Grounded(string id, out string note)
        {
            var path = $"Assets/SecondFace/People/Rocketbox/{id}/{id}.fbx";
            var imp = (ModelImporter)AssetImporter.GetAtPath(path);
            var hd = imp.humanDescription;
            var model = AssetDatabase.LoadAssetAtPath<GameObject>(path);
            var g = Object.Instantiate(model); g.name = model.name;
            var a = g.GetComponent<Animator>(); a.Rebind();
            var bindAnkle = g.transform.InverseTransformPoint(a.GetBoneTransform(HumanBodyBones.LeftFoot).position).y;
            var fbh = a.leftFeetBottomHeight;
            var hipsName = a.GetBoneTransform(HumanBodyBones.Hips).name;
            // the hips' parent's rotation in the configuration (chained from the root)
            var byName = hd.skeleton.Skip(1).ToDictionary(s => s.name, s => s);
            var parents = new List<string>();
            for (var t = a.GetBoneTransform(HumanBodyBones.Hips).parent; t != null && t != g.transform; t = t.parent) parents.Insert(0, t.name);
            var rot = hd.skeleton[0].rotation;
            foreach (var p in parents) if (byName.TryGetValue(p, out var b)) rot *= b.rotation;
            var d = fbh - bindAnkle;
            var sk = hd.skeleton.Select(s => { if (s.name == hipsName) s.position += Quaternion.Inverse(rot) * new Vector3(0f, -d, 0f); return s; }).ToArray();
            hd.skeleton = sk;
            var av = AvatarBuilder.BuildHumanAvatar(g, hd);
            a.avatar = av; a.Rebind();
            note = $"{id}: T-pose ankle {fbh * 100f:0.00} over the bind's {bindAnkle * 100f:0.00} cm; grounded avatar valid {av.isValid}, humanScale {a.humanScale:0.0000}, feetBottom {a.leftFeetBottomHeight * 100f:0.00}/{a.rightFeetBottomHeight * 100f:0.00}";
            Object.DestroyImmediate(g);
            return av;
        }

        /// <summary>Each foot's stance sole on the body (cm): frames where the foot's own lowest skin point is within 4 cm of
        /// its lowest and its vertical speed under 0.2 m/s; p2 and p50 per foot, and the lower foot's lowest point overall.</summary>
        internal static string StanceOf(GameObject go, Animator a, AnimationClip clip, bool footIk) => Stance(go, a, clip, footIk);
        private static string Stance(GameObject go, Animator a, AnimationClip clip, bool footIk)
        {
            var t = a.transform;
            var fl = a.GetBoneTransform(HumanBodyBones.LeftFoot); var fr = a.GetBoneTransform(HumanBodyBones.RightFoot);
            var tl = a.GetBoneTransform(HumanBodyBones.LeftToes); var tr = a.GetBoneTransform(HumanBodyBones.RightToes);
            var sets = new List<(SkinnedMeshRenderer sk, int[] l, int[] r)>();
            foreach (var sk in go.GetComponentsInChildren<SkinnedMeshRenderer>())
            {
                var m = sk.sharedMesh; if (m == null) continue;
                var bones = sk.bones; var bw = m.boneWeights; var L = new List<int>(); var R = new List<int>();
                for (var i = 0; i < bw.Length; i++)
                {
                    var w = bw[i];
                    bool Is(int bi, Transform x, Transform y) => bi >= 0 && bi < bones.Length && (bones[bi] == x || bones[bi] == y);
                    float W(Transform x, Transform y) => (Is(w.boneIndex0, x, y) ? w.weight0 : 0f) + (Is(w.boneIndex1, x, y) ? w.weight1 : 0f) + (Is(w.boneIndex2, x, y) ? w.weight2 : 0f) + (Is(w.boneIndex3, x, y) ? w.weight3 : 0f);
                    if (W(fl, tl) > 0.5f) L.Add(i); if (W(fr, tr) > 0.5f) R.Add(i);
                }
                sets.Add((sk, L.ToArray(), R.ToArray()));
            }
            var baked = new Mesh();
            var g = PlayableGraph.Create("st");
            var o = AnimationPlayableOutput.Create(g, "o", a);
            var cp = AnimationClipPlayable.Create(g, clip); cp.SetApplyFootIK(footIk);
            o.SetSourcePlayable(cp);
            var n = Mathf.Max(2, Mathf.RoundToInt(clip.length * 60f));
            var hl = new List<float>(); var hr = new List<float>();
            for (var i = 0; i <= n; i++)
            {
                cp.SetTime(clip.length * (i % n) / n); g.Evaluate();
                float ml = float.MaxValue, mr = float.MaxValue;
                foreach (var (sk, L, R) in sets)
                {
                    sk.BakeMesh(baked, true); var v = baked.vertices; var st = sk.transform;
                    foreach (var k in L) ml = Mathf.Min(ml, t.InverseTransformPoint(st.TransformPoint(v[k])).y);
                    foreach (var k in R) mr = Mathf.Min(mr, t.InverseTransformPoint(st.TransformPoint(v[k])).y);
                }
                hl.Add(ml * 100f); hr.Add(mr * 100f);
            }
            g.Destroy(); Object.DestroyImmediate(baked);
            // (vertical speed: |dh| cm per 1/60 s under 0.2 m/s = 0.333 cm a frame)
            List<float> S(List<float> h) { var min = h.Min(); var r = new List<float>(); for (var i = 1; i < h.Count; i++) if (h[i] < min + 4f && Mathf.Abs(h[i] - h[i - 1]) < 0.333f) r.Add(h[i]); return r; }
            var sl = S(hl); var sr = S(hr);
            var low = hl.Zip(hr, Mathf.Min).ToList();
            return $"stance L p2 {Q(sl, 0.02f):0.0} p50 {Q(sl, 0.5f):0.0} (n {sl.Count}) R p2 {Q(sr, 0.02f):0.0} p50 {Q(sr, 0.5f):0.0} (n {sr.Count}); lower foot p2 {Q(low, 0.02f):0.0} p10 {Q(low, 0.1f):0.0} p50 {Q(low, 0.5f):0.0}";
        }

        private static AnimationClip Original(AnimationClip src)
        {
            var c = new AnimationClip { name = src.name + "_original", frameRate = src.frameRate };
            foreach (var b in AnimationUtility.GetCurveBindings(src)) AnimationUtility.SetEditorCurve(c, b, AnimationUtility.GetEditorCurve(src, b));
            var s = AnimationUtility.GetAnimationClipSettings(src);
            s.heightFromFeet = false; s.keepOriginalPositionY = true;
            AnimationUtility.SetAnimationClipSettings(c, s);
            return c;
        }

        [Test]
        public void CandidateFixesOnTheBareRetarget()
        {
            var sb = new StringBuilder();
            var grounded = new Dictionary<string, Avatar>();
            foreach (var id in Bodies) { grounded[id] = Grounded(id, out var note); sb.AppendLine("AVATAR " + note); }
            foreach (var clip in Clips)
            {
                var c0 = SoleProbeTests.Clip("Assets/SecondFace/Motion/" + clip + ".fbx");
                var c1 = Original(c0);
                foreach (var id in Bodies)
                {
                    var prefab = AssetDatabase.LoadAssetAtPath<GameObject>($"Assets/SecondFace/People/Rocketbox/{id}/{id}.prefab");
                    foreach (var (yLabel, c) in new[] { ("feet", c0), ("original", c1) })
                        foreach (var ik in new[] { false, true })
                            foreach (var gnd in new[] { false, true })
                            {
                                var go = Object.Instantiate(prefab);
                                var a = SoleProbeTests.Prep(go, gnd ? grounded[id] : null);
                                sb.AppendLine($"{clip,-10} {id,-20} {yLabel,-8} {(ik ? "footIK" : "noIK  ")} {(gnd ? "grounded" : "asis    ")}: {Stance(go, a, c, ik)}");
                                Object.DestroyImmediate(go);
                            }
                }
            }
            File.WriteAllText(Path.Combine(Application.dataPath, "..", "test-results", "sole_probe3.txt"), sb.ToString());
        }
    }
}
#endif
