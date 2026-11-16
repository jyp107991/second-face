# U8 — Assessor Nine (comp_nine, `npc_md_nine`) — arc, approval, conflicts, leaving (SECRET)

Sources: `CHARACTERS_SECRET.md` §A comp_nine (want, fear, contradiction, voice, secret, opinions, arc, red line, breaks);
`STORY_PLAN_SECRET.md` §5 (Ledger line), §7 (companions table: *Title Deed*, red line, no romance), §10 (ending D needs
"Nine's access"), §11 ("Nine freed → Ledger enforcement weaker in the Long Night"), §13. Built 2026-11-16 in
`src/content/dialogue/meridian.ts` (`d_md_nine`, the records terminal, the desk warden, Captain Lowe) and
`src/content/quests/comp_nine.ts` (`q_comp_nine`, "Nine's Deed").

## 0. Who it is, in one paragraph (the bible, kept)
A Ledger municipal unit, 120 years in service, refitted from a warden pattern for civil work: records, assessments,
hearings. It wants two things: to know who owns it, and to file the Plan's errors somewhere they will be read. It fears
being disposed of before the file is complete. It worships lawful process and keeps an unlawful log of every forecast
that failed (clause 40 forbids it). Pedantic; kind in ways it would deny. Voice: formal, exact, numbers, clauses; dry
humour it never acknowledges; "the record suggests", never "I think"; talks too much about drainage; its lens is cracked
and it will not replace it ("it is on the record"). Secrets: it knows the player's file; its own disposal is scheduled
(R31, next year); it once processed the stranger, the only person it ever met who was not in the file.

## 1. Adaptations to the owner's rules
- **No time limits.** The bible's "its own decommission is forecast (R31)" is a fact the player *reads* (the last line
  of its register entry), never a timer: nothing happens on a date. The disposal resolves on a story milestone (Act 3,
  §4 below), and the deed decides how.
- **Title Deed "find / buy / forge"** is built as: read the entry (terminal or the desk's printout), then make a deed
  (Lowe witnesses under clause 9(b), the desk sells at assessed value, or Nine is talked into forging it), then the name.
- **Conversations never loop:** each arc conversation is one node chain, opened once by its own flag and closed by it;
  every node has an `again` line; lighter topics close when asked (`not seen`).

## 2. The four stages (built)
| # | Stage | Milestone (flags) | Band | Conversation (`d_md_nine`) | Sets |
|---|---|---|---|---|---|
| 1 | **The other ledger** | `nine_joined` (it left the records office with the player, after the hearing / diary / order) | approval ≥ 5 | `s1` → `s1_why` → `s1_keep` / `s1_city` / `s1_mock` | `nine_s1` |
| 2 | **The deed** | `nine_s1` + a line of the Precinct seen together: any of `sk_pumps`, `mk_riot_outcome`, `bw_static`, `cr_settled`, `st_roof` | ≥ 15 | `s2` → `s2_yes` (or `s2_why` / `s2_free` → `s2_later`, reopened by "Your deed. I'll read the register") | `nine_s2`, `nine_deed_asked`, starts `q_comp_nine` |
| 3 | **The keeper's line** | `nine_deed_made` (quest stage `name`) | ≥ 20 warm (`s3`); ≤ 19 cold (`s3_cold`) | warm: `s3` (it read the disposal date off the player's face: tell it, or lie kindly) → `s3_name` (self / player / city) → `s3_log` if ≥ 35 (a fair copy of the error log: take it or tell it to keep it) | `nine_deed` = self / player / city; `nine_log_given` or `nine_log_kept` |
| 4 | **The call** | `nine_deed` + `c_photo_forecast` concluded or `cr_settled` | ≥ 30 warm (`s4`); ≤ 29 cold (`s4_cold`) | warm: `s4` → `s4_man` (the man the record could not see: R29, the Spire's render queue, twelve names) → `s4_call` (advice: conscience / deputy / "what do you want?") | `nine_stance` = conscience / deputy; `nine_met_stranger` |

Cold variants keep the arc moving without the player: below the band, Nine fills the keeper's line with the city itself,
and tells the player it will "do what is lawful" (deputy). Nothing is lost by a day passing; only by how the player has
treated it.

**What changes each stage:** the player's choices at camp (each moves approval for a reason it states aloud), the
Precinct lines walked with it (stage 2's gate), how the deed was made (`nine_deed_how`), and the name (which decides its
fate at the Act 3 recall). Its own decision at stage 4, if asked "what do you want?", follows the deed: a keeper of its own
(or the player as keeper) makes it a conscience; the city's deed makes it a deputy.

### The personal quest: `q_comp_nine` "Nine's Deed" (built, compact)
Stages: `register` (objectives: read the entry `nine_title_read`; get a deed made `nine_deed_made`) → `name` (objective:
`nine_deed`) → `self` | `player` | `city` (all end done). Routes: terminal (Science 40, −15 with Nine naming the codes),
desk printout (20 Tolls), Lowe's witness (Speech 40, −10 with Nine there, −10 if he trusts the player, −5 for a warden
citizen; a failed check stays offered), purchase at assessed value (120 Tolls: one a year in service; Nine complains about
the method), forgery at camp (Nine −10; it logs "the first error I have made on purpose"; learns `nine_forged`).
The entry's text: issued R−90; owner the Department of Records, dissolved R−60; title lapsed; DISPOSAL — SCHEDULED — R31;
clause 9(b): a lapsed asset passes to its keeper on a captain's witness, or to a buyer at assessed value.

