# Progress log (spoiler-free)

Read this first in every session. Update + commit + push after every step.

## Current milestone: M0 — Foundations

### Steps
- [x] M0.1 Repo + CLAUDE.md + resume protocol
- [x] M0.2 DESIGN.md, ROADMAP.md, story plan (secret)
- [x] M0.3 Project scaffold (Vite + TS + three), `npm run check`, Pages deploy workflow
- [x] M0.4 Engine core: renderer, iso camera, scene loader, input (mouse + touch), test scene
- [ ] M0.5 Save/load (versioned, slots, export/import), dev overlay

## Next action
M0.5: save/load (IndexedDB w/ localStorage fallback, versioned, 3 slots + quick + auto, export/import) + title/pause menu.

## Known issues / polish backlog (engine)
- Tall interior walls hide a lot; consider Fallout-style lower walls or full-wall fade when room is entered.
- Headless Chromium (swiftshader) renders ~2 fps; game time runs in slow motion there (dt clamp). Use real browser for feel.
- Bundle is ~600 kB (three.js); split later.

## Half-finished work
(none)

## Notes for owner (how to run/test)
(none yet)
