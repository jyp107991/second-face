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
                // the years in the skin (the aged bake blended in from the late twenties, most of the way by seventy)
                var years = 24f + 46f * (look.Shape != null && look.Shape.TryGetValue("body-age", out var ba) ? ba : 0f);
                face.SkinAge = Mathf.Pow(Mathf.Clamp01((years - 28f) / 44f), 1.2f) * 0.85f;
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
                    // a beard only on a man's body, in the hair's colour a shade darker
                    block.SetFloat(BeardId, look.Body == "m" ? System.Array.IndexOf(Looks.Beards, look.Beard) : -1);
                    block.SetColor(BeardColourId, Colour(look.HairColour) * 0.8f);
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
