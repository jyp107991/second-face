using System.Collections;
using System.Collections.Generic;
using SecondFace.Core.Combat;
using SecondFace.Game.People;
using UnityEngine;
using UnityEngine.AI;

namespace SecondFace.Game.Fighting
{
    /// <summary>
    /// One person's body in a fight (COMBAT.md A1–A8): the weapon in the hand or on the body, the fight's Animator layers
    /// ("Combat", the whole body; "CombatArms", the weapon carried over the walk: both added to the people's own controller
    /// by Editor/Build/CombatAnimatorBuild.cs from Core <see cref="CombatMotion"/>), played by name, and what the clips cannot
    /// do themselves, each frame after them:
    /// <list type="bullet">
    /// <item>the hands on the weapon: the off hand on its <c>grip_off</c> by IK (the captured long-gun and club takes' mimed
    /// hands drift 5-27 cm apart); a pistol's aim by both hands on the line from the eyes to the target, on a captured
    /// stance; a one-handed slash along an arc on a captured hook's body; a long gun's wrist turned (at most 12°) so its
    /// muzzle points at the target; the fingers closed round each grip, fists in the guard;</item>
    /// <item>a procedural hit on every hit (a spring-damped turn of the spine, chest and head away from it, by where it
    /// struck and how hard), and a pistol's recoil;</item>
    /// <item>the feet on the ground while the fight's own stances play (the standing foot plant keeps quiet standing's
    /// stance, which a guard or a crouch is not: it gives way while the whole body is the fight's, as it does to a fall,
    /// and these feet keep the clip's stance on the ground under each foot, a planted foot held where it was put down);</item>
    /// <item>root motion where a clip's travel is applied (a get-up, a stumble, a step into a blow), through the body's
    /// agent so it keeps to the NavMesh.</item>
    /// </list>
    /// The other runtime systems stay on: the arms are still kept out of the body (<see cref="ArmClearance"/>, told the
    /// arms are holding something so it neither rests nor swings them), the hands' relaxed curl where no grip closes them,
    /// the gaze with each combat stance's own head limits (docs/PEOPLE_MOTION.md §2.7) while the fight's stance plays.
    /// </summary>
    [RequireComponent(typeof(Animator))]
    [DefaultExecutionOrder(30)]   // after the foot plant (-20), the gaze (0), the hands (5) and the arms' clearance (10)
    public sealed class Fighter : MonoBehaviour
    {
        public CombatSet Set;
        public bool Female;
        /// <summary>The body that moves (the agent's transform; the animator may sit under it).</summary>
        public Transform Body;
        public string Who;

        private static readonly int ArmsId = Animator.StringToHash(CombatMotion.ArmsParam), CrouchId = Animator.StringToHash(CombatMotion.CrouchParam),
            RateId = Animator.StringToHash(CombatMotion.RateParam), SneakId = Animator.StringToHash("Sneak"), SneakRateId = Animator.StringToHash("SneakRate");
        private static readonly Dictionary<int, string> Names = new();

        private Animator _a;
        private int _full = -1, _armsLayer = -1;
        private Hand _right, _left;
        private Transform _hips, _spine, _chest, _head, _upL, _loL, _footL, _upR, _loR, _footR;
        private FootPlant _plant;
        private Gaze _gaze;
        private ArmClearance _clear;
        private NavMeshAgent _agent;
        private bool _plantWasOn = true, _pausedPlant;
        private Ambient _ambient;
        private bool _ambientWasOn = true, _pausedAmbient;
        private float _gazeYaw0 = 26f, _gazeRoll0 = 6f;
        private bool _hasSneak, _hasSneakRate;
        private Vector3 _chestFront;   // the chest's front in its own space (standing, at bind)
        private float _hipHeight = 0.935f, _ankleL = 0.08f, _ankleR = 0.08f;

        public bool Ready { get; private set; }
        public Animator Animator => _a;
        public Hand Right => _right;
        public Hand Left => _left;

        // ------------------------------------------------------------------------------------------- what is held

        public CombatMotion.Held Held { get; private set; }
        public Arms Arms => Held.Arms;
        private CombatSet.Weapon _w;
        private GameObject _weapon, _dropped, _thrown;
        private CombatMotion.Held _thrownHeld;
        /// <summary>The weapon now (null: fists, or dropped).</summary>
        public Transform Weapon => _weapon != null ? _weapon.transform : null;
        public CombatSet.Weapon WeaponData => _w;
        public bool InHand { get; private set; }
        private readonly Dictionary<Arms, (Transform Bone, Vector3 Pos, Quaternion Rot)> _holsters = new();

        // ------------------------------------------------------------------------------------------- the layers

        private float _fullW, _fullWant, _fullRate = 4f, _armsW, _armsWant, _armsRate = 4f;
        /// <summary>The whole-body state playing (or being crossfaded into) on the fight's layer.</summary>
        public string Current { get; private set; }
        /// <summary>The weapon carried over the walk (the arms layer's state), null: none.</summary>
        public string Carrying { get; private set; }
        public float FullWeight => _fullW;
        public float ArmsWeight => _armsW;
        public bool Crouched { get; set; }
        /// <summary>Walking (the locomotion's legs; the weapon carried on the arms layer).</summary>
        public bool Moving { get; private set; }
        public float Rate { get; private set; } = 1f;

        // ------------------------------------------------------------------------------------------- the hands

        private float _offW, _pistolW, _arcW, _fixW, _fistW;
        private Vector3 _aimAt;
        private bool _haveAim;
        /// <summary>The off hand's palm from its grip_off this frame (m; -1: not held), and the weapon's main grip from the
        /// palm (m), after everything (tests and the gate read them).</summary>
        public float OffError { get; private set; } = -1f;
        public float MainError { get; private set; } = -1f;

