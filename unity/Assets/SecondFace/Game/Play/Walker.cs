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
        private static readonly int Speed = Animator.StringToHash("Speed");

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
                w.Animator.cullingMode = AnimatorCullingMode.CullUpdateTransforms;
                w.Animator.gameObject.AddComponent<SecondFace.Game.People.FootPlant>();
                w.Animator.gameObject.AddComponent<SecondFace.Game.People.Gaze>();
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
            if (!Agent.isOnNavMesh && !Settle()) return false;
            if (!NavMesh.SamplePosition(point, out var hit, SampleRadius, NavMesh.AllAreas)) return false;
            Agent.speed = Vector3.Distance(transform.position, hit.position) > JogBeyond ? JogSpeed : WalkSpeed;
            if (!Agent.SetDestination(hit.position)) return false;
            Goal = hit.position;
            return true;
        }

        /// <summary>Puts it on the NavMesh under it once there is one (the mesh is built after it is set down).</summary>
        public bool Settle()
        {
            if (Agent.isOnNavMesh) return true;
            if (!NavMesh.SamplePosition(transform.position, out var hit, SampleRadius, NavMesh.AllAreas)) return false;
            return Agent.Warp(hit.position);
        }

        private void Update()
        {
            if (!Agent.isOnNavMesh) Settle();
            if (Goal is { } g && Agent.isOnNavMesh && !Agent.pathPending && Agent.remainingDistance <= Agent.stoppingDistance + 0.05f) Goal = null;
            if (Animator != null) Animator.SetFloat(Speed, Agent.velocity.magnitude, 0.12f, Time.deltaTime);
        }
    }
}
