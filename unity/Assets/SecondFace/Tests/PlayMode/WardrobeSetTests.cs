using System.Collections;
using System.IO;
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
    /// The built wardrobe sets hold what their manifests list (P4.15b): a garment whose import was cut short (an empty
    /// .meta from a full disk) once dropped out of a set without a sound, and every woman whose outfit named it went
    /// topless. Each set has every garment of its manifest with a prefab, its own starting outfit included, and a person
    /// dressed for any role keeps their torso, legs and feet covered. And a garment draws one level of detail at a time:
    /// its own LOD group, destroyed at the frame's end, once took its renderers out of the person's group, so every level
    /// drew at once (z-fighting, and the coarse levels' long triangles as a fin beside the leg).
    /// </summary>
    public class WardrobeSetTests
    {
        private static readonly string[] Bases = { "player_f", "player_m" };

        [System.Serializable] private class Manifest { public string @base; public string[] outfit; public Entry[] garments; }
        [System.Serializable] private class Entry { public string id; public string slot; }

        [Test]
        public void EverySetHoldsItsWholeManifest()
        {
#if UNITY_EDITOR
            foreach (var b in Bases)
            {
                var json = $"Assets/SecondFace/People/Player/{b}.wardrobe.json";
                if (!File.Exists(json)) Assert.Ignore($"{b} not built");
                var m = JsonUtility.FromJson<Manifest>(File.ReadAllText(json));
                var set = AssetDatabase.LoadAssetAtPath<WardrobeSet>($"Assets/SecondFace/People/Player/{b}_wardrobe.asset");
                Assert.That(set, Is.Not.Null, $"{b}'s set");
                var missing = m.garments.Where(e => set.Find(e.id)?.Prefab == null).Select(e => e.id).ToList();
                Assert.That(missing, Is.Empty, $"{b}'s set lacks garments of its manifest (an import cut short?)");
                Assert.That(set.Outfit.Where(id => set.Find(id)?.Prefab == null), Is.Empty, $"{b} starts in garments it has");
            }
#else
            Assert.Ignore("editor only");
#endif
        }

        [Test]
        public void EveryoneDressedByTheRulesIsCovered()
        {
#if UNITY_EDITOR
            UiTests.Content();
            foreach (var b in Bases)
            {
                var set = AssetDatabase.LoadAssetAtPath<WardrobeSet>($"Assets/SecondFace/People/Player/{b}_wardrobe.asset");
                if (set == null) Assert.Ignore($"{b} not built");
                var fit = b.EndsWith("_f") ? "f" : "m";
                foreach (var role in Core.Npc.Outfits.Roles)
                    for (var seed = 0; seed < 40; seed++)
                    {
                        var slots = Dresser.Pick(set, Core.Npc.Outfits.DressFor(seed * 131 + 7, role, fit)).Select(p => p.Slot).ToHashSet();
                        var body = slots.Contains(Wardrobe.FullSlot) || (slots.Contains("top") && slots.Contains("legs"));
                        Assert.That(body, Is.True, $"{b} as a {role} (seed {seed}) wears {string.Join(", ", slots)}");
                        Assert.That(slots.Contains("feet"), Is.True, $"{b} as a {role} (seed {seed}) has something on their feet");
                    }
            }
#else
            Assert.Ignore("editor only");
#endif
        }
    
        [UnityTest, Timeout(300000)]
        public IEnumerator AGarmentDrawsOneLevelAtATime()
        {
            GameObject prefab = null;
#if UNITY_EDITOR
            prefab = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/SecondFace/Prefabs/people/player_m.prefab");
#endif
            if (prefab == null) { Assert.Ignore("bases not built"); yield break; }
            var go = Object.Instantiate(prefab, new Vector3(0f, 0f, 0f), Quaternion.Euler(0f, 180f, 0f));
            var cam = new GameObject("lod_cam").AddComponent<Camera>();
            cam.transform.position = new Vector3(0f, 1f, -3f);
            cam.transform.LookAt(new Vector3(0f, 0.9f, 0f));
            cam.fieldOfView = 40f;
            try
            {
                yield return null;   // the base's own outfit goes on (Start)
                var w = go.GetComponent<Wardrobe>();
                Assert.That(w.Equip("mindfront_male_trousers_1"), Is.True);
                for (var i = 0; i < 3; i++) yield return null;   // the garment's own model destroyed at the frame's end
                var group = go.GetComponent<LODGroup>();
                Assert.That(group, Is.Not.Null, "the base's levels of detail");
                group.ForceLOD(0);
                yield return null;
                cam.Render();
                yield return null;
                var legs = w.GarmentRenderers.Where(r => r.name.StartsWith("legs:")).ToList();
                Assert.That(legs.Count, Is.EqualTo(3), "three levels of the trousers");
                foreach (var r in legs)
                    Assert.That(r.isVisible, Is.EqualTo(r.name.EndsWith("_LOD0")), $"{r.name} drawn only at its own level");
            }
            finally
            {
                Object.Destroy(go);
                Object.Destroy(cam.gameObject);
            }
        }
    }
}
