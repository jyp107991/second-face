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
        /// <summary>Made from a base body (P4.13): their sex, their body and face (<see cref="Bodies"/>), and what they
        /// wear (the content's own outfit, else its outfit rules for their trade and faction). Null look: a cast body.</summary>
        public bool Male;
        public PlayerLook Look;
        public Outfit Outfit;
    }

    /// <summary>
    /// The people of the world (P6.2 part 2; BUILD_PLAN P6 step 2, §4.2): every place standing in the world (its
    /// <see cref="PlaceSpawner"/>) brings its people as data, each placement whose condition holds, and its background
    /// people (<see cref="Extras"/>), each made from a base body of their sex with their own measurements and dressed for
    /// their trade (P4.13; before the bases, a cast body of their sex and nearest age, <see cref="Routine.Assign"/>);
    /// while far, a person is only where their routine has them. Within <see cref="Near"/> m of the one who walks a body stands for them (a few a frame, the nearest first),
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
        /// <summary>The cast's bodies (used while the bases are not set).</summary>
        public List<WorldAssets.CastEntry> Bodies = new();
        /// <summary>The two base bodies everyone is made from (P4.13: the player's, with the wardrobe for the whole cast).</summary>
        public GameObject BaseF, BaseM;
        public bool FromBases => BaseF != null && BaseM != null;
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
            if (FromBases)
                foreach (var (m, placement, def, map) in who)
                {
                    var male = Routine.Male(def.Look);
                    town.Residents.Add(new Resident
                    {
                        Id = m.Id, Def = def, Placement = placement, Map = map, Body = male ? "base_m" : "base_f", Post = m.transform.position,
                        Male = male, Look = LookOf(def, male), Outfit = OutfitOf(def, male),
                    });
                }
            if (FromBases) AddExtras(town, place, main);
            else
            {
                var cast = Bodies.Select(b => new CastBody { Id = b.Id, Male = b.Male, Age = b.Age, Role = b.Role }).ToList();
                var wear = Routine.Assign(who.Select(w => (w.M.Id, Routine.Male(w.D.Look), w.D.Look?.Age ?? 35.0, w.D.Role)).ToList(), cast);
                foreach (var (m, placement, def, map) in who)
                    if (wear.TryGetValue(m.Id, out var body))
                        town.Residents.Add(new Resident { Id = m.Id, Def = def, Placement = placement, Map = map, Body = body, Post = m.transform.position });
            }
            _towns[id] = town;
            _next = 0f;   // look at once who is near
        }

        /// <summary>The place's background people (P4.13 step 5, <see cref="Extras"/>): each of its maps' extras as a
        /// resident, at their spot or about their tile (a tile is the surface map's), made from the bases and dressed for
        /// their trade. One whose spot the place as built has not got is left out.</summary>
        private void AddExtras(Group town, GameObject place, string main)
        {
            var maps = new HashSet<string> { main };
            foreach (var m in place.GetComponentsInChildren<PlaceMarker>()) if (!string.IsNullOrEmpty(m.Map)) maps.Add(m.Map);
            var nowhere = new Vector3(float.NaN, 0f, 0f);
            foreach (var mapId in maps)
            {
                if (!Registry.Maps.TryGetValue(mapId, out var map) || map.Extras == null) continue;
                foreach (var x in Extras.Of(map))
                {
                    if (x.At != null && mapId != main) continue;
                    var first = x.Placement.Schedule.FirstOrDefault(e => e.Activity != "away");
                    var post = x.Spot == null && x.At == null ? nowhere : town.Folk.Where(map, nowhere, first);
                    if (float.IsNaN(post.x)) continue;
                    town.Residents.Add(new Resident
                    {
                        Id = x.Def.Id, Def = x.Def, Placement = x.Placement, Map = map, Body = x.Male ? "base_m" : "base_f", Post = post,
                        Male = x.Male, Look = x.Look, Outfit = Outfits.DressFor(x.Def.Look.Seed, x.Def.Role, x.Male ? "m" : "f", x.Def.Faction),
                    });
                }
            }
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

        /// <summary>A person's body and face as the content has them: their id, sex, age, trade and ancestry
        /// (<see cref="Bodies"/>; the same every time), and what the content fixes of their look (hair, scars, skin).</summary>
        public static PlayerLook LookOf(NpcDef def, bool male) =>
            Core.Npc.Bodies.Over(Core.Npc.Bodies.For(def.Id, male, def.Look?.Age ?? 35.0, def.Role, ancestry: def.Look?.Ancestry), def.Look?.Over);

        /// <summary>What a person wears: the content's own outfit, else its rules for their trade and faction, seeded as the
        /// web game seeded them.</summary>
        public static Outfit OutfitOf(NpcDef def, bool male) =>
            def.Outfit ?? Outfits.DressFor(def.Look?.Seed ?? (int)(Core.Npc.Bodies.Seed(def.Id) & 0x7fffffff), Outfits.Roles.Contains(def.Role) ? def.Role : "settler", male ? "m" : "f", def.Faction);

        /// <summary>A body for someone come near: made from their base (or their cast body) where the hour has them,
        /// keeping their routine.</summary>
        private void Make(Group town, Resident r)
        {
            var model = r.Look != null ? (r.Male ? BaseM : BaseF) : Bodies.FirstOrDefault(b => b.Id == r.Body)?.Prefab;
            if (model == null) return;
            // under the place's people, not the place: a place hides its surface while the walker is under it, and people
            // are not its surface
            var go = Instantiate(model, r.Post, Quaternion.Euler(0, Hash(r.Id) * 360f, 0), town.Folk.transform);
            go.name = "townsfolk_" + r.Id;
            if (r.Look != null)
            {
                // their stature, dressed for their trade, then their body, face, skin and hair over what they wear
                go.transform.localScale = Vector3.one * LookView.Scale(r.Look);
                var wardrobe = go.GetComponent<Wardrobe>();
                if (wardrobe != null) Dresser.Dress(wardrobe, r.Outfit);
                LookView.Apply(go, r.Look);
            }
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
                anim.gameObject.AddComponent<ArmClearance>();
                anim.gameObject.AddComponent<HandPose>();
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

        /// <summary>Seen in full (near) or not: gestures, gaze, feet planted, arms kept clear of the body and avoiding others
        /// only near.</summary>
        private static void Detail(Townsperson p, bool full, bool force = false)
        {
            if (p.Full == full && !force) return;
            p.Full = full;
            if (p.Animator != null)
            {
                if (p.Animator.TryGetComponent<Ambient>(out var a)) a.enabled = full;
                if (p.Animator.TryGetComponent<FootPlant>(out var f)) f.enabled = full;
                if (p.Animator.TryGetComponent<Gaze>(out var g)) g.enabled = full;
                if (p.Animator.TryGetComponent<ArmClearance>(out var c)) c.enabled = full;
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
