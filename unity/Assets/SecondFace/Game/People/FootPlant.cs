using UnityEngine;

namespace SecondFace.Game.People
{
    /// <summary>
    /// Feet on the ground they stand on (BUILD_PLAN §6.E, P4 step 4; docs/PEOPLE_MOTION.md F1-F4, §2.3, W6). The clips were
    /// captured on flat floors by bodies of other sizes, and the world is not flat. After the animation each frame, on the
    /// bones themselves (an analytic two-bone solve of each leg, exact: Unity's humanoid foot goals were missed by 4-7 cm on
    /// these rigs, 2026-11-05):
    /// <list type="bullet">
    /// <item>Soles on the ground: the hips are moved up or down so the lower foot's sole meets the ground under it (the
    /// ankle at the body's own height over a flat sole, from its bind pose), whatever height the clip carried them at.</item>
    /// <item>Uneven ground: walking, each foot is lifted or lowered by the ground under it against the person's footing.</item>
    /// <item>Standing: the feet are planted. Each is held where it was put down (a body turning or shifting over it does not
    /// slide it), flat on the ground and turned to it, sole down, no wider apart than <see cref="MaxStance"/> nor further
    /// ahead of the other than <see cref="MaxStagger"/>; when the place the clip wants it in has gone more than
    /// <see cref="StepReach"/> from it, or turned more than <see cref="StepTurn"/>, it steps there (lifted on an arc over
    /// <see cref="StepTime"/> s, one foot at a time).</item>
    /// </list>
    /// Runs before the arms' clearance (it moves the hips). Cheap: a few raycasts and two bone solves a person.
    /// </summary>
    [RequireComponent(typeof(Animator))]
    [DefaultExecutionOrder(-20)]
    public sealed class FootPlant : MonoBehaviour
    {
        public LayerMask Ground = Physics.DefaultRaycastLayers;
        /// <summary>How far above and below a foot looks for ground, m.</summary>
        public float Reach = 0.45f;
        /// <summary>Below this speed a person stands (m/s).</summary>
        public float StandSpeed = 0.12f;
        /// <summary>The widest a standing person's heels stand apart, m (the preferred quiet stance is 0.17 m; McIlroy &amp; Maki).</summary>
        public float MaxStance = 0.27f;
        /// <summary>The farthest one standing foot is ahead of the other, m.</summary>
        public float MaxStagger = 0.22f;
        public float StepReach = 0.17f, StepTurn = 32f, StepTime = 0.28f, StepLift = 0.07f;   // (0.32 s left a foot up 13 % of the time on a slope, F5; 0.26 s and 5 cm moved the feet more in turns and looks, F1/F4/T1; a reach of 0.2 left a planted foot out of the leg's reach in a turn, F1)
        /// <summary>The share of a step over which the foot travels across (before it, the foot lifts; after it, it comes
        /// down where it is going).</summary>
        public Vector2 StepTravel = new Vector2(0.1f, 0.85f);

        private static readonly int SpeedId = Animator.StringToHash("Speed");
        private Animator _animator;
        private bool _hasSpeed, _ready;
        private Transform _hips, _upL, _loL, _footL, _toeL, _upR, _loR, _footR, _toeR;
        private Quaternion _toeRestL = Quaternion.identity, _toeRestR = Quaternion.identity;   // the toes flat (the bind pose)
        private float _ankleL, _ankleR, _bindScale = 1f;   // the ankle's height over a flat sole at rest (world m at the bind scale)
        private Quaternion _restL, _restR;                  // each foot's rotation at rest, in the body's frame (flat, sole down)
        private float _headingL, _headingR;                 // each foot's heading at rest in the body's frame, degrees
        private float _sink, _plant, _low, _unplant, _bodySpeed;
        private float _dipWasL, _dipWasR, _soleVWasL, _soleVWasR; private bool _haveDipWas;
        private float _accel;
        /// <summary>Slowing faster than this (m/s²) below <see cref="CatchPace"/>, the body walks: its last foot down waits for
        /// the other (W6).</summary>
        public float SlowingAccel = -0.5f;
        private bool Walkish(float body) => body < WalkFlight || (body < CatchPace && _accel < SlowingAccel);
        /// <summary>Below this pace (m/s), a lower foot in the air moving slower than <see cref="CatchSlow"/> (m/s) and more than
        /// <see cref="CatchLift"/> (m) up is set down by the hips: it bears the weight (W6).</summary>
        public float CatchPace = 2.4f, CatchSlow = 0.6f, CatchLift = 0.015f;
        // where each foot ended last frame (its sole points in the world, its turn, how high its sole stood): a person who
        // sets off keeps a foot that was down where it stood, held on the point it stands on, until the stride lifts it
        // (the planted feet were blended back to the clip's over 0.15 s and dragged at 1 m/s, 2026-11-06)
        private readonly Vector3[] _endL = new Vector3[3], _endR = new Vector3[3];
        private Quaternion _endRotL = Quaternion.identity, _endRotR = Quaternion.identity;
        private float _endDipL = 1f, _endDipR = 1f;
        private bool _wasStanding = true, _haveEnd;
        private Vector3 _was;
        // each foot's sole at rest, in its bones' frames: the heel's and the ball's contact under the foot bone, the toe's tip
        // under the toes (a foot rolling heel to toe touches the ground with one of them; the ankle alone does not say how
        // low a tilted foot reaches: heels sank 2-3 cm through the floor at every heel strike, 11 cm in the jog, 2026-11-06)
        private Vector3 _heelL, _ballL, _tipL, _heelR, _ballR, _tipR, _backL, _backR;
        private Vector3 _lastL, _lastR; private bool _haveLast;
        // moving, a foot down on the ground is held where it came down until the clip lifts it (W1: a planted foot
        // does not creep; the clips' strides never quite match the body's pace): its place, and a short release after
        private struct Lock { public bool On, HaveTurn, NoRelock; public Vector3 At, From, Fwd; public Quaternion Rest, Corr; public float Release, Last, Min, W, Drop, Wait; public int Pivot; }
        private Lock _lockL, _lockR;
        /// <summary>A foot locks when its sole is this near the ground and slower than <see cref="SwingSlow"/>; it lets go
        /// when its sole rises past <see cref="LockLift"/> or the clip's foot has gone <see cref="LockReach"/> from it, over
        /// <see cref="LockRelease"/> s.</summary>
        /// <summary>How far above the toe's tip the ball may be and still be what a held foot stands on (m).</summary>
        public float BallOverTip = 0.08f;   // (3 cm: a jogging forefoot pointed 60° came down on its tip and the ball slid as it turned about it, W2)
        /// <summary>Standing, the weight-bearing leg's hip-to-ankle reach as a share of its length (0.998: the knee bent about
        /// 7°; ideal standing has the knees straight, docs/PEOPLE_MOTION.md K1).</summary>
        public float StanceStraight = 0.9995f;   // (0.998 left the knee 7°, the gate's K1 is 8 at the p98)
        public float LockDown = 0.025f, LockLift = 0.03f, LockReach = 0.12f, LockRelease = 0.12f;   // (down from 2.5 cm, where the gate counts a sole as down: caught at 2, a jogging foot landed sliding 1.2-1.5 m/s through the last half centimetre, W1/W2)
        /// <summary>Moving, a foot faster than this (m/s, along the ground) is in its swing: it is held at least
        /// <see cref="SwingClear"/> off the ground, less as it slows, so it comes down only as it stops (a real heel
        /// meets the ground at under about 1 m/s; the clips' feet glided in at 2-4 m/s, 2026-11-06).</summary>
        public float SwingFast = 1.5f, SwingSlow = 0.5f, SwingClear = 0.03f;   // (3.5 held walking feet up as they bore weight, W6 23 → 33)
        /// <summary>The swing's clearance comes in from <see cref="ClearSlow"/> to <see cref="ClearFast"/> (m/s, the clip's
        /// lowest sole point's speed, the point the gate measures): a foot moving faster stands <see cref="SwingClear"/> up.
        /// Not for a foot held down, nor one coming down slower than a swing; at once for one let go from a hold.</summary>
        public float ClearSlow = 0.5f, ClearFast = 1.5f;
        /// <summary>Below this pace (m/s) a gait has no flight: a held foot is kept down until the other foot is.</summary>
        public float WalkFlight = 1.8f;
        /// <summary>The sole's lift at which a held foot lets go as it pushes off into a jog's flight (m).</summary>
        public float LockLiftFlight = 0.025f;   // (at 1.2 cm the ball was let go of under the gate's 2.5 cm and slid 0.2-0.4 m/s as it blended out, W1 0 -> 6, 2026-11-07)
        /// <summary>The body's pace below which the person is standing (m/s): a held foot is let go of slowly.</summary>
        public float StandStill = 0.3f;
        /// <summary>Moving, each foot goes where the captured subject's ankle went (the clip's own foot goal, Mecanim's IK
        /// goal: the source's ankle scaled to this body, with the stride's travel), not where the retargeted leg puts it: a
        /// leg of other proportions bent to the clip's angles puts its ankle elsewhere, and in a crouch it drifts through
        /// every stance (the sneak's stance feet went 12 cm from where they came down and slid, W1/W2, 2026-11-06).</summary>
        public bool FollowGoals = true;
        private Vector3 _shownL, _shownR, _shownLastL, _shownLastR; private int _shownFrames;

