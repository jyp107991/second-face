import type { ItemDef } from '../../engine/inventory/items';

/** Ammunition. One round = one item unit. Value per round. */
export const AMMO: ItemDef[] = [
  { id: 'a_38', name: '.38 Rounds', desc: 'Common revolver rounds, often hand-loaded.', category: 'ammo', weight: 0.01, value: 1, ammo: { type: '38', dmgMult: 1, dtPen: 0, drMod: 0 } },
  { id: 'a_9mm', name: '9mm Rounds', desc: 'Pre-Burn pistol ammunition.', category: 'ammo', weight: 0.01, value: 2, ammo: { type: '9mm', dmgMult: 1, dtPen: 0, drMod: 0 } },
  { id: 'a_9mm_hp', name: '9mm Hollowpoint', desc: 'Expands in soft targets; poor against armour.', category: 'ammo', weight: 0.01, value: 3, ammo: { type: '9mm', dmgMult: 1.25, dtPen: -2, drMod: 10 } },
  { id: 'a_44', name: '.44 Rounds', desc: 'Heavy pistol rounds.', category: 'ammo', weight: 0.02, value: 4, ammo: { type: '44', dmgMult: 1, dtPen: 1, drMod: 0 } },
  { id: 'a_12ga', name: '12ga Shells', desc: 'Buckshot.', category: 'ammo', weight: 0.04, value: 3, ammo: { type: '12ga', dmgMult: 1, dtPen: 0, drMod: 0 } },
  { id: 'a_12ga_slug', name: '12ga Slugs', desc: 'Solid slugs. Less spread, more punch through plates.', category: 'ammo', weight: 0.04, value: 4, ammo: { type: '12ga', dmgMult: 0.9, dtPen: 3, drMod: -5 } },
  { id: 'a_308', name: '.308 Rounds', desc: 'Rifle ammunition, precious and heavy.', category: 'ammo', weight: 0.03, value: 6, ammo: { type: '308', dmgMult: 1, dtPen: 2, drMod: 0 } },
  { id: 'a_556', name: '5.56 Rounds', desc: 'Military rifle ammunition.', category: 'ammo', weight: 0.02, value: 4, ammo: { type: '556', dmgMult: 1, dtPen: 1, drMod: 0 } },
  { id: 'a_556_ap', name: '5.56 Penetrator', desc: 'Steel-cored. Rare. Worth it against plate.', category: 'ammo', weight: 0.02, value: 8, ammo: { type: '556', dmgMult: 0.9, dtPen: 6, drMod: -10 } },
  { id: 'a_cell', name: 'Arc Cell', desc: 'A pre-Burn charge cell. Each one fires a single shot.', category: 'ammo', weight: 0.05, value: 10, ammo: { type: 'cell', dmgMult: 1, dtPen: 4, drMod: 0 } },
];
