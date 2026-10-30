# People realism: diagnosis and the binding plan (owner, 2026-10-30, pass 10)

The owner, after the P4.16 sheets: "completely unacceptable … it is like you have never seen a photo of a human being."
Two men of one town nearly identical, both with tall narrow "pencil" heads; beards that read as block overlays, all
alike; head, neck and body proportions cartoonish; grey hair on faces that look 35; a woman's head "inflated like a
balloon", wider than any neck could carry, her hair a wig on a bald head with the hairline in the wrong place. The
standard is KCD2 / BG3 / Cyberpunk 2077: near-photoreal, accurately proportioned people. **From now on no character model
is accepted unless it coheres with real images and measurements of real people of its ancestry, sex and age.** This file
is the diagnosis and the plan; it overrides earlier people plans where they differ (BUILD_PLAN §6.B, P4.14-P4.16).

## 1. Diagnosis: why every pass missed

1. **No ground truth, no gate.** Every pass was judged by eye against the last render ("better than before"), never
   against measurements or photographs of real people. Nothing could fail. Measured now, for the first time:
   - Real adults (ANSUR II, 6,068 people): a woman's head breadth is 1.41 times her neck's diameter (5th-95th
     percentile 1.29-1.52), a man's 1.22 (1.10-1.34); with ears and short hair a front silhouette reads about 1.7 (women)
     and 1.55 (men). Our women: **2.1 to 2.6**; the neck is 25-35 % too thin for the head, which is the balloon. Men
     1.3-1.7: in range on this one measure, wrong on others (below).
   - The face's height against its width, head length against breadth, forehead height, eye spacing, nose and mouth
     width were never measured at all.
2. **Faces from independent sliders, not from people.** The archetypes (P4.15a) set ~21 face targets on the MakeHuman
   base from rules written by hand. Real faces co-vary in ways no hand rule captures; independent offsets land outside the
   human range (pencil heads, balloon heads), and with most of the variance in a few macro sliders, people of one
   ancestry converge (Teo Marsh and Ilya Strand). Intra-group variation was never compared with real variation.
3. **The base's limits were not measured either.** MakeHuman's base (2014, ~14 K vertices) and its macro targets
   (age, weight, muscle, three ancestry blends) are coarse; its female neck is thin, its age macro moves a young adult
   towards child proportions (a big cranium on small features: Yuki). Each of these is measurable and correctable, but
   only with the measurements in hand.
4. **Age shown in the hair, not in the face.** Greying ran on its own pace model; the face kept a 24-year-old's shape
   with a skin blend that barely shows at the game camera. A 55-year-old with a white beard and a 35-year-old's face.
5. **Hair and beards as overlays.** Beards are painted into the skin shader (noise inside a mask): no thickness, a hard
   edge, one density for everyone. Scalp hair is a shell on a smooth cap whose hairline follows a table, not the person.
6. **Evidence taken in conditions no reference shares.** Flat studio light, a 56 mm-equivalent lens at 0.95 m; real
   portrait references are shot at 85 mm and 1.5-2 m in soft key light. Even a right head would read wrong.

## 2. Ground truth (all real people, all licences fit the owner's personal, non-commercial game)

- **ANSUR II** (US Army anthropometric survey 2012; public domain; `tools/unity/people/ref/`): head breadth, length,
  circumference, bizygomatic breadth, face height (menton-sellion), interpupillary breadth, tragion to top of head, neck
  circumference, stature, weight, shoulder breadth and more, by sex, race (White, Black, Hispanic, Asian, Native
  American, Pacific Islander) and age, 6,068 adults. The 3D proportions of head, neck and body.
- **FairFace** (Kärkkäinen and Joo 2021; CC BY 4.0; HuggingFaceM4/FairFace): real face photographs labelled by race
  (White, Black, East Asian, Southeast Asian, Indian, Middle Eastern, Latino), sex and age band. The reference boards
  per archetype and the landmark statistics of real faces (their spread inside each group as much as their means).
- **Published facial norms** where both are silent (Farkas et al. 2005, international anthropometric study of facial
  morphology in 25 populations: nose, mouth, eye fissure, lip heights), cited per number.

