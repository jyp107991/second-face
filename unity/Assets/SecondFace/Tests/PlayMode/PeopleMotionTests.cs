using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using SecondFace.Game.People;
using UnityEngine;
using UnityEngine.TestTools;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace SecondFace.Tests
{
    /// <summary>
    /// P4 step 4: people standing on the world's ground and living a little. A person of the cast on a 14° slope, the
    /// slope across their stance: without <see cref="FootPlant"/> one foot sinks and the other floats; with it both feet
    /// meet the ground within 2.5 cm. Their own idle (the "Idle" variant) and a gesture played over the upper body by
    /// name (<see cref="Ambient"/>). Capture `people_motion_slope`. And a ragdoll that falls and stands (`people_ragdoll`).
    /// </summary>
    public class PeopleMotionTests : IPrebuildSetup
    {
        private const string Person = "Assets/SecondFace/Prefabs/people/cast_sal_01.prefab";
        private readonly List<Object> _made = new();

        public void Setup()
        {
#if UNITY_EDITOR
            EditorApplication.ExecuteMenuItem("Second Face/Build locomotion controller");
#endif
        }

        [UnityTearDown]
        public IEnumerator TearDown()
        {
            foreach (var o in _made) if (o != null) Object.Destroy(o);
            _made.Clear();
            yield return null;
        }

        private T Made<T>(T o) where T : Object { _made.Add(o); return o; }

        /// <summary>Game time, not frames: batch-mode frames are a few milliseconds.</summary>
        private static IEnumerator Seconds(float s)
        {
            var t = Time.time;
            while (Time.time - t < s) yield return null;
        }

        /// <summary>Each foot's ankle height over the ground under it (left, right), m.</summary>
        private static (float, float) Gaps(Animator a)
        {
            float Gap(HumanBodyBones bone)
            {
                var foot = a.GetBoneTransform(bone).position;
                return Physics.Raycast(foot + Vector3.up * 1f, Vector3.down, out var hit, 3f) ? foot.y - hit.point.y : float.NaN;
            }
            return (Gap(HumanBodyBones.LeftFoot), Gap(HumanBodyBones.RightFoot));
        }

        [UnityTest, Timeout(300000)]
        public IEnumerator FeetMeetASlopeAndGesturesPlay()
        {
#if UNITY_EDITOR
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(Person);
            var controller = AssetDatabase.LoadAssetAtPath<RuntimeAnimatorController>("Assets/SecondFace/People/Locomotion.controller");
#else
            GameObject prefab = null; RuntimeAnimatorController controller = null;
#endif
            if (prefab == null || controller == null) { Assert.Ignore("the cast's prefabs or the locomotion controller are not built"); yield break; }

            // the slope falls to +X: the person faces +Z, so their left foot (−X) stands higher than the right
            var ground = Made(GameObject.CreatePrimitive(PrimitiveType.Cube));
            ground.name = "slope";
            ground.transform.localScale = new Vector3(8f, 0.2f, 8f);
            ground.transform.rotation = Quaternion.Euler(0, 0, -14f);
            ground.transform.position = new Vector3(0, -0.1f / Mathf.Cos(14f * Mathf.Deg2Rad), 0);
            var sun = Made(new GameObject("sun")).AddComponent<Light>();
            sun.type = LightType.Directional; sun.intensity = 1.6f; sun.shadows = LightShadows.Soft;
            sun.transform.rotation = Quaternion.Euler(40f, 150f, 0);

            // two of the same person in step, the same ground under each (the slope runs across X): one planted
            Animator Stand(Vector3 at)
            {
                var a = Made(Object.Instantiate(prefab, at, Quaternion.identity)).GetComponent<Animator>();
                a.runtimeAnimatorController = controller;
                a.applyRootMotion = false;
                a.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                a.SetFloat("Idle", 0f);
                return a;
            }
            var bare = Stand(new Vector3(0, 0, -1f));
            var animator = Stand(Vector3.zero);
            var person = animator.gameObject;
            Assert.That(animator.GetLayerIndex(Ambient.GestureLayer), Is.EqualTo(1), "the gesture layer");
            Assert.That(animator.layerCount, Is.EqualTo(2));
            var plant = person.AddComponent<FootPlant>();
            bare.Play(0, 0, 0f); animator.Play(0, 0, 0f);
            yield return Seconds(1.5f);

            var (l0, r0) = Gaps(bare);
            var (l1, r1) = Gaps(animator);
            Debug.Log($"people_motion: ankle over the ground on a 14° slope, without planting {l0:0.000} / {r0:0.000} m, with {l1:0.000} / {r1:0.000} m; offsets {plant.Offsets}");
            Debug.Log($"people_motion: probed {plant.Probed.Item1} / {plant.Probed.Item2}, ankles {animator.GetBoneTransform(HumanBodyBones.LeftFoot).position} / {animator.GetBoneTransform(HumanBodyBones.RightFoot).position}");
            Assert.That(Mathf.Abs(l0 - r0), Is.GreaterThan(0.03f), "unplanted, the feet stand at different heights over the slope");
            Assert.That(Mathf.Abs(l1 - r1), Is.LessThan(0.025f), "planted, both feet meet the ground alike");
            Assert.That(Mathf.Min(l1, r1), Is.GreaterThan(0.02f), "no foot sinks into the slope");

            // a gesture over the upper body, by name
            var ambient = person.AddComponent<Ambient>();
            ambient.MinGap = ambient.MaxGap = 1000f;   // no gestures of its own during the test
            yield return null;
            Assert.That(ambient.Gesture("wave"), Is.True, "the wave state");
            Assert.That(ambient.Gesture("no-such-gesture"), Is.False);
            yield return Seconds(0.8f);
            var g = animator.GetCurrentAnimatorStateInfo(1);
            var n = animator.GetNextAnimatorStateInfo(1);
            Assert.That(g.IsName("wave") || n.IsName("wave"), Is.True, "waving on the gesture layer");
            Assert.That(animator.GetLayerWeight(1), Is.GreaterThan(0.9f), "the gesture layer weighs in while it plays");

            var cam = Made(new GameObject("camera")).AddComponent<Camera>();
            cam.tag = "MainCamera"; cam.fieldOfView = 32f;
            cam.backgroundColor = new Color(0.32f, 0.33f, 0.35f); cam.clearFlags = CameraClearFlags.SolidColor;
            cam.transform.position = new Vector3(2.6f, 1.3f, 3.2f);   // from the front and to the low side: both people whole
            cam.transform.LookAt(new Vector3(0, 0.75f, -0.5f));
            yield return null;
            yield return ScreenshotTests.Capture("people_motion_slope", 1200, 900);
        }

        /// <summary>P4 step 5: a push to the chest and the body falls on the ground (none of it through), settles, and the
        /// person stands again under their hips, the animation back on (`people_ragdoll`).</summary>
        [UnityTest, Timeout(300000)]
        public IEnumerator ARagdollFallsSettlesAndStandsAgain()
        {
#if UNITY_EDITOR
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(Person);
            var controller = AssetDatabase.LoadAssetAtPath<RuntimeAnimatorController>("Assets/SecondFace/People/Locomotion.controller");
#else
            GameObject prefab = null; RuntimeAnimatorController controller = null;
#endif
            if (prefab == null || controller == null) { Assert.Ignore("the cast's prefabs or the locomotion controller are not built"); yield break; }
            var ground = Made(GameObject.CreatePrimitive(PrimitiveType.Cube));
            ground.name = "floor";
            ground.transform.localScale = new Vector3(10f, 0.2f, 10f);
            ground.transform.position = new Vector3(0, -0.1f, 0);
            var sun = Made(new GameObject("sun")).AddComponent<Light>();
            sun.type = LightType.Directional; sun.intensity = 1.6f; sun.shadows = LightShadows.Soft;
            sun.transform.rotation = Quaternion.Euler(40f, 150f, 0);

            var person = Made(Object.Instantiate(prefab, Vector3.zero, Quaternion.identity));
            var animator = person.GetComponent<Animator>();
            animator.runtimeAnimatorController = controller;
            animator.applyRootMotion = false;
            animator.cullingMode = AnimatorCullingMode.AlwaysAnimate;
            var ragdoll = person.AddComponent<Ragdoll>();
            yield return Seconds(0.5f);

            var chest = animator.GetBoneTransform(HumanBodyBones.Chest) ?? animator.GetBoneTransform(HumanBodyBones.Spine);
            ragdoll.Fall(new Vector3(0, 8f, -55f), chest.position);
            Assert.That(ragdoll.Fallen, Is.True);
            Assert.That(animator.enabled, Is.False, "the animation hands the body to physics");
            Assert.That(ragdoll.Bodies.Count, Is.GreaterThanOrEqualTo(10), "a body per part");
            var lowest = float.MaxValue;
            var t0 = Time.time;
            while (Time.time - t0 < 3f)
            {
                foreach (var b in ragdoll.Bodies) lowest = Mathf.Min(lowest, b.worldCenterOfMass.y);
                yield return null;
            }
            var hips = ragdoll.Hips;
            Debug.Log($"people_ragdoll: hips at {hips.position}, still at {hips.linearVelocity.magnitude:0.00} m/s, the lowest part's centre {lowest:0.000} m");
            Assert.That(hips.position.y, Is.LessThan(0.45f), "lying down");
            Assert.That(lowest, Is.GreaterThan(-0.02f), "no part through the ground");
            Assert.That(hips.linearVelocity.magnitude, Is.LessThan(0.3f), "settled");

            var cam = Made(new GameObject("camera")).AddComponent<Camera>();
            cam.tag = "MainCamera"; cam.fieldOfView = 35f;
            cam.backgroundColor = new Color(0.32f, 0.33f, 0.35f); cam.clearFlags = CameraClearFlags.SolidColor;
            cam.transform.position = hips.position + new Vector3(2.6f, 1.6f, 1.2f);
            cam.transform.LookAt(hips.position);
            yield return null;
            yield return ScreenshotTests.Capture("people_ragdoll", 1200, 900);

            ragdoll.StandUp();
            Assert.That(ragdoll.Fallen, Is.False);
            yield return Seconds(1.2f);
            Assert.That(ragdoll.Blending, Is.False, "the blend back has ended");
            Assert.That(animator.enabled, Is.True);
            Assert.That(animator.GetBoneTransform(HumanBodyBones.Hips).position.y, Is.GreaterThan(0.75f), "standing again");
        }
    }
}
