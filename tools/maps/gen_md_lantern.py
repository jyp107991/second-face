#!/usr/bin/env python3
"""Generates src/content/maps/md_lantern.ts — Lantern Row: Meridian's pleasure district along the canal (WORLD §3.1:
bars, fight pits, reverie dens, brothels, gambling; neon from salvaged tubes).

The canal runs east–west through the middle with a towpath on each bank and two grate bridges. North bank: the Loop
stop, the Gilt's bar (the Coinage), the Dust hall, the Velvet, the reverie den (the Lantern). South bank: the fight
pit in its fence ring, the pit master's shack, two scrap houses, the chem corner. The market street comes in from
the west; the road east toward Bridgeward is closed (later).
    python3 tools/maps/gen_md_lantern.py
"""
import json, os, re

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
W, H = 72, 56


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


# rim: ruined blocks all round; the market street cut through west
fill(0, 0, W - 1, 0, 'R'); fill(0, H - 1, W - 1, H - 1, 'R'); fill(0, 0, 0, H - 1, 'R'); fill(W - 1, 0, W - 1, H - 1, 'R')
fill(0, 32, 0, 35, 'a')
# the north bank: the Row's street, the towpath, the buildings
fill(1, 15, 70, 21, 'a')
fill(1, 22, 70, 23, 'c')
fill(2, 2, 12, 8, 'm')
building(4, 3, 10, 7, 'M', 'm', [(7, 7), (7, 3)])        # the Loop's tram
building(16, 4, 28, 14, 'B', 't', [(22, 14)])             # the Coinage: the Gilt's bar
building(32, 4, 44, 12, 'B', 'o', [(38, 12)])             # the Dust hall
building(48, 3, 62, 14, 'B', 't', [(55, 14)])             # the Velvet
building(64, 6, 70, 14, 'M', 'm', [(64, 10)])             # the Lantern: the reverie den
# the canal, its quays and its two bridges
fill(1, 24, 70, 29, 'W')
fill(20, 24, 21, 29, 'g'); fill(50, 24, 51, 29, 'g')
fill(10, 22, 13, 23, 'o'); fill(10, 30, 13, 31, 'o')
# the south bank: the towpath, the street, the pit's ground
fill(1, 30, 70, 31, 'c')
fill(1, 32, 70, 37, 'a')
fill(16, 38, 62, 54, 'c')
fill(28, 40, 42, 52, 'm')                                 # the pit floor
fill(27, 39, 43, 39, 'F'); fill(27, 53, 43, 53, 'F'); fill(27, 40, 27, 52, 'F'); fill(43, 40, 43, 52, 'F')
g[39][35] = 'm'; g[53][35] = 'm'                          # the ring's two gaps
building(18, 42, 24, 48, 'S', 'o', [(24, 45)])            # the pit master's shack
building(48, 41, 54, 47, 'S', 'o', [(48, 44)])            # a scrap house
building(56, 41, 62, 47, 'S', 'o', [(56, 44)])            # another
fill(63, 38, 70, 54, 'k')                                 # the chem corner
fill(1, 38, 15, 54, 'k')                                  # rubble lots west of the pit

rows = [''.join(r) for r in g]

