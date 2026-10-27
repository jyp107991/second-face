#!/usr/bin/env python3
"""Generates src/content/maps/overpass.ts — the Rust Dogs' camp under a dead elevated highway.

The highway runs east–west as a thick concrete band with collapsed sections; the camp lives in its shade:
Kessler's hall (a gutted coach), the pens, Sallow Jack's bench, the water tank they take from Shale, the cage,
tents and fires. The road in comes from the south (Shale); a track leaves north-east toward the Tollhouse.
    python3 tools/maps/gen_overpass.py
"""
import json, os, re

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
W, H = 60, 46


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


# rim
fill(0, 0, W - 1, 0, 'R'); fill(0, H - 1, W - 1, H - 1, 'R'); fill(0, 0, 0, H - 1, 'R'); fill(W - 1, 0, W - 1, H - 1, 'R')
# the dead highway: two concrete piers bands with rubble under; the deck is implied by tall walls at the piers
fill(1, 14, W - 2, 31, 'r')            # the shade under the deck (rubble)
for x in range(4, W - 4, 9):          # piers
    fill(x, 14, x + 1, 15, 'P'); fill(x, 30, x + 1, 31, 'P')
fill(1, 10, W - 2, 13, 'H')            # collapsed deck slabs along the north edge (walls: high)
for (x0, x1) in [(12, 16), (30, 34), (47, 51)]:
    fill(x0, 10, x1, 13, 'r')          # gaps in the collapse
# roads
fill(27, 32, 31, H - 2, ',')           # south road in
fill(W - 2, 20, W - 2, 23, ','); fill(50, 20, W - 2, 23, ',')   # north-east track out
fill(1, 20, 1, 23, ','); fill(1, 20, 8, 23, ',')                # west track (to the salt flats)
# Kessler's hall: a gutted coach of scrap
building(20, 17, 31, 23, 'S', 'm', [(25, 23)])
# Sallow Jack's bench: a lean-to of scrap against the east pier
building(40, 16, 46, 20, 'S', 'm', [(43, 20)])
# the pens: fenced yards
fill(6, 24, 16, 29, '.'); fill(6, 24, 16, 24, 'F'); fill(6, 29, 16, 29, 'F'); fill(6, 25, 6, 28, 'F'); fill(16, 25, 16, 28, 'F'); g[24][11] = '.'
fill(18, 25, 24, 29, '.'); fill(18, 25, 24, 25, 'F'); fill(18, 29, 24, 29, 'F'); fill(18, 26, 18, 28, 'F'); fill(24, 26, 24, 28, 'F'); g[25][21] = '.'
# the cage: a fenced cell by the hall
fill(33, 24, 36, 27, 'F'); fill(34, 25, 35, 26, 'c'); g[24][34] = 'G'   # gate tile (fence, but marked)
# the water: a concrete pad with the tank
fill(48, 25, 53, 29, 'c')
# tents and fires on sand north of the deck
fill(1, 1, W - 2, 9, '.')
# salt crust patches
for (x0, y0, x1, y1) in [(3, 2, 8, 4), (50, 3, 56, 6), (2, 36, 7, 40), (52, 38, 57, 42)]:
    fill(x0, y0, x1, y1, 's')

rows = [''.join(r) for r in g]

