# Humans that look and move like humans — the motion and posture gate (binding)

The owner's rule (the upgrade directive, 2026-10-27): **"humans that look and move like humans"**. On 2026-11-05 the owner
sent a capture of a conversation that broke it: arms held out from the body with the elbows bent, feet on tiptoe and off
the ground, the head turned hard on the neck, the shoulders raised. That pose had been passed, so the owner asked
"why can you not obey this rule? codify it in a more entrenched and detailed way". This document is that codification.
It is binding. It sits beside the face and skin gate (`docs/PEOPLE_QA.md`) and is as strict.

## 0. Why the rule failed (so the gate closes each hole)

| What went wrong | The rule that now closes it |
|---|---|
| The check measured **one** angle (the upper arm from vertical) on two people in a **bare** idle, with the systems that change the pose switched off (gaze, foot planting, hand pose, gestures, arm clearance) | §1.1 game conditions only; §2 every measure, not one |
| The forearm, hands, feet, head and shoulders were **not measured at all** | §2 table: arms, hands, shoulders, head, feet, contact, clipping |
| Captures were reviewed from a **hip-height studio camera**, never from the game's own cameras | §1.4 review at the game's cameras |
| A wrong pose was **explained away** ("a gesture", "the clip") and passed | §1.5 no excuses |
| Nothing measured **motion** (sliding feet, a body spun on the spot, strides that do not match the speed) | §2.3, §2.4 motion measures |
| The person reviewing was also the one who built it, with nothing written down | §1.6 written review, item by item |
| **Second failure (2026-11-06):** with this gate written and red (972 measures past their limits), images of people were still sent to the owner, and new garments were shown that made people look padded and rubbery | §1.8 the lock: nothing with people in it reaches the owner while the gate is red, enforced by `npm run check` and CI, not by intention |
| Clothes were not measured at all: shells 2-4 cm off the body (a real jacket stands ~1-1.6 cm off), smooth, no seams | §2.6 garments (G1-G4) and checklist item 10 |
| The rule lived only in prose, so it could be talked past | §1.8: a machine check that fails the build |

## 1. The procedure (every build that reaches the owner; every change to people, animation, IK or cameras)

1. **Game conditions only.** People are made by the game's own code path (`PeopleService.Make` for residents,
   `PlayerBody.Base` for the player), with every runtime component the game adds switched on (`Ambient`, `FootPlant`,
   `Gaze`, `ArmClearance`, `HandPose`), the game's controller (`Locomotion.controller`), the game's speeds
   (`Townsfolk.WalkSpeed`, `Walker.WalkSpeed`/`JogSpeed`, `Stealth.SneakSpeed`) and the game's conversation behaviour
   (turning to face, `Walkabout.Face`). The player's body has no `Ambient` in the game, so it is not given one: it
   neither idles by a hash nor gestures. Two settings differ from play and change no pose: every body animates even
   unseen (`AlwaysAnimate`, so every frame is measured), and the random gestures wait (the gate plays each in turn).
   A bare rig, a single clip, a component turned off "to isolate it", or a
   pose set by hand never counts as a pass.
2. **Every state, every frame.** The gate (`Tests/PlayMode/HumanMotionGateTests.cs`) plays each state below and
   measures every rendered frame (the mesh-based measures at 6 Hz or more):
   - standing: each of the four idles, on flat ground and on a 10° slope;
   - looking: a partner's head at 0°, 45°, 90° and 135° off the person's front (the gaze alone, then as the game
     turns them to face);
   - each gesture: talk, talk_b, argue, drink, wave, stretch, yawn, yawn_b, and the 0.6 s after it ends;
   - turning to face someone behind (the conversation turn);
   - walking and jogging at the game's speeds, straight and on a 3 m radius; starting and stopping; sneaking;
   - the conversation pose: two people at the game's talking distance, facing as the game faces them.
3. **People.** The quick set in every CI run: women and men; slim, broad and heavy; young and old; the player's body.
   The full set (`Category("Heavy")`, before every build to the owner): every Rocketbox person in the catalogue and
   both player bodies.
4. **Review at the game's own cameras.** The gate writes captures from the game camera at its default (pitch 50°,
   20 m) and its closest zoom (8 m), from the conversation view, and from human height (front and side) for detail.
   Reviewing only the human-height views is not a review.
5. **No excuses.** None of these is a pass: "it is a gesture", "it is the clip's own pose", "it is only for a moment",
   "it reads fine at game distance", "the mocap actor did it", "it is within the clip", "a later pass will fix it". A
   pose or movement that looks wrong in review is a finding even if every number passes: it gets a measure added
   here (§4), then a fix.
