using UnityEngine.UIElements;

namespace SecondFace.Game.UI
{
    /// <summary>The layers a screen opens in, bottom to top (under both is <see cref="UIService.Hud"/>).</summary>
    public enum UILayer
    {
        /// <summary>Screens: the notebook, the map, the pack, a conversation.</summary>
        Screens,
        /// <summary>A question that must be answered before anything else (a confirmation, a choice).</summary>
        Modal,
    }

    /// <summary>
    /// One screen on <see cref="UIService"/>'s stack (BUILD_PLAN §4.2, P5 step 3). A screen builds its own elements once
    /// when opened (<see cref="Build"/>), from code or a template, and is told when it is shown, covered and closed. A
    /// screen that is <see cref="Opaque"/> hides the screens and the HUD under it (nothing under it is drawn); one that
    /// <see cref="PassesTouches"/> lets a touch on its empty parts reach the world (the camera keeps turning under a
    /// conversation), otherwise the world gets no touches while it is open. Elements carrying <see cref="UIService.SafeClass"/>
    /// are kept inside the screen's safe area (notches, rounded corners, the gesture bar) by padding.
    /// </summary>
    public abstract class UIScreen
    {
        public UIService UI { get; internal set; }
        /// <summary>The screen's root element (null until opened).</summary>
        public VisualElement Root { get; internal set; }
        public bool IsOpen => UI != null && Root != null && Root.parent != null;

        public virtual UILayer Layer => UILayer.Screens;
        /// <summary>Whether it covers the whole screen (what is under it is not drawn).</summary>
        public virtual bool Opaque => true;
        /// <summary>Whether a touch on its empty parts goes through to the world.</summary>
        public virtual bool PassesTouches => false;

        /// <summary>Builds the screen's elements (called once, on opening).</summary>
        protected internal abstract VisualElement Build();
        /// <summary>It has opened (its elements are in the panel).</summary>
        protected internal virtual void Shown() { }
        /// <summary>It has closed (its elements are out of the panel).</summary>
        protected internal virtual void Hidden() { }
        /// <summary>The back gesture (Android back, Escape, the pad's east button) while it is on top: true closes it.</summary>
        protected internal virtual bool Back() => true;

        /// <summary>Closes this screen (and any opened over it).</summary>
        public void Close() => UI?.Close(this);
    }
}
