# U8 — Ilya Strand (npc_sh_17, bible comp_ilya) — arc plan (SECRET, never quote to the owner)

Built 2026-11-16. Content: `src/content/dialogue/a1_shale.ts` (`d_sh_ilya`: camp, leaving, romance),
`src/content/dialogue/overpass.ts` (`d_rd_vasha`: his interjections at the overpass, and the booth where his line
ends), `src/content/quests/comp_ilya.ts` (`q_comp_ilya`, "Ilya's Letter"). Bible: CHARACTERS_SECRET §A comp_ilya,
plan §7 (Names on a Wall).

## Voice kept
Few words; counts aloud (stars, sticks, rounds, days); "Right." for every feeling, once in a while meaning only one
thing. Never says his daughters' names ("two girls"); says his wife's carefully, like chambering a round: **Agi** (new,
mine: Agathe Strand, the healer). Talks too much about wind (the hour-long "short version"). Facts fixed for the camp:
the raid was eleven springs ago, on the dark of the moon, eleven Dogs up the wash, the medicine store; he was three
nights east on a hunt; frostbite the winter after cost the two fingers; Ada kept him on as her worst shot.

## The four stages (story milestones, not dates)
| # | Stage | Marker (flags) | Camp conversation (said once) | Band | What it sets / what moves him |
|---|---|---|---|---|---|
| 1 | The bottle (Act 1) | `ilya_recruited` | `s1` "(Sit. Let him count.)": four days sober; he hands you his bottle: carry it | approval ≥ 0 | `ilya_s1`, `ilya_sober_days` +4; take it (+5, `ilya_bottle_given`, gives c_bitters, his rule: never hand it back), pour it out (+2), refuse (−3) |
| 2 | The night (after the water clock) | `a1_finale` or `visited_ninebridge`, stage 1 said | `s2`: Agi, the girls, the store; the city letter he can't read; opens `q_comp_ilya` | ≥ 10 | `ilya_s2`, knows `ilya_letter_seen`, sober +15; sitting with it +3; "we'll find a reader" +3, "better unread" −3 |
| 3 | The letter (the city) | letter seen, not read | `s3_nine` (Nine in the party reads it: the bible's turning point) · `s3_self` (Road Clerk origin) · Science 60 (one try; −10 if you have watched Nine write) | ≥ 20 | `ilya_letter_read`, knows `ilya_raid_scheduled`, +5, sober +20; his intent: `ilya_vasha_intent` = why (+5 "I'll be standing there") / why (the tower) / open (−3 "let her carry it") |
| 4 | After Kade | `vasha_fate` set (the booth) | `s4` "Kade.": by fate (he shot her / you did / she carries it / somebody else) | ≥ 25 | `ilya_s4`, sober +40, `ilya_after` = shale / road / rest (epilogue) |

Adapted: "sober days counted" is `ilya_sober_days`, a duration, raised by the stage talks and reset by his one relapse,
never a deadline. "D+…" dates do not exist in his line: the letter and the booth are milestones.
**The relapse** (`c_drunk`, once): if Jonah died, the next fire after the bottle talk he is drunk: sit with him (+5),
leave him, or drink with him (−5); the count restarts at one; he stays. Not the player's doing, so not his break.

## The quest `q_comp_ilya` ("Ilya's Letter")
letter → why → shot (Ilya; done) / taken (you; done) / carried (spared with cause; done) / let_go (spared without cause;
failed) / robbed (Vasha dead some other way, `dead: npc_rd_02`; done). Opens at stage 2's fire (`OPEN_LETTER` is empty
until the quest is registered; it catches up from the flags).
**The booth** (`d_rd_vasha`, start `cornered`, asleep until `vasha_cornered`): let Ilya name it; give her the letter
(`vasha_knows_why`: she learns she was the city's instrument: "It was written"); nod to Ilya (`vasha_fate` = ilya,
+10), or put your hand on the rifle: with the letter and approval ≥ 40 he lets her carry it (`spared_why`); under 40 he
fires over your hand (−5); without the letter it is sparing without cause (red line). You can also shoot her (`player`,
−10 interjection) or let her go (`spared`; he walks after her). `vasha_dead` is set when she dies, for placement.
**B3.12 must:** put Vasha at the Bridgeward booth during the raid and set `vasha_cornered`; hide her when `vasha_dead`;
resolve "or is killed" (the bible's third ending: `ilya_left` = spared → he hunts her alone; an `ilya_fate` epilogue
flag) in the raid or the epilogue.

