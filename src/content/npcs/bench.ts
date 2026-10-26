import type { NpcDef } from '../../engine/npc/defs';
import { OUTFIT_ROLES } from '../../engine/data/outfits';

/** Benchmark crowd: forty generated people across roles and factions. Not part of the story. */
const FACTIONS = [undefined, 'rust_dogs', undefined, 'shale_militia', undefined, 'choir', undefined, 'tollmen'];
export const BENCH_NPCS: NpcDef[] = Array.from({ length: 40 }, (_, i) => ({
  id: `bench_${String(i + 1).padStart(2, '0')}`, name: `Passer-by ${i + 1}`,
  look: { seed: 9000 + i * 7 }, role: OUTFIT_ROLES[i % OUTFIT_ROLES.length], faction: FACTIONS[i % FACTIONS.length],
  level: 1, team: 'neutral', courage: 50, barks: ['Mind yourself.', 'Dust\'s up.'],
}));
