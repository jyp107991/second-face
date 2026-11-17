# The combat animation standard, and the set that meets it (2026-11-17)

Gate: **red, 6460** (the states measured before 4; the fight's states 6456: aim 1923, strike 1748, aim_pistol 675, ready 510,
crouch 342, throw 289, guard 254, reload 227, hit 183, yield 157, carry 144, rise 4). This file changes no limit, no clip and no
code. It is the rulebook the combat clips and the gate's fight states are held to, and the set proposed to meet it.

> "the volume of errors suggests it is not an error but really just a complete absence of any combat animations and/or
> standards/rules in the first place. do not reinvent the wheel if unnecessary - can we port something external to help?
> establish rules and animations first then remeasure errors then do the root cause identification and resolution." (owner,
> 2026-11-17, binding)

Binding with CLAUDE.md §2 ("Combat to the standard of the leading turn-based RPGs", "Humans look and move like humans", "Root
causes, never iterations", no accounts, no NC/ND/research-only sources), `docs/COMBAT.md` (A1-A9), `docs/PEOPLE_MOTION.md` §2.7
(the gate's fight states), `docs/qa/motion_calibration.md` §7 (real fighters measured), `docs/MOTION_ROOT_CAUSE.md` (how the
everyday motion was fixed: calibrate on real people first, then the right source motion, then one solve, then remeasure).

## 0. Order of work, and how to read an entry
1. **Rules**: this file (§1 general rules, §2 one entry per state). Where a gate limit disagrees with the evidence here, the
   gate's owner re-derives it from real people (§5); a limit never moves to pass our clips.
2. **Animations**: the proposed set (§4), staged and clip-QA'd offline against §1 and each state's bounds.
3. **Remeasure**: the whole cast on the fight's states with that set.
4. **Root causes**: each remaining failure traced (the clip on its own actor, then retarget, runtime, prop, state machine) and
   removed once at its source (`docs/COMBAT_ROOT_CAUSE.md`, written by that step).

Each state has **Look** (pose, contacts: feet, hands on the weapon, weight), **Timing** (beats, transitions), **Benchmarks**,
**Evidence** and **Gate** (the gate set that measures it now, or the one proposed). Tags: **[src]** read in a shipped game's own
script source; **[dev]** said by the developers; **[footage]** described from public gameplay footage (descriptive, not
measured); **[lit]** a published study; **[cal]** measured on real captures in this project (`motion_calibration.md` §7);
**[here]** measured offline for this file on the actors' own skeletons (samples in
`/home/user/second-face-staging/combat/candidates/`, provenance in its `SOURCES.txt`). Timings marked *design* are the game's
pace choices inside the evidence, not evidence. A benchmark game not named in an entry has no such state (Baldur's Gate 3 and
Divinity: Original Sin 2 have no cover system and no surrender) or nothing beyond §2.0's general picture.

## 1. General rules (every combat state)
- **G1 Captured first.** A state plays a real person's captured motion, or is built from one (a captured body with the weapon
  held by IK, procedural layers bounded by §2's evidence). Hand-keyed clips are stopgaps, flagged in their json and listed in §4
  with what replaces them. A clip that fails clip QA is not imported, whatever its source.
- **G2 The right person.** Women's takes on women and men's on men wherever a capture of that sex exists (throwing and striking
  differ by sex [R15][R18]); a take of unrecorded sex is marked `u` and plays on both until a documented take replaces it. Two or
  more takes for every action that repeats in a fight (fire, strike, hit, dodge), chosen per person, never one actor for a crowd.
- **G3 Real time.** Each clip at its true capture rate (database listing and gravity fit, `motion_calibration.md` §2), played at
  1.0 ± 0.15. The combat pace (COMBAT.md B9) shortens the holds between beats, never the clip; a skip cuts at a beat.
- **G4 Contacts.** A weight-bearing foot is still (F4) except in steps, pivots on the ball (strikes, turns), stumbles, falls,
  dodges and get-ups; a stance change steps, one foot at a time. The weapon stays in the main hand (WG1 ≤ 1 cm) in every state
  that holds it; the off hand stays on `grip_off` (WG2 ≤ 2 cm) whenever the state uses two hands; nothing clips (C1), the weapon
  included (never through the body, the head or the cover).
- **G5 Weight.** The centre of mass stays over the base of support in every held state. It leaves the base only in steps, lunges,
  dodges, stumbles, falls and deaths, and a step follows when a push carries it out [R19][R20].
- **G6 Facing.** A fighter turns by stepping (PEOPLE_MOTION §2.3). Within an aim, turns up to about 50° pivot on grounded feet
  (real shooters do better keeping the feet down across a 50° arc than lifting them [R7]); larger turns step, the head leading,
  then thorax, pelvis and feet [R28].
- **G7 Transitions.** Every state names its entries and exits. Between stances whose feet differ, the feet step; a crossfade
  (≤ 0.25 s, inertialized where possible) only joins poses with the same contacts; no seam pops over 2 cm.
- **G8 Readable from above.** The overhead camera always (pitch 35-62°, 8-20 m; none of the action cameras XCOM 2 and Wasteland 3
  cut to). Every action shows an anticipation (raise, wind-up, cock), its beat on the clip's own impact or release frame (events
  read off the curves, as WP2 does), and a recovery to the weapon's ready. Weapon classes read apart by silhouette at 20 m.
  Anticipation costs responsiveness; in a turn-based game the beat can afford it [B13].
- **G9 Real physics.** No bullet knocks a body back: its momentum is small and the shooter feels the same [R26]. A person shot
  falls from injury, shock or lost balance; a blast or a heavy blow may knock down. Recoil moves the shooter a little, briefly.
- **G10 Per weapon class.** Long gun (rifle, carbine, shotgun), pistol (pistol, revolver), one-handed melee (blade, knife,
  hatchet, club, crowbar, wrench), two-handed melee (bat, sledge, spear), unarmed, thrown. Every content weapon maps to one class
  by its `held` key (COMBAT.md A1).
- **G11 Root motion.** Travel is applied only where the body moves (step-in strikes, dodges, stumbles, cover in and out, falls,
  get-ups) and ends where Core puts the fighter; everything else plays in place.
- **G12 Measured in game.** Every state is a gate state (`combat:<set>:<what>`) on the whole cast with every runtime system on;
  states the gate cannot measure yet are listed in §5 and reviewed at the game's cameras in writing until they are.

## 2. The states

