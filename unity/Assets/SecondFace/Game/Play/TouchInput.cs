using System.Collections.Generic;
using SecondFace.Core.Input;
using UnityEngine;
using UnityEngine.InputSystem;

namespace SecondFace.Game.Play
{
    /// <summary>
    /// The touch controls (BUILD_PLAN §6.F.2, step 25): the fingers on the screen each frame go through Core
    /// <see cref="Gestures"/>; one finger drags the camera round (<see cref="OrbitRig.Orbit"/>), a tap on the ground sends
    /// the walker there, a double tap on the walker brings the camera back to them, two fingers pinch the distance and
    /// pan the view over the ground. A touch that begins on the debug overlay is the overlay's. With a mouse (the editor,
    /// a desktop): the left button is a finger, the wheel zooms, the right button pans.
    /// </summary>
    public sealed class TouchInput : MonoBehaviour
    {
        public OrbitRig Rig;
        public Walker Walker;
        public Camera Camera;
        /// <summary>How near a tap must fall to the walker on screen to be a tap on them, pixels.</summary>
        public float OnWalkerPixels = 70f;

        public Gestures Gestures { get; } = new();
        /// <summary>The last point a tap sent the walker to (tests read it).</summary>
        public Vector3? LastTap { get; private set; }

        private readonly List<Finger> _down = new();
        private readonly HashSet<int> _ignored = new();
        private bool _wasDragging;
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
                    if (t.press.wasPressedThisFrame && DebugOverlay.Instance != null && DebugOverlay.Instance.Covers(p)) _ignored.Add(id);
                    if (_ignored.Contains(id)) continue;
                    _down.Add(new Finger(id, p.x, p.y));
                }
            var mouse = Mouse.current;
            if (_down.Count == 0 && mouse != null)
            {
                var p = mouse.position.ReadValue();
                if (mouse.leftButton.isPressed && !(mouse.leftButton.wasPressedThisFrame && DebugOverlay.Instance != null && DebugOverlay.Instance.Covers(p)))
                    _down.Add(new Finger(-1, p.x, p.y));
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
                if (OnWalker(d.x, d.y)) Rig.Recentre(); else Send(d.x, d.y);
            }
            if (g.Tap is { } t) Send(t.x, t.y);
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
