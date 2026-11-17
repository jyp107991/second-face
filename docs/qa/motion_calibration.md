# The motion gate calibrated on real people (T1, 2026-11-17)

Gate: **red, 55** (verdict 63a0e244; this work changes no limit and no file the gate hashes). Track T1 of
`docs/MOTION_ROOT_CAUSE.md`: every gate measure that can be read on a skeleton (A1-A3, H1-H3, K1-K5, F3, F4, W3-W5, and
proxies for F1, F2, F5, W1, W2, W6) run on the source captures, **on the actors' own skeletons, at their real frame
rates**, women and men, and compared with the limits of `docs/PEOPLE_MOTION.md` §2. Numbers: `docs/qa/motion_calibration.json`
(every segment's verdict per measure, its gait, and the summary). Code: `tools/qa/calibration/` (`skel.py` readers,
`measures.py` the gate's definitions, `calibrate.py` the trials and the summary).

**Nothing here moves a limit.** Section 5 proposes; the main session decides, and any change goes into
`docs/PEOPLE_MOTION.md` with its source.

## 1. Who was measured

| Source | Licence | Person (sex as the database records it) | Rate (basis) | Takes used |
|---|---|---|---|---|
| ACCAD Open Motion Project, Female1 | CC BY 3.0 | a woman | 30 fps (file; gravity on her jump 30.9, skipping 30.0) | Stand, Wait, Sway, Look; Stand-to-walk, Walk-to-stand, Walk (long steps); Run, Walk-to-run |
| ACCAD Male1, Male2 | CC BY 3.0 | two men | 30 fps (file; Male2's B3 walk and A4 at 120) | Stand, Sway, Look around; Walk, Stand-to-walk; Run |
| CMU 113 / 111 / 114 | CMU (free for all uses) | one woman after pregnancy (113) and pregnant (111, 114) | 120 (listed) | 113_21 standing, 113_25 walk; 111_28, 111_34, 114_13 (reported apart as `f-preg`) |
| CMU 141 (= 106) | CMU | a woman: subject 106 is titled "Female General Subject" and its files are **byte for byte subject 141's** | **60** (listed 120; gravity on its own jumps 04-06 fits 56-60 fps, and its runs read at 120 would be 335-354 steps/min) | 141_01-03 run, 141_19/25 walk (curved paths) |
| CMU 104 | CMU | a man ("neutral Male walk") | 120 | 104_02/19/35 walks, 104_01/37 jog and run |
| CMU 07, 08, 35, 16, 09, 12, 69, 02, 82, 77, 140, 40, 137, 143 | CMU | **sex not recorded** (`u`) | 120 listed; 77 at 60 (listed); **143 at 60** (listed 120; its jumps fit 58-61) | the game's own sources among them (07_01/04/12, 08_01, 35_17, 16_35, 09_01, 77_02, 82_08) |

Statures are not recorded by either database; each trial's json row carries an estimate from the leg bones (Drillis &
Contini: hip joint 0.530 H, ankle 0.039 H), within about 5 %. Segments: standing = the hips nearly still (< 0.15 m/s) in
windows of up to 8 s; **quiet standing** = those whose wrists stay below the hip joints (+5 cm) 95 % of the time (arms
hanging: the rest pose the standing limits are written for); moving = the steady stretch between the first and last heel
strike. 32 standing segments (14 quiet), 7 looking, 34 walking, 21 jogging/running, from 12 named subjects and 16 unnamed.

How the source differs from the game, and why it does not bias the comparison: the body's front is the pelvis's forward
averaged over 3 s standing and the travel over a stride moving (the converter turns a clip to the same); the face's frame
is the head bone's rest frame, which the converted clip's T-pose maps onto the avatar's neutral head (so a capture's H1 is
what the game's H1 would read from that clip before Gaze); ACCAD Male1/Male2 keep MotionBuilder's local axes, relabelled
to the body's frame by one of the 24 axis permutations (never a fitted angle). Posture measures are read at the
capture's rate; speeds and soles at the game's (the converter's 30 fps keys sampled at 60 Hz).

## 2. Frame rates (a finding beyond the one already known)

- CMU **77** at 60 (listed): the game's `idle` played at twice its speed (known; re-exported at 60 in staging).
- CMU **141 / 106** at **60**, listed 120. Gravity fitted to the pelvis in the flight of its broad jumps, side jumps and
  jump twists reads 39-45 m/s² at 120, i.e. 56-60 fps; its runs at 120 would be 5.8 m/s at 354 steps/min (beyond any
  sprinter), at 60 a 2.9 m/s jog at 177. **The game's `stretch` (141_13) has also played at twice its speed**, and it is a
  woman's capture playing on every man.
- CMU **143** at **60**, listed 120 (jumps 05-06: 58-61 fps). Not used by the game.
- CMU 13 at 120 confirmed (its jumps: 118-119 fps). ACCAD Female1 at 30 confirmed (her jump 30.9, her skipping 30.0).
- The method's bias: the pelvis is not the centre of mass, so a run reads 1-15 % fast (CMU's 120 fps runs: 121-138); it
  tells 60 from 120, not 110 from 120. `tools/unity/motion/clip_qa.py` runs it on every clip's source.

## 3. How real people score, by measure

Per segment the gate's own verdict (p2, p98, the caps, the mean and the share over); "per-segment p98" is min / median /
max over segments. All groups pooled (`all` = women, men and not recorded; the pregnant woman apart); by sex in the json.

### 3.1 Quiet standing (14 segments: ACCAD Female1 ×3, Male1 ×4, Male2 ×1, CMU 113 ×2, 77 ×3, 82 ×1)

| Measure | Real: pooled p2 / p50 / p98 / max | Per-segment p98 (min / med / max) | Gate limit | Real segments failing |
|---|---|---|---|---|
| A1 upper arm from down | 0.7 / 6.6 / 18.9 / 42.5 | 4.7 / 13.6 / 22.1 | p98 ≤ 20 (cap 28) | 1 / 14 |
| A2 elbow bend | 10.4 / 21.5 / 33.2 / 62.0 | 16.3 / 21.6 / 37.6 | 5–35 (cap 0–50) | 2 / 14 |
| A3 forearm from down | 5.2 / 19.2 / 28.1 / 40.3 | 8.1 / 18.5 / 30.9 | ≤ 30 (cap 40) | 2 / 14 |
| H1 head pitch | −58.1 / −6.2 / 11.0 / 12.0 | −53.8 / −3.0 / 11.7 | −15 to +8 (cap −25 to +12) | 7 / 14 |
| H2 head yaw on the chest | 0.4 / 22.9 / 88.2 / 131.8 | 1.3 / 21.0 / 127.9 | ≤ 30 (cap 45) | 5 / 14 |
| H3 head roll | 0.3 / 4.0 / 37.3 / 47.1 | 1.5 / 8.4 / 46.8 | ≤ 10 (cap 15) | 4 / 14 |
| F3w heel width | 14.9 / 22.0 / 30.9 / 31.1 | 15.0 / 22.9 / 31.1 | 8–32 | 0 |
| F3a stagger | 0.0 / 1.1 / 6.2 / 6.9 | 1.1 / 2.5 / 6.9 | ≤ 28 (cap 35) | 0 |
| F3s toe-out | 0.5 / 14.2 / 25.6 / 28.1 | 4.5 / 13.6 / 27.9 | ≤ 25 (cap 35) | 3 / 14 |
| **K1 straighter knee** | 0.0 / 17.5 / 23.1 / 33.5 | **7.6 / 15.2 / 33.5** | **≤ 8 (cap 12)** | **13 / 14** |
| K2 straight knee in | −3.6 / −0.8 / 0.1 / 0.2 | −1.7 / −0.6 / 0.2 | ≤ 6 | 0 |
| K3 pelvis level | 0.1 / 1.2 / 11.1 / 12.6 | 0.4 / 2.9 / 12.5 | ≤ 5 (cap 8) | 4 / 14 (all CMU 113, 77) |
| K4 hips past the foot | −14.7 / −8.8 / 0.0 / 2.5 | −12.7 / −7.0 / 2.5 | ≤ 2 (cap 4) | 1 / 14 |
| **K5 bent knee over its foot** | −23.6 / 16.1 / 25.7 / 26.6 | −11.3 / **16.6** / 26.5 | **≤ 15 (cap 25)** | **8 / 13** |
| F4 standing feet (cm/s) | mean per segment 1.3 / 3.2 / 18.9 | | mean ≤ 3; ≤ 2 % over 10 | 2 / 14 |
| F5 a foot up | 0 in every segment | | mean ≤ 0.12 | 0 |

By sex (quiet): women's A1 per-segment p98 7.1-22.1 (median 13.6), men's 14.2-18.8 (17.3); K1 women 7.6-33.5 (22.1),
men 8.6-16.4 (14.3). All standing (with arms folded, on the hips, at the face; 32 segments): A1 p98 up to 166, A2 to 149,
H1 −54 to +62: what people do while waiting, which the gate treats as gestures, not rest.

### 3.2 Walking (34 segments) and jogging/running (21)

| Measure | Real walking: per-segment p98 (min / med / max) | Failing | Real jogging/running | Failing | Gate limit |
|---|---|---|---|---|---|
| W3 arm swing (upper arm from down) | 11.5 / 25.2 / 38.3 | 4 / 34 | **30.3 / 49.7 / 90.5** | **15 / 21** | walk ≤ 35 (cap 45); jog ≤ 45 (cap 55) |
| W4 head pitch | p2: −25.1 / −9.0 / 11.0 | 12 / 34 | p2: −18.4 / −4.8 / 5.8 | 4 / 21 | −20 to +8 |
| W5 head yaw on the chest | 3.4 / 9.3 / 57.6 | 3 / 34 | 7.9 / 13.8 / 39.4 | 1 / 21 | ≤ 25 (cap 35) |
| W1 sole skate, as defined | 21.6 / 365.6 / 546.3 (p98, cm/s) | 33 / 34 | | 21 / 21 | mean ≤ 8; ≤ 5 % over 15 |
| W1, only while the ankle is slow (< 1 m/s) | 21.6 / 54.1 / 99.0 | 32 / 34 | | | (diagnostic) |

Jogging at the game's jog pace (CMU 35 and 16, 2.7-3.4 m/s): W3 p98 39-52. Running (3.5-4.9 m/s): 43-90.

## 4. What the evidence says, measure by measure

**Limits real people break**
- **K1 (≤ 8°)** fails 13 of 14 quiet-standing segments: real actors' straighter knee reads 7.6-33.5° (median 15.2) on their
  own skeletons, women and men alike, and so do the game's idles' sources (77_02: 11-18; 82_08: 22; 113_21: 20-24).
  Anatomy says the standing knee is straight, 0-5° (Kendall 2005, the gate's own source [16]); the gap is the captures'
  joint-centre solve (markers on soft tissue, a knee centre placed off the bones' axes), not people. Consequence: every
  idle the game plays brings 10-24° knees from its capture, which the runtime then has to straighten.
- **K5 (≤ 15°)** fails 8 of 13: a real relaxed knee points ahead while the foot turns out (F3s 10-28°), so measured
  against the foot's own line the knee reads "in" by about the toe-out angle (CMU 77: F3s 25-28, K5 23-27; ACCAD Male1: F3s
  8-15, K5 16-20). K5 penalises normal toe-out.
- **W1 as defined** counts the swing foot: real walkers' toes pass the floor by 1.29 ± 0.45 cm in mid-swing (Winter 1992)
  or 1.9 ± 0.5 cm (Moosabhoy et al. 2006), inside the gate's 2.5 cm, for 2-3 samples at 60 Hz, moving at 3-5 m/s. A
  real walker fails W1 by that alone (pooled p98 384 cm/s). Even restricted to the stance (ankle < 1 m/s), the fixed heel
  and ball points of a rolling foot move 50-100 cm/s at heel strike and toe-off on these skeletons (the proxy; see below).
- **W3 for jogging (≤ 45°)** fails 15 of 21 jog/run segments and half of those at the game's jog pace (39-52°).
- **W4's lower bound (−20°)** fails 12 of 34 walking segments (walkers look 20-34° down for moments: CMU 69, 104_02, 82_11).

**Limits much looser than real people**
- **F3a (stagger ≤ 28 cm)**: real quiet standing p98 ≤ 6.9 cm in every segment (median 2.5); all standing incl. weight
  shifts ≤ 25. The limit admits a stagger four times what any actor held at rest.
- **A1 (≤ 20°)** is not loose: real quiet p98 4.7-22.1 (median 13.6); 1 of 14 over. It sits at real people's top.
- **K2 (≤ 6°)**: real straight knees never turn in (p98 ≤ 0.2): could be tighter, but nothing fails it.
- **F3w (8-32 cm)** matches real people (15-31).

**Limits that match** A2, A3 (1-2 of 14 just over), H2/H3 in quiet standing with the head ahead (ACCAD: H2 ≤ 11, H3 ≤ 8),
K3, K4, F4, F5, W3 for walking (4 of 34 just over: 36-38), W5.

**Head pitch (H1) is a clip problem, not a limit problem**: the game's main idle, CMU 77_02, holds the head 35-42° down
for its whole length (the actor in "careful actions" looks at the ground); ACCAD's quiet stands sit at −3 to −6.

**Cannot be calibrated on a skeleton**: F1, F2, F5, W2, W6 and W1's magnitude are mesh measures (the sole's skin over the
ground). The proxies here (rigid heel and ball points, floor = the median contact height) measure capture noise, not
people: F1/F2 p98 ≤ 2.4 / 1.4 cm in quiet standing (inside the limits), W6 per-segment p98 0.3-3.9 cm. A4, A5, A6, S1, C1,
G1-G4 need the mesh or the fingers and were not attempted.

## 5. Proposals for the main session (not applied)

1. **K1**: keep the anatomical standard for the game (straight knees read as straight), but hold the **clips** to it too:
   `clip_qa.py` should fail an idle whose own skeleton's K1 p98 is over 8°, and idles should be chosen whose actors stand
   straight (ACCAD Female1 Stand: K1 p98 8; Male2 Stand: 9). If the owner prefers the limit to agree with captures
   instead, real quiet standing reads ≤ 16° at the median segment's p98 (by these 14 segments), with Kendall's 0-5° as the
   anatomical bound: a raise needs both written down.
2. **K5**: measure the bent knee against the body's front, or allow the knee to point between the body's front and the
   foot's line (K5 ≤ F3s + 10°): real people break the current form by their toe-out alone.
3. **W1**: count a sole point as on the ground only while its foot bears weight (as W6 already does: the foot's slowest
   sole point under 0.5 m/s), so a swing passing 1-2 cm over the floor (Winter 1992; Moosabhoy 2006) is not a skate.
   The skate itself then needs a mesh calibration (T3/T6 on the editor side).
4. **W3 jog**: a sourced limit from these captures: jog (≤ 3.4 m/s) p98 ≤ 55, cap 65 (real 39-52, the run at 3.5-4.9
   m/s 43-90); it is "no sourced limit yet" in §2.4.
5. **W4**: real walkers glance down to −25…−34°; a lower bound of −25 (cap −32) agrees with 33 of 34 segments' p2.
6. **F3a**: tighten to p98 ≤ 12 cm (cap 20): real quiet standing ≤ 6.9 everywhere.
7. **Timing (T6)**: add playback speed against the source's real time (the rate check above) and cadence per clip; both
   are in `clip_qa.py` and caught `idle` and `stretch` at double speed.

## 6. Timing by sex (T6's offline measures)

Steady walking (per segment, min / median / max):

| Group | n | Speed m/s | Cadence steps/min | Step m | Walk ratio (m per step/min) | Step width cm | Pelvic obliquity range ° | Arm swing range ° |
|---|---|---|---|---|---|---|---|---|
| Women (ACCAD F1, CMU 113, 141*) | 6 | 0.82 / 0.98 / 1.07 (the 4 straight) | 84 / 89 / 97 | 0.59 / 0.62 / 0.72 | 0.0065-0.0081 (straight) | 3.5 / 6.9 / 10.5 | 11 / 14 / 16 | 14 / 31 / 43 |
| Men (ACCAD M1, M2, CMU 104) | 7 | 0.77 / 1.13 / 1.65 | 77 / 100 / 119 | 0.57 / 0.68 / 0.84 | 0.0059-0.0078 | 9.3 / 15.8 / 16.1 | 8 / 12 / 25 | 22 / 33 / 43 |
| Not recorded (CMU) | 21 | 0.89 / 1.23 / 1.95 | 83 / 105 / 135 | 0.55 / 0.71 / 0.87 | 0.0056-0.0082 | 6.1 / 8.7 / 12.9 | 7 / 12 / 16 | 7 / 30 / 70 |

\* 141's walks are on a curved path; their speed is not a straight-line speed. Published: comfortable speed 1.31-1.39 m/s
for women and 1.36-1.43 for men of 20-59 (Bohannon & Williams Andrews 2011); men take longer steps, women a higher
cadence, and a speed difference is mostly size (Frimenko et al. 2015, meta-analysis); women's pelvic obliquity range is
larger (Suner-Keklik et al. 2023); the walk ratio is 0.0060 ± 0.0007 at preferred speed, invariant with speed (Bogen et
al. 2018). **The free women's captures walk slowly** (ACCAD Female1 0.82-1.07 m/s at 84-97 steps/min, CMU 113 1.00 m/s):
the game's walk (1.25-1.4 m/s) asks them to be sped up 15-50 %, the edge of `Pace.RateMax` (1.25). Too few subjects
(two women walking straight, three men) to set sex-specific limits; the clips' sex is now recorded, so the editor can play
each sex its own.

## 7. Combat states on real fighters (2026-11-17; limits accepted for WP2, not applied yet)

COMBAT_ASSETS doubt 3: the gate has no combat states, and fighting stances break quiet standing's limits. Measured here are
the same measures on real people fighting, by `tools/qa/calibration/combat_states.py` (`motion_calibration_combat.json`).
The people are mocap actors, not competitive fighters: ACCAD Male2 (a man; the martial-arts series E1-E21, D1-D4, crouches
A7/A10/B25/C26/C27), ACCAD Female1 (a woman; crouches A07/A10/B24/B25/C26/C27), CMU 144 ("punching female": left and right
punch sequences, left and right blocks), CMU 141_14 and 113_13 (women: punch and kick), CMU 13_17 (boxing, sex not
recorded), CMU 79_96 and 80_03 (a long gun mimed, sex not recorded) and CMU 77_03/77_09 (wary crouch, duck). Every rate comes
from the capture itself: the CMU trials' C3D headers (60 fps for 77, 79, 80, 141; 120 for the rest), ACCAD's BVH frame times.

States are found frame by frame within the trials captured for them (thresholds on the trial's own standing hip height h0):
**guard** (hips ≥ 0.85 h0, both wrists up by the head, both hands under 1 m/s, both feet down), **strike** (hips ≥ 0.75 h0,
a hand over 2 m/s, both feet down), **crouch** (hips ≤ 0.70 h0, hips under 0.2 m/s, both feet down), **aim** (the aim-hold
stretches). CMU's head segment carries a per-subject offset (its quiet stance reads 20-26° down and 17-31° turned on the
chest), so a CMU trial's head is measured against the actor's own relaxed stance at the take's start (13_17 and 80_03 have
none and give no head measures). Head yaw (H2) is not counted while the face or the chest points within 30° of straight down.

