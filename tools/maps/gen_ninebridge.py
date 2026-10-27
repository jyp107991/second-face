#!/usr/bin/env python3
"""Generates src/content/maps/ninebridge.ts — Ninebridge, the Tollmen's trade town on the broken bridge
(DESIGN §13b: trade town — built on infrastructure, vertical stalls; markets, banks, brokers; contract law).

The old highway bridge crosses a dry gorge west→east. The town lives on the deck: stalls along both parapets,
the Span (a bar in a scrap hull), two container berths to rent, and mid-span the Exchange hall where the guild
sells paper. The ninth span fell years ago; you cross the gap on planks. West bank: the toll post and the
porters' camp. East bank: the auction block with its cage.
    python3 tools/maps/gen_ninebridge.py
"""
import json, os, re

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
W, H = 72, 44


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


# rock rim with the highway cut through it both sides
fill(0, 0, W - 1, 0, 'R'); fill(0, H - 1, W - 1, H - 1, 'R'); fill(0, 0, 0, H - 1, 'R'); fill(W - 1, 0, W - 1, H - 1, 'R')
fill(0, 18, 0, 25, 'c'); fill(W - 1, 18, W - 1, 25, 'c')
# glass crust patches on both banks
for (x0, y0, x1, y1) in [(2, 2, 12, 8), (3, 10, 8, 14), (52, 2, 66, 7), (62, 30, 69, 40), (12, 2, 20, 5)]:
    fill(x0, y0, x1, y1, 'g')
# the gorge: a dry riverbed between two cliffs; the bridge deck spans it
fill(26, 1, 45, 42, 'r')
fill(25, 1, 25, 42, 'R'); fill(46, 1, 46, 42, 'R')
# the approach roads
fill(1, 18, 24, 25, 'c'); fill(47, 18, 70, 25, 'c')
# THE DECK (asphalt) with low scrap parapets north and south
fill(22, 14, 49, 29, 'a')
fill(22, 14, 49, 14, 'P'); fill(22, 29, 49, 29, 'P')
fill(25, 14, 25, 29, 'a'); fill(46, 14, 46, 29, 'a')   # the cliff line is under the deck here
g[14][25] = 'P'; g[29][25] = 'P'; g[14][46] = 'P'; g[29][46] = 'P'
# the fallen ninth span: a hole in the deck, crossed on planks along the south side
fill(46, 15, 49, 21, 'V')
fill(46, 22, 49, 25, 'w')
# the Span: a bar in a scrap hull at the west end of the deck, door east onto the deck
building(23, 15, 30, 20, 'S', 'w', [(30, 18)])
# two container berths at the west end, south side, doors north
building(23, 24, 27, 28, 'M', 'm', [(25, 24)])
building(28, 24, 32, 28, 'M', 'm', [(30, 24)])
# the Exchange hall mid-span: containers welded into a hall, doors north and south; the office in its east end
building(33, 17, 41, 25, 'M', 'm', [(37, 25), (37, 17)])
fill(38, 18, 38, 21, 'M'); fill(38, 22, 40, 22, 'M'); g[22][40] = 'm'
# the porters' camp on the west bank, south of the road
fill(4, 30, 20, 40, ',')
# the auction block on the east bank, north of the road: a metal platform with a cage
fill(53, 9, 61, 15, 'm')
fill(58, 10, 61, 13, 'F'); fill(59, 11, 60, 12, 'm'); g[12][58] = 'm'
# the toll post booth west of the deck, north of the road
building(17, 13, 21, 16, 'C', 'c', [(19, 16)])

rows = [''.join(r) for r in g]

