using System;
using System.Collections.Generic;
using SecondFace.Core.Inventory;

namespace SecondFace.Core.Combat
{
    /// <summary>What a fighter holds, as the animation sees it (COMBAT.md A1): the grip, the states and the holster.</summary>
    public enum Arms
    {
        /// <summary>Fists (and bolt knuckles): the guard, jabs, crosses, hooks and uppercuts.</summary>
        Unarmed = 0,
        /// <summary>A pistol or revolver: one hand at rest, both on the grip to aim (IK on a captured long-gun stance).</summary>
        Pistol = 1,
        /// <summary>A long gun (rifle, carbine, shotgun, sub-gun): the main hand on the grip, the off hand on its fore-end.</summary>
        Rifle = 2,
        /// <summary>A one-handed blade or club (knife, machete, crowbar, hatchet, wrench).</summary>
        Melee = 3,
        /// <summary>A two-handed club (bat, sledge; the spear's stand-in).</summary>
        Club2 = 4,
        /// <summary>Something thrown (a grenade, a fire bottle, a spike) as the active weapon.</summary>
        Thrown = 5,
    }

    /// <summary>How the hands are placed in a state (COMBAT.md A1, A3, A4; README v3 §2).</summary>
    public enum HandsIk
    {
        /// <summary>The clip's own hands (the weapon rides the main hand); the off hand is the clip's.</summary>
        Clip = 0,
        /// <summary>The clip's main hand; the off hand held on the weapon's <c>grip_off</c> by IK (the fix for the captured
        /// long-gun and club takes whose mimed hands drift apart: clip QA's two-hand check).</summary>
        OffHand = 1,
        /// <summary>Both hands by IK on the line from the eyes to the target (the pistol's aim, on a captured long-gun
        /// stance: README v3 §2).</summary>
        PistolAim = 2,
        /// <summary>The weapon hand by IK along a swing's arc, on a captured hook's body (one-handed slashes: README v3 §2).</summary>
        Arc = 3,
        /// <summary>No weapon in the hands (a reload's off hand at the magazine, a throw's empty off hand, hands up).</summary>
        Free = 4,
    }

    /// <summary>A clip's root (COMBAT_ASSETS doubt 4; the travel table of combat v2's README §2).</summary>
    public enum RootXZ
    {
        /// <summary>Its travel baked into the pose (it plays in place; the body is where the rules put it).</summary>
        Bake = 0,
        /// <summary>Its travel applied to the body (a get-up rises where it rises; a stumble stumbles; a step-in steps).</summary>
        Apply = 1,
    }

    /// <summary>How a clip's height is kept.</summary>
    public enum RootY
    {
        /// <summary>From the feet (a standing clip: the soles on the root's ground).</summary>
        Feet = 0,
        /// <summary>As captured (a crouch, a get-up, a fall: the hips' height above the floor the capture had).</summary>
        Keep = 1,
    }

    /// <summary>One clip of the combat set as the importer and the controller treat it.</summary>
    public sealed class MotionClip
    {
        public string Name;
        public RootXZ XZ;
        public RootY Y;
        /// <summary>Its root's turn applied too (a get-up turns as it rises); otherwise taken out of the pose.</summary>
        public bool Turn;
        /// <summary>Played on women (f), men (m) or both, by its capture's own label (combat v2 README §3).</summary>
        public string Set = "both";
    }

    /// <summary>One state of the fight's Animator layers (built by Editor/Build/CombatAnimatorBuild.cs, played by name by
    /// Game/Fighting/Fighter.cs).</summary>
    public sealed class MotionState
    {
        public string Name;
        public string Layer = CombatMotion.FullLayer;
        /// <summary>Men's (and everyone's, when <see cref="ClipF"/> is null) clip.</summary>
        public string Clip;
        /// <summary>Women's take (null: the same as the men's).</summary>
        public string ClipF;
        public bool Loop;
        /// <summary>The state's own speed (a long capture played quicker; 0 holds its first frame).</summary>
        public float Speed = 1f;
        /// <summary>Where it is entered (normalized time; a raise played from its second half).</summary>
        public float From;
        /// <summary>Where the fight leaves it, crossfading on (normalized; 1: its end). A long cover transition is cut at its
        /// first full stride.</summary>
        public float Cut = 1f;
        /// <summary>Where it goes at its end: <see cref="CombatMotion.ToIdle"/> (the weapon's idle, or its crouch when
        /// crouched), <see cref="CombatMotion.ToCover"/> (the weapon's crouch), or a state's name; null: it holds (a loop).</summary>
        public string Then;
        /// <summary>The crossfade into it (s).</summary>
        public float Fade = 0.2f;
        public HandsIk Hands = HandsIk.Clip;
        /// <summary>The motion gate's set it is measured under (docs/PEOPLE_MOTION.md §2.7): guard, strike, aim, aim_pistol,
        /// crouch, reload, yield, hit, throw, rise, carry.</summary>
        public string Gate;
        /// <summary>Played only on men ("m": blows and slips captured from a man only, never picked for a woman) or women
        /// ("f"); null: everyone.</summary>
        public string Only;
        /// <summary>The clip for a body (women's take when there is one).</summary>
        public string ClipFor(bool female) => female && ClipF != null ? ClipF : Clip;
    }