        // ------------------------------------------------------------------------------------------- facing

        private static readonly Dictionary<string, float> Facings = new();
        private string FacingKey(string state) => state + (Female ? "/f" : "/m");

        /// <summary>A long gun's line against the body's front while a state holds it (degrees about up, + to the right):
        /// the captured stance blades the chest away from where the gun points, so a turn to face points the weapon, not the
        /// chest, at the target. Learned the first time the state is held (the clip's own geometry; the same on every body).</summary>
        public float Facing(string state) => state != null && Facings.TryGetValue(FacingKey(state), out var d) ? d : 0f;
        public bool KnowsFacing(string state) => state != null && Facings.ContainsKey(FacingKey(state));

        private void LearnFacing()
        {
            if (Current == null || _weapon == null || !InHand || Held.Arms != Arms.Rifle || _fullW < 0.99f || _a.IsInTransition(_full)) return;
            var s = CombatMotion.State(Current);
            if (s == null || s.Gate != "aim" || KnowsFacing(Current) || Progress(Current) < 0.05f) return;
            var line = _weapon.transform.forward; line.y = 0f;
            if (line.sqrMagnitude < 1e-4f) return;
            Facings[FacingKey(Current)] = Vector3.SignedAngle(Front, line.normalized, Vector3.up);
        }

        // ------------------------------------------------------------------------------------------- springs

        private Vector3 _hitA, _hitV;   // degrees about the body's right (back +), up (twist), forward (roll)
        private float _hitHead = 0.2f, _hitChest = 0.6f, _hitSpine = 0.4f;
        private float _kick, _kickV;

        // ------------------------------------------------------------------------------------------- the feet

        private struct Foot { public bool Locked; public Vector3 At; public float W; public Vector3 Was; public bool HaveWas; }
        private Foot _fl, _fr;
        private bool _turning;

        // ------------------------------------------------------------------------------------------- making one

        /// <summary>The fighter on a body's animator (made once; null: no humanoid, no combat layers, no set).</summary>
        public static Fighter Ensure(Animator a, CombatSet set, bool female, Transform body, string who)
        {
            if (a == null || !a.isHuman || set == null || !HasLayers(a)) return null;
            var f = a.GetComponent<Fighter>();
            if (f == null) f = a.gameObject.AddComponent<Fighter>();
            f.Set = set; f.Female = female; f.Body = body != null ? body : a.transform; f.Who = who;
            f.Bind();
            return f;
        }

        /// <summary>The body's controller carries the fight's layers.</summary>
        public static bool HasLayers(Animator a) =>
            a != null && a.runtimeAnimatorController != null && a.GetLayerIndex(CombatMotion.FullLayer) >= 0 && a.GetLayerIndex(CombatMotion.ArmsLayer) >= 0;

        /// <summary>Reads the body as it stands now (the fight begins from the people's own idle: feet flat on the ground,
        /// arms down): the hands' palms, the ankles' height over their soles, the chest's front, where each holster sits.</summary>
        public void Bind()
        {
            _a = GetComponent<Animator>();
            if (_a == null || !_a.isHuman) { Ready = false; return; }
            if (Names.Count == 0) foreach (var s in CombatMotion.States) { Names[Animator.StringToHash(s.AnimName(false))] = s.Name; Names[Animator.StringToHash(s.AnimName(true))] = s.Name; }
            _full = _a.GetLayerIndex(CombatMotion.FullLayer);
            _armsLayer = _a.GetLayerIndex(CombatMotion.ArmsLayer);
            _right = new Hand(_a, false); _left = new Hand(_a, true);
            _hips = _a.GetBoneTransform(HumanBodyBones.Hips);
            _spine = _a.GetBoneTransform(HumanBodyBones.Spine);
            _chest = _a.GetBoneTransform(HumanBodyBones.UpperChest) ?? _a.GetBoneTransform(HumanBodyBones.Chest) ?? _spine;
            _head = _a.GetBoneTransform(HumanBodyBones.Head);
            _upL = _a.GetBoneTransform(HumanBodyBones.LeftUpperLeg); _loL = _a.GetBoneTransform(HumanBodyBones.LeftLowerLeg); _footL = _a.GetBoneTransform(HumanBodyBones.LeftFoot);
            _upR = _a.GetBoneTransform(HumanBodyBones.RightUpperLeg); _loR = _a.GetBoneTransform(HumanBodyBones.RightLowerLeg); _footR = _a.GetBoneTransform(HumanBodyBones.RightFoot);
            _plant = GetComponent<FootPlant>();
            _ambient = GetComponent<Ambient>();
            _gaze = GetComponent<Gaze>();
            _clear = GetComponent<ArmClearance>();
            _agent = Body != null ? Body.GetComponent<NavMeshAgent>() : null;
            if (_gaze != null) { _gazeYaw0 = _gaze.MaxNeckYaw; _gazeRoll0 = _gaze.MaxRoll; }
            _hasSneak = _hasSneakRate = false;
            foreach (var p in _a.parameters) { if (p.nameHash == SneakId) _hasSneak = true; if (p.nameHash == SneakRateId) _hasSneakRate = true; }
            var ground = Body != null ? Body.position.y : transform.position.y;
            if (_hips != null) _hipHeight = Mathf.Max(0.5f, _hips.position.y - ground);
            if (_footL != null) _ankleL = Mathf.Clamp(_footL.position.y - GroundAt(_footL.position, ground), 0.03f, 0.16f);
            if (_footR != null) _ankleR = Mathf.Clamp(_footR.position.y - GroundAt(_footR.position, ground), 0.03f, 0.16f);
            if (_chest != null) _chestFront = Quaternion.Inverse(_chest.rotation) * Front;
            _holsters.Clear();
            foreach (var arms in new[] { Arms.Pistol, Arms.Rifle, Arms.Melee, Arms.Club2 })
                HolsterPlace(arms);
            Ready = _full >= 0 && _armsLayer >= 0 && _right.Ready && _left.Ready;
        }

