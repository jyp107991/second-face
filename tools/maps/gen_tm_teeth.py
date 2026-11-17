#!/usr/bin/env python3
"""Generates the Teeth mines' maps (B5c): src/content/maps/tm_pit.ts, tm_level.ts, tm_trail.ts.

Number Four (the free pit, `mine_teeth`): a camp in a bowl of rock under a pre-war headframe on the Teeth's south face. The
cage house over the shaft, the winding house (the winding engine, the old field set), the snowmelt stream and its wheel,
the smelter, the store, the bunkhouse, the cutter's shack, the trapper's hut, the bucket line's top station (the old aerial
ropeway down to the Line's cutting east of East Halt), the lamp board, spoil heaps, the track down to East Halt, and the
path that zigzags up through the rock to the col, with a switchback ledge and a hut on the saddle where the Skirts' path
comes over. The old drift's mouth in the rock on the camp's west side.

The old level (a cell): the cage bottom, the drive under the pit from the drift's mouth to the adit that climbs to the
col, the pillar rooms, a stope, the half-pumped sump, and the digger.

The mountain trail (a cell): the roadside map for the Teeth's road encounters.
    python3 tools/maps/gen_tm_teeth.py
"""
import json, os, re, sys
from collections import deque

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')


def ts(obj):
    s = json.dumps(obj, indent=2)
    s = re.sub(r'"([A-Za-z_][A-Za-z0-9_]*)":', r'\1:', s)
    s = re.sub(r'"hex:(0x[0-9a-fA-F]+)"', r'\1', s)
    return s


SOLID = {'crate', 'barrel', 'barrel_rust', 'locker', 'table', 'chair', 'bed', 'terminal', 'pipe_h', 'lamp_post', 'car_wreck', 'rock',
         'rock_small', 'tire_pile', 'tank', 'vault_door', 'dead_tree', 'sandbags', 'shelf', 'stove', 'fire_barrel', 'campfire', 'cactus',
         'counter', 'planter', 'machine', 'cot', 'tent', 'fence_post', 'pump', 'wagon', 'horse'}


def check(name, rows, legend, props, spawns, npcs, spots, start_spawn):
    """Fail loudly on anything the validator would reject, and on places nobody can walk to."""
    H, W = len(rows), len(rows[0])
    assert all(len(r) == W for r in rows), f'{name}: ragged rows'
    solid = {(p['x'], p['y']) for p in props if p['kind'] in SOLID}
    errs = []
    wall = lambda x, y: 'wall' in legend[rows[y][x]] or legend[rows[y][x]].get('blocks')
    for p in props:
        if wall(p['x'], p['y']):
            errs.append(f"prop {p['kind']} {p.get('id', '')} at {p['x']},{p['y']} is inside a wall")
    free = lambda x, y: 0 <= x < W and 0 <= y < H and not wall(x, y) and (x, y) not in solid
    sx, sy = next((s['x'], s['y']) for s in spawns if s['id'] == start_spawn)
    seen = {(sx, sy)}
    q = deque([(sx, sy)])
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x + dx, y + dy)
            if n not in seen and free(*n):
                seen.add(n)
                q.append(n)
    for s in spawns:
        if not free(s['x'], s['y']): errs.append(f"spawn {s['id']} at {s['x']},{s['y']} not free")
        elif (s['x'], s['y']) not in seen: errs.append(f"spawn {s['id']} unreachable")
    ids = set()
    for n in npcs:
        k = n.get('id', n['def'])
        if k in ids: errs.append(f"npc {k} placed twice")
        ids.add(k)
        if not free(n['x'], n['y']): errs.append(f"npc {k} at {n['x']},{n['y']} not free")
        elif (n['x'], n['y']) not in seen: errs.append(f"npc {k} unreachable")
    for k, v in spots.items():
        if not free(v['x'], v['y']): errs.append(f"spot {k} at {v['x']},{v['y']} not free")
        elif (v['x'], v['y']) not in seen: errs.append(f"spot {k} unreachable")
    # every talk prop must have a free tile beside it to stand on
    for p in props:
        if p.get('id') and not any((p['x'] + dx, p['y'] + dy) in seen for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1))):
            errs.append(f"prop {p['id']} cannot be reached")
    if errs:
        print(name, 'FAILED:\n  ' + '\n  '.join(errs))
        sys.exit(1)


def grid(W, H, ch):
    return [[ch] * W for _ in range(H)]


def fill(g, x0, y0, x1, y1, ch):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            g[y][x] = ch


