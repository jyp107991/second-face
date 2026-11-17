# Combat to the standard of the leading turn-based RPGs (owner, 2026-11-17, binding)

> "combat ai and animations must be smooth and in line with leading turn based rpgs in playability/qol/strategic
> requirements" (owner). Benchmarks: Baldur's Gate 3, Divinity: Original Sin 2, XCOM 2, Wasteland 3 (and Solasta /
> Pathfinder for clarity of rules). Design intent: `docs/DESIGN_UNITY.md` §5.2. This file is the checklist, its
> status and its tests; every item is "done" only with a test (Core EditMode for rules and AI, PlayMode for the game)
> and, where it shows a person, the motion gate (`docs/PEOPLE_MOTION.md`) passing in that state.

WP1 (rules and AI in Core) delivered 2026-11-17 on `side/combat`: C1–C7, C9, C10, D1–D6 below, with the APIs the
presentation package needs (end of this file). Status at 2026-11-17 before it (audit of `Core/Combat/*`, `Game/Play/Combat.cs`, `Game/UI/CombatHud.cs`, `Motion/`): the rules
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
| B1 | Reachable area on the ground: move-and-act zone and dash zone, by AP | XCOM, BG3 | missing; Core API ready (`Battle.Reachable`) |
| B2 | Path preview with AP cost and the end tile's cover/flank status before committing | XCOM, W3 | task #168 (partial); Core API ready (`Battle.PlanMove`) |
| B3 | Hit chance with its reasons (range, cover, height, flanking, aim, stance, status) | XCOM, W3 | odds only; Core API ready (`Battle.Preview(att, def, ShotOptions)`) |
| B4 | Cover shown: shield icons (half/full) at the cursor/finger and on units; flanked units marked | XCOM | missing |
| B5 | Threats shown: enemies who can see/overwatch a tile, AoE footprints, an enemy's intended target | XCOM 2, BG3 | missing; Core API ready (`ThreatsAt`, `Watches`, `PlanThrow`, `PredictIntent`) |
| B6 | Turn order with portraits, health, status icons; tap a portrait to focus | BG3 | text order |
| B7 | Floating damage numbers, miss/graze/crit, status applied, morale break | all | log only |
| B8 | End-turn confirm when AP remain; undo of a move not yet seen by anyone; quick-save before the fight (exists) | BG3 | partial |
| B9 | AI turns fast: speed setting (exists), skip animations option, simultaneous moves for out-of-sight foes | BG3 | partial |
| B10 | Touch first: tap to preview, tap again to commit; radial for actions; gamepad parity | — | partial |
| B11 | Combat start from stealth (surprise round), and ending by talk/surrender/flight | BG3, DOS2 | partial |

