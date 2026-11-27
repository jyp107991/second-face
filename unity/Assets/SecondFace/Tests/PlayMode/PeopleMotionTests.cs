using System.Collections;
using System.Collections.Generic;
using System.Linq;
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
            // (planted too: compared with the clip's own feet on flat ground, which the idles hold 3-6 cm up on these bodies, a
            // planted foot on the slope read 3.5 cm off, 2026-11-16)
            flat.gameObject.AddComponent<FootPlant>();
            var bare = Stand(new Vector3(0, 0, -1f));
            var animator = Stand(Vector3.zero);
            var person = animator.gameObject;
            Assert.That(animator.GetLayerIndex(Ambient.GestureLayer), Is.EqualTo(1), "the gesture layer");
            // (the people's controller carries the fight's layers over these two since the fight's motion went on it: a count
            // of 2 failed here before anything was measured, 2026-11-27)
            Assert.That(animator.GetLayerIndex(SecondFace.Core.Combat.CombatMotion.FullLayer), Is.GreaterThan(1), "the fight's whole-body layer, over the gestures");
            Assert.That(animator.GetLayerIndex(SecondFace.Core.Combat.CombatMotion.ArmsLayer), Is.GreaterThan(1), "the fight's arms layer, over the gestures");
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
                ("idle", 0f, 0f, 0.3f), ("idle 1", 0f, 1f, 0.5f), ("walk 0", walk, 0f, 0f), ("walk 0.5", walk, 0f, 0.5f), ("jog 0.25", jog, 0f, 0.25f),
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
                    // (ahead of the hip joints' middle, the anatomy a real person's hand is measured from: MakeHuman's rig, the
                    // player's, puts its Hips bone toward the sacrum, 5.8-8.2 cm behind the hip joints, where the cast's Biped
                    // stands it on their line within 0.5 cm; docs/MOTION_ROOT_CAUSE.md §17, 2026-11-27)
                    var joints = (a.GetBoneTransform(HumanBodyBones.LeftUpperLeg).position + a.GetBoneTransform(HumanBodyBones.RightUpperLeg).position) * 0.5f;
                    var chest = (a.GetBoneTransform(HumanBodyBones.Chest) ?? a.GetBoneTransform(HumanBodyBones.Spine)).position;
                    var fwd = a.transform.forward;
                    foreach (var hb in new[] { HumanBodyBones.LeftHand, HumanBodyBones.RightHand })
                    {
                        var hand = a.GetBoneTransform(hb).position;
                        var ahead = Vector3.Dot(hand - joints, fwd);
                        var aheadOfBone = Vector3.Dot(hand - hips, fwd);
                        var lower = a.GetBoneTransform(hb == HumanBodyBones.LeftHand ? HumanBodyBones.LeftLowerArm : HumanBodyBones.RightLowerArm).position;
                        var upper = a.GetBoneTransform(hb == HumanBodyBones.LeftHand ? HumanBodyBones.LeftUpperArm : HumanBodyBones.RightUpperArm).position;
                        var elbow = Vector3.Angle(upper - lower, hand - lower);
                        Debug.Log($"people_motion_frames: {label} {a.name} {hb} {hand.y - hips.y:+0.00;-0.00} m over the hips, {ahead:+0.000;-0.000} m ahead of the hip joints ({aheadOfBone:+0.000;-0.000} of the Hips bone), elbow {elbow:0}°");
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
            // the walk round its cycle on the first person: each hand ahead of the hip joints (they must alternate) and the
            // face's pitch against the model's own neutral head (up positive). Each phase is read as the game shows it, after the
            // frame's LateUpdate, the clip held at its phase (the animator's speed 0): Gaze turns the head at its own joint there
            // (2026-11-26), not in the animator's IK pass, so a pose read straight after Animator.Update(0) is the bare clip with
            // no Gaze in it (docs/MOTION_ROOT_CAUSE.md §17)
            var w0 = people[0];
            var still = Made(Object.Instantiate(prefabs[0], new Vector3(-5f, 0, 0), Quaternion.identity)).GetComponent<Animator>();
            var neutral = FacePitch(still);
            float Face(Animator a) => FacePitch(a) - neutral;
            // and Gaze's own face (its front in the head's frame, Gaze.Neutral) against the eyes': on a rig with eye bones the two
            // agree within 3° in pitch and in yaw (the eye line is the anatomical measure; on the player's models Gaze's front
            // was the back of the head, its pitch read the wrong way round, 2026-11-27, docs/MOTION_ROOT_CAUSE.md §17)
            var phaseLog = new System.Text.StringBuilder($"people_motion_frames: neutral face {neutral:0}°, walk cycle");
            var gaze = w0.GetComponent<Gaze>();
            void Agree(string at)
            {
                var yaw = EyeYaw(w0);
                if (float.IsNaN(yaw) || gaze == null) return;
                var f = Quaternion.Inverse(w0.transform.rotation) * (w0.GetBoneTransform(HumanBodyBones.Head).rotation * gaze.FaceReference * Vector3.forward);
                var gp = Mathf.Asin(Mathf.Clamp(f.y, -1f, 1f)) * Mathf.Rad2Deg; var gy = Mathf.Atan2(f.x, f.z) * Mathf.Rad2Deg;
                phaseLog.Append($" (eyes' yaw {yaw:+0.0;-0.0}°, Gaze's face {gp:+0.0;-0.0}° / {gy:+0.0;-0.0}°)");
                if (Mathf.Abs(Face(w0) - gp) > 3f || Mathf.Abs(Mathf.DeltaAngle(yaw, gy)) > 3f)
                    problems.Add($"{at}: Gaze's face (pitch {gp:0.0}°, yaw {gy:0.0}°) and the eyes' (pitch {Face(w0):0.0}°, yaw {yaw:0.0}°) disagree");
            }
            for (var k = 0; k < 8; k++)
            {
                w0.speed = 1f; w0.SetFloat("Speed", walk); w0.Play("Locomotion", 0, k / 8f); w0.Update(0f);
                w0.speed = 0f;
                yield return null;
                var hips = (w0.GetBoneTransform(HumanBodyBones.LeftUpperLeg).position + w0.GetBoneTransform(HumanBodyBones.RightUpperLeg).position) * 0.5f;
                float Ahead(HumanBodyBones b) => Vector3.Dot(w0.GetBoneTransform(b).position - hips, w0.transform.forward);
                phaseLog.Append($" | {k / 8f:0.000}: L {Ahead(HumanBodyBones.LeftHand):+0.00;-0.00} R {Ahead(HumanBodyBones.RightHand):+0.00;-0.00} face {Face(w0):+0.0;-0.0}°");
                if (Mathf.Abs(Face(w0)) > 10f) problems.Add($"walk {k / 8f:0.000}: the face is {Face(w0):0}° off level");
                Agree($"walk {k / 8f:0.000}");
            }
            w0.speed = 1f; w0.SetFloat("Speed", 0f); w0.SetFloat("Idle", 0f); w0.Play("Locomotion", 0, 0.3f); w0.Update(0f);
            w0.speed = 0f;
            yield return null;
            phaseLog.Append($" | idle face {Face(w0):+0.0;-0.0}°");
            Agree("idle");
            w0.speed = 1f;
            if (Mathf.Abs(Face(w0)) > 10f) problems.Add($"idle: the face is {Face(w0):0}° off level");
            Debug.Log(phaseLog.ToString());
            sheet.Apply();
            System.IO.File.WriteAllBytes(System.IO.Path.Combine(ScreenshotTests.OutDir(), "people_motion_frames.png"), sheet.EncodeToPNG());
            Object.Destroy(sheet);
            rt.Release(); Object.Destroy(rt);
            Assert.That(problems, Is.Empty, string.Join("\n", problems));
        }

        /// <summary>
        /// A person is made where the world puts them, far from its origin and turned (Shale stands 16 km out; the game turns
        /// each townsperson its own way): Gaze's read of the face's neutral front in Awake (the avatar's neutral pose, every
        /// muscle at nought) leaves the skeleton as it found it (the hips on the root's own offset as at the origin, within 1 cm;
        /// the body's mesh bounds round the body: culled, a townsperson whose pelvis was put 16 km off by that read was never
        /// drawn and never animated, 2026-11-27), and the face reference is the one it has at the origin square to the world
        /// (on 71ba0e5b's Gaze a 137° turn read the face's front 110° off). A walker made on the navigation mesh, turned, keeps
        /// its agent where it was placed. docs/MOTION_ROOT_CAUSE.md §17.
        /// </summary>
        [UnityTest, Timeout(300000)]
        public IEnumerator APersonMadeAnywhereKeepsTheirBodyAndFace()
        {
#if UNITY_EDITOR
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/SecondFace/People/Rocketbox/Male_Adult_03/Male_Adult_03.prefab");
            var controller = AssetDatabase.LoadAssetAtPath<RuntimeAnimatorController>("Assets/SecondFace/People/Locomotion.controller");
#else
            GameObject prefab = null; RuntimeAnimatorController controller = null;
#endif
            if (prefab == null || controller == null) { Assert.Ignore("the cast's prefabs or the locomotion controller are not built"); yield break; }
            var far = new Vector3(15000f, 40f, 4000f);
            // (as the game makes a townsperson: PeopleService.Make's instance, then its animation)
            Animator Townsperson(Vector3 at, float yaw)
            {
                var go = Made(Object.Instantiate(prefab, at, Quaternion.Euler(0f, yaw, 0f)));
                var a = go.GetComponentInChildren<Animator>();
                SecondFace.Game.Play.PeopleService.Animate(a, controller, "npc_gaze_test", true);
                return a;
            }
            var home = Townsperson(Vector3.zero, 0f);
            var there = Townsperson(far, 137f);
            for (var i = 0; i < 4; i++) yield return null;
            var problems = new List<string>();
            Vector3 Hips(Animator a) => a.transform.InverseTransformPoint(a.GetBoneTransform(HumanBodyBones.Hips).position);
            var off = Vector3.Distance(Hips(home), Hips(there));
            if (off > 0.01f) problems.Add($"the hips stand {off:0.000} m from their place on the root (at the origin {Hips(home)}, there {Hips(there)})");
            foreach (var (who, a) in new[] { ("at the origin", home), ("far and turned", there) })
            {
                SkinnedMeshRenderer body = null;
                foreach (var r in a.GetComponentsInChildren<SkinnedMeshRenderer>())
                    if (r.sharedMesh != null && (body == null || r.sharedMesh.vertexCount > body.sharedMesh.vertexCount)) body = r;
                Assert.That(body, Is.Not.Null, "the body's mesh");
                // (round the body where the game placed the person: the bounds hang from the pelvis, and went with it)
                var middle = a.transform.position + a.transform.up * 0.9f;
                if (!body.bounds.Contains(middle)) problems.Add($"{who}: the body's bounds (centre {body.bounds.center}, size {body.bounds.size}) leave out where the person stands ({middle})");
                foreach (var b in new[] { HumanBodyBones.Hips, HumanBodyBones.Head, HumanBodyBones.LeftFoot, HumanBodyBones.RightFoot, HumanBodyBones.LeftHand, HumanBodyBones.RightHand })
                    if (!body.bounds.Contains(a.GetBoneTransform(b).position))
                        problems.Add($"{who}: the body's bounds (centre {body.bounds.center}, size {body.bounds.size}) leave out the {b} at {a.GetBoneTransform(b).position}");
            }
            var face = Quaternion.Angle(home.GetComponent<Gaze>().FaceReference, there.GetComponent<Gaze>().FaceReference);
            if (face > 0.1f) problems.Add($"Gaze's face reference stands {face:0.0}° from the one it has at the origin square to the world");
            // a walker on the navigation mesh there, turned: its agent where it was placed, on the mesh
            var source = new UnityEngine.AI.NavMeshBuildSource
            {
                shape = UnityEngine.AI.NavMeshBuildSourceShape.Box, size = new Vector3(24f, 0.2f, 24f),
                transform = Matrix4x4.TRS(far + Vector3.down * 0.1f, Quaternion.identity, Vector3.one), area = 0,
            };
            var data = UnityEngine.AI.NavMeshBuilder.BuildNavMeshData(UnityEngine.AI.NavMesh.GetSettingsByID(0), new List<UnityEngine.AI.NavMeshBuildSource> { source },
                new Bounds(far, new Vector3(30f, 8f, 30f)), Vector3.zero, Quaternion.identity);
            var mesh = UnityEngine.AI.NavMesh.AddNavMeshData(data);
            try
            {
                // (where the agent stands on the mesh: its surface, as baked, stands a few centimetres over the box's top)
                Assert.That(UnityEngine.AI.NavMesh.SamplePosition(far + new Vector3(2f, 0f, 1f), out var hit, 1f, UnityEngine.AI.NavMesh.AllAreas), Is.True, "the navigation mesh there");
                var place = hit.position;
                var walker = SecondFace.Game.Play.Walker.Create(prefab, controller, place, 137f, true);
                Made(walker.gameObject);
                var agent = walker.Agent;
                if (!agent.isOnNavMesh) problems.Add("the walker's agent is off the navigation mesh");
                if (Vector3.Distance(agent.nextPosition, place) > 0.01f) problems.Add($"the walker's agent stands at {agent.nextPosition}, placed at {place}");
                if (Vector3.Distance(walker.transform.position, place) > 0.01f || Quaternion.Angle(walker.transform.rotation, Quaternion.Euler(0f, 137f, 0f)) > 0.1f)
                    problems.Add($"the walker stands at {walker.transform.position}, turned {walker.transform.eulerAngles.y:0.0}°, placed at {place}, 137°");
                for (var i = 0; i < 4; i++) yield return null;
                if (!agent.isOnNavMesh || Vector3.Distance(walker.transform.position, place) > 0.01f) problems.Add($"four frames on, the walker stands at {walker.transform.position} (on the mesh: {agent.isOnNavMesh})");
                var hw = Vector3.Distance(Hips(walker.Animator), Hips(home));
                Debug.Log($"people_gaze_placed: hips {off * 100f:0.00} cm apart on the root; the face reference {face:0.00}° apart; the walker at {walker.transform.position}, its agent {agent.nextPosition}, hips {hw * 100f:0.0} cm from the townsperson's on the root");
            }
            finally { mesh.Remove(); }
            Assert.That(problems, Is.Empty, string.Join("\n", problems));
        }

        /// <summary>
        /// Seated, a person's arms stay out of their body as a standing person's do (BootTests.ArmsStayOutOfTheBody: at most
        /// 1.2 cm in, by the arm clearance's own reading of the drawn body): the walker as the game makes them (Walker.Create,
        /// on the navigation mesh) on two of the cast's bodies, sat down by Walker.Sit in each of the base layer's sits (the
        /// controller's states tagged "sit": a chair, a stool, the ground) and held there; seated, the walker's foot plant and arm
        /// clearance are off (the hands rest on the lap), so this reads the sits as they play.
        /// </summary>
        [UnityTest, Timeout(600000)]
        public IEnumerator SeatedArmsStayOutOfTheBody()
        {
#if UNITY_EDITOR
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            var controller = AssetDatabase.LoadAssetAtPath<UnityEditor.Animations.AnimatorController>("Assets/SecondFace/People/Locomotion.controller");
#else
            RocketboxCatalog cat = null; RuntimeAnimatorController controller = null;
#endif
            if (cat == null || controller == null) { Assert.Ignore("the cast's catalogue or the locomotion controller are not built"); yield break; }
            var sits = new List<string>();
#if UNITY_EDITOR
            foreach (var c in controller.layers[0].stateMachine.states) if (c.state.tag == "sit") sits.Add(c.state.name);
#endif
            sits.Sort(System.StringComparer.Ordinal);
            var ground = Made(GameObject.CreatePrimitive(PrimitiveType.Cube));
            ground.transform.localScale = new Vector3(20f, 1f, 20f); ground.transform.position = new Vector3(0f, -0.5f, 0f);
            var source = new UnityEngine.AI.NavMeshBuildSource
            {
                shape = UnityEngine.AI.NavMeshBuildSourceShape.Box, size = new Vector3(20f, 1f, 20f),
                transform = Matrix4x4.TRS(new Vector3(0f, -0.5f, 0f), Quaternion.identity, Vector3.one), area = 0,
            };
            var data = UnityEngine.AI.NavMeshBuilder.BuildNavMeshData(UnityEngine.AI.NavMesh.GetSettingsByID(0), new List<UnityEngine.AI.NavMeshBuildSource> { source },
                new Bounds(Vector3.zero, new Vector3(24f, 6f, 24f)), Vector3.zero, Quaternion.identity);
            var mesh = UnityEngine.AI.NavMesh.AddNavMeshData(data);
            var problems = new List<string>(); var report = new List<string>();
            try
            {
                Assert.That(sits.Count, Is.EqualTo(3), "the base layer's sits, tagged \"sit\" (" + string.Join(", ", sits) + ")");
                foreach (var id in new[] { "Female_Adult_01", "Male_Adult_08" })
                {
                    var prefab = cat.Get(id);
                    if (prefab == null) { problems.Add($"{id}: not in the catalogue"); continue; }
                    var p = SecondFace.Core.Npc.RbPeople.Of(id);
                    UnityEngine.AI.NavMesh.SamplePosition(Vector3.zero, out var hit, 2f, UnityEngine.AI.NavMesh.AllAreas);
                    var walker = SecondFace.Game.Play.Walker.Create(prefab, controller, hit.position, 0f, p?.Male ?? id.Contains("Male"));
                    Made(walker.gameObject);
                    RbDress.Apply(walker.gameObject, SecondFace.Core.Npc.RbPeople.DyesFor(p, "walker_" + id, p?.Roles?.FirstOrDefault() ?? "settler", null));
                    var clear = walker.Animator.GetComponent<ArmClearance>();
                    yield return Seconds(0.5f);
                    Assert.That(clear != null && clear.Ready, Is.True, $"{id}: the arm clearance reads the body");
                    foreach (var sit in sits)
                    {
                        walker.Sit(sit, walker.transform.position, 0f);
                        yield return Seconds(1.2f);
                        var deepest = 0f; var where = "";
                        var t = Time.time;
                        while (Time.time - t < 2f) { yield return null; var d = clear.Depth(); if (d > deepest) { deepest = d; where = clear.DepthWhere; } }
                        report.Add($"{id} {sit}: {deepest * 100f:0.0} cm" + (deepest >= 0.008f ? $" ({where})" : ""));
                        if (deepest >= 0.012f) problems.Add($"{id} seated ({sit}): the arms {deepest * 100f:0.0} cm in the body ({where})");
                        walker.Stand();
                        yield return Seconds(1f);
                    }
                }
            }
            finally { mesh.Remove(); }
            Debug.Log("people_seated_arms: " + string.Join("; ", report));
            Assert.That(problems, Is.Empty, string.Join("\n", problems) + "\n" + string.Join("; ", report));
        }

        [System.Serializable]
        private sealed class ClipSidecar { public float speed; }

        /// <summary>Where the eyes look round the vertical, degrees from the body's front (the line square to the one between
        /// them, in the root's frame); NaN on a rig without eye bones.</summary>
        private static float EyeYaw(Animator a)
        {
            var l = a.GetBoneTransform(HumanBodyBones.LeftEye); var r = a.GetBoneTransform(HumanBodyBones.RightEye);
            if (l == null || r == null) return float.NaN;
            var across = Quaternion.Inverse(a.transform.rotation) * (r.position - l.position);
            var ahead = Vector3.Cross(across, Vector3.up);
            return Mathf.Atan2(ahead.x, ahead.z) * Mathf.Rad2Deg;
        }

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
