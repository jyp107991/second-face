using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using NUnit.Framework;
using SecondFace.Core.Combat;
using SecondFace.Core.Content;
using SecondFace.Core.Inventory;
using SecondFace.Core.Npc;
using SecondFace.Core.Stats;
using SecondFace.Game.Fighting;
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
    // TEMP probe (never committed): the head in the fight's states, as the gate measures it (H1 pitch, H2 yaw on the chest,
    // H3 roll), at three points of the frame (after the animation and its IK, after the gaze's clamp, last), under three gaze
    // settings: the game's, none, the old body weight.
    public class HeadProbeTests
    {
        private sealed class Host : MonoBehaviour { }

        public sealed class Tap
        {
            public MotionProbe P; public Animator A; public Fighter F; public Quaternion HipsOff;
            public System.Action<int, float[]> Got;
            public void Take(int point)
            {
                if (P == null || Got == null) return;
                var (f, _, r) = P.Face();
                var pitch = Mathf.Asin(Mathf.Clamp(f.y, -1f, 1f)) * Mathf.Rad2Deg;
                var fl = new Vector3(f.x, 0, f.z);
                var cf = P.ChestForward();
                var yaw = fl.sqrMagnitude > 1e-6f ? Vector3.Angle(fl.normalized, cf) : 0f;
                var roll = Mathf.Asin(Mathf.Clamp(Vector3.Dot(r, Vector3.up), -1f, 1f)) * Mathf.Rad2Deg;
                var fw = A.transform.forward; fw.y = 0f; fw.Normalize();
                var hips = A.GetBoneTransform(HumanBodyBones.Hips);
                var hf = hips.rotation * HipsOff * Vector3.forward; hf.y = 0f;
                float W(Vector3 v) { v.y = 0f; return v.sqrMagnitude > 1e-6f ? Vector3.SignedAngle(Vector3.forward, v.normalized, Vector3.up) : float.NaN; }
                var gun = F != null && F.Weapon != null ? W(F.Weapon.forward) : float.NaN;
                Got(point, new[] { pitch, yaw, Mathf.Abs(roll), Vector3.SignedAngle(fw, cf, Vector3.up), fl.sqrMagnitude > 1e-6f ? Vector3.SignedAngle(fw, fl.normalized, Vector3.up) : 0f,
                    W(fw), W(hf), W(cf), gun });
            }
        }
        [DefaultExecutionOrder(-1)] public sealed class TapA : MonoBehaviour { public Tap T; private void LateUpdate() => T?.Take(0); }
        [DefaultExecutionOrder(1)] public sealed class TapB : MonoBehaviour { public Tap T; private void LateUpdate() => T?.Take(1); }
        [DefaultExecutionOrder(10001)] public sealed class TapC : MonoBehaviour { public Tap T; private void LateUpdate() => T?.Take(2); }

        private GameObject _root; private Host _host; private CombatFx _fx; private WorldAssets _assets; private RocketboxCatalog _cat;

        [UnityTearDown]
        public IEnumerator CleanUp() { Time.captureDeltaTime = 0f; if (_root != null) Object.Destroy(_root); yield return null; }

        private static IEnumerator Wait(float s) { for (var t = 0f; t < s; t += Time.deltaTime) yield return null; }
        private static float Q(List<float> v, float q) { if (v.Count == 0) return float.NaN; var s = v.OrderBy(x => x).ToList(); return s[Mathf.Clamp(Mathf.RoundToInt(q * (s.Count - 1)), 0, s.Count - 1)]; }

        [UnityTest, Timeout(1800000)]
        public IEnumerator Probe()
        {
#if UNITY_EDITOR
            _cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            _assets = AssetDatabase.LoadAssetAtPath<WorldAssets>("Assets/SecondFace/World/WorldAssets.asset");
#endif
            yield return BootTests.Clear();
            Time.captureDeltaTime = 1f / 60f;
            if (Registry.Items.Count == 0)
            {
                var db = new ContentDb();
                foreach (var name in ContentDb.Registries) db.Load(name, File.ReadAllText(Path.Combine(Application.streamingAssetsPath, "content", name + ".json")));
                Registry.Load(db);
            }
            _root = new GameObject("head probe");
            var ground = GameObject.CreatePrimitive(PrimitiveType.Cube);
            ground.transform.SetParent(_root.transform);
            ground.transform.localScale = new Vector3(80f, 1f, 80f); ground.transform.position = new Vector3(0f, -0.5f, 0f);
            _host = _root.AddComponent<Host>();
            _fx = new CombatFx(_root.transform);
            var sb = new StringBuilder();
            sb.AppendLine("person,config,state,clip,point,n,H1p2,H1p50,H1p98,H2p50,H2p98,H3p50,H3p98,chestYaw50,headYaw50,rootW,hipsW,chestW,gunW");
            var ids = (System.Environment.GetEnvironmentVariable("PROBE_PEOPLE") ?? "Business_Female_01,Business_Male_01").Split(',');
            var configs = (System.Environment.GetEnvironmentVariable("PROBE_CONFIGS") ?? "game,nogaze").Split(',');
            var ahead = Vector3.forward * 8f;
            foreach (var id in ids)
            foreach (var config in configs)
            foreach (var (item, arms) in new[] { ("w_carbine556", "rifle"), ("w_pistol9", "pistol"), ((string)null, "unarmed"), ("w_sledge", "club2") })
            {
                var go = Object.Instantiate(_cat.Get(id), Vector3.zero, Quaternion.identity, _root.transform);
                var p = RbPeople.Of(id);
                RbDress.Apply(go, RbPeople.DyesFor(p, "gate_" + id, p?.Roles?.FirstOrDefault() ?? "settler", null));
                var a = go.GetComponentInChildren<Animator>();
                var amb = PeopleService.Animate(a, _assets.Locomotion, id, p?.Male ?? true);
                if (amb != null) amb.MinGap = amb.MaxGap = 1e6f;
                a.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                var hipsT = a.GetBoneTransform(HumanBodyBones.Hips);
                var probe = a.gameObject.AddComponent<MotionProbe>();
                probe.Person = id;
                Assert.That(probe.Calibrate(), Is.True, probe.Error);
                var hph = new HumanPoseHandler(a.avatar, a.transform); var hpose = new HumanPose(); hph.GetHumanPose(ref hpose);
                var hsaved = (float[])hpose.muscles.Clone();
                for (var m = 0; m < hpose.muscles.Length; m++) hpose.muscles[m] = 0f;
                hph.SetHumanPose(ref hpose);
                var hipsOff = Quaternion.Inverse(hipsT.rotation) * a.transform.rotation;   // (the hips' axes in the neutral pose, as the chest's)
                for (var m = 0; m < hpose.muscles.Length; m++) hpose.muscles[m] = hsaved[m];
                hph.SetHumanPose(ref hpose);
                var gaze = a.GetComponent<Gaze>();
                if (gaze != null)
                {
                    if (config == "nogaze") { gaze.HeadWeight = 0f; gaze.enabled = false; }
                    if (config == "bw25") gaze.BodyWeight = 0.25f;
                    if (config.StartsWith("hw")) gaze.HeadWeight = float.Parse(config.Substring(2)) / 100f;
                }
                var inv = Inv.Empty();
                if (item != null) { Inv.AddItem(inv, Inv.MakeItem(item)); Inv.Equip(inv, 0); }
                var c = new Combatant { Id = id, Name = id, Team = "test", Sheet = Sheet.Empty(id), Inv = inv, Ap = 8, Morale = 60 };
                var u = new BattleUnit { C = c }; u.Place(0, 0);
                var v = CombatViews.ForBody(u, go.transform, _host, _fx, _assets.Combat, female: p != null ? !p.Male : id.Contains("Female"), theirs: false);
                var f = v.Fighter;
                string label = null;
                var data = new Dictionary<(string, string, int), List<float[]>>();
                var tap = new Tap { P = probe, A = a, F = f, HipsOff = hipsOff };
                tap.Got = (pt, x) =>
                {
                    if (label == null) return;
                    var key = (label, f.Current ?? "-", pt);
                    if (!data.TryGetValue(key, out var l)) data[key] = l = new List<float[]>();
                    l.Add(x);
                };
                a.gameObject.AddComponent<TapA>().T = tap; a.gameObject.AddComponent<TapB>().T = tap; a.gameObject.AddComponent<TapC>().T = tap;
                yield return Wait(1.2f);
                var running = false;
                IEnumerator Run(string state, float hold, IEnumerator act)
                {
                    label = state;
                    if (act != null) { running = true; _host.StartCoroutine(Done(act)); }
                    for (var t = 0f; t < hold || running; t += Time.deltaTime) { if (t > 25f) break; yield return null; }
                    label = null;
                }
                IEnumerator Done(IEnumerator act) { try { while (act.MoveNext()) yield return act.Current; } finally { running = false; } }
                IEnumerator Then(System.Action x, float s) { x(); yield return Wait(s); }
                IEnumerator Shoot(int rounds) { for (var i = 0; i < rounds; i++) yield return v.OnFire(v.Body.position + ahead + Vector3.up * 1.1f, true, i, rounds); }
                IEnumerator Blows(int n) { for (var i = 0; i < n; i++) { yield return v.OnStrike(v.Body.position + ahead * 0.12f, true); yield return Wait(0.9f); } }
                IEnumerator Throw()
                {
                    var arc = new List<Vector3>();
                    PlaceholderUnitView.ArcPoints(v.Body.position + Vector3.up * 1.5f, v.Body.position + ahead, arc);
                    yield return v.OnThrow(arc, "w_frag");
                    yield return Wait(0.8f);
                }
                yield return Run(arms is "unarmed" ? "guard" : "ready", 3f, null);
                if (config == "nogaze")
                {
                    // a look from above, behind the root (the target is ahead, +Z): which way the body faces
                    var cam = new GameObject("probe cam") { tag = "MainCamera" }.AddComponent<Camera>();
                    cam.clearFlags = CameraClearFlags.SolidColor; cam.backgroundColor = new Color(0.7f, 0.75f, 0.8f); cam.fieldOfView = 30f;
                    var focus = go.transform.position + Vector3.up * 1.0f;
                    var rot = Quaternion.Euler(50f, 0f, 0f);
                    cam.transform.SetPositionAndRotation(focus - rot * Vector3.forward * 6f, rot);
                    var marker = GameObject.CreatePrimitive(PrimitiveType.Cube); marker.transform.position = go.transform.position + Vector3.forward * 1.5f; marker.transform.localScale = Vector3.one * 0.2f;
                    yield return ScreenshotTests.Capture($"_red_headprobe_{id}_{arms}_ready", 800, 600);
                    Object.Destroy(marker); Object.Destroy(cam.gameObject);
                }
                if (arms is "rifle" or "pistol")
                {
                    var aim = arms == "rifle" ? "aim" : "aim_pistol";
                    v.Unit.Watch = new Watch(); v.OnHold(Watch.Overwatch); _host.StartCoroutine(v.OnAim(v.Body.position + ahead));
                    yield return Wait(1.6f);
                    yield return Run(aim, 2.5f, null);
                    yield return Run(aim + "_burst", 0f, Shoot(3));
                    v.Unit.Watch = null;
                    yield return Wait(2f);
                    yield return Run("reload", 0f, v.OnReload());
                    if (arms == "rifle")
                    {
                        yield return Run("crouch", 3.5f, Then(() => v.OnStance("crouch"), 0.1f));
                        v.OnStance("stand"); yield return Wait(1.2f);
                        yield return Run("throw", 0f, Throw());
                        yield return Run("hit", 2.5f, Then(() => v.OnHit(v.Body.position + ahead, "torso", "crit"), 0.1f));
                    }
                }
                else
                {
                    yield return Run("strike", 0f, Blows(3));
                    yield return Run("block", 0f, Then(() => v.OnMiss(v.Body.position + ahead * 0.12f, true), 1.8f));
                    if (arms == "unarmed") yield return Run("yield", 2.5f, Then(v.OnYield, 0.1f));
                }
                v.OnEnd();
                yield return Wait(0.3f);
                foreach (var kv in data.OrderBy(k => k.Key.Item1).ThenBy(k => k.Key.Item3).ThenByDescending(k => k.Value.Count))
                {
                    var l = kv.Value;
                    List<float> Col(int i) => l.Select(x => x[i]).ToList();
                    sb.AppendLine(string.Join(",", new object[] { id, config, arms + ":" + kv.Key.Item1, kv.Key.Item2, kv.Key.Item3, l.Count,
                        Q(Col(0), 0.02f).ToString("0.0"), Q(Col(0), 0.5f).ToString("0.0"), Q(Col(0), 0.98f).ToString("0.0"),
                        Q(Col(1), 0.5f).ToString("0.0"), Q(Col(1), 0.98f).ToString("0.0"), Q(Col(2), 0.5f).ToString("0.0"), Q(Col(2), 0.98f).ToString("0.0"),
                        Q(Col(3), 0.5f).ToString("0.0"), Q(Col(4), 0.5f).ToString("0.0"), Q(Col(5), 0.5f).ToString("0.0"), Q(Col(6), 0.5f).ToString("0.0"),
                        Q(Col(7), 0.5f).ToString("0.0"), Q(Col(8), 0.5f).ToString("0.0") }));
                }
                Object.Destroy(go);
                yield return null;
            }
            File.WriteAllText(Path.Combine(Application.dataPath, "../test-results/head_probe2.csv"), sb.ToString());
        }
    }
}
