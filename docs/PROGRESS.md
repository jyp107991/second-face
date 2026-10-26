# Progress log (spoiler-free)

Read this first in every session. Update + commit + push after every step.

## Current milestone: M2 — Systems II

### M1 — Systems I ✅

### M0 — Foundations ✅
- [x] M0.1 Repo + CLAUDE.md + resume protocol
- [x] M0.2 DESIGN.md, ROADMAP.md, story plan (secret)
- [x] M0.3 Project scaffold, `npm run check`, deploy workflow (template in docs/setup/deploy.yml — owner must add via GitHub UI)
- [x] M0.4 Engine core: renderer, post FX, iso camera, atmosphere, input, grid/A*, location builder, humanoid, test maps
- [x] M0.5 Save/load (IndexedDB, versioned, 5 slots, export/import, thumbnails), dev overlay, menus

### M1 — Systems I
- [x] M1.1 Stats model: attributes, skills, traits, perks, derived stats, XP/levels (pure TS + tests) — `src/engine/stats/`
- [x] M1.2 Items & inventory model: item schema, weight, condition, ammo, equipment; validator coverage — `src/engine/inventory/`
- [x] M1.3 Face sculptor: parametric head (sliders, age), hair/scars/tattoos, body build; humanoid uses Appearance
- [x] M1.4 Character creation UI (name, appearance, attributes, tag skills, traits, summary)
- [x] M1.5 Combat rules: turn order, AP, hit chance, damage, crits, aimed shots, crippling (pure TS + tests) — `src/engine/combat/`
- [x] M1.6 Combat in scene: enter/exit combat, AP bar, targeting, aimed-shot UI, FX (muzzle flash, tracers, blood), floating text
- [x] M1.7 Enemy AI: utility scoring, cover, flanking, retreat-to-heal, flee/surrender, morale
- [x] M1.8 Wristlog UI (inventory, stats, equip, use items) — CRT style
- [x] M1.9 Audio: Web Audio synth (ambience beds, footsteps, gunshots, UI blips)

### M1.10 — Realistic humans (owner benchmark: Fallout 4 / Skyrim SE faces; approach: rendering upgrade; faces before gameplay)
Source: MakeHuman 1.2.0 CC0 assets (base mesh, targets, skins, rigs, eyes, brows, lashes, hair, teeth, clothes,
expressions). Fetch: `tools/mh/fetch_makehuman.sh <dir>` (scratchpad is ephemeral). No AGPL code used.
- [x] M1.10a Asset build script `tools/mh/build_human.py` → `public/assets/human/` (base mesh w/ UV split, macro
      targets PCA, sparse detail targets, modifiers, skeleton + weights, proxies, downscaled textures) + CREDITS
- [x] M1.10b Runtime `src/engine/assets/human/` (loader, morph, joints→bones, skinned body, proxy fitting, skin shader)
- [ ] M1.10c Replace Humanoid with HumanFigure (procedural anim on MH bones), Appearance → MH params, creator sliders
- [ ] M1.10d Visual QA close-ups + iso view, performance (LOD / draw calls), ageing for the photo

### M2 — Systems II
- [ ] M2.1 Dialogue engine (data schema, conditions, effects, skill checks, memory-aware options) + tests
- [ ] M2.2 Dialogue UI (talking-head close-up via PortraitStage, option list, check tags, history)
- [ ] M2.3 Quest engine (stages, state-based objectives, timers, journal) + Wristlog QUESTS tab + tests
- [ ] M2.4 NPC personality, memory, trust/affection, gossip propagation + tests
- [ ] M2.5 NPC schedules & ambient behaviour (time-of-day locations/activities, barks)
- [ ] M2.6 Factions & karma (respect/fear axes, labels, reactions) + tests
- [ ] M2.7 Barter UI + pricing (skill, reputation, saturation, merchant cash/restock) + tests
- [ ] M2.8 Economy simulation script (`npm run econ`) with budget tables
- [ ] M2.9 Companions core (recruit, follow, approval reactions, banter triggers, combat AI as allies)

## Next action
**Current step (owner: cyberpunk semi-overhaul; NPC variance; settlement variety; cities; map/transport):**
- [x] W1 Worldbuilding: docs/WORLD.md (public, spoiler-safe history/geography/cities/tech/culture) +
      story/WORLD_SECRET.md (hidden history) — BEFORE design changes
- [x] W2 DESIGN: bionics (+ Drift), city systems (districts, gigs, grid-riding, reveries), inequality as play,
      settlement types, world scale, transport & fast travel; ROADMAP re-plan
