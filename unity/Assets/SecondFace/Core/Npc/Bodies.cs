using System;
using System.Collections.Generic;
using System.Linq;

namespace SecondFace.Core.Npc
{
    /// <summary>
    /// The people of the Reach as bodies (P4.13, the owner's notes 2026-10-29: bodies as varied as in life; a cast for the
    /// whole game): a person's look made from their id, sex, age, trade and means, seeded so they are the same every
    /// time, for the two base bodies and their shapes (the player's own: <see cref="Sculpt.Body"/>). Stature as people
    /// are (men 175 ± 7.5 cm, women 162 ± 6.5, clamped at 2.5 deviations, a little lost after 45); a build lean by
    /// default (life is hard: heavy bodies belong to the comfortable), muscle by the work; a woman's bust across the whole
    /// range (fuller with a fuller build), its firmness going with the years; seat, hips and waist; a man's shoulders,
    /// chest and arms with his muscle; a belly with weight and age; the face drawn by the sculptor's reroll (a character,
    /// not an average); ancestry from the content's tag, else the Reach's mix; skin from ancestry and the sun of the
    /// work; hair by the grooming rule, greying with age. What the content says of a person (age, ancestry) wins; its
    /// "frame" is how the web game marked a person's sex (Routine.Male), not a build.
    /// </summary>
    public static class Bodies
    {
        public const double ManMean = 175, ManSd = 7.5, WomanMean = 162, WomanSd = 6.5;
        /// <summary>The bases' own statures (tools/unity/people/briefs/player.json, as measured).</summary>
        public const double BaseWoman = 164, BaseMan = 177;
        /// <summary>The bases' own macros: build, muscle, bust, firmness (player.json).</summary>
        public const double BaseWeight = 0.25, BaseMuscleF = 0.45, BaseMuscleM = 0.6, BaseBust = 0.42, BaseFirm = 0.55;

        public enum Means { Destitute, Working, Comfortable, Rich }

        /// <summary>A person's means by their trade, when the content says no more.</summary>
        public static Means MeansOf(string role, Rng rng = null) => role switch
        {
            "gilded" => Means.Rich,
            "corp" => rng != null && rng.Chance(0.4) ? Means.Rich : Means.Comfortable,
            "trader" => rng != null && rng.Chance(0.5) ? Means.Comfortable : Means.Working,
            "street" or "drifter" => Means.Destitute,
            "raider" or "pilgrim" => rng != null && rng.Chance(0.5) ? Means.Destitute : Means.Working,
            _ => Means.Working,
        };

        /// <summary>How hard the work is on the body: 1 labour, 0 at a desk or a counter, between for the rest.</summary>
        public static double Labour(string role) => role switch
        {
            "guard" or "raider" or "labourer" or "settler" or "nomad" or "fisher" => 1,
            "trader" or "gilded" or "corp" or "tech" or "medic" => 0,
            _ => 0.5,
        };

        /// <summary>The MakeHuman ancestry mix (african, asian, caucasian) for a content tag; null when untagged.</summary>
        public static (double Af, double As, double Ca)? Ancestry(string tag) => tag switch
        {
            "north_european" => (0, 0, 1),
            "mediterranean" => (0.05, 0.05, 0.9),
            "west_african" => (0.95, 0, 0.05),
            "east_african" => (0.82, 0.03, 0.15),
            "east_asian" => (0, 1, 0),
            "southeast_asian" => (0.1, 0.85, 0.05),
            "south_asian" => (0.15, 0.25, 0.6),
            "latin_american" => (0.15, 0.35, 0.5),
            "indigenous_american" => (0.05, 0.7, 0.25),
            _ => null,
        };

