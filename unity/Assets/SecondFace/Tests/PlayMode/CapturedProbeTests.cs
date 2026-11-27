// TEMP (never commit): CapturedMotionHoldsHumanPosesWhenBuilt by cause, round 2 (editor hand-off 1127e): the hands' reading
// from the hip joints vs the Hips bone on two Rocketbox bodies and the players; the walk face by three definitions.
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

        private static float GazePitch(Gaze g, Animator a)
        {
            var fo = typeof(Gaze).GetField("_faceOff", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            var off = (Quaternion)fo.GetValue(g);
            var f = a.GetBoneTransform(HumanBodyBones.Head).rotation * off * Vector3.forward;
            return Mathf.Asin(Mathf.Clamp(f.y, -1f, 1f)) * Mathf.Rad2Deg;
        }

        private static string Vec(Gaze g, Animator a, bool eyes)
        {
            Vector3 v;
            if (eyes)
            {
                var l = a.GetBoneTransform(HumanBodyBones.LeftEye); var r = a.GetBoneTransform(HumanBodyBones.RightEye);
                if (l == null || r == null) return "-";
                v = (l.position + r.position) * 0.5f - a.GetBoneTransform(HumanBodyBones.Head).position;
            }
            else
            {
                var fo = typeof(Gaze).GetField("_faceOff", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
                v = a.GetBoneTransform(HumanBodyBones.Head).rotation * (Quaternion)fo.GetValue(g) * Vector3.forward;
            }
            v = Quaternion.Inverse(a.transform.rotation) * v;
            return $"({v.x:+0.000;-0.000},{v.y:+0.000;-0.000},{v.z:+0.000;-0.000})";
        }

        private static float MuscleZeroFace(Animator a)
        {
            var hp = new HumanPoseHandler(a.avatar, a.transform);
            var pose = new HumanPose();
            hp.GetHumanPose(ref pose);
            var saved = (float[])pose.muscles.Clone(); var bp = pose.bodyPosition; var br = pose.bodyRotation;
            for (var i = 0; i < pose.muscles.Length; i++) pose.muscles[i] = 0f;
            hp.SetHumanPose(ref pose);
            var f = FacePitch(a);
            for (var i = 0; i < saved.Length; i++) pose.muscles[i] = saved[i];
            pose.bodyPosition = bp; pose.bodyRotation = br;
            hp.SetHumanPose(ref pose);
            hp.Dispose();
            return f;
        }

        [UnityTest, Timeout(600000)]
        public IEnumerator HandsReferenceAndWalkFace()
        {
#if UNITY_EDITOR
            var paths = new[] { "Assets/SecondFace/Prefabs/people/player_m.prefab", "Assets/SecondFace/Prefabs/people/player_f.prefab",
                "Assets/SecondFace/People/Rocketbox/Female_Adult_01/Female_Adult_01.prefab", "Assets/SecondFace/People/Rocketbox/Male_Adult_08/Male_Adult_08.prefab" };
            var controller = AssetDatabase.LoadAssetAtPath<RuntimeAnimatorController>("Assets/SecondFace/People/Locomotion.controller");
            var walk = JsonUtility.FromJson<Side>(File.ReadAllText("Assets/SecondFace/Motion/walk.json")).speed;
            var jog = JsonUtility.FromJson<Side>(File.ReadAllText("Assets/SecondFace/Motion/jog.json")).speed;
#else
            var paths = new string[0]; RuntimeAnimatorController controller = null; float walk = 0f, jog = 0f;
#endif
            var log = new StringBuilder();
            var x = 0f;
            var poses = new (string label, float speed, float idle, float t)[]
            {
                ("idle", 0f, 0f, 0.3f), ("idle 1", 0f, 1f, 0.5f), ("walk 0", walk, 0f, 0f), ("walk 0.5", walk, 0f, 0.5f), ("jog 0.25", jog, 0f, 0.25f),
            };
            foreach (var path in paths)
            {
#if UNITY_EDITOR
                var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path);
#else
                GameObject prefab = null;
#endif
                if (prefab == null) { log.AppendLine($"captured_probe2: {path} missing"); continue; }
                var stillGo = Object.Instantiate(prefab, new Vector3(x - 50f, 0, 0), Quaternion.identity); _made.Add(stillGo);
                var still = stillGo.GetComponent<Animator>();
                var neutralBind = FacePitch(still);
                var neutralMz = MuscleZeroFace(still);
                log.AppendLine($"captured_probe2: {prefab.name} bind eyes vector {(still.GetBoneTransform(HumanBodyBones.LeftEye) != null ? Vec(null, still, true) : "-")}");
                var go = Object.Instantiate(prefab, new Vector3(x, 0, 0), Quaternion.identity); _made.Add(go); x += 2f;
                var a = go.GetComponent<Animator>();
                a.runtimeAnimatorController = controller; a.applyRootMotion = false; a.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                var gz = go.AddComponent<Gaze>();   // as the test
                yield return null;
                var worst = 0f;
                foreach (var (label, speed, idle, t) in poses)
                {
                    a.speed = 1f; a.SetFloat("Speed", speed); a.SetFloat("Idle", idle); a.Play("Locomotion", 0, t); a.Update(0f);
                    yield return null;
                    var hips = a.GetBoneTransform(HumanBodyBones.Hips).position;
                    var joints = (a.GetBoneTransform(HumanBodyBones.LeftUpperLeg).position + a.GetBoneTransform(HumanBodyBones.RightUpperLeg).position) * 0.5f;
                    var fwd = a.transform.forward;
                    var sb = new StringBuilder();
                    foreach (var hb in new[] { HumanBodyBones.LeftHand, HumanBodyBones.RightHand })
                    {
                        var hand = a.GetBoneTransform(hb).position;
                        var j = Vector3.Dot(hand - joints, fwd); var b = Vector3.Dot(hand - hips, fwd);
                        worst = Mathf.Max(worst, Mathf.Abs(j - b));
                        sb.Append($" {(hb == HumanBodyBones.LeftHand ? "L" : "R")} joints {j:+0.000;-0.000} bone {b:+0.000;-0.000} (moved {(j - b) * 100f:+0.00;-0.00} cm)");
                    }
                    log.AppendLine($"captured_probe2: {prefab.name} {label}:{sb}");
                }
                log.AppendLine($"captured_probe2: {prefab.name} the hands' reading moved at most {worst * 100f:0.00} cm (hip joints vs Hips bone, over the test's poses)");
                // the walk round its cycle: bare (sync), and after the frame (Gaze): the test's eye line against the bind's and the
                // muscle-zero's neutral, and Gaze's own face pitch (its definition: the head at muscle zero, levelled)
                var sbw = new StringBuilder($"captured_probe2: {prefab.name} neutral eyes bind {neutralBind:+0.0;-0.0} muscle-zero {neutralMz:+0.0;-0.0}; walk");
                for (var k = 0; k < 8; k++)
                {
                    a.speed = 1f; a.SetFloat("Speed", walk); a.SetFloat("Idle", 0f); a.Play("Locomotion", 0, k / 8f); a.Update(0f);
                    var bareEye = FacePitch(a); var bareGaze = GazePitch(gz, a);
                    a.speed = 0f; yield return null;
                    var eye = FacePitch(a); var gp = GazePitch(gz, a);
                    sbw.Append($" | {k / 8f:0.000}: vec gaze {Vec(gz, a, false)} eyes {Vec(gz, a, true)};");
                    sbw.Append($" bare eye-bind {bareEye - neutralBind:+0.0;-0.0} eye-mz {bareEye - neutralMz:+0.0;-0.0} gaze {bareGaze:+0.0;-0.0} -> framed eye-bind {eye - neutralBind:+0.0;-0.0} eye-mz {eye - neutralMz:+0.0;-0.0} gaze {gp:+0.0;-0.0}");
                }
                a.speed = 1f; a.SetFloat("Speed", 0f); a.SetFloat("Idle", 0f); a.Play("Locomotion", 0, 0.3f); a.Update(0f);
                var ib = FacePitch(a); var ig = GazePitch(gz, a);
                a.speed = 0f; yield return null;
                sbw.Append($" | idle0.3: bare eye-bind {ib - neutralBind:+0.0;-0.0} gaze {ig:+0.0;-0.0} -> framed eye-bind {FacePitch(a) - neutralBind:+0.0;-0.0} eye-mz {FacePitch(a) - neutralMz:+0.0;-0.0} gaze {GazePitch(gz, a):+0.0;-0.0}");
                a.speed = 1f;
                log.AppendLine(sbw.ToString());
            }
            File.WriteAllText(Path.Combine(Application.dataPath, "../test-results/captured_probe2.txt"), log.ToString());
            Debug.Log(log.ToString());
        }

        [UnityTest, Timeout(600000)]
        public IEnumerator GazeAwakeAwayFromTheOrigin()
        {
#if UNITY_EDITOR
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/SecondFace/People/Rocketbox/Male_Adult_03/Male_Adult_03.prefab");
            var controller = AssetDatabase.LoadAssetAtPath<RuntimeAnimatorController>("Assets/SecondFace/People/Locomotion.controller");
#else
            GameObject prefab = null; RuntimeAnimatorController controller = null;
#endif
            var log = new StringBuilder();
            var configs = new (Vector3 pos, float yaw)[] { (Vector3.zero, 0f), (Vector3.zero, 137f), (new Vector3(15000f, 40f, 4000f), 0f), (new Vector3(15000f, 40f, 4000f), 137f), (new Vector3(3f, 0f, 2f), 180f) };
            foreach (var (pos, yaw) in configs)
            {
                var go = Object.Instantiate(prefab, pos, Quaternion.Euler(0f, yaw, 0f)); _made.Add(go);
                var a = go.GetComponentInChildren<Animator>();
                a.runtimeAnimatorController = controller; a.applyRootMotion = false; a.cullingMode = AnimatorCullingMode.CullCompletely;
                var hips = a.GetBoneTransform(HumanBodyBones.Hips);
                var w0 = hips.position; var l0 = hips.localPosition; var r0 = hips.localRotation;
                var g = go.AddComponent<Gaze>();
                var w1 = hips.position;
                var fo = typeof(Gaze).GetField("_faceOff", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
                var off = (Quaternion)fo.GetValue(g);
                var faceRoot = Quaternion.Inverse(a.transform.rotation) * (a.GetBoneTransform(HumanBodyBones.Head).rotation * off * Vector3.forward);
                var smr = go.GetComponentsInChildren<SkinnedMeshRenderer>().OrderByDescending(r => r.sharedMesh != null ? r.sharedMesh.vertexCount : 0).FirstOrDefault();
                log.AppendLine($"gaze_probe: at {pos} yaw {yaw}: hips moved {(w1 - w0).magnitude:0.000} m by Gaze.Awake (local {l0} -> {hips.localPosition}, turn {Quaternion.Angle(r0, hips.localRotation):0.0}°); the face's front at the bind in the root's frame: yaw {Mathf.Atan2(faceRoot.x, faceRoot.z) * Mathf.Rad2Deg:+0.0;-0.0}° pitch {Mathf.Asin(faceRoot.y) * Mathf.Rad2Deg:+0.0;-0.0}°; body mesh root bone {(smr != null && smr.rootBone != null ? smr.rootBone.name : "-")}, bounds centre {(smr != null ? (smr.bounds.center - go.transform.position).magnitude : -1f):0.0} m from the root");
                a.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                for (var i = 0; i < 4; i++) yield return null;
                var chest = a.GetBoneTransform(HumanBodyBones.UpperChest) ?? a.GetBoneTransform(HumanBodyBones.Chest);
                var hf = a.GetBoneTransform(HumanBodyBones.Head).rotation * off * Vector3.forward;
                var hfr = Quaternion.Inverse(a.transform.rotation) * hf;
                log.AppendLine($"gaze_probe:   animated 4 frames: hips {(hips.position - go.transform.position).magnitude:0.00} m from the root; Gaze's face yaw on the root {Mathf.Atan2(hfr.x, hfr.z) * Mathf.Rad2Deg:+0.0;-0.0}°; the eyes' line yaw on the root {EyeYaw(a):+0.0;-0.0}°");
            }
            File.WriteAllText(Path.Combine(Application.dataPath, "../test-results/gaze_probe.txt"), log.ToString());
            Debug.Log(log.ToString());
        }

        private static float EyeYaw(Animator a)
        {
            var l = a.GetBoneTransform(HumanBodyBones.LeftEye); var r = a.GetBoneTransform(HumanBodyBones.RightEye);
            if (l == null || r == null) return float.NaN;
            var across = Quaternion.Inverse(a.transform.rotation) * (r.position - l.position);
            var fwd = Vector3.Cross(across, Vector3.up);
            return Mathf.Atan2(fwd.x, fwd.z) * Mathf.Rad2Deg;
        }
    }
}
