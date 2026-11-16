#!/usr/bin/env python3
"""Generates src/content/maps/md_ring.ts — Meridian's Dead Ring: the ruined outer districts beyond the Wall (WORLD §3.1:
towers, scavengers, squatters, things best avoided).

The Wall runs down the east side. In the north-east the Loop's last halt, Clover, a metal deck where the rail goes under
the Wall through a portal with a turnstile. Down the Wall the gate road comes north from the Precinct's approach (an exit
at the south edge). West of the road: the yard, cutting dead towers for steel. In the middle, the circuit the buggies
race: the old cloverleaf's ramps, a ring of cracked asphalt behind low piers round an infield of rubble and broken
pillars, with the cut through the broken ramp down its middle. South of it the stands, the slate booth and pit row with
Emil's shed. North-west, Leven: a squatted tower shell. North, two dead towers, one with a dormant machine in it.
    python3 tools/maps/gen_md_ring.py
"""
import json, os, re

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
W, H = 72, 56


def ts(obj):
    s = json.dumps(obj, indent=2)
    s = re.sub(r'"([A-Za-z_][A-Za-z0-9_]*)":', r'\1:', s)
    s = re.sub(r'"hex:(0x[0-9a-fA-F]+)"', r'\1', s)
    return s


g = [['k'] * W for _ in range(H)]


def fill(x0, y0, x1, y1, ch):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            g[y][x] = ch


def building(x0, y0, x1, y1, wall, floor, doors):
    fill(x0, y0, x1, y1, wall)
    fill(x0 + 1, y0 + 1, x1 - 1, y1 - 1, floor)
    for (x, y) in doors:
        g[y][x] = floor


# the rim: dead tower stumps round three sides; the Wall down the east
fill(0, 0, W - 1, 0, 'R'); fill(0, H - 1, W - 1, H - 1, 'R'); fill(0, 0, 0, H - 1, 'R'); fill(W - 1, 0, W - 1, H - 1, 'R')
fill(68, 1, 70, H - 2, 'H')
# the gate road down the Wall, out of the map south to the Precinct's approach
fill(58, 9, 66, H - 2, 'c'); fill(60, H - 1, 64, H - 1, 'c')
# Clover: the Loop's last halt, a metal deck against the Wall where the rail goes under it
fill(54, 1, 67, 8, 'm')
fill(67, 4, 67, 6, 't')   # the turnstile's plate at the portal
# the street along the north, from Leven's door to the halt
fill(1, 11, 57, 12, 'a')
# Leven: Tower Eleven's lower floors, squatted; doors south and east
building(2, 1, 22, 10, 'L', 'c', [(12, 10), (22, 5)])
fill(3, 2, 21, 2, 'c')
building(8, 3, 14, 7, 'L', 'c', [(11, 7)])   # the tank room in the tower's core
# two dead towers north, shells open to the sky
building(26, 2, 35, 9, 'T', 'k', [(30, 9)])
building(38, 2, 47, 8, 'T', 'k', [(42, 8)])
# the circuit: the cloverleaf's ramps, a ring of asphalt behind low piers, the infield, the cut
fill(3, 13, 45, 44, 'P')
fill(4, 14, 44, 43, 'a')
fill(8, 18, 40, 39, 'k')
fill(22, 18, 25, 39, 'a')                                   # the cut: the broken ramp across the infield
for (x0, y0) in [(11, 21), (16, 30), (12, 35), (30, 22), (35, 31), (31, 36), (17, 22), (36, 25)]:
    fill(x0, y0, x0 + 1, y0 + 1, 'Q')                        # broken pillars of the old ramps
for (x, y) in [(12, 13), (13, 13), (30, 13), (31, 13), (14, 44), (15, 44), (28, 44), (29, 44), (45, 27), (45, 28), (45, 29)]:
    g[y][x] = 'a'                                            # gaps in the piers: the street, the pits, the stands, the yard
