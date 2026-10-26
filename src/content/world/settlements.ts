import type { SettlementDef } from '../../engine/world/frontier';

/** Places that hold opinions, and the roads gossip travels along (travel days). */
export const SETTLEMENTS: Record<string, SettlementDef> = Object.fromEntries(([
  { id: 'cistern9', name: 'Cistern 9', roads: { shale: 1 }, traffic: 0.2, type: 'shelter', region: 'sallow', prosperity: 0.45, kit: 'concrete' },
  { id: 'shale', name: 'Shale', roads: { cistern9: 1, rustdogs: 1, drywells: 1, tollhouse: 2 }, traffic: 0.7, type: 'well_town', region: 'sallow', prosperity: 0.3, kit: 'adobe', crisis: 'drought' },
  { id: 'rustdogs', name: 'the Rust Dogs', roads: { shale: 1, tollhouse: 2 }, traffic: 0.5, type: 'raider_camp', region: 'sallow', prosperity: 0.25, kit: 'wreck', owner: 'rust_dogs' },
  { id: 'drywells', name: 'Dry Wells', roads: { shale: 1 }, traffic: 0.4, type: 'well_town', region: 'sallow', prosperity: 0.15, kit: 'scrap' },
  { id: 'tollhouse', name: 'Tollhouse 9', roads: { shale: 2, rustdogs: 2, ninebridge: 4 }, traffic: 0.9, type: 'toll_fort', region: 'sallow', prosperity: 0.6, kit: 'concrete', owner: 'tollmen' },
  { id: 'ninebridge', name: 'Ninebridge', roads: { tollhouse: 4, openfield: 2, meridian: 3 }, traffic: 1, type: 'trade_town', region: 'glass_flats', prosperity: 0.6, kit: 'wreck', owner: 'tollmen' },
  { id: 'openfield', name: 'Openfield', roads: { ninebridge: 2, meridian: 3 }, traffic: 0.5, type: 'commune', region: 'glass_flats', prosperity: 0.55, kit: 'timber', owner: 'choir' },
  { id: 'meridian', name: 'Meridian', roads: { ninebridge: 3, openfield: 3 }, traffic: 0.8, type: 'bastion', region: 'meridian', prosperity: 0.5, kit: 'concrete' },
] as SettlementDef[]).map((s) => [s.id, s]));
