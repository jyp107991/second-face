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

## 2c. Chrome and cities (cyberpunk fused with the frontier — see docs/WORLD.md)
What we take from cyberpunk (tabletop to 2077) and how scarcity changes it:
| Cyberpunk element | Our version |
|---|---|
| Cyberware everywhere | **Chrome is rare**: most people have none; a piece of chrome is a life-changing purchase or find |
| Ripperdocs | **Menders** (back-street, dark chrome) and **Concern clinics** (new, licensed, networked) |
| Humanity / cyberpsychosis | **Drift**: a gauge that rises with chrome; changes dialogue, relationships and can trigger episodes |
| Netrunning | **Riding the grid** in cities only (local grids, not a global net): doors, cameras, turrets, records |
| Braindance | **Reveries**: recorded memories — playable vignettes, investigative scrubbing for clues, a vice |
| Fixers & gigs | **Brokers** in each district with contracts; reputation with Brokers unlocks better work |
| Megacorps vs street | **The Concern** and the **Tenured** vs gangs, unions, Menders and the destitute |
| Night City | **Meridian** and **Halcyon**: deep, dense, vertical bastion cities ringed by ruins and shanties |
| Style over substance | Clothing, masks and visible chrome change how people treat you (recognition, class, fear) |

### 2c.1 Chrome system
- **Slots:** eyes · neural · arms (L/R) · legs · spine · skin · organs. One piece per slot.
- **Grades:** *old* (salvaged pre-Burn, varies), *dark* (Mender-built, crude, cheap-ish, unnetworked),
  *Concern* (new, excellent, networked — advantages and hidden risks).
- **Abilities are superhuman verbs**, e.g.: optics that show enemy weak points and through-wall heat; reflex
  wiring for a burst of extra actions; breaker arms that tear doors and armour; spring legs that leap to rooftops
  (vertical routes on maps); subdermal plating; a neural link that rides the grid; lungs that ignore dust storms
  and gas; a backup heart that restarts you once; a voice box that mimics voices.
- **Costs:** price (hundreds to thousands of Tolls), surgery time and recovery, a rejection check (Grit/Medicine of
  the surgeon), upkeep (power cells, *holdfast* drugs) — miss upkeep and chrome degrades.
- **Drift (0–100):** each piece adds Drift; Grit and companions' bonds slow it; holdfast and rest calm it. Bands
  change dialogue (cold-logic options appear; some empathy options vanish), reactions (awe, fear, contempt), and
  can trigger Drift episodes at high levels. No hard "game over" — a Drifted character is a valid ending tone.
- **Visibility:** chrome is visible on the character model and recognised; hidden chrome costs more.
- **Rarity budget:** a full playthrough offers ~10–14 chrome pieces in total; a player can carry ~4–6 before Drift
  bites hard. Choosing is the point.

### 2c.2 City play
- **Districts** with their own law level, prices, Broker, gangs, schedules, sounds and lighting (neon, smog, rain).
- **Class is spatial:** access to the Crown/arcology needs invitations, contracts, disguise or force; the Sink and
  Skirts are open to all and dangerous to all. Prices, laws and NPC behaviour differ by district.
- **Inequality you play:** the same problem looks different from the top and the bottom (a flood, an epidemic, a
  strike); many city quests ask whom the solution serves.
- **Activities:** fight pits, races, reverie dens, gambling, bounties (Drifter hunts), heists, Broker gigs, court
  defences, housing (rent/buy flats = safehouses and fast-travel points), clubs and salons.
- **Density over sprawl:** a city is ~8–10 handcrafted districts, each a dense map with interiors, verticality and
  30–60 minutes of content; transit (the Loop) links them.

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

