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
    /// kin (Shale's Pike and Marsh, Fenn and Doran, Mai and Ana). A person's place is the first map (by id) that places
    /// them; its people are drawn in their placement order, each leaving out the real faces those before them were drawn
    /// from, so a look stays the same every time it is asked for. The place's extras leave out all of theirs
    /// (<see cref="Extras.Of"/>).
    /// </summary>
    public static class Cast
    {
        private static Dictionary<string, NpcDef> _registry;
        private static readonly Dictionary<string, int[]> _faces = new();
        private static readonly Dictionary<string, string> _place = new();

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

        /// <summary>The real faces the people placed before this one in their place were drawn from.</summary>
        public static HashSet<int> Avoid(string npcId)
        {
            Fresh();
            var avoid = new HashSet<int>();
            var map = PlaceOf(npcId);
            if (map?.Npcs == null) return avoid;
            var seen = new HashSet<string>();
            foreach (var p in map.Npcs)
            {
                if (p.Def == null) continue;
                if (p.Def == npcId) break;
                if (seen.Add(p.Def) && Registry.Npcs.ContainsKey(p.Def)) avoid.UnionWith(FacesOfNpc(p.Def));
            }
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

        private static MapDef PlaceOf(string npcId)
        {
            if (!_place.TryGetValue(npcId, out var id))
            {
                id = Registry.Maps.Keys.OrderBy(k => k, StringComparer.Ordinal)
                    .FirstOrDefault(k => Registry.Maps[k].Npcs != null && Registry.Maps[k].Npcs.Any(p => p.Def == npcId));
                _place[npcId] = id;
            }
            return id != null && Registry.Maps.TryGetValue(id, out var m) ? m : null;
        }

        /// <summary>The caches follow the content: a new registry, new draws.</summary>
        private static void Fresh()
        {
            if (ReferenceEquals(_registry, Registry.Npcs)) return;
            _registry = Registry.Npcs;
            _faces.Clear();
            _place.Clear();
        }
    }
}
