# Immersion audit (A5.9, sweep 2)

What the engine does today, measured against what the best isometric RPGs of the last decade do (Disco Elysium,
Baldur's Gate 3, Pillars of Eternity II, Wasteland 3, Rogue Trader), and the ten fixes that buy the most.
Read with `docs/DESIGN.md` §5b (binding presentation rules). Spoiler-free.

## 1. Camera
- **Now**: orthographic isometric, rotate (steps and free), zoom, recentre, follows the player; shake on explosions;
  conversations frame the speakers in the world (A5.1).
- **They do**: BG3 and Rogue Trader ease the camera on every cut; Pillars never snaps; Disco leads the camera a little
  in the direction of travel so the player sees where they are going.
- **Gap**: a location loads with the camera hard on the spawn; a long run keeps the player dead centre.
- **Fix 9**: ease the camera in on arrival (0.6 s from slightly wider), and lead it ~1 tile ahead when running.

## 2. Hover, prompts and what can be used
- **Now**: hover moves a tile cursor only; a tap on a target opens the radial menu. Nothing says what a thing is or
  what it will do until it is tapped. No way to show everything usable in a scene.
- **They do**: every one of the five highlights the thing under the cursor and names it with its verb (Disco: name +
  verb card; BG3: outline + name label; Pillars: Tab reveals every interactable and exit).
- **Gap**: the single biggest readability gap in the game. The owner's "doesn't feel immersive" starts here.
- **Fix 1**: hover highlight (a warm emissive pulse on the mesh, or a rim tint) on NPCs, props with verbs, exits and
  loot, with a floating label beside the cursor: `Mags · Talk`, `Crate · Search`, `East road · Leave`. Touch: the label
  appears on the first tap, the radial on the second (tap-to-act stays).
- **Fix 10**: hold Tab (or a HUD button on touch) to pulse every interactable and exit in view.

## 3. Feedback in combat
- **Now**: muzzle flash, tracers, impacts, blood, float text for damage/miss/heal, shake on explosions, the combat
  HUD with AP, the hovered tile in combat (path and AP cost).
- **They do**: Wasteland 3 and BG3 show hit chance, cover and expected damage on hover before the shot; the player
  being hit is unmistakable (vignette flash, grunt, controller rumble); kills get a beat (slow-mo or a sting).
- **Gap**: hit chance is only in the radial; the player being hit looks like anyone else being hit.
- **Fix 3**: a hover card in combat: target name, hit %, cover, AP; a thin line from shooter to target.
- **Fix 4**: when the player takes damage: a red vignette pulse, a hurt grunt, a 60 ms hitch; on a kill a short sting.

## 4. Sound
- **Now**: synthesised beds (wind, camp, town, hum; and since A5.6 birds and crowd murmur by mood and hour),
  footsteps by surface, weapon and UI sounds, a sparse drone score.
- **They do**: interiors sound closed (reverb, muffled exterior), distant things are quieter, doors and containers each
  have a voice, music swells on combat and resolves after.
- **Gap**: a bark across the square is as loud as one beside you; indoors sounds like outdoors.
- **Fix 8**: a feedback-delay reverb bus for roofed rooms and indoor maps, exterior bed ducked 6 dB inside; barks and
  footsteps attenuated by distance to the camera focus.

## 5. NPC reactions
- **Now**: schedules, barks, standing-aware greetings, extras that wander, work, sit and talk in pairs, idle fidgets
  (A5.4, A5.5); companions follow and comment.
- **They do**: BG3 and Rogue Trader NPCs turn their heads to the player who walks up; crowds part; a drawn weapon
  gets looks and words; known faces greet by name in passing.
- **Gap**: nobody looks at you. The crowd stands its ground when you walk through it.
- **Fix 2**: head-turn: a standing NPC within 3 m turns head (then shoulders) toward the player for a few seconds,
  blended, then returns; talkers glance up. Cheap in `humanoid.ts` (one look target per body).
- **Fix 7**: crowd yields: an extra whose tile the player's path crosses steps aside or waits; extras avoid the
  player's tile when choosing where to drift.

## 6. Lighting
- **Now**: sun and moon arc, per-day weather and per-map mood (A5.6), point lights with flicker, bloom, grade, dust;
  roofs now cast shadows and lift when the player is inside (A5.7).
- **They do**: lamps come on at dusk; stepping indoors changes the light (Pillars, BG3 interiors are a different grade).
- **Gap**: lamps burn at noon; the inside of a roofed room at noon is lit like the street once its roof lifts.
- **Fix 5**: lamp sources switch on at dusk and off at dawn (lamp posts, hanging lamps; fires and screens stay);
  inside a roofed room the grade and exposure ease toward the map's interior look.

## 7. UI motion and touch
- **Now**: the notebook, radial, dialogue panel and map open instantly; title cards queue; the HUD is static; two CSS
  transitions in the whole stylesheet; a CRT flicker.
- **They do**: 100–200 ms fades and slides on every panel, paper sounds in Disco's and Pillars' journals, a radial
  that blooms outward.
- **Fix 6**: 120–160 ms fade/slide for notebook, radial, dialogue and map; page sound on the notebook; the radial
  blooms from the tap point.

## 8. Environment storytelling
- **Now**: props, signs, a few examinable things, decals in combat, roofs with clutter.
- **They do**: Disco describes anything; Pillars has scripted interactions; BG3's corpses and notes tell what happened.
- **Gap**: most props have no "look" line. (Content, not engine: a one-line `look` text per prop kind with per-map
  overrides.) Not in the ten; queued for B-phase content passes.

## The ten, in order
1. Hover highlight + name·verb label (§2).
2. Head-turn toward the player (§5).
3. Combat hover card (§3).
4. Player-hit vignette, grunt, hitch; kill sting (§3).
5. Lamps by hour; interior grade when under a roof (§6).
6. Panel motion and notebook page sound (§7).
7. Crowd yields (§5).
8. Indoor reverb and distance attenuation (§4).
9. Camera ease on arrival and lead when running (§1).
10. Tab / button reveals interactables (§2).

Each is engine-only, content-neutral, and evidenced by a screenshot or a sound check in `docs/evidence/a5/`.
