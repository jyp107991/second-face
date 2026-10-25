# Progress log (spoiler-free)

Read this first in every session. Update + commit + push after every step.

## Current milestone: M1 — Systems I

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
- [ ] M1.7 Enemy AI: utility scoring, cover, flanking, retreat-to-heal, flee/surrender, morale
- [ ] M1.8 Wristlog UI (inventory, stats, equip, use items) — CRT style
- [ ] M1.9 Audio: Web Audio synth (ambience beds, footsteps, gunshots, UI blips)

## Next action
M1.7 — utility AI in `src/engine/combat/ai.ts` replacing `simpleAi` (set `encounter.ai`): score candidate actions
(attack each target w/ hit%×dmg, move to cover tiles within AP that keep LOS, flank, retreat & heal with knit-kit when
HP<35%, flee when morale<20 → move away & leave combat when out of sight, surrender (stop attacking, flag) when
morale<10 & hp low; throw grenades at clusters; melee closes distance). Unit tests with a small grid.
Also: thrown weapons/explosion area damage not yet implemented in Encounter.attack (fx.explosion exists).

## Known issues / polish backlog (engine)
- Tall interior walls hide a lot; consider Fallout-style lower walls or full-wall fade when room is entered.
- Headless Chromium (swiftshader) renders ~2 fps; game time runs in slow motion there (dt clamp). Use real browser for feel.
- Bundle is ~600 kB (three.js); split later.

## Half-finished work
(none)

## Notes for owner (how to run/test)
(none yet)