    /// <summary>
    /// The fight's motion (COMBAT.md A1–A8) as data, one source for the editor's build of the Animator layers, the importer's
    /// clip settings and the game's fighters: which captured clip plays in which state, for whom (women's takes where the
    /// combat set has them: combat v2 README §3), with what root motion (the travel table), where each state goes when it
    /// ends (no state is left hanging), how the hands hold each weapon, and which model each weapon of the content is held
    /// as. Clips are the staged combat set v3's (MANIFEST.json: `use`, `use_with_ik`, flagged stopgaps where nothing was
    /// captured); the states with no capture follow its README §2 (a procedural directional hit, a pistol aim by IK on a
    /// captured stance, slashes on the captured hooks' body, a ragdoll fall then the captured get-up for its side, the
    /// crouched walk as the locomotion's captured sneak).
    /// </summary>
    public static class CombatMotion
    {
        /// <summary>Bump when the states or their clips change: the editor rebuilds the layers (the controller carries
        /// "combat_v&lt;Version&gt;").</summary>
        public const int Version = 1;
        public const string FullLayer = "Combat", ArmsLayer = "CombatArms";
        public const string ArmsParam = "CombatArms", CrouchParam = "CombatCrouch", RateParam = "CombatRate", SexParam = "Sex";
        public const string None = "none";
        public const string ToIdle = "@idle", ToCover = "@cover";
        public const string Folder = "Assets/SecondFace/Combat/Motion";
        public const string WeaponFolder = "Assets/SecondFace/Combat/Weapons";

        // ------------------------------------------------------------------------------------------------- the clips

        /// <summary>Every clip the states use, with its root motion (combat v2 README §2's travel table: a one-shot over 15
        /// cm is applied or cut; the rest play in place).</summary>
        public static readonly MotionClip[] Clips =
        {
            // guards and idles
            C("fist_guard_accad", set: "m"), C("ready_crouch_cmu", y: RootY.Keep), C("pistol_idle_ual"), C("rifle_idle_ual"),
            C("melee_idle_ual"),
            // strikes, unarmed (men: ACCAD Male2; women: CMU 113, 141, 144)
            C("fist_jab_accad", set: "m"), C("fist_cross_accad", set: "m"), C("fist_hook_l_accad", set: "m"), C("fist_hook_r_accad", set: "m"),
            C("fist_uppercut_l_accad", set: "m"), C("fist_uppercut_r_accad", set: "m"),
            C("fist_jab_f_cmu", set: "f"), C("fist_cross_f_cmu", RootXZ.Apply, set: "f"), C("fist_combo_f_cmu", set: "f"),
            C("fist_ready_accad", RootXZ.Apply, set: "m"), C("fist_relax_accad", set: "m"),
            C("block_high_accad", set: "m"), C("block_high_f_cmu", set: "f"),
            // melee
            C("melee_strike_ual"), C("melee_block_ual"), C("club_overhead_cmu"), C("club_overhead_b_cmu"),
            // the long gun and the pistol
            C("rifle_raise_cmu"), C("rifle_aim_b_cmu"), C("rifle_aim_cmu"), C("rifle_fire_cmu"), C("rifle_burst_cmu"), C("rifle_lower_cmu"),
            C("rifle_reload_ual"), C("pistol_reload_ual"),
            // cover (the leaving clips run 2-7 m: applied, and cut at their first stride)
            C("crouch_down_accad", RootXZ.Apply, RootY.Keep, set: "m"), C("crouch_down_f_accad", RootXZ.Apply, RootY.Keep, set: "f"),
            C("crouch_rifle_ual", y: RootY.Keep), C("crouch_idle_ual", y: RootY.Keep),
            C("crouch_to_run_accad", RootXZ.Apply, RootY.Keep, set: "m"), C("crouch_to_run_f_accad", RootXZ.Apply, RootY.Keep, set: "f"),
            // hits and misses
            C("stagger_cmu", RootXZ.Apply, RootY.Keep, set: "f"), C("stagger_fwd_cmu", RootXZ.Apply, RootY.Keep), C("hit_chest_ual"), C("hit_head_ual"),
            C("dodge_l_accad", set: "m"), C("dodge_r_accad", set: "m"), C("duck_cmu", y: RootY.Keep),
            // throws
            C("throw_overhand_ual", set: "m"), C("throw_overhand_cmu", RootXZ.Apply, set: "f"),
            // get up (the ragdoll lays the body down; the captured get-up for the side it lies on)
            C("getup_back_cmu", RootXZ.Apply, RootY.Keep, turn: true), C("getup_front_cmu", RootXZ.Apply, RootY.Keep, turn: true),
            C("getup_side_cmu", RootXZ.Apply, RootY.Keep, turn: true), C("getup_f_cmu", RootXZ.Apply, RootY.Keep, turn: true, set: "f"),
            C("getup_to_crouch_accad", RootXZ.Apply, RootY.Keep, turn: true, set: "m"), C("getup_to_crouch_f_accad", RootXZ.Apply, RootY.Keep, turn: true, set: "f"),
            // surrender
            C("surrender_enter_ual"), C("surrender_idle_ual"),
        };

