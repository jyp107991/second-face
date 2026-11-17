using System.Collections;
using System.Collections.Generic;
using SecondFace.Core.Combat;
using SecondFace.Game.People;
using UnityEngine;
using UnityEngine.AI;

namespace SecondFace.Game.Play
{
    /// <summary>
    /// How one fighter's body shows what the fight does (COMBAT.md A1–A8's hooks): the fight (<see cref="Combat"/>) asks
    /// for each beat and waits on the ones that take time; the rules have already happened (Core <see cref="Battle"/>), the
    /// view only plays them. The animation package (WP2) replaces <see cref="PlaceholderUnitView"/> through
    /// <see cref="Combat.MakeView"/> with captured motion (weapons in hands, aim, fire, recoil, hit reactions by direction
    /// and zone, cover, throws, falls and rises) and adds each state to the motion gate; until then the placeholder keeps
    /// today's behaviour (a turn to face, a tracer, a flinch, a ragdoll). Every timing is the fight's pace's
    /// (<see cref="Pace"/>), so the speed setting and skip reach the animation too.
    /// </summary>
    public interface IUnitView
    {
        BattleUnit Unit { get; }
        Transform Body { get; }
        /// <summary>The fight's pace (set by the fight before each beat).</summary>
        CombatPace Pace { get; set; }
        /// <summary>The unit is the other side's (their beats follow the skip setting).</summary>
        bool Theirs { get; }

        /// <summary>Walks the body to <paramref name="goal"/> along <paramref name="path"/> (the NavMesh corners, the body's
        /// own point first) at the fight's jog; ends when it is there (or gives up). With <paramref name="wait"/> false the
        /// walk starts and the call returns at once (a walk out of the player's sight, made beside the others').</summary>
        IEnumerator OnMove(Vector3 goal, IReadOnlyList<Vector3> path, bool wait = true);
        /// <summary>Still walking a walk begun without waiting.</summary>
        bool Moving { get; }
        /// <summary>Turns to face a point and raises the weapon (A3, A4: aim; the placeholder only turns).</summary>
        IEnumerator OnAim(Vector3 at);
        /// <summary>One round fired at a point (A3: muzzle flash, recoil, shell, tracer); <paramref name="hit"/> whether it
        /// struck its mark; <paramref name="round"/> of <paramref name="rounds"/> (a burst's rounds come one call each).</summary>
        IEnumerator OnFire(Vector3 at, bool hit, int round, int rounds = 1);
        /// <summary>A blow struck (A4: wind-up, strike, follow-through).</summary>
        IEnumerator OnStrike(Vector3 at, bool hit);
        /// <summary>Struck (A5): from which way, where (head, torso, armL..., legL...), how hard (graze, hit, crit).</summary>
        void OnHit(Vector3 from, string zone, string kind);
        /// <summary>Missed (A5): a blow blocked or slipped (<paramref name="melee"/>), a shot flinched from.</summary>
        void OnMiss(Vector3 from, bool melee);
        /// <summary>Goes down (A8: the ragdoll), pushed away from <paramref name="from"/>.</summary>
        void OnFall(Vector3 from);
        /// <summary>Gets back up (A8).</summary>
        void OnRise();
        /// <summary>Takes a stance (A6, C2: stand, crouch, prone).</summary>
        void OnStance(string stance);
        /// <summary>Throws along an arc (A7; the arc's points from the hand to where it lands); <paramref name="item"/>: what
        /// is thrown (an item id; null: the active weapon).</summary>
        IEnumerator OnThrow(IReadOnlyList<Vector3> arc, string item = null);
        /// <summary>Reloads (A3).</summary>
        IEnumerator OnReload();
        /// <summary>Holds a shot (overwatch, cover fire, a suppression, a guard).</summary>
        void OnHold(string mode);
        /// <summary>Throws down the weapon (A8: hands up).</summary>
        void OnYield();
        /// <summary>Put back at once where a walk began (an undo).</summary>
        void Place(Vector3 at, Quaternion facing);
        /// <summary>The fight is over (A1: the weapon back in its holster or sling, the body back to the people's own
        /// motion; the dead stay where they fell).</summary>
        void OnEnd();
    }

