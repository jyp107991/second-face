using System.Collections;
using SecondFace.Core.World;
using UnityEngine;
using UnityEngine.AI;

namespace SecondFace.Game.Play
{
    /// <summary>
    /// The one the player walks for now (step 25): a person on a NavMeshAgent (a person's radius and height), sent where
    /// the player taps; walks, or jogs to a goal more than <see cref="JogBeyond"/> m off. The locomotion controller's
    /// "Speed" follows the agent's real speed, so the captured walk and jog blend at the pace the feet move (their
    /// clips' own speeds are the blend's thresholds). Turns are the agent's, quick. The P4 player replaces it.
    /// </summary>
    [RequireComponent(typeof(NavMeshAgent))]
    public sealed class Walker : MonoBehaviour
    {
        public const float WalkSpeed = 1.4f, JogSpeed = 3.2f, JogBeyond = 22f, SampleRadius = 4f;
        /// <summary>The controller's pickup (LocomotionBuild): played from 0.7 s in at 1.4 times, lowest at the clip's 2.3 s.</summary>
        public const float PickupFrom = 0.7f, PickupSpeed = 1.4f, PickupLowest = 2.3f;
        private static readonly int Speed = Animator.StringToHash("Speed");
        private static readonly int Pickup = Animator.StringToHash("pickup");
        private static readonly int Locomotion = Animator.StringToHash("Locomotion");
        private static readonly int SneakOn = Animator.StringToHash("Sneak"), SneakRate = Animator.StringToHash("SneakRate");
        /// <summary>How long sitting down or getting up takes (the body moves and the motion blends over it).</summary>
        public const float SitTime = 0.6f;

        /// <summary>Sitting (on a chair, on the ground): the agent holds still and the body is placed by hand; any walk
        /// gets it up first.</summary>
        public bool Seated { get; private set; }
        private Vector3 _standAt;
        private Coroutine _seating;
        /// <summary>Where it stands, or would stand up to while seated (what a save keeps).</summary>
        public Vector3 Footing => Seated ? _standAt : transform.position;

        /// <summary>In a sneak (P6.3): crouched, at the captured crouched walk's pace (<see cref="Stealth.SneakSpeed"/>).</summary>
        public bool Sneaking { get; private set; }

        public NavMeshAgent Agent { get; private set; }
        public Animator Animator { get; private set; }
        /// <summary>Where it was last sent (null when it has arrived or was never sent).</summary>
        public Vector3? Goal { get; private set; }

        /// <summary>Makes a walker from a person model with the locomotion controller, standing at a point.</summary>
        public static Walker Create(GameObject model, RuntimeAnimatorController locomotion, Vector3 at, float yaw)
        {
            var go = Instantiate(model, at, Quaternion.Euler(0, yaw, 0));
            go.name = "Walker";
            var agent = go.AddComponent<NavMeshAgent>();
            agent.radius = 0.3f; agent.height = 1.8f;
            agent.speed = WalkSpeed; agent.acceleration = 10f; agent.angularSpeed = 720f;
            agent.stoppingDistance = 0.15f; agent.autoBraking = true;
            agent.obstacleAvoidanceType = ObstacleAvoidanceType.LowQualityObstacleAvoidance;
            var w = go.AddComponent<Walker>();
            w.Agent = agent;
            w.Animator = go.GetComponentInChildren<Animator>();
            if (w.Animator != null)
            {
                w.Animator.runtimeAnimatorController = locomotion;
                w.Animator.applyRootMotion = false;
                // always: the player is always in view, and photo mode, portraits, the IK and a sit read the pose
                // (culled, a body nothing has rendered yet keeps a stale pose: in batch tests, every body)
                w.Animator.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                w.Animator.gameObject.AddComponent<SecondFace.Game.People.FootPlant>();
                w.Animator.gameObject.AddComponent<SecondFace.Game.People.Gaze>();
                w.Animator.gameObject.AddComponent<SecondFace.Game.People.ArmClearance>();
            }
            return w;
        }

        private void Awake()
        {
            Agent ??= GetComponent<NavMeshAgent>();
            Animator ??= GetComponentInChildren<Animator>();
        }

        /// <summary>Sends it to the walkable point nearest a world point (false if there is none near).</summary>
        public bool GoTo(Vector3 point)
        {
            if (Seated) Stand();
            if (!Agent.isOnNavMesh && !Settle()) return false;
            if (!NavMesh.SamplePosition(point, out var hit, SampleRadius, NavMesh.AllAreas)) return false;
            Agent.speed = Sneaking ? Stealth.SneakSpeed : Vector3.Distance(transform.position, hit.position) > JogBeyond ? JogSpeed : WalkSpeed;
            if (!Agent.SetDestination(hit.position)) return false;
            Goal = hit.position;
            return true;
        }

        /// <summary>Walks it in a direction while a stick or keys are held (<paramref name="amount"/> 0..1: a walk, a jog
        /// at full tilt), turning it that way; nothing held stops it. A tap's errand is dropped.</summary>
        public void Steer(Vector3 direction, float amount)
        {
            direction.y = 0f;
            if (amount < 0.15f || direction.sqrMagnitude < 1e-4f)
            {
                if (_steering && Agent.isOnNavMesh) { Agent.ResetPath(); Agent.velocity = Vector3.zero; }
                _steering = false;
                return;
            }
            if (Seated) Stand();
            if (!Agent.isOnNavMesh && !Settle()) return;
            _steering = true;
            Goal = null;
            if (Agent.hasPath) Agent.ResetPath();
            var dir = direction.normalized;
            var top = Sneaking ? Stealth.SneakSpeed : WalkSpeed;
            Agent.velocity = dir * (amount > 0.9f && !Sneaking ? JogSpeed : top * Mathf.Lerp(0.6f, 1f, Mathf.InverseLerp(0.15f, 0.9f, amount)));
            transform.rotation = Quaternion.RotateTowards(transform.rotation, Quaternion.LookRotation(dir, Vector3.up), Agent.angularSpeed * Time.deltaTime);
        }

