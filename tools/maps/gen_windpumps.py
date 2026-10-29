#!/usr/bin/env python3
"""Generates src/content/maps/windpumps.ts — the windpump graveyard: a line of dead windpumps across a dry pan, a
pump house with its door hanging, stone troughs the game still comes to, a scavenger's camp under the last tower,
and cart ruts going east toward where the Wheel camps.
    python3 tools/maps/gen_windpumps.py
"""
import json, os, re

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
W, H = 52, 40


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
# the way in from the west (Dry Wells) and the ruts out east (the Wheel)
fill(0, 18, 0, 21, ','); fill(1, 18, 50, 21, ','); fill(W - 1, 18, W - 1, 21, ',')
# the pan: salt crust north of the track, hardpan south
fill(3, 2, 48, 9, 's')
fill(30, 26, 48, 36, 's')
# the pumps: six towers in a line along the track, each with its pad
for i, x in enumerate([8, 15, 22, 29, 36, 43]):
    fill(x - 1, 14, x + 1, 16, 'm')
# the troughs: a stone run below the fourth and fifth pumps
fill(26, 23, 38, 24, 'c')
# the pump house: concrete, the door gone
building(10, 25, 19, 32, 'C', 'c', [(14, 25)])
# the scavenger's camp under the last tower
fill(40, 10, 47, 13, ',')

rows = [''.join(r) for r in g]

props = [
    # the pumps' feet
    {'kind': 'windpump', 'x': 8, 'y': 14}, {'kind': 'windpump', 'x': 15, 'y': 14}, {'kind': 'windpump', 'x': 22, 'y': 14, 'id': 'pump_3'},
    {'kind': 'windpump', 'x': 29, 'y': 14}, {'kind': 'windpump', 'x': 36, 'y': 14}, {'kind': 'windpump', 'x': 43, 'y': 14, 'id': 'pump_6'},
    {'kind': 'pipe_h', 'x': 11, 'y': 17}, {'kind': 'pipe_h', 'x': 18, 'y': 17}, {'kind': 'pipe_h', 'x': 25, 'y': 17}, {'kind': 'pipe_h', 'x': 32, 'y': 17}, {'kind': 'pipe_h', 'x': 39, 'y': 17},
    # the troughs
    {'kind': 'tank', 'x': 27, 'y': 22}, {'kind': 'pipe_h', 'x': 30, 'y': 22}, {'kind': 'pipe_h', 'x': 34, 'y': 22}, {'kind': 'debris', 'x': 37, 'y': 25},
    # the pump house
    {'kind': 'machine', 'x': 12, 'y': 27, 'rot': 1, 'id': 'wp_valvehouse'}, {'kind': 'tank', 'x': 17, 'y': 27}, {'kind': 'locker', 'x': 17, 'y': 31, 'id': 'wp_locker'}, {'kind': 'shelf', 'x': 11, 'y': 31, 'rot': 1},
    {'kind': 'table', 'x': 14, 'y': 29}, {'kind': 'debris', 'x': 13, 'y': 30}, {'kind': 'barrel_rust', 'x': 18, 'y': 29},
    # the pan and the hardpan
    {'kind': 'car_wreck', 'x': 24, 'y': 5, 'rot': 2}, {'kind': 'rock', 'x': 6, 'y': 35}, {'kind': 'rock', 'x': 45, 'y': 30}, {'kind': 'rock_small', 'x': 20, 'y': 36}, {'kind': 'rock_small', 'x': 33, 'y': 4},
    {'kind': 'dead_tree', 'x': 4, 'y': 12}, {'kind': 'dead_tree', 'x': 38, 'y': 33}, {'kind': 'debris', 'x': 30, 'y': 7}, {'kind': 'fence_post', 'x': 5, 'y': 22}, {'kind': 'fence_post', 'x': 5, 'y': 24},
    {'kind': 'sign', 'x': 3, 'y': 17, 'rot': 1},
    # the scavenger's camp
    {'kind': 'tent', 'x': 41, 'y': 11, 'rot': 1}, {'kind': 'campfire', 'x': 44, 'y': 12}, {'kind': 'crate', 'x': 46, 'y': 11, 'id': 'marit_crate'}, {'kind': 'tire_pile', 'x': 46, 'y': 13},
    {'kind': 'barrel', 'x': 42, 'y': 13}, {'kind': 'pipe_h', 'x': 40, 'y': 13},
    # the ruts east
    {'kind': 'debris', 'x': 48, 'y': 22}, {'kind': 'fence_post', 'x': 49, 'y': 17},
]

