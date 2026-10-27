#!/usr/bin/env python3
"""Generates src/content/maps/openfield.ts — Openfield, the Choir's farming commune on the Glass Flats
(DESIGN §13b: commune — fields, long halls, shrines, open-sky burial grounds; healers, communal law).

A dirt lane runs west→east through the middle. North of it: the fields in rows, the sky-shrine, the seed store and
the Elder's house round the well. South: two long timber halls (the common hall; the sick hall), the threshing
yard, the refugees' tents. East: the open-sky burial ground under a dead windpump.
    python3 tools/maps/gen_openfield.py
"""
import json, os, re

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
W, H = 64, 56


def ts(obj):
    s = json.dumps(obj, indent=2)
    s = re.sub(r'"([A-Za-z_][A-Za-z0-9_]*)":', r'\1:', s)
    s = re.sub(r'"hex:(0x[0-9a-fA-F]+)"', r'\1', s)
    return s


g = [[','] * W for _ in range(H)]


def fill(x0, y0, x1, y1, ch):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            g[y][x] = ch


def building(x0, y0, x1, y1, wall, floor, doors):
    fill(x0, y0, x1, y1, wall)
    fill(x0 + 1, y0 + 1, x1 - 1, y1 - 1, floor)
    for (x, y) in doors:
        g[y][x] = floor


# rock rim with the lane cut through east and west
fill(0, 0, W - 1, 0, 'R'); fill(0, H - 1, W - 1, H - 1, 'R'); fill(0, 0, 0, H - 1, 'R'); fill(W - 1, 0, W - 1, H - 1, 'R')
fill(0, 26, 0, 29, 'l'); fill(W - 1, 26, W - 1, 29, 'l')
# the glass crust beyond the fields, north and south edges
fill(1, 1, W - 2, 1, 'g'); fill(1, H - 2, W - 2, H - 2, 'g')
fill(1, 2, 4, 12, 'g'); fill(59, 2, 62, 10, 'g'); fill(1, 44, 5, 54, 'g'); fill(58, 48, 62, 54, 'g')
# the lane
fill(1, 26, 62, 29, 'l')
# the fields: tilled rows north of the lane (blighted rows marked for the props)
fill(6, 3, 56, 13, 'd')
# the village green round the well
fill(26, 18, 38, 25, 'd')
fill(31, 21, 33, 23, 'c')
# the sky-shrine: a timber deck north of the green
fill(29, 14, 35, 17, 'w')
# the seed store (timber, door south) and the Elder's house (timber, door south)
building(17, 17, 24, 23, 'W', 'w', [(21, 23)])
building(40, 17, 47, 24, 'W', 'w', [(43, 24)])
# the son's hut, west
building(8, 19, 13, 24, 'W', 'w', [(11, 24)])
# the common hall and the sick hall, south of the lane
building(12, 32, 29, 40, 'W', 'w', [(20, 32), (20, 40)])
building(34, 32, 48, 38, 'W', 'w', [(41, 32)])
# the threshing yard and the refugees' camp
fill(14, 43, 28, 50, 'c')
fill(50, 38, 60, 48, 'd')
# the burial ground, east of the green
fill(49, 12, 60, 24, 'd')

rows = [''.join(r) for r in g]

