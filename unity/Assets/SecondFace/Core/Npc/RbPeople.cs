using System;
using System.Collections.Generic;
using System.Linq;
using SecondFace.Core.Content;

namespace SecondFace.Core.Npc
{
    /// <summary>One of the game's people as a Rocketbox person (L3, owner 2026-11-05: the people are Rocketbox's, locked;
    /// their clothes lore-bound by the outfit bake): who they look like (sex, apparent age, people) and what their body's
    /// clothes, re-dyed, stand for (a style and the outfit roles it dresses; tools/unity/people/rb_bodies.py).</summary>
    public sealed class RbPerson
    {
        public string Id;
        public bool Male;
        public int Age;
        public string People;
        public string Style;
        public string[] Roles;
        /// <summary>Per dye group (top, legs, second piece): the garment's own colour (sRGB, 0xRRGGBB) and whether it may keep
        /// it ("denim", "leather" or null: always dyed).</summary>
        public int[] Own;
        public string[] OwnKind;
        /// <summary>Their export carries the face sculptor's shape keys (a player may be them).</summary>
        public bool Face;
    }

    /// <summary>A person's three dyes and how worn their clothes are (the Person shader's _Dye0-2, _Grime, _Wear).</summary>
    public struct RbDyes
    {
        public int Top, Legs, Accent;
        public double Grime, Wear;
        /// <summary>The layers worn over the body's own clothes (RbLayers.All: the wardrobe rule, owner 2026-11-06: no one
        /// on the frontier goes about in a clean tee and shorts), their canvas's dye and their leather's tone.</summary>
        public string[] Layers;
        public int Shell, Leather;
    }

    /// <summary>
    /// The layers a Rocketbox person wears over their body's own clothes (the wardrobe rule: salvaged, layered, patched,
    /// taped and rigged; owner 2026-11-06: "how is this post apocalyptic/cyberpunk? they look like they are going for a stroll
    /// in california"). Each layer is cut from the person's own skin at build time (Editor RocketboxLayers) and dyed at
    /// runtime. Chosen per person by their trade, deterministically; the game adds work trousers over bare legs whatever
    /// the trade (Game RbLayerSet.BareLegs). Megacity's rich and its corp people wear none: their clean cloth is their
    /// costume.
    /// </summary>
    public static class RbLayers
    {
        /// <summary>Every layer, in the order they are put on (each over the ones before).</summary>
        public static readonly string[] All = { "cargo", "boots", "gaiter", "bomber", "vest", "straps", "cape", "belt", "wraps", "shins" };

        private static readonly Dictionary<string, (string Layer, double Chance)[]> ByRole = new()
        {
            ["settler"] = new[] { ("cargo", 0.35), ("boots", 1.0), ("vest", 0.45), ("gaiter", 0.35), ("belt", 0.6), ("wraps", 0.3), ("cape", 0.15) },
            ["labourer"] = new[] { ("cargo", 0.6), ("boots", 1.0), ("vest", 0.55), ("straps", 0.3), ("belt", 0.8), ("wraps", 0.5), ("shins", 0.3), ("gaiter", 0.3) },
            ["fisher"] = new[] { ("cargo", 0.5), ("boots", 1.0), ("vest", 0.5), ("gaiter", 0.5), ("belt", 0.5), ("wraps", 0.4) },
            ["trader"] = new[] { ("boots", 1.0), ("vest", 0.5), ("cape", 0.35), ("gaiter", 0.5), ("belt", 0.85), ("cargo", 0.25) },
            ["guard"] = new[] { ("bomber", 0.6), ("vest", 0.5), ("straps", 0.5), ("boots", 1.0), ("belt", 1.0), ("shins", 0.45), ("gaiter", 0.45), ("cargo", 0.5) },
            ["raider"] = new[] { ("vest", 0.75), ("straps", 0.7), ("shins", 0.6), ("wraps", 0.6), ("boots", 1.0), ("gaiter", 0.5), ("belt", 0.8), ("cape", 0.3), ("cargo", 0.5) },
            ["drifter"] = new[] { ("cape", 0.7), ("wraps", 0.6), ("boots", 1.0), ("gaiter", 0.6), ("belt", 0.55), ("cargo", 0.45), ("vest", 0.25) },
            ["nomad"] = new[] { ("cape", 0.75), ("wraps", 0.55), ("boots", 1.0), ("gaiter", 0.65), ("belt", 0.6), ("cargo", 0.45) },
            ["pilgrim"] = new[] { ("cape", 0.8), ("wraps", 0.4), ("boots", 1.0), ("gaiter", 0.4), ("belt", 0.4) },
            ["medic"] = new[] { ("vest", 0.5), ("boots", 1.0), ("belt", 0.7), ("wraps", 0.3), ("gaiter", 0.3), ("cargo", 0.4) },
            ["tech"] = new[] { ("bomber", 0.55), ("vest", 0.35), ("straps", 0.3), ("boots", 1.0), ("belt", 0.75), ("gaiter", 0.45), ("wraps", 0.35), ("cargo", 0.45) },
            ["street"] = new[] { ("bomber", 0.7), ("boots", 1.0), ("gaiter", 0.5), ("straps", 0.35), ("wraps", 0.35), ("belt", 0.5), ("cargo", 0.35) },
            ["vault"] = new[] { ("boots", 1.0), ("belt", 0.5), ("vest", 0.3) },
        };

