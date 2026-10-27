import type { NpcDef } from '../../engine/npc/defs';

/**
 * Ninebridge — the guild's trade town on the broken bridge (Act 2). The guild's people turn on you only if the
 * deck comes to a fight (`nb_fight`); the porters, the auctioneer's lot and the woman at the Span are their own.
 */
const NB = { team: 'tollmen', settlement: 'ninebridge', faction: 'tollmen' } as const;
const guard = { ...NB, role: 'guard' as const, hostileIf: { flag: 'nb_fight' }, courage: 65 };
const sleep = (spot: string, from = 22, to = 6) => ({ from, to, spot, activity: 'sleep' as const });

export const NINEBRIDGE_NPCS: NpcDef[] = [
  {
    id: 'npc_nb_01', name: 'Grand Factor Imelda Sarr', look: { seed: 6101, frame: 'narrow', age: 58, ancestry: 'east_african', over: { hair: { style: 'cut_slickback', color: 0x9a9088 } } }, role: 'gilded',
    level: 6, ...NB, courage: 40, dialogue: 'd_nb_sarr', attrs: { wits: 9, presence: 8, senses: 6, brawn: 3 }, skills: { barter: 85, speech: 60, science: 40 }, tolls: 420,
    equip: ['w_hand44'], inventory: [['a_38', 6], ['c_water', 2]],
    schedule: [{ from: 8, to: 21, spot: 'office_chair', activity: 'work' }, sleep('office_chair', 21, 8)],
    barks: ['Not at that price.', 'Everything is for sale. The question is only when.', 'The market is kinder than a plan. A plan cannot be bargained with.'],
  },
  {
    id: 'npc_nb_02', name: 'Auctioneer Fen', look: { seed: 6102, frame: 'narrow', age: 30, ancestry: 'southeast_asian', over: { hair: { style: 'cut_quiff', color: 0x1a1410 } } }, role: 'trader',
    level: 3, ...NB, team: 'neutral', courage: 35, dialogue: 'd_nb_fen', attrs: { presence: 7, wits: 6 }, skills: { speech: 50, barter: 40 }, tolls: 70,
    equip: ['w_zip38'], inventory: [['a_38', 4], ['c_bitters', 1]],
    schedule: [{ from: 9, to: 18, spot: 'block', activity: 'work' }, { from: 18, to: 23, spot: 'east_fire', activity: 'drink' }, sleep('stall_tent', 23, 9)],
    barks: ['Lot four. Do I hear sixty?', 'Cheerful voice, is the trick. Nobody buys from a mourner.', 'I hate it. I\'m good at it. Those are different things.'],
  },
  {
    id: 'npc_nb_03', name: 'Odile Marchetti', look: { seed: 6103, frame: 'narrow', age: 55, ancestry: 'mediterranean', over: { hair: { style: 'elvs_unkempt_french_braid', color: 0xb8b0a8 }, weathering: 0.3 } }, role: 'trader',
    // A good coat gone shabby, trousers, riding boots, reading glasses: the Exchange's old clothes, kept.
    outfit: { layers: [{ name: 'punkduck_v_neck_top', dye: 0x6a5a48, grime: 0.2, wear: 0.4 }, { name: 'mindfront_cardigan_long_open_front', dye: 0x2e3a36, grime: 0.3, wear: 0.65 }, { name: 'mindfront_female_trousers_1', dye: 0x2a2826, grime: 0.25, wear: 0.5 }, { name: 'punkduck_riding_boots', grime: 0.35, wear: 0.6 }, { name: 'spamrakuen_tbm_glasses_frames_01' }], grime: 0.25, wear: 0.5 },
    level: 6, team: 'neutral', settlement: 'ninebridge', courage: 45, dialogue: 'd_nb_odile', attrs: { wits: 9, presence: 7, senses: 6, brawn: 3, grit: 5 }, skills: { barter: 75, speech: 55, survival: 40, science: 35 }, tolls: 45,
    equip: ['w_revolver38'], inventory: [['a_38', 12], ['c_bitters', 1], ['c_tin', 1]],
    schedule: [{ from: 10, to: 24, spot: 'span_table', activity: 'drink' }, sleep('berth_b_bed', 0, 10)],
    barks: ['Money is weather, my dear. You dress for it.', 'I sold a man his own funeral once. He haggled.', 'Everything is borrowed. That is not a complaint; it is a price.'],
  },
  {
    id: 'npc_nb_04', name: 'Toll-warden Esk Varga', look: { seed: 6104, frame: 'broad', age: 44, ancestry: 'north_european', over: { hair: { style: 'cut_crop', color: 0x6a5a48 }, facialHair: 'moustache' } }, role: 'guard',
    level: 5, ...NB, hostileIf: { flag: 'nb_fight' }, courage: 70, dialogue: 'd_nb_toll_warden', attrs: { brawn: 7, presence: 6, grit: 6 }, skills: { firearms: 40, melee: 35, barter: 30 }, tolls: 90,
    equip: ['w_pump', 'r_riot'], inventory: [['a_12ga', 10], ['c_water', 1]],
    schedule: [{ from: 6, to: 22, spot: 'toll_post', activity: 'work' }, sleep('toll_desk')],
    barks: ['Twelve to cross. Twelve back. The bridge doesn\'t care which way you\'re facing.', 'The porters can sit. The goods can\'t.', 'Guild deck past the sandbags. Mind the ninth.'],
  },
  {
    id: 'npc_nb_05', name: 'Hadley Voss', look: { seed: 6105, frame: 'broad', age: 50, ancestry: 'latin_american', over: { hair: { style: 'short02', color: 0x3a2e26 }, facialHair: 'stubble_heavy', weathering: 0.8 } }, role: 'labourer',
    level: 4, team: 'neutral', settlement: 'ninebridge', courage: 65, dialogue: 'd_nb_voss', attrs: { brawn: 8, grit: 8, presence: 6 }, skills: { melee: 40, survival: 35, speech: 30 }, tolls: 18,
    equip: ['w_pipe'], inventory: [['c_dirtywater', 2], ['c_algae', 2]],
    schedule: [{ from: 6, to: 23, spot: 'camp_fire', activity: 'idle' }, sleep('camp_tent_a', 23, 6)],
    barks: ['Forty backs. The guild has none.', 'They say we lose on the third day. They said it before we started.', 'Sit down. Straps off. That\'s the whole speech.'],
  },
  {
    id: 'npc_nb_06', name: 'Clerk Amity Rook', look: { seed: 6106, frame: 'narrow', age: 27, ancestry: 'south_asian', over: { hair: { style: 'bob02', color: 0x1a1410 } } }, role: 'trader',
    level: 2, ...NB, courage: 25, dialogue: 'd_nb_clerk', attrs: { wits: 8, senses: 7, presence: 4 }, skills: { barter: 40, science: 35, speech: 30 }, tolls: 40,
    inventory: [['c_water', 1]],
    schedule: [{ from: 7, to: 21, spot: 'hall_desk', activity: 'work' }, sleep('hall_desk', 21, 7)],
    barks: ['Paper is paper until it\'s signed. Then it\'s the future.', 'The ledgers close at nine. The ledgers never close.', 'Don\'t touch the board.'],
  },
  {
    id: 'npc_nb_07', name: 'Captain Marlow Dent', look: { seed: 6107, frame: 'broad', age: 39, ancestry: 'west_african', over: { hair: { style: 'paint_fade', color: 0x120e0b }, scars: ['cheek_slash'] } }, role: 'guard',
    level: 7, ...NB, hostileIf: { flag: 'nb_fight' }, courage: 80, dialogue: 'd_nb_captain', attrs: { brawn: 7, reflex: 7, presence: 7, grit: 7 }, skills: { firearms: 55, melee: 45, speech: 30 }, tolls: 60,
    equip: ['w_carbine556', 'r_riot'], inventory: [['a_556', 18], ['c_water', 1], ['c_bandage', 1]],
    schedule: [{ from: 0, to: 24, spot: 'deck_mid', activity: 'work' }],
    barks: ['Guild deck. Weapons stay down.', 'The ninth span fell on its own. Everything since, somebody pushed.', 'Trouble on my bridge goes in the river.'],
  },
  {
    id: 'npc_nb_08', name: 'Sable', look: { seed: 6108, frame: 'narrow', age: 19, ancestry: 'west_african', over: { hair: { style: 'coily_twa', color: 0x120e0b }, weathering: 0.5 } }, role: 'street',
    level: 1, team: 'neutral', settlement: 'ninebridge', courage: 20, dialogue: 'd_nb_sable', attrs: { reflex: 6, wits: 6, grit: 4 }, skills: { stealth: 30, barter: 20 },
    schedule: [{ from: 0, to: 24, spot: 'cage_cot_sit', activity: 'idle' }],
    barks: ['Don\'t look at me like a sum.', 'Sixty. I heard him. Sixty.', 'I had a sister once. Everyone had a sister once.'],
  },
  {
    id: 'npc_nb_09', name: 'Marguerite Oyo', look: { seed: 6109, frame: 'broad', age: 48, ancestry: 'west_african', over: { hair: { style: 'coily_afro', color: 0x1a1410 } } }, role: 'trader',
    level: 4, ...NB, team: 'neutral', courage: 50, dialogue: 'd_nb_oyo', attrs: { presence: 6, wits: 6, brawn: 6 }, skills: { barter: 55, firearms: 30 }, tolls: 220,
    merchant: { buys: ['weapon', 'armor', 'ammo', 'tool', 'junk'], cash: 220, restockDays: 4, markup: 1.5, faction: 'tollmen', stock: [['a_9mm', 30], ['a_38', 20], ['a_12ga', 14], ['a_556', 20], ['a_308', 8], ['w_pistol9', 1], ['w_smg9', 1], ['w_sawnoff', 1], ['r_duster', 1], ['r_helmet', 1], ['t_picks', 1], ['t_repair', 2], ['j_electronics', 2]] },
    equip: ['w_smg9', 'r_duster'], inventory: [['a_9mm', 20]],
    schedule: [{ from: 8, to: 20, spot: 'stall_guns', activity: 'trade' }, sleep('stall_tent', 20, 8)],
    barks: ['Guns, cells, and things that were somebody\'s.', 'Guild price on the sign. Your price is on your face.', 'The Concern makes it; the Menders fit it; I just sell it.'],
  },
  {
    id: 'npc_nb_10', name: 'Pim Haddow', look: { seed: 6110, frame: 'narrow', age: 61, ancestry: 'north_european', over: { hair: { style: 'none', color: 0x8a8070 }, facialHair: 'goatee', weathering: 0.7 } }, role: 'trader',
    level: 2, ...NB, team: 'neutral', courage: 30, dialogue: 'd_nb_pim', attrs: { presence: 5, wits: 5 }, skills: { barter: 40 }, tolls: 60,
    merchant: { buys: ['consumable', 'junk', 'misc'], cash: 60, restockDays: 2, markup: 1.4, stock: [['c_water', 6], ['c_jerky', 5], ['c_tin', 3], ['c_algae', 4], ['c_fruit', 2], ['c_bandage', 2], ['c_bitters', 2]] },
    schedule: [{ from: 7, to: 21, spot: 'stall_food', activity: 'trade' }, sleep('stall_blanket_sit', 21, 7)],
    barks: ['Water\'s guild water. Tastes of the bridge.', 'Fruit from Openfield, when the Choir sends it. They haven\'t.', 'Eat something. You look like a forecast.'],
  },
  {
    id: 'npc_nb_11', name: 'Lazlo Brand', look: { seed: 6111, frame: 'broad', age: 52, ancestry: 'mediterranean', over: { hair: { style: 'cut_crew', color: 0x4a403a }, facialHair: 'full_beard', weathering: 0.6 } }, role: 'trader',
    level: 4, team: 'neutral', settlement: 'ninebridge', courage: 55, dialogue: 'd_nb_lazlo', attrs: { presence: 7, grit: 6, brawn: 6 }, skills: { barter: 45, speech: 40, melee: 30 }, tolls: 140,
    merchant: { buys: ['consumable', 'junk', 'misc'], cash: 90, restockDays: 3, markup: 1.4, stock: [['c_bitters', 6], ['c_water', 3], ['c_jerky', 3], ['c_stillwater', 1]] },
    equip: ['w_sawnoff'], inventory: [['a_12ga', 8]],
    schedule: [{ from: 9, to: 2, spot: 'span_bar', activity: 'trade' }, sleep('span_stove', 2, 9)],
    barks: ['The Span. Named for the one that\'s missing.', 'Bitters, water, Dust, a berth if you\'re clean.', 'Odile\'s tab is older than you.'],
  },
  // Guild guards: the west post, the hall's two doors, the east bank.
  { id: 'npc_nb_g1', name: 'Guild Guard', look: { seed: 6121, frame: 'broad', age: 31, ancestry: 'south_asian' }, ...guard, level: 4, equip: ['w_pump', 'r_riot'], inventory: [['a_12ga', 8]], schedule: [{ from: 0, to: 24, spot: 'post_w', activity: 'work' }], barks: ['Toll\'s paid at the sandbags.', 'Keep walking.'] },
  { id: 'npc_nb_g2', name: 'Guild Guard', look: { seed: 6122, frame: 'broad', age: 27, ancestry: 'east_asian' }, ...guard, level: 4, equip: ['w_carbine556', 'r_riot'], inventory: [['a_556', 12]], schedule: [{ from: 0, to: 24, spot: 'hall_door_s', activity: 'work' }], barks: ['Floor\'s for ticket-holders.', 'No paper leaves the hall.'] },
  { id: 'npc_nb_g3', name: 'Guild Guard', look: { seed: 6123, frame: 'narrow', age: 35, ancestry: 'latin_american', over: { facialHair: 'stubble' } }, ...guard, level: 4, equip: ['w_pistol9', 'r_riot'], inventory: [['a_9mm', 14]], schedule: [{ from: 0, to: 24, spot: 'post_e', activity: 'work' }], barks: ['East road\'s open. Mind the glass.', 'Block opens at nine.'] },
  { id: 'npc_nb_g4', name: 'Guild Guard', look: { seed: 6124, frame: 'broad', age: 40, ancestry: 'north_european', over: { hair: { style: 'cut_crop', color: 0x7a6a50 } } }, ...guard, level: 4, equip: ['w_sawnoff', 'r_riot'], inventory: [['a_12ga', 8]], schedule: [{ from: 0, to: 24, spot: 'hall_door_n', activity: 'work' }], barks: ['Back door\'s a door too.', 'Ticket, or walk round.'] },
];
