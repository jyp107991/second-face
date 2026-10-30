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
    /// slope across their stance: without <see cref="FootPlant"/> one foot sinks and the other floats; with it each foot
    /// stands on the slope within 2.5 cm of where it stands on flat ground. Their own idle (the "Idle" variant) and a gesture played over the upper body by
    /// name (<see cref="Ambient"/>). Capture `people_motion_slope`. And a ragdoll that falls and stands (`people_ragdoll`).
    /// </summary>
    public class PeopleMotionTests : IPrebuildSetup
    {
        private const string Person = "Assets/SecondFace/Prefabs/people/player_m.prefab";   // a base (P4.13: the cast models retired)
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
            // the same person on flat ground beside the slope: each ankle's own height over the floor in this pose (an idle
            // stands with one heel a little raised, so the two feet are not compared with each other)
            var floor = Made(GameObject.CreatePrimitive(PrimitiveType.Cube));
            floor.name = "flat";
            floor.transform.localScale = new Vector3(3f, 0.2f, 3f);
            floor.transform.position = new Vector3(10f, -0.1f, 0);
            var flat = Stand(new Vector3(10f, 0, 0));
            var bare = Stand(new Vector3(0, 0, -1f));
            var animator = Stand(Vector3.zero);
            var person = animator.gameObject;
            Assert.That(animator.GetLayerIndex(Ambient.GestureLayer), Is.EqualTo(1), "the gesture layer");
            Assert.That(animator.layerCount, Is.EqualTo(2));
            var plant = person.AddComponent<FootPlant>();
            flat.Play(0, 0, 0f); bare.Play(0, 0, 0f); animator.Play(0, 0, 0f);
            yield return Seconds(1.5f);

            var (lf, rf) = Gaps(flat);
            var (l0, r0) = Gaps(bare);
            var (l1, r1) = Gaps(animator);
            Debug.Log($"people_motion: ankle over the ground, flat {lf:0.000} / {rf:0.000} m; on a 14° slope without planting {l0:0.000} / {r0:0.000} m, with {l1:0.000} / {r1:0.000} m; offsets {plant.Offsets}");
            Debug.Log($"people_motion: probed {plant.Probed.Item1} / {plant.Probed.Item2}, ankles {animator.GetBoneTransform(HumanBodyBones.LeftFoot).position} / {animator.GetBoneTransform(HumanBodyBones.RightFoot).position}");
            Assert.That(Mathf.Max(Mathf.Abs(l0 - lf), Mathf.Abs(r0 - rf)), Is.GreaterThan(0.02f), "unplanted, a foot floats over or sinks into the slope");
            Assert.That(Mathf.Abs(l1 - lf), Is.LessThan(0.025f), "planted, the left foot stands on the slope as on flat ground");
            Assert.That(Mathf.Abs(r1 - rf), Is.LessThan(0.025f), "planted, the right foot stands on the slope as on flat ground");

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

        /// <summary>P4.8: the captured motion on three of the cast at set moments (two idles, a walk at two phases, a jog),
        /// each person from the front and the side (`people_motion_frames`). Standing, the hands hang at the thighs; walking,
        /// they swing low, never held up in front (the converted clips once decomposed rotations in the wrong order and
        /// every walk carried its forearms raised).</summary>
        [UnityTest, Timeout(300000)]
        public IEnumerator CapturedMotionHoldsHumanPosesWhenBuilt()
        {
#if UNITY_EDITOR
            var names = new[] { "player_m", "player_f" };
            var prefabs = new List<GameObject>();
            foreach (var n in names) { var p = AssetDatabase.LoadAssetAtPath<GameObject>($"Assets/SecondFace/Prefabs/people/{n}.prefab"); if (p != null) prefabs.Add(p); }
            var controller = AssetDatabase.LoadAssetAtPath<RuntimeAnimatorController>("Assets/SecondFace/People/Locomotion.controller");
            float SpeedOf(string clip)
            {
                var path = $"Assets/SecondFace/Motion/{clip}.json";
                return System.IO.File.Exists(path) ? JsonUtility.FromJson<ClipSidecar>(System.IO.File.ReadAllText(path)).speed : 0f;
            }
            float walk = SpeedOf("walk"), jog = SpeedOf("jog");
#else
            var prefabs = new List<GameObject>(); RuntimeAnimatorController controller = null; float walk = 0f, jog = 0f;
#endif
            if (prefabs.Count == 0 || controller == null) { Assert.Ignore("the cast's prefabs or the locomotion controller are not built"); yield break; }
            var sun = Made(new GameObject("sun")).AddComponent<Light>();
            sun.type = LightType.Directional; sun.intensity = 1.6f; sun.shadows = LightShadows.Soft;
            sun.transform.rotation = Quaternion.Euler(40f, 160f, 0);
            var fill = Made(new GameObject("fill")).AddComponent<Light>();
            fill.type = LightType.Directional; fill.intensity = 0.5f; fill.transform.rotation = Quaternion.Euler(20f, -40f, 0);

            // each person twice: facing the camera (+Z) and turned to show their left side
            var people = new List<Animator>();
            for (var i = 0; i < prefabs.Count; i++)
                for (var k = 0; k < 2; k++)
                {
                    var go = Made(Object.Instantiate(prefabs[i], new Vector3((i * 2 + k) * 0.95f, 0, 0), Quaternion.Euler(0, k == 0 ? 0f : -90f, 0)));
                    var a = go.GetComponent<Animator>();
                    a.runtimeAnimatorController = controller;
                    a.applyRootMotion = false;
                    a.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                    go.AddComponent<Gaze>();   // as in the game: the head held level ahead
                    people.Add(a);
                }
            var cam = Made(new GameObject("camera")).AddComponent<Camera>();
            cam.tag = "MainCamera"; cam.orthographic = true; cam.orthographicSize = 1.05f;
            cam.backgroundColor = new Color(0.32f, 0.33f, 0.35f); cam.clearFlags = CameraClearFlags.SolidColor;
            var mid = (people.Count - 1) * 0.95f * 0.5f;
            cam.transform.position = new Vector3(mid, 0.95f, 8f);
            cam.transform.rotation = Quaternion.LookRotation(Vector3.back);
            yield return null;

            var poses = new (string label, float speed, float idle, float t)[]
            {
                ("idle", 0f, 0f, 0.3f), ("idle_c", 0f, 2f, 0.5f), ("walk 0", walk, 0f, 0f), ("walk 0.5", walk, 0f, 0.5f), ("jog 0.25", jog, 0f, 0.25f),
            };
            const int w = 1600, h = 600;
            var problems = new List<string>();
            var sheet = new Texture2D(w, h * poses.Length, TextureFormat.RGB24, false);
            var rt = new RenderTexture(w, h, 24, RenderTextureFormat.ARGB32);
            for (var p = 0; p < poses.Length; p++)
            {
                var (label, speed, idle, t) = poses[p];
                foreach (var a in people)
                {
                    a.SetFloat("Speed", speed); a.SetFloat("Idle", idle);
                    a.Play("Locomotion", 0, t);
                    a.Update(0f);
                }
                yield return null;
                foreach (var a in people)
                {
                    var hips = a.GetBoneTransform(HumanBodyBones.Hips).position;
                    var chest = (a.GetBoneTransform(HumanBodyBones.Chest) ?? a.GetBoneTransform(HumanBodyBones.Spine)).position;
                    var fwd = a.transform.forward;
                    foreach (var hb in new[] { HumanBodyBones.LeftHand, HumanBodyBones.RightHand })
                    {
                        var hand = a.GetBoneTransform(hb).position;
                        var ahead = Vector3.Dot(hand - hips, fwd);
                        var lower = a.GetBoneTransform(hb == HumanBodyBones.LeftHand ? HumanBodyBones.LeftLowerArm : HumanBodyBones.RightLowerArm).position;
                        var upper = a.GetBoneTransform(hb == HumanBodyBones.LeftHand ? HumanBodyBones.LeftUpperArm : HumanBodyBones.RightUpperArm).position;
                        var elbow = Vector3.Angle(upper - lower, hand - lower);
                        Debug.Log($"people_motion_frames: {label} {a.name} {hb} {hand.y - hips.y:+0.00;-0.00} m over the hips, {ahead:+0.00;-0.00} m ahead, elbow {elbow:0}°");
                        if (speed == 0f)
                        {
                            // standing in the common idle (the others fold the arms, put hands on hips): the hand hangs at
                            // the thigh, beside the body
                            if (idle > 0f) continue;
                            if (hand.y > hips.y + 0.05f) problems.Add($"{label}: {a.name}'s {hb} is {hand.y - hips.y:0.00} m over the hips");
                            if (Mathf.Abs(ahead) > 0.2f) problems.Add($"{label}: {a.name}'s {hb} is {ahead:0.00} m ahead of the hips");
                        }
                        else if (speed < jog * 0.9f && hand.y > chest.y - 0.05f)
                            problems.Add($"{label}: {a.name}'s {hb} is held up in front ({hand.y - chest.y:0.00} m from the chest)");   // walking: swung, not raised
                    }
                }
                var request = new UnityEngine.Rendering.RenderPipeline.StandardRequest { destination = rt };
                if (UnityEngine.Rendering.RenderPipeline.SupportsRenderRequest(cam, request)) UnityEngine.Rendering.RenderPipeline.SubmitRenderRequest(cam, request);
                else { cam.targetTexture = rt; cam.Render(); cam.targetTexture = null; }
                var active = RenderTexture.active;
                RenderTexture.active = rt;
                sheet.ReadPixels(new Rect(0, 0, w, h), 0, (poses.Length - 1 - p) * h);
                RenderTexture.active = active;
            }
            // the walk round its cycle on the first person: each hand ahead of the hips (they must alternate) and the face's
            // pitch against the model's own neutral head (up positive)
            var w0 = people[0];
            var still = Made(Object.Instantiate(prefabs[0], new Vector3(-5f, 0, 0), Quaternion.identity)).GetComponent<Animator>();
            var neutral = FacePitch(still);
            float Face(Animator a) => FacePitch(a) - neutral;
            var phaseLog = new System.Text.StringBuilder($"people_motion_frames: neutral face {neutral:0}°, walk cycle");
            for (var k = 0; k < 8; k++)
            {
                w0.SetFloat("Speed", walk); w0.Play("Locomotion", 0, k / 8f); w0.Update(0f);
                var hips = w0.GetBoneTransform(HumanBodyBones.Hips).position;
                float Ahead(HumanBodyBones b) => Vector3.Dot(w0.GetBoneTransform(b).position - hips, w0.transform.forward);
                phaseLog.Append($" | {k / 8f:0.000}: L {Ahead(HumanBodyBones.LeftHand):+0.00;-0.00} R {Ahead(HumanBodyBones.RightHand):+0.00;-0.00} face {Face(w0):+0;-0}°");
                if (Mathf.Abs(Face(w0)) > 10f) problems.Add($"walk {k / 8f:0.000}: the face is {Face(w0):0}° off level");
            }
            w0.SetFloat("Speed", 0f); w0.SetFloat("Idle", 0f); w0.Play("Locomotion", 0, 0.3f); w0.Update(0f);
            phaseLog.Append($" | idle face {Face(w0):+0;-0}°");
            if (Mathf.Abs(Face(w0)) > 10f) problems.Add($"idle: the face is {Face(w0):0}° off level");
            Debug.Log(phaseLog.ToString());
            sheet.Apply();
            System.IO.File.WriteAllBytes(System.IO.Path.Combine(ScreenshotTests.OutDir(), "people_motion_frames.png"), sheet.EncodeToPNG());
            Object.Destroy(sheet);
            rt.Release(); Object.Destroy(rt);
            Assert.That(problems, Is.Empty, string.Join("\n", problems));
        }

        [System.Serializable]
        private sealed class ClipSidecar { public float speed; }

        /// <summary>The face's pitch in degrees: from the head bone to between the eyes, against the horizontal (up +).</summary>
        private static float FacePitch(Animator a)
        {
            var head = a.GetBoneTransform(HumanBodyBones.Head);
            var l = a.GetBoneTransform(HumanBodyBones.LeftEye); var r = a.GetBoneTransform(HumanBodyBones.RightEye);
            if (head == null || l == null || r == null) return float.NaN;
            var d = (l.position + r.position) * 0.5f - head.position;
            return Mathf.Atan2(d.y, new Vector2(d.x, d.z).magnitude) * Mathf.Rad2Deg;
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
