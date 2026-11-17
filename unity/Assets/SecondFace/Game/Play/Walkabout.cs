using System;
using System.Collections;
using System.Linq;
using SecondFace.Core.Combat;
using SecondFace.Core.Content;
using SecondFace.Core.Dialogue;
using SecondFace.Core.Inventory;
using SecondFace.Core.Npc;
using SecondFace.Core;
using SecondFace.Core.Quest;
using SecondFace.Core.Save;
using SecondFace.Core.Scene;
using SecondFace.Core.State;
using SecondFace.Core.World;
using SecondFace.Game.People;
using SecondFace.Game.UI;
using SecondFace.Game.World;
using UnityEngine;

namespace SecondFace.Game.Play
{
    /// <summary>
    /// The walkabout (step 25, the `play-walkabout` build): on the raised <see cref="WorldStage"/>, a stand-in for the
    /// player set down at Shale's spawn, the game camera on them, touch to look round, tap to walk, pinch to zoom, the
    /// NavMesh following them over the open ground and through the town, and the P2 people standing about the town at
    /// its people's posts, idling. The world streams round the walker. <see cref="Pause"/> hands the camera to the
    /// measuring tour and back. A tap on one of the townsfolk opens the radial (P5.3c): talk walks the walker over, the
    /// person turns to them and their conversation from the content opens in the panel (P5.3d; on a fresh game state,
    /// <see cref="Game"/>, so what is said there stays in the walkabout); look has them meet each other's eyes and the
    /// person waves. The walker carries a kit (<see cref="Kit"/>) the pack shows; the townsfolk who keep a stall can be
    /// traded with (P5.3h): the walker goes over and their barter table opens with their face across it.
    /// </summary>
    public sealed class Walkabout : MonoBehaviour
    {
        public WorldStage Stage;
        public float LoadTimeout = 180f;

        public Walker Walker { get; private set; }
        public OrbitRig Rig { get; private set; }
        public WorldNav Nav { get; private set; }
        public TouchInput Input { get; private set; }
        /// <summary>The gamepad and the keys (P5.3l).</summary>
        public PadInput Pad { get; private set; }
        public bool Paused { get; private set; }
        /// <summary>The walker stands on a built NavMesh and the camera follows them.</summary>
        public bool Ready => Walker != null && Nav != null && Nav.Ready && Walker.Agent.isOnNavMesh;
        /// <summary>The last setting down has put the walker down (none is under way).</summary>
        public bool Placed => _down == _placing;
        /// <summary>How many of the world's people stand in it now (those near the walker).</summary>
        public int Townsfolk => People != null ? People.Standing : 0;
        /// <summary>The world's people keeping their routines (P6.2; null until the walker is first set down).</summary>
        public PeopleService People { get; private set; }
        /// <summary>The party in the world: the companions following the player, and those waiting where they were left
        /// (null until the walker is first set down).</summary>
        public PartyFollowers Party { get; private set; }
        /// <summary>The people about watching the walker (P6.3: the light on them, who has noticed them).</summary>
        public Watchers Watch { get; private set; }
        /// <summary>The standing places' things that can be used: containers, talking props, fires, seats (P6.1).</summary>
        public int Things => _equipped.Values.Sum();
        /// <summary>The places whose things are equipped, and how many each has.</summary>
        private readonly System.Collections.Generic.Dictionary<GameObject, int> _equipped = new();
        /// <summary>A line for the HUD (a lock that held, a lock picked).</summary>
        public event System.Action<string> Said;
        /// <summary>The container open now (null when none).</summary>
        public LootScreen Loot { get; private set; }
        /// <summary>Things on the ground: the bundles in the world (P6.1).</summary>
        public GroundPiles Piles { get; private set; }
        /// <summary>The game being played (<see cref="Begin"/>; a new game at Shale until one is begun): the conversations,
        /// the notebook, the pack and the saves run on it.</summary>
        public GameState Game { get; private set; } = States.NewGame(StartAt, 0, 0);
        /// <summary>A game has begun (the walker is set down once the world is in).</summary>
        public bool Begun { get; private set; }
        /// <summary>The walker was set down for the game begun last (a new game, or a load).</summary>
        public event System.Action SetDown;
        /// <summary>The quests on <see cref="Game"/>: the conversations run with it as their host, so what is said can start
        /// and move the content's quests (the notebook and the HUD follow them).</summary>
        /// <summary>Where a new game begins (the opening: the home place above the Cistern's door), its spawn and quest.</summary>
        public const string StartPlace = "cistern9", StartSpawn = "home", StartQuest = "q_ch1_knock";
        /// <summary>Where the next new game begins (tests of the town set it to Shale).</summary>
        public static string StartAt = StartPlace;
        public QuestEngine Quests => _quests ??= new QuestEngine(Registry.Quests, Game, new Host(this));
        private QuestEngine _quests;
        /// <summary>What the content asks of the world that the walkabout does not do itself (the map; later the fight,
        /// the surgeon's chair, the Dust table): the event's name and data.</summary>
        public event System.Action<string, Newtonsoft.Json.Linq.JToken> Asked;
        /// <summary>The camp open now (null when none).</summary>
        public CampScreen Camping { get; private set; }
        /// <summary>Who the conversation open now is with (null for a talking thing).</summary>
        private Interactable _speaking;
        /// <summary>The conversation open now (null when none).</summary>
        public DialoguePanel Conversation { get; private set; }
        /// <summary>Fights (P6.4) and the maps' area triggers (P7), made with the walker.</summary>
        public Combat Combat { get; private set; }
        public Triggers Triggers { get; private set; }
        /// <summary>The player lost a fight.</summary>
        public event System.Action Defeated;
        /// <summary>A conversation, a trade, a table (Dust, the surgeon's), a fight or a move to another place is under way:
        /// the world's own events wait.</summary>
        public bool Busy => (Conversation != null && Conversation.IsOpen) || (Trade != null && Trade.IsOpen) || (Table != null && Table.IsOpen)
                            || (Epilogue != null && Epilogue.IsOpen) || (Combat != null && Combat.Active) || _responding > 0 || (Begun && !Placed);
        private int _responding;
        /// <summary>A table open with someone now: Dust, the surgeon's (null when none).</summary>
        public UIScreen Table { get; private set; }

        /// <summary>A map trigger fires: its line said, its effects applied, the quests and the people brought up to date.</summary>
        public void Fire(Core.Scene.TriggerDef def)
        {
            if (!string.IsNullOrEmpty(def.Text)) Said?.Invoke(def.Text);
            if (Stage != null && Stage.Clock != null) Game.Minutes = Stage.Clock.Minutes;
            var before = Game.Minutes;
            if (def.Effects != null) Logic.Apply(def.Effects, Game, new Host(this));
            if (Stage != null && Stage.Clock != null && Game.Minutes != before) { Stage.Clock.Minutes += Game.Minutes - before; TurnSky(before); }
            Quests.Update();
            if (Party != null) Party.Sync();
            if (People != null) People.Refresh();
            if (Dressing != null) Dressing.Refresh();
        }

        /// <summary>The story moved on after a conversation or a fight: the quests, the places' people, a fight if anyone
        /// turned hostile.</summary>
        public void Settle()
        {
            Milestone?.Invoke();
            Quests.Update();
            // the party first: one who joined goes on in the body they stood in before the place's people are brought anew
            if (Party != null) Party.Sync();
            if (People != null) People.Refresh();
            if (Dressing != null) Dressing.Refresh();
            if (Combat != null) Combat.Check(true);
        }
        /// <summary>The story moved on (a conversation closed, a fight is about to start): a moment to keep (the auto slot).</summary>
        public event System.Action Milestone;

        /// <summary>The barter table open now (null when none).</summary>
        public BarterScreen Trade { get; private set; }

        /// <summary>What the walkabout's player carries until the opening gives them their own: the Cistern's issue worn,
        /// a pipe in hand, a zip gun and a few rounds, water, a bandage or two, jerky, salvage, a lamp and some Tolls.</summary>
        private void Kit()
        {
            var inv = Game.Pc.Inventory;
            if (inv.Items.Count > 0 || inv.Equipped.Count > 0 || Registry.Items.Count == 0) return;
            // a Knock household's kit, as the web game's new game gives it: thin, scarcity starts at home
            foreach (var (id, n) in new[] { ("r_scrap", 1), ("w_shiv", 1), ("c_bandage", 1), ("c_jerky", 2), ("c_water", 1) })
                if (Items.Has(id)) Inv.AddItem(inv, Inv.MakeItem(id, n));
            inv.Tolls = 20;
            Inv.Equip(inv, inv.Items.FindIndex(i => i.Def == "r_scrap"));
            Inv.Equip(inv, inv.Items.FindIndex(i => i.Def == "w_shiv"));
            Inv.SyncGear(Game.Pc.Sheet, inv);
        }

