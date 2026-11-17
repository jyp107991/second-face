# B6 — Act 3 and the endings: build plan (SECRET, never quote to the owner)

Planned 2026-11-17, before any B6 content exists. This file is the binding plan for B6 (BUILD_PLAN P11): Act 3 (STORY_PLAN
§4 beats 18–21), the endings A–E and their modifiers (§10), and the epilogue. It splits B6 into 23 slices of about an hour
each (§8), to be built in letter order. Where it changes the story plan, §12 says so.

Sources read: CLAUDE.md; STORY_SECRET.md; STORY_PLAN_SECRET.md (all, including every Build notes section); WORLD_SECRET.md;
CHARACTERS_SECRET.md; U8_{tamsin,wren,ilya,odile,ash,nine,kes}_SECRET.md; B5b and B5c notes; AUDIT_SECRET.md; the parked
B4b draft (`git show wip/b4b-halcyon:src/content/quests/b4_halcyon.ts`). The flags were surveyed in `src/content` on
main at 0e9b5e6e/e1a1b472, about 1,080 `set:` flags. Flag values below are the ones the content actually writes.

**Rules every B6 slice keeps.** These are CLAUDE.md §2 and the project's conventions, restated for this act:
- **No time limits.** Nothing in Act 3 resolves behind the player's back. The column waits at Knock for the designate (§2,
  beat 20). The buyout in Shale is a story milestone. The steps wait for the player to climb them. Every world event
  B6 adds is armed by a flag and waits for the player (`at: { hour, where }`). Durations such as travel are fine.
- **Local reputation, never karma.** The gates read local state: flags, `standing: { settlement }`, `rep: { faction }`,
  `trust` with named people, and companions' approval. No B6 condition sums good and evil.
- **Every beat has ≥3 routes, one of them non-violent** where the story allows. Critical quests declare `routes` with
  `requires`, and `npm run validate`'s build coverage must pass at `ACT_LEVEL.a3` = 24 for all eight reference builds.
- **U7 conversations.** Every node has an `again`, topics are spent with `once`, and services are marked `repeat`. The
  Ledger's last conversation asks each of its questions once. **U6 names.** Use found names, keep one name per person
  (check the cast before naming anyone), and avoid "the [noun]". Quest titles come from in-world signage where possible.
- **People.** New people go through the locked pipeline, with frame narrow for women and broad for men. Hair is gritty
  and true to ancestry. No religious dress. **Faces are never hidden**: the Unwritten "keep no likeness" because they
  refuse lenses and portraits, not by masking. They wear hoods, and their faces stay visible.
- **Ids.** Act 3 flags are `a3_*`. Epilogue bookkeeping is `ep_*`. Keystones are `ks_*` (`ks_ada` and `ks_sarr` are new).
  Act 3 NPCs are `npc_a3_NN` (named), `npc_a3_gN` (wardens and guards) and `npc_a3_uN` (the Unwritten). Instances of
  existing people use `<def>_a3` or `<def>_<place>` placement ids. Dialogues are `d_a3_*`, quests `q_a3_*`, items
  `k_a3_*`, leads `l_a3_*` and conclusions `c_a3_*`.
- **Each slice** runs `npm run check` green, updates PROGRESS.md (spoiler-free: name the slice and its places only),
  commits and pushes. It does not run `npm run export` and does not touch `unity/`; the place build and the runtime asks
  (§9) belong to the runtime track. When a slice changes a plan detail, it records it under "As built" at the end of
  this file.

---------------------------------------------------------------------------------------------------------------------
## 1. What B6 reads from the rest of the game, and the two hooks

### 1.1 B5d (the Long Night) is being written in parallel. ASSUMED names, all reconciled in one place
**Reconciled in B6a (2026-11-17)**: B5d is on main; the aliases below now read its real flags. The mapping, the names that
did not exist and the new aliases are under "As built" → B6a. The table is kept as planned.
B6a creates `src/content/world/a3_conds.ts`, and **every** read of a B5d flag goes through an alias in that file. If
`story/B5d_NOTES_SECRET.md` exists when B6a starts, B6a renames the aliases' targets to B5d's real flags and records the
mapping under "As built". No other B6 file names a B5d flag. The assumptions come from STORY_PLAN Build notes — B5d and
PROGRESS, and from B5d's maps in the working tree on 2026-11-17 (`an_*`; `an_kelso` is read by the hall's placements):

| Alias (a3_conds.ts) | Assumed flag `[B5d?]` | Meaning B6 needs |
|---|---|---|
| `LN_DONE` | `a2_longnight_done` | Act 2 is closed: the alliance is decided. Act 3 opens on it |
| `LN(side)` | `ln_alliance` = `choir` \| `guild` \| `ledger` \| `truce` | who the player stood with (plan: Choir / Tollmen–Concern / Ledger / truce) |
| `MASON_BURNED` | `ks_mason` = `burned` (else `lives`) | keystone 8: Openfield burned in the Long Night |
| `CALLA_HELD` / `CALLA_FREE` / `CALLA_DEAD` | `ks_calla` = `held` \| `freed` \| `dead` | keystone 7: arrested as the eviction's first act and carried west |
| `SARR_FATE` | `ks_sarr` (unset unless B5d resolves it) | keystone 9. Odile's price (`odile_price` = sarr) is read in the Long Night |
| `HOUNDS_PLAYER` / `HOUNDS_CONCERN` / `HOUNDS_ASLEEP` | `an_kelso` = (values to reconcile: the command unit answers the player / the Concern / no one) | the Ashlands reserve (modifier M5) |
| `ASH_LN_REDLINE` | B5d wires "siding against Openfield" into Ash's red line | B6 only reads `ash_gone` |
| `NINE_LN` | `nine_stance` as B5d leaves it (conscience / deputy) | already a real flag; B5d may only move it |

If B5d does not set one of these, the alias falls back to its safe default: Act 3 opens on `a2_spire_done` plus the
Long Night quest done, the alliance is `truce`, Mason lives, Calla is held, Sarr is alive, and the hounds sleep. With that
fallback, a fixture that never ran B5d still plays Act 3 to every ending.

### 1.2 B4b (Halcyon) is parked on `wip/b4b-halcyon` and not on main. HOOK
B4b's draft writes these flags: `hc_inside`, `a2_halcyon_done`, `hc_soto_met`, `hc_offer` = accepted | refused | feigned,
`hc_contract` = citizen | infiltrator | guest, `hc_leash` = cut | sold | seized | left, `hc_longlived` = exposed | soto | kept,
`hc_reserve`, `hc_clinic`, `hc_kes_contract`, `hc_garden` = skirts | openfield | sold | caught, and `hc_funicular` = down |
stayed | reported. B6 reads them **only** through the `B4B` section of `a3_conds.ts`, and every B4b-fed key has an Act 3
alternate, so no ending, modifier or slide needs B4b:

| Where B4b feeds in | With B4b | Without B4b (Act 3 alternate / default) |
|---|---|---|
| Ending C's buyer (`C_BUYER`) | `hc_offer` ∈ {accepted, feigned} | the Concern's officer at the Spire close (B6l): Mr Quill (`npc_cr_11`); Soto replaces him when `hc_soto_met` |
| Modifier M1, the Leash | `hc_leash` cut / seized / sold / left | the Leash stays the Concern's (`theirs`); Kes's slide reads her own `kes_link` |
| Modifier M3, Halcyon | `hc_longlived` exposed → opened, soto → reformed | stands, or burned through the Shift and the hounds (M3 below) |
| Kes at the finale | `kes_lineage` = speak was heard by the Chair | `kes_lineage` exists on main already (B4a); without B4b it is only her own |
| The Skirts slide (E12) | clinic / garden / funicular lines | variants omitted (each line is its own `if`) |
| The strike | B4b's `hc_inside` arms `hs_strike_breaks` | **unsettled strike stays unsettled**: E12 has a "still out" variant. B6 must not arm the break itself, because that would resolve it behind the player's back |
| `q_a2_halcyon` | ends on B4b's stages | may still be open at `inside`/`car`/`road`. Act 3 never requires `a2_halcyon_done` |

When B4b lands, nothing in B6 changes: the aliases already read its flags first.

### 1.3 Act 1–2 flags the endings and the epilogue read (real, surveyed)
Knock and the Cistern: `kn_maud_saved` | `kn_maud_scarred`, `kn_linnet_to_shale` | `kn_linnet_stays` | `kn_linnet_will_run`,
`kn_out_choice`, `kn_hatch_haggled`, `kn_mother_opened`, `kn_ines_refused`, `c9_knows_shale`, `c9_told_city`,
`c9_tamsin_inside`, `q_a1_bram` (and knowledge `bram_answered_*`), `tam_out`, `tam_secret` = kept | mother | ines, `tam_why`,
`tam_pledge` = door | lives | city, and the origins `pump_hand` | `clinic_aide` | `door_watch` | `archive_clerk`.
· Shale and the Sallow: `jonah_lived` | `jonah_dead`, `shale_broke`, `shale_withers`, `dw_outcome` = restored | freed | kept |
sold, `militia_drilled`, `ledger_shown_ada` | `ledger_sold`, `th_page_taken`, knowledge `mags_exposed`/`mags_squeezed`/`mags_helped`,
`hound_outcome` = kept | shale | sold, `rd_coup`, `rd_leader`, `wren_exodus`, `teo_freed`, `broadcast_amplified` |
`broadcast_silenced`, knowledge `mast_powered`, `relay_log_read`. · Ninebridge and Openfield: `nb_sable_outcome`,
`nb_archive_burned`, `odile_*`, `of_blight_outcome` = exposed | mercy | unwritten, `of_seed_outcome`, `sky_rite`,
`member choir`. · Meridian: `ar_verdict` = agreed | contested | noted | refused | silent, `k_ar_warrant`, `k_ar_refusals`,
`k_ar_list`, `ca_precedents`, `ca_cases_heard`, `prec_forecast_fine` = void | priced | designate | upheld, `prec_unrecorded` =
yields | outside | property, `prec_refuse_benefit`, `prec_register` = kept | catalogued, `prec_unit_keeper` = self | citizen |
irregular, `ca_deed`/`nine_deed_void`, `ca_squatter`, `sk_saved` | `sk_flooded` (`ks_ocho` = drowned), `sk_pumps` = paid |
retimed | seized, `ks_vane` = rises | broken, `cr_concern` = kept | exposed, `cr_crown_hostile`, `cr_celestine_dead`, `bw_static`
= kept | silenced | sold | concern, `bw_turf` = gilt | peace | rustmouths, `bw_three_crews`, `bw_raid` = won | lost, `bw_dogs_hold`,
`vasha_fate` = ilya | player | spared | spared_why, `vasha_dead`, `dr_bello`, `dr_leven`, `dr_buggy`. · The Skirts: `hs_shift`
= won | broken | revolt, `ks_maren` = lives | hanged, `hs_parts`, `hs_marked`, `hs_gate_shut`, `hs_rafe`, `k_hs_powder`,
`hs_leash_sold`. · The wilds: `rc_line` = guild | halts | shared | stationmaster, `k_rc_pass`, `ds_boats_owed`, `ds_rig`,
`ds_claim`, `nw_barges_owed`, `nw_dam` = truth | hidden | exposed | sunk, `nw_sink_relief`, `nw_controllers` = guild | river |
ledger, `dk_stand_owed`, `dk_cradle` (unset = running), `dk_prec_passenger`, `tm_four`, `tm_digger_concern`.
· Companions: §7.

---------------------------------------------------------------------------------------------------------------------
## 2. Act 3 as it will be built

### 2.1 The shape (8–10 hours)
Act 2 closes on the Long Night. Act 3 is the Ledger escalating "on schedule", and the player going home to the door they
grew up beside. **Why now, by alliance** (the courier's order and the Ledger's last conversation say it once):
- `choir`: the Unwritten broke the eviction in the open, so the Plan's enemies are walking toward its core.
- `guild`: the Concern bid for the core in the open.
- `ledger`: the designate has proved the schedule holds, so the chair can be filled early.
- `truce`: every side owes the designate, the most governable moment in ninety years, and the Ledger will not wait nineteen
  years for another.

In every case the Ledger reopens the steps at R30 instead of R49 ("PUBLIC STEPS REOPEN R49" becomes "R30"). It issues the
fourth order for Reserve 9 (the drawer on landing 91 read ESCALATION ON SCHEDULE), and it names the relocation as **the
first act of the chair**: the order executes only on the designate's attendance at the door. That clause is why the
column waits at Knock for the player, and why nothing happens until the player comes.

MOTHER answers the order as she did three times before: she closes the hatch (**the lockdown**, STORY_PLAN §5's Cistern
line: letters home → the Archive promise → lockdown → core). This time she also writes for the first time in her life. Her
printed slip comes out in the last hatch tray before it shuts: HATCH CLOSED. THANK YOU FOR YOUR CONTINUITY. PLEASE COME
HOME.

### 2.2 Beat list (maps, quests, who is where, routes)
Route letters follow STORY_PLAN §4: F fight · T talk · S stealth · X science/tech · B barter · K knowledge · V survival ·
M medicine · C chrome.

