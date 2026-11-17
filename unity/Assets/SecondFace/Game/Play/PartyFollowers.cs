using System.Collections;
using System.Collections.Generic;
using System.Linq;
using SecondFace.Core.Content;
using SecondFace.Core.Npc;
using SecondFace.Core.State;
using SecondFace.Game.People;
using SecondFace.Game.UI;
using UnityEngine;
using UnityEngine.AI;

namespace SecondFace.Game.Play
{
    /// <summary>
    /// The party in the world (port of the web game's followers, npc/party.ts; DESIGN_UNITY §4: companions are visible
    /// people). Everyone travelling with the player (Core <see cref="WorldState.Party"/>) stands near them as a person made
    /// exactly as the world makes a named person (their Rocketbox person in their dyes, or their body from the bases, with
    /// the game's animation, <see cref="PeopleService.Animate"/>), on a NavMeshAgent moved at the game's own speeds and paced
    /// by the townsfolk's path (<see cref="Townsperson"/>: <see cref="Pace"/> from the agent's speed; no root motion). They
    /// trail 1.5–3 m behind and beside the player, each on a slot of their own (so they neither crowd the player nor each
    /// other), walk while the player walks and jog to catch up, stop when the player stops and turn to idle facing the way
    /// they were going; they give way when the player walks into them, and they never take a path from the player (their
    /// agents yield to everyone's). Set down somewhere (a new game, a load, a journey by the map), stuck, or more than
    /// <see cref="CatchUpBeyond"/> m off, they are placed beside the player, out of view where the ground allows. In a
    /// conversation, a trade, a camp or a fight they stand by (a fight takes them as the player's side, <see cref="Combat"/>).
    /// A companion dismissed with a bare "wait here" stays where they were left (the spot saved in
    /// <see cref="CompanionSave.WaitingAt"/>, Core <see cref="Party.WaitAt"/>), standing there whenever the player is near,
    /// to be talked to (their conversation asks them back); one who leaves the road walks off and is gone, and only the
    /// content's own placements stand them anywhere after (<see cref="Party.PlacedByContent"/>). A placement of a companion
    /// that still holds while they are with the player is kept out of sight (<see cref="Townsfolk.Elsewhere"/>).
    /// </summary>
    public sealed class PartyFollowers : MonoBehaviour
    {
        /// <summary>How often the followers are looked at (s) and the party reconciled with the story (s).</summary>
        public const float Step = 0.2f, SyncEvery = 0.5f;
        /// <summary>The band a follower stands in when the player stops (m from the player): nearer, they step away.</summary>
        public const float Near = 1.3f, Far = 3.4f;
        /// <summary>Further than this (m), a follower is placed beside the player rather than walking up.</summary>
        public const float CatchUpBeyond = 40f;
        /// <summary>While the player walks, a follower falling this far behind their slot (m) jogs to it, and walks again within
        /// <see cref="WalkWithin"/>; while the player jogs, so do they. Only the game's own speeds (<see cref="Walker.WalkSpeed"/>,
        /// <see cref="Walker.JogSpeed"/>) are used: the gaits the motion gate measures.</summary>
        public const float JogFrom = 3.5f, WalkWithin = 1f;
        /// <summary>A follower whose way to the player has been blocked this long (s) is placed beside them.</summary>
        public const float StuckFor = 4f;
        /// <summary>A waiting companion stands in the world within <see cref="WaitNear"/> m of the player, and goes beyond
        /// <see cref="WaitLeave"/> m (their spot stays in the game), as the townsfolk do.</summary>
        public const float WaitNear = 120f, WaitLeave = 140f;
        /// <summary>The longest a companion leaving the road walks off in view before they are gone anyway (s).</summary>
        public const float LeavingFor = 60f;

        /// <summary>Each follower's place about the player (m; x to the right, z ahead of where the player goes): behind and
        /// beside, 2–3 m off, apart from each other.</summary>
        public static readonly Vector2[] Slots =
        {
            new(-0.95f, -1.75f), new(0.95f, -1.75f), new(-0.35f, -2.75f), new(1.3f, -2.6f), new(-1.5f, -2.45f), new(0.45f, -2.9f),
        };

        public enum Mode { Following, Waiting, Leaving }

        private sealed class Member
        {
            public string Id;
            public NpcDef Def;
            public Townsperson Person;
            public Mode Mode;
            public Vector3 Asked = new(float.NaN, 0f, 0f);
            public bool Jogging, Turned;
            public float StillSince = -1f, StuckSince = -1f, LeftAt;
            public Coroutine Turn;
        }

        public Walkabout Walkabout;

        private readonly Dictionary<string, Member> _members = new();
        private GameState _game;
        private Vector3 _heading = Vector3.forward;
        private float _nextStep, _nextSync;
        private bool _indoors;
        private Transform _root;
        private System.Func<string, bool> _elsewhere;

