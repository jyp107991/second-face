/**
 * NPC daily schedules (DESIGN §7.3): time-of-day entries naming a spot on the map and an activity.
 * 'away' takes the NPC off the map (at home, out of town). Pure lookup; the Game walks actors there.
 */
export type Activity = 'sleep' | 'work' | 'idle' | 'drink' | 'patrol' | 'pray' | 'trade' | 'away';

export interface ScheduleEntry {
  /** Hours 0–24; `from` > `to` wraps past midnight. */
  from: number;
  to: number;
  /** Named spot on the map (MapDef.spots) or an explicit tile. */
  spot?: string;
  at?: { x: number; y: number };
  activity: Activity;
}

export function inHours(e: { from: number; to: number }, hour: number): boolean {
  return e.from <= e.to ? hour >= e.from && hour < e.to : hour >= e.from || hour < e.to;
}

/** The entry in force at `hour`, or undefined (the NPC stays where placed). */
export function scheduleAt(entries: ScheduleEntry[] | undefined, hour: number): ScheduleEntry | undefined {
  return entries?.find((e) => inHours(e, hour));
}

/** Resolve an entry's tile against the map's spots. */
export function scheduleTile(e: ScheduleEntry, spots: Record<string, { x: number; y: number }> | undefined): { x: number; y: number } | undefined {
  return e.at ?? (e.spot ? spots?.[e.spot] : undefined);
}
