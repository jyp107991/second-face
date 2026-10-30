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
        private static readonly int ToneId = Shader.PropertyToID("_Tone");
        private static readonly int UndertoneId = Shader.PropertyToID("_Undertone");
        private static readonly int FrecklesId = Shader.PropertyToID("_Freckles");
        private static readonly int ScarId = Shader.PropertyToID("_Scar");
        private static readonly int TattooId = Shader.PropertyToID("_Tattoo");
        private static readonly int RecolourId = Shader.PropertyToID("_Recolour");
        private static readonly int BeardId = Shader.PropertyToID("_Beard");
        private static readonly int BeardColourId = Shader.PropertyToID("_BeardColour");
        private static readonly int ScalpColourId = Shader.PropertyToID("_ScalpColour");
        private static readonly int BaldId = Shader.PropertyToID("_Bald");
        private static readonly int Brow0Id = Shader.PropertyToID("_Brow0");
        private static readonly int Brow1Id = Shader.PropertyToID("_Brow1");
        private static readonly int BrowColourId = Shader.PropertyToID("_BrowColour");

        /// <summary>The body's scale: a stature against the base's own (<see cref="Bodies"/>), else the look's height (±6 %).</summary>
        public static float Scale(PlayerLook look) => look.Stature > 0f
            ? Mathf.Clamp(look.Stature / (float)(look.Body == "m" ? Bodies.BaseMan : Bodies.BaseWoman), 0.8f, 1.2f)
            : 1f + 0.06f * Mathf.Clamp(look.Height, -1f, 1f);

        /// <summary>A content colour (0xRRGGBB) as a colour.</summary>
        public static Color Colour(int rgb) => new(((rgb >> 16) & 255) / 255f, ((rgb >> 8) & 255) / 255f, (rgb & 255) / 255f, 1f);

        public static void Apply(GameObject body, PlayerLook look)
        {
            if (body == null || look == null) return;
            var wardrobe = body.GetComponentInChildren<Wardrobe>();
            if (wardrobe != null) wardrobe.Hair(look.Hair == Looks.OwnHair(look.Body) ? null : look.Hair);
            var face = body.GetComponentInChildren<FaceSculpt>();
            if (face != null)
            {
                face.HairColour = Colour(look.HairColour);
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
                if (r.name.StartsWith("Body_") && m.HasProperty(ToneId))
                {
                    r.GetPropertyBlock(block);
                    block.SetFloat(ToneId, Mathf.Clamp(look.Skin, -1f, 1f));
                    block.SetFloat(UndertoneId, Mathf.Clamp(look.Undertone, -1f, 1f));
                    block.SetFloat(FrecklesId, Mathf.Clamp01(look.Freckles));
                    block.SetFloat(ScarId, scar);
                    block.SetFloat(TattooId, tattoo);
                    // a beard only on a man's body, in its own colour (greying first; red under brown hair) or the hair's darker
                    block.SetFloat(BeardId, look.Body == "m" ? System.Array.IndexOf(Looks.Beards, look.Beard) : -1);
                    // its pigmented hairs' colour, and in alpha the share gone white (salt and pepper, P4.15b)
                    var beard = Colour(Looks.BeardPigment(look));
                    beard.a = Mathf.Clamp01(look.BeardGrey);
                    block.SetColor(BeardColourId, beard);
                    // the shaved scalp in the hair's colour, and the hairline as far back as the years have taken it
                    var scalp = Colour(look.HairColour);
                    scalp.a = 1f;
                    block.SetColor(ScalpColourId, scalp);
                    block.SetFloat(BaldId, Mathf.Clamp01(look.Bald));
                    // the brows drawn in their style and colour (always there, whatever the skin's tone)
                    var brow = Looks.BrowOf(look);
                    block.SetVector(Brow0Id, new Vector4(brow.X0, brow.X1, brow.YHead, brow.YTail));
                    block.SetVector(Brow1Id, new Vector4(brow.YPeak, brow.PeakT, brow.WHead, brow.WTail));
                    var bc = Colour(Looks.BrowRgb(look));
                    bc.a = brow.Density;
                    block.SetColor(BrowColourId, bc);
                    r.SetPropertyBlock(block);
                }
                else if (r.name.StartsWith("Eyes_") && m.HasProperty(RecolourId))
                {
                    r.GetPropertyBlock(block);
                    block.SetColor(RecolourId, Colour(Looks.EyeRgb(look.Eyes)));
                    r.SetPropertyBlock(block);
                }
            }
        }
    }
}
