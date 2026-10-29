using System;
using System.Collections.Generic;
using System.Linq;
using SecondFace.Core;
using SecondFace.Core.Content;
using SecondFace.Core.Npc;
using SecondFace.Core.Scene;
using SecondFace.Core.State;
using SecondFace.Core.World;
using SecondFace.Game.People;
using SecondFace.Game.UI;
using SecondFace.Game.World;
using UnityEngine;
using UnityEngine.AI;

namespace SecondFace.Game.Play
{
    /// <summary>One of a place's people as data (P6.2): who they are, the map they belong to, the body they wear, where
    /// the place put them, and their body while one stands in the world (null while they are too far to matter).</summary>
    public sealed class Resident
    {
        public string Id;
        public NpcDef Def;
        public NpcPlacement Placement;
        public MapDef Map;
        public string Body;
        public Vector3 Post;
        public Townsperson Person;
    }

    /// <summary>
    /// The people of the world (P6.2 part 2; BUILD_PLAN P6 step 2, §4.2): every place standing in the world (its
    /// <see cref="PlaceSpawner"/>) brings its people as data, each placement whose condition holds, each in a cast body of
    /// their sex and nearest age (Core <see cref="Routine.Assign"/>); while far, a person is only where their routine has
    /// them. Within <see cref="Near"/> m of the one who walks a body stands for them (a few a frame, the nearest first),
    /// put where the hour has them and kept to their routine (<see cref="Townsfolk"/>, one per place); within
    /// <see cref="Full"/> m they are seen in full (gestures, gaze, feet planted, avoiding each other); further off their
    /// animator runs only while seen and they walk without the rest. Beyond <see cref="Leave"/> m (and when their place is
    /// taken away) the body goes and the data stays. Nobody held (talked to) goes.
    /// </summary>
    public sealed class PeopleService : MonoBehaviour
    {
        public float Near = 120f, Full = 60f, Leave = 140f;
        /// <summary>Bodies brought into the world a frame, at most (an instantiation is a few milliseconds on a phone).</summary>
        public int SpawnsPerFrame = 2;
        public const float Tick = 0.25f;

        public TimeService Clock;
        public WorldService World;
        public PlaceSpawner Spawner;
        /// <summary>The one who walks: distances are theirs.</summary>
        public Transform Focus;
        public RuntimeAnimatorController Locomotion;
        /// <summary>The cast's bodies.</summary>
        public List<WorldAssets.CastEntry> Bodies = new();
        /// <summary>One of the people was tapped and a verb chosen.</summary>
        public event Action<Interactable, string> Chosen;

        private sealed class Group
        {
            public string Id;
            public GameObject Place;
            public Townsfolk Folk;
            public readonly List<Resident> Residents = new();
        }

        private readonly Dictionary<string, Group> _towns = new();
        private readonly List<(Group Town, Resident Who, float D)> _queue = new();
        private GameState _game;
        private float _next;
        private int _made;

        /// <summary>Everyone the standing places hold, near or far.</summary>
        public IEnumerable<Resident> Residents => _towns.Values.SelectMany(t => t.Residents);
        /// <summary>How many bodies stand in the world now.</summary>
        public int Standing => _towns.Values.Sum(t => t.Folk.People.Count);
        /// <summary>A place's people keeping their hours (null when the place is not standing).</summary>
        public Townsfolk Town(string place) => _towns.TryGetValue(place, out var t) ? t.Folk : null;
        /// <summary>A place's people as data (empty when the place is not standing).</summary>
        public IReadOnlyList<Resident> ResidentsOf(string place) => _towns.TryGetValue(place, out var t) ? t.Residents : new List<Resident>();
        /// <summary>Someone standing in the world, by id (null when none).</summary>
        public Townsperson Of(string id) => _towns.Values.Select(t => t.Folk.Of(id)).FirstOrDefault(p => p != null);
        /// <summary>Someone of the world's places as data, by id (null when none).</summary>
        public Resident Resident(string id) => Residents.FirstOrDefault(r => r.Id == id);

