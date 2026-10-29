using System.Collections.Generic;
using SecondFace.Core.Npc;
using SecondFace.Core.Scene;
using SecondFace.Core.World;
using SecondFace.Game.People;
using SecondFace.Game.World;
using UnityEngine;
using UnityEngine.AI;

namespace SecondFace.Game.Play
{
    /// <summary>One of a place's people keeping their routine (P6.2): who they are, the entry in force, where they are going,
    /// whether they are out of sight (asleep at home or away), held still while someone talks to them.</summary>
    public sealed class Townsperson : MonoBehaviour
    {
        public string Id;
        /// <summary>The cast body they wear.</summary>
        public string Body;
        public NpcDef Def;
        public NpcPlacement Placement;
        /// <summary>The map of the place they belong to (a place may hold two: a shelter under its mouth).</summary>
        public MapDef Map;
        public NavMeshAgent Agent;
        public Animator Animator;
        public Ambient Ambient;
        /// <summary>Their post when their routine has nothing to say (where the place put them).</summary>
        public Vector3 Post;
        /// <summary>Held still: talked to, traded with (their routine waits).</summary>
        public bool Held;

        public ScheduleEntry Entry { get; set; }
        /// <summary>Out of sight now (gone in to sleep, or away).</summary>
        public bool Inside { get; set; }
        /// <summary>Where they are going or standing for the entry in force.</summary>
        public Vector3 Target { get; set; }
        /// <summary>When a patrol takes its next turn about its post.</summary>
        public float Turn { get; set; }
        /// <summary>Where their agent was last sent.</summary>
        public Vector3 Asked { get; set; }
        /// <summary>Their last path ended short of where it was asked for (they stand as near as they got).</summary>
        public bool Short { get; set; }
        /// <summary>Near enough to be seen up close: their gestures, gaze and feet on the ground (<see cref="PeopleService"/>).</summary>
        public bool Full { get; set; } = true;

        private static readonly int Speed = Animator.StringToHash("Speed");

        private void Update()
        {
            if (Agent == null || !Agent.enabled) return;
            if (Animator != null) Animator.SetFloat(Speed, Agent.velocity.magnitude, 0.12f, Time.deltaTime);
            if (Agent.isOnNavMesh && !Agent.pathPending && Agent.hasPath && Agent.pathStatus == NavMeshPathStatus.PathPartial && Agent.remainingDistance < 0.3f) Short = true;
        }
    }

    /// <summary>
    /// A place's people keeping their hours (P6.2; port of game.ts updateSchedules, BUILD_PLAN P6 step 2): twice a second
    /// each person's routine is looked at for the world clock's hour (Core <see cref="Routine"/>): they walk on the
    /// NavMesh to the entry's spot (a place's <c>spot</c> marker of their map, or a tile of it), and stand there as the
    /// activity has it (a drinker drinks, a trader talks, a patrol takes turns about its post); asleep, they walk home and
    /// go in (out of sight until the routine wakes them, then they come out of their door); away, they are gone. When the
    /// clock jumps (a rest, a load) everyone is put where the hour has them at once. Anyone talked to is held still. Who
    /// stands in the world at all is the <see cref="PeopleService"/>'s (by distance); these are the bodies standing.
    /// </summary>
    public sealed class Townsfolk : MonoBehaviour
    {
        public const float Tick = 0.5f, Arrived = 1.2f, WalkSpeed = 1.25f, Jump = 30f;

        public TimeService Clock;
        public readonly List<Townsperson> People = new();
        /// <summary>The place's spots by map and id.</summary>
        private readonly Dictionary<(string, string), Transform> _spots = new();
        private Transform _place;
        private float _next;
        private double _lastMinutes = -1;

