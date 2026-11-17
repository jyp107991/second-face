using System.Collections;
using System.Collections.Generic;
using SecondFace.Core.Combat;
using SecondFace.Core.Inventory;
using SecondFace.Game.People;
using SecondFace.Game.Play;
using UnityEngine;
using UnityEngine.AI;

namespace SecondFace.Game.Fighting
{
    /// <summary>
    /// A fighter's body in the fight with captured motion and weapons in hands (COMBAT.md A1–A8), behind
    /// <see cref="IUnitView"/> (the fight asks for each beat; the rules have already happened): the weapon drawn as the fight
    /// begins and back in its holster or sling as it ends; walks on the people's own locomotion with the weapon carried
    /// over it (crouched: the captured sneak); a turn to face by stepping; the long gun raised to the shoulder, fired single
    /// or in bursts at its clip's own fire frames (muzzle flash, recoil, a spent case, the tracer from the muzzle), lowered;
    /// the pistol aimed by IK on a captured stance, its recoil a spring; blows by weapon and sex, the target struck at the
    /// clip's impact frame; a hit on every hit by direction and zone (crits staggering), a blow blocked or slipped; down
    /// into cover and out of it; the throw released at the clip's own frame and flown along its arc; the reload; a held shot
    /// held at the aim; hands up; the ragdoll's fall and the captured get-up for the side the body lies on. Every beat runs
    /// at the fight's pace (the speed setting, skip), and every state goes back to the weapon's ready stance by itself.
    /// The body's walking is <see cref="PlaceholderUnitView"/>'s (the agent's path, the walker's own when it is the player).
    /// </summary>
    public sealed class AnimatedUnitView : IUnitView
    {
        private readonly MonoBehaviour _host;
        private readonly CombatFx _fx;
        private readonly PlaceholderUnitView _walk;
        public Fighter Fighter { get; }
        public BattleUnit Unit { get; }
        public Transform Body { get; }
        public CombatPace Pace { get; set; } = CombatPace.Normal;
        public bool Theirs { get; }
        public bool Moving => _walk.Moving;
        /// <summary>Getting up off the ground (the get-up playing).</summary>
        public bool Rising => _rising;
        /// <summary>On the ground (fallen, not yet up).</summary>
        public bool Down => _down;

        private bool _down, _yielded, _holding, _aiming, _rising, _ended, _walking;
        private float _quietFor;   // the aim held with nothing done (s): since it was reached or the last round; lowers the weapon
        private int _blows, _misses, _moves;
        private string _stance = "stand";
        private string _heldItem;
        private Coroutine _tick;

        public AnimatedUnitView(BattleUnit unit, Transform body, MonoBehaviour host, CombatFx fx, Fighter fighter, Walker walker, Townsperson person, bool theirs)
        {
            Unit = unit; Body = body; _host = host; _fx = fx; Fighter = fighter; Theirs = theirs;
            _walk = new PlaceholderUnitView(unit, body, host, fx, walker, person, theirs);
            _stance = unit?.C?.Stance ?? "stand";
            var item = ItemOf(unit);
            _heldItem = item?.Id;
            fighter.Equip(CombatMotion.For(item, unit?.C?.Id), inHand: false);
            fighter.Crouched = _stance == "crouch";
            if (host != null && host.isActiveAndEnabled) { host.StartCoroutine(Begin()); _tick = host.StartCoroutine(Tick()); }
        }

        private static ItemDef ItemOf(BattleUnit u)
        {
            if (u?.C == null) return null;
            var (_, inst) = CombatRules.WeaponOf(u.C);
            return inst != null && Items.Has(inst.Def) ? Items.Def(inst.Def) : null;
        }

        private float Secs(float s) => Pace.Seconds(s, Theirs);
        private void Rate() => Fighter.SetRate(CombatMotion.Rate(Pace, Theirs));

        private static IEnumerator Wait(float seconds)
        {
            for (var t = 0f; t < seconds; t += Time.deltaTime) yield return null;
        }

        /// <summary>The fight begins: the stance's ready state, the weapon drawn halfway through it.</summary>
        private IEnumerator Begin()
        {
            Rate();
            Fighter.Play(_stance == "crouch" ? CombatMotion.Cover(Fighter.Arms) : _stance == "prone" ? "prone" : CombatMotion.Idle(Fighter.Arms));
            yield return Wait(0.2f);
            if (!_down && !_yielded) Fighter.Draw();
        }