        /// <summary>Plays a game (a new one, <paramref name="fresh"/>: it gets the starting kit; or one loaded): the walker
        /// is set down where it stood (its
        /// <see cref="GameState.Spot"/>) or at the town's spawn, in the player's own body as the character was made, once
        /// the world round them is in. Called while walking (a load), the walker goes there at once.</summary>
        public void Begin(GameState state, bool fresh = false)
        {
            Game = state ?? States.NewGame(StartAt, 0, 0);
            _quests = null;
            _arriving = null;
            Begun = true;
            if (fresh || state == null)
            {
                Kit();   // a loaded game keeps what it carries, even nothing
                // the opening (owner's note D): hatch day at Knock, seven in the morning, the day's quest begun
                if (Game.LocationId == StartPlace && Game.Spot == null)
                {
                    Game.Minutes = Math.Floor(Game.Minutes / 1440) * 1440 + 7 * 60;
                    if (Registry.Quests.ContainsKey(StartQuest)) Quests.QuestStart(StartQuest);
                }
            }
            Know("cistern9");
            Know("shale");
            if (_raised) StartCoroutine(Place());
        }

        /// <summary>The game as it stands now, for a save: where the walker is and how the camera looks at them, the hour.</summary>
        public GameState Snapshot()
        {
            if (Party != null) Party.Keep();   // where the waiting stand
            if (Walker != null)
            {
                var p = Walker.Footing;
                Game.Spot = new WorldSpot
                {
                    X = p.x, Y = p.y, Z = p.z, Yaw = Walker.transform.eulerAngles.y,
                    CamYaw = Rig != null ? Rig.Yaw : 0f, CamPitch = Rig != null ? Rig.Pitch : 50f, CamDistance = Rig != null ? Rig.Distance : 20f,
                };
            }
            if (Stage != null && Stage.Clock != null) Game.Minutes = Stage.Clock.Minutes;
            return Game;
        }

        /// <summary>Leaves the game (back to the title): the walker goes; the world and the town stay.</summary>
        public void End()
        {
            Begun = false;
            _arriving = null;
            _movesAsked = 0;
            if (Epilogue != null && Epilogue.IsOpen) Epilogue.Close();
            if (Still != null) Still.End();
            if (Dressing != null) Dressing.Clear();
            _placing++;   // a setting down under way is dropped
            if (Walker != null) Destroy(Walker.gameObject);
            Walker = null;
            if (Party != null) Party.Clear();
            if (Input != null) Input.Walker = null;
            if (Pad != null) Pad.Walker = null;
            if (Rig != null) Rig.Leader = null;
            if (Piles != null) Piles.Clear();
        }

        private bool _raised;
        private int _placing;
        /// <summary>The last setting down that has put the walker down (behind <see cref="_placing"/> while one is under way).</summary>
        private int _down;

        private IEnumerator Start()
        {
            if (Stage == null) yield break;
            if (!Stage.Raised) yield return Stage.Raise();
            if (!Stage.Raised) yield break;
            var assets = Stage.Assets;
            if (assets.Walker == null || assets.Locomotion == null) { Debug.LogWarning("Walkabout: no walker in the world assets (Second Face/Build world assets)"); yield break; }
            _raised = true;
            if (Begun) yield return Place();
        }

        /// <summary>Sets the walker down for the game begun (replacing one already walking), the camera, the touches and
        /// the town's people round them.</summary>
        private IEnumerator Place()
        {
            var ticket = ++_placing;
            var assets = Stage.Assets;
            var spot = Game.Spot;
            Vector3 at;
            float yaw;
            if (spot != null) { at = new Vector3(spot.X, spot.Y, spot.Z); yaw = spot.Yaw; }
            else
            {
                var place = string.IsNullOrEmpty(Game.LocationId) || !Stage.World.Layout.Places.ContainsKey(Game.LocationId) ? "shale" : Game.LocationId;
                var centre = Stage.World.PlaceCentre(place);
                // (a place not built yet stands as a bare pad: it is never shown, so it is not waited for)
                yield return Stage.WaitAround(centre, Built(place) ? place : null, LoadTimeout);
                if (ticket != _placing) yield break;
                // a move the content asked for lands on its map's spawn (a lift's top, a cell); else the place's own
                var arrival = Arrival(place);
                var marker = arrival ?? Stage.Marker(place, "spawn", StartSpawn) ?? Stage.Marker(place, "spawn");
                at = marker != null ? marker.transform.position : centre;
                yaw = marker != null ? marker.transform.eulerAngles.y : 0f;
                // arriving, the walker and the view face where the place's life is, not the map's drawn facing (an arrival
                // looked out at bare ground beside the road, play-ch1 T43); a named spawn keeps its own facing
                var heart = arrival != null ? null : Stage.Heart(place, marker != null ? marker.Map : null);
                if (heart.HasValue)
                {
                    var to = heart.Value - at; to.y = 0f;
                    if (to.sqrMagnitude > 16f) yaw = Mathf.Atan2(to.x, to.z) * Mathf.Rad2Deg;
                }
            }
            yield return Stage.WaitAround(at, People == null ? (Game.LocationId ?? "shale") : null, LoadTimeout);
            if (ticket != _placing || Stage.Camera == null) yield break;   // left meanwhile, or the camera went with the scene
            if (Stage.Clock != null) Stage.Clock.Minutes = Game.Minutes;
            if (Walker != null) Destroy(Walker.gameObject);
            var pcLook = PlayerBody.Look(Game.Pc);
            var body = PlayerBody.Base(pcLook, assets.PlayerF, assets.PlayerM, assets.Rocketbox);
            var pcMale = body == null || (pcLook?.Rb != null ? RbPeople.Of(pcLook.Rb)?.Male ?? pcLook.Body == "m" : pcLook?.Body == "m");
            Walker = Walker.Create(body != null ? body : assets.Walker, assets.Locomotion, at, yaw, pcMale);
            _down = ticket;
            if (body != null) PlayerBody.Apply(Walker.gameObject, Game.Pc);
            if (Nav == null) Nav = gameObject.AddComponent<WorldNav>();
            Nav.Streamer = Stage.Streamer;
            Nav.Target = Walker.transform;
            if (Rig == null) Rig = OrbitRig.Create(Stage.Camera, Walker.transform);
            Rig.Follow(Walker.transform);
            if (spot != null) Rig.View(spot.CamYaw, spot.CamPitch, spot.CamDistance);
            else Rig.View(yaw + 20f, Rig.Pitch, Rig.Distance);
            if (Input == null)
            {
                Input = gameObject.AddComponent<TouchInput>();
                Input.Rig = Rig; Input.Camera = Stage.Camera;
                Input.Tapped += OnTapped;
            }
            Input.Walker = Walker;
            if (Combat == null)
            {
                Combat = gameObject.AddComponent<Combat>();
                Combat.Walkabout = this;
                Combat.Ended += outcome =>
                {
                    if (outcome == "defeat") { Defeated?.Invoke(); return; }
                    Settle();
                    StartCoroutine(AfterFight());
                };
                Combat.Starting += () => Milestone?.Invoke();
            }
            if (Triggers == null) { Triggers = gameObject.AddComponent<Triggers>(); Triggers.Walkabout = this; }
            if (Pad == null)
            {
                Pad = gameObject.AddComponent<PadInput>();
                Pad.Rig = Rig; Pad.Camera = Stage.Camera;
            }
            Pad.Walker = Walker;
            Populate(assets);
            // the party beside the walker, wherever they were set down (a new game, a load, a journey by the map)
            if (Party == null) { Party = gameObject.AddComponent<PartyFollowers>(); Party.Walkabout = this; }
            Party.SetDown();
            if (Piles == null)
            {
                Piles = gameObject.AddComponent<GroundPiles>();
                Piles.Material = assets.Sack;
                Piles.Chosen += (thing, verb) => StartCoroutine(Use(thing, verb, null, null));
            }
            Piles.Clear();
            Piles.Sync(Game);
            // a move's map is visited (as the web game's map entry had it): a room not stamped as a place of its own, or
            // under one, is not marked by walking in (Visit)
            if (_arriving != null && !Game.Flags.ContainsKey("visited_" + _arriving.Map.Id))
            {
                Game.Flags["visited_" + _arriving.Map.Id] = true;
                Quests.Update();
            }
            _arriving = null;
            if (Dressing == null) { Dressing = gameObject.AddComponent<PlaceDressing>(); Dressing.Walkabout = this; }
            Dressing.Spawner = Stage.Streamer != null ? Stage.Streamer.PlaceSpawner : null;
            Dressing.Refresh();
            SetDown?.Invoke();
            // a game saved in its closing pages opens on the page it stood at
            if (Core.World.Epilogue.Resumes(Game)) StartCoroutine(AfterTalkAndMove(() => OpenTree(Core.World.Epilogue.Tree, "")));
        }