        /// <summary>The people for a game (a new one, or one loaded: whose conditions hold may differ): every standing
        /// place's people are brought again.</summary>
        public void Begin(GameState game)
        {
            _game = game;
            foreach (var t in _towns.Values.ToList()) Drop(t.Id, t.Place);
            if (Spawner == null) return;
            Spawner.Shown -= Bring;
            Spawner.Dropping -= Drop;
            Spawner.Shown += Bring;
            Spawner.Dropping += Drop;
            foreach (var (id, place) in Spawner.Standing()) Bring(id, place);
        }

        /// <summary>A place come into the world: its people as data (none stands yet).</summary>
        private void Bring(string id, GameObject place)
        {
            if (_game == null || place == null || _towns.ContainsKey(id)) return;
            var main = World != null && World.Layout.Places.TryGetValue(id, out var info) && !string.IsNullOrEmpty(info.Map) ? info.Map : id;
            var folk = new GameObject("people_" + id).AddComponent<Townsfolk>();
            folk.transform.SetParent(transform, false);
            folk.Clock = Clock;
            folk.Bind(place, main);
            var town = new Group { Id = id, Place = place, Folk = folk };
            var who = new List<(PlaceMarker M, NpcPlacement P, NpcDef D, MapDef Map)>();
            foreach (var m in place.GetComponentsInChildren<PlaceMarker>())
            {
                if (m.Kind != "npc" || !Registry.Maps.TryGetValue(string.IsNullOrEmpty(m.Map) ? main : m.Map, out var map)) continue;
                var placement = map.Npcs?.FirstOrDefault(p => (p.Id ?? p.Def) == m.Id);
                if (placement == null || !Registry.Npcs.TryGetValue(placement.Def, out var def)) continue;
                if (placement.If != null && !Logic.Test(placement.If, _game)) continue;
                who.Add((m, placement, def, map));
            }
            var cast = Bodies.Select(b => new CastBody { Id = b.Id, Male = b.Male, Age = b.Age, Role = b.Role }).ToList();
            var wear = Routine.Assign(who.Select(w => (w.M.Id, Routine.Male(w.D.Look), w.D.Look?.Age ?? 35.0, w.D.Role)).ToList(), cast);
            foreach (var (m, placement, def, map) in who)
                if (wear.TryGetValue(m.Id, out var body))
                    town.Residents.Add(new Resident { Id = m.Id, Def = def, Placement = placement, Map = map, Body = body, Post = m.transform.position });
            _towns[id] = town;
            _next = 0f;   // look at once who is near
        }

        /// <summary>A place going: its people's bodies go with it (their data with it too, until it comes again).</summary>
        private void Drop(string id, GameObject place)
        {
            if (!_towns.TryGetValue(id, out var town)) return;
            foreach (var r in town.Residents) r.Person = null;
            foreach (var p in town.Folk.People.ToList()) town.Folk.Remove(p);
            Destroy(town.Folk.gameObject);
            _towns.Remove(id);
            _queue.RemoveAll(q => q.Town == town);
        }

        private void Update()
        {
            if (Focus == null) return;
            if (Time.unscaledTime >= _next)
            {
                _next = Time.unscaledTime + Tick;
                Look();
            }
            _made = 0;
            while (_queue.Count > 0 && _made < SpawnsPerFrame)
            {
                var (town, who, _) = _queue[0];
                _queue.RemoveAt(0);
                if (who.Person == null && _towns.ContainsKey(town.Id) && town.Place != null) Make(town, who);
            }
        }

