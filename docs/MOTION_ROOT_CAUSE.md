# Why people keep failing the motion gate, and the plan that removes the causes (2026-11-17)

Gate: **red, 6460** (2026-11-17 20:02, whole cast): the states measured before, **4** (W3 2, A4 1, C1 1; the 55 of 63a0e244
were A1 25, W6 11, C1 8, A4 4, W3 3, F1/F2/F5/K1 1); the fight's states, measured for the first time, 6456 (§7). Binding with
`docs/PEOPLE_MOTION.md` (the gate) and CLAUDE.md §2 ("humans look and move like humans"). Written after the owner's demand
(2026-11-17) to find what keeps going wrong and remove it at the root, without gaming the gate.

## 1. What the record shows
- **26 verdicts in 11 days, 1513 → 55, each a tweak to a correction.** Every round changed a correction applied after
  the animation (smoothing caps, "give" allowances, push shares, capped flank correctives) and waited ~1.5 h for a
  whole-cast run. The corrections now total 3,173 lines (`ArmClearance` 1,594, `FootPlant` 970, `BodySkin` 609) that run
  in sequence, each undoing part of another: an arm pushed clear of the waist raises A1, held in it raises C1.
- **The 55 are concentrated.** 21 of A1's 25 are three broad-waisted men in bulky clothes (Construction_Male_02 10,
  cap_Police_Male_03n 7, cap_Military_Male_03n 4) whose waist stands out nearly as far as the shoulder joint; all 11 W6 are
  women jogging; the 8 C1 are hands grazing the waist in gestures by 0.5-0.7 cm.
- **The motion is the wrong people's.** From `tools/unity/motion/cmu2fbx.py` and CMU's index: no gait (4 walks, 2 jogs,
  run, carry, sneak) was captured from a woman; they come from CMU's general subjects (07, 08, 35, 16, 09, 70, 136) and play
  on every woman. The only women in the set are CMU 111/113/114 (a woman while pregnant and after), and their standing idle
  (`idle_d`) and stretches (`yawn`, `yawn_b`) play on every man. One subject per gait, so a crowd moves in step.
- **A converter bug the gate could not see.** CMU captured subject 77 at 60 fps; the converter read every trial at 120, so
  the main standing idle (`idle`, CMU 77_02) has played at twice its real speed. The combat-asset work found it by fitting
  gravity to a jump, not the gate.
- **The gate has never measured a real human.** Its limits come from the literature on quiet standing and gait; none was
  checked against the source captures of the real actors, and it has no measure of speed, cadence, weight shift or the
  differences between how women and men walk.

## 2. Root causes
- **R1. Motion made for one body forced onto 79.** Humanoid retargeting copies joint rotations. The contacts (soles on the
  ground, a resting arm on the side, a palm by the thigh) do not carry over to bodies of other proportions, so they were
  repaired afterwards, frame by frame, by stacked heuristics. No single solve owns the whole pose; each fix disturbs another.
  That is why the count falls slowly and the last cells resist.
- **R2. Bodies that cannot touch.** The skin is rigid (linear blend skinning). Where a real arm rests on a real waist, flesh
  and cloth compress 1-2 cm; ours cannot, so the arm is pushed out (A1, W3) or sinks in (C1). The hand-capped flank
  correctives are a patch over a missing deformation model. Some bases (baked gear, broad waists) have geometry where the
  relaxed hang cannot be reached without that compression.
- **R3. The wrong person's motion.** Men's gaits on women, a pregnant woman's stillness on men, one subject per gait, a frame
  rate misread. A woman retargeted from a man's jog lands her stance foot off the ground (W6). Where the gate passes, she
  still moves like a man, and the gate does not measure that.
- **R4. A gate not calibrated on real people and blind to timing.** It checks postures frame by frame against fixed limits
  that were never run on the actors' own captures. A limit real people break, or one far looser than they are, would go
  unnoticed, and a double-speed idle passes.
- **R5. A 1.5-hour, single-threaded feedback loop.** Every idea waited for a whole-cast Unity run. No offline loop measured a
  clip on a body in minutes, so the trial and error was slow and serial.

## 3. The plan: one track per cause
- **T1. Calibrate the gate on real people (R4), first.** Every measure that can be read on a skeleton (A1-A3, H, K, F, W) is
  run on the source captures on the actors' own skeletons, at real speed, women and men (CMU, ACCAD). A limit real people
  break is corrected from the literature with the capture as evidence; one far looser than real people is tightened. Both are
  written in `docs/PEOPLE_MOTION.md` with their source. Limits move only to agree with real people, never to pass ours.
  Output: `docs/qa/motion_calibration.md` (+ json).