| # | Quest | Beat | Place (map) | Who is there | Routes |
|---|---|---|---|---|---|
| 18 | `q_a3_order` "Escalation on Schedule" (critical) | the post: Maud's letter and MOTHER's slip; the Ledger's order by courier; the reason by alliance | wherever the player is (the post reaches them); the order read in the pack | Maud (letter), MOTHER (slip), a Precinct courier (`npc_a3_01`) | narrative; starts `q_a3_recall` and `q_a3_return`, and opens the Reserve 9 case at the Court |
| 18b | `q_a3_recall` "Disposal, as Scheduled" | the city recalls Unit 9 (U8 Nine §3) | Meridian: the Precinct gate, the Court (`md_spire` court hall), the Ring (`md_ring`) | Nine, two recall wardens (`npc_a3_g1/g2`), Three, Lowe | K (deed self: "the keeper declines", no check) · T (the Court: case `recall`) · T (deed player: refuse) · B (clause 9(b): buy title at assessed value, 121 Tolls) · S (hide Nine outside the Wall: Clover, or the cradle while `dk_cradle` runs) · F (turn the wardens away; wardens −20) · hand it over |
| 18c | case `reserve` in `d_ca_court` (tracked by `q_ca_court`) | Reserve 9 against the fourth order, at the Court, before going home | `md_spire` court hall | Three, Comfort (the register), the usher | T (consent: the caretaker's refusals stand) · X (attendance: the order cannot execute without the designate) · K (privilege: the designate stays its own first act) · fail → upheld |
| 19 | `q_a3_return` "The Toll Road Home" (critical) | getting west to the Sallow; calling allies by letter or in person | the Line (`rc_*`), the toll road, `tollhouse`; road encounters `re_a3_*` | by alliance: the wardens' car (Lowe), the guild's first class, Openfield's carts, the Wheel (Sefa Oduya) | the Line (fare / `k_rc_pass` / rods / footplate / handcar) · the column's car (`ledger`, or `member wardens`) · the guild's first class (`guild`, or `member tollmen` hand+) · the Choir's carts (`choir`, or `member choir`) · the Wheel (`member wheel`, or Sefa) · the buggy (`dr_buggy`) · on foot |
| 19b | `q_a3_mast` "Every Dead Radio" (side; key for D) | Signal Hill: raise the mast for the whole Reach | `signalhill` | the Hollow at their camp, the station's voice | X (Science 50) · C (grid link, or Kes) · B (a pre-Scald board + the Hollow's price) · T (the Hollow keep it, Speech 45) · V (re-rig the aerial, Survival 45 / Reflex 7) · K (Verity's band) |
| 19c | `q_a3_ride` "Sheriff's Last Ride" (side; keystone 3) | the guild's buyout of Shale comes due (story milestone: the first time in Shale once Act 3 is open) | `shale` | Ada, Pike, Mags, Teo, Jonah (if alive), Issa, the militia; Pike's guild hands | T (Ada stays) · B (the buyout paid, or talked down with Odile) · K (Odile's sheet torn / the Tollhouse page as leverage) · S (the deed from Pike's safe) · F (the guild's men put off the street) · let it happen |
| 20a | `q_a3_cistern` stage `knock` (critical) | Knock under the column, dry since the lockdown | `c9_mouth` (Knock; the column on the toll road by the stand) | Maud, Corin, Dace, Linnet (by fate), Knock's others; **the column**: Lowe (or Sgt Paloma Reyes `npc_md_12` if Lowe is dead) + 4 wardens; **the guild** if in play (Factor Ismay Orme, Brannick Hale if alive, hound handlers); **the Unwritten** at night (Petra Mason or `npc_a3_u1`, two more) | the place is talk: Lowe's clause, Knock's water (Dry Wells' carts if `dw_outcome` = restored | freed; the Grille) |
| 20b | `q_a3_unwritten` "Burn the Count" (side; key for B) | the Unwritten mean to burn the reserve's record and MOTHER | Knock at night | Petra, two Unwritten, Ash (if travelling) | T (turn them to the core: `with_you`) · T (send them home) · S (stop the burning party at the apron at night) · F · let them |
| 20c | `q_a3_cistern` stage `inside` | going in for the first time; seeing faces | `cistern9` (instant interior) | Ines, Pell, Bram, Teague, Ola Fairley, Wes Benn, Sayer Quist, Effie Calder, MOTHER (panel); Tamsin if she never came out | T (MOTHER holds the hatch tray) · S/V (the maintenance shaft) · X (the great door's manual cycle: it opens for the column too) · K (Tamsin's override phrase) · T (Bram unbolts from inside) |
| 20d | `q_a3_cistern` stage `ring` | the council: what the reserve does | `cistern9` council | the ring, MOTHER, the companions | T (Ines: the Archive) · K (Tamsin's card) · M (Pell's certificate) · X (Bram: how a caretaker sleeps) |
| 20e | `q_a3_cistern` stage `door` | the door, resolved | `c9_mouth` apron | the column, Knock, the forces, the residents | T (Lowe stood down) · K (the Court's stay as evidence) · M (unfit: struck) · X (welded from inside) · F (the column broken) · B (the guild buys the order: sold) · the designate's word (relocate) |
| 20f | `q_a3_platform` "Sixty at the Buffer" (side, only if relocated to the Precinct) | the reserve arrives at the Line's terminus | `md_docks` (Carrick) | Factor Henrike Dahl, Connie Okoye, Kobby Ofori, the wardens' car | T (the Harbour court: a person is a passenger, never cargo) · F (the Stand blacks the car) · S (the cradle to the Hulls) |
| 21a | `q_a3_spire` stage `close` (critical) + `q_a3_hold` "What You Hold" (tracker) | the Spire close in Act 3: who came, what the player holds; the point of no return at the foot of the steps | `md_spire` (the close, the court hall) | the companions (all living, not gone), Mr Quill (or Soto [B4B]), Petra (if `with_you`), Verity (if kept), Lowe/Reyes, Comfort, Marwood, Assessor Seventeen (if `nw_dam` = truth and called), Connie (if the Stand was called), the gangs' captain | preparation hub; §3 |
| 21b | `q_a3_spire` stage `steps` | the photograph restaged; the sash; Ash's orders | `md_spire` the steps | the crowd, Three with the sash, Lowe, the companions, Ash | wear / refuse / contest the file again |
| 21c | `q_a3_spire` stage `vault` | the core, the Ledger's last conversation, the choice | `md_vault` (**new**) | the Ledger (voice), the companions in party | A · B · C · D · E (§4) |
| 21d | `q_a3_spire` end | the climax of the chosen end, then the epilogue | `md_vault` → `md_spire` close | by ending | B: fight / the couriers' drop / Lowe lets you pass · C: the transfer guarded · D: the escort out through the riot (danger by readiness) · A and E: no fight |

**Maps.** One is new: `md_vault`, the Vault of Accounts under the Spire's foot (§8 B6q). Five are reused with Act 3
placements: `c9_mouth`, `cistern9`, `signalhill`, `shale`, `md_spire`. `md_docks` is reused without placements.

### 2.3 Beat detail (the content agents' brief)
**18 — the order.** World event `a3_order` (B6a) is armed by `LN_DONE` and fires at the next seven o'clock anywhere:
`{ post }` from Maud ("The hatch has shut. Fourth time in my life. There's wardens camped by the stand and they're polite
about it, which I don't like."), `{ post }` from MOTHER (the slip text, item `k_a3_mother_letter`), and the courier's sealed
order (`k_a3_order`, `read: d_a3_order_read`). The order reads: RESERVE 9 (THE MOUTH) — RELOCATION TO PRECINCT SUPPLY — BY
FORCE IF NON-COMPLIANT — EXECUTION ON THE DESIGNATE'S ATTENDANCE — THE FIRST ACT OF THE CHAIR. It also says the steps
reopen R30. Reading it sets `a3_order_read` and starts `q_a3_return`. A `{ event: 'title', data: { text: 'ACT THREE\n…' } }`
card plays here.

**18b — the recall** (U8 Nine §3, now built). A Precinct notice for Unit 9: DISPOSAL — AS SCHEDULED — R31 brought forward.
How it plays depends on the deed:
- `nine_deed` = self, with the title registered or witnessed: the keeper declines. `a3_recall` = `declined`, the city's
  first refused order from one of its own units.
- `nine_deed` = player: the city asks the player. Refusing sets `stayed`. Handing it over sets `handed` (Nine obeys a
  lawful owner and says so).
- `nine_deed` = city, or no deed, or `nine_deed_void`: the wardens come for it at the Precinct gate when Nine passes
  with the player. The player can argue at the Court (case `recall`), buy title under clause 9(b), hide it outside the
  Wall, fight, or let it go (`taken`: Nine is disposed. `nine_disposed`; it is never placed again).

Case `recall` (courtCase): evidence is the deed, the error log (`nine_log_given`), `prec_unit_keeper`, and the census line.
The grounds: "a unit may be its own keeper" (Speech 50, or no check with `prec_unit_keeper` = self), or "the schedule
reads the register" (Science 45, with the title registered). Rulings: `kept` (precedent: `prec_recall` = keeper) or
`returned`. It sets `a3_recall` = `court` or `taken`.

**18c — case `reserve`** ("Reserve 9 against the fourth order"). It is called once `a3_order_read` is set. Evidence: the
replies copy (`k_ar_refusals`), the census (`tam_why`, or Tamsin in party), MOTHER's slip, Nine's "I did not escalate it"
(Nine in party), `prec_unrecorded` = yields, and `prec_refuse_benefit`. Grounds:
- **consent**: "three refusals on the city's own record are a reserve's continuity, and a reserve kept by its caretaker is
  kept by consent". Speech 50: −10 the replies copy, −5 the census, −5 Nine, −10 `prec_unrecorded` yields, −5 MOTHER's slip.
  Win → `stayed`; precedent `prec_reserve` = `consent`.
- **attendance**: "the order executes on the designate's attendance, and the designate declines to attend". Science 45, or
  the `archive_clerk` origin with no check. Win → `attendance`: the order is lawful but cannot execute while the designate
  formally declines. It is a precedent (`prec_reserve` = `attendance`), and the Ledger hears it as a contest.
- **privilege**: "the designate stays its own first act". No check, always wins → `privilege`. It is a stay, not a
  principle, and not a precedent. Tamsin −5 ("You used your title. Again."), Ash −5.
- A failed ground → `upheld`: the order stands with the Court's endorsement, and Lowe's stand-down DC rises by 15.

Ruling flag `ca_reserve`. Every win is evidence at the door (20e).

**19 — the road home.** `q_a3_return` stages: `west` (leave Meridian) → `sallow` (reach Tollhouse 9 or Shale) → `knock`
(arrive: sets `a3_at_knock`). Logistics by alliance, set as `a3_route_home`:
- `ledger`: the wardens' car with Lowe, so the player arrives with the column. This is Tamsin's hardest Act 3.
- `guild`: the guild's first class and the Concern's through. It is fast, with Orme as fellow passenger.
- `choir`: Openfield's carts west by West Halt and the old south bed.
- `truce`: any one of these, by asking.

The Line reads `rc_line`. With `guild` the guild's riders let the designate ride, unless the player is against the guild,
in which case the riders become a road encounter. The halts' pilots wave the train through.

**Muster (`a3_ally_*`)** happens by letter. New LetterDefs go in `world/a3_letters.ts`, spread into LETTERS. Each needs its
owed flag or local standing. Its reply (a `days` duration, never a deadline) sets the ally. The allies, and which part of
the finale each counts for:

| Ally | Letter to | Needs | At Knock | At the close |
|---|---|---|---|---|
| `shale` | Ada (`npc_sh_01`) | `standing shale ≥ 15` ∨ `member shale_militia` | yes | — |
| `dogs` | Kessler, or Wren's people | `wren_exodus` ∨ `rep rust_dogs respect ≥ 15` | yes | — |
| `choir` | Calla or Mason | `sky_rite` ∨ `standing openfield ≥ 15` ∨ `LN('choir')` | yes | ready +1 |
| `wheel` | Sefa (`npc_wh_01`) | `member wheel` ∨ `standing wheel ≥ 15` | yes | ready +1 |
| `shift` | Maren | `hs_shift` ∈ {won, revolt} | (powder for the charge) | — |
| `stand` | Connie (`npc_dk_02`) | `dk_stand_owed` | — | ready +1 |
| `boats` / `barges` | Oona / Magda | `ds_boats_owed` / `nw_barges_owed` | — | bring the delta's / the Wet's people (slides) |
| `gangs` | the holder of the chain | `bw_turf` = peace ∨ `bw_three_crews` | — | ready +1 |
| `saints` | Verity | `bw_static` = kept | — | ready +1 (and a D reader) |
| `seventeen` | Assessor Seventeen | `nw_dam` = truth | — | a D reader |

Ines's letter `let_ines_refusals` goes in the same file. It is available from Act 2 on, once `k_ar_refusals` is held:
send the copy home. Her reply is **the Archive promise**: "If this is true, bring it to the door and I will open the
Archive." It sets `a3_archive_promise`. Road encounters `re_a3_*` (4): the column's car passing on the toll road, Long
Night refugees heading west, the guild's riders (only against the guild), and a Hollow trader with news of the mast.

**19b — the mast.** Hook: the station's voice still reads the list every night, to the Sallow if `broadcast_amplified`,
to nobody if `broadcast_silenced`. Raising the mast to reach every receiver in the Reach is what D needs.
- **Investigation**: the relay's power runs on (`mast_powered`). The band is narrow by design (`relay_log_read`): the city
  speaks to Dry Wells, not to people. The aerial's top section is down in the gully.
- **Turn**: a mast that reaches everyone makes the Hollow's hill the most valuable place in the basin. The Ledger, the
  guild and the Concern will all come for it, and the Hollow want a price for standing on a target.
- **Routes**: X (Science 50; −10 `relay_log_read`) · C (`ch_neural_link`, or Kes in party, no check) · B (a pre-Scald board:
  `j_controller`, `j_tm_controller` or the Ashlands' [B5d?] board, plus 60 Tolls to the Hollow for the climb) · T (Speech 45:
  the Hollow keep the mast as theirs; −10 if `broadcast_silenced` ("you shut it up once"), +10 if `broadcast_amplified`
  ("we heard what a loud voice does")) · V (Survival 45 or Reflex 7, the top section re-rigged) · K (`bw_static` = kept: a
  letter from Verity gives the band).
- **Choice**: who keeps the mast (`a3_mast_keeper` = `hollow` | `wheel` | `knock`), or leave it narrow. It sets
  `a3_mast` = `raised`, `a3_mast_how`.

**19c — the last ride** (keystone 3: VEY, ADA — RESIGNS; SHALE CONTRACTED). Hook: Pike's notice on the sheriff's office
door: SHALE — CONTRACT OF PROTECTION — ON THE SHERIFF'S RESIGNATION. Mags's hand is in it: she brokered the buyout for her
own debt (`l_mags_buyout` exists). The ride itself is Ada riding out to Pike's post to sign. The buyout "comes due" on a
story milestone: the first time the player is in Shale with `a3_open`. Routes:
- **T** Ada stays (Speech 50): −10 `jonah_lived`, −5 `militia_drilled`, −10 `standing shale ≥ 15`, −10 the ledger page shown to
  Ada (`ledger_shown_ada`: Pike paid the outriders), −5 Mags exposed; +10 `shale_broke`.
- **B** pay out the contract (300), or Odile talks Pike down to 150 (she wrote the sheet on Shale). Free if
  `odile_sheet` = torn, because the buyout rests on her sheet's ruin date and it was unwound.
- **K** `odile_sheet` = player: tear it at Pike's counter. Or `th_page_taken`: the Tollhouse page as leverage over Pike.
- **S** take the deed from Pike's safe at night (Security 50).
- **F** Pike's guild hands come to take possession. The militia fight them with the player. Ada dies (`ks_ada` = dead)
  only if the militia was never drilled and Jonah is dead, the conditions and not chance.
- **Let it happen**: Ada resigns, Shale contracted (the forecast).

Outcomes: `ks_ada` = `stays` | `resigns` | `dead`, and `a3_shale` = `free` | `company` | `dogs` | `abandoned`. `dogs` applies
when Ada is gone and `rd_coup` and the Dogs ride in. `abandoned` applies when `shale_withers` and Ada is gone.

**20a — Knock under the column.** Knock has been dry since the lockdown. If `dw_outcome` is restored | freed, Dry Wells'
carts bring water; otherwise Corin rations the windpump's well. The column is camped on the toll road by the stand: tents,
a relocation car (a prop stand-in), and four wardens who are polite. Lowe (`d_a3_lowe`) has the clause: he will not move
on the door until the designate attends. He grieves every eviction ("The schedule holds. I wish it didn't, here."), and his
`trust` and his Act 2 memories decide how he can be stood down (20e). Knock's people, Act 3 instances with new trees:
- **Maud** (`d_a3_maud`), lame if `kn_maud_scarred`, at the hatch she can't open. She tells the PC the hatch has gone
  quiet four times now. Her secret (a Cistern letter sold for medicine) is said here at last if `trust ≥ 20`.
- **Corin** (`d_a3_corin`) on the slope with the rifle. "Act 3 holds the slope."
- **Dace** (`d_a3_dace`): the guild's guide if the guild is in play, else at Knock.
- **Linnet** (`d_a3_linnet`), by her fate: `kn_linnet_will_run` → in the column as a Precinct ward-cadet (the people the PC
  grew up with are on both sides of the door); `kn_linnet_to_shale` → with the Dogs if they were called, else at Mags's;
  `kn_linnet_stays` → beside Maud.

The Grille in lockdown (`d_a3_grille`): MOTHER says the PC's name for the first time, not "Knock". Ines's voice refuses
the door a third time and offers the hatch.

**The forces by alliance.** The Unwritten are present at night in every playthrough; Petra leads them, or `npc_a3_u1` if
Petra is dead. That keeps B's Act 3 key always open. The guild is present when `a3_guild_in` = `LN('guild')` ∨ `C_BUYER_B4B`
∨ `rc_line` = guild ∨ `nw_controllers` = guild. Then Orme carries a buyer's paper (the reserve's relocation as a labour
contract, Concern intake paper: the Weighhouse). Hale rides with her if he is alive (`not dead npc_kn_out_lead`), and Corin
and Hale have the post-house to settle: Maud decides, and Hale answers or leaves. Hounds on leads come when
`a3_hounds_in` = `a3_guild_in` ∧ (`nw_controllers` = guild ∨ `LN('guild')` ∨ `HOUNDS_CONCERN`).

**20b — burn the count** (`q_a3_unwritten`). Hook: chalk on the Cistern's apron at dawn, an open eye struck through.
Petra (`d_a3_petra`) at night: a reserve is the Plan's seed and MOTHER is a city machine, so they will burn the Archive and
MOTHER's panel, and nobody in there will ever be counted again. Turn: MOTHER also runs the Cistern's air and water; burning
the count kills sixty people slowly. Choice (`a3_unwritten`):
- **`with_you`**: the core, not the reserve. Speech 50: −15 Ash in party with `ash_orders` = refused, −10 `of_blight_outcome` =
  unwritten, −10 `sky_rite`, −5 `door_watch` (Larkspur), +10 `ar_verdict` = agreed. They come to the Spire: B's means and
  D's people.
- **`gone`**: home, talked down (Speech 40).
- **`stopped`**: the burning party stopped at the apron at night (Stealth 45 to take the lamp, or a fight).
- **`burning`**: let them. MOTHER's panel and the Archive burn at the next two o'clock the player is at Knock;
  `a3_mother` = `burned`, `a3_archive` = `burned`. The residents live on emergency stores. It is the worst for Tamsin and Bram.

Ash and Tamsin's Act 3 exchange (home vs sky, U8 Tamsin §6) fires at the first camp at Knock (B6o).

**20c — inside, for the first time.** The PC has never seen inside, and the residents have never seen Knock's faces. The
ways in (`a3_in_how`):
- **hatch**: MOTHER holds the tray lift. Speech 40: −15 `kn_hatch_haggled` (MOTHER logged it as diligence), −10
  `kn_mother_opened`, −10 MOTHER's slip read back at the Grille. Or Science 45 at the hatch panel.
- **shaft**: free for `pump_hand`, else Mechanics 45 or Survival 40.
- **door**: the great door's manual cycle (Mechanics 50). It opens the door for everyone: the scene warns, and the column
  walks in behind (20e starts at once, as `forced` unless the player stops Lowe).
- **tamsin**: her override phrase (Tamsin in party), no check.
- **bram**: Bram unbolts the inner door from inside if the letter came back (`q_a1_bram` done).

The faces scene (`d_a3_faces`) is the theme in one room: the residents look at a face from Knock for the first time, and
the PC at theirs. If Tamsin never came out (`c9_tamsin_inside` ∧ ¬`tam_out`), her "Faces" join scene (U8 Tamsin §3 J) plays
here, inside. MOTHER at her panel (`d_a3_mother`):
- She has kept something addressed to the PC for eleven years: the Ledger's first letter to its designate, sent in R16
  when the toll card scored the PC at fourteen. It reads TO THE DESIGNATE, RESERVE 9 (THE MOUTH). YOU WILL BE ASKED.
  AGREE WHEN YOU ARE. MOTHER's ink on the envelope: WITHHELD — ADDRESSED TO A TITLE, NOT A RESIDENT. Item
  `k_a3_first_letter`, flag `a3_letter_read`. She kept the PC, as she kept Tamsin.
- She asks once: "Should I open the door?"

The Archive (`d_a3_archive`): Ines opens it or seals it, giving `a3_archive` = `open` | `sealed`. She opens it with no
check if `a3_archive_promise` and `k_ar_refusals` is held. Otherwise Speech 50: −10 `c9_told_city`, −10 `tam_secret` = ines,
−5 `c9_knows_shale`, −10 the PC's face (the faces scene seen), +10 `kn_ines_refused` and the PC never wrote.

**20d — the ring** (`d_a3_council`): Ines, Teague, Pell, Bram and the four residents.
- **Tamsin's card** (`a3_tam_card`; Tamsin present, `tam_secret` = kept | mother): she tells the ring she was hidden.
  MOTHER defied the city to keep her, and the room turns toward MOTHER. If Ines was not prepared (no Archive promise,
  `tam_secret` ≠ ines), Ines falls ("Breaks: the residents learning from someone else"): `a3_ines` = `falls`, and Teague
  leads, which means she wants the door welded.
- **Pell's certificate** (`a3_pell`): FIT FOR RELOCATION on sixty forms. He will certify the reserve unfit ("and lies if
  asked": Speech 40, no check for `clinic_aide`). The order lapses, because the Plan relocates only the fit. The Ledger
  then strikes Reserve 9 from the record (`a3_c9_how` = `struck`), and the Act 2 precedent decides what that means:
  - `prec_unrecorded` = yields: recorded as living people outside any reserve. Free, and the Court will hear them.
  - `outside`, or unset: free, and no court protects them.
  - `property`: unrecorded people are abandoned property, so if the guild is in play Orme claims them on the spot. This is
    the trap, and Tamsin says "That's what it did to me."
- **Bram** (`a3_bram_cut`): he knows how a caretaker is put to sleep and won't do it. He tells the PC how the Ledger's core
  is fed the same way (couriers and one power trunk), which is B's Mechanics route. If the ring votes to stop MOTHER
  opening for the city, he can cut her power (`a3_mother` = `asleep`). He does it only if Ines has fallen and Teague orders
  it, and the PC can stop him.
- **The vote** (`a3_ring` = `sealed` | `open` | `city`) reads `a3_ines` and what the residents now know: the order, the
  refusals, the faces, Tamsin's card.

**20e — the door** (`d_a3_door`, at the apron, with Lowe). The resolution sets `a3_c9` and `a3_c9_how`:
- **sealed / lowe** (T): Lowe stands down. Speech 60: −30 `ca_reserve` ∈ {stayed, attendance}, −10 `k_ar_refusals`, −5 the
  census, −10 Nine in party with `nine_stance` = conscience (it reads the order aloud and logs it as an error), −10 `trust
  npc_md_01 ≥ 25`, −5 `jonah_lived`, −10 `k_ar_warrant` (the designate's warrant), +15 `ca_reserve` = upheld, +10 `a3_route_home`
  = column. With `prec_reserve` = attendance there is no check: the designate formally declines to attend.
- **sealed / welded** (X): Bram and Teague weld the door from inside with the PC (Mechanics 40). MOTHER's water and air hold,
  and the column cannot open it without killing sixty, which Lowe will not do. Needs `a3_inside`.
- **sealed / struck** (M): Pell's certificate, as above.
- **sealed / fought** (F): the column broken. Combat at the apron with the called allies and Corin (`a3_door_fight`).
  `a3_lowe` = `dead` or `yielded` (Lowe yields when his wardens are down to two).
- **opened / ines**: any of the four sealed routes, then the ring's vote `open`. The residents walk out by choice. Some go
  to the city of their own will (the Plan wanted them, and a few want its hospitals), some stay in Knock, some go with the
  Wheel. Needs the column gone, stood down or stayed.
- **relocated / sold** (B): accept Orme's paper (guild in play). The reserve goes east as labour. This trips Wren's red
  line (selling people), and Tamsin's, Ash's and Kes's worst.
- **relocated / order**: the designate's word, "carry on, Captain", or the PC attends and signs. Tamsin's red line
  (U8 Tamsin §8): she leaves the party at once and stands in the door.
- **relocated / forced**: the order carried out over a door someone stands in. Tamsin dies there (`a3_tamsin_dead`) **only
  if** she stands in the door and the player lets the column force it. The conditions decide, not proximity (AUDIT
  watch-list). The column never forces the door on its own: it waits for the designate's attendance.

Nine's break (U8 Nine §4): if Tamsin stands in the door and the column moves, Lowe orders the city unit to take the
undocumented person.
- With the deed naming the player, the player gives the order. Nine refuses for the first and only time and leaves for
  good.
- With the deed naming the city, a conscience Nine refuses and is struck off: the wardens turn on it, and it dies there
  (`a3_nine_struck`) unless the player stands with it (Speech 45 to Lowe, or the fight).
- A deputy Nine asks the player to be told to refuse, and the player's word decides.

MOTHER's state after the door (`a3_mother`): `kept` (sealed) · `knock` (the reserve opened or left: MOTHER opens the hatch to
Knock every day, and to the PC's people the door) · `asleep` (Bram) · `burned` (the Unwritten). The lockdown ends with
any of these.

**20f — the platform** (only after `a3_c9_how` ∈ {order, forced}). The reserve arrives at Carrick's buffer in the wardens'
car. Routes: T (the Harbour court at six: Schedule 2 has no persons, so a person landed on the quay is a passenger. No
check with `dk_prec_passenger`, else Speech 45 with Dahl) · F (the Stand blacks the car if `a3_ally_stand`: no hands to
open it until the wardens stand back) · S (the cradle to the Hulls at night while `dk_cradle` runs). It sets
`a3_c9_after` = `walked` (free in Meridian) or `held`.

**21a — the close.** World event `a3_summons` is armed by `a3_c9`. At the next seven o'clock anywhere, `{ post }` brings
the Ledger's card (`k_a3_summons`): THE DESIGNATE WILL ATTEND THE STEPS. It starts stage `close`. All living, not-gone
companions gather at the close; the waiting ones are placed there. Placements and services, §3 and B6l–B6m.

---------------------------------------------------------------------------------------------------------------------
## 3. The point of no return, and how a save before it reaches every ending

**The PNR** is the foot of the Spire's steps in Act 3. `d_ar_steps` gains an Act 3 start entry → `d_a3_pnr`.
1. The node lists **what you hold** (`q_a3_hold`'s objectives, in-world words, nothing about outcomes):
   - the sash (always);
   - someone who would buy what is under the Spire (`C_BUYER`);
   - something that would bring the vault down (`B_MEANS`);
   - a voice that reaches every radio (`D_VOICE`), someone who can read the record aloud (`D_READER`), people to carry it
     (`D_PEOPLE`), and what the Cistern kept (`D_ARCHIVE`);
   - a file the Ledger has written CONTESTED or AGREED on (`E_FILE`), two precedents in the register that are yours
     (`E_PREC`), and the register in the Court's keeping (`E_REG`).
2. The player chooses "(Go up.)" or "(Not yet.)". Going up warns once, plainly: once you go up, the story ends here, and
   whatever is left undone in the Reach will be told as it stands.
3. Confirming applies `{ event: 'save', data: { slot: 'steps', label: 'Before the steps' } }`, then `{ set: 'a3_pnr' }`,
   then `{ event: 'goto' }` to the steps' spot. After it there is no free roam: steps → vault → end → epilogue → credits →
   title. The "steps" save stays, so another ending can be played from it.

**The Act 3 guarantee** (tested, B6w): **no choice in Acts 1–2 locks an ending out.** Act 1–2 choices change the cost, the
route and the alternates, never the possibility. Every key in every ending's gate has at least one Act 3 alternate that
can be completed before the PNR, whatever happened earlier:

| Key | Act 3 alternate that is always open |
|---|---|
| A (the sash) | always offered on the steps, whatever `ar_verdict` was |
| `B_MEANS` | the Unwritten at Knock are always there to turn (`a3_unwritten` = with_you) · the charge made at the close (`k_a3_charge`: `k_hs_powder`, or Sallow Jack's or Ida's powder bought, plus Explosives 40 or a hand who has it) · Bram's route (`a3_bram_cut` + Mechanics 50) |
| `C_BUYER` | the Concern's officer at the close always makes the offer (`a3_concern_terms`), with worse terms if `hs_marked` ∧ `hs_gate_shut`. Refused once, it can be asked again at Ninebridge from Sarr if she is alive |
| `D_VOICE` | `q_a3_mast` (six routes) |
| `D_READER` | Science 65 at the Vault's reading desk (trainable) · `archive_clerk` · Nine · Seventeen · Verity |
| `D_PEOPLE` | the Unwritten turned · the Choir, the Wheel or Knock (by letter or standing) |
| `D_ARCHIVE` | the Archive opened at the council · or the copies (`k_ar_refusals` and `tam_why`) · or the reserve opened |
| `E_FILE` | the second hearing on the steps (`a3_file`) |
| `E_PREC` | the Act 3 cases `reserve` (consent or attendance) and `recall` (kept) are each a precedent; with Calla held [B5d?], case `calla` is a third |
| `E_REG` | Marwood sells the register back (`a3_register_back`: 200 Tolls, or Speech 50 with Comfort's word) |

The PNR save is therefore always a "save before the point of no return" from which each ending whose keys are held can be
taken. A player who wants another ending can load the last save before the close and complete that ending's alternates.

---------------------------------------------------------------------------------------------------------------------
## 4. The endings

### 4.1 Gates (exact, in `a3_conds.ts`; companions by id: TAMSIN `npc_c9_03`, WREN `npc_rd_03`, ILYA `npc_sh_17`, ODILE `npc_nb_03`, ASH `npc_of_03`, NINE `npc_md_nine`, KES `npc_hs_01`)
```
SASH_WORN  = { flag: 'a3_sash', eq: 'worn' }
AT_VAULT   = { all: [{ flag: 'a3_pnr' }, { flag: 'a3_sash' }] }          // the steps are done; the vault is open either way

// A — The Plan: always available at the vault.
A          = AT_VAULT        // option 'vault.plan': worn → A1 "sign what must be signed"; refused → A2 "walk out"

// B — Unwritten: the forecasting core destroyed.
B_MEANS    = { any: [
               { flag: 'a3_unwritten', eq: 'with_you' },
               LN('choir'),                                                        // [B5d?]
               { all: [{ inParty: ASH }, { flag: 'ash_orders', eq: 'refused' }] },
               { item: 'k_a3_charge' },
               { all: [{ flag: 'a3_bram_cut' }, { skill: 'mechanics', gte: 50 }] } ] }
B          = { all: [AT_VAULT, B_MEANS] }

// C — The Concern: the core signed over to Halcyon through the guild (the Board wanted the Magistrate's signature on a transfer the Ledger cannot void).
C_BUYER    = { any: [
               { flag: 'hc_offer', eq: 'accepted' }, { flag: 'hc_offer', eq: 'feigned' },   // [B4B]
               LN('guild'),                                                                // [B5d?]
               { flag: 'a3_concern_terms', eq: 'accepted' } ] }
C          = { all: [AT_VAULT, SASH_WORN, C_BUYER, { item: 'k_a3_transfer' }] }   // the paper comes with any buyer

// D — Open Sky: every forecast broadcast to everyone through the relay chain to Signal Hill.
D_VOICE    = { flag: 'a3_mast', eq: 'raised' }
D_READER   = { any: [
               { all: [{ inParty: NINE }, { any: [{ flag: 'nine_stance', eq: 'conscience' }, { flag: 'nine_log_given' }] }] },
               { all: [{ flag: 'a3_ally_seventeen' }, { flag: 'nw_dam', eq: 'truth' }] },
               { all: [{ flag: 'a3_ally_saints' }, { flag: 'bw_static', eq: 'kept' }] },
               { origin: 'archive_clerk' },
               { skill: 'science', gte: 65 } ] }
D_PEOPLE   = { any: [
               LN('choir'), { member: 'choir', rank: 'sibling' }, { standing: { settlement: 'openfield', gte: 20 } },
               { flag: 'a3_unwritten', eq: 'with_you' }, CALLA_FREE /* [B5d?] */, { flag: 'a3_ally_choir' },
               { flag: 'a3_ally_wheel' }, { all: [{ flag: 'a3_c9', eq: 'opened' }, { standing: { settlement: 'cistern9', gte: 20 } }] } ] }
D_ARCHIVE  = { any: [ { flag: 'a3_archive', eq: 'open' }, { flag: 'a3_c9', eq: 'opened' },
               { all: [{ item: 'k_ar_refusals' }, { flag: 'tam_why' }] } ] }
D          = { all: [AT_VAULT, D_VOICE, D_READER, D_PEOPLE, D_ARCHIVE] }

// E — Magistrate's Amendment: the sash taken, the law rewritten from inside, in the Court's own register.
E_FILE     = { any: [{ flag: 'ar_verdict', eq: 'contested' }, { flag: 'ar_verdict', eq: 'agreed' }, { flag: 'a3_file', eq: 'contested' }] }
E_PREC     = { flag: 'ca_precedents', gte: 2 }
E_REG      = { any: [{ not: { flag: 'prec_register', eq: 'catalogued' } }, { flag: 'a3_register_back' }] }
E          = { all: [AT_VAULT, SASH_WORN, E_FILE, E_PREC, E_REG] }
```
The vault's choice (`d_a3_vault`, final node) offers all five with `showLocked`. A locked option's text says what is
missing in in-world words. Choosing sets `a3_end` = `plan` | `unwritten` | `concern` | `opensky` | `amendment`, plus a
`decision`. The steps set `a3_sash`; for A this gives A1 (worn) or A2 (refused).

**What the sash changes in the vault**:
- **Refused**: A2, B or D (as a private person).
- **Worn**: A1, B ("the first and last act of the chair"), C, D (published by the Magistrate) or E.

### 4.2 What each ending costs (no dominant path)
| End | What it buys | What it costs | Who leaves over it |
|---|---|---|---|
| **A1 the Plan, worn** | the basin ordered; the Precinct's water, clinics and law spread on schedule; the player in the chair at ~25 | freedom curtailed; every keystone fate still open is fulfilled on schedule (Wren's rope if never met, Calla, Vasha's executions, Sarr as Treasurer); a sealed or opened reserve is relocated by the chair's first signed act unless `ca_reserve` stayed it | Tamsin (if the reserve is relocated), Ilya, Kes's romance; Ash's orders fall due |
| **A2 the Plan, refused** | the player walks home free | the Plan reroutes: the lens finds another face on the steps; the Cistern's order goes on unless stayed, struck or opened | nobody; Nine is uneasy if conscience |
| **B the core destroyed** | no forecasts, ever; Reserve 9 never ordered again; the Unwritten's sky | the Precinct's drains, pumps and clinics fail within a year; the Sink drowns unless the Pale hold its pumps (`sk_pumps` = seized); Meridian's order breaks into the houses' and the gangs' war; the Concern is left with no counterweight unless Halcyon is opened or burned | Nine (red line: it withdraws at the core's door), Lowe broken |
| **C the Concern** | a corporate future that works on time: contracts, clinics, the Line, the gardens; the player at the Board's table, rich | the Leash spreads with the core; the hounds wake; Spare Parts goes on; the Long-Lived endure; Sarr is Treasurer of the Concern's world | Wren (red line), Kes (break), Ash, Tamsin; Odile stays ("that is a cost") |
| **D Open Sky** | forecasts lose their power once everyone has read them; the futures market and the Concern's prize are worthless; the Ledger survives without secrets (water and clinics go on) | deaths and betrayals published at once cause violence, priced by readiness (M7): held / hard / burning; the keystones' lines are public; people who read their own deaths; the player is the most hated and loved face in the Reach | nobody by red line; some approvals fall by price |
| **E the Amendment** | the Plan kept and changed by its own law: up to three clauses from the player's precedents | the player becomes the forecast by choice, Magistrate for life; the Plan's other costs stay (e.g. the Sink's diversion unless the Wet's truth relieved it); the Unwritten's sky is owed (Ash's orders) | depends on the clauses chosen (§7) |

**Amendment clauses** (E; the chair amends three clauses in its first season; choose 1–3 from those whose precedent the
player holds; each sets `a3_amend_<id>`):
- `fines`: a forecast is not an act. Needs `prec_forecast_fine` = void.
- `living`: the record yields to the living. Needs `prec_unrecorded` = yields.
- `keeper`: a unit may be its own keeper. Needs `prec_unit_keeper` = self, or `prec_recall` = keeper.
- `refuse`: a scheduled benefit may be refused. Needs `prec_refuse_benefit`.
- `reserve`: a reserve is kept by its own consent. Needs `prec_reserve`.
- `passenger`: a person is a passenger, never cargo. Needs `dk_prec_passenger`.
- `speech`: speech is not sedition. Needs `prec_sedition`, case `calla` [B5d?].

Without `reserve`, a sealed or opened reserve is relocated by the Magistrate's own order: the cost of the chair.

### 4.3 The climaxes (B6r)
- **A1**: the order signed at the core's desk; Lowe salutes; Nine beside the chair (deputy) or reading every line aloud
  first (conscience).
- **A2**: walk out. On the steps the lens is already turned to a face in the crowd.
- **B**: the charge set (or Bram's trunk cut). The Ledger's last words are a clause, not a plea. Nine stands at the
  core's door, says the record's one plea (U8 Nine §4) and withdraws. The wardens come down: fight in `md_vault`, or out
  by the couriers' drop (Stealth 45), or Lowe lets the party pass if `a3_lowe` = stood_down ∧ trust ≥ 25. The lights go out
  across the city.
- **C**: the transfer signed. The guild's sealed crates go to the Line. The Unwritten's attempt on the courier (if Petra
  is not with the player) is a fight on the close, or Ash's (if `ash_orders` = undecided). Wren and Kes leave at the vault.
- **D**: the reader reads the clauses into the record and the relay carries it out. MOTHER's archive goes first (what a
  reserve was for), then the twelve, then everyone's. The escort out of the Spire through the city's first night is a
  fight at `burning`, a tense walk at `hard`, and quiet at `held`. The Ledger says one line: then everyone will have to
  plan.
- **E**: Three brings the register down. The player writes the clauses. The Ledger: "Agreed." Nine reads them back.

Every climax ends with `{ event: 'dialogue', data: { id: 'd_a3_epilogue' } }`.

---------------------------------------------------------------------------------------------------------------------
## 5. Modifiers (selectors in `a3_conds.ts`, ordered, first match wins; evaluated at the epilogue)
```
M1 LEASH    cut     ← { flag: 'hc_leash', eq: 'cut' }                                        [B4B]
            yours   ← { flag: 'hc_leash', eq: 'seized' }                                     [B4B]
            sold    ← { flag: 'hc_leash', eq: 'sold' }                                       [B4B]
            spread  ← { flag: 'a3_end', eq: 'concern' }      // the core and the leash in one hand
            theirs  ← default                                   // incl. no B4b, hc_leash = left

M2 SINK     lost    ← { all: [{ flag: 'a3_end', eq: 'unwritten' }, { not: { flag: 'sk_pumps', eq: 'seized' } }] }   // the Ledger's pumps die with it
            held    ← { all: [{ flag: 'a3_end', eq: 'unwritten' }, { flag: 'sk_pumps', eq: 'seized' }] }           // the Pale pump by hand
            saved   ← { flag: 'sk_saved' }
            relieved← { all: [{ flag: 'sk_flooded' }, { flag: 'nw_sink_relief' }] }    // drowned once; the dam's truth keeps the next spring off
            flooded ← { flag: 'sk_flooded' }

M3 HALCYON  opened  ← { flag: 'hc_longlived', eq: 'exposed' }                                [B4B]
            burned  ← { all: [{ any: [{ flag: 'hs_shift', eq: 'won' }, { flag: 'hs_shift', eq: 'revolt' }] }, { flag: 'ks_maren', eq: 'lives' },
                              { any: [{ flag: 'hc_leash', eq: 'cut' } /*[B4B]*/, M5 = yours] }, { not: { flag: 'a3_end', eq: 'concern' } }] }
            risen   ← { flag: 'a3_end', eq: 'concern' }
            reformed← { flag: 'hc_longlived', eq: 'soto' }                                   [B4B]
            stands  ← default

M4 CISTERN  opened    ← { flag: 'a3_c9', eq: 'opened' }
            walked    ← { all: [{ flag: 'a3_c9', eq: 'relocated' }, { flag: 'a3_c9_after', eq: 'walked' }] }
            sold      ← { flag: 'a3_c9_how', eq: 'sold' }
            relocated ← { any: [{ flag: 'a3_c9', eq: 'relocated' },
                                { all: [{ flag: 'a3_c9', eq: 'sealed' }, SASH_WORN, { any: [{ flag: 'a3_end', eq: 'plan' }, { flag: 'a3_end', eq: 'concern' },
                                        { all: [{ flag: 'a3_end', eq: 'amendment' }, { not: { flag: 'a3_amend_reserve' } }] }] },
                                        { not: { flag: 'ca_reserve', eq: 'stayed' } }] }] }      // signed as the chair's first act
            struck    ← { flag: 'a3_c9_how', eq: 'struck' }      // with text by prec_unrecorded (yields / outside / property)
            sealed    ← default
            × MOTHER (a3_mother: kept | knock | asleep | burned) is a line inside every Cistern variant.

M5 HOUNDS   yours   ← HOUNDS_PLAYER                                                          [B5d?]
            woken   ← { any: [{ flag: 'a3_end', eq: 'concern' }, HOUNDS_CONCERN /*[B5d?]*/, { flag: 'a3_hounds_in' }] }
            dormant ← default
            (local echoes read in their own slides: Shale's hound `hound_outcome`, the Ring's tower hound, Four's digger `tm_digger_concern`)

M6 SASH     amended ← { flag: 'a3_end', eq: 'amendment' }
            worn    ← SASH_WORN
            refused ← default

M7 SKY (D only)  held    ← { flag: 'a3_ready', gte: 5 }
                 hard    ← { flag: 'a3_ready', gte: 2 }
                 burning ← default
    a3_ready is a counter. Each act adds 1, once, from the readiness hub at the close (`d_a3_ready`; option guarded by
    `a3_ready_<k>`):
      choir:  the Choir keep vigil (`a3_ally_choir`)
      stand:  Carrick's dockers keep the quays (`a3_ally_stand`)
      gangs:  the chain's holders keep their streets (`a3_ally_gangs`)
      wheel:  the Wheel carry word ahead (`a3_ally_wheel`)
      lowe:   the wardens keep order without the schedule (`a3_lowe` = stood_down)
      saints: the Saints read the night's lines gently first (`a3_ally_saints`)
      nine:   the record reads its own errors first (`nine_log_given` ∨ `nine_stance` = conscience)
      warned: the living keystones warned by the player's own letters, three or more (`a3_warned` ≥ 3)

M8 CLAUSES (E only)  a3_amend_* as chosen (§4.2).

M9 STANDING (every place slide)  a line by band: loved ≥ 25 · liked ≥ 10 · hated ≤ −15 · else none, on the slide's own
   settlement (`standing: { settlement }`). This is local reputation, not karma.
```
**The twelve** are not a modifier. Each keystone's outcome is a line in its own slide (§6). Under A1 and C, a keystone
still open at the end is fulfilled on schedule. Under B, D and E it is not; under E, only those its clauses cover.

---------------------------------------------------------------------------------------------------------------------
## 6. The epilogue

### 6.1 Mechanism (content-only; one runtime event)
The epilogue is one narrator tree, `d_a3_epilogue` in `dialogue/a3_epilogue.ts`, built by `epilogueTree(slides)` (B6s)
in the way `courtCase()` builds the Court:
- A **slide** is `{ id, applies?: Cond, variants: { id, if?: Cond, place, spot, people: { npc, if?: Cond }[], pc?: { years:
  number, with?: string }, light?: 'dawn'|'day'|'dusk'|'night', weather?: string, text: Text }[] }`. The last variant has no
  `if`: every slide has a default.
- The builder makes one node per variant (`<slide>_<variant>`). It routes each "(Next.)" option to the first applicable
  variant of the next applicable slide, as options gated by `if` (the runner already filters by `if`).
- Each variant node's effects are `{ event: 'slide', data: { place, spot, people, pc, light, weather } }` and `{ set:
  'ep_<slide>', value: '<variant>' }`. The second is for tests and for a later "the record" replay menu.
- The tree starts on `{ flag: 'a3_end' }` and ends with `{ event: 'credits' }` → title.

Text is written in B6s–B6v, not here. A slide's text is one page (60–110 words). Keystone lines and modifier lines are
text variants inside the variant (ordered `if` list). People in a slide stand in their end state (alive, scarred, aged by
`years`). The PC's own face is aged by `pc.years` with the portrait pipeline.

### 6.2 Slides (order is the play order; subject · place/spot · people · what chooses the text)
| # | Slide `ep_*` | Subject | Place / spot | People | Chosen by |
|---|---|---|---|---|---|
| 1 | `steps` | the photograph's steps, now | `md_spire` / `steps_sit` (photo-mode still) | PC (age now), companions in party, Three | `a3_end` × M6 |
| 2 | `ledger` | the core and the twelve | `md_vault` / `core` | Nine if it read (D) or sits by the chair (A1/E) | `a3_end`; one line per keystone (Jonah `jonah_lived`, Ada `ks_ada`, Kessler `rd_coup`/dead, Vasha `vasha_fate`/`vasha_dead`, Wren `wren_rope`/`bw_raid`, Calla [B5d?], Mason [B5d?], Sarr `SARR_FATE`, Ocho `ks_ocho`/`sk_saved`, Vane `ks_vane`, Maren `ks_maren`), fulfilled-on-schedule lines under A1/C |
| 3 | `cistern` | Reserve 9 and MOTHER | `c9_mouth` / `maud_hatch` (opened: `cistern9` / `council`) | Ines or Teague (`a3_ines` = falls), Pell, Bram, Ola, Wes, Sayer, Effie | M4 × `a3_mother` × `prec_unrecorded` (struck) × `a3_end` (B: no order ever again; D: the reserve's orders were the first page) |
| 4 | `knock` | Knock | `c9_mouth` / `maud_post` | Maud (lame if `kn_maud_scarred`), Linnet, Dace, Corin | `a3_maud`, `a3_linnet`, `a3_dace`, `a3_corin`, `a3_hale`, `kn_posthouse_burned` (rebuilt or not), `a3_mother` = knock (the hatch daily), M9 cistern9 |
| 5 | `shale` | Shale | `shale` / the square | Ada (unless dead), Jonah (if lived), Mags, Teo, Issa, the hound | `a3_shale` × `ks_ada` × `jonah_lived` × `dw_outcome` × `hound_outcome` × M9 shale |
| 6 | `dogs` | the overpass | `overpass` | Kessler (if alive), Vasha (if alive), Brindle, Perpetua | `rd_coup`, `wren_exodus`, `bw_dogs_hold`, `vasha_fate`; A1/C: Vasha the Plan's executioner if alive and not `spared_why` |
| 7 | `guild` | the Tollmen and Ninebridge | `ninebridge` / the Exchange floor | Sarr (if alive), Fen, Pike | `a3_end` (C: the Concern's bank; D: futures worthless, the floor's archive read in the street; B: nothing to trade; A/E: tolls on schedule / audited), `SARR_FATE`, `odile_price`, `nb_archive_burned`, `rc_line` |
| 8 | `choir` | Openfield and the Choir | `openfield` / the fields | Mason (if alive), Petra, Calla (if free), Doria | `MASON_BURNED`, `CALLA_*`, `a3_unwritten`, `of_blight_outcome`, `of_seed_outcome`, `hc_garden` [B4B]; B: the Unwritten's sky; D: the sky open |
| 9 | `precinct` | the Precinct and the Court | `md_spire` / court hall | Lowe (or Reyes), Three, Comfort | `a3_end` (B: drains and clinics fail within the year; D: the record on the Wall; A1: the chair's orders; E: the clauses read at the bench), `a3_lowe`, `ca_squatter`, `a3_amend_*`, M9 meridian |
| 10 | `sink` | the Sink | `md_sink` / the clinic stair | Ocho (if alive) or Anju, Dagny, Mother Null | M2 |
| 11 | `crown` | the Crown and the streets | `md_bridgeward` / the chain | Vane or Ashby-Crane (`cr_chair`), Verity, Kibet, the chain's holder | `ks_vane`, `cr_concern`, `cr_crown_hostile`, `bw_turf`, `bw_static`, `a3_end` |
| 12 | `edges` | the Ring and Carrick | `md_ring` / Clover · `md_docks` / the Stand | Dorota, Bello, Connie, Kobby | `dr_bello`, `dr_leven`, `dk_stand`, `dk_hulls`, `a3_c9_after` = walked (the sixty on the quay) |
| 13 | `skirts` | Halcyon and the Skirts | `hs_skirts` / Footgate | Maren (or the post), Bell, Nils, Kes (if not a companion) | M3 × M1 × `hs_shift` (unset = still out) × `hs_parts` × `hc_clinic`/`hc_funicular` [B4B] |
| 14 | `line` | the Line and its halts | `rc_fourways` / the platform | Brodsky, Halina, Chela (if there) | `rc_line`, `rc_pilot`, `rc_abe`, `rc_stock`, `rc_engine`, `rc_derailed` × `a3_end` (C: the through on every path) |
| 15 | `shore` | Gull Stilts and the Rigs | `ds_stilts` / the Greta | Oona, Lua, Hamid | `ds_claim`, `ds_rig`, `ds_valve`, `ds_fish_back`, `ds_court`, `ds_light` |
| 16 | `teeth` | Number Four | `tm_pit` / the lamp board | Ragna (if stayed), Desmond, Tova | `tm_four`, `tm_ragna`, `tm_digger` (C: a tamed digger answers the Concern) |
| 17 | `wet` | the dam and the river | `nw_dam` / the crest | Hedda, Rhiannon, Berit | `nw_dam`, `nw_dam_strain` (B: no schedule card ever comes; the keepers decide), `nw_river`, `nw_feud`, `nw_run` |
| 18 | `wheel` | the Wheel and the roads | `wheel` | Sefa, Rook | `member wheel`, `a3_mast_keeper` = wheel, `a3_ally_wheel`; D: the Wheel carried the receivers |
| 19 | `ashlands` | the reserve in the valley | `an_*` [B5d?] / Saddleback | the Lieutenant (voice) | M5 × `a3_end` |
| 20 | `tamsin` | Tamsin | by state (§7) | Tamsin (+ PC if together) | §7 |
| 21 | `wren` | Wren | by state | Wren | §7 |
| 22 | `ilya` | Ilya | by state | Ilya | §7 |
| 23 | `odile` | Odile | by state | Odile | §7 |
| 24 | `ash` | Ash | by state | Ash | §7 |
| 25 | `nine` | Nine | by state | Nine | §7 |
| 26 | `kes` | Kes | by state | Kes | §7 |
| 27 | `r49` | **R49**: nineteen years on, the portrait's own date | by ending: A1/C/E the Spire's steps in the sash (the photograph, fulfilled; under E by choice); A2 the steps with someone else in the sash, the PC wherever their life is (`ep_home` below); B the broken steps, the PC at home; D the PC where their people are | PC aged +19 (~44), the romance partner aged with them if together, living companions who stayed near | `a3_end` × M6 × `ep_home` = `knock` (`a3_c9` = opened ∨ M9 cistern9 ≥ 10) \| `shale` (`a3_shale` = free ∧ M9 shale ≥ 10) \| `road` (`member wheel` ∨ `wren_after` = road ∨ `kes_after` = road) \| `city` (the chair) \| `nowhere` (default) × `romance_partner` |

Slides 2–19 are always shown; each has an "unvisited/never met" default, because the world went on without the player.
Companion slides are always shown, including for companions never met, who live their own lives. Slides 1, 2 and 27
differ most by ending. The rest differ by the player's whole game, so no two endings share a full sequence.

### 6.3 Sequence per ending (what must differ; tests assert these variant ids)
- **A1**: `steps_worn`, `ledger_plan`, `cistern_relocated|…`, …, `r49_chair`.
- **A2**: `steps_refused`, `ledger_rerouted`, …, `r49_elsewhere`.
- **B**: `steps_unwritten`, `ledger_dark`, `precinct_failing`, `sink_lost|held`, …, `r49_broken`.
- **C**: `steps_concern`, `ledger_sold`, `skirts_risen`, `line_through`, `ashlands_woken`, …, `r49_board`.
- **D**: `steps_opensky`, `ledger_open_<held|hard|burning>`, `guild_worthless`, `choir_open`, …, `r49_known`.
- **E**: `steps_amended`, `ledger_agreed`, `precinct_clauses`, …, `r49_chosen`.

---------------------------------------------------------------------------------------------------------------------
## 7. Companions in Act 3: beats, end states, romances
Max two travel (three with Leader). All living, not-gone companions gather at the Spire close (21a). The last scenes are
at the **fire at the close** (`d_a3_fire`, a talk prop at the steps' foot): one scene per companion present (node speaker
= the companion), so no companion's own tree is edited for them. Red lines and breaks that fire inside existing arcs are
wired in their own trees (B6n–B6o list the touches).

| Companion | Act 3 beats | Red line / break in Act 3 | End state flag `a3_<c>_end` and its slide (`ep_<c>`) | Romance end |
|---|---|---|---|---|
| **Tamsin** `npc_c9_03` | the joining inside if she never came out; Ash ↔ Tamsin at Knock; her card at the ring; her pledge (`tam_pledge`) in the door; R3 before the door (U8 §7): "what we'll be after it" | red line: the reserve relocated by force or by order (`a3_c9_how` ∈ {order, forced, sold}) → she leaves and stands in the door; dies only if forced while she stands in it. Break (Act 2) `tam_broken`: won back only by standing with the Cistern (any sealed or opened route) | `deputy` (Shale, with Ada: `a3_shale` = free ∧ `ks_ada` = stays) · `sheriff` (Shale free, Ada gone) · `wheel` (`a3_ally_wheel` ∨ `member wheel`) · `knock` (the first keeper of the open door: `a3_c9` = opened) · `door` (`a3_tamsin_dead`) · `gone` (left, at Mags's) | `tam_romance` = together: **together** under B, D, A2, or E with `a3_amend_living`; **apart and still writing** under A1, C, or E without it. Ended by the lies or the break (U8) |
| **Wren** `npc_rd_03` | if `LN('guild')`: her leaving scene at the first Act 3 fire (U8 "still to wire"); otherwise the night before the steps: the route or the stop (her r3, if not yet) | red line: selling people (`a3_c9_how` = sold → she leaves at once); the Concern ending (`a3_end` = concern → she walks out of the vault; `wren_left` = concern) | `wren_after` (shale \| bridge \| road) if alive and with the player; `hanged` (`wren_hanged`); `rope_late` (alive, `wren_rope` unset, A1/C: hanged in R31 on schedule); `gone_<why>` (`wren_left`) | `wren_rom` = committed: **together** unless C, or A1 with the rope still open ("I'll not sleep beside the rope"); then apart |
| **Ilya** `npc_sh_17` | the night before the steps: sober count, the well (his r3 if not yet); `ilya_left` = spared → he is not at the close | — (his red line and break are Act 2's) | `ilya_after` (shale \| road \| rest); `hunter` (`ilya_left` = spared: he hunts Vasha; the epilogue decides by `ilya_sober_days ≥ 30`: he finds her and walks into the Sallow, or she kills him: `ilya_fate`, the bible's third ending, epilogue only); `drunk` (`ilya_left` = bottle \| floor) | `ilya_rom` = committed: **together** at a well unless A1 or C (the Plan that timed his family's raid: "Right."); E together at approval ≥ 50 |
| **Odile** `npc_nb_03` | the night before the steps: her price kept or not (`odile_price` = sarr is checked against `SARR_FATE` and the ending: C makes Sarr Treasurer, alive; D ruins her, alive; B "Treasurer of nothing") | none new (her red line is the Exchange's archive; D *publishes* it, which she approves: "a sealed sheet made worthless by daylight") | `exchange` (C: back on the floor, uneasy) · `auditor` (E: the chair's auditor of the guild) · `kitchen` (B/D: Ninebridge's soup line on the eighth span) · `shale` (`odile_sheet` = torn: she lives in the town she shorted) · `gone` | none (bible) |
| **Ash** `npc_of_03` | Ash ↔ Tamsin at Knock; the Unwritten (his hard brothers) at Knock, where he mediates if `ash_orders` = refused; **his orders resolve on the steps** if the sash is worn (B6p): refused → he stands between the player and the Unwritten's blade (`a3_ash` = between); warned → he comes to the player's face (`faced`: talk, or he draws: `struck`); undecided → by what the player will sign; other → absent (news of his act on a keystone who embraced their forecast); approval < 20 ∧ `ash_stance` = clean → the order falls on himself (`self`), on the steps, never off-screen | — (Act 2 red line) | `digs` (Openfield, the Gully's graves: `ash_gully_outcome` = spoken) · `between` (scarred, alive) · `unwritten` (with his brothers) · `self` (dead) · `gone` | none (vow); the friendship scene is S4's (built) |
| **Nine** `npc_md_nine` | the recall (18b); reading the order at the door (conscience); the break at the door (ordered to arrest Tamsin); the reader in D | red line: B (it withdraws at the core's door); break: §2.3 20e | `assessor` (A1/E, deputy) · `conscience` (A1/E, conscience: reads every order aloud) · `reader` (D) · `withdrawn` (B) · `struck` (`a3_nine_struck`) · `disposed` (`a3_recall` = taken / handed) · `gone` (`nine_gone`); × `nine_deed` (self \| player \| city) | none |
| **Kes** `npc_hs_01` | at Knock: if the guild or the Concern is in play and `kes_link` = kept, the Concern numbs her mid-siege (the Leash shown, not told), no lasting harm, `a3_kes_numbed`; the night before the steps: what slack means now; `kes_lineage` = speak lets her tell the Lieutenant [B5d?] to stand down (a route to M5 = yours if B5d allows) | break: C (`a3_end` = concern → she leaves at the vault: "you handed them the eyes; they already had the leash"); red line (B4b): the Leash handed on | `kes_after` (shift \| road \| gardens) · `fits` (`kes_fits`) · `gone` · if M1 = cut [B4B] and `kes_link` = kept or dark: the risk the U8 file names, resolved in the slide | `kes_rom` = committed: **together** unless C; A1 together at approval ≥ 60 (the Ledger cannot see her) |

`romance_partner` holds the one partner (ILYA | KES | TAM | WREN constants, or false). The R49 slide shows the partner
beside the PC, aged, only when the romance end above is **together**.

---------------------------------------------------------------------------------------------------------------------
## 8. Slices (build in this order; about an hour each)
Every slice:
- creates a test file `tests/b6<x>.test.ts` in the `tests/b5c.test.ts` pattern: the `talk()`, `waitFor()`, `conclude()` and
  `at()` helpers, played headless with `DialogueRunner`, `QuestEngine`, `runWorldEvents` and `tryConclude`;
- builds its game states from the shared fixture `tests/a3_fixture.ts` (B6a);
- keeps U7 (`again`, `once`) and gives every critical quest `routes`;
- lists its flags in the Act 3 registry at the end of `a3_conds.ts`, each as a comment line with its values, so the next
  slice can read without guessing.

The default shared files touched by a content slice are the registries: `quests/index.ts`, `dialogue/index.ts`,
`npcs/index.ts` (or the content index), `items/index.ts`, `world/events.ts` (spread), and `world/leads.ts` or a slice
`world/a3_*.ts` spread in. Each slice lists only its other touches.

### B6a — Act 3's spine and the shared conditions — BUILT 2026-11-17 (all of it; deviations under "As built")
- **Create** `world/a3_conds.ts` (§1.1 aliases, §1.2 B4B section, §4.1 gates, §5 selectors, `modValue(g, selector)`, the flag
  registry) · `quests/a3.ts` (every `q_a3_*` with stage skeletons and placeholder journals, `act: 'a3'`, critical ones with
  `routes`: order, return, cistern, spire; side ones: recall, mast, ride, unwritten, platform, hold) · `items/story_a3.ts`
  (`k_a3_order` with `read`, `k_a3_mother_letter`, `k_a3_first_letter`, `k_a3_summons`, `k_a3_transfer`, `k_a3_charge`) ·
  `world/a3_events.ts` (`a3_order` armed by `LN_DONE`; `a3_summons` armed by `a3_c9`; both `at: { hour: 7 }`) ·
  `dialogue/a3_order.ts` with only `d_a3_order_read` · `tests/a3_fixture.ts` (`actThree(preset, over?)` → `{ g, q }` with
  presets `prepared`, `hostile` (Nine gone, Ash gone, verdict refused, register catalogued, no allies, Concern refused, mast
  dead), `choir`, `guild`, `ledger`, `truce`; companions by flag sets; saves through `SaveManager(MemoryBackend)`) ·
  `tests/b6a.test.ts`.
- **Touch** registries only. If `story/B5d_NOTES_SECRET.md` exists: reconcile §1.1 and record the mapping here under "As built".
- **Reads** the §1.1 aliases. **Sets** `a3_open` (on `a3_order`), `a3_order_read`.
- **Tests**: Act 3 never opens before `LN_DONE`, and opens once after it; the order arrives anywhere; every gate is false on
  a fresh state and true on a constructed one; the selectors pick the right value for hand-made states; validation and
  coverage pass with the skeletons.
- **Estimate** 1 h.

### B6b — The fourth order, Nine's recall, Reserve 9 at the Court — BUILT 2026-11-17 (deviations under "As built")
- **Create** the rest of `dialogue/a3_order.ts` (the courier `d_a3_courier`, `d_a3_recall` at the Precinct gate, the
  wardens' scene, the hiding routes at Clover and the cradle) · `npcs/a3.ts` (`npc_a3_01` the courier, `npc_a3_g1/g2` the
  recall wardens; looks per the pipeline).
- **Touch** `dialogue/md_court.ts` (cases `recall` and `reserve` via `courtCase()`, with their `open()` options on the bench)
  · `maps/md_precinct.ts` via `tools/maps/gen_md_precinct.py` (the recall wardens' placement `if: a3_recall_due`).
- **Reads** `nine_deed`, `nine_deed_how`, `ca_deed`, `nine_deed_void`, `nine_log_given`, `nine_stance`, `nine_gone`, `nine_left`,
  `prec_unit_keeper`, `prec_unrecorded`, `prec_refuse_benefit`, `k_ar_refusals`, `tam_why`, `dk_cradle`, `inParty NINE`, `origin`.
- **Sets** `a3_recall` (declined | stayed | handed | court | bought | hidden | fought | taken), `nine_disposed`, `ca_recall`,
  `prec_recall`, `ca_reserve` (stayed | attendance | privilege | upheld), `prec_reserve` (consent | attendance), `inc
  ca_precedents` (by courtCase).
- **Tests**: each deed path; each recall route; both cases by each ground, and the failed ground; the precedent counts;
  hidden Nine still placed later; taken Nine never placed.
- **Estimate** 1.25 h.

### B6c — The road home and the muster — BUILT 2026-11-17 (deviations under "As built")
- **Create** `world/a3_letters.ts` (the ten muster letters and `let_ines_refusals`, spread into LETTERS) ·
  `dialogue/a3_road.ts` (the ride home by alliance: the wardens' car scene with Lowe, the guild's first class with Orme, the
  Choir's carts; road encounters `d_re_a3_*`) · `world/a3_roads.ts` (`re_a3_*` encounters in the Sallow and the corridor).
- **Touch** `world/letters.ts` (spread) · `world/encounters.ts` (spread).
- **Reads** `LN(*)`, `rc_line`, `k_rc_pass`, `member *`, `standing *`, `dr_buggy`, every ally's owed flag (§2.3 table),
  `k_ar_refusals`.
- **Sets** `a3_route_home`, `a3_ally_<id>`, `a3_archive_promise`, `a3_at_knock` (on arrival; also by the Knock map trigger
  in B6f).
- **Tests**: each logistics path ends at Knock; each letter is offered only with its need, and its reply sets the ally; the
  Archive promise is reachable in Act 2 and Act 3.
- **Estimate** 1 h.

### B6d — Every dead radio (Signal Hill) — BUILT 2026-11-17 (deviations under "As built")
- **Create** `dialogue/a3_mast.ts` (`d_a3_hollow` for the Hollow at the camp, `d_a3_mast` for the mast and the aerial,
  `d_a3_station` for the voice in Act 3).
- **Touch** `tools/maps/gen_signalhill.py` → `maps/signalhill.ts` (Act 3 placements with `dialogue` overrides on the camp
  NPCs; the aerial section in the gully as a talk prop).
- **Reads** `mast_powered`, `relay_log_read`, `broadcast_amplified`/`silenced`, `bw_static`, `j_controller`, `j_tm_controller`,
  `ch_neural_link`, `inParty KES`, `a3_ally_wheel`, Signal Hill's camp flags (`sg_*`).
- **Sets** `a3_mast` = raised, `a3_mast_how`, `a3_mast_keeper` (hollow | wheel | knock).
- **Tests**: every route; the keeper choice; no route without its requirement.
- **Estimate** 1 h.

### B6e — Sheriff's last ride (Shale) — BUILT 2026-11-17 (deviations under "As built")
- **Create** `dialogue/a3_shale.ts` (`d_a3_ada`, `d_a3_pike`, `d_a3_mags`, the guild's hands at the office, the militia's
  muster) · NPC defs for Pike's two hands (`npc_a3_g7/g8`) in `npcs/a3.ts`.
- **Touch** `tools/maps/gen_shale.py` → `maps/shale.ts` (Act 3 instances `npc_sh_01_a3`, `npc_sh_04_a3`, `npc_sh_03_a3`, the
  hands; the notice prop) · `world/a3_events.ts` (`a3_buyout`: the first hour the player is in Shale with `a3_open`, `where:
  'shale'`).
- **Reads** `jonah_lived`/`jonah_dead`, `shale_broke`, `shale_withers`, `shale_company_town`, `dw_outcome`, `militia_drilled`,
  knowledge `mags_*`, `ledger_shown_ada`, `ledger_sold`, `th_page_taken`, `odile_sheet`, `inParty ODILE`, `rd_coup`,
  `rd_leader`, `vasha_dead`, `wren_exodus`, `standing shale`, `member shale_militia`.
- **Sets** `ks_ada`, `a3_shale`, `a3_pike` (exposed | paid | robbed | put_off | signed), `q_a3_ride` stages.
- **Tests**: each route to each outcome; Ada dies only under the stated conditions; nothing happens until the player is in
  Shale.
- **Estimate** 1 h.

### B6f — Knock under the column — BUILT 2026-11-17 (deviations under "As built")
- **Create** `dialogue/a3_knock.ts` (`d_a3_maud`, `d_a3_corin`, `d_a3_dace`, `d_a3_linnet`, `d_a3_grille`, `d_a3_lowe` at the
  camp, wardens' barks, Knock's others' Act 3 barks) · column NPC defs (`npc_a3_g3..g6`) in `npcs/a3.ts`.
- **Touch** `tools/maps/gen_knock.py` → `maps/c9_mouth.ts`: **all** of Knock's Act 3 placements in this one pass (the column
  and its camp props; Maud, Corin, Dace, Linnet instances; the guild's party (Orme, Hale, two handlers, hounds as
  `hound_dormant` stand-ins until a live hound exists) `if: a3_guild_in`; Petra and two Unwritten `if: a3_open ∧ hour 21–4`;
  the residents at the apron `if: a3_c9 = opened`; Tamsin at the door `if: a3_tam_door`), and the arrival trigger setting
  `a3_at_knock`.
- **Reads** `kn_maud_*`, `kn_linnet_*`, `kn_out_choice`, `dead npc_kn_out_lead`, `dead npc_md_01`, `trust npc_md_01`,
  `dw_outcome`, `a3_route_home`, `standing cistern9`. **Sets** `a3_guild_in`, `a3_hounds_in`, `a3_lowe_heard`, `a3_maud`,
  `a3_corin`, `a3_dace`, `a3_linnet` (column | dogs | shale | knock), `a3_maud_secret`.
- **Tests**: placements by every Linnet fate and by alliance; Lowe or Reyes; Lowe's tree gates; the Grille's lockdown lines.
- **Estimate** 1.25 h.

### B6g — Knock at night: the Unwritten, the guild, Hale — BUILT 2026-11-17 (deviations under "As built")
- **Create** `dialogue/a3_forces.ts` (`d_a3_petra` with the Unwritten's aim and turn, the burning party at the apron;
  `d_a3_orme` with the buyer's paper; `d_a3_hale` with the post-house and Maud's judgement; the handlers) · `npc_a3_u1..u3`
  in `npcs/a3.ts` · world event `a3_burning` (armed by `a3_unwritten` = burning, the next two o'clock at Knock).
- **Reads** `LN(*)`, `ash_orders`, `inParty ASH`, `of_blight_outcome`, `sky_rite`, `origin door_watch`, `ar_verdict`,
  `dead npc_of_02`, `kn_posthouse_burned`, `kn_maud_*`. **Sets** `a3_unwritten` (with_you | gone | stopped | burning),
  `a3_guild` (paper_held | refused), `a3_hale` (answered | gone | dead), `a3_mother` = burned / `a3_archive` = burned (via the
  event).
- **Tests**: each Unwritten choice, and the burning firing only with the player at Knock; Orme's paper only when the guild
  is in play; Hale only if alive.
- **Estimate** 1 h.

### B6h — Inside, for the first time
- **Create** `dialogue/a3_cistern.ts` (`d_a3_way` with the five ways in, `d_a3_faces`, `d_a3_mother`, `d_a3_archive`, `d_a3_ines`,
  `d_a3_pell`, `d_a3_bram`, `d_a3_teague`, the residents' barks).
- **Touch** `tools/maps/gen_ch1.py` → `maps/cistern9.ts` (Act 3 instances `npc_c9_0N_a3` with `dialogue` overrides; Tamsin's
  inside instance `if: c9_tamsin_inside ∧ ¬tam_out`; the panel and Archive talk props; the way in from the hatch and the
  shaft) · `tools/maps/gen_knock.py` only if the hatch tray needs a talk prop (prefer the existing `hatch`).
- **Reads** `kn_hatch_haggled`, `kn_mother_opened`, `origin pump_hand`, `q_a1_bram`, `c9_tamsin_inside`, `tam_out`,
  `a3_archive_promise`, `k_ar_refusals`, `c9_told_city`, `c9_knows_shale`, `tam_secret`, `kn_ines_refused`.
  **Sets** `a3_inside`, `a3_in_how`, `a3_faces`, `a3_letter_read`, `k_a3_first_letter`, `a3_archive` (open | sealed),
  `tam_joined` (the inside join, using U8's own flags).
- **Tests**: each way in (the door's way starting the door scene with the column behind); the inside join; the Archive by
  promise and by check.
- **Estimate** 1 h.

### B6i — The ring
- **Create** `dialogue/a3_ring.ts` (`d_a3_council` with Tamsin's card, Pell's certificate and the three precedent readings,
  Bram's power, the vote).
- **Reads** `tam_secret`, `inParty TAMSIN`, `a3_archive_promise`, `origin clinic_aide`, `prec_unrecorded`, `a3_guild_in`,
  `a3_faces`. **Sets** `a3_tam_card`, `a3_ines` (opens | seals | falls), `a3_pell` (unfit | fit | refused), `a3_bram_cut`,
  `a3_ring` (sealed | open | city), `a3_mother` = asleep (if Bram cuts).
- **Tests**: Ines falls only when unprepared; the certificate read three ways, including the trap with the guild in play;
  Bram cuts only under Teague and can be stopped.
- **Estimate** 1 h.

### B6j — The door
- **Create** `dialogue/a3_door.ts` (`d_a3_door` with every route; Nine's break; Tamsin in the door; the fight's setup with
  hostileIf on the column's placements `if: a3_door_fight`; the outcomes' scenes).
- **Touch** `maps/c9_mouth.ts` via `gen_knock.py` (only the `hostileIf` on the column's placements, if B6f did not add it).
- **Reads** everything 20e lists, plus `a3_ally_shale`, `a3_ally_dogs`, `a3_corin`, `nine_deed`, `nine_stance`, `tam_pledge`,
  `a3_ring`. **Sets** `a3_c9`, `a3_c9_how`, `a3_lowe` (stood_down | yielded | dead | carried), `a3_tam_door`,
  `a3_tamsin_dead`, `a3_nine_struck`, `a3_mother` (kept | knock), `q_a3_cistern` done, `wren_left` = sold (red line) via her
  own tree's existing W_GONE (touch `overpass.ts`: one interjection).
- **Tests**: every route to every outcome; Tamsin's red line on order/forced/sold; her death only when forced while she
  stands in the door; Nine's three break variants; the default never fires unasked.
- **Estimate** 1.25 h.

### B6k — After the door, the summons, the platform
- **Create** `dialogue/a3_after.ts` (Knock's people after, by outcome; MOTHER opening to Knock; `d_a3_platform` at Carrick's
  buffer with the Harbour court, the Stand and the cradle).
- **Touch** `tools/maps/gen_md_docks.py` → `maps/md_docks.ts` (the wardens' car at the buffer and the sixty `if: a3_c9_how ∈
  {order, forced} ∧ ¬a3_c9_after`) · `world/a3_events.ts` (`a3_summons` effects confirmed).
- **Reads** `a3_c9*`, `dk_prec_passenger`, `a3_ally_stand`, `dk_cradle`, `trust npc_dk_01`. **Sets** `a3_c9_after` (walked
  | held), `a3_summoned`, `q_a3_spire` → close.
- **Tests**: the platform only after relocation to the Precinct; each route; the summons arrives anywhere.
- **Estimate** 1 h.

### B6l — The close: who came
- **Create** `dialogue/a3_close.ts` (`d_a3_quill` (or Soto [B4B]) with the Concern's terms and `k_a3_transfer`;
  `d_a3_marwood_back` for the register; `d_a3_lowe_close`; the gathered allies' lines; Petra at the close; the
  companions' placements as waiting people) · case `calla` in `md_court.ts` **only if** `CALLA_HELD` [B5d?] (precedent
  `prec_sedition`).
- **Touch** `tools/maps/gen_md_spire.py` → `maps/md_spire.ts` (Act 3 placements on the close `if: a3_summoned`; the
  Concern's officer; the fire at the steps' foot as a talk prop `a3_fire`).
- **Reads** `hc_soto_met`/`hc_offer` [B4B], `LN('guild')`, `hs_marked`, `hs_gate_shut`, `cr_concern`, `a3_unwritten`,
  `prec_register`, `ca_squatter`, `a3_ally_*`, companions' left/gone flags. **Sets** `a3_concern_terms` (accepted |
  refused), `k_a3_transfer`, `a3_register_back`, `ca_calla`, `prec_sedition`.
- **Tests**: the officer always offers; Sarr's second chance after refusing; the register bought back; with Calla held the
  case opens, and without it it does not.
- **Estimate** 1 h.

### B6m — Readiness, what you hold, the point of no return
- **Create** `dialogue/a3_ready.ts` (`d_a3_ready`, the readiness hub with eight acts; `d_a3_charge` for making the charge;
  `a3_warn_*` letters to the living keystones in `world/a3_letters.ts`, each `inc a3_warned` once; `d_a3_pnr`) · fill
  `q_a3_hold`'s objectives (§3, done by the §4.1 sub-gates).
- **Touch** `dialogue/md_spire.ts` (`d_ar_steps`: one Act 3 start entry → `d_a3_pnr`).
- **Reads** the gates' keys; `k_hs_powder`, `skill explosives`, `a3_ally_shift`, `hs_rafe`. **Sets** `a3_ready`,
  `a3_ready_<k>`, `a3_warned`, `k_a3_charge`, `a3_pnr`, the `save` event.
- **Tests**: each readiness act counts once; the hold quest's objectives follow the gates; the PNR emits the save event and
  is final; "(Not yet.)" changes nothing.
- **Estimate** 1 h.

### B6n — Last nights I: the romances (Tamsin, Wren, Ilya, Kes) and their red lines — BUILT 2026-11-17, ahead of B6f–B6m (deviations under "As built")
- **Create** `dialogue/a3_fire.ts` part 1 (the fire hub `d_a3_fire` listing who is present; one scene each for Tamsin (R3,
  and the friendship variant), Wren, Ilya and Kes: the romance's last step before the steps and what each can live beside;
  the non-romance variants).
- **Touch** `dialogue/overpass.ts` (Wren's leaving at the first Act 3 fire if `LN('guild')`, `wren_left` = guild; U8's
  "still to wire") · `dialogue/hs_kes.ts` (`a3_kes_numbed` interjection at Knock, if not done in B6j).
- **Reads** `tam_romance`, `wren_rom`, `ilya_rom`, `kes_rom`, `romance_partner`, approvals, `ilya_sober_days`, `kes_link`,
  `tam_lies`. **Sets** `a3_tamsin_last`, `a3_wren_last`, `a3_ilya_last`, `a3_kes_last` (each = together | apart | none),
  `wren_left` = guild.
- **Tests**: each scene by romance state; the red line at the Act 3 fire; no scene for a companion who is gone.
- **Estimate** 1 h.

### B6o — Last nights II: Odile, Ash, Nine; Ash and Tamsin at Knock — BUILT 2026-11-17 (deviations under "As built")
- **Create** `dialogue/a3_fire.ts` part 2 (Odile's price against Sarr's fate; Ash's last night before the steps (by
  `ash_orders`); Nine's (by deed and stance); the Ash ↔ Tamsin exchange at Knock's first camp (U8 Tamsin §6, Act 3 return)).
- **Reads** `odile_price`, `odile_sheet`, `SARR_FATE`, `ash_orders`, `ash_stance`, `ash_gully_outcome`, `nine_deed`,
  `nine_stance`, `a3_recall`. **Sets** `a3_odile_last`, `a3_ash_last`, `a3_nine_last`, approvals.
- **Tests**: each scene by state; the Knock exchange once.
- **Estimate** 1 h.

### B6p — The steps
- **Create** `dialogue/a3_steps.ts` (`d_a3_steps` with the photograph restaged (`{ event: 'photo', data: { place: 'md_spire',
  spot: 'steps_sit' } }`), the crowd, the sash (wear / refuse), the second hearing (Speech 55 with §4.1's mods: −10
  `ca_reserve` ∈ {stayed, attendance}, −5 `a3_c9` = opened, −5 `a3_recall` ∈ {court, declined}, −10 `nine_log_given`, −10
  `jonah_lived`, −5 Nine there, +10 `cr_crown_hostile`), Ash's orders played out, Tamsin's question ("What's the first thing
  you'll sign?"), companions on the steps; the Unwritten's blade `npc_a3_u2` and its fight).
- **Touch** `maps/md_spire.ts` via the generator (the steps' crowd placements `if: a3_pnr`).
- **Reads** `ash_orders`, `ash_stance`, `approval ASH`, `a3_unwritten`, `inParty *`, the file mods. **Sets** `a3_sash`, `a3_file`,
  `a3_ash` (between | faced | struck | self | away), `q_a3_spire` → vault.
- **Tests**: wear and refuse; the contest pass and fail; every Ash branch, the self branch only under its conditions.
- **Estimate** 1 h.

### B6q — The Vault and the choice
- **Create** `tools/maps/gen_md_vault.py` → `maps/md_vault.ts` (about 48×32, interior: the stair down from the vault door,
  the couriers' drop and its shaft, the hall of racks (the core) humming one note, the reading desk, spots `core`, `desk`,
  `drop`, `door`; walkability and reachability checked as the other generators do) · `dialogue/a3_vault.ts`
  (`d_a3_ledger`, the last conversation: why now (by alliance), the reserve (by `a3_c9`), the unforecast (Tamsin, Kes), the
  cost of each act said truthfully, what it wants, each asked once; then the choice with `showLocked`).
- **Touch** `dialogue/md_spire.ts` (`d_ar_vault`: an Act 3 entry, so after the steps the door opens → `goto md_vault`) ·
  `world/sites.ts` (`md_vault` as an instant interior of the Spire) · map registry.
- **Reads** §4.1 gates. **Sets** `a3_end`, a `decision`.
- **Tests**: the map validates; each option is locked and unlocked by its gate; refused-sash options are A2, B and D only.
- **Estimate** 1.25 h.

### B6r — The five ends
- **Create** `dialogue/a3_ends.ts` (`d_a3_end_plan`, `_unwritten`, `_concern`, `_opensky`, `_amendment`; the climaxes in
  §4.3; Nine's red line; Wren and Kes leaving at the vault; the escort-out fight for D by M7; the vault fight for B with
  hostileIf on `md_vault` placements `if: a3_vault_fight`; the courier fight for C; the clause picker for E (up to three of
  the held clauses)).
- **Touch** `maps/md_vault.ts` (the wardens' placements for B's fight) · `maps/md_spire.ts` (the close at night for C and D).
- **Reads** gates, M7, `a3_lowe`, `trust npc_md_01`, the precedents. **Sets** `a3_amend_*`, `ep_sky`, `wren_left` = concern,
  `kes_left` = concern, `nine_left` = core, `a3_vault_fight`, then `{ event: 'dialogue', data: { id: 'd_a3_epilogue' } }`.
- **Tests**: each end sets its flags and opens the epilogue; red lines fire only when the companion is present; D's three
  prices each reachable.
- **Estimate** 1.25 h.

### B6s — The epilogue builder; slides 1–6
- **Create** `dialogue/a3_epilogue.ts` (`epilogueTree()`, the `SlideSpec` type local to the file, slides `steps`, `ledger`,
  `cistern`, `knock`, `shale`, `dogs` with all their variants and keystone lines; the `credits` event at the end).
- **Reads** §6.2 rows 1–6; §5 selectors through `a3_conds.ts`. **Sets** `ep_*`.
- **Tests**: the chain never dead-ends; every slide has a default; each ending's slides 1–2 match §6.3; the Cistern slide
  under every M4 value; the `slide` event's data is complete (place, spot and people resolve to real maps and NPCs).
- **Estimate** 1 h.

### B6t — Slides 7–12: the guild, the Choir, the city
- **Extend** `dialogue/a3_epilogue.ts` (or `a3_epilogue_city.ts` spread in): `guild`, `choir`, `precinct`, `sink`, `crown`,
  `edges`.
- **Tests**: M2 every value; B's failing city; E's clauses read; the B5d aliases' defaults.
- **Estimate** 1 h.

### B6u — Slides 13–19: Halcyon and the wilds
- **Extend** with `skirts` (with the [B4B] lines gated), `line`, `shore`, `teeth`, `wet`, `wheel`, `ashlands` [B5d?].
- **Tests**: M1, M3 and M5 every value, with and without the B4b flags set; the strike "still out" variant.
- **Estimate** 1 h.

### B6v — Slides 20–27: the companions and R49
- **Extend** with the seven companion slides (§7 end states and romance ends) and `r49` (`ep_home`, partner, the aged face
  `pc.years: 19`).
- **Tests**: every companion end state yields its variant; the never-met variants; the partner only when together; R49 by
  ending and home.
- **Estimate** 1 h.

### B6w — The ending playtests and the no-lockout proof
- **Create** `tests/b6_endings.test.ts`: one headless playthrough script per ending from a save before the PNR. Each script:
  - builds its fixture (`prepared` and `hostile` presets);
  - plays Act 3 from `a3_order` through the door, the close and the PNR (writes the `steps` save with
    `SaveManager(MemoryBackend)`, reads it back);
  - branches each ending from the **loaded** copy;
  - asserts `a3_end`, every modifier value and the epilogue's variant ids (§6.3).

  Scripts: A1, A2, B, C, D-held, D-hard, D-burning, E, each on `prepared`, plus B, C, D and E on `hostile` through their Act 3
  alternates (12 scripts). Plus a coverage table: every value of M1–M7 is reached by at least one script.
- **Create** `tests/b6_nolock.test.ts`: from the `hostile` fixture, each gate's keys are satisfied by Act 3 routes alone
  (§3 table, each row a test). Plus one long run per alliance (choir, guild, ledger, truce) from `LN_DONE` to the credits.
- **Touch** `docs/PROGRESS.md` (B6 ticked, the content tracker's Act 3/endings row: spoiler-free counts) ·
  `story/STORY_PLAN_SECRET.md` (a "Build notes — B6" pointer to this file) · this file's "As built".
- **Estimate** 1.25 h.

**Total**: 23 slices, about 24 hours of agent work.

---------------------------------------------------------------------------------------------------------------------
## 9. Runtime asks (Unity track, not content slices; B6 content is testable headless without them)
1. **`slide` event**: compose a still in the streamed world at `place`/`spot`, with `people` in their end states, the
   light and weather, and the PC aged by `pc.years` (the portrait pipeline's ageing, which the photograph already uses).
   The text page beside it. The camera is the overhead rig's pitch (35–62°) eased close, as a conversation is framed,
   except slides 1 and 27, which are photo-mode stills (the photograph and its R49 answer; CLAUDE.md allows photo mode and
   portraits other views).
2. **`photo` event** on the steps: the forecast portrait's composition with the PC at their current age.
3. **`save` event**: a named autosave slot (`steps`, "Before the steps") that the title's load menu shows first.
4. **`credits`**, and the end: back to the title, the `steps` save kept.
5. **Place builds**: `md_vault` (new, instant interior under the Spire), Knock with the column's camp, the Cistern
   interior opened for the first time (instant), and Signal Hill's raised mast.
6. **Live hounds**: until a hound model exists, the hounds at Knock are `hound_dormant` stand-ins and do not fight.
7. **The people lock** (CLAUDE.md, 2026-11-06/08): epilogue slides have people in them, so slide captures go to the owner
   only under the gate's rule (progress pictures marked with the gate's state while it is red).

---------------------------------------------------------------------------------------------------------------------
## 10. Tests: what "every ending reachable from a save before the point of no return" means here, and how it is proved
- **Reachable from a save**: B6w's scripts write the PNR save through the real save codec, reload it, and play each ending
  from the loaded state. They do not use the in-memory state.
- **Covered by a headless playtest script**: one script per ending (A1, A2, B, C, D ×3 prices, E) on the prepared fixture,
  plus B, C, D and E on the hostile fixture, as `tests/ch1.test.ts` does for Chapter One.
- **No lockout**: `b6_nolock.test.ts` proves §3's table. From the worst plausible Act 2 (Nine gone, Ash gone, the verdict
  refused, the register sold, no allies, the Concern refused, the mast dead), each ending's keys can still be got in Act 3
  before the PNR.
- **Read across the whole game**: the coverage table asserts that each modifier and each slide variant is driven by its
  Act 1–2 flags (§1.3), local standing, and companion states, never by a summed score.
- **Per-slice tests**: B6a–B6v each test their routes and outcomes (≥3 routes per beat, one non-violent).

---------------------------------------------------------------------------------------------------------------------
## 11. Questions for the owner (spoiler-free; none blocks B6)
1. **After the ending**: should the game return to the title with your last save before the final climb kept, so you can
   try another way to finish, or should you be able to keep exploring the world afterwards? (Planned: back to the title,
   save kept.)
2. **Epilogue length**: it is planned as about 27 illustrated pages (roughly 10 minutes of reading), one for each place
   and person your choices touched. Is that the right length, or would you rather have a shorter run of about 12 pages,
   with the rest readable afterwards from the menu?
3. **Before the final climb**, the game will list, in the world's own words, which ways of finishing are open to you and
   what each still needs, without saying where they lead. Do you want that list, or would you rather find out by playing?
   (Planned: shown.)

---------------------------------------------------------------------------------------------------------------------
## 12. Change log against STORY_PLAN (improvements the owner allows; mirror one line each into STORY_PLAN §16 when B6a lands)
1. **No soft timer.** §4 beat 18's "soft timer begins" is replaced by the order's attendance clause. The relocation is
   the chair's first act, so the column waits for the designate, and the Ledger's motive explains the wait.
2. **MOTHER's sealed message made specific**: the Ledger's first letter to its designate (R16, the toll card at
   fourteen), withheld by MOTHER as "addressed to a title, not a resident". She kept the PC as she kept Tamsin; the two
   hidden people pair.
3. **Ending A has a refused form (A2).** Walking away is always possible. The Plan reroutes to another face, which makes
   "not a chosen one" literal.
4. **The epilogue ends on R49**, the portrait's own date: the PC's own face at ~44 wherever their choices put them. The
   forecast is fulfilled (A1, C), chosen (E), refused (A2), broken (B), or meaningless (D).
5. **Ending C needs the sash**: the Board wanted the Magistrate's signature on a transfer the Ledger cannot void, as B4b's
   draft already says.
6. **Ending D's "cost depends on what you prepared"** made concrete: a readiness count of eight acts giving three prices.
7. **Pell's "unfit" certificate** reads Act 2's `prec_unrecorded`, so the Court of Accounts decides what saving the reserve
   by a lie means (including a trap).
8. **"Any build via alternates" made testable**: every key of every ending has an Act 3 alternate, and the PNR lists what
   the player holds.
9. **Ada's keystone (3) and "Sheriff's Last Ride"** are placed on the road home; they had no slot.
10. **"Signal Hill restored"** (D) gets its own quest; no content existed for it.
11. **The Unwritten's Act 3 aim** (burn the reserve's count and MOTHER) can be turned toward the core, which is B's
    always-open key. This fits "some will kill to keep it unwritten" without making them killers of sixty.
12. **A relocated reserve can still walk free at Carrick** (passengers, not cargo), so relocation is not final before the
    PNR, and B5b's precedent pays off.
13. **The Vault opens for the designate after the steps whether or not the sash is worn**, because the Ledger wants to
    be seen before it is judged. B and D stay reachable for a player who refuses.
14. **Tamsin's death at the door** happens only when the door is forced while she stands in it: conditions, not
    proximity (AUDIT watch-list).
15. **"Halcyon burned" is defined** (the Shift armed, Maren alive, and the Leash cut or the hounds held by the player),
    and it works without B4b through the hounds.
16. **Two Act 3 Court cases** (the recall and Reserve 9) are precedents. Ending E is reachable by a player who skipped the
    Court in Act 2, and the amendment's clauses come from the player's own rulings (at most three: the chair's first
    season).
17. **The Ledger reopens the steps at R30, giving its reason by alliance**: the Long Night's outcome is what makes it stop
    waiting nineteen years.

---------------------------------------------------------------------------------------------------------------------
## As built (each slice appends here: what changed from this plan, and the B5d/B4b mapping once reconciled)

### B6a (built 2026-11-17)
**Done, all of the slice:** `world/a3_conds.ts` (§1.1 aliases reconciled, §1.2 B4B section, §4.1 gates, §5 selectors with
`modValue(g, mod)`, the flag registry at the end) · `quests/a3.ts` (all ten `q_a3_*`, `act: 'a3'`; critical with routes:
order, return, cistern, spire; side: recall, mast, ride, unwritten, platform, hold) · `items/story_a3.ts` (the six items) ·
`world/a3_events.ts` (`a3_order`, `a3_summons`, and one more: `a3_recall_notice`, below) · `dialogue/a3_order.ts` (only
`d_a3_order_read`) · `tests/a3_fixture.ts` · `tests/b6a.test.ts` (40 tests). Registries touched only. No engine change.
`npm run check` green (people gate red/stale as before). §12's change log mirrored into STORY_PLAN §16 (item 15).

**The B5d mapping** (B5d committed; its notes' "Flags B6 should read"). Every alias keeps its plan name; B6 files read
them, never B5d's flags. 8 table rows (13 alias names) reconciled, plus five other `[B5d?]` reads:
| Alias | Plan assumed | Real (B5d) | Note |
|---|---|---|---|
| `LN_DONE` | `a2_longnight_done` (**does not exist**) | `ln_done` (set at the night's dawn with `act2_done`) | only `ln_done` is read |
| `LN(side)` | `ln_alliance` = choir \| guild \| ledger \| truce | `ln_alliance` = choir \| guild \| ledger \| truce \| **none** | a fifth side: the player stood with nobody and the forecast was kept. `SIDES` has five. Fallback kept: `ln_done` with no alliance reads as `truce`. Why-now for `none` (the order): "THE DESIGNATE STOOD ASIDE AND THE FORECAST WAS KEPT TO THE LETTER. THE SCHEDULE HOLDS WITHOUT ASSISTANCE." B6c: `none` has no alliance transport (the Line, the Wheel by standing, the buggy, on foot); B6q: the Ledger's last conversation reads `none` like `ledger` |
| `LN_BAND(b)` (new) | — | `ln_band` = strong \| mixed \| thin \| truce \| none | the night's strength band, for slices that read how the night went |
| `MASON_BURNED` | `ks_mason` = burned (**no such value**) | `ln_openfield` = burned | keystone 8 itself is `ks_mason` = lives \| dead \| exiled: new aliases `MASON_DEAD`, `MASON_EXILED`, `MASON_LIVES` (unset = alive), `MASON_SCARRED` (`ln_mason_burned`: pulled out of the burning door alive), `OPENFIELD(v)` (`ln_openfield` = stands \| scorched \| guild \| evicted \| burned) |
| `CALLA_HELD` / `CALLA_FREE` / `CALLA_DEAD` | `ks_calla` = held \| freed \| dead (**no such values**) | `ks_calla` = imprisoned \| free; `ln_calla` = freed \| taken | B5d never kills her: `CALLA_DEAD` = `dead npc_sh_05` only. Fallback kept (night over, nothing set = held) |
| `SARR_FATE` | `ks_sarr` (unset unless B5d resolves it) | `ks_sarr` = dead, `ln_sarr` = lives \| dead | exported as `SARR_DEAD` / `SARR_ALIVE` (+ `dead npc_nb_01`). `ks_sarr` is B5d's, not new in B6 |
| `HOUNDS_PLAYER` / `_CONCERN` / `_ASLEEP` | `an_kelso` values | `an_reserve` = player \| concern \| sealed \| **leaderless** | `an_kelso` exists but is Kelso's quest choice (sold \| held \| taken \| broken), not the reserve's state. The fourth state (command unit broken, the reserve nobody's) is the new alias `HOUNDS_FERAL` and a new M5 value **`feral`** (order: yours, woken, feral, dormant). Also `HOUNDS_LAID_DOWN` = `ln_hounds` = stood_down |
| `ASH_LN_REDLINE` | B5d wires it | `ash_redline` = longnight, `ash_gone` | plus `ASH_REFUSED` = `ash_orders` ∈ {refused, **refused_late**} (refused at the knife itself): B_MEANS uses it, and every later "Ash with refused orders" read (20b's −15, 21b) should too |
| `NINE_LN` | `nine_stance` | `nine_stance` (real) + `ln_nine_back` | `NINE_CONSCIENCE`, `NINE_DEPUTY`, `NINE_BACK` |
| other `[B5d?]` | 19b B "the Ashlands' board" | `k_an_board` (the shunter's board, pre-Scald, nobody in it; carried only until its end is chosen) | `MAST_BOARD` = `j_controller` ∨ `j_tm_controller` ∨ `k_an_board` |
| | slide 19's place `an_*` | `an_saddleback` (the ridge over the valley) | B6u |
| | Kes tells "the Lieutenant" to stand down | LT-7 is a prop (`an_lt`, tree `d_an_lt`) in `an_hall`; B5d's held route already lets Kes seal it (`an_reserve` = sealed) | an Act 3 route to M5 = yours would need a new `d_an_lt` entry: not wired (B6o/B6u decide) |
| | case `calla` | opens on `CALLA_HELD` (`ks_calla` = imprisoned) | B5d's notes: her trial reads `prec_forecast_fine`, `prec_unrecorded`, `prec_refuse_benefit`, `ca_calla_listed` |
| | the truce's logistics | `ln_owed`, `ln_trust` = none, `ln_eviction_stayed` | B5d gives a truce no allies, only debts to call: B6c's "truce: any one, by asking" should read `ln_owed`; `ln_came_*` (who came to the night) can widen the muster |
Also exported for later slices: `LN_PEOPLE(v)`, `LN_STORES(v)`, `LN_OWED`, `LN_CITY_WARRANT`, `LN_FORECAST_KEPT`, `LN_LEASH_SPREADS`.

**Deviations and choices:**
- Quest title "The Toll Road Home" → **"Toll Road Home"** (the validator's naming rule: never "The" + noun). Titles for the two
  the plan left open: `q_a3_cistern` **"Reserve 9 (The Mouth)"** (the order's own heading), `q_a3_spire` **"Public Steps
  Reopen"** (the Spire's notice).
- **The first letter's date.** "R16 … at fourteen … kept eleven years" does not add up for a PC of ~25 at R30, and the PC's
  age is a slider (22–28). `k_a3_first_letter` reads "dated in the year your first toll card was punched, when you were
  fourteen": no fixed R-year. B6h's MOTHER lines should say it the same way.
- **The order arrives** as three posts at the next seven o'clock after `ln_done`: Maud (`npc_kn_maud`), MOTHER's slip
  (`npc_c9_05`) and the Ledger's receipt (`npc_ar_voice`, shown as "Ledger"), plus the items `k_a3_mother_letter` and
  `k_a3_order`, and `q_a3_order` (stage `post`). The courier `npc_a3_01` is not needed for the arrival; B6b may still
  place him. The Act Three card is `ACT THREE\nTHE DOOR`, on the first read only.
- **The recall starts with the order.** The packet holds a fourth sheet (the Unit 9 notice) only with Nine on the player's
  side (`ON_SIDE('nine')`); reading it starts `q_a3_recall` and sets `a3_recall_due` (B6b's Precinct placement reads it).
  New world event `a3_recall_notice`: a Nine who joins or comes back after the order was read gets the notice at the next
  seven o'clock. A Nine never met, left or gone is never recalled.
- **Quest transitions** (skeletons; journals are placeholders the slices may rewrite): `q_a3_order` post → read (on
  `a3_order_read`). `q_a3_return` west → sallow (on `IN_SALLOW`: any Sallow map, the wild of the Sallow, or `a3_in_sallow`,
  which B6c's road scenes set) → knock (on `a3_at_knock`; entering it starts `q_a3_cistern` at `knock`). `q_a3_cistern` knock → inside (`a3_inside`) → door (`a3_ring`);
  `a3_in_how` = door jumps straight to the door; every stage ends on `a3_c9` (sealed | opened | relocated, all `done`). Side
  quests end on their slice's flag, one stage per value (`handed`/`taken`, `ks_ada` dead, `burning` and `held` are
  `failed`). `q_a3_spire` close → steps (`a3_pnr`) → vault (`a3_sash`) → ended (`a3_end`); `q_a3_spire` and `q_a3_hold`
  start with `a3_summons`; `q_a3_hold` ends at the PNR.
- **Coordinator default 3 applied (no named list of ways to finish).** `q_a3_hold` "What You Hold" is the notebook's page:
  hidden lines that appear once held, for the eleven allies (`a3_ally_*`), six carried things (`k_ar_refusals`,
  `k_ar_warrant`, `k_a3_first_letter`, `k_a3_transfer`, `k_a3_charge`, `k_an_core`) and four places' standing (Knock,
  Shale, Openfield, Meridian ≥ 10), plus "Climb the steps when you are ready". It never names a gate. **§3 step 1 is
  superseded:** B6m's `d_a3_pnr` does not list the gates' keys; it points to the notebook page, warns once that the story
  ends here, and leaves "what is possible" to the companions at the fire (B6n–B6o). `KEYS` (the gate keys by name) are for
  tests only.
- **Coordinator default 2 (only the slides whose subject the player met):** `EP_SLIDES` lists the 27; each slide's
  `applies` is B6s–B6v's. There is no `met` condition for people in the engine (`world.met` is not a Cond): B6s uses
  per-person flags (`tam_met`, `ilya_met`, `odile_met`, `ash_met`, `nine_met`, `kes_met`; Wren has none, use `wren_joined`
  or her Act 1 quest), place knowledge (`loc_*`, uneven across places) or quests started; or adds a `met` Cond (an engine
  and validator change: say so in that slice).
- **Coordinator default 1:** no free roam after the end; `q_a3_spire` ends on `a3_end`; the epilogue then credits then the
  title (B6r–B6s). The engine's save slots are `auto | quick | slot1–3`: the `steps` slot is still runtime ask §9.3; the
  fixture's `saveAndLoad` writes `slot1` meanwhile.
- **Companions:** `COMPANIONS` (each one's join, left and gone flags) and `ON_SIDE(c)` = joined ∧ ¬left ∧ ¬gone (travelling or
  waiting: these gather at the close). Ilya and Kes have no separate gone flag (their `_left` covers it); Tamsin's gone is
  `tam_home` or `a3_tamsin_dead`; Nine's includes `nine_disposed` and `a3_nine_struck`; Ash's `a3_ash` = self.
- **Helpers added beyond the plan** (all in `a3_conds.ts`): `GUILD_IN_PLAY` / `HOUNDS_IN_PLAY` (B6f sets `a3_guild_in` /
  `a3_hounds_in` from them), `IN_SALLOW`, `RESERVE_STAYED`, `ALLY_NEEDS` (§2.3's table, exact) with `ALLIES_AT_KNOCK` /
  `ALLIES_AT_CLOSE`, `READY_ACTS` (§5 M7's eight), `CLAUSES` (§4.2's seven), `M9_STANDING(settlement)`, `EP_HOME` (R49's home:
  city first under A1/C/E, then knock, shale, road, nowhere), `STRIKE_OUT`, `KES_LINEAGE` / `KES_LINEAGE_HEARD`, `C_BUYER_B4B`,
  `B4B_FLAGS`, `LOWE`/`REYES`/`PETRA`/`HALE`/`QUILL` ids with `LOWE_DEAD`, `PETRA_DEAD`, `HALE_ALIVE`.
- **M2** gets a default (`flooded`): by Act 3 the Sink's spring has either been settled (`sk_saved`) or come.

**The fixture** (`tests/a3_fixture.ts`; every later slice builds its states here): `actThree(preset, over)` → `{ g, q, fired }`.
Presets `prepared` (a thorough Acts 1–2, a truce at the night; every ally's need met; Nine its own keeper, conscience, in the
party with Tamsin; the others waiting), `hostile` (Nine and Ash gone, the verdict refused, the register catalogued, no
ally's need met, the Concern refused with the hook on, the mast's groundwork undone, `none` at the night, Sarr dead), and
`choir | guild | ledger | truce | none` (a middling Acts 1–2 closed on that side). `over`: `alliance`, `band` (strong | mixed |
thin, as B5d's dawn leaves Openfield), `companions` (per companion: never | met | party | waiting | left | gone, and
Tamsin's inside | home; or the sets `everyone` | `nobody` | `estranged`), `approval`, `b4b` (true for the preset's own
arcology outcomes, or an object of `hc_*` over them), `flags`, `knows`, `items`, `tolls`, `skills`, `attrs`, `origin`,
`standing`, `rep`, `trust`, `members`, `at`, `point` (eve | open | read: Act 2 closed, the post come, the order read —
the default), `host` (to catch events such as the title card). `saveAndLoad(g)` writes through `SaveManager(MemoryBackend)`
and returns the loaded copy with a fresh `QuestEngine`. The B5 tests' helpers are exported (`talk`, `view`, `options`,
`waitFor`, `hour`, `at`, `conclude`, `fire`, `placed`, `trigger`, `skills`, `has`, `stage`, `status`). Settled Act 1–2
events (Tribute Day, the Sink's spring, the night's call and dusk, Tamsin's walk-up when met) are marked resolved, so
only Act 3's own event fires when the fixture opens the act.

### B6b (built 2026-11-17)
**Done, all of the slice:** `dialogue/a3_order.ts` (+ `d_a3_courier`, `d_a3_recall`, `d_a3_nine_hid`; the order's text now
carries the city's foot line OBJECTIONS LIE TO THE COURT OF ACCOUNTS, in the read and its return) · `dialogue/a3_court.ts`
(the two cases as `courtCase()` specs) · `npcs/a3.ts` (`npc_a3_01` Selma Ruud, the courier; `npc_a3_g1/g2`, the recall
wardens, both "Warden": the older woman and the young man) · placements via the generators (re-run, additions only):
`md_precinct` (the courier `if: a3_open` at the lane to the Spire, spot `courier_post`; the wardens inside the gate, spots
`recall_a/b`, `if: RECALL_OPEN ∨ a3_recall_fight`; trigger `a3_recall` on the gate's inner column: Nine in the party ∧
RECALL_OPEN ∧ ¬`a3_recall_stay` → `d_a3_recall`), `md_ring` (`npc_md_nine_clover` on Clover's halt bench), `md_docks`
(`npc_md_nine_hulls` in the north hull's forward hold) · `tests/b6b.test.ts` (32). No engine change. `npm run check` green
(people gate red/stale as before).
**Shared touches (small, local):** `md_court.ts` (an import; `RESERVE`/`RECALL` built after `DEED`; both `open()`s on the
bench's CALLS; their nodes spread into `d_ca_court`) · `a3_conds.ts` (`NINE_KEEPER_SELF/PLAYER/CITY`, `NINE_REGISTERED`,
`RECALL_OPEN`, mod `NINE_DEED`; the registry's B6b block) · `quests/a3.ts` (`q_a3_recall`: an optional "hear the recall
wardens out at the gate" objective; the `court` and `hidden` journals) · content index (`A3_NPCS`) · `tests/b6a.test.ts`
(`ca_deed` added to its LATER exception: courtCase writes `ca_<case>` through a template, so the flag is real but not
literal).

**Deviations and choices:**
- **No import cycle.** The case specs are functions of `onRail` (`reserveCase(onRail)`, `recallCase(onRail)`) in their own
  file, importing only types from `md_court.ts`; `md_court.ts` builds them on its bench. Case ids `reserve` and `recall`, so
  the rulings are `ca_reserve` and `ca_recall` as planned; nodes `reserve*` / `recall*` in `d_ca_court`.
- **Whose unit it is** (`NINE_KEEPER_*`): an Act 3 outcome first (`a3_nine_keeper`), then the Court's registration
  (`ca_deed` self | irregular → self, citizen → player, returned | voided → city), then an unregistered deed **witnessed or
  bought** (the plan said "registered or witnessed"; a desk sale at assessed value is a recorded transfer, so it counts),
  else the city (its own deed, an unregistered forgery, a voided one, none). **U8's `nine_deed` is never rewritten**: the
  title bought at the gate writes `a3_nine_keeper` = player; the Court's keeper ground writes `a3_nine_keeper` = self.
  **B6j (Nine's break at the door) and B6v (its slide) read `NINE_KEEPER_*` / `NINE_DEED`, not `nine_deed`.**
- **Where it plays.** At the gate when Nine comes through with the player (the scene); the wardens can also be talked to
  with Nine away (only the answers that need no unit present: refuse, buy, the Court); by post through the courier (a self
  keeper's "declines" in Nine's hand, a citizen keeper's "refuses"); at the Court (the case is callable whenever the recall
  is open, before or after the gate). "Not today." changes nothing and the wardens wait, days on (no time limit). Nine never
  met, left or gone: no recall, no wardens.
- **Answers and outcomes.** `declined` (self; Nine +10) · `stayed` (citizen keeper refuses) · `handed` (citizen keeper,
  confirmed by Nine's "Is that an instruction from my keeper?") · `court` (the stay at the gate sets `a3_recall_stay`: the
  wardens stand aside for the ruling and stop nobody; or the case called directly) · `bought` (121 Tolls, the city's unit
  only) · `hidden` (Stealth 40, −10 after dark; one try: a failure sets `a3_recall_watched` and the young warden blocks the
  gate, every other answer still offered) · `fought` (a real fight: both wardens `hostileIf: a3_recall_fight ∨ md_fight`;
  wardens respect −20, fear +5; Nine −5; the rest of the Precinct is not turned) · `taken` (let go, confirmed; a deputy
  Nine says the order is lawful, a conscience one asks that its non-consent be entered).
- **Hidden.** Clover always (north along the Wall; the lenses face in); the Hulls only with `CRADLE_RUNS` ∧ ¬`dk_hulls` =
  cleared ∧ the cradle or the Hulls known. Nine leaves the party, waits at its hideout (placement `if: a3_nine_hid` ∧ not in
  the party ∧ ¬`a3_nine_fetched` ∧ not left/gone/disposed/struck), is entered NOT FOUND and written off (clause 22): the city
  does not look again, and walking it back through the gate later is safe. It stays `ON_SIDE` and rejoins when fetched
  (`d_a3_nine_hid`, `a3_nine_fetched`). **B6l:** a hidden, unfetched Nine is on the player's side; decide whether the summons
  brings it to the close on its own (suggested: yes, written off, it walks in).
- **Disposed** (`handed`, `taken`, or the Court's `returned`): `nine_disposed` + `leave`; no placement of `npc_md_nine` on
  any map evaluates true afterwards (tested at four hours), and `ON_SIDE('nine')` is false.
- **Case `recall`** (available on `RECALL_OPEN`). Evidence: the deed (`nine_deed_made`; read by its registration), the log
  (`nine_log_given`, or Nine at the rail reading its own count), the register's heading (`prec_unit_keeper`), the census note
  (knows `ar_census_seen`). Grounds: `held` (no check, when the register already holds `prec_unit_keeper` = self) · `keeper`
  (Speech 50: a non-city deed on the rail −10, the log −15, the register −10, the census −10, Nine at the rail −5, a voided
  deed +10) · `register` (Science 45, only with `NINE_REGISTERED`; the deed on the rail −10). `kept` → `prec_recall` =
  keeper, `a3_recall` = court, a precedent; `returned` → `a3_recall` = taken, `nine_disposed`.
- **Case `reserve`** (available on `a3_order_read` ∧ ¬`a3_c9`). Evidence: the replies copy, the census (`tam_why`, the
  census seen, or Tamsin at the rail, who reads the count and does not name the one), MOTHER's slip, Nine's "I did not
  escalate it" (in the party), the register's `prec_unrecorded` = yields and `prec_refuse_benefit`. Consent: Speech 50 with
  exactly the plan's five modifiers (DC 15 with all of them). **Attendance: Science 45, with −10 for the refused-benefit
  heading on the rail** (added: the plan listed that evidence without a ground to use it); an `archive_clerk` gets the
  separate no-check ground `clerk`. Privilege: no check, xp 40, wardens respect +3, not a precedent; Tamsin −5, Ash −5
  (interjections). Any failed ground → `upheld`.
- **Discoverability.** The order's foot line, the courier (the Court; starts `q_ca_court`, which tracks the cases), and the
  wardens' stay all point to the Court. The courier also seeds the couriers' slot at the Spire's foot (`a3_drop_heard`) for
  B6r's escape by the drop.
- **Precedents.** A player with none from Act 2 (the hostile fixture with Nine brought back into the party) reaches
  `E_PREC` from these two cases alone (tested).

### B6d (built 2026-11-17, alongside B6b and ahead of B6c)
**Done, all of the slice:** `dialogue/a3_mast.ts` (5 trees: `d_a3_station`, `d_a3_mast`, `d_a3_aerial`, `d_a3_hollow`,
`d_a3_keeper`) · `tools/maps/gen_signalhill.py` → `maps/signalhill.ts` (confirmed byte-identical before the change) ·
`tests/b6d.test.ts` (24). No engine change. `npm run check` green (people gate red/stale as before).
**Shared touches (small, local):** `a3_conds.ts` (`MAST_BOARDS`, the boards one by one with what each settles; the registry's
B6d block) · `quests/a3.ts` (`q_a3_mast` only: routes c, b, v declare their real needs; the hook journal; objectives for the
Hollow's price, "able to speak" and the keeper; three keeper stages before `raised`, which stays for a bare `a3_mast` =
raised) · `a3_events.ts` (`a3_verity_band`) · the dialogue index · `quests/b5d_ashlands.ts` (`q_an_board` ends at `mast`) ·
`tools/maps/gen_wheel.py` → `maps/wheel.ts` (the generator first corrected to the map's committed name, "Wheel", so it
reproduces the map byte for byte; then one condition on Dario's placement).

**How it plays (and where it differs from §2.3 19b):**
- **The hook.** The station's voice reads its twelve lines, now with the designate's at the top: "— the Spire. The
  designate. Year thirty. Magistrate. —" (the same year as the order's corrected steps). Three texts by Act 1's speaker: cut
  (the voice small in the cut stub, still going west), on the mast (the whole Sallow hearing it), neither (a room and a pump
  station). Arriving in Act 3 (trigger `a3_arrive`), hearing the voice, the mast's foot, the crown or Tally each start
  `q_a3_mast`. **B6c:** the Hollow trader's road encounter should start it too (`{ quest: 'q_a3_mast', start: true }`).
- **Why it was narrow, made concrete.** The rack has three circuits: the speaker, the line west to DW-4, and BROADCAST — ALL
  BANDS with a city tie through its terminals, tagged ISOLATED BY ORDER. The mast's head is a stub with four empty plates; the
  **crown** (the broadcast array, the plan's "top section") was let down the gully on ropes by city men long ago, so it could
  go back up. Two independent ways to make it speak wide, each a whole route: **make the stub shout** (X, C, K, B: a wide
  band on the link, or a board with nobody in it in the head box) or **put the crown back** (V, T). Every route ends with the
  same visible sign: a white lamp beside the red at the head, and a **knife switch** at the foot, down: it speaks wide only
  when the switch is thrown. That keeps the nightly twelve on their narrow line (no early ending D) and gives the keeper a job.
- **Investigation:** the rack (Science 35; −15 an archive clerk, Nine, or Kes; a player who read the Act 1 log sees the
  circuit with no check: `a3_broadcast_seen`, `relay_log_read`) · the mast's foot (the live meter, free: `mast_powered`) ·
  Tally (where the crown lies: `a3_crown_told`) · the gully's new prop `mast_crown` (a "debris" prop at 5,32, "Old lattice";
  dig it out and run a line up the crack: `a3_aerial_found`, no check, 50 minutes). The prop exists in Act 1 too, with a
  plain look (old lattice let down on purpose): props have no conditions.
- **The turn** is Tally's (`a3_hollow_price`): the loudest hill between here and the city, the city's wardens, guild riders
  and the Concern ("who don't use tracks") will come; sixty for water and cartridges to stand on a target, or leave it be.
  Without the Hollow, the keeper node at the mast says the same turn in narration.
- **Routes as built:** X Science 50 (−10 `relay_log_read`) · C a neural port (**the Gridjack or the Lattice Port**: both are
  ports the city's grid answers; plan named only the Gridjack): the grid files REQUEST FROM THE DESIGNATE and answers
  GRANTED (`a3_ledger_granted`: the Ledger wants to be heard; **B6q may have it remember this**); or Kes in the party with
  her link not cut (a cut link is grid-blind, U8): no check, Kes +3 · K Verity's letter (`a3_verity_band`, world event: armed
  by the quest active ∧ `bw_static` = kept ∧ Verity alive; the post at the next seven o'clock anywhere): the hiss band the wire
  wakes on, which every radio hears; no check, Saints +5 · V only once the crown is dug out: Survival 45 or Reflex 7 (two
  options) · B at the Hollow's fire, after the turn: one option per board held, each with sixty Tolls; the shunter's board sets
  `an_board` = mast (B5d's quest ends there) · T at the fire, after the turn: Speech 45, −10 `broadcast_silenced`, +10
  `broadcast_amplified` (the plan's), **plus −5 Tally's trust ≥ 10 and −5 Wren in the party** (added: Act 1's board and
  Wren's name); the Hollow raise it themselves (the crown up the gully on Brick's back, Thanh up the lattice, Tally's copper
  put back), six hours, keeper hollow at once.
- **Raised = kept.** A route sets `a3_mast_how`; `a3_mast` = raised is set only with `a3_mast_keeper` (D_VOICE stays false
  between). A save in between keeps it waiting (start entries go straight to the keeper question). Keepers: **hollow** (asked
  at the fire: the sixty, paid now or already by B, or Speech 45 with T's modifiers; Brick moves to watch the track, Thanh to
  the switch, outside: his Act 1 bark "I don't go in now" stays true) · **wheel** (`a3_ally_wheel` ∨ the Wheel's own need:
  member or standing 15): **Dario Oduya** ("I want a door. One that shuts") comes up the day after (timer `a3_wheel_up`,
  1440 min) with `d_a3_keeper`, and leaves the Wheel's camp map; the Hollow stay on their camp under the Wheel · **knock**
  (always offered, so a keeper always exists): KNOCK chalked on the cabinet, the switch's handle with the player. Over the
  Hollow's heads it costs them the hill: they walk west by morning (timer `a3_hollow_leave`, 480 min → `a3_hollow_gone`),
  Wren −5, Tally −10. **B6f/B6k may send someone up from Knock after the door** (suggested: Amos Crofts, who never went down
  the road again). News by keeper (the Tollhouse, the Wheel, Knock), Nine +3, Odile +2, Ash +2 on any raise.
- **Narrow** is final and offered at the mast, at Tally's asking (trust +10, Wren +3: "a fire here, any night") or after a
  route (pulled out again). Nine −3, Odile −2. The quest ends `narrow`.
- **The Hollow fought in Act 1** (`sg_fight`): their Act 3 placements are hostile if alive, Tally's tree says nobody is
  talking, and their routes and their keeping are never offered; X, C, K, V and the Wheel or Knock still are.
- **One prop, both acts.** The map's mast and speaker now open `d_a3_mast` / `d_a3_station`, which carry `d_sg_mast` /
  `d_sg_speaker`'s nodes and start entries whole after their own Act 3 entries (tested identical before Act 3). Act 3 does not
  offer the Act 1 speaker's cut or amplify (it would move T's modifiers in Act 3).
- **For later slices.** **B6r (D's climax):** the keeper throws the switch when the reading comes up the relay (hollow:
  Thanh; wheel: Dario; knock: whoever has the handle, which is the player's to give). **B6u/B6v:** slide 18 reads
  `a3_mast_keeper` = wheel (Dario at the station); the Hollow have no slide (suggested: a line in the wheel or knock slide by
  keeper). **Runtime (§9.5):** the white lamp at the head once `a3_mast_how` is set; the crown on its plates when how = t | v;
  KNOCK chalked on the cabinet when keeper = knock.

### B6c (built 2026-11-17, after B6b and B6d)
**Done, all of the slice:** `dialogue/a3_road.ts` (8 trees: the rides `d_a3_column`, `d_a3_first`, `d_a3_carts`, `d_a3_buggy`;
the road's people `d_re_a3_wheel`, `d_re_a3_refugees`, `d_re_a3_riders`, `d_re_a3_trader`; plus the hook nodes the shared trees
spread in) · `world/a3_letters.ts` (15 muster letters for the 11 allies, and `let_ines_refusals`) · `world/a3_roads.ts` (6
world events, 5 road encounters) · 5 people in `npcs/a3.ts` · `tests/b6c.test.ts` (29). No engine change, no map change.
`npm run check` green when run (people gate red/stale as before); later in the run a concurrent slice's new
`dialogue/a3_shale.ts` broke the typecheck, which is not B6c's.
**Shared touches (small, local):** `a3_conds.ts` (`HOME_OPEN`, `ORME`, `RIDE_COLUMN/FIRST/CARTS/WHEEL/BUGGY`, `AGAINST_GUILD`
after `ALLIES_AT_CLOSE`; the registry's B6c block) · `quests/a3.ts` (`q_a3_return` only: routes' `requires` are the RIDE_*
conditions, the journals rewritten, an optional "write to the people who might stand with me" objective on both stages) ·
the registries (`dialogue/index.ts`, `world/letters.ts`, `world/encounters.ts`, `world/events.ts`) · one hook each in four
existing trees: `meridian.ts` (`d_md_lowe`: a start entry and node `a3_car`; `d_md_reyes`: the same), `md_docks.ts` (one
extra option on Femi's Line window `d_dk_line`), `openfield.ts` (`d_of_doria`: a start entry and node `a3_carts`), `md_ring.ts`
(one option on each buggy's `yours` node) · `tests/b6a.test.ts` (its "no event the morning after" check filters the
`a3_offer_*` posts, which come that morning by design).

**How it plays (and where it differs from §2.3 19):**
- **Geography.** On the world map the Sallow is east of Meridian and of Openfield (the Line runs east from Carrick; Odile's
  "when you go east"). The plan's "west" is read as "home": journals and route labels say east; the stage id `west` is kept.
- **The offers come by post, the rides from people the player can always find.** World events at the next nine o'clock after
  the order is read, anywhere, while the road home is open (`HOME_OPEN` = order read ∧ no way home yet ∧ not at Knock): Lowe's
  (or Reyes's, Lowe dead), Orme's, Doria's. Each says where the ride leaves; nothing leaves without the player. **Who rides:**
  `ledger` or a wardens' member → the car; `guild` or a tollmen hand → the first class; `choir` or a Choir member → the carts;
  **`truce` with `ln_owed` → all three, by asking** (Lowe: "Ask, if you want it"); `none` → no side's ride. The carts need
  Openfield's people still there (not `ln_people` removed | relocated); the first class needs Orme alive; the car Lowe or
  Reyes.
- **The wardens' car** (`d_a3_column`, from Lowe's desk or Reyes at the gate): the relocation car itself, sixty numbered
  benches, CAPACITY 60, the designate on bench thirty-one; Linnet drives it when `kn_linnet_will_run` (text only; B6f reads
  `a3_route_home` = column with it). Lowe's four topics (why carry you, his grief, the order's missing line, the sixty names:
  trust +3/+5/+3) and, at Tollhouse 9, his question: "When you're at the door, what will you say?" → `a3_lowe_asked` = down
  | unsure | on | none (trust +5 for the first two; Tamsin −10 at "carry on"). It decides nothing; **B6f/B6j may read it.** A
  night by the wheel with Tamsin (+5) balances her −5 for riding in the car. Reyes's ride is shorter (one topic, no question).
- **The guild's first class** (`d_a3_first`, from Femi's window with Orme's letter): the guild's own coach behind the engine of
  the Concern's through, out of Carrick at four, the halts' pilots waving it through; uncoupled at Four Ways at dawn, then the
  guild's road coach down its own toll road, Tollhouse 9's gate up for it. Orme rides home to her stand; her folder is "guild
  business at the stand" only with `GUILD_IN_PLAY` (**B6g writes the paper; she has told the player it exists**), else the
  stand's empty book. A Linnet topic when `kn_linnet_choice` = factor.
- **Openfield's carts** (`d_a3_carts`, from Doria): water barrels and seed for a dry Knock, four days by the old south bed (no
  gates, no tolls), Mason at the head if home, else Calla if free, else Doria; fewer carts if Openfield burned. The open-sky
  fire. Arriving sets **`a3_carts_water`** (and news at Knock): **B6f: Knock's water** reads it with Dry Wells' carts.
- **The buggy** (`d_a3_buggy`, from the Heron or the Mule at the Ring, `dr_buggy` and not `dr_buggy_hurt`): fuel at Ninebridge
  (20) or siphoned (Mechanics 35; a failure costs four hours and a push), the Tollhouse's bar lifted for the designate.
- **The Wheel** are a road encounter (`re_a3_wheel`, weight 12, the Flats, the corridor and the Sallow): road-kin and friends
  (`RIDE_WHEEL` = the Wheel's own need, or called) are carried home across the pan by their own tracks (Sefa trust +5).
- **Every ride ends at Knock's stand, or lets the player down in Shale** to walk the last of it (the way home is still the
  ride's). A ride reopened before it arrives (a save mid-road) resumes in the Sallow (`a3_ride` = the ride boarded).
- **Under their own steam.** **`line` is not written:** the Line ends at Four Ways and the last of it is the toll road either
  way; on foot, the Line or a caravan reads **`foot`**. World events `a3_home` / `a3_home_road` at Knock (`where: c9_mouth`,
  hour 0: the first time on Knock's map after the midnight following the order's reading, which every road home is longer
  than) set `a3_at_knock` and, when no ride was taken, `a3_route_home` = foot. **B6f:** Knock's arrival trigger may still set
  `a3_at_knock` at once and should play its arrival whether or not `a3_home` has fired (read `a3_route_home` for how).
- **The muster.** One letter per ally, with alternates by who to ask: the Dogs to Perpetua (Wren's people, `wren_exodus`),
  Kessler (no coup) or Vasha (her coup, alive); the Choir to Mason (home), Calla (free) or Doria; the Shift to Maren, or Rafe if
  she was hanged. Each: after the order, with `ALLY_NEEDS[ally]` exactly, until the ally is called, to someone met and alive,
  once; Ada's not once she has resigned or died. Replies in 3–6 days set `a3_ally_<ally>` (+ knowledge, trust +5) and say
  where they will be: at Knock's door when the player is (shale, dogs, choir, wheel), the city's night after the steps
  (stand, gangs, saints), the people brought down after (boats, barges), a reader (seventeen). **B6m:** the Shift's reply
  promises the powder cases "waiting when you need them, with a man who can wire them": no item is given here, so the charge
  reads `a3_ally_shift`.
- **The Archive promise.** `let_ines_refusals` carries a transcription; the player keeps `k_ar_refusals` (D_ARCHIVE and B6h
  read it). Offered with the copy held, from Act 2 on, until the door is settled or the Archive decided. Sending it sets
  Ines's memory `player_wrote_refusals` (**B6h's "the PC never wrote" can read its absence**); the reply sets
  `a3_archive_promise`: "If she said no to the city three times, I would like to know what else she kept."
- **The road's people** (four planned, plus the Wheel): the column's supply car passing with the Precinct's own water for the
  wardens (text); Openfield's walkers (Bertil Greer and Keturah Osei, only when the night cost Openfield: burned, evicted,
  guild, scorched; water, Tolls, the wheel mended (Mechanics 30), or the way to the Wheel; news at Openfield); the guild's
  riders (only `AGAINST_GUILD`: choir or ledger, not a tollmen member; pay fifty, Speech 45 with four modifiers, or a fight:
  `a3_riders_fight`, tollmen −10); a Hollow trader (Teodor Brann) with the station's news, who starts `q_a3_mast` as B6d asked.
  The plan's "the guild's riders let the designate ride the Line" is not wired into the Line's own boards (B5a's); the halts'
  pilots are in the first class's ride.

### B6e (built 2026-11-17, alongside B6c)
**Done, all of the slice:** `dialogue/a3_shale.ts` (10 trees: `d_a3_notice` (the sheriff's door), `d_a3_ada`, `d_a3_pike`,
`d_a3_mags` (Teo speaks in it), `d_a3_hands` (Pike's two hands), `d_a3_street` (the street after a fight), `d_a3_militia`
(Issa), `d_a3_jonah`, `d_a3_safe` (the guild's strongbox), `d_a3_dogs`) · `npcs/a3.ts` (+ `npc_a3_g7` Esko Harth and `npc_a3_g8`
Tamar Quaid, Pike's hands; `npc_a3_g13` "Rust Dog (Flint)" and `npc_a3_g14` "Rust Dog (Tack)" for a Dogs' town: **g9/g10 were
taken by B6c's riders**, so the Dogs are g13/g14) · `items/story_a3.ts` (+ `k_a3_contract`) · `tools/maps/gen_shale.py` →
`maps/shale.ts` (the generator first brought in line with the committed map: the room locker's `yoursIf`, hand-set on one
line; then confirmed byte-identical; then the Act 3 additions) · `tests/b6e.test.ts` (21). No engine change. `npm run check`
green (people gate red/stale as before).
**Shared touches (small, local):** `quests/a3.ts` (`q_a3_ride` only: routes as built, the investigation's objectives, two
more end stages `dogs` and `abandoned`; bare `ks_ada` values still end it, as B6a's test asks) · `a3_conds.ts` (the registry's
B6e block only) · the dialogue index · `npcs/shale.ts` (Issa's and Benno Strand's `ally` also on `a3_sh_fight`, so the militia
fight beside the player; Ada and Jonah deliberately not combatants, so neither can die by chance).

**How it plays (and where it differs from §2.3 19c):**
- **No world event.** The buyout comes due on Shale's road triggers (`a3_arrive_w/e/c`, the west, east and centre of the main
  street) or the first Act 3 word with anyone in it (every Act 3 tree's entry node, and the door, apply `a3_buyout` + start the
  quest). A world event `where: 'shale'` would also fire in any later slice's waits in Shale (B6d's test asserts an exact list
  there), and a trigger is the B6d pattern (`a3_arrive`). Both wait for the player; nothing resolves without them. The Act 3
  instances replace the Act 1 placements on `a3_open` (Ada, Jonah, Issa, Mags, Pike: `npc_sh_0N_a3`; their Act 1 trees carried
  whole after the Act 3 entries, tested identical before Act 3). **Pike or Ada dead before Act 3: no buyout at all** (no
  notice, no hands; `ks_ada` stays unset).
- **Why she waits** (the no-time-limit reason, said in her `wait` topic): she told Pike she would sign when she had heard from
  the player, "who has been where the paper comes from".
- **The investigation:** Ada (why: by the rifles, the deputy and the water Acts 1–2 left her; what the paper says; why she
  waits) · Pike (three hundred Tolls of the town's paper: the Dry Well's loan, water on credit, protection since the spring
  if Jonah died; valued against Odile's sheet SHALE — FAILS — two springs off; "brought forward the morning after Openfield's
  night" by the sheet's holder, whom the floor does not name: a passive with `odile_counterparty` sees the even hand; his broker
  at Barter 45, −15 with the Dry Well's second book read) · Mags (her hand: the brokerage settles the Dry Well's account; she did
  it so Ada would live, "two sheriffs in the yard behind the pump house", and for her bar) · Teo (if freed: a living town owes
  150; a withering one owes the 300, "a fair price") · Issa (says out loud when she cannot keep Ada standing: the warning for
  ADA_FALLS, so the death is foreseeable and preventable by drilling the militia first, which still works in Act 3).
- **Routes as built (7):** T Speech 50 (the plan's five mods; added: −5 her fear heard, −5 the pumps run, −5 a militia member,
  +5 the town withering; "the town broke" reads `shale_broke` or `jonah_dead`) · B pay 300; or 150 with Odile in the party, or
  with Teo's figures and Barter 50 (−10 the pumps run); free when `odile_sheet` = torn (Pike checks the floor's list: unwound)
  · K the sheet torn at the counter: the player's (`odile_sheet` player), Odile's own (kept, in party: +10), or read out of
  Nine's second ledger (`nine`, Nine in party); **these rewrite `odile_sheet` to torn** (B6o/B6v read it: Odile's `shale`
  end) · K the Tollhouse page: in the pack (Pike writes WITHDRAWN; the player keeps the page), or Ada's own
  (`ledger_shown_ada`: she walks it across herself) · S the strongbox behind Pike's counter (a new `locker` prop, talk
  `d_a3_safe`) at night (22–8, Pike away), Security 50, then the copy (`k_a3_contract`) on Ada's blotter: she burns it · F
  counted off: the militia called out (Issa alive, or the player a militia member); nine rifles that shoot leave without a shot,
  four need Presence 7 (−2 Ilya, −1 the Dogs who walked down with Wren, −1 Shale's hound) · F fought: `a3_sh_fight`, combat;
  Ada is "out in the street" (not placed) until the street is told (trigger `a3_street_after` once both hands are down, or
  Issa) · or **she signs**: "a sheriff rides out" on the caravan post's grey, forty yards to Pike's door.
- **`a3_pike`** gained two values: `refused` (T) and `void` (the sheet unwound or torn). **`a3_mags`** is new: told | exposed |
  kept | runs. **`a3_shale`** follows the plan: gone (resigned or dead) → abandoned if `shale_withers`, else dogs if `rd_coup`,
  else company / free. Resigned Ada sits on her step as a pensioner only in a company town; under dogs or abandoned she rides
  west. Visible: a guild hand at her desk and a tin plate on her door (company), two Dogs on her bench and a dog's head burned
  into the door (dogs; "ASK KADE" while Vasha lives), a plank and GONE EAST (abandoned), black cloth and SHE STOOD IN THE
  STREET (dead), four empty nails (free).
- **For later slices.** **B6s (slide 5):** read `a3_shale` × `ks_ada` × `a3_mags` (Mags runs the company town; told/exposed:
  Ada knows; kept: nobody does); `ks_ada` unset means the buyout never came due (or is still open). **B6v:** Tamsin's `deputy`
  end has its seed in Ada's `kept` node ("Ask me again in a year"). **B6c/B6j:** Shale's muster letter already reads
  `ks_ada` (resigns | dead); a militia that fought the guild (`a3_sh_fight`) could be read at Knock. Ada's Act 3 death is
  `ks_ada` = dead, never an NPC death: read the flag.

### B6n (built 2026-11-17, ahead of B6f–B6m, while B6f–B6k were being built in parallel)
**Why this slice, now.** B6f–B6k (the hamlet) were one agent's lane, in progress. Of B6l–B6w, the earliest whose reads were
all met by B6a–B6e: **B6l** reads `a3_unwritten` (B6g) and `a3_lowe` (B6j); **B6m** reads `a3_lowe` (B6j) and sits on B6l's
close; **B6n** reads only the companions' own Act 1–2 flags (U8) and B6a's helpers. Its one hamlet-bound item, Kes numbed
at Knock, the plan already gives to B6j first: left there, and read here through the new alias `KES_NUMBED`.

**Done, all of the slice but that one item:** `dialogue/a3_fire.ts` (one tree, `d_a3_fire`: the hub and the four scenes; 99
nodes, about 6,700 words; plus the hook nodes for Wren's and Kes's own trees) · `tools/maps/gen_md_spire.py` →
`maps/md_spire.ts` (confirmed byte-identical first; additions only: prop `a3_fire`, a `fire_barrel` at 29,28 at the steps'
foot, and its talk entry "A fire barrel" → `d_a3_fire`): **this is the prop B6l's list names; B6l need not add it** ·
`tests/b6n.test.ts` (29). No engine change. `npm run check` green (731 tests; people gate red/stale as before).
**Shared touches (small, local, new lines only):** `a3_conds.ts` (`WITH_YOU`, `KES_NUMBED`; the registry's B6n block) ·
`dialogue/index.ts` (registration) · `overpass.ts` (an import, one start entry `WREN_GUILD_START` after `c_floor`, the node
spread at the end of `d_rd_wren`) · `hs_kes.ts` (the same: `KES_GUILD_START` after `c_handed`).

**How it plays (and where it differs from §7 and §8 B6n):**
- **The fire.** A works barrel at the foot of the steps, there in every act (props have no conditions): cold, the R30
  labourers' barrel, until the Ledger's card (`a3_summoned`). Then by day (7–19) it is laid for tonight, with "(Sit down by it
  and wait for dark.)" (→ 20:00); at night it is lit and is the hub; "(Sleep by the fire.)" goes to seven in the morning. It is
  lit every night until the point of no return: the last night is whichever night the player makes it (no time limit). After
  `a3_pnr`: ash. Who sits at it: **`WITH_YOU(c)`** = ON_SIDE less a Tamsin broken in Act 2 (`tam_broken` takes her out of the
  party without `tam_left`, so **ON_SIDE('tamsin') counts a broken Tamsin**; only the door wins her back). A companion is
  offered while something is left to say (U7); the hub's text speaks of "the ones who came", so B6o's three slot in.
- **Each scene, in the companion's voice** (node speaker = the companion; no companion tree edited for them):
  (1) **what they think is possible** (coordinator default 3): a chain over `WAY_HELD`: the two ways always open (wear and
  sign; or walk down, and the Plan finds another face), then each held way in order: B (its means named by where they came
  from: Petra's people, the Choir, Ash, the charge, Bram's trunk; its cost said: the drains and the city's water within a
  year), C (a buyer and the paper in the pack; worn sash), D in full, or "halfway" when the hill speaks wide without a
  reader, people or the archive (`part`), E. Ilya counts them aloud, his numbers following what is held. Never named as
  endings; nothing the player does not hold is mentioned. (2) **what they cannot walk beside** (said the night before, never
  sprung): Tamsin, don't count people, and with the reserve only sealed (not stayed on consent) the door is the chair's first
  paper; Wren, the Concern, and while `wren_rope` is unset the rope ("I'll not sleep beside the rope"); Ilya, the chair (he
  goes) and the Concern (he stays to watch, not to lie down beside it); Kes, the eyes. The answer: a word (`a3_<c>_word`, +3),
  an honest no-promise (+2/+3), or "mine to decide" (−3). (3) **the romance's last step**, or the last night as friends (the
  Grille's game turned round; the long version of Wren's roads; counting with Ilya; Kes's gardens). Kes also has **slack**,
  by `kes_link` (cut, cut with fits, dark, kept).
- **The last steps, by state.** Tamsin `together` → her **R3, here and not "before the door"** (U8 §7; B6n's plan already put
  it at the fire, and the door is behind them by now, so "after it" is after the steps): "what are we, after?", her after
  pictured by §7's end states (deputy, sheriff, the Wheel, Knock's open door) → together / not yet (deferred) / don't wait
  (`stopped`); `open` → the rain's ask without rain → yes leads into R3 / not tonight (`tam_r2_later`) / no (`declined`).
  Wren `committed` → "still the stop?"; `roof` → her r3, route or stop; `yes`/`later_roof` → the scaffold on the steps as her
  roof (the dream said aloud, or "so it knows it's done" if the rope is settled), then r3 before light. Ilya (sober ≥ 30)
  `committed` → a well in the after; `well` → his r3; `yes`/`later_well` → **not here**: no well in a city that counts its
  water by the cup; ask at one before the steps (his own tree's r2 at Shale, Dry Wells, Openfield or the windpumps still
  works: nothing locked); under 30 after a relapse → not while counting from one. Kes `committed` → still a thing; `dark` → her
  r3; `yes`/`later_dark` → the dark hour (the scar's variant if cut) and her r3 before it is up.
- **Romance rules held at the fire**, first, as in their own trees: Tamsin's list at two lies (ends a romance); Wren's, Ilya's
  and Kes's count at approval ≤ 30. A romance committed elsewhere closes theirs kindly (`apart`; their flag `no`, the partner
  untouched). Every no costs no approval; nothing is given or taken. `romance_partner` is set on a commitment and cleared
  whenever the romance holding it ends here (option-level where a node cannot branch: the guild leavings, the counts).
- **`a3_<c>_last`** = together (committed at or through the fire) | apart (ended there) | none (friends); `a3_<c>_night` = the
  beat was had (deferrals set only this). **B6v:** together still reads the romance's own flag (§7: `tam_romance` together;
  `wren_rom`/`ilya_rom`/`kes_rom` committed), which the fire writes; `last` = apart means it ended the night before.
- **The red line at the first Act 3 fire** (U8 Wren's "still to wire"), **and Kes's too (added: the plan named only Wren)**:
  B5d makes both leave at the guild night's dawn only when they were there. A Wren or Kes who waited through it leaves at the
  first word after it where she waited; fetched before Act 3 and travelling, at the first camp (not on the road); gathered at
  the close and never spoken to, at the fire before anything else. `wren_left`/`kes_left` = `guild`, −40, a decision; Kes's
  `kes_rom` ended by her tree's own GONE convention. Their `left` nodes offer no way back for it. Conditions, not proximity.
- **Not wired, said:** the `a3_kes_numbed` interjection at Knock (B6j; the fire shows her hand at her neck since Knock);
  Kes telling the Lieutenant to stand down (§7; needs a `d_an_lt` entry: B6o/B6u decide).
- **For later slices.** **B6l:** gather by `WITH_YOU`; place the waiting companions round the barrel (29,28); the prop is
  there. **B6o:** add Odile's, Ash's and Nine's options to `SIT` and their nodes in `a3_fire.ts` (`waysNodes`, `WAY_HELD`,
  `LAST`/`NIGHT_HAD` are there to reuse); a waiting Ash or Odile whose Long Night red line was crossed while away (B5d's
  RL_ASH: guild or ledger; RL_ODILE: price sarr ∧ Sarr dead) should leave the same way (`*_GUILD_START/NODES` pattern). The
  three already speak at the fire through interjections. **B6p:** Tamsin's question on the steps can follow `a3_tamsin_word`.
  **B6r:** a leaving at the vault (Wren and Kes under C; Ilya under A1) can name a broken `a3_<c>_word`.

### B6f (built 2026-11-17, after B6e, while B6n was built alongside)
**Done, all of the slice, with two placements left to the slices that write their scenes (below):** `dialogue/a3_knock.ts`
(12 trees: `d_a3_home` (the first walk home), `d_a3_maud`, `d_a3_linnet`, `d_a3_dace`, `d_a3_corin`, `d_a3_lowe` (Reyes's nodes in
it), `d_a3_warden`, Knock's others `d_a3_kn_r1..r4`, `d_a3_grille`) · `dialogue/a3_forces.ts` (**holding scenes for B6g**:
`d_a3_petra`, `d_a3_orme`, `d_a3_hale`, a first meeting each; see below) · `npcs/a3_knock.ts` (**its own file, not `npcs/a3.ts`**,
which B6e was editing: the column's four wardens `npc_a3_g3..g6` (Garrick Kress, Suri Pahl, Selwyn Okeke, Odalys Tolland), the
guild's two hound handlers `npc_a3_g11/g12` (Ansgar Wilmot, Ebun Nkemelu), the Unwritten `npc_a3_u1..u3` (Juniper Lowry, who leads
when Petra is dead; Thaddeus Wolde, the blade B6p names; Rhoda Kalder)) · `tools/maps/gen_knock.py` → `maps/c9_mouth.ts` (the
generator first brought in line with the committed map: one extras bark's name, Hesper → Afua; then byte-identical; then the
Act 3 pass) · `tests/b6f.test.ts` (34). 113 nodes, about 10,000 words. No engine change. `npm run check` green (765 tests at
the time; people gate red/stale as before).
**Shared touches (small, local):** `a3_conds.ts` (a B6f block after B6c's: `LINNET_COLUMN/DOGS/SHALE/KNOCK`, mod `LINNET_AT`, mod
`KNOCK_WATER` with `KNOCK_WATERED`, `COLUMN_HERE`, `ORME_HERE`, `HALE_HERE`; the registry's B6f block) · `quests/a3.ts`
(`q_a3_cistern` stage `knock` only: three optional objectives, home to Maud, the Grille, Knock's water) · the content and
dialogue indexes · `npcs/knock.ts` (Sim Nassar's lockdown bark made true in both acts) · the map's extras' "Hatch day" bark
(likewise).

**How it plays (and where it differs from §2.3 20a and §8 B6f):**
- **The opening steps aside.** Every Act 1 placement on Knock now carries `not a3_open`; Act 3's instances (`npc_kn_maud_a3`,
  `_linnet_a3/_column/_dogs`, `_dace_a3/_guild`, `_corin_a3/_down`, `npc_kn_factor_a3`, `npc_kn_r1..r4_a3`) take their places with
  Act 3 trees. The Grille's talk prop opens `d_a3_grille`, which carries `d_kn_grille` whole after its lockdown entries (tested
  identical before Act 3, and again once the door is settled). **The hatch is untouched (B6h's way in).**
- **Arrival** (B6c's ask): three triggers over the north half of the hamlet (x1–54, y1–26: the road in, the camp, the stand,
  the square), in order: `a3_guild` (ORDER_READ ∧ GUILD_IN_PLAY → `a3_guild_in`), `a3_hounds` (→ `a3_hounds_in`), `a3_arrive`
  (ORDER_READ → `a3_at_knock`, `a3_in_sallow`, opens `d_a3_home`). It plays whether or not a ride or B6c's midnight `a3_home`
  came first, and does **not** write `a3_route_home` (B6c's `a3_home_road` still writes foot, with its xp and decision; an unset
  route reads as on foot). **No world event at Knock** (B6e's lesson: waits at Knock in other tests list their events exactly).
  The scene reads the route (car, coach, carts, buggy, Wheel, foot), the water, the guild (and the hounds, "low and grey on short
  leads"), and Knock's standing (applause or closing doors: local, never karma); all seven companions speak.
- **Props have no conditions**, so the column's camp is people (Lowe or Reyes at the table, four wardens: the camp, the stand,
  the top of the lane, the apron), a trigger's description (`a3_camp`: tents, the table, the order under a stone, PRECINCT SUPPLY
  barrels, "nobody is cleaning a rifle"), and the runtime's place build (§9.5). **The hounds likewise** (§9.6): their handlers
  are placed; the hounds are text until the runtime's stand-ins. **The relocation car** is only said to be at the stand when the
  player rode it (B6c leaves it in the gate road otherwise); B6j decides how it comes for an order or a forced door.
- **Water** (`KNOCK_WATER`, first match): `drywells` (Dry Wells restored or freed) · `carts` (B6c's `a3_carts_water`) · `column`
  (**added**: ask Lowe for the column's barrels: no check at trust ≥ 20, else Speech 45, −10 an honest answer at Tollhouse 9,
  −5 his grief heard, +10 Knock already watered; Reyes the same at trust 15) · `pump` (**added**: Corin's windpump draws again,
  the foot valve lowered (Mechanics 40, −15 `pump_hand`, −10 `kn_valve`) or the sump dug (Survival 40, −10 Brawn 7); a failure
  leaves the other way) · `ration` (a cup a head). Maud, Afua and the arrival say which.
- **Maud** (`d_a3_maud`): the reunion (lame by `kn_maud_scarred`; "I watched you get down out of that" after the car), trust +10;
  topics once each: the hatch (four lockdowns: ten, twenty, the PC's age, now; she sits at it at seven), the water, the wardens
  ("men with guns who say good morning"), Linnet by fate, being at the hatch with her at seven (+5), what she wants at the door
  (alive, all of them; "I'd like to see a face, once": `a3_maud_wish`; +5). **The secret at trust ≥ 20** = home + seven o'clock
  + what she wants, so it comes only to a player who sat with her. **What the letter was** (decided here; the plan said only "a
  Cistern letter sold for medicine"): in the third lockdown, a winter, her mother's wet chest; a guild buyer at the stand paid
  in blue tablets for "anything with their hand on it"; one letter from inside **to her own mother**, never opened; her mother
  died in the spring anyway; and now she fears it was the first name the city had. Answers set `a3_maud`: `eased` (only with
  `tam_why`, the census, the reserves list or Pell's chart known: "the city has had their names from MOTHER's own returns") ·
  `forgiven` ("you bought her a spring") · `told` (silence, a hand). "Who was it from?" → "I never opened it" → **the player may
  promise to ask MOTHER (`a3_maud_letter_ask`): B6h's MOTHER can answer it** (suggested: she kept the letter's return, as she
  keeps everything; who wrote it is B6h's to decide, and should not be a plot-bearing reveal). Asked about the margin too early:
  "Old business. Not today."
- **Linnet** (`LINNET_AT`; `a3_linnet` = where met): **column** (she ran: a ward-cadet, "the Precinct takes cadets at sixteen if
  they can read"; "don't say anything about the driving" if she drove the car) with three choices: go to Maud (Speech 35 with
  her Act 1 memories), stand down under clause 30 (Speech 50, −10 having been to Maud, −10 Lowe's leave heard, ±; → `knock`,
  placed at home), or **stay in the column "so somebody in the grey knows Maud's name"** (`a3_linnet_stay`: **B6j may use her at
  the door**) · **dogs** (taken to Shale, the Dogs called: on the slope with them, a red rag over the stolen guild scarf; go to
  Maud) · **shale** (at Mags's: **not placed**; Shale's map was B6e's in use, and Linnet was never placed at Mags's in Act 1–2
  either (§18's P8 TODO); the tree has her `shale` nodes for whoever places her) · **knock** (stayed, or never asked: with
  Corin's yoke; "when this is done": `a3_linnet_after` road | maud). Maud's lines follow each.
- **Dace**: `guide` (the guild's guide, brass tag turned in: "a stranger wouldn't know which houses to go round") when the guild
  came, else `knock` (the post-house's new boards: "I owed her a house"); pay his 42 on Orme's book → `square` (he leaves the
  guild's party); Speech 45 (−15 forgiven in Act 1, −5 the Rib fought together, +10 condemned) → `quit`.
- **Corin** on the rise with a rifle (with `kn_corin_rifle`, "the other one", kept back from before): the well; the door: **hold
  the slope** (`holds`) or **come down** (Speech 40: `down`, placed in his workshop, rifle on the shelf; a failure is `holds`);
  Hale (guild here, Hale alive): "Maud decides what happens to Hale. It was her house" (`a3_corin_hale`, **B6g**); why he left
  the outriders (a door like this one; he held the horses; Hale went in).
- **Lowe** (`d_a3_lowe`, Reyes's own nodes when he is dead): the intro reads B6c's `a3_lowe_asked`, `lowe_met` (a stranger's
  full name-and-title otherwise) and the car; sets `a3_lowe_heard`. Topics: **attend** ("you, at the door, in the open... come and
  tell me, or stand on the apron and I will see you there; I will bring the column down the lane behind you": `a3_attend_how`,
  **B6j's entry**) · the water · the sixty names and Knock's ("Afua Danso, and her boy, who coughs") · grief (unless told in the
  car) · **the third word** (with `lowe_grieves` from Act 2: "Home." → memory `a3_third_word`: **B6j may lower the stand-down
  with it**) · the old promise (memory `designate`) · the cadet (clause 30) · the guild ("I have not read it. I am a slow reader":
  **B6g's paper meets this**). The senior warden Kress has a short tree (line six: "residents are not to be frightened").
- **The Grille in lockdown**: the first time, MOTHER through the plate: "{name}. Welcome home. A lockdown is in effect." Then
  once each: open the hatch ("resolved at the door"; she now logs Maud's attendance) · are they well (Tamsin still inside asks
  what the sky is doing, "not blue": answer → +5; else Pell asks after Afua's boy) · why ("a lockdown is not a refusal. It is a
  pause... until the designate attends. I have known for some time that the designate was you": a seed for B6h's letter, no
  more) · **Ines: the third no** (her mother's weld, Maud, now) **and the hatch offered** ("MOTHER holds the tray for whom she
  chooses": `a3_hatch_offered`, **B6h may lower the hatch route with it**); **added: the replies' copy told to Ines here also
  gives `a3_archive_promise`** (memory `a3_told_refusals`, not `player_wrote_refusals`: B6h's "+10 the PC never wrote" still
  reads the letter's absence) · Tamsin at the holes from the wrong side, Ines's hand on the plate.
- **Knock's others** (`d_a3_kn_r1..r4`): Afua (her boy, the Knit-Kit if the player still has one; Knock split: "you're the one on
  the card, you tell us") · Sim (three lockdowns in his life, MOTHER's slip "for you") · Binta (chalking the dry days on the
  tank; Tamsin's face) · Amos (the captain wrote his name in a book).
- **The forces' placements** (B6g writes the scenes): Petra by night (21–4) at the apron's dark west end with `npc_a3_u2/u3`,
  or `npc_a3_u1` leading when Petra is dead; gone once `a3_unwritten` is set (B6g may keep some through `burning`); Hale
  (`npc_kn_out_lead_a3`, alive under both ids, not `a3_hale` gone/dead) with the guild; Orme at her stand in every Act 3
  (`npc_kn_factor_a3`, trade kept). **`a3_forces.ts` is B6g's file now**: rewrite `d_a3_petra`, `d_a3_orme` (keep the trade
  option) and `d_a3_hale` whole; give the handlers and u2/u3 trees if wanted (they have barks), and their `hostileIf` for the
  Unwritten's fight.
- **Left to later slices, with their spots placed now:** **Tamsin in the door** (`a3_tam_door`, spot `tam_door` 27,42: B6j,
  whose scene she is in) and **the residents on the apron** after an opened door (spots `apron_1..4`: B6k, whose trees they
  need; their defs' own trees are the retired shelter opening's). One line each in `gen_knock.py`'s `A3_NPCS`.
- **For later slices.** **B6g:** `a3_lowe_guild` (Lowe hasn't read the paper), `a3_corin_hale` (Maud decides Hale),
  `kn_out_choice` is unread so far (how the outriders went: Hale's scene can read it). **B6h:** `a3_hatch_offered`,
  `a3_maud_letter_ask`, `a3_told_refusals`; MOTHER's "I have known for some time". **B6j:** the column's defs are hostile on
  `a3_door_fight` ∨ `md_fight` (Lowe's and Reyes's own defs are not: their `hostileIf` is `md_fight` only, so B6j adds
  `a3_door_fight` to them); `a3_attend_how`; `a3_corin` (Corin's def `ally` is still Act 1's `kn_out_fight`: B6j adds `a3_corin`
  = holds for the door fight); `a3_linnet_stay`; memory `a3_third_word`; `a3_column_water` (the captain's discretion already
  bent once). **B6k / B6d's suggestion:** Amos as Knock's keeper up the hill was not wired. **B6s (slide 4):** `a3_maud`,
  `LINNET_AT` (not `a3_linnet`), `a3_linnet_after`, `a3_dace`, `a3_corin`, `KNOCK_WATER`.

### B6o (built 2026-11-17, after B6n, while B6f's lane went on at Knock)
**Done, all of the slice:** `dialogue/a3_fire_ii.ts` (**its own file, not a3_fire.ts**: content only, no import of a3_fire.ts;
`lastNightsII(kit)` takes the fire's own helpers (`waysNodes`, `bySrc`) and returns the hub's three places, two start entries,
the leaving chain and 59 nodes, which a3_fire.ts builds into `d_a3_fire`; the B6b pattern of a spec as a function, so neither
file imports the other) · `tests/b6o.test.ts` (26). 69 nodes in all (the fire's 59, the Knock camp's 6, the two leavings' 4),
about 6,000 words (8,700 counting every text variant). No engine change, no map change. `npm run check`: see the report.
**Shared touches (small, local):** `a3_fire.ts` (an import; `Key`, `ID`, `SHORT` widened to the seven, `ROM_ON` typed on the four;
`const II = lastNightsII(...)` before `SIT`; `...II.sit`, `...II.start` after Kes's guild entry, `II.after(...)`/`II.settled` in
`after_guild`, `...II.nodes`; one header comment line) · `a3_conds.ts` (`ASH_LN_CROSSED`, `ODILE_PRICE_BROKEN`, `SARR_SPARED`,
`ASH_SELF_RISK` after `KES_NUMBED`; the registry's B6o block) · `openfield.ts` (an import, two start entries after Ash's `floor`,
the nodes spread at the end of `d_of_ash`) · `ninebridge.ts` (the same for `d_nb_odile`) · `ch1_cistern.ts` (an import, one start
entry before Tamsin's `camp`, the nodes spread at the end of `d_c9_tamsin`) · `tests/b6n.test.ts` (its exact "who sits at the fire"
lists now include the three; its guild-night walk has Ash's leaving after Kes's).

**How it plays (and where it differs from §7 and §8 B6o):**
- **The three at the fire**, by `WITH_YOU`, each offered while something is left to say (U7), each in their own voice and the B6n
  shape: (1) **the ways** as they see them (`odile_w_*`, `ash_w_*`, `nine_w_*` through B6n's `waysNodes` and `WAY_HELD`; B's means
  by source; never named as endings; Odile prices each against Imelda, Ash weighs each as soil and sky, Nine reads each as the
  record does, saying its own red line inside B's); (2) **the middle beat**, which for these three is not a red line in the
  ending (none has a new one): Odile's price, Ash's letter, Nine's one line; (3) **the last night**, as friends (none of the three
  can be loved: bible). Cross-talk across the fire from all seven (Kes and Odile on the coat, Wren on the girl's paper, Ash on the
  usurer's book and on law as a mask, Ilya counting the nineteen, Tamsin's sixty-one, Kes in the drains, Nine on the step below).
- **Odile** (opener by price and sheet). **Her price against Sarr's fate** (`a3f.odile.price`, always offered, said by
  `odile_price`): Sarr alive in **every** way up the steps (Treasurer on schedule under A1, of the Concern's world under C, of
  nothing under B, ruined in daylight and alive under D), so the price is covered whatever happens; what she wants beyond it is
  the shame, and she will not ask for it ("a promise is a sheet"). Variants: kept on the lane (`SARR_SPARED`), kept from the
  Brother's own knife (`ash_orders` = refused_late, Ash at the fire), no knife, `none`, `refused`, unset; **Sarr dead** (only when
  the price was never staked on her, else she has left): a grief, "(Let her be.)" only. Answers: "she'll answer for the riders,
  in daylight" (`a3_odile_word`, +3: D or E fits it) · "alive I can cover, the rest I can't promise" (+3) · "my business" (0; she
  never argues a closed sheet). **Her tab** (the last night, decided here: she keeps a tab on everyone, U8's floor line): read out
  by where her sheet went (torn, as B6e can leave it: "unwound, a credit to you both"; kept; player; nine; never got back), two
  lines ruled; "paid" (`a3_odile_last` = settled, +3) or "leave it open" (`open`, +5: "an after with you in it"). Her after, said
  in the reply: **torn → Shale** ("be ashamed in person": the `shale` end), else the eighth span's soup line (the `kitchen` end).
- **Ash** (opener: the self risk's one shell, his name for the player once refused, else "friend"). **The letter**
  (`a3f.ash.orders`, by `ash_orders`): refused / refused_late → the step below ("a brother of mine out past the lane... better with
  a blade": B6p's `npc_a3_u2`), answers: a word not to wear it (`a3_ash_word`, +3), glad of him either way (+3), don't (0) ·
  **warned** → "ask me again" (his tree's `choice_doubt` said "ask me again when I do"; the variant reads `seen ash.choice.no.low`):
  "No. Burn it" **at approval 40+ burns it here** (`ash_orders` = refused, `a3_ash_last` = burned, +10, his name said, decision
  `a3_ash_burned`), below 40 he cannot yet (`ash_not_yet`; the word is still noted); or the honest answer (+3), or "come to my
  face" · **undecided** → "what's the first thing you'll sign?" (`a3_ash_heard` = people +3 | water | unsure +2: **B6p reads it
  with what the hand does**; it decides nothing here), or burn at 40+ · **other** → "tell me not to, and it's you again": taken
  back at 40+ burns it; below, `ash_orders` → **warned** (the order back on the player, to their face); "I won't tell you" (+2);
  "go, then" (nothing changes) · **known, never answered** → his S4 question at the fire, with his tree's exact answers and
  effects · **never told** → at approval 35+ he tells it at the fire (`ash_orders_known`, `ash_orders_how` = told, knowledge
  `ash_unwritten`, +5) and asks the question; below 35 he keeps it ("if I have to, I'll tell it on the steps, to your face").
  **"Make it clean" taken back** (`a3f.ash.clean`, offered while `ash_stance` = clean and not yet taken back, any approval):
  `a3_ash_clean_back`, +5; U8's `ash_stance` is not rewritten. **New alias `ASH_SELF_RISK`** = clean ∧ approval ≤ 19 ∧ not taken
  back: **B6p's self branch should read it** (the warning is plain at the fire: he loads one shell). **The soil** (the last
  night, by `ash_gully_outcome`): spoken → north to the Gully with a spade, nineteen proper graves (the `digs` end); told →
  "now it's nobody's"; unsaid → he says the nineteen names to the fire himself (Ilya counts with him); grave → Doria's cairn and
  the nineteen beside it; unset → soil under stone. `a3_ash_last` = none, unless burned tonight (it stays burned).
- **Nine** (opener by how the recall ended: declined, stayed, court, bought "plus one Toll", hidden "NOT FOUND", fought, or the
  notice still at the gate; a hidden, unfetched Nine is at the fire, written off, as B6b suggested B6l should bring it). **Its
  line** (`a3f.nine.line`): the core destroyed (B) → it will stand at the core's door, say the record's one plea once, and
  withdraw; it will not fight, it will not help; the rest by stance (read aloud first / made lawful line by line). Word not to
  break it (`a3_nine_word`, +3) · honest (+3) · mine (−3). **"When it matters"** (U8 S3's kept log: `nine_log_kept` ∧ not given):
  it reads the first page and the last, dated today and empty ("the four hundred and twelfth"); **give me the copy** →
  `nine_log_given` (+ knowledge `nine_log_copy`), so a deputy Nine in the party is now a reader (`D_READER`) and the readiness
  act `nine` holds: an Act 3 alternate the §3 table did not list; or **read me the rest** (kept). Either way `a3_nine_last` =
  log, +5. Otherwise **the drains**, one last time (`a3_nine_last` = none, +3; "you have the copy; I have the drains").
- **The Long Night's red lines for the ones who were not there** (B6n's ask): **Ash** after a night against Openfield
  (`ASH_LN_CROSSED` = `ln_done` ∧ guild or ledger, B5d's RL_ASH) and **Odile** when her price is broken (`ODILE_PRICE_BROKEN` =
  `odile_price` = sarr ∧ `SARR_DEAD`, however Sarr died: wider than B5d's RL_ODILE, which reads only the night's knife). In their
  own trees (`ASH_LN_START/NODES` into `d_of_ash`, `ODILE_PRICE_START/NODES` into `d_nb_odile`): waiting → the first word; travelling
  → the first camp, not the road; **left on their own account (added)** → at the burial ground / the Span, so neither is asked back
  after it. Ash: `ash_gone`, `ash_redline` = longnight, −50; Odile: `odile_gone`, `odile_left` = price, −40. At the fire, gathered
  at the close without a word: they say it first, after Wren's and Kes's guild leavings (`after_guild` chains Wren → Kes → Ash →
  Odile → the fire). The ones who were at the night already went at its dawn (B5d).
- **Ash and Tamsin at Knock's first camp** (U8 Tamsin §6, the Act 3 return), once (`a3_ash_tam`): Act 3 open, on `c9_mouth`, at
  camp, both travelling, the door not yet settled (`a3_c9` unset); a start entry in **both** their trees, so it plays from
  whichever is spoken to first (`KNOCK_CAMP_START/NODES`). Turned round from Act 2: Ash now argues for the sky (open it; his
  brothers "have their own idea about that door", B6g's to tell), Tamsin for the door ("their door... if they open it, I'll hold it;
  if they don't, I'll stand in it"). He calls her Tamsin ("not child; he has learned that much" when the Act 2 quarrel was had,
  `seen tamc.ash`). Answers: her side (Tamsin +5, Ash −5) · his (Ash +5, Tamsin −5) · "sixty people who aren't at this fire" (then
  somebody had better ask them, through the Grille) · say nothing. Back to that tree's camp.
- **Not wired, said:** Kes telling the Lieutenant to stand down (§7; B6n left it to B6o or B6u): not B6o's three; left to B6u (a
  `d_an_lt` entry). No world event, no map change (the fire's prop is B6n's; Knock's camp is wherever the player camps there).
- **For later slices.** **B6p:** Ash's branch reads `ash_orders` as the fire leaves it (a warned or undecided Ash may have burned
  the letter tonight, an other one may be warned again), `a3_ash_word` (said they would not wear it), `a3_ash_heard` (what they
  said they would sign first), and `ASH_SELF_RISK` for the self branch. **B6r:** a vault leaving can name `a3_nine_word` (Nine at
  the core's door) as B6n's words; Nine reads D from the log given at the fire. **B6v:** Odile's slide reads `odile_sheet` (torn →
  `shale`), `a3_odile_last` (settled / open: whether her book has the player in it), `a3_odile_word` and `SARR_ALIVE`; Ash's,
  `ash_gully_outcome` and `a3_ash_last`; Nine's, `NINE_DEED` and `a3_nine_last`.

### B6g (built 2026-11-17, after B6f, while B6o was built alongside)
**Done, all of the slice:** `dialogue/a3_forces.ts` written whole over B6f's three holding scenes (7 trees, 81 nodes, about 14,000
words counting every variant; every node with a return line; all seven companions speak): `d_a3_petra` (the Unwritten: Petra's
nodes `p_*` and, Petra dead, Juniper Lowry's `j_*`, one tree so B6f's test still opens it), `d_a3_thaddeus`, `d_a3_rhoda`,
`d_a3_burning` (the fire, opened by the world event), `d_a3_orme` (the stand's trade kept, and the paper), `d_a3_hale`,
`d_a3_handlers`; plus `GRILLE_BURNED_*` (the dark Grille, spread into B6f's `d_a3_grille` as its first start entry) · world
event `a3_burning` · item `k_a3_intake` (Weighhouse Intake) · `tools/maps/gen_knock.py` → `maps/c9_mouth.ts` (confirmed
byte-identical first: the Unwritten's placement condition, Juniper's, Hale's boards placement, three triggers) ·
`tools/maps/gen_openfield.py` → `maps/openfield.ts` (confirmed byte-identical first: one condition, Petra not placed once
dead) · `tests/b6g.test.ts` (33). No engine change. `npm run check` green (824 tests; people gate red/stale as before).
**Shared touches (small, local, new lines only except where said):** `a3_conds.ts` (`PETRA_TAKEN`, `PETRA_DOWN`, `PETRA_KNIFE`,
`ASH_WITH_UNWRITTEN` after `HALE_HERE`: B5d's flags read only there; the registry's B6g block) · `a3_events.ts` (`a3_burning`) ·
`quests/a3.ts` (`q_a3_unwritten`'s first stage: journal, two optional objectives) · `items/story_a3.ts` · `dialogue/a3_knock.ts`
(an import, the Grille's first start entry, its nodes line extended) · `npcs/a3_knock.ts` (the Unwritten's `hostileIf`, Thaddeus's
and Rhoda's trees, the handlers' tree) · `npcs/openfield.ts` (Petra's `hostileIf`) · `npcs/knock.ts` (Hale's `hostileIf` gains an
Act 3 clause; the opening's fight unchanged, tested).

**How it plays (and where it differs from §2.3 20a–20b and §8 B6g):**
- **Why the Unwritten wait for the player** (the no-time-limit reason, said in "Why tell me?"): their rule is to say it to the
  face of the one it is done in front of (the stranger walked three weeks to warn the names), and to do it only with that person
  on the slope: "You're the only book we allow." Nothing happens on any night until the player answers them. Petra's face is bare:
  "There's no lens on this slope. The column didn't bring one. It has yours" (or, `PETRA_TAKEN`, the guild held their lamps to it
  and sold it to the city). Placed 21–4 at the apron's dark west end beside **the grate in the rock: the Cistern's air intake**
  (the shaft B6h's way in uses). Chalk on the apron by day (trigger `a3_chalk`, 5–21) starts the quest, as does their aim.
- **The aim:** burn the count, the Archive and MOTHER's panel, so sixty people are never counted or moved again ("the most anybody's
  ever given them"). How: down the grate at two, Thaddeus's bar, Rhoda's oil. **The turn** (made concrete): MOTHER turns the fans
  behind that grate; burn her panel and the residents must come out, into the column's car (or, the column gone, the city's next
  one): "the one time anybody opens that door from outside, it's us. For them." Told by Tamsin travelling ("That's the intake"),
  by MOTHER's own line at the Grille (`seen a3grille.well`), by a pump hand, or argued.
- **Answers** (`a3_unwritten`, `a3_uw_how`): **with_you** Speech 50 (the plan's −15 Ash refused in the party, −10 the poisoner to
  the cellar, −10 the rite, −5 Larkspur, +10 AGREED; **added** −5 the turn heard, −5 Rhoda's oil set aside, and for Petra only −5
  `PETRA_DOWN`, +10 `PETRA_TAKEN`): "We'll come east. Not for you. For the book." · **gone** Speech 40 (−10 the turn, −10 Rhoda, −5
  the rite, Petra: −5 her father at home, +10 taken; +10 Openfield burned/evicted/guild: "home is ash") · **stopped / lamp**
  Stealth 45 (−10 Night Watch, −15 Rhoda): lamp and oil lifted in the dark and poured into the goat pen's sand; one try (a failure
  sets `a3_uw_watched`) · **stopped / fought**: "(Draw on them.)", confirmed, `a3_uw_fight` = petra | juniper; the three hostile
  and placed at any hour until down; trigger `a3_uw_after` (anywhere on the map, not once-only) settles it; nobody steps into a
  fallen Petra's place mid-fight · **burning**: "I won't stand in your way", then "Say it to my face" and "Burn it." Each word is
  tried once; the others stay. **Rhoda** (who printed eleven thousand toll-card faces at the guild's press, "probably yours") can be
  brought, after the turn, to push the oil away (`a3_uw_rhoda`), which lowers all three of the non-violent routes.
- **The burning** (`a3_burning`, armed by burning ∧ the player at Knock; `at: { hour: 2, where: c9_mouth }`): the next time the
  clock has passed two with the player at Knock (engine semantics: arriving later fires it then, so `d_a3_burning` is written
  hour-neutral). Sets `a3_mother` = `a3_archive` = burned, news at Knock (−15). The Unwritten stay placed until it fires, then
  go. **The Grille is dark from then on** (Pell, or Tamsin if still inside: the hand pump, forty-year-old emergency stores, Ines
  sitting where the panel was; "I let them." remembered by Pell).
- **Deviation:** the Unwritten leave Knock unanswered once the reserve is out of the door (`a3_c9` opened or relocated); a door
  sealed again keeps them (their aim reads that). B_MEANS keeps its other alternates (the charge at the close, Bram, the Choir's
  night), so §3's guarantee holds; **B6w's no-lockout test should turn them before the door, or use the charge.**
- **Orme's paper** (only `GUILD_IN_PLAY`): CONCERN OF HALCYON — INTAKE (THE WEIGHHOUSE) — CONTRACT OF LABOUR, TEN YEARS — RESERVE 9,
  SIXTY PERSONS, AS SUPPLY — consideration to the Precinct at assessed value, paid by the guild as agent, **forty Tolls a head**,
  on the designate's signature as the first act of the chair ("The city calls them supply. The Concern calls them intake. Intake
  gets paid"). Her stake: the stand freehold and one in twenty (120 Tolls), because the hatch dies with the door either way. Lowe
  (`a3_lowe_guild`) has not read it because two lawful papers on one door would make him choose: "Everything on this slope waits
  for you." **`a3_guild`**: `paper_held` (taken: item `k_a3_intake`; given back → refused; can be taken again) · `refused` · torn on
  her counter (`a3_guild_torn`, refused, final; tollmen −10, Knock +6). **Added:** Act 1's `kn_owes_orme` called in: carry it,
  don't sign it, and we're square (`kn_owes_orme` false). Told what the Weighhouse is, she stops asking.
- **Hale** (only with the guild and alive; `kn_out_choice` read in his first words: gave | lied | caught | hid | beaten): the
  guild's possession man, who walks the sixty to the Weighhouse if the paper is signed. **The Weighhouse** said plainly by him:
  weighed, graded, a work line, ten years; the ones who don't come out are written "fulfilled", and some grades are not for work
  (`a3_weighhouse`; Kes names it Spare Parts). The post-house was "the due", his eleventh; Corin's door twenty years back (31 people).
  He came to stand in front of Maud. **Maud decides** (by her own state, with the player's word): answer → answered unless she is
  lame and has not said her letter (`MAUD_HARD`: "Not for you, love"); send off → gone unless she has said her letter (`a3_maud`
  set: "I sold a letter once... I don't get to send anybody off for what they did with paper"); "yours" → answered if she has said it,
  or walks straight and trusts the player (≥ 20), else gone. **answered:** he folds the guild's sash onto Orme's counter, rebuilds
  the post-house with Dace for nothing, and will walk nobody up the road (placement `npc_kn_out_lead_boards`) · **gone:** rides
  north alone · **dead:** drawn on (`a3_hale_fight`), trigger `a3_hale_after`.
- **The handlers** (`d_a3_handlers`): pre-Scald border hounds on a guild lease, the boards the Concern's ("a closed eye on the lid");
  if the paper is signed they walk beside the sixty "so nobody walks off" (`a3_hounds_for`).

**For later slices (what to read).**
- **B6h (inside):** `a3_mother` = burned and `a3_archive` = burned (no tray to hold, no Archive to open; the residents on the hand
  pump; the Grille dark: its first start entry is B6g's); `a3_uw_shaft` (the player has been shown the grate as the way down;
  after a burning it stands open with its bar on the concrete). D_ARCHIVE then rests on the copies or the opened door.
- **B6i (the ring):** with MOTHER burned, Bram has nothing to cut (`a3_bram_cut` / `asleep` moot); Teague and Ines read the fire.
- **B6j (the door):** the sold route reads `a3_guild` (`paper_held`: the folder is in the pack to sign at the door; `refused`:
  suggested, Orme may offer it once more at the door; `a3_guild_torn`: no sold route) and should say its cost through
  `a3_weighhouse` if known. With `a3_hale` = answered there is no possession man (the handlers walk them, or the guild sends to
  Ninebridge); dead or gone likewise. The Unwritten are not at the door (with_you: gone east; otherwise answered or still waiting
  by night). The guild's handlers and Hale are not hostile in the door fight unless B6j makes them so.
- **B6k / B6s (Knock after, slide 4):** `a3_hale` (answered: the post-house rebuilt by the man who burned it; the plan's
  `kn_posthouse_burned` "rebuilt or not" reads this), `a3_mother` = burned for MOTHER's line, `a3_uw_how` for the apron.
- **B6l (the close):** with_you places **Petra, or Juniper (`npc_a3_u1`) if Petra is dead**, and Thaddeus and Rhoda.
  **B6p:** the blade is Thaddeus (`npc_a3_u2`); he is dead after `a3_uw_how` = fought, and with Petra's people when with_you.
- **B6w:** `a3_unwritten` = with_you from the hostile fixture: Speech 40 is enough there (the poisoner given to the cellar).

## Defaults taken for the open questions (coordinator, 2026-11-17; the owner may override)
1. After the ending: epilogue, credits, then the title screen; the named autosave at the point of no return stays
   loadable ("play the last stretch again"). No post-ending free roam in v1.
2. Epilogue length: keep the 27 slides as the full set, but show only the slides whose subject the player met
   (most games show 12–20); every slide skippable, the whole sequence skippable after the first.
3. Ways to finish: not listed by name. Before the climb, the notebook's "what you hold" page shows allies, items and
   standing; companions voice what they think is possible. The choice itself is made in the scene.
