# U8 — Tamsin Roe (comp_tamsin, `npc_c9_03`) — arc, join point, approval, romance, leaving (SECRET)

Sources: `CHARACTERS_SECRET.md` §A comp_tamsin; `STORY_PLAN_SECRET.md` §7 (*Not Written Down*, red line, romance yes),
§10 (her ending beats), §13, §18 (the opening v4: Tamsin is the voice at the Grille, "escapes the Cistern after the PC's
first letter home and joins in Shale"). Content read: `dialogue/knock.ts` (`d_kn_grille`), `dialogue/ch1_cistern.ts`
(`d_c9_tamsin`), `world/letters.ts` (`let_tamsin_inside`), every Tamsin interjection in `src/content/dialogue/*`.

## 0. Status (2026-11-16, second pass): built and joinable
The first pass found she could not join (her only `join` was in the retired shelter opening, whose interior has no way
in; in Knock she is a voice at the Grille, and her letter's reply led nowhere). The second pass, on the coordinator's
go, wired the join for the Unity runtime and built her arc. Built:
- **The join.** `maps/shale.ts` (and its generator `tools/maps/gen_shale.py`) places `npc_c9_03` at Mags's (17,16,
  `schedule: []`) while she is out (`tamsin_replied` known, or `tam_out`), not travelling with the player, and not gone
  home (`tam_home`). `world/events.ts` `tamsin_out`: at six in the evening, the first time the player is in Shale once she
  is out, `{ event: 'talk', data: { npc: 'npc_c9_03' } }` walks her up to them; prevented if they have already met
  (`tam_met`). The Grille (`d_kn_grille`): after Shale, "Come out, Tam" (`tam_ask`: sets `tam_out`, `tam_asked`) for a
  player who never wrote; once she is out the Grille opens on `later_out` (somebody else's breathing; with her beside the
  player, "It's smaller from out here"), which also carries Bram's letter, the seed and Pell's chart.
- **`d_c9_tamsin`** (ch1_cistern.ts): the meeting (`meet` → `meet_photo` / `meet_out` / `meet_home` → `meet_join`: come
  with me, or stay at Mags's a while), `waiting`, `party` (she waits at Mags's in Shale, always: no ghost of her elsewhere),
  the camp hub with the four stages, the romance, the list, the quest's Nine route and the choice, 7 lighter topics, the
  Ash and Nine exchanges, leaving (−20 to Mags's; −50 home), the win-back at Mags's, and the break. The retired shelter
  opening's nodes are kept as they were, after the new start entries.
- **`q_comp_tamsin` "Not Written Down"** (quests/comp_tamsin.ts): `why` → `choice` → `mother` | `ines` | `kept`.
- **Interjections applied:** Tribute Day fought +5 (`d_tribute/fight`), Jonah off the tower +5 (`d_sh_jonah/careful`),
  Dry Wells restored +10 (`d_dw_console/restored`), Dry Wells sold −10 (`d_sh_pike/station_sold`). Still a proposal:
  helping Vasha's coup −10 (`d_rd_vasha/coup_yes`, overpass.ts).
- Checked headless (scratch script): both routes out, placement and event conditions, every stage warm and cold, both
  quest routes and the choice, the romance opened, together and stopped (shared partner set and cleared), blocked while
  another companion's romance is in hand, two lies and the list, the break, the floor and the win-back, home.

## 1. Where she joins and why there
**The point:** the first time the player is in Shale after her reply (`tamsin_replied`), or after asking her at the
Grille. No date, no deadline: she waits at Mags's, and the event waits for the player. If neither happens she stays
inside until Act 3, where she is at the door.
**How she gets out (story):** on a hatch day MOTHER opens the drop-hatch out of turn and holds it while she climbs out
("variance", MOTHER logs; Ines learns afterwards). She is narrow, light, and has been measuring the hatch for six years.
Corin walks her down the track to Shale. First person out of the Cistern in living memory.
**The scene:** they have never seen each other's faces. The joining conversation is that.
**Open wiring (outside the U8 files):** `let_tamsin_inside` should not be offered once she is out
(`if` + `{ not: { flag: 'tam_out' } }`, letters.ts); her NpcDef's barks are the Cistern's and could be given road lines.

## 2. The four stages
| # | Stage | Milestone (flags) | Band | Conversation | Sets |
|---|---|---|---|---|---|
| J | **Faces** (the join) | `tam_out` (above) | — | J: first sight of each other; the photo held next to the player's face | `tam_joined`, `join` |
| 1 | **Out the door, reckless** | first camp after joining | ≥ 0 | S1 "The sky" | `tam_s1` |
| 2 | **People die of being brave** | Jonah's month over: `jonah_dead` or `jonah_lived` | ≥ 15 (cold below: she does not talk about it, `tam_s2` set by a one-line node) | S2 "Brave" | `tam_s2`; romance R1 offered |
| 3 | **Not written down** | in Meridian (`a2_precinct_done`): she asks the records office for her own entry herself (a person may) | ≥ 25 warm; cold below | S3 "No entry" (`s3` → `s3_ask` → `s3_why`) | `tam_s3`, `tam_uncounted`; starts `q_comp_tamsin` |
| 4 | **The person MOTHER protected** | built as her pledge: `tam_secret` and the city's orders for Reserve 9 known (`md_reserves_list`, or `c_cisterns_city` / `c_mother_answers`); acted out in Act 3 (`q_a3_order`) | ≥ 40 warm; cold below | S4 "Three orders" | `tam_s4`; `tam_pledge` = door / lives / city (Act 3 reads it; she stands in the door whatever it is) |

What changes her: what the player tells her (truth or lies, counted), how the player treats people who can't pay (Act 1
and 2 interjections), Jonah's month, and whether the player decides things for her.

## 3. Drafted scenes (voice: fast, jokes to cover nerves, "rust it", calls MOTHER "the fridge", never says "please";
talks too much about the sky; never about the clinic months of her childhood)
**J — Faces.** Narrator: a woman of twenty-four in Cistern coveralls with the sleeves cut off, copper hair hacked short,
a chipped front tooth, standing at Mags's bar like the floor might move. She knows your voice before she knows you.
TAMSIN: "Don't. Don't say anything. I want to do this one first." She looks for a long time. "Your nose is worse than in
the picture." Options: (show her the photo beside your face) → "It's you. It's you older and somebody's put you somewhere
you'd hate." / "You came out." → "MOTHER held the hatch. The fridge held the hatch. I'll think about what that means
tomorrow. Today there's a sky." / "Go home, Tam. It's not safe." → she laughs: "You sound like Ines" (−10; the join still
happens: "I didn't ask"). Effects: `join`, `tam_joined`, decision "Tamsin came out of the Cistern, the first in living
memory, and found you."
**S1 — The sky** (first camp). She can't sleep; she's never been somewhere without a ceiling. "Tell me what the sky is
doing." The player describes it (the Grille's old game, now with her beside them) → +5. She asks about the photo: "Do
you know who made it?" — **lie point L1**: "Yes" when the player doesn't (`tam_lies` +1, she doesn't know yet; it is
logged) / "No. I'm going to find out." (+5) / "Does it matter?" (0). Ends with her admitting she's been sick before ("the
clinic, when I was little") and stopping herself: "Forget it. It's boring." (the subject she never talks about, seeded).
**S2 — Brave** (after Jonah's month). If Jonah died: she's quiet, which she never is: "He was braver than me. It didn't
help." If he lived: "You changed the conditions. Not him. You." Options: "You're not fragile, Tam." (+10; her fear is
being told she is) / "Be careful. I can't lose you too." (−10: "There it is. Ines's voice.") / "Brave isn't the point.
Being there tomorrow is." (+5). Then she tells the clinic months in four lines (born sick, kept in the clinic till six,
"MOTHER sang to me; I thought every child got sung to"). **Romance R1** (approval ≥ 30): her riddle, "I've known you my
whole life and never seen you, and now I can't stop looking. What am I?" — "Yours." (opt-in, `tam_romance` = 1) /
"Late." (deflect, no penalty, offered once more at S3) / "Tam. No." (decline, no penalty: "Good. Riddles are better
unanswered.").
**S3 — No entry** (Meridian). Nine, at its desk, clause 40, reads her entry to her and to nobody else: there is none
before age six; Reserve 9 has sixty in the record and sixty-one at the ration counter. She's furious at the fridge first
("It hid me. It *hid* me.") then at the city ("Hid me from *what*?"). **Break point:** "Maybe it hid you for your own
good." → she leaves at once (`tam_broken`, §7). **Lie point L2:** if the player heard Nine's camp hint (`nine_tamsin_asked`)
and she asks "Did you know?" — "No." is a lie (`tam_lies` +1); "Nine said something. I didn't understand it." (+5).
Starts `q_comp_tamsin`. Romance R1 offered again if deflected.
**S4 — Home** (Act 3, the order). The person MOTHER protected decides whether to protect MOTHER. Options frame her
choice; she decides by approval and what the player has done: stand in the door (`door`), stand with the player
wherever they stand (`with_you`, only at ≥ 60 and not the red line), or go inside to MOTHER (`mother`).

## 4. Personal quest: `q_comp_tamsin` "Not Written Down" (built, compact)
Stages: `why` (find why she was never counted: `tam_why`) → `choice` (`tam_secret`) → `mother` | `ines` | `kept`. Routes
built: Pell through the Grille at Knock with her there (`d_kn_grille/pell_chart`: the chart, FIT FOR RELOCATION ticked no,
not on the next count); Nine at the fire (`d_c9_tamsin/why_nine`: clause 40 read to the person, sixty in the record and
sixty-one in the caretaker's ration returns, the one error it never filed). Planned extras: Odile decoding the ration
lists; the Spire's census (B3.11). The truth (bible): MOTHER hid her birth because she was born sickly and the city's
schedule disposed of the unfit; she was never counted. Ending choices: tell MOTHER she knows (letter home through Maud),
tell Ines (Ines's arc), or keep it (Act 3: the siege's "Tamsin's secret" card is hers to play).

## 5. The approval ladder
Approves: the truth to her face; courage that isn't stupid; feeding and freeing people; refusing to sell people, doors
or places; mocking power; the sky described properly. Disapproves: lies (counted); selling people, places or doors;
robbing the dying; deciding things for people; calling her fragile; paying for violence.
Existing (reachable now): Knock — the sky +5 (`d_kn_grille/sky`), the riddle "you" +10 and affection +5
(`riddle_you`), the riddle "Knock" +10 (`riddle_knock`), the fingertips +10 and affection +10 (`farewell` option), the
post-book's hawk +5 (`d_kn_postbook/write`, option `post.w.hawk`); letters +10/+5 (`let_tamsin_inside` and its reply).
Existing (reachable now that she joins): Act 1 — the dying woman's key −5 (`d_dw_oriel/key_taken`), the robbed drifter −5
(`d_re_drifter/robbed`); Act 2 — "off their page" +5 (`d_nb_voss/sheet`), "weather" −5 (`d_nb_voss/break_ok`), Sable kept
−10 (`d_nb_sable/kept`), the seed tithe −5 ×2 (`d_of_hollin/cut`, `d_of_corso/cut`), the Sump sides −5 ×2
(`d_sp_grel/side_yes`, `d_sp_hesk/side_yes`), the market loot −5 (`d_mk_vell/loot_wait`), the Sink lie −5
(`d_sk_ocho/where_lie`), Lowe's custody −5 (`d_md_lowe/static_done`), the Cistern sold −10 (`d_lr_ysolde/reel`), the
Stacks fire −15 (`d_st_ren/burned`), the cup −15 (`d_cr_cup/poured`), Tillie sold −10 (`d_cr_honora/tillie_sold`),
Tillie freed +5 (`d_cr_honora/tillie_free`), Verity kept +5 (`d_bw_verity/keep`). Retired shelter opening (unreachable,
leave as is): `d_c9_ines/refuse_send` −15, `d_c9_tamsin` +5/+10/+5/−10.
Applied (second pass): Tribute Day fought +5 (`d_tribute/fight`); Jonah off the tower +5 (`d_sh_jonah/careful`); Dry
Wells restored +10 (`d_dw_console/restored`); Dry Wells sold to the guild −10 (`d_sh_pike/station_sold`). Proposed still:
helping Vasha's coup −10 (`d_rd_vasha/coup_yes`, overpass.ts).
Camp (built): meeting +5 / −10, join +10 or wait −5; S1 +5 +5; S2 +10 / −10 / +5; S3 +5 (honest) / −30 (the break); the quest +5 (Pell or Nine), "yours to decide" +10; S4 +10 / −15; Ash and Nine exchanges ±5; R1 +5, R2 +5; the list −10; asked back +30. Lies cost nothing at the time: they are counted.

## 6. Conflicts (at most two)
- **Tamsin ↔ Ash (home vs sky)** — camp, when both travel with the player (from Openfield): ASH: "There's a weight to
  going home, child. You'll want it before the end." TAMSIN: "Don't call me child. You took a vow so you'd never have to
  decide anything again." Player: "He's not wrong about home" (Ash +5, Tamsin −5) / "Leave her be, Brother" (Tamsin +5, Ash
  −5) / say nothing. In Act 3 it returns: Ash argues for the sky, she for the door.
- **Tamsin ↔ Nine ("a fridge with legs" / "an undocumented person: alarming and precious")** — camp in Meridian: she
  baits it ("Have you got a mother, fridge?" — "A department. It was dissolved."); when she asks what the record says
  about her, Nine will not say it in front of the fire (clause 40: "to you, at my desk"). Player: "Go and hear it" (both
  +5; leads to S3) / "Leave it, Tam" (Tamsin −5: "Deciding for me again"). Nine's side of it is the "break" in its own
  plan: ordered to arrest her, it refuses.

## 7. Romance (opt-in, consent-forward, can fail, never a gift)
R0 (built, Knock): the fingertips through the Grille; "one day I'll see your face". R1 (S2, ≥ 30): her riddle — opt in,
deflect or decline; no penalty for either refusal. R2 (after S3, ≥ 40, `tam_romance` = 1): the first rain she has ever
stood in, on a roof in the Stacks or a bridge at Ninebridge: "Tell me what the sky is doing" — "It's raining on you" —
and she asks, explicitly ("I'm asking. I always ask. You can say no and I'll still be here tomorrow"); the player can say
not tonight (no penalty) or yes; fade before anything explicit; morning line. R3 (Act 3, before the door): what they will
be after it; epilogue: together in Shale (she deputy), on the road with the Wheel, or apart and still writing.
**Shared convention (built):** accepting her riddle sets `romance_partner` = `npc_c9_03`; every step needs it unset or
hers; declining after opting in, stopping, the list, the break and leaving clear it.
**Fails:** two lies (`tam_lies` ≥ 2; lie points L1 `s1_photo` "Yes, I know who made it", L2 `s3_ask` "No" after Nine's
hint, and any later "did you know" beat) → the list scene: "You're on
the list. Under Ines." Romance ends for good (`tam_romance` = ended), approval −10, she stays a companion. Being told she
was hidden "for her own good" (the break) ends it too. Never unlocked by gifts: no item or payment moves `tam_romance`.

## 8. Red line, break, floor, return
- **Red line — siding with relocating the Cistern by force (Act 3):** she leaves the party at once and goes to the door;
  if the player brings force to it, she stands in it (bible: dies at the Cistern door if she stands in it).
- **Break — the player says she was hidden "for her own good" (S3):** she walks out of the camp ("You sound like Ines"),
  `tam_broken`; she is in Shale at Mags's with Nell. Won back only by standing with the Cistern in Act 3.
- **Floor:** approval ≤ −20 → leaves at camp ("Nell's got a cot"), `tam_left`, found at Mags's; won back with Speech 45
  and the truth about what the player did (−15 if `tam_lies` = 0); at ≤ −50 she goes home to Knock and is next seen at the
  door in Act 3.
