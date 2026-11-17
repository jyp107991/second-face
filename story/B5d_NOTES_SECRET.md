# B5d — the Ashlands and the Long Night: build notes (SECRET, never quote to the owner)

Part four, the last, of B5 "Act 2 wilds" (B5a the Rail Corridor, B5b the Drowned Shore and Carrick, B5c the Teeth mines and
the Northern Wet). Plan source: STORY_PLAN "Build notes — B5" (B5d: the Ashlands, `lm_ash_01` and new sites — a dead base, a
kite field, the hound reserve seen from a ridge; remnant machines; *A Kite Day*; a pre-Scald board that finishes
`q_rc_engine`'s open route; **beat 17 `q_a2_longnight`**: Choir against the Tollmen over Openfield's stores, the Ledger's
eviction order reading `prec_unrecorded`, the Concern backing the Tollmen, the exclusive alliance — Choir / Tollmen–Concern /
Ledger / a truce on Speech 75 and two favours — keystone 8 resolved, keystone 7 arrested as the eviction's first act and
carried west on the Line, `rc_line` / `rc_pilot` / `rc_box_nospare` deciding where the car stops). §9 keystones, §13 hard
choices, CHARACTERS §H (`npc_ash_01`, "the Lieutenant": a dormant hound command unit, bargained with by Kes or Nine), WORLD
SECRET (the Ashlands' reserve: the Concern's last army).

Ids: the Ashlands `an_*` (maps `an_spindle`, `an_kelso`, `an_hall`, `an_pemberton`, `an_saddleback`, `an_glass`; NPCs
`npc_an_NN`, hired guns `npc_an_gN`, road people `npc_an_wN`; flags `an_*`; quests `q_an_*`; dialogues `d_an_*`, road
`d_re_an_*`; leads `l_an_*`, conclusions `c_an_*`; items `j_an_*`, `k_an_*`), the Long Night `ln_*` (NPCs `npc_ln_*`, flags
`ln_*`, quest `q_ln_calla`, dialogues `d_ln_*`, leads `l_ln_*`, conclusion `c_ln_three`, item `k_ln_order`) and the beat's own
quest `q_a2_longnight`. Settlement `spindle`. The bible's `npc_ash_01` (the Lieutenant) is built as a prop in a rack (`an_lt`,
talk tree `d_an_lt`), not an NPC: the people rig has no machine body (as with the digger in B5c and the hound on the salt pan).

