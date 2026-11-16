# U8 — Odile Marchetti (npc_nb_03, bible comp_odile) — arc plan (SECRET, never quote to the owner)

Built 2026-11-16. Content: `src/content/dialogue/ninebridge.ts` (`d_nb_odile`: camp, leaving, coming back; `PAPER_ROOM`
nodes shared by `d_nb_sarr` (day) and `d_nb_office_door` (night); her break in `d_nb_clerk`; interjections across the
Ninebridge trees), `src/content/dialogue/openfield.ts` (seed-store interjections), `src/content/quests/comp_odile.ts`
(`q_comp_odile`, "A Sheet on Shale"). Bible: CHARACTERS_SECRET §A comp_odile; plan §7, §9, §13.

## Voice kept
Urbane; quotes contracts and recipes; money is "weather" ("a bet on the weather"); "my dear" mostly when she is about to
disagree or to say a hard thing; never "sorry": "That is a cost." Talks too much about Ninebridge before the Exchange
(the `bridge` light talk lets her run, or stops her: "I'm doing it"). A liar who has decided to stop, badly: in S2 she
answers "Did you know?" with "No", then corrects herself.
Backstory fixed for the camp lines: born on the deck when the bridge had nine spans; the ninth fell with the market on it
in her ninth year (the bell going down); lost her born left hand betting it at Dust when the bridge had eight spans, and
bought the Gyro hand from the next night's winnings; Imelda held her ink the night she wrote NB-1 on a crate.

## Her trade, as built (coherent with the existing lines)
She wrote a sheet "SHALE — FAILS — <date two springs off>" from the Dry Wells schedule she could read, and sold it to the
floor, which bought it "for a client". A sheet like that is a deed to a ruin: the holder gets the town at a dead town's
price on the date. The date has not come; the sheet is still open. The client's acceptance on its back is in the
machine's too-even hand (the hand on the water packet and the Precinct's forms): the counterparty is the Ledger (bible
stage 2). Her fear ("that she was right") becomes: she was right because the buyer could make her right. Her secret,
said once in S2: the year she left the floor she sold Imelda the Dry Wells schedule (every water sheet since is her
arithmetic). The other secret (she wrote the first sheet the guild ever sold) is shown, not said: NB-1 in its frame in
the paper room. The existing `camp_trade` line that already named the city as the buyer was rewritten so the reveal is
earned in the paper room.

