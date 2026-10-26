#!/usr/bin/env python3
"""Generates src/content/maps/tollhouse.ts — Tollhouse 9, the Tollmen's fort across the old highway
(DESIGN §13b: toll fort — a wall across the road, a gate, a tower, a warehouse; tolls, contracts, debt law).

The highway runs west→east. West of the wall: the toll booth (clerk, ledger, gate terminal), a caravan camp.
East of the wall: the warehouse with its debtors' cage, the bunkhouse, the outriders' yard. A chain-link
section at the wall's north end is the quiet way over at night.
    python3 tools/maps/gen_tollhouse.py
"""
import json, os, re

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
W, H = 64, 48


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


# rock rim with the highway cut through it
fill(0, 0, W - 1, 0, 'R'); fill(0, H - 1, W - 1, H - 1, 'R'); fill(0, 0, 0, H - 1, 'R'); fill(W - 1, 0, W - 1, H - 1, 'R')
fill(0, 22, 0, 25, 'c'); fill(W - 1, 22, W - 1, 25, 'c')
# the old highway and its verges
fill(1, 22, W - 2, 25, 'c')
fill(1, 20, W - 2, 21, ','); fill(1, 26, W - 2, 27, ',')
# salt crust and hardpan
for (x0, y0, x1, y1) in [(3, 3, 10, 7), (52, 2, 60, 6), (4, 40, 9, 45), (56, 40, 61, 45), (14, 10, 19, 13)]:
    fill(x0, y0, x1, y1, 's')

# THE WALL: tall concrete across everything but the gate, chain-link at its north end
fill(30, 1, 31, 46, 'H')
fill(30, 21, 31, 26, 'c')                   # the gate
fill(30, 4, 31, 6, 'F')                     # the weak section (chain-link, climbable at night)
fill(30, 7, 31, 7, 'H')
# gate approaches: concrete apron either side
fill(26, 19, 35, 28, 'c')
# tower on the gate's north side
fill(26, 15, 29, 18, 'H')
# toll booth west of the gate, door north onto the apron
building(21, 28, 27, 33, 'C', 'c', [(24, 28)])
# caravan camp, west and south
fill(4, 31, 18, 44, ',')
# warehouse east, door south; debtors' cage inside
building(36, 5, 50, 16, 'C', 'c', [(42, 16)])
fill(45, 7, 49, 7, 'F'); fill(45, 8, 45, 10, 'F'); fill(45, 11, 49, 11, 'F'); g[9][45] = 'c'   # cage with a gate tile at (45,9)
# bunkhouse east, door north
building(36, 32, 45, 40, 'B', 'c', [(40, 32)])
# outriders' yard
fill(48, 29, 60, 44, 'r')
# water tank pad
fill(37, 18, 40, 20, 'm')

rows = [''.join(r) for r in g]

