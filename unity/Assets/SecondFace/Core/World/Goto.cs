using System;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;
using SecondFace.Core.Content;
using SecondFace.Core.Scene;
using SecondFace.Core.Dialogue;

namespace SecondFace.Core.World
{
    /// <summary>A scripted move the content asks for (the <c>goto</c> event: a lift, a district's transit, a cell door):
    /// to a map's spawn, with the minutes it takes.</summary>
    public sealed class GotoOrder
    {
        public string Location;
        /// <summary>The spawn on that map (null: its first).</summary>
        public string Spawn;
        public double Minutes;

        /// <summary>The event's data, <c>{ location, spawn?, minutes? }</c> (null when it names no location).</summary>
        public static GotoOrder From(JToken data)
        {
            var o = data as JObject;
            var location = (string)o?["location"];
            if (string.IsNullOrEmpty(location)) return null;
            var m = o["minutes"];
            return new GotoOrder
            {
                Location = location,
                Spawn = (string)o["spawn"],
                Minutes = m != null && m.Type != JTokenType.Null ? Math.Max(0, m.Value<double>()) : 0,
            };
        }
    }

    /// <summary>Where a move lands: the map and its spawn, and the world's place that holds it.</summary>
    public sealed class GotoTarget
    {
        public MapDef Map;
        /// <summary>The spawn named (or the map's first when none was named or the name is unknown).</summary>
        public SpawnDef Spawn;
        /// <summary>The named spawn is on the map (false: the first stands in for it).</summary>
        public bool SpawnFound;
        /// <summary>The world's place the map is stamped into, or lies under or beside.</summary>
        public string Place;
        /// <summary>How the place was found: "map" (the map is that place's own), "exits" (reached through the maps it
        /// opens onto: a cellar, a district beside another), "settlement" (the town it belongs to).</summary>
        public string Via;
    }

    /// <summary>
    /// The content's moves between maps in one open world (port of the web game's <c>goto</c> event and its
    /// <c>loadLocation</c>): a map is either a place's own (stamped into the world), or lies under or beside one (a
    /// shelter under its mouth, a district beside another), or is a room of a town not yet stamped (it goes to the
    /// town). Pure: the world's places come in as a lookup (the layout at run time; the content's sites in tests).
    /// </summary>
    public static class Goto
    {
        /// <summary>Resolves a move. <paramref name="placeOf"/> gives the world place that holds a map, or a place by its
        /// own id (null when none). Null when the map is unknown or no place holds it.</summary>
        public static GotoTarget Resolve(string location, string spawn, Func<string, string> placeOf)
        {
            if (string.IsNullOrEmpty(location) || !Registry.Maps.TryGetValue(location, out var map)) return null;
            var t = new GotoTarget { Map = map };
            var spawns = map.Spawns ?? new List<SpawnDef>();
            if (!string.IsNullOrEmpty(spawn)) t.Spawn = spawns.Find(s => s.Id == spawn);
            t.SpawnFound = t.Spawn != null;
            t.Spawn ??= spawns.Count > 0 ? spawns[0] : null;
            t.Place = placeOf(location);
            if (t.Place != null) { t.Via = "map"; return t; }
            // through the maps it opens onto or that open onto it, nearest first (a cellar under its street, a
            // district beside the one stamped)
            var seen = new HashSet<string> { location };
            var queue = new Queue<string>();
            foreach (var n in Neighbours(location)) if (seen.Add(n)) queue.Enqueue(n);
            while (queue.Count > 0)
            {
                var m = queue.Dequeue();
                var p = placeOf(m);
                if (p != null) { t.Place = p; t.Via = "exits"; return t; }
                foreach (var n in Neighbours(m)) if (seen.Add(n)) queue.Enqueue(n);
            }
            if (!string.IsNullOrEmpty(map.Settlement))
            {
                t.Place = placeOf(map.Settlement);
                // (a town's place need not share its id: Number Four stands at the world's mine_teeth)
                if (t.Place == null)
                    foreach (var loc in Registry.WorldMap.Locations.Values)
                    {
                        if (loc == null || loc.Settlement != map.Settlement) continue;
                        t.Place = placeOf(loc.Id) ?? (!string.IsNullOrEmpty(loc.Map) ? placeOf(loc.Map) : null);
                        if (t.Place != null) break;
                    }
                if (t.Place != null) { t.Via = "settlement"; return t; }
            }
            return null;
        }

        /// <summary>The maps a map's exits lead to, and the maps whose exits lead to it; also the maps its doors lead to
        /// by conversation (a <c>goto</c> in the dialogue of one of its talk props, or in the map's own data: a crank,
        /// a stair, a lift), and the maps whose doors lead to it that way.</summary>
        public static IEnumerable<string> Neighbours(string mapId)
        {
            if (Registry.Maps.TryGetValue(mapId, out var map) && map.Exits != null)
                foreach (var e in map.Exits)
                    if (!string.IsNullOrEmpty(e.To?.Location) && Registry.Maps.ContainsKey(e.To.Location)) yield return e.To.Location;
            foreach (var other in Registry.Maps.Values)
            {
                if (other.Exits == null || other.Id == mapId) continue;
                foreach (var e in other.Exits)
                    if (e.To?.Location == mapId) { yield return other.Id; break; }
            }
            var links = DoorLinks();
            if (links.TryGetValue(mapId, out var near))
                foreach (var n in near) yield return n;
        }