        private Vector3 Front { get { var f = Body != null ? Body.forward : transform.forward; f.y = 0f; return f.sqrMagnitude > 1e-6f ? f.normalized : Vector3.forward; } }
        private Vector3 RightAx => Vector3.Cross(Vector3.up, Front);

        /// <summary>Where a weapon held as <paramref name="arms"/> rides on this body (Core <see cref="CombatMotion.HolsterFor"/>,
        /// in the body's frame, scaled by its hips' height), as a place on its bone.</summary>
        private void HolsterPlace(Arms arms)
        {
            var h = CombatMotion.HolsterFor(new CombatMotion.Held("x", 1, arms));
            if (h.Hidden) return;
            var bone = _a.GetBoneTransform((HumanBodyBones)System.Enum.Parse(typeof(HumanBodyBones), h.Bone)) ?? _hips;
            if (bone == null) return;
            var k = _hipHeight / 0.935f;
            var frame = Quaternion.LookRotation(Front, Vector3.up);
            var at = bone.position + frame * Hand.V(h.At) * k;
            var rot = Quaternion.LookRotation(frame * Hand.V(h.Forward), frame * Hand.V(h.Up));
            _holsters[arms] = (bone, bone.InverseTransformPoint(at), Quaternion.Inverse(bone.rotation) * rot);
        }

        // ------------------------------------------------------------------------------------------- the weapon

        /// <summary>Takes up what <paramref name="held"/> says: the model in the hand (<paramref name="inHand"/>) or on the body.</summary>
        public void Equip(CombatMotion.Held held, bool inHand)
        {
            if (_weapon != null) Destroy(_weapon);
            _weapon = null; _w = null; InHand = false;
            Held = held;
            if (_a != null && _a.runtimeAnimatorController != null) _a.SetInteger(ArmsId, (int)held.Arms);
            if (!held.Shown || Set == null) return;
            _w = Set.WeaponOf(held.Model);
            if (_w?.Prefab == null) return;
            _weapon = Make(_w, held.Variant);
            if (inHand) Draw(); else Sheathe();
        }

        private GameObject Make(CombatSet.Weapon w, int variant)
        {
            var go = Instantiate(w.Prefab);
            go.name = "held_" + w.Id;
            foreach (var c in go.GetComponentsInChildren<Collider>()) Destroy(c);
            if (variant == 2 && w.Paint1 != null && w.Paint2 != null && w.Paint2.Length > 0)
                foreach (var r in go.GetComponentsInChildren<Renderer>())
                {
                    var mats = r.sharedMaterials;
                    for (var i = 0; i < mats.Length; i++)
                    {
                        var k = System.Array.IndexOf(w.Paint1, mats[i]);
                        if (k >= 0 && k < w.Paint2.Length && w.Paint2[k] != null) mats[i] = w.Paint2[k];
                    }
                    r.sharedMaterials = mats;
                }
            var layer = Body != null ? Body.gameObject.layer : gameObject.layer;
            foreach (var t in go.GetComponentsInChildren<Transform>(true)) t.gameObject.layer = layer;
            return go;
        }

        /// <summary>The weapon to the main hand (its grip on the palm, Core <see cref="CombatMotion.MainGrip"/>).</summary>
        public void Draw()
        {
            if (_weapon == null || _right == null || !_right.Ready) return;
            _weapon.SetActive(true);
            var g = CombatMotion.MainGrip(Held.Model);
            Attach(_weapon.transform, _right.Bone, _right.Centre, _right.Frame * Quaternion.Inverse(Quaternion.LookRotation(Hand.V(g.Across), Hand.V(g.Palm))));
            InHand = true;
        }

        /// <summary>The weapon to its holster or sling (A1: out of a fight); a thrown weapon goes in the pack (hidden).</summary>
        public void Sheathe()
        {
            if (_weapon == null) return;
            InHand = false;
            if (!_holsters.TryGetValue(Held.Arms, out var h) || h.Bone == null) { _weapon.SetActive(false); return; }
            _weapon.SetActive(true);
            Attach(_weapon.transform, h.Bone, h.Pos, h.Rot);
        }

        private static void Attach(Transform t, Transform bone, Vector3 localPos, Quaternion localRot)
        {
            t.SetParent(bone, false);
            t.localPosition = localPos;
            t.localRotation = localRot;
            var s = bone.lossyScale;
            t.localScale = new Vector3(1f / Mathf.Max(1e-4f, s.x), 1f / Mathf.Max(1e-4f, s.y), 1f / Mathf.Max(1e-4f, s.z));
        }

        /// <summary>The weapon dropped (a fall, hands up): it leaves the hand and falls where it is.</summary>
        public void Drop()
        {
            if (_weapon == null) return;
            var go = _weapon;
            _weapon = null; InHand = false;
            go.transform.SetParent(null, true);
            go.transform.localScale = Vector3.one;
            var box = go.AddComponent<BoxCollider>();
            var len = _w != null && _w.Length > 0.05f ? _w.Length : 0.4f;
            box.size = new Vector3(0.05f, 0.08f, len); box.center = new Vector3(0f, 0f, len * 0.4f);
            var rb = go.AddComponent<Rigidbody>();
            rb.mass = 2.5f;
            rb.AddForce((Front * 0.6f + Vector3.up * 0.4f), ForceMode.VelocityChange);
            if (_dropped != null) Destroy(_dropped);
            _dropped = go;
        }

