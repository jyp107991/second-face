using System;
using SecondFace.Game.UI;
using UnityEngine;
using UnityEngine.InputSystem;

namespace SecondFace.Game.Play
{
    /// <summary>What the pad and the keys ask for in one frame (<see cref="PadInput.Read"/>; tests build their own).</summary>
    public struct PadFrame
    {
        /// <summary>Walk (left stick; WASD or the arrows): -1..1 each way.</summary>
        public Vector2 Move;
        /// <summary>Turn the camera (right stick).</summary>
        public Vector2 Look;
        /// <summary>Closer and further (the triggers; R and F), 0..1.</summary>
        public float ZoomIn, ZoomOut;
        /// <summary>Pressed this frame: turn the view 90° (the bumpers; Q and E), act on what is near (south; Space),
        /// the pack (north; I), the map (west; M), the notebook (view; Tab or J), the pause (start), photo mode (P),
        /// quicksave and quickload (F5, F9), the view back on the walker (right stick press; C), camp (the d-pad down; K).</summary>
        public bool TurnLeft, TurnRight, Act, Pack, Map, Notebook, Pause, Photo, QuickSave, QuickLoad, Recentre, Camp, Sneak;
    }

    /// <summary>
    /// The gamepad and the keyboard on the open world (P5.3l, BUILD_PLAN §6.F: right stick orbit, left stick move,
    /// triggers zoom, bumpers rotate 90°): the walker walks the way the stick points as the camera sees it (a jog at
    /// full tilt), the camera turns at the settings' speed, and the buttons open what the HUD's do. While a screen that
    /// keeps the world from touches is open the pad is the interface's (UI Toolkit's own navigation; the back button
    /// is <see cref="UIService"/>'s). In <see cref="CameraOnly"/> (photo mode) the left stick moves the view, not the walker.
    /// </summary>
    public sealed class PadInput : MonoBehaviour
    {
        public const float YawPerSecond = 150f, PitchPerSecond = 70f, ZoomPerSecond = 1.4f, PanPerSecond = 6f, Dead = 0.15f;

        public OrbitRig Rig;
        public Walker Walker;
        public Camera Camera;
        /// <summary>The sticks move the camera only (photo mode).</summary>
        public bool CameraOnly;
        /// <summary>Instead of the devices (tests): the frame to apply next, once.</summary>
        public PadFrame? Next;

        public event Action Act, Pack, Map, Notebook, Pause, Photo, QuickSave, QuickLoad, Camp, Sneak;

        /// <summary>The frame from the devices there are.</summary>
        public static PadFrame Read()
        {
            var f = new PadFrame();
            var g = Gamepad.current;
            if (g != null)
            {
                f.Move = g.leftStick.ReadValue();
                f.Look = g.rightStick.ReadValue();
                f.ZoomIn = g.rightTrigger.ReadValue();
                f.ZoomOut = g.leftTrigger.ReadValue();
                f.TurnLeft = g.leftShoulder.wasPressedThisFrame;
                f.TurnRight = g.rightShoulder.wasPressedThisFrame;
                f.Act = g.buttonSouth.wasPressedThisFrame;
                f.Pack = g.buttonNorth.wasPressedThisFrame;
                f.Map = g.buttonWest.wasPressedThisFrame;
                f.Notebook = g.selectButton.wasPressedThisFrame;
                f.Pause = g.startButton.wasPressedThisFrame;
                f.Recentre = g.rightStickButton.wasPressedThisFrame;
                f.Camp = g.dpad.down.wasPressedThisFrame;
                f.Sneak = g.leftStickButton.wasPressedThisFrame;
            }
            var k = Keyboard.current;
            if (k != null)
            {
                var x = (k.dKey.isPressed || k.rightArrowKey.isPressed ? 1f : 0f) - (k.aKey.isPressed || k.leftArrowKey.isPressed ? 1f : 0f);
                var y = (k.wKey.isPressed || k.upArrowKey.isPressed ? 1f : 0f) - (k.sKey.isPressed || k.downArrowKey.isPressed ? 1f : 0f);
                if (x != 0f || y != 0f) f.Move = new Vector2(x, y).normalized * (k.shiftKey.isPressed ? 1f : 0.8f);
                if (k.rKey.isPressed) f.ZoomIn = 1f;
                if (k.fKey.isPressed) f.ZoomOut = 1f;
                f.TurnLeft |= k.qKey.wasPressedThisFrame;
                f.TurnRight |= k.eKey.wasPressedThisFrame;
                f.Act |= k.spaceKey.wasPressedThisFrame;
                f.Pack |= k.iKey.wasPressedThisFrame;
                f.Map |= k.mKey.wasPressedThisFrame;
                f.Notebook |= k.tabKey.wasPressedThisFrame || k.jKey.wasPressedThisFrame;
                f.Photo |= k.pKey.wasPressedThisFrame;
                f.QuickSave |= k.f5Key.wasPressedThisFrame;
                f.QuickLoad |= k.f9Key.wasPressedThisFrame;
                f.Recentre |= k.cKey.wasPressedThisFrame;
                f.Camp |= k.kKey.wasPressedThisFrame;
                f.Sneak |= k.leftCtrlKey.wasPressedThisFrame || k.rightCtrlKey.wasPressedThisFrame;
            }
            return f;
        }