props = [
    # Kessler's hall: his table, a cot, the chest with what the Dogs have taken, a lamp
    {'kind': 'table', 'x': 25, 'y': 19, 'id': 'kessler_table'}, {'kind': 'chair', 'x': 26, 'y': 19, 'rot': 3}, {'kind': 'chair', 'x': 24, 'y': 19, 'rot': 1},
    {'kind': 'cot', 'x': 21, 'y': 18}, {'kind': 'locker', 'x': 29, 'y': 18, 'id': 'kessler_chest'}, {'kind': 'shelf', 'x': 30, 'y': 21, 'rot': 3},
    {'kind': 'barrel', 'x': 21, 'y': 22}, {'kind': 'crate', 'x': 22, 'y': 22, 'id': 'hall_crate'}, {'kind': 'lamp_post', 'x': 28, 'y': 22},
    {'kind': 'car_wreck', 'x': 33, 'y': 18, 'rot': 0}, {'kind': 'car_wreck', 'x': 17, 'y': 19, 'rot': 1, 'id': 'dog_truck'},
    # Jack's bench
    {'kind': 'table', 'x': 43, 'y': 18}, {'kind': 'shelf', 'x': 41, 'y': 17, 'rot': 1, 'id': 'jack_shelf'}, {'kind': 'machine', 'x': 45, 'y': 17}, {'kind': 'crate', 'x': 45, 'y': 19, 'id': 'jack_crate'},
    # the pens: Perpetua's post, troughs, the race line
    {'kind': 'barrel', 'x': 7, 'y': 25}, {'kind': 'barrel', 'x': 8, 'y': 25}, {'kind': 'crate', 'x': 15, 'y': 28}, {'kind': 'sign', 'x': 11, 'y': 23},
    {'kind': 'fence_post', 'x': 19, 'y': 26}, {'kind': 'fence_post', 'x': 23, 'y': 28}, {'kind': 'tire_pile', 'x': 20, 'y': 28},
    # the cage
    {'kind': 'cot', 'x': 35, 'y': 26}, {'kind': 'sign', 'x': 37, 'y': 24, 'id': 'cage_lock'},
    # the water: the tank, barrels, a guard's sandbags
    {'kind': 'tank', 'x': 50, 'y': 27, 'id': 'water_tank'}, {'kind': 'barrel', 'x': 52, 'y': 26}, {'kind': 'barrel', 'x': 52, 'y': 28}, {'kind': 'sandbags', 'x': 47, 'y': 26}, {'kind': 'sandbags', 'x': 47, 'y': 28},
    {'kind': 'pipe_h', 'x': 49, 'y': 29},
    # fires and tents under the deck and north of it
    {'kind': 'fire_barrel', 'x': 12, 'y': 20}, {'kind': 'fire_barrel', 'x': 38, 'y': 22}, {'kind': 'campfire', 'x': 27, 'y': 27}, {'kind': 'campfire', 'x': 36, 'y': 5},
    {'kind': 'tent', 'x': 10, 'y': 4}, {'kind': 'tent', 'x': 15, 'y': 6}, {'kind': 'tent', 'x': 22, 'y': 4}, {'kind': 'tent', 'x': 40, 'y': 4}, {'kind': 'tent', 'x': 45, 'y': 7},
    {'kind': 'cot', 'x': 12, 'y': 7}, {'kind': 'cot', 'x': 24, 'y': 7}, {'kind': 'crate', 'x': 42, 'y': 7, 'id': 'camp_crate'}, {'kind': 'barrel_rust', 'x': 31, 'y': 7},
    {'kind': 'sandbags', 'x': 26, 'y': 33}, {'kind': 'sandbags', 'x': 32, 'y': 33}, {'kind': 'sign', 'x': 32, 'y': 35}, {'kind': 'lamp_post', 'x': 25, 'y': 33},
    # wrecks and scatter: the highway's dead cars, pulled into walls
    {'kind': 'car_wreck', 'x': 5, 'y': 18, 'rot': 1}, {'kind': 'car_wreck', 'x': 55, 'y': 18, 'rot': 1}, {'kind': 'car_wreck', 'x': 9, 'y': 37, 'rot': 0}, {'kind': 'car_wreck', 'x': 48, 'y': 36, 'rot': 1},
    {'kind': 'tire_pile', 'x': 3, 'y': 28}, {'kind': 'debris', 'x': 36, 'y': 16}, {'kind': 'debris', 'x': 14, 'y': 17}, {'kind': 'debris', 'x': 20, 'y': 35}, {'kind': 'rock', 'x': 55, 'y': 40}, {'kind': 'rock_small', 'x': 4, 'y': 42},
    {'kind': 'dead_tree', 'x': 6, 'y': 33}, {'kind': 'dead_tree', 'x': 52, 'y': 33}, {'kind': 'cactus', 'x': 18, 'y': 40}, {'kind': 'cactus', 'x': 44, 'y': 2}, {'kind': 'barrel_rust', 'x': 36, 'y': 40},
]

