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
        public float StepReach = 0.13f, StepTurn = 28f, StepTime = 0.32f, StepLift = 0.07f;

        private static readonly int SpeedId = Animator.StringToHash("Speed");
        private Animator _animator;
        private bool _hasSpeed, _ready;
        private Transform _hips, _upL, _loL, _footL, _toeL, _upR, _loR, _footR, _toeR;
        private float _ankleL, _ankleR, _bindScale = 1f;   // the ankle's height over a flat sole at rest (world m at the bind scale)
        private Quaternion _restL, _restR;                  // each foot's rotation at rest, in the body's frame (flat, sole down)
        private float _headingL, _headingR;                 // each foot's heading at rest in the body's frame, degrees
        private float _sink, _plant, _low, _unplant, _bodySpeed;
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
        private struct Lock { public bool On; public Vector3 At, From; public float Release, Last; public int Pivot; }
        private Lock _lockL, _lockR;
        /// <summary>A foot locks when its sole is this near the ground and slower than <see cref="SwingSlow"/>; it lets go
        /// when its sole rises past <see cref="LockLift"/> or the clip's foot has gone <see cref="LockReach"/> from it, over
        /// <see cref="LockRelease"/> s.</summary>
        public float LockDown = 0.02f, LockLift = 0.03f, LockReach = 0.12f, LockRelease = 0.12f;
        /// <summary>Moving, a foot faster than this (m/s, along the ground) is in its swing: it is held at least
        /// <see cref="SwingClear"/> off the ground, less as it slows, so it comes down only as it stops (a real heel
        /// meets the ground at under about 1 m/s; the clips' feet glided in at 2-4 m/s, 2026-11-06).</summary>
        public float SwingFast = 1.5f, SwingSlow = 0.5f, SwingClear = 0.03f;

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
        public float[] Diag = new float[8];
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
            if ((transform.position - _was).sqrMagnitude > 0.25f) { _l = default; _r = default; _sink = 0f; _haveEnd = false; _lockL = default; _lockR = default; moved = 0f; }
            _was = transform.position;
            // the body's own pace over the ground (the locomotion's "Speed" is a clip's, not the body's: Pace)
            _bodySpeed = Mathf.Lerp(_bodySpeed, moved, 1f - Mathf.Exp(-10f * dt));
            // setting off: no blend back to the clip (it slid the feet); the feet that were down are held where they stood
            _plant = standing ? Mathf.MoveTowards(_plant, 1f, dt / 0.15f) : 0f;
            var setOff = !standing && _wasStanding && _haveEnd;
            if (!standing) { _l.Planted = _r.Planted = false; _l.Stepping = _r.Stepping = false; }
            else { _haveLast = false; _lockL = default; _lockR = default; }

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
            var want = Mathf.Clamp(-(standing ? Mathf.Max(eL, eR) : _low), -0.15f, 0.15f);
            _sink = Mathf.Lerp(_sink, want, 1f - Mathf.Exp(-(standing ? 25f : 3f) * dt));
            _hips.position += Vector3.up * _sink;

            // where each foot goes: walking, the clip's place lifted by the ground's step under it; standing, planted
            var footing = transform.position.y;
            var wantL = _footL.position + Vector3.up * Mathf.Clamp(gL - footing, -Reach, Reach) * (1f - _plant);
            var wantR = _footR.position + Vector3.up * Mathf.Clamp(gR - footing, -Reach, Reach) * (1f - _plant);
            var yawL = Heading(Ahead(_footL, _toeL)); var yawR = Heading(Ahead(_footR, _toeR));
            if (_plant > 0f)
            {
                var (nl, nr) = Narrow(_footL.position, _footR.position);
                Plant(ref _l, ref _r, nl, yawL, dt, true);
                Plant(ref _r, ref _l, nr, yawR, dt, false);
                var pl = Placed(ref _l, ankleL, out var hl, out var normL);
                var pr = Placed(ref _r, ankleR, out var hr, out var normR);

                wantL = Vector3.Lerp(wantL, pl, _plant);
                wantR = Vector3.Lerp(wantR, pr, _plant);
                Solve(_upL, _loL, _footL, wantL);
                Solve(_upR, _loR, _footR, wantR);
                // flat on the ground, turned its way, sole down
                _footL.rotation = Quaternion.Slerp(_footL.rotation, Flat(_restL, _headingL, hl, normL), _plant);
                _footR.rotation = Quaternion.Slerp(_footR.rotation, Flat(_restR, _headingR, hr, normR), _plant);
            }
            else
            {
                // a foot the clip (or the hips' height) puts into the ground is lifted out of it, by its own lowest point
                var dipL = SoleOver(_footL, _toeL, _heelL, _backL, _ballL, _tipL, gL) + (wantL.y - _footL.position.y);
                var dipR = SoleOver(_footR, _toeR, _heelR, _backR, _ballR, _tipR, gR) + (wantR.y - _footR.position.y);
                // the swing's clearance: how high a foot moving at this pace must stand
                float Clear(Vector3 now, Vector3 last)
                {
                    if (!_haveLast) return 0f;
                    var v = new Vector2(now.x - last.x, now.z - last.z).magnitude / dt;
                    return SwingClear * Mathf.Clamp01((v - SwingSlow) / (SwingFast - SwingSlow));
                }
                var clearL = Clear(_footL.position, _lastL); var clearR = Clear(_footR.position, _lastR);
                var speedL = _haveLast ? new Vector2(_footL.position.x - _lastL.x, _footL.position.z - _lastL.z).magnitude / dt : 0f;
                var speedR = _haveLast ? new Vector2(_footR.position.x - _lastR.x, _footR.position.z - _lastR.z).magnitude / dt : 0f;
                _lastL = _footL.position; _lastR = _footR.position; _haveLast = true;
                if (dipL < clearL) wantL.y += clearL - dipL;
                if (dipR < clearR) wantR.y += clearR - dipR;
                Diag[0] = dipL; Diag[1] = clearL; Diag[2] = Mathf.Max(0f, clearL - dipL);
                Diag[4] = dipR; Diag[5] = clearR; Diag[6] = Mathf.Max(0f, clearR - dipR);
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
                wantL = Held(ref _lockL, wantL, dipL, speedL, body, _footL, _toeL, _heelL, _ballL, _tipL, dt);
                wantR = Held(ref _lockR, wantR, dipR, speedR, body, _footR, _toeR, _heelR, _ballR, _tipR, dt);
                Diag[3] = _lockL.On ? 1f : _lockL.Release > 0f ? 0.5f : 0f; Diag[7] = _lockR.On ? 1f : _lockR.Release > 0f ? 0.5f : 0f;
                if ((wantL - _footL.position).sqrMagnitude > 4e-6f) Solve(_upL, _loL, _footL, wantL);
                if ((wantR - _footR.position).sqrMagnitude > 4e-6f) Solve(_upR, _loR, _footR, wantR);
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
        private Vector3 Held(ref Lock k, Vector3 want, float sole, float speed, float body, Transform foot, Transform toe, Vector3 heel, Vector3 ball, Vector3 tip, float dt)
        {
            // the sole point now lowest, where the clip has it with the ankle at the place wanted
            var shift = want - foot.position;
            Vector3 At(int i) => (i == 0 ? foot.TransformPoint(heel) : i == 1 ? foot.TransformPoint(ball) : (toe != null ? toe : foot).TransformPoint(tip)) + shift;
            var low = 0; var lowY = At(0).y;
            for (var i = 1; i < 3; i++) { var y = At(i).y; if (y < lowY - 0.003f) { lowY = y; low = i; } }
            var slow = Mathf.Max(SwingSlow, 0.35f * body);
            // down: slow for the pace, or coming down onto the ground (a heel that touched at 0.4-0.7 m/s slid 3-4 frames
            // before it was slow enough to hold, 2026-11-06)
            var landing = sole < k.Last - 0.001f && speed < SwingFast;
            k.Last = sole;
            if (!k.On && k.Release <= 0f && sole < LockDown && (speed < slow || landing)) { k.On = true; k.Pivot = low; k.At = At(low); }
            if (k.On)
            {
                // rolling on: the pivot moves forward to the next point once that one is the lower, pinned where it is
                if (low > k.Pivot) { var held = new Vector3(k.At.x, 0f, k.At.z) - new Vector3(At(k.Pivot).x, 0f, At(k.Pivot).z); k.Pivot = low; k.At = At(low) + held; }
                var c = At(k.Pivot);
                var off = new Vector2(c.x - k.At.x, c.z - k.At.z);
                if (sole > LockLift || off.magnitude > LockReach) { k.On = false; k.Release = 1f; k.From = want - new Vector3(off.x, 0f, off.y); }
                else return want - new Vector3(off.x, 0f, off.y);
            }
            if (k.Release > 0f)
            {
                k.Release = Mathf.Max(0f, k.Release - dt / LockRelease);
                var t = k.Release * k.Release * (3f - 2f * k.Release);
                return new Vector3(Mathf.Lerp(want.x, k.From.x, t), want.y, Mathf.Lerp(want.z, k.From.z, t));
            }
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
            k.On = true; k.Pivot = low; k.At = at[low];
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
                f.To = want; f.ToYaw = wantYaw;   // the place keeps moving with a turning body
                if (f.T >= 1f) { f.Stepping = false; f.Pin = want; f.PinYaw = wantYaw; }
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
                var s = t * t * (3f - 2f * t);
                at = Vector3.Lerp(f.From, f.To, s);
                heading = Mathf.LerpAngle(f.FromYaw, f.ToYaw, s);
                lift = StepLift * Mathf.Sqrt(Mathf.Sin(t * Mathf.PI));
            }
            else { at = f.Pin; heading = f.PinYaw; }
            var g = GroundAt(at, out normal);
            if (!float.IsNaN(g)) at.y = g + ankle + lift;
            return at;
        }

        /// <summary>An analytic two-bone solve: the thigh and shin turned so the ankle reaches the target, the knee kept in the
        /// plane it bends in now (forward when the leg is straight).</summary>
        private void Solve(Transform up, Transform lo, Transform foot, Vector3 target)
        {
            var h = up.position; var k = lo.position; var a = foot.position;
            var l1 = (k - h).magnitude; var l2 = (a - k).magnitude;
            if (l1 < 1e-4f || l2 < 1e-4f) return;
            var to = target - h;
            var d = Mathf.Clamp(to.magnitude, Mathf.Abs(l1 - l2) + 1e-3f, l1 + l2 - 1e-4f);
            var dir = to.sqrMagnitude > 1e-8f ? to.normalized : (a - h).normalized;
            var pole = Vector3.ProjectOnPlane(k - h, dir);
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
