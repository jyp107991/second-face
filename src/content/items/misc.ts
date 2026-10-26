import type { ItemDef } from '../../engine/inventory/items';

/** Junk (crafting parts), tools, and the currency pseudo-item. */
export const MISC: ItemDef[] = [
  { id: 'tolls', icon: 'coins', name: 'Tolls', desc: 'Stamped tin chits issued by the Tollmen. Good anywhere the roads go.', category: 'misc', weight: 0, value: 1, stack: true },
  // Chrome upkeep (stats/chrome.ts): miss it and the pieces degrade.
  { id: 'u_holdfast', icon: 'holdfast', name: 'Holdfast', desc: 'Grey tablets that keep flesh and implant on speaking terms. Menders sell them by the strip.', category: 'misc', weight: 0.02, value: 30, stack: true },
  { id: 'u_powercell', icon: 'battery', name: 'Implant Cell', desc: 'A thumb-sized charge cell for chrome that draws more than a body makes.', category: 'misc', weight: 0.05, value: 45, stack: true },
  { id: 'j_scrap', icon: 'scrap', name: 'Scrap Metal', desc: 'Bent sheet, bolts, wire.', category: 'junk', weight: 1, value: 2 },
  { id: 'j_wiring', icon: 'wiring', name: 'Copper Wiring', desc: 'Stripped from walls and dead machines.', category: 'junk', weight: 0.3, value: 4 },
  { id: 'j_cloth', icon: 'cloth', name: 'Cloth', desc: 'Rags, sacking, a torn shirt.', category: 'junk', weight: 0.2, value: 1 },
  { id: 'j_glass', icon: 'glass', name: 'Glass Bottle', desc: 'Empty. Useful.', category: 'junk', weight: 0.3, value: 1 },
  { id: 'j_electronics', icon: 'board', name: 'Circuit Board', desc: 'Pre-Burn electronics. Someone always wants these.', category: 'junk', weight: 0.2, value: 12 },
  { id: 'j_fuel', icon: 'fuel', name: 'Fuel Can', desc: 'A dented can, a third full.', category: 'junk', weight: 2, value: 10 },
  { id: 'j_powder', icon: 'powder', name: 'Black Powder', desc: 'For hand-loading, or for bad ideas.', category: 'junk', weight: 0.2, value: 6 },
  { id: 'j_casings', icon: 'casings', name: 'Spent Casings', desc: 'Brass for reloading.', category: 'junk', weight: 0.01, value: 0.2 },
  { id: 't_picks', icon: 'picks', name: 'Lock Picks', desc: 'A ring of tension wrenches and hooks. +15 Security while carried.', category: 'tool', weight: 0.1, value: 30, stack: true },
  { id: 't_repair', icon: 'wrench', name: 'Repair Kit', desc: 'Files, wire, glue and patience. Restores weapon or armour condition.', category: 'tool', weight: 1, value: 60, stack: true },
  { id: 't_docbag', icon: 'docbag', name: "Doctor's Bag", desc: 'Scalpels, sutures, a battered stethoscope. +15 Medicine when treating wounds.', category: 'tool', weight: 1.5, value: 120 },
  { id: 't_lamp', icon: 'lamp', name: 'Hand Lamp', desc: 'A wind-up flashlight. Reduces darkness penalties.', category: 'tool', weight: 0.4, value: 25 },
];