6. **Written review, item by item.** For each capture the review names every item of §3, says what is seen, and
   compares it with a reference photograph of real people doing the same thing (standing in talk, walking, turning).
   The review goes into the build's QA report (`docs/qa/<build>.md`) before anything reaches the owner.
7. **Severity.** A measure past its limit, or an item of §3 failed, is **S2** (the owner's rule broken, CLAUDE.md §2):
   no build reaches the owner with it open.
8. **The lock (2026-11-06).** While the gate is red, **nothing with a person in it goes to the owner**: no image, no
   capture, no build, no "evidence" sheet; progress is reported in words, with the failing measures listed by name and
   number. The gate writes its verdict to `docs/qa/gates/motion_gate.json` (committed). `tools/qa/people_gate.mjs`, run by
   `npm run check` and by CI, fails when an image of people is added or changed under `docs/evidence/` while that verdict
   is red (red-gate working captures live only under a `_red/` folder and are never sent), and when an evidence folder
   of people has no `REVIEW.md` answering every item of §3 for each of its images; the Android workflow's release job
   runs it with `--release`, so no playable build is published while the verdict is red. A red check is fixed by making
   the people pass, never by moving the images, loosening a limit or skipping the check.

## 2. The measures and their limits

The limit applies to the 98th percentile of a state's frames (2 % may stray, e.g. a blend); the hard cap applies to
every frame. Angles are degrees, distances centimetres. "Down" and "horizon" are the world's.

### 2.1 Standing (any idle, flat and sloped ground, the looking states)

| Id | Measure | How it is measured | Limit (p98) | Hard cap | Basis in real people |
|---|---|---|---|---|---|
| A1 | Upper arm hang | angle of shoulder→elbow from down | ≤ 20 | 28 | relaxed standing: shoulders neutral, arms resting at the side [1] |
| A2 | Elbow bend | angle between upper arm and forearm | 5–35 | 0–50 | neutral standing elbow flexion: median 15.5°, IQR 13–18° [1] |
| A3 | Forearm hang | angle of elbow→wrist from down | ≤ 30 | 40 | follows A1 + A2 and the elbow's carrying angle: with the elbow straight the forearm turns out from the upper arm's line, 15 ± 5° in women and 11 ± 4° in men [15] (a Humanoid elbow is a hinge, so retargeted clips lose it and the game restores it: `ArmClearance`) |
| A4 | Hand at the thigh | gap from the hand's skin to the nearest thigh or hip skin (baked mesh) | ≤ 6 | 10 | the arms hang with the palms towards the thighs [1] |
| A5 | Relaxed fingers | bend at the knuckle and the middle joint, index to little finger | 8–55 | 3–75 | a hand at rest is half-curled: never flat and spread, never a fist |
| A6 | Palms not forward | the angle between the palm's facing and the body's front (0 forward, 90 the thigh, 180 back) | ≥ 50 | ≥ 35 | relaxed arms hang and swing with the palms to the thighs or behind; a palm turned forward or up is a carry, not a rest |
| S1 | Shoulders down | the shoulder's raise above the avatar's neutral (Humanoid "Shoulder Down-Up") | ≤ 6 | 10 | relaxed shoulders; raised ones read as tension or cold |
| H1 | Head level | the face's forward from the horizon (+ up) | −15 to +8 | −25 to +12 | natural head position: the Frankfort plane 2° ± 4° from horizontal, extremes about ±11° [2][3] |
| H2 | Head on the body | yaw of the face relative to the chest | ≤ 30 | 45 | the eyes take a gaze shift up to about 30° and the head joins only beyond about 25° [4][5]; a sustained look further round turns the body |
| H3 | Head upright | roll of the face from vertical | ≤ 10 | 15 | a level head; a tilt is an expression, not a rest pose |
| F1 | Soles on the ground | height of the lowest heel and ball skin above the ground under each (baked mesh), for a foot with some of its sole down (a foot 3 cm up or more is stepping: F5) | −1.5 to +2.5 | −3 to +4 | standing feet bear weight: no floating, no sinking |
| F2 | Heels down | heel height minus ball height | −2 to +2 | −4 to +4 | quiet standing is flat-footed (no tiptoe, no toes in the air) |
| F3 | Stance | heels' width across the body (F3w); one foot ahead of the other (F3a); each foot's turn out from the body's front (F3s) | 8–32; ≤ 28; ≤ 25 | 5–40; 35; 35 | preferred quiet stance: 17 cm between heel centres, 14° between the feet [6]; self-selected widths 16–18 ± 4–5 cm [7][8]; a relaxed stagger is under a foot's length |
| F4 | Standing still | a foot bearing weight (its sole within 2 cm of the lowest it has been in that state): its horizontal speed | mean ≤ 3 cm/s; frames > 10 cm/s ≤ 2 % | — | foot skate is counted above 10 cm/s at contact [9] |
| F5 | Feet down | the share of the standing time a foot is off the ground (a sole 3 cm up or more: a step) | mean ≤ 0.12 | — | quiet standing shifts weight and now and then steps; it does not keep a foot in the air |
| C1 | Nothing clips | depth of a hand, forearm or lower upper-arm vertex (the upper arm's third nearest the elbow, which hangs clear of the waist; higher, the arm rests on the side of the chest, a contact both soft tissues take) inside the torso, hip or thigh skin (baked mesh, against the skin's normals) | ≤ 0.5 | 1.5 | the owner's rule: arms, hands and clothing never sink into a body (CLAUDE.md §2) |

### 2.2 Gestures

During a gesture A1–A5 do not apply (the arms move by intent). These do: C1, F1, F2, F4 (gestures never slide the
feet), H1 within −25 to +15, H2, and S1 with a cap of 20 for stretch and yawn, 10 otherwise. Within 0.6 s after a
gesture ends every §2.1 limit applies again.

### 2.3 Turning to face someone

A person turns by stepping. F4 applies to the turn (a body spun on the spot over planted feet slides them and fails),
F1 and F2 apply to the planted foot, and at the end the chest faces the partner within 20°.

### 2.4 Walking, jogging, sneaking

| Id | Measure | How it is measured | Limit | Basis |
|---|---|---|---|---|
| W1 | No foot skate | a foot whose lowest skin is within 2.5 cm of the ground (baked mesh, every frame): its sole's horizontal speed | mean ≤ 8 cm/s; frames > 15 cm/s ≤ 5 % | foot-skate measures in motion research count sliding above 10 cm/s at contact heights of 2.5–10 cm [9][10] |
| W2 | Stride matches speed | a planted foot's speed as a share of the body's (0 when the stride fits the speed) | mean ≤ 0.10 | a stride is the body's speed divided by its cadence; a mismatch slides the planted foot (gliding or treading) |
| W3 | Arm swing | upper arm from down; opposite to the legs | walking ≤ 35 (p98), cap 45; jogging ≤ 45, cap 55 (no sourced limit yet: reviewed by eye) | |
| W4 | Head level | face pitch | −20 to +8 | looking where they go |
| W5 | Head on the body | face yaw on the chest | ≤ 25 | |
| W6 | Stance foot on the ground | the sole's height while that foot bears weight | −1.5 to +2.5 (cap −3 to +4) | as F1 |
| A6 | Palms not forward | as §2.1 | as §2.1 | |
| C1 | Nothing clips | as §2.1 | as §2.1 | |

### 2.5 Two people talking

The talking distance 0.9–1.6 m between the bodies' centres (Hall's personal-to-social distance, 0.46–1.2 m and 1.2–3.6 m
[11]); each chest faces the other within 20°; H1 and H2 as §2.1 on both; both stand (F1–F4).

