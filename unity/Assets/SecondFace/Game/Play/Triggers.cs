using System.Collections.Generic;
using SecondFace.Core.Content;
using SecondFace.Core.State;
using SecondFace.Core.World;
using SecondFace.Game.World;
using UnityEngine;

namespace SecondFace.Game.Play
{
    /// <summary>
    /// The maps' area triggers in the open world (P7; the web game's triggers): walking into a trigger's area (a
    /// <see cref="PlaceMarker"/> of kind "trigger", sized in metres, in the place's own frame) while its condition holds
    /// says its line and applies its effects (or, standing inside, as soon as the condition comes to hold); a trigger fires
    /// once unless the content says otherwise (remembered in the game's flags, so a save keeps it). A trigger's "talk" event opens that person's conversation (the stranger at the
    /// door, the riders in the square). Checked a few times a second.
    /// </summary>
    public sealed class Triggers : MonoBehaviour
    {
        public Walkabout Walkabout;
        public PlaceSpawner Spawner;
        public const float Tick = 0.2f;
        private float _next;
        private readonly HashSet<string> _inside = new();
        private readonly List<PlaceMarker> _markers = new();

        private void Update()
        {
            if (Walkabout == null || Walkabout.Walker == null || Spawner == null || Time.unscaledTime < _next) return;
            _next = Time.unscaledTime + Tick;
            if (Walkabout.Busy) return;   // not while a conversation, a screen or a fight is up
            var g = Walkabout.Game;
            var at = Walkabout.Walker.transform.position;
            foreach (var (placeId, place) in Spawner.Standing())
            {
                if (place == null) continue;
                _markers.Clear();
                place.GetComponentsInChildren(_markers);
                foreach (var m in _markers)
                {
                    if (m.Kind != "trigger" || string.IsNullOrEmpty(m.Map) || !Registry.Maps.TryGetValue(m.Map, out var map) || map.Triggers == null) continue;
                    var key = $"{m.Map}.{m.Id}";
                    var local = m.transform.InverseTransformPoint(at);
                    var inside = Mathf.Abs(local.x) <= m.Size.x * 0.5f + 0.3f && Mathf.Abs(local.z) <= m.Size.y * 0.5f + 0.3f && Mathf.Abs(local.y) < 6f;
                    if (!inside) { _inside.Remove(key); continue; }
                    if (_inside.Contains(key)) continue;   // fired on this visit: again only after leaving and coming back
                    var def = map.Triggers.Find(t => t.Id == m.Id);
                    if (def == null) continue;
                    var once = def.Once ?? true;
                    var flag = "trg." + key;
                    if (once && g.Flags.ContainsKey(flag)) { _inside.Add(key); continue; }
                    // its condition is tested again while the player stays inside: standing at the door when the watch
                    // begins still brings what the watch brings
                    if (def.If != null && !Logic.Test(def.If, g)) continue;
                    _inside.Add(key);
                    if (once) g.Flags[flag] = true;
                    Walkabout.Fire(def);
                }
            }
        }
    }
}