        private struct Foot
        {
            public bool Planted, Stepping;
            public Vector3 Pin, From, To;
            public float PinYaw, FromYaw, ToYaw, T;
        }

        private Foot _l, _r;

        /// <summary>The captured walks' subjects stood with their hip joints this high (m; the clips' sidecars, CMU 07, 08,
        /// 16, 35, 136: 0.93-0.94).</summary>
        public const float SourceHip = 0.935f;
        /// <summary>How much longer this body's stride would need to be to match the clips' speeds: the clip's speed over
        /// this body's (a retargeted stride is as long as the legs that take it: a shorter body at the clip's speed slides
        /// its planted foot, 2026-11-06). <see cref="Pace"/> scales the locomotion's speed by it.</summary>
        public float PaceScale { get; private set; } = 1f;

        /// <summary>How far the hips are moved to put the soles on the ground, m (down is negative).</summary>
        public float Sink => _sink;
        /// <summary>For the gate's trace (tests read it), moving, each foot this frame: its lowest sole point over the ground
        /// before any lift, the swing's clearance wanted, the lift given, whether it is held (1) or let go (0.5); left then right.</summary>
        public float[] Diag = new float[18];
        /// <summary>For the gate's trace: each foot's ball where it ended this frame (world), left, right.</summary>
        public Vector3 BallL, BallR;
        /// <summary>Kept for tests: how far each foot bone ended from where this put it (0: exact).</summary>
        public Vector2 GoalError { get; private set; }
        public Vector3 Offsets => new(0f, 0f, _sink);
        /// <summary>Where each foot is now (tests read them): left, right.</summary>
        public (Vector3, Vector3) Probed => (_footL != null ? _footL.position : Vector3.zero, _footR != null ? _footR.position : Vector3.zero);

        private void Awake()
        {
            _animator = GetComponent<Animator>();
            Bind();
            if (_animator == null || !_animator.isHuman) return;
            Transform B(HumanBodyBones b) => _animator.GetBoneTransform(b);
            _hips = B(HumanBodyBones.Hips);
            _upL = B(HumanBodyBones.LeftUpperLeg); _loL = B(HumanBodyBones.LeftLowerLeg); _footL = B(HumanBodyBones.LeftFoot); _toeL = B(HumanBodyBones.LeftToes);
            _upR = B(HumanBodyBones.RightUpperLeg); _loR = B(HumanBodyBones.RightLowerLeg); _footR = B(HumanBodyBones.RightFoot); _toeR = B(HumanBodyBones.RightToes);
            _ready = _hips != null && _upL != null && _loL != null && _footL != null && _upR != null && _loR != null && _footR != null;
            if (!_ready) return;
            // at rest, before any clip: the body stands on its root, feet flat
            if (_toeL != null) _toeRestL = _toeL.localRotation;
            if (_toeR != null) _toeRestR = _toeR.localRotation;
            var y = transform.position.y;
            _bindScale = Mathf.Max(0.01f, transform.lossyScale.y);
            PaceScale = Mathf.Clamp(SourceHip / Mathf.Max(0.5f, _hips.position.y - y), 0.8f, 1.25f);
            _ankleL = Mathf.Clamp(_footL.position.y - y, 0.03f, 0.2f);
            _ankleR = Mathf.Clamp(_footR.position.y - y, 0.03f, 0.2f);
            var inv = Quaternion.Inverse(transform.rotation);
            _restL = inv * _footL.rotation; _restR = inv * _footR.rotation;
            _headingL = Heading(inv * Ahead(_footL, _toeL));
            _headingR = Heading(inv * Ahead(_footR, _toeR));
            SolePoints(_footL, _toeL, y, out _heelL, out _ballL, out _tipL);
            SolePoints(_footR, _toeR, y, out _heelR, out _ballR, out _tipR);
            _backL = _heelL; _backR = _heelR;
            // the soles as the body's own mesh has them, where the people were built with them (BodySkin)
            if (TryGetComponent<BodySkin>(out var skin))
            {
                if (skin.SoleL is { Length: 4 }) { _heelL = skin.SoleL[0]; _backL = skin.SoleL[1]; _ballL = skin.SoleL[2]; _tipL = skin.SoleL[3]; }
                if (skin.SoleR is { Length: 4 }) { _heelR = skin.SoleR[0]; _backR = skin.SoleR[1]; _ballR = skin.SoleR[2]; _tipR = skin.SoleR[3]; }
            }
        }

        /// <summary>A foot's sole at rest (flat on the floor at height <paramref name="floor"/>): the heel's contact a fifth
        /// of the foot's length behind the ankle, the ball's under the toe joint (both in the foot bone's frame), the toe's
        /// tip 5 cm on (in the toes' frame, or the foot's).</summary>
        private void SolePoints(Transform foot, Transform toe, float floor, out Vector3 heel, out Vector3 ball, out Vector3 tip)
        {
            var ahead = Ahead(foot, toe); ahead.y = 0f;
            var len = ahead.magnitude;
            var dir = len > 1e-4f ? ahead / len : transform.forward;
            var a = foot.position; a.y = floor;
            var h = a - dir * (0.2f * Mathf.Max(0.08f, len));
            var b = a + dir * len;
            var t = b + dir * 0.05f * Mathf.Max(0.5f, transform.lossyScale.y);
            heel = foot.InverseTransformPoint(h);
            ball = foot.InverseTransformPoint(b);
            tip = (toe != null ? toe : foot).InverseTransformPoint(t);
        }

