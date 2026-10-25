# THE SECOND FACE — Design Document (spoiler-free)

## 1. Pillars
1. **Reactivity over volume.** The world notices: NPCs remember, gossip spreads, factions shift, and
   companions comment. Every quest has at least two real solutions (fight / talk / sneak / science).
2. **Characters with weight.** Personality-driven NPCs with goals that can collide with the player's.
3. **Scarcity that rewards.** Every bullet, stimpack-equivalent and coin matters early. Power grows
   steadily and visibly, never flooding.
4. **Atmosphere.** Dust, fog, sepia grading, lonely synth drones, CRT terminals and a wrist computer.
5. **Respect the player.** Clear rules, readable checks, no hidden failure states, generous saves,
   accessible on a phone.

## 2. Best practices borrowed from leading RPGs (mechanics only)
| Practice | Source of inspiration (genre) | Our implementation |
|---|---|---|
| Visible skill checks, some hidden "passive" ones | Disco Elysium, BG3 | Dialogue options tagged `[Speech 45]`; passive Senses/Wits checks fire unprompted interjections |
| Failure is content, not a dead end | Disco Elysium, Pentiment | Failed checks branch to new paths; no quest is lost to a single roll |
| Companion approval + personal arcs + banter | Mass Effect, Dragon Age, BG3 | Approval per companion, arcs gated by approval/story, banter on travel/rest/location triggers |
| Companions with their own red lines | Baldur's Gate, New Vegas | Companions leave, turn hostile, or intervene depending on values |
| Faction reputation with gradients | New Vegas | Two axes per faction: **Respect** and **Fear** → labels (Idolized, Feared, Despised…) |
| Many quest solutions + emergent ones | Deus Ex, Arcanum | Objectives are state-based (e.g. "door open"), not scripted-action-based |
| Environmental interaction in combat | Divinity: Original Sin 2 | Explosive barrels, oil/fire, smoke, doors, high ground, darkness |
| Consequences shown later | Witcher 3 | Delayed consequences scheduled via quest engine timers/flags |
| Epilogue for places and people | Classic iso RPGs | Ending slides built from world state |
| Crafting light, meaningful | New Vegas, Pathfinder | Repair, ammo reloading, chems, food — no junk-spam crafting |
| Journal clarity | Witcher 3, Pillars | Journal with entries, objectives, optional markers (toggle), notes |
| Rest/camp scenes | Dragon Age, BG3 | Camp on the world map: banter, romance beats, crafting, healing at cost of time/food |
| Builds that feel different | Fallout-likes, Arcanum | Traits with downsides, perks that unlock new verbs (not just +5%) |
| Tag-based "remember what you did" dialogue | Planescape | Memory tags feed dialogue conditions |
| Quality of life | modern standard | Highlight interactables (hold), auto-loot rules, item compare, quicksave, combat speed, AP cost preview before committing a move |

## 3. Character system
### 3.1 Attributes (7, range 1–10, 33 points to distribute, base 3 each + 12 free)
| Attribute | Governs |
|---|---|
| **Brawn** | carry weight, melee damage, heavy weapons, HP |
| **Senses** | range penalties, spotting traps/stealthers, passive perception checks, night vision |
| **Grit** | HP, radiation/poison resistance, healing rate, stamina for travel |
| **Presence** | dialogue options, companion slots, barter, faction gain rate |
| **Wits** | skill points per level, science/medicine, dialogue insight checks |
| **Reflex** | AP, initiative, evasion, stealth, firearms |
| **Fortune** | criticals, random encounter odds, loot quality rolls, gambling, odd events |

### 3.2 Skills (16, 0–150%)
Combat: **Firearms, Heavy Arms, Arc Weapons** (pre-war energy), **Melee, Unarmed, Throwing**
Active: **Medicine, Mechanics** (repair, traps disarm, locks with tools), **Science** (terminals, chems, electronics), **Stealth, Sleight** (pickpocket/plant), **Locks**
Social/world: **Speech, Barter, Survival** (travel, food, tracking, camp), **Gambling**
- Tag 3 skills: +20% and double growth.
- Skill points per level: 5 + 2×Wits.

### 3.3 Traits (pick up to 2 at creation, ~14 total) — each with an upside and a downside
e.g. *Heavy-Handed* (+melee dmg, −crit chance), *Twitchy* (+initiative, −aim), *Bookish* (+skill points,
−HP), *Sweet-Talker* (+Speech, NPCs distrust your honesty), *Night Owl*, *Glutton*, *Cistern-Pale*
(bonus indoors, penalty in harsh sun), *One Hand* (bonus one-handed, no two-handed), *Old Debts*…

### 3.4 Perks
Every 3 levels (level cap 30 → 10 perks). Perks unlock **verbs** where possible: "Mechanic's Eye — see
weapon condition of enemies; aim at weapon to jam it", "Confessor — NPCs with Trust ≥ 50 reveal one secret".

### 3.5 Derived stats
HP = 15 + 2×Brawn + 3×Grit + (Grit/2 per level); AP = 5 + Reflex/2; Carry = 25 + 15×Brawn (kg);
Initiative = 2×Senses + Reflex; Crit% = Fortune; Heal rate; Resistances (rad, poison, fire, physical DR/DT).

### 3.6 Progression curve (60 h single playthrough)
XP to level n = 750 × n × (n−1) / 2 (soft curve). Targets: level 5 by end of Chapter One (~4–5 h),
level 12 mid-Act 1 end, level 20 end Act 2, level 26–30 at the finale. Kill XP is low; quest/discovery/
check XP is high (non-combat builds level at the same pace).

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
         advanceQuest | combat | barter | joinParty | time | karma | ...
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

## 11. Tech plan
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

## 12. Save format
`{ version, meta: {slot, name, playtime, location, timestamp, portrait}, state: GameState }`, stored in
IndexedDB (fallback localStorage). Migrations keyed by version. 3 manual + quicksave + autosave slots.
Export/import as file.

## 13. Live AI dialogue (later milestone)
- Toggle in settings; player supplies their own Claude API key (stored locally only).
- Prompt per NPC = personality, role, current memories of player, knowledge tags (what they know at this
  point in the story), forbidden topics (spoiler limits), speech style. The model returns text plus
  structured intents (e.g. `offer_trade`, `refuse`, `reveal:<knowledgeTag>`), which the engine validates
  against what the NPC is allowed to do. No intent can change quest state beyond what dialogue trees permit.
