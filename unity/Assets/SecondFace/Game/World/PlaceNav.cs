using System.Collections.Generic;
using Unity.AI.Navigation;
using UnityEngine;
using UnityEngine.AI;

namespace SecondFace.Game.World
{
    /// <summary>
    /// A place's NavMesh, built at runtime when the place is put in the world (BUILD_PLAN §6.A.5, P3.5), asynchronously,
    /// over the place's footprint and a margin. Sources are the render meshes in that volume (the streamed terrain
    /// included, which has no collider): the place's generated meshes and the kits' (imported readable for this) go in
    /// whole; a mesh the player cannot read (the nature scans', imported without CPU copies to save memory) stands in as
    /// its bounding box, which is what a boulder or a dead tree needs. Anything under a NavMeshModifier set to ignore (the doors) is left out, so doorways
    /// stay open. Built for a walker of <see cref="AgentRadius"/> and <see cref="AgentHeight"/> on the default agent type
    /// (P6's NavMeshAgents use the same).
    /// </summary>
    public sealed class PlaceNav : MonoBehaviour
    {
        /// <summary>The place's footprint, metres (x across, y along z).</summary>
        public Vector2 Size;
        public float Margin = 12f;
        /// <summary>The walker: a person's radius and height, metres (the default agent's 0.5 m radius erodes a 1.1 m
        /// doorway shut, and its 2 m does not pass a 2.1 m door from a raised floor).</summary>
        public const float AgentRadius = 0.3f, AgentHeight = 1.8f;

        public bool Ready { get; private set; }
        public int Sources { get; private set; }
        private AsyncOperation _build;
        private NavMeshDataInstance _instance;

        private void Start()
        {
            var bounds = new Bounds(new Vector3(0, 4f, 0), new Vector3(Size.x + 2 * Margin, 40f, Size.y + 2 * Margin));
            var world = new Bounds(transform.TransformPoint(bounds.center), bounds.size);
            var markups = new List<NavMeshBuildMarkup>();
            foreach (var m in GetComponentsInChildren<NavMeshModifier>(true))
                if (m.ignoreFromBuild) markups.Add(new NavMeshBuildMarkup { root = m.transform, ignoreFromBuild = true });
            var sources = new List<NavMeshBuildSource>();
            NavMeshBuilder.CollectSources(world, ~0, NavMeshCollectGeometry.RenderMeshes, 0, markups, sources);
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
            Sources = sources.Count;
            var settings = NavMesh.GetSettingsByID(0);
            settings.agentRadius = AgentRadius;
            settings.agentHeight = AgentHeight;
            var data = new NavMeshData(settings.agentTypeID);
            _instance = NavMesh.AddNavMeshData(data);
            _build = NavMeshBuilder.UpdateNavMeshDataAsync(data, settings, sources, world);
        }

        private void Update()
        {
            if (!Ready && _build != null && _build.isDone) Ready = true;
        }

        private void OnDestroy()
        {
            if (_instance.valid) _instance.Remove();
        }
    }
}