        /// <summary>A person's look (for the base of their sex) from who they are.</summary>
        public static PlayerLook For(string id, bool male, double age, string role = null, Means? means = null, string ancestry = null)
        {
            var rng = new Rng(Seed(id));
            var m = means ?? MeansOf(role, rng);
            var labour = Labour(role);
            var look = new PlayerLook { Body = male ? "m" : "f" };

            // stature, a little lost after 45
            var mean = male ? ManMean : WomanMean;
            var sd = male ? ManSd : WomanSd;
            var stature = Math.Clamp(mean + Normal(rng) * sd, mean - 2.5 * sd, mean + 2.5 * sd) - Math.Max(0, age - 45) * 0.08;
            look.Stature = (float)Math.Round(stature, 1);

            // build (the weight macro): lean unless comfortable; muscle by the work
            var weight = m switch
            {
                Means.Destitute => 0.10 + Normal(rng) * 0.05,
                Means.Comfortable => 0.45 + Normal(rng) * 0.12,
                Means.Rich => 0.50 + Normal(rng) * 0.16,
                _ => 0.22 + Normal(rng) * 0.08,
            };
            weight += Math.Clamp(age - 25, 0, 40) * 0.002 - labour * 0.03;
            weight = Math.Clamp(weight, 0.02, 0.9);
            var muscleBase = male ? BaseMuscleM : BaseMuscleF;
            var muscle = (male ? 0.55 + Normal(rng) * 0.14 : 0.45 + Normal(rng) * 0.11) + (labour - 0.5) * 0.24 - Math.Max(0, age - 50) * 0.004;
            muscle = Math.Clamp(muscle, 0.1, 1.0);
            look.Build = (float)ToSlider(weight, BaseWeight, 0.0, BaseWeight + 0.5);
            look.Muscle = (float)ToSlider(muscle, muscleBase, Math.Max(0, muscleBase - 0.3), Math.Min(1, muscleBase + 0.5));
            double heavy = weight - BaseWeight, strong = muscle - muscleBase;

            var s = look.Shape;
            if (!male)
            {
                // the cup across the whole range (fuller with a fuller build), the chest's girth with it
                var cup = Math.Clamp(0.45 + Normal(rng) * 0.25 + heavy * 0.6, 0.02, 1);
                var firm = Math.Clamp(0.8 - Math.Max(0, age - 20) * 0.01 + Normal(rng) * 0.08, 0.08, 0.9);
                s["body-bust"] = (float)ToSlider(cup, BaseBust, 0, 1);
                s["body-firm"] = (float)ToSlider(firm, BaseFirm, 0, 1);
                s["body-seat"] = Clamp1(0.15 + Normal(rng) * 0.4 + heavy * 0.6);
                s["body-hips"] = Clamp1(0.05 + Normal(rng) * 0.33 + heavy * 0.5);
                s["body-shoulders"] = Clamp1(-0.05 + Normal(rng) * 0.2 + strong * 0.5);
                s["body-chest"] = Clamp1(Normal(rng) * 0.1 + (cup - 0.45) * 0.9);
                s["body-thighs"] = Clamp1(0.1 + Normal(rng) * 0.15 + strong * 0.5 + heavy * 0.8);
            }
            else
            {
                s["body-seat"] = Clamp1(-0.05 + Normal(rng) * 0.25 + heavy * 0.4);
                s["body-hips"] = Clamp1(Normal(rng) * 0.2 + heavy * 0.3);
                s["body-shoulders"] = Clamp1(0.05 + Normal(rng) * 0.25 + strong * 0.8);
                s["body-chest"] = Clamp1(Normal(rng) * 0.2 + strong * 0.8 + heavy * 0.4);
                s["body-thighs"] = Clamp1(Normal(rng) * 0.15 + strong * 0.5 + heavy * 0.8);
            }
            s["body-waist"] = Clamp1(Normal(rng) * 0.2 + heavy * 1.2 + Math.Max(0, age - 35) * 0.004);
            // a belly (the shape is a full one) only with weight and the years; a lean young body is flat
            s["body-belly"] = (float)Math.Clamp(-0.2 + Normal(rng) * 0.08 + Math.Max(0, weight - 0.45) * 1.5 + Math.Max(0, age - 45) * (male ? 0.006 : 0.003), -0.4, 0.8);
            s["body-arms"] = Clamp1(Normal(rng) * 0.1 + strong * 0.8 + heavy * 0.6);
            s["body-tone"] = Clamp1(Normal(rng) * 0.15 + strong * 2 - heavy * 2);
            s["body-age"] = (float)Math.Clamp((age - 24) / 46.0, 0, 1);

            // ancestry: the content's, else the Reach's mix with each person their own
            var mix = Ancestry(ancestry) ?? Mix(rng);
            s["body-african"] = (float)mix.Af;
            s["body-asian"] = (float)mix.As;
            s["body-caucasian"] = (float)mix.Ca;

            // the face: a character, not an average
            look.Face = Sculpt.Reroll(rng);

            // skin: darker with African ancestry and with outdoor work; undertone and freckles by the light-skinned
            var outdoor = labour >= 1 ? 1 : role == "drifter" || role == "pilgrim" || role == "nomad" ? 0.8 : 0.3;
            look.Skin = Clamp1(1.5 * (mix.Af - 0.25) + 0.25 * outdoor - 0.25 * (mix.Ca - 0.5) + Normal(rng) * 0.15);
            look.Undertone = Clamp1(Normal(rng) * 0.3 + (mix.As > 0.5 ? 0.2 : 0));
            look.Freckles = mix.Ca > 0.7 && rng.Chance(0.3) ? (float)rng.Range(0.1, 0.6) : 0f;

            // hair by the grooming rule; greying with age
            var hair = male
                ? Pick(rng, ("buzz", 0.3), ("sf_crop", 0.45), ("sf_matted", 0.15), ("sf_bun", 0.1))
                : Pick(rng, ("sf_braid", 0.3), ("sf_bun", 0.25), ("sf_crop", 0.2), ("sf_matted", 0.15), ("buzz", 0.1));
            look.Hair = hair;
            var grey = Math.Clamp((age - 38) / 30.0 + Normal(rng) * 0.15, 0, 1);
            if (grey > 0.66) look.HairColour = Looks.HairColours[rng.Int(8, 9)];
            else if (grey > 0.33) look.HairColour = Looks.HairColours[7];
            else if (mix.Ca > 0.7) look.HairColour = Looks.HairColours[rng.Int(1, 6)];
            else look.HairColour = Looks.HairColours[rng.Int(0, 2)];
            look.Eyes = mix.Ca > 0.7 && rng.Chance(0.55) ? rng.Pick(new[] { "hazel", "green", "grey_green", "blue_grey", "blue", "grey" })
                : rng.Pick(new[] { "brown", "dark", "brown", "hazel" });
            // a man's face: mostly unshaven out here, fuller with the years; the comfortable keep it trimmed or shaved
            if (male)
            {
                var clean = m == Means.Rich ? 0.55 : m == Means.Comfortable ? 0.3 : 0.08;
                look.Beard = rng.Chance(clean) ? null
                    : Pick(rng, ("stubble_light", 0.2), ("stubble", 0.25), ("stubble_heavy", 0.18), ("short_beard", 0.14 + Math.Max(0, age - 30) * 0.004),
                        ("full_beard", 0.1 + Math.Max(0, age - 35) * 0.006), ("goatee", 0.06), ("moustache", 0.07));
            }
            if (rng.Chance(0.12 + labour * 0.18)) look.Scar = rng.Pick(Looks.Scars);
            if (rng.Chance(0.12)) look.Tattoo = rng.Pick(Looks.Tattoos);
            return look;
        }

