I'm building a large, original single-player RPG called **THE SECOND FACE**, in the style of the classic isometric Fallout games (1997–98). It must be fully original: no Fallout names, characters, factions, logos, Vault Boy, Pip-Boy, Vault-Tec, the S.P.E.C.I.A.L. name, locations, story or music. Only the genre conventions and mechanics.

## SPOILER RULE — read first
The full story is in `STORY_SECRET.md` in this folder. Read it and build from it, but I want to play the game unspoiled. Never reveal plot twists, hidden truths, endings, the identity of any secret character, or contents of that file to me — not in chat, commit messages, file names, code comments I'm likely to see, or summaries. When reporting progress, describe story content vaguely ("added the Act 2 archive location and its quest"). Keep all story-revealing content in data files, not in chat. If you need a decision from me that touches spoilers, ask in a spoiler-free way.

What I know (safe to discuss): 90 years after a nuclear catastrophe called the Burn, the player lives in Cistern 9, a sealed shelter run by an old caretaker computer called MOTHER. A dying masked stranger reaches the door carrying a photo of the player, older, in a ruined city, dated 41 years ago. The player goes out to learn who he was. The world includes the frontier town of Shale, the Rust Dogs raiders, the Tollmen (merchant guild controlling the highways), the Choir of the Open Sky (a gentle-seeming religious community) and the Ledger (a pre-war city AI still enforcing old laws).

## Goals
- **Target playtime: 60+ hours** for the full version, built incrementally. The architecture must scale to this from day one.
- ~20–25 hours of handcrafted core content (main quest, factions, companion arcs, key locations) plus systemic content for the rest (reputation-driven world, random encounters, procedurally assembled ruins to scavenge, bounties, trade runs, multiple playstyles: combat, stealth, speech, science).
- Must run smoothly on **mobile browsers** (touch controls) as well as desktop.

## Tech & visuals
- TypeScript + Vite + three.js. Playable in a browser; keep a build that can be deployed as a static site.
- **Low-poly 3D with an isometric (orthographic) camera**, rotatable and zoomable. All models and textures generated procedurally in code unless I supply assets.
- Heavy atmosphere: fog, drifting dust, dynamic lighting (fires, flashlights), day/night cycle, colour grading (washed-out sepia wasteland), bloom, film grain, vignette. CRT/scanline styling for the wrist-computer UI and terminals.
- Synthesized ambient audio and sound effects (Web Audio API).
- Locations are compact scenes linked by a travel world map with random encounters, not one seamless open world. Watch draw calls and memory for phones.

## Architecture (data-driven)
- The code is an engine; **content lives in data files** (JSON or TS data modules): characters, dialogue, quests, items, locations, encounters, factions. Adding content must not require engine changes.
- Clear modules: rendering, scene/location loading, input (mouse + touch), turn-based combat, character/stats, inventory/barter, dialogue engine, quest engine, NPC AI/schedules, relationships/memory, faction reputation, world map/travel, save/load, audio, UI.
- Save/load with multiple slots (localStorage/IndexedDB), versioned save format so saves survive updates.
- Content validation script that checks data files for broken references (missing quest IDs, dialogue nodes, items).
- Developer tools: debug overlay, teleport, give item, set flags, skip time.

## Core systems
- **Character creation:** seven original core attributes, a skill list, tagged skills, traits with upsides and downsides, perks every few levels.
- **Turn-based combat with action points:** moving, attacking, reloading and item use cost AP; hit chance from skill, distance, lighting and cover; aimed shots at body parts with crippling effects; critical hits; enemy AI that uses cover, flees and retreats to heal.
- **Inventory, weight, barter** (prices affected by skill and reputation), weapon condition and repair, ammo types.
- **Radiation, karma, and per-faction reputation**, all affecting dialogue and world reactions.
- **Dialogue engine:** branching trees with skill/attribute/reputation/flag checks, consequences, and dialogue options that change based on what the character remembers.

## Characters (top priority)
Characters must have real depth and distinct personalities:
- Each NPC has a **personality profile** (e.g. loyalty, greed, idealism, courage, honesty, temper), a **role** (trader, guard, healer, schemer, drifter…), daily **schedules**, private **goals** that can conflict with the player's, and secrets.
- **Memory & relationships:** NPCs remember the player's actions, words and who they helped or hurt. Trust and affection values change what they reveal and how they act. **Gossip** propagates between connected NPCs.
- **Companions:** recruitable, each with a personal quest line, opinions on the player's choices (approve/disapprove reactions), banter and conflicts with each other, and the ability to leave, betray or sacrifice themselves depending on the relationship.
- **Optional live AI dialogue mode** (design for it now, implement after the core works): a toggle letting the player type freely to NPCs, answered by an LLM via API, prompted with the NPC's personality, memories, knowledge boundaries and spoiler limits so they stay in character and never reveal story beyond what that NPC knows at that point. Written dialogue trees remain the default and must always work offline.

## Workflow
1. Read `STORY_SECRET.md`. Then write `DESIGN.md` (systems, data schemas, character framework, tech plan — keep it spoiler-free) and `ROADMAP.md` (milestones from vertical slice to 60-hour full game). Keep story-sensitive planning in a separate `STORY_PLAN_SECRET.md`.
2. Set up the project with git; commit at each meaningful step with spoiler-free messages.
3. Build a **vertical slice — Chapter One:** Cistern 9 (the shelter and the stranger at the door), the town of Shale, and the Rust Dogs camp, ending when the player obtains the stranger's map. It must include: character creation, movement, isometric 3D scenes with atmosphere, turn-based combat, inventory, at least 8 NPCs with full personality/memory systems, at least one recruitable companion, 4–6 quests with multiple solutions (fight, talk, sneak), barter, save/load, touch controls.
4. After each milestone, tell me how to run and play it, what to test, and what's next — spoiler-free.

Ask me any questions about scope, style or controls before you start coding.
