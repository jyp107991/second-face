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

## 7. Sources

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
- CMU Graphics Lab Motion Capture Database, mocap.cs.cmu.edu (the FAQ's units; the subject index's frame rates).
- ACCAD Open Motion Project, accad.osu.edu (CC BY 3.0; the subjects' take lists).
