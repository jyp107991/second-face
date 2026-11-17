using System.Collections.Generic;
using SecondFace.Core.Content;
using SecondFace.Core.World;
using SecondFace.Game.World;
using UnityEngine;

namespace SecondFace.Game.Play
{
    /// <summary>
    /// A place's dressing by the story (Core <see cref="Dressing"/>; the dressing registry): while a group's condition holds,
    /// its things stand at the markers they name in every place standing (stand-ins drawn here, one kind each, until their
    /// art is made: a wagon, a crate, a chalk mark, a lamp, a book, a fire's glow on the skyline), and over the settlement
    /// the walker is in the city's lights go out (the city shader's <c>_SF_CityDark</c> and the places' own lamps) or
    /// smoke comes over the sky (<see cref="SkyController.Smoke"/>, turned in over a few seconds). Refreshed whenever the
    /// story moves (a conversation closed, a trigger fired, a fight over) and as each place comes into view.
    /// </summary>
    public sealed class PlaceDressing : MonoBehaviour
    {
        public Walkabout Walkabout;
        public PlaceSpawner Spawner;
        /// <summary>The groups the dressing reads (tests set their own; null: the content's registry).</summary>
        public static IReadOnlyDictionary<string, DressingDef> Override;
        public static IReadOnlyDictionary<string, DressingDef> Groups => Override ?? Registry.Dressing;

        /// <summary>The groups standing now.</summary>
        public IReadOnlyList<string> Active => _active;
        /// <summary>The city the walker is in has its lights out.</summary>
        public bool CityDark { get; private set; }
        /// <summary>Smoke over the sky where the walker is (0..1).</summary>
        public float Smoke { get; private set; }

        private List<string> _active = new();
        /// <summary>The things set in each standing place, by group.</summary>
        private readonly Dictionary<(string Group, int Place), GameObject> _sets = new();
        private readonly List<Light> _darkened = new();
        /// <summary>Each standing place's markers by (map, id), found once a place.</summary>
        private readonly Dictionary<int, Dictionary<(string Map, string Id), PlaceMarker>> _markers = new();
        private PlaceSpawner _hooked;
        private static readonly int CityDarkId = Shader.PropertyToID("_SF_CityDark");

        /// <summary>The things standing for a group in a place (null when none: tests read it).</summary>
        public GameObject SetOf(string group, GameObject place) => place != null && _sets.TryGetValue((group, place.GetInstanceID()), out var go) ? go : null;

        /// <summary>Brings the dressing up to the game as it stands.</summary>
        public void Refresh()
        {
            var g = Walkabout != null ? Walkabout.Game : null;
            if (g == null) return;
            Hook();
            var groups = Groups;
            _active = Dressing.Active(groups, g);
            // the things at their markers, in every place standing (a place gone took its things with it)
            var standing = new HashSet<int>();
            if (Spawner != null)
                foreach (var (_, place) in Spawner.Standing())
                    if (place != null) { standing.Add(place.GetInstanceID()); Dress(place, groups); }
            var gone = new List<(string, int)>();
            foreach (var kv in _sets) if (kv.Value == null || !standing.Contains(kv.Key.Place)) gone.Add(kv.Key);
            foreach (var k in gone) { if (_sets[k] != null) Destroy(_sets[k]); _sets.Remove(k); }
            var stale = new List<int>();
            foreach (var id in _markers.Keys) if (!standing.Contains(id)) stale.Add(id);
            foreach (var id in stale) _markers.Remove(id);
            // over the settlement the walker is in
            var settlement = SettlementHere();
            var (dark, smoke) = Dressing.Over(groups, _active, settlement);
            Darken(dark, settlement);
            Smother(smoke);
        }

        /// <summary>Takes every thing down and lights the city again (the game left).</summary>
        public void Clear()
        {
            foreach (var go in _sets.Values) if (go != null) Destroy(go);
            _sets.Clear();
            _markers.Clear();
            _active = new List<string>();
            Darken(false, null);
            Smother(0f);
        }

        private void Hook()
        {
            if (Spawner == _hooked) return;
            if (_hooked != null) _hooked.Shown -= OnShown;
            _hooked = Spawner;
            if (_hooked != null) _hooked.Shown += OnShown;
        }

        private void OnShown(string id, GameObject place)
        {
            if (Walkabout == null || Walkabout.Game == null) return;
            Dress(place, Groups);
            if (CityDark) Darken(true, SettlementHere(), force: true);
        }

        private void OnDestroy() { if (_hooked != null) _hooked.Shown -= OnShown; }