        /// <summary>The clips staged but not played by any state (kept for later passes; imported with the same rules):
        /// the hand-keyed alternatives the captured clips replace, and the cover transitions that run in from a jog.</summary>
        public static readonly MotionClip[] Spare =
        {
            C("crouch_to_walk_accad", RootXZ.Apply, RootY.Keep, set: "m"), C("crouch_to_walk_f_accad", RootXZ.Apply, RootY.Keep, set: "f"),
            C("run_to_crouch_accad", RootXZ.Apply, RootY.Keep, set: "m"), C("run_to_crouch_f_accad", RootXZ.Apply, RootY.Keep, set: "f"),
            C("walk_to_crouch_f_accad", RootXZ.Apply, RootY.Keep, set: "f"), C("cower_cmu", RootXZ.Apply, RootY.Keep, set: "f"),
            C("duck_accad", RootXZ.Apply, RootY.Keep, set: "m"), C("death_ual", RootXZ.Apply, RootY.Keep), C("crouch_walk_ual", y: RootY.Keep),
            C("fist_ready_ual"), C("hit_knockback_ual"), C("hit_knockback_rm_ual", RootXZ.Apply), C("melee_combo_ual", RootXZ.Apply),
            C("melee_slash_a_ual", RootXZ.Apply), C("melee_slash_b_ual", RootXZ.Apply), C("melee_slash_c_ual", RootXZ.Apply),
            C("pistol_aim_ual"), C("pistol_aim_up_ual"), C("pistol_aim_down_ual"), C("pistol_fire_ual"),
        };

        private static MotionClip C(string name, RootXZ xz = RootXZ.Bake, RootY y = RootY.Feet, bool turn = false, string set = "both") =>
            new() { Name = name, XZ = xz, Y = y, Turn = turn, Set = set };

        private static Dictionary<string, MotionClip> _clipIndex;
        /// <summary>A clip by name (states' and spares'; null: not in the set).</summary>
        public static MotionClip Clip(string name)
        {
            if (_clipIndex == null)
            {
                var d = new Dictionary<string, MotionClip>();
                foreach (var c in Clips) d[c.Name] = c;
                foreach (var c in Spare) d[c.Name] = c;
                _clipIndex = d;
            }
            return name != null && _clipIndex.TryGetValue(name, out var m) ? m : null;
        }

        // ------------------------------------------------------------------------------------------------ the states

        public static readonly MotionState[] States = BuildStates();