## C. Strategic depth (rules, Core, tested)
| # | Item | Benchmark | Status |
|---|---|---|---|
| C1 | Cover from real geometry, half/full; flanking removes cover; height gives aim and denies low cover | XCOM | **done (Core, WP1)**: `IBattleGeometry.CoverAround` pieces with 60° arcs (`Tactics.FromPieces`), flanked = cover by you but none facing (+15 crit), high ground ≥ 1.5 m (+10, low cover denied); NavField answers by raycasts; tests `CombatTacticsTests` |
| C2 | Stances: crouch (smaller, slower), prone (cover from fire, weak to melee) | W3 | **done (Core)**: crouch/prone make low cover full, −10/−20 in the open at range, prone +20 to be struck in melee, +5/+10 to your aim, walks ×1.5/×2, one free change a turn (prone→up 1 AP), prone puts out flames, blasts halved; `SetStance` |
| C3 | Overwatch / reaction fire; ambush (hold fire until trigger); interrupts from perks | XCOM, W3 | **done (Core)**: `Overwatch` (cone or all round, −15, one shot, lapses at your turn; a blade holds a guard), `Ambush` (hidden, steady, the group springs; Shadow Strike crits), perk hooks: Overwatch (auto, steady), Riposte, Follow-Through, Adrenaline, Not Today, Tough as Nails; `Moved` fires them along the path |
| C4 | Throwables with AoE: frag, fire bottle, smoke, flash; friendly fire | XCOM, DOS2 | **done (Core)**: `Throw`/`PlanThrow` by the weapon's dmgType (blast, fire, smoke, flash, chem, shock), range 1.5 m a tile + Brawn, scatter by Explosives, falloff, prone/full cover halve, knock-down, everyone in the radius hurt; content has `w_frag`, `w_molotov` (see "Content to add") |
| C5 | Surfaces: fire (spreads on oil/scrub), oil (slow, burns), water (douses, conducts shock), smoke (blocks sight), chem cloud; explosive barrels and generators | DOS2 | **done (Core)**: `SurfaceGrid` (1 m cells: ground, fire, cloud, current) ticking each round on the battle's dice; oil ×2 walk cost; water douses and carries arc hits/generators; smoke blocks sight; chem chokes and bursts in fire; `BattleProp` fuel/chem/generator blow and chain; the world's ground kinds via `GroundAt` (NavField: none yet) |
| C6 | Status effects: bleeding, burning, stunned (exists), crippled limbs from called shots, blinded, suppressed, prone | all | **done (Core)**: `Status` (bleeding, burning, blinded, suppressed, choking, shocked, adrenaline) in turns, ticked at the bearer's turn, a heal binds bleeding; stunned and cripples as before (legs −1 AP, arms −aim); `Status.View` for icons |
| C7 | Suppression fire (pins: −AP, −aim) and cover fire from companions | W3, XCOM | **done (Core)**: `Suppress` (a burst's rounds or three, no damage: −1 AP (−2 with the perk), −15 aim, nerve, a move draws the shot), `CoverFire` (answers any attack in sight first; a hit pins) |
| C8 | Bionic abilities with Drift as the price (dash, overclock, scan, shock, link) | design §5.2 | missing |
| C9 | Morale and surrender (exist); fleeing to an exit; taking prisoners | design | **done (Core)**: fleeing walks to `Exits` over turns and is out there (no exits: out at the move, as before), `TakePrisoner` (2 m, 2 AP), the unwatched surrendered slip away, `Prisoners` at victory, wardens' demand to yield; raiders' nerve breaks with their leader |
| C10 | Difficulty settings shape AI behaviour and numbers, not just damage | BG3 | **done (Core)**: `CombatDifficulty` story/normal/hard: noise (lesser choices), focus fire, flanking, throws, reading held shots and areas, mercy, coordination; the numbers stay the settings' |

## D. AI (uses everything, by type, never stupid)
| # | Item | Status |
|---|---|---|
| D1 | Utility AI scoring: damage expected, kill chance, cover at the end tile, flank, height, exposure to the player's overwatch and AoE, distance to allies, morale | **done (Core)**: `CombatAi` (expected damage and kill chance vs the enemy's move-then-shoot fire at the end tile, flanks, height, held shots along the walk, bunching, cohesion, guarding, quiet-fight pressure) |
| D2 | Archetypes: raiders by nerve (aggressive, break when the leader falls), wardens by the book (cover, overwatch, suppression, arrest first), machines by programme (predictable, relentless), animals by instinct | **done (Core)**: `Archetypes` (raider, warden, guard, machine, animal, fighter, civilian, companion) mapped from the content by role, faction, team |
| D3 | Uses throwables, overwatch, stances, abilities, healing, reloads at good moments | **done (Core)** except abilities (C8): throws for groups or the hard-to-hit, smoke over the exposed, holds when someone is coming, crouches behind low cover, rolls out flames, heals itself and the wounded beside it, reloads, swaps a dry gun |
| D4 | Focus fire on the exposed and the wounded; protects its own wounded and leader | **done (Core)**: target value by wounds, danger, the player, shared intent (hard); guarding and cover fire over the wounded and the leader |
| D5 | Never: ends a turn in the open when cover is in reach, shoots through an ally, walks into fire/AoE, wastes a turn | **done (Core, tested)**: hard rules after the scores; the harness checks them independently every step and turn |
| D6 | Thinks fast (< 150 ms a decision on a phone; budget by candidates) | **done**: ≤ 40 standing points a decision (deterministic, no clock), mean ≈ 0.9 ms, p99 ≈ 2.5 ms on the session machine (`LastDecisionMs`); to confirm on the phone |
Tests: AI-vs-AI simulations over the content's fights (win rates in band by difficulty), "never" assertions on
thousands of seeded turns, decision time per turn.

## Work packages (order)
1. **Rules and AI in Core** (C1–C7, C9–C10, D1–D6): pure C#, EditMode tests and simulations. (Side worktree.)
2. **Animation set** (A1–A8): source, retarget, weapon props, Animator states, gate states for aim/fire/melee/hit/
   cover/throw; captures at the game camera.
3. **Presentation and QoL** (A9, B1–B11): ground overlays, previews, icons, numbers, camera, speed, undo.
4. **Bionic abilities** (C8) with the chrome system.
5. **QA**: every content fight played by the AI-vs-AI harness; a critic's pass in `docs/qa/` per `docs/QA.md`.


## WP1 delivered: the Core APIs for the presentation package (A, B)
All in `Core/Combat` (pure C#, deterministic on the battle's `Rng`; the AI never rolls):
- **Geometry**: a field may also implement `IBattleGeometry` (Height, CoverAround, Path, SightBetween, GroundAt, Exits);
  the game's `NavField` does (raycasts at 0.7/1.45 m in eight directions; NavMesh heights and corners; no surfaces or
  exits from the world yet: add `GroundAt` from the terrain's water/scrub masks and `Exits` from the place's edges).
