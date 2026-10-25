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