        /// <summary>How high a foot's lowest sole point stands over its ground now, m (negative: in it).</summary>
        /// <summary>How fast the clip's lowest sole point moves along the ground (m/s): the same point the gate measures (the
        /// ankle turns forward about a still heel as it lands). <paramref name="last"/> keeps this frame's four points.</summary>
        private float SoleSpeed(Transform foot, Transform toe, Vector3 heel, Vector3 back, Vector3 ball, Vector3 tip, Vector3[] last, ref bool have, float dt, Vector3 shift)
        {
            var t = toe != null ? toe : foot;
            _pts[0] = foot.TransformPoint(heel) + shift; _pts[1] = foot.TransformPoint(back) + shift; _pts[2] = foot.TransformPoint(ball) + shift; _pts[3] = t.TransformPoint(tip) + shift;
            var low = 0;
            for (var i = 1; i < 4; i++) if (_pts[i].y < _pts[low].y) low = i;
            var v = have ? new Vector2(_pts[low].x - last[low].x, _pts[low].z - last[low].z).magnitude / dt : 0f;
            for (var i = 0; i < 4; i++) last[i] = _pts[i];
            have = true;
            return v;
        }
        private readonly Vector3[] _pts = new Vector3[4], _solePtsL = new Vector3[4], _solePtsR = new Vector3[4];
        private bool _haveSoleL, _haveSoleR;

        /// <summary>The most a moving foot is pointed toes-down while its ankle is low (degrees), fading from full at
        /// <see cref="PitchLow"/>.x of the ankle's height over a flat sole to none at .y (m); its toes straightened
        /// toward flat over the same.</summary>
        public float LandPitch = 90f;   // (off: a 25° limit turned the foot up about its ankle and stood the jog's stance foot 3-8 cm up, W6, landing or held; the clip's own goals keep the men's jog from sliding on its pointed foot instead, W2 0.15 → passing, 2026-11-06)
        private float _lastEL, _lastER;
        public Vector2 PitchLow = new Vector2(0.04f, 0.10f);

        private void Toes(Transform toe, Quaternion toeRest, float e)
        {
            var w = Mathf.Clamp01((PitchLow.y - e) / (PitchLow.y - PitchLow.x));
            if (w > 0f && toe != null) toe.localRotation = Quaternion.Slerp(toe.localRotation, toeRest, w);
        }

        private void Pitch(Transform foot, Transform toe, Quaternion toeRest, Vector3 heel, Vector3 ball, float e)
        {
            var w = Mathf.Clamp01((PitchLow.y - e) / (PitchLow.y - PitchLow.x));
            if (w <= 0f) return;
            // and the toes straightened toward flat (the jog's toes curled down at landing put their tips 6-7 cm under the
            // ground: the foot was held on them and its ball slid as it turned about them, W1/W2, 2026-11-06)
            if (toe != null) toe.localRotation = Quaternion.Slerp(toe.localRotation, toeRest, w);
            var d = foot.TransformPoint(ball) - foot.TransformPoint(heel);
            var flat = new Vector3(d.x, 0f, d.z);
            if (flat.sqrMagnitude < 1e-6f) return;
            var pitch = Mathf.Atan2(-d.y, flat.magnitude) * Mathf.Rad2Deg;
            if (pitch <= LandPitch) return;
            var to = (pitch - w * (pitch - LandPitch)) * Mathf.Deg2Rad;
            var want = (flat.normalized * Mathf.Cos(to) + Vector3.down * Mathf.Sin(to)) * d.magnitude;
            foot.rotation = Quaternion.FromToRotation(d, want) * foot.rotation;
        }

        private float SoleOver(Transform foot, Transform toe, Vector3 heel, Vector3 back, Vector3 ball, Vector3 tip, float ground)
        {
            var y = Mathf.Min(Mathf.Min(foot.TransformPoint(heel).y, foot.TransformPoint(back).y), Mathf.Min(foot.TransformPoint(ball).y, (toe != null ? toe : foot).TransformPoint(tip).y));
            return y - ground;
        }

        /// <summary>Looks again at the controller's parameters (after a controller is given at runtime).</summary>
        public void Bind()
        {
            _hasSpeed = false;
            if (_animator != null && _animator.runtimeAnimatorController != null)
                foreach (var p in _animator.parameters) if (p.nameHash == SpeedId) _hasSpeed = true;
        }

        private void OnDisable() { _l = default; _r = default; }

        private Vector3 Ahead(Transform foot, Transform toe) => toe != null ? toe.position - foot.position : transform.forward;
        private static float Heading(Vector3 v) => Mathf.Atan2(v.x, v.z) * Mathf.Rad2Deg;

