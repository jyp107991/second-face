# U8 — Kes Oyelaran (npc_hs_01, bible comp_kes) — arc plan (SECRET, never quote to the owner)

Built 2026-11-17 (B4a). Content: `src/content/dialogue/hs_kes.ts` (`d_hs_kes`: the hail, the first meeting, joining, the
road, camp, the four stages, the romance, two conflicts, leaving and coming back), `src/content/quests/comp_kes.ts`
(`q_comp_kes`, "Slack"), her lines in the Skirts' trees (`dialogue/hs_skirts.ts`: interjections, the vote, the Window's
grid, Lev Ostrander's table, Bell's desk). Bible: CHARACTERS_SECRET §A comp_kes; plan §7, §9 keystone 12, Build notes — B4.

## Who she is (the bible, kept and fixed for the text)
Kestrel Oyelaran, twenty-six, born on Nursery. At sixteen her mother signed her to the Window as a grid-hand for ten years
against the family's debt; the Concern fitted the port at her nape and the lattice down the top of her spine on the Clinic
floors (her one visit up the hill: the gardens, an orange tree, rain that came out of a pipe on a timer). Her mother died of
the cough two years later. She never says "mum": "my mother", once, and then she talks about something else. Maren Okafor
took her in and taught her to organise ("we go up together"). She keeps the Skirts' lenses, pay machines and Provision's
price board working for the Window, two years of her paper still to run, and she found what the Window does not know she
found: **the backdoor**, the dormant channel in every piece of Concern chrome that lets Halcyon see, numb or stop whoever
wears it. Turned the other way it makes her link go dark: an hour a night, the Concern cannot see her, and in that hour the
Shift meets with the lenses blind. She is the Ledger's blind spot (it cannot see inside Halcyon's grid, and it cannot see
her) and the Concern's sight (it can see her anywhere, except for an hour). Keystone 12's line is wrong because of her.

