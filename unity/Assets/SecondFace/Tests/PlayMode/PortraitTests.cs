using System.Collections;
using System.Linq;
using NUnit.Framework;
using SecondFace.Game;
using SecondFace.Game.People;
using UnityEngine;
using UnityEngine.TestTools;

namespace SecondFace.Tests
{
    /// <summary>
    /// Every speaker's portrait shows their face (play-ch1 T41: a townsperson's showed her jacket). For each person standing
    /// in Knock, the portrait is made as a conversation makes it, and the face (13 cm under the top of the skull as the body is
    /// drawn, found from the baked skinned mesh, independent of the head bone the portrait aims by) must fall in the middle
    /// of the studio camera's view. Logs both heights for every person; captures portraits_knock.png.
    /// </summary>
    public class PortraitTests
    {
        private static IEnumerator Wait(float seconds) { var t = Time.realtimeSinceStartup; while (Time.realtimeSinceStartup - t < seconds) yield return null; }

        [UnityTest, Timeout(600000)]
        public IEnumerator EverySpeakersPortraitShowsTheirFace()
        {
            Bootstrap boot = null;
            yield return KnockTests.NewGame(b => boot = b);
            yield return Wait(2f);
            var walk = boot.Walkabout;
            var people = walk.People.StandingPeople.Where(p => p.GetComponentInChildren<Animator>() != null).Take(10).ToList();
            Assert.That(people.Count, Is.GreaterThanOrEqualTo(3), "people stand in Knock");
            var bad = new System.Collections.Generic.List<string>();
            var shots = new System.Collections.Generic.List<Texture2D>();
            foreach (var p in people)
            {
                Portraits.Forget(p.gameObject);
                var rt = Portraits.Of(p.gameObject);
                Assert.That(rt, Is.Not.Null, p.name);
                var cam = Studio.Camera;
                var top = Top(p.gameObject);
                var anim = p.GetComponentInChildren<Animator>();
                var head = anim.isHuman ? anim.GetBoneTransform(HumanBodyBones.Head) : null;
                var root = p.transform.position.y;
                Debug.Log($"PortraitTests: {p.Def?.Id ?? p.name}: head bone {(head != null ? head.position.y - root : -1):0.00} m, skull top {(top ?? root) - root:0.00} m, camera at {cam.transform.position.y - root:0.00} m, culling {anim.cullingMode}, visible {p.GetComponentsInChildren<Renderer>().Any(r => r.isVisible)}");
                if (top != null)
                {
                    var face = new Vector3(head != null ? head.position.x : p.transform.position.x, top.Value - 0.13f, head != null ? head.position.z : p.transform.position.z);
                    var v = cam.WorldToViewportPoint(face);
                    if (v.z <= 0 || v.x < 0.3f || v.x > 0.7f || v.y < 0.3f || v.y > 0.75f) bad.Add($"{p.Def?.Id ?? p.name}: the face at ({v.x:0.00}, {v.y:0.00}) of the portrait");
                }
                var prev = RenderTexture.active; RenderTexture.active = rt;
                var tex = new Texture2D(rt.width, rt.height, TextureFormat.RGB24, false);
                tex.ReadPixels(new Rect(0, 0, rt.width, rt.height), 0, 0); tex.Apply();
                RenderTexture.active = prev;
                shots.Add(tex);
                yield return null;
            }
            // a sheet of them, for the review
            var size = shots[0].width;
            var sheet = new Texture2D(size * shots.Count, size, TextureFormat.RGB24, false);
            for (var i = 0; i < shots.Count; i++) sheet.SetPixels(i * size, 0, size, size, shots[i].GetPixels());
            sheet.Apply();
            System.IO.File.WriteAllBytes(System.IO.Path.Combine(ScreenshotTests.OutDir(), "portraits_knock.png"), sheet.EncodeToPNG());
            Assert.That(bad, Is.Empty, "portraits that miss the face:\n" + string.Join("\n", bad));
        }

        /// <summary>The top of the skull as drawn (the largest skinned mesh baked, within 25 cm of the head's line).</summary>
        private static float? Top(GameObject person)
        {
            var body = person.GetComponentsInChildren<SkinnedMeshRenderer>().Where(r => r.sharedMesh != null && r.enabled && r.name.IndexOf("hair", System.StringComparison.OrdinalIgnoreCase) < 0)
                .OrderByDescending(r => r.sharedMesh.vertexCount).FirstOrDefault();
            if (body == null) return null;
            var anim = person.GetComponentInChildren<Animator>();
            var head = anim != null && anim.isHuman ? anim.GetBoneTransform(HumanBodyBones.Head) : null;
            var near = head != null ? head.position : person.transform.position;
            var mesh = new Mesh();
            body.BakeMesh(mesh, true);
            var m = Matrix4x4.TRS(body.transform.position, body.transform.rotation, Vector3.one);
            float? top = null;
            foreach (var v in mesh.vertices)
            {
                var w = m.MultiplyPoint3x4(v);
                if ((new Vector2(w.x - near.x, w.z - near.z)).sqrMagnitude > 0.0625f) continue;
                if (top == null || w.y > top.Value) top = w.y;
            }
            Object.Destroy(mesh);
            return top;
        }
    }
}