        /// <summary>A place is built (it has a prefab to show; the rest stand as bare pads until their kits are made).</summary>
        private bool Built(string place)
        {
            var set = Stage?.Streamer?.PlaceSpawner?.Places;
            return set == null || set.AddressOf(place) != null;
        }

        /// <summary>The spawn a move is landing on, in the place shown (null when no move is under way or the place does not
        /// stand: the place's own spawn is used).</summary>
        private PlaceMarker Arrival(string place)
        {
            if (_arriving == null) return null;
            var go = Stage?.Streamer?.PlaceSpawner?.Instance(place);
            if (go == null) return null;
            PlaceMarker first = null;
            foreach (var m in go.GetComponentsInChildren<PlaceMarker>())
            {
                if (m.Kind != "spawn" || m.Map != _arriving.Map.Id) continue;
                if (_arriving.Spawn != null && m.Id == _arriving.Spawn.Id) return m;
                first ??= m;
            }
            if (first == null) Debug.LogWarning($"Walkabout: {_arriving.Map.Id} is not stamped into {place}; set down at the place's spawn");
            return first;
        }

        /// <summary>The move under way (the content's goto): the map and spawn it lands on.</summary>
        private GotoTarget _arriving;
        /// <summary>Where the last move the content asked for went (tests read it).</summary>
        public GotoTarget LastMove { get; private set; }
        /// <summary>A move to another map has begun: the name of the map (the card over the world says it).</summary>
        public event System.Action<string> Moving;

        /// <summary>The world place that holds a map (its own place, or a place by that id), as the world's layout has it.</summary>
        public string PlaceOf(string map)
        {
            var layout = Stage?.World?.Layout;
            if (layout == null || string.IsNullOrEmpty(map)) return null;
            foreach (var p in layout.Places.Values) if (p.Map == map) return p.Id;
            return layout.Places.ContainsKey(map) ? map : null;
        }

        /// <summary>Moves the player to a map's spawn (the content's <c>goto</c>: a lift, a district's transit, a cell; port
        /// of the web game's loadLocation): the minutes it takes pass, the walker is set down at the spawn in the world
        /// place that holds the map (Core <see cref="Goto"/>: its own, the one it lies under or beside, or its town while
        /// it is not stamped yet), the camera and the touches with them, and the party comes along (set down beside them).
        /// False when the map is unknown or no place holds it.</summary>
        public bool Move(GotoOrder order)
        {
            if (order == null || Stage == null || Stage.World == null || !Stage.World.Ready) return false;
            var target = Goto.Resolve(order.Location, order.Spawn, PlaceOf);
            if (target == null) { Debug.LogWarning($"Walkabout: no place holds {order.Location} (goto)"); return false; }
            if (!target.SpawnFound && !string.IsNullOrEmpty(order.Spawn)) Debug.LogWarning($"Walkabout: {order.Location} has no spawn {order.Spawn}; its first instead");
            if (Party != null) Party.Keep();   // the companions left waiting stay where they stand
            ClockToGame();
            Game.Minutes += order.Minutes;
            if (Stage.Clock != null) { Stage.Clock.Minutes = Game.Minutes; if (Stage.Sky != null) Stage.Sky.Apply(); }
            Game.LocationId = target.Place;
            Game.Spot = null;
            _arriving = target;
            LastMove = target;
            Moving?.Invoke(string.IsNullOrEmpty(target.Map.Name) ? target.Map.Id : target.Map.Name);
            if (_raised) StartCoroutine(Place());
            return true;
        }

        /// <summary>The world's people (P6.2) for the game begun: each standing place's placements whose condition holds,
        /// in bodies of the cast (<see cref="PeopleService"/>: near the walker they stand and keep their routines), and the
        /// standing places' things, each place's as it comes.</summary>
        private void Populate(WorldAssets assets)
        {
            var spawner = Stage.Streamer != null ? Stage.Streamer.PlaceSpawner : null;
            if (People == null)
            {
                People = gameObject.AddComponent<PeopleService>();
                People.Chosen += (person, verb) => StartCoroutine(Respond(person, verb));
                if (spawner != null)
                {
                    spawner.Shown += (id, place) => Equip(place, id);
                    spawner.Dropping += (id, place) => _equipped.Remove(place);   // its things go with it
                }
            }
            People.Clock = Stage.Clock;
            People.World = Stage.World;
            People.Spawner = spawner;
            People.Focus = Walker.transform;
            People.Locomotion = assets.Locomotion;
            People.Bodies = assets.Cast != null && assets.Cast.Length > 0
                ? assets.Cast.Where(c => c != null && c.Prefab != null).ToList()
                : (assets.Townsfolk ?? new GameObject[0]).Where(g => g != null)
                    .Select((g, i) => new WorldAssets.CastEntry { Id = g.name, Prefab = g, Male = i % 2 == 0, Age = 35f }).ToList();
            // everyone made from the two bases and their own measurements, dressed from the whole cast's wardrobe (P4.13)
            People.BaseF = assets.PlayerF;
            People.BaseM = assets.PlayerM;
            People.Rocketbox = assets.Rocketbox != null && assets.Rocketbox.People.Length > 0 ? assets.Rocketbox : null;
            People.Begin(Game);
            if (Combat != null) Combat.People = People;
            if (Triggers != null) Triggers.Spawner = spawner;
            if (spawner != null)
                foreach (var (id, place) in spawner.Standing()) Equip(place, id);
            if (Watch == null)
            {
                Watch = gameObject.AddComponent<Watchers>();
                Watch.Noticed += _ => { if (Walker != null && Walker.Sneaking) Said?.Invoke(Strings.Get("stealth.seen")); };
            }
            Watch.Walker = Walker;
            Watch.People = People;
            Watch.Sky = Stage.Sky;
            Watch.Game = Game;
            Watch.Indoors = Indoors;
            Watch.Calm();
        }

        /// <summary>Into a sneak or out of it (P6.3; the HUD's sneak button, Ctrl, the pad's left stick pressed).</summary>
        public void ToggleSneak()
        {
            if (Walker != null) Walker.Sneak(!Walker.Sneaking);
        }

        /// <summary>The place's things (P6.1): its containers open (a lock first), its talking props say their piece, its
        /// fires are somewhere to camp.</summary>
        private void Equip(GameObject place, string placeId)
        {
            if (place == null || _equipped.ContainsKey(place)) return;
            var n = 0;
            foreach (var m in place.GetComponentsInChildren<PlaceMarker>())
            {
                if (m.Kind != "container" && m.Kind != "talk" && m.Kind != "fire" && m.Kind != "seat") continue;
                var map = Registry.Maps.TryGetValue(string.IsNullOrEmpty(m.Map) ? placeId : m.Map, out var d) ? d : null;
                string title;
                string verb;
                if (m.Kind == "fire") { title = Strings.Get("camp.fire"); verb = "camp"; }
                else if (m.Kind == "seat") { title = Strings.Get("seat.chair"); verb = "sit"; }
                else if (m.Kind == "talk")
                {
                    if (map?.Talk == null || !map.Talk.TryGetValue(m.Id, out var t)) continue;
                    title = t.Name; verb = "look";
                }
                else
                {
                    if (map?.Containers == null || !map.Containers.TryGetValue(m.Id, out var c)) continue;
                    title = c.Name; verb = "open";
                }
                var it = Interactable.Add(m.gameObject, m.Id, title, 0.5f, 1.2f, verb);
                it.Chosen += (thing, v) => StartCoroutine(Use(thing, v, map?.Id ?? placeId, map));
                n++;
            }
            _equipped[place] = n;
        }

        /// <summary>How near a thing must be to be used (metres, on the ground).</summary>
        public const float Reach = 2.5f;

        /// <summary>A thing used: the walker goes over and faces it (out of reach, it says so), then a container opens (or its lock holds) and a
        /// talking prop's conversation begins.</summary>
        public IEnumerator Use(Interactable thing, string verb, string placeId, MapDef map)
        {
            if (Walker == null || thing == null) yield break;
            var at = thing.transform.position;
            var away = Walker.transform.position - at;
            away.y = 0f;
            // a chair is sat on from its front (-z at its yaw); anything else is used from the walker's side of it
            var front = thing.transform.rotation * Vector3.back;
            var spot = verb == "sit" ? at + front * 0.75f : at + (away.sqrMagnitude > 0.01f ? away.normalized : thing.transform.forward) * 1.0f;
            if (Walker.GoTo(spot))
            {
                var t0 = Time.time;
                while (Walker != null && Walker.Goal != null && Time.time - t0 < 30f) yield return null;
            }
            if (Walker == null || thing == null) yield break;
            var off = at - Walker.transform.position;
            off.y = 0f;
            if (off.magnitude > Reach) { Said?.Invoke(Strings.Get("loot.cannot_reach")); yield break; }
            var face = at - Walker.transform.position;
            face.y = 0f;
            if (face.sqrMagnitude > 0.01f) Walker.transform.rotation = Quaternion.LookRotation(face, Vector3.up);
            if (verb == "sit")
            {
                // the hips over the seat, a hand's breadth forward of its middle, facing out of the chair; on the floor the
                // walker stands on (a place's markers lie at its ground; a room's floor is higher)
                var seat = at + front * 0.06f;
                seat.y = Walker.transform.position.y;
                // (a chair's sit is a woman's capture, CMU 114: a man takes the stool's, CMU 13, until a man's is captured)
                Walker.Sit(SecondFace.Game.People.Pace.Female(Walker.Animator) ? "sit" : "sit_stool", seat, thing.transform.eulerAngles.y + 180f);
                yield break;
            }
            if (verb == "take")
            {
                // stoop to it, and open it as the hands reach the ground
                var stoop = Walker.PickUp();
                if (stoop > 0f) yield return new WaitForSeconds(stoop);
                if (thing != null) OpenPile(thing);
                yield break;
            }
            if (verb == "open") OpenContainer(thing, placeId, map);
            else if (verb == "look") LookAt(thing, map);
            else if (verb == "camp") OpenCamp(true);
        }