- [x] W3 Secret plot pass 3 (cities, corporation, bionics woven into the Plan story)
- [x] W4 NPC appearance variance — 125 layered community garments (lazy per-piece files, `ensureProxies`;
      `loadLocation` preloads what a map's cast wears), catalogue `data/garments.ts` (slot/fit/style/dye/hair),
      15 outfit roles `data/outfits.ts` (`dressFor`, palettes, grime/wear; NpcDef `role`, outfit optional), cloth shader
      (`assets/human/cloth.ts`: re-dye, fade/yellowing, hem-heavy dirt), hats crop/hide hair, lifestyle bodies + rare
      extremes, 1–2 distinctive face features + ~50 face modifiers, city hair dyes, painted face grime.
      W4b: low-LOD figures merge all garments into one mesh with a per-figure atlas (5–6 meshes per NPC, was 8–10);
      no face shadow casters at low LOD. QA scripts in scratchpad: garm.cjs, roles.cjs, meshcount.cjs, iso.cjs.
      Backlog: eyepatch piece; visible chrome comes with W5 bionics.
- [~] W5 Data models + validators:
  - [x] W5a Chrome engine `stats/chrome.ts` (8 slots, old/dark/Concern grades, mods + `chrome_*` ability flags via
        allMods/hasFlag, surgery risk & rejection, upkeep items `u_holdfast`/`u_powercell` + degradation, Drift baseline/
        settle/bands/episode chance), catalogue `content/chrome/catalogue.ts` (15 pieces), conds `chrome`/`chromeSlot`/
        `drift`, daily body tick in game (`dailyBody`), validator + tests. Not yet: Mender/clinic UI, ability effects in
        combat/maps, chrome visuals on models (eye glow, metal limbs), Drift dialogue content.
  - [ ] W5b Settlement types (engine table: layout kit, services, law, population role mix → `dressFor`), SettlementDef
        gains type/region/prosperity/owner/crisis; validator + tests
  - [ ] W5c World map model: regions, locations (major/minor/landmark), routes (terrain/danger), transport networks
        (rail/barge/caravan/Loop/safehouses) with schedules + fares, travel planner, fast-travel rules; tests

**Current step (owner: less Fallout, more creative modern frontier features; rework story core; notebook UI):**
- [x] F1 Docs: owner decisions (CLAUDE.md), DESIGN frontier systems (local reputation & news, leads board,
      scheduled world events, frontier justice, journeys), drop karma; reframe DESIGN §2 row 1
- [x] F2 Secret: rework the story's central truth (story/ only) + update Chapter One content to fit
- [x] F3 Field notebook UI replacing the wristlog (journal, people with sketched portraits, leads, map, gear)
- [x] F4 Systems: local reputation + news propagation, leads/deductions engine, scheduled world events
- [x] F5 Restyle panels to leather & brass (no green CRT). Later: proper title art, HUD icons.
- NEXT: Cistern 9 map with the cast placed (M3), MOTHER terminal dialogue, maintenance-shaft route, exit trigger;
  then Shale (first scheduled world event + news), frontier justice dispute, letters; perk flags into systems.

**Current step (owner: develop plot, functionality, dialogue, questlines; research acclaimed-RPG common denominators;
replayability, meaningful choice, viable builds, best perk/skill/attribute configuration):**
- [x] G1 DESIGN.md: research synthesis (§2), revised character system (12 skills, perks every 2 levels, skill
      mastery perks, deterministic visible checks, every skill/attribute used in dialogue), build archetypes,
      choice & consequence rules, replayability levers, build-coverage validation
- [x] G2 Code: skills 16→12, skill cap 100, perks every 2 levels, mastery perks, check rules; update tests/creator
- [x] G3 Secret story plan: full act/quest structure, faction lines, companions, endings matrix (story/ only)
- [x] G4 Dialogue engine + quest engine (M2.1, M2.3) with tests — world/world.ts, world/logic.ts (conditions/effects/timers),
      dialogue/dialogue.ts (runner), quest/quest.ts; save v3. UI + game wiring still to do (G4b).
- [x] G4b Dialogue UI (portrait stage, options with [Skill N] tags, passives, history) + journal tab + game wiring
- [~] G5 Chapter One content: Cistern 9 opening done (4 NPCs, 4 dialogues, q_ch1_door, key items) + scripted
      playthrough tests + build-coverage validator (content/rules/builds.ts, engine/data/coverage.ts).
      Next: Cistern 9 map (M3) with the cast placed, terminal dialogue (MOTHER), maintenance shaft prop route,
      exit trigger setting c9_left; then Shale content. Perks now 64 (verb flags declared; systems implement them as combat/dialogue features land).

**Current step (owner: facial hair blocky, stubble length/coverage off; wants real modern haircuts):**
- [x] S1 `strands.ts`: directional strand shells (screen-res tapered hairs, growth-direction + length fields, AA)
- [x] S2 `facialHair.ts`: zones + style table (stubble light/med/heavy, short/full beard, goatee, moustache,
      van dyke, chin strap) → strand shells; painted skin keeps only a faint follicle shadow; mesh beards dropped
- [x] S3 Haircuts as procedural hair cards (hairCards.ts traces cards along the scalp from haircuts.ts fields):
      crew, crop, side part, slick back, quiff, messy, pixie (curtains dropped: looked like a wig). Shell haircuts
      were tried and failed (long lying hair projects wrongly) — strands.ts is for facial hair only.
- [x] S4 QA close-ups, commit, report
  Known gaps: grey hair cards look cool/strippy under the blue rim light; beards slightly flat on the shadow side;
  long women's styles still use the older meshes.

**Current step (owner asked: realistic ethnic diversity, realistic hair, beard options incl. simple stubble):**
- [x] D1 Skin tone model: calibrated tone ladder (Monk scale) + undertone; ancestry presets (shape blend, tone,
      undertone, eye/hair colour, hair texture) drive randomAppearance; creator ancestry picker.
- [x] D2 Painted stubble levels (light / 5 o'clock / heavy); beard area built from mesh landmarks (skin.ts beardMask,
      verified with a red mask debug render front/3-4/side); '+' combos with moustaches.
- [x] D3 Hair: painted scalp layer (skin.ts scalpMask/paintScalp; soft hairline under meshes; shaved, buzz, fade,
      short coils, cornrows), hair mask in skin-texture alpha makes painted hair matte (shading.ts), sheen on hair
      meshes, ancestry style pools; pruned broken meshes (afro01, bun, faydaen, junglebook).
- [x] D4 Gallery QA (scratchpad faces.cjs, gal.py, sheet.py), commit, report to owner.
  - [x] D5 Owner feedback: moustache stubble full height (lip exclusion matched to mesh), no neck stubble, ashier
        stubble; volumetric afro-textured hair (coily.ts shells: coily_twa/afro/afro_big), African ancestries
        always get afro-textured styles. Perf note: big afro = 48 shells, portrait LOD only (iso uses 7).
  Known gaps: women's faces look alike/slightly masculine (face-shape variation), mesh hair edges still hard on
  some styles, few good long/curly hair meshes; awaiting owner verdict.

Face realism pass (owner benchmark FO4/Skyrim SE). Owner rejected procedural beards → switched to the
"automated middle ground": MakeHuman community packs (`tools/mh/fetch_community.sh`, then
`python3 -I tools/mh/build_human.py <mh_data> public/assets/human <community_root>`).
Done: artist beard meshes (layered with '+' in FACIAL_HAIR), Mindfront skin normal maps (DirectX → flipped Y;
strength scales with age/gender), Mindfront brows/lashes, community hairstyles (bad ones pruned after visual QA),
duplicate beard mesh bug fixed. Latest gallery: scratchpad gallery_v9 (regenerate via faces.cjs).
Next: owner verdict on the new gallery. Known remaining gaps: hair looks solid/matte (needs anisotropic spec +
better alpha), moustache centre seam, eye wetness/lip spec, faces look similar (more shape variation), no teeth.
Then: remove pruned assets from build_human.py + split human.bin into lazily loaded per-proxy files (35 MB),
LOD for iso view, expressions, wasteland clothing; then M2.

## Known issues / polish backlog (engine)
- Tall interior walls hide a lot; consider Fallout-style lower walls or full-wall fade when room is entered.
- Headless Chromium (swiftshader) renders ~2 fps; game time runs in slow motion there (dt clamp). Use real browser for feel.
- Bundle is ~600 kB (three.js); split later.

## Half-finished work
(none)

## Notes for owner (how to run/test)
- Run locally: `npm install` then `npm run dev`, open the printed URL (add `?dev` on a deployed build for the DEV console).
- Deploy: add `docs/setup/deploy.yml` as `.github/workflows/deploy.yml` via GitHub web UI; Settings → Pages → Source: GitHub Actions.
