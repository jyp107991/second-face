# Combat to the standard of the leading turn-based RPGs (owner, 2026-11-17, binding)

> "combat ai and animations must be smooth and in line with leading turn based rpgs in playability/qol/strategic
> requirements" (owner). Benchmarks: Baldur's Gate 3, Divinity: Original Sin 2, XCOM 2, Wasteland 3 (and Solasta /
> Pathfinder for clarity of rules). Design intent: `docs/DESIGN_UNITY.md` §5.2. This file is the checklist, its
> status and its tests; every item is "done" only with a test (Core EditMode for rules and AI, PlayMode for the game)
> and, where it shows a person, the motion gate (`docs/PEOPLE_MOTION.md`) passing in that state.

WP2 (animation and weapons: A1–A8) delivered 2026-11-17 on `side/combat`, compile-checked and Core-tested here; its import, build,
PlayMode tests, gate run and captures wait for the editor (section "WP2 delivered"). WP1 (rules and AI in Core) delivered 2026-11-17 on `side/combat`: C1–C7, C9, C10, D1–D6 below, with the APIs the
presentation package needs (end of this file). WP3 (presentation and QoL: A9, B1–B11) delivered 2026-11-17 on the same
branch, compile-checked and Core-tested here; its PlayMode tests and captures wait for the editor (section "WP3 delivered"). Status at 2026-11-17 before it (audit of `Core/Combat/*`, `Game/Play/Combat.cs`, `Game/UI/CombatHud.cs`, `Motion/`): the rules
have AP by metres, initiative, line of sight, half/full cover, called shots (aim head/legs), bursts, reload,
morale and surrender, a utility AI that scores cover and concealment, and pit bouts; the HUD shows the turn order,
health over heads, AP, the log and odds/cost on targets. The presentation is a placeholder: an attack is a turn to
face and a tracer line, a hit plays a wave gesture, no weapon is held, and the captured clips are everyday ones only.

