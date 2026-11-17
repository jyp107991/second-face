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
