using System.Collections.Generic;
using SecondFace.Core.Inventory;
using SecondFace.Core.Npc;
using SecondFace.Core.State;
using UnityEngine;

namespace SecondFace.Game.People
{
    /// <summary>
    /// The player's body as the character was made (P5.3j): the base for the look's body (one or two), their own clothes
    /// as creation dyed them, what they have equipped over those (<see cref="Wear"/>), and the look itself (face, build,
    /// hair, skin, eyes, marks: <see cref="LookView"/>) at the look's height. The walker in the world, the figure in the
    /// pack and the one in creation are all dressed this one way.
    /// </summary>
    public static class PlayerBody
    {
        /// <summary>The look a character was made with (a default look for a character without one).</summary>
        public static PlayerLook Look(PlayerCharacter pc) => PlayerLook.From(pc?.Appearance);

        /// <summary>The base prefab for a look's body.</summary>
        public static GameObject Base(PlayerLook look, GameObject bodyF, GameObject bodyM, RocketboxCatalog rocketbox = null)
        {
            var rb = look?.Rb != null && rocketbox != null ? rocketbox.Get(look.Rb) : null;
            if (rb != null) return rb;
            return look != null && look.Body == "m" ? bodyM : bodyF;
        }

        /// <summary>A Rocketbox person's height against their own (the creation's height slider: ±6 %).</summary>
        public static float RbScale(PlayerLook look) => 1f + 0.06f * Mathf.Clamp(look?.Height ?? 0f, -1f, 1f);

        /// <summary>The player's dyes on their Rocketbox person: the look's top, legs and accent where chosen, the rest as a
        /// settler of Knock would wear them.</summary>
        public static RbDyes Dyes(PlayerLook look)
        {
            var d = RbPeople.DyesFor(RbPeople.Of(look.Rb), "player:" + look.Rb, "settler", null);
            if (look.Dyes != null)
            {
                if (look.Dyes.TryGetValue("top", out var t)) d.Top = t;
                if (look.Dyes.TryGetValue("legs", out var l)) d.Legs = l;
                if (look.Dyes.TryGetValue("accent", out var a)) d.Accent = a;
            }
            d.Grime = 0.25; d.Wear = 0.35;
            return d;
        }

        /// <summary>A Rocketbox body as the player made it: dyed, the face sculpted (inside the head's room where the
        /// calibration knows it), at their height.</summary>
        public static void ApplyRocketbox(GameObject body, PlayerLook look)
        {
            if (body == null || look?.Rb == null) return;
            RbDress.Apply(body, Dyes(look));
            var fs = body.GetComponentInChildren<FaceSculpt>() ?? body.AddComponent<FaceSculpt>();
            var face = look.Face ?? new Dictionary<string, float>();
            fs.Set(RocketboxSculpt.Knows(look.Rb) ? RocketboxSculpt.Clamp(look.Rb, face) : face);
            body.transform.localScale = Vector3.one * RbScale(look);
        }

        /// <summary>Their own clothes: the base's outfit, each garment in the look's dye for its slot (its own colour when
        /// the look leaves the slot undyed).</summary>
        public static Outfit Own(Wardrobe wardrobe, PlayerLook look)
        {
            var o = new Outfit { Layers = new List<GarmentLook>() };
            if (wardrobe == null || wardrobe.Set == null) return o;
            foreach (var id in wardrobe.Set.Outfit)
            {
                var g = wardrobe.Set.Find(id);
                int? dye = g != null && look != null && look.Dyes != null && look.Dyes.TryGetValue(g.Slot, out var d) && d != 0xffffff ? d : null;
                o.Layers.Add(new GarmentLook { Name = id, Dye = dye });
            }
            return o;
        }

        /// <summary>Dresses a player base for a character (their own clothes under what they have equipped) and puts their
        /// look on it at its height.</summary>
        public static void Apply(GameObject body, PlayerCharacter pc)
        {
            if (body == null || pc == null) return;
            var look = Look(pc);
            if (look.Rb != null && body.GetComponentInChildren<Wardrobe>() == null) { ApplyRocketbox(body, look); return; }
            var wardrobe = body.GetComponentInChildren<Wardrobe>();
            if (wardrobe != null) Dresser.Dress(wardrobe, Wear.Of(pc.Inventory, pc.Sheet, look.Body, Own(wardrobe, look)));
            LookView.Apply(body, look);
            body.transform.localScale = Vector3.one * LookView.Scale(look);
        }
    }
}
