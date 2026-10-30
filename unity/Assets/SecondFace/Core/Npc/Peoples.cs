using System;
using System.Collections.Generic;

namespace SecondFace.Core.Npc
{
    /// <summary>
    /// What a people tends to look like beyond the face (owner, 2026-10-30, pass 9: aesthetic diversity as it occurs along
    /// ancestry, sex and age, "based on the real world"; the catalogue and its sources: docs/PEOPLE_RESEARCH.md §6). Each
    /// value is a tendency, drawn around per person, never a rule; a person of two peoples takes from both
    /// (<see cref="Peoples.Blend"/>). The face's own regularities are <see cref="Faces"/>.
    /// </summary>
    public sealed class People
    {
        public string Id;
        /// <summary>Stature against the Reach's mean, cm (a modest share of the real gaps; a man's, a woman's at 0.9).</summary>
        public double Stature;
        /// <summary>Leg length against the trunk (the body-legs slider): longer limbs in African ancestry, shorter legs to the
        /// trunk in East Asian and indigenous American (ANSUR II limb ratios; Bogin and Varela-Silva on sitting height).</summary>
        public double Legs;
        /// <summary>The hair's form: coily, straight or wavy (Loussouarn 2007; De La Mettrie et al. 2007).</summary>
        public string Texture;
        /// <summary>The age the first grey shows, and the years from it to mostly grey (Panhard et al. 2012: mid-thirties
        /// in Europeans, late thirties in Asians, mid-forties in Africans, and slower after).</summary>
        public double GreyOnset, GreySpan;
        /// <summary>A man's pattern balding against the north European rate (Hamilton-Norwood; Chinese and Korean men about
        /// half; African lower; indigenous American lowest).</summary>
        public double Balding;
        /// <summary>How fully a man's beard grows, 0..1 (dense around the Mediterranean and in South Asia, sparse in East and
        /// Southeast Asia and among the indigenous Americas, often kept short where it curls).</summary>
        public double Beard;
        /// <summary>The brows: -1 sparse and fine .. 1 dense and heavy.</summary>
        public double Brows;
        /// <summary>A woman's figure types (straight, pear, inverted triangle, hourglass, apple) against the Reach's shares
        /// (SizeUSA: Asian women most often straight, Black and White women more often pear, Hispanic women more often an
        /// inverted triangle; central fat in South Asian women).</summary>
        public double[] Figures;
        /// <summary>A woman's bust and seat against the Reach's means (slider units).</summary>
        public double Bust, Seat;
        /// <summary>A man's chest and shoulders: -1 slender (the Nilotic build) .. 1 broad-chested (the Andean).</summary>
        public double Frame;
        /// <summary>Fat carried on the belly at a lower weight (South Asian and East Asian visceral fat).</summary>
        public double Central;
    }

    public static class Peoples
    {
        private static People P(string id, double stature, double legs, string texture, double greyOnset, double greySpan, double balding,
            double beard, double brows, double[] figures, double bust, double seat, double frame, double central) => new()
        {
            Id = id, Stature = stature, Legs = legs, Texture = texture, GreyOnset = greyOnset, GreySpan = greySpan, Balding = balding,
            Beard = beard, Brows = brows, Figures = figures, Bust = bust, Seat = seat, Frame = frame, Central = central,
        };

        public static readonly Dictionary<string, People> All = new()
        {
            ["north_european"] = P("north_european", 3, 0.05, "straight", 34, 34, 1.0, 0.9, -0.1, new[] { 1.0, 1.15, 1.0, 1.0, 1.0 }, 0, -0.05, 0.1, 0),
            ["mediterranean"] = P("mediterranean", 0, 0, "wavy", 35, 34, 1.0, 1.0, 0.5, new[] { 1.0, 1.05, 1.0, 1.1, 1.0 }, 0.02, 0.05, 0, 0.05),
            ["west_african"] = P("west_african", 1, 0.3, "coily", 43, 38, 0.6, 0.7, 0.1, new[] { 0.75, 1.35, 0.8, 1.25, 1.0 }, 0.03, 0.2, 0.1, 0),
            ["east_african"] = P("east_african", 2, 0.4, "coily", 42, 38, 0.6, 0.6, 0, new[] { 1.15, 1.1, 0.9, 1.0, 0.8 }, -0.03, 0.05, -0.35, -0.05),
            ["east_asian"] = P("east_asian", -1, -0.25, "straight", 38, 36, 0.45, 0.3, -0.4, new[] { 1.4, 0.85, 0.9, 0.8, 1.0 }, -0.08, -0.1, -0.05, 0.1),
            ["southeast_asian"] = P("southeast_asian", -5, -0.2, "straight", 39, 36, 0.45, 0.3, -0.3, new[] { 1.35, 0.9, 0.9, 0.85, 1.0 }, -0.08, -0.05, -0.1, 0.1),
            ["south_asian"] = P("south_asian", -3, 0.05, "wavy", 36, 34, 0.8, 1.0, 0.5, new[] { 0.95, 1.1, 0.9, 1.0, 1.5 }, 0, 0, -0.1, 0.35),
            ["latin_american"] = P("latin_american", -3, -0.1, "wavy", 37, 34, 0.75, 0.75, 0.2, new[] { 0.9, 1.0, 1.4, 1.1, 1.1 }, 0.02, 0.08, 0.15, 0.15),
            ["indigenous_american"] = P("indigenous_american", -3, -0.25, "straight", 40, 38, 0.3, 0.35, -0.2, new[] { 1.0, 0.9, 1.3, 1.0, 1.25 }, 0, 0, 0.35, 0.15),
        };

        public static People Of(string id) => id != null && All.TryGetValue(id, out var p) ? p : All["mediterranean"];

        /// <summary>A tendency for a person of one people, or of two (the second's share of it).</summary>
        public static double Blend(string first, string second, double share, Func<People, double> f)
        {
            var a = f(Of(first));
            return second == null ? a : a * (1 - share) + f(Of(second)) * share;
        }

        /// <summary>A man's chance of pattern balding at an age: the north European curve (about a sixth by thirty, half by
        /// fifty, four in five by seventy) times the people's rate.</summary>
        public static double BaldingChance(double age, double rate) =>
            age < 18 ? 0 : Math.Clamp(rate, 0, 1.2) * 0.85 / (1 + Math.Exp(-(age - 45) / 9.0));

        /// <summary>How grey a head is (0 none .. 1 white) at an age for a people's onset and span, before a person's own
        /// difference.</summary>
        public static double Grey(double age, double onset, double span) => age <= onset ? 0 : Math.Min(1, Math.Pow((age - onset) / span, 1.3));
    }
}