**Look** (owner rules over the bible): West African and South Asian; narrow frame, wiry; hair in short coils kept close
(the bible's "bleached undercut" is a styled modern cut, against the hair and grooming rules: replaced); the port and cable
visible at the nape; goggles pushed up; a miner's jacket cut down, tech straps, a grid-hand's tool roll. Role `tech`.

## Voice kept
Quick, technical; nicknames everything (Dysart "the Tonnage", Bell "the Letter", Lisle "the Scales", the funicular "the
Express", the Concern's grid "the Window"; MOTHER "the Fridge", which she picks up from Tamsin); swears in grid slang
("bricked", "dark", "lit up", "ghosted"); says "obviously" before the thing nobody knew; brags, then does the thing quietly;
never says "mum"; talks too much about the gardens she saw once (the `gardens` light talk lets her run).

## Joining (the Skirts)
- **The hail** (`kes_hailed`): Two-Twelve's Line board flickers on arrival: DESIGNATE. YOU'RE LIT UP LIKE THE GARDENS. LODGE,
  AFTER DARK. — K. (Her first act in the game is riding the grid.)
- **First meeting** (`kes_met`): the Lodge at night or the Window by day. She has read Bell's appointment list: the Board sent
  for the Ledger's designate, and she wants to know why. She offers a trade: help the Shift with the eleven and she will get
  the player places the car doesn't go.
- **Joins** (`kes_joined`, approval +10): "Walk with me" once the player has done one thing for the Shift (`hs_robbed` known,
  `hs_pim_word`, the scabs turned or sent, or the eleven up); or at first meeting with Speech 50 ("you're the one the Clean
  can't touch"); or after the line is settled if she has not. Never if the strike was sold (`hs_sold_out`) or the finder's
  fee taken (`hs_parts` = profit): `kes_refused`.
- Dismiss and rejoin: `party` "Wait here for me." / `waiting` "We're going." (repeatable services).

## The four stages (story milestones, not dates)
| # | Stage | Marker | Camp conversation (said once) | Band | What it sets / moves |
|---|---|---|---|---|---|
| 1 | The Shift | `kes_joined` | `s1` "(She is winding a cable round her fingers.)": Maren, the Lodge's dark hour, what the strike is for, in your words | ≥ 5 | `kes_s1`; "We go up together" +5, "Whatever the Shift decides" +3, "Strikes get people hanged" −3; with Maren's line known (`name12_decoded`): tell her (`kes_knows_line`, "Obviously it got it wrong. It's never seen in here.") |
| 2 | The backdoor | `kes_s1` + a Skirts line settled (`hs_shift` or `hs_parts`) | `s2` "You go quiet at the same hour every night." | ≥ 25 | `kes_s2`, knows `kes_backdoor`; "Keep it to yourself" +5, "Show me" +2, "That's a weapon" −5 ("It's a door. People keep calling doors weapons."); with `LEASHED`: she can slack the player's chrome for the hour (`kes_slacked_pc`) |
| 3 | Slack | `kes_s2` + the strike settled (`hs_shift`, which always ends: by the player or B4b's milestone) | `s3` "One day. That's all I want." | ≥ 35 | `kes_s3`; opens `q_comp_kes`; "I'll find you a way" +5, "Is it worth the risk?" 0, "Keep it; it's useful" −10 |
| 4 | The lineage | `kes_link` set and not sold | `s4` "It talks old." | ≥ 45 | `kes_s4`, `kes_lineage` = speak / silent; `kes_after` = shift / road / gardens; "yours to say" +5 |

Below a band the topic waits (the hub says what she is doing instead); nothing is lost by a day passing.
Stage 4's milestone is B4a's last: the backdoor speaks the house's own dialect, signed with dates from before the Burn;
she can talk to the house in it (`kes_lineage`), which B4b reads at the Chair and in the Leash line.

## Her quest `q_comp_kes` ("Slack")
Opens at stage 3. Ash, travelling with her after stage 3, tells her how he cut his own link (`x_ash`, `kes_ash_word`, Ash +10, the cut's DC −10). Routes: **cut** at Lev Ostrander's table (Medicine 45 to hold the channel while he cuts; Ash's word "burn
the channel first" −10, holdfast in the pack −5, Lev's steadiness 0): `kes_link` = cut (free and grid-blind; she will learn
to see with her eyes); failed: cut with fits (`kes_fits`; she lives, and has them). **dark** at the Window's grid exchange at
night (Science 50; a Gridjack or a Lattice port in the player −15; her approval ≥ 50 −5): the backdoor turned on her own
port for good (`kes_link` = dark: invisible to the Concern, her sight kept); failed once, the Window's watch is woken
(`hs_window_alert`) and that door is shut. **kept**: talked into keeping it, by her own reasons (`kes_link` = kept; +3 if
"it's yours", −10 if "the Shift needs your sight" said as a use). **sold** to Agnes Bell (`hs_leash_sold`, 400 Tolls and a
contract offered, `hc_contract_offered`): her red line; she leaves for good; the quest fails. Stages: `ask` → `free` |
`fits` | `dark` | `kept` (done) | `sold` (failed).

## Approval (visible reasons)
+10 joining; Shift: +5 the proof to Maren, −15 the proof sold to Dysart, +5 the eleven up, +5 the scabs turned, +3 sent,
−15 walked through, −5 fought, +5 Rafe stood down or told, −5 joined, +10 the claim upheld, +5 the vote to hold, −10 the car,
−40 the strike sold. Spare Parts: +10 exposed, −10 covered for money, −5 covered for a favour, −40 the finder's fee, +10 Nils
freed. Scrip: +5 par, +2 paid, +5 forged ("obviously"), −10 the cut. Concern chrome fitted at the Weighhouse −3 ("now they
can see you too"). Light talk +2 (the gardens, letting her run), +2 the Express. Romance +5/+10/+5. Conflicts ±3–10.

## Conflicts (camp exchanges, both travelling)
1. **Kes ↔ Nine** (her tree, `x_nine`): she slacks a lens in front of it ("obviously nobody saw that"); Nine: "I saw it.
   The record did not. I find the difference restful." Report it to the record (Nine +5, Kes −10) / tell Nine the record
   can't see her for a reason (Kes +5, Nine 0: it logs the blind spot as the Plan's largest error, `nine_kes_logged`) /
   leave it.
2. **Kes ↔ Odile** (her tree, `x_odile`; after Scrip is settled or at any fire): "You priced the spread." "My dear, I priced
   the weather." Side with Kes (+5 / Odile −3), with Odile (−3 / +3), or ask Odile what she'd do now (both +2,
   `kes_odile_truce`: "Price it at par and see who complains").

## Romance (bible: direct, funny, one honest scene about the cable in her neck)
Opt-in only at a fire; she asks at every step; any answer allowed with no penalty beyond the moment; never gifts; the shared
`romance_partner` flag (unset or her) gates every step.
1. `r1` (`kes_s1`, ≥ 30): she says it straight out — she likes you, "not grid-like; like-like" — and asks; yes (`kes_rom` =
   yes, +5) / not tonight (`later`, one more ask `r1b` after stage 2) / no (closed kindly).
2. `r2` (yes, `kes_s2`, ≥ 40): the cable scene: she lets you touch the port; she feels it twice, once in the skin and once in
   their log; then she goes dark for the hour, "and I'd like to spend it with you. Say if you don't." → yes (`dark`, +10,
   fade) / not tonight (`later_dark`, one more ask `r2b` after stage 3) / no.
3. `r3` (`dark`, `kes_s3`): "I don't do slow. So: are we a thing?" → yes (`committed`, `romance_partner` = npc_hs_01, +5) /
   a kind no.
**Fails** (`c_rom_end`, `kes_rom` = ended) at approval ≤ 30 while it is on, or at once if the strike was sold or the fee
taken. Her leaving ends it.

## Red line, break, floor, coming back
- **Red line — handing the leash to anyone:** telling the Shift's Rafe how to numb every Clean at once (`kes_left` = rafe),
  or giving her backdoor to the record (Nine's report at `x_nine`: −10 only; she says it once: "Do that with anyone else and
  I'm gone"). Any later hand-over is final.
- **Break — selling it** (Bell, `hs_leash_sold`): at the next fire, or at once if she is there, `c_sold`: gone for good,
  placed at the Lodge, will not talk.
- **The strike sold / the fee:** `c_shift` / `c_fee`: she leaves at once, for good.
- **The floor:** approval ≤ −20 → `c_floor` (`kes_left` = floor). **Won back once** at the Lodge: the truth, undressed
  (Speech 55, +30). A second fall is final (`kes_floor_final`).

## Later content (flags to read)
`kes_link` (cut | dark | kept), `kes_fits`, `kes_backdoor`, `kes_lineage`, `kes_after`, `kes_rom`, `hs_leash_sold`,
`kes_left`. B4b: the Leash line's cut risk by `kes_link`; the Chair hears her lineage; *A Contract for Kes*. Long Night: the
Shift; ending C/D: the Leash modifier; epilogue "Kes's Leash".
