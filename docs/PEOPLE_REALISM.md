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
- **R2** head, neck and body proportions from the regressions; re-run the gate.
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