        /// <summary>Makes camp where the walker is (P6.1): out of doors anywhere, indoors at a fire (or anywhere when
        /// <paramref name="force"/>: at a fire, a bed of one's own, the content's <c>camp</c> event). In a place its map
        /// says how much game there is, whether a caravan takes letters, and its snares are kept under it; out on the
        /// land the biome says, and the snares are kept where they were set. Null when it cannot be made here (said).</summary>
        public CampScreen OpenCamp(bool force = false)
        {
            var ui = UIService.Instance;
            if (ui == null || Walker == null) return null;
            if (Camping != null && Camping.IsOpen) return Camping;
            if (!force && Indoors() && !NearFire()) { Said?.Invoke(Strings.Get("camp.not_here")); return null; }
            var at = Walker.transform.position;
            var place = Here();
            var inPlace = place != null && place.Contains(at.x, at.z);
            var mapId = inPlace ? (string.IsNullOrEmpty(place.Map) ? place.Id : place.Map) : null;
            var map = mapId != null && Registry.Maps.TryGetValue(mapId, out var md) ? md : null;
            var world = Stage != null ? Stage.World : null;
            var biome = "";
            if (world != null && world.Ready)
            {
                var b = world.Control.Sample(at.x, at.z).Biome;
                if (b >= 0 && b < world.Layout.Biomes.Length) biome = world.Layout.Biomes[b];
            }
            var name = place == null ? Strings.Get("camp.open_land")
                : inPlace ? place.Name : Strings.Get("camp.near", place.Name);
            // the walker sits on the ground (facing the fire, if there is one) while the camp is made; the world stops,
            // so the body moves on unscaled time and gets up when camp is broken; a bed of one's own is not sat by
            var fire = NearestFire();
            var sits = fire != null || !Indoors();
            if (sits) SitDown(fire);
            Camping = ui.Open(new CampScreen(new CampModel
            {
                Game = Game,
                Where = name,
                Abundance = inPlace ? map?.Hunting ?? 0 : Camp.WildGame(biome),
                TrapsAt = inPlace ? mapId : Camp.WildSpot(at.x, at.z),
                Town = inPlace && !string.IsNullOrEmpty(map?.Settlement),
                Host = Quests,
                Now = () => Stage != null && Stage.Clock != null ? Stage.Clock.Minutes : Game.Minutes,
                Then = minutes =>
                {
                    if (Stage != null && Stage.Clock != null) Stage.Clock.Minutes = minutes;
                    if (Stage != null && Stage.Sky != null) Stage.Sky.Apply();   // the world is stopped: turn the sky now
                    Quests.Update();
                },
                Talk = id =>
                {
                    var who = FindObjectsByType<Interactable>(FindObjectsSortMode.None).FirstOrDefault(i => i.Id == id);
                    if (who != null) StartCoroutine(Respond(who, "talk"));
                },
                Done = () => { if (sits) GetUp(); },
            }));
            return Camping;
        }

        /// <summary>Sits on the ground where the walker is, facing a fire if there is one (the animator on unscaled time:
        /// camp stops the world).</summary>
        private void SitDown(PlaceMarker fire)
        {
            if (Walker == null) return;
            if (Walker.Animator != null) Walker.Animator.updateMode = AnimatorUpdateMode.UnscaledTime;
            var yaw = Walker.transform.eulerAngles.y;
            if (fire != null)
            {
                var to = fire.transform.position - Walker.transform.position;
                to.y = 0f;
                if (to.sqrMagnitude > 0.01f) yaw = Quaternion.LookRotation(to, Vector3.up).eulerAngles.y;
            }
            Walker.Sit("sit_ground", Walker.Footing, yaw);
        }

        private void GetUp()
        {
            if (Walker == null) return;
            Walker.Stand();
            if (Walker.Animator != null) Walker.Animator.updateMode = AnimatorUpdateMode.Normal;
        }

        /// <summary>The walker is inside a building (or under the ground).</summary>
        public bool Indoors()
        {
            foreach (var i in FindObjectsByType<PlaceInteriors>(FindObjectsSortMode.None))
                if (i.Inside != null) return true;
            return false;
        }

        /// <summary>A fire is within reach of the walker.</summary>
        public bool NearFire() => NearestFire() != null;

        /// <summary>The nearest fire within reach of the walker (null when none).</summary>
        public PlaceMarker NearestFire()
        {
            if (Walker == null) return null;
            var p = Walker.Footing;
            PlaceMarker best = null;
            var bestD = Reach;
            foreach (var m in FindObjectsByType<PlaceMarker>(FindObjectsSortMode.None))
            {
                if (m.Kind != "fire") continue;
                var to = m.transform.position - p;
                to.y = 0f;
                if (to.magnitude <= bestD) { bestD = to.magnitude; best = m; }
            }
            return best;
        }

        /// <summary>The place the walker is nearest (null before they are set down, or with no world laid out).</summary>
        public PlaceInfo Here()
        {
            var layout = Stage != null && Stage.World != null ? Stage.World.Layout : null;
            if (layout == null || Walker == null) return null;
            var at = Walker.transform.position;
            PlaceInfo best = null;
            var d2 = float.MaxValue;
            foreach (var p in layout.Places.Values)
            {
                var d = (new Vector2(p.Centre[0], p.Centre[1]) - new Vector2(at.x, at.z)).sqrMagnitude;
                if (d < d2) { d2 = d; best = p; }
            }
            return best;
        }

        /// <summary>The conversations' host beyond the quests: their events reach the walkabout.</summary>
        private sealed class Host : LogicHost
        {
            private readonly Walkabout _w;
            public Host(Walkabout w) { _w = w; }
            public override void Event(string name, Newtonsoft.Json.Linq.JToken data) => _w.OnEvent(name, data);
        }

