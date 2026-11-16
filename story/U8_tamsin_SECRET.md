# U8 — Tamsin Roe (comp_tamsin, `npc_c9_03`) — arc, join point, approval, romance, leaving (SECRET)

Sources: `CHARACTERS_SECRET.md` §A comp_tamsin; `STORY_PLAN_SECRET.md` §7 (*Not Written Down*, red line, romance yes),
§10 (her ending beats), §13, §18 (the opening v4: Tamsin is the voice at the Grille, "escapes the Cistern after the PC's
first letter home and joins in Shale"). Content read: `dialogue/knock.ts` (`d_kn_grille`), `dialogue/ch1_cistern.ts`
(`d_c9_tamsin`), `world/letters.ts` (`let_tamsin_inside`), every Tamsin interjection in `src/content/dialogue/*`.

## 0. Finding: she cannot join in the current story (2026-11-16)
- Her only `join` is `d_c9_tamsin/come`, in the retired shelter opening. The Cistern's interior (`maps/cistern9`) has no
  way in: `c9_mouth`'s exits do not lead down (Unity's `PlacePlayTests` asserts it), and her NpcDef is placed only there.
- In the Knock opening she is a voice at the Grille (`d_kn_grille`: morning riddles, the farewell's fingertips; the
  farewell sets `c9_tamsin_inside`). From Shale the player can write `let_tamsin_inside`; her reply ("Come back or I'm
  coming out") teaches `tamsin_replied`, and nothing follows it. The escape §18 plans is not built.
- So her ~54 interjections and ~20 approval effects already written across Act 1 and Act 2 never fire, and nothing can
  be built for her camp, quest or romance that a player could reach. **Built in U8 for her: only what is reachable** —
  the seed of stage 3 inside Nine's camp (`d_md_nine/reserve`: clause 40, "the record has sixty people in Reserve 9…
  bring her to my desk one day"; sets `nine_tamsin_asked`, `nine_reserve_count`). Everything below is the plan, with the
  scenes drafted so they can be transcribed into `d_c9_tamsin` as soon as the join is wired.

## 1. Where she joins (the plan) and the wiring it needs
**The point:** the first time the player is in Shale after her reply (`tamsin_replied`) — or, for a player who never
writes, the first time they come back to the Grille after Shale (`visited_shale`) and ask her. No date, no deadline: the
event waits for the player (`WorldEventDef.at: { hour, where }`). If neither happens, she stays inside until Act 3, where
she is at the door.
**How she gets out (story):** on a hatch day MOTHER opens the drop-hatch out of turn and holds it while she climbs out
("variance", MOTHER logs; Ines learns afterwards). She is narrow, light, and has been measuring the hatch for six years.
Corin walks her down the track to Shale because Maud makes him. First person out of the Cistern in living memory.
**The scene:** they have never seen each other's faces. The joining conversation is that (§3, J).
**Wiring (outside the U8 files; to do when the join is scheduled):**
1. `src/content/world/events.ts`: `{ id: 'ev_tamsin_out', at: { hour: 18, where: 'shale' }, armedIf: { all: [{ knows:
   'tamsin_replied' }, { not: { flag: 'tam_joined' } }] }, effects: [{ set: 'tam_out' }, { event: 'dialogue', data: { tree:
   'd_c9_tamsin', name: 'Tamsin Roe' } }] }` (the TS host opens a conversation on `event: 'dialogue'`; the Unity runtime
   needs the same, or a conditional placement of `npc_c9_03` at Mags's).
2. `src/content/dialogue/knock.ts` `d_kn_grille/later`: an option "Come out. I'll walk you down." if `visited_shale` and
   not `tam_out` → a node where she says "Hatch day. Be there." and sets `tam_out` and `tam_at_hatch` (the J scene then
   happens at the hatch instead of Shale; same nodes, one text variant).
3. `src/content/dialogue/ch1_cistern.ts` `d_c9_tamsin`: new start entries before the retired ones, in this order:
   leaving (approval floor) → camp (`inParty` + `at_camp`) → party (`inParty`) → left (`tam_left`) → J (`tam_out` and not
   `tam_joined`) → the retired entries. Nodes as drafted in §3.
4. A quest file `src/content/quests/comp_tamsin.ts` (`q_comp_tamsin`, "Not Written Down", §4) and its registration.
5. `npc_c9_03`'s outfit outside: the Cistern coveralls first, then "whatever she loots first" (the wardrobe rule).

## 2. The four stages
| # | Stage | Milestone (flags) | Band | Conversation | Sets |
|---|---|---|---|---|---|
| J | **Faces** (the join) | `tam_out` (above) | — | J: first sight of each other; the photo held next to the player's face | `tam_joined`, `join` |
| 1 | **Out the door, reckless** | first camp after joining | ≥ 0 | S1 "The sky" | `tam_s1` |
| 2 | **People die of being brave** | Jonah's month over: `jonah_dead` or `jonah_lived` | ≥ 15 (cold below: she does not talk about it, `tam_s2` set by a one-line node) | S2 "Brave" | `tam_s2`; romance R1 offered |
| 3 | **Not written down** | in Meridian (`a2_precinct_done`) with her: Nine reads her entry to her at its desk (`nine_tamsin_asked` and Nine met), or the records terminal's reserve list read with her (`md_reserves_list`), or Odile decodes Reserve 9's ration lists | ≥ 25 warm; cold below | S3 "No entry" → personal quest | `tam_s3`; `q_comp_tamsin` |
| 4 | **The person MOTHER protected** | Act 3: `q_a3_order` (the city orders Reserve 9 relocated by force) | ≥ 40 warm; cold below | S4 "Home" | `tam_stance` = door / with_you / mother |

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

## 4. Personal quest: `q_comp_tamsin` "Not Written Down" (planned, compact)
Stages: `no_entry` (find why she is not in the record) → `why` → `told` (end). Routes: Nine reads the census against the
ration counter (knowledge; needs Nine); Odile decodes Reserve 9's ration lists from the Exchange's archive (barter/
knowledge); the Spire's census (tech, B3.11); Pell by letter (medicine; the Bonesetter origin reads his charts: "unfit for
relocation" in the city's form). The truth (bible): MOTHER hid her birth because she was born sickly and the city's
schedule disposed of the unfit; she was never counted. Ending choices: tell MOTHER she knows (letter home through Maud),
tell Ines (Ines's arc), or keep it (Act 3: the siege's "Tamsin's secret" card is hers to play).

## 5. The approval ladder
Approves: the truth to her face; courage that isn't stupid; feeding and freeing people; refusing to sell people, doors
or places; mocking power; the sky described properly. Disapproves: lies (counted); selling people, places or doors;
robbing the dying; deciding things for people; calling her fragile; paying for violence.
Existing (reachable now): Knock — the sky +5 (`d_kn_grille/sky`), the riddle "you" +10 and affection +5
(`riddle_you`), the riddle "Knock" +10 (`riddle_knock`), the fingertips +10 and affection +10 (`farewell` option), the
post-book's hawk +5 (`d_kn_postbook/write`, option `post.w.hawk`); letters +10/+5 (`let_tamsin_inside` and its reply).
Existing (unreachable until she joins): Act 1 — the dying woman's key −5 (`d_dw_oriel/key_taken`), the robbed drifter −5
(`d_re_drifter/robbed`); Act 2 — "off their page" +5 (`d_nb_voss/sheet`), "weather" −5 (`d_nb_voss/break_ok`), Sable kept
−10 (`d_nb_sable/kept`), the seed tithe −5 ×2 (`d_of_hollin/cut`, `d_of_corso/cut`), the Sump sides −5 ×2
(`d_sp_grel/side_yes`, `d_sp_hesk/side_yes`), the market loot −5 (`d_mk_vell/loot_wait`), the Sink lie −5
(`d_sk_ocho/where_lie`), Lowe's custody −5 (`d_md_lowe/static_done`), the Cistern sold −10 (`d_lr_ysolde/reel`), the
Stacks fire −15 (`d_st_ren/burned`), the cup −15 (`d_cr_cup/poured`), Tillie sold −10 (`d_cr_honora/tillie_sold`),
Tillie freed +5 (`d_cr_honora/tillie_free`), Verity kept +5 (`d_bw_verity/keep`). Retired shelter opening (unreachable,
leave as is): `d_c9_ines/refuse_send` −15, `d_c9_tamsin` +5/+10/+5/−10.
Proposed (in the U8 report, for when she joins): Tribute Day fought +5 (`d_tribute/fight`); Jonah off the tower +5
(`d_sh_jonah/careful`); Dry Wells restored +10 (`d_dw_console/restored`); Dry Wells sold to the guild −10
(`d_sh_pike/station_sold`); helping Vasha's coup −10 (`d_rd_vasha/coup_yes`).
Camp (drafted above): S1 +5/+5/0, S2 +10/−10/+5, S3 +5, lies −5 each and counted.

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
**Fails:** two lies (`tam_lies` ≥ 2; lie points L1, L2, and any later "did you know" beat) → the list scene: "You're on
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