# the stands, the slate booth, pit row and Emil's shed, south of the circuit
fill(19, 45, 38, 53, 'c')
building(26, 47, 31, 51, 'M', 'm', [(28, 47)])
fill(2, 45, 18, 53, 'c')
building(3, 46, 10, 52, 'S', 'c', [(10, 49)])
# the yard, between the circuit and the road: heaps, the boss's container
fill(47, 13, 57, 53, ',')
building(49, 19, 55, 24, 'M', 'm', [(52, 24)])
fill(46, 27, 46, 29, 'a'); fill(39, 45, 57, 46, ',')
rows = [''.join(r) for r in g]

props = [
    # Clover halt: the tram, the board, the turnstile and its lens, a lamp
    {'kind': 'machine', 'x': 62, 'y': 4, 'rot': 1, 'id': 'dr_tram'}, {'kind': 'sign', 'x': 57, 'y': 3, 'rot': 1, 'id': 'dr_loop_sign'}, {'kind': 'terminal', 'x': 66, 'y': 3, 'rot': 3, 'id': 'dr_turnstile'},
    {'kind': 'lamp_post', 'x': 56, 'y': 7}, {'kind': 'chair', 'x': 59, 'y': 7, 'rot': 0}, {'kind': 'debris', 'x': 55, 'y': 2},
    # the gate road: the Ring's sign, wrecks, a fire barrel
    {'kind': 'sign', 'x': 59, 'y': 50, 'rot': 1, 'id': 'dr_road_sign'}, {'kind': 'car_wreck', 'x': 65, 'y': 40, 'rot': 0}, {'kind': 'fire_barrel', 'x': 60, 'y': 30}, {'kind': 'debris', 'x': 64, 'y': 20}, {'kind': 'lamp_post', 'x': 59, 'y': 15},
    # Leven: the chalked door, cots, stoves, the rain tank, a ladder of crates
    {'kind': 'sign', 'x': 12, 'y': 11, 'rot': 0, 'id': 'dr_leven_door'}, {'kind': 'tank', 'x': 11, 'y': 5, 'id': 'dr_tank'}, {'kind': 'stove', 'x': 4, 'y': 4}, {'kind': 'stove', 'x': 18, 'y': 8},
    {'kind': 'cot', 'x': 4, 'y': 7, 'rot': 1}, {'kind': 'cot', 'x': 4, 'y': 9, 'rot': 1}, {'kind': 'cot', 'x': 17, 'y': 4, 'rot': 3}, {'kind': 'cot', 'x': 20, 'y': 8, 'rot': 3}, {'kind': 'blanket', 'x': 7, 'y': 9}, {'kind': 'blanket', 'x': 16, 'y': 9},
    {'kind': 'table', 'x': 18, 'y': 3, 'id': 'dr_count'}, {'kind': 'chair', 'x': 19, 'y': 3, 'rot': 3}, {'kind': 'crate', 'x': 6, 'y': 3}, {'kind': 'crate', 'x': 21, 'y': 9}, {'kind': 'planter', 'x': 15, 'y': 3},
    # the dead towers: rubble, and the dormant machine in the second
    {'kind': 'debris', 'x': 28, 'y': 4}, {'kind': 'rock_small', 'x': 33, 'y': 7}, {'kind': 'dead_tree', 'x': 31, 'y': 5}, {'kind': 'hound_dormant', 'x': 43, 'y': 4, 'rot': 2, 'id': 'dr_hound'}, {'kind': 'debris', 'x': 40, 'y': 6},
    # the circuit: the start gantry, lamps on the piers, wrecks in the infield, the cut's broken edge
    {'kind': 'sign', 'x': 27, 'y': 45, 'rot': 0, 'id': 'dr_start'}, {'kind': 'lamp_post', 'x': 20, 'y': 45}, {'kind': 'lamp_post', 'x': 37, 'y': 45}, {'kind': 'tire_pile', 'x': 5, 'y': 15}, {'kind': 'tire_pile', 'x': 43, 'y': 15}, {'kind': 'tire_pile', 'x': 5, 'y': 42}, {'kind': 'tire_pile', 'x': 43, 'y': 42},
    {'kind': 'car_wreck', 'x': 14, 'y': 26, 'rot': 1}, {'kind': 'car_wreck', 'x': 33, 'y': 28, 'rot': 3}, {'kind': 'debris', 'x': 19, 'y': 33}, {'kind': 'sign', 'x': 24, 'y': 19, 'rot': 2, 'id': 'dr_cut'}, {'kind': 'rock', 'x': 10, 'y': 37}, {'kind': 'debris', 'x': 37, 'y': 20},
    # the stands: wrecks piled for seats, the slate booth, a fire barrel
    {'kind': 'car_wreck', 'x': 21, 'y': 52, 'rot': 0}, {'kind': 'car_wreck', 'x': 35, 'y': 52, 'rot': 0}, {'kind': 'chair', 'x': 23, 'y': 48, 'rot': 0}, {'kind': 'chair', 'x': 34, 'y': 48, 'rot': 0}, {'kind': 'fire_barrel', 'x': 33, 'y': 50},
    {'kind': 'counter', 'x': 28, 'y': 49, 'rot': 0}, {'kind': 'sign', 'x': 30, 'y': 46, 'rot': 0, 'id': 'dr_slate_sign'}, {'kind': 'locker', 'x': 27, 'y': 50, 'id': 'dr_slate_box'},
    # pit row: buggies on blocks, the Heron, tools, Emil's shed
    {'kind': 'car_wreck', 'x': 13, 'y': 47, 'rot': 1, 'id': 'dr_heron'}, {'kind': 'car_wreck', 'x': 16, 'y': 47, 'rot': 1, 'id': 'dr_mule'}, {'kind': 'car_wreck', 'x': 14, 'y': 51, 'rot': 1}, {'kind': 'tire_pile', 'x': 17, 'y': 52},
    {'kind': 'counter', 'x': 5, 'y': 48, 'rot': 1}, {'kind': 'shelf', 'x': 4, 'y': 51, 'rot': 1}, {'kind': 'machine', 'x': 8, 'y': 47, 'rot': 2}, {'kind': 'cot', 'x': 8, 'y': 51, 'rot': 3}, {'kind': 'locker', 'x': 5, 'y': 47, 'id': 'dr_emil_locker'}, {'kind': 'barrel', 'x': 12, 'y': 53},
    # the yard: heaps of cut steel, the tally board, the boss's container
    {'kind': 'sign', 'x': 51, 'y': 26, 'rot': 0, 'id': 'dr_yard_board'}, {'kind': 'tire_pile', 'x': 48, 'y': 15}, {'kind': 'car_wreck', 'x': 54, 'y': 15, 'rot': 0}, {'kind': 'pipe_h', 'x': 48, 'y': 32}, {'kind': 'pipe_h', 'x': 49, 'y': 32}, {'kind': 'pipe_h', 'x': 50, 'y': 32},
    {'kind': 'crate', 'x': 55, 'y': 34}, {'kind': 'crate', 'x': 55, 'y': 35}, {'kind': 'barrel_rust', 'x': 48, 'y': 40}, {'kind': 'debris', 'x': 53, 'y': 42}, {'kind': 'fire_barrel', 'x': 50, 'y': 37}, {'kind': 'machine', 'x': 54, 'y': 29, 'rot': 3},
    {'kind': 'table', 'x': 52, 'y': 21}, {'kind': 'chair', 'x': 53, 'y': 21, 'rot': 3}, {'kind': 'locker', 'x': 50, 'y': 20, 'id': 'dr_yard_locker'}, {'kind': 'shelf', 'x': 54, 'y': 20, 'rot': 3},
]

