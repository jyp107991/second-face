#!/usr/bin/env python3
"""Generates src/content/maps/sump.ts — the Sump: a scavengers' camp over the mouths of the old storm tunnels under
the glass (DESIGN §13b: salvage camp — spoil heaps, cabins, bunkhouses; company store, scrip, no law but the foreman).

A drained basin in the middle with the tunnel mouth at its north end (the way down to Cistern 4). Grel's clan on the
west rim, the Tanners on the east, a guild runner's tent between them on the south rim where the track comes in.
    python3 tools/maps/gen_sump.py
"""
import json, os, re

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
W, H = 52, 40


def ts(obj):
    s = json.dumps(obj, indent=2)
    s = re.sub(r'"([A-Za-z_][A-Za-z0-9_]*)":', r'\1:', s)
    s = re.sub(r'"hex:(0x[0-9a-fA-F]+)"', r'\1', s)
    return s


g = [['g'] * W for _ in range(H)]


def fill(x0, y0, x1, y1, ch):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            g[y][x] = ch


def building(x0, y0, x1, y1, wall, floor, doors):
    fill(x0, y0, x1, y1, wall)
    fill(x0 + 1, y0 + 1, x1 - 1, y1 - 1, floor)
    for (x, y) in doors:
        g[y][x] = floor


# rock rim, the track in from the south
fill(0, 0, W - 1, 0, 'R'); fill(0, H - 1, W - 1, H - 1, 'R'); fill(0, 0, 0, H - 1, 'R'); fill(W - 1, 0, W - 1, H - 1, 'R')
fill(24, H - 1, 27, H - 1, ',')
fill(24, 30, 27, 38, ',')
# the drained basin: concrete bowl, rubble floor, low concrete lip
fill(14, 8, 37, 28, 'r')
fill(14, 8, 37, 8, 'L'); fill(14, 28, 37, 28, 'L'); fill(14, 8, 14, 28, 'L'); fill(37, 8, 37, 28, 'L')
fill(25, 28, 26, 28, 'r')                      # the ramp down from the south
fill(20, 8, 21, 8, 'r'); fill(30, 8, 31, 8, 'r')   # steps down from the rims
# the tunnel mouth at the basin's north end: a concrete throat into the rock
fill(23, 1, 28, 7, 'C'); fill(24, 2, 27, 7, 'm'); fill(24, 8, 27, 8, 'r'); fill(24, 7, 27, 7, 'm')
g[1][25] = 'm'; g[1][26] = 'm'
# Grel's camp, west rim: a scrap cabin, a bunkhouse, a yard of spoil
fill(2, 4, 12, 30, ',')
building(3, 10, 9, 15, 'S', 'w', [(9, 12)])
building(3, 19, 10, 25, 'S', 'w', [(10, 22)])
# the Tanners, east rim: a container cabin, tents, spoil
fill(39, 4, 50, 30, ',')
building(42, 9, 48, 14, 'M', 'm', [(42, 11)])
# the runner's tent and the south rim
fill(14, 30, 37, 36, ',')
building(30, 32, 35, 36, 'M', 'm', [(30, 34)])

rows = [''.join(r) for r in g]

