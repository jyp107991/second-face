import type { SettlementDef } from '../../engine/world/frontier';

/** Places that hold opinions, and the roads gossip travels along (travel days). */
export const SETTLEMENTS: Record<string, SettlementDef> = Object.fromEntries(([
  { id: 'cistern9', name: 'Cistern 9', roads: { shale: 1 }, traffic: 0.2 },
  { id: 'shale', name: 'Shale', roads: { cistern9: 1, rustdogs: 1, drywells: 1, tollhouse: 2 }, traffic: 0.7 },
  { id: 'rustdogs', name: 'the Rust Dogs', roads: { shale: 1, tollhouse: 2 }, traffic: 0.5 },
  { id: 'drywells', name: 'Dry Wells', roads: { shale: 1 }, traffic: 0.4 },
  { id: 'tollhouse', name: 'Tollhouse 9', roads: { shale: 2, rustdogs: 2, ninebridge: 4 }, traffic: 0.9 },
  { id: 'ninebridge', name: 'Ninebridge', roads: { tollhouse: 4, openfield: 2, meridian: 3 }, traffic: 1 },
  { id: 'openfield', name: 'Openfield', roads: { ninebridge: 2, meridian: 3 }, traffic: 0.5 },
  { id: 'meridian', name: 'Meridian', roads: { ninebridge: 3, openfield: 3 }, traffic: 0.8 },
] as SettlementDef[]).map((s) => [s.id, s]));