        /// <summary>Canvas tones any trade can come by: waxed olive, sand, rust, faded indigo, charcoal, bone.</summary>
        public static readonly int[] Canvas = { 0x5b5a3c, 0xa08a62, 0x8a4a2c, 0x3f4a5c, 0x2f2f2d, 0xc9bda2, 0x6b5a3a, 0x7a2f26 };

        /// <summary>Leather and boot tones: worn browns, oxblood, black, sun-bleached tan.</summary>
        public static readonly int[] Leathers = { 0x3b2a1e, 0x4a3324, 0x5c3f2a, 0x2a2420, 0x1e1b19, 0x4d2620, 0x6e5338, 0x3a3226 };

        /// <summary>The layers for a person of a trade, each by its chance, with what each needs under it kept (straps go on a vest).</summary>
        public static string[] For(string role, Rng rng)
        {
            if (role is "gilded" or "corp" || role == null || !ByRole.TryGetValue(role, out var table)) return role is "gilded" or "corp" ? new string[0] : For("settler", rng);
            var on = new HashSet<string>();
            foreach (var (layer, chance) in table) if (rng.Chance(chance)) on.Add(layer);
            if (on.Contains("straps")) on.Add("vest");
            if (on.Contains("bomber") && on.Contains("cape") && rng.Chance(0.5)) on.Remove("cape");
            // at least one piece over the torso for every trade that wears layers: the body's own shirt never stands alone
            if (!on.Contains("vest") && !on.Contains("bomber") && !on.Contains("cape") && !on.Contains("gaiter"))
                on.Add(rng.Chance(0.5) ? "vest" : rng.Chance(0.5) ? "cape" : "gaiter");
            return All.Where(on.Contains).ToArray();
        }
    }

    /// <summary>
    /// The Rocketbox people a place's people are drawn from (L3): each named person or extra is given the one that fits
    /// them best (their sex always; their trade's style, their people and their age as far as the library has them; a
    /// little chance so two of a trade are not always the same face), never one already standing for someone else in the
    /// same place; the choice is deterministic per person. Dyes from their trade's and faction's palettes
    /// (<see cref="Outfits"/>), a garment that is denim or leather keeping its own colour now and then.
    /// </summary>
    public static class RbPeople
    {
        public static IReadOnlyList<RbPerson> All => RbPeopleData.All;
        private static Dictionary<string, RbPerson> _byId;
        public static RbPerson Of(string id)
        {
            _byId ??= All.ToDictionary(p => p.Id);
            return id != null && _byId.TryGetValue(id, out var p) ? p : null;
        }

        /// <summary>Who a player may be: of the body's sex, the face sculptable, office and hospital wear left out unless
        /// the player's people has nobody else (a face of one's own people before the cut of a jacket: the library has one
        /// Black woman, in a blazer); the player's own people first, the peoples nearest them after.</summary>
        public static List<RbPerson> PlayerChoices(bool male, string people)
        {
            var own = people != null ? Bodies.People(people) : null;
            var fit = All.Where(p => p.Male == male && p.Face && p.Roles.Length > 0).ToList();
            var wear = fit.Where(p => p.Style != "formal" && p.Style != "medic").ToList();
            if (own != null && !wear.Any(p => Kin(own, p.People) >= 1)) wear.AddRange(fit.Where(p => !wear.Contains(p) && Kin(own, p.People) >= 1));
            return wear.OrderByDescending(p => Kin(own, p.People)).ThenBy(p => p.Age).ThenBy(p => p.Id).ToList();
        }

