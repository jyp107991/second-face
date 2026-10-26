import type { MapDef } from '../../engine/data/types';
import { BENCH_NPCS } from '../npcs/bench';

/** Performance benchmark: an open market square with forty people. Not part of the story. */
const W = 44, H = 34;
const rows: string[] = [];
for (let y = 0; y < H; y++) {
  let r = '';
  for (let x = 0; x < W; x++) {
    const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1;
    const stall = (x % 11 === 5 && y % 9 === 4) || (x % 11 === 6 && y % 9 === 4);
    r += edge ? 'r' : stall ? 'S' : ((x * 7 + y * 3) % 13 === 0 ? ',' : '.');
  }
  rows.push(r);
}

export const bench_crowd: MapDef = {
  id: 'bench_crowd', name: 'Bench: Market Crowd', seed: 11,
  layout: rows,
  legend: { '.': { floor: 'sand' }, ',': { floor: 'dirt' }, r: { wall: 'rock', floor: 'sand' }, S: { wall: 'scrap', floor: 'dirt', wallHeight: 2.2 } },
  props: Array.from({ length: 12 }, (_, i) => ({ kind: (['crate', 'barrel_rust', 'tire_pile', 'fire_barrel'] as const)[i % 4], x: 3 + (i % 6) * 7, y: 30 - Math.floor(i / 6) * 2 })),
  lights: [{ x: 10, y: 10, color: 0xffb070, intensity: 1.2, range: 9, flicker: 0.3 }, { x: 30, y: 20, color: 0xffb070, intensity: 1.2, range: 9, flicker: 0.3 }],
  spawns: [{ id: 'start', x: 22, y: 17 }],
  ambience: { indoor: false, fogColor: 0xc9a97a, fogDensity: 0.015, dust: 0.6, grade: 0.4, sound: 'wind' },
  npcs: BENCH_NPCS.map((n, i) => ({ def: n.id, x: 3 + (i % 8) * 5, y: 3 + Math.floor(i / 8) * 6, facing: (i % 4) * 1.57 })),
};