        // ---- what others read --------------------------------------------------------------------------------------------

        /// <summary>The bodies of the companions following the player now, in the party's order.</summary>
        public IReadOnlyList<Townsperson> Following => _game == null ? new List<Townsperson>()
            : _game.World.Party.Select(id => _members.TryGetValue(id, out var m) && m.Mode == Mode.Following ? m.Person : null).Where(p => p != null).ToList();

        /// <summary>The bodies of the companions standing where they were left.</summary>
        public IReadOnlyList<Townsperson> WaitingFigures => _members.Values.Where(m => m.Mode == Mode.Waiting && m.Person != null).Select(m => m.Person).ToList();

        /// <summary>A companion's body standing in the world (following, waiting or walking off), by id; null when none.</summary>
        public Townsperson Of(string id) => id != null && _members.TryGetValue(id, out var m) && m.Person != null ? m.Person : null;

        /// <summary>How a companion's body stands now (null when none stands).</summary>
        public Mode? ModeOf(string id) => id != null && _members.TryGetValue(id, out var m) && m.Person != null ? m.Mode : null;

        /// <summary>One of the party's bodies (a tap or the pad's act button finds them among the townsfolk).</summary>
        public bool Holds(Interactable it) => it != null && _members.TryGetValue(it.Id ?? "", out var m) && m.Person != null && m.Person.gameObject == it.gameObject;

        /// <summary>The followers able to fight now (standing, not down), with their ids.</summary>
        public List<(string Id, Townsperson Body)> Fighters()
        {
            var list = new List<(string, Townsperson)>();
            if (_game == null) return list;
            foreach (var id in _game.World.Party)
            {
                if (!_members.TryGetValue(id, out var m) || m.Mode != Mode.Following || m.Person == null || !m.Person.gameObject.activeInHierarchy) continue;
                var c = Party.Save(_game, id);
                if (c.Sheet == null || c.Sheet.Hp <= 0) continue;
                list.Add((id, m.Person));
            }
            return list;
        }

        // ---- the game's moments ------------------------------------------------------------------------------------------

        /// <summary>The walker was set down (a new game, a load, a journey): the party's bodies are made again beside them
        /// (and the waiting stand where they were left, once the player is near them).</summary>
        public void SetDown()
        {
            Clear();
            _game = Walkabout != null ? Walkabout.Game : null;
            _elsewhere ??= Elsewhere;
            Townsfolk.Elsewhere = _elsewhere;
            var lead = Walkabout != null ? Walkabout.Walker : null;
            if (_game == null || lead == null) return;
            var f = lead.transform.forward; f.y = 0f;
            _heading = f.sqrMagnitude > 1e-4f ? f.normalized : Vector3.forward;
            var i = 0;
            foreach (var id in _game.World.Party.ToList())
            {
                if (!Usable(id, out var def)) continue;
                Party.Save(_game, id);
                var at = Beside(i++, lead.transform.position);
                var m = Spawn(id, def, at, Quaternion.LookRotation(_heading, Vector3.up), Mode.Following);
                if (m == null) continue;
            }
            _nextSync = 0f;
        }

        /// <summary>The game is left (back to the title): the party's bodies go.</summary>
        public void Clear()
        {
            foreach (var m in _members.Values.ToList()) Remove(m);
            _members.Clear();
        }

        /// <summary>For a save: where each waiting companion stands now.</summary>
        public void Keep()
        {
            if (_game == null) return;
            foreach (var m in _members.Values)
            {
                if (m.Person == null || Party.StateOf(_game, m.Id) != CompanionState.Waiting) continue;
                var p = m.Person.transform.position;
                var loc = Party.Spot(_game, m.Id)?.Location ?? _game.LocationId;
                Party.WaitAt(_game, m.Id, loc, p.x, p.y, p.z, m.Person.transform.eulerAngles.y);
            }
        }

