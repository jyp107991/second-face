using UnityEngine;
using UnityEngine.Rendering;

namespace SecondFace.Game.World
{
    /// <summary>
    /// Interiors open instantly (BUILD_PLAN §6.A.5, step 21): when the focus (the player) is inside one of the place's
    /// buildings, its roof and what is kept on it, its doors and shutters stop drawing (they still cast their shadow, so
    /// the room keeps its shade), and its walls are cut away above <see cref="CutHeight"/> over the floor by SecondFace/Weathered (globals
    /// _SF_CutMin, _SF_CutMax, _SF_CutHeight: one building at a time, the one the player is in), so the camera sees the
    /// room from its usual height. An underground building (a shelter opens whole, and its tunnel) also takes the surface
    /// away: <see cref="WorldView.Underground"/>, and this place's surface renderers stop drawing. Leaving puts
    /// everything back. Checked ten times a second.
    /// </summary>
    public sealed class PlaceInteriors : MonoBehaviour
    {
        public WorldService World;
        /// <summary>How much wall stays standing round the room, metres over its floor.</summary>
        public float CutHeight = 1.2f;

        public PlaceBuilding Inside { get; private set; }

        private static readonly int CutMin = Shader.PropertyToID("_SF_CutMin"), CutMax = Shader.PropertyToID("_SF_CutMax"), CutAt = Shader.PropertyToID("_SF_CutHeight");
        private static PlaceInteriors _owner;
        private PlaceBuilding[] _buildings;
        private float _next;
        /// <summary>The place's surface renderers, off while the player is under it.</summary>
        private readonly System.Collections.Generic.List<Renderer> _surface = new();

        private void Awake() => _buildings = GetComponentsInChildren<PlaceBuilding>(true);

        private void Update()
        {
            if (Time.unscaledTime < _next) return;
            _next = Time.unscaledTime + 0.1f;
            Refresh();
        }

        /// <summary>Finds the building the focus is in and opens it (closing the one it left). Tests call it directly.</summary>
        public void Refresh()
        {
            if (World == null) return;
            var p = World.Focus;
            PlaceBuilding found = null;
            foreach (var b in _buildings)
            {
                var bounds = b.WorldBounds;
                if (p.x > bounds.min.x && p.x < bounds.max.x && p.z > bounds.min.z && p.z < bounds.max.z && p.y > bounds.min.y && p.y < bounds.max.y) { found = b; break; }
            }
            if (found == Inside) return;
            if (Inside != null) Show(Inside, true);
            var wasBelow = Inside != null && Inside.Underground;
            Inside = found;
            var below = Inside != null && Inside.Underground;
            if (below != wasBelow) Surface(!below);
            if (Inside != null)
            {
                Show(Inside, false);
                var b = Inside.WorldBounds;
                Shader.SetGlobalVector(CutMin, new Vector4(b.min.x, b.min.y, b.min.z, 0));
                Shader.SetGlobalVector(CutMax, new Vector4(b.max.x, b.max.y, b.max.z, 1));
                Shader.SetGlobalFloat(CutAt, b.min.y + 0.5f + CutHeight);
                _owner = this;
            }
            else if (_owner == this)
            {
                Shader.SetGlobalVector(CutMax, Vector4.zero);
                _owner = null;
            }
        }

        private static void Show(PlaceBuilding b, bool on)
        {
            foreach (var t in new[] { b.Roof, b.Fittings })
            {
                if (t == null) continue;
                foreach (var r in t.GetComponentsInChildren<Renderer>(true))
                    r.shadowCastingMode = on ? ShadowCastingMode.On : ShadowCastingMode.ShadowsOnly;
            }
        }

        /// <summary>Under the ground: the world view goes below and this place's surface stops drawing (everything not
        /// under an underground building); back up, all of it returns.</summary>
        private void Surface(bool on)
        {
            if (!on)
            {
                _surface.Clear();
                foreach (var r in GetComponentsInChildren<Renderer>())
                {
                    var under = r.GetComponentInParent<PlaceBuilding>();
                    if (under != null && under.Underground) continue;
                    if (!r.enabled) continue;
                    r.enabled = false;
                    _surface.Add(r);
                }
            }
            else
            {
                foreach (var r in _surface) if (r != null) r.enabled = true;
                _surface.Clear();
            }
            WorldView.SetUnderground(!on);
        }

        private void OnDisable()
        {
            if (Inside != null && Inside.Underground) Surface(true);
            if (Inside != null) Show(Inside, true);
            Inside = null;
            if (_owner == this) { Shader.SetGlobalVector(CutMax, Vector4.zero); _owner = null; }
        }
    }
}