### 2.0 How the four benchmarks present a fight
- **XCOM 2** (Firaxis) [src B1]: a soldier's set is keyed by the cover state (high or low cover, left or right side: the peeks
  carry `HL_`, `HR_`, `LL_`, `LR_`; `NO_` without cover; most shared clips carry `HL_`). It has idles (calm and alert), a peek
  out (`Peek_Start`, `Peek_Loop`, `Peek_Stop`) and a targeting loop, hunker down, flinch, panic, stunned, deflect,
  counterattack, death, get-up. A hit plays `HurtFront/Back/Left/Right` by the quadrant it comes from; a miss plays a flinch (a
  run flinch if moving), a deflect or a reflect; knockbacks and deaths play a short kinematic clip and hand over to the ragdoll.
  The fire clip is chosen by context (after a move, turning into a target 60° or more off the move's end, kill variants). Shots
  and deaths can cut to an action camera.
- **Baldur's Gate 3** (Larian): combat, locomotion and spellcasting were captured with a stunt choreographer, per weapon [dev B2];
  the monks' unarmed set by a martial artist [dev B3]; 248 actors captured for the NPCs [dev B4]. No cover; prone, downed and
  standing up follow D&D 5e [B5]. [footage] The attacker turns to the target, each weapon class has its own wind-up and strike, a
  miss shows a defensive reaction, the fallen lie until they rise.
- **Divinity: Original Sin 2** (Larian; animation directed by Thierry Van Gyseghem [B7]): [footage] stylised, long readable
  anticipations, weapon-class idles, a visible dodge on a dodged attack, knocked-down bodies that lie and rise, overhand throws on
  an arc.
- **Wasteland 3** (inXile): the studio wanted more animations for "action variance" [dev B6]; [footage] crouching behind low cover
  under shield icons, shouldered aims, bursts with recoil, reloads and jams, grenades on an arc, ragdoll and gore deaths, a
  cinematic camera for precision strikes.

### S1 Ready stance, per weapon class
**S1a Long gun.** *Look:* feet about shoulder width, support foot a little ahead (guard F3w 21-70 cm [cal]), both knees soft,
weight over the mid-foot, trunk upright to slightly forward; stock in the shoulder pocket (or at the hip for a short shotgun),
muzzle down about 45° toward the threat's ground (the low ready; the Army's rifle manual defines the carry and ready positions
[R31]);
main hand on the grip, off hand under the fore-end, elbows in; head up on the threat. *Timing:* a breathing loop with small
weight shifts (never a frozen pose); in from draw/unsling and from a walk's stop, out to aim, reload, carry, crouch. *Benchmarks:*
XCOM 2 idles by cover state and side (`NO_IdleGunUp`, `NO_IdleAlertGunDwn`, `HL_IdleAlert`, `LL_IdleAlert`) [src B1]; Wasteland 3
two-handed low carry in combat [footage]. *Evidence:* [R31]; holding a rifle removes the arm swing [R10] and couples trunk and
pelvis [R9]; real guards [cal]. *Gate:* `ready` (guard's legs, head, feet; F1, F4, WG1, WG2; C1).

**S1b Pistol.** *Look:* two hands, the support hand wrapping the grip hand, gun held in at the chest (compressed ready) or low at
45°; elbows down, shoulders down; feet as S1a. A one-handed low hold is a variant (off hand busy). *Benchmarks:* Wasteland 3
two-handed pistols [footage]. *Evidence:* stance studies [R7][R8]. *Gate:* `ready`.

**S1c One-handed melee.** *Look:* bladed stance (lead foot toward the threat, rear foot turned out), knees bent, weapon in the
rear hand between hip and chest, edge or point toward the threat; off hand up in front of chest or face; chin tucked (men's guard
H1 −32…+5° [cal]); weight on the balls, the rear heel may lift 7-10 cm [cal]. *Timing:* loop with footwork; out to strike, block,
dodge. *Benchmarks:* Baldur's Gate 3 captures a stance per weapon with a stunt choreographer (a dagger "very different" from a
longstaff) [dev B2]; Divinity: Original Sin 2 class idles [footage]. *Evidence:* real guards [cal]. *Gate:* `guard`.

**S1d Two-handed melee.** *Look:* both hands on the haft (main hand at the end, off hand 10-25 cm up: CMU 02_07's two-handed
guard holds the hands 9-27 cm apart [here]), weapon diagonal across the body or cocked at the rear shoulder, bladed 30-45°, knees
bent. *Benchmarks:* Baldur's Gate 3 two-handed sets [dev B2]. *Evidence:* bat and kendo strikers [R17][R18]. *Gate:* `ready`
(two hands: WG2).