### 2.6 Garments (clothes look like cloth on a body)

A garment over the body (the layers, `RbLayerSet`) is held to what real clothes do. Ease (how much larger than the body
a garment is round) is ~5-8 cm round the chest for a fitted shirt, ~6.75 cm (5.2-8.3) for a man's jacket [12] and ~10 cm
for a fitted jacket [13], 3-4 in for an unlined jacket and 4-5 in for a coat [14]: radially (ease / 2π) a shirt stands
0.8-1.3 cm off the body, a jacket 1.1-1.6 cm, a coat 1.6-2.1 cm, and a layer over another garment adds only the
difference.

| Id | Measure | How it is measured | Limit |
|---|---|---|---|
| G1 | Stand-off | each layer's offset from the body's surface (cm), the outermost of each kind | trousers ≤ 0.7; boot foot ≤ 0.5, shaft ≤ 1.3; gaiter ≤ 0.9; jacket ≤ 1.0; vest ≤ 1.4; straps ≤ 1.8; cape ≤ 2.0; belt ≤ 1.8; wraps ≤ 0.4; shin guards ≤ 1.6 |
| G2 | Order | a layer worn over another stands further out than it (straps over the vest, the vest over the jacket, the belt over the trousers and the vest, boots' shafts and shin guards over the trousers) | always |
| G3 | Nothing through | an inner layer's surface (or the body's) through an outer layer in any state of §2 | ≤ 0.3 cm (C1's method on the layer's own mesh) |
| G4 | Cloth, not shells | seams, hems, folds and wear visible at the game camera's closest zoom; no smooth, padded or rubbery surface; colours of the wardrobe rule, not mud | review, §3 item 10 |

