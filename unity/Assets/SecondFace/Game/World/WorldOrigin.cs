using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AI;
using UnityEngine.SceneManagement;

namespace SecondFace.Game.World
{
    /// <summary>
    /// The world's floating origin (docs/MOTION_ROOT_CAUSE.md §19): Unity's coordinates are the world's less an offset (<see cref="OX"/>,
    /// <see cref="OZ"/>), kept so that play stays near (0, 0, 0). In float32 the towns' 16 km round to 1-2 mm, and the foot plant, the
    /// arm clearance, Fighter's holds, the Animator's own foot IK and the skinning lost that precision there (the hips 12.4 cm out,
    /// the feet turned over, the hands 17.5°; §19). The world's own coordinates (Core's battle, the saves, the content) stay logical:
    /// <see cref="ToUnity(double, double, double)"/> on the way in, <see cref="ToWorld"/> on the way out.
    /// <para>The offset moves in whole chunks (<see cref="Step"/>, 512 m): every position and the shift are then multiples of one float
    /// step, so a rebase rounds nothing.</para>
    /// <para>The box (<see cref="Box"/>), from the precision the people need: a person stands at most PeopleService.Leave (140 m) from
    /// the one who walks, so with the walker within 768 m of Unity's origin along x and z every standing person is within 1024 m,
    /// where a float's step is 2^-14 m = 0.061 mm, under the 0.1 mm the twins' test (§19, e1) showed to be nearly harmless. After a
    /// rebase the walker is within 256 m of the origin (the shift rounds to the nearest chunk), so the next comes after at least
    /// 512 m of travel: some 6-10 minutes on foot.</para>
    /// <para>The rebase is split over two frames (§19.2): in the first the roots move and the physics' poses are synced together (a
    /// raycast between them would find the old ground), and every holder of a position is told (<see cref="IRebase"/>); the
    /// navigation agents are held (not moved by their agents, stopped); in the next the NavMesh data are re-added at their new place
    /// (<see cref="INavRebase"/>), then every held agent is warped where its body now stands and sent on to its shifted goal.</para>
    /// </summary>
    public static class WorldOrigin
    {
        /// <summary>The rebase's step: the world's chunk (m).</summary>
        public const float Step = 512f;
        /// <summary>How far the walker may stand from Unity's origin along x or z before the world is rebased (m; the derivation above).</summary>
        public const float Box = 768f;

        /// <summary>The offset: a world point is a Unity point plus this (m; whole <see cref="Step"/>s; y is never moved).</summary>
        public static double OX { get; private set; }
        public static double OZ { get; private set; }

        public static Vector3 ToUnity(double x, double y, double z) => new((float)(x - OX), (float)y, (float)(z - OZ));
        public static Vector3 ToUnity(Vector3 world) => ToUnity(world.x, world.y, world.z);
        public static Vector3 ToWorld(Vector3 unity) => new((float)(unity.x + OX), unity.y, (float)(unity.z + OZ));
        public static double WorldX(double unityX) => unityX + OX;
        public static double WorldZ(double unityZ) => unityZ + OZ;
        public static double UnityX(double worldX) => worldX - OX;
        public static double UnityZ(double worldZ) => worldZ - OZ;

        /// <summary>The offset now, to be compared later (<see cref="Since"/>): for a coroutine that keeps a Unity point across a
        /// yield.</summary>
        public static (double X, double Z) Stamp => (OX, OZ);
        /// <summary>The Unity shift since a stamp (add it to a point kept from then).</summary>
        public static Vector3 Since((double X, double Z) stamp) => new((float)(stamp.X - OX), 0f, (float)(stamp.Z - OZ));

        /// <summary>A holder of a Unity position across frames (§19.1): told the shift in the rebase's frame.</summary>
        public interface IRebase { void OnRebase(Vector3 delta); }
        /// <summary>A holder of NavMesh data: re-adds it at its new place in the frame after the rebase (before the agents move).</summary>
        public interface INavRebase { void OnNavRebase(Vector3 delta); }
        private static readonly List<IRebase> Holders = new();
        private static readonly List<INavRebase> NavHolders = new();
        public static void Hold(IRebase h) { if (h != null && !Holders.Contains(h)) Holders.Add(h); }
        public static void Release(IRebase h) => Holders.Remove(h);
        public static void Hold(INavRebase h) { if (h != null && !NavHolders.Contains(h)) NavHolders.Add(h); }
        public static void Release(INavRebase h) => NavHolders.Remove(h);

        /// <summary>For tests: rebases since the start, the last one's shift, and whether the second frame is pending.</summary>
        public static int Rebases { get; private set; }
        public static Vector3 LastDelta { get; private set; }
        public static bool Pending => _pending != Vector3.zero;

