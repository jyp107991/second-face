#!/usr/bin/env python3
"""Generates src/content/maps/shale.ts — Shale, the well-town (DESIGN: well_town, adobe kit, drought).

Two pumps in a rubble plaza, a saloon, the sheriff's office, the Tollmen post, the Choir's tents, a Mender's
shed, the pump house, the caravan post, and a scatter of mud-brick homes. Roads leave west (to the Cistern and
the overpass) and east (to Dry Wells and the Tollhouse).
    python3 tools/maps/gen_shale.py
"""
import json, os, re

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
W, H = 64, 52


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
    """Walls on the rectangle's edge, floor inside, doors as floor tiles in the wall."""
    fill(x0, y0, x1, y1, wall)
    fill(x0 + 1, y0 + 1, x1 - 1, y1 - 1, floor)
    for (x, y) in doors:
        g[y][x] = floor


# rock rim, road gaps west and east
fill(0, 0, W - 1, 0, 'R'); fill(0, H - 1, W - 1, H - 1, 'R'); fill(0, 0, 0, H - 1, 'R'); fill(W - 1, 0, W - 1, H - 1, 'R')
fill(0, 24, 0, 26, ','); fill(W - 1, 24, W - 1, 26, ',')
# streets
fill(1, 23, W - 2, 27, ',')            # main street
fill(30, 4, 33, 48, ',')               # north–south street
fill(26, 17, 38, 22, 'r')              # wells plaza (rubble)
fill(29, 18, 35, 21, 'c')              # the pump apron
# salt crust and hardpan patches
for (x0, y0, x1, y1) in [(3, 3, 9, 6), (54, 3, 60, 8), (3, 36, 6, 40), (58, 38, 61, 41), (20, 48, 27, 50)]:
    fill(x0, y0, x1, y1, 's')

# The Dry Well (saloon) — wood, door south onto the street; back room is the rentable bed
building(8, 12, 22, 21, 'W', 'w', [(15, 21)])
fill(9, 18, 12, 20, 'w'); g[18][13] = 'W'; g[19][13] = 'W'; g[20][13] = 'w'   # back room partition with a doorway at (13,20)
# Sheriff's office — brick; a cell of fence inside
building(40, 12, 50, 20, 'B', 'c', [(45, 20)])
fill(47, 16, 49, 16, 'F'); fill(47, 17, 47, 19, 'F'); g[18][47] = 'c'        # cell bars with a gate tile
# Tollmen post — concrete, door north
building(40, 29, 52, 37, 'C', 'c', [(46, 29)])
# Mender's shed — scrap
building(54, 13, 61, 20, 'S', 'c', [(57, 20)])
# Pump house — metal/scrap, door south
building(24, 6, 29, 11, 'S', 'm', [(26, 11)])
# Caravan post — open-sided: fence posts and a counter under a wood roofline
building(54, 29, 61, 36, 'F', 'w', [(57, 29), (54, 32)])
# Choir mission — a fenced yard with tents
fill(7, 30, 21, 41, '.'); fill(7, 30, 21, 30, 'F'); fill(7, 41, 21, 41, 'F'); fill(7, 31, 7, 40, 'F'); fill(21, 31, 21, 40, 'F')
g[30][13] = '.'; g[30][14] = '.'
# militia yard
fill(36, 4, 44, 10, 'r')
# homes
for (x0, y0) in [(3, 42), (11, 42), (21, 42), (37, 42), (46, 42), (54, 42)]:
    building(x0, y0, x0 + 5, y0 + 5, 'B', 'c', [(x0 + 2, y0)])
for (x0, y0) in [(4, 8), (12, 4), (48, 4)]:
    building(x0, y0, x0 + 5, y0 + 4, 'B', 'c', [(x0 + 2, y0 + 4)])

rows = [''.join(r) for r in g]

