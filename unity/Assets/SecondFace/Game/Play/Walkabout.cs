using System.Collections;
using System.Linq;
using SecondFace.Core.Content;
using SecondFace.Core.Dialogue;
using SecondFace.Core.Inventory;
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
        public int Townsfolk { get; private set; }
        /// <summary>The town's things that can be used: containers and talking props (P6.1).</summary>
        public int Things { get; private set; }
        /// <summary>A line for the HUD (a lock that held, a lock picked).</summary>
        public event System.Action<string> Said;
        /// <summary>The container open now (null when none).</summary>
        public LootScreen Loot { get; private set; }
        /// <summary>The game being played (<see cref="Begin"/>; a new game at Shale until one is begun): the conversations,
        /// the notebook, the pack and the saves run on it.</summary>
        public GameState Game { get; private set; } = States.NewGame("shale", 0, 0);
        /// <summary>A game has begun (the walker is set down once the world is in).</summary>
        public bool Begun { get; private set; }
        /// <summary>The walker was set down for the game begun last (a new game, or a load).</summary>
        public event System.Action SetDown;
        /// <summary>The quests on <see cref="Game"/>: the conversations run with it as their host, so what is said can start
        /// and move the content's quests (the notebook and the HUD follow them).</summary>
        public QuestEngine Quests => _quests ??= new QuestEngine(Registry.Quests, Game);
        private QuestEngine _quests;
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
                var p = Walker.transform.position;
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
        }

        private bool _raised;
        private int _placing;

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
            yield return Stage.WaitAround(at, Townsfolk == 0 ? "shale" : null, LoadTimeout);
            if (ticket != _placing || Stage.Camera == null) yield break;   // left meanwhile, or the camera went with the scene
            if (Stage.Clock != null) Stage.Clock.Minutes = Game.Minutes;
            if (Walker != null) Destroy(Walker.gameObject);
            var body = PlayerBody.Base(PlayerBody.Look(Game.Pc), assets.PlayerF, assets.PlayerM);
            Walker = Walker.Create(body != null ? body : assets.Walker, assets.Locomotion, at, yaw);
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
            if (Townsfolk == 0) Townsfolk = Populate(assets);
            SetDown?.Invoke();
        }

        /// <summary>The cast at the town's people's posts (one each, the first posts), each idling their own way.</summary>
        private int Populate(WorldAssets assets)
        {
            if (assets.Townsfolk == null || assets.Townsfolk.Length == 0) return 0;
            var place = Stage.Streamer.PlaceSpawner?.Instance("shale");
            if (place == null) return 0;
            var n = 0;
            foreach (var m in place.GetComponentsInChildren<PlaceMarker>())
            {
                if (m.Kind != "npc" || n >= assets.Townsfolk.Length) continue;
                var model = assets.Townsfolk[n];
                if (model == null) continue;
                var p = Instantiate(model, m.transform.position, Quaternion.Euler(0, Hash(m.Id) * 360f, 0), place.transform);
                p.name = "townsfolk_" + model.name;
                var anim = p.GetComponentInChildren<Animator>();
                if (anim != null)
                {
                    anim.runtimeAnimatorController = assets.Locomotion;
                    anim.applyRootMotion = false;
                    anim.cullingMode = AnimatorCullingMode.CullCompletely;
                    // their own idle and now and then a gesture (P4 step 4); every third one talks more; feet on the ground
                    var ambient = anim.gameObject.AddComponent<SecondFace.Game.People.Ambient>();
                    ambient.Talker = n % 3 == 0;
                    anim.gameObject.AddComponent<SecondFace.Game.People.FootPlant>();
                    anim.gameObject.AddComponent<SecondFace.Game.People.Gaze>();
                }
                var name = Bootstrap.Content?.Entry("npcs", m.Id)?["name"]?.ToString();
                var trades = Registry.Npcs.TryGetValue(m.Id, out var def) && def.Merchant != null;
                var verbs = trades ? new[] { "talk", "trade", "look" } : new[] { "talk", "look" };
                var it = Interactable.Add(p, m.Id, string.IsNullOrEmpty(name) ? Strings.Get("people.someone") : name, 0.4f, 1.85f, verbs);
                it.Chosen += (who, verb) => StartCoroutine(Respond(who, verb));
                n++;
            }
            Things = Equip(place, "shale");
            return n;
        }

        /// <summary>The place's things (P6.1): its containers open (a lock first), its talking props say their piece.</summary>
        private int Equip(GameObject place, string placeId)
        {
            var n = 0;
            foreach (var m in place.GetComponentsInChildren<PlaceMarker>())
            {
                if (m.Kind != "container" && m.Kind != "talk") continue;
                var map = Registry.Maps.TryGetValue(string.IsNullOrEmpty(m.Map) ? placeId : m.Map, out var d) ? d : null;
                string title;
                string verb;
                if (m.Kind == "talk")
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
                it.Chosen += (thing, v) => StartCoroutine(Use(thing, v, placeId, map));
                n++;
            }
            return n;
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
            var spot = at + (away.sqrMagnitude > 0.01f ? away.normalized : thing.transform.forward) * 1.0f;
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
            if (verb == "open") OpenContainer(thing, placeId, map);
            else if (verb == "look") LookAt(thing, map);
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
            Loot = ui.Open(new LootScreen(new LootModel { Name = o.Name, Container = o.Inv, Pc = Game.Pc }));
            return Loot;
        }

        /// <summary>A talking prop's conversation (a sign, the pumps, a bed): false when it has none to give.</summary>
        public bool LookAt(Interactable thing, MapDef map)
        {
            var ui = UIService.Instance;
            if (ui == null || thing == null || map?.Talk == null || !map.Talk.TryGetValue(thing.Id, out var talk)
                || !Registry.Dialogues.TryGetValue(talk.Dialogue, out var def)) return false;
            var runner = new DialogueRunner(def, Game, Quests);
            if (runner.Ended) return false;
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
            if (ui == null || !Registry.Npcs.TryGetValue(who.Id, out var npc) || string.IsNullOrEmpty(npc.Dialogue)
                || !Registry.Dialogues.TryGetValue(npc.Dialogue, out var def)) return false;
            var runner = new DialogueRunner(def, Game, Quests);
            if (runner.Ended) return false;
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
            if (ui == null || !Registry.Npcs.TryGetValue(who.Id, out var npc) || npc.Merchant == null) return false;
            var face = who.GetComponentInChildren<Animator>() != null ? who.gameObject : null;
            Trade = ui.Open(new BarterScreen(new BarterModel
            {
                Game = Game, MerchantId = who.Id, Def = npc.Merchant, Name = string.IsNullOrEmpty(npc.Name) ? who.Title : npc.Name,
                Settlement = string.IsNullOrEmpty(npc.Settlement) ? "shale" : npc.Settlement, Face = face != null ? Portraits.Of(face) : null,
            }));
            return true;
        }

        private static float Hash(string s)
        {
            unchecked
            {
                var h = 2166136261u;
                foreach (var c in s) h = (h ^ c) * 16777619u;
                return (h & 0xFFFF) / 65536f;
            }
        }

        private void Update()
        {
            if (!Paused && Walker != null) Stage.World.Focus = Walker.transform.position;
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