        private static MotionState[] BuildStates()
        {
            var l = new List<MotionState>();
            MotionState S(string name, string clip, string clipF = null, bool loop = false, string then = ToIdle, float speed = 1f,
                          float from = 0f, float cut = 1f, float fade = 0.2f, HandsIk hands = HandsIk.Clip, string gate = null, string layer = FullLayer, string only = null)
            {
                var s = new MotionState { Name = name, Clip = clip, ClipF = clipF, Loop = loop, Then = loop ? null : then, Speed = speed, From = from, Cut = cut, Fade = fade, Hands = hands, Gate = gate, Layer = layer, Only = only };
                l.Add(s);
                return s;
            }
            // idles (the fight's ready stance, per weapon; the women's guard is a man's take until a woman's is captured)
            S("unarmed.idle", "fist_guard_accad", loop: true, fade: 0.35f, gate: "guard");
            S("pistol.idle", "pistol_idle_ual", loop: true, fade: 0.35f, gate: "ready");
            S("rifle.idle", "rifle_idle_ual", loop: true, fade: 0.35f, hands: HandsIk.OffHand, gate: "ready");
            S("melee.idle", "fist_guard_accad", loop: true, fade: 0.35f, gate: "guard");
            S("club2.idle", "rifle_idle_ual", loop: true, fade: 0.35f, hands: HandsIk.OffHand, gate: "ready");
            // the long gun: up to the shoulder, the hold, single and burst, down; the reload
            S("rifle.raise", "rifle_raise_cmu", then: "rifle.aim", from: 0.42f, speed: 1.5f, cut: 0.95f, fade: 0.15f, hands: HandsIk.OffHand, gate: "aim");
            S("rifle.aim", "rifle_aim_b_cmu", loop: true, fade: 0.2f, hands: HandsIk.OffHand, gate: "aim");
            S("rifle.fire", "rifle_fire_cmu", then: "rifle.aim", cut: 0.9f, fade: 0.1f, hands: HandsIk.OffHand, gate: "aim");
            S("rifle.burst", "rifle_burst_cmu", then: "rifle.aim", cut: 0.9f, fade: 0.1f, hands: HandsIk.OffHand, gate: "aim");
            S("rifle.lower", "rifle_lower_cmu", then: ToIdle, speed: 1.5f, cut: 0.85f, fade: 0.15f, hands: HandsIk.OffHand, gate: "aim");
            S("rifle.reload", "rifle_reload_ual", then: ToIdle, cut: 0.95f, fade: 0.2f, hands: HandsIk.Free, gate: "reload");
            // the pistol: its aim on rifle_aim_b's captured legs and torso, both hands by IK (the shot is a recoil on it)
            S("pistol.aim", "rifle_aim_b_cmu", loop: true, fade: 0.25f, hands: HandsIk.PistolAim, gate: "aim_pistol");
            S("pistol.reload", "pistol_reload_ual", then: ToIdle, cut: 0.95f, fade: 0.2f, hands: HandsIk.Free, gate: "reload");
            // unarmed blows (men's and women's takes are different blows: picked by sex, see Strikes)
            S("unarmed.jab", "fist_jab_accad", "fist_jab_f_cmu", fade: 0.12f, cut: 0.9f, gate: "strike");
            S("unarmed.cross", "fist_cross_accad", "fist_cross_f_cmu", fade: 0.12f, cut: 0.9f, gate: "strike");
            S("unarmed.hook_l", "fist_hook_l_accad", fade: 0.12f, cut: 0.9f, gate: "strike", only: "m");
            S("unarmed.hook_r", "fist_hook_r_accad", fade: 0.12f, cut: 0.9f, gate: "strike", only: "m");
            S("unarmed.uppercut_l", "fist_uppercut_l_accad", fade: 0.12f, cut: 0.9f, gate: "strike", only: "m");
            S("unarmed.uppercut_r", "fist_uppercut_r_accad", fade: 0.12f, cut: 0.9f, gate: "strike", only: "m");
            S("unarmed.combo", "fist_combo_f_cmu", fade: 0.12f, cut: 0.92f, gate: "strike", only: "f");
            S("unarmed.block", "block_high_accad", "block_high_f_cmu", fade: 0.08f, cut: 0.9f, gate: "strike");
            S("unarmed.relax", "fist_relax_accad", then: None, cut: 0.8f, fade: 0.2f, gate: "guard", only: "m");
            // one-handed melee: the strike (hand-keyed, passes), and the slash on the captured right hook's body, the weapon
            // hand along an arc
            S("melee.strike", "melee_strike_ual", fade: 0.12f, cut: 0.92f, gate: "strike");
            S("melee.slash", "fist_hook_r_accad", fade: 0.12f, cut: 0.9f, hands: HandsIk.Arc, gate: "strike");
            S("melee.block", "melee_block_ual", fade: 0.08f, cut: 0.9f, gate: "strike");
            // two-handed club (captured; the off hand on the handle by IK)
            S("club2.strike", "club_overhead_cmu", fade: 0.15f, cut: 0.9f, hands: HandsIk.OffHand, gate: "strike");
            S("club2.strike_b", "club_overhead_b_cmu", fade: 0.15f, cut: 0.9f, hands: HandsIk.OffHand, gate: "strike");
            // throws (the woman's captured; the man's a flagged hand-keyed stopgap: no man's throw is captured)
            S("throw", "throw_overhand_ual", "throw_overhand_cmu", fade: 0.15f, cut: 0.9f, hands: HandsIk.Free, gate: "throw");
            // cover: down into a crouch, held (two hands on a long gun or a club; a wary crouch otherwise), up and away (the
            // run out cut at its first stride, crossfading into the locomotion)
            S("cover.down", "crouch_down_accad", "crouch_down_f_accad", then: ToCover, cut: 0.92f, fade: 0.15f, gate: "crouch");
            S("cover.hold", "ready_crouch_cmu", loop: true, fade: 0.3f, gate: "crouch");
            S("cover.hold_long", "crouch_rifle_ual", loop: true, fade: 0.3f, hands: HandsIk.OffHand, gate: "crouch");
            S("cover.leave", "crouch_to_run_accad", "crouch_to_run_f_accad", then: ToIdle, cut: 0.3f, fade: 0.15f, gate: "crouch");
            // heavy hits (with the procedural directional hit on every hit): shoved from behind; from the front a woman's
            // captured stagger, a man's hand-keyed stopgaps (no man's stagger is captured)
            S("hit.shove", "stagger_fwd_cmu", cut: 0.33f, fade: 0.08f, gate: "hit");
            S("hit.front", "hit_chest_ual", "stagger_cmu", cut: 0.9f, fade: 0.06f, gate: "hit");
            S("hit.head", "hit_head_ual", "stagger_cmu", cut: 0.9f, fade: 0.06f, gate: "hit");
            // a blow that misses: slipped (men's captured dodges), or ducked (everyone's captured duck, cut when it is lowest:
            // its take then holds low for seconds)
            S("miss.left", "dodge_l_accad", cut: 0.85f, fade: 0.08f, gate: "hit", only: "m");
            S("miss.right", "dodge_r_accad", cut: 0.85f, fade: 0.08f, gate: "hit", only: "m");
            S("miss.duck", "duck_cmu", cut: 0.3f, fade: 0.08f, gate: "hit");
            // up from the ground (after the ragdoll): the captured get-up for the side the body lies on, quicker than captured
            S("rise.back", "getup_back_cmu", "getup_f_cmu", speed: 1.3f, cut: 0.96f, fade: 0.05f, gate: "rise");
            S("rise.front", "getup_front_cmu", speed: 1.3f, cut: 0.96f, fade: 0.05f, gate: "rise");
            S("rise.side", "getup_side_cmu", speed: 1.3f, cut: 0.96f, fade: 0.05f, gate: "rise");
            S("rise.crouch", "getup_to_crouch_accad", "getup_to_crouch_f_accad", then: ToCover, speed: 1.2f, cut: 0.95f, fade: 0.05f, gate: "rise");
            // prone: the face-down get-up's first frame held (no prone clip is captured)
            S("prone", "getup_front_cmu", then: null, speed: 0f, fade: 0.6f, gate: "rise");
            // hands up
            S("yield.enter", "surrender_enter_ual", then: "yield.hold", cut: 0.95f, fade: 0.15f, hands: HandsIk.Free, gate: "yield");
            S("yield.hold", "surrender_idle_ual", loop: true, fade: 0.2f, hands: HandsIk.Free, gate: "yield");
            // the weapon carried while walking or jogging (arms only, over the locomotion's legs)
            S("carry.pistol", "pistol_idle_ual", loop: true, fade: 0.25f, gate: "carry", layer: ArmsLayer);
            S("carry.long", "rifle_idle_ual", loop: true, fade: 0.25f, hands: HandsIk.OffHand, gate: "carry", layer: ArmsLayer);
            return l.ToArray();
        }

