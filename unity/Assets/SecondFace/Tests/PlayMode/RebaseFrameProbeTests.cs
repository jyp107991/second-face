using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
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
    /// <summary>TEMP (relaunch 16, never committed; asked 2026-11-28 17:4xZ): FloatingOriginTests (b)'s mid-walk disturbance (the RightFoot's
    /// step 6.77 mm off the control's in the rebase's frame, 221.8 float steps; the same with the explicit orders undone) traced to its
    /// system: the same twins and walk, control and rebased, with each people system off in turn and each alone.</summary>
    public class RebaseFrameProbeTests
    {
        private static readonly string[] Bodies = { "Female_Adult_01", "Business_Female_02", "Male_Adult_08", "Construction_Male_03" };
        private static readonly HumanBodyBones[] Chain =
        {
            HumanBodyBones.Hips, HumanBodyBones.Spine, HumanBodyBones.Chest, HumanBodyBones.Neck, HumanBodyBones.Head,
            HumanBodyBones.LeftShoulder, HumanBodyBones.RightShoulder, HumanBodyBones.LeftUpperArm, HumanBodyBones.RightUpperArm,
            HumanBodyBones.LeftLowerArm, HumanBodyBones.RightLowerArm, HumanBodyBones.LeftHand, HumanBodyBones.RightHand,
            HumanBodyBones.LeftUpperLeg, HumanBodyBones.RightUpperLeg, HumanBodyBones.LeftLowerLeg, HumanBodyBones.RightLowerLeg,
            HumanBodyBones.LeftFoot, HumanBodyBones.RightFoot,
        };
        private static readonly System.Type[] Systems = { typeof(FootPlant), typeof(Gaze), typeof(ArmClearance), typeof(HandPose), typeof(SeatTurn), typeof(BodySkin) };
        private readonly List<GameObject> _made = new();

        [UnityTearDown]
        public IEnumerator TearDown() { foreach (var g in _made) if (g != null) Object.Destroy(g); _made.Clear(); WorldOrigin.Reset(); yield return null; }

        [DefaultExecutionOrder(10000)]
        private sealed class Rec : MonoBehaviour
        {
            public List<(Animator A, Transform R)> Bodies; public List<float[]> Rows;
            private void LateUpdate()
            {
                if (Rows == null) return;
                var row = new float[Bodies.Count * Chain.Length * 4]; var k = 0;
                foreach (var (a, r) in Bodies)
                {
                    var inv = Quaternion.Inverse(r.rotation);
                    for (var i = 0; i < Chain.Length; i++, k += 4)
                    {
                        var t = a.GetBoneTransform(Chain[i]); if (t == null) continue;
                        var rp = inv * (t.position - r.position);
                        row[k] = rp.x; row[k + 1] = rp.y; row[k + 2] = rp.z;
                        row[k + 3] = Mathf.Max(Mathf.Abs(t.position.x), Mathf.Max(Mathf.Abs(t.position.y), Mathf.Abs(t.position.z)));
                    }
                }
                Rows.Add(row);
            }
        }

        private static float Spacing(float v) => v < 1e-30f ? 1.4e-45f : Mathf.Pow(2f, Mathf.Floor(Mathf.Log(v, 2f)) - 23f);

        private IEnumerator Run(HashSet<System.Type> off, bool rebase, List<float[]> rows, List<int> at, List<string> names)
        {
#if UNITY_EDITOR
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            var controller = AssetDatabase.LoadAssetAtPath<UnityEditor.Animations.AnimatorController>("Assets/SecondFace/People/Locomotion.controller");
#else
            RocketboxCatalog cat = null; RuntimeAnimatorController controller = null;
#endif
            foreach (var g0 in new[] { Vector3.zero, new Vector3(WorldOrigin.Step, 0f, 0f) })
            {
                var g = GameObject.CreatePrimitive(PrimitiveType.Cube); _made.Add(g);
                g.transform.localScale = new Vector3(30f, 1f, 30f); g.transform.position = g0 + new Vector3(0f, -0.5f, 0f);
            }
            Physics.SyncTransforms();
            var list = new List<(Animator, Transform)>(); names.Clear();
            var x = 0f;
            foreach (var id in Bodies)
            {
                var person = SecondFace.Core.Npc.RbPeople.Of(id);
                for (var k = 0; k < 2; k++)
                {
                    var w = Walker.Create(cat.Get(id), controller, (k == 0 ? Vector3.zero : new Vector3(WorldOrigin.Step, 0f, 0f)) + new Vector3(x, 0f, 0f), 0f, person?.Male ?? id.Contains("Male"));
                    _made.Add(w.gameObject);
                    RbDress.Apply(w.gameObject, SecondFace.Core.Npc.RbPeople.DyesFor(person, "walker_" + id, person?.Roles?.FirstOrDefault() ?? "settler", null));
                    if (w.Agent != null) w.Agent.enabled = false;
                    w.enabled = false;
                    foreach (var ty in off) foreach (var c in w.GetComponentsInChildren(ty, true)) if (c is Behaviour b) b.enabled = false;
                    list.Add((w.Animator, w.transform)); names.Add(id + (k == 0 ? " A" : " B"));
                }
                x += 1.8f;
            }
            var host = new GameObject("rebase frame rec"); _made.Add(host);
            var rec = host.AddComponent<Rec>(); rec.Bodies = list;
            yield return null;
            for (var i = 0; i < 30; i++) yield return null;
            rec.Rows = rows;
            var f = 0;
            foreach (var (speed, n) in new[] { (0f, 90), (1.4f, 120) })
            {
                foreach (var (a, _) in list) { a.SetFloat("Speed", speed); a.SetBool("Sneak", false); }
                for (var i = 0; i < n; i++, f++)
                {
                    if (f == 150) { at.Add(rows.Count); if (rebase) WorldOrigin.Rebase(new Vector3(-WorldOrigin.Step, 0f, 0f)); }
                    yield return null;
                }
            }
            rec.Rows = null;
            foreach (var g in _made) if (g != null) Object.Destroy(g);
            _made.Clear();
            WorldOrigin.Reset();
            yield return null; yield return null;
        }

        [UnityTest, Timeout(3600000)]
        public IEnumerator TheWalksRebaseFrameSystemBySystem()
        {
            var managed = typeof(ArmClearance).GetField("ManagedStep", System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Static);
            var keepManaged = managed?.GetValue(null);
            managed?.SetValue(null, true);
            var keep = Time.captureDeltaTime; Time.captureDeltaTime = 1f / 60f;
            yield return null;
            var lines = new List<string>();
            try
            {
                var configs = new List<(string, HashSet<System.Type>)> { ("all on", new HashSet<System.Type>()) };
                foreach (var s in Systems) configs.Add(("all but " + s.Name, new HashSet<System.Type> { s }));
                configs.Add(("none", new HashSet<System.Type>(Systems)));
                foreach (var s in Systems) configs.Add(("only " + s.Name, new HashSet<System.Type>(Systems.Where(t => t != s))));
                var names = new List<string>();
                foreach (var (label, off) in configs)
                {
                    var c = new List<float[]>(); var m = new List<float[]>(); var ac = new List<int>(); var am = new List<int>();
                    yield return Run(off, false, c, ac, names);
                    yield return Run(off, true, m, am, names);
                    var at = ac[0];
                    var pre = -1;
                    for (var k = 0; k < at && pre < 0; k++) for (var e = 0; e < c[k].Length; e++) if (c[k][e] != m[k][e]) { pre = k; break; }
                    float worst = 0f; var where = "";
                    for (var k = at; k <= at + 1 && k < c.Count; k++)
                        for (var e = 0; e + 4 <= c[k].Length; e += 4)
                        {
                            var sc = new Vector3(c[k][e] - c[k - 1][e], c[k][e + 1] - c[k - 1][e + 1], c[k][e + 2] - c[k - 1][e + 2]);
                            var sm = new Vector3(m[k][e] - m[k - 1][e], m[k][e + 1] - m[k - 1][e + 1], m[k][e + 2] - m[k - 1][e + 2]);
                            var mag = Mathf.Max(Mathf.Max(c[k][e + 3], c[k - 1][e + 3]), Mathf.Max(m[k][e + 3], m[k - 1][e + 3]));
                            var u = (sm - sc).magnitude / Spacing(mag);
                            if (u > worst) { worst = u; var b = e / 4; where = $"record {k}, {names[b / Chain.Length]} {Chain[b % Chain.Length]}: {(sm - sc).magnitude * 1000f:0.0000} mm, a step there {Spacing(mag) * 1000f:0.0000} mm"; }
                        }
                    // after the rebase: how long the two stay apart, the largest
                    float after = 0f; var afterAt = "";
                    for (var k = at + 2; k < c.Count; k++)
                        for (var e = 0; e + 4 <= c[k].Length; e += 4)
                        {
                            var d = new Vector3(c[k][e] - m[k][e], c[k][e + 1] - m[k][e + 1], c[k][e + 2] - m[k][e + 2]).magnitude;
                            if (d > after) { after = d; var b = e / 4; afterAt = $"record {k}, {names[b / Chain.Length]} {Chain[b % Chain.Length]}"; }
                        }
                    lines.Add($"{label}: before the rebase {(pre < 0 ? "bit-identical" : $"parted at record {pre}")}; in the rebase's frames {worst:0.0} float steps ({where}); after, the control and the rebased apart up to {after * 1000f:0.000} mm ({afterAt})");
                }
            }
            finally { Time.captureDeltaTime = keep; managed?.SetValue(null, keepManaged); }
            System.IO.File.WriteAllLines(System.IO.Path.Combine(Application.dataPath, "..", "test-results", "rebase_frame.txt"), lines);
            Debug.Log("REBASE FRAME\n" + string.Join("\n", lines));
        }
    }
}
