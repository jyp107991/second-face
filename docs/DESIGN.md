# THE SECOND FACE — Design Document (spoiler-free)

## 1. Pillars
1. **Reactivity over volume.** The world notices: NPCs remember, gossip spreads, factions shift, and
   companions comment. Every quest has at least two real solutions (fight / talk / sneak / science).
2. **Characters with weight.** Personality-driven NPCs with goals that can collide with the player's.
3. **Scarcity that rewards.** Every bullet, bandage and coin matters early. Power grows
   steadily and visibly, never flooding.
4. **Atmosphere.** Dust, fog, sepia grading, lonely synth drones, old terminals, and a battered field notebook.
5. **Respect the player.** Clear rules, readable checks, no hidden failure states, generous saves,
   accessible on a phone.
6. **A frontier, not a theme park.** Lawless, but with its own customs: reputation travels with people, disputes
   are settled by whoever is present, and the world keeps moving when you are elsewhere. Genre conventions are
   borrowed only where they serve that; we prefer fresh, coherent systems to Fallout habits.

## 2. What acclaimed RPGs have in common (research synthesis) → our rules
Studied: Fallout 1/2, Fallout: New Vegas, Planescape: Torment, Arcanum, Baldur's Gate 1–3, Disco Elysium,
The Witcher 3, Mass Effect 1–2, KOTOR, Pillars of Eternity, Pentiment, Age of Decadence, Deus Ex, Divinity OS2.
Sources (design talks/interviews/reviews) are listed in §13.

| # | Common denominator | Evidence | Our rule |
|---|---|---|---|
| 1 | A personal stake in a question bigger than the hero | Disco Elysium (a city's history), New Vegas (a region's future), Witcher 3 | The photo is the hook, but the story is about the frontier and who decides its future — **no "who am I really" or chosen-one core**; the thematic question is asked of every major character |
| 2 | Factions with legible, defensible ideologies | New Vegas (NCR vs Legion clarity), Witcher 3 | Each faction states what it wants, why, and what it costs others; none is simply evil |
| 3 | Important choices never have an obvious answer | Witcher 3 (story director Blacha), Bloody Baron | Major choices trade one good for another; we review every major choice for a "dominant" option and remove it |
| 4 | Several real solutions per quest; a non-combat path that finishes the game | Fallout 1/2, New Vegas, Age of Decadence, Deus Ex | Every quest: ≥2 solutions, critical path: ≥3 incl. one non-violent; build-coverage validated by script (§3.8) |
| 5 | Failure is content, not a dead end | Disco Elysium, Pentiment | A failed check opens a different (often worse, never empty) branch |
| 6 | Readable checks, no save-scum rolls | Age of Decadence (static checks), BG3 players' complaints about rerolling | Dialogue checks are deterministic thresholds shown up front; only combat and gambling roll dice |
| 7 | The world reacts to who you are | BG3 (200+ lines for one subclass), Fallout low-INT dialogue | Lines react to origin, traits, appearance (age, scars), reputation, very low/high attributes |
| 8 | Consequences arrive later and far away | Witcher 3 | ≥30% of consequences are delayed or surface in another location; tracked via world flags + timers |
| 9 | Companions with opinions, arcs, red lines, conflicts | Baldur's Gate, Mass Effect, New Vegas | 6 companions; approval by values; personal quests; companion-vs-companion conflicts; leave/betray/intervene |
| 10 | Endings assembled from the whole game, not the last hour | Fallout epilogues; criticism of BG3's final act and of single late choices | Epilogue slides computed from ~40 world variables across all acts |
| 11 | Almost anyone can die; the story survives it | BG3 ("you will want to kill someone"), Fallout | Killable NPCs by default; every critical fact has ≥2 sources (person + record/terminal/item) |
| 12 | Specialization: viable is not the same as optimal | Josh Sawyer (New Vegas) | Skill points too few to master everything; tags; few permanent boosts; all builds viable |
| 13 | Perks that change what you can do | Sawyer's Van Buren notes, FNV, BG3 feats | Perks unlock verbs; flat +% perks are the exception |
| 14 | Mutually exclusive content drives replays | ADOM-style exclusive quests, faction routes | Faction alliances lock others out; companions conflict; origins and builds see different content |
| 15 | Every attribute matters to every build | Pillars of Eternity design goal | Each attribute has combat, exploration and dialogue uses; diminishing returns above 8 |

