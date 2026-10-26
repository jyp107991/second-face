# Roadmap (spoiler-free)

Target: **60+ hours in one playthrough.** Built in milestones; every milestone ends playable,
deployed to GitHub Pages, with a test note in PROGRESS.md.

| # | Milestone | Contents | Est. play added |
|---|---|---|---|
| M0 | Foundations | Docs, scaffold, deploy, engine core (render, iso camera, input, scene loader), save/load, dev tools | — |
| M1 | Systems I | Stats, character creation + face sculptor, inventory, items, turn-based combat, AI | — |
| M2 | Systems II | Dialogue/quest engines, local reputation + news, leads, world events, factions, barter, economy sim, companions core | — |
| M2b | Systems III (chrome & world) | Chrome engine (slots, grades, abilities, Drift, upkeep), settlement-type generator, region/route/transport model, fast-travel rules, NPC look variance by role/class/district | — |
| M3 | **Chapter One slice** | Cistern 9, Shale, Rust Dogs camp; 12–15 NPCs, 2 companions, 6 quests; ends with the map | 4–5 h |
| M4 | The Reach (world map) | Regional map of the Western Reach, foot/mule/caravan/vehicle travel, the Line, barges, encounters, camps, settlement variety, procedural ruins, bounties, trade runs | +6 h systemic |
| M5 | Act 1 complete | Remaining Act 1 locations and quests, third companion, first chrome pieces & a Mender | +8 h |
| M6 | **Meridian** (city I) | Districts from the Crown to the Sink, city transit, gigs board, grid-riding, reveries, gangs & Brokers, 3+ questlines, safehouses | +12 h |
| M7 | **Halcyon** (city II) | The arcology and the Skirts, corporate questlines, Concern-grade chrome, class-gated spaces | +10 h |
| M8 | Act 2 wilds | Remaining regions (Drowned Shore, Teeth, Ashlands, Northern Wet), faction storylines, companion & romance arcs | +10 h |
| M9 | Act 3 + endings | Convergence, finale, multiple endings, epilogues from world state | +8 h |
| M10 | Systemic depth | More ruins templates, nomad routes, rare encounters, city activities, events | +6 h |
| M11 | Live AI dialogue | Optional Claude-backed free-text NPC dialogue | — |
| M12 | Polish & balance | Economy & chrome tuning, difficulty, accessibility, performance pass, bug bash | — |

Total single playthrough ≈ 60–70 h (handcrafted ≈ 50 h, systemic ≈ 15–20 h along the critical path).
Cities are deliberately the densest content per square metre: quality and depth over map size.

## Quality gates (every milestone)
- `npm run check` green (typecheck, content validation, unit tests).
- Runs at target frame rate on desktop and a mid-range phone; ≤150 draw calls per scene.
- Economy sim within target wealth band for the milestone's content.
- Save from previous milestone loads.