props = [
    # the basin: wrecks, drums, a crane-arm, a dead warden on its side, the pump that drained it
    {'kind': 'car_wreck', 'x': 18, 'y': 12, 'rot': 1}, {'kind': 'car_wreck', 'x': 32, 'y': 22, 'rot': 0}, {'kind': 'machine', 'x': 22, 'y': 20, 'rot': 1, 'id': 'sp_crane'},
    {'kind': 'tank', 'x': 29, 'y': 13}, {'kind': 'barrel_rust', 'x': 17, 'y': 24}, {'kind': 'barrel_rust', 'x': 18, 'y': 25}, {'kind': 'tire_pile', 'x': 34, 'y': 10}, {'kind': 'tire_pile', 'x': 16, 'y': 17},
    {'kind': 'debris', 'x': 27, 'y': 17}, {'kind': 'debris', 'x': 21, 'y': 26}, {'kind': 'debris', 'x': 33, 'y': 16}, {'kind': 'pipe_h', 'x': 25, 'y': 12}, {'kind': 'pipe_h', 'x': 26, 'y': 12},
    {'kind': 'hound_dormant', 'x': 30, 'y': 18, 'rot': 2, 'id': 'sp_warden'}, {'kind': 'pump', 'x': 20, 'y': 23, 'id': 'sp_pump'}, {'kind': 'fire_barrel', 'x': 25, 'y': 24},
    # the tunnel mouth: sandbags, a lamp, a chain, a sign
    {'kind': 'sandbags', 'x': 23, 'y': 9}, {'kind': 'sandbags', 'x': 28, 'y': 9}, {'kind': 'lamp_post', 'x': 22, 'y': 9}, {'kind': 'fence_post', 'x': 24, 'y': 9}, {'kind': 'fence_post', 'x': 27, 'y': 9},
    {'kind': 'sign', 'x': 29, 'y': 9, 'rot': 3, 'id': 'sp_tunnel_sign'},
    # Grel's camp: the cabin, the bunkhouse, the spoil, the fire
    {'kind': 'table', 'x': 5, 'y': 12, 'id': 'sp_grel_table'}, {'kind': 'chair', 'x': 5, 'y': 13, 'rot': 0}, {'kind': 'locker', 'x': 8, 'y': 11, 'id': 'sp_grel_locker'}, {'kind': 'shelf', 'x': 4, 'y': 11, 'rot': 0},
    {'kind': 'cot', 'x': 4, 'y': 20, 'rot': 1}, {'kind': 'cot', 'x': 4, 'y': 23, 'rot': 1}, {'kind': 'cot', 'x': 8, 'y': 20, 'rot': 3}, {'kind': 'cot', 'x': 8, 'y': 23, 'rot': 3}, {'kind': 'stove', 'x': 6, 'y': 24},
    {'kind': 'campfire', 'x': 6, 'y': 6, 'id': 'sp_west_fire'}, {'kind': 'crate', 'x': 10, 'y': 5, 'id': 'sp_grel_crate'}, {'kind': 'crate', 'x': 11, 'y': 5}, {'kind': 'barrel', 'x': 3, 'y': 28}, {'kind': 'rock', 'x': 11, 'y': 28}, {'kind': 'rock', 'x': 3, 'y': 5},
    {'kind': 'tent', 'x': 5, 'y': 28, 'rot': 0},
    # the Tanners: the container, tents, their fire, their spoil
    {'kind': 'table', 'x': 45, 'y': 11, 'id': 'sp_tanner_table'}, {'kind': 'chair', 'x': 45, 'y': 12, 'rot': 0}, {'kind': 'locker', 'x': 47, 'y': 10, 'id': 'sp_tanner_locker'}, {'kind': 'crate', 'x': 47, 'y': 13},
    {'kind': 'tent', 'x': 42, 'y': 18, 'rot': 1}, {'kind': 'tent', 'x': 48, 'y': 18, 'rot': 3}, {'kind': 'tent', 'x': 45, 'y': 26, 'rot': 0}, {'kind': 'campfire', 'x': 45, 'y': 21, 'id': 'sp_east_fire'},
    {'kind': 'crate', 'x': 41, 'y': 28, 'id': 'sp_tanner_crate'}, {'kind': 'barrel_rust', 'x': 49, 'y': 28}, {'kind': 'rock', 'x': 49, 'y': 5}, {'kind': 'rock', 'x': 40, 'y': 29}, {'kind': 'tire_pile', 'x': 40, 'y': 5},
    # the runner's tent (a container) and the south rim
    {'kind': 'cot', 'x': 31, 'y': 33, 'rot': 1}, {'kind': 'crate', 'x': 34, 'y': 33, 'id': 'sp_pay_crate'}, {'kind': 'table', 'x': 33, 'y': 35, 'id': 'sp_runner_ledger'},
    {'kind': 'lamp_post', 'x': 29, 'y': 31}, {'kind': 'sign', 'x': 22, 'y': 31, 'rot': 0, 'id': 'sp_sign'}, {'kind': 'horse', 'x': 18, 'y': 33, 'rot': 0}, {'kind': 'wagon', 'x': 15, 'y': 33, 'rot': 1},
    {'kind': 'dead_tree', 'x': 36, 'y': 3}, {'kind': 'cactus', 'x': 12, 'y': 36}, {'kind': 'rock_small', 'x': 38, 'y': 36}, {'kind': 'rock_small', 'x': 2, 'y': 34},
]