props = [
    # the Loop stop
    {'kind': 'machine', 'x': 6, 'y': 5, 'rot': 1, 'id': 'lr_tram'}, {'kind': 'sign', 'x': 11, 'y': 4, 'rot': 3, 'id': 'lr_loop_sign'}, {'kind': 'chair', 'x': 2, 'y': 5, 'rot': 1}, {'kind': 'lamp_post', 'x': 12, 'y': 9},
    # the Coinage: a bar counter, stools, a stash, the gold tube over the door
    {'kind': 'sign', 'x': 23, 'y': 15, 'rot': 2, 'id': 'lr_bar_sign'}, {'kind': 'counter', 'x': 23, 'y': 7, 'rot': 0}, {'kind': 'counter', 'x': 24, 'y': 7, 'rot': 0}, {'kind': 'counter', 'x': 25, 'y': 7, 'rot': 0},
    {'kind': 'chair', 'x': 22, 'y': 9, 'rot': 0}, {'kind': 'chair', 'x': 25, 'y': 9, 'rot': 0}, {'kind': 'table', 'x': 19, 'y': 11}, {'kind': 'chair', 'x': 18, 'y': 11, 'rot': 1}, {'kind': 'shelf', 'x': 26, 'y': 5, 'rot': 0}, {'kind': 'locker', 'x': 17, 'y': 5, 'id': 'lr_bar_stash'}, {'kind': 'barrel', 'x': 27, 'y': 12},
    # the Dust hall: tables and chairs, a cage for the house
    {'kind': 'sign', 'x': 39, 'y': 13, 'rot': 2, 'id': 'lr_dust_sign'}, {'kind': 'table', 'x': 38, 'y': 7}, {'kind': 'chair', 'x': 37, 'y': 7, 'rot': 1}, {'kind': 'chair', 'x': 39, 'y': 7, 'rot': 3}, {'kind': 'table', 'x': 34, 'y': 10}, {'kind': 'chair', 'x': 35, 'y': 10, 'rot': 3}, {'kind': 'table', 'x': 42, 'y': 10}, {'kind': 'chair', 'x': 41, 'y': 10, 'rot': 1}, {'kind': 'counter', 'x': 42, 'y': 5, 'rot': 0}, {'kind': 'locker', 'x': 43, 'y': 5, 'id': 'lr_dust_cage'},
    # the Velvet: a long counter, lamps, a stair stub, cots behind a curtain of shelves
    {'kind': 'sign', 'x': 56, 'y': 15, 'rot': 2, 'id': 'lr_velvet_sign'}, {'kind': 'counter', 'x': 55, 'y': 6, 'rot': 2}, {'kind': 'counter', 'x': 56, 'y': 6, 'rot': 2}, {'kind': 'chair', 'x': 52, 'y': 9, 'rot': 0}, {'kind': 'chair', 'x': 58, 'y': 9, 'rot': 0}, {'kind': 'table', 'x': 52, 'y': 11}, {'kind': 'table', 'x': 58, 'y': 11},
    {'kind': 'shelf', 'x': 49, 'y': 4, 'rot': 0}, {'kind': 'cot', 'x': 60, 'y': 4, 'rot': 1}, {'kind': 'cot', 'x': 50, 'y': 12, 'rot': 1}, {'kind': 'planter', 'x': 54, 'y': 12},
    # the Lantern: three cots with headsets, the keeper's desk, the locker with the reel
    {'kind': 'sign', 'x': 63, 'y': 11, 'rot': 3, 'id': 'lr_den_sign'}, {'kind': 'cot', 'x': 69, 'y': 7, 'rot': 0}, {'kind': 'terminal', 'x': 68, 'y': 7, 'rot': 1}, {'kind': 'cot', 'x': 69, 'y': 9, 'rot': 0}, {'kind': 'terminal', 'x': 68, 'y': 9, 'rot': 1}, {'kind': 'cot', 'x': 69, 'y': 11, 'rot': 0}, {'kind': 'terminal', 'x': 68, 'y': 11, 'rot': 1},
    {'kind': 'table', 'x': 66, 'y': 9, 'id': 'lr_den_desk'}, {'kind': 'locker', 'x': 65, 'y': 13, 'id': 'lr_den_locker'}, {'kind': 'cot', 'x': 69, 'y': 13, 'rot': 0},
    # the street: lantern posts, a burned-out cab, crates, a drum fire, signs
    {'kind': 'lamp_post', 'x': 14, 'y': 17}, {'kind': 'lamp_post', 'x': 30, 'y': 17}, {'kind': 'lamp_post', 'x': 46, 'y': 17}, {'kind': 'lamp_post', 'x': 62, 'y': 17}, {'kind': 'car_wreck', 'x': 8, 'y': 19, 'rot': 1},
    {'kind': 'crate', 'x': 44, 'y': 20}, {'kind': 'crate', 'x': 45, 'y': 20}, {'kind': 'fire_barrel', 'x': 36, 'y': 20}, {'kind': 'sign', 'x': 69, 'y': 18, 'rot': 3, 'id': 'lr_east_sign'}, {'kind': 'sign', 'x': 2, 'y': 33, 'rot': 1, 'id': 'lr_west_sign'},
    # the canal: the quays, the boat, a sunk cab, debris on the bridges
    {'kind': 'crate', 'x': 10, 'y': 22}, {'kind': 'barrel', 'x': 13, 'y': 22}, {'kind': 'lamp_post', 'x': 9, 'y': 23}, {'kind': 'barrel', 'x': 13, 'y': 31}, {'kind': 'lamp_post', 'x': 9, 'y': 30}, {'kind': 'wagon', 'x': 11, 'y': 26, 'rot': 1, 'id': 'lr_boat'},
    {'kind': 'car_wreck', 'x': 60, 'y': 27, 'rot': 0}, {'kind': 'debris', 'x': 21, 'y': 26}, {'kind': 'lamp_post', 'x': 20, 'y': 30}, {'kind': 'lamp_post', 'x': 51, 'y': 23}, {'kind': 'sign', 'x': 40, 'y': 30, 'rot': 0, 'id': 'lr_canal_sign'},
    # the south street
    {'kind': 'lamp_post', 'x': 22, 'y': 36}, {'kind': 'lamp_post', 'x': 40, 'y': 36}, {'kind': 'lamp_post', 'x': 58, 'y': 36}, {'kind': 'fire_barrel', 'x': 46, 'y': 35}, {'kind': 'crate', 'x': 15, 'y': 34},
    # the pit: a card on a post, bleacher crates, four lamps, the hands' barrels
    {'kind': 'sign', 'x': 35, 'y': 38, 'rot': 0, 'id': 'lr_pit_card'}, {'kind': 'lamp_post', 'x': 26, 'y': 38}, {'kind': 'lamp_post', 'x': 44, 'y': 38}, {'kind': 'lamp_post', 'x': 26, 'y': 54}, {'kind': 'lamp_post', 'x': 44, 'y': 54},
    {'kind': 'crate', 'x': 25, 'y': 41}, {'kind': 'crate', 'x': 25, 'y': 42}, {'kind': 'crate', 'x': 25, 'y': 50}, {'kind': 'crate', 'x': 45, 'y': 41}, {'kind': 'crate', 'x': 45, 'y': 42}, {'kind': 'crate', 'x': 45, 'y': 50}, {'kind': 'crate', 'x': 45, 'y': 51},
    {'kind': 'barrel', 'x': 29, 'y': 54}, {'kind': 'barrel_rust', 'x': 41, 'y': 54}, {'kind': 'blanket', 'x': 36, 'y': 46}, {'kind': 'debris', 'x': 32, 'y': 48},
    # the pit master's shack: a table of slips, a chest, a cot
    {'kind': 'table', 'x': 21, 'y': 44}, {'kind': 'chair', 'x': 21, 'y': 45, 'rot': 0}, {'kind': 'locker', 'x': 19, 'y': 43, 'id': 'lr_pit_chest'}, {'kind': 'cot', 'x': 19, 'y': 47, 'rot': 1},
    # the scrap houses and the chem corner
    {'kind': 'cot', 'x': 50, 'y': 42, 'rot': 1}, {'kind': 'stove', 'x': 53, 'y': 46}, {'kind': 'cot', 'x': 58, 'y': 42, 'rot': 1}, {'kind': 'table', 'x': 60, 'y': 45},
    {'kind': 'fire_barrel', 'x': 66, 'y': 44}, {'kind': 'blanket', 'x': 65, 'y': 47}, {'kind': 'blanket', 'x': 68, 'y': 49}, {'kind': 'tire_pile', 'x': 69, 'y': 52}, {'kind': 'debris', 'x': 64, 'y': 51}, {'kind': 'car_wreck', 'x': 5, 'y': 44, 'rot': 2}, {'kind': 'tire_pile', 'x': 10, 'y': 50}, {'kind': 'debris', 'x': 3, 'y': 40},
]