        /// <summary>
        /// What the content says of a person's look over the drawn one (<see cref="LookDef.Over"/>, the web game's keys):
        /// the hair's colour, and its style as one of ours by the grooming rule (a bob or a side part is tied back or
        /// cropped; shaved, buzzed and faded are the buzz; braids and cornrows the braid; long hair matted), scars by
        /// the nearest of ours, skin tone (0 pale to 1 dark, against the bases' mid-tone bake), undertone, freckles
        /// eyes and a beard.
        /// </summary>
        public static PlayerLook Over(PlayerLook look, Newtonsoft.Json.Linq.JObject over)
        {
            if (look == null || over == null) return look;
            if (over["hair"] is Newtonsoft.Json.Linq.JObject hair)
            {
                var style = hair["style"]?.ToString();
                if (!string.IsNullOrEmpty(style)) look.Hair = HairOf(style);
                if (hair["color"] != null && hair["color"].Type == Newtonsoft.Json.Linq.JTokenType.Integer) look.HairColour = (int)hair["color"];
            }
            if (over["scars"] is Newtonsoft.Json.Linq.JArray scars && scars.Count > 0)
                look.Scar = scars[0].ToString() switch
                {
                    "eye_scar" => "eye_line", "burn_left" => "burn_cheek", "burn_right" => "burn_jaw", var v => Array.IndexOf(Looks.Scars, v) >= 0 ? v : look.Scar,
                };
            if (over["facialHair"] != null)
            {
                var f = over["facialHair"].ToString();
                look.Beard = f == "none" ? null : Array.IndexOf(Looks.Beards, f) >= 0 ? f : look.Beard;
            }
            if (over["skinTone"] != null) look.Skin = (float)Math.Clamp(((double)over["skinTone"] - 0.35) * 2.2, -1, 1);
            if (over["skinUndertone"] != null) look.Undertone = (float)Math.Clamp((double)over["skinUndertone"], -1, 1);
            if (over["freckles"] != null) look.Freckles = (float)Math.Clamp((double)over["freckles"], 0, 1);
            if (over["eyes"] != null)
            {
                var e = over["eyes"].ToString() switch { "brownlight" => "hazel", "bluegreen" => "grey_green", var v => v };
                if (Looks.Eyes.Any(x => x.Id == e)) look.Eyes = e;
            }
            return look;
        }

