# WARDROBE — what people wear in the Reach, and why

The owner's rules (CLAUDE.md §2, 2026-10-30, binding): clothes in colour, faces never hidden, cyberpunk in the cut;
lore-bound (salvaged, re-dyed, patched, layered, taped, rigged; clean synthetics and lit trims only on the megacity's
rich); no prints, logos, modern fashion, costume or uniform-as-such. This file is the research behind the wardrobe
(P4.14 step 3 and 5) and the rules the outfit tables (`src/engine/data/outfits.ts`, `garments.ts`) follow.

## 1. What the research says (cyberpunk aesthetics, read 2026-10-30)

Sources read: costume analyses of Blade Runner (Michael Kaplan, Charles Knode) and Blade Runner 2049 (Renée April),
Cyberpunk 2077's four style guides (CD Projekt's art book and the in-game style descriptions), Akira (the capsule
jacket), Ghost in the Shell, techwear and gorpcore writing (Acronym, the "urban ninja" cut), the Twisted Metal (2023)
costume notes, and punk / post-punk street dress as the root of the genre's street look.

What the genre's costumes share, stripped of any IP:

1. **Layering with a purpose.** A base (tee, tank, thermal), a mid layer (vest, harness, cropped jacket) and a shell
   (asymmetric hoodie, bomber, long coat or duster). Each layer is a different material and a different colour; the
   layers are visible at the hem, collar and cuff. One-piece outfits are rare and read as uniform or workwear.
2. **Hardware on the outside.** Straps, buckles, webbing, D-rings, cargo pockets on the thigh and shin (never on the
   chest), gusseted and articulated knees and elbows, chunky boots, taped seams, exposed zips, pouches on a belt or a
   harness. The function is the decoration.
3. **A restrained base, saturated accents.** Blacks, charcoals, deep blues, olive and rust as the body of the outfit;
   one or two saturated accents (a jacket, a scarf, a dyed panel, a lit trim) as identity. Akira's red jacket is the
   model: one bold colour as who you are. Blade Runner 2049's crowds are not grey: they are many muted colours, each
   garment its own, under a cold light.
4. **Class shows in the cloth.** Cyberpunk 2077's guides, generalised: the poor dress in *function* (repaired
   workwear, mismatched salvage, visible mending, dull by wear not by choice); the street in *loud kitsch* (neon, cheap
   synthetics, clashing colour, hand-painted marks, hair dye); the corporate in *restrained quasi-military* (clean dark
   synthetics, hard shoulders, no ornament, one metallic trim); the rich in *luxury that shows* (silk, lit fibres,
   gold, bare white, nothing weathered).
5. **Asymmetry and the half-undone.** One sleeve rolled or torn, a jacket worn off one shoulder, a hood down, a strap
   hanging, a coat belted with rope. Symmetry reads as costume.
6. **The face is the character.** Every memorable cyberpunk figure is recognisable by the face and hair; masks and
   visors belong to extras and villains in the genre, and to no one in this game (the owner's rule).
7. **Grit over gloss, except where gloss is the point.** Street and settlement cloth is faded, patched, dusty, oil-marked;
   corporate and rich cloth is clean, and that cleanness is their costume.

Mistakes the research warns against (and we made in P4.13): one dull palette for everyone ("grim brown", which the
Twisted Metal designer rejected for exactly this reason); garments chosen by function alone with no colour; costume
pieces (helmets, plague masks, kimonos, top hats) mixed into the everyday; prints and logos from the source packs.

## 2. The rules for our wardrobe

**Colour.** Every role has a palette of dyes the Reach can make or salvage (`outfits.ts`): indigo and sun-faded blues,
madder and rust reds, ochre and mustard, olive and moss, copper teal, plum, bleached bone, charcoal; salvage that keeps
its colour (faded safety orange, hi-vis yellow, hospital teal, signal red); the megacity's synthetics (magenta, cyan,
acid green, electric violet, amber). Dye chances are high (0.55 drifters to 0.9 street); grime and wear do the fading,
on the body, so a crowd is many colours at many ages of cloth. Nothing is grey by default; grey is a dye like any
other, used rarely. Factions mark themselves with a colour and a piece (an armband, a poncho), not a uniform.

**Cut.** Layered: base + mid + shell where the role allows; cargo and work trousers with thigh pockets; vests and
harnesses as mid layers; long coats and ponchos as shells; chunky boots. No chest pockets on a shirt (they read as a
bust on a man). Asymmetric and half-undone where a garment allows it (one sleeve, a hood down, an open coat).

**Face.** No garment covers the eyes or the mouth: no masks, goggles over the eyes, opaque glasses, closed helmets,
sacks or hoods that shade the face, oversized headsets. Goggles are worn up on the brow; glasses are clear.

**Class.** Destitute: rag and work, heavy grime and wear, few dyes. Working: work and casual, dyed, mended. Comfortable:
casual and formal, dyed, light grime. Rich (megacity): rich and formal, clean, saturated, lit trims allowed. Corp: dark
synthetics, clean, one trim. Street: loud, mixed, hair dye.

**Hair and faces** follow the grooming rule (CLAUDE.md §2) and the dimorphism rule: `Sculpt.Reroll` keeps a woman's jaw,
neck, brow and chin in a woman's range (P4.14).

## 3. The pieces (P4.14 step 5: the cyberpunk wardrobe)

The MakeHuman community packs give the silhouettes we have (117 pieces, 93 after the retirements in `garments.ts`;
the retired ones say why). They lack the genre's own pieces. The plan, in order:

1. **Retexture what we keep** through our pipeline (`mh_build.bake_cloth`): dye, grime, wear, patches, taped seams and
   stitched mending drawn into the bake; the pack's own colour only for pieces that keep it (jeans, leather).
2. **Author the missing cuts as body-derived garments** in Blender (`tools/unity/people/garments/`): a sleeveless
   harness-vest with pouches, an asymmetric hoodie (one sleeve), a cropped bomber with a stand collar, a long duster
   with a rope belt, a tactical poncho, articulated cargo trousers with shin pockets, a drop-crotch work trouser, a
   thermal base layer with a high neck, a strap-and-buckle belt rig, fingerless work gloves, arm wraps, a shoulder
   cape, a scarf and a neck gaiter worn down. Each is built from the base body's surface offset outward, so it fits
   both bases and every body shape by construction, and carries the drape rule over the bust.
3. **Lit trims** (emissive piping) on the megacity's street and rich pieces only, as a shader feature of the cloth
   material (`_Trim`), never on the frontier.
4. **Faction markers** stay procedural (armbands, ponchos, bandanas worn at the neck).

## 4. Evidence

`docs/evidence/unity/p4/shale/` holds the Shale residents sheets before and after each step of P4.14.
