import type { NpcDef } from '../../engine/npc/defs';

/**
 * Tollhouse 9 — the Tollmen's people on the highway (Act 1). Guild guards turn on you only if the gate
 * talk turns to a fight; the two outriders have their own grudge.
 */
const TH = { team: 'tollmen', settlement: 'tollhouse', faction: 'tollmen' } as const;
const guard = { ...TH, role: 'guard' as const, hostileIf: { flag: 'th_fight' }, courage: 65 };
const bunk = (spot: string, from = 22, to = 6) => ({ from, to, spot, activity: 'sleep' as const });

export const TOLLHOUSE_NPCS: NpcDef[] = [
  {
    id: 'npc_th_01', name: 'Sergeant Halla Brecht', look: { seed: 4101, frame: 'broad', age: 41, ancestry: 'north_european', over: { hair: { style: 'cut_crop', color: 0x8a7a60 } } }, role: 'guard',
    level: 7, ...TH, hostileIf: { flag: 'th_fight' }, courage: 80, dialogue: 'd_th_sergeant', attrs: { brawn: 7, presence: 7, grit: 7 }, skills: { firearms: 45, melee: 35, speech: 30 },
    equip: ['w_pump', 'r_riot'], inventory: [['a_12ga', 12], ['c_water', 1]], tolls: 40,
    schedule: [{ from: 6, to: 22, spot: 'gate_post', activity: 'work' }, bunk('bunk_1')],
    barks: ['Rates are posted.', 'Nobody argues with the wall. People argue with me, which is worse for them.', 'Pass or pay. Those are the words.'],
  },
  {
    id: 'npc_th_02', name: 'Clerk Emmett Sayle', look: { seed: 4102, frame: 'narrow', age: 33, ancestry: 'east_asian', over: { hair: { style: 'cut_sidepart', color: 0x1a1410 } } }, role: 'corp',
    level: 2, ...TH, courage: 25, dialogue: 'd_th_clerk', attrs: { wits: 8, presence: 4 }, skills: { barter: 45, science: 30, speech: 30 }, tolls: 60,
    equip: ['w_zip38'], inventory: [['a_38', 4]],
    schedule: [{ from: 7, to: 21, spot: 'booth', activity: 'work' }, bunk('bunk_2', 21, 7)],
    barks: ['Name, cargo, destination. In that order.', 'The ledger does not lie. People lie to the ledger.', 'Stamps are twenty. Arguments are free and change nothing.'],
  },
  {
    id: 'npc_th_03', name: 'Quartermaster Dunya Rask', look: { seed: 4103, frame: 'broad', age: 46, ancestry: 'south_asian', over: { hair: { style: 'elvs_unkempt_french_braid', color: 0x2a1c12 } } }, role: 'trader',
    level: 4, ...TH, courage: 50, dialogue: 'd_th_quartermaster', attrs: { presence: 6, wits: 6 }, skills: { barter: 55 }, tolls: 160,
    merchant: { buys: ['junk', 'weapon', 'armor', 'ammo', 'tool'], cash: 160, restockDays: 4, markup: 1.6, stock: [['a_9mm', 24], ['a_308', 10], ['a_12ga', 12], ['c_water', 6], ['c_tin', 3], ['t_repair', 1], ['j_fuel', 2], ['r_helmet', 1], ['w_pistol9', 1]] },
    schedule: [{ from: 8, to: 20, spot: 'counter_w', activity: 'trade' }, bunk('bunk_3', 20, 8)],
    barks: ['Guild prices. Guild water. Guild everything.', 'If it\'s on the shelf it\'s for sale. If it\'s in the cage it\'s been sold.', 'No credit. The guild is credit.'],
  },
  {
    id: 'npc_th_04', name: 'Cass Mohr', look: { seed: 4104, frame: 'narrow', age: 29, ancestry: 'west_african', over: { hair: { style: 'paint_fade', color: 0x120e0b } } }, role: 'raider',
    level: 5, ...TH, hostileIf: { any: [{ flag: 'th_fight' }, { flag: 'th_outriders_hostile' }] }, courage: 75, dialogue: 'd_th_outrider_a', attrs: { reflex: 7, senses: 7 }, skills: { firearms: 50, survival: 35 },
    equip: ['w_carbine556', 'r_duster'], inventory: [['a_556', 20], ['c_kick', 1]], tolls: 35,
    schedule: [{ from: 10, to: 20, spot: 'yard_a', activity: 'idle' }, { from: 20, to: 1, spot: 'yard_fire', activity: 'drink' }, { from: 1, to: 5, spot: 'bunk_4', activity: 'sleep' }, { from: 5, to: 10, spot: 'yard_a', activity: 'away' }],
    barks: ['Contracts don\'t have faces. That\'s what makes them contracts.', 'Four days out, three back. The road gets longer every year.', 'Don\'t touch the bike.'],
  },
  {
    id: 'npc_th_05', name: 'Nikko Vance', look: { seed: 4105, frame: 'narrow', age: 26, ancestry: 'mediterranean', over: { hair: { style: 'cut_messy', color: 0x3a2a1c }, scars: ['cheek_slash'] } }, role: 'raider',
    level: 4, ...TH, hostileIf: { any: [{ flag: 'th_fight' }, { flag: 'th_outriders_hostile' }] }, courage: 60, dialogue: 'd_th_outrider_b', attrs: { reflex: 7, senses: 6 }, skills: { firearms: 40, stealth: 30 },
    equip: ['w_revolver38', 'r_duster'], inventory: [['a_38', 12]], tolls: 20,
    schedule: [{ from: 10, to: 20, spot: 'yard_b', activity: 'idle' }, { from: 20, to: 1, spot: 'yard_fire', activity: 'drink' }, { from: 1, to: 5, spot: 'bunk_5', activity: 'sleep' }, { from: 5, to: 10, spot: 'yard_b', activity: 'away' }],
    barks: ['Cass does the talking. I do the other thing.', 'You hear the old man came all the way to the salt cut? On that leg?', 'I sleep fine. Ask anyone.'],
  },
  {
    id: 'npc_th_06', name: 'Oren Tulley', look: { seed: 4106, frame: 'narrow', age: 52, ancestry: 'north_european', over: { hair: { style: 'paint_shaved', color: 0x6a6058 }, facialHair: 'short_beard' } }, role: 'labourer',
    level: 1, ...TH, team: 'neutral', faction: undefined, courage: 20, dialogue: 'd_th_debtor', attrs: { grit: 6 }, skills: { mechanics: 30 },
    barks: ['Thirty-one days. I keep the count; they keep the other one.', 'I fixed their pump. That\'s how I got here.', 'Don\'t stand too close. They count that too.'],
  },
  {
    id: 'npc_th_07', name: 'Bettany Oduya', look: { seed: 4107, frame: 'broad', age: 38, ancestry: 'west_african', over: { hair: { style: 'coily_afro', color: 0x1a1410 } } }, role: 'nomad',
    level: 4, ...TH, team: 'neutral', courage: 60, dialogue: 'd_th_caravan', attrs: { presence: 7, wits: 6, grit: 6 }, skills: { survival: 45, barter: 35, firearms: 30 }, tolls: 70,
    equip: ['w_sawnoff', 'r_jumpsuit'], inventory: [['a_12ga', 6], ['c_water', 3], ['c_jerky', 3]],
    schedule: [{ from: 6, to: 22, spot: 'camp_fire', activity: 'idle' }, { from: 22, to: 6, spot: 'camp_tent', activity: 'sleep' }],
    barks: ['Caravan leaves when the guild says and arrives when the road says.', 'Three days to Ninebridge if nothing happens. Something happens.', 'You can walk it. People do. Some of them twice.'],
  },
  { id: 'npc_th_g1', name: 'Guild Guard', look: { seed: 4111, frame: 'broad', age: 30 }, ...guard, level: 3, equip: ['w_pistol9', 'r_helmet'], inventory: [['a_9mm', 12]], schedule: [{ from: 6, to: 22, spot: 'tower_base', activity: 'patrol' }, bunk('bunk_4')], barks: ['Keep off the wall.', 'Lamp\'s on a timer. So am I.'] },
  { id: 'npc_th_g2', name: 'Guild Guard', look: { seed: 4112, frame: 'narrow', age: 24 }, ...guard, level: 3, equip: ['w_pump', 'r_helmet'], inventory: [['a_12ga', 8]], schedule: [{ from: 6, to: 22, spot: 'gate_e', activity: 'work' }, bunk('bunk_5')], barks: ['Stamp?', 'East is that way. So is the toll.'] },
  { id: 'npc_th_g3', name: 'Guild Guard', look: { seed: 4113, frame: 'narrow', age: 35 }, ...guard, level: 3, equip: ['w_pistol9', 'r_jumpsuit'], inventory: [['a_9mm', 12]], schedule: [{ from: 22, to: 6, spot: 'gate_post', activity: 'work' }, { from: 6, to: 22, spot: 'bunk_6', activity: 'sleep' }], barks: ['Night rate\'s the same as the day rate.', 'Nothing moves on the wall at night but the lamp.'] },
  { id: 'npc_th_g4', name: 'Guild Guard', look: { seed: 4114, frame: 'broad', age: 28 }, ...guard, level: 3, equip: ['w_pump', 'r_jumpsuit'], inventory: [['a_12ga', 8]], schedule: [{ from: 22, to: 6, spot: 'tower_base', activity: 'patrol' }, { from: 6, to: 22, spot: 'east_road', activity: 'patrol' }], barks: ['Stamp.', 'The guild thanks you for your custom.'] },
];
