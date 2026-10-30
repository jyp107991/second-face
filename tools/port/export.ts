// Export every content registry to JSON for the Unity port (unity/Assets/StreamingAssets/content/).
// Content stays authored in TypeScript (src/content); run `npm run export` after `npm run check`.
import fs from 'node:fs';
import path from 'node:path';
import { CHROME, CONCLUSIONS, DIALOGUES, FACTIONS, ITEMS, LEADS, LETTERS, MAPS, NPCS, ORIGINS, PERKS, QUESTS, REGIONS, ROAD_ENCOUNTERS, SETTLEMENTS, TRAITS, WORLD_EVENTS, WORLD_MAP } from '../../src/content';
import { ACT_LEVEL, REFERENCE_BUILDS } from '../../src/content/rules/builds';
import { garmentsInWorld } from '../../src/engine/data/garments';
import { ROLES, FACTION_LOOK } from '../../src/engine/data/outfits';
import { SITES } from '../../src/content/world/sites';

const OUT = path.resolve(process.argv[2] ?? 'unity/Assets/StreamingAssets/content');
fs.mkdirSync(OUT, { recursive: true });

/** JSON with a check that nothing non-serialisable slipped in (functions, undefined in arrays, NaN). */
function dump(name: string, value: unknown): void {
  const problems: string[] = [];
  const seen = new WeakSet<object>();
  const walk = (v: unknown, at: string): void => {
    if (v === null || v === undefined) return;
    const t = typeof v;
    if (t === 'function') { problems.push(`${at}: function`); return; }
    if (t === 'number' && !Number.isFinite(v as number)) { problems.push(`${at}: ${v}`); return; }
    if (t !== 'object') return;
    if (seen.has(v as object)) return;
    seen.add(v as object);
    if (v instanceof Map || v instanceof Set) { problems.push(`${at}: ${v.constructor.name}`); return; }
    if (Array.isArray(v)) { v.forEach((e, i) => { if (e === undefined) problems.push(`${at}[${i}]: undefined`); walk(e, `${at}[${i}]`); }); return; }
    for (const [k, e] of Object.entries(v as Record<string, unknown>)) walk(e, `${at}.${k}`);
  };
  walk(value, name);
  if (problems.length) { console.error(`${name}: ${problems.length} problems`); for (const p of problems.slice(0, 20)) console.error('  ' + p); process.exitCode = 1; }
  const text = JSON.stringify(value);
  fs.writeFileSync(path.join(OUT, `${name}.json`), text);
  console.log(`${name}.json ${(text.length / 1024).toFixed(0)} KB`);
}

dump('maps', MAPS);
dump('npcs', NPCS);
dump('dialogues', DIALOGUES);
dump('quests', QUESTS);
dump('items', ITEMS);
dump('perks', PERKS);
dump('traits', TRAITS);
dump('origins', ORIGINS);
dump('chrome', CHROME);
dump('leads', LEADS);
dump('conclusions', CONCLUSIONS);
dump('settlements', SETTLEMENTS);
dump('regions', REGIONS);
dump('world_map', WORLD_MAP);
dump('world_events', WORLD_EVENTS);
dump('road_encounters', ROAD_ENCOUNTERS);
dump('factions', FACTIONS);
dump('letters', LETTERS);
dump('sites', SITES);
dump('garments', garmentsInWorld());   // retired pieces stay with the frozen web game
dump('outfits', { roles: ROLES, factions: FACTION_LOOK });
dump('builds', { actLevel: ACT_LEVEL, reference: REFERENCE_BUILDS });
