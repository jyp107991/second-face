#!/usr/bin/env python3
"""Generates src/content/maps/md_precinct.ts — Meridian's gate and the Precinct, the Ledger's orderly middle
(DESIGN §2c.2 districts; WORLD §3.1: licensed shops, clinics, curfews, tickets and fines, wardens in grey).

West of the wall: the approach road and the refugees the gate turns back. The gate itself: a checkpoint with the
face scanner. Inside: the avenue, the warden station with its cells, the records office, the hearing room, a
licensed shop and clinic, tenements, and the Loop's Precinct platform at the east end.
    python3 tools/maps/gen_md_precinct.py
"""
import json, os, re

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
W, H = 72, 60


def ts(obj):
    s = json.dumps(obj, indent=2)
    s = re.sub(r'"([A-Za-z_][A-Za-z0-9_]*)":', r'\1:', s)
    s = re.sub(r'"hex:(0x[0-9a-fA-F]+)"', r'\1', s)
    return s


g = [['c'] * W for _ in range(H)]


def fill(x0, y0, x1, y1, ch):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            g[y][x] = ch


def building(x0, y0, x1, y1, wall, floor, doors):
    fill(x0, y0, x1, y1, wall)
    fill(x0 + 1, y0 + 1, x1 - 1, y1 - 1, floor)
    for (x, y) in doors:
        g[y][x] = floor


# the rim: rock outside the wall, concrete and ruin inside
fill(0, 0, W - 1, 0, 'R'); fill(0, H - 1, W - 1, H - 1, 'R'); fill(0, 0, 0, H - 1, 'R'); fill(W - 1, 0, W - 1, H - 1, 'R')
# outside the wall: dirt and rubble, the approach road
fill(1, 1, 9, H - 2, 'r'); fill(1, 26, 9, 33, 'c'); fill(0, 28, 0, 31, 'c')
fill(2, 36, 8, 48, ',')
# THE WALL: tall concrete, the gate cut through it, a drain under it to the south
fill(10, 1, 11, H - 2, 'H')
fill(10, 28, 11, 31, 'c')
fill(2, 52, 9, 53, 'g'); fill(12, 52, 20, 53, 'g')
# the gate apron and the checkpoint booth
fill(12, 25, 20, 34, 'c')
building(14, 21, 19, 24, 'C', 'c', [(16, 24)])
# the avenue, asphalt, with a tram-rail strip along its north edge further east
fill(12, 27, 70, 32, 'a')
fill(58, 26, 70, 26, 'm')
# the warden station (cells at its west end) and the records office, north of the avenue
building(13, 10, 25, 20, 'C', 't', [(19, 20)])
fill(14, 11, 17, 14, 'F'); fill(15, 12, 16, 13, 't'); g[14][16] = 't'   # cell A: a fence ring with its gate at (16,14)
fill(14, 16, 17, 19, 'F'); fill(15, 17, 16, 18, 't'); g[16][16] = 't'   # cell B, gate at (16,16)
building(28, 12, 39, 22, 'C', 't', [(33, 22)])
# the hearing room, north-east of the records
building(42, 10, 55, 22, 'C', 't', [(48, 22)])
# the Loop platform, east end: a raised metal deck with a shelter
fill(58, 18, 70, 25, 'm')
building(60, 19, 66, 23, 'M', 'm', [(63, 23), (63, 19)])
# south of the avenue: the licensed shop, the clinic, two tenement blocks
building(13, 36, 22, 43, 'C', 't', [(17, 36)])
building(26, 36, 35, 43, 'C', 't', [(30, 36)])
building(40, 36, 52, 48, 'B', 't', [(46, 36), (40, 42)])
building(56, 36, 68, 48, 'B', 't', [(62, 36)])
# the square between the blocks: the curfew bell and the notice post
fill(36, 36, 39, 48, 'c')
# a back lane south of the tenements, and the drain's inside mouth
fill(12, 50, 70, 51, 'c')

rows = [''.join(r) for r in g]

