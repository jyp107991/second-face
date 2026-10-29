using System.Collections;
using System.IO;
using SecondFace.Core.Content;
using SecondFace.Game.Play;
using SecondFace.Game.UI;
using SecondFace.Game.World;
using UnityEngine;
using UnityEngine.Networking;

namespace SecondFace.Game
{
    /// <summary>
    /// The one authored object in the Boot scene. Locks the app to landscape full screen, opens the interface
    /// (<see cref="UIService"/>), loads the content registries from StreamingAssets and hands over to the game. Until the
    /// game exists, it shows a title card with what loaded (<see cref="TitleCard"/>), then raises the world round Shale (<see cref="WorldStage"/>) and sets the player's stand-in down in
    /// it (<see cref="Walkabout"/>, step 25), with the <see cref="DebugOverlay"/> one three-finger tap away and on it a
    /// button that runs the measuring tour (<see cref="MeasureTour"/>, step 23) and walks again.
    /// </summary>
    public sealed class Bootstrap : MonoBehaviour
    {
        public static ContentDb Content { get; private set; }
        /// <summary>What the world needs (set in the Boot scene by Second Face/Wire the Boot scene).</summary>
        public WorldAssets World;
        /// <summary>What the interface needs (set in the Boot scene by Second Face/Wire the Boot scene).</summary>
        public UIAssets Interface;
        /// <summary>The interface (null when the Boot scene holds no UI assets: the title card is then drawn with IMGUI).</summary>
        public UIService UI { get; private set; }
        public WorldStage Stage { get; private set; }
        public Walkabout Walkabout { get; private set; }
        /// <summary>The measuring tour while it runs (null while walking).</summary>
        public MeasureTour Tour { get; private set; }
        private string _status = "LOADING…";
        private string _error;
        private TitleCard _card;

        private void Awake()
        {
            RenderTier.Apply();   // the rendering tier by graphics API, before anything renders
            Application.targetFrameRate = 60;
            Screen.sleepTimeout = SleepTimeout.NeverSleep;
            Screen.fullScreen = true;
            Screen.autorotateToPortrait = false;
            Screen.autorotateToPortraitUpsideDown = false;
            Screen.autorotateToLandscapeLeft = true;
            Screen.autorotateToLandscapeRight = true;
            Screen.orientation = ScreenOrientation.AutoRotation;
            DontDestroyOnLoad(gameObject);
            if (Interface != null && Interface.Panel != null)
            {
                UI = UIService.Create(Interface, transform);
                _card = UI.Open(new TitleCard());
                _card.Set("LOADING…");
            }
        }

        private IEnumerator Start()
        {
            var db = new ContentDb();
            foreach (var name in ContentDb.Registries)
            {
                var path = Path.Combine(Application.streamingAssetsPath, "content", name + ".json");
                string text = null;
                // On Android StreamingAssets live inside the APK: only UnityWebRequest can read them.
                if (path.Contains("://") || path.StartsWith("jar:"))
                {
                    using var req = UnityWebRequest.Get(path);
                    yield return req.SendWebRequest();
                    if (req.result != UnityWebRequest.Result.Success) { Fail($"{name}: {req.error}"); yield break; }
                    text = req.downloadHandler.text;
                }
                else
                {
                    if (!File.Exists(path)) { Fail($"{name}: missing"); yield break; }
                    text = File.ReadAllText(path);
                }
                db.Load(name, text);
                _status = $"LOADING… {name}";
                _card?.Set(_status);
            }
            Content = db;
            var loaded = $"{db.Count("maps")} places · {db.Count("npcs")} people · {db.Count("dialogues")} conversations · {db.Count("quests")} quests · {db.Count("items")} items\n{Screen.width}×{Screen.height} {SystemInfo.graphicsDeviceType} · {SystemInfo.deviceModel}";
            _status = "THE SECOND FACE\n" + loaded;
            _card?.Set("RAISING THE WORLD…", loaded);
            var overlay = DebugOverlay.Ensure();
            if (World == null) yield break;
            Stage = gameObject.AddComponent<WorldStage>();
            Stage.Assets = World;
            Stage.Camera = Camera.main;
            Walkabout = gameObject.AddComponent<Walkabout>();
            Walkabout.Stage = Stage;
            overlay.World = () => Tour != null ? Tour.WorldLine() : Walkabout.Line();
            overlay.Report = () => _lastTour;
            overlay.ButtonLabel = () => Tour != null ? "walk" : "measure (tour)";
            overlay.Button = ToggleTour;
        }

        private string _lastTour;

        /// <summary>Runs the measuring tour (the walkabout pauses and lends it the camera) or stops it and walks again.</summary>
        public void ToggleTour()
        {
            if (Stage == null || !Stage.Raised) return;
            if (Tour == null)
            {
                Walkabout.Pause(true);
                Tour = gameObject.AddComponent<MeasureTour>();
                Tour.Stage = Stage;
            }
            else
            {
                _lastTour = Tour.Report() ?? _lastTour;
                Destroy(Tour);
                Tour = null;
                Walkabout.Pause(false);
            }
        }

        private void Fail(string error)
        {
            _error = error;
            _card?.Set("CONTENT FAILED", error);
        }

        private void LateUpdate()
        {
            if (Tour != null) _lastTour = Tour.Report() ?? _lastTour;
            if (_card == null || !_card.IsOpen || Walkabout == null) return;
            // the title card stays over the world while it comes in
            if (Walkabout.Walker != null || Tour != null) _card.Close();
            else if (Stage != null) _card.Set((Stage.Status ?? "setting the walker down…").ToUpperInvariant());
        }

        private GUIStyle _style;

        private void OnGUI()
        {
            if (UI != null) return;
            _style ??= new GUIStyle(GUI.skin.label) { fontSize = Mathf.RoundToInt(Screen.height * 0.045f), alignment = TextAnchor.MiddleCenter, wordWrap = true };
            _style.normal.textColor = new Color(0.93f, 0.86f, 0.70f);
            if (_error != null) { GUI.Label(new Rect(0, 0, Screen.width, Screen.height), "CONTENT FAILED\n" + _error, _style); return; }
            if (Walkabout == null) { GUI.Label(new Rect(0, 0, Screen.width, Screen.height), _status, _style); return; }
            if (Walkabout.Walker != null || Tour != null) return;
            // the title card stays over the world while it comes in
            GUI.Label(new Rect(0, 0, Screen.width, Screen.height), _status + "\n" + (Stage.Status ?? "setting the walker down…"), _style);
        }
    }
}
