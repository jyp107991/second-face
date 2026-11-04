# The people realism gate (binding, owner 2026-11-03)

The owner: "you have worked in such a ruleless, standardless way that you repeatedly make the same mistakes ... they are
all realism checks". This is the standard every made person passes **before the owner sees it**. A person that fails any
item is fixed or dropped, never sent with the fault unnamed. The bar is Rocketbox's own heads as shipped: real
photographed people, the game's house style. Measures are taken against them, never against a number of our own.

## 1. Procedure (every person, every round)

1. **Build** (harmonise_batch.py). Only from a Rocketbox base or a real scan; nothing painted or modelled from scratch.
2. **Measured gate** (automatic, in the batch: `qa_map.py` → `qa_realism.py` → `qa_gate.py`): the head's texture read as
   the face is seen (straight on, 0.4 mm a pixel) and measured against the same measures on 27 shipped Rocketbox heads
   (`tools/unity/people/data/qa_reference.json`). The verdict and a map of what was measured (skin read, regions, steps
   and specks found) are written beside the renders (`<name>_qa.json`, `<name>_qa.jpg`). A FAIL stops the person.
3. **Renders** at 250 % (1280 × 1600): front, three-quarter and profile, in the one studio (`studio_render.py`).
4. **The look** (by me, every crop, at full zoom, before sending): the checklist in §3, answered item by item in
   writing, beside the base as shipped and, for a new face, beside a real photograph of the same people, sex and age.
5. **Send** single versions only, one person per image, with any flaw that remains named in the caption.

## 2. Measured items and their limits

Each limit is the shipped heads' 95th percentile with a tenth more (lower is better), unless stated.

| Measure | What it catches (owner's words) | Limit |
|---|---|---|
| tone_spread: largest gap of median L* between forehead, temples, cheeks, nose, chin | "uneven skin tone plagues all your new Black people" | shipped p95 × 1.1 |
| side_diff: left against right temple, cheek | a pale temple, one-sided patches | shipped p95 × 1.1 |
| blotch: L* spread between 4 and 25 mm | patchy, "leathery" skin, "grafted on like a mask" | shipped p95 × 1.1 |
| seam: longest sharp tone step on skin away from the face's own features | "face/hair seams", graft borders, square patches | shipped p95 × 1.1 |
| detail: skin grain above 1 mm | plastic skin ("a plastic doll") or noise and dirt | within shipped p5 × 0.9 to p95 × 1.1 |
| specks per 10 cm² | "white flecks" at hairlines and on skin | shipped p95 × 1.1 |
| eye_ring: L* step from the lids' ring to the skin beyond | "eyes pasted on to an eyeless face", a grey band over the eye | shipped p95 × 1.1 |
| beard_edge_grad: hardness of a beard's boundary | "facial hair like blocks misplaced on faces" | shipped bearded men's p95 × 1.1 |
| beard_high_frac: beard-dark skin just under the eyes | a beard patch where none grows | shipped p95 × 1.1 |
| hairline_trg_mm: trichion's distance from the glabella | "sits too high" | men 52-64 mm, women 49-62 mm (Kenyan and African American norms, 61 ± 3 mm in men) |
| hairline_wobble_mm, hairline_tilt_mm (short hair) | "random vertices", "two perpendicular lines" | 2.5 mm each (straight and level) |

## 3. The look: checklist (each answered for each person)

**Skin**: one even tone across forehead, temples, cheeks, nose, chin and neck; no patch lighter or darker than the base
has; no seam or square anywhere (forehead top, temples, jaw, neck, ears); grain like Rocketbox's (pores, not plastic, not
noise); no flecks; no coarse facet showing as a pale sheen on bare skin (receding corners on capped heads).

**Features**: from a real person (a Rocketbox base or a scan), sliders only within the face's calibrated limits; the
face reads as its ancestry, sex and age (no woman's jaw on a man's face, no feature from another people); eyes where the
person's own sit, lids and crease continuous with the skin, no doubled folds, brows present.

**Hairline** (short hair): forehead height in the measured band; the front straight and level, turning down only on the
side of the head; corners cut at about 45 degrees into the temple notch; a temporal point; sideburn in front of the
ear; dense to the edge; nothing left of the old line (stripe, stubble, specks).

**Hair**: the style from the ancestry table (`docs/PEOPLE_PLAN.md` §3): Black people afro-textured or cropped, never
straight European styles; within a place no two people share a style; matte coils with relief, never a smooth cap,
plaster grey or helmet; edges never blocky; gritty and functional grooming.

**Facial hair**: only Rocketbox's own photographed beards, placed through the shared layout; no hard edge, no block, no
patch off the jaw, cheek line or upper lip; density true to the people (sparse for East and Southeast Asian men); grey
only from the 50s.

**Style**: the same studio light; colour and grain within Rocketbox's; nothing from scratch; no religious dress; faces
never covered.

## 4. Failures met so far and the check that now catches each

| Failure (owner) | Cause | Caught by |
|---|---|---|
| uneven skin on the new Black people | a scan's broad colour kept against the base's | tone_spread, side_diff, blotch |
| leathery, grafted-on skin | scan detail at full gain | blotch, detail |
| eyes pasted on, grey band, doubled creases | the scan's lids beside the base's eye | eye_ring; the look (eyes) |
| messy hairlines, white flecks, grey plaster scalp | photographed edge kept, sheen specks, skin roughness on hair | specks, the look (hair) |
| semicircle hairline, two perpendicular lines, too high, random vertices | a line built from a smoothed photograph, then half-planes, then a corner cut on the forehead | hairline_trg_mm, wobble, tilt; the look (hairline) |
| messy side stubble | the photograph's sparse temple hair left beside a new line | the look (hairline) |
| a pale patch at a receding corner | a coarse facet catching the key light | the look (skin) |