        /// <summary>An event from the content (a choice's effect, a quest's, a trigger's; port of the web game's dialogue
        /// and logic hosts): camp (a bed of one's own); trade with whoever is being talked to; everyone healed; someone
        /// comes to talk; a move to another map (goto); a fight with whoever has turned (combat) or with the person talked
        /// to (fight; a pit bout with <c>{ pit: { win, lose } }</c>); another conversation (dialogue); a recorded memory
        /// (reverie: the picture turns cold while it plays); a title card (title); a save the story keeps (save: made at
        /// once); a closing page's still (slide); the credits (credits). The rest go to <see cref="Asked"/>. What opens a
        /// screen or moves the player waits for the conversation to close first, and a conversation asked for with a move
        /// waits for the arrival (arrive, then talk).</summary>
        private void OnEvent(string name, Newtonsoft.Json.Linq.JToken data)
        {
            // the person being talked to: only while their conversation is open (a quest's or a trigger's effect later has
            // nobody across from the player, as the web game's dialogue host had it)
            var who = Conversation != null && Conversation.IsOpen ? _speaking : null;
            switch (name)
            {
                case "camp": StartCoroutine(AfterTalk(() => OpenCamp(true))); break;
                case "barter":
                    if (who != null) StartCoroutine(AfterTalk(() => OpenTrade(who)));
                    break;
                case "heal": Camp.HealAll(Game); break;
                case "talk":
                    // someone comes to talk (a trigger: the stranger at the door, the riders in the square)
                    StartCoroutine(Comes(data?["npc"]?.ToString()));
                    break;
                case "goto":
                    var order = GotoOrder.From(data);
                    if (order != null)
                    {
                        // (counted now: a conversation asked for in the same breath waits for the arrival)
                        _movesAsked++;
                        StartCoroutine(AfterTalk(() => { _movesAsked--; Move(order); }));
                    }
                    break;
                case "combat":
                    // a word, a quest or a trigger turned someone: the hostility is tested again and whoever turned fights
                    // (as the web game's: the conversation is not cut short; the fight starts as it closes)
                    if (Combat != null) Provoke(null, null, false);
                    break;
                case "fight":
                    // with the person being talked to: they turn on the player now, or square up for a pit bout
                    var person = who != null ? who.GetComponent<Townsperson>() : null;
                    if (person == null || Combat == null) { Debug.LogWarning("Walkabout: a fight asked for with nobody being talked to"); break; }
                    var pit = PitTerms.From(data);
                    if (pit == null) Combat.Turn(person);
                    Provoke(person, pit, true);
                    break;
                case "dialogue":
                    var tree = (string)data?["tree"];
                    if (string.IsNullOrEmpty(tree)) break;
                    // the closing pages ask for themselves again to turn a page: on their own screen, in place
                    if (Core.World.Epilogue.Is(tree) && Epilogue != null && Epilogue.IsOpen) { Epilogue.TurnAsked = true; break; }
                    // arrive, then talk: with a move asked in the same breath, the tree opens where the move sets the player down
                    StartCoroutine(AfterTalkAndMove(() => OpenTree(tree, (string)data["name"] ?? "")));
                    break;
                case "reverie":
                    var memory = (string)data?["tree"];
                    if (!string.IsNullOrEmpty(memory)) StartCoroutine(AfterTalkAndMove(() => OpenReverie(memory, (string)data["name"])));
                    break;
                case "save":
                    // a save the story keeps under its own name: made now, before the effects listed after it
                    var named = NamedSave.From(data);
                    if (named != null) SaveAsked?.Invoke(named);
                    else Debug.LogWarning($"Walkabout: a save asked for in no slot the game keeps ({data})");
                    break;
                case "slide":
                    // a closing page's still: where it is composed, who is in it, the light
                    LastSlide = SlideData.From(data);
                    if (Epilogue != null && Epilogue.IsOpen && LastSlide != null && Still != null) Still.Show(LastSlide);
                    break;
                case "credits":
                    // the closing page's last word: the credits roll, then the title (the named save stays)
                    StartCoroutine(AfterTalk(RollCredits));
                    break;
                case "title":
                    ShowTitle((string)data?["text"] ?? "");
                    break;
                case "surgery":
                    // the surgeon's table, with whoever is being talked to (a mender with a surgeon's stock)
                    if (who != null) StartCoroutine(AfterTalk(() => OpenSurgery(who)));
                    break;
                case "dust":
                    // a game of Dust with whoever is being talked to: a stake each, or a prize
                    var terms = DustTerms.From(data);
                    if (who != null) StartCoroutine(AfterTalk(() => OpenDust(who, terms)));
                    break;
                default: Asked?.Invoke(name, data); break;
            }
        }

        /// <summary>The fight the content asked for starts once the conversation has closed (<paramref name="close"/>: closed
        /// for it, as a word that comes to blows ends the talk; Combat <see cref="Combat.Provoke"/>); whoever was being
        /// talked to stays with the player meanwhile.</summary>
        private void Provoke(Townsperson target, PitTerms pit, bool close)
        {
            _provoking++;
            IEnumerator Run()
            {
                try
                {
                    yield return null;   // (the choice that asked runs to its end first)
                    if (close && Conversation != null && Conversation.IsOpen) Conversation.Close();
                    while (Conversation != null && Conversation.IsOpen) yield return null;
                    yield return Combat.Provoke(target, pit);
                }
                finally { _provoking--; }
            }
            StartCoroutine(Run());
        }
        private int _provoking;

        /// <summary>A conversation with no face (a door, a camp's approach, a memory): the tree under a name. Null when the
        /// tree is unknown or has nothing to say now.</summary>
        public DialoguePanel OpenTree(string tree, string name)
        {
            var ui = UIService.Instance;
            if (ui == null || string.IsNullOrEmpty(tree) || !Registry.Dialogues.TryGetValue(tree, out var def)) return null;
            // the closing pages have a screen of their own
            if (Core.World.Epilogue.Is(tree)) { OpenEpilogue(name); return null; }
            ClockToGame();
            var before = Game.Minutes;   // (the first line's own effects may move the clock: followed from before them)
            var runner = new DialogueRunner(def, Game, Quests);
            if (runner.Ended) return null;
            _speaking = null;
            var panel = new DialoguePanel(runner, id => SpeakerName(id, def, name));
            TimeFollows(panel, before);
            Conversation = ui.Open(panel);
            return panel;
        }

        // ---- the closing pages (Core Epilogue) -----------------------------------------------------------------------

        /// <summary>The closing pages' screen while it is open (null before).</summary>
        public EpilogueScreen Epilogue { get; private set; }
        /// <summary>The still beside the closing pages (null before the first).</summary>
        public SlideStill Still { get; private set; }
        /// <summary>The last still the content asked for (the <c>slide</c> event).</summary>
        public SlideData LastSlide { get; private set; }
        /// <summary>The story keeps a save (the content's <c>save</c> event): made at once, the game as it stands.</summary>
        public event System.Action<NamedSave> SaveAsked;
        /// <summary>A closing page was turned (the game keeps a save: a load opens on the next page).</summary>
        public event System.Action PageTurned;
        /// <summary>The credits are to roll: the game is over (the title follows; the named save stays).</summary>
        public event System.Action Finished;

        /// <summary>Opens the closing pages on their own screen (the content's epilogue tree, page after page in place, its
        /// still composed beside each page), or turns to the next page if it is open. Null without the tree or a UI.</summary>
        public EpilogueScreen OpenEpilogue(string name = null)
        {
            var ui = UIService.Instance;
            if (ui == null || !Registry.Dialogues.TryGetValue(Core.World.Epilogue.Tree, out var def)) return null;
            if (Epilogue != null && Epilogue.IsOpen) return Epilogue;
            ClockToGame();
            Game.Flags[Core.World.Epilogue.OpenFlag] = true;
            _speaking = null;
            if (Still == null) { Still = gameObject.AddComponent<SlideStill>(); Still.Walkabout = this; }
            var screen = new EpilogueScreen(new EpilogueModel
            {
                Open = () => new DialogueRunner(def, Game, Quests),
                Slide = () => LastSlide,
                Compose = slide => { if (slide != null) Still.Show(slide); },
                Turned = () => { Quests.Update(); PageTurned?.Invoke(); },
                Name = id => SpeakerName(id, def, name ?? ""),
            });
            screen.Ended += () => { if (Still != null) Still.End(); };
            Epilogue = ui.Open(screen);
            return screen;
        }

        /// <summary>The credits roll: the closing pages close, the game is no longer in its epilogue, and whoever runs the
        /// game shows the credits and then the title (<see cref="Finished"/>).</summary>
        private void RollCredits()
        {
            Game.Flags.Remove(Core.World.Epilogue.OpenFlag);
            if (Epilogue != null && Epilogue.IsOpen) Epilogue.Close();
            if (Still != null) Still.End();
            Finished?.Invoke();
        }

        /// <summary>A speaker's name in a conversation with no face: nobody's for the narrator, the player's own, a person's
        /// from the content, the tree's name for its owner.</summary>
        private string SpeakerName(string id, DialogueDef def, string title)
        {
            if (string.IsNullOrEmpty(id) || id == "narrator") return "";
            if (id == "pc") return string.IsNullOrEmpty(Game.Pc.Sheet.Name) ? Strings.Get("dialogue.you") : Game.Pc.Sheet.Name;
            if (Registry.Npcs.TryGetValue(id, out var n) && !string.IsNullOrEmpty(n.Name)) return n.Name;
            return id == def.Owner || string.IsNullOrEmpty(def.Owner) ? title : id;
        }

        /// <summary>The cold picture while a recorded memory plays (null until the first).</summary>
        public SecondFace.Game.World.Reverie Reverie { get; private set; }
        /// <summary>A recorded memory is playing (the picture is cold).</summary>
        public bool InReverie => Reverie != null && Reverie.On;

        /// <summary>A recorded memory (the content's <c>reverie</c>): the picture turns cold, washed and grainy (a
        /// post-processing volume over the look), the memory's tree plays under its name, and the picture comes back when
        /// it ends. Null when the tree has nothing to say.</summary>
        public DialoguePanel OpenReverie(string tree, string name)
        {
            if (Reverie == null) Reverie = SecondFace.Game.World.Reverie.Create(transform);
            Reverie.Begin();
            var panel = OpenTree(tree, string.IsNullOrEmpty(name) ? Strings.Get("reverie.title") : name);
            if (panel == null) { Reverie.End(); return null; }
            panel.Reverie = true;
            panel.Ended += () => { if (Reverie != null) Reverie.End(); };
            return panel;
        }

        /// <summary>The title card up now (a chapter's, an act's; null when none).</summary>
        public TitleCard Title { get; private set; }
        private readonly System.Collections.Generic.Queue<string> _titles = new();
        private bool _titling;