Existing borrowed practices retained: tag-memory dialogue (Torment), environmental combat (D:OS2),
camp scenes (Dragon Age/BG3), journal clarity (Witcher 3/Pillars), light meaningful crafting, QoL
(highlight interactables, AP cost preview, quicksave, combat speed).

## 2b. Frontier systems (beyond Fallout conventions)
Coherent features drawn from modern games, chosen because they make a lawless frontier feel lived-in.
| System | Inspiration | How it works here |
|---|---|---|
| **Reputation travels with people** (no global karma) | Kenshi, Mount & Blade, Red Dead Redemption 2 | Each settlement and faction has its own opinion of you, built from what its people *witnessed* or *heard*. News moves along roads with caravans, travellers and gossip at travel speed; places you haven't reached haven't heard yet. Rumours distort. You can arrive ahead of your reputation, or send a story ahead of you. |
| **Faces, masks and recognition** | Hitman, Assassin's Creed notoriety (inverted for RPG) | People attach news to a *face*. Masks, hoods, dirt and changed hair stop recognition (news attaches to "a masked stranger" instead). Some places admit only the known, some only the masked. Your sculpted face matters to the world. |
| **Leads board** | Return of the Obra Dinn, Shadows of Doubt, Disco Elysium thoughts | Clues (things seen, said, read) go on a board in the notebook. Linking the right clues forms a *conclusion* that unlocks dialogue, routes and check bonuses. Wrong links are allowed and cost nothing but time. |
| **Scheduled world events** | Pathologic, Majora's Mask, Citizen Sleeper | Some things will happen on a given day whether or not you are there (a raid, a hanging, a toll rise). Some can be learned in advance from rumours or documents and prevented, exploited or sold. Ignored crises resolve, often badly, and stay resolved. Clear in-game warnings; never a hidden fail state for the main path. |
| **Frontier justice** | Frostpunk, This War of Mine, Pentiment | When you hold standing in a town you are asked to settle disputes (water rights, debts, thefts, a killing) and, later, to set town rules (curfew, tribute, who may draw from the well). Rulings change the town, its people's opinions and later events. |
| **Journeys are decisions** | 80 Days, Sunless Sea, Oregon Trail, Death Stranding | Travel between places consumes food and water, risks weather (dust storms close roads, cut visibility) and offers route choices (fast and exposed vs slow and hidden). Caravans can be joined, hired or robbed. |
| **Letters** | Pentiment, epistolary games | Write to people at home and elsewhere via caravans; replies arrive days later and carry news, help, guilt and consequences. |
| **Camp** | Red Dead Redemption 2, Dragon Age | Campfire scenes with companions: talk, mend, cook, write, plan; also where letters are read. |
| **Field notebook** (UI) | — | Journal in hand-writing, people you've met with sketched portraits and what you know about them, the leads board, a folded map you annotate, gear. |

## 3. Character system
### 3.1 Attributes (7, range 1–10; base 3 + 12 points at creation; creation cap 8)
Each attribute has a **combat**, **exploration** and **dialogue** use, so none is a dump stat.
| Attribute | Combat | Exploration | Dialogue / checks |
|---|---|---|---|
| **Brawn** | melee damage, heavy-weapon handling | carry weight, forcing doors/lifting | intimidation, feats of strength |
| **Senses** | range, spotting hidden enemies | traps, hidden caches, passive "you notice…" checks | reading tells, noticing details in scenes |
| **Grit** | HP, resistances | travel endurance, healing | enduring pain/interrogation, drinking contests, withstanding fear |
| **Presence** | morale of allies, companion slots | prices, faction gains | persuasion, leadership, seduction |
| **Wits** | arc/explosive accuracy | skill points, science/medicine base | insight options; very low Wits gives simple-minded dialogue (with its own solutions) |
| **Reflex** | AP, initiative, evasion | stealth, sleight of hand | quick reactions in tense scenes (snatch, dodge, draw first) |
| **Fortune** | criticals | odd encounters, loot rolls, gambling | rare "lucky guess" options; fate's small mercies |
Very low (≤2) and very high (≥9) values unlock distinctive lines and occasional unique solutions.

