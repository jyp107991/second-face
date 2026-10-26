/**
 * Player settings (DESIGN §2h): persisted in localStorage, applied to the document and read by systems.
 * Keys are remappable by action; systems ask `keyAction(code)` instead of hard-coding key codes.
 */

export type Difficulty = 'story' | 'normal' | 'hard';
export type KeyAction = 'notebook' | 'journal' | 'leads' | 'people' | 'self' | 'run' | 'rotateL' | 'rotateR' | 'centre' | 'endTurn' | 'quicksave' | 'quickload' | 'undo' | 'camp';

export interface Settings {
  textScale: number;
  highContrast: boolean;
  combatSpeed: number;
  difficulty: Difficulty;
  /** Offer a Skip button through conversation lines already heard. */
  skipSeen: boolean;
  tips: boolean;
  keys: Record<KeyAction, string>;
}

export const DEFAULT_KEYS: Record<KeyAction, string> = {
  notebook: 'Tab', journal: 'KeyJ', leads: 'KeyL', people: 'KeyP', self: 'KeyC', run: 'KeyR', rotateL: 'KeyQ', rotateR: 'KeyE',
  centre: 'Space', endTurn: 'KeyT', quicksave: 'F5', quickload: 'F9', undo: 'KeyZ', camp: 'KeyK',
};

export const KEY_ACTION_NAMES: Record<KeyAction, string> = {
  notebook: 'Open notebook', journal: 'Journal', leads: 'Leads', people: 'People', self: 'Self', run: 'Toggle run', rotateL: 'Rotate left',
  rotateR: 'Rotate right', centre: 'Centre camera', endTurn: 'End turn', quicksave: 'Quick save', quickload: 'Quick load', undo: 'Undo last move', camp: 'Make camp',
};

const DEFAULTS: Settings = { textScale: 1, highContrast: false, combatSpeed: 1, difficulty: 'normal', skipSeen: true, tips: true, keys: { ...DEFAULT_KEYS } };

let current: Settings = load();

function load(): Settings {
  try {
    const raw = localStorage.getItem('sf.settings');
    if (raw) { const s = JSON.parse(raw) as Partial<Settings>; return { ...DEFAULTS, ...s, keys: { ...DEFAULT_KEYS, ...(s.keys ?? {}) } }; }
  } catch { /* fresh */ }
  return { ...DEFAULTS, keys: { ...DEFAULT_KEYS } };
}

export function settings(): Settings { return current; }

export function updateSettings(patch: Partial<Settings>): Settings {
  current = { ...current, ...patch, keys: { ...current.keys, ...(patch.keys ?? {}) } };
  try { localStorage.setItem('sf.settings', JSON.stringify(current)); } catch { /* private mode */ }
  applySettings();
  return current;
}

/** Push presentation settings into the document. */
export function applySettings(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty('--ui-scale', String(current.textScale));
  document.body?.classList.toggle('hc', current.highContrast);
}

/** The action bound to a key code, if any. */
export function keyAction(code: string): KeyAction | undefined {
  for (const [a, c] of Object.entries(current.keys) as [KeyAction, string][]) if (c === code) return a;
  return undefined;
}

/** Human label for a key code. */
export function keyLabel(code: string): string {
  return code.replace(/^Key/, '').replace(/^Digit/, '').replace('Arrow', '');
}

/** Enemy hit and damage modifiers by difficulty (scarcity and checks are never touched). */
export function difficultyMods(d: Difficulty = current.difficulty): { hitMod: number; dmgMul: number } {
  return d === 'story' ? { hitMod: -15, dmgMul: 0.6 } : d === 'hard' ? { hitMod: 8, dmgMul: 1.25 } : { hitMod: 0, dmgMul: 1 };
}

const TIP_KEY = 'sf.tips';
/** One-time tips; returns the text to show, or undefined if already shown / disabled. */
export function tipOnce(id: string, text: string): string | undefined {
  if (!current.tips) return undefined;
  try {
    const seen: string[] = JSON.parse(localStorage.getItem(TIP_KEY) ?? '[]');
    if (seen.includes(id)) return undefined;
    seen.push(id);
    localStorage.setItem(TIP_KEY, JSON.stringify(seen));
  } catch { /* ignore */ }
  return `Tip: ${text}`;
}
