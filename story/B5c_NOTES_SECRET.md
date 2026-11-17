# B5c — the Teeth mines and the Northern Wet: build notes (SECRET, never quote to the owner)

Part three of B5 "Act 2 wilds" (B5a the Rail Corridor and B5b the Drowned Shore beside it; B5d the Ashlands and the Long
Night after). Plan source: STORY_PLAN "Build notes — B5" (B5c: Number Four Pit, a free pit worked by people who left the
Skirts, the Shift's reach, hunting and trapping in the Teeth; Sawtown, Ashby Dam, Low Landing, the barges; *The Dam* — the
Wet's water against Meridian's, reading `sk_pumps`; a timber camp's feud; a barge run; Yard Nine's north track carrying
timber when Dorcas runs, `rc_engine`; reads `hs_shift`, `ks_maren`, `hs_gate_shut`). WORLD §1.1 ("rivers were dammed to
cool them"), §1.4 (autonomous mining rigs still digging), §4.3 (rigs and arms), DESIGN (mining camp: spoil heaps, cranes,
bunkhouses, the foreman's law; river barges: cheap, slow, smuggling routes).

Ids: the Teeth `tm_*` (maps `tm_pit`, `tm_level`, `tm_trail`; NPCs `npc_tm_NN`, the Clean `npc_tm_gN`; flags `tm_*`; quests
`q_tm_*`; dialogues `d_tm_*`, road `d_re_tm_*`; leads `l_tm_*`, conclusions `c_tm_*`); the Wet `nw_*` (maps `nw_sawtown`,
`nw_dam`, `nw_gallery`, `nw_landing`, `nw_bank`; NPCs `npc_nw_NN`, wardens and reed boatmen `npc_nw_gN`; the rest likewise).
Settlements `number_four`, `sawtown`, `ashby`, `low_landing`.

Content: `tools/maps/gen_tm_teeth.py` → `maps/tm_pit.ts`, `tm_level.ts`, `tm_trail.ts`; `tools/maps/gen_nw_wet.py` →
`maps/nw_sawtown.ts`, `nw_dam.ts`, `nw_gallery.ts`, `nw_landing.ts`, `nw_bank.ts`; `npcs/tm_teeth.ts`, `npcs/nw_wet.ts`;
`dialogue/tm_pit.ts` (Number Four), `dialogue/nw_dam.ts` (Ashby), `dialogue/nw_sawtown.ts` (Sawtown), `dialogue/nw_landing.ts`
(Low Landing and the run), `dialogue/nw_river.ts` (the barges, the north track, the bucket line, the roads);
`quests/b5c_wilds.ts`; `items/b5c_wilds.ts`; `world/b5c_wilds.ts` (leads, conclusions, events, road encounters); tests
`tests/b5c.test.ts`. Small edits to B5a's generator: a north-track sign at Yard Nine and the bucket line's foot at East Halt.

## Found history (coherent; used in the text)
**The Teeth.** Before the Burn the Halverson Concern's chip works in the caldera were fed tin and tantalum from the
Concern's own pits on the Teeth's south face, numbered outward from the works: Number Six is the Skirts' pit. **Number
Four** sits lower, above East Halt, joined to the Line's cutting by a pre-war aerial ropeway, the **bucket line**, that let
ore down in buckets on a cable. It closed in the Charter Wars (the Concern's phrase: RECOVERY NOT ECONOMIC), its lower level
flooded, and its headframe stood dead seventy-five years. Fifteen winters ago **Ragna Holm**, the Lodge's winchwoman, walked
a dozen debtors out of the Skirts over the col in snow and found it. They pumped the upper level, got the winding engine
turning on the snowmelt stream's wheel, smelt tin from the old pillars in a clay furnace and send it down the bucket line to
the guild's buyer at East Halt. Sixty people live there now, "the free pit": no scrip, no paper, no Window, no chrome that
listens — the pit's cutter, **Tova Lindqvist** (nine years an orderly at the Weighhouse), takes the Concern's chrome out of
everyone who comes over the col. The Shift sends its runaways to Four by the high path (the Shift's reach); the col is
watched by the Clean. In the old lower level, under the water the pit has pumped half down, an autonomous mining machine,
a **digger** of the Concern's lineage, still lies where it stopped, and wakes when the water goes off it.

**The Wet.** Rain country north of the Line. **Ashby Dam** was built in the last decade of the Scramble to cool the Ashby
compute campus downriver; Low Landing is the campus's old lower landing, its hall shells behind it. The dam and its water
right belonged to the Ashby water trust, whose heirs are the Tenured house of Ashby-Crane; the right is leased to the
charter city of Meridian for a hundred and fifty years, and the Ledger cannot void a lawful contract. The city's water
office writes the dam's schedule; the dam's gate controller (pre-Scald, air-gapped, the Ledger's own lineage) reads the
sealed schedule card a courier brings up the river every season and works the gates itself. The **Wexford** keepers (three
generations, paid by the city) keep the machinery, the lock at the west end, and the gauge. The lake behind it is Ashby
Water. The barges run from **Sawtown** at the lake's north-east arm (a logging town round a pre-war turbine sawmill, where
the old logging spur from Yard Nine, the **north track**, ends), down the Water, through Ashby's lock, down the river past
**Low Landing** (the barge port, the guild's barge office and its winch) to the city: down on the current with sweeps, up
behind the guild's tug, an old diesel launch that burns the Rigs' oil. Sawtown's logs are branded on the butt with each
crew's mark and sorted and paid at the **boom** (the sorting pens): the **Ridge** (the Brandvold crew, fallers on the steep
ground) cuts a crow's foot; the **Bottoms** (the Huaman crew, the flats on the west shore) cut a hook. The boom pays what the
mark says; a mark-cutter is put on the Water (rowed out to the middle and left with one oar: banishment).

## Number Four — `q_tm_path` "Taken on the Path" (the mines' main line; Witcher standard; four ends, two without violence)
*Hook:* the lamp board under the headframe: sixty brass tags on sixty pegs, and three names chalked under a line, TAKEN ON
THE PATH (three this year, each a runaway taken by the Clean at the switchback below the col before they reached Four).
**Desmond Achebe**, the Shift's runner at Four, waits for a family the Shift is sending over the col — **Chinwe Nnadi** and
her son **Ikenna** (12) — and asks the player to bring them down, because nobody else has come down alive this year. His
lines read `hs_shift`/`ks_maren`/`hs_gate_shut` (the strike on; won and Maren's stop; broken and Maren hanged, the Shift's
people streaming over; the revolt, the gate shut, the Clean doubled on the col).
*Investigation:* Tova cut the Concern's chrome out of all three taken (`l_tm_cut`: they could not have been tracked by it);
**Sachiko Mori**, the trapper, saw the Clean waiting at the switchback the dawn before the last taking, "like men told the
hour" (`l_tm_waiting`) → `c_tm_told` (someone at Four tells the Clean). The winding house's old field set and its log in
Ragna's hand: every dawn FOUR — CLEAR — SNOW ON THE COL; on the three nights before the takings, VISITORS (`l_tm_radio`:
by day the set's tuning, Science 40, or the log read over her hand, Senses 7; by night the log by the stove, Stealth 35; Kes hears the band: "that's not a weather net. That's
the Clean's.") → `c_tm_radio` with the board (`l_tm_taken`): it is the boss's set. **Gaspard Okoro**, the smelter: the guild
pays twelve a bar for Four's tin when Ninebridge pays six (`l_tm_price`, Barter 35 or Odile). Ragna's locker (Security 40
by night, or given in her confession): the requests card (`k_tm_requests`, `l_tm_requests`), a Concern card with names
and, after each, letters — K, L, C, H — and NNADI, C. as this season's line at its foot: Tova reads the letters (`l_tm_yield`: the
Weighhouse's yield grades: kidney, liver, cornea, heart) → `c_tm_parts`; `c_tm_arrangement` (price + requests).
*Turn:* the free pit is free by arrangement. The first winter the Clean came up the path for the dozen; Ragna went down
to meet them alone and came back with a bargain: the Concern lets Four stand (a way over the col is cheaper than a
burning Window) and buys its tin through the guild at double; when the Concern requests someone who comes over the col,
Ragna says VISITORS on the set at dawn and the Clean wait at the switchback. One a season, never more. She believes the
requested go back to the Window and their paper. They go to the Clinic floors: the requests are graded by yield.
Chinwe Nnadi is this season's request.
*The family* (`tm_family_in`): at the col hut at night once Desmond has asked (they wait there for the player): down the
path while the arrangement runs → the Clean step out at the switchback for Chinwe: fight them (`tm_clean_fought`, combat)
or stand aside (`taken`; the boy left; the worst); down the path once it is ended or exposed → `path`; down the **old drift**
under the mountain (Sachiko shows its mouth; Survival 40, or a hand lamp; `tm_level`) → `adit`, whatever the arrangement.
*Choice* (`tm_four`):
- **exposed** (K/T; no violence): the requests card read out at the lamp meeting (dusk, at the board, once the player has
  the card): Four votes; Ragna goes down the bucket line and is not seen at Four again (`tm_ragna` = gone); the set smashed;
  Desmond and Sachiko keep the board; the guild's double price ends (`tm_price_cut`); Four sells over the col to the Shift
  (`tm_shift` = joined; B5d reads it with `hs_sold_out` and `hs_shift` to know what is left of the Shift to sell to); the Concern marks Four (`tm_marked`).
- **ended** (T; no violence): Ragna made to end it herself (Speech 50; −15 the yield read to her, −10 the card in hand, −5
  Desmond's word, −5 Kes, −5 Ash): she says on the set FOUR — CLOSED — NO VISITORS, tells the lamp meeting herself, steps
  down and stays as winchwoman (`tm_ragna` = stays); the price ends; `tm_marked`; `tm_shift` as above.
- **kept** (B): Ragna's hundred and twenty for silence; the arrangement goes on (`tm_next_season`: a name a season, B5d/Act 3
  may read); Chinwe is taken if she comes down the path. The companions' worst after the fee.
- **fought** (F): the Clean's collection party at the switchback by night, while the family is due: killed (combat;
  `tm_clean_fought`); the Concern ends the arrangement itself (`tm_price_cut`, `tm_marked`); Ragna's secret stays hers
  unless also exposed; Four lives poorer and watched.
*Visible:* the lamp board (a new name under the line, or none; the chalk line rubbed out after exposed/ended), Ragna in the
winding house or gone, the set whole or smashed, the Clean at the switchback by night (or two cairns), Chinwe and Ikenna at
the bunkhouse (or the boy alone).

## Number Four — `q_tm_digger` "What Moved Below Four" (side quest; three ends)
*Hook:* Gaspard's pumps have the lower level half dry for the first time in seventy years; the face crew came up white:
something down there moved. *Investigation:* `tm_level`: the old level, the cage bottom, the pillars, the digger (a
pre-war autonomous cutting machine, Concern lineage, the closed eye on its housing; its lamp waking when the water goes off
its sensors: `l_tm_digger`); its log plate (it was stopped by an order, never switched off: WORK SUSPENDED — AWAIT
INSTRUCTION). *Turn:* it is waiting for the Concern's word; whoever speaks the Concern's language can set it digging, and
the Concern can too. *Choice* (`tm_digger`): **salvaged** (its controller pulled, Mechanics 45 or Science 45: a pristine
board worth a rifle, `j_tm_controller`; the lower level free to dig by hand) · **tamed** (woken to dig for Four: Kes, or
Science 55 with a grid link; Four's tin doubles; it is the Concern's lineage and can be called back: `tm_digger_concern`
for B5d) · **drowned** (the pumps stopped and the water let back over it; the level lost; no check).

## Ashby Dam — `q_nw_dam` "Low Water" (the Wet's main line; four ends, two without violence)
*Hook:* Low Landing's barges go down half-loaded on a low river ("the dam keeps the water"); the Ledger's water courier,
**Aurelio Santangelo**, with a sealed notice on the quay and at the dam: AUDIT OF DELIVERY — ASHBY — ELEVEN SEASONS SHORT —
INSPECTION PENDING (`l_nw_short`). The inspector, **Assessor Seventeen** (Nine's sibling, commissioned the same week), with two
wardens, waits at the gatehouse once the notice is known: the Ledger's patience ("the schedule allows for delay; it does not
allow for absence"). Nothing happens until the player lets it begin.
*Investigation:* the controller in the gatehouse reads LAKE — FULL — 100% and the schedule card: SPRING RELIEF TO PRECINCT
SUPPLY (CL. 31, GROWTH) — SHORTFALL MET FROM SINK RELIEF (`l_nw_clause31` by reading the footnote, Science 35; or Nine; or
the Sink's pump board known `sk_schedule_known`); the staff gauge painted on the dam's upstream face shows the Water at the
sixth mark of ten (`l_nw_gauge`); the gauge-well hut on the crest: the float wedged at the top of its well with an oak block
so the controller reads FULL (`l_nw_jam`; Hedda's key, Security 35 at night, or Mechanics 30 from the crest grating) →
`c_nw_lie`. The gallery inside the dam (`nw_gallery`, down the gatehouse stair): weeping joints and the crack's pins chalked
with sixty years of dates, widening a finger in that time (`l_nw_crack`: Science 40 or Mechanics 40 to read; Ilya counts
it); the keepers' log in the gatehouse (`l_nw_keepers_log`, `k_nw_keepers_log`): Hedda's grandmother, Year 60: NEVER ABOVE
THE SIXTH MARK. SHE WILL NOT HOLD IT. — M.W. → `c_nw_why`. The lease in a frame on the gatehouse wall: THE LESSOR WARRANTS
THE WORKS FOR THE TERM (`l_nw_warranty`, `k_nw_contract` copied, Science 30 or Odile). `c_nw_sink` (short + clause 31).
*Turn:* the dam has never been full and cannot be. For sixty years the Wexfords have kept the Water at the sixth mark with a
block in the gauge well, because the west gallery is cracked and the dam would fail above it, and wipe out Low Landing and
everything down the river. The city's water plan is computed on a lake that does not exist: every spring the Precinct's
supply comes in short, and Clause 31 makes the shortfall good from the Sink's relief pumps. The keepers' lie that saves the
Wet is one reason the Sink drowns.
*Choice* (`nw_dam`, at the inspection, `d_nw_inspect`):
- **truth** (T; no violence): the truth given to the assessor with the evidence (Speech 45: −15 Hedda tells it herself, −10
  the crack read, −10 the keepers' log, −5 Nine there, −5 Rhiannon's word): the record corrected, the plan recomputed on the
  real Water, Clause 31's spring diversion void (`nw_sink_relief`: next spring the Sink keeps its pumps), the Precinct's growth
  cut (`nw_precinct_short`), the river let down evenly at the sixth mark (`nw_river` = even: the barges run full); the keepers
  kept if Hedda told it herself (`nw_keepers` = kept), else fined and kept on (the record cannot hire anyone else); the
  mending: the warranty filed (`nw_mend` = house: Ashby-Crane must pay; a Crown consequence) or the city's own works (`city`).
- **hidden** (X/S; no violence): the indicator's drum re-spooled two turns at night so the float runs free and still reads
  FULL (Mechanics 45, or Rhiannon helps: −15; Kes cannot reach a Ledger machine, says so): the assessor reads a free float
  and a full lake: COMPLIANT. The lie goes on (`nw_river` = low), the Sink's diversion goes on, the dam unmended.
- **exposed** (B/default): the inspection begun with the block in the well, or the block shown to it for the city's record
  bounty (50): the keepers taken down the river for falsifying a city instrument (`nw_keepers` = taken; a case for the Court
  of Accounts later), wardens on the crest, the schedule enforced: the Water to be raised to its full line (`nw_dam_strain`:
  B5d's Long Night or Act 3 may break it), `nw_river` = city.
- **sunk** (F): the inspection fought on the crest: the assessor and its wardens destroyed (combat); the Ledger writes the
  unit LOST IN THE WET and marks the Wet (`nw_ledger_marked`); the lie holds; wardens −20.
*Visible:* the controller's display (FULL / 60% / COMPLIANT / SEIZED), the gauge well's block, wardens on the crest, the
keepers' houses lit or shut, Low Landing's barges full or light, the courier's notice, the news at the Sink.

## Sawtown — `q_nw_feud` "Marks at the Boom" (side quest; four ends, two without violence)
*Hook:* **Berit Solberg**'s notice at the boom: MARKS CUT. THE BOOM PAYS WHAT THE MARK SAYS. WHOEVER IS CUTTING THEM, THE
WATER IS WIDE. The Ridge's young faller **Cillian Moss** wants to burn the Bottoms' skid camp; the feud is two years old,
since **Mikkel Brandvold**, the Ridge foreman's son, died under a widowmaker that the Ridge says the Bottoms dropped on him.
Berit asks the player to find the mark-cutter "before the Ridge finds them for me".
*Investigation:* the north pen: crow's feet shaved off the butts and hooks cut over them with a scribe (`l_nw_marks`, Senses
6 or Survival 30); the boom's tally: the Bottoms paid for half again what four saws can fell (`l_nw_tally`, Barter 35 or
Odile); the boom at night (22–3): a lamp in a punt at the north pen, a girl with a scribe (`l_nw_punt`, `k_nw_scribe` if the
player takes it) → `c_nw_marker`: **Sigrun Brandvold**, the foreman's daughter, cuts her own family's marks; the cookhouse:
**Rufino Huaman** pays **Dorit Avraham** for a woman's board — **Wayra Huaman**, with a baby the Ridge will not look at
(`l_nw_baby`) → `c_nw_why_marks`: the re-marked logs' money goes to the Bottoms and Rufino gives it to Wayra and Mikkel's
child. The old cut on the Ridge (`d_nw_stump`): the stump's back-cut too low, a barber chair, felled from the Ridge's own
side (`l_nw_stump`, Survival 40); an old Ridge faller's word / Cillian's when pressed: **Arvid Brandvold** sent his son up
to fall the leaner in the rain to beat the Bottoms to the stand (`l_nw_order`) → `c_nw_widowmaker`.
*Turn:* the feud is a father's guilt and the thefts are a sister's charity: Mikkel meant to marry Wayra; his father forbade
it and sent him up in the rain; the Bottoms never dropped anything on anyone.
*Choice* (`nw_feud`): **truth** (at the crews' meeting in the mill at dusk; Speech 50: −15 the widowmaker known, −10 Sigrun
beside you, −5 the tally, −5 Ash): Arvid's fault said aloud; the feud ends; Arvid gives up the Ridge to Cillian and goes up
the hill alone; Wayra and the baby to the Ridge's table; the marks stop (`nw_marks_end`) · **quiet** (to Arvid alone, Speech
45, the fault known: he walks to the cookhouse and holds the child; the feud ends and nobody else knows) · **caught** (Sigrun
given to Berit without the why: put on the Water at the next dawn the player is in Sawtown, `nw_sigrun_gone`; the boom pays
the Ridge back; the feud goes on, worse; 60 from the boom) · **burned** (Cillian's way: the Bottoms' skid camp burned at the
next two o'clock the player is in Sawtown; the Bottoms take the next barge down, Wayra and the baby with them;
`nw_bottoms_gone`; nobody knows anything).

## Low Landing — `q_nw_run` "A Load for the City" (the barge run; three ends)
*Hook:* **Magda Kowal**'s barge *Patience* tied at the quay for half a season on the low river, its mooring owed to the guild;
**Factor Lorcan Pryce** offers her a sealed load for the city at a hundred and fifty; she needs a second hand at the sweeps
and a guard for the night reach below the Landing. *The run* (`d_nw_run`, a chain): the Chute below the Landing (Reflex or
Brawn at the sweeps), the night reach, where **Bryony Sedge**'s reed boats come out of the dark for "the dogs' brains" (talk
them off, Speech 40; pay 20; give one crate; or a shot over their heads, Firearms 40: nobody killed); the crates (`l_nw_crates`: the closed eye, KENNEL, a socket shaped
for a neck: Senses 6, Science 40, Security 35 to open, or Kes) and Bryony's word (`l_nw_kennel`) → `c_nw_kennel`: hound
controllers, consigned to the guild's floor at the Docks. *Turn:* the load is the Concern arming the guild in the city.
*Choice* (`nw_run`): **delivered** (B: the crates to the guild's man, 150; `nw_controllers` = guild — the Long Night's
Tollmen–Concern side has dogs) · **river** (put over the side in the deep reach: `nw_controllers` = river; Magda unpaid: the
guild seizes the *Patience* for her mooring at the next dawn the player is at Low Landing unless the player pays 80,
`nw_patience`) · **wardens** (the crates and the waybill to the wardens at the city gate: the Ledger seizes them, `nw_controllers`
= ledger, wardens +10; the guild knows the player's face, `nw_guild_wary`; the Patience paid by the city's record bounty).

## Transport (clever, and the network kept)
`net_barge` runs every morning at six (Sawtown's landing, Ashby's lock, Low Landing's quay; the city on the field map), 10 a
leg, boards by `bargeBoard()` like the Line's `lineBoard()`: the fares, the wait, the ride narrated (the Water, the lock, the
Chute, the tug), the field map; free with the sweeps (Brawn 6 or Survival 40, one ride), the guild's `toll_exempt`, or
Magda's token after the run (`k_nw_token`). The **north track**: at Yard Nine (a sign at the track's foot) and Sawtown's
railhead, the timber train runs when Dorcas runs (`rc_engine` set: 15 Tolls, the Line pass rides free; `contract` → "when
the Concern's paths allow"); without Dorcas it is a walk. The **bucket line**: Four's top station ↔ the cutting east of East
Halt (ride a bucket down, Reflex 6 or Ragna's leave; up while the winch runs, 6–18). The **old drift**: Four ↔ the col.

## Activities (region-banded; scarcity early)
Four: a shift at the face (Gaspard; the old pillars, no check, 6; the east stopes, Survival 40 or Mechanics 35, 9; the lower
level once the digger is settled, 14; three finds a band, then the wage); the trap lines (Sachiko; the low line Survival 25,
the col line 40, the ridge 55: meat, hides, a winter pelt; three finds a line); a bunk (safehouse, 20); Gaspard's store.
Sawtown: a day on the boom (Brawn 6, 8), riding the drive (Reflex 7, 20); the cookhouse (Dorit: food, a room 25). Ashby:
eels at the tailrace at night (Survival 30). Low Landing: a day on the winch (Brawn 6, 10), the chandler (Bao Tran), a berth
on a moored hulk (25). Hunting at camp: the Teeth 0.7, the Wet 0.6.

## Cast (frame narrow for women, broad for men; hair gritty and true to ancestry; no religious dress)
Four: **Ragna Holm** (61, npc_tm_01, the boss, winchwoman; want: sixty people alive and free; fear: the Clean on the path;
will not: let Four be taken; changed by: the yield letters; secret: the arrangement; habit: counts the tags every night) ·
**Desmond Achebe** (34, npc_tm_02, the Shift's runner) · **Tova Lindqvist** (47, npc_tm_03, the cutter, ex-Weighhouse orderly)
· **Gaspard Okoro** (45, npc_tm_04, the smelter, the store, the face) · **Sachiko Mori** (38, npc_tm_05, the trapper) ·
**Chinwe Nnadi** (36, npc_tm_06) and **Ikenna Nnadi** (12, npc_tm_07) · the Clean (npc_tm_g1, g2). Ashby: **Hedda Wexford**
(72, npc_nw_01, the keeper; want: the dam standing and the Wet alive; fear: the gallery; will not: raise the Water above the
sixth mark; secret: the block) · **Rhiannon Wexford** (24, npc_nw_02, her granddaughter, the lock; wants the city told,
because the crack needs the city's money) · **Aurelio Santangelo** (39, npc_nw_03, the courier) · **Assessor Seventeen**
(npc_nw_04) and two wardens (npc_nw_g1, g2). Sawtown: **Berit Solberg** (64, npc_nw_05, the boom) · **Arvid Brandvold** (58,
npc_nw_06) · **Sigrun Brandvold** (20, npc_nw_07) · **Cillian Moss** (27, npc_nw_08) · **Rufino Huaman** (50, npc_nw_09) ·
**Wayra Huaman** (22, npc_nw_10) · **Dorit Avraham** (49, npc_nw_11, the cookhouse). Low Landing: **Magda Kowal** (44,
npc_nw_12) · **Factor Lorcan Pryce** (52, npc_nw_13) · **Bao Tran** (57, npc_nw_14, the chandler) · **Emeka Uzor** (31,
npc_nw_15, on the guild's winch; knew Mateo Ibarra) · **Bryony Sedge** (40, npc_nw_16, the reed boats) and two reed boatmen
(npc_nw_g3, g4). Kin: Nnadi, Wexford, Brandvold, Huaman.

## Companions
Kes (the Clean and the col; the yield letters: she knows the Weighhouse; the Ledger's controller "deaf as a stone"; the
kennel boards; the digger tamed; +5 exposed/ended, −20 kept, −10 the family taken) · Tamsin (snow; the keepers lying to a
machine to keep people alive, like the fridge; −10 exposed at the dam; the baby) · Wren (the switchback: "Clean wait like
men who've been told"; the river as a road; −20 kept, −10 the family taken; the punt) · Ilya (counts the Clean; counts the
crack's pins; the fight at the switchback) · Odile (double the price; the warranty; the boom's tally; the waybill; +3 the
warranty filed) · Ash (Ikenna; the baby; the dead on the path; soil; −15 kept, +5 quiet/truth at the feud, −10 burned) ·
Nine (Seventeen its sibling; Clause 31; the record and the living: +10 truth, −20 sunk, −5 hidden).

## Flags later parts read (B5d's Long Night; Act 3)
`tm_four` (exposed | ended | kept | fought), `tm_shift` (joined), `tm_marked`, `tm_price_cut`, `tm_ragna` (gone | stays),
`tm_next_season`, `tm_family_in` (path | adit | taken | escorted), `tm_digger` (salvaged | tamed | drowned),
`tm_digger_concern`, `nw_dam` (truth | hidden | exposed | sunk), `nw_river` (even | low | city), `nw_sink_relief`,
`nw_precinct_short`, `nw_dam_strain`, `nw_keepers` (kept | taken), `nw_mend` (house | city), `nw_ledger_marked`,
`nw_feud` (truth | quiet | caught | burned), `nw_bottoms_gone`, `nw_sigrun_gone`, `nw_run` (delivered | river | wardens),
`nw_controllers` (guild | river | ledger), `nw_patience` (kept | seized), `nw_guild_wary`, and **`nw_barges_owed`** (the
Wet owes the player its boats: the river let down even, the *Patience* kept, or the feud ended in the open — the Long
Night's river logistics read it).

## Hard choices
Four (the free pit's price — a name a season — against sixty people's freedom; the truth costs the double price and puts
the Concern's eye on the pit) · the digger (a machine that doubles the tin and answers to the Concern) · the dam (the
keepers' lie that holds a cracked dam against the city's plan that drowns the Sink; the truth costs the Precinct its water;
the lie costs the Sink; exposure costs two keepers and strains the dam) · the feud (a father's guilt said aloud, said
privately, a girl banished, or a camp burned) · the load (money and a barge against dogs in the city).

## Motives (the rest of the cast; U8)
| Who | Wants | Fears | Will not | Changed by |
|---|---|---|---|---|
| Desmond Achebe | the Skirts' people over the col alive | walking into the Clean again and being let go | hang anybody at Four once it stops | knowing who told; he half knew |
| Tova Lindqvist | to take the Concern out of everyone who comes over | that she still writes the Weighhouse's letters in her sleep | put a knife in a spine she cannot see | reading the card: she wrote those letters |
| Gaspard Okoro | Four fed off honest metal | asking the guild why it pays twelve | pretend not to know the price is strange | the price cut: "we'll eat less; we'll eat" |
| Sachiko Mori | the mountain to herself and her lines | the ridge in a wet year | show the Clean her drift | a family needing it |
| Chinwe Nnadi | her son out of the Skirts | the Weighhouse's scale | be weighed again | learning she was requested |
| Rhiannon Wexford | the city told, so the dam can be mended | her grandmother in a cage | let the lie stand forever | her grandmother's consent, or her arrest |
| Aurelio Santangelo | to carry cards and never read them | the Wet's rain, the water office's displeasure | open a sealed card | nothing; he is a courier |
| Assessor Seventeen | the record correct | nothing it would call fear | void a lawful contract, or let a false reading stand | evidence: it takes its cap off for the truth |
| Berit Solberg | the boom paid by the mark, and no killing | the old days (the Water and one oar) coming back | ask why, once a name is given | being given the reason as well as the name |
| Arvid Brandvold | not to hear that he sent his son up in the rain | the cookhouse door | say his son's name | being told, alone or in the mill |
| Sigrun Brandvold | her brother's child fed | her father never looking at the baby | stop cutting while the baby goes hungry | someone else saying it so her father hears |
| Cillian Moss | somebody to blame for his friend | that it was the man he works for | sit still | being asked who sent Mikkel up |
| Rufino Huaman | his granddaughter fed, without asking where from | the Ridge's oil | blame the Ridge's boy | the tally read to his face |
| Wayra Huaman | to be let alone with the baby | the Ridge's eyes in the street | ask where her board money comes from | Arvid's hands held out |
| Dorit Avraham | two crews fed at one stove | a fight in her cookhouse | turn anyone away hungry | — |
| Magda Kowal | her father's barge kept | the guild's green on its bow | open a Concern seal herself | what is in the cases |
| Factor Lorcan Pryce | the river's book balanced | the guild's floor at the Docks | write down what it carries | the waybill at the wardens' post |
| Bao Tran | the town's ropes and stories | the dam going one spring | sell to the guild at the guild's price | — |
| Emeka Uzor | his last month walked | another breakage | let anyone else go on paper without warning them | thirty Tolls |
| Bryony Sedge | to stop what the guild does not write down | the winch again | keep what she takes | kennel boards in a city |