md_ring = {
    'id': 'md_ring', 'name': 'Meridian — Dead Ring', 'seed': 97, 'settlement': 'meridian',
    'layout': rows,
    'legend': {
        'k': {'floor': 'rubble'}, 'a': {'floor': 'asphalt'}, 'c': {'floor': 'concrete'}, 'm': {'floor': 'metal'}, 't': {'floor': 'tile'}, ',': {'floor': 'dirt'},
        'R': {'wall': 'concrete', 'floor': 'rubble', 'wallHeight': 6},
        'H': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 5.5},
        'P': {'wall': 'concrete', 'floor': 'asphalt', 'wallHeight': 1.0},
        'Q': {'wall': 'concrete', 'floor': 'rubble', 'wallHeight': 3.5},
        'L': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 4.2, 'roof': 'flat'},
        'T': {'wall': 'concrete', 'floor': 'rubble', 'wallHeight': 6, 'roof': 'none'},
        'S': {'wall': 'scrap', 'floor': 'concrete', 'wallHeight': 3.0, 'roof': 'tin'},
        'M': {'wall': 'metal', 'floor': 'metal', 'wallHeight': 2.8},
    },
    'props': props,
    'lights': [
        {'x': 56, 'y': 7, 'height': 3.4, 'color': 'hex:0xe8f0ff', 'intensity': 2.2, 'range': 10}, {'x': 66, 'y': 3, 'height': 1.6, 'color': 'hex:0xff5050', 'intensity': 1.4, 'range': 4},
        {'x': 59, 'y': 15, 'height': 3.2, 'color': 'hex:0xffb060', 'intensity': 2.0, 'range': 9, 'flicker': 0.3}, {'x': 60, 'y': 30, 'height': 0.8, 'color': 'hex:0xff9a40', 'intensity': 1.6, 'range': 5, 'flicker': 0.35},
        {'x': 4, 'y': 4, 'height': 0.8, 'color': 'hex:0xff9a40', 'intensity': 1.6, 'range': 6, 'flicker': 0.35}, {'x': 18, 'y': 8, 'height': 0.8, 'color': 'hex:0xff9a40', 'intensity': 1.6, 'range': 6, 'flicker': 0.35}, {'x': 12, 'y': 6, 'height': 2.6, 'color': 'hex:0xffd8a0', 'intensity': 1.2, 'range': 6},
        {'x': 20, 'y': 45, 'height': 4.0, 'color': 'hex:0xfff0d0', 'intensity': 3.0, 'range': 14}, {'x': 37, 'y': 45, 'height': 4.0, 'color': 'hex:0xfff0d0', 'intensity': 3.0, 'range': 14}, {'x': 27, 'y': 45, 'height': 3.0, 'color': 'hex:0xff4040', 'intensity': 1.6, 'range': 6, 'flicker': 0.2},
        {'x': 33, 'y': 50, 'height': 0.8, 'color': 'hex:0xff9a40', 'intensity': 1.6, 'range': 5, 'flicker': 0.35}, {'x': 28, 'y': 49, 'height': 2.4, 'color': 'hex:0xffd8a0', 'intensity': 1.6, 'range': 6},
        {'x': 7, 'y': 49, 'height': 2.6, 'color': 'hex:0xffe0b0', 'intensity': 1.8, 'range': 7, 'flicker': 0.15}, {'x': 15, 'y': 49, 'height': 3.0, 'color': 'hex:0xffb060', 'intensity': 1.6, 'range': 7},
        {'x': 50, 'y': 37, 'height': 0.8, 'color': 'hex:0xff9a40', 'intensity': 1.6, 'range': 5, 'flicker': 0.35}, {'x': 52, 'y': 22, 'height': 2.4, 'color': 'hex:0xffd8a0', 'intensity': 1.6, 'range': 6},
    ],
    'spawns': [
        {'id': 'start', 'x': 62, 'y': 53, 'facing': 0}, {'id': 'from_precinct', 'x': 62, 'y': 53, 'facing': 0}, {'id': 'loop', 'x': 61, 'y': 7, 'facing': 2},
        {'id': 'pits', 'x': 15, 'y': 49, 'facing': 0}, {'id': 'leven', 'x': 12, 'y': 12, 'facing': 0}, {'id': 'yard', 'x': 52, 'y': 26, 'facing': 0},
    ],
    'exits': [
        {'x': 60, 'y': H - 1, 'w': 5, 'h': 1, 'to': {'location': 'md_precinct', 'spawn': 'from_ring'}, 'label': 'The gate road south, along the Wall to the Precinct'},
    ],
    'talk': {
        'dr_loop_sign': {'dialogue': 'd_dr_loop', 'name': 'The Loop — Clover'},
        'dr_turnstile': {'dialogue': 'd_dr_loop', 'name': 'The turnstile'},
        'dr_road_sign': {'dialogue': 'd_dr_road_sign', 'name': 'Chalk on the Wall'},
        'dr_leven_door': {'dialogue': 'd_dr_leven_door', 'name': 'Leven\'s door'},
        'dr_count': {'dialogue': 'd_dr_count', 'name': 'The count'},
        'dr_hound': {'dialogue': 'd_dr_hound', 'name': 'A machine in the dark'},
        'dr_start': {'dialogue': 'd_dr_start', 'name': 'The start gantry'},
        'dr_cut': {'dialogue': 'd_dr_cut', 'name': 'The broken ramp'},
        'dr_slate_sign': {'dialogue': 'd_dr_slate_sign', 'name': 'The slate'},
        'dr_heron': {'dialogue': 'd_dr_heron', 'name': 'A buggy on blocks'},
        'dr_mule': {'dialogue': 'd_dr_mule', 'name': 'The Mule'},
        'dr_yard_board': {'dialogue': 'd_dr_yard_board', 'name': 'The tally'},
    },
    'containers': {
        'dr_slate_box': {'name': 'Slate Box', 'items': [['c_bitters', 1]], 'tolls': 90, 'lock': 55},
        'dr_emil_locker': {'name': 'Emil\'s Locker', 'items': [['t_repair', 2], ['j_wiring', 3], ['j_electronics', 2]], 'tolls': 15, 'lock': 40},
        'dr_yard_locker': {'name': 'Yard Locker', 'items': [['k_dr_yardbook', 1], ['a_12ga', 6]], 'tolls': 70, 'lock': 45},
    },
    'spots': {
        'halt': {'x': 60, 'y': 6}, 'halt_sit': {'x': 59, 'y': 6}, 'road_fire': {'x': 61, 'y': 30}, 'road_lean': {'x': 63, 'y': 44}, 'road_pair_a': {'x': 60, 'y': 22}, 'road_pair_b': {'x': 61, 'y': 22},
        'leven_count': {'x': 18, 'y': 4}, 'leven_door': {'x': 12, 'y': 12}, 'leven_door_in': {'x': 12, 'y': 9}, 'leven_tank': {'x': 11, 'y': 6}, 'leven_cot': {'x': 5, 'y': 8}, 'leven_fire_a': {'x': 5, 'y': 5}, 'leven_fire_b': {'x': 17, 'y': 8}, 'leven_sit': {'x': 16, 'y': 8},
        'street_w': {'x': 20, 'y': 12}, 'street_e': {'x': 48, 'y': 11},
        'tower_a': {'x': 30, 'y': 6}, 'tower_b': {'x': 42, 'y': 6},
        'slate': {'x': 28, 'y': 48}, 'stands_box': {'x': 34, 'y': 47}, 'stands_sit_a': {'x': 23, 'y': 49}, 'stands_sit_b': {'x': 36, 'y': 49}, 'stands_pair_a': {'x': 25, 'y': 46}, 'stands_pair_b': {'x': 26, 'y': 46}, 'stands_lean': {'x': 37, 'y': 47},
        'grid': {'x': 29, 'y': 42}, 'grid_b': {'x': 31, 'y': 42},
        'pits_heron': {'x': 13, 'y': 49}, 'pits_mule': {'x': 16, 'y': 49}, 'pits_work': {'x': 15, 'y': 51}, 'emil': {'x': 7, 'y': 48}, 'emil_cot': {'x': 7, 'y': 51}, 'pits_sit': {'x': 18, 'y': 50},
        'yard_boss': {'x': 52, 'y': 22}, 'yard_work': {'x': 49, 'y': 34}, 'yard_work_b': {'x': 53, 'y': 38}, 'yard_fire': {'x': 51, 'y': 37}, 'yard_gate': {'x': 47, 'y': 28},
    },
    'npcs': [
        {'def': 'npc_dr_01', 'x': 28, 'y': 48, 'facing': 0},
        {'def': 'npc_dr_02', 'x': 13, 'y': 49, 'facing': 0, 'if': {'not': {'flag': 'dr_bello', 'eq': 'inside'}}},
        {'def': 'npc_dr_03', 'x': 7, 'y': 48, 'facing': 1},
        {'def': 'npc_dr_04', 'x': 34, 'y': 47, 'facing': 0, 'if': {'not': {'flag': 'dr_haverty', 'eq': 'barred'}}},
        {'def': 'npc_dr_05', 'x': 18, 'y': 4, 'facing': 2, 'if': {'not': {'flag': 'dr_leven_burned'}}},
        {'def': 'npc_dr_06', 'x': 52, 'y': 22, 'facing': 2},
        {'def': 'npc_dr_07', 'x': 49, 'y': 34, 'facing': 1, 'if': {'not': {'flag': 'dr_sami', 'eq': 'pits'}}},
        {'def': 'npc_dr_07', 'id': 'npc_dr_07_pits', 'x': 15, 'y': 51, 'facing': 0, 'schedule': [], 'if': {'flag': 'dr_sami', 'eq': 'pits'}},
        {'def': 'npc_dr_g1', 'x': 60, 'y': 6, 'facing': 2},
    ],
    'triggers': [
        {'id': 'arrive', 'x': 58, 'y': 46, 'w': 9, 'h': 9, 'text': 'The Ring. North along the Wall the road runs between the Wall\'s grey face on one side and, on the other, towers with nothing in them, a salvage yard, smoke, and somewhere ahead the sound of engines. Nobody here has a card. Nobody here is counted, except by each other.', 'effects': [{'learn': 'seen_ring'}, {'set': 'md_ring_open'}, {'learn': 'dead_ring_heard'}]},
        {'id': 'arrive_loop', 'x': 54, 'y': 1, 'w': 13, 'h': 8, 'text': 'Clover: the Loop\'s last halt, a metal deck outside the Wall where the rail comes out of a portal and stops against a buffer. A turnstile and a lens on the portal. Below the deck, a ring of cracked asphalt round a field of broken pillars, and the smell of alcohol fuel.', 'effects': [{'learn': 'seen_ring'}, {'set': 'md_ring_open'}, {'learn': 'dead_ring_heard'}]},
        {'id': 'circuit', 'x': 4, 'y': 40, 'w': 41, 'h': 4, 'text': 'Clover: the old cloverleaf\'s ramps cut down to a ring of asphalt behind low piers, with tyres stacked at the bends and a gantry at the start line. Tyre marks everywhere, black over black. Through the middle, where a ramp fell, a straight line of rubble somebody has been driving across.', 'effects': [{'learn': 'seen_clover'}, {'quest': 'q_dr_clover', 'start': True}]},
        {'id': 'leven', 'x': 2, 'y': 11, 'w': 20, 'h': 2, 'text': 'Leven: the lower floors of a tower called Eleven before the Burn, squatted all the way up to where the floors stop. Washing on wires across the windows. A door with chalk on it, and a woman inside counting something.', 'effects': [{'learn': 'seen_leven'}]},
        {'id': 'yard', 'x': 47, 'y': 25, 'w': 11, 'h': 6, 'text': 'A salvage yard: girders on trestles, steel cut into lengths and stacked by weight, a torch going, and a board of tallies with tower numbers on it. Twelve people working and none of them talking.', 'effects': [{'learn': 'seen_dr_yard'}]},
        {'id': 'tower', 'x': 39, 'y': 3, 'w': 8, 'h': 5, 'text': 'A dead tower\'s shell, open to the sky, rubble to the knee. Something in the back of it, under a fall of concrete, that is not rubble: legs folded under it like a dog asleep, and a sensor head the size of a bucket. It does not move. Children\'s handprints in chalk on its flank.', 'effects': [{'learn': 'dr_hound_seen'}]},
    ],
    'extras': [
        {'count': 5, 'roles': ['street', 'labourer', 'drifter', 'tech'], 'life': 'hard', 'area': {'x': 19, 'y': 45, 'w': 20, 'h': 8}, 'spots': ['stands_sit_a', 'stands_sit_b', 'stands_pair_a', 'stands_pair_b', 'stands_lean'], 'hours': {'from': 16, 'to': 24}, 'barks': ['Bello. Bello. Always Bello.', 'Two on the Mule to finish. Nobody bets the Mule to win.', 'Dorota\'s flag. Nobody jumps Dorota\'s flag twice.', 'The Crown came down last season to watch. They clapped like it was a play.', 'Somebody always goes into the tyres at the cloverleaf.']},
        {'count': 4, 'roles': ['settler', 'street', 'drifter'], 'life': 'starved', 'ages': [6, 70], 'area': {'x': 3, 'y': 2, 'w': 18, 'h': 8}, 'spots': ['leven_fire_a', 'leven_fire_b', 'leven_sit', 'leven_cot'], 'barks': ['Ninety-one on the count. Ninety-two since Tuesday.', 'Rain tank\'s at a hand. Ha-eun says a hand lasts.', 'They don\'t burn a tower with a count. That\'s what the count\'s for.', 'Nobody inside the Wall has ever counted us.']},
        {'count': 4, 'roles': ['labourer', 'tech'], 'life': 'hard', 'area': {'x': 47, 'y': 30, 'w': 10, 'h': 16}, 'spots': ['yard_work', 'yard_work_b', 'yard_fire'], 'hours': {'from': 6, 'to': 20}, 'barks': ['Steel\'s weighed at the gate.', 'Tower Six came down sweet. Forty ton.', 'Ruben pays. That\'s all I know about Ruben.']},
        {'count': 2, 'roles': ['drifter', 'trader'], 'life': 'hard', 'area': {'x': 58, 'y': 10, 'w': 9, 'h': 40}, 'spots': ['road_fire', 'road_lean', 'road_pair_a', 'road_pair_b'], 'barks': ['The Wall doesn\'t look at you out here. That\'s the good of it.', 'The line\'s at the gate. The Ring\'s for when you stop queueing.']},
        {'count': 2, 'roles': ['tech', 'labourer'], 'life': 'hard', 'area': {'x': 11, 'y': 46, 'w': 8, 'h': 7}, 'spots': ['pits_work', 'pits_sit'], 'hours': {'from': 14, 'to': 23}, 'barks': ['Emil says the Mule has one more season in her. Emil says that every season.', 'Alcohol, two jugs. The Heron drinks three.']},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0x9a8a74', 'fogDensity': 0.012, 'dust': 0.35, 'grade': 0.35, 'mood': 'haze', 'sound': 'wind'},
}

HEADER = "import type { MapDef } from '../../engine/data/types';\n\n// Generated by tools/maps/gen_md_ring.py — edit the generator, then re-run it.\n"
with open(os.path.join(ROOT, 'src', 'content', 'maps', 'md_ring.ts'), 'w') as f:
    f.write(f"{HEADER}export const md_ring: MapDef = {ts(md_ring)};\n")
print('md_ring', W, 'x', H)
