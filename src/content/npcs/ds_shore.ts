import type { NpcDef } from '../../engine/npc/defs';

/**
 * The Drowned Shore (B5b): Gull Stilts (a fishing village on stilts over a drowned ferry town), the Rigs (Hum, the platform
 * that still pumps; Lean, with the shore's light; Stump), Blackcap (the drowned terminal's last tank, where the guild's barge
 * loads at night) and the dike road through the delta. Everyone here wears what the sea leaves them: oilskins re-tarred,
 * ninety-year-old survival suits cut down, net-twine knitted into jerseys; the guild's factor is the one good coat on the shore.
 * Story notes: story/B5b_NOTES_SECRET.md.
 */
const DS = { team: 'neutral', settlement: 'hamlet_shore' } as const;
const RG = { team: 'neutral', settlement: 'rigs' } as const;
const sleep = (spot: string, from = 21, to = 5) => ({ from, to, spot, activity: 'sleep' as const });
/** The guild's barge crew at Blackcap: they turn on whoever comes at the barge. */
const barge = { team: 'tollmen', settlement: 'hamlet_shore', faction: 'tollmen', hostileIf: { flag: 'ds_barge_fight' }, courage: 55 };
/** Hum's crew turn on the Stilts' men (and whoever leads them) if the court takes Hum and Hamid will not go; with him dead, the rest give it up. */
const crew = { team: 'rig_crew', settlement: 'rigs', hostileIf: { all: [{ flag: 'ds_rig_fight' }, { not: { flag: 'ds_hamid', eq: 'dead' } }] }, courage: 75 };