        /// <summary>Back in hand after a fall (the dropped one gone), or to the holster.</summary>
        public void PickUp(bool inHand)
        {
            if (_dropped != null) { Destroy(_dropped); _dropped = null; }
            if (_weapon == null) Equip(Held, inHand);
            else if (inHand) Draw(); else Sheathe();
        }

        /// <summary>A throw begins: the weapon to its sling, the thrown thing in the throwing hand.</summary>
        public void BeginThrow(CombatMotion.Held thrown)
        {
            if (InHand) Sheathe();
            if (_thrown != null) Destroy(_thrown);
            _thrownHeld = thrown;
            var w = Set != null ? Set.WeaponOf(thrown.Model) : null;
            if (w?.Prefab == null || _right == null || !_right.Ready) return;
            _thrown = Make(w, thrown.Variant);
            var g = CombatMotion.MainGrip(thrown.Model);
            Attach(_thrown.transform, _right.Bone, _right.Centre, _right.Frame * Quaternion.Inverse(Quaternion.LookRotation(Hand.V(g.Across), Hand.V(g.Palm))));
        }

        /// <summary>The thrown thing leaves the hand (the view flies it along its arc and does away with it).</summary>
        public Transform Release()
        {
            if (_thrown == null) return null;
            var t = _thrown.transform;
            t.SetParent(null, true);
            t.localScale = Vector3.one;
            _thrown = null;
            return t;
        }

        /// <summary>A throw over: the weapon back in hand.</summary>
        public void EndThrow(bool inHand)
        {
            if (_thrown != null) { Destroy(_thrown); _thrown = null; }
            if (inHand) Draw();
        }

        // ------------------------------------------------------------------------------------------- playing states

        /// <summary>Plays a state on its layer by name (Core <see cref="CombatMotion.States"/>), crossfading
        /// (<paramref name="fade"/> s; the state's own when null) and bringing its layer in: a whole-body state takes the body
        /// from the locomotion, a carry plays over the walk's legs.</summary>
        public bool Play(string state, float? fade = null, bool restart = false, float? from = null)
        {
            var s = CombatMotion.State(state);
            if (!Ready || s == null || _a == null || !_a.isActiveAndEnabled) return false;
            if (s.Only == "m" && Female || s.Only == "f" && !Female) return false;
            var layer = s.Layer == CombatMotion.ArmsLayer ? _armsLayer : _full;
            var f = Mathf.Max(0f, fade ?? s.Fade);
            _a.SetInteger(ArmsId, (int)Held.Arms);
            _a.SetBool(CrouchId, Crouched);
            if (!restart && Is(state) && s.Loop) { Bring(layer, f); return true; }
            var length = Set != null ? Set.Length(state, Female) : 1f;
            _a.CrossFadeInFixedTime(s.AnimName(Female), f, layer, (from ?? s.From) * length);
            Bring(layer, f);
            if (layer == _full) Current = state; else Carrying = state;
            return true;
        }

        /// <summary>Plays a state at once, its first frame written now (after a fall: the get-up from where the body lies).</summary>
        public void PlayNow(string state)
        {
            var s = CombatMotion.State(state);
            if (!Ready || s == null) return;
            _a.SetInteger(ArmsId, (int)Held.Arms);
            _a.SetBool(CrouchId, Crouched);
            _a.Play(s.AnimName(Female), _full, s.From);
            _fullW = _fullWant = 1f; _armsW = _armsWant = 0f;
            _a.SetLayerWeight(_full, 1f); _a.SetLayerWeight(_armsLayer, 0f);
            Current = state;
            _a.Update(0f);
        }

        private void Bring(int layer, float fade)
        {
            var rate = 1f / Mathf.Max(0.05f, fade);
            if (layer == _full) { _fullWant = 1f; _fullRate = rate; Moving = false; }
            else { _armsWant = 1f; _armsRate = rate; }
        }

        /// <summary>The fight's motion leaves the body to the locomotion (over <paramref name="fade"/> s).</summary>
        public void Release(float fade)
        {
            _fullWant = 0f; _armsWant = 0f;
            _fullRate = _armsRate = 1f / Mathf.Max(0.05f, fade);
            Moving = false;
            Current = null; Carrying = null;
        }

        /// <summary>Setting off (the locomotion's legs, the weapon carried over them; crouched: the captured sneak) or
        /// stopping (the stance's state back on the whole body).</summary>
        public void Locomote(bool moving, bool crouched)
        {
            Crouched = crouched;
            if (moving)
            {
                Moving = true;
                _fullWant = 0f; _fullRate = 1f / 0.25f;
                var carry = CombatMotion.Carry(Held.Arms);
                if (carry != null && InHand) Play(carry); else { _armsWant = 0f; Carrying = null; }
                if (_hasSneak) _a.SetBool(SneakId, crouched);
            }
            else
            {
                Moving = false;
                if (_hasSneak) _a.SetBool(SneakId, false);
                _armsWant = 0f; _armsRate = 1f / 0.25f;
                Play(crouched ? CombatMotion.Cover(Held.Arms) : CombatMotion.Idle(Held.Arms), 0.25f);
            }
        }

        /// <summary>A turn in place: the stance gives the feet to the standing foot plant (which steps a body round) and takes
        /// them back after.</summary>
        public void Turning(bool on)
        {
            _turning = on;
            if (on) { _fullWant = 0f; _fullRate = 1f / 0.15f; }
            else if (!Moving && Current != null) { _fullWant = 1f; _fullRate = 1f / 0.2f; }
        }

        public void SetRate(float rate) { Rate = rate; if (_a != null && _a.runtimeAnimatorController != null) _a.SetFloat(RateId, rate); }

        /// <summary>Whether the whole-body (or carry) layer is in this state or crossfading into it.</summary>
        public bool Is(string state) => Progress(state) >= 0f;

