#!/usr/bin/env python3
"""Generates src/content/maps/wheel.ts — the Wheel's camp: wagons in a ring on open pan, a fire in the middle,
tents, a horse line, trade blankets. The same camp wherever the Wheel has stopped this week.
    python3 tools/maps/gen_wheel.py
"""
import json, os, re, math

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
W, H = 46, 40


def ts(obj):
    s = json.dumps(obj, indent=2)
    s = re.sub(r'"([A-Za-z_][A-Za-z0-9_]*)":', r'\1:', s)
    s = re.sub(r'"hex:(0x[0-9a-fA-F]+)"', r'\1', s)
    return s


g = [['.'] * W for _ in range(H)]


def fill(x0, y0, x1, y1, ch):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            g[y][x] = ch


fill(0, 0, W - 1, 0, 'R'); fill(0, H - 1, W - 1, H - 1, 'R'); fill(0, 0, 0, H - 1, 'R'); fill(W - 1, 0, W - 1, H - 1, 'R')
# tracks in from the south and the east (whichever way you came)
fill(21, H - 1, 24, H - 1, ','); fill(21, 30, 24, 38, ',')
fill(W - 1, 18, W - 1, 21, ','); fill(34, 18, 44, 21, ',')
# the trampled ring and the hardpan beyond
CX, CY, R = 22, 19, 10
for y in range(H):
    for x in range(W):
        d = math.hypot(x - CX, y - CY)
        if d < R + 1.5 and g[y][x] == '.':
            g[y][x] = ','
# salt patches
for (x0, y0, x1, y1) in [(3, 3, 8, 6), (36, 4, 42, 7), (4, 32, 9, 36)]:
    fill(x0, y0, x1, y1, 's')

rows = [''.join(r) for r in g]

props = []
spots = {}
# wagons round the ring, tongues outward; a gap south (the track) and east
wagons = []
for i in range(7):
    a = -math.pi / 2 + (i + 1) * (2 * math.pi / 9)   # leaves the south-east open
    x, y = round(CX + math.cos(a) * R), round(CY + math.sin(a) * R)
    rot = (a + math.pi / 2)
    wagons.append((x, y))
    props.append({'kind': 'wagon', 'x': x, 'y': y, 'rot': round(rot, 3), 'rad': True})
# the fire and what sits round it
props += [
    {'kind': 'campfire', 'x': CX, 'y': CY, 'id': 'wh_fire'},
    {'kind': 'crate', 'x': CX - 2, 'y': CY + 1, 'id': 'wh_sit_a'}, {'kind': 'crate', 'x': CX + 2, 'y': CY + 1}, {'kind': 'barrel', 'x': CX + 2, 'y': CY - 2},
    {'kind': 'tank', 'x': CX - 6, 'y': CY - 5, 'id': 'wh_water'}, {'kind': 'barrel', 'x': CX - 5, 'y': CY - 4}, {'kind': 'barrel', 'x': CX - 7, 'y': CY - 4},
    # tents inside the ring
    {'kind': 'tent', 'x': CX - 5, 'y': CY + 4, 'rot': 1}, {'kind': 'tent', 'x': CX + 5, 'y': CY + 4, 'rot': 3}, {'kind': 'tent', 'x': CX + 6, 'y': CY - 3, 'rot': 2},
    {'kind': 'cot', 'x': CX - 5, 'y': CY + 6}, {'kind': 'cot', 'x': CX + 5, 'y': CY + 6},
    # the mother's wagon has a table before it; the trade blankets face the track
    {'kind': 'table', 'x': CX, 'y': CY - 6}, {'kind': 'chair', 'x': CX - 1, 'y': CY - 6, 'rot': 1}, {'kind': 'sign', 'x': 24, 'y': 27},
    {'kind': 'blanket', 'x': 26, 'y': 24}, {'kind': 'blanket', 'x': 28, 'y': 24}, {'kind': 'crate', 'x': 29, 'y': 25, 'id': 'wh_trade_crate'},
    # the horse line, east of the ring
    {'kind': 'fence_post', 'x': 35, 'y': 12}, {'kind': 'fence_post', 'x': 41, 'y': 12},
    {'kind': 'horse', 'x': 36, 'y': 13, 'rot': 0}, {'kind': 'horse', 'x': 38, 'y': 13, 'rot': 0}, {'kind': 'horse', 'x': 40, 'y': 13, 'rot': 0}, {'kind': 'horse', 'x': 37, 'y': 10, 'rot': 2},
    {'kind': 'barrel', 'x': 42, 'y': 14}, {'kind': 'tire_pile', 'x': 33, 'y': 9}, {'kind': 'car_wreck', 'x': 8, 'y': 26, 'rot': 1}, {'kind': 'debris', 'x': 12, 'y': 10},
    {'kind': 'dead_tree', 'x': 6, 'y': 14}, {'kind': 'cactus', 'x': 40, 'y': 32}, {'kind': 'rock', 'x': 3, 'y': 20}, {'kind': 'lamp_post', 'x': 25, 'y': 28},
]
spots.update({
    'sefa_fire_sit': {'x': CX - 2, 'y': CY + 2}, 'sefa_table_work': {'x': CX, 'y': CY - 5}, 'sefa_sleep': {'x': CX - 5, 'y': CY + 5},
    'dario_lean': {'x': CX + 7, 'y': CY - 1}, 'dario_fire': {'x': CX + 2, 'y': CY + 2}, 'dario_sleep': {'x': CX + 5, 'y': CY + 5},
    'mirren_horses_work': {'x': 38, 'y': 14}, 'mirren_fire': {'x': CX - 1, 'y': CY + 3}, 'mirren_sleep': {'x': CX + 6, 'y': CY - 2},
    'tulla_stall_work': {'x': 27, 'y': 26}, 'tulla_fire': {'x': CX + 1, 'y': CY + 3}, 'tulla_sleep': {'x': CX - 4, 'y': CY + 5},
    'ring_a_pair_a': {'x': CX - 3, 'y': CY - 2}, 'ring_a_pair_b': {'x': CX - 4, 'y': CY - 2}, 'ring_b_sit': {'x': CX + 2, 'y': CY + 1},
    'ring_c_lean': {'x': CX - 7, 'y': CY + 1}, 'ring_d_work': {'x': CX - 4, 'y': CY - 4},
})