### 3.2 Skills (12, range 0–100)
Consolidated from 16: the old Gambling, Throwing, Sleight, Heavy Arms and Unarmed were niche "trap" picks.
| Group | Skill | Covers |
|---|---|---|
| Combat | **Firearms** | pistols, rifles, shotguns, SMGs, machine guns (heavy guns need Brawn) |
| Combat | **Arc Weapons** | pre-Burn energy weapons |
| Combat | **Melee** | blades, clubs, spears, fists and grapples |
| Combat | **Explosives** | grenades, thrown weapons, mines, launchers; disarming bombs |
| Active | **Medicine** | healing, surgery, chems, diagnosing the sick |
| Active | **Mechanics** | repair, crafting, ammo, machines and vehicles |
| Active | **Science** | terminals, electronics, chemistry, old-world records |
| Active | **Security** | locks, safes, alarms, traps |
| Active | **Stealth** | sneaking, pickpocketing, planting items |
| Social | **Speech** | persuade, deceive, intimidate (with Brawn), calm |
| Social | **Barter** | prices, appraisal, deals and contracts |
| Social | **Survival** | travel, tracking, food, camps, animals, reading the land |
- **Every skill has dialogue checks** (e.g. Medicine to diagnose, Mechanics to understand a machine someone
  describes, Firearms to identify a weapon by sound, Survival to read tracks a witness describes).
- **Tags:** 3 tagged skills start +15 and gain +1 extra point each time you invest.
- **Skill points per level:** 8 + Wits (≈ 450 points by level 30 → ~4 skills at 100, several at 50).
- **Check tiers** used by all content: 25 / 50 / 75 / 100 (Novice, Adept, Expert, Master).
- Gambling is a Fortune + Wits minigame, not a skill.

### 3.3 Traits (pick up to 2 at creation) — each with an upside and a downside
Kept as designed (≈14). Additionally, **Marks** are traits earned through play from repeated or
defining acts (e.g. sparing many enemies, killing many, lying often, eating questionable meat). Marks
change dialogue and give a small bonus with a cost; the player can see what is building toward a Mark.

### 3.4 Perks — one every 2 levels (15 by level 30)
- ~60 perks in families (gunplay, close quarters, explosives, tech, stealth, social, survival, leadership,
  fortune, body). Most unlock **verbs** (new actions or new dialogue/exploration options); ranked perks
  are capped at 2–3 ranks.
- **Skill masteries** (free, automatic): every skill unlocks a verb at 50 and another at 100
  (e.g. Security 50: salvage parts from disarmed traps; Security 100: re-arm traps against enemies).
  These reward specialization without spending perk picks.
- Perk requirements combine level + attribute or skill, so builds open different perk menus.

### 3.5 Derived stats
HP = 15 + 2×Brawn + 3×Grit + (Grit/2 per level); AP = 5 + Reflex/2; Carry = 25 + 15×Brawn (kg);
Initiative = 2×Senses + Reflex; Crit% = Fortune; Heal rate; Resistances (rad, poison, fire, physical DR/DT).

### 3.6 Progression curve (60 h single playthrough)
XP to level n = 750 × n × (n−1) / 2 (soft curve). Targets: level 5 by end of Chapter One (~4–5 h),
level 12 mid-Act 1 end, level 20 end Act 2, level 26–30 at the finale. Kill XP is low; quest/discovery/
check XP is high (non-combat builds level at the same pace). Passing a check gives XP once per check.

### 3.7 Checks
- **Dialogue / scene checks:** deterministic: `value ≥ DC` passes. Shown as `[Speech 50]`, green when met,
  red when not. Modifiers are explicit: knowledge you've learned (−10/−25 DC), evidence items, companion
  present, reputation, chems (temporary, with a cost).
- **Passive checks** (Senses/Wits): fire automatically as interjections. They add information or options but
  never gate the critical path.
- **World checks** (locks, repairs, terminals): deterministic at or above DC; just below DC, a costly attempt
  is possible (breaks picks, burns parts, triggers alarms), never a free reroll.