        private static Dictionary<string, MapDef> _linksMaps;
        private static Dictionary<string, DialogueDef> _linksDialogues;
        private static int _linksCount = -1;
        private static Dictionary<string, HashSet<string>> _links;

        /// <summary>Both ways, the maps joined by a conversation's or a map's own <c>goto</c> (built once per content load).</summary>
        public static Dictionary<string, HashSet<string>> DoorLinks()
        {
            var count = Registry.Maps.Count * 100003 + Registry.Dialogues.Count;
            if (_links != null && ReferenceEquals(_linksMaps, Registry.Maps) && ReferenceEquals(_linksDialogues, Registry.Dialogues)
                && _linksCount == count) return _links;
            var links = new Dictionary<string, HashSet<string>>();
            void Join(string a, string b)
            {
                if (string.IsNullOrEmpty(a) || string.IsNullOrEmpty(b) || a == b || !Registry.Maps.ContainsKey(b)) return;
                if (!links.TryGetValue(a, out var x)) links[a] = x = new HashSet<string>();
                if (!links.TryGetValue(b, out var y)) links[b] = y = new HashSet<string>();
                x.Add(b); y.Add(a);
            }
            var serializer = Newtonsoft.Json.JsonSerializer.CreateDefault();
            var dialogueGotos = new Dictionary<string, List<string>>();
            List<string> GotosOfDialogue(string id)
            {
                if (string.IsNullOrEmpty(id)) return null;
                if (dialogueGotos.TryGetValue(id, out var known)) return known;
                var list = new List<string>();
                if (Registry.Dialogues.TryGetValue(id, out var def) && def != null)
                    foreach (var (_, order, _) in InContent(("d", JToken.FromObject(def, serializer))))
                        if (order != null) list.Add(order.Location);
                return dialogueGotos[id] = list;
            }
            foreach (var m in Registry.Maps.Values)
            {
                if (m == null) continue;
                if (m.Talk != null)
                    foreach (var t in m.Talk.Values)
                    {
                        var to = GotosOfDialogue(t?.Dialogue);
                        if (to != null) foreach (var loc in to) Join(m.Id, loc);
                    }
                // gotos written in the map's own data (its triggers' effects)
                if (m.Triggers != null)
                    foreach (var (_, order, _) in InContent(("t", JToken.FromObject(m.Triggers, serializer))))
                        if (order != null) Join(m.Id, order.Location);
            }
            _links = links; _linksMaps = Registry.Maps; _linksDialogues = Registry.Dialogues; _linksCount = count;
            return links;
        }

        /// <summary>The world place holding a map as the content alone has it (the web game's sites): the world map's
        /// location whose map it is; a site stood at a location, or beside another site (followed to the one stood at a
        /// location); a location by its own id. Null for a cell (a map with no site).</summary>
        public static Func<string, string> ContentPlaces(JToken sites)
        {
            var table = sites as JObject;
            string Of(string id, int depth)
            {
                if (string.IsNullOrEmpty(id) || depth > 16) return null;
                foreach (var l in Registry.WorldMap.Locations)
                    if (l.Value.Map == id) return l.Key;
                var site = table?[id] as JObject;
                if (site != null && (string)site["kind"] != "cell")
                {
                    var at = (string)site["at"];
                    if (!string.IsNullOrEmpty(at) && Registry.WorldMap.Locations.ContainsKey(at)) return at;
                    var beside = (string)site["beside"]?["site"];
                    if (!string.IsNullOrEmpty(beside)) return Of(beside, depth + 1);
                }
                return Registry.WorldMap.Locations.ContainsKey(id) ? id : null;
            }
            return id => Of(id, 0);
        }

        /// <summary>Every <c>goto</c> the content asks for (in conversations, quests and maps), with where it is written.</summary>
        public static List<(string Where, GotoOrder Order, JToken Data)> InContent(params (string Name, JToken Table)[] tables)
        {
            var found = new List<(string, GotoOrder, JToken)>();
            void Walk(JToken t, string where)
            {
                if (t is JObject o)
                {
                    if ((string)o["event"] == "goto") found.Add((where, GotoOrder.From(o["data"]), o["data"]));
                    foreach (var p in o.Properties()) Walk(p.Value, where);
                }
                else if (t is JArray a) foreach (var e in a) Walk(e, where);
            }
            foreach (var (name, table) in tables)
            {
                if (table is JObject top) foreach (var p in top.Properties()) Walk(p.Value, $"{name}.{p.Name}");
                else Walk(table, name);
            }
            return found;
        }
    }
}