def building(g, x0, y0, x1, y1, wall, floor, doors):
    fill(g, x0, y0, x1, y1, wall)
    fill(g, x0 + 1, y0 + 1, x1 - 1, y1 - 1, floor)
    for (x, y) in doors:
        g[y][x] = floor


def border(g, ch='R'):
    H, W = len(g), len(g[0])
    fill(g, 0, 0, W - 1, 0, ch); fill(g, 0, H - 1, W - 1, H - 1, ch); fill(g, 0, 0, 0, H - 1, ch); fill(g, W - 1, 0, W - 1, H - 1, ch)


LEGEND = {
    'd': {'floor': 'dirt'}, 'k': {'floor': 'rubble'}, 'c': {'floor': 'concrete'}, 'm': {'floor': 'metal'}, 'w': {'floor': 'wood'},
    'x': {'floor': 'water'}, 'X': {'floor': 'water', 'blocks': True}, 'g': {'floor': 'grate'},
    'R': {'wall': 'rock', 'floor': 'rubble', 'wallHeight': 6},
    'K': {'wall': 'rock', 'floor': 'rubble', 'wallHeight': 3.5},
    'C': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 3.6, 'roof': 'flat'},
    'M': {'wall': 'metal', 'floor': 'metal', 'wallHeight': 3.4, 'roof': 'tin'},
    'T': {'wall': 'metal', 'floor': 'metal', 'wallHeight': 14, 'roof': 'none'},
    'W': {'wall': 'wood', 'floor': 'wood', 'wallHeight': 3.0, 'roof': 'pitched'},
    'S': {'wall': 'scrap', 'floor': 'wood', 'wallHeight': 2.6, 'roof': 'tin'},
}


def legend_for(rows):
    used = set(''.join(rows))
    return {k: v for k, v in LEGEND.items() if k in used}


def light(x, y, h, c, i, r, f=None):
    d = {'x': x, 'y': y, 'height': h, 'color': f'hex:{c}', 'intensity': i, 'range': r}
    if f: d['flicker'] = f
    return d


WARM, LAMP, FIRE, COLD = '0xffd8a0', '0xffc890', '0xff9a40', '0xe8f0ff'
OUT = {}

# ================================================================ Number Four (the free pit)
W, H = 72, 56
g = grid(W, H, 'd')
border(g)
# the mountain over the camp, and the path through it to the col
fill(g, 1, 1, 70, 21, 'R')
fill(g, 11, 1, 27, 6, 'k')                         # the col: the saddle where the Skirts' path comes over
fill(g, 18, 6, 19, 9, 'k'); fill(g, 18, 8, 27, 9, 'k')    # the path: top leg and the upper ledge
fill(g, 26, 9, 27, 16, 'k'); fill(g, 21, 15, 27, 16, 'k') # the long leg, and the switchback ledge
fill(g, 21, 16, 22, 21, 'k')                       # the bottom leg into the camp
fill(g, 50, 1, 51, 54, 'x')                        # the snowmelt stream down its gully
building(g, 12, 2, 17, 5, 'W', 'w', [(15, 5)])     # the col hut
# the drift's mouth in the rock on the west side
fill(g, 1, 24, 4, 33, 'R')
# the camp
building(g, 30, 25, 37, 31, 'M', 'm', [(33, 31)])  # the cage house over the shaft
fill(g, 32, 22, 35, 24, 'T')                       # the headframe's legs over it
building(g, 40, 23, 48, 30, 'C', 'c', [(44, 30)])  # the winding house
building(g, 10, 34, 20, 41, 'S', 'w', [(15, 34)])  # the smelter
building(g, 23, 35, 28, 41, 'M', 'm', [(25, 35)])  # the store
building(g, 3, 44, 15, 51, 'W', 'w', [(9, 44)])    # the bunkhouse
building(g, 56, 35, 63, 41, 'S', 'w', [(59, 35)])  # the cutter's shack
building(g, 60, 23, 68, 29, 'W', 'w', [(64, 29)])  # the trapper's hut
building(g, 54, 46, 61, 52, 'M', 'm', [(57, 46)])  # the bucket line's top station
fill(g, 36, 44, 46, 50, 'k')                       # spoil heaps
fill(g, 30, 42, 33, 54, 'k')                       # the track down to East Halt
rows = [''.join(r) for r in g]