## 3. The gate (built first; binding)

A person the game makes is accepted only if all three hold, and a test fails the build otherwise:

1. **3D measures in range.** Measured on the person's mesh (`tools/unity/people/measure.py`: the base with their shape
   values, the ANSUR landmarks): every measure within the 3rd-97th percentile of their sex and ancestry in ANSUR II, and
   the measures together within the 95 % ellipse (Mahalanobis distance on the group's covariance, so a face cannot be
   at the edge on everything at once).
2. **2D proportions in range.** The same face-landmark model (MediaPipe Face Landmarker, Apache 2.0) run on our
   portrait render (85 mm equivalent, 1.6 m, soft key light) and on the group's FairFace photos; each normalised ratio
   (face width to height, eye spacing, nose width, mouth width, jaw width, forehead height, brow to eye) within the
   real group's 5th-95th percentile.
3. **Seen beside real people.** Every evidence sheet sets each person beside four real photos of their group and age
   band (the reference board), and the owner judges that. No sheet without the boards.

Two more rules ride on the gate: **distinct people** (no two people of one place closer in face-shape space than the
real nearest-neighbour distance within a group of that size), and **age coherence** (the face's apparent age from its
measures and skin within ten years of the person's age; grey hair only from 55, see §4.4).

## 4. Fixing the generator to pass it

1. **Head, neck and body from regressions on real people.** From ANSUR II: head breadth, length, face height, neck
   circumference and shoulder breadth as functions of sex, ancestry, stature, weight and age (linear models with their
   residual spread). The bases' head and neck targets are solved per person (blend shapes are linear, so a least-squares
   fit) to hit the person's sampled measures. The neck is never thinner than the real range for that head.
2. **Faces from real faces.** Fit our face basis to real FairFace faces of each group (landmarks, with a camera fit),
   giving each group's real distribution of face shapes in our own basis (mean and covariance); sample new people from
   it. Intra-group variation is then the real variation, by construction, and archetypes become regions of a real
   distribution, not rules. Where our basis cannot reach a real face (fit residual too large), the basis is extended
   with new targets until it can (that is the measure of the base's limits).
3. **The young adult's head.** The age macro's child proportions are kept out of adults (apparent age 18+ never moves the
   cranium towards a child's); age adds what real ageing adds (soft tissue descent, nasolabial depth, thinner lips,
   longer nose and ears), measured against FairFace's age bands.
4. **Greying: from 55 only** (owner rule: a necessary condition, not a sufficient one; the share greying rises after it),
   in the person's own colour as salt and pepper, scalp, beard and brows in step (brows last), and only on a face whose
   apparent age agrees.
5. **Beards as hair, not paint.** Beard geometry: cards following real facial-hair growth directions (cheek, jaw,
   moustache, chin), dense in the centre and thinning to a soft edge at the cheek line and the neck, with the stubble
   painted under it; styles and densities that vary by person and ancestry as real ones do. No painted block.
6. **Hair that grows from the head.** Hairline height from the face's own measures (trichion at the real forehead
   height for sex and age), the shell fitted to the person's skull, hair volume off the scalp, not a cap on a bald head.
7. **Portraits as photographs are taken.** 85 mm equivalent at 1.6 m, soft key and fill, for every evidence sheet.

## 5. If the base cannot pass

