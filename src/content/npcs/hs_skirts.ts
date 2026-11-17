import type { NpcDef } from '../../engine/npc/defs';

/**
 * The Skirts under Halcyon (B4a): the debtors' town on the old ski runs below the caldera's rim. Number Six and the
 * Shift's strike, the Lodge, Footgate and the Contract Office, the Window, Provision and the Weighhouse, Nursery, the
 * Pond, Two-Twelve. The Concern's own people wear clean synthetics (the megacity's rich: contract citizens); everyone
 * else is salvaged, patched, re-dyed. Story notes: story/STORY_PLAN_SECRET.md, Build notes — B4; Kes: U8_kes_SECRET.md.
 */
const SK = { team: 'neutral', settlement: 'skirts' } as const;
const sleep = (spot: string, from = 22, to = 6) => ({ from, to, spot, activity: 'sleep' as const });
/** The Concern's security. They turn on whoever brings the cable house down, and on anyone their lens reads as a saboteur. */
const clean = { team: 'concern', settlement: 'skirts', faction: 'concern', role: 'corp' as const, hostileIf: { any: [{ flag: 'hs_shift', eq: 'revolt' }, { flag: 'hs_clean_fight' }] }, courage: 65, minor: true };

export const SKIRTS_NPCS: NpcDef[] = [
  {
    // the seventh companion (U8): a grid-hand at the Window with a Concern port at her nape
    id: 'npc_hs_01', name: 'Kes Oyelaran', look: { seed: 4101, frame: 'narrow', age: 26, ancestry: 'west_african', over: { hair: { style: 'paint_coils', color: 0x15100c }, weathering: 0.3, scars: ['chin_nick'] } }, role: 'tech',
    level: 7, ...SK, courage: 70, dialogue: 'd_hs_kes', faction: 'the_shift', attrs: { wits: 9, reflex: 7, senses: 7, presence: 6, brawn: 4, grit: 5 }, skills: { science: 60, security: 50, mechanics: 40, arc: 35, stealth: 35, speech: 35 }, tolls: 8,
    equip: ['w_arc_pistol'], inventory: [['a_cell', 6], ['c_bitters', 1], ['c_tin', 1]],
    schedule: [{ from: 8, to: 18, spot: 'window_grid', activity: 'work' }, { from: 18, to: 21, spot: 'lampblack_kes', activity: 'drink' }, { from: 21, to: 1, spot: 'lodge_kes', activity: 'idle' }, sleep('kes_shack', 1, 8)],
    barks: ['Obviously the lens is looking at you. It looks at everybody. I\'m the one who decides when it sees.', 'Bricked again. Provision\'s board. Give me a minute.', 'You can see the gardens from the top of Cascade. Green. They water them on a timer.'],
  },
  {
    // keystone 12: the Shift's leader, the strike's voice
    id: 'npc_hs_02', name: 'Maren Okafor', look: { seed: 4102, frame: 'narrow', age: 44, ancestry: 'west_african', over: { hair: { style: 'paint_cornrows', color: 0x1a1612 }, weathering: 0.6 } }, role: 'labourer',
    level: 6, ...SK, courage: 80, dialogue: 'd_hs_maren', faction: 'the_shift', attrs: { presence: 9, wits: 8, grit: 7, brawn: 5 }, skills: { speech: 65, survival: 40, mechanics: 45, explosives: 30 }, tolls: 20,
    schedule: [{ from: 6, to: 18, spot: 'picket', activity: 'work' }, { from: 18, to: 23, spot: 'lodge_maren', activity: 'idle' }, sleep('lodge_maren', 23, 6)],
    barks: ['No lamps down.', 'We go up together or we don\'t go up.', 'Eleven. I can say the names. Ask me.', 'The Window can cut the ration. It can\'t cut the soup.'],
  },
  {
    id: 'npc_hs_03', name: 'Rafe Ansel', look: { seed: 4103, frame: 'broad', age: 31, ancestry: 'mediterranean', over: { hair: { style: 'cut_crop', color: 0x1e1812 }, facialHair: 'stubble_heavy', weathering: 0.55, scars: ['brow_cut'] } }, role: 'labourer',
    level: 6, ...SK, courage: 85, dialogue: 'd_hs_rafe', faction: 'the_shift', attrs: { brawn: 8, grit: 7, reflex: 6, presence: 6 }, skills: { melee: 55, explosives: 50, mechanics: 40, speech: 30 }, tolls: 15,
    equip: ['w_pipe'],
    schedule: [{ from: 6, to: 18, spot: 'picket_b', activity: 'work' }, { from: 18, to: 24, spot: 'lodge_rafe', activity: 'idle' }, sleep('lodge_rafe', 0, 6)],
    barks: ['They ride over our heads every day. Stop the car.', 'My brother\'s under Six East. Say "geological" to me.', 'Holding is starving slower.'],
  },
  {
    // the Contract Office: the Concern's law in the Skirts, kept to the letter
    id: 'npc_hs_04', name: 'Agnes Bell', look: { seed: 4104, frame: 'narrow', age: 38, ancestry: 'east_asian', over: { hair: { style: 'ponytail01', color: 0x0e0c0a }, weathering: 0 } }, role: 'corp',
    level: 4, team: 'neutral', settlement: 'skirts', faction: 'concern', courage: 40, dialogue: 'd_hs_bell', attrs: { wits: 9, presence: 7 }, skills: { barter: 55, speech: 55, science: 40 }, tolls: 400,
    schedule: [{ from: 8, to: 20, spot: 'bell', activity: 'work' }, { from: 20, to: 8, activity: 'away' }],
    barks: ['As written.', 'Every contract in the Skirts passes this counter twice: once in, once out.', 'The Concern keeps its word. That is the whole of what it sells.'],
  },
  {
    id: 'npc_hs_05', name: 'Corwin Dysart', look: { seed: 4105, frame: 'broad', age: 52, ancestry: 'north_european', over: { hair: { style: 'short04', color: 0x4e3e30 }, weathering: 0.1 } }, role: 'corp',
    level: 4, team: 'neutral', settlement: 'skirts', faction: 'concern', courage: 35, dialogue: 'd_hs_dysart', attrs: { wits: 8, presence: 6 }, skills: { barter: 55, speech: 45, mechanics: 50 }, tolls: 300,
    schedule: [{ from: 7, to: 19, spot: 'dysart', activity: 'work' }, { from: 19, to: 7, activity: 'away' }],
    barks: ['Tonnage is a number. I don\'t write the number.', 'Geological. It\'s on the notice.', 'Six reopens when the ground is safe and the Shift is sensible.'],
  },
  {
    id: 'npc_hs_06', name: 'Pim Rasul', look: { seed: 4106, frame: 'broad', age: 15, ancestry: 'south_asian', over: { hair: { style: 'paint_buzz', color: 0x16120e }, weathering: 0.35 } }, role: 'labourer',
    level: 1, ...SK, courage: 20, dialogue: 'd_hs_pim', attrs: { reflex: 7, senses: 7 }, skills: { stealth: 30, survival: 25 }, tolls: 1,
    schedule: [{ from: 7, to: 19, spot: 'pim_pithead', activity: 'idle' }, sleep('pim_shack', 19, 7)],
    barks: ['Geological.', 'I worked the door. Opening and shutting. That\'s all I did.', 'Don\'t ask me about Yusuf.'],
  },
  {
    // the Weighhouse's examiner and the Concern's fitter in the Skirts (company chrome on contract)
    id: 'npc_hs_07', name: 'Dr Teodora Lisle', look: { seed: 4107, frame: 'narrow', age: 58, ancestry: 'mediterranean', over: { hair: { style: 'elvs_unkempt_french_braid', color: 0x8c8278 }, weathering: 0.1 } }, role: 'medic',
    level: 4, team: 'neutral', settlement: 'skirts', faction: 'concern', courage: 40, dialogue: 'd_hs_lisle', attrs: { wits: 9, presence: 7 }, skills: { medicine: 75, science: 60, speech: 45 }, tolls: 250,
    surgeon: { stock: ['ch_spine_hauler', 'ch_neural_lattice', 'ch_eye_concern', 'ch_legs_strider'], fee: 25 },
    schedule: [{ from: 8, to: 20, spot: 'lisle', activity: 'work' }, { from: 20, to: 8, activity: 'away' }],
    barks: ['Over the line is a number, not a judgement.', 'Sit. Breathe. I weigh what you can carry, that\'s all.', 'Service is a door. It is the only door out of the Skirts that opens.'],
  },
  {
    // the ripper on Nursery: dark chrome, cheap, unnetworked
    id: 'npc_hs_08', name: 'Lev Ostrander', look: { seed: 4108, frame: 'broad', age: 61, ancestry: 'north_european', over: { hair: { style: 'none', color: 0xa8a098 }, facialHair: 'full_beard', weathering: 0.7 } }, role: 'medic',
    level: 4, ...SK, courage: 45, dialogue: 'd_hs_lev', attrs: { wits: 8, grit: 6 }, skills: { medicine: 65, mechanics: 50, barter: 40 }, tolls: 90,
    surgeon: { stock: ['ch_arm_breaker', 'ch_eye_heat', 'ch_skin_plate', 'ch_legs_spring'], fee: 30 },
    merchant: { buys: ['junk', 'tool', 'misc', 'consumable'], cash: 180, restockDays: 6, markup: 1.4, stock: [['u_holdfast', 6], ['u_powercell', 3], ['c_bandage', 4], ['c_stillwater', 2]] },
    schedule: [{ from: 6, to: 23, spot: 'lev', activity: 'work' }, sleep('lev_cot', 23, 6)],
    barks: ['Dark work. No channel, no warranty, no Window.', 'Nine years I carried holdfast up there. I know what a body\'s worth by the piece.', 'Sit still or I charge double.'],
  },
  {
    id: 'npc_hs_09', name: 'Nils Haber', look: { seed: 4109, frame: 'broad', age: 22, ancestry: 'north_european', over: { hair: { style: 'cut_messy', color: 0x7a5a38 }, facialHair: 'stubble_light', weathering: 0.4 } }, role: 'labourer',
    level: 2, ...SK, courage: 30, dialogue: 'd_hs_nils', attrs: { brawn: 7, grit: 6 }, skills: { melee: 30, survival: 25 }, tolls: 0,
    barks: ['My father\'s paper. It came to me. That\'s the contract.', 'They say service is up in the gardens.', 'I could walk out. Where to?'],
  },
  {
    id: 'npc_hs_10', name: 'Saba Mekonnen', look: { seed: 4110, frame: 'narrow', age: 34, ancestry: 'east_african', over: { hair: { style: 'coily_twa', color: 0x120e0b }, weathering: 0.5 } }, role: 'settler',
    level: 2, ...SK, courage: 50, dialogue: 'd_hs_saba', attrs: { wits: 7, grit: 7 }, skills: { survival: 30, barter: 30 }, tolls: 2,
    schedule: [{ from: 7, to: 19, spot: 'notice', activity: 'idle' }, sleep('saba_shack', 19, 7)],
    barks: ['Dawit. Have you seen Dawit? Up the hill.', 'Discharged in service. That\'s what they wrote.', 'His boots came back cleaner than he ever kept them.'],
  },
  {
    // the changer at Two-Twelve: the only place scrip and Tolls meet; a Tollmen ticket-holder
    id: 'npc_hs_11', name: 'Cosmin Vulpe', look: { seed: 4111, frame: 'broad', age: 49, ancestry: 'mediterranean', over: { hair: { style: 'cut_crop', color: 0x4a4038 }, facialHair: 'moustache_stubble', weathering: 0.4 } }, role: 'trader',
    level: 3, ...SK, courage: 30, dialogue: 'd_hs_vulpe', faction: 'tollmen', attrs: { wits: 8, presence: 5 }, skills: { barter: 65, speech: 40 }, tolls: 220,
    schedule: [{ from: 6, to: 22, spot: 'changer', activity: 'trade' }, sleep('changer', 22, 6)],
    barks: ['Six to one, scrip to Tolls. Four to one the other way. The board says.', 'I don\'t set the rate. I read it.', 'Tolls for the Line, scrip for the Skirts. Everybody needs both.'],
  },
  {
    id: 'npc_hs_12', name: 'Ama Owusu', look: { seed: 4112, frame: 'narrow', age: 37, ancestry: 'west_african', over: { hair: { style: 'paint_cornrows', color: 0x14100c }, weathering: 0.5 } }, role: 'settler',
    level: 1, ...SK, courage: 40, dialogue: 'd_hs_ama', attrs: { grit: 7, wits: 6 }, skills: { survival: 25 }, tolls: 0,
    barks: ['Two years. A hundred scrip. Sixteen Tolls.', 'Stay by the bags, both of you.', 'Meridian has schools. That\'s all I know about Meridian.'],
  },
  {
    // the scabs' foreman: a Sallow debtor bought off the Ninebridge block, sent up the Line on Concern paper
    id: 'npc_hs_13', name: 'Bartek Nowak', look: { seed: 4113, frame: 'broad', age: 45, ancestry: 'north_european', over: { hair: { style: 'paint_shaved', color: 0x6a5a48 }, facialHair: 'stubble', weathering: 0.65 } }, role: 'labourer',
    level: 3, ...SK, courage: 45, dialogue: 'd_hs_nowak', attrs: { brawn: 8, grit: 7 }, skills: { melee: 40, survival: 35 }, tolls: 0,
    barks: ['We were bought. We work. That\'s what bought means.', 'Twenty of us, one paper each. Nobody asked us anything.', 'I dug salt in the Sallow. Coal\'s just salt that burns.'],
  },
  {
    id: 'npc_hs_14', name: 'Orrin Yazzie', look: { seed: 4114, frame: 'broad', age: 63, ancestry: 'indigenous_american', over: { hair: { style: 'ponytail01', color: 0x8a8682 }, weathering: 0.7 } }, role: 'labourer',
    level: 3, ...SK, courage: 60, dialogue: 'd_hs_tomas', faction: 'the_shift', attrs: { grit: 8, wits: 7 }, skills: { mechanics: 60, survival: 40 }, tolls: 6,
    schedule: [{ from: 0, to: 24, spot: 'cage_man', activity: 'work' }],
    barks: ['Thirty years on this winch. I run it for the Shift.', 'Cage doesn\'t move without me. Clean know it.', 'She talks before she goes. A roof. You learn to hear it.'],
  },
  {
    id: 'npc_hs_15', name: 'Rosa Iqbal', look: { seed: 4115, frame: 'narrow', age: 46, ancestry: 'south_asian', over: { hair: { style: 'elvs_unkempt_french_braid', color: 0x2a221c }, weathering: 0.45 } }, role: 'trader',
    level: 3, ...SK, courage: 55, dialogue: 'd_hs_rosa', attrs: { presence: 7, wits: 8, fortune: 7 }, skills: { barter: 50, speech: 45 }, tolls: 120,
    merchant: { buys: ['consumable', 'junk'], cash: 120, restockDays: 3, markup: 1.3, stock: [['c_bitters', 6], ['c_stillwater', 3], ['c_water', 6], ['c_tin', 4]] },
    schedule: [{ from: 14, to: 3, spot: 'rosa', activity: 'trade' }, sleep('rosa', 3, 14)],
    barks: ['Lampblack. Coal dust and a door that shuts.', 'Dust table\'s open. Bring something you\'d miss.', 'Strike pours are half. Everyone else pays.'],
  },
  {
    // the Pond's champion: fists only, the Pond's rule; his company arm is the Window's to switch off
    id: 'npc_hs_16', name: 'Jun Baek', look: { seed: 4116, frame: 'broad', age: 29, ancestry: 'east_asian', over: { hair: { style: 'cut_crop', color: 0x0e0c0a }, weathering: 0.5, scars: ['lip_split', 'brow_cut'] } }, role: 'labourer',
    level: 6, ...SK, courage: 80, dialogue: 'd_hs_baek', attrs: { brawn: 8, reflex: 8, grit: 8 }, skills: { melee: 65, survival: 30 }, tolls: 30,
    schedule: [{ from: 16, to: 24, spot: 'pond_ring', activity: 'idle' }, { from: 0, to: 16, spot: 'pond_ring', activity: 'away' }],
    barks: ['No chrome in the Pond. They switch mine off for me, if I\'m behind on the Window.', 'Ten scrip says you won\'t get up twice.', 'I dig all day. I fight all night. Sleep\'s for contract citizens.'],
  },
  {
    id: 'npc_hs_17', name: 'Mercy Adjei', look: { seed: 4117, frame: 'narrow', age: 41, ancestry: 'west_african', over: { hair: { style: 'coily_twa', color: 0x15110d }, weathering: 0.35 } }, role: 'trader',
    level: 2, ...SK, courage: 35, dialogue: 'd_hs_mercy', attrs: { wits: 7, presence: 6 }, skills: { barter: 50 }, tolls: 60,
    merchant: { buys: ['junk', 'consumable', 'tool'], cash: 260, restockDays: 4, markup: 1.8, faction: 'concern', stock: [['c_tin', 8], ['c_water', 8], ['c_algae', 6], ['c_bandage', 4], ['a_9mm', 20], ['a_cell', 6], ['u_holdfast', 3]] },
    schedule: [{ from: 7, to: 21, spot: 'mercy', activity: 'trade' }, { from: 21, to: 7, activity: 'away' }],
    barks: ['Provision. Prices on the board.', 'Outsiders pay in Tolls, at the outsider\'s price.', 'Don\'t look at me. I pay the same board.'],
  },
  // the Clean: the Concern's security, in grey that stays clean
  { id: 'npc_hs_g1', name: 'Guard', look: { seed: 4121, frame: 'broad', age: 33, ancestry: 'north_european', over: { hair: { style: 'paint_buzz', color: 0x3a3028 } } }, ...clean, level: 6, dialogue: 'd_hs_clean', equip: ['w_smg9', 'r_riot'], inventory: [['a_9mm', 20]], schedule: [{ from: 6, to: 22, spot: 'clean_cage', activity: 'work' }, { from: 22, to: 6, spot: 'clean_cage_night', activity: 'sleep' }], barks: ['The pit is closed. Unsafe ground.', 'Step back from the cage.'] },
  { id: 'npc_hs_g2', name: 'Guard', look: { seed: 4122, frame: 'narrow', age: 29, ancestry: 'east_asian', over: { hair: { style: 'ponytail01', color: 0x0e0c0a } } }, ...clean, level: 6, dialogue: 'd_hs_clean', equip: ['w_smg9', 'r_riot'], inventory: [['a_9mm', 20]], schedule: [{ from: 0, to: 24, spot: 'gate_a', activity: 'work' }], barks: ['Contracts and the Board\'s guests.', 'Face to the lens.'] },
  { id: 'npc_hs_g3', name: 'Guard', look: { seed: 4123, frame: 'broad', age: 41, ancestry: 'latin_american', over: { hair: { style: 'cut_crop', color: 0x1a1410 } } }, ...clean, level: 6, dialogue: 'd_hs_clean', equip: ['w_smg9', 'r_riot'], inventory: [['a_9mm', 20]], schedule: [{ from: 0, to: 24, spot: 'freight_gate', activity: 'work' }], barks: ['Freight. Not people.', 'Move along.'] },
  { id: 'npc_hs_g4', name: 'Guard', look: { seed: 4124, frame: 'broad', age: 36, ancestry: 'mediterranean', over: { hair: { style: 'paint_buzz', color: 0x1a1410 } } }, ...clean, level: 6, dialogue: 'd_hs_clean', equip: ['w_smg9', 'r_riot'], inventory: [['a_9mm', 20]], schedule: [{ from: 0, to: 24, spot: 'weigh_door', activity: 'work' }], barks: ['One at a time. Sit on the bench.', 'Weighing is voluntary.'] },
  { id: 'npc_hs_g5', name: 'Guard', look: { seed: 4125, frame: 'narrow', age: 27, ancestry: 'south_asian', over: { hair: { style: 'paint_shaved', color: 0x16120e } } }, ...clean, level: 7, dialogue: 'd_hs_clean', equip: ['w_carbine556', 'r_riot'], inventory: [['a_556', 20]], schedule: [{ from: 0, to: 24, spot: 'gate_b', activity: 'work' }], barks: ['Nobody comes near the station.', 'You were told.'] },
];