        /// <summary>The story moved on (a conversation ended, a trigger fired; before the places' people are brought up to
        /// date, so one who joins from among them goes on from where they stand): whoever joined gets a body (the one they
        /// stood in, else beside the player), whoever was dismissed waits where they stand, whoever left the road walks off,
        /// and the waiting stand where they were left when the player is near.</summary>
        public void Sync()
        {
            if (Walkabout == null || Walkabout.Walker == null || !Walkabout.Placed) return;
            if (_game != Walkabout.Game) { SetDown(); return; }
            var g = _game;
            var lead = Walkabout.Walker.transform.position;
            var talking = Talking();
            // the party
            var slot = 0;
            foreach (var id in g.World.Party.ToList())
            {
                if (!Usable(id, out var def)) continue;
                Party.Save(g, id);
                if (_members.TryGetValue(id, out var m) && m.Person != null)
                {
                    if (m.Mode != Mode.Following && !m.Person.Held) { m.Mode = Mode.Following; m.Turned = false; m.Asked.x = float.NaN; }
                    slot++;
                    continue;
                }
                // (joined in a conversation: they come once it is over, from where they stood)
                if (talking) continue;
                // one of the places' people joins: they go on in the body they stood in
                var resident = Walkabout.People != null ? Walkabout.People.StandingPeople.FirstOrDefault(p => p != null && p.Def != null && p.Def.Id == id && p.gameObject.activeInHierarchy) : null;
                if (resident != null && resident.Held) continue;
                if (resident != null)
                {
                    if (Spawn(id, def, resident.transform.position, resident.transform.rotation, Mode.Following) != null) Townsfolk.PutAway(resident);
                }
                else Spawn(id, def, Arrival(slot, lead, true), Quaternion.LookRotation(_heading, Vector3.up), Mode.Following);
                slot++;
            }
            // those not with the player any more
            foreach (var m in _members.Values.ToList())
            {
                if (g.World.Party.Contains(m.Id)) continue;
                if (m.Person == null) { _members.Remove(m.Id); continue; }
                if (m.Person.Held) continue;   // (talked to now: after the conversation)
                var state = Party.StateOf(g, m.Id);
                if (Dead(m.Id)) { Remove(m); continue; }
                if (state == CompanionState.Waiting && !Party.PlacedByContent(g, m.Id))
                {
                    if (m.Mode != Mode.Waiting) Wait(m);
                    else if (Flat(m.Person.transform.position, lead) > WaitLeave) Remove(m);   // (their spot stays in the game)
                }
                else if (m.Mode != Mode.Leaving) Leave(m);
            }
            // the waiting, where they were left, when the player is near
            foreach (var id in Party.Waiting(g))
            {
                if (_members.ContainsKey(id) || g.World.Party.Contains(id) || !Usable(id, out var def) || Party.PlacedByContent(g, id)) continue;
                var spot = Party.Spot(g, id);
                if (spot == null) continue;
                if (!spot.HasPoint)
                {
                    // (dismissed while no body of theirs stood: they wait where the player was then)
                    var at = Beside(0, lead);
                    Party.WaitAt(g, id, spot.Location ?? g.LocationId, at.x, at.y, at.z, Yaw(_heading));
                    spot = Party.Spot(g, id);
                }
                var where = new Vector3(spot.X, spot.Y, spot.Z);
                if (Flat(where, lead) > WaitNear) continue;
                Spawn(id, def, where, Quaternion.Euler(0f, spot.Yaw, 0f), Mode.Waiting);
            }
        }

        /// <summary>After a fight: every companion who went down gets up wounded (Core <see cref="Party.AfterFight"/>), their
        /// body off the ground.</summary>
        public void AfterFight(int now)
        {
            if (_game == null) return;
            Party.AfterFight(_game, now);
            foreach (var m in _members.Values)
            {
                if (m.Person == null) continue;
                var anim = m.Person.Animator;
                var rag = anim != null ? anim.GetComponent<Ragdoll>() : null;
                if (rag != null && rag.Fallen) rag.StandUp();
                m.Asked.x = float.NaN;
                m.Turned = false;
            }
        }

        // ---- every frame ---------------------------------------------------------------------------------------------------

        private void Update()
        {
            if (Walkabout == null || Walkabout.Walker == null || !Walkabout.Placed || _game == null) return;
            var lead = Walkabout.Walker;
            var v = lead.Agent != null ? lead.Agent.velocity : Vector3.zero;
            v.y = 0f;
            // where the player is going (kept while they stand: slots do not swing round as they turn on the spot)
            // (by yaw: a vector slerp between opposite headings, the player turning back, swings through the vertical)
            _heading = Heading(_heading, v, Time.deltaTime);
            if (Time.unscaledTime >= _nextSync)
            {
                _nextSync = Time.unscaledTime + SyncEvery;
                _indoors = Walkabout.Indoors();
                Sync();
            }
            if (Time.time < _nextStep) return;
            _nextStep = Time.time + Step;
            var hold = Holding();
            var moving = v.magnitude > 0.3f;
            var slot = 0;
            foreach (var id in _game.World.Party)
            {
                if (!_members.TryGetValue(id, out var m) || m.Mode != Mode.Following || m.Person == null) continue;
                var i = slot++;
                if (m.Person.Held || Down(m) || !Ready(m)) continue;
                if (hold) StandBy(m, i, lead.transform.position);
                else Follow(m, i, lead, moving, v.magnitude);
            }
            foreach (var m in _members.Values.ToList())
            {
                if (m.Person == null) continue;
                if (m.Mode == Mode.Leaving) Away(m, lead.transform.position);
                else if (m.Mode == Mode.Waiting && !m.Person.Held && !Down(m)) Ready(m);
            }
        }

