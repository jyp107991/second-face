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
    /// not an average: <see cref="Faces"/>, archetypes by ancestry, sex, build and age); ancestry from the content's tag, else a cluster from the place's community (P4.14); skin from ancestry and the sun
    /// of the work, hair and eye colours as found in that ancestry; hair by the grooming rule, greying with age. What the content says of a person (age, ancestry) wins; its
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

        /// <summary>A content tag as one of the Reach's peoples (the web game's broad "caucasian" is the north European).</summary>
        public static string People(string tag) => tag == "caucasian" || tag == "european" ? "north_european" : tag == "african" ? "west_african" : tag == "asian" ? "east_asian" : tag;

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

        /// <summary>A fit <see cref="For"/> left pending, done now (once).</summary>
        public static PlayerLook Finish(PlayerLook look)
        {
            if (look?.Pending is { } p)
            {
                look.Pending = null;
                Proportions.Fit(look, look.Body == "m", p.Cluster, p.Age, p.Seed);
            }
            return look;
        }

        /// <summary>No grey hair before this age (owner, pass 10: grey only from 55; the head, the beard and the brows).</summary>
        public const double GreyFrom = 55;

        /// <summary>How much of a people's greying a person of this age shows: none before <see cref="GreyFrom"/>, all of it
        /// <paramref name="years"/> after (smoothly).</summary>
        public static double GreyRamp(double age, double years)
        {
            var t = Math.Clamp((age - GreyFrom) / years, 0, 1);
            return t * t * (3 - 2 * t);
        }

        /// <summary>The body's scale: a stature against the base's own height with the person's shapes (a longer neck or
        /// head makes a taller body: Proportions.HeightMm), else the look's height (±6 %).</summary>
        public static float ScaleOf(PlayerLook look)
        {
            if (look.Stature <= 0f) return 1f + 0.06f * Math.Clamp(look.Height, -1f, 1f);
            var h = Proportions.HeightMm(look);
            var own = h > 0 ? h / 10.0 : look.Body == "m" ? BaseMan : BaseWoman;
            return (float)Math.Clamp(look.Stature / own, 0.8, 1.2);
        }

        /// <summary>A person's look (for the base of their sex) from who they are.</summary>
        /// <param name="fit">false leaves the proportions' fit (Proportions.Fit, a few milliseconds) for when the person is
        /// first shown (<see cref="Finish"/>, LookView): a place's people are made as data when it loads.</param>
        public static PlayerLook For(string id, bool male, double age, string role = null, Means? means = null, string ancestry = null, double[] community = null, bool fit = true)
        {
            var rng = new Rng(Seed(id));
            var m = means ?? MeansOf(role, rng);
            var labour = Labour(role);
            var hard = Hardness(role, m);
            var child = Child(male, age);
            var look = new PlayerLook { Body = male ? "m" : "f" };

            // ancestry first, for it shapes the body as well as the face (P4.14, pass 9): the content's tag, else a cluster
            // drawn from the community's weights (most people mostly of one ancestry, a share of two)
            ancestry = People(ancestry);
            var tagged = Ancestry(ancestry);
            var cluster = tagged != null ? ancestry : Cluster(rng, community);
            string second = null;
            double share = 0;
            (double Af, double As, double Ca) mix;
            if (tagged != null) mix = tagged.Value;
            else (mix, second, share) = Mixed(rng, cluster);
            look.Heritage = cluster;
            double Of(Func<People, double> f) => Peoples.Blend(cluster, second, share, f);

            // stature: the Reach's means, the people's own, and a childhood's food (the destitute grew up short, the rich
            // tall); a little lost after 45; the young by the growth chart
            var nutrition = m switch { Means.Destitute => -3.0, Means.Working => 0.0, Means.Comfortable => 1.5, _ => 2.5 };
            var offset = (Of(p => p.Stature) - MeanStatureOffset) * (male ? 1 : 0.9) + nutrition;   // centred: the Reach's means hold
            var mean = (male ? ManMean : WomanMean) + offset;
            var sd = male ? ManSd : WomanSd;
            if (age < 18) { mean = Growth(male, age) * (1 + offset / (male ? ManMean : WomanMean)); sd = mean * 0.04; }
            var stature = Math.Clamp(mean + Normal(rng) * sd, mean - 2.5 * sd, mean + 2.5 * sd) - Math.Max(0, age - 45) * 0.08;
            look.Stature = (float)Math.Round(stature, 1);

            // build (the weight macro): lean unless comfortable; muscle by the work, a slender people a little leaner
            var frame = Of(p => p.Frame);
            var weight = m switch
            {
                Means.Destitute => 0.10 + Normal(rng) * 0.05,
                Means.Comfortable => 0.45 + Normal(rng) * 0.12,
                Means.Rich => 0.50 + Normal(rng) * 0.16,
                _ => 0.22 + Normal(rng) * 0.08,
            };
            weight += Math.Clamp(age - 25, 0, 40) * 0.002 - labour * 0.03 + Math.Min(0, frame) * 0.08;
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
                // a figure of one of the real types at the frequencies found among her people (P4.14: not all pears), each
                // her own within it; the cup across the whole range (fuller with a fuller build), set, spacing, shape and
                // fullness as real breasts vary, lower and fuller below with size and the years
                var figures = FigureShare(heavy);
                var tend = new double[figures.Length];
                for (var i = 0; i < figures.Length; i++) { var k = i; tend[i] = figures[i] * Of(p => p.Figures[k]); }
                var sum = tend.Sum();
                var f = Figures[PickIndex(rng, tend.Select(x => x / sum).ToArray())];
                look.Figure = f.Id;
                var cup = Math.Clamp(0.4 + Normal(rng) * 0.2 + f.Bust + heavy * 0.6 + Of(p => p.Bust), 0.02, 1);
                var firm = Math.Clamp(0.8 - Math.Max(0, age - 20) * 0.01 + Normal(rng) * 0.08, 0.08, 0.9);
                s["body-bust"] = (float)ToSlider(cup, BaseBust, 0, 1);
                s["body-firm"] = (float)ToSlider(firm, BaseFirm, 0, 1);
                s["body-seat"] = Clamp1(f.Seat + Normal(rng) * 0.2 + heavy * 0.6 + Of(p => p.Seat));
                s["body-hips"] = Clamp1(f.Hips + Normal(rng) * 0.18 + heavy * 0.5);
                s["body-shoulders"] = Clamp1(f.Shoulders + Normal(rng) * 0.15 + strong * 0.5 + frame * 0.12);
                s["body-vshape"] = Clamp1(f.Taper + Normal(rng) * 0.12 + strong * 0.3);
                s["body-chest"] = Clamp1(Normal(rng) * 0.1 + (cup - 0.4) * 0.9);
                s["body-thighs"] = Clamp1(f.Thighs + Normal(rng) * 0.12 + strong * 0.5 + heavy * 0.8);
                s["body-lift"] = Clamp1(Normal(rng) * 0.3 - (cup - 0.4) * 0.6 - Math.Max(0, age - 30) * 0.012 + (firm - 0.6) * 0.5);
                s["body-spacing"] = Clamp1(Normal(rng) * 0.35);
                s["body-point"] = Clamp1(Normal(rng) * 0.35);
                s["body-fullness"] = Clamp1(Normal(rng) * 0.3 - Math.Max(0, age - 25) * 0.008 - (cup - 0.4) * 0.3);
                // the waist thickens after the menopause
                s["body-waist"] = Clamp1(f.Waist + Normal(rng) * 0.15 + heavy * 1.2 + Math.Max(0, age - 35) * 0.004 + Math.Max(0, age - 48) * 0.006);
            }
            else
            {
                s["body-seat"] = Clamp1(-0.05 + Normal(rng) * 0.25 + heavy * 0.4);
                s["body-hips"] = Clamp1(Normal(rng) * 0.2 + heavy * 0.3);
                s["body-shoulders"] = Clamp1(0.05 + Normal(rng) * 0.25 + strong * 0.8 + frame * 0.3);
                s["body-vshape"] = Clamp1(Normal(rng) * 0.2 + strong * 0.6 - heavy * 0.4);
                // the chest a man's: the pectorals with the muscle, flat when lean, never a bust; broad in a broad-chested people
                s["body-chest"] = Clamp1(Normal(rng) * 0.15 + strong * 0.6 + heavy * 0.3 + frame * 0.3);
                s["body-pecs"] = Clamp1(0.1 + Normal(rng) * 0.15 + strong * 0.9);
                s["body-thighs"] = Clamp1(Normal(rng) * 0.15 + strong * 0.5 + heavy * 0.8);
                s["body-waist"] = Clamp1(Normal(rng) * 0.2 + heavy * 1.2 + Math.Max(0, age - 35) * 0.004);
            }
            // the legs' length against the trunk by people, each their own
            s["body-legs"] = Clamp1(Normal(rng) * 0.3 + Of(p => p.Legs));
            // a belly (the shape is a full one) only with weight and the years, sooner where the people carry fat centrally;
            // a lean young body is flat
            s["body-belly"] = (float)Math.Clamp(-0.2 + Normal(rng) * 0.08 + Math.Max(0, weight - 0.45) * 1.5 + Math.Max(0, weight - 0.15) * Of(p => p.Central) * 1.2
                + Math.Max(0, age - 45) * (male ? 0.006 : 0.003), -0.4, 0.8);
            s["body-arms"] = Clamp1(Normal(rng) * 0.1 + strong * 0.8 + heavy * 0.6);
            s["body-tone"] = Clamp1(Normal(rng) * 0.15 + strong * 2 - heavy * 2);
            s["body-african"] = (float)mix.Af;
            s["body-asian"] = (float)mix.As;
            s["body-caucasian"] = (float)mix.Ca;

            // the face from the archetypes of their ancestry (both, for two), sex, build and muscle, and the years as a life
            // like theirs shows them (owner, pass 9: coherent bundles of features, not a reroll; Faces)
            look.Face = Faces.Draw(rng, new Faces.Who
            {
                Male = male, Age = age, Cluster = cluster, Second = second, Share = share,
                Build = look.Build, Muscle = look.Muscle, Hardness = hard,
            }).Values;
            // the body ages with the face (the skin's age follows it, LookView)
            s["body-age"] = (float)Math.Clamp((Faces.Apparent(age, hard) - 24) / 46.0, 0, 1);

            // skin: the people's tone (very light to very dark, the whole human range) with the person's own shade; a woman a
            // little lighter than the men of her people from puberty on (Jablonski and Chaplin 2000); the sun of outdoor work
            // (which darkens the light most); undertone warm or rosy by ancestry
            var outdoor = labour >= 1 ? 1 : role == "drifter" || role == "pilgrim" || role == "nomad" ? 0.8 : 0.3;
            var tone = Tone(cluster) * (1 - share) + (second != null ? Tone(second) * share : 0) + Normal(rng) * 0.14;
            if (!male) tone -= 0.08 * (1 - child);
            tone += 0.22 * outdoor * (1 - Math.Max(0, tone)) - 0.08 * (1 - outdoor);
            look.Skin = Clamp1(tone);
            look.Undertone = Clamp1(Undertone(cluster) * (1 - share) + (second != null ? Undertone(second) * share : 0) + Normal(rng) * 0.25);

            // the hair's colour by ancestry (fair hair only where it is found; of two ancestries the darker mostly wins), and
            // the grey by the people's own onset and pace (Europeans earliest, Africans latest), sooner on a hard life
            var shade = HairShade(rng, cluster);
            if (second != null)
            {
                var other = HairShade(rng, second);
                if (Darkness(other) > Darkness(shade) && rng.Chance(0.5 + share)) shade = other;
            }
            var greyOnset = Of(p => p.GreyOnset) - 2 * Math.Max(0, hard);
            var greySpan = Of(p => p.GreySpan);
            var greyBase = Peoples.Grey(age, greyOnset, greySpan);
            // each person greys faster or slower than their people by a factor of their own, so the spread grows with the
            // greying: years before the onset only a few hairs, rarely more (P4.15b: a third of a man's beard white at
            // thirty-eight)
            var greyPace = Normal(rng);
            var grey = Math.Clamp(greyBase * Math.Exp(0.6 * greyPace) + Math.Max(0, greyPace) * 0.03, 0, 1);
            // the owner's rule (pass 10): grey hair only from 55, a necessary condition, not a sufficient one; the people's
            // own greying comes in over the ten years after it (no one jumps from none to half grey on a birthday, R5:
            // a man of 55 with a white beard)
            grey *= GreyRamp(age, 10);
            look.Grey = (float)grey;
            look.HairColour = GreyShade(shade, grey);
            look.HairBase = Looks.HairColours[shade];
            // light eyes are recessive: of two ancestries, light only as often as both carry them
            var light = second != null ? Math.Pow(LightEyes(cluster), 1 - share) * Math.Pow(LightEyes(second), share) : LightEyes(cluster);
            look.Eyes = rng.Chance(light) ? rng.Pick(new[] { "hazel", "green", "grey_green", "blue_grey", "blue", "grey" })
                : rng.Pick(new[] { "brown", "dark", "brown", "hazel" });
            // freckles: almost always with red hair (the same gene), often on fair skin, more with the sun
            var red = shade == 6;
            // (freckling is the north European's: MC1R variants are rare elsewhere, where the sun leaves spots instead)
            var freckling = Of(p => p.Id == "north_european" ? 1.0 : p.Id == "mediterranean" ? 0.3 : 0.06);
            look.Freckles = red && rng.Chance(0.85) ? (float)rng.Range(0.3, 0.8)
                : look.Skin < -0.45 && rng.Chance((0.3 + 0.15 * outdoor) * freckling) ? (float)rng.Range(0.1, 0.55) : 0f;

            // the hair by the grooming rule, in the forms the people's hair takes: coily hair cropped close, braided or
            // locked; straight hair cropped, tied up or braided; wavy hair any of them
            var texture = Texture(cluster, second, share, rng);
            look.Hair = HairStyle(rng, texture, male);
            if (!male && look.Hair == "buzz" && texture != "coily" && age > 40) look.Hair = rng.Chance(0.5) ? "sf_bun" : "sf_crop";
            // a man's pattern balding by his people's rate and his years: the temples and crown first; past the middle,
            // what is left is cropped close (out here nobody combs it over)
            if (male && age >= 18 && rng.Chance(Peoples.BaldingChance(age, Of(p => p.Balding))))
            {
                look.Bald = (float)Math.Clamp((age - 18) / 40.0 * rng.Range(0.45, 1.2), 0.1, 1.0);
                if (look.Bald > 0.45f) look.Hair = "buzz";
                else if (look.Hair is "sf_matted" or "sf_bun" or "sf_braid" or "sf_cornrows") look.Hair = rng.Chance(0.5) ? "buzz" : texture == "coily" ? "sf_coils" : "sf_crop";
            }

            // a man's face: mostly unshaven out here, fuller with the years; the comfortable keep it trimmed or shaved; as
            // full as his people's beards grow (sparse beards become a moustache, a chin or nothing)
            if (male && age >= 16)
            {
                var dense = Of(p => p.Beard);
                var clean = (m == Means.Rich ? 0.55 : m == Means.Comfortable ? 0.3 : 0.08) + (1 - dense) * 0.45;
                var coily = Texture(cluster, null, 0, null) == "coily";
                look.Beard = rng.Chance(Math.Min(0.9, clean)) ? null
                    : Pick(rng, ("stubble_light", 0.2), ("stubble", 0.25 * dense), ("stubble_heavy", 0.18 * dense * dense),
                        ("short_beard", (0.14 + Math.Max(0, age - 30) * 0.004) * dense * (coily ? 1.3 : 1)),
                        ("full_beard", (0.1 + Math.Max(0, age - 35) * 0.006) * dense * dense * (coily ? 0.5 : 1)),
                        ("goatee", 0.06 + (1 - dense) * 0.12), ("moustache", 0.07 + (1 - dense) * 0.12));
                // a beard greys before the head, and a north European's often grows red under brown hair
                var beardShade = shade;
                if (!red && (cluster == "north_european" || second == "north_european") && shade >= 1 && shade <= 4 && rng.Chance(0.25)) beardShade = 6;
                // (on the people's own curve, about six years ahead of the head)
                var beardGrey = Math.Clamp(Math.Clamp(Peoples.Grey(age + 6, greyOnset, greySpan) * Math.Exp(0.6 * greyPace) + Math.Max(0, greyPace) * 0.03, 0, 1) * GreyRamp(age, 8), grey, 1);
                if (beardShade != shade || beardGrey > grey + 0.01) look.BeardColour = GreyShade(beardShade, beardGrey);
                look.BeardBase = Looks.HairColours[beardShade];
                look.BeardGrey = (float)beardGrey;
            }

            // the brows: by sex (a woman's finer and arched, a man's heavier and straight), by people (dense where they are)
            // and by the years (a woman's thin, a man's grow bushy); darker than fair hair, greying after the head
            var browsTend = Of(p => p.Brows) + (male && age > 50 ? 0.5 : 0) - (!male && age > 50 ? 0.4 : 0);
            look.Brows = PickIndex(rng, BrowShares(browsTend));
            // (the brows grey a decade or more after the head: a man of fifty-five with a grey head has dark brows still)
            look.BrowColour = BrowShade(shade, Math.Max(0, grey - 0.5));

            if (rng.Chance(0.12 + labour * 0.18)) look.Scar = rng.Pick(Looks.Scars);
            if (rng.Chance(0.12)) look.Tattoo = rng.Pick(Looks.Tattoos);
            if (male && age < 18 && look.Beard != null) look.Beard = "stubble_light";
            // the head, face and neck held to real people of their sex and ancestry (pass 10, docs/PEOPLE_REALISM.md §4.1)
            if (age >= 18)
            {
                if (fit) Proportions.Fit(look, male, cluster, age, Seed(id + "/proportions"));
                else look.Pending = (cluster, age, Seed(id + "/proportions"));
            }
            Young(look, child);
            return look;
        }

        /// <summary>The peoples' stature offsets averaged over the Reach's shares (so the Reach's means hold as measured).</summary>
        private static double MeanStatureOffset => Clusters.Sum(c => c.Share * Peoples.Of(c.Id).Stature) / Clusters.Sum(c => c.Share);

        /// <summary>The hair's form for a person: their people's, or for two peoples one of the two (coily hair dominant).</summary>
        public static string Texture(string cluster, string second, double share, Rng rng)
        {
            var a = Peoples.Of(cluster).Texture;
            if (second == null) return a;
            var b = Peoples.Of(second).Texture;
            if (a == b) return a;
            if (a == "coily" || b == "coily") return rng != null && rng.Chance(0.25) ? "wavy" : "coily";
            return "wavy";
        }

        /// <summary>A hair of <see cref="Looks.Hair"/> for a hair form and a sex, by the grooming rule. Few women cropped
        /// (R5: a fifth of them were, and with no hair round the face a cropped woman's face read as a man's).</summary>
        public static string HairStyle(Rng rng, string texture, bool male) => texture switch
        {
            "coily" => male
                ? Pick(rng, ("buzz", 0.4), ("sf_coils", 0.25), ("sf_matted", 0.2), ("sf_cornrows", 0.1), ("sf_braid", 0.05))
                : Pick(rng, ("sf_cornrows", 0.25), ("sf_coils", 0.2), ("sf_matted", 0.2), ("sf_braid", 0.15), ("sf_bun", 0.1), ("buzz", 0.1)),
            "straight" => male
                ? Pick(rng, ("sf_crop", 0.45), ("buzz", 0.25), ("sf_bun", 0.15), ("sf_matted", 0.1), ("sf_braid", 0.05))
                : Pick(rng, ("sf_bun", 0.41), ("sf_braid", 0.36), ("sf_crop", 0.11), ("sf_matted", 0.1), ("buzz", 0.02)),
            _ => male
                ? Pick(rng, ("buzz", 0.3), ("sf_crop", 0.45), ("sf_matted", 0.15), ("sf_bun", 0.1))
                : Pick(rng, ("sf_braid", 0.36), ("sf_bun", 0.33), ("sf_crop", 0.11), ("sf_matted", 0.16), ("buzz", 0.04)),
        };

        /// <summary>A hair colour for a shade of <see cref="Looks.HairColours"/> at a share of grey: the shade itself, salt and
        /// pepper (the shade towards the iron grey), then grey and white.</summary>
        public static int GreyShade(int shade, double grey) => GreyColour(Looks.HairColours[shade], grey);

        /// <summary><see cref="GreyShade"/> for any colour.</summary>
        public static int GreyColour(int colour, double grey)
        {
            if (grey > 0.8) return Looks.HairColours[9];
            if (grey > 0.6) return Looks.HairColours[8];
            if (grey > 0.3) return Mix(colour, Looks.HairColours[7], (grey - 0.3) / 0.3 * 0.6 + 0.3);
            return grey > 0.12 ? Mix(colour, Looks.HairColours[7], grey) : colour;
        }

        /// <summary>How grey an authored grey reads (its lightness from the iron grey to white, as a share of grey).</summary>
        public static double GreyOf(int c)
        {
            var l = (((c >> 16) & 255) + ((c >> 8) & 255) + (c & 255)) / 3.0;
            return Math.Clamp(0.45 + (l - 120) / 90.0 * 0.55, 0.45, 1.0);
        }

        /// <summary>Whether a colour is already grey or white (low saturation, not dark).</summary>
        public static bool IsGrey(int c)
        {
            int r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
            return Math.Max(r, Math.Max(g, b)) - Math.Min(r, Math.Min(g, b)) < 26 && (r + g + b) / 3 > 100;
        }

        /// <summary>The brows' colour for a hair shade: as dark as the hair, darker than fair or red hair (brows are seldom as
        /// light), towards grey as they grey.</summary>
        public static int BrowShade(int shade, double grey) => BrowColourOf(Looks.HairColours[shade], grey);

        /// <summary><see cref="BrowShade"/> for any hair colour.</summary>
        public static int BrowColourOf(int hair, double grey)
        {
            var c = hair;
            var lum = (((c >> 16) & 255) * 0.3 + ((c >> 8) & 255) * 0.59 + (c & 255) * 0.11) / 255.0;
            if (lum >= 0.3) c = Mix(c, Looks.HairColours[2], 0.4);
            return grey > 0.05 ? Mix(c, Looks.HairColours[8], Math.Min(1, grey * 1.2)) : c;
        }

        /// <summary>The brow styles' shares (fine, natural, heavy) for a tendency (-1 sparse .. 1 dense).</summary>
        public static double[] BrowShares(double tend)
        {
            var w = new[] { 0.3 * Math.Exp(-1.2 * tend), 0.45, 0.25 * Math.Exp(1.2 * tend) };
            var t = w.Sum();
            return w.Select(x => x / t).ToArray();
        }

        private static int Mix(int a, int b, double t)
        {
            t = Math.Clamp(t, 0, 1);
            int C(int shift) => (int)Math.Round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t);
            return (C(16) << 16) | (C(8) << 8) | C(0);
        }

        private static readonly HashSet<string> Grown = new() { "chin-bones", "chin-width", "chin-prominent", "chin-height", "brow-ridge", "nose-volume", "nose-scale-vert", "neck-scale-horiz", "chin-prognathism", "head-square", "head-rectangular" };

        /// <summary>How hard a life has been on the face (Faces.Who.Hardness): want and the weather for the destitute and the
        /// labourer, little for the comfortable, and the rich age slowly and well.</summary>
        public static double Hardness(string role, Means m)
        {
            var h = m switch { Means.Destitute => 0.65, Means.Working => 0.35, Means.Comfortable => 0.05, _ => -0.25 };
            h += (Labour(role) - 0.5) * 0.4;
            return Math.Clamp(h, -0.3, 1);
        }

        /// <summary>How dark a hair shade of <see cref="Looks.HairColours"/> is (black 1 .. blond 0; red as a light shade).</summary>
        private static double Darkness(int shade) => shade switch { 0 => 1, 1 => 0.85, 2 => 0.65, 3 => 0.45, 4 => 0.3, 5 => 0.15, 6 => 0.35, _ => 0.5 };

        /// <summary>How much of a child's body is left at an age (the <c>body-child</c> shape: MakeHuman's eleven-year-old
        /// at the base's stature): all of it to eleven, gone by seventeen for a boy and sixteen for a girl.</summary>
        public static double Child(bool male, double age) => male ? Math.Clamp((17 - age) / 6, 0, 1) : Math.Clamp((16 - age) / 5, 0, 1);

        // the growth chart's middle (cm, by year from 2 to 18), scaled to the Reach's grown statures
        private static readonly double[] BoysChart = { 87, 96, 103, 110, 116, 122, 128, 133, 138, 143, 149, 156, 164, 170, 174, 176, 177 };
        private static readonly double[] GirlsChart = { 86, 95, 102, 109, 115, 122, 128, 133, 138, 144, 151, 157, 160, 162, 162.5, 163, 163 };

        /// <summary>The middle stature of the young at an age (the growth chart, scaled to the Reach's grown means).</summary>
        public static double Growth(bool male, double age)
        {
            var chart = male ? BoysChart : GirlsChart;
            var t = Math.Clamp(age - 2, 0, chart.Length - 1);
            var i = (int)Math.Floor(t);
            var at = i >= chart.Length - 1 ? chart[chart.Length - 1] : chart[i] + (chart[i + 1] - chart[i]) * (t - i);
            return at * (male ? ManMean / BoysChart[chart.Length - 1] : WomanMean / GirlsChart[chart.Length - 1]);
        }

        /// <summary>A body as young as it is: the child's shape in, the grown body's measures and bust out by as much, lean,
        /// little muscle, the face's character softened; no tattoo on a child.</summary>
        private static void Young(PlayerLook look, double child)
        {
            if (child <= 0) return;
            var keep = (float)(1 - child);
            var s = look.Shape;
            foreach (var k in s.Keys.ToList())
                if (k != "body-african" && k != "body-asian" && k != "body-caucasian" && k != "body-age") s[k] *= keep;
            if (look.Body == "f") s["body-bust"] = (float)Math.Min(s["body-bust"], -child);   // no bust on a girl
            s["body-child"] = (float)child;
            look.Build = (float)Math.Clamp(look.Build * keep - 0.3 * child, -1, 1);
            look.Muscle = (float)Math.Clamp(look.Muscle * keep - 0.4 * child, -1, 1);
            // a child's face: their people's features already, the marks of sex and of a grown frame (jaw, chin, brow ridge,
            // a large nose, a thick neck) not yet
            foreach (var k in look.Face.Keys.ToList())
                look.Face[k] *= (float)(1 - (Grown.Contains(k) ? 0.75 : 0.25) * child);
            look.Tattoo = null;
        }

        /// <summary>
        /// What the content says of a person's look over the drawn one (<see cref="LookDef.Over"/>, the web game's keys):
        /// the hair's colour, and its style as one of ours by the grooming rule (a bob or a side part is tied back or
        /// cropped; shaved, buzzed and faded are the buzz; braids and cornrows the braid; long hair matted), scars by
        /// the nearest of ours, skin tone (0 pale to 1 dark, against the bases' mid-tone bake), undertone, freckles
        /// eyes and a beard.
        /// </summary>
        public static PlayerLook Over(PlayerLook look, Newtonsoft.Json.Linq.JObject over, double age = 99)
        {
            if (look == null || over == null) return look;
            if (over["hair"] is Newtonsoft.Json.Linq.JObject hair)
            {
                var style = hair["style"]?.ToString();
                if (!string.IsNullOrEmpty(style)) look.Hair = HairOf(style);
                if (hair["color"] != null && hair["color"].Type == Newtonsoft.Json.Linq.JTokenType.Integer)
                {
                    // the authored colour with the years' grey over it (the web game's colours did not age; a seventy-year-old
                    // keeps the grey their people show at seventy), the brows from it as from any hair
                    var authored = (int)hair["color"];
                    // an authored grey on someone under 55 is not kept (owner, pass 10): their own colour stays
                    if (!(IsGrey(authored) && age < GreyFrom))
                    {
                        look.HairColour = IsGrey(authored) ? authored : GreyColour(authored, look.Grey);
                        if (IsGrey(authored))
                        {
                            // an authored grey says how grey, not what colour the hair was: the brows and the beard's dark hairs
                            // keep the person's own (P4.15b: a brown man of fifty-five drawn with blond brows and beard), and
                            // the beard is at least as grey as the head
                            look.Grey = Math.Max(look.Grey, (float)GreyOf(authored));
                            if (look.BeardBase != 0) look.BeardGrey = Math.Max(look.BeardGrey, Math.Min(1f, look.Grey + 0.1f));
                        }
                        else
                        {
                            look.BrowColour = BrowColourOf(authored, Math.Max(0, look.Grey - 0.5));
                            look.HairBase = authored;
                            if (look.Body == "m") look.BeardBase = authored;
                        }
                        if (look.BeardBase != 0) look.BeardColour = GreyColour(look.BeardBase, look.BeardGrey);
                    }
                }
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
            if (style == "none" || style.StartsWith("paint_shaved") || style.StartsWith("paint_buzz") || style.StartsWith("paint_fade")) return "buzz";
            if (style.Contains("cornrow")) return "sf_cornrows";
            if (style.Contains("coil") || style.Contains("afro") || style.Contains("twa")) return "sf_coils";
            if (style.Contains("braid")) return "sf_braid";
            if (style.Contains("bob") || style.Contains("ponytail") || style.Contains("bun")) return "sf_bun";
            if (style.StartsWith("long") || style.Contains("dread") || style.Contains("matted")) return "sf_matted";
            return "sf_crop";
        }

        /// <summary>A woman's figure type (the shape sliders' centres for it): the real types, as measured across thousands
        /// of women (Simmons, Istook and Devarajan 2004): straight most often, then the pear, the inverted triangle, the
        /// hourglass and the apple (more of those with a fuller build).</summary>
        public sealed class Figure
        {
            public string Id; public double Share, Shoulders, Taper, Bust, Waist, Hips, Seat, Thighs;
        }

        public static readonly Figure[] Figures =
        {
            new() { Id = "straight", Share = 0.42, Shoulders = 0.0, Taper = 0.0, Bust = -0.05, Waist = 0.2, Hips = -0.15, Seat = -0.1, Thighs = -0.1 },
            new() { Id = "pear", Share = 0.2, Shoulders = -0.25, Taper = -0.15, Bust = -0.12, Waist = -0.1, Hips = 0.4, Seat = 0.35, Thighs = 0.35 },
            new() { Id = "inverted_triangle", Share = 0.14, Shoulders = 0.4, Taper = 0.35, Bust = 0.08, Waist = 0.05, Hips = -0.3, Seat = -0.15, Thighs = -0.2 },
            new() { Id = "hourglass", Share = 0.15, Shoulders = 0.1, Taper = 0.1, Bust = 0.2, Waist = -0.45, Hips = 0.3, Seat = 0.25, Thighs = 0.1 },
            new() { Id = "apple", Share = 0.09, Shoulders = 0.05, Taper = 0.0, Bust = 0.12, Waist = 0.45, Hips = -0.1, Seat = -0.1, Thighs = 0.0 },
        };

        /// <summary>The figures' shares for a build: the apple grows with weight, the rest in proportion.</summary>
        public static double[] FigureShare(double heavy)
        {
            var w = Figures.Select(f => f.Share * (f.Id == "apple" ? Math.Exp(Math.Max(0, heavy) * 3) : 1)).ToArray();
            var t = w.Sum();
            return w.Select(x => x / t).ToArray();
        }

        private static int PickIndex(Rng rng, double[] shares)
        {
            var x = rng.Next();
            for (var i = 0; i < shares.Length; i++) { x -= shares[i]; if (x <= 0) return i; }
            return shares.Length - 1;
        }

        /// <summary>A macro value as the base's slider: below the base towards its decr shape, above towards its incr.</summary>
        public static double ToSlider(double value, double at, double low, double high)
        {
            if (value < at) return at - low <= 1e-6 ? 0 : Math.Max(-1, (value - at) / (at - low));
            return high - at <= 1e-6 ? 0 : Math.Min(1, (value - at) / (high - at));
        }

        /// <summary>The ancestry clusters of the Reach and their shares in a crowd with no community of its own.</summary>
        public static readonly (string Id, double Share)[] Clusters =
        {
            ("north_european", 0.15), ("mediterranean", 0.13), ("west_african", 0.15), ("east_african", 0.1), ("east_asian", 0.12),
            ("southeast_asian", 0.08), ("south_asian", 0.1), ("latin_american", 0.1), ("indigenous_american", 0.07),
        };

        /// <summary>A place's community: the clusters' shares with two or three of them raised (a town is founded by
        /// someone), from the place's seed. The crowd of a place then reads as that place's, not the same mix everywhere.</summary>
        public static double[] Community(uint seed)
        {
            var rng = new Rng(unchecked(seed * 2654435761u + 97u));
            var w = Clusters.Select(c => c.Share).ToArray();
            var n = rng.Int(2, 3);
            for (var k = 0; k < n; k++) w[rng.Int(0, w.Length - 1)] *= rng.Range(2.5, 4.5);
            var t = w.Sum();
            return w.Select(x => x / t).ToArray();
        }

        /// <summary>A person's cluster drawn from a community's weights (the Reach's shares when none).</summary>
        public static string Cluster(Rng rng, double[] community = null)
        {
            var w = community != null && community.Length == Clusters.Length ? community : Clusters.Select(c => c.Share).ToArray();
            var t = w.Sum();
            var x = rng.Next() * t;
            for (var i = 0; i < w.Length; i++) { x -= w[i]; if (x <= 0) return Clusters[i].Id; }
            return Clusters[Clusters.Length - 1].Id;
        }

        /// <summary>A person's MakeHuman mix for their cluster: mostly that cluster, their own small way off it; one in four
        /// is of two clusters (a parent from each).</summary>
        public static (double Af, double As, double Ca) Mix(Rng rng, string cluster) => Mixed(rng, cluster).Mix;

        /// <summary><see cref="Mix"/> with the second cluster and its share (null and 0 for one ancestry).</summary>
        public static ((double Af, double As, double Ca) Mix, string Second, double Share) Mixed(Rng rng, string cluster)
        {
            var a = Ancestry(cluster) ?? (0.3, 0.25, 0.45);
            double af = a.Af, @as = a.As, ca = a.Ca;
            string second = null;
            double t = 0;
            if (rng.Chance(0.25))
            {
                second = Cluster(rng);
                var b = Ancestry(second) ?? (0.3, 0.25, 0.45);
                t = rng.Range(0.25, 0.5);
                af = af * (1 - t) + b.Af * t; @as = @as * (1 - t) + b.As * t; ca = ca * (1 - t) + b.Ca * t;
                if (second == cluster) { second = null; t = 0; }
            }
            af = Math.Max(0, af + Normal(rng) * 0.04); @as = Math.Max(0, @as + Normal(rng) * 0.04); ca = Math.Max(0, ca + Normal(rng) * 0.04);
            var sum = af + @as + ca;
            return ((af / sum, @as / sum, ca / sum), second, t);
        }

        /// <summary>A cluster's skin tone against the bases' mid-tone bake (-1 very light to 1 very dark).</summary>
        public static double Tone(string cluster) => cluster switch
        {
            "north_european" => -0.8, "mediterranean" => -0.35, "east_asian" => -0.3, "southeast_asian" => 0.08,
            "south_asian" => 0.3, "latin_american" => 0.0, "indigenous_american" => 0.15, "east_african" => 0.75, "west_african" => 0.9,
            _ => 0.0,
        };

        /// <summary>A cluster's undertone (warm + to rosy -).</summary>
        public static double Undertone(string cluster) => cluster switch
        {
            "east_asian" or "southeast_asian" => 0.35, "south_asian" or "latin_american" or "indigenous_american" => 0.15,
            "north_european" => -0.3, "mediterranean" => -0.05, _ => 0.0,
        };

        /// <summary>A hair shade (an index into <see cref="Looks.HairColours"/>: black, dark brown, brown, light brown, dark
        /// blond, blond, red) for a cluster: fair and red hair only among the north European, brown among the
        /// Mediterranean, black or near it elsewhere.</summary>
        public static int HairShade(Rng rng, string cluster) => cluster switch
        {
            "north_european" => PickIndex(rng, new[] { 0.08, 0.2, 0.25, 0.17, 0.12, 0.13, 0.05 }),
            "mediterranean" => PickIndex(rng, new[] { 0.3, 0.38, 0.22, 0.08, 0.01, 0.0, 0.01 }),
            "latin_american" or "south_asian" => PickIndex(rng, new[] { 0.55, 0.35, 0.1 }),
            _ => PickIndex(rng, new[] { 0.75, 0.25 }),
        };

        /// <summary>How often a cluster's eyes are light (blue, green, grey, hazel-green).</summary>
        public static double LightEyes(string cluster) => cluster switch
        {
            "north_european" => 0.7, "mediterranean" => 0.25, "latin_american" => 0.08, "south_asian" => 0.04, _ => 0.01,
        };

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
