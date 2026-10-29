# Progress log (spoiler-free) — READ FIRST, every session

This file is the single source of truth for where the project stands. Update it, run `npm run check`,
commit and push after every step. Another model with no memory of past sessions must be able to continue
from here without guessing. Story-sensitive detail lives only in `story/` (never here).

## 0. How to resume
1. Read this file top to bottom, then `CLAUDE.md`, `docs/DESIGN.md`, `docs/WORLD.md`, `docs/ROADMAP.md`,
   and everything in `story/` (secret; never quote to the owner).
2. Find the first unticked step in §2/§3 below (steps are ordered). Its line says what it is and, where
   needed, how to do it. "Half-finished work" (§5) says what is mid-flight.
3. Work in small steps (≤ ~1 h). After each: `npm run check` → tick/update here → commit → `git push origin main`.
4. Visual work needs the dev server: run `npx vite --port 5173 --host 127.0.0.1` as a **background task
   with the longest timeout** (it dies after 2 h; restart it). Headless Chromium is ~2 fps (swiftshader):
   fine for screenshots and draw-call counts, useless for frame-time; measure frame time on a real device.
5. Render QA scripts (Playwright, node) are in the session scratchpad and may be gone — recreate from
   `tools/qa/` (committed copies, see §4) when needed.

## 1. Where things stand (one paragraph)
Engine is substantial (render, iso camera, turn-based combat + AI, stats/perks/chrome with a surgery screen, inventory,
dialogue, quests, world logic, local reputation/news/leads/events, scheduled events that wait for the player, settlement
types, world-map travel with a moving camp, human figures with layered garments, equipment and chrome shown on the body,
camp, letters, Dust, weather and mood, real buildings with roofs that hide when you enter). Content: **Chapter One and
all of Act 1 are playable end to end** — the Cistern, Shale, the overpass, Tollhouse 9, Signal Hill, Jonah's month, the
wilds, Dry Wells, the Mender's table, the Wheel, the escort, four Act 1 side lines (16 maps, ~85 NPCs, 114 dialogues,
22 quests, 104 items); three companions can join. Character creation has a rolled start (owner's reroll request).
**Act 1 is cut as a playtest version** (frozen branch `act1-test-1`, see §2b and `docs/PLAYTEST.md`; the owner installed
the Pages workflow). **Act 2 part 1 is under way**: Ninebridge, Openfield, the Sump and Cistern 4, Meridian's gate, the
Precinct, Old Market, the Sink, Lantern Row, the Stacks, Bridgeward and the Crown are playable (29 maps, 347 dialogues, 54 quests,
147 items;
six companions can join; a flat in the Stacks is a safehouse; four gangs joinable one at a time; the Crown has five ways in).
**Content building is PAUSED. Owner decision 2026-10-28: the game is being PORTED TO UNITY 6 (URP, Android first) —
plan and rules in `docs/PORT.md` (§2d below). The web engine is frozen as the reference (U1–U4.1 done in it). The
upgrade list `docs/UPGRADE.md` U4.2–U8 is carried out in Unity; then B3.11.** Still open from the presentation
pass: A5.9's remaining items (combat hover card, crowd yielding, indoor sound, camera ease, Tab reveal) — fold them in
as B3 touches the same code. Binding owner rules: see `CLAUDE.md` §2 (no time limits; spoiler rule; not a Fallout
clone; cyberpunk fusion).

## 2. PHASE A — quality and depth pass
### A0 Plan
- [x] A0 This plan written; old milestone logs compressed into §6.

### A1 Grounded world and coherent story
- [x] A1.1 History rework (public `docs/WORLD.md` §1, §4): the Burn follows from real trends — compute/chip
      race between blocs, AI-administered charter cities, automation and autonomous weapons, surveillance
      scoring, climate stress, supply-chain autarky, geopolitical fragmentation. Add "remnant machines"
      (autonomous machines that outlived their owners) to the world and the bestiary.
- [x] A1.2 Secret history and plot consolidated (`story/WORLD_SECRET.md`, `story/STORY_PLAN_SECRET.md`
      rewritten as a clean v3; superseded passes removed; change log kept).
- [x] A1.3 Character bible (`story/CHARACTERS_SECRET.md`): companions and key NPCs with wants, fears,
      contradictions, voice, secrets, opinions of each other, arc stages, red lines, romance notes.
- [x] A1.4 Coherence audit of existing content (dialogue, quests, items, leads, origins, perks/traits text)
      → fixes committed; findings log in `story/AUDIT_SECRET.md`.
- [x] A1.5 Hard-choice review rule applied to every major choice listed in the plan (no dominant option);
      delayed/distant consequence list ≥30% (tracked in the secret plan).

### A2 Play like the best RPGs
- [x] A2.1 DESIGN §2d–§2h: joinable factions (membership, initiation, ranks, politics, perks, gear, base,
      conflicts, infiltration/betrayal), side-quest standard, side activities (each with mechanics + reward
      loop), nonlinearity rules (entry routes, region order, tiered loot), QoL list.
- [x] A2.2 Engine: faction membership model (`world/factions.ts`, content `content/factions/`, 14 factions, save v5) (`world/factions.ts`: ranks, conditions `member`, effects
      `join`/`rank`/`expel`, conflicts), validator + tests.
- [x] A2.3 Engine: companions core (`npc/party.ts` + game: party spawns with you, follows, fights as allies,
      goes down and gets up wounded, sheets/packs kept across maps, dismissed companions wait where left;
      approval toasts) + camp scene (`ui/camp.ts`: rest with water/food costs, talk, cook `cookTo`, mend with
      repair kits, write letters; `game.openCamp()`, campfire props, HUD △). Banter is content-driven at camp
      (dialogue starts can test flag `at_camp`).
- [~] A2.4 Engine: barter DONE (`inventory/barter.ts` pricing by Barter/standing/membership, saturation,
      merchant cash + restock; `ui/barter.ts` screen; NpcDef.merchant; dialogue effect `{event:'barter'}`).
      TODO: economy sim script.
- [x] A2.5 Engine: NPC schedules (`npc/schedule.ts`, NpcDef.schedule + MapDef.spots, 'away' leaves the
      map) + barks (NpcDef.barks as floating text near the player).
- [~] A2.6 Activities v1: DONE Dust dice (`minigames/dust.ts` + `ui/dust.ts`; dialogue `{event:'dust', data:{stake}}`),
      letters (`world/letters.ts`, content `content/world/letters.ts`, replies via timers, notebook Letters view,
      HUD unread badge). TODO with their content slices: fight pit (B3), hunting/trapping + fishing + animals (B2),
      reverie vignettes (B3), safehouses (B1 Shale room), races/dives/escort/court/heists (B2–B4).
- [x] A2.7 QoL: undo last move (HUD ↶ / key), take-all (existing), equip comparison in Pack, quest pins (HUD
      objective line), dialogue Log view, Skip ▸▸ through heard lines, text size + high contrast, ✓/✗ glyphs on
      checks, remappable keys (`ui/settings.ts`), difficulty (enemy aim/damage only), combat speed, one-time
      tips, settings persisted. Smoke test: `node tools/qa/smoke.cjs <outdir>`.
- [x] A3.1 Clothing (`data/garments.ts` cull + elite retags, `assets/human/cloth.ts` dye/fade/dirt/patches/stains,
      `assets/human/gear.ts` procedural respirator/goggles/bandana/headwrap/neck wrap/plates/harness, `data/outfits.ts`
      `dressFor(seed, role, fit, faction)` + FACTION_LOOK): cull out-of-place garments (dresses, florals, clean fashion → restricted to the Crown/
      Halcyon or removed); gritty retexture pass (worn canvas/leather/synthetic atlases, patches, stains);
      new procedural pieces (poncho, duster, hood/wrap, scrap plates, harness/webbing, respirator, goggles
      strap); faction/gang looks (colours, markers) recognisable at iso distance. CREDITS kept complete.
- [x] A3.2 Bodies (`data/appearance.ts` lean distributions, LIFE table, BODY_VARIATION, ASYMMETRY, posture;
      `assets/humanoid.ts` applies them): lean/wiry/gaunt defaults, rare heavy (rich or specific); proportion variation (limb
      length, shoulder/hip, neck, posture slouch) via MakeHuman measure/torso/armslegs modifiers + anim.
- [x] A3.3 Faces (`assets/human/skin.ts` 8 skin variants + weathering paint, `figure.ts` eye clearcoat,
      community skins 13 entries in `tools/mh/build_human.py`, hair contexts + RICH_DYES in `appearance.ts`;
      **face pass v2 after owner feedback 2026-10-26**: `randomAppearance` uses one head-shape target + bounded
      FACE_SCALE/FACE_FEATURES/DISTINCTIVE tables (stacked ±0.6 modifiers had made alien skulls), textured
      brows only, weathering/grime low-frequency and faint, regrade K 0.72, matte skin material, softer
      portrait rig (key 1.9 + fill 0.55); procedural neck wrap/headwrap/bandana removed from role pools —
      library face masks instead; poncho without collar ring): research + adopt better open resources (community skin packs skins01/02/03 full diffuse
      variety, asymmetry via l-/r- modifiers, weathering/sun damage/chapped lips, eye wetness/lip spec,
      ageing wrinkle strength, female-specific shape variation, world-fitting hairstyles only).
- [x] A3.4 (portrait sheets for faces/bodies + crowd iso sheets `tools/qa/crowd.cjs`; sent to owner 2026-10-26) Before/after comparison sheets (portrait + iso) for each of A3.1–A3.3, judged honestly; revert
      regressions; sheets sent to owner.

### A4 Technology and performance
- [x] A4.1 `docs/TECH_EVALUATION.md`: Godot 4, Bevy, Babylon.js, PlayCanvas, three.js WebGPU, pipelines
      (glTF+meshopt/Draco, KTX2/Basis, baked lighting, instancing, LOD/impostors, forward+, AgX tonemap,
      GTAO, volumetric fog, decals) — quality ceiling, mobile perf, Pages deploy, migration cost, risk;
      recommendation; owner asked (no migration without approval).
- [x] A4.2 (`game.perf()` snapshot + DEV overlay line, `bench_crowd` map + 40 bench NPCs, `tools/qa/bench.cjs`,
      baseline in `docs/PERF.md`) Perf overlay (frame ms, draws, tris, textures MB, geometry MB, load ms) + benchmark scenes
      (`bench_crowd` 40 NPCs, `bench_combat`, world map) + `tools/qa/bench.cjs` recording numbers to
      `docs/PERF.md`.
- [~] A4.3 DONE step 1 (`docs/PERF.md`): decimated iso LOD (`tools/mh/decimate.mjs`, `npm run decimate`,
      `_index_lo` views), plane brows at iso, 512² iso skins, frustum culling → crowd −83 % tris, −31 % draws,
      −44 % tex MB, −68 % geo MB. Remaining (do when a real town exists to measure, B1/B8): PERF.md backlog.
      Pareto improvements measured one by one: skin texture cache/hash + smaller iso skins, worker
      thread for skin compositing, KTX2 for static textures, atlas merge of static props, LOD distances,
      shader simplification at low tier, lazy chunks (code splitting), adaptive resolution tiers.
      Numbers before/after in `docs/PERF.md`.

### A5 — second immersion & aesthetics sweep (owner feedback, after B2.5; runs before B2.6)
Owner verdicts, binding: masks are not a motif (people wear dust masks when the wind is up; no faction mask culture;
disguise = hood, scarf, dirt); men and women must differ clearly in face and body, women generally somewhat shorter
with far more variable proportions; movement must be fluid and natural; idle motion loops everywhere people stand;
crowds must look like crowds and places must feel alive (more people, some with shallow talk); buildings must stop
reading as blocks; the world must not be uniformly gloomy (sun, bustle, peace); conversations stay in the world
view with a portrait beside the panel; bionics look futuristic (Cyberpunk 2077 as the reference); a second sweep of
such presentation decisions against modern CRPG practice. Each step: evidence sheet in `docs/evidence/a5/`, check, commit.
- [x] A5.1 **Conversations in the world** (~1.5 h): no black close-up; the scene stays, the camera eases to frame the
      two of you, the panel gets a live portrait (`FigureView`, head-and-shoulders) on its left; the speaker's head
      turns to the player. Sunglasses come off indoors and in talk.
- [x] A5.2 **Masks out of the lore** (~1 h): content and docs rewritten (the stranger keeps his single dust mask with
      its painted sign; the Choir has no rite masks; "masked traveller" → "the old man"; the hide-your-face mechanic
      becomes hood/scarf); the story plan's mask motif replaced (secret file; spoiler-free summary here only).
- [x] A5.3 **Dimorphism and body variety** (~2 h): gender-conditioned face biases (jaw, chin, brow, cheek, lips, eyes,
      neck), women's height distribution ~7% lower with wider spread, hip/shoulder/waist/bust/limb ratios varying
      independently and more widely, stronger macro gender weight; before/after portrait and silhouette sheets.
- [x] A5.4 **Fluid movement and idle loops** (~3 h): speed-ramped stride with distance-driven phase (no sliding),
      hip sway and torso counter-rotation, arm swing with elbow bend, foot lift, smooth turning; idle loops by
      activity (breath, weight shift, look-around, fidgets, arms-crossed, lean, sit, work loops: hammer, sweep,
      dig); a crowd no longer stands with its hands out. Mocap import (CMU/ACCAD BVH → our rig) evaluated and
      noted as a follow-up if procedural still reads stiff.
- [x] A5.5 **Alive places** (~3 h): `MapDef.extras` → generated background people (looks, routes between spots,
      pauses, short generic talk, barks), clusters of two or three talking, vendors behind counters, sitters on
      crates and steps, children; the crowd bench becomes a real market (stalls, awnings, goods, a well, a queue).
- [x] A5.6 **Weather and mood** (~2 h): `engine/world/weather.ts` — one weather kind per region per day (clear /
      haze / dust / storm, in spells, fixed by seed so a save reloads the same sky; `weatherFor`, `skyLook`); a true
      clear noon (whiter sun, blue fill from above so shadows go cool, far fog, thin dust); `AmbienceDef.mood`
      (bright / peaceful / bustling / haze / grim) sets grade, exposure, tint and fog (grim = darker, colder, closer);
      dust thins or thickens with weather (`uDensity`); sound bed follows mood and hour (`birds` and `murmur` beds
      synthesised in `audio.ts`; storm/dust fall back to wind). Dev: `game.weatherOverride`. Evidence
      `docs/evidence/a5/{shale_clear_noon,shale_dust_noon,shale_storm_evening,orchard_peaceful_morning,windpumps_bright,
      overpass_grim_haze}.png` via `tools/qa/weather.cjs`. Moods set per map in the generators.
- [x] A5.7 **Buildings that read as buildings** (~4 h): `engine/scene/buildings.ts` — `detectBuildings` finds the
      rooms the walls enclose (doorways = gaps of 1–2 tiles in a wall, alley mouths excluded; yards with sand floors
      are not rooms; `TileDef.roof` overrides); walls rebuilt at a real thickness (0.4–0.9 m) with faces by material
      (adobe: plaster, rounded cap, vigas, base splash; brick: band course, coping, missing bricks; concrete: panel
      seams, rebar, spall; wood: studs, rails; metal: ribs, bolts; scrap: leaning panel collage on posts); doors get
      lintel, jambs, threshold and a canvas/tin awning; long runs get through-wall windows (shutters, bars or boards);
      sand drifts at the foot outside. Roofs per kind — flat slab behind a parapet with clutter (tank, tarp, vent,
      aerial, cracked solar panel), pitched with gables and a chimney, lean-to tin with tyres and rocks — carry a
      per-vertex building id and are discarded (shadow too, `roofDepthMaterial`) while the player is in that room
      (`roofUniforms.uHideBld`, set in `Game.frame`). Lights inside a roofed room are kept under the roof. New
      `adobe` wall kind + `adobe`/`tin` surfaces; Shale's homes are adobe and its wells are a real `pump` prop.
      Evidence `docs/evidence/a5_before/{shale_bld_2,tollhouse_bld_1}.png` → `docs/evidence/a5/bld_*.png`
      (`tools/qa/buildings.cjs`: Shale sheriff/homes/saloon (+inside)/pumps/mender, the fort (+inside), the overpass
      shed, the orchard house, Dry Wells hall and sheds). Tests `tests/buildings.test.ts`. Draw calls unchanged
      (roofs merge into ~6 buckets). Known: the wall cutaway can open a dark hole into a roofed room when the player
      stands against its outer corner — tighten the cut cylinder in A5.9.
- [x] A5.8 **Bionics that look like the future** (~2.5 h): `assets/human/gear.ts` chrome cases redrawn — matte
      polymer plating in the make's finish (gunmetal old / matte black Mender / pearl Concern) over a dark under-layer,
      brushed-steel seams and collars, a lit accent line that dims as condition falls (amber / red / cyan): segmented
      forearm sleeves (a hydraulic ram on Mender arms), knee dome + shin and calf plates, an optic housing with a lit
      iris ring and brow plates (both eyes for Concern optics), a hexagonal temple port with lit data pins and a cable
      channel, a nape port over a vertebra ridge, steel collarbone seams and sternum hex plates. `wardrobe.ts` passes
      plating/accent/grade/wear per piece. Evidence `docs/evidence/a5_before/chrome_*` → `docs/evidence/a5/chrome_*`
      (`tools/qa/chrome.cjs`).
- [~] A5.9 **Immersion sweep 2** (~3 h): `docs/IMMERSION_AUDIT.md` written (seven areas against Disco Elysium / BG3 /
      Pillars / Wasteland 3 / Rogue Trader, ten fixes ranked). DONE of the ten: #1 hover label (name · verb) with a
      brighter, larger cursor ring on people, things and exits (`Game.describeAt`, HUD `.hover-label`; hidden on
      touch); #2 head-turn — standing people within ~3 m turn head and a little shoulder to the player
      (`Humanoid.lookTarget`, `Actor.lookAt`); #4 being hit — red pulse at the edges (`PostFX.hurt`), a shake;
      #5 lamps come on at dusk and go out after dawn (`LightSource.lamp`); #6 panels arrive with a 160 ms rise/settle.
      Evidence `docs/evidence/a5/imm_*.png` (`tools/qa/immersion.cjs`). #7 half-done: a walk that someone steps into
      no longer stops dead — the player waits a beat and paths round them to the same goal (`Game.walkTo`,
      `resumeWalk`; `Actor.onPathDone(blocked)`; found by the Act 1 runner at the orchard); people stepping aside for
      the player is still to do. LEFT for after the playtest cut: #3 combat hover card, #7 crowd yields (the other
      half), #8 indoor reverb + distance attenuation, #9 camera ease/lead, #10 Tab reveals interactables.