        private void LateUpdate()
        {
            if (!_ready || _animator == null || !_animator.enabled) return;
            var dt = Time.deltaTime;
            if (dt <= 0f) return;
            var scale = Mathf.Max(0.01f, transform.lossyScale.y) / _bindScale;
            var ankleL = _ankleL * scale; var ankleR = _ankleR * scale;
            var speed = _hasSpeed ? _animator.GetFloat(SpeedId) : 0f;
            var standing = speed < StandSpeed;
            // a body set down somewhere else lifts its feet from where they were
            var moved = new Vector2(transform.position.x - _was.x, transform.position.z - _was.z).magnitude / dt;
            if ((transform.position - _was).sqrMagnitude > 0.25f) { _l = default; _r = default; _sink = 0f; _haveEnd = false; _lockL = default; _lockR = default; moved = 0f; _shownFrames = 0; _haveSoleL = _haveSoleR = false; }
            _was = transform.position;
            // the body's own pace over the ground (the locomotion's "Speed" is a clip's, not the body's: Pace)
            var bodyWas = _bodySpeed;
            _bodySpeed = Mathf.Lerp(_bodySpeed, moved, 1f - Mathf.Exp(-10f * dt));
            // slowing (m/s²), for the jog's last strides: a body slowing to a walk's pace walks
            _accel = Mathf.Lerp(_accel, (_bodySpeed - bodyWas) / dt, 1f - Mathf.Exp(-8f * dt));
            // setting off: no blend back to the clip (it slid the feet); the feet that were down are held where they stood
            _plant = standing ? Mathf.MoveTowards(_plant, 1f, dt / 0.15f) : 0f;
            var setOff = !standing && _wasStanding && _haveEnd;
            if (!standing) { _l.Planted = _r.Planted = false; _l.Stepping = _r.Stepping = false; }
            else { _haveLast = false; _lockL = default; _lockR = default; _shownFrames = 0; _haveSoleL = _haveSoleR = false; }

            // the ground under each foot as the clip has it
            var gL = GroundAt(_footL.position, out var nL); var gR = GroundAt(_footR.position, out var nR);
            if (float.IsNaN(gL) && float.IsNaN(gR)) return;
            if (float.IsNaN(gL)) { gL = gR; nL = nR; }
            if (float.IsNaN(gR)) { gR = gL; nR = nL; }
            // the hips: the lower foot's sole onto its ground (walking, gently: the stance ankle rises and falls with the
            // stride; standing, at once)
            // the ankle over a flat sole (a tilted foot's lower reach is taken out by lifting that foot, below: the hips
            // set on it floated every stance by the heel strike's dip, 2026-11-06)
            var eL = _footL.position.y - gL - ankleL;
            var eR = _footR.position.y - gR - ankleR;
            var e = Mathf.Min(eL, eR);
            // moving, by the stride's lowest (the lower envelope over the last strides: a running foot lands on its ball with
            // the ankle high, and the body is not to be pulled down to it)
            _low = Mathf.Min(e, _low + 0.08f * dt);
            // standing, low enough that both feet reach the ground (the higher foot's need: on the lower one's alone the
            // other floated up to 3 cm, F1); moving, by the stride's lowest
            // slowing from a jog, both feet off the ground (the jog's flight still in the blend at a walk's pace): the lower
            // foot, nearly still, bears the weight, and the hips come down onto it at once (it rose 3.5-7 cm with the clip while
            // its ball barely moved, W6, 2026-11-08)
            // (by the soles as last shown, their lowest points and their pace: by the ankles and the lower of them, the foot in
            // its swing was taken for the one down and the still one left 5-7 cm up, W6, 2026-11-08)
            var catchBy = float.MaxValue;
            if (_haveDipWas && !standing && _bodySpeed < CatchPace && _dipWasL > CatchLift && _dipWasR > CatchLift)
            {
                if (_soleVWasL < CatchSlow) catchBy = _dipWasL;
                if (_soleVWasR < CatchSlow) catchBy = Mathf.Min(catchBy, _dipWasR);
            }
            var caught = catchBy < float.MaxValue;
            // standing, the hips where the weight-bearing leg (the lower foot's) stands nearly straight on its ground, the other
            // foot brought down by its own knee: the clip leaves both feet 3-6.5 cm up on these bodies, and set on the higher
            // foot's need the hips came down 3-8 cm and folded the standing knee 25-35°, the body crouched on knees falling in
            // ("looks like he needs to urinate", the owner, 2026-11-09)
            // (lowered for both legs to reach their ground straight: set for the lower foot's leg alone, the other leg, the clip's
            // straight one, could not reach and its heel stood 2-3 cm up, F1)
            var standWant = Mathf.Max(eL, eR);
            if (standing && PelvisLevel > 0f) Level();
            if (standing)
            {
                // (each foot where it is planted: by the clip's own foot places the legs' needs were misjudged and both knees
                // folded 16-31° with the hips 5.8 cm down)
                float Need(Transform up, Transform lo, Transform ft, float g, float ankle, in Foot f)
                {
                    var leg = (lo.position - up.position).magnitude + (ft.position - lo.position).magnitude;
                    var at = f.Planted && !f.Stepping ? f.Pin : ft.position;
                    var target = new Vector3(at.x, g + ankle, at.z);
                    var hv = target - up.position; var flat = new Vector2(hv.x, hv.z).magnitude;
                    var reach = StanceStraight * leg;
                    return reach > flat ? up.position.y - (target.y + Mathf.Sqrt(reach * reach - flat * flat)) : float.NegativeInfinity;
                }
                // (the leg that needs it more stands nearly straight, the other bends; drawing the far foot in instead slid it
                // along the ground as the hips swayed, F4 2 -> 130, 2026-11-09)
                var nl = Need(_upL, _loL, _footL, gL, ankleL, _l); var nr = Need(_upR, _loR, _footR, gR, ankleR, _r);
                var need = float.IsInfinity(nl) ? nr : float.IsInfinity(nr) ? nl : Mathf.Max(nl, nr);
                if (!float.IsInfinity(need)) standWant = need;
            }
            var want = Mathf.Clamp(-(standing ? standWant : _low), -0.15f, 0.15f);
            if (caught) want = Mathf.Max(-0.15f, Mathf.Min(want, _sink - catchBy));
            _sink = Mathf.Lerp(_sink, want, 1f - Mathf.Exp(-(standing || caught ? 25f : 3f) * dt));
            _hips.position += Vector3.up * _sink;
            Diag[8] = _sink; Diag[9] = _low; Diag[10] = eL; Diag[11] = eR;

            // where each foot goes: walking, the clip's place lifted by the ground's step under it; standing, planted
            var footing = transform.position.y;
            var wantL = _footL.position + Vector3.up * Mathf.Clamp(gL - footing, -Reach, Reach) * (1f - _plant);
            var wantR = _footR.position + Vector3.up * Mathf.Clamp(gR - footing, -Reach, Reach) * (1f - _plant);
            var yawL = Heading(Ahead(_footL, _toeL)); var yawR = Heading(Ahead(_footR, _toeR));
            // moving, along the ground where the clip's own goals have the ankles (FollowGoals)
            var goalL = Vector3.zero; var goalR = Vector3.zero;
            if (!standing && FollowGoals && _animator.isHuman)
            {
                var a = _animator.GetIKPosition(AvatarIKGoal.LeftFoot); var b = _animator.GetIKPosition(AvatarIKGoal.RightFoot);
                // (a goal far off is not the clip's: none yet, or a body set down elsewhere)
                if ((new Vector2(a.x - _footL.position.x, a.z - _footL.position.z)).sqrMagnitude < 0.09f) goalL = new Vector3(a.x - _footL.position.x, 0f, a.z - _footL.position.z);
                if ((new Vector2(b.x - _footR.position.x, b.z - _footR.position.z)).sqrMagnitude < 0.09f) goalR = new Vector3(b.x - _footR.position.x, 0f, b.z - _footR.position.z);
                wantL += goalL; wantR += goalR;
                // (for the gate's trace: how far the clip's own foot turn, taken as the foot's turn at rest, is from the
                // retargeted foot's, degrees)
                Diag[16] = Quaternion.Angle(_animator.GetIKRotation(AvatarIKGoal.LeftFoot) * _restL, _footL.rotation);
                Diag[17] = Quaternion.Angle(_animator.GetIKRotation(AvatarIKGoal.RightFoot) * _restR, _footR.rotation);
            }
            Diag[12] = goalL.magnitude; Diag[13] = goalR.magnitude;
            if (_plant > 0f)
            {
                _shownFrames = 0; _haveSoleL = _haveSoleR = false;   // (the feet's speeds are counted afresh when it sets off)
                var (nl, nr) = Narrow(_footL.position, _footR.position);
                Plant(ref _l, ref _r, nl, yawL, dt, true);
                Plant(ref _r, ref _l, nr, yawR, dt, false);
                var pl = Placed(ref _l, ankleL, out var hl, out var normL);
                var pr = Placed(ref _r, ankleR, out var hr, out var normR);

                wantL = Vector3.Lerp(wantL, pl, _plant);
                wantR = Vector3.Lerp(wantR, pr, _plant);
                // (standing, the knee bent over its foot: kept in the clip's own plane, a relaxed knee turned in 20-35°, K5, the
                // owner's 'other knee turned in', 2026-11-09)
                Solve(_upL, _loL, _footL, wantL, Ahead(_footL, _toeL));
                Solve(_upR, _loR, _footR, wantR, Ahead(_footR, _toeR));
                // flat on the ground, turned its way, sole down
                _footL.rotation = Quaternion.Slerp(_footL.rotation, Flat(_restL, _headingL, hl, normL), _plant);
                _footR.rotation = Quaternion.Slerp(_footR.rotation, Flat(_restR, _headingR, hr, normR), _plant);
            }
            else
            {
                // a foot the clip (or the hips' height) puts into the ground is lifted out of it, by its own lowest point
                // a foot near the ground with its ankle low is pointed no more than LandPitch toes-down (the jog retargeted
                // onto broad men came down with the foot pointed 60° down, its toe tip 14 cm under the ground: lifted onto
                // it and held, the heel 25 cm up, W2, 2026-11-06); at push-off the ankle is high and the foot is left be
                // the foot's pitch only as it comes down to land (not once held: at push-off it lifted the toe off the ground)
                if (eL < _lastEL) Pitch(_footL, _toeL, _toeRestL, _heelL, _ballL, eL); else Toes(_toeL, _toeRestL, eL);
                if (eR < _lastER) Pitch(_footR, _toeR, _toeRestR, _heelR, _ballR, eR); else Toes(_toeR, _toeRestR, eR);
                _lastEL = eL; _lastER = eR;
                var dipL = SoleOver(_footL, _toeL, _heelL, _backL, _ballL, _tipL, gL) + (wantL.y - _footL.position.y);
                var dipR = SoleOver(_footR, _toeR, _heelR, _backR, _ballR, _tipR, gR) + (wantR.y - _footR.position.y);
                // the swing's clearance: how high a foot moving at this pace must stand
                // (the foot as shown only while it is let go from a hold: its ankle turns about a still heel as it lands,
                // and held up by that it bore weight 2.5-3.5 cm up, W6, 2026-11-06)
                // by the clip's lowest sole point's speed (the ankle's held a landing foot 2.5-3.5 cm up while its heel
                // was still, W6, 2026-11-06)
                var soleVL = SoleSpeed(_footL, _toeL, _heelL, _backL, _ballL, _tipL, _solePtsL, ref _haveSoleL, dt, goalL);
                var soleVR = SoleSpeed(_footR, _toeR, _heelR, _backR, _ballR, _tipR, _solePtsR, ref _haveSoleR, dt, goalR);
                _dipWasL = dipL; _dipWasR = dipR; _soleVWasL = soleVL; _soleVWasR = soleVR; _haveDipWas = true;
                // a foot let go from a hold rises at once before it is eased back to the clip's (it slid along the ground
                // at 1.2-1.6 m/s, W1); a foot coming down slower than a swing gets none, so it lands when the clip lands it
                // (held 3 cm up until it slowed, it left both feet off the ground for frames, the other lifting: W6)
                float Clear(float v, float dip, float lastDip, bool releasing, bool otherDown)
                {
                    if (!_haveLast) return 0f;
                    // (let go while the other foot is down; the last foot down, slow, rises as a swing does: lifted 3 cm
                    // at once it bore the weight 3 cm up, W6, 2026-11-06)
                    if (releasing && otherDown) return SwingClear;
                    if (dip < lastDip - 0.001f && v < SwingFast) return 0f;
                    return SwingClear * Mathf.Clamp01((v - ClearSlow) / (ClearFast - ClearSlow));
                }
                var clearL = Clear(soleVL, dipL, _lockL.Last, _lockL.Release > 0f, dipR < SwingClear - 0.005f);
                var clearR = Clear(soleVR, dipR, _lockR.Last, _lockR.Release > 0f, dipL < SwingClear - 0.005f);
                var speedL = _haveLast ? new Vector2(wantL.x - _lastL.x, wantL.z - _lastL.z).magnitude / dt : 0f;
                var speedR = _haveLast ? new Vector2(wantR.x - _lastR.x, wantR.z - _lastR.z).magnitude / dt : 0f;
                _lastL = wantL; _lastR = wantR; _haveLast = true;
                // (a foot held on the ground is down: lifted only out of it, never to the swing's clearance, which keyed
                // on the clip's own foot sliding under the hold stood jogging feet 2.4 cm up, still, W6, 2026-11-06)
                var wantClearL = _lockL.On ? 0f : clearL; var wantClearR = _lockR.On ? 0f : clearR;
                if (dipL < wantClearL) wantL.y += wantClearL - dipL;
                if (dipR < wantClearR) wantR.y += wantClearR - dipR;
                Diag[0] = dipL; Diag[1] = clearL; Diag[2] = Mathf.Max(0f, wantClearL - dipL);
                Diag[4] = dipR; Diag[5] = clearR; Diag[6] = Mathf.Max(0f, wantClearR - dipR);
                var body = _bodySpeed;
                if (setOff)
                {
                    Seed(ref _lockL, _endL, _endDipL);
                    Seed(ref _lockR, _endR, _endDipR);
                    _unplant = 1f;
                }
                if (_unplant > 0f)
                {
                    // the planted (flat) turn eased back into the clip's
                    _unplant = Mathf.MoveTowards(_unplant, 0f, dt / 0.15f);
                    var keepL = _footL.rotation; var keepR = _footR.rotation;
                    _footL.rotation = Quaternion.Slerp(keepL, _endRotL, _unplant);
                    _footR.rotation = Quaternion.Slerp(keepR, _endRotR, _unplant);
                }
                // (the other foot down by the clip's height: by its height as shown, after its swing's clearance, the
                // sneak's rear foot was let go unlifted and slid, W2 1 → 10, 2026-11-06)
                wantL = Held(ref _lockL, wantL, dipL, speedL, body, _footL, _toeL, _heelL, _ballL, _tipL, gL, dt, dipR < SwingClear - 0.005f);
                wantR = Held(ref _lockR, wantR, dipR, speedR, body, _footR, _toeR, _heelR, _ballR, _tipR, gR, dt, dipL < SwingClear - 0.005f);
                Diag[3] = _lockL.On ? 1f : _lockL.Release > 0f ? 0.5f : 0f; Diag[7] = _lockR.On ? 1f : _lockR.Release > 0f ? 0.5f : 0f;
                // within the leg's reach, by height alone: an unreachable place (a held foot put down under a straight leg)
                // was reached toward and slid the foot along the ground (W1, 2026-11-06)
                wantL = Reachable(_upL, _loL, _footL, wantL);
                wantR = Reachable(_upR, _loR, _footR, wantR);
                if ((wantL - _footL.position).sqrMagnitude > 4e-6f) Solve(_upL, _loL, _footL, wantL);
                if ((wantR - _footR.position).sqrMagnitude > 4e-6f) Solve(_upR, _loR, _footR, wantR);
                _shownLastL = _shownL; _shownLastR = _shownR; _shownL = _footL.position; _shownR = _footR.position; _shownFrames++;
                // for the gate's trace: how far each held foot's pivot ended from where it is held (m; -1 not held)
                Diag[14] = Slip(_lockL, _footL, _toeL, _heelL, _ballL, _tipL); Diag[15] = Slip(_lockR, _footR, _toeR, _heelR, _ballR, _tipR);
                BallL = _footL.TransformPoint(_ballL); BallR = _footR.TransformPoint(_ballR);
            }
            GoalError = new Vector2(Vector3.Distance(_footL.position, wantL), Vector3.Distance(_footR.position, wantR));
            End(_footL, _toeL, _heelL, _ballL, _tipL, _endL, gL, out _endDipL); _endRotL = _footL.rotation;
            End(_footR, _toeR, _heelR, _ballR, _tipR, _endR, gR, out _endDipR); _endRotR = _footR.rotation;
            _haveEnd = true;
            _wasStanding = standing;
        }

