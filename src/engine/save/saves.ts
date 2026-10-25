import type { GameState } from '../core/state';
import { CURRENT_SAVE_VERSION, migrate } from './migrations';
import type { SaveBackend } from './storage';

export const SLOTS = ['auto', 'quick', 'slot1', 'slot2', 'slot3'] as const;
export type SlotId = (typeof SLOTS)[number];

export interface SaveMeta {
  slot: SlotId;
  label: string;
  locationId: string;
  locationName: string;
  minutes: number;
  playtimeSec: number;
  timestamp: number;
  /** Small JPEG data URL of the scene at save time. */
  thumb?: string;
}

export interface SaveFile {
  version: number;
  meta: SaveMeta;
  state: GameState;
}

/** Save slots on top of a storage backend; handles versioning and import/export. */
export class SaveManager {
  constructor(private backend: SaveBackend) {}

  async write(slot: SlotId, meta: Omit<SaveMeta, 'slot' | 'timestamp'>, state: GameState): Promise<SaveFile> {
    const file: SaveFile = { version: CURRENT_SAVE_VERSION, meta: { ...meta, slot, timestamp: Date.now() }, state: structuredClone(state) };
    await this.backend.set(slot, JSON.stringify(file));
    return file;
  }

  async read(slot: SlotId): Promise<SaveFile | undefined> {
    const raw = await this.backend.get(slot);
    return raw ? parseSave(raw) : undefined;
  }

  async list(): Promise<Partial<Record<SlotId, SaveMeta>>> {
    const out: Partial<Record<SlotId, SaveMeta>> = {};
    for (const slot of SLOTS) {
      try {
        const f = await this.read(slot);
        if (f) out[slot] = f.meta;
      } catch { /* corrupt slot: show as empty */ }
    }
    return out;
  }

  async remove(slot: SlotId): Promise<void> {
    await this.backend.remove(slot);
  }

  async latest(): Promise<SaveMeta | undefined> {
    const all = Object.values(await this.list());
    return all.sort((a, b) => b.timestamp - a.timestamp)[0];
  }
}

/** Parse + migrate + sanity-check a serialized save. Throws with a readable message on failure. */
export function parseSave(raw: string): SaveFile {
  let obj: unknown;
  try { obj = JSON.parse(raw); } catch { throw new Error('Save file is not valid JSON'); }
  if (!obj || typeof obj !== 'object') throw new Error('Save file is empty');
  const f = migrate(obj as { version: number }) as unknown as SaveFile;
  if (!f.state || typeof f.state.locationId !== 'string' || !f.state.player) throw new Error('Save file is missing game state');
  if (!f.meta) throw new Error('Save file is missing metadata');
  return f;
}

export function exportSave(file: SaveFile): void {
  const blob = new Blob([JSON.stringify(file)], { type: 'application/json' });
  const a = document.createElement('a');
  const d = new Date(file.meta.timestamp);
  a.href = URL.createObjectURL(blob);
  a.download = `second-face-${d.toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function pickSaveFile(): Promise<SaveFile> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error('No file chosen'));
      try { resolve(parseSave(await file.text())); } catch (e) { reject(e); }
    };
    input.click();
  });
}
