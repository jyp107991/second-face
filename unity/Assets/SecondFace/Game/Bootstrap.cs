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
            }
        }

        private IEnumerator Start()
        {
            // the interface's words (the UI table is preloaded with the settings)
            if (Strings.Available) yield return UnityEngine.Localization.Settings.LocalizationSettings.InitializationOperation;
            _card?.Set(Strings.Get("title.loading"));
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
                _card?.Set($"{Strings.Get("title.loading")} {name}");
            }
            Content = db;
            try { Registry.Load(db); }   // the typed registries the rules read (conversations, people, quests)
            catch (System.Exception e) { Debug.LogError($"Bootstrap: the content registries did not load: {e.Message}"); }
            var loaded = $"{db.Count("maps")} places · {db.Count("npcs")} people · {db.Count("dialogues")} conversations · {db.Count("quests")} quests · {db.Count("items")} items\n{Screen.width}×{Screen.height} {SystemInfo.graphicsDeviceType} · {SystemInfo.deviceModel}";
            _status = "THE SECOND FACE\n" + loaded;
            _card?.Set(Strings.Get("title.raising"), loaded);
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
            _card?.Set(Strings.Get("title.failed"), error);
        }

        private Hud _hud;
        private HudState _hudState;
        private float _hudNext;

        /// <summary>The HUD over the walkabout (P5.3b): the compass turns with the camera, the clock is the world's.</summary>
        public Hud Hud => _hud;

        private void UpdateHud()
        {
            if (UI == null || Walkabout == null || Walkabout.Walker == null || Stage == null) return;
            if (_hud == null)
            {
                _hud = new Hud(UI);
                _hud.Actions(OpenNotebook, () => OpenMap(), null);   // the pack comes with P5.3h
                _hud.ObjectiveTapped += () => OpenNotebook(SecondFace.Core.World.Notebook.Tracked(Walkabout.Game));
                UI.StackChanged += () => _hudNext = 0f;   // a quest tracked in the notebook, or one a conversation began, shows at once
                var place = Content?.Entry("maps", "shale")?["name"]?.ToString() ?? "Shale";
                _hudState = new HudState { Place = place, Party = { new HudMember { Name = Strings.Get("hud.you"), Hp = 1, MaxHp = 1, Leader = true } } };
            }
            _hud.Root.style.display = Tour != null ? UnityEngine.UIElements.DisplayStyle.None : UnityEngine.UIElements.DisplayStyle.Flex;
            var cam = Stage.Camera;
            if (cam != null)
            {
                var f = cam.transform.forward;   // north is +z
                if (f.x * f.x + f.z * f.z > 1e-4f) _hud.Heading(Mathf.Atan2(f.x, f.z) * Mathf.Rad2Deg);
            }
            if (Time.unscaledTime < _hudNext || Stage.Clock == null) return;
            _hudNext = Time.unscaledTime + 1f;
            var minutes = Stage.Clock.Minutes;
            _hudState.Day = Stage.Clock.Day;
            // the tracked quest's next objective (the walkabout's own game: conversations can start the content's quests)
            var g = Walkabout.Game;
            var tracked = SecondFace.Core.World.Notebook.Tracked(g);
            var page = tracked == null ? null : SecondFace.Core.World.Notebook.Quests(g, Registry.Quests).Find(e => e.Id == tracked);
            _hudState.Quest = page?.Title;
            _hudState.Objective = page?.Items.Find(i => !i.Done && !i.Optional)?.Text;
            _hudState.Clock = $"{(int)(minutes % 1440 / 60):00}:{(int)(minutes % 60):00}";
            _hud.Show(_hudState);
        }

        /// <summary>Opens the notebook over the walkabout's game, at a quest if given.</summary>
        public NotebookScreen OpenNotebook(string quest)
        {
            if (UI == null || Walkabout == null) return null;
            if (UI.Top is NotebookScreen open) return open;
            return UI.Open(NotebookScreen.FromContent(Walkabout.Game).At("quests", quest));
        }

        private void OpenNotebook() => OpenNotebook(null);

        /// <summary>Opens the world map over the walkabout: the places its game knows, the walker where they stand, the
        /// quickest journeys from the place they are nearest.</summary>
        public MapScreen OpenMap()
        {
            var layout = Stage?.World?.Layout;
            if (UI == null || Walkabout == null || Walkabout.Walker == null || layout == null) return null;
            if (UI.Top is MapScreen open) return open;
            var g = Walkabout.Game;
            var at = Walkabout.Walker.transform.position;
            string here = null;
            var best = float.MaxValue;
            foreach (var p in layout.Places.Values)
            {
                var d = (new Vector2(p.Centre[0], p.Centre[1]) - new Vector2(at.x, at.z)).sqrMagnitude;
                if (d < best) { best = d; here = p.Id; }
            }
            var known = new System.Collections.Generic.HashSet<string>(g.World.KnownLocations);
            if (here != null) known.Add(here);
            var face = Walkabout.Walker.transform.forward;
            var hour = Stage.Clock != null ? Stage.Clock.Hour : 8.0;
            return UI.Open(new MapScreen(new MapModel
            {
                Sheet = Interface != null ? Interface.WorldMap : null,
                Layout = layout,
                Known = known,
                Here = here,
                Player = new Vector2(at.x, at.z),
                Heading = Mathf.Atan2(face.x, face.z) * Mathf.Rad2Deg,
                Plan = to => SecondFace.Core.World.Travel.PlanTrip(Registry.WorldMap, here, to,
                    new SecondFace.Core.World.TravelOptions { Known = id => known.Contains(id), Hour = hour }),
            }));
        }

        private void LateUpdate()
        {
            if (Tour != null) _lastTour = Tour.Report() ?? _lastTour;
            UpdateHud();
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