        /// <summary>A title card over the world (the content's <c>title</c>: a chapter begins, an act ends): its first line
        /// small over the rest, for a few seconds, then it fades. Each waits for the conversation that raised it to close
        /// and for the card before it to go, so each stands alone.</summary>
        public void ShowTitle(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return;
            _titles.Enqueue(text);
            if (!_titling) StartCoroutine(Titles());
        }

        /// <summary>How long a title card stays, seconds (real time: a camp or a menu does not hold it).</summary>
        public const float TitleSeconds = 5f;

        private IEnumerator Titles()
        {
            _titling = true;
            try
            {
                while (_titles.Count > 0)
                {
                    yield return null;
                    while (Conversation != null && Conversation.IsOpen) yield return null;
                    var ui = UIService.Instance;
                    var text = _titles.Dequeue();
                    if (ui == null) continue;
                    var card = Title = ui.Open(TitleCard.Chapter(text));
                    var t0 = Time.unscaledTime;
                    while (card.IsOpen && Time.unscaledTime - t0 < TitleSeconds - TitleCard.FadeSeconds) yield return null;
                    card.FadeOut();
                    t0 = Time.unscaledTime;
                    while (card.IsOpen && Time.unscaledTime - t0 < TitleCard.FadeSeconds) yield return null;
                    // (only the card goes: a conversation opened over it meanwhile stays)
                    if (card.IsOpen) ui.Dismiss(card);
                    if (Title == card) Title = null;
                }
            }
            finally { _titling = false; }
        }

        /// <summary>Someone comes to talk: once they stand (the trigger that brings them may have just placed them, and the
        /// people service stands a few a frame), their conversation opens; a few seconds at most.</summary>
        private IEnumerator Comes(string id)
        {
            if (string.IsNullOrEmpty(id)) yield break;
            yield return null;   // (a move asked in the same breath is counted)
            yield return Arrived();
            var t = Time.unscaledTime;
            Interactable it = null;
            while (Time.unscaledTime - t < 8f)
            {
                var person = People?.StandingPeople.FirstOrDefault(p => p.Def != null && (p.Def.Id == id || p.Id == id));
                it = person != null ? person.GetComponent<Interactable>() : null;
                if (it != null) break;
                yield return null;
            }
            if (it == null) { Debug.LogWarning($"Walkabout: {id} was to come and talk, and is not standing"); yield break; }
            while (Conversation != null && Conversation.IsOpen) yield return null;
            yield return Respond(it, "talk");
        }

        /// <summary>Closes the conversation (after the choice that asked has run) and then does something.</summary>
        private IEnumerator AfterTalk(System.Action then)
        {
            yield return null;
            if (Conversation != null && Conversation.IsOpen) Conversation.Close();
            then();
        }

        /// <summary>The content's moves asked for and not yet begun (a goto waits a frame for its conversation to close).</summary>
        private int _movesAsked;
        /// <summary>A move the content asked for is pending or under way (the walker not yet set down where it goes).</summary>
        public bool MoveUnderWay => _movesAsked > 0 || (Begun && !Placed);

        /// <summary>Waits until no move is pending or under way (the walker set down where the content sent them), a load's
        /// time at most.</summary>
        private IEnumerator Arrived()
        {
            var t0 = Time.unscaledTime;
            while (MoveUnderWay && Time.unscaledTime - t0 < LoadTimeout) yield return null;
        }

        /// <summary>As <see cref="AfterTalk"/>, and arrive first: a conversation asked for with a move (an exit carrying a
        /// goto and a dialogue: arrive, then talk) opens once the walker stands where the move set them down.</summary>
        private IEnumerator AfterTalkAndMove(System.Action then)
        {
            yield return null;   // (the choice that asked runs to its end: a move asked with it is counted)
            if (Conversation != null && Conversation.IsOpen) Conversation.Close();
            if (MoveUnderWay)
            {
                yield return Arrived();
                yield return null;   // (the place's people and things stood up in the frame of the setting down)
            }
            then();
        }

        /// <summary>Opens a container on the loot screen (a lock is tried first: two minutes a try, the result said);
        /// null when it held or there is no such container.</summary>
        public LootScreen OpenContainer(Interactable thing, string placeId, MapDef map)
        {
            var ui = UIService.Instance;
            if (ui == null || thing == null || map?.Containers == null || !map.Containers.TryGetValue(thing.Id, out var def)) return null;
            var rng = new Rng(Game.RngState != 0 ? Game.RngState : 1u);
            var o = Containers.Open(Game, placeId, thing.Id, def, rng);
            Game.RngState = rng.State;
            if (!o.Open)
            {
                var check = o.Check.GetValueOrDefault();
                Said?.Invoke(Strings.Get("loot.locked", check.Value, check.Dc));
                return null;
            }
            if (o.Picked) Said?.Invoke(Strings.Get("loot.picked", o.Xp));
            // someone else's (P6.3): whose it is, who is watching as it opens; what is taken from it is a theft, seen or not
            var model = new LootModel { Name = o.Name, Container = o.Inv, Pc = Game.Pc };
            var owner = Owners.Now(Game, map, thing.Id, OwnersOf(map));
            if (owner != null)
            {
                model.Owner = NameOf(owner);
                var seeing = Watch != null ? Watch.Seeing() : new System.Collections.Generic.List<Townsperson>();
                var witnesses = seeing.Select(p => p.Def != null ? p.Def.Id : p.Id).ToList();
                if (seeing.Count > 0) model.Seen = string.Join(", ", seeing.Select(p => NameOf(p.Def != null ? p.Def.Id : p.Id)));
                model.Stolen = worth =>
                {
                    Theft.Taken(Game, map.Id, map.Name, owner, witnesses, worth);
                    if (seeing.Count > 0) Said?.Invoke(Strings.Get("loot.seen_taking", NameOf(witnesses[0])));
                };
            }
            Loot = ui.Open(new LootScreen(model));
            return Loot;
        }

        private readonly System.Collections.Generic.Dictionary<string, PlacePlan> _plans = new();

        /// <summary>Whose each of a map's containers is now (Core <see cref="Owners"/>: the map's rooms worked out once, their
        /// keepers by who stands there in this game).</summary>
        private System.Collections.Generic.Dictionary<string, string> OwnersOf(MapDef map)
        {
            if (map == null) return null;
            // (rooms as the place is built: a city district's border is its map's edge, not a wall round one room)
            if (!_plans.TryGetValue(map.Id, out var plan)) _plans[map.Id] = plan = PlacePlan.Build(CityKit.Prepare(map));
            return Owners.Of(map, plan, Game);
        }

        /// <summary>A person's name as the content has it (their id when it has none).</summary>
        private static string NameOf(string npc)
        {
            if (npc != null && Registry.Npcs.TryGetValue(npc, out var d) && !string.IsNullOrEmpty(d.Name)) return d.Name;
            return Bootstrap.Content?.Entry("npcs", npc)?["name"]?.ToString() ?? npc;
        }

        /// <summary>A pile on the ground on the loot screen (its bundle goes when it is emptied); null when there is none.</summary>
        public LootScreen OpenPile(Interactable thing)
        {
            var ui = UIService.Instance;
            if (ui == null || thing == null || !Game.Containers.TryGetValue(thing.Id, out var inv) || inv == null) return null;
            Loot = ui.Open(new LootScreen(new LootModel
            {
                Name = Strings.Get("ground.title"), Container = inv, Pc = Game.Pc,
                Done = () => { if (Piles != null) Piles.Sync(Game); },
            }));
            return Loot;
        }

        /// <summary>Drops some of a carried stack where the walker stands (into a pile near by, or a new one, its bundle
        /// laid down); null when nothing was dropped.</summary>
        public Pile Drop(int index, int count)
        {
            if (Walker == null) return null;
            var at = Walker.transform.position + Walker.transform.forward * 0.45f;   // at the feet, a little ahead
            at.y = Walker.transform.position.y;
            var pile = Ground.Drop(Game, Game.Pc.Inventory, index, count, at.x, at.y, at.z);
            if (pile != null && Piles != null) Piles.Sync(Game);
            return pile;
        }

        /// <summary>The game's minutes as the world's clock has them (before a conversation reckons with the time).</summary>
        private void ClockToGame()
        {
            if (Stage != null && Stage.Clock != null) Game.Minutes = Stage.Clock.Minutes;
        }

