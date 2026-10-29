using System;
using System.Collections.Generic;

namespace SecondFace.Core.Input
{
    /// <summary>One finger on the screen this frame: its id and position in pixels.</summary>
    public readonly struct Finger
    {
        public readonly int Id;
        public readonly float X, Y;
        public Finger(int id, float x, float y) { Id = id; X = x; Y = y; }
    }

    /// <summary>
    /// The touch gestures (BUILD_PLAN §6.F.2), pure so they can be tested without a screen: fed every frame with the
    /// time and the fingers down, it reports what they did this frame. One finger moved past <see cref="MovePixels"/>
    /// drags (<see cref="DragX"/>, <see cref="DragY"/>: the camera's orbit); one finger lifted within
    /// <see cref="TapSeconds"/> without moving taps (a second tap near the first within <see cref="DoubleTapSeconds"/>
    /// is a <see cref="DoubleTap"/> instead); one finger held still past <see cref="LongPressSeconds"/> long-presses
    /// (once). Two fingers pinch (<see cref="Pinch"/>, the ratio of their spread to the last frame's) and pan
    /// (<see cref="PanX"/>, <see cref="PanY"/>: the centroid's move); a touch that ever had two fingers never taps.
    /// Three or more fingers are left to the debug overlay.
    /// </summary>
    public sealed class Gestures
    {
        public const float MovePixels = 12f, TapSeconds = 0.22f, LongPressSeconds = 0.45f, DoubleTapSeconds = 0.3f, DoubleTapPixels = 40f;

        // this frame's results
        public float DragX { get; private set; }
        public float DragY { get; private set; }
        public float Pinch { get; private set; } = 1f;
        public float PanX { get; private set; }
        public float PanY { get; private set; }
        public (float x, float y)? Tap { get; private set; }
        public (float x, float y)? DoubleTap { get; private set; }
        public (float x, float y)? LongPress { get; private set; }
        /// <summary>A one-finger drag is under way (the camera's orbit owns the touch).</summary>
        public bool Dragging { get; private set; }

        private int _id = -1;
        private float _startX, _startY, _lastX, _lastY, _startTime;
        private bool _moved, _multi, _pressed;
        private float _spread, _cx, _cy;
        private int _lastCount;
        private float _tapTime = -10f, _tapX, _tapY;

        public void Update(float time, IReadOnlyList<Finger> down)
        {
            DragX = DragY = PanX = PanY = 0; Pinch = 1f;
            Tap = DoubleTap = LongPress = null;
            var n = down.Count;
            if (n == 0)
            {
                if (_lastCount == 1 && _id >= 0 && !_moved && !_multi && !_pressed && time - _startTime <= TapSeconds) Release(time);
                _id = -1; _moved = _multi = _pressed = false; Dragging = false;
            }
            else if (n == 1)
            {
                var f = down[0];
                if (_id != f.Id)
                {
                    // a new touch (or one finger left of two: it continues without tapping)
                    if (_lastCount == 0) { _multi = false; _moved = false; _pressed = false; _startTime = time; _startX = f.X; _startY = f.Y; }
                    _id = f.Id; _lastX = f.X; _lastY = f.Y;
                }
                if (!_moved && Dist(f.X - _startX, f.Y - _startY) > MovePixels) _moved = true;
                if (_moved && !_multi)
                {
                    Dragging = true;
                    DragX = f.X - _lastX; DragY = f.Y - _lastY;
                }
                if (!_moved && !_multi && !_pressed && time - _startTime >= LongPressSeconds) { _pressed = true; LongPress = (f.X, f.Y); }
                _lastX = f.X; _lastY = f.Y;
            }
            else
            {
                _multi = true; Dragging = false; _id = -1;
                float cx = 0, cy = 0;
                for (var i = 0; i < 2; i++) { cx += down[i].X / 2; cy += down[i].Y / 2; }
                var spread = Dist(down[0].X - down[1].X, down[0].Y - down[1].Y);
                if (_lastCount >= 2 && n == 2 && _spread > 1f)
                {
                    Pinch = spread / _spread;
                    PanX = cx - _cx; PanY = cy - _cy;
                }
                _spread = spread; _cx = cx; _cy = cy;
            }
            _lastCount = n;
        }

        private void Release(float time)
        {
            if (time - _tapTime <= DoubleTapSeconds && Dist(_lastX - _tapX, _lastY - _tapY) <= DoubleTapPixels)
            {
                DoubleTap = (_lastX, _lastY);
                _tapTime = -10f;
                return;
            }
            Tap = (_lastX, _lastY);
            _tapTime = time; _tapX = _lastX; _tapY = _lastY;
        }

        private static float Dist(float dx, float dy) => (float)Math.Sqrt(dx * dx + dy * dy);
    }
}