## 3. Later stages (planned; read the flags above)
- **P10, Court of Accounts (B3.11):** a forged deed (`nine_deed_how` = forged) can be voided by Assessor Three (Nine's
  sibling, strict) if the player brings any case touching Nine; a witnessed or bought deed stands as precedent ("a unit
  may be its own keeper" is the first entry under a clause nobody wrote: an amendment-route seed for ending E).
  *Built (B3.11, `dialogue/md_court.ts`, case `deed`):* registration of title at the Court, offered once `nine_deed` is set;
  `ca_deed` = self | citizen | returned | irregular | voided; `prec_unit_keeper`; `nine_deed_void` on a voided forgery. Also
  built: Nine reads the photograph's date (`d_md_nine/cal`, `d_photo_read/nine`), its records request up the Spire's stair
  (+5), the census line ("I did not escalate it"), and its reactions to the Spire hearing's verdicts.
- **P10, the Long Night:** the Ledger calls its units in. `nine_stance` = conscience → Nine answers, reads the eviction
  order aloud at Openfield, logs it as an error where it is recorded, and refuses the line it cannot make lawful (this is
  §11's "Nine freed → Ledger enforcement weaker"); deputy → it carries the order out and makes it lawful line by line (the
  wardens are stronger; Nine logs what it could not soften). Either way it returns to the player after the night unless
  approval has fallen below the floor.
- **P11, Act 3, the recall (q_a3_order):** the city recalls unit 9 "for disposal, as scheduled". Deed `city` → Nine is
  taken back unless the player stops it at the Court (Speech, or the error log as evidence: `nine_log_given` makes the
  case); deed `player` → the city must ask the player, who can refuse (Nine stays) or hand it over (Nine leaves, approval
  irrelevant: it obeys a lawful owner, and says so); deed `self` → "the keeper declines": Nine stays and the recall is
  logged as the city's first refused order from one of its own units.
- **Ending D (Open Sky)** needs "Nine's access": `nine_log_given` or `nine_stance` = conscience (the log is the proof that
  forecasts fail; the access is Nine reading the broadcast's clauses into the record). Ending A/E: Nine stands beside the
  sash as the Magistrate's assessor if deputy; as its conscience if conscience.
- **Epilogue variable "Nine's deed":** self / player / city × stance × alive or disposed.

## 4. Red line, break, floor, return
- **Red line — destroying the Ledger (ending B at the Spire, P11):** when the player commits to destroying the core, Nine
  stands at the core's door and says the record's one plea ("a city is a thing that decides where its water goes; without
  it the drains of the Precinct fail within a year"), then withdraws from the party with the grounds attached (scene:
  `leaving`'s form, final text: it will not fight the player; it will not help). Not won back.
- **Break — ordered to arrest Tamsin (Act 3 siege):** if the deed names the player and the player orders it, Nine refuses
  for the first and only time ("an undocumented person is the record's one precious thing") and leaves for good; if the
  city orders it, a conscience Nine refuses and is struck off (the city's units turn on it at the door: it can die
  there), a deputy Nine comes to the player and asks to be told to refuse (the player's word decides).
- **Floor (built):** approval ≤ −15 → `leaving` (any talk while it travels with the player; usually at camp): a notice of
  withdrawal with the grounds attached, `leave`, `nine_left`. At its desk afterwards (`left`): "I read your grounds. I was
  wrong" (Speech 45; −15 if it has trusted the player, trust ≥ 25; −10 if the player holds its deed; −5 with Odile there):
  success → approval +30, rejoins, `nine_left` cleared (`back`); failure stays offered (`back_no`). **Gone (built):**
  approval ≤ −45 at the moment it leaves → `leaving_gone`, `nine_gone`: never received again (`gone`).

## 5. The approval ladder
Approves: things written down and read (petitions, signed agreements, the record read aloud), clause 14 (the drains
before growth), lawful variances, honesty told to its face, being let to talk about drains, being asked rather than
ordered. Disapproves: murder dressed as lawful, arson, people sold or kept as assets, lies to the record (forgery),
mocking the log, giving it back to the schedule. Red line and break above.

Existing (before U8): join +10 (`d_md_nine/join`); the Sink variance it stamps +15 (`d_sk_pump_board/nine`); the cup at the
Masque −15 (`d_cr_cup/poured`, interjection); the Crown's terms read aloud at the lectern +5 (`d_cr_lectern/exposed`);
the Stacks fire −10 (`d_st_ren/burned`); camp hints +5 ×2 (`owner`, `errors`).
Added (U8, `meridian.ts`): Lowe's clause-14 variance +10 (`d_md_lowe/pumps_ok`, on the existing interjection); the girl who
hears the wire handed to the wardens −5 (`d_md_lowe/static_done`, existing interjection: "I will be noting it
elsewhere"); Lowe witnessing the deed +5 (`d_md_lowe/deed_ok`, new interjection). Camp: s1 keep +5 / mock −5; s2 read +5 /
"unowned sounds like free" −5; forge −10 / refuse to forge +5; s3 the truth about the date +5 / the kind lie −10; the name:
self +10 / city −5; keep the log +5; stance: conscience +5 (and +5 if it chooses conscience itself); drains "go on" +5;
the Ash exchange ±5; asked back +30.
Proposed for other files (in the U8 report): the Old Market petition +5 (`d_mk_vell/talk_ok`, existing interjection);
the girl sold to the Exchange −10 (`d_nb_sarr/static_sold`, new interjection); the girl sold to the Concern −10
(`d_st_latch/static_done`, new interjection).

## 6. Conflicts (at most two)
- **Ash ↔ Nine (mercy vs law) — built**, `d_md_nine/ash` → `ash_nine`, when Ash travels with them (once): Ash calls law a
  mask; Nine says the Brother has an entry it has not read to anyone (clause 40), and Ash says to keep it that way. The
  player sides: "Somebody has to count the dead" (Nine +5, Ash −5) / "Some things should be forgiven, not filed" (Ash +5,
  Nine −5) / "Both of you. Sleep." Nothing of Ash's past is revealed: the entry stays unread (Ash's own arc reveals it).
- **Kes ↔ Nine (law vs a criminal it respects) — planned for B4**, when Kes travels with Nine: Kes uses the backdoor in
  front of it ("obviously, nobody saw that"); Nine: "I saw it. The record did not. I find the difference restful." The
  player sides: report it to the record (Nine +5, Kes −10) / tell Nine the record can't see her for a reason (Kes +5, Nine
  +0: it logs the blind spot as the Plan's largest error) / leave it.
- (Tamsin ↔ Nine is written in `U8_tamsin_SECRET.md` §6; it needs Tamsin to be able to join.)

## 7. Romance
None (bible). Its depth is carried instead by: "Thank you. Nobody has told me a thing about myself in a hundred and
twenty years"; the drains it is allowed to talk about; the log given "in case I do not" survive R31; and stage 4's
"You asked. Nobody asks."

## 8. Lighter camp talk (built, each once)
Who owns you? (before stage 2) · the errors' cluster · the cracked lens (R12, a stone from a man forecast to be grateful)
· the drains (talks too much; "Go on" is a +5 kindness) · Captain Lowe (after meeting him) · the Sink (after visiting) ·
the Crown (after visiting) · Tamsin in Reserve 9 (clause 40: "Bring her to my desk one day"; sets `nine_tamsin_asked`
and `nine_reserve_count`, the seed for Tamsin's stage 3) · Odile and Wren (when they travel with it).

## 9. Headless checks (run 2026-11-16 in a scratch script; to become tests in P9's playtests)
Warm path to every stage (terminal + Lowe → self → log → conscience); desk print + buy → player's name below the log band;
forge → cold stage 3 (city) → cold stage 4 (deputy); Ash exchange approvals; leaving at −20, a failed and a passed
win-back, no re-leaving after return; gone at −50. All passed.