props = [
    # the gate: sandbags, lamps, the rates board
    {'kind': 'sandbags', 'x': 28, 'y': 21}, {'kind': 'sandbags', 'x': 28, 'y': 26}, {'kind': 'sandbags', 'x': 33, 'y': 21}, {'kind': 'sandbags', 'x': 33, 'y': 26},
    {'kind': 'lamp_post', 'x': 29, 'y': 20}, {'kind': 'lamp_post', 'x': 32, 'y': 27}, {'kind': 'lamp_post', 'x': 29, 'y': 14},
    {'kind': 'sign', 'x': 27, 'y': 27, 'rot': 1, 'id': 'rates_sign'},
    {'kind': 'fire_barrel', 'x': 34, 'y': 19},
    # the booth: counter, the clerk's desk and ledger, the gate terminal
    {'kind': 'counter', 'x': 23, 'y': 29, 'rot': 0}, {'kind': 'table', 'x': 25, 'y': 31, 'id': 'ledger_desk'}, {'kind': 'chair', 'x': 25, 'y': 32, 'rot': 2},
    {'kind': 'terminal', 'x': 22, 'y': 32, 'rot': 1, 'id': 'gate_term'}, {'kind': 'shelf', 'x': 26, 'y': 29, 'rot': 3}, {'kind': 'locker', 'x': 22, 'y': 30, 'id': 'booth_locker'},
    # the weak section
    {'kind': 'debris', 'x': 29, 'y': 5}, {'kind': 'debris', 'x': 32, 'y': 6}, {'kind': 'barrel_rust', 'x': 28, 'y': 4},
    # caravan camp
    {'kind': 'tent', 'x': 7, 'y': 34, 'rot': 1}, {'kind': 'tent', 'x': 7, 'y': 40, 'rot': 1}, {'kind': 'campfire', 'x': 11, 'y': 37},
    {'kind': 'crate', 'x': 14, 'y': 33, 'id': 'caravan_crate'}, {'kind': 'crate', 'x': 15, 'y': 33}, {'kind': 'barrel', 'x': 14, 'y': 41}, {'kind': 'car_wreck', 'x': 15, 'y': 38, 'rot': 1},
    # warehouse
    {'kind': 'counter', 'x': 38, 'y': 14, 'rot': 0}, {'kind': 'shelf', 'x': 37, 'y': 7, 'rot': 1}, {'kind': 'shelf', 'x': 37, 'y': 9, 'rot': 1},
    {'kind': 'crate', 'x': 40, 'y': 7, 'id': 'th_crate_a'}, {'kind': 'crate', 'x': 41, 'y': 7}, {'kind': 'crate', 'x': 42, 'y': 8, 'id': 'th_crate_b'}, {'kind': 'crate', 'x': 40, 'y': 11},
    {'kind': 'barrel', 'x': 43, 'y': 11}, {'kind': 'barrel', 'x': 43, 'y': 12}, {'kind': 'cot', 'x': 47, 'y': 8, 'id': 'cage_cot'}, {'kind': 'tank', 'x': 38, 'y': 19},
    # bunkhouse
    {'kind': 'cot', 'x': 37, 'y': 34, 'rot': 1}, {'kind': 'cot', 'x': 37, 'y': 36, 'rot': 1}, {'kind': 'cot', 'x': 37, 'y': 38, 'rot': 1},
    {'kind': 'cot', 'x': 44, 'y': 34, 'rot': 3}, {'kind': 'cot', 'x': 44, 'y': 36, 'rot': 3}, {'kind': 'cot', 'x': 44, 'y': 38, 'rot': 3},
    {'kind': 'locker', 'x': 40, 'y': 39, 'id': 'bunk_locker'}, {'kind': 'stove', 'x': 42, 'y': 39}, {'kind': 'table', 'x': 40, 'y': 36},
    # outriders' yard: bikes, wrecks, tyres
    {'kind': 'machine', 'x': 52, 'y': 33, 'rot': 1, 'id': 'bike_a'}, {'kind': 'machine', 'x': 55, 'y': 33, 'rot': 1, 'id': 'bike_b'},
    {'kind': 'car_wreck', 'x': 58, 'y': 38, 'rot': 0}, {'kind': 'tire_pile', 'x': 50, 'y': 41}, {'kind': 'tire_pile', 'x': 51, 'y': 42},
    {'kind': 'fire_barrel', 'x': 54, 'y': 38}, {'kind': 'crate', 'x': 59, 'y': 31}, {'kind': 'barrel_rust', 'x': 49, 'y': 31},
    # the Sallow around it
    {'kind': 'dead_tree', 'x': 6, 'y': 12}, {'kind': 'dead_tree', 'x': 20, 'y': 6}, {'kind': 'dead_tree', 'x': 55, 'y': 10}, {'kind': 'dead_tree', 'x': 12, 'y': 17},
    {'kind': 'rock', 'x': 3, 'y': 28}, {'kind': 'rock', 'x': 60, 'y': 18}, {'kind': 'rock_small', 'x': 22, 'y': 10}, {'kind': 'rock_small', 'x': 46, 'y': 44}, {'kind': 'rock', 'x': 24, 'y': 42},
    {'kind': 'car_wreck', 'x': 8, 'y': 24, 'rot': 0}, {'kind': 'sign', 'x': 4, 'y': 21, 'rot': 2},
]