Total ~22 h. Then B2.6. v1 estimate = this + the Phase B remainder (~66 h) ≈ 90 h of build sessions.

## 2b. OWNER REQUEST (2026-10-27, binding): standalone Act 1 test version
The owner road-tests Act 1 while the build continues. Plan:
- [x] **Reroll first.** DONE: character creation's Attributes tab has *Roll your start* — `rollAttributes` (sheet.ts)
  rolls each attribute base + a small weighted roll (pool above base averages ~12.6, 0–28, 18+ about one roll in
  thirty), Roll / Keep this roll / Recall kept / Standard start; points move between attributes within the roll's
  pool (`CharacterSheet.creationPool`, validation honours it). Tests `tests/creation.test.ts`; evidence
  `docs/evidence/a5/creator_attributes_{standard,rolled}.png` (`tools/qa/creator.cjs`).
- [x] **Then finish Act 1**: B2.6 (the Mender and chrome surgery, the Wheel, caravan escort basics) and B2.7 (faction
  lines to Act 1 end, side quests, the end-to-end Act 1 smoke) DONE, with A5.8 (bionics) and five of A5.9's ten
  (hover labels, head-turns, hit feedback, lamps by hour, panel motion) folded in; the other five wait (§2 A5.9).
- [x] **Act 1 end-to-end smoke** (`tools/qa/act1.sh` against a frozen `vite preview` build on :4173, 2026-10-27): all nine
  green — ch1 (19 checks), tollhouse (5), signalhill (6), month (6), drywells (9), wilds (13), wheel (9), surgery,
  act1_sides (10); logs in `docs/evidence/act1/*.log`. ch1 and signalhill had first failed only on walking/arrival waits
  under CPU load (longer waits); wilds had found a real bug — a villager on her night schedule stepped into the player's
  path and the walk stopped dead — fixed in the engine (A5.9 #7, blocked walks re-path). The runner's pictures are
  not tracked (regenerated each run).
- [x] **Then cut the test version** DONE 2026-10-27: frozen branch `act1-test-1` at 27a976d (a branch, not a tag: this
  session's tokens cannot push tags; the branch is never moved), built by the Pages workflow (`tools/ci/pages.yml`; the
  owner copies it to `.github/workflows/pages.yml` once — the tokens cannot write workflow files either) into its own
  path `/second-face/act1/` with its own save namespace (`VITE_SAVE_NS=act1`, saves under `sf.act1.save.*`), so it
  never conflicts with `main`'s deploy at `/second-face/` or its saves. `docs/PLAYTEST.md` tells the owner how to play,
  what is in, what to report. Later test versions are new branches (`act1-test-2`, …); the newest number wins, the old
  stays until replaced. Owner feedback is folded in as it arrives (fixes land on `main`; a new branch when a batch is
  worth re-testing).
- [ ] **Then straight on** to Act 2 (B3) without waiting for feedback; feedback is folded in as it arrives. NEXT.

### B2.6 plan (written before coding; spoiler-free)
- [x] **B2.6a Chrome surgery** DONE (engine + content; `world/surgery.ts` rules, `ui/surgery.ts` screen, `tests/surgery.test.ts`, smoke `tools/qa/surgery.cjs`, evidence `docs/evidence/b26/surgery_*.png`): `NpcDef.surgeon { stock: chromeId[], fee }`; dialogue effect
  `{ event: 'surgery' }` opens `ui/surgery.ts`: left the patient's eight slots (piece, make, condition, upkeep due;
  Repair / Remove), right what can be fitted (the surgeon's stock to buy-and-fit, boxed pieces in the pack to fit) with
  price, fee, risk % (`surgeryRisk`), hours, Drift it adds, what it gives, upkeep. Fit → roll (`installChrome`) →
  clean / complication / rejected (fee lost, piece kept), time passes, a title line. Chrome pieces exist as items
  (`ItemDef.chrome`) so they can be found, bought, carried, removed. Yusra fits; the Signal Hill chrome route and a
  Mender stock piece give the first ones. Tests + a smoke (`tools/qa/surgery.cjs`).
- [x] **B2.6b The Wheel** DONE (`LocationDef.moves` + `placeMoving`/`Game.placeCamps`, `flags.wheel_near`; `gen_wheel.py`, props `wagon`/`horse`/`blanket`; cast `npcs/wheel.ts`, talk `dialogue/wheel.ts`; Ruth at Shale's caravan post says where it is camped): world location `wheel` (kind camp) that moves between four Sallow waypoints every few days
  (position from the day; a lead or news tells where it is camped); map `gen_wheel.py` (wagons in a ring — new prop
  `wagon` — tents, a horse line — new prop `horse` — a fire, trade blankets), cast: the caravan-mother, her son, a
  horse-master, a trader; nomad extras; faction `wheel` standing (guest → road-kin); trade; shallow talk about the
  road; the escort job (B2.6c) offered here too.
- [x] **B2.6c Caravan escort basics** DONE (`q_a1_escort` from Ruth or Sefa; `re_escort_axle` and `re_escort_shakedown` fire on Sallow legs while `escort_active` is set, one per trip; the gate pays 60 and standing; smoke `tools/qa/wheel.cjs`, evidence `docs/evidence/b26/wheel_*.png`): `q_a1_escort` from Shale's caravan post keeper or the Wheel: ride with a caravan
  to Tollhouse 9 or the Wheel's next camp; while escorting (`flag escort_active`) two authored road encounters can
  fire (a broken axle: mechanics or hours; a shakedown: talk, pay or fight); arrival pays Tolls and standing. Then the
  flag clears. Repeatable once per Act.

## 2c. OWNER DIRECTIVE (2026-10-27, pass 5, binding): aesthetics and ONE OPEN WORLD — see `docs/UPGRADE.md`
The owner judged the Act 2 build (blocky, barren, dark and dusty, square maps with loading screens, people who do not
look or move like people, puzzle ground, cursive, dungarees, flat names, looping talk, two-finger camera, timid
rerolls, slow portraits) and ordered a dramatic upgrade, actioned sequentially in logical order, before content
continues. Engine decision: stay on three.js and upgrade renderer, world model and assets (reasons in UPGRADE §1).
Steps (each a commit with `npm run check` green and screenshots under `docs/evidence/u*/`):
- [x] U1 Foundation DONE 2026-10-27: CC0 asset pipeline (`tools/assets/materials.py`), PBR material library, blended
      terrain ground per map (no tile seams), real wall/roof materials, re-lit sun/sky/fog (lit palette; dust and sepia
      only as weather/mood), soft shadows; typefaces (no cursive), default outfit, reroll variance, portrait
      pre-warming (evidence `docs/evidence/u1/`). AO moved to U3 (with the renderer restructuring for streaming).
- [ ] U2 Open world (IN PROGRESS): world coordinates, continuous terrain by region climate, places stamped at their
      positions, roads/rails, chunk streaming with detail rings, pathfinding over terrain, persistence, instant
      interiors, world map as a map, vehicles as fast travel, save migration. No exits, no loading screens.
      - [x] U2a DONE 2026-10-27: one world grid, places stamped in (`src/content/world/sites.ts`), streaming
            (`src/engine/scene/stream.ts`), world-wide pathing (`src/engine/world/worldGrid.ts`), flat region terrain
            chunks (`src/engine/world/terrain.ts`), cells for interiors, map-local persistence (save v6), QA smokes on
            place-local helpers, evidence `docs/evidence/u2/` + `tools/qa/openworld.cjs`.
      - [x] U2b.1 DONE 2026-10-27: one world surface array, weight-only splat with per-mesh slot tables, places
            feathered into the terrain, stochastic tiling (no repeat), skirt gone (`wild.cjs`, `edges.cjs`).
      - [x] U2b.2 DONE 2026-10-27: heightfield (`src/engine/world/height.ts`): region relief at three scales, places
            on pads, true normals + curvature shading + terrain shadows, water level and slope walkability, actors
            and overlays on the ground, terrain-ray tap pick, streaming on the real clock (`relief.cjs`).
      - [x] U2b.3 DONE 2026-10-27: ways (`src/engine/world/ways.ts`): roads, tracks, rails with sleepers and rails
            laid, the river carved to the sea, the sea west of the coast, walkability along ways, a far ground ring
            (`ways.cjs`).
      - [x] U2b.4a DONE 2026-10-27: the field map drawn from the world (`src/engine/ui/mapImage.ts`: relief, sea,
            river, the Line, wandering roads, "you are here" from the player's tile) (`fieldmap.cjs`).
      - [x] U2b.4b DONE 2026-10-27: travel from the map — "Walk there" walks the ways (one game minute a real
            second; discoveries and trouble per leg; a tap ends it), vehicles board at their stops with fare and
            time (`journey.cjs`). Taps work in the open country.
      - [ ] U2c (after U3): detail rings/LOD, memory and draw-call budget, phone profiling.

- [x] U3 Living world DONE 2026-10-27: biome vegetation and surviving greenery, rocks, real props, water and shores,
      weather by region, background life.
      - [x] U3.1 DONE 2026-10-27: CC0 model library (`tools/assets/models.py`, 25 plants/rocks, phone-sized),
            `src/engine/assets/models.ts`, `src/engine/world/flora.ts` (regional rules, patches, exclusions,
            instancing within 120 m, obstacles); trees as eight-view impostor cards baked from the full models
            (`tools/assets/impostors.py`, `src/engine/world/impostors.ts`). Tune densities with eyes on a phone.
      - [x] U3.2 DONE 2026-10-27: rippled water surface with a glint; waterline on the ground (wet band, foam line,
            drowned tint); far ring fixed on slopes.
      - [x] U3.3 DONE 2026-10-27: 22 CC0 prop models; `src/engine/assets/propModels.ts` maps built box props to
            them; places merge their model props by material (`props.cjs`). Roadside detail along the ways folds
            into U3.4.
      - [x] U3.4 DONE 2026-10-27: rain, fog and snow by region with their skies and sound; rain and snow particles;
            smoke from fires; birds and dust devils (`src/engine/render/life.ts`); open-country sound bed
            (`sky.cjs`). Grass LOD and roadside detail deferred to U2c/the content pass.
- [~] U4 People: captured motion retargeted to the human rig, locomotion blending, skin/cloth/hair materials, close
      LOD, outfits per role/region, visual variance, cached portraits.
      - [x] U4.1 DONE 2026-10-27: real captured motion on every figure. `tools/assets/motion/cmu.mjs` turns CMU
            mocap trials (ASF/AMC, free for all uses) into 28 clips (`public/assets/human/anim/clips.bin` + index,
            615 KB): walks at four paces, jogs, a run, a carry and a sneak (one stride cut and seam-blended, each
            with its true speed), four standing idles, three sitting idles, two conversations and a quarrel, a
            drink, a wave, sweeping, a guard stance, a stretch and two yawns, a pick-up and a fall (unused yet).
            `assets/human/motion.ts` loads and samples them; `Humanoid` plays them by aligning each bone's rest
            direction to the capture's (any build), picks the gait by the pace the walk is heading for and runs
            it at the actor's speed (no foot sliding), cross-fades between clips keeping the stride phase, blends
            the aimed arm, the head turn, flinches and the procedural fall over them, and plays a stretch or a
            yawn now and then over a standing idle. NPCs walk (1.7 m/s), the player jogs (3.2), companions match
            the player. Portraits stay procedural (a steady face). Evidence `docs/evidence/u4/clips/clip_*.png`
            (every clip front and side on the stage, `tools/qa/clips.cjs`) and `docs/evidence/u4/motion_*.png`
            (`tools/qa/motion.cjs`). Left for U4.2+: a captured death (CMU has only stunt falls; the procedural
            fall stays), getting up, turns in place, the UAL2 (CC0) gesture set if needed.
      - [ ] U4.2 Skin/cloth/hair materials and a sharper close LOD.
      - [ ] U4.3 Outfits per role and region, visual variance pass.
- [ ] U5 Camera and touch: one-finger turn, tap move, pinch zoom, two-finger pan, compass/recentre.
- [ ] U6 Naming bible and rename pass (ids stay; names change everywhere the player reads them).
- [ ] U7 Conversation system: memory, exhaustion, state-aware greetings, interjections, no loops; pass over trees.
- [ ] U8 Characters and relationships: motive bibles, arcs, romances rewritten; natural talk over exposition.
- Then B3.11+ resumes (the content tracker below is unchanged; the maps become places in the one world).

### 2d. The Unity game (owner decisions 2026-10-28; `docs/PORT.md` is the plan — read it)
**Pass 7 (owner, 2026-10-28): a redesign, not a port.** Keep only the narrative/thematic layer; rebuild the world,
every asset, the people, camera, UI, audio and the play systems to the highest aesthetic and functional standard a
modern Android phone runs (DOS2/BG3/Cyberpunk aspirational; Android the primary console). CLAUDE.md §2 has the
words; PORT.md §1 what is kept/redesigned, §4 the standard, device targets and asset strategy, §4a the phases.
P1 is closed as the narrative core (86 tests green). P2 in progress: P2.1 `docs/DESIGN_UNITY.md` written (the
redesigned game: camera, world, people, play systems, UI, audio, art direction, architecture; four spoiler-free
decisions listed for the owner in its §11). P2.2 done in the repo: the package set (Cinemachine, AI Navigation, Animation Rigging, Addressables,
Adaptive Performance, Localization, VFX Graph, Shader Graph, Timeline, Burst, Mathematics, Collections, Splines,
Cloud Diagnostics), the PlayMode screenshot tests (`Tests/PlayMode/ScreenshotTests.cs` → `unity/Screenshots/*.png`
uploaded by CI as the `Unity-screenshots` artifact), the CC0 texture library fetched by manifest
(`tools/unity/assets.py` → `unity/Assets/External/`, 31 materials at 2 K with stable GUID metas; not committed, CI
caches it), the code-built terrain test scene (`Editor/Build/TerrainTestScene.cs`: the Sallow's layers on a 512 m
terrain, captured as `terrain_iso` and `terrain_wide`), Blender 4.5 in the session scratch for the kit and people
pipelines. **Waiting on the owner:** copy `tools/ci/android.yml` over `.github/workflows/android.yml` again (it
adds the fetch step and the tests-and-screenshots job). P2.3 started: the shelter kit builder (`tools/unity/kits/{kitlib,shelter}.py`, 20 pieces as FBX with
stable metas, material slots bound to the library by `KitImportPostprocessor`), the material library builder and
sheet (`Editor/Build/{MaterialLibrary,MaterialSheetScene}.cs` → `materials_sheet`), the shelter corridor, bunk room
and cistern ring hall assembled in code (`Editor/Build/ShelterTestScene.cs` → `place_shelter_*`). The CC0 MakeHuman
data repositories are cloned in the session scratch for the people bake-off. People pipeline candidate A is built (`tools/unity/people/mh_build.py`: six bake-off people as Humanoid FBX with 69 face
and expression blend shapes each, eyes/brows/lashes/hair fitted from the MakeHuman proxies, textures beside them) and
all 28 captured clips are converted (`tools/unity/motion/cmu2fbx.py` → `Motion/*.fbx` Humanoid clips with loop and
root sidecars). The frontier kit (22 pieces) and the well-town street scene (`Test_Frontier`, three captures) join
the shelter kit. Run 6 (packages) and run 7 (people, motion, kits) build the APK.
Local Cycles sanity renders live in the session scratch (not the engine; geometry and fit checks only).
Run 8 (frontier kit, all clips) built the APK. P2.4: the owner's **wardrobe rule** (all clothing lore-consistent:
post-apocalyptic, cyberpunk, anarchistic) is recorded in CLAUDE.md §2 and DESIGN_UNITY §4; the bake-off people are
dressed from curated silhouettes and every garment texture is baked by our pipeline (`bake_cloth` in
`mh_build.py`: re-dyed, grimed, faded, patched, taped). The CC0 nature models are baked to phone budgets by
`tools/unity/models_bake.py` and committed as `.glb` under `Models/Nature/` (26; conifers become card trees in P3);
`Editor/Build/VegetationTestScene.cs` scatters them over the Sallow (`vegetation_iso` capture).
Run 9 (wardrobe, baked models, vegetation scene) built the APK. The owner's **hair rule** (gritty, functional,
no styled cuts or product) is recorded in CLAUDE.md §2 and DESIGN_UNITY §4. **`docs/BUILD_PLAN_V1.md` is the
binding hand-off plan to the v1 app** (written 2026-10-28 so the build continues at the same standard in any
session): the architecture to follow, every phase step by step, the hard parts specified (streaming terrain,
people, hair, wardrobe, motion, touch camera, combat, saves, shaders, performance, card trees), the verification
protocol, the pitfall log, the owner's open decisions and the next twenty steps. Also in: foliage cards baked
from the conifer and broadleaf scans (`tools/unity/kits/cards.py` → `Kits/Trees/tex/card_*.png`, root at the
bottom), `card:<name>` materials in the kit library, bark textures in the texture library, the people
postprocessor's slot-prefix fix, `docs/evidence/unity/` (Cycles renders of the bake-off).
**Local editor:** the owner has a Unity Personal licence. Once `UNITY_EMAIL` and `UNITY_PASSWORD` are set in the cloud environment (a Personal licence file is machine-bound and refused here),
every session runs the real editor with `tools/unity/editor.sh` (BUILD_PLAN §7.1a) and stops guessing through CI.
First use: `tools/unity/editor.sh test all`, read every capture, fix, then push.
**Local editor live (2026-10-28):** the owner's Unity account activates the editor in the session (Personal seat);
`tools/unity/editor.sh test all` runs the whole suite in about 3 minutes once the Library exists (first import
about 12). First local run fixed: people untextured (slot-name parsing), kit pieces lying flat (axis conversion),
three terrain scenes unbuilt (a partial texture fetch had emptied the manifest). All 87 EditMode and 8 PlayMode
tests pass locally with 23 captures. Known from the captures, to fix in the people and vegetation passes: eyes render
as pale blanks (cornea/iris material), hair breaks the hair rule (step 2), leaves render near-black and multi-variant
scans scatter as rows of identical plants (split the scans into variants in `models_bake.py`), the vegetation
camera sees the terrain edge.
**Unity practices (2026-10-28):** `docs/UNITY_PRACTICES.md` distils Unity's own documentation for this project
(headless editor, tests and captures, the import pipeline, textures, glTF, version control, URP mobile tiers,
terrain, streaming, characters, agent tooling) with sources, and is required reading after the plan. Applied at once:
every import post-processor has a `GetVersion`; test scenes load additively with teardown; captures use URP render
requests; the walking capture plays by state (it was frozen); kit meshes uncompressed; CI skips the Heavy category.
The plan's §6.Q lists the corrections that land in later phases (Vulkan/GLES tiers, 4 terrain layers per tile, one
skinned mesh per NPC, nature models to FBX).
**Plan revised for the in-session editor (2026-10-28):** `docs/BUILD_PLAN_V1.md` now has the working loop every
step follows (§7.0: compile checks → Blender if an asset changed → `tools/unity/editor.sh test all` → read the
full log → open every changed capture and judge it against §6.N → commit metas with the change → push; CI only
confirms and builds the APK), the machine's disk budget (§7.1), the current state (§2), the remaining P2 steps
(§5) and the next 24 steps to the end of P3 in order (§10). `editor.sh test <mode> <filter>` runs one test
class. The eyes' cause is found (the cornea shell maps onto a tiny transparent patch that mipmaps blur opaque;
fix in `mh_build.py`, §6.B.3). CI run 40663317991 showed the test job had run **0 tests** (GameCI passed the
`"!Heavy"` category with its quotes; plan §8): the workflow fix (unquoted category, a zero-test guard, the check
permission) is verified locally and pushed. **Run 40665386414 (8f0d8f6) is the first truly green CI run:** 87
EditMode + 7 PlayMode tests executed and passed (Heavy skipped), APK built in 7 minutes from the Library cache.
**Hair rule applied (plan §10 step 2, 2026-10-28):** p1 a dense crop and p5 a buzz, p3 balding (grey horseshoe, his
beard), all three painted into the person's own skin (`bake_scalp`); p2 a dull auburn work braid and p4 a tidy bun
(the rich), both re-coloured by `bake_hair`; p6 keeps her hair under a dust hood. Rejected after seeing them in the
engine: a messy crop whose fringe hangs over the eyes, long hair that pokes through the hood, a braid bun with a
styled sweep (plan §6.C.1). People textures 134 → 104 MB. Seen for later steps: p6's skin has bright red lips and her
mouth sits open (step 4, skin), eyes still blank (step 3).
**Eyes fixed (plan §10 step 3, 2026-10-28):** the cornea shell is dropped in `mh_build.py` (490 faces); people import
Blender's normals (Unity's recalculated ones turned the recessed pupil and the strand brows grey); eye material opaque,
smoothness 0.7; generated people materials are re-configured on every build. Portraits now show irises, pupils, dark
brows and lashes. Seen for later steps: in `people_motion_*` only p6 walks, p1–p5 stay in T-pose (check each avatar's
Humanoid mapping with `Diagnostics.Report`; a P2 fix before the verdict); p1's crop is glossy like wet skin (step 4:
matte stubble); p6's lips are bright red and her mouth sits open (step 4).
**Skin weathered (plan §10 step 4, 2026-10-28):** `bake_skin` gives each of the six their own 2 K skin with sun,
dirt in the creases, chapped desaturated lips, beard stubble and painted scalps, smoothness in the alpha (matte stubble).
Found on the way: every generated texture meta said "no alpha", so hair cards were solid sheets and skins read fully
glossy; the people and kit importers now take the alpha from the file. Still open for later: p6's mouth sits open (her
face shape; the red is the inside of the mouth), scars and tattoos (not built), the T-pose in `people_motion_*`.
**Walk captures fixed (2026-10-28):** five of six stood in T-pose because the scene builder recreated the animator
controller per person (each creation destroyed the previous one); all six walk now. Seen: the captured walk holds the
forearms raised in front (a retarget fault; plan §2 list, P4.4 at the latest).
**People weight (plan §10 step 5, 2026-10-28):** 102 → 66 MB (shared 1 K garment normals, normals 1 K, no sculptor
shapes on NPCs); per person in the build 7.8–10.6 MB + 5 MB shared, the rest is mesh (LODs in P4.1). Found and fixed
on the way: every mouth gaped once all animated (the rig's Jaw; merged into Head), every avatar then failed on the
stale bone map in the metas (now re-mapped every import; `editor.sh` prints `LOG PROBLEM` lines), portraits lost the
head (pose now held). MakeHuman ships 5 of the 14 expression units the plan wanted (P4 face work).
**Nature models and kits fixed (plan §10 step 6, 2026-10-28):** the 27 nature models are FBX now, 75 variants (from
the scans' own objects, rows cut at their gaps), our materials (leaves lit, not black), glTFast removed; sources live in
`.scans/` outside the Unity project. Found on the way: every kit piece and nature model lay on its side (the Blender
export's compensating root rotation, overwritten by every builder; an earlier "fix" never worked): fixed with
`bake_space_transform`, and the frontier town finally stands up in its captures.
**Scatter rules (plan §10 step 7, 2026-10-28):** the placement rules live in Core (`Core/World/Scatter.cs`: biome ×
slope × height × wash × noise, deterministic per seed) with 7 tests that run in both .NET and the editor; the vegetation
scene uses them (same scene as before). The eye-level capture no longer sits inside rising ground. The plants are still
sparse and small from the overview: density and clumping are P3.4's tuning.
**Card pines (plan §10 step 8, 2026-10-28):** `tools/unity/kits/trees.py` grows pines with Blender's Sapling (trunk
and branches) dressed in branch cards from the pine scan: three seeds, 1.8–1.9 K triangles each, 10.5–14 m. The
branch cards themselves were wrong (root at the top, dead wood in them: the black curls of the first preview) and are
re-baked for all four cards by a rewritten `cards.py`. The vegetation scene has a second tile, the Teeth, with pines
on the upper slopes from Core scatter rules; `vegetation_teeth` shows a pine clump with shadows from the game camera.
Open: per-tree hue variation (P3.4); a needle-litter ground texture for the Teeth (P3.2: the library's `forest` scan
is orange broadleaf litter).
**Playable builds** (owner asked 2026-10-28): `play-walkabout` → `play-ch1` → `play-act1` → `play-act2a` → `play-voices` →
`play-act2` → `play-story` (beta) → v1; the table with what each holds is in `docs/BUILD_PLAN_V1.md` §1.
**Fir, broadleaf and tree LODs (plan §10 step 9, 2026-10-29):** `trees.py` grows three species (pine, fir, broadleaf),
three seeds each, 1.4–2.4 K triangles; every tree is one FBX with three levels (the tree; the trunk and half the cards;
a crossed impostor of its own render) and Unity builds the LODGroup from their names. The broadleaf card was re-baked
smaller (the first one stuck out of the crown as sheets). A trees test scene shows the nine side by side and each
species' three levels (`trees_lineup`, `trees_lod`); `TreeAssetTests` checks the levels, budgets and textures.
**Addressables skeleton (plan §10 step 11, 2026-10-29):** five content groups (three kits, nature, materials) of
bound prefabs built before every player build; the bound prefabs and library materials are now committed (stable
GUIDs) and rebuild without a diff; smoke tests load a kit piece by address and the trees by label. Kit bundles hold
meshes only (textures once each, per material); library textures are 1K on Android.
**P2 closed (2026-10-29):** the verdict is in `docs/PORT.md` §5 and the evidence in `docs/evidence/unity/p2/`. People:
candidate A, whose faces pass; the hair and garment assets that fail (a braid that reads as a fringe, a hood that reads
as a cap, hair cards that read as shells up close) are P4's. Terrain tiling is P3.2's, scatter density P3.4's. The
Unity CLI was evaluated and not adopted (`editor.sh` stays).
**P3 started — the world's map (plan §10 step 13, 2026-10-29):** `tools/unity/world.py` turns the content's world map
into the 24 × 16 km world (32 m to the km): a control map of base height, roughness, biome and water (sea along the
west, the Wet's river), 32 places with footprints and elevations, the roads, the Line and the river. Core reads it
(`WorldGrid`, `ControlMap`, `WorldLayout`, 7 tests on the real files); the game's `WorldService` loads it from
StreamingAssets.
**Runtime terrain (plan §10 step 14, 2026-10-29):** chunks are generated from the world data on a worker thread and
written to Unity terrains once: ridged mountains in the Teeth, dunes and mesas in the Sallow, roads levelled along the
ground, places on pads cut into the land; chunks meet without seams. The relief styles are a second control map
(`style.bin`) blended across region borders. Known faults, next for step 17: the ground textures tile visibly, the
Teeth palette reads as sand, and the palette changes at biome-changing chunk edges.
**Streaming (plan §10 step 15, 2026-10-29):** the world streams round a moving focus: 5 × 5 chunks built, the ring
beyond prepared on worker threads, terrains pooled and created ahead, one chunk written a frame (median 10.5 ms in the
editor). Chunk terrains have no collider yet (the terrain physics module is added when walking needs it).
**Rendering tiers (plan §10 step 16, 2026-10-29):** Vulkan phones get Forward+ and the GPU Resident Drawer, GLES3
phones plain Forward, chosen at boot by graphics API; the editor and CI render the GLES3 tier.
**Terrain surfaces (plan §10 step 17, 2026-10-29):** the ground no longer tiles: the terrain uses our own copy of
URP's terrain shader that reads each texture twice (turned and rescaled) and varies the ground's brightness in broad
patches, and the texture tool takes the large blotches out of every ground texture and grades the warm ones, so the
Sallow is pale straw rather than orange. Biome borders blend softly across chunk edges (no seam; up to eight layers on
a border chunk). New sources for sand, snow and rock and a stony ground for the Teeth. Captures near and mid in
`docs/evidence/unity/p3/`. Roads still carry no surface (step 17b).
**Road surfaces (plan §10 step 17b, 2026-10-29):** roads, tracks and the Line now carry a surface: strip meshes laid
on the levelled ground with ragged verges; the old asphalt is broken in patches where the sand shows through; tracks
are stony trails. Road cuts through the Sallow's dunes are gentler (no more cliff-painted banks along every road).
**Day and weather (plan §10 step 18, 2026-10-29):** a world clock (a day in 24 real minutes), the sun on its path
and the moon at night as the one shadow-casting light, a procedural sky (gradient, sun, stars, moon, drifting clouds)
whose horizon fades into the fog so the edge of the streamed land never shows, and weather by region and day (clear
most days in the Sallow; haze, dust, storms, rain, fog and snow where the climate gives them) with rain, snow and
blown dust in the air. Regions' weather blends across borders; a change of weather comes in before dawn. Captures at
7:00, 13:00, 19:00, night, in dust and in rain in `docs/evidence/unity/p3/`.
**Props (plan §10 step 19a, 2026-10-29):** the land round the player now carries its trees, boulders, dead wood and
big bushes, placed per chunk by biome rules (clear of roads and towns) and streamed in over a few frames; the Teeth
are wooded with pines and firs. The Sallow still looks bare: its cover is scrub and stones, which come next as
terrain details.
**Small scatter (plan §10 step 19b, 2026-10-29):** stones, pebbles, twigs, dry grass and ferns now lie on the ground
as instanced terrain details (tens of thousands a chunk, drawn within 75 m); grass and leaf scans keep their cut-out
alpha (the fetch had lost it). From the game camera they are still too thin to read: the Sallow needs real bushes.
**Low vegetation (plan §10 step 19c, 2026-10-29):** the Sallow now reads as a scrub desert from the game camera:
grey-olive saltbush and grey-green needle bushes in clumps a metre or two apart (lumpy mounds made of leaf cards, each
plant a little different in colour), bigger dark bushes in the washes, dry grass tufts between them, all swaying a
little in the wind and drawn out to 150 m (the scrub used to stop in a line across the top of the frame). A new
foliage shader shades each bush as one mound and darkens its heart and base. From the 200 m view the ground is still
bare past the drawn range (a far representation is a follow-up). Captures `world_scatter_sallow`, `_close`,
`world_scatter_teeth` in `docs/evidence/unity/p3/`.
**The first town (plan §10 step 20, 2026-10-29):** Shale now stands in the streamed world, built in code from its
layout: fourteen buildings (adobe houses with parapets, vigas and spouts; the timber saloon with a patchwork tin gable
and a porch; scrap sheds of mismatched sheets under lean-tos; the brick lock-up with its cell; the concrete hall),
doors (some ajar) and windows with shutters, patched flat roofs with barrels, crates and a tank on them, fences with
gates, beaten-earth streets, the map's props from a new furnishing kit (bar counters, beds, cots, shelves, sandbags, a
hand pump, tents, a car hulk and more), clutter against the walls, awnings over street doors, its lights and every
marker the game needs. Walls and roofs show grime from the ground, streaks and sand on their tops. The town is put in
by address when the player comes within 600 m, and its walking mesh is built on the spot: a walker crosses from road
to road and goes in through the saloon's door to the bar. Roads now stop at the town's edge instead of running to its
centre. Captures in `docs/evidence/unity/p3/place_shale_street_square_wide.jpg`. Still to do: the town is sparse in
its open ground, it costs too many draw calls for the older phones (merge on measurement, step 24), roads should come
in at its exits, lights on at dusk.
**Interiors open (plan §10 step 21a, 2026-10-29):** walking into a building opens it at once: its roof, doors and
shutters stop drawing (their shade stays, so sunlight falls through the windows onto the floor) and its walls are cut
away to about a metre, with dark tops where they are cut, so the room is seen from the usual camera; walking out
closes it again. Capture `place_shale_saloon` in `docs/evidence/unity/p3/`.
**The shelter under the ground (plan §10 step 21b, 2026-10-29):** Cistern 9 now lies ten metres under its mouth: the
door in the mouth's concrete front opens onto a ramp tunnel that runs down to the vault door and the shelter's halls,
built from its map. Stepping inside opens the whole shelter: the surface (ground, roads, plants, the mouth itself)
goes away and the rooms are seen from above against the dark, ceilings off and walls cut low. The ground is cut away
over the tunnel's mouth. A walker goes from the commons up the tunnel to the road out. The rock round the mouth is now
a heap of real boulders, and walls two tiles thick are solid blocks. Captures `place_c9_mouth_shelter_hall.jpg` in
`docs/evidence/unity/p3/`.
**Water (plan §10 step 22, 2026-10-29):** the sea now lies along the whole west coast and the Wet's river runs from
above the timber town down past the dam and the river landing to the sea: murky olive-grey water, clearer in the
shallows where the bed shows through, teal where it is deep, rippling and drifting downstream, the sky and the sun
glinting in it, a thin lace of foam where the sea runs up the sand. The river falls steadily in a bed cut for it; its
banks bend and its width changes along the way; it starts as a stream. Nothing grows in the water. The water is
hidden with the ground while the player is under it. Captures `world_water_*.jpg` in `docs/evidence/unity/p3/`. Still
to do: bridges or fords where roads cross the river (a road dips into the water today), the flooded under-city's water
(with that place), wet sand at the waterline.
**The world in the app, with a measuring overlay (plan §10 step 23, 2026-10-29):** the app no longer stops at its title
card: after loading it raises the world round Shale (ground, plants, props, water, the town, the sky) and the game
camera tours four views for 20 seconds each, turning slowly: the main street and the square from the widest zoom,
inside the saloon (opened), and the town's edge over the scrub. A three-finger tap shows or hides the measuring
overlay (shown at start in this development build): frame time, CPU and GPU time, draw calls, triangles, memory, what
is loaded, the rendering tier, the phone, and a table with each view's mean, 95th-percentile and worst frame and its
draw calls. The APK is now a development build. **For the owner (step 24):** install the APK from the latest green
Android run, let it run one full lap (about a minute and a half after the world appears), take a screenshot with the
overlay showing and send it (on Vulkan, the default; the tier line says which).
**The walkabout (plan §10 step 25, 2026-10-29; playable build `play-walkabout`):** the app now sets you down at the
edge of Shale as a stand-in (one of the trial people, in a long coat) and you can walk: drag one finger to turn the
camera round (it keeps turning a little when you let go), pinch to come closer or pull back, two fingers to look
across the ground, tap the ground to walk there (far taps jog), double-tap your figure to bring the view back to
them. Walking into a building opens it. The other five trial people stand about the town, idling. The world streams
round you as you walk. The measuring tour is now a button under the overlay ("measure (tour)", then "walk" to come
back). **For the owner:** install `play-walkabout` (the release page of the tag, or the APK from its Android run),
walk round Shale and out into the scrub, and send impressions and the overlay's tour table (three-finger tap, the
button, wait for a full lap of about 80 s, screenshot). Known gaps: the people are the trial models without their
final hair and clothes (P4), no long-press pin or compass yet, you can wade the river.
**People with levels of detail (P4.1a, 2026-10-29):** the trial people were far too heavy for a phone (95–141 thousand
triangles each; their eyebrows and eyelashes alone were tens of thousands of hair strands). Each now comes in three
levels: the full person for close-ups, a ~6 thousand triangle version for the game camera and a ~2 thousand one far
off, switched by how big they are on screen. The people descriptions are now data files the pipeline reads.
**The cast (P4.1b, 2026-10-29):** 32 people built from a data file of roles and regions (labourers, raiders, a
deputy, rail crews, salt workers, fishers, timber and dam people, miners, scavengers, Tollmen, the Choir, a mender, the
megacity's poor and rich, a rider of the Wheel), each with the three levels of detail and about 6.7 MB on disk. Garments
whose own textures carried prints or logos are washed plain in the bake (wardrobe rule); robes hide the skin under them;
hats get hair that fits under them. Ten of them now stand about Shale in the walkabout instead of the trial people. CI
run 54 failed two world tests because the Boot screenshot test left the app running into later tests; every test that
boots the app now clears it (pitfall logged).
**The player's face (P4 step 2, 2026-10-29):** the player now has two bases, each carrying the face sculptor's 35
sliders (head shape, brows, eyes, nose, cheeks, mouth, chin, ears, neck) and an "aged" version of the same face for the
photograph. Hair, brows, eyelashes, eyes and collars follow the face as it changes, at close range and at the game
camera. A reroll draws a face with six to ten strong features and always lands visibly far from the last one. The
sculptor screen itself comes with the other screens (P5). Hair seen up close showed two braids sweeping a fringe over
the forehead (against the hair rule), and eight of the cast had them: re-haired (tied back or buzzed). Our own hair
for the rule's other forms (work braids, rough buns, uneven crops) is a follow-up.
**The player's wardrobe (P4 step 3, 2026-10-29):** the player's clothes are now separate pieces put on and taken off
while the game runs (a top, trousers, boots, a long cardigan over them, a knitted hat), one per slot, each following
the body, its levels of detail and the sculpted face; the skin under them is hidden so nothing pokes through, a hat
takes the hair off, and a garment can be dyed. Seen in `docs/evidence/unity/p4/people_wardrobe.jpg`. Still to come:
grime and wear changing at runtime, body-shape sliders, and NPC outfits merged for speed.
**People that stand on the ground and live a little (P4 step 4, 2026-10-29):** each person now idles their own way
(four captured idles), and now and then gestures (talks, argues, drinks, waves, stretches, yawns) while standing; feet
meet sloped and uneven ground instead of sinking or floating (`docs/evidence/unity/p4/people_motion_slope.jpg`: in
front planted, behind not). The townsfolk in Shale and the walker carry both. Still to come: turning on the spot and
side-steps (no clips yet).
**Falling (P4 step 5, 2026-10-29):** people can now fall as a body (a push, a blow, a death), land on the ground and
lie there, and get back up (`docs/evidence/unity/p4/people_ragdoll.jpg`). The getting up is a quick blend for now;
a captured get-up motion comes later.
**Portraits (P4 step 6, 2026-10-29):** anyone's portrait is now drawn in the game under a steady studio light, kept, and
shown at once when asked again (`docs/evidence/unity/p4/people_portraits.jpg`). Seen in them: the one hair left that
the hair rule allows is a neat bun from behind (not rough), eyebrows read as dotted, darker lips come out lilac, and
the aged face needs aged skin. Those are the people's next quality items.
**Hair of our own (P4 step 7, 2026-10-29):** the game now makes its own hair in the hair rule's forms: a rough bun,
a work braid, an uneven crop, and long hair matted under a wrap. Each is a layer lying on the scalp whose hairline breaks
up into strands, with locks, a knot or a plait on top. It fits any head the face sculptor makes. Eight of the cast and
both player bases wear it now (`docs/evidence/unity/p4/people_hair.jpg`); one of the found buns is kept. The dark
triangle seen under one eye in the hair test was the nose's shadow from a sun at the side, not a fault in the face.
**Natural motion (P4.8, 2026-10-29, the owner's report: "arm motions look so unnatural, along with general body
positions"):** the captured motion itself was fine; the way it was converted for the game's skeleton was not. Every
large turn of a joint was being split into angles in the wrong order (arms reached forward, walks held the forearms up),
each clip measured itself against its own first frame instead of a standard standing pose (a walk against a stride), and
the people's joints had no twist spread. All three fixed and the 28 clips rebuilt: standing people let their arms hang,
walkers swing them low, the hands rest relaxed (`docs/evidence/unity/p4/people_motion_frames.jpg`). People now keep
their heads level instead of gazing up, and their feet sit on the ground instead of 1-2 cm above it.
**Faces (P4.9, 2026-10-29):** eyebrows are painted into the skin (the thin strand brows read as black dots and are
gone), lips take their colour from the person's own skin (no more lilac lips on darker skin), and the player's face has
an aged look for the photograph: lines, creases, tired eyes, spots, greying brows and stubble, and greyed hair, blended
in as the face is aged (`docs/evidence/unity/p4/people_portraits.jpg`).
**The interface begins (P5.3a, 2026-10-29):** the game's own interface now exists on the phone: a field-notebook look
(paper, ink, a rust mark), two typefaces (Barlow for the controls, Literata for the notebook), plates of dark glass for
what sits over the world, buttons sized for a thumb, and everything kept clear of the notch and the gesture bar. Screens
stack (a question over a page, back closes the top one) and a finger on the interface never moves the camera. The start
card is drawn with it. Seen in `docs/evidence/unity/p5/ui_foundation.jpg` and `ui_modal.jpg`.
**Words and the HUD (P5.3b, 2026-10-29):** the interface's words now come from a string table (English; another
language is a column away), and the walkabout has its HUD: where and when and what to do next at top left, a compass at
top right that turns with the camera, the party's faces and health at bottom left, and under the right thumb the notebook,
the map and the pack (hidden until those screens exist). Seen in `docs/evidence/unity/p5/ui_hud.jpg` and
`ui_hud_quiet.jpg` (nothing tracked, turned round).
**Acting on people and things (P5.3c, 2026-10-29):** a tap on a person or a thing now opens a ring of what can be
done with it (talk, look, take, use, steal, give, attack, as the game allows; what cannot be done now shows dimmed),
named at its centre and kept on screen whatever corner was tapped. In the walkabout the townsfolk answer it: talk and
the stand-in walks over, the person turns and talks; look and they meet each other's eyes and the person waves. Seen in
`docs/evidence/unity/p5/ui_radial.jpg` and `ui_radial_corner.jpg`.
**Conversations (P5.3d, 2026-10-29):** talking to someone now opens a page at the right of the screen with the
scene still beside it: their portrait and name, the line written out the first time (whole when heard before), what
your skills notice, and your choices with any skill check shown up front, met or not; what was said scrolls up as a
log. In the walkabout, talk to one of the townsfolk and their real conversation from the game opens. Seen in
`docs/evidence/unity/p5/ui_dialogue.jpg` and `ui_dialogue_log.jpg`.
**Conversations as scenes (P5.3e, 2026-10-29):** when a conversation opens the camera glides from the game view into
the scene: over your shoulder at the person you are talking to, then close on them as they speak, framed in the part
of the screen the page leaves free, never behind a wall; it glides back when you are done, and the HUD steps aside
meanwhile. Seen in `docs/evidence/unity/p5/conversation_twoshot.jpg`, `conversation_other.jpg` and
`conversation_player.jpg`.
**The notebook (P5.3f, 2026-10-29):** the field notebook is open: your quests (what to do next ticked off or not,
the journal under it), the leads and what they add up to, the people you have met, letters and the decisions you have
made, as a book on a dark desk. Track a quest from it and the HUD shows its next step. In the walkabout, talking to the
townsfolk can now start the game's real quests, which then appear in the notebook and on the HUD. Seen in
`docs/evidence/unity/p5/ui_notebook.jpg` and `ui_notebook_leads.jpg`.
**The map (P5.3g, 2026-10-29):** the world now has a real map, painted from the same ground you walk on: a
surveyor's sheet on paper with the regions in muted colours, the hills shaded, contours, the sea, the river, the roads
and the rail line. Open it from the HUD: drag and pinch it, see where you stand and which way you face, tap a place you
know for how long the journey there would take. Seen in `docs/evidence/unity/p5/map_sheet.jpg`, `ui_map.jpg` and
`ui_map_card.jpg`. Still to come: the local map of the place you are in, pins, and the journeys themselves (with the
systems, P6).
**The pack and barter (P5.3h, 2026-10-29):** open the pack from the HUD and your character stands on the left in a
pool of light, wearing what you wear: put on the leather duster and the coat is on them at once; drag across them to
turn them. Everything you carry is drawn in ink on the pages beside, by section, with how many and how worn; tap one
for its card, its figures set against what you have in hand or on your back (better in green, worse in red), and
equip, sling or use it. Stall-keepers in the walkabout can be traded with: their goods and yours priced on either
side, their face across the table, and a haggle you can see before you try it (your Barter against what it takes,
what you would win, what a refusal costs, the odds; once a day each). Seen in `docs/evidence/unity/p5/ui_pack.jpg`,
`ui_pack_worn.jpg`, `ui_pack_figure.jpg`, `ui_barter.jpg` and `ui_barter_haggle.jpg`. Still to come: things drawn
from real models once there are things to pick up (P6), and the wraps, goggles, plates and weapon in hand shown on the
figure.
**Clothes in layers (P4.10, 2026-10-29):** the player's clothes have a shader of their own: a coat now sits over the
shirt under it instead of the shirt showing through in patches, and each garment can be dirtied (most at the hem) and
sun-faded as the game describes it. Seen in `docs/evidence/unity/p4/people_wardrobe.jpg` and
`docs/evidence/unity/p5/ui_pack_figure.jpg`.
**Character creation (P5.3i, part 1, 2026-10-29):** the creation screen is in: pick one of the four Cistern origins or
make someone of your own, a name and pronouns; shape the face with the sculptor (35 sliders in nine groups, with the
face filling the frame, or roll another face); pick the body type, the height and the dyes of your clothes; take the
standard start or roll your attributes the old way (roll, keep, recall, then move points); tag three skills and take
up to two traits; begin. Seen in `docs/evidence/unity/p5/ui_create_who.jpg`, `ui_create_face.jpg`,
`ui_create_body.jpg`, `ui_create_attributes.jpg` and `ui_create_skills.jpg`.
**The look (P5.3i part 2, 2026-10-29):** a Look page in creation: the skin lighter or darker, rosier or warmer,
freckles; the hair's colour (dull, dusty, sun-bleached or greying); the eyes'; a scar (eight, from a split brow to a
burn on the jaw) and a tattoo (eight, from a Cistern number on the neck to a tally on the cheek), all on the live face.
Seen in `docs/evidence/unity/p5/ui_create_look.jpg` and `ui_create_look_face.jpg`.
**Body and hair (P5.3i part 3, 2026-10-29):** creation is complete: the Body page has leaner or heavier and softer or
harder worked (the clothes and the hair follow the body), and the Look page has five hairs (shaved, cropped short,
tied in a bun, a work braid, matted), each recoloured by the hair colour and greyed in the photograph. Seen in
`docs/evidence/unity/p5/ui_create_body.jpg`, `ui_create_look.jpg` and `ui_create_hair.jpg` (every hair on both bodies).
**Title, settings, saves and pause (P5.3j, 2026-10-29):** the app now opens on a title over the world as it comes
in: continue (your last save, who, where and which day), a new game (character creation, then you are set down in
Shale in the body you made, dressed as you dyed them), load, settings. Settings: four text sizes that re-set every word,
high contrast, how far and which way a drag turns the camera, difficulty (enemy aim and damage only), combat speed,
skipping lines already heard, autosave. Saves: an autosave as a game begins and whenever the app goes to the background,
a quicksave and three slots by hand, each with a picture of the scene; loading puts you back where you stood with the
camera as it was. The menu button (top right, under the compass) or the back gesture pauses: time stops; save, load,
settings, or back to the title. Seen in `docs/evidence/unity/p5/ui_title.jpg`, `ui_settings.jpg`,
`ui_settings_large.jpg`, `ui_saves_load.jpg`, `ui_saves.jpg`, `ui_saves_overwrite.jpg`, `ui_pause.jpg` and
`walkabout_player.jpg`. The measuring tour (step 24) now runs from inside a game: begin one (or continue), then the
three-finger tap and its button as before.
**Photo mode and the pad (P5.3l, 2026-10-29):** photo mode, from the pause (or P): the world stops, the camera is free
round you (closer, lower and higher than in play, a wider or longer lens, on your face or the whole of you), you can
set the hour for the light, make a face (still, half a smile, a grin, hard, wary, worn out, a sneer, a squint), frame
it (the screen, wide, upright, square) and take it: the picture is kept at 2560 px across with your photographs (on the
phone, in its gallery). A gamepad now plays: the left stick walks, the right turns the camera, the triggers zoom, the
bumpers turn the view a quarter, A acts on who is near, Y the pack, X the map, the view button the notebook, start
pauses; the keyboard too (WASD, Q/E, R/F, Space, I, M, Tab, P, F5/F9). Seen in `docs/evidence/unity/p5/ui_photo.jpg`,
`ui_photo_upright.jpg`, and two pictures photo mode kept, `photo_face.jpg` (evening light, half a smile) and
`photo_upright.jpg`.
**The town's things (P6.1 part 1, 2026-10-29):** the crates, shelves and lockers of Shale can be opened: tap one, you
walk over, and its things lie beside your pack; tap to take or put back, or take all. A locked one needs your Locks
(each try takes two minutes; picked, it stays open and earns XP; if it holds, the HUD says how far short you are).
What you leave stays there. The pumps, the signposts and the back room's bed say their piece when you look at them.
Seen in `docs/evidence/unity/p6/ui_loot.jpg` and `ui_loot_taken.jpg`.
**The camp (P6.1 part 2a, 2026-10-29):** make camp at any fire (Shale has four: tap one, you walk over), anywhere
under the open sky (the new camp button after the pack, K, or the pad's d-pad down), or in a bed of your own (the back
room, once it is yours). The notebook's camp page opens beside you and the world waits: rest an hour, four, a night, or
until evening (by day) or morning (at night), each rest wanting water and a long one food; hunt and set snares where
there is game (they keep, for days, where you set them); cook what is raw, mend what is worn with a repair kit, and in
a town write a letter to someone you have met. Each thing says what came of it, and the hour on the HUD and the sky move
on with it. Seen in `docs/evidence/unity/p6/ui_camp.jpg`, `ui_camp_done.jpg`, `ui_camp_write.jpg`,
`walkabout_camp.jpg` and the HUD with its camp button, `p5/ui_hud.jpg`.
**Things on the ground (P6.1 part 2b, 2026-10-29):** in the pack, choose something and drop it (one, or the whole
stack; keys and papers stay with you): it lies at your feet in a tied sack, where it stays (saved with the game), and
another thing dropped near it joins the same sack. Tap the sack to take from it: you walk over, stoop for it, and its
things lie beside your pack; empty it and it is gone. Seen in `docs/evidence/unity/p6/walkabout_ground.jpg`.
**Sitting (P6.1 part 2c, 2026-10-29):** tap a chair (the saloon has a few) and sit: you walk to it, turn and sit down
with your feet on the floor; walk anywhere and you get up first. When you make camp out of doors you sit on the ground,
facing the fire if there is one, and get up when you break camp. Seen in `docs/evidence/unity/p6/walkabout_sit.jpg` and
`walkabout_camp.jpg`.
**Bodies (P4.11, 2026-10-29, the owner's note on dimorphism and shape):** women and men now differ as they do in
life (women narrower in the shoulder with wider hips and a waist, slighter necks, wrists and hands; men broader in the
shoulder, narrower in the hip), and the cast spreads over real builds and heights (gaunt, wiry, lanky, stocky, broad,
pear, hourglass, a few heavier among the comfortable; men 162 to 189 cm, women 151 to 176), most of them lean. Your own
body starts from the same baseline. Seen in `docs/evidence/unity/p4/people_bodies.jpg` (every body front-on, before and
after), `people_cast_lineup.jpg` and `people_wardrobe.jpg`.
**Shale keeps its hours (P6.2 part 1, 2026-10-29):** the town's people now live by their routines on the world's
clock: each walks to where the hour has them (the sheriff patrols the street in the morning and keeps her desk at noon,
the factor his counter, the barkeep the bar into the night), goes home and in to sleep, or is away, and comes out again
in the morning; after a rest everyone is where the hour has them. Each wears a body of their own sex and near their age
from the cast (18 people, 18 bodies). Someone you talk to waits for you. Doorways are a little wider, and the rooms of
the town can now be walked into from the street (they could not before: a second, unjoined walking mesh). Seen in
`docs/evidence/unity/p6/walkabout_town_noon.jpg` (the sheriff at her desk) and `walkabout_town_night.jpg` (the bar).
**People come and go with you (P6.2 part 2, 2026-10-29):** every place now brings its own people, not only Shale:
Cistern 9's shelter folk are there when you come to it. People far from you are kept as plain records of where their
day has them; within about 120 m they step into the world, the nearest first, and within 60 m you see them in full
(their gestures, glances, feet on the ground); walk away and they quietly go again, always where the hour has them
when you come back. This keeps the phone's work to the people near you. Seen in
`docs/evidence/unity/p6/walkabout_people_shelter.jpg`.
**Sneaking (P6.3 part 1, 2026-10-29):** you can sneak now (the new button by the camp button, Ctrl, or pressing the
pad's left stick): you crouch low and go slowly, in captured motion. The people about see by the light that is
really on you: in the noon sun they see you from far off, under a roof or at night only close up, and a lamp gives you
away; nobody sees behind them or through a wall, and running is heard. Someone growing wary turns their head to
look at you, and the eye at the top of the screen fills as they notice, turning red when you have been seen. Also
fixed: nights in the game were secretly lit like day; now they are moonlit. Seen in
`docs/evidence/unity/p6/walkabout_sneak.jpg`.
**Whose things are whose (P6.3 part 2, 2026-10-29):** the town's crates, shelves and lockers now belong to whoever
keeps the room they stand in (the barkeep's shelf, the sheriff's locker, the factor's crate), and the loot screen
says whose a thing is and who can see you. Take from it while nobody watches and the owner only finds it gone; take
from it in front of someone and they remember, trust you less, and word of a thief goes round the town and down its
roads. The back room's locker becomes yours once the room is.
**Arms clear of the body (P4.12, 2026-10-29, the owner's note):** the hands no longer sink into the hips. Every body
is measured when the game is built, and after each frame's animation the arms are kept just outside the body and its
clothes, standing, sneaking and walking, for you and everyone near (6 cm in before; none now). Seen in
`docs/evidence/unity/p4/people_arms.jpg` (before | after).
**A new opening, designed (2026-10-29, the owner's note):** `docs/OPENINGS.md` studies how the great games open and
sets the rules for ours; the new beginning itself is written in the secret story plan (you no longer begin inside a
shelter: you begin with a home, a trade and people of your own). It is built into the content as P7's first step.
**Bodies as varied as in life (P4.13 steps 1-2, 2026-10-29, the owner's note):** people can now be made from two base
bodies and their own measurements, so the game can have as many people as it needs without a model each (the
townsfolk move over to it in the next steps; the creation and the lineup use it now). A woman's
bust runs from small to full and its lift falls with the years; seats, hips, waists, thighs, shoulders, chests, arms and
bellies vary; men and women are as tall as real people are (most men 168-182 cm, women 156-168, with the short and the
tall); bodies stay lean unless their owner is comfortable (merchants, the megacity's rich), and muscle comes with hard
work. Ancestry, age, skin, hair and greying follow who a person is. The arms stay clear of every one of these bodies.
Character creation gained the same body sliders. Seen in `docs/evidence/unity/p4/people_bodies_*.jpg` (front, side,
close). Also fixed: skin no longer shows through a sweater on a fuller figure.
**Everyone dressed for their trade (P4.13 steps 3-4, 2026-10-29):** every garment the game's people wear (117
pieces: shirts, sweaters, coveralls, robes, coats, boots, hats, hoods, masks, goggles, gloves) now fits both base bodies
and follows every body's shape, so anyone can wear anything that suits them. The townsfolk are now made this way:
each has their own body, face and stature, dressed by their trade and faction (a guard's vest and gloves, a pilgrim's
robe and sandals, the rich in silk and dark glasses), dyed and worn. Arms stay clear of the clothes too. Seen in
`docs/evidence/unity/p4/people_cast_wardrobe.jpg` and Shale in `docs/evidence/unity/p6/walkabout_town_bases.jpg`.
**Places alive with their own people (P4.13 step 5, 2026-10-29):** besides the named people, every place now has
its background people at their work: traders at their stalls, porters and settlers about the streets, the Choir's
novices in the orchard rows, scavengers among the fallen windpumps, salt cutters on the salt pan, gang hangers-on,
the megacity's crowds. Each has a first name, a face and body of their own, clothes for their trade, a spot or a
stretch of ground, hours (most go home at night) and a few words to say. Shale went from 18 people to 32. Seen in
`docs/evidence/unity/p6/walkabout_town_crowd.jpg`.
**Next action:** P4.13 step 6, the old per-person cast models retired (everyone is made from the two bases now), with
a lineup of 60 generated people as evidence; then travellers on the roads (5b). Then
P7's first step, the new opening, in the content. Then P6 step 4, combat. P6.3 left for later: shade outdoors by a
shadow ray (with the places' colliders, P6.4), noise by the ground, sight cones shown while sneaking, a crouched idle,
the steal verb on people. P6.2 left for later: the townsfolk sitting at their seats and sleeping in their beds (seats
and beds with owners), crowds yielding to the walker, doors that open for whoever walks through, the cast loaded per
region (Addressables), people on the roads. P6.1 left for later: doors that lock (with the door models), a share of a
stack by a long press, the search of the fallen (with combat). Blender and the MakeHuman assets are in the session
scratchpad, `blender/` and `mhc/`; if a fresh session lacks them, see `tools/unity/people/`. **`play-people` is released**
(2026-10-29, commit a62d94d: the natural motion, the generated hair, the faces;
https://github.com/jyp107991/second-face/releases/tag/play-people, `SecondFace.apk`, 338 MB development build).
Step 24 (the owner's measurement) waits on the screenshot (record it in PORT.md §5, then fix until Mid ≥ 30 fps).
Later playable builds: run the Android workflow by hand with `release: play-<name>` (its release job waits for that
run's tests and APK, then makes the tag and the release page; this session's git proxy refuses tag pushes; release
runs have their own concurrency group, so a push does not cancel them). P4 follow-ups, folded into later steps: NPC
outfits merged into one renderer (crowd cost), body sliders (with the sculptor, P5.3i), the cloth shader for the
cast (the player's garments have it, P4.10: layers, grime, wear); garment models import as people (Humanoid) and log "Invalid Avatar Rig Configuration" (harmless: the wardrobe
rebinds their bones by name; import them without an avatar); per-person walk variety (two captured walks). P5 (camera,
touch and UI) is under way, the road to `play-ch1`.
- [x] P0 Foundation (APK built by CI, run 5): decision recorded (CLAUDE.md, UPGRADE.md, PORT.md); .NET SDK in the session; content export
      tool (`npm run export`); `unity/` project (6000.3.27f1, URP mobile settings from Unity's own template,
      landscape only, immersive, IL2CPP arm64, Vulkan+GLES3); `Core` (pure C#: Rng matching the web sequence,
      ContentDb over the exported JSON), `Game` (Bootstrap: full screen, loads content, title card), `Editor`
      (ProjectSetup: creates the Boot scene, URP asset and player settings in code on load); `core/` .NET build
      + NUnit tests green locally; `core/Game.Check.csproj` compiles the Game assembly against the editor's
      UnityEngine DLLs (extracted from the Unity Linux archive into the session scratch space);
      `core/Editor.Check.csproj` does the same for the Editor assembly (URP types stubbed in `core/stubs/`).
      Owner did: workflows copied into `.github/workflows/`, licence secrets added. CI: Core green; Android
      run 1 stopped at the licence (expected), run 2 reached Unity's compiler (three fixes), run 3 failed on
      one missing `using UnityEditor.Build` in ProjectSetup (fixed, now caught locally by the Editor check); run 4
      got through compilation and failed on "Cannot build untitled scene": in batch mode `EditorApplication.delayCall`
      never fires before `-executeMethod`, so ProjectSetup's scene creation never ran. Fixed by committing the Boot
      scene as an asset (`Assets/SecondFace/Scenes/Boot.unity`, adapted from Unity's URP template: iso ortho camera,
      sun, the Bootstrap object), listing it in `EditorBuildSettings.asset`, committing `.meta` files for every asset
      (stable GUIDs), a `BuildGuard` pre-build check, and a malformed `applicationIdentifier` block in
      ProjectSettings repaired. **Run 5 (e775f3c) built the first APK**: artifact `SecondFace-Android-APK` on the
      Android workflow run (GitHub → Actions → Android → the run → Artifacts); sideload `SecondFace.apk` on the phone
      (allow installs from the browser/file manager). It shows the title card with the loaded content counts, full
      screen, landscape. P0 closes when the owner has it running.
- [~] P1 Core (pure C#) with ported tests. Done: P1.1 stats — `Core/Stats/{Rules,Sheet,Chrome}.cs`, the rules/
      chrome content model, `Content/Registry.cs` (typed registries from the JSON, strict-deserialisation check);
      the web stats, creation and chrome suites ported (18 tests green with `dotnet test core/...`).
      Also done: P1.2 items/inventory/barter/schedules; P1.3 game state, Cond/Effect logic over JSON, news and
      standing, leads, world events, factions, letters; P1.4 dialogue runner + checks + quest engine (every
      authored conversation opens on a fresh game: 347 trees, 54 quests, strict deserialisation); P1.5 world
      travel (moving camps, timetables, Dijkstra trips, discoveries) and saves (slots, atomic file backend,
      migrations v1). 54 tests green locally (NUnit pinned near Unity's 3.5 so API gaps show here first).
      CI: Core green; the first licensed Android build reached Unity's compiler and failed on three things now
      fixed (Input System 1.20.1 for Unity 6.3, the test assembly's Newtonsoft reference, NUnit `Is.AnyOf`/
      `ContainKey` not in Unity's NUnit). P1.6 combat rules (`Core/Combat/Rules.cs`: hit/crit chances,
      attack resolution, armour, turn order, morale, kill XP) and P1.7 roads and hunting (`Core/World/Roads.cs`:
      encounter eligibility and rolls, discoveries on a leg, hunts, trap yields) with their tests: 66 green.
      P1.8 the map model (`Content/Model/MapsModel.cs`, every authored map deserialises strictly) and the tile grid
      (`Core/Scene/Grid.cs`: walkable/opaque/cover from legend and props, rim stripping, A* with corner rules, line
      of sight); P1.9 the NPC model, outfits (`Core/Npc/Outfits.cs`: the role/faction dresser with the web game's
      exact random sequence), party helpers and NPC sheet/pack building (`Core/Npc/{Party,Outfits}.cs`): 86 tests
      green, every one of the 268 people builds a sheet and pack. Items' worn visuals are typed (`WearVisual`).
      The wardrobe and appearance-generator ports are paused: they describe the web figure, and the people
      pipeline is chosen in P2. **P1 is the narrative core and is closed**, except for rule changes the redesign
      asks for later.
- [ ] The remaining Unity phases are numbered and specified in `docs/BUILD_PLAN_V1.md` §5 (P2 bake-off closing, then
      P3 world, P4 people, P5 camera/touch/UI, P6 systems and combat, P7 Chapter One on the phone, P8 Act 1 and the
      megacity, P9 names/conversation/characters (U6–U8), P10 Act 2 completed (B3.11–B5), P11 Act 3 and the endings
      (B6), P12 systemic depth (B7), P13 release hardening (B8) = v1). **Owner 2026-10-28: v1 is the complete game**,
      so the Phase B slices below are built in Unity as P10–P13 (content still written in `src/content/`, exported).
      An older numbering here (P2 World … P5 Gameplay) is superseded.

## 3. PHASE B — build the complete game to a playable v1 (vertical slices)
Each slice ends playable and polished before the next starts. Definition of v1 done: creation → every
ending without dev tools; ~60+ h; validate + per-quest route tests green; saves migrate; perf budget on a
mid-range Android phone; deployed to Pages.
- [~] B1 **Chapter One slice** (B1.1 DONE: `maps/cistern9` + `maps/c9_mouth` from `tools/maps/gen_ch1.py`, MOTHER
      terminal/Archive door/hatch/body as prop dialogues (`MapDef.talk`), tile `triggers`, conditional exits and
      placements, `hostileIf`, dialogue events `fight`/`map`, new game starts in the Cistern with q_ch1_door;
      smoke `tools/qa/c9.cjs`. B1.2 DONE: `maps/shale` from `tools/maps/gen_shale.py`, 16 NPCs (`npcs/shale.ts`) with
      schedules/barks/merchants, first conversations + services (`dialogue/shale.ts`: room via `d_sh_room` → camp,
      Dust at the bar, healer event `heal`), 3 letters, Shale leads/conclusions. B1.3 DONE: `q_ch1_shale` (5 routes,
      tests). B1.6a DONE: field map `ui/worldmap.ts` (known places = visited + `loc_<id>` knowledge; trip planner;
      `Game.travelTo` passes time, runs timers/events, arrives at `from_<origin>` spawn; HUD ⌖ / key M; smoke
      `tools/qa/travel.cjs`). B1.4 DONE: `maps/overpass` (`tools/maps/gen_overpass.py`), 13 Rust Dogs (`npcs/rustdogs.ts`,
      camp-wide `hostileIf`), gate trigger conversation, `q_ch1_map` with 8 routes (buy/rifle/wager with a Dust prize/
      fear/terms/Wren steals/lift at night/Vasha's coup/exodus), `q_sh_prisoner` (Teo: pay/terms/pick/fight; comes home to
      the bar), Wren joins as companion; tests. B1.5 DONE: scheduled events `tribute_day`/`tribute_settled` (day 5; default
      outcome if absent), the party placed in Shale by condition, `d_tribute` (terms accepted / talk down / truck cut at the
      overpass / pay / sheriff pays / fight with the militia as `ally` units), Ada's terms + exodus decisions; tests;
      smoke `tools/qa/tribute.cjs`. B1.6b DONE: `q_ch1_name` — the map is read from the pack (`ItemDef.read` → notebook
      Read button opens a tree dialogue), four ways into the cipher (Science with cribs / origin / a key bought from
      Pike / Hollis), a 30-day timer the Act 1 slice resolves, HUD title card (`title` event) closes Chapter One;
      tests. B1.7 DONE: `tools/qa/ch1.cjs` plays the whole chapter through the real UI (clinic → Elder → door → mouth →
      field map → Shale → sheriff → overpass gate → Kessler paid route → Wren → Pike's key → Read from the pack → title
      card → Tribute Day paid → save/load round trip; ALL PASS, 0 page errors). Fixes from it: Escape leaves a
      conversation (first exit option), `MapDef.interior` (no setting out from inside the Cistern), map/notebook refuse
      to open over a conversation, chapter card waits for the conversation to close and sits on a dark band, audio
      ignores non-finite gain/pan. B1.8 DONE (owner request): equipment is visual — every item has an ink-sketch icon
      (`ui/icons.ts`, recipes inferred from held/wear/icon; validator requires weapons `held` and armour `wear`), worn
      armour and the active weapon change the body (`inventory/wardrobe.ts` builds the outfit from inventory + chrome;
      `Game.refreshPlayerLook` rebuilds the world figure when the wardrobe key changes; NPCs get the same at spawn),
      held weapons are procedural meshes in a closed fist (`assets/human/weapons.ts`), new gear kinds (hard hat,
      scrap plates, chrome: eye/neural/forearms/legs/spine/skin) sit on the measured body (`HumanFigure.metrics`), a
      live draggable figure sits beside the Pack and Self tabs (`render/figureView.ts`, own renderer), the Self tab
      lists chrome by slot; smoke `tools/qa/wardrobe.cjs`. NEXT: B2 Act 1 (below).)
- [~] B2 **Act 1** (B2.1 DONE: Tollhouse 9 — toll-fort map `tools/maps/gen_tollhouse.py`, 11 Tollmen (`npcs/tollhouse.ts`),
      `q_a1_tollhouse` with six ways through the wall (pay / courier contract with a nine-day timer / forged pass from Teo or
      Perpetua / the chain-link at night / the gate terminal / Vasha's raid with Dogs placed as allies), `q_a1_ledger` (the
      ledger page → Ada or Pike), the outriders' confession, the debtor's cage, the caravan master; Act 1 starts when the
      first name is read (title card on a timer); `MapDef` exits take `if`; smoke `tools/qa/tollhouse.cjs`; tests
      `tests/a1.test.ts`. B2.2 DONE: Signal Hill — hill map `tools/maps/gen_signalhill.py` (track, terraces, a gully
      round the camp, the station, the mast), the Hollow (3), `q_a1_signal` (pay / board / speech / Wren / gully / fight;
      the relay's log, an identity choice, a grid-link route for `ch_neural_link`; `RouteKind` gains `chrome`),
      `q_a1_broadcast` (silence or amplify the voice that reads the second name; news reaches the overpass), the
      stranger's cot, the mast view discovers two places; smoke `tools/qa/signalhill.cjs`; tests. B2.3 DONE: the month —
      `q_a1_jonah` resolves on day thirty through the quest engine (three authored ways, each blocked by changing its
      conditions via Jonah/Dov/Issa/Nell/the Mender; the first unblocked one fires; all blocked = the first broken
      forecast; title cards; Ada and Jonah react after), the thirty-day timer now lives on the quest stage every decode
      route reaches, `q_sh_drills` (three days, pairs on the street), Ilya Strand (`npc_sh_17`, `dialogue/a1_shale.ts`:
      shame him sober, outshoot him, or talk him east; third companion), companions survive placement syncs, clothing
      sets replace covered layers; smoke `tools/qa/month.cjs`; tests. B2.4 DONE: Dry Wells — pump-station map
      `tools/maps/gen_drywells.py` (the track in, three dry wells, the water tower, scrap shacks, the pump hall with its
      bypass valve, a locked control room), the family in the shacks (`npcs/drywells.ts`, 5 + one guild engineer who
      appears after one outcome), `dialogue/drywells.ts` (13 trees: the rifle on the approach with six ways past, the
      matriarch and her key, the door, the console, the pressure panel, the valve, the diary), `q_a1_drywells` = the Act 1
      finale (restore by science or by the pump man's credential / break the governor / sell to Pike / leave it; each
      outcome changes Shale's pumps, Ada, news, rep, and who will walk you east; end card), `q_dw_ghosts` (Ada's yes or
      no, the road, or leave them), the Pump Hand origin's thread pays off at the console, `PassiveDef` takes `if`;
      smoke `tools/qa/drywells.cjs`; tests. **No day limits (owner)**: the month resolves when the finale does (no
      thirty-day timer), the courier packet has no clock, drills put pairs on the street at once, Tribute Day waits for
      the player (`WorldEventDef.at: { hour, where }`), all day-count wording rewritten. B2.5a DONE: the road —
      road encounters (`engine/world/roads.ts`, `content/world/encounters.ts`: ten for the Sallow, four passing things and
      six that stop the trip on a roadside map `tools/maps/gen_wilds.py` → `wild_track`/`wild_rough`, the cast in
      `npcs/wilds.ts`, the talks in `dialogue/wilds.ts`; `Game.travelTo` rolls each leg, `world.trip` holds the rest of
      the trip and the roadside map's exit continues it; `game.forceEncounter` for smokes), discoveries on foot (hidden
      landmarks near a leg found by Survival, DC by distance), camp hunting and trap lines (`engine/world/hunting.ts`,
      `MapDef.hunting`, items `c_meat`/`j_hide`), the windpump graveyard map `tools/maps/gen_windpumps.py` with its
      scavenger and valve house (`npcs/landmarks.ts`, `dialogue/landmarks.ts`); smoke `tools/qa/wilds.cjs`; tests
      `tests/roads.test.ts`, `tests/wilds.test.ts`. B2.5b+c DONE: the salt-pan wreck (`tools/maps/gen_saltpan.py`: the truck,
      the locked cab, the ring, the dormant machine as a new prop kind `hound_dormant`; `dialogue/saltpan.ts`; `q_sw_wreck`
      with wake-for-Shale / sell to Pike / keep; Ada reacts; Pike buys), the burnt orchard (`tools/maps/gen_orchard.py`,
      a world-map place north of Shale learned on arriving in Shale or from Calla; `npcs/orchard.ts` 5; `dialogue/orchard.ts`
      7; `q_orchard` Orchard Thieves: the wall, a night stake-out, four outcomes; Wren knows their names), the windpumps got
      a real `windpump` prop (lattice tower, vane, tail); the roadside spots sit in the arrival view; smoke `tools/qa/wilds.cjs`
      covers the patrol stop and trip continuation, a passing thing, a discovery, a hunt and traps, the machine, the stake-out.
      NEXT: B2.6 the Mender + chrome surgery, the Wheel, caravan escort basics.) B2.6 DONE (see §2b plan: the surgeon's
      table, the Wheel, the escort). B2.7 DONE: four Act 1 side lines — *Seed at Any Price* (`q_a1_seed`: Pike's errand,
      the Elder's vault or her trust, sell to the guild or plant it with the Choir), *The Choir Tent* (`q_a1_tents`: three
      patients on cots in Shale's mission, medicine or water and a splint, a secret on one of them that can be kept or
      reported to the sheriff, lay-healer rank), *Mags's Ledger* (`q_a1_books`: a readable item, a Barter passive finds
      what the second book hides, expose / squeeze / help / clean), *A Letter for Bram* (`q_a1_bram`: carried from the
      Cistern to Shale, answered by a daughter, three ways back). Engine: `Game.logicHost` now routes quest effects (road
      encounters, timers, dev runs), `game.devApply` for QA. Smokes: `tools/qa/act1_sides.cjs`; `tools/qa/act1.sh`
      runs every Act 1 smoke in order against one server (`SF_URL`), evidence under `docs/evidence/act1/`.
- [~] B3 **Act 2 part 1 — the road east and Meridian** (~20 h). Ordered as the player meets it (the Glass Flats
      beats come before the city on the critical path, so the next test version can be "Act 2 opening"; the other
      Act 2 wilds stay in B5). Each slice ends playable, validated, with a smoke; engine additions are listed where a
      slice needs them (content must not need engine changes otherwise).
      - [x] B3.1 **Ninebridge** DONE 2026-10-27: `tools/maps/gen_ninebridge.py` → `maps/ninebridge.ts` (72×44: the deck
            over a dry gorge with stalls along both parapets, the Span bar in a scrap hull, two container berths, the
            Exchange hall with its office and vault, the fallen ninth span crossed on planks, the toll post and porters'
            camp on the west bank, the auction block and cage on the east); cast `npcs/ninebridge.ts` (the Grand Factor,
            the auctioneer, the toll-warden, the porters' chief, the floor clerk, the deck captain, lot four, three
            stall-keepers, four guards, extras); `dialogue/ninebridge.ts` (27 trees); `quests/a2.ts` — the Exchange beat
            `q_a2_ninebridge` *Paper Futures* (started by every Act 1 finale outcome; five routes: buy the line, talk the
            Grand Factor into it, the ledgers by night or under the clerk's nose, the board, or the trader's word), sides
            *Lot Four* (`q_nb_auction`: bid, talk the room down, the auctioneer's box after dark, free / keep / resell /
            let go; a companion recognises her) and *Straps Off* (`q_nb_strike`: break it for eighty, carry alone, put the
            guild's own forecast in the porters' hands, or pay the tenth; sets the bridge rate); the fourth companion
            (an ex-trader at the Span: joins, reads two map names a night at camp, her own trade to unwind later);
            Tollmen ticket from the packet, hand from breaking the strike or selling the clerk; the packet is now
            readable (and opening it costs); berth A rents as a safehouse; Dust at the Span; items `items/story_a2.ts`;
            six leads. Tests `tests/a2.test.ts` (10). Smoke `tools/qa/ninebridge.cjs`, evidence `docs/evidence/b31/`.
            Perf note: ~265 draws with 25 people on the deck (Shale ~200); the budget pass in B8 must merge crowd
            figures or cap extras per map — logged in §6 backlog.
      - [x] B3.2 **Openfield** DONE 2026-10-27: `tools/maps/gen_openfield.py` → `maps/openfield.ts` (64×56: planted rows
            with every third row dying, the well on the green, the sky-shrine, seed store, the Elder's house and his
            son's hut, two long timber halls — the common hall with a hatch at its west end, the sick hall — the
            threshing yard, the refugees' tents, the open-sky burial ground under a dead windpump); cast
            `npcs/openfield.ts` (the Elder, his daughter at the shrine, his son in the rows, the healer, the
            seed-keeper, an old farmer, a yard hand from the Sump, two sick, the guild's buyer on the lane; the
            orchard's two thieves live in the tents if they went to the Choir); `dialogue/openfield.ts` (23 trees);
            `quests/a2.ts` — the beat `q_a2_openfield` *Every Third Row* (started when the Exchange beat ends; the
            Elder asks; five ways to the cause: the healer's diagnosis, a trough test, the night tracks, the old
            farmer's word, a stake-out at the well; then four ways to settle it — tell the father, keep the son's
            secret, hand him to his sister's people, or steel; the well runs clean after), sides *A Crate a Night*
            (`q_of_seed`: the tally, the yard key, the guild's buyer; expose, a cut, send the buyer packing, or dead
            seed sold at a living price) and *The Sky Rite* (`q_of_rite`: raise a cairn for someone lost → Choir
            rank 2 and a stone); the hatch under the common hall opens to the dead man's word (Door Watch origin)
            or to a sibling the daughter trusts — a cellar scene that names the stranger and what his people are;
            the fifth companion (the brother digging at the burial ground: joins with the Elder's blessing or after
            the rite, refuses if the son died; camp talk seeds his own road). Items (a worn forecast sheet, a cairn
            stone, dead seed, the Elder's letter); six leads. Tests `tests/a2.test.ts` (+8). Smoke
            `tools/qa/openfield.cjs`, evidence `docs/evidence/b32/`.
      - [x] B3.3 **Cistern 4 and the Sump** DONE 2026-10-27: `gen_sump.py` → `maps/sump.ts` (52×40: a drained concrete
            bowl over the storm tunnels, scrap cabins on the west rim, tents on the east, the guild runner's container
            on the south rim, the tunnel mouth under sandbags at the bowl's north end — an exit into Cistern 4);
            `gen_cistern4.py` → `maps/cistern4.ts` (46×31, the Cistern 9 plan forty years dead: collapses, dry
            hydroponics, the clinic, the council room with its Archive standing open, the dormitory and its cots, the
            commons, the pump room where the tunnel comes up; no living cast); `npcs/sump.ts` (two clan chiefs, the
            guild's runner, a child who knows a drain, guards and diggers for both rims); `dialogue/sump.ts` (23 trees:
            the mouth, the chiefs, the runner, the child; below, the great door, a crank generator and the caretaker
            terminal FOUR, the Archive, the diary, the clinic table, the supply pipe, the ration board, the cots, the
            council table); `quests/a2.ts` — the beat `q_a2_cistern4` *The Fourth Door* (started by every Openfield
            ending; down the tunnel by a chief's leave, the family name the Dry Wells people carry, coin, the drain a
            child knows, the dark, or force; proof by the caretaker, the order or the diary), sides *Two Clans, One
            Purse* (`q_sp_feud`: the runner's ledger; unite the rims, skim the purse, or take a side) and *To Whoever
            Comes* (`q_c4_diary`: carried for the city; completes in B3.4). Settlement `sump` (salvage camp) with the
            map; routes Ninebridge/Openfield ↔ Sump. Items (the runner's ledger, the relocation order, the diary, a
            real photograph); four leads and a notebook conclusion. The stilted-freeway landmark is deferred to B5.
            Tests `tests/a2.test.ts` (+7). Smoke `tools/qa/sump.cjs`, evidence `docs/evidence/b33/`.
      - [x] B3.4 **Meridian: the gate and the Precinct** DONE 2026-10-27: ENGINE — a `goto` dialogue event
            (`{ event: 'goto', data: { location, spawn, minutes } }`) moves between a place's district maps; districts
            are maps under the one world place (`world.at` stays `meridian`); the Loop is a platform prop whose board
            lists districts with fares and sends the tram by `goto` (only the Precinct exists yet; the rest read WORKS
            until their slices land). `gen_md_precinct.py` → `maps/md_precinct.ts` (72×60: the approach and the
            refugees' line outside a five-storey Wall, the gate booth and its lens, the avenue with a tram rail, the
            warden station with two cells, the records office, the hearing room, a licensed shop and clinic, two
            tenement blocks round a square with the curfew bell and the water post, the Loop platform, a storm drain
            under the Wall to a back lane); cast `npcs/meridian.ts` (the warden captain, the assessor unit, the gate
            sergeant, the booth clerk, a licensed doctor and shopkeeper, an old citizen, a woman in the line, wardens);
            `dialogue/meridian.ts` (21 trees); `quests/a2.ts` — the beat `q_a2_precinct` *The Face at the Gate*
            (started by the fourth-door proof; the lens knows the face and the file calls it something the clerk has
            never seen; six ways in: let the file admit you, stand the hearing with evidence (the dead doctor's
            letter cuts the check by 25), edit the file at the booth, the drain after dark, push with the crowd, or
            the cells — bail, serve, the file, or the captain's grey), sides *The Citizenship Exam* (`q_md_exam`: five
            questions, three right) and *Unpaid Fines* (`q_md_fines`: fined in advance for three forecast offences;
            pay or contest for the Court); *To Whoever Comes* completes at the assessor's desk; the sixth companion
            (the assessor and its unlawful log of the Plan's errors: joins after the diary or the order; camp talk
            seeds its deed). Wardens rank 1 'citizen' by card. Water rationing shows if the Sallow's pumps were
            changed. Items (citizen papers, a provisional pass, the fine notice and receipt); five leads. Tests
            `tests/a2.test.ts` (+8). Smoke `tools/qa/meridian.cjs`, evidence `docs/evidence/b34/`. Backlog: the
            assessor wears a sealed helm and grey skinsuit; a true machine skin for the humanoid rig is still to do.
      - [x] B3.5 **Old Market + the Brokers' board** DONE 2026-10-27: bazaar map `md_market` (the dead mall's court,
            the east street, the standpipe square, the Loop stop); the Precinct opened east to it, and both Loop boards
            sell seats both ways by `goto`. The Broker's hatch and the gigs board with five authored gigs (a case for
            the Exchange clerk, knit kits for Openfield's healer, lot seven off the block, a letter the captain refuses,
            a box in the Tanners' locker that Hesk can be paid to open), each delivered inside the existing trees and
            paid through the hatch. *The Haunted Kiosk* (wire / the boy / sell the tap / cut), *Old Market Riot*
            (talk / the captain turns the dial / stand with the queue / loot), Sato's forged card, chrome (Kuhn) and
            gun (Galt) merchants; ten named NPCs + extras. No engine work was needed: the board is a dialogue and the
            gigs are quests. Deferred to §6: templated gigs and a notebook gig tab. Tests `tests/a2.test.ts` (+10).
            Smoke `tools/qa/market.cjs`, evidence `docs/evidence/b35/`.
      - [x] B3.6 **The Sink** DONE 2026-10-27: ENGINE — a `water` floor kind (dark, glossy, scummed; deep water is a
            legend tile with `blocks`). Flooded under-city map `md_sink` under the Precinct (a dry shelf with the tally
            wall, the basin with grate stilt-walks, the pump house on its pad, the clinic on the south shore, the organ
            broker's container, the Pale's hold, shanties on stilts), reached by stairs from the Precinct's back lane
            and Old Market's square. Ocho's free clinic (surgeon; the Menders' Code is joinable by holding a clamp
            steady through a fitting). *High Water*: the relief schedule and the spring line; resolved by a variance
            (the assessor in the party, or the captain with the schedule in hand), by retiming the dial (the keeper's
            leave, a warden's card or a sneak at the count), or by taking the pump house with the Pale. The flood
            itself, if nothing is done, resolves on a later story milestone (no day limit). *Organ Run*: a heart from
            Vash's cold box, from the Pale's cold store (paid open or picked), or a dark-chrome Second Heart; Ocho asks
            where it came from, the patient decides. Fifteen named NPCs + extras. Tests `tests/a2.test.ts` (+10).
            Smoke `tools/qa/sink.cjs`, evidence `docs/evidence/b36/`.
      - [x] B3.7 **Lantern Row** DONE 2026-10-27: ENGINE — pit bouts on the real combat system
            (`{ event: 'fight', data: { pit: { win, lose } } }`: you and the other fighter only, fists and blades only,
            nobody dies; both stand back up and the stake pays by effects; crowd morale deferred) and reveries
            (`{ event: 'reverie', data: { tree } }` plays a memory as a dialogue tree with a cold, washed, grainy picture
            until it ends). Map `md_lantern` on the canal (the Loop stop, the Gilt's bar, the Dust hall, the Velvet, the
            reverie den, the pit in its fence ring, two bridges and a boat), reached from Old Market's east street and
            the Loop (all three boards now sell seats). *The Pit*: the fixed undercard, Anvil against all comers, the
            house's dive. *Reverie of a Stranger*: the evidence reel (bought, traded for a memory of your own, or picked
            from the locker) and a playable memory scrubbed for three leads and a conclusion. Dust at the hall; a Masque
            chit in the house cage (B3.10 hook); the Gilt's invitation (B3.9 hook). Twelve named NPCs + extras. Tests
            `tests/a2.test.ts` (+8). Smoke `tools/qa/lantern.cjs` (fights the bout headless), evidence `docs/evidence/b37/`.
      - [x] B3.8 **The Stacks** DONE 2026-10-27: ENGINE — a bed of your own lets you camp indoors (`openCamp(force)` from
            the dialogue `camp` event). Three linked maps: `md_stacks` (the canyon street between two megablocks, the
            Loop stop, Block Seven's lobby with its market, committee office and stair cage), `md_stacks_9` (floor nine:
            the corridor ring round the dead lifts, flats, the laundry, the hermit in the shaft room, and 9-14) and
            `md_stacks_roof` (the tank, the Nines' allotments, the Twelves' hydroponic deck, the whole city in haze
            below). *A Flat in the Stacks*: key money, earned by settling the roof, or the seal broken and the committee
            faced after; the flat is a safehouse (rest, locker, letters, the Loop downstairs). *Rooftop Gardens*: the
            keeper's log, Lio's hours and the committee's signature (shared), the valve reset (shared), the pump's fuse
            or the valve wired west (the beds), the Twelves' case carried to the committee (the trays, with a Concern
            card as a hook), or the trays burned with Ren. The lifts' two-o'clock check and the warm shaft seed a lead.
            All four Loop boards now sell seats to each other. Thirteen named NPCs + extras. Tests `tests/a2.test.ts`
            (+8). Smoke `tools/qa/stacks.cjs`, evidence `docs/evidence/b38/`.
      - [x] B3.9 **Bridgeward and Turf** DONE 2026-10-27: map `md_bridgeward` (the chain from Lantern Row, the street of
            chop-shops, the toll chain and the Tenured's booth, the bridge deck ending in air over the dry river with
            the Docks across it, the Saints' mast and shrine of dead radios, the Rust Dogs' boarded garage, the Pale's
            hatch, the Rustmouths' hall); reached by the chain and the Loop (all five boards now sell seats to each
            other). The four gangs are joinable one at a time (the engine's group expulsion): the Rustmouths by tithe
            or a haul cut at the chop-shop, the Gilt by the warden-stamped ledger carried to Pip, the Pale by a vow
            that needs no chrome in any slot, the Saints by a vigil in the small hours. *Turf*: hold the chain for the
            Rustmouths (a word to Jax, or iron), pull it down with the Gilt, or a sit-down under the mast that splits
            it three ways before the Crown takes the near end. *Static*: the girl who says the city's lines; kept with
            Verity, or given to the captain (Precinct), sold to the Exchange (Ninebridge) or to the Concern's man (the
            Stacks). *The Old Haunt*: Fenn, the wall of names, the cache under the bench (Wren in the party, a word, or
            a pick), and the chalk that says the Dogs mean to come back. Seventeen named NPCs + extras. Tests
            `tests/a2.test.ts` (+9, 231 total). Smoke `tools/qa/bridgeward.cjs` all green, evidence `docs/evidence/b39/`
            (headless perf: 165 draws, over the ~150 budget by the barrels and lamps; for the B8 draw-call pass).
      - [x] B3.10 **The Crown and the Masque** DONE 2026-10-27: map `md_crown` (the invitation car's lobby with a lens and a
            sergeant, the terraces under glass with a reflecting pool, House Vane's Masque hall, House Ashby-Crane's salon,
            Halden's portrait studio, the kitchens and the service lift down to Old Market, the parapet over the whole
            city). Heist-lite in content + one engine cond (`wearing`): five ways past the lens (a chit from the Row, a
            kitchen pass or the Concern's card or Exchange standing, the Velvet's clothes with a Speech check, the lens
            itself if it has filed your face, or over the wardens, which rings the bell and turns the houses' guards);
            conditional placements move the sergeant and the duellist once a door is open. *The Masque*: the Committee's
            Chair decided at the toast by a word at the lectern (Speech, with the lens, a house's clientage and House
            Lorne's word as mods), by a duel for either house (pit bouts, sabres), by a reel played to the room (the
            Crown turns on you), sold to the house or the Concern, or by a cup at the toast. *The Kidnapping*: a Broker
            gig off the Old Market board; the daughter paid; down the lift to the Velvet (she is placed there after),
            sold back to the house, or the marriage talked off. *Photographer's Studio*: the renderer and its queue; a
            print to keep, burn or hang (hung, the houses court a designate). The Madame dresses you; the den plays the
            reel. Thirteen named NPCs + wardens, guards and extras. Tests `tests/a2.test.ts` (+9, 240 total). Smoke
            `tools/qa/crown.cjs` all green, evidence `docs/evidence/b310/` (169 draws headless; B8 budget pass). The map is
            lit as an interior (its own ambient under the domes, no weather) so the terraces read at any hour.
      - [ ] B3.11 **Archive Spire and the Court of Accounts** (~2 h, after the upgrade U1–U5): the archive beats `q_a2_calendar` and `q_a2_spire`;
            the court (ENGINE: trial as dialogue with evidence; precedent flags); *Court Case: the Squatter*. Smoke.
      - [ ] B3.12 **Dead Ring, races, wrap** (~1.5 h): the ruined outer ring; buggy races (segments: push / hold / cut);
            the Loop complete; Meridian end-to-end smoke in `tools/qa/act2.sh`; PROGRESS; a second test version
            (`act1-test-2` → or `act2-test-1`) when the owner's Act 1 notes are folded in.
- [ ] B4 **Halcyon & the Skirts**: arcology, Skirts, the Shift, Contract, Spare Parts, the Leash, the
      Long-Lived; Concern chrome; 7th companion. ~10 h.
- [ ] B5 **Act 2 wilds**: Glass Flats (Ninebridge, Openfield, the Sump, Cistern 4), Rail Corridor (the
      Line, Junction, halts, rail bandits), Drowned Shore (stilt villages, Rigs, salvage dives), Teeth
      mines, Northern Wet (barges, Dam, timber), Ashlands (remnant machines); Long Night alliance. ~12 h.
- [ ] B6 **Act 3 + endings**: return, lockdown, Spire, finale, endings A–E + modifiers, epilogue slides.
- [ ] B7 **Systemic depth + presentation**: ruins templates, bounty/gig templates, rare encounters, music
      and ambience, title art, menus, credits, settings, tips.
- [ ] B8 **Balance, performance, deploy**: economy sim pass, difficulty, accessibility, Android perf
      budget verified, Pages deploy, v1 tag. (Now BUILD_PLAN P13: the release is the Android app, not Pages.)

### Content tracker (spoiler-free counts; update as slices land)
| Area | Maps | NPCs | Dialogues | Quests | Status |
|---|---|---|---|---|---|
| Cistern 9 | 2/2 | 10/10 | 10/10 | 1/1 | playable; shaft + door routes |
| Shale | 1/1 | 16/16 | 16/16 | 3/5 | playable; arrival, Tribute Day, the first name |
| Rust Dogs camp | 1/1 | 13/13 | 13/13 | 2/2 | playable; The Paper, Teo |
| Tollhouse 9 | 1/1 | 11/11 | 13/13 | 2/2 | playable; six ways through |
| Signal Hill | 1/1 | 3/3 | 7/7 | 2/2 | playable; relay, voice, gully |
| Dry Wells | 1/1 | 6/6 | 13/13 | 2/2 | playable; the Act 1 finale, the family |
| Act 1 wilds | 5/5 | 15/15 | 17/17 | 2/2 | playable; ten road encounters, discoveries on foot, hunting and traps, the windpumps, the wreck, the orchard |
| Meridian | 9/14 | 103/110 | 160/170 | 23/30 | the gate, the Precinct, Old Market, the Sink, Lantern Row, the Stacks (three floors), Bridgeward and the Crown playable; the Loop joins five districts, stairs the Sink, the chain Bridgeward, the invitation car the Crown |
| Halcyon/Skirts | 0/6 | 0/30 | 0/30 | 0/12 | — |
| Act 2 wilds | 4/14 | 38/50 | 64/80 | 9/16 | Ninebridge, Openfield, the Sump and Cistern 4 playable (counts approximate) |
| Act 3/endings | 0/4 | — | 0/10 | 0/5 | — |
| Companions | — | 6/7 | 0/7 arcs | 0/7 | Tamsin, Wren, Ilya, Odile, Ash, Nine can join; arcs later |
| Factions joinable | — | — | — | 0/9 | design pending |

## 4. Conventions and tools (keep current)
- Engine `src/engine/**`; content `src/content/**` (typed data; adding content never needs engine changes).
- Content registry `src/content/index.ts`; validator `scripts/validate.ts` → `src/engine/data/validate.ts`
  (every cross-reference, map walkability, build coverage via `content/rules/builds.ts`).
- Narrative data language: `world/logic.ts` (`Cond`/`Effect`), dialogue `dialogue/dialogue.ts`, quests
  `quest/quest.ts` (state-based objectives + `routes` for coverage), frontier systems `world/frontier.ts`
  (news, standing, leads/conclusions, scheduled events), chrome `stats/chrome.ts`, travel `world/travel.ts`,
  settlement types `world/settlementTypes.ts`, outfits `data/outfits.ts` + `data/garments.ts`.
- Humans: MakeHuman CC0 + community packs → `tools/mh/fetch_makehuman.sh`, `tools/mh/fetch_community.sh`,
  `python3 -I tools/mh/build_human.py <mh_data> public/assets/human <community_root>` (garments are lazy
  per-piece files under `public/assets/human/proxy/`), **then `npm run decimate`** (iso LOD indices; the
  runtime falls back to full meshes if they are missing). Credits in `docs/CREDITS.md`.
- Perf: `node tools/qa/bench.cjs <low|medium|high>` → numbers into `docs/PERF.md` before/after any perf change.
- Tests `tests/*.test.ts` (vitest). Scripted playthroughs: `tests/ch1.test.ts` pattern (`talk()` helper).
- QA renders: `tools/qa/*.cjs` (Playwright against the dev server; see file headers). Dev helpers on
  `window.SF` and `window.game` (see `src/main.ts`).
- Save format versioned in `src/engine/save/migrations.ts` (bump + migrate on any GameState change).

## 5. Half-finished work
(none) — the machine from the pan is not yet modelled in Shale's yard when it is sent there (flags and talk only);
add a conditional prop placement when props take `if` (A4 backlog).
## 6. History (compressed; details in git log)
M0 foundations · M1 systems I (stats, creation, inventory, combat, AI, audio) · M1.10 realistic humans
(MakeHuman pipeline, skin/hair/beard work, ancestry presets, haircuts as cards, community packs) ·
G1–G5 research-driven design + dialogue/quest engines + Cistern 9 opening · F1–F5 frontier systems + field
notebook UI · W1–W5 worldbuilding (cities, chrome, settlement types, world map/travel) + NPC variance
(layered garments, outfit roles, cloth shader, merged low-LOD clothes).
Engine polish backlog: tall interior walls hide a lot (consider wall fade); bundle ~1.1 MB (split later, PERF.md);
derive gossip road days from the world map in B2; draw calls over the mobile budget on crowded maps (Shale ~200,
Ninebridge ~265 at 25 people) — merge extras into instanced low-LOD figures or cap crowds by quality setting (B8).
Content backlog: templated gigs (couriers/bounties/rescues from a generator) and a notebook gig tab — the Broker's
board is five authored gigs for now (B3.5); an NPC handing over what sits in a container needs a `container` effect
(Hesk works round it with the engine's `unlocked:<map>/<container>` flag).

## 7. Notes for owner (how to run/test)
- Run locally: `npm install` then `npm run dev`, open the printed URL (add `?dev` on a deployed build for
  the DEV console).
- Deploy: add `tools/ci/pages.yml` as `.github/workflows/pages.yml` via the GitHub web UI; Settings → Pages →
  Source: GitHub Actions. It deploys `main` to `/second-face/` and the newest `act1-test-*` branch to `/second-face/act1/`
  (details in `docs/PLAYTEST.md`).
