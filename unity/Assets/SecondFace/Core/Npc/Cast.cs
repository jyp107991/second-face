using System;
using System.Collections.Generic;
using System.Linq;
using SecondFace.Core.Content;
using SecondFace.Core.Scene;

namespace SecondFace.Core.Npc
{
    /// <summary>
    /// The named people of one place drawn apart (#112, R3): every adult's face is three real faces blended
    /// (<see cref="RealFaces"/>), and two people of a town drawn from the same pool shared one or two of theirs and read as
    /// kin (Shale's Pike and Marsh, Fenn and Doran, Mai and Ana). Everyone named is drawn in one order (the maps by id,
    /// each map's people in their placement order, a person where they are first placed), each leaving out the real faces
    /// of those drawn before them who share any map with them, so a look stays the same every time it is asked for and a
    /// person placed in two towns is kept apart from the people of both. A place's extras leave out all of its named
    /// people's faces (<see cref="Extras.Of"/>).
    /// </summary>
    public static class Cast
    {
        private static Dictionary<string, NpcDef> _registry;
        private static readonly Dictionary<string, int[]> _faces = new();
        private static readonly Dictionary<string, int> _order = new();
        private static readonly Dictionary<string, List<string>> _maps = new();

        /// <summary>A named person's body and face as the content has them (<see cref="Bodies.For"/>, <see cref="Bodies.Over"/>),
        /// drawn apart from the people placed before them in their place.</summary>
        public static PlayerLook LookOf(NpcDef def, bool male) =>
            Bodies.Over(Bodies.For(def.Id, male, def.Look?.Age ?? 35.0, def.Role, ancestry: def.Look?.Ancestry, fit: false, avoid: Avoid(def.Id)),
                        def.Look?.Over, def.Look?.Age ?? 35.0);

        /// <summary>The real faces a look was drawn from (none for a child's or an authored face).</summary>
        public static IEnumerable<int> FacesOf(PlayerLook look)
        {
            var p = RealFaces.Parse(look?.FaceSource);
            return p.HasValue ? p.Value.Mix.Faces.Select(f => f.Id) : Enumerable.Empty<int>();
        }

        /// <summary>Every real face a map's named people were drawn from (for its extras to leave out).</summary>
        public static HashSet<int> Faces(MapDef map)
        {
            Fresh();
            var used = new HashSet<int>();
            if (map?.Npcs == null) return used;
            foreach (var p in map.Npcs)
                if (p.Def != null && Registry.Npcs.ContainsKey(p.Def)) used.UnionWith(FacesOfNpc(p.Def));
            return used;
        }

        /// <summary>The real faces of the people drawn before this one who share a map with them.</summary>
        public static HashSet<int> Avoid(string npcId)
        {
            Fresh();
            var avoid = new HashSet<int>();
            if (!_order.TryGetValue(npcId, out var at)) return avoid;
            var before = new HashSet<string>();
            foreach (var mapId in _maps[npcId])
                foreach (var p in Registry.Maps[mapId].Npcs)
                    if (p.Def != null && _order.TryGetValue(p.Def, out var o) && o < at && before.Add(p.Def))
                        avoid.UnionWith(FacesOfNpc(p.Def));
            return avoid;
        }

        private static int[] FacesOfNpc(string npcId)
        {
            if (_faces.TryGetValue(npcId, out var f)) return f;
            var def = Registry.Npcs[npcId];
            f = FacesOf(LookOf(def, Routine.Male(def.Look))).ToArray();
            _faces[npcId] = f;
            return f;
        }

        /// <summary>The caches follow the content: a new registry, new draws (and the order everyone is drawn in).</summary>
        private static void Fresh()
        {
            if (ReferenceEquals(_registry, Registry.Npcs)) return;
            _registry = Registry.Npcs;
            _faces.Clear();
            _order.Clear();
            _maps.Clear();
            foreach (var mapId in Registry.Maps.Keys.OrderBy(k => k, StringComparer.Ordinal))
            {
                var npcs = Registry.Maps[mapId].Npcs;
                if (npcs == null) continue;
                foreach (var p in npcs)
                {
                    if (p.Def == null || !Registry.Npcs.ContainsKey(p.Def)) continue;
                    if (!_order.ContainsKey(p.Def)) { _order[p.Def] = _order.Count; _maps[p.Def] = new List<string>(); }
                    if (!_maps[p.Def].Contains(mapId)) _maps[p.Def].Add(mapId);
                }
            }
        }
    }
}