md_lantern = {
    'id': 'md_lantern', 'name': 'Meridian — Lantern Row', 'seed': 61, 'settlement': 'meridian',
    'layout': rows,
    'legend': {
        'c': {'floor': 'concrete'}, 'a': {'floor': 'asphalt'}, 'm': {'floor': 'metal'}, 't': {'floor': 'tile'}, 'o': {'floor': 'wood'}, 'g': {'floor': 'grate'}, 'k': {'floor': 'rubble'},
        'W': {'floor': 'water', 'blocks': True},
        'R': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 4},
        'B': {'wall': 'brick', 'floor': 'tile', 'wallHeight': 3.2},
        'M': {'wall': 'metal', 'floor': 'metal', 'wallHeight': 2.8},
        'S': {'wall': 'scrap', 'floor': 'wood', 'wallHeight': 2.4, 'roof': 'tin'},
        'F': {'wall': 'fence', 'floor': 'concrete', 'wallHeight': 0.9},
    },
    'props': props,
    'lights': [
        # the north street: salvaged tubes, every colour that still lights
        {'x': 14, 'y': 17, 'height': 3.4, 'color': 'hex:0xff60c0', 'intensity': 3.8, 'range': 14, 'flicker': 0.15}, {'x': 30, 'y': 17, 'height': 3.4, 'color': 'hex:0x40e0ff', 'intensity': 3.8, 'range': 14, 'flicker': 0.15},
        {'x': 46, 'y': 17, 'height': 3.4, 'color': 'hex:0xffb060', 'intensity': 3.8, 'range': 14, 'flicker': 0.15}, {'x': 62, 'y': 17, 'height': 3.4, 'color': 'hex:0xb060ff', 'intensity': 3.8, 'range': 14, 'flicker': 0.15},
        {'x': 22, 'y': 15, 'height': 3.0, 'color': 'hex:0xffd040', 'intensity': 4.2, 'range': 12, 'flicker': 0.2}, {'x': 38, 'y': 13, 'height': 3.0, 'color': 'hex:0x60ff90', 'intensity': 3.8, 'range': 12, 'flicker': 0.2},
        {'x': 55, 'y': 15, 'height': 3.0, 'color': 'hex:0xff60c0', 'intensity': 4.5, 'range': 13, 'flicker': 0.2}, {'x': 64, 'y': 10, 'height': 2.8, 'color': 'hex:0xb060ff', 'intensity': 3.8, 'range': 12, 'flicker': 0.25},
        {'x': 36, 'y': 20, 'height': 0.8, 'color': 'hex:0xff9a40', 'intensity': 1.6, 'range': 5, 'flicker': 0.35}, {'x': 12, 'y': 9, 'height': 3.2, 'color': 'hex:0xe8f0ff', 'intensity': 3.5, 'range': 12},
        # inside: the bar gold, the hall green, the Velvet pink, the den violet
        {'x': 22, 'y': 8, 'height': 2.6, 'color': 'hex:0xffd060', 'intensity': 3.5, 'range': 12}, {'x': 38, 'y': 8, 'height': 2.6, 'color': 'hex:0x80ffb0', 'intensity': 3.2, 'range': 12},
        {'x': 55, 'y': 8, 'height': 2.6, 'color': 'hex:0xff80c0', 'intensity': 3.5, 'range': 13}, {'x': 67, 'y': 10, 'height': 2.4, 'color': 'hex:0xc080ff', 'intensity': 3.2, 'range': 10, 'flicker': 0.2},
        # the canal: cyan on the bridges, amber on the quays, the water throwing it back
        {'x': 20, 'y': 30, 'height': 3.2, 'color': 'hex:0x40e0ff', 'intensity': 3.5, 'range': 13, 'flicker': 0.15}, {'x': 51, 'y': 23, 'height': 3.2, 'color': 'hex:0x40e0ff', 'intensity': 3.5, 'range': 13, 'flicker': 0.15},
        {'x': 9, 'y': 23, 'height': 3.2, 'color': 'hex:0xffb060', 'intensity': 3.5, 'range': 12}, {'x': 9, 'y': 30, 'height': 3.2, 'color': 'hex:0xffb060', 'intensity': 3.5, 'range': 12},
        # the south street and the pit: white over the ring, amber on the street
        {'x': 22, 'y': 36, 'height': 3.4, 'color': 'hex:0xffb060', 'intensity': 3.5, 'range': 13}, {'x': 40, 'y': 36, 'height': 3.4, 'color': 'hex:0xff60c0', 'intensity': 3.5, 'range': 13, 'flicker': 0.15}, {'x': 58, 'y': 36, 'height': 3.4, 'color': 'hex:0x40e0ff', 'intensity': 3.5, 'range': 13, 'flicker': 0.15},
        {'x': 26, 'y': 38, 'height': 3.6, 'color': 'hex:0xf0f4ff', 'intensity': 4.5, 'range': 15}, {'x': 44, 'y': 38, 'height': 3.6, 'color': 'hex:0xf0f4ff', 'intensity': 4.5, 'range': 15}, {'x': 26, 'y': 54, 'height': 3.6, 'color': 'hex:0xf0f4ff', 'intensity': 4.5, 'range': 15}, {'x': 44, 'y': 54, 'height': 3.6, 'color': 'hex:0xf0f4ff', 'intensity': 4.5, 'range': 15},
        {'x': 46, 'y': 35, 'height': 0.8, 'color': 'hex:0xff9a40', 'intensity': 1.6, 'range': 5, 'flicker': 0.35}, {'x': 66, 'y': 44, 'height': 0.8, 'color': 'hex:0xff9a40', 'intensity': 1.6, 'range': 5, 'flicker': 0.35},
        {'x': 21, 'y': 45, 'height': 2.2, 'color': 'hex:0xffd8a0', 'intensity': 2.6, 'range': 9}, {'x': 51, 'y': 44, 'height': 2.2, 'color': 'hex:0xffd8a0', 'intensity': 2.2, 'range': 9}, {'x': 59, 'y': 44, 'height': 2.2, 'color': 'hex:0xffd8a0', 'intensity': 2.2, 'range': 9},
    ],
    'spawns': [
        {'id': 'start', 'x': 2, 'y': 33, 'facing': 1}, {'id': 'from_market', 'x': 2, 'y': 33, 'facing': 1}, {'id': 'loop', 'x': 7, 'y': 9, 'facing': 2},
        {'id': 'pit', 'x': 35, 'y': 37, 'facing': 0}, {'id': 'quay_n', 'x': 11, 'y': 22, 'facing': 0}, {'id': 'quay_s', 'x': 11, 'y': 31, 'facing': 2}, {'id': 'den', 'x': 63, 'y': 10, 'facing': 1},
    ],
    'exits': [
        {'x': 0, 'y': 32, 'w': 1, 'h': 4, 'to': {'location': 'md_market', 'spawn': 'from_lantern'}, 'label': 'The street west, to Old Market'},
    ],
    'talk': {
        'lr_loop_sign': {'dialogue': 'd_lr_loop', 'name': 'The Loop — Lantern Row'},
        'lr_bar_sign': {'dialogue': 'd_lr_bar_sign', 'name': 'The Coinage'},
        'lr_dust_sign': {'dialogue': 'd_lr_dust_sign', 'name': 'The hall'},
        'lr_velvet_sign': {'dialogue': 'd_lr_velvet_sign', 'name': 'The Velvet'},
        'lr_den_sign': {'dialogue': 'd_lr_den_sign', 'name': 'The Lantern'},
        'lr_east_sign': {'dialogue': 'd_lr_east_sign', 'name': 'The road east'},
        'lr_west_sign': {'dialogue': 'd_lr_west_sign', 'name': 'Lantern Row'},
        'lr_canal_sign': {'dialogue': 'd_lr_canal_sign', 'name': 'The canal'},
        'lr_pit_card': {'dialogue': 'd_lr_card', 'name': 'Tonight\'s card'},
        'lr_boat': {'dialogue': 'd_lr_boat', 'name': 'The boat'},
    },
    'containers': {
        'lr_bar_stash': {'name': 'Bar Stash', 'items': [['c_bitters', 4], ['a_9mm', 12], ['j_electronics', 2]], 'tolls': 45, 'lock': 40},
        'lr_dust_cage': {'name': 'The House Cage', 'items': [['c_bitters', 2]], 'tolls': 120, 'lock': 55},
        'lr_den_locker': {'name': 'The Lantern\'s Locker', 'items': [['k_lr_reel', 1], ['j_electronics', 3]], 'tolls': 20, 'lock': 50},
        'lr_pit_chest': {'name': 'The Pit Chest', 'items': [['c_bandage', 3], ['c_knitkit', 1]], 'tolls': 60, 'lock': 35},
    },
    'spots': {
        'tram': {'x': 7, 'y': 5}, 'loop_wait': {'x': 3, 'y': 6},
        'bar_counter': {'x': 24, 'y': 6}, 'bar_stool': {'x': 22, 'y': 8}, 'bar_stool_b': {'x': 25, 'y': 8}, 'bar_lean': {'x': 19, 'y': 10}, 'bar_cot': {'x': 26, 'y': 12}, 'gilt_a': {'x': 20, 'y': 6}, 'gilt_b': {'x': 18, 'y': 12}, 'gilt_door': {'x': 22, 'y': 16},
        'dust_table': {'x': 38, 'y': 8}, 'dust_sit': {'x': 35, 'y': 10}, 'dust_cage': {'x': 42, 'y': 6}, 'dust_cot': {'x': 34, 'y': 6},
        'velvet': {'x': 55, 'y': 7}, 'velvet_sit_a': {'x': 52, 'y': 9}, 'velvet_sit_b': {'x': 58, 'y': 9}, 'velvet_cot': {'x': 60, 'y': 5}, 'velvet_door': {'x': 55, 'y': 16},
        'den_desk': {'x': 66, 'y': 10}, 'den_cot': {'x': 69, 'y': 12}, 'den_cot_a_sit': {'x': 69, 'y': 8},
        'quay_n': {'x': 11, 'y': 23}, 'quay_s': {'x': 11, 'y': 30}, 'quay_lean': {'x': 12, 'y': 23}, 'quay_pair_a': {'x': 8, 'y': 32}, 'quay_pair_b': {'x': 9, 'y': 32},
        'tow_w': {'x': 4, 'y': 23}, 'tow_e': {'x': 66, 'y': 23}, 'canal_lean': {'x': 40, 'y': 31}, 'bridge_w': {'x': 20, 'y': 27}, 'bridge_e': {'x': 51, 'y': 27},
        'row_pair_a': {'x': 30, 'y': 19}, 'row_pair_b': {'x': 31, 'y': 19}, 'row_lean': {'x': 46, 'y': 18}, 'row_sit': {'x': 50, 'y': 20}, 'row_fire': {'x': 35, 'y': 20}, 'row_e': {'x': 60, 'y': 19},
        'street_lean': {'x': 45, 'y': 34}, 'street_fire': {'x': 47, 'y': 35}, 'kit_cot': {'x': 59, 'y': 46}, 'chem_sit': {'x': 65, 'y': 48}, 'chem_lean': {'x': 68, 'y': 42},
        'pit_master': {'x': 26, 'y': 46}, 'ring': {'x': 35, 'y': 46}, 'ring_a': {'x': 31, 'y': 43}, 'ring_b': {'x': 39, 'y': 49}, 'shack_cot': {'x': 20, 'y': 47}, 'shack_table': {'x': 20, 'y': 45},
        'hand_a': {'x': 30, 'y': 54}, 'hand_b': {'x': 41, 'y': 38}, 'pit_crowd_a': {'x': 26, 'y': 50}, 'pit_crowd_b': {'x': 44, 'y': 44}, 'pit_crowd_c': {'x': 33, 'y': 54}, 'pit_crowd_d': {'x': 38, 'y': 38}, 'house_cot_a': {'x': 50, 'y': 43}, 'house_cot_b': {'x': 58, 'y': 43},
    },
    'npcs': [
        {'def': 'npc_lr_01', 'x': 26, 'y': 46, 'facing': 1},
        {'def': 'npc_lr_02', 'x': 35, 'y': 46, 'facing': 0},
        {'def': 'npc_lr_03', 'x': 31, 'y': 43, 'facing': 2},
        {'def': 'npc_lr_04', 'x': 39, 'y': 49, 'facing': 0},
        {'def': 'npc_lr_05', 'x': 66, 'y': 10, 'facing': 3},
        {'def': 'npc_lr_06', 'x': 22, 'y': 8, 'facing': 0},
        {'def': 'npc_lr_07', 'x': 38, 'y': 8, 'facing': 0},
        {'def': 'npc_lr_08', 'x': 55, 'y': 7, 'facing': 2},
        {'def': 'npc_lr_09', 'x': 19, 'y': 10, 'facing': 1},
        {'def': 'npc_lr_10', 'x': 11, 'y': 23, 'facing': 2},
        {'def': 'npc_lr_11', 'x': 4, 'y': 23, 'facing': 1},
        {'def': 'npc_lr_12', 'x': 45, 'y': 34, 'facing': 3},
        {'def': 'npc_lr_g1', 'x': 20, 'y': 6, 'facing': 2}, {'def': 'npc_lr_g2', 'x': 18, 'y': 12, 'facing': 1},
        {'def': 'npc_lr_h1', 'x': 30, 'y': 54, 'facing': 0}, {'def': 'npc_lr_h2', 'x': 41, 'y': 38, 'facing': 2},
    ],
    'triggers': [
        {'id': 'arrive', 'x': 1, 'y': 30, 'w': 10, 'h': 8, 'text': 'Lantern Row. The street comes out of Old Market\'s dead bulbs into live ones: salvaged tubes in every colour that still lights, strung over a canal that throws them back. Music from three doors at once, none of it the same song. A bridge, a boat, a queue outside something pink. Somebody is shouting odds.', 'effects': [{'learn': 'seen_lantern'}, {'set': 'md_lantern_open'}]},
        {'id': 'arrive_loop', 'x': 2, 'y': 2, 'w': 11, 'h': 7, 'text': 'The Loop\'s Lantern Row stop: a metal deck with a tram on it and the Row going away south under its tubes, pink and cyan and gold, over the black line of the canal. Somebody is shouting odds.', 'effects': [{'learn': 'seen_lantern'}, {'set': 'md_lantern_open'}]},
        {'id': 'pit', 'x': 26, 'y': 36, 'w': 19, 'h': 3, 'text': 'The pit: a sunk metal floor inside a chain fence, four white lamps, bleachers of crates, and a card on a post with tonight\'s names. The crowd stands three deep. The floor has been washed and it shows.', 'effects': [{'learn': 'seen_pit'}]},
        {'id': 'den', 'x': 63, 'y': 8, 'w': 1, 'h': 5, 'text': 'The Lantern: a container with a violet tube over the door and a smell of warm electronics. Reveries by the hour. The sign says MEMORIES — YOURS OR BETTER.', 'effects': [{'learn': 'seen_den'}]},
        {'id': 'east_end', 'x': 66, 'y': 15, 'w': 4, 'h': 7, 'once': False, 'if': {'not': {'flag': 'md_bridgeward_open'}}, 'text': 'The street runs on east under dead tubes toward Bridgeward, and a chain across it with a sign: WORKS. Two Gilt lean on the chain and do not say works.'},
    ],
    'extras': [
        {'count': 8, 'roles': ['street', 'gilded', 'drifter', 'trader', 'settler', 'tech'], 'area': {'x': 1, 'y': 15, 'w': 70, 'h': 9}, 'spots': ['row_pair_a', 'row_pair_b', 'row_lean', 'row_sit', 'row_fire', 'row_e', 'gilt_door', 'velvet_door', 'canal_lean'], 'hours': {'from': 14, 'to': 5}, 'barks': ['Anvil\'s three to one. He\'s always three to one.', 'The Velvet\'s a queue tonight. Try the hall.', 'Don\'t buy a reverie you can\'t put down.', 'Gilt pay in Crown coin. Don\'t take it; it\'s counted.', 'Somebody\'s stranger on the card again.']},
        {'count': 5, 'roles': ['street', 'labourer', 'drifter', 'settler'], 'life': 'hard', 'area': {'x': 24, 'y': 36, 'w': 22, 'h': 20}, 'spots': ['pit_crowd_a', 'pit_crowd_b', 'pit_crowd_c', 'pit_crowd_d', 'street_lean', 'street_fire'], 'hours': {'from': 15, 'to': 4}, 'barks': ['Twenty on the small one.', 'He went down in the second last week. Took the dive, you watch.', 'Mab pays. Mab always pays. That\'s why Mab\'s rich.']},
        {'count': 3, 'roles': ['street', 'drifter'], 'life': 'hard', 'area': {'x': 1, 'y': 30, 'w': 14, 'h': 24}, 'spots': ['quay_pair_a', 'quay_pair_b', 'quay_lean', 'chem_sit', 'chem_lean'], 'barks': ['Boat\'s two. Bridge is free and further.', 'Canal\'s warm. Don\'t ask.']},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0x6a5a78', 'fogDensity': 0.012, 'dust': 0.15, 'grade': 0.3, 'mood': 'bustling', 'sound': 'murmur'},
}

HEADER = "import type { MapDef } from '../../engine/data/types';\n\n// Generated by tools/maps/gen_md_lantern.py — edit the generator, then re-run it.\n"
with open(os.path.join(ROOT, 'src', 'content', 'maps', 'md_lantern.ts'), 'w') as f:
    f.write(f"{HEADER}export const md_lantern: MapDef = {ts(md_lantern)};\n")
print('md_lantern', W, 'x', H)
for y in range(H):
    print(rows[y])
