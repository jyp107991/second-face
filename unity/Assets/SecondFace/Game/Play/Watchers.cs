using System;
using System.Collections.Generic;
using SecondFace.Core.Stats;
using SecondFace.Core.State;
using SecondFace.Core.World;
using SecondFace.Game.People;
using SecondFace.Game.World;
using UnityEngine;
using UnityEngine.AI;

namespace SecondFace.Game.Play
{
    /// <summary>
    /// The people about watching the one who walks (P6.3, BUILD_PLAN P6 step 3; rules in Core <see cref="Stealth"/>):
    /// five times a second the light on the walker is read from the world (the sky's key light, the sun or the moon,
    /// unless they are indoors or under the ground; the sky's ambient; the lamps of the places within their range), with
    /// how much of them shows (a sneak, their Stealth, a run) and how far they are heard; then everyone standing within
    /// <see cref="Within"/> m grows more or less aware of them: seen if in their eye and nothing stands between (the
    /// NavMesh between them is unbroken: walls cut it), heard if near enough. Someone past suspicious turns their head to
    /// the walker; someone who has seen them is told (<see cref="Noticed"/>). Outdoor shade from walls and props waits for
    /// the places' colliders (with combat's cover, P6.4).
    /// </summary>
    public sealed class Watchers : MonoBehaviour
    {
        public const float Tick = 0.2f, Within = 30f;
        /// <summary>The lamps are looked for again every so often (places come and go).</summary>
        public const float LampsEvery = 2f;

        public Walker Walker;
        public PeopleService People;
        public SkyController Sky;
        public GameState Game;
        /// <summary>Whether the walker is under a roof or the ground (no sun or moon on them).</summary>
        public Func<bool> Indoors;

        /// <summary>The light on the walker now, 0..1.</summary>
        public double Light { get; private set; }
        /// <summary>How much of the walker shows now.</summary>
        public double Exposure { get; private set; }
        /// <summary>How far the walker is heard now, metres.</summary>
        public double Noise { get; private set; }
        /// <summary>The most aware of the people about, and who that is (null when nobody is about).</summary>
        public double Highest { get; private set; }
        public Townsperson Watcher { get; private set; }
        /// <summary>Someone has seen the walker (their awareness came to <see cref="Stealth.Noticed"/>).</summary>
        public event Action<Townsperson> Noticed;

        private readonly List<Light> _lamps = new();
        private readonly HashSet<Townsperson> _looking = new();
        private float _next, _lampsAt;

        private void Update()
        {
            if (Walker == null || Time.unscaledTime < _next) return;
            _next = Time.unscaledTime + Tick;
            if (Time.timeScale <= 0f) return;   // a screen that stops the world stops their eyes too
            Look(Tick);
        }

        /// <summary>One look round, <paramref name="dt"/> s since the last (tests call it directly).</summary>
        public void Look(float dt)
        {
            if (Walker == null) return;
            var at = Walker.transform.position;
            Light = LightOn(at + Vector3.up * 1.2f);
            var speed = Walker.Agent != null ? Walker.Agent.velocity.magnitude : 0f;
            var stealth = Game != null ? Sheet.Skill(Game.Pc.Sheet, "stealth") : 0;
            Exposure = Stealth.Exposure(Light, Walker.Sneaking, stealth, speed);
            Noise = Stealth.Noise(speed, Walker.Sneaking, stealth);
            Highest = 0; Watcher = null;
            if (People == null) return;
            foreach (var r in People.Residents)
            {
                var p = r.Person;
                if (p == null || !p.gameObject.activeInHierarchy) continue;
                var from = p.transform.position;
                var off = at - from;
                off.y = 0f;
                var d = off.magnitude;
                if (d > Within)
                {
                    // out of their world: what they had of the walker fades
                    p.Awareness = Math.Max(0, p.Awareness - Stealth.Decay * dt);
                    Turn(p, false);
                    continue;
                }
                var angle = d > 0.01f ? Vector3.Angle(p.transform.forward, off) : 0f;
                var los = Math.Abs(at.y - from.y) < 2.5f && !NavMesh.Raycast(from, at, out _, NavMesh.AllAreas);
                var senses = r.Def?.Attrs != null && r.Def.Attrs.TryGetValue("senses", out var s) ? s : 4;
                var was = p.Awareness;
                p.Awareness = Stealth.Step(was, dt, d, angle, los, Exposure, senses, Noise);
                if (was < Stealth.Noticed && p.Awareness >= Stealth.Noticed) Noticed?.Invoke(p);
                Turn(p, p.Awareness >= Stealth.Suspicious);
                if (p.Awareness > Highest) { Highest = p.Awareness; Watcher = p; }
            }
        }

        /// <summary>Who has the walker in their eye now: everyone standing who has seen them (awareness at
        /// <see cref="Stealth.Noticed"/> or more).</summary>
        public List<Townsperson> Seeing()
        {
            var list = new List<Townsperson>();
            if (People == null) return list;
            foreach (var r in People.Residents)
                if (r.Person != null && r.Person.gameObject.activeInHierarchy && r.Person.Awareness >= Stealth.Noticed) list.Add(r.Person);
            return list;
        }

        /// <summary>Everyone's awareness back to nothing (a load, a test).</summary>
        public void Calm()
        {
            if (People != null)
                foreach (var r in People.Residents)
                    if (r.Person != null) { r.Person.Awareness = 0; Turn(r.Person, false); }
            Highest = 0; Watcher = null;
        }

        /// <summary>The light at a point: the sky's key light unless indoors, its ambient, the lamps in range.</summary>
        public double LightOn(Vector3 point)
        {
            var key = 0.0; var ambient = 0.0;
            if (Sky != null)
            {
                key = Sky.Look.LightIntensity;
                ambient = Sky.Look.AmbientSky.Luma;
            }
            if (Time.unscaledTime >= _lampsAt)
            {
                _lampsAt = Time.unscaledTime + LampsEvery;
                _lamps.Clear();
                foreach (var l in FindObjectsByType<Light>(FindObjectsSortMode.None))
                    if (l.type == LightType.Point || l.type == LightType.Spot) _lamps.Add(l);
            }
            var lamps = 0.0;
            foreach (var l in _lamps)
                if (l != null && l.isActiveAndEnabled) lamps += Stealth.Lamp(l.intensity, l.range, Vector3.Distance(l.transform.position, point));
            return Stealth.Light(key, Indoors != null && Indoors(), ambient, lamps);
        }

        /// <summary>A suspicious one turns their head to the walker (unless they are already looking at someone else).</summary>
        private void Turn(Townsperson p, bool look)
        {
            var gaze = p.Animator != null ? p.Animator.GetComponent<Gaze>() : null;
            if (gaze == null) return;
            var head = Walker.Animator != null ? Walker.Animator.GetBoneTransform(HumanBodyBones.Head) : null;
            if (look && (gaze.Target == null || _looking.Contains(p)))
            {
                gaze.Target = head != null ? head : Walker.transform;
                _looking.Add(p);
            }
            else if (!look && _looking.Remove(p)) gaze.Target = null;
        }

    }
}