props = [
    # the toll post: sandbags, lamp, the rates board, a barrier
    {'kind': 'sandbags', 'x': 19, 'y': 17}, {'kind': 'sandbags', 'x': 19, 'y': 26}, {'kind': 'lamp_post', 'x': 21, 'y': 17}, {'kind': 'lamp_post', 'x': 21, 'y': 26},
    {'kind': 'sign', 'x': 18, 'y': 17, 'rot': 1, 'id': 'nb_rates'}, {'kind': 'fire_barrel', 'x': 16, 'y': 26},
    {'kind': 'table', 'x': 18, 'y': 14, 'id': 'nb_toll_desk'}, {'kind': 'chair', 'x': 18, 'y': 15, 'rot': 0}, {'kind': 'locker', 'x': 20, 'y': 14, 'id': 'nb_toll_locker'},
    # the porters' camp: tents, a fire, the strike's planks and crates
    {'kind': 'tent', 'x': 6, 'y': 33, 'rot': 1}, {'kind': 'tent', 'x': 6, 'y': 38, 'rot': 1}, {'kind': 'tent', 'x': 17, 'y': 38, 'rot': 3}, {'kind': 'campfire', 'x': 11, 'y': 35},
    {'kind': 'crate', 'x': 14, 'y': 32, 'id': 'nb_porters_crate'}, {'kind': 'crate', 'x': 15, 'y': 32}, {'kind': 'barrel', 'x': 9, 'y': 31}, {'kind': 'debris', 'x': 13, 'y': 39},
    {'kind': 'sign', 'x': 10, 'y': 30, 'rot': 0, 'id': 'nb_strike_sign'}, {'kind': 'car_wreck', 'x': 18, 'y': 34, 'rot': 1},
    # the deck's west end: the Span's door lamp, a sign
    {'kind': 'lamp_post', 'x': 31, 'y': 17}, {'kind': 'sign', 'x': 31, 'y': 19, 'rot': 3, 'id': 'nb_span_sign'},
    # inside the Span: a bar counter, the Dust table, stools, a stove, barrels
    {'kind': 'counter', 'x': 24, 'y': 16, 'rot': 0}, {'kind': 'counter', 'x': 25, 'y': 16, 'rot': 0}, {'kind': 'shelf', 'x': 26, 'y': 16, 'rot': 0},
    {'kind': 'table', 'x': 27, 'y': 18, 'id': 'nb_dust_table'}, {'kind': 'chair', 'x': 26, 'y': 18, 'rot': 1}, {'kind': 'chair', 'x': 28, 'y': 18, 'rot': 3}, {'kind': 'chair', 'x': 27, 'y': 19, 'rot': 2},
    {'kind': 'stove', 'x': 29, 'y': 16}, {'kind': 'barrel', 'x': 29, 'y': 19}, {'kind': 'barrel', 'x': 24, 'y': 19},
    # the berths: a bed and a locker each
    {'kind': 'bed', 'x': 24, 'y': 27, 'rot': 1, 'id': 'nb_berth_a_bed'}, {'kind': 'locker', 'x': 26, 'y': 27, 'id': 'nb_berth_a_locker'}, {'kind': 'sign', 'x': 25, 'y': 23, 'rot': 0, 'id': 'nb_berth_a_door'},
    {'kind': 'bed', 'x': 29, 'y': 27, 'rot': 1}, {'kind': 'locker', 'x': 31, 'y': 27, 'id': 'nb_berth_b_locker'}, {'kind': 'sign', 'x': 30, 'y': 23, 'rot': 0, 'id': 'nb_berth_b_door'},
    # stalls along the north parapet (counters face the lane) and the south parapet
    {'kind': 'counter', 'x': 32, 'y': 15, 'rot': 2}, {'kind': 'crate', 'x': 33, 'y': 15}, {'kind': 'blanket', 'x': 34, 'y': 15}, {'kind': 'barrel', 'x': 35, 'y': 15},
    {'kind': 'counter', 'x': 39, 'y': 15, 'rot': 2}, {'kind': 'counter', 'x': 40, 'y': 15, 'rot': 2}, {'kind': 'crate', 'x': 41, 'y': 15, 'id': 'nb_gun_crate'}, {'kind': 'shelf', 'x': 42, 'y': 15, 'rot': 2},
    {'kind': 'blanket', 'x': 44, 'y': 15}, {'kind': 'crate', 'x': 45, 'y': 15},
    {'kind': 'counter', 'x': 34, 'y': 28, 'rot': 0}, {'kind': 'counter', 'x': 35, 'y': 28, 'rot': 0}, {'kind': 'barrel', 'x': 33, 'y': 28}, {'kind': 'crate', 'x': 36, 'y': 28, 'id': 'nb_food_crate'},
    {'kind': 'blanket', 'x': 40, 'y': 28}, {'kind': 'blanket', 'x': 42, 'y': 28}, {'kind': 'tent', 'x': 44, 'y': 27, 'rot': 0},
    {'kind': 'lamp_post', 'x': 37, 'y': 15}, {'kind': 'lamp_post', 'x': 43, 'y': 15}, {'kind': 'lamp_post', 'x': 38, 'y': 28}, {'kind': 'lamp_post', 'x': 45, 'y': 28},
    {'kind': 'fire_barrel', 'x': 43, 'y': 24},
    # the Exchange hall: the board (a terminal), the floor counter, the ledgers' desk, shelves of paper; the office
    {'kind': 'terminal', 'x': 34, 'y': 18, 'rot': 1, 'id': 'nb_board'}, {'kind': 'counter', 'x': 35, 'y': 21, 'rot': 1}, {'kind': 'counter', 'x': 35, 'y': 22, 'rot': 1},
    {'kind': 'table', 'x': 36, 'y': 19, 'id': 'nb_ledgers'}, {'kind': 'chair', 'x': 37, 'y': 19, 'rot': 3}, {'kind': 'shelf', 'x': 34, 'y': 23, 'rot': 1}, {'kind': 'shelf', 'x': 34, 'y': 24, 'rot': 1},
    {'kind': 'locker', 'x': 36, 'y': 24, 'id': 'nb_floor_cabinet'},
    {'kind': 'table', 'x': 39, 'y': 19, 'id': 'nb_office_desk'}, {'kind': 'chair', 'x': 39, 'y': 20, 'rot': 0}, {'kind': 'locker', 'x': 40, 'y': 18, 'id': 'nb_vault'},
    {'kind': 'sign', 'x': 37, 'y': 26, 'rot': 0, 'id': 'nb_hall_sign'},
    # the fallen span: debris at the edge, the planks' sign
    {'kind': 'debris', 'x': 45, 'y': 17}, {'kind': 'debris', 'x': 45, 'y': 20}, {'kind': 'debris', 'x': 50, 'y': 16}, {'kind': 'barrel_rust', 'x': 44, 'y': 21},
    {'kind': 'sign', 'x': 45, 'y': 22, 'rot': 1, 'id': 'nb_planks'}, {'kind': 'tire_pile', 'x': 50, 'y': 17},
    # east bank: the auction block, the cage, lamps, the east post
    {'kind': 'counter', 'x': 55, 'y': 11, 'rot': 2, 'id': 'nb_block'}, {'kind': 'sign', 'x': 54, 'y': 10, 'rot': 2, 'id': 'nb_lots'}, {'kind': 'cot', 'x': 60, 'y': 11, 'rot': 3, 'id': 'nb_cage_cot'},
    {'kind': 'crate', 'x': 54, 'y': 14, 'id': 'nb_fen_box'}, {'kind': 'lamp_post', 'x': 53, 'y': 16}, {'kind': 'lamp_post', 'x': 61, 'y': 16},
    {'kind': 'sandbags', 'x': 52, 'y': 17}, {'kind': 'sandbags', 'x': 52, 'y': 26}, {'kind': 'lamp_post', 'x': 51, 'y': 26}, {'kind': 'fire_barrel', 'x': 55, 'y': 27},
    {'kind': 'car_wreck', 'x': 64, 'y': 28, 'rot': 0}, {'kind': 'tank', 'x': 56, 'y': 30},
    # the riverbed: boulders and two beached hulls
    {'kind': 'rock', 'x': 30, 'y': 5}, {'kind': 'rock', 'x': 40, 'y': 8}, {'kind': 'rock_small', 'x': 35, 'y': 3}, {'kind': 'rock', 'x': 28, 'y': 36}, {'kind': 'rock', 'x': 42, 'y': 39}, {'kind': 'rock_small', 'x': 33, 'y': 33},
    {'kind': 'car_wreck', 'x': 37, 'y': 6, 'rot': 1}, {'kind': 'machine', 'x': 33, 'y': 38, 'rot': 0}, {'kind': 'debris', 'x': 31, 'y': 10}, {'kind': 'debris', 'x': 39, 'y': 35},
    # the banks
    {'kind': 'dead_tree', 'x': 5, 'y': 16}, {'kind': 'dead_tree', 'x': 66, 'y': 12}, {'kind': 'cactus', 'x': 9, 'y': 9}, {'kind': 'cactus', 'x': 60, 'y': 36},
    {'kind': 'rock', 'x': 3, 'y': 27}, {'kind': 'rock_small', 'x': 14, 'y': 11}, {'kind': 'rock', 'x': 68, 'y': 32}, {'kind': 'rock_small', 'x': 64, 'y': 9},
    {'kind': 'sign', 'x': 3, 'y': 17, 'rot': 2}, {'kind': 'sign', 'x': 68, 'y': 26, 'rot': 0},
]

