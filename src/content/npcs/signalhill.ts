import type { NpcDef } from '../../engine/npc/defs';

/** Signal Hill — the Hollow, three scavengers stripping the mast's copper, camped on the only track up. */
const SG = { team: 'hollow', settlement: undefined, hostileIf: { flag: 'sg_fight' } } as const;

export const SIGNALHILL_NPCS: NpcDef[] = [
  {
    id: 'npc_sg_01', name: 'Tally', look: { seed: 5101, frame: 'narrow', age: 37, ancestry: 'indigenous_american', over: { hair: { style: 'paint_shaved', color: 0x1a1410 }, scars: ['brow_cut'] } }, role: 'drifter',
    level: 4, ...SG, courage: 55, dialogue: 'd_sg_tally', attrs: { wits: 7, senses: 7 }, skills: { barter: 40, survival: 40, firearms: 30 }, tolls: 22,
    merchant: { buys: ['junk'], cash: 22, restockDays: 5, markup: 1.2, stock: [['j_wiring', 6], ['j_scrap', 4], ['j_electronics', 1], ['c_dirtywater', 3]] },
    equip: ['w_zip38', 'r_hood'], inventory: [['a_38', 6], ['c_jerky', 1]],
    schedule: [{ from: 6, to: 23, spot: 'camp_fire', activity: 'idle' }, { from: 23, to: 6, spot: 'camp_tent_a', activity: 'sleep' }],
    barks: ['Copper\'s ours. Voice is nobody\'s.', 'You hear it at night, up there. Same words. Same order.', 'Don\'t go up with a light. It talks louder when there\'s a light.'],
  },
  {
    id: 'npc_sg_02', name: 'Brick', look: { seed: 5102, frame: 'broad', age: 30, ancestry: 'north_european', over: { facialHair: 'full_beard' } }, role: 'drifter',
    level: 3, ...SG, courage: 65, attrs: { brawn: 7 }, skills: { melee: 35 }, equip: ['w_pipe', 'r_jumpsuit'], inventory: [['c_dirtywater', 1]], tolls: 4,
    schedule: [{ from: 6, to: 23, spot: 'camp_watch', activity: 'patrol' }, { from: 23, to: 6, spot: 'camp_tent_b', activity: 'sleep' }],
    barks: ['Track\'s closed.', 'Tally does the talking. I do the track.'],
  },
  {
    id: 'npc_sg_03', name: 'Pim', look: { seed: 5103, frame: 'narrow', age: 19, ancestry: 'southeast_asian', over: { hair: { style: 'cut_messy', color: 0x1a1410 } } }, role: 'drifter',
    level: 2, ...SG, courage: 35, attrs: { reflex: 7 }, skills: { stealth: 35, mechanics: 25 }, equip: ['w_knife_throw'], inventory: [['j_wiring', 2]], tolls: 3,
    schedule: [{ from: 6, to: 23, spot: 'camp_pipes', activity: 'work' }, { from: 23, to: 6, spot: 'camp_tent_b', activity: 'sleep' }],
    barks: ['Forty metres of copper in that mast, Tally says. Tally says a lot.', 'I went in the station once. I don\'t go in now.'],
  },
];