- **Combat and gambling** remain random.

### 3.8 Build archetypes and coverage (validated by script)
Reference builds that must each reach every ending they qualify for and ≥70% of side content:
| Build | Core | Plays like |
|---|---|---|
| Gunslinger | Reflex, Senses · Firearms, Stealth | precise ranged fights, overwatch, quick draws |
| Bruiser | Brawn, Grit · Melee, Explosives | front-line, shoves, intimidation |
| Silver Tongue | Presence, Wits · Speech, Barter | talks through the critical path with near-zero kills |
| Shadow | Reflex, Fortune · Stealth, Security | infiltration, theft, avoidance |
| Technician | Wits · Science, Mechanics, Arc | terminals, robots, crafting, energy weapons |
| Survivor-Medic | Grit, Senses · Survival, Medicine | travel, companions, attrition, healing |
| Leader | Presence · Speech + companions | three companions, morale, delegation |
| Wildcard | Fortune · Explosives, Barter | criticals, odd events, gambling |
`npm run validate` runs each reference build's projected skills at each act against every quest's solution
requirements and fails if a build has no route through a critical-path quest.

## 4. Character creation
- Origin presets (3 ready-made Cistern residents) or full custom.
- **Face sculptor:** procedural low-poly head with ~24 parametric sliders (head shape, jaw width/length,
  chin, cheekbones, brow ridge, eye size/spacing/tilt, nose length/width/bridge, lip fullness/width,
  ears, neck), plus **age** (used by the engine to render the player older), skin tone, freckles,
  scars (8), tattoos (10), hairstyle (14), facial hair (8), hair colour, eye colour, body build (3 axes:
  height, mass, muscle), clothing dye colours, posture.
- Appearance is serialized as a compact `Appearance` object (saved with the character).
- The portrait is rendered live in-engine (lit bust) for dialogue/HUD.

## 5. Economy (scarcity curve with rewarding progression)
### 5.1 Currency
**Tolls** — stamped tin chits issued by the Tollmen, accepted everywhere along the highways. Barter of
goods is always possible (value-matched).

### 5.2 Principles
- **Faucets vs sinks, budgeted per act.** Every source of money (loot, quest rewards, selling) and every
  sink (ammo, healing, repair, bribes, fees, travel food, housing, upgrades, companion gear) is listed in a
  budget table. A tuning script (`npm run econ`) simulates a typical playthrough and reports wealth per hour.
- **Wealth curve target** (spendable Tolls on hand, typical play):
  | Point | Target | Feel |
  |---|---|---|
  | Leave Cistern | 0–20 | Pocket change |
  | End Chapter One | 150–400 | One good purchase or many small |
  | End Act 1 | 800–1,500 | First real gun or armour upgrade |
  | Mid Act 2 | 2,000–4,000 | Choices between upgrades |
  | Act 3 | 5,000–9,000 | Comfortable, never "infinite" |
- **No level-scaled loot.** Loot tables are tied to *location tier*, so exploring dangerous places early is
  a gamble with a real reward.
- **Merchant cash is finite** and restocks every few days; each merchant buys only some categories.
- **Selling prices** = 20–45% of value (Barter + reputation); buying = 120–180% of value.
- **Market saturation:** selling many of the same item type at one merchant drops its price, recovering
  over days. Kills "loot vacuum" farming.
- **Condition matters:** degraded items sell for much less; repair costs money or parts.
- **Ammo is the main sink early**; weight + scarcity keep stockpiles modest. Ammo reloading via Mechanics
  later converts junk → ammo at a modest rate.
- **Meaningful late sinks:** home base upgrades, companion gear, bribes and faction donations that change
  outcomes, rare pre-war tech, training (pay for +skill, capped).
- **Respawn rules:** handcrafted loot never respawns; random encounters and ruins are the renewable source,
  with diminishing returns per region.
- **Healing has costs**: time (rest consumes food/water and lets world clocks advance), Tolls (doctors), or
  scarce consumables.

## 6. Combat
- Turn-based on a square grid (1 m tiles) over 3D scenes; real-time exploration until hostility.
- Turn order by Initiative; AP per turn. Costs: move 1/tile, single shot 4–5, aimed +1, burst 6,
  reload 2, item 2, swap weapon 1. Unused AP → small evasion bonus.
