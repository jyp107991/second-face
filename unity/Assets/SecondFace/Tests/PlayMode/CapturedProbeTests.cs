// TEMP (never commit): CapturedMotionHoldsHumanPosesWhenBuilt and the walker's sit, by cause (editor hand-off 1127d)
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using NUnit.Framework;
using SecondFace.Game.People;
using UnityEngine;
using UnityEngine.TestTools;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace SecondFace.Tests
{
    public class CapturedProbeTests
    {
        [System.Serializable] private sealed class Side { public float speed; }
        private readonly List<GameObject> _made = new();
        [UnityTearDown] public IEnumerator TearDown() { foreach (var g in _made) if (g != null) Object.Destroy(g); _made.Clear(); yield return null; }

        private static float FacePitch(Animator a)
        {
            var head = a.GetBoneTransform(HumanBodyBones.Head);
            var l = a.GetBoneTransform(HumanBodyBones.LeftEye); var r = a.GetBoneTransform(HumanBodyBones.RightEye);
            if (head == null || l == null || r == null) return float.NaN;
            var d = (l.position + r.position) * 0.5f - head.position;
            return Mathf.Atan2(d.y, new Vector2(d.x, d.z).magnitude) * Mathf.Rad2Deg;
        }

        [UnityTest, Timeout(600000)]
        public IEnumerator PlayersPosesByGazeAndSit()
        {
#if UNITY_EDITOR
            var paths = new[] { "Assets/SecondFace/Prefabs/people/player_m.prefab", "Assets/SecondFace/Prefabs/people/player_f.prefab",
                "Assets/SecondFace/People/Rocketbox/Female_Adult_01/Female_Adult_01.prefab", "Assets/SecondFace/People/Rocketbox/Male_Adult_08/Male_Adult_08.prefab" };
            var controller = AssetDatabase.LoadAssetAtPath<RuntimeAnimatorController>("Assets/SecondFace/People/Locomotion.controller");
            var walk = JsonUtility.FromJson<Side>(File.ReadAllText("Assets/SecondFace/Motion/walk.json")).speed;
#else
            var paths = new string[0]; RuntimeAnimatorController controller = null; float walk = 0f;
#endif
            var log = new StringBuilder();
            var x = 0f;
            foreach (var path in paths)
            {
#if UNITY_EDITOR
                var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path);
#else
                GameObject prefab = null;
#endif
                if (prefab == null) { log.AppendLine($"captured_probe: {path} missing"); continue; }
                var still = Object.Instantiate(prefab, new Vector3(x - 50f, 0, 0), Quaternion.identity); _made.Add(still);
                var neutral = FacePitch(still.GetComponent<Animator>());
                foreach (var gz in new[] { "none", "gaze", "gaze_bw25" })
                {
                    var go = Object.Instantiate(prefab, new Vector3(x, 0, 0), Quaternion.identity); _made.Add(go); x += 2f;
                    var a = go.GetComponent<Animator>();
                    // only the clip and the gaze, as the test has them
                    foreach (var c in go.GetComponentsInChildren<MonoBehaviour>(true))
                        if (c is ArmClearance || c is FootPlant || c is HandPose || c is Ambient) c.enabled = false;
                    a.runtimeAnimatorController = controller; a.applyRootMotion = false; a.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                    if (gz != "none") { var g = go.AddComponent<Gaze>(); if (gz == "gaze_bw25") g.BodyWeight = 0.25f; }
                    yield return null;
                    string Hands()
                    {
                        var hips = a.GetBoneTransform(HumanBodyBones.Hips).position; var fwd = a.transform.forward;
                        float Ah(HumanBodyBones b) => Vector3.Dot(a.GetBoneTransform(b).position - hips, fwd);
                        return $"L {Ah(HumanBodyBones.LeftHand):+0.000;-0.000} R {Ah(HumanBodyBones.RightHand):+0.000;-0.000} face {FacePitch(a) - neutral:+0.0;-0.0}";
                    }
                    // idle at 0.3 (the test's pose): read at once after Update(0) and after a frame (the clip held still: speed 0)
                    a.SetFloat("Speed", 0f); a.SetFloat("Idle", 0f); a.speed = 1f; a.Play("Locomotion", 0, 0.3f); a.Update(0f);
                    var sync = Hands();
                    a.speed = 0f; yield return null; yield return null;
                    var framed = Hands();
                    log.AppendLine($"captured_probe: {prefab.name} {gz} idle0.3 sync {sync} | after a frame {framed}");
                    // the walk's face round its cycle, sync and after a frame
                    var fs = new List<string>(); var ff = new List<string>();
                    for (var k = 0; k < 8; k++)
                    {
                        a.speed = 1f; a.SetFloat("Speed", walk); a.Play("Locomotion", 0, k / 8f); a.Update(0f);
                        fs.Add($"{FacePitch(a) - neutral:+0;-0}");
                        a.speed = 0f; yield return null; yield return null;
                        ff.Add($"{FacePitch(a) - neutral:+0;-0}");
                    }
                    log.AppendLine($"captured_probe: {prefab.name} {gz} walk face sync [{string.Join(" ", fs)}] after a frame [{string.Join(" ", ff)}]");
                    a.speed = 1f;
                    if (gz != "gaze") continue;
                    // the sit (the walker's chair): hips and ankles over the root through the clip
                    a.SetFloat("Speed", 0f);
                    var sit = new StringBuilder();
                    for (var k = 0; k < 10; k++)
                    {
                        a.Play("sit", 0, k / 10f); a.Update(0f);
                        var root = go.transform.position.y;
                        float Y(HumanBodyBones b) => a.GetBoneTransform(b).position.y - root;
                        sit.Append($" | {k / 10f:0.0}: hips {Y(HumanBodyBones.Hips):0.00} feet L {Y(HumanBodyBones.LeftFoot):0.00} R {Y(HumanBodyBones.RightFoot):0.00} knees {Y(HumanBodyBones.LeftLowerLeg):0.00}/{Y(HumanBodyBones.RightLowerLeg):0.00}");
                    }
                    log.AppendLine($"captured_probe: {prefab.name} sit{sit}");
                }
            }
            File.WriteAllText(Path.Combine(Application.dataPath, "../test-results/captured_probe.txt"), log.ToString());
            Debug.Log(log.ToString());
        }
    }
}