        /// <summary>Goes into a sneak or out of it (P6.3): crouched and slow, or up and walking.</summary>
        public void Sneak(bool on)
        {
            Sneaking = on;
            if (Animator != null) Animator.SetBool(SneakOn, on);
            Agent.speed = on ? Stealth.SneakSpeed : WalkSpeed;
        }

        /// <summary>Stops and stoops to pick something up (the controller's "pickup"; it straightens and goes back to
        /// standing by itself); the seconds until the hands are at the ground (0 without the motion).</summary>
        public float PickUp()
        {
            if (Agent.isOnNavMesh) { Agent.ResetPath(); Agent.velocity = Vector3.zero; }
            Goal = null;
            if (Animator == null || !Animator.HasState(0, Pickup)) return 0f;
            Animator.CrossFadeInFixedTime(Pickup, 0.2f, 0, PickupFrom);
            return (PickupLowest - PickupFrom) / PickupSpeed;
        }

        /// <summary>Sits (a state of the controller: "sit" on a chair, "sit_ground" on the ground) with the hips over
        /// <paramref name="seat"/> facing <paramref name="yaw"/>: it stops, the body moves there as the motion blends in,
        /// and it stays until <see cref="Stand"/> (a walk does it). Where it stood is where it gets up to.</summary>
        public void Sit(string state, Vector3 seat, float yaw)
        {
            if (Animator == null || !Animator.HasState(0, Animator.StringToHash(state))) return;
            if (Agent.isOnNavMesh) { Agent.ResetPath(); Agent.velocity = Vector3.zero; }
            Goal = null;
            _steering = false;
            if (!Seated) _standAt = transform.position;
            Seated = true;
            Planting(false);
            Agent.updatePosition = false;
            Agent.updateRotation = false;
            Animator.CrossFadeInFixedTime(state, SitTime * 0.8f, 0);
            Move(seat, Quaternion.Euler(0f, yaw, 0f));
        }

        /// <summary>Gets up where it sat down from and walks again.</summary>
        public void Stand()
        {
            if (!Seated) return;
            Seated = false;
            if (_seating != null) StopCoroutine(_seating);
            _seating = null;
            if (Animator != null) Animator.CrossFadeInFixedTime(Locomotion, SitTime * 0.6f, 0);
            transform.position = _standAt;
            if (Agent.isOnNavMesh) Agent.Warp(_standAt);
            Agent.updatePosition = true;
            Agent.updateRotation = true;
            Planting(true);
        }

        /// <summary>Foot planting on or off: a seated body rests its feet where the capture put them (the humanoid IK is
        /// full-body: feet held to the floor in a sit pull the hips up off the seat).</summary>
        private void Planting(bool on)
        {
            var plant = Animator != null ? Animator.GetComponent<SecondFace.Game.People.FootPlant>() : null;
            if (plant != null) plant.enabled = on;
            // seated, the hands rest on the lap: the torso's clearance would push them off it
            var clear = Animator != null ? Animator.GetComponent<SecondFace.Game.People.ArmClearance>() : null;
            if (clear != null) clear.enabled = on;
        }

        private void Move(Vector3 to, Quaternion facing)
        {
            if (_seating != null) StopCoroutine(_seating);
            _seating = StartCoroutine(Moving(to, facing));
        }

        private IEnumerator Moving(Vector3 to, Quaternion facing)
        {
            var from = transform.position;
            var turn = transform.rotation;
            // unscaled: a camp stops time, and the walker still sits down by the fire
            for (var t = 0f; t < 1f; t += Time.unscaledDeltaTime / SitTime)
            {
                var k = Mathf.SmoothStep(0f, 1f, t);
                transform.SetPositionAndRotation(Vector3.Lerp(from, to, k), Quaternion.Slerp(turn, facing, k));
                yield return null;
            }
            transform.SetPositionAndRotation(to, facing);
            _seating = null;
        }

        /// <summary>A stick or keys are walking it.</summary>
        public bool Steering => _steering;
        private bool _steering;

        /// <summary>Puts it on the NavMesh under it once there is one (the mesh is built after it is set down).</summary>
        public bool Settle()
        {
            if (Agent.isOnNavMesh) return true;
            if (!NavMesh.SamplePosition(transform.position, out var hit, SampleRadius, NavMesh.AllAreas)) return false;
            return Agent.Warp(hit.position);
        }

        private void Update()
        {
            if (!Agent.isOnNavMesh && !Seated) Settle();
            if (Goal is { } g && Agent.isOnNavMesh && !Agent.pathPending && Agent.remainingDistance <= Agent.stoppingDistance + 0.05f) Goal = null;
            if (Animator != null)
            {
                Animator.SetFloat(Speed, Agent.velocity.magnitude, 0.12f, Time.deltaTime);
                if (Sneaking) Animator.SetFloat(SneakRate, Mathf.Clamp(Agent.velocity.magnitude / Stealth.SneakSpeed, 0f, 1.6f), 0.1f, Time.deltaTime);
            }
        }
    }
}