        /// <summary>A conversation, a trade, a camp or a fight is on: the party stands by.</summary>
        private bool Holding()
        {
            var w = Walkabout;
            return w.Paused || Talking() || (w.Trade != null && w.Trade.IsOpen) || (w.Camping != null && w.Camping.IsOpen)
                   || (w.Combat != null && (w.Combat.Active || w.Combat.HudUp));
        }

        private bool Talking() => Walkabout.Conversation != null && Walkabout.Conversation.IsOpen;

        private void Follow(Member m, int i, Walker lead, bool moving, float leadSpeed)
        {
            var a = m.Person.Agent;
            var lp = lead.transform.position;
            var fp = m.Person.transform.position;
            var d = Flat(lp, fp);
            // too far, stuck, or left outside while the player went in: placed beside them (out of view where it can be)
            if (d > CatchUpBeyond || (_indoors && d > 12f) || (m.StuckSince >= 0f && Time.time - m.StuckSince > StuckFor))
            {
                // (indoors there is no out of view to come from: beside them, or they would be placed again and again)
                Place(m, Arrival(i, lp, !_indoors));
                return;
            }
            Stuck(m, a, d);
            var slot = SlotPoint(i, lp, _heading);
            var toSlot = Flat(fp, slot);
            if (lead.Sneaking)
            {
                // the player creeps: the party hangs back and closes up now and then at a walk (their own crouched walk
                // is not paced for them yet), rather than stopping and starting at every step
                var still = !a.pathPending && (!a.hasPath || a.remainingDistance <= a.stoppingDistance + 0.05f);
                if (still && d >= Near && d <= Far + 3f && !Crowded(m)) { Idle(m, lp); return; }
                if (still && toSlot < 0.5f) { Idle(m, lp); return; }
                if (still || float.IsNaN(m.Asked.x)) Go(m, slot, Walker.WalkSpeed);
                return;
            }
            if (Pursue(a, ref m.Asked, ref m.Jogging, slot, lp, fp, _heading, moving, leadSpeed, Crowded(m), out var sent)) Idle(m, lp);
            else if (sent) Moved(m);
        }

        /// <summary>One step of a follower keeping up with a player who is not sneaking (every <see cref="Step"/> s; the
        /// motion gate's "following" states run this same step on the same agent, HumanMotionGateTests): the player moving
        /// (at <paramref name="v"/> m/s), they are sent a little ahead of their <paramref name="slot"/> at a walk, or at a jog
        /// when the player jogs or they have fallen behind; the player stopped, those in the band stand where they are (true:
        /// stand, <see cref="Stand"/>) unless <paramref name="crowded"/>, the rest walk to their place.
        /// <paramref name="sent"/>: a new way was asked of the agent.</summary>
        public static bool Pursue(NavMeshAgent a, ref Vector3 asked, ref bool jogging, Vector3 slot, Vector3 lp, Vector3 fp, Vector3 heading,
            bool moving, float v, bool crowded, out bool sent)
        {
            sent = false;
            var d = Flat(lp, fp);
            var toSlot = Flat(fp, slot);
            var leaderJogs = v > Walker.WalkSpeed + 0.5f;
            jogging = moving ? leaderJogs || (jogging ? toSlot > WalkWithin : toSlot > JogFrom) : d > Far + 4f;
            var speed = jogging ? Walker.JogSpeed : Walker.WalkSpeed;
            if (moving)
            {
                // aimed a little ahead of the slot (where it will be in 0.7 s at the player's pace), so a follower keeps the
                // player's pace instead of braking at every step to a point that has just moved on, and comes in to the slot as
                // the player slows (aimed a fixed metre or more ahead, a jogging companion ran 0.3 m past their slot as the
                // player stopped, turned about and walked back to it, the jog's stride skating the soles, W1, 2026-11-17)
                var ahead = slot + heading * (Mathf.Min(v, speed) * 0.7f);
                ahead = NavMesh.SamplePosition(ahead, out var hit, 1f, NavMesh.AllAreas) ? hit.position : slot;
                sent = Send(a, ref asked, ahead, speed, 0.5f);
                return false;
            }
            // the player has stopped: those in the band stand where they are (unless on top of another of the party), the
            // rest walk to their place
            var idle = !a.pathPending && (!a.hasPath || a.remainingDistance <= a.stoppingDistance + 0.05f);
            if (idle && d >= Near && d <= Far && !crowded) return true;
            if (idle && toSlot < 0.5f) return true;
            sent = Send(a, ref asked, slot, speed);
            return false;
        }

