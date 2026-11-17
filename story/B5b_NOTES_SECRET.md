# B5b — the Drowned Shore: build notes (SECRET, never quote to the owner)

Part two of B5 "Act 2 wilds" (B5a the Rail Corridor is built beside it; B5c the Teeth mines / Northern Wet / Ashlands;
B5d the Long Night alliance). Ids: maps `ds_*`, NPCs `npc_ds_*` (guild hands `npc_ds_g*`, road people `npc_ds_w_*`), flags
`ds_*`, quests `q_ds_*`, dialogues `d_ds_*` (road encounters `d_re_ds_*`), leads `l_ds_*`, conclusions `c_ds_*`.
Content: `tools/maps/gen_ds_shore.py` → `maps/ds_stilts.ts`, `ds_rigs.ts`, `ds_rig_leg.ts`, `ds_terminal.ts`, `ds_wade.ts`;
`npcs/ds_shore.ts`; `dialogue/ds_stilts.ts` (the village, the court, the false light, the dives), `dialogue/ds_rigs.ts` (the
Rigs, the leg, Blackcap, the road); `quests/b5b_shore.ts`; `items/ds_shore.ts`; `world/ds_shore.ts` (leads, conclusions,
events, road encounters); tests `tests/b5b.test.ts`. Plan sources: STORY_PLAN §12 (Wilds: *The Rigs* — a salvage dive
into a rig that still pumps; *Stilt Court* — boat law), §15 (salvage dives: the Rigs; fishing: the Drowned Shore), WORLD
§2/§4.3 (stilt villages, wrecked ships, oil rigs; "some still run on sun and habit; salvage camps grow round the ones that
can be made useful"), DESIGN's stilt village (houses on stilts and hulls over water; boats as streets; barter, boat law).

## Found history (coherent; used in the text)
Before the Burn the delta south of Meridian was diked farmland and a ferry-and-holiday town, **Port Ellery**; offshore,
three production platforms of the Saltire field (plates still read SALTIRE ALPHA / BRAVO / CHARLIE). The sea rose through
the Charter Wars; in the Dark Decades nobody pumped the polders and the dikes went; Ellery drowned to its second floors.
Fisher families came back in the Reknitting and drove stilts into Ellery's streets: **Gull Stilts** (the world location
`hamlet_shore`). Its streets are boardwalks: **the Gut** (the spine), the **Netlofts**, **Low Row**. **The Greta** is the
grounded car ferry *Margaretha* in the middle of the village: the **Stilt Court** sits on her car deck, and the **Book of
Water** (the boat law, written in her old logbook and added to for sixty years) lies on her chart table. **The Jesty** is
the drowned Majestic hotel's roof, the tallest thing standing out of the water. The **Ebb Steps** are the town hall's
steps, where the dead go out on the ebb in a weighted net (the shore's burial: the sea, as the Choir has the sky).
The city prints the tide tables (the Precinct sells them down the delta each season): the Ledger's foresight about the
water is never wrong and nobody on the shore minds it. (Theme, said once by Oona and never as a slogan: a written tide
is a mercy; a written person is not the same thing.)

**The Rigs** (`rigs`, offshore): **Hum** (Saltire Bravo: its gas turbine still burns its own gas and hums, its pumps still
lift crude; thirty years ago a salvage crew climbed aboard and learned to keep it running; forty people live on it, cook
the crude in stills into lamp oil and rig diesel, and sell a tanker a month to the guild for the Line's engines), **Lean**
(Alpha, listing; the shore's light burns on its derrick from Hum's gas, kept by a lamp-keeper) and **Stump** (Charlie:
legs only; the deep dive). **Blackcap** (`lm_shore_01`, hidden landmark east of the village): the drowned terminal's
last tank, its black roof standing out of the water like a cap; Hum's old export line runs under Gull Stilts to it.

## The main line — `q_ds_sheen` "Oil on the Water"
*Hook:* since the end of winter a sheen on the water, thickest east; the fish taste of it, the mussel beds are dying. The
player arrives on the day Kai Tanoa (11) goes out on the ebb: he dove under the Gut to free his mother's net and did not
come up. Lua Tanoa, his mother, a net-maker, calls the Stilt Court against the Rigs: by the Book, page nine, *a life for
a life, or a boat for a life*. Oona Brack, who keeps the Book, will hear it "when somebody stands up with what the water
knows". The hearing waits for the player (no date).
*Investigation:* the sheen to Blackcap (a fresh hose on the tank's rim, the guild's mark; the black water round it); the
night barge that loads there with no lamps (Mele, Sun-hee, the eelers); Kai's net, still on the bottom, caught on the old
line's weeping joint under the Gut (a roofs dive; `k_ds_net`, `l_ds_joint` → with `l_ds_kai` → `c_ds_kai`: the oil killed
him, not the sea); Hum's board (EXPORT — OPEN; the pressure falling for three months; Hamid Farouk thinks Hum is dying);
down Hum's north leg to the export valve (`ds_rig_leg`).
*Turn:* on the valve's wheel a fresh lead seal: **TOLLMEN — LINE ACCOUNT**. Nobody on Hum opened the line. Three months ago
the guild's diver (Marek Zielinski) went down the leg at night on Factor Cyprian Thorne's order, after Hamid refused to
double his tanker; with the line open Hum's pressure bleeds to Blackcap, where the guild's barge loads by night: two
tankers a month for the price of one, and the line's joints leak the difference under Gull Stilts. Thorne calls it
shrinkage. The tide post (the guild's floating post at the Greta's stern) is also the shore's only buyer of fish and
salvage and its only seller of salt, twine and medicine, and its anchorage money is half the court's widows' fund.
*Proof for the court* (each lowers the hearing's DC): the seal cut from the valve (`k_ds_seal`, −15), the post's tally
(`k_ds_tally`, Thorne's box, −15), the barge's manifest (`k_ds_manifest`, Blackcap, −10), Marek's word (`ds_marek_word`,
−10), Sun-hee's word (`ds_sunhee_word`, −5), Hum's pressure log (`ds_pressure`, −5), the guild line concluded (`c_ds_guild_line`,
−10), Kai's net (−5); the guild's anchorage +10 unless the player has named it to Oona (`ds_anchorage_named`).
*The hearing* (`d_ds_court`, the Greta at the turn of the tide, called from Oona's tree): **the guild** (Speech 50 with the
mods) → `ds_claim` = guild; the court asks *which boat*: the barge (`ds_barge` = pyre: Lua sends it out burning on the ebb
as Kai's boat; the guild casts off the tide post, `ds_post` = gone, salt and medicine dearer by the tide boat) · the price
of it and the seal off Hum (Barter 45: the guild pays 300 to the widows' fund, keeps its post humbled, `ds_post` = stays) ·
let Lua say (the barge). A failed argument adjourns the court ("bring me more of what the water knows"; it waits).
**The Rig** (blame Hum: no check with the net and the joint known, else Speech 40) → `ds_claim` = rig: by the Book anything
that floats and works is a boat; Hum is forfeit to the Stilts; the Stilts go out to take it: Hamid leaves with his crew
(Speech 55, or the player's word if he trusts them: `ds_hamid` = left; they go to the Skirts' Line) or fights (`ds_rig_fight`,
combat; resolved when he is dead). `ds_rig` = stilts. **The sea** (say the sea took him; Thorne's 150 makes it a lie) →
`ds_claim` = sea: the claim dismissed; Lua leaves for Meridian (`ds_lua_gone`); the sheen stays. **Silence** → sea.
*The valve* (independent): **shut** (Mechanics 35 or Survival 45 at the wheel: the sheen clears over the season,
`ds_fish_back` the next dawn the player is in the village; Blackcap goes dry) · **sleeved** (Leila's pipe sleeve `k_ds_sleeve`,
Mechanics 50: the line runs clean to Blackcap) · left open. On a `guild` ruling an open valve is shut by Hum's crew.
*Who holds Hum's oil* (`ds_rig`): `crew` (the line shut; the guild buys its one tanker from Hum's deck if its post stays) ·
`shared` (sleeved + the claim upheld + Hamid's terms + Oona's terms: Blackcap is the Stilts' and Hum's, half each) ·
`guild` (the claim to the sea, or the line left open in the guild's hands) · `stilts` (the court took Hum).
*The fight:* the night barge at Blackcap (`ds_barge_fight`: Silas Venn and two hands; the barge burned after,
`ds_barge` = burned; Thorne leaves the shore at the next dawn, `ds_thorne` = fled). The manifest is in the barge's box.
*Thorne's offer:* 150 Tolls for the widow's grief to "find the sea" (`ds_thorne_paid`). He never raises his voice.
*Visible outcomes:* Lua at her loft (or gone); the tide post at the Greta's stern (or its empty mooring); the barge at
Blackcap (or burned, or its ribs at the Ebb Steps); the sheen on arrival; the catch at the smokehouse; Hum's crew (or the
Stilts' men) on Hum; the guild's seal on the Book's page or on the valve.

## Side quest — `q_ds_court` "Stilt Court" (boat law; Witcher standard)
*Hook:* the first nine o'clock the player is in Gull Stilts after meeting Oona, a gaunt man walks in on the Meridian road
whom the Book wrote drowned two years ago: **Mateo Ibarra**. His boat, the *Curlew*, was found adrift at dawn with his coat
aboard; by page twelve (*what the water takes is the water's; a boat found on the water is the finder's*) it went to its
finder, **Rui Sousa**, who married Mateo's wife **Paz** a year later; they have a baby. Mateo wants his boat and his wife.
*Investigation:* the brand on his wrist (N-B 4471: a Ninebridge block lot; Senses/Medicine reads it, or he shows it); the
*Curlew*'s oars (Mele: they were found shipped and lashed — a drowning man does not ship his oars, `l_ds_curlew_adrift`);
the tide post's tally (the same box as the main line): IBARRA, M. — TAKEN AT THE GUT, NIGHT — ON WORD OF J. SOUSA —
FINDER'S FEE: HIS BOAT (`l_ds_finders_fee` → `c_ds_sold`); Rui himself (Speech 55, or the tally in his hands).
*Turn:* Mateo did not fall in; he was taken by the guild's debt-press for three hundred Tolls of salt and twine owed at the
post, on Rui's word, and Rui's fee was the boat. The drowning was the press's staging. Paz never knew.
*Choice* (`ds_court`, at the Greta): **written** (the Book as written: Mateo is the water's; Mateo goes out to Hum's crew, or
away) · **living** (Speech 50: the brand −10, the oars −5, the tally −10, Nine's word on a record that yields to the living
−5: a new page, *what the water gives back is not the water's*, `ds_prec_living`; the *Curlew* is Mateo's; Paz is asked,
and chooses by what she knows: with Rui and the baby if she does not know, alone with the baby if she does) · **sold**
(the tally or Rui's word read out: the Book's oldest sentence for a man who sells a neighbour to the press, *put off the
stilts*: Rui rows out of Gull Stilts for good, `ds_rui` = put_off; the *Curlew* is Mateo's; Paz stays alone with the
baby, and Mateo moors the *Curlew* under her loft and waits) · **quiet** (outside the court: the player buys Mateo Mele's old
skiff, 80, and he goes up the delta; Paz never knows). Placements read the flags; Oona's later lines read the new page.

## Side quest — `q_ds_light` "False Light"
*Hook:* the guild's salt barge lies broken on the Jesty's roof; two bargemen drowned in the fog; Thorne's notice on the
tide post offers 100 for the wreckers "who hung a lamp where no lamp is"; Yewande Coker's divers are stripping the wreck
by salvage right. *Investigation:* Lean's light was dark that night (its gas line cut clean: Ewan Tulloch, the
lamp-keeper, `l_ds_lamp_cut`); a lantern hook and soot on the Jesty's parapet (`l_ds_soot`); the Book of wrecks — five
guild barges on the roofs since the fish died, none in the eleven years before (`l_ds_wrecks`) → `c_ds_false_light`;
Amara Coker's burned fingertips (lamp glass; Medicine 35); the guild's salt in Coker's store (`k_ds_salt`).
*Turn:* the dive master. Since the sheen killed the fish Yewande has put out the true light and hung a false one on the
Jesty in fog, and her divers strip the guild's barges for the salt and twine the post sells at a usurer's price; it has
fed the Stilts all season. The two bargemen are the first dead. Her daughter Amara (14) carries the lamp.
*Choice* (`ds_light`): **exposed** (to Thorne: 100; she gives herself up to keep Amara out of it and the guild hangs her
from the tide post at the next dawn the player is in the village, `ds_coker_dead`; Ade Bankole takes the dive stage) ·
**court** (to Oona: Speech 45 for her — the sheen mitigates; a false light is a life for a life and there are two: the court
takes the *Sow* and sends her salvage to the bargemen's kin; she lives and teaches from Ade's boat; the guild is denied
its hanging) · **stopped** (privately, Speech 50; −20 once the fish are coming back) · **framed** (give Thorne Ewan, whose
light was dark: an innocent drunk hanged at the next dawn, `ds_ewan_dead`; Yewande knows and never looks at you again).

## The dives — `q_ds_dives` "Diving Ellery" (a repeatable activity; region-banded; no timers)
At Coker's stage (Yewande, or Ade after her) and Hum's Stump hatch. Slack water only (03–07 and 15–19: the city's table
says so); a dive takes three hours. Bands: **the roofs** (hose, 6 Tolls; Survival 25) · **the high street** (hose, 8 Tolls;
Survival 40; opened after a roofs dive) · **Hum's legs** (the crew's hatch on Stump, 10 Tolls; Survival 55; Hamid's leave,
`ds_rig_leave`, given once the line is settled his way or he trusts the player). Own diving bag (`t_rebreather`: Yewande
sells one at 120; one lies in a locker down the north leg) makes the hose dives free and lowers every DC. Each band has
three finds in order, then a thin base yield (scarcity): roofs → scrap and a tin · cloth and glass · a purse of pre-Burn
coins (25); street → the pharmacy (a board, two bandages) · the hardware shop (a repair kit, wiring) · the clinic's sealed
fridge (two holdfast, 20); legs → three boards and a cell · a pump controller (`j_controller`, worth a rifle) · two boards,
two cells and 40. A failed check is a dive that comes up early with nothing. Kai's net is a roofs find while the main line
is open. Ade charges more (10/12/14) and has no third band without the bag. Fishing at the smokehouse at dawn
(Hassan Benali): one fish that tastes of the rig while the sheen lasts, three and a wage once the fish are back.

## Transport
The tide boat (Mele Tui): a world network `net_tide` (Meridian – Gull Stilts – the Rigs, daily from six) and, in the
village, rides to the Rigs (4) and Blackcap (2, once known). The crew's launch from Hum back to the Gut. Blackcap is also
reached on foot along the old sea wall at low water (03–07, 15–19), and a skiff at its jetty rows back. Hum's north leg is
entered down its moonpool hatch (Survival 40, or the bag). Routes: Gull Stilts – Blackcap (marsh, 8 km). The road between
Meridian and the shore crosses the drowned delta on the old dikes (`ds_wade`, the roadside map).

## Road and water encounters (region `drowned_shore`)
Passing: a sea fog on the dike (an hour); the tide over the causeway (wading); the tide line of pre-war plastic (once);
a lamp moving on the drowned roofs at night while the false light is open (a lead). Stopping on `ds_wade`: eelers on the
dike (Winona Crabbe: eels for water, the sheen far up the channels, the night barge); the guild's debt-press with a roped
Sink boy, Ishmael Sesay (buy his paper for 40, Speech 50 on the paper, fight the two press-men, or walk on; freed he works
the Netlofts, `ds_press_boy`).

## Cast (frame narrow for women, broad for men; hair gritty and true to ancestry; no religious dress)
Gull Stilts: **Oona Brack** (68, npc_ds_01, keeps the Book; want: the law kept, because on water without law the strong take
every boat; fear: the court bought; will not: break the Book for her own; changed by: the Book shown on the wrong side of a
drowning; secret: the anchorage money is half the widows' fund; habit: cites the Book by page) · **Lua Tanoa** (34,
npc_ds_02, net-maker; want: someone made to answer for Kai; fear: that he died for nothing; will not: take money for him,
"blood money is a boat with a hole") · **Yewande Coker** (46, npc_ds_03, dive master; counts breaths; calls the drowned town
"her"; want: the Stilts fed; fear: her girl's lungs; will not: let a child dive since Kai) · **Amara Coker** (14, npc_ds_14) ·
**Factor Cyprian Thorne** (51, npc_ds_04, the tide post; courteous, exact; want: the Line's fuel book met and his factorship
confirmed; fear: being sent back to a gate; will not: raise his voice or touch anything himself) · **Mateo Ibarra** (39,
npc_ds_05) · **Paz Ibarra** (36, npc_ds_06) · **Rui Sousa** (42, npc_ds_07; not a monster, a man who wanted a boat and a
woman and paid for both with somebody else) · **Mele Tui** (52, npc_ds_08, the tide boat; reads water like Wren reads
roads) · **Hassan Benali** (60, npc_ds_09, the smokehouse: fish, salt, rope; a cabin under an upturned trawler's hull over his net store to rent: the safehouse) · **Ade Bankole**
(19, npc_ds_15, Yewande's apprentice). The Rigs: **Hamid Farouk** (56, npc_ds_10, Hum's keeper; his father kept the turbine
before him; want: forty people alive on a steel island; fear: the turbine stopping, because Hum only starts black once;
will not: leave Hum) · **Leila Farouk** (24, npc_ds_11, his daughter, the engineer; wants Meridian, stays if Hum has a
future) · **Ewan Tulloch** (64, npc_ds_12, Lean's lamp-keeper, a drinker) · **Sun-hee Park** (33, npc_ds_13, Hum's diver).
The guild at Blackcap: **Silas Venn** (45, npc_ds_g1, bargemaster) · **Marek Zielinski** (38, npc_ds_g2, the guild's diver;
guilt) · a guild hand (npc_ds_g3). The road: **Winona Crabbe** (61, npc_ds_w_eeler) · **Ishmael Sesay** (15, npc_ds_w_boy) and
two press-men (npc_ds_w_press_a/b).

## Companions (interjections; approval for reasons the player sees)
Tamsin (the sea, first sight: "It's the sky lying down"; Paz "nobody asked her"; −20 Ewan framed, −10 Coker exposed, +5
Paz asked, −10 Thorne's money) · Wren (water keeps no tracks; the press and the block are her red line country: +10 the
pressed boy freed, −5 walked past, +5 Rui exposed, −10 Thorne's money, −15 Ewan framed) · Ilya (wind and fog; counts
stilts; reads the barge's watch for a rifle; −10 Ewan framed) · Odile (the post's prices; LINE ACCOUNT is the Line's fuel
book; two for one is "a spread Cyprian always liked"; reads the tally; +3 the price brokered, −10 Ewan framed) · Ash (the
sea burial; Lua; graves that don't hold still; −20 Ewan framed, −10 Coker exposed, +5 the court for Coker) · Nine (drainage:
the delta's pumping stations were the city's, R−40; the record and the living, Mateo; +5 a living page, −10 Ewan framed) ·
Kes (Hum's controller is pre-war and unnetworked, "dumb as a brick and twice as stubborn"; she reads MANUAL — OPEN off the
board; the controller chip's worth; −15 Ewan framed, −10 Coker exposed).

## Flags later parts read (the Long Night, B5d; Act 3 logistics)
`ds_claim` (guild | rig | sea) · `ds_valve` (shut | sleeved | open) · `ds_rig` (crew | shared | guild | stilts) · `ds_post`
(gone | stays) · `ds_thorne` (fled; unset otherwise) · `ds_thorne_paid` · `ds_barge` (pyre | burned | kept) · `ds_hamid`
(left | dead) · **`ds_boats_owed`** (the Stilt Court owes the player its boats: set by a guild ruling, the Rig ruling, a living or sold page,
or the false light brought to the court — the Long Night's water logistics read it) · `ds_court` (written | living | sold |
quiet) · `ds_prec_living` · `ds_light` (exposed | court | stopped | framed) · `ds_coker_dead` · `ds_ewan_dead` · `ds_fish_back`
· `ds_press_boy`. Who gets Hum's fuel in the Long Night: `guild` → the Tollmen–Concern side has it; `crew`/`shared`/`stilts` →
whoever the player brings to Hamid or Oona (B5d asks).

## Hard choices
The claim (the truth costs the shore its only buyer and its widows' fund; the price keeps the post humbled and Lua
unanswered as she wanted; the Rig is a lie that feeds the Stilts; the sea is money) · the valve (shut: the sea heals and
Hum's surplus has nowhere to go; sleeved: a tank of fuel the shore must now defend) · Mateo (the law as written, the living,
the truth that wrecks a marriage and a baby's father, or quiet that leaves a woman deceived and safe) · the false light
(the guild's justice, the court's, silence, or an innocent).


## As built (2026-11-17) — changes from the plan above, and what is open
- **Names** fixed against the cast as it stood at the end of the build: the finder is **Rui Sousa** (B5a has a Joaquin and a
  Nuno), the smokehouse keeper **Hassan Benali** (Meridian has Idris Lowe). Flags follow (`ds_rui`, `ds_rui_confessed`).
- **The court** is Oona's own tree (`d_ds_oona`: nodes `s_*` for Lua's claim, `m_*` for Mateo, `light*` for the false light),
  called from her hub at the turn of the tide (`until 18`). A failed argument on Lua's claim adjourns (`ds_adjourned`) and the
  court sits again; it never dismisses on a failed check. A barge already burned at Blackcap is written down as Kai's boat
  (`ds_claim_how` = burned, no price, no pyre); with the factor fled, the guild's bench is empty and there is no price to
  broker. A `guild` ruling also gives the player Hum's leave for Stump's dives (`ds_rig_leave`).
- **Hum's crew** stop fighting once Hamid is dead (their `hostileIf` reads `ds_hamid` ≠ dead); the quest's `taking` stage
  resolves on `ds_hamid` = left or on his death (`ruled_rig_blood` sets `ds_hamid` = dead, `ds_rig` = stilts).
- **Reads from other slices (built):** the Mateo hearing reads the Court of Accounts' `prec_unrecorded` (yields −10 on the
  living argument, property +5; Oona has heard of the city's ruling by the tide boat); Thorne's offer reads `rc_line` (= guild:
  the guild holds the Line end to end, and the Line runs on Hum's oil). The safehouse is a cabin under an upturned hull.
- **Not built here (built since, as `md_docks`: see "Carrick" below): Meridian's Docks** across the river (the Line's far end,
  the far-bank answer on the Loop's boards, `ds_docks`), and the reads that belong to them (`bw_dogs_hold`, `dr_leven`,
  `rc_stock`'s news west). The Docks are a Meridian district; they want their own small slice (Meridian's boards and the Line's
  `meridian` arrival are shared files). The tide boat's network already lands at `meridian`; when the Docks exist, its
  Meridian end should be the Docks' water stairs.
- **Unity:** no runtime change was needed (dives, fishing, rides and the court are dialogue; boats use the `wagon` prop as
  Lantern Row's boat does; deep water is `water` + `blocks`). The place build for `ds_stilts`, `ds_rigs`, `ds_terminal` (open
  sites at their locations, drawn with open water to the edges, `rim: keep`) and the cells `ds_rig_leg`, `ds_wade` is P10 work;
  `npm run export` has not been run for this slice.

## Carrick — Meridian's Docks (B5b, the last piece; built 2026-11-17)
Ids: map `md_docks` (Meridian settlement; site beside Bridgeward's east edge, across the dry river), NPCs `npc_dk_*`, flags
`dk_*`, quests `q_dk_*`, dialogues `d_dk_*`, leads `l_dk_*`, conclusions `c_dk_*`, items `k_dk_*` / `c_dk_*`. Content:
`tools/maps/gen_md_docks.py` → `maps/md_docks.ts` (80×60); `npcs/md_docks.ts`; `dialogue/md_docks.ts`; `quests/b5b_docks.ts`;
`items/md_docks.ts`; `world/md_docks.ts` (leads, conclusions, events); tests `tests/b5b_docks.test.ts`.

**Found history.** Before the Burn: Carrick Point container terminal, the city's port at the river mouth, with the freight
railhead (the Line's coastal end), the Customs House and a bonded warehouse. When the river stopped (the Burn, the dams
upriver, the upper river diverted into the north channel by the city's own works: Nine has the drawings) the river berths were
stranded; the ships on them are **the Hulls** (nine, on the dry bed; four on the map: the *Benguela Star*, the *Orinoco*, the
*Cape Hope*, the *Saint Kilda* and five more), ~300 people who have signed their crew books every Sunday for ninety years. The
seaward **Basin** stayed wet: the tide boat, the Wet's barges, a few coasters. The road bridge (Bridgeward's) fell in the
Charter Wars with a tram on it; the far half of the Loop's Docks branch still runs as **the quay tram** round the ring road and
over the old ring bridge to Clover. The guild bought the old Port Authority's concession ninety years ago; the Ledger enforces
the **Harbour Act** and nothing else here: s. 19 bonded premises (the Harbour Master's writ stops at the Bond's fence), s. 41
idle berths may be leased for works, Schedule 2 the goods (cargo, livestock, mails, stores, ballast: no persons), Schedule 3 a
crewed vessel in port cannot be moved save by her master's leave or the court on proof of abandonment. The Harbour court:
the Customs House steps at the change of shift (six), the Act on the Harbour Master's knee, rulings on what is on the table.
Places: the railhead under the long brick freight shed (Sixty at the buffer, Femi's window), the turntable and yard throat,
**the guild's floor** (B5c's "guild's floor at the Docks") and the weighbridge, **the Bond** (the Concern's fenced, white-lit
yard; Lucien Roux's office), the Customs House, **the Stand** (the white line of the call-on), Crane Six and Crane Two, the barge
quay, the fish steps, the water stairs (the tide boat), the fuel berth (LINE ACCOUNT), **the Boxes** (stacked containers:
Espe's cookshop, the bunk), and on the bank above the Hulls Crane One, dead, whose jib carries **the cradle**: a basket on a
cable over the dry bed to Bridgeward's drop, five a head at night, the Rustmouths taking two of five at their end.

**Cast** (frame narrow for women, broad for men): Factor Henrike Dahl (56, npc_dk_01, Harbour Master: the Act is the Act) ·
Constance "Connie" Okoye (48, npc_dk_02, drives Crane Two, the Stand's voice) · Mattias Platt (44, npc_dk_03, the guild's
night gang-master, short-handed by order) · Oksana Lysenko (33, npc_dk_04, the dead man's widow; daughter Zoya, 8, bad lungs) ·
Lucien Roux (42, npc_dk_05, the Concern's bond officer: courteous, exact) · Imogen Thrale (31, npc_dk_06, House Vane's
engineer at the far end of the Crown's road) · Kwabena "Kobby" Ofori (61, npc_dk_07, master of the *Star*, the cradle's
winchman) and Abena Ofori (19, npc_dk_08, rides the basket, keeps the crew books) · Mirela Stan (15, npc_dk_09, the girl off
the through) · Grigor Avakian (67, npc_dk_10, the fish steps) · Esperanza "Espe" Cardenas (52, npc_dk_11, the cookshop, the
bunk) · Femi Adebayo (23, npc_dk_12, the Line's last window) · Tomas Hruska (58, npc_dk_13, the weighbridge, the floor's
counter) · Nadia Kassab (38, npc_dk_14, the Hulls' fence); guild guards g1–g2, Bond guards c1–c2, the Ring's hired men h1–h3.
Dmytro Lysenko (dead, no NPC). Cameo: Cyprian Thorne copying dues at the Customs House if the shore put him off (`ds_thorne` =
fled; placement `npc_ds_04_carrick`, tree `d_dk_thorne`). Kin: Ofori.

### Crane Six — `q_dk_crane` (the district's line)
*Hook:* a box fell from Crane Six in the night onto Dmytro Lysenko, the night gang's hooker-on; the guild's board: DOCKER'S
NEGLIGENCE, Gang Nine stood down, no funeral tally. *Investigation:* the box (MACHINE PARTS 14 T; cast copper inside, ~31 T;
the twistlocks sheared, `l_dk_box`); Crane Six's cab (Connie's relief's leave, or a climb / a picked padlock; the load tape
02:06 31.2 T CUTOUT, 02:07 KEY 6/N OVERRIDE, `k_dk_tape`, `l_dk_tape`; a failed read still gives the tape and Hruska reads it;
the key switch scratched by a copied key); Platt (five on a crane that wants eight, by order, for the through's four-hour
turnaround under the contract's demurrage, `l_dk_short`, `k_dk_order`; his own key never left him); the widow (her girl
breathes now; he came home with medicine; the tin `k_dk_tin`: a hand-cut key 6/N, blue Concern inhalers, a Bond night pass;
given at Speech 35, or shown up by the tape, or taken off the shelf by night); the weighbridge register (THROUGH — NOT WEIGHED
for two years, `l_dk_unweighed`); the Bond's drawer at night (Security 45: the Concern's own slip 31.4 T against the guild's
bill 14 T, `k_dk_slip`, `l_dk_slip`). Conclusions `c_dk_override` (box + tape), `c_dk_paid` (key + medicine; also learned
from Oksana when shown the tape: `dk_paid`), `c_dk_skim` (slip + register, `dk_skim`). *Turn:* Dmytro turned the cutout
himself, at the Bond's pay in medicine for his girl: the Concern bills its boxes at half their weight and the guild never
weighs the through; the guild's verdict is true and a lie, the dockers' grievance just and wrong, and the man who paid sits
behind s. 19. *Ends* (`dk_crane`): **bond** (the whole truth at the court, Speech 45 with the evidence: every through box to
the plate, `dk_weighbridge` = on, `dk_concern_billed`; no funeral tally by the Act unless the player pays 30, `dk_buried` =
paid, or argues the relief clause, Speech 50, = guild) · **gang** (the short gang argued with the tin kept off the table, Speech
40: negligence struck, the guild pays, Six at complement, `dk_complement`; the skim goes on) · **black** (the truth to Connie,
Speech 45 with mods: the Stand blacks the Bond; at dawn the Ring's hired men on the Stand (placement + a repeating trigger,
waits for the player): talked home Speech 45, paid 60, or fought (`dk_breakers_fight`; lost fight = broken) → `dk_black` =
won: the Concern settles through the guild, the plate, `dk_stand` = organised, **`dk_stand_owed`**; or step off the line →
`dk_black` = broken, `dk_stand` = broken) · **guild** (the tin given to Dahl in private: 100, a quiet bill, the board left
wrong) · **bought** (Roux's 150 for the papers, or the same to the widow at Speech 40, `dk_widow_paid`). A failed argument
adjourns the court (`dk_adjourned`); it sits again. Visible: the tally board, the box, the weighbridge's needle, Oksana's
lines (the Hulls, or Zoya over a kettle when the Bond's medicine stops), Connie's, the call-on's wage (12 after the Stand
stood, 7 otherwise).

### Mirela's Paper — `q_dk_girl`
*Hook:* the Bond's notice on the guild floor's door (RETURNABLE LOST — REWARD 60) or Roux. *Investigation:* Espe's "niece" at
the back of the cookshop (Speech 35; Connie's word −15; or the girl herself, Speech 40); Mirela (15, terrace nine, rode six
days west in a box of spares); the paper sewn in her coat (`l_dk_surety`; she lets the player carry it, `k_dk_paper`).
*Turn:* she is the surety on her mother's Concern contract, returnable on default or flight: her flight is the default, and
her mother wrote GO on the back. *Ends* (`dk_girl`): **shore** (the tide boat to Gull Stilts, 6) · **choir** (a ticket east
and the track south from West Halt to Openfield, 25; Survival 30, no check if `rc_stock` = openfield) · **bought** (her surety
discharged at the Bond, 150, Barter 50 to 90: the mother's contract whole) · **ruled** (the Harbour court: Schedule 2 has no
persons; a person landed on the quay is a passenger who owes her fare, paid 125 or worked off: **`dk_prec_passenger`**; reads
`prec_unrecorded` = yields) · **returned** (Roux's 60: the event `dk_girl_taken` puts her on the through at two, the next night
the player is at Carrick; Espe will not serve the player). The mother's default (shore, choir, ruled) is left for B4b to read.

### Stakes on the Hulls — `q_dk_far`
*Hook:* the river stairs: House Vane's blue stakes among the hulls; the Harbour notice (s. 41 lease, occupiers to quit on
commencement; chalk: WE ARE NOT OCCUPIERS WE ARE CREW). *Investigation:* Kobby (the Hulls; the cradle and its lamp signal,
`dk_cradle_known`; three masters have signed, `l_dk_signed`; the crew books, `l_dk_crews`), Abena (the books; she lends the
*Star*'s, `k_dk_crewbook`), Imogen (the far end wants the old road bridge's footing; the road is so the Crown's freight need
not go round by the Wall past the gate's lens; she is buying the masters' marks of abandonment at 40 a hull), the Act
(`l_dk_act`) → `c_dk_crewed`, the survey plate on the wall (Science 40: the old tram bridge's footing under the Bond's edge,
`l_dk_footing`). Reads `dr_leven` (the steel: LEVEN girders on the quay, or late) and `bw_dogs_hold` (the near end held).
*Ends* (`dk_hulls`): **crewed** (the court: Schedule 3 and the crew book, Speech 45: the lease cannot move a crewed vessel;
the cradle runs) · **cleared** (Imogen's purse carried to the masters, Barter 45, or Kobby's own mark at Speech 55: the event
`dk_hulls_cleared` clears the bed at the next dawn the player is at Carrick, `dk_hulls_empty`, `dk_cradle` = cut) · **sold**
(all nine together at 120 a hull, Barter 50: the masters walk up the stairs with the money; Kobby runs the cradle for House
Vane at a wage until the bridge) · **moved** (the far end worked onto the tram bridge's footing under the Bond, Science 45:
`dk_abutment` = bond, the Crown and the Concern want the same ground; the Hulls stay).

### Transport (both networks from every stop)
- **The Line**: `STOPS.meridian` = Carrick's platform (`md_docks`/`platform`, name "Meridian Docks"); every corridor ticket
  point's ride to Meridian lands there; the rods' "all the way to the city" drops at the yard throat (`yard`); Carrick's own
  window is `lineBoard('d_dk_line', 'meridian', …)` (Femi's tree too). `net_line` unchanged.
- **The tide boat**: Carrick's water stairs (`d_dk_tide`: Gull Stilts 6, the Rigs 12, down the delta at five); up from the
  Stilts (Mele's `ride.city`, at six) and from the Rigs (`launch.city`, by the Stilts) to `md_docks`/`stairs`. `net_tide`
  unchanged; the field map's fast travel still arrives at the `meridian` location's map (the Precinct), now at the river road's
  mouth (`from_hamlet_shore`, `from_rigs`, `from_halt_w` moved there).
- **The barges** (B5c): `RIVER_STOPS.meridian` → `md_docks`/`barge`; Carrick's barge quay is `bargeBoard('d_dk_barge', 'meridian', …)`.
- **The city**: the river road (exits both ways, an hour, outside the Wall: `md_precinct` south ↔ `md_docks` north-west); the
  quay tram (Carrick ↔ Clover, 2, `d_dk_tram` / Clover's `drloop.quay`); the Loop boards' answer to NO BRIDGE (`DOCKS_ASK` /
  `DOCKS_ANSWER` on the Precinct's, Old Market's, Lantern Row's, the Stacks' and Bridgeward's boards); the cradle at night
  (20–4, 5 Tolls, both ways: the winch, Kobby, Abena, and Bridgeward's drop with `CRADLE_SIGNAL` once `dk_cradle_known`).

### Activities
The call-on at the Stand at dawn (Brawn 5, eight hours, 7 Tolls; 12 once the Stand has stood); Grigor's lines off the Basin
wall at dawn (2, Survival 30, two mullet); Espe's soup and the bunk (20, safehouse); counters: Grigor (fish), Espe (food),
Hruska (the guild's floor, guild prices), Nadia (the Hulls' fence, Concern goods dear, blue inhalers).

### Flags later parts read (B5d's Long Night, Act 3)
`dk_crane` (bond | gang | black | guild | bought) · `dk_black` (won | broken) · `dk_stand` (organised | quiet | broken |
black) · **`dk_stand_owed`** (the Stand at Carrick owes the player: in the Long Night the dockers can black the guild's and the
Concern's freight, e.g. Openfield's stores landed at Carrick) · `dk_weighbridge` (on) · `dk_concern_billed` · `dk_complement` ·
`dk_buried` (paid | guild | concern) · `dk_girl` (returned | shore | choir | bought | ruled) · **`dk_prec_passenger`** (on
Carrick's quay a person is a passenger, never cargo: B5d's warden car carrying keystone 7 west through the Docks can be read
against it) · `dk_hulls` (crewed | cleared | sold | moved) · `dk_abutment` (bond: the Crown's far end on the Concern's ground,
a crack between them for the Long Night) · `dk_cradle` (cut; unset = running: a way into the city past the gate's lens) ·
`dk_hulls_empty` · `dk_bond_barred` · `dk_bond_fight`.

### Open
Unity: the place build for `md_docks` (an open site beside Bridgeward's east edge, its west strip the dry bed; cranes and the
tram are prop stand-ins: `windpump`, `machine`) is P10 work; `npm run export` has not been run. B5d: Calla's warden escort
through Carrick; the Long Night's freight at the Bond and the guild's floor (`nw_controllers` = guild lands on the floor).
B4b: Mirela's mother's contract after a default.