        private static Dictionary<string, MotionState> _stateIndex;
        /// <summary>A state by name (null: none).</summary>
        public static MotionState State(string name)
        {
            if (_stateIndex == null)
            {
                var d = new Dictionary<string, MotionState>();
                foreach (var s in States) d[s.Name] = s;
                _stateIndex = d;
            }
            return name != null && _stateIndex.TryGetValue(name, out var m) ? m : null;
        }

        // --------------------------------------------------------------------------------- choosing a state for a beat

        public static string Idle(Arms a) => a switch
        {
            Arms.Pistol => "pistol.idle",
            Arms.Rifle => "rifle.idle",
            Arms.Melee => "melee.idle",
            Arms.Club2 => "club2.idle",
            _ => "unarmed.idle",
        };

        /// <summary>The crouch held behind cover (two hands on a long gun or a two-handed club).</summary>
        public static string Cover(Arms a) => a == Arms.Rifle || a == Arms.Club2 ? "cover.hold_long" : "cover.hold";

        /// <summary>The aim hold (null: a melee weapon or fists: the guard is the aim).</summary>
        public static string Aim(Arms a) => a == Arms.Rifle ? "rifle.aim" : a == Arms.Pistol ? "pistol.aim" : null;

        /// <summary>The weapon carried while moving (null: the arms swing with the walk).</summary>
        public static string Carry(Arms a) => a switch
        {
            Arms.Pistol => "carry.pistol",
            Arms.Rifle or Arms.Club2 => "carry.long",
            _ => null,
        };

        public static string Reload(Arms a) => a == Arms.Rifle ? "rifle.reload" : a == Arms.Pistol ? "pistol.reload" : null;