        /// <summary>Where the player is going, eased toward their velocity <paramref name="v"/> while they move (kept while they
        /// stand: slots do not swing round as they turn on the spot; by yaw: a vector slerp between opposite headings, the
        /// player turning back, swings through the vertical).</summary>
        public static Vector3 Heading(Vector3 heading, Vector3 v, float dt)
        {
            v.y = 0f;
            return v.magnitude > 0.3f ? Quaternion.Euler(0f, Mathf.LerpAngle(Yaw(heading), Yaw(v), Mathf.Clamp01(dt * 6f)), 0f) * Vector3.forward : heading;
        }

        /// <summary>A follower's agent, as the townsfolk's (a person's radius and height, the walker's acceleration), yielding to
        /// everyone (<paramref name="priority"/>, 70 and up: the player's way and the townsfolk's are never pushed aside by the
        /// party; a higher number is avoided less). Made off: on once there is a NavMesh under them.</summary>
        public static void Configure(NavMeshAgent agent, int priority)
        {
            agent.radius = 0.28f; agent.height = 1.8f; agent.speed = Walker.WalkSpeed; agent.acceleration = Walker.Acceleration;
            agent.angularSpeed = 360f; agent.stoppingDistance = 0.3f; agent.autoBraking = true;
            agent.obstacleAvoidanceType = ObstacleAvoidanceType.LowQualityObstacleAvoidance;
            agent.avoidancePriority = Mathf.Min(99, priority);
        }

        /// <summary>Standing by (a conversation, a fight): no new walk, but out of the player's way.</summary>
        private void StandBy(Member m, int i, Vector3 lp)
        {
            var a = m.Person.Agent;
            var fp = m.Person.transform.position;
            if (Flat(lp, fp) < Near - 0.2f && !a.hasPath) Go(m, SlotPoint(i, lp, _heading), Walker.WalkSpeed);
            else if (!a.hasPath || a.remainingDistance <= a.stoppingDistance + 0.05f) Idle(m, lp);
        }

        /// <summary>Standing still: once they have stopped, turned (the conversation turn's pace, <see cref="Walkabout.Face"/>)
        /// to look the way the player is going.</summary>
        private void Idle(Member m, Vector3 lp)
        {
            if (Stand(m.Person.Agent, m.Person.transform, lp, _heading, Time.time, ref m.StillSince, ref m.Turned, out var look)) m.Turn = StartCoroutine(Turning(m, look));
        }

        /// <summary>A follower standing still (the motion gate runs this same step): their way ended, and half a second after
        /// they stop, once, true when they should turn to look the way the player is going (at <paramref name="look"/>, the
        /// conversation turn's pace, <see cref="Walkabout.Face"/>). <paramref name="now"/>: the clock, s.</summary>
        public static bool Stand(NavMeshAgent a, Transform body, Vector3 lp, Vector3 heading, float now, ref float stillSince, ref bool turned, out Vector3 look)
        {
            look = lp + heading * 4f;
            if (a.hasPath && a.remainingDistance <= a.stoppingDistance + 0.05f) a.ResetPath();
            if (a.velocity.magnitude > 0.08f) { stillSince = -1f; return false; }
            if (stillSince < 0f) stillSince = now;
            if (turned || now - stillSince < 0.5f) return false;
            turned = true;
            var to = look - body.position; to.y = 0f;
            return to.sqrMagnitude >= 0.01f && Vector3.Angle(body.forward, to) >= 40f;
        }

        private IEnumerator Turning(Member m, Vector3 look)
        {
            yield return Walkabout.Face(m.Person.transform, look);
            m.Turn = null;
        }

        private void Go(Member m, Vector3 to, float speed, float again = 0.8f)
        {
            if (Send(m.Person.Agent, ref m.Asked, to, speed, again)) Moved(m);
        }

        /// <summary>On their way again: a turn on the spot stops.</summary>
        private void Moved(Member m)
        {
            if (m.Turn != null) { StopCoroutine(m.Turn); m.Turn = null; }
            m.Turned = false;
            m.StillSince = -1f;
        }

        /// <summary>Sends an agent at <paramref name="speed"/> to <paramref name="to"/>, unless it is already on its way within
        /// <paramref name="again"/> m of it (asked once: a new path only when the place moved; PITFALL "ask an agent for a
        /// path once"). True when a new way was asked.</summary>
        public static bool Send(NavMeshAgent a, ref Vector3 asked, Vector3 to, float speed, float again = 0.8f)
        {
            a.speed = speed;
            if (!float.IsNaN(asked.x) && Flat(asked, to) < again && (a.pathPending || a.hasPath)) return false;
            asked = to;
            a.SetDestination(to);
            return true;
        }

