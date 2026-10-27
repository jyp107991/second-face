#!/usr/bin/env python3
"""Generates src/content/maps/drywells.ts — Dry Wells: a dead well-town around a pump station that still runs on
somebody else's clock. Three dry wells, a water tower, scrap shacks where the squatters live, and the station
with its pump hall and control room.
    python3 tools/maps/gen_drywells.py
"""
import json, os, re

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
W, H = 56, 48


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


# rock rim; the track from Shale enters west, a path to the windpumps leaves north
fill(0, 0, W - 1, 0, 'R'); fill(0, H - 1, W - 1, H - 1, 'R'); fill(0, 0, 0, H - 1, 'R'); fill(W - 1, 0, W - 1, H - 1, 'R')
fill(0, 22, 0, 25, ','); fill(27, 0, 30, 0, ',')
fill(1, 22, 30, 25, ',')                   # the track in
fill(27, 1, 30, 22, ',')                   # north path
# salt and hardpan
for (x0, y0, x1, y1) in [(3, 3, 12, 8), (40, 28, 52, 34), (4, 40, 10, 45), (44, 38, 53, 45)]:
    fill(x0, y0, x1, y1, 's')
# the dry wells: rubble pits
fill(10, 28, 14, 32, 'r'); fill(16, 33, 20, 37, 'r'); fill(11, 38, 15, 42, 'r')
# the water tower pad
fill(22, 9, 25, 12, 'm')
# the station: pump hall with a control room partitioned off in the east end
building(31, 7, 51, 21, 'C', 'c', [(36, 21), (31, 14)])
fill(43, 8, 43, 13, 'C'); fill(43, 14, 50, 14, 'C'); g[11][43] = 'c'      # control room x 44..50, y 8..13, door at (43,11)
fill(32, 15, 42, 20, 'm')                 # the pump floor is grating
# the squatters' shacks
building(6, 13, 11, 17, 'S', 'w', [(9, 17)])
building(13, 12, 18, 16, 'S', 'w', [(15, 16)])
building(6, 19, 10, 22, 'S', 'w', [(10, 20)])
fill(12, 18, 20, 21, ',')                 # the yard between

rows = [''.join(r) for r in g]

props = [
    # the track and the dry wells
    {'kind': 'sign', 'x': 3, 'y': 21, 'rot': 1}, {'kind': 'car_wreck', 'x': 20, 'y': 27, 'rot': 1}, {'kind': 'debris', 'x': 12, 'y': 30}, {'kind': 'barrel_rust', 'x': 13, 'y': 31},
    {'kind': 'debris', 'x': 18, 'y': 35}, {'kind': 'rock_small', 'x': 17, 'y': 34}, {'kind': 'debris', 'x': 13, 'y': 40}, {'kind': 'barrel_rust', 'x': 12, 'y': 39},
    {'kind': 'dead_tree', 'x': 24, 'y': 32}, {'kind': 'dead_tree', 'x': 40, 'y': 40}, {'kind': 'rock', 'x': 50, 'y': 25}, {'kind': 'rock', 'x': 8, 'y': 35}, {'kind': 'cactus', 'x': 36, 'y': 30},
    # the water tower
    {'kind': 'tank', 'x': 23, 'y': 10}, {'kind': 'pipe_h', 'x': 26, 'y': 11}, {'kind': 'pipe_h', 'x': 28, 'y': 11},
    # the approach: where the hunter stands
    {'kind': 'sandbags', 'x': 24, 'y': 21}, {'kind': 'sandbags', 'x': 24, 'y': 26}, {'kind': 'fire_barrel', 'x': 22, 'y': 20},
    # the pump hall
    {'kind': 'machine', 'x': 33, 'y': 9, 'rot': 1, 'id': 'pump_1'}, {'kind': 'machine', 'x': 33, 'y': 12, 'rot': 1, 'id': 'pump_2'}, {'kind': 'tank', 'x': 38, 'y': 9}, {'kind': 'tank', 'x': 41, 'y': 9},
    {'kind': 'pipe_h', 'x': 35, 'y': 11}, {'kind': 'pipe_h', 'x': 37, 'y': 12}, {'kind': 'pipe_h', 'x': 39, 'y': 12}, {'kind': 'machine', 'x': 36, 'y': 17, 'rot': 0, 'id': 'dw_valve'},
    {'kind': 'barrel', 'x': 33, 'y': 19}, {'kind': 'barrel', 'x': 34, 'y': 19}, {'kind': 'crate', 'x': 41, 'y': 19, 'id': 'station_crate'}, {'kind': 'locker', 'x': 32, 'y': 16, 'id': 'station_locker'}, {'kind': 'debris', 'x': 40, 'y': 15},
    # the control room
    {'kind': 'terminal', 'x': 49, 'y': 9, 'rot': 3, 'id': 'dw_console'}, {'kind': 'machine', 'x': 46, 'y': 9, 'rot': 2, 'id': 'dw_panel'}, {'kind': 'table', 'x': 47, 'y': 12}, {'kind': 'chair', 'x': 48, 'y': 12, 'rot': 3},
    {'kind': 'shelf', 'x': 45, 'y': 12, 'rot': 1},
    # the shacks
    {'kind': 'cot', 'x': 7, 'y': 14, 'rot': 1}, {'kind': 'table', 'x': 9, 'y': 15, 'id': 'diary_table'}, {'kind': 'chair', 'x': 10, 'y': 15, 'rot': 3},
    {'kind': 'cot', 'x': 14, 'y': 13, 'rot': 1}, {'kind': 'cot', 'x': 16, 'y': 13, 'rot': 1}, {'kind': 'crate', 'x': 17, 'y': 15, 'id': 'shack_crate'},
    {'kind': 'cot', 'x': 7, 'y': 20, 'rot': 0}, {'kind': 'barrel', 'x': 9, 'y': 21},
    {'kind': 'campfire', 'x': 16, 'y': 19}, {'kind': 'stove', 'x': 12, 'y': 19}, {'kind': 'tire_pile', 'x': 19, 'y': 21}, {'kind': 'planter', 'x': 13, 'y': 21},
]