    /// <summary>The fight's flashes and lines (a tracer, a muzzle flash, a throw's arc in the air), shared by the views:
    /// one line renderer each, one light, no allocation per shot.</summary>
    public sealed class CombatFx
    {
        private readonly Transform _parent;
        private LineRenderer _tracer, _arc;
        private Light _flash;

        public CombatFx(Transform parent) { _parent = parent; }

        private LineRenderer Line(string name, Color c, float width)
        {
            var lr = new GameObject(name).AddComponent<LineRenderer>();
            lr.transform.SetParent(_parent, false);
            lr.material = new Material(Shader.Find("Sprites/Default"));
            lr.startColor = lr.endColor = c; lr.startWidth = lr.endWidth = width;
            lr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            lr.receiveShadows = false;
            lr.enabled = false;
            return lr;
        }

        /// <summary>A round's tracer and muzzle flash for <paramref name="seconds"/> (the pace's), then a beat.</summary>
        public IEnumerator Tracer(Vector3 from, Vector3 to, float seconds, float after)
        {
            if (_tracer == null) _tracer = Line("tracer", new Color(1f, 0.86f, 0.6f, 1f), 0.035f);
            if (_flash == null)
            {
                _flash = new GameObject("muzzle").AddComponent<Light>();
                _flash.transform.SetParent(_parent, false);
                _flash.type = LightType.Point; _flash.range = 5f; _flash.intensity = 3f; _flash.color = new Color(1f, 0.8f, 0.5f);
            }
            _tracer.positionCount = 2;
            _tracer.SetPosition(0, from); _tracer.SetPosition(1, to);
            _tracer.enabled = true;
            _flash.transform.position = from;
            _flash.enabled = true;
            yield return Wait(seconds);
            _tracer.enabled = false;
            _flash.enabled = false;
            yield return Wait(after);
        }

        private readonly Queue<GameObject> _shells = new();
        private Material _brass;

        /// <summary>A round's muzzle flash at a muzzle (the light for a few frames: A3).</summary>
        public void Flash(Vector3 muzzle)
        {
            if (_flash == null)
            {
                _flash = new GameObject("muzzle").AddComponent<Light>();
                _flash.transform.SetParent(_parent, false);
                _flash.type = LightType.Point; _flash.range = 5f; _flash.intensity = 3f; _flash.color = new Color(1f, 0.8f, 0.5f);
                _flash.enabled = false;
            }
            _flash.transform.position = muzzle;
            _flash.enabled = true;
        }

        public void FlashOff() { if (_flash != null) _flash.enabled = false; }

        /// <summary>A spent case thrown out to the right of the breech (A3), on the ground a moment, then gone (pooled: at most
        /// a dozen at once).</summary>
        public void Shell(Vector3 at, Vector3 right)
        {
            GameObject s;
            if (_shells.Count >= 12) { s = _shells.Dequeue(); }
            else
            {
                s = GameObject.CreatePrimitive(PrimitiveType.Capsule);
                s.name = "shell";
                s.transform.SetParent(_parent, false);
                s.transform.localScale = new Vector3(0.012f, 0.014f, 0.012f);
                if (_brass == null)
                {
                    var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
                    _brass = new Material(shader) { color = new Color(0.72f, 0.55f, 0.25f) };
                }
                s.GetComponent<Renderer>().sharedMaterial = _brass;
                s.GetComponent<Renderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                s.AddComponent<Rigidbody>().mass = 0.01f;
            }
            _shells.Enqueue(s);
            s.SetActive(true);
            s.transform.position = at;
            var rb = s.GetComponent<Rigidbody>();
            rb.linearVelocity = right * 2.2f + Vector3.up * 1.6f + Random.insideUnitSphere * 0.3f;
            rb.angularVelocity = Random.insideUnitSphere * 20f;
        }