Real fighters, p2 / p50 / p98 (K: knee flexion °; H1 pitch, H2 yaw on the chest, H3 roll °; F2h the more lifted weight-bearing
heel over its ball, cm; F3w stance width, cm; A1 upper arm from hanging °; A2 elbow bend °):

| State | Who (trials, frames) | K1 straighter knee | K more bent | H1 | H2 | H3 | F2h | F3w | A2 |
|---|---|---|---|---|---|---|---|---|---|
| guard | men (8, 351) | 15 / 26 / 42 | 28 / 40 / 53 | −32 / −18 / +5 | 7 / 21 / 50 | 0 / 3 / 15 | −1 / 0 / 7.6 | 39 / 51 / 67 | 112 / 121 / 135 |
| guard | women (5, 1048) | 0 / 15 / 57 | 25 / 46 / 70 | −19 / −4 / +11 | 1 / 24 / 58 | 1 / 12 / 20 | −2 / 0 / 6.5 | 34 / 44 / 55 | 120 / 138 / 145 |
| guard | all (14, 2193) | 0 / 28 / 67 | 27 / 49 / 76 | −27 / −6 / +10 | 1 / 22 / 56 | 1 / 9 / 20 | −1 / 1 / 9.8 | 21 / 46 / 70 | 113 / 137 / 147 |
| strike | men (10, 82) | 5 / 24 / 37 | 21 / 37 / 50 | −31 / −12 / +12 | 1 / 16 / 42 | 0 / 4 / 21 | 0 / 4 / 9.7 | 6 / 58 / 71 | 44 / 112 / 137 |
| strike | women (7, 1856) | 0 / 10 / 83 | 21 / 45 / 92 | −42 / −4 / +17 | 1 / 22 / 57 | 0 / 13 / 22 | 0 / 0 / 8.7 | 14 / 48 / 56 | 88 / 134 / 138 |
| aim | not recorded (2, 306) | 0 / 0 / 2 | 4 / 19 / 20 | −3 / −2 / +1 | 15 / 20 / 22 | 11 / 14 / 17 | −1 / 1 / 1.9 | 23 / 30 / 33 | 120 / 135 / 143 |
| crouch | men (5, 300) | 25 / 129 / 130 | 27 / 144 / 144 | −17 / −12 / +34 | 23 / 26 / 56 | 1 / 3 / 37 | 0 / 0 / 1.4 | 17 / 28 / 30 | 29 / 39 / 135 |
| crouch | women (6, 251) | 17 / 136 / 148 | 25 / 137 / 148 | −49 / −22 / −7 | 2 / 7 / 93 | 1 / 7 / 34 | −1 / 0 / 17 | 21 / 42 / 43 | 3 / 14 / 137 |

