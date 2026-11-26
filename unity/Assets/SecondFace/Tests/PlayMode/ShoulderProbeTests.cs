using System.Collections;
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
    // TEMP probe (never committed): each idle's trunk and shoulders on a body as the game makes it (every runtime system on),
    // in the hips' frame (x the body's right, y up, z forward; cm): the trunk's bones, each clavicle and shoulder joint, the
    // elbow, the trunk's side lean and twist on the pelvis, and the waist's side (the torso's skin points at the elbow's
    // height, the furthest out on the arm's side) under the shoulder.
    public class ShoulderProbeTests
    {
        [DefaultExecutionOrder(10003)]
        public sealed class After : MonoBehaviour { public System.Action Do; private void LateUpdate() => Do?.Invoke(); }

        /// <summary>main's Gaze (1f91e6a1), verbatim but for its name: the look-at with the head's weight 0.9 and the body's
        /// 0.25 in the IK pass, the neck's yaw and the head's roll held after it.</summary>
        [RequireComponent(typeof(Animator))]
        public sealed class OldGaze : MonoBehaviour
        {
            public Transform Target;
            public float HeadWeight = 0.9f, BodyWeight = 0.25f;
            public float MaxYaw = 20f, MaxUp = 10f, MaxDown = 14f, MaxRoll = 6f, MaxNeckYaw = 26f;
            private Animator _animator; private Transform _head, _chest;
            private Quaternion _faceOff = Quaternion.identity, _chestOff = Quaternion.identity;
            private void Awake()
            {
                _animator = GetComponent<Animator>();
                _head = _animator != null && _animator.isHuman ? _animator.GetBoneTransform(HumanBodyBones.Head) : null;
                _chest = _animator != null && _animator.isHuman ? _animator.GetBoneTransform(HumanBodyBones.UpperChest) ?? _animator.GetBoneTransform(HumanBodyBones.Chest) ?? _animator.GetBoneTransform(HumanBodyBones.Spine) : null;
                if (_head != null) _faceOff = Quaternion.Inverse(_head.rotation) * transform.rotation;
                if (_chest != null) _chestOff = Quaternion.Inverse(_chest.rotation) * transform.rotation;
            }
            private void LateUpdate()
            {
                if (_head == null || !enabled) return;
                if (_chest != null)
                {
                    var chest = _chest.rotation * _chestOff;
                    var face = Quaternion.Inverse(chest) * (_head.rotation * _faceOff * Vector3.forward);
                    var yaw = Mathf.Atan2(face.x, face.z) * Mathf.Rad2Deg;
                    if (Mathf.Abs(yaw) > MaxNeckYaw) _head.rotation = Quaternion.AngleAxis(-(yaw - Mathf.Sign(yaw) * MaxNeckYaw), chest * Vector3.up) * _head.rotation;
                }
                var q = _head.rotation * _faceOff;
                var right = q * Vector3.right;
                var roll = Mathf.Asin(Mathf.Clamp(Vector3.Dot(right, Vector3.up), -1f, 1f)) * Mathf.Rad2Deg;
                if (Mathf.Abs(roll) <= MaxRoll) return;
                var fix = roll - Mathf.Sign(roll) * MaxRoll;
                _head.rotation = Quaternion.AngleAxis(-fix, q * Vector3.forward) * _head.rotation;
            }
            private void OnAnimatorIK(int layer)
            {
                if (layer != 0 || _animator == null) return;
                var head = _animator.GetBoneTransform(HumanBodyBones.Head);
                if (head == null) return;
                var front = transform.forward; front.y = 0f;
                front = front.sqrMagnitude > 1e-6f ? front.normalized : Vector3.forward;
                var to = Target != null ? Target.position - head.position : front;
                var flat = new Vector3(to.x, 0f, to.z);
                var yaw = flat.sqrMagnitude > 1e-6f ? Vector3.SignedAngle(front, flat, Vector3.up) : 0f;
                var pitch = Mathf.Atan2(to.y, Mathf.Max(flat.magnitude, 1e-4f)) * Mathf.Rad2Deg;
                yaw = Mathf.Clamp(yaw, -MaxYaw, MaxYaw); pitch = Mathf.Clamp(pitch, -MaxDown, MaxUp);
                var dir = Quaternion.AngleAxis(yaw, Vector3.up) * front;
                dir = dir * Mathf.Cos(pitch * Mathf.Deg2Rad) + Vector3.up * Mathf.Sin(pitch * Mathf.Deg2Rad);
                var reach = Target != null ? Mathf.Max(1.5f, to.magnitude) : 4f;
                _animator.SetLookAtWeight(1f, BodyWeight, HeadWeight, 1f, 0f);
                _animator.SetLookAtPosition(head.position + dir * reach);
            }
        }

        private static IEnumerator Wait(float s) { for (var t = 0f; t < s; t += Time.deltaTime) yield return null; }

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
            Time.captureDeltaTime = 1f / 60f;
            var root = new GameObject("shoulder probe");
            var flat = GameObject.CreatePrimitive(PrimitiveType.Cube);
            flat.transform.SetParent(root.transform);
            flat.transform.localScale = new Vector3(200f, 1f, 70f); flat.transform.position = new Vector3(0f, -0.5f, 0f);
            var sb = new StringBuilder();
            sb.AppendLine("person,state,side,n,hipsY,spineX,chestX,uchestX,neckX,neckY,headX,clavX,clavY,clavZ,shX,shY,shZ,elX,elY,elZ,a1,leanChest,leanUpper,twistUpper,clavLocalX,clavLocalY,clavLocalZ,waistX,waistAtY,waistMinusSh,pushDeg,spineZ,chestZ,uchestZ,neckZ,headZ,pHipSp,pSpCh,pChUc,pUcNk,pNkHd,clavZuc,clavYuc,shZuc,shYuc,neckRx,neckRy,neckRz");
            var ids = (System.Environment.GetEnvironmentVariable("PROBE_PEOPLE") ?? "Construction_Male_02,Construction_Male_03").Split(',');
            foreach (var id in ids)
            foreach (var mode in new[] { "", "_old" })
            {
                var go = Object.Instantiate(cat.Get(id), Vector3.zero, Quaternion.identity, root.transform);
                var p = RbPeople.Of(id);
                RbDress.Apply(go, RbPeople.DyesFor(p, "gate_" + id, p?.Roles?.FirstOrDefault() ?? "settler", null));
                var a = go.GetComponentInChildren<Animator>();
                var amb = PeopleService.Animate(a, assets.Locomotion, id, p?.Male ?? true);
                a.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                if (amb != null) { amb.MinGap = amb.MaxGap = 1e6f; }
                if (mode == "_old")
                {
                    // (main's gaze in place of the batch's: made from the saved pose as main's was, before the first frame)
                    var gz = a.GetComponent<Gaze>(); if (gz != null) gz.enabled = false;
                    a.gameObject.AddComponent<OldGaze>();
                }
                yield return Wait(1f);   // (after Ambient's Start, which sets the person's own idle)
                var skin = a.GetComponent<BodySkin>();
                var ac = a.GetComponent<ArmClearance>();
                Transform B(HumanBodyBones b) => a.GetBoneTransform(b);
                string state = null;
                var acc = new double[2, 50]; var n = 0;
                var after = a.gameObject.AddComponent<After>();
                after.Do = () =>
                {
                    if (state == null) return;
                    var hips = B(HumanBodyBones.Hips); var inv = Quaternion.Inverse(a.transform.rotation);
                    Vector3 L(Transform t) => t == null ? Vector3.zero : inv * (t.position - hips.position) * 100f;
                    var chest = B(HumanBodyBones.Chest); var uchest = B(HumanBodyBones.UpperChest) ?? chest;
                    for (var s = 0; s < 2; s++)
                    {
                        var left = s == 0;
                        var clav = B(left ? HumanBodyBones.LeftShoulder : HumanBodyBones.RightShoulder);
                        var sh = B(left ? HumanBodyBones.LeftUpperArm : HumanBodyBones.RightUpperArm);
                        var el = B(left ? HumanBodyBones.LeftLowerArm : HumanBodyBones.RightLowerArm);
                        var side = left ? -1f : 1f;
                        // the line between the shoulders' tilt and the chest's lean, in the body's frame (degrees)
                        var up = inv * (uchest.position - chest.position); var lean = Mathf.Atan2(side * up.x, up.y) * Mathf.Rad2Deg;
                        var up2 = inv * (B(HumanBodyBones.Neck).position - uchest.position); var lean2 = Mathf.Atan2(side * up2.x, up2.y) * Mathf.Rad2Deg;
                        var shLine = inv * (B(HumanBodyBones.RightUpperArm).position - B(HumanBodyBones.LeftUpperArm).position);
                        var twist = Mathf.Atan2(-shLine.z, shLine.x) * Mathf.Rad2Deg;
                        var cl = clav.localEulerAngles;
                        // the waist's side under the shoulder: the torso's skin points within 3 cm of the elbow's height, the
                        // furthest out on this side, within 8 cm fore and aft of the elbow
                        float wx = float.MinValue, wy = 0f;
                        if (skin != null && skin.Ready)
                            for (int i = skin.Begin(BodySkin.Part.Torso), e = skin.End(BodySkin.Part.Torso); i < e; i++)
                            {
                                var q = inv * (skin.P[i] - hips.position) * 100f; var le = L(el);
                                if (Mathf.Abs(q.y - le.y) > 3f || Mathf.Abs(q.z - le.z) > 8f) continue;
                                if (side * q.x > wx) { wx = side * q.x; wy = q.y; }
                            }
                        Vector3 Z(HumanBodyBones hb) => L(B(hb));
                        float Pitch(HumanBodyBones a0, HumanBodyBones b0) { var dv = inv * (B(b0).position - B(a0).position); return Mathf.Atan2(dv.z, dv.y) * Mathf.Rad2Deg; }
                        var ucz = L(uchest);
                        var extra = new double[] { Z(HumanBodyBones.Spine).z, L(chest).z, ucz.z, Z(HumanBodyBones.Neck).z, Z(HumanBodyBones.Head).z,
                            Pitch(HumanBodyBones.Hips, HumanBodyBones.Spine), Pitch(HumanBodyBones.Spine, HumanBodyBones.Chest), uchest != chest ? Pitch(HumanBodyBones.Chest, HumanBodyBones.UpperChest) : 0f,
                            Pitch(uchest == chest ? HumanBodyBones.Chest : HumanBodyBones.UpperChest, HumanBodyBones.Neck), Pitch(HumanBodyBones.Neck, HumanBodyBones.Head),
                            L(clav).z - ucz.z, L(clav).y - ucz.y, L(sh).z - ucz.z, L(sh).y - ucz.y,
                            Mathf.DeltaAngle(0f, (Quaternion.Inverse(uchest.rotation) * B(HumanBodyBones.Neck).rotation).eulerAngles.x), Mathf.DeltaAngle(0f, (Quaternion.Inverse(uchest.rotation) * B(HumanBodyBones.Neck).rotation).eulerAngles.y), Mathf.DeltaAngle(0f, (Quaternion.Inverse(uchest.rotation) * B(HumanBodyBones.Neck).rotation).eulerAngles.z) };
                        for (var k = 0; k < extra.Length; k++) acc[s, 27 + k] += extra[k];
                        var vals = new double[] { L(hips).y + hips.position.y * 100f, side * L(B(HumanBodyBones.Spine)).x, side * L(chest).x, side * L(uchest).x, side * L(B(HumanBodyBones.Neck)).x, L(B(HumanBodyBones.Neck)).y, side * L(B(HumanBodyBones.Head)).x,
                            side * L(clav).x, L(clav).y, L(clav).z, side * L(sh).x, L(sh).y, L(sh).z, side * L(el).x, L(el).y, L(el).z, Vector3.Angle(el.position - sh.position, Vector3.down), lean, lean2, twist,
                            Mathf.DeltaAngle(0f, cl.x), Mathf.DeltaAngle(0f, cl.y), Mathf.DeltaAngle(0f, cl.z), wx, wy, wx - side * L(sh).x, ac != null ? ac.Diag[left ? 5 : 11] : 0f };
                        for (var k = 0; k < vals.Length; k++) acc[s, k] += vals[k];
                    }
                    n++;
                };
                for (var idle = 0; idle < 2; idle++)
                {
                    a.SetFloat("Idle", Mathf.Min(idle, Ambient.IdlesOf(a) - 1));
                    yield return Wait(1.2f);
                    System.Array.Clear(acc, 0, acc.Length); n = 0;
                    state = "idle" + idle + mode;
                    yield return Wait(4f);
                    var st = state; state = null;
                    for (var s = 0; s < 2; s++)
                        sb.AppendLine($"{id},{st},{(s == 0 ? "L" : "R")},{n}," + string.Join(",", Enumerable.Range(0, 44).Select(k => (acc[s, k] / Mathf.Max(1, n)).ToString("0.00"))));
                }
                Object.Destroy(go);
                yield return null;
            }
            File.WriteAllText(Path.Combine(Application.dataPath, "../test-results/shoulder_probe.csv"), sb.ToString());
            Object.Destroy(root);
        }
    }
}
