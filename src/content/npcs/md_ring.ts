import type { NpcDef } from '../../engine/npc/defs';

/**
 * Meridian, the Dead Ring (Act 2, B3.12): outside the Wall and outside the law. Nobody here has a card; nobody fights for
 * a Precinct. The slate at Clover (the races), pit row, Leven (a squatted tower) and the salvage yard. The Crown's bookman
 * comes down in the evenings for the races and leaves before the lamps go out.
 */
const DR = { team: 'neutral', settlement: 'meridian' } as const;
const sleep = (spot: string, from = 23, to = 6) => ({ from, to, spot, activity: 'sleep' as const });

export const RING_NPCS: NpcDef[] = [
  {
    id: 'npc_dr_01', name: 'Dorota Wilk', look: { seed: 9901, frame: 'narrow', age: 56, ancestry: 'north_european', over: { hair: { style: 'elvs_unkempt_french_braid', color: 0x9a948c }, weathering: 0.6, scars: ['cheek_slash'] } }, role: 'trader',
    level: 4, ...DR, courage: 60, dialogue: 'd_dr_slate', attrs: { wits: 8, presence: 8, senses: 7 }, skills: { barter: 55, speech: 50, mechanics: 35 }, tolls: 300,
    schedule: [{ from: 9, to: 24, spot: 'slate', activity: 'work' }, sleep('slate', 0, 9)],
    barks: ['Dusk. Not before. The flag drops at dusk.', 'Twenty to enter. The Ring pays the Ring.', 'Nobody jumps my flag twice.', 'A fixed race is how people die. Mine are not fixed.'],
  },
  {
    id: 'npc_dr_02', name: 'Nkechi Bello', look: { seed: 9902, frame: 'narrow', age: 28, ancestry: 'west_african', over: { hair: { style: 'paint_cornrows', color: 0x120e0b }, weathering: 0.35 } }, role: 'tech',
    level: 5, ...DR, courage: 75, dialogue: 'd_dr_bello', attrs: { reflex: 9, senses: 8, grit: 7, presence: 6 }, skills: { mechanics: 50, firearms: 30, survival: 40 }, tolls: 60,
    schedule: [{ from: 10, to: 24, spot: 'pits_heron', activity: 'work' }, sleep('pits_heron', 0, 10)],
    barks: ['The Heron drinks three jugs and gives back every one.', 'Fridays I stand at the gate. The rest of the week I drive.', 'Lean into the cloverleaf. It wants you wide. Don\'t give it you.'],
  },
  {
    id: 'npc_dr_03', name: 'Emil Sorensen', look: { seed: 9903, frame: 'broad', age: 64, ancestry: 'north_european', over: { hair: { style: 'none', color: 0xb0aaa0 }, facialHair: 'full_beard', weathering: 0.7 } }, role: 'tech',
    level: 3, ...DR, courage: 40, dialogue: 'd_dr_emil', attrs: { wits: 8, grit: 6 }, skills: { mechanics: 75, barter: 45 }, tolls: 140,
    merchant: { buys: ['junk', 'tool', 'misc'], cash: 200, restockDays: 5, markup: 1.4, stock: [['t_repair', 3], ['j_wiring', 4], ['j_electronics', 3], ['j_scrap', 6]] },
    schedule: [{ from: 7, to: 23, spot: 'emil', activity: 'work' }, sleep('emil_cot', 23, 7)],
    barks: ['Every buggy in the Ring I built, or built twice.', 'The Mule\'s got one more season in her.', 'My hands shake. The welds don\'t.'],
  },
  {
    id: 'npc_dr_04', name: 'Crispin Haverty', look: { seed: 9904, frame: 'broad', age: 44, ancestry: 'north_european', over: { hair: { style: 'short04', color: 0x4a3a2a }, weathering: 0.05 } }, role: 'corp',
    level: 3, ...DR, courage: 30, dialogue: 'd_dr_haverty', attrs: { wits: 8, presence: 7 }, skills: { barter: 60, speech: 50 }, tolls: 400,
    schedule: [{ from: 17, to: 23, spot: 'stands_box', activity: 'idle' }, { from: 23, to: 17, activity: 'away' }],
    barks: ['The Crown\'s book is open. The Crown\'s book is always open.', 'Colour. They come down for the colour.', 'Odds are a kind of manners.'],
  },
  {
    id: 'npc_dr_05', name: 'Ha-eun Seo', look: { seed: 9905, frame: 'narrow', age: 62, ancestry: 'east_asian', over: { hair: { style: 'cut_crop', color: 0x8a8682 }, weathering: 0.55 } }, role: 'settler',
    level: 2, ...DR, courage: 55, dialogue: 'd_dr_haeun', attrs: { wits: 8, grit: 8, presence: 7 }, skills: { speech: 45, survival: 40, medicine: 30 }, tolls: 12,
    schedule: [{ from: 6, to: 22, spot: 'leven_count', activity: 'work' }, sleep('leven_count', 22, 6)],
    barks: ['Ninety-one on the count. Say your name and it\'s ninety-two.', 'A hand of water in the tank. A hand lasts.', 'They don\'t burn a tower that keeps a count. That\'s what the count is for.'],
  },
  {
    id: 'npc_dr_06', name: 'Ruben Iturbe', look: { seed: 9906, frame: 'broad', age: 47, ancestry: 'latin_american', over: { hair: { style: 'cut_crop', color: 0x1a1410 }, facialHair: 'stubble', weathering: 0.5 } }, role: 'labourer',
    level: 5, ...DR, courage: 55, dialogue: 'd_dr_ruben', attrs: { brawn: 8, wits: 7, presence: 6 }, skills: { barter: 55, mechanics: 50, melee: 40 }, tolls: 350,
    merchant: { buys: ['junk', 'weapon', 'tool'], cash: 350, restockDays: 4, markup: 1.5, stock: [['j_scrap', 10], ['j_wiring', 4], ['t_repair', 2], ['w_pipe', 2]] },
    equip: ['w_pipe'],
    schedule: [{ from: 6, to: 21, spot: 'yard_boss', activity: 'work' }, sleep('yard_boss', 21, 6)],
    barks: ['Steel\'s weighed at the gate.', 'Sixty families eat off this yard. Count them, if you\'re counting.', 'A tower nobody lives in is steel. That\'s all a tower is.'],
  },
  {
    id: 'npc_dr_07', name: 'Sami', look: { seed: 9907, frame: 'broad', age: 17, ancestry: 'south_asian', over: { hair: { style: 'paint_buzz', color: 0x16120e }, weathering: 0.4, scars: ['cheek_slash'] } }, role: 'street',
    level: 1, ...DR, courage: 25, dialogue: 'd_dr_sami', attrs: { reflex: 7, senses: 6 }, skills: { stealth: 35 }, tolls: 3,
    schedule: [{ from: 6, to: 21, spot: 'yard_work', activity: 'work' }, { from: 21, to: 6, spot: 'street_w', activity: 'idle' }],
    barks: ['Water first. Then talk.', 'I carry what I\'m given.', 'Chalk\'s free. Everything else costs.'],
  },
  // the turnstile's man at the halt: the Wall's, not the Ring's
  { id: 'npc_dr_g1', name: 'Warden', look: { seed: 9921, frame: 'broad', age: 39, ancestry: 'mediterranean', over: { hair: { style: 'cut_crop', color: 0x1a1410 } } }, team: 'wardens', settlement: 'meridian', faction: 'wardens', role: 'guard', courage: 60, level: 5, minor: true, equip: ['w_pistol9', 'r_riot'], inventory: [['a_9mm', 12]], schedule: [{ from: 0, to: 24, spot: 'halt', activity: 'work' }], barks: ['Out is free. In is counted.', 'The Ring is outside the law. Mind you stay inside it.'] },
];