ninebridge = {
    'id': 'ninebridge', 'name': 'Ninebridge', 'seed': 31, 'settlement': 'ninebridge',
    'layout': rows,
    'legend': {
        '.': {'floor': 'sand'}, ',': {'floor': 'dirt'}, 'g': {'floor': 'rubble'}, 'r': {'floor': 'rubble'}, 'c': {'floor': 'concrete'}, 'a': {'floor': 'asphalt'},
        'w': {'floor': 'wood'}, 'm': {'floor': 'metal'},
        'V': {'empty': True},
        'R': {'wall': 'rock', 'floor': 'rubble', 'wallHeight': 3},
        'P': {'wall': 'scrap', 'floor': 'asphalt', 'wallHeight': 1.0},
        'M': {'wall': 'metal', 'floor': 'metal', 'wallHeight': 2.8},
        'S': {'wall': 'scrap', 'floor': 'wood', 'wallHeight': 2.6},
        'C': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 2.8},
        'F': {'wall': 'fence', 'floor': 'metal', 'wallHeight': 1.3},
    },
    'props': props,
    'lights': [
        {'x': 21, 'y': 17, 'height': 3.2, 'color': 'hex:0xffe0b0', 'intensity': 3, 'range': 10}, {'x': 21, 'y': 26, 'height': 3.2, 'color': 'hex:0xffe0b0', 'intensity': 3, 'range': 10},
        {'x': 31, 'y': 17, 'height': 3.2, 'color': 'hex:0xffd0a0', 'intensity': 2.5, 'range': 9}, {'x': 37, 'y': 15, 'height': 3.2, 'color': 'hex:0xffd0a0', 'intensity': 2.5, 'range': 9},
        {'x': 43, 'y': 15, 'height': 3.2, 'color': 'hex:0xffd0a0', 'intensity': 2.5, 'range': 9}, {'x': 38, 'y': 28, 'height': 3.2, 'color': 'hex:0xffd0a0', 'intensity': 2.5, 'range': 9},
        {'x': 45, 'y': 28, 'height': 3.2, 'color': 'hex:0xffd0a0', 'intensity': 2.5, 'range': 9}, {'x': 53, 'y': 16, 'height': 3.2, 'color': 'hex:0xffe0b0', 'intensity': 2.5, 'range': 9},
        {'x': 61, 'y': 16, 'height': 3.2, 'color': 'hex:0xffe0b0', 'intensity': 2.5, 'range': 9}, {'x': 51, 'y': 26, 'height': 3.2, 'color': 'hex:0xffe0b0', 'intensity': 2.5, 'range': 9},
        {'x': 27, 'y': 18, 'height': 2.2, 'color': 'hex:0xffb070', 'intensity': 2, 'range': 6, 'flicker': 0.15}, {'x': 36, 'y': 21, 'height': 2.6, 'color': 'hex:0xe0f0ff', 'intensity': 2.2, 'range': 7},
        {'x': 39, 'y': 19, 'height': 2.3, 'color': 'hex:0xffd8a0', 'intensity': 1.8, 'range': 5}, {'x': 25, 'y': 26, 'height': 2.2, 'color': 'hex:0xffd8a0', 'intensity': 1.4, 'range': 4}, {'x': 30, 'y': 26, 'height': 2.2, 'color': 'hex:0xffd8a0', 'intensity': 1.4, 'range': 4},
        {'x': 11, 'y': 35, 'height': 0.6, 'color': 'hex:0xff9a40', 'intensity': 2.2, 'range': 6, 'flicker': 0.35}, {'x': 16, 'y': 26, 'height': 0.8, 'color': 'hex:0xff9a40', 'intensity': 1.6, 'range': 5, 'flicker': 0.35},
        {'x': 43, 'y': 24, 'height': 0.8, 'color': 'hex:0xff9a40', 'intensity': 1.6, 'range': 5, 'flicker': 0.35}, {'x': 55, 'y': 27, 'height': 0.8, 'color': 'hex:0xff9a40', 'intensity': 1.6, 'range': 5, 'flicker': 0.35},
    ],
    'spawns': [
        {'id': 'start', 'x': 2, 'y': 21, 'facing': 1}, {'id': 'from_tollhouse', 'x': 2, 'y': 22, 'facing': 1},
        {'id': 'from_openfield', 'x': 69, 'y': 21, 'facing': 3}, {'id': 'from_meridian', 'x': 69, 'y': 22, 'facing': 3}, {'id': 'from_sump', 'x': 69, 'y': 20, 'facing': 3}, {'id': 'from_lm_flats_01', 'x': 69, 'y': 23, 'facing': 3},
        {'id': 'deck', 'x': 32, 'y': 22, 'facing': 1},
    ],
    'exits': [
        {'x': 0, 'y': 18, 'w': 1, 'h': 8, 'to': {'worldMap': True}, 'label': 'The highway west'},
        {'x': 71, 'y': 18, 'w': 1, 'h': 8, 'to': {'worldMap': True}, 'label': 'The road east'},
    ],
    'talk': {
        'nb_rates': {'dialogue': 'd_nb_rates', 'name': 'The bridge rates'},
        'nb_strike_sign': {'dialogue': 'd_nb_strike_sign', 'name': 'A painted plank'},
        'nb_span_sign': {'dialogue': 'd_nb_span_sign', 'name': 'The Span'},
        'nb_berth_a_door': {'dialogue': 'd_nb_berth', 'name': 'Berth A'},
        'nb_berth_b_door': {'dialogue': 'd_nb_berth_b', 'name': 'Berth B'},
        'nb_board': {'dialogue': 'd_nb_board', 'name': 'The board'},
        'nb_ledgers': {'dialogue': 'd_nb_ledgers', 'name': 'The Exchange ledgers'},
        'nb_hall_sign': {'dialogue': 'd_nb_hall_sign', 'name': 'The Exchange'},
        'nb_planks': {'dialogue': 'd_nb_planks', 'name': 'The planks'},
        'nb_lots': {'dialogue': 'd_nb_lots', 'name': 'Today\'s lots'},
        'nb_dust_table': {'dialogue': 'd_nb_dust_table', 'name': 'The Dust table'},
    },
    'containers': {
        'nb_vault': {'name': 'Exchange Vault', 'items': [['k_futures_paper', 1], ['j_electronics', 1]], 'tolls': 120, 'lock': 65},
        'nb_floor_cabinet': {'name': 'Floor Cabinet', 'items': [['c_water', 2]], 'tolls': 30, 'lock': 35},
        'nb_toll_locker': {'name': 'Toll Locker', 'items': [['a_38', 6], ['c_jerky', 1]], 'tolls': 26, 'lock': 40},
        'nb_fen_box': {'name': 'Auctioneer\'s Box', 'items': [['k_sable_contract', 1]], 'tolls': 15, 'lock': 50},
        'nb_porters_crate': {'name': 'Porters\' Crate', 'items': [['c_algae', 3], ['c_dirtywater', 2], ['j_cloth', 1]], 'lock': 15},
        'nb_gun_crate': {'name': 'Stall Crate', 'items': [['a_9mm', 10], ['a_12ga', 4]], 'lock': 45},
        'nb_food_crate': {'name': 'Stall Crate', 'items': [['c_tin', 2], ['c_jerky', 2]], 'lock': 20},
        'nb_berth_a_locker': {'name': 'Berth Locker', 'items': []},
        'nb_berth_b_locker': {'name': 'Berth Locker', 'items': [['c_bandage', 1]], 'lock': 25},
    },
    'spots': {
        'toll_post': {'x': 20, 'y': 21}, 'toll_desk': {'x': 19, 'y': 15}, 'post_w': {'x': 22, 'y': 18}, 'post_e': {'x': 51, 'y': 21}, 'post_block': {'x': 57, 'y': 15},
        'camp_fire': {'x': 10, 'y': 36}, 'camp_tent_a': {'x': 7, 'y': 34}, 'camp_tent_b': {'x': 7, 'y': 39}, 'camp_tent_c': {'x': 16, 'y': 39}, 'camp_stand': {'x': 12, 'y': 33},
        'porters_pair_a': {'x': 13, 'y': 36}, 'porters_pair_b': {'x': 14, 'y': 36}, 'porters_lean': {'x': 17, 'y': 32}, 'ramp_work': {'x': 8, 'y': 22},
        'span_bar': {'x': 25, 'y': 17}, 'span_table': {'x': 27, 'y': 17}, 'span_stool_a': {'x': 26, 'y': 18}, 'span_stool_b': {'x': 28, 'y': 18}, 'span_stove': {'x': 28, 'y': 16},
        'berth_a_bed': {'x': 25, 'y': 27}, 'berth_b_bed': {'x': 30, 'y': 27},
        'stall_cloth': {'x': 34, 'y': 16}, 'stall_guns': {'x': 40, 'y': 16}, 'stall_food': {'x': 35, 'y': 27}, 'stall_blanket_sit': {'x': 41, 'y': 27}, 'stall_tent': {'x': 43, 'y': 26},
        'deck_w': {'x': 31, 'y': 22}, 'deck_mid': {'x': 42, 'y': 23}, 'deck_lean': {'x': 44, 'y': 18}, 'deck_pair_a': {'x': 32, 'y': 26}, 'deck_pair_b': {'x': 33, 'y': 26},
        'hall_door_s': {'x': 36, 'y': 26}, 'hall_door_n': {'x': 38, 'y': 16}, 'hall_floor': {'x': 36, 'y': 21}, 'hall_board': {'x': 35, 'y': 18}, 'hall_desk': {'x': 37, 'y': 20},
        'office_chair': {'x': 39, 'y': 18}, 'office_stand': {'x': 40, 'y': 21},
        'planks_w': {'x': 45, 'y': 23}, 'planks_e': {'x': 50, 'y': 23},
        'block': {'x': 55, 'y': 12}, 'block_stand': {'x': 56, 'y': 13}, 'cage': {'x': 59, 'y': 12}, 'cage_cot_sit': {'x': 60, 'y': 12}, 'crowd_a': {'x': 54, 'y': 16}, 'crowd_b': {'x': 56, 'y': 16},
        'east_fire': {'x': 54, 'y': 27}, 'east_wreck': {'x': 63, 'y': 27},
    },
    'npcs': [
        {'def': 'npc_nb_01', 'x': 39, 'y': 18, 'facing': 0},
        {'def': 'npc_nb_02', 'x': 55, 'y': 12, 'facing': 2},
        {'def': 'npc_nb_03', 'x': 27, 'y': 17, 'facing': 2, 'if': {'not': {'flag': 'odile_joined'}}},
        {'def': 'npc_nb_04', 'x': 20, 'y': 21, 'facing': 3},
        {'def': 'npc_nb_05', 'x': 10, 'y': 36, 'facing': 1},
        {'def': 'npc_nb_06', 'x': 37, 'y': 20, 'facing': 3},
        {'def': 'npc_nb_07', 'x': 42, 'y': 23, 'facing': 3},
        {'def': 'npc_nb_08', 'x': 59, 'y': 12, 'facing': 3, 'if': {'not': {'flag': 'nb_sable_settled'}}},
        {'def': 'npc_nb_09', 'x': 40, 'y': 16, 'facing': 2},
        {'def': 'npc_nb_10', 'x': 35, 'y': 27, 'facing': 0},
        {'def': 'npc_nb_11', 'x': 25, 'y': 17, 'facing': 2},
        {'def': 'npc_nb_g1', 'x': 22, 'y': 18, 'facing': 3}, {'def': 'npc_nb_g2', 'x': 36, 'y': 26, 'facing': 2}, {'def': 'npc_nb_g3', 'x': 51, 'y': 21, 'facing': 3}, {'def': 'npc_nb_g4', 'x': 38, 'y': 16, 'facing': 0},
    ],
    'triggers': [
        {'id': 'arrive_w', 'x': 1, 'y': 17, 'w': 6, 'h': 10, 'text': 'Ninebridge. The old highway walks out over a gorge on nine concrete legs and a town has grown on its back: tents and stalls and welded boxes the whole length of the deck, lamps on poles, a hum of people buying. The ninth span is missing. Below, a river that has not run in ninety years.', 'effects': [{'learn': 'seen_ninebridge'}, {'learn': 'loc_ninebridge'}]},
        {'id': 'arrive_e', 'x': 64, 'y': 17, 'w': 6, 'h': 10, 'text': 'Ninebridge, from the east: the road runs down to a gorge and a bridge with a town on it, and the first thing on this bank is a metal platform with a cage.', 'effects': [{'learn': 'seen_ninebridge'}, {'learn': 'loc_ninebridge'}]},
        {'id': 'toll', 'x': 21, 'y': 18, 'w': 2, 'h': 8, 'once': False, 'if': {'not': {'flag': 'nb_toll_paid'}}, 'effects': [{'event': 'dialogue', 'data': {'tree': 'd_nb_toll', 'name': 'The bridge toll'}}]},
        {'id': 'floor_s', 'x': 37, 'y': 25, 'w': 1, 'h': 1, 'once': False, 'if': {'not': {'flag': 'nb_floor_ok'}}, 'effects': [{'event': 'dialogue', 'data': {'tree': 'd_nb_floor_door', 'name': 'The floor door'}}]},
        {'id': 'floor_n', 'x': 37, 'y': 17, 'w': 1, 'h': 1, 'once': False, 'if': {'not': {'flag': 'nb_floor_ok'}}, 'effects': [{'event': 'dialogue', 'data': {'tree': 'd_nb_floor_door', 'name': 'The floor door'}}]},
        {'id': 'office', 'x': 40, 'y': 22, 'w': 1, 'h': 1, 'once': False, 'if': {'not': {'flag': 'nb_office_ok'}}, 'effects': [{'event': 'dialogue', 'data': {'tree': 'd_nb_office_door', 'name': 'The office door'}}]},
        {'id': 'gap', 'x': 44, 'y': 15, 'w': 2, 'h': 7, 'text': 'The deck ends in air. The ninth span lies in the riverbed in three pieces, with a market stall still bolted to one of them. The way across is four planks along the south parapet.', 'effects': [{'learn': 'seen_ninth_span'}]},
        {'id': 'block', 'x': 53, 'y': 9, 'w': 9, 'h': 8, 'text': 'The auction block: a welded platform, a counter, and a cage with a cot in it. A chalk board lists today\'s lots by number and sum. The sums are people.', 'effects': [{'learn': 'seen_auction_block'}]},
        {'id': 'camp', 'x': 4, 'y': 30, 'w': 17, 'h': 11, 'text': 'The porters\' camp under the west ramp: tents, a fire, and forty people who carry the bridge\'s goods on their backs when the guild says carry — sitting down, today, with their straps off.', 'effects': [{'learn': 'seen_porters_camp'}]},
    ],
    'extras': [
        {'count': 4, 'roles': ['trader', 'drifter', 'street', 'settler', 'nomad'], 'area': {'x': 31, 'y': 15, 'w': 14, 'h': 14}, 'spots': ['deck_lean', 'deck_pair_a', 'deck_pair_b', 'stall_blanket_sit'], 'hours': {'from': 6, 'to': 23}, 'barks': ['Paper\'s up again.', 'Twelve for the crossing, and they call it a bridge.', 'Don\'t buy futures from a man who smiles.', 'The ninth span? Fell the year the river stopped.']},
        {'count': 3, 'roles': ['labourer', 'drifter'], 'life': 'hard', 'area': {'x': 5, 'y': 31, 'w': 14, 'h': 9}, 'spots': ['porters_pair_a', 'porters_pair_b', 'porters_lean', 'camp_stand'], 'barks': ['Straps off. Straps stay off.', 'They forecast we lose. Let them carry it, then.', 'Three days, they said. We can sit three days.']},
        {'count': 2, 'roles': ['trader', 'settler', 'street'], 'area': {'x': 53, 'y': 14, 'w': 8, 'h': 3}, 'spots': ['crowd_a', 'crowd_b'], 'hours': {'from': 9, 'to': 18}, 'barks': ['Lot four\'s young. That\'ll go high.', 'I came for a cook. They\'ve only got debtors.', 'Fen hates it. He\'s good at it, though.']},
        {'count': 1, 'roles': ['guard'], 'faction': 'tollmen', 'team': 'tollmen', 'area': {'x': 47, 'y': 18, 'w': 6, 'h': 8}, 'hours': {'from': 0, 'to': 24}, 'barks': ['Mind the planks.', 'Guild deck. Guild rules.']},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0xc8b4a0', 'fogDensity': 0.013, 'dust': 0.4, 'grade': 0.55, 'mood': 'bustling', 'sound': 'wind'},
}

HEADER = "import type { MapDef } from '../../engine/data/types';\n\n// Generated by tools/maps/gen_ninebridge.py — edit the generator, then re-run it.\n"
with open(os.path.join(ROOT, 'src', 'content', 'maps', 'ninebridge.ts'), 'w') as f:
    f.write(f"{HEADER}export const ninebridge: MapDef = {ts(ninebridge)};\n")
print('ninebridge', W, 'x', H)
