# U8 — Wren Calloway (npc_rd_03, bible comp_wren) — arc plan (SECRET, never quote to the owner)

Built 2026-11-16. Content: `src/content/dialogue/overpass.ts` (`d_rd_wren`: camp, leaving, romance; `d_rd_vasha`: the
booth, shared with Ilya's line), `src/content/quests/comp_wren.ts` (`q_comp_wren`, "Wren's Name"). Bible:
CHARACTERS_SECRET §A comp_wren; plan §7, §9 keystone 6, Build notes — Bridgeward.

## Voice kept
Dry, short, scout's observations ("Two riders, no dust"). Never says "sister": "the girl", "her"; when she reaches for the
word she stops ("Where there might be — "). Talks too much about routes (the long version of reading a road). Keeps her
word to the letter and holds others to theirs ("It's said"). Picks up Kessler's "Fair" and is annoyed to hear it.
Backstory fixed for the camp lines: a Bridgeward Dog child at six (Perpetua carried her down the stair); on the Flats a
stove-truck went up with the girl in it and Wren pulled her out by the arm (her left-hand burn is a grip; the girl's
forearm carries the other half); she left the girl with their brother to scout for Kessler, because she wanted out more
than she wanted to keep her; the brother signed for a bike and ran; the debt fell to the girl (Sable, lot four).
Consistency fix made in my file: the exodus line no longer says she brings "the girl" (the girl is on the Ninebridge
block, not at the overpass). Open inconsistency elsewhere (proposed edit): Sable's passive in ninebridge.ts puts Wren's
burn "on the right"; the bible and her NPC look have it on the left.

## The four stages (story milestones, not dates)
| # | Stage | Marker (flags) | Camp conversation (said once) | Band | What it sets / what moves her |
|---|---|---|---|---|---|
| 1 | Terms (Act 1) | `wren_joined`, before `nb_sable_settled` | `s1` "(Sit with her. Don't ask.)": she tells you about the girl and the block, because you kept the terms | approval ≥ 5 | `wren_s1`, knows `wren_told_girl`; a promise (`wren_promise_sable`, +5: she warns she will hold you to it), an honest no-promise (+3: nobody ever told her what they could pay for), or "your debt" (−5) |
| 2 | The block (Ninebridge) | `nb_sable_outcome` = freed, or `nb_sable_torn` | `s2`/`s2p` "Sable.": four pieces in the fire; the burn; the true reason she left; she stays on the road | ≥ 25 | `wren_s2`; promise kept +10 (`s2p`); "go to her" +5 (she says no, kindly), "stay" +3, "you owe me" −5 |
| 3 | The rope (Meridian) | knows `bw_wren_foretold` (the Saints' girl's line) | `s3` "The girl at the tower said your name.": she asks you to stand on the bridge; opens `q_comp_wren` | ≥ 35 (else `s3_low`: she goes alone) | `wren_bridge` = `raid` (+5) / `stood_down` (Speech 50; −15 with `bw_three_crews`, −10 at approval 60) / `alone` (−10) |
| 4 | After (past the rope) | `wren_bridge` = stood_down, or `bw_raid` = won | `s4` "You slept through.": no rope in the night; what she will do after | ≥ 45 | `wren_s4`, `wren_after` = shale / bridge / road (epilogue); "yours to say" +5 |

Adapted from the bible: "if she lives past D+200 she stops dreaming" became stage 4's milestone: past the rope is the
raid won or her standing down, never a day count (owner: no time limits). The keystone's "before the Long Night" stays
the city's line, not a timer: nothing resolves behind the player's back.

## The quest `q_comp_wren` ("Wren's Name")
tower → raid | alone | stood_down (done) → walked (done, `bw_raid` won: `wren_rope` = broken, `forecast_broken`) / hanged
(failed, `bw_raid` lost: `wren_rope` = fulfilled). It opens at stage 3's fire (until registered in quests/index.ts the
dialogue's `OPEN_ROPE` is empty and the arc runs on flags; the quest catches up from the flags when it opens).
**B3.12 must:** set `bw_raid` = 'won' | 'lost' at the raid; read `wren_bridge` (raid with you / alone), approval,
`bw_turf`, `bw_three_crews`, `ilya_wren_bridge` (a second rifle) for the odds; a lost raid with `wren_bridge` = alone
should be the likely one. Proposal (not yet canon): the booth's hand is Vasha Kade's (the Executioner): the two arcs
meet at one booth, which is why Ilya's line is wired to the same raid.

## Red line and leaving (all at a fire, with a scene, `leave`)
- **Selling people.** Resold the girl (`nb_sable_resold`) → `c_sold`, `wren_left` = sold: gone for good.
- **Kept the girl's paper** (`nb_sable_kept` and the contract still in the pack) → `c_kept`, an ultimatum: tear it
  (+40, `nb_sable_torn`, she stays) or she goes (`wren_left` = kept). **Won back** by tearing it in front of her (+45).
- **Breaks: the auction closed on the girl** (`nb_sable_outcome` = sold_on) → `c_block`: she goes after the buyer
  (`wren_left` = block), for good; if she had your promise, she names it. If she was waiting elsewhere, `gone_away`:
  she leaves on her own (no blame if you were never told).
- **The floor:** approval ≤ −20 → `c_floor` (`wren_left` = floor). **Won back once** with the truth (Speech 55, +30).
- Still to wire (P11): her red line "the Tollmen/Concern ending": she leaves before the finale if the player allies the
  Tollmen–Concern at the Long Night.
- Dismiss and rejoin: `party` "Wait here for me." and `waiting` "We're going." (both repeatable services).

## Approval ladder (visible reasons)
Existing (other files): +10 steal / +15 exodus joins; +5 standing up to Vasha at the tithe; +5 Ada's rule (exodus);
+5 a man bought out of the Tollhouse cage; +5 her name at Signal Hill; +3 the scouts; +5 her word at the orchard; −5 the
orchard cell; −3 showing a Tollman what you carry; +15 finding the girl; +30 freeing her; −20 letting the block close;
−35 keeping her; −40 reselling her; −15 lot seven bought; −15 the clerk sold to Sarr; −15 the Saints' girl sold or
given to the Concern; −15 the Crown girl sold; +5 the haunt; +15 the cache; +5 Ash at the graves.
Added (her tree): the stage choices above; +2 listening to the long version of a road; −10 for Kessler's coup, named
at the fire; romance steps +5/+10/+5; conflicts ±2–5. Proposed elsewhere (see report): the Bridgeward chain (Rustmouths
held −10, Gilt +5, three crews +10), Dry Wells sold to the guild −5.

## Conflicts (camp exchanges, both travelling)
1. **Wren ↔ Ilya** (her tree, `x_ilya`; any time both are with you): the water can at four hundred paces; "you weren't
   Kade… it isn't enough". Side with her (+3/−2), with him (−2/+3), or "same woman gone" (+2/+2, `wren_ilya_truce`).
   Second beat in Ilya's tree at stage 3 (`x_wren`): she asks him to stand on the bridge (`ilya_wren_bridge`).
2. **Wren ↔ Odile** (her tree, `x_odile`; after the block is settled): Odile wrote the first sheet. "Tell her what
   you'll pay" (+5 Wren, −3 Odile), defend Odile (−3/+3), or silence.

## Romance (bible: guarded, physical before verbal; a roof where she says the dream aloud)
Opt-in only at a fire; she asks at every step; any answer is allowed with no penalty beyond the moment; never gifts.
1. `r1` (stage 2 done, approval ≥ 40): her shoulder against yours, "This all right?" → yes (`wren_rom` = yes, +5) /
   not tonight (`later`; one second chance `r1b` after stage 3) / no (closed kindly).
2. `r2` (yes, stage 3 said, ≥ 50): the roof; the dream of the rope since she was twelve; goggles off; "Stay up here…
   Say if you don't." → I want to (`roof`, +10, fade) / not tonight (`later_roof`; one more ask `r2b` after stage 4) / no.
3. `r3` (roof, stage 4 said): "A route or a stop" → commitment (`committed`, `romance_partner` = npc_rd_03) or a kind no.
**Fails** (`c_rom_end`, `wren_rom` = ended) if approval falls to 30 or below while it is on: she keeps a count; the
scene names it if you sold a person. Her leaving ends it too. **Changes later:** `wren_rom`, `wren_after` and
`wren_rope` are epilogue variables (P11); a committed romance should colour her ending slide and the bridge's.
Cross-companion: my opt-ins check `romance_partner` (unset or Wren) so a committed romance elsewhere closes hers.

**Built in B3.12** (`dialogue/md_raid.ts`, `d_bw_raid`): the raid as planned above; Vasha Kade is the booth's hand. Odds and
outcomes: STORY_PLAN_SECRET.md, Build notes — B3.12. A lost raid sets `wren_hanged` and `wren_left` = hanged (she is placed
nowhere after); a won one keeps her travelling and sets `bw_dogs_hold`. Still open: her `left` node has no text of its own
for `hanged` (unreachable: she is never placed).
