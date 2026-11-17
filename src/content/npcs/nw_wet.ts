import type { NpcDef } from '../../engine/npc/defs';

/**
 * The Northern Wet (B5c): Ashby Dam, Sawtown, Low Landing, and the people on the river. Rain wear: oilcloth and waxed canvas
 * over wool, felted and re-felted, dyed bark-brown, moss-green, rust and a faded river blue; the bargefolk in salvaged
 * dock-company orange; the guild's people with its green on a sleeve; the city's courier in Precinct grey that is too thin
 * for the Wet. Story notes: story/B5c_NOTES_SECRET.md.
 */
const sleep = (spot: string, from = 22, to = 6) => ({ from, to, spot, activity: 'sleep' as const });
const ASHBY = { team: 'neutral', settlement: 'ashby' } as const;
const SAW = { team: 'neutral', settlement: 'sawtown' } as const;
const LOW = { team: 'neutral', settlement: 'low_landing' } as const;
/** The city's inspection party on the dam: they answer fire with fire. */
const warden = { team: 'wardens', settlement: 'ashby', faction: 'wardens', role: 'guard' as const, hostileIf: { flag: 'nw_inspection_fight' }, courage: 70, minor: true };
/** The reed boats below Low Landing. */
const reeds = { team: 'reeds', settlement: 'low_landing', role: 'fisher' as const, hostileIf: { flag: 'nw_reeds_fight' }, courage: 55, minor: true };

