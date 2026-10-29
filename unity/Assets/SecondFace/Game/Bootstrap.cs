using System.Collections;
using System.IO;
using SecondFace.Core.Content;
using SecondFace.Game.World;
using UnityEngine;
using UnityEngine.Networking;

namespace SecondFace.Game
{
    /// <summary>
    /// The one authored object in the Boot scene. Locks the app to landscape full screen, loads the content
    /// registries from StreamingAssets and hands over to the game. Until the game exists, it shows a title card with
    /// what loaded and then raises the world round Shale for the measuring tour (<see cref="MeasureTour"/>, step 23),
    /// with the <see cref="DebugOverlay"/> one three-finger tap away.
    /// </summary>
    public sealed class Bootstrap : MonoBehaviour
    {
        public static ContentDb Content { get; private set; }
        /// <summary>What the world needs (set in the Boot scene by Second Face/Wire the Boot scene).</summary>
        public WorldAssets World;
        public MeasureTour Tour { get; private set; }
        private string _status = "LOADING…";
        private string _error;

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
                    if (req.result != UnityWebRequest.Result.Success) { _error = $"{name}: {req.error}"; yield break; }
                    text = req.downloadHandler.text;
                }
                else
                {
                    if (!File.Exists(path)) { _error = $"{name}: missing"; yield break; }
                    text = File.ReadAllText(path);
                }
                db.Load(name, text);
                _status = $"LOADING… {name}";
            }
            Content = db;
            _status = $"THE SECOND FACE\n{db.Count("maps")} places · {db.Count("npcs")} people · {db.Count("dialogues")} conversations · {db.Count("quests")} quests · {db.Count("items")} items\n{Screen.width}×{Screen.height} {SystemInfo.graphicsDeviceType} · {SystemInfo.deviceModel}";
            var overlay = DebugOverlay.Ensure();
            if (World == null) yield break;
            Tour = gameObject.AddComponent<MeasureTour>();
            Tour.Assets = World;
            Tour.Camera = Camera.main;
            overlay.World = Tour.WorldLine;
            overlay.Report = Tour.Report;
        }

        private GUIStyle _style;

        private void OnGUI()
        {
            _style ??= new GUIStyle(GUI.skin.label) { fontSize = Mathf.RoundToInt(Screen.height * 0.045f), alignment = TextAnchor.MiddleCenter, wordWrap = true };
            _style.normal.textColor = new Color(0.93f, 0.86f, 0.70f);
            if (_error != null) { GUI.Label(new Rect(0, 0, Screen.width, Screen.height), "CONTENT FAILED\n" + _error, _style); return; }
            if (Tour == null) { GUI.Label(new Rect(0, 0, Screen.width, Screen.height), _status, _style); return; }
            if (Tour.Ready) return;
            // the title card stays over the world while it comes in
            GUI.Label(new Rect(0, 0, Screen.width, Screen.height), _status + "\n" + Tour.Status, _style);
        }
    }
}
