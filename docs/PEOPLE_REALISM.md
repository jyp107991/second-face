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
   values, the ANSUR landmarks): the head and neck measures given the person's stature within the region that holds
   97.5 % of the real people of their sex and ancestry in ANSUR II (the whitened distance from the group's conditional
   mean; §13: not each measure to its own percentiles, which half of the real people fail).
2. **2D proportions in range.** The same face-landmark model (MediaPipe Face Landmarker, Apache 2.0) run on our
   portrait render (85 mm equivalent, 1.6 m, soft key light) and on the group's FairFace photos: the normalised ratios
   (face width to height, eye spacing, nose width, mouth width, jaw width, the lower face, the lips, brow to eye), the
   face's whole shape and its apparent age, together within the region that holds 97.5 % of the real faces at rest of
   their people and sex (one coverage for the three; §13).
3. **Seen beside real people.** Every evidence sheet sets each person beside four real photos of their group and age
   band (the reference board), and the owner judges that. No sheet without the boards.

Two more rules ride on the gate: **distinct people** (no two people of one place closer in face-shape space than the
real nearest-neighbour distance within a group of that size), and **age coherence** (the face's apparent age, read by a
network trained on real photographs, within the spread of real people of the person's age class read the same way: part
of the 2D check, §13; grey hair only from 55, see §4.4).

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
- **R3** faces fitted to real faces per group; distinctness; re-run. The gate recalibrated on real people (§13).
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


## 10. R4 part 1: the apparent-age check, and the years in the skin's relief (2026-10-30)

**The measure.** An apparent-age estimator trained on real photographs (Levi & Hassner's age network, Adience; ONNX model
zoo), run on every gate portrait and, for calibration, on FairFace's real faces: the estimator reads real people young
(FairFace 25 -> 24, 45 -> 34, 65 -> 47, 75 -> 52), so ours are compared with real faces of the same band, never with the
age itself. Our portraits before this step: 18-30 -> 28.8, 45-58 -> 32.0, 58+ -> 37.7 (real 24, 34, 43-47). The young read
older than real ones (smooth, plastic skin reads as no age in particular) and the old read a decade younger.