        /// <summary>Each frame while the fight lasts: a weapon swapped is taken up; a walk made unwaited ends in the stance; a
        /// held shot that has lapsed and a weapon left raised after a shot come down.</summary>
        private IEnumerator Tick()
        {
            while (!_ended)
            {
                if (Body == null) yield break;
                if (!_down && !_yielded && Unit?.C != null)
                {
                    var item = ItemOf(Unit);
                    if (item?.Id != _heldItem)
                    {
                        _heldItem = item?.Id;
                        Fighter.Equip(CombatMotion.For(item, Unit.C.Id), inHand: true);
                        if (!Fighter.Moving) Fighter.Play(Stanced());
                    }
                    if (_walking && !_walk.Moving) { _walking = false; Fighter.Locomote(false, _stance == "crouch"); }
                    if (_holding && Unit.Watch == null) { _holding = false; _quietFor = 99f; }
                    // the quiet that lowers a raised weapon counts only while the aim is held: from the moment it is reached
                    // (and from each round), never through the raise, the turn and the facing learnt before it. Counted from
                    // the aim's start, a first long-gun aim (the raise 0.94 s, the crossfade, the facing 0.2 s) was past the
                    // delay as it was reached and came down at once; the shot that followed fired on the lowering gun
                    // (CombatMotionPlayTests: "a shot played rifle_lower", 2026-11-17)
                    _quietFor = _aiming ? _quietFor + Time.deltaTime : 0f;
                    if (_aiming && !_holding && _quietFor > Mathf.Max(0.6f, Secs(1.1f))) Lower();
                }
                yield return null;
            }
        }

        private string Stanced() => _stance == "crouch" ? CombatMotion.Cover(Fighter.Arms) : _stance == "prone" ? "prone" : CombatMotion.Idle(Fighter.Arms);

        private void Lower()
        {
            _aiming = false;
            Fighter.ClearAim();
            if (_down || _yielded) return;
            if (Fighter.Arms == Arms.Rifle && _stance != "crouch" && _stance != "prone") Fighter.Play("rifle_lower");
            else Fighter.Play(Stanced(), 0.3f);
        }

        /// <summary>Turns to face a point (with <paramref name="state"/>, so that state's weapon points at it: Fighter.Facing),
        /// by stepping for a wide turn (the stance gives the feet to the foot plant), within the stance for a small one (its
        /// planted feet held).</summary>
        private IEnumerator Face(Vector3 at, string state = null)
        {
            if (Body == null) yield break;
            var to = at - Body.position; to.y = 0f;
            if (to.sqrMagnitude < 0.01f) yield break;
            to = Quaternion.AngleAxis(-Fighter.Facing(state), Vector3.up) * to.normalized;
            var goal = Quaternion.LookRotation(to, Vector3.up);
            var angle = Quaternion.Angle(Body.rotation, goal);
            if (angle < 4f) yield break;
            var big = angle > 40f && _stance == "stand";
            if (big) Fighter.Turning(true);
            var from = Body.rotation;
            var secs = Mathf.Max(0.12f, Secs(Mathf.Lerp(0.2f, 0.5f, angle / 180f)));
            for (var t = 0f; t < 1f; t += Time.deltaTime / secs)
            {
                if (Body == null) yield break;
                var e = t * t * (3f - 2f * t);
                Body.rotation = Quaternion.Slerp(from, goal, e);
                yield return null;
            }
            if (Body != null) Body.rotation = goal;
            if (big) { Fighter.Turning(false); yield return Wait(Secs(0.12f)); }
        }

        // ------------------------------------------------------------------------------------------- IUnitView

