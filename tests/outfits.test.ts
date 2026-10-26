import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GARMENTS } from '../src/engine/data/garments';
import { dressFor, OUTFIT_ROLES, outfitHairMode } from '../src/engine/data/outfits';

describe('outfits', () => {
  it('dresses every role and fit completely from catalogued garments', () => {
    for (const role of OUTFIT_ROLES) for (const fit of ['m', 'f'] as const) for (let seed = 1; seed <= 40; seed++) {
      const o = dressFor(seed, role, fit);
      const slots = o.layers!.map((g) => GARMENTS[g.name]?.slot);
      expect(slots, `${role}/${fit}/${seed}`).not.toContain(undefined);
      expect(slots).toContain('feet');
      expect(slots.includes('full') || (slots.includes('top') && slots.includes('legs')), `${role}/${fit}/${seed} ${slots}`).toBe(true);
      for (const g of o.layers!) expect(['u', fit]).toContain(GARMENTS[g.name].fit);
      expect(new Set(slots).size).toBe(slots.length);
    }
  });

  it('is deterministic per seed and varies across seeds', () => {
    expect(dressFor(7, 'raider', 'm')).toEqual(dressFor(7, 'raider', 'm'));
    const looks = new Set(Array.from({ length: 30 }, (_, i) => JSON.stringify(dressFor(i, 'settler', 'f').layers)));
    expect(looks.size).toBeGreaterThan(25);
  });

  it('gilded people are clean; drifters are filthy', () => {
    for (let s = 0; s < 20; s++) {
      expect(dressFor(s, 'gilded', 'f').grime).toBe(0);
      expect(dressFor(s, 'drifter', 'm').grime).toBeGreaterThan(0.6);
    }
  });

  it('helmets hide hair, caps crop it', () => {
    expect(outfitHairMode({ layers: [{ name: 'culturalibre_skull_helmet' }] })).toBe('hide');
    expect(outfitHairMode({ layers: [{ name: 'jujube_newsboy_cap' }, { name: 'cortu_cargo_pants' }] })).toBe('crop');
    expect(outfitHairMode({ layers: [{ name: 'cortu_cargo_pants' }] })).toBeUndefined();
  });

  it('catalogue matches the built garment assets', () => {
    const m = JSON.parse(readFileSync('public/assets/human/human.json', 'utf8')) as { proxies: Record<string, { file?: string }> };
    const built = Object.keys(m.proxies).filter((k) => m.proxies[k].file).map((k) => k.replace(/^clothes_/, ''));
    expect(Object.keys(GARMENTS).sort()).toEqual(built.sort());
  });
});