        private static readonly string[] MenBlows = { "unarmed.jab", "unarmed.cross", "unarmed.hook_r", "unarmed.hook_l", "unarmed.uppercut_r", "unarmed.uppercut_l" };
        /// <summary>The women's single blows (the combination is three blows: it is not a single attack's).</summary>
        private static readonly string[] WomenBlows = { "unarmed.jab", "unarmed.cross" };

        /// <summary>The blow for an attack (<paramref name="n"/>: the fighter's count of blows so far, so they vary).</summary>
        public static string Strike(Arms a, bool female, int n)
        {
            n = Math.Abs(n);
            switch (a)
            {
                // (the slash's body is a man's captured hook on everyone, flagged: no woman's hook is captured)
                case Arms.Melee: return n % 3 == 2 ? "melee.strike" : "melee.slash";
                case Arms.Club2: return n % 2 == 0 ? "club2.strike" : "club2.strike_b";
                default:
                    var pool = female ? WomenBlows : MenBlows;
                    return pool[n % pool.Length];
            }
        }

        /// <summary>A blow that missed this fighter: a block for fists and one-handed weapons every other time, else a slip to
        /// the side away from it (<paramref name="fromLeft"/>: it came from their left; men's captured dodges) or a duck
        /// (women: no woman's dodge is captured).</summary>
        public static string Miss(Arms a, bool female, bool fromLeft, int n)
        {
            if ((a == Arms.Unarmed || a == Arms.Melee) && n % 2 == 0) return a == Arms.Melee ? "melee.block" : "unarmed.block";
            if (female) return "miss.duck";
            return fromLeft ? "miss.right" : "miss.left";
        }

        /// <summary>A heavy hit's state (a crit): shoved from behind, else from the front by where it struck.</summary>
        public static string Heavy(bool fromBehind, string zone) => fromBehind ? "hit.shove" : zone == "head" || zone == "eyes" ? "hit.head" : "hit.front";

        /// <summary>The get-up for the side the body lies on (the chest's front against up: 1 face up, -1 face down).</summary>
        public static string Rise(double frontUp, bool toCrouch)
        {
            if (toCrouch) return "rise.crouch";
            if (frontUp > 0.45) return "rise.back";
            if (frontUp < -0.45) return "rise.front";
            return "rise.side";
        }

        /// <summary>Where a state goes when it ends, for a weapon and a stance (null: it holds).</summary>
        public static string Next(MotionState s, Arms a, bool crouched)
        {
            if (s == null || s.Then == null) return null;
            if (s.Then == ToIdle) return crouched ? Cover(a) : Idle(a);
            if (s.Then == ToCover) return Cover(a);
            return s.Then;
        }

        /// <summary>The rate combat motion plays at for the fight's pace (COMBAT.md B9): the speed setting, held within what
        /// still reads as people (1.6×; 2.5× for the other side's turns when the show is skipped).</summary>
        public static float Rate(CombatPace pace, bool theirs)
        {
            var s = pace.Seconds(1f, theirs);
            var rate = s > 1e-4f ? 1f / s : 1f;
            var max = theirs && pace.Skip ? 2.5f : 1.6f;
            return Math.Max(1f, Math.Min(max, rate));
        }

        // ------------------------------------------------------------------------------------------- the weapons held

        /// <summary>A content weapon as a model: the staged model's name, its lore variant (1 or 2), how it is held, and
        /// whether the model stands in for one not staged yet.</summary>
        public readonly struct Held
        {
            public readonly string Model;
            public readonly int Variant;
            public readonly Arms Arms;
            public readonly bool StandIn;
            public Held(string model, int variant, Arms arms, bool standIn = false) { Model = model; Variant = variant; Arms = arms; StandIn = standIn; }
            public bool Shown => Model != null;
            public override string ToString() => Model == null ? Arms.ToString() : $"{Model} v{Variant} ({Arms}{(StandIn ? ", stand-in" : "")})";
        }

