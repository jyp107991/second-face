using System.Collections;
using System.IO;
using SecondFace.Core.Content;
using UnityEngine;
using UnityEngine.Networking;

namespace SecondFace.Game
{
    /// <summary>
    /// The one authored object in the Boot scene. Locks the app to landscape full screen, loads the content
    /// registries from StreamingAssets and hands over to the game. Until the game exists, shows a title card with
    /// what loaded, so the first CI build proves the pipeline end to end on the phone.
    /// </summary>
    public sealed class Bootstrap : MonoBehaviour
    {
        public static ContentDb Content { get; private set; }
        private string _status = "LOADING…";
        private string _error;

        private void Awake()
        {
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
        }

        private GUIStyle _style;

        private void OnGUI()
        {
            _style ??= new GUIStyle(GUI.skin.label) { fontSize = Mathf.RoundToInt(Screen.height * 0.045f), alignment = TextAnchor.MiddleCenter, wordWrap = true };
            _style.normal.textColor = new Color(0.93f, 0.86f, 0.70f);
            GUI.Label(new Rect(0, 0, Screen.width, Screen.height), _error != null ? "CONTENT FAILED\n" + _error : _status, _style);
        }
    }
}