## The four stages (story milestones, not dates)
| # | Stage | Marker | Camp conversation (said once) | Band | What it sets / moves |
|---|---|---|---|---|---|
| 1 | Joined (Ninebridge, q_a2_ninebridge) | `odile_joined` | `camp_trade` "The trade. Tell me now." → why / want | none (join gives +10) | +5 on telling; `odile_quest` (opens q_comp_odile); "We'll get it" +5, "What's in it for me?" +2, challenge 0 (+5 if you then spend her credit) |
| 2 | Short position (the paper room at Ninebridge) | `odile_sheet_held` (+ `odile_room_done`) | `hand` "The back of the sheet." → order/knew → the Dry Wells line | ≥ 15 (below: hub line, she keeps her hand on her coat) | `odile_s2_done`, knows `odile_counterparty`, `odile_sold_schedule`; "It was a cost" +5, comfort −5 (she won't buy cheap comfort), "use it" 0 (`odile_s2_use`) |
| 3 | The city (inside Meridian's Wall, q_a2_precinct) | `a2_precinct_done` + S2 | `city` "You've read the city's paper now. What is the sheet for?" | ≥ 20 | `odile_sheet` = torn (+5, her want) / kept (+5, proof) / player (≥ 35, +5) / nine (knows `nine_two_ledgers`, 0: "litigate") |
| 4 | Her price (one of Meridian's lines settled: q_cr_masque, q_sk_highwater or q_bw_turf done) | `odile_sheet` + MD_LINE | `her_price` "You said once you had a price." → "Imelda walks out alive." | ≥ 25 | `odile_price` = sarr (+10, and she tells the nine spans in full) / none (+5) / refused (−5) |

Adapted from the bible: (3) "chooses between burning the archive (her proof) and letting it stand" is played twice: the
archive at the lamp in the paper room (stage 2's place), and her own sheet (unwind vs keep the witness) at stage 3. (4)
"the Long Night: her price" is said before the Long Night, gated on a Meridian line until q_a2_longnight exists; **when
it is built, the Long Night reads `odile_price` (Sarr's life) and `odile_sheet` (who holds the proof), and S4's gate moves
to that quest's opening stage.**

## The quest `q_comp_odile` ("A Sheet on Shale")
told → held → city → price → done. Failed: burned (`nb_archive_burned`), parted (`odile_gone`). Every stage moves on
flags; the dialogue's quest-start effect (`ODILE_JOURNAL`) is empty until the quest is registered in quests/index.ts, so
the arc runs on flags either way. Routes into the paper room (behind the Grand Factor's office, Odile with you):
- day: Sarr's desk, "Odile's sheet" → pay 200 (barter) / "a bet on the weather" Speech 50 (−15 if Shale drinks the full
  measure, +15 if Shale's water was sold to the guild, −5 knowing Odile's history) / a factor's hand draws free;
  without Odile, Sarr says "Bring her".
- night (22–7, Sarr asleep in her chair): the office door, Stealth 45 (−10 with Odile: the latch sticks on the second
  notch); failing wakes her ("By appointment"; −4 guild respect), retry another night or by day.
In the room: the sheet, the back (the hand), then NB-1 and the lamp ("One match, my dear"):
- "Leave it standing" +10 · "Your call" ≥ 20: she hangs the lamp up (+5) · "Your call" < 20: she burns NB-1 only (her own
  first sheet; `odile_first_burned`) · "Burn it" → she covers the hook → "Then leave it" (−5) or take the lamp past her
  hand → **the red line** (below).

## Approval ladder (−100..100; visible reasons)
Existing before U8: join +10; sworn word on the riders +5; Sable freed +10, kept −10, resold −20; the clerk sold to Sarr
−25 (either route); lot seven sold −10.
Added in U8 (camp): telling +5; "We'll get it" +5; price ask +2; spending her credit +5; S2 cost +5 / comfort −5; S3 +5 (torn,
kept, given); S4 +10 / +5 / −5; Shale's water: sold to the guild −10 ("your hand on the console"), full measure +10, kept 0;
letting her talk about the bridge +3; paper room +10 / +5 / −5.
Added in U8 (interjections, in the Ninebridge and Openfield trees): the porters given the guild's own forecast +10; the
strike talked down for the guild −10; the tenth paid out of pocket +5; lot four let go to the coat −5; the Saint sold to
the floor −15 ("I wrote that phrase; it was meant for paper"); the guild sold chaff at a living price +10 (either route);
a tenth of the Choir's stolen seed −5.
Approves: debts paid, sealed sheets made worthless by daylight, paper torn, honesty about prices, the porters' tenth.
Disapproves: people sold as paper, the floor's methods in your mouth, cheap comfort, Shale's water sold.

## Conflicts with other companions (at most two)
- Wren ↔ Odile (debt labour): the exchange lives in Wren's tree (`overpass.ts`, `wren.c.odile`), not here (coordinator's
  rule: one exchange per pair).
- Kes ↔ Odile (the Tollmen in a nice coat): when Kes is built (B4), in Kes's or Odile's camp.
(An Ash ↔ Odile exchange was drafted and removed: Ash already has two exchanges in other trees.)

## Red line, break, floor, coming back
- **Red line — destroying the Exchange's archive:** taking the lamp past her hand in the paper room burns it
  (`nb_archive_burned`, `odile_archive` = burned): she says "That was a cost", walks to the Span, `leave`, `odile_gone`;
  guild −15 respect +10 fear; Sarr remembers; news at Ninebridge; quest fails. Not recoverable.
- **Break — Wren's sister resold with her help:** at the clerk's desk with lot four's paper, Odile offers a buyer at 130
  (her old reflex, in an interjection); "(Let Odile sell it)" plays her doing it well, then: "I sold her for you, and I
  was good at it. That is a cost I won't carry next to you." `odile_sold_sable`, `leave`, `odile_gone`; Wren −40, Odile
  −40. Not recoverable. (The quest journal for lot four still says "ninety"; see the report.)
- **Floor — approval ≤ −30:** next time you talk (camp or road), `floor`: she buttons her coat and goes back to the Span
  (`odile_left`). **Coming back, once:** at the Span, "(Close her tab with Lazlo, out of your own pocket. 60 Tolls)",
  Speech 45 (−10 if she told you the worst of it in S2): she rejoins at +40 ("You've just bought my debt off the Grand
  Factor"). A second fall below the floor is final (`floor_final`, `odile_gone`).

## Romance
None (bible §7). An opt-in "(Sit closer.)" after S2 at approval ≥ 30 gets a kind, amused no ("Sit there and be my friend;
it's the better rate"), no penalty, no flag beyond closing the topic; it never touches `romance_partner`.

## Light talk at the fire (once each, return to the hub)
Shale's water (three versions by the Dry Wells outcome, with approval), Imelda Sarr (after meeting her), the hand, the
bridge before the Exchange (talk-too-much), Openfield (after meeting Mason), the two names (existing), "Read on" (once).

## For later content
Long Night: `odile_price`, `odile_sheet` (torn | kept | player | nine), `odile_archive` (stands | burned), `odile_s2_use`
(she knows where the floor's water paper is weak: a route), `odile_first_burned`. Endings/epilogue "Odile's position":
read `odile_gone`, `odile_sold_sable`, `nb_archive_burned`, `odile_price`. Signal Hill broadcast (ending D) could use the
kept sheet as one of the forecasts made public.
