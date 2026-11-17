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

### B6a — Act 3's spine and the shared conditions
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

### B6b — The fourth order, Nine's recall, Reserve 9 at the Court
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

### B6c — The road home and the muster
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

### B6d — Every dead radio (Signal Hill)
- **Create** `dialogue/a3_mast.ts` (`d_a3_hollow` for the Hollow at the camp, `d_a3_mast` for the mast and the aerial,
  `d_a3_station` for the voice in Act 3).
- **Touch** `tools/maps/gen_signalhill.py` → `maps/signalhill.ts` (Act 3 placements with `dialogue` overrides on the camp
  NPCs; the aerial section in the gully as a talk prop).
- **Reads** `mast_powered`, `relay_log_read`, `broadcast_amplified`/`silenced`, `bw_static`, `j_controller`, `j_tm_controller`,
  `ch_neural_link`, `inParty KES`, `a3_ally_wheel`, Signal Hill's camp flags (`sg_*`).
- **Sets** `a3_mast` = raised, `a3_mast_how`, `a3_mast_keeper` (hollow | wheel | knock).
- **Tests**: every route; the keeper choice; no route without its requirement.
- **Estimate** 1 h.

### B6e — Sheriff's last ride (Shale)
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

### B6f — Knock under the column
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

### B6g — Knock at night: the Unwritten, the guild, Hale
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

### B6n — Last nights I: the romances (Tamsin, Wren, Ilya, Kes) and their red lines
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

### B6o — Last nights II: Odile, Ash, Nine; Ash and Tamsin at Knock
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
- (empty)

## Defaults taken for the open questions (coordinator, 2026-11-17; the owner may override)
1. After the ending: epilogue, credits, then the title screen; the named autosave at the point of no return stays
   loadable ("play the last stretch again"). No post-ending free roam in v1.
2. Epilogue length: keep the 27 slides as the full set, but show only the slides whose subject the player met
   (most games show 12–20); every slide skippable, the whole sequence skippable after the first.
3. Ways to finish: not listed by name. Before the climb, the notebook's "what you hold" page shows allies, items and
   standing; companions voice what they think is possible. The choice itself is made in the scene.
