using System.Collections;
using System.IO;
using SecondFace.Core.Content;
using SecondFace.Core.Save;
using SecondFace.Core.State;
using SecondFace.Game.Play;
using SecondFace.Game.UI;
using SecondFace.Game.World;
using UnityEngine;
using UnityEngine.Networking;

namespace SecondFace.Game
{
    /// <summary>
    /// The one authored object in the Boot scene. Locks the app to landscape full screen, opens the interface
    /// (<see cref="UIService"/>), loads the content registries from StreamingAssets (a card says what is loading,
    /// <see cref="TitleCard"/>), opens the saves and settings (<see cref="Session"/>) and starts raising the world round
    /// Shale (<see cref="WorldStage"/>) behind the title (<see cref="TitleScreen"/>, P5.3j): continue, a new game through
    /// character creation, load, settings. A game begun sets the player down in it in their own body (<see cref="Walkabout"/>),
    /// saved to the auto slot as it begins and whenever the app goes to the background; the HUD's menu button and the back
    /// gesture open the pause (save, load, settings, back to the title). The <see cref="DebugOverlay"/> is one
    /// three-finger tap away, with a button that runs the measuring tour (<see cref="MeasureTour"/>, step 23).
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
        /// <summary>The saves and the settings (once the content is in).</summary>
        public Session Session { get; private set; }
        /// <summary>Where the session comes from (tests keep theirs apart); null: the device's persistent folder.</summary>
        public static System.Func<Session> MakeSession;
        /// <summary>The title while it is open.</summary>
        public TitleScreen Title { get; private set; }
        private bool _awaitingSetDown, _autosaveOnSetDown, _padWired;
        /// <summary>Photo mode while it is open (null otherwise).</summary>
        public PhotoScreen Photo { get; private set; }
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
            Session = MakeSession != null ? MakeSession() : Session.OnDevice();
            Apply(Session.Settings);
            Session.SettingsChanged += Apply;
            if (UI != null) UI.BackUnhandled += () => { if (Walkabout != null && Walkabout.Walker != null && Tour == null) OpenPause(); };
            var overlay = DebugOverlay.Ensure();
            if (World == null) yield break;
            Stage = gameObject.AddComponent<WorldStage>();
            Stage.Assets = World;
            Stage.Camera = Camera.main;
            if (Stage.Camera != null) SecondFace.Game.World.Look.Apply(Stage.Camera, World != null ? World.Look : null);   // the look (P4.14 step 6)
            Walkabout = gameObject.AddComponent<Walkabout>();
            Walkabout.Stage = Stage;
            Walkabout.SetDown += SetDown;
            Walkabout.Said += line => _hud?.Note(line);
            Walkabout.Asked += (name, _) => { if (name == "map") OpenMap(); };
            overlay.World = () => Tour != null ? Tour.WorldLine() : Walkabout.Line();
            overlay.Report = () => _lastTour;
            overlay.ButtonLabel = () => Tour != null ? "walk" : "measure (tour)";
            overlay.Button = ToggleTour;
            if (UI == null) { Walkabout.Begin(null); yield break; }   // no interface: straight into a new game
            _card?.Close();
            OpenTitle();
        }

        // --- the game: begun, saved, loaded, left ----------------------------------------------------------------

        /// <summary>The title over the world coming in (what is open goes).</summary>
        public TitleScreen OpenTitle()
        {
            if (UI == null) return null;
            UI.CloseAll();
            var latest = Session?.Latest();
            Title = UI.Open(new TitleScreen(new TitleModel
            {
                Latest = latest,
                AnySave = latest != null,
                Status = () => Stage == null || Stage.Raised ? null : (Stage.Status ?? Strings.Get("title.raising")),
                Continue = () => { if (latest != null) Load(latest.Slot); },
                NewGame = () => OpenCreation(),
                Load = () => OpenSaves(false),
                Settings = () => OpenSettings(),
            }));
            return Title;
        }

        /// <summary>Character creation; its begin starts a new game with the person made.</summary>
        public CreationScreen OpenCreation()
        {
            if (UI == null || World == null) return null;
            return UI.Open(new CreationScreen(new CreationModel
            {
                BodyF = World.PlayerF, BodyM = World.PlayerM, Idle = World.Locomotion,
                Done = (pc, origin) =>
                {
                    var g = States.NewGame("shale", 0, 0, pc);
                    g.Origin = origin;
                    Begin(g, true);
                },
            }));
        }

        /// <summary>Plays a game (a new one, or a loaded one): the screens close, a card says the player is being set down
        /// until they are (a new game is then saved to the auto slot).</summary>
        public void Begin(GameState g, bool fresh = false)
        {
            if (Walkabout == null) return;
            UI?.CloseAll();
            Title = null;
            _awaitingSetDown = true;
            _autosaveOnSetDown = fresh;
            if (UI != null)
            {
                _card = UI.Open(new TitleCard());
                _card.Set(Strings.Get("title.setting_down"));
            }
            Walkabout.Begin(g, fresh);
        }

        private void SetDown()
        {
            _awaitingSetDown = false;
            if (_card != null && _card.IsOpen) _card.Close();
            if (Session != null) Apply(Session.Settings);
            WirePad();
            if (_autosaveOnSetDown) StartCoroutine(AutosaveSoon());
            _autosaveOnSetDown = false;
            _hudNext = 0f;
        }

        /// <summary>The pad's and the keys' buttons (P5.3l): what the HUD's open, the pause (and out of it, and out of
        /// photo mode), acting on what is near, photo mode, quicksave and quickload.</summary>
        private void WirePad()
        {
            var pad = Walkabout != null ? Walkabout.Pad : null;
            if (pad == null || _padWired) return;
            _padWired = true;
            pad.Act += () => Walkabout.ActNearest();
            pad.Pack += () => OpenPack();
            pad.Map += () => OpenMap();
            pad.Notebook += () => OpenNotebook(null);
            pad.Photo += () => OpenPhoto();
            pad.Camp += () => { if (UI != null && UI.Top == null) Walkabout.OpenCamp(); };
            pad.Sneak += () => Walkabout.ToggleSneak();
            pad.Pause += () =>
            {
                if (Photo != null && Photo.IsOpen) Photo.Close();
                else if (UI != null && UI.Top is PauseScreen pause) pause.Close();
                else if (UI != null && UI.Top == null) OpenPause();
            };
            pad.QuickSave += () => _hud?.Note(Strings.Get(Save(Session.Quick) != null ? "hud.saved" : "hud.not_saved"));
            pad.QuickLoad += () => { if (!Load(Session.Quick)) _hud?.Note(Strings.Get("hud.no_quicksave")); };
        }

        /// <summary>Photo mode over the game (null when there is no walker): the world stops until it is done.</summary>
        public PhotoScreen OpenPhoto()
        {
            if (UI == null || Walkabout == null || Walkabout.Walker == null || Tour != null) return null;
            if (Photo != null && Photo.IsOpen) return Photo;
            UI.CloseAll();
            var mode = gameObject.AddComponent<PhotoMode>();
            mode.Walkabout = Walkabout;
            mode.Pad = Walkabout.Pad;
            if (!mode.Begin()) { Destroy(mode); return null; }
            Photo = UI.Open(new PhotoScreen(mode, () => { mode.End(); Destroy(mode); Photo = null; }));
            return Photo;
        }

        /// <summary>The auto slot once the camera has settled on the walker (a picture taken in the frame they are set
        /// down reads a camera Cinemachine has not placed yet).</summary>
        private IEnumerator AutosaveSoon()
        {
            for (var i = 0; i < 2; i++) yield return null;
            Autosave();
        }

        /// <summary>Loads a slot and plays it (false when it is empty or cannot be read).</summary>
        public bool Load(string slot)
        {
            var f = Session?.Read(slot);
            if (f == null) return false;
            Begin(f.State);
            return true;
        }

        /// <summary>Saves the game as it stands to a slot, with a picture of the scene (null when there is no game to
        /// save or it could not be written).</summary>
        public SaveMeta Save(string slot)
        {
            if (Session == null || Walkabout == null || !Walkabout.Begun || Walkabout.Walker == null) return null;
            var g = Walkabout.Snapshot();
            var (here, name) = Nearest();
            var meta = new SaveMeta
            {
                Label = g.Pc?.Sheet?.Name, LocationId = here, LocationName = name, Minutes = g.Minutes, PlaytimeSec = g.PlaytimeSec,
                Thumb = Session.Thumb(Stage.Camera),
            };
            try { return Session.Write(slot, g, meta).Meta; }
            catch (System.Exception e) { Debug.LogWarning($"Bootstrap: the game was not saved to {slot} ({e.Message})"); return null; }
        }

        /// <summary>Saves to the auto slot (when the settings keep autosaves).</summary>
        public SaveMeta Autosave() => Session != null && Session.Settings.Autosave ? Save(Session.Auto) : null;

        private void OnApplicationPause(bool paused) { if (paused) Autosave(); }

        /// <summary>The pause over the game (null when there is no game, or the measuring tour runs).</summary>
        public PauseScreen OpenPause()
        {
            if (UI == null || Walkabout == null || Walkabout.Walker == null || Tour != null) return null;
            if (UI.Top is PauseScreen open) return open;
            var g = Walkabout.Snapshot();
            var (_, place) = Nearest();
            return UI.Open(new PauseScreen(new PauseModel
            {
                Line = TitleScreen.Describe(new SaveMeta { Label = g.Pc?.Sheet?.Name, LocationName = place, Minutes = g.Minutes }),
                Save = () => OpenSaves(true),
                Load = Session != null && Session.Latest() != null ? () => OpenSaves(false) : null,
                Settings = () => OpenSettings(),
                Photo = () => OpenPhoto(),
                Quit = QuitToTitle,
            }));
        }

        /// <summary>Back to the title: the game is saved to the auto slot, the walker goes, the title opens.</summary>
        public void QuitToTitle()
        {
            Autosave();
            Walkabout?.End();
            OpenTitle();
        }

        public SavesScreen OpenSaves(bool saving)
        {
            if (UI == null || Session == null) return null;
            return UI.Open(new SavesScreen(new SavesModel { Session = Session, Saving = saving, Save = Save, Load = slot => Load(slot) }));
        }

        public SettingsScreen OpenSettings()
        {
            if (UI == null || Session == null) return null;
            return UI.Open(new SettingsScreen(() => Session.Settings, edit => Session.Change(edit)));
        }

        /// <summary>The settings where they take: the words' size and contrast, the camera's turn.</summary>
        private void Apply(Settings s)
        {
            if (s == null) return;
            UI?.Present(System.Array.IndexOf(Settings.TextScales, s.TextScale), s.HighContrast);
            DialoguePanel.HeardWhole = s.SkipSeen;
            var rig = Walkabout != null ? Walkabout.Rig : null;
            if (rig != null) { rig.TurnSpeed = s.TurnSpeed; rig.InvertTurn = s.InvertTurn; }
        }

        /// <summary>The place the walker is nearest (the town before they are set down).</summary>
        private (string Id, string Name) Nearest()
        {
            var best = Walkabout != null ? Walkabout.Here() : null;
            if (best == null) return ("shale", Content?.Entry("maps", "shale")?["name"]?.ToString() ?? "Shale");
            return (best.Id, string.IsNullOrEmpty(best.Name) ? best.Id : best.Name);
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
                _hud.Actions(OpenNotebook, () => OpenMap(), () => OpenPack(), () => Walkabout.OpenCamp(), () => Walkabout.ToggleSneak());
                _hud.Menu(() => OpenPause());
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
            if (Walkabout.Watch != null) _hud.Watched(Walkabout.Walker.Sneaking, Walkabout.Watch.Highest);
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

        /// <summary>Opens the pack over the walkabout: the walker's kit, the live figure in the player's body.</summary>
        public PackScreen OpenPack()
        {
            if (UI == null || Walkabout == null || Stage == null) return null;
            if (UI.Top is PackScreen open) return open;
            var assets = Stage.Assets;
            var look = SecondFace.Game.People.PlayerBody.Look(Walkabout.Game.Pc);
            return UI.Open(new PackScreen(new PackModel
            {
                Game = Walkabout.Game, Body = SecondFace.Game.People.PlayerBody.Base(look, assets.PlayerF, assets.PlayerM),
                Idle = assets.Locomotion, Fit = look.Body, Look = look,
                Drop = Walkabout.Walker != null ? (i, n) => Walkabout.Drop(i, n) != null : null,
            }));
        }

        /// <summary>Opens the world map over the walkabout: the places its game knows, the walker where they stand, the
        /// quickest journeys from the place they are nearest.</summary>
        public MapScreen OpenMap()
        {
            var layout = Stage?.World?.Layout;
            if (UI == null || Walkabout == null || Walkabout.Walker == null || layout == null) return null;
            if (UI.Top is MapScreen open) return open;
            var g = Walkabout.Game;
            var at = Walkabout.Walker.transform.position;
            var here = Nearest().Id;
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
            // the card stays over the world while a game's ground comes in
            if (_card == null || !_card.IsOpen || !_awaitingSetDown || Stage == null) return;
            _card.Set((Stage.Status ?? Strings.Get("title.setting_down")).ToUpperInvariant());
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
