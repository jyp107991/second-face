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
Engine is substantial (render, iso camera, turn-based combat + AI, stats/perks/chrome, inventory, dialogue,
quests, world logic, local reputation/news/leads/events, scheduled events that wait for the player, settlement
types, world-map travel, human figures with layered garments, equipment and chrome shown on the body, camp,
letters, Dust). Content: Chapter One and Act 1 through its finale are playable end to end — the Cistern, Shale,
the overpass, Tollhouse 9, Signal Hill, Jonah's month, Dry Wells (10 maps, ~60 NPCs, ~75 dialogues, 15
quests, ~80 items); three companions can join; the wilds (orchard, saltpan, windpumps, road encounters, hunting)
are in. Current work: the **A5 presentation pass** (owner feedback; A5.1–A5.6 done: in-world dialogue, masks out,
dimorphism, fluid movement and idles, background extras, weather and mood) — next A5.7 buildings, A5.8 bionics,
A5.9 immersion sweep — then back to **Phase B** (B2.6 the Mender and the Wheel, B2.7 the Act 1 wrap). Binding
owner rules: see `CLAUDE.md` §2 (no time limits; spoiler rule; not a Fallout clone; cyberpunk fusion).

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
- [ ] A5.7 **Buildings that read as buildings** (~4 h): buildings detected as wall components; roofs with overhang,
      parapet and clutter; wall faces by material (adobe: rounded tops, beam ends; scrap: overlapping tilted panels,
      corrugation; concrete: seams, stains, rebar; brick courses); doorways get lintels and frames, long walls get
      windows and awnings; ground edges blend, rubble and dust gather at walls. Before/after of Shale and the fort.
- [ ] A5.8 **Bionics that look like the future** (~2.5 h): chrome redrawn as segmented matte-polymer plating with
      brushed-metal seams and a thin emissive accent (amber old / red dark / cyan Concern): forearm sleeves and
      knuckle plates, shin plates, an optic ring with a lit iris, a nape port, a lit spine ridge, subdermal seams.
- [ ] A5.9 **Immersion sweep 2** (~3 h): `docs/IMMERSION_AUDIT.md` against Disco Elysium / BG3 / Pillars / Wasteland
      3 / Rogue Trader (camera, hover and prompts, feedback, sound, NPC reactions, lighting, UI motion); the top
      ten implemented (hover highlights, footsteps by surface, head-turn to the player, ambient beds, prompt text).
Total ~22 h. Then B2.6. v1 estimate = this + the Phase B remainder (~66 h) ≈ 90 h of build sessions.

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
      NEXT: B2.6 the Mender + chrome surgery, the Wheel, caravan escort basics.) Remaining: B2.6, B2.7 Act 1 side quests and
      the end-to-end Act 1 smoke. ~4 h.
- [ ] B3 **Meridian**: 9 districts, the Loop, Brokers' gigs (~25), the Masque, High Water, Static, Turf,
      Court of Accounts, citizenship hearing, Archive Spire, flat, fight pits, reverie dens, races,
      gambling, safehouse; gangs joinable; Ledger line; companions 4–6. ~16 h.
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
| Meridian | 0/12 | 0/60 | 0/60 | 0/30 | — |
| Halcyon/Skirts | 0/6 | 0/30 | 0/30 | 0/12 | — |
| Act 2 wilds | 0/14 | 0/40 | 0/40 | 0/16 | — |
| Act 3/endings | 0/4 | — | 0/10 | 0/5 | — |
| Companions | — | 3/7 | 0/7 arcs | 0/7 | Tamsin, Wren, Ilya can join; arcs later |
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
derive gossip road days from the world map in B2.

## 7. Notes for owner (how to run/test)
- Run locally: `npm install` then `npm run dev`, open the printed URL (add `?dev` on a deployed build for
  the DEV console).
- Deploy: add `docs/setup/deploy.yml` as `.github/workflows/deploy.yml` via GitHub web UI; Settings →
  Pages → Source: GitHub Actions.