        /// <summary>Their way is blocked (a path that ends short of where they were sent, or none): since when.</summary>
        private void Stuck(Member m, NavMeshAgent a, float d)
        {
            var blocked = !a.pathPending && a.hasPath && !float.IsNaN(m.Asked.x)
                          && ((a.pathStatus == NavMeshPathStatus.PathPartial && Flat(a.pathEndPosition, m.Asked) > 2f) || a.pathStatus == NavMeshPathStatus.PathInvalid);
            // (or not getting on: sent somewhere and standing still while the player is away)
            var still = a.hasPath && a.velocity.magnitude < 0.05f && d > Far + 4f;
            if (blocked || still) { if (m.StuckSince < 0f) m.StuckSince = Time.time; }
            else m.StuckSince = -1f;
        }

        /// <summary>Another of the party stands within a stride of them.</summary>
        private bool Crowded(Member m)
        {
            var p = m.Person.transform.position;
            foreach (var o in _members.Values)
                if (o != m && o.Person != null && o.Mode != Mode.Leaving && Flat(o.Person.transform.position, p) < 0.8f && string.CompareOrdinal(o.Id, m.Id) < 0) return true;
            return false;
        }

        /// <summary>Where follower <paramref name="i"/> belongs about the player now: their slot on the ground (the nearest
        /// walkable point to it), else a point 2 m behind the player.</summary>
        public static Vector3 SlotPoint(int i, Vector3 lp, Vector3 heading)
        {
            var s = Slots[i % Slots.Length];
            var right = Vector3.Cross(Vector3.up, heading).normalized;
            var p = lp + right * s.x + heading * s.y;
            if (NavMesh.SamplePosition(p, out var hit, 1.5f, NavMesh.AllAreas) && Flat(hit.position, lp) >= Near - 0.2f) return hit.position;
            var back = lp - heading * 2f;
            return NavMesh.SamplePosition(back, out hit, 2f, NavMesh.AllAreas) ? hit.position : p;
        }

        /// <summary>Beside the player on slot <paramref name="i"/>, on the ground (for a body set down before the NavMesh is in).</summary>
        private Vector3 Beside(int i, Vector3 lp)
        {
            var p = SlotPoint(i, lp, _heading);
            if (!NavMesh.SamplePosition(p, out _, 0.5f, NavMesh.AllAreas) && Walkabout.Stage != null) p.y = Walkabout.Stage.Ground(p, lp.y);
            return p;
        }

        /// <summary>Where a follower arrives at the player: out of the camera's view behind them on ground that has a way
        /// to them (<paramref name="outOfView"/>), else beside them.</summary>
        private Vector3 Arrival(int i, Vector3 lp, bool outOfView)
        {
            var cam = Walkabout.Stage != null ? Walkabout.Stage.Camera : null;
            if (outOfView && cam != null)
            {
                var path = new NavMeshPath();
                foreach (var dist in new[] { 14f, 18f, 24f })
                    foreach (var ang in new[] { 0f, 30f, -30f, 60f, -60f })
                    {
                        var p = lp + Quaternion.Euler(0f, ang + i * 9f, 0f) * -_heading * dist;
                        if (!NavMesh.SamplePosition(p, out var hit, 2.5f, NavMesh.AllAreas) || InView(cam, hit.position)) continue;
                        if (!NavMesh.CalculatePath(hit.position, lp, NavMesh.AllAreas, path) || path.status != NavMeshPathStatus.PathComplete) continue;
                        if (Length(path) > dist * 1.8f) continue;
                        return hit.position;
                    }
            }
            return Beside(i, lp);
        }

        /// <summary>Puts a follower down at a point (a placement, never in the middle of a walk in view), facing the player's
        /// way.</summary>
        private void Place(Member m, Vector3 at)
        {
            var a = m.Person.Agent;
            if (m.Turn != null) { StopCoroutine(m.Turn); m.Turn = null; }
            if (a.enabled && a.Warp(at)) { if (a.isOnNavMesh) a.ResetPath(); }
            else m.Person.transform.position = at;
            m.Person.transform.rotation = Quaternion.LookRotation(_heading, Vector3.up);
            m.Asked.x = float.NaN;
            m.StuckSince = -1f;
            m.Jogging = false;
            m.Turned = false;
        }

        /// <summary>The agent on the NavMesh under them once there is one (it is made off, and put back on a mesh built
        /// anew, as the townsfolk's are).</summary>
        private static bool Ready(Member m)
        {
            var a = m.Person.Agent;
            if (a == null || !m.Person.gameObject.activeInHierarchy) return false;
            if (a.enabled && a.isOnNavMesh) return true;
            if (!NavMesh.SamplePosition(m.Person.transform.position, out var hit, 4f, NavMesh.AllAreas)) return false;
            a.enabled = true;
            return a.Warp(hit.position) && a.isOnNavMesh;
        }

