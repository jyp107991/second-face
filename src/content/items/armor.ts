import type { ItemDef } from '../../engine/inventory/items';

export const ARMOR: ItemDef[] = [
  { id: 'r_jumpsuit', name: 'Cistern Coverall', desc: 'Grey-green coverall with a faded "9" on the back. Barely armour.', category: 'armor', weight: 1.5, value: 15,
    armor: { slot: 'body', dt: 0, dr: 5, durability: 200 } },
  { id: 'r_duster', name: 'Leather Duster', desc: 'Long coat of cured hide. Turns a knife, mostly.', category: 'armor', weight: 4, value: 160,
    armor: { slot: 'body', dt: 2, dr: 15, durability: 300 } },
  { id: 'r_scrap', name: 'Scrap Plate', desc: 'Road signs and hubcaps bolted to a harness. Loud.', category: 'armor', weight: 9, value: 260,
    armor: { slot: 'body', dt: 4, dr: 22, stealth: 15, durability: 350 } },
  { id: 'r_riot', name: 'Riot Vest', desc: 'Pre-Burn police body armour, faded insignia picked off.', category: 'armor', weight: 6, value: 700,
    armor: { slot: 'body', dt: 6, dr: 30, stealth: 5, durability: 450 } },
  { id: 'r_hood', name: 'Dust Hood', desc: 'Wrapped cloth and goggles against the grit.', category: 'armor', weight: 0.3, value: 20,
    armor: { slot: 'head', dt: 0, dr: 3, radResist: 5, durability: 120 } },
  { id: 'r_helmet', name: 'Hard Hat', desc: 'A dented work helmet.', category: 'armor', weight: 1, value: 45,
    armor: { slot: 'head', dt: 1, dr: 8, durability: 250 } },
  { id: 'r_gasmask', name: 'Filter Mask', desc: 'A rubber mask with a screw-in filter. Breathe easy in bad air.', category: 'armor', weight: 0.8, value: 120,
    armor: { slot: 'head', dt: 0, dr: 4, radResist: 20, durability: 150 } },
];