# The family is here until it leaves for Shale or the road.
HERE = {'all': [{'not': {'flag': 'dw_ghosts_shale'}}, {'not': {'flag': 'dw_ghosts_moved'}}]}

drywells = {
    'id': 'drywells', 'name': 'Dry Wells', 'seed': 23, 'settlement': 'drywells',
    'layout': rows,
    'legend': {
        '.': {'floor': 'sand'}, ',': {'floor': 'dirt'}, 'r': {'floor': 'rubble'}, 's': {'floor': 'rubble'}, 'c': {'floor': 'concrete'}, 'm': {'floor': 'metal'}, 'w': {'floor': 'wood'},
        'R': {'wall': 'rock', 'floor': 'sand', 'wallHeight': 3},
        'C': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 3.4},
        'S': {'wall': 'scrap', 'floor': 'wood', 'wallHeight': 2.3},
    },
    'props': props,
    'lights': [
        {'x': 16, 'y': 19, 'height': 0.6, 'color': 'hex:0xff9a40', 'intensity': 2.2, 'range': 6, 'flicker': 0.35},
        {'x': 22, 'y': 20, 'height': 0.8, 'color': 'hex:0xff9a40', 'intensity': 1.6, 'range': 5, 'flicker': 0.35},
        {'x': 47, 'y': 10, 'height': 2.6, 'color': 'hex:0x8ad0a0', 'intensity': 1.8, 'range': 6, 'flicker': 0.25},
        {'x': 37, 'y': 14, 'height': 3.0, 'color': 'hex:0xffd8a0', 'intensity': 1.4, 'range': 8, 'flicker': 0.1},
        {'x': 36, 'y': 10, 'height': 3.0, 'color': 'hex:0xffd8a0', 'intensity': 1.2, 'range': 7, 'flicker': 0.1},
    ],
    'spawns': [
        {'id': 'start', 'x': 2, 'y': 23, 'facing': 1}, {'id': 'from_shale', 'x': 2, 'y': 24, 'facing': 1},
        {'id': 'from_lm_sallow_02', 'x': 28, 'y': 2, 'facing': 2}, {'id': 'inside', 'x': 38, 'y': 16, 'facing': 0},
    ],
    'exits': [
        {'x': 0, 'y': 22, 'w': 1, 'h': 4, 'to': {'worldMap': True}, 'label': 'The track to Shale'},
        {'x': 27, 'y': 0, 'w': 4, 'h': 1, 'to': {'worldMap': True}, 'label': 'North, toward the windpumps'},
    ],
    'talk': {
        'dw_console': {'dialogue': 'd_dw_console', 'name': 'The schedule console'},
        'dw_panel': {'dialogue': 'd_dw_panel', 'name': 'The pressure panel'},
        'dw_valve': {'dialogue': 'd_dw_valve', 'name': 'The bypass valve'},
        'diary_table': {'dialogue': 'd_dw_diary_table', 'name': 'The table'},
        'pump_1': {'dialogue': 'd_dw_pumps', 'name': 'The pumps'},
        'pump_2': {'dialogue': 'd_dw_pumps', 'name': 'The pumps'},
    },
    'containers': {
        'station_locker': {'name': 'Station Locker', 'items': [['t_repair', 1], ['j_electronics', 2], ['c_tin', 1]], 'lock': 40},
        'station_crate': {'name': 'Parts Crate', 'items': [['j_scrap', 4], ['j_wiring', 3], ['j_fuel', 1]], 'lock': 25},
        'shack_crate': {'name': 'Family Crate', 'items': [['c_dirtywater', 3], ['j_cloth', 2], ['c_algae', 1]]},
    },
    'spots': {
        'perch': {'x': 24, 'y': 23}, 'fire': {'x': 15, 'y': 20}, 'oriel_chair': {'x': 10, 'y': 16}, 'oriel_cot': {'x': 7, 'y': 14},
        'cot_b': {'x': 14, 'y': 13}, 'cot_c': {'x': 16, 'y': 13}, 'cot_d': {'x': 7, 'y': 20}, 'yard': {'x': 17, 'y': 20}, 'planter': {'x': 13, 'y': 20}, 'tower': {'x': 24, 'y': 13},
    },
    'npcs': [
        {'def': 'npc_dw_01', 'x': 10, 'y': 16, 'facing': 0, 'if': HERE},
        {'def': 'npc_dw_02', 'x': 24, 'y': 23, 'facing': 3, 'if': {'all': [HERE, {'not': {'dead': 'drywells/npc_dw_02'}}]}},
        {'def': 'npc_dw_03', 'x': 13, 'y': 20, 'facing': 2, 'if': HERE},
        {'def': 'npc_dw_04', 'x': 17, 'y': 20, 'facing': 1, 'if': {'all': [HERE, {'not': {'dead': 'drywells/npc_dw_04'}}]}},
        {'def': 'npc_dw_05', 'x': 24, 'y': 13, 'facing': 2, 'if': HERE},
        {'def': 'npc_dw_06', 'x': 48, 'y': 10, 'facing': 1, 'if': {'flag': 'dw_sold'}},
    ],
    'triggers': [
        {'id': 'arrive', 'x': 1, 'y': 21, 'w': 6, 'h': 6, 'text': 'Dry Wells. Three wells with nothing in them, a water tower with something in it, and a pump station that was built to outlast the town and has.', 'effects': [{'learn': 'seen_drywells'}]},
        {'id': 'approach', 'x': 21, 'y': 21, 'w': 6, 'h': 6, 'once': False, 'if': {'not': {'flag': 'dw_admitted'}}, 'effects': [{'event': 'dialogue', 'data': {'tree': 'd_dw_approach', 'name': 'The approach'}}]},
        {'id': 'hall', 'x': 32, 'y': 15, 'w': 11, 'h': 6, 'text': 'The pump hall. Two pumps the size of houses, hammering on and off on a clock nobody in this building set, and a line going north under the floor to Shale.', 'effects': [{'learn': 'seen_dw_hall'}]},
        {'id': 'door', 'x': 42, 'y': 11, 'w': 1, 'h': 1, 'once': False, 'if': {'not': {'flag': 'dw_control_open'}}, 'effects': [{'event': 'dialogue', 'data': {'tree': 'd_dw_door', 'name': 'The door'}}]},
        {'id': 'control', 'x': 44, 'y': 8, 'w': 7, 'h': 6, 'text': 'The control room: a console, a pressure panel, and a chair that has not been sat in since the Burn. Something green is still lit.', 'effects': [{'set': 'dw_control_seen'}]},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0xc0ae96', 'fogDensity': 0.02, 'dust': 0.8, 'grade': 0.75, 'mood': 'haze', 'sound': 'wind'},
}

HEADER = "import type { MapDef } from '../../engine/data/types';\n\n// Generated by tools/maps/gen_drywells.py — edit the generator, then re-run it.\n"
with open(os.path.join(ROOT, 'src', 'content', 'maps', 'drywells.ts'), 'w') as f:
    f.write(f"{HEADER}export const drywells: MapDef = {ts(drywells)};\n")
print('drywells', W, 'x', H)