        /// <summary>Peoples near each other in looks (a face of one stands for the other when the library has none).</summary>
        private static double Kin(string a, string b)
        {
            if (a == null || b == null) return 0.5;
            if (a == b) return 1;
            static string G(string p) => p switch
            {
                "west_african" or "east_african" or "caribbean" => "africa",
                "east_asian" or "southeast_asian" => "east",
                "north_european" or "mediterranean" => "europe",
                "south_asian" => "south",
                "latin_american" or "indigenous_american" => "americas",
                _ => p,
            };
            if (G(a) == G(b)) return 0.6;
            if ((G(a) == "europe" && (G(b) == "south" || G(b) == "americas")) || (G(b) == "europe" && (G(a) == "south" || G(a) == "americas"))) return 0.3;
            return 0;
        }

        /// <summary>The Rocketbox person for someone (null when none fits: a child, whom the library does not have).</summary>
        /// <param name="avoid">People already standing for others in the same place.</param>
        public static RbPerson Pick(string id, bool male, double age, string role, string people, ICollection<string> avoid = null)
        {
            if (age < 16) return null;
            people = Bodies.People(people);
            var rng = new Rng(Bodies.Seed("rb:" + id));
            RbPerson best = null;
            var bestScore = double.NegativeInfinity;
            // a body whose clothes do not stand for the trade is never chosen while one that does is free (a blazer on a
            // hamlet's wool-trader, a medic's whites on a raider); only when the library has none of that trade for this sex
            var strict = role != null && All.Any(p => p.Male == male && Array.IndexOf(p.Roles, role) >= 0 && (avoid == null || !avoid.Contains(p.Id)));
            foreach (var p in All)
            {
                if (p.Male != male || p.Roles.Length == 0) continue;
                var fits = role == null || Array.IndexOf(p.Roles, role) >= 0;
                if (strict && !fits) continue;
                if (!fits && (p.Style == "formal" || p.Style == "medic")) continue;   // never office or hospital wear out of its trade
                var s = 0.0;
                if (role != null && fits) s += 3;
                else if (role != null) s -= 2;
                s += 4 * Kin(people, p.People);
                s -= Math.Abs(age - p.Age) / 9.0;
                s += rng.Range(0, 1.6);
                if (avoid != null && avoid.Contains(p.Id)) s -= 100;
                if (s > bestScore) { bestScore = s; best = p; }
            }
            return best;
        }

        /// <summary>A person's dyes, from their trade's palette (and their faction's, if it has one), seeded per person.</summary>
        public static RbDyes DyesFor(RbPerson p, string id, string role, string faction)
        {
            var rng = new Rng(Bodies.Seed("dye:" + id));
            RoleDef R = null;
            try { R = Outfits.Role(Outfits.Roles.Contains(role) ? role : "settler"); } catch (Exception) { }
            var F = faction != null && Registry.FactionLooks.TryGetValue(faction, out var fl) ? fl : null;
            IReadOnlyList<int> palette = F?.Palette != null && F.Palette.Count > 0 ? F.Palette : R?.Palette != null && R.Palette.Count > 0 ? R.Palette : Fallback;
            var dyeChance = R?.Dye ?? 0.8;
            // the legs mostly in the palette's darker, work-worn dyes (a crowd's trousers are not its brightest pieces)
            var dark = palette.Where(c => Lum(c) < 0.2).ToList();
            int Choose(int channel, IReadOnlyList<int> from)
            {
                var own = p?.Own != null && channel < p.Own.Length ? p.Own[channel] : -1;
                var kind = p?.OwnKind != null && channel < p.OwnKind.Length ? p.OwnKind[channel] : null;
                if (own >= 0 && kind != null && rng.Chance(0.5)) return own;
                if (own >= 0 && !rng.Chance(dyeChance)) return kind != null ? own : Muted(own);
                return rng.Pick(from);
            }
            var d = new RbDyes { Top = Choose(0, palette) };
            // the legs apart from the top (one colour head to foot reads as a suit or a uniform): a few tries for a dye far
            // enough from the top's in lightness or hue, else the darkest of the palette
            for (var k = 0; k < 8; k++)
            {
                d.Legs = Choose(1, dark.Count >= 2 && rng.Chance(0.7) ? dark : palette);
                if (Apart(d.Top, d.Legs)) break;
                if (k == 7) d.Legs = palette.Where(c => Apart(d.Top, c)).DefaultIfEmpty(0x2b2621).OrderBy(Lum).First();
            }
            d.Accent = Choose(2, palette);
            if (d.Accent == d.Top && palette.Count > 1) d.Accent = palette[(palette.ToList().IndexOf(d.Top) + 1) % palette.Count];
            var grime = F?.Grime ?? R?.Grime ?? new List<double> { 0.2, 0.5 };
            var wear = R?.Wear ?? new List<double> { 0.3, 0.6 };
            d.Grime = rng.Range(grime[0], grime[1]);
            d.Wear = rng.Range(wear[0], wear[1]);
            // the layers over the body's own clothes, their canvas apart from both garments under it, their leather
            var lr = new Rng(Bodies.Seed("layers:" + id));
            d.Layers = RbLayers.For(role, lr);
            d.Shell = palette[lr.Int(0, palette.Count - 1)];
            for (var k = 0; k < 6 && !(Apart(d.Shell, d.Top) && Apart(d.Shell, d.Legs)); k++) d.Shell = palette[lr.Int(0, palette.Count - 1)];
            // a small palette with nothing apart from both: the canvas tones of any trade (waxed olive, sand, rust, charcoal)
            if (!(Apart(d.Shell, d.Top) || Apart(d.Shell, d.Legs)))
                d.Shell = RbLayers.Canvas.Where(c => Apart(c, d.Top) && Apart(c, d.Legs)).DefaultIfEmpty(RbLayers.Canvas.OrderByDescending(c => Math.Abs(Lum(c) - Lum(d.Top))).First()).First();
            d.Leather = RbLayers.Leathers[lr.Int(0, RbLayers.Leathers.Length - 1)];
            return d;
        }

