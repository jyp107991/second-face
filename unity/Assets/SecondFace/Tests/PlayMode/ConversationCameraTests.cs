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
    /// The conversation cameras (P5.3e): two of the cast face each other on open ground; the two-shot over the player's
    /// shoulder, the insert on the other and its reverse each frame their subject in the part of the screen the
    /// conversation page leaves free, at eye height, with nothing in the way; a wall where the first two-shot would
    /// stand moves it to the other shoulder. Each shot is captured with the conversation page drawn over it
    /// (`conversation_twoshot`, `conversation_other`, `conversation_player`).
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
            foreach (var (shot, name) in new[] { (ConversationCamera.Shot.TwoShot, "conversation_twoshot"), (ConversationCamera.Shot.Other, "conversation_other"), (ConversationCamera.Shot.Player, "conversation_player") })
            {
                shots.Cut(shot);
                for (var i = 0; i < 3; i++) yield return null;
                var vp = cam.WorldToViewportPoint(shots.Subject);
                Assert.That(vp.z, Is.GreaterThan(0f), $"{shot}: the subject is in front");
                Assert.That(vp.x, Is.InRange(0.05f, shots.Frame - 0.05f), $"{shot}: the subject is left of the page");
                Assert.That(vp.x, Is.EqualTo(shots.Frame * 0.5f).Within(0.08f), $"{shot}: centred in the free part");
                Assert.That(vp.y, Is.EqualTo(shots.EyeLine).Within(0.06f), $"{shot}: the eyes on the upper third");
                Composite(cam, uiRt, name);
            }
            shots.Cut(ConversationCamera.Shot.TwoShot);
            for (var i = 0; i < 3; i++) yield return null;
            var open = cam.transform.position;
            // a wall where the two-shot stood: it moves to the other shoulder
            var wall = Made(GameObject.CreatePrimitive(PrimitiveType.Cube));
            wall.transform.localScale = new Vector3(0.6f, 3f, 0.6f);
            wall.transform.position = open;
            shots.Cut(ConversationCamera.Shot.TwoShot);
            for (var i = 0; i < 3; i++) yield return null;
            var right = Vector3.Cross(Vector3.up, (other.position - player.position).normalized);
            Assert.That(Vector3.Dot(cam.transform.position - player.position, right) * Vector3.Dot(open - player.position, right), Is.LessThan(0f), "the shot moved to the other shoulder");
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