sump = {
    'id': 'sump', 'name': 'The Sump', 'seed': 41, 'settlement': 'sump',
    'layout': rows,
    'legend': {
        'g': {'floor': 'rubble'}, ',': {'floor': 'dirt'}, 'r': {'floor': 'rubble'}, 'm': {'floor': 'metal'}, 'w': {'floor': 'wood'}, 'c': {'floor': 'concrete'},
        'R': {'wall': 'rock', 'floor': 'rubble', 'wallHeight': 3},
        'L': {'wall': 'concrete', 'floor': 'rubble', 'wallHeight': 1.0},
        'C': {'wall': 'concrete', 'floor': 'metal', 'wallHeight': 3.2},
        'S': {'wall': 'scrap', 'floor': 'wood', 'wallHeight': 2.4},
        'M': {'wall': 'metal', 'floor': 'metal', 'wallHeight': 2.6},
    },
    'props': props,
    'lights': [
        {'x': 22, 'y': 9, 'height': 3.0, 'color': 'hex:0xffe0b0', 'intensity': 2.4, 'range': 9}, {'x': 29, 'y': 31, 'height': 3.0, 'color': 'hex:0xffe0b0', 'intensity': 2.2, 'range': 9},
        {'x': 6, 'y': 6, 'height': 0.6, 'color': 'hex:0xff9a40', 'intensity': 2.2, 'range': 7, 'flicker': 0.35}, {'x': 45, 'y': 21, 'height': 0.6, 'color': 'hex:0xff9a40', 'intensity': 2.2, 'range': 7, 'flicker': 0.35},
        {'x': 25, 'y': 24, 'height': 0.8, 'color': 'hex:0xff9a40', 'intensity': 1.6, 'range': 5, 'flicker': 0.35}, {'x': 25, 'y': 4, 'height': 2.4, 'color': 'hex:0xa0c0ff', 'intensity': 1.2, 'range': 6, 'flicker': 0.2},
        {'x': 5, 'y': 12, 'height': 2.2, 'color': 'hex:0xffd8a0', 'intensity': 1.4, 'range': 5}, {'x': 45, 'y': 11, 'height': 2.2, 'color': 'hex:0xffd8a0', 'intensity': 1.4, 'range': 5},
    ],
    'spawns': [
        {'id': 'start', 'x': 25, 'y': 37, 'facing': 0}, {'id': 'from_ninebridge', 'x': 26, 'y': 37, 'facing': 0}, {'id': 'from_lm_flats_01', 'x': 24, 'y': 37, 'facing': 0},
        {'id': 'tunnel', 'x': 25, 'y': 10, 'facing': 2}, {'id': 'basin', 'x': 25, 'y': 18, 'facing': 0},
    ],
    'exits': [
        {'x': 24, 'y': 39, 'w': 4, 'h': 1, 'to': {'worldMap': True}, 'label': 'The track south'},
        {'x': 25, 'y': 1, 'w': 2, 'h': 1, 'to': {'location': 'cistern4', 'spawn': 'tunnel'}, 'label': 'The tunnel down', 'if': {'flag': 'sp_tunnel_open'}},
    ],
    'talk': {
        'sp_tunnel_sign': {'dialogue': 'd_sp_tunnel_sign', 'name': 'A sign at the mouth'},
        'sp_sign': {'dialogue': 'd_sp_sign', 'name': 'The Sump'},
        'sp_warden': {'dialogue': 'd_sp_warden', 'name': 'A dead machine'},
        'sp_pump': {'dialogue': 'd_sp_pump', 'name': 'The basin pump'},
        'sp_runner_ledger': {'dialogue': 'd_sp_ledger', 'name': 'The runner\'s ledger'},
        'sp_crane': {'dialogue': 'd_sp_crane', 'name': 'The crane-arm'},
    },
    'containers': {
        'sp_pay_crate': {'name': 'Guild Pay Crate', 'items': [['k_sp_pay_ledger', 1]], 'tolls': 140, 'lock': 50},
        'sp_grel_locker': {'name': 'Grel\'s Locker', 'items': [['c_water', 2], ['a_12ga', 6]], 'tolls': 30, 'lock': 40},
        'sp_tanner_locker': {'name': 'Tanner Locker', 'items': [['c_jerky', 2], ['a_9mm', 8]], 'tolls': 24, 'lock': 40},
        'sp_grel_crate': {'name': 'Salvage Crate', 'items': [['j_scrap', 4], ['j_wiring', 2], ['j_electronics', 1]], 'lock': 20},
        'sp_tanner_crate': {'name': 'Salvage Crate', 'items': [['j_scrap', 3], ['j_glass', 2], ['t_picks', 1]], 'lock': 25},
    },
    'spots': {
        'mouth': {'x': 25, 'y': 10}, 'mouth_w': {'x': 23, 'y': 10}, 'mouth_e': {'x': 28, 'y': 10},
        'grel_table': {'x': 6, 'y': 12}, 'grel_cot': {'x': 5, 'y': 20}, 'west_fire': {'x': 7, 'y': 7}, 'west_pair_a': {'x': 5, 'y': 7}, 'west_pair_b': {'x': 5, 'y': 8}, 'west_work': {'x': 10, 'y': 16}, 'west_cot_b': {'x': 5, 'y': 23}, 'west_cot_c': {'x': 7, 'y': 20}, 'west_cot_d': {'x': 7, 'y': 23}, 'west_rim': {'x': 12, 'y': 14},
        'tanner_table': {'x': 46, 'y': 11}, 'tanner_cot': {'x': 43, 'y': 19}, 'east_fire': {'x': 46, 'y': 22}, 'east_pair_a': {'x': 44, 'y': 22}, 'east_pair_b': {'x': 44, 'y': 23}, 'east_work': {'x': 41, 'y': 16}, 'east_tent_b': {'x': 47, 'y': 19}, 'east_tent_c': {'x': 45, 'y': 27}, 'east_rim': {'x': 39, 'y': 14},
        'basin_work': {'x': 24, 'y': 16}, 'basin_lean': {'x': 31, 'y': 20}, 'basin_fire': {'x': 24, 'y': 25},
        'runner': {'x': 32, 'y': 34}, 'runner_cot': {'x': 32, 'y': 33}, 'south_rim': {'x': 26, 'y': 31},
    },
    'npcs': [
        {'def': 'npc_sp_01', 'x': 6, 'y': 12, 'facing': 1},
        {'def': 'npc_sp_02', 'x': 46, 'y': 11, 'facing': 3},
        {'def': 'npc_sp_03', 'x': 32, 'y': 34, 'facing': 0, 'if': {'not': {'flag': 'sp_runner_gone'}}},
        {'def': 'npc_sp_04', 'x': 24, 'y': 16, 'facing': 0},
        {'def': 'npc_sp_g1', 'x': 23, 'y': 10, 'facing': 2}, {'def': 'npc_sp_g2', 'x': 28, 'y': 10, 'facing': 2},
        {'def': 'npc_sp_w1', 'x': 10, 'y': 16, 'facing': 1}, {'def': 'npc_sp_w2', 'x': 5, 'y': 7, 'facing': 1},
        {'def': 'npc_sp_t1', 'x': 41, 'y': 16, 'facing': 3}, {'def': 'npc_sp_t2', 'x': 44, 'y': 22, 'facing': 3},
    ],
    'triggers': [
        {'id': 'arrive', 'x': 22, 'y': 31, 'w': 8, 'h': 8, 'text': 'The Sump. A concrete bowl sunk in the glass where the city\'s storm drains once came up for air, pumped dry by hand and picked over by two camps that do not speak: scrap cabins on the west rim, tents on the east, and between them, at the bowl\'s north end, a tunnel mouth with sandbags across it and a lamp burning in daylight.', 'effects': [{'learn': 'seen_sump'}, {'learn': 'loc_sump'}]},
        {'id': 'mouth', 'x': 23, 'y': 9, 'w': 6, 'h': 3, 'once': False, 'if': {'not': {'flag': 'sp_tunnel_open'}}, 'effects': [{'event': 'dialogue', 'data': {'tree': 'd_sp_mouth', 'name': 'The tunnel mouth'}}]},
        {'id': 'basin', 'x': 15, 'y': 9, 'w': 22, 'h': 19, 'text': 'The bowl: wrecks, drums, a crane-arm somebody has been trying to raise for a year, and a machine on its side with its legs folded, the city\'s kind, dead so long the scavengers use it as a bench.', 'effects': [{'learn': 'seen_sump_basin'}]},
    ],
    'extras': [
        {'count': 3, 'roles': ['labourer', 'drifter', 'raider'], 'life': 'hard', 'team': 'grel', 'area': {'x': 2, 'y': 4, 'w': 11, 'h': 27}, 'spots': ['west_pair_a', 'west_pair_b', 'west_rim'], 'barks': ['Grel says the tunnel\'s ours. The Tanners say otherwise. The guild says keep digging.', 'Scrip on the fourth day. Always the fourth day.', 'Don\'t cross the bowl after dark.']},
        {'count': 3, 'roles': ['labourer', 'drifter', 'raider'], 'life': 'hard', 'team': 'tanner', 'area': {'x': 39, 'y': 4, 'w': 12, 'h': 27}, 'spots': ['east_pair_a', 'east_pair_b', 'east_rim'], 'barks': ['Hesk says the tunnel\'s ours. Grel says otherwise. The guild pays both, which should tell you something.', 'There\'s a door down there that never opened.', 'West rim\'s got the better cabins. We\'ve got the better knives.']},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0xb8b0a0', 'fogDensity': 0.016, 'dust': 0.5, 'grade': 0.6, 'mood': 'haze', 'sound': 'wind'},
}

HEADER = "import type { MapDef } from '../../engine/data/types';\n\n// Generated by tools/maps/gen_sump.py — edit the generator, then re-run it.\n"
with open(os.path.join(ROOT, 'src', 'content', 'maps', 'sump.ts'), 'w') as f:
    f.write(f"{HEADER}export const sump: MapDef = {ts(sump)};\n")
print('sump', W, 'x', H)