props = [
    # the lamp board, the yard under the headframe
    {'kind': 'sign', 'x': 34, 'y': 33, 'rot': 0, 'id': 'tm_board'}, {'kind': 'lamp_post', 'x': 30, 'y': 33}, {'kind': 'lamp_post', 'x': 38, 'y': 33},
    {'kind': 'fire_barrel', 'x': 37, 'y': 36}, {'kind': 'barrel_rust', 'x': 29, 'y': 32}, {'kind': 'crate', 'x': 38, 'y': 31},
    # the cage over the shaft
    {'kind': 'machine', 'x': 33, 'y': 27, 'rot': 2, 'id': 'tm_cage'}, {'kind': 'pipe_h', 'x': 31, 'y': 26}, {'kind': 'shelf', 'x': 36, 'y': 26, 'rot': 3},
    # the winding house: the engine, the field set, the boss's locker and cot
    {'kind': 'machine', 'x': 42, 'y': 25, 'rot': 1}, {'kind': 'terminal', 'x': 47, 'y': 24, 'rot': 3, 'id': 'tm_set'}, {'kind': 'locker', 'x': 41, 'y': 28, 'id': 'tm_ragna_locker'},
    {'kind': 'cot', 'x': 47, 'y': 28, 'rot': 3}, {'kind': 'chair', 'x': 46, 'y': 25, 'rot': 1}, {'kind': 'sign', 'x': 43, 'y': 31, 'rot': 0, 'id': 'tm_winding'},
    # the wheel on the stream
    {'kind': 'machine', 'x': 49, 'y': 26, 'rot': 1}, {'kind': 'pipe_h', 'x': 49, 'y': 29},
    # the smelter: the furnace, the moulds, the bars
    {'kind': 'stove', 'x': 12, 'y': 36}, {'kind': 'stove', 'x': 13, 'y': 36}, {'kind': 'tank', 'x': 18, 'y': 36}, {'kind': 'counter', 'x': 14, 'y': 39, 'rot': 0}, {'kind': 'counter', 'x': 15, 'y': 39, 'rot': 0},
    {'kind': 'crate', 'x': 18, 'y': 40}, {'kind': 'crate', 'x': 19, 'y': 40}, {'kind': 'sign', 'x': 17, 'y': 33, 'rot': 0, 'id': 'tm_face_slate'},
    # the store
    {'kind': 'counter', 'x': 26, 'y': 37, 'rot': 0}, {'kind': 'shelf', 'x': 24, 'y': 40, 'rot': 0}, {'kind': 'shelf', 'x': 27, 'y': 40, 'rot': 0}, {'kind': 'barrel', 'x': 24, 'y': 37},
    # the bunkhouse: cots, the bunk to let
    {'kind': 'cot', 'x': 4, 'y': 46, 'rot': 1}, {'kind': 'cot', 'x': 6, 'y': 46, 'rot': 1}, {'kind': 'cot', 'x': 4, 'y': 49, 'rot': 1}, {'kind': 'cot', 'x': 6, 'y': 49, 'rot': 1},
    {'kind': 'cot', 'x': 11, 'y': 46, 'rot': 3}, {'kind': 'stove', 'x': 9, 'y': 50}, {'kind': 'bed', 'x': 13, 'y': 49, 'rot': 3, 'id': 'tm_bunk'}, {'kind': 'locker', 'x': 14, 'y': 50, 'id': 'tm_bunk_locker'},
    {'kind': 'sign', 'x': 10, 'y': 43, 'rot': 0, 'id': 'tm_bunk_sign'},
    # the cutter's shack: the table
    {'kind': 'table', 'x': 59, 'y': 38, 'id': 'tm_tova_table'}, {'kind': 'chair', 'x': 61, 'y': 38, 'rot': 3}, {'kind': 'cot', 'x': 62, 'y': 40, 'rot': 3}, {'kind': 'shelf', 'x': 57, 'y': 36, 'rot': 1},
    # the trapper's hut and her line
    {'kind': 'cot', 'x': 66, 'y': 24, 'rot': 3}, {'kind': 'table', 'x': 62, 'y': 25}, {'kind': 'crate', 'x': 62, 'y': 27}, {'kind': 'sign', 'x': 65, 'y': 31, 'rot': 0, 'id': 'tm_traps'},
    # the bucket line's top station
    {'kind': 'machine', 'x': 57, 'y': 49, 'rot': 2, 'id': 'tm_bucket'}, {'kind': 'crate', 'x': 55, 'y': 51}, {'kind': 'barrel', 'x': 60, 'y': 51}, {'kind': 'sign', 'x': 58, 'y': 45, 'rot': 0, 'id': 'tm_bucket_sign'},
    # the col: the hut, the cairn; the switchback on the path
    {'kind': 'cot', 'x': 13, 'y': 3, 'rot': 1}, {'kind': 'stove', 'x': 16, 'y': 3}, {'kind': 'sign', 'x': 19, 'y': 4, 'rot': 3, 'id': 'tm_col_hut'},
    {'kind': 'sign', 'x': 25, 'y': 2, 'rot': 0, 'id': 'tm_col'}, {'kind': 'rock', 'x': 24, 'y': 4}, {'kind': 'rock_small', 'x': 11, 'y': 6},
    {'kind': 'debris', 'x': 22, 'y': 16, 'id': 'tm_switchback'}, {'kind': 'rock_small', 'x': 27, 'y': 12},
    # the drift's mouth
    {'kind': 'sign', 'x': 5, 'y': 28, 'rot': 1, 'id': 'tm_drift'}, {'kind': 'pipe_h', 'x': 5, 'y': 31},
    # pines and rock round the bowl
    {'kind': 'dead_tree', 'x': 8, 'y': 24}, {'kind': 'dead_tree', 'x': 12, 'y': 27}, {'kind': 'dead_tree', 'x': 66, 'y': 43}, {'kind': 'dead_tree', 'x': 68, 'y': 47},
    {'kind': 'dead_tree', 'x': 3, 'y': 38}, {'kind': 'dead_tree', 'x': 25, 'y': 48}, {'kind': 'dead_tree', 'x': 65, 'y': 53}, {'kind': 'dead_tree', 'x': 18, 'y': 52},
    {'kind': 'rock', 'x': 40, 'y': 47}, {'kind': 'rock', 'x': 44, 'y': 49}, {'kind': 'rock_small', 'x': 9, 'y': 30}, {'kind': 'rock_small', 'x': 14, 'y': 30},
]