## 3. The review checklist (each capture, each person, in writing)

1. Arms hang from relaxed shoulders, elbows a little bent, hands resting at the side of the thigh, palms in.
2. Fingers half-curled, the thumb in; no flat spread hand, no claw, no fist at rest.
3. Shoulders down and level; the chest not puffed or caved.
4. The head level on the neck; eyes towards the partner or ahead; no chin up to the ceiling, no head wrenched round
   over a still body.
5. Both feet flat on the ground, heels down, weight borne; a natural stance, toes a little out; no hovering, no
   tiptoe, no foot inside the ground.
6. Standing still means still feet; turning means steps.
7. Walking: feet do not glide; stride and cadence fit the speed; arms swing against the legs.
8. Nothing passes through anything: hands, arms, clothes, hair against the body and each other.
9. Beside a photograph of real people doing the same: would a stranger say this looks like a person?
10. Clothes look like cloth on a body: as thick as real clothes, layered in the right order, with seams, hems, folds
    and wear; not padded, inflated, rubbery or painted on; lore-bound (the wardrobe rule).

## 4. Changes to this gate

A measure may be added or a limit tightened at any time. A limit is loosened only with a cited source on real people,
written into the table with its date, and never to let a failing build through. Every new kind of fault the owner or a
review finds becomes a measure here before it is fixed, so it cannot come back unnoticed.

## Sources

1. Upright CT of the elbow in neutral standing (arms at the side, shoulders neutral, palms to the trunk): flexion median
   15.5° (IQR 13.2–18.1°). J Orthop Surg Res 2022. https://link.springer.com/content/pdf/10.1186/s13018-022-03113-5.pdf
2. Natural head position (definition; Frankfort plane variation). https://en.wikipedia.org/wiki/Natural_head_position
3. Inclination of craniofacial reference planes to the true horizontal (FH 2.34 ± 4.13°, range −13 to +11°).
   https://journalofkcd.com/kcd/article/view/558
4. Eye-head coordination during large gaze shifts (Tweed, Glenn & Vilis 1995). https://www.sciencegate.app/document/10.1152/jn.1995.73.2.766
5. Freedman & Sparks: the head contributes little below 25°; the eye's part rarely exceeds 35°. https://sites.pitt.edu/~neg8/rajimages/pdf/2001-3295.pdf
6. McIlroy & Maki 1997, preferred placement of the feet during quiet stance (0.17 m between heel centres, 14°), as
   cited in https://pro.univ-lille.fr/fileadmin/user_upload/pages_pros/cedrick_bonnet/2012a_Bonnet.pdf
7. Self-selected stance width in older adults, 17.7 ± 4.7 cm. https://reference-global.com/article/10.37190/abb-02096-2022-06
8. Self-selected stance width in young men, 16.35 ± 4.20 cm. https://www.frontiersin.org/articles/10.3389/fbioe.2025.1538286/full
9. Zhang et al., LEMO (ICCV 2021): skating counted when both foot markers move faster than 10 cm/s below 10 cm height.
   https://arxiv.org/pdf/2108.10399
10. Mir et al. 2023: foot skate as height-weighted toe-vertex speed below H = 2.5 cm. https://arxiv.org/pdf/2304.02061
11. Hall, The Hidden Dimension (1966): proxemic distances (personal 0.46–1.2 m, social 1.2–3.6 m).
12. Preferred chest ease of men's formal jackets, median 6.75 cm (5.2-8.3 cm), Fashion and Textiles 2018.
    https://fashionandtextiles.springeropen.com/articles/10.1186/s40691-018-0165-x/tables/7
13. Ease of fitted jackets for older women, ~10 cm at the bust. https://koreascience.or.kr/article/JAKO200211922012857.page?&lang=en
14. Singer, The Perfect Fit, via Threads: blouse 2.5-3 in, unlined jacket 3-4 in, coat 4-5 in.
15. Elbow carrying angle in healthy adults (600 students, full extension): 10.97 ± 4.27° in men, 15.07 ± 4.95° in women; young adults 9.77 ± 2.82° and 13.94 ± 3.97°. https://mjiri.iums.ac.ir/article-1-1044-en.pdf ; https://svuijm.journals.ekb.eg/article_360976.html
    https://www.threadsmagazine.com/forum/sufficient-ease
