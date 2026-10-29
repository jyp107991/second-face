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
        public const string GestureLayer = "Gesture";

        public float MinGap = 7f, MaxGap = 20f;
        /// <summary>Talks more than the others (set by whoever places them).</summary>
        public bool Talker;

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
            _animator.SetFloat(IdleId, _seed % 4);
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
            var pool = Talker && Random01() < 0.7f ? Talk : Idle;
            Gesture(pool[(int)(Random01() * pool.Length) % pool.Length]);
        }

        /// <summary>Plays a gesture by its state name on the gesture layer (false if the controller has none).</summary>
        public bool Gesture(string state)
        {
            if (_animator == null) _animator = GetComponent<Animator>();
            if (_layer < 0) _layer = _animator.GetLayerIndex(GestureLayer);
            if (_layer < 0 || !_animator.HasState(_layer, Animator.StringToHash(state))) return false;
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