        private static Vector3 _pending;
        private static readonly List<(NavMeshAgent A, bool UpdatePosition, bool Stopped, bool HasPath, Vector3 Goal)> Held = new();
        private static readonly List<GameObject> Roots = new();

        /// <summary>The whole-step shift that brings a Unity point back within the box (zero if it is inside).</summary>
        public static Vector3 ShiftFor(Vector3 unity)
        {
            static float S(float v) => Mathf.Abs(v) <= Box ? 0f : -Mathf.Round(v / Step) * Step;
            return new Vector3(S(unity.x), 0f, S(unity.z));
        }

        /// <summary>Starts a world with nothing placed in it yet at a world point: the offset set to its chunk.</summary>
        public static void StartAt(double worldX, double worldZ)
        {
            OX = System.Math.Round(worldX / Step) * Step; OZ = System.Math.Round(worldZ / Step) * Step;
        }

        /// <summary>The world back at Unity's origin with nothing placed (tests, a new session).</summary>
        public static void Reset() { OX = 0; OZ = 0; _pending = Vector3.zero; Held.Clear(); }

        /// <summary>Moves the world by <paramref name="delta"/> (Unity m, whole steps in x and z): the rebase's first frame (the roots and
        /// the physics' poses, every holder told, the agents held); the second follows in the next frame (<see cref="Keeper"/>).</summary>
        public static void Rebase(Vector3 delta)
        {
            if (delta == Vector3.zero) return;
            if (_pending != Vector3.zero) Settle();   // (a second rebase before the first's second frame: that one finished first)
            Keeper.Ensure();
            // the agents held: their bodies move with the roots; their agents would put them back where they stood
            Held.Clear();
            foreach (var a in Object.FindObjectsByType<NavMeshAgent>(FindObjectsSortMode.None))
            {
                if (!a.isActiveAndEnabled) continue;
                var on = a.isOnNavMesh;
                Held.Add((a, a.updatePosition, on && a.isStopped, on && a.hasPath, on ? a.destination : Vector3.zero));
                a.updatePosition = false;
                if (on) a.isStopped = true;
            }
            for (var s = 0; s < SceneManager.sceneCount; s++)
            {
                var sc = SceneManager.GetSceneAt(s);
                if (!sc.isLoaded) continue;
                sc.GetRootGameObjects(Roots);
                foreach (var g in Roots) g.transform.position += delta;
            }
            Keeper.MoveKept(delta);
            Physics.SyncTransforms();
            OX -= delta.x; OZ -= delta.z;
            foreach (var h in Holders.ToArray()) h.OnRebase(delta);
            Rebases++; LastDelta = delta;
            _pending += delta;
        }

        /// <summary>The rebase's second frame: the NavMesh data re-added at their new place, then each held agent warped where its body
        /// stands and sent on to its shifted goal.</summary>
        internal static void Settle()
        {
            var d = _pending;
            _pending = Vector3.zero;
            if (d == Vector3.zero) return;
            foreach (var h in NavHolders.ToArray()) h.OnNavRebase(d);
            foreach (var (a, upd, stopped, has, goal) in Held)
            {
                if (a == null) continue;
                a.updatePosition = upd;
                if (!a.isActiveAndEnabled) continue;
                a.Warp(a.transform.position);
                if (!a.isOnNavMesh) continue;
                a.isStopped = stopped;
                if (has) a.SetDestination(goal + d);
            }
            Held.Clear();
        }

        /// <summary>The frame's first act (before physics' own step, animation and every system): the second frame of a pending rebase,
        /// then a new rebase if the walker has left the box.</summary>
        [DefaultExecutionOrder(-32000)]
        public sealed class Keeper : MonoBehaviour
        {
            /// <summary>The one the box is kept about (the walker; null: no rebasing, as in the gate).</summary>
            public static Transform Leader;
            private static Keeper _me;
            private static readonly List<GameObject> Kept = new();

            public static void Ensure()
            {
                if (_me != null) return;
                var go = new GameObject("world origin");
                DontDestroyOnLoad(go);
                _me = go.AddComponent<Keeper>();
            }

            /// <summary>The objects kept across scene loads (their scene is not in the scene list): moved with the rest.</summary>
            internal static void MoveKept(Vector3 delta)
            {
                if (_me == null) return;
                _me.gameObject.scene.GetRootGameObjects(Kept);
                foreach (var g in Kept) if (g != _me.gameObject) g.transform.position += delta;
            }

            private void FixedUpdate() { if (_pending != Vector3.zero) Settle(); }

            private void Update()
            {
                if (_pending != Vector3.zero) Settle();
                if (Leader == null) return;
                var d = ShiftFor(Leader.position);
                if (d != Vector3.zero) Rebase(d);
            }
        }
    }
}
