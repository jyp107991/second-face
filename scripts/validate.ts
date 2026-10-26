import { DIALOGUES, ITEMS, MAPS, NPCS, PERKS, QUESTS, TRAITS } from '../src/content';
import { validateContent } from '../src/engine/data/validate';

const errs = validateContent({ maps: MAPS, items: ITEMS, perks: PERKS, traits: TRAITS, npcs: NPCS, dialogues: DIALOGUES, quests: QUESTS });
if (errs.length) {
  console.error(`Content validation failed (${errs.length}):`);
  for (const e of errs) console.error('  - ' + e);
  process.exit(1);
}
console.log(`Content OK: ${Object.keys(MAPS).length} maps, ${Object.keys(ITEMS).length} items, ${Object.keys(TRAITS).length} traits, ${Object.keys(PERKS).length} perks, ${Object.keys(DIALOGUES).length} dialogues, ${Object.keys(QUESTS).length} quests`);
