import type { GameState } from '../core/state';
import { dayOf } from '../core/state';
import { apply, test, type Cond, type Effect, type LogicHost } from './logic';

/**
 * Letters (DESIGN §2b): write to someone you have met; caravans carry it; a reply comes back days later
 * with news, help, guilt or consequences. Letters are authored content (a recipient, a topic, conditions,
 * the reply); the engine only schedules the round trip.
 */

export interface LetterDef {
  id: string;
  /** Recipient NPC id (must have been met). */
  to: string;
  /** Short label shown when choosing what to write. */
  topic: string;
  if?: Cond;
  /** What you write (kept in the notebook). */
  text: string;
  /** Round-trip days until the reply arrives. */
  days: number;
  /** Applied when the letter is sent (e.g. memory, trust). */
  effects?: Effect[];
  reply?: { text: string; effects?: Effect[] };
  /** Write it only once. */
  once?: boolean;
}

export interface SentLetter { id: string; to: string; day: number; arrives: number }
export interface Post { from: string; text: string; day: number; read?: boolean }

/** Letters the player could write right now to people they have met. */
export function availableLetters(g: GameState, defs: Record<string, LetterDef>): LetterDef[] {
  const sent = new Set((g.world.letters ?? []).map((l) => l.id));
  return Object.values(defs).filter((d) => g.world.met?.[d.to] && !(d.once && sent.has(d.id)) && test(d.if, g));
}

/** Send a letter: apply its effects and schedule the reply as a timer. */
export function sendLetter(g: GameState, def: LetterDef, host: LogicHost = {}): SentLetter {
  const day = dayOf(g.minutes);
  const letter: SentLetter = { id: def.id, to: def.to, day, arrives: day + def.days };
  (g.world.letters ??= []).push(letter);
  apply(def.effects, g, host);
  if (def.reply) {
    const effects: Effect[] = [{ post: { from: def.to, text: def.reply.text } }, ...(def.reply.effects ?? [])];
    apply([{ after: { minutes: def.days * 1440, id: `letter_${def.id}`, effects } }], g, host);
  }
  return letter;
}

export function unreadPost(g: GameState): number {
  return (g.world.post ?? []).filter((p) => !p.read).length;
}
