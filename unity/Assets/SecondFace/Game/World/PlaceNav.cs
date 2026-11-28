using System.Collections.Generic;
using Unity.AI.Navigation;
using UnityEngine;
using UnityEngine.AI;

namespace SecondFace.Game.World
{
    /// <summary>
    /// A place's NavMesh, built at runtime when the place is put in the world (BUILD_PLAN §6.A.5, P3.5), asynchronously,
    /// over the place's footprint and a margin (and a shelter under it). Sources are the world's own static geometry in that volume
    /// (<see cref="WorldSources"/>): the render meshes under the streamed terrain's root (the terrain included, which has no collider),
    /// the scatter's and each place's; never a person, what they carry, a bundle on the ground or the fight's marks, which move (a
    /// person's weapons, unreadable meshes, stood in the mesh as boxes at hand height and cut a hole round them at every build, MRC
    /// §19.5). The place's generated meshes and the kits' (imported readable for this) go in whole; a mesh the player cannot read (the
    /// nature scans', imported without CPU copies to save memory) stands in as its bounding box, which is what a boulder or a dead tree
    /// needs. Anything under a NavMeshModifier set to ignore (the doors, built open and never moved) is left out, so doorways stay
    /// open. Built for a walker of <see cref="AgentRadius"/> and <see cref="AgentHeight"/> on the default agent type
    /// (P6's NavMeshAgents use the same).
    /// </summary>
    public sealed class PlaceNav : MonoBehaviour, WorldOrigin.INavRebase
    {
        /// <summary>The floating origin's rebase, its second frame (§19.1): the data re-added at its new place (a build in flight is
        /// moved when it is done).</summary>
        public void OnNavRebase(Vector3 d) => Move(d);
        private NavMeshData _data;
        private void Move(Vector3 d)
        {
            if (_data == null || d == Vector3.zero || !_instance.valid) return;
            _instance.Remove();
            _data.position += d;
            _instance = NavMesh.AddNavMeshData(_data);
        }
        /// <summary>The volume to build over, in the place's space (its footprint with a margin, and any shelter under it).</summary>
        public Vector3 Centre, Size;
        /// <summary>The walker: a person's radius and height, metres (the default agent's 0.5 m radius erodes a 1.1 m
        /// doorway shut, and its 2 m does not pass a 2.1 m door from a raised floor).</summary>
        public const float AgentRadius = 0.3f, AgentHeight = 1.8f;

        public bool Ready { get; private set; }
        public int Sources { get; private set; }
        /// <summary>While the world's own NavMesh follows the walker (<see cref="WorldNav"/>, step 25), places build none:
        /// two meshes over the same ground do not join.</summary>
        public static bool Disabled;
        private static readonly List<PlaceNav> Live = new();
        /// <summary>The roots of the world's static geometry besides the places (each place's root carries its PlaceNav): the streamed
        /// terrain's and the scatter's, given by their spawners (<see cref="WorldGeometry"/>).</summary>
        private static readonly List<Transform> Grounds = new();

        /// <summary>A root whose hierarchy is the world's own static geometry (the streamer's terrain, the scatter's props): the NavMesh
        /// is built from these and the places alone.</summary>
        public static void WorldGeometry(Transform root) { if (root != null && !Grounds.Contains(root)) Grounds.Add(root); }
        private AsyncOperation _build;
        private NavMeshDataInstance _instance;

        private void Awake() => Live.Add(this);

        private System.Collections.IEnumerator Start()
        {
            if (Disabled) { Ready = true; yield break; }
            // not before the place's pad is in the terrain: built at once, the mesh lay on the ground as it was before the
            // pad was flattened, and rooms and yards were cut off from the street (2026-11-16); ten seconds at most
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 10f && !PadIn()) yield return null;
            yield return null;
            if (Disabled) { Ready = true; yield break; }
            var world = new Bounds(transform.TransformPoint(Centre), Size);
            var sources = Collect(world);
            Sources = sources.Count;
            var settings = Settings();
            var data = new NavMeshData(settings.agentTypeID);
            _data = data;
            _instance = NavMesh.AddNavMeshData(data);
            _build = NavMeshBuilder.UpdateNavMeshDataAsync(data, settings, sources, world);
        }

        /// <summary>The terrain under the place's middle and four points round it stands at the place's level (its pad is in).</summary>
        private bool PadIn()
        {
            var y = transform.position.y;
            var c = transform.TransformPoint(Centre);
            foreach (var (dx, dz) in new[] { (0f, 0f), (0.3f, 0.3f), (-0.3f, 0.3f), (0.3f, -0.3f), (-0.3f, -0.3f) })
            {
                var p = c + new Vector3(dx * Size.x, 0f, dz * Size.z);
                Terrain under = null;
                foreach (var t in Terrain.activeTerrains)
                {
                    var o = t.transform.position; var s = t.terrainData.size;
                    if (p.x >= o.x && p.z >= o.z && p.x < o.x + s.x && p.z < o.z + s.z) { under = t; break; }
                }
                if (under == null) return false;
                if (Mathf.Abs(under.SampleHeight(p) + under.transform.position.y - y) > 0.25f) return false;
            }
            return true;
        }