props = [
    # outside: the crowd's camp, sandbags, a sign, a burned-out tram
    {'kind': 'tent', 'x': 3, 'y': 38, 'rot': 1}, {'kind': 'tent', 'x': 3, 'y': 44, 'rot': 1}, {'kind': 'campfire', 'x': 6, 'y': 41}, {'kind': 'blanket', 'x': 7, 'y': 45}, {'kind': 'crate', 'x': 8, 'y': 37, 'id': 'md_refugee_crate'},
    {'kind': 'sign', 'x': 4, 'y': 25, 'rot': 1, 'id': 'md_wall_sign'}, {'kind': 'car_wreck', 'x': 4, 'y': 10, 'rot': 1}, {'kind': 'debris', 'x': 6, 'y': 16}, {'kind': 'debris', 'x': 3, 'y': 56}, {'kind': 'dead_tree', 'x': 7, 'y': 6},
    {'kind': 'sandbags', 'x': 9, 'y': 27}, {'kind': 'sandbags', 'x': 9, 'y': 32}, {'kind': 'fence_post', 'x': 8, 'y': 29}, {'kind': 'fence_post', 'x': 8, 'y': 30},
    {'kind': 'pipe_h', 'x': 5, 'y': 52}, {'kind': 'pipe_h', 'x': 6, 'y': 52}, {'kind': 'sign', 'x': 9, 'y': 54, 'rot': 1, 'id': 'md_drain_sign'},
    # the gate: the scanner, lamps, the barrier, the rates board
    {'kind': 'terminal', 'x': 13, 'y': 26, 'rot': 0, 'id': 'md_scanner'}, {'kind': 'lamp_post', 'x': 12, 'y': 26}, {'kind': 'lamp_post', 'x': 12, 'y': 33}, {'kind': 'sign', 'x': 20, 'y': 26, 'rot': 3, 'id': 'md_gate_board'},
    {'kind': 'counter', 'x': 15, 'y': 22, 'rot': 0}, {'kind': 'counter', 'x': 16, 'y': 22, 'rot': 0}, {'kind': 'locker', 'x': 18, 'y': 23, 'id': 'md_booth_locker'},
    # the avenue: lamps, a tram on the rail, benches (chairs), a water-ration post
    {'kind': 'lamp_post', 'x': 24, 'y': 26}, {'kind': 'lamp_post', 'x': 36, 'y': 33}, {'kind': 'lamp_post', 'x': 48, 'y': 26}, {'kind': 'lamp_post', 'x': 56, 'y': 33},
    {'kind': 'machine', 'x': 64, 'y': 26, 'rot': 1, 'id': 'md_tram'}, {'kind': 'sign', 'x': 59, 'y': 25, 'rot': 2, 'id': 'md_loop_sign'}, {'kind': 'chair', 'x': 61, 'y': 21, 'rot': 0}, {'kind': 'chair', 'x': 65, 'y': 21, 'rot': 0},
    {'kind': 'pump', 'x': 38, 'y': 34, 'id': 'md_standpipe'}, {'kind': 'sign', 'x': 36, 'y': 34, 'rot': 0, 'id': 'md_ration_board'},
    # the warden station: desks, the armoury locker, the cells' cots
    {'kind': 'table', 'x': 20, 'y': 13, 'id': 'md_lowe_desk'}, {'kind': 'chair', 'x': 19, 'y': 13, 'rot': 1}, {'kind': 'chair', 'x': 21, 'y': 13, 'rot': 3}, {'kind': 'shelf', 'x': 24, 'y': 11, 'rot': 3}, {'kind': 'locker', 'x': 24, 'y': 19, 'id': 'md_armoury'},
    {'kind': 'counter', 'x': 19, 'y': 18, 'rot': 0}, {'kind': 'counter', 'x': 20, 'y': 18, 'rot': 0}, {'kind': 'cot', 'x': 15, 'y': 12, 'rot': 1, 'id': 'md_cell_cot'}, {'kind': 'cot', 'x': 15, 'y': 17, 'rot': 1},
    # the records office: the desks, the files, Nine's plate
    {'kind': 'counter', 'x': 31, 'y': 19, 'rot': 0}, {'kind': 'counter', 'x': 32, 'y': 19, 'rot': 0}, {'kind': 'counter', 'x': 34, 'y': 19, 'rot': 0}, {'kind': 'counter', 'x': 35, 'y': 19, 'rot': 0},
    {'kind': 'shelf', 'x': 29, 'y': 13, 'rot': 1}, {'kind': 'shelf', 'x': 29, 'y': 14, 'rot': 1}, {'kind': 'shelf', 'x': 38, 'y': 13, 'rot': 3}, {'kind': 'shelf', 'x': 38, 'y': 14, 'rot': 3}, {'kind': 'shelf', 'x': 33, 'y': 13, 'rot': 0},
    {'kind': 'table', 'x': 33, 'y': 16, 'id': 'md_nine_desk'}, {'kind': 'terminal', 'x': 36, 'y': 15, 'rot': 3, 'id': 'md_records_term'}, {'kind': 'locker', 'x': 30, 'y': 21, 'id': 'md_records_locker'},
    # the hearing room: the dais, the rail, benches
    {'kind': 'counter', 'x': 47, 'y': 13, 'rot': 0}, {'kind': 'counter', 'x': 48, 'y': 13, 'rot': 0}, {'kind': 'counter', 'x': 49, 'y': 13, 'rot': 0}, {'kind': 'chair', 'x': 48, 'y': 12, 'rot': 2},
    {'kind': 'fence_post', 'x': 45, 'y': 16}, {'kind': 'fence_post', 'x': 51, 'y': 16}, {'kind': 'chair', 'x': 44, 'y': 19, 'rot': 2}, {'kind': 'chair', 'x': 46, 'y': 19, 'rot': 2}, {'kind': 'chair', 'x': 50, 'y': 19, 'rot': 2}, {'kind': 'chair', 'x': 52, 'y': 19, 'rot': 2},
    {'kind': 'sign', 'x': 43, 'y': 12, 'rot': 1, 'id': 'md_charter'}, {'kind': 'shelf', 'x': 54, 'y': 12, 'rot': 3},
    # the shop and the clinic
    {'kind': 'counter', 'x': 16, 'y': 39, 'rot': 0}, {'kind': 'counter', 'x': 17, 'y': 39, 'rot': 0}, {'kind': 'shelf', 'x': 14, 'y': 41, 'rot': 1}, {'kind': 'shelf', 'x': 21, 'y': 41, 'rot': 3}, {'kind': 'crate', 'x': 20, 'y': 42, 'id': 'md_shop_crate'},
    {'kind': 'cot', 'x': 27, 'y': 41, 'rot': 1}, {'kind': 'cot', 'x': 33, 'y': 41, 'rot': 3}, {'kind': 'table', 'x': 30, 'y': 39, 'id': 'md_clinic_table'}, {'kind': 'shelf', 'x': 34, 'y': 38, 'rot': 3}, {'kind': 'locker', 'x': 27, 'y': 38, 'id': 'md_clinic_locker'},
    # the tenements: a few rooms' worth
    {'kind': 'cot', 'x': 41, 'y': 45, 'rot': 1}, {'kind': 'cot', 'x': 44, 'y': 45, 'rot': 1}, {'kind': 'table', 'x': 47, 'y': 40, 'id': 'md_quint_table'}, {'kind': 'chair', 'x': 47, 'y': 41, 'rot': 0}, {'kind': 'stove', 'x': 51, 'y': 46}, {'kind': 'shelf', 'x': 51, 'y': 38, 'rot': 3},
    {'kind': 'cot', 'x': 57, 'y': 45, 'rot': 1}, {'kind': 'cot', 'x': 60, 'y': 45, 'rot': 1}, {'kind': 'table', 'x': 63, 'y': 40}, {'kind': 'stove', 'x': 67, 'y': 46}, {'kind': 'barrel', 'x': 67, 'y': 38},
    # the square: the curfew bell, the notice post, a bench
    {'kind': 'lamp_post', 'x': 37, 'y': 40, 'id': 'md_bell'}, {'kind': 'sign', 'x': 38, 'y': 44, 'rot': 3, 'id': 'md_notice'}, {'kind': 'chair', 'x': 36, 'y': 46, 'rot': 1},
    # the back lane and the drain's inside mouth
    {'kind': 'pipe_h', 'x': 14, 'y': 52}, {'kind': 'barrel_rust', 'x': 22, 'y': 50}, {'kind': 'debris', 'x': 30, 'y': 51}, {'kind': 'fire_barrel', 'x': 50, 'y': 51}, {'kind': 'lamp_post', 'x': 40, 'y': 49},
]