        /// <summary>Where a moving foot goes along the ground: while it is down (its sole within <see cref="LockDown"/>,
        /// slow for the pace) the point it stands on (the heel, then the ball, then the toe's tip, as a foot rolls) is held
        /// where it touched, the ankle following the clip's roll about it; let go back to the clip's over
        /// <see cref="LockRelease"/> s.</summary>
        private Vector3 Held(ref Lock k, Vector3 want, float sole, float speed, float body, Transform foot, Transform toe, Vector3 heel, Vector3 ball, Vector3 tip, float ground, float dt, bool otherDown)
        {
            // held, the foot keeps the turn and the roll it came down with, and takes only the clip's pitch about its own
            // side-to-side axis (a foot on the ground neither spins nor rocks sideways on it: the clip turned and rolled the
            // jog's held feet about their pinned point and swung the gate's other sole point along the ground at 0.2-0.4
            // m/s, W1, 2026-11-06); let go, the clip's turn comes back over the release
            var turned = false;
            if (k.On)
            {
                if (!k.HaveTurn) Hold(ref k, foot, toe);
                // (the sole kept as high over the ground as the clip's turn had it: turned about the ankle, the jog's held
                // foot went 6-7 cm into the ground and stood 5 cm over it, W6, 2026-11-06)
                var before = Lowest(foot, toe, heel, ball, tip);
                foot.rotation = Pitched(ref k, foot.rotation);
                want.y += before - Lowest(foot, toe, heel, ball, tip);
                turned = true;
            }
            // the sole point now lowest, where the clip has it with the ankle at the place wanted
            var shift = want - foot.position;
            Vector3 At(int i) => (i == 0 ? foot.TransformPoint(heel) : i == 1 ? foot.TransformPoint(ball) : (toe != null ? toe : foot).TransformPoint(tip)) + shift;
            var low = 0; var lowY = At(0).y;
            for (var i = 1; i < 3; i++) { var y = At(i).y; if (y < lowY - 0.003f) { lowY = y; low = i; } }
            // a forefoot comes down on its ball: held on the toe's tip, the foot turned about it and the ball slid (the
            // jog, 0.5 m/s while held, W1/W2, 2026-11-06)
            if (low == 2 && At(1).y - lowY < BallOverTip) low = 1;
            var slow = Mathf.Max(SwingSlow, 0.35f * body);
            // down: slow for the pace, or coming down onto the ground (a heel that touched at 0.4-0.7 m/s slid 3-4 frames
            // before it was slow enough to hold, 2026-11-06)
            var landing = sole < k.Last - 0.001f && speed < SwingFast;
            k.Last = sole;
            // (walking, a foot coming down while the other is in the air waits for it from its first held frame: eased in over
            // 0.06 s, the foot landing as a jog slowed to a stop rose 4.5-5 cm with the clip while held, W6, 2026-11-07)
            // (only on the move: standing, a stepping foot held down at once from its landing was let go of sliding, F4 7 -> 11)
            // (a foot let go of into a jog's flight locks again only once it has left the ground: pushing off, its ball still
            // under 2.5 cm, it locked again mid-roll and slid 0.3 m/s held at the wrong point, W1, 2026-11-07; walking, kept
            // from locking again the men's feet slid 5-6 % of their frames, W1)
            // (or swung: a walking foot's lowest point clears the ground by under 3 cm, and kept from locking until it rose
            // past it the men's feet slid through every stride, W1 5-12 %, 2026-11-07)
            // (jogging, by leaving the ground only: the ankle runs ahead fast as the heel rises over the ball, and read as a
            // swing it let the foot lock again mid-roll, W1, 2026-11-07)
            if (sole > LockLift || (speed > slow && body < WalkFlight)) k.NoRelock = false;
            if (!k.On && k.Release <= 0f && sole < LockDown && (speed < slow || landing) && !(k.NoRelock && body > StandStill)) { k.On = true; k.Pivot = low; k.At = At(low); k.Min = Mathf.Max(0f, sole); k.Wait = !otherDown && body < WalkFlight && body > StandStill ? 1f : 0f; k.W = k.Wait; Hold(ref k, foot, toe); turned = true; }
            if (k.On)
            {
                // rolling: the pivot moves to whichever point is now the lower, pinned where it is (forward as a heel-first
                // foot rolls to its toe, and back as a toe-first one comes down onto its ball and heel: held on the tip, the
                // sneak's ball and heel swept down about it and slid, W1, 2026-11-06)
                if (low != k.Pivot) { var held = new Vector3(k.At.x, 0f, k.At.z) - new Vector3(At(k.Pivot).x, 0f, At(k.Pivot).z); k.Pivot = low; k.At = At(low) + held; }
                var c = At(k.Pivot);
                var off = new Vector2(c.x - k.At.x, c.z - k.At.z);
                // and down on the ground: the clip's stance stood a held foot 2-3 cm up, still, in the jog and the sneak
                // (W6, 2026-11-06); the lowering eases in as it touches and goes as the clip lifts it, so it is gone by the
                // time the foot lets go (no drop to undo while it moves)
                k.Min = Mathf.Min(k.Min, Mathf.Max(0f, sole));
                k.W = Mathf.MoveTowards(k.W, 1f, dt / 0.04f);
                var rise = Mathf.Clamp01((sole - k.Min) / Mathf.Max(0.002f, LockLift - k.Min));
                k.Drop = k.Min * k.W * (1f - rise);
                // walking (no flight in it), the last foot down stays down until the other is: kept on the ground as the clip
                // lifts it, then let rise (the sneak's rear toe rose 3 cm while the front foot was still in its swing's
                // clearance, both off the ground and the slower bearing the weight 2.7-3 cm up, W6, 2026-11-06)
                // (and slowing from a jog below CatchPace: let go as a jog's, the last foot rose with the clip, still, both feet
                // off the ground at a walk's pace, 3.5-7 cm up, W6, 2026-11-08)
                var waitFor = !otherDown && Walkish(body);
                k.Wait = Mathf.MoveTowards(k.Wait, waitFor ? 1f : 0f, dt / 0.06f);
                if (k.Wait > 0f) k.Drop = Mathf.Lerp(k.Drop, Mathf.Max(k.Drop, sole) * k.W, k.Wait);
                // (pushing off into a jog's flight, the other foot in the air, let go lower: held to 3 cm, the foot rose slow
                // and still, the lower of two in the air read as bearing the weight 4-5 cm up, W6, 2026-11-07)
                var lift = !otherDown && !Walkish(body) ? LockLiftFlight : LockLift;
                var lifted = sole > lift && k.Wait < 0.05f;
                if (lifted || off.magnitude > LockReach)
                {
                    // lifted into a jog's flight, the foot goes with the clip at once: eased out of the hold it crept along
                    // the ground's line at 0.15-0.5 m/s as the clip lifted it 4-5 cm in a frame, the lower of two feet in the
                    // air read as one bearing the weight (W6); over 0.05 s, a foot let go of on the ground as a jog set off
                    // (its clip 12 cm from the hold) was carried along it at 4.7 m/s (W1, 2026-11-07)
                    // (and any foot let go of while jogging is kept from locking again until it leaves the ground: let go of by
                    // its reach as a jog set off, it locked again mid-roll and its ball slid 0.3 m/s, W1, 2026-11-07)
                    var jogging = !otherDown && !Walkish(body);
                    k.On = false; k.Release = lifted && jogging ? 0f : 1f; k.NoRelock = jogging; k.From = want - new Vector3(off.x, 0f, off.y);
                    // while the other foot is down too, up to the swing's clearance at once, this frame too (its clearance
                    // was none while it was held: let go on the ground, the sneak's foot slid 2 cm along it that frame,
                    // W1/W2 10 → 1); the last foot on the ground (a jog's push-off) is left to leave it as the clip lifts
                    // it (lifted at once, slow, it stood 3 cm up while it bore the weight, W6 23 → 30; by the other foot's
                    // hold, the sneak's front foot not yet held left its rear one sliding, 2026-11-06)
                    if (otherDown) want.y += Mathf.Max(0f, SwingClear - Mathf.Max(0f, sole));
                }
                else return want - new Vector3(off.x, k.Drop, off.y);
            }
            if (k.Release > 0f)
            {
                k.Release = Mathf.Max(0f, k.Release - dt / LockRelease);
                // out of the hold at once, slowing as it nears the clip's own place (smoothstep's slow start held the jog's
                // push-off foot crawling while it rose 3-5 cm, the lower foot bearing no weight read as one bearing it, W6,
                // 2026-11-07)
                var t = k.Release * k.Release;
                if (!turned)
                {
                    var before = Lowest(foot, toe, heel, ball, tip);
                    foot.rotation = Quaternion.Slerp(Quaternion.identity, k.Corr, t) * foot.rotation;
                    want.y += before - Lowest(foot, toe, heel, ball, tip);
                }
                // (no lowering as it goes: lifted to the swing's clearance at once, the hold's lowering left the sneak's
                // heel 1-2 cm up sliding at 0.75 m/s, W1, 2026-11-06)
                return new Vector3(Mathf.Lerp(want.x, k.From.x, t), want.y, Mathf.Lerp(want.z, k.From.z, t));
            }
            k.Drop = 0f;
            return want;
        }

