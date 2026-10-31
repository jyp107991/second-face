using System;

namespace SecondFace.Core.Npc
{
    /// <summary>
    /// The skin's colour as it is measured (R4c, docs/PEOPLE_REALISM.md §15): a person's tone (<see cref="PlayerLook.Skin"/>,
    /// -1 the fairest to 1 the darkest) and undertone (<see cref="PlayerLook.Undertone"/>, rosy - to warm +) as their cheek's
    /// colour in CIELAB under D65 the way dermatology measures it (a spectrophotometer's d/8 reading, specular included), and
    /// the bake's colour brought to it (SecondFace/Skin _ToneMul). Lightness L* = 54 - 20 t - 4 t^2 (70 at the fairest, 30 at
    /// the darkest), and the peoples' tones (<see cref="Bodies.Tone"/>) put their adults' cheeks where real ones were measured:
    /// British 59.6 (sd 5.5), Kurdish 58.0, Chinese 58.9, Thai 60.7 (Xiao et al. 2017, "Characterising the variations in
    /// ethnic skin colours", Skin Res Technol 23); Indian adults 53-63 (Pawar et al. 2024, J Indian Prosthodont Soc); Black
    /// African women's foreheads at ITA -33 (Piérard group, Liège) and two in three Africans of ten countries below ITA -50 at
    /// the forehead (Uganda, CM-700d), about L* 35-40. Hue about 53 degrees (yellower with a warm undertone: the Thai 59, the
    /// British 51), chroma about 19, less on the darkest skin (African skin keeps its hue and loses chroma with lightness:
    /// Wang et al. 2015, CIC 23; a* 8.3 at the forehead in the Liège study). The old curve (the bake's shade times a third at
    /// the dark end, lifted most of the way to white at the fair) put the darkest cheeks at L* 25 and the fairest past 70,
    /// a ratio of luminance three times the real one, so on dark faces the whites of the eyes stood out like a mask's.
    /// </summary>
    public static class SkinColour
    {
        /// <summary>The bakes' reference skin (sRGB): every base's bake is brought to it (WardrobeBuild.Balance), so the
        /// multiplier below takes it to the person's own colour.</summary>
        public static readonly (float R, float G, float B) Reference = (0.590f, 0.426f, 0.346f);

        /// <summary>The cheek's lightness L* for a tone.</summary>
        public static double Lightness(double tone)
        {
            var t = Math.Clamp(tone, -1, 1);
            return 54 - 20 * t - 4 * t * t;
        }

        /// <summary>The cheek's colour (L*, a*, b*) for a tone and an undertone.</summary>
        public static (double L, double A, double B) Lab(double tone, double undertone)
        {
            var L = Lightness(tone);
            var u = Math.Clamp(undertone, -1, 1);
            var hue = (53 + 7 * u) * Math.PI / 180;
            var chroma = (19 - 0.28 * Math.Max(0, 55 - L)) * (1 + 0.06 * u);
            return (L, chroma * Math.Cos(hue), chroma * Math.Sin(hue));
        }

        /// <summary>The individual typology angle (degrees) of a colour: above 55 very light, 41-55 light, 28-41
        /// intermediate, 10-28 tan, -30-10 brown, below -30 dark (Chardon et al. 1991; Del Bino and Bernerd 2013).</summary>
        public static double Ita((double L, double A, double B) lab) => Math.Atan2(lab.L - 50, lab.B) * 180 / Math.PI;

        /// <summary>The linear multiplier per channel that takes the reference skin to this tone's (SecondFace/Skin
        /// _ToneMul, on the balanced bake).</summary>
        public static (float R, float G, float B) Multiplier(double tone, double undertone)
        {
            var t = Linear(Lab(tone, undertone));
            return ((float)(t.R / Decode(Reference.R)), (float)(t.G / Decode(Reference.G)), (float)(t.B / Decode(Reference.B)));
        }

        /// <summary>The multiplier for a person's look.</summary>
        public static (float R, float G, float B) Multiplier(PlayerLook look) => Multiplier(look.Skin, look.Undertone);

        /// <summary>A person's cheek lightness.</summary>
        public static double Lightness(PlayerLook look) => Lightness(look.Skin);

        /// <summary>CIELAB (D65) to linear sRGB.</summary>
        public static (double R, double G, double B) Linear((double L, double A, double B) lab)
        {
            var fy = (lab.L + 16) / 116;
            var fx = fy + lab.A / 500;
            var fz = fy - lab.B / 200;
            double F(double f) => f > 6.0 / 29 ? f * f * f : 3 * (6.0 / 29) * (6.0 / 29) * (f - 4.0 / 29);
            double x = 0.95047 * F(fx), y = F(fy), z = 1.08883 * F(fz);
            return (3.2406 * x - 1.5372 * y - 0.4986 * z, -0.9689 * x + 1.8758 * y + 0.0415 * z, 0.0557 * x - 0.2040 * y + 1.0570 * z);
        }

        /// <summary>Linear sRGB to CIELAB (D65).</summary>
        public static (double L, double A, double B) Lab((double R, double G, double B) rgb)
        {
            double x = (0.4124 * rgb.R + 0.3576 * rgb.G + 0.1805 * rgb.B) / 0.95047;
            double y = 0.2126 * rgb.R + 0.7152 * rgb.G + 0.0722 * rgb.B;
            double z = (0.0193 * rgb.R + 0.1192 * rgb.G + 0.9505 * rgb.B) / 1.08883;
            double F(double v) => v > 0.008856 ? Math.Cbrt(v) : 7.787 * v + 16.0 / 116;
            return (116 * F(y) - 16, 500 * (F(x) - F(y)), 200 * (F(y) - F(z)));
        }

        /// <summary>sRGB to linear.</summary>
        public static double Decode(double c) => c <= 0.04045 ? c / 12.92 : Math.Pow((c + 0.055) / 1.055, 2.4);
    }
}
