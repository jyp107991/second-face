/** Regions of the Western Reach (docs/WORLD.md §2). Bounds are in km on the world map (x east, y south). */
export interface RegionDef { id: string; name: string; bounds: [number, number, number, number]; climate: string }

export const REGIONS: Record<string, RegionDef> = Object.fromEntries(([
  { id: 'sallow', name: 'the Sallow', bounds: [380, 280, 560, 440], climate: 'dry scrub, salt pans, dust storms' },
  { id: 'glass_flats', name: 'the Glass Flats', bounds: [220, 260, 400, 420], climate: 'fused desert, sand-blast storms' },
  { id: 'rail_corridor', name: 'the Rail Corridor', bounds: [140, 160, 600, 280], climate: 'grass plains and scrub along the Line' },
  { id: 'drowned_shore', name: 'the Drowned Shore', bounds: [0, 200, 140, 480], climate: 'delta, coast, fog, flood tides' },
  { id: 'meridian', name: 'Meridian', bounds: [40, 300, 140, 380], climate: 'smog, rain off the sea' },
  { id: 'teeth', name: 'the Teeth', bounds: [560, 40, 700, 300], climate: 'mountains, pine, snow' },
  { id: 'ashlands', name: 'the Ashlands', bounds: [560, 300, 700, 500], climate: 'craters, glass, radiation' },
  { id: 'northern_wet', name: 'the Northern Wet', bounds: [80, 0, 560, 160], climate: 'rain, mud, rivers, forest' },
] as RegionDef[]).map((r) => [r.id, r]));