        /// <summary>The content's <c>held</c> key to the staged weapon models (weapons/ README; COMBAT_ASSETS). Stand-ins hold
        /// a model of the nearest kind until one is staged: the spear (a crowbar two-handed), the sledge (the bat), the
        /// sub-gun (the automatic rifle), the pump gun (the sawn-off), the zip and arc pistols (the pistol's second paint).</summary>
        public static readonly Dictionary<string, Held> HeldModels = new()
        {
            ["knife"] = new Held("knife", 1, Arms.Melee),
            ["machete"] = new Held("machete", 1, Arms.Melee),
            ["pipe"] = new Held("crowbar", 1, Arms.Melee),
            ["spear"] = new Held("crowbar", 2, Arms.Club2, true),
            ["sledge"] = new Held("bat", 2, Arms.Club2, true),
            ["knuckles"] = new Held(null, 0, Arms.Unarmed),
            ["pistol"] = new Held("pistol", 1, Arms.Pistol),
            ["zip"] = new Held("pistol", 2, Arms.Pistol, true),
            ["arc"] = new Held("pistol", 2, Arms.Pistol, true),
            ["revolver"] = new Held("revolver", 1, Arms.Pistol),
            ["rifle"] = new Held("rifle_bolt", 1, Arms.Rifle),
            ["carbine"] = new Held("rifle_auto", 1, Arms.Rifle),
            ["smg"] = new Held("rifle_auto", 2, Arms.Rifle, true),
            ["sawnoff"] = new Held("shotgun_sawn", 1, Arms.Rifle),
            ["shotgun"] = new Held("shotgun_sawn", 2, Arms.Rifle, true),
            ["can"] = new Held("grenade_stick", 2, Arms.Thrown),
            ["bottle"] = new Held("bottle", 1, Arms.Thrown),
            ["spike"] = new Held("knife", 2, Arms.Thrown, true),
        };

        /// <summary>Every staged weapon model (Combat/Weapons/&lt;name&gt;).</summary>
        public static readonly string[] Models = { "bat", "bottle", "crowbar", "grenade_stick", "hatchet", "knife", "machete", "pipe_wrench", "pistol", "revolver", "rifle_auto", "rifle_bolt", "shotgun_sawn" };

        /// <summary>How an item is held (its <c>held</c> key; else by its weapon's kind and hands, so a new item shows the
        /// nearest model); null item: fists. A second weapon of the same model in the same fight takes the other paint when
        /// <paramref name="who"/> differs (two raiders' pistols are not the same pistol).</summary>
        public static Held For(ItemDef item, string who = null)
        {
            var w = item?.Weapon;
            Held h;
            if (item == null || w == null) h = new Held(null, 0, w != null && w.Kind == "thrown" ? Arms.Thrown : Arms.Unarmed);
            else if (item.Held != null && HeldModels.TryGetValue(item.Held, out var known)) h = known;
            else h = ByKind(w);
            if (h.Model == null || who == null || h.StandIn) return h;
            // (the paint by who holds it: the same model looks its own in two hands)
            var variant = (Hash(who) & 1) == 0 ? h.Variant : 3 - h.Variant;
            return new Held(h.Model, variant, h.Arms, h.StandIn);
        }

        /// <summary>A weapon with no <c>held</c> key, by its kind.</summary>
        public static Held ByKind(WeaponDef w)
        {
            if (w == null) return new Held(null, 0, Arms.Unarmed);
            switch (w.Kind)
            {
                case "unarmed": return new Held(null, 0, Arms.Unarmed);
                case "pistol": case "arc": return new Held("pistol", 1, Arms.Pistol, w.Kind == "arc");
                case "rifle": case "smg": return new Held("rifle_auto", 1, Arms.Rifle, w.Kind == "smg");
                case "shotgun": return new Held("shotgun_sawn", 1, Arms.Rifle);
                case "thrown": return new Held(w.DmgType == "fire" ? "bottle" : "grenade_stick", 1, Arms.Thrown);
                default:
                    if (w.Hands >= 2) return new Held("bat", 1, Arms.Club2, true);
                    return w.DmgType == "blade" ? new Held("machete", 1, Arms.Melee) : new Held("crowbar", 1, Arms.Melee);
            }
        }