        /// <summary>Something thrown flying along an arc (a short bright segment travelling it).</summary>
        public IEnumerator Arc(IReadOnlyList<Vector3> arc, float seconds)
        {
            if (arc == null || arc.Count < 2) yield break;
            if (_arc == null) _arc = Line("throw", new Color(1f, 0.9f, 0.7f, 1f), 0.06f);
            _arc.positionCount = 2;
            _arc.enabled = true;
            var t0 = Time.time;
            while (Time.time - t0 < seconds)
            {
                var t = (Time.time - t0) / Mathf.Max(0.01f, seconds) * (arc.Count - 1);
                var i = Mathf.Min(arc.Count - 2, (int)t);
                var p = Vector3.Lerp(arc[i], arc[i + 1], t - i);
                var q = Vector3.Lerp(arc[Mathf.Max(0, i - 1)], arc[i], t - i);
                _arc.SetPosition(0, q); _arc.SetPosition(1, p);
                yield return null;
            }
            _arc.enabled = false;
        }

        /// <summary>Waits in game time (a fight's beats pause with the game).</summary>
        public static IEnumerator Wait(float seconds)
        {
            if (seconds <= 0f) yield break;
            var t0 = Time.time;
            while (Time.time - t0 < seconds) yield return null;
        }
    }

    /// <summary>
    /// Today's bodies in a fight, behind <see cref="IUnitView"/> until the animation package (WP2) lands: walks by the
    /// NavMesh agent at a jog (the walker's own, or a townsperson's), a turn to face for an aim, a tracer and a flash for a
    /// shot, the ambient flinch for a hit, the ragdoll for a fall and its blend back for a rise; stances, reloads and held
    /// shots have no motion yet (said in the log).
    /// </summary>
    public sealed class PlaceholderUnitView : IUnitView
    {
        private readonly MonoBehaviour _host;
        private readonly CombatFx _fx;
        private readonly Walker _walker;
        private readonly Townsperson _person;
        private Coroutine _walk;
        private bool _walking;

        public BattleUnit Unit { get; }
        public Transform Body { get; }
        public CombatPace Pace { get; set; } = CombatPace.Normal;
        public bool Theirs { get; }
        public bool Moving => _walking;
        /// <summary>The pace a walk goes at (m/s; null: the fight's jog). The animation package walks a crouched fighter at
        /// the captured sneak's pace, so its feet keep to the ground.</summary>
        public float? Speed { get; set; }

        public PlaceholderUnitView(BattleUnit unit, Transform body, MonoBehaviour host, CombatFx fx, Walker walker, Townsperson person, bool theirs)
        {
            Unit = unit; Body = body; _host = host; _fx = fx; _walker = walker; _person = person; Theirs = theirs;
        }

        public IEnumerator OnMove(Vector3 goal, IReadOnlyList<Vector3> path, bool wait = true)
        {
            if (Body == null) yield break;
            if (_walk != null) { _host.StopCoroutine(_walk); _walk = null; }
            _walking = false;
            var run = Walk(goal);
            if (!wait)
            {
                // (flagged before it starts: a walk with nothing to walk ends inside StartCoroutine itself)
                _walking = true;
                var c = _host.StartCoroutine(Background(run));
                if (_walking) _walk = c;
                yield break;
            }
            yield return run;
        }

        private IEnumerator Background(IEnumerator run)
        {
            yield return run;
            _walking = false;
            _walk = null;
        }

        private IEnumerator Walk(Vector3 goal)
        {
            var t0 = Time.time;
            // a fight's moves are at a jog (a walk across a square under fire reads as a stroll, and drags the turn)
            if (_walker != null)
            {
                _walker.GoTo(goal);
                _walker.Agent.speed = Speed ?? Mathf.Max(_walker.Agent.speed, Walker.JogSpeed);
                while (_walker != null && _walker.Goal != null && Time.time - t0 < 6f) yield return null;
            }
            else if (_person != null && _person.Agent != null && _person.Agent.enabled && _person.Agent.isOnNavMesh)
            {
                var pace = _person.Agent.speed;
                _person.Agent.speed = Speed ?? Walker.JogSpeed;
                _person.Agent.SetDestination(goal);
                yield return null;
                while (_person != null && _person.Agent.pathPending && Time.time - t0 < 2f) yield return null;
                // there when within the agent's own stopping distance (a townsperson stops 0.4 m short)
                while (_person != null && _person.Agent.isOnNavMesh && _person.Agent.remainingDistance > _person.Agent.stoppingDistance + 0.1f && Time.time - t0 < 6f) yield return null;
                if (_person != null && _person.Agent != null) _person.Agent.speed = pace;
            }
            else if (Body != null) { Body.position = goal; yield return null; }
        }

