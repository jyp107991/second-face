using System;
using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace SecondFace.Core.Npc
{
    /// <summary>
    /// The player's look as made at creation (P5.3i; saved as <c>PlayerCharacter.Appearance</c>): which body, the face's
    /// sculptor values, the body's height, build and muscle, the skin (darker or lighter than the body's own bake, its
    /// undertone, freckles), the hair and its colour, the eyes, a scar and a tattoo, and the dyes of the clothes by
    /// wardrobe slot. Every choice is in the world's terms (CLAUDE.md: gritty, functional, lore-bound).
    /// </summary>
    public sealed class PlayerLook
    {
        /// <summary>The body: f or m (the player bases player_f, player_m; also the clothes' cut).</summary>
        [JsonProperty("body")] public string Body = "f";
        /// <summary>The sculptor's values by slider id (<see cref="Sculpt"/>).</summary>
        [JsonProperty("face")] public Dictionary<string, float> Face = new();
        /// <summary>The person's people (an ancestry cluster of <see cref="Bodies.Clusters"/>): the face's archetypes, the
        /// skin, hair and eyes as found among them (<see cref="Faces"/>); null for a look from before heritage was chosen.</summary>
        [JsonProperty("heritage")] public string Heritage;
        /// <summary>-1..1: shorter or taller (±6 %).</summary>
        [JsonProperty("height")] public float Height;
        /// <summary>A stature in cm (the people of the Reach, <see cref="Bodies"/>); 0: the base's own, by <see cref="Height"/>.</summary>
        [JsonProperty("stature")] public float Stature;
        /// <summary>-1..1: leaner or heavier.</summary>
        [JsonProperty("build")] public float Build;
        /// <summary>-1..1: softer or harder worked.</summary>
        [JsonProperty("muscle")] public float Muscle;
        /// <summary>The body's own shapes by slider id (<see cref="Sculpt.Body"/>: bust, seat, hips, waist, shoulders and the
        /// rest), beside <see cref="Build"/> and <see cref="Muscle"/>.</summary>
        [JsonProperty("shape")] public Dictionary<string, float> Shape = new();
        /// <summary>-1..1: lighter or darker than the body's own skin.</summary>
        [JsonProperty("skin")] public float Skin;
        /// <summary>-1..1: cooler (rosier) or warmer (more golden).</summary>
        [JsonProperty("undertone")] public float Undertone;
        /// <summary>0..1.</summary>
        [JsonProperty("freckles")] public float Freckles;
        /// <summary>A hair of <see cref="Looks.Hair"/>; null: the body's own.</summary>
        [JsonProperty("hair")] public string Hair;
        [JsonProperty("hairColour")] public int HairColour = 0x2b1d14;
        /// <summary>How grey the hair has gone (0..1; Bodies by the people's clock), kept so an authored colour greys with it.</summary>
        [JsonProperty("grey")] public float Grey;
        [JsonProperty("eyes")] public string Eyes = "brown";
        /// <summary>One of <see cref="Looks.Scars"/>, or null.</summary>
        [JsonProperty("scar")] public string Scar;
        /// <summary>One of <see cref="Looks.Tattoos"/>, or null.</summary>
        [JsonProperty("tattoo")] public string Tattoo;
        /// <summary>One of <see cref="Looks.Beards"/>, or null (a clean face; a woman's body has none).</summary>
        [JsonProperty("beard")] public string Beard;
        /// <summary>The beard's own colour (0xRRGGBB; 0: the hair's, a shade darker): a beard greys before the head, and
        /// grows red under brown hair as often as not among the north European.</summary>
        [JsonProperty("beardColour")] public int BeardColour;
        /// <summary>A greying beard as it is (P4.15b): the colour of its hairs that keep their pigment (0: the beard's colour) and
        /// the share of them gone white; drawn hair by hair, salt and pepper, never one blended tint (which read blond).</summary>
        [JsonProperty("beardBase")] public int BeardBase;
        [JsonProperty("beardGrey")] public float BeardGrey;
        /// <summary>The brows' style (<see cref="Looks.BrowStyles"/>: 0 fine or sparse, 1 natural, 2 full or heavy, a woman's
        /// and a man's each their own) and colour (0: from the hair).</summary>
        [JsonProperty("brows")] public int Brows = 1;
        [JsonProperty("browColour")] public int BrowColour;
        /// <summary>Pattern balding, 0 none .. 1 the horseshoe alone (the temples and crown go first; SecondFace/Skin).</summary>
        [JsonProperty("bald")] public float Bald;
        /// <summary>A woman's figure type as drawn (Bodies.Figures), for the record; the shapes carry it.</summary>
        [JsonProperty("figure")] public string Figure;
        /// <summary>The clothes' dyes by wardrobe slot (0xRRGGBB; a slot not listed keeps its cloth's own colour).</summary>
        [JsonProperty("dyes")] public Dictionary<string, int> Dyes = new();

        public JObject ToJson() => JObject.FromObject(this);

        /// <summary>A look from a save (a default look for anything else, such as the web game's appearance).</summary>
        public static PlayerLook From(JToken t)
        {
            if (t is JObject o && o["face"] is JObject && o["body"] != null)
            {
                try { return o.ToObject<PlayerLook>() ?? new PlayerLook(); } catch (JsonException) { }
            }
            return new PlayerLook();
        }

        public PlayerLook Clone() => From(ToJson());
    }

    /// <summary>The choices a look is made from, in the world's terms: no bright dye, no styled hair, nothing clean.</summary>
    public static class Looks
    {
        /// <summary>Hair colours: dull, dusty, sun-bleached or greying (the hair rule).</summary>
        public static readonly int[] HairColours =
        {
            0x16110d, 0x2b1d14, 0x4a3322, 0x6b5039, 0x9c8160, 0xb5a07a, 0x6e2f17, 0x797875, 0xa4a3a0, 0xcfcecb,
        };

        /// <summary>Eye colours by id (the iris tint).</summary>
        public static readonly (string Id, int Rgb)[] Eyes =
        {
            ("brown", 0x4a2e1a), ("dark", 0x2a1a10), ("hazel", 0x6b5530), ("green", 0x4f6b3a),
            ("grey_green", 0x6b7a64), ("blue_grey", 0x5f7486), ("blue", 0x3d5f86), ("grey", 0x7c8186),
        };

        /// <summary>Scars: the marks of a hard life (drawn on the skin, P5.3i).</summary>
        public static readonly string[] Scars = { "brow_cut", "cheek_slash", "lip_split", "eye_line", "burn_jaw", "burn_cheek", "chin_nick", "nose_break" };

        /// <summary>Tattoos: Cistern numbers, tallies and the marks people give themselves out here.</summary>
        public static readonly string[] Tattoos = { "nine_neck", "tally_cheek", "tear", "chin_lines", "brow_dots", "temple_spiral", "jaw_stripes", "eye_band" };

        /// <summary>Beards out here: stubble of three days and three weeks, cut short with a knife, grown full, a goatee or a
        /// moustache (painted on the skin in the hair's colour, SecondFace/Skin; the grooming rule: unkempt, never styled).</summary>
        public static readonly string[] Beards = { "stubble_light", "stubble", "stubble_heavy", "short_beard", "full_beard", "goatee", "moustache" };

        /// <summary>Re-dyed salvage: undyed, olive, rust, ochre, slate, faded indigo, charcoal, oxblood, sand.</summary>
        public static readonly int[] Dyes = { 0xffffff, 0x5d6448, 0x7a4127, 0x8f6a2e, 0x4b5560, 0x3d4a66, 0x3a3836, 0x5a2a26, 0xa48f6c };

        /// <summary>The hair to choose, as built for both bodies (the wardrobe's hair slot; "buzz" is no hair piece, the
        /// scalp's painted stubble). The hair rule: shaved, cropped, tied back, braided, matted; never a styled cut. Coily hair
        /// has its own forms (P4.15): a close crop of tight curls and cornrows braided flat to the scalp.</summary>
        public static readonly string[] Hair = { "buzz", "sf_crop", "sf_bun", "sf_braid", "sf_matted", "sf_coils", "sf_cornrows" };

        /// <summary>The hair a body was built with (what <see cref="PlayerLook.Hair"/> null means).</summary>
        public static string OwnHair(string body) => body == "m" ? "sf_crop" : "sf_braid";

        /// <summary>The face's values with the body's (the sculptor drives both): the body's own shapes, then build and
        /// muscle.</summary>
        public static Dictionary<string, float> Shape(PlayerLook look)
        {
            var d = new Dictionary<string, float>(look.Face ?? new Dictionary<string, float>());
            if (look.Shape != null)
                foreach (var kv in look.Shape)
                    if (kv.Key.StartsWith("body-")) d[kv.Key] = kv.Value;
            d["body-weight"] = System.Math.Clamp(look.Build, -1f, 1f);
            d["body-muscle"] = System.Math.Clamp(look.Muscle, -1f, 1f);
            return d;
        }

        public static int EyeRgb(string id) { foreach (var e in Eyes) if (e.Id == id) return e.Rgb; return Eyes[0].Rgb; }

        /// <summary>A brow drawn on the skin (SecondFace/Skin), in the head frame of <see cref="PlayerLook"/>'s marks: the
        /// inner and outer ends across the face, the centre line's height at the inner end, at its peak (PeakT of the way
        /// out) and at the tail, the thickness at the inner end and the tail, and how dense the hairs.</summary>
        public readonly struct Brow
        {
            public readonly float X0, X1, YHead, YPeak, PeakT, YTail, WHead, WTail, Density;
            public Brow(float x0, float x1, float yHead, float yPeak, float peakT, float yTail, float wHead, float wTail, float density)
            {
                X0 = x0; X1 = x1; YHead = yHead; YPeak = yPeak; PeakT = peakT; YTail = yTail; WHead = wHead; WTail = wTail; Density = density;
            }
        }

        /// <summary>The brow styles by sex (<see cref="PlayerLook.Brows"/>), measured in the head frame from the MakeHuman
        /// community brows as fitted (tools/unity/people/brow_frame.py): a woman's fine and arched (mindfront 02), natural
        /// (03) and full (12); a man's sparse (04), natural (05) and heavy (07), lower, straighter and thicker. The strands
        /// stand off the skin, so the skin under them sits 0.035-0.04 higher than their measured centre (checked in renders).</summary>
        public static readonly Brow[] WomanBrows =
        {
            new(0.175f, 0.578f, 0.265f, 0.325f, 0.6f, 0.271f, 0.052f, 0.03f, 0.72f),
            new(0.198f, 0.622f, 0.295f, 0.312f, 0.45f, 0.255f, 0.048f, 0.035f, 0.85f),
            new(0.176f, 0.6f, 0.288f, 0.338f, 0.62f, 0.272f, 0.079f, 0.06f, 0.95f),
        };
        public static readonly Brow[] ManBrows =
        {
            new(0.184f, 0.624f, 0.286f, 0.307f, 0.55f, 0.249f, 0.05f, 0.04f, 0.68f),
            new(0.192f, 0.69f, 0.28f, 0.314f, 0.4f, 0.246f, 0.085f, 0.075f, 0.85f),
            new(0.15f, 0.641f, 0.292f, 0.334f, 0.5f, 0.295f, 0.095f, 0.08f, 1.0f),
        };

        public static Brow BrowOf(PlayerLook look)
        {
            var set = look.Body == "m" ? ManBrows : WomanBrows;
            return set[System.Math.Clamp(look.Brows, 0, set.Length - 1)];
        }

        /// <summary>The brows' colour: their own, else the hair's.</summary>
        public static int BrowRgb(PlayerLook look)
        {
            if (look.BrowColour != 0) return look.BrowColour;
            // fair and red hair: brows a shade darker, as they mostly are
            var h = look.HairColour;
            var lum = (((h >> 16) & 255) * 0.3 + ((h >> 8) & 255) * 0.59 + (h & 255) * 0.11) / 255.0;
            if (lum < 0.3) return h;
            int C(int shift) => (int)Math.Round(((h >> shift) & 255) * 0.6 + ((HairColours[2] >> shift) & 255) * 0.4);
            return (C(16) << 16) | (C(8) << 8) | C(0);
        }

        /// <summary>The beard's colour: its own, else the hair's a shade darker.</summary>
        /// <summary>The colour of a beard's pigmented hairs (<see cref="PlayerLook.BeardBase"/>, else <see cref="BeardRgb"/>).</summary>
        public static int BeardPigment(PlayerLook look) => look.BeardBase != 0 ? look.BeardBase : BeardRgb(look);

        public static int BeardRgb(PlayerLook look)
        {
            if (look.BeardColour != 0) return look.BeardColour;
            int C(int shift) => (int)(((look.HairColour >> shift) & 255) * 0.8);
            return (C(16) << 16) | (C(8) << 8) | C(0);
        }

        /// <summary>
        /// The years a skin shows (the aged bake's blend, <see cref="SkinAge"/>): the body's apparent age (Faces.Apparent, a
        /// hard life sooner), less for darker skin, which lines about a decade later (melanin's shelter and a thicker,
        /// denser dermis; Vashi et al. 2016), less for East and Southeast Asian skin, which spots before it lines (Chung 2003;
        /// Nouveau-Richard et al. 2005), and a little more for a man, whose lines come first (Tsukahara et al. 2013).
        /// </summary>
        public static float SkinYears(PlayerLook look)
        {
            var years = 24f + 46f * (look.Shape != null && look.Shape.TryGetValue("body-age", out var ba) ? ba : 0f);
            years -= 10f * System.Math.Clamp((look.Skin + 0.2f) / 1.0f, 0f, 1f);
            if (look.Heritage == "east_asian" || look.Heritage == "southeast_asian") years -= 4f;
            if (look.Body == "m") years += 2f;
            return years;
        }

        /// <summary>How far the skin has gone to its aged bake (0 at 28 years shown, most of the way by 72).</summary>
        public static float SkinAge(PlayerLook look) => (float)System.Math.Pow(System.Math.Clamp((SkinYears(look) - 28f) / 44f, 0f, 1f), 1.2) * 0.85f;
    }
}