        /// <summary>The place whose people these are: its <c>spot</c> markers, by the map each comes from (a marker that
        /// names none is <paramref name="mainMap"/>'s).</summary>
        public void Bind(GameObject place, string mainMap)
        {
            _place = place.transform;
            _spots.Clear();
            foreach (var m in place.GetComponentsInChildren<PlaceMarker>())
                if (m.Kind == "spot") _spots[(string.IsNullOrEmpty(m.Map) ? mainMap : m.Map, m.Id)] = m.transform;
        }

        /// <summary>Takes a person into the routine (their agent is made here; it waits for the NavMesh).</summary>
        public Townsperson Add(GameObject body, string id, NpcDef def, NpcPlacement placement, MapDef map, Vector3 post)
        {
            var p = body.AddComponent<Townsperson>();
            p.Id = id; p.Def = def; p.Placement = placement; p.Map = map; p.Post = post;
            p.Animator = body.GetComponentInChildren<Animator>();
            p.Ambient = p.Animator != null ? p.Animator.GetComponent<Ambient>() : null;
            var agent = body.AddComponent<NavMeshAgent>();
            agent.radius = 0.28f; agent.height = 1.8f; agent.speed = WalkSpeed; agent.acceleration = 6f; agent.angularSpeed = 360f;
            agent.stoppingDistance = 0.4f; agent.autoBraking = true;
            agent.obstacleAvoidanceType = ObstacleAvoidanceType.LowQualityObstacleAvoidance;   // none when far (PeopleService)
            agent.avoidancePriority = 60;
            agent.enabled = false;   // on once there is a NavMesh under them
            p.Agent = agent;
            People.Add(p);
            return p;
        }

        /// <summary>Where an entry sends a person (their post when it names nowhere this place knows).</summary>
        public Vector3 Where(Townsperson p, ScheduleEntry e) => Where(p.Map, p.Post, e);

        /// <summary>Where an entry sends someone of a map whose post is <paramref name="post"/> (also for one not standing
        /// in the world: where they would be). A tile is the place's surface map's (no routine names a tile under the
        /// ground).</summary>
        public Vector3 Where(MapDef map, Vector3 post, ScheduleEntry e)
        {
            if (e?.At != null && map != null && _place != null)
            {
                var (x, z) = PlacePlan.TileCentre(map, e.At.X, e.At.Y);
                return _place.TransformPoint(new Vector3(x, 0f, z));
            }
            if (e?.Spot != null && map != null && _spots.TryGetValue((map.Id, e.Spot), out var s) && s != null) return s.position;
            return post;
        }

        private void Update()
        {
            if (Clock == null || Time.unscaledTime < _next) return;
            _next = Time.unscaledTime + Tick;
            var minutes = Clock.Minutes;
            var snap = _lastMinutes < 0 || System.Math.Abs(minutes - _lastMinutes) > Jump;
            _lastMinutes = minutes;
            Step(Clock.Hour, snap);
        }

        /// <summary>Everyone for the hour; with <paramref name="snap"/> they are put where it has them at once.</summary>
        public void Step(double hour, bool snap)
        {
            foreach (var p in People)
                if (p != null && !p.Held) Keep(p, hour, snap);
        }

        /// <summary>Puts someone just come into the world where the hour has them.</summary>
        public void Settle(Townsperson p) => Keep(p, Clock != null ? Clock.Hour : 12.0, true);

        /// <summary>Takes someone out of the world (gone too far to matter): their body goes.</summary>
        public void Remove(Townsperson p)
        {
            People.Remove(p);
            if (p != null) Destroy(p.gameObject);
        }

