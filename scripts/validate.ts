import { ITEMS, MAPS, PERKS, TRAITS } from '../src/content';
import { validateContent } from '../src/engine/data/validate';

const errs = validateContent({ maps: MAPS, items: ITEMS, perks: PERKS, traits: TRAITS });
if (errs.length) {
  console.error(`Content validation failed (${errs.length}):`);
  for (const e of errs) console.error('  - ' + e);
  process.exit(1);
}
console.log(`Content OK: ${Object.keys(MAPS).length} maps, ${Object.keys(ITEMS).length} items, ${Object.keys(TRAITS).length} traits, ${Object.keys(PERKS).length} perks`);
