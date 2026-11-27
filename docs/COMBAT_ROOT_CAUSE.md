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

## 2026-11-18 (later): the head cells of chunk 0, traced (editor owner)

**11. The new H1/H2/H3 cells (ready, reload, yield, strike, hit, throw, aim_pistol): every clip stood in its take's frame
plays with the body turned 180° from the body's root.**
- The hypothesis of the hand-off (the gaze's head weight 0.9 at small look angles) is **refuted**: the look angles are not
  small. Probe (`HeadProbeTests`, PlayMode, temporary; the gate's own H1-H3 through `MotionProbe.Face`/`ChestForward`, the hips'
  and chest's yaw against the root's front, the weapon's line; the fight driven as the gate drives it; Business_Female_01 and
  Business_Male_01, the gaze as the game has it and switched off; `unity/test-results/head_probe2.csv`):
  - With the root facing the target (+Z), the hips and chest stand at **178-180° from the root's front** in every state whose
    clip carries `root_basis: take` (combat set v4.1): `pistol_idle`, `pistol_aim`, `pistol_reload`, `rifle_idle` (ready, hit),
    the men's `club2_idle`, `yield_enter`; `rifle_aim` and `rifle_reload` 124-144° (the root turned 84-88° by the learnt gun
    line). The clips stood on their first key (v4's `club_ready_f_built`, `guard_f_cmu`, `fist_guard_accad`) face the root's
    front within 2-16°. A capture from behind the root shows the man's pistol ready facing the camera, the woman's club ready
    showing her back (`unity/Screenshots/_red_headprobe_*`, red gate: never sent).
  - The gaze, with no target in a fight, draws the head along the root's front: onto the target, behind the body's back.
    Unity's look-at turns the head round to 173-178° on the chest (H2 p98) and rolls it 38-69° (H3); with the gaze off the same
    states read H2 3-15°, H3 3-7°. With the old body weight (0.25) the look-at turned the whole chest round instead (the
    baseline's small head cells hid it).
  - So the people fight with their backs to the target: ready stances and hands-up face away; the pistol's aim is put on the
    target by the hands' IK behind the body; the long gun's aim is pointed by turning the root to the learnt gun line.
- Cause: the take frame's +Z (the chain's first-key body orientation, or the aim's gun line) is Unity's −Z once imported
  "based upon Original": the clip files' frame convention (`tools/unity/motion/combat_v4.py` `build_framed` with
  `stance_continuity.body_yaw`'s axes) and the import's basis disagree by a half turn. Clips on their first key are
  normalised by Unity and never show it.
- Fix (at the source, not in the gaze; coordinator's decision): the converters' frame yaw corrected so that a take's +Z is
  Unity's +Z under "based upon Original", a clip-QA check that every take-basis clip imported that way faces +Z, and every
  `root_basis: take` clip of v4.1-v4.5 re-staged as one set (staging combat/v4_6, the offline helper); no import offset (it would
  turn the body, not the take's places). The v4.2-v4.5 imports wait for v4.6. Nothing is changed in `Gaze` for it.
- Gate hole closed: a facing measure for the fight's states (the pelvis's and chest's yaw against the target, within real
  fighters' limits per state; `docs/PEOPLE_MOTION.md` §2.7), recorded as a new measure.

## 2026-11-25: the combat tests on the healthy controller (editor owner, a fresh container)
The controller rebuilt (Locomotion, then Combat; the base layer's motion asserted, `fight_stand` sharing it), combat set v4.6's
124 clip metas configured by their importer on the cold import. EditMode (combat, import, ground) 106/109, PlayMode (combat)
13/16 with the gate's pick counted; main's last CI PlayMode run failed 8, three of them CombatMotionPlayTests
(EveryActionPlays, NoStateIsLeftHanging, WeaponsStayInHand): the last two pass here.

**12. "Travels 0.16-0.35 m (root: true) but is baked in place" (21 clips: the women's rise and its long form, 19 re-stance
steps).**
- Cause: Core's table (`CombatMotion.Clips`, `Spare`) baked them while their v4.6 sidecars say they travel (`root`: true, 16-35
  cm), against the table's own rule (a one-shot over 15 cm is applied or cut). The women's rise (`rise_f_built`, CMU 114_05,
  35 cm back as she steps up) is what `cover_rise` plays for every woman: baked, her feet slide it back.
- Fix: the 21 are `RootXZ.Apply`, as their sidecars say; their imports follow the table (the importer applies it on each
  import; the batch's setup imported the 21 again). Test: `RootMotionAgreesWithEachClipsTravel` passes.

**13. "After standing up, cover_rise (not back to the idle within 2 s)" (every weapon, the man).**
- Cause: the test's window. v4.4's men's rise is ACCAD Male2_D13's own, 82 frames (2.7 s) to its cut at 0.97, where the old
  one took under 2 s; the state goes on to the idle as the table says.
- Fix: the test waits as long as the rise plays to its cut, plus its fade (as item 6 for hands up). Passes.

**14. "Sequence contains no matching element" (`TheBeatsComeFromTheSidecars`).**
- Cause: the test named `fist_jab_accad`, which combat set v4 moved to the spares (the men's jab is CMU's `fist_jab_m_cmu`).
- Fix: the test asks the table for the men's jab and checks its impact against its own sidecar. Passes.

**15. Open: `TheFightsFeetStandOnTheGroundAndStepBetweenStances` (new in this batch; item 5b).**
- On the healthy controller: the aim's straighter knee 23.1-23.7° (the long gun's aim is CMU 79_96's `rifle_aim_cmu` since
  v4.1, whose own straighter knee is 0-0°, `docs/qa/motion_calibration.md` §8; the test's comment still names 80_03's
  1.2-1.7°, the limit 1.7 + 6 holds either way); the lower sole 0 … 1.9-4.6 cm over its ground (within 1); a planted foot
  over 10 cm/s on 2.4-4.2 % of its frames (≤ 2), with the long gun and fists.
- The ready (`rifle_ready_u_built`) and the aim are now one actor's chain (79_96), so 5b's "two actors' stances" no longer
  explains the knee; the runtime bends it. Not traced in frames yet: the first item of the next batch (listed in
  `docs/qa/gates/motion_waivers.json` `failing_tests`).

**16. `ThousandsOfFightsKeepTheHardRules` timed out here (388 s against its 180 s).** A pure Core test; it passes in the Core
workflow (dotnet) on main (dfc732a4). To be read on CI after the push; never loosened.

## 2026-11-26: the fight's feet (editor owner)

**17. The fight's feet: F4 in every aim and guard, F1 in the standing stances, `TheFightsFeetStandOnTheGroundAndStepBetweenStances`
(item 15).** On cast 3's whole-cast verdict the feet were half of the fight's failing cells (F1 774, F4 608, F3w 333, F2 111 of
3,815); F4 in the long gun's aim and the pistol's 395, the guard's 104.
- Evidence, from the gate's own frame traces (`motion_gate_full_0_trace.csv`, Business_Female_01 and Business_Male_01, the cast's
  first woman and man, every runtime system on):
  - In the long gun's aim the straighter knee reads 1.8° on every frame: the two-bone solver's limit (the hip to the target
    clamped 0.1 mm short of the leg's length), so the foot's target is out of the leg's reach. The clip's leg (CMU 79_96) is
    straight (0°); its heel hangs 1.8-2.1 cm, its ball 1.0 cm over the ground. The standing foot plant (idle) holds the same
    leg at 3.6° (`FootPlant.StanceStraight`, 0.9995 of its length), on every frame: reachable by design.
  - The same clamp in the guard (the woman's right leg: its heel rises 2.4-3.1 cm and the foot moves 17 cm/s once a loop),
    the ready, both aims, the blows (the woman's at the clamp on 124-273 of 360 leg-frames a state).
  - At every round of the long gun's aim both ankles jump 1.5-2.2 cm in one frame (88-135 cm/s) with both knees unchanged and
    the pelvis unmoved against the root, then drift back over about 0.2 s; the same at the aim loop's seam. Both legs swing as
    one piece about a joint above the hips.
- Causes:
  1. **The trunk's corrections turn the bone the legs hang from.** Biped's thighs are children of `Bip01 Spine`, Unity's Spine
     bone (the bodies' `humanDescription`: `Bip01 L Thigh` parent `Bip01 Spine`; Hips is `Bip01 Pelvis`). `Fighter.AimFix`
     turns the trunk `{Spine, Chest, UpperChest}` a share each onto the target, after `Fighter.Feet` has set the feet: at a
     round the recoil pitches the chest 2.6-4° back, the fix takes a third of it back on the Spine, and both legs swing about
     it (a degree there moves a foot 1.7 cm). The hit's spring turns the Spine too. The foot plant learned the same of these
     rigs (`FootPlant.Level`: "the chest held, not the spine: on these rigs the thighs hang from the spine").
  2. **The hips are set for the lower sole, not for the legs' reach.** `Fighter.Feet` brings the hips down until the lower
     sole meets its ground and leaves the higher up to 1.5 cm over its own for its leg to reach ("on a slope ... so the
     downhill leg reaches"). Where the higher foot is the clip's straight leg it cannot reach: the solver lays the leg straight
     toward the target, the foot hangs short of the ground and moves with the hips' sway. The foot plant met this in quiet
     standing and set the hips by each leg's need (`FootPlant.LegNeed`: "set for the lower foot's leg alone, the other leg, the
     clip's straight one, could not reach and its heel stood 2-3 cm up, F1"; "drawing the far foot in instead slid it along the
     ground as the hips swayed, F4 2 -> 130").
- Fix, each once at its source (`Fighter`):
  1. The trunk the corrections turn is its bones above the legs (any bone the thighs hang from is left out: on these rigs the
     chest and the upper chest); the hit's lean starts from the lowest of them.
  2. The hips come down at least as far as each foot the clip has down needs for its leg to reach its ground nearly straight
     (`Fighter.LegNeed`, `StandStraight` 0.9995, the foot plant's rule), at the planted place; the old rule stays the least.
- Result, on the fight states of Business_Female_01 and Business_Male_01 (`FeetProbeTests`, temporary: the gate's fight sequence
  with the feet's own internals read every frame, before and after; at the editor's variable step, so the speeds are noisy):
  the long gun's aim's planted feet off their pins p98 4.0-6.2 -> 0.0-0.1 cm; frames with a foot over 10 cm/s in the aim
  8.9 -> 4.1 %, at the shot 11.5 -> 5.8 %, in the burst 25.8 -> 4.0 % (the man's 13.3 -> 4.9, 35.9 -> 5.4); the straight leg at
  the solver's limit 50 % -> about 5 % of leg-frames, its sole p98 1.53 -> 0.09 cm over the ground; the pistol's aim at the limit
  50 -> 6 %, its sole 0.31 -> 0.01 cm, its shots 11.6 -> 4.5 %. F4's limit is 2 % of the frames: the aims are still over it.
  The whole cast (2026-11-27, the batch's commit): F1 1,511 -> 743, F4 499 -> 165, K1 578 -> 133 against dfc732a4; F4 in the
  guard (104) and F3w (333, the same value on every body of a sex: clip-level) stand as on cast 3's tree; Kb in the strikes 129 ->
  154 on cast 3's tree, likely the hips' new rule bending both knees further (to confirm). `TheFightsFeetStandOnTheGroundAndStep
  BetweenStances` still fails: the aim's straighter knee 23.5-25.1° (its clip 1.7; item 5b), the fists' lower sole 0.0-1.4 cm over
  its ground against 1 (1.9-4.6 before); the skate is gone. Open: the aims' and the guard's foot speeds at the gate's fixed step
  (4-5 % of frames over 10 cm/s against 2 %), then item 18.

**18. The fight's cells clip by clip (2026-11-27, editor owner): each group measured bare before the runtime was touched.**
- Grouping (the whole cast of 2026-11-27 04:34, `motion_gate_full_<k>.chunk.json`): every failing fight key falls in groups of
  79, 54 or 25 people (the whole cast, every man, every woman) with near-identical values; only C1 varies by body. So every cause
  sits in a clip, its retarget or the runtime, never in a body.
- Measured (`ClipProbeTests`, temporary, not hashed): each of the fight's 76 clips bare (a playable, no Foot IK, no runtime system)
  at the gate's fixed 1/60 s step, on its own actor (bone measures with MotionProbe's own definitions) and on two bodies a sex
  with MotionProbe itself, judged by the gate's own limits. Bare equals the game to 0.1 in most clip groups; the retarget keeps
  every knee angle exactly (bare equals the own actor's).
  - In the clip or its staging (fails the same on its own actor and bare on every body): the long gun aim's head (H1, bare
    -30.5/-31.8 against -7.1; the converters do not re-base CMU and 100STYLE heads on the actor's own relaxed stance as the
    calibration does), the aim's elbows (A2: the staged clip's trigger elbow at most 101°, its arms the staging's IK onto the
    rifle), the long gun ready's and aim's facing (FY1/FY2), the women's built stances (F3w 14.3 cm in the pistol's and club's
    ready, the pistol's aim, the hit, the club blow), the throw's stance, the men's melee guard's elbows, the club blow's arms, the
    thrust's facing, the guard's feet (F4: bare 30 % of frames over 10 cm/s).
  - In the retarget: the men's punches' upper arm (+10°), the crouch's stance width (12-19 cm on its actor, 5.5-10.7 bare).
  - In the runtime: the knees (below), the men's aim's upper arm (bare 66°, game 43°), the men's slash's upper arm and head, the
    club's off hand (WG2), hands up's feet (F1/F2/F4), C1 in most sets.
  - Definitions (for the gate's owner, nothing changed): the calibration takes the fight's A1/A2 as the per-frame maximum over the
    two arms (`tools/qa/calibration/combat_states.py`), the gate pools both arms: a CMU jab on its own actor reads pooled A2 p2
    20.1 (fails 83.9) and per-frame max p2 127.3 (passes); the gate's crouch includes the way down's first, still standing
    frames, the calibration's crouch only frames with the hips at 0.70 of standing height or lower; F3w is calibrated across the
    pelvis's front and measured across the root's.

**19. Cause B, the planted feet 7-11 cm apart in height on the bodies where the clips' actors stand them level: Unity's humanoid
retarget onto the Biped bodies (editor owner, 2026-11-27).** Found under item 18: in the club's blow, the men's guard and the
crouch's hold both feet are planted by the clips' own record, level on their actors, 7-11 cm apart on every body of a sex; the
fight's feet then folded one knee to reach (K1 in the club's second strike, Kb in the crouch and the strikes).
- Traced to its source (`docs/MOTION_ROOT_CAUSE.md` §16, `LegTraceProbeTests`, temporary): not the bodies' proportions (a body
  with the actor's leg lengths and hip width stands its feet as far apart or further) and not a disagreement at muscle 0. With
  the same human pose read back on both, the body's whole skeleton stands turned 2-19° from the actor's (Unity reads the body
  orientation from the joints' positions, and the Biped's clavicles hang from its neck and its thighs from its spine); and on the
  actors converted from CMU's skeleton (a hip joint bone between the pelvis and each thigh) the thighs stand turned 2-64° more,
  growing with the hip's bend. Once the hips and the thighs take the actor's rotations (each from its own muscle-zero pose), the
  shanks and feet match the actor's to 0.00° and the planted feet stand as the actor's directions on the body's own legs put
  them (the men's guard 7.2 -> 1.0 cm, the actor's 1.2; the women's guard -3.0, the actor's -3.1; the club's blow p98 8.8 -> 3.5,
  the rest the hip joints' own placement on the body).
- Fix, at the retarget's output, once per clip and skeleton (`CombatSet.ClipTurn`, baked by `CombatAnimatorBuild.Turns` in
  `RefreshFacts` and `Build`): every clip the fight's whole-body layer plays, on its own actor and on each body skeleton of the
  game's people (all 79 people verified by a skeleton key: two skeletons, the 54 men's and the 25 women's), every frame: the
  hips' turn onto the actor's, each thigh's, and the shift along the ground that puts the middle of the hip joints at the actor's
  (the height is left to the fight's feet); nothing set by hand; keys left out where easing between their neighbours errs by under
  0.1° and 1 mm. `ClipTurnFirst` (execution order -30) has `Fighter.TurnOntoTheActor` put it on the hips and thighs before every
  other system reads the pose: the clip's turn at its time, the next state's across a crossfade by the transition's weight, all
  by the layer's weight; nothing while the layer weighs nothing (the everyday states untouched). A test fails when a clip or a
  skeleton changed and the set was not baked again (`TheClipTurnsAreBakedFromTheClipsAndSkeletonsThereAre`, the stamp over the
  clips' files and the skeletons' keys, and two clips baked again equal to the stored), and one that nothing pops across the
  crossfades between stances (`TheTurnOntoTheActorEasesAcrossEveryCrossfade`).
- Size and cost: two body skeletons over the 79, 142 whole-body clips, about 8,200 keys (480 KB as floats in the set, packed in base
  64); the runtime 5.2 µs a person a frame (the editor, 422,000 calls).
- (b) is a compensating bake, not a cure (`docs/MOTION_ROOT_CAUSE.md` §16): the rig's re-parent at import ((a), a later batch) must
  bring the same bake to about nought on every clip, and then the bake and its runtime go.
- The same turn for the base layer's sits (the walker on a chair: a foot 0.32 m up, the take's 0.05): `CombatSet.Seats` (3 sits x 2
  skeletons, 766 keys, 46 KB as floats, its own stamp, `TheSeatsTurnsAreBakedFromTheSitsAndSkeletonsThereAre`), applied by
  `SeatTurn` while a state tagged "sit" plays; the crossfade test covers the sits too.
- Results: the fight screen on all 79 at the fixed step, against main's code: 3,982 -> 3,320 fight cells (3,315 -> 2,688 without
  FY1/FY2). Down: F1 strike 422 -> 236, F1 guard 82 -> 0, F1 ready 54 -> 0, F4 guard 77 -> 0, Kb strike 154 -> 7, Kb crouch 54 -> 19,
  A1 strike 162 -> 110, F2 strike 75 -> 43, F2 crouch 2 -> 0, FY1 aim 189 -> 129. Up, traced: C1 crouch 68 -> 79 (cover_hold_long's
  arms), C1 yield 0 -> 8 and F4 yield 61 -> 79 (the crossfade into yield_enter: the planted feet's first two frames, the pins' own
  entry, not the turn's blend), FY2 aim 212 -> 237 (the clip's own actor fails it too: p2 54.4 against 56.3). LegNeed taken out
  (it folded the planted leg: Kb strike +24). The pop proof: with the crossfade's blend taken out the crossfade test fails (49° in
  a frame at the pistol's rise from cover); restored, it passes. WHOLE_CAST

**20. Next: the fight's remaining groups by count, as item 18 found them** (each clip bare on its own actor against the same measure,
then the retarget, the runtime, the prop, the state machine; the waived fight keys first, `docs/qa/gates/motion_waivers.json`), after
the next batch's trunk convention (`docs/MOTION_ROOT_CAUSE.md` §17), which changes both ends of the retarget at once.