## Red line and leaving (all with a scene, `leave`)
- **Red line: sparing Vasha without cause** → at the booth itself (`c_stopped` / `c_go`): `ilya_left` = spared, he goes
  after her; no way back.
- **Breaks: getting him drunk to use him** → at a fire, holding out the bottle he gave you "for a better shot"
  (`c_bottle`, −50): `ilya_left` = bottle; no way back.
- **The floor:** approval ≤ −20 → `c_floor` (`ilya_left` = floor; names the coup if you put Vasha in Kessler's chair).
  **Won back once** with the truth (Speech 55, +30).
- Dismiss and rejoin: `party` "Wait here for me." and `waiting` "We're going." (repeatable). His map placement in Shale
  already hides him once recruited.

## Approval ladder (visible reasons)
Existing (other files): +10/+15 joining; +5 Jonah off the tower; +5 Vasha refused at the tithe; +5 his name at Dry
Wells; −5 Oriel's key taken; +5 the drifter treated; −5 the drifter robbed; −5 the porters' stoppage broken; −5 the
girl's paper kept.
Added: overpass interjections (agreeing to Vasha's coup −20, the coup done −15, riding with Vasha to the Tollhouse −10,
warning Kessler +5); the stage choices above; light talk (+2 asking why he counts, +2 the wind lesson, +5 Jonah alive
"you changed the conditions"); conflicts ±2–3; romance +5/+10/+5; the booth (+10 / −5 / −10 / −30).
Proposed elsewhere (see report): Dry Wells restored +5, sold to the guild −10; the girl's paper resold −10; the block
let close −5.

## Conflicts (camp exchanges, both travelling)
1. **Ilya ↔ Wren**: first beat in Wren's tree (the can); second here at stage 3 (`x_wren`, both know the garage wall
   and Wren wants the bridge): she asks him to stand on it; Vasha is a Dog and the Dogs go back for the bridge. Yes
   (`ilya_wren_bridge`, +2 Ilya / +3 Wren), "that's using his hunt" (−3 Wren / +3 Ilya), or leave it to him (he says
   yes, crossly).
2. **Ilya ↔ Ash** (`x_ash`, after the bottle talk): "a drunk with a hymn". His own way (+3 Ilya / −2 Ash), Ash isn't
   wrong (−2/+3), or both burned something off (needs Ash's admission; +2/+2).

## Romance (bible: late, quiet, only sober; a scene at a well)
Opt-in only at a fire; he asks every step; any answer allowed; no gifts. Needs `ilya_sober_days` ≥ 30 throughout.
1. `r1` (letter read, approval ≥ 40): the second watch; "I'd like to count this. You can say no." → yes / not yet (one
   more ask `r1b` after stage 4: "once, then I stop") / no.
2. `r2` (yes, at a camp by a well: Shale, Dry Wells, Openfield, the windpumps): the bucket, Agi's mornings, "here,
   where I already remember" → yes (`well`, +10, fade) / not tonight (`later_well`, one more ask `r2b` after stage 4) / no.
3. `r3` (well, stage 4 said): "If there's an after…" → commitment (`committed`, `romance_partner` = npc_sh_17) / no.
**Fails** (`c_rom_end`) if approval falls to 30 or below while it is on; the relapse pauses it (sober days reset);
either break ends it. **Changes later:** `ilya_rom`, `ilya_after`, `vasha_fate`, `ilya_left` are epilogue variables.

**Built in B3.12**: Vasha is placed at the Bridgeward booth once the season has closed (`npc_rd_02_booth`, her own tree,
new nodes `bw_hand`/`bw_after` in overpass.ts); the raid won sets `vasha_cornered`; without any raid, at night, the player
can walk up to the booth (`vasha_cornered`), so his line ends whether or not Wren's raid ever happens. Still open: the
bible's "or is killed" third ending (Ilya dies going after her alone) for the epilogue (P11).
