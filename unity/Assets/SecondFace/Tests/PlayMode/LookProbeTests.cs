using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using NUnit.Framework;
using SecondFace.Core.Npc;
using SecondFace.Game.People;
using SecondFace.Game.Play;
using SecondFace.Game.World;
using UnityEngine;
using UnityEngine.TestTools;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace SecondFace.Tests
{
    // TEMP probe (never committed): how much of a look the trunk takes, and what it does to the hanging arms.
    public class LookProbeTests
    {
        [DefaultExecutionOrder(10000)]
        public sealed class After : MonoBehaviour
        {
            public System.Action Do;
            private void LateUpdate() => Do?.Invoke();
        }

        private static IEnumerator Wait(float s) { for (var t = 0f; t < s; t += Time.deltaTime) yield return null; }

        private static float Med(List<float> v) { if (v.Count == 0) return float.NaN; var s = v.OrderBy(x => x).ToList(); return s[s.Count / 2]; }
        private static float P98(List<float> v) { if (v.Count == 0) return float.NaN; var s = v.OrderBy(x => x).ToList(); return s[Mathf.Clamp(Mathf.RoundToInt(0.98f * (s.Count - 1)), 0, s.Count - 1)]; }

        [UnityTest, Timeout(900000)]
        public IEnumerator Probe()
        {
#if UNITY_EDITOR
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            var assets = AssetDatabase.LoadAssetAtPath<WorldAssets>("Assets/SecondFace/World/WorldAssets.asset");
#else
            RocketboxCatalog cat = null; WorldAssets assets = null;
#endif
            yield return BootTests.Clear();
            var root = new GameObject("look probe");
            var flat = GameObject.CreatePrimitive(PrimitiveType.Cube);
            flat.transform.SetParent(root.transform);
            flat.transform.localScale = new Vector3(200f, 1f, 70f); flat.transform.position = new Vector3(0f, -0.5f, 0f);
            var sb = new StringBuilder();
            sb.AppendLine("person,bodyW,angle,spineYaw,chestYaw,upperChestYaw,headYawOnChest,headYawWorld,headPitch,a1L_med,a1L_p98,a1R_med,a1R_p98,pushDepL,pushDegL,pushDepR,pushDegR,handFwdL");
            var ids = new[] { "cap_Police_Male_03n", "Business_Male_01", "Female_Adult_01" };
            for (var i = 0; i < ids.Length; i++)
            {
                var prefab = cat.Get(ids[i]);
                if (prefab == null) { sb.AppendLine(ids[i] + ",missing"); continue; }
                var go = Object.Instantiate(prefab, new Vector3(i * 3f, 0f, 0f), Quaternion.identity, root.transform);
                var p = RbPeople.Of(ids[i]);
                RbDress.Apply(go, RbPeople.DyesFor(p, "gate_" + ids[i], p?.Roles?.FirstOrDefault() ?? "settler", null));
                var a = go.GetComponentInChildren<Animator>();
                // the bones' frames at the bind, against the body's front (as Gaze takes its chest's)
                var bones = new[] { HumanBodyBones.Hips, HumanBodyBones.Spine, HumanBodyBones.Chest, HumanBodyBones.UpperChest, HumanBodyBones.Head };
                var off = new Dictionary<HumanBodyBones, Quaternion>();
                foreach (var b in bones) { var t = a.GetBoneTransform(b); if (t != null) off[b] = Quaternion.Inverse(t.rotation) * a.transform.rotation; }
                var amb = PeopleService.Animate(a, assets.Locomotion, ids[i], p?.Male ?? true);
                a.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                if (amb != null) { amb.MinGap = amb.MaxGap = 1e6f; }
                var gaze = a.GetComponent<Gaze>();
                var ac = a.GetComponent<ArmClearance>();
                var mark = new GameObject("mark").transform; mark.SetParent(root.transform);
                yield return Wait(1f);
                foreach (var bw in new[] { 0.25f, 0.1f, 0f })
                    foreach (var angle in new[] { 0, 45 })
                    {
                        if (gaze != null) { gaze.BodyWeight = bw; gaze.Target = mark; }
                        mark.position = go.transform.position + Quaternion.Euler(0f, angle, 0f) * Vector3.forward * 1.3f + Vector3.up * 1.6f;
                        yield return Wait(1.2f);
                        var y = bones.ToDictionary(b => b, b => new List<float>());
                        var hoc = new List<float>(); var hw = new List<float>(); var hp = new List<float>();
                        var a1L = new List<float>(); var a1R = new List<float>(); var pdl = new List<float>(); var pgl = new List<float>(); var pdr = new List<float>(); var pgr = new List<float>(); var hf = new List<float>();
                        var after = a.gameObject.AddComponent<After>();
                        after.Do = () =>
                        {
                            var front = go.transform.forward; front.y = 0f; front.Normalize();
                            float Yaw(HumanBodyBones b)
                            {
                                var tr = a.GetBoneTransform(b);
                                if (tr == null || !off.ContainsKey(b)) return float.NaN;
                                var f = tr.rotation * off[b] * Vector3.forward; f.y = 0f;
                                return Vector3.SignedAngle(front, f, Vector3.up);
                            }
                            var hipsYaw = Yaw(HumanBodyBones.Hips);
                            foreach (var b in bones) y[b].Add(Yaw(b) - hipsYaw);
                            var chestB = a.GetBoneTransform(HumanBodyBones.UpperChest) != null ? HumanBodyBones.UpperChest : HumanBodyBones.Chest;
                            hoc.Add(Yaw(HumanBodyBones.Head) - Yaw(chestB));
                            hw.Add(Yaw(HumanBodyBones.Head));
                            var head = a.GetBoneTransform(HumanBodyBones.Head);
                            var hfw = head.rotation * off[HumanBodyBones.Head] * Vector3.forward;
                            hp.Add(Mathf.Asin(Mathf.Clamp(hfw.y, -1f, 1f)) * Mathf.Rad2Deg);
                            var ul = a.GetBoneTransform(HumanBodyBones.LeftUpperArm).position; var el = a.GetBoneTransform(HumanBodyBones.LeftLowerArm).position;
                            var ur = a.GetBoneTransform(HumanBodyBones.RightUpperArm).position; var er = a.GetBoneTransform(HumanBodyBones.RightLowerArm).position;
                            a1L.Add(Vector3.Angle(el - ul, Vector3.down)); a1R.Add(Vector3.Angle(er - ur, Vector3.down));
                            var hand = a.GetBoneTransform(HumanBodyBones.LeftHand).position;
                            var hipsP = a.GetBoneTransform(HumanBodyBones.Hips).position;
                            hf.Add(Vector3.Dot(hand - hipsP, front) * 100f);
                            if (ac != null) { pdl.Add(ac.PushDepth[0] * 100f); pgl.Add(ac.PushDeg[0]); pdr.Add(ac.PushDepth[1] * 100f); pgr.Add(ac.PushDeg[1]); }
                        };
                        yield return Wait(2.5f);
                        Object.Destroy(after);
                        sb.AppendLine(string.Join(",", new object[] { ids[i], bw, angle,
                            Med(y[HumanBodyBones.Spine]).ToString("0.0"), Med(y[HumanBodyBones.Chest]).ToString("0.0"), Med(y[HumanBodyBones.UpperChest]).ToString("0.0"),
                            Med(hoc).ToString("0.0"), Med(hw).ToString("0.0"), Med(hp).ToString("0.0"),
                            Med(a1L).ToString("0.0"), P98(a1L).ToString("0.0"), Med(a1R).ToString("0.0"), P98(a1R).ToString("0.0"),
                            Med(pdl).ToString("0.00"), Med(pgl).ToString("0.0"), Med(pdr).ToString("0.00"), Med(pgr).ToString("0.0"), Med(hf).ToString("0.0") }));
                    }
                Object.Destroy(go);
                yield return null;
            }
            File.WriteAllText(Path.Combine(Application.dataPath, "../test-results/look_probe.csv"), sb.ToString());
            Object.Destroy(root);
        }
    }
}