        private static float Slip(Lock k, Transform foot, Transform toe, Vector3 heel, Vector3 ball, Vector3 tip)
        {
            if (!k.On) return -1f;
            var p = k.Pivot == 0 ? foot.TransformPoint(heel) : k.Pivot == 1 ? foot.TransformPoint(ball) : (toe != null ? toe : foot).TransformPoint(tip);
            return new Vector2(p.x - k.At.x, p.z - k.At.z).magnitude;
        }

        /// <summary>The height of a foot's lowest sole point (world).</summary>
        private static float Lowest(Transform foot, Transform toe, Vector3 heel, Vector3 ball, Vector3 tip)
            => Mathf.Min(foot.TransformPoint(heel).y, Mathf.Min(foot.TransformPoint(ball).y, (toe != null ? toe : foot).TransformPoint(tip).y));

        /// <summary>A held foot's turn as it came down, and its heading along the ground.</summary>
        private void Hold(ref Lock k, Transform foot, Transform toe)
        {
            k.Rest = foot.rotation; k.Corr = Quaternion.identity; k.HaveTurn = true;
            var f = Ahead(foot, toe); f.y = 0f;
            k.Fwd = f.sqrMagnitude > 1e-8f ? f.normalized : transform.forward;
        }

        /// <summary>The clip's turn of a held foot reduced to its pitch about the foot's side-to-side axis (the twist of the
        /// change since it came down about that axis), on the turn it came down with.</summary>
        private static Quaternion Pitched(ref Lock k, Quaternion clip)
        {
            var d = clip * Quaternion.Inverse(k.Rest);
            var axis = Vector3.Cross(Vector3.up, k.Fwd).normalized;
            var v = new Vector3(d.x, d.y, d.z);
            var p = Vector3.Dot(v, axis) * axis;
            var tw = new Quaternion(p.x, p.y, p.z, d.w);
            var m = Mathf.Sqrt(tw.x * tw.x + tw.y * tw.y + tw.z * tw.z + tw.w * tw.w);
            tw = m < 1e-6f ? Quaternion.identity : new Quaternion(tw.x / m, tw.y / m, tw.z / m, tw.w / m);
            var r = tw * k.Rest;
            k.Corr = r * Quaternion.Inverse(clip);
            return r;
        }