        /// <summary>Two dyes that read as two garments: a clear step in lightness, or in hue at a fair chroma.</summary>
        public static bool Apart(int a, int b)
        {
            var (la, aa, ba) = Lab(a); var (lb, ab, bb) = Lab(b);
            var dl = Math.Abs(la - lb);
            var dc = Math.Sqrt((aa - ab) * (aa - ab) + (ba - bb) * (ba - bb));
            return dl >= 14 || dc >= 28;
        }

        /// <summary>CIELAB (D65) of an sRGB colour.</summary>
        public static (double L, double A, double B) Lab(int c)
        {
            static double L(int v) { var x = v / 255.0; return x <= 0.04045 ? x / 12.92 : Math.Pow((x + 0.055) / 1.055, 2.4); }
            double r = L((c >> 16) & 255), g = L((c >> 8) & 255), b = L(c & 255);
            var x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.9505;
            var y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            var z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.089;
            static double F(double t) => t > 0.008856 ? Math.Pow(t, 1.0 / 3) : 7.787 * t + 16.0 / 116;
            return (116 * F(y) - 16, 500 * (F(x) - F(y)), 200 * (F(y) - F(z)));
        }

        private static readonly int[] Fallback = { 0x8a3b1e, 0x2f4a73, 0xb8862b, 0x5c6b2f, 0x7a2e2e, 0x2f6f6a, 0xc46a2a, 0xc9bda4 };

        /// <summary>Relative luminance of an sRGB colour (0..1).</summary>
        public static double Lum(int c)
        {
            static double L(int v) { var x = v / 255.0; return x <= 0.04045 ? x / 12.92 : Math.Pow((x + 0.055) / 1.055, 2.4); }
            return 0.2126 * L((c >> 16) & 255) + 0.7152 * L((c >> 8) & 255) + 0.0722 * L(c & 255);
        }

        /// <summary>A garment's own colour after years of sun (an undyed uniform's colour is not worn as it shipped).</summary>
        private static int Muted(int c)
        {
            var r = (c >> 16) & 255; var g = (c >> 8) & 255; var b = c & 255;
            var m = (r + g + b) / 3.0;
            int F(int v) => (int)Math.Clamp(m + (v - m) * 0.55 + 12, 0, 255);
            return (F(r) << 16) | (F(g) << 8) | F(b);
        }

        private static readonly Dictionary<string, RbPerson> _named = new();

        /// <summary>A named person's Rocketbox person: the same every time, never the one standing for someone drawn before
        /// them in any place they share (<see cref="Cast.Before"/>).</summary>
        public static RbPerson Named(NpcDef def, bool male)
        {
            if (def == null) return null;
            if (_named.TryGetValue(def.Id, out var hit)) return hit;
            var avoid = new HashSet<string>();
            foreach (var other in Cast.Before(def.Id))
                if (Registry.Npcs.TryGetValue(other, out var od))
                {
                    var o = Named(od, Routine.Male(od.Look));
                    if (o != null) avoid.Add(o.Id);
                }
            var p = Pick(def.Id, male, def.Look?.Age ?? 35.0, def.Role, def.Look?.Ancestry, avoid);
            _named[def.Id] = p;
            return p;
        }

        /// <summary>Forget the drawn people (the content changed).</summary>
        public static void Reset() => _named.Clear();
    }
}
