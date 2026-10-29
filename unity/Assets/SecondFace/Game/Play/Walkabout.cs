using System.Collections;
using System.Linq;
using SecondFace.Core.Content;
using SecondFace.Core.Dialogue;
using SecondFace.Core.State;
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
    /// person waves.
    /// </summary>
    public sealed class Walkabout : MonoBehaviour
    {
        public WorldStage Stage;
        public float LoadTimeout = 180f;

        public Walker Walker { get; private set; }
        public OrbitRig Rig { get; private set; }
        public WorldNav Nav { get; private set; }
        public TouchInput Input { get; private set; }
        public bool Paused { get; private set; }
        /// <summary>The walker stands on a built NavMesh and the camera follows them.</summary>
        public bool Ready => Walker != null && Nav != null && Nav.Ready && Walker.Agent.isOnNavMesh;
        public int Townsfolk { get; private set; }
        /// <summary>The walkabout's own game state (a new game at Shale): the conversations run on it.</summary>
        public GameState Game { get; } = States.NewGame("shale", 0, 0);
        /// <summary>The conversation open now (null when none).</summary>
        public DialoguePanel Conversation { get; private set; }

        private IEnumerator Start()
        {
            if (Stage == null) yield break;
            if (!Stage.Raised) yield return Stage.Raise();
            if (!Stage.Raised) yield break;
            var assets = Stage.Assets;
            if (assets.Walker == null || assets.Locomotion == null) { Debug.LogWarning("Walkabout: no walker in the world assets (Second Face/Build world assets)"); yield break; }
            var centre = Stage.World.PlaceCentre("shale");
            yield return Stage.WaitAround(centre, "shale", LoadTimeout);
            if (Stage.Camera == null) yield break;   // the camera went while the world came in (the scene was left)
            var spawn = Stage.Marker("shale", "spawn");
            var at = spawn != null ? spawn.transform.position : centre;
            var yaw = spawn != null ? spawn.transform.eulerAngles.y : 0f;
            Walker = Walker.Create(assets.Walker, assets.Locomotion, at, yaw);
            Nav = gameObject.AddComponent<WorldNav>();
            Nav.Target = Walker.transform;
            Rig = OrbitRig.Create(Stage.Camera, Walker.transform);
            Rig.Yaw = yaw + 20f;
            Rig.Snap();
            Input = gameObject.AddComponent<TouchInput>();
            Input.Rig = Rig; Input.Walker = Walker; Input.Camera = Stage.Camera;
            Input.Tapped += OnTapped;
            Townsfolk = Populate(assets);
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
                var it = Interactable.Add(p, m.Id, string.IsNullOrEmpty(name) ? Strings.Get("people.someone") : name, 0.4f, 1.85f, "talk", "look");
                it.Chosen += (who, verb) => StartCoroutine(Respond(who, verb));
                n++;
            }
            return n;
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
            if (verb == "talk")
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
            var runner = new DialogueRunner(def, Game);
            if (runner.Ended) return false;
            var face = who.GetComponentInChildren<Animator>() != null ? who.gameObject : null;
            Conversation = ui.Open(new DialoguePanel(runner,
                id => Registry.Npcs.TryGetValue(id, out var n) && !string.IsNullOrEmpty(n.Name) ? n.Name : who.Title,
                id => id == who.Id && face != null ? Portraits.Of(face) : null));
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
