import { CHROME, FACTIONS, LETTERS, REGIONS, WORLD_MAP, CONCLUSIONS, DIALOGUES, ITEMS, LEADS, MAPS, NPCS, PERKS, QUESTS, SETTLEMENTS, TRAITS } from '../src/content';
import { validateContent } from '../src/engine/data/validate';
import { checkCoverage } from '../src/engine/data/coverage';
import { ACT_LEVEL, REFERENCE_BUILDS } from '../src/content/rules/builds';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/** Empty .meta files under the Unity project (a write cut short by a full disk): Unity ignores the asset beside each one, so
 * a garment or texture silently drops out of the game (P4.15b pitfall). */
function emptyMetas(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...emptyMetas(p));
    else if (name.endsWith('.meta') && st.size === 0) out.push(`empty Unity meta file (asset ignored): ${p}`);
  }
  return out;
}

const errs = [
  ...validateContent({ maps: MAPS, items: ITEMS, perks: PERKS, traits: TRAITS, npcs: NPCS, dialogues: DIALOGUES, quests: QUESTS, leads: LEADS, conclusions: CONCLUSIONS, settlements: SETTLEMENTS, chrome: CHROME, regions: REGIONS, worldMap: WORLD_MAP, factions: FACTIONS, letters: LETTERS }),
  ...checkCoverage(QUESTS, REFERENCE_BUILDS, ACT_LEVEL),
  ...emptyMetas('unity/Assets'),
];
if (errs.length) {
  console.error(`Content validation failed (${errs.length}):`);
  for (const e of errs) console.error('  - ' + e);
  process.exit(1);
}
console.log(`Content OK: ${Object.keys(MAPS).length} maps, ${Object.keys(ITEMS).length} items, ${Object.keys(TRAITS).length} traits, ${Object.keys(PERKS).length} perks, ${Object.keys(DIALOGUES).length} dialogues, ${Object.keys(QUESTS).length} quests`);