        /// <summary>One of our hair forms for a web game's hair style (the grooming rule: never a styled cut).</summary>
        public static string HairOf(string style)
        {
            if (style == "none" || style.StartsWith("paint_shaved") || style.StartsWith("paint_buzz") || style.StartsWith("paint_fade") || style == "coily_twa") return "buzz";
            if (style.Contains("braid") || style.Contains("cornrow")) return "sf_braid";
            if (style.Contains("bob") || style.Contains("ponytail") || style.Contains("bun")) return "sf_bun";
            if (style.StartsWith("long") || style.Contains("dread") || style.Contains("matted")) return "sf_matted";
            return "sf_crop";
        }

        /// <summary>A macro value as the base's slider: below the base towards its decr shape, above towards its incr.</summary>
        public static double ToSlider(double value, double at, double low, double high)
        {
            if (value < at) return at - low <= 1e-6 ? 0 : Math.Max(-1, (value - at) / (at - low));
            return high - at <= 1e-6 ? 0 : Math.Min(1, (value - at) / (high - at));
        }

        /// <summary>The Reach's mix with a person's own draw: mostly mixed, now and then most of one.</summary>
        private static (double Af, double As, double Ca) Mix(Rng rng)
        {
            double af = 0.3 * Math.Exp(Normal(rng) * 0.8), @as = 0.25 * Math.Exp(Normal(rng) * 0.8), ca = 0.45 * Math.Exp(Normal(rng) * 0.8);
            var sum = af + @as + ca;
            return (af / sum, @as / sum, ca / sum);
        }

        private static string Pick(Rng rng, params (string Id, double W)[] choices)
        {
            var total = 0.0;
            foreach (var c in choices) total += c.W;
            var x = rng.Next() * total;
            foreach (var c in choices) { x -= c.W; if (x <= 0) return c.Id; }
            return choices[choices.Length - 1].Id;
        }

        private static float Clamp1(double v) => (float)Math.Clamp(v, -1, 1);

        /// <summary>A standard normal draw (Box–Muller).</summary>
        public static double Normal(Rng rng)
        {
            var u = Math.Max(1e-9, rng.Next());
            var v = rng.Next();
            return Math.Sqrt(-2 * Math.Log(u)) * Math.Cos(2 * Math.PI * v);
        }

        /// <summary>A person's seed from their id (FNV-1a).</summary>
        public static uint Seed(string id)
        {
            unchecked
            {
                var h = 2166136261u;
                foreach (var c in id ?? "") h = (h ^ c) * 16777619u;
                return h == 0 ? 1u : h;
            }
        }
    }
}
