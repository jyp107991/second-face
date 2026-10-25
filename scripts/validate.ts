import { MAPS } from '../src/content';
import { validateContent } from '../src/engine/data/validate';

const errs = validateContent({ maps: MAPS });
if (errs.length) {
  console.error(`Content validation failed (${errs.length}):`);
  for (const e of errs) console.error('  - ' + e);
  process.exit(1);
}
console.log(`Content OK: ${Object.keys(MAPS).length} maps`);
