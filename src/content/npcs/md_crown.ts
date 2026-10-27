import type { NpcDef } from '../../engine/npc/defs';

/**
 * Meridian, the Crown — the terraces under glass (Act 2). The lift wardens turn if the gate is forced
 * (`cr_fight_wardens`); the houses' guards and House Vane's duellist turn with the alarm (`cr_alarm`). The Tenured
 * themselves do not fight; they have people for that.
 */
const CR = { team: 'neutral', settlement: 'meridian' } as const;
const house = { team: 'tenured', settlement: 'meridian', faction: 'tenured', role: 'guard' as const, hostileIf: { flag: 'cr_alarm' }, courage: 60 };
const warden = { team: 'wardens', settlement: 'meridian', faction: 'wardens', role: 'guard' as const, hostileIf: { flag: 'cr_fight_wardens' }, courage: 70 };
const stand = (spot: string) => [{ from: 0, to: 24, spot, activity: 'idle' as const }];

export const CROWN_NPCS: NpcDef[] = [
  {
    id: 'npc_cr_01', name: 'Celestine Vane', look: { seed: 9701, frame: 'narrow', age: 52, ancestry: 'north_european', over: { hair: { style: 'bob02', color: 0xd8d0c0 }, weathering: 0.05 } }, role: 'gilded',
    level: 5, ...CR, courage: 20, dialogue: 'd_cr_celestine', faction: 'tenured', attrs: { presence: 10, wits: 9 }, skills: { speech: 70, barter: 60 }, tolls: 800,
    schedule: stand('hostess'),
    barks: ['The Chair, tonight. The file is not in doubt; only the room.', 'Smile. The lens is kinder to a smile.', 'My son is somewhere being unhappy at me. It is the season for it.'],
  },
  {
    id: 'npc_cr_02', name: 'Honora Ashby-Crane', look: { seed: 9702, frame: 'narrow', age: 61, ancestry: 'west_african', over: { hair: { style: 'short04', color: 0xc8c0b8 }, weathering: 0.1 } }, role: 'gilded',
    level: 5, ...CR, courage: 30, dialogue: 'd_cr_honora', faction: 'tenured', attrs: { presence: 9, wits: 10 }, skills: { speech: 65, barter: 70 }, tolls: 900,
    schedule: stand('honora'),
    barks: ['Vane sells. That is all one needs to know about Vane.', 'A duel is a vote with the arithmetic shown.', 'My daughter is at the window again. The window is the only thing up here she likes.'],
  },
  {
    id: 'npc_cr_03', name: 'Aurel Dace', look: { seed: 9703, frame: 'broad', age: 34, ancestry: 'mediterranean', over: { hair: { style: 'short04', color: 0x1a1410 }, weathering: 0.1, scars: ['cheek_slash'] } },
    level: 7, ...house, role: 'gilded', courage: 85, dialogue: 'd_cr_dace', attrs: { reflex: 9, brawn: 7, presence: 7 }, skills: { melee: 75, speech: 40 }, tolls: 150,
    equip: ['w_sabre'],
    schedule: stand('dace_door'),
    barks: ['House Vane\'s door. Chit, name, or face.', 'Nobody has drawn on me in two seasons. It is a dull season.', 'The Row sends its bravo up in borrowed clothes. One can tell by the shoes.'],
  },
  {
    id: 'npc_cr_04', name: 'Ottilie Ashby-Crane', look: { seed: 9704, frame: 'narrow', age: 19, ancestry: 'west_african', over: { hair: { style: 'bob02', color: 0x1a1410 }, weathering: 0 } }, role: 'gilded',
    level: 1, ...CR, courage: 30, dialogue: 'd_cr_tillie', faction: 'tenured', attrs: { wits: 8, presence: 7 }, skills: { speech: 45 }, tolls: 60,
    barks: ['The window. You can see the canal from the window.', 'Osric is kind. That is the worst of it.', 'I paid. Did they tell you I paid?'],
  },
  {
    id: 'npc_cr_05', name: 'Halden', look: { seed: 9705, frame: 'narrow', age: 54, ancestry: 'east_asian', over: { hair: { style: 'short04', color: 0x808080 }, weathering: 0.15 } }, role: 'corp',
    level: 4, ...CR, courage: 30, dialogue: 'd_cr_halden', attrs: { wits: 10, senses: 9 }, skills: { science: 60, speech: 45 }, tolls: 300,
    schedule: stand('halden'),
    barks: ['Sit. The light is good at this hour; the machine does not care.', 'Everyone wants to see what they become. Nobody wants to look at it afterwards.', 'No grain. That is how you tell. Real light has grain in it.'],
  },
  {
    id: 'npc_cr_06', name: 'Marguerite Lorne', look: { seed: 9706, frame: 'narrow', age: 57, ancestry: 'north_european', over: { hair: { style: 'bob02', color: 0xe8d8a0 }, weathering: 0.05 } }, role: 'gilded',
    level: 4, ...CR, courage: 25, dialogue: 'd_cr_lorne', faction: 'tenured', attrs: { presence: 9, senses: 9 }, skills: { speech: 60 }, tolls: 500,
    schedule: stand('lorne'),
    barks: ['I see everything from up here. It is what up here is for.', 'My son is at the Row, feeling something. I can see the Row from this chair.', 'Tea. Sit. Everyone sits eventually.'],
  },
  {
    id: 'npc_cr_07', name: 'Steward Pell', look: { seed: 9707, frame: 'broad', age: 48, ancestry: 'south_asian', over: { hair: { style: 'none', color: 0x202020 }, weathering: 0.1 } }, role: 'corp',
    level: 4, ...CR, courage: 35, dialogue: 'd_cr_pell', faction: 'tenured', attrs: { wits: 9 }, skills: { barter: 55, medicine: 40 }, tolls: 200,
    schedule: stand('pell'),
    barks: ['The house\'s steward. The house\'s hands, when the house would rather not look.', 'A cup, at the toast. Nobody up here asks what was in a cup.'],
  },
  {
    id: 'npc_cr_08', name: 'Sergeant Ambrose', look: { seed: 9708, frame: 'broad', age: 41, ancestry: 'north_european', over: { hair: { style: 'short04', color: 0x5a5048 }, facialHair: 'short_beard', weathering: 0.2 } },
    level: 6, ...warden, dialogue: 'd_cr_ambrose', attrs: { grit: 8, senses: 8, presence: 7 }, skills: { firearms: 55, speech: 45 }, tolls: 60, leader: true,
    equip: ['w_carbine556'], inventory: [['a_556', 20]],
    barks: ['Face to the lens. The lens decides; I only say it aloud.', 'Chit, pass, or standing. The help goes round the back.', 'Nobody forces the Crown. It has been tried. The lens remembers them.'],
  },
  {
    id: 'npc_cr_09', name: 'Nan Brisk', look: { seed: 9709, frame: 'broad', age: 50, ancestry: 'north_european', over: { hair: { style: 'bob02', color: 0x8a7a68 }, weathering: 0.35 } }, role: 'labourer',
    level: 3, ...CR, courage: 45, dialogue: 'd_cr_brisk', attrs: { grit: 8, wits: 7 }, skills: { speech: 40, barter: 40 }, tolls: 70,
    schedule: stand('brisk'),
    barks: ['Forty covers. Move.', 'The back stair\'s mine. Nobody goes up it I haven\'t fed.', 'They don\'t look at the help. That\'s the help\'s one advantage.'],
  },
  {
    id: 'npc_cr_10', name: 'Osric Vane', look: { seed: 9710, frame: 'narrow', age: 24, ancestry: 'north_european', over: { hair: { style: 'short04', color: 0xe8e0c8 }, weathering: 0.02 } }, role: 'gilded',
    level: 2, ...CR, courage: 25, dialogue: 'd_cr_osric', faction: 'tenured', attrs: { wits: 8, presence: 6 }, skills: { speech: 45 }, tolls: 200,
    schedule: stand('osric'),
    barks: ['Mother sold the Chair before she had it. I was in the room.', 'Tillie looks at the window. I look at the lift.', 'Everyone up here is being filed, and smiling for it.'],
  },
  {
    id: 'npc_cr_11', name: 'Mr Quill', look: { seed: 9711, frame: 'narrow', age: 44, ancestry: 'east_asian', over: { hair: { style: 'short04', color: 0x101010 }, weathering: 0 } }, role: 'corp',
    level: 5, ...CR, courage: 30, dialogue: 'd_cr_quill', faction: 'concern', attrs: { wits: 10, presence: 8 }, skills: { barter: 70, speech: 60 }, tolls: 1000,
    schedule: stand('quill'),
    barks: ['The Concern does not usually attend. This season warranted it.', 'Futures are the only thing the Crown still makes. We buy what is made.', 'Nobody has to decide anything tonight. The Chair will.'],
  },
  {
    id: 'npc_cr_12', name: 'Cutter Mabe', look: { seed: 9712, frame: 'broad', age: 33, ancestry: 'west_african', over: { hair: { style: 'paint_buzz', color: 0x101010 }, weathering: 0.4, scars: ['brow_cut'] } }, role: 'street',
    level: 6, ...CR, courage: 75, dialogue: 'd_cr_mabe', attrs: { brawn: 9, reflex: 7, grit: 8 }, skills: { melee: 70 }, tolls: 40,
    equip: ['w_machete'],
    schedule: stand('mabe'),
    barks: ['Borrowed shoes. Pinch like a debt.', 'Honora pays by the bout. Up here they pay by the season.', 'Dace has never been hit by anyone who meant it.'],
  },
  // the lift wardens and the houses' guards
  { id: 'npc_cr_w1', name: 'Lift Warden', look: { seed: 9713, frame: 'broad', age: 30, ancestry: 'mediterranean' }, ...warden, level: 5, minor: true, equip: ['w_pistol9'], inventory: [['a_9mm', 12]], schedule: stand('w1'), barks: ['Face to the lens.', 'The help goes round.'] },
  { id: 'npc_cr_w2', name: 'Lift Warden', look: { seed: 9714, frame: 'narrow', age: 27, ancestry: 'south_asian' }, ...warden, level: 5, minor: true, equip: ['w_pistol9'], inventory: [['a_9mm', 12]], schedule: stand('w2'), barks: ['Chit, pass or standing.'] },
  { id: 'npc_cr_hg1', name: 'House Guard', look: { seed: 9715, frame: 'broad', age: 35, ancestry: 'north_european' }, ...house, level: 5, minor: true, equip: ['w_pistol9'], inventory: [['a_9mm', 12]], schedule: stand('hg1'), barks: ['Vane\'s door. Dace decides.'] },
  { id: 'npc_cr_hg2', name: 'House Guard', look: { seed: 9716, frame: 'broad', age: 38, ancestry: 'east_african' }, ...house, level: 5, minor: true, equip: ['w_pistol9'], inventory: [['a_9mm', 12]], barks: ['Back door\'s staff. Staff is Brisk\'s.'] },
  { id: 'npc_cr_hg3', name: 'House Guard', look: { seed: 9717, frame: 'narrow', age: 31, ancestry: 'south_asian' }, ...house, level: 5, minor: true, equip: ['w_pistol9'], inventory: [['a_9mm', 12]], schedule: stand('hg3'), barks: ['Ashby-Crane\'s. The old crest.'] },
];
