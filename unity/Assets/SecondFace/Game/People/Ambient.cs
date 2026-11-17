using UnityEngine;

namespace SecondFace.Game.People
{
    /// <summary>
    /// A person standing about (P4 step 4): their own idle (one of the locomotion controller's four, by a hash of their
    /// name, so a crowd does not breathe in step), started at their own point in it, and now and then a gesture over the
    /// upper body (talk, argue, drink, wave, stretch, yawn) every <see cref="MinGap"/> to <see cref="MaxGap"/> seconds,
    /// only while they stand still. Talkers lean to talk and argue; others to the rest. The gesture layer's weight follows:
    /// up while a gesture plays, down to nothing after.
    /// </summary>
    [RequireComponent(typeof(Animator))]
    public sealed class Ambient : MonoBehaviour
    {
        public static readonly string[] Talk = { "talk", "talk_b", "argue" };
        public static readonly string[] Idle = { "drink", "stretch", "yawn", "yawn_b", "wave" };
        /// <summary>The gestures captured from a woman only (CMU 141, 111, 113): a man does not play them (no documented man's
        /// stretch or yawn is found yet: CMU 143_30's actor, 1.51 m with narrow shoulders, is likely a woman; motion set v3).
        /// Men's own: talk, talk_b, argue, drink, wave.</summary>
        public static readonly string[] WomenOnly = { "stretch", "yawn", "yawn_b" };
        public const string GestureLayer = "Gesture";
        /// <summary>The idles by sex, blended on "Idle" (LocomotionBuild builds them; motion set v3, the helper's README and
        /// MANIFEST): from documented men (ACCAD Male2 and Male1 standing) and a woman (ACCAD Female1 waiting and standing),
        /// each with the knee-solve correction (the captures' knee centres read 8-24° on a straight leg; K1 0-5° after, feet
        /// kept) and the head level. Out: CMU 77_02, 82_08, 111_28, 113_21 (knees 20-24°, heads down to −58°).</summary>
        public static readonly string[] MenIdles = { "idle_m", "idle_m_b" }, WomenIdles = { "idle_f", "idle_f_c" };
        /// <summary>How many idles the controller blends between on "Idle" at most.</summary>
        public static readonly int IdleCount = Mathf.Max(MenIdles.Length, WomenIdles.Length);
        /// <summary>How many idles this body's sex has.</summary>
        public static int IdlesOf(Animator a) => (Pace.Female(a) ? WomenIdles : MenIdles).Length;
        /// <summary>Whether this body plays a gesture (its sex's captures).</summary>
        public static bool Can(Animator a, string gesture) => Pace.Female(a) || System.Array.IndexOf(WomenOnly, gesture) < 0;

        public float MinGap = 7f, MaxGap = 20f;
        /// <summary>Talks more than the others (set by whoever places them).</summary>
        public bool Talker;
        /// <summary>The gestures their activity calls for (a drinker drinks, a trader talks; P6.2), over the talker's and
        /// the idle pools; null for those.</summary>
        public string[] Pool;

        private static readonly int IdleId = Animator.StringToHash("Idle");
        private static readonly int SpeedId = Animator.StringToHash("Speed");
        private Animator _animator;
        private int _layer = -1;
        private float _next;
        private uint _seed;

        /// <summary>The last gesture started (tests read it).</summary>
        public string Last { get; private set; }

        private void Start()
        {
            _animator = GetComponent<Animator>();
            _seed = Hash(name);
            if (_animator == null || _animator.runtimeAnimatorController == null) return;
            _layer = _animator.GetLayerIndex(GestureLayer);
            _animator.SetFloat(IdleId, _seed % (uint)IdlesOf(_animator));
            _animator.Play(0, 0, Random01());
            _next = Time.time + Mathf.Lerp(MinGap * 0.3f, MaxGap, Random01());
        }

        private void Update()
        {
            if (_layer < 0) return;
            // the gesture layer weighs in only while a gesture plays (at rest its empty state would hold the default pose)
            var playing = _animator.IsInTransition(_layer) || !_animator.GetCurrentAnimatorStateInfo(_layer).IsName("none");
            var w = _animator.GetLayerWeight(_layer);
            var target = playing ? 1f : 0f;
            if (!Mathf.Approximately(w, target)) _animator.SetLayerWeight(_layer, Mathf.MoveTowards(w, target, Time.deltaTime * 4f));
            if (Time.time < _next) return;
            _next = Time.time + Mathf.Lerp(MinGap, MaxGap, Random01());
            if (_animator.GetFloat(SpeedId) > 0.1f) return;
            var pool = Pool != null && Pool.Length > 0 ? Pool : Talker && Random01() < 0.7f ? Talk : Idle;
            pool = System.Array.FindAll(pool, g => Can(_animator, g));
            // (an activity's gestures all a woman's captures, a man's patrol: his own mix instead)
            if (pool.Length == 0) pool = System.Array.FindAll(Idle, g => Can(_animator, g));
            if (pool.Length == 0) return;
            Gesture(pool[(int)(Random01() * pool.Length) % pool.Length]);
        }

        /// <summary>Plays a gesture by its state name on the gesture layer (false if the controller has none).</summary>
        public bool Gesture(string state)
        {
            if (_animator == null) _animator = GetComponent<Animator>();
            if (_layer < 0) _layer = _animator.GetLayerIndex(GestureLayer);
            if (_layer < 0 || !_animator.HasState(_layer, Animator.StringToHash(state)) || !Can(_animator, state)) return false;
            _animator.CrossFadeInFixedTime(state, 0.3f, _layer);
            if (_animator.GetLayerWeight(_layer) < 0.05f) _animator.SetLayerWeight(_layer, 0.05f);   // the fade in starts now
            Last = state;
            return true;
        }

        private float Random01()
        {
            unchecked { _seed = _seed * 1664525u + 1013904223u; }
            return (_seed >> 8) / 16777216f;
        }

        private static uint Hash(string s)
        {
            unchecked
            {
                var h = 2166136261u;
                foreach (var c in s) h = (h ^ c) * 16777619u;
                return h;
            }
        }
    }
}