# planted rows: a planter every other tile on the even rows; the blighted rows (4, 8, 12) are thin and dead
props = []
for y in (4, 6, 8, 10, 12):
    for x in range(7, 56, 2):
        if y in (4, 8, 12):
            if (x // 2) % 3 == 0: props.append({'kind': 'planter', 'x': x, 'y': y})
            elif (x // 2) % 3 == 1: props.append({'kind': 'debris', 'x': x, 'y': y})
        else:
            props.append({'kind': 'planter', 'x': x, 'y': y})
props += [
    # the well on its pad; the green: a wagon, a water barrel, a notice post
    {'kind': 'pump', 'x': 32, 'y': 22, 'id': 'of_well'}, {'kind': 'barrel', 'x': 34, 'y': 23}, {'kind': 'barrel', 'x': 30, 'y': 23}, {'kind': 'sign', 'x': 27, 'y': 20, 'rot': 1, 'id': 'of_board'},
    {'kind': 'wagon', 'x': 36, 'y': 19, 'rot': 0}, {'kind': 'crate', 'x': 28, 'y': 24}, {'kind': 'blanket', 'x': 35, 'y': 24},
    # the sky-shrine: the fire, benches, the sign of the open sky
    {'kind': 'campfire', 'x': 32, 'y': 15, 'id': 'of_sky_fire'}, {'kind': 'chair', 'x': 30, 'y': 16, 'rot': 1}, {'kind': 'chair', 'x': 34, 'y': 16, 'rot': 3}, {'kind': 'chair', 'x': 30, 'y': 14, 'rot': 1}, {'kind': 'chair', 'x': 34, 'y': 14, 'rot': 3},
    {'kind': 'sign', 'x': 32, 'y': 13, 'rot': 2, 'id': 'of_shrine_sign'},
    # the seed store: shelves, the seed crates, a table with the tally
    {'kind': 'shelf', 'x': 18, 'y': 18, 'rot': 0}, {'kind': 'shelf', 'x': 19, 'y': 18, 'rot': 0}, {'kind': 'shelf', 'x': 23, 'y': 19, 'rot': 3}, {'kind': 'shelf', 'x': 23, 'y': 20, 'rot': 3},
    {'kind': 'crate', 'x': 18, 'y': 21, 'id': 'of_seed_crate'}, {'kind': 'crate', 'x': 19, 'y': 21}, {'kind': 'crate', 'x': 18, 'y': 22, 'id': 'of_seed_crate_b'}, {'kind': 'table', 'x': 21, 'y': 19, 'id': 'of_tally'}, {'kind': 'locker', 'x': 23, 'y': 22, 'id': 'of_store_locker'},
    # the Elder's house: a bed, a table, the shelf of books, a stove
    {'kind': 'bed', 'x': 41, 'y': 18, 'rot': 1}, {'kind': 'table', 'x': 43, 'y': 20, 'id': 'of_mason_table'}, {'kind': 'chair', 'x': 43, 'y': 21, 'rot': 0}, {'kind': 'chair', 'x': 44, 'y': 20, 'rot': 3},
    {'kind': 'shelf', 'x': 46, 'y': 18, 'rot': 3}, {'kind': 'shelf', 'x': 46, 'y': 19, 'rot': 3}, {'kind': 'stove', 'x': 41, 'y': 23}, {'kind': 'locker', 'x': 46, 'y': 23, 'id': 'of_mason_locker'},
    # the son's hut: a cot, a bench, and under the bench what he keeps
    {'kind': 'cot', 'x': 9, 'y': 20, 'rot': 1}, {'kind': 'table', 'x': 12, 'y': 21, 'id': 'of_tobias_bench'}, {'kind': 'crate', 'x': 12, 'y': 22, 'id': 'of_tobias_crate'}, {'kind': 'barrel', 'x': 9, 'y': 23},
    # the common hall: long tables, benches, cots at the west end, the stove, the hatch to the cellar at the far west
    {'kind': 'table', 'x': 22, 'y': 35}, {'kind': 'table', 'x': 23, 'y': 35}, {'kind': 'table', 'x': 24, 'y': 35}, {'kind': 'table', 'x': 25, 'y': 35},
    {'kind': 'chair', 'x': 22, 'y': 34, 'rot': 2}, {'kind': 'chair', 'x': 24, 'y': 34, 'rot': 2}, {'kind': 'chair', 'x': 23, 'y': 36, 'rot': 0}, {'kind': 'chair', 'x': 25, 'y': 36, 'rot': 0},
    {'kind': 'cot', 'x': 14, 'y': 33, 'rot': 1}, {'kind': 'cot', 'x': 14, 'y': 36, 'rot': 1}, {'kind': 'cot', 'x': 17, 'y': 33, 'rot': 1}, {'kind': 'cot', 'x': 17, 'y': 36, 'rot': 1},
    {'kind': 'stove', 'x': 27, 'y': 33}, {'kind': 'barrel', 'x': 27, 'y': 38}, {'kind': 'shelf', 'x': 28, 'y': 36, 'rot': 3},
    {'kind': 'vault_door', 'x': 13, 'y': 39, 'rot': 0, 'id': 'of_cellar'},
    # the sick hall: cots, the healer's table, shelves
    {'kind': 'cot', 'x': 36, 'y': 34, 'rot': 1, 'id': 'of_cot_a'}, {'kind': 'cot', 'x': 36, 'y': 36, 'rot': 1, 'id': 'of_cot_b'}, {'kind': 'cot', 'x': 46, 'y': 34, 'rot': 3, 'id': 'of_cot_c'}, {'kind': 'cot', 'x': 46, 'y': 36, 'rot': 3},
    {'kind': 'table', 'x': 41, 'y': 35, 'id': 'of_healer_table'}, {'kind': 'shelf', 'x': 35, 'y': 33, 'rot': 1}, {'kind': 'shelf', 'x': 47, 'y': 33, 'rot': 3}, {'kind': 'stove', 'x': 47, 'y': 37}, {'kind': 'barrel', 'x': 35, 'y': 37},
    # the threshing yard: a wagon, barrels, a horse line, a tank
    {'kind': 'wagon', 'x': 17, 'y': 46, 'rot': 1}, {'kind': 'horse', 'x': 24, 'y': 45, 'rot': 0}, {'kind': 'horse', 'x': 26, 'y': 45, 'rot': 0}, {'kind': 'barrel', 'x': 15, 'y': 44}, {'kind': 'barrel', 'x': 15, 'y': 45},
    {'kind': 'crate', 'x': 27, 'y': 49}, {'kind': 'crate', 'x': 26, 'y': 49, 'id': 'of_yard_crate'}, {'kind': 'tank', 'x': 20, 'y': 49}, {'kind': 'fence_post', 'x': 22, 'y': 44}, {'kind': 'fence_post', 'x': 28, 'y': 44},
    # the refugees' camp: tents, a fire, a blanket
    {'kind': 'tent', 'x': 52, 'y': 40, 'rot': 1}, {'kind': 'tent', 'x': 52, 'y': 45, 'rot': 1}, {'kind': 'tent', 'x': 58, 'y': 42, 'rot': 3}, {'kind': 'campfire', 'x': 55, 'y': 43, 'id': 'of_camp_fire'},
    {'kind': 'blanket', 'x': 56, 'y': 46}, {'kind': 'crate', 'x': 59, 'y': 46, 'id': 'of_camp_crate'}, {'kind': 'barrel', 'x': 50, 'y': 47},
    # the burial ground: cairns in rows, a dead tree, the fresh grave, the dead windpump above it
    {'kind': 'rock_small', 'x': 50, 'y': 14}, {'kind': 'rock_small', 'x': 52, 'y': 14}, {'kind': 'rock_small', 'x': 54, 'y': 14}, {'kind': 'rock_small', 'x': 56, 'y': 14}, {'kind': 'rock_small', 'x': 58, 'y': 14},
    {'kind': 'rock_small', 'x': 50, 'y': 17}, {'kind': 'rock_small', 'x': 52, 'y': 17}, {'kind': 'rock_small', 'x': 54, 'y': 17}, {'kind': 'rock_small', 'x': 56, 'y': 17}, {'kind': 'rock_small', 'x': 58, 'y': 17},
    {'kind': 'rock_small', 'x': 50, 'y': 20}, {'kind': 'rock_small', 'x': 52, 'y': 20}, {'kind': 'rock_small', 'x': 54, 'y': 20}, {'kind': 'rock_small', 'x': 58, 'y': 20},
    {'kind': 'debris', 'x': 56, 'y': 20, 'id': 'of_fresh_grave'}, {'kind': 'dead_tree', 'x': 60, 'y': 13}, {'kind': 'sign', 'x': 49, 'y': 23, 'rot': 1, 'id': 'of_burial_sign'},
    {'kind': 'windpump', 'x': 59, 'y': 4, 'id': 'of_windpump'},
    # the lane: a sign at each end, a lamp post by the green
    {'kind': 'sign', 'x': 3, 'y': 25, 'rot': 1}, {'kind': 'sign', 'x': 60, 'y': 30, 'rot': 3}, {'kind': 'lamp_post', 'x': 30, 'y': 25}, {'kind': 'lamp_post', 'x': 20, 'y': 30}, {'kind': 'lamp_post', 'x': 41, 'y': 30},
    {'kind': 'dead_tree', 'x': 5, 'y': 16}, {'kind': 'cactus', 'x': 2, 'y': 40}, {'kind': 'rock', 'x': 61, 'y': 50}, {'kind': 'rock_small', 'x': 3, 'y': 6},
]

openfield = {
    'id': 'openfield', 'name': 'Openfield', 'seed': 37, 'settlement': 'openfield',
    'layout': rows,
    'legend': {
        ',': {'floor': 'dirt'}, 'd': {'floor': 'dirt'}, 'l': {'floor': 'dirt'}, 'g': {'floor': 'rubble'}, 'c': {'floor': 'concrete'}, 'w': {'floor': 'wood'},
        'R': {'wall': 'rock', 'floor': 'rubble', 'wallHeight': 2.4},
        'W': {'wall': 'wood', 'floor': 'wood', 'wallHeight': 2.6},
    },
    'props': props,
    'lights': [
        {'x': 30, 'y': 25, 'height': 3.0, 'color': 'hex:0xffe0b0', 'intensity': 2.2, 'range': 9}, {'x': 20, 'y': 30, 'height': 3.0, 'color': 'hex:0xffe0b0', 'intensity': 2.2, 'range': 9}, {'x': 41, 'y': 30, 'height': 3.0, 'color': 'hex:0xffe0b0', 'intensity': 2.2, 'range': 9},
        {'x': 32, 'y': 15, 'height': 0.7, 'color': 'hex:0xffa050', 'intensity': 2.6, 'range': 8, 'flicker': 0.3}, {'x': 55, 'y': 43, 'height': 0.6, 'color': 'hex:0xff9a40', 'intensity': 2.0, 'range': 6, 'flicker': 0.35},
        {'x': 21, 'y': 36, 'height': 2.3, 'color': 'hex:0xffd8a0', 'intensity': 1.8, 'range': 8, 'flicker': 0.1}, {'x': 41, 'y': 35, 'height': 2.3, 'color': 'hex:0xffd8a0', 'intensity': 1.8, 'range': 7, 'flicker': 0.1},
        {'x': 43, 'y': 20, 'height': 2.2, 'color': 'hex:0xffd8a0', 'intensity': 1.6, 'range': 6}, {'x': 21, 'y': 20, 'height': 2.2, 'color': 'hex:0xffd8a0', 'intensity': 1.4, 'range': 5},
        {'x': 10, 'y': 22, 'height': 2.0, 'color': 'hex:0xffc890', 'intensity': 1.2, 'range': 4, 'flicker': 0.2},
    ],
    'spawns': [
        {'id': 'start', 'x': 2, 'y': 27, 'facing': 1}, {'id': 'from_ninebridge', 'x': 2, 'y': 28, 'facing': 1},
        {'id': 'from_meridian', 'x': 61, 'y': 27, 'facing': 3}, {'id': 'from_halt_w', 'x': 61, 'y': 28, 'facing': 3},
        {'id': 'green', 'x': 32, 'y': 25, 'facing': 0},
    ],
    'exits': [
        {'x': 0, 'y': 26, 'w': 1, 'h': 4, 'to': {'worldMap': True}, 'label': 'The track west'},
        {'x': 63, 'y': 26, 'w': 1, 'h': 4, 'to': {'worldMap': True}, 'label': 'The track east'},
    ],
    'talk': {
        'of_well': {'dialogue': 'd_of_well', 'name': 'The well'},
        'of_board': {'dialogue': 'd_of_board', 'name': 'The notice post'},
        'of_shrine_sign': {'dialogue': 'd_of_shrine', 'name': 'The sign of the open sky'},
        'of_tally': {'dialogue': 'd_of_tally', 'name': 'The seed tally'},
        'of_cellar': {'dialogue': 'd_of_cellar', 'name': 'The hatch'},
        'of_fresh_grave': {'dialogue': 'd_of_grave', 'name': 'A fresh grave'},
        'of_burial_sign': {'dialogue': 'd_of_burial', 'name': 'The burial ground'},
        'of_tobias_bench': {'dialogue': 'd_of_bench', 'name': 'The bench'},
        'of_windpump': {'dialogue': 'd_of_windpump', 'name': 'The dead windpump'},
    },
    'containers': {
        'of_seed_crate': {'name': 'Seed Crate', 'items': [['c_fruit', 2]], 'lock': 30},
        'of_seed_crate_b': {'name': 'Seed Crate (short)', 'items': [['c_algae', 1]], 'lock': 30},
        'of_store_locker': {'name': 'Store Locker', 'items': [['t_repair', 1], ['j_cloth', 2]], 'lock': 25},
        'of_mason_locker': {'name': 'The Elder\'s Locker', 'items': [['k_mason_letter', 1], ['c_bitters', 1]], 'lock': 45},
        'of_tobias_crate': {'name': 'Tobias\'s Crate', 'items': [['k_tobias_sheet', 1], ['j_powder', 1], ['c_iodine', 1]], 'lock': 35},
        'of_yard_crate': {'name': 'Yard Crate', 'items': [['j_hide', 2], ['c_jerky', 2]], 'lock': 15},
        'of_camp_crate': {'name': 'Camp Crate', 'items': [['c_dirtywater', 2], ['j_cloth', 1]]},
    },
    'spots': {
        'well': {'x': 32, 'y': 24}, 'well_n': {'x': 32, 'y': 20}, 'green_pair_a': {'x': 29, 'y': 19}, 'green_pair_b': {'x': 30, 'y': 19}, 'green_sit': {'x': 35, 'y': 25},
        'shrine': {'x': 32, 'y': 16}, 'shrine_w': {'x': 31, 'y': 16}, 'shrine_e': {'x': 33, 'y': 16}, 'shrine_sit': {'x': 31, 'y': 14},
        'field_a_work': {'x': 10, 'y': 5}, 'field_b_work': {'x': 22, 'y': 7}, 'field_c_work': {'x': 38, 'y': 9}, 'field_d_work': {'x': 50, 'y': 11}, 'field_e_work': {'x': 30, 'y': 5}, 'field_lean': {'x': 16, 'y': 11},
        'store': {'x': 21, 'y': 20}, 'store_door': {'x': 21, 'y': 24},
        'mason_table': {'x': 42, 'y': 20}, 'mason_bed': {'x': 42, 'y': 18}, 'mason_door': {'x': 43, 'y': 25},
        'tobias_hut': {'x': 10, 'y': 22}, 'tobias_cot': {'x': 10, 'y': 20}, 'tobias_field': {'x': 10, 'y': 9},
        'hall_table': {'x': 23, 'y': 37}, 'hall_cot_a': {'x': 15, 'y': 33}, 'hall_cot_b': {'x': 15, 'y': 36}, 'hall_cot_c': {'x': 18, 'y': 33}, 'hall_cot_d': {'x': 18, 'y': 36}, 'hall_stove': {'x': 26, 'y': 33}, 'hall_door': {'x': 20, 'y': 31},
        'hatch': {'x': 14, 'y': 38},
        'sick_table': {'x': 41, 'y': 36}, 'sick_cot_a_sit': {'x': 37, 'y': 34}, 'sick_cot_b_sit': {'x': 37, 'y': 36}, 'sick_cot_c_sit': {'x': 45, 'y': 34}, 'sick_door': {'x': 41, 'y': 31},
        'yard': {'x': 21, 'y': 46}, 'yard_work': {'x': 18, 'y': 48}, 'yard_lean': {'x': 23, 'y': 48},
        'camp_fire': {'x': 54, 'y': 44}, 'camp_tent_a': {'x': 53, 'y': 41}, 'camp_tent_b': {'x': 53, 'y': 46}, 'camp_tent_c': {'x': 57, 'y': 43}, 'camp_sit': {'x': 56, 'y': 44},
        'grave': {'x': 56, 'y': 21}, 'grave_dig': {'x': 55, 'y': 21}, 'burial_walk': {'x': 52, 'y': 22}, 'burial_sit': {'x': 51, 'y': 16},
        'lane_w': {'x': 8, 'y': 27}, 'lane_e': {'x': 56, 'y': 28},
    },
    'npcs': [
        {'def': 'npc_of_01', 'x': 42, 'y': 21, 'facing': 0},
        {'def': 'npc_of_02', 'x': 32, 'y': 17, 'facing': 2},
        {'def': 'npc_of_03', 'x': 55, 'y': 21, 'facing': 1, 'if': {'not': {'flag': 'ash_joined'}}},
        {'def': 'npc_of_04', 'x': 10, 'y': 9, 'facing': 2},
        {'def': 'npc_of_05', 'x': 41, 'y': 36, 'facing': 0},
        {'def': 'npc_of_06', 'x': 21, 'y': 20, 'facing': 2},
        {'def': 'npc_of_07', 'x': 22, 'y': 7, 'facing': 2},
        {'def': 'npc_of_08', 'x': 18, 'y': 48, 'facing': 0},
        {'def': 'npc_of_09', 'x': 37, 'y': 34, 'facing': 1},
        {'def': 'npc_of_10', 'x': 45, 'y': 34, 'facing': 3},
        {'def': 'npc_of_11', 'x': 56, 'y': 28, 'facing': 3, 'if': {'not': {'flag': 'of_corso_gone'}}},
        # the orchard's two thieves, if they went to the Choir (q_orchard), live in the tents now
        {'def': 'npc_or_04', 'id': 'of_kip', 'x': 54, 'y': 44, 'facing': 0, 'schedule': [{'from': 7, 'to': 18, 'spot': 'field_d_work', 'activity': 'work'}, {'from': 18, 'to': 22, 'spot': 'camp_sit', 'activity': 'idle'}, {'from': 22, 'to': 7, 'spot': 'camp_tent_a', 'activity': 'sleep'}], 'dialogue': 'd_of_kip', 'if': {'flag': 'or_thieves_choir'}},
        {'def': 'npc_or_05', 'id': 'of_mote', 'x': 56, 'y': 45, 'facing': 0, 'schedule': [{'from': 7, 'to': 18, 'spot': 'field_d_work', 'activity': 'work'}, {'from': 18, 'to': 22, 'spot': 'camp_fire', 'activity': 'idle'}, {'from': 22, 'to': 7, 'spot': 'camp_tent_b', 'activity': 'sleep'}], 'dialogue': 'd_of_mote', 'if': {'flag': 'or_thieves_choir'}},
    ],
    'triggers': [
        {'id': 'arrive_w', 'x': 1, 'y': 24, 'w': 6, 'h': 8, 'text': 'Openfield. Rows and rows of green in the glass, which is a thing you have seen once before in your life, on a smaller scale, north of Shale; two long timber halls; a well with a wheel on it; and people in grey scarves bending to the soil who straighten as you come, and look at the sky, and go back to it.', 'effects': [{'learn': 'seen_openfield'}, {'learn': 'loc_openfield'}]},
        {'id': 'arrive_e', 'x': 57, 'y': 24, 'w': 6, 'h': 8, 'text': 'Openfield, from the east: a burial ground of cairns under a dead windpump, and past it the green rows the Choir has coaxed out of the glass.', 'effects': [{'learn': 'seen_openfield'}, {'learn': 'loc_openfield'}]},
        {'id': 'fields', 'x': 6, 'y': 3, 'w': 51, 'h': 11, 'text': 'The fields. Every third row is grey: leaves curled and spotted, stalks gone soft at the root, the smell of something sweet going wrong. The rows between are green and do not know yet.', 'effects': [{'learn': 'seen_blight'}]},
        {'id': 'burial', 'x': 49, 'y': 12, 'w': 12, 'h': 13, 'text': 'The burial ground: cairns in rows under the open sky, no names on them, a dead windpump turning for nobody. One grave is new.', 'effects': [{'learn': 'seen_burial_ground'}]},
        {'id': 'hatch', 'x': 13, 'y': 38, 'w': 2, 'h': 1, 'once': False, 'if': {'not': {'flag': 'of_cellar_open'}}, 'effects': [{'event': 'dialogue', 'data': {'tree': 'd_of_cellar', 'name': 'The hatch'}}]},
    ],
    'extras': [
        {'count': 4, 'roles': ['pilgrim', 'settler', 'labourer'], 'faction': 'choir', 'area': {'x': 6, 'y': 3, 'w': 51, 'h': 11}, 'spots': ['field_a_work', 'field_b_work', 'field_c_work', 'field_e_work', 'field_lean'], 'hours': {'from': 6, 'to': 19}, 'barks': ['Every third row. We pull it and it comes back.', 'The sky keeps no books.', 'Don\'t drink from the north trough; the Elder says.', 'Sing or don\'t. The soil doesn\'t mind.']},
        {'count': 3, 'roles': ['pilgrim', 'settler'], 'faction': 'choir', 'ages': [6, 14], 'area': {'x': 26, 'y': 18, 'w': 13, 'h': 8}, 'spots': ['green_pair_a', 'green_pair_b', 'green_sit', 'shrine_sit'], 'hours': {'from': 7, 'to': 20}, 'barks': ['Are you from the bridge? Did you see the planks?', 'Petra says don\'t talk to strangers. You\'re a stranger.', 'I can sing the whole sky-song. All of it.']},
        {'count': 2, 'roles': ['pilgrim', 'drifter'], 'life': 'hard', 'area': {'x': 50, 'y': 38, 'w': 11, 'h': 11}, 'spots': ['camp_sit', 'camp_fire'], 'barks': ['They feed us first. First! Nobody ever fed us first.', 'Came from the Sump. Don\'t go to the Sump.']},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0xc2c4a6', 'fogDensity': 0.012, 'dust': 0.15, 'grade': 0.4, 'mood': 'peaceful', 'sound': 'birds'},
}

HEADER = "import type { MapDef } from '../../engine/data/types';\n\n// Generated by tools/maps/gen_openfield.py — edit the generator, then re-run it.\n"
with open(os.path.join(ROOT, 'src', 'content', 'maps', 'openfield.ts'), 'w') as f:
    f.write(f"{HEADER}export const openfield: MapDef = {ts(openfield)};\n")
print('openfield', W, 'x', H)
