using System;
using System.Collections.Generic;
using SecondFace.Core.Input;
using SecondFace.Game.UI;
using UnityEngine;
using UnityEngine.InputSystem;

namespace SecondFace.Game.Play
{
    /// <summary>
    /// The touch controls (BUILD_PLAN §6.F.2, step 25): the fingers on the screen each frame go through Core
    /// <see cref="Gestures"/>; one finger drags the camera round (<see cref="OrbitRig.Orbit"/>), a tap on the ground sends
    /// the walker there and a tap on a person or thing (<see cref="Interactable"/>) is <see cref="Tapped"/> (the radial
    /// opens there), a double tap on the walker brings the camera back to them, two fingers pinch the distance and
    /// pan the view over the ground. A touch that begins on the interface (<see cref="UIService.Covers"/>) or the debug
    /// overlay is theirs. With a mouse (the editor,
    /// a desktop): the left button is a finger, the wheel zooms, the right button pans.
    /// </summary>
    public sealed class TouchInput : MonoBehaviour
    {
        public OrbitRig Rig;
        public Walker Walker;
        public Camera Camera;
        /// <summary>How near a tap must fall to the walker on screen to be a tap on them, pixels.</summary>
        public float OnWalkerPixels = 70f;
        /// <summary>Gestures move the camera only: a tap neither walks nor opens anything (photo mode, P5.3l).</summary>
        public bool CameraOnly;

        public Gestures Gestures { get; } = new();
        /// <summary>A tap landed on a person or thing: it and the screen point (pixels, origin bottom-left). With no
        /// listener the tap walks there as on the ground.</summary>
        public event Action<Interactable, Vector2> Tapped;
        /// <summary>The last point a tap sent the walker to (tests read it).</summary>
        public Vector3? LastTap { get; private set; }

        private readonly List<Finger> _down = new();
        private readonly HashSet<int> _ignored = new();
        private bool _wasDragging, _mouseIgnored;
        private Vector2? _rightLast;

        private void Update()
        {
            if (Rig == null || Camera == null) return;
            _down.Clear();
            var screen = Touchscreen.current;
            if (screen != null)
                foreach (var t in screen.touches)
                {
                    var id = t.touchId.ReadValue();
                    if (!t.press.isPressed) { _ignored.Remove(id); continue; }
                    var p = t.position.ReadValue();
                    if (t.press.wasPressedThisFrame && Covered(p)) _ignored.Add(id);
                    if (_ignored.Contains(id)) continue;
                    _down.Add(new Finger(id, p.x, p.y));
                }
            var mouse = Mouse.current;
            if (_down.Count == 0 && mouse != null)
            {
                var p = mouse.position.ReadValue();
                if (mouse.leftButton.wasPressedThisFrame) _mouseIgnored = Covered(p);
                if (mouse.leftButton.isPressed && !_mouseIgnored) _down.Add(new Finger(-1, p.x, p.y));
                var scroll = mouse.scroll.ReadValue().y;
                if (Mathf.Abs(scroll) > 0.01f) Rig.Zoom(Mathf.Exp(scroll * 0.0015f));
                if (mouse.rightButton.isPressed)
                {
                    if (_rightLast is { } last) PanScreen(last, p);
                    _rightLast = p;
                }
                else _rightLast = null;
            }
            Gestures.Update(Time.unscaledTime, _down);
            Apply();
        }

        /// <summary>Whether a finger coming down here belongs to the interface or the debug overlay.</summary>
        private static bool Covered(Vector2 p) =>
            (UIService.Instance != null && UIService.Instance.Covers(p)) || (DebugOverlay.Instance != null && DebugOverlay.Instance.Covers(p));

        private void Apply()
        {
            var g = Gestures;
            if (g.Dragging) Rig.Orbit(g.DragX, g.DragY, Time.unscaledDeltaTime);
            else if (_wasDragging) Rig.Release();
            _wasDragging = g.Dragging;
            if (_down.Count >= 2)
            {
                var c = new Vector2((_down[0].X + _down[1].X) / 2, (_down[0].Y + _down[1].Y) / 2);
                if (!Mathf.Approximately(g.Pinch, 1f)) Rig.Zoom(g.Pinch);
                if (g.PanX != 0 || g.PanY != 0) PanScreen(c - new Vector2(g.PanX, g.PanY), c);
            }
            if (g.DoubleTap is { } d)
            {
                if (CameraOnly || OnWalker(d.x, d.y)) Rig.Recentre(); else Send(d.x, d.y);
            }
            if (g.Tap is { } t && !CameraOnly) Tap(new Vector2(t.x, t.y));
        }

        /// <summary>A tap: on a person or thing it is theirs (<see cref="Tapped"/>), on the ground the walker goes there.</summary>
        public void Tap(Vector2 screen)
        {
            var it = Tapped != null ? Interactable.Under(Camera, screen, Walker != null ? Walker.transform : null) : null;
            if (it != null) Tapped(it, screen);
            else Send(screen.x, screen.y);
        }

        /// <summary>The ground under two screen points: the view moves so the ground under the fingers stays there.</summary>
        private void PanScreen(Vector2 from, Vector2 to)
        {
            var plane = new Plane(Vector3.up, Rig.Target.position);
            var a = Camera.ScreenPointToRay(from); var b = Camera.ScreenPointToRay(to);
            if (!plane.Raycast(a, out var ea) || !plane.Raycast(b, out var eb)) return;
            Rig.PanBy(a.GetPoint(ea) - b.GetPoint(eb));
        }

        private bool OnWalker(float x, float y)
        {
            if (Walker == null) return false;
            var s = Camera.WorldToScreenPoint(Walker.transform.position + Vector3.up * 1.0f);
            return s.z > 0 && Vector2.Distance(new Vector2(s.x, s.y), new Vector2(x, y)) <= OnWalkerPixels;
        }

        /// <summary>A tap on the ground: the walker goes to the walkable point nearest where the ray meets the ground.</summary>
        public bool Send(float x, float y)
        {
            if (Walker == null) return false;
            var ray = Camera.ScreenPointToRay(new Vector3(x, y, 0));
            Vector3 point;
            if (Physics.Raycast(ray, out var hit, 2000f, ~0, QueryTriggerInteraction.Ignore)) point = hit.point;
            else
            {
                var plane = new Plane(Vector3.up, Walker.transform.position);
                if (!plane.Raycast(ray, out var e)) return false;
                point = ray.GetPoint(e);
            }
            LastTap = point;
            return Walker.GoTo(point);
        }
    }
}