        /// <summary>A state's normalized time now (its own layer's current state, or the one being crossfaded into); -1: not playing.</summary>
        public float Progress(string state)
        {
            if (_a == null || !_a.isActiveAndEnabled) return -1f;
            var s = CombatMotion.State(state);
            if (s == null) return -1f;
            var layer = s.Layer == CombatMotion.ArmsLayer ? _armsLayer : _full;
            if (layer < 0) return -1f;
            var hash = Animator.StringToHash(s.AnimName(Female));
            if (_a.IsInTransition(layer))
            {
                var next = _a.GetNextAnimatorStateInfo(layer);
                if (next.shortNameHash == hash) return next.normalizedTime;
            }
            var cur = _a.GetCurrentAnimatorStateInfo(layer);
            return cur.shortNameHash == hash ? cur.normalizedTime : -1f;
        }

        /// <summary>Waits until a state reaches <paramref name="t"/> (normalized), or has been left, or
        /// <paramref name="timeout"/> s pass.</summary>
        public IEnumerator Until(string state, float t, float timeout)
        {
            var waited = 0f; var seen = false;
            while (waited < timeout)
            {
                var p = Progress(state);
                if (p >= 0f) seen = true;
                if (p >= t || (seen && p < 0f)) yield break;
                waited += Time.deltaTime;
                yield return null;
            }
        }

        /// <summary>The whole-body state's next (where the fight leaves it, Core <see cref="CombatMotion.Next"/>).</summary>
        public string After(string state) => CombatMotion.Next(CombatMotion.State(state), Held.Arms, Crouched);

        /// <summary>Where the weapon's aim and the head's look go (a point on the target's chest).</summary>
        public void AimAt(Vector3 at) { _aimAt = at; _haveAim = true; }
        public void ClearAim() => _haveAim = false;

        /// <summary>A shot's kick (a pistol's muzzle flips up and back, then settles; a long gun's chest jolt).</summary>
        public void Kick(float strength = 1f)
        {
            _kickV += 520f * strength;
            _hitV += new Vector3(14f, 0f, 0f) * strength * (Held.Arms == Arms.Rifle ? 1.4f : 0.7f);
        }

        /// <summary>Struck (A5): the spine, chest and head turned away from where it came from, by where it struck and how
        /// hard (a graze, a hit, a crit; a miss flinches), springing back (A5's procedural directional hit, README v3 §2).</summary>
        public void Hit(Vector3 from, string zone, string kind)
        {
            var size = kind == "crit" ? 16f : kind == "graze" ? 5f : kind == "miss" ? 3f : 10f;
            var away = (Body != null ? Body.position : transform.position) - from; away.y = 0f;
            if (away.sqrMagnitude < 1e-6f) away = -Front;
            away.Normalize();
            var local = Quaternion.Inverse(Quaternion.LookRotation(Front, Vector3.up)) * away;
            var legs = zone != null && zone.StartsWith("leg");
            var head = zone == "head" || zone == "eyes";
            _hitHead = head ? 1.0f : 0.2f; _hitChest = head ? 0.25f : 0.6f; _hitSpine = legs ? 0.6f : 0.4f;
            // pushed back (-z) leans back, pushed sideways rolls and twists away; a leg buckles forward
            var push = new Vector3(-local.z * (legs ? -0.7f : 1f), -local.x * 0.6f, -local.x * 0.5f) * size;
            // (an impulse whose first swing peaks near the size: ω0 · size / 0.6)
            _hitV += push * (HitOmega / 0.6f);
        }

        private const float HitOmega = 2f * Mathf.PI * 3.2f, HitDamp = 0.45f, KickOmega = 28f, KickDamp = 0.6f;

        /// <summary>The chest's front against up (1 lying face up, -1 face down): which get-up a fallen body needs.</summary>
        public float FrontUp() => _chest != null && _chestFront.sqrMagnitude > 0.5f ? Vector3.Dot((_chest.rotation * _chestFront).normalized, Vector3.up) : 0f;

        // ------------------------------------------------------------------------------------------- the frame

        private void Update()
        {
            if (!Ready || _a == null || !_a.enabled) return;
            var dt = Time.deltaTime;
            _fullW = Mathf.MoveTowards(_fullW, _fullWant, _fullRate * dt);
            _armsW = Mathf.MoveTowards(_armsW, _armsWant, _armsRate * dt);
            _a.SetLayerWeight(_full, Smooth(_fullW));
            _a.SetLayerWeight(_armsLayer, Smooth(_armsW));
            _a.SetInteger(ArmsId, (int)Held.Arms);
            _a.SetBool(CrouchId, Crouched);
            // the standing foot plant keeps quiet standing's stance: it gives way while the fight's stance has the body
            var fightStance = !_turning && (_fullWant > 0.5f || _fullW > 0.5f);
            if (_plant != null)
            {
                // (held off every frame: a ragdoll's rise turns it back on when its blend ends)
                if (fightStance) { if (!_pausedPlant) { _plantWasOn = _plant.enabled; _pausedPlant = true; } if (_plant.enabled) _plant.enabled = false; }
                else if (_pausedPlant) { _plant.enabled = _plantWasOn; _pausedPlant = false; }
            }
            // a person in a fight makes no idle gestures (the ambient's waves and stretches wait until it is over)
            var fighting = _fullWant > 0.5f || _armsWant > 0.5f || Moving || _fullW > 0.02f || _armsW > 0.02f;
            if (_ambient != null)
            {
                if (fighting)
                {
                    if (!_pausedAmbient)
                    {
                        _ambientWasOn = _ambient.enabled; _pausedAmbient = true;
                        // (a gesture under way is ended as the ambient would end it: its layer back to none, weighing nothing)
                        var g = _a.GetLayerIndex(Ambient.GestureLayer);
                        if (g >= 0) { _a.CrossFadeInFixedTime(CombatMotion.None, 0.2f, g); _a.SetLayerWeight(g, 0f); }
                    }
                    if (_ambient.enabled) _ambient.enabled = false;
                }
                else if (_pausedAmbient) { _ambient.enabled = _ambientWasOn; _pausedAmbient = false; }
            }
            if (_clear != null) _clear.Holding = _fullW > 0.02f || _armsW > 0.02f;
            // the gaze holds the head within the stance's own limits (docs/PEOPLE_MOTION.md §2.7) while the stance plays
            if (_gaze != null)
            {
                var (yaw, roll) = _fullW > 0.5f ? HeadLimits(CombatMotion.State(Current)?.Gate) : (_gazeYaw0, _gazeRoll0);
                _gaze.MaxNeckYaw = yaw; _gaze.MaxRoll = roll;
            }
            if (Moving && _hasSneakRate && Crouched && _agent != null)
                _a.SetFloat(SneakRateId, Mathf.Clamp(_agent.velocity.magnitude * Pace.SneakHip / (Mathf.Max(0.3f, _hipHeight) * Pace.SneakSpeed), 0f, 1.6f));
        }