        /// <summary>A place for the ankle the leg can reach: the same spot on the ground, no lower than the leg's length allows.</summary>
        private static Vector3 Reachable(Transform up, Transform lo, Transform foot, Vector3 want)
        {
            var h = up.position;
            var len = (lo.position - h).magnitude + (foot.position - lo.position).magnitude - 0.005f;
            var v = want - h;
            if (v.sqrMagnitude <= len * len) return want;
            var flat = new Vector2(v.x, v.z).magnitude;
            if (flat >= len) return want;   // too far along the ground: left to the solve
            want.y = Mathf.Max(want.y, h.y - Mathf.Sqrt(len * len - flat * flat));
            return want;
        }

        /// <summary>A foot's sole points where it ended this frame, and how high the lowest stood over its ground.</summary>
        private static void End(Transform foot, Transform toe, Vector3 heel, Vector3 ball, Vector3 tip, Vector3[] at, float ground, out float dip)
        {
            at[0] = foot.TransformPoint(heel); at[1] = foot.TransformPoint(ball); at[2] = (toe != null ? toe : foot).TransformPoint(tip);
            dip = float.IsNaN(ground) ? 1f : Mathf.Min(at[0].y, Mathf.Min(at[1].y, at[2].y)) - ground;
        }

        /// <summary>A foot that was down when its person set off, held on the sole point it stood on.</summary>
        private void Seed(ref Lock k, Vector3[] at, float dip)
        {
            k = default;
            k.Last = dip;
            if (dip > LockDown + 0.005f) return;
            var low = 0;
            for (var i = 1; i < 3; i++) if (at[i].y < at[low].y - 0.003f) low = i;
            k.On = true; k.Pivot = low; k.At = at[low]; k.Min = Mathf.Max(0f, dip); k.W = 1f;
        }

        private float GroundAt(Vector3 p, out Vector3 normal)
        {
            var from = new Vector3(p.x, p.y + Reach, p.z);
            if (Physics.Raycast(from, Vector3.down, out var hit, Reach * 2.5f, Ground, QueryTriggerInteraction.Ignore))
            {
                normal = hit.normal;
                return hit.point.y;
            }
            normal = Vector3.up;
            return float.NaN;
        }

        /// <summary>A foot at rest turned to a heading (world, degrees) and tilted to the ground's normal: flat, sole down.</summary>
        private Quaternion Flat(Quaternion rest, float restHeading, float heading, Vector3 normal)
        {
            var yaw = transform.rotation.eulerAngles.y;
            var turned = Quaternion.AngleAxis(heading - restHeading - yaw, Vector3.up) * transform.rotation * rest;
            return Quaternion.FromToRotation(Vector3.up, normal) * turned;
        }

        /// <summary>The feet the clip wants, drawn together to <see cref="MaxStance"/> across the body and
        /// <see cref="MaxStagger"/> along it if it stands them wider.</summary>
        private (Vector3, Vector3) Narrow(Vector3 l, Vector3 r)
        {
            var right = transform.right; right.y = 0f; right.Normalize();
            var ahead = Vector3.Cross(right, Vector3.up);
            var size = Mathf.Max(0.5f, transform.lossyScale.y);
            var across = Vector3.Dot(r - l, right);
            var max = MaxStance * size;
            if (across > max) { var pull = (across - max) * 0.5f; l += right * pull; r -= right * pull; }
            var along = Vector3.Dot(r - l, ahead);
            var stagger = MaxStagger * size;
            if (Mathf.Abs(along) > stagger) { var pull = (Mathf.Abs(along) - stagger) * 0.5f * Mathf.Sign(along); l += ahead * pull; r -= ahead * pull; }
            return (l, r);
        }