## A. Animation (smooth, captured, weapons in hands)
| # | Item | Benchmark | Status |
|---|---|---|---|
| A1 | Weapons held: rifle (two hands, IK on the off hand), pistol, melee (blade, club), fists; holstered out of a fight | all | **built (game, WP2; tests and gate states written, to run in the editor)**: each weapon's grip matched palm frame to weapon frame (Core `CombatMotion` grips: pistol grip, hammer grip; the off hand under a fore-end, on a club's handle, wrapping a pistol), the off hand held on `grip_off` by two-bone IK (the fix for the 7 `use_with_ik` rifle and club takes), a long gun's and a two-handed club's ready hold made for each body (`HandsIk.Hold`: WP2 review), each model laid in its sidecar's frame by its own nulls, the fingers closed round each grip, fists in the guard; holstered on the right thigh (pistols), slung across the back (long guns, two-handed clubs), at the left hip (one-handed); drawn as a fight begins, holstered as it ends, dropped on a fall or hands up; both lore paints (by who holds it); every content weapon mapped by its `held` key (stand-ins flagged: spear, sledge, sub-gun, pump gun, zip and arc pistols); `Game/Fighting/Fighter.cs`, `Limbs.cs`; tests `CombatMotionPlayTests.WeaponsStayInHandAndTheOffHandOnItsGrip`, `CombatMotionTests`, `CombatBuildTests` |
| A2 | Combat locomotion: combat-ready idle, walk/jog with weapon, stop, turn in place; no sliding (the gate's W-measures) | BG3, XCOM | **built (game, WP2; tests and gate states written, to run in the editor)**: the weapon's ready stance per weapon (the captured guard `fist_guard_accad`; pistol and long-gun low ready, hand-keyed stopgaps), the weapon carried over the people's own captured walk and jog on an arms-only layer (`CombatArms`), crouched moves as the locomotion's captured sneak (README v3 §2 (a)), turns to face by stepping (wide turns on the foot plant), planted feet held through the fight's crossfades; gate states `combat:ready:*`, `combat:carry:rifle` |
| A3 | Aim → fire → recover per weapon (single, burst), muzzle flash, recoil, shell, tracer; reload | XCOM, W3 | **built (game, WP2; tests and gate states written, to run in the editor)**: long gun: raise (`rifle_raise_cmu`'s second half) → hold (`rifle_aim_b_cmu`) → single or burst (fired on the hold with author.py's recoil at run time, `Fighter.Recoil`; the authored `rifle_fire/burst_cmu` were another actor's stance: WP2 review) → lower; the gun's line against the bladed chest learnt and turned onto the target, the wrist correcting ≤ 12°; pistol: the aim by IK on `rifle_aim_b_cmu`'s captured legs and torso, both hands on the eye-to-target line, a spring recoil; muzzle flash at the muzzle, a spent case, the tracer from the muzzle; reloads (`rifle_reload_ual`, `pistol_reload_ual`); gate states `combat:aim:*`, `combat:aim_pistol:*`, `combat:reload:*` |
| A4 | Melee: wind-up, strike, follow-through per weapon; unarmed strikes | BG3, DOS2 | **built (game, WP2; tests and gate states written, to run in the editor)**: unarmed blows by sex (men: ACCAD Male2's jab, cross, hooks, uppercuts; women: CMU 144's jab, CMU 113's cross), the high block; one-handed: the slash on `fist_hook_r_accad`'s captured body with the weapon hand IK'd along an arc (README v3 §2 (c)), `melee_strike_ual` (stopgap); two-handed: `club_overhead(_b)_cmu` with the off hand by IK; the target struck at each clip's impact frame (read off its own curves); gate states `combat:guard:*`, `combat:strike:*` |
| A5 | Hit reactions by direction and zone (head, torso, legs), stagger, knockback; graze vs crit | all | **built (game, WP2; tests and gate states written, to run in the editor)**: a procedural directional hit on every hit (a spring-damped turn of the spine, chest and head away from it, by zone and graze/hit/crit); crits stagger (from behind `stagger_fwd_cmu`, cut; from the front a woman's `stagger_cmu`, a man's `hit_chest/head_ual` stopgaps: no man's stagger is captured); a blow that misses blocked or slipped (men's captured dodges, women's duck), a shot that misses flinched from (new hook `OnMiss`); gate state `combat:hit:rifle` |
| A6 | Cover: step into half cover (crouch) and full cover (lean), peek to fire, back | XCOM | **built (game, WP2; tests and gate states written, to run in the editor)**: down into half cover (`crouch_down(_f)_accad`, its travel applied), the crouch held (`crouch_rifle_ual` with two hands on a long gun or club, the captured wary `ready_crouch_cmu` otherwise), stepping out to fire as a crossfade to the aim hold and back, out of cover at a run (`crouch_to_run(_f)_accad` cut at its first stride, crossfading into the walk); full cover's lean not built (no capture); gate state `combat:crouch:rifle` |
| A7 | Throw (grenade, bottle, lamp) with an arc | DOS2, XCOM | **built (game, WP2; tests and gate states written, to run in the editor)**: the overhand throw (a woman's captured `throw_overhand_cmu`; a man's `throw_overhand_ual`, a flagged stopgap: no man's throw is captured), released at the clip's own frame, the grenade, bottle or spike flown from the hand along the arc and gone where it lands (`OnThrow` now names the item); gate state `combat:throw:rifle` |
| A8 | Fall (ragdoll, exists), rise from down (exists for companions), death pose held; surrender (hands up), flee | all | **built (game, WP2; tests and gate states written, to run in the editor)**: the ragdoll's fall (the weapon dropped), then the captured get-up for the side the body lies on (`getup_back/front/side_cmu`, women `getup_f_cmu`; to a crouch `getup_to_crouch(_f)_accad`), set onto the lying pose and rising where it rises; prone as the face-down get-up's first frame held (no prone or crawl is captured); hands up (`surrender_enter/idle_ual`, the weapon dropped); the fight's end relaxes the guard and holsters (new hook `OnEnd`); gate states `combat:yield:unarmed`, `combat:rise:unarmed` |
| A9 | Camera: smooth follow of the acting unit, frame attacker and target for shots, never a cut; speed settings; skip | BG3 | **done (game, WP3; to verify in the editor)**: `CombatCamera` drives the game's own `OrbitRig` (new eased `FocusOn`/`ClearFocus`/`EaseDistance`, critically damped, never a cut, pitch untouched): follows the one acting, frames shooter and target (out as far as both need, never in closer than the player had it), eases back; eases ÷ combat speed; skip: the other side's not framed; a portrait tap looks at that fighter |
Sources: CC0/free humanoid mocap sets retargeted through the existing Mecanim pipeline (candidates: Quaternius
Universal Animation Library (CC0), CMU mocap's fighting takes; no account-gated sources); weapons from CC0 model
packs re-textured to the lore (salvaged, taped). Each new state is added to the motion gate's states.

## B. Tactical QoL (nothing hidden, quick to play)
| # | Item | Benchmark | Status |
|---|---|---|---|
| B1 | Reachable area on the ground: move-and-act zone and dash zone, by AP | XCOM, BG3 | **done (WP3)**: `Battle.BeginReach`/`ContinueReach` (the same map as `Reachable`, a few NavMesh paths a frame within 4 ms) with each node's metres; Core `ReachBands` (marching squares, chained loops) → `CombatOverlay`: soft tints (cool act, amber dash, a metre's feather) and crisp soft-edged lines where each band ends, on the ground; tests `CombatViewTests`, `CombatQolTests` |
| B2 | Path preview with AP cost and the end tile's cover/flank status before committing | XCOM, W3 | **done (WP3)**: tap previews (`PlanMove` + `ThreatsAt` → Core `MoveCard`), tap again within 1.2 m (or a double tap) goes; path coloured by band (white-blue, amber, red past the AP), end ringed, held shots it draws marked where they fire, first hazard ringed; a card at the end (AP and band, cover vs those who would see it, flanks, shots, watchers); AP pips light what it spends; marks over enemies as from the end point |
| B3 | Hit chance with its reasons (range, cover, height, flanking, aim, stance, status) | XCOM, W3 | **done (WP3)**: Core `ShotCard` from `Preview` (every reason in the UI's words with signed points, notes in words, the clamp said, damage range ×rounds, crit and its top, kill %, cover/flanked, ally in the line of fire, cover fire that answers, why not); the HUD's card beside the radial follows the verb pointed at or focused |
| B4 | Cover shown: shield icons (half/full) at the cursor/finger and on units; flanked units marked | XCOM | **done (WP3)**: shields (half/full) where each cover piece stands at the previewed point; over each fighter on the other side of the one acting their cover against them (from the previewed point while previewing), a cracked shield when flanked |
| B5 | Threats shown: enemies who can see/overwatch a tile, AoE footprints, an enemy's intended target | XCOM 2, BG3 | **done (WP3)**: an eye over each enemy who would see the previewed point; held shots on the ground (cones, all-round rings) and an eye-in-sight mark; throws aimed on the ground (footprint by kind, scatter ring, arc; `ThrowCard`; ours caught flagged with a warning); surfaces (fire, oil, smoke, chem, water, current) drawn; intents worked out one enemy a frame by `PredictIntent`, shown by difficulty (new `CombatDifficulty.Intents`: story all, normal seen + machines, hard machines only; `Intents.Shown`) |
| B6 | Turn order with portraits, health, status icons; tap a portrait to focus | BG3 | **done (WP3)**: Core `TurnOrder` (from the one acting, a divider where the round turns, no allocation once grown) → portraits (`People.Portraits`, one drawn a frame, initials until then), health, up to four status icons; a tap looks at them |
| B7 | Floating damage numbers, miss/graze/crit, status applied, morale break | all | **done (WP3)**: Core `Floats` (per hit as each round lands: miss, graze (≤ 2 after armour, presentational), damage, crit, cripples; then a before/after picture: statuses, falls, heals, a breaking nerve, a surrender, a prisoner taken) → pooled rising labels, stacked per head |
| B8 | End-turn confirm when AP remain; undo of a move not yet seen by anyone; quick-save before the fight (exists) | BG3 | **done (WP3)**: end turn with AP left lights and asks for a second press (4 s); Core `BeginMove`/`EndMove`/`CanUndo`/`Undo` (snapshot + restore; blocked when seen by anyone of the other side at any 0.75 m of the walk, hidden ambushers included, shot at, the ground acted, dice rolled, or anything done since); the body put back; the turn stays open at 0 AP while an undo is possible |
| B9 | AI turns fast: speed setting (exists), skip animations option, simultaneous moves for out-of-sight foes | BG3 | **done (WP3)**: Core `CombatPace` (every beat ÷ speed; new setting `combatSkip` "Their turns: skip the show": their pauses ≤ 0.05 s, no framing, walks still walked); a walk of theirs unseen at both ends is made at once and the body catches up while the next acts |
| B10 | Touch first: tap to preview, tap again to commit; radial for actions; gamepad parity | — | **done (WP3)**: two-step ground taps (walks, throws); radial on fighters (Core `CombatActions.OnTarget`: attack, aimed, burst, suppress, demand; take prisoner; cover fire and patch up on ours); cluster of 8 at 100 units (stance, throw, switch, patch up; undo, reload, hold, end turn; `CombatActions.For` with notes); pad: left stick cursor, south act, d-pad cycle/undo, east cancel, west end turn, north to the cluster; keys ] [ X Z Enter |
| B11 | Combat start from stealth (surprise round), and ending by talk/surrender/flight | BG3, DOS2 | **done (WP3)**: a fight begun while sneaking catches the unaware (awareness under noticed) off guard: Core `Battle.Surprise` (they lose their first turn; the player's side first; saved), a banner and floats; the end in words (Core `FightSummary`: victory, they ran, truce, defeat, beaten; down, prisoners, fled, slipped away, ours down, XP); yields and breaks float; the demand to yield on the radial. Talk to end a fight stays the content's (dialogue) |

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
2. **Animation set** (A1–A8; sourced and staged 2026-11-17: 69 clips, 13 weapons, `docs/COMBAT_ASSETS.md`): retarget, weapon props, Animator states, gate states for aim/fire/melee/hit/
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


## WP3 delivered: presentation and QoL (A9, B1–B11), 2026-11-17
Pure parts in Core (EditMode `CombatViewTests`, 15 tests): `CombatView.cs` (`Words` = the UI table's lookup; `ShotCard`,
`MoveCard`, `ThrowCard`, `TurnOrder`/`TurnSlot`, `ReachBands`/`BandLines` (marching squares over the reach grid, loops
chained by grid edge), `Floats`/`FightPicture`, `CombatPace`, `Intents`, `CombatActions` (cluster, stances, holds, verbs on
a fighter), `FightSummary`), `BattleUndo.cs` (`MoveUndo`, `BeginMove`, `EndMove`, `SeenOnTheWay`, `CanUndo`, `Undo`),
`BattleQueries` (`ReachJob`, `BeginReach`, `ContinueReach`, `ReachPoint.Metres`, `ReachMap.Grid`), `Battle.Surprise` and
`BattleUnit.Surprised` (saved), `CombatDifficulty.Intents`, `Settings.CombatSkip`.
The game (`Game/Play`): `Combat.cs` (lifecycle, HUD feed, NavField), `CombatTurn.cs` (the player's turn: previews, commits,
radial, cluster, throws, undo, end-turn confirm, intents, the reach job, the pad), `CombatStage.cs` (AI turns at the pace,
unseen walks at once, every action played through the views, floats, camera), `CombatOverlay.cs` + `Resources/
CombatGround.shader` (`SecondFace/Combat Ground`: unlit, vertex alpha, fog, pulled toward the camera like the roads; in
Resources so the player has it; Sprites/Default if not supported), `CombatCamera.cs`, `CombatPresenter.cs`; `OrbitRig`
(eased focus), `PadInput` (`Fight` hook; Next/Prev/Cancel/Undo/EndTurn), `UI/CombatHud.cs` (rewritten), `RadialMenu`
(label/icon per verb, `Focused`, `Gone`), `Icons` (`Set`; 30 new drawings: holds, throw, stances, swap, undo, cuffs, shout,
shields, flank, sight, warning, statuses), `SettingsScreen` (skip), `Bootstrap` (`Combat.Pace`), `Theme.uss`, `ui.tsv`.

**The hooks for the animation package (WP2)**: `IUnitView` (one per fighter; `Combat.MakeView` replaces the placeholder):
`OnMove(goal, path, wait)` + `Moving`, `OnAim(at)`, `OnFire(at, hit, round)`, `OnStrike(at, hit)`, `OnHit(from, zone,
kind)` (zone = the hit's part; kind graze/hit/crit), `OnFall(from)`, `OnRise()`, `OnStance(stance)`, `OnThrow(arc)`,
`OnReload()`, `OnHold(mode)`, `OnYield()`, `Place(at, facing)` (undo), each at `Pace` (speed, skip, `Theirs`).
`PlaceholderUnitView` keeps today's behaviour (jog by the agent, turn to face, tracer and flash via `CombatFx`, the ambient
flinch, the ragdoll and its blend back); stances, reloads, holds and yields have no motion yet.

**PlayMode** `CombatQolTests` (3 tests, boot to Shale, a fight started by the content's event, compile-checked against
Game.Check.dll; not yet run): the bands, the order with faces, a preview with its card and AP lit, shields where cover
stands, a held shot drawn and marked, an eye on the previewed point, an intent, a walk nobody saw undone (body and AP back);
a throw's footprint aimed and put away, the radial and the shot card with its reasons, an attack's float, the camera framing
it and easing back within the overhead pitch; end turn asked again, skip's turn unframed and quick.

**To look at first in the editor (captures at the game camera, a fight in Shale's square)**: the reach overlay (tints and
lines readable at pitch 50° and 35°, no z-fighting, the shader not pink); a walk preview by a wall (path colours, shields,
the end card's place); the shot card beside the radial (fits 1280×720 with 10 reasons); the turn order's portraits; floats
on a burst; the cluster's two rows (the plate above them; nothing over the party strip); a shot framed by the camera on a
long diagonal (both in frame, eased, no cut); a throw's footprint and arc. Then the three PlayMode tests and the frame time
of `ContinueReach` (4 ms budget) and `PredictIntent` (one a frame) on the phone.

**Left for later**: talk as a way to end a fight (the content's), the player's own flight to an exit, shooting props (no
props are listed by the places yet), the tactical top-down toggle (DESIGN_UNITY §2), dashed or animated path lines.


## WP2 delivered: animation and weapons (A1–A8), 2026-11-17
Gate: red, 55 at the last verdict; the fight's states are added to it (`docs/PEOPLE_MOTION.md` §2.7) and have not been
measured: nothing of this has been seen in the editor yet.

**What is in the branch.** The staged combat set v3 (`/home/user/second-face-staging/combat/v3`: 73 clips, its MANIFEST's
`use`, `use_with_ik` and `stopgap_hand_keyed`; `do_not_use` left out) in `Assets/SecondFace/Combat/Motion`, each sidecar with
the impact or release frames read off its own curves (`tools/unity/combat/clip_events.py`), and the 13 lore-textured weapons
in `Combat/Weapons`, with stable GUIDs (`tools/unity/combat/stage_combat.py`). Core `CombatMotion` is the one table of the
fight's motion: every state's clip by sex (a women's take as `<state>_f`), root motion per clip from the travel table (applied:
get-ups, stumbles, the crouch down, a step into a blow, the run out of cover; the rest baked in place; the height as captured
for crouches and get-ups, from the feet otherwise; the turn kept in the pose from the clip's start, applied for get-ups,
dropped for the stumble that spins), where each state goes at its cut, the grips, the holsters, each content weapon as a model.
`Editor/Build/CombatImportPostprocessor.cs` imports clips and weapons by it; `Editor/Build/CombatAnimatorBuild.cs` builds the
layers `Combat` (whole body) and `CombatArms` (arms only, over the walk) onto `People/Locomotion.controller`, the weapons'
URP materials in both paints remapped onto their models, and `Combat/CombatSet.asset` (given to `WorldAssets.Combat`). In the
game, `Game/Fighting`: `Fighter` (on each fighter's animator: layers, IK, grips, the procedural hit and recoil, the fight's
feet, root motion), `AnimatedUnitView` (the `IUnitView` hooks, every beat at its clip's frame and the fight's pace),
`CombatViews` (installed into `Combat.MakeView` by `Bootstrap`; animals and bodies without the layers keep the placeholder).
Hooks added: `OnMiss`, `OnEnd`, `OnFire(..., rounds)`, `OnThrow(arc, item)`; `ArmClearance.Holding` (the arms hold a weapon:
neither rested nor swung, still cleared of the body).

**Tests.** Core/EditMode `CombatMotionTests` (9, pass here): every state's clip staged for both sexes, no state left hanging,
loops as sidecars say, root motion against each clip's travel, each sex its own takes (the women's guard and slash body
flagged), blows, throws and shots with their frames, every content weapon a staged model, every model's grips staged, the
pace's rate. Editor `Tests/CombatBuild/CombatBuildTests` (6): the layers built from the table on a copy of the controller,
rebuilt without leftovers, clip settings by the table, beats from the sidecars, each weapon's paints and nulls where its
sidecar says, the set given to the game. PlayMode `CombatMotionPlayTests` (5): every action plays its state and comes back to
the weapon's stance (rifle, pistol, machete, fists, sledge; a man and a woman); the weapon within 1 cm of the palm and the
off hand within 2 cm of its grip through aim, shot, burst and the carried walk; every one-shot of the table goes on within its
length; the clips' import settings and the layers as built; a fight at Shale uses the animated bodies. All compile against
Game/Editor here (dotnet); none has run.

**For the editor owner, on merge** (in order): (1) merge `side/combat`; keep `ArmClearance.Holding` (three lines), §2.7 of
`docs/PEOPLE_MOTION.md` and the new entries of `docs/qa/gates/motion_gate_inputs.json`; (2) let Unity import `Combat/`
(the postprocessor sets everything: no hand settings); (3) run `Second Face/Build the fight's motion and weapons` (or
`SecondFace.EditorTools.CombatAnimatorBuild.Rebuild` from the command line) and commit what it writes (the controller, the
arms mask, the weapons' materials, `CombatSet.asset`, `WorldAssets.asset`, Unity's rewritten metas); `LocomotionBuild`
rebuilding the controller clears its layers, and the import puts them back (check it once); (4) EditMode `CombatMotionTests`,
`CombatBuildTests`; PlayMode `CombatMotionPlayTests`, then `CombatQolTests` again; (5) the gate (quick set, then the whole
cast): the verdict is stale until then; (6) review the `motion_fight_*` captures at the game camera in writing.

**Doubts to settle in the editor.** (1) The long-gun hold is README's `rifle_aim_b_cmu` (CMU 80) but the shots are built on
`rifle_aim_cmu` (CMU 79, a stance 6 cm wider): each shot crossfades between two actors' stances (the fight's feet hold the
planted feet). (2) A bladed long-gun stance points the gun off the chest's line: the offset is learnt the first time the hold
plays and the body turned by it; check it reads right. (3) The root turn is baked into the pose from each clip's start (the
people's own clips extract it); check the guards and aims face their target. (4) The standing foot plant gives way while the
fight's stance plays (it would straighten a guard's legs and narrow its stance) and the fighter keeps the feet on the ground;
the gaze clamps the head by the stance's own limits; idle gestures wait: written into §2.7 for the gate's owner to judge. (5)
The provisional aim limits are tight (H1 −3…+1.2, K1 ≤ 2.2 on two mimed takes): expect the aim states to fail first on the
hand-keyed and IK'd parts. (6) Stopgaps (hand-keyed, passing clip QA): the pistol and long-gun idles and reloads, the melee
strike, the men's throw and heavy front hits, the long-gun crouch; men's takes on women: the guard and the slash's body. (7)
No capture for prone, a crawl or full cover's lean. (8) `Fighter` writes no "Sex": a body's sex comes from its Rocketbox person
or base or the player's look (main's `Pace.SetSex` will carry it too).


## WP2 review after the first measure in game (2026-11-17, `side/combat`)
Gate: red. The first measure of the fight's states (a 10-person pick in the main project with `side/combat` merged) gave 833
failures (F1 196, A2 84, C1 76, K1 74, F4 64, H1 60, A1 60, WG2 53, H2 50, Kb 44, F3w 34, H3 30, F2 8); CombatMotionPlayTests
failed 3 of 5 and CombatBuildTests 1. Each cause below was found on the evidence (the gate's per-state numbers, the clips'
own skeletons read from their FBX, the sidecars); each fix removes the cause. Nothing here has run in Unity yet.

**Causes and fixes.**
1. *The off hand 20-46 cm from grip_off (WG2 in ready, carry, crouch; the PlayMode grip test).* Not the IK, and nothing moves
   the body: in the aim states it reaches (p50 0). The ready, carried and crouched long-gun states play the authored
   stopgaps `rifle_idle_ual` and `crouch_rifle_ual`, whose arms stand straight (elbow 0-21°, clip QA; 0° on the left) at the
   end of IK targets they never reached. On the clip's own rig, with the game's grip convention, the right hand turns a gun
   on it 54° across the chest and 35° down, and grip_off falls 71 cm from the left shoulder against a 61 cm arm: out of
   reach on every body. **Fix:** a ready hold made for each body (`HandsIk.Hold`; Core `CombatMotion.ReadyHold`, `PlaceHold`;
   `Fighter.ReadyHold`): in the frame of the body's own shoulders, the main grip at a share of the main arm's reach, the gun
   at the low ready across the body (40° down, 65° across; crouched 25°, 60°), turned up to 15° further across where a
   body's shoulders stand wide for its arms, the main hand on its grip and the off hand on grip_off by IK; the two-handed
   club's ready raised 60° before the main shoulder. Sized on a grid over every long gun's sidecar on bodies of real
   proportions: the main elbow ~105°, the support 40-65° with the hand on the fore-end, the gun clear of the trunk
   (`CombatMotionTests.TheReadyHoldsReachAndBendOnEveryBody`). The stopgap's legs, trunk and head stay.
2. *The weapon model lies a quarter turn off its frame (CombatBuildTests: bat's grip_off 12.8 cm from the sidecar's).* Each
   weapon FBX has a single root carrying the exporter's axis turn (Blender's -90° about X with Unity's conversion); placed by
   its root, every model lay turned against the frame the hands, holsters, muzzle and grip_off are in (the test stopped at
   the first weapon, the bat). **Fix:** the model fitted into the sidecar's frame by its own nulls at the build
   (`CombatSet.Weapon.Fit`, `ModelRot`, `ModelPos`) and made inside a holder in that frame (`Spawn`); the build test checks
   every weapon's nulls in the frame the game holds it in, and that each model lies along its frame.
3. *"Every one-shot left hanging" (NoStateIsLeftHanging, both bodies, every state "still playing 0.0 s on").* The
   transitions and exit times are right; the test timed each state from the frame its crossfade was asked, before the
   Animator had taken it, saw it "not playing", then found it playing 0.3 s later. **Fix:** the test waits for the state to
   begin. Ported from the main tree: the off hand's null guard (the NullReferenceException) and the bat's material remap.
4. *Floating soles (F1 2.5-4.4 cm in every standing fight state).* The clips' own feet are planted (clip QA: the ready
   0.0, the guard 0.75 cm/s); as retargeted onto these bodies they stand 2.5-4 cm over the floor, which the standing foot
   plant corrects and which is paused in a fight. **Fix:** `Fighter.Feet` puts the lower foot's lowest sole point (BodySkin's
   mesh soles, else the bind's heel and ball) on its ground through the hips, and a foot the clip has down onto its own
   ground by the leg.
5. *Straight knees bent in the aim (K1 9-18° against the actors' 1.2-1.7; Kb 23).* The fight's feet held each foot where it
   came down while the clip swayed; on a straight standing leg a centimetre bends the knee 15-20°. **Fix:** the clip's own
   creep is followed (at most 2 cm/s, inside F4).
6. *Feet sliding at 130-208 cm/s into cover and hands up (F4).* A crossfade between two stances slides the planted feet
   along the floor (the old lock held them, then let go at 14 cm and blended back in 0.12 s). **Fix:** a foot the clip
   slides fast stays and steps to its new place once 7 cm away (lifted on an arc, one foot at a time); one left more than
   2.5 cm off when the clip is still re-plants with a short step.
7. *A long gun's shots crossfade between two actors (F4, K1 22 in the shots).* The hold is CMU 80_03; the shots
   (`rifle_fire_cmu`, `rifle_burst_cmu`) are CMU 79_96 with an authored recoil, a stance 9 cm wider: every shot slid the
   feet out and back. **Fix:** the rounds are fired on the hold itself with author.py's recoil at run time
   (`Fighter.Recoil`: the chest kicked back 2.6° + 0.6° a round, the head counter-turned 0.6×, the stock's shoulder pushed
   back 1.2×, settling as exp(-t/0.1 s)). The two shot states stay built, unplayed.

**What is not a game-side cause (for the gate's owner; no limit was changed).**
- *F1 in strikes (p98 7-10 cm).* F1 adds each foot's heel height whenever its ball is down; a strike's limits allow the
  heel 13.2 cm over the ball (F2, real fighters: `fist_cross_f_cmu`'s own actor lifts it 14.4). A fighter pivoting on the
  ball reads as a floating foot under F1 and a real one under F2. The sinking part (F1 down to -5 cm) is the soles' fix
  above.
- *A1 and A2 in club and blade strikes (A1 to 136°, A2 to 2°).* The strike limits come from punches and blocks; a
  two-handed overhead chop raises the arms past them in its own capture (`club_overhead_cmu`: A1 to 127.6°). No club or
  blade strikes have been measured on real people.
- *The guard's A2 (83-97° against 112.8-146.9).* The staged guard (`fist_guard_accad`, ACCAD Male2) holds the hands lower
  than the frames the calibration counts as a guard (both wrists within 30 cm under the head): the staged clip is a real
  fighter's guard outside the calibrated state's definition. A guard cut from frames that meet it needs the converter.
- *The aim's head (H2 0-1, H3 0-1.4 in game against the clip's own 6-14 and 11-14).* Something straightens the captured
  head in game (the gaze's look-at on the base layer, or the retarget of CMU's head segment, whose per-subject offset
  reads 20-26° down and 17-31° turned at rest); an editor trace with the gaze off in the aim settles which.
- *The provisional aim limits.* No better evidence exists in CMU or ACCAD: CMU's only gun takes are 79_96 and 80_03 (the two
  measured) and 139_05 ("pulling a gun", 120 fps), measured here: a draw from a crouched stance (knees 47-60°) that never
  brings the gun up (the hands 24-58 cm under the head, the upper arms 15-75° from hanging): no aim. ACCAD's free takes have
  no aiming. The provisional limits stay.

**For the editor owner, on merge** (replaces the list above where they differ): (1) merge `side/combat`; (2) let Unity import;
run `Second Face/Build the fight's motion and weapons` (CombatMotion.Version 2: the set gains each weapon's fitted model and
butt point; the console warns of any weapon whose nulls fit its sidecar by more than 1 mm) and `Second Face/Build
localization` (CombatQolTests' two failures are "No translation found" for `combat.move.act` and `combat.card.chance`, which
are in `ui.tsv`); commit what they write; (3) EditMode `CombatMotionTests` (10), `CombatBuildTests` (6); (4) PlayMode
`CombatMotionPlayTests` (7: two new, `TheReadyHoldsHaveBothHandsOnTheWeapon`, `TheFightsFeetStandOnTheGroundAndStepBetweenStances`),
`CombatQolTests`; (5) the gate's combat pick, then the whole cast; (6) look at the long gun's ready, carry and crouch, a shot
and a burst, and a stance change at the game camera: the gun now lies in the hands' frame (before, a quarter turn off).
