using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.World;
using SecondFace.Game;
using SecondFace.Game.Fighting;
using SecondFace.Game.People;
using SecondFace.Game.Play;
using SecondFace.Game.World;
using Unity.AI.Navigation;
using UnityEngine;
using UnityEngine.AI;
using UnityEngine.TestTools;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace SecondFace.Tests
{
    /// <summary>
    /// The NavMesh is built from the world's own static geometry alone (MRC §19.5, ruled 2026-11-28): the streamed terrain, the scatter's
    /// props and the places, never a person, what they carry, a bundle on the ground or the fight's marks. Before, the build took every
    /// render mesh in its volume, and a person's weapons (unreadable meshes, so boxes) stood in the mesh at hand height and cut a hole
    /// round them at every build: the fight's paths then hung on where the armed had stood at the last one. Each test runs the old
    /// scene-wide collection beside the new one as its own control, so it shows that its set-up is one the old way got wrong.
    /// </summary>
    public class NavSourcesTests
    {
        private readonly List<Object> _made = new();
        private T Made<T>(T o) where T : Object { _made.Add(o); return o; }
        private readonly List<NavMeshDataInstance> _meshes = new();

        [UnityTearDown]
        public IEnumerator TearDown()
        {
            foreach (var m in _meshes) if (m.valid) m.Remove();
            _meshes.Clear();
            foreach (var o in _made) if (o != null) Object.Destroy(o);
            _made.Clear();
            yield return null;
        }

        /// <summary>The scene-wide collection the build made until 2026-11-28 (every render mesh and terrain in the volume), the control.</summary>
        private static List<NavMeshBuildSource> SceneWide(Bounds world)
        {
            var markups = new List<NavMeshBuildMarkup>();
            foreach (var m in Object.FindObjectsByType<NavMeshModifier>(FindObjectsSortMode.None))
                if (m.ignoreFromBuild) markups.Add(new NavMeshBuildMarkup { root = m.transform, ignoreFromBuild = true });
            var sources = new List<NavMeshBuildSource>();
            NavMeshBuilder.CollectSources(world, ~0, NavMeshCollectGeometry.RenderMeshes, 0, markups, sources);
            return sources;
        }

        /// <summary>A mesh the player cannot read as its bounding box, as PlaceNav.Collect does.</summary>
        private static List<NavMeshBuildSource> Boxed(List<NavMeshBuildSource> raw)
        {
            var sources = new List<NavMeshBuildSource>(raw);
            for (var i = 0; i < sources.Count; i++)
            {
                var s = sources[i];
                if (s.shape != NavMeshBuildSourceShape.Mesh || s.sourceObject is not Mesh mesh || mesh.isReadable) continue;
                var b = mesh.bounds;
                sources[i] = new NavMeshBuildSource { shape = NavMeshBuildSourceShape.Box, transform = s.transform * Matrix4x4.Translate(b.center), size = b.size, area = s.area };
            }
            return sources;
        }

        /// <summary>A build over a volume from these sources, as WorldNav makes it (a person's settings, 0.15 m voxels), added.</summary>
        private void Build(List<NavMeshBuildSource> sources, Bounds world)
        {
            var settings = PlaceNav.Settings();
            settings.overrideVoxelSize = true;
            settings.voxelSize = 0.15f;   // (WorldNav.Voxel)
            var data = NavMeshBuilder.BuildNavMeshData(settings, sources, world, Vector3.zero, Quaternion.identity);
            Assert.That(data, Is.Not.Null, "built");
            _meshes.Add(NavMesh.AddNavMeshData(data));
        }

        private static bool Walkable(Vector3 p) =>
            NavMesh.SamplePosition(p + Vector3.up * 0.2f, out var hit, 0.6f, NavMesh.AllAreas) && new Vector2(hit.position.x - p.x, hit.position.z - p.z).magnitude < 0.03f && Mathf.Abs(hit.position.y - p.y) < 0.15f;

        /// <summary>(a) An armed person standing on flat ground: after a build the ground round them, under their weapon too, is walkable.
        /// The control, the scene-wide collection, cuts it (the set-up is one the old build got wrong).</summary>
        [UnityTest, Timeout(600000)]
        public IEnumerator AnArmedPersonLeavesTheGroundRoundThemWalkable()
        {
#if UNITY_EDITOR
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            var controller = AssetDatabase.LoadAssetAtPath<RuntimeAnimatorController>("Assets/SecondFace/People/Locomotion.controller");
            var assets = AssetDatabase.LoadAssetAtPath<WorldAssets>("Assets/SecondFace/World/WorldAssets.asset");
#else
            RocketboxCatalog cat = null; RuntimeAnimatorController controller = null; WorldAssets assets = null;
#endif
            if (cat == null || controller == null || assets == null || assets.Combat == null) { Assert.Ignore("the cast, the locomotion controller or the combat set are not built"); yield break; }
            var at = new Vector3(200f, 0f, 200f);   // (away from anything another test left)
            // the ground: a readable 24 m square under a root of the world's geometry, as the streamed terrain is
            var groundRoot = Made(new GameObject("nav test ground"));
            PlaceNav.WorldGeometry(groundRoot.transform);
            var quad = Made(new Mesh { name = "nav test ground" });
            quad.vertices = new[] { new Vector3(-12, 0, -12), new Vector3(-12, 0, 12), new Vector3(12, 0, 12), new Vector3(12, 0, -12) };
            quad.triangles = new[] { 0, 1, 2, 0, 2, 3 };
            quad.RecalculateNormals(); quad.RecalculateBounds();
            var ground = new GameObject("ground");
            ground.transform.SetParent(groundRoot.transform, false);
            groundRoot.transform.position = at;
            ground.AddComponent<MeshFilter>().sharedMesh = quad;
            ground.AddComponent<MeshRenderer>();
            // an armed person: the longest of the fight's weapons in the right hand, standing
            var w = Walker.Create(cat.Get("Male_Adult_08"), controller, at, 0f, true);
            Made(w.gameObject);
            if (w.Agent != null) w.Agent.enabled = false;
            w.enabled = false;
            var weapon = assets.Combat.Weapons.Where(x => x != null && x.Prefab != null)
                .OrderByDescending(x => x.Prefab.GetComponentsInChildren<MeshFilter>().Where(f => f.sharedMesh != null).Select(f => f.sharedMesh.bounds.size.magnitude).DefaultIfEmpty(0f).Max()).First();
            var held = weapon.Spawn("held_" + weapon.Id);
            held.transform.SetParent(w.Animator.GetBoneTransform(HumanBodyBones.RightHand), false);
            for (var i = 0; i < 30; i++) yield return null;
            var hand = w.Animator.GetBoneTransform(HumanBodyBones.RightHand).position;
            var volume = new Bounds(at, new Vector3(30f, 20f, 30f));
            // the points round them: a 0.15 m grid out to 1.2 m from their feet, and the ground under the weapon
            var points = new List<Vector3>();
            for (var x = -8; x <= 8; x++)
                for (var z = -8; z <= 8; z++)
                {
                    var p = at + new Vector3(x * 0.15f, 0f, z * 0.15f);
                    if (new Vector2(x, z).magnitude * 0.15f <= 1.2f) points.Add(p);
                }
            points.Add(new Vector3(hand.x, at.y, hand.z));
            // the control: the scene-wide collection
            var wide = SceneWide(volume);
            var carried = wide.Count(s => s.component != null && s.component.transform.IsChildOf(w.transform));
            Build(Boxed(wide), volume);
            var cutBefore = points.Count(p => !Walkable(p));
            _meshes[0].Remove(); _meshes.Clear();
            // the world's own geometry
            var sources = PlaceNav.WorldSources(volume);
            Assert.That(sources.Any(s => s.component != null && s.component.transform.IsChildOf(groundRoot.transform)), Is.True, "the ground is the world's");
            Assert.That(sources.Where(s => s.component != null && s.component.transform.IsChildOf(w.transform)).Select(s => s.component.name), Is.Empty, "nothing the person carries is a source");
            Build(PlaceNav.Collect(volume), volume);
            var cut = points.Where(p => !Walkable(p)).ToList();
            Debug.Log($"NavSourcesTests: an armed person ({weapon.Id} in the right hand, at {hand.y - at.y:0.00} m): the scene-wide collection took {carried} of their meshes and cut {cutBefore} of {points.Count} points round them; the world's own, {cut.Count}");
            Assert.That(cutBefore, Is.GreaterThan(0), "the control: the scene-wide collection cut the ground round the armed person (else this set-up proves nothing)");
            Assert.That(cut.Select(p => $"({p.x - at.x:0.00}, {p.z - at.z:0.00})"), Is.Empty, "the ground round the armed person is walkable");
        }

        /// <summary>(b) Shale's whole build volume, its people about (the guards armed, the walker's knife), a bundle dropped at the walker's
        /// feet: no source lies under a person, a weapon, a bundle or the walkabout's own objects, and every one of the world's own the
        /// scene-wide collection took is still there (nothing of the world lost).</summary>
        [UnityTest, Timeout(1800000)]
        public IEnumerator ShalesBuildTakesTheWorldAlone()
        {
            Bootstrap boot = null;
            yield return BootTests.Boot(b => boot = b);
            var walk = boot.Walkabout;
            yield return BootTests.TownSettled(() => walk.Townsfolk, "the town's people");
            // a bundle on the ground at the walker's feet
            var g = walk.Game;
            var feet = WorldOrigin.ToWorld(walk.Walker.transform.position + walk.Walker.transform.forward * 0.8f);
            Assert.That(g.Pc.Inventory.Items.Count, Is.GreaterThan(0), "the player carries something to drop");
            Assert.That(Ground.Drop(g, g.Pc.Inventory, 0, 1, (float)feet.x, (float)feet.y, (float)feet.z), Is.Not.Null, "dropped");
            walk.Piles.Sync(g);
            yield return null;
            Assert.That(walk.Piles.Count, Is.GreaterThan(0), "a bundle lies on the ground");
            var volume = walk.Nav.Area;
            Assert.That(volume.size.x, Is.GreaterThan(0f), "the world's NavMesh has an area");
            bool Moving(NavMeshBuildSource s, out string what)
            {
                what = null;
                if (s.component == null) return false;
                for (var t = s.component.transform; t != null; t = t.parent)
                {
                    if (t.name.StartsWith("held_")) { what = "a weapon"; return true; }
                    if (t.GetComponent<Animator>() != null || t.GetComponent<Walker>() != null || t.GetComponent<Townsperson>() != null) { what = "a person"; return true; }
                    if (t.GetComponent<GroundPiles>() != null || t.GetComponent<Walkabout>() != null || t.GetComponent<Combat>() != null) { what = "the walkabout's own (a bundle, the fight's marks)"; return true; }
                }
                return false;
            }
            string Path(NavMeshBuildSource s) { if (s.component == null) return "-"; var p = s.component.name; for (var t = s.component.transform.parent; t != null; t = t.parent) p = t.name + "/" + p; return p; }
            (int, NavMeshBuildSourceShape, int) Key(NavMeshBuildSource s) => (s.component != null ? s.component.GetInstanceID() : 0, s.shape, s.sourceObject != null ? s.sourceObject.GetInstanceID() : 0);
            var t0 = System.Diagnostics.Stopwatch.StartNew();
            var wide = SceneWide(volume);
            var wideMs = t0.Elapsed.TotalMilliseconds; t0.Restart();
            var world = PlaceNav.WorldSources(volume);
            var worldMs = t0.Elapsed.TotalMilliseconds;
            var movingWide = wide.Where(s => Moving(s, out _)).ToList();
            var whatWide = movingWide.Select(s => { Moving(s, out var w); return w; }).GroupBy(x => x).ToDictionary(x => x.Key, x => x.Count());
            Debug.Log($"NavSourcesTests: Shale's volume {volume.size.x:0} m: the scene-wide collection {wide.Count} sources in {wideMs:0.0} ms ({movingWide.Count} moving: {string.Join(", ", whatWide.Select(kv => kv.Value + " " + kv.Key))}); the world's own {world.Count} in {worldMs:0.0} ms");
            Assert.That(whatWide.ContainsKey("a person") || whatWide.ContainsKey("a weapon"), Is.True, "the control: the scene-wide collection took something a person carries (else this set-up proves nothing)");
            Assert.That(movingWide.Any(s => s.component.transform.IsChildOf(walk.Piles.transform) && s.component.name.StartsWith("pile_")), Is.True, "the control: the scene-wide collection took the bundle");
            Assert.That(world.Where(s => Moving(s, out _)).Select(s => { Moving(s, out var w); return w + ": " + Path(s); }), Is.Empty, "no source under a person, a weapon, a bundle or the walkabout's own objects");
            var wideKeys = new HashSet<(int, NavMeshBuildSourceShape, int)>(wide.Select(Key));
            Assert.That(world.Where(s => !wideKeys.Contains(Key(s))).Select(Path), Is.Empty, "nothing the scene-wide collection did not take");
            var worldKeys = new HashSet<(int, NavMeshBuildSourceShape, int)>(world.Select(Key));
            Assert.That(wide.Where(s => !Moving(s, out _) && !worldKeys.Contains(Key(s))).Select(Path).Take(40), Is.Empty, "every one of the world's own sources is still taken");
            Assert.That(world.Any(s => s.shape == NavMeshBuildSourceShape.Terrain), Is.True, "the terrain is taken");
        }
    }
}
