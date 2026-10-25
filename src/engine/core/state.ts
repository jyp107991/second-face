/**
 * Serializable game state. Everything the save system writes lives here;
 * runtime objects (meshes, actors) are rebuilt from it.
 */
export interface GameState {
  locationId: string;
  player: { x: number; y: number; facing: number };
  /** Game clock in minutes since day 1, 00:00. */
  minutes: number;
  flags: Record<string, number | string | boolean>;
  rngState: number;
  playtimeSec: number;
}

export const START_MINUTES = 8 * 60; // Day 1, 08:00

export function newGameState(locationId: string, x: number, y: number): GameState {
  return {
    locationId,
    player: { x, y, facing: 0 },
    minutes: START_MINUTES,
    flags: {},
    rngState: (Math.random() * 2 ** 32) >>> 0,
    playtimeSec: 0,
  };
}

export function dayOf(minutes: number): number {
  return Math.floor(minutes / 1440) + 1;
}

export function hourOf(minutes: number): number {
  return (minutes % 1440) / 60;
}

export function clockString(minutes: number): string {
  const h = Math.floor(hourOf(minutes)), m = Math.floor(minutes % 60);
  return `Day ${dayOf(minutes)}  ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