- **Hit chance** = skill − 4×(distance beyond Senses-range) − target evasion − cover (half 20, full 40) −
  darkness (up to 25, reduced by Senses/flashlight) + aim modifiers; clamp 5–95.
- **Aimed shots:** head, eyes, torso, arms, legs, groin, weapon. Crippling effects (limp, drop weapon,
  blinded). Criticals from Fortune + perks with a critical table per body part.
- **Damage:** (weapon roll × ammo mult) − DT, then × (1 − DR). Ammo types (standard, hollow, armour-piercing,
  handloads).
- **AI:** utility-based. Scores actions: attack, move to cover, flank, retreat to heal, use item, flee
  when morale breaks, surrender (talkable). Morale from HP, allies down, leader down, player reputation (Fear).
- Combat can be avoided/ended by talking (Speech/Fear checks) or sneaking.

## 7. NPCs and relationships
### 7.1 Personality profile (each 0–100)
loyalty, greed, idealism, courage, honesty, temper, curiosity, faith, warmth.
### 7.2 NPC data (schema summary)
```ts
NPC { id, name, role, faction, personality, appearance, schedule: ScheduleEntry[],
      goals: Goal[], secrets: Secret[], knowledge: KnowledgeTag[], dialogue: DialogueId,
      inventory, barter?: MerchantDef, combat: CombatDef, relationships: { [npcId]: Bond } }
```
### 7.3 Memory & relationships
- Each NPC stores `Memory { tag, about, valence, strength, day, source: 'witnessed'|'told'|'rumour' }`.
- **Trust** (−100..100) and **Affection** (−100..100) toward the player, derived from memories + profile.
- **Gossip:** daily tick; each memory with strength ≥ threshold may spread to connected NPCs (bond
  strength × NPC curiosity), losing strength and sometimes being distorted (rumour).
- Dialogue conditions read memories (`remembers: 'player_spared_raider'`).
- Schedules: time-of-day entries (location node, activity); interruptible by events (fires, combat, gossip).
### 7.4 Companions
- Approval (−100..100) shown as reactions ("Wren approves"). Thresholds unlock arcs, banter, romance.
- Value tags determine reactions to player choices (e.g. likes: mercy, honesty; dislikes: slavery, theft).
- Inter-companion relationships with conflict scenes; at low approval or broken red lines a companion
  can leave, steal, betray, or (high approval) intervene or sacrifice.
- Up to 2 companions active (3 with high Presence perk).
### 7.5 Romance (opt-in)
- Specific companions and a few NPCs are romanceable; orientation per character, written as people.
- Progression through stages gated by approval + conversations + camp scenes; player must opt in
  explicitly; can be declined, can end, can fail through actions. Mature content handled with fade-outs
  plus written aftermath; consequences carried in memory (jealousy, loyalty).

## 8. Dialogue engine
```ts
DialogueTree { id, start: NodeId | Condition-ordered starts, nodes: { [id]: Node } }
Node { speaker, text, conditions?, effects?, options: Option[], interjections? }
Option { text, conditions?, check?: { skill|attr, dc, hidden? }, effects?, next, onFail? }
Effect = setFlag | addMemory | trust/affection | approval | reputation | giveItem | startQuest |
         advanceQuest | combat | barter | joinParty | time | ...
```
- Text supports variables (`{player.name}`) and gendered/appearance-aware variants.
- Options remember being chosen (greyed + "asked before"), and NPCs react to repeated questions.

## 9. Quest engine
```ts
Quest { id, title, giver?, stages: { [id]: Stage }, start, resolutions: Resolution[], xp }
Stage { journal, objectives: Objective[], onEnter?: Effect[] }
Objective { id, text, kind: 'flag'|'item'|'kill'|'talk'|'reach'|'state', condition, optional? }
```
Objectives evaluate world state, so any method that achieves the state completes them. Timers schedule
delayed consequences.

## 10. World & locations
- Locations are data: `Location { id, maps: MapDef[], ambience, lighting, encounters, entries }`.
- `MapDef` = grid size, tile layers (ground, walls), prop placements (from the procedural prop kit),
  lights, nav blockers, cover markers, spawn points, triggers, exits.