md_precinct = {
    'id': 'md_precinct', 'name': 'Meridian — the Precinct', 'seed': 51, 'settlement': 'meridian',
    'layout': rows,
    'legend': {
        'c': {'floor': 'concrete'}, 'r': {'floor': 'rubble'}, ',': {'floor': 'dirt'}, 'a': {'floor': 'asphalt'}, 'm': {'floor': 'metal'}, 't': {'floor': 'tile'}, 'g': {'floor': 'grate'},
        'R': {'wall': 'rock', 'floor': 'rubble', 'wallHeight': 3},
        'H': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 5.5},
        'C': {'wall': 'concrete', 'floor': 'tile', 'wallHeight': 3.2},
        'B': {'wall': 'brick', 'floor': 'tile', 'wallHeight': 3.4},
        'M': {'wall': 'metal', 'floor': 'metal', 'wallHeight': 2.8},
        'F': {'wall': 'fence', 'floor': 'tile', 'wallHeight': 2.2},
    },
    'props': props,
    'lights': [
        {'x': 12, 'y': 26, 'height': 3.4, 'color': 'hex:0xe8f0ff', 'intensity': 3, 'range': 10}, {'x': 12, 'y': 33, 'height': 3.4, 'color': 'hex:0xe8f0ff', 'intensity': 3, 'range': 10},
        {'x': 24, 'y': 26, 'height': 3.4, 'color': 'hex:0xe8f0ff', 'intensity': 2.4, 'range': 10}, {'x': 36, 'y': 33, 'height': 3.4, 'color': 'hex:0xe8f0ff', 'intensity': 2.4, 'range': 10},
        {'x': 48, 'y': 26, 'height': 3.4, 'color': 'hex:0xe8f0ff', 'intensity': 2.4, 'range': 10}, {'x': 56, 'y': 33, 'height': 3.4, 'color': 'hex:0xe8f0ff', 'intensity': 2.4, 'range': 10},
        {'x': 37, 'y': 40, 'height': 3.4, 'color': 'hex:0xe8f0ff', 'intensity': 2.2, 'range': 9}, {'x': 40, 'y': 49, 'height': 3.0, 'color': 'hex:0xffd8a0', 'intensity': 1.6, 'range': 7},
        {'x': 13, 'y': 26, 'height': 1.6, 'color': 'hex:0x60ff90', 'intensity': 1.6, 'range': 4}, {'x': 36, 'y': 15, 'height': 1.6, 'color': 'hex:0x60ff90', 'intensity': 1.4, 'range': 4},
        {'x': 19, 'y': 17, 'height': 2.8, 'color': 'hex:0xe8f0ff', 'intensity': 2, 'range': 8}, {'x': 33, 'y': 17, 'height': 2.8, 'color': 'hex:0xe8f0ff', 'intensity': 2, 'range': 8}, {'x': 48, 'y': 16, 'height': 2.8, 'color': 'hex:0xe8f0ff', 'intensity': 2.2, 'range': 9},
        {'x': 17, 'y': 40, 'height': 2.6, 'color': 'hex:0xffe0b0', 'intensity': 1.8, 'range': 7}, {'x': 30, 'y': 40, 'height': 2.6, 'color': 'hex:0xe8f0ff', 'intensity': 1.8, 'range': 7},
        {'x': 46, 'y': 42, 'height': 2.6, 'color': 'hex:0xffd8a0', 'intensity': 1.4, 'range': 7}, {'x': 62, 'y': 42, 'height': 2.6, 'color': 'hex:0xffd8a0', 'intensity': 1.4, 'range': 7},
        {'x': 63, 'y': 21, 'height': 2.6, 'color': 'hex:0xe8f0ff', 'intensity': 2, 'range': 8}, {'x': 6, 'y': 41, 'height': 0.6, 'color': 'hex:0xff9a40', 'intensity': 2.0, 'range': 6, 'flicker': 0.35},
    ],
    'spawns': [
        {'id': 'start', 'x': 2, 'y': 29, 'facing': 1}, {'id': 'from_ninebridge', 'x': 2, 'y': 30, 'facing': 1}, {'id': 'from_openfield', 'x': 2, 'y': 29, 'facing': 1}, {'id': 'from_sump', 'x': 2, 'y': 31, 'facing': 1},
        {'id': 'from_riverdock', 'x': 2, 'y': 28, 'facing': 1}, {'id': 'from_halt_w', 'x': 2, 'y': 28, 'facing': 1}, {'id': 'from_hamlet_shore', 'x': 2, 'y': 31, 'facing': 1}, {'id': 'from_rigs', 'x': 2, 'y': 31, 'facing': 1},
        {'id': 'inside', 'x': 22, 'y': 29, 'facing': 1}, {'id': 'cell', 'x': 16, 'y': 13, 'facing': 2}, {'id': 'drain', 'x': 13, 'y': 52, 'facing': 1}, {'id': 'loop', 'x': 63, 'y': 24, 'facing': 2},
    ],
    'exits': [
        {'x': 0, 'y': 28, 'w': 1, 'h': 4, 'to': {'worldMap': True}, 'label': 'The road out'},
    ],
    'talk': {
        'md_scanner': {'dialogue': 'd_md_scanner', 'name': 'The face scanner'},
        'md_gate_board': {'dialogue': 'd_md_gate_board', 'name': 'The gate board'},
        'md_wall_sign': {'dialogue': 'd_md_wall_sign', 'name': 'A sign on the wall'},
        'md_drain_sign': {'dialogue': 'd_md_drain', 'name': 'The storm drain'},
        'md_loop_sign': {'dialogue': 'd_md_loop', 'name': 'The Loop — Precinct'},
        'md_ration_board': {'dialogue': 'd_md_ration', 'name': 'The water post'},
        'md_notice': {'dialogue': 'd_md_notice', 'name': 'The notice post'},
        'md_charter': {'dialogue': 'd_md_charter', 'name': 'The charter'},
        'md_records_term': {'dialogue': 'd_md_records_term', 'name': 'Records terminal'},
        'md_bell': {'dialogue': 'd_md_bell', 'name': 'The curfew bell'},
        'md_cell_cot': {'dialogue': 'd_md_cell', 'name': 'The cell'},
    },
    'containers': {
        'md_booth_locker': {'name': 'Gate Locker', 'items': [['c_water', 2]], 'tolls': 20, 'lock': 50},
        'md_armoury': {'name': 'Warden Armoury', 'items': [['w_pump', 1], ['a_12ga', 12], ['r_riot', 1]], 'lock': 70},
        'md_records_locker': {'name': 'Records Locker', 'items': [['k_md_fine_notice', 1]], 'lock': 40},
        'md_clinic_locker': {'name': 'Clinic Locker', 'items': [['c_bandage', 3], ['c_splint', 1], ['c_radflush', 1]], 'lock': 35},
        'md_shop_crate': {'name': 'Shop Crate', 'items': [['c_tin', 3], ['j_cloth', 2]], 'lock': 30},
        'md_refugee_crate': {'name': 'A Family\'s Crate', 'items': [['c_dirtywater', 2], ['j_cloth', 1]]},
    },
    'spots': {
        'gate_post': {'x': 16, 'y': 29}, 'gate_booth': {'x': 17, 'y': 23}, 'gate_e': {'x': 19, 'y': 31}, 'gate_w': {'x': 12, 'y': 29},
        'crowd_a': {'x': 6, 'y': 29}, 'crowd_b': {'x': 5, 'y': 31}, 'crowd_pair_a': {'x': 4, 'y': 40}, 'crowd_pair_b': {'x': 5, 'y': 40}, 'crowd_sit': {'x': 7, 'y': 44}, 'crowd_fire': {'x': 5, 'y': 42},
        'lowe_desk': {'x': 20, 'y': 14}, 'station_counter': {'x': 19, 'y': 17}, 'station_door': {'x': 19, 'y': 21}, 'cell_a': {'x': 16, 'y': 13}, 'cell_b': {'x': 16, 'y': 18},
        'nine_desk': {'x': 33, 'y': 17}, 'records_counter': {'x': 32, 'y': 20}, 'records_door': {'x': 33, 'y': 23},
        'dais': {'x': 48, 'y': 14}, 'dais_side': {'x': 50, 'y': 14}, 'bench_a': {'x': 44, 'y': 18}, 'bench_b': {'x': 50, 'y': 18}, 'hearing_door': {'x': 48, 'y': 23}, 'rail': {'x': 48, 'y': 17},
        'shop': {'x': 16, 'y': 40}, 'clinic': {'x': 30, 'y': 40}, 'clinic_cot_sit': {'x': 28, 'y': 41},
        'quint_table': {'x': 46, 'y': 40}, 'quint_cot': {'x': 42, 'y': 45}, 'tenement_b': {'x': 62, 'y': 41},
        'square_lean': {'x': 38, 'y': 38}, 'square_sit': {'x': 36, 'y': 46}, 'avenue_pair_a': {'x': 30, 'y': 29}, 'avenue_pair_b': {'x': 31, 'y': 29}, 'avenue_e': {'x': 52, 'y': 30}, 'avenue_w': {'x': 26, 'y': 30},
        'platform': {'x': 63, 'y': 22}, 'platform_sit': {'x': 61, 'y': 22}, 'patrol_a': {'x': 40, 'y': 28}, 'patrol_b': {'x': 56, 'y': 31},
        'lane': {'x': 30, 'y': 50},
    },
    'npcs': [
        {'def': 'npc_md_01', 'x': 20, 'y': 14, 'facing': 0},
        {'def': 'npc_md_nine', 'x': 33, 'y': 17, 'facing': 0, 'if': {'not': {'flag': 'nine_joined'}}},
        {'def': 'npc_md_12', 'x': 16, 'y': 29, 'facing': 3},
        {'def': 'npc_md_13', 'x': 17, 'y': 23, 'facing': 0},
        {'def': 'npc_md_14', 'x': 30, 'y': 40, 'facing': 0},
        {'def': 'npc_md_15', 'x': 16, 'y': 40, 'facing': 0},
        {'def': 'npc_md_16', 'x': 46, 'y': 40, 'facing': 0},
        {'def': 'npc_md_17', 'x': 6, 'y': 29, 'facing': 1},
        {'def': 'npc_md_g1', 'x': 19, 'y': 31, 'facing': 3}, {'def': 'npc_md_g2', 'x': 12, 'y': 29, 'facing': 3}, {'def': 'npc_md_g3', 'x': 40, 'y': 28, 'facing': 1}, {'def': 'npc_md_g4', 'x': 56, 'y': 31, 'facing': 3},
        {'def': 'npc_md_g5', 'x': 19, 'y': 17, 'facing': 2},
    ],
    'triggers': [
        {'id': 'arrive', 'x': 1, 'y': 25, 'w': 8, 'h': 10, 'text': 'Meridian. Towers first, miles off, grey against grey; then the Wall, poured concrete five storeys high, running out of sight both ways; then, when the road reaches it, a gate the size of a door, a booth, a lamp, and a line of people who have been waiting since before you came over the last rise.', 'effects': [{'learn': 'seen_meridian'}, {'learn': 'loc_meridian'}]},
        {'id': 'gate', 'x': 10, 'y': 28, 'w': 2, 'h': 4, 'once': False, 'if': {'not': {'flag': 'md_inside'}}, 'effects': [{'event': 'dialogue', 'data': {'tree': 'd_md_gate', 'name': 'The gate'}}]},
        {'id': 'drain_out', 'x': 7, 'y': 52, 'w': 3, 'h': 2, 'once': False, 'if': {'not': {'flag': 'md_inside'}}, 'effects': [{'event': 'dialogue', 'data': {'tree': 'd_md_drain', 'name': 'The storm drain'}}]},
        {'id': 'inside', 'x': 12, 'y': 25, 'w': 9, 'h': 10, 'text': 'The Precinct. Swept asphalt, lamps that all work, a tram rail, buildings with numbers on them, and people walking as if they had somewhere to be by a time. Nobody looks at you. A camera on the lamp-post does.', 'effects': [{'learn': 'seen_precinct'}, {'set': 'md_inside'}]},
        {'id': 'square', 'x': 36, 'y': 36, 'w': 4, 'h': 13, 'text': 'A square between the tenements with a standpipe, a bell on a post, and a notice board under glass. Everything that happens here has been posted first.', 'effects': [{'learn': 'seen_square'}]},
        {'id': 'avenue_end', 'x': 68, 'y': 27, 'w': 3, 'h': 6, 'once': False, 'if': {'not': {'flag': 'md_market_open'}}, 'text': 'The avenue runs on east into Old Market under a gantry that says WORKS, and a warden under the gantry who says the same.'},
        {'id': 'platform', 'x': 58, 'y': 18, 'w': 13, 'h': 8, 'text': 'The Loop\'s Precinct platform: a raised deck, a shelter, a tram on the rail with its doors open and nobody in it, and a board of district names with a fare beside each.', 'effects': [{'learn': 'seen_loop'}]},
        {'id': 'cells', 'x': 15, 'y': 12, 'w': 2, 'h': 2, 'once': False, 'if': {'all': [{'flag': 'md_detained'}, {'not': {'flag': 'md_status'}}]}, 'effects': [{'event': 'dialogue', 'data': {'tree': 'd_md_cell', 'name': 'The cell'}}]},
    ],
    'extras': [
        {'count': 5, 'roles': ['settler', 'corp', 'trader', 'tech'], 'faction': 'wardens', 'area': {'x': 22, 'y': 27, 'w': 36, 'h': 6}, 'spots': ['avenue_pair_a', 'avenue_pair_b', 'avenue_e', 'avenue_w', 'square_lean', 'square_sit', 'platform_sit'], 'hours': {'from': 6, 'to': 21}, 'barks': ['Curfew\'s at nine. The bell\'s never late.', 'Mind the camera; it minds you.', 'Water\'s rationed since the Sallow business. Point eight.', 'The schedule holds.']},
        {'count': 2, 'roles': ['guard'], 'faction': 'wardens', 'team': 'wardens', 'area': {'x': 24, 'y': 27, 'w': 32, 'h': 6}, 'spots': ['patrol_a', 'patrol_b'], 'hours': {'from': 0, 'to': 24}, 'barks': ['Papers.', 'Keep to the avenue after dark.']},
        {'count': 4, 'roles': ['drifter', 'settler', 'street'], 'life': 'starved', 'area': {'x': 2, 'y': 36, 'w': 7, 'h': 13}, 'spots': ['crowd_pair_a', 'crowd_pair_b', 'crowd_sit', 'crowd_fire'], 'barks': ['Third day in the line. They say the hearing\'s Tuesday.', 'The Ring\'s burning again. They don\'t care.', 'My face isn\'t on their machine. That\'s the whole problem.']},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0x9ea4aa', 'fogDensity': 0.014, 'dust': 0.1, 'grade': 0.3, 'mood': 'haze', 'sound': 'murmur'},
}

HEADER = "import type { MapDef } from '../../engine/data/types';\n\n// Generated by tools/maps/gen_md_precinct.py — edit the generator, then re-run it.\n"
with open(os.path.join(ROOT, 'src', 'content', 'maps', 'md_precinct.ts'), 'w') as f:
    f.write(f"{HEADER}export const md_precinct: MapDef = {ts(md_precinct)};\n")
print('md_precinct', W, 'x', H)
