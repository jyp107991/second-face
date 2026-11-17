using UnityEngine;
using UnityEngine.Rendering;

namespace SecondFace.Game.World
{
    /// <summary>
    /// The city's see-through (docs/DESIGN_UNITY.md §2 "occlusion is solved, never fought"): while a Meridian district stands
    /// (PlaceBuilder puts this on its places), the game camera's every frame tells SecondFace/City where the player is
    /// (the world's focus, at chest height) and where the camera is, and everything of the city between them, above the
    /// player's waist and within a radius of the line, dissolves (a screen-space dither, shadows kept): a five-storey
    /// front, a megablock, a tower never hides the player from the overhead camera. The radius follows the camera's
    /// distance (<see cref="PerMetre"/>, <see cref="MinRadius"/>–<see cref="MaxRadius"/>); a camera further than
    /// <see cref="MaxCamera"/> (a wide view, photo mode pulled back) sees the city whole. Set just before the main
    /// camera renders; other cameras (portraits, the scene view) see no hole.
    /// </summary>
    public sealed class PlaceReveal : MonoBehaviour
    {
        public const float MinRadius = 1.2f, MaxRadius = 2.6f, PerMetre = 0.09f, MaxCamera = 45f, Chest = 1.3f;

        private static readonly int At = Shader.PropertyToID("_SF_RevealAt"), From = Shader.PropertyToID("_SF_RevealFrom");
        private static int _live;
        private static PlaceReveal _owner;
        private PlaceInteriors _interiors;

        private void Awake() => _interiors = GetComponent<PlaceInteriors>();

        private void OnEnable()
        {
            if (_live++ == 0) RenderPipelineManager.beginCameraRendering += Before;
            if (_owner == null) _owner = this;
        }

        private void OnDisable()
        {
            if (_owner == this) _owner = null;
            if (--_live > 0) return;
            _live = 0;
            RenderPipelineManager.beginCameraRendering -= Before;
            Shader.SetGlobalVector(At, Vector4.zero);
        }

        private static void Before(ScriptableRenderContext context, Camera camera)
        {
            if (_owner == null) foreach (var r in FindObjectsByType<PlaceReveal>(FindObjectsSortMode.None)) { if (r.isActiveAndEnabled) { _owner = r; break; } }
            var world = _owner != null && _owner._interiors != null ? _owner._interiors.World : null;
            if (world == null || camera == null || camera.cameraType != CameraType.Game || !camera.CompareTag("MainCamera"))
            {
                Shader.SetGlobalVector(At, Vector4.zero);
                return;
            }
            Apply(world.Focus, camera.transform.position);
        }

        /// <summary>Opens the see-through round a person standing at <paramref name="feet"/> seen from <paramref name="camera"/>
        /// (tests call it directly).</summary>
        public static void Apply(Vector3 feet, Vector3 camera)
        {
            var chest = feet + Vector3.up * Chest;
            var d = Vector3.Distance(camera, chest);
            var r = d > MaxCamera ? 0f : Mathf.Clamp(d * PerMetre, MinRadius, MaxRadius);
            Shader.SetGlobalVector(At, new Vector4(chest.x, chest.y, chest.z, r));
            Shader.SetGlobalVector(From, camera);
        }
    }
}
