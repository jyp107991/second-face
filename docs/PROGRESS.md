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
quests, world logic, local reputation/news/leads/events, settlement types, world-map travel model, human
figures with layered garments). Content is tiny: Cistern 9 opening (4 NPCs, 4 dialogues, 1 quest), 2 dev
maps, ~68 items, 64 perks, 15 chrome pieces, a 25-place map skeleton. Nothing beyond the test yard is
playable yet. Current work: **Phase A quality/depth pass → Phase B full v1 build** (owner direction, this
session). Engine decision: see `docs/TECH_EVALUATION.md` (recommendation: stay on three.js; owner to confirm).

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
      community skins 13 entries in `tools/mh/build_human.py`, hair contexts + RICH_DYES in `appearance.ts`): research + adopt better open resources (community skin packs skins01/02/03 full diffuse
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

## 3. PHASE B — build the complete game to a playable v1 (vertical slices)
Each slice ends playable and polished before the next starts. Definition of v1 done: creation → every
ending without dev tools; ~60+ h; validate + per-quest route tests green; saves migrate; perf budget on a
mid-range Android phone; deployed to Pages.
- [ ] B1 **Chapter One slice**: Cistern 9 map (cast placed, MOTHER terminal, maintenance shaft, exit), Shale
      (well-town map, ~12 NPCs incl. the plan's cast, saloon, sheriff, trading post, Choir tent, wells),
      Rust Dogs overpass camp; quests q_ch1_door/shale/tribute/debts/prisoner/map/oldface; 2 companions;
      first scheduled event; letters; barter; map screen with travel between the three. ~5 h.
- [ ] B2 **Act 1**: Tollhouse 9, Signal Hill, Dry Wells crisis, Burnt Orchard, salt pans; Shale/Rust Dogs/
      Tollmen/Choir lines to Act 1 end; 3rd companion; first Mender + chrome; world map with encounters,
      discoveries, camps, hunting/fishing; nomad camp (the Wheel). ~8 h.
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
| Cistern 9 | 0/1 | 4/6 | 4/6 | 1/1 | opening dialogues only |
| Shale | 0/3 | 0/12 | 0/12 | 0/5 | — |
| Rust Dogs camp | 0/1 | 0/6 | 0/6 | 0/2 | — |
| Act 1 wilds | 0/5 | 0/15 | 0/15 | 0/6 | — |
| Meridian | 0/12 | 0/60 | 0/60 | 0/30 | — |
| Halcyon/Skirts | 0/6 | 0/30 | 0/30 | 0/12 | — |
| Act 2 wilds | 0/14 | 0/40 | 0/40 | 0/16 | — |
| Act 3/endings | 0/4 | — | 0/10 | 0/5 | — |
| Companions | — | 0/7 | 0/7 arcs | 0/7 | design only |
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
(none)

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