## 13b. Settlement types (variety by design)
Each type sets layout grammar, building kit, population mix, services, law and schedules. Every named place is
handcrafted on top of its type; minor places can be generated from the type plus a seed.
| Type | Look & layout | People | Services & law | Examples |
|---|---|---|---|---|
| **Shelter** (cistern) | Concrete rings underground, hydroponics, steel doors | One community, uniform clothes | Rationing, council | Cistern 9 |
| **Well town** | Adobe and scrap around a well; main street; windpumps | Farmers, traders, a sheriff | Saloon, store, Mender (rare), local justice | Shale |
| **Raider camp** | Wreck walls, overpass decks, cages, banners | Gang members, captives | Trade by force; chief's law | Rust Dogs' overpass |
| **Toll fort** | Walls across the road, gate, tower, warehouse | Tollmen guards, clerks | Tolls, contracts, debt law | Tollhouse 9 |
| **Rail halt** | Platform, water tower, sheds; town hugs the line | Railworkers, drifters | Tickets, telegraph, timetable law | Line halts, the Junction |
| **Bridge/trade town** | Built on infrastructure (bridge decks, ship hulls); vertical stalls | Merchants, porters, guards | Markets, banks, brokers | Ninebridge |
| **Commune** | Fields, long halls, shrines, open-sky burial grounds | Choir families | Healers, communal law | Openfield |
| **Nomad camp** | Wagons in a ring, tents; **moves on the world map** over days | Wheel clans | Trade, horses/bikes, honour law | the Wheel |
| **Salvage/mining camp** | Spoil heaps, cranes, cabins, bunkhouses | Labourers, foremen | Company store, scrip, no law but the foreman | Teeth mines, Dead Ring yards |
| **Stilt village** | Houses on stilts and hulls over water; boats as streets | Fisher families | Barter, boat law | Drowned Shore |
| **Dead town** | Abandoned; scavengers, squatters, secrets | Few or none | None | Ruins everywhere |
| **Bastion city** | Districts (see §2c.2) | Everyone | Everything; corruption | Meridian, Halcyon |
Generated minor places vary by: size, prosperity, faction ownership, current crisis (drought, raid, plague, feud),
architecture kit (adobe/scrap/containers/concrete/timber/stilts), and population mix by ancestry and class.

## 13c. World scale, travel and fast travel
- **The map:** the Western Reach (~700 × 500 km), 8 regions (WORLD.md §2). The world map is a region graph of
  ~120 locations: ~25 major handcrafted locations, ~60 minor locations (handcrafted or type-generated), and ~35
  landmark/discovery sites, plus roaming encounters. Target density: something worth stopping for every ~10–15
  real minutes of overland travel.
- **Exploration rewards:** discoveries reveal map, chrome caches, unique weapons, leads, reveries, companions'
  backstories, shortcuts, and alternative routes into story places (non-linear entry to most cities and dungeons).
- **Overland travel:** pick a destination on the map; the route is drawn along known roads/paths; time passes;
  food and water are consumed; weather and encounters can interrupt. Unknown terrain is slower but discovers more.
- **Transport tiers** (each is unlocked through play and has a cost):
  | Mode | Speed | Cost / catch |
  |---|---|---|
  | Foot | slow | free; most discoveries; you carry everything |
  | Mule / horse | +30% | feed, theft, can carry loot |
  | Caravan | scheduled | pay or work your passage; safer; you go where it goes |
  | Motorbike / buggy | ×5 | fuel, repairs, noise draws raiders; vehicle storage; can be stolen |
  | The Line (rail) | a day between stations | tickets, timetables, rail-bandit events, checks at gates |
  | River barge | scheduled | cheap, slow, smuggling routes |
  | City transit (Loop, lifts) | instant between stations | fares, district access rules |
  | Tiltrotor (late) | anywhere with a pad | earned, stolen or borrowed in Act 3 |
- **Fast travel rules:** no free teleporting. Fast travel = using a network you have access to (rail stations, barge
  docks, Loop stations, caravan schedules, your own safehouses linked by a hired runner). Time still passes; events
  can fire en route; it costs money. Walking stays worthwhile because discoveries happen on foot.
- **Safehouses:** rent or claim flats/rooms in towns and cities: storage, rest, letters, and fast-travel points
  for the networks that reach them.

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