        /// <summary>The model a thrown item flies as (a grenade, a fire bottle, a spike).</summary>
        public static Held Thrown(ItemDef item)
        {
            if (item?.Held != null && HeldModels.TryGetValue(item.Held, out var h) && h.Arms == Arms.Thrown) return h;
            return new Held(item?.Weapon?.DmgType == "fire" ? "bottle" : "grenade_stick", 1, Arms.Thrown);
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

        // ------------------------------------------------------------------------------------------- holding a weapon

        /// <summary>A hand's hold: the palm's directions in the weapon's frame (Unity's: +Z along the barrel or blade, +Y its
        /// top or spine, +X right; origin the main grip), where its centre sits, and how the fingers close.</summary>
        public readonly struct Grip
        {
            /// <summary>Across the knuckles, from the little finger to the index, in the weapon's frame.</summary>
            public readonly (double X, double Y, double Z) Across;
            /// <summary>Out of the palm, in the weapon's frame.</summary>
            public readonly (double X, double Y, double Z) Palm;
            /// <summary>The finger joints' bend (knuckle, middle, tip), the index's own (on a trigger), the thumb's.</summary>
            public readonly double Knuckle, Middle, Tip, Index, Thumb;
            public Grip((double, double, double) across, (double, double, double) palm, double knuckle, double middle, double tip, double index, double thumb)
            { Across = across; Palm = palm; Knuckle = knuckle; Middle = middle; Tip = tip; Index = index; Thumb = thumb; }
        }

        /// <summary>A pistol grip (pistol, revolver, a long gun's grip): the barrel along the hand, the handle across the palm,
        /// the index along the trigger guard. Right hand: the palm faces left (-X), the index above the little finger (+Y).</summary>
        public static readonly Grip PistolGrip = new((0, 1, 0), (-1, 0, 0), 78, 88, 48, 40, 35);
        /// <summary>A hammer grip (blades, clubs, a bottle, a grenade): the shaft across the palm out past the index (+Z),
        /// the edge forward of the knuckles; right hand.</summary>
        public static readonly Grip HammerGrip = new((0, 0, 1), (-1, 0, 0), 80, 92, 52, 80, 40);
        /// <summary>The off hand under a long gun's fore-end: palm up, the index towards the muzzle (left hand).</summary>
        public static readonly Grip ForeEnd = new((0, 0, 1), (0, 1, 0), 62, 72, 40, 55, 25);
        /// <summary>The off hand on a two-handed club's handle above the main hand (left hand, a hammer grip).</summary>
        public static readonly Grip OffHammer = new((0, 0, 1), (1, 0, 0), 80, 92, 52, 80, 40);
        /// <summary>The off hand wrapping a pistol's grip from the left (palm to the grip, the index under the guard).</summary>
        public static readonly Grip PistolSupport = new((0, 1, 0), (1, 0, 0), 70, 78, 42, 70, 20);
        /// <summary>A fist (the guard, a blow).</summary>
        public static readonly Grip Fist = new((0, 1, 0), (-1, 0, 0), 92, 100, 70, 92, 50);

        /// <summary>The main hand's grip for a model.</summary>
        public static Grip MainGrip(string model) => model switch
        {
            "pistol" or "revolver" or "rifle_auto" or "rifle_bolt" or "shotgun_sawn" => PistolGrip,
            _ => HammerGrip,
        };

        /// <summary>The off hand's grip on a model's <c>grip_off</c> (the pistol has none: the support hand wraps the grip).</summary>
        public static Grip OffGrip(string model) => model switch
        {
            "rifle_auto" or "rifle_bolt" or "shotgun_sawn" => ForeEnd,
            "pistol" or "revolver" => PistolSupport,
            _ => OffHammer,
        };

        /// <summary>Where the support hand's palm sits on a pistol (no <c>grip_off</c> staged): against the grip's left side,
        /// a little below and behind the shooting hand's palm (m, weapon frame).</summary>
        public static readonly (double X, double Y, double Z) PistolSupportAt = (-0.032, -0.018, -0.012);

        /// <summary>Where a weapon rides out of the fight (A1: holstered or slung): the bone it hangs from and its place and
        /// lie in the body's frame (m at a 0.935 m hip height, scaled to the body; +X the body's right, +Y up, +Z its front):
        /// the weapon's +Z (barrel, blade) and +Y (top) directions.</summary>
        public readonly struct Holster
        {
            public readonly string Bone;
            public readonly (double X, double Y, double Z) At, Forward, Up;
            public readonly bool Hidden;
            public Holster(string bone, (double, double, double) at, (double, double, double) forward, (double, double, double) up, bool hidden = false)
            { Bone = bone; At = at; Forward = forward; Up = up; Hidden = hidden; }
        }

        public static Holster HolsterFor(Held h)
        {
            switch (h.Arms)
            {
                case Arms.Pistol:
                    // on the right thigh, muzzle down, the grip forward and up to the hand
                    return new Holster("RightUpperLeg", (0.115, -0.13, 0.0), (0, -1, 0.12), (0, 0.12, 1));
                case Arms.Rifle:
                    // slung across the back, muzzle up over the left shoulder
                    return new Holster("Chest", (0.0, 0.0, -0.17), (-0.42, 0.9, 0), (0, 0, -1));
                case Arms.Club2:
                    // across the back, the head up over the right shoulder
                    return new Holster("Chest", (0.0, -0.05, -0.16), (0.4, 0.9, 0), (0, 0, -1));
                case Arms.Melee:
                    // through the belt at the left hip, blade or head down and a little forward
                    return new Holster("Hips", (-0.17, -0.04, 0.03), (0.05, -1, 0.25), (0, 0.25, 1));
                default:
                    return new Holster("Hips", (0, 0, 0), (0, 0, 1), (0, 1, 0), hidden: true);
            }
        }
    }
}