        /// <summary>Puts a foot down where it is, or steps it to where the clip wants it (one foot at a time).</summary>
        /// <summary>A place for one foot held to the stance against where the other foot stands now: no wider than
        /// <see cref="MaxStance"/>, not crossed over it, no further ahead or behind than <see cref="MaxStagger"/>.</summary>
        private Vector3 Against(Vector3 want, Vector3 other, bool left)
        {
            var right = transform.right; right.y = 0f; right.Normalize();
            var ahead = Vector3.Cross(right, Vector3.up);
            var size = Mathf.Max(0.5f, transform.lossyScale.y);
            var side = left ? -1f : 1f;   // the left foot stands to the body's left of the right one
            var across = Vector3.Dot(want - other, right) * side;
            // no narrower than 9 cm across (F3w: quiet stances run 8-32; 7 cm let a step land at 7.7, 2026-11-06)
            var max = MaxStance * size; var min = 0.09f * size;
            if (across > max) want -= right * side * (across - max);
            else if (across < min) want += right * side * (min - across);
            var along = Vector3.Dot(want - other, ahead);
            var stagger = MaxStagger * size;
            if (Mathf.Abs(along) > stagger) want -= ahead * Mathf.Sign(along) * (Mathf.Abs(along) - stagger);
            return want;
        }

        private void Plant(ref Foot f, ref Foot other, Vector3 want, float wantYaw, float dt, bool left)
        {
            if (other.Planted && !other.Stepping) want = Against(want, other.Pin, left);
            if (!f.Planted) { f.Planted = true; f.Pin = want; f.PinYaw = wantYaw; f.Stepping = false; return; }
            if (f.Stepping)
            {
                f.T += dt / StepTime;
                // the place keeps moving with a turning body until the foot is over it, then the foot comes straight down
                // (a foot that followed the turn to its last frame slid 10-16 cm/s as it touched, F4, 2026-11-06)
                if (f.T < StepTravel.y) { f.To = want; f.ToYaw = wantYaw; }
                // down on the frame that would take it past the step's end (the first and last frames of a step, 1-3 % of
                // the way, stood the foot 2.5-3 cm up whatever the frame rate: a sole read as neither down nor stepping, F1)
                if (f.T + dt / StepTime >= 1f) { f.Stepping = false; f.Pin = f.To; f.PinYaw = f.ToYaw; }
                return;
            }
            if (other.Stepping) return;
            var off = Vector3.ProjectOnPlane(want - f.Pin, Vector3.up).magnitude;
            var turn = Mathf.Abs(Mathf.DeltaAngle(f.PinYaw, wantYaw));
            if (off > StepReach || turn > StepTurn) { f.Stepping = true; f.T = 0f; f.From = f.Pin; f.FromYaw = f.PinYaw; f.To = want; f.ToYaw = wantYaw; }
        }

        /// <summary>Where a planted foot's ankle goes (its sole on the ground under its place, or on its step's arc), its
        /// heading and the ground's normal there.</summary>
        private Vector3 Placed(ref Foot f, float ankle, out float heading, out Vector3 normal)
        {
            Vector3 at;
            var lift = 0f;
            if (f.Stepping)
            {
                var t = Mathf.Clamp01(f.T);
                // up first, across, then down (a real step's foot leaves and meets the ground nearly vertically)
                var u = Mathf.Clamp01((t - StepTravel.x) / (StepTravel.y - StepTravel.x));
                var s = u * u * (3f - 2f * u);
                at = Vector3.Lerp(f.From, f.To, s);
                heading = Mathf.LerpAngle(f.FromYaw, f.ToYaw, s);
                // off the ground and down again quickly (a foot lingering 2.5-3 cm up read as a sole not down, F1): 3 cm
                // up within the step's first 1.6 %, so already on the first frame at any frame rate under 200 a second
                // (sin^0.5 left it 2.5-3 cm up a frame each way: F1 at the turn, 2026-11-06)
                lift = StepLift * Mathf.Pow(Mathf.Sin(t * Mathf.PI), 0.25f);
            }
            else { at = f.Pin; heading = f.PinYaw; }
            var g = GroundAt(at, out normal);
            if (!float.IsNaN(g)) at.y = g + ankle + lift;
            return at;
        }

        /// <summary>An analytic two-bone solve: the thigh and shin turned so the ankle reaches the target, the knee kept in the
        /// plane it bends in now (forward when the leg is straight).</summary>
        /// <summary>Standing, the most the pelvis tilts across (degrees; the gate's K3 is 5): a clip's hip dropped further is
        /// levelled, the spine turned back so the chest stays (the idles' 7-8° read as a hip thrown, the owner, 2026-11-09).</summary>
        public float PelvisLevel = 4f;

        private void Level()
        {
            // (the chest held, not the spine: on these rigs the thighs hang from the spine, and holding it held the legs as they
            // were, K3 unchanged)
            var spine = _animator.GetBoneTransform(HumanBodyBones.Chest) ?? _animator.GetBoneTransform(HumanBodyBones.Spine);
            if (spine == null) return;
            var across = _upR.position - _upL.position;
            var fwd = Vector3.ProjectOnPlane(transform.forward, Vector3.up).normalized;
            var flat = Vector3.ProjectOnPlane(across, fwd);
            if (flat.sqrMagnitude < 1e-6f) return;
            var tilt = Mathf.Asin(Mathf.Clamp(flat.y / flat.magnitude, -1f, 1f)) * Mathf.Rad2Deg;
            var over = Mathf.Abs(tilt) - PelvisLevel;
            if (over <= 0f) return;
            // (about the forward axis a positive turn raises the right side: a right hip high is turned down, a low one up)
            var q = Quaternion.AngleAxis(-Mathf.Sign(tilt) * over, fwd);
            var spineRot = spine.rotation;
            _hips.rotation = q * _hips.rotation;
            spine.rotation = spineRot;
        }

        private void Solve(Transform up, Transform lo, Transform foot, Vector3 target, Vector3? kneeOver = null)
        {
            var h = up.position; var k = lo.position; var a = foot.position;
            var l1 = (k - h).magnitude; var l2 = (a - k).magnitude;
            if (l1 < 1e-4f || l2 < 1e-4f) return;
            var to = target - h;
            var d = Mathf.Clamp(to.magnitude, Mathf.Abs(l1 - l2) + 1e-3f, l1 + l2 - 1e-4f);
            var dir = to.sqrMagnitude > 1e-8f ? to.normalized : (a - h).normalized;
            var pole = Vector3.ProjectOnPlane(k - h, dir);
            if (kneeOver.HasValue)
            {
                var over = Vector3.ProjectOnPlane(new Vector3(kneeOver.Value.x, 0f, kneeOver.Value.z), dir);
                if (over.sqrMagnitude > 1e-6f) pole = over;
            }
            if (pole.sqrMagnitude < 1e-6f) pole = Vector3.ProjectOnPlane(transform.forward, dir);
            pole.Normalize();
            var x = (l1 * l1 - l2 * l2 + d * d) / (2f * d);
            var y = Mathf.Sqrt(Mathf.Max(0f, l1 * l1 - x * x));
            var knee = h + dir * x + pole * y;
            var end = h + dir * d;
            var keep = foot.rotation;
            up.rotation = Quaternion.FromToRotation(k - h, knee - h) * up.rotation;
            lo.rotation = Quaternion.FromToRotation(foot.position - lo.position, end - lo.position) * lo.rotation;
            foot.rotation = keep;   // the foot keeps its own turn (set after, flat, when planted)
        }
    }
}