        /// <summary>On the ground (a fight's fall) or getting up from it: the ragdoll has them.</summary>
        private static bool Down(Member m)
        {
            var anim = m.Person.Animator;
            var rag = anim != null ? anim.GetComponent<Ragdoll>() : null;
            return rag != null && (rag.Fallen || rag.Blending);
        }

        // ---- waiting and leaving -------------------------------------------------------------------------------------------

        /// <summary>Dismissed: they stop where they stand and wait there (the spot written into the game).</summary>
        private void Wait(Member m)
        {
            m.Mode = Mode.Waiting;
            var a = m.Person.Agent;
            if (a != null && a.enabled && a.isOnNavMesh) a.ResetPath();
            var p = m.Person.transform.position;
            var loc = Party.Spot(_game, m.Id)?.Location ?? _game.LocationId;
            Party.WaitAt(_game, m.Id, loc, p.x, p.y, p.z, m.Person.transform.eulerAngles.y);
        }

        /// <summary>Gone from the road (or the content has them elsewhere): they walk off from the player and are gone once
        /// out of view.</summary>
        private void Leave(Member m)
        {
            if (m.Mode != Mode.Leaving) { m.Mode = Mode.Leaving; m.LeftAt = Time.time; }
            m.Asked.x = float.NaN;
            if (!Ready(m) || Down(m)) return;
            var lp = Walkabout.Walker.transform.position;
            var fp = m.Person.transform.position;
            var dir = fp - lp; dir.y = 0f;
            if (dir.sqrMagnitude < 0.01f) dir = -_heading;
            dir.Normalize();
            foreach (var dist in new[] { 30f, 22f, 15f })
                foreach (var ang in new[] { 0f, 35f, -35f, 70f, -70f })
                {
                    var p = fp + Quaternion.Euler(0f, ang, 0f) * dir * dist;
                    if (!NavMesh.SamplePosition(p, out var hit, 3f, NavMesh.AllAreas)) continue;
                    Go(m, hit.position, Walker.WalkSpeed);
                    return;
                }
        }

        private void Away(Member m, Vector3 lp)
        {
            var cam = Walkabout.Stage != null ? Walkabout.Stage.Camera : null;
            var p = m.Person.transform.position;
            var d = Flat(p, lp);
            var seen = cam != null && InView(cam, p);
            // gone once nobody sees them go (a body that vanished in view would be a jump); one with nowhere to walk off to
            // goes after a minute rather than stand there for ever
            if ((!seen && d > 12f) || d > 45f || cam == null || Time.time - m.LeftAt > LeavingFor) { Remove(m); return; }
            if (m.Person.Held || Down(m) || !Ready(m)) return;
            var a = m.Person.Agent;
            if (float.IsNaN(m.Asked.x) || (!a.pathPending && (!a.hasPath || a.remainingDistance <= a.stoppingDistance + 0.1f))) Leave(m);
        }

        // ---- bodies ----------------------------------------------------------------------------------------------------

        /// <summary>A companion's body: made exactly as the world makes a named person (<see cref="PeopleService"/>: their
        /// Rocketbox person, the same everywhere, in their dyes; else their body from the bases, dressed for their trade),
        /// animated as the townsfolk are, tappable for their conversation, on a NavMeshAgent that waits for the NavMesh.</summary>
        private Member Spawn(string id, NpcDef def, Vector3 at, Quaternion facing, Mode mode)
        {
            var person = Make(id, def, at, facing);
            if (person == null) return null;
            var m = new Member { Id = id, Def = def, Person = person, Mode = mode };
            _members[id] = m;
            return m;
        }

