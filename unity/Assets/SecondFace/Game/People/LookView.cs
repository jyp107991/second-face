using SecondFace.Core.Npc;
using UnityEngine;

namespace SecondFace.Game.People
{
    /// <summary>
    /// Puts a <see cref="PlayerLook"/> on a player body (P5.3i): the hair (a piece of the wardrobe's hair slot, shaved, or
    /// the body's own), the face and the body's build and muscle (<see cref="FaceSculpt"/>), the hair's colour
    /// (greying with the face's age), the skin's tone, undertone and freckles, a scar and a tattoo (SecondFace/Skin, drawn
    /// in the head's frame), and the eyes' colour (SecondFace/Cloth's iris recolour), through each renderer's property
    /// block (merged with what the wardrobe and the face already put there). The height is <see cref="Scale"/>; the clothes'
    /// dyes go through the wardrobe (<see cref="Dresser"/>).
    /// </summary>
    public static class LookView
    {
        private static readonly int ToneMulId = Shader.PropertyToID("_ToneMul");
        private static readonly int FrecklesId = Shader.PropertyToID("_Freckles");
        private static readonly int ScarId = Shader.PropertyToID("_Scar");
        private static readonly int TattooId = Shader.PropertyToID("_Tattoo");
        private static readonly int RecolourId = Shader.PropertyToID("_Recolour");
        private static readonly int BeardId = Shader.PropertyToID("_Beard");
        private static readonly int BeardColourId = Shader.PropertyToID("_BeardColour");
        private static readonly int ScalpColourId = Shader.PropertyToID("_ScalpColour");
        private static readonly int BaldId = Shader.PropertyToID("_Bald");
        private static readonly int WrinklesId = Shader.PropertyToID("_Wrinkles");
        private static readonly int Brow0Id = Shader.PropertyToID("_Brow0");
        private static readonly int Brow1Id = Shader.PropertyToID("_Brow1");
        private static readonly int BrowColourId = Shader.PropertyToID("_BrowColour");
        private static readonly int ContrastId = Shader.PropertyToID("_Contrast");
        private static readonly int EyeYearsId = Shader.PropertyToID("_EyeYears");
        private static readonly int EyeWhiteId = Shader.PropertyToID("_EyeWhite");

        /// <summary>The body's scale: a stature against the base's own (<see cref="Bodies"/>), else the look's height (±6 %).</summary>
        public static float Scale(PlayerLook look) => Bodies.ScaleOf(Bodies.Finish(look));

        /// <summary>A white hair's colour as the hair's shader draws it (SecondFace/Cloth, _Grey: linear 0.46, 0.44, 0.40).</summary>
        public static readonly Color WhiteHair = new(0.71f, 0.70f, 0.67f, 1f);

        /// <summary>A content colour (0xRRGGBB) as a colour.</summary>
        public static Color Colour(int rgb) => new(((rgb >> 16) & 255) / 255f, ((rgb >> 8) & 255) / 255f, (rgb & 255) / 255f, 1f);

