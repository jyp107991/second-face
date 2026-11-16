# U8 — Brother Ash (npc_of_03, bible comp_ash) — arc plan (SECRET, never quote to the owner)

Built 2026-11-16. Content: `src/content/dialogue/openfield.ts` (`d_of_ash`: camp, the seed store, leaving, coming back;
Doria's lines after; seed-quest options and interjections), `src/content/dialogue/ninebridge.ts` (interjections on a
return trip), `src/content/quests/comp_ash.ts` (`q_comp_ash`, "Ash and the Gully"). Bible: CHARACTERS_SECRET §A comp_ash;
plan §7, §11, §13.

## Voice kept
Slow, scriptural cadence without scripture ("There's a weight to that"); "friend" until he means it, then the player's
name, once, at the burning of the letter (the camp hub uses `{name}` from then on); never "I'm sorry" (when the player
says it, he answers "You're not"); talks too much about soil (the `soil` light talk). Gentle with children (Sem), cold
with men like he was.
Backstory fixed: the Gully was a well-cut north of the Sallow, nineteen people, a windpump, goats; it would not pay
Kessler's father (the Dogs' chief before Kessler); Ash, twenty, set the first fire, unordered, and liked being first (his
fear, said aloud twice in his life, both times to a fire). Kessler was on the ridge, counting, and has never looked at
him since. One survivor counted them in at the well: **Doria, Openfield's seed-keeper** (npc_of_06). He came to
Openfield four years ago because she was there, dug the Choir's graves fifty yards from her store, and never said it.
His vow: never fire first. The dead she names: Ottla, Ren Haskell and his two boys, the twins from the top house, old
Sefton, her husband Maro, her daughter Pia (four), and ten more.

## The four stages (story milestones, not dates)
| # | Stage | Marker | Camp conversation (said once) | Band | What it sets / moves |
|---|---|---|---|---|---|
| 1 | Joined (Openfield, q_a2_openfield) | `ash_joined` | `vow` "You clean that shotgun every night." (+ existing `weight` hint and `sky`) | none | `ash_s1_done`; "Why that promise?" +5 (knows `ash_liked_it`), "I'll go first" +5, "could get us killed" 0; weight +5, sky +5 |
| 2 | The Gully (after the dead reserve, q_a2_cistern4) | `a2_cistern4_done` + knows `ash_gully_hint` | `gully` → fire → well → want | ≥ 15 (below: hub line, he hasn't decided you're owed it) | `ash_s2_done`, `ash_quest` (opens q_comp_ash); "I'll stand with you" +10; "It'll only hurt her" → "I'll come" +5 / "you want it for yourself" +5; "You burned nineteen people" 0 |
| 2b | The seed store (back at Openfield, Ash in the party) | `ash_quest` | party option "The seed store." | ≥ 25 lets him say it | `ash_gully_outcome` = spoken (+15: she makes him say the nineteen names back, "Dig, then. I'll check your count") / told (you say it: −10, "Now it's nobody's") / unsaid (−5) / grave (Doria dead: he says it to her cairn) |
| 3 | His orders (the lens names the Magistrate designate, q_a2_precinct) | knows `md_magistrate_designate` + `ash_gully_outcome` | confess: `orders` (≥ 35, +5) · found: the scarf drying by the fire (≤ 34), read it (−10) or leave it (`ash_scarf_left`, waits for the confession) | 35 | `ash_orders_known`, `ash_orders_how` = told/found, knows `ash_unwritten`; the letter: "IF THE ONE FROM THE CISTERN'S HATCH TAKES THE SASH, THE SKY IS OWED."; stance `ash_stance` = never (+5) / knowing (0) / clean (−10, "I might listen") |
| 4 | His choice (one of Meridian's lines settled: q_cr_masque, q_sk_highwater or q_bw_turf done) | `ash_orders_known` + MD_LINE | `choice` "If the city gives you the sash, will you wear it?" | ≥ 40 for the friendship scene | `ash_orders` = refused (≥ 40 and "No. Burn it.": burns the letter, says your name, +10) / warned ("No" below 40, or "I don't know": he will come to you first, to your face; +5 for the honest one) / undecided ("from inside": he'll be there when you put it on, as friend or as theirs) / other ("let it fall on others": −10, "That I might, and like it") |

Adapted from the bible: "(3) the orders are found — or he confesses" is both routes, by approval; "(4) chooses the player
over the orders, or carries them out on someone else, or on himself" is decided here as intent (`ash_orders`), and
**played out at the Long Night / the sash (P11)**: refused → he stands between you and the Unwritten; warned → he comes to
you first; undecided → the scene at the sash decides by what you do; other → he goes after a keystone who embraced their
forecast (the Crown's Vane if `ks_vane` = rises; Sarr; Vasha); with low approval and `ash_stance` = clean, the order may
fall on himself (the only place that beat belongs; never off-screen). S4's gate moves to q_a2_longnight's opening stage
when it exists.

## Approval ladder (−100..100; visible reasons)
Existing before U8: join +10; the Sky Rite with him beside you +10; weight +5; sky +5; the Sump clans set against each other
for a purse −10 (either clan); the Stacks gardens (Nessa Kord) −15; the Old Market square −5.
Added in U8 (camp): vow +5/+5; Gully talk +10/+5/+5; seed store +15/−10/−5; S3 +5 confession, −10 reading the letter,
stance +5/−10; S4 +10/+5/−10; Tobias (by outcome) mercy +5, handed to the cellar −5, exposed 0; soil +3; the cup −20 (a
reason) / −25 (a lie).
Added in U8 (interjections): Ninebridge on a return trip — the porters given the guild's forecast +5, the strike talked
down −10, lot four let go −5, kept −10, freed +5, resold −10, the Saint sold −10, the clerk sold −10; Openfield — chaff sold
to the guild +5 (either route); a tenth of the Choir's seed: silence (and the red line, below).
Approves: mercy without an audience, debts carried in daylight, soil, people freed. Disapproves: people sold, the
floor's methods, killing casually, lies to him (the fire is honest).

## Conflicts with other companions (at most two)
Ash ↔ Nine (mercy vs law) lives in Nine's camp (`meridian.ts`, `nine.ash`); Ash ↔ Ilya (two killers who sobered up
differently) in Ilya's camp (`a1_shale.ts`, `ilya.c.ash`). None here (coordinator's rule: one exchange per pair, at most
two per companion; an Ash ↔ Odile exchange was drafted and removed). Tamsin ↔ Ash (home vs sky) is Act 3.

