/**
 * Save format migrations. Each entry upgrades a raw save object from version N to N+1.
 * NEVER edit a published migration; add a new one and bump CURRENT_SAVE_VERSION.
 */
export const CURRENT_SAVE_VERSION = 3;

type RawSave = { version: number; [k: string]: unknown };

export const MIGRATIONS: Record<number, (s: RawSave) => RawSave> = {
  // 1 → 2: skills consolidated 16 → 12. Bought points move to the skill that absorbed the old one;
  // Gambling (now a minigame) is refunded as unspent points. Tags follow the same mapping.
  1: (s) => {
    const state = structuredClone(s.state) as { pc?: { sheet?: { skillBought: Record<string, number>; tagged: string[]; unspentSkill: number } } };
    const sh = state.pc?.sheet;
    if (sh) {
      const map: Record<string, string> = { heavy: 'firearms', unarmed: 'melee', throwing: 'explosives', sleight: 'stealth', locks: 'security' };
      const next: Record<string, number> = {};
      for (const k of ['firearms', 'arc', 'melee', 'explosives', 'medicine', 'mechanics', 'science', 'security', 'stealth', 'speech', 'barter', 'survival']) next[k] = 0;
      for (const [k, v] of Object.entries(sh.skillBought)) {
        if (k === 'gambling') { sh.unspentSkill += v; continue; }
        const to = map[k] ?? k;
        if (to in next) next[to] += v;
      }
      sh.skillBought = next;
      const tags = [...new Set(sh.tagged.map((t) => map[t] ?? t).filter((t) => t in next))];
      for (const fill of ['speech', 'firearms', 'medicine', 'survival']) if (tags.length < 3 && !tags.includes(fill)) tags.push(fill);
      sh.tagged = tags.slice(0, 3);
    }
    return { ...s, version: 2, state };
  },
  // 2 → 3: narrative world state (quests, memories, relations, reputation, knowledge, timers).
  2: (s) => ({ ...s, version: 3, state: { world: { quests: {}, memories: {}, relations: {}, approval: {}, party: [], reputation: {}, knowledge: {}, seen: {}, decisions: [], timers: [], karma: 0 }, ...(s.state as object) } }),
};

export function migrate(raw: RawSave): RawSave {
  let s = raw;
  if (typeof s.version !== 'number') throw new Error('Save has no version');
  if (s.version > CURRENT_SAVE_VERSION) throw new Error(`Save is from a newer game version (${s.version})`);
  while (s.version < CURRENT_SAVE_VERSION) {
    const step = MIGRATIONS[s.version];
    if (!step) throw new Error(`No migration from save version ${s.version}`);
    s = step(s);
  }
  return s;
}