Content: `tools/maps/gen_an_ashlands.py` → the six maps (walkability and reachability checked); `npcs/an_ashlands.ts`,
`npcs/ln_longnight.ts`; `dialogue/an_spindle.ts` (Spindle, the picking runs, the kite day's Spindle half, the ends of both
Ashlands lines), `dialogue/an_kelso.ts` (Kelso, the hall, Pemberton, Saddleback, the road), `dialogue/ln_longnight.ts` (the
envoys, the order, the table, the night, the car); `quests/b5d_ashlands.ts`; `items/b5d_ashlands.ts`; `world/b5d_ashlands.ts`
(leads, conclusions, events incl. the muster, encounters); tests `tests/b5d.test.ts`. Shared edits: `world/map.ts` (the
Ashlands' four locations and five routes; `lm_ash_01` renamed from "Cratered base" to Kelso and bound to its map),
`world/settlements.ts` (`spindle`, Dry Wells' road), `world/sites.ts`, `rules/families.ts` (Kwarteng), the registries,
`tools/maps/gen_openfield.py` (the Long Night's people, props and triggers at Openfield; the Choir's houses after an eviction),
`tools/maps/gen_rc_corridor.py` (the warden car at West Halt), `tools/maps/gen_md_docks.py` (the warden car at Carrick),
`dialogue/rc_yard.ts` (Ida names the army's board; Dorcas takes it) and `quests/b5_corridor.ts` (`q_rc_engine` stage
`ashlands`). No engine change.

## Found history (coherent; used in the text)
Before the Burn the plateau east of the Sallow was the bloc's eastern border belt, the **March**, held by machines under
contract to Halverson Defence Services (the Concern's name before it took that one): hounds on the ground, kites in the air,
run from **Kelso** (KELSO FIELD — MARCH COMMAND), the army's forward depot and airfield, a spur off the Line to it, and a
wind farm and a solar farm (the **MARCH GRID**) to power it. The week of the Burn the rival bloc's strikes fell on the March:
the craters and the glass. The last order logged at Kelso: HOSTILITIES SUSPENDED; RESERVE (KENNEL 7) TO DORMANCY; COMMAND UNIT
LT-7 TO HOLD RESERVE DORMANT AND AWAIT LAWFUL COMMAND; SITE PATROL TO CONTINUE. LT-7 has held for ninety years, offline, so
pre-Scald. **Kennel Seven** is the reserve: 412 border hounds asleep in cradles under netting in a valley past **Saddleback**
ridge. Its kites patrol it and drink at dusk on **Pemberton**'s panels (PEMBERTON SOLAR — MARCH GRID — UAV RECHARGE), whose
inverter runs a beacon that calls them home. Kelso's **patrol** (three heavy hounds) lies in the motor pool's shade by day,
charging, and walks the apron by night; a maintenance credential (the Concern's white "waking card") wakes it to escort the
holder. LT-7 answers the Concern's credentials as *maintenance* only: maintenance may wake the patrol, never the reserve; it
has refused the Concern's command nine times in ninety years, which is why the Concern wants it **recovered intact** (to
rewrite what it calls lawful at Halcyon). The army bought its yard engines from somebody else: Kelso's shunter, ARMY 3, has a
pre-Scald board with a crown over a gear and nobody in it (the same make as the salt pan's hound in Act 1).

**Spindle**: the pickers' camp at the plateau's western edge, in the service yard of the March Grid's wind farm (one tower,
TURBINE 31, bladeless: the spindle) and a pre-war school (STALLARD PRIMARY). About forty people. Its laws: names on the board
before you go, ticked when you come back; the black flag on the tower on a kite day, when nobody goes out; Hester weighs
fair. Its well's pump runs on a cracked board.

## What Sleeps at Kelso — `q_an_kelso` (the Ashlands' line; Witcher standard; four ends, two without violence)
*Hook:* Spindle's board: four names (MATEI, SUNNIVA, OLU, DRAGOS) on a Kelso run in the spring, never ticked; Hester has
shut Kelso; the Concern's contractor **Benedikt Sorlie** in the school's east room offers 300 for a guide into the hall
("a board recovery").
*Investigation:* **Parveen Rao**, the one who came back (dress her glazed palms, Medicine 30 with a bandage, or Speech 40):
Matei held Sorlie's card to the door and the three stood up (`l_an_card`); the dead on the apron with the card still in
Matei's hand (`l_an_body`, `k_an_card`) → `c_an_card` (`an_card_known`); the tower's log (Science 35: `l_an_dormancy`) and the
view from Saddleback (`l_an_reserve`) → `c_an_reserve` (`an_reserve_known`); Sorlie's work order (Speech 50, or his field
case picked at night, `k_an_order`: RESERVE AUDIT — KENNEL 7 — COMMAND UNIT TO BE RECOVERED INTACT … LOSSES OF LOCAL LABOUR
TO BE COSTED TO THE CONTRACT; `l_an_order`) → `c_an_concern`. **Radu Ilie**, the hound-keeper with the tame hound **Pidge**
(her lineage burned out of her by a near-miss: nothing can call her), gives the patrol's habit (`l_an_patrol`,
`an_day_route`) and lends Pidge for a day's crossing (Speech 35, or 30 Tolls).
*The way in:* the apron by day (the long way round the craters, Survival 40; straight across, Stealth 45; at Pidge's heel, no
check; +15 once the patrol is alerted), learned once (`an_apron_ok`); by night the apron turns everyone back (the trigger);
the blast door by the manual crank (Mechanics 45), Kes, or a grid link (Science 50); the white card wakes the patrol
(`an_kelso_alert`), exactly as it did the four.
*Turn:* the thing in the hall's rack is the reserve's command; the Concern wants it to wake its last army; the four died
because Sorlie sent them in with a card to see what got up, and costed it.
*Choice* (`an_kelso`) at the rack (`d_an_lt`):
- **held** (T, no violence): "no lawful command survives" (Speech 50: −15 Nine with you, −10 Kes, −10 its own terms known,
  −5 the log, −5 the reserve seen), or **Kes** in its dialect, or **Nine** unit to unit (no check either way): RESERVE SEALED
  AGAINST ALL AUTHORITY. `an_key` = none, `an_reserve` = sealed, `an_kelso_quiet` (the patrol lies down for good),
  `an_sorlie` = gone; Concern −15.
- **taken** (X, no violence): the core pulled (Mechanics 50; −10 Science 50): `k_an_core`, `an_key` = player, `an_reserve` =
  player, quiet. Sorlie stays and will buy it for 300 (`an_core_sold` → `an_key` = concern). Hounds on the glass lie down for
  the core; in the Long Night it can make the guild's hounds lie down.
- **broken** (F/X): powder ×2 or Brawn 7: `an_reserve` = leaderless, `an_feral` (the patrol walks off; feral hounds on the
  glass; the crater band harder).
- **sold** (B): guide Sorlie in (`an_guiding`; he waits at the stair) and stand aside: 300, `an_key` = concern, `an_reserve`
  = concern; Concern +15; the companions' worst (Kes −25).
- Sorlie in the hall can also be sent home with his own order (Speech 55: −10 holding it, −5 read, −5 the card's work known,
  −5 its terms known) or fought (`an_sorlie_fight`, `an_sorlie` = dead, `an_concern_marked`); at Spindle he can be drawn on
  over the four. Telling Hester what his card did (or what he paid her grandson for) puts him out of the school to camp at
  Kelso's gate (`an_sorlie` = out) and chalks the four DEAD AT KELSO — A CARD THEY WERE GIVEN (`an_board_chalked`).
*Visible:* the board, the east room (swept), the gate's camp, the patrol's posture, the rack and its screen, Saddleback's
view (lamps out over the cradles; men in grey among the rows; lenses turning to the ridge; empty cradles).

## A Kite Day — `q_an_kite` (side quest; four ends)
*Hook:* the first ten o'clock the player is at Spindle after meeting Hester, the flag goes up (`an_kite_day`, world event that
waits for the player): her grandson **Kwesi Kwarteng** (16) went to Pemberton's panels at dawn. Nobody goes out on a kite
day. Kwesi waits in the inverter house, pinned, for as long as it takes (no time limit).
*Investigation:* **Ingmar Lund** on the tower (`l_an_kites`; the dusk window); Kwesi's cot: a month of kite turns scratched
on glass (`l_an_kwesi_map`) and a Concern scrip coin (`l_an_scrip`) → `c_an_kwesi` (Sorlie paid him to map how the kites
guard the valley); the inverter (`l_an_inverter`) → `c_an_eyes`; a dead picker's notebook at Pemberton (`k_an_notebook`, a mod
for the wait and the array band).
*Turn:* the kites are the reserve's eyes, fed by Pemberton's inverter; the boy was out there on the Concern's coin.
*Choice* (`an_kite`): **waited** (Survival 40; fail = home hurt, `an_kwesi_hurt`) · **dark** (cut the beacon, Mechanics 45:
`an_kites` = down — the plateau open to the pickers, the array band easy — and `an_reserve_blind`: nothing watches Kennel
Seven) · **shot** (Firearms 50: two kites down, a kite's board, `an_kelso_alert`) · **left** (`an_kwesi_dead`; the quest
fails; Hester's trust −40). Cutting the inverter before any kite day also brings the kites down (`dark`, no boy to fetch).

## A Board for Dorcas — `q_an_board` (finishes Yard Nine's open route)
*Hook:* Ida at Yard Nine (Dorcas cold): "Is there a board with nobody else in it?" → Halina's spare, or the army's yard
engine at Kelso; or Radu at Spindle. *Investigation/turn:* the shunter's plate (a crown over a gear; Kes: "nobody in there");
pulled quietly by day (Mechanics 40; a bang lifts the patrol's heads and costs an hour). Sorlie would buy it to keep it in a
drawer ("we prefer the Line to need us"). *Ends* (`an_board`): **ida** (Dorcas fitted at Yard Nine: `rc_engine` = ashlands,
no channel, Four Ways keeps its spare, so no `rc_box_nospare`; `q_rc_engine` stage `ashlands`; the north track's timber train
runs) · **spindle** (Hester's well pump: clean water, `an_well_clean`, the room free, 60) · **sold** (120 to Sorlie).

## Activities, transport, encounters
Picking runs at Hester's table in three bands, three finds each then a thin wage (scarcity): the edge (3 h, Survival 25:
glass and scrap, a lineman's cell, a watch on a wrist 25) · the craters under Kelso (5 h, Survival 40; −15 Selin's map, −5
iodine, +10 feral: boards and wire, a pristine hound controller, a dressing station's flush and 35) · Pemberton's array (6 h,
Science 45; −20 kites down, −10 the notebook; only after the kite day or once the kites are down: two cells, a kite's board,
40). Wages 3/6/8. Hester buys everything; Delphine sells iodine and flush; Radu and the road's pickers trade; a room to let
(25, a safehouse). Hunting 0.2 at Spindle. Transport: on foot (Dry Wells – Spindle, Spindle – Kelso / Pemberton, Kelso –
Pemberton / Saddleback); the tower's nacelle shows Kelso and Pemberton; the Kelso signs reveal Saddleback and Pemberton.
**Remnant machines on the glass** (region `ashlands`): kites by day (an hour flat on the crust) or a fallen one once they are
down; a pre-war convoy truck on its loop; a warden walker calling curfew at dusk; a glass storm; a feral hound on a ridge
(with `an_feral`); a fallen orbital (salvage); on the roadside cell `an_glass`: a burned picker (Selin Aydin; dress her hands
for her crater map), a lone border hound at dusk (stand still, Grit 6; the core or the salt pan's controller; shoot its lens,
Firearms 50, `j_an_lens`; back away), pickers with a sled (Tadeo Ruano; trade).

## The Long Night — `q_a2_longnight` "Openfield's Long Night" (beat 17, critical; Act 2 closes at its dawn)
**The call** (`ln_call`): once `q_a2_spire` and `q_a2_openfield` are done, at the next eight o'clock: a letter from the
shrine, news on every road, the quest. Nothing at Openfield happens until the player is there. *(B4b hook: when the arcology
slice lands, the call may also want `q_a2_halcyon`'s beat behind the player, and the Concern's envoy should read `hc_offer` —
accepted: Roux treats the player as a contract citizen (the guild pledge cheaper, the truce +10); refused / feigned: Roux's
`dogs` line and the truce DC; and `kes_link`/`hs_leash_*` for the Leash spreading. Not read here: not on main.)*

**The eve** (arrival trigger at Openfield): the guild's wagons and riders on the lane east with **Imelda Sarr** on her
folding chair and **Lucien Roux** (the Concern's bond officer from Carrick) at a camp desk; **Captain Lowe** at the well with
the order and three wardens at the west end; **Mason** on a bench at the store's door; **Petra** at the shrine; and the
wardens reading the order's first name — **Sister Calla**, come from Shale to sit with the Choir — and taking her west to the
Line (`ln_calla_taken`, `q_ln_calla`). Where the car goes: held at West Halt (`ln_car` = west_halt) unless the guild holds the
Line with no pilot working and Four Ways' box still has its spare, in which case it runs straight through to Carrick
(`ln_car` = carrick).

**The papers.** The guild's: shares in the harvest bought a crate at a time from the Choir's children on the lane (reads
`of_seed_outcome`: chaff = half the shares are on dead seed, Sarr remembers; Barter at midnight +10, truce +5). The city's
order (`d_ln_order`, Lowe): the holding returned to the schedule, claims void against the city (Nine: a clause that cannot
void a lawful contract, only say so), stores to Precinct supply, **persons by `prec_unrecorded`**: `yields` — any person who
stands at the reading may be entered living and heard; `outside` — the city can neither move nor shelter them; they stay on
the holding without stores; `property` — removed with the contents as property to Precinct labour; unset — relocated on
schedule. The Concern's reason (Roux): Halcyon's seed vault (`l_ln_vault`). `c_ln_three` (futures + order + vault).

**The envoys' terms** (each reads Act 2): Mason (sit, never fight for seed; the paper's history; Calla — "the Line is not the
guild's everywhere"; the table) · Petra (the Unwritten's knife for Sarr in the small hours, because the list names her
Treasurer; talked down at Speech 55 — −15 Ash with refused orders, −10 `sky_rite`, −5 her father not asking, −5 Calla back —
or blessed, `ln_knife_blessed`) · Sarr (the claim; 250 and the guild's gratitude; warned of the knife → `ln_sarr_warned`, a debt,
she does not sleep on the lane) · Roux (contracts and terraces "with terms of service"; reads `an_key` / `nw_controllers` /
`an_reserve` = sealed — "somebody sealed it against us; we noticed" — and `dk_concern_billed`) · Lowe (the order in full by
`prec_unrecorded`; Calla on the docket, reads `ca_calla_listed`; the bill: `sk_pumps` = paid or `nw_sink_relief` — the Sink kept
its pumps, the Precinct short; `nw_precinct_short` — the truth about a dam; `ar_verdict` = agreed — "Designate", the order
handed to the player to read).

**The alliance** (`ln_alliance`, exclusive; base strength in brackets): **choir** (1) at Mason's bench · **guild** (1) with
Sarr or Roux (+250 Tolls) · **ledger** (2) with Lowe · **truce** at the common hall's long table (`d_ln_table`): needs **two
favours owed** (any two of: the Line's halts — `rc_line` halts/shared; `ds_boats_owed`; `nw_barges_owed`; `dk_stand_owed`; the
Shift — `hs_shift` won or `tm_shift` joined; the Court — `prec_unrecorded` yields or `ar_verdict` contested; `an_reserve`
sealed; `bw_dogs_hold`; Calla freed) and **Speech 75** (−3 a favour held, −10 Odile, −10 Nine with conscience, −5
`c_ln_three`, −5 designate, −5 `odile_sheet` = player, −5 Sarr warned; +5 chaff, +10 the Concern's pack walking); a failed
truce breaks the table for good (`ln_table_broken`) · **none** ("let it come as it is written").

**Who comes** (world events at the next dusk the player is at Openfield after the pledge; each adds to `ln_strength` and sets
`ln_came_*`, or `ln_against_*` when it stands against the player's side):
| Region / force | Choir | Guild–Concern | Ledger |
|---|---|---|---|
| the Line's halts (`rc_line` halts/shared, Chela alive and on the Line) | +1 West Halt's watch | −1 (won't carry riders) | −1 (won't carry wardens) |
| the twelve (`rc_stock` = openfield) | +1 | — | — |
| the guild's Line (`rc_line` = guild) | −1 forty riders | +1 | −1 |
| the Concern's paths (`rc_concern_paths`) | — | +1 | — |
| Number Four (`tm_shift` = joined) | +1 Desmond's miners | — | — |
| the Shift (`hs_shift` won and `ks_maren` lives / revolt) | +1 committee / +1 Rafe's armed | — / −1 | — / −1 |
| Bridgeward's Dogs (`bw_dogs_hold`) | +1 | −1 | −1 |
| kennel boards (`nw_controllers` guild / ledger) | −1 | +1 | −1 / +1 the city's hounds |
| Kennel Seven (`an_key` = concern) | −2 | +2 a pack off the March | −2 |
| Vasha (`vasha_fate` spared) | −1 | +1 her riders | −1 |
| the shore's oil (`ds_rig` = guild) | — | +1 trucks | — |
| unit nine (`nine_stance` conscience / deputy) | +1 / −1 | — | −1 / +1 |
| the designate (`ar_verdict` = agreed) | — | — | +1 |
| Calla freed (`ln_calla` = freed) | +1 | — | — |
Water and the Stand are **logistics**, not strength: on a thin Choir night the seed still escapes if the Line is free
(`rc_line` halts/shared or `rc_pilot`) and the Stilts' boats or the Stand at Carrick owe the player (down the delta into the
drowned town: `ln_stores` = shore) or the Wet's barges do (up the river to a loft at Sawtown: `north`).

**The night** (`d_ln_night`, one chain, started at Openfield after 21:00 once mustered; it pauses for a midnight fight and goes
on when the other side's three are down): **dusk** (the roll-call: who came, who stands against) → **midnight**, the player's
own act (+1 on success): Choir — hold the lane (fight), talk the riders' captain round (Speech 50; −10 Sarr warned, −5 Odile,
−5 `c_ln_three`; +10 forty riders, +10 dogs), sit in the lane (Grit 7; −1 Calla, −1 Ash), or make the guild's hounds lie down
with the core; Guild — stop Petra's oil (Reflex 7; failed: `ln_store_fired`), meet the order with the guild's paper (Barter
50; −10 Odile, −5 the void clause known; +10 chaff), or break the wardens' line (fight, `ln_city_warrant`); Ledger — read the
order yourself person by person (Speech 50; −15 `yields`, −10 Nine, −5 designate), hold the lane for the wardens (fight), let
the wardens clear (no strength), or the core; Truce — keep the night; None — watch → **the small hours**: Petra's knife (Choir
or none; not warned, not talked down): Ash with refused orders stands in it (`ln_ash_stood`, Sarr lives); Ash with `other`
orders *is* the knife (stop him by name, Speech 50, −15 approval ≥ 30; or let him: Sarr dead, `ash_orders` = carried, Ash goes
west with the Unwritten, `ash_gone`, `ash_unwritten`); otherwise get between (Reflex 7), shout for the riders (Petra taken,
her face in the lamplight, `ln_petra_taken`), or let it happen (`ln_sarr` / `ks_sarr` = dead) → **dawn** by alliance and
strength (strong ≥ 4, mixed 2–3, thin ≤ 1):
| Alliance | Strong | Mixed | Thin |
|---|---|---|---|
| choir | **stands**: store kept, Mason lives, Precinct short, city warrant | **scorched**: the guild burns the rows leaving; seed kept | **burned**: Mason in the doorway (Brawn 7 to pull him out, else dead); seed shore / north / lost |
| guild | **guild** (company farm; seed to Halcyon's vault; Mason walks out, `exiled`; the Leash spreads) | **scorched** (Petra fired half the seed; `half`; Mason exiled) — also strong with the store fired | **burned** between riders and wardens (Mason: Brawn 7) |
| ledger | **evicted** (orderly; store to the Precinct; guild off the Flats; Mason walks out alive) | **scorched** (the wardens burn the rows by the order's last line) | **burned**, as forecast (Mason: Brawn 7) |
Then the people under the Ledger by `prec_unrecorded` (`ln_people` = heard — forty-one faces given to the record,
`ln_faces_given` — / outside / removed / relocated). **truce**: stores split three ways, the eviction stayed a season at the
rail, the people stay, Mason lives; everyone owes the player and nobody trusts them (respect −10 with the Choir, the guild, the
Concern and the wardens). **none**: burned as written; Mason dead; stores to the Precinct; `ln_forecast_kept`.
**After**, in order: Calla's car goes west at dawn if nobody took her off it (`ln_calla` = taken, `ks_calla` = imprisoned:
keystone 7 as forecast) · Nine comes back from the well (`ln_nine_back`; conscience: eleven errors logged aloud; deputy: every
line made lawful that could be) · the red lines: **Ash** leaves for the guild or the city (`ash_gone`, `ash_redline` =
longnight) · **Wren** for the guild (`wren_left` = longnight) · **Kes** for the guild (`kes_left` = longnight) · **Odile** if
her price was Sarr and Sarr is dead (`odile_gone`, `odile_left` = longnight) · close: `ln_done`, `act2_done`.

## Keystone 7 on the Line — `q_ln_calla` "Calla on the Line"
At **West Halt** (the car on the platform road, `ln_calla_wh` and two escort wardens): `rc_pilot` → no pilotman of West Halt
will take it on and the halt walks her out (no check) · halts/shared with Chela on the Line → the watch hides her in the water
tower (Speech 40; −10 `rc_hw_trust`) · `rc_box_nospare` → the section's token never comes; lift her out after dark (Stealth
45; −10 Security 40) · the escort talked round to release her "to be heard" (Speech 55; −10 `yields`, −15 Nine with conscience,
−10 designate, −5 the order copied) · fight the escort (`ln_escort_fight`, wardens −20, `ln_city_warrant`). At **Carrick** (the
car at the buffer, `ln_calla_dk`): `dk_prec_passenger` → pay her fare at the Harbour court, 25 · else put it to Dahl at the
change of shift (Speech 50; −10 a past ruling for the player, −5 `yields`; sets `dk_prec_passenger`) · Kobby's cradle over the
dry river at night (Stealth 40, unless `dk_cradle` = cut) · fight. `ln_calla_how` = pilot | watch | lifted | heard | harbour |
cradle | fought. Freed before the night, she comes back to Openfield and counts for the Choir.

## Cast (frame narrow for women, broad for men; hair gritty and true to ancestry; no religious dress)
Spindle: **Hester Kwarteng** (58, npc_an_01, the weigher; want: the board ticked, nobody else lost to Kelso; fear: the glass
taking the boy; will not: go looking for the ones who do not come back, "nobody does"; changed by: the truth about the card,
told to her face; habit: hands flat on the table) · **Kwesi Kwarteng** (16, npc_an_02) · **Ingmar Lund** (46, npc_an_03, the
kite-watcher) · **Delphine Arcand** (41, npc_an_04, the doctor) · **Radu Ilie** (52, npc_an_05, the hound-keeper; Pidge) ·
**Parveen Rao** (34, npc_an_06, who came back) · **Benedikt Sorlie** (49, npc_an_07, the Concern's contractor; courteous,
costs everything, "losses are costed to the contract") and two hired guns (npc_an_g1/g2). The glass: **Selin Aydin** (29,
npc_an_w1), **Tadeo Ruano** (38, npc_an_w2). The Long Night: wardens (npc_ln_w1–w3), guild riders (npc_ln_r1–r3), Calla's
escort (npc_ln_e1/e2); everyone else is placed from their own slices (Mason, Petra, Sarr, Roux, Lowe, Calla, and those who
come: Chela, Yaw, Desmond, Maren, Rafe, Vasha). Kin: Kwarteng.

## Companions
Ash (the four's cairns; the Unwritten's knife: stands in it or is it; the red line at dawn; +10 Choir pledge) · Wren (the
contractor sent them to see what got up; the Dogs at the lane; leaves after a guild night) · Kes (the waking card's dialect;
seals LT-7 in its own tongue; the core "their leash in a bag"; Maren's note; leaves after a guild night) · Nine (the March in
the city's schedule; LT-7's clause is its own; unit to unit; at the well by stance; returns) · Odile (the work order's costed
clause; Imelda; keeps the truce's book; her price) · Tamsin (MOTHER's thank-you; the order's "relocation on schedule"; sits
with the Choir) · Ilya (counts the reserve; Vasha across the lane).

## Flags B6 (Act 3 and the endings) should read
**The alliance and Openfield:** `ln_alliance` (choir | guild | ledger | truce | none) · `ln_band` (strong | mixed | thin | truce
| none) · `ln_strength` · `ln_openfield` (stands | scorched | guild | evicted | burned) · `ln_stores` (choir | guild | half |
precinct | split | shore | north | lost) · `ln_people` (heard | outside | removed | relocated; ledger nights) · `ln_faces_given`
· `ln_precinct_short` / `ln_precinct_fed` · `ln_guild_evicted` · `ln_guild_holds_flats` · `ln_leash` (spreads) ·
`ln_city_warrant` · `ln_owed` + `ln_trust` (none) + `ln_eviction_stayed` (truce: Act 3's "logistics by alliance" gives a
truce no allies, only debts to call) · `ln_forecast_kept` · `ln_came_*` / `ln_against_*` (who came: Act 3's help home) ·
`ln_hounds` (stood_down) · `act2_done`.
**Keystones:** `ks_mason` (lives | dead | exiled; `ln_mason_burned`) — keystone 8 · `ks_calla` (free | imprisoned) +
`ln_calla` (freed | taken) + `ln_calla_how` — keystone 7 (her trial at the Court in Act 3 if imprisoned: reads
`prec_forecast_fine`, `prec_unrecorded`, `prec_refuse_benefit`) · `ks_sarr` (dead) / `ln_sarr` (lives | dead) — keystone 9
touched · `ln_petra_taken`, `ln_petra_down`, `ln_knife_blessed`.
**Companions:** `ash_redline` = longnight, `ash_gone`, `ash_orders` (+ refused_late | carried), `ash_unwritten`,
`ln_ash_stood` · `wren_left` = longnight · `kes_left` = longnight · `odile_left` = longnight, `odile_gone` · `ln_nine_back`.
**The Ashlands:** `an_kelso` (sold | held | taken | broken) · `an_key` (concern | player | none) · `an_reserve` (concern |
sealed | player | leaderless) — the endings' **hounds** modifier (dormant = sealed; woken = concern; yours = player;
leaderless = feral, nobody's) · `an_core_sold` · `an_feral` · `an_kites` (down) · `an_reserve_blind` (nothing watches Kennel
Seven: the Concern, or the player, can walk to it) · `an_kelso_alert` · `an_kite` (dark | waited | shot | left) ·
`an_kwesi_dead` · `an_board` (ida | spindle | sold) · `rc_engine` = ashlands · `an_sorlie` (out | gone | dead) ·
`an_concern_marked` · `an_well_clean`.

## Reads (built slices) and hooks
Read here: `rc_line`, `rc_pilot`, `rc_box_nospare`, `rc_stock`, `rc_chela`, `rc_hw_trust`, `rc_concern_paths`, `rc_kettle_fight`
(B5a); `ds_boats_owed`, `ds_rig` (B5b); `dk_stand_owed`, `dk_prec_passenger`, `dk_crane`, `dk_weighbridge`, `dk_concern_billed`,
`dk_cradle` (Carrick); `tm_shift`, `nw_barges_owed`, `nw_controllers`, `nw_precinct_short`, `nw_sink_relief` (B5c); `hs_shift`,
`ks_maren` (B4a); `prec_unrecorded`, `ar_verdict`, `ca_calla_listed`, `sk_pumps`, `bw_dogs_hold`, `vasha_fate`, `rustdogs_hostile`
(Meridian, Act 1); `of_seed_outcome`, `sky_rite` (Openfield); `nine_stance`, `ash_orders`, `ash_s2_done`, `odile_price`,
`odile_sheet` (U8). Not read (no hook needed yet): `dr_leven`, `hs_marked`, `tm_digger_concern` (Act 3: the Concern can call the
digger back), `nw_dam_strain` (Act 3).
**Open (B4b and P11):** `hc_offer` and the arcology's outcomes (above); Ash's and Odile's U8 stage-4 gates still sit on a
Meridian line (U8 notes said they would move to the Long Night's opening stage: not moved, their trees are unchanged; the
Long Night reads `ash_orders`, `odile_price`, `odile_sheet` as they stand); Wren's red line is wired here (she leaves after a
guild night), so P11 need not wire it again. Tamsin's red line is Act 3's.

## Hard choices
The rack (an army asleep for good, an army in your pack, an army sold, or nobody's army loose on the glass) · the kites (the
plateau opened to the pickers and the reserve's eyes put out, a boy brought home by patience, or two kites shot and the base
roused) · the board (Dorcas free of the channel, a camp's clean water, or the Concern's drawer) · the alliance (Choir:
Openfield and its seed against the Precinct's winter and the city's warrant; guild: order and money against the Choir's
dispersal, the Leash on the Flats and three companions; city: bread for the Precinct and the guild off the Flats against
Openfield emptied or burned and Ash; truce: everyone whole and everyone owed, against trust and allies) · the knife (the
Treasurer's forecast broken by murder, a woman's face given to the lamps, or a debt) · Mason in the doorway.

## Unity
No runtime change needed: the night is one dialogue chain started by a map trigger (`event: dialogue`), fights by `event:
combat`, arrivals by world events at Openfield; machines are props (`hound_dormant`, `machine`; Pemberton's panel rows are
`counter` stand-ins). Place builds for the four open sites and the two cells are P10 work; `npm run export` has not been run
for this slice (`places.json` still names `lm_ash_01` "Cratered base").