## Red line, break, floor, coming back
- **Red line — betraying the Choir before its long night:** (a) a tenth of the Choir's stolen seed taken while he travels
  with you (`hollin.cut.ash` / `corso.cut.ash` set `ash_saw_cut`); (b) after the vow at the windpump (`sky_rite`), a
  factor's hand's notch or a warden's grey (`member tollmen rank hand` / `member wardens rank warden`). He says (b) out
  loud first, once, when he sees a guild ticket or a city card on a sibling of the sky (`card`: "a weather report"). A
  plain citizen's card (the hearing's lowest rank, which by faction rules ends Choir membership) is a door, not a side,
  and does not trip it. Crossed: next talk, `redline`: he goes west to Openfield, `leave`, `ash_gone`; join refused after
  (`turned`). Not recoverable. **Long Night:** siding against Openfield trips it too (to wire when built).
- **Break — the player killing a keystone casually:** Celestine Vane dead of the cup (`cr_celestine_dead`): next talk,
  `cup` "Was it you?" (or "I saw your sleeve" if `ash_saw_cup` is set by the proposed Crown edit). "It settled the Chair"
  / "Someone wanted it done" → he leaves for good ("I can't walk next to it; I'd start to learn it"). A reason ("selling
  the city's forecasts to the Concern") −20, he stays not knowing why; a lie −25 (`ash_cup_lied`; S4 remembers it).
- **Floor — approval ≤ −30:** `floor`: back to the burial ground (`ash_left`). **Coming back, once:** at Openfield, dig the
  row with him (two hours), then "Come east again", Speech 40 (−10 if he spoke at the seed store with you, −5 with the
  rite): +40. Second fall is final (`floor_final`).

## Romance
None (vow). The deep friendship scene instead is S4's refused path: the letter burned, the player's name said for the
first time. An opt-in "(Sit closer to him.)" after S2 at approval ≥ 30 is declined kindly (the vow; "It isn't you"),
no penalty, never touches `romance_partner`.

## Light talk at the fire (once each)
Soil (talk-too-much), Mason, Tobias (by outcome, with approval), Kessler (after "You were a Dog"; variant if Kessler is
dead), Sem (the child in the grave), Meridian.

## For later content
Long Night / sash: `ash_orders`, `ash_stance`, `ash_cup_reason`, `ash_cup_lied`, `ash_gully_outcome`, `ash_redline`,
`ash_broke`. Epilogue "Ash's orders": the same flags. Doria remembers `ash_gully` (memory) and her lines change by outcome.
