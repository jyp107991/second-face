#!/usr/bin/env python3
"""Generates src/content/maps/md_sink.ts — the Sink: Meridian's flooded under-city beneath the Precinct's
tenements and the old elevated roads (WORLD §3.1: destitute, chem-ridden, organ markets, back-alley Menders,
the forgotten; the water rises every spring).

A concrete shelf along the north wall where the two stairs come down (from the Precinct's back lane and from
Old Market's square); below it the basin — deep water in the middle, ankle-deep streets round the edge, grate
boardwalks on stilts across it. The pump house on its pad to the west (the Precinct's pumps, warden-guarded),
the clinic on the south shore, the organ broker's container beside it, the Pale's hold in the east, shanties on
stilts round the shallows.
    python3 tools/maps/gen_md_sink.py
"""
import json, os, re

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
W, H = 72, 56


def ts(obj):
    s = json.dumps(obj, indent=2)
    s = re.sub(r'"([A-Za-z_][A-Za-z0-9_]*)":', r'\1:', s)
    s = re.sub(r'"hex:(0x[0-9a-fA-F]+)"', r'\1', s)
    return s


g = [['w'] * W for _ in range(H)]


def fill(x0, y0, x1, y1, ch):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            g[y][x] = ch


def building(x0, y0, x1, y1, wall, floor, doors):
    fill(x0, y0, x1, y1, wall)
    fill(x0 + 1, y0 + 1, x1 - 1, y1 - 1, floor)
    for (x, y) in doors:
        g[y][x] = floor


# the rim: the under-city's concrete walls; the two stairs cut through the north wall
fill(0, 0, W - 1, 0, 'R'); fill(0, H - 1, W - 1, H - 1, 'R'); fill(0, 0, 0, H - 1, 'R'); fill(W - 1, 0, W - 1, H - 1, 'R')
fill(36, 0, 37, 0, 'c'); fill(66, 0, 67, 0, 'c')
# the north shelf: dry concrete, where the stairs land, the tally wall, the stalls
fill(1, 1, 70, 9, 'c')
# the basin: deep water in the middle, shallows round it (the default tile)
fill(18, 14, 54, 41, 'W')
# the piers of the old road: concrete columns standing in the water
for (px, py) in [(24, 18), (46, 18), (24, 36), (46, 36), (10, 40), (60, 36)]:
    fill(px, py, px + 1, py + 1, 'P')
# the stilt-walk: grate boardwalks on stilts — north shelf to the clinic, and the long east–west walk
fill(36, 10, 37, 43, 'g')
fill(14, 26, 60, 27, 'g')
fill(52, 10, 53, 26, 'g')   # a spur from the north shelf down to the east walk (the Pale's side)
# the pump house pad, west: concrete, the brick pump house with its one door east, a sealed inner room
fill(2, 18, 14, 32, 'c')
building(3, 20, 13, 30, 'B', 't', [(13, 25)])
building(4, 21, 8, 24, 'C', 'm', [(8, 23)])   # the dial room inside the pump house
# the south shore: the clinic (brick, two doors), the organ broker's container, a landing
fill(16, 42, 62, 54, 'c')
building(27, 44, 45, 53, 'B', 't', [(36, 44), (37, 44), (45, 48)])
building(50, 44, 60, 51, 'M', 'm', [(50, 47)])
fill(63, 42, 70, 54, 'k')
# the Pale's hold, east: containers on a rubble bank, the cold store at the back
fill(56, 10, 70, 25, 'k')
building(58, 11, 70, 17, 'M', 'm', [(58, 14)])
building(62, 19, 70, 24, 'M', 'm', [(62, 21)])
building(64, 12, 69, 16, 'M', 'm', [(64, 14)])   # the cold store, inside the hold
# shanties on stilts round the shallows: scrap shells on grate pads
for (sx, sy) in [(3, 11), (9, 11), (3, 36), (9, 46), (3, 46)]:
    fill(sx, sy, sx + 4, sy + 3, 'g')
    building(sx, sy, sx + 4, sy + 3, 'S', 'g', [(sx + 2, sy + 3)])
