using UnityEngine;
using UnityEngine.TextCore.Text;
using UnityEngine.UIElements;

namespace SecondFace.Game.UI
{
    /// <summary>
    /// What the interface needs (BUILD_PLAN §4.2, P5 step 3), built by Second Face/Build UI assets and held by the Boot
    /// scene's <see cref="Bootstrap"/>: the panel settings (the theme, the scale to the screen) and the typefaces as
    /// static SDF font assets (Barlow for the interface, Literata for the notebook; the theme names them, code that
    /// measures text reads them here).
    /// </summary>
    [CreateAssetMenu(menuName = "Second Face/UI assets")]
    public sealed class UIAssets : ScriptableObject
    {
        public PanelSettings Panel;
        /// <summary>The interface face (Barlow Regular) and its strong cut (SemiBold).</summary>
        public FontAsset Interface, InterfaceStrong;
        /// <summary>The notebook's book face (Literata 12 pt Regular), its italic and its heading cut (36 pt SemiBold).</summary>
        public FontAsset Book, BookItalic, BookHeading;
        /// <summary>The world map's sheet (MapBake).</summary>
        public Texture2D WorldMap;

        public bool Complete => Panel != null && Panel.themeStyleSheet != null && Interface != null && InterfaceStrong != null
                                && Book != null && BookItalic != null && BookHeading != null;
    }
}