        private static float Smooth(float w) => w * w * (3f - 2f * w);

        /// <summary>The gaze's limits on the head in each combat stance: real fighters' p98 (docs/qa/motion_calibration.md §7;
        /// the gate holds the same, HumanMotionGateTests), less a little: on the chest (yaw), to one side (roll).</summary>
        private (float Yaw, float Roll) HeadLimits(string gate) => gate switch
        {
            "guard" or "ready" => (53f, 18f),
            "strike" or "hit" or "throw" => (54f, 20f),
            "aim" => (21f, 16f),
            "crouch" or "rise" => (88f, 34f),
            _ => (_gazeYaw0, _gazeRoll0),
        };

        private void OnAnimatorMove()
        {
            if (!Ready || _a == null) return;
            var s = CombatMotion.State(Current);
            if (s == null || _fullW < 0.5f || Moving) return;
            var clip = CombatMotion.Clip(s.ClipFor(Female));
            if (clip == null || clip.XZ != RootXZ.Apply) return;
            var d = _a.deltaPosition; d.y = 0f;
            if (d.sqrMagnitude > 0f)
            {
                if (_agent != null && _agent.enabled && _agent.isOnNavMesh) _agent.Move(d);
                else if (Body != null) Body.position += d;
            }
            if (clip.Turn && Body != null)
            {
                var yaw = _a.deltaRotation.eulerAngles.y;
                if (yaw > 180f) yaw -= 360f;
                Body.rotation = Quaternion.AngleAxis(yaw, Vector3.up) * Body.rotation;
            }
        }

        private void LateUpdate()
        {
            OffError = -1f; MainError = -1f;
            if (!Ready || _a == null || !_a.enabled) return;
            var dt = Time.deltaTime;
            var info = _a.IsInTransition(_full) ? _a.GetNextAnimatorStateInfo(_full) : _a.GetCurrentAnimatorStateInfo(_full);
            if (_fullWant > 0.5f && Names.TryGetValue(info.shortNameHash, out var now)) Current = now;
            if (_armsWant > 0.5f)
            {
                var ai = _a.IsInTransition(_armsLayer) ? _a.GetNextAnimatorStateInfo(_armsLayer) : _a.GetCurrentAnimatorStateInfo(_armsLayer);
                if (Names.TryGetValue(ai.shortNameHash, out var carry)) Carrying = carry;
            }
            if (_pausedPlant && _fullW > 0.01f) Feet(Smooth(_fullW), dt);
            LearnFacing();
            Springs(dt);
            Hands(dt);
        }

        // ------------------------------------------------------------------------------------------- the feet

        private float GroundAt(Vector3 at, float fallback)
        {
            if (Physics.Raycast(at + Vector3.up * 0.6f, Vector3.down, out var hit, 1.4f, Physics.DefaultRaycastLayers, QueryTriggerInteraction.Ignore)
                && (Body == null || !hit.transform.IsChildOf(Body)))
                return hit.point.y;
            return fallback;
        }

        /// <summary>The fight's stance on the ground: each foot at the clip's own height over the ground under it (the hips
        /// lowered when one must go down), a foot that is down and still held where it was put down until the clip lifts it
        /// (a crossfade between two stances does not slide it), the feet's own turn kept.</summary>
        private void Feet(float w, float dt)
        {
            if (_footL == null || _footR == null || _hips == null || Body == null) return;
            var root = Body.position.y;
            var aL = _footL.position; var aR = _footR.position;
            var gL = GroundAt(aL, root); var gR = GroundAt(aR, root);
            var wantL = new Vector3(aL.x, gL + (aL.y - root), aL.z);
            var wantR = new Vector3(aR.x, gR + (aR.y - root), aR.z);
            Hold(ref _fl, aL, aL.y - root - _ankleL, dt, ref wantL);
            Hold(ref _fr, aR, aR.y - root - _ankleR, dt, ref wantR);
            var dy = Mathf.Clamp(Mathf.Min(0f, Mathf.Min(wantL.y - aL.y, wantR.y - aR.y)), -0.3f, 0f) * w;
            if (dy < 0f) _hips.position += Vector3.up * dy;
            var rotL = _footL.rotation; var rotR = _footR.rotation;
            TwoBone.Solve(_upL, _loL, _footL, wantL, w, _loL.position + Front * 0.3f);
            TwoBone.Solve(_upR, _loR, _footR, wantR, w, _loR.position + Front * 0.3f);
            _footL.rotation = rotL; _footR.rotation = rotR;
        }

