import type { NpcDef } from '../../engine/npc/defs';

/**
 * The Rail Corridor (B5a): Four Ways (the Junction), West Halt, East Halt, Yard Nine (the depot), Kettle Cut, and the people
 * met on the Line's roads. Rail-crew hi-vis is the corridor's common wear (a uniform of the dead, faded orange and yellow,
 * patched and re-dyed); the guild's people wear its green; the Concern's man is clean. Story notes:
 * story/STORY_PLAN_SECRET.md, Build notes — B5.
 */
const sleep = (spot: string, from = 22, to = 6) => ({ from, to, spot, activity: 'sleep' as const });
const FW = { team: 'neutral', settlement: 'fourways' } as const;
const HW = { team: 'neutral', settlement: 'west_halt' } as const;
const HE = { team: 'neutral', settlement: 'east_halt' } as const;
const YD = { team: 'neutral', settlement: 'yard_nine' } as const;
/** West Halt's watch: the halt's own militia. They turn on whoever opens fire on them at Kettle or on the road. */
const WATCH = { team: 'west_halt', settlement: 'west_halt', hostileIf: { flag: 'rc_kettle_fight' }, courage: 70 } as const;
/** The guild's guards on Four Ways' platform. */
const guild = { team: 'tollmen', settlement: 'fourways', faction: 'tollmen', role: 'guard' as const, hostileIf: { flag: 'rc_fw_fight' }, courage: 60, minor: true };