The gate decides it, with numbers: if, after §4, the MakeHuman base's residuals against real faces stay out of range,
the face basis is replaced by a statistical model of real head scans mapped onto our topology. Candidates: FLAME
(33,000 scans; free for non-commercial use, needs the owner's registration at flame.is.tue.mpg.de), the Basel Face
Model 2019 (same terms), ICT-FaceKit (Light Stage scans). MetaHuman (licence allows Unity) needs the owner's Epic login
and an Unreal export. None is a substitute for the gate; each would be held to it.

## 6. Order of work

- **R1** the gate: ANSUR II and FairFace in, the measuring tool, the 2D landmark comparison, the reference boards,
  `PeoplePlausibilityTests`; run it on the current people and publish the failures (the honest baseline).
- **R2** head, neck and body proportions from the regressions; re-run the gate. Done: 206 of 252 pass (§8).
- **R3** faces fitted to real faces per group; distinctness; re-run.
- **R4** age in the face; greying from 55.
- **R5** beards as geometry; hair fitted to the head.
- **R6** the Shale sheets with reference boards, to the owner.
Each step ends with the gate's numbers and the boards; nothing is sent as "better" that the gate fails.

## 7. Baseline (R1, 2026-10-30)

The gate built (`tools/unity/people/gate/`, `PeopleGateTests`), run on 252 adults (Shale's 39 and a sample of every
people, sex and age): **0 pass**. 3D (ANSUR II): neck girth 2.5 cm under the chin out of range in 191 (men: the shoulders
rise to the jaw, no neck, 118 of 124; women: necks too thin or too thick), head breadth in 133 (men's mostly too narrow:
pencil heads; some women's far too wide: the balloon), head length in 107 (men's too long), cheek width wider than the
skull in 53 women (impossible), faces too short in 52 women and too long in 25 men, eyes too close in 54 women. 2D
(FairFace): inner eye spacing out of range in 144, jaw width in 98, lips in 77, mouth width in 74, face height to width
in 69. The response model (`response.py`) predicts head breadth, length, cheek width and eye spacing within 1-3 mm from
the sliders, and shows hidden couplings: leg length (`body-legs`) shrinks the head by 14 mm breadth and 19 mm length;
the male base is 145 mm broad and 205 long at neutral (real 154 and 200), its neck girth 471 mm (real 397: no neck), the
female base's neck 304 (real 330). Evidence: `docs/evidence/unity/p4/realism/board_baseline_r1.jpg`,
`gate_baseline_r1.txt`.

Next (R2): the bases gain neck length and depth shapes, leg length stops scaling the head, and Core `Proportions` solves
each person's sliders, with the response model, to measures sampled from the real covariance of their sex and ancestry
(ANSUR II), so every person is in range and the variation within a people is the real variation.

## 8. R2: proportions from real people (2026-10-30)

**Result: 206 of 252 pass the gate** (82 %; baseline 0). Evidence: `docs/evidence/unity/p4/realism/gate_r2.txt`,
`board_r2_shale.jpg` (Shale's people), `board_r2_peoples.jpg` (one woman and one man of every people at 35), each beside
four real faces of their group.

What was wrong, measured (each a cause of what the owner saw):
- **The chin was measured at the throat.** The chin's underside runs back and down to the throat, so "the lowest point in
  front of the throat" was the throat's top: every face height and neck girth before R2 was taken there. Menton is now
  found on the midline section: the throat (the neck's deepest front point), the first bulge above it (the chin), the
  lowest point of its front 30 % (`measure.py` `menton`). Checked on plots for short, long, receding and forward chins.
- **Women's heads were 10 mm too tall in the vault** (tragion to top of head 138 mm against ANSUR's 126; head height
  228 against ~218). The chin sat 10 mm lower, onto the shoulders: the "balloon" head and the "no neck" together. Two
  ANSUR measures now hold it: tragion to top of head (the ear canal found as the ear's lower 45 %) and vertex to
  suprasternale (head and neck over the notch above the breastbone, found on the midline section).
- **Leg length scaled the head** (14 mm breadth): `keep_stature` now scales the body below the neck and carries the head.
- **The male base had no neck** (girth 482 mm under the chin against 397); the bases gained neck length and depth and head
  length, height and back-of-head shapes, and the solver fits them.
- **Stature grew with the neck and head shapes** (2.5 %): the response model includes the body's height, and the stature
  scale divides by it (`Bodies.ScaleOf`).
- **Women's brows sat low** (a fifth under FairFace's 5th percentile of brow to lid): raised 2.4 mm.

How each person is made now (Core `Proportions`, called from `Bodies.For` for every adult):
1. Their measures (head breadth and length, cheek width, face height, eye spacing, neck girth, vault height, head and neck
   height) drawn from ANSUR II's covariance for their sex and ancestry, given their stature, inside the 3rd-97th percentile
   of every measure and proportion.
2. The size shapes solved to reach them (coordinate descent on the response model, each shape held near the archetype's
   value; the neck's shapes answer only to the neck).
3. Their face's landmark proportions drawn from FairFace's covariance for their group and age band, given the two the
   head already sets (face height over width, eye spacing), and the feature shapes solved to reach them.
4. **The gate at the source**: the result is checked against every real range with room for the model's error, and a
   person who falls outside is drawn again (up to 10 draws, the closest kept).

The response model (`response.py`, `response2d.py`) is measured from one-slider renders and refitted on every round's
rendered people (ridge towards the one-slider values, a free offset): out of sample, head measures within 1-3 mm, face
height 3-9 mm, the face's proportions a quarter of a real sd; the neck's girth 16 mm (the hardest: it is taken under a chin
the shapes move). Rounds 1-8 of renders are its training data.

Still failing (46): marginal misses at range edges (most within 1 % of the bound); 2D misses on bearded men (the painted
beard confuses the landmark model: R5); East and Southeast Asian faces' cheek width against the skull's (the bases have no
shape that widens the skull alone; their round and oval types widen the cheeks more), and their cheek width's spread is
0.44 of the real one for the same reason; the neck's length on some (vertex to suprasternale). **Base fixes for R5**: a
skull-width shape (the cranium above the ears, fading out by the cheekbones) and a wider neck-length range, so the solver
need not run shapes to their limits. Generation cost: about 6 ms a person (release build); looks should be made off the
main thread or cached by id before crowds grow.

What the boards show beyond proportions (the owner's standard is not met yet, and the gate does not measure it): plastic
skin, small glassy eyes, hair that reads as a cap or a wig, painted block beards. These are R3-R5.

## 9. R5 part 1: beards as hair, the skull's width, distinct people (2026-10-30)

**Gate: 190 of 252 pass** (75 %; R2 206, but now with the real variety: the solver pulls less to the archetype and keeps
smaller margins, and the gate holds a new rule, below). Evidence: `gate_r5a.txt`, `board_r5a_men.jpg`,
`board_r5a_shale.jpg`.

- **Beards are hair** (owner: "block overlays"): cards rooted where the Skin shader paints the beard (the same zones:
  `hairgen.py` `beard_zones` is its `BeardAt`), lying along the skin as facial hair grows (down the cheeks and jaw, down and
  out from the philtrum, back along the jaw's underside), dense in the middle and sparse at the cheek line and the neck; a
  full beard 20-35 mm, hanging a little (at 40-60 mm it read as a costume). Four styles (short, full, goatee, moustache)
  as `beard` pieces on the male base (`Wardrobe.Beard`, `Looks.BeardPiece`); stubble stays paint; the strands take the
  beard's colour, a grey beard's white a dull grey-white. The painted beard stays under them as the skin's shadow.
- **Grey from 55, coming in over ten years** (`Bodies.GreyRamp`): no one jumps from none to half grey on a birthday; the
  beard over eight.
- **The skull's width alone** (`head-cranium`, built in `mh_build`): ±8.5 mm of head breadth, the cheeks' width unchanged.
  The solver uses it where the cheeks would pass the skull.
- **Distinct people** (gate rule, `gate.py distinct`): each adult's measures and face proportions whitened by their own
  group's covariance; two people of one sex and people in one place closer than the 5th percentile of the nearest pair
  among as many real people (inside the gate's ranges) both fail. R2's tighter solver left 21 such people in Shale; now 5.
- **The face measured bare**: a beard hides the mouth's corners and the chin and widens the outline, so the 2D half
  measures each face on a beard-free render (`portraits/`), and the boards show people as they look (`portraits_look/`).
- **Looks fitted when first shown** (`Bodies.For(fit: false)`, `Bodies.Finish` in `LookView.Apply`): a place's people
  are made as data when it loads; the few milliseconds of each one's fit come as they come near.

Still failing (62): edge misses spread over the measures (a third within 5 % of a range), most among the over-60s (ANSUR
stops at 58; FairFace's 60+ bands are thin), and five similar pairs. Next: R4 (age in the face: an apparent-age check, the
face's ageing to match), then the hair (the hairline at the person's own forehead, volume off the scalp) and the skin.

