using System.Collections.Generic;
using System.Text;
using Unity.Profiling;
using UnityEngine;
using UnityEngine.InputSystem;

namespace SecondFace.Game
{
    /// <summary>
    /// The measuring overlay (BUILD_PLAN §7.4, step 23): a three-finger tap (F3 on a keyboard) shows or hides, in the
    /// top-left corner, the frame (mean and worst over the last two seconds), the CPU's main and render threads and the
    /// GPU (FrameTimingManager; "n/a" where the phone's driver gives none), draw calls, batches, set-pass calls,
    /// triangles and vertices, memory, what the world has loaded (<see cref="World"/>), the rendering tier and the
    /// device, and the measuring tour's table (<see cref="Report"/>). The counters are the last frame's; the overlay's
    /// own IMGUI draws add a few calls while it shows. In development builds (and the editor) it starts shown; in
    /// others it waits for the gesture. It stays in every build until release hardening (P13) takes it out.
    /// </summary>
    public sealed class DebugOverlay : MonoBehaviour
    {
        public static DebugOverlay Instance { get; private set; }
        public bool Visible;
        /// <summary>Lines about the world (chunks, props, places), refreshed with the rest.</summary>
        public System.Func<string> World;
        /// <summary>Lines from the measuring tour (its views' means and worst frames).</summary>
        public System.Func<string> Report;
        /// <summary>A button under the text (the walkabout's "tour" / "walk" switch) and its label; none when null.</summary>
        public System.Action Button;
        public System.Func<string> ButtonLabel;
        public float RefreshSeconds = 0.5f;

        /// <summary>The text shown, refreshed every <see cref="RefreshSeconds"/> (tests read it).</summary>
        public string Text { get; private set; } = "";

        private ProfilerRecorder _draws, _batches, _setPass, _tris, _verts, _used, _gc, _gfx, _main;
        private readonly FrameTiming[] _timing = new FrameTiming[1];
        private readonly Queue<(float t, float ms)> _frames = new();
        private float _since;
        private bool _three;
        private GUIStyle _style, _buttonStyle;
        private Rect _box, _button;   // where they were drawn (IMGUI space: y down)
        private readonly StringBuilder _sb = new();

        public static DebugOverlay Ensure()
        {
            if (Instance != null) return Instance;
            var go = new GameObject("DebugOverlay");
            DontDestroyOnLoad(go);
            Instance = go.AddComponent<DebugOverlay>();
            Instance.Visible = Debug.isDebugBuild;
            return Instance;
        }

        private void OnEnable()
        {
            _draws = ProfilerRecorder.StartNew(ProfilerCategory.Render, "Draw Calls Count");
            _batches = ProfilerRecorder.StartNew(ProfilerCategory.Render, "Batches Count");
            _setPass = ProfilerRecorder.StartNew(ProfilerCategory.Render, "SetPass Calls Count");
            _tris = ProfilerRecorder.StartNew(ProfilerCategory.Render, "Triangles Count");
            _verts = ProfilerRecorder.StartNew(ProfilerCategory.Render, "Vertices Count");
            _used = ProfilerRecorder.StartNew(ProfilerCategory.Memory, "System Used Memory");
            _gc = ProfilerRecorder.StartNew(ProfilerCategory.Memory, "GC Reserved Memory");
            _gfx = ProfilerRecorder.StartNew(ProfilerCategory.Memory, "Gfx Used Memory");
            _main = ProfilerRecorder.StartNew(ProfilerCategory.Internal, "Main Thread", 15);
        }

        private void OnDisable()
        {
            _draws.Dispose(); _batches.Dispose(); _setPass.Dispose(); _tris.Dispose(); _verts.Dispose();
            _used.Dispose(); _gc.Dispose(); _gfx.Dispose(); _main.Dispose();
        }

        private void OnDestroy() { if (Instance == this) Instance = null; }

        private void Update()
        {
            Gesture();
            var now = Time.unscaledTime;
            _frames.Enqueue((now, Time.unscaledDeltaTime * 1000f));
            while (_frames.Count > 0 && now - _frames.Peek().t > 2f) _frames.Dequeue();
            FrameTimingManager.CaptureFrameTimings();
            _since += Time.unscaledDeltaTime;
            if (_since < RefreshSeconds) return;
            _since = 0;
            Text = Compose();
        }