export const CORRIDOR_NPCS: NpcDef[] = [
  // ---------------------------------------------------------------- Four Ways
  {
    // the stationmaster: timetable law; a decent tyrant; born at West Halt
    id: 'npc_rc_01', name: 'Casimir Brodsky', look: { seed: 5101, frame: 'broad', age: 58, ancestry: 'north_european', over: { hair: { style: 'short04', color: 0x8a8782 }, facialHair: 'short_beard', weathering: 0.5 } }, role: 'tech',
    level: 6, ...FW, courage: 70, dialogue: 'd_rc_brodsky', attrs: { wits: 8, presence: 8, grit: 7 }, skills: { speech: 55, mechanics: 50, firearms: 40, barter: 40 }, tolls: 160,
    schedule: [{ from: 6, to: 9, spot: 'brodsky_platform', activity: 'idle' }, { from: 9, to: 21, spot: 'brodsky', activity: 'work' }, sleep('brodsky_sleep', 21, 6)],
    barks: ['On time.', 'The clock is right. If you are not, that is between you and the clock.', 'Out of time is out of law, on my track.'],
  },
  {
    // the guild's factor at Four Ways: through-running is his sheet
    id: 'npc_rc_04', name: 'Factor Severin Kask', look: { seed: 5104, frame: 'broad', age: 50, ancestry: 'north_european', over: { hair: { style: 'cut_crop', color: 0x6a4a30 }, facialHair: 'none', weathering: 0.15 } }, role: 'trader',
    level: 5, ...FW, faction: 'tollmen', courage: 45, dialogue: 'd_rc_kask', attrs: { wits: 9, presence: 7 }, skills: { barter: 65, speech: 55 }, tolls: 500,
    schedule: [{ from: 8, to: 19, spot: 'kask', activity: 'work' }, { from: 19, to: 22, spot: 'kask_hall', activity: 'idle' }, sleep('kask', 22, 8)],
    barks: ['The Line is a contract. Everything else is weather.', 'Two hundred, and a pass. The guild pays its debts.', 'Through-running is progress. Ask the Concern.'],
  },
  {
    // the signalwoman: forty years at the token instruments
    id: 'npc_rc_05', name: 'Halina Wrona', look: { seed: 5105, frame: 'narrow', age: 63, ancestry: 'north_european', over: { hair: { style: 'ponytail01', color: 0xd2d0c8 }, weathering: 0.55 } }, role: 'tech',
    level: 3, ...FW, courage: 50, dialogue: 'd_rc_halina', attrs: { wits: 9, senses: 7 }, skills: { science: 55, mechanics: 60 }, tolls: 25,
    schedule: [{ from: 5, to: 23, spot: 'halina', activity: 'work' }, sleep('halina_sleep', 23, 5)],
    barks: ['Token out. Token in. That is the whole of it.', 'The register does not lie, so I do not write lies in it.', 'Forty years, and the instruments have never once been wrong. People have.'],
  },
  {
    id: 'npc_rc_06', name: 'Yetunde Ajayi', look: { seed: 5106, frame: 'narrow', age: 29, ancestry: 'west_african', over: { hair: { style: 'paint_cornrows', color: 0x120e0b }, weathering: 0.2 } }, role: 'trader',
    level: 2, ...FW, faction: 'tollmen', courage: 35, dialogue: 'd_rc_board_fw', attrs: { wits: 7, presence: 6 }, skills: { barter: 45, speech: 40 }, tolls: 80,
    schedule: [{ from: 6, to: 20, spot: 'ticket', activity: 'work' }, { from: 20, to: 6, activity: 'away' }],
    barks: ['Twenty-five a leg. The guild sets it, not me.', 'Seven o\'clock, both ways.', 'Your face for the card. Everyone\'s face goes on the card.'],
  },
  {
    // the old refreshment room, and the berths in the sleeper cars on the dead siding
    id: 'npc_rc_07', name: 'Nuno Batista', look: { seed: 5107, frame: 'broad', age: 51, ancestry: 'mediterranean', over: { hair: { style: 'cut_crop', color: 0x2b1d14 }, facialHair: 'moustache', weathering: 0.4 } }, role: 'trader',
    level: 3, ...FW, courage: 40, dialogue: 'd_rc_nuno', attrs: { presence: 7, wits: 7 }, skills: { barter: 50, speech: 45 }, tolls: 140,
    merchant: { buys: ['consumable', 'junk'], cash: 160, restockDays: 3, markup: 1.3, stock: [['c_water', 8], ['c_bitters', 6], ['c_tin', 4], ['c_jerky', 4], ['c_fruit', 2]] },
    schedule: [{ from: 6, to: 24, spot: 'nuno', activity: 'trade' }, sleep('nuno', 0, 6)],
    barks: ['Batista\'s. Food, drink, a berth if you can pay for one.', 'Nobody drinks before the seven o\'clock. Afterwards, everybody.', 'The guard Gorse drank here. Paid every time. Write that on his stone.'],
  },
  { id: 'npc_rc_g1', name: 'Guard', look: { seed: 5121, frame: 'broad', age: 34, ancestry: 'latin_american', over: { hair: { style: 'cut_crew', color: 0x1a1410 } } }, ...guild, level: 5, dialogue: 'd_rc_guard', equip: ['w_carbine556', 'r_riot'], inventory: [['a_556', 20]], schedule: [{ from: 0, to: 24, spot: 'guard_a', activity: 'work' }], barks: ['Ticket.', 'Stand back from the edge.'] },
  { id: 'npc_rc_g2', name: 'Guard', look: { seed: 5122, frame: 'narrow', age: 30, ancestry: 'south_asian', over: { hair: { style: 'ponytail01', color: 0x16120e } } }, ...guild, level: 5, dialogue: 'd_rc_guard', equip: ['w_carbine556', 'r_riot'], inventory: [['a_556', 20]], schedule: [{ from: 0, to: 24, spot: 'guard_b', activity: 'work' }], barks: ['Guild property. Move along.', 'Gorse was a friend of mine.'] },

  // ---------------------------------------------------------------- West Halt
  {
    // West Halt's watch captain; the hold-ups at Kettle are hers
    id: 'npc_rc_02', name: 'Chela Ortega', look: { seed: 5102, frame: 'narrow', age: 36, ancestry: 'latin_american', over: { hair: { style: 'elvs_unkempt_french_braid', color: 0x120e0b }, weathering: 0.55, scars: ['chin_nick'] } }, role: 'guard',
    level: 7, ...WATCH, dialogue: 'd_rc_chela', attrs: { reflex: 8, senses: 7, grit: 7, presence: 7 }, skills: { firearms: 60, stealth: 45, survival: 45, speech: 40 }, tolls: 40,
    equip: ['w_bolt308'], inventory: [['a_308', 12], ['c_water', 1]],
    schedule: [{ from: 6, to: 12, spot: 'chela_platform', activity: 'idle' }, { from: 12, to: 23, spot: 'chela', activity: 'work' }, sleep('chela_sleep', 23, 6)],
    barks: ['Nobody hurt. That was the rule.', 'The through doesn\'t blow for us. We don\'t wave.', 'You want the seven o\'clock, the flag\'s there.'],
  },
  {
    // of West Halt's watch; shot the guild's guard at Kettle
    id: 'npc_rc_03', name: 'Abe Mutasa', look: { seed: 5103, frame: 'broad', age: 19, ancestry: 'east_african', over: { hair: { style: 'paint_buzz', color: 0x120e0b }, weathering: 0.3 } }, role: 'guard',
    level: 4, ...WATCH, courage: 40, dialogue: 'd_rc_abe', attrs: { reflex: 7, brawn: 6 }, skills: { firearms: 40, survival: 30 }, tolls: 3,
    equip: ['w_pistol9'], inventory: [['a_9mm', 8]],
    schedule: [{ from: 7, to: 20, spot: 'abe_sit', activity: 'idle' }, sleep('abe', 20, 7)],
    barks: ['I\'m all right.', 'He fired first. Didn\'t he? He fired first.', 'I don\'t sleep much. It\'s fine.'],
  },
  {
    // West Halt's keeper; Chela's mother's sister
    id: 'npc_rc_09', name: 'Socorro Quispe', look: { seed: 5109, frame: 'narrow', age: 52, ancestry: 'indigenous_american', over: { hair: { style: 'elvs_unkempt_french_braid', color: 0x2b1d14 }, weathering: 0.6 } }, role: 'settler',
    level: 3, ...HW, courage: 55, dialogue: 'd_rc_socorro', attrs: { grit: 8, wits: 7 }, skills: { survival: 45, barter: 40, mechanics: 35 }, tolls: 12,
    schedule: [{ from: 6, to: 10, spot: 'socorro_platform', activity: 'idle' }, { from: 10, to: 22, spot: 'socorro', activity: 'work' }, sleep('socorro_sleep', 22, 6)],
    barks: ['The tank leaks. It\'s shut.', 'Length money. We keep the length, they keep the money.', 'Bread\'s for whoever\'s hungry. Nobody\'s counting.'],
  },
  {
    // West Halt's line-keeper and pilotman; runs the handcar
    id: 'npc_rc_10', name: 'Eamon Fahy', look: { seed: 5110, frame: 'broad', age: 39, ancestry: 'north_european', over: { hair: { style: 'short04', color: 0x7a3418 }, facialHair: 'stubble', weathering: 0.6 } }, role: 'labourer',
    level: 3, ...HW, courage: 55, dialogue: 'd_rc_eamon', attrs: { brawn: 8, grit: 7 }, skills: { mechanics: 45, survival: 35, melee: 30 }, tolls: 6,
    schedule: [{ from: 6, to: 21, spot: 'eamon', activity: 'work' }, { from: 21, to: 23, spot: 'eamon_tower', activity: 'idle' }, sleep('eamon_sleep', 23, 6)],
    barks: ['Every bolt on forty miles of track, I know by its first name.', 'Pump and look ahead. That\'s handcars.', 'Pilotman. Used to be a job. Used to be paid.'],
  },
  {
    // one of the twelve: speaks for them
    id: 'npc_rc_11', name: 'Yaw Boateng', look: { seed: 5111, frame: 'broad', age: 33, ancestry: 'west_african', over: { hair: { style: 'coily_twa', color: 0x120e0b }, facialHair: 'stubble', weathering: 0.55 } }, role: 'labourer',
    level: 2, ...HW, courage: 45, dialogue: 'd_rc_yaw', attrs: { grit: 7, presence: 6 }, skills: { survival: 30, speech: 35 }, tolls: 0,
    barks: ['Twelve of us. Count us if you like. Everyone else does.', 'Intake. Nobody on the block knows what it means.', 'I can lay track. I can dig. I can do anything that isn\'t intake.'],
  },
  {
    // Chela's brother: sold for West Halt's tower debt
    id: 'npc_rc_12', name: 'Joaquin Ortega', look: { seed: 5112, frame: 'broad', age: 17, ancestry: 'latin_american', over: { hair: { style: 'cut_messy', color: 0x120e0b }, weathering: 0.3 } }, role: 'labourer',
    level: 1, ...HW, courage: 35, dialogue: 'd_rc_joaquin', attrs: { reflex: 7, brawn: 6 }, skills: { mechanics: 25, survival: 20 }, tolls: 0,
    barks: ['Somebody had to go. I\'m the one who could.', 'Chela shouldn\'t have. Don\'t tell her I said that.', 'The tank\'s fixed now. That\'s something.'],
  },
  // West Halt's watch at Kettle by night (the run) and on the road
  { id: 'npc_rc_g3', name: 'Watch', look: { seed: 5123, frame: 'broad', age: 41, ancestry: 'north_european', over: { hair: { style: 'cut_crop', color: 0x46301f }, facialHair: 'stubble_heavy' } }, ...WATCH, role: 'guard', minor: true, level: 4, dialogue: 'd_rc_kettle_night', equip: ['w_pump'], inventory: [['a_12ga', 6]], barks: ['Quiet.', 'Lamp down.'] },
  { id: 'npc_rc_g4', name: 'Watch', look: { seed: 5124, frame: 'narrow', age: 28, ancestry: 'mediterranean', over: { hair: { style: 'ponytail01', color: 0x2b1d14 } } }, ...WATCH, role: 'guard', minor: true, level: 4, dialogue: 'd_rc_kettle_night', equip: ['w_revolver38'], inventory: [['a_38', 6]], barks: ['Handcar\'s ready.', 'Nobody hurt.'] },

  // ---------------------------------------------------------------- East Halt
  {
    // East Halt's keeper
    id: 'npc_rc_13', name: 'Imani Wekesa', look: { seed: 5113, frame: 'narrow', age: 45, ancestry: 'east_african', over: { hair: { style: 'coily_twa', color: 0x120e0b }, weathering: 0.55 } }, role: 'settler',
    level: 3, ...HE, courage: 60, dialogue: 'd_rc_imani', attrs: { grit: 8, wits: 8, presence: 6 }, skills: { barter: 45, mechanics: 40, survival: 35 }, tolls: 8,
    schedule: [{ from: 6, to: 10, spot: 'imani_platform', activity: 'idle' }, { from: 10, to: 22, spot: 'imani', activity: 'work' }, sleep('imani_sleep', 22, 6)],
    barks: ['Fourteen. Write that down somewhere. Fourteen.', 'The through goes by at two. I can tell you which car rattles.', 'We sell water. Nobody stops for it.'],
  },
  {
    // East Halt's old line-keeper: walks the length every morning
    id: 'npc_rc_14', name: 'Gerrit Haas', look: { seed: 5114, frame: 'broad', age: 67, ancestry: 'north_european', over: { hair: { style: 'none', color: 0xd2d0c8 }, facialHair: 'full_beard', weathering: 0.8 } }, role: 'labourer',
    level: 3, ...HE, courage: 50, dialogue: 'd_rc_gerrit', attrs: { grit: 8, senses: 7 }, skills: { mechanics: 55, survival: 40 }, tolls: 4,
    schedule: [{ from: 5, to: 9, spot: 'gerrit_length', activity: 'work' }, { from: 9, to: 21, spot: 'gerrit', activity: 'idle' }, sleep('gerrit_sleep', 21, 5)],
    barks: ['Fishplates, bolts, chairs, keys. A length is a lot of small things.', 'A rail pulled is a rail you can\'t put back.', 'Fifty years. I\'ve walked it fifty years.'],
  },
  {
    id: 'npc_rc_15', name: 'Kofi Mensah', look: { seed: 5115, frame: 'broad', age: 13, ancestry: 'west_african', over: { hair: { style: 'paint_buzz', color: 0x120e0b }, weathering: 0.3 } }, role: 'street',
    level: 1, ...HE, courage: 30, dialogue: 'd_rc_kofi', attrs: { reflex: 7, senses: 7 }, skills: { barter: 35, stealth: 30 }, tolls: 5,
    merchant: { buys: ['junk'], cash: 20, restockDays: 5, markup: 0.7, stock: [['c_tin', 10]] },
    schedule: [{ from: 7, to: 20, spot: 'kofi', activity: 'trade' }, sleep('kofi_sleep', 20, 7)],
    barks: ['Tins! Tins, two Tolls! Good tins!', 'Don\'t ask where. Tins don\'t say where.', 'I count the cars. Every night. Nineteen on the through.'],
  },

  // ---------------------------------------------------------------- Yard Nine
  {
    // the depot's foreman fitter; Dorcas's keeper
    id: 'npc_rc_16', name: 'Ida Szalai', look: { seed: 5116, frame: 'narrow', age: 55, ancestry: 'north_european', over: { hair: { style: 'cut_crop', color: 0x8a8782 }, weathering: 0.55, scars: ['burn_left'] } }, role: 'tech',
    level: 4, ...YD, courage: 55, dialogue: 'd_rc_ida', attrs: { wits: 8, grit: 7 }, skills: { mechanics: 70, science: 45 }, tolls: 120,
    merchant: { buys: ['junk', 'tool'], cash: 200, restockDays: 5, markup: 1.3, stock: [['t_repair', 3], ['j_wiring', 4], ['j_electronics', 2], ['j_scrap', 8], ['u_powercell', 2], ['j_fuel', 3]] },
    schedule: [{ from: 6, to: 12, spot: 'ida_shed', activity: 'work' }, { from: 12, to: 21, spot: 'ida', activity: 'work' }, sleep('ida_sleep', 21, 6)],
    barks: ['She\'s not dead. She\'s sulking.', 'Grain, still, tank, engine. Break one and the Line stops.', 'Hand me that. No, the other that.'],
  },
  {
    // the guild's driver: Sixty, and the through
    id: 'npc_rc_17', name: 'Willem Visser', look: { seed: 5117, frame: 'broad', age: 48, ancestry: 'north_european', over: { hair: { style: 'cut_crew', color: 0x8f6c45 }, facialHair: 'short_beard', weathering: 0.5 } }, role: 'tech',
    level: 4, ...YD, faction: 'tollmen', courage: 50, dialogue: 'd_rc_willem', attrs: { reflex: 7, grit: 7 }, skills: { mechanics: 55, firearms: 35 }, tolls: 45,
    schedule: [{ from: 5, to: 8, spot: 'willem_platform', activity: 'idle' }, { from: 8, to: 20, spot: 'willem', activity: 'work' }, sleep('willem_sleep', 20, 5)],
    barks: ['We used to stop for water and gossip. Now we stop for nothing.', 'Sixty\'s a good engine. She\'s tired. So am I.', 'Through-running. I run through. That\'s the job.'],
  },
  {
    // the still: the engines' alcohol from Openfield's spoiled grain
    id: 'npc_rc_18', name: 'Jide Olatunji', look: { seed: 5118, frame: 'broad', age: 40, ancestry: 'west_african', over: { hair: { style: 'paint_shaved', color: 0x120e0b }, facialHair: 'short_beard', weathering: 0.45 } }, role: 'labourer',
    level: 3, ...YD, courage: 50, dialogue: 'd_rc_jide', attrs: { wits: 7, grit: 7 }, skills: { science: 45, barter: 45 }, tolls: 90,
    merchant: { buys: ['consumable', 'junk'], cash: 140, restockDays: 4, markup: 1.3, stock: [['j_fuel', 6], ['c_bitters', 4], ['c_water', 4], ['c_stillwater', 1]] },
    schedule: [{ from: 6, to: 22, spot: 'jide', activity: 'trade' }, sleep('jide_sleep', 22, 6)],
    barks: ['Openfield\'s spoiled grain, my still, Sixty\'s tank. Bread into miles.', 'Engine spirit. Not for drinking. Well. Not much.', 'Smell that? That\'s the Line.'],
  },
  {
    // the Concern's field engineer at Yard Nine: looks forty
    id: 'npc_rc_19', name: 'Mr Anders Whitlock', look: { seed: 5119, frame: 'broad', age: 40, ancestry: 'north_european', over: { hair: { style: 'cut_crop', color: 0x46301f }, facialHair: 'none', weathering: 0 } }, role: 'corp',
    level: 4, ...YD, faction: 'concern', courage: 40, dialogue: 'd_rc_whitlock', attrs: { wits: 9, presence: 8 }, skills: { science: 60, barter: 55, speech: 55 }, tolls: 400,
    schedule: [{ from: 8, to: 20, spot: 'whitlock', activity: 'work' }, { from: 20, to: 8, activity: 'away' }],
    barks: ['The old board has reached the end of its service.', 'Nobody has to decide anything today.', 'The Concern keeps the Line running. It is in everybody\'s interest.'],
  },
  {
    // rides the rods: hops the through-freight on the curve
    id: 'npc_rc_08', name: 'Ferris Doyle', look: { seed: 5108, frame: 'broad', age: 47, ancestry: 'north_european', over: { hair: { style: 'cut_messy', color: 0x46301f }, facialHair: 'stubble_heavy', weathering: 0.8 } }, role: 'drifter',
    level: 3, ...YD, courage: 40, dialogue: 'd_rc_ferris', attrs: { reflex: 8, senses: 7, fortune: 6 }, skills: { stealth: 50, survival: 45 }, tolls: 2,
    schedule: [{ from: 6, to: 22, spot: 'ferris', activity: 'idle' }, { from: 22, to: 3, spot: 'ferris_curve', activity: 'idle' }, sleep('ferris', 3, 6)],
    barks: ['Never pay for a ride a curve will give you.', 'The through slows on the bend. Everything slows on the bend.', 'Seen things from the rods. Seen a green lamp at Kettle.'],
  },

  // ---------------------------------------------------------------- the Line's roads
  { id: 'npc_rc_w1', name: 'Track ganger', look: { seed: 5131, frame: 'broad', age: 44, ancestry: 'latin_american', over: { hair: { style: 'cut_crop', color: 0x2b1d14 }, facialHair: 'stubble' } }, role: 'labourer', team: 'neutral', minor: true, level: 2, dialogue: 'd_re_rc_gang', barks: ['Lift on three.', 'Mind your feet.'] },
  { id: 'npc_rc_w2', name: 'Track ganger', look: { seed: 5132, frame: 'narrow', age: 31, ancestry: 'south_asian', over: { hair: { style: 'elvs_unkempt_french_braid', color: 0x16120e } } }, role: 'labourer', team: 'neutral', minor: true, level: 2, dialogue: 'd_re_rc_gang', barks: ['One more rail.', 'Water\'s in the can.'] },
  { id: 'npc_rc_w3', name: 'Dulcie', look: { seed: 5133, frame: 'narrow', age: 24, ancestry: 'north_european', over: { hair: { style: 'ponytail01', color: 0x8f6c45 }, weathering: 0.7 } }, role: 'drifter', team: 'neutral', level: 2, dialogue: 'd_re_rc_rods', attrs: { reflex: 7 }, skills: { stealth: 40 }, tolls: 1, barks: ['Don\'t look at it. I know what it looks like.', 'Fell off at the bend. Never fall off at the bend.'] },
];
