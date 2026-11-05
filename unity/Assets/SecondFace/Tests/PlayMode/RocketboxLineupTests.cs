using System.Collections;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Npc;
using SecondFace.Game.People;
using SecondFace.Game.World;
using UnityEngine;
using UnityEngine.TestTools;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace SecondFace.Tests
{
    /// <summary>
    /// Every Rocketbox person the game stands, dyed as the game dyes them for a trade of their style, in their idle under
    /// a plain sun: the review sheet for the wardrobe rule (owner 2026-11-05: outfits lore-bound) and for the bake (a
    /// garment left undyed, skin where cloth is, a print that survived). Captures rb_lineup_0..n, eight people a sheet, and
    /// a second set from behind. A tool, run by name.
    /// </summary>
    public class RocketboxLineupTests
    {
        /// <summary>A Rocketbox person in the game's idle holds it as the player's own body does: arms hanging (not the
        /// bind pose's arms out), the head level (not tipped back).</summary>
        [UnityTest, Timeout(600000)]
        public IEnumerator RocketboxPeopleTakeTheIdle()
        {
#if UNITY_EDITOR
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            var assets = AssetDatabase.LoadAssetAtPath<WorldAssets>("Assets/SecondFace/World/WorldAssets.asset");
            if (cat == null || cat.People.Length == 0 || assets == null || assets.Locomotion == null) { Assert.Ignore("no Rocketbox catalogue or locomotion built"); yield break; }
            if (Object.FindAnyObjectByType<SecondFace.Game.Bootstrap>() != null) yield return BootTests.Clear();
            foreach (var other in Object.FindObjectsByType<Camera>(FindObjectsSortMode.None)) { other.enabled = false; other.tag = "Untagged"; }
            var made = new System.Collections.Generic.List<(string Name, Animator A)>();
            foreach (var id in new[] { "Female_Adult_01", "Male_Adult_08" })
            {
                var prefab = cat.Get(id);
                if (prefab == null) continue;
                var go = Object.Instantiate(prefab, new Vector3(made.Count * 2f, 0f, 0f), Quaternion.identity);
                var a = go.GetComponentInChildren<Animator>();
                Assert.That(a, Is.Not.Null, id + "'s animator");
                a.runtimeAnimatorController = assets.Locomotion; a.applyRootMotion = false; a.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                made.Add((id, a));
            }
            if (assets.Walker != null)
            {
                var w = Object.Instantiate(assets.Walker, new Vector3(-2f, 0f, 0f), Quaternion.identity);
                var a = w.GetComponentInChildren<Animator>();
                if (a != null) { a.runtimeAnimatorController = assets.Locomotion; a.applyRootMotion = false; a.cullingMode = AnimatorCullingMode.AlwaysAnimate; made.Add(("walker", a)); }
            }
            var t = Time.realtimeSinceStartup; while (Time.realtimeSinceStartup - t < 1.5f) yield return null;
            var bad = new System.Collections.Generic.List<string>();
            foreach (var (name, a) in made)
            {
                var up = a.GetBoneTransform(HumanBodyBones.LeftUpperArm); var lo = a.GetBoneTransform(HumanBodyBones.LeftLowerArm);
                var head = a.GetBoneTransform(HumanBodyBones.Head); var neck = a.GetBoneTransform(HumanBodyBones.Neck);
                var arm = Vector3.Angle(lo.position - up.position, Vector3.down);
                var state = a.GetCurrentAnimatorStateInfo(0);
                Debug.Log($"RocketboxIdle: {name} human {a.isHuman} avatar {(a.avatar != null ? a.avatar.name + (a.avatar.isValid ? " valid" : " INVALID") : "none")} controller {a.runtimeAnimatorController?.name} state {state.fullPathHash} t {state.normalizedTime:0.00} enabled {a.enabled} | upper arm {arm:0}° from down, head up {Vector3.SignedAngle(Vector3.ProjectOnPlane(head.up, a.transform.right), a.transform.up, a.transform.right):0}°");
                if (arm > 28f) bad.Add($"{name}: arm {arm:0}° from hanging");
            }
            // the head's carriage from the side, against the player's own body (judged by eye: level, not tipped back)
            var sun = new GameObject("sun").AddComponent<Light>(); sun.type = LightType.Directional; sun.transform.rotation = Quaternion.Euler(40f, 60f, 0f);
            var cam = new GameObject("cam") { tag = "MainCamera" }.AddComponent<Camera>();
            cam.clearFlags = CameraClearFlags.SolidColor; cam.backgroundColor = new Color(0.72f, 0.76f, 0.8f); cam.fieldOfView = 18f;
            foreach (var (_, a) in made) { a.transform.root.rotation = Quaternion.Euler(0f, 90f, 0f); if (a.GetComponent<SecondFace.Game.People.Gaze>() == null) a.gameObject.AddComponent<SecondFace.Game.People.Gaze>(); }
            yield return null; yield return null;
            cam.transform.position = new Vector3(0f, 1.35f, -9f); cam.transform.rotation = Quaternion.Euler(0f, 0f, 0f);
            yield return ScreenshotTests.Capture("rb_idle_side", 1600, 800);
            foreach (var (_, a) in made) a.transform.root.rotation = Quaternion.Euler(0f, 180f, 0f);
            yield return ScreenshotTests.Capture("rb_idle_front", 1600, 800);
            Object.Destroy(cam.gameObject); Object.Destroy(sun.gameObject);
            foreach (var (_, a) in made) Object.Destroy(a.transform.root.gameObject);
            Assert.That(bad, Is.Empty, string.Join("; ", bad));
#else
            Assert.Ignore("editor only");
            yield break;
#endif
        }

        [UnityTest, Timeout(1800000), Category("Heavy")]
        public IEnumerator DyedLineup()
        {
#if UNITY_EDITOR
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            var assets = AssetDatabase.LoadAssetAtPath<WorldAssets>("Assets/SecondFace/World/WorldAssets.asset");
            if (cat == null || cat.People.Length == 0) { Assert.Ignore("no Rocketbox catalogue built"); yield break; }
            // (alone: a game left standing by an earlier test would light the sheet and own the main camera)
            if (Object.FindAnyObjectByType<SecondFace.Game.Bootstrap>() != null) yield return BootTests.Clear();
            foreach (var other in Object.FindObjectsByType<Camera>(FindObjectsSortMode.None)) { other.enabled = false; other.tag = "Untagged"; }
            foreach (var other in Object.FindObjectsByType<Light>(FindObjectsSortMode.None)) other.enabled = false;
            var root = new GameObject("lineup");
            var sun = new GameObject("sun").AddComponent<Light>();
            sun.type = LightType.Directional; sun.intensity = 1.6f; sun.shadows = LightShadows.Soft;
            sun.transform.rotation = Quaternion.Euler(42f, 150f, 0f);
            sun.transform.SetParent(root.transform);
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.55f, 0.55f, 0.58f);
            var ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
            ground.transform.SetParent(root.transform);
            ground.transform.localScale = new Vector3(4f, 1f, 2f);
            ground.GetComponent<Renderer>().sharedMaterial.color = new Color(0.62f, 0.58f, 0.52f);
            var cam = new GameObject("cam") { tag = "MainCamera" }.AddComponent<Camera>();
            cam.transform.SetParent(root.transform);
            cam.clearFlags = CameraClearFlags.SolidColor; cam.backgroundColor = new Color(0.72f, 0.76f, 0.8f);
            cam.fieldOfView = 24f; cam.nearClipPlane = 0.1f; cam.farClipPlane = 100f;
            var people = cat.People.Where(e => e != null && e.Prefab != null).OrderBy(e => e.Id).ToList();
            const int PerSheet = 8;
            for (var sheet = 0; sheet * PerSheet < people.Count; sheet++)
            {
                var row = people.Skip(sheet * PerSheet).Take(PerSheet).ToList();
                var made = new System.Collections.Generic.List<GameObject>();
                for (var i = 0; i < row.Count; i++)
                {
                    var e = row[i];
                    var go = Object.Instantiate(e.Prefab, root.transform);
                    go.transform.position = new Vector3((i - (PerSheet - 1) * 0.5f) * 0.85f, 0f, 0f);
                    go.transform.rotation = Quaternion.Euler(0f, 180f, 0f);
                    var p = RbPeople.Of(e.Id);
                    var role = p?.Roles?.FirstOrDefault(r => r == "settler") ?? p?.Roles?.FirstOrDefault() ?? "settler";
                    RbDress.Apply(go, RbPeople.DyesFor(p, "lineup_" + e.Id, role, null));
                    var anim = go.GetComponentInChildren<Animator>();
                    if (anim != null && assets != null && assets.Locomotion != null) { anim.runtimeAnimatorController = assets.Locomotion; anim.applyRootMotion = false; anim.cullingMode = AnimatorCullingMode.AlwaysAnimate; anim.gameObject.AddComponent<SecondFace.Game.People.Gaze>(); }
                    made.Add(go);
                    Debug.Log($"RocketboxLineup: sheet {sheet} #{i} {e.Id} ({p?.Style}, as {role})");
                }
                var t = Time.realtimeSinceStartup; while (Time.realtimeSinceStartup - t < 1.5f) yield return null;
                cam.transform.position = new Vector3(0f, 1.45f, -7.4f);
                cam.transform.rotation = Quaternion.Euler(4f, 0f, 0f);
                yield return ScreenshotTests.Capture($"rb_lineup_{sheet}", 2560, 1000);
                cam.transform.position = new Vector3(0f, 1.45f, 7.4f);
                cam.transform.rotation = Quaternion.Euler(4f, 180f, 0f);
                yield return ScreenshotTests.Capture($"rb_lineup_back_{sheet}", 2560, 1000);
                foreach (var go in made) Object.Destroy(go);
                yield return null;
            }
            Object.Destroy(root);
#else
            Assert.Ignore("editor only");
            yield break;
#endif
        }
    }
}