        /// <summary>Who should stand in the world and how fully: the near brought (nearest first), the far sent away.</summary>
        private void Look()
        {
            var hour = Clock != null ? Clock.Hour : 12.0;
            var focus = Focus.position;
            _queue.Clear();
            foreach (var town in _towns.Values)
            {
                if (town.Place == null) continue;
                foreach (var r in town.Residents)
                {
                    if (r.Person == null)
                    {
                        var e = Routine.Now(r.Placement, r.Def, hour);
                        if (Routine.Hidden(e)) continue;   // asleep indoors or away: nobody to see
                        var d = Flat(town.Folk.Where(r.Map, r.Post, e), focus);
                        if (d <= Near) _queue.Add((town, r, d));
                        continue;
                    }
                    var at = Flat(r.Person.transform.position, focus);
                    if (at > Leave && !r.Person.Held)
                    {
                        town.Folk.Remove(r.Person);
                        r.Person = null;
                        continue;
                    }
                    Detail(r.Person, at <= Full);
                }
            }
            _queue.Sort((a, b) => a.D.CompareTo(b.D));
        }

        /// <summary>A body for someone come near: their cast body where the hour has them, keeping their routine.</summary>
        private void Make(Group town, Resident r)
        {
            var model = Bodies.FirstOrDefault(b => b.Id == r.Body)?.Prefab;
            if (model == null) return;
            // under the place's people, not the place: a place hides its surface while the walker is under it, and people
            // are not its surface
            var go = Instantiate(model, r.Post, Quaternion.Euler(0, Hash(r.Id) * 360f, 0), town.Folk.transform);
            go.name = "townsfolk_" + r.Id;
            var anim = go.GetComponentInChildren<Animator>();
            if (anim != null)
            {
                anim.runtimeAnimatorController = Locomotion;
                anim.applyRootMotion = false;
                anim.cullingMode = AnimatorCullingMode.CullCompletely;
                // their own idle and now and then a gesture (P4 step 4); one in three talks more; feet on the ground
                var ambient = anim.gameObject.AddComponent<Ambient>();
                ambient.Talker = Hash(r.Id + "t") < 0.34f;
                anim.gameObject.AddComponent<FootPlant>();
                anim.gameObject.AddComponent<Gaze>();
            }
            var def = r.Def;
            var name = string.IsNullOrEmpty(def.Name) ? Bootstrap.Content?.Entry("npcs", def.Id)?["name"]?.ToString() : def.Name;
            var verbs = def.Merchant != null ? new[] { "talk", "trade", "look" } : new[] { "talk", "look" };
            var it = Interactable.Add(go, r.Id, string.IsNullOrEmpty(name) ? Strings.Get("people.someone") : name, 0.4f, 1.85f, verbs);
            it.Chosen += (person, verb) => Chosen?.Invoke(person, verb);
            var p = town.Folk.Add(go, r.Id, def, r.Placement, r.Map, r.Post);
            p.Body = r.Body;
            r.Person = p;
            town.Folk.Settle(p);
            Detail(p, Flat(p.transform.position, Focus.position) <= Full, force: true);
            _made++;
        }

        /// <summary>Seen in full (near) or not: gestures, gaze, feet planted and avoiding others only near.</summary>
        private static void Detail(Townsperson p, bool full, bool force = false)
        {
            if (p.Full == full && !force) return;
            p.Full = full;
            if (p.Animator != null)
            {
                if (p.Animator.TryGetComponent<Ambient>(out var a)) a.enabled = full;
                if (p.Animator.TryGetComponent<FootPlant>(out var f)) f.enabled = full;
                if (p.Animator.TryGetComponent<Gaze>(out var g)) g.enabled = full;
            }
            if (p.Agent != null) p.Agent.obstacleAvoidanceType = full ? ObstacleAvoidanceType.LowQualityObstacleAvoidance : ObstacleAvoidanceType.NoObstacleAvoidance;
        }

        private static float Flat(Vector3 a, Vector3 b)
        {
            a.y = 0f; b.y = 0f;
            return Vector3.Distance(a, b);
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

        private void OnDestroy()
        {
            if (Spawner == null) return;
            Spawner.Shown -= Bring;
            Spawner.Dropping -= Drop;
        }
    }
}