        public IEnumerator OnMove(Vector3 goal, IReadOnlyList<Vector3> path, bool wait = true)
        {
            if (Body == null) yield break;
            _moves++;
            Rate();
            _aiming = false; Fighter.ClearAim();
            if (_down || _yielded) { yield return _walk.OnMove(goal, path, wait); yield break; }
            _stance = Unit?.C?.Stance ?? _stance;
            var crouched = _stance == "crouch" || _stance == "prone";
            // out of cover at a run: the captured break from the crouch, cut at its first stride (crossfading into the walk)
            if (!crouched && Fighter.Current != null && Fighter.Current.StartsWith("cover_hold") && path != null && path.Count > 1)
            {
                yield return Face(path[1]);
                Fighter.Crouched = false;
                Fighter.Play("cover_leave");
                yield return Fighter.Until("cover_leave", CombatMotion.State("cover_leave").Cut, 1.5f);
            }
            else if (_stance == "prone")
            {
                // (no crawl is captured: up to a crouch, a crouched walk, down again at the end)
                Fighter.Play("rise_crouch");
                yield return Fighter.Until("rise_crouch", 0.8f, 4f);
            }
            Fighter.Locomote(true, crouched);
            // (crouched: at the captured sneak's own pace for this body, so its feet keep to the ground)
            _walk.Speed = crouched ? (float)SecondFace.Core.World.Stealth.SneakSpeed : (float?)null;
            _walking = !wait;
            yield return _walk.OnMove(goal, path, wait);
            if (wait)
            {
                _walking = false;
                Fighter.Locomote(false, _stance == "crouch");
                if (_stance == "prone") Fighter.Play("prone");
            }
        }

        public IEnumerator OnAim(Vector3 at)
        {
            if (Body == null || _down) yield break;
            Rate();
            if (_yielded) yield break;
            if (_walk.Moving) { var w = 0f; while (_walk.Moving && w < 4f) { w += Time.deltaTime; yield return null; } }
            var target = at + Vector3.up * 1.15f;
            var aimState = CombatMotion.Aim(Fighter.Arms);
            var learnt = Fighter.KnowsFacing(aimState);
            yield return Face(at, aimState);
            Fighter.AimAt(target);
            _quietFor = 0f;
            var aim = CombatMotion.Aim(Fighter.Arms);
            if (aim == null) { if (!Fighter.Is(Stanced())) Fighter.Play(Stanced()); yield break; }
            if (!Fighter.InHand) Fighter.Draw();
            if (Fighter.Is("rifle_aim") || Fighter.Is("rifle_fire") || Fighter.Is("rifle_burst") || Fighter.Is("pistol_aim")) { _aiming = true; yield break; }
            if (Fighter.Arms == Arms.Rifle && _stance == "stand")
            {
                // to the shoulder: the captured raise's second half, quicker, into the hold
                Fighter.Play("rifle_raise");
                yield return Fighter.Until("rifle_raise", CombatMotion.State("rifle_raise").Cut, 1.6f);
                if (!Fighter.Is("rifle_aim")) Fighter.Play("rifle_aim", 0.12f);
                // (the first time this stance is held, the gun's line against the chest is learnt: turned onto the target by it)
                if (!learnt)
                {
                    var w = 0f;
                    while (!Fighter.KnowsFacing("rifle_aim") && w < 0.6f) { w += Time.deltaTime; yield return null; }
                    if (Mathf.Abs(Fighter.Facing("rifle_aim")) > 5f) yield return Face(at, "rifle_aim");
                }
            }
            else
            {
                // (from a crouch the aim rises out of it as a crossfade: stepping out of cover to fire)
                Fighter.Play(aim, _stance == "crouch" ? 0.35f : null);
                yield return Wait(Mathf.Max(0.12f, Secs(_stance == "crouch" ? 0.35f : 0.25f)));
            }
            _aiming = true;
        }