        /// <summary>A conversation's time effects (a watch until ten, a sleep to dawn) move the world's clock, after each line
        /// and when it ends: the choice that moves the time often ends the conversation ("I'll take the lamp", "Sleep until
        /// morning"), and followed only line by line its jump was lost (the watch began at seven in the morning, the cot slept
        /// no night away; KnockPlaythroughTests, 2026-11-16).</summary>
        /// <remarks>Followed from <paramref name="before"/>, the game's minutes before the conversation's runner was made:
        /// its first line's own effects (a node that opens on "until dusk") moved the clock before the panel was there. The
        /// light turns with each jump while the page is open (Core <see cref="SkyTurn"/>).</remarks>
        private void TimeFollows(DialoguePanel panel, double before)
        {
            var minutes = before;
            void Follow()
            {
                Quests.Update();   // a choice's effects may move a quest on
                if (Stage != null && Stage.Clock != null && Game.Minutes != minutes)
                {
                    var from = Stage.Clock.Minutes;
                    Stage.Clock.Minutes += Game.Minutes - minutes;
                    minutes = Game.Minutes;
                    TurnSky(from);
                }
            }
            panel.Presented += _ => Follow();
            panel.Ended += () => { Follow(); Settle(); };
        }

        /// <summary>The light turns to the world clock's new time (from <paramref name="fromMinutes"/>), over a second or
        /// two of real time.</summary>
        private void TurnSky(double fromMinutes)
        {
            if (Stage == null || Stage.Sky == null || Stage.Clock == null) return;
            Stage.Sky.Turn(SkyTurn.Seconds(fromMinutes, Stage.Clock.Minutes));
        }

        // ---- after a fight -------------------------------------------------------------------------------------------

        /// <summary>A fight is over: once the walkabout is free again (its last line said, the beaten back up, the story
        /// settled), the triggers under the player are tested at once: what the fight's end made true (its dead, a
        /// beaten outcome) fires where the player stands, not on their next step.</summary>
        private IEnumerator AfterFight()
        {
            var t0 = Time.unscaledTime;
            yield return null;
            while (Busy && Time.unscaledTime - t0 < 10f) yield return null;
            if (Triggers != null) Triggers.CheckNow();
        }

        /// <summary>The place's dressing by the story (Core <see cref="Core.World.Dressing"/>; null until the walker is first
        /// set down).</summary>
        public PlaceDressing Dressing { get; private set; }

        /// <summary>A talking prop's conversation (a sign, the pumps, a bed): false when it has none to give.</summary>
        public bool LookAt(Interactable thing, MapDef map)
        {
            var ui = UIService.Instance;
            if (ui == null || thing == null || map?.Talk == null || !map.Talk.TryGetValue(thing.Id, out var talk)
                || !Registry.Dialogues.TryGetValue(talk.Dialogue, out var def)) return false;
            ClockToGame();
            var before = Game.Minutes;
            var runner = new DialogueRunner(def, Game, Quests);
            if (runner.Ended) return false;
            _speaking = null;
            var panel = new DialoguePanel(runner, _ => talk.Name);
            TimeFollows(panel, before);
            Conversation = ui.Open(panel);
            return true;
        }

        /// <summary>The town is known, and the places its roads lead to (the walkabout's map starts with them).</summary>
        private void Know(string town)
        {
            var known = Game.World.KnownLocations;
            if (!known.Contains(town)) known.Add(town);
            foreach (var r in Registry.WorldMap.Routes)
            {
                var other = r.A == town ? r.B : r.B == town ? r.A : null;
                if (other == null || known.Contains(other)) continue;
                if (Registry.WorldMap.Locations.TryGetValue(other, out var l) && l.Hidden == true) continue;
                known.Add(other);
            }
        }

        /// <summary>The radial over the nearest person or thing within reach, those ahead first (the pad's act button).</summary>
        public bool ActNearest(float reach = 4f)
        {
            if (Walker == null || Stage == null || Stage.Camera == null) return false;
            Interactable best = null;
            var bestScore = float.MaxValue;
            var p = Walker.transform.position;
            var fwd = Walker.transform.forward;
            foreach (var it in FindObjectsByType<Interactable>(FindObjectsSortMode.None))
            {
                var to = it.transform.position - p;
                to.y = 0f;
                var d = to.magnitude;
                if (d > reach) continue;
                var score = d * (d < 0.01f || Vector3.Dot(fwd, to / d) > 0.3f ? 1f : 2f);
                // (the party is always within reach: one of them is acted on only when no one else is near)
                if (Party != null && Party.Holds(it)) score *= 3f;
                if (score < bestScore) { bestScore = score; best = it; }
            }
            if (best == null) return false;
            var screen = Stage.Camera.WorldToScreenPoint(best.transform.position + Vector3.up * 1.2f);
            OnTapped(best, new Vector2(screen.x, screen.y));
            return true;
        }

        /// <summary>The radial over a tapped person (or thing).</summary>
        private void OnTapped(Interactable it, Vector2 screen)
        {
            if (Combat != null && Combat.Tapped(it, screen)) return;
            var ui = UIService.Instance;
            if (ui == null) { it.Choose(it.Verbs.FirstOrDefault()); return; }
            var verbs = it.Verbs.Select(v => new RadialVerb(v, !it.Closed.Contains(v))).ToList();
            ui.Open(new RadialMenu(ui.ToPanel(screen), it.Title, verbs, it.Choose));
        }

        /// <summary>The townsfolk answer a verb: talk brings the walker over and the person turns and talks; look has
        /// them meet each other's eyes and the person waves.</summary>
        public IEnumerator Respond(Interactable who, string verb)
        {
            // their routine waits while they deal with the walker
            var townsperson = who != null ? who.GetComponent<Townsperson>() : null;
            if (townsperson != null)
            {
                townsperson.Held = true;
                if (townsperson.Agent != null && townsperson.Agent.enabled && townsperson.Agent.isOnNavMesh) townsperson.Agent.ResetPath();
            }
            _responding++;
            try { yield return Responding(who, verb); }
            finally { _responding--; }
            if (townsperson != null) townsperson.Held = false;
            Settle();
        }

        private IEnumerator Responding(Interactable who, string verb)
        {
            if (Walker == null || who == null) yield break;
            var person = who.transform;
            var anim = who.GetComponentInChildren<Animator>();
            var gaze = anim != null ? anim.GetComponent<Gaze>() : null;
            var ambient = anim != null ? anim.GetComponent<Ambient>() : null;
            var walkerAnim = Walker.GetComponentInChildren<Animator>();
            var walkerGaze = walkerAnim != null ? walkerAnim.GetComponent<Gaze>() : null;
            var head = anim != null && anim.isHuman ? anim.GetBoneTransform(HumanBodyBones.Head) : person;
            var walkerHead = walkerAnim != null && walkerAnim.isHuman ? walkerAnim.GetBoneTransform(HumanBodyBones.Head) : Walker.transform;
            if (verb == "talk" || verb == "trade")
            {
                var away = Walker.transform.position - person.position;
                away.y = 0;
                var spot = person.position + (away.sqrMagnitude > 0.01f ? away.normalized : person.forward) * 1.3f;
                if (Walker.GoTo(spot))
                {
                    var t0 = Time.time;
                    while (Walker != null && Walker.Goal != null && Time.time - t0 < 10f) yield return null;
                }
                if (Walker == null || person == null) yield break;
                yield return Face(person, Walker.transform.position);
            }
            if (person == null) yield break;
            if (gaze != null) gaze.Target = walkerHead;
            if (walkerGaze != null) walkerGaze.Target = head;
            if (ambient != null) ambient.Gesture(verb == "talk" ? "talk" : "wave");   // not ?. on a component
            if (verb == "talk" && OpenConversation(who))
            {
                while (Conversation != null && Conversation.IsOpen) yield return null;
                // what the conversation asked for with them (a trade, a table, a fight) opens as it closes: they stay with
                // the player until it is done
                for (var i = 0; i < 2; i++) yield return null;
                while (With(who)) yield return null;
            }
            else if (verb == "trade" && OpenTrade(who))
                while (Trade != null && Trade.IsOpen) yield return null;
            else yield return new WaitForSeconds(6f);
            if (gaze != null && gaze.Target == walkerHead) gaze.Target = null;
            if (walkerGaze != null && walkerGaze.Target == head) walkerGaze.Target = null;
        }

        /// <summary>Something is on with this person: a trade or a table with them, or a fight.</summary>
        private bool With(Interactable who) =>
            (_with == who && ((Trade != null && Trade.IsOpen) || (Table != null && Table.IsOpen))) || _provoking > 0 || (Combat != null && Combat.Active);
        /// <summary>Who the trade or the table open now is with.</summary>
        private Interactable _with;