export const WET_NPCS: NpcDef[] = [
  // ---------------------------------------------------------------- Ashby Dam
  {
    // the keeper: the third Wexford to keep the dam
    id: 'npc_nw_01', name: 'Hedda Wexford', look: { seed: 5401, frame: 'narrow', age: 72, ancestry: 'north_european', over: { hair: { style: 'cut_crop', color: 0xd2d0c8 }, weathering: 0.8 } }, role: 'tech',
    level: 4, ...ASHBY, courage: 60, dialogue: 'd_nw_hedda', attrs: { grit: 9, wits: 8 }, skills: { mechanics: 65, science: 45, survival: 40 }, tolls: 60,
    schedule: [{ from: 6, to: 12, spot: 'hedda', activity: 'work' }, { from: 12, to: 16, spot: 'hedda_crest', activity: 'work' }, { from: 16, to: 21, spot: 'hedda', activity: 'work' }, sleep('hedda_sleep', 21, 6)],
    barks: ['Sixth mark. Same as yesterday.', 'She hums when she\'s happy. Listen.', 'The city sends paper. The Water sends rain.'],
  },
  {
    // her granddaughter: the lock
    id: 'npc_nw_02', name: 'Rhiannon Wexford', look: { seed: 5402, frame: 'narrow', age: 24, ancestry: 'north_european', over: { hair: { style: 'ponytail01', color: 0x7a3418 }, weathering: 0.45 } }, role: 'tech',
    level: 3, ...ASHBY, courage: 55, dialogue: 'd_nw_rhiannon', attrs: { reflex: 7, wits: 7 }, skills: { mechanics: 50, science: 40 }, tolls: 20,
    schedule: [{ from: 6, to: 9, spot: 'rhiannon_lock', activity: 'work' }, { from: 9, to: 20, spot: 'rhiannon', activity: 'work' }, sleep('rhiannon_sleep', 20, 6)],
    barks: ['Lock\'s on the card. Six, and the down barge at noon.', 'Mind the gate. It doesn\'t mind you.', 'Gran says. Gran always says.'],
  },
  {
    // the city's water courier: brings the sealed cards up the river
    id: 'npc_nw_03', name: 'Aurelio Santangelo', look: { seed: 5403, frame: 'broad', age: 39, ancestry: 'mediterranean', over: { hair: { style: 'cut_crop', color: 0x2b1d14 }, facialHair: 'none', weathering: 0.2 } }, role: 'corp',
    level: 3, ...LOW, faction: 'wardens', courage: 35, dialogue: 'd_nw_aurelio', attrs: { wits: 8, presence: 6 }, skills: { science: 40, speech: 40 }, tolls: 45,
    schedule: [{ from: 7, to: 20, spot: 'aurelio', activity: 'idle' }, { from: 20, to: 7, activity: 'away' }],
    barks: ['Cards in, cards out. I only carry them.', 'Is it always raining? It\'s always raining.', 'The water office regrets the inconvenience.'],
  },
  {
    // the inspector: Nine's sibling, commissioned the same week
    id: 'npc_nw_04', name: 'Assessor Seventeen', look: { seed: 5404, frame: 'broad', age: 40, ancestry: 'north_european', over: { hair: { style: 'none', color: 0x404040 }, facialHair: 'none', skinTone: 0.42, skinUndertone: -1, freckles: 0, weathering: 0 } }, role: 'corp',
    level: 7, team: 'wardens', settlement: 'ashby', faction: 'wardens', hostileIf: { flag: 'nw_inspection_fight' }, courage: 60, dialogue: 'd_nw_inspect', attrs: { wits: 10, senses: 8, grit: 7, brawn: 6 }, skills: { science: 70, security: 55 }, tolls: 0,
    equip: ['w_arc_pistol'], inventory: [],
    barks: ['The schedule allows for delay. It does not allow for absence.', 'The keeper will attend.', 'The record suggests a discrepancy.'],
  },
  { id: 'npc_nw_g1', name: 'Warden', look: { seed: 5421, frame: 'broad', age: 33, ancestry: 'latin_american', over: { hair: { style: 'cut_crew', color: 0x1a1410 } } }, ...warden, level: 5, dialogue: 'd_nw_warden', equip: ['w_carbine556', 'r_riot'], inventory: [['a_556', 12]], barks: ['Stand clear of the inspection.', 'Wet. All of it.'] },
  { id: 'npc_nw_g2', name: 'Warden', look: { seed: 5422, frame: 'narrow', age: 28, ancestry: 'east_african', over: { hair: { style: 'paint_cornrows', color: 0x120e0b } } }, ...warden, level: 5, dialogue: 'd_nw_warden', equip: ['w_pump', 'r_riot'], inventory: [['a_12ga', 8]], barks: ['Noted.', 'The keeper will attend.'] },

  // ---------------------------------------------------------------- Sawtown
  {
    // the boom-keeper: the town's only law
    id: 'npc_nw_05', name: 'Berit Solberg', look: { seed: 5405, frame: 'narrow', age: 64, ancestry: 'north_european', over: { hair: { style: 'elvs_unkempt_french_braid', color: 0x8a8782 }, weathering: 0.75 } }, role: 'settler',
    level: 4, ...SAW, courage: 65, dialogue: 'd_nw_berit', attrs: { grit: 8, wits: 8, presence: 7 }, skills: { barter: 55, speech: 45, survival: 40 }, tolls: 90,
    schedule: [{ from: 6, to: 12, spot: 'berit_boom', activity: 'work' }, { from: 12, to: 21, spot: 'berit', activity: 'work' }, sleep('berit_sleep', 21, 6)],
    barks: ['The boom pays what the mark says.', 'Crow\'s foot north, hook south. Every log.', 'The Water is wide.'],
  },
  {
    // the Ridge's foreman
    id: 'npc_nw_06', name: 'Arvid Brandvold', look: { seed: 5406, frame: 'broad', age: 58, ancestry: 'north_european', over: { hair: { style: 'short04', color: 0x8a8782 }, facialHair: 'full_beard', weathering: 0.8, scars: ['cheek_slash'] } }, role: 'labourer',
    level: 5, ...SAW, courage: 60, dialogue: 'd_nw_arvid', attrs: { brawn: 8, grit: 8, presence: 6 }, skills: { survival: 55, melee: 45 }, tolls: 70,
    schedule: [{ from: 5, to: 16, spot: 'arvid_cut', activity: 'work' }, { from: 16, to: 21, spot: 'arvid', activity: 'idle' }, sleep('arvid_sleep', 21, 5)],
    barks: ['The Ridge cuts the Ridge.', 'Two years.', 'Don\'t say his name in my house.'],
  },
  {
    // his daughter
    id: 'npc_nw_07', name: 'Sigrun Brandvold', look: { seed: 5407, frame: 'narrow', age: 20, ancestry: 'north_european', over: { hair: { style: 'elvs_unkempt_french_braid', color: 0xb8935f }, weathering: 0.45 } }, role: 'labourer',
    level: 3, ...SAW, courage: 50, dialogue: 'd_nw_sigrun', attrs: { reflex: 7, wits: 7 }, skills: { survival: 40, stealth: 40 }, tolls: 9,
    schedule: [{ from: 6, to: 12, spot: 'sigrun', activity: 'work' }, { from: 12, to: 20, spot: 'sigrun_boom', activity: 'work' }, sleep('sigrun_sleep', 20, 6)],
    barks: ['I\'m busy.', 'My father says. My father always says.', 'The Water\'s quiet at night. Nobody watches it.'],
  },
  {
    // a Ridge faller with a match in his pocket
    id: 'npc_nw_08', name: 'Cillian Moss', look: { seed: 5408, frame: 'broad', age: 27, ancestry: 'north_european', over: { hair: { style: 'cut_messy', color: 0xa65126 }, facialHair: 'stubble', weathering: 0.6 } }, role: 'labourer',
    level: 4, ...SAW, courage: 70, dialogue: 'd_nw_cillian', attrs: { brawn: 8, reflex: 7 }, skills: { melee: 50, survival: 40 }, tolls: 12,
    schedule: [{ from: 6, to: 17, spot: 'cillian', activity: 'work' }, sleep('cillian_sleep', 22, 6)],
    barks: ['Somebody should do something.', 'Mikkel was my friend.', 'Hooks. They cut hooks like they cut corners.'],
  },
  {
    // the Bottoms' foreman
    id: 'npc_nw_09', name: 'Rufino Huaman', look: { seed: 5409, frame: 'broad', age: 50, ancestry: 'indigenous_american', over: { hair: { style: 'cut_crop', color: 0x2b1d14 }, facialHair: 'stubble', weathering: 0.7 } }, role: 'labourer',
    level: 4, ...SAW, courage: 55, dialogue: 'd_nw_rufino', attrs: { grit: 8, wits: 7 }, skills: { survival: 50, barter: 40 }, tolls: 60,
    schedule: [{ from: 6, to: 17, spot: 'rufino', activity: 'work' }, { from: 17, to: 22, spot: 'rufino_fire', activity: 'idle' }, sleep('rufino_sleep', 22, 6)],
    barks: ['The flats are slow ground. Slow ground doesn\'t kill you.', 'We cut hooks. We always cut hooks.', 'Leave the Ridge to the Ridge.'],
  },
  {
    // his daughter, and Mikkel's child's mother
    id: 'npc_nw_10', name: 'Wayra Huaman', look: { seed: 5410, frame: 'narrow', age: 22, ancestry: 'indigenous_american', over: { hair: { style: 'elvs_unkempt_french_braid', color: 0x120e0b }, weathering: 0.4 } }, role: 'settler',
    level: 2, ...SAW, courage: 45, dialogue: 'd_nw_wayra', attrs: { wits: 7, grit: 7 }, skills: { survival: 30, barter: 30 }, tolls: 4,
    schedule: [{ from: 6, to: 21, spot: 'wayra', activity: 'work' }, sleep('wayra_sleep', 21, 6)],
    barks: ['Shh. She\'s only just gone down.', 'Dorit lets me work for the board. Mostly.', 'Don\'t look at her like that. She\'s a baby.'],
  },
  {
    // the cookhouse, and a room over it
    id: 'npc_nw_11', name: 'Dorit Avraham', look: { seed: 5411, frame: 'narrow', age: 49, ancestry: 'mediterranean', over: { hair: { style: 'ponytail01', color: 0x2b1d14 }, weathering: 0.55 } }, role: 'trader',
    level: 3, ...SAW, courage: 45, dialogue: 'd_nw_dorit', attrs: { presence: 7, wits: 7 }, skills: { barter: 50, speech: 45 }, tolls: 110,
    merchant: { buys: ['consumable', 'junk'], cash: 120, restockDays: 3, markup: 1.3, stock: [['c_water', 6], ['c_jerky', 6], ['c_bitters', 4], ['c_fruit', 2], ['c_meat', 3]] },
    schedule: [{ from: 5, to: 23, spot: 'dorit', activity: 'trade' }, sleep('dorit_sleep', 23, 5)],
    barks: ['Stew. Ridge on the left, Bottoms on the right, and nobody in the middle.', 'Room\'s upstairs. Dry, mostly.', 'Eat. You look like the rain\'s been at you.'],
  },

  // ---------------------------------------------------------------- Low Landing
  {
    // the bargewoman: the Patience was her father's
    id: 'npc_nw_12', name: 'Magda Kowal', look: { seed: 5412, frame: 'narrow', age: 44, ancestry: 'north_european', over: { hair: { style: 'cut_crop', color: 0x46301f }, weathering: 0.7, scars: ['chin_nick'] } }, role: 'fisher',
    level: 4, ...LOW, courage: 60, dialogue: 'd_nw_magda', attrs: { brawn: 7, grit: 8, senses: 7 }, skills: { survival: 55, barter: 40, melee: 35 }, tolls: 8,
    schedule: [{ from: 5, to: 9, spot: 'magda_quay', activity: 'idle' }, { from: 9, to: 22, spot: 'magda', activity: 'work' }, sleep('magda_sleep', 22, 5)],
    barks: ['The Patience. My father\'s. Then mine. Then the guild\'s, if I\'m not careful.', 'River\'s low. River\'s always low.', 'Sweeps take two. I\'ve one pair of arms.'],
  },
  {
    // the guild's barge factor
    id: 'npc_nw_13', name: 'Factor Lorcan Pryce', look: { seed: 5413, frame: 'broad', age: 52, ancestry: 'north_european', over: { hair: { style: 'cut_crop', color: 0x8f6c45 }, facialHair: 'moustache', weathering: 0.3 } }, role: 'trader',
    level: 5, ...LOW, faction: 'tollmen', courage: 45, dialogue: 'd_nw_pryce', attrs: { wits: 8, presence: 7 }, skills: { barter: 60, speech: 50 }, tolls: 400,
    schedule: [{ from: 8, to: 12, spot: 'pryce_quay', activity: 'idle' }, { from: 12, to: 20, spot: 'pryce', activity: 'work' }, sleep('pryce', 20, 8)],
    barks: ['The river\'s a contract like any other.', 'Moorings are due at the month, wet or dry.', 'The guild carries what the guild is paid to carry.'],
  },
  {
    // the chandler: rope, fuel, parts; the berth on the hulk
    id: 'npc_nw_14', name: 'Bao Tran', look: { seed: 5414, frame: 'broad', age: 57, ancestry: 'southeast_asian', over: { hair: { style: 'cut_crop', color: 0x8a8782 }, facialHair: 'moustache_stubble', weathering: 0.6 } }, role: 'trader',
    level: 3, ...LOW, courage: 40, dialogue: 'd_nw_bao', attrs: { wits: 8, presence: 6 }, skills: { barter: 55, mechanics: 45 }, tolls: 160,
    merchant: { buys: ['junk', 'tool', 'consumable'], cash: 180, restockDays: 4, markup: 1.3, stock: [['t_repair', 2], ['j_fuel', 4], ['j_wiring', 3], ['j_cloth', 6], ['c_water', 4], ['t_lamp', 1], ['c_bandage', 3]] },
    schedule: [{ from: 6, to: 21, spot: 'bao', activity: 'trade' }, sleep('bao_sleep', 21, 6)],
    barks: ['Rope, rings, rivets. Everything a barge forgets.', 'Fuel\'s the Rigs\' oil, cooked. Don\'t breathe it.', 'The hulk\'s berth is dry. Driest thing on the river.'],
  },
  {
    // on the guild's winch on paper
    id: 'npc_nw_15', name: 'Emeka Uzor', look: { seed: 5415, frame: 'broad', age: 31, ancestry: 'west_african', over: { hair: { style: 'paint_buzz', color: 0x120e0b }, facialHair: 'stubble', weathering: 0.7 } }, role: 'labourer',
    level: 3, ...LOW, courage: 40, dialogue: 'd_nw_emeka', attrs: { brawn: 8, grit: 7 }, skills: { mechanics: 35, survival: 30 }, tolls: 1,
    schedule: [{ from: 6, to: 20, spot: 'emeka', activity: 'work' }, sleep('emeka_sleep', 20, 6)],
    barks: ['Heave.', 'Eleven months. One to go.', 'Don\'t let him put you on paper. Don\'t.'],
  },
  {
    // the reed boats below the Landing
    id: 'npc_nw_16', name: 'Bryony Sedge', look: { seed: 5416, frame: 'narrow', age: 40, ancestry: 'north_european', over: { hair: { style: 'elvs_unkempt_french_braid', color: 0x6a4a30 }, weathering: 0.8 } },
    level: 5, ...reeds, courage: 60, dialogue: 'd_nw_bryony', attrs: { senses: 8, reflex: 7, presence: 7 }, skills: { survival: 60, firearms: 45, speech: 45 }, tolls: 30,
    equip: ['w_bolt308'], inventory: [['a_308', 8]],
    barks: ['Quiet on the water.', 'We know every barge on this river by her lamp.', 'Not your cargo. Never yours.'],
  },
  { id: 'npc_nw_g3', name: 'Reed boatman', look: { seed: 5423, frame: 'broad', age: 35, ancestry: 'latin_american', over: { hair: { style: 'cut_messy', color: 0x2b1d14 }, facialHair: 'stubble_heavy' } }, ...reeds, level: 4, dialogue: 'd_nw_bryony', equip: ['w_pump'], inventory: [['a_12ga', 6]], barks: ['Easy.', 'Hold the boat.'] },
  { id: 'npc_nw_g4', name: 'Reed boatman', look: { seed: 5424, frame: 'narrow', age: 24, ancestry: 'southeast_asian', over: { hair: { style: 'ponytail01', color: 0x16120e } } }, ...reeds, level: 4, dialogue: 'd_nw_bryony', equip: ['w_revolver38'], inventory: [['a_38', 6]], barks: ['Lamp\'s down.', 'Quiet.'] },
  // the Wet's roads
  {
    id: 'npc_nw_w1', name: 'Ulf', look: { seed: 5431, frame: 'broad', age: 63, ancestry: 'north_european', over: { hair: { style: 'none', color: 0xd2d0c8 }, facialHair: 'full_beard', weathering: 0.85 } }, role: 'labourer',
    team: 'neutral', level: 2, dialogue: 'd_re_nw_mule', attrs: { grit: 7 }, skills: { survival: 40 }, tolls: 4,
    barks: ['Hup. Hup.', 'Towpath\'s mine and the mule\'s.'],
  },
];