        public IEnumerator OnFire(Vector3 at, bool hit, int round, int rounds = 1)
        {
            if (Body == null || _down || _yielded) yield break;
            Rate();
            if (!_aiming) yield return OnAim(at - Vector3.up * 1.1f);
            Fighter.AimAt(at);
            _quietFor = 0f;
            if (Fighter.Arms == Arms.Rifle && Fighter.InHand)
            {
                // every round on the hold itself (rifle_aim: CMU 80_03), its recoil at run time (Fighter.Recoil): the authored
                // shot takes (rifle_fire/burst_cmu) are CMU 79's, a stance 9 cm wider, and every shot crossfaded the feet
                // between the two actors' stances and back (F4 in the shots, 2026-11-17)
                if (!Fighter.Is("rifle_aim")) { Fighter.Play("rifle_aim", 0.12f); yield return Wait(Mathf.Max(0.1f, Secs(0.2f))); }
                // (a burst's rounds 0.1 s apart, as the authored burst's frames 7, 10 and 13 at 30 fps; the kick climbs a
                // little a round)
                if (round > 0) yield return Wait(Mathf.Max(0.05f, Secs(0.1f)));
                Fighter.Recoil(2.6f + 0.6f * Mathf.Min(round, 4));
                Shot(at, 1f);
                yield return Wait(Mathf.Max(0.03f, Secs(0.05f)));
                _fx.FlashOff();
            }
            else if (Fighter.Arms == Arms.Pistol && Fighter.InHand)
            {
                if (!Fighter.Is("pistol_aim")) { Fighter.Play("pistol_aim"); yield return Wait(Secs(0.25f)); }
                if (round > 0) yield return Wait(Mathf.Max(0.08f, Secs(0.18f)));
                Fighter.Kick(1f);
                Shot(at, 0.6f);
                yield return Wait(Mathf.Max(0.03f, Secs(0.05f)));
                _fx.FlashOff();
            }
            else
            {
                // (no gun in hand: the placeholder's tracer from the chest)
                yield return _walk.OnFire(at, hit, round, rounds);
                yield break;
            }
            yield return Wait(Secs(round + 1 < rounds ? 0.02f : 0.18f));
            // (the quiet before the weapon comes down counts from the round, not from the start of its beat)
            _quietFor = 0f;
        }

        /// <summary>A round leaves the muzzle: its flash, a spent case, the kick, the tracer to where it went.</summary>
        private void Shot(Vector3 at, float kick)
        {
            var w = Fighter.Weapon; var d = Fighter.WeaponData;
            Vector3 muzzle;
            if (w != null && d != null && d.HasMuzzle) muzzle = w.position + w.rotation * d.Muzzle;
            else muzzle = Body.position + Vector3.up * 1.35f + Body.forward * 0.4f;
            _fx.Flash(muzzle);
            if (w != null) _fx.Shell(w.position + w.up * 0.06f, w.right);
            // (a long gun's kick is its recoil, given with the round: Fighter.Recoil)
            _host.StartCoroutine(_fx.Tracer(muzzle, at, Mathf.Max(0.04f, Secs(0.07f)), 0f));
        }

        public IEnumerator OnStrike(Vector3 at, bool hit)
        {
            if (Body == null || _down || _yielded) yield break;
            Rate();
            if (_walk.Moving) { var w = 0f; while (_walk.Moving && w < 4f) { w += Time.deltaTime; yield return null; } }
            yield return Face(at);
            Fighter.AimAt(at + Vector3.up * 1.2f);
            if (!Fighter.InHand && Fighter.Held.Shown) Fighter.Draw();
            var state = CombatMotion.Strike(Fighter.Arms, Fighter.Female, _blows++);
            if (!Fighter.Play(state, null, restart: true)) { yield return Wait(Secs(0.2f)); yield break; }
            var impact = Fighter.Set != null ? Fighter.Set.Beat(state, Fighter.Female, "impact") : -1f;
            if (impact < 0f) impact = 0.45f;
            yield return Fighter.Until(state, impact, 2.5f);
            // (the blow lands here: the fight plays the hit on its target; the strike follows through and goes back to the
            // guard by itself)
        }

        public void OnHit(Vector3 from, string zone, string kind)
        {
            if (Body == null || _down) return;
            Fighter.Hit(from, zone, kind);
            if (kind != "crit" || _yielded || _stance != "stand") return;
            var behind = Vector3.Dot(Body.forward, from - Body.position) < -0.3f;
            Rate();
            Fighter.Play(CombatMotion.Heavy(behind, zone), null, restart: true);
            _aiming = false;
        }

        public void OnMiss(Vector3 from, bool melee)
        {
            if (Body == null || _down || _yielded) return;
            if (!melee) { Fighter.Hit(from, "torso", "miss"); return; }
            if (_stance != "stand") return;
            var side = Vector3.Dot(Body.right, from - Body.position) < 0f;
            Rate();
            Fighter.Play(CombatMotion.Miss(Fighter.Arms, Fighter.Female, side, _misses++), null, restart: true);
        }

