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
    /// <summary>Temporary diagnostic (the gate agent's, not committed): a clip with Unity's retarget alone (no FootPlant,
    /// ArmClearance, Gaze, Pace), (a) on its own source avatar, (b) on a body from the T-pose configuration, (c) on the same
    /// body from the committed configuration.</summary>
    public class BareRetargetProbeTests
    {
        private struct S { public float[] L, R, Ankle; public float Standing; }

        private static S Sample(GameObject go, AnimationClip clip, Avatar avatar = null)
        {
            var a = go.GetComponentInChildren<Animator>() ?? go.AddComponent<Animator>();
            if (avatar != null) a.avatar = avatar;
            a.enabled = true; a.runtimeAnimatorController = null; a.applyRootMotion = false; a.cullingMode = AnimatorCullingMode.AlwaysAnimate;
            foreach (var mb in go.GetComponentsInChildren<MonoBehaviour>()) mb.enabled = false;
            var foot = new[] { a.GetBoneTransform(HumanBodyBones.LeftFoot), a.GetBoneTransform(HumanBodyBones.RightFoot) };
            var standing = Mathf.Min(foot[0].position.y, foot[1].position.y) - go.transform.position.y;
            var g = PlayableGraph.Create("bare");
            var o = AnimationPlayableOutput.Create(g, "o", a);
            var cp = AnimationClipPlayable.Create(g, clip); cp.SetApplyFootIK(false);
            o.SetSourcePlayable(cp);
            var n = Mathf.Max(2, Mathf.RoundToInt(clip.length * 60f));
            var l = new List<float>(); var r = new List<float>(); var ank = new List<float>();
            for (var i = 0; i < n; i++)
            {
                cp.SetTime(clip.length * i / n); g.Evaluate();
                // "down" is the body's own (head to hips), as a source avatar's model may lie in the world
                var down = (a.GetBoneTransform(HumanBodyBones.Hips).position - a.GetBoneTransform(HumanBodyBones.Head).position).normalized;
                float A1(HumanBodyBones up, HumanBodyBones lo) => Vector3.Angle(a.GetBoneTransform(lo).position - a.GetBoneTransform(up).position, down);
                l.Add(A1(HumanBodyBones.LeftUpperArm, HumanBodyBones.LeftLowerArm)); r.Add(A1(HumanBodyBones.RightUpperArm, HumanBodyBones.RightLowerArm));
                ank.Add((Mathf.Min(foot[0].position.y, foot[1].position.y) - go.transform.position.y) * 100f);
            }
            g.Destroy();
            return new S { L = l.ToArray(), R = r.ToArray(), Ankle = ank.ToArray(), Standing = standing * 100f };
        }

        private static float Q(IEnumerable<float> v, float q) { var s = v.OrderBy(x => x).ToList(); return s[Mathf.Clamp((int)(s.Count * q), 0, s.Count - 1)]; }
        private static string P(IEnumerable<float> v) => $"p2 {Q(v, 0.02f):0.0} p50 {Q(v, 0.5f):0.0} p98 {Q(v, 0.98f):0.0}";

        private static AnimationClip Clip(string path) => AssetDatabase.LoadAllAssetsAtPath(path).OfType<AnimationClip>().First(c => !c.name.StartsWith("__preview__"));

        [Test]
        public void BareRetarget()
        {
            var sb = new StringBuilder();
            foreach (var (id, clip) in new[] { ("Construction_Male_02", "idle_m"), ("cap_Military_Male_03n", "idle_m"), ("Sports_Male_04", "jog"), ("Medical_Female_01", "jog"), ("Medical_Female_01", "jog_f") })
            {
                var t = "Assets/SecondFace/Motion/" + clip + ".fbx";
                var c = "Assets/ProbeTmp/c_" + clip + ".fbx";
                var body = AssetDatabase.LoadAssetAtPath<GameObject>($"Assets/SecondFace/People/Rocketbox/{id}/{id}.prefab");
                var rows = new List<(string, S)>();
                foreach (var (label, src, onBody) in new[] { ("(a) own avatar, T-pose ref", t, false), ("(a') own avatar, committed ref", c, false), ("(b) body, T-pose ref", t, true), ("(c) body, committed ref", c, true) })
                {
                    var go = (GameObject)Object.Instantiate(onBody ? body : AssetDatabase.LoadAssetAtPath<GameObject>(src));
                    rows.Add((label, Sample(go, Clip(src), onBody ? null : AssetDatabase.LoadAllAssetsAtPath(src).OfType<Avatar>().First())));
                    Object.DestroyImmediate(go);
                }
                foreach (var (label, s) in rows)
                    sb.AppendLine($"{id} {clip} {label}: A1 left {P(s.L)}; right {P(s.R)}; lower ankle over the root (cm) {P(s.Ankle)}, bind {s.Standing:0.0}, lowest minus bind p2 {Q(s.Ankle, 0.02f) - s.Standing:0.0} p50 {Q(s.Ankle, 0.5f) - s.Standing:0.0}");
            }
            File.WriteAllText(Path.Combine(Application.dataPath, "..", "test-results", "bare_retarget_probe.txt"), sb.ToString());
            Debug.Log("BareRetargetProbe\n" + sb);
        }
    }
}
#endif
