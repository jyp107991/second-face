#!/usr/bin/env python3
"""Generates src/content/maps/md_bridgeward.ts — Bridgeward: gang turf round the broken bridge (WORLD §3.1: crews,
chop-shops, toll extortion).

A main street from Lantern Row's chain in the west to the bridgehead in the east, where the Rustmouths keep a toll
chain and a booth for the Tenured. The bridge deck runs east between low parapets and ends in a ragged drop. North of
the street: the chop-shop and the Saints' tower with its shrine of dead radios; the Loop stop in the north-east. South:
the Rust Dogs' old haunt (a boarded garage), the Pale's stair house over a hatch to the Sink, the Rustmouths' yard and
hall.
    python3 tools/maps/gen_md_bridgeward.py
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


# rim; the chain to Lantern Row cut through the west
fill(0, 0, W - 1, 0, 'R'); fill(0, H - 1, W - 1, H - 1, 'R'); fill(0, 0, 0, H - 1, 'R'); fill(W - 1, 0, W - 1, H - 1, 'R')
fill(0, 26, 0, 31, 'a')
# the street, the pavements, the bridgehead
fill(1, 24, 50, 33, 'a')
fill(1, 22, 50, 23, 'c'); fill(1, 34, 50, 35, 'c')
# the bridge: a deck between parapets, east to the drop; the far end is air
fill(50, 22, 70, 33, 'a')
fill(50, 21, 70, 21, 'P'); fill(50, 34, 70, 34, 'P')
fill(64, 21, 70, 34, '.')
fill(62, 24, 63, 25, '.'); fill(63, 30, 63, 31, '.')
# the toll: the chain across the deck and the booth on the north pavement
fill(49, 22, 49, 33, 'F'); g[27][49] = 'a'; g[28][49] = 'a'
building(45, 17, 51, 21, 'M', 'm', [(48, 21)])
# north: the chop-shop, the Saints' tower yard, the Loop deck
building(6, 3, 30, 19, 'S', 'c', [(18, 19), (19, 19), (30, 11)])
fill(34, 3, 46, 19, 'c')
building(36, 5, 44, 12, 'B', 't', [(40, 12)])
fill(56, 3, 68, 10, 'm')
building(58, 4, 64, 8, 'M', 'm', [(61, 8), (61, 4)])
# south: the Dogs' old haunt, the Pale's stair house, the Rustmouths' yard and hall
building(5, 37, 21, 49, 'S', 'c', [(13, 37)])
building(30, 38, 36, 44, 'C', 'm', [(33, 38)])
fill(40, 36, 62, 52, 'k')
building(44, 40, 58, 50, 'M', 'm', [(51, 40)])
rows = [''.join(r) for r in g]

props = [
    # the west chain and the street
    {'kind': 'sign', 'x': 2, 'y': 25, 'rot': 1, 'id': 'bw_west_sign'}, {'kind': 'lamp_post', 'x': 10, 'y': 22}, {'kind': 'lamp_post', 'x': 26, 'y': 35}, {'kind': 'lamp_post', 'x': 40, 'y': 22},
    {'kind': 'car_wreck', 'x': 4, 'y': 30, 'rot': 1}, {'kind': 'fire_barrel', 'x': 22, 'y': 29}, {'kind': 'crate', 'x': 36, 'y': 34}, {'kind': 'crate', 'x': 37, 'y': 34}, {'kind': 'tire_pile', 'x': 32, 'y': 23}, {'kind': 'debris', 'x': 14, 'y': 26},
    # the toll: the chain's sign, the booth, the box, the Tenured's notice
    {'kind': 'sign', 'x': 48, 'y': 23, 'rot': 3, 'id': 'bw_toll_sign'}, {'kind': 'sign', 'x': 50, 'y': 35, 'rot': 0, 'id': 'bw_chain'}, {'kind': 'counter', 'x': 48, 'y': 19, 'rot': 2}, {'kind': 'locker', 'x': 46, 'y': 18, 'id': 'bw_toll_box'}, {'kind': 'chair', 'x': 50, 'y': 18, 'rot': 1},
    {'kind': 'sandbags', 'x': 47, 'y': 24}, {'kind': 'sandbags', 'x': 47, 'y': 31}, {'kind': 'lamp_post', 'x': 52, 'y': 22}, {'kind': 'lamp_post', 'x': 52, 'y': 33},
    # the bridge deck: wrecks, a view, the drop
    {'kind': 'car_wreck', 'x': 56, 'y': 29, 'rot': 0}, {'kind': 'debris', 'x': 60, 'y': 26}, {'kind': 'sign', 'x': 61, 'y': 28, 'rot': 3, 'id': 'bw_drop'}, {'kind': 'barrel_rust', 'x': 58, 'y': 32},
    # the chop-shop: wrecks on blocks, a counter, tools, the locker
    {'kind': 'sign', 'x': 20, 'y': 20, 'rot': 2, 'id': 'bw_chop_sign'}, {'kind': 'car_wreck', 'x': 10, 'y': 7, 'rot': 1}, {'kind': 'car_wreck', 'x': 16, 'y': 7, 'rot': 1}, {'kind': 'car_wreck', 'x': 22, 'y': 7, 'rot': 3}, {'kind': 'car_wreck', 'x': 12, 'y': 14, 'rot': 0},
    {'kind': 'counter', 'x': 26, 'y': 15, 'rot': 1}, {'kind': 'counter', 'x': 26, 'y': 16, 'rot': 1}, {'kind': 'shelf', 'x': 28, 'y': 5, 'rot': 3}, {'kind': 'machine', 'x': 24, 'y': 12, 'rot': 2}, {'kind': 'locker', 'x': 8, 'y': 17, 'id': 'bw_chop_locker'}, {'kind': 'barrel', 'x': 20, 'y': 17}, {'kind': 'tire_pile', 'x': 8, 'y': 11}, {'kind': 'pipe_h', 'x': 19, 'y': 11},
    # the Saints' tower: the mast, the shrine of radios, candles
    {'kind': 'windpump', 'x': 40, 'y': 16, 'id': 'bw_mast'}, {'kind': 'sign', 'x': 35, 'y': 14, 'rot': 1, 'id': 'bw_tower_sign'}, {'kind': 'terminal', 'x': 38, 'y': 7, 'rot': 0, 'id': 'bw_shrine'}, {'kind': 'terminal', 'x': 42, 'y': 7, 'rot': 0}, {'kind': 'terminal', 'x': 40, 'y': 6, 'rot': 0},
    {'kind': 'blanket', 'x': 38, 'y': 10}, {'kind': 'blanket', 'x': 42, 'y': 10}, {'kind': 'chair', 'x': 40, 'y': 10, 'rot': 2}, {'kind': 'crate', 'x': 37, 'y': 11}, {'kind': 'fire_barrel', 'x': 44, 'y': 15}, {'kind': 'planter', 'x': 35, 'y': 4},
    # the Loop deck
    {'kind': 'machine', 'x': 60, 'y': 6, 'rot': 1, 'id': 'bw_tram'}, {'kind': 'sign', 'x': 65, 'y': 5, 'rot': 3, 'id': 'bw_loop_sign'}, {'kind': 'lamp_post', 'x': 57, 'y': 10},
    # the Dogs' old haunt: the chained door, the marks inside, the cache
    {'kind': 'sign', 'x': 13, 'y': 36, 'rot': 0, 'id': 'bw_haunt_door'}, {'kind': 'car_wreck', 'x': 9, 'y': 41, 'rot': 1}, {'kind': 'car_wreck', 'x': 16, 'y': 45, 'rot': 3}, {'kind': 'table', 'x': 12, 'y': 42}, {'kind': 'chair', 'x': 12, 'y': 43, 'rot': 0}, {'kind': 'cot', 'x': 18, 'y': 40, 'rot': 1},
    {'kind': 'locker', 'x': 7, 'y': 47, 'id': 'bw_haunt_cache'}, {'kind': 'barrel_rust', 'x': 19, 'y': 47}, {'kind': 'blanket', 'x': 8, 'y': 39}, {'kind': 'sign', 'x': 15, 'y': 40, 'rot': 2, 'id': 'bw_haunt_wall'},
    # the Pale's stair house: the hatch
    {'kind': 'vault_door', 'x': 33, 'y': 42, 'rot': 0, 'id': 'bw_hatch'}, {'kind': 'chair', 'x': 31, 'y': 40, 'rot': 1}, {'kind': 'sign', 'x': 29, 'y': 37, 'rot': 1, 'id': 'bw_pale_sign'},
    # the Rustmouths' yard and hall: salvage heaps, the Boss's table, the Hand's bench
    {'kind': 'tire_pile', 'x': 42, 'y': 38}, {'kind': 'car_wreck', 'x': 60, 'y': 38, 'rot': 2}, {'kind': 'crate', 'x': 41, 'y': 45}, {'kind': 'crate', 'x': 41, 'y': 46}, {'kind': 'barrel_rust', 'x': 60, 'y': 46}, {'kind': 'fire_barrel', 'x': 42, 'y': 50}, {'kind': 'debris', 'x': 58, 'y': 51},
    {'kind': 'table', 'x': 51, 'y': 45, 'id': 'bw_boss_table'}, {'kind': 'chair', 'x': 51, 'y': 46, 'rot': 0}, {'kind': 'chair', 'x': 51, 'y': 44, 'rot': 2}, {'kind': 'shelf', 'x': 57, 'y': 42, 'rot': 3}, {'kind': 'locker', 'x': 45, 'y': 42, 'id': 'bw_hall_locker'}, {'kind': 'cot', 'x': 56, 'y': 48, 'rot': 1}, {'kind': 'counter', 'x': 46, 'y': 48, 'rot': 1},
]

md_bridgeward = {
    'id': 'md_bridgeward', 'name': 'Meridian — Bridgeward', 'seed': 73, 'settlement': 'meridian',
    'layout': rows,
    'legend': {
        'a': {'floor': 'asphalt'}, 'c': {'floor': 'concrete'}, 'm': {'floor': 'metal'}, 't': {'floor': 'tile'}, 'k': {'floor': 'rubble'},
        '.': {'empty': True},
        'R': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 4},
        'P': {'wall': 'concrete', 'floor': 'asphalt', 'wallHeight': 1.0},
        'F': {'wall': 'fence', 'floor': 'asphalt', 'wallHeight': 1.2},
        'S': {'wall': 'scrap', 'floor': 'concrete', 'wallHeight': 3.4, 'roof': 'tin'},
        'B': {'wall': 'brick', 'floor': 'tile', 'wallHeight': 3},
        'M': {'wall': 'metal', 'floor': 'metal', 'wallHeight': 2.8},
        'C': {'wall': 'concrete', 'floor': 'metal', 'wallHeight': 3, 'roof': 'flat'},
    },
    'props': props,
    'lights': [
        {'x': 10, 'y': 22, 'height': 3.4, 'color': 'hex:0xffb060', 'intensity': 2.6, 'range': 11, 'flicker': 0.2}, {'x': 26, 'y': 35, 'height': 3.4, 'color': 'hex:0xffb060', 'intensity': 2.6, 'range': 11, 'flicker': 0.2}, {'x': 40, 'y': 22, 'height': 3.4, 'color': 'hex:0xffb060', 'intensity': 2.6, 'range': 11, 'flicker': 0.2},
        {'x': 22, 'y': 29, 'height': 0.8, 'color': 'hex:0xff9a40', 'intensity': 1.6, 'range': 5, 'flicker': 0.35},
        {'x': 52, 'y': 22, 'height': 3.6, 'color': 'hex:0xf0f4ff', 'intensity': 2.8, 'range': 12}, {'x': 52, 'y': 33, 'height': 3.6, 'color': 'hex:0xf0f4ff', 'intensity': 2.8, 'range': 12}, {'x': 48, 'y': 19, 'height': 2.4, 'color': 'hex:0xffd8a0', 'intensity': 1.8, 'range': 6},
        {'x': 18, 'y': 12, 'height': 3.0, 'color': 'hex:0xffd8a0', 'intensity': 2.4, 'range': 11, 'flicker': 0.15}, {'x': 12, 'y': 8, 'height': 2.6, 'color': 'hex:0x80b0e0', 'intensity': 1.6, 'range': 7, 'flicker': 0.4},
        {'x': 40, 'y': 16, 'height': 6.0, 'color': 'hex:0xff4040', 'intensity': 2.2, 'range': 12, 'flicker': 0.6}, {'x': 40, 'y': 8, 'height': 2.4, 'color': 'hex:0x60ff90', 'intensity': 1.8, 'range': 7, 'flicker': 0.3}, {'x': 44, 'y': 15, 'height': 0.8, 'color': 'hex:0xff9a40', 'intensity': 1.6, 'range': 5, 'flicker': 0.35},
        {'x': 57, 'y': 10, 'height': 3.2, 'color': 'hex:0xe8f0ff', 'intensity': 2.2, 'range': 9},
        {'x': 13, 'y': 43, 'height': 2.8, 'color': 'hex:0xffb070', 'intensity': 1.6, 'range': 8, 'flicker': 0.3}, {'x': 33, 'y': 41, 'height': 2.4, 'color': 'hex:0xa0c8ff', 'intensity': 1.6, 'range': 6, 'flicker': 0.2},
        {'x': 51, 'y': 45, 'height': 2.6, 'color': 'hex:0xffd8a0', 'intensity': 2.2, 'range': 9}, {'x': 42, 'y': 50, 'height': 0.8, 'color': 'hex:0xff9a40', 'intensity': 1.6, 'range': 5, 'flicker': 0.35}, {'x': 50, 'y': 38, 'height': 3.2, 'color': 'hex:0xffb060', 'intensity': 2.0, 'range': 9, 'flicker': 0.2},
    ],
    'spawns': [
        {'id': 'start', 'x': 2, 'y': 28, 'facing': 1}, {'id': 'from_lantern', 'x': 2, 'y': 28, 'facing': 1}, {'id': 'loop', 'x': 61, 'y': 9, 'facing': 2}, {'id': 'bridge', 'x': 53, 'y': 27, 'facing': 1}, {'id': 'tower', 'x': 40, 'y': 13, 'facing': 0},
    ],
    'exits': [
        {'x': 0, 'y': 26, 'w': 1, 'h': 6, 'to': {'location': 'md_lantern', 'spawn': 'from_bridgeward'}, 'label': 'The chain west, to Lantern Row'},
    ],
    'talk': {
        'bw_west_sign': {'dialogue': 'd_bw_west_sign', 'name': 'The chain'},
        'bw_toll_sign': {'dialogue': 'd_bw_toll_sign', 'name': 'The toll notice'},
        'bw_chain': {'dialogue': 'd_bw_chain', 'name': 'The toll chain'},
        'bw_drop': {'dialogue': 'd_bw_drop', 'name': 'The drop'},
        'bw_chop_sign': {'dialogue': 'd_bw_chop_sign', 'name': 'The chop-shop'},
        'bw_tower_sign': {'dialogue': 'd_bw_tower_sign', 'name': 'The tower'},
        'bw_shrine': {'dialogue': 'd_bw_shrine', 'name': 'The shrine of radios'},
        'bw_loop_sign': {'dialogue': 'd_bw_loop', 'name': 'The Loop — Bridgeward'},
        'bw_haunt_door': {'dialogue': 'd_bw_haunt_door', 'name': 'A chained door'},
        'bw_haunt_wall': {'dialogue': 'd_bw_haunt_wall', 'name': 'The wall'},
        'bw_hatch': {'dialogue': 'd_bw_hatch', 'name': 'The hatch'},
        'bw_pale_sign': {'dialogue': 'd_bw_pale_sign', 'name': 'The Pale\'s mark'},
    },
    'containers': {
        'bw_toll_box': {'name': 'The Toll Box', 'items': [['k_bw_toll_ledger', 1]], 'tolls': 140, 'lock': 50},
        'bw_chop_locker': {'name': 'Chop-Shop Locker', 'items': [['t_repair', 2], ['j_electronics', 3], ['j_wiring', 4], ['a_9mm', 12]], 'tolls': 30, 'lock': 40},
        'bw_haunt_cache': {'name': 'The Dogs\' Cache', 'items': [['k_bw_dog_mark', 1], ['a_38', 18], ['c_jerky', 3], ['w_revolver38', 1]], 'tolls': 80, 'lock': 45},
        'bw_hall_locker': {'name': 'Hall Locker', 'items': [['c_bitters', 3], ['a_12ga', 8]], 'tolls': 60, 'lock': 45},
    },
    'spots': {
        'chain_w': {'x': 3, 'y': 27}, 'chain_w2': {'x': 3, 'y': 30}, 'street_fire': {'x': 23, 'y': 29}, 'street_pair_a': {'x': 30, 'y': 26}, 'street_pair_b': {'x': 31, 'y': 26}, 'street_lean': {'x': 14, 'y': 23}, 'street_sit': {'x': 36, 'y': 33},
        'toll_booth': {'x': 48, 'y': 20}, 'toll_a': {'x': 48, 'y': 25}, 'toll_b': {'x': 48, 'y': 30}, 'bridge_view': {'x': 59, 'y': 28}, 'bridge_edge': {'x': 61, 'y': 27},
        'chop_counter': {'x': 25, 'y': 15}, 'chop_work': {'x': 13, 'y': 10}, 'chop_cot': {'x': 21, 'y': 17},
        'tower_yard': {'x': 40, 'y': 14}, 'shrine': {'x': 40, 'y': 8}, 'shrine_sit': {'x': 40, 'y': 9}, 'listener_a': {'x': 38, 'y': 9}, 'listener_b': {'x': 42, 'y': 9}, 'tower_fire': {'x': 43, 'y': 14},
        'tram': {'x': 61, 'y': 6}, 'deck_wait': {'x': 57, 'y': 7},
        'haunt_table': {'x': 12, 'y': 41}, 'haunt_cot': {'x': 17, 'y': 40}, 'haunt_door': {'x': 13, 'y': 35},
        'hatch': {'x': 33, 'y': 40}, 'hatch_chair': {'x': 31, 'y': 41}, 'pale_door': {'x': 33, 'y': 37},
        'boss': {'x': 52, 'y': 45}, 'hand': {'x': 50, 'y': 46}, 'hall_cot': {'x': 55, 'y': 48}, 'yard_a': {'x': 43, 'y': 40}, 'yard_b': {'x': 59, 'y': 44}, 'yard_fire': {'x': 43, 'y': 50},
    },
    'npcs': [
        {'def': 'npc_bw_01', 'x': 52, 'y': 45, 'facing': 3},
        {'def': 'npc_bw_02', 'x': 50, 'y': 46, 'facing': 1},
        {'def': 'npc_bw_03', 'x': 25, 'y': 15, 'facing': 1},
        {'def': 'npc_bw_04', 'x': 40, 'y': 14, 'facing': 0},
        {'def': 'npc_bw_05', 'x': 40, 'y': 9, 'facing': 0},
        {'def': 'npc_bw_06', 'x': 38, 'y': 9, 'facing': 0},
        {'def': 'npc_bw_07', 'x': 31, 'y': 41, 'facing': 1},
        {'def': 'npc_bw_08', 'x': 3, 'y': 27, 'facing': 1},
        {'def': 'npc_bw_09', 'x': 12, 'y': 41, 'facing': 0},
        {'def': 'npc_bw_10', 'x': 48, 'y': 20, 'facing': 2},
        {'def': 'npc_bw_11', 'x': 36, 'y': 33, 'facing': 0},
        {'def': 'npc_bw_r1', 'x': 48, 'y': 25, 'facing': 1}, {'def': 'npc_bw_r2', 'x': 48, 'y': 30, 'facing': 1}, {'def': 'npc_bw_r3', 'x': 43, 'y': 40, 'facing': 2},
        {'def': 'npc_bw_g1', 'x': 3, 'y': 30, 'facing': 1},
        {'def': 'npc_bw_s1', 'x': 42, 'y': 9, 'facing': 0},
        {'def': 'npc_bw_p1', 'x': 33, 'y': 37, 'facing': 0},
    ],
    'triggers': [
        {'id': 'arrive', 'x': 1, 'y': 24, 'w': 12, 'h': 10, 'text': 'Bridgeward. The chain behind you, and ahead a street of chop-shops and salvage heaps running to a bridge that goes out over nothing and stops. Three kinds of paint on the walls, each over the other. A red light blinks on a mast. Somebody at the bridgehead is charging money to stand on it.', 'effects': [{'learn': 'seen_bridgeward'}, {'set': 'md_bridgeward_open'}, {'quest': 'q_bw_turf', 'start': True}]},
        {'id': 'arrive_loop', 'x': 56, 'y': 3, 'w': 13, 'h': 8, 'text': 'The Loop\'s Bridgeward stop, a metal deck over a street of salvage with a broken bridge at the end of it and a red light blinking on a mast. Three kinds of paint on every wall.', 'effects': [{'learn': 'seen_bridgeward'}, {'set': 'md_bridgeward_open'}, {'quest': 'q_bw_turf', 'start': True}]},
        {'id': 'bridgehead', 'x': 44, 'y': 24, 'w': 5, 'h': 10, 'text': 'The bridgehead: a chain across the deck, a booth, two Rustmouths with shotguns and a slate of prices, and beyond them the bridge going out over the dry river to where it isn\'t any more. A notice on the booth in Crown print.', 'effects': [{'learn': 'seen_toll'}]},
        {'id': 'tower', 'x': 36, 'y': 13, 'w': 9, 'h': 6, 'text': 'The Saints\' tower: a dead relay mast with a red lamp on it that somebody keeps lit, and under it a brick shell full of radios that do not work, arranged like an altar, and people sitting with them, listening.', 'effects': [{'learn': 'seen_tower'}]},
        {'id': 'drop', 'x': 60, 'y': 24, 'w': 3, 'h': 8, 'once': False, 'text': 'The deck ends in torn rebar and air. Forty feet down, the dry river; across it, the far bank and the Docks\' cranes, close enough to hear and no way to reach.', 'effects': [{'learn': 'seen_drop'}, {'learn': 'docks_seen'}]},
    ],
    'extras': [
        {'count': 6, 'roles': ['street', 'labourer', 'drifter', 'tech', 'trader'], 'life': 'hard', 'area': {'x': 1, 'y': 22, 'w': 48, 'h': 14}, 'spots': ['street_fire', 'street_pair_a', 'street_pair_b', 'street_lean', 'street_sit', 'chop_work'], 'barks': ['Toll\'s five to stand on a bridge that goes nowhere.', 'Three paints on the wall. Mine\'s under all of them.', 'The girl at the tower said my name yesterday. I\'ve never met her.', 'Rustmouths take for the Crown. Gilt take for the Gilt. Pale take what you\'ve got two of.', 'The Dogs had the garage. Then the Rustmouths had the bridge. Then the Dogs had the Sallow.']},
        {'count': 3, 'roles': ['labourer', 'street'], 'life': 'hard', 'area': {'x': 40, 'y': 36, 'w': 22, 'h': 16}, 'spots': ['yard_a', 'yard_b', 'yard_fire'], 'barks': ['Haul\'s weighed Fridays.', 'Boss says the Crown pays by the car. The Crown doesn\'t know what a car is.']},
        {'count': 2, 'roles': ['drifter', 'settler'], 'life': 'hard', 'area': {'x': 34, 'y': 3, 'w': 12, 'h': 16}, 'spots': ['listener_a', 'listener_b', 'tower_fire'], 'barks': ['Listen. There — under the hiss.', 'She says true things. That\'s the trouble with her.']},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0x8a7a68', 'fogDensity': 0.013, 'dust': 0.3, 'grade': 0.4, 'mood': 'haze', 'sound': 'wind'},
}

HEADER = "import type { MapDef } from '../../engine/data/types';\n\n// Generated by tools/maps/gen_md_bridgeward.py — edit the generator, then re-run it.\n"
with open(os.path.join(ROOT, 'src', 'content', 'maps', 'md_bridgeward.ts'), 'w') as f:
    f.write(f"{HEADER}export const md_bridgeward: MapDef = {ts(md_bridgeward)};\n")
print('md_bridgeward', W, 'x', H)
