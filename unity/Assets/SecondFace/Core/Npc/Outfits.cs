using System.Collections.Generic;
using System.Linq;
using SecondFace.Core.Content;

namespace SecondFace.Core.Npc
{
    /// <summary>The garment catalogue (port of data/garments.ts): lookups over the exported table.</summary>
    public static class Garments
    {
        public static readonly string[] Slots = { "full", "top", "over", "legs", "feet", "head", "eyes", "face", "hands", "gear" };

        public static GarmentDef Def(string id) => Registry.Garments.TryGetValue(id, out var g) ? g : null;

        /// <summary>Garments for a slot that suit a fit (unisex pieces suit both), in catalogue order.</summary>
        public static List<string> For(string slot, string fit)
        {
            var l = new List<string>();
            foreach (var id in Registry.GarmentIds)
            {
                var g = Registry.Garments[id];
                if (g.Slot == slot && (g.Fit == "u" || g.Fit == fit)) l.Add(id);
            }
            return l;
        }
    }

    /// <summary>
    /// Outfit roles (port of data/outfits.ts): who someone is shows in what they wear. Each role weights garment styles,
    /// sets how often optional pieces appear, the dye palette, and how dirty and worn things are. Wealth reads at a
    /// glance: the Crown's silks are clean and saturated, the Sink's are patched, faded and filthy.
    /// </summary>
    public static class Outfits
    {
        public static readonly string[] Roles = { "vault", "settler", "labourer", "trader", "raider", "guard", "medic", "pilgrim", "nomad", "fisher", "street", "gilded", "corp", "tech", "drifter" };
        /// <summary>Procedural gear that leaves no hair to show.</summary>
        public static readonly string[] GearHidesHair = { "headwrap", "hardhat" };

        public static RoleDef Role(string role) => Registry.OutfitRoles.TryGetValue(role, out var r) ? r : throw new System.ArgumentException($"Unknown outfit role {role}");

        private static string PickGarment(Rng r, string slot, string fit, Dictionary<string, double> styles, HashSet<string> avoid)
        {
            var ids = new List<string>();
            var weights = new List<double>();
            foreach (var id in Garments.For(slot, fit))
            {
                if (avoid.Contains(id)) continue;
                double w = 0;
                foreach (var s in Registry.Garments[id].Tags) if (styles.TryGetValue(s, out var sw)) w += sw;
                if (w > 0) { ids.Add(id); weights.Add(w); }
            }
            double total = 0;
            foreach (var w in weights) total += w * w;
            if (total <= 0) return null;
            // Squared weights: pieces that match several of the role's styles are strongly preferred.
            var x = r.Next() * total;
            for (var i = 0; i < ids.Count; i++) if ((x -= weights[i] * weights[i]) < 0) return ids[i];
            return ids[ids.Count - 1];
        }

        private static string Region(string kind) => kind == "headwrap" ? "head" : kind == "goggles" || kind == "goggles_up" ? "eyes" : kind == "bandana" || kind == "respirator" ? "face" : kind;

        private static bool IsCloth(string kind) => kind == "poncho" || kind == "wrap" || kind == "headwrap" || kind == "bandana" || kind == "armband";

        /// <summary>A plausible outfit for someone in a role (and faction, if any). Deterministic per seed; the same sequence as the web game.</summary>
        public static Outfit DressFor(int seed, string role, string fit, string faction = null)
        {
            var r = new Rng(unchecked((uint)(seed * 7919L + 17)));
            var R = Role(role);
            var F = faction != null && Registry.FactionLooks.TryGetValue(faction, out var fl) ? fl : null;
            var styles = new Dictionary<string, double>(R.Styles);
            if (F?.Styles != null) foreach (var kv in F.Styles) styles[kv.Key] = (styles.TryGetValue(kv.Key, out var v) ? v : 0) + kv.Value;
            var palette = F?.Palette ?? R.Palette;
            var used = new HashSet<string>();
            var layers = new List<GarmentLook>();
            bool Add(string slot)
            {
                var id = PickGarment(r, slot, fit, styles, used);
                if (id == null) return false;
                used.Add(id);
                var g = new GarmentLook { Name = id };
                if (Registry.Garments[id].Dye == true && r.Chance(R.Dye)) g.Dye = r.Pick(palette);
                layers.Add(g);
                return true;
            }
            if (!(r.Chance(R.Full) && Add("full"))) { Add("legs"); Add("top"); }
            Add("feet");
            foreach (var slot in new[] { "over", "head", "eyes", "face", "hands", "gear" }) if (r.Chance(R.Chance.TryGetValue(slot, out var c) ? c : 0)) Add(slot);
            // Procedural gear: at most one piece per head region, and nothing a library piece already covers.
            var gear = new List<GearLook>();
            bool HasSlot(string s) => layers.Any(g => Registry.Garments[g.Name].Slot == s);
            bool hasHead = HasSlot("head"), hasEyes = HasSlot("eyes"), hasFace = HasSlot("face");
            var taken = new HashSet<string>();
            void Place(string kind, int? color)
            {
                var region = Region(kind);
                if (taken.Contains(region) || (region == "head" && hasHead) || (region == "eyes" && hasEyes) || (region == "face" && hasFace)) return;
                if ((kind == "plates" || kind == "harness") && HasSlot("over")) return;
                taken.Add(region);
                gear.Add(new GearLook { Kind = kind, Color = color ?? (IsCloth(kind) ? r.Pick(palette) : (int?)null) });
            }
            if (F?.Marker != null && r.Chance(F.Marker.Chance ?? 0.7)) Place(F.Marker.Gear, F.Marker.Color);
            foreach (var (kind, chance) in R.Gear) if (r.Chance(chance)) Place(kind, null);
            var grime = F?.Grime ?? R.Grime;
            return new Outfit { Layers = layers, Gear = gear, Grime = r.Range(grime[0], grime[1]), Wear = r.Range(R.Wear[0], R.Wear[1]) };
        }

        /// <summary>Body lifestyle, hair world and dye chance that go with a role (for the appearance generator).</summary>
        public static (string life, double? dyeChance, string hair) RoleLook(string role)
        {
            var R = Role(role);
            return (R.Life, R.HairDye, R.Hair);
        }

        /// <summary>How the head piece of an outfit treats the hair: "hide", "crop", or null (untouched).</summary>
        public static string HairMode(Outfit o)
        {
            string mode = null;
            if (o.Gear != null && o.Gear.Any(g => System.Array.IndexOf(GearHidesHair, g.Kind) >= 0)) return "hide";
            foreach (var g in o.Layers ?? new List<GarmentLook>())
            {
                var h = Garments.Def(g.Name)?.Hair;
                if (h == "hide") return "hide";
                if (h != null) mode = h;
            }
            return mode;
        }
    }
}
