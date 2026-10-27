#!/usr/bin/env python3
"""Generates src/content/maps/orchard.ts — the burnt orchard: rows of trees the Burn left standing dead, a dozen the
Choir has coaxed back from root-stock, seedbeds, a well, two tents and a shed, half an hour north of Shale.
    python3 tools/maps/gen_orchard.py
"""
import json, os, re

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
W, H = 48, 44


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


def building(x0, y0, x1, y1, wall, floor, doors):
    fill(x0, y0, x1, y1, wall)
    fill(x0 + 1, y0 + 1, x1 - 1, y1 - 1, floor)
    for (x, y) in doors:
        g[y][x] = floor


fill(0, 0, W - 1, 0, 'R'); fill(0, H - 1, W - 1, H - 1, 'R'); fill(0, 0, 0, H - 1, 'R'); fill(W - 1, 0, W - 1, H - 1, 'R')
# the lane in from the south (Shale) and a gap in the north wall where the thieves come
fill(22, H - 1, 25, H - 1, ','); fill(22, 30, 25, 42, ',')
fill(40, 0, 42, 0, 'r'); fill(40, 1, 42, 4, 'r')
# the orchard floor: dirt rows between the trees
fill(4, 6, 43, 26, 'd')
# the yard: well, tents, shed
fill(14, 28, 33, 36, ',')
building(6, 30, 12, 35, 'W', 'w', [(12, 32)])
# the seedbeds in the sheltered corner
fill(36, 29, 43, 35, 'd')

rows = [''.join(r) for r in g]

props = []
# burnt rows: dead trees in a grid, with gaps where the living ones are
living = {(10, 9), (17, 9), (24, 9), (31, 9), (38, 9), (13, 15), (20, 15), (27, 15), (34, 15), (10, 21), (24, 21), (38, 21)}
for y in [9, 15, 21]:
    for x in range(7, 44, 4):
        if (x, y) in living:
            props.append({'kind': 'planter', 'x': x, 'y': y})       # a tree brought back: a bed round its foot
        else:
            props.append({'kind': 'dead_tree', 'x': x, 'y': y})
props += [
    # the yard
    {'kind': 'tank', 'x': 20, 'y': 31, 'id': 'or_well'}, {'kind': 'pipe_h', 'x': 22, 'y': 31}, {'kind': 'tent', 'x': 26, 'y': 30, 'rot': 2}, {'kind': 'tent', 'x': 30, 'y': 30, 'rot': 2},
    {'kind': 'campfire', 'x': 28, 'y': 34}, {'kind': 'barrel', 'x': 16, 'y': 34}, {'kind': 'crate', 'x': 15, 'y': 29, 'id': 'or_store'}, {'kind': 'sign', 'x': 24, 'y': 28, 'rot': 0, 'id': 'or_shrine'},
    # the shed
    {'kind': 'shelf', 'x': 7, 'y': 31, 'rot': 1}, {'kind': 'table', 'x': 9, 'y': 33}, {'kind': 'cot', 'x': 10, 'y': 31, 'rot': 1}, {'kind': 'barrel', 'x': 7, 'y': 34},
    # the seedbeds
    {'kind': 'planter', 'x': 37, 'y': 30}, {'kind': 'planter', 'x': 39, 'y': 30}, {'kind': 'planter', 'x': 41, 'y': 30}, {'kind': 'planter', 'x': 37, 'y': 33}, {'kind': 'planter', 'x': 39, 'y': 33}, {'kind': 'planter', 'x': 41, 'y': 33},
    {'kind': 'fence_post', 'x': 35, 'y': 29}, {'kind': 'fence_post', 'x': 35, 'y': 32}, {'kind': 'fence_post', 'x': 35, 'y': 35},
    # the gap in the wall where the thieves come, and their leavings
    {'kind': 'rock_small', 'x': 39, 'y': 5}, {'kind': 'debris', 'x': 42, 'y': 6, 'id': 'or_leavings'},
    {'kind': 'sign', 'x': 21, 'y': 40, 'rot': 1},
]