What this says against doubt 3 ("both knees bent 14-42°, the head turned 45-90° on the chest, heels lifted"):
- **Knees**: the man's guard bends both knees (K1 15-42°, as doubt 3 says), but the women's does not have to: in a bladed
  stance one leg is straight (K1 p2 0°), the other bent 25-70°. A guard limit must allow a straight leg and a bent one.
- **Head**: real fighters turn the head on the chest up to 50-58° (p98), not 90°. A guard turns the head 21-24° (median)
  because the stance blades the chest away from the opponent while the eyes stay on them. The man tucks his chin (H1 −32
  to +5°, median −18°).
- **Heels**: a weight-bearing heel rises up to 7-10 cm over its ball in the guard (the rear foot on its ball), up to 13 in a
  strike, and up to 17 in a deep crouch. Quiet standing's F2 (±2 cm, cap 4) cannot hold there.
- **Aim**: legs straight (K1 ≤ 2°), the head down to the sights only relative to the chest. It is turned 15-22° and rolled
  11-17° by the cheek on the stock. That is 2 actors with a mimed gun, so it is the thinnest evidence here.

**Accepted (2026-11-17) as the combat-state limits for WP2** (the editor owner applies them when combat states are added to
the gate; not applied now). Each limit is the real fighters' p98 (and p2 where a lower bound applies), each cap their max
(and min), from all the trials of the state pooled. They apply only while the game shows that state, and quiet standing's
limits are never loosened for them. Values: limit p2 … p98 (cap min … max):