        /// <summary>Three fingers down together (or F3) toggles; held fingers do not toggle again until lifted.</summary>
        private void Gesture()
        {
            if (Keyboard.current != null && Keyboard.current.f3Key.wasPressedThisFrame) Visible = !Visible;
            var screen = Touchscreen.current;
            if (screen == null) return;
            var down = 0;
            foreach (var t in screen.touches) if (t.press.isPressed) down++;
            if (down >= 3 && !_three) { _three = true; Visible = !Visible; }
            else if (down == 0) _three = false;
        }

        private static string Ms(double v) => v > 0 ? $"{v:0.0}" : "n/a";
        private static string Count(ProfilerRecorder r) => r.Valid ? Thousands(r.LastValue) : "n/a";
        private static string Mb(ProfilerRecorder r) => r.Valid ? $"{r.LastValue / (1024 * 1024)} MB" : "n/a";
        private static string Thousands(long v) => v >= 10000 ? $"{v / 1000} K" : v.ToString();

        private string Compose()
        {
            float sum = 0, worst = 0;
            foreach (var (_, ms) in _frames) { sum += ms; worst = Mathf.Max(worst, ms); }
            var mean = _frames.Count > 0 ? sum / _frames.Count : 0;
            double cpu = 0, render = 0, gpu = 0;
            if (FrameTimingManager.GetLatestTimings(1, _timing) > 0)
            {
                cpu = _timing[0].cpuMainThreadFrameTime; render = _timing[0].cpuRenderThreadFrameTime; gpu = _timing[0].gpuFrameTime;
            }
            if (cpu <= 0 && _main.Valid) cpu = _main.LastValue * 1e-6;
            _sb.Clear();
            _sb.Append($"frame {mean:0.0} ms ({(mean > 0 ? 1000f / mean : 0):0} fps) · worst 2 s {worst:0.0} ms\n");
            _sb.Append($"CPU main {Ms(cpu)} · render {Ms(render)} · GPU {Ms(gpu)} ms\n");
            _sb.Append($"draws {Count(_draws)} · batches {Count(_batches)} · setpass {Count(_setPass)} · tris {Count(_tris)} · verts {Count(_verts)}\n");
            _sb.Append($"memory {Mb(_used)} · GC {Mb(_gc)} · gfx {Mb(_gfx)}\n");
            var world = World?.Invoke();
            if (!string.IsNullOrEmpty(world)) _sb.Append(world).Append('\n');
            _sb.Append($"tier {QualitySettings.names[QualitySettings.GetQualityLevel()]} · {SystemInfo.graphicsDeviceType} · {Screen.width}×{Screen.height}{(Debug.isDebugBuild ? " · development" : "")}\n");
            _sb.Append($"{SystemInfo.deviceModel} · {SystemInfo.graphicsDeviceName} · {SystemInfo.systemMemorySize} MB");
            var report = Report?.Invoke();
            if (!string.IsNullOrEmpty(report)) _sb.Append('\n').Append(report);
            return _sb.ToString();
        }

        private void OnGUI()
        {
            if (!Visible || string.IsNullOrEmpty(Text)) return;
            _style ??= new GUIStyle(GUI.skin.box)
            {
                fontSize = Mathf.Max(12, Mathf.RoundToInt(Screen.height * 0.022f)),
                alignment = TextAnchor.UpperLeft,
                wordWrap = false,
                padding = new RectOffset(12, 12, 8, 8),
                richText = false,
            };
            _style.normal.textColor = new Color(0.95f, 0.92f, 0.82f);
            var size = _style.CalcSize(new GUIContent(Text));
            var inset = Mathf.Max(16f, Screen.safeArea.x + 8f);
            _box = new Rect(inset, Mathf.Max(8f, Screen.height - Screen.safeArea.yMax + 8f), size.x, size.y);
            GUI.Box(_box, Text, _style);
            _button = Rect.zero;
            if (Button == null) return;
            _buttonStyle ??= new GUIStyle(GUI.skin.button) { fontSize = _style.fontSize, padding = new RectOffset(24, 24, 12, 12) };
            var label = ButtonLabel?.Invoke() ?? "…";
            var bs = _buttonStyle.CalcSize(new GUIContent(label));
            _button = new Rect(_box.x, _box.yMax + 8f, Mathf.Max(bs.x, 160f), bs.y);
            if (GUI.Button(_button, label, _buttonStyle)) Button();
        }

        /// <summary>Whether a screen point (the Input System's: y up) falls on the overlay while it shows.</summary>
        public bool Covers(Vector2 screen)
        {
            if (!Visible) return false;
            var p = new Vector2(screen.x, Screen.height - screen.y);
            return _box.Contains(p) || _button.Contains(p);
        }
    }
}
