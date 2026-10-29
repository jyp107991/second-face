using System.Collections.Generic;
using System.Linq;
using SecondFace.Core.Content;
using SecondFace.Core.Npc;
using SecondFace.Core.Stats;

namespace SecondFace.Core.Inventory
{
    /// <summary>
    /// What a body wears, read off the inventory and the chrome (port of inventory/wardrobe.ts), so the figure in the
    /// world and the one in the pack change the moment something is equipped, taken off or installed: the base clothes,
    /// then worn armour over or instead of them, the weapon in hand, the visible chrome.
    /// </summary>
    public static class Wear
    {
        /// <summary>What everyone from the Cistern walks out in.</summary>
        public static Outfit Base() => new()
        {
            Layers = new List<GarmentLook>
            {
                new() { Name = "cortu_cargo_pants", Dye = 0x5a5e54, Grime = 0.25 },
                new() { Name = "toigo_basic_tucked_t-shirt", Dye = 0x8a8c80, Grime = 0.2 },
                new() { Name = "maciekg_leather_boots", Grime = 0.3 },
            },
        };

        /// <summary>Chrome plating by make (salvaged pre-Burn gunmetal, Mender-built matte black, Concern pearl) and the
        /// lit accent.</summary>
        private static readonly Dictionary<string, (int plate, int accent)> ChromeLook = new()
        {
            ["old"] = (0x6c7074, 0xffa030), ["dark"] = (0x26282c, 0xff3838), ["concern"] = (0xd6d8da, 0x3fe0ff),
        };

        private static readonly Dictionary<string, string[]> ChromeGear = new()
        {
            ["eyes"] = new[] { "chrome_eye" }, ["neural"] = new[] { "chrome_neural" }, ["armL"] = new[] { "chrome_arm_l" },
            ["armR"] = new[] { "chrome_arm_r" }, ["legs"] = new[] { "chrome_leg_l", "chrome_leg_r" }, ["spine"] = new[] { "chrome_spine" },
            ["skin"] = new[] { "chrome_skin" }, ["organs"] = new string[0],
        };

        private static string SlotOf(string garment) => Garments.Def(garment)?.Slot;

        /// <summary>The outfit for a wearer of a fit (m or f) over a base (default <see cref="Base"/>).</summary>
        public static Outfit Of(Inventory inv, CharacterSheet sheet, string fit, Outfit @base = null)
        {
            @base ??= Base();
            var o = new Outfit
            {
                Suit = @base.Suit, SuitTint = @base.SuitTint, Shoes = @base.Shoes, ShoeTint = @base.ShoeTint, Mask = @base.Mask,
                Layers = (@base.Layers ?? new List<GarmentLook>()).Select(l => new GarmentLook { Name = l.Name, Tint = l.Tint, Dye = l.Dye, Grime = l.Grime, Wear = l.Wear }).ToList(),
                Gear = (@base.Gear ?? new List<GearLook>()).ToList(),
                Grime = @base.Grime, Wear = @base.Wear,
            };
            foreach (var slot in new[] { "body", "head" })
            {
                var it = inv.EquippedAt(slot);
                var w = it != null && Items.Has(it.Def) ? Items.Def(it.Def).Wear : null;
                if (w == null) continue;
                if (w.Garments != null)
                {
                    // a whole set of clothes: it replaces the base suit and whatever the base wore on top and legs
                    o.Suit = null;
                    o.Layers = o.Layers.Where(l => SlotOf(l.Name) is not ("top" or "legs" or "full")).ToList();
                    foreach (var g in w.Garments) o.Layers.Add(new GarmentLook { Name = g.Name?.For(fit), Tint = g.Tint, Dye = g.Dye, Grime = g.Grime, Wear = g.Wear });
                }
                if (w.Garment != null)
                {
                    var name = w.Garment.For(fit);
                    var of = SlotOf(name);
                    // a full garment replaces the base suit; anything else (a vest, a hat) goes over it
                    if (slot == "body" && (of == null || of == "full" || of == "top")) { o.Suit = name; o.SuitTint = w.Tint; }
                    else o.Layers.Add(new GarmentLook { Name = name, Tint = w.Tint });
                }
                if (w.Gear != null) foreach (var g in w.Gear) o.Gear.Add(new GearLook { Kind = g.Kind, Color = g.Color });
                if (w.Mask == true) o.Mask = true;
            }
            var active = inv.EquippedAt(inv.Active);
            o.Held = active != null && Items.Has(active.Def) ? Items.Def(active.Def).Held : null;
            if (sheet != null)
                foreach (var c in Chrome.Installed(sheet))
                {
                    if (!c.Def.Visible || !ChromeGear.TryGetValue(c.Slot, out var kinds)) continue;
                    var look = ChromeLook.TryGetValue(c.Def.Grade ?? "", out var l) ? l : ChromeLook["old"];
                    foreach (var kind in kinds)
                        o.Gear.Add(new GearLook { Kind = kind, Color = look.plate, Accent = look.accent, Grade = c.Def.Grade, Wear = 1 - c.Piece.Condition });
                }
            return o;
        }

        /// <summary>Changes whenever the outfit would: compare it instead of re-dressing the figure.</summary>
        public static string Key(Inventory inv, CharacterSheet sheet)
        {
            var chrome = sheet != null ? string.Join(",", Chrome.Installed(sheet).Select(c => c.Piece.Id)) : "";
            return $"{inv.EquippedAt("body")?.Def}|{inv.EquippedAt("head")?.Def}|{inv.EquippedAt(inv.Active)?.Def}|{chrome}";
        }
    }
}