**The skin's relief** (`Skin.shader` `WrinkleAt`, `Looks.Wrinkles`): forehead lines, the frown's two lines, crow's feet
fanned from the eye's corner, the line under the eye and the tear trough, the nasolabial fold, marionette lines and the
neck's rings, as a height field in the head's rest frame (so it follows the face's shapes) applied through the surface
gradient, with their cavity darkened and a blotchier tone; none before thirty, most of the way by seventy (sooner on a
man's skin, later on darker and East Asian skin, `Looks.SkinYears`), faded with distance so it never aliases on a phone.

**Gate: 186 of 252** (noise against R5a's 190: the 2D landmarks move a little with the relief). Apparent age after it:
58+ -> 37.7 against real 43-47: the relief alone is a small part of what makes a face read old. Next: age in the shape
(soft tissue's descent: cheeks, jowls, the upper lid's hood, thinner lips) and the hair's own defects, which the
estimator and the owner both see first (the hair's edge above a band of bare scalp, a white groom read as a cap).

## 11. R5 part 2: the hair grows from the head (2026-10-30)

Seen up close first: a test that renders a few people's heads from the front, three-quarters and the side at 0.95 m
(`PeopleGateTests.HairCloseups`, `SF_HAIR_IDS`), so each change is judged where the owner judges it, not in a 512-pixel
portrait. What it showed, and what was done:

- **The "wig on a bald head".** The painted hairline sat at a real height (nasion to hairline 61-64 mm on the base, real
  63-66), but the hair's layer began a centimetre and more above it, over a band of bare scalp painted in a colour taken
  from the base's forehead (paler than the person's toned skin). Now the layer starts at the painted line, its strands all
  begun within 3 mm (`hairgen.py` v22-28: hair weight 0.02, a 3 mm ramp, a small wobble, no late-starting clump of
  strands), the skin under a head of hair is left as it is, and the scalp under it takes a tint of the hair's colour from
  just inside the line (dense under dark hair, faint under grey and white; `Skin.shader`, `_ScalpColour.a` 2).
- **A smooth shell.** The layer shaded like plastic: one colour, one smooth highlight. Each strand and each lock of strands
  is now a little lighter or darker than the next, and the highlight is torn along them (`Cloth.shader`, hair only; where
  a strand is under a pixel, their mean).
- **White and grey hair as a cap.** White recoloured whole clipped to a flat white. Now grey is salt and pepper: the
  person's own colour (`PlayerLook.HairBase`) and a dull, yellowed white mixed by the share gone white, strand by strand on
  the layer (a third of the way from the mix to each strand's own colour: at a speaking distance it reads as grey), the
  locks taking the mix; the white never clips, and a light hair's strands are kept apart. The dark "holes" in a grey bun
  were the layer's UVs folding back (a triangle wave round the flow), where whole faces took one pigmented strand's colour.
- **The self-shadow of a lock** on the layer a millimetre below was cut to black; hair now gives back part of the light in
  its own shade, and a card is lit alike from both sides.

Measured, not kept: the bases' aged shape (MakeHuman's age macro, 24 to 62) on everyone by apparent age moved the
estimator's reading of the over-58s by 0.1 year and added 36 mm to a woman's neck; dropped. **Gate: 184 of 252** (noise
against 186; `gate_r5b.txt`). Evidence: `hair_r5b_closeups.jpg`, `board_r5b_old.jpg`.

Still wrong, seen on the board: a full white beard reads as a bright block; an older East Asian woman's face reads
masculine though she passes every measure (the gate holds proportions, not the sex's softer cues: brow ridge, jaw angle,
skin); a pale band under the jaw of some women; and the card hair is still far from the benchmark's (the Defender demo's
real grooms as cards for every style is the next lever).

R5 part 3 (same day): a bald man's horseshoe of white stubble had been painted at a dark stubble's density (a flat pale
wedge at the temples): light stubble is now sparse against the skin; the full beard's hanging layer is fine strands over
the painted beard instead of leaf-wide locks (`hairgen.py` v29); the two-sided lighting of hair cards is the standard one
again (lighting both faces alike was not the cure for the grey bun and lit beards' undersides). **Gate: 186 of 252**
(`gate_r5c.txt`, `beards_r5c_closeups.jpg`). The beards still read as shreds up close: procedural cards are at their
limit, and the next lever is the same as the hair's (real grooms as cards).

## 12. What the faces say: apparent age and sex read by real-photo networks (2026-10-30)

`tools/unity/people/gate/apparent.py`: Levi & Hassner's age and gender networks (Adience; ONNX model zoo) read on FairFace's
1,975 frontal adults and on our portraits the same way. The instrument is crude (it reads real people young and a third of
real women as men), so only the gap between real and ours is evidence. Two crops: the inner face (pad 0.05) and the head
with its hair and neck (pad 0.6).

| | real, head (0.6) | ours, head | real, face (0.05) | ours, face |
|---|---|---|---|---|
| apparent age, 45-58 | 37.2 | 31.7 | 27.2 | 22.9 |
| apparent age, 58+ | 49.2 | 37.4 | 36.0 | 41.5 |
| women read as men | 37 % | 73 % | 33 % | 79 % |
| men read as women | 3 % | 18 % | 11 % | 27 % |

- **The years are missing outside the face.** The inner face of our over-58s reads older than real people's; with the
  head, hair and neck in frame they read twelve years young. What ages a head beyond the face: the neck and jawline (soft
  tissue under the chin, jowls, the neck's folds), thinning hair, ears. Next for R4.
- **The sexes are not told apart as real ones are.** Our women are read as men twice as often as real women, our men as
  women five times as often as real men, from the inner face alone; the neutral female base reads as a man outright. The
  proportions gate passes them (it holds sizes and ratios, not the cues people read sex by: brow ridge and brows, the eye
  region, the jaw's angle, the nose, lips, a beard's shadow, skin). Next: those cues, measured with this instrument on the
  population (one-slider renders saturate it; only the aggregate moves), until the gap closes.

**The sexes' cues, tried (same day; `PeopleGateTests.SexCues`, the gate's 216 sample people per variant):** each sex's face
pushed to its own side on the twelve sliders that mark sex (a third of each range's half, inside the sex's range), the
finest brows on women and the heaviest on men, and both. The network's reading barely moved: women read as men 81 % ->
85 % (face), 72 % (brows), 77 % (both) from the inner face; 74 % -> 64 % (both) with the head. So the gap to real women
(33-37 %) is not in the shapes and brows the sculptor holds inside real ranges; it lies in what real photographs carry and
this instrument keys on (makeup's dark lash line and lip colour, which our world mostly lacks) or in the rendering. Faces are
not pushed past real ranges to please a crude instrument; the owner's eye and the boards decide the sexes' read, and a
better instrument (a FairFace-trained network, needing PyTorch and more disk than this session has) is the next measure.

R5 part 4 (same day): **the square notch at the front of every hairline** was the hair weight's rule against the face
(nothing more than 1 cm in front of the eyes' depth), which also caught the forehead's bulge at the hairline's middle: the
layer had an inner border there and its strands never started over a patch 1.5-2 cm wide. The rule now holds below the
hairline only (`hairgen.py` v31; the painted scalp's bake follows, being the same weight). Found by measuring, not by eye:
the layer reached the line all round, but the strand coordinate stayed low 12 mm inside it at the front, and the patch's
border edges showed a row at 31 degrees. Fewer women cropped (a fifth, now a tenth; Bodies.HairStyle): with no hair round
the face, a cropped woman's face read as a man's to the eye and to the network alike. The braid made from the Defender's
real groom reads more like hair than the procedural layers do (strand flow, flyaways, volume): the next lever.

**The skin's colour zones** (same day; `Skin.shader` `Zones`): blood warms the cheeks, the nose, the ears and the chin
(most on fair skin, still on dark); the eye sockets are darker and a little cooler (more on darker skin and with the
years); the forehead a touch yellower; the whole skin mottled by a few per cent in patches of a few centimetres. Subtle at
the gate's portrait (gate 185 of 252, `gate_r5e.txt`; noise against 188). **Known limit of the evidence:** the gate's
studio renders without the game's post-processing (ACES, grading, vignette: `World.Look`); applying the look to its
camera, through `Camera.Render` or the render request alike, changed nothing in batch mode, so the portraits and boards are
linear and fair skin clips brighter than the phone shows. Open: find why, so the boards show the game's grade.

## 13. R3: faces from real faces, and a gate calibrated on real people (2026-10-30)

**The gate rejected real people.** Run on the real people it is built from, the old gate failed most of them: one check
per measure at the 3rd-97th percentile passed 54 % of real ANSUR II soldiers, and one per ratio at the 5th-95th passed 36 %
of real FairFace faces at rest. Each check alone keeps 90-94 %; ten together keep only the people typical on every count,
which real people are not. Held to it, the solver pulled everyone towards the middle on every measure at once (its
targets kept a margin inside each range): the opposite of real variety, and the source of look-alikes. Recalibrated
(`gate.py`, `ansur_stats.py`):

- **3D**: the head and neck measures given the stature, whitened by the group's conditional covariance; a person fails
  beyond the distance that holds 97.5 % of the group's real people (each held out of the mean and covariance it is
  measured against: the small groups' in-sample distances run short). Limits 4.26-4.51.
- **2D**: the face's proportions (nine ratios) whitened by the spread within a people (pooled per sex: FairFace has
  34-91 faces at rest per people and sex), its whole shape (69 landmarks, symmetrised, in the sex's whitened shape space,
  `shapes.py`) and its apparent age (§12's network, against real people of its age class), with one coverage for the three
  chosen so that 97.5 % of the real faces pass all three (men 97.6 % of 496, women 97.7 % of 348).
- So about 95 % of real people would pass the gate, and every one of ours must. Single measures outside the real
  percentiles stay in the report as notes (real people have them too). Distinct people: the simulated real groups are
  held to the same joint regions.
- **As groups**: each age class's mean apparent age against real people's (`population` in `gate.py`): one person's
  reading can lie in the wide real spread while a whole class reads years off.

**Faces drawn from real faces** (`fairface_shapes.py`, `faces_fit.py`, Core `RealFaces`, `FacesData`): FairFace's 844
frontal faces at rest (lips together), each fitted in our sculptor's basis on its sex's base (ridge; the people's and
age's macros fixed). Every adult's face is three real faces of their people, sex and age class blended (none more than
60 %: two people of one place sharing a face stayed alike), the blend's difference from the pool's middle scaled back to
one face's spread (a plain 60/40 mix of two keeps 72 % of their spread, and people blended so came out alike). A person
keeps their source (`PlayerLook.FaceSource`), and the boards show it beside them. The frontal photograph sets the 40
sliders it measurably moves, never the depth sliders (the head's length, the brow ridge, the nose's projection, the mouth
and chin forward): a photograph cannot see depth, and fitted they took up other sliders' share of the outline.

- **The basis's limits, measured**: where fits sat at a slider's end (the brows' height for a fifth of women and an
  eighth of men; men's chin and nose length for a tenth), the slider reaches further (`Sculpt.Extended`). The fits now
  reach 82-89 % of women's shapes and 83-95 % of men's (from 79-87 % and 82-93 %).
- **The body in the face**: the real faces are drawn weighted by how their fullness fits the body's (facial adiposity
  follows body mass: Coetzee, Perrett and Stephen 2009), so a muscled man is hardly ever gaunt; the head and neck measures
  are drawn given the body's mass as well (ANSUR II: a man's neck 20 mm round thicker per sd of BMI at his stature, r about
  0.8; his cheeks 3 mm wider), so a heavy or muscled man's neck is thicker.
- **Attractiveness**: the striking nearer their people's middle and the plain further from it (averageness: Langlois and
  Roggman 1990), the people's spread kept on the whole.
- **At the source**: each blend is checked against the gate's 2D checks before it is used, and the head's draw is held
  inside the 3D region less room for the model's error.

**The tests that held hand rules**, rewritten against real data: a slider set by a real fit means different things on a
man's base and a woman's (real women's jaws fit with the female base's square shape; their eyes with the eye-size slider
below zero), so dimorphism, ancestry and age are held where they show, in the measured proportions: ours must differ
between the sexes, the peoples and the ages as real faces do, within the sampling error of both (three standard errors
for two dozen comparisons), wherever the real faces establish a difference. Per people, FairFace's sex differences are
noise; pooled, they hold. Sliders a frontal face does not show keep their archetype rules.

**A measuring fault found on the way**: on a thick or long neck the chin finder (`measure.py`) took the larynx for the
chin (faces measured 4-6 sd long, their necks measured round the jaw), and on a chin set back behind the lips it ran on
to the lips (faces measured up to 7 mm short: many West and East African faces from the real faces). It now anchors on
the chin's underside; the response models were refitted on every round (2,772 people) with it.

**Result** (`gate_r3.txt`, `board_r3_shale.jpg`): **245 of 252** pass the person-by-person gate (185 before R3); 3D head
and neck 2, face shape 1 (an authored raider's broad frame), and two pairs alike (each pair shares real faces: FairFace
has 6-60 faces per people, sex and decade, and nothing yet stops two people of one place drawing the same one). **The
gate as a whole fails**, and the boards fail by eye:

- **The years**: as groups, our 20-29s read 4 years older than real people of that age, our 50-59s 13 years younger and
  our 60-69s 10 younger. The geometry of real old faces is in our people now; what ages a face in a photograph beyond its
  outline (the skin, the eyelids and the jaw's soft tissue, the neck, thinning hair) is not. Next: R4.
- **The sexes**: three in four of our women are read as men by the network (real women: 37 %), and on the board several
  women read as young men to the eye (Ada Vey, Issa Lind, Mags Durrow): their real faces' proportions are there, but
  not what people read sex by beyond proportions (hair round the face, the brows' and lashes' darkness, the lips' colour,
  the skin's smoothness and the soft tissue over the cheeks). Next, with R4: those cues, measured on the population.
- **Look-alikes**: the people of one place drawn without sharing a real face (a place-level rule in Core).

The geometric gate is necessary, not sufficient: no person is accepted on its numbers while the boards say otherwise.

## 14. R4 and the sexes' cues, part 1: facial contrast (2026-10-30, in progress)

**Measured first** (`gate/contrast.py`): how much darker the eyes, brows and lips are than the skin round them, and how much
redder the lips, on FairFace's faces at rest and on our portraits the same way. Women's faces carry more of it than men's
(Russell 2009) and it fades with the years and is read as age (Porcheron, Mauger and Russell 2013). Before:

| | real women 20-39 | ours | real men 20-39 | ours |
|---|---|---|---|---|
| eyes (L* contrast) | +0.22 | -0.05 | +0.16 | -0.02 |
| brows | +0.15 | +0.12 | +0.23 | +0.14 |
| lips' redness (a* over the skin) | +8.1 | +1.9 | +5.5 | +4.5 |

Our eyes were lighter than the skin round them, where real eyes read a third darker; our women's lips paler than our men's,
the reverse of real faces. Split: real eye openings are 0.67 of the skin round them and the lids 0.76; ours 1.02 and 0.95.

**Done**: the lash lines along the lids (`Skin.shader` `LashLines`, the lids' margins measured on both bases' eye openings
in the head frame; the rest positions are per vertex, so a band under ~4 mm showed as a pixel), the lips redder and deeper
by sex and years (`Looks.Contrast`), the white of the eye shaded towards the lids and yellower with the years, the iris no
longer a mirror (the eyeball carries no cornea, and its gloss made brown eyes read silver), the top of the eyeball shaded
by the upper lid, and ambient occlusion per vertex (`WardrobeBuild.Occlusion`, in the rest map's alpha). **Result**: the
lips' redness now as real men's (5.4 against 5.5) and fading with the years as real lips do; women's 5.4 against 8.1. **The
eyes did not move** (-0.01 against +0.22): the occlusion darkens the lids and the skin round them alike, and the eyeball's
brightness is not what the gap is made of. What remains: the lashes themselves (strands thinned to a fifth at the build:
they read as dots), the brows' and lids' shadows under light from above, and the photograph's tone curve, which the gate's
studio does not have (§11: the game's post-processing does not reach its batch renders). Next: the studio's grade, then
the lashes as cards.

**Part 1b (same day): the grade, and contrast by people.** The gate's portraits had no tone mapping or grade because the
GLES3 tier's renderer (the editor's, CI's and older phones') was made in code without post-process data: every capture since
the tiers were split rendered ungraded, and so do GLES3 phones. Given the data, the editor's software GL driver crashed
drawing the people's lineup with the look on (`ScreenshotTests.PeoplesLineup`, a segfault in the driver's draw call), so the
renderer is left as it was and the gate studio renders linear HDR and grades on readback as the look does (`Studio.Grade`:
exposure, contrast in LogC, saturation, ACES). **Open**: GLES3 phones ungraded; to decide on a device. Compared by people (FairFace's mix of peoples is not ours; sunglasses left out of the real faces):

| eyes / lips' a* | real women | ours | real men | ours |
|---|---|---|---|---|
| white | +0.18 / 8.6 | +0.10 / 5.6 | +0.16 / 7.8 | +0.13 / 4.2 |
| black | +0.13 / 3.4 | -0.17 / 1.1 | +0.10 / 2.9 | -0.18 / 2.2 |
| east Asian | +0.26 / 11.2 | +0.14 / 6.5 | +0.21 / 6.5 | +0.08 / 5.8 |

The brows and the lips' darkness are now within the real values by people (the lips no darker than the skin on dark skin,
the brows softer there). **Still wrong**: on dark skin our eyes read lighter than the skin round them where real ones read
darker (the white of the eye against dark skin; lids darkened by 38 % on dark skin did not close it), and the lips are less
red than real (FairFace's women wear make-up, which our world mostly lacks: their values are a ceiling for women, men's
the clean target). Apparent age and sex barely moved: the 20-29s now read 28, the 50-59s still 27 and the 60-69s 34; women
read as men 67 % (real 37 %), men as women 17 % (real 3 %). Facial contrast is part of the read, not most of it: next the
lashes as geometry the camera resolves, and what ages a face in a photograph beyond its contrast (`gate_r4a.txt`).


## 15. R4c: the skin's colour as measured, and the eye against it (2026-10-31, in progress)

**Found by measuring the eye region by parts** (opening, lids, skin ring; `contrast.py` now reports by people the skin's
rendered L* round the eyes, the white of the eye over it, the iris's L* and chroma, and the lids' gap over the iris): our
eyes read lighter than the skin on dark faces not because of the eye but because **our darkest skin rendered L* 16 against
the fairest 61**, a luminance ratio three times the real one. The old tone was a curve on the bake tuned by look (a third of
its shade at the dark end, lifted most of the way to white at the fair).

**The skin's colour is now a measured quantity** (Core `SkinColour`): a tone maps to the cheek's CIELAB as dermatology
measures it (spectrophotometer d/8, D65, specular included): L* = 54 - 20 t - 4 t^2, hue about 53 degrees (yellower with a
warm undertone), chroma about 19, less on the darkest skin. The peoples' tones are rebased so their indoor adults' cheeks are
where real ones were measured: British 59.6 (sd 5.5), Kurdish 58.0, Chinese 58.9, Thai 60.7 (Xiao et al. 2017, Skin Res
Technol 23); Indian adults 53-63 (Pawar et al. 2024); Black African foreheads at ITA -33 (Liège) and mostly below -50 (Uganda,
ten countries), L* about 35-40. The shader multiplies the balanced bake by one factor per channel (`_ToneMul`). Tested per
people (`SkinColourTests`): mean cheek L* north European 61.0, Mediterranean 57.7, East Asian 58.6, Southeast Asian 56.7,
Latin American 55.7, South Asian 52.8, Indigenous American 53.2, East African 38.2, West African 37.6, each within 1.5 of
the measured mean, spreads 3.2-4.5.

**Rendered** (round 14): the skin round the eyes now L* 39-43 on light skin (real photographs 38-40) and 20 on the darkest
(real 27-29: photographs are exposed for each face, the game's scenes are not). Measured at the photographs' scale (ours
brought to FairFace's 81 px between the eyes) nothing changed, so resolution was not the cause. What the parts then showed:

| under 60 | white of the eye / skin | iris L* | lids' gap / iris |
|---|---|---|---|
| real, light skin (white) | 1.13 | 19-22 | 0.69-0.73 |
| ours, north European | 1.38-1.58 | 30-35 | 0.68-0.78 |
| real, darkest (black) | 1.40-1.48 | 16-17 | 0.70 |
| ours, African | 2.68-2.79 | 22 | 0.71-0.85 |

The eyes are as open as real ones; the white and the iris are too bright, most of all on dark skin (in exposure-free terms
the white reflects 2.4 times the skin on light faces against 1.3 real, 8 times on dark against 2.1). The real values also
say a dark face's white is itself darker (no brighter in a photograph exposed for that face: about half as bright
physically, the conjunctiva's pigment). **Done next**: the white set from Core by the skin's measured lightness
(`Looks.EyeWhite`: 0.62 for everyone, to about half that and warmer on the darkest skin) and the iris at 0.6 of its old
albedo; re-measured below.

**Rounds 15-18** (the white and iris against the skin; the studio metered as a camera, exposure by the skin's measured
reflectance to the power -0.34, fitted so dark cheeks read 0.51 of light ones as in FairFace where dermatology measures
0.36; brown eyes by the skin's pigment, `Bodies.DarkEyes`; the iris a cornea's sharp catchlight with the room's reflection
occluded, where the old broad gloss outshone a dark iris and read grey; men's lash lines lighter; brows dense at the core):

| under 60, round 18 | eyes contrast real / ours | white / skin real / ours | iris L* real / ours |
|---|---|---|---|
| white women / men | +0.19 / +0.10, +0.16 / +0.17 | 1.13 / 1.32, 1.13 / 1.14 | 19 / 21, 22 / 20 |
| East Asian women / men | +0.25 / +0.24, +0.21 / +0.20 | 0.94 / 1.20, 0.97 / 1.17 | 19 / 12, 18 / 17 |
| Black women / men | +0.13 / +0.07, +0.10 / +0.10 | 1.40 / 1.74, 1.48 / 1.57 | 16 / 13, 17 / 15 |

The eye region is now near real for most peoples. **But the faces read younger, not older**: apparent age 45-58 at 22.6
and 58+ at 26.4 (round 13: 27 and 34; real 37 and 49). Image-space edits of our portraits (a lighter, greyer iris; brighter
or yellower whites; the whole frame darker or brighter; desaturated) move the reading by at most 1.7 years, so the eyes are
not what took the years away. **Found next**: the aged skin bake (blended in from the late twenties) is paler and bluer
than the young one (blue +34 % on the women's base, +63 % on the men's), so every older person drifted pale and grey,
darker skin most (on the board an old South Asian man rendered pink-pale beside dark brown sources). The aged bake is now
brought to the young bake's colour per channel (`_AgedBalance`, `WardrobeBuild.AgedBalance`): its lines and spots stay,
its cast does not (real skin darkens a little with the years: de Rigal et al. 2010). The boards also show what still reads
young beside the real sources: smooth cheeks and lids, no sagging or folds, white hair as a cap and white moustaches as
teeth (R5's beards and hair, owed).

**Round 19 (R4c closed, `gate_r4c.txt`, `eyes_r4c_before.jpg` / `eyes_r4c_after.jpg`, `board_r4c_old.jpg`)**: with the aged
bake balanced, older people keep their people's colour; the eye region as above. Apparent age barely moved (58+ 28.3, real
49; 45-58 22.5, real 37): **the faces read young for what their shape and texture lack, not their colour or eyes.** Sex
read: women as men 55 % (real 37 %, was 67 %), men as women 20 % (real 3 %, was 17 % and 29 % in between). Gate person by
person 243 of 252 (six look-alike pairs, two head-and-neck, one age). **R4 continues** with what ages a face beyond its
colour and contrast, from the boards: the soft tissue (nasolabial folds, jowls, under-eye bags, hollow temples, thinner
lips, the brow's descent), crow's feet and the cheeks' texture, and R5's white hair (a cap) and white beards (read as
teeth); each measured with `apparent.py` on the population and judged on the boards.

## 16. R4d: what ages a face beyond its colour and contrast (2026-10-31, in progress)

**What the age reader keys on** (image-space edits of our portraits, `agesens` in the session's scratch): sharpening the
skin's surface detail read our 30+ people 6 years older and blurring 3 younger; a lighter iris, brighter or yellower whites,
the frame darker or brighter, desaturated: under 2 years. So the years are in the skin's surface (lines, creases, uneven
tone) before its colour.

**Done**: the lines (`Looks.Wrinkles`) from 25 years shown, linear to 70 (they barely began before fifty), darker and
deeper (half the skin's light at a groove's floor, 1.7 mm), more uneven tone and sun spots; the aged bake (made for 62, its
folds baked as creases) in from 25 and whole by 62 (`Looks.SkinAge`; a third of the way in at fifty before).

| apparent age | real | round 19 | lines (20) | + aged bake (21) |
|---|---|---|---|---|
| 30-45 | 29.6 | 22.7 | 22.8 | 22.8 |
| 45-58 | 37.2 | 22.5 | 25.8 | 27.1 |
| 58+ | 49.2 | 28.3 | 31.7 | 32.5 |

**Tried and reverted**: holding the head-age slider at the years instead of fitting it (in the real faces' fits it carried
a sex difference, women 0.59 and men 0.31 at every decade, not the years). It aged the oldest 2 more years but women read
as men 66 % (from 55 %) and two dimorphism tests failed (brow-to-eye, the eyes' spacing between peoples); fitted as a
ridged difference from the years it still lost the sex difference. The sculptor's `aged` shape is MakeHuman's age macro on
the head, which `body-age` already applies by the years: the base's own geometric ageing is in and is weak.

**Still**: the 30-45s read 23, the old 15 years young; sharpening still adds 4 years. The boards' plainest defects come
next because they bear on age and sex together: white hair reads as a cap and white beards as teeth (R5), and old men are
read as women (P(male) 0.17 among our 45+).

**R5, beards (same day)**: on the boards white moustaches read as teeth. The generator's moustache cards were 13 mm long
from the upper lip's skin, so they hung past the mouth's line in front of the parted lips (white over dark). Cards rooted
over the lip now end at the lip's edge (`hairgen.LIP_EDGE`, v32) and the moustache's are 7-8 mm; rebuilt for the men's
base (beards only). The moustache now sits on the lip; it still reads as a bright fringe more than hair (no shade between
strands, white near paper on a metered dark face): the beards' shading is next.

**Round 23 (close-ups of older people, `hair_*` captures)**: the sun spots of R4d read as a rash over every face (an even
speckle, dark skin too); they are now sparse, clustered and mostly on fair skin, at a cost of half a year on the 45-58s
(26.6; 58+ 32.5). White hair at 0.46 linear read as plaster on the head and paper in a moustache; it is the photographed
white now (0.31/0.30/0.26). Still owed from the close-ups: women's short white hair sits like a cap (its shape: no volume
off the scalp), white moustaches read as a fringe (no shade between strands); nine of ten hats carry no delete list, so
they mask no skin under them. Sex read unchanged by any of this round's work: women as men 62 % (real 37 %), men as women
15 % (real 3 %).

**The sexes' cues, rounds 24-26 (`gate_r4_sexcues.txt`)**: image-space edits of our women 18-45 against the sex reader
(lips redder and darker, the eyes lined, skin smoother, the frame brighter, the brows lightened): only lightening the brows
moved it (read as men 52 % to 35 %, real 37 %). Measured against FairFace, real men's brows stand out half again as much as
women's (0.225 against 0.144); ours were 0.171 and 0.142. Men's brows are now denser and women's finer (`Looks.BrowOf`):
0.19-0.21 and 0.124. The same table showed our lips redder than real ones, men's twice (a* over the skin 12.6 against 6.0):
men's lips now below the bake's red, women's less red (`Looks.Contrast`): men 7.7, women 9.2 (real 6.0 and 8.5, the women's
with lipstick). The lips' darkness did not move (0.136 against men's real 0.052) whatever the colour, and not because the mouths are
open: measured as FairFace's faces are (inner lips' gap over the face's height), ours are closed (women 0.006, men 0.014;
closed is under 0.035). The lightening term (`_Contrast.w`) changed nothing between rounds: to trace (the lips' mask, the
per-vertex occlusion in the mouth's line, the bake's own lips). The sex read barely
moved through all of it: women as men 58 %, men as women 15 % (real 37 and 3 %); the oldest read 2 years older with less
red lips (58+ 34.3). What reads sex beyond these is in the face's and hair's shape: the next work there.

**No shared real face within a place (#112, same day)**: two people of one town blending one or two of the same real
faces read as kin (Shale: Pike and Marsh shared two, Fenn and Doran one, Mai and Ana two; the gate's look-alike pairs).
Core `Cast` draws everyone named in one order (the maps by id, each map's people in placement order, a person where they
are first placed), each leaving out the real faces of those drawn before who share any map with them (`RealFaces.Pick`'s
avoid set, widened a decade at a time where fewer than three remain, the pool's middle kept); a place's extras leave out
all of its named people's faces (`Extras.Of`). Drawing each place's people only against that place's earlier people left
Marsh (first placed in another map) sharing two faces with Pike; held for every map now (`CastTests`). No two people of any
place share a real face. The gate's look-alike check still fails one pair, Ada Vey and Calla (3.19 against 4.2), who share
none: the check is statistical (a real group's nearest pair falls under its floor one time in twenty), and ours come close
more often because **our faces and heads vary less than real people's**: whitened by their own people's real spread (1 for
real people), ours are 0.57-0.72 in the face's width over its height, the eyes' spacing over the face, the nose's width
over the eyes', the eyes' size, the cheekbones' breadth and the pupils' spacing (0.82-0.95 in the head's length and
breadth, the face's height, the neck; the lips' height over the face is 1.26 in women, wider than real). The fits'
ridge, the solver's anchoring to the archetype and the limits' room all pull towards the middle: to find and undo (#116),
then the look-alike check again.

**The lips' darkness traced (rounds 27-29, #115)**: measured by parts against FairFace (`lipsplit` in the session's scratch:
the lips' outline split at the mouth's line, the ring of skin above and below it), men 20-59, L* contrast:

| | all | upper lip | lower lip | the line | ring above / below | a* upper / lower |
|---|---|---|---|---|---|---|
| real | 0.044 | 0.116 | -0.010 | 0.140 | 37.6 / 36.7 | 4.8 / 6.4 |
| ours before | 0.121 | 0.176 | 0.082 | 0.323 | 48.9 / 41.2 | 0.2 / 12.6 |
| masks on the mouth (27) | 0.106 | 0.180 | 0.046 | 0.302 | 48.3 / 41.7 | 4.9 / 8.5 |
| lips' occlusion floored (28) | 0.099 | 0.172 | 0.038 | 0.286 | 48.3 / 41.5 | 4.9 / 8.4 |

Three causes. (1) Every mask round the mouth was placed at the women's mouth (-0.67 in the head frame); the men's lower face
is longer and their mouth's line sits at -0.75 (measured on each base: the deepest occlusion on the midline under the nose,
`WardrobeBuild.MouthLine` into `_Mouth`), so on men the lips' colour lay on the upper lip and the skin above it, and the
painted stubble on the lower lip. The masks follow each base's mouth now. (2) The per-vertex occlusion of the lips' seam
spread over the lips' inner halves: floored inside the lips (a small part of the line's darkness). (3) The gate's studio
lights from 28 degrees above: the skin under our lower lip is 7-10 L* darker than above the lips, real photographs' 1-3. A
key at 12 degrees halved that gradient and lightened the line (0.241), but moved the eyes' and brows' contrast further from
real (women's eyes 0.140 against 0.206, men's brows 0.180 against 0.225), the lips' a* up and the men read as women from
17 to 26 % (real 3 %): FairFace's light is not simply frontal, and every colour calibration so far was made under the 28
degree key. The studio stays at 28 degrees; a studio fitted to the photographs' light on all these measures together is
owed (with the studio's post-processing, #110). The men's lips remain twice real (0.099 against 0.044), most of it the
line and the shading under the lower lip.

**Faces' and heads' spread restored (#116, rounds 30-32)**: drawn apart (each head's measures from ANSUR II's soldiers given
the stature, its face from FairFace's real faces), the two met in the solver over the measures they share (the cheeks'
breadth, the face's height, the pupils' spacing) and it split the difference: two independent draws averaged keep about
0.7 of the spread, and ours kept 0.57-0.74 of real people's in the face's width over its height, the eyes' spacing and the
nose (measured in Core on 960 draws, whitened by the real faces' spread within a people; the real-face fits themselves keep
0.49-0.96 before any solving, ridge-shrunk). `Proportions.Fit` now solves a real face against its own proportions first (the
head's other measures held lightly), reads off the measures the face sets, and draws the head and neck given them and the
stature (the Gaussian conditioned on them, the face's measures taken as an observation as uncertain as the group's own
spread: held exactly, the rendered faces' heights spread a quarter to a third wider than real, a photograph's proportions
carrying the head's tilt a frontal render lacks); the face's proportions weigh three times the head's measures (held equal,
men's faces came out shorter for their width than real men's and the sexes' difference test failed); the later half of the
draws falls back to the head first, so every head stays inside the real region. The response models were refitted with
the first face-first round (it had put shapes where they knew few people: 47 faces measured long, 7 heads failing).

| whitened sd (real 1), Core, women / men | before | now |
|---|---|---|
| the face's width over its height | 0.66 / 0.57 | 0.74 / 0.71 |
| the eyes' spacing over the face | 0.74 / 0.72 | 0.81 / 0.83 |
| the eyes' size | 0.76 / 0.76 | 0.80 / 0.79 |
| the nose's width over the eyes' spacing | 0.80 / 0.79 | 0.84 / 0.81 |
| the cheeks' breadth (3D) | 0.84 / 0.79 | 0.92 (rendered 1.11 / 1.02 at the firm hold) |

Rendered (round 31, the firm hold): the gate 248 of 252 (245 before), **no look-alike pair**, no proportions or shape
failure; 3 heads and 1 age remain, but the faces' heights spread too wide. **Round 32 (the loose hold, `gate_r116.txt`): 249
of 252**, no look-alike pair, 1 head, 1 age and 1 proportions failure (Pell, as before #116); rendered and whitened by
real people's spread (women / men; round 13, before #116, in brackets): the face's width over its height 0.71 / 0.76 (0.60 /
0.62), the cheeks' breadth 1.02 / 0.97 (0.86 / 0.80), the pupils' spacing 1.00 / 0.94 (0.79 / 0.75), the head's breadth 1.03
/ 0.97 (0.90 / 0.85), the face's height 1.18 / 1.02 (1.10 / 1.00; 1.37 / 1.22 held firmly). The faces' 2D proportions stay
below real (0.7-0.85: the real-face fits are ridge-shrunk, and a frontal render lacks the photographs' tilt), the heads'
measures are now real's. **The photograph's last steps tried and ruled out**: FairFace's images are 224 px JPEGs at
quality 75 (measured), the face filling the frame (207 px); ours brought to that size and saved so read the same ages (30-45
22.8, 45-58 28.0, 58+ 33.7 against 23.0, 28.2, 34.1) and sexes: the years our faces lack are in the faces, not in the
comparison.

**What the readers answer to (R4d, rounds 33-34, #114)**: `PeopleGateTests.AgeCues` renders the sample people at 35, 50 and
65 with one ageing cue pushed past real at a time; `apparent.py` reads them.

*The instrument first.* The gate's crop (0.6 of the face's box round it) reaches past FairFace's photographs, which end at
0.54 of a box side from the face's centre (each image is the face with FairFace's 0.25 margin, 224 px): the network saw real
faces framed in black and ours in the studio, its clothes and hats. Ours are now framed as the photographs frame theirs,
black past the same edges (`apparent.py framed`; `--no-frame` for the old reading). So read, ours are younger still at the
gate's crop (30-45 21.7, 45-58 25.7, 58+ 31.6 against 29.6, 37.2, 49.2) and women read as men 70 % (real 37 %); but in the
photograph's own frame, where the face fills the image and the network reads the skin's detail, ours read their years
(23.2, 24.0, 28.8, 39.1 against 22.6, 26.2, 29.5, 38.3; printed as a diagnostic). **Our skin carries its years; what reads
young is coarse: the head's and the soft tissue's shape, and the hair.** At the gate's crop, per cue (women / men at 65):
the lines at their deepest 28.1 / 36.3 (27.8 / 35.5 as drawn; at 35 they add 6-8 years), the aged bake whole and MakeHuman's
own ageing shape at seventy nothing, white hair 29.4 / 35.2, all of them 29.2 / 36.1: none of what we have makes a woman of
65 read older than 30 at that scale.

*The sex read is the hair.* Our sample women by hair, read as men at the gate's crop (in the photograph's frame): bun 80 %
(75), braid 77 % (65), crop 75 % (62), long matted hair 44 % (28); men with long matted hair read as women 69 % (85), buzzed
men 6 % (12). Hair round the face is what the network (and, on the boards, the eye: Ada Vey, Issa Lind, Mags Durrow) reads a
woman by; our grooming rule (buns, braids, crops: practical, and real) draws nearly all of it back from the face. Next,
inside the rule: the braid worn forward over the shoulder as working braids are, strands escaping buns and wraps round the
face (hair pulled back by people who work outdoors does not stay put), more long hair matted or tied low; then the coarse
years (the soft tissue's descent: jowls, the nasolabial fold's depth, the lids' hooding, the cheeks' hollowing, the neck),
each judged with `apparent.py` and on the boards.

**Strands loose round the face tried and reverted (rounds 35-36, `hair_strays_r35.jpg`)**: buns and braids with strands
escaped at the temples and in front of the ears (to the jaw's height, clear of a collar) for seven in ten women. As single
hairs (the wisp column) they did not show at a speaking distance and the read did not move (women read as men 71 %; loose
buns 87 %, plain 70 %); as clumps (the clump column, 5-7 mm) they showed as flat strips of tape, some across a brow or an eye.
A card cannot make a stray at this scale. The close-ups show the real defect plainly: **drawn-back hair renders as a thin
striped cap** (the shell's 2 mm lift, no volume over the crown or the ears, the strands' texture in hard stripes; blond as
yellow plastic), and with it the head reads as a man's in a cap to the eye as to the reader. Next: the drawn-back styles'
volume and shading (a real tied head of hair stands 5-10 mm off the crown and passes over the tops of the ears; its strands
shade into each other), judged in close-ups first, then measured.

**The drawn-back styles in close-up (round 36, `hair_drawnback_r36.jpg`)**: the crown braids (made from the Defender groom's
top, 300 cards) read as shingled feathers with pale streaks and two dark tufts at the temples; the bun as a smooth cap with
pale vertical stripes. The stripes are the shader's per-clump variation keyed to the layer's u, which folds round the head
in ten mirrored segments, and the pale streaks the strands' own light lifted by the recolour's detail term. A thicker layer
(3.5 mm), 260 finer locks and half the clump variation on the layer (tried, v35) changed little: a printed layer under cards
reads as a cap whatever its numbers. **Tied hair needs another technique**: tied styles made from a real groom as the loose
styles are (combed back to a knot or plait from the groom's own strands, cards that follow them), or hair-card assets chosen
by a bake-off on close-ups (the owner's pass 8: the best free assets, by evidence). Until then the sex read stays at women
as men 71 % (real 37 %).

**Pale flecks in every head of hair (round 37, `hair_sheen_r37.jpg`)**: the close-ups showed pale flecks over the crown of
every style and hanging hair gone grey. Isolated one term at a time with the hair rendered alone: not the texture (its opaque
texels even, its transparent ones darker), not the recolour, not the scalp; the hair's primary Kajiya-Kay band (near white,
0.16) lit the cards' small fragments. Only the band tinted by the hair stays, weaker (0.2): brown and dark hair now read in
their own colour with a faint strand texture. The readers did not move (women as men 71 %, 58+ 31.3; gate 246 of 252): they
read the head's coarse shape, not this. White hair still reads as a crocheted cap (owed with the tied styles).

**Where the coarse years are (round 38)**: real FairFace faces read at the gate's crop with the face's box blurred read about
20 at every age, and with everything but the face's box black read their years (46.5 at 58+ against 49.2 as they are): the
network finds the years in the face, not the hair, neck or clothes round it. Ours, the face alone, read 30.3 at 58+. In the
photograph's own frame (the face filling it) ours read their years; at the gate's crop (the face a third smaller) real faces
read older and ours younger: what reads age at that scale is the face's coarse form under the light, not its fine lines.
Probed on our portraits, each against 31.3 at 58+ as drawn: soft shadows a centimetre wide painted along the nasolabial
folds, the bags' lower edge, the marionette lines and jowls and the temples 35.1 (and +4 at 45-57); the eye whites dimmed to
real people's brightness over the skin (ours are brighter: women 1.42 against 1.17) 28.8, younger; with MakeHuman's own
ageing shape at seventy, white hair or the lines at their deepest (round 34) 1-2 years. **The years at a speaking distance
are the soft tissue's form**: the cheeks and temples hollowing, the folds deepening into grooves that cast shade, the lids
hooding, the jowls and the neck sagging. Our faces carry the real faces' outlines (fitted from frontal landmarks, R3), not
their depth, and the base's ageing shape is weak. Next: ageing in the head's form (blend shapes for the soft tissue's descent,
authored from measured ageing of real faces' 3D form, by age and sex), judged at the gate's crop with `apparent.py`.

**The soft tissue's descent as a shape (round 39, `face-years`)**: `tools/unity/people/face_years.py` authors it in the head
frame of the skin painter (eyes at ±0.36, 0.1 head radii; the mouth's line from the base's `joint-mouth`) and `mh_build.py`
adds it to both sculpt bases as the `face-years` shape key (every proxy refitted to it): the temples and the cheeks under
the bones hollow, the nasolabial groove deepens with the cheek's fat over it, marionette lines and jowls, the lower lid's
bag over the tear trough, the brow's tail and the upper lid descend, the neck's front loosens; at most 4.3 mm at full
weight (seventy-five), from the orders of the ageing literature (Coleman and Grover 2006; Shaw and Kahn 2007). Core's
`body-faceage` drives it from the years shown (from 35, whole by 75); `MeasureShapeResponses` measured it (3D: the face's
length +1.9 / +2.5 mm, the neck +5.5 / +10.5 mm; 2D: the face's width over height +0.013) and the response models were refitted
with every saved round. Read with `AgeCues` at the gate's crop, framed as FairFace frames its faces: at 65 women 30.2 and men
38.3 (27.8 and 35.5 as drawn before it), the full shape on every age 30.8 / 38.9; real 60-69 read 47.5. On the base head under a
raking light (`$scratchpad/fy`) the full shape reads as mild hollows and grooves, at twice its size as lumps and dents (a
caricature): its size stays. In the portrait studio's soft light the faces with and without it look alike.
**What else the reader answers to (2D probes on the AgeCues portraits and on 320 real faces, same crop)**: broad local
contrast on the face (an unsharp mask over 3 % of the face's box, the forms shaded harder) makes ours at 65 read 41.7 (34.2
as drawn) and real 60+ 51.3 (48.5): it amplifies what our faces' forms and painted lines carry, three times as much as on real
faces; the fine detail sharpened, low-frequency mottling or global contrast 0-1.5 years on either. Measured on the inner face,
the studio's light is near real photographs' (side-to-side fall 0.21 against real 0.19-0.22; the coarse band's spread 0.24-0.25
against real 0.27-0.28, with real photographs' far wider spread of light): the light is a small part of the gap, the face's form
the larger. The years at the gate's crop stay owed: the eyes' ageing (hooding over the crease, the lids' aperture), the
midface's descent at a larger scale than this shape's blobs, and the studio fitted to the photographs' spread of light.

**Tied hair from the groom's own roots, and the atlas that summed to white (round 39, `hair_tied_r39.jpg`)**: the bun and
the work braid are now combed from the Defender groom's real roots (`groom.combed`): every root of the Loose groom's scalp
layers follows its great circle over the skull to the gather point and stops at its rim, and the hair stacks as drawn-back
hair does (each strand on the ones rooted between it and the knot, the front's over the crown's), from 3.5 mm thick past
the hairline to 10 mm at the gather, down onto the skin at every root, rough as hair drawn back by hand (sections shifted
and lofted together, 40 flyaways); cards follow the clumps' mean courses (700 for the bun, 900 for the nape's tie). The bun's
knot is a rope of four twisted plies coiled flat and domed on the head (`coil`; 46 flat locks round a ring stood up as spikes
seen edge on); the work braid is gathered at the nape into a small knot and plaited. Measured on the base, the hair's outer
surface stands 6-7 mm over the crown and 3-4 mm over the ears (the old layer 2-3 mm). Previewed in Blender
(`$scratchpad/tied`) before the close-ups. Three defects found on the way, fixed: (1) **the strand atlas had summed to white**:
each strand was added without covering the ones under it and the sum divided by the alpha, so the sheet and clump columns
were 0.97-1.0 with a few dark strands (the recolour by luminance turned those into hard stripes; the wisps, few, stayed near
black); composited over, as designed, the strands are 0.37-0.51 (p50 0.43) and every hair and beard was rebuilt; the
shader's own per-strand and per-clump variation, which had made up for it, is halved; (2) **a grey band along every
hairline**: the scalp's root tint started 2-3 mm below the hair layer's first strands (`Skin.shader`, now from hair weight
0.28); (3) cards rooted 1.4 mm off the skin cut a hard contour at the hairline (now down to the layer at the root). An
experiment's hair version left in the build's cache (v33-35) made two builds reuse old hair: the version now goes past every
stamp. Gate round 39 (`gate_r39.txt`): 246 of 252; women read as men 73 % (71 before), men 14 %: the drawn-back hair, however
real, still takes the hair from round the face, which is what the reader (and the eye) reads a woman by. White hair still
stripes (lit and unlit cards; owed with the beards' shading), and a bald scalp's paler colour ends in a visible line.