export const SHORE_NPCS: NpcDef[] = [
  // ---------------------------------------------------------------- Gull Stilts
  {
    // keeps the Book of Water; speaks for the Stilt Court on the Greta's car deck
    id: 'npc_ds_01', name: 'Oona Brack', look: { seed: 5201, frame: 'narrow', age: 68, ancestry: 'north_european', over: { hair: { style: 'cut_crop', color: 0xd6d2ca }, weathering: 0.75 } }, role: 'settler',
    level: 4, ...DS, courage: 60, dialogue: 'd_ds_oona', attrs: { wits: 8, presence: 8, grit: 6 }, skills: { speech: 55, barter: 40, survival: 40 }, tolls: 30,
    schedule: [{ from: 6, to: 22, spot: 'oona', activity: 'work' }, { from: 22, to: 6, activity: 'away' }],
    barks: ['Page nine: a life for a life, or a boat for a life.', 'The Book doesn\'t get wet. That\'s the first page.', 'The city writes the tides. We\'d drown without it.'],
  },
  {
    // a net-maker; her boy went out on the ebb the day the player came
    id: 'npc_ds_02', name: 'Lua Tanoa', look: { seed: 5202, frame: 'narrow', age: 34, ancestry: 'southeast_asian', over: { hair: { style: 'elvs_unkempt_french_braid', color: 0x14100c }, weathering: 0.55 } }, role: 'fisher',
    level: 2, ...DS, courage: 55, dialogue: 'd_ds_lua', attrs: { grit: 7, presence: 6 }, skills: { survival: 35, barter: 25 }, tolls: 4,
    schedule: [{ from: 7, to: 20, spot: 'lua', activity: 'work' }, sleep('lua_bed', 20, 7)],
    barks: ['Kai.', 'Don\'t say the sea to me.', 'The net\'s still down there. Under the Gut.'],
  },
  {
    // the dive master: the air pump, the hose, the Sow
    id: 'npc_ds_03', name: 'Yewande Coker', look: { seed: 5203, frame: 'narrow', age: 46, ancestry: 'west_african', over: { hair: { style: 'paint_cornrows', color: 0x16120e }, weathering: 0.6, scars: ['chin_nick'] } }, role: 'fisher',
    level: 5, ...DS, courage: 65, dialogue: 'd_ds_yewande', attrs: { grit: 8, reflex: 6, wits: 7 }, skills: { survival: 60, mechanics: 35, barter: 40, speech: 35 }, tolls: 40,
    merchant: { buys: ['junk', 'tool', 'misc'], cash: 150, restockDays: 6, markup: 1.0, stock: [['t_rebreather', 1], ['j_wiring', 2], ['t_lamp', 1]] },
    schedule: [{ from: 5, to: 20, spot: 'yewande', activity: 'work' }, sleep('yewande_bed', 21, 5)],
    barks: ['Thirty-eight. Thirty-nine. Up.', 'Ellery gives. Ellery takes. Ask her nicely.', 'No children on my ladder. Not now.'],
  },
  {
    // the guild's factor at the tide post: the shore's one buyer, one seller, and its anchorage
    id: 'npc_ds_04', name: 'Factor Cyprian Thorne', look: { seed: 5204, frame: 'broad', age: 51, ancestry: 'east_asian', over: { hair: { style: 'short04', color: 0x221c18 }, weathering: 0.15 } }, role: 'trader',
    level: 5, team: 'neutral', settlement: 'hamlet_shore', faction: 'tollmen', courage: 35, dialogue: 'd_ds_thorne', attrs: { wits: 9, presence: 7 }, skills: { barter: 65, speech: 55 }, tolls: 220,
    merchant: { buys: ['junk', 'consumable', 'misc'], cash: 300, restockDays: 4, markup: 1.5, faction: 'tollmen', stock: [['c_bandage', 4], ['c_iodine', 3], ['c_water', 6], ['t_lamp', 1], ['c_bitters', 2]] },
    schedule: [{ from: 7, to: 20, spot: 'thorne', activity: 'trade' }, { from: 20, to: 7, activity: 'away' }],
    barks: ['Fish by the weight, salt by the measure. The guild\'s scale is honest; check it.', 'Anchorage is a courtesy the guild pays. It is not a debt.', 'Nobody has to be unreasonable.'],
  },
  {
    // the man the Book wrote drowned
    id: 'npc_ds_05', name: 'Mateo Ibarra', look: { seed: 5205, frame: 'broad', age: 39, ancestry: 'latin_american', over: { hair: { style: 'cut_messy', color: 0x1a1410 }, facialHair: 'full_beard', weathering: 0.85, scars: ['brow_cut'] } }, role: 'labourer',
    level: 3, ...DS, courage: 50, dialogue: 'd_ds_mateo', attrs: { brawn: 7, grit: 8 }, skills: { survival: 45, melee: 35 }, tolls: 0,
    barks: ['Two years. They wrote me in the water two years.', 'I put that patch on the Curlew\'s bow. Ask her.', 'Don\'t tell Paz I\'m here. No. Tell her.'],
  },
  {
    id: 'npc_ds_06', name: 'Paz Ibarra', look: { seed: 5206, frame: 'narrow', age: 36, ancestry: 'latin_american', over: { hair: { style: 'ponytail01', color: 0x1c1612 }, weathering: 0.5 } }, role: 'fisher',
    level: 2, ...DS, courage: 45, dialogue: 'd_ds_paz', attrs: { wits: 7, grit: 7 }, skills: { survival: 35, barter: 30 }, tolls: 6,
    schedule: [{ from: 6, to: 20, spot: 'paz', activity: 'work' }, sleep('paz_bed', 20, 6)],
    barks: ['The baby\'s asleep. Talk quiet or go.', 'I said the words at the Ebb Steps over a coat.', 'Rui found the Curlew. Rui found me, after.'],
  },
  {
    // the finder: fishes the Curlew
    id: 'npc_ds_07', name: 'Rui Sousa', look: { seed: 5207, frame: 'broad', age: 42, ancestry: 'mediterranean', over: { hair: { style: 'cut_crop', color: 0x2a2018 }, facialHair: 'stubble_heavy', weathering: 0.6 } }, role: 'fisher',
    level: 3, ...DS, courage: 40, dialogue: 'd_ds_rui', attrs: { brawn: 7, grit: 6 }, skills: { survival: 45, barter: 30 }, tolls: 25,
    schedule: [{ from: 5, to: 19, spot: 'curlew', activity: 'work' }, { from: 19, to: 22, spot: 'rui', activity: 'idle' }, sleep('rui_bed', 22, 5)],
    barks: ['Found her adrift. Found is found. Page twelve.', 'Good boat, the Curlew. Pulls left.', 'I don\'t talk about before.'],
  },
  {
    // the tide boat: Meridian, the Stilts, the Rigs; Blackcap on the way
    id: 'npc_ds_08', name: 'Mele Tui', look: { seed: 5208, frame: 'narrow', age: 52, ancestry: 'southeast_asian', over: { hair: { style: 'elvs_unkempt_french_braid', color: 0x1a1612 }, weathering: 0.7 } }, role: 'fisher',
    level: 4, ...DS, courage: 55, dialogue: 'd_ds_mele', attrs: { senses: 8, grit: 6 }, skills: { survival: 55, barter: 35 }, tolls: 30,
    schedule: [{ from: 6, to: 20, spot: 'landing', activity: 'work' }, sleep('mele_bed', 20, 6)],
    barks: ['Tide boat at six. The Rigs, Blackcap, the city.', 'Water keeps every track. You have to know how it writes.', 'Mind your hands on the gunwale.'],
  },
  {
    // the smokehouse: fish, water, twine; hands at dawn; the loft over the net store
    id: 'npc_ds_09', name: 'Hassan Benali', look: { seed: 5209, frame: 'broad', age: 60, ancestry: 'mediterranean', over: { hair: { style: 'none', color: 0x9a948c }, facialHair: 'full_beard', weathering: 0.6 } }, role: 'trader',
    level: 3, ...DS, courage: 40, dialogue: 'd_ds_hassan', attrs: { wits: 7, presence: 6 }, skills: { barter: 50, survival: 40 }, tolls: 60,
    merchant: { buys: ['consumable', 'junk'], cash: 120, restockDays: 3, markup: 1.2, stock: [['c_smoked_fish', 8], ['c_water', 4], ['j_cloth', 4], ['c_dirtywater', 6]] },
    schedule: [{ from: 5, to: 20, spot: 'hassan', activity: 'trade' }, { from: 20, to: 5, activity: 'away' }],
    barks: ['Smoked this morning. Tastes of smoke. Mostly.', 'Hands at dawn, if you want work and a fish.', 'Salt\'s up again. The guild\'s salt.'],
  },
  {
    id: 'npc_ds_14', name: 'Amara Coker', look: { seed: 5214, frame: 'narrow', age: 14, ancestry: 'west_african', over: { hair: { style: 'coily_twa', color: 0x120e0b }, weathering: 0.4 } }, role: 'fisher',
    level: 1, ...DS, courage: 30, dialogue: 'd_ds_amara', attrs: { reflex: 7, senses: 7 }, skills: { survival: 30, stealth: 30 }, tolls: 1,
    schedule: [{ from: 6, to: 20, spot: 'amara', activity: 'work' }, sleep('amara_bed', 20, 6)],
    barks: ['Mam says don\'t talk to the guild.', 'I row. I don\'t dive. I row.', 'The fog\'s coming. You can smell it before.'],
  },
  {
    // Yewande's apprentice: he runs the pump, and the stage if she is gone
    id: 'npc_ds_15', name: 'Ade Bankole', look: { seed: 5215, frame: 'broad', age: 19, ancestry: 'west_african', over: { hair: { style: 'paint_buzz', color: 0x110d0a }, weathering: 0.45 } }, role: 'fisher',
    level: 2, ...DS, courage: 40, dialogue: 'd_ds_ade', attrs: { brawn: 6, grit: 6 }, skills: { survival: 40, mechanics: 25 }, tolls: 3,
    schedule: [{ from: 6, to: 19, spot: 'ade', activity: 'work' }, { from: 19, to: 6, activity: 'away' }],
    barks: ['She counts. I count after her.', 'Hose is good. Pump\'s good. Don\'t panic and the bottom\'s good.', 'Forty strokes a minute on the pump. Forty. Every minute.'],
  },
  // ---------------------------------------------------------------- the Rigs
  {
    // Hum's keeper, second generation; the crew's boss
    id: 'npc_ds_10', name: 'Hamid Farouk', look: { seed: 5210, frame: 'broad', age: 56, ancestry: 'mediterranean', over: { hair: { style: 'short04', color: 0x8a8278 }, facialHair: 'stubble_heavy', weathering: 0.7, scars: ['brow_cut'] } }, role: 'tech',
    level: 6, ...crew, dialogue: 'd_ds_hamid', attrs: { wits: 8, grit: 7, presence: 7, brawn: 6 }, skills: { mechanics: 65, science: 45, speech: 40, firearms: 40 }, tolls: 80,
    equip: ['w_revolver38'], inventory: [['a_38', 12]],
    schedule: [{ from: 7, to: 18, spot: 'hamid', activity: 'work' }, { from: 18, to: 22, spot: 'hamid_mess', activity: 'idle' }, sleep('hamid_bed', 22, 7)],
    barks: ['Don\'t let her stop.', 'One tanker. She gives one. She can\'t give two.', 'My father kept her forty years. I\'ve kept her twenty-two.'],
  },
  {
    // his daughter, Hum's engineer: wants a city with streets, stays if Hum has a future
    id: 'npc_ds_11', name: 'Leila Farouk', look: { seed: 5211, frame: 'narrow', age: 24, ancestry: 'mediterranean', over: { hair: { style: 'ponytail01', color: 0x1e1814 }, weathering: 0.4 } }, role: 'tech',
    level: 4, ...crew, dialogue: 'd_ds_leila', attrs: { wits: 8, reflex: 6 }, skills: { mechanics: 60, science: 50 }, tolls: 30,
    merchant: { buys: ['junk', 'tool'], cash: 120, restockDays: 5, markup: 1.3, stock: [['j_fuel', 3], ['t_repair', 1], ['j_wiring', 2]] },
    schedule: [{ from: 7, to: 19, spot: 'leila', activity: 'work' }, { from: 19, to: 22, spot: 'mess_sit', activity: 'idle' }, sleep('leila_bed', 22, 7)],
    barks: ['Pressure\'s down eleven since the thaw. Hum isn\'t tired. Something\'s drinking.', 'There\'s a city with streets you can walk on, I hear.', 'Mind the steam line.'],
  },
  {
    // Lean's lamp-keeper: the shore's light, fed on Hum's gas
    id: 'npc_ds_12', name: 'Ewan Tulloch', look: { seed: 5212, frame: 'broad', age: 64, ancestry: 'north_european', over: { hair: { style: 'cut_messy', color: 0x9a948e }, facialHair: 'full_beard', weathering: 0.85 } }, role: 'settler',
    level: 2, ...RG, courage: 25, dialogue: 'd_ds_ewan', attrs: { senses: 6, grit: 5 }, skills: { mechanics: 30, survival: 30 }, tolls: 2, inventory: [['c_bitters', 1]],
    schedule: [{ from: 17, to: 8, spot: 'ewan', activity: 'work' }, sleep('ewan_bed', 8, 17)],
    barks: ['The light\'s lit. The light\'s always lit. Mostly.', 'Somebody cut my line. Cut. I know perished, and that wasn\'t.', 'Have you a drop? No? No.'],
  },
  {
    // Hum's diver: Stump's deep hatch
    id: 'npc_ds_13', name: 'Sun-hee Park', look: { seed: 5213, frame: 'narrow', age: 33, ancestry: 'east_asian', over: { hair: { style: 'cut_crop', color: 0x0e0c0a }, weathering: 0.55 } }, role: 'fisher',
    level: 4, ...crew, dialogue: 'd_ds_sunhee', attrs: { grit: 8, senses: 7 }, skills: { survival: 60, mechanics: 30 }, tolls: 12,
    schedule: [{ from: 7, to: 18, spot: 'sunhee', activity: 'work' }, { from: 18, to: 21, spot: 'mess_pair_a', activity: 'idle' }, sleep('sunhee_bed', 21, 7)],
    barks: ['Stump goes down sixty feet and then it goes down some more.', 'I told Hamid. Hamid didn\'t want told.', 'Breathe slow. Nobody does.'],
  },
  // ---------------------------------------------------------------- the guild at Blackcap
  {
    id: 'npc_ds_g1', name: 'Silas Venn', look: { seed: 5221, frame: 'broad', age: 45, ancestry: 'indigenous_american', over: { hair: { style: 'paint_shaved', color: 0x16120e }, facialHair: 'stubble_heavy', weathering: 0.6 } }, role: 'guard',
    level: 6, ...barge, dialogue: 'd_ds_silas', leader: true, attrs: { brawn: 7, reflex: 6, grit: 7 }, skills: { firearms: 55, melee: 45, barter: 30 }, tolls: 45,
    equip: ['w_pump', 'r_duster'], inventory: [['a_12ga', 10]],
    barks: ['No lamps on the water. Guild\'s business.', 'Two loads a fortnight. Who\'s counting?', 'Off my barge.'],
  },
  {
    // the guild's diver: he went down Hum's leg
    id: 'npc_ds_g2', name: 'Marek Zielinski', look: { seed: 5222, frame: 'broad', age: 38, ancestry: 'north_european', over: { hair: { style: 'paint_buzz', color: 0x6a5440 }, facialHair: 'stubble', weathering: 0.55 } }, role: 'fisher',
    level: 4, ...barge, dialogue: 'd_ds_marek', attrs: { grit: 7, brawn: 6 }, skills: { survival: 55, melee: 35 }, tolls: 15,
    equip: ['w_shiv'], inventory: [['c_bitters', 1]],
    barks: ['I dive for whoever pays. That\'s diving.', 'Don\'t talk to me about the boy.', 'Cold down there. Colder every time.'],
  },
  {
    id: 'npc_ds_g3', name: 'Guild Hand', look: { seed: 5223, frame: 'broad', age: 30, ancestry: 'mediterranean', over: { hair: { style: 'cut_crop', color: 0x1a1410 }, weathering: 0.5 } }, role: 'guard',
    level: 4, ...barge, minor: true, dialogue: 'd_ds_guildhand', attrs: { brawn: 6, reflex: 5 }, skills: { firearms: 40, melee: 40 }, tolls: 10,
    equip: ['w_revolver38'], inventory: [['a_38', 8]],
    barks: ['Guild barge. Keep off.', 'Nothing to see. It\'s dark.'],
  },
  // ---------------------------------------------------------------- the road
  {
    id: 'npc_ds_w_eeler', name: 'Winona Crabbe', look: { seed: 5231, frame: 'narrow', age: 61, ancestry: 'indigenous_american', over: { hair: { style: 'elvs_unkempt_french_braid', color: 0x8a847c }, weathering: 0.8 } }, role: 'fisher',
    level: 3, team: 'neutral', courage: 45, dialogue: 'd_re_ds_eelers', attrs: { senses: 8, grit: 7 }, skills: { survival: 60, barter: 40 }, tolls: 8,
    merchant: { buys: ['consumable', 'junk'], cash: 30, restockDays: 4, markup: 1.1, stock: [['c_smoked_fish', 3], ['c_meat', 2]] },
    barks: ['Eels don\'t care about anything. That\'s why I like them.', 'Mind the soft edge. The dike\'s soft.'],
  },
  {
    // a Sink boy roped for his mother's debt, on his way to the barges
    id: 'npc_ds_w_boy', name: 'Ishmael Sesay', look: { seed: 5232, frame: 'broad', age: 15, ancestry: 'west_african', over: { hair: { style: 'paint_buzz', color: 0x100c09 }, weathering: 0.5 } }, role: 'street',
    level: 1, team: 'neutral', settlement: 'hamlet_shore', courage: 20, dialogue: 'd_ds_ishmael', attrs: { reflex: 6 }, skills: { stealth: 25 }, tolls: 0,
    barks: ['My mam\'s paper. Not mine.', 'I can mend a net. I learned today. Look.'],
  },
  {
    id: 'npc_ds_w_press_a', name: 'Pressman', look: { seed: 5233, frame: 'broad', age: 40, ancestry: 'north_european', over: { hair: { style: 'paint_shaved', color: 0x5a4a3a }, facialHair: 'short_beard', weathering: 0.6 } }, role: 'guard',
    level: 5, team: 'tollmen', faction: 'tollmen', minor: true, hostileIf: { flag: 'ds_press_fight' }, courage: 50, dialogue: 'd_re_ds_press', attrs: { brawn: 7, reflex: 5 }, skills: { melee: 50, firearms: 40 }, tolls: 20,
    equip: ['w_pipe', 'r_duster'],
    barks: ['Guild paper. Stand aside.'],
  },
  {
    id: 'npc_ds_w_press_b', name: 'Pressman', look: { seed: 5234, frame: 'broad', age: 27, ancestry: 'latin_american', over: { hair: { style: 'cut_crop', color: 0x1a1410 }, weathering: 0.5 } }, role: 'guard',
    level: 4, team: 'tollmen', faction: 'tollmen', minor: true, hostileIf: { flag: 'ds_press_fight' }, courage: 45, dialogue: 'd_re_ds_press', attrs: { brawn: 6, reflex: 6 }, skills: { melee: 40, firearms: 45 }, tolls: 12,
    equip: ['w_zip38'], inventory: [['a_38', 6]],
    barks: ['Keep walking.'],
  },
];