spots = {
    'ragna': {'x': 44, 'y': 27}, 'ragna_board': {'x': 33, 'y': 34}, 'ragna_sleep': {'x': 46, 'y': 28},
    'desmond': {'x': 35, 'y': 36}, 'desmond_col': {'x': 20, 'y': 5}, 'desmond_sleep': {'x': 7, 'y': 47},
    'tova': {'x': 59, 'y': 39}, 'tova_sleep': {'x': 61, 'y': 40},
    'gaspard': {'x': 15, 'y': 37}, 'gaspard_store': {'x': 25, 'y': 38}, 'gaspard_sleep': {'x': 12, 'y': 47},
    'sachiko': {'x': 64, 'y': 26}, 'sachiko_line': {'x': 64, 'y': 31}, 'sachiko_sleep': {'x': 65, 'y': 25},
    'chinwe_col': {'x': 14, 'y': 4}, 'ikenna_col': {'x': 15, 'y': 4}, 'chinwe_bunk': {'x': 5, 'y': 47}, 'ikenna_bunk': {'x': 5, 'y': 48},
    'clean_a': {'x': 24, 'y': 15}, 'clean_b': {'x': 26, 'y': 16},
    'board_sit': {'x': 31, 'y': 34}, 'board_pair_a': {'x': 35, 'y': 34}, 'board_pair_b': {'x': 36, 'y': 34},
    'face_work': {'x': 33, 'y': 29}, 'smelter_work': {'x': 16, 'y': 37}, 'spoil_work': {'x': 41, 'y': 45}, 'spoil_work_b': {'x': 45, 'y': 46},
    'stream_work': {'x': 49, 'y': 32}, 'bunk_sit': {'x': 10, 'y': 47}, 'yard_pair_a': {'x': 26, 'y': 44}, 'yard_pair_b': {'x': 27, 'y': 44},
}