tollhouse = {
    'id': 'tollhouse', 'name': 'Tollhouse 9', 'seed': 19, 'settlement': 'tollhouse',
    'layout': rows,
    'legend': {
        '.': {'floor': 'sand'}, ',': {'floor': 'dirt'}, 'r': {'floor': 'rubble'}, 's': {'floor': 'rubble'}, 'c': {'floor': 'concrete'}, 'm': {'floor': 'metal'},
        'R': {'wall': 'rock', 'floor': 'sand', 'wallHeight': 3},
        'H': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 4.2},
        'C': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 2.8},
        'B': {'wall': 'brick', 'floor': 'concrete', 'wallHeight': 2.6},
        'F': {'wall': 'fence', 'floor': 'dirt', 'wallHeight': 1.3},
    },
    'props': props,
    'lights': [
        {'x': 29, 'y': 20, 'height': 3.2, 'color': 'hex:0xffe0b0', 'intensity': 3, 'range': 10},
        {'x': 32, 'y': 27, 'height': 3.2, 'color': 'hex:0xffe0b0', 'intensity': 3, 'range': 10},
        {'x': 29, 'y': 14, 'height': 3.2, 'color': 'hex:0xffe0b0', 'intensity': 2.5, 'range': 9},
        {'x': 24, 'y': 30, 'height': 2.3, 'color': 'hex:0xffd8a0', 'intensity': 2, 'range': 6},
        {'x': 42, 'y': 14, 'height': 2.6, 'color': 'hex:0xffd8a0', 'intensity': 2, 'range': 7},
        {'x': 40, 'y': 36, 'height': 2.3, 'color': 'hex:0xffc890', 'intensity': 1.6, 'range': 6, 'flicker': 0.1},
        {'x': 11, 'y': 37, 'height': 0.6, 'color': 'hex:0xff9a40', 'intensity': 2.2, 'range': 6, 'flicker': 0.35},
        {'x': 54, 'y': 38, 'height': 0.8, 'color': 'hex:0xff9a40', 'intensity': 1.8, 'range': 5, 'flicker': 0.35},
        {'x': 34, 'y': 19, 'height': 0.8, 'color': 'hex:0xff9a40', 'intensity': 1.6, 'range': 5, 'flicker': 0.35},
    ],
    'spawns': [
        {'id': 'start', 'x': 2, 'y': 23, 'facing': 1}, {'id': 'from_shale', 'x': 2, 'y': 24, 'facing': 1}, {'id': 'from_rustdogs', 'x': 2, 'y': 22, 'facing': 1},
        {'id': 'from_ninebridge', 'x': 61, 'y': 23, 'facing': 3}, {'id': 'from_junction', 'x': 61, 'y': 24, 'facing': 3}, {'id': 'from_signalhill', 'x': 61, 'y': 22, 'facing': 3},
        {'id': 'inside', 'x': 40, 'y': 23, 'facing': 1},
    ],
    'exits': [
        {'x': 0, 'y': 22, 'w': 1, 'h': 4, 'to': {'worldMap': True}, 'label': 'The highway west'},
        {'x': 63, 'y': 22, 'w': 1, 'h': 4, 'to': {'worldMap': True}, 'label': 'The highway east', 'if': {'flag': 'th_passed'}},
    ],
    'talk': {
        'ledger_desk': {'dialogue': 'd_th_ledger', 'name': 'The toll ledger'},
        'gate_term': {'dialogue': 'd_th_terminal', 'name': 'Gate terminal'},
        'rates_sign': {'dialogue': 'd_th_rates', 'name': 'The rates board'},
        'bike_a': {'dialogue': 'd_th_bikes', 'name': 'Outriders\' bikes'},
        'bike_b': {'dialogue': 'd_th_bikes', 'name': 'Outriders\' bikes'},
    },
    'containers': {
        'th_crate_a': {'name': 'Guild Crate', 'items': [['a_556', 12], ['c_tin', 2], ['c_water', 2]], 'lock': 40},
        'th_crate_b': {'name': 'Guild Crate', 'items': [['j_fuel', 2], ['t_repair', 1], ['j_electronics', 1]], 'lock': 55},
        'bunk_locker': {'name': 'Bunk Locker', 'items': [['a_9mm', 10], ['c_kick', 1], ['c_jerky', 2]], 'lock': 30},
        'booth_locker': {'name': 'Booth Locker', 'items': [['c_water', 1]], 'tolls': 24, 'lock': 45},
        'caravan_crate': {'name': 'Caravan Crate', 'items': [['c_algae', 2], ['j_cloth', 2]], 'lock': 20},
    },
    'spots': {
        'gate_post': {'x': 32, 'y': 23}, 'gate_e': {'x': 33, 'y': 25}, 'tower_base': {'x': 28, 'y': 19}, 'wall_n': {'x': 28, 'y': 9}, 'wall_s': {'x': 28, 'y': 38},
        'booth': {'x': 24, 'y': 30}, 'counter_w': {'x': 38, 'y': 13}, 'cage': {'x': 47, 'y': 9}, 'east_road': {'x': 57, 'y': 23},
        'yard_a': {'x': 52, 'y': 35}, 'yard_b': {'x': 55, 'y': 36}, 'yard_fire': {'x': 53, 'y': 39},
        'camp_fire': {'x': 10, 'y': 36}, 'camp_tent': {'x': 8, 'y': 35},
        'bunk_1': {'x': 38, 'y': 34}, 'bunk_2': {'x': 38, 'y': 36}, 'bunk_3': {'x': 38, 'y': 38}, 'bunk_4': {'x': 43, 'y': 34}, 'bunk_5': {'x': 43, 'y': 36}, 'bunk_6': {'x': 43, 'y': 38},
        'bunk_table': {'x': 41, 'y': 36},
    },
    'npcs': [
        {'def': 'npc_th_01', 'x': 32, 'y': 23, 'facing': 3},
        {'def': 'npc_th_02', 'x': 24, 'y': 30, 'facing': 0},
        {'def': 'npc_th_03', 'x': 38, 'y': 13, 'facing': 2},
        {'def': 'npc_th_04', 'x': 52, 'y': 35, 'facing': 1, 'if': {'not': {'dead': 'tollhouse/npc_th_04'}}},
        {'def': 'npc_th_05', 'x': 55, 'y': 36, 'facing': 3, 'if': {'not': {'dead': 'tollhouse/npc_th_05'}}},
        {'def': 'npc_th_06', 'x': 47, 'y': 9, 'facing': 2, 'if': {'not': {'flag': 'th_debtor_freed'}}},
        {'def': 'npc_th_07', 'x': 10, 'y': 36, 'facing': 1},
        {'def': 'npc_th_g1', 'x': 28, 'y': 19, 'facing': 2}, {'def': 'npc_th_g2', 'x': 33, 'y': 25, 'facing': 3},
        {'def': 'npc_th_g3', 'x': 42, 'y': 17, 'facing': 2}, {'def': 'npc_th_g4', 'x': 57, 'y': 23, 'facing': 1},
        # The Dogs, if you brought them: they wait at the west verge until the gate talk turns to a fight.
        {'def': 'npc_rd_02', 'id': 'raid_vasha', 'schedule': [], 'x': 12, 'y': 21, 'facing': 1, 'if': {'all': [{'flag': 'rd_raid_agreed'}, {'not': {'flag': 'th_raided'}}]}},
        {'def': 'npc_rd_g2', 'id': 'raid_d1', 'schedule': [], 'x': 11, 'y': 26, 'facing': 1, 'if': {'all': [{'flag': 'rd_raid_agreed'}, {'not': {'flag': 'th_raided'}}]}},
        {'def': 'npc_rd_g4', 'id': 'raid_d2', 'schedule': [], 'x': 13, 'y': 27, 'facing': 1, 'if': {'all': [{'flag': 'rd_raid_agreed'}, {'not': {'flag': 'th_raided'}}]}},
        {'def': 'npc_rd_g6', 'id': 'raid_d3', 'schedule': [], 'x': 10, 'y': 20, 'facing': 1, 'if': {'all': [{'flag': 'rd_raid_agreed'}, {'not': {'flag': 'th_raided'}}]}},
    ],
    'triggers': [
        {'id': 'arrive_w', 'x': 1, 'y': 20, 'w': 5, 'h': 8, 'text': 'Tollhouse 9. A wall of poured concrete across the old highway, a tower with a lamp, and a gate with two sets of sandbags. Everything east of here is somebody\'s.', 'effects': [{'learn': 'seen_tollhouse'}]},
        {'id': 'arrive_e', 'x': 58, 'y': 20, 'w': 5, 'h': 8, 'text': 'Tollhouse 9, from the inside. The wall looks the same from both sides, which is the point.', 'effects': [{'learn': 'seen_tollhouse'}]},
        {'id': 'gate', 'x': 30, 'y': 21, 'w': 2, 'h': 6, 'once': False, 'if': {'not': {'flag': 'th_admitted'}}, 'effects': [{'event': 'dialogue', 'data': {'tree': 'd_th_gate', 'name': 'The gate'}}]},
        {'id': 'fence', 'x': 30, 'y': 4, 'w': 2, 'h': 3, 'once': False, 'if': {'not': {'flag': 'th_passed'}}, 'effects': [{'event': 'dialogue', 'data': {'tree': 'd_th_fence', 'name': 'The chain-link'}}]},
        {'id': 'east_block', 'x': 62, 'y': 22, 'w': 1, 'h': 4, 'once': False, 'if': {'not': {'flag': 'th_passed'}}, 'text': 'The highway runs on east. The guard at the far posts looks for a stamp you do not have.'},
        {'id': 'yard', 'x': 48, 'y': 29, 'w': 13, 'h': 16, 'text': 'The outriders\' yard: two bikes with the guild\'s half-moon on the tank, a rifle scabbard on one, and the smell of fuel nobody else in the Sallow can buy.', 'effects': [{'learn': 'seen_outrider_bikes'}]},
        {'id': 'cage', 'x': 45, 'y': 7, 'w': 5, 'h': 5, 'text': 'A cage of chain-link inside the warehouse, with a cot in it and a chalk tally on the wall: days, and a sum going down very slowly.', 'effects': [{'learn': 'seen_debt_cage'}]},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0xb8a89a', 'fogDensity': 0.018, 'dust': 0.6, 'grade': 0.7, 'sound': 'wind'},
}

HEADER = "import type { MapDef } from '../../engine/data/types';\n\n// Generated by tools/maps/gen_tollhouse.py — edit the generator, then re-run it.\n"
with open(os.path.join(ROOT, 'src', 'content', 'maps', 'tollhouse.ts'), 'w') as f:
    f.write(f"{HEADER}export const tollhouse: MapDef = {ts(tollhouse)};\n")
print('tollhouse', W, 'x', H)