        /// <summary>Turns a person to face a point (the conversation turn), over a time that grows with the turn (half a
        /// second for a glance round, 1.3 s for about-face) so their feet step round (FootPlant). The motion and posture gate
        /// plays this (docs/PEOPLE_MOTION.md §2.3).</summary>
        public static IEnumerator Face(Transform person, Vector3 point, float seconds = -1f)
        {
            var to = point - person.position;
            to.y = 0;
            if (to.sqrMagnitude <= 0.01f) yield break;
            var from = person.rotation;
            var goal = Quaternion.LookRotation(to.normalized, Vector3.up);
            // (a person turns about a second for 180°: at 1.3 s the gate's conversation turn found the chest still 20-23° off
            // the one who spoke, T1, 2026-11-06)
            if (seconds <= 0f) seconds = Mathf.Lerp(0.5f, 1.05f, Quaternion.Angle(from, goal) / 180f);
            for (var t = 0f; t < 1f && person != null; t += Time.deltaTime / seconds)
            {
                person.rotation = Quaternion.Slerp(from, goal, Mathf.SmoothStep(0f, 1f, t));
                yield return null;
            }
            if (person != null) person.rotation = goal;
        }

        /// <summary>Opens a person's conversation from the content in the panel (false when they have none): their own, or
        /// <paramref name="tree"/> with them.</summary>
        public bool OpenConversation(Interactable who, string tree = null)
        {
            var ui = UIService.Instance;
            var npc = NpcOf(who);
            tree ??= who.GetComponent<Townsperson>()?.Placement?.Dialogue ?? npc?.Dialogue;   // a placement may say other things
            if (ui == null || npc == null || string.IsNullOrEmpty(tree) || !Registry.Dialogues.TryGetValue(tree, out var def)) return false;
            ClockToGame();
            var before = Game.Minutes;
            var runner = new DialogueRunner(def, Game, Quests);
            if (runner.Ended) return false;
            _speaking = who;
            var face = who.GetComponentInChildren<Animator>() != null ? who.gameObject : null;
            var panel = new DialoguePanel(runner,
                id => Registry.Npcs.TryGetValue(id, out var n) && !string.IsNullOrEmpty(n.Name) ? n.Name : who.Title,
                id => id == who.Id && face != null ? Portraits.Of(face) : null);
            // the conversation view (CLAUDE.md §2, overhead always): the game view eases closer over the two of them and
            // stays there, line after line; no cuts, never eye level
            if (Stage.Camera != null && Walker != null)
            {
                var shots = ConversationCamera.Begin(Stage.Camera, Walker.transform, who.transform);
                panel.Ended += () => { if (shots != null) shots.End(); };
            }
            TimeFollows(panel, before);
            Conversation = ui.Open(panel);
            return true;
        }

        /// <summary>Opens a merchant's barter table, their face across it (false when they keep no stall).</summary>
        public bool OpenTrade(Interactable who)
        {
            var ui = UIService.Instance;
            var npc = NpcOf(who);
            if (ui == null || npc == null || npc.Merchant == null) return false;
            var face = who.GetComponentInChildren<Animator>() != null ? who.gameObject : null;
            _with = who;
            Trade = ui.Open(new BarterScreen(new BarterModel
            {
                Game = Game, MerchantId = npc.Id, Def = npc.Merchant, Name = string.IsNullOrEmpty(npc.Name) ? who.Title : npc.Name,
                Settlement = string.IsNullOrEmpty(npc.Settlement) ? "shale" : npc.Settlement, Face = face != null ? Portraits.Of(face) : null,
            }));
            return true;
        }

        /// <summary>The world's clock as the tables read it (it leads while walking), and what passing time on it does: the sky
        /// turns now (a table may stop the world), the quests look again.</summary>
        private double ClockNow() => Stage != null && Stage.Clock != null ? Stage.Clock.Minutes : Game.Minutes;

        private void ClockTo(double minutes)
        {
            if (Stage != null && Stage.Clock != null) Stage.Clock.Minutes = minutes;
            if (Stage != null && Stage.Sky != null) Stage.Sky.Apply();
            Quests.Update();
        }

        /// <summary>Opens a surgeon's table with their face across it (null when they keep none): Game
        /// <see cref="SurgeryScreen"/> on Core <see cref="Surgery"/>; the hours an operation takes pass on the world's clock.</summary>
        public SurgeryScreen OpenSurgery(Interactable who)
        {
            var ui = UIService.Instance;
            var npc = NpcOf(who);
            if (ui == null || npc == null || npc.Surgeon == null) return null;
            var face = who.GetComponentInChildren<Animator>() != null ? who.gameObject : null;
            _with = who;
            var screen = ui.Open(new SurgeryScreen(new SurgeryModel
            {
                Game = Game, SurgeonId = npc.Id, Def = npc, Name = string.IsNullOrEmpty(npc.Name) ? who.Title : npc.Name,
                Face = face != null ? Portraits.Of(face) : null,
                Now = ClockNow, Then = ClockTo,
                Said = line => Said?.Invoke(line),
            }));
            Table = screen;
            return screen;
        }

        /// <summary>Sits down to Dust with someone, their face over the table (null when they cannot: the player or they
        /// short of the stake, said): both put the stake in the pot (Core <see cref="Dust.Ante"/>), the game is played on
        /// Game <see cref="DustScreen"/>, and the pot or the prize is paid the moment it is decided.</summary>
        public DustScreen OpenDust(Interactable who, DustTerms terms)
        {
            var ui = UIService.Instance;
            var npc = NpcOf(who);
            if (ui == null || npc == null || terms == null) return null;
            var name = string.IsNullOrEmpty(npc.Name) ? who.Title : npc.Name;
            var refusal = Dust.CanSit(Game, npc, terms);
            if (refusal != null)
            {
                Said?.Invoke(refusal == "you_short" ? Strings.Get("dust.you_short", terms.Stake) : Strings.Get("dust.they_short", name));
                return null;
            }
            Dust.Ante(Game, npc, terms);
            var face = who.GetComponentInChildren<Animator>() != null ? who.gameObject : null;
            _with = who;
            var screen = ui.Open(new DustScreen(new DustModel
            {
                Game = Game, Npc = npc, Name = name, Face = face != null ? Portraits.Of(face) : null, Terms = terms, Host = Quests,
                Said = line => Said?.Invoke(line),
                Settled = () => Quests.Update(),
            }));
            Table = screen;
            return screen;
        }

        /// <summary>Who someone in the world is: their routine's person, else the definition named by their id.</summary>
        private static NpcDef NpcOf(Interactable who)
        {
            var person = who != null ? who.GetComponent<Townsperson>() : null;
            if (person != null && person.Def != null) return person.Def;
            return who != null && Registry.Npcs.TryGetValue(who.Id, out var d) ? d : null;
        }

        private void Update()
        {
            // while a load sets the walker down elsewhere the world streams round where they are going, not where they were
            if (!Paused && Walker != null && _down == _placing) Stage.World.Focus = Walker.transform.position;
            if (Begun && Walker != null && Time.timeScale > 0f) Game.PlaytimeSec += Time.unscaledDeltaTime;
            if (Ready && Time.unscaledTime >= _nextVisit) { _nextVisit = Time.unscaledTime + 0.5f; Visit(); }
        }

        private float _nextVisit;

        /// <summary>The place the walker stands in is where the game is (the web game's map entry): its id the game's
        /// location, the place known on the map, and its maps visited (<c>visited_&lt;map&gt;</c>, which the story's
        /// "reach Shale", "go to the overpass" wait for), however the walker came there: on foot or by the map.</summary>
        public void Visit()
        {
            if (_down != _placing) return;   // (a setting down under way: the walker still stands where they were)
            var layout = Stage?.World?.Layout;
            if (layout == null || Walker == null || Game == null) return;
            var at = Walker.transform.position;
            foreach (var p in layout.Places.Values)
            {
                if (p.Centre == null || p.Size == null || !p.Contains(at.x, at.z, 4f)) continue;
                var changed = false;
                if (Game.LocationId != p.Id) { Game.LocationId = p.Id; changed = true; }
                if (!Game.World.KnownLocations.Contains(p.Id)) { Game.World.KnownLocations.Add(p.Id); changed = true; }
                foreach (var map in new[] { p.Map, p.Id })
                    if (!string.IsNullOrEmpty(map) && !Game.Flags.ContainsKey("visited_" + map)) { Game.Flags["visited_" + map] = true; changed = true; }
                if (changed) { Quests.Update(); Party?.Sync(); People?.Refresh(); if (Dressing != null) Dressing.Refresh(); }
                return;
            }
        }

        /// <summary>Hands the camera to someone else (the measuring tour) or takes it back.</summary>
        public void Pause(bool paused)
        {
            Paused = paused;
            if (Input != null) Input.enabled = !paused;
            if (Stage.Camera.TryGetComponent<Unity.Cinemachine.CinemachineBrain>(out var brain)) brain.enabled = !paused;
            if (!paused && Rig != null) Rig.Snap();
        }

        /// <summary>The world line for the overlay.</summary>
        public string Line()
        {
            var nav = Nav == null ? "no mesh" : Nav.Ready ? $"mesh ×{Nav.Builds}" : "mesh building";
            return Stage.Line() + $" · walker {(Walker == null ? "-" : Walker.Agent.isOnNavMesh ? "on" : "off")} the {nav} · {Townsfolk} people";
        }
    }
}
