import type { SettlementDef } from '../../engine/world/frontier';

/** Places that hold opinions, and the roads gossip travels along (travel days). */
export const SETTLEMENTS: Record<string, SettlementDef> = Object.fromEntries(([
  { id: 'cistern9', name: 'Knock', roads: { shale: 1 }, traffic: 0.2, type: 'shelter', region: 'sallow', prosperity: 0.45, kit: 'concrete' },
  { id: 'shale', name: 'Shale', roads: { cistern9: 1, rustdogs: 1, drywells: 1, tollhouse: 2, wheel: 1 }, traffic: 0.7, type: 'well_town', region: 'sallow', prosperity: 0.3, kit: 'adobe', crisis: 'drought' },
  { id: 'rustdogs', name: 'Rust Dogs\' overpass', roads: { shale: 1, tollhouse: 2, wheel: 1 }, traffic: 0.5, type: 'raider_camp', region: 'sallow', prosperity: 0.25, kit: 'wreck', owner: 'rust_dogs' },
  { id: 'drywells', name: 'Dry Wells', roads: { shale: 1, wheel: 1 }, traffic: 0.4, type: 'well_town', region: 'sallow', prosperity: 0.15, kit: 'scrap' },
  { id: 'wheel', name: 'Wheel', roads: { shale: 1, drywells: 1, rustdogs: 1 }, traffic: 0.6, type: 'nomad_camp', region: 'sallow', prosperity: 0.4, kit: 'wagons', owner: 'wheel' },
  { id: 'tollhouse', name: 'Tollhouse 9', roads: { shale: 2, rustdogs: 2, ninebridge: 4, fourways: 2 }, traffic: 0.9, type: 'toll_fort', region: 'sallow', prosperity: 0.6, kit: 'concrete', owner: 'tollmen' },
  { id: 'ninebridge', name: 'Ninebridge', roads: { tollhouse: 4, openfield: 2, meridian: 3, sump: 2 }, traffic: 1, type: 'trade_town', region: 'glass_flats', prosperity: 0.6, kit: 'wreck', owner: 'tollmen' },
  { id: 'openfield', name: 'Openfield', roads: { ninebridge: 2, meridian: 3, sump: 2, west_halt: 2 }, traffic: 0.5, type: 'commune', region: 'glass_flats', prosperity: 0.55, kit: 'timber', owner: 'choir' },
  { id: 'sump', name: 'Sump', roads: { ninebridge: 2, openfield: 2 }, traffic: 0.3, type: 'salvage_camp', region: 'glass_flats', prosperity: 0.2, kit: 'scrap' },
  { id: 'meridian', name: 'Meridian', roads: { ninebridge: 3, openfield: 3, skirts: 5, west_halt: 2, hamlet_shore: 3 }, traffic: 0.8, type: 'bastion', region: 'meridian', prosperity: 0.5, kit: 'concrete' },
  // the debtors' town under Halcyon (B4a): the Line brings its news to Meridian in a few days
  { id: 'skirts', name: 'Skirts', roads: { meridian: 5, east_halt: 2 }, traffic: 0.6, type: 'bastion', region: 'teeth', prosperity: 0.15, kit: 'scrap', crisis: 'strike' },
  // the Rail Corridor (B5a): towns that exist because a train stops there, and news that rides the Line
  { id: 'fourways', name: 'Four Ways', roads: { tollhouse: 2, yard_nine: 1, east_halt: 2 }, traffic: 0.8, type: 'rail_halt', region: 'rail_corridor', prosperity: 0.5, kit: 'timber' },
  { id: 'yard_nine', name: 'Yard Nine', roads: { fourways: 1, west_halt: 1 }, traffic: 0.6, type: 'rail_halt', region: 'rail_corridor', prosperity: 0.4, kit: 'containers', owner: 'tollmen' },
  { id: 'west_halt', name: 'West Halt', roads: { yard_nine: 1, openfield: 2, meridian: 2 }, traffic: 0.4, type: 'rail_halt', region: 'rail_corridor', prosperity: 0.2, kit: 'timber', crisis: 'debt' },
  { id: 'east_halt', name: 'East Halt', roads: { fourways: 2, skirts: 2 }, traffic: 0.3, type: 'rail_halt', region: 'rail_corridor', prosperity: 0.12, kit: 'scrap', crisis: 'debt' },
  // the Drowned Shore (B5b): a stilt village and the platform crew offshore; news goes up the delta on the tide boat
  { id: 'hamlet_shore', name: 'Gull Stilts', roads: { meridian: 3, rigs: 1 }, traffic: 0.4, type: 'stilt_village', region: 'drowned_shore', prosperity: 0.2, kit: 'stilts', crisis: 'famine' },
  { id: 'rigs', name: 'Rigs', roads: { hamlet_shore: 1 }, traffic: 0.3, type: 'salvage_camp', region: 'drowned_shore', prosperity: 0.3, kit: 'wreck' },
] as SettlementDef[]).map((s) => [s.id, s]));