        public void OnFall(Vector3 from)
        {
            if (Body == null || _down) return;
            _down = true; _aiming = false; _holding = false;
            Fighter.Drop();
            Fighter.Release(0.05f);
            _walk.OnFall(from);
        }

        public void OnRise()
        {
            if (Body == null || !_down || _rising) return;
            _host.StartCoroutine(Rise());
        }

        /// <summary>Back up from the ground: the ragdoll hands the body back, the captured get-up for the side it lies on is
        /// set on the lying pose (turned and moved so its lying body is where the ragdoll's is), and played.</summary>
        private IEnumerator Rise()
        {
            _rising = true;
            var anim = Fighter.Animator;
            var rag = anim != null ? anim.GetComponent<Ragdoll>() : null;
            var hips = anim != null ? anim.GetBoneTransform(HumanBodyBones.Hips) : null;
            var head = anim != null ? anim.GetBoneTransform(HumanBodyBones.Head) : null;
            if (rag == null || !rag.Fallen || hips == null || head == null)
            {
                _down = false; _rising = false;
                Fighter.PickUp(inHand: !_ended);
                yield break;
            }
            var state = CombatMotion.Rise(Fighter.FrontUp(), (Unit?.C?.Stance ?? "stand") == "crouch" && !_ended);
            var lyingHips = hips.position;
            var lyingDir = head.position - hips.position; lyingDir.y = 0f;
            rag.StandUp();
            Rate();
            Fighter.PlayNow(state);
            // the get-up's own lying body over the ragdoll's: turned about the up axis, then moved
            var nowDir = head.position - hips.position; nowDir.y = 0f;
            if (lyingDir.sqrMagnitude > 1e-4f && nowDir.sqrMagnitude > 1e-4f)
            {
                var turn = Vector3.SignedAngle(nowDir, lyingDir, Vector3.up);
                Body.RotateAround(hips.position, Vector3.up, turn);
            }
            var shift = lyingHips - hips.position; shift.y = 0f;
            Body.position += shift;
            anim.Update(0f);
            yield return Fighter.Until(state, CombatMotion.State(state).Cut, 14f);
            _down = false;
            Fighter.PickUp(inHand: !_ended);
            if (!_ended) Fighter.Play(Stanced());
            var agent = Body != null ? Body.GetComponent<NavMeshAgent>() : null;
            if (agent != null && !agent.enabled) { agent.enabled = true; if (agent.isOnNavMesh) agent.Warp(Body.position); }
            _rising = false;
        }

        public void OnStance(string stance)
        {
            if (Body == null || _down || _yielded || stance == null) return;
            Rate();
            var was = _stance;
            _stance = stance;
            Fighter.Crouched = stance == "crouch";
            _aiming = false;
            if (stance == "crouch")
            {
                if (was == "prone") Fighter.Play("rise_crouch");
                else Fighter.Play("cover_down");
            }
            else if (stance == "prone") Fighter.Play("prone");
            else
            {
                if (was == "prone") Fighter.Play("rise_front");
                else if (was == "crouch" && _host != null && _host.isActiveAndEnabled) _host.StartCoroutine(RiseUnlessMoving(_moves));
                else Fighter.Play(CombatMotion.Idle(Fighter.Arms), 0.45f);
            }
        }

        /// <summary>Up out of a crouch: a moment's wait, so a walk that follows at once breaks from the crouch at a run (the
        /// captured break, OnMove); otherwise up into the stance.</summary>
        private IEnumerator RiseUnlessMoving(int moves)
        {
            yield return Wait(Mathf.Max(0.15f, Secs(0.3f)));
            if (_moves == moves && !_down && !_yielded && _stance == "stand") Fighter.Play(CombatMotion.Idle(Fighter.Arms), 0.45f);
        }

        public IEnumerator OnThrow(IReadOnlyList<Vector3> arc, string item = null)
        {
            if (arc == null || arc.Count < 2 || Body == null || _down || _yielded) yield break;
            Rate();
            yield return Face(arc[arc.Count - 1]);
            var def = item != null && Items.Has(item) ? Items.Def(item) : ItemOf(Unit);
            var thrown = CombatMotion.Thrown(def);
            var inHand = Fighter.InHand;
            Fighter.BeginThrow(thrown);
            Fighter.Play("throw", null, restart: true);
            var release = Fighter.Set != null ? Fighter.Set.Beat("throw", Fighter.Female, "release") : -1f;
            if (release < 0f) release = 0.35f;
            yield return Fighter.Until("throw", release, 2.5f);
            var t = Fighter.Release();
            var flight = Mathf.Max(0.15f, Secs(0.65f));
            if (t != null) yield return Fly(t, arc, flight);
            else yield return _fx.Arc(arc, flight);
            Fighter.EndThrow(inHand && Fighter.Held.Arms != Arms.Thrown);
        }

