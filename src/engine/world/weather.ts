/**
 * Weather: one kind per region per day, fixed by the day (so a save reloads to the same sky) and by the region's
 * climate. Most days in the Sallow are clear and hard-lit; haze, dust and the odd storm are events, not the default.
 * Maps carry a mood on top (bright, peaceful, bustling, haze, grim) that sets the grade and the sound bed.
 */

export type WeatherKind = 'clear' | 'haze' | 'dust' | 'storm';
export type Mood = 'bright' | 'peaceful' | 'bustling' | 'haze' | 'grim';

/** Per-region odds, in order: clear, haze, dust, storm. */
const CLIMATE: Record<string, [number, number, number, number]> = {
  sallow: [0.56, 0.24, 0.15, 0.05],
  glass_flats: [0.6, 0.2, 0.15, 0.05],
  rail_corridor: [0.5, 0.3, 0.12, 0.08],
  drowned_shore: [0.35, 0.45, 0.05, 0.15],
  meridian: [0.45, 0.4, 0.05, 0.1],
  teeth: [0.4, 0.35, 0.1, 0.15],
  ashlands: [0.3, 0.3, 0.3, 0.1],
  northern_wet: [0.3, 0.45, 0.05, 0.2],
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}

/** The weather in a region on a given day (deterministic per game seed). */
export function weatherFor(region: string, day: number, seed = 0): WeatherKind {
  const odds = CLIMATE[region] ?? CLIMATE.sallow;
  // Weather runs in spells: the roll is shared across two to three days.
  const spell = Math.floor((day + hash(`${region}/${seed}/spell`) * 3) / 2.5);
  let r = hash(`${region}/${seed}/${spell}`);
  const kinds: WeatherKind[] = ['clear', 'haze', 'dust', 'storm'];
  for (let i = 0; i < 4; i++) { r -= odds[i]; if (r <= 0) return kinds[i]; }
  return 'clear';
}

export interface SkyLook {
  /** Sun strength multiplier. */
  sun: number;
  /** Fog distance multiplier (>1 = clearer). */
  clarity: number;
  /** Dust particle multiplier. */
  dust: number;
  /** Added to the colour grade (sepia wash), can be negative. */
  grade: number;
  /** How blue the sky light goes at midday (0 none .. 1 full clear-sky blue). */
  blue: number;
  /** Fog colour brightness multiplier (a grim place has darker, closer air; a bright one pale distance). */
  fogMul: number;
  /** How far the fog colour is pulled toward a cold grey (0 none .. 1 fully grey). */
  fogCool: number;
  /** Post exposure multiplier and the sepia tint the grade pulls toward. */
  exposure: number;
  tint: [number, number, number];
}

/** How a weather kind and a mood change the light. */
export function skyLook(weather: WeatherKind, mood: Mood | undefined): SkyLook {
  const table: Record<WeatherKind, Pick<SkyLook, 'sun' | 'clarity' | 'dust' | 'grade' | 'blue'>> = {
    clear: { sun: 1.15, clarity: 1.9, dust: 0.35, grade: -0.12, blue: 1 },
    haze: { sun: 0.92, clarity: 0.95, dust: 0.7, grade: 0.03, blue: 0.45 },
    dust: { sun: 0.65, clarity: 0.45, dust: 2.2, grade: 0.2, blue: 0 },
    storm: { sun: 0.4, clarity: 0.3, dust: 3.2, grade: 0.3, blue: 0 },
  };
  const w = table[weather];
  const m: Record<Mood, Partial<SkyLook>> = {
    bright: { grade: -0.1, clarity: 1.2, exposure: 1.08, tint: [1.0, 1.0, 0.97], fogMul: 1.04 },
    peaceful: { grade: -0.05, exposure: 1.02, tint: [1.03, 0.99, 0.92] },
    bustling: { grade: -0.05, exposure: 1.0 },
    haze: { grade: 0.05, clarity: 0.8, exposure: 0.95, fogMul: 0.92, fogCool: 0.15 },
    grim: { grade: 0.12, clarity: 0.9, exposure: 0.86, tint: [0.96, 0.95, 0.9], fogMul: 0.78, fogCool: 0.45 },
  };
  const mm = mood ? m[mood] : {};
  // Dust and storm darken the air whatever the mood.
  const wFog = weather === 'storm' ? 0.78 : weather === 'dust' ? 0.9 : 1;
  return {
    sun: w.sun, clarity: w.clarity * (mm.clarity ?? 1), dust: w.dust, grade: w.grade + (mm.grade ?? 0), blue: w.blue,
    fogMul: (mm.fogMul ?? 1) * wFog, fogCool: mm.fogCool ?? 0, exposure: mm.exposure ?? 1, tint: mm.tint ?? [1.03, 0.99, 0.93],
  };
}

/** The base grade (sepia wash) a mood asks for when the map does not set one. */
export const MOOD_GRADE: Record<Mood, number> = { bright: 0.12, peaceful: 0.18, bustling: 0.22, haze: 0.36, grim: 0.52 };

/** The sound bed a mood wants at an hour, given the weather. */
export function moodSound(mood: Mood | undefined, weather: WeatherKind, hour: number, fallback: string | undefined): string | undefined {
  if (weather === 'storm' || weather === 'dust') return 'wind';
  const day = hour >= 6 && hour < 20;
  if (mood === 'peaceful' && day) return 'birds';
  if (mood === 'bustling' && hour >= 7 && hour < 21) return 'murmur';
  return fallback;
}
