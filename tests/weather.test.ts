import { describe, expect, it } from 'vitest';
import { MOOD_GRADE, moodSound, skyLook, weatherFor } from '../src/engine/world/weather';

describe('weather', () => {
  it('is fixed per region and day, runs in spells, and is mostly clear in the Sallow', () => {
    expect(weatherFor('sallow', 5, 1)).toBe(weatherFor('sallow', 5, 1));
    const counts: Record<string, number> = {};
    for (let d = 1; d <= 400; d++) counts[weatherFor('sallow', d, 3)] = (counts[weatherFor('sallow', d, 3)] ?? 0) + 1;
    expect(counts.clear).toBeGreaterThan(160);
    expect(counts.storm ?? 0).toBeLessThan(60);
    expect(Object.keys(counts).length).toBeGreaterThanOrEqual(3);
    // Spells: consecutive days repeat more than chance would have them.
    let same = 0;
    for (let d = 1; d < 400; d++) if (weatherFor('sallow', d, 3) === weatherFor('sallow', d + 1, 3)) same++;
    expect(same).toBeGreaterThan(220);
  });

  it('it rains in the Wet and snows in the Teeth, never in the Sallow', () => {
    const tally = (region: string) => { const c: Record<string, number> = {}; for (let d = 1; d <= 400; d++) { const k = weatherFor(region, d, 3); c[k] = (c[k] ?? 0) + 1; } return c; };
    const wet = tally('northern_wet'), teeth = tally('teeth'), sallow = tally('sallow');
    expect(wet.rain ?? 0).toBeGreaterThan(50);
    expect(teeth.snow ?? 0).toBeGreaterThan(25);
    expect(sallow.snow ?? 0).toBe(0);
    expect(sallow.fog ?? 0).toBe(0);
    expect(skyLook('rain', 'peaceful').sun).toBeLessThan(skyLook('clear', 'peaceful').sun);
    expect(skyLook('fog', undefined).clarity).toBeLessThan(skyLook('haze', undefined).clarity);
    expect(moodSound('peaceful', 'rain', 10, 'wind')).toBe('rain');
  });

  it('a clear day is bright and far-seeing; a storm is dim and close; moods shift the grade', () => {
    const clear = skyLook('clear', 'bright'), storm = skyLook('storm', 'grim');
    expect(clear.sun).toBeGreaterThan(storm.sun);
    expect(clear.clarity).toBeGreaterThan(storm.clarity);
    expect(clear.grade).toBeLessThan(storm.grade);
    expect(clear.blue).toBe(1);
    expect(MOOD_GRADE.bright).toBeLessThan(MOOD_GRADE.grim);
  });

  it('sound follows mood by day and weather overrides it', () => {
    expect(moodSound('peaceful', 'clear', 10, 'wind')).toBe('birds');
    expect(moodSound('peaceful', 'clear', 23, 'wind')).toBe('wind');
    expect(moodSound('bustling', 'haze', 12, 'wind')).toBe('murmur');
    expect(moodSound('bustling', 'storm', 12, 'wind')).toBe('wind');
    expect(moodSound(undefined, 'clear', 12, 'camp')).toBe('camp');
  });
});
