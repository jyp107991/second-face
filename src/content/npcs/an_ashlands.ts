import type { NpcDef } from '../../engine/npc/defs';

/**
 * The Ashlands (B5d): Spindle, the pickers' camp on the plateau's western edge, and the people who work the glass. Pickers'
 * wear is whatever came back off the glass: convoy canvas and army webbing re-dyed rust, ochre and slate, layered against
 * the sun and patched where the glass cut it, scarves at the throat against the dust (never over the face), goggles pushed
 * up. The Concern's contractor wears his own clothes clean, and so do the two men he pays. Story notes:
 * story/B5d_NOTES_SECRET.md.
 */
const sleep = (spot: string, from = 22, to = 6) => ({ from, to, spot, activity: 'sleep' as const });
const SPINDLE = { team: 'neutral', settlement: 'spindle' } as const;
/** The contractor's hired men: they fire on anyone who fires on him. */
const hired = { team: 'concern', settlement: 'spindle', faction: 'concern', role: 'guard' as const, hostileIf: { flag: 'an_sorlie_fight' }, courage: 55, minor: true };

export const ASHLANDS_NPCS: NpcDef[] = [
  {
    // the weigher: buys what comes off the glass, keeps the board, closes the roads that kill
    id: 'npc_an_01', name: 'Hester Kwarteng', look: { seed: 5801, frame: 'narrow', age: 58, ancestry: 'west_african', over: { hair: { style: 'coily_twa', color: 0x8a8782 }, weathering: 0.8 } }, role: 'trader',
    level: 5, ...SPINDLE, courage: 60, dialogue: 'd_an_hester', attrs: { wits: 8, presence: 7, grit: 8 }, skills: { barter: 60, survival: 45, speech: 45 }, tolls: 220,
    merchant: { buys: ['junk', 'tool', 'consumable'], cash: 260, restockDays: 5, markup: 1.3, stock: [['c_water', 4], ['c_jerky', 4], ['t_lamp', 1], ['j_scrap', 4], ['c_iodine', 2]] },
    schedule: [{ from: 7, to: 20, spot: 'hester', activity: 'trade' }, { from: 20, to: 22, spot: 'hester_board', activity: 'idle' }, sleep('hester_sleep', 22, 7)],
    barks: ['Names on the board before you go.', 'I weigh what comes back. I don\'t weigh who doesn\'t.', 'Kelso\'s shut. I shut it.'],
  },
  {
    // her grandson: sixteen, and wants the glass the way boys want the sea
    id: 'npc_an_02', name: 'Kwesi Kwarteng', look: { seed: 5802, frame: 'broad', age: 16, ancestry: 'west_african', over: { hair: { style: 'paint_buzz', color: 0x120e0b }, weathering: 0.45 } }, role: 'drifter',
    level: 2, ...SPINDLE, courage: 45, dialogue: 'd_an_kwesi', attrs: { reflex: 7, senses: 7 }, skills: { stealth: 35, survival: 25 }, tolls: 4,
    schedule: [{ from: 7, to: 21, spot: 'kwesi', activity: 'idle' }, sleep('kwesi_sleep', 21, 7)],
    barks: ['I could do the panels. I know the panels.', 'Gran says no. Gran says no to everything.', 'Have you been to Kelso? Really been?'],
  },
  {
    // the kite-watcher: up the tower all day with a pre-war scope, and the flag
    id: 'npc_an_03', name: 'Ingmar Lund', look: { seed: 5803, frame: 'broad', age: 46, ancestry: 'north_european', over: { hair: { style: 'cut_crop', color: 0x6a5238 }, facialHair: 'short_beard', weathering: 0.85 } }, role: 'nomad',
    level: 4, ...SPINDLE, courage: 50, dialogue: 'd_an_ingmar', attrs: { senses: 9, grit: 6 }, skills: { survival: 55, firearms: 45 }, tolls: 18,
    equip: ['w_bolt308'], inventory: [['a_308', 6]],
    schedule: [{ from: 6, to: 20, spot: 'ingmar', activity: 'work' }, sleep('ingmar_sleep', 20, 6)],
    barks: ['Two up over the panels. No, three.', 'If it moves, it\'s seen. If it\'s seen, it\'s dead.', 'Flag down. Go on, then.'],
  },
  {
    // the doctor: iodine, flush, burns, and what the glass does to people who stay out too long
    id: 'npc_an_04', name: 'Delphine Arcand', look: { seed: 5804, frame: 'narrow', age: 41, ancestry: 'mediterranean', over: { hair: { style: 'elvs_unkempt_french_braid', color: 0x3a2a20 }, weathering: 0.6, scars: ['brow_cut'] } }, role: 'medic',
    level: 4, ...SPINDLE, courage: 45, dialogue: 'd_an_delphine', attrs: { wits: 8, senses: 7 }, skills: { medicine: 65, science: 40 }, tolls: 40,
    merchant: { buys: ['consumable'], cash: 80, restockDays: 4, markup: 1.4, stock: [['c_iodine', 3], ['c_radflush', 2], ['c_bandage', 3], ['c_splint', 1]] },
    schedule: [{ from: 7, to: 22, spot: 'delphine', activity: 'work' }, sleep('delphine_sleep', 22, 7)],
    barks: ['Iodine before. Flush after. Not the other way round.', 'Show me your hands.', 'The glass doesn\'t burn you. The light off it does.'],
  },
  {
    // the hound-keeper: a picker who found a border hound with its lineage burned out of it, and kept it
    id: 'npc_an_05', name: 'Radu Ilie', look: { seed: 5805, frame: 'broad', age: 52, ancestry: 'mediterranean', over: { hair: { style: 'short04', color: 0x2a2420 }, facialHair: 'stubble_heavy', weathering: 0.85, scars: ['burn_right'] } }, role: 'nomad',
    level: 5, ...SPINDLE, courage: 55, dialogue: 'd_an_radu', attrs: { senses: 8, grit: 7, brawn: 7 }, skills: { survival: 60, mechanics: 45 }, tolls: 25,
    merchant: { buys: ['junk'], cash: 60, restockDays: 5, markup: 1.2, stock: [['c_water', 2], ['c_meat', 2], ['j_wiring', 2]] },
    schedule: [{ from: 6, to: 22, spot: 'radu', activity: 'work' }, sleep('radu_sleep', 22, 6)],
    barks: ['Don\'t put your hand out to her. She doesn\'t know hands.', 'By day they lie in the sun. By night, they don\'t.', 'Pidge. Sit. Good.'],
  },
  {
    // the one who came back from Kelso
    id: 'npc_an_06', name: 'Parveen Rao', look: { seed: 5806, frame: 'narrow', age: 34, ancestry: 'south_asian', over: { hair: { style: 'ponytail01', color: 0x16120e }, weathering: 0.7, scars: ['burn_left'] } }, role: 'drifter',
    level: 3, ...SPINDLE, courage: 35, dialogue: 'd_an_parveen', attrs: { reflex: 7, grit: 6 }, skills: { survival: 45, stealth: 40 }, tolls: 3,
    schedule: [{ from: 8, to: 21, spot: 'parveen', activity: 'idle' }, sleep('parveen_sleep', 21, 8)],
    barks: ['Don\'t.', 'Four. I counted them out myself.', 'He had the card in his hand.'],
  },
  {
    // the Concern's contractor: a Skirts man with a contract, a good coat and a work order
    id: 'npc_an_07', name: 'Benedikt Sorlie', look: { seed: 5807, frame: 'broad', age: 49, ancestry: 'north_european', over: { hair: { style: 'cut_crop', color: 0x6a5a48 }, facialHair: 'stubble_light', weathering: 0.35 } }, role: 'corp',
    level: 6, team: 'concern', settlement: 'spindle', faction: 'concern', hostileIf: { flag: 'an_sorlie_fight' }, courage: 50, dialogue: 'd_an_sorlie', attrs: { wits: 8, presence: 7 }, skills: { barter: 55, speech: 50, science: 45, firearms: 35 }, tolls: 300,
    equip: ['w_pistol9'], inventory: [['a_9mm', 12]],
    schedule: [{ from: 7, to: 22, spot: 'sorlie', activity: 'work' }, sleep('sorlie_sleep', 22, 7)],
    barks: ['A board recovery. Nothing more exotic.', 'I pay on delivery. I always pay on delivery.', 'Losses are costed to the contract.'],
  },
  { id: 'npc_an_g1', name: 'Guard', look: { seed: 5821, frame: 'broad', age: 34, ancestry: 'east_asian', over: { hair: { style: 'paint_buzz', color: 0x16120e } } }, ...hired, level: 5, dialogue: 'd_an_hired', equip: ['w_carbine556', 'r_riot'], inventory: [['a_556', 16]], barks: ['Mr Sorlie is busy.', 'Step off.'], schedule: [{ from: 7, to: 22, spot: 'sorlie_g', activity: 'idle' }, sleep('sorlie_g2', 22, 7)] },
  { id: 'npc_an_g2', name: 'Guard', look: { seed: 5822, frame: 'narrow', age: 30, ancestry: 'latin_american', over: { hair: { style: 'ponytail01', color: 0x1a1410 } } }, ...hired, level: 5, dialogue: 'd_an_hired', equip: ['w_smg9', 'r_riot'], inventory: [['a_9mm', 16]], barks: ['Contract business.', 'Keep walking.'], schedule: [] },
  // the glass
  {
    id: 'npc_an_w1', name: 'Selin Aydin', look: { seed: 5831, frame: 'narrow', age: 29, ancestry: 'mediterranean', over: { hair: { style: 'cut_messy', color: 0x2a1e16 }, weathering: 0.8, scars: ['burn_right'] } }, role: 'drifter',
    team: 'neutral', level: 2, dialogue: 'd_re_an_burned', attrs: { grit: 6 }, skills: { survival: 40 }, tolls: 5,
    barks: ['Don\'t touch the sled.', 'My hands. Look at my hands.'],
  },
  {
    id: 'npc_an_w2', name: 'Tadeo Ruano', look: { seed: 5832, frame: 'broad', age: 38, ancestry: 'latin_american', over: { hair: { style: 'cut_crop', color: 0x1a1410 }, facialHair: 'stubble', weathering: 0.8 } }, role: 'nomad',
    team: 'neutral', level: 3, dialogue: 'd_re_an_pickers', attrs: { brawn: 7, senses: 6 }, skills: { survival: 50 }, tolls: 12,
    merchant: { buys: ['junk'], cash: 40, restockDays: 7, markup: 1.2, stock: [['j_glass', 3], ['j_scrap', 3], ['c_water', 1]] },
    barks: ['Back to Spindle by dark, or not at all.', 'Names on the board.'],
  },
];
