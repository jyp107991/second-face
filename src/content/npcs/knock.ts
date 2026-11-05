import type { NpcDef } from '../../engine/npc/defs';

/** Knock: the hamlet above Cistern 9's door (the opening). The player character's people, Knock's own, the toll stand,
 * the Rib's strippers, the man who comes up the road at night and the riders who follow him. */
const KN = { team: 'knock', faction: 'knock', settlement: 'cistern9' } as const;
const sleep = (spot: string, from = 22, to = 6) => ({ from, to, spot, activity: 'sleep' as const });

export const KNOCK: NpcDef[] = [
  {
    id: 'npc_kn_maud', name: 'Maud Ferrow', look: { seed: 1201, frame: 'narrow', age: 64, ancestry: 'north_european' }, role: 'trader', level: 3, ...KN, courage: 55,
    dialogue: 'd_kn_maud', skills: { barter: 55, speech: 40 },
    merchant: { buys: ['consumable', 'junk', 'misc'], cash: 60, restockDays: 7, markup: 1.1, stock: [['c_water', 3], ['c_dirtywater', 4], ['c_bandage', 2], ['c_jerky', 3], ['c_algae', 3], ['j_cloth', 2]] },
    schedule: [{ from: 6, to: 11, spot: 'maud_hatch', activity: 'work' }, { from: 11, to: 18, spot: 'maud_post', activity: 'work' }, { from: 18, to: 22, spot: 'maud_fire', activity: 'idle' }, sleep('maud_bed')],
    barks: ['Wool\'s in the tray or it isn\'t, love.', 'Sixty years of letters on that shelf. Mind your elbows.', 'MOTHER\'s late. MOTHER\'s never late.'],
  },
  {
    id: 'npc_kn_linnet', name: 'Linnet Ferrow', look: { seed: 1202, frame: 'narrow', age: 17, ancestry: 'north_european' }, role: 'settler', level: 1, ...KN, courage: 70,
    dialogue: 'd_kn_linnet', attrs: { reflex: 7, brawn: 4 }, skills: { stealth: 35 },
    schedule: [{ from: 7, to: 12, spot: 'linnet_square', activity: 'idle' }, { from: 12, to: 18, spot: 'linnet_square', activity: 'idle' }, { from: 18, to: 22, spot: 'linnet_fire', activity: 'idle' }, sleep('linnet_cot')],
    barks: ['The Spire\'s got lights all night. All night!', 'Don\'t tell Maud I was on the road.', 'One day I\'ll walk out of here and not walk back.'],
  },
  {
    id: 'npc_kn_dace', name: 'Dace Moro', look: { seed: 1203, frame: 'broad', age: 26, ancestry: 'mediterranean' }, role: 'labourer', level: 2, ...KN, courage: 45,
    dialogue: 'd_kn_dace', ally: { flag: 'kn_rib_fight' }, attrs: { brawn: 6 }, skills: { melee: 35, mechanics: 25 },
    schedule: [{ from: 7, to: 14, spot: 'dace_gate', activity: 'idle' }, { from: 14, to: 19, spot: 'dace_square', activity: 'idle' }, { from: 19, to: 23, spot: 'dace_shack', activity: 'idle' }, sleep('dace_shack', 23, 7)],
    barks: ['Copper\'s copper. The mast doesn\'t care who strips it.', 'Maud thinks I\'m a debt with legs.', 'One more run and I\'m square. One more.'],
  },
  {
    id: 'npc_kn_corin', name: 'Corin Asch', look: { seed: 1204, frame: 'broad', age: 58, ancestry: 'east_african' }, role: 'labourer', level: 4, ...KN, courage: 65,
    dialogue: 'd_kn_corin', ally: { flag: 'kn_out_fight' }, attrs: { senses: 7, grit: 7 }, skills: { firearms: 55, mechanics: 50, survival: 45 }, equip: ['w_bolt308'], inventory: [['a_308', 10]],
    schedule: [{ from: 6, to: 12, spot: 'corin_pump', activity: 'work' }, { from: 12, to: 19, spot: 'corin_bench', activity: 'work' }, { from: 19, to: 21, spot: 'corin_square', activity: 'idle' }, sleep('corin_bed', 21, 5)],
    barks: ['Wind\'s backing south. Pump\'ll sulk.', 'Road\'s for people with somewhere to be.', 'Keep your thumb off the bolt.'],
  },
  {
    id: 'npc_kn_factor', name: 'Factor Ismay Orme', look: { seed: 1205, frame: 'narrow', age: 41, ancestry: 'south_asian' }, role: 'trader', level: 3, team: 'tollmen', faction: 'tollmen', settlement: 'cistern9', courage: 40,
    dialogue: 'd_kn_factor', skills: { barter: 60, speech: 45 },
    merchant: { buys: 'all', cash: 150, restockDays: 5, faction: 'tollmen', markup: 1.5, stock: [['a_38', 12], ['c_bandage', 2], ['c_water', 4], ['w_shiv', 1], ['w_pipe', 1], ['w_zip38', 1], ['c_tin', 2]] },
    schedule: [{ from: 6, to: 20, spot: 'factor_counter', activity: 'work' }, sleep('factor_counter', 20, 6)],
    barks: ['Cards out. Faces up.', 'Water\'s two Tolls the measure on the road, love. One here.', 'The Guild remembers every face. It\'s the job.'],
  },
  {
    id: 'npc_kn_buyer', name: 'Teague Varro', look: { seed: 1206, frame: 'broad', age: 33, ancestry: 'latin_american' }, role: 'raider', level: 3, team: 'road', faction: 'tollmen', settlement: 'cistern9', courage: 50,
    dialogue: 'd_kn_buyer', hostileIf: { flag: 'kn_buyer_fight' }, equip: ['w_pipe'], skills: { melee: 35 }, tolls: 12,
    barks: ['Six measures. She said six.', 'Girl owes me water, I take it in water or in teeth.'],
  },
  // Knock's own
  {
    id: 'npc_kn_r1', name: 'Hesper Lusk', look: { seed: 1211, frame: 'narrow', age: 46, ancestry: 'west_african' }, role: 'settler', level: 1, ...KN, courage: 35,
    schedule: [{ from: 6, to: 19, spot: 'pen', activity: 'work' }, sleep('home_a')],
    barks: ['My boy\'s chest rattles. MOTHER had better send the blue tablets.', 'Goats don\'t care whose water it is.', 'Your Maud fed half this slope the winter the hatch went quiet.'],
  },
  {
    id: 'npc_kn_r2', name: 'Sim Haddad', look: { seed: 1212, frame: 'broad', age: 52, ancestry: 'mediterranean' }, role: 'labourer', level: 1, ...KN, courage: 40,
    schedule: [{ from: 7, to: 18, spot: 'wash', activity: 'work' }, sleep('home_b')],
    barks: ['Three lockdowns in my life. Three. Each time she said "continuity".', 'Wash water\'s grey water. Don\'t drink it.', 'The road takes more than it brings.'],
  },
  {
    id: 'npc_kn_r3', name: 'Ruth Okafor', look: { seed: 1213, frame: 'narrow', age: 34, ancestry: 'west_african' }, role: 'settler', level: 1, ...KN, courage: 50,
    schedule: [{ from: 7, to: 18, spot: 'square_a', activity: 'idle' }, sleep('home_c')],
    barks: ['Tamsin asked me what rain smells like. I told her: wet dust.', 'Ines says no. Ines always says no.', 'Hatch day, then nothing for a week. That\'s Knock.'],
  },
  {
    id: 'npc_kn_r4', name: 'Abel Tarrow', look: { seed: 1214, frame: 'broad', age: 71, ancestry: 'north_european' }, role: 'drifter', level: 1, ...KN, courage: 20,
    schedule: [{ from: 8, to: 17, spot: 'home_c', activity: 'idle' }, sleep('home_d')],
    barks: ['I came up that road sixty years back. Never went down it again.', 'They\'ve a face for you in the city, you know. On a card.', 'Don\'t you knock on that door. Nobody knocks on that door.'],
  },
  // the Rib's strippers: road people stripping the fallen mast's copper
  {
    id: 'npc_kn_rib_a', name: 'Abner Rusk', look: { seed: 1221, frame: 'broad', age: 39, ancestry: 'north_european' }, role: 'drifter', level: 2, team: 'rib', settlement: 'cistern9', courage: 45,
    dialogue: 'd_kn_rib', hostileIf: { flag: 'kn_rib_fight' }, equip: ['w_pipe'], skills: { melee: 30 }, tolls: 6, inventory: [['j_wiring', 2]],
    barks: ['Copper don\'t belong to anybody, friend.', 'Nell, mind the cable.'],
  },
  {
    id: 'npc_kn_rib_b', name: 'Nell Rusk', look: { seed: 1222, frame: 'narrow', age: 35, ancestry: 'north_european' }, role: 'drifter', level: 2, team: 'rib', settlement: 'cistern9', courage: 40,
    hostileIf: { flag: 'kn_rib_fight' }, equip: ['w_shiv'], skills: { melee: 30, stealth: 30 }, tolls: 4, inventory: [['c_dirtywater', 1]],
    barks: ['We was here first.', 'Abner. Abner, they\'ve a knife.'],
  },
  // the night
  {
    id: 'npc_kn_stranger', name: 'A man in a dust mask', look: { seed: 1231, frame: 'narrow', age: 63, ancestry: 'mediterranean' }, role: 'drifter', level: 4, team: 'none', settlement: 'cistern9', courage: 90,
    dialogue: 'd_kn_stranger', schedule: [],
  },
  // day two: the outriders
  {
    id: 'npc_kn_out_lead', name: 'Outrider Brannick Hale', look: { seed: 1241, frame: 'broad', age: 44, ancestry: 'north_european' }, role: 'guard', level: 5, team: 'tollmen', faction: 'tollmen', settlement: 'cistern9', courage: 65, leader: true,
    dialogue: 'd_kn_outriders', hostileIf: { flag: 'kn_out_fight' }, equip: ['w_revolver38', 'r_duster'], inventory: [['a_38', 18], ['c_bandage', 1]], skills: { firearms: 50, speech: 45 }, tolls: 25, schedule: [],
  },
  {
    id: 'npc_kn_out_a', name: 'Outrider Josse', look: { seed: 1242, frame: 'broad', age: 31, ancestry: 'caribbean' }, role: 'guard', level: 3, team: 'tollmen', faction: 'tollmen', settlement: 'cistern9', courage: 50,
    hostileIf: { flag: 'kn_out_fight' }, equip: ['w_zip38'], inventory: [['a_38', 10]], skills: { firearms: 35 }, tolls: 8, schedule: [],
    barks: ['Stand still and this goes quick.'],
  },
  {
    id: 'npc_kn_out_b', name: 'Outrider Carrow', look: { seed: 1243, frame: 'narrow', age: 27, ancestry: 'east_asian' }, role: 'guard', level: 3, team: 'tollmen', faction: 'tollmen', settlement: 'cistern9', courage: 45,
    hostileIf: { flag: 'kn_out_fight' }, equip: ['w_machete'], skills: { melee: 40 }, tolls: 6, schedule: [],
    barks: ['Hale says the old man came this way. Old men don\'t lie about roads.'],
  },
];