props = [
    # wells plaza
    {'kind': 'machine', 'x': 31, 'y': 19, 'id': 'pump_a'}, {'kind': 'machine', 'x': 33, 'y': 19, 'id': 'pump_b'}, {'kind': 'tank', 'x': 35, 'y': 20},
    {'kind': 'barrel', 'x': 29, 'y': 21}, {'kind': 'barrel', 'x': 30, 'y': 21}, {'kind': 'pipe_h', 'x': 32, 'y': 18}, {'kind': 'fire_barrel', 'x': 27, 'y': 18},
    {'kind': 'crate', 'x': 37, 'y': 18, 'id': 'water_crate'}, {'kind': 'sign', 'x': 28, 'y': 22}, {'kind': 'lamp_post', 'x': 26, 'y': 22}, {'kind': 'lamp_post', 'x': 38, 'y': 22},
    # saloon
    *[{'kind': 'counter', 'x': x, 'y': 13} for x in range(10, 15)], {'kind': 'stove', 'x': 9, 'y': 13}, {'kind': 'shelf', 'x': 16, 'y': 13, 'rot': 2, 'id': 'bar_shelf'},
    {'kind': 'table', 'x': 12, 'y': 17}, {'kind': 'chair', 'x': 11, 'y': 17, 'rot': 1}, {'kind': 'chair', 'x': 13, 'y': 17, 'rot': 3},
    {'kind': 'table', 'x': 16, 'y': 17}, {'kind': 'chair', 'x': 15, 'y': 17, 'rot': 1}, {'kind': 'chair', 'x': 17, 'y': 17, 'rot': 3},
    {'kind': 'table', 'x': 19, 'y': 15, 'id': 'dust_table'}, {'kind': 'chair', 'x': 18, 'y': 15, 'rot': 1}, {'kind': 'chair', 'x': 20, 'y': 15, 'rot': 3},
    {'kind': 'table', 'x': 19, 'y': 19}, {'kind': 'chair', 'x': 20, 'y': 19, 'rot': 3}, {'kind': 'barrel', 'x': 21, 'y': 20},
    {'kind': 'bed', 'x': 10, 'y': 19, 'id': 'room_bed'}, {'kind': 'locker', 'x': 9, 'y': 18, 'id': 'room_locker'}, {'kind': 'lamp_post', 'x': 21, 'y': 14},
    {'kind': 'chair', 'x': 6, 'y': 22, 'rot': 0}, {'kind': 'barrel_rust', 'x': 5, 'y': 22}, {'kind': 'sign', 'x': 16, 'y': 22},
    # sheriff's office
    {'kind': 'table', 'x': 44, 'y': 15}, {'kind': 'chair', 'x': 44, 'y': 16, 'rot': 0}, {'kind': 'chair', 'x': 43, 'y': 15, 'rot': 1},
    {'kind': 'locker', 'x': 41, 'y': 13, 'id': 'militia_locker'}, {'kind': 'locker', 'x': 42, 'y': 13}, {'kind': 'shelf', 'x': 49, 'y': 13, 'rot': 3},
    {'kind': 'cot', 'x': 48, 'y': 19}, {'kind': 'terminal', 'x': 41, 'y': 19, 'rot': 1}, {'kind': 'sandbags', 'x': 39, 'y': 21}, {'kind': 'sign', 'x': 46, 'y': 21},
    # Tollmen post
    *[{'kind': 'counter', 'x': x, 'y': 32} for x in range(44, 49)], {'kind': 'shelf', 'x': 51, 'y': 31, 'rot': 3}, {'kind': 'shelf', 'x': 51, 'y': 33, 'rot': 3},
    {'kind': 'crate', 'x': 41, 'y': 36}, {'kind': 'crate', 'x': 42, 'y': 36, 'id': 'toll_crate'}, {'kind': 'table', 'x': 47, 'y': 35}, {'kind': 'chair', 'x': 46, 'y': 35, 'rot': 1},
    {'kind': 'terminal', 'x': 50, 'y': 36, 'rot': 3}, {'kind': 'sign', 'x': 45, 'y': 28}, {'kind': 'lamp_post', 'x': 48, 'y': 28}, {'kind': 'barrel', 'x': 53, 'y': 30},
    # Mender's shed
    {'kind': 'table', 'x': 57, 'y': 16}, {'kind': 'machine', 'x': 60, 'y': 15}, {'kind': 'shelf', 'x': 55, 'y': 14, 'rot': 1, 'id': 'mender_shelf'}, {'kind': 'cot', 'x': 60, 'y': 19},
    {'kind': 'locker', 'x': 55, 'y': 19}, {'kind': 'sign', 'x': 58, 'y': 21}, {'kind': 'fire_barrel', 'x': 56, 'y': 22},
    # pump house
    {'kind': 'machine', 'x': 25, 'y': 7}, {'kind': 'machine', 'x': 28, 'y': 7}, {'kind': 'pipe_h', 'x': 26, 'y': 7}, {'kind': 'pipe_h', 'x': 27, 'y': 7},
    {'kind': 'table', 'x': 28, 'y': 10}, {'kind': 'shelf', 'x': 25, 'y': 10, 'rot': 1, 'id': 'pump_shelf'}, {'kind': 'tank', 'x': 23, 'y': 9}, {'kind': 'pipe_h', 'x': 24, 'y': 12}, {'kind': 'pipe_h', 'x': 25, 'y': 12},
    # caravan post
    {'kind': 'counter', 'x': 57, 'y': 33}, {'kind': 'counter', 'x': 58, 'y': 33}, {'kind': 'crate', 'x': 60, 'y': 30, 'id': 'caravan_crate'}, {'kind': 'crate', 'x': 60, 'y': 31},
    {'kind': 'barrel', 'x': 55, 'y': 35}, {'kind': 'barrel', 'x': 56, 'y': 35}, {'kind': 'lamp_post', 'x': 53, 'y': 37}, {'kind': 'car_wreck', 'x': 58, 'y': 25, 'rot': 0},
    {'kind': 'tire_pile', 'x': 61, 'y': 38},
    # Choir mission
    {'kind': 'tent', 'x': 10, 'y': 33}, {'kind': 'tent', 'x': 15, 'y': 33}, {'kind': 'tent', 'x': 19, 'y': 33}, {'kind': 'cot', 'x': 10, 'y': 37}, {'kind': 'cot', 'x': 13, 'y': 37},
    {'kind': 'campfire', 'x': 16, 'y': 38}, {'kind': 'planter', 'x': 8, 'y': 39}, {'kind': 'planter', 'x': 9, 'y': 39}, {'kind': 'table', 'x': 19, 'y': 38}, {'kind': 'crate', 'x': 20, 'y': 39, 'id': 'choir_crate'},
    {'kind': 'sign', 'x': 12, 'y': 29}, {'kind': 'barrel', 'x': 8, 'y': 31},
    # militia yard
    {'kind': 'sandbags', 'x': 37, 'y': 5}, {'kind': 'sandbags', 'x': 38, 'y': 5}, {'kind': 'sandbags', 'x': 43, 'y': 9}, {'kind': 'sign', 'x': 43, 'y': 5}, {'kind': 'crate', 'x': 37, 'y': 9},
    {'kind': 'fence_post', 'x': 36, 'y': 7}, {'kind': 'barrel_rust', 'x': 44, 'y': 7},
    # homes: a bed each
    *[{'kind': 'bed', 'x': x0 + 1, 'y': y0 + 1} for (x0, y0) in [(3, 42), (11, 42), (21, 42), (37, 42), (46, 42), (54, 42)]],
    *[{'kind': 'bed', 'x': x0 + 1, 'y': y0 + 1} for (x0, y0) in [(4, 8), (12, 4), (48, 4)]],
    {'kind': 'crate', 'x': 25, 'y': 46, 'id': 'home_crate'},
    # scatter
    {'kind': 'dead_tree', 'x': 3, 'y': 30}, {'kind': 'dead_tree', 'x': 60, 'y': 10}, {'kind': 'dead_tree', 'x': 24, 'y': 38}, {'kind': 'cactus', 'x': 5, 'y': 16}, {'kind': 'cactus', 'x': 52, 'y': 10},
    {'kind': 'cactus', 'x': 35, 'y': 40}, {'kind': 'rock', 'x': 2, 'y': 48}, {'kind': 'rock_small', 'x': 50, 'y': 24}, {'kind': 'rock_small', 'x': 36, 'y': 14}, {'kind': 'debris', 'x': 24, 'y': 16},
    {'kind': 'debris', 'x': 52, 'y': 39}, {'kind': 'car_wreck', 'x': 20, 'y': 8, 'rot': 1}, {'kind': 'tire_pile', 'x': 3, 'y': 20}, {'kind': 'barrel_rust', 'x': 35, 'y': 26}, {'kind': 'fire_barrel', 'x': 34, 'y': 28},
    {'kind': 'lamp_post', 'x': 20, 'y': 28}, {'kind': 'lamp_post', 'x': 10, 'y': 22}, {'kind': 'lamp_post', 'x': 38, 'y': 28}, {'kind': 'sandbags', 'x': 2, 'y': 23}, {'kind': 'sandbags', 'x': 2, 'y': 27},
    {'kind': 'sandbags', 'x': 61, 'y': 23}, {'kind': 'sandbags', 'x': 61, 'y': 27}, {'kind': 'sign', 'x': 3, 'y': 24, 'id': 'west_sign'},
]