**S1e Unarmed (guard).** *Look:* fists by chin and cheek (both wrists within 30 cm under the head: the calibration's guard),
elbows in, chin tucked, bladed, lead leg straighter and rear knee bent (a woman's guard may keep one leg straight [cal]), rear
heel up to 7-10 cm [cal]. *Timing:* loop with bounce; footwork (advance, retreat, sidestep) as real steps. *Benchmarks:* Baldur's
Gate 3's monk set captured from a martial artist [dev B3]. *Evidence:* [cal] guard table (K1 ≤ 67, Kb ≤ 75.5, H2 ≤ 55.9, A2
112.8-146.9). *Gate:* `guard`.

### S2 Aim, long gun
*Look:* stock in the shoulder pocket, cheek on the stock (the head turned 15-22° and rolled 11-17° on the chest [cal,
provisional, one actor]), support elbow under the fore-end, main elbow out; feet in a bladed "fighter" stance or a square
isosceles [R7], knees flexed about 15 ± 10° [R8], trunk forward about 10 ± 5° [R8] (weight forward against recoil); muzzle on
the line to the target (the knee and trunk figures are a coaching tool's reference baselines). *Timing:* raise from ready, hold,
lower (*design*: raise and lower each ≤ 0.6 s at pace 1); the hold sways as a real hold does (rifle sway follows body sway
[R5]); aim corrections up to ~50° pivot on grounded feet [R7]. *Benchmarks:* XCOM 2 holds a targeting loop per cover side
(`HL/HR/LL/LR_Peek_Targeting_Loop`) after a peek start [src B1]; Wasteland 3 shoulders the gun over cover [footage]. *Evidence:*
[R5][R6][R7][R8]; **[here]** 100STYLE `Swat_ID` (a mimed gun shouldered) stands on knees bent 31-36°, where CMU 79_96 and 80_03
stand straight (K1 ≤ 2): the gate's provisional aim limits (K1 ≤ 2.2, H1 −3…+1.2) are two mimed actors' own values, not real
shooters' (§5.1). *Gate:* `aim` (provisional).

### S3 Aim, pistol
*Look:* two hands; isosceles (both arms near straight: elbows 178 ± 5° [R8]) or Weaver (support elbow bent down); sights at eye
height on the eye-to-target line; head upright (no stock: H2, H3 as standing); shoulders down (raised shoulders are a fault real
coaching flags [R8]); knees soft, trunk a little forward [R8]. *Timing:* as S2. *Benchmarks:* Wasteland 3 two-handed pistol
aim [footage]. *Gate:* `aim_pistol`.

### S4 Fire, single and burst, with recoil
*Look:* the round fires on the held aim; the gun kicks back into the shoulder and the muzzle rises, the chest and shoulder give
a little, the head follows the stock, and the body returns to the same sight picture with the feet still. Pistol: wrists and
elbows take the kick and the muzzle flips. Short shotgun: a larger push, the shoulder rocks back. Bolt action: the hand cycles
the bolt between shots. Burst: each round climbs, the support arm pulls it down, it settles after the last. Muzzle flash at the
muzzle, a spent case, a tracer from the muzzle (COMBAT.md A3). *Timing:* the kick peaks within tens of milliseconds and settles
within ~0.1-0.3 s, before the next round of a burst (*design* inside that: `Fighter.Recoil` settles as exp(−t/0.1 s)); rounds
at the weapon's own rate (content). *Benchmarks:* XCOM 2 picks the fire clip by context: after a move it runs and fires, turning
left or right when the target is 60° or more off the move's end, with separate kill variants; suppression holds a firing idle
(`FF_FireSuppressIdle`) [src B1]; Wasteland 3 bursts and jams [footage]. *Evidence:* shooters brace before the release with real
ammunition and not with dry fire (anticipatory postural adjustments [R6]); recoil momentum equals the projectile's and gas's
[R26]. *Gate:* `aim` (fire, burst), `aim_pistol`.

### S5 Reload, per mechanism
*Look:* detachable magazine (rifle, pistol): the support hand strips or drops the empty, goes to the pouch, seats the new one,
the hand charges the bolt or releases the slide, the gun tipped in toward the eyes with the muzzle on the threat or down.
Revolver: open, eject, load (by hand or loader), close. Break-action shotgun: open, extract, two shells from the belt, close.
Bolt action: rounds or a clip through the open bolt. The magazine or round is a prop in the hand; both hands on the weapon or
the prop. *Timing:* a magazine change takes an ordinary shooter 2-4 s [R12] (recruits' full loading drops from 27 s to 9 s with
training [R13]); revolvers and break actions are slower (*design*, no source here); back to ready or aim (from cover, back into
cover). *Benchmarks:* a reload per weapon class in XCOM 2 and Wasteland 3 [footage]. *Gate:* `reload` (as a gesture; WG1);
proposed: WG2 while both hands hold the weapon (§5).

### S6 Melee: wind-up, strike, recover, per class
**S6a One-handed** (blade, knife, hatchet, club, crowbar, wrench): forehand diagonal slash or chop (rear shoulder down across),
backhand, overhead chop, thrust (knife, blade). *Look:* driven from the ground up (legs, hips, trunk, then the arm), a step-in of
the lead foot, the rear heel pivoting; the off hand guards; the edge or face leads; follow-through, then back to S1c. *Timing:*
a visible wind-up (*design* ≥ 0.15 s), the strike fast (fists reach 9-12 m/s [R1][R2]), the hit on the clip's impact frame, a
recovery (*design* 0.4-0.8 s); a kendo step-in strike takes 0.75-0.82 s from movement onset to impact [R17].
**S6b Two-handed** (bat, sledge, pipe, spear): horizontal swing (stride, hips, shoulders, arms, hands together), overhead chop
(the body bending into it), thrust (spear). With a bat, men strike faster and harder and women from larger azimuth angles
[R18].
*Benchmarks:* Baldur's Gate 3 captures every weapon's attacks [dev B2]; XCOM 2's melee has a deflect and a counterattack
(`HL_Deflect`, `HL_DeflectMelee`, `HL_Counterattack`) [src B1]; Divinity: Original Sin 2 shows a long, readable anticipation
[footage]. *Evidence:* [R1][R2][R17][R18]; [here] CMU 124_07 (a captured two-handed swing) peaks at 5.4 m/s at the hands; CMU
02_07-09 ("swordplay") is a slow two-handed mime (hands p98 under 3.3 m/s, one swing over 4 m/s in 19 s), a guard, not a strike.
*Gate:* `strike` (WG2 for two-handed). The strike limits come from punches and blocks (§5.2).

### S7 Unarmed strikes
Jab, cross, lead and rear hooks, uppercuts, body shots; kicks optional. *Look:* from the guard; the fist turns over at extension;
the other hand stays at the chin; the cross turns the hips and lifts the rear heel (F2 up to 13 cm [cal]); back to the guard on
the same path. *Timing:* jab delivery about 0.4 s (405 ± 150 ms) [R1]; hooks take longer to deliver and land faster [R2]; contact
lasts 20-30 ms [R3]; combinations run faster than single maximal punches [R2]; the lead hand is quicker, the rear turns the trunk
further [R4]. *Benchmarks:* Baldur's Gate 3 monks captured from a martial artist [dev B3]. *Gate:* `strike`.

### S8 Guard and block
Unarmed forearm blocks high, middle and low, left and right; one-handed weapon across the line of the blow, off hand bracing;
two-handed haft horizontal overhead or vertical at the side. *Look:* the block meets the blow on its contact frame; knees bend,
a short step back absorbs it. *Timing:* raised in time for the blow (a defender has about 0.4 s against a jab [R1][R2]).
*Benchmarks:* XCOM 2 deflects and counterattacks [src B1]; Baldur's Gate 3 shows a parry or a shield block on a miss [footage].
*Gate:* `strike` (the block), `guard` (the hold).

### S9 Dodge
Sidestep left or right, duck or slip, step back. *Look:* a real step out of the line (a side step or a crossover by the threat's
angle [R20]), head and trunk off the line, feet re-planted, back to the stance. *Timing:* *design* 0.3-0.6 s of the captured step,
on a miss (`OnMiss`, COMBAT.md A5). *Benchmarks:* Divinity: Original Sin 2 dodges on dodged attacks [footage]; XCOM 2 flinches on
a miss (`HL_Flinch`, `HR_Flinch`, `NO_Flinch_*`; a run flinch if the unit is moving) and deflects a deflected one [src B1].
*Gate:* none; proposed `dodge`.

### S10 Hit reactions, by direction and zone (graze, hit, crit)
*Look:* the struck part moves away first (head snaps for the head, chest caves for the torso, a knee buckles for a leg, the arm
drops for an arm), the trunk follows, the head comes back to the threat. When the push carries the centre of mass past the feet,
a step goes with it (side, crossover or back step [R20]). Graze: a flinch, no step. Hit: flinch and trunk, maybe a step. Crit:
S11 or S12. The weapon stays in the hand unless the arm is hit. No flight (G9). *Timing:* onset within about 0.1 s of the impact
(startle-driven neck activity is 5.9 times faster than voluntary [R21]; a true startle reflex comes within 120 ms [R22]); the
muscles resisting the push fire before their antagonists, the ankle's rising most steeply [R19]; back to the stance in *design*
0.4-1.0 s. *Benchmarks:* XCOM 2 picks `HurtFront`, `HurtBack`, `HurtLeft` or `HurtRight` by the quadrant the hit comes from
against the unit's facing, falling back to `HurtFrontA`, and hands knockbacks and deaths to the ragdoll [src B1]; the industry
builds reactions from captured or physical responses [B9][B10][B11][B12]. *Gate:* `hit` (strike's legs, head, feet; F1); proposed:
one state per direction and zone.

### S11 Stagger
One to three recovery steps after a heavy blow or a crit, in the push's direction, arms out for balance, trunk bent, head
recovering, then back to the stance facing the threat. *Evidence:* compensatory stepping [R19][R20]; captured stumbles (CMU 22_12,
91_59). *Benchmarks:* XCOM 2 melee knockback (`HL_MeleeKnockback`) [src B1]. *Gate:* `hit`.

### S12 Knockdown and fall
A fall from lost balance (a stagger past recovery, a blast, a leg crit) or a deliberate drop. *Look (conscious):* the arms reach
for the ground, elbows extending, then co-contract 100-120 ms before impact and land at about 129° [R24]; forward falls last
longer, with the elbows more bent, than backward ones [R23]; arm reactions scale with the height of the fall [R25]. The long gun
may drop; then the down pose and S15. *Timing:* 0.6-0.8 s from release to impact [R24]. *Benchmarks:* XCOM 2 knocks back left,
right or straight, then ragdolls [src B1]; Baldur's Gate 3's prone follows D&D 5e (standing up costs half the movement) [B5];
Divinity: Original Sin 2 knocked-down status [footage]. *Gate:* none; proposed: C1 and the soles at contact, reviewed by eye.

### S13 Death
*Look:* an unconscious collapse: tone goes, knees buckle, the body folds over its feet and falls toward its lean, with no
protective arms (those belong to a conscious fall [R24]) and no flight back [R26]; the weapon drops; then still (no twitching
loop), resting without clipping the ground. *Timing:* under a second to the ground [R24]. *Benchmarks:* XCOM 2 plays a kinematic
death and switches to the ragdoll at a set time [src B1]; Wasteland 3 ragdolls and gore [footage]. *Gate:* none; proposed: C1 of
the resting pose against the body and the ground, reviewed.

### S14 Prone and crawl (Core C2 has prone)
*Look:* down through a kneel and the hands to flat, the long gun across the forearms; crawl on elbows and knees or hands and
knees; up through S15. *Evidence:* captured lie-downs and crawls (ACCAD A8, A9, A11, A12, three people, both sexes). *Gate:*
none; proposed `prone`.

### S15 Rise
*Look:* from the side the body lies on: roll to side or front, push on the hands, a knee under, to a crouch or half-kneel, stand
to the ready (adults' classic patterns: an arm push and reach, a partial or full roll, a symmetric or asymmetric squat or a
half-kneel [R33]; supine-to-stand is a standard measure of motor competence at every age [R27]); feet plant before standing.
*Timing:* the staged captured get-ups run 4.4-8.5 s with their lead-ins [here]; the game plays the active part and joins the
ready. *Benchmarks:* XCOM 2 `HL_GetUp` [src B1]; Baldur's Gate 3 stands from prone [B5]. *Gate:* `rise` (C1 only);
proposed: limits from the captured get-ups' own actors, calibrated as §7 of the calibration.

### S16 Crouch (in the open)
*Look:* deep knee flexion (K 17-147° [cal]), heels may lift up to 17 cm [cal], trunk forward, weapon low across the knees or
aimed, balanced over the feet. *Timing:* *design* 0.3-0.8 s down or up (the captured crouch-downs take 2.6-3.6 s with settling
[here]). *Benchmarks:* XCOM 2 `HL_Stand2Crouch`, `LL_Crouch2StandA` [src B1]. *Gate:* `crouch`.

### S17 Cover, half (low): enter, hold, peek, leave
Enter: the move ends with a slowing step down behind the cover, weapon side free. Hold: crouched or one knee down, weapon close,
head under the cover's top, the head turned to the threat (H2 to 92° in a crouch [cal]). Peek: rise over the cover or lean out
to its side to fire, then drop back. Leave: a crouch-to-run or crouch-to-walk start. *Benchmarks:* XCOM 2 keeps a set per cover
state (`LL_`, `LR_`: the low cover's left and right peeks) with `Peek_Start`, `Peek_Loop`, `Peek_Stop`, `Peek_Targeting_Loop`, and
`HunkerDwn` [src B1]; Wasteland 3 crouches behind low cover [footage]. *Gate:* `crouch` (hold); proposed `peek`.

### S18 Cover, full (high): enter, hold, peek, leave
Enter: step to the wall, shoulder or back to it, weapon vertical or low. Hold: standing, the shoulder or back touching the wall
without passing into it (C1 against the cover too), head turned to the corner. Peek: lean the trunk out past the corner, feet
planted (a captured side lean holds the trunk 21-26° over feet 34 cm apart [here: 100STYLE `LeanLeft_ID`]), or step out to fire
and back. Leave: push off into a walk or run. *Benchmarks:* XCOM 2's high-cover peeks (`HL_`, `HR_`) [src B1]. *Gate:*
none; proposed `cover_full`.

### S19 Throw (grenade, bottle, smoke, lamp)
*Look:* overhand: the non-throwing arm reaches toward the target while the throwing arm cocks behind the head, the opposite foot
strides, then hips, trunk, arm (wind-up, stride, cocking, acceleration, deceleration, follow-through [R14]); the one sequence
that separates skilled throwers is "non-throwing arm elbow extension prior to shoulder extension" [R16]; release on the clip's
frame; back to ready. Underhand lob for short throws and from cover. Throwing styles differ by person and by sex [R15]. A long
gun is held in the off hand or slung (*design*). *Timing:* *design* 1-2 s whole (the staged woman's overhand runs 2.3 s with
settling [here]). *Benchmarks:* XCOM 2 `FF_GrenadeUnderhand` [src B1]; overhand arcs in Divinity: Original Sin 2 and Wasteland 3
[footage]. *Gate:* `throw`.

### S20 Surrender
*Look:* the weapon dropped or laid down first, then both hands up and open, palms forward, at or above the head, elbows bent;
head down or watching; optionally kneeling. Hold: still, breathing, small fearful shifts. *Timing:* *design* 1-2 s to the hold.
*Benchmarks:* XCOM 2's panicked and stunned states (`HL_Panic_*`, `NO_Stunned*`) [src B1]. *Evidence:* none specific; reviewed by
eye. *Gate:* `yield` (a gesture with stretch's S1).

### S21 Carry: walk and jog with a weapon
Long gun at the low ready across the body in a fight (slung on the back out of one, A1); shouldered (an aim-walk) when moving in
contact. Pistol two-handed at the chest or one-handed low. Melee weapon in hand, the other arm swinging. *Look:* holding a rifle
in both hands reduces sagittal trunk motion and puts pelvis and trunk rotation more in phase [R9]; it removes the arm swing and
raises the impact peak [R10]; load carriage bends trunk, hips and knees more [R11]; the captured aim-walk bends the knees about
35-38° [here: 100STYLE `Swat_FW`]. *Timing:* the people's own cadence (`Pace`), G3. *Benchmarks:* XCOM 2 and Wasteland 3 move with
the weapon up [footage]. *Gate:* `carry` (§2.4 walking but W3, A6; WG1, WG2).

### S22 Turn in place
*Look:* the head turns first, then thorax, pelvis and feet (healthy adults turn head-first [R32]); onsets, step duration and
turn speed grow with the turn's amplitude [R28]; women and men differ in stepping at speed [R29]; step and spin turns are
unstable in different phases [R30]; the weapon stays at the ready (or aim). The turn steps (G6), pivoting on grounded feet only
for aim corrections up to ~50° [R7]. *Benchmarks:* XCOM 2 turns into the shot at a move's end [src B1]. *Gate:* §2.3 turning
(F4, F1, F2, facing within 20°); proposed `turn` per stance.

### S23 Draw, holster, into and out of the fight
Draw: the hand to holster or sling, the weapon up to the ready; holster the reverse; unarmed: stand-to-guard, guard-to-relax.
*Timing:* *design* 0.5-1.0 s. *Gate:* as gestures (§2.2).

## 3. External sources found (search of 2026-11-17)
Constraints: commercial use, no account, no NC, ND or research-only licence, and this repository is **public** (anything committed
is redistributed in source form), which rules out licences that allow binary-only distribution or forbid redistribution.

| Source | Licence (quoted) and access | Kind | Combat coverage | Verdict |
|---|---|---|---|---|
| **Quaternius Universal Animation Library 1 and 2, Standard** [S1] | "CC0 1.0 Universal (CC0 1.0) Public Domain Dedication" (the download's License.txt); free download. The Source tier (the rest, ~30-40 %) is paid | hand-keyed, one rig | full Standard contents read from the GLBs [here]: UAL1 46 clips: Crouch_Fwd_Loop, Crouch_Idle_Loop, Death01, Hit_Chest, Hit_Head, Pistol_Aim_Down/Neutral/Up, Pistol_Idle_Loop, Pistol_Reload, Pistol_Shoot, Punch_Cross, Punch_Enter, Punch_Jab, Roll, Roll_RM, Sword_Attack, Sword_Attack_RM, Sword_Idle, plus locomotion, sitting, swimming, driving, spell, interact, pick-up. UAL2 43 clips: Hit_Knockback(_RM), Idle_Shield_Break/Loop, LayToIdle, Melee_Hook(_Rec), OverhandThrow, Shield_Dash_RM, Shield_OneShot, Slide_*, Sword_Block, Sword_Dash_RM, Sword_Regular_A/B/C(_Rec), Sword_Regular_Combo, Walk_Carry_Loop, plus farming, zombie, ninja-jump, climb, emotes | **in use as stopgaps** (27 staged); no rifle, cover, dodge, stagger. Replace by captures (§4) |
| **ACCAD Open Motion Project** [S4] | "Open Motion Project by ACCAD/The Ohio State University is licensed under a Creative Commons Attribution 3.0 Unported License."; direct zips | captured (Vicon) | Male2 149 BVH, Male1 69, Female1 81. **Unused and relevant:** crouch-to-lie, lie, lie-to-crouch, crawl forward and back (all three people); sidesteps and quick sidesteps (all three); walk and run turns 45/90/135/180 (all three); Male2: walk/run-to-ready, ready-to-crouch, crouch-to-ready, ready-to-walk-away, ready-to-run, switch stance, turn-around left/right in guard, advance, retreat (quick and slow), guard sidesteps, eight blocks (left/right × high/middle/low, middle high/low), backfists, body hooks, body crosses, body jabs, duck right, victory 1-2 (arms raised), kicks G1-G20 | **use more of it** (§4) |
| **CMU Graphics Lab** [S5] | "The motion capture data may be copied, modified, or redistributed without permission." / "You may include this data in commercially-sold products, but you may not resell this data directly, even in converted form." | captured (Vicon) | index read in full [here]. **Unused and relevant:** 80_71 chopping wood (2nd actor), 124_07 baseball swing, 02_07-09 swordplay (slow mime), 139 sneak, duck, wounded walk, get-ups 139_16-18, women's get-ups 111_06-08, 114_02/11, 77_16-18, falls 90_16 (on the face), 90_18 (rug-pull, backward), stumbles 105_59, 104_13, throws 143_20/22, 33_01/34_01, 111_33, underhand tosses 22_22-25, punches 143_23, karate 135 | **use more of it** (§4); sex is unrecorded for most subjects |
| **100STYLE** (Ian Mason) [S3] | "This work is licensed under a Creative Commons Attribution 4.0 International License." Credit "The 100STYLE Dataset - Ian Mason"; per-file links from the project page (Zenodo refused this network) | captured (Xsens, 60 fps), one actor, 182 cm, sex not recorded, unedited BVH with T-poses at both ends | 100 styles × forward/back/sidestep walk and run, idle, transitions. **Relevant:** Swat (a mimed gun shouldered: elbows 87° and 145°, wrists at the chest, knees 35-38° walking, 31-36° idle [here]), Crouched, OnToesCrouched, LeanLeft/LeanRight (trunk 21-26° side lean, feet planted [here]), ShieldedLeft/Right, Punch, Kick, KarateChop, Lunge | **use**: the aim-walk and strafe with a gun, crouched locomotion, full-cover lean; flag: one actor, sex unrecorded, mimed gun, inertial capture (check contacts in clip QA) |
| **HDM05** (MPI) [S6] | CC BY-SA 3.0 per the MPI page and its badges; stated aim "free motion capture data for research purposes"; the server refused this network (403), so not evaluated | captured (Vicon, 120 Hz) | its classes include punches, kicks, throws, lying down and standing up | **admissible with ShareAlike** (our adapted clips would be CC BY-SA); evaluate when reachable |
| **Truebones** [S2] | "TRUEBONES products are absolutely royalty free and can be used for any and all purposes even commercial ... However please note: Re-Distribution or ReSale of Truebones in .FBX, .BVH or i-Motion formats is strictly prohibited and protected by copyright law. Please provide credit to Truebones when using Truebones." The "FREE" packs (500 Pak, Street Fight Moves, CMU fixed, Creative Commons Pak) list a price of $10 on Gumroad (2026-11-17) | mixed: CMU conversions, a pack retargeted from Eyes, JAPAN capture, keyed | street-fight moves (contents not listed) | **out**: paid, and no redistribution in a public repo |
| **MoCap Online** free packs (itch.io) [S10] | Standard License: "Distribution is allowed only as binary-only"; prevents "extraction for further distribution, reproduction, modification, or use outside of the User Creative Work"; the free pack page says it permits commercial projects | captured | pistol: stand aim, aim turns ±45°, stand/crouch aim offsets, single shots standing and crouched, walk/jog/crouch-walk aim; a sword pack | **out**: the only free captured pistol set found, but a public repo distributes the FBX in source form |
| **Kevin Iglesias**, Human Soldier / Human Melee Animations FREE (itch, Gumroad, name your price) [S9] | no licence text on the pages or in the package (downloaded, read, deleted [here]); the Asset Store copies are under Unity's EULA (account) | hand-keyed, Unity Humanoid, masculine and feminine | Soldier: assault rifle, rifle, handgun, dual guns, bazooka aims, shots, reloads; grenade throw; 2 damage, 3 deaths; idles; 8-way walk and run | **out**: no grant to redistribute; keyed |
| **KayKit Character Animations** [S7] | "Creative Commons Zero v1.0 Universal" | keyed, stylized short-limbed rigs | 150+: melee, ranged (shoot, aim, reload), hits, deaths, dodges | **out**: proportions (COMBAT_ASSETS already rejected the rig) |
| Kenney Animated Characters [S8] | CC0 | keyed | idle, jump, run | out: no combat |
| RancidMilk "Massive Library" [S11] | "free to use/modify/redistribute, so long as you don't just sell them as animations" | CMU via cgspeed BVH | CMU only, no hands | out: use CMU directly |
| KinemIQ [S12] | mixes CC0 (UAL), CC BY 4.0 (100STYLE), CC BY 3.0 (ACCAD) | aggregator | as its sources | out: account after the first export; its sources are used directly |
| oudarya "Human basics"; maxparata "CC0 animations" [S22] | CC0 | keyed | a few basics | out: a minimum price; 5 clips |
| Bandai Namco Research Motiondataset [S13]; LaFAN1 [S14]; SFU [S15]; AMASS [S18] | CC BY-NC (Bandai); CC BY-NC-ND (LaFAN1); non-commercial (SFU); non-commercial with login (AMASS) | captured | Bandai has fighting | **out** (NC/ND/research) |
| Eyes, JAPAN mocapdata.com [S17] | registration required; licence not confirmed | captured | 4,000+ motions reported | **out** (account) |
| Unreal Game Animation Sample [S16] | "UE-Only Content - Licensed for Use Only with Unreal Engine-based Products" | captured | 500+ clips, mostly locomotion | **out** (Unreal only) |
| Mixamo, ActorCore, Rokoko, Sketchfab, Unity Asset Store | accounts | | | **out** |

Open-source systems that help without data of their own:
- **Unity Animation Rigging** (Unity package) [S19]: two-bone IK, multi-aim, damped transforms: the weapon holds, aim, recoil
  and additive hit layers on captured bodies.
- **Motion Matching for Unity** (JLPM22, MIT; Unity 6, URP samples, inertialization and foot locking) [S20]: a candidate for
  combat locomotion (the aim-walk, strafe and turns from 100STYLE `Swat_*`; For Honor matched the feet and the weapon [B8]); its
  sample motion's source is not stated, so only the code may ship.
- **FreeMoCap** (open source, AGPL; two to four webcams and a printed board; BVH out) [S21]: self-capture for what no free
  capture holds (reloads, low ready with a real weapon shape, one-handed weapon strikes). Markerless capture jitters and needs
  the same clip QA; the motion captured is ours.

## 4. The proposed set
Per state: the best source (existing staged clips keep their names), what remains uncovered, and the honest option for it.

| State | Proposed source (sex) | Kind | Gap that remains | Honest option |
|---|---|---|---|---|
| S1a ready, long gun | low ready: the people's own captured idles by sex (motion set v5) with the per-body IK hold (`HandsIk.Hold`); aim-ready: 100STYLE `Swat_ID` (u); `rifle_idle_ual` retired | captured body + IK arms | no captured low ready with a real weapon | IK hold on captured bodies now; FreeMoCap with a replica later |
| S1b ready, pistol | as S1a, both hands by IK at the chest | captured body + IK | as S1a | as S1a; MoCap Online's captured set only if the repo were private |
| S1c ready, 1h melee | `fist_guard_accad` (m) and a women's guard cut from CMU 144's guard frames (f), weapon by the hand's grip | captured | no capture holding a weapon | IK grip on the captured guard |
| S1d ready, 2h melee | CMU 02_07 two-handed guard loop (u) or the batting stance of 124_07 (u), off hand by IK | captured | no woman's take | flagged `u` until found |
| S1e guard, unarmed | `fist_guard_accad` (m), CMU 144 guard (f); footwork: ACCAD Male2 advance, retreat, sidesteps, switch stance | captured | women's footwork | Female1 sidesteps as the closest |
| S2 aim, long gun | `rifle_aim_b_cmu` (CMU 80_03, u) hold; second and third actors: CMU 79_96, 100STYLE `Swat_ID` frames; arms by IK to the weapon | captured body + IK | no real-weapon aim; 100STYLE is one 182 cm actor of unrecorded sex | IK on captured bodies; FreeMoCap with a replica |
| S3 aim, pistol | captured aim body (S2) with both arms by IK on the eye-to-target line (isosceles) | captured body + IK | no free captured pistol body with a licence the public repo allows | as now; recheck MoCap Online if the repo's visibility ever changes |
| S4 fire | recoil on the captured hold (`Fighter.Recoil`), parameterised per class (pistol flip, rifle push and climb, shotgun rock, bolt cycle); `rifle_fire/burst_cmu` stay unplayed | procedural on captured | no capture with live recoil | procedural, bounded by S4's evidence |
| S5 reload | magazine, revolver, break-action and bolt reloads authored as hand-target paths on the captured ready/aim body, timed within 2-4 s [R12]; `pistol_reload_ual`, `rifle_reload_ual` until then | procedural on captured (stopgap keyed) | **no free captured reload of any kind** | FreeMoCap with replicas and dummy magazines; no paid or account source |
| S6a strike, 1h | forehand from `fist_hook_r_accad`, backhand from Male2 backfists (E11/E12), thrust from the jab/cross, overhead from CMU 79_01's body with the off hand released; women: CMU 144 punch bodies; weapon hand on an IK arc | captured body + IK arc | no captured one-handed weapon strike | as listed; FreeMoCap with a stick |
| S6b strike, 2h | `club_overhead(_b)_cmu` (CMU 79_01, u), add CMU 80_71 (second actor) and 124_07 (horizontal swing) | captured (+ off hand IK) | no woman's two-handed strike | flagged `u`; sex differences recorded [R18] |
| S7 unarmed | staged ACCAD Male2 jab, cross, hooks, uppercuts (m) and CMU 144/141/113 (f); add Male2 body hooks, body crosses, body jabs, backfists | captured | women's hooks and uppercuts | CMU 144's punch sequences cut by blow |
| S8 block | add ACCAD Male2's eight blocks (m) to `block_high_accad`; CMU 144_07/08/26/27 (f); weapon blocks = block body + IK weapon; `melee_block_ual` retired | captured (+ IK) | weapon parries | IK on captured blocks |
| S9 dodge | `dodge_l/r_accad`, `duck_accad` (m); add Male2 duck right, Male1/Male2 quick sidesteps, Female1 sidesteps (f), CMU 77_09, 139_09 | captured | a woman's duck | `duck_cmu` (u) |
| S10 hit | procedural directional reaction on every hit (four quadrants as XCOM 2 [src], zones head/torso/legs/arms) on the captured stance, with captured steps (ACCAD retreat, sidesteps) when the push leaves the base | procedural on captured | no free captured directional hits | procedural with research basis [B11]; `hit_chest/head_ual` retired |
| S11 stagger | `stagger_fwd_cmu` (CMU 22_12, u), `stagger_cmu` (CMU 91_59, f); add 105_59, 104_13; backward and side staggers from ACCAD retreat and quick sidesteps | captured | a captured backward stumble | captured retreat steps |
| S12 knockdown | physics from the current pose; scripted: CMU 90_18 (backward), 90_16 (forward); going prone: ACCAD A8 (three people) | physics + captured | the acrobat's falls are stylised (check in clip QA) | ragdoll with protective-arm reach for conscious falls |
| S13 death | physics collapse from the current pose (no protective arms, no knockback); `death_ual` retired | physics | none | as proposed |
| S14 prone, crawl | ACCAD A8/A9/A11/A12 (Male1, Male2, Female1) | captured | prone aim | IK aim on the lying pose |
| S15 rise | staged CMU get-ups (`getup_back/front/side_cmu` u, `getup_f_cmu` f), `getup_to_crouch(_f)_accad`; add CMU 139_16-18, 111_06-08, 114_02/11 (f), Male2 crouch-to-ready | captured | none | as proposed |
| S16 crouch | `crouch_down(_f)_accad`; add Male2 ready-to-crouch and crouch-to-ready, Male1 crouch; `ready_crouch_cmu`; crouch walk: CMU 136_09-12 (u), 100STYLE `Crouched` (u); `crouch_rifle_ual`, `crouch_idle_ual`, `crouch_walk_ual` retired | captured (+ IK arms) | a woman's crouched gait | flagged `u` until found |
| S17 half cover | enter `run_to_crouch(_f)_accad`, `walk_to_crouch_f_accad` (+ Male1/Male2 walk-to-crouch); hold as S16; peek: rise to the aim (crouch-to-ready) or a kneeling aim by IK; leave `crouch_to_run/walk(_f)_accad` | captured (+ IK) | a captured kneeling aim | IK aim on the crouch body |
| S18 full cover | enter: captured walk/run-to-stand; hold: captured idle with the shoulder to the wall by a contact constraint; peek: 100STYLE `LeanLeft/LeanRight_ID` (u) with the aim by IK, or a step out (sidesteps); leave: stand-to-walk/run | captured + constraint | no captured back-to-wall hold | contact-constrained captured idle |
| S19 throw | `throw_overhand_cmu` (CMU 113_24, f), add 111_33 (f); men's: CMU 143_22, 33_01 (u) and HDM05's throws once checked; underhand: CMU 22_22-25 (u); `throw_overhand_ual` retired | captured | a documented man's overhand throw | flagged `u`; HDM05 (CC BY-SA) |
| S20 surrender | drop the weapon, raise from ACCAD Male2 victory 1-2 (arms up, captured), hold by IK; `surrender_enter/idle_ual` until then | captured + IK hold | a woman's take; a kneeling surrender | flagged; FreeMoCap |
| S21 carry | the people's own walks and jogs with the arms layer (`CombatArms`) for the low ready; 100STYLE `Swat_FW/BW/SW/FR/BR/SR` (u) for the aim-walk and strafing | captured | a woman's aim-walk | flagged `u` |
| S22 turn | Male2 turn-around left/right in guard; walk/run turns 45-180° (Male1, Male2, Female1); small aim turns pivot by IK on grounded feet | captured | turns at the long-gun ready | stepped turn from the walk turns with the arms layer |
| S23 draw, holster | ACCAD Male2 stand-to-ready, walk-to-ready, ready-to-relax; weapon draws by an IK hand path | captured + IK | no captured draw (CMU 139_05 never raises the gun) | IK path, flagged |

What stays a gap after every free, admissible source: reloads (none captured), a real-weapon low ready and aim, one-handed weapon
strikes, women's two-handed strikes and crouched gait, a man's documented overhand throw, directional hit reactions. The honest
options are, in order: build them on captured bodies (IK and procedural layers inside §2's evidence), mark them as such in each
clip's json, and capture them ourselves with FreeMoCap when the owner wants (no account, the motion is ours).

## 5. Proposals for the gate's owner (from the evidence; none applied)
1. **The long-gun aim limits.** The provisional column (K1 ≤ 2.2, H1 −3…+1.2, H2 15.2-22.2, H3 10.6-16.6) is two mimed actors'
   own values, the head from one. Real shooters bend the knees (isosceles 15 ± 10° [R8]; the fighter stance [R7]; 100STYLE's
   aim-ready 31-36° [here]) and lean forward 10 ± 5° [R8]. Re-derive from at least three actors (CMU 79_96, 80_03, 100STYLE
   `Swat_ID`) and the literature before the remeasure. The pistol aim borrows these legs (`aim_pistol` K1, H1).
2. **Strike limits per class.** Unarmed from punches and blocks (as now); two-handed from CMU 79_01, 80_71 and 124_07's own
   actors; one-handed weapon strikes need a capture before they have limits of their own (until then, unarmed strike limits on
   the captured hook and backfist bodies).
3. **States the gate does not measure yet:** `dodge`, `peek`, `cover_full`, `prone` and crawl, `turn` per stance, `fall` and
   `death` (C1 and the soles at contact; by eye), `draw`. Hit reactions as one state per direction and zone, so a failure says
   which.
4. **Reload:** WG2 while both hands hold the weapon.
5. **Calibrate what is missing on real people**, as §7 did: rise (CMU 140, 111, 113, 114 get-ups), dodge (ACCAD sidesteps and
   dodges), prone and crawl (ACCAD A8-A12), carry with a gun (100STYLE `Swat_*`).

How the first whole-cast measure reads against this standard (hypotheses for the root-cause step, not findings): aim's 1923
include 237 failures on each of K1, H1, H2, H3 and A1, every person in each of the three aim states, so the rule (item 1) is
suspect before any body is; `aim_pistol` repeats K1 and H1 on the same borrowed legs; ready (F1 222, WG2 158, C1 130), crouch
(79 each of K1, F1, F4, WG2: once per person) and carry (WG2 79) play the hand-keyed `rifle_idle_ual` and `crouch_rifle_ual`
bodies this set retires; strike (F1 474, A2 420, A1 237) applies punch limits to club and blade strikes (item 2); throw, reload,
hit and yield play a hand-keyed stopgap for some or all people.

## 6. Credits the set brings (CREDITS.md on integration)
- 100STYLE: "The 100STYLE Dataset - Ian Mason", CC BY 4.0, used modified (retargeted, trimmed, resampled).
- ACCAD: "Open Motion Project by ACCAD/The Ohio State University is licensed under a Creative Commons Attribution 3.0 Unported
  License." (the takes added in §4, used modified).
- CMU Graphics Lab Motion Capture Database (the trials added in §4).
- HDM05, if used: Müller et al., CC BY-SA 3.0; the adapted clips are then CC BY-SA 3.0 too.

## 7. References
Real people
- [R1] Stanley E et al. (2018) An analysis of the three-dimensional kinetics and kinematics of maximal effort punches among amateur boxers. Int J Perf Anal Sport. https://consensus.app/papers/details/w:9fe7a851-919f-48eb-82cc-aed368b420f7/
- [R2] Piorkowski BA et al. (2011) Single maximal versus combination punch kinematics. Sports Biomech. https://consensus.app/papers/details/w:042da08c-3bb2-4e69-8f66-f3d2039da3f2/
- [R3] Mosler D et al. (2024) Higher values of force and acceleration in rear cross than lead jab. Appl Sci. https://consensus.app/papers/details/w:18a6e819-127a-4c47-8710-c23bc169a41f/
- [R4] Wan J et al. (2026) Kinematic and kinetic differences between lead and rear straight punches in elite boxers. BMC Sports Sci Med Rehabil. https://consensus.app/papers/details/w:01b764b4-f8a1-40f7-a371-c2e9f5bca226/
- [R5] Sattlecker G et al. (2014) Postural balance and rifle stability during standing shooting. Int J Sports Sci Coach. https://consensus.app/papers/details/w:f4c721cb-16e7-4029-ab67-89b7e3fad775/
- [R6] Zoppirolli C et al. (2026) Postural and aiming control in dry and real biathlon standing shooting. Sport Sci Health. https://consensus.app/papers/details/w:2ffbf162-34a6-46cf-9656-926bed1b7b6f/
- [R7] Brown SAT et al. (2018) Stance and transition movement effects on marksmanship performance of expert shooters. Proc HFES. https://consensus.app/papers/details/w:c8fbaf55-8982-4dc2-9f5f-4319e6b2c002/
- [R8] Mishra AK et al. (2026) PointZero: a vision-based, stance-aware framework for marksmanship posture correction (isosceles baselines: elbows 178 ± 5°, knee 165 ± 10°, torso forward 10 ± 5°). IEEE EIT. https://consensus.app/papers/details/w:1ce09361-f658-4beb-a5fc-cc5ddf2df289/
- [R9] Seay JF et al. (2011) Carrying a rifle with both hands affects upper body transverse plane kinematics and pelvis-trunk coordination. Ergonomics. https://consensus.app/papers/details/w:820395fa-2ed5-46ea-939c-593a2544b958/
- [R10] Birrell SA et al. (2008) The influence of rifle carriage on the kinetics of human gait. Ergonomics. https://consensus.app/papers/details/w:e3518dc0-fe00-4095-b403-af94f90b019f/
- [R11] Walsh GS et al. (2021) Military load carriage effects on the gait of military personnel: a systematic review. Appl Ergon. https://consensus.app/papers/details/w:474b9deb-67bc-441d-8e4d-c6cb36372ee3/
- [R12] Kleck G (2016) Large-capacity magazines and the casualty counts in mass shootings (a magazine change takes 2-4 s). Justice Res Policy. https://consensus.app/papers/details/w:4b188f09-ee81-42e5-901b-488a8708b03c/
- [R13] Charles MT et al. (2003) Acquisition of marksmanship and gun handling skills through basic law enforcement training. Int J Police Sci Manag. https://consensus.app/papers/details/w:9bc8d28d-9329-4d34-969c-ad66cdd5c77b/
- [R14] Chu SKW et al. (2016) The kinetic chain revisited: new concepts on throwing mechanics and injury. PM&R. https://consensus.app/papers/details/w:ea60f33b-c7a0-4e3a-bb6b-ae1f8f933714/
- [R15] Maselli A et al. (2019) A whole body characterization of individual strategies, gender differences, and common styles in overarm throwing. J Neurophysiol. https://consensus.app/papers/details/w:681013a6-6388-4c56-b0f6-b3e2e9b88230/
- [R16] Fu ACL et al. (2022) Segmental sequencing of the upper body segments in unconstrained maximum overarm throws. Scand J Med Sci Sports. https://consensus.app/papers/details/w:268cf818-65dc-4b5b-a483-209b8e22607c/
- [R17] Murase N (2026) Lower limb mechanics in kendo men and kote strikes (strike times 0.745 ± 0.101 s and 0.818 ± 0.085 s). Sports Biomech. https://consensus.app/papers/details/w:b31d5479-834f-4d75-9bb2-4d618363dd6b/
- [R18] Guo L et al. (2026) Biomechanical effects of sex and bat size on head-directed blunt strikes. Front Bioeng Biotechnol. https://consensus.app/papers/details/w:cc382f86-eb38-438e-b5d3-60a4a023e31a/
- [R19] Zhu RT-L et al. (2022) How does lower limb respond to unexpected balance perturbations? Biosensors. https://consensus.app/papers/details/w:f3a60457-00ce-4d91-a7a4-2d8127508102/
- [R20] Chatagnon T et al. (2023) Stepping strategies of young adults undergoing sudden external perturbation from different directions. J Biomech. https://consensus.app/papers/details/w:30a417e4-91ba-42e2-89eb-e8ec744bd4fa/
- [R21] Homayounpour M et al. (2019) Auditory warnings invoking startle response cause faster and more intense neck muscle contractions prior to head impacts. Proc HFES. https://consensus.app/papers/details/w:2ee29f86-58f9-4397-b607-1ca936e105fa/
- [R22] Adjei ENA et al. (2025) Effects of asymmetrical postural demands on sternocleidomastoid reflex in the startReact paradigm. Front Hum Neurosci. https://consensus.app/papers/details/w:3d4e37df-3db0-4305-af60-3acc167dc6cb/
- [R23] Tan J-S et al. (2005) Wrist impact velocities are smaller in forward falls than backward falls from standing. J Biomech. https://consensus.app/papers/details/w:5ceaf906-dd58-46d8-bba8-8b30dff6b340/
- [R24] Borrelli JR et al. (2023) The timing and amplitude of the muscular activity of the arms preceding impact in a forward fall is modulated with fall velocity. J Biomech. https://consensus.app/papers/details/w:66c6b022-258e-4779-9605-893bf11e9f87/
- [R25] Borrelli JR et al. (2019) Protective arm movements are modulated with fall height. J Biomech. https://consensus.app/papers/details/w:50e0403c-becf-4a87-81e7-5e1f07c2415b/
- [R26] Karger B, Kneubuehl BP (1996) On the physics of momentum in ballistics: can the human body be displaced or knocked down by a small arm projectile? Int J Legal Med 109:147-149 (summarised by AFTE, https://afte.org/?p=15912; and "Physics of firearms", Wikipedia).
- [R27] Cattuzzo MT et al. (2020) Assessment in the supine-to-stand task and functional health from youth to old age: a systematic review. Int J Environ Res Public Health. https://consensus.app/papers/details/w:397319ea-a62a-4b15-8d88-0fde7eada2f6/
- [R28] Khobkhun F et al. (2022) A comparison of turning kinematics at different amplitudes during standing turns between older and younger adults. Appl Sci. https://consensus.app/papers/details/w:ece67efb-084e-40d9-86a5-c0d262d4a75e/
- [R29] Khobkhun F et al. (2023) Biological sex-related differences in whole-body coordination during standing turns in healthy young adults. Sci Rep. https://consensus.app/papers/details/w:0ed0fa6a-b157-4c4a-ae38-a7a1fa88858c/
- [R30] He C et al. (2018) Dynamic stability and spatiotemporal parameters during turning in healthy young adults (step and spin turns). Biomed Eng Online. https://consensus.app/papers/details/w:ef966fb0-86b9-44e5-beec-cd7f773330ff/
- [R31] US Army TC 3-22.9, Rifle and Carbine (2016), the carry and ready positions: https://irp.fas.org/doddir/army/tc3-22-9.pdf; the low ready's muzzle about 45° down: https://www.police1.com/police-products/firearms/articles/rifle-sling-positions-low-ready-retention-and-high-ready-dVDi0JIeutqXVf8J/
- [R32] Leveridge P et al. (2026) Beyond en-bloc turning: head-pelvis coordination in 360° turns (healthy adults turn head-first). J NeuroEng Rehabil. https://consensus.app/papers/details/w:99bcc6c0-1a65-4985-be68-5907999202bf/
- [R33] VanSant AF (1988) Rising from a supine position to erect stance: description of adult movement and a developmental hypothesis. Phys Ther 68(2).
- [cal] `docs/qa/motion_calibration.md` §7 (ACCAD Male2, Female1; CMU 144, 141_14, 113_13, 13_17, 79_96, 80_03, 77_03/77_09).

Benchmarks and craft
- [B1] XCOM 2: War of the Chosen's script, as mirrored by X2WOTCCommunityHighlander (MIT): `XComIdleAnimationStateMachine.uc`
  (cover-side idles, peeks, targeting loops, hunker, panic, stunned, flinch, stand-to-crouch), `X2Action_ApplyWeaponDamageToUnit.uc`
  (hurt animation by hit quadrant, flinch on a miss, running flinch), `X2Action_Knockback.uc` and `X2Action_Death.uc` (directional
  knockback, kinematic death then ragdoll), `XComGameState_Ability.uc` `GetFireAnimationName` (move-end fire, turn left/right at
  ≥ 60°, kill variants). https://github.com/X2CommunityCore/X2WOTCCommunityHighlander
- [B2] Larian's video diary "General Mocappery: Combat with Mustapha" (combat, locomotion and spellcasting captured by a stunt
  choreographer; per-weapon attacks), as reported by PC Gamer
  https://pcgamer.com/games/rpg/baldurs-gate-3s-lead-mocap-choreographer-reveals-laezels-combat-stance-is-based-on-a-real-technique-that-came-to-an-ancient-samurai-master-in-a-dream
  and GamesRadar
  https://www.gamesradar.com/games/baldur-s-gate/baldurs-gate-3s-laezel-borrowed-her-fighting-style-from-a-legendary-samurais-fight-with-his-sleep-paralysis-demon
- [B3] PC Gamer, a martial artist created the motions for Baldur's Gate 3's monks (and elves' combat).
  https://pcgamer.com/games/baldurs-gate/heres-how-a-martial-artist-created-the-motions-for-baldurs-gate-3s-monks
- [B4] PC Gamer, Baldur's Gate 3 used motion capture from 248 actors.
  https://pcgamer.com/baldurs-gate-3-used-motion-capture-from-248-actors-to-bring-its-npcs-to-life-youre-not-only-hearing-the-actors-voices-but-youre-also-seeing-their-physical-performances
- [B5] D&D 5e System Reference Document 5.1 (CC BY 4.0), conditions: prone. https://www.dndbeyond.com/srd
- [B6] Wccftech (2019) Wasteland 3 interview (more animations for "action variance").
  https://wccftech.com/wasteland-3-interview-fargo-work-this-franchise-decade/
- [B7] Divinity: Original Sin 2 Q&A with Thierry Van Gyseghem, its animation director.
  https://thegg.net/interviews/divinity-original-sin-2-q-and-a-interivew-with-thierry-van-gyseghem-from-larian-studios
- [B8] Clavet S (GDC 2016) Motion Matching and the Road to Next-Gen Animation.
  https://www.gdcvault.com/play/1022985/Motion-Matching-and-The-Road
- [B9] Harrower G, Mathiesen J (GDC) Animation Bootcamp: embracing animation complexity in EA UFC 2 through procedural
  techniques. https://gdcvault.com/play/1023474/
- [B10] Fuller J, Nilsson A (GDC) Physics meets animation: character stunts in Just Cause 2. https://gdcvault.com/play/1012700/
- [B11] Zordan VB, Hodgins JK (2002) Motion capture-driven simulations that hit and react. https://ri.cmu.edu/?p=16861
- [B12] Jungbluth M (2017) Anatomy of a hit reaction. https://www.gameanim.com/2017/03/27/anatomy-hit-reaction/
- [B13] Cooper J, Game Anim: Video Game Animation Explained (CRC Press); excerpt on the principles in games (anticipation against
  responsiveness). https://www.gamedeveloper.com/production/the-12-principles-of-animation-in-video-games

Sources searched
- [S1] Quaternius UAL https://quaternius.com/packs/universalanimationlibrary.html, UAL2
  https://quaternius.com/packs/universalanimationlibrary2.html
- [S2] Truebones terms https://truebones.gumroad.com/l/vlvPq; packs https://truebones.gumroad.com/l/eTsK,
  https://truebones.gumroad.com/l/kivuW, https://truebones.gumroad.com/l/BCux, https://truebones.gumroad.com/l/CPaSkd
- [S3] 100STYLE https://www.ianxmason.com/100style/, https://zenodo.org/record/8127870, https://arxiv.org/abs/2201.04439
- [S4] ACCAD MoCap System and Data https://accad.osu.edu/research/motion-lab/mocap-system-and-data
- [S5] CMU http://mocap.cs.cmu.edu/ (FAQ http://mocap.cs.cmu.edu/faqs.php)
- [S6] HDM05 https://resources.mpi-inf.mpg.de/HDM05/
- [S7] KayKit Character Animations https://kaylousberg.itch.io/kaykit-character-animations
- [S8] Kenney https://kenney-assets.itch.io/animated-characters-3, https://opengameart.org/content/animated-characters-1
- [S9] Kevin Iglesias https://kevdev.itch.io/human-soldier-animations-free, https://kevdev.itch.io/human-melee-animatons-free
- [S10] MoCap Online https://mocaponline.itch.io/free-pistol-animation-starter-pack,
  https://mocaponline.itch.io/free-3d-sword-animation-pack, https://mocaponline.com/pages/standard-license,
  https://mocaponline.com/pages/free-pack
- [S11] RancidMilk https://rancidmilk.itch.io/free-character-animations
- [S12] KinemIQ https://kinemiq.app/free-game-animations/
- [S13] Bandai Namco Research Motiondataset https://github.com/BandaiNamcoResearchInc/Bandai-Namco-Research-Motiondataset
- [S14] LaFAN1 https://github.com/ubisoft/ubisoft-laforge-animation-dataset
- [S15] SFU https://mocap.cs.sfu.ca/
- [S16] Unreal Game Animation Sample https://www.cgchannel.com/2024/06/get-500-free-game-ready-animations-for-use-in-unreal-engine
- [S17] Eyes, JAPAN (secondary) https://www.cgchannel.com/2010/11/japanese-website-offers-over-4000-free-mocap-moves
- [S18] AMASS licence https://amass.is.tue.mpg.de/license.html
- [S19] Unity Animation Rigging https://docs.unity3d.com/Packages/com.unity.animation.rigging@1.3/manual/index.html
- [S20] Motion Matching for Unity (JLPM22, MIT) https://github.com/JLPM22/MotionMatching
- [S21] FreeMoCap (AGPL) https://pypi.org/project/freemocap/1.1.0/
- [S22] https://oudarya.itch.io/human-basics, https://maxparata.itch.io/cc0-animations