| Measure | Guard (14 trials) | Strike (18, caps matter most) | Aim, long gun (**provisional**: 2 actors, mimed gun) | Crouch / cover (12) |
|---|---|---|---|---|
| K1 straighter knee ° | ≤ 67 (81); no lower bound | ≤ 82 (89) | ≤ 2.2 (2.5) | 16.7 … 147 (16.1 … 148) |
| K more bent ° | ≤ 75.5 (94.5) | ≤ 90.5 (97.1) | ≤ 20.4 (20.7) | ≤ 148 (148) |
| H1 head pitch ° | −26.9 … +10.3 (−33.0 … +14.0) | −41.9 … +16.8 (−53.3 … +22.9) | −3.0 … +1.2 (−3.0 … +1.6) | −44.7 … +33.8 (−53.3 … +35.4) |
| H2 head yaw on chest ° | ≤ 55.9 (59.5) | ≤ 56.8 (65.9) | 15.2 … 22.2 (15.1 … 22.9) | ≤ 92.1 (93.2) |
| H3 head roll ° | ≤ 19.5 (21.5) | ≤ 22.1 (25.7) | 10.6 … 16.6 (10.4 … 16.7) | ≤ 36.7 (45.6) |
| F2 heel lift, cm | ≤ 9.8 (14.4) | ≤ 13.2 (14.7) | ≤ 1.9 (1.9) | ≤ 17.1 (17.2) |
| F3w stance width, cm | 21.2 … 70.4 (3.9 … 79.2) | 16.4 … 83.2 (1.3 … 90.5) | 23.3 … 32.8 (23.3 … 33.0) | 18.9 … 50.6 (16.0 … 51.0) |
| A1 upper arm from hanging ° | ≤ 103 (119) | ≤ 88.5 (112) | 53.2 … 88.8 (50.2 … 90.5) | ≤ 134 (135) |
| A2 elbow bend ° | 112.8 … 146.9 (109.3 … 149.9) | 83.9 … 140.5 (41.1 … 145.7) | 119.6 … 143.0 (119.5 … 146.6) | ≤ 140.7 (141.5) |

