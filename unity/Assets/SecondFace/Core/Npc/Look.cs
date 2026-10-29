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
        /// <summary>-1..1: shorter or taller (±6 %).</summary>
        [JsonProperty("height")] public float Height;
        /// <summary>-1..1: leaner or heavier.</summary>
        [JsonProperty("build")] public float Build;
        /// <summary>-1..1: softer or harder worked.</summary>
        [JsonProperty("muscle")] public float Muscle;
        /// <summary>-1..1: lighter or darker than the body's own skin.</summary>
        [JsonProperty("skin")] public float Skin;
        /// <summary>-1..1: cooler (rosier) or warmer (more golden).</summary>
        [JsonProperty("undertone")] public float Undertone;
        /// <summary>0..1.</summary>
        [JsonProperty("freckles")] public float Freckles;
        /// <summary>A hair of <see cref="Looks.Hair"/>; null: the body's own.</summary>
        [JsonProperty("hair")] public string Hair;
        [JsonProperty("hairColour")] public int HairColour = 0x2b1d14;
        [JsonProperty("eyes")] public string Eyes = "brown";
        /// <summary>One of <see cref="Looks.Scars"/>, or null.</summary>
        [JsonProperty("scar")] public string Scar;
        /// <summary>One of <see cref="Looks.Tattoos"/>, or null.</summary>
        [JsonProperty("tattoo")] public string Tattoo;
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
            0x16110d, 0x2b1d14, 0x4a3322, 0x6b5039, 0x9c8160, 0xb5a07a, 0x6e2f17, 0x7d7a74, 0xa7a49c, 0xcfcbc1,
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

        /// <summary>Re-dyed salvage: undyed, olive, rust, ochre, slate, faded indigo, charcoal, oxblood, sand.</summary>
        public static readonly int[] Dyes = { 0xffffff, 0x5d6448, 0x7a4127, 0x8f6a2e, 0x4b5560, 0x3d4a66, 0x3a3836, 0x5a2a26, 0xa48f6c };

        /// <summary>Hair by body, as built for the player (the body's own first). The hair rule: shaved, cropped,
        /// tied back, braided, matted under a wrap; never a styled cut.</summary>
        public static readonly Dictionary<string, string[]> Hair = new()
        {
            ["f"] = new[] { "braid" },
            ["m"] = new[] { "crop" },
        };

        public static int EyeRgb(string id) { foreach (var e in Eyes) if (e.Id == id) return e.Rgb; return Eyes[0].Rgb; }
    }
}
