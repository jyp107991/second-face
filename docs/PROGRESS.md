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
M2.1 — dialogue engine in `src/engine/dialogue/` (types.ts, conditions.ts, effects.ts, runner.ts). Conditions read a
WorldView (flags, quests, items, skills/attrs, reputation, NPC memory/trust, time). Effects go through one
`applyEffect` dispatcher shared with quests. Validator: every node/next/quest/item/npc reference.

## Known issues / polish backlog (engine)
- Tall interior walls hide a lot; consider Fallout-style lower walls or full-wall fade when room is entered.
- Headless Chromium (swiftshader) renders ~2 fps; game time runs in slow motion there (dt clamp). Use real browser for feel.
- Bundle is ~600 kB (three.js); split later.

## Half-finished work
(none)

## Notes for owner (how to run/test)
- Run locally: `npm install` then `npm run dev`, open the printed URL (add `?dev` on a deployed build for the DEV console).
- Deploy: add `docs/setup/deploy.yml` as `.github/workflows/deploy.yml` via GitHub web UI; Settings → Pages → Source: GitHub Actions.