- World map: hex/region graph with travel time, terrain danger, random encounter tables, discoverable
  sites, procedural ruins (assembled from room templates + loot tier).

## 11. Choice & consequence rules
- Each major choice is logged as a world variable with a human-readable description (journal "Decisions").
- Choices are reviewed for dominance: if one option is best for everyone in every way, the choice is rewritten.
- Consequences: immediate (scene), local (NPC memory/gossip), delayed (timers, later acts), distant (other
  locations, epilogue). At least 30% are delayed or distant.
- No "invisible failure": when a door closes because of a choice, the journal records it.
- Kill anyone: if a key NPC dies, their knowledge survives in records, notes, terminals, or another person.
- Endings: assembled from faction states, companion fates, key decisions, and reputation (≈40 variables),
  presented as epilogue slides per place and person.

## 12. Replayability levers
1. **Origins** (3 backgrounds) with unique opening solutions, dialogue lines and one exclusive questline each.
2. **Exclusive faction alliances** in Act 2 (full alliance with one locks out others' endgame lines).
3. **Companion conflicts** (some companions cannot coexist; some leave over choices).
4. **Build-gated content** (routes, areas and scenes only some builds reach).
5. **Multiple endings** plus a hidden one, with combinatorial epilogues.
6. **Knowledge carried between runs** (codes, routes, secrets usable from the start by a player who knows).
7. **Systemic content** (world-map events, ruins, bounties) that varies per run.

## 13. Research sources (design reference)
- New Vegas faction clarity and choice: reviews/retrospectives (GameBanshee, PC Gamer).
- Josh Sawyer on viable vs optimal builds and perk design: Designer Notes #63; RPG Codex interviews; Van Buren notes.
- Larian on reactivity ("weird Dungeon Masters", killable NPCs, ending-path spreadsheets): BAFTA event report.
- Witcher 3 quest design (Bloody Baron; "an important choice should never have an obvious answer").
- Age of Decadence: static checks, specialization, non-combat route (GameBanshee reviews).
- Disco Elysium passive/active checks and failure-as-content (community analysis).
- Pillars of Eternity attribute goal ("every attribute should matter").
- CRPG choice design (mutually exclusive choices, fairness): Heroic Fantasy Games essay.

## 14. Tech plan
- TypeScript, Vite, three.js; vitest for tests; GitHub Actions → GitHub Pages; installable (PWA).
- Modules: `engine/render` (renderer, post FX: bloom, grade, grain, vignette, fog; quality presets),
  `engine/assets` (procedural meshes/textures, prop kit, character builder), `engine/scene`
  (location loading, grid, nav, A*), `engine/input` (pointer, touch gestures, keyboard),
  `engine/combat`, `engine/stats`, `engine/inventory`, `engine/dialogue`, `engine/quest`,
  `engine/npc` (AI, schedules, memory, gossip), `engine/faction`, `engine/world` (map, travel,
  encounters), `engine/save`, `engine/audio` (Web Audio synth), `engine/ui` (DOM UI, CRT style),
  `engine/dev` (overlay, console), `engine/ai-dialogue` (later).
- Content: `src/content/**` typed TS modules + `scripts/validate.ts` checks every reference.
- Story data is encoded at build time so the shipped JS doesn't expose readable story text.
- Performance: instanced/merged props, ≤150 draw calls, shadow map only for key light, DPR cap on
  mobile, post FX half-res on Low.

## 15. Save format
`{ version, meta: {slot, name, playtime, location, timestamp, portrait}, state: GameState }`, stored in
IndexedDB (fallback localStorage). Migrations keyed by version. 3 manual + quicksave + autosave slots.
Export/import as file.

## 16. Live AI dialogue (later milestone)
- Toggle in settings; player supplies their own Claude API key (stored locally only).
- Prompt per NPC = personality, role, current memories of player, knowledge tags (what they know at this
  point in the story), forbidden topics (spoiler limits), speech style. The model returns text plus
  structured intents (e.g. `offer_trade`, `refuse`, `reveal:<knowledgeTag>`), which the engine validates
  against what the NPC is allowed to do. No intent can change quest state beyond what dialogue trees permit.
