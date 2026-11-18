# The fight's motion: root causes (owner rule, 2026-11-17: "root causes, never iterations")

Every combat-animation failure is traced to its cause with evidence (the clip on its own actor against the same measure,
then the retarget, the runtime, the prop and the state machine) and the cause is removed once, at its source. One entry
per cause: the cause, the evidence, the fix, the test. Nothing here changes a clip, the controller asset, a limit or a
hold's numbers. Gate: red (these fixes have not been measured; the verdict is stale until the next batch).

## 2026-11-17: CombatMotionPlayTests on main 84feff39 + side/combat 33d77dc0..28d6d776 (4/7 failed)

**0. The tree.** Main's merge dfc732a4 recorded side/combat 28d6d776 as merged but took only 33d77dc0's tree: main's
commits lack af582224..28d6d776 (the ready hold, the fitted weapons, the fight's feet, rounds on the hold), which the
editor's tree had applied by hand, uncommitted, when it ran the tests. Restored on side/combat (a2c7a1f0, every code file
byte-equal to the tested tree). On merge, the editor's uncommitted copy of the same files must be committed or set aside
first; identical changes then merge cleanly.

**1. "A shot played rifle_lower" (both sexes, the carbine).**
- Cause: `AnimatedUnitView`'s lowering clock (`_quietFor`) was reset at the start of `OnAim` and counted through the aim's
  own beats; `Tick` lowers once it passes `max(0.6, Secs(1.1))`. A first long-gun aim takes longer: the raise from 0.42 to
  0.95 of `rifle_raise_cmu` (81 frames at 30 fps, speed 1.5) is 0.94 s, then the 0.12 s crossfade and the facing learnt
  (≥ 5 % of the hold) before `_aiming = true`, so the aim came down the frame it was reached. Second, `Fighter.Is` counted
  the state a crossfade was leaving (`Progress` returns the current state's time during a transition elsewhere): the shot
  found the layer "in" `rifle_aim`, `OnAim` raised nothing, `OnFire` fired on the lowering gun (Current `rifle_lower`, one
  kick: the failure verbatim), and `Play`'s loop guard would have ignored a request for the hold.
- Fix: the clock counts only while the aim is held, from the moment it is reached and from each round's end; `Is` is the
  layer's destination (the next state in a transition; a crossfade asked this frame at once), never a state being left.
- Test: PlayMode `CombatMotionPlayTests.TheAimHoldsUntilQuietAndAShotNeverLeavesALoweringGun` (an aim onto a target at the
  side held for 0.8 of the delay; a shot asked as it comes down kicks on `rifle_aim`); `EveryActionPlaysItsStateAndComesBackToTheStance`.

**2. "The fight's layer still weighs 1.00 after the end" (every weapon, both sexes).**
- Cause: `AnimatedUnitView.End` held a yielded fighter in `yield_hold` for 1.5 s after `OnEnd` before it asked
  `Fighter.End`; the layer stayed at full weight past the end, and began its 0.5 s fade just as the test looked, 1.5 s on.
  (The layer is not stuck forever; it is held past the end, which is what corrupts measures taken after a fight.)
- Fix: the hold after the end is gone: hands held up come down as the layer lets go, the weapon thrown down is taken back
  into its holster or sling.
- Test: `EveryActionPlaysItsStateAndComesBackToTheStance` (1.5 s); `TheEndHandsTheBodyBackAndGoesWithIt` (0.8 s, the weapon slung).

**3. MissingReferenceException at `Fighter.Make:260` ← `Equip` ← `PickUp` ← `AnimatedUnitView.End:501`.**
- Cause: the order of teardown. `End` (and `Rise`, which waits up to 14 s for a get-up and then takes the weapon up) ran on
  the fight's host, a MonoBehaviour that outlives the bodies. `TheFightsFeetStandOnTheGroundAndStepBetweenStances`
  destroys each body 0.3 s after `OnEnd`; 1.5 s after `OnEnd` the host resumed `End`, `PickUp` found no weapon, `Equip`
  spawned one and `Make` read `gameObject` through the destroyed `Body` (12.6 s into the test: 1.5 s after the first person's end). The
  same ownership let a finished fight's pending end (a man's relax, up to 3 s) release the stance of a new fight's view on
  the same body (the gate makes new views on the same fighters).
- Fix: a fight's hand-back of a body runs on the body itself (`Fighter.HandBack`; `OnRise` on the `Fighter`): it stops with
  the body; `Fighter.Ensure` (a new view taking the body) stops a pending hand-back; a body deactivated during it lets the
  layers go at once and puts its weapon away in its first frame back.
- Test: `TheEndHandsTheBodyBackAndGoesWithIt` (bodies destroyed after the end, mid get-up and mid relax raise nothing and
  leave no weapon lying; a new view on the same body keeps its stance); `TheFightsFeetStandOnTheGroundAndStepBetweenStances`.

**4a. The off elbow straight (2°) in a long gun's ready and carried walk, the off hand within 2 cm of grip_off.**
- Cause: a runtime model mismatch, not a clip or a limit. Core `PlaceHold` kept grip_off within 0.95 of `Hand.Reach`, the
  shoulder-to-palm length of a straight arm and wrist, and the Core test checked the elbows on that palm model. The IK
  (`Hand.Reach_` → `TwoBone.Solve`) ends at the wrist with the hand turned to the grip: on a fore-end (palm up, fingers
  across it) the palm's centre lies across the line from the shoulder, so the palm reaches 6-8 % less. At 0.95 of the palm
  reach the wrist fell at 0.99-1.03 of the arm, TwoBone clamped the arm straight and the palm stopped just short (WG2
  passed). On the chain model the old placement left the off elbow under 20° on 100 of 324 long-gun bodies of the Core
  grid, 60 at 2° (the man's ready, in the unclamped region, passed; the club, hands together on the handle, never failed).
- Fix: `PlaceHold` keeps the off hand's wrist (its palm on grip_off, the palm's offset measured from the body's own hand,
  `Hand.PalmFromWrist`, through the grip's frame) within 0.95 of the off arm's chain to the wrist (`Hand.Arm`). The palm's
  centre shares are Core's (`CombatMotion.PalmAlong`, `PalmOut`), used by `Hand`.
- Test: EditMode `CombatMotionTests.TheReadyHoldsBendTheOffElbowOnTheIkChain` (off elbow ≥ 37° after; 100 failures before);
  PlayMode `TheReadyHoldsHaveBothHandsOnTheWeapon`.
- For the remeasure: on the chain the main elbow reaches 122-125° on the two smallest bodies (shoulders 0.31-0.36 m, reach
  0.55 m, the off shoulder 4 cm up) with the bolt rifle (117° before): the grip comes in toward the off shoulder so the off
  arm keeps its bend. The holds' sizing (80-120° on the palm model) is not changed here.

**4b. Crouched behind cover: the main elbow 15-43°, the off 2-6°.**
- Cause: `cover_down` played its captures' own hands (`HandsIk.Clip`), and they are ACCAD's unarmed crouches: with a long
  gun the hold ramped out as the crouch began, the off hand let go for the whole way down (2.4 s; a woman's 3.3 s), the gun
  hung from one straight arm, and the hold ramped back in over 0.15 s when `cover_hold_long` began. The test's crouched
  frames start there, on the clip's arms.
- Fix: `cover_down` holds (`HandsIk.Hold`) as the stances either side of it do; a state that holds is a two-handed weapon's
  hold only (a pistol's or a blade's hands on the way down stay the clip's).
- Test: EditMode `CombatMotionTests.ATwoHandedWeaponStaysInBothHandsIntoCover`; PlayMode `TheReadyHoldsHaveBothHandsOnTheWeapon`
  now measures the way down too.
- Left as found (not measured): the hold's line switches from the standing to the crouched hold in one frame when the
  stance is asked (`Crouched`), and back when standing; `cover_leave`, the heavy hits and the slips still play their clips'
  hands with a two-handed weapon (the same question as `cover_down`).

## 2026-11-18: combat set v4 on the gate batch's tree (CombatMotionPlayTests 6/9, then 8/10 with the hands-up window)

This round adds one state to the people's controller (the base layer's `fight_stand`, built by `CombatAnimatorBuild`) and
changes no clip, limit or hold. Probes: `FightProbeTests`, `KneeProbeTests`, `LookProbeTests` (temporary, not committed;
their outputs under `unity/test-results/`).

**5. "The aim's straighter knee bent 27.3° / 19.3° (the clip's 1.7)": Unity's Foot IK, applied by the base layer under the
fight's layer.**
- The hypothesis of 2026-11-17 (the bodies' T-pose float feeding `Fighter.Feet`'s hip drop) is refuted: with every body's
  T-pose stood on its root (MOTION_ROOT_CAUSE §9) the man's knee went from 19.3° to 27.3°.
- Evidence, from the take outwards (the straighter knee, the angle between thigh and shin):
  - `rifle_aim_b_cmu` (CMU 80_03) as recorded (a Generic copy of the file): 7.2° on every key. On its own avatar: 7.2°. Played
    bare on Male_Adult_08 and Female_Adult_01 (a playable, no runtime system): 7.2°. The retarget is exact.
  - The same with Foot IK: 17.2° / 16.1° median, 21.2° / 19.9° max. That is the game's pose before `Fighter.Feet` (17.2 / 16.1,
    the probe's component at execution order 25).
  - Foot IK bends a straight leg on every clip: `rifle_ready_built` 9.7° → 20.0°, `idle_m` 0.0° → 18.9° (man) and 21.0°
    (woman). The ankles move under 1.4 cm: a near-straight knee turns 10-20° for a centimetre.
  - The fight's states are built without Foot IK. Unity applies it by the base layer's state under the layers over it. With
    the base layer moved to `sit` (no Foot IK) during the aim, the knee before `Fighter.Feet` is 7.2° on both bodies; back on
    `Locomotion`, 17.5° / 16.2° again.
- Fix: the base layer has `fight_stand`, its own locomotion (the default state's motion, speed and parameter) without Foot
  IK. `Fighter` crossfades the base into it at the same phase over 0.25 s while the fight's stance has the body, and back as
  the stance gives it up; a base in any other state is left as it is. Result: before `Fighter.Feet` the aim's straighter knee
  is 7.2° on both bodies (median and max).
- Test: `TheSetIsTheGames` holds the base state (present, no Foot IK, the base's own motion);
  `TheFightsFeetStandOnTheGroundAndStepBetweenStances`.
- Open, item 5b below: the step between the ready's and the aim's stances.

**5b. What remains of the knee: the standing leg while the other foot steps between two takes' stances.**
- On the first frames after the crossfade into the aim, the ready's feet (`rifle_ready_built`) and the aim's (CMU 80_03),
  two takes, stand 6-7 cm apart. `Fighter.Feet` holds both feet and steps them one at a time.
- While the left foot steps (lifted 4.7 cm), the right is held 7.2 cm from where the clip's leg reaches. The leg folds to reach
  it: 24-25° on the man, against 7.2° before `Feet`. Settled, the aim's straighter knee is 1.8° median, 8.6° / 9.6° max.
- Real actors' aim K1 is up to 33.5° (`docs/qa/motion_calibration.md` §8), so the gate's limit holds it. The test's "within 6°
  of the clip's own" does not, during the step.
- The two stances are two actors'. `rifle_ready_built` is built on ACCAD Male2_A1_Stand (the women's `rifle_ready_f_built`
  on Female1_A01_Stand); `rifle_aim_b_cmu` is CMU 80_03, for both sexes. Their stance widths are 14.5 cm (ready) and 22.1
  cm (aim) on the women.
- Not an IK item. The fix is a matched pair, made in staging (`combat_v4.py`): an aim built on the ready's own captured
  stance, as the ready itself is built, or CMU 79_96's own captured pair (`rifle_raise_cmu` → `rifle_aim_cmu`).

**6. "Hands up played yield_enter, holds yield_enter" (every weapon, both sexes).**
- Cause: the test waited 1.5 s for the hold. The old way up (`surrender_enter_ual`) was 0.8 s; v4's
  `surrender_enter(_f)_built` is 2.0 s (61 frames at 30 fps, clip QA passed). The state machine was right.
- Fix: the test waits as long as the way up plays to its cut, plus its fade (`Set.Length` × (cut − from) / speed + fade).

**7. "The off hand 3.2 / 5.3 cm from its grip" (Female_Adult_01, the carbine and the bolt rifle).**
- Cause: `AimFix` turned the long gun onto the target by the main wrist alone, up to 12°, and it ramped in over 0.15 s as the
  aim was asked, while the take's gun was still coming up.
  - The gun is 18-83° off the target during the raise (36° median); settled it is 4.4° off (max 7.8°, mostly pitch: the
    target lower than the take's line).
  - Turned at the wrist, the fore-end, 40-55 cm ahead of the main hand, swung by up to 8-11 cm, past her arm's reach (the
    shoulder to grip_off went from 48 to 56.7 cm against an arm chain of 49.3).
  - The error rose with the ramp (0.12-0.16 s) and fell as the take came in.
  - With the correction held off (a probe clearing the aim before `Fighter`'s hands), the carbine's off hand stayed within
    1.1 cm. The bolt rifle's stayed within 1.1 cm through the raise and 2.5 cm on 6 frames of the burst.
- Fix: the correction is made by the upper body, as a rifleman does. The gun, in both hands with its stock in the shoulder,
  turns with the trunk as one piece: the spine, chest and upper chest take a share each, and the arms, head and gun go with
  them, so the off hand keeps the reach the take gives it.
- It corrects an aim, never a gun still coming up: fully within 12° of the target, fading to none at 24°.
- Test: `WeaponsStayInHandAndTheOffHandOnItsGrip`.

**8. The import (EditMode).**
- `walk_to_crouch_accad` (a spare, played by no state) is out. v4's file has no Spine joint, so Unity builds no avatar from it.
  Male1's take of the same action stays.
- v4's beats may sit on a clip's first or last key: the hits start at their impact, the side steps at their lift, and a dodge
  is clear on its last key. `TheBeatsComeFromTheSidecars` holds them on the clip ([0, 1]; `CombatSet.Beat` reads −1 for none).

**9. The gate measured v4's new sets against the old ones' limits (pick v4a: "A1 combat:strike 42 → 50" and the like).**
- Cause: `HumanMotionGateTests.Fighting` named every record by the gate's action, not by the state the table plays:
  - v4's two-handed blows (gate `strike2`) were measured as `combat:strike:club2`, against the unarmed strike's limits;
  - every miss (a block for a man with fists or a blade, otherwise a slip or a duck: gate `dodge`) was measured as
    `combat:strike:<arms>_block`.
  - So the real actors' limits of `docs/qa/motion_calibration.md` §8 for those sets were never applied.
- Fix: each person's records are named by the gate of the state the table plays for them (`CombatMotion.Strike` and
  `CombatMotion.Miss` by sex and weapon).
- The ratchet's alias for `dodge` is `strike`, not `hit`. The baseline measured every miss under the strike action, whatever
  the table's own gate for misses was then (`hit`). (`motion_gate_inputs.json` `aliases_about`; `docs/PEOPLE_MOTION.md` §1.9;
  `tests/people_gate_ratchet.test.ts`.)
- Pick v4b, on the same tree with the labels:
  - better: A1 strike 50 → 22, A2 strike 84 → 58;
  - still worse than dfc732a4, from the dodges: F2 strike 1 → 20, H3 strike 0 → 18, Kb strike 20 → 38. These are mostly
    women's `miss_duck` (CMU 77): Kb 152.7° against that actor's own 129.2 (§8 dodge, unisex). Being traced: the runtime adds
    23° to a captured knee.

**10. The people's controller lost its locomotion on a second build (whole cast 07:14, chunk 0: every everyday state failed).**
- Symptom: knees fixed at 80° and soles 82-90 cm under the ground on every frame, in every state, for everyone.
- Cause: `CombatAnimatorBuild.StanceBase` removed an existing `fight_stand` before adding it again.
  `AnimatorStateMachine.RemoveState` destroys the state's blend tree with it, and `fight_stand` shares the base layer's
  locomotion tree. The second build (the v4.1 rebuild) left the Locomotion and `fight_stand` states with `m_Motion` fileID 0.
  The v4.1 CombatMotionPlayTests numbers measured then (the aim knee 25°, soles 1.6-3.1 cm, the men's pistol off hand 5 cm)
  were taken on that broken base and are to be measured again.
- Fix: `fight_stand` is updated in place, never removed, and the build refuses a base with no motion. `GateBatchSetupTests`
  builds the locomotion first and asserts both states share a live tree. The controller test in `CombatMotionPlayTests`
  asserts the base's motion is not null; it passed before because SameAs held with both null.
