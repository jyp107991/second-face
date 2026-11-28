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
    /// <para>The offset moves in whole chunks (<see cref="Step"/>, 512 m), or in a fight's whole <see cref="FightStep"/>s: a shift that is a
    /// multiple of every float step under it, so a point carried toward the origin (the walker and everyone near them) is moved exactly. A
    /// point carried outward into a larger power of two rounds to that range's step; only things far from the walker move that way.</para>
    /// <para>The box (<see cref="Box"/>), from the float step's curve (MRC §19.4: each system alone, twin against twin, the twin at
    /// 16 m to 16 km): the town's own systems (the Animator in the town's states, the skin) part by about 2.5 float steps, at most
    /// 0.21 mm and 0.051° at the box's farthest point (the walker within 768 m of Unity's origin along x and z and everyone standing
    /// within PeopleService.Leave, 140 m, of them: 908 m, where a float's step is 0.061 mm). The fight's own (the fight layer's foot IK,
    /// 35-95 float steps; TwoBone) lose precision from the origin on, so a fight is re-centred as it begins (<see cref="Recentre"/>),
    /// its centre within 32 m. After a rebase the walker is within 256 m of the origin (the shift rounds to the nearest chunk), so the
    /// next comes after at least 512 m of travel: some 6-10 minutes on foot.</para>
    /// <para>The rebase is split over two frames (§19.2): in the first the roots move and the physics' poses are synced together (a
    /// raycast between them would find the old ground), and every holder of a position is told (<see cref="IRebase"/>); the
    /// navigation agents are held (not moved by their agents, stopped); in the next the NavMesh data are re-added at their new place
    /// (<see cref="INavRebase"/>), then every held agent is warped where its body now stands and sent on to its shifted goal.</para>
    /// <para>Containers (<see cref="Container"/>: an object that only holds others, its own place meaning nothing) keep their identity
    /// transform: the rebase moves their children instead, through nested containers. Moved as roots, they went 16 km out with the first
    /// rebase and their people kept 16 km in their local coordinates, so their world places stayed rounded to a millimetre (the party's
    /// follower 0.53 mm off its own agent, MRC §19.3). FloatingOriginTests checks every transform for it.</para>
    /// </summary>
    public static class WorldOrigin
    {
        /// <summary>The rebase's step: the world's chunk (m).</summary>
        public const float Step = 512f;
        /// <summary>How far the walker may stand from Unity's origin along x or z before the world is rebased (m; the derivation above).</summary>
        public const float Box = 768f;

        /// <summary>The offset: a world point is a Unity point plus this (m; whole <see cref="Step"/>s, or <see cref="FightStep"/>s since a fight;
        /// y is never moved).</summary>
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

        /// <summary>Marks an object that only holds others (the boot's object, the party's, the townsfolk's, the terrain's, the props',
        /// the places'): it stays at Unity's origin with an identity transform, and a rebase moves what it holds.</summary>
        public sealed class Container : MonoBehaviour { }

        /// <summary>Marks <paramref name="g"/> a <see cref="Container"/> (once) and gives it back.</summary>
        public static GameObject Contain(GameObject g)
        {
            if (g != null && !g.TryGetComponent<Container>(out _)) g.AddComponent<Container>();
            return g;
        }

        /// <summary>Moves a transform by <paramref name="delta"/> (world m): a container's children instead of the container itself.</summary>
        private static void Move(Transform t, Vector3 delta)
        {
            if (t.TryGetComponent<Container>(out _))
            {
                for (var i = 0; i < t.childCount; i++) Move(t.GetChild(i), delta);
                return;
            }
            t.position += delta;
        }
        /// <summary>A holder of NavMesh data: re-adds it at its new place in the frame after the rebase (before the agents move).</summary>
        public interface INavRebase { void OnNavRebase(Vector3 delta); }
        private static readonly List<IRebase> Holders = new();
        private static readonly List<INavRebase> NavHolders = new();
        public static void Hold(IRebase h) { if (h != null && !Holders.Contains(h)) Holders.Add(h); }
        public static void Release(IRebase h) => Holders.Remove(h);
        public static void Hold(INavRebase h) { if (h != null && !NavHolders.Contains(h)) NavHolders.Add(h); }
        public static void Release(INavRebase h) => NavHolders.Remove(h);

        /// <summary>How far past the box the walker may go while a sequence holds the rebase off (m): the people still stand within
        /// 1024 m (884 + 140), where a float's step is 0.061 mm.</summary>
        public const float HardBox = 884f;

        /// <summary>A fight's re-centring step (m): a fight begins with a rebase in whole steps of this, so its centre stands within half of
        /// it (32 m) of Unity's origin along x and z, where the fight's own systems are at the near-origin control's level (MRC §19.4).</summary>
        public const float FightStep = 64f;

        /// <summary>Brings a Unity point within half a <paramref name="step"/> of Unity's origin along x and z: a rebase in whole steps, both of
        /// its frames at once (the NavMesh moved and the agents warped now: the caller goes on in the same frame). The shift, zero if none.</summary>
        public static Vector3 Recentre(Vector3 unity, float step = FightStep)
        {
            var d = new Vector3(-Mathf.Round(unity.x / step) * step, 0f, -Mathf.Round(unity.z / step) * step);
            if (d == Vector3.zero) return d;
            Rebase(d);
            Settle();
            return d;
        }
        // (sequences in flight that keep Unity points across frames: an action of the fight, a throw, the walk's use of a thing; a
        // hold ends when released or after its own bound, so a coroutine stopped before its finally cannot hold the world forever)
        private static readonly Dictionary<int, float> Holds = new();
        private static int _nextHold;
        /// <summary>Holds the rebase off while a sequence keeps Unity points across frames (at most <paramref name="maxSeconds"/>).</summary>
        public static int Hold(float maxSeconds = 30f) { var id = ++_nextHold; Holds[id] = Time.unscaledTime + maxSeconds; return id; }
        public static void Release(int hold) => Holds.Remove(hold);
        /// <summary>A sequence in flight holds the rebase off now.</summary>
        public static bool Held
        {
            get
            {
                if (Holds.Count == 0) return false;
                var now = Time.unscaledTime;
                List<int> gone = null;
                foreach (var kv in Holds) if (kv.Value < now) (gone ??= new List<int>()).Add(kv.Key);
                if (gone != null) foreach (var k in gone) Holds.Remove(k);
                return Holds.Count > 0;
            }
        }

        /// <summary>For tests: rebases since the start, the last one's shift, and whether the second frame is pending.</summary>
        public static int Rebases { get; private set; }
        public static Vector3 LastDelta { get; private set; }
        public static bool Pending => _pending != Vector3.zero;

        private static Vector3 _pending;
        private static readonly List<(NavMeshAgent A, bool UpdatePosition, bool Stopped, bool HasPath, Vector3 Goal)> HeldAgents = new();
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
        public static void Reset() { OX = 0; OZ = 0; _pending = Vector3.zero; HeldAgents.Clear(); Holds.Clear(); }

        /// <summary>Moves the world by <paramref name="delta"/> (Unity m, whole steps in x and z): the rebase's first frame (the roots and
        /// the physics' poses, every holder told, the agents held); the second follows in the next frame (<see cref="Keeper"/>).</summary>
        public static void Rebase(Vector3 delta)
        {
            if (delta == Vector3.zero) return;
            if (_pending != Vector3.zero) Settle();   // (a second rebase before the first's second frame: that one finished first)
            Keeper.Ensure();
            // the agents held: their bodies move with the roots; their agents would put them back where they stood
            HeldAgents.Clear();
            foreach (var a in Object.FindObjectsByType<NavMeshAgent>(FindObjectsSortMode.None))
            {
                if (!a.isActiveAndEnabled) continue;
                var on = a.isOnNavMesh;
                HeldAgents.Add((a, a.updatePosition, on && a.isStopped, on && a.hasPath, on ? a.destination : Vector3.zero));
                a.updatePosition = false;
                if (on) a.isStopped = true;
            }
            for (var s = 0; s < SceneManager.sceneCount; s++)
            {
                var sc = SceneManager.GetSceneAt(s);
                if (!sc.isLoaded) continue;
                sc.GetRootGameObjects(Roots);
                foreach (var g in Roots) Move(g.transform, delta);
            }
            Keeper.MoveKept(delta);
            Physics.SyncTransforms();
            // what holds world points of its own and does not move with its transform: world-space lines, trails and particles
            foreach (var lr in Object.FindObjectsByType<LineRenderer>(FindObjectsSortMode.None))
            {
                if (!lr.useWorldSpace || lr.positionCount == 0) continue;
                var pts = new Vector3[lr.positionCount]; lr.GetPositions(pts);
                for (var i = 0; i < pts.Length; i++) pts[i] += delta;
                lr.SetPositions(pts);
            }
            foreach (var tr in Object.FindObjectsByType<TrailRenderer>(FindObjectsSortMode.None))
            {
                if (tr.positionCount == 0) continue;
                var pts = new Vector3[tr.positionCount]; tr.GetPositions(pts);
                for (var i = 0; i < pts.Length; i++) pts[i] += delta;
                tr.SetPositions(pts);
            }
            foreach (var ps in Object.FindObjectsByType<ParticleSystem>(FindObjectsSortMode.None))
            {
                if (ps.main.simulationSpace != ParticleSystemSimulationSpace.World || ps.particleCount == 0) continue;
                var buf = new ParticleSystem.Particle[ps.particleCount];
                var n = ps.GetParticles(buf);
                for (var i = 0; i < n; i++) buf[i].position += delta;
                ps.SetParticles(buf, n);
            }
            OX -= delta.x; OZ -= delta.z;
            foreach (var h in Holders.ToArray()) h.OnRebase(delta);
            // (every MonoBehaviour that holds a place, enabled or not, found here: none can be left off by a missed registration)
            foreach (var mb in Object.FindObjectsByType<MonoBehaviour>(FindObjectsInactive.Include, FindObjectsSortMode.None))
                if (mb is IRebase r && !Holders.Contains(r)) r.OnRebase(delta);
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
            foreach (var mb in Object.FindObjectsByType<MonoBehaviour>(FindObjectsInactive.Include, FindObjectsSortMode.None))
                if (mb is INavRebase r && !NavHolders.Contains(r)) r.OnNavRebase(d);
            foreach (var (a, upd, stopped, has, goal) in HeldAgents)
            {
                if (a == null) continue;
                a.updatePosition = upd;
                if (!a.isActiveAndEnabled) continue;
                a.Warp(a.transform.position);
                if (!a.isOnNavMesh) continue;
                a.isStopped = stopped;
                if (has) a.SetDestination(goal + d);
            }
            HeldAgents.Clear();
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
                foreach (var g in Kept) if (g != _me.gameObject) Move(g.transform, delta);
            }

            private void FixedUpdate() { if (_pending != Vector3.zero) Settle(); }

            private void Update()
            {
                if (_pending != Vector3.zero) Settle();
                if (Leader == null) return;
                var d = ShiftFor(Leader.position);
                if (d == Vector3.zero) return;
                // (a sequence in flight holds it off, unless the walker is past the hard box)
                var p = Leader.position;
                if (Held && Mathf.Abs(p.x) <= HardBox && Mathf.Abs(p.z) <= HardBox) return;
                Rebase(d);
            }
        }
    }
}