        private void Keep(Townsperson p, double hour, bool snap)
        {
            var e = Routine.Now(p.Placement, p.Def, hour);
            var changed = e != p.Entry;
            p.Entry = e;
            var target = Where(p, e);
            var hidden = Routine.Hidden(e);
            if (changed || snap) { p.Target = target; p.Turn = Time.time + Random.Range(8f, 25f); }
            if (p.Ambient != null) p.Ambient.Pool = Gestures(e?.Activity);
            if (hidden)
            {
                // away: gone now; asleep: walks home, then goes in
                if (e.Activity == "away" || snap || Flat(p.transform.position, target) <= Arrived) { GoIn(p, target); return; }
                if (p.Inside) return;
                Walk(p, target);
                return;
            }
            if (p.Inside) ComeOut(p);
            if (snap) { Place(p, target); return; }
            if (e?.Activity == "patrol" && Flat(p.transform.position, p.Target) <= Arrived && Time.time >= p.Turn)
            {
                // a turn about the post: somewhere walkable a few metres off, then back on the next
                var off = target + Quaternion.Euler(0f, Random.Range(0f, 360f), 0f) * Vector3.forward * Random.Range(3f, 7f);
                p.Target = NavMesh.SamplePosition(off, out var hit, 3f, NavMesh.AllAreas) ? hit.position : target;
                p.Turn = Time.time + Random.Range(10f, 25f);
            }
            else if (e?.Activity == "patrol" && Time.time >= p.Turn) p.Target = target;
            Walk(p, p.Target);
        }

        /// <summary>The gestures an activity calls for (null: the person's own mix).</summary>
        public static string[] Gestures(string activity) => activity switch
        {
            "drink" => new[] { "drink", "drink", "talk", "yawn" },
            "trade" => new[] { "talk", "talk_b", "wave", "argue" },
            "work" => new[] { "stretch", "talk_b", "yawn_b" },
            "patrol" => new[] { "stretch", "yawn" },
            _ => null,
        };

        private static bool Ready(Townsperson p)
        {
            if (p.Agent == null) return false;
            if (p.Agent.enabled && p.Agent.isOnNavMesh) return true;
            if (!NavMesh.SamplePosition(p.transform.position, out var hit, 4f, NavMesh.AllAreas)) return false;
            p.Agent.enabled = true;
            return p.Agent.Warp(hit.position);
        }

        private static void Walk(Townsperson p, Vector3 to)
        {
            if (!Ready(p)) return;
            if (!p.Agent.isOnNavMesh) return;
            if (Flat(p.transform.position, to) <= Arrived) { if (p.Agent.hasPath) p.Agent.ResetPath(); return; }
            // asked already: the path is being found or followed; one that ended short (a partial path: the way is blocked)
            // is not asked again until the routine sends them elsewhere (a search that fails costs the whole mesh)
            if (Flat(p.Asked, to) < 0.5f && (p.Agent.pathPending || p.Agent.hasPath || p.Short)) return;
            p.Asked = to;
            p.Short = false;
            p.Agent.SetDestination(to);
        }

        private static void Place(Townsperson p, Vector3 at)
        {
            if (NavMesh.SamplePosition(at, out var hit, 4f, NavMesh.AllAreas)) at = hit.position;
            if (Ready(p) && p.Agent.Warp(at) && p.Agent.isOnNavMesh) p.Agent.ResetPath();
            else p.transform.position = at;
        }

        private static void GoIn(Townsperson p, Vector3 home)
        {
            if (p.Inside) return;
            p.Inside = true;
            if (p.Agent != null && p.Agent.enabled && p.Agent.isOnNavMesh) p.Agent.ResetPath();
            p.transform.position = home;      // they come out of their door
            p.gameObject.SetActive(false);
        }

        private static void ComeOut(Townsperson p)
        {
            p.Inside = false;
            p.gameObject.SetActive(true);
            if (p.Agent != null && p.Agent.enabled && p.Agent.isOnNavMesh) p.Agent.Warp(p.transform.position);
        }

        private static float Flat(Vector3 a, Vector3 b)
        {
            a.y = 0f; b.y = 0f;
            return Vector3.Distance(a, b);
        }

        /// <summary>A person by id (null when none).</summary>
        public Townsperson Of(string id) => People.Find(p => p != null && p.Id == id);
    }
}
