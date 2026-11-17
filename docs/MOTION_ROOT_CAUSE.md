# Why people keep failing the motion gate, and the plan that removes the causes (2026-11-17)

Gate: **red, 55** (A1 25, W6 11, C1 8, A4 4, W3 3, F1/F2/F5/K1 1), verdict of 63a0e244. Binding with
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
  past `RateMax`); idles whose actors stand straight (K1) and hold the head level (the game's `idle` looks 35-42° down: H1);
  the staged clips' remaining seams and slides.
