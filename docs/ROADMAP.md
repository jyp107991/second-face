# Roadmap (spoiler-free)

Target: **60+ hours in one playthrough.** Built in milestones; every milestone ends playable,
deployed to GitHub Pages, with a test note in PROGRESS.md.

| # | Milestone | Contents | Est. play added |
|---|---|---|---|
| M0 | Foundations | Docs, scaffold, deploy, engine core (render, iso camera, input, scene loader), save/load, dev tools | — |
| M1 | Systems I | Stats, character creation + face sculptor, inventory, items, turn-based combat, AI | — |
| M2 | Systems II | Dialogue engine, quest engine, NPC memory/gossip/schedules, factions, barter, economy sim | — |
| M3 | **Chapter One slice** | Cistern 9, Shale, Rust Dogs camp; 12–15 NPCs, 2 companions, 6 quests; ends with the map | 4–5 h |
| M4 | World map | Travel, random encounters, camp scenes, procedural ruins, bounties, trade runs | +6 h systemic |
| M5 | Act 1 complete | Remaining Act 1 locations and quests, third companion | +8 h |
| M6 | Act 2 part A | New region, 2 locations, faction storyline, companion arcs | +10 h |
| M7 | Act 2 part B | Further locations, faction storylines, romance arcs | +10 h |
| M8 | Act 3 | Late locations, convergence of factions, finale | +10 h |
| M9 | Endings & epilogues | Multiple endings, epilogues from world state | +2 h |
| M10 | Systemic depth | More ruins templates, bounty boards, events, rare encounters | +6 h |
| M11 | Live AI dialogue | Optional Claude-backed free-text NPC dialogue | — |
| M12 | Polish & balance | Economy tuning, difficulty, accessibility, performance pass, bug bash | — |

Total single playthrough ≈ 60–65 h (handcrafted ≈ 45 h, systemic ≈ 15–20 h along the critical path).

## Quality gates (every milestone)
- `npm run check` green (typecheck, content validation, unit tests).
- Runs at target frame rate on desktop and a mid-range phone; ≤150 draw calls per scene.
- Economy sim within target wealth band for the milestone's content.
- Save from previous milestone loads.