shale = {
    'id': 'shale', 'name': 'Shale', 'seed': 31, 'settlement': 'shale',
    'layout': rows,
    'legend': {
        '.': {'floor': 'sand'}, ',': {'floor': 'dirt'}, 'r': {'floor': 'rubble'}, 's': {'floor': 'rubble'}, 'c': {'floor': 'concrete'}, 'w': {'floor': 'wood'}, 'm': {'floor': 'metal'},
        'R': {'wall': 'rock', 'floor': 'sand', 'wallHeight': 3},
        'B': {'wall': 'brick', 'floor': 'dirt', 'wallHeight': 2.6},
        'W': {'wall': 'wood', 'floor': 'wood', 'wallHeight': 2.8},
        'C': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 2.8},
        'S': {'wall': 'scrap', 'floor': 'dirt', 'wallHeight': 2.4},
        'F': {'wall': 'fence', 'floor': 'dirt', 'wallHeight': 1.2},
    },
    'props': props,
    'lights': [
        {'x': 12, 'y': 15, 'height': 2.4, 'color': 'hex:0xffc890', 'intensity': 2.5, 'range': 8, 'flicker': 0.15},
        {'x': 19, 'y': 17, 'height': 2.4, 'color': 'hex:0xffc890', 'intensity': 2, 'range': 7, 'flicker': 0.2},
        {'x': 45, 'y': 16, 'height': 2.4, 'color': 'hex:0xffe0b0', 'intensity': 2, 'range': 7},
        {'x': 46, 'y': 33, 'height': 2.4, 'color': 'hex:0xd8ffe8', 'intensity': 2.5, 'range': 8},
        {'x': 57, 'y': 17, 'height': 2.4, 'color': 'hex:0x9affc0', 'intensity': 2, 'range': 6, 'flicker': 0.3},
        {'x': 26, 'y': 9, 'height': 2.4, 'color': 'hex:0xffd8a0', 'intensity': 1.5, 'range': 6, 'flicker': 0.2},
        {'x': 57, 'y': 32, 'height': 2.4, 'color': 'hex:0xffd8a0', 'intensity': 1.5, 'range': 6},
        {'x': 13, 'y': 35, 'height': 2.4, 'color': 'hex:0xffe8c0', 'intensity': 1.5, 'range': 8},
    ],
    'spawns': [
        {'id': 'start', 'x': 31, 'y': 25, 'facing': 0},
        {'id': 'west', 'x': 2, 'y': 25, 'facing': 1},
        {'id': 'east', 'x': 61, 'y': 25, 'facing': 3},
        {'id': 'from_cistern9', 'x': 2, 'y': 25, 'facing': 1},
        {'id': 'from_rustdogs', 'x': 2, 'y': 24, 'facing': 1},
        {'id': 'from_drywells', 'x': 61, 'y': 25, 'facing': 3},
        {'id': 'from_tollhouse', 'x': 61, 'y': 26, 'facing': 3},
    ],
    'exits': [
        {'x': 0, 'y': 24, 'w': 1, 'h': 3, 'to': {'worldMap': True}, 'label': 'The west road'},
        {'x': 63, 'y': 24, 'w': 1, 'h': 3, 'to': {'worldMap': True}, 'label': 'The east road'},
    ],
    'talk': {
        'room_bed': {'dialogue': 'd_sh_room', 'name': 'The back room'},
        'pump_a': {'dialogue': 'd_sh_pumps', 'name': 'The pumps'},
        'pump_b': {'dialogue': 'd_sh_pumps', 'name': 'The pumps'},
        'west_sign': {'dialogue': 'd_sh_tracks', 'name': 'The west road'},
    },
    'containers': {
        'bar_shelf': {'name': 'Bar Shelf', 'items': [['c_bitters', 2], ['c_dirtywater', 2], ['j_glass', 3]], 'lock': 15},
        'room_locker': {'name': 'Room Locker', 'items': []},
        'militia_locker': {'name': 'Militia Locker', 'items': [['a_38', 10], ['c_bandage', 1], ['w_zip38', 1]], 'lock': 45},
        'toll_crate': {'name': 'Tollmen Crate', 'items': [['c_tin', 2], ['j_fuel', 1]], 'lock': 50},
        'mender_shelf': {'name': 'Mender\'s Shelf', 'items': [['c_bandage', 2], ['c_splint', 1], ['t_repair', 1]], 'lock': 30},
        'pump_shelf': {'name': 'Pump Spares', 'items': [['j_wiring', 2], ['j_scrap', 3], ['t_repair', 1]], 'lock': 20},
        'caravan_crate': {'name': 'Caravan Crate', 'items': [['c_jerky', 2], ['c_water', 2], ['a_9mm', 8]], 'lock': 35},
        'choir_crate': {'name': 'Mission Stores', 'items': [['c_bandage', 2], ['c_algae', 2], ['c_water', 2]]},
        'water_crate': {'name': 'Water Crate', 'items': [['c_dirtywater', 3]]},
        'home_crate': {'name': 'Household Crate', 'items': [['j_cloth', 2], ['c_jerky', 1]]},
    },
    'spots': {
        'bar': {'x': 12, 'y': 14}, 'bar_hand': {'x': 14, 'y': 14}, 'saloon_table': {'x': 16, 'y': 18}, 'dust': {'x': 18, 'y': 16}, 'awning': {'x': 6, 'y': 23},
        'sheriff_desk': {'x': 45, 'y': 16}, 'deputy': {'x': 43, 'y': 18}, 'corporal': {'x': 47, 'y': 14}, 'yard': {'x': 40, 'y': 7}, 'yard_b': {'x': 41, 'y': 8},
        'toll_counter': {'x': 46, 'y': 33}, 'toll_desk': {'x': 47, 'y': 34},
        'mission': {'x': 13, 'y': 35}, 'mission_cot': {'x': 11, 'y': 36}, 'mission_fire': {'x': 15, 'y': 39},
        'mender': {'x': 57, 'y': 17}, 'mender_cot': {'x': 59, 'y': 19},
        'pump_house': {'x': 26, 'y': 9}, 'wells': {'x': 30, 'y': 20}, 'wells_b': {'x': 34, 'y': 21}, 'plaza': {'x': 36, 'y': 19},
        'caravan': {'x': 57, 'y': 34}, 'caravan_b': {'x': 59, 'y': 32},
        'street_w': {'x': 12, 'y': 25}, 'street_e': {'x': 50, 'y': 25}, 'street_c': {'x': 31, 'y': 29}, 'street_n': {'x': 31, 'y': 12},
        'home_a': {'x': 5, 'y': 44}, 'home_b': {'x': 13, 'y': 44}, 'home_c': {'x': 23, 'y': 44}, 'home_d': {'x': 39, 'y': 44}, 'home_e': {'x': 48, 'y': 44}, 'home_f': {'x': 56, 'y': 44},
        'home_g': {'x': 6, 'y': 10}, 'home_h': {'x': 14, 'y': 6}, 'home_i': {'x': 50, 'y': 6},
    },
    'npcs': [
        {'def': 'npc_sh_01', 'x': 45, 'y': 16, 'facing': 2}, {'def': 'npc_sh_02', 'x': 43, 'y': 18, 'facing': 1}, {'def': 'npc_sh_11', 'x': 40, 'y': 7, 'facing': 2},
        {'def': 'npc_sh_03', 'x': 12, 'y': 14, 'facing': 2}, {'def': 'npc_sh_10', 'x': 14, 'y': 14, 'facing': 2}, {'def': 'npc_sh_06', 'x': 6, 'y': 23, 'facing': 1},
        {'def': 'npc_sh_04', 'x': 46, 'y': 33, 'facing': 0}, {'def': 'npc_sh_05', 'x': 13, 'y': 35, 'facing': 2}, {'def': 'npc_sh_08', 'x': 57, 'y': 17, 'facing': 2},
        {'def': 'npc_sh_09', 'x': 26, 'y': 9, 'facing': 2}, {'def': 'npc_sh_12', 'x': 30, 'y': 20, 'facing': 1}, {'def': 'npc_sh_13', 'x': 57, 'y': 34, 'facing': 0},
        {'def': 'npc_sh_14', 'x': 12, 'y': 25, 'facing': 1}, {'def': 'npc_sh_15', 'x': 34, 'y': 21, 'facing': 3}, {'def': 'npc_sh_16', 'x': 50, 'y': 25, 'facing': 3},
    ],
    'triggers': [
        {'id': 'arrive_w', 'x': 1, 'y': 23, 'w': 4, 'h': 5, 'text': 'Shale. Mud-brick and scrap around two pumps, a saloon, a flag that was a sheet once. Twenty-odd houses and a lot of empty ones.', 'effects': [{'learn': 'seen_shale'}]},
        {'id': 'arrive_e', 'x': 59, 'y': 23, 'w': 4, 'h': 5, 'text': 'Shale. Mud-brick and scrap around two pumps, a saloon, a flag that was a sheet once. Twenty-odd houses and a lot of empty ones.', 'effects': [{'learn': 'seen_shale'}]},
        {'id': 'pumps', 'x': 28, 'y': 17, 'w': 10, 'h': 6, 'text': 'The pumps run in short bursts, then stop, then run — on a clock nobody in Shale set.', 'effects': [{'learn': 'pumps_on_a_clock'}]},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0xc8ae86', 'fogDensity': 0.016, 'dust': 0.8, 'grade': 0.7, 'sound': 'wind'},
}

HEADER = "import type { MapDef } from '../../engine/data/types';\n\n// Generated by tools/maps/gen_shale.py — edit the generator, then re-run it.\n"
with open(os.path.join(ROOT, 'src', 'content', 'maps', 'shale.ts'), 'w') as f:
    f.write(f"{HEADER}export const shale: MapDef = {ts(shale)};\n")
print('shale', W, 'x', H)
