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
    // TEMP probe (never committed): the aim's knee and the woman's off hand, frame by frame.
    public class FightProbeTests
    {
        private sealed class Host : MonoBehaviour { }

        [DefaultExecutionOrder(25)]
        public sealed class Before : MonoBehaviour
        {
            public Animator A; public float KL, KR; public Vector3 AL, AR, Hips;
            private void LateUpdate()
            {
                if (A == null) return;
                KL = Knee(A, true); KR = Knee(A, false);
                AL = A.GetBoneTransform(HumanBodyBones.LeftFoot).position; AR = A.GetBoneTransform(HumanBodyBones.RightFoot).position;
                Hips = A.GetBoneTransform(HumanBodyBones.Hips).position;
            }
        }

        [DefaultExecutionOrder(25)]
        public sealed class NoFix : MonoBehaviour
        {
            public Fighter F;
            private void LateUpdate() { if (F != null) F.ClearAim(); }
        }

        [DefaultExecutionOrder(29)]
        public sealed class Need : MonoBehaviour
        {
            public Fighter F; public float Total, Yaw, Pitch; public bool Have;
            private void LateUpdate()
            {
                Have = false;
                if (F == null) return;
                var wgo = Get(F, "_weapon") as GameObject; var w = Get(F, "_w");
                if (wgo == null || w == null || !(bool)Get(F, "_haveAim")) return;
                var t = wgo.transform;
                var muzzle = t.position + t.rotation * (Vector3)w.GetType().GetField("Muzzle").GetValue(w);
                var want = (Vector3)Get(F, "_aimAt") - muzzle;
                Total = Vector3.Angle(t.forward, want);
                var fw = t.forward; var fwf = new Vector3(fw.x, 0f, fw.z); var wf = new Vector3(want.x, 0f, want.z);
                Yaw = Vector3.SignedAngle(fwf, wf, Vector3.up);
                Pitch = Mathf.Atan2(want.y, wf.magnitude) * Mathf.Rad2Deg - Mathf.Atan2(fw.y, fwf.magnitude) * Mathf.Rad2Deg;
                Have = true;
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

        private AnimatedUnitView Person(string id, string weapon)
        {
            var go = Object.Instantiate(_cat.Get(id), Vector3.zero, Quaternion.identity, _root.transform);
            var p = RbPeople.Of(id);
            RbDress.Apply(go, RbPeople.DyesFor(p, "combat_" + id, p?.Roles?.FirstOrDefault() ?? "settler", null));
            var a = go.GetComponentInChildren<Animator>();
            var amb = PeopleService.Animate(a, _assets.Locomotion, id, p?.Male ?? true);
            if (amb != null) amb.MinGap = amb.MaxGap = 1e6f;
            a.cullingMode = AnimatorCullingMode.AlwaysAnimate;
            var inv = Inv.Empty();
            if (weapon != null) { Inv.AddItem(inv, Inv.MakeItem(weapon)); Inv.Equip(inv, 0); }
            var c = new Combatant { Id = id, Name = id, Team = "test", Sheet = Sheet.Empty(id), Inv = inv, Ap = 8, Morale = 60 };
            var u = new BattleUnit { C = c }; u.Place(0, 0);
            return CombatViews.ForBody(u, go.transform, _host, _fx, _assets.Combat, female: p != null ? !p.Male : id.Contains("Female"), theirs: false);
        }

        private static IEnumerator Wait(float s) { for (var t = 0f; t < s; t += Time.deltaTime) yield return null; }

        private static object Get(object o, string name) => o.GetType().GetField(name, BindingFlags.NonPublic | BindingFlags.Instance)?.GetValue(o);

        [UnityTest, Timeout(900000)]
        public IEnumerator Probe()
        {
            yield return Arena();
            var sb = new StringBuilder();
            var target = new Vector3(0f, 0f, 8f);
            foreach (var (item, arms) in new[] { ("w_carbine556", Arms.Rifle), ("w_pistol9", Arms.Pistol), ((string)null, Arms.Unarmed) })
            foreach (var id in new[] { "Male_Adult_08", "Female_Adult_01" })
            {
                var v = Person(id, item);
                var f = v.Fighter; var a = f.Animator;
                var pre = a.gameObject.AddComponent<Before>(); pre.A = a;
                sb.AppendLine($"== feet {id} {item ?? "fists"}");
                sb.AppendLine("t,state,trans,fullW,preKL,preKR,KL,KR,sink,soleL,soleR,plL,plR,stepL,stepR,pinnedL,pinnedR,liftL,liftR,dALxz,dARxz,preALy,ALy,preARy,ARy");
                var done = false;
                IEnumerator Act()
                {
                    yield return Wait(1.5f);
                    if (arms != Arms.Unarmed) { v.Unit.Watch = new Watch(); v.OnHold(Watch.Overwatch); yield return v.OnAim(target); yield return Wait(2f); v.Unit.Watch = null; }
                    v.OnStance("crouch"); yield return Wait(3f);
                    v.OnStance("stand"); yield return Wait(2f);
                    v.OnYield(); yield return Wait(2f);
                    done = true;
                }
                _host.StartCoroutine(Act());
                var t0 = Time.time;
                var after = a.gameObject.AddComponent<After>();
                after.Do = () =>
                {
                    if (done) return;
                    var st = CombatMotion.State(f.Current);
                    if (st == null || f.FullWeight < 0.99f || !(st.Gate is "guard" or "ready" or "aim" or "aim_pistol" or "crouch" or "yield")) return;
                    var tr = a.IsInTransition(a.GetLayerIndex(CombatMotion.FullLayer));
                    var fl = Get(f, "_fl"); var fr = Get(f, "_fr");
                    object Fd(object foot, string n) => foot.GetType().GetField(n).GetValue(foot);
                    var al = a.GetBoneTransform(HumanBodyBones.LeftFoot).position; var ar = a.GetBoneTransform(HumanBodyBones.RightFoot).position;
                    sb.AppendLine(string.Join(",", new object[] { (Time.time - t0).ToString("0.000"), f.Current + ":" + st.Gate, tr ? 1 : 0, f.FullWeight.ToString("0.00"),
                        pre.KL.ToString("0.0"), pre.KR.ToString("0.0"), Knee(a, true).ToString("0.0"), Knee(a, false).ToString("0.0"),
                        ((float)Get(f, "_sink") * 100f).ToString("0.00"), (f.SoleOver.x * 100f).ToString("0.00"), (f.SoleOver.y * 100f).ToString("0.00"), f.Planted.x, f.Planted.y,
                        Fd(fl, "Stepping"), Fd(fr, "Stepping"), Fd(fl, "Pinned"), Fd(fr, "Pinned"), ((float)Fd(fl, "Lift") * 100f).ToString("0.00"), ((float)Fd(fr, "Lift") * 100f).ToString("0.00"),
                        (new Vector2(al.x - pre.AL.x, al.z - pre.AL.z).magnitude * 100f).ToString("0.00"), (new Vector2(ar.x - pre.AR.x, ar.z - pre.AR.z).magnitude * 100f).ToString("0.00"),
                        (pre.AL.y * 100f).ToString("0.00"), (al.y * 100f).ToString("0.00"), (pre.AR.y * 100f).ToString("0.00"), (ar.y * 100f).ToString("0.00") }));
                };
                while (!done) yield return null;
                v.OnEnd(); yield return Wait(0.3f); Object.Destroy(v.Body.gameObject); yield return null;
            }
            foreach (var nofix in new[] { false })
            foreach (var item in new[] { "w_carbine556", "w_bolt308" })
            {
                var v = Person("Female_Adult_01", item);
                var f = v.Fighter;
                if (nofix) f.gameObject.AddComponent<NoFix>().F = f;
                var need = f.gameObject.AddComponent<Need>(); need.F = f;
                yield return Wait(1f);
                sb.AppendLine($"== off Female_Adult_01 {item} nofix {nofix}");
                sb.AppendLine("t,state,trans,fullW,offErr,mainErr,leftReach,shoulderToOff,fixW,holdW,offW,needHave,needTotal,needYaw,needPitch");
                var done = false;
                IEnumerator Act()
                {
                    v.Unit.Watch = new Watch();
                    v.OnHold(Watch.Overwatch);
                    yield return v.OnAim(target);
                    yield return Wait(1.5f);
                    yield return v.OnFire(target + Vector3.up * 1.1f, true, 0, 1);
                    for (var i = 0; i < 3; i++) yield return v.OnFire(target + Vector3.up * 1.1f, true, i, 3);
                    yield return Wait(0.3f);
                    v.Unit.Watch = null;
                    done = true;
                }
                _host.StartCoroutine(Act());
                var t0 = Time.time;
                var a = f.Animator;
                var left = Get(f, "_left");
                var after2 = a.gameObject.AddComponent<After>();
                after2.Do = () =>
                {
                    if (done) return;
                    var tr = a.IsInTransition(a.GetLayerIndex(CombatMotion.FullLayer));
                    var sh = a.GetBoneTransform(HumanBodyBones.LeftUpperArm).position;
                    var reach = left != null ? left.GetType().GetProperty("Arm")?.GetValue(left) : null;
                    sb.AppendLine(string.Join(",", new object[] { (Time.time - t0).ToString("0.000"), f.Current, tr ? 1 : 0, f.FullWeight.ToString("0.00"),
                        (f.OffError * 100f).ToString("0.00"), (f.MainError * 100f).ToString("0.00"), reach, ((f.OffPoint() - sh).magnitude * 100f).ToString("0.0"),
                        ((float)Get(f, "_fixW")).ToString("0.00"), ((float)Get(f, "_holdW")).ToString("0.00"), ((float)Get(f, "_offW")).ToString("0.00"), need.Have ? 1 : 0, need.Total.ToString("0.0"), need.Yaw.ToString("0.0"), need.Pitch.ToString("0.0") }));
                };
                while (!done) yield return null;
                v.OnEnd(); yield return Wait(0.2f); Object.Destroy(v.Body.gameObject); yield return null;
            }
            File.WriteAllText(Path.Combine(Application.dataPath, "../test-results/fight_probe5.csv"), sb.ToString());
        }
    }
}