FAMILY_WAITING = {'all': [{'flag': 'tm_family_due'}, {'not': {'flag': 'tm_family_in'}}, {'hour': {'from': 20, 'to': 6}}]}
RUNNING = {'not': {'any': [{'flag': 'tm_four', 'eq': 'exposed'}, {'flag': 'tm_four', 'eq': 'ended'}, {'flag': 'tm_four', 'eq': 'fought'}]}}
CLEAN_WAITING = {'all': [FAMILY_WAITING, RUNNING, {'not': {'flag': 'tm_clean_fought'}}]}
FAMILY_IN = {'any': [{'flag': 'tm_family_in', 'eq': 'path'}, {'flag': 'tm_family_in', 'eq': 'adit'}, {'flag': 'tm_family_in', 'eq': 'escorted'}]}
npcs = [
    {'def': 'npc_tm_01', 'x': 44, 'y': 27, 'facing': 2, 'if': {'not': {'flag': 'tm_ragna', 'eq': 'gone'}}},
    {'def': 'npc_tm_02', 'x': 35, 'y': 36, 'facing': 2},
    {'def': 'npc_tm_03', 'x': 59, 'y': 39, 'facing': 0},
    {'def': 'npc_tm_04', 'x': 15, 'y': 37, 'facing': 2},
    {'def': 'npc_tm_05', 'x': 64, 'y': 26, 'facing': 2},
    # the family, waiting in the col hut at night once the Shift's runner has asked for them to be brought down
    {'def': 'npc_tm_06', 'id': 'npc_tm_06_col', 'x': 14, 'y': 4, 'facing': 2, 'schedule': [], 'dialogue': 'd_tm_family', 'if': FAMILY_WAITING},
    {'def': 'npc_tm_07', 'id': 'npc_tm_07_col', 'x': 15, 'y': 4, 'facing': 2, 'schedule': [], 'dialogue': 'd_tm_family', 'if': FAMILY_WAITING},
    # and in the bunkhouse once they are down
    {'def': 'npc_tm_06', 'x': 5, 'y': 47, 'facing': 1, 'schedule': [], 'if': FAMILY_IN},
    {'def': 'npc_tm_07', 'x': 5, 'y': 48, 'facing': 1, 'schedule': [], 'if': {'flag': 'tm_family_in'}},
    # the Clean, at the switchback on the nights the family is due, while the arrangement runs
    {'def': 'npc_tm_g1', 'x': 24, 'y': 15, 'facing': 0, 'schedule': [], 'dialogue': 'd_tm_clean', 'if': CLEAN_WAITING},
    {'def': 'npc_tm_g2', 'x': 26, 'y': 16, 'facing': 3, 'schedule': [], 'dialogue': 'd_tm_clean', 'if': CLEAN_WAITING},
]
spawns = [
    {'id': 'start', 'x': 32, 'y': 34, 'facing': 0}, {'id': 'from_halt_e', 'x': 31, 'y': 54, 'facing': 0}, {'id': 'from_skirts', 'x': 22, 'y': 1, 'facing': 2},
    {'id': 'bucket', 'x': 57, 'y': 48, 'facing': 0}, {'id': 'drift', 'x': 6, 'y': 28, 'facing': 1}, {'id': 'cage', 'x': 33, 'y': 32, 'facing': 2},
    {'id': 'col', 'x': 20, 'y': 4, 'facing': 2}, {'id': 'bunk', 'x': 12, 'y': 49, 'facing': 2},
]
tm_pit = {
    'id': 'tm_pit', 'name': 'Number Four', 'seed': 531, 'settlement': 'number_four',
    'layout': rows, 'legend': legend_for(rows), 'props': props,
    'lights': [
        light(30, 33, 3.4, LAMP, 1.8, 9), light(38, 33, 3.4, LAMP, 1.8, 9), light(37, 36, 0.8, FIRE, 1.4, 6, 0.35), light(33, 23, 12.0, COLD, 0.8, 14),
        light(44, 27, 2.6, WARM, 1.4, 6), light(15, 37, 1.2, '0xff8030', 2.4, 9, 0.25), light(25, 38, 2.6, WARM, 1.2, 6), light(9, 47, 2.4, WARM, 1.2, 7),
        light(59, 38, 2.4, '0xfff0e0', 1.4, 6), light(64, 26, 2.4, WARM, 1.0, 5), light(57, 49, 2.8, LAMP, 1.2, 6), light(15, 3, 2.0, FIRE, 1.0, 5, 0.3),
    ],
    'spawns': spawns,
    'talk': {
        'tm_board': {'dialogue': 'd_tm_board', 'name': 'The lamp board'},
        'tm_cage': {'dialogue': 'd_tm_cage', 'name': 'The cage'},
        'tm_set': {'dialogue': 'd_tm_set', 'name': 'The field set'},
        'tm_winding': {'dialogue': 'd_tm_winding', 'name': 'The winding house'},
        'tm_face_slate': {'dialogue': 'd_tm_face_slate', 'name': 'The face slate'},
        'tm_bunk': {'dialogue': 'd_tm_bunk', 'name': 'The bunk'},
        'tm_bunk_sign': {'dialogue': 'd_tm_bunk', 'name': 'Bunks'},
        'tm_tova_table': {'dialogue': 'd_tm_table', 'name': 'The cutter\'s table'},
        'tm_traps': {'dialogue': 'd_tm_traps', 'name': 'The trap lines'},
        'tm_bucket': {'dialogue': 'd_tm_bucket', 'name': 'The bucket line'},
        'tm_bucket_sign': {'dialogue': 'd_tm_bucket', 'name': 'The bucket line'},
        'tm_col_hut': {'dialogue': 'd_tm_col_hut', 'name': 'The col hut'},
        'tm_col': {'dialogue': 'd_tm_col', 'name': 'The col'},
        'tm_switchback': {'dialogue': 'd_tm_switchback', 'name': 'The switchback'},
        'tm_drift': {'dialogue': 'd_tm_drift', 'name': 'The old drift'},
    },
    'containers': {
        'tm_ragna_locker': {'name': 'Winchwoman\'s Locker', 'items': [['k_tm_requests', 1], ['c_bitters', 1]], 'tolls': 40, 'lock': 40},
        'tm_bunk_locker': {'name': 'Bunk Locker', 'items': [], 'yoursIf': {'flag': 'tm_bunk_rented'}},
    },
    'spots': spots, 'npcs': npcs,
    'triggers': [
        {'id': 'arrive', 'x': 22, 'y': 32, 'w': 26, 'h': 22, 'text': 'Number Four: a headframe of old black steel over a bowl of rock and pine on the Teeth\'s south face, a wheel turning in a snowmelt stream, a smelter\'s smoke going straight up in the cold, and sixty people\'s washing. Nobody here wears the Concern\'s grey. Somebody has painted on the cage house, in letters a yard high, NO PAPER PAST THIS POINT.', 'effects': [{'learn': 'seen_four'}, {'learn': 'loc_mine_teeth'}, {'set': 'tm_open'}]},
        {'id': 'south', 'x': 30, 'y': 46, 'w': 4, 'h': 8, 'text': 'The track comes up from the Line\'s cutting in long loops through the pines, and over your head the bucket line\'s cable runs the same way in a straight line, singing a little in the wind.', 'effects': [{'learn': 'seen_four'}, {'learn': 'loc_mine_teeth'}, {'set': 'tm_open'}]},
        {'id': 'col', 'x': 11, 'y': 1, 'w': 17, 'h': 6, 'text': 'The col: a saddle of rubble and old snow between two shoulders of the Teeth, and a hut of split logs with its door to the south. North, below you, the Skirts lie down the far slope in their smoke, and over them the rim of Halcyon\'s caldera with its gardens glowing. South, the path drops through the rock to Number Four\'s lamps.', 'effects': [{'learn': 'tm_col_seen'}, {'learn': 'loc_mine_teeth'}]},
        {'id': 'switchback', 'x': 21, 'y': 15, 'w': 7, 'h': 2, 'if': CLEAN_WAITING, 'text': 'Two shapes on the switchback ledge where the path turns back on itself, in grey under white snow-capes, with carbines across their chests and no lamp. They are not hiding. They are waiting, the way men wait who have been told the hour.', 'effects': [{'learn': 'tm_clean_seen'}, {'lead': 'l_tm_waiting'}]},
    ],
    'extras': [
        {'count': 5, 'roles': ['labourer', 'settler'], 'life': 'hard', 'ages': [14, 60], 'area': {'x': 22, 'y': 32, 'w': 26, 'h': 18}, 'spots': ['face_work', 'spoil_work', 'spoil_work_b', 'stream_work', 'yard_pair_a', 'yard_pair_b'], 'hours': {'from': 6, 'to': 20},
         'barks': ['No paper past the cage.', 'Tin\'s tin. Nobody up the hill gets a say in it.', 'Snow on the col. Anybody coming over will be cold.', 'Mind the spoil. It moves.', 'Six cuts a day out of the pillars. Old men\'s pillars. They left us plenty.']},
        {'count': 3, 'roles': ['settler', 'labourer', 'street'], 'life': 'hard', 'ages': [6, 70], 'area': {'x': 3, 'y': 42, 'w': 26, 'h': 10}, 'spots': ['bunk_sit', 'board_sit', 'board_pair_a', 'board_pair_b'],
         'barks': ['Three this year. Three. Count them on the board.', 'She counts the tags every night. Every single one.', 'The cutter took my arm out. I can\'t lift much. I can lift my own kid.']},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0xc4ccd6', 'fogDensity': 0.008, 'dust': 0.05, 'grade': 0.25, 'mood': 'peaceful', 'sound': 'wind'},
    'hunting': 0.7,
}
check('tm_pit', rows, tm_pit['legend'], props, spawns, npcs, spots, 'start')
OUT['tm_pit'] = tm_pit

# ================================================================ the old level (a cell under the pit)
W, H = 48, 30
g = grid(W, H, 'R')
fill(g, 1, 6, 46, 8, 'k')                          # the drive, west mouth to east adit
fill(g, 14, 2, 19, 5, 'c')                         # the cage bottom
fill(g, 11, 9, 30, 20, 'k')                        # the pillar rooms
for px in (13, 18, 23, 28):
    for py in (11, 15, 19):
        if py + 1 <= 20: fill(g, px, py, px + 1, min(py + 1, 20), 'R')
fill(g, 31, 13, 38, 22, 'k')                       # the stope where the digger stopped
fill(g, 19, 21, 34, 27, 'x'); fill(g, 23, 24, 30, 27, 'X')   # the sump, half pumped, and the deep of it
rows = [''.join(r) for r in g]
props = [
    {'kind': 'machine', 'x': 16, 'y': 3, 'rot': 2, 'id': 'tm_lv_cage'}, {'kind': 'lamp_post', 'x': 18, 'y': 3},
    {'kind': 'sign', 'x': 2, 'y': 7, 'rot': 1, 'id': 'tm_lv_mouth'}, {'kind': 'sign', 'x': 45, 'y': 7, 'rot': 3, 'id': 'tm_lv_adit'},
    {'kind': 'machine', 'x': 35, 'y': 18, 'rot': 3, 'id': 'tm_digger'}, {'kind': 'sign', 'x': 32, 'y': 14, 'rot': 1, 'id': 'tm_lv_plate'},
    {'kind': 'pump', 'x': 20, 'y': 21}, {'kind': 'pipe_h', 'x': 21, 'y': 20}, {'kind': 'sign', 'x': 22, 'y': 21, 'rot': 0, 'id': 'tm_lv_pumps'},
    {'kind': 'debris', 'x': 26, 'y': 12, 'id': 'tm_lv_pillars'}, {'kind': 'crate', 'x': 12, 'y': 10}, {'kind': 'barrel_rust', 'x': 30, 'y': 9},
    {'kind': 'debris', 'x': 9, 'y': 7}, {'kind': 'rock_small', 'x': 40, 'y': 6}, {'kind': 'debris', 'x': 37, 'y': 21},
]
spots = {'cage': {'x': 17, 'y': 4}, 'mouth': {'x': 3, 'y': 7}, 'adit': {'x': 44, 'y': 7}, 'digger': {'x': 34, 'y': 18}, 'pumps': {'x': 21, 'y': 22}}
spawns = [{'id': 'start', 'x': 17, 'y': 4, 'facing': 2}, {'id': 'cage', 'x': 17, 'y': 4, 'facing': 2}, {'id': 'mouth', 'x': 3, 'y': 7, 'facing': 1}, {'id': 'adit', 'x': 44, 'y': 7, 'facing': 3}]
tm_level = {
    'id': 'tm_level', 'name': 'Four\'s Old Level', 'seed': 532,
    'layout': rows, 'legend': legend_for(rows), 'props': props,
    'lights': [light(17, 3, 2.4, LAMP, 1.4, 6), light(21, 21, 1.6, LAMP, 0.9, 5, 0.1), light(35, 17, 1.0, '0x80ff90', 0.5, 4, 0.5)],
    'spawns': spawns,
    'talk': {
        'tm_lv_cage': {'dialogue': 'd_tm_lv_cage', 'name': 'The cage'},
        'tm_lv_mouth': {'dialogue': 'd_tm_lv_mouth', 'name': 'Daylight'},
        'tm_lv_adit': {'dialogue': 'd_tm_lv_adit', 'name': 'The adit'},
        'tm_digger': {'dialogue': 'd_tm_digger', 'name': 'The digger'},
        'tm_lv_plate': {'dialogue': 'd_tm_lv_plate', 'name': 'A plate on the wall'},
        'tm_lv_pumps': {'dialogue': 'd_tm_lv_pumps', 'name': 'The pumps'},
        'tm_lv_pillars': {'dialogue': 'd_tm_lv_pillars', 'name': 'The pillars'},
    },
    'spots': spots, 'npcs': [],
    'triggers': [
        {'id': 'down', 'x': 14, 'y': 2, 'w': 6, 'h': 4, 'text': 'The old level: a drive cut through grey rock ninety years ago, with the rails still in its floor and the water a hand deep along one wall. Somebody has chalked arrows on the props, one way to the cage, one way to daylight, one way UP — THE COL — LONG. It is very quiet, and then, a long way off, it is not: a slow, patient sound, like a very large animal turning over in its sleep.', 'effects': [{'learn': 'tm_level_seen'}]},
        {'id': 'stope', 'x': 31, 'y': 13, 'w': 8, 'h': 10, 'if': {'not': {'flag': 'tm_digger'}}, 'text': 'In the stope, half out of the black water, a machine the size of a cart lies against the face with its cutting head raised: armoured, segmented, with the closed eye on its housing under the rust. A lamp on its flank, green, blinks once. Then again. The sound you heard was it, shifting its weight.', 'effects': [{'learn': 'tm_digger_seen'}, {'lead': 'l_tm_digger'}, {'quest': 'q_tm_digger', 'start': True}]},
    ],
    'ambience': {'indoor': True, 'fogColor': 'hex:0x14161a', 'fogDensity': 0.05, 'dust': 0.2, 'ambient': {'color': 'hex:0x303844', 'intensity': 0.25}, 'grade': 0.4, 'mood': 'grim', 'sound': 'drip'},
    'interior': True,
}
check('tm_level', rows, tm_level['legend'], props, spawns, [], spots, 'start')
OUT['tm_level'] = tm_level

# ================================================================ the mountain trail (roadside)
W, H = 40, 26
g = grid(W, H, 'R')
fill(g, 0, 7, W - 1, 18, 'd')
fill(g, 0, 10, W - 1, 13, 'k')
for x in range(3, W - 1, 6):
    g[6][x] = 'K'; g[19][x + 2] = 'K'
rows = [''.join(r) for r in g]
props = [
    {'kind': 'dead_tree', 'x': 4, 'y': 8}, {'kind': 'dead_tree', 'x': 11, 'y': 16}, {'kind': 'dead_tree', 'x': 30, 'y': 8}, {'kind': 'dead_tree', 'x': 34, 'y': 17},
    {'kind': 'rock', 'x': 18, 'y': 8}, {'kind': 'rock_small', 'x': 26, 'y': 15}, {'kind': 'campfire', 'x': 21, 'y': 16}, {'kind': 'debris', 'x': 16, 'y': 12},
]
spots = {'here': {'x': 6, 'y': 11}, 'ahead': {'x': 13, 'y': 11}, 'ahead2': {'x': 14, 'y': 12}, 'side': {'x': 15, 'y': 15}, 'side2': {'x': 20, 'y': 17}, 'fire': {'x': 22, 'y': 15}, 'far': {'x': 24, 'y': 11}}
spawns = [{'id': 'here', 'x': 6, 'y': 11, 'facing': 1}, {'id': 'start', 'x': 6, 'y': 11, 'facing': 1}]
tm_trail = {
    'id': 'tm_trail', 'name': 'Teeth Trail', 'seed': 533,
    'layout': rows, 'legend': legend_for(rows), 'props': props,
    'lights': [light(21, 16, 0.6, FIRE, 1.6, 5, 0.35)],
    'spawns': spawns,
    'exits': [
        {'x': 0, 'y': 10, 'w': 1, 'h': 4, 'to': {'worldMap': True}, 'label': 'On along the trail'},
        {'x': W - 1, 'y': 10, 'w': 1, 'h': 4, 'to': {'worldMap': True}, 'label': 'On along the trail'},
    ],
    'spots': spots, 'npcs': [], 'triggers': [],
    'ambience': {'indoor': False, 'fogColor': 'hex:0xc8d0da', 'fogDensity': 0.015, 'dust': 0.04, 'grade': 0.25, 'mood': 'peaceful', 'sound': 'wind'},
    'hunting': 0.7,
}
check('tm_trail', rows, tm_trail['legend'], props, spawns, [], spots, 'start')
OUT['tm_trail'] = tm_trail

HEADER = "import type { MapDef } from '../../engine/data/types';\n\n// Generated by tools/maps/gen_tm_teeth.py — edit the generator, then re-run it.\n"
for mid, m in OUT.items():
    with open(os.path.join(ROOT, 'src', 'content', 'maps', f"{mid}.ts"), 'w') as f:
        f.write(f"{HEADER}export const {mid}: MapDef = {ts(m)};\n")
    print(mid, len(m['layout'][0]), 'x', len(m['layout']))