        /// <summary>Sets a place's things for the groups standing, and takes down those of groups that no longer stand.</summary>
        private void Dress(GameObject place, IReadOnlyDictionary<string, DressingDef> groups)
        {
            if (place == null || groups == null) return;
            if (!_markers.TryGetValue(place.GetInstanceID(), out var markers)) _markers[place.GetInstanceID()] = markers = Markers(place);
            foreach (var kv in groups)
            {
                var key = (kv.Key, place.GetInstanceID());
                var on = _active.Contains(kv.Key);
                _sets.TryGetValue(key, out var set);
                if (!on || kv.Value?.Props == null || kv.Value.Props.Count == 0)
                {
                    if (set != null) Destroy(set);
                    _sets.Remove(key);
                    continue;
                }
                if (set != null) continue;   // (already standing)
                GameObject root = null;
                foreach (var prop in kv.Value.Props)
                {
                    if (prop == null || !markers.TryGetValue((prop.Map, prop.Anchor), out var m)) continue;
                    if (root == null)
                    {
                        root = new GameObject("dressing " + kv.Key);
                        root.transform.SetParent(place.transform, false);
                    }
                    var i = 0;
                    foreach (var (x, z, yaw) in Dressing.Layout(prop))
                    {
                        var at = m.transform.TransformPoint(new Vector3(x, 0f, z));
                        var rot = Quaternion.Euler(0f, m.transform.eulerAngles.y + yaw, 0f);
                        var thing = StandIn.Make(prop.Kind, i++);
                        if (thing == null) continue;
                        thing.transform.SetParent(root.transform, true);
                        thing.transform.SetPositionAndRotation(at, rot);
                    }
                }
                if (root != null) _sets[key] = root;
            }
        }

        private static Dictionary<(string Map, string Id), PlaceMarker> Markers(GameObject place)
        {
            var d = new Dictionary<(string, string), PlaceMarker>();
            foreach (var m in place.GetComponentsInChildren<PlaceMarker>(true))
                if (!string.IsNullOrEmpty(m.Map) && !string.IsNullOrEmpty(m.Id) && !d.ContainsKey((m.Map, m.Id))) d[(m.Map, m.Id)] = m;
            return d;
        }

        /// <summary>The settlement whose places the walker is in (the map of the place the game is at), or null.</summary>
        private string SettlementHere()
        {
            var g = Walkabout != null ? Walkabout.Game : null;
            var id = g?.LocationId;
            if (string.IsNullOrEmpty(id)) return null;
            var map = id;
            var layout = Walkabout.Stage != null && Walkabout.Stage.World != null ? Walkabout.Stage.World.Layout : null;
            if (layout != null && layout.Places.TryGetValue(id, out var p) && !string.IsNullOrEmpty(p.Map)) map = p.Map;
            if (Registry.Maps.TryGetValue(map, out var md) && !string.IsNullOrEmpty(md.Settlement)) return md.Settlement;
            return Registry.Maps.TryGetValue(id, out var own) ? own.Settlement : null;
        }

        /// <summary>A standing place belongs to a settlement (any of the maps stamped into it does).</summary>
        private static bool Of(GameObject place, string settlement)
        {
            foreach (var m in place.GetComponentsInChildren<PlaceMarker>(true))
                if (!string.IsNullOrEmpty(m.Map) && Registry.Maps.TryGetValue(m.Map, out var md) && md.Settlement == settlement) return true;
            return false;
        }

        /// <summary>The city's lights out (or back on): the city shader's windows, signs and screens, and the lamps of the
        /// settlement's standing places.</summary>
        private void Darken(bool dark, string settlement, bool force = false)
        {
            if (dark == CityDark && !force) return;
            CityDark = dark;
            Shader.SetGlobalFloat(CityDarkId, dark ? 1f : 0f);
            if (!dark)
            {
                foreach (var l in _darkened) if (l != null) l.enabled = true;
                _darkened.Clear();
                return;
            }
            if (Spawner == null || string.IsNullOrEmpty(settlement)) return;
            foreach (var (_, place) in Spawner.Standing())
            {
                if (place == null || !Of(place, settlement)) continue;
                foreach (var l in place.GetComponentsInChildren<Light>())
                {
                    if (l.type == LightType.Directional || !l.enabled || l.GetComponentInParent<StandIn>() != null) continue;
                    l.enabled = false;
                    _darkened.Add(l);
                }
            }
        }

        /// <summary>Smoke over the sky where the walker is, turned in (or out) over a few seconds.</summary>
        private void Smother(float smoke)
        {
            Smoke = smoke;
            var sky = Walkabout != null && Walkabout.Stage != null ? Walkabout.Stage.Sky : null;
            if (sky == null || Mathf.Abs(sky.Smoke - smoke) < 0.01f) return;
            sky.Smoke = smoke;
            sky.Turn(3f);
        }
    }
}