orchard = {
    'id': 'orchard', 'name': 'The Burnt Orchard', 'seed': 53, 'settlement': 'shale',
    'layout': rows,
    'legend': {
        '.': {'floor': 'sand'}, ',': {'floor': 'dirt'}, 'd': {'floor': 'dirt'}, 'r': {'floor': 'rubble'}, 'w': {'floor': 'wood'},
        'R': {'wall': 'rock', 'floor': 'sand', 'wallHeight': 2.2},
        'W': {'wall': 'wood', 'floor': 'wood', 'wallHeight': 2.4},
    },
    'props': props,
    'lights': [
        {'x': 28, 'y': 34, 'height': 0.6, 'color': 'hex:0xff9a40', 'intensity': 2.0, 'range': 6, 'flicker': 0.35},
        {'x': 24, 'y': 28, 'height': 1.2, 'color': 'hex:0xffe0b0', 'intensity': 0.9, 'range': 4, 'flicker': 0.3},
    ],
    'spawns': [
        {'id': 'start', 'x': 23, 'y': 41, 'facing': 0}, {'id': 'from_shale', 'x': 23, 'y': 41, 'facing': 0},
    ],
    'exits': [
        {'x': 22, 'y': H - 1, 'w': 4, 'h': 1, 'to': {'worldMap': True}, 'label': 'The lane back to Shale'},
    ],
    'talk': {
        'or_shrine': {'dialogue': 'd_or_shrine', 'name': 'The shrine'},
        'or_leavings': {'dialogue': 'd_or_leavings', 'name': 'The gap in the wall'},
        'or_well': {'dialogue': 'd_or_well', 'name': 'The well'},
    },
    'containers': {
        'or_store': {'name': 'Fruit Store', 'items': [['c_fruit', 4], ['c_water', 2]]},
    },
    'spots': {
        'keeper_rows': {'x': 20, 'y': 12}, 'keeper_fire': {'x': 27, 'y': 33}, 'keeper_cot': {'x': 9, 'y': 32}, 'novice_beds': {'x': 38, 'y': 31}, 'novice_well': {'x': 21, 'y': 33}, 'tent_a': {'x': 26, 'y': 31}, 'tent_b': {'x': 30, 'y': 31},
        'thief_a': {'x': 38, 'y': 32}, 'thief_b': {'x': 40, 'y': 34}, 'watch': {'x': 33, 'y': 36},
    },
    'npcs': [
        {'def': 'npc_or_01', 'x': 20, 'y': 12, 'facing': 2},
        {'def': 'npc_or_02', 'x': 38, 'y': 31, 'facing': 1},
        {'def': 'npc_or_03', 'x': 21, 'y': 33, 'facing': 3},
        {'def': 'npc_or_04', 'x': 38, 'y': 32, 'facing': 3, 'if': {'all': [{'flag': 'or_stakeout'}, {'not': {'flag': 'or_thieves_caught'}}, {'hour': {'from': 23, 'to': 4}}]}, 'schedule': []},
        {'def': 'npc_or_05', 'x': 40, 'y': 34, 'facing': 3, 'if': {'all': [{'flag': 'or_stakeout'}, {'not': {'flag': 'or_thieves_caught'}}, {'hour': {'from': 23, 'to': 4}}]}, 'schedule': []},
    ],
    'triggers': [
        {'id': 'arrive', 'x': 20, 'y': 36, 'w': 8, 'h': 6, 'text': 'The burnt orchard. Rows of black trees the Burn left standing, and among them a dozen with leaves on, which is a thing you have not seen in your life: green, in rows, with people kneeling at their feet.', 'effects': [{'learn': 'seen_orchard'}, {'xp': 20}]},
        {'id': 'beds_night', 'x': 36, 'y': 29, 'w': 8, 'h': 7, 'once': False, 'if': {'all': [{'flag': 'or_stakeout'}, {'not': {'flag': 'or_thieves_caught'}}, {'hour': {'from': 23, 'to': 4}}]}, 'effects': [{'event': 'dialogue', 'data': {'tree': 'd_or_thieves', 'name': 'The seedbeds'}}]},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0xb8b09a', 'fogDensity': 0.018, 'dust': 0.3, 'grade': 0.62, 'sound': 'wind'},
    'hunting': 0.2,
}

HEADER = "import type { MapDef } from '../../engine/data/types';\n\n// Generated by tools/maps/gen_orchard.py — edit the generator, then re-run it.\n"
with open(os.path.join(ROOT, 'src', 'content', 'maps', 'orchard.ts'), 'w') as f:
    f.write(f"{HEADER}export const orchard: MapDef = {ts(orchard)};\n")
print('orchard', W, 'x', H)
