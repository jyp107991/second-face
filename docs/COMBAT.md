# Combat to the standard of the leading turn-based RPGs (owner, 2026-11-17, binding)

> "combat ai and animations must be smooth and in line with leading turn based rpgs in playability/qol/strategic
> requirements" (owner). Benchmarks: Baldur's Gate 3, Divinity: Original Sin 2, XCOM 2, Wasteland 3 (and Solasta /
> Pathfinder for clarity of rules). Design intent: `docs/DESIGN_UNITY.md` §5.2. This file is the checklist, its
> status and its tests; every item is "done" only with a test (Core EditMode for rules and AI, PlayMode for the game)
> and, where it shows a person, the motion gate (`docs/PEOPLE_MOTION.md`) passing in that state.

Status at 2026-11-17 (audit of `Core/Combat/*`, `Game/Play/Combat.cs`, `Game/UI/CombatHud.cs`, `Motion/`): the rules
have AP by metres, initiative, line of sight, half/full cover, called shots (aim head/legs), bursts, reload,
morale and surrender, a utility AI that scores cover and concealment, and pit bouts; the HUD shows the turn order,
health over heads, AP, the log and odds/cost on targets. The presentation is a placeholder: an attack is a turn to
face and a tracer line, a hit plays a wave gesture, no weapon is held, and the captured clips are everyday ones only.

## A. Animation (smooth, captured, weapons in hands)
| # | Item | Benchmark | Status |
|---|---|---|---|
| A1 | Weapons held: rifle (two hands, IK on the off hand), pistol, melee (blade, club), fists; holstered out of a fight | all | missing |
| A2 | Combat locomotion: combat-ready idle, walk/jog with weapon, stop, turn in place; no sliding (the gate's W-measures) | BG3, XCOM | everyday clips only |
| A3 | Aim → fire → recover per weapon (single, burst), muzzle flash, recoil, shell, tracer; reload | XCOM, W3 | tracer only |
| A4 | Melee: wind-up, strike, follow-through per weapon; unarmed strikes | BG3, DOS2 | none |
| A5 | Hit reactions by direction and zone (head, torso, legs), stagger, knockback; graze vs crit | all | wave gesture |
| A6 | Cover: step into half cover (crouch) and full cover (lean), peek to fire, back | XCOM | none |
| A7 | Throw (grenade, bottle, lamp) with an arc | DOS2, XCOM | none |
| A8 | Fall (ragdoll, exists), rise from down (exists for companions), death pose held; surrender (hands up), flee | all | partial |
| A9 | Camera: smooth follow of the acting unit, frame attacker and target for shots, never a cut; speed settings; skip | BG3 | partial |
Sources: CC0/free humanoid mocap sets retargeted through the existing Mecanim pipeline (candidates: Quaternius
Universal Animation Library (CC0), CMU mocap's fighting takes; no account-gated sources); weapons from CC0 model
packs re-textured to the lore (salvaged, taped). Each new state is added to the motion gate's states.

## B. Tactical QoL (nothing hidden, quick to play)
| # | Item | Benchmark | Status |
|---|---|---|---|
| B1 | Reachable area on the ground: move-and-act zone and dash zone, by AP | XCOM, BG3 | missing |
| B2 | Path preview with AP cost and the end tile's cover/flank status before committing | XCOM, W3 | task #168 (partial) |
| B3 | Hit chance with its reasons (range, cover, height, flanking, aim, stance, status) | XCOM, W3 | odds only |
| B4 | Cover shown: shield icons (half/full) at the cursor/finger and on units; flanked units marked | XCOM | missing |
| B5 | Threats shown: enemies who can see/overwatch a tile, AoE footprints, an enemy's intended target | XCOM 2, BG3 | missing |
| B6 | Turn order with portraits, health, status icons; tap a portrait to focus | BG3 | text order |
| B7 | Floating damage numbers, miss/graze/crit, status applied, morale break | all | log only |
| B8 | End-turn confirm when AP remain; undo of a move not yet seen by anyone; quick-save before the fight (exists) | BG3 | partial |
| B9 | AI turns fast: speed setting (exists), skip animations option, simultaneous moves for out-of-sight foes | BG3 | partial |
| B10 | Touch first: tap to preview, tap again to commit; radial for actions; gamepad parity | — | partial |
| B11 | Combat start from stealth (surprise round), and ending by talk/surrender/flight | BG3, DOS2 | partial |

## C. Strategic depth (rules, Core, tested)
| # | Item | Benchmark | Status |
|---|---|---|---|
| C1 | Cover from real geometry, half/full; flanking removes cover; height gives aim and denies low cover | XCOM | cover only |
| C2 | Stances: crouch (smaller, slower), prone (cover from fire, weak to melee) | W3 | missing |
| C3 | Overwatch / reaction fire; ambush (hold fire until trigger); interrupts from perks | XCOM, W3 | missing |
| C4 | Throwables with AoE: frag, fire bottle, smoke, flash; friendly fire | XCOM, DOS2 | missing |
| C5 | Surfaces: fire (spreads on oil/scrub), oil (slow, burns), water (douses, conducts shock), smoke (blocks sight), chem cloud; explosive barrels and generators | DOS2 | missing |
| C6 | Status effects: bleeding, burning, stunned (exists), crippled limbs from called shots, blinded, suppressed, prone | all | stun only |
| C7 | Suppression fire (pins: −AP, −aim) and cover fire from companions | W3, XCOM | missing |
| C8 | Bionic abilities with Drift as the price (dash, overclock, scan, shock, link) | design §5.2 | missing |
| C9 | Morale and surrender (exist); fleeing to an exit; taking prisoners | design | partial |
| C10 | Difficulty settings shape AI behaviour and numbers, not just damage | BG3 | numbers only |

## D. AI (uses everything, by type, never stupid)
| # | Item | Status |
|---|---|---|
| D1 | Utility AI scoring: damage expected, kill chance, cover at the end tile, flank, height, exposure to the player's overwatch and AoE, distance to allies, morale | partial (cover, concealment) |
| D2 | Archetypes: raiders by nerve (aggressive, break when the leader falls), wardens by the book (cover, overwatch, suppression, arrest first), machines by programme (predictable, relentless), animals by instinct | missing |
| D3 | Uses throwables, overwatch, stances, abilities, healing, reloads at good moments | partial (reload) |
| D4 | Focus fire on the exposed and the wounded; protects its own wounded and leader | missing |
| D5 | Never: ends a turn in the open when cover is in reach, shoots through an ally, walks into fire/AoE, wastes a turn | missing (tests) |
| D6 | Thinks fast (< 150 ms a decision on a phone; budget by candidates) | to measure |
Tests: AI-vs-AI simulations over the content's fights (win rates in band by difficulty), "never" assertions on
thousands of seeded turns, decision time per turn.

## Work packages (order)
1. **Rules and AI in Core** (C1–C7, C9–C10, D1–D6): pure C#, EditMode tests and simulations. (Side worktree.)
2. **Animation set** (A1–A8): source, retarget, weapon props, Animator states, gate states for aim/fire/melee/hit/
   cover/throw; captures at the game camera.
3. **Presentation and QoL** (A9, B1–B11): ground overlays, previews, icons, numbers, camera, speed, undo.
4. **Bionic abilities** (C8) with the chrome system.
5. **QA**: every content fight played by the AI-vs-AI harness; a critic's pass in `docs/qa/` per `docs/QA.md`.
