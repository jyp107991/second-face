import type { Rng } from '../core/rng';

/**
 * Dust — the frontier's dice game (DESIGN §2f). On your turn you roll a six-sided die as often as you
 * like, adding to a run; a 1 "dusts" the run (you lose it and the turn). Bank to keep the run. First to
 * the target at the end of a round wins the pot. Push-your-luck with a readable edge: the opponent's risk
 * appetite comes from their personality.
 */

export interface DustPlayer { name: string; score: number; /** Bank when the run reaches this (AI). */ nerve: number }

export interface DustState {
  players: [DustPlayer, DustPlayer];
  turn: 0 | 1;
  run: number;
  rolls: number[];
  target: number;
  stake: number;
  round: number;
  /** Set when the game is decided. */
  winner?: 0 | 1;
  log: string[];
}

export function newDust(you: string, them: string, theirNerve: number, stake: number, target = 30): DustState {
  return { players: [{ name: you, score: 0, nerve: 0 }, { name: them, score: 0, nerve: theirNerve }], turn: 0, run: 0, rolls: [], target, stake, round: 1, log: [`${them} puts ${stake} Tolls in the dust. So do you.`] };
}

/** Roll once. A 1 dusts the run and ends the turn. Returns the face. */
export function roll(s: DustState, rng: Rng): number {
  if (s.winner !== undefined) return 0;
  const face = rng.int(1, 6);
  const p = s.players[s.turn];
  s.rolls.push(face);
  if (face === 1) {
    s.log.push(`${p.name} rolls a 1 — dusted. ${s.run} lost.`);
    s.run = 0;
    endTurn(s);
  } else {
    s.run += face;
  }
  return face;
}

/** Bank the run and pass the turn. */
export function bank(s: DustState): void {
  if (s.winner !== undefined) return;
  const p = s.players[s.turn];
  p.score += s.run;
  s.log.push(`${p.name} banks ${s.run} (${p.score}).`);
  s.run = 0;
  endTurn(s);
}

function endTurn(s: DustState): void {
  s.rolls = [];
  if (s.turn === 1) {
    // End of a round: decide if someone has crossed the target.
    const [a, b] = s.players;
    if (a.score >= s.target || b.score >= s.target) {
      if (a.score !== b.score) {
        s.winner = a.score > b.score ? 0 : 1;
        s.log.push(`${s.players[s.winner].name} takes the pot: ${s.stake * 2} Tolls.`);
        return;
      }
      s.log.push('Level. Another round.');
    }
    s.round++;
  }
  s.turn = s.turn === 0 ? 1 : 0;
}

/** One decision of the opponent's turn: bank if nerve (or the win) says so, else roll. Returns what it did. */
export function aiStep(s: DustState, rng: Rng): 'bank' | 'roll' | 'none' {
  if (s.turn !== 1 || s.winner !== undefined) return 'none';
  const me = s.players[1], you = s.players[0];
  const wouldWin = me.score + s.run >= s.target && me.score + s.run > you.score;
  // Chase harder when behind at the end; stop when banking is enough.
  const need = you.score >= s.target ? you.score - me.score + 1 : 0;
  if (wouldWin || (s.run >= me.nerve && s.run >= need)) { bank(s); return 'bank'; }
  roll(s, rng);
  return 'roll';
}

/** The opponent's whole turn. */
export function aiTurn(s: DustState, rng: Rng): void {
  for (let guard = 0; guard < 40 && aiStep(s, rng) !== 'none'; guard++) { /* step */ }
}

/** Nerve from a personality: brave and greedy people push further (8–16). */
export function nerveFor(courage = 50, greed = 50): number {
  return Math.round(8 + (courage / 100) * 5 + (greed / 100) * 3);
}