        private void Hold(ref Foot f, Vector3 clip, float lift, float dt, ref Vector3 want)
        {
            var speed = f.HaveWas && dt > 0f ? new Vector2(clip.x - f.Was.x, clip.z - f.Was.z).magnitude / dt : 0f;
            f.Was = clip; f.HaveWas = true;
            if (!f.Locked && lift < 0.03f && speed < 0.25f) { f.Locked = true; f.At = new Vector3(clip.x, 0f, clip.z); }
            if (f.Locked)
            {
                var off = new Vector2(clip.x - f.At.x, clip.z - f.At.z).magnitude;
                if (lift > 0.045f || off > 0.14f || _turning) f.Locked = false;
            }
            f.W = Mathf.MoveTowards(f.W, f.Locked ? 1f : 0f, dt / 0.12f);
            if (f.W > 0f) { want.x = Mathf.Lerp(want.x, f.At.x, f.W); want.z = Mathf.Lerp(want.z, f.At.z, f.W); }
            if (!f.Locked && f.W <= 0f) f.At = new Vector3(clip.x, 0f, clip.z);
        }

        // ------------------------------------------------------------------------------------------- springs

        private void Springs(float dt)
        {
            if (dt <= 0f) return;
            // the hit: a damped spring back to the pose
            _hitV += (-HitOmega * HitOmega * _hitA - 2f * HitDamp * HitOmega * _hitV) * dt;
            _hitA += _hitV * dt;
            _kickV += (-KickOmega * KickOmega * _kick - 2f * KickDamp * KickOmega * _kickV) * dt;
            _kick += _kickV * dt;
            if (_hitA.sqrMagnitude < 1e-4f && _hitV.sqrMagnitude < 1e-3f) { _hitA = _hitV = Vector3.zero; return; }
            var fwd = Front; var right = RightAx;
            Quaternion Turn(float k) =>
                // (+x leans back: a positive turn about the right axis tips the top forward in Unity's frame)
                Quaternion.AngleAxis(-_hitA.x * k, right) * Quaternion.AngleAxis(_hitA.y * k, Vector3.up) * Quaternion.AngleAxis(_hitA.z * k, fwd);
            if (_spine != null) _spine.rotation = Turn(_hitSpine * 0.5f) * _spine.rotation;
            if (_chest != null && _chest != _spine) _chest.rotation = Turn(_hitChest * 0.5f) * _chest.rotation;
            if (_head != null) _head.rotation = Turn(_hitHead * 0.6f) * _head.rotation;
        }

        // ------------------------------------------------------------------------------------------- the hands

        private void Hands(float dt)
        {
            var full = CombatMotion.State(Current);
            var carry = CombatMotion.State(Carrying);
            float Want(HandsIk mode) =>
                Mathf.Max(full != null && full.Hands == mode ? Smooth(_fullW) : 0f, carry != null && carry.Hands == mode ? Smooth(_armsW) : 0f);
            var weapon = InHand && _weapon != null && _w != null;
            var step = dt / 0.15f;
            _offW = Mathf.MoveTowards(_offW, weapon && (_w.HasOff || Held.Arms == Arms.Pistol) ? Mathf.Max(Want(HandsIk.OffHand), 0f) : 0f, step);
            _pistolW = Mathf.MoveTowards(_pistolW, weapon && _haveAim ? Want(HandsIk.PistolAim) : 0f, step);
            _arcW = Mathf.MoveTowards(_arcW, weapon && Current == "melee_slash" ? Smooth(_fullW) : 0f, step);
            _fixW = Mathf.MoveTowards(_fixW, weapon && _haveAim && Held.Arms == Arms.Rifle && full != null && full.Gate == "aim" ? Smooth(_fullW) : 0f, step);
            var fists = full != null && (full.Gate == "guard" || full.Gate == "strike") && !weapon ? Smooth(_fullW) : 0f;
            _fistW = Mathf.MoveTowards(_fistW, fists, step);
            if (_pistolW > 0f) PistolAim(_pistolW);
            if (_arcW > 0f) Arc(_arcW, full);
            if (_fixW > 0f) AimFix(_fixW);
            if (_offW > 0f && _pistolW < 0.99f) OffHand(_offW * (1f - _pistolW));
            // the fingers round what they hold
            var grip = Mathf.Max(Smooth(_fullW), Smooth(_armsW));
            if (weapon) _right.Close(CombatMotion.MainGrip(Held.Model), grip);
            else if (_thrown != null) _right.Close(CombatMotion.HammerGrip, 1f);
            if (_offW > 0f || _pistolW > 0f) _left.Close(CombatMotion.OffGrip(Held.Model), Mathf.Max(_offW, _pistolW));
            if (_fistW > 0f) { _right.Close(CombatMotion.Fist, _fistW); _left.Close(CombatMotion.Fist, _fistW); }
            // what the tests and the gate read: the main grip on the palm, the off hand on its grip
            if (weapon)
            {
                MainError = (_weapon.transform.position - _right.CentreNow).magnitude;
                if (_offW > 0.98f || _pistolW > 0.98f) OffError = (OffPoint() - _left.CentreNow).magnitude;
            }
        }

        /// <summary>Where the off hand's palm goes on the weapon now (its grip_off; a pistol's support beside the grip).</summary>
        public Vector3 OffPoint()
        {
            if (_weapon == null || _w == null) return Vector3.zero;
            var t = _weapon.transform;
            var local = _w.HasOff ? _w.GripOff : Hand.V(CombatMotion.PistolSupportAt);
            return t.position + t.rotation * local;
        }

        private void OffHand(float w)
        {
            var t = _weapon.transform;
            var palm = Hand.PalmOn(t.rotation, CombatMotion.OffGrip(Held.Model));
            _left.Reach_(OffPoint(), palm, w);
        }

