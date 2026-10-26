import { CHROME, REGIONS, CONCLUSIONS, DIALOGUES, ITEMS, LEADS, MAPS, NPCS, PERKS, QUESTS, SETTLEMENTS, TRAITS } from '../src/content';
import { validateContent } from '../src/engine/data/validate';
import { checkCoverage } from '../src/engine/data/coverage';
import { ACT_LEVEL, REFERENCE_BUILDS } from '../src/content/rules/builds';

const errs = [
  ...validateContent({ maps: MAPS, items: ITEMS, perks: PERKS, traits: TRAITS, npcs: NPCS, dialogues: DIALOGUES, quests: QUESTS, leads: LEADS, conclusions: CONCLUSIONS, settlements: SETTLEMENTS, chrome: CHROME, regions: REGIONS }),
  ...checkCoverage(QUESTS, REFERENCE_BUILDS, ACT_LEVEL),
];
if (errs.length) {
  console.error(`Content validation failed (${errs.length}):`);
  for (const e of errs) console.error('  - ' + e);
  process.exit(1);
}
console.log(`Content OK: ${Object.keys(MAPS).length} maps, ${Object.keys(ITEMS).length} items, ${Object.keys(TRAITS).length} traits, ${Object.keys(PERKS).length} perks, ${Object.keys(DIALOGUES).length} dialogues, ${Object.keys(QUESTS).length} quests`);