        /// <summary>The thrown thing along its arc from the hand, tumbling, gone where it lands.</summary>
        private static IEnumerator Fly(Transform t, IReadOnlyList<Vector3> arc, float seconds)
        {
            var start = t.position;
            var spin = Random.onUnitSphere;
            for (var e = 0f; e < seconds && t != null; e += Time.deltaTime)
            {
                var u = e / seconds * (arc.Count - 1);
                var i = Mathf.Min(arc.Count - 2, (int)u);
                var p = Vector3.Lerp(arc[i], arc[i + 1], u - i);
                // (from the hand itself, blending onto the arc in its first tenth)
                t.position = Vector3.Lerp(start + (p - arc[0]), p, Mathf.Clamp01(e / (seconds * 0.1f)));
                t.Rotate(spin, 720f * Time.deltaTime, Space.World);
                yield return null;
            }
            if (t != null) Object.Destroy(t.gameObject);
        }

        public IEnumerator OnReload()
        {
            if (Body == null || _down || _yielded) yield break;
            Rate();
            _aiming = false; Fighter.ClearAim();
            var state = CombatMotion.Reload(Fighter.Arms);
            if (state == null || !Fighter.InHand) { yield return Wait(Secs(0.3f)); yield break; }
            Fighter.Play(state, null, restart: true);
            yield return Fighter.Until(state, CombatMotion.State(state).Cut, 4f);
        }

        public void OnHold(string mode)
        {
            if (Body == null || _down || _yielded) return;
            _holding = mode != null && mode != "guard";
            if (!_holding) { Fighter.Play(Stanced()); return; }
            var aim = CombatMotion.Aim(Fighter.Arms);
            if (aim == null) return;
            if (!Fighter.InHand) Fighter.Draw();
            Fighter.AimAt(Body.position + Body.forward * 8f + Vector3.up * 1.2f);
            Fighter.Play(aim, 0.3f);
            _aiming = true; _quietFor = 0f;
        }

        public void OnYield()
        {
            if (Body == null || _down || _yielded) return;
            _yielded = true; _aiming = false; _holding = false;
            Fighter.ClearAim();
            Fighter.Drop();
            Rate();
            Fighter.Play("yield_enter", null, restart: true);
        }

        public void Place(Vector3 at, Quaternion facing)
        {
            _walk.Place(at, facing);
            _walking = false;
            if (!_down && !_yielded) { Fighter.Locomote(false, _stance == "crouch"); Fighter.Play(Stanced(), 0.05f); }
        }

        public void OnEnd()
        {
            if (_ended) return;
            _ended = true;
            if (_tick != null && _host != null) _host.StopCoroutine(_tick);
            if (_host != null && _host.isActiveAndEnabled) _host.StartCoroutine(End());
        }

        /// <summary>Out of the fight: once up off the ground, the guard relaxed (a man's captured relax), the weapon back in
        /// its holster or sling, the body to the people's own motion. The dead stay where they fell.</summary>
        private IEnumerator End()
        {
            var w = 0f;
            while (_rising && w < 15f) { w += Time.deltaTime; yield return null; }
            if (Unit != null && !Unit.Alive) yield break;
            if (_down) yield break;
            if (_yielded && Body != null) { Fighter.Play("yield_hold"); yield return Wait(1.5f); }
            if (!Fighter.Female && Fighter.Arms == Arms.Unarmed && _stance == "stand" && !_yielded)
            {
                Fighter.Play("unarmed_relax");
                yield return Fighter.Until("unarmed_relax", CombatMotion.State("unarmed_relax").Cut, 3f);
            }
            // (a weapon thrown down when hands went up is taken up again as the fight ends)
            if (_yielded) Fighter.PickUp(inHand: false);
            Fighter.End(0.5f);
        }
    }
}
