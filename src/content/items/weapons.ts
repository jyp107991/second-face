import type { ItemDef } from '../../engine/inventory/items';

/** Base weapons. Values are tuned against the economy targets in DESIGN §5. */
export const WEAPONS: ItemDef[] = [
  // --- Melee / unarmed
  { id: 'w_shiv', held: 'knife', name: 'Shiv', desc: 'A sharpened strip of Cistern hull plating, cloth-wrapped grip.', category: 'weapon', weight: 0.4, value: 8,
    weapon: { skill: 'melee', kind: 'melee', hands: 1, dmg: [2, 6], dmgType: 'blade', ap: 3, range: 1, durability: 200, critMult: 2 } },
  { id: 'w_pipe', held: 'pipe', name: 'Lead Pipe', desc: 'Heavy, honest, and not going to break.', category: 'weapon', weight: 2.5, value: 10,
    weapon: { skill: 'melee', kind: 'melee', hands: 1, dmg: [4, 9], dmgType: 'blunt', ap: 4, range: 1, durability: 400, minBrawn: 4 } },
  { id: 'w_machete', held: 'machete', name: 'Machete', desc: 'A field blade with a chipped edge and a good balance.', category: 'weapon', weight: 1.2, value: 45,
    weapon: { skill: 'melee', kind: 'melee', hands: 1, dmg: [5, 12], dmgType: 'blade', ap: 4, range: 1, durability: 250, critMult: 2 } },
  { id: 'w_spear', held: 'spear', name: 'Rebar Spear', desc: 'Rebar ground to a point and lashed to a pole. Reaches two tiles.', category: 'weapon', weight: 3, value: 30,
    weapon: { skill: 'melee', kind: 'melee', hands: 2, dmg: [6, 13], dmgType: 'blade', ap: 4, range: 2, durability: 180, minBrawn: 5 } },
  { id: 'w_knuckles', held: 'knuckles', name: 'Bolt Knuckles', desc: 'Four hex bolts welded to a steel band.', category: 'weapon', weight: 0.5, value: 25,
    weapon: { skill: 'melee', kind: 'unarmed', hands: 1, dmg: [3, 7], dmgType: 'blunt', ap: 3, range: 1, durability: 500 } },
  { id: 'w_sledge', held: 'sledge', name: 'Sledge', desc: 'A demolition hammer. Slow. Final.', category: 'weapon', weight: 7, value: 90,
    weapon: { skill: 'melee', kind: 'melee', hands: 2, dmg: [12, 24], dmgType: 'blunt', ap: 5, range: 1, durability: 400, minBrawn: 7 } },
  // --- Thrown
  { id: 'w_molotov', held: 'bottle', name: 'Firebottle', desc: 'Fuel, a rag, a prayer.', category: 'weapon', weight: 0.8, value: 20, stack: true,
    weapon: { skill: 'explosives', kind: 'thrown', hands: 1, dmg: [10, 20], dmgType: 'fire', ap: 5, range: 8, area: 1, durability: 1, consumable: true, noise: 6 } },
  { id: 'w_frag', held: 'can', name: 'Can Grenade', desc: 'A tin can packed with powder and nails. Short fuse.', category: 'weapon', weight: 0.6, value: 45, stack: true,
    weapon: { skill: 'explosives', kind: 'thrown', hands: 1, dmg: [15, 30], dmgType: 'explosive', ap: 5, range: 8, area: 2, durability: 1, consumable: true, noise: 14 } },
  { id: 'w_knife_throw', held: 'spike', name: 'Throwing Spikes', desc: 'Balanced steel spikes. Retrievable if you survive.', category: 'weapon', weight: 0.3, value: 6, stack: true,
    weapon: { skill: 'explosives', kind: 'thrown', hands: 1, dmg: [3, 8], dmgType: 'blade', ap: 3, range: 7, durability: 1, consumable: true } },
  // --- Firearms
  { id: 'w_zip38', held: 'zip', name: 'Zip Pistol', desc: 'A single-shot pipe gun firing .38. Ugly and loud.', category: 'weapon', weight: 1.0, value: 35,
    weapon: { skill: 'firearms', kind: 'pistol', hands: 1, dmg: [6, 12], dmgType: 'ballistic', ap: 4, range: 12, ammo: '38', magazine: 1, durability: 80, noise: 12 } },
  { id: 'w_revolver38', held: 'revolver', name: 'Six-Shooter', desc: 'A pre-Burn .38 revolver, refinished more times than anyone remembers.', category: 'weapon', weight: 1.1, value: 140,
    weapon: { skill: 'firearms', kind: 'pistol', hands: 1, dmg: [8, 14], dmgType: 'ballistic', ap: 4, range: 16, ammo: '38', magazine: 6, durability: 300, noise: 12 } },
  { id: 'w_pistol9', held: 'pistol', name: 'Service Pistol', desc: 'A 9mm semi-automatic from some long-gone police force.', category: 'weapon', weight: 0.9, value: 220,
    weapon: { skill: 'firearms', kind: 'pistol', hands: 1, dmg: [8, 15], dmgType: 'ballistic', ap: 4, range: 18, ammo: '9mm', magazine: 12, durability: 260, noise: 12 } },
  { id: 'w_hand44', held: 'revolver', name: 'Hand Cannon', desc: 'A .44 that kicks like a mule. People listen when it talks.', category: 'weapon', weight: 1.6, value: 480,
    weapon: { skill: 'firearms', kind: 'pistol', hands: 1, dmg: [16, 28], dmgType: 'ballistic', ap: 5, range: 18, ammo: '44', magazine: 6, durability: 300, minBrawn: 5, noise: 16 } },
  { id: 'w_smg9', held: 'smg', name: 'Stutter Gun', desc: 'A stamped-steel 9mm machine pistol. Bursts only, really.', category: 'weapon', weight: 3.0, value: 520,
    weapon: { skill: 'firearms', kind: 'smg', hands: 2, dmg: [7, 13], dmgType: 'ballistic', ap: 4, burst: { rounds: 6, ap: 6 }, range: 14, ammo: '9mm', magazine: 30, durability: 220, noise: 14 } },
  { id: 'w_sawnoff', held: 'sawnoff', name: 'Sawn-Off', desc: 'Double-barrelled 12 gauge, cut down for close quarters.', category: 'weapon', weight: 2.4, value: 180,
    weapon: { skill: 'firearms', kind: 'shotgun', hands: 2, dmg: [16, 30], dmgType: 'ballistic', ap: 5, range: 6, ammo: '12ga', magazine: 2, durability: 200, area: 1, noise: 16 } },
  { id: 'w_pump', held: 'shotgun', name: 'Pump Shotgun', desc: 'A farm gun. Reliable in sand, which matters here.', category: 'weapon', weight: 3.6, value: 420,
    weapon: { skill: 'firearms', kind: 'shotgun', hands: 2, dmg: [14, 26], dmgType: 'ballistic', ap: 5, range: 10, ammo: '12ga', magazine: 6, durability: 320, area: 1, noise: 16 } },
  { id: 'w_bolt308', held: 'rifle', name: 'Bolt Rifle', desc: 'A .308 hunting rifle with a cracked but serviceable scope.', category: 'weapon', weight: 4.0, value: 650,
    weapon: { skill: 'firearms', kind: 'rifle', hands: 2, dmg: [22, 36], dmgType: 'ballistic', ap: 5, range: 30, ammo: '308', magazine: 5, durability: 300, critMult: 2.5, noise: 18 } },
  { id: 'w_carbine556', held: 'carbine', name: 'Patrol Carbine', desc: 'A 5.56 carbine with a folding stock and a bad history.', category: 'weapon', weight: 3.2, value: 900,
    weapon: { skill: 'firearms', kind: 'rifle', hands: 2, dmg: [14, 22], dmgType: 'ballistic', ap: 5, burst: { rounds: 3, ap: 6 }, range: 24, ammo: '556', magazine: 20, durability: 280, noise: 16 } },
  // --- Arc (pre-Burn energy)
  { id: 'w_arc_pistol', held: 'arc', name: 'Arc Pistol', desc: 'A pre-Burn security sidearm. It hums. It should not still work.', category: 'weapon', weight: 1.4, value: 1200,
    weapon: { skill: 'arc', kind: 'arc', hands: 1, dmg: [14, 24], dmgType: 'energy', ap: 5, range: 16, ammo: 'cell', magazine: 20, durability: 200, noise: 6 } },
  { id: 'w_sabre', held: 'machete', name: 'Duelling Sabre', desc: 'A Crown blade: light, curved, a basket hilt with a house crest filed off. Made for one other person at a time.', category: 'weapon', weight: 1, value: 160,
    weapon: { skill: 'melee', kind: 'melee', hands: 1, dmg: [6, 14], dmgType: 'blade', ap: 3, range: 1, durability: 300, critMult: 2.5 } },
];
