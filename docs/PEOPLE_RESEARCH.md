# PEOPLE_RESEARCH — the best free pipeline for people (owner's pass 8, 2026-10-30)

The owner's bar: faces, hair and skin as varied and as coherent as BG3 / Cyberpunk 2077 / KCD2, skewed towards
attractive combinations; photorealism as far as a 2026 phone allows; eyebrows always; clear dimorphism; people who
look their age in a world where life is shorter; built from the best free resources available for Unity. This file
records what was looked at, what was measured, and what was chosen. Licences are quoted from the sources; the
attribution file (`docs/CREDITS.md`) lists what we ship.

## 1. Base bodies and faces (the generator)

| Candidate | What it is | Licence of the characters | Verdict |
|---|---|---|---|
| **MakeHuman 1.x / MPFB2** (current) | 13 380-vertex body, hundreds of targets (sex, age, ancestry macros; measures), community clothes and hair; textures 2K, dated | CC0 (system assets) | The base we have. Faces and skin are its ceiling: smooth, low-detail textures; the owner's "not real humans". MPFB2 (Blender 4.2+) is the same data with better Blender materials; it raises nothing in the engine. |
| **MB-Lab** | Blender add-on, good anatomy and phenotypes (Afro/Asian/Caucasian sub-phenotypes), 4K skins with age | **AGPL-3 on the generated characters** (the maintainer: not usable in closed commercial work) | Out. |
| **CharMorph** (MB-Lab's successor, Blender 4.4, GPL-3 code) with its CC bases | A character generator: base + morphs (.npz deltas) + textures + Rigify/ARP rigs; the generated characters carry the base's licence | per base, below | The tool is for Blender only; our build reads its data with our own loader (no add-on code runs in the pipeline). |
| — **Reom** (ComplexAce, mesh; Hope, morphs and textures) | 8 434-vertex game-ready body with eyes, mouth, teeth; 4K and 8K texture sets, Light and Dark skin base colours per region (face, torso, arms, legs), channel packs (normal/roughness/…), eye sclera/iris/cornea maps; 111 L2 morphs: ancestry (Black, Asian, South Asian ×8, Hispanic, Middle Eastern, White), age (baby, child, teen, body age), female, height, fat, muscle, breast, and anatomical face bones; 51 L3 ARKit expression shapes; 12 eyebrow styles (hair curves); Rigify and ARP rigs | **CC-BY** (config.yaml; the source thread to be confirmed) | The strongest candidate: a modern base with the controls the owner asks for (ancestry, age, sex, dimorphism) and skins that can carry a phone's skin shader. Evaluated by renders below. |
| — **Antonia** (Olaf Delgado-Friedrichs, 2008 Poser figure) | female base, 2K textures, morphs | CC-BY 3.0 | Older; a female-only alternative if Reom's female morph is weak. |
| — **Vitruvian** | added in CharMorph 0.4 | CC0 | Not in the database snapshot pulled (the release zip was unreachable from here); to look at when reachable. |
| **Blender Studio Human Base Meshes v1.4.1** | 17 CC0 meshes: realistic male and female bodies, animation and sculpt heads, eye, hand, skull, skeleton; clean quad topology with UVs; no textures, no morphs, no rig | CC0 | Excellent topology to sculpt on; building a generator on it (morph library, textures) is months of work. A fallback for custom hero heads. |
| **Mixamo** | ~30 fixed characters and the animation library | Adobe terms: usable embedded in a commercial game, not redistributable | Not a generator; the animations are already a source for motion. |
| Daz Genesis, Character Creator, MetaHuman | the industry's generators | paid interactive licence; MetaHuman's licence allows other engines since June 2025, but its downloads (Fab) need an Epic login we cannot automate | Out. |

## 2. Skin, eyes, hair, brows (the engine side)

- **Skin shader:** no free URP mobile skin shader of quality exists; ours is written: pre-integrated subsurface
  scattering (Penner; a curvature × N·L lookup), a dual-lobe specular, a detail normal for pores, the dye of the
  years (wrinkle normals blended by age), the sun and grime of the work. References: wingstone's pre-integrated
  SSS (built-in RP, the LUT method), DarkBlade909's skin shader (LUT SSS, dual lobe).
- **Eyes:** ours: cornea refraction (parallax on the iris), the limbal ring, a wet highlight, the caruncle; Reom's
  sclera, iris and cornea maps.
- **Hair:** cards of our own (P4.7) with better alphas: *Hair Alphas For Days* (OpenGameArt, CC0) as the strand
  alphas; an anisotropic (Kajiya-Kay) highlight in the hair shader; the grooming rule unchanged.
- **Hair from real grooms (P4.16, owner 2026-10-30):** the owner found the generated hairline awful and asked for the
  best free hair. The best free *grooms* for Unity are the strand hairstyles of Unity's own HDRP Defender character
  demo (TressFX, made by Unity's artists; educational and non-commercial use with attribution, which the owner's
  personal game is). Strands are too heavy for a phone's crowd, so they are turned into cards (`tools/unity/people/
  groom.py`): the hairline is measured from their roots (the shell's edge and the painted stubble follow it), their
  baby hairs and front wisps become fine cards along it, and the Loose groom's crown braids make `sf_braid`. MetaHuman
  grooms would be the next step up, but Fab's downloads need the owner's Epic login.
- **Eyebrows:** always: Reom's 12 brow styles converted to cards, and painted brows under them for distance.
- **Post:** ACES tonemapping over an HDR frame, grading, bloom on the brightest, vignette; SSAO on the mid tier.

## 3. Faces that cohere, and attractiveness

A random draw of forty sliders makes a face no one has. Faces are made from **archetypes**: per sex and ancestry
cluster, a library of coherent feature sets (bone structure, nose, lips, eyes, jaw as a whole) authored as slider
sets and checked in renders, then varied by a small amount per person, with symmetry kept and extremes avoided. The
skew the owner asks for: proportions near the canonical ratios, clear skin for the young, and the weathering of a
hard life laid on top by age and trade, never by deformity.

## 4. Age and life expectancy (lore)

Ninety years after the Burn, medicine is salvage and lore. The population's ages: median in the late twenties; few
past fifty; sixty is old and rare; seventy a wonder. Hard trades age the skin ahead of the years (sun, wind, want);
the megacity's rich age slowly and well. In the people model: the age draw per trade and place, the skin's age
= years + the hardness of the life, grey hair earlier, teeth and posture with it. (`Bodies`, P4.15.)

## 5. The base: verdict

Reom rendered with our own loader (`docs/evidence/unity/p4/research/reom_heads.jpg`: its own Light and Dark 4K skins,
the ancestry, female and age morphs at full weight, Cycles). Its skins are the best free skins found: pores, colour
variation, a real channel pack. Its morphs are not: the Asian and South Asian morphs barely move the face, and the female
morph leaves a man's jaw. And every garment we have (ninety and more) is fitted by MakeHuman's reference system to
MakeHuman's topology; a new base means refitting all of them by another method.

**Chosen:** the MakeHuman topology stays for v1, with what was missing built on it: the archetypes (§3, §6, Core `Faces`),
21 more face targets in the bases (the features MakeHuman's own ancestry, sex and age macros move, measured by
`tools/unity/people/face_probe.py`), brows, scalp and balding drawn by the skin shader. Reom's skin detail (CC-BY) is
the candidate for the skin's next step: its pore normal and colour variation baked across onto MakeHuman's UVs.

## 6. How ancestry, sex and age shape a look (the catalogue, owner pass 9)

The owner's rule: aesthetic diversity as it occurs in life along sex, ancestry and age, as probabilities, never as
rules or stereotypes; their examples (a woman's big jaw, a muscular man's gaunt face, a black man's very thin lips, an
Asian woman's blue eyes, each unlikely) were illustrative, not the list. The list, with where each lives in the code and
the test that holds it (Core `FacesTests`, `PeoplesTests`, `BodiesTests`):

| What | Ancestry | Sex | Age | Sources | Code |
|---|---|---|---|---|---|
| Nose: breadth, flare, bridge, projection, length, tip | broad, flared, low and short in West African; narrow, high, projecting in north European; low broad root, little projection in East Asian; a hump or convex line common around the Mediterranean and among indigenous Americans | a man's larger and longer | it lengthens and the tip drops | Farkas et al. 2005; Porter & Olson 2001 | `Faces.Ancestries`, `Woman`/`Man`, age terms |
| Lips: fullness, eversion, projection, the bow | full, everted, carried forward in African ancestry; thin and set back in north European; full in South and Southeast Asian | a woman's fuller, the bow defined | they thin; lines run from nose to mouth | Farkas 2005 | same |
| Eyes: fold, crease, opening, tilt, size | the epicanthic fold, a low or absent crease, a narrower opening tilted up in East Asian, less in Southeast Asian and indigenous American; large with a clear crease in South Asian; deep-set under a brow ridge in north European | a woman's larger and more open | the lids hood, bags form, the opening narrows | Le et al. 2002; Farkas 2005 | same |
| Brow ridge, brows' height and arch | strongest in north European men, least in East Asian | a man's ridge, low straight brows; a woman's higher, arched | the brows fall | — | same, and the drawn brows |
| Cheekbones, face width and length | wide and prominent in indigenous American and East Asian; high on long narrow East African faces | a woman's fuller and higher cheeks | the cheeks fall and hollow | — | `Faces.Structure`, `TypeShares` |
| Jaw and chin | broad in indigenous American; the jaw forward in West African | a man's broad, square and forward; a woman's fine, never past the sex's range | — | — | `Sculpt.Range` |
| Fullness | — | — | — | — | the body's weight in cheeks and chin; hunger hollows cheeks and temples; muscle keeps a man's face full (`Faces.Draw`) |
| Face structure (oval, long, broad, heart, angular) | long faces common in East African and north European, broad in East and Southeast Asian and indigenous American | the heart mostly a woman's; broad and angular more a man's (square, not round) | — | — | `Faces.Types` |
| Attractiveness | — | sex-typical features a little stronger on the striking | — | averageness and symmetry (Langlois & Roggman 1990; Rhodes 2006) | `Faces.Who.Attractive` (spread tighter, extremes cut) |
| Skin tone and undertone | the whole human range by people | a woman lighter than the men of her people from puberty | — | Jablonski & Chaplin 2000 | `Bodies.For` |
| Freckles | fair north European skin | — | — | MC1R: red hair and freckles together | `Bodies.For` |
| The skin's years | darker skin lines about a decade later; East Asian skin spots before it lines | a man's lines come first | a hard life ages it sooner, a sheltered one later | Vashi et al. 2016; Chung 2003; Tsukahara et al. 2013 | `Looks.SkinYears`, `Faces.Apparent` |
| Hair form | coily in African ancestry; straight and thick in East and Southeast Asian and indigenous American; straight to wavy in European; wavy elsewhere | — | — | Loussouarn 2007; De La Mettrie et al. 2007 | `Peoples.Texture`, `Bodies.HairStyle`: coily hair shaved, in a close crop of coils (`sf_coils`), cornrows (`sf_cornrows`), locks or braids, never the straight crop (`hairgen.py` v17) |
| Hair colour | fair and red only among north Europeans; of two peoples the darker mostly wins | — | — | — | `Bodies.HairShade` |
| Greying | first grey in the mid-thirties in Europeans, late thirties in Asians, mid-forties in Africans; slower after; fewer than a quarter half-grey at fifty | — | the beard before the head; the brows after | Panhard et al. 2012 | `Peoples.Grey`, `GreyShade`, `BrowShade` |
| Pattern balding | north European and Mediterranean men most (a sixth by thirty, half by fifty, four in five by seventy); Chinese and Korean men about half; African lower; indigenous American lowest | men; a woman's thinning is diffuse and not drawn | temples and crown first, the horseshoe never | Hamilton 1951; Norwood 1975; Wang et al. 2010; Paik et al. 2001 | `Peoples.BaldingChance`, `_Bald` in SecondFace/Skin |
| Beards | dense around the Mediterranean and in South Asia; sparse in East and Southeast Asian and indigenous American men (a moustache, a chin or nothing); kept short where coily | men | fuller with the years, grey first; red under brown hair among north Europeans | Lookingbill et al. 1991 (body hair and androgen metabolites, Chinese and Caucasian men) | `Bodies.For` beards, `BeardColour` |
| Brows | dense and dark in Mediterranean and South Asian; sparse in East Asian | a woman's finer and arched, a man's heavier and straight | a woman's thin, a man's grow bushy | — | `Looks.WomanBrows`/`ManBrows`, `_Brow*` |
| Eye colour | light eyes common only in north Europeans; recessive in two peoples | — | — | — | `Bodies.LightEyes` |
| Stature | north European and East African tallest, Southeast Asian shortest (a modest share of the real gaps) | — | a little lost after 45 | NCD-RisC 2016 | `Peoples.Stature` (centred on the Reach's means) |
| Childhood food | — | — | — | stature follows childhood nutrition (Bogin) | the destitute shorter, the comfortable taller |
| Limb proportions | longer limbs to the trunk in African ancestry; shorter legs to the trunk in East Asian and indigenous American | — | — | ANSUR II limb ratios (2024); Bogin & Varela-Silva 2010 | `Peoples.Legs` |
| Build | slender in East Africa (Nilotic), broad-chested among Andean and indigenous Americans | — | — | Allen's and Bergmann's rules | `Peoples.Frame` |
| Women's figures | straight most often among Asian women, pear and hourglass more often among Black and White women, the inverted triangle among Hispanic women; a fuller seat in West African | — | the waist thickens after the menopause | SizeUSA (Sohn & Kim 2026; Makhanya 2014) | `Peoples.Figures`, `Seat`, `Bust` |
| Fat distribution | on the belly at a lower weight in South and East Asians | a man's on the belly, a woman's on hips and thighs | more with the years | WHO expert consultation 2004 (Asian BMI) | `Peoples.Central` |
| Age of the population | — | — | a median in the late twenties, few past fifty (§4) | — | `Extras` ages |

**Known gaps, next:** a woman's diffuse thinning; age spots on fair skin in the sun; the eye's arcus and the yellowing
sclera of the old; longer coily forms (a puff, a full afro) under the grooming rule.

## 7. Evidence

Renders of the candidates and of the chosen pipeline: `docs/evidence/unity/p4/research/`.

## 7. A second search (owner, 2026-10-31): existing people to work from

The owner, after round 41: our faces are worse than The Sims 4's; find the best existing assets usable for a strictly
non-commercial game, no accounts. Found (web search, 2026-10-31):

| Candidate | What | Licence | Account | Verdict |
|---|---|---|---|---|
| **Microsoft Rocketbox** | 115 rigged people (adults of several ancestries and ages, professions, children); faces from photographs, 2K colour/normal/specular, four levels of detail, facial blend shapes (visemes, FACS, ARKit) | MIT | none (public GitHub, no LFS) | **Rendered in our studio beside ours** (`docs/evidence/unity/p4/research/rocketbox_vs_ours.jpg`): real people at once, ancestry, sex and age plain, under Unity's plain Lit material. The base to adopt. |
| **ICT FaceKit (light)** | a face model from ~200 light-stage scans: 100 identity shapes, 53 ARKit expressions, eyes, teeth, lashes | MIT | none | Real faces' shape variety, no skin: a later source of variety on top. |
| MetaHuman | the best | allowed outside Unreal since mid-2025 (reported) | Epic login | Out (no accounts). |
| Reallusion CC base; Ten24 / 3D Scan Store heads | good bases and scans | free / non-commercial | login or e-mail | Out (no accounts). |
| MB-Lab | a generator with phenotypes | AGPL (fine for non-commercial) | none | Below Rocketbox's photographed faces. |
| Unity *Enemies* | one top-end head | Asset Store EULA | Unity login | HDRP, one person: out. |

Rocketbox evaluation: four people (`Female_Adult_03`, `Female_Adult_07`, `Male_Adult_05`, `Male_Adult_12`) imported by a
scoped postprocessor (`RocketboxImportPostprocessor`; Rocketbox's own is project-wide and is not used), their 3ds Max
materials bound by name (`PeopleGateTests.RocketboxProbe`). Owed: the hair's alpha (blue fringes on the long hair), the
clothes (modern, baked into the body's texture: to re-dress or re-texture by the wardrobe rule), variety past 115 faces,
and the character creator on a fixed-face library.

**The owner's decision (2026-10-31): Rocketbox's faces are the base, with substantial but realistic customisation on top.**
RB2, the sculptor on a real face (`tools/unity/people/rocketbox_sculpt.py`, Blender): our base head is fitted to the
Rocketbox head by nine landmarks (the eyes from the eye bones, nose tip, lips, chin, ears, crown, back: 1-19 mm apart after
a similarity, a thin-plate warp closes them), each Rocketbox vertex of the head (skin and hair) is bound to the closest
point of the warped head, and each of our sculptor's shapes (139 face shapes) is carried across as a Rocketbox shape
key. First result (`docs/evidence/unity/p4/research/rocketbox_sculpt_f07.jpg`, each shape at its full reach): the nose's
width, the lips, the mouth's width, the jaw, the cheekbones and the face's length move the real face and it stays a
person; at full reach the jaw and the long face go too far and the chin's skin stretches (natural ranges, as ours). The
eyes' size barely moves (Rocketbox's eyes are in the head's mesh).

**The sliders' reach from the library itself (owner, 2026-10-31: no slider may make a face no one has; the young against
the old say what the years do).** `rocketbox_register.py` fits our template head onto each of the 110 Rocketbox heads
(nine facial landmarks a fringe cannot cover, a thin-plate warp, then projected onto the skin and smoothed: a median 3 mm
from it), so every face is the same vertices; `rocketbox_template_keys.py` exports the sculptor's 139 shapes on those
vertices; `rocketbox_calibrate.py` expresses each face's front in the shapes (non-negative least squares with a light
ridge; shapes that barely touch the front left out; the shapes explain 59-63 % of how the faces differ) and writes
`tools/unity/people/data/rocketbox_calibration.json`: per sex each slider's spread across the library (its reach, [2.5,
97.5] %), each face's own place on every slider (so a face moves only as far as the library's furthest face in each
direction), and each slider's change per year (ages judged by eye, `data/rocketbox_ages.json`; 14 of the 110 are past 50,
one of them a woman, so the years are pooled across the sexes with a sex offset). The reach is about ±1 for the lips,
±0.3-0.5 for the nose's width, 0.6-1.2 for the jaw; the years over a decade: the mouth wider (+0.14), the cupid's bow
softer, the face fuller (+0.09), the cheeks under the eyes hollower (-0.13), a double chin (+0.28). Rendered at the
library's own ends from where each face sits (`docs/evidence/unity/p4/research/rocketbox_calibrated_extremes.jpg`): every
end is a person.

**Each major feature calibrated on its own (owner, 2026-10-31: "these chins are still ridiculous"; "each major feature
should be distinctly calibrated").** The joint fit above let one slider soak up what others did (the chin's shapes took
the throat's and the fold's differences) and its reach came out wide. It is replaced by measurement, feature by feature,
in millimetres, on each head's own mesh with no fit in between (`rocketbox_surface.py` exports the 110 heads' exact
triangles in their eyes' frame; `rocketbox_features.py` measures them):
- *The profile* is the plane cut down the face's middle; its turning points are found the same way on every head: the
  nose's root (deepest point between the brows), tip (front-most), base (where the columella's underside turns down into
  the lip), the upper lip (front-most), the mouth's line (the deepest notch between the lips), the lower lip, the fold
  under it, the chin's front and the chin's bottom (the last height before the profile jumps back to the throat).
- *Widths* from horizontal cuts: the nose's wings (where the front falls back most steeply from the wing to the cheek),
  the mouth (the notch between the lips followed outward, cut by cut, until it ends), the cheekbones and cheeks (across
  the face's front at a set depth: the sides only widen on back to the ears), the jaw (widest in front of the ears below
  the mouth, and a third of the way up from the chin), the chin across its front.
- *What a slider does* is measured the same way on the four heads carrying the sculptor's shapes (each shape at full
  weight: the profile's points followed on the skin, the widths cut again at the same heights); the four agree within a
  few tenths of a millimetre on most sliders. Measuring them showed the old transfer had pinned only the chin's front: on
  the men the chin's shapes moved the throat. The transfer (`rocketbox_sculpt.py`) now pins all of the measured anatomy
  (28 landmarks: the profile's nine, the nose's wings, the mouth's corners, the cheeks, the jaw, the chin's sides), and
  the chin's shapes act on the chin on every head.
- *The library's spread* per sex is each feature's [5, 95] % across its heads (38 women, 72 men; outliers past 3.5 robust
  deviations set aside); *each face's limits* on each slider are as far as that slider can go before its feature leaves
  the library's spread from where this face is (never past one unit), so a face already at the library's longest chin
  cannot lengthen it at all. Eye size and spacing do not vary in the library (every head of a sex shares its eye sockets):
  their spread is the published one (between the pupils SD 3.8 mm, Dodgson 2004; the eye's opening SD about 1.5 mm, Farkas
  1994), ±1.645 SD from each face.

What the numbers say (`tools/unity/people/data/rocketbox_features.json`): one unit of chin-height adds 21.5 mm to the
chin (mouth line to chin bottom), while the library's women differ by 5 mm across their middle 90 % (39-44 mm; men 43-56
mm): a woman's chin may lengthen by a tenth of a unit and shorten by a third, which is why every chin at a "natural"
half unit looked absurd. Likewise chin-width 19 mm per unit against a spread of 12 mm, cheek fullness 17 mm against 13,
jaw-forward 7 mm against 5, while the nose's sliders (5-9 mm per unit against 8-12 mm of spread), the lips' (2-4 mm against
3-6) and the mouth's width (10-13 mm against 16) keep most of their unit. Several sliders act on one feature (the chin's
projection by chin-prominent and chin-prognathism): Core's `RocketboxSculpt.Clamp` holds any set of values so that their
summed change of every feature stays inside that head's room (data generated into `RocketboxSculptData.cs` by
`rocketbox_gen_core.py`; `RocketboxSculptTests`). Rendered at every limit on the four sculpted heads
(`docs/evidence/unity/p4/research/rocketbox_limits_{chin,nose_mouth,cheeks_eyes}.jpg`, by `rocketbox_limits_sheet.py`):
every end is a person; the chins differ as real chins do, no more. Twenty sliders are calibrated so far (the chin and jaw,
the nose, the mouth and lips, the cheeks, the brow, the eyes); the rest (the head's outline, ears, neck, lids, the nose's
tip and bridge width, the mouth's corners) keep their unit until they are measured the same way.

**Widened to real people's spreads where the library is narrower (owner, 2026-10-31: "B, but be sure and evidence based").**
Where a published measurement has the same landmarks as one of ours, its adult spread by sex widens that feature's range
(`tools/unity/people/data/published_face_norms.json`, each entry with its source and why its landmarks match ours):
- *3D Facial Norms* (Weinberg et al. 2016, Cleft Palate-Craniofacial J 53:e185; FaceBase summary statistics, 3D
  stereophotogrammetry of adults of European ancestry, pooled here over ages 18-40: about 640 men and 1,200 women per
  measure; `data/tdfn_adult_pooled.json`): nose length n-sn, nose width al-al, mouth width ch-ch, upper vermilion ls-sto,
  philtrum sn-ls, lower face sn-gn, face height n-gn, eye opening en-ex, and a lower bound on the eyes' spacing from en-en and
  ex-ex.
- *Arnett et al. 1999* (Am J Orthod Dentofacial Orthop 116:239, Tables I-II; cephalograms in natural head position, 26
  women and 20 men chosen as facially balanced, so their spread understates the population's): the lower lip to the chin's
  bottom (our chin length; its sd is also bounded from below by the 3D norms' sn-gn and sn-sto), the chin ahead of the fold
  under the lip (B'-Pog'), the chin ahead of the nose's base (Pog' to the true vertical through subnasale).
- *The rule, so that nothing is widened on a guess:* an end of a range moves out only as far as both readings of the study
  agree: the nearer of (the library's median ± 1.645 sd) and (the study's mean ± 1.645 sd), and never inward of the
  library's own [5, 95] %. The first reading allows for our landmarks sitting a few millimetres from the study's (found by
  the mesh's shape, not by palpation or on X-rays; Arnett's are not corrected for magnification); the second keeps every
  end inside the real people's own 5th-95th percentile. Features without a matching published measurement (the lower lip's
  height, whose front-most point is not the vermilion border; the nose's projection; the jaw, cheekbone, cheek and chin
  widths; the lips' and brow's projection; the bridge) keep the library's range.
- *Result:* the women's chin may lengthen to 45.8 mm (from 43.7), come forward of the lip fold to 3.1 mm (from 2.0) and of
  the nose's base to -1.9 mm (from -3.0); the women's mouth may narrow to 42.3 mm (the library's median and the 3D norms'
  mean agree at 48.0 mm); the men's nose may lengthen to 62.3 mm; the upper lip widens a little both ways. Slider ends with
  no room fall from 197 to 167 (women) and 227 to 224 (men). Rendered: `docs/evidence/unity/p4/research/rocketbox_limits_widened.jpg`.

**Who the library covers (owner, 2026-10-31: "do we have enough as a base to cover all ancestry/sex/age combinations, with
enough diversity within each group?").** No. Its 111 people, by ancestry judged by eye from the face textures
(`data/rocketbox_ancestry.json`; the library ships no labels; ages from `data/rocketbox_ages.json`): 64 north European, 9
Mediterranean or Middle Eastern (8 of them unsure: soot, beards), 10 possibly Latin American (all unsure), 8 East Asian, 6
West African (5 of them men), 1 possibly Southeast Asian, none South Asian, East African or Indigenous American; 6 unsure, 5
without a readable face, 2 masked. One woman is past 50 (no woman of colour is); every face past 50 is a north European
man; no children. An independent count agrees on the skew (over 40 % are white men: Do et al. 2023, Frontiers in Virtual
Reality 4:1248915). In the game's 9 ancestries x 2 sexes x 3 age bands (under 30, 30-49, 50+: 54 groups), 7 groups have three or more
certain faces, 41 have no certain face and 37 no face at all. Within north Europeans the women are close variants (every woman of the female skeleton shares its
eye sockets and face bones). What could fill it, all without accounts:
- *VALID* (Do, Zelenty, Gonzalez-Franco, McMahan 2023; MIT; github.com/xrtlab/Validated-Avatar-Library-for-Inclusion-and-Diversity---VALID):
  42 base faces, 7 groups (Indigenous American, Asian, Black, Hispanic, Middle Eastern and North African, Pacific Islander,
  white) x 2 sexes x 3, each perceptually validated for race and sex by 132 people from 33 countries (labels in its
  `Validated-Labels.csv`); built from averaged photographs in Autodesk Character Generator, so possibly less photoreal than
  Rocketbox's photographed faces, young adults only, no South or Southeast Asian. To judge by eye beside Rocketbox before
  adopting (a render bake-off, as for Rocketbox).
- *New people from real ones of the same group:* every Rocketbox head is already registered to one layout; a new face can
  be a blend of two or three real faces of the same ancestry and sex (shape and texture), then the calibrated sliders, so
  every feature still comes from real people of that group and no two people of a place share a face.
- *Age:* ageing from the library's older men and from published ageing measurements, since the library has almost no
  older women.

**VALID against Rocketbox, consistency first (owner, 2026-11-01: "use VALID, compare consistency first").** VALID's
35 validated faces (one outfit each: all but its two unvalidated Pacific Islander women) measured exactly as Rocketbox's
(`rocketbox_surface.py` now reads VALID's HumanIK rig and one-material bodies; `valid_compare.py`, results in
`data/valid_compare.json`) and rendered in one Blender studio with Rocketbox's four textured people (`studio_render.py`:
same three lights, grey world, camera on the eyes; `docs/evidence/unity/p4/research/valid_vs_rocketbox.jpg` and
`valid_all.jpg`).
- *Build:* VALID's people come from Autodesk Character Generator: one 21,000-vertex mesh and one 2K texture for the whole
  person (face, hands, clothes, teeth: the face gets about a fifth of it, half Rocketbox's detail across), hair as a solid
  textured shell, 66 expression shapes, a HumanIK skeleton (84 bones; Rocketbox's is a 3ds Max biped: both retarget as
  Unity humanoids). Rocketbox: a 2K texture for the head alone, hair as alpha cards, about 1,500-2,000 head vertices
  (VALID's head about 6,700).
- *Proportions:* mostly in the same range as Rocketbox and the published norms (chin length and projection, lips, face
  height, jaw: 94-100 % of VALID's values inside the calibrated ranges); systematic differences: noses project 3 mm less,
  women's mouths are 6 mm wider than Rocketbox's women and the 3D norms' (54 against 48 mm), and VALID's women are as wide
  across the cheeks as its men (135 against 136 mm at the same cut; Rocketbox 124 against 134, real bizygomatic widths 130
  against 138): weak sexual dimorphism in the face's width. Matched by ancestry (White against Rocketbox's north
  Europeans, Black against West Africans, Asian against East Asians) the offsets hold within each group.
- *Individuality:* VALID's faces are each an average of 4-7 photographs (its paper), and averaging takes out what makes a
  face one person's. Two VALID faces of the same group and sex differ by 0.26-0.63 of what two real people do (mean
  pairwise distance over ten features in units of the published sd, against its value for independent real people);
  Rocketbox's north Europeans 1.04 (women) and 1.43 (men), its other groups 0.64-1.21. Across all seven groups VALID's
  cheekbone width spans 4 mm, its mouth width 4 mm (one group of real people: about 11 mm).
- *By eye* (same studio, `valid_vs_rocketbox.jpg`, `valid_all.jpg`): Rocketbox reads as photographed people (skin
  detail, asymmetry, age); VALID as game avatars: smooth, symmetric, all in their twenties, the women of a group like
  sisters, hair as solid shells, one face smeared where the photographs were averaged (Black_M_1's jaw). Its ancestry cues
  are clear and varied across groups (the reason it was validated).
- *Verdict:* not consistent enough to stand beside Rocketbox as people: in one crowd they would read as two art styles,
  and inside each group as look-alikes. What VALID does give that nothing else free does: validated, ancestry-typical face
  shapes for groups Rocketbox lacks (Indigenous American, Pacific Islander, more Black women, Asian men and women, Middle
  Eastern women). Proposed use: its group shapes only (geometry, as an ancestry direction in the registered layout), put on
  Rocketbox's photographed heads and skin, each person then spread around that centre by the real people's measured spread
  (the published sds), never VALID's own skin, hair or bodies.

**Harmonising VALID into Rocketbox's house style (owner, 2026-11-01: "take details from VALID that fill in archetype
gaps and increase diversity across and within groups, while keeping the house style of Rocketbox").** Everything seen
stays Rocketbox's: its photographed heads and skin detail, its hair cards, bodies and clothes. VALID gives one thing:
- *Its groups' differences.* VALID's 35 people share one mesh (20,951 vertices), so each validated group's mean face per
  sex is exact (`valid_groups.py`; validated labels from VALID's `Validated-Labels.csv`, its unvalidated faces left out).
  A difference of two groups' means (Indigenous American women less White women) keeps what tells the groups apart and
  cancels what VALID's construction does to every face alike (the averaging, the shallow noses, the wide women's faces).
  Averaging photographs removes individuals' differences, not groups': the group difference is what averaging keeps. Its
  size: 2-4 mm on average over the face (up to 7-12 mm at the nose, lips and cheekbones); a VALID face differs from its
  own group's mean by under 1 mm.
- *Carried onto a real Rocketbox head* (`harmonise.py`): VALID's source-group mean fitted to the head by the same
  anatomical landmarks on both (`rocketbox_features.Face`; the nose's wings left out where either side's detection runs
  onto the cheek), a similarity and a near-interpolating thin-plate warp (landmarks met within 0.5 mm), each Rocketbox
  vertex bound to the closest point of the warped mean and the difference carried across. Kept to the face (faded out
  below the chin, above the brow and behind the cheeks, since VALID's skull carries its hairstyles' bulk), never on the
  eyeballs (Rocketbox's are separate islands of the head's mesh), with each eye's surroundings held so the lids stay
  centred; applied to the mesh and every shape key, so the calibrated sculptor still works. The head keeps its own
  individual form: two people made from two heads differ as real people do, and they share the target group's typical
  one.
- *Retoned* (`retone.py`): skin to the target people's measured cheek (Core SkinColour at Bodies.Tone and Undertone),
  put on Rocketbox's own texture scale by a line per channel fitted on the library's faces of the peoples it has
  (`data/rocketbox_cheeks.json`: its textures run about 7-10 L* above the measured cheeks of the same peoples at the
  fair end and match them at the dark end), keeping half the head's own difference from its people; each texel by how
  much it is skin, so the lips follow partly and the eyes' whites, clothes and hair stay. Hair cards and painted brows
  and hairline to the people's hair colour (Core Looks.HairColours), irises to dark brown where the people's eyes are
  dark (Core Bodies.LightEyes). Pacific Islanders have no measured tone in Core: they take the Southeast Asian one until
  a measurement is found.
- *First set* (`docs/evidence/unity/p4/research/harmonised_v1.jpg`: four Rocketbox people, nine new ones): every result
  stays in the house style and reads as a real person; skin, lips, hair and eyes retone convincingly where the jump is
  moderate (north European to Mediterranean or Indigenous American, East Asian to Latin American or Indigenous American,
  north European to East Asian or Pacific Islander). The face shapes move as VALID's groups differ (2-5 mm on average,
  up to 12 mm), which reads as the group's character on top of the person's own form, not as a new person. Two limits:
  (1) large jumps keep the base's own group's cues and read as mixed ancestry (a north European woman made Black keeps her
  narrow nose and thin lips under a widened nose; a West African man lightened to Latin American looks chalky and ashy:
  lightening a dark photograph lifts its shadows into grey); (2) on dark skin the eyes' whites glare. So: each new person
  starts from the Rocketbox head nearest the target (by group and skin), never lightens a dark texture by more than a
  third, and dims the eyes' whites with the skin.
- *Recipes per people, with their evidence (owner, 2026-11-01: "you can't make Latin Americans just a variant of Black";
  `people_recipes.py`).* Latin Americans are a mixture of Indigenous American, European and African ancestry in the
  proportions measured per country (Ruiz-Linares et al. 2014, PLoS Genet 10:e1004572, CANDELA, 7,342 people, Table 1,
  American / African / European: Brazil 0.09/0.09/0.82, Chile 0.48/0.05/0.49, Colombia 0.29/0.11/0.60, Mexico
  0.56/0.05/0.37, Peru 0.64/0.00/0.29; urban, student-heavy samples, so lean European): each person draws a country and
  their own proportions around its mean, takes VALID's Indigenous American, White and Black shapes in them, and the
  matching mixture of skin tones (the European part Iberian: Core's Mediterranean tone); bases are Rocketbox's own Latin-
  or Mediterranean-looking people, never a Black base. East Africans (the Horn) take VALID's Black shape with 25-45 % of
  its Middle Eastern one (Pagani et al. 2012, AJHG 91:83: some Ethiopians carry 40-50 % of their genome closer to non-
  African, Levant-like populations). Indigenous American, Middle Eastern (the game's Mediterranean), West African and
  East Asian take VALID's own validated group; Southeast Asian takes VALID's Asian group with Core's Southeast Asian tone
  (VALID has no Southeast Asian group: a gap); Pacific Islander men take VALID's NHPI (no woman validated). South Asians
  are not made: neither library has a validated source.
- *Bases:* the Rocketbox people of that sex whose group (judged by eye) is nearest the target, in a set order per target
  (`people_recipes.BASES`), each base used once per people (so no two of a people share a face), never lightening a dark
  photograph by more than a third.
- *Bases with headgear or a beard* (QA, first large set): many of the library's people in uniform wear helmets, hats or
  masks (`data/rocketbox_gear.json`, from the textures they ship with), which hide the hair; such a person is never a
  base. A bearded base keeps its beard (painted in its texture), which reads Mediterranean on a would-be Indigenous
  American or East Asian man, so bearded bases are left out for peoples whose men's beards are sparse; a woman in a
  hijab and a man in a skullcap are bases only for their own people. With these rules the library offers two bases for
  Black women (both Latin-looking): a gap to fill another way.
- *The nose's width corrected* (QA): the wing detection took the widest candidate over several heights, which on 25
  heads (mostly women) was the cheek's edge (Female_Adult_07 at 50 mm). It now takes the most distinct wing edge at
  least 12 mm out and no more than 20 mm behind the nose's base; the library's women's noses now span 28.8-36.0 mm
  across their middle 90 %, as the 3D Facial Norms' adult women do (28.8-36.4), the men's 32.1-42.1 (norms 31.8-40.4).
  The calibration and Core's data were regenerated.
- *QA at scale* (owner: "show me much more"): `harmonise_batch.py` makes six people per people and sex from distinct bases
  (88 in all), `studio_render.py` renders them and the whole library as it ships (114 people with textures, children
  included), and 20 more people across groups, sexes and ages at their calibrated slider limits; `qa_sheets.py` lays them
  out (`docs/evidence/unity/p4/research/qa_*.jpg`).
- *The studio* (`studio_render.py`) was overexposed (a fair cheek at L* 87, which flattened every difference in skin);
  now 1.5 stops down (fair about 75, dark about 50). The VALID comparison sheets above were rendered before the fix.
- *Shared faces* (QA: identical slider limits on different people; `rocketbox_identities.py`,
  `docs/evidence/unity/p4/research/rocketbox_shared_heads.jpg`). Rocketbox dresses some faces more than once: one woman's
  face is a businesswoman, a pilot and a soldier; many builders are men of the library in hard hats. Two people whose every
  measured feature lies within 1.5 mm are one face (distinct faces differ by 2 mm or more in some feature), confirmed by
  eye: 48 people share 21 faces, so the library holds **83 distinct adult faces** (31 women's, 55 men's: a few faces are
  dressed as both), not 110. A face is one base: its uses are counted together, and its labels by eye agree.
- *What the library holds, by distinct usable face* (no headgear that stays on, no full mask; by eye): north European 19
  women and 23 men; Mediterranean 1 woman and 5 men; Latin American 2 and 2; East Asian 3 and 3; Southeast Asian 1 woman;
  Black 1 woman and 2 men (with Military_Male_01, whose helmet and goggles now come off). Everything beyond north European
  is thin, and Black women and Southeast Asian men are nearly absent. This is why VALID's shapes are needed at all, and
  why most new people of the thin groups start from a north European face.
- *Bases by nearness* (`harmonise_batch.plan`): every people first takes the faces of its own people, then the
  next-nearest people's in its order (`people_recipes.BASES`), the scarcest peoples choosing first at each step; a face
  serves at most two peoples, only two close to each other (West and East African; East and Southeast Asian, Indigenous
  American and Pacific Islander; Latin American and Mediterranean), each time with its own draw of the calibrated
  sliders (up to half of each slider's reach). East Asians are not made: the library has its own, and they are the
  nearest faces for three peoples it lacks. Black Africans take European faces only last.
- *Gear off* (`rocketbox_gear_off.py`): a helmet or hat modelled as its own material comes off and leaves the face and
  hair whole on most soldiers and some builders and firefighters (`data/rocketbox_review.json`, 'gear_off'); goggles
  pushed up on a helmet are their own loose piece in the head's material and go with it (every loose piece lying wholly
  above the brow, hair cards apart). Balaclavas, sunglasses, caps modelled in the head and most firefighters' face shields
  are part of the head (tried on six).
- *The eyes, lids and hair, corrected* (QA of the first Black people made from European faces): (1) the irises stayed
  blue: they were found by colour, and a blue-grey iris has too little chroma; every Rocketbox eye shares one texture
  layout (pupil within 0.09 of the eye island's half-width, iris to 0.30, measured on light and dark eyes alike), so the
  iris is now found by place and given a dark brown taken from the library's own brown irises (L* 12-27, a* 8-11,
  b* 8-14), keeping its pattern and catchlights; each person draws dark eyes or their base's own by their people's
  light-eyed share. (2) An old man's grey brows went black under a white beard: painted hair now keeps its lightness
  against the head's own hair cards (a grey brow under dark hair stays lighter than the hair), and grey hair cards stay
  grey. (3) The lash lines and lid creases were painted as hair (eyeliner): the lids and orbits (texture boxes from the
  mesh around each eye) are now skin through and through. (4) A light skin's paler, yellower orbits stayed pale on the
  darkened skin: going darker, the skin's own variations of hue shrink towards its cheek's, and the lids darken a little
  (periorbital hyperpigmentation is more common in darker skin: Sarkar et al. 2016, J Clin Aesthet Dermatol 9:49).
  (5) On darker skin the whites of the eyes are a little dimmer and warmer, as conjunctival pigment is common in darkly
  pigmented people (complexion-associated melanosis). (6) Staring eyes: the eye-scale slider widens or narrows the lids'
  opening round an eyeball that keeps its size, and VALID's difference moved the lids too; people's own slider draws leave
  the eyes' size alone, and the groups' difference fades out from 26 mm to 15 mm from each eye's centre (the lids keep
  their own shape; it also removes white slivers at the outer corners where the lids parted from the eye). (7) Blonde
  kept as if grey: light, colourless hair is grey only on a base judged 55 or older (the owner's rule for grey hair);
  younger light hair is blonde and takes the people's colour; and as part of a Rocketbox head's hair is painted on the
  scalp, lighter than the skin, where no retone can tell it from skin, a base with blonde or light brown hair
  (`rocketbox_hair.py`, `data/rocketbox_hair.json`: 13 people) serves only a people whose hair is light. (8) Eyeballs missed on one head: found by the island's
  centre (within 12 mm of the eye) rather than its farthest vertex, which a slider draw can push past 20 mm.
- *What VALID carries, measured* (`data/valid_compare.json` against `data/rocketbox_features.json`): VALID's Black
  against White means widen the nose by 8.3 mm (women) and 8.8 mm (men) and lower its projection by 2.5-4.2 mm, as
  Rocketbox's own Black faces differ from its north European ones (nose +6.5 and +4.2 mm, projection -4.3 and -4.2 mm);
  but VALID's Black avatars have thin upper lips (6.8 mm against 7.6 for its White women) and lips barely more forward,
  where Rocketbox's photographed Black men have upper lips 2.2 mm fuller and lips 3.9 mm more forward than its north
  European men. So a European face made Black takes the nose but not the lips: the people made that way read as darker
  Europeans or of mixed descent. The fix proposed: the lips' difference from Rocketbox's own groups (and published
  vermilion norms) as a bias on that person's slider draw, and hair cards from the library's own Black people moved
  onto the new head (the straight European hair is the other strong tell).
- *QA at scale, the verdict by eye* (2026-11-01, sheets `docs/evidence/unity/p4/research/qa_library_*.jpg`,
  `qa_sliders_*.jpg`, `qa_harmonised_*.jpg`: the library as it ships, the sliders at their limits on 15 more faces, and
  60 harmonised people in seven peoples beside the faces they come from). Working: every new person stays in the house
  style; skin, irises, brows and hair take the people's colours with no blonde, blue or black-browed leftovers; no staring
  eyes; Latin Americans come from Latin, Mediterranean and European faces in CANDELA's measured mixtures, never from a
  Black one; Mediterranean people (two in hijab, two in keffiyeh) and Southeast Asians from East Asian faces read true.
  Not working: (1) a face serving two related peoples (West and East African; Indigenous American and Pacific Islander or
  Southeast Asian; Latin American and Mediterranean) gives two people who look like one: half a slider draw does not make
  a new person, so a face should serve one people only (fewer people where the library is thin); (2) Black people from
  European faces (the nose, not the lips, not the hair: above); (3) Pacific Islander men from East Asian faces read East
  Asian (VALID's NHPI difference is small on these heads); (4) Business_Female_02's glasses texture is missing from the
  export (they render magenta).

**The skin's years from the library, first attempts (2026-10-31).** Each face's texture resampled into the template's
layout through the registration (`rocketbox_skin_years.py`), and baked back into one face's own layout through its own
triangles (`rocketbox_head_map.py`, seam-safe). (1) The per-texel change with age, regressed over the 78 faces without soot,
masks or beards (9 past 50, one a woman): aligned, but weak and patchy (blocks at the lids where the registration is
loosest, stray creases): an average of the old washes their lines out, each in its own place. (2) One real older face's fine
detail carried across (`rocketbox_age_donor.py`): the donor's hairline comes onto the forehead and her lines are faint.
The library's older faces read older mostly by their form (the jaw, the cheeks, the lids), their tone's unevenness and their
hair, little by the texture's fine lines at this resolution: the years go in as the measured shape change (the calibration's
slopes), the tone's change by region, the greying, and the donor's detail masked to the skin away from the hairline,
lids and lips; judged in renders before any of it ships.
