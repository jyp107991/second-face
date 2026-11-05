using System.Collections;
using System.Collections.Generic;
using System.IO;
using Newtonsoft.Json.Linq;
using NUnit.Framework;
using SecondFace.Core.Dialogue;
using SecondFace.Core.State;
using SecondFace.Game.Play;
using SecondFace.Game.UI;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.TestTools;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace SecondFace.Tests
{
    /// <summary>
    /// The conversation cameras (P5.3e): two of the cast face each other on open ground; the view stays overhead (CLAUDE.md §2) at
    /// the game rig's pitch, frames both of them in the part of the screen the conversation page leaves free, keeps the one
    /// view from line to line, and moves off a wall in its way. Captured with the conversation page drawn over it
    /// (`conversation_twoshot`, `conversation_other`).
    /// </summary>
    public class ConversationCameraTests
    {
        private const string PersonA = "Assets/SecondFace/Prefabs/people/player_m.prefab";   // the bases (P4.13: the cast models retired)
        private const string PersonB = "Assets/SecondFace/Prefabs/people/player_f.prefab";
        private readonly List<Object> _made = new();
        private T Made<T>(T o) where T : Object { _made.Add(o); return o; }

        [UnityTearDown]
        public IEnumerator TearDown()
        {
            foreach (var o in _made) if (o != null) Object.Destroy(o is Component c ? c.gameObject : o);
            _made.Clear();
            yield return null;
        }

        [UnityTest, Timeout(300000)]
        public IEnumerator ShotsFrameThePeopleBesideThePage()
        {
#if UNITY_EDITOR
            var a = AssetDatabase.LoadAssetAtPath<GameObject>(PersonA);
            var b = AssetDatabase.LoadAssetAtPath<GameObject>(PersonB);
            var controller = AssetDatabase.LoadAssetAtPath<RuntimeAnimatorController>("Assets/SecondFace/People/Locomotion.controller");
#else
            GameObject a = null, b = null; RuntimeAnimatorController controller = null;
#endif
            if (a == null || b == null || controller == null) { Assert.Ignore("the cast's prefabs or the locomotion controller are not built"); yield break; }

            var ground = Made(GameObject.CreatePrimitive(PrimitiveType.Cube));
            ground.transform.localScale = new Vector3(14f, 0.2f, 14f);
            ground.transform.position = new Vector3(0, -0.1f, 0);
            var sun = Made(new GameObject("sun")).AddComponent<Light>();
            sun.type = LightType.Directional; sun.intensity = 1.8f; sun.shadows = LightShadows.Soft;
            sun.transform.rotation = Quaternion.Euler(42f, 130f, 0);
            var camGo = Made(new GameObject("camera"));
            camGo.tag = "MainCamera";
            var cam = camGo.AddComponent<Camera>();
            cam.aspect = 1600f / 720f;   // the capture's shape (a 20:9 phone)
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.62f, 0.72f, 0.82f);
            camGo.transform.SetPositionAndRotation(new Vector3(6f, 8f, -6f), Quaternion.Euler(40f, -45f, 0));

            Transform Stand(GameObject prefab, Vector3 at, float yaw)
            {
                var go = Made(Object.Instantiate(prefab, at, Quaternion.Euler(0, yaw, 0)));
                var anim = go.GetComponentInChildren<Animator>();
                anim.runtimeAnimatorController = controller;
                anim.applyRootMotion = false;
                anim.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                return go.transform;
            }
            var player = Stand(a, Vector3.zero, 0f);
            var other = Stand(b, new Vector3(0, 0, 1.4f), 180f);
            yield return null;

            var ui = UiTests.Offscreen(1600, 720, out var uiRt);
            var g = States.NewGame("shale", 0, 0);
            g.Pc.Sheet.Name = "Ash";
            var panel = ui.Open(new DialoguePanel(new DialogueRunner(JObject.Parse(UiTests.Talk).ToObject<DialogueDef>(), g), _ => "Teller Vos") { CharsPerSecond = 0f });

            var shots = Made(ConversationCamera.Begin(cam, player, other, 0f));
            // overhead, always (CLAUDE.md §2): every line keeps the one view over the two of them, at the game rig's pitch
            foreach (var (shot, name) in new[] { (ConversationCamera.Shot.TwoShot, "conversation_twoshot"), (ConversationCamera.Shot.Other, "conversation_other") })
            {
                shots.Cut(shot);
                for (var i = 0; i < 3; i++) yield return null;
                var pitch = Vector3.Angle(Vector3.ProjectOnPlane(cam.transform.forward, Vector3.up), cam.transform.forward);
                Assert.That(cam.transform.forward.y, Is.LessThan(0f), $"{shot}: looking down");
                Assert.That(pitch, Is.InRange(OrbitRig.MinPitch, 72f), $"{shot}: overhead, not eye level ({pitch:0}°)");
                Assert.That(cam.transform.position.y - player.position.y, Is.GreaterThan(4f), $"{shot}: above the people");
                foreach (var who in new[] { player, other })
                {
                    var vp = cam.WorldToViewportPoint(ConversationCamera.Head(who));
                    Assert.That(vp.z, Is.GreaterThan(0f), $"{shot}: {who.name} in front");
                    Assert.That(vp.x, Is.InRange(0.04f, shots.Frame - 0.02f), $"{shot}: {who.name} left of the page");
                    Assert.That(vp.y, Is.InRange(0.15f, 0.9f), $"{shot}: {who.name} in frame");
                }
                var mid = cam.WorldToViewportPoint(shots.Subject);
                Assert.That(mid.x, Is.EqualTo(shots.Frame * 0.5f).Within(0.08f), $"{shot}: centred in the free part");
                Composite(cam, uiRt, name);
            }
            var open = cam.transform.position;
            // a wall where the view stood: it turns round or rises, and still looks down on them
            var wall = Made(GameObject.CreatePrimitive(PrimitiveType.Cube));
            wall.transform.localScale = new Vector3(1.5f, 1.5f, 1.5f);
            wall.transform.position = Vector3.Lerp(open, shots.Subject, 0.4f);
            shots.Cut(ConversationCamera.Shot.TwoShot);
            for (var i = 0; i < 3; i++) yield return null;
            Assert.That(Vector3.Distance(cam.transform.position, open), Is.GreaterThan(1f), "the view moved off the wall");
            Assert.That(cam.transform.forward.y, Is.LessThan(-0.5f), "still overhead");
            shots.End();
            panel.Close();
            Object.Destroy(ui.gameObject);
            uiRt.Release();
        }

        /// <summary>The camera's frame with the interface drawn over it, written as a PNG.</summary>
        private static void Composite(Camera cam, RenderTexture ui, string name)
        {
            var w = ui.width; var h = ui.height;
            var rt = new RenderTexture(w, h, 24, RenderTextureFormat.ARGB32);
            var request = new RenderPipeline.StandardRequest { destination = rt };
            if (RenderPipeline.SupportsRenderRequest(cam, request)) RenderPipeline.SubmitRenderRequest(cam, request);
            else { var prev = cam.targetTexture; cam.targetTexture = rt; cam.Render(); cam.targetTexture = prev; }
            var scene = Read(rt);
            var over = Read(ui);
            var px = scene.GetPixels();
            var up = over.GetPixels();
            for (var i = 0; i < px.Length; i++) px[i] = Color.Lerp(px[i], new Color(up[i].r, up[i].g, up[i].b, 1f), up[i].a);
            scene.SetPixels(px);
            scene.Apply();
            File.WriteAllBytes(Path.Combine(ScreenshotTests.OutDir(), name + ".png"), scene.EncodeToPNG());
            Object.Destroy(scene); Object.Destroy(over);
            rt.Release(); Object.Destroy(rt);
            Debug.Log($"screenshot: {name}.png");
        }

        private static Texture2D Read(RenderTexture rt)
        {
            var t = new Texture2D(rt.width, rt.height, TextureFormat.RGBA32, false);
            var active = RenderTexture.active;
            RenderTexture.active = rt;
            t.ReadPixels(new Rect(0, 0, rt.width, rt.height), 0, 0);
            t.Apply();
            RenderTexture.active = active;
            return t;
        }
    }
}
