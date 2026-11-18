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
- **Found on the way, open (the people's own states):** with the references consistent, Unity's Foot IK (on in every locomotion
  state) still bends a straight leg: on Male_Adult_08 and Female_Adult_01 the standing idle's straighter knee is 0.0° played
  bare and 18.9° / 21.0° with Foot IK, the ankles moving under 0.4 cm (the goal is the take's foot by the humanScale ratio, and
  a near-straight knee turns 10-20° for a centimetre). Standing, FootPlant's bearing leg takes it out (K1 passes in the idles);
  its reason in P4.8 (the feet 1-2 cm off the floor on the old reference) is gone (played bare on the stood reference, the
  ankles are within 0.9 cm of the bind's). Under the fight's layer it was not taken out (COMBAT_ROOT_CAUSE, 2026-11-18, item 5).
  To be traced for the people's own states as its own item: whether Foot IK still does any good there.
- **C1's cause on the way: the upper arm divided differently from the gate.** ArmClearance gave the chest's soft contact
  (`UpperGive`, 2.5 cm) to the upper arm above its third by the elbow by the distance to the elbow joint; the gate divides it by
  the share along the bone from the shoulder (0.65): a surface point 4-5 cm off the bone near the boundary was the chest's
  contact for the one and the elbow's third for the other (Construction_Male_02 idle1: the upper arm 1.6 cm into the chest,
  unmoved, C1 1.6). **Fix:** the same division as the gate's.
- **W3's cause: the swinging arm pushed out for a contact C1 leaves out.** Walking, the left arm of Medical_Male_02 and
  cap_Police_Male_03n was turned out 16-20° (median; p98 24-26°) for the upper arm's upper two-thirds 6 cm into the torso at the
  armpit (the trace's first-turn depth): the contact both soft tissues take, which C1 does not count. **Fix:** moving, that part
  of the arm is never a reason to swing the arm out.