The aim column rests on two actors miming a gun (CMU 79_96, 80_03; the head only from 79_96): it is to be replaced when a
captured long-gun take with a real weapon is found. The by-sex numbers above show where the pooled limits come from (the
women's bladed guard sets the guard's K1 bound, the men's tucked chin its H1). The combat set's own stance values are in
each clip's `stance` (combat `clip_qa.json`) for the same comparison.

## 8. Combat v4: the gate's combat states re-derived on real actors (2026-11-17; proposals, none applied)

`docs/COMBAT_ANIMATION_STANDARD.md` §5 asks the gate's owner to re-derive the provisional aim limits from at least three actors,
to give strikes limits per weapon class, and to measure the states the gate does not hold yet (dodge, peek, full cover, prone and
crawl, turn, fall and death, rise). Measured here by `tools/unity/motion/combat_v4_calib.py` (the gate's own definitions, through
`tools/qa/calibration/combat_states.py`; staged as `combat/v4/calibration_v4.json` with every trial's own p50/p98), on the
captures at their true rates (CMU's C3D header rates, ACCAD's and 100STYLE's BVH frame times), the cuts being combat set v4's.
New here: **100STYLE** (Ian Mason, CC BY 4.0; Xsens at 60 fps, one actor of 182 cm, sex not recorded); CMU 143 (labelled Male1 by
its own capture file), 80_71, 124_07, 90_16/18, 111, 114, 77_16; ACCAD Male1 and Female1 lying, crawling, side-stepping and turning,
ACCAD Male2's footwork. A CMU or 100STYLE head is read against the actor's own relaxed stance in the same take (CMU 80_03,
79_01, 80_71 and 124_07 have none and give no head measures); TL is the trunk's (upper chest's) lean from the vertical, Hy the hips'
height over the floor. Values: p2 … p98 (min … max), all the state's frames pooled; the number of actors in brackets.

**Aim, long gun: three actors now.** CMU 79_96 (head and knees: K1 0-0, H2 20-22, H3 14-17), CMU 80_03 (K1 1.4-2.3, no head)
and 100STYLE `Swat_ID` (K1 32-34, Kmax 36-38, H1 −4…−3, H2 33, H3 8-9, F3w 43-45, TL 11-17). The provisional column of §7
(K1 ≤ 2.2) is two actors who stood straight; the third bends both knees as real shooters do (the isosceles reference
15 ± 10° and the trunk 10 ± 5° forward [R8 of the standard]; the fighter stance [R7]).

| Measure | aim (3) | strike, unarmed (5) | strike, two-handed (3) | guard (3) | dodge (4) |
|---|---|---|---|---|---|
| K1 straighter knee ° | 0 … 33.5 (0 … 34.9) | 0 … 85.8 (0 … 89.3) | 0.1 … 36.1 (0 … 39.3) | 0 … 68.3 (0 … 81.1) | 9.4 … 122.6 (4.3 … 124) |
| K more bent ° | 4 … 37.2 (3.2 … 38) | 18.7 … 93.4 (8.8 … 97.1) | 0.7 … 54.9 (0.4 … 57.6) | 27.5 … 77.7 (24.2 … 94.5) | 12.3 … 127.9 (4.5 … 129.2) |
| H1 head pitch ° | −7.1 … 0.6 (−7.1 … 1.6) | −52.3 … 7.9 (−53.3 … 10.1) | - | −27.9 … 9.8 (−33 … 10.7) | −47.5 … 3.9 (−54 … 7.9) |
| H2 head yaw on chest ° | 15.7 … 33.3 (15.1 … 33.7) | 0.7 … 58.8 (0.1 … 65.9) | - | 0.4 … 49.1 (0 … 52.2) | 1.2 … 54.4 (0 … 55.4) |
| H3 head roll ° | 7.9 … 16.3 (7.8 … 16.7) | 1.2 … 20.6 (0 … 22.4) | - | 0.5 … 19.1 (0.1 … 20.1) | 0.2 … 18.2 (0 … 21) |
| F2 heel lift, cm | −0.4 … 1.8 (−0.7 … 1.9) | 0 … 11.9 (−1 … 14.3) | −0.4 … 15.1 (−0.9 … 15.3) | −1.5 … 10.4 (−1.8 … 14.4) | −0.8 … 6.6 (−1.9 … 10.5) |
| F3w stance width, cm | 23.4 … 44.7 (23.3 … 44.7) | 13.7 … 62.6 (6.7 … 70.8) | 23.1 … 66 (22.1 … 66.4) | 19 … 71.1 (3.9 … 79.2) | 13.2 … 110.8 (7.1 … 139.8) |
| A1 upper arm from hanging ° | 54.8 … 86.2 (50.2 … 90.5) | 23.7 … 80.2 (16 … 93.9) | 28.5 … 122.5 (17.7 … 129.4) | 19.6 … 58 (12.3 … 68.8) | 11.4 … 78.1 (10.4 … 104.5) |
| A2 elbow bend ° | 119.7 … 146.1 (119.5 … 146.6) | 91.4 … 138.8 (53.3 … 145.4) | 13.8 … 128.6 (11.6 … 135.2) | 112.7 … 147.1 (111.7 … 149.9) | 16.6 … 134.4 (14.3 … 134.7) |
| TL trunk lean ° | 2 … 16.9 (1.3 … 17.8) | 4.7 … 40.9 (0.9 … 43.6) | 8.7 … 39.9 (3.6 … 48.2) | 2.1 … 32 (0.5 … 42.5) | 2.7 … 80.2 (1.2 … 81.7) |
| Hy hips height, cm | 92.8 … 97.6 | 66 … 94 | 95.2 … 98.9 | 76.1 … 102.7 | 47.3 … 110.3 |

| Measure | peek (1) | full cover (3) | prone (3) | crawl (3) | turn (3) | fall (4) | rise (7) |
|---|---|---|---|---|---|---|---|
| K1 straighter knee ° | 7.3 … 10.2 | 6.5 … 11.8 (6 … 11.9) | 10.8 … 29.2 (10 … 29.3) | 11.2 … 77.7 (8.3 … 85.3) | 5.3 … 39.9 (1.9 … 48) | 0 … 152.6 | 0 … 141.5 (0 … 152.2) |
| K more bent ° | 8.2 … 11 | 6.9 … 13.4 | 17.5 … 30.5 | 18.9 … 134.4 (18.2 … 143.7) | 11.9 … 68.7 (3.8 … 74.7) | 17.1 … 155.1 | 33.7 … 155.7 (24.5 … 160.2) |
| H1 head pitch ° | −27.3 … 30.8 | −4.9 … 5.2 (−5 … 5.5) | −65.3 … −32.5 (−69.6 … −32.1) | −58.2 … 36.2 | −35.2 … 4.3 (−40.6 … 7.8) | −10 … 31.6 | −10.3 … 39.7 |
| H2 head yaw on chest ° | 2.7 … 19.9 | 0.2 … 11 | 1.4 … 25.2 (0.1 … 32.2) | 0.4 … 31.1 (0.1 … 35) | 0.5 … 50.5 (0 … 64.1) | 0.1 … 92.1 | 2 … 97.7 |
| H3 head roll ° | 47.4 … 53.9 | 0.6 … 4 | 0.5 … 39.4 (0.1 … 43.2) | 0.1 … 28.8 (0 … 42.2) | 0.1 … 8 (0 … 14.7) | 0.8 … 55.7 | 1 … 80.7 |
| F2 heel lift, cm | 0 … 0.4 | −0.1 … 0.2 | −0.1 … 8 | −5.6 … 14.1 | −1.5 … 11.6 (−3.8 … 15.4) | −2.1 … 9.5 | −2.9 … 15.1 (−9.5 … 17.2) |
| F3w stance width, cm | 31.1 … 32.2 | 14.8 … 27.7 | 18.7 … 53.7 | 24.2 … 64.6 | 1.9 … 49.7 (0 … 52) | 0.2 … 75.4 | 1.3 … 46.1 |
| A1 upper arm from hanging ° | 41.5 … 47.6 | 12.5 … 17.9 | 69.7 … 129.3 | 38.7 … 116.4 (31.3 … 135.1) | 12.7 … 51.6 (11.5 … 54.7) | 7 … 124.3 | 10.9 … 117.6 |
| A2 elbow bend ° | 20.2 … 32.3 | 16.2 … 27.4 | 95.4 … 142 (95.1 … 149.4) | 81.9 … 157.1 (55.7 … 158.4) | 13.8 … 112.5 (10.6 … 119.2) | 11.5 … 143.6 | 20.3 … 125.4 |
| TL trunk lean ° | 38.9 … 48 (38.3 … 48.1) | 1.1 … 4.1 | 4.5 … 22.8 (from horizontal: lying) | 2.5 … 28.3 | 0.8 … 10.2 (0.1 … 14.1) | 2.9 … 97 | 4.8 … 93.3 |
| Hy hips height, cm | 97.9 … 98.1 | 92.2 … 105.6 | 5.9 … 8.2 | 6.8 … 28.7 (6.7 … 31.1) | 89.4 … 110.2 | 5.5 … 152.3 | 4.2 … 98 |
| TR turn rate °/s (0.3 s) | - | - | - | - | 82.6 … 169.7 (8 turns) | - | - |
| HL head lead over pelvis ° | - | - | - | - | 12.9 … 54.7 (8 turns) | - | - |
| FT release to impact, s | - | - | - | - | - | 0.48 … 0.67 (5 falls) | - |
| EL elbow bend at impact ° | - | - | - | - | - | 71.5 … 139.8 | - |

Actors: aim CMU 79, 80, 100STYLE; strike, unarmed ACCAD Male2, CMU 143 (men), 144, 141, 113 (women); strike, two-handed CMU 79, 80,
124 (sex not recorded); guard ACCAD Male2, CMU 144, CMU 13; dodge ACCAD Male2, Male1, Female1, CMU 77; peek 100STYLE (left and right
leans: the only free capture of a full-cover lean); full cover the standing holds of ACCAD Male1, Male2, Female1; prone and crawl
and turn ACCAD Male1, Male2, Female1 (turns: two guard turn-rounds, six walking turns of 78-189°); fall CMU 90 (an acrobat: a
fall on the face 0.53 s, a rug-pull backward 0.48 s) and the three ACCAD drops to prone (0.57-0.67 s); rise CMU 140, 77, 111,
113, 114, ACCAD Male2, Female1.

What it says:
- **Aim**: knees bent up to 34° are real (100STYLE's shooter), and so is a straight leg (CMU); the head is turned onto the stock
  15-33° and rolled 8-16° by every actor whose head can be read; the trunk leans forward 2-17° (R8's 10 ± 5°).
- **Two-handed strikes are not punches**: the arms rise far higher (A1 to 122°) and the elbows open (A2 down to 14°), the trunk
  bends 9-40° into the blow, and the batter's stance is wider (to 66 cm). Holding club strikes to the unarmed limits is the
  cause the standard named for strike's A1/A2 failures (§5.2 of the standard).
- **Peek and full cover** (one actor for the lean): the lean holds the trunk 39-48° off the vertical over feet 31-32 cm apart,
  knees near straight (7-11°), the head rolled with the trunk (47-54°); the hold before it is quiet standing.
- **Turn**: the head leads the pelvis by 13-55° (R32: healthy adults turn head-first); the pelvis turns at 83-170°/s.
- **Fall**: 0.48-0.67 s from release to impact (R24's 0.6-0.8 s for forward falls; the acrobat falls faster), the elbows at
  impact bent 72-140° (R24: about 129° of extension, i.e. a bend of about 51°, in a conscious forward fall; the drops to prone
  land on bent arms).

**Proposals for the gate's owner** (none applied; each limit the real actors' p98 and p2 where a lower bound applies, each cap
their max and min; quiet standing's limits never loosened for them; applied only while the game shows the state):
1. `aim` (long gun) replaces §7's provisional column: K1 ≤ 33.5 (cap 34.9), Kmax ≤ 37.2 (38.0), H1 −7.1 … +0.6 (−7.1 … +1.6),
   H2 15.7 … 33.3 (15.1 … 33.7), H3 7.9 … 16.3 (7.8 … 16.7), F2 ≤ 1.8 (1.9), F3w 23.4 … 44.7, A1 54.8 … 86.2 (50.2 … 90.5),
   A2 119.7 … 146.1 (119.5 … 146.6), TL ≤ 16.9 (17.8). `aim_pistol` takes the same legs and trunk (K1, Kmax, F3w, TL) and the
   standing head (no stock: H2, H3 as quiet standing).
2. `strike` per weapon class: unarmed as §7's strike column (the five actors here agree with it: K1 ≤ 85.8, A1 ≤ 80.2, A2
   91.4 … 138.8); two-handed: K1 ≤ 36.1 (39.3), Kmax ≤ 54.9 (57.6), F2 ≤ 15.1 (15.3), F3w 23.1 … 66.0 (22.1 … 66.4), A1 ≤ 122.5
   (129.4), A2 13.8 … 128.6 (11.6 … 135.2), TL ≤ 39.9 (48.2), the head as unarmed until a two-handed actor's head can be read;
   one-handed weapons: no capture holds one, so the unarmed limits hold the built one-handed clips (their bodies are captured
   blows) until one is captured.
3. `guard` as §7 (Male2, CMU 144 and 13 agree: K1 ≤ 68.3, H2 ≤ 49.1, A2 112.7 … 147.1).
4. New states: `dodge` K1 ≤ 122.6 (124), Kmax ≤ 127.9 (129.2), H1 −47.5 … +3.9, H2 ≤ 54.4, F3w ≤ 110.8 (139.8), TL ≤ 80.2 (81.7);
   `peek` TL 38.9 … 48.0 (38.3 … 48.1) over F3w 31-32 with K1 ≤ 10.2 (one actor: provisional), the head's roll with the trunk;
   `cover_full` (the hold) quiet standing's limits as they are, with C1 against the cover; `prone` Hy ≤ 8.2 (8.3), K1 10.8 … 29.2,
   A2 95.4 … 142.0, TL (from horizontal) ≤ 22.8 (25.9); `crawl` Hy ≤ 28.7 (31.1), A2 81.9 … 157.1; `turn` the head leading the
   pelvis (HL p2 12.9 > 0) and the pelvis at most 169.7°/s, stepping (F4 as standing); `fall` FT 0.48 … 0.80 s (the capture's
   0.48, R24's 0.8) with C1 and the soles at contact by eye; `death` C1 of the resting pose (no capture: physics); `rise` C1 as
   now, with K, A and TL bounded by the seven actors' caps (Kmax ≤ 160.2, TL ≤ 102.1).
5. The clips' own figures against these are in each v4 clip's `stance` (combat v4 `clip_qa.json`), for the same comparison as §7.

## 9. Sources

- Winter DA (1992) Foot trajectory in human gait: a precise and multifactorial motor control task. Phys Ther 72:45-56
  (minimum toe clearance 1.29 cm). https://consensus.app/papers/details/w:233e28a0-4591-4a8b-9b7e-0ceb2f9be716/
- Moosabhoy MA, Gard SA (2006) Methodology for determining the sensitivity of swing leg toe clearance and leg length to
  swing leg joint angles during gait. Gait Posture (1.9 ± 0.5 cm). https://consensus.app/papers/details/w:4f522819-0bae-41e2-baee-229d4a739b24/
- Bogen BE et al. (2018) The walk ratio: invariance across walking conditions and gender. Gait Posture.
  https://consensus.app/papers/details/w:b3bac4f4-7544-4100-93ce-66788abe24a2/
- Frimenko RE et al. (2015) Interactions of sex and aging on spatiotemporal metrics in non-pathological gait: a descriptive
  meta-analysis. Physiotherapy. https://consensus.app/papers/details/w:beb096ad-1f83-4f28-9cf7-b66177101f69/
- Suner-Keklik S et al. (2023) Gender differences in gait parameters of healthy adult individuals. J Basic Clin Health Sci.
  https://consensus.app/papers/details/w:895f735b-41d2-497b-9fea-b3e8cdaf7ec0/
- Bohannon RW, Williams Andrews A (2011) Normal walking speed: a descriptive meta-analysis. Physiotherapy 97:182-189.
- Kendall FP et al. (2005) Muscles: Testing and Function with Posture and Pain, 5th ed. (`docs/PEOPLE_MOTION.md` [16]).
- Drillis R, Contini R (1966) Body segment parameters (segment lengths as shares of stature).
- CMU Graphics Lab Motion Capture Database, mocap.cs.cmu.edu (the FAQ's units; the subject index's frame rates; each trial's
  C3D header, 1 KB read, for its capture rate: 60 fps for 77, 79, 80, 106, 141, 143, 120 for every other trial used, which
  confirms §2's gravity fits).
- ACCAD Open Motion Project, accad.osu.edu (CC BY 3.0; the subjects' take lists).
- 100STYLE: Mason I, Starke S, Komura T (2022) Real-time style modelling of human locomotion via feature-wise transformations
  and local motion phases. "The 100STYLE Dataset - Ian Mason", CC BY 4.0. https://www.ianxmason.com/100style/
- The combat standard's references (docs/COMBAT_ANIMATION_STANDARD.md §7): R7 Brown et al. 2018 (stance and shooting), R8 Mishra
  et al. 2026 (isosceles baselines), R24 Borrelli et al. 2023 (fall timing and arm extension at impact), R32 Leveridge et al.
  2026 (head-first turning).