wheel = {
    'id': 'wheel', 'name': 'The Wheel', 'seed': 77, 'settlement': 'wheel',
    'layout': rows,
    'legend': {
        '.': {'floor': 'sand'}, ',': {'floor': 'dirt'}, 's': {'floor': 'rubble'},
        'R': {'wall': 'rock', 'floor': 'sand', 'wallHeight': 3},
    },
    'props': props,
    'lights': [
        {'x': 25, 'y': 28, 'height': 3, 'color': 'hex:0xffd8a0', 'intensity': 1.2, 'range': 7, 'flicker': 0.1},
    ],
    'spawns': [{'id': 'start', 'x': 22, 'y': 35}, {'id': 'from_shale', 'x': 22, 'y': 35}, {'id': 'from_drywells', 'x': 42, 'y': 20}, {'id': 'from_orchard', 'x': 22, 'y': 35}, {'id': 'from_rustdogs', 'x': 22, 'y': 35}, {'id': 'here', 'x': 22, 'y': 30}],
    'spots': spots,
    'exits': [
        {'x': 21, 'y': H - 1, 'w': 4, 'h': 1, 'to': {'worldMap': True}, 'label': 'The track south'},
        {'x': W - 1, 'y': 18, 'w': 1, 'h': 4, 'to': {'worldMap': True}, 'label': 'The track east'},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0xd0bc9c', 'fogDensity': 0.016, 'dust': 0.5, 'grade': 0.6, 'mood': 'peaceful', 'sound': 'camp'},
    'hunting': 0.3,
    'npcs': [
        {'def': 'npc_wh_01', 'x': CX - 2, 'y': CY + 2},
        {'def': 'npc_wh_02', 'x': CX + 7, 'y': CY - 1},
        {'def': 'npc_wh_03', 'x': 38, 'y': 14},
        {'def': 'npc_wh_04', 'x': 27, 'y': 26},
    ],
    'extras': [
        {'count': 2, 'roles': ['nomad'], 'spots': ['ring_a_pair_a', 'ring_a_pair_b'], 'faction': 'wheel'},
        {'count': 3, 'roles': ['nomad', 'nomad', 'labourer'], 'spots': ['ring_b_sit', 'ring_c_lean', 'ring_d_work'], 'faction': 'wheel'},
        {'count': 5, 'roles': ['nomad', 'nomad', 'settler', 'trader'], 'area': {'x': 14, 'y': 11, 'w': 17, 'h': 16}, 'faction': 'wheel'},
        {'count': 3, 'roles': ['settler'], 'ages': [9, 14], 'area': {'x': 15, 'y': 12, 'w': 15, 'h': 14}, 'faction': 'wheel', 'barks': ['Mam says the horses first.', 'Race you to the water wagon!', 'Are you from a town? What\'s a town like?']},
    ],
}

out = f"""import type {{ MapDef }} from '../../engine/data/types';

// Generated by tools/maps/gen_wheel.py — do not edit by hand.
export const wheel: MapDef = {ts(wheel)};
"""
with open(os.path.join(ROOT, 'src', 'content', 'maps', 'wheel.ts'), 'w') as f:
    f.write(out)
print('wrote wheel.ts', W, 'x', H, len(props), 'props')
