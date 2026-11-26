using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
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
    // TEMP probe (never committed): the fight's feet frame by frame, before Fighter.Feet (order 25) and after everything
    // (order 10000), on the gate's own sequence of fight states (HumanMotionGateTests.Fighting).
    public class FeetProbeTests
    {
        private sealed class Host : MonoBehaviour { }

        [DefaultExecutionOrder(25)]
        public sealed class Before : MonoBehaviour
        {
            public Animator A; public Vector3 AL, AR, Hips; public float KL, KR;
            private void LateUpdate()
            {
                if (A == null) return;
                AL = A.GetBoneTransform(HumanBodyBones.LeftFoot).position; AR = A.GetBoneTransform(HumanBodyBones.RightFoot).position;
                Hips = A.GetBoneTransform(HumanBodyBones.Hips).position;
                KL = Knee(A, true); KR = Knee(A, false);
            }
        }

        [DefaultExecutionOrder(10000)]
        public sealed class After : MonoBehaviour
        {
            public System.Action Do;
            private void LateUpdate() => Do?.Invoke();
        }

        public static float Knee(Animator a, bool left)
        {
            var u = a.GetBoneTransform(left ? HumanBodyBones.LeftUpperLeg : HumanBodyBones.RightUpperLeg);
            var l = a.GetBoneTransform(left ? HumanBodyBones.LeftLowerLeg : HumanBodyBones.RightLowerLeg);
            var f = a.GetBoneTransform(left ? HumanBodyBones.LeftFoot : HumanBodyBones.RightFoot);
            return Vector3.Angle(l.position - u.position, f.position - l.position);
        }

        public static float Reach(Animator a, bool left)
        {
            var u = a.GetBoneTransform(left ? HumanBodyBones.LeftUpperLeg : HumanBodyBones.RightUpperLeg).position;
            var l = a.GetBoneTransform(left ? HumanBodyBones.LeftLowerLeg : HumanBodyBones.RightLowerLeg).position;
            var f = a.GetBoneTransform(left ? HumanBodyBones.LeftFoot : HumanBodyBones.RightFoot).position;
            return (f - u).magnitude / ((l - u).magnitude + (f - l).magnitude);
        }

        private GameObject _root; private Host _host; private CombatFx _fx; private WorldAssets _assets; private RocketboxCatalog _cat;

        [UnityTearDown]
        public IEnumerator CleanUp() { if (_root != null) Object.Destroy(_root); yield return null; }

        private IEnumerator Arena()
        {
#if UNITY_EDITOR
            _cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            _assets = AssetDatabase.LoadAssetAtPath<WorldAssets>("Assets/SecondFace/World/WorldAssets.asset");
#endif
            yield return BootTests.Clear();
            if (Registry.Items.Count == 0)
            {
                var db = new ContentDb();
                foreach (var name in ContentDb.Registries) db.Load(name, File.ReadAllText(Path.Combine(Application.streamingAssetsPath, "content", name + ".json")));
                Registry.Load(db);
            }
            _root = new GameObject("probe arena");
            var ground = GameObject.CreatePrimitive(PrimitiveType.Cube);
            ground.transform.SetParent(_root.transform);
            ground.transform.localScale = new Vector3(80f, 1f, 80f); ground.transform.position = new Vector3(0f, -0.5f, 0f);
            _host = _root.AddComponent<Host>();
            _fx = new CombatFx(_root.transform);
        }

        private (GameObject Go, Animator A) Body(string id)
        {
            var go = Object.Instantiate(_cat.Get(id), Vector3.zero, Quaternion.identity, _root.transform);
            var p = RbPeople.Of(id);
            RbDress.Apply(go, RbPeople.DyesFor(p, "combat_" + id, p?.Roles?.FirstOrDefault() ?? "settler", null));
            var a = go.GetComponentInChildren<Animator>();
            var amb = PeopleService.Animate(a, _assets.Locomotion, id, p?.Male ?? true);
            if (amb != null) amb.MinGap = amb.MaxGap = 1e6f;
            a.cullingMode = AnimatorCullingMode.AlwaysAnimate;
            return (go, a);
        }

        private AnimatedUnitView View(GameObject go, string id, string weapon)
        {
            var p = RbPeople.Of(id);
            var inv = Inv.Empty();
            if (weapon != null) { Inv.AddItem(inv, Inv.MakeItem(weapon)); Inv.Equip(inv, 0); }
            var c = new Combatant { Id = id, Name = id, Team = "gate", Sheet = Sheet.Empty(id), Inv = inv, Ap = 8, Morale = 60 };
            var u = new BattleUnit { C = c }; u.Place(0, 0);
            return CombatViews.ForBody(u, go.transform, _host, _fx, _assets.Combat, female: p != null ? !p.Male : id.Contains("Female"), theirs: false);
        }

        private static IEnumerator Wait(float s) { for (var t = 0f; t < s; t += Time.deltaTime) yield return null; }

        private static object Get(object o, string name) => o.GetType().GetField(name, BindingFlags.NonPublic | BindingFlags.Instance)?.GetValue(o);

        private static string F(float x, string f = "0.000") => x.ToString(f, System.Globalization.CultureInfo.InvariantCulture);

        [UnityTest, Timeout(1800000)]
        public IEnumerator Probe()
        {
            yield return Arena();
            var ids = (System.Environment.GetEnvironmentVariable("FEET_PEOPLE") ?? "Business_Female_01,Business_Male_01").Split(',');
            var sb = new StringBuilder();
            sb.AppendLine("who,label,t,cur,gate,tr,nt,fullW,paused,turning,plantOn,yaw,bx,bz,hipPreX,hipPreY,hipPreZ,hipPostY,sink," +
                          "preLx,preLy,preLz,postLx,postLy,postLz,pinL,stepL,wL,pinLx,pinLz,liftL,reachL,kPreL,kPostL,soleL,plantedL," +
                          "preRx,preRy,preRz,postRx,postRy,postRz,pinR,stepR,wR,pinRx,pinRz,liftR,reachR,kPreR,kPostR,soleR,plantedR");
            var ahead = Vector3.forward * 8f;
            foreach (var id in ids)
            {
                var (go, a) = Body(id);
                yield return Wait(1f);
                var pre = a.gameObject.AddComponent<Before>(); pre.A = a;
                var after = a.gameObject.AddComponent<After>();
                var label = "none";
                Fighter f = null;
                var t0 = Time.time;
                var plant = a.GetComponent<FootPlant>();
                after.Do = () =>
                {
                    if (f == null || label == "none") return;
                    var st = CombatMotion.State(f.Current);
                    var tr = a.IsInTransition(a.GetLayerIndex(CombatMotion.FullLayer));
                    var fl = Get(f, "_fl"); var fr = Get(f, "_fr");
                    object Fd(object foot, string n) => foot.GetType().GetField(n).GetValue(foot);
                    var al = a.GetBoneTransform(HumanBodyBones.LeftFoot).position; var ar = a.GetBoneTransform(HumanBodyBones.RightFoot).position;
                    var hips = a.GetBoneTransform(HumanBodyBones.Hips).position;
                    var body = f.Body != null ? f.Body : a.transform;
                    string FootCols(object foot, Vector3 p, Vector3 q, bool left, float kpre, float sole, float planted)
                    {
                        var pin = (Vector3)Fd(foot, "Pin");
                        return string.Join(",", new[] { F(p.x), F(p.y), F(p.z), F(q.x), F(q.y), F(q.z), ((bool)Fd(foot, "Pinned") ? "1" : "0"), ((bool)Fd(foot, "Stepping") ? "1" : "0"),
                            F((float)Fd(foot, "W"), "0.00"), F(pin.x), F(pin.z), F((float)Fd(foot, "Lift")), F(Reach(a, left), "0.00000"), F(kpre, "0.0"), F(Knee(a, left), "0.0"), F(sole * 100f, "0.00"), F(planted, "0") });
                    }
                    var info = a.GetCurrentAnimatorStateInfo(a.GetLayerIndex(CombatMotion.FullLayer));
                    sb.AppendLine(string.Join(",", new[] { id, label, F(Time.time - t0), f.Current ?? "", st?.Gate ?? "", tr ? "1" : "0", F(info.normalizedTime, "0.000"), F(f.FullWeight, "0.00"),
                        ((bool)Get(f, "_pausedPlant") ? "1" : "0"), ((bool)Get(f, "_turning") ? "1" : "0"), (plant != null && plant.enabled ? "1" : "0"),
                        F(body.eulerAngles.y, "0.00"), F(body.position.x), F(body.position.z), F(pre.Hips.x), F(pre.Hips.y), F(pre.Hips.z), F(hips.y), F((float)Get(f, "_sink") * 100f, "0.00"),
                        FootCols(fl, pre.AL, al, true, pre.KL, f.SoleOver.x, f.Planted.x), FootCols(fr, pre.AR, ar, false, pre.KR, f.SoleOver.y, f.Planted.y) }));
                };
                IEnumerator Shoot(AnimatedUnitView v, int rounds) { for (var i = 0; i < rounds; i++) yield return v.OnFire(v.Body.position + ahead + Vector3.up * 1.1f, true, i, rounds); }
                IEnumerator Blows(AnimatedUnitView v, int n) { for (var i = 0; i < n; i++) { yield return v.OnStrike(v.Body.position + ahead * 0.12f, true); yield return Wait(0.9f); } }
                foreach (var (item, arms) in new[] { ("w_carbine556", "rifle"), ("w_pistol9", "pistol"), ((string)null, "unarmed"), ("w_sledge", "club2") })
                {
                    go.transform.SetPositionAndRotation(Vector3.zero, Quaternion.identity);
                    var v = View(go, id, item);
                    f = v.Fighter;
                    yield return Wait(1.2f);
                    label = $"{(arms is "unarmed" ? "guard" : "ready")}:{arms}"; yield return Wait(3f);
                    if (arms is "rifle" or "pistol")
                    {
                        v.Unit.Watch = new Watch(); v.OnHold(Watch.Overwatch);
                        label = $"toaim:{arms}";
                        _host.StartCoroutine(v.OnAim(v.Body.position + ahead));
                        yield return Wait(1.6f);
                        label = $"aim:{arms}"; yield return Wait(2.5f);
                        label = $"aim:{arms}_shot"; yield return Shoot(v, 1);
                        label = $"aim:{arms}_burst"; yield return Shoot(v, 3);
                        v.Unit.Watch = null;
                        label = "between"; yield return Wait(2f);
                        label = $"reload:{arms}"; yield return v.OnReload();
                        if (arms == "rifle")
                        {
                            label = "between"; yield return Wait(1.2f);
                            label = "crouch:rifle"; v.OnStance("crouch"); yield return Wait(3.6f);
                            v.OnStance("stand"); label = "between";
                            yield return Wait(0.5f);
                            for (var rise = 0f; rise < 5f && v.Fighter.Current != null && v.Fighter.Current.StartsWith("cover_rise"); rise += Time.deltaTime) yield return null;
                            yield return Wait(0.7f);
                            label = "throw:rifle";
                            var arc = new List<Vector3>();
                            PlaceholderUnitView.ArcPoints(v.Body.position + Vector3.up * 1.5f, v.Body.position + ahead, arc);
                            yield return v.OnThrow(arc, "w_frag"); yield return Wait(0.8f);
                            label = "hit:rifle"; v.OnHit(v.Body.position + ahead, "torso", "crit"); yield return Wait(2.6f);
                        }
                    }
                    else
                    {
                        label = $"strike:{arms}"; yield return Blows(v, 3);
                        label = $"block:{arms}"; v.OnMiss(v.Body.position + ahead * 0.12f, true); yield return Wait(1.8f);
                        if (arms == "unarmed") { label = "yield:unarmed"; v.OnYield(); yield return Wait(2.6f); }
                    }
                    label = "none";
                    v.OnEnd();
                    yield return Wait(1.5f);
                }
                Object.Destroy(go);
                yield return null;
            }
            File.WriteAllText(Path.Combine(Application.dataPath, "../test-results/feet_probe.csv"), sb.ToString());
        }
    }
}
