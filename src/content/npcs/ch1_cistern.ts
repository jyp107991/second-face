import type { NpcDef } from '../../engine/npc/defs';

/** Cistern 9 residents (Chapter One). Everyone wears Cistern issue; nobody has seen the sun. */
const C9_SUIT = { layers: [{ name: 'cortu_cargo_pants', dye: 0x5a5e54, grime: 0.2 }, { name: 'toigo_basic_tucked_t-shirt', dye: 0x8a8c80, grime: 0.15 }, { name: 'maciekg_leather_boots', grime: 0.25 }], grime: 0.2 };
const C9_SUIT_F = { layers: [{ name: 'cortu_cargo_pants', dye: 0x5e5a58, grime: 0.2 }, { name: 'toigo_basic_tucked_t-shirt', dye: 0x9a9488, grime: 0.15 }, { name: 'maciekg_leather_boots', grime: 0.25 }], grime: 0.2 };
const C9 = { team: 'cistern9', faction: 'cistern9', settlement: 'cistern9' } as const;
const sleep = (spot: string) => ({ from: 22, to: 6, spot, activity: 'sleep' as const });

export const CH1_CISTERN: NpcDef[] = [
  {
    id: 'npc_c9_01', name: 'Elder Ines Halloran', look: { seed: 1101, frame: 'narrow', age: 66, over: { hair: { style: 'elvs_unkempt_french_braid', color: 0xb8b6ae } } },
    outfit: C9_SUIT_F, level: 3, ...C9, courage: 35, dialogue: 'd_c9_ines',
    schedule: [{ from: 6, to: 22, spot: 'council', activity: 'work' }, sleep('bunk_ines')],
    barks: ['Sixty people, {name}. Sixty.', 'Indulge an old woman and walk, don\'t run.'],
  },
  {
    id: 'npc_c9_02', name: 'Doc Aurel Pell', look: { seed: 1102, frame: 'broad', age: 58, over: { facialHair: 'short_beard', hair: { style: 'cut_sidepart', color: 0x8a8782 } } },
    outfit: C9_SUIT, level: 3, ...C9, courage: 40, dialogue: 'd_c9_pell',
    schedule: [{ from: 5, to: 23, spot: 'clinic', activity: 'work' }, sleep('bunk_pell')],
    barks: ['Wash your hands before you come in here.', 'He walked a long way to die on my floor.'],
  },
  {
    id: 'npc_c9_03', name: 'Tamsin Roe', look: { seed: 1103, frame: 'narrow', age: 24, over: { hair: { style: 'cut_pixie', color: 0x7a3418 }, freckles: 0.5 } },
    outfit: C9_SUIT_F, level: 2, ...C9, courage: 80, dialogue: 'd_c9_tamsin', attrs: { reflex: 6, brawn: 5 }, skills: { melee: 20 },
    schedule: [{ from: 6, to: 12, spot: 'hydro', activity: 'work' }, { from: 12, to: 14, spot: 'commons_c', activity: 'idle' }, { from: 14, to: 20, spot: 'hydro', activity: 'work' }, { from: 20, to: 22, spot: 'commons_c', activity: 'idle' }, sleep('bunk_tamsin')],
    barks: ['Rust it, the pump\'s sticking again.', 'Did you see him? Before?', 'The fridge says variance is unchanged. The fridge can bite me.'],
  },
  {
    id: 'npc_c9_04', name: 'Bram Coyle', look: { seed: 1104, frame: 'broad', age: 41, over: { facialHair: 'stubble_heavy', hair: { style: 'paint_buzz', color: 0x2b1d14 } } },
    outfit: C9_SUIT, level: 3, ...C9, courage: 30, dialogue: 'd_c9_bram', skills: { mechanics: 35 },
    schedule: [{ from: 5, to: 23, spot: 'machine', activity: 'work' }, sleep('bunk_bram')],
    barks: ['Nobody touches the door.', 'She\'s eating her own spares. Don\'t ask me what happens after.'],
  },
  /** MOTHER is a voice, not a body: the def exists for the speaker name; it is never placed. */
  { id: 'npc_c9_05', name: 'MOTHER', look: { seed: 1105 }, role: 'tech', level: 1, ...C9, courage: 0 },
  {
    id: 'npc_c9_06', name: 'Elder Rosalind Teague', look: { seed: 1106, frame: 'narrow', age: 72, over: { hair: { style: 'short04', color: 0xd2d0c8 } } },
    outfit: C9_SUIT_F, level: 2, ...C9, courage: 45, dialogue: 'd_c9_teague',
    schedule: [{ from: 6, to: 9, spot: 'kitchen', activity: 'work' }, { from: 9, to: 21, spot: 'commons_a', activity: 'idle' }, sleep('bunk_r4')],
    barks: ['Weld it. Weld the thing shut.', 'Continuity is a duty, not a comfort.'],
  },
  {
    id: 'npc_c9_r1', name: 'Ola Marr', look: { seed: 1107, frame: 'narrow', age: 38 }, outfit: C9_SUIT_F, level: 1, ...C9, courage: 30,
    schedule: [{ from: 6, to: 21, spot: 'hydro_b', activity: 'work' }, sleep('bunk_r1')],
    barks: ['Ninety years, and then a knock.', 'The algae don\'t care who knocks. Somebody has to feed them.', 'Was he… all right? Before, I mean.'],
  },
  {
    id: 'npc_c9_r2', name: 'Jory Benn', look: { seed: 1108, frame: 'broad', age: 29 }, outfit: C9_SUIT, level: 1, ...C9, courage: 40,
    schedule: [{ from: 7, to: 12, spot: 'commons_b', activity: 'idle' }, { from: 12, to: 20, spot: 'machine_bench', activity: 'work' }, sleep('bunk_r2')],
    barks: ['Bram says the seal\'s older than the door. How does that work?', 'If you go out there, bring back something that isn\'t algae.', 'My grandmother said the sky was blue. I never believed her.'],
  },
  {
    id: 'npc_c9_r3', name: 'Sayer Quist', look: { seed: 1109, frame: 'broad', age: 63, over: { facialHair: 'full_beard' } }, outfit: C9_SUIT, level: 1, ...C9, courage: 25,
    schedule: [{ from: 5, to: 20, spot: 'kitchen', activity: 'work' }, sleep('bunk_r3')],
    barks: ['Soup\'s at six. It\'s always at six.', 'Teague wants it welded. Teague wanted the last one welded too, and there wasn\'t a last one.', 'He had a photograph. Of you. I don\'t like it.'],
  },
  {
    id: 'npc_c9_r4', name: 'Pim Oyelaran', look: { seed: 1110, frame: 'narrow', age: 19 }, outfit: C9_SUIT_F, level: 1, ...C9, courage: 50,
    schedule: [{ from: 6, to: 22, spot: 'corridor_e', activity: 'patrol' }, sleep('bunk_r4')],
    barks: ['Tamsin says she\'s going out. She says that every year.', 'I counted the door bolts once. Forty-one.', 'MOTHER thanked us for our continuity. What does that even mean?'],
  },
];