        public IEnumerator OnAim(Vector3 at)
        {
            if (Body == null) yield break;
            var to = at - Body.position; to.y = 0f;
            if (to.sqrMagnitude < 0.01f) yield break;
            var from = Body.rotation; var goal = Quaternion.LookRotation(to.normalized, Vector3.up);
            var secs = Mathf.Max(0.05f, Pace.Seconds(0.25f, Theirs));
            for (var t = 0f; t < 1f; t += Time.deltaTime / secs) { if (Body == null) yield break; Body.rotation = Quaternion.Slerp(from, goal, t); yield return null; }
            if (Body != null) Body.rotation = goal;
        }

        public IEnumerator OnFire(Vector3 at, bool hit, int round, int rounds = 1)
        {
            if (Body == null) yield break;
            yield return _fx.Tracer(Body.position + Vector3.up * 1.35f + Body.forward * 0.4f, at, Mathf.Max(0.04f, Pace.Seconds(0.07f, Theirs)), Pace.Seconds(0.12f, Theirs));
        }

        public IEnumerator OnStrike(Vector3 at, bool hit)
        {
            yield return CombatFx.Wait(Pace.Seconds(0.2f, Theirs));
        }

        public void OnHit(Vector3 from, string zone, string kind)
        {
            if (Body == null) return;
            var amb = Body.GetComponentInChildren<Ambient>();
            if (amb != null) amb.Gesture("wave");
        }

        public void OnMiss(Vector3 from, bool melee) { }

        public void OnEnd() { }

        public void OnFall(Vector3 from)
        {
            if (Body == null) return;
            var anim = Body.GetComponentInChildren<Animator>();
            if (anim != null)
            {
                var rag = anim.GetComponent<Ragdoll>();
                if (rag == null) rag = anim.gameObject.AddComponent<Ragdoll>();
                var push = Body.position - from; push.y = 0f;
                rag.Fall(push.normalized * 120f + Vector3.up * 20f, Body.position + Vector3.up * 1.2f);
            }
            if (_person != null && _person.Agent != null) _person.Agent.enabled = false;
        }

        public void OnRise()
        {
            var anim = Body != null ? Body.GetComponentInChildren<Animator>() : null;
            var rag = anim != null ? anim.GetComponent<Ragdoll>() : null;
            if (rag != null && rag.Fallen) rag.StandUp();
        }

        public void OnStance(string stance) { }

        public IEnumerator OnThrow(IReadOnlyList<Vector3> arc, string item = null)
        {
            if (arc == null || arc.Count < 2) yield break;
            yield return OnAim(arc[arc.Count - 1]);
            yield return _fx.Arc(arc, Mathf.Max(0.1f, Pace.Seconds(0.6f, Theirs)));
        }

        public IEnumerator OnReload() { yield return CombatFx.Wait(Pace.Seconds(0.3f, Theirs)); }

        public void OnHold(string mode) { }

        public void OnYield() { }

        public void Place(Vector3 at, Quaternion facing)
        {
            if (Body == null) return;
            var agent = _walker != null ? _walker.Agent : _person != null ? _person.Agent : null;
            if (agent != null && agent.enabled && agent.isOnNavMesh)
            {
                agent.ResetPath();
                agent.Warp(at);
            }
            else Body.position = at;
            Body.rotation = facing;
        }

        /// <summary>The arc of a throw from a hand to a point (a parabola, apex by the distance), as world points.</summary>
        public static void ArcPoints(Vector3 from, Vector3 to, List<Vector3> into, int segments = 16)
        {
            into.Clear();
            var flat = to - from; flat.y = 0f;
            var apex = Mathf.Clamp(flat.magnitude * 0.35f, 1f, 6f);
            for (var i = 0; i <= segments; i++)
            {
                var t = i / (float)segments;
                var p = Vector3.Lerp(from, to, t);
                p.y += apex * 4f * t * (1f - t);
                into.Add(p);
            }
        }
    }
}
