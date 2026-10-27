#!/usr/bin/env python3
"""Generates src/content/maps/md_market.ts — Old Market: the bazaar in a dead mall and the streets around it
(WORLD §3.1: food, chrome, guns, gossip, fixers; where everyone meets).

The mall is a roofless concrete shell in the middle with stalls in its aisles; the Broker's booth sits at its
centre under the dead escalator. Streets round it: the Loop platform and the food hall to the west (the Precinct
side), the chrome and gun stalls north, the fixer's stair and the standpipe square south, the east street toward
Lantern Row (later).
    python3 tools/maps/gen_md_market.py
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


# rim: ruined blocks (rock-high concrete) all round, streets cut through west and east
fill(0, 0, W - 1, 0, 'R'); fill(0, H - 1, W - 1, H - 1, 'R'); fill(0, 0, 0, H - 1, 'R'); fill(W - 1, 0, W - 1, H - 1, 'R')
fill(0, 26, 0, 31, 'a'); fill(W - 1, 26, W - 1, 31, 'a')
# the streets: asphalt ring round the mall, the west street with the tram rail, the east street
fill(1, 24, 70, 33, 'a')
fill(3, 1, 10, 54, 'a'); fill(60, 1, 70, 54, 'a')
fill(1, 10, 70, 13, 'a'); fill(1, 44, 70, 47, 'a')
fill(2, 23, 10, 23, 'm')   # the tram rail along the west street's north kerb
# THE MALL: a concrete shell with no roof, its aisles tiled
building(16, 14, 56, 43, 'S', 't', [(16, 28), (16, 29), (56, 28), (56, 29), (36, 14), (37, 14), (36, 43), (37, 43)])
# inside: a cross of aisles, the central court with the dead escalator, stall pens in the quarters
fill(17, 27, 55, 30, 't')
fill(35, 15, 38, 42, 't')
fill(30, 24, 42, 33, 'm')                          # the central court, metal deck
fill(18, 15, 33, 25, 'k'); fill(40, 15, 55, 25, 'k'); fill(18, 32, 33, 42, 'k'); fill(40, 32, 55, 42, 'k')   # the quarters: cracked tile
# the Broker's booth: a container at the court's north end with its hatch facing south
building(34, 20, 39, 23, 'M', 'm', [(36, 23)])
# the food hall west of the mall, a brick shell with a counter line; the Loop platform north-west
building(3, 15, 13, 22, 'B', 't', [(13, 18), (13, 19)])
fill(2, 2, 12, 8, 'm')
building(4, 3, 10, 7, 'M', 'm', [(7, 7), (7, 3)])
# the fixer's stair: a brick stub south-west with a door onto the square
building(3, 35, 11, 42, 'B', 't', [(11, 38)])
# the standpipe square, south: concrete, the standpipe in the middle
fill(16, 48, 56, 53, 'c')
# the chrome stall and the gun stall: two container shops on the north street
building(18, 2, 26, 8, 'M', 'm', [(22, 8)])
building(44, 2, 52, 8, 'M', 'm', [(48, 8)])
# the kiosk: a little concrete hut on the east street
building(62, 36, 66, 40, 'C', 't', [(62, 38)])

rows = [''.join(r) for r in g]

props = [
    # the west street: the Loop platform's tram, the board, benches; the food hall's counters and pots
    {'kind': 'machine', 'x': 6, 'y': 23, 'rot': 1, 'id': 'mk_tram'}, {'kind': 'sign', 'x': 11, 'y': 4, 'rot': 3, 'id': 'mk_loop_sign'}, {'kind': 'chair', 'x': 5, 'y': 5, 'rot': 1}, {'kind': 'chair', 'x': 9, 'y': 5, 'rot': 3}, {'kind': 'lamp_post', 'x': 12, 'y': 9},
    {'kind': 'counter', 'x': 8, 'y': 17, 'rot': 3}, {'kind': 'counter', 'x': 8, 'y': 18, 'rot': 3}, {'kind': 'counter', 'x': 8, 'y': 19, 'rot': 3}, {'kind': 'stove', 'x': 5, 'y': 16}, {'kind': 'stove', 'x': 5, 'y': 20}, {'kind': 'barrel', 'x': 4, 'y': 21}, {'kind': 'table', 'x': 11, 'y': 16}, {'kind': 'chair', 'x': 11, 'y': 17, 'rot': 0}, {'kind': 'table', 'x': 11, 'y': 21}, {'kind': 'crate', 'x': 4, 'y': 18, 'id': 'mk_food_crate'},
    {'kind': 'sign', 'x': 14, 'y': 17, 'rot': 1, 'id': 'mk_food_sign'},
    # the mall's doors and the ring street: lamps, drums, a wrecked tram
    {'kind': 'lamp_post', 'x': 15, 'y': 26}, {'kind': 'lamp_post', 'x': 57, 'y': 31}, {'kind': 'lamp_post', 'x': 34, 'y': 12}, {'kind': 'lamp_post', 'x': 39, 'y': 45}, {'kind': 'lamp_post', 'x': 61, 'y': 25},
    {'kind': 'car_wreck', 'x': 64, 'y': 15, 'rot': 1}, {'kind': 'fire_barrel', 'x': 13, 'y': 31}, {'kind': 'fire_barrel', 'x': 58, 'y': 26}, {'kind': 'debris', 'x': 2, 'y': 50}, {'kind': 'debris', 'x': 68, 'y': 8}, {'kind': 'tire_pile', 'x': 66, 'y': 50},
    {'kind': 'sign', 'x': 15, 'y': 30, 'rot': 1, 'id': 'mk_mall_sign'}, {'kind': 'sign', 'x': 69, 'y': 26, 'rot': 3, 'id': 'mk_east_sign'},
    # the mall inside: the Broker's booth (hatch, the board), the dead escalator, stalls in the quarters
    {'kind': 'sign', 'x': 38, 'y': 24, 'rot': 3, 'id': 'mk_gigs_board'}, {'kind': 'counter', 'x': 35, 'y': 24, 'rot': 0, 'id': 'mk_hatch'}, {'kind': 'machine', 'x': 31, 'y': 25, 'rot': 0, 'id': 'mk_escalator'}, {'kind': 'debris', 'x': 41, 'y': 32}, {'kind': 'fire_barrel', 'x': 31, 'y': 32},
    # NW quarter: cloth and junk
    {'kind': 'counter', 'x': 20, 'y': 17, 'rot': 0}, {'kind': 'counter', 'x': 21, 'y': 17, 'rot': 0}, {'kind': 'blanket', 'x': 24, 'y': 17}, {'kind': 'crate', 'x': 27, 'y': 17}, {'kind': 'blanket', 'x': 20, 'y': 22}, {'kind': 'barrel', 'x': 25, 'y': 22}, {'kind': 'tent', 'x': 30, 'y': 18, 'rot': 0}, {'kind': 'shelf', 'x': 23, 'y': 16, 'rot': 0},
    # NE quarter: the gossip benches and a tea stall
    {'kind': 'table', 'x': 44, 'y': 18}, {'kind': 'chair', 'x': 43, 'y': 18, 'rot': 1}, {'kind': 'chair', 'x': 45, 'y': 18, 'rot': 3}, {'kind': 'table', 'x': 50, 'y': 18}, {'kind': 'chair', 'x': 49, 'y': 18, 'rot': 1}, {'kind': 'chair', 'x': 51, 'y': 18, 'rot': 3}, {'kind': 'counter', 'x': 47, 'y': 22, 'rot': 2}, {'kind': 'stove', 'x': 47, 'y': 23}, {'kind': 'barrel', 'x': 53, 'y': 22},
    # SW quarter: the paper stall and the fence's blankets
    {'kind': 'counter', 'x': 22, 'y': 35, 'rot': 0}, {'kind': 'shelf', 'x': 20, 'y': 35, 'rot': 0}, {'kind': 'blanket', 'x': 26, 'y': 38}, {'kind': 'blanket', 'x': 29, 'y': 38}, {'kind': 'crate', 'x': 22, 'y': 40, 'id': 'mk_fence_crate'}, {'kind': 'tent', 'x': 31, 'y': 40, 'rot': 2},
    # SE quarter: the drum circle and a scrap pile
    {'kind': 'barrel_rust', 'x': 43, 'y': 36}, {'kind': 'barrel_rust', 'x': 44, 'y': 37}, {'kind': 'tire_pile', 'x': 50, 'y': 40}, {'kind': 'debris', 'x': 53, 'y': 35}, {'kind': 'blanket', 'x': 48, 'y': 36}, {'kind': 'chair', 'x': 46, 'y': 40, 'rot': 1}, {'kind': 'chair', 'x': 48, 'y': 40, 'rot': 3},
    # the chrome stall and the gun stall (north street)
    {'kind': 'counter', 'x': 21, 'y': 6, 'rot': 0}, {'kind': 'counter', 'x': 23, 'y': 6, 'rot': 0}, {'kind': 'shelf', 'x': 19, 'y': 3, 'rot': 1}, {'kind': 'locker', 'x': 25, 'y': 3, 'id': 'mk_chrome_locker'}, {'kind': 'cot', 'x': 19, 'y': 7, 'rot': 1},
    {'kind': 'counter', 'x': 47, 'y': 6, 'rot': 0}, {'kind': 'counter', 'x': 49, 'y': 6, 'rot': 0}, {'kind': 'shelf', 'x': 45, 'y': 3, 'rot': 1}, {'kind': 'shelf', 'x': 51, 'y': 3, 'rot': 3}, {'kind': 'crate', 'x': 51, 'y': 7, 'id': 'mk_gun_crate'},
    # the fixer's stair: a desk, a locker, a lamp
    {'kind': 'table', 'x': 6, 'y': 38, 'id': 'mk_fixer_desk'}, {'kind': 'chair', 'x': 6, 'y': 37, 'rot': 2}, {'kind': 'locker', 'x': 4, 'y': 41, 'id': 'mk_fixer_locker'}, {'kind': 'shelf', 'x': 10, 'y': 36, 'rot': 3}, {'kind': 'sign', 'x': 12, 'y': 40, 'rot': 1, 'id': 'mk_fixer_sign'},
    # the standpipe square: the pipe, the ration board, crates, a fire
    {'kind': 'pump', 'x': 36, 'y': 50, 'id': 'mk_standpipe'}, {'kind': 'sign', 'x': 33, 'y': 49, 'rot': 1, 'id': 'mk_ration_board'}, {'kind': 'crate', 'x': 20, 'y': 50}, {'kind': 'crate', 'x': 21, 'y': 50}, {'kind': 'fire_barrel', 'x': 52, 'y': 51}, {'kind': 'barrel', 'x': 40, 'y': 52}, {'kind': 'lamp_post', 'x': 30, 'y': 48},
    # the kiosk on the east street
    {'kind': 'terminal', 'x': 64, 'y': 37, 'rot': 2, 'id': 'mk_kiosk'}, {'kind': 'sign', 'x': 61, 'y': 41, 'rot': 1, 'id': 'mk_kiosk_sign'}, {'kind': 'lamp_post', 'x': 67, 'y': 42},
]

md_market = {
    'id': 'md_market', 'name': 'Meridian — Old Market', 'seed': 53, 'settlement': 'meridian',
    'layout': rows,
    'legend': {
        'c': {'floor': 'concrete'}, 'a': {'floor': 'asphalt'}, 'm': {'floor': 'metal'}, 't': {'floor': 'tile'}, 'k': {'floor': 'rubble'},
        'R': {'wall': 'rock', 'floor': 'rubble', 'wallHeight': 4},
        'S': {'wall': 'concrete', 'floor': 'tile', 'wallHeight': 4.4, 'roof': 'none'},
        'B': {'wall': 'brick', 'floor': 'tile', 'wallHeight': 3.2},
        'M': {'wall': 'metal', 'floor': 'metal', 'wallHeight': 2.8},
        'C': {'wall': 'concrete', 'floor': 'tile', 'wallHeight': 2.6},
    },
    'props': props,
    'lights': [
        {'x': 12, 'y': 9, 'height': 3.2, 'color': 'hex:0xe8f0ff', 'intensity': 2.2, 'range': 9}, {'x': 15, 'y': 26, 'height': 3.2, 'color': 'hex:0xffd0a0', 'intensity': 2.4, 'range': 10}, {'x': 57, 'y': 31, 'height': 3.2, 'color': 'hex:0xffd0a0', 'intensity': 2.4, 'range': 10},
        {'x': 34, 'y': 12, 'height': 3.2, 'color': 'hex:0xffd0a0', 'intensity': 2.2, 'range': 9}, {'x': 39, 'y': 45, 'height': 3.2, 'color': 'hex:0xffd0a0', 'intensity': 2.2, 'range': 9}, {'x': 61, 'y': 25, 'height': 3.2, 'color': 'hex:0xffd0a0', 'intensity': 2.2, 'range': 9},
        {'x': 36, 'y': 26, 'height': 3.0, 'color': 'hex:0xff70c0', 'intensity': 2.6, 'range': 11, 'flicker': 0.2}, {'x': 36, 'y': 31, 'height': 3.0, 'color': 'hex:0x40e0ff', 'intensity': 2.0, 'range': 10, 'flicker': 0.25},
        {'x': 22, 'y': 20, 'height': 2.8, 'color': 'hex:0xffd0a0', 'intensity': 1.6, 'range': 8}, {'x': 48, 'y': 20, 'height': 2.8, 'color': 'hex:0xffd0a0', 'intensity': 1.6, 'range': 8}, {'x': 24, 'y': 38, 'height': 2.8, 'color': 'hex:0xffd0a0', 'intensity': 1.6, 'range': 8}, {'x': 48, 'y': 38, 'height': 2.8, 'color': 'hex:0xff9a40', 'intensity': 1.6, 'range': 8, 'flicker': 0.3},
        {'x': 22, 'y': 5, 'height': 2.6, 'color': 'hex:0x40e0ff', 'intensity': 1.8, 'range': 7, 'flicker': 0.15}, {'x': 48, 'y': 5, 'height': 2.6, 'color': 'hex:0xffd8a0', 'intensity': 1.6, 'range': 7},
        {'x': 7, 'y': 18, 'height': 2.6, 'color': 'hex:0xffb070', 'intensity': 2.0, 'range': 8, 'flicker': 0.2}, {'x': 6, 'y': 38, 'height': 2.4, 'color': 'hex:0xffd8a0', 'intensity': 1.4, 'range': 6},
        {'x': 30, 'y': 48, 'height': 3.2, 'color': 'hex:0xe8f0ff', 'intensity': 2.0, 'range': 9}, {'x': 64, 'y': 37, 'height': 1.6, 'color': 'hex:0x60ff90', 'intensity': 1.4, 'range': 4, 'flicker': 0.3}, {'x': 67, 'y': 42, 'height': 3.2, 'color': 'hex:0xffd0a0', 'intensity': 2.0, 'range': 9},
        {'x': 13, 'y': 31, 'height': 0.8, 'color': 'hex:0xff9a40', 'intensity': 1.6, 'range': 5, 'flicker': 0.35}, {'x': 52, 'y': 51, 'height': 0.8, 'color': 'hex:0xff9a40', 'intensity': 1.6, 'range': 5, 'flicker': 0.35},
    ],
    'spawns': [
        {'id': 'start', 'x': 2, 'y': 28, 'facing': 1}, {'id': 'from_precinct', 'x': 2, 'y': 28, 'facing': 1}, {'id': 'loop', 'x': 7, 'y': 8, 'facing': 2}, {'id': 'court', 'x': 36, 'y': 28, 'facing': 0}, {'id': 'from_lantern', 'x': 69, 'y': 28, 'facing': 3},
    ],
    'exits': [
        {'x': 0, 'y': 26, 'w': 1, 'h': 6, 'to': {'location': 'md_precinct', 'spawn': 'loop'}, 'label': 'The avenue west, to the Precinct'},
    ],
    'talk': {
        'mk_loop_sign': {'dialogue': 'd_mk_loop', 'name': 'The Loop — Old Market'},
        'mk_gigs_board': {'dialogue': 'd_mk_gigs', 'name': 'The gigs board'},
        'mk_hatch': {'dialogue': 'd_mk_hatch', 'name': 'The Broker\'s hatch'},
        'mk_escalator': {'dialogue': 'd_mk_escalator', 'name': 'The dead escalator'},
        'mk_mall_sign': {'dialogue': 'd_mk_mall_sign', 'name': 'Over the mall doors'},
        'mk_east_sign': {'dialogue': 'd_mk_east_sign', 'name': 'The east street'},
        'mk_food_sign': {'dialogue': 'd_mk_food_sign', 'name': 'The food hall'},
        'mk_fixer_sign': {'dialogue': 'd_mk_fixer_sign', 'name': 'A door with no sign'},
        'mk_ration_board': {'dialogue': 'd_mk_ration', 'name': 'The water post'},
        'mk_kiosk': {'dialogue': 'd_mk_kiosk', 'name': 'The kiosk'},
        'mk_kiosk_sign': {'dialogue': 'd_mk_kiosk_sign', 'name': 'A painted board'},
    },
    'containers': {
        'mk_chrome_locker': {'name': 'Chrome Locker', 'items': [['ci_ch_eye_scope', 1]], 'lock': 55},
        'mk_gun_crate': {'name': 'Gun Crate', 'items': [['a_556', 20], ['a_308', 6]], 'lock': 45},
        'mk_fence_crate': {'name': 'Fence\'s Crate', 'items': [['j_electronics', 2], ['j_wiring', 3], ['t_picks', 1]], 'lock': 40},
        'mk_fixer_locker': {'name': 'Fixer\'s Locker', 'items': [['k_md_papers_forged', 1]], 'tolls': 60, 'lock': 60},
        'mk_food_crate': {'name': 'Kitchen Crate', 'items': [['c_tin', 2], ['c_algae', 3]], 'lock': 15},
    },
    'spots': {
        'platform': {'x': 7, 'y': 5}, 'platform_sit': {'x': 5, 'y': 5}, 'wen_counter': {'x': 7, 'y': 18}, 'food_sit_a': {'x': 11, 'y': 17}, 'food_sit_b': {'x': 11, 'y': 20}, 'food_lean': {'x': 12, 'y': 18},
        'hatch': {'x': 36, 'y': 22}, 'court': {'x': 36, 'y': 28}, 'court_pair_a': {'x': 33, 'y': 29}, 'court_pair_b': {'x': 34, 'y': 29}, 'court_lean': {'x': 40, 'y': 26}, 'escalator_sit': {'x': 31, 'y': 26},
        'cloth_stall': {'x': 21, 'y': 18}, 'tea_stall': {'x': 47, 'y': 21}, 'gossip_a_sit': {'x': 43, 'y': 18}, 'gossip_b_sit': {'x': 49, 'y': 18}, 'paper_stall': {'x': 22, 'y': 36}, 'fence_sit': {'x': 27, 'y': 38}, 'drums_sit': {'x': 46, 'y': 40}, 'scrap_work': {'x': 51, 'y': 38},
        'chrome_stall': {'x': 22, 'y': 5}, 'chrome_cot': {'x': 20, 'y': 7}, 'gun_stall': {'x': 48, 'y': 5}, 'gun_back': {'x': 50, 'y': 4},
        'fixer': {'x': 6, 'y': 39}, 'fixer_door': {'x': 12, 'y': 38},
        'square': {'x': 36, 'y': 51}, 'square_pair_a': {'x': 24, 'y': 51}, 'square_pair_b': {'x': 25, 'y': 51}, 'square_lean': {'x': 48, 'y': 50}, 'square_sit': {'x': 42, 'y': 51},
        'kiosk': {'x': 63, 'y': 38}, 'east_street': {'x': 65, 'y': 28}, 'north_street': {'x': 34, 'y': 11}, 'ring_w': {'x': 13, 'y': 28}, 'ring_e': {'x': 58, 'y': 29},
    },
    'npcs': [
        {'def': 'npc_mk_01', 'x': 36, 'y': 22, 'facing': 2},
        {'def': 'npc_mk_02', 'x': 7, 'y': 18, 'facing': 1},
        {'def': 'npc_mk_03', 'x': 22, 'y': 5, 'facing': 2},
        {'def': 'npc_mk_04', 'x': 48, 'y': 5, 'facing': 2},
        {'def': 'npc_mk_05', 'x': 6, 'y': 39, 'facing': 0},
        {'def': 'npc_mk_06', 'x': 22, 'y': 36, 'facing': 2},
        {'def': 'npc_mk_07', 'x': 43, 'y': 17, 'facing': 0},
        {'def': 'npc_mk_08', 'x': 63, 'y': 38, 'facing': 3},
        {'def': 'npc_mk_09', 'x': 36, 'y': 51, 'facing': 0},
        {'def': 'npc_mk_10', 'x': 27, 'y': 38, 'facing': 0},
        {'def': 'npc_md_g6', 'x': 13, 'y': 28, 'facing': 1}, {'def': 'npc_md_g7', 'x': 58, 'y': 29, 'facing': 3},
    ],
    'triggers': [
        {'id': 'arrive', 'x': 1, 'y': 24, 'w': 10, 'h': 10, 'text': 'Old Market. The avenue gives out at a dead mall with its roof gone and a thousand people inside it, and the streets round it are stalls, and the stalls are everything: noodles, cells, cartridges, cloth, paper, chrome in boxes, a tram that still runs and a kiosk that still talks. Nobody here walks as if they had somewhere to be by a time.', 'effects': [{'learn': 'seen_market'}, {'set': 'md_market_open'}]},
        {'id': 'court', 'x': 30, 'y': 24, 'w': 13, 'h': 10, 'text': 'The mall\'s central court under the open sky: a dead escalator, a metal deck worn bright, pink and blue light from tubes somebody salvaged, and a container with a hatch in it and a board beside the hatch, which is where everyone in Meridian who needs something done ends up looking.', 'effects': [{'learn': 'seen_broker'}]},
        {'id': 'square', 'x': 16, 'y': 48, 'w': 41, 'h': 6, 'once': False, 'if': {'all': [{'any': [{'flag': 'dw_restored'}, {'flag': 'dw_freed'}]}, {'not': {'flag': 'mk_riot_over'}}, {'not': {'flag': 'mk_riot_seen'}}]}, 'text': 'The standpipe square. The dial is turned down and the queue is forty long and getting louder, and the two wardens at the square\'s edge have the look of men counting. Somebody at the front says the Precinct drinks what the market doesn\'t.', 'effects': [{'set': 'mk_riot_seen'}, {'learn': 'mk_riot_brewing'}, {'quest': 'q_md_riot', 'start': True}]},
        {'id': 'east_end', 'x': 68, 'y': 26, 'w': 3, 'h': 6, 'once': False, 'if': {'not': {'flag': 'md_lantern_open'}}, 'text': 'The east street runs on toward Lantern Row under strings of dead bulbs and a warden who says WORKS before you ask.'},
    ],
    'extras': [
        {'count': 6, 'roles': ['street', 'trader', 'settler', 'drifter', 'tech', 'labourer'], 'area': {'x': 17, 'y': 15, 'w': 39, 'h': 28}, 'spots': ['court_pair_a', 'court_pair_b', 'court_lean', 'escalator_sit', 'gossip_a_sit', 'gossip_b_sit', 'fence_sit', 'drums_sit', 'scrap_work'], 'hours': {'from': 7, 'to': 24}, 'barks': ['Half-Price pays half. That\'s the name.', 'Don\'t buy chrome from a box you can\'t open.', 'The kiosk said my name. It said my dead name.', 'The Precinct drinks what we don\'t.', 'Wardens count the market twice a day and never like the answer.']},
        {'count': 3, 'roles': ['street', 'settler', 'drifter'], 'life': 'hard', 'area': {'x': 16, 'y': 48, 'w': 41, 'h': 6}, 'spots': ['square_pair_a', 'square_pair_b', 'square_lean', 'square_sit'], 'barks': ['Point eight. For us it\'s point six.', 'The dial\'s theirs. The thirst\'s ours.']},
        {'count': 3, 'roles': ['settler', 'trader', 'street'], 'area': {'x': 3, 'y': 15, 'w': 11, 'h': 8}, 'spots': ['food_sit_a', 'food_sit_b', 'food_lean'], 'hours': {'from': 6, 'to': 23}, 'barks': ['Auntie Wen\'s. Two Tolls, a bowl. Three, with meat; don\'t ask which.', 'Best gossip in Meridian is in this queue.']},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0x9a9ea0', 'fogDensity': 0.013, 'dust': 0.2, 'grade': 0.35, 'mood': 'bustling', 'sound': 'murmur'},
}

HEADER = "import type { MapDef } from '../../engine/data/types';\n\n// Generated by tools/maps/gen_md_market.py — edit the generator, then re-run it.\n"
with open(os.path.join(ROOT, 'src', 'content', 'maps', 'md_market.ts'), 'w') as f:
    f.write(f"{HEADER}export const md_market: MapDef = {ts(md_market)};\n")
print('md_market', W, 'x', H)
