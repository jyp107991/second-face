#!/usr/bin/env python3
"""Generates src/content/maps/saltpan.ts — the salt-pan wreck: a convoy truck on the white where nothing should be,
its load scattered, its cab locked, and the thing that sat down beside it and has not moved since.
    python3 tools/maps/gen_saltpan.py
"""
import json, os, re

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
W, H = 48, 40


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
fill(0, 18, 0, 21, '.'); fill(W - 1, 18, W - 1, 21, '.')
# crust: broken salt at the edges, hard white in the middle
for (x0, y0, x1, y1) in [(1, 1, 46, 5), (1, 34, 46, 38), (1, 6, 6, 33), (41, 6, 46, 33)]:
    fill(x0, y0, x1, y1, 'c')
# the truck's skid: a dark scar on the white, and the wreck at the end of it
fill(10, 24, 30, 26, 'k')
fill(26, 16, 34, 23, 'k')
# where the thing came down: a ring pressed into the crust
fill(14, 9, 22, 15, 'c')

rows = [''.join(r) for r in g]

props = [
    # the wreck: cab and trailer, on its side
    {'kind': 'car_wreck', 'x': 28, 'y': 18, 'rot': 1, 'id': 'truck_cab_wreck'}, {'kind': 'car_wreck', 'x': 28, 'y': 21, 'rot': 1},
    {'kind': 'locker', 'x': 31, 'y': 18, 'id': 'truck_cab'}, {'kind': 'tank', 'x': 32, 'y': 22},
    {'kind': 'crate', 'x': 25, 'y': 19, 'id': 'convoy_crate_a'}, {'kind': 'crate', 'x': 24, 'y': 22, 'id': 'convoy_crate_b'}, {'kind': 'barrel', 'x': 33, 'y': 20}, {'kind': 'barrel_rust', 'x': 27, 'y': 24},
    {'kind': 'debris', 'x': 22, 'y': 25}, {'kind': 'debris', 'x': 18, 'y': 25}, {'kind': 'debris', 'x': 30, 'y': 16}, {'kind': 'tire_pile', 'x': 14, 'y': 26},
    # the thing beside it
    {'kind': 'hound_dormant', 'x': 18, 'y': 12, 'rot': 2, 'id': 'hound'},
    {'kind': 'debris', 'x': 16, 'y': 14}, {'kind': 'rock_small', 'x': 21, 'y': 10},
    # the pan
    {'kind': 'rock', 'x': 4, 'y': 30}, {'kind': 'rock', 'x': 43, 'y': 8}, {'kind': 'rock_small', 'x': 8, 'y': 8}, {'kind': 'rock_small', 'x': 38, 'y': 33}, {'kind': 'dead_tree', 'x': 3, 'y': 3},
    {'kind': 'fence_post', 'x': 40, 'y': 29}, {'kind': 'sign', 'x': 3, 'y': 17, 'rot': 1},
]

saltpan = {
    'id': 'saltpan', 'name': 'The Salt-pan Wreck', 'seed': 52,
    'layout': rows,
    'legend': {
        '.': {'floor': 'sand'}, 'c': {'floor': 'rubble'}, 'k': {'floor': 'dirt'},
        'R': {'wall': 'rock', 'floor': 'sand', 'wallHeight': 2.4},
    },
    'props': props,
    'lights': [
        {'x': 18, 'y': 12, 'height': 0.9, 'color': 'hex:0x5ad0ff', 'intensity': 1.2, 'range': 5, 'flicker': 0.5},
    ],
    'spawns': [
        {'id': 'start', 'x': 2, 'y': 19, 'facing': 1}, {'id': 'from_shale', 'x': 2, 'y': 19, 'facing': 1}, {'id': 'from_cistern9', 'x': 45, 'y': 20, 'facing': 3},
        {'id': 'from_lm_sallow_02', 'x': 45, 'y': 19, 'facing': 3}, {'id': 'from_rustdogs', 'x': 2, 'y': 20, 'facing': 1},
    ],
    'exits': [
        {'x': 0, 'y': 18, 'w': 1, 'h': 4, 'to': {'worldMap': True}, 'label': 'Off the pan, west'},
        {'x': W - 1, 'y': 18, 'w': 1, 'h': 4, 'to': {'worldMap': True}, 'label': 'Off the pan, east'},
    ],
    'talk': {
        'hound': {'dialogue': 'd_sp_hound', 'name': 'The thing on the pan'},
        'truck_cab_wreck': {'dialogue': 'd_sp_truck', 'name': 'The truck'},
    },
    'containers': {
        'truck_cab': {'name': 'Truck Cab', 'items': [['k_hound_controller', 1], ['k_convoy_manifest', 1], ['a_556', 8], ['c_tin', 2]], 'lock': 45},
        'convoy_crate_a': {'name': 'Convoy Crate', 'items': [['j_electronics', 2], ['t_repair', 1], ['j_wiring', 3]], 'lock': 30},
        'convoy_crate_b': {'name': 'Convoy Crate', 'items': [['c_water', 3], ['c_jerky', 2], ['a_9mm', 10]]},
    },
    'spots': {'camp': {'x': 12, 'y': 30}},
    'npcs': [],
    'triggers': [
        {'id': 'arrive', 'x': 1, 'y': 17, 'w': 7, 'h': 6, 'text': 'The pan. White to the edge of the world, and in the middle of it, where nothing should be, a truck on its side with its load spilled, and a dark scar in the crust behind it half a mile long. Nothing moves. The glare makes your eyes water.', 'effects': [{'learn': 'seen_saltpan'}, {'quest': 'q_sw_wreck', 'start': True}, {'xp': 30}]},
        {'id': 'ring', 'x': 13, 'y': 8, 'w': 11, 'h': 9, 'text': 'A ring pressed into the crust, forty feet across, the salt fused glassy at the rim. Something heavy sat here. In the middle of it, something smaller still does.', 'effects': [{'learn': 'sp_ring'}, {'lead': 'l_kite_on_the_pan'}]},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0xe8e2d2', 'fogDensity': 0.014, 'dust': 0.3, 'grade': 0.55, 'mood': 'bright', 'sound': 'wind'},
    'hunting': 0.1,
}

HEADER = "import type { MapDef } from '../../engine/data/types';\n\n// Generated by tools/maps/gen_saltpan.py — edit the generator, then re-run it.\n"
with open(os.path.join(ROOT, 'src', 'content', 'maps', 'saltpan.ts'), 'w') as f:
    f.write(f"{HEADER}export const saltpan: MapDef = {ts(saltpan)};\n")
print('saltpan', W, 'x', H)
