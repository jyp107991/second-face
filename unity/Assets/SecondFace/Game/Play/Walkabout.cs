using System.Collections;
using System.Linq;
using SecondFace.Core.Content;
using SecondFace.Core.Dialogue;
using SecondFace.Core.Inventory;
using SecondFace.Core.Npc;
using SecondFace.Core;
using SecondFace.Core.Quest;
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
        /// <summary>How many of the world's people stand in it now (those near the walker).</summary>
        public int Townsfolk => People != null ? People.Standing : 0;
        /// <summary>The world's people keeping their routines (P6.2; null until the walker is first set down).</summary>
        public PeopleService People { get; private set; }
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
        public GameState Game { get; private set; } = States.NewGame("shale", 0, 0);
        /// <summary>A game has begun (the walker is set down once the world is in).</summary>
        public bool Begun { get; private set; }
        /// <summary>The walker was set down for the game begun last (a new game, or a load).</summary>
        public event System.Action SetDown;
        /// <summary>The quests on <see cref="Game"/>: the conversations run with it as their host, so what is said can start
        /// and move the content's quests (the notebook and the HUD follow them).</summary>
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
        /// <summary>The barter table open now (null when none).</summary>
        public BarterScreen Trade { get; private set; }

        /// <summary>What the walkabout's player carries until the opening gives them their own: the Cistern's issue worn,
        /// a pipe in hand, a zip gun and a few rounds, water, a bandage or two, jerky, salvage, a lamp and some Tolls.</summary>
        private void Kit()
        {
            var inv = Game.Pc.Inventory;
            if (inv.Items.Count > 0 || inv.Equipped.Count > 0 || Registry.Items.Count == 0) return;
            foreach (var (id, n) in new[] { ("r_jumpsuit", 1), ("w_pipe", 1), ("w_zip38", 1), ("a_38", 6), ("c_water", 2), ("c_bandage", 2), ("c_jerky", 1), ("j_scrap", 3), ("j_cloth", 2), ("t_lamp", 1) })
                if (Items.Has(id)) Inv.AddItem(inv, Inv.MakeItem(id, n));
            inv.Tolls = 40;
            Inv.Equip(inv, inv.Items.FindIndex(i => i.Def == "r_jumpsuit"));
            Inv.Equip(inv, inv.Items.FindIndex(i => i.Def == "w_pipe"));
            var zip = inv.Items.Find(i => i.Def == "w_zip38");
            if (zip != null) zip.Cond = 0.55;
            Inv.SyncGear(Game.Pc.Sheet, inv);
        }

        /// <summary>Plays a game (a new one, <paramref name="fresh"/>: it gets the starting kit; or one loaded): the walker
        /// is set down where it stood (its
        /// <see cref="GameState.Spot"/>) or at the town's spawn, in the player's own body as the character was made, once
        /// the world round them is in. Called while walking (a load), the walker goes there at once.</summary>
        public void Begin(GameState state, bool fresh = false)
        {
            Game = state ?? States.NewGame("shale", 0, 0);
            _quests = null;
            Begun = true;
            if (fresh || state == null) Kit();   // a loaded game keeps what it carries, even nothing
            Know("shale");
            if (_raised) StartCoroutine(Place());
        }

        /// <summary>The game as it stands now, for a save: where the walker is and how the camera looks at them, the hour.</summary>
        public GameState Snapshot()
        {
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
            _placing++;   // a setting down under way is dropped
            if (Walker != null) Destroy(Walker.gameObject);
            Walker = null;
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
                var centre = Stage.World.PlaceCentre("shale");
                yield return Stage.WaitAround(centre, "shale", LoadTimeout);
                if (ticket != _placing) yield break;
                var marker = Stage.Marker("shale", "spawn");
                at = marker != null ? marker.transform.position : centre;
                yaw = marker != null ? marker.transform.eulerAngles.y : 0f;
            }
            yield return Stage.WaitAround(at, People == null ? "shale" : null, LoadTimeout);
            if (ticket != _placing || Stage.Camera == null) yield break;   // left meanwhile, or the camera went with the scene
            if (Stage.Clock != null) Stage.Clock.Minutes = Game.Minutes;
            if (Walker != null) Destroy(Walker.gameObject);
            var body = PlayerBody.Base(PlayerBody.Look(Game.Pc), assets.PlayerF, assets.PlayerM);
            Walker = Walker.Create(body != null ? body : assets.Walker, assets.Locomotion, at, yaw);
            _down = ticket;
            if (body != null) PlayerBody.Apply(Walker.gameObject, Game.Pc);
            if (Nav == null) Nav = gameObject.AddComponent<WorldNav>();
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
            if (Pad == null)
            {
                Pad = gameObject.AddComponent<PadInput>();
                Pad.Rig = Rig; Pad.Camera = Stage.Camera;
            }
            Pad.Walker = Walker;
            Populate(assets);
            if (Piles == null)
            {
                Piles = gameObject.AddComponent<GroundPiles>();
                Piles.Material = assets.Sack;
                Piles.Chosen += (thing, verb) => StartCoroutine(Use(thing, verb, null, null));
            }
            Piles.Clear();
            Piles.Sync(Game);
            SetDown?.Invoke();
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
            People.Begin(Game);
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
                Walker.Sit("sit", seat, thing.transform.eulerAngles.y + 180f);
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

        /// <summary>An event from the content (a choice's effect): camp (a bed of one's own), trade with whoever is being
        /// talked to, everyone healed; the rest go to <see cref="Asked"/>. What opens a screen waits for the conversation
        /// to close first.</summary>
        private void OnEvent(string name, Newtonsoft.Json.Linq.JToken data)
        {
            switch (name)
            {
                case "camp": StartCoroutine(AfterTalk(() => OpenCamp(true))); break;
                case "barter":
                    var who = _speaking;
                    if (who != null) StartCoroutine(AfterTalk(() => OpenTrade(who)));
                    break;
                case "heal": Camp.HealAll(Game); break;
                default: Asked?.Invoke(name, data); break;
            }
        }

        /// <summary>Closes the conversation (after the choice that asked has run) and then does something.</summary>
        private IEnumerator AfterTalk(System.Action then)
        {
            yield return null;
            if (Conversation != null && Conversation.IsOpen) Conversation.Close();
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

        private readonly System.Collections.Generic.Dictionary<string, System.Collections.Generic.Dictionary<string, string>> _owners = new();

        /// <summary>Whose each of a map's containers is (Core <see cref="Owners"/>; worked out once a map).</summary>
        private System.Collections.Generic.Dictionary<string, string> OwnersOf(MapDef map)
        {
            if (map == null) return null;
            if (!_owners.TryGetValue(map.Id, out var o)) _owners[map.Id] = o = Owners.Of(map, PlacePlan.Build(map));
            return o;
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

        /// <summary>A talking prop's conversation (a sign, the pumps, a bed): false when it has none to give.</summary>
        public bool LookAt(Interactable thing, MapDef map)
        {
            var ui = UIService.Instance;
            if (ui == null || thing == null || map?.Talk == null || !map.Talk.TryGetValue(thing.Id, out var talk)
                || !Registry.Dialogues.TryGetValue(talk.Dialogue, out var def)) return false;
            var runner = new DialogueRunner(def, Game, Quests);
            if (runner.Ended) return false;
            _speaking = null;
            var panel = new DialoguePanel(runner, _ => talk.Name);
            panel.Presented += _ => Quests.Update();
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
            yield return Responding(who, verb);
            if (townsperson != null) townsperson.Held = false;
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
                var to = Walker.transform.position - person.position;
                to.y = 0;
                if (to.sqrMagnitude > 0.01f)
                {
                    var from = person.rotation;
                    var goal = Quaternion.LookRotation(to.normalized, Vector3.up);
                    for (var t = 0f; t < 1f && person != null; t += Time.deltaTime / 0.6f)
                    {
                        person.rotation = Quaternion.Slerp(from, goal, Mathf.SmoothStep(0f, 1f, t));
                        yield return null;
                    }
                }
            }
            if (person == null) yield break;
            if (gaze != null) gaze.Target = walkerHead;
            if (walkerGaze != null) walkerGaze.Target = head;
            if (ambient != null) ambient.Gesture(verb == "talk" ? "talk" : "wave");   // not ?. on a component
            if (verb == "talk" && OpenConversation(who))
                while (Conversation != null && Conversation.IsOpen) yield return null;
            else if (verb == "trade" && OpenTrade(who))
                while (Trade != null && Trade.IsOpen) yield return null;
            else yield return new WaitForSeconds(6f);
            if (gaze != null && gaze.Target == walkerHead) gaze.Target = null;
            if (walkerGaze != null && walkerGaze.Target == head) walkerGaze.Target = null;
        }

        /// <summary>Opens a person's conversation from the content in the panel (false when they have none).</summary>
        public bool OpenConversation(Interactable who)
        {
            var ui = UIService.Instance;
            var npc = NpcOf(who);
            var tree = who.GetComponent<Townsperson>()?.Placement?.Dialogue ?? npc?.Dialogue;   // a placement may say other things
            if (ui == null || npc == null || string.IsNullOrEmpty(tree) || !Registry.Dialogues.TryGetValue(tree, out var def)) return false;
            var runner = new DialogueRunner(def, Game, Quests);
            if (runner.Ended) return false;
            _speaking = who;
            var face = who.GetComponentInChildren<Animator>() != null ? who.gameObject : null;
            var panel = new DialoguePanel(runner,
                id => Registry.Npcs.TryGetValue(id, out var n) && !string.IsNullOrEmpty(n.Name) ? n.Name : who.Title,
                id => id == who.Id && face != null ? Portraits.Of(face) : null);
            // the conversation cameras (P5.3e): the two-shot first, then the speaker's insert and the two-shot by turns
            if (Stage.Camera != null && Walker != null)
            {
                var shots = ConversationCamera.Begin(Stage.Camera, Walker.transform, who.transform);
                var lines = 0;
                panel.Presented += _ => { if (shots != null) shots.Cut(lines++ % 2 == 0 ? ConversationCamera.Shot.TwoShot : ConversationCamera.Shot.Other); };
                panel.Ended += () => { if (shots != null) shots.End(); };
            }
            panel.Presented += _ => Quests.Update();   // a choice's effects may move a quest on
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
            Trade = ui.Open(new BarterScreen(new BarterModel
            {
                Game = Game, MerchantId = npc.Id, Def = npc.Merchant, Name = string.IsNullOrEmpty(npc.Name) ? who.Title : npc.Name,
                Settlement = string.IsNullOrEmpty(npc.Settlement) ? "shale" : npc.Settlement, Face = face != null ? Portraits.Of(face) : null,
            }));
            return true;
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