fill(2, 14, 14, 15, 'g')      # the west shanties' walk, joining the pump pad
fill(7, 15, 8, 17, 'g')
fill(2, 33, 14, 33, 'g'); fill(5, 33, 6, 35, 'g'); fill(2, 50, 14, 50, 'g')
g[36][5] = 'g'; g[39][5] = 'S'   # the middle west shanty opens north, onto the row-33 walk
fill(14, 42, 15, 50, 'c')
# the raft landing on the north shelf's west end
fill(10, 10, 14, 12, 'g')

rows = [''.join(r) for r in g]

props = [
    # the north shelf: the stairs' foot, the tally wall, Lusk's table, a kettle stall, the spring mark on the first pier
    {'kind': 'lamp_post', 'x': 34, 'y': 2}, {'kind': 'lamp_post', 'x': 64, 'y': 2}, {'kind': 'sign', 'x': 38, 'y': 1, 'rot': 2, 'id': 'sk_stair_sign'},
    {'kind': 'sign', 'x': 20, 'y': 1, 'rot': 2, 'id': 'sk_tally'}, {'kind': 'table', 'x': 21, 'y': 4}, {'kind': 'chair', 'x': 21, 'y': 5, 'rot': 0}, {'kind': 'cot', 'x': 16, 'y': 3, 'rot': 1},
    {'kind': 'counter', 'x': 46, 'y': 4, 'rot': 2}, {'kind': 'stove', 'x': 46, 'y': 3}, {'kind': 'barrel', 'x': 48, 'y': 3}, {'kind': 'crate', 'x': 30, 'y': 3}, {'kind': 'crate', 'x': 31, 'y': 3},
    {'kind': 'fire_barrel', 'x': 26, 'y': 6}, {'kind': 'blanket', 'x': 28, 'y': 7}, {'kind': 'blanket', 'x': 12, 'y': 6}, {'kind': 'debris', 'x': 56, 'y': 6}, {'kind': 'tire_pile', 'x': 60, 'y': 7},
    {'kind': 'sign', 'x': 35, 'y': 11, 'rot': 1, 'id': 'sk_mark'},
    # the raft landing
    {'kind': 'crate', 'x': 10, 'y': 10}, {'kind': 'barrel', 'x': 14, 'y': 10}, {'kind': 'lamp_post', 'x': 11, 'y': 12},
    # the pump house: three pumps, pipes, the schedule board outside, the dial room's terminal, the keeper's cot
    {'kind': 'pump', 'x': 10, 'y': 22, 'id': 'sk_pump_a'}, {'kind': 'pump', 'x': 10, 'y': 25}, {'kind': 'pump', 'x': 10, 'y': 28},
    {'kind': 'pipe_h', 'x': 11, 'y': 22}, {'kind': 'pipe_h', 'x': 11, 'y': 25}, {'kind': 'pipe_h', 'x': 11, 'y': 28}, {'kind': 'pipe_h', 'x': 12, 'y': 22}, {'kind': 'pipe_h', 'x': 12, 'y': 28},
    {'kind': 'terminal', 'x': 5, 'y': 22, 'rot': 1, 'id': 'sk_dial'}, {'kind': 'locker', 'x': 7, 'y': 22, 'id': 'sk_pump_locker'},
    {'kind': 'table', 'x': 9, 'y': 29}, {'kind': 'cot', 'x': 12, 'y': 29, 'rot': 0}, {'kind': 'sign', 'x': 14, 'y': 23, 'rot': 3, 'id': 'sk_pump_board'},
    {'kind': 'sandbags', 'x': 14, 'y': 19}, {'kind': 'sandbags', 'x': 14, 'y': 31}, {'kind': 'lamp_post', 'x': 13, 'y': 18}, {'kind': 'lamp_post', 'x': 13, 'y': 32},
    # the clinic: cots, the table, the shelf, a stove, the sign, the water butt
    {'kind': 'sign', 'x': 35, 'y': 43, 'rot': 2, 'id': 'sk_clinic_sign'}, {'kind': 'lamp_post', 'x': 39, 'y': 43},
    {'kind': 'table', 'x': 33, 'y': 48, 'id': 'sk_clinic_table'}, {'kind': 'shelf', 'x': 40, 'y': 45, 'rot': 0, 'id': 'sk_clinic_shelf'}, {'kind': 'stove', 'x': 28, 'y': 45}, {'kind': 'barrel', 'x': 29, 'y': 45},
    {'kind': 'cot', 'x': 30, 'y': 51, 'rot': 1}, {'kind': 'cot', 'x': 34, 'y': 51, 'rot': 1}, {'kind': 'cot', 'x': 38, 'y': 51, 'rot': 1}, {'kind': 'cot', 'x': 42, 'y': 51, 'rot': 1}, {'kind': 'cot', 'x': 43, 'y': 46, 'rot': 0},
    {'kind': 'chair', 'x': 33, 'y': 49, 'rot': 2}, {'kind': 'crate', 'x': 44, 'y': 52}, {'kind': 'locker', 'x': 28, 'y': 52, 'id': 'sk_clinic_locker'},
    # the organ broker's container: the counter, the cold box, the scales
    {'kind': 'sign', 'x': 49, 'y': 46, 'rot': 3, 'id': 'sk_vash_sign'}, {'kind': 'counter', 'x': 54, 'y': 47, 'rot': 1}, {'kind': 'locker', 'x': 58, 'y': 46, 'id': 'sk_vash_cold'}, {'kind': 'table', 'x': 57, 'y': 49}, {'kind': 'cot', 'x': 52, 'y': 50, 'rot': 1},
    # the landing east of the clinic: a fire, bedrolls, the chem corner
    {'kind': 'fire_barrel', 'x': 64, 'y': 48}, {'kind': 'blanket', 'x': 66, 'y': 49}, {'kind': 'blanket', 'x': 65, 'y': 51}, {'kind': 'debris', 'x': 68, 'y': 46}, {'kind': 'barrel_rust', 'x': 69, 'y': 52},
    # the Pale's hold: the Elder's chair, a fire, crates, the cold store's locker, sandbags at the walk's end
    {'kind': 'chair', 'x': 66, 'y': 21, 'rot': 3}, {'kind': 'table', 'x': 65, 'y': 21}, {'kind': 'fire_barrel', 'x': 60, 'y': 20}, {'kind': 'crate', 'x': 59, 'y': 23}, {'kind': 'crate', 'x': 60, 'y': 23},
    {'kind': 'locker', 'x': 68, 'y': 13, 'id': 'sk_cold'}, {'kind': 'table', 'x': 66, 'y': 15}, {'kind': 'sandbags', 'x': 56, 'y': 25}, {'kind': 'sign', 'x': 57, 'y': 10, 'rot': 2, 'id': 'sk_pale_sign'},
    {'kind': 'barrel_rust', 'x': 61, 'y': 12}, {'kind': 'tire_pile', 'x': 69, 'y': 25},
    # shanties: a stove, a cot, a blanket each
    {'kind': 'cot', 'x': 4, 'y': 12, 'rot': 1}, {'kind': 'stove', 'x': 10, 'y': 12}, {'kind': 'cot', 'x': 4, 'y': 37, 'rot': 1}, {'kind': 'blanket', 'x': 10, 'y': 47}, {'kind': 'cot', 'x': 4, 'y': 47, 'rot': 1},
    # the water: wreckage and a sunken car in the shallows, debris on the walks
    {'kind': 'car_wreck', 'x': 16, 'y': 36, 'rot': 1}, {'kind': 'car_wreck', 'x': 56, 'y': 30, 'rot': 3}, {'kind': 'tire_pile', 'x': 20, 'y': 12}, {'kind': 'barrel_rust', 'x': 50, 'y': 40}, {'kind': 'debris', 'x': 36, 'y': 20}, {'kind': 'debris', 'x': 44, 'y': 27},
]