- **Shot preview (B3)**: `Battle.Preview(att, def, new ShotOptions { Aimed, Burst, FromX, FromZ })` → `ShotPreview`
  (Ok/Reason, Chance with `Hit.Reasons` keyed for `combat.reason.<key>`, Cover, Flanked, HighGround, DamageMin/Max,
  CritMax, Crit, Rounds, Ap, KillChance, Expected, InTheWay, Answered by cover fire). The old tuple overload stays.
- **Reachable (B1)**: `Battle.Reachable(u, step, withCover)` → act/dash bands (AP and metres) and sampled points with
  AP, band, cover and exposure. **Walk preview (B2)**: `Battle.PlanMove(u, x, z)` → AP, path, the shots it draws (who,
  where, odds), the first hazard, cover per enemy at the end, whom it flanks.
- **Threats (B5)**: `ThreatsAt(u, x, z)` (who sees it and their odds, who watches it, the ground, props in reach),
  `Watches()` (cones to draw; hidden ambushes left out), `PlanThrow(u, item, x, z)` (footprint cells, who is caught,
  allies flagged, scatter), `PredictIntent(u)` (an enemy's coming target; pure), `BattleUnit.Intent` (set as the AI
  chooses), `CombatAi.LastOptions` (the scored options, for a "why").
- **Actions**: `Attack` (returns `BattleHit` with `Interrupts`, `Followups`, `Stray`), `Moved` (returns `MoveOutcome`
  with the reactions to play and the hazards entered), `Throw` → `ThrowResult`, `AttackProp`, `SetStance`, `Overwatch`,
  `CoverFire`, `Ambush`, `Suppress`, `TakePrisoner`, `Flee`, `Surrender`, `Shout`, `UseItemOn`, `Swap`, `Down`;
  `Execute(u, AiStep)` carries out any AI step but a walk; `RunAiTurn`/`WalkTo` play a turn headless.
- **State**: `Surfaces` (cells to draw: fire, oil, water, smoke, chem, current), `Props` (the game lists its barrels and
  generators at the start), `Status.View`/`StatusesOf` (icons with turns), `History` (every attack and blast), `Log`.
- **Saving**: `Snapshot()` → `BattleSave` (version 1, `BattleSave.Migrate`), `Restore(save, units)`; the game still
  saves just before a fight, so nothing is wired into `GameState` yet.
- **Difficulty**: `Battle.Difficulty = CombatDifficulty.For(id)`; `Combat.DifficultyName` is set by `Bootstrap`.
- **Strings**: `combat.reason.*`, `combat.status.*`, `combat.cover.*`, `verb.overwatch|cover_fire|suppress|throw|
  crouch|prone|stand|take_prisoner|shoot_prop|swap` are in `UI/Strings/ui.tsv`.

## Content to add (C4; the rules are ready, the items are not in `src/content` yet)
`items`: `w_smoke` (Smoke Can: thrown, dmgType `smoke`, area 2, ap 4, range 8, consumable), `w_flash` (Flash Jar:
`flash`, area 3, ap 4), `w_chem` (Chem Jar: `chem`/`poison`, area 2, dmg 0, ap 5); give NPCs throwables (raiders
`w_molotov`, wardens `w_smoke`/`w_flash`, none carry any now). `npcs`: animals as `natural` attacks with no `equip`,
machines with `role`/`team` `machine` (the archetype table also reads `drone`, `turret`, `beasts`). Places: list their
fuel drums, chem drums and generators as `BattleProp`s; water and scrub as the geometry's `GroundAt`; exits.

## The AI-vs-AI harness (WP1 results, `CombatHarnessTests`)
Fields: open, cover lines, a height, a corridor, a yard with fuel, chem, oil, scrub and water; the player's side (three)
against raiders, wardens, machines, animals; both sides by the AI. Every step and turn checks the hard rules
independently. Results on 2026-11-17: 0 breaches; win rate of the hostile side story 0.07 / normal 0.51 / hard 0.65;
raiders broke in 24/24 fights when their leader fell, wardens in 0/24; wardens hold, suppress and demand, raiders close
in, animals charge and never use tools, machines never break; fights end (≤ 1 % standoffs); a decision ≈ 0.9 ms mean,
≈ 2.5 ms p99 here. The heavy run (`ThousandsOfFightsKeepTheHardRules`, 2,040 fights) is `[Category("Heavy")]`;
`SF_SKIP_HEAVY=1` skips it in the local dotnet run.

## Rule changes in WP1 (tests updated where they asserted the old)
- Hold the Line's +3 DT counts only in cover (it counted everywhere).
- Steady Hands (Firearms 50) now makes an aimed pistol or rifle shot cost no extra AP (the flag existed, unused).
- A thrown weapon with an area goes to `Throw` at the target's feet (scatter by skill) rather than the old splash.
- In a battle the distance for the hit chance is metres (Euclidean), not the rounded tiles (`CombatRules` alone keeps
  the tiles); Round now advances when a new round's first unit acts.