        public static void Apply(GameObject body, PlayerLook look)
        {
            if (body == null || look == null) return;
            Bodies.Finish(look);   // a fit left for when the person is first shown
            var wardrobe = body.GetComponentInChildren<Wardrobe>();
            if (wardrobe != null)
            {
                wardrobe.Hair(look.Hair == Looks.OwnHair(look.Body) ? null : look.Hair);
                // a grown beard as strands over the painted one (R5); stubble stays paint
                wardrobe.Beard(look.Body == "m" ? Looks.BeardPiece(look.Beard) : null);
            }
            var face = body.GetComponentInChildren<FaceSculpt>();
            if (face != null)
            {
                // the hair's and the beard's strands: the pigmented ones' colour and the share gone white (salt and pepper,
                // drawn per strand by the hair's shader, R5)
                face.HairColour = Colour(Looks.HairPigment(look));
                face.HairGrey = Looks.HairWhite(look);
                face.BeardColour = Colour(Looks.BeardPigment(look));
                face.BeardGrey = Mathf.Clamp01(look.BeardGrey);
                // the years in the skin (the aged bake blended in from the late twenties, most of the way by seventy), later on
                // darker and East Asian skin, sooner on a man's (Looks.SkinYears)
                face.SkinAge = Looks.SkinAge(look);
                face.Set(Looks.Shape(look));   // the face's sliders and the body's shapes, build and muscle
            }
            var scar = System.Array.IndexOf(Looks.Scars, look.Scar);
            var tattoo = System.Array.IndexOf(Looks.Tattoos, look.Tattoo);
            var block = new MaterialPropertyBlock();
            foreach (var r in body.GetComponentsInChildren<SkinnedMeshRenderer>(true))
            {
                var m = r.sharedMaterial;
                if (m == null) continue;
                if (r.name.StartsWith("Body_") && m.HasProperty(ToneMulId))
                {
                    r.GetPropertyBlock(block);
                    // the skin's colour as real cheeks are measured (SkinColour), over the reference bake
                    var tone = SkinColour.Multiplier(look);
                    block.SetVector(ToneMulId, new Vector4(tone.R, tone.G, tone.B, 1f));
                    block.SetFloat(FrecklesId, Mathf.Clamp01(look.Freckles));
                    block.SetFloat(WrinklesId, Looks.Wrinkles(look));
                    block.SetFloat(ScarId, scar);
                    block.SetFloat(TattooId, tattoo);
                    // a beard only on a man's body, in its own colour (greying first; red under brown hair) or the hair's darker
                    block.SetFloat(BeardId, look.Body == "m" ? System.Array.IndexOf(Looks.Beards, look.Beard) : -1);
                    // its pigmented hairs' colour, and in alpha the share gone white (salt and pepper, P4.15b)
                    var beard = Colour(Looks.BeardPigment(look));
                    beard.a = Mathf.Clamp01(look.BeardGrey);
                    block.SetColor(BeardColourId, beard);
                    // the scalp in the hair's colour (shaved: the stubble; under a head of hair: its roots, from the hairline
                    // in), and the hairline as far back as the years have taken it
                    var scalp = Color.Lerp(Colour(Looks.HairPigment(look)), WhiteHair, Looks.HairWhite(look));
                    if (Looks.HairWhite(look) <= 0f) scalp = Colour(look.HairColour);
                    scalp.a = look.Hair == "buzz" ? 1f : 2f;   // (null: the base's own hair)
                    block.SetColor(ScalpColourId, scalp);
                    block.SetFloat(BaldId, Mathf.Clamp01(look.Bald));
                    // the brows drawn in their style and colour (always there, whatever the skin's tone)
                    var brow = Looks.BrowOf(look);
                    block.SetVector(Brow0Id, new Vector4(brow.X0, brow.X1, brow.YHead, brow.YTail));
                    block.SetVector(Brow1Id, new Vector4(brow.YPeak, brow.PeakT, brow.WHead, brow.WTail));
                    var bc = Colour(Looks.BrowRgb(look));
                    bc.a = brow.Density;
                    block.SetColor(BrowColourId, bc);
                    // facial contrast by sex and years (R4): the lash lines, the lips' red and dark
                    var c = Looks.Contrast(look);
                    block.SetVector(ContrastId, new Vector4(c.Up, c.Low, c.Red, c.Dark));
                    r.SetPropertyBlock(block);
                }
                else if (r.name.StartsWith("Eyes_") && m.HasProperty(RecolourId))
                {
                    r.GetPropertyBlock(block);
                    block.SetColor(RecolourId, Colour(Looks.EyeRgb(look.Eyes)));
                    block.SetFloat(EyeYearsId, Looks.EyeYears(look));
                    var ew = Looks.EyeWhite(look);
                    block.SetVector(EyeWhiteId, new Vector4(ew.R, ew.G, ew.B, 1f));   // (a multiplier: no colour-space conversion)
                    r.SetPropertyBlock(block);
                }
            }
        }
    }
}