        private Townsperson Make(string id, NpcDef def, Vector3 at, Quaternion facing)
        {
            var people = Walkabout != null ? Walkabout.People : null;
            if (people == null) return null;
            var male = Routine.Male(def.Look);
            GameObject model = null;
            RbDyes? dyes = null;
            PlayerLook look = null;
            var catalog = people.Rocketbox;
            if (catalog != null)
            {
                var built = catalog.Ids();
                var rb = RbPeople.Named(def, male);
                if (rb == null || !built.Contains(rb.Id))
                {
                    var avoid = new HashSet<string>();
                    foreach (var q in RbPeople.All) if (!built.Contains(q.Id)) avoid.Add(q.Id);
                    rb = RbPeople.Pick(id, male, def.Look?.Age ?? 35.0, def.Role, def.Look?.Ancestry, avoid);
                    if (rb != null && avoid.Contains(rb.Id)) rb = null;
                }
                if (rb != null)
                {
                    model = catalog.Get(rb.Id);
                    dyes = RbPeople.DyesFor(rb, id, def.Role, def.Faction);
                }
            }
            if (model == null && people.FromBases)
            {
                look = PeopleService.LookOf(def, male);
                model = male ? people.BaseM : people.BaseF;
            }
            if (model == null) return null;
            var go = Instantiate(model, at, facing, Root);
            go.name = "companion_" + id;
            if (dyes != null) RbDress.Apply(go, dyes.Value);
            else if (look != null)
            {
                go.transform.localScale = Vector3.one * LookView.Scale(look);
                var wardrobe = go.GetComponent<Wardrobe>();
                if (wardrobe != null) Dresser.Dress(wardrobe, PeopleService.OutfitOf(def, male));
                LookView.Apply(go, look);
            }
            var anim = go.GetComponentInChildren<Animator>();
            Ambient ambient = null;
            if (anim != null && people.Locomotion != null)
            {
                ambient = PeopleService.Animate(anim, people.Locomotion, id, male);
                // always animated, as the player's body is: the party is always about the player, and the HUD's portrait
                // and the IK read the pose (culled, a body nothing has drawn yet keeps a stale one: PITFALL P6.1)
                anim.cullingMode = AnimatorCullingMode.AlwaysAnimate;
            }
            var verbs = def.Merchant != null ? new[] { "talk", "trade", "look" } : new[] { "talk", "look" };
            var it = Interactable.Add(go, id, NameOf(def), 0.4f, 1.85f, verbs);
            it.Chosen += (who, verb) => { if (Walkabout != null) Walkabout.StartCoroutine(Walkabout.Respond(who, verb)); };
            var p = go.AddComponent<Townsperson>();
            p.Id = id; p.Def = def; p.Post = at; p.Animator = anim; p.Ambient = ambient; p.Body = male ? "base_m" : "base_f";
            var agent = go.AddComponent<NavMeshAgent>();
            Configure(agent, 70 + _members.Count);
            agent.enabled = false;   // on once there is a NavMesh under them
            p.Agent = agent;
            return p;
        }

        private void Remove(Member m)
        {
            if (m.Turn != null) { StopCoroutine(m.Turn); m.Turn = null; }
            if (m.Person != null)
            {
                Portraits.Forget(m.Person.gameObject);
                Destroy(m.Person.gameObject);
            }
            m.Person = null;
            _members.Remove(m.Id);
        }

        private Transform Root
        {
            get
            {
                // under the walkabout's own object as the townsfolk are (never under a place: a place hides what is under it)
                if (_root == null) { _root = new GameObject("party").transform; _root.SetParent(transform, false); }
                return _root;
            }
        }

        // ---- the story ----------------------------------------------------------------------------------------------

        /// <summary>A companion's placement elsewhere is kept out of sight while they travel with the player or a body of
        /// theirs stands here (<see cref="Townsfolk.Elsewhere"/>).</summary>
        private bool Elsewhere(string id) => id != null && _game != null && (_game.World.Party.Contains(id) || (_members.TryGetValue(id, out var m) && m.Person != null));

        private bool Usable(string id, out NpcDef def) => Registry.Npcs.TryGetValue(id ?? "", out def) && !Dead(id);

        private bool Dead(string id) => _game != null && _game.Npcs.TryGetValue(id, out var n) && n.Dead == true;

        private static string NameOf(NpcDef def)
        {
            var name = string.IsNullOrEmpty(def.Name) ? Bootstrap.Content?.Entry("npcs", def.Id)?["name"]?.ToString() : def.Name;
            return string.IsNullOrEmpty(name) ? Strings.Get("people.someone") : name;
        }

        // ---- geometry -------------------------------------------------------------------------------------------------

        private static bool InView(Camera cam, Vector3 p)
        {
            foreach (var h in new[] { 0.1f, 1.7f })
            {
                var v = cam.WorldToViewportPoint(p + Vector3.up * h);
                if (v.z > 0f && v.x > -0.05f && v.x < 1.05f && v.y > -0.05f && v.y < 1.05f) return true;
            }
            return false;
        }

        private static float Length(NavMeshPath p)
        {
            var d = 0f;
            for (var i = 1; i < p.corners.Length; i++) d += Vector3.Distance(p.corners[i - 1], p.corners[i]);
            return d;
        }

        private static float Yaw(Vector3 dir) => Mathf.Atan2(dir.x, dir.z) * Mathf.Rad2Deg;

        private static float Flat(Vector3 a, Vector3 b)
        {
            a.y = 0f; b.y = 0f;
            return Vector3.Distance(a, b);
        }

        private void OnDestroy()
        {
            if (_elsewhere != null && Townsfolk.Elsewhere == _elsewhere) Townsfolk.Elsewhere = null;
        }
    }
}