        private void Update()
        {
            var f = Next ?? Read();
            Next = null;
            Apply(f, Time.unscaledDeltaTime);
        }

        /// <summary>Whether the world has the pad now (no screen open that keeps it, or the photo mode's).</summary>
        public bool World
        {
            get
            {
                var top = UIService.Instance != null ? UIService.Instance.Top : null;
                return top == null || (CameraOnly && top.PassesTouches);
            }
        }

        public void Apply(PadFrame f, float dt)
        {
            if (f.Pause) Pause?.Invoke();   // also closes the pause: it is the pad's start button either way
            if (Rig == null) return;
            if (!World)
            {
                if (Walker != null && Walker.Steering) Walker.Steer(Vector3.zero, 0f);
                return;
            }
            if (f.Look.magnitude > Dead) Rig.Turn(f.Look.x * YawPerSecond * dt, -f.Look.y * PitchPerSecond * dt);
            var zoom = f.ZoomIn - f.ZoomOut;
            if (Mathf.Abs(zoom) > 0.05f) Rig.Zoom(Mathf.Exp(zoom * ZoomPerSecond * dt));
            if (f.TurnLeft) Rig.TurnTo(Rig.Yaw - 90f);
            if (f.TurnRight) Rig.TurnTo(Rig.Yaw + 90f);
            if (f.Recentre) Rig.Recentre();
            var cam = Camera != null ? Camera.transform : null;
            var amount = Mathf.Clamp01(f.Move.magnitude);
            var dir = Vector3.zero;
            if (cam != null && amount > Dead)
            {
                var fwd = cam.forward; fwd.y = 0f;
                var right = cam.right; right.y = 0f;
                dir = right.normalized * f.Move.x + fwd.normalized * f.Move.y;
            }
            if (CameraOnly) { if (dir != Vector3.zero) Rig.PanBy(dir.normalized * (PanPerSecond * amount * dt)); }
            else if (Walker != null) Walker.Steer(dir, amount);
            if (CameraOnly) return;
            if (f.Act) Act?.Invoke();
            if (f.Pack) Pack?.Invoke();
            if (f.Map) Map?.Invoke();
            if (f.Notebook) Notebook?.Invoke();
            if (f.Photo) Photo?.Invoke();
            if (f.QuickSave) QuickSave?.Invoke();
            if (f.QuickLoad) QuickLoad?.Invoke();
            if (f.Camp) Camp?.Invoke();
            if (f.Sneak) Sneak?.Invoke();
        }
    }
}