        /// <summary>The pistol's aim: both hands on the line from the eyes to the target at the arms' reach, the support hand
        /// wrapping the grip; the recoil flips the muzzle up and back.</summary>
        private void PistolAim(float w)
        {
            if (_head == null) return;
            var eye = _head.position + Vector3.up * 0.07f * (_hipHeight / 0.935f) + Front * 0.08f;
            var dir = (_aimAt - eye); if (dir.sqrMagnitude < 1e-4f) dir = Front; dir.Normalize();
            var up = Vector3.ProjectOnPlane(Vector3.up, dir).normalized;
            var shoulders = (_right.Upper.position + _left.Upper.position) * 0.5f;
            var reach = 0.9f * Mathf.Min(_right.Reach, _left.Reach);
            var d = 0.45f;
            for (var i = 0; i < 4; i++)
            {
                var g0 = eye + dir * d - up * 0.075f;
                d = Mathf.Clamp(d + (reach - (g0 - shoulders).magnitude), 0.2f, 0.9f);
            }
            var weapon = Quaternion.LookRotation(dir, up);
            weapon = Quaternion.AngleAxis(-_kick, weapon * Vector3.right) * weapon;
            var grip = eye + dir * (d - _kick * 0.004f) - up * 0.075f;
            var right = RightAx;
            _right.Reach_(grip, Hand.PalmOn(weapon, CombatMotion.MainGrip(Held.Model)), w, _right.Lower.position - up * 0.25f + right * 0.15f);
            var support = grip + weapon * Hand.V(CombatMotion.PistolSupportAt);
            _left.Reach_(support, Hand.PalmOn(weapon, CombatMotion.OffGrip(Held.Model)), w, _left.Lower.position - up * 0.25f - right * 0.15f);
        }

        /// <summary>A one-handed slash on a captured hook's body: the weapon hand drawn along an arc from high on the right,
        /// across the front at the blow's moment, down to the left; the blade leading with its edge.</summary>
        private void Arc(float w, MotionState s)
        {
            if (s == null || Set == null) return;
            var u = Progress(s.Name);
            if (u < 0f) return;
            var impact = Set.Beat(s.Name, Female, "impact");
            if (impact < 0f) impact = 0.4f;
            const float span = 0.22f, front = 100f / 175f;
            var p = (u - (impact - front * span)) / span;
            var ramp = p < 0f ? Mathf.Clamp01(1f + p / 0.6f) : p > 1f ? Mathf.Clamp01(1f - (p - 1f) / 0.6f) : 1f;
            if (ramp <= 0f) return;
            var theta = Mathf.Lerp(100f, -75f, Mathf.Clamp01(p)) * Mathf.Deg2Rad;
            var fwd = Front; var right = RightAx;
            var dir = fwd * Mathf.Cos(theta) + right * Mathf.Sin(theta);
            var reach = 0.85f * _right.Reach;
            var at = _right.Upper.position + dir * reach + Vector3.up * ((0.12f - 0.32f * Mathf.Clamp01(p)) * reach);
            var blade = (dir + Vector3.up * 0.35f).normalized;
            var tangent = fwd * Mathf.Sin(theta) - right * Mathf.Cos(theta);
            var spine = Vector3.ProjectOnPlane(-tangent, blade);
            if (spine.sqrMagnitude < 1e-4f) spine = Vector3.up;
            var weapon = Quaternion.LookRotation(blade, spine.normalized);
            _right.Reach_(at, Hand.PalmOn(weapon, CombatMotion.MainGrip(Held.Model)), w * Smooth(ramp));
        }

        /// <summary>A long gun's muzzle onto the target by the wrist (the captured hands mimed a gun: at most 12°).</summary>
        private void AimFix(float w)
        {
            if (_w == null || !_w.HasMuzzle) return;
            var t = _weapon.transform;
            var muzzle = t.position + t.rotation * _w.Muzzle;
            var want = _aimAt - muzzle;
            if (want.sqrMagnitude < 0.25f) return;
            var turn = Quaternion.FromToRotation(t.forward, want.normalized);
            turn.ToAngleAxis(out var angle, out var axis);
            if (angle > 180f) angle -= 360f;
            angle = Mathf.Clamp(angle, -12f, 12f) * w;
            var pivot = _right.CentreNow;
            var bone = _right.Bone;
            var r = Quaternion.AngleAxis(angle, axis);
            bone.rotation = r * bone.rotation;
            bone.position = pivot + r * (bone.position - pivot);
        }

        // ------------------------------------------------------------------------------------------- the end

        /// <summary>Out of the fight: the layers fade, the weapon goes to its holster halfway, the people's own systems as
        /// they were.</summary>
        public void End(float fade = 0.5f)
        {
            Release(fade);
            ClearAim();
            if (_hasSneak && _a != null) _a.SetBool(SneakId, false);
            StartCoroutine(SheatheLater(fade * 0.5f));
        }

        private IEnumerator SheatheLater(float after)
        {
            var t = 0f;
            while (t < after) { t += Time.deltaTime; yield return null; }
            if (_fullWant < 0.5f) Sheathe();
        }

        private void OnDisable()
        {
            if (_pausedPlant && _plant != null) { _plant.enabled = _plantWasOn; _pausedPlant = false; }
            if (_pausedAmbient && _ambient != null) { _ambient.enabled = _ambientWasOn; _pausedAmbient = false; }
            if (_clear != null) _clear.Holding = false;
            if (_gaze != null) { _gaze.MaxNeckYaw = _gazeYaw0; _gaze.MaxRoll = _gazeRoll0; }
        }

        private void OnDestroy()
        {
            if (_weapon != null) Destroy(_weapon);
            if (_dropped != null) Destroy(_dropped);
            if (_thrown != null) Destroy(_thrown);
        }
    }
}
