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
    // TEMP probe (never committed): the broad men's resting arms against where the hand is placed (forward of the hip) and
    // the elbow's bend.
    public class RestArmProbeTests
    {
        [DefaultExecutionOrder(10000)]
        public sealed class After : MonoBehaviour { public System.Action Do; private void LateUpdate() => Do?.Invoke(); }

        private static IEnumerator Wait(float s) { for (var t = 0f; t < s; t += Time.deltaTime) yield return null; }
        private static float Q(List<float> v, float q) { if (v.Count == 0) return float.NaN; var s = v.OrderBy(x => x).ToList(); return s[Mathf.Clamp(Mathf.RoundToInt(q * (s.Count - 1)), 0, s.Count - 1)]; }

        [UnityTest, Timeout(1800000)]
        public IEnumerator Probe()
        {
#if UNITY_EDITOR
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            var assets = AssetDatabase.LoadAssetAtPath<WorldAssets>("Assets/SecondFace/World/WorldAssets.asset");
#else
            RocketboxCatalog cat = null; WorldAssets assets = null;
#endif
            yield return BootTests.Clear();
            var root = new GameObject("rest arm probe");
            var flat = GameObject.CreatePrimitive(PrimitiveType.Cube);
            flat.transform.SetParent(root.transform);
            flat.transform.localScale = new Vector3(200f, 1f, 70f); flat.transform.position = new Vector3(0f, -0.5f, 0f);
            var sb = new StringBuilder();
            sb.AppendLine("person,bodyW,idle,a1L_med,a1L_p98,a1R_med,a1R_p98,pushL,pushR,pushDepL,pushDepR,a2L,a2R,a3L,a3R,gapL,gapR,sa0L,sa0R");
            var ids = new[] { "cap_PM02m", "Medical_Male_02", "cap_Military_Male_03n", "Construction_Male_02", "cap_Police_Male_03n" };
            var made = new List<(string id, GameObject go, Animator a, ArmClearance ac)>();
            for (var i = 0; i < ids.Length; i++)
            {
                var prefab = cat.Get(ids[i]);
                if (prefab == null) { sb.AppendLine(ids[i] + ",missing"); continue; }
                var go = Object.Instantiate(prefab, new Vector3((i - 2) * 3f, 0f, 0f), Quaternion.identity, root.transform);
                var p = RbPeople.Of(ids[i]);
                RbDress.Apply(go, RbPeople.DyesFor(p, "gate_" + ids[i], p?.Roles?.FirstOrDefault() ?? "settler", null));
                var a = go.GetComponentInChildren<Animator>();
                var amb = PeopleService.Animate(a, assets.Locomotion, ids[i], p?.Male ?? true);
                a.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                if (amb != null) { amb.MinGap = amb.MaxGap = 1e6f; }
                var ac = a.GetComponent<ArmClearance>();
                if (ac != null) ac.TraceStages = true;
                made.Add((ids[i], go, a, ac));
            }
            yield return Wait(1f);
            foreach (var m in made) m.a.SetFloat("Idle", 0f);
            foreach (var front in new[] { 0.25f, 0f })
                foreach (var flex in new[] { 0f, 1f })
                {
                    foreach (var m in made) { var g = m.a.GetComponent<Gaze>(); if (g != null) g.BodyWeight = front; m.a.SetFloat("Idle", flex); }
                    yield return Wait(2f);
                    var rec = made.ToDictionary(m => m.id, m => new Dictionary<string, List<float>>());
                    List<float> L(string id, string k) { if (!rec[id].TryGetValue(k, out var v)) rec[id][k] = v = new List<float>(); return v; }
                    var after = root.AddComponent<After>();
                    after.Do = () =>
                    {
                        foreach (var m in made)
                        {
                            var a = m.a;
                            Transform B(HumanBodyBones b) => a.GetBoneTransform(b);
                            foreach (var (side, up, lo, ha) in new[] { ("L", HumanBodyBones.LeftUpperArm, HumanBodyBones.LeftLowerArm, HumanBodyBones.LeftHand), ("R", HumanBodyBones.RightUpperArm, HumanBodyBones.RightLowerArm, HumanBodyBones.RightHand) })
                            {
                                var u = B(up).position; var e = B(lo).position; var w = B(ha).position;
                                L(m.id, "a1" + side).Add(Vector3.Angle(e - u, Vector3.down));
                                L(m.id, "a2" + side).Add(Vector3.Angle(e - u, w - e));
                                L(m.id, "a3" + side).Add(Vector3.Angle(w - e, Vector3.down));
                            }
                            if (m.ac != null)
                            {
                                L(m.id, "pushL").Add(m.ac.PushDeg[0]); L(m.id, "pushR").Add(m.ac.PushDeg[1]);
                                L(m.id, "pdL").Add(m.ac.PushDepth[0]); L(m.id, "pdR").Add(m.ac.PushDepth[1]);
                                L(m.id, "gapL").Add(m.ac.Diag[1] * 100f); L(m.id, "gapR").Add(m.ac.Diag[3] * 100f);
                                L(m.id, "sa0L").Add(m.ac.StageA1[1]); L(m.id, "sa0R").Add(m.ac.StageA1[8]);
                            }
                        }
                    };
                    yield return Wait(3f);
                    Object.Destroy(after);
                    foreach (var m in made)
                    {
                        string F(string k, float q = 0.5f) => Q(L(m.id, k), q).ToString("0.0");
                        sb.AppendLine(string.Join(",", new object[] { m.id, front, flex, F("a1L"), F("a1L", 0.98f), F("a1R"), F("a1R", 0.98f), F("pushL"), F("pushR"), F("pdL"), F("pdR"),
                            F("a2L"), F("a2R"), F("a3L"), F("a3R"), F("gapL"), F("gapR"), F("sa0L"), F("sa0R") }));
                    }
                }
            File.WriteAllText(Path.Combine(Application.dataPath, "../test-results/rest_arm_probe2.csv"), sb.ToString());
            Object.Destroy(root);
        }
    }
}
