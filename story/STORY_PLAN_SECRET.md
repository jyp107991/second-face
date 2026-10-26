# STORY PLAN — SECRET (never quote to the owner)

Source of truth for the plot is `STORY_SECRET.md` (owner's original). The owner authorised changes that
improve quality/originality; every change is logged in §3.

## 1. Road test against common traits of critically lauded RPGs
(Planescape: Torment, Fallout 1/2, New Vegas, Disco Elysium, Baldur's Gate 1–3, Mass Effect, KOTOR,
Witcher 3, Pentiment, Arcanum, Mask of the Betrayer, Pillars of Eternity.)

| Common trait | Original story | Verdict | Fix |
|---|---|---|---|
| Personal hook + mystery | Photo of an older self | Strong | Keep. Photo uses the player's own sculpted face aged by the engine — mechanics serve theme. |
| Central theme asked as a question | Identity / continuity of self | Strong, but needs an explicit question | Thematic question: **"Is a life yours if someone else lived it first?"** Every major NPC/companion answers it differently. |
| Theme expressed through mechanics | — | Missing | Memory system: NPCs "remember" things the player never did (previous iteration). Dialogue options flagged *[Familiar]* appear from imprint residue. |
| Antagonist with a defensible worldview | MOTHER and the Founder both have one | Strong | Make MOTHER sincere and tender, not cold: it grieves each renewal and logs every person. The Founder is right about the killing and wrong about the means. |
| Factions morally grey | Rust Dogs and Tollmen risk being flat | Weak | Rust Dogs: starving after the Tollmen raised road tolls; Kessler keeps them from worse. Tollmen: the only reason trade and medicine move at all. |
| Twist foreshadowed fairly | Seed bank twist appears late | Weak | Plant early: Cistern hydroponics are oddly diverse; a locked "Archive" room MOTHER never discusses; Choir farms fail from blight; Shale's wells grow nothing new; a Tollman buys "any seed, any price". |
| Midpoint escalation inside Act 1 | Ch1 = breadcrumbs only | Weak | End of Ch1 includes an uncanny beat: the old drifter in Shale says he met someone "with your face, forty years back, same scar"(if any) — and the map has the player's handwriting on it. |
| Choice with cost, no clean "best" ending | Hidden ending is clean-ish | OK | Hidden ending costs the Founder's life AND requires the player to accept something irreversible (§4). |
| Golden path not locked to one build | Needs Science/Speech | Weak | Alternatives: Ledger records + Founder trust + one of (Science 80, Speech 80, a companion with science, or a Mechanics bypass that costs a companion's trust). |
| Companions embody theme | Not defined | Missing | See §5. |
| Avoid hard timers that punish exploration | Act 3 renewal "imminent" | Risk | Soft timer: the renewal date is only set when Act 3 begins; days pass only via travel/rest; the journal shows the countdown. |
| Hometown stakes | Residents you grew up with | Strong | Make them people: Tamsin (companion) is a resident and is on the renewal list. |
| Complicity layer (originality) | Residents unaware | Add | One elder half-knows (imprint residue + a buried log). Sending the player out was partly to save them before renewal — or to be rid of a "drifting" template. Ambiguous until Act 3. |
| Originality check | Clone-shelter twist echoes Fallout vault experiments, *Moon*, *SOMA*, *Never Let Me Go* | Risk | Emphasis moves to what is genuinely fresh: **meeting and judging your own older self**, who built a beloved movement on a hidden war — and the hometown's quiet complicity. The seed-bank dilemma is reframed as *the only future anyone has* vs *the people alive now*. |

## 2. Timeline consistency (decided)
- Last renewal: 41 years ago. The previous player (~44 then) escaped during it with their companion.
- MOTHER quarantined the player's template after the escape and only re-grew it ~24 years ago, so the
  current player is ~24 (adult, starts ~22–26 depending on the age slider; photo shows age ~45).
- The Founder is now ~85. The stranger was ~70 (companion of the previous player, sent back east-to-west).
- Renewal due "now-ish": scheduled when Act 3 opens.

## 3. Change log vs original
1. Added thematic question and *[Familiar]* memory mechanic.
2. Greyed Rust Dogs/Tollmen motivations.
3. Seed-bank foreshadowing beats across Acts 1–2.
4. Ch1 ending beat: old drifter + handwriting on the map.
5. Golden ending accessible to non-Science/Speech builds via alternates.
6. Elder complicity layer (ambiguous).
7. Soft renewal timer.

## 4. Endings (detail to be expanded in M9)
As original (Founder / MOTHER / Tollmen / hidden), plus per-faction epilogues. Hidden ending extra cost:
the player must let MOTHER keep the imprint archive of the *current* residents (they keep living but their
"originals" remain stored) — a choice some companions hate.

## 5. Chapter One — detailed plan (M3)
### Locations
- **Cistern 9**: entrance hall + great door, living ring, hydroponics, clinic, MOTHER's terminal alcove,
  armoury (locked), maintenance shaft (sneak exit), Archive door (locked, Act 3).
- **Shale**: main street, saloon "The Dry Well", sheriff's office + cells, Tollmen trading post, Choir
  mission tent, wells, outskirts shacks.
- **Rust Dogs camp**: wrecked overpass camp, gate, pens (prisoners), mess, Kessler's bus, scrap tower.

### NPCs (neutral IDs in content)
| id | Name | Role | Notes |
|---|---|---|---|
| npc_c9_01 | Elder Ines Halloran | council head | complicity layer; warm, evasive |
| npc_c9_02 | Doc Aurel Pell | healer | examines the stranger; notes sigil on mask; curious, honest |
| npc_c9_03 | Tamsin Roe | drifter-at-heart | **companion 1**; childhood friend; reckless, idealist |
| npc_c9_04 | Bram Coyle | technician | devoted to MOTHER; guards the door; bribable with parts |
| npc_c9_05 | MOTHER | caretaker AI | terminal NPC; tender, formal |
| npc_sh_01 | Sheriff Ada Vey | guard | tired, principled, pragmatic |
| npc_sh_02 | Deputy Jonah Reese | guard | young, brave, hot-tempered; may die in Tribute Day |
| npc_sh_03 | Mags Durrow | trader/schemer | saloon owner; gossip hub; greedy, loyal to Shale |
| npc_sh_04 | Factor Ozias Pike | Tollman trader | courteous, ruthless; buys seeds (foreshadow) |
| npc_sh_05 | Sister Calla | Choir healer | kind; sees the sigil and goes quiet |
| npc_sh_06 | Hollis Crane | old drifter | "your face, forty years back" |
| npc_rd_01 | Kessler | raider boss | has the map; pragmatic; respects nerve |
| npc_rd_02 | Vasha Kade | lieutenant | ambitious; wants Kessler gone |
| npc_rd_03 | Wren Calloway | scout | **companion 2** (optional); wants out; sardonic, loyal once earned; romanceable |
| npc_rd_04 | Teo Marsh | prisoner | Shale trader; Mags's partner (debt subplot) |

### Quests
1. **q_ch1_door** — The stranger at the door → examine, consult, gear up, leave. Solutions: earn armoury
   access from Ines (Speech), bribe/persuade Bram, or crawl the maintenance shaft (Stealth/Mechanics).
2. **q_ch1_shale** — Arrive in Shale, learn the stranger sold a map to Kessler (from Mags/Ada/Hollis).
3. **q_ch1_tribute** — Rust Dogs' tribute collection: fight with militia, negotiate a lower tribute, sabotage
   their truck, or pay it yourself. Jonah's survival depends on approach.
4. **q_ch1_debts** — Mags's debt to the Tollmen tied to Teo's capture; side with Mags, Pike, or broker.
5. **q_ch1_prisoner** — Free Teo from the pens: sneak, buy, trade, or fight; Wren can help.
6. **q_ch1_map** — Get the stranger's map from Kessler: buy, win a wager, steal, Speech, or back Vasha's coup.
   On getting it: handwriting beat + Hollis's line → Chapter One ends.
7. **q_ch1_oldface** (small) — Hollis's medicine; unlocks his story.
Companion: Wren's recruitment folded into 5/6; Tamsin joins at Cistern if approval ≥ 0.

---------------------------------------------------------------------------------------------------
## 6. Full-game structure (G3 pass — research-driven; see DESIGN §2/§11/§12 for the rules applied)

### 6.1 Theme engine
Thematic question: **"Is a life yours if someone else lived it first?"** Every faction and companion answers it,
and the endings are the player's answer.
| Who | Their answer (said in their own words, never as a slogan) |
|---|---|
| MOTHER | A life is a pattern. I keep the pattern safe; therefore it is yours, again and again. |
| The Founder / Choir | A life is yours only if it can end. Walls that keep you forever are a grave. |
| The Ledger | A life is what the record says. The record says you are Citizen 9-417, debts and all. |
| The Tollmen | A life is what it can be traded for, and patterns can be traded many times. |
| Rust Dogs (Kessler / Vasha) | A life is what you can hold (Kessler: hold carefully; Vasha: hold by force). |
| Shale | A life is the people who'd bury you. |

### 6.2 Mechanics that carry the theme
- **Echoes** (UI name: *Intuitions*, unexplained until Act 2): residue of the previous self's memory imprint.
  Triggered at places/people tied to the previous life (Senses/Wits passive, some automatic). An Echo gives a
  fragment (image + line), a knowledge tag (passwords, routes, names) and can be *internalized* into one of
  3 slots (Disco-style): a bonus with a quirk (e.g. *Old Trigger Finger*: +Firearms, −Speech with Choir).
  ~24 Echoes; ~8 on the critical path give alternative solutions (a non-skill route for any build).
- **The Ledger record**: the city AI holds the previous self's citizen file — property, debts, crimes. The
  player can claim the old self's sealed property (a cache in Meridian = the place in the photo), be detained
  for the old self's crimes, or have the record altered (Science/Speech/Barter route). Legal identity = theme.
- **[Familiar] options**: NPCs over ~60 who met the previous self react to the player's face; the engine
  compares appearance to the aged photo (same face, younger), so lines vary by how much the player changed
  their look (scars/tattoos/hair make some old acquaintances doubt it — a deliberate reward for the sculptor).

### 6.3 Map of the world (by act)
| Region | Locations | Act |
|---|---|---|
| **The Sallow** (home basin) | Cistern 9 · Shale · Rust Dogs overpass camp · Dry Wells pump station · Tollhouse 9 (highway gate) · Burnt Orchard (Choir field mission) · Signal Hill relay · Saltpan flats (encounters) | Ch1, Act 1 |
| **The Glass Flats** | Ninebridge (Tollmen exchange city on a broken bridge) · Openfield (Choir farm commune, blight) · Cistern 4 (dead shelter) · The Sump (flooded transit tunnels, scavenger clans) | Act 2 |
| **Meridian** (the ruined city of the photo) | The Precinct (Ledger-governed district) · Archive Spire · Old Market · the previous self's sealed flat · Bridgeward (Rust Dogs' old haunt) | Act 2 |
| **The High Country** | High Tabernacle (Founder's retreat) · Cistern 9 core / Archive vault | Act 3 |

### 6.4 Hours budget (single playthrough, typical)
| Segment | Critical path | Side/companion | Systemic | Total |
|---|---|---|---|---|
| Chapter One | 3.0 | 1.5 | 0.5 | 5 |
| Act 1 (rest) | 3.0 | 3.0 | 1.5 | 7.5 |
| Act 2 | 9.0 | 10.0 | 5.0 | 24 |
| Act 3 | 5.0 | 3.0 | 1.0 | 9 |
| Endings/epilogue | 1.0 | — | — | 1 |
| World map travel/events/ruins (spread) | — | — | 14 | 14 |
| **Total** | 21 | 17.5 | 22 | **~60** |

### 6.5 Main quest (critical path) — each with ≥3 routes incl. one non-violent
| # | id | Beat | Routes (F=fight, T=talk, S=stealth, X=science/tech, E=Echo/knowledge, B=barter) |
|---|---|---|---|
| 1 | q_ch1_door | Stranger dies; leave Cistern | T (Ines), B (Bram parts), S/X (maintenance shaft) |
| 2 | q_ch1_shale | Arrive Shale; trace the stranger | T (Mags/Ada/Hollis), Survival tracks, B (buy rumour) |
| 3 | q_ch1_map | Get the map from Kessler | B, T (wager/speech), S (steal), F (Vasha coup), E (none yet) |
| 4 | q_a1_tollhouse | Pass Tollhouse 9 onto the highway | B (toll/contract), T (forged pass from Mags), S (night crossing), F (raid with Rust Dogs), X (gate terminal) |
| 5 | q_a1_signal | Signal Hill: the map's first waypoint; first Echo | X (relay), Survival (route), E (first Echo opens it), S |
| 6 | q_a1_drywells | Dry Wells crisis: Shale's water vs Rust Dogs vs Tollmen — Act 1 finale | F/T/X/B; outcome sets Shale's fate and who escorts you east |
| 7 | q_a2_ninebridge | Reach Ninebridge; who financed the stranger? | B, T, S (Exchange ledgers), X |
| 8 | q_a2_openfield | Choir commune; the blight; the masked "Elder" is "away" | Medicine/Science (blight), T, S, Survival |
| 9 | q_a2_cistern4 | Dead shelter: a failed cycle — **reveal 1 (cycles exist)** | X (terminals), Medicine (remains), E, S; F vs Sumpers optional |
| 10 | q_a2_precinct | Enter Meridian's Precinct; the Ledger knows your face as Citizen 9-417 | T/B (legal), X (record), S, F (riot); detention branch |
| 11 | q_a2_record | Archive Spire: your citizen file — **reveal 2 (the previous self escaped; same person)** | X, T (Assessor Nine), E (old password), S |
| 12 | q_a2_flat | The sealed flat (the photo's place): letters, recordings, a name — Choir sigil | Security/E/T(Ledger claim) |
| 13 | q_a2_longnight | The Long Night: Choir vs Tollmen war over Openfield's seed stores; the Ledger evicts both — **exclusive alliance** | Ally Choir / Tollmen / Ledger / broker truce (Speech 75 + 2 faction favours) |
| 14 | q_a2_unmasking | High Tabernacle summons you; the Founder unmasks — **reveal 3** | conversation-centric; ends Act 2 |
| 15 | q_a3_return | Renewal date set; get home (soft timer) with allies | travel/army logistics by alliance |
| 16 | q_a3_cistern | Cistern 9 under lockdown; elders, MOTHER's voice, Tamsin on the list | T/S/X/F |
| 17 | q_a3_core | MOTHER's core / Archive vault — **reveal 4 (seed bank)** | X/T/E; the Founder's genetic-lock gambit |
| 18 | q_a3_choice | Final choice → ending | §6.9 |

### 6.6 Faction questlines (≈6 quests each; Act 2 alliance locks others' last 2 quests)
- **Shale** (Sheriff Ada Vey): tribute day → militia training → Dry Wells → "Sheriff's last ride" (Act 2 letter;
  Ada asks for help against a Tollmen buyout) → epilogue: free town / Tollmen company town / Rust Dogs' town.
- **Rust Dogs** (Kessler / Vasha Kade): tribute → prisoner → map → succession (back Kessler, Vasha, or Wren's
  exodus that dissolves the gang into Shale) → Bridgeward raid (Act 2) → epilogue.
- **Tollmen** (Factor Ozias Pike → Grand Factor Imelda Sarr in Ninebridge): seed buying (foreshadow) →
  contract runs → Exchange audit → "Patterns" (they learn of templates; want MOTHER for labour) → Long Night.
- **Choir of the Open Sky** (Sister Calla → Elder Mason in Openfield): healing tents → blight cure → "the
  Sky Rite" (a beautiful burial rite = theme) → hidden militia caches (grey turn) → Long Night.
- **The Ledger** (Assessor Nine / the Spire): citizenship hearing → debt of 9-417 → "Eviction Order" →
  record amendment (can rewrite who you are legally) → Long Night as enforcer.
- **Cistern 9 / MOTHER** (Elder Ines, Doc Pell, Bram): letters home via caravans (Act 1–2, choose what to tell
  them) → Act 3 lockdown → core.

### 6.7 Companions (6; max 2 active, 3 with Leader)
| id | Name | From | Answer to the theme | Likes / dislikes | Personal quest | Red line | Romance |
|---|---|---|---|---|---|---|---|
| comp_tamsin | Tamsin Roe | Cistern 9 (childhood friend) | "I don't care who I was. I care who I'm with." | loyalty, daring / cruelty to Cistern folk, cowardice | *The Other Tamsin*: letters in Shale's graveyard signed by a Tamsin 40 years dead | siding with renewal | yes (any) |
| comp_wren | Wren Calloway | Rust Dogs scout | "Lives get stolen. Mine was. I'm stealing it back." | keeping your word, cunning / slavers, Tollmen indenture | *Sold Sister*: her sister in Tollmen debt-labour in Ninebridge | Tollmen ending; selling people | yes (any) |
| comp_ash | Brother Ash | Choir acolyte, ex-raider | "A life is yours when you've forgiven what it did." | mercy, honesty / lies, needless killing | *The Gully*: atone for a massacre he joined | betraying the Choir before Act 2 end — and he is secretly reporting to the Founder (reveal Act 2; can choose you) | no (vow) |
| comp_nine | Assessor Nine | Ledger municipal robot | "A life belongs to whoever holds the deed. I am looking for mine." | lawfulness, contracts kept / fraud, vandalism | *Title Deed*: find/buy/forge its ownership record and decide whether to free it | destroying the Ledger | no |
| comp_odile | Odile Marchetti | Tollmen defector, seed broker (55) | "Everything's borrowed. Pay it back with interest and you're square." | fair deals, preserving things / waste, destruction | *The Seed Road*: her lost seed caravan route (foreshadows reveal 4) | destroying the seed bank | no |
| comp_ilya | Ilya Strand | disgraced Shale militia sniper | "You become what you did. I'm still paying for mine." | protecting the weak, sobriety / raiders, cruelty | *Names on a Wall*: the raider who killed his family (it is Vasha) | sparing Vasha without cause | yes (any) |
Conflicts: Wren↔Ilya (raider past), Wren↔Odile (Tollmen debt-labour), Ash↔Nine (mercy vs law), Tamsin↔Ash (Act 3,
Choir vs home). Build coverage: Nine (Science/Security), Odile (Barter/Survival), Ilya (Firearms), Wren (Stealth),
Ash (Medicine/shotgun), Tamsin (Melee + Cistern knowledge).

### 6.8 Origins (4 creation presets → exclusive content)
| Origin | Opening advantage | Exclusive thread |
|---|---|---|
| Pump Hand | knows the maintenance shaft (Cistern exit) | *Pressure*: the Cistern's water readings never change — first seed of doubt (Act 1) |
| Clinic Aide | Doc Pell confides the stranger's wounds | *Charts*: identical medical charts 40 years apart (Act 2 payoff in Cistern 4) |
| Door Watch | sees the stranger alive for a moment — he says one word | *The Word*: it opens an Echo early (Act 1) |
| Archive Clerk | reads the stranger's notebook cipher | *Copyist*: a rewritten record in the Cistern archive (Act 3 payoff) |

### 6.9 Endings matrix
Main endings: **A Founder** (destroy MOTHER + bank) · **B MOTHER** (cycle continues; player may be renewed) ·
**C Tollmen** (patterns sold; labour empire) · **D Hidden: Release** (renewals stopped, seed bank released;
costs the Founder's life and the player accepts the current residents' imprints stay stored).
Hidden-ending requirements (any build): Ledger record evidence + Founder trust ≥ "Confides" + ONE of
(Science 75 · Speech 75 · Assessor Nine in party · Echo *The Second Key* internalized · Mechanics 75 bypass that
costs Tamsin's or Ash's approval).
Epilogue variables (≈40): Shale fate; Rust Dogs leader/dissolved; Tollmen power; Choir fate; Ledger state
(running/amended/destroyed); Cistern residents (alive/renewed/freed); each companion's fate (6) and romance;
Wren's sister; Ilya's revenge; Odile's seed road; Nine's deed; Ash's atonement; Hollis; Jonah; Mags & Teo;
Imelda Sarr; Vasha; Kessler; Openfield blight; Dry Wells water; Sump clans; player's legal identity; Echoes
internalized (tone of the final narration); karma/reputation tone.

### 6.10 Delayed consequences (seed list; ≥30% of all consequences)
Jonah's survival → Act 2 letter from Shale; Teo freed → Mags becomes your Act 2 courier; Kessler spared → turns
up in Ninebridge owing you; Dry Wells sabotage → Act 2 refugees at Openfield; what you write home → Ines's
behaviour in Act 3; Signal Hill relay restored → Act 3 broadcast option; Cistern 4 logs taken → Ledger hearing
DC −25; Ash's secret discovered early → Founder's trust lower; Nine freed → Ledger enforcement in Long Night.

### 6.11 Side quest catalogue (~40; 20–60 min each)
Sallow: Hollis's medicine · Pump-station ghosts (squatters) · The Saltpan wreck · Mags's ledger · Militia drills ·
Orchard thieves (Choir) · Dog races at the overpass · A letter for Bram · Signal Hill's last broadcast ·
Old Tollhouse ledger forgery. Glass Flats: Ninebridge debt auctions · The bridge-toll strike · Sump clan feud ·
Lost caravan (Odile) · Openfield's well-poisoner · Seed thief at Openfield · Cistern 4 survivor's diary (no survivor).
Meridian: Citizenship exam · The Precinct's unpaid fines (yours) · Old Market haunted kiosk (pre-war AI toy) ·
Spire elevator · Bridgeward raid · A photograph shop (the photo's photographer's studio) · Ledger court case
(defend a squatter) · Rooftop gardens · Riot in the Old Market. Companion quests (6). Systemic: bounties,
trade runs, ruins, caravans, rare encounters (Strange Luck).

### 6.12 Build coverage check (critical path; every reference build must have ≥1 route)
| Quest | Gunslinger | Bruiser | Silver Tongue | Shadow | Technician | Survivor-Medic | Leader | Wildcard |
|---|---|---|---|---|---|---|---|---|
| door | shaft(S) | Bram(B)/force | Ines(T) | shaft(S) | shaft(X) | Pell route(T) | Ines(T) | Bram(B) |
| map | coup(F) | coup(F)/wager | Kessler(T) | steal(S) | wager/X | Wren(T) | Kessler(T) | wager(Fortune) |
| tollhouse | night(S)/raid | raid(F) | forged pass | night(S) | terminal(X) | Survival bypass | contract(B) | toll(B) |
| cistern4 | F+S | F | E/T (Sumpers) | S | X | Medicine | companions | Fortune cache |
| record | S | F riot/detention | T | S | X | E | T | B |
| longnight | ally | ally | broker | ally | ally | ally | broker | ally |
| core | E/X via Nine | E | T | S/E | X | E | T | E |
(Each `npm run validate` pass will check this from content data once quests exist — G5.)