md_sink = {
    'id': 'md_sink', 'name': 'Meridian — the Sink', 'seed': 59, 'settlement': 'meridian',
    'layout': rows,
    'legend': {
        'c': {'floor': 'concrete'}, 'k': {'floor': 'rubble'}, 't': {'floor': 'tile'}, 'm': {'floor': 'metal'}, 'g': {'floor': 'grate'},
        'w': {'floor': 'water'},
        'W': {'floor': 'water', 'blocks': True},
        'R': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 5},
        'P': {'wall': 'concrete', 'floor': 'water', 'wallHeight': 5},
        'B': {'wall': 'brick', 'floor': 'tile', 'wallHeight': 3},
        'C': {'wall': 'concrete', 'floor': 'metal', 'wallHeight': 2.6},
        'M': {'wall': 'metal', 'floor': 'metal', 'wallHeight': 2.8},
        'S': {'wall': 'scrap', 'floor': 'grate', 'wallHeight': 2.4, 'roof': 'tin'},
    },
    'props': props,
    'lights': [
        # work lamps on cables along the shelf and the walks: cold blue-white, most of them failing
        {'x': 34, 'y': 2, 'height': 3.4, 'color': 'hex:0xa0c8ff', 'intensity': 3.3, 'range': 13}, {'x': 64, 'y': 2, 'height': 3.4, 'color': 'hex:0xa0c8ff', 'intensity': 3.0, 'range': 13},
        {'x': 20, 'y': 3, 'height': 3.0, 'color': 'hex:0xa0c8ff', 'intensity': 2.4, 'range': 11, 'flicker': 0.2}, {'x': 47, 'y': 4, 'height': 2.6, 'color': 'hex:0xffb070', 'intensity': 1.8, 'range': 7, 'flicker': 0.2},
        {'x': 11, 'y': 12, 'height': 3.0, 'color': 'hex:0xa0c8ff', 'intensity': 2.4, 'range': 11, 'flicker': 0.3},
        {'x': 36, 'y': 18, 'height': 3.2, 'color': 'hex:0x80b0e0', 'intensity': 2.4, 'range': 12, 'flicker': 0.25}, {'x': 37, 'y': 34, 'height': 3.2, 'color': 'hex:0x80b0e0', 'intensity': 2.4, 'range': 12, 'flicker': 0.25},
        {'x': 26, 'y': 26, 'height': 3.2, 'color': 'hex:0x80b0e0', 'intensity': 2.1, 'range': 11, 'flicker': 0.3}, {'x': 48, 'y': 27, 'height': 3.2, 'color': 'hex:0x80b0e0', 'intensity': 2.1, 'range': 11, 'flicker': 0.3},
        {'x': 53, 'y': 18, 'height': 3.2, 'color': 'hex:0x80b0e0', 'intensity': 1.8, 'range': 10, 'flicker': 0.3},
        # more lamps on the long walks, so the water reads
        {'x': 20, 'y': 27, 'height': 3.2, 'color': 'hex:0x80b0e0', 'intensity': 2.2, 'range': 11, 'flicker': 0.2}, {'x': 40, 'y': 26, 'height': 3.2, 'color': 'hex:0x80b0e0', 'intensity': 2.2, 'range': 11, 'flicker': 0.2}, {'x': 57, 'y': 27, 'height': 3.2, 'color': 'hex:0x80b0e0', 'intensity': 2.2, 'range': 11, 'flicker': 0.2},
        {'x': 36, 'y': 40, 'height': 3.2, 'color': 'hex:0x80b0e0', 'intensity': 2.2, 'range': 11, 'flicker': 0.2}, {'x': 37, 'y': 12, 'height': 3.2, 'color': 'hex:0x80b0e0', 'intensity': 2.2, 'range': 11, 'flicker': 0.2}, {'x': 8, 'y': 33, 'height': 3.0, 'color': 'hex:0x80b0e0', 'intensity': 1.8, 'range': 9, 'flicker': 0.3},
        # the pump house: white and steady, the Precinct's lamps; the dial room's green
        {'x': 13, 'y': 18, 'height': 3.4, 'color': 'hex:0xf0f4ff', 'intensity': 2.4, 'range': 9}, {'x': 13, 'y': 32, 'height': 3.4, 'color': 'hex:0xf0f4ff', 'intensity': 2.4, 'range': 9},
        {'x': 9, 'y': 25, 'height': 2.6, 'color': 'hex:0xf0f4ff', 'intensity': 2.0, 'range': 8}, {'x': 6, 'y': 22, 'height': 1.6, 'color': 'hex:0x60ff90', 'intensity': 1.4, 'range': 4, 'flicker': 0.2},
        # the clinic: warm sodium, the one kind light down here
        {'x': 39, 'y': 43, 'height': 3.2, 'color': 'hex:0xffc080', 'intensity': 2.4, 'range': 10}, {'x': 34, 'y': 48, 'height': 2.6, 'color': 'hex:0xffd8a0', 'intensity': 2.2, 'range': 8}, {'x': 40, 'y': 50, 'height': 2.6, 'color': 'hex:0xffd8a0', 'intensity': 1.6, 'range': 7},
        # the organ broker: cold green from the cold box; the landing's fire; the chem corner's violet
        {'x': 56, 'y': 47, 'height': 2.4, 'color': 'hex:0x60ff90', 'intensity': 1.8, 'range': 7, 'flicker': 0.15}, {'x': 64, 'y': 48, 'height': 0.8, 'color': 'hex:0xff9a40', 'intensity': 1.6, 'range': 5, 'flicker': 0.35},
        {'x': 68, 'y': 50, 'height': 2.0, 'color': 'hex:0xb060ff', 'intensity': 1.2, 'range': 6, 'flicker': 0.3},
        # the Pale's hold: red bulbs, a fire
        {'x': 64, 'y': 14, 'height': 2.6, 'color': 'hex:0xff5040', 'intensity': 1.8, 'range': 7, 'flicker': 0.2}, {'x': 66, 'y': 21, 'height': 2.6, 'color': 'hex:0xff5040', 'intensity': 1.6, 'range': 7, 'flicker': 0.2},
        {'x': 60, 'y': 20, 'height': 0.8, 'color': 'hex:0xff9a40', 'intensity': 1.6, 'range': 5, 'flicker': 0.35},
        # shanties: a stove glow each
        {'x': 10, 'y': 12, 'height': 1.2, 'color': 'hex:0xff9a40', 'intensity': 1.2, 'range': 4, 'flicker': 0.3}, {'x': 5, 'y': 38, 'height': 1.2, 'color': 'hex:0xffb070', 'intensity': 1.0, 'range': 4, 'flicker': 0.3}, {'x': 5, 'y': 48, 'height': 1.2, 'color': 'hex:0xffb070', 'intensity': 1.0, 'range': 4, 'flicker': 0.3},
    ],
    'spawns': [
        {'id': 'start', 'x': 36, 'y': 2, 'facing': 0}, {'id': 'from_precinct', 'x': 36, 'y': 2, 'facing': 0}, {'id': 'from_market', 'x': 66, 'y': 2, 'facing': 0},
        {'id': 'clinic', 'x': 36, 'y': 46, 'facing': 0}, {'id': 'pumps', 'x': 15, 'y': 25, 'facing': 3},
    ],
    'exits': [
        {'x': 36, 'y': 0, 'w': 2, 'h': 1, 'to': {'location': 'md_precinct', 'spawn': 'sink_stair'}, 'label': 'The stair up to the Precinct'},
        {'x': 66, 'y': 0, 'w': 2, 'h': 1, 'to': {'location': 'md_market', 'spawn': 'sink_stair'}, 'label': 'The stair up to Old Market'},
    ],
    'talk': {
        'sk_stair_sign': {'dialogue': 'd_sk_stair_sign', 'name': 'The stair'},
        'sk_tally': {'dialogue': 'd_sk_tally', 'name': 'The tally wall'},
        'sk_mark': {'dialogue': 'd_sk_mark', 'name': 'The spring line'},
        'sk_pump_board': {'dialogue': 'd_sk_pump_board', 'name': 'The pump schedule'},
        'sk_dial': {'dialogue': 'd_sk_dial', 'name': 'The relief dial'},
        'sk_clinic_sign': {'dialogue': 'd_sk_clinic_sign', 'name': 'The clinic'},
        'sk_vash_sign': {'dialogue': 'd_sk_vash_sign', 'name': 'A painted door'},
        'sk_pale_sign': {'dialogue': 'd_sk_pale_sign', 'name': 'The Pale\'s mark'},
    },
    'containers': {
        'sk_pump_locker': {'name': 'Pump House Locker', 'items': [['t_repair', 1], ['j_wiring', 3], ['c_water', 2]], 'tolls': 10, 'lock': 30},
        'sk_clinic_locker': {'name': 'Clinic Locker', 'items': [['c_bandage', 3], ['c_knitkit', 1], ['c_splint', 1]], 'tolls': 0},
        'sk_vash_cold': {'name': 'Vash\'s Cold Box', 'items': [['c_knitkit', 1]], 'tolls': 60, 'lock': 50},
        'sk_cold': {'name': 'The Pale\'s Cold Store', 'items': [['k_sk_heart', 1], ['c_jerky', 3], ['a_9mm', 10]], 'tolls': 30, 'lock': 45},
    },
    'spots': {
        'tally': {'x': 21, 'y': 3}, 'tally_cot': {'x': 16, 'y': 4}, 'kettle': {'x': 47, 'y': 5}, 'shelf_lean': {'x': 30, 'y': 4}, 'shelf_fire': {'x': 27, 'y': 6}, 'shelf_pair_a': {'x': 40, 'y': 5}, 'shelf_pair_b': {'x': 41, 'y': 5},
        'kye_lean': {'x': 56, 'y': 5}, 'shelf_sit': {'x': 28, 'y': 7},
        'raft': {'x': 12, 'y': 11}, 'raft_cot': {'x': 13, 'y': 11},
        'pump_panel': {'x': 9, 'y': 24}, 'pump_cot': {'x': 12, 'y': 28}, 'pump_table': {'x': 9, 'y': 28}, 'warden_a': {'x': 14, 'y': 24}, 'warden_b': {'x': 14, 'y': 26},
        'clinic_table': {'x': 34, 'y': 47}, 'clinic_shelf': {'x': 39, 'y': 46}, 'clinic_cot_a_sit': {'x': 30, 'y': 50}, 'clinic_cot_b_sit': {'x': 34, 'y': 50}, 'clinic_cot_c_sit': {'x': 38, 'y': 50}, 'clinic_cot_ocho': {'x': 43, 'y': 47}, 'clinic_cot_pell': {'x': 42, 'y': 50},
        'clinic_door': {'x': 36, 'y': 42},
        'vash_counter': {'x': 55, 'y': 47}, 'vash_cot': {'x': 52, 'y': 49},
        'landing_fire': {'x': 63, 'y': 47}, 'landing_pair_a': {'x': 66, 'y': 45}, 'landing_pair_b': {'x': 67, 'y': 45}, 'chem_sit': {'x': 66, 'y': 50}, 'landing_lean': {'x': 62, 'y': 52},
        'pale_chair': {'x': 66, 'y': 20}, 'pale_fire': {'x': 61, 'y': 21}, 'pale_door': {'x': 57, 'y': 14}, 'pale_walk': {'x': 55, 'y': 25}, 'pale_cold': {'x': 66, 'y': 14},
        'shanty_a': {'x': 5, 'y': 13}, 'shanty_b': {'x': 5, 'y': 38}, 'shanty_c': {'x': 5, 'y': 48}, 'walk_w': {'x': 8, 'y': 14}, 'walk_s': {'x': 8, 'y': 50},
        'walk_mid': {'x': 36, 'y': 26}, 'walk_e': {'x': 50, 'y': 27},
    },
    'npcs': [
        {'def': 'npc_sk_01', 'x': 34, 'y': 47, 'facing': 1},
        {'def': 'npc_sk_02', 'x': 39, 'y': 46, 'facing': 3},
        {'def': 'npc_sk_03', 'x': 9, 'y': 24, 'facing': 1},
        {'def': 'npc_sk_04', 'x': 21, 'y': 3, 'facing': 2},
        {'def': 'npc_sk_05', 'x': 55, 'y': 47, 'facing': 3},
        {'def': 'npc_sk_06', 'x': 66, 'y': 20, 'facing': 3},
        {'def': 'npc_sk_07', 'x': 30, 'y': 50, 'facing': 0},
        {'def': 'npc_sk_08', 'x': 12, 'y': 11, 'facing': 2},
        {'def': 'npc_sk_09', 'x': 5, 'y': 13, 'facing': 2},
        {'def': 'npc_sk_10', 'x': 56, 'y': 5, 'facing': 3},
        {'def': 'npc_sk_p1', 'x': 57, 'y': 14, 'facing': 3}, {'def': 'npc_sk_p2', 'x': 55, 'y': 25, 'facing': 2}, {'def': 'npc_sk_p3', 'x': 61, 'y': 21, 'facing': 0},
        {'def': 'npc_sk_w1', 'x': 14, 'y': 24, 'facing': 1}, {'def': 'npc_sk_w2', 'x': 14, 'y': 26, 'facing': 1},
    ],
    'triggers': [
        {'id': 'arrive', 'x': 30, 'y': 1, 'w': 12, 'h': 6, 'text': 'The Sink. The stair comes down out of the Precinct\'s lamplight into a dark that drips, and the dark is a city: the old streets under the elevated road, flooded to the knee, flooded to the roof, lit by work-lamps on cables and by nothing. Boardwalks on stilts go out across the water to where people live. Something is pumping, far off, slowly, like a heart that has been told to.', 'effects': [{'learn': 'seen_sink'}, {'set': 'md_sink_open'}]},
        {'id': 'arrive_e', 'x': 60, 'y': 1, 'w': 10, 'h': 6, 'text': 'The Sink, by the market stair: a concrete shelf, a kettle, a wall of names, and below it the dark water of the under-city with its boardwalks going out across it on stilts. Something is pumping, far off, slowly.', 'effects': [{'learn': 'seen_sink'}, {'set': 'md_sink_open'}]},
        {'id': 'mark', 'x': 34, 'y': 10, 'w': 6, 'h': 4, 'if': {'not': {'quest': 'q_sk_highwater'}}, 'text': 'The first pier of the stilt-walk has lines chalked up its side, one above the other, each with a year. The top line is above your head. Somebody has chalked next spring\'s already, a hand higher, with a question mark.', 'effects': [{'learn': 'sk_mark_seen'}, {'quest': 'q_sk_highwater', 'start': True}]},
        {'id': 'pumps', 'x': 13, 'y': 20, 'w': 3, 'h': 12, 'text': 'The pump house: the one building in the Sink with the Precinct\'s white lamps on it, and two wardens at its door who are not here to keep the Sink dry. Through the wall, the slow thud of the pumps.', 'effects': [{'learn': 'sk_pumps_seen'}]},
        {'id': 'clinic', 'x': 30, 'y': 42, 'w': 14, 'h': 3, 'text': 'The clinic: a brick shell with a sodium lamp over the door and a queue that has learned to sit. The only light in the Sink that is the colour of a kitchen.', 'effects': [{'learn': 'seen_clinic'}]},
        {'id': 'pale', 'x': 54, 'y': 10, 'w': 4, 'h': 16, 'once': False, 'if': {'all': [{'not': {'flag': 'sk_pale_leave'}}, {'not': {'flag': 'sk_pale_warned'}}]}, 'text': 'Three people with no chrome and skin the colour of the water stand up from a fire as you come along the walk. Nobody says anything. It is the kind of nobody that means turn round.', 'effects': [{'set': 'sk_pale_warned'}, {'learn': 'pale_seen'}]},
    ],
    'extras': [
        {'count': 5, 'roles': ['street', 'drifter', 'labourer', 'settler'], 'life': 'hard', 'area': {'x': 1, 'y': 1, 'w': 70, 'h': 9}, 'spots': ['shelf_lean', 'shelf_fire', 'shelf_pair_a', 'shelf_pair_b', 'shelf_sit'], 'barks': ['Line\'s a hand higher this year.', 'Pumps run for the Precinct. We run for the stairs.', 'Ocho\'s free. Ocho\'s always free. Don\'t ask what it costs him.', 'Don\'t go east on the walk. The Pale don\'t like faces.']},
        {'count': 4, 'roles': ['street', 'drifter', 'settler'], 'life': 'hard', 'area': {'x': 16, 'y': 42, 'w': 54, 'h': 12}, 'spots': ['landing_fire', 'landing_pair_a', 'landing_pair_b', 'chem_sit', 'landing_lean', 'clinic_door'], 'barks': ['Sit. The queue sits.', 'Vash buys. Vash buys anything that was ever warm.', 'Spring\'s coming up the stair this year, you watch.']},
        {'count': 2, 'roles': ['street', 'labourer'], 'life': 'hard', 'area': {'x': 2, 'y': 10, 'w': 13, 'h': 42}, 'spots': ['walk_w', 'walk_s', 'walk_mid', 'walk_e'], 'barks': ['Mind the third board.', 'Water\'s warm. That\'s the worst of it.']},
    ],
    'ambience': {'indoor': True, 'fogColor': 'hex:0x1a2028', 'fogDensity': 0.014, 'dust': 0.12, 'ambient': {'color': 'hex:0x7e8ea4', 'intensity': 1.0}, 'grade': 0.25, 'mood': 'grim'},
}

HEADER = "import type { MapDef } from '../../engine/data/types';\n\n// Generated by tools/maps/gen_md_sink.py — edit the generator, then re-run it.\n"
with open(os.path.join(ROOT, 'src', 'content', 'maps', 'md_sink.ts'), 'w') as f:
    f.write(f"{HEADER}export const md_sink: MapDef = {ts(md_sink)};\n")
print('md_sink', W, 'x', H)
for y in range(H):
    print(rows[y])
