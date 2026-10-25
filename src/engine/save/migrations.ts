/**
 * Save format migrations. Each entry upgrades a raw save object from version N to N+1.
 * NEVER edit a published migration; add a new one and bump CURRENT_SAVE_VERSION.
 */
export const CURRENT_SAVE_VERSION = 1;

type RawSave = { version: number; [k: string]: unknown };

export const MIGRATIONS: Record<number, (s: RawSave) => RawSave> = {
  // 1 → 2 example (when needed):
  // 1: (s) => ({ ...s, version: 2, state: { ...(s.state as object), newField: 0 } }),
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
