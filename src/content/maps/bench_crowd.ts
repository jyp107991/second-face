import type { MapDef } from '../../engine/data/types';

/**
 * Performance benchmark and the crowd test: a market square with forty-odd people. Stalls round a well, a fire, a
 * queue at the water, vendors behind counters, sitters on crates, pairs talking, children, and people drifting
 * between it all. Not part of the story.
 */
const W = 44, H = 34;
const rows: string[] = [];
for (let y = 0; y < H; y++) {
  let r = '';
  for (let x = 0; x < W; x++) {
    const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1;
    const lane = (y >= 15 && y <= 18) || (x >= 20 && x <= 23);
    const house = (x >= 2 && x <= 8 && y >= 2 && y <= 7) || (x >= 35 && x <= 41 && y >= 26 && y <= 31);
    const houseWall = house && (x === 2 || x === 8 || y === 2 || y === 7 || x === 35 || x === 41 || y === 26 || y === 31);
    r += edge ? 'r' : houseWall ? 'A' : house ? 'w' : lane ? ',' : ((x * 7 + y * 3) % 11 === 0 ? ',' : '.');
  }
  rows.push(r);
}

const stalls: { x: number; y: number; dir: 'n' | 's' | 'e' | 'w' }[] = [
  { x: 10, y: 10, dir: 's' }, { x: 29, y: 10, dir: 's' }, { x: 10, y: 24, dir: 'n' }, { x: 29, y: 24, dir: 'n' }, { x: 6, y: 17, dir: 'e' }, { x: 36, y: 17, dir: 'w' },
];
const props: MapDef['props'] = [];
const spots: Record<string, { x: number; y: number }> = {};
stalls.forEach((s, i) => {
  // Three counter sections, a tent behind, goods beside, the vendor's spot behind the middle counter.
  const horiz = s.dir === 'n' || s.dir === 's';
  for (let k = -1; k <= 1; k++) props.push({ kind: 'counter', x: s.x + (horiz ? k : 0), y: s.y + (horiz ? 0 : k), rot: horiz ? 0 : 1 });
  const back = s.dir === 's' ? -1 : s.dir === 'n' ? 1 : 0, backX = s.dir === 'e' ? -1 : s.dir === 'w' ? 1 : 0;
  props.push({ kind: 'tent', x: s.x + backX * 2, y: s.y + back * 2, rot: horiz ? 0 : 1 });
  props.push({ kind: 'crate', x: s.x + (horiz ? 2 : backX), y: s.y + (horiz ? back : 2) });
  props.push({ kind: 'barrel', x: s.x + (horiz ? -2 : backX), y: s.y + (horiz ? back : -2) });
  spots[`stall_${i}_work`] = { x: s.x + backX, y: s.y + back };
});
props.push(
  { kind: 'tank', x: 21, y: 16, id: 'well' }, { kind: 'barrel', x: 23, y: 17 }, { kind: 'fire_barrel', x: 18, y: 21 }, { kind: 'lamp_post', x: 14, y: 14 }, { kind: 'lamp_post', x: 30, y: 20 },
  { kind: 'crate', x: 16, y: 27, id: 'sit_a' }, { kind: 'crate', x: 27, y: 6, id: 'sit_b' }, { kind: 'sandbags', x: 34, y: 8 }, { kind: 'tire_pile', x: 5, y: 29 }, { kind: 'debris', x: 25, y: 29 },
  { kind: 'cot', x: 4, y: 4, rot: 1 }, { kind: 'table', x: 6, y: 5 }, { kind: 'shelf', x: 37, y: 28, rot: 1 }, { kind: 'table', x: 39, y: 29 },
  { kind: 'planter', x: 12, y: 30 }, { kind: 'planter', x: 14, y: 30 }, { kind: 'sign', x: 20, y: 12, rot: 0 },
);
Object.assign(spots, {
  sit_a_sit: { x: 17, y: 27 }, sit_b_sit: { x: 28, y: 6 }, sit_c_sit: { x: 24, y: 30 },
  lean_a_lean: { x: 9, y: 4 }, lean_b_lean: { x: 34, y: 27 },
  talk_1_pair_a: { x: 25, y: 13 }, talk_1_pair_b: { x: 26, y: 13 }, talk_2_pair_a: { x: 13, y: 20 }, talk_2_pair_b: { x: 13, y: 21 }, talk_3_pair_a: { x: 32, y: 22 }, talk_3_pair_b: { x: 33, y: 22 },
  queue_a: { x: 20, y: 18 }, queue_b: { x: 19, y: 19 }, queue_c: { x: 18, y: 19 },
});

export const bench_crowd: MapDef = {
  id: 'bench_crowd', name: 'Bench: Market Crowd', seed: 11,
  layout: rows,
  legend: {
    '.': { floor: 'sand' }, ',': { floor: 'dirt' }, w: { floor: 'wood' }, r: { wall: 'rock', floor: 'sand' },
    A: { wall: 'brick', floor: 'wood', wallHeight: 2.6 },
  },
  props,
  lights: [{ x: 18, y: 21, height: 0.8, color: 0xffb070, intensity: 1.6, range: 7, flicker: 0.3 }, { x: 14, y: 14, height: 3, color: 0xffd8a0, intensity: 1.2, range: 7, flicker: 0.1 }, { x: 30, y: 20, height: 3, color: 0xffd8a0, intensity: 1.2, range: 7, flicker: 0.1 }],
  spawns: [{ id: 'start', x: 22, y: 20 }],
  spots,
  ambience: { indoor: false, fogColor: 0xc9b08a, fogDensity: 0.012, dust: 0.4, grade: 0.4, sound: 'wind' },
  npcs: [],
  extras: [
    // Vendors behind their counters, people sitting, leaning and talking in pairs, a queue at the well.
    { count: 6, roles: ['trader'], spots: stalls.map((_, i) => `stall_${i}_work`), barks: ['Looking or buying?', 'Posted prices.'] },
    { count: 3, roles: ['settler', 'drifter', 'labourer'], spots: ['sit_a_sit', 'sit_b_sit', 'sit_c_sit'] },
    { count: 2, roles: ['street', 'guard'], spots: ['lean_a_lean', 'lean_b_lean'] },
    { count: 6, roles: ['settler', 'labourer', 'pilgrim'], spots: ['talk_1_pair_a', 'talk_1_pair_b', 'talk_2_pair_a', 'talk_2_pair_b', 'talk_3_pair_a', 'talk_3_pair_b'] },
    { count: 3, roles: ['settler'], spots: ['queue_a', 'queue_b', 'queue_c'] },
    // And the rest drift about the square; children among them.
    { count: 16, roles: ['settler', 'settler', 'labourer', 'drifter', 'trader', 'pilgrim', 'street'], area: { x: 3, y: 9, w: 38, h: 16 } },
    { count: 4, roles: ['settler'], ages: [11, 15], area: { x: 8, y: 12, w: 28, h: 12 }, barks: ['Race you to the well!', 'Mam says don\'t.', 'Did you see the kite?'] },
  ],
};
