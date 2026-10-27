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
**Content building is PAUSED by the owner's directive of 2026-10-27 (pass 5): the upgrade in `docs/UPGRADE.md` comes first
(§2c below), U1 next; then B3.11.** Still open from the presentation
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
- [ ] U1 Foundation: CC0 asset pipeline (`tools/assets/`), PBR material library, blended terrain ground per map (no
      tile seams), real wall/roof materials, re-lit sun/sky/fog (lit palette; dust and sepia only as weather/mood),
      AO, soft shadows. Folded in: typefaces (no cursive), default outfit, reroll variance, portrait pre-warming. NEXT.
      U1a DONE (materials, blended ground, re-lit palette; evidence docs/evidence/u1); U1b (quick asks) and U1c (AO,
      polish) to go.
- [ ] U2 Open world: world coordinates, continuous terrain by region climate, places stamped at their positions,
      roads/rails, chunk streaming with detail rings, pathfinding over terrain, persistence, instant interiors, world
      map as a map, vehicles as fast travel, save migration. No exits, no loading screens.
- [ ] U3 Living world: biome vegetation and surviving greenery, rocks and ruins, real props, water and shores,
      weather by region, background life.
- [ ] U4 People: captured motion retargeted to the human rig, locomotion blending, skin/cloth/hair materials, close
      LOD, outfits per role/region, visual variance, cached portraits.
- [ ] U5 Camera and touch: one-finger turn, tap move, pinch zoom, two-finger pan, compass/recentre.
- [ ] U6 Naming bible and rename pass (ids stay; names change everywhere the player reads them).
- [ ] U7 Conversation system: memory, exhaustion, state-aware greetings, interjections, no loops; pass over trees.
- [ ] U8 Characters and relationships: motive bibles, arcs, romances rewritten; natural talk over exposition.
- Then B3.11+ resumes (the content tracker below is unchanged; the maps become places in the one world).

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
      budget verified, Pages deploy, v1 tag.

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
