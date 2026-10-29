using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UIElements;

namespace SecondFace.Game.UI
{
    /// <summary>
    /// The interface's root (BUILD_PLAN §4.2, P5 step 3): one UI Toolkit panel over the game, drawn from
    /// <see cref="UIAssets.Panel"/> (the theme; scaled with the screen's height from a 1280×720 reference, so a 6.1″
    /// phone and a tablet show the same layout), in three layers: the <see cref="Hud"/>, the screens and the modal
    /// questions. Screens open on a stack (<see cref="Open{T}"/>, <see cref="Close"/>, <see cref="Back"/>); an opaque
    /// screen hides what is under it, HUD included. The safe area (notch, rounded corners, gesture bar) is kept by
    /// padding every element that carries <see cref="SafeClass"/>, again whenever it changes (rotation, a fold).
    /// <see cref="Covers"/> tells the touch controls whether a finger came down on the interface rather than the world.
    /// The back gesture (Android back, Escape, the pad's east button) goes to the top screen.
    /// For captures the panel draws into a texture instead (<see cref="Create"/> with a target; BUILD_PLAN §8: a camera
    /// render does not include UI Toolkit).
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class UIService : MonoBehaviour
    {
        /// <summary>The class of elements kept inside the safe area: their padding is the safe-area insets. Padding does
        /// not move absolutely placed children (they sit against the padding edge), so those go in a child that fills it.</summary>
        public const string SafeClass = "sf-safe";

        public static UIService Instance { get; private set; }

        public UIAssets Assets { get; private set; }
        public UIDocument Document { get; private set; }
        /// <summary>This panel's settings (a copy of the asset's, so a capture's target texture never touches the asset).</summary>
        public PanelSettings Panel { get; private set; }
        public VisualElement Root { get; private set; }
        /// <summary>The layer under the screens for the controls that stay over the world.</summary>
        public VisualElement Hud { get; private set; }
        /// <summary>The safe-area insets in panel units: left, top, right, bottom.</summary>
        public Vector4 Insets { get; private set; }
        public event Action<Vector4> InsetsChanged;
        public event Action StackChanged;

        /// <summary>A safe area to use instead of the screen's (normalised, origin bottom-left, as Screen.safeArea): tests
        /// and the notch preview.</summary>
        public Rect? SafeAreaOverride
        {
            get => _override;
            set { _override = value; _insetsDirty = true; }
        }

        private readonly List<UIScreen> _stack = new();
        private VisualElement _screens, _modal;
        private Rect? _override;
        private Rect _area = new(0, 0, 1, 1);
        private bool _insetsDirty = true;

        public IReadOnlyList<UIScreen> Stack => _stack;
        public UIScreen Top => _stack.Count > 0 ? _stack[^1] : null;

        /// <summary>Makes the interface: under <paramref name="parent"/> if given, drawing into <paramref name="target"/>
        /// instead of the screen if given (cleared to transparent each frame).</summary>
        public static UIService Create(UIAssets assets, Transform parent = null, RenderTexture target = null)
        {
            if (assets == null || assets.Panel == null) throw new ArgumentException("UIService needs the UI assets (Second Face/Build UI assets)");
            var go = new GameObject(target != null ? "UI (texture)" : "UI");
            go.SetActive(false);
            if (parent != null) go.transform.SetParent(parent, false);
            var ui = go.AddComponent<UIService>();
            ui.Assets = assets;
            ui.Panel = Instantiate(assets.Panel);
            ui.Panel.name = assets.Panel.name;
            if (target != null)
            {
                ui.Panel.targetTexture = target;
                ui.Panel.clearColor = true;
                ui.Panel.colorClearValue = Color.clear;
            }
            ui.Document = go.AddComponent<UIDocument>();
            ui.Document.panelSettings = ui.Panel;
            go.SetActive(true);
            ui.Build();
            return ui;
        }

        private void Awake()
        {
            if (Instance == null) Instance = this;
        }

        private void OnDestroy()
        {
            if (Instance == this) Instance = null;
            if (Panel != null) Destroy(Panel);
        }

        private void Build()
        {
            Root = Document.rootVisualElement;
            Root.pickingMode = PickingMode.Ignore;
            Root.AddToClassList("sf-root");
            Stretch(Root);
            Hud = Layer("hud");
            _screens = Layer("screens");
            _modal = Layer("modal");
            Root.RegisterCallback<GeometryChangedEvent>(_ => _insetsDirty = true);
        }

        private VisualElement Layer(string name)
        {
            var e = new VisualElement { name = name, pickingMode = PickingMode.Ignore };
            e.AddToClassList("sf-layer");
            Stretch(e);
            Root.Add(e);
            return e;
        }

        private static void Stretch(VisualElement e)
        {
            e.style.position = Position.Absolute;
            e.style.left = 0; e.style.top = 0; e.style.right = 0; e.style.bottom = 0;
        }

        private void Update()
        {
            if (Root == null) return;
            var area = _override ?? ScreenSafeArea();
            if (area != _area) { _area = area; _insetsDirty = true; }
            if (_insetsDirty) ApplyInsets();
            if (BackPressed()) Back();
        }

        private Rect ScreenSafeArea()
        {
            if (Panel.targetTexture != null || Screen.width <= 0 || Screen.height <= 0) return new Rect(0, 0, 1, 1);
            var s = Screen.safeArea;
            return new Rect(s.x / Screen.width, s.y / Screen.height, s.width / Screen.width, s.height / Screen.height);
        }

        /// <summary>Works the insets out from the safe area and the panel's size and pads the safe elements (once laid out).</summary>
        public void ApplyInsets()
        {
            var w = Root.layout.width;
            var h = Root.layout.height;
            if (float.IsNaN(w) || float.IsNaN(h) || w <= 0 || h <= 0) return;   // not laid out yet
            _insetsDirty = false;
            var a = _override ?? _area;
            var insets = new Vector4(a.xMin * w, (1f - a.yMax) * h, (1f - a.xMax) * w, a.yMin * h);
            if (insets == Insets) return;
            Insets = insets;
            Root.Query(className: SafeClass).ForEach(Pad);
            InsetsChanged?.Invoke(insets);
        }

        /// <summary>Pads an element by the safe-area insets (done for every <see cref="SafeClass"/> element on opening and
        /// on change; call it for one added later).</summary>
        public void Pad(VisualElement e)
        {
            e.style.paddingLeft = Insets.x;
            e.style.paddingTop = Insets.y;
            e.style.paddingRight = Insets.z;
            e.style.paddingBottom = Insets.w;
        }

        private static bool BackPressed()
        {
            // Android's back arrives as Escape
            var k = Keyboard.current;
            if (k != null && k.escapeKey.wasPressedThisFrame) return true;
            var g = Gamepad.current;
            return g != null && g.buttonEast.wasPressedThisFrame;
        }

        /// <summary>Opens a screen on top of the stack (built on its first opening).</summary>
        public T Open<T>(T screen) where T : UIScreen
        {
            if (screen == null) throw new ArgumentNullException(nameof(screen));
            if (_stack.Contains(screen)) return screen;
            screen.UI = this;
            screen.Root ??= screen.Build();
            var r = screen.Root;
            r.AddToClassList("sf-screen");
            Stretch(r);
            // a screen that passes touches leaves its empty parts unpickable; one that does not is a wall to the world
            r.pickingMode = screen.PassesTouches ? PickingMode.Ignore : PickingMode.Position;
            (screen.Layer == UILayer.Modal ? _modal : _screens).Add(r);
            r.Query(className: SafeClass).ForEach(Pad);
            _stack.Add(screen);
            Refresh();
            screen.Shown();
            StackChanged?.Invoke();
            return screen;
        }

        /// <summary>Closes a screen and every screen opened over it.</summary>
        public void Close(UIScreen screen)
        {
            var i = _stack.IndexOf(screen);
            if (i < 0) return;
            for (var k = _stack.Count - 1; k >= i; k--)
            {
                var s = _stack[k];
                _stack.RemoveAt(k);
                s.Root?.RemoveFromHierarchy();
                s.Hidden();
            }
            Refresh();
            StackChanged?.Invoke();
        }

        public void CloseAll()
        {
            if (_stack.Count > 0) Close(_stack[0]);
        }

        /// <summary>The back gesture: the top screen decides whether it closes. False when no screen is open.</summary>
        public bool Back()
        {
            var top = Top;
            if (top == null) return false;
            if (top.Back()) Close(top);
            return true;
        }

        /// <summary>Hides what an opaque screen covers (screens under it and the HUD): nothing hidden is drawn.</summary>
        private void Refresh()
        {
            var covered = false;
            for (var i = _stack.Count - 1; i >= 0; i--)
            {
                var s = _stack[i];
                s.Root.style.display = covered ? DisplayStyle.None : DisplayStyle.Flex;
                if (s.Opaque && s.Layer == UILayer.Screens) covered = true;
            }
            Hud.style.display = covered ? DisplayStyle.None : DisplayStyle.Flex;
        }

        /// <summary>Whether a finger at this screen position (pixels, origin bottom-left, as the Input System gives it)
        /// came down on the interface.</summary>
        public bool Covers(Vector2 screen)
        {
            var panel = Root?.panel;
            if (panel == null) return false;
            return CoversPanel(RuntimePanelUtils.ScreenToPanel(panel, new Vector2(screen.x, Screen.height - screen.y)));
        }

        /// <summary>Whether a point in panel units (origin top-left) is on the interface.</summary>
        public bool CoversPanel(Vector2 point)
        {
            var picked = Root?.panel?.Pick(point);
            if (picked == null) return false;
            for (var e = Root; e != null; e = e.parent) if (picked == e) return false;   // the root and the panel's own
            return true;
        }
    }
}
