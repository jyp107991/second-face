import type { ItemDef } from '../../engine/inventory/items';

export const ARMOR: ItemDef[] = [
  { id: 'r_jumpsuit', wear: { garment: 'male_worksuit01', tint: 0x8a9088 }, name: 'Cistern Coverall', desc: 'Grey-green coverall with a faded "9" on the back. Barely armour.', category: 'armor', weight: 1.5, value: 15,
    armor: { slot: 'body', dt: 0, dr: 5, durability: 200 } },
  { id: 'r_duster', icon: 'coat', wear: { garments: [{ name: 'cortu_cargo_pants', dye: 0x3a3530, grime: 0.4 }, { name: { m: 'elvs_male_tankshirt1', f: 'elvs_lara_tank1' }, dye: 0x8a8478, grime: 0.3 }, { name: 'mindfront_cardigan_long_open_front', tint: 0x5a3a24, wear: 0.1, grime: 0.35 }] }, name: 'Leather Duster', desc: 'Long coat of cured hide. Turns a knife, mostly.', category: 'armor', weight: 4, value: 160,
    armor: { slot: 'body', dt: 2, dr: 15, durability: 300 } },
  { id: 'r_scrap', wear: { gear: [{ kind: 'harness' }, { kind: 'plates' }] }, name: 'Scrap Plate', desc: 'Road signs and hubcaps bolted to a harness. Loud.', category: 'armor', weight: 9, value: 260,
    armor: { slot: 'body', dt: 4, dr: 22, stealth: 15, durability: 350 } },
  { id: 'r_riot', wear: { garment: { m: 'mindfront_tactical_vest_male', f: 'mindfront_tactical_vest_female' }, tint: 0x3a3d3a }, name: 'Riot Vest', desc: 'Pre-Burn police body armour, faded insignia picked off.', category: 'armor', weight: 6, value: 700,
    armor: { slot: 'body', dt: 6, dr: 30, stealth: 5, durability: 450 } },
  { id: 'r_hood', wear: { gear: [{ kind: 'headwrap', color: 0x6b5a43 }, { kind: 'goggles' }] }, name: 'Dust Hood', desc: 'Wrapped cloth and goggles against the grit.', category: 'armor', weight: 0.3, value: 20,
    armor: { slot: 'head', dt: 0, dr: 3, radResist: 5, durability: 120 } },
  { id: 'r_helmet', wear: { gear: [{ kind: 'hardhat', color: 0xb08a30 }] }, name: 'Hard Hat', desc: 'A dented work helmet.', category: 'armor', weight: 1, value: 45,
    armor: { slot: 'head', dt: 1, dr: 8, durability: 250 } },
  { id: 'r_gasmask', wear: { mask: true }, name: 'Filter Mask', desc: 'A rubber mask with a screw-in filter. Breathe easy in bad air.', category: 'armor', weight: 0.8, value: 120,
    armor: { slot: 'head', dt: 0, dr: 4, radResist: 20, durability: 150 } },
  { id: 'r_velvet', icon: 'coat', wear: { garments: [{ name: { m: 'mindfront_m_suit_01', f: 'elvs_halter_style_pantsuit1' }, dye: 0x1f5b4a }, { name: { m: 'mindfront_shoes_oxford_male', f: 'mindfront_shoes_oxford_female' } }] }, name: 'The Velvet\'s Evening', desc: 'Evening clothes cut by the Madame of the Velvet to the Crown\'s season: bottle-green, Crown-plain, nothing on them that says the Row. They check whether you look like you belong. This is what belonging looks like.', category: 'armor', weight: 1, value: 180,
    armor: { slot: 'body', dt: 0, dr: 2, durability: 120 } },
];