overpass = {
    'id': 'overpass', 'name': 'The Overpass', 'seed': 77, 'settlement': 'rustdogs',
    'layout': rows,
    'legend': {
        '.': {'floor': 'sand'}, ',': {'floor': 'dirt'}, 'r': {'floor': 'rubble'}, 's': {'floor': 'rubble'}, 'c': {'floor': 'concrete'}, 'm': {'floor': 'metal'},
        'R': {'wall': 'rock', 'floor': 'sand', 'wallHeight': 3},
        'P': {'wall': 'concrete', 'floor': 'rubble', 'wallHeight': 4.5},
        'H': {'wall': 'concrete', 'floor': 'rubble', 'wallHeight': 3.6},
        'S': {'wall': 'scrap', 'floor': 'metal', 'wallHeight': 2.4},
        'F': {'wall': 'fence', 'floor': 'dirt', 'wallHeight': 1.3},
        'G': {'wall': 'fence', 'floor': 'dirt', 'wallHeight': 1.3},
    },
    'props': props,
    'lights': [
        {'x': 25, 'y': 20, 'height': 2.3, 'color': 'hex:0xffc890', 'intensity': 2.5, 'range': 8, 'flicker': 0.2},
        {'x': 43, 'y': 18, 'height': 2.3, 'color': 'hex:0xffd8a0', 'intensity': 2, 'range': 6, 'flicker': 0.3},
        {'x': 27, 'y': 27, 'height': 1.2, 'color': 'hex:0xff9a50', 'intensity': 2.5, 'range': 7, 'flicker': 0.4},
        {'x': 12, 'y': 20, 'height': 1.4, 'color': 'hex:0xff9a50', 'intensity': 2, 'range': 6, 'flicker': 0.4},
        {'x': 38, 'y': 22, 'height': 1.4, 'color': 'hex:0xff9a50', 'intensity': 2, 'range': 6, 'flicker': 0.4},
        {'x': 36, 'y': 5, 'height': 1.2, 'color': 'hex:0xff9a50', 'intensity': 2, 'range': 7, 'flicker': 0.4},
    ],
    'spawns': [
        {'id': 'start', 'x': 29, 'y': 41, 'facing': 0},
        {'id': 'from_shale', 'x': 29, 'y': 42, 'facing': 0},
        {'id': 'from_tollhouse', 'x': 56, 'y': 21, 'facing': 3},
        {'id': 'cage', 'x': 34, 'y': 23, 'facing': 2},
    ],
    'exits': [
        {'x': 27, 'y': 44, 'w': 5, 'h': 1, 'to': {'worldMap': True}, 'label': 'The road south'},
        {'x': 58, 'y': 20, 'w': 1, 'h': 4, 'to': {'worldMap': True}, 'label': 'The track north-east'},
    ],
    'talk': {
        'water_tank': {'dialogue': 'd_rd_tank', 'name': 'The water tank'},
        'kessler_chest': {'dialogue': 'd_rd_chest', 'name': 'Kessler\'s chest'},
        'kessler_table': {'dialogue': 'd_rd_table', 'name': 'Kessler\'s table'},
        'cage_lock': {'dialogue': 'd_rd_cage', 'name': 'The cage'},
        'dog_truck': {'dialogue': 'd_rd_truck', 'name': 'The Dogs\' truck'},
    },
    'containers': {
        'hall_crate': {'name': 'Hall Crate', 'items': [['c_jerky', 2], ['c_bitters', 1], ['a_38', 6]], 'lock': 30},
        'jack_shelf': {'name': 'Jack\'s Shelf', 'items': [['a_9mm', 8], ['j_powder', 1], ['t_repair', 1]], 'lock': 35},
        'jack_crate': {'name': 'Jack\'s Crate', 'items': [['j_scrap', 4], ['j_casings', 10]]},
        'camp_crate': {'name': 'Camp Crate', 'items': [['c_dirtywater', 2], ['j_cloth', 2]]},
    },
    'spots': {
        'hall': {'x': 25, 'y': 20}, 'hall_door': {'x': 25, 'y': 24}, 'hall_cot': {'x': 22, 'y': 18},
        'vasha': {'x': 33, 'y': 20}, 'vasha_fire': {'x': 37, 'y': 21},
        'lookout': {'x': 29, 'y': 34}, 'lookout_b': {'x': 13, 'y': 11}, 'gate': {'x': 29, 'y': 36},
        'pens': {'x': 11, 'y': 26}, 'pens_b': {'x': 21, 'y': 27}, 'bench': {'x': 43, 'y': 19}, 'tank': {'x': 49, 'y': 26},
        'fire_a': {'x': 26, 'y': 28}, 'fire_b': {'x': 13, 'y': 21}, 'fire_c': {'x': 35, 'y': 6}, 'tent_a': {'x': 11, 'y': 6}, 'tent_b': {'x': 23, 'y': 6}, 'tent_c': {'x': 41, 'y': 6},
        'cage': {'x': 34, 'y': 25},
    },
    'npcs': [
        {'def': 'npc_rd_01', 'x': 25, 'y': 20, 'facing': 2},
        {'def': 'npc_rd_02', 'x': 33, 'y': 20, 'facing': 3},
        {'def': 'npc_rd_03', 'x': 29, 'y': 34, 'facing': 2, 'if': {'not': {'inParty': 'npc_rd_03'}}},
        {'def': 'npc_rd_05', 'x': 11, 'y': 26, 'facing': 1},
        {'def': 'npc_rd_06', 'x': 29, 'y': 36, 'facing': 2},
        {'def': 'npc_rd_07', 'x': 43, 'y': 19, 'facing': 2},
        {'def': 'npc_sh_07', 'x': 34, 'y': 25, 'facing': 2, 'if': {'not': {'flag': 'teo_freed'}}},
        {'def': 'npc_rd_g1', 'x': 49, 'y': 26, 'facing': 3}, {'def': 'npc_rd_g2', 'x': 26, 'y': 28, 'facing': 0}, {'def': 'npc_rd_g3', 'x': 13, 'y': 21, 'facing': 1},
        {'def': 'npc_rd_g4', 'x': 35, 'y': 6, 'facing': 2}, {'def': 'npc_rd_g5', 'x': 13, 'y': 11, 'facing': 2}, {'def': 'npc_rd_g6', 'x': 23, 'y': 6, 'facing': 2},
    ],
    'triggers': [
        {'id': 'gate', 'x': 26, 'y': 36, 'w': 7, 'h': 2, 'if': {'not': {'flag': 'rd_admitted'}}, 'effects': [{'event': 'dialogue', 'data': {'tree': 'd_rd_gate', 'name': 'The gate'}}]},
        {'id': 'arrive', 'x': 26, 'y': 38, 'w': 7, 'h': 4, 'text': 'The dead highway lies across the sky on its piers, and under it, in the shade, the Rust Dogs have made a town out of what the highway dropped.', 'effects': [{'learn': 'seen_overpass'}]},
        {'id': 'water', 'x': 47, 'y': 24, 'w': 7, 'h': 6, 'text': 'Shale\'s water, in a tank with Shale\'s name still stencilled on it.', 'effects': [{'learn': 'seen_stolen_water'}]},
    ],
    'extras': [
        {'count': 5, 'roles': ['raider', 'raider', 'street'], 'life': 'hard', 'team': 'rustdogs', 'faction': 'rust_dogs', 'hostileIf': {'flag': 'rustdogs_hostile'}, 'area': {'x': 20, 'y': 17, 'w': 22, 'h': 10}},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0xb8a284', 'fogDensity': 0.02, 'dust': 0.9, 'grade': 0.75, 'mood': 'grim', 'sound': 'wind'},
}

HEADER = "import type { MapDef } from '../../engine/data/types';\n\n// Generated by tools/maps/gen_overpass.py — edit the generator, then re-run it.\n"
with open(os.path.join(ROOT, 'src', 'content', 'maps', 'overpass.ts'), 'w') as f:
    f.write(f"{HEADER}export const overpass: MapDef = {ts(overpass)};\n")
print('overpass', W, 'x', H)