        /// <summary>The build settings for a person (the default agent type, a person's radius and height).</summary>
        public static NavMeshBuildSettings Settings()
        {
            var settings = NavMesh.GetSettingsByID(0);
            settings.agentRadius = AgentRadius;
            settings.agentHeight = AgentHeight;
            // the mesh's heights as the ground's, not the voxels': without it the polygons stood 5-6 cm over flat ground,
            // the people walking on them sank their hips that far to put their feet down, and their strides, bent, slid the
            // held feet (a companion's jog, W1 10 %, the motion gate's follow state, 2026-11-17)
            settings.buildHeightMesh = true;
            return settings;
        }

        /// <summary>The world's own static geometry in a volume, as collected (each source keeps its component): the render meshes and
        /// terrains under the terrain's, the scatter's and the places' roots whose box meets the volume, anything under a NavMeshModifier
        /// set to ignore (the doors) left out. Nothing under a person, a bundle on the ground or the fight's own objects is in it: they are
        /// not under these roots.</summary>
        public static List<NavMeshBuildSource> WorldSources(Bounds world)
        {
            var markups = new List<NavMeshBuildMarkup>();
            foreach (var m in FindObjectsByType<NavMeshModifier>(FindObjectsSortMode.None))
                if (m.ignoreFromBuild) markups.Add(new NavMeshBuildMarkup { root = m.transform, ignoreFromBuild = true });
            var sources = new List<NavMeshBuildSource>();
            var part = new List<NavMeshBuildSource>();
            Grounds.RemoveAll(r => r == null);
            var roots = new List<Transform>(Grounds);
            foreach (var p in Live) if (p != null) roots.Add(p.transform);
            foreach (var r in roots)
            {
                if (!r.gameObject.activeInHierarchy) continue;
                part.Clear();
                NavMeshBuilder.CollectSources(r, ~0, NavMeshCollectGeometry.RenderMeshes, 0, markups, part);
                foreach (var s in part) if (world.Intersects(Box(s))) sources.Add(s);
            }
            return sources;
        }

        /// <summary>A source's box in the world (what the volume is tested against).</summary>
        private static Bounds Box(NavMeshBuildSource s)
        {
            Bounds local;
            if (s.shape == NavMeshBuildSourceShape.Mesh && s.sourceObject is Mesh mesh) local = mesh.bounds;
            else if (s.shape == NavMeshBuildSourceShape.Terrain && s.sourceObject is TerrainData td) local = td.bounds;
            else local = new Bounds(Vector3.zero, s.size);
            var m = s.transform;
            var b = new Bounds(m.MultiplyPoint3x4(local.center), Vector3.zero);
            for (var i = 0; i < 8; i++)
                b.Encapsulate(m.MultiplyPoint3x4(local.center + Vector3.Scale(local.extents, new Vector3((i & 1) == 0 ? -1 : 1, (i & 2) == 0 ? -1 : 1, (i & 4) == 0 ? -1 : 1))));
            return b;
        }

        /// <summary>The sources a build takes in a volume: the world's own static geometry (<see cref="WorldSources"/>), a mesh the
        /// player cannot read as its bounding box.</summary>
        public static List<NavMeshBuildSource> Collect(Bounds world)
        {
            var sources = WorldSources(world);
            for (var i = 0; i < sources.Count; i++)
            {
                var s = sources[i];
                if (s.shape != NavMeshBuildSourceShape.Mesh || s.sourceObject is not Mesh mesh || mesh.isReadable) continue;
                var b = mesh.bounds;
                sources[i] = new NavMeshBuildSource
                {
                    shape = NavMeshBuildSourceShape.Box,
                    transform = s.transform * Matrix4x4.Translate(b.center),
                    size = b.size,
                    area = s.area,
                };
            }
            return sources;
        }

        private void Update()
        {
            if (!Ready && _build != null && _build.isDone) Ready = true;

        }

        /// <summary>Takes away every place's own mesh (the world's has come: a place loaded before it built one, and a
        /// path from the world's mesh onto a place's would end short at the place's edge).</summary>
        public static void DropAll()
        {
            foreach (var p in Live)
                if (p != null && p._instance.valid) { p._instance.Remove(); p.Ready = true; }
        }

        private void OnDestroy()
        {
            Live.Remove(this);
            if (_instance.valid) _instance.Remove();
        }
    }
}
