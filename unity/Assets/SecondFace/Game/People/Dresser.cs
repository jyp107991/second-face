using System.Collections.Generic;
using System.Linq;
using SecondFace.Core.Npc;
using UnityEngine;

namespace SecondFace.Game.People
{
    /// <summary>
    /// Puts an outfit from the rules (Core <c>Wear.Of</c>: base clothes, worn armour, the weapon in hand) on a person's
    /// <see cref="Wardrobe"/> (P5.3h): slot by slot, the outfit's garment where the person's set has it built, the set's
    /// own garment where it has not (so a coat whose shirt is not built yet keeps the shirt under it); a dye or a tint
    /// colours the garment, and its grime and wear (the content's, else <see cref="LivedIn"/>) weather it. Procedural
    /// gear, the held weapon and visible chrome are not built as garments yet.
    /// </summary>
    public static class Dresser
    {
        public struct Piece
        {
            public string Id, Slot;
            public Color Colour;
            public float Grime, Wear;
        }

        /// <summary>The grime of a garment the content gives none (the player's own clothes are lived in).</summary>
        public const float LivedIn = 0.2f;

        /// <summary>What a set would wear for an outfit, by slot.</summary>
        public static List<Piece> Pick(WardrobeSet set, Outfit o)
        {
            var bySlot = new Dictionary<string, Piece>();
            if (set == null) return new List<Piece>();
            foreach (var id in set.Outfit)
            {
                var g = set.Find(id);
                if (g != null) bySlot[g.Slot] = new Piece { Id = id, Slot = g.Slot, Colour = Color.white, Grime = (float)(o?.Grime ?? LivedIn), Wear = (float)(o?.Wear ?? 0) };
            }
            var looks = new List<GarmentLook>();
            if (!string.IsNullOrEmpty(o?.Suit)) looks.Add(new GarmentLook { Name = o.Suit, Tint = o.SuitTint });
            if (o?.Layers != null) looks.AddRange(o.Layers);
            foreach (var l in looks)
            {
                var g = l.Name != null ? set.Find(l.Name) : null;
                // a garment the set lacks (not built, or its import failed): another of the same slot from the set, chosen
                // by the name so the same person always gets the same stand-in, never bare skin where clothes were meant
                if (g == null && l.Name != null && Core.Npc.Garments.Def(l.Name) is { } def) g = StandIn(set, def.Slot, l.Name);
                if (g == null) continue;
                bySlot[g.Slot] = new Piece
                {
                    Id = g.Id, Slot = g.Slot, Colour = Colour(l.Dye ?? l.Tint),
                    Grime = (float)(l.Grime ?? o.Grime ?? LivedIn), Wear = (float)(l.Wear ?? o.Wear ?? 0),
                };
            }
            return bySlot.Values.ToList();
        }

        /// <summary>A garment of the set for a slot, picked by a name's stable hash (null when the set has none for it).</summary>
        public static WardrobeSet.Garment StandIn(WardrobeSet set, string slot, string name)
        {
            var all = set.Garments.Where(g => g.Slot == slot && g.Prefab != null).ToList();
            if (all.Count == 0) return null;
            uint h = 2166136261;
            foreach (var c in name) h = (h ^ c) * 16777619;
            return all[(int)(h % (uint)all.Count)];
        }

        /// <summary>Dresses a person for an outfit (the wardrobe takes off what is not in it).</summary>
        public static void Dress(Wardrobe w, Outfit o)
        {
            if (w == null || w.Set == null) return;
            var pieces = Pick(w.Set, o);
            w.Wear(pieces.Select(p => p.Id));
            foreach (var p in pieces)
            {
                w.Dye(p.Slot, p.Colour);
                w.Weather(p.Slot, p.Grime, p.Wear);
            }
        }

        /// <summary>A content colour (0xRRGGBB) as a garment tint; white (its own colour) when none.</summary>
        public static Color Colour(int? rgb)
        {
            if (rgb == null) return Color.white;
            var v = rgb.Value;
            // a dye is light enough to keep the weave's shading under it
            var c = new Color(((v >> 16) & 255) / 255f, ((v >> 8) & 255) / 255f, (v & 255) / 255f);
            return Color.Lerp(c, Color.white, 0.25f);
        }
    }
}
