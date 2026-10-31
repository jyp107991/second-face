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
