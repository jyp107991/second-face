# People plan: every character a distinct person from real bases (2026-11-02, proposed, awaiting the owner)

Binding rules it serves (CLAUDE.md §2): people are variations off Rocketbox's own bases, no faces or skin from scratch;
real people or nothing; looks from archetypes by ancestry, sex and age; hair true to ancestry, gritty and functional;
no religious dress; faces never hidden; no two people of a place alike; a cast for the whole game.
Catalogue: `docs/evidence/unity/p4/research/base_faces_{women,men}.jpg` (`tools/unity/people/qa_base_catalogue.py`).

## 1. The bases

Usable now, one per distinct face (Rocketbox as shipped; gear that comes off counted as usable):

| People | Women | Men |
|---|---|---|
| Black | 1, plus 5 new (pending the owner) | 4 (2 opened from under a cap and a hood), plus 6 new (pending) |
| North European | 19 | 23 |
| Mediterranean / Middle Eastern | 0 | 4 |
| Latin American | 1 | 1 |
| East Asian | 3 | 3 |
| Southeast Asian | 1 | 0 |
| Mixed-looking | 0 | 1 |
| **Total** | **25 + 5** | **36 + 6** |

Ages: women 13 under 30, 11 at 30-49, 1 over 50; men 9, 18 and 7.
Locked: 24 more faces (6 women, 18 men, among them 2 Latin American, 4 Mediterranean, 1 East Asian) sit under hats,
helmets or religious dress; they open as the two Black men did (2026-11-02): gear modelled over a whole scalp comes off
(`rocketbox_gear_off.py`), and a face whose head ends at the gear is carried onto a whole Rocketbox head of its people
(`rb_face_source.py` with `ava/ava_internalise.py`).
Gaps: no South Asian, East African, Indigenous American or Pacific face; one woman over 50; no children; few women of
colour. The game has about 220 named characters, many over 50.

## 2. How one base becomes many distinct people

Layers, from the one that changes identity most:

1. **Face** (the base): its real shape and photographed skin. The identity. Seen in dialogue close-up.
2. **Hair** (§3): the strongest cue at the game's isometric distance, with build and clothes.
3. **Facial hair** (§3): men only.
4. **Age**: the shape's change with age measured on the library's older men, an ageing overlay from older Rocketbox
   faces (lines, uneven tone), greying from 55 in step with the face, receding and bald men from 40; older named
   characters from older real scans where we have them.
5. **Skin**: a small tone shift on the base's own photograph; sun, wind and grime by trade; scars and tattoos by faction.
6. **Shape**: the calibrated sliders within each face's limits, and a share of a real person's proportions; women on the
   female side of the features that differ by sex.
7. **Body and clothes**: Rocketbox bodies with build sliders; the lore-bound wardrobe in many colours.
8. **Kit**: goggles worn up, earrings, chrome. Never a full-face cover, never religious dress.

## 3. Hair and facial hair (the key layer)

**Why**: at the isometric distance a person reads by hair, build, clothes and colour; the face reads only in dialogue.
Rocketbox's hair is mostly modern office hair (side parts, bobs, fringes, loose long hair) that breaks the grooming rule,
and it is built into each head, so it cannot be swapped as shipped. Grafting another head's hair shell failed (blocks,
shards): the plan never moves shells.

**How it is built**:
- *A photographed scalp per base*: the scalp, hairline and upper forehead carried texel by texel from a buzzed Rocketbox
  head's own photograph and normal map (`scalp_photo.py`, built 2026-11-02), skin matched to the face, the line at its own
  height per person; never painted flat. Short shell hair (2-3 mm off the skull) keeps its shape; longer shells are pulled
  onto the skull first. A photographed scalp is a buzz cut by itself.
- *Hairstyles as separate card assets*, fitted to any bald cap by the skull fit already in use: Rocketbox's own tied and
  short styles taken off their heads as cards, the free hair meshes already in the project, and new afro-textured
  styles (coils, twists, braids, cornrows, locs) built as cards. Each style in several colours.
- *Facial hair as overlays*: stubble, beards, goatees and moustaches taken from Rocketbox's 15 bearded men in the
  registered layout and laid onto any man's face through his own layout, with thin fringe cards at a full beard's edge.
- *Quality gate*: every style on three heads, close-up and at game distance, beside photographs, before it enters the
  library; the owner sees the first five styles before the rest are made.

**Styles, v1** (gritty and functional, true to ancestry):

| Women | Who |
|---|---|
| Close crop or shaved (scalp) | all; most common for Black women |
| Short coils or twists | Black |
| Cornrows to a bun | Black |
| Box braids, tied back | Black |
| Locs, tied up | Black, all ages |
| Small afro | Black, rare (about 1 in 15) |
| Tied back low, rough bun | all peoples |
| Work braid | non-Black peoples |
| Knife-cut uneven crop | all |
| Long, matted under a hood or dust wrap | all |

| Men | Who |
|---|---|
| Buzz or shaved (scalp) | all |
| Short uneven crop | all |
| Short twists, low locs | Black, under 45 |
| Receding, balding, bald (scalp) | all, mostly over 40 |
| Tied-back long | non-Black peoples, under 50 |
| Shaved sides, tied top | rare, megacity gangs |
| Facial hair: light and heavy stubble, short and unkempt full beards, goatee, moustache | by ancestry: sparse for East and Southeast Asian and Indigenous men; grey from the 50s |

**Colours**: Black people black or very dark brown; East and Southeast Asian and Indigenous people black; Mediterranean
and Latin American people black or dark brown; Europeans dark brown, brown, dark blonde, rarely red or blonde; sun-bleached
ends for outdoor trades; grey from 55.

## 4. Who gets what

- *Named characters (about 220)*: each face used by at most two named characters in the whole game, never in the same
  region, and then with different hair, facial hair, age and clothes. Companions and the 20 most important characters
  have a face nobody else has.
- *Extras*: drawn per place from its population (ancestry, sex and age by lore: a median age in the late twenties, few
  past fifty), never a face already used by a named character of that region; within one place no two people share a
  face; across the world faces repeat only with different hair, facial hair and clothes.
- *A distinctness check per place* before it ships.
- Rough capacity: about 100 faces once the locked ones open and the gaps are filled, times about 10 hairstyles, 6 facial
  hair levels and the age and clothes layers.

## 5. Filling the gaps (each new face by the owner's verdict, as with the Black picks)

- More real scans from Ava-256 brought into Rocketbox's style: its South Asian and older people of every ancestry first,
  then any East African, Indigenous American or Pacific people it holds.
- Older faces: older scans for the named older characters, the ageing layer for the rest.
- Children: no source yet. They are left out of v1 unless the owner decides otherwise.

## 6. Order of work (a side track: one step at a time between game steps, never blocking them)

1. The owner's verdict on the 11 Black picks.
2. Bald caps for every base (about 1 day).
3. Hairstyles v1, the first five shown to the owner (about 3 days).
4. Facial hair overlays (about 1 day).
5. The 26 locked faces opened (about half a day, after step 2).
6. Ageing layer and older scans (about 2 days).
7. Gap scans (about 2 days, the owner's verdict per face).
8. The cast assigned and imported into Unity (about 2 days).

Meanwhile the game build resumes with P6 (systems and combat).

## Decisions for the owner

1. The verdict on the 11 Black picks.
2. Whether to fill the other peoples' gaps from Ava-256 scans, face by face.
3. Whether hoods and dust wraps may cover hair (functional, never religious).
4. Children: none in v1, or a source to look for.