- **T2. The right source motion (R3).** A clip QA gate on every clip before import: frame rate by gravity fit and by the
  database's own listing; speed and cadence against real values by sex and height; loop seam pop (cm); foot slide on contact;
  constant bone lengths. `idle` re-exported at real speed. Motion by sex: women's walks, jog and run from women's captures
  (ACCAD Female1, CMU's women, other free sources checked by licence), men's idles from men; two or more subjects per gait.
  Each clip's json records its source person (sex, height, fps). Output: clips staged outside `unity/`, imported by the
  editor owner when Unity is idle.
- **T3. One solve instead of the stack (R1).** A contact-preserving retarget baked per base body in the editor. For each
  body and clip, every frame is solved once for that body's proportions: the source's contacts kept (soles planted on the
  same frames, the arm resting on the side where the actor's did, the palm's distance to the thigh scaled to the body), no
  penetration (signed distance to the body's own skin), and the least change from the captured joint rotations. Written as
  per-body clips or additive curves. At runtime only the terrain feet and the gaze adjust, small and bounded. `ArmClearance`,
  `FootPlant`'s posture work and the give allowances are retired state by state, each only once the gate on that state is as
  good or better.
- **T4. Flesh and cloth that give (R2).** Contact deformation derived, not hand-capped: offline, each base's arm is pressed to
  its side over the rest angles and the flank and sleeve are solved as volume-preserving soft tissue (with the clothes'
  thickness), baked as blend shapes driven by the arm's angle. The arm rests on the side as a real one does, and nothing sinks.
- **T5. Geometry audit against real people (R2).** Each base measured as the plausibility gate does (biacromial breadth,
  waist breadth, chest depth, the shoulder joint's place inside the mesh) against ANSUR II by sex. A skeleton fit that puts
  the shoulder joint too far in for its mesh is refitted. Baked gear no real garment would make (a slab at the waist) is
  reduced. A base outside real people's range is fixed, or withdrawn under the plausibility gate with the measure written
  down; a base is never withdrawn because it fails the motion gate.
- **T6. Measure what the eye sees (R4).** New gate measures: playback speed against real time, cadence and step length against
  real values by sex and height, pelvic rotation and step width by sex, weight shift. Every state is captured at the game
  camera beside the source actor's own clip and reviewed in writing.
- **T7. A fast loop (R5).** T1/T6's measures run offline in minutes on a clip on a body. The whole-cast Unity run only confirms
  a change. Tracks run in parallel on separate files, and one owner integrates in the editor.

## 4. Contingencies
- **T3 cannot satisfy contact and no-penetration on a body:** apply T4 and T5 to that body first. If the body is within real
  people's range and still infeasible, the limit is wrong for that build. It is then set by build only from measurements of
  real people of that build, with sources, in `docs/PEOPLE_MOTION.md`, and stated to the owner in the report, never silently.
- **Too few free captures of women for a gait:** the ACCAD and CMU women's takes first. Failing those, a man's capture with
  women's gait differences applied (pelvic rotation, step width, arm swing, cadence), calibrated to published biomechanics and
  marked as such in the clip's json, until a capture replaces it.
- **The bake costs too much memory on a phone:** bake per body-shape cluster (bases grouped by proportions) with a bounded
  runtime residual.
- **Calibration shows a limit is wrong for real people:** corrected with the evidence and re-run, with the change and its
  reason in the report.
- **A track makes any measure worse:** it is not committed (the ratchet stays).

## 5. What "done" means
The gate is green over the whole cast; the real actors pass the same limits (T1); the clip gate is green (T2); and the
side-by-side reviews are written (T6). None of it may come from a loosened limit, a switched-off system, a removed body or a
camera the game does not use.

## 6. Owners and order (2026-11-17)
- Offline helper (no Unity; `tools/unity/motion/`, `tools/qa/calibration/`, staging): T1, T2, T5's measures, T6's offline
  measures.
- Editor owner (the gate agent): finish the current run, then T3 and T4, the gate's new T6 measures, and the import of T2's
  clips when Unity is idle.
- Status lines go in `docs/PROGRESS.md`, each starting with the gate's state.

## 7. Findings and decisions (2026-11-17, after T1, T2 and T5's first pass)
Gate: red, 55. Evidence: `docs/qa/motion_calibration.md` (104 segments of real captures, women and men, at their true
frame rates), `/home/user/second-face-staging/motion/README.md` (clip QA, clips by sex), `docs/qa/body_geometry_audit.md`.
- **A1's cause is the clothes' geometry, not the motion.** Bare, the five broad-waisted men's trunks need 5-7° of arm hang
  (real men ≤ 7.9°); with their own baked sleeves and waist gear the arm must stand 14-17° out to clear them, against about
  11° for a real man in a jacket. cap_Police_Male_03n's sleeve stands 8.8 cm round the bone; baked gear makes two chests
  37-42 cm deep (real p98 ~32). The skeleton fit is right (shoulder joints at real men's and women's p98). Remedy: slim the
  baked sleeves and gear of those bases to a real garment's stand-off, keeping Rocketbox's own textures (T5).
- **Measured since (2026-11-17, motion set v3): A1 on the broad bases came from the old idles plus the arm stack, not the
  sleeves.** On a 9-person pick with v3's men's idles (ACCAD Male2 and Male1 standing, knee-solve corrected to K1 ≤ 5°,
  the head level; the old CMU 77_02 and 82_08 idles stood on knees bent 20-22° with the head 58° down), A1 went 22 → 0 for
  the same people: Construction_Male_02 10 → 0, cap_Police_Male_03n 7 → 0, cap_Military_Male_03n 4 → 0, cap_PM02m 1 → 0
  (Male_Adult_05 shares cap_PM02m's mesh). The bind-mesh least hang (14-17°) is a bound, not what the arm rests at. The
  sleeves' slimming (T5) is held: the tool is ready (`tools/unity/people/body_slim.py`, with `BodySlim.cs` beside it) for
  one case only, a padded sleeve or slab found at the game camera or by §2.6 of `docs/PEOPLE_MOTION.md`.
- **Motion sets v2-v4 in the game (2026-11-17).** Imported by sex and gait set (`Pace.MenSets`, `WomenSets`; the men's
  idles `idle_m`, `idle_m_b`, the women's `idle_f`, `idle_f_c`). Measured on 9-person picks: (1) a gait's natural stride
  on a body, from its sole contact points at their lowest, played in place (`PaceCalibrationTests`): the women's clips
  within 2 % of what `Pace` assumes, the men's 4-13 % longer (hidden by FootPlant's pinning; **the next batch's first
  change**: Pace from each clip's measured stride per body, then FootPlant's pinning retired where it goes unused);
  (2) W6 caught real joggers' toe-off (3.1-4.5 cm on their own skeletons) and now needs the sole still vertically too;
  (3) **open:** set v4's re-cut jogs lift a stance foot 4-9 cm, still both ways, once a stride (men's `jog`, `jog_b`;
  women's `jog_f`, `jog_f_b`) where set v1's cut of CMU 35_17 lifts none: everyone jogs on that cut (`jog_v1`) until the
  helper's next set (the women's jog is a man's capture until a woman's cut stands in game); (4) **open:** Unity still reports the Neck2
  in-between error on v4's clips (3-29°), so the retarget loses part of the neck's pose.
- **Whole cast on motion set v4 (2026-11-17 12:53, not committed: W1 0 → 13 from the stride mismatch).** With the new
  idles, the gait sets, `jog_v1` for everyone and the limits above: 17 failures against the committed 55. A1 25 → 0,
  W6 11 → 0, C1 8 → 0, A4 4 → 1, F1 1 → 0, F2 1 → 0, F5 1 → 0, K1 1 → 0, W3 3 → 3 (cap_Police_Male_03n's walks), W1 0 → 13
  (thirteen women's jogs at 5-6 % of frames over 15 cm/s). The W1 cause, measured: the women jog on a take whose stride on
  these bodies is about 13 % longer than `Pace` assumes, so it plays about 13 % fast and the planted foot runs back about
  0.4 m/s at each touchdown before the lock takes it (0.3-0.45 m/s in the traces, once a stride). Next: `Pace` from each
  clip's measured stride, FootPlant's touchdown lift-and-drop taken out, then the whole cast again.
- **The stride batch and motion set v5 in the game (2026-11-17, editor owner; picks of 9-14 people).**
  (1) *Pace from each clip's measured stride* (`Pace.StrideMen`, `StrideWomen`: the clip played in place on a body as the game
  makes it, its sole contact points' backward speed at their lowest, `PaceCalibrationTests`; the ratio is the same to three
  decimals on every body of a sex, so one factor per clip and sex is exact). With FootPlant as committed, the 9-person pick's
  W1 went to 0 for both sexes (Female_Adult_07, a v4 whole-cast failure, among them): the women's W1 13 was the stride
  mismatch. (2) *FootPlant's touchdown lift-and-drop removed* on top of it: W1 0 → 14 on the same pick (every jogger but one,
  5-9 % of frames over 15 cm/s, mean 2-3 cm/s): each jog foot reaches the floor still moving 2-3 m/s and slows over about four
  frames (0.9, 0.33, 0.11 m/s) before the hold takes it. Not committed. The skim is in the clips' stance-foot curves and in
  their sources: at the clips' 30 fps keys (Blender dump; the slower of ankle and ball, over the ground with the clip's travel)
  from the key before touchdown, v5 `jog` 1.89, 0.16, 0.19, 0.10 and 2.79, 1.61, 0.60, 0.07; `jog_b` 1.93, 0.50, 0.12 and
  1.77, 0.47, 0.20, 0.18; `jog_v1` 2.78, 1.62, 0.65, 0.11; `jog_f` and `jog_f_b` creep through the whole stance (medians 0.46
  and 0.44-0.83 m/s). On the actors' own skeletons at their true rates, CMU 35_17 (120 Hz) runs 0.57-1.11 m/s at contact,
  0.3-0.45 at +17 ms and 0.1-0.5 to +67 ms (resampled to 30 fps: 2.03, 0.34-0.43, 0.16-0.20, 0.10), CMU 141_02 (60 Hz)
  0.58-0.95, 0.37-0.52, 0.2-0.7: a joint centre rolling over the heel, and 141's solver creeping. **Decision:** the clearance
  stays exactly as committed, not extended, and is retired once motion set v6 plants each stance foot's contact point by IK in
  the converter from the touchdown key on (the offline helper's task); a heuristic that hides a cause is not made permanent.
  (3) *Motion set v5 imported* (open loops, Neck2 held at rest: Unity reports no in-between warning on any clip). Strides
  re-measured on v5: `jog` 1.119, `jog_b` 1.046, `jog_f` 1.065, `jog_f_b` 0.702, `run` 0.995, `run_c` 1.019; v5's walks
  `walk_slow` 0.933 (v4 1.069), `walk` 1.082, `walk_b` 1.092, `walk_d` 1.064, `walk_brisk_b` 1.055, `walk_slow_b` 1.120,
  `walk_f_b` 0.987. On a 14-person pick every jog passed (women on `jog_f`, a woman's capture; men on v5's `jog`/`jog_b`;
  W1 and W6 0), but v5's walks regressed where v4's had passed: W1 6-7 % on three of seven women's `walk_f_b`, W6 2.7-3.1 cm on
  Construction_Male_02 and cap_Military_Male_03n, W3 35.1-38.5 on three men. **Batch:** v5 for everything but the walks,
  which stay v4's cut with v4's speeds and strides; `jog_v1` retired for men and kept for women only past `jog_f`'s RateMax;
  `jog_f_b` out (its stride is 0.70 of its speed: a rate of 1.59, P1). v6 has to plant the walks without losing what v4 had.
  (4) *cap_Police_Male_03n's W3 split* (the trace, both arms pooled): his sagittal swing |p98| 30-31° is within real walkers'
  13.5-37° (median 27; 11 walking segments of CMU and ACCAD, `tools/qa/calibration/w3_split.py`; the game side from the gate trace, `tools/qa/w3_trace.py`), but his
  abduction is p50 16-17°, p98 30-31° on v4 (p50 21° on v5's walk) against real walkers' p50 6.7°, p98 7.5-25.8° (median 14):
  the arm is held out, not swung too far. The approved slim (`tools/unity/people/body_slim.py`, `BodySlim`, his own files
  only) moved 145 vertices (p50 0.27, max 0.86 cm): his sleeve's radius p90 11.4 → 10.9 cm, elbow 6.3/9.7 → 6.1/9.2 cm
  (median/p90), the least hang with his sleeve 17.5 → 16.7°: his sleeve is within 0.1 cm of a real arm in a jacket, so the slim
  barely changes the hang. What holds his arm out is `ArmClearance`'s push against his torso and belt gear while walking
  (a waist at the elbow of 41.1 cm, real men's p98): **the next item for T3** (the contact-preserving solve: the arm resting on
  the side with the flesh and cloth giving, T4), not a looser W3.
- **Whole cast on this batch (2026-11-17 20:02, committed).** Pace from the measured strides, motion set v5 but the walks
  (set v4's), cap_Police_Male_03n's slim, FootPlant as committed, side/combat merged: the states measured before go **55 → 4**,
  no measure worse: A1 25 → 0, W6 11 → 0, C1 8 → 1, A4 4 → 1, W3 3 → 2, F1, F2, F5, K1 1 → 0, W1 0. Left: cap_Police_Male_03n's
  walks (W3 p98 36.0 and 38.0: his arm held out, the T3 item above), Medical_Male_02 looking 135° round (A4 p98 6.2 > 6.0;
  look45 in the v4 run), Medical_Male_03's wave (C1 max 3.3 > cap 1.5 in one sample of 44, p98 0). **The fight's states, the new
  baseline** (§2.7 of `docs/PEOPLE_MOTION.md`, keyed "<measure> combat:<set>" in the verdict, all 79 people): 6456: aim 1923
  (K1, H1, H2, H3, A1 237 each, F1 193, Kb and F4 158, A2 76, C1 67, F3w 63, F2 23), strike 1748 (F1 474, A2 420, A1 237, C1
  179, Kb, H2, F3w 104 each, WG2 98, K1 25, F2 3), aim_pistol 675 (K1 and H1 237, F4 104, F1 74, F2 23), ready 510 (F1 222,
  WG2 158, C1 130), crouch 342 (K1, F1, F4, WG2 79 each, Kb 25, C1 1), throw 289, guard 254 (A2 158, F1 96), reload 227, hit
  183, yield 157, carry 144 (WG2 79, C1 65), rise 4. Their causes and fixes are side/combat's (head 28d6d776: holds by IK per
  body, models fitted to their nulls, the fight's feet on the ground, the foot lock following the clip, stances stepped,
  rounds fired on the hold), with the gate's own items (a)-(d): F1 by the lowest sole point in strikes, strike A1/A2 per
  strike class from its own actor, the guard's A2 against the clip played, the aim's head turn traced with the gaze off.
- **Motion set v6.1: the Neck2 Rig Error was the project's stored avatar configurations (2026-11-17, offline helper).**
  v6's files hold Neck2 at its rest in the bind and every frame (0.00°), and above the legs v6 equals v5. Unity judges a take
  against the configuration stored in the clip's `.meta` (`humanDescription.skeleton`), which it builds at a clip's first
  import and reuses on every later one: 2026-10-29 for the old names, each newer clip's first import since. That angle
  reproduces Unity's twelve figures to 1e-4° (jog 14.2743 ... walk_f_c 45.2163); v5 read the same against the same metas, and
  the 16 CMU clips not re-imported carry it too (10-50°). Fix: v6.1 is imported with its staged metas (none stored); the
  clip QA's `configuration` check judges Unity's own rule (`--project` against the project's metas) and the converters'
  last step checks the written FBX and `.meta`. **Decisions (coordinator):** `MotionImportPostprocessor` rebuilds the stored
  configuration whenever a clip's file changes (editor owner); the Humanoid hands are LeftHand/RightHand themselves with the
  wrist twist bones in-between under convention D (Unity's stored mappings made the twist bones the hands, held at rest, so
  the hands' captured turn, up to 54° in `talk` and 107° in `wave`, was discarded). The clip QA judges the in-between bones by
  that mapping, fails a stored mapping that makes a twist bone a hand, and checks every gesture's hand turn against the
  capture (fails above 5°; v6.1's gestures read 0.00-0.03°, the frames of repaired solver flips left out).
- **Known fact, left as it is: Unity builds a clip's avatar configuration from the take's first key, not from P4.8's T-pose.**
  The converters key the T-pose (`t_pose_key`) only as the FBX models' default values; the take starts at frame 1 (1/30 s).
  The configurations Unity stored match their takes' first keys on the trunk within 0.1° wherever the cut has not changed
  since (drink, fall, pickup, sit, stretch, talk, wave, yawn). Kept (coordinator, 2026-11-17): the first key is a real
  standing pose, which is the reference wanted.
- **The clips were wrong in ways the gate could not see.** 21 of the 28 clips fail the new clip QA: `idle` and `stretch`
  played at twice their speed (CMU 141 is 60 fps, not the listed 120; it is subject 106, a woman); six clips from women
  played on men, every gait of unrecorded sex on women; slides and seam pops. 41 sex-matched clips are staged (25 pass).
- **A1's limit agrees with real people** (quiet-standing p98 median 13.6°, 1 of 14 over 20°): it stays.
- **Limit decisions** (coordinator, each from real captures and the literature, none of which removes any of the 55):
  K1 stays ≤ 8° (anatomy 0-5°, Kendall) and is applied to the clips too (an idle whose own actor bends the knee past it is
  not used); K5 measured against the body's front, allowing toe-out (K5 ≤ F3s + 10°); W1 counts a sole as on the ground only
  while its foot bears weight (a swing passes 1-2 cm over the floor: Winter 1992, Moosabhoy 2006); W3 jog sourced at p98 ≤ 55,
  cap 65 (real joggers 39-52°); W4's lower bound −25, cap −32 (real walkers glance down to −25…−34°); **F3a tightened** to
  p98 ≤ 12 cm, cap 20 (real quiet standing ≤ 6.9 cm); playback speed and cadence per clip added (T6). The gate's code and
  `docs/PEOPLE_MOTION.md` change together, with these sources, in the editor owner's next gate change.
- **Order now:** import the sex-matched clips and the speed fixes; slim the five bases' baked sleeves and gear; the limit
  changes; then a whole-cast run. T3 (one contact-preserving solve) is prototyped in parallel and replaces the correction
  stack state by state as before; T4 where contact remains.
- **Still open (offline helper):** men's idles, stretch, yawn and sit from documented men (ACCAD Male1/Male2 need a
  position-based re-solve); faster women's walks (the staged ones are 0.86-1.08 m/s, so 1.4 m/s would need a playback rate
  past `RateMax`; **settled by T2b:** the women's walk is ACCAD Female1's B13, 1.15 m/s, which a woman's body plays at
  about 1.03 for the townsfolk's 1.25 m/s and 1.15 for the player's 1.4: game speed never depends on sex, and `RateMax` is
  not raised); idles whose actors stand straight (K1) and hold the head level (the game's `idle` looks 35-42° down: H1);
  the staged clips' remaining seams and slides.

- **Found in the editor: Unity fills a clip's avatar configuration from the take's first key, not from the rest pose
  (2026-11-17, editor owner).** With the take imported, Unity poses the model at the take's first key and builds the
  configuration from it with every limb as captured (only the hips are turned to face +Z and the shoulders and upper arms
  levelled); the converters' T-pose (`t_pose_key`, the FBX's default values) is read only when the model is imported without
  its take. So each clip was retargeted from wherever its cut began: between clips of one CMU skeleton the stored limbs
  stood 90-160° apart (upper arms 86-126°, `jog`'s right foot 106°, `idle_m`'s thigh 159° against `wave`'s). When v6.1's
  fresh metas put each clip on its own first key (in place of its first export's), every jogger's stance sole rose (W6 mean
  p98 on the jogs 0.50 → 1.78 cm and 0.88 → 1.75 on the whole cast's first ten, Business_Female_01 2.6 > 2.5) and the CMU
  gaits' strides moved 2-7 %, the motion unchanged: the reference is part of the retarget. **Fix (coordinator's decision):**
  `MotionImportPostprocessor` (version 12) keeps the SHA-256 of each clip's file in the importer's userData; when it changes,
  the first import reads the model without its take, so Unity fills the emptied description from the T-pose, and the second
  (`Configure`, `ConfigureAll`) puts the explicit mapping over it (22 bones by their own names; the hands `LeftHand`/
  `RightHand`; Neck2, the wrist-twist bones and the hip joints in-between) and imports the take. `MotionImportTests`
  (EditMode) holds it: each clip stamped with its file's hash, the mapping, a valid Humanoid avatar, every configured bone the
  file's T-pose within 0.5° and 1 mm but the five Unity's setup normalises (the hips; the shoulders and upper arms, levelled
  within 4.6° of the horizontal), and across clips of one skeleton the configured segments pointing one way (legs 0.0°, arms
  within 6.0°, spine, neck and feet within 24.9°: each subject's own spine curve and foot). The helper's clip QA against the
  project's metas (`--project`): no configuration or mapping failure on the 38. On the clips' own avatars (Unity's retarget
  against the same file sampled raw, in the hips' frame, p98): the hands' turn within 5.4° of the capture, their position
  within 3.1 cm, the forearm's direction within 4.7°, the forearm's roll about the twist share (`wave` left 69° against half
  its 142°; with the first-key configuration 153°); the turn the old mapping dropped was `wave` 150/106°, `argue` 84/62°,
  `talk` 62/47°, `walk` 38/37° (left/right). Strides re-measured on the T-pose (`PaceCalibrationTests`, Business_Female_01,
  Female_Adult_07, Construction_Male_02, Male_Adult_11): men `walk_slow` 1.128, `walk_slow_b` 1.157, `walk_d` 1.025, `walk`
  1.140, `walk_b` 1.131, `walk_brisk_b` 1.029, `jog` 1.130, `jog_b` 1.145, `run` 1.176, `run_c` 1.015; women `walk_f_b` 1.028,
  `jog_f` 1.106, `jog` 1.087. The fight's clips get the same reference from the combat track.
- **The v6.1 batch's picks (14 people, against the same people in dfc732a4, the states measured before: 4 there).** v6 with
  the old metas and the lift-and-drop removed: 25 (W1 0 → 17, W3 2 → 6). v6.1 on first-key configurations, lift-and-drop
  removed: 23 (W1 0 → 17: 14 jogs of 13 people at 5-7 % of frames over 15 cm/s and three women's sneaks at 6-12 %; W6 0 → 5;
  A4 1 → 0, C1 1 → 0, W3 2 → 1). v6.1 on the T-pose configuration (FootPlant as committed, the fight's layers in, T-pose `Pace`): **87** (A1 0 → 55, W6 0 → 16, W3 2 → 7, A4 1 → 3, C1 1 → 2, F3s 0 → 2, W1 0 → 2; Medical_Male_02's look135 A4 6.2 → 3.4 and Medical_Male_03's wave C1 3.3 → 0.0 fixed): the men's idles and looks hold the arms out (cap_Military_Male_03n idle0 A1 p50 12.5 → 17.0, Medical_Male_02 13.8 → 19.5, Construction_Male_02 look135 p98 17.2 → 22.6), the jogs' and sneaks' stance soles sink (Sports_Male_04 jog W6 p2 −0.2 → −3.3; Medical_Female_01 p50 −0.3 → −1.5), the walks swing wider (W3 cap_Police_Male_03n 34.7 → 41.9). The lift-and-drop stays as committed (the open item below). **No whole cast:** stopped at its first ten on the first-key configurations (W6 0 → 2, Business_Female_01's jog 2.6 > 2.5), not run on the T-pose (the pick already worse); nothing of the batch is committed (WIP on `wip/gate-batch`, 5e87de78).
- **Open: the jog's touchdown (coordinator, 2026-11-17).** Motion set v6.1 holds each stance's contact point still from the
  key *after* touchdown; the touchdown key itself carries the swing's arrival speed (`jog` key by key from the one before
  touchdown: 2.79, 1.60, 0.00 m/s). In the game, at 60 frames a second, the frame between the touchdown key and the next
  reads 0.37-0.46 m/s at the heel and 0.41-0.72 m/s at the ball with the sole down (Business_Female_01 on `jog`, the left foot,
  once a loop, where the loop's seam sits on its touchdown: the sole 3.5, 3.0, 1.4 cm up at 3.9, 3.4, 2.0 m/s, then down at
  1.8-1.9 m/s, then that frame, then 0.00; `unity/test-results/pick_v61_nolift/`), which W1 counts while the foot's slowest
  point is under 0.5 m/s. Real CMU 35_17 at 120 Hz runs 0.3-0.45 m/s at +17 ms after contact on its actor's own skeleton, and
  W1 has no calibration on real joggers (`docs/qa/motion_calibration.md` §4: the skate needs a mesh calibration). **Next:**
  measure W1 as the gate defines it on at least three real joggers' captures at their native rate, then decide between the
  limit and the clip from that evidence; `FootPlant`'s touchdown lift-and-drop is retired only after that.
- **The fight's clips** share the import faults (22 of 73 map the twist bone as the hand; `CombatImportPostprocessor` keeps
  the first import's first-key configuration): an input for the combat track (`docs/COMBAT.md`, inputs for the combat
  track), which ships its metas on the same T-pose reference.
- **The bare retarget, measured at its source (2026-11-17, editor owner; `BareRetargetProbeTests`, EditMode, a diagnostic
  not committed).** Each clip with Unity's retarget alone (the Animator, no FootPlant, ArmClearance, Gaze or Pace; "down" the
  body's own head-to-hips): (a) on its own avatar (the capture), (b) on a body from the T-pose configuration, (c) on the same
  body from the committed metas. *A1, `idle_m`*, p50 left/right: (a) 16.4/12.7, (b) Construction_Male_02 17.1/12.5, (c)
  18.1/14.3 (cap_Military_Male_03n the same): **the T-pose reference reproduces the capture within 0.7°**, the committed one
  is 1.6-1.7° out. **The capture itself is asymmetric** (left 16.4, right 12.7): a left-right difference is the person, not a
  fault; no gate limit assumes symmetry (each arm is measured on its own). *`jog_f` on Medical_Female_01*: A1 (a) 24.9/28.6,
  (b) 27.9/39.2, (c) 35.3/46.8; the skin's lowest point over the ground p50 (b) +2.3 cm, (c) +7.1 cm. *`jog` on Sports_Male_04
  and Medical_Female_01*: the skin's lowest point p50 (b) −4.9 and −4.2 cm, (c) −6.0 and −5.4 (p2 (b) −9.5, (c) −13.8): the
  bare retarget of CMU 35_17 sinks into the floor on these bodies whichever the reference; with Unity's Foot IK on, deeper
  still ((b) −6.5, (c) −9.9 p50), so Foot IK is not the answer for it. *Idles*: the soles 1.7-2.6 cm up in both. So the
  in-game regressions are the runtime's compensations, tuned against the old reference: (1) **ArmClearance's push is
  legitimate on the broad men**: in the game's trace (Construction_Male_02, idle0) the left arm arrives at 17.0° (the bare
  retarget's) with the hand 3.9 cm inside the hip's skin (look135 4.0; the right 2.8), and the clearance turns it out to
  20.0-22.6° (+1.1 at the shoulder, +1.9 for the remainder); the committed reference held the arms 1.6° further out and hid
  that depth. That is the T4 item (the hand resting on the thigh with the flesh and cloth giving 0.3-1 cm, not a 4 cm push),
  per body with its depth, not a looser A1. (2) **The jogs' sink is not FootPlant's moving envelope**: it sets the hips by the
  stride's lowest *ankle* over a flat sole's height; set instead by the soles' own lowest points (the heel, back, ball and
  tip the gate measures), the same pick read W6 16 → 20 (the p2 sink unchanged at −1.5…−3.0 cm on the jogs and sneaks, and
  the men's jogs spiking to 5.3-6.2 cm, over the cap of 4), so that change was taken back; the stance sole's sink comes from
  another part of the foot plant (the hold or the lift of the bearing foot), traced next frame by frame. (3) The canonical arms (the converters' `t_pose_key` keying the
  arms exactly level, so Unity's levelling moves 0°, and the same on the bodies' avatars) are a rigour item, held: (b)
  matches (a) within 0.7° without it.

- **Everyday C1 of chunk 0 (2026-11-18, editor owner; `C1ProbeTests`, PlayMode, temporary: every forearm and hand vertex of the
  baked mesh read three ways at 10 Hz in the idles; `unity/test-results/c1_probe.csv`).** The hand-off's reading (the runtime's
  sparse points under-read a contact the gate reads at 0.5-1.2 cm) is **refuted where reproduced**: (1) the gate's depth (the
  least of the three nearest body vertices' planes) at its worst vertex: Business_Male_02 idle0 0.53-0.56 cm, Business_Female_03
  idle0 0.63-0.71 (the gate's own run: 0.53 and 0.62); (2) the same vertex against the body's own triangles, as the mesh is drawn
  (the nearest point on the torso's and thighs' triangles, inside by the gate's ray parity): **0.13-0.15 and 0.05-0.12 cm**; (3)
  the runtime's `BodySkin.Depth` at that same point: 0.53 and 0.28-0.40, and at its nearest arm point (0.0-0.4 cm away) 0.30 and
  0.28-0.40. So the runtime does not under-read the surface: the gate's vertex-plane depth over-reads it by 0.4-0.6 cm where
  the body's vertices stand 4-7 cm apart over a convex hip (a point under the chord between two vertices is behind both their
  planes). The forearms rest 1-1.5 mm into the drawn surface. Business_Male_05's idle0 (gate 1.2 cm, 10 % of frames) is not
  reproduced alone (0 in 41 samples): to trace in the gate's own run. **Decided (coordinator, 2026-11-18): C1 measures the drawn
  surface**, the exact point-to-triangle depth over the triangles its inside test counts, in every state and on every body; the
  limit stays 0.5 cm and the runtime keeps its own reading (`MotionProbe.DrawnDepth`, `MotionProbeDepthTests`; the planes'
  reading written beside each report, `<report>_c1v.json`, for the record of the cells moved both ways; `docs/PEOPLE_MOTION.md`
  §2.1). A contact that survives the drawn surface (Business_Male_05's 1.2 cm, if it does) is traced as a cause of its own.

## 8. T3 design: the contact-preserving retarget, baked per body (editor owner, 2026-11-17)
**What is solved.** For each base body (79) and clip (28; 4,254 frames at 30 fps, about 4,400 with the idle at its true
speed), every frame once: the clip as Mecanim retargets it to the body (sampled offline on the body's own avatar, muscle
space) is the starting pose and the objective's anchor; the solve changes only what it must.
- *Unknowns:* the muscles of the arms (shoulder 2, upper arm 3, forearm 2, hand 2, each side), the legs (upper leg 3, lower
  leg 1, foot 2, each side), the spine and chest (3 x 3) and the hips' height: about 45 values a frame.
- *Objective:* least squares from the retargeted muscles (weighted per joint: the spine and shoulders cost most to move, the
  wrist least), plus a smoothness term to the frame before (no new jitter), Levenberg-Marquardt warm-started from the frame
  before, 3-6 iterations a frame.
- *Contacts kept from the source, read on the actor's own skeleton (T1's reader):* a sole planted on the frames the actor's
  was (height under 2.5 cm and slower than 10 cm/s, the heel and the ball separately, scaled by the body's hip over the
  actor's) stays where it touched while the body travels at the pace `Pace` gives it; an upper arm the actor rested against
  the side (the elbow's gap to the actor's torso line under the actor's own forearm width) rests against the body's side at
  0-0.3 cm (soft contact; T4 gives the flesh), never pushed out further than contact requires; the palm's gap to the thigh is
  the actor's scaled by the body's hip breadth over the actor's.
- *No penetration:* signed distance from the arm's skin to the body's posed skin, read on the posed mesh itself (the
  gate's own C1 method: baked mesh, closest triangle by a BVH of the torso, hips and thighs, ray parity for inside), not the
  skin's sample points (they misread contacts by 1-2.5 cm at the chest's side and the top of the thigh: the gaze trial, `docs/PROGRESS.md` 2026-11-17). The body is
  posed with T4's correctives at the arm's angle, so the solve sees flesh that gives.
- *Where the constraints conflict* (an elbow that cannot touch a broad waist without the arm 20° out): T4 first; if still
  infeasible, the body goes to T5 (§4), never to a looser limit.

**Storage and runtime.** Per body, one additive humanoid clip per source clip (muscle deltas only, the joints the solve
moved), in an additive layer that mirrors the base layer's states and blend trees; a per-body AnimatorOverrideController
swaps the layer's placeholder clips for the body's, so Mecanim blends the corrections with the same weights, times and
`LocoRate` as the clips they correct. Size: 45 curves x 4,400 frames, keyframe-reduced (deltas are smooth and mostly near
zero) to an estimated 0.3-0.8 MB a body, 25-60 MB for 79 bodies on disk, loaded by Addressables per body in view (about 30:
10-25 MB of memory). Contingency (§4): bodies grouped into 10-15 proportion clusters, one bake per cluster plus a bounded
runtime residual (the remaining foot height and gaze only). At runtime only the terrain feet (a bounded height offset, no
posture work) and the gaze adjust; `ArmClearance` and `FootPlant`'s posture work are retired state by state as each state's
gate is as good or better with the bake.

**Cost of the bake.** Per frame: pose the body (HumanPoseHandler), bake its skinned mesh (~1-2 ms), refit the BVH (~1 ms),
query ~300 arm vertices and the sole points (~0.5 ms), 3-6 solver iterations with numerical Jacobians on the ~45 unknowns
(the mesh is re-posed only for the arm and leg segments that move: ~10-20 ms a frame in all). 79 x 4,400 = 348,000 frames:
about 1-2 hours on the editor machine, Burst jobs across bodies; re-baked only for the bodies and clips a change touches.

**Fast loop (T7).** An editor method, run by `tools/unity/editor.sh run`, that samples a clip on a body offline, bakes its
mesh per frame and computes the gate's measures that need no runtime (A1-A6, C1, the soles' slide and height per contact
frame, H, K): minutes per body and clip, before and after a bake. The whole-cast Unity run only confirms.

**Prototype order.** (1) the T7 measure on Construction_Male_02, cap_Police_Male_03n, cap_Military_Male_03n (idles, looks,
gesture ends) and Business_Female_01 (jog); (2) the arm solve (rest contact + signed distance) on those three men's idles;
(3) the foot solve on the woman's jog; (4) their picks in the gate with the bake applied and the matching heuristics off for
those states; only then a whole-cast run.
- **Clip set v2 (staging/motion/v2, 46 clips, 34 pass) and its decisions (coordinator, 2026-11-17).** Men now come from
  documented men too (ACCAD Male1/Male2 re-solved onto the T-pose, every joint where captured). The converter's own faults
  caused most seam and slide failures (loops cut to a fraction of a frame, a straight blend ramp, hips pinned in gestures)
  and are fixed for every clip. In the game: the women's walk is `walk_f_b` (1.15 m/s; the player's 1.4 m/s at a rate of
  about 1.2, a real brisk 120 steps/min; above 1.4 the jog takes over; speed never depends on sex); the women's idles are
  `idle_f` and `idle_f_c`; the old `idle`, `idle_b`, `idle_c`, `idle_d` and `idle_f_b` come out (their actors' knees 20-24°,
  `idle` looking 58° down), as do `walk_brisk`, `walk_c`, `walk_f_n`, and `run_f` and `sweep` until fixed. No free capture
  of a woman walking faster than 1.27 m/s exists. Standing captures bend the knee 7-24° because of how they were solved
  (anatomy 0-5°): one documented correction is applied to every standing idle alike (knee p98 to ≤ 5°, feet kept, pelvis
  by IK, the size recorded per clip). K1 stays at 8° for the game and the clips. Men's stretch and yawn come from CMU 143_30
  (sex unrecorded) until a documented man's take is found; no free man's chair-sit exists.

## 9. The stance soles' ground: what Unity reads, measured at the source (editor owner, 2026-11-18)
Gate: red, 6460 (dfc732a4; the batch's tree unmeasured). The bare retarget (the Animator alone: no FootPlant, ArmClearance,
Gaze or Pace; EditMode probes `SoleProbe*Tests`, diagnostics not committed; `unity/test-results/sole_probe*.txt`), each clip on
its own avatar and on Sports_Male_04, Construction_Male_02, cap_Military_Male_03n, Medical_Female_01, Business_Female_01 and
Female_Adult_07 (one skeleton per sex: the men's ankles read the same to 0.1 cm on all three), every height in the Animator's
own frame, each foot's own lowest skin point in its stance (within 4 cm of its lowest, rising or falling under 0.2 m/s).
- **What Unity reads as an avatar's feet-bottom height: its configured T-pose ankle's height over the model's root.** On all 15
  clips tested and both body avatars, `Animator.leftFeetBottomHeight`/`rightFeetBottomHeight` equal the configured T-pose
  ankles' heights (the `.meta`'s `humanDescription.skeleton`, chained from the root) to 0.01 cm: `jog` 6.86/5.34, `jog_f`
  3.03/3.58, `sneak` 6.78/4.44, `walk_b` 5.68/3.40, `idle_m` and `run_c` (ACCAD Male2) 8.58/8.53, the men's bodies 12.85, the
  women's 12.75. Nothing else moves it: a proxy sole (a skinned plate under each foot 6, 9 or 12 cm under the ankle, built
  into the avatar by `AvatarBuilder`) changes nothing, nor do the toes moved 1.5 times further out, nor the bodies built
  without their meshes. `humanScale` is the T-pose's centre of mass over the same root: raising a clip's T-pose hips by d
  raises it by d (jog +2.21 cm, humanScale 1.0029 → 1.0249).
- **Cause 1, the bodies' T-pose stands 2.69 cm (men) and 2.78 cm (women) over their own bind.** Unity's own avatar setup put
  the Rocketbox T-pose's hips 92.42 cm over the root against the bind's 89.5 (the T-pose ankle 12.85 against the bind's
  10.16, which stands its soles on the root within 0.3 cm). So the feet-bottom height is 2.7 cm too large and the humanScale
  2.6 % too tall: under "from the feet" every clip stands every body 2.6 cm over its ground (the idles' soles +2.0-2.6 cm on
  the bare retarget; `docs/PEOPLE_MOTION.md` §2.7's "the clips as retargeted stand 2.5-4 cm up" in every fight stance, which
  `Fighter.Feet` takes out by bringing the hips down). Stood on the root (the hips lowered by the difference, the bones'
  turns as Unity set them): feet-bottom 10.16/9.97 cm, humanScale 1.0433 → 1.0164 (men), 1.0355 → 1.0077 (women), and
  `idle_m`'s soles +2.6/+2.2 → 0.0/−0.4 cm (Sports_Male_04), `idle_f`'s +2.3/+2.2 → −0.3/−0.4.
- **Cause 2, "Root Transform Position (Y): based upon Feet" is read at the take's first key.** The motion clips import with
  `heightFromFeet` (the lowest feet-bottom at the start on the root's ground). A gait's take begins where its loop was cut:
  `jog`'s first key is the left foot's touchdown, its ankle 14.4 cm over the capture's floor against 8.7 in mid-stance, so
  the whole clip sat 8 cm low on its own avatar (the stance ankle 0.6/1.8 cm over the ground, the toe joints −3.6/−4.4) and
  every body's stance sole −9 cm. The same clip with its loop started at the left foot's mid-stance: its own stance ankle
  7.6/8.2 cm and Sports_Male_04's stance sole −2.1 cm; with the capture's own height (Original) −0.6 cm. Bare stance soles
  (p50, left/right, Sports_Male_04) as imported: `jog` −9.0/−9.3, `jog_b` −8.8/−7.7, `run` −6.2/−4.5, `run_c` −19.6/−15.9,
  `walk` −4.7/−2.7, `walk_b` −2.9/−6.5, `walk_slow` −3.9/−6.5, `sneak` −7.0/−4.8, `idle_m` +2.6/+2.2.
- **Cause 3, each clip's T-pose stands where the capture's base pose put it, not where its actor stands in the take.** The
  converters' `t_pose_key` stands the T-pose with its ankles 3.0-9.5 cm over the root (left and right up to 2.3 cm apart),
  where the actors' flat feet (the ankle and the toe joint each within 1.5 cm of their own floors) stand 4.8-12.3 cm over
  their takes' floors (`jog` 7.80/8.82, `walk` 9.11/8.18, `jog_f` 6.47/8.51, ACCAD Female1's idles 12.1-12.3: her capture's floor
  is 4-5 cm under her soles), and the CMU T-pose feet are pitched 12-17° where the actors stand on them at 14-29° (ACCAD's
  agree within 2°). Unity maps every frame against the T-pose, so with the take's own height a T-pose 3 cm under the take
  sinks every body 3 cm, one over it floats them, and a flatter T-pose foot turns every body's stance foot toes-down. With the
  T-pose stood as the actor stands in the take (the hips so the T-pose ankles' mean is the take's flat-foot mean; each foot at
  the take's flat-foot pitch and roll, the T-pose's heading kept) and the bodies stood on their root, the take's floor no longer
  matters: `idle_f` (her floor 4-5 cm low) +4.2/+4.1 → +0.1/−0.5, `idle_f_c` +5.7/+4.4 → +0.6/+0.1, `jog_f` (CMU 141, its floor
  low) +3.7/+6.5 → −0.6/+0.6, `idle_m` −1.2/−1.6 → −0.1/−0.5.
- **Unity's Foot IK (on in every locomotion state since P4.8) is right only on that consistent reference.** On the clips as
  imported it reached the feet below the floor (the jog −6.5 cm p50, MOTION_ROOT_CAUSE §7); on the stood T-poses with the
  bodies grounded and the take's own height it takes out the stance flexion's mismatch (the humanScale ratio is not the legs'):
  stance soles p50 (left/right; p2 the lowest), Sports_Male_04 / Medical_Female_01: `jog` −0.9/+1.0, −1.3/+2.0 (p2 −1.6, −1.8);
  `jog_b` −1.3/+1.3, +1.7/+1.0; `jog_f` −1.0/+1.6, −1.1/+1.5 (p2 −3.1, −2.5); `run` +0.7, −0.7; `walk` +0.3/−0.6, 0.0/−0.8; `walk_d`
  −1.0/+0.4, −1.3/+0.4; `walk_brisk_b` −0.2/−0.8, −0.4/−1.0; `walk_slow_b` +0.9/−1.3, +0.6/−1.0; `walk_slow` −1.1/−0.7, −1.4/+0.4;
  `walk_f_b` 0.0/+0.2, −0.2/−0.2; `sneak` −1.6/+1.2, −1.9/+0.9 (p2 −3.6, −3.1; −8.7/−7.7 without the IK); `idle_m` +0.3/−0.2,
  −0.1/−0.6; `idle_f` +0.3/−0.3, −0.1/−0.7. **Left:** `walk_b`'s right foot −6.4 and −5.2 (its T-pose right ankle 2.3 cm under
  the left where in the take it stands 1.7 cm over it: the capture's two feet on floors of their own, a converter item: one
  floor for both feet) and `run_c` −2.6/−4.1, −2.7/+0.6 (ACCAD Male2's run, the deepest stance flexion of the set).
- **Fix, at the source (what Unity reads), in this batch:** (1) `MotionImportPostprocessor` version 13 stands each clip's
  configured T-pose as its actor stands in the take (`TakeStance`, measured on the file as recorded: each foot's flattest
  standing keys, the larger of its ankle's and toe joint's heights over their own floors within 1 cm of its least, the hips
  over the floor at least 0.75 of the T-pose's leg; CMU 07's and 08's right feet never reach both floors together, by 1.4-1.8
  cm) and imports every clip that plays in place with the take's own height (Original; never from the feet). Two kinds keep the
  converters' T-pose: a take that travels (`fall`: its height is root motion) and a seated take with no standing stance
  (`sit`, `sit_ground`, `sit_stool`: their height from their first key's feet on the floor, as before; stamped " seated"); (2) `PeopleImportPostprocessor` stands each
  body's configured T-pose on the model's root as its bind does (`Ground`, the cast's and the player's base models); (3)
  `StandOnTheGroundTests` (EditMode, CombatBuild assembly) holds both: each clip's feet-bottom heights the take's flat feet
  within 1 mm and its feet at their pitch within 0.5°, each body's the bind's ankles within 1 mm, no clip read from the feet.
  The converters should write the same T-pose (`t_pose_key`: the hips and feet as `TakeStance` measures them) and plant both
  feet of a take on one floor (offline helper). FootPlant's hold and lift of the bearing foot are traced next on this
  reference, frame by frame, for what remains.
- **The 14-person pick on this reference (2026-11-18, against the same people in dfc732a4, the states measured before: 4
  there):** 87 on the T-pose batch → **74** (A1 57, W6 16 → 7: every jog and sneak passes, the men's walks left at p2 −1.5 … −1.9;
  W3 7, W1 1; A4 and C1 back to the base, Medical_Male_02's look135 A4 6.2 → 3.7 and Medical_Male_03's wave C1 3.3 → 0.0 fixed).
- **W6's remainder: FootPlant held the foot by four fixed sole points, not by its underside.** In the walks the gate's lowest foot
  vertex stood 1.5-1.6 cm under the ground while the heel point FootPlant holds read 0.0 and its ball 0.5 (Medical_Male_02's right
  foot, `walk:walk`, the soles' trace): pitched toes-up at heel strike, the heel's rounded back and the shoe's rear edge go lower
  than any of the four points (the heel, the sole's rear end within 2 cm of its lowest, the ball, the tip). **Fix:** FootPlant
  reads each foot's underside from the body's own mesh at the bind (its vertices under the ankle within 5 cm of the sole's
  lowest, one a 1.5 cm cell, in the foot's and the toes' frames) and lifts and holds a foot by whichever of them is lowest
  (`SoleOver`, `Lowest`). Pick: **W6 7 → 0** (and `W6 combat:carry` 2 → 0).
- **A1's cause, traced step by step (`ArmClearance`'s trace: the hand's depth after each step, what each turn was for, how deep).**
  On Construction_Male_02 (idle) the third step (the shoulder's remainder, +1.9°) was for a forearm point 0.32 cm into the thigh
  14 cm under the hips; on cap_Military_Male_03n and Medical_Male_02 the first turn (3.8° idle, 5.8° in the looks) was for the
  upper arm's third by the elbow, 1-2 cm into the flank 27-29 cm over the hips. Every resting contact was pushed until it stood
  0.3 cm off the skin: an outward offset at rest. A real arm rests against the hip and the flank with the soft tissue giving
  (the thigh's fat and muscle shear at 0.5-1.7 kPa, Segain et al. 2024; the gate's own C1 takes a contact to 0.5 cm), and hangs
  from the shoulders: when the gaze turns the chest, the hand goes with the shoulder (Yoshida et al. 2022: at rest the elbow
  bends 15.5°, the shoulder abducts 4.5°). **Fix:** at rest the forearm and hand may press into the hip and thigh by
  `RestGive` (0.25 cm: the skin's points read a contact 0.1-0.25 cm shallower than the gate's mesh on the broad men, so 0.4 read
  0.5-0.7 cm on the mesh, C1), the upper arm by the elbow lies on the flank at contact (no offset), and nothing that stands
  clear moves; the resting hand is placed in the shoulders' frame, not the hips'. Pick: **A1 57 → 3** (cap_Police_Male_03n's
  looks, 21.7: his left forearm by the elbow 2.5 cm into the belly's front-left where the gaze turns his chest, the first turn
  4.6°; traced below).
- **The looks' A1: the gaze turned the trunk, which a real look of 20° never does.** `Gaze` holds every look within 20° of the
  body's front (`MaxYaw`) and gave Unity's look-at a body weight of 0.25. Measured on three people (a probe on the game's own
  people: the spine's, chest's and upper chest's yaw on the pelvis, the left upper arm, ArmClearance's push): for a look at 45°
  (held at 20°) the upper chest turned 7.6° on cap_Police_Male_03n, 8.4° on Business_Male_01, 7.4° on Female_Adult_01, and 1-5°
  even for a look straight ahead (the look-at drawing the idle's raised face level by the trunk); the left shoulder came forward
  with it and laid his hanging arm across the belly, so ArmClearance turned it out 4.6° (A1 17.0 → 21.6). At body weight 0.1
  the turn was 3.4° (A1 20.1), at 0 none (A1 18.6, within the idle's own phase-to-phase spread of ±1.5°). Real people: a
  standing person's torso takes no part in a gaze shift under 45° (Sidenmark & Gellersen 2019, ACM TOCHI 27(1):4: 7,600 gaze
  shifts of 20 people, seated and standing, eye, head and torso tracked; the torso moved in 85 % of standing horizontal shifts
  only from 45°), and gaze shifts up to 90° are made mainly by the eyes and head (Cinelli, Patla & Stuart 2007, Exp Brain Res).
  **Fix:** `Gaze.BodyWeight` 0: a look is the eyes' and the head's (the head on the chest stays within H2: 18-21° at a 20°
  look, the limit 30). The arm hangs where the clip has it; nothing in ArmClearance changes for it.
- **What it leaves: the broad men's resting arms at the edge of A1 (pick v4a, 15 cells at 20.0-23.7).**
  - The men: Construction_Male_02, Medical_Male_02, cap_Military_Male_03n, cap_PM02m, in idles, looks and the moments after
    gestures.
  - The gaze's body weight does not decide it. On the same men, 0.25 against 0, A1 p98 moves ±1° either way: 17.0-21.1 and
    17.1-21.0.
  - Neither the hand's place nor the elbow's bend reaches it. `RestFront` 15/30/45° and `RestFlex` 15/22° move A1 p98 by at
    most 0.1°.
  - The contact is the forearm by the elbow, 1.3-3.0 cm into the waist and its gear, with the upper arm already at
    `AbdMax` (17°).
  - On a waist's elliptic section, moving the elbow forward clears less per degree of A1 than moving it out: 5 cm forward
    (10°) clears about 1.2 cm, which 2.4° outward also clears. So a forward-first order would raise A1, not lower it.
  - The geometry is T5's (`docs/qa/body_geometry_audit.md`): these bases' waists at the elbow are at real men's 98th
    percentile, and with their sleeves and gear the least hang is 14-17°, where a real man in a jacket needs at most about
    11°.
  - For a decision by the coordinator or the owner, not a silent change: the garments brought to real thickness
    (`BodySlim`, as for cap_Police_Male_03n's sleeve). The limit stays.
- **Found on the way, open (the people's own states):** with the references consistent, Unity's Foot IK (on in every locomotion
  state) still bends a straight leg: on Male_Adult_08 and Female_Adult_01 the standing idle's straighter knee is 0.0° played
  bare and 18.9° / 21.0° with Foot IK, the ankles moving under 0.4 cm (the goal is the take's foot by the humanScale ratio, and
  a near-straight knee turns 10-20° for a centimetre). Standing, FootPlant's bearing leg takes it out (K1 passes in the idles);
  its reason in P4.8 (the feet 1-2 cm off the floor on the old reference) is gone (played bare on the stood reference, the
  ankles are within 0.9 cm of the bind's). Under the fight's layer it was not taken out (COMBAT_ROOT_CAUSE, 2026-11-18, item 5).
  To be traced for the people's own states as its own item: whether Foot IK still does any good there.
- **Everyday C1 on chunk 0 of the v41c whole cast (2026-11-18: 0 → 12 cells against dfc732a4), traced from the gate's own
  worst-contact lines (`HumanMotionGate clip:`).**
  - Every cell is the right forearm on the right hip or thigh, at 0.93-1.04 m:
    - Business_Male_05 1.0-1.2 cm under the gate's mesh;
    - Business_Female_03 0.5-0.7;
    - Business_Male_02 0.5, at the limit.
  - ArmClearance's own skin points read the same contact at 0.1-0.4 cm. The game's nearest forearm point lies 0.0-0.4 cm from
    the gate's deepest forearm vertex, and its nearest thigh point 0.9-1.5 cm from the gate's thigh vertex.
  - So the sparse points (the arm about every 3 cm, the body about every 2.5 cm) under-read the forearm's and the hip's
    convexity by 0.3-1.0 cm.
  - The change that exposed it is the resting give (`RestGive`, the forearm and hand allowed 0.25 cm into the skin points at
    rest). Before it, the moving margin kept a resting forearm 0.9 cm off them.
  - Not yet fixed. The source fix is the skin points' reading of the surface where a forearm rests: denser points on the hips'
    and thighs' sides and the forearm, or each point's local surface. A smaller give would only shift the threshold. Item for
    the next batch.
- **The fight's new head cells (chunk 0: H2 ready 0 → 26, H3 ready 0 → 20, H1/H2 in reload, yield, strike, hit, throw).**
  Not traced in frames yet. The leading hypothesis has two parts:
  - The gaze's head weight (0.9) aims the head at nearly the whole look. Real gaze shifts under about 20° are made almost
    entirely with the eyes, and the head takes about a third at 30° (the 2024 review cited in `docs/qa/arm_build_evidence.md`'s
    search; Sidenmark & Gellersen 2019).
  - With the trunk's share now 0, the head's share is no longer offset by the chest.
  A trunk share as a function of the look angle (none under 45°, rising beyond) changes nothing while every look is held
  within 20° (`Gaze.MaxYaw`). The candidate cause is the head's share at small angles, which is also what keeps the idle's
  raised face level (H1). Tracing frames comes first.

- **C1's cause on the way: the upper arm divided differently from the gate.** ArmClearance gave the chest's soft contact
  (`UpperGive`, 2.5 cm) to the upper arm above its third by the elbow by the distance to the elbow joint; the gate divides it by
  the share along the bone from the shoulder (0.65): a surface point 4-5 cm off the bone near the boundary was the chest's
  contact for the one and the elbow's third for the other (Construction_Male_02 idle1: the upper arm 1.6 cm into the chest,
  unmoved, C1 1.6). **Fix:** the same division as the gate's.
- **W3's cause: the swinging arm pushed out for a contact C1 leaves out.** Walking, the left arm of Medical_Male_02 and
  cap_Police_Male_03n was turned out 16-20° (median; p98 24-26°) for the upper arm's upper two-thirds 6 cm into the torso at the
  armpit (the trace's first-turn depth): the contact both soft tissues take, which C1 does not count. **Fix:** moving, that part
  of the arm is never a reason to swing the arm out.

## 10. C1's two traces from chunk 0 (editor owner, 2026-11-25, a fresh container)
Gate: red, 6460 (dfc732a4; the batch's tree unmeasured). The gate's own run on the two men (`PickedPeopleStandAndMove`), every
state's worst contact written by `MotionProbe.DumpC1` (env `C1_DUMP=1`: the arm vertex, every mesh triangle within 8 cm with its
corners' parts and normals, the inside test's three rays and their crossings; a diagnostic, never a measure).
- **Reproduced:** Business_Male_03's left forearm (vertex 698) 0.9-1.16 cm under the drawn surface in idle0, slope, look0 and
  the moments after the gestures, where the three nearest vertices' planes read 0.2-0.4; Business_Male_05's right forearm
  (vertex 879) 0.8-1.05 cm, the planes 1.0-1.2. 12 everyday C1 cells between them.
- **The hole in the triangle set: refuted.** In all 24 dumped worst contacts (the two men's everyday and fight states) the
  nearest triangle of the whole mesh that has no arm corner is the gate's own body triangle, at the same distance, and each
  of the three level rays crosses the surface once (inside). The drawn depth is the real distance to the body's surface.
- **The cause, both men: the runtime's skin reading.** `BodySkin.Depth` gave a point the vote finds inside the least of its
  three nearest skin points' plane depths. Where the skin curves or creases one of the three stands on a facet turned away:
  - Business_Male_05: 1.1 / 1.4 / 0.2 cm, the 0.2 from a point 2.2 cm off on the hip's side turned 25° back;
  - Business_Male_03: 0.2 / 1.2 / 0.7, the 0.2 from a crease vertex whose normal points down (the hip's top under the waist);
  - read 0.2 cm, under the arm clearance's resting give (0.25 cm): the forearm stayed 1.1 cm in.
  The gate's own vertex-plane reading before 2026-11-18 had the same fault (0.2-0.35 cm on the same contacts).
- **Offline, on the dumps:** Kolluri's implicit moving-least-squares surface (each nearby point's tangent plane weighted by a
  Gaussian of its distance; Kolluri 2008, ACM Trans. Algorithms 4(2):18) reads the resting contacts within 0.1-0.3 cm of the
  drawn depth at bandwidths of 1.5-2.5 cm, where the least of three is 0.6-0.9 cm short. At the fights' deep torso contacts
  (1.1-3.2 cm) neither reading is right (least of three 0.1-0.5 cm over on four, 1.5 short on one; the surface reading 0.3-0.7
  over on four, short on two).
- **Fix:** `BodySkin.Depth` and its Burst job read a point the vote finds inside against the hips and thighs (the low band,
  `LowFlag`: torso and thigh points from 45 cm under the hips to 15 cm over them, where resting forearms and hands hang) by
  that surface (`BodySkin.Surface`: every body point within two bandwidths, the bandwidth the nearest point's spacing within
  1.5-3 cm, never past a cell); the inside/outside vote is unchanged, and the chest and waist above keep the least of three.
  - Measured on the two men (the gate's pick): everyday C1 12 -> 0 (Business_Male_03 0.9-1.16 -> 0.0 cm, Business_Male_05
    0.8-1.05 -> 0.33-0.44), no other cell moved; the arm clearance's cost unchanged (14.7 / 7.7 ms a person a frame in the
    editor, against 13.9-15.3 / 8.7-9.5).
  - **Read so in every band (the coordinator's first instruction, since withdrawn), it made things worse:** the whole cast's
    chunks 1-3 went 2 -> 47 everyday cells, and an A/B on seven of their men (the same group, only `BodySkin.cs` swapped)
    read 11 cells with the least of three against 38 with the surface everywhere: A1 7 -> 28 (cap_Police_Male_01n,
    cap_Security_Male_01n in every standing state, p98 20.3-20.5 against limits of 20.3-20.4: the upper arm on the flank read
    deeper and pushed out), C1 0 -> 6 (the talk gesture's upper arm against the chest's side on cap_Fire_Male_07n,
    cap_Military_Male_02n, cap_Police_Male_03n). With the surface only in the low band the same seven read 13 (A1 9: the
    two extra are Construction_Male_02's looks at 20.5 against his 20.1, his forearm now held out of his hip), no C1.
- **Open, recorded (not this batch's cause): the gate's armpit part filing.** `MotionProbe` files each vertex by its nearest
  bone line in the neutral pose alone; the runtime's skin (`RocketboxLayers`, 2026-11-08) gives a vertex nearer an arm's line
  to the torso when the arm's bones weigh it under half. Read from the skin's own response (the upper arm turned 20° about two
  axes, each vertex's move over a rigid arm's: the arm bones' weight; the meshes are not readable in play mode), every person
  of the 79 has such vertices: 3,784 in all (13-254 a person, median 36; Police_Male_06 166, cap_Fire_Male_07n 254,
  cap_Military_Male_03n 143, Medical_Male_01/03 136), all filed under an upper arm (6 of cap_Fire_Male_07n's in its third by the elbow, which C1 counts); the gate's
  body set drops 3,808 triangles for them (16-197 a person), all 20-60 cm over the hips (30-50 cm on every one of the 79): the
  chest's side under the armpit. None of the two men's 24 worst contacts lies there. Item: file the gate's vertices as the runtime's skin
  does (an arm part only when the arm moves it half), with the cells it moves listed.

## 11. The looks' A1: the shoulders hang from the neck (editor owner, 2026-11-26)
Gate: red, 6460. In the batch's chunks 1-3, cap_Police_Male_01n and cap_Security_Male_01n read A1 23.1-23.4 in look45, look90
and look135 (their build limits 20.3-20.4; idle 18-19), Construction_Male_02 20.2-21.3 (his 20.1); dfc732a4 passed them all.
- **Trace (`LookProbeTests`, temporary: each trunk bone's yaw on the pelvis, the line between the shoulders, the right upper
  arm's forward and outward angles, the arm clearance's push; Gaze.BodyWeight 0.25, 0.1 and 0; looks at 0 and ±45°):** at
  BodyWeight 0 the spine, chest and upper chest do not turn (the upper chest 2.0° at every angle), yet the line between the
  shoulders turns 7.1° -> 16.4° for a look right held at 20° (-> -1.8° for one left); the right upper arm swings back (-2.2° ->
  -6.4°) behind the flank's widest part, the arm clearance pushes it 5.8° out for a contact 1.8 cm deep (0.4-0.8 in the idle),
  and A1R 18.2 -> 22.8. At BodyWeight 0.25 the chest turned with the shoulders (14.9°), which hid it: dfc732a4's value.
- **Cause:** the Rocketbox skeleton is 3ds Max's Biped, whose clavicles hang from the neck (`Bip01 L/R Clavicle`, parent
  `Bip01 Neck`, in every body's `.fbx.meta`), and Unity's look-at gives the neck a share of the head's turn: every look carried
  both shoulders round on a still chest. A real head's axial turn is made mostly at C1-C2, and the shoulder girdle rides on the
  thorax, not on the cervical spine.
- **Fix (`Gaze`):** the head is turned at its own joint after the animation (round the vertical, then up or down about the
  face's level right, by `HeadWeight`, within the same clamps); Unity's look-at turns only the eyes (and the trunk by
  `BodyWeight`, 0). The face's axis is taken in the avatar's neutral pose, as the gate takes it (taken from the pose the model
  was saved in, Female_Adult_01's levelled face stood 15.3-16.1° low, H1). On the nine picked people: the line between the
  shoulders 0.9° at every look angle, A1R in the looks 17.7-18.0; everyday 13 -> 3 (A1 9 -> 1, W3 3 -> 1); the fight's H2 aim
  27 -> 0, H3 aim 9 -> 0, H2 strike 16 -> 8, H1 aim_pistol 3 -> 0; worse: A1 combat:aim 2 -> 23 (the rifle aim's upper arm
  41-49° at p2 against 54.8: the neck's swing had been raising the shoulders; dfc732a4's key stands at 237) and FY2 strike 0
  -> 8.

## 12. The runtime's skin against the drawn surface: filled points off it, and gear's sharp features (editor owner, 2026-11-26)
Gate: red, 6460 (dfc732a4). The whole cast of the batch's tree before this round (hash 8d5742a5, three runs of resumable
chunks): every fight key but a few far down (overall 6460 -> 3815), but the everyday states 4 -> 22: C1 5 (Construction_Male_06's
right forearm at the hip, 0.5-0.8 cm, slope, look90, after:argue, turn, talk), A1 2 (Construction_Male_02/03 in the second
men's idle, 21.3/21.5 against 20.1/20.0), A4 1 (cap_DM01s, second idle, 6.6), W1 1 (Female_Adult_01's jog, 6 %), W6 1
(Medical_Female_01's jog, max 4.4), W3 12 (the women's walks: Female_Adult_15 3, Medical_Female_02 2, Medical_Female_03 3,
rel_FA06k 2; Police_Male_06 1, cap_Police_Male_03n 1).
- **Trace (`SkinTruthProbeTests`, temporary: the gate's own pick with a watcher that measures each of the runtime's arm
  points against the drawn surface every second frame, inside by the gate's ray parity, beside `BodySkin.Depth`, and dumps each
  state's worst frame with the runtime's body points and the drawn triangles; offline readings of the dumps):**
  - Construction_Male_06's forearm point 3608 (its sleeve 0.4 cm) stood 0.9-1.03 cm inside the drawn hip while the runtime
    read it 0.53 cm (the low band's IMLS) in some frames and outside in others. The body points there are a belt pouch's facets
    (split vertices, the pouch's top facing up 2 cm under the contact, an inward-tilted face kept by the inside-faces test at
    -0.18 against its -0.2): the three nearest stand within 0.06 cm of one another's distance and vote either way, and the IMLS
    averages the pouch's top into the trousers' side (a concave corner, which a smoothing kernel under-reads).
  - **The filled points stood off the drawn surface.** On every body traced the skin's points on mesh vertices sit on the drawn
    surface (0.00 cm), but the filled points (every 2.5 cm on the big triangles: most of a coarse hip's and flank's points)
    stood outside it along their normals, less their clothes, by p50 0.58, p90 1.27, p98 1.59 cm (2440 points of
    Business_Male_03/05, Construction_Male_06, cap_DM01s, Female_Adult_01). RocketboxLayers put them on the curved (Phong)
    surface of their corners' normals on 2026-11-08, when the gate read the vertices' planes; the gate reads the drawn, flat
    triangles since 2026-11-18. The arm clearance held elbows, forearms and hands off a surface that is not drawn: the
    second idle's elbow against Construction_Male_02's flank read 1.3 cm in (the push 4.1°, A1 21.4), cap_DM01s's forearm at
    the thigh's pocket 2.1 cm (the shoulder's remainder 6.6°, the hand thrown 5.7 cm off the thigh, A4 6.7).
- **Fix, at the sources:** (1) `RocketboxLayers.Skin`: the filled points on the triangle as drawn, with the face's own normal;
  every person's skin points rebuilt (`RocketboxPeopleBuild.BuildSkins`: the layers and skin points only, no prefab saved; the
  79 `_skin.bytes` changed, the layers byte for byte the same). Measured on the rebuilt bodies (2511 filled points of twelve
  people): off the drawn surface p50 0.00, p90 0.08, p98 0.22 cm. (2) `BodySkin.Depth` in the low band (the hips and thighs):
  whether a point is inside and how deep from the robust implicit surface of the points near (RIMLS: Öztireli, Guennebaud and
  Gross 2009, Computer Graphics Forum 28(2), a moving-least-squares surface that keeps sharp features by reweighting each
  point by its plane's residual and its normal's agreement), in place of the nearest-three vote and the IMLS there. Offline on
  the first dumps (659 arm points of five people, 75 contacts): under-reads past 0.2 cm 22 -> 4, the inside test wrong 71 ->
  59 (the rest are the filled points' over-reads, which (1) removes).
- **Measured in the game (the gate's pick of 18 people: the failing ones and controls; not a verdict):** everyday cells 22 -> 17
  on those people (the whole cast's run before against the pick after), their fight cells 896 -> 722. Gone: Construction_Male_02's
  A1 (21.4 -> 18.4, the push 4.1 -> 1.3°), cap_DM01s's A4 (6.7 -> 3.7, the shoulder's remainder 6.6 -> 1.3°),
  Medical_Female_02's and rel_FA06k's W3, Construction_Male_06's slope, look90 and turn. Lower but still over: Construction_Male_03's
  A1 21.5 -> 20.5 (his 20.0), Medical_Female_03's W3 39.6/36.8/39.1 -> 36.2/35.1/35.9, Police_Male_06 35.6 -> 35.1,
  cap_Police_Male_03n 36.3 -> 35.0. The arm clearance's cost in the editor rose from 7.7-8.0 to 13.5-15.2 ms a person a frame in
  the idles (the robust reading on every query near the hips).
- **Open (traced, not fixed this round):**
  - Construction_Male_06's resting right forearm passes 0.6-0.7 cm through the bottom of his hip pouch (idle1, after:argue,
    after:drink, after:wave; talk 0.51). The runtime reads the contact at the sleeve's point within 0.1 cm of the truth, but the
    resting give (0.25 cm and half the 0.4 cm sleeve) is set for a sleeve between the arm and the body; here the arm's normal at
    the deepest vertex points out through the pouch's bottom, so the bare arm lies 0.2 cm deeper than its sleeve's point. Item:
    the sleeve's and clothes' give only for the share of their offsets that lies along the contact's normal.
  - W3 in the women's walks (Female_Adult_15 35.7, Medical_Female_03 35.1-36.2): the clip's right upper arm swings back into the
    back flank (the push at the shoulder p98 32° for a point 8 cm past its margin, Female_Adult_15, whose coat stands 1.9 cm
    there). Not the gaze: with `Gaze.BodyWeight` back at main's 0.25 (an A/B on the same tree, eight people) Female_Adult_15 reads
    35.5-35.6 (35.7 at 0), Medical_Female_03 passes, and the men's walks get worse (Police_Male_06 35.1 -> 36.6-37.3,
    cap_Police_Male_03n 35.0 -> 36.6-39.6). Item: the women's walk (`walk_f_b`, ACCAD Female1) retargeted onto broader, coated
    bodies swings the right upper arm through the back flank; the contact-preserving retarget (§8) or a re-cut of the walk.
  - W1 Female_Adult_01's jog (6 %): only her right foot slides (the ball at push-off 0.16-0.34 m/s while held, the heel at
    touchdown). Its held pivot (the skin's sole point) lies 4.7 cm across the sole from the gate's ball; the hold pitches the foot
    about the level axis across its heading through that one point, so a sole point off that line circles it as the heel rises.
    Mirroring the right sole's points from the left's did not change it (6 %); no roll at touchdown (both feet within 1.5°).
    Item: pitch a held forefoot about its own hinge (the line through the ball band's lowest underside points).
  - W6 Medical_Female_01's jog (a single frame 4.4 cm, the cap 4.0) and Female_Adult_01's talk C1 0.55: not traced.

## 13. The everyday cells after §12: the striding push, the sleeve's share, the robust reading's reach and cost, the arms' seams (editor owner, 2026-11-26)
Gate: red, 6460 (dfc732a4). Traced on picks of the batch's tree (the gate's own pick with a temporary probe beside it: the moving
arm's angle at each step of the arm clearance, the resting forearm's depth at each step, the feet's holds, the runtime's arm
points against the drawn surface); never a verdict.
- **W3, the women's walks (and the men's walk_player): the push along the contact's normal lay along the swing.** Female_Adult_15's
  right upper arm entered the clearance at 18.8° from down (swung 18.6° back, 2.8° out), its third by the elbow 6.8 cm past its
  margin in her coated back flank; `SkinNeed` pushed it along the contact's normal, 74 % backward, by 32°, to 46° (42° back), and
  the stride's ease (`Swing`) brought it back to 36°. Medical_Female_03 the same (to 49.7°, eased to 38); the men's left arm the
  same forward over the belly (the normal 75 % forward, 32 -> 39.7 -> 35.2). The right arm's push was 2-3 times the left's in all
  three women (`walk_f_b` is a walk after a right turn). **Fix (`ArmClearance.SkinNeed`):** striding, each contact is pushed
  along its normal or straight out from the body, whichever leaves the upper arm nearer the vertical (the rule the stride's ease
  already used, `EaseOut`): the clip's swing is kept and the arm stands out for the body's breadth. On the 18-person pick W3 8 -> 0
  (Female_Adult_15 35.8 -> 31.4, Medical_Female_03 36.5 -> 33.5, Police_Male_06 and cap_Police_Male_03n under 35).
- **C1, Construction_Male_06's forearm in his hip pouch (five resting states).** (1) The cloth and sleeve give was given whole
  wherever the arm met the body; it is now given only for the share of each offset that lies between the two along the contact's
  normal, and where the sleeve's offset points away from the body the bare arm counts deeper than its point by that share
  (`ArmClearance.Give`): five states -> four, the vertex 0.7 -> 0.54-0.66 cm. (2) The contact's normal was the three nearest
  points' normals summed, which at the pouch's bottom leaned 16° toward its bevelled edge and gave the sleeve's offset a share
  of +0.13 where the bare arm lay 0.19 cm under its point (-0.4): inside by the robust surface, the contact's normal is now that
  surface's own gradient (`BodySkin`). With it and the robust reading kept within its bandwidth (below), the pick's C1 for him 4 -> 0.
- **The robust reading's cost and reach (`BodySkin`).** The robust reading (RIMLS, §12) ran for every low-band point within a
  cell. Measured on this tree, idles, the editor: (a) an exact test first (the surface is a weighted mean of the points' plane
  distances with positive weights, so when no point within reach has the arm's point behind its plane it is outside, as the
  passes would say): little gain (the passes ran on only 1.7-7.9 % of the asks); (b) the reach's points gathered only for the low
  band's asks, from the cells the reach touches: no gain over (a); (c) **read only within its bandwidth of the surface** (the
  nearest point's plane within h): offline on the dumps (the layered surface as the truth), past the bandwidth the extrapolated
  surface read 11 of 7292 points 2.5-4.3 cm off the body as 0.01-0.5 cm inside, and the vote read none wrong there, so the vote's
  answer stands past it. Cost on the 18-person pick (idles, a person a frame): 13.5 (§12) -> 10.3 ms, against 7.9 before the robust
  reading (on the skins before §12's rebuild); with the robust reading switched off on this tree 7.1-8.6 ms for three of them
  (on 7.6-10.6): the robust reading now costs 0.5-2 ms, and the rest of the rise is the arm clearance's own extra work on the
  rebuilt skins (more contacts read where they are: asks +0-20 %). Not yet at the cost before it: open.
- **C1, Female_Adult_01's talk (the left upper arm's third by the elbow on the chest's side, 30 cm over the hips): the arm's
  seam was not sampled.** The runtime's arm points there read within 0.1 cm of the truth (0.05-0.19 cm outside the drawn body);
  the gate's vertex 1987 is a sleeve seam (split vertices) 0.65 cm from its cell's point and 0.6 cm out of that point's plane,
  and the skin samples one vertex a 1.8 cm cell (the one nearest the cell's centre): held at contact by its points, the arm
  pressed the seam 0.35-0.58 cm into the chest all through the talk. **Fix (`RocketboxLayers.Skin`):** an arm's vertex that stands
  out of its cell's point's tangent plane by more than the resting give (0.25 cm) is a point of its own (split vertices once);
  every person's skin rebuilt (`RocketboxPeopleBuild.BuildSkins`; arm points +3.5 %, 47,450 -> 49,108, mostly the hands' folds).
- **W1, Female_Adult_01's jog: the hinge hypothesis refuted; the gate's right ball lies on the toes.** The foot plant pitches the
  held foot about the level axis across its heading, exactly (the turn's axis between frames 1.00 across, 0.00-0.01 along and
  up); the gate's right-foot ball is vertex 2868 on the toes' row (1.9 cm past the toe joint; the left foot's is on the
  metatarsal row, where the plant holds both), chosen as the lowest of the band in the neutral pose, where the flat sole's two rows
  tie. At push-off the rigid foot turns at 500-650° a second about the metatarsal row, which the hold keeps still and lifts 2-9 cm,
  and the toes' row 3.4 cm ahead sweeps 0.16-0.36 m/s. Tried and reverted: the toes held on the ground at their pad (the windlass)
  took the right ball to 0.10-0.17 m/s and passed W1, but sank the soles 1.6-5.9 cm into the ground (W6) in 16 of 18 people: a
  rigid foot pivoting on a point under and behind the toe joint lowers the joint, so held toes go into the ground. Open: a
  rolling forefoot (the contact moving from the metatarsal heads to the toes as the heel rises), or the ball's band defined behind
  the toe joint in both the gate and the build (a measure's change: for the coordinator).
- **Measured, the 18-person pick with all of the above (never a verdict):** everyday cells 17 -> 3 (Construction_Male_03's A1
  20.6, Female_Adult_01's jog W1 6 %, Medical_Female_01's jog W6 4.4), fight cells about level (1046); the arm clearance 9.8 ms a
  person a frame in the idles (13.5 before this section, 7.9 before the robust reading).
- **The whole cast's first chunk (ten people, this tree's hash) found a new one: Business_Male_01's right forearm by the elbow,
  0.59-0.63 cm into the hip in eleven resting states (slope, the looks, after each gesture, turn; C1 drawn, the limit 0.5).** The
  runtime reads its point there exactly (point 3358: 0.30 cm in, the truth 0.31); the gate's vertex 503, 0.35 cm from it and
  0.03 cm out of its plane, is 0.63 cm in: the forearm meets the hip obliquely (67° between the two surfaces' normals), so the
  depth grows 0.9 cm a centimetre along the arm, and the deepest vertex lies between the arm's points (one a 1.8 cm cell). The
  resting give (`ArmClearance.RestGive`, 0.25 cm) was set for skin points that read contacts 0.1-0.25 cm shallower than the mesh;
  since §12 they read it within 0.1 cm, so the give and the points' spacing together now pass the gate's 0.5 at an oblique
  contact. Before §12 the off-surface fills held this arm out and he passed. Tried (kept in the batch): the forearm's and hand's
  resting give only for the share of the contact that is face to face (`ArmClearance.SkinNeed`: RestGive x the cosine between the
  arm's and the body's normals): on a 19-person pick he went 0.59-0.63 -> 0.48-0.55 (slope, turn, idle0 pass; the looks and the
  moments after the gestures still 0.53-0.55, nine cells), nothing else failed (Construction_Male_03's A4 2.5 -> 3.5 of 6.0,
  Construction_Male_06's A1 17.2 -> 17.8). Not yet fixed: why the looks and the after-gesture states hold the forearm deeper than
  idle0 (0.24) is to be traced (the hand's learned place, `_adaptL/_adaptR`, drifts across the states, and the hand set at its gap
  after the clearance moves the forearm by the elbow back in under `SetHand`'s 0.5° check about the elbow); then the arm's
  body-facing vertices sampled where they rest, if the points' spacing is still what is left.
- **Open, traced:** Construction_Male_03's A1 in the second men's idle (20.6 against his 20.0: the rest's abduction at its 17°
  cap with the elbow still 0.9 cm into the jacket's flank at 21 cm over the hips, then the shoulder 3.7° out; the clip's trunk
  leans back 4° and carries the shoulders 3.6 cm back over the hips, §11); Medical_Female_01's jog W6 (one frame, max 4.4 against
  the cap of 4.0: the landing foot hovers 4.1-4.4 cm at 0.3-0.5 m/s as the jog slows to a stop, both feet off the ground, so the
  gate reads it as bearing the weight).

## 14. The resting forearm's deepest vertex, the hand's setting, the toes at push-off, the jog's stop (editor owner, 2026-11-26)
Gate: red, 6460 (dfc732a4). Traced on picks of the batch's tree (the gate's own pick with a temporary probe beside it); never a
verdict.
- **C1, Business_Male_01's forearm by the elbow (nine resting states, 0.53-0.55 cm after §13's face-share give).** (1) The hand's
  learned place (`_adaptL/_adaptR`) is not the cause: it is updated only when the upper arm is not placed first, and it is.
  (2) What differs between his first idle (0.24) and the looks and the moments after the gestures (the same clip): the resting
  upper arm's tilt back (`back`, held in a 4° band) settles at 3.7° in the first idle and 3.3° after the second idle's clip, the
  shoulder's push is for the forearm from 2.7 against 3.0 cm in; the runtime's deepest forearm point reads the same in all of them
  (0.21-0.22 cm, the probe's resting-step trace), the gate's vertex does not. (3) **The hand's setting let the forearm back in:**
  after the clearance, `SetHand` refused a move only past half a degree of the shoulder's need, and the runtime's deepest forearm
  point went 0.14 -> 0.21-0.22 cm through it in every resting state. Fix: refused when it leaves the arm needing more than before
  it (0.01°), never past half a degree. (4) **The arm's sampling left out the deepest vertex:** the forearm's points there stand
  4.4-6.6 cm apart but for one, point 3358, 0.35 cm from the gate's vertex 503 and in its plane; where the arm meets the hip
  obliquely (56-67° between the surfaces) the depth grows along the arm's own plane, and 503 read 0.63 cm in while its cell's
  point read 0.31 (`SkinTruthProbeTests`, look0). The drawn arm is flat between its vertices, so its deepest point in a body is
  always one of them; one point a 1.8 cm cell (the vertex nearest the cell's centre) stood for vertices up to a cell away, and the
  stand-out rule of §13 caught only those out of the point's plane. Fix (`RocketboxLayers.Skin`): every forearm and lower upper-arm
  vertex further than the resting give (0.25 cm) from each point its cell keeps is a point of its own (the hands keep the stand-out
  rule on their 1.2 cm cells); every person's skin rebuilt: arm points 49,108 -> 50,600 (+3 %; the forearms +15 %). On a 14-person
  pick with both: his C1 0.53-0.55 -> 0.27-0.30 cm (slope 0.48 -> 0.41, turn 0.49 -> 0.17), everyday cells on the 13 people common
  with the pick before 12 -> 3, none made worse; fight cells 746 -> 748.
- **W6, Medical_Female_01's jog stop: tried and reverted.** The landing foot hovers 4.1-4.4 cm, 0.3-0.5 m/s across the ground and
  level, as the jog slows at about 6 m/s²; the foot plant's catch (the hips set down onto a slow lower foot, both feet up) is keyed
  on its own pace, smoothed over a tenth of a second, under 2.4 m/s, and did not fire. Keyed on the foot's own motion instead (slow
  across, rising or falling under 0.2 m/s), it fired one frame after the frame the gate counts (the plant sees a foot's level only
  after the frame) and fired in the jog's flight too: two joggers' W1 p98 went 5.4 -> 32 and 3.5 -> 37 cm/s. Reverted. Open: the
  stop's blend lands the foot slow and 4 cm up (the clip, or the locomotion's slowing from the jog).
- **W1, Female_Adult_01's jog: the toes turned into the ground with the foot.** The foot plant holds a moving foot on its ball
  (the metatarsal row) and turns it there by the clip's pitch; the toes went with it, rigid (`FootPlant.Toes` straightens them to
  their rest while the ankle is low, for landings), so as the heel rose the toes' row 3.3 cm ahead turned down into the ground, the
  foot was lifted out by its lowest point, and the row swept along the ground at 0.16-0.36 m/s: the gate's right-foot ball lies on
  that row (her forefoot is flat, the two rows tie, §13). Tried, then reverted (§15: it moved another flat forefoot's ball; the
  cell is carried to the next batch) (`FootPlant.ToesDown`): a held foot's toes are bent up at the toe
  joint until their sole lies as it did with the foot flat, within 50° of their rest (the first toe reaches 40-65° at toe-off in
  real walking, Nawoczenski, Baumhauer and Umberger 1999), eased back to the clip's over the hold's release when the foot lifts;
  the foot is still held on its ball, and kept as low as with the toes rigid (laid down, the toes lifted the sole's lowest point
  off the ground they had been pressed into: the stance soles stood 1-3 cm up, W6 0.3 -> 1.1-2.9 cm at the p98 in four of twelve
  people, before that was kept). On a 10-person pick her jog's W1 passes (6 % of frames over 15 cm/s before), and the stance soles stand as they did
  (Male_Adult_06's and Construction_Male_02's jog W6 back under their limits); Business_Female_01's jog W6 reads 2.48 at the p98
  (2.17 before the toes, limit 2.5).
- **The rolling forefoot about the toe joint: measured, not applied.** Every body's forefoot in the bind pose (a temporary probe,
  the gate's own ball band): the Biped toe joint sits at the sole (0.2-0.6 cm over the ball's vertex); 154 of the 158 gate balls lie
  behind it (median 3.3 cm, the metatarsal row), skinned 0.9 to the foot's bone (median), 4 on the toes; 10 feet are flat (the two
  rows tie: Female_Adult_01's both, 12, 14, 17, Male_Adult_06). Turned about the toe joint with the toes kept, the foot moves every
  metatarsal-row ball by its foot-bone share at about the pitch rate x 3.3 cm x sin(pitch), the speed the toes' row has now about
  the ball: it would trade her one cell for the cast's. The toes laid down while the foot stays held on its ball moves her toes'
  row only with the toe joint (1.5 cm ahead of the ball).
- **Cost (the arm clearance, the editor's idles, a person a frame).** (1) The gate traces the first person and the first man of
  each run with `TraceStages` (the managed depth over the hands and forearms at six steps): their cost reads 5-6 ms high, and the
  means quoted before mixed them in; compared here without them. (2) Of the clearance's depth asks, 29-50 % a person are the same
  point at the same place against the same posed body (a forearm asked again after only the hand moved, the hand after only the
  elbow turned): `BodySkin.DepthRange` now keeps those answers for the pose (the batch reckons each point from its place and the
  body's points alone, so the answer is the same; `DepthKept` counts them). (3) On ten people of a pick (untraced) against the whole
  cast's run before the robust reading (hash 8d5742a5, the same people): Medical_Female_01 5.6 -> 6.5, Medical_Female_03 5.6 -> 6.7,
  Female_Adult_12 5.7 -> 6.3, Female_Adult_14 4.8 -> 4.8, Female_Adult_17 5.6 -> 5.9, Male_Adult_01 6.6 -> 6.2, Male_Adult_06 7.2 ->
  7.8, Female_Adult_15 8.5 -> 9.2, Construction_Male_02 8.4 -> 10.5 ms: about 9 % over. On the whole cast's first chunk (its eight
  untraced people): 7.4 ms a person before the robust reading (the run of hash 8d5742a5), 9.5 before this section, 9.0 now (Business_Male_04 8.6 -> 7.3, Business_Male_06 8.3 -> 7.0, Business_Male_03 12.7 -> 11.8). What is left is the robust reading near the hips (0.5-2 ms, its A/B in §13) and the asks of the
  rebuilt skins' points (the arm's points +3 % here, the filled points on the drawn surface in §12): the price of reading the drawn
  surface.

## 15. The everyday cells of the batch's whole cast: the drawn body read at runtime, the push judged by where it leaves the arm, the toes reverted (editor owner, 2026-11-26/27)
Gate: red, 6460 (dfc732a4). The batch's whole cast (cast 5, hash e7b6e14a) stopped at its fifth chunk with 18 everyday cells; an
everyday-only screen (the gate's own `Gate()` with the fight left out, the everyday measures bit-identical to the gate's: 3,963 of
3,963 equal to 1e-6 on a chunk) over all 79 found 20, and a bisect of the changes since cast 3's tree on a five-person batch
attributed them (`EverydayScreenTests`, temporary): Male_Adult_02's C1 in 13 resting states and Female_Adult_11's walk with a bend
(W3) and the yawn's C1 (Female_Adult_05, rel_FA10k) to the skins rebuilt on the drawn surface in §12 (cast 3's skins pass all
three), Female_Adult_14's jog (W1) to the toes laid down (§14), and Construction_Male_03's idle (A1) and Medical_Female_01's jog
(W6) to before (§13).
- **Satellites (tried, refuted, reverted).** Each arm point read at the drawn vertices its cell stands for, the deepest kept: 35 %
  of those reads were deeper than their point, at about 0.1 ms a frame, and Male_Adult_02's forearm stood exactly where it was
  (0.53 cm in): no push happened there at all, so the samples were not what held it.
- **C1, Male_Adult_02's resting forearm: the runtime's reading under-read a concave waist.** The vote's depth is the least of the
  three nearest body points' plane depths; at his waist under the ribs (the nearest normals 25° apart) the forearm's point 2831,
  0.53 cm into the drawn body and 0.93 cm into the layered one, read 0.41 cm (the nearest planes 0.41, 0.56, 1.42 cm), within the
  resting give. Before §12 the filled points' 0.6 cm stand-off hid it. Every reading of a point cloud (planes, IMLS, RIMLS) errs
  at concave or sharp places. **Fix (`BodySkin`, `RocketboxLayers`): the runtime reads the drawn body itself.** The skin (RBS6)
  now carries the body's own torso and thigh triangles as the gate takes them (every mesh vertex filed by its nearest segment in
  the neutral pose, a triangle the body's when its three corners are), each corner with its own bones and weights, layers and
  flank delta, and the bones' bind poses. Once a pose the runtime skins those vertices as the mesh is drawn (Burst, the quality's
  bone count, the flank correctives) and refits a bounding volume hierarchy built over them; every arm point the vote reads within
  2.5 cm of the body is read again against the triangles: the nearest point on them (exact), inside where the nearest feature's
  angle-weighted pseudo-normal (Bærentzen and Aanæs 2005, IEEE TVCG 11(3)) or the skin points find it inside and the gate's own
  three level rays confirm it, and out by the clothes over that point (the corners' layers, interpolated). The drawn body gives
  the depth; the way out (the contact's normal) stays the skin points', which keep the body's outer surface only. The robust
  reading's passes (§12-§13) are no longer run where the drawn body answers.
  - Exactness, measured in game conditions (`SkinTruthProbeTests`, temporary: the gate's pick with a watcher reading every arm
    point within 2 cm of the body against the gate's own reading of the baked mesh, every second frame): on Male_Adult_02,
    rel_FA10k and Female_Adult_05 (2,286 frames of six everyday states, 104,479 readings) the posed vertices stand within 0.0043
    cm of the baked mesh's (0.0001 cm at the median frame), the depth within 0.0017 cm of the gate's (p99 0.0005), and the gate's
    rays agree with the gate on 104,478; on cap_Police_Male_03n and cap_Fire_Male_07n (53,566 readings) the vertices within
    0.010 cm, the depth within 0.0055 cm.
  - The first version took the contact's normal from the drawn body too (toward the nearest triangle). On the batch it took
    Male_Adult_02's thirteen cells away and made seven on two men in gear: on cap_Police_Male_03n's resting arm the nearest
    triangle to a forearm in a belt pouch was the pouch's back, turned toward the body, and the shoulder's push along it turned the
    arm 12° in and the hand 3 -> 5 cm into the thigh (C1 2.7 cm in the talk, 1.6 in the turn); on cap_Fire_Male_07n 83 readings
    lay between a garment and what it covers, where the nearest face is the covered layer's, turned toward the point (out by it,
    in by the gate's rays, up to 0.51 cm). Hence the normal from the skin points, and the rays asked where either test finds the
    point inside.
  - Cost (the editor, the batch's twelve people, every everyday state): the drawn reading 0.5-1.9 ms a person a frame (250-900
    readings a frame, about 1.7 µs a reading; posing 0.07-0.16 ms); the arm clearance as a whole +0.12 ms a person a frame on
    the mean (-0.6 to +0.9), the robust reading's passes no longer run. Over all 79 (the all-79 screen): the drawn reading 0.5-2.6 ms
    a person a frame (median 0.86, mean 1.03; the heaviest a man in a jacket with a hip pouch), the arm clearance 4.6 ms (median).
- **W3, Female_Adult_11's walk with a bend: the striding push chosen by the angle it alone leaves.** §13's rule pushed each
  contact along its normal or straight out, whichever left the upper arm nearer the vertical at once; the stride's ease (`Swing`)
  then eases only the swing forward and back, so a push out kept a sideways stand the ease could not take back, where a push along
  the normal would have been eased away (35.5° at the p98 with the rule, 32.7 without). **Fix (`ArmClearance.SkinClear`,
  `StrideEnd`):** striding, both pushes are tried (every contact along its normal, every contact straight out), each with the
  stride's ease after it as the frame will run it, and the one that leaves the upper arm nearer the vertical is kept. On the
  batch her W3 35.5 -> 32.5, nothing else made worse (cap_Police_Male_03n's walk_player 34.7 -> 33.5).
- **C1 in the yawn (Female_Adult_05, rel_FA10k): the push carried the arm back through the body.** The reading was right (the
  upper arm's point 4.63 cm read against 4.64 true). The clip takes the forearm 5-9 cm into the body behind the flank; the
  shoulder's push is for that point along its contact's normal, and for a point deeper than the arm is thick the normal is the
  nearest surface's, which flips between the flank's side and the back from frame to frame. In the frames where it pointed back
  the push and its two passes turned the arm back and in (17-26° back, 11-18° in) and left the forearm 1.8-2.8 cm and the elbow up
  to 4.6 cm in; in the others it turned forward and out (15° and 20°) and cleared it. (Tried first, refuted: the elbow's third
  filed by its live place along the arm; the point read 0.79 of the way, inside the third.) **Fix (`ArmClearance.SkinClear`,
  `OutRetry`):** moving or gesturing, a push that leaves the arm more than 2 mm in is tried again from the same start straight out
  to the side (as the stride's ease already does when a push fails), and whichever leaves the arm less in is kept. On the batch
  both yawns' maxima 1.6 and 4.7 cm -> 0.00, nothing else made worse.
- **C1, Construction_Male_03 at rest and turning: found by the all-79 screen with the drawn reading in.** The vote had read his
  elbow 0.7-1.0 cm into his jacket's flank and pushed it out (his A1 20.6 in the second idle, §13); the drawn body reads it at
  contact, so his arm hangs in to 17.5°, and his forearm comes to rest under the hip's bulge where it faces down and out at the hip
  joint's height. There the three rest passes along the contact's normal (3.2-4.5° in all, under their 12° cap) moved the hanging
  forearm along the bulge and not out of it: at the end of every frame the clearance's own test (`SkinNeed`) still asked for
  1.1-1.8° (a temporary probe calling it after the frame), and the forearm stayed 0.6 cm in (0.8 in the turn). **Fix
  (`ArmClearance.SkinClear`, `RestOutRetry`):** at rest, rest passes that leave the arm short of the clearance's target are run
  again from the same start straight out to the side, and whichever leaves the smaller need kept (G4's rule, at rest); and the
  stride's two pushes (above) are judged first by which leaves the arm less in, then by which leaves it nearer the vertical. On
  his chunk (its own ten people): everyday 2 -> 0, his C1 0.61 -> 0.00 and 0.79 -> 0.03, his A1 up 0.3-1.0° (18.45 in the second
  idle, his limit 20.0), nothing else moved.
- **W1, Female_Adult_01's jog: a known cell carried to the next batch.** Her right foot's gate ball (vertex 2868) lies on the
  toes' row, 1.9 cm past the toe joint, where her flat forefoot's two rows tie in the neutral pose (§13); the foot plant holds the
  metatarsal row, so at push-off the rigid foot's toes' row sweeps 0.16-0.36 m/s about the held row (6 % of the jog's frames over
  15 cm/s). Laying the toes on the ground (§14) passed her jog but moved Female_Adult_14's ball (her forefoot is flat too): with the
  toes laid down her gate ball rolled forward 15-22 cm/s at 2.1-2.4 cm through push-off, W1 7.9 % in the jog and 6.5 % with a bend
  (2.8 % and 0 with the toes rigid, on the same batch). Reverted (`FootPlant` as on cast 3's tree). Open, for the next batch: a
  forefoot that rolls its contact from the metatarsal heads to the toes as the heel rises, or the ball's band defined behind the toe
  joint in the gate and the build alike (a change of the measure: the coordinator's).
- **Measured.** On the twelve-person batch (one composition, the everyday states): 17 everyday cells with none of the above, 14
  with the two pushes, 1 with the drawn reading too (Female_Adult_01's jog). The all-79 screen on the final tree (hash 262f76da,
  111 min): 2 everyday cells, Female_Adult_01's jog W1 and Medical_Female_01's jog W6 (one frame 4.4 cm, the cap 4.0; §13).
  The whole cast on the same tree (2026-11-27 04:34, 79 people, the verdict in `docs/qa/gates/motion_gate.json`): 3,351 failing
  cells against dfc732a4's 6,460 (the fight's new FY1/FY2 aside, exempt as introduced), the everyday states 4 -> 2 (the same two);
  F1 1,511 -> 743, C1 614 -> 416, K1 578 -> 133, F4 499 -> 165, A1 474 -> 322, H1 474 -> 237, WG2 414 -> 54, H2 395 -> 54. Fifteen
  keys stand worse than dfc732a4's, every one but one at its count on cast 3's tree before this round (the fight's clips on every
  body of a sex, and the two known everyday cells); the one, Kb in the strikes, 129 -> 154: listed with their causes and fix items
  in `docs/qa/gates/motion_waivers.json` (the waiver policy).

## 16. The Biped hierarchy and Unity's body orientation: the same human pose, the whole skeleton turned (editor owner, 2026-11-27)
Found tracing the fight's cause B (`docs/COMBAT_ROOT_CAUSE.md` 19): planted feet 7-11 cm apart in height on the bodies where
the clips' actors stand them level.
- **Measured** (`LegTraceProbeTests`, temporary): each clip played bare (a manual graph, no Foot IK, no runtime system) on its
  own actor, on two bodies of its sex, on a body whose legs and hip width are scaled to the actor's, and on the body with its
  avatar built again (AvatarBuilder, its own description) with parts of its hierarchy changed; every frame the leg and trunk
  bones in the root's frame and the human pose read back.
  - The avatars agree where the definitions are: upper-leg and leg twist 0.5, leg stretch 0.05, feet spacing 0, default
    limits; at muscle 0 the thighs and shanks 0.00° apart, the pelvis's lateral axis 0.4-0.9°. Translation DoF (on for the
    bodies, off for the actors): the body's avatar built without it plays bit-identically.
  - Not proportions: on the body with the actor's leg lengths and hip width the planted feet stand as far apart or further
    (the fist guard 7.2 -> 7.9 cm, the men's crouch hold 17.5 -> 19.3, the club blow p98 8.8 -> 9.8); the actor's own leg
    directions on the body's leg lengths stand them 1.1 / 7.7 / 0.5 cm apart (the actor's 1.2 / 8.6 / 1.6).
  - With the human pose read back identical (the muscles within 0.00-0.14, the body rotation within 0.1-0.5°) the body's whole
    skeleton (pelvis, spine, chest and both legs as one piece; the trunk's bend equal to 0.2°) stands turned from the actor's:
    the rifle's ready 1.7°, the guards and the aim 4.3-4.6°, the club blow 4.8° (p98 9.1), the club's ready 7.6°, the women's
    crouch hold 5.9°, the men's 16.6°, the fist guard 18.7°.
  - Bisected by the avatar built again: the clavicles re-parented from `Bip01 Neck` to `Bip01 Spine2`: the fist guard 18.7 ->
    2.0°, the men's guard 4.4 -> 0.7°, the women's 4.4 -> 1.2°, the women's thrust 4.5 -> 1.8°; the thighs from `Bip01 Spine` to
    the pelvis: the club's ready 7.6 -> 3.6°, the club blow 4.8 -> 3.2°; both: 0.7-2.5° in every standing clip, the crouch hold
    16.6 -> 13.8° (men), 5.9 -> 10.2° (women). Two standard (non-Biped) actors' skeletons differ between themselves by 0-3.4°
    standing and 11.4° in the men's crouch hold.
- **Cause.** Unity's humanoid places the pelvis from the clip's body orientation, which it reads from the joints' positions. On
  the Rocketbox bodies (3ds Max Biped) the clavicles hang from the neck and the thighs from the spine: a bend of the neck or the
  spine moves the shoulder and hip joints, changes the body orientation Unity reads, and Unity turns the whole skeleton to
  match the clip's. The rest is the trunk's own geometry, large only in a deep bend (the crouch). The same hierarchy was behind
  the gaze's fault (the head turned at its own joint, §11: the clavicles hang from the neck) and the fight's trunk corrections
  swinging the legs (`docs/COMBAT_ROOT_CAUSE.md` 17: the thighs hang from the spine).
- **Done for the fight** (this batch): the measured turn baked per clip and skeleton and put back on the hips and thighs first in
  the frame (`docs/COMBAT_ROOT_CAUSE.md` 19). The everyday states are left as they are, but for the sits (below).
- **Later batch item (not done):** at import, re-parent the bodies' clavicles to `Bip01 Spine2` and their thighs to the pelvis,
  the bind pose kept in the world (the skinning unchanged), the avatars built again; then the everyday screen and the whole cast
  again. It may retire the compensations built around the hierarchy (the gaze's own-joint turn, `FootPlant.Level`'s chest, the
  fight's trunk bones above the legs) and the fight's baked turn's hierarchy share (the trunk's geometry share would stay). It
  changes no look, so it is not an owner question.
- **(b) is a compensating bake, not a cure.** The fight's turn (`docs/COMBAT_ROOT_CAUSE.md` 19) and the sits' (`SeatTurn`, below)
  put back what the retarget leaves on these skeletons; they do not remove why it is left. The cure is (a), the rig's re-parent at
  import. (a)'s item carries its own check: after the re-parent, the same bake must read about nought on every clip (the hips' and
  the thighs' turns within a degree or so, the shift within a few millimetres); then the bake, `ClipTurnFirst`, `SeatTurn` and
  their data are deleted, not kept as a no-op.
- **The sits (this batch).** The same retarget at a sit's hip bend of about 90°: the base layer's sits (the controller's states
  tagged "sit": a chair, a stool, the ground) on the Rocketbox bodies stood the pelvis turned and the thighs rolled from the
  sits' CMU actors (the walker on a chair: hips 0.47 m, a foot 0.32 m off the floor, where the take keeps it at 0.05 m; dfc's
  walker passed only because its configured T-pose was the take's first, seated key, MotionImportPostprocessor v13 §9). Baked as
  the fight's (`CombatAnimatorBuild.Seats`: 3 sits x 2 skeletons, the hips up to 18-19°, the thighs up to 44-67°, the shift up to
  6.3 cm), applied by `SeatTurn` at order -30 while a seated state plays, eased by the crossfade into and out of it.
- **A further symptom (2026-11-27):** the hands' "ahead" read from the hip joints' middle instead of the Hips bone (§17) moves the
  cast's reading 0.3-0.5 cm standing but 3.7-3.9 cm in the jog: the Biped's thighs hang from the spine, so the hip joints ride the
  spine's bend away from the pelvis bone.

## 17. The captured motion test's reads, Gaze's neutral face, and a person made away from the world's origin (editor owner, 2026-11-27)
Found under three CI regressions of 71ba0e5b (`CapturedMotionHoldsHumanPosesWhenBuilt`, `ArmsStayOutOfTheBody`,
`TheWalkerSitsOnAChair`); probes temporary (`CapturedProbeTests`, `ArmsProbeTests`, `PlayerAvatarProbe`), not hashed.
- **The read point.** Gaze turns the head at its own joint in LateUpdate (since 2026-11-26), not in the animator's IK pass. The test
  read its walk cycle and its idle face straight after `Animator.Update(0)`: the bare clip, no Gaze in it (the walk's face -17 to
  -24°). It now reads each phase as the game shows it, after the frame's LateUpdate, the clip held at its phase; limits unchanged.
- **The hands' reference.** The idle's hands are read ahead of the hip joints' middle (the anatomy a real person's hand is measured
  from), not of the Hips bone: the players' MakeHuman rig stands its Hips bone toward the sacrum, 5.8 cm (player_m) and 8.2 cm
  (player_f) behind the hip joints, where the cast's Biped stands it on their line. On the cast the reading moves 0.26 cm
  (Female_Adult_01) and 0.54 cm (Male_Adult_08) in the idle: Male_Adult_08's +0.54 cm equals its T-pose bone offset (-0.5 cm),
  exactly the rig offset the change is meant to remove (the jog's 3.7-3.9 cm is §16's, and the 0.2 m limit applies to the idle
  only). Finding, not fixed: from the shoulder the players' hands hang 4-5 cm further forward than the cast's on the same idle
  (player_m 0.128 m against Female_Adult_01 0.076, Male_Adult_08 0.090).
- **The players' trunk, tried and taken out.** The players' configured T-pose stands its trunk curved (segments -8.3, -8.7,
  +16.2, +19.4° from the vertical on player_m; -9.7, +2.9, -5.1, +21.1° on player_f) where Unity's humanoid takes muscle zero with
  the spine upright and every clip's is configured so. Standing only the players' trunk upright changed one end of the retarget
  alone and made the walk's face worse (-12.9° at phase 0.625, against -10 with the original trunk; measured with Gaze's face
  reference still wrong, below). The trunk goes into the next batch with every clip's configured trunk on the same convention,
  so that both ends of the retarget change at once.
- **Gaze's neutral face, read away from the world's origin.** Gaze read the face's front in Awake by a HumanPoseHandler round trip
  on the live body. GetHumanPose gives the body in the world and SetHumanPose places it from the person's own root, so on a person
  standing away from the origin the round trip put the hips that far off again: a townsperson in Shale, 16 km out, had the pelvis
  15.5 km away and 40 m up (the body's mesh hangs from the pelvis, so the person was never in view and, culled, never animated:
  invisible and frozen in the game; `ArmsStayOutOfTheBody` read their arms "moving" because the camera stood 16 km from their
  hips, past the skin's range). On a person turned from the world's axes it read the face's front off by that turn (137° and 180°
  read 110° and 154° off). Fixed in `Gaze.Neutral`: read with the root at the origin and square to the world, every bone's local
  transform put back after, a navigation agent's sync held off meanwhile. Test: `APersonMadeAnywhereKeepsTheirBodyAndFace` (a
  townsperson at (15000, 40, 4000) turned 137°: the hips 0.00 cm from their place at the origin, the bounds round where the person
  stands, the face reference 0.00° apart; on 71ba0e5b's Gaze: 15,524 m, the bounds 15 km off, 137°). The class: every other
  HumanPoseHandler round trip runs on a bare rig at the origin (the turn bake, the flank probe, the body correctives' and the
  layers' copies of an FBX at the origin), or on the gate's people, who stand square to the world and offset in x only
  (MotionProbe: its references are heights or taken before its own round trip). The gate's people stand where the game never
  puts anyone: a later item (`docs/PROGRESS.md`).
- **The players' bound body faces away.** The players' MakeHuman models are bound facing away from their own root (the bound body
  180° round: the eyes 8.2 cm behind the head joint along the root's front in the bind, in front of it in every animated pose).
  Gaze took the neutral pose with the bound body's own rotation, so on the players the face's front was the back of the head: its
  pitch read the wrong way round and its yaw half a turn off, and the walking player's head was held twisted 20-33° to alternate
  sides (the eye line's yaw). `Gaze.Neutral` turns the bound body about the vertical to the root's front and keeps its pitch: the
  cast's bodies are bound square in yaw, so their reference is unchanged (their bound pitch, 5.4° on the men and 7.6° on the
  women, is what the gate's MotionProbe measures the face by). The players' walk face after: -1.8 to -2.5° at every phase (before
  -3.9 to -10.6), the head's yaw within 0.4°. The test keeps its own, anatomical measure (the eye line) and asserts that Gaze's
  face and the eyes' agree within 3° in pitch and yaw on a rig with eye bones (0.2° and 0.4° now): a measure of Gaze by Gaze's own
  definition is circular, and on the cast Gaze and MotionProbe shared one definition, which is why this stayed hidden. Unity's
  full human reference (the body square to the root, which moves the cast's reference by its 5.4-7.6° of bound pitch) is a gate
  definition change, for the next batch's trunk convention item.
- **The sits' tag.** The base layer's sits were built untagged (`LocomotionBuild`, since b2a82298), so `ArmClearance.Resting()`'s
  test for a seated state never held. They are tagged "sit" now (the builder sets it; `LocomotionBuild.TagSits` set it on the
  committed controller: three `m_Tag` lines), and `SeatTurn` and its bake find the sits by it. It changes nothing for the seated
  walker today: `Walker.Planting(false)` turns the arm clearance off while seated. `SeatedArmsStayOutOfTheBody` (new) found the
  sits' own hands 1.3-8.5 cm into the drawn body (the chair and the ground; the stool 0.0): a pre-existing defect, the fix a seated
  clearance that holds the hands on the lap's surface (`docs/PROGRESS.md`).
- **W1, Female_Adult_01's jog, and how the foot plant decides a foot has landed.** Her jog's W1 is 24 of 413 weight-bearing
  samples over 15 cm/s (5.8 %; the limit 5 %). 15 are at the right foot's push-off: the gate's ball (vertex 2868) lies on her
  flat forefoot's toes' row and sweeps 16-34 cm/s at 1.2-2.4 cm about the metatarsal row the plant holds. That is the open cause
  of §13-§15, unchanged. 8 are at the right foot's touchdown: the heel 43-47 cm/s at 0.5-0.6 cm and the ball 28-29 at 1.2 cm, one
  frame a landing. 1 is at the stop. At the touchdown the plant held the foot only in the frame it touched: it judged a landing by
  the ankle's pace, and at a heel strike the ankle swings on over the heel (the heel 1.3 cm up at 1.05 m/s, the ankle 1.62 m/s,
  past the jog's 1.12 m/s and SwingFast's 1.5).
- **Three proxies, measured on the same eleven people** (the quick ten and Medical_Female_01, one batch, every frame traced):
  the ankle's pace (as before), the lowest sole point's, and the slower of the heel's and the ball's. The lowest point cures the
  jog's touchdown slide across the pick (walk:jog W1 maxima 43-116 -> 3-26 cm/s; Female_Adult_01 5.8 -> 3.6 %, every other 0.0 %),
  but holds a walk's first set-down a frame late where the sole pitches about the ankle (the heel 0.51 m/s, the ball 0.47, the
  ankle slower: 45 cm/s the frame after, in Female_Adult_01's, _09's and Medical_Female_01's walk) and the stop's last set-down
  (the sole points 0.65 m/s about a still ankle: 18-24 cm/s), with knock-on cells after both (Male_Adult_03's bend:jog W1 0.0 ->
  0.8 %, max 52; Male_Adult_08's and _03's bend:walk W6 max 1.07 -> 3.04): every one passing. The slower of heel and ball holds the
  first set-down in time, but takes a walking foot again at its first toe-off (Construction_Male_03, Male_Adult_03, _08 at the
  start of the player's walk: let go by its reach two frames before while still under 2.5 cm, the heel rising 3 -> 5 cm, the heel
  the slow point at 0.44 m/s: held five frames, the ball 74 cm/s): a latent fault of the hold, not of the proxy (a walking foot
  let go by its reach while still low may lock again once LockRelease has run out; NoRelock covers only a foot let go in a jog),
  a next-batch item.
- **Against the clips' own record** (independent of the gate, which shares a proxy's definition of contact): every lock onset
  against the recorded touchdown of the clip the base layer plays (each sidecar's `plant.stances`, by the dominant clip's phase
  as played, frame by frame), the share within ±1 frame:

  | state | the ankle | the lowest point | the slower of heel and ball |
  |---|---|---|---|
  | walk:jog | 219/226 (96.9 %) | 206/225 (91.6 %) | 206/225 (91.6 %) |
  | bend:jog | 195/195 (100 %) | 191/197 (97.0 %) | 191/197 (97.0 %) |
  | walk:sneak | 132/143 (92.3 %) | 132/143 (92.3 %) | 132/143 (92.3 %) |
  | walk:walk | 106/138 (76.8 %) | 93/138 (67.4 %) | 109/138 (79.0 %) |
  | walk:walk_player | 122/148 (82.4 %) | 116/148 (78.4 %) | 116/148 (78.4 %) |
  | bend:walk | 83/124 (66.9 %) | 80/124 (64.5 %) | 80/124 (64.5 %) |
  | all | 857/974 (88 %) | 818/975 (84 %) | 834/975 (86 %) |

  The medians are 0. The two sole proxies cure the jog's skate by holding the foot up to two frames before the actor's recorded
  touchdown (Female_Adult_09's right foot -1/-2 frames; the ankle 0/+1): the gate's cure is partly self-confirming. About 70 onsets
  match no record: the walk's starts and stops, blended from the idle, where cases 1 and 2 and the relock fall.
- **Rejected: the lowest point's speed.** It cures the jog's W1 on the gate by holding the foot up to two frames before the
  actor's recorded touchdown, not by matching the contact: a gate passed by locking early. Neither speed proxy is right.
- **The root cause, and the fix built at its source.** The plant inferred contact from one point's speed in a single frame, and
  every proxy (the ankle, the lowest sole point, the slowest) runs ahead in some kind of landing. Now the clips' own record holds
  the foot: each locomotion clip's recorded stances (its sidecar's `plant.stances`: the take's touchdown to toe-off) are built with
  the people's controller into `StepRecord` (`LocomotionBuild.Steps`, stamped, `TheStepsAreBuiltFromTheClipsOwnRecords`) as spans
  of the clip's normalized time, the form of the fight's `ClipFacts.DownL/DownR`. Each frame a foot's down weight is the sum, over
  the base layer's clips (the next state's too, across a crossfade), of each clip's weight where its actor had that foot down at
  its phase. Where the recorded clips hold most of the base layer's weight, a moving foot is held when most of the weight has it
  down (and it stands within LockDown of the ground: a foot recorded down but drawn high is never pinned in the air) and let go
  when most has it up; the record says when the foot lifts, so NoRelock and the lift test have no part there. Elsewhere (the idles
  and gestures carry no record; the walk's starts and stops blended from the idle) the ankle test stands as before. No threshold
  was added: one half is a majority. RECORD_RESULT
- **The foot plant's sole against the drawn mesh: the hull cleared** (relaunch 15; a temporary probe, not hashed, on the ankle
  test; the eleven-person pick and the other flat forefoots, Female_Adult_12, _14, _17 and Male_Adult_06). The lead was that
  `FootPlant.Hull()` bakes every skinned renderer, clothes included, and keeps their low vertices rigid in the foot's frame, so a
  cuff or hem skinned to the shin would swing under the drawn heel at a toes-up strike. Measured: (1) each of the hull's 3,169
  points is found again as one baked vertex of one renderer on the pose the hull is made on (the prefab's, as at
  `FootPlant.Awake`), within 0.004 mm; every one is a vertex of the body or of the boots layer, with all its weight on the foot and
  toe bones (none on the shin: the trousers', coats' and belts' layers lie above the hull's cut, the ankle less 2 cm and the lowest
  plus 5 cm). (2) The pose `FootPlant.SoleOver` reads (the clip's, with the hips' sink and the toes' straightening put back on) is
  rebuilt to its own dip within 0.001 mm on all 38,115 moving frames. (3) On that pose the plant's lowest sole point (heel, back,
  ball, tip or hull) against the mesh's own lowest foot-skinned vertex (more than half its weight on the foot and toes, any
  renderer): the mesh less the model 0.00 cm at the median, 0.03 at the p99 (0.01 on the four), 0.09 at the p99.9 (0.18), at most
  0.49 cm in one frame; the model stands higher than the mesh by up to 0.63 cm (the hull's 1.5 cm cells). In no frame did the model
  read a foot down (under 2.5 cm) while the mesh stood over 2.5 cm, but for 8 frames straddling the line by 0.2 cm. At a toes-up
  heel strike the hull's lowest point is the true contact, the heel's back edge (Construction_Male_03's right foot at 139.61-139.68
  s: the model and the mesh -0.9 to +0.2 cm; the bind's heel point 1.8-2.1 cm). So the "dip -0.6 cm against the drawn heel 5.7 cm"
  read compares the contact with the gate's fixed heel vertex (the lowest behind the ankle at the bind), after the plant had lifted
  the foot to its 3 cm swing clearance: no hull change. What it shows instead: at push-off (the gate's heel over 3 cm, the foot's
  lowest under 1.2 cm) the drawn contact is the toes' tip, 2.6-12.8 cm ahead of the ball the plant holds (the men 11.1-12.8, the
  women 2.6-10.5; the contact at 16.3-23.2 cm along the foot at the median, the tip at 18.5-23.0).
- **The touchdown: why a landing foot meets the ground early and fast** (relaunch 15, the same probe on the eleven, with each
  recorded clip played bare, a manual graph and no runtime system, on its own actor and on the eleven bodies, foot IK off and on).
  The plant's pose reads a landing heel at -0.9 to +0.2 cm while the foot still moves 2.4-2.7 m/s, ahead of the take's recorded
  touchdown. At that touchdown (each sidecar's `plant.stances`, by the dominant clip's phase as played), per person, clip and foot:
  (i) the clip as retargeted, without the hips' sink, stands the foot's lowest skinned point -2.6 to +2.1 cm over the ground,
  moving 0.3-2.7 m/s; (ii) the sink is -1.3 (left) and -0.4 (right) cm in the jog, -2.3 and -1.9 in `jog_b`, -0.1 and -0.4 in
  `walk_f_b`, -0.6 and -0.8 in `walk`, -0.6 and +0.8 in `walk_slow`, -0.7 and +0.8 in the sneak; (iii) the take itself has the
  actor's heel 0.3-3.3 cm over its own floor a key before its recorded touchdown, moving 2.3-3.9 m/s (scaled by the hips' ratio
  and the stride), since `plant.py` records a touchdown at the first key within 2.5 cm whose slower sole point moves under 2 m/s:
  the takes land fast by their own definition. Against its own stance floor, the bare retargeted body (foot IK on) stands within
  about 0.8 cm of the actor at those keys, mostly higher, at like speeds. The early contact comes from where the floors stand: the
  bodies' stance soles stand 0.2-4.1 cm under the root's ground, per foot (the jog's left -1.9, right -0.2 to -0.6; `walk_slow`
  -2.5 to -3.0; the sneak's left -2.9 to -4.1). In the jog the clip alone is 1.3-2.0 cm up at the first contact and only the sink
  brings it down: the left foot within 0.5 cm two frames (60 a second) before the record at 2.2-3.0 m/s, the right 1-3 frames
  after it. The sink is negative there because it follows the ankles' lower envelope, and the right stance ankle stands 1.3-4.3 cm
  over its flat height while its sole is down. In the walks the late swing is within 0.5 cm 2-12 frames before the record at
  3.7-5.1 m/s, the sink -0.3 to -0.8.
  The stance floors' left-right difference (the ankles'), the bodies' against the actor's scaled, is the same on every body of a
  skeleton to 0.01 cm (039738d2, the 54 men; 67aa8293, the 25 women), foot IK on (off): `jog` -0.74 (-0.70; the take's own
  left-right is -1.94), `jog_b` -1.10 (+0.18), `jog_f` -1.54 (+1.72), `run` -3.65 (+0.67), `run_c` -3.72 (+0.02), the sneak
  -2.69 men, -2.63 women (-1.90, -2.22), `walk` +0.37 (-1.51), `walk_b` -2.27 (-2.20), `walk_brisk_b` -0.21 (+0.36), `walk_d`
  +0.41 (+0.20), `walk_f_b` +0.08 (-0.57), `walk_slow` +0.10 (+0.22), `walk_slow_b` +1.72 (+1.04). Three sources, none of them
  fixed in this batch (`docs/PROGRESS.md`): the takes' unequal stance floors (the converter keeps each sole point on its own
  floor, `plant.py`'s `sole_floors`; levelling them needs Blender, an open question for the owner); cause B in locomotion (the
  base layer has no `ClipTurn`; the rig's re-parent at import, (a) of §16); and the sink keyed on the ankles' lower envelope.
  Rejected: the sink keyed on the soles' own lowest point instead (simulated offline on the eleven; the simulator reproduces the
  logged sink to 0.00 cm at the median, 0.45 at the p98): it removes the early contact but floats the lower stance contact, p98
  +2.2 to +4.0 cm, by person. The batch does not need it: without its push-off samples Female_Adult_01's jog W1 is 9 of 413 (2.2 %).
- **The push-off: the plant held a one-piece foot over a two-piece one** (relaunch 15; the same probe on the fifteen, the eleven
  and the four other flat forefoots, each against main's ankle test, K). At push-off (the gate's heel over 3 cm, the foot's lowest
  under 1.2 cm, held) the drawn contact is the toes' tip, 2.6-12.8 cm ahead of the ball the plant holds, and it slides: its own
  horizontal speed (the same vertex frame to frame) 5.8 cm/s at the median, 43 at the p90 and 87 at the p98, 28.7 % of 13,367
  frames over 15 cm/s, in every one of the fifteen (6-47 % a foot). The clip bends the toes 15-26° up at push-off (5-22° more than
  in its own stance); the plant straightened them toward the bind while the ankle was low (`Toes()` on the rising and held branch,
  859ccf69, 2026-11-06, kept from the landing rule: "the jog's toes curled down at landing put their tips 6-7 cm under the
  ground"), so the forefoot was rigid and rolled onto its tip. `BallOverTip` is 8 cm since 8790a317 (2026-11-06; 3 cm before,
  791a42b6): a jogging forefoot pointed 60° came down on its tip and, held there, its ball slid, measured on the bones' sole points.
  Two changes were measured, each against nine conditions (K -> the change), and both failed; main's ankle test stands:

  | condition | the clip's own toes (notoes) | the forefoot rocker |
  |---|---|---|
  | 1 everyday failures besides MF01's stop | FA01 walk:jog W1 6 %, new FA01 bend:jog W1 5 % | FA01 passes; new MA03 walk:jog W1 5.4 %, bend:jog 5.2 % |
  | 2 FA01 walk:jog W1 (5.8 %) | 5.6 % | 2.7 % |
  | 3 locks not at a landing / while rising (106 / 52) | 121 / 61 | 122 / 62 |
  | 4 onsets within ±1 frame of the record (88 %, 92 %) | 88 %, 92 % | 88 %, 92 % |
  | 5 walking cells worse / better | 151 / 54 | 236 / 63 |
  | 6 feet with the toes deeper in the ground (p99, max) | 21 of 30 (0.44, 0.75 cm) | 23 of 30 (0.69, 0.83 cm) |
  | 7 the drawn heel's largest rise | 0.28 cm | 0.17 cm |
  | 8 mesh less model, p99.9 (0.11 cm) | 0.49 cm | 0.73 cm |
  | 9 the held contact at push-off: p50 / p90 / p98, share over 15 cm/s (5.8 / 43 / 87, 28.7 %) | 4.8 / 52 / 90, 30.4 %, up on 23 of 30 feet | 1.3 / 6.0 / 11.8, 1.6 %, no foot's share up |

  The clip's own toes (both straightening calls taken out) moved the contact back toward the ball on most walks (Female_Adult_01
  6.4 -> 3.4-3.6 cm ahead of it), but the hold still pivoted behind the bending forefoot and the bent toes scraped; and sole and
  hull points kept rigid in one frame across the toe joint parted from the mesh (hull points mostly skinned to the foot but held
  in the toes' frame, p99 +0.22 to +0.31 cm; the flat forefoots' balls, mostly on the toes but held in the foot's frame, p99
  +0.54). The forefoot rocker (Perry's third rocker; `patch15/FootPlant.cs.rocker`, kept for the next batch) put each sole point and
  hull vertex in the frame of the bone it is mostly skinned to (read at the bind from the skin itself: the toes turned a quarter
  turn and the meshes baked again, linear skinning moving each vertex by its toe weight) and, once the heel had been down and
  rose past LockDown while held, held the foot on its toe joint, the toes laid flat on the ground, until the existing release rules
  let go. It cures the scrape (the held toe segment's own speed 1.2 cm/s at the median, 13.9 at the p98, 1.7 % over 15; the held
  joint 0.6 at the p98) and Female_Adult_01's jog, and shows three needs of its own, each a design decision for the next batch
  (`docs/PROGRESS.md`): (i) the sole read by linear blend skinning with its full bone weights, not rigid in one frame (mixed
  foot and toe weights under a toe bent 30-80°: mesh less model p99 0.48 cm, p99.9 0.77 on the hull points mostly on the foot);
  (ii) toe-off from the joint's own range: held flat until the clip lifts the toes, the toe joint reached 27-32° at the median,
  64-77° at the p98 and 72-82° at most, against a mean first-MTP dorsiflexion of 42° in walking (Nawoczenski, Baumhauer and
  Umberger 1999; §14 quotes 40-65° at toe-off) and a peak MTP extension of 24.8 ± 4.1° to 27.0 ± 4.6° in shod running (Cigoja,
  Fletcher and Nigg 2022): the walking and running figures differ; (iii) the gate's metatarsal-row ball: with the hold on the toe
  joint it stands 3.3 cm behind the joint and 2.0-2.4 cm up as the foot pitches, moving 16-18 cm/s (Male_Adult_03's jog W1 1.9 ->
  5.4 %), and the gate counts it as bearing weight (a question for the owner; the gate is unchanged).
- **W6, Medical_Female_01's jog stop, and the walk's starts and stops.** One frame: the landing right foot 4.4 cm up, 0.47 m/s
  across the ground, rising 0.18 m/s, both feet up, the body at 2.3 m/s (its p98 1.3 passes): the catch (the hips set down onto a
  slow lower foot, both feet up) is gated by the plant's smoothed pace, which lags the stop's deceleration, and did not fire. The
  stop's blend from the jog lands the foot slow and 4 cm up: the same kind of event as the walk's start and stop blends, where no
  clip's record applies. Open, the next batch (`docs/PROGRESS.md`).
- **The configured trunks, for the next batch's trunk convention item** (each model's configured T-pose, in its importer: each trunk
  segment's angle from the vertical, + forward; Hips-Spine is the rig's own offset between its hips and spine bones, near ±80-90°
  where the two stand level, one behind or ahead of the other, not a bend). The everyday clips and the bodies:
```
player_m                           Hi-Sp +80.1  Sp-Ch -8.3  Ch-Up -8.7  Up-Ne +16.2  Ne-He +19.4
player_f                           Hi-Sp +91.4  Sp-Ch -9.7  Ch-Up +2.9  Up-Ne -5.1  Ne-He +21.1
Female_Adult_01                    Hi-Sp -0.8  Sp-Ch -0.0  Ch-Up -0.0  Up-Ne -9.0  Ne-He +0.0
Male_Adult_08                      Hi-Sp -0.8  Sp-Ch -0.0  Ch-Up -0.0  Up-Ne +4.5  Ne-He +0.0
argue                              Hi-Sp +0.0  Sp-Ch -4.8  Ch-Up -0.9  Up-Ne +1.4  Ne-He +1.4
carry                              Hi-Sp +0.0  Sp-Ch -6.5  Ch-Up -1.2  Up-Ne +1.8  Ne-He +1.3
drink                              Hi-Sp +0.0  Sp-Ch -5.7  Ch-Up -1.2  Up-Ne +1.4  Ne-He -0.2
fall                               Hi-Sp +0.0  Sp-Ch +1.0  Ch-Up -1.0  Up-Ne -1.5  Ne-He -3.0
guard                              Hi-Sp +0.0  Sp-Ch -5.7  Ch-Up -1.2  Up-Ne +1.4  Ne-He -0.2
idle_f                             Hi-Sp -79.0  Sp-Ch +5.7  Ch-Up +7.6  Up-Ne +4.8  Ne-He +13.3
idle_f_c                           Hi-Sp -79.0  Sp-Ch +5.7  Ch-Up +7.6  Up-Ne +4.8  Ne-He +13.3
idle_m                             Hi-Sp -89.8  Sp-Ch +10.7  Ch-Up +6.3  Up-Ne +11.3  Ne-He +16.6
idle_m_b                           Hi-Sp -91.3  Sp-Ch +9.2  Ch-Up +4.2  Up-Ne +13.4  Ne-He +29.3
jog                                Hi-Sp +0.0  Sp-Ch -6.3  Ch-Up +0.2  Up-Ne +3.2  Ne-He -0.2
jog_b                              Hi-Sp +0.0  Sp-Ch -6.8  Ch-Up -0.9  Up-Ne +2.3  Ne-He +0.3
jog_f                              Hi-Sp +0.0  Sp-Ch -4.8  Ch-Up +5.9  Up-Ne +8.5  Ne-He -6.4
jog_f_b                            Hi-Sp +0.0  Sp-Ch -4.8  Ch-Up +5.9  Up-Ne +8.5  Ne-He -6.4
pickup                             Hi-Sp +0.0  Sp-Ch -3.6  Ch-Up -0.3  Up-Ne +1.3  Ne-He +1.0
run                                Hi-Sp +0.0  Sp-Ch -8.7  Ch-Up -0.9  Up-Ne +3.2  Ne-He +2.0
run_c                              Hi-Sp -89.8  Sp-Ch +10.7  Ch-Up +6.3  Up-Ne +11.3  Ne-He +16.6
sit                                Hi-Sp +0.0  Sp-Ch +10.6  Ch-Up +7.1  Up-Ne +2.5  Ne-He -7.2
sit_ground                         Hi-Sp +0.0  Sp-Ch -3.9  Ch-Up -0.8  Up-Ne +1.0  Ne-He +3.2
sit_stool                          Hi-Sp +0.0  Sp-Ch -5.7  Ch-Up -1.2  Up-Ne +1.4  Ne-He -0.2
sneak                              Hi-Sp +0.0  Sp-Ch -8.3  Ch-Up +0.4  Up-Ne +4.3  Ne-He -0.7
stretch                            Hi-Sp +0.0  Sp-Ch -4.8  Ch-Up +5.9  Up-Ne +8.5  Ne-He -6.4
stretch_m                          Hi-Sp +0.0  Sp-Ch -14.3  Ch-Up -1.6  Up-Ne +4.6  Ne-He +6.6
sweep                              Hi-Sp +0.0  Sp-Ch -5.7  Ch-Up -1.2  Up-Ne +1.4  Ne-He -0.2
talk                               Hi-Sp +0.0  Sp-Ch -4.8  Ch-Up -0.9  Up-Ne +1.4  Ne-He +1.4
talk_b                             Hi-Sp +0.0  Sp-Ch -4.5  Ch-Up -1.5  Up-Ne +0.7  Ne-He -2.8
walk                               Hi-Sp +0.0  Sp-Ch -1.0  Ch-Up -4.9  Up-Ne -4.4  Ne-He -1.0
walk_b                             Hi-Sp +0.0  Sp-Ch -4.1  Ch-Up +0.5  Up-Ne +2.4  Ne-He +2.0
walk_brisk_b                       Hi-Sp -89.8  Sp-Ch +10.7  Ch-Up +6.3  Up-Ne +11.3  Ne-He +16.6
walk_d                             Hi-Sp -91.3  Sp-Ch +9.2  Ch-Up +4.2  Up-Ne +13.4  Ne-He +29.3
walk_f                             Hi-Sp -79.0  Sp-Ch +5.7  Ch-Up +7.6  Up-Ne +4.8  Ne-He +13.3
walk_f_b                           Hi-Sp -79.0  Sp-Ch +5.7  Ch-Up +7.6  Up-Ne +4.8  Ne-He +13.3
walk_f_c                           Hi-Sp +0.0  Sp-Ch -2.5  Ch-Up +5.2  Up-Ne +6.4  Ne-He -5.0
walk_f_long                        Hi-Sp -79.0  Sp-Ch +5.7  Ch-Up +7.6  Up-Ne +4.8  Ne-He +13.3
walk_slow                          Hi-Sp +0.0  Sp-Ch -1.0  Ch-Up -4.9  Up-Ne -4.4  Ne-He -1.0
walk_slow_b                        Hi-Sp +0.0  Sp-Ch -7.6  Ch-Up -2.2  Up-Ne +1.3  Ne-He -4.1
wave                               Hi-Sp +0.0  Sp-Ch -5.7  Ch-Up -1.2  Up-Ne +1.4  Ne-He -0.2
yawn                               Hi-Sp +0.0  Sp-Ch +2.2  Ch-Up +5.0  Up-Ne +3.9  Ne-He +2.2
yawn_b                             Hi-Sp +0.0  Sp-Ch -2.5  Ch-Up +5.2  Up-Ne +6.4  Ne-He -5.0
```
  The fight's 282 clips share 24 trunks: the ACCAD-built (`*_accad`, `*_built`, 101 men's and 43 women's) +10.7/+6.3/+11.3/+16.6 and
  +5.7/+7.6/+4.8/+13.3, the CMU men's fists -14.3/-1.6/+4.6/+6.6, the women's -0.8/+3.5/+3.8/-6.7, the 100STYLE takes 0.3/0/0/0.6,
  and so on (the same reading over `Combat/Motion/*.fbx.meta`).
