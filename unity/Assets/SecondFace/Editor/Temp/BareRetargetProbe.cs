using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using SecondFace.Game.People;
using UnityEditor;
using UnityEngine;
using UnityEngine.Animations;
using UnityEngine.Playables;

namespace SecondFace.EditorTools
{
    /// <summary>Temporary (not committed): a clip on a body with Unity's retarget alone (no FootPlant, ArmClearance, Gaze):
    /// the upper arms' hang (A1) and the stance foot's height, to split the reference from the runtime.</summary>
    public static class BareRetargetProbe
    {
        public static void Run()
        {
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            var sb = new StringBuilder();
            foreach (var (id, clipName) in new[] { ("Construction_Male_02", "idle_m"), ("Construction_Male_02", "idle_m_b"), ("cap_Military_Male_03n", "idle_m"), ("Medical_Male_02", "idle_m"),
                         ("Sports_Male_04", "jog"), ("Sports_Male_04", "jog_b"), ("Medical_Female_01", "jog_f"), ("Medical_Female_01", "jog"), ("Female_Adult_07", "sneak"), ("Sports_Male_04", "walk") })
            {
                Debug.Log($"BareRetargetProbe: {id} {clipName} start");
                var clip = AssetDatabase.LoadAllAssetsAtPath($"Assets/SecondFace/Motion/{clipName}.fbx").OfType<AnimationClip>().First(c => !c.name.StartsWith("__preview__"));
                var go = (GameObject)Object.Instantiate(cat.Get(id));
                var a = go.GetComponentInChildren<Animator>();
                a.runtimeAnimatorController = null; a.applyRootMotion = false;
                foreach (var mb in go.GetComponentsInChildren<MonoBehaviour>()) mb.enabled = false;
                var foot = new[] { a.GetBoneTransform(HumanBodyBones.LeftFoot), a.GetBoneTransform(HumanBodyBones.RightFoot) };
                var toes = new[] { a.GetBoneTransform(HumanBodyBones.LeftToes), a.GetBoneTransform(HumanBodyBones.RightToes) };
                // the body as built (its bind pose): each ankle's height over the soles, the root at y = 0
                var ankle0 = foot.Select(f => f.position.y - go.transform.position.y).ToArray();
                Debug.Log($"BareRetargetProbe: {id} {clipName} made, graph");
                var g = PlayableGraph.Create("bare");
                var o = AnimationPlayableOutput.Create(g, "o", a);
                var cp = AnimationClipPlayable.Create(g, clip); cp.SetApplyFootIK(false);
                o.SetSourcePlayable(cp);
                var a1 = new List<float>[] { new List<float>(), new List<float>() };
                var low = new List<float>();
                var n = Mathf.Max(2, Mathf.RoundToInt(clip.length * 60f));
                for (var i = 0; i < n; i++)
                {
                    cp.SetTime(clip.length * i / n); g.Evaluate();
                    for (var s = 0; s < 2; s++)
                    {
                        var up = a.GetBoneTransform(s == 0 ? HumanBodyBones.LeftUpperArm : HumanBodyBones.RightUpperArm);
                        var lo = a.GetBoneTransform(s == 0 ? HumanBodyBones.LeftLowerArm : HumanBodyBones.RightLowerArm);
                        a1[s].Add(Vector3.Angle(lo.position - up.position, Vector3.down));
                    }
                    // the lower ankle's height over its bind height (0 = the ankle where the body stands on flat soles)
                    low.Add(Mathf.Min(foot[0].position.y - ankle0[0], foot[1].position.y - ankle0[1]) * 100f);
                }
                g.Destroy(); Object.DestroyImmediate(go);
                string P(List<float> v) { var s = v.OrderBy(x => x).ToList(); return $"p2 {s[(int)(s.Count * 0.02f)]:0.0} p50 {s[s.Count / 2]:0.0} p98 {s[Mathf.Min(s.Count - 1, (int)(s.Count * 0.98f))]:0.0}"; }
                sb.AppendLine($"{id} {clipName}: A1 left {P(a1[0])}; right {P(a1[1])}; lower ankle over its bind height (cm) {P(low)}");
            }
            File.WriteAllText(Path.Combine(Application.dataPath, "..", "test-results", "bare_retarget_probe.txt"), sb.ToString());
            Debug.Log("BareRetargetProbe\n" + sb);
        }
    }
}