windpumps = {
    'id': 'windpumps', 'name': 'The Windpump Graveyard', 'seed': 51,
    'layout': rows,
    'legend': {
        '.': {'floor': 'sand'}, ',': {'floor': 'dirt'}, 's': {'floor': 'rubble'}, 'c': {'floor': 'concrete'}, 'm': {'floor': 'metal'},
        'R': {'wall': 'rock', 'floor': 'sand', 'wallHeight': 2.8},
        'C': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 3},
    },
    'props': props,
    'lights': [
        {'x': 44, 'y': 12, 'height': 0.6, 'color': 'hex:0xff9a40', 'intensity': 2.0, 'range': 6, 'flicker': 0.35},
        {'x': 14, 'y': 28, 'height': 2.4, 'color': 'hex:0x9ab8c0', 'intensity': 0.8, 'range': 5, 'flicker': 0.2},
    ],
    'spawns': [
        {'id': 'start', 'x': 2, 'y': 19, 'facing': 1}, {'id': 'from_drywells', 'x': 2, 'y': 19, 'facing': 1}, {'id': 'from_signalhill', 'x': 2, 'y': 20, 'facing': 1},
        {'id': 'from_wheel', 'x': 49, 'y': 19, 'facing': 3},
    ],
    'exits': [
        {'x': 0, 'y': 18, 'w': 1, 'h': 4, 'to': {'worldMap': True}, 'label': 'Back toward Dry Wells'},
        {'x': W - 1, 'y': 18, 'w': 1, 'h': 4, 'to': {'worldMap': True}, 'label': 'East, along the ruts'},
    ],
    'talk': {
        'pump_3': {'dialogue': 'd_wp_pump', 'name': 'A windpump'},
        'pump_6': {'dialogue': 'd_wp_pump', 'name': 'A windpump'},
        'wp_valvehouse': {'dialogue': 'd_wp_valvehouse', 'name': 'The valve house'},
    },
    'containers': {
        'wp_locker': {'name': 'Pump House Locker', 'items': [['j_wiring', 3], ['t_repair', 1], ['j_electronics', 1], ['a_308', 4]], 'lock': 35},
        'marit_crate': {'name': 'Marit\'s Crate', 'items': [['j_wiring', 6], ['j_scrap', 5], ['c_jerky', 2], ['c_water', 2]], 'lock': 20},
    },
    'spots': {
        'marit_fire': {'x': 43, 'y': 12}, 'marit_tent': {'x': 42, 'y': 11}, 'marit_work': {'x': 43, 'y': 17}, 'camp': {'x': 43, 'y': 13},
    },
    'npcs': [
        {'def': 'npc_wp_01', 'x': 43, 'y': 17, 'facing': 0, 'if': {'not': {'dead': 'windpumps/npc_wp_01'}}},
    ],
    'triggers': [
        {'id': 'arrive', 'x': 1, 'y': 17, 'w': 8, 'h': 6, 'text': 'The windpump graveyard. Six towers in a line across the pan, vanes locked, pumping nothing, and under them stone troughs with the dark stain of water that is not there any more. Something small bolts from the nearest trough as you come up.', 'effects': [{'learn': 'seen_windpumps'}, {'xp': 30}]},
        {'id': 'troughs', 'x': 26, 'y': 22, 'w': 13, 'h': 4, 'text': 'The troughs are dry, but the sand around them is written over with tracks: hare, something with hooves, something with claws that walks on two toes. Game still comes here out of habit, at dawn and dusk.', 'effects': [{'learn': 'wp_troughs'}]},
        {'id': 'ruts', 'x': 44, 'y': 18, 'w': 6, 'h': 4, 'text': 'Cart ruts, many and deep, going east off the pan toward a long low hill. Horse dung, not old. Something with a lot of wheels camps that way.', 'effects': [{'learn': 'wheel_tracks'}, {'lead': 'l_wheel_where'}]},
    ],
    # scavengers working the fallen pumps by day (P4.13 step 5)
    'extras': [
        {'count': 2, 'roles': ['labourer', 'drifter'], 'life': 'hard', 'area': {'x': 4, 'y': 10, 'w': 34, 'h': 7}, 'hours': {'from': 7, 'to': 17},
         'barks': ['Copper\'s long gone. Bearings, maybe.', 'Don\'t climb that one. It leans.', 'Wind\'s free. Parts aren\'t.']},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0xcfc0a4', 'fogDensity': 0.018, 'dust': 0.6, 'grade': 0.7, 'mood': 'bright', 'sound': 'wind'},
    'hunting': 0.6,
}

HEADER = "import type { MapDef } from '../../engine/data/types';\n\n// Generated by tools/maps/gen_windpumps.py — edit the generator, then re-run it.\n"
with open(os.path.join(ROOT, 'src', 'content', 'maps', 'windpumps.ts'), 'w') as f:
    f.write(f"{HEADER}export const windpumps: MapDef = {ts(windpumps)};\n")
print('windpumps', W, 'x', H)
