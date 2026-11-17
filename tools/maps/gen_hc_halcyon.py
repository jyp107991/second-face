#!/usr/bin/env python3
"""Generates the arcology on the caldera's rim above the Skirts (B4b): src/content/maps/hc_terrace.ts, hc_clinic.ts,
hc_board.ts and hc_works.ts.

hc_terrace (open, at the Teeth's `halcyon` location): along the south, the funicular's top station (the car's platform, its
track coming up out of the rock, the freight dock, the brakeman's cabin) and the gate: a screen of white steel across the
whole rim with one lens arch in it and a reception desk on the station side. West, outside the screen, the service yard
where the road up from Footgate comes in past the Clean's post: sheds, carts, compost, and the mouth of the gardeners'
tunnel, which runs under the screen into the gardens. Inside: the concourse, the registry and the gate's fitting room; the
gardens under glass (orchard rows, the paths, the rain pipes, a single orange tree in a pot with a bench, the keeper's
lodge, the seed vault, the gardeners' sheds where the tunnel comes up); east, the citizens' terraces (the refectory, two
rows of flats) and the lift lobby that goes down to the Clinic floors, up to the Board's floor and into the works.

hc_clinic (cell): floor nine of the Clinic floors: the lift lobby, the recovery wards, Dr Qadir's office, the fitting suite,
the cold store, and behind a ward door the service ward and a listening room.
hc_board (cell): the Board's floor: the lift lobby, the gallery of portraits, Director Soto's office, the boardroom, the
hall where the season's ball is held, and the Chair's own room behind it.
hc_works (cell): the chip line's viewing gallery over the clean room, and behind a door the grid core: the aisles, the
keeper's chair and the trunk.

Rooms entered through a door that is a talk prop (the ward, the Chair's room, the core, the gate, the tunnel) are reached by
the game's own `goto`, so each map is checked for reachability from every spawn it has.
    python3 tools/maps/gen_hc_halcyon.py
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
         'counter', 'planter', 'machine', 'cot', 'tent', 'fence_post', 'pump', 'wagon', 'horse', 'hound_dormant'}


def check(name, rows, legend, props, spawns, npcs, spots):
    """Fail loudly on anything the validator would reject, and on anything nobody can walk to from some spawn."""
    H, W = len(rows), len(rows[0])
    for r in rows:
        if len(r) != W:
            print(name, 'FAILED: ragged layout'); sys.exit(1)
    solid = {(p['x'], p['y']) for p in props if p['kind'] in SOLID}
    errs = []
    wall = lambda x, y: 'wall' in legend[rows[y][x]] or legend[rows[y][x]].get('blocks')
    for p in props:
        if wall(p['x'], p['y']):
            errs.append(f"prop {p['kind']} {p.get('id', '')} at {p['x']},{p['y']} is inside a wall")
    free = lambda x, y: 0 <= x < W and 0 <= y < H and not wall(x, y) and (x, y) not in solid
    seen = set()
    for s in spawns:
        if not free(s['x'], s['y']):
            continue
        q = deque([(s['x'], s['y'])])
        seen.add((s['x'], s['y']))
        while q:
            x, y = q.popleft()
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                n = (x + dx, y + dy)
                if n not in seen and free(*n):
                    seen.add(n)
                    q.append(n)
    for s in spawns:
        if not free(s['x'], s['y']): errs.append(f"spawn {s['id']} at {s['x']},{s['y']} not free")
    for n in npcs:
        if not free(n['x'], n['y']): errs.append(f"npc {n.get('id', n['def'])} at {n['x']},{n['y']} not free")
        elif (n['x'], n['y']) not in seen: errs.append(f"npc {n.get('id', n['def'])} unreachable")
    for k, v in spots.items():
        if not free(v['x'], v['y']): errs.append(f"spot {k} at {v['x']},{v['y']} not free")
        elif (v['x'], v['y']) not in seen: errs.append(f"spot {k} unreachable")
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


def lamp(x, y, h=3.4, c='0xf4f8ff', i=2.0, r=10, f=None):
    d = {'x': x, 'y': y, 'height': h, 'color': f'hex:{c}', 'intensity': i, 'range': r}
    if f: d['flicker'] = f
    return d


def P(kind, x, y, rot=None, id=None):
    d = {'kind': kind, 'x': x, 'y': y}
    if rot is not None: d['rot'] = rot
    if id: d['id'] = id
    return d


HEADER = "import type { MapDef } from '../../engine/data/types';\n\n// Generated by tools/maps/gen_hc_halcyon.py — edit the generator, then re-run it.\n"
OUT = []

# Who comes and goes (story/STORY_PLAN_SECRET.md, Build notes — B4b): placements read the flags the lines set.
KES = 'npc_hs_01'
ON_WARD_DAWIT = {'all': [{'not': {'flag': 'hs_parts', 'eq': 'exposed'}}, {'not': {'flag': 'hc_dawit'}}]}
ON_WARD_NILS = {'all': [{'flag': 'hs_nils', 'eq': 'up'}, {'not': {'flag': 'hc_nils'}}]}
ON_WARD_DYSART = {'all': [{'flag': 'hs_dysart_gone'}, {'not': {'flag': 'hc_dysart'}}]}
WIRED_IMMY = {'all': [{'flag': 'bw_static', 'eq': 'concern'}, {'not': {'flag': 'hc_immy'}}]}
UP_LISLE = {'flag': 'hs_lisle_gone'}
CHAIR_SITS = {'not': {'any': [{'flag': 'hc_chair', 'eq': 'retired'}, {'flag': 'hc_chair', 'eq': 'dead'}]}}
CLEAN_HILL = {'team': 'concern'}

# ================================================================ hc_terrace
W, H = 72, 56
g = grid(W, H, 't')
# the rim: the arcology's outer wall all round
fill(g, 0, 0, W - 1, 0, 'R'); fill(g, 0, H - 1, W - 1, H - 1, 'R'); fill(g, 0, 0, 0, H - 1, 'R'); fill(g, W - 1, 0, W - 1, H - 1, 'R')
g[40][0] = 'c'                                   # the road comes in through the rim on the west
# outside: the service yard (west) and the top station (south)
fill(g, 1, 30, 21, 54, 'c'); fill(g, 22, 44, 70, 54, 'c')
fill(g, 1, 38, 4, 42, 'a')                       # the road's last bend, asphalt
fill(g, 2, 46, 8, 53, 'd')                       # compost and the barrow park
fill(g, 33, 49, 36, 54, 'g')                     # the car's track coming up out of the rock
fill(g, 29, 45, 40, 48, 'm')                     # the car's platform
building(g, 43, 49, 50, 54, 'C', 'w', [(46, 49)])          # the brakeman's cabin
fill(g, 52, 46, 69, 53, 'c')                     # the freight dock
# the gate: a screen of white steel across the rim, one lens arch in it
fill(g, 1, 29, 21, 29, 'G'); fill(g, 22, 29, 22, 43, 'G'); fill(g, 22, 43, 70, 43, 'G')
g[43][37] = 't'                                  # the arch (a solid prop stands in it)
# inside: the concourse, the registry, the fitting room
fill(g, 23, 34, 52, 42, 't')
building(g, 53, 34, 61, 42, 'C', 't', [(53, 38)])          # the registry
building(g, 61, 34, 70, 42, 'C', 't', [(61, 38)])          # the gate's fitting room (shares the registry's east wall)
g[38][61] = 't'
# the gardens under glass: beds of real dirt between tiled paths
fill(g, 1, 1, 52, 33, 'd'); fill(g, 1, 1, 21, 28, 'd')
for y in (11, 21, 31):
    fill(g, 1, y, 52, y, 't')
for x in (11, 26, 40, 52):
    fill(g, x, 1, x, 33, 't')
fill(g, 1, 29, 21, 29, 'G')                      # the screen again, over the beds' fill
for y in range(30, 34):                          # (the yard keeps its own floor)
    for x in range(1, 22):
        g[y][x] = 'c'
fill(g, 22, 29, 22, 43, 'G')
fill(g, 23, 32, 52, 33, 't')                     # the walk along the screen to the concourse
building(g, 2, 2, 9, 8, 'L', 'w', [(6, 8)])                # the keeper's lodge
building(g, 13, 2, 19, 7, 'V', 'c', [(16, 7)])             # the seed vault
building(g, 2, 22, 9, 28, 'L', 'w', [(9, 25)])             # the gardeners' sheds (the tunnel comes up here)
building(g, 10, 32, 17, 37, 'C', 'c', [(13, 37)])          # the yard's sheds
# the citizens' terraces
fill(g, 53, 1, 70, 33, 't')
building(g, 54, 2, 69, 11, 'C', 't', [(61, 11)])           # the refectory
building(g, 54, 14, 61, 20, 'C', 'w', [(57, 20)])          # flats, row one
building(g, 63, 14, 69, 20, 'C', 'w', [(66, 20)])          # flats, row two
fill(g, 54, 24, 69, 31, 'c')                      # the lift lobby
rows = [''.join(r) for r in g]

props = [
    # the station: the car, the board, benches, the freight dock's crates, the cabin
    P('machine', 34, 50, 0, 'hc_car'), P('sign', 30, 45, 2, 'hc_carboard'), P('chair', 31, 47, 1), P('chair', 31, 48, 1), P('lamp_post', 28, 45), P('lamp_post', 41, 45),
    P('crate', 53, 47), P('crate', 54, 47), P('crate', 53, 48), P('crate', 60, 50), P('crate', 61, 50), P('machine', 66, 48, 2), P('sign', 56, 46, 0, 'hc_freightdock'),
    P('table', 45, 51), P('chair', 46, 51, 3), P('cot', 48, 52, 1), P('stove', 49, 50), P('lamp_post', 51, 45),
    # the gate: the arch, the reception desk on the station side
    P('machine', 37, 43, 0, 'hc_gate'), P('counter', 39, 44, 0), P('counter', 40, 44, 0), P('counter', 41, 44, 0), P('planter', 33, 44), P('planter', 43, 44),
    P('sign', 26, 44, 0, 'hc_screen'),
    # the yard: the Clean's post on the road, sheds, carts, compost, the tunnel mouth
    P('sign', 3, 37, 1, 'hc_roadpost'), P('fence_post', 5, 36), P('fence_post', 5, 44), P('lamp_post', 6, 38), P('lamp_post', 6, 43),
    P('vault_door', 14, 30, 0, 'hc_tunnel'), P('sign', 17, 31, 0, 'hc_gardeners'), P('crate', 11, 33), P('crate', 16, 33), P('barrel', 11, 36), P('table', 15, 35),
    P('wagon', 9, 45, 1), P('barrel', 3, 47), P('planter', 5, 50), P('planter', 7, 52), P('debris', 4, 53), P('lamp_post', 19, 39),
    # the concourse: benches, planters, the ball's card on its easel
    P('planter', 25, 36), P('planter', 49, 36), P('chair', 28, 40, 0), P('chair', 46, 40, 0), P('sign', 37, 35, 0, 'hc_ballcard'), P('lamp_post', 30, 34), P('lamp_post', 44, 34),
    # the registry and the fitting room
    P('counter', 56, 36, 1), P('counter', 56, 37, 1), P('terminal', 59, 36, 3, 'hc_registry'), P('shelf', 60, 40, 3), P('chair', 55, 40, 0),
    P('bed', 67, 36, 1), P('terminal', 69, 38, 3), P('shelf', 68, 41, 2), P('chair', 64, 40, 0), P('machine', 65, 35, 2),
    # the gardens: the keeper's lodge, the seed vault, the sheds, rows of fruit trees in tubs, the rain pipes, the orange tree
    P('cot', 3, 3, 1), P('table', 7, 4), P('shelf', 3, 6, 1), P('stove', 8, 6),
    P('locker', 16, 4, None, 'hc_seedvault'), P('shelf', 14, 3, 1), P('shelf', 18, 3, 3), P('crate', 14, 5),
    P('vault_door', 3, 23, 0, 'hc_tunnel_in'), P('crate', 7, 23), P('barrel', 8, 27), P('table', 5, 27), P('shelf', 3, 26, 1),
    P('planter', 30, 16, None, 'hc_orange'), P('chair', 31, 17, 3), P('sign', 33, 15, 0, 'hc_bench'),
    P('pipe_h', 20, 1), P('pipe_h', 34, 1), P('pipe_h', 46, 1), P('lamp_post', 26, 11), P('lamp_post', 40, 21), P('lamp_post', 11, 21), P('lamp_post', 52, 11),
]
# orchard rows, in tubs, between the paths
for x in list(range(13, 26, 3)) + list(range(28, 40, 3)) + list(range(42, 52, 3)):
    for y in (3, 6, 9, 13, 18, 23, 26, 29):
        if (x, y) in {(30, 16), (31, 17), (29, 17), (33, 15)}: continue
        if 13 <= x <= 19 and y <= 9: continue          # the seed vault
        if y == 29 and x <= 22: continue               # the screen's line
        props.append(P('planter', x, y))
for x in (3, 6, 9):
    for y in (13, 16, 19):
        props.append(P('planter', x, y))
# the refectory, the flats, the lift lobby
props += [
    P('counter', 56, 4, 0), P('counter', 57, 4, 0), P('counter', 58, 4, 0), P('shelf', 55, 3, 2),
    P('table', 60, 6), P('chair', 61, 6, 3), P('table', 64, 6), P('chair', 65, 6, 3), P('table', 60, 9), P('chair', 59, 9, 1), P('table', 66, 9), P('chair', 67, 9, 3), P('planter', 68, 3),
    P('bed', 55, 15, 1), P('table', 59, 16), P('shelf', 60, 18, 3), P('bed', 68, 15, 3), P('table', 64, 16), P('planter', 65, 18),
    P('terminal', 62, 25, 2, 'hc_lift'), P('planter', 55, 25), P('planter', 69, 25), P('chair', 57, 30, 0), P('chair', 66, 30, 0), P('sign', 58, 24, 2, 'hc_floors'),
]

spots = {
    # the station and the yard
    'aubert': {'x': 40, 'y': 46}, 'mazur': {'x': 42, 'y': 47}, 'mazur_cabin': {'x': 46, 'y': 52}, 'car_wait': {'x': 32, 'y': 46}, 'dock_work': {'x': 57, 'y': 49}, 'dock_work_b': {'x': 63, 'y': 51},
    'roadpost_a': {'x': 7, 'y': 39}, 'roadpost_b': {'x': 7, 'y': 41}, 'yard_work': {'x': 13, 'y': 40}, 'yard_sit': {'x': 15, 'y': 36}, 'yard_pair_a': {'x': 18, 'y': 44}, 'yard_pair_b': {'x': 19, 'y': 44},
    'tunnel_queue': {'x': 15, 'y': 31}, 'tunnel_queue_b': {'x': 18, 'y': 31},
    # the concourse, the registry, the fitting room
    'gate_in_a': {'x': 35, 'y': 42}, 'gate_in_b': {'x': 39, 'y': 42}, 'kask': {'x': 30, 'y': 38}, 'linh': {'x': 34, 'y': 36}, 'concourse_sit': {'x': 28, 'y': 39}, 'concourse_pair_a': {'x': 42, 'y': 38}, 'concourse_pair_b': {'x': 43, 'y': 38},
    'registry': {'x': 58, 'y': 38}, 'arata': {'x': 66, 'y': 38},
    # the gardens
    'yaw': {'x': 29, 'y': 17}, 'yaw_lodge': {'x': 5, 'y': 5}, 'garden_work': {'x': 24, 'y': 14}, 'garden_work_b': {'x': 44, 'y': 24}, 'garden_work_c': {'x': 18, 'y': 27},
    'garden_sit': {'x': 32, 'y': 17}, 'garden_pair_a': {'x': 36, 'y': 21}, 'garden_pair_b': {'x': 37, 'y': 21}, 'garden_lean': {'x': 52, 'y': 20}, 'patrol_garden': {'x': 26, 'y': 28},
    'sheds': {'x': 5, 'y': 25},
    # the terraces
    'ono': {'x': 61, 'y': 7}, 'gallo': {'x': 63, 'y': 9}, 'voight': {'x': 65, 'y': 7}, 'latch': {'x': 59, 'y': 7}, 'refectory_sit': {'x': 62, 'y': 9}, 'refectory_pair_a': {'x': 58, 'y': 8}, 'refectory_pair_b': {'x': 58, 'y': 9},
    'lift_guard': {'x': 62, 'y': 27}, 'lobby_sit': {'x': 58, 'y': 30}, 'lobby_pair_a': {'x': 64, 'y': 28}, 'lobby_pair_b': {'x': 65, 'y': 28}, 'flats_a': {'x': 57, 'y': 17}, 'flats_b': {'x': 66, 'y': 17},
}

npcs = [
    {'def': 'npc_hc_07', 'x': 29, 'y': 17, 'facing': 1},
    {'def': 'npc_hc_08', 'x': 40, 'y': 46, 'facing': 2},
    {'def': 'npc_hc_09', 'x': 66, 'y': 38, 'facing': 3},
    {'def': 'npc_hc_10', 'x': 30, 'y': 38, 'facing': 2},
    {'def': 'npc_hc_11', 'x': 61, 'y': 7, 'facing': 2},
    {'def': 'npc_hc_13', 'x': 42, 'y': 47, 'facing': 3, 'if': {'not': {'flag': 'hc_mazur_gone'}}},
    {'def': 'npc_hc_14', 'x': 34, 'y': 36, 'facing': 2, 'if': {'not': {'flag': 'hc_funicular'}}},
    {'def': 'npc_hc_14', 'id': 'npc_hc_14_stayed', 'x': 32, 'y': 17, 'facing': 3, 'schedule': [], 'if': {'flag': 'hc_funicular', 'eq': 'stayed'}},
    {'def': 'npc_hc_15', 'x': 65, 'y': 7, 'facing': 2},
    {'def': 'npc_hc_19', 'x': 63, 'y': 9, 'facing': 3},
    {'def': 'npc_st_09', 'id': 'npc_st_09_hc', 'x': 59, 'y': 7, 'facing': 1, 'dialogue': 'd_hc_latch', 'schedule': [], 'if': {'knows': 'latch_heard'}},
    # the Clean on the hill: two inside the arch, two at the road's post, one in the gardens, one at the lifts
    {'def': 'npc_hc_g1', 'x': 35, 'y': 42, 'facing': 2},
    {'def': 'npc_hc_g2', 'x': 39, 'y': 42, 'facing': 2},
    {'def': 'npc_hc_g3', 'x': 7, 'y': 39, 'facing': 3},
    {'def': 'npc_hc_g4', 'x': 7, 'y': 41, 'facing': 3, 'if': {'flag': 'hs_gate_shut'}},
    {'def': 'npc_hc_g5', 'x': 26, 'y': 28, 'facing': 0},
    {'def': 'npc_hc_g6', 'x': 62, 'y': 27, 'facing': 2},
]

spawns = [
    {'id': 'start', 'x': 2, 'y': 40, 'facing': 1}, {'id': 'from_skirts', 'x': 2, 'y': 40, 'facing': 1}, {'id': 'road', 'x': 2, 'y': 40, 'facing': 1},
    {'id': 'car', 'x': 35, 'y': 47, 'facing': 0}, {'id': 'concourse', 'x': 37, 'y': 41, 'facing': 0}, {'id': 'tunnel', 'x': 5, 'y': 25, 'facing': 1},
    {'id': 'yard', 'x': 15, 'y': 31, 'facing': 2}, {'id': 'lift', 'x': 62, 'y': 29, 'facing': 0},
]

hc_terrace = {
    'id': 'hc_terrace', 'name': 'Halcyon — Top Station', 'seed': 421, 'settlement': 'halcyon',
    'layout': rows,
    'legend': {
        't': {'floor': 'tile'}, 'd': {'floor': 'dirt'}, 'c': {'floor': 'concrete'}, 'a': {'floor': 'asphalt'}, 'm': {'floor': 'metal'}, 'g': {'floor': 'grate'}, 'w': {'floor': 'wood'},
        'R': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 8},
        'G': {'wall': 'metal', 'floor': 'tile', 'wallHeight': 4.5},
        'C': {'wall': 'concrete', 'floor': 'tile', 'wallHeight': 3.6, 'roof': 'flat'},
        'L': {'wall': 'wood', 'floor': 'wood', 'wallHeight': 3.0, 'roof': 'pitched'},
        'V': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 3.0, 'roof': 'flat'},
    },
    'props': props,
    'lights': [
        lamp(35, 47, 4.0, '0xf4f8ff', 2.4, 12), lamp(40, 45, 3.2, '0xffffff', 2.0, 8), lamp(46, 51, 2.4, '0xffd8a0', 1.6, 6, 0.1), lamp(60, 50, 3.6, '0xe8f0ff', 2.0, 10),
        lamp(6, 40, 3.6, '0xf0f6ff', 2.2, 10), lamp(14, 34, 3.0, '0xffe0b0', 1.6, 7), lamp(14, 30, 2.4, '0xd8f0e0', 1.4, 6),
        lamp(37, 38, 4.0, '0xffffff', 2.4, 14), lamp(57, 38, 3.0, '0xf4f8ff', 1.8, 8), lamp(66, 38, 3.0, '0xf0fbff', 2.2, 8),
        lamp(16, 16, 6.0, '0xe8fff0', 2.6, 18), lamp(34, 8, 6.0, '0xe8fff0', 2.6, 18), lamp(34, 25, 6.0, '0xe8fff0', 2.6, 18), lamp(48, 16, 6.0, '0xe8fff0', 2.4, 16),
        lamp(30, 16, 2.4, '0xfff0c8', 1.6, 6), lamp(6, 5, 2.4, '0xffd8a0', 1.4, 5, 0.1), lamp(16, 5, 2.6, '0xe0f0ff', 1.4, 5),
        lamp(61, 7, 3.0, '0xfff4e0', 2.2, 10), lamp(58, 17, 2.6, '0xfff0d8', 1.4, 6), lamp(66, 17, 2.6, '0xfff0d8', 1.4, 6), lamp(62, 28, 3.4, '0xf4f8ff', 2.2, 10),
    ],
    'spawns': spawns,
    'talk': {
        'hc_car': {'dialogue': 'd_hc_car', 'name': 'The car'},
        'hc_carboard': {'dialogue': 'd_hc_carboard', 'name': 'The car\'s board'},
        'hc_freightdock': {'dialogue': 'd_hc_freightdock', 'name': 'The freight dock'},
        'hc_gate': {'dialogue': 'd_hc_gate', 'name': 'The arch'},
        'hc_screen': {'dialogue': 'd_hc_screen', 'name': 'The screen'},
        'hc_roadpost': {'dialogue': 'd_hc_roadpost', 'name': 'The Clean\'s post'},
        'hc_tunnel': {'dialogue': 'd_hc_tunnel', 'name': 'The gardeners\' tunnel'},
        'hc_gardeners': {'dialogue': 'd_hc_gardeners', 'name': 'The gardeners\' line'},
        'hc_tunnel_in': {'dialogue': 'd_hc_tunnel_in', 'name': 'The tunnel hatch'},
        'hc_ballcard': {'dialogue': 'd_hc_ballcard', 'name': 'The card on the easel'},
        'hc_registry': {'dialogue': 'd_hc_registry', 'name': 'The registry'},
        'hc_seedvault': {'dialogue': 'd_hc_seedvault', 'name': 'The seed vault'},
        'hc_orange': {'dialogue': 'd_hc_orange', 'name': 'The orange tree'},
        'hc_bench': {'dialogue': 'd_hc_bench', 'name': 'The bench'},
        'hc_lift': {'dialogue': 'd_hc_lift', 'name': 'The lifts'},
        'hc_floors': {'dialogue': 'd_hc_floors', 'name': 'The floor board'},
    },
    'containers': {
        'hc_seedvault': {'name': 'Seed Vault', 'items': [['k_hc_seedcase', 1]], 'lock': 50},
    },
    'spots': spots,
    'npcs': npcs,
    'triggers': [
        {'id': 'station', 'x': 24, 'y': 44, 'w': 27, 'h': 10, 'text': 'The top station: the car stops against a buffer of white steel with a sigh, and the doors open on air that smells of nothing at all. Ahead, across the whole of the rim, a screen of steel and glass, and one arch in it with a lens at its crown. Through the glass, green: trees in rows, real ones, and light that has never had dust in it.', 'effects': [{'learn': 'hc_station_seen'}, {'learn': 'seen_halcyon'}]},
        {'id': 'road', 'x': 1, 'y': 36, 'w': 6, 'h': 9, 'text': 'The road comes up the last bend and through a cut in the rim, and there is the Clean\'s post: a lamp, a board, two of them in grey with nothing on their boots. Past them, a yard of sheds and barrows and compost, and the white screen of Halcyon running along the rim, and through it, green.', 'effects': [{'learn': 'hc_road_seen'}, {'learn': 'seen_halcyon'}]},
        {'id': 'yard', 'x': 8, 'y': 30, 'w': 14, 'h': 8, 'text': 'The service yard. Barrows, sacks of compost, a hose. A low iron door under the screen with a lens beside it, and a bench along the wall where, at dawn, the gardeners from the Skirts wait to be let in.', 'effects': [{'learn': 'hc_yard_seen'}]},
        {'id': 'inside', 'x': 1, 'y': 1, 'w': 70, 'h': 28, 'text': 'Inside. The air is warm and wet and smells of leaves. Fruit trees in tubs in rows down the paths, a man sweeping leaves that have not fallen yet, rain pipes along the glass overhead. People in clean clothes walk past without looking at you, and nobody among them who is old looks old.', 'effects': [{'set': 'hc_inside'}, {'learn': 'hc_inside_seen'}, {'quest': 'q_hc_longlived', 'start': True}]},
        {'id': 'concourse', 'x': 23, 'y': 34, 'w': 30, 'h': 9, 'text': 'The concourse inside the arch: white floor, benches nobody sits on, two of the Clean, and on an easel a card in a frame: THE BOARD\'S BALL — THE SEASON\'S RENEWAL — ON THE BOARD\'S FLOOR, WHEN THE DESIGNATE IS PLEASED TO ATTEND.', 'effects': [{'set': 'hc_inside'}, {'learn': 'hc_inside_seen'}, {'learn': 'hc_ball_card'}, {'quest': 'q_hc_longlived', 'start': True}]},
        {'id': 'clinicword', 'x': 23, 'y': 34, 'w': 30, 'h': 9, 'if': {'all': [{'flag': 'hs_nils', 'eq': 'up'}, {'not': {'flag': 'hc_nils'}}]}, 'text': 'A gardener with Skirts hands goes past you with a barrow and says, without stopping or looking at you, "Joran\'s boy is on nine. The Chair\'s list. Before the ball." Then she is gone up the path.', 'effects': [{'learn': 'hc_nils_listed'}]},
    ],
    'extras': [
        {'count': 6, 'roles': ['gilded', 'corp', 'gilded'], 'life': 'pampered', 'faction': 'concern', 'ages': [24, 60], 'area': {'x': 23, 'y': 2, 'w': 29, 'h': 30}, 'spots': ['garden_sit', 'garden_pair_a', 'garden_pair_b', 'garden_lean'], 'hours': {'from': 8, 'to': 22},
         'barks': ['The rain is at four. Walk under it; it is good for the skin.', 'My grandmother planted that row. She still walks it.', 'One does not go down the hill. Why would one?', 'The Board renews before the ball. Everyone knows.', 'Look at the light. They say it is the same light as before.']},
        {'count': 4, 'roles': ['labourer', 'labourer', 'settler'], 'life': 'hard', 'ages': [16, 60], 'area': {'x': 12, 'y': 2, 'w': 40, 'h': 30}, 'spots': ['garden_work', 'garden_work_b', 'garden_work_c'], 'hours': {'from': 6, 'to': 18},
         'barks': ['Thirty years I\'ve grown fruit I\'ve never eaten.', 'Don\'t look up. Look at the beds.', 'They search us at the tunnel. Our boots, our mouths.', 'The keeper\'s all right. The keeper\'s from Nursery.']},
        {'count': 4, 'roles': ['corp', 'gilded', 'tech'], 'life': 'soft', 'faction': 'concern', 'ages': [22, 55], 'area': {'x': 54, 'y': 2, 'w': 15, 'h': 9}, 'spots': ['refectory_sit', 'refectory_pair_a', 'refectory_pair_b'], 'hours': {'from': 7, 'to': 23},
         'barks': ['The orange is from the tree. There is only the one tree.', 'Nobody has to decide anything today.', 'Did you see the designate? One should not look.', 'Tenure review in the spring. One renews or one is reviewed.']},
        {'count': 3, 'roles': ['corp', 'tech', 'medic'], 'life': 'soft', 'faction': 'concern', 'ages': [25, 50], 'area': {'x': 54, 'y': 24, 'w': 15, 'h': 7}, 'spots': ['lobby_sit', 'lobby_pair_a', 'lobby_pair_b'], 'hours': {'from': 7, 'to': 21},
         'barks': ['Nine is for staff.', 'The works are down; the gardens are here; the Board is up. That is the whole of Halcyon.', 'Face to the lens, please.']},
        {'count': 3, 'roles': ['labourer', 'settler'], 'life': 'hard', 'ages': [16, 58], 'area': {'x': 8, 'y': 30, 'w': 14, 'h': 4}, 'spots': ['tunnel_queue', 'tunnel_queue_b', 'yard_sit'], 'hours': {'from': 4, 'to': 7},
         'barks': ['Face to the lens. Then boots. Then mouths.', 'Day pass, one scrip. They take it off the Window.', 'If you\'re not on the list, you\'re not on the list.']},
        {'count': 2, 'roles': ['labourer', 'tech'], 'life': 'hard', 'area': {'x': 52, 'y': 46, 'w': 17, 'h': 7}, 'spots': ['dock_work', 'dock_work_b'], 'hours': {'from': 6, 'to': 22},
         'barks': ['MEDICAL — COLD. Mind your feet.', 'Freight at two. Freight doesn\'t strike.']},
    ],
    'ambience': {'indoor': True, 'fogColor': 'hex:0xdfeee6', 'fogDensity': 0.004, 'dust': 0.0, 'ambient': {'color': 'hex:0xf2fff6', 'intensity': 1.15}, 'grade': 0.1, 'mood': 'bright', 'sound': 'murmur'},
}
check('hc_terrace', rows, hc_terrace['legend'], props, spawns, npcs, spots)
OUT.append(hc_terrace)

# ================================================================ hc_clinic: floor nine
W2, H2 = 48, 36
c = grid(W2, H2, 'C')
fill(c, 1, 14, 8, 21, 't')                       # the lift lobby
fill(c, 9, 16, 46, 19, 't')                      # the corridor
building(c, 9, 2, 30, 15, 'C', 't', [(14, 15), (25, 15)])  # the recovery ward
building(c, 30, 2, 40, 15, 'C', 'w', [(35, 15)])           # Dr Qadir's office
building(c, 40, 2, 46, 15, 'C', 't', [(43, 15)])           # the fitting suite
building(c, 9, 20, 22, 33, 'C', 't', [(15, 20)])           # the cold store
building(c, 23, 20, 46, 34, 'C', 't', [])                  # the service ward (through its door)
building(c, 39, 27, 46, 34, 'C', 't', [(39, 30)])          # the listening room, inside the ward
rows2 = [''.join(r) for r in c]
props2 = [
    P('terminal', 2, 15, 1, 'hc_lift_clinic'), P('planter', 7, 15), P('chair', 4, 20, 0), P('sign', 6, 15, 2, 'hc_clinic_board'),
    P('bed', 11, 4, 1), P('bed', 11, 8, 1), P('bed', 11, 12, 1), P('bed', 28, 4, 3), P('bed', 28, 8, 3), P('bed', 28, 12, 3), P('machine', 13, 4), P('machine', 26, 8),
    P('sign', 19, 3, 2, 'hc_charts'), P('chair', 17, 10, 0), P('planter', 20, 13),
    P('table', 35, 6), P('chair', 35, 5, 2), P('terminal', 38, 4, 3, 'hc_qadir_files'), P('shelf', 31, 4, 1), P('shelf', 31, 9, 1), P('planter', 38, 13),
    P('bed', 43, 5, 0), P('machine', 45, 5, 3), P('shelf', 41, 12, 1), P('terminal', 45, 9, 3),
    P('machine', 12, 23, 1, 'hc_coldstore'), P('locker', 10, 26), P('locker', 10, 28), P('locker', 10, 30), P('locker', 21, 26), P('locker', 21, 28), P('locker', 21, 30), P('machine', 16, 32),
    P('sign', 32, 19, 0, 'hc_warddoor'), P('lamp_post', 9, 17),
    P('sign', 33, 21, 2, 'hc_warddoor_in'),
    P('cot', 25, 23, 0), P('cot', 25, 26, 0), P('cot', 25, 29, 0), P('cot', 25, 32, 0), P('cot', 29, 23, 0), P('cot', 29, 29, 0), P('cot', 29, 32, 0), P('cot', 33, 29, 0), P('cot', 33, 32, 0),
    P('machine', 27, 24), P('machine', 31, 24), P('machine', 35, 24), P('sign', 37, 22, 3, 'hc_wardboard'),
    P('chair', 43, 31, 3), P('machine', 45, 29, 3), P('sign', 41, 28, 0, 'hc_listening'),
]
spots2 = {
    'qadir': {'x': 35, 'y': 8}, 'abena': {'x': 20, 'y': 18}, 'lisle_up': {'x': 26, 'y': 17}, 'clinic_sit': {'x': 4, 'y': 19}, 'ward_staff': {'x': 18, 'y': 12}, 'ward_staff_b': {'x': 22, 'y': 6},
    'corridor_pair_a': {'x': 38, 'y': 17}, 'corridor_pair_b': {'x': 39, 'y': 17},
    'dawit': {'x': 27, 'y': 26}, 'nils_up': {'x': 31, 'y': 29}, 'dysart_up': {'x': 35, 'y': 32}, 'immy_up': {'x': 43, 'y': 30}, 'ward_watch': {'x': 36, 'y': 27},
}
npcs2 = [
    {'def': 'npc_hc_05', 'x': 35, 'y': 8, 'facing': 2},
    {'def': 'npc_hc_16', 'x': 20, 'y': 18, 'facing': 2},
    {'def': 'npc_hc_20', 'x': 27, 'y': 26, 'facing': 0, 'schedule': [], 'if': ON_WARD_DAWIT},
    {'def': 'npc_hs_09', 'id': 'npc_hs_09_hc', 'x': 31, 'y': 29, 'facing': 0, 'dialogue': 'd_hc_nils', 'schedule': [], 'if': ON_WARD_NILS},
    {'def': 'npc_hs_05', 'id': 'npc_hs_05_hc', 'x': 35, 'y': 32, 'facing': 0, 'dialogue': 'd_hc_dysart', 'schedule': [], 'if': ON_WARD_DYSART},
    {'def': 'npc_bw_05', 'id': 'npc_bw_05_hc', 'x': 43, 'y': 30, 'facing': 3, 'dialogue': 'd_hc_immy', 'schedule': [], 'if': WIRED_IMMY},
    {'def': 'npc_hs_07', 'id': 'npc_hs_07_hc', 'x': 26, 'y': 17, 'facing': 2, 'dialogue': 'd_hc_lisle', 'schedule': [], 'if': UP_LISLE},
]
spawns2 = [{'id': 'start', 'x': 4, 'y': 17, 'facing': 1}, {'id': 'lift', 'x': 4, 'y': 17, 'facing': 1}, {'id': 'corridor', 'x': 32, 'y': 18, 'facing': 2}, {'id': 'ward', 'x': 34, 'y': 22, 'facing': 2}]
hc_clinic = {
    'id': 'hc_clinic', 'name': 'Halcyon — Clinic Floors', 'seed': 422, 'settlement': 'halcyon', 'interior': True,
    'layout': rows2,
    'legend': {'t': {'floor': 'tile'}, 'w': {'floor': 'wood'}, 'C': {'wall': 'concrete', 'floor': 'tile', 'wallHeight': 3.2}},
    'props': props2,
    'lights': [lamp(4, 17, 3.0, '0xf4fbff', 2.0, 8), lamp(20, 17, 3.0, '0xf4fbff', 2.0, 10), lamp(38, 17, 3.0, '0xf4fbff', 2.0, 10), lamp(19, 8, 3.0, '0xf0f8ff', 2.2, 12),
               lamp(35, 8, 2.8, '0xfff4e0', 1.8, 8), lamp(43, 8, 3.0, '0xffffff', 2.4, 8), lamp(15, 27, 2.6, '0xc8e0ff', 1.6, 10), lamp(31, 27, 2.6, '0xd8e8ff', 1.2, 12), lamp(43, 31, 2.4, '0xb0c8ff', 1.2, 6, 0.2)],
    'spawns': spawns2,
    'talk': {
        'hc_lift_clinic': {'dialogue': 'd_hc_lift', 'name': 'The lift'},
        'hc_clinic_board': {'dialogue': 'd_hc_clinic_board', 'name': 'The floor\'s board'},
        'hc_charts': {'dialogue': 'd_hc_charts', 'name': 'The charts'},
        'hc_qadir_files': {'dialogue': 'd_hc_qadir_files', 'name': 'Dr Qadir\'s terminal'},
        'hc_coldstore': {'dialogue': 'd_hc_coldstore', 'name': 'The cold store'},
        'hc_warddoor': {'dialogue': 'd_hc_warddoor', 'name': 'The ward door'},
        'hc_warddoor_in': {'dialogue': 'd_hc_warddoor_in', 'name': 'The ward door'},
        'hc_wardboard': {'dialogue': 'd_hc_wardboard', 'name': 'The ward\'s board'},
        'hc_listening': {'dialogue': 'd_hc_listening', 'name': 'The listening room'},
    },
    'spots': spots2,
    'npcs': npcs2,
    'triggers': [
        {'id': 'nine', 'x': 1, 'y': 14, 'w': 8, 'h': 8, 'text': 'Floor nine. The lift opens on a corridor so white it hums, and a smell under the antiseptic that you know from the Weighhouse and have no name for. A board by the lift in clinic-white enamel: RECOVERY — FITTINGS — COLD STORE — SERVICE.', 'effects': [{'learn': 'hc_clinic_seen'}, {'quest': 'q_hc_clinic', 'start': True}]},
        {'id': 'ward', 'x': 24, 'y': 21, 'w': 15, 'h': 13, 'text': 'The service ward: long and dim and warm, a cot every few paces, and on every cot somebody asleep under a white sheet with a tag on their wrist and a line in their arm. Machines breathe beside them. Nobody here is dying. That is the first thing you understand, and it is the worst.', 'effects': [{'learn': 'hc_ward_seen'}, {'lead': 'l_hc_service'}]},
    ],
    'extras': [
        {'count': 3, 'roles': ['medic', 'medic', 'corp'], 'life': 'soft', 'faction': 'concern', 'ages': [26, 55], 'area': {'x': 10, 'y': 3, 'w': 19, 'h': 12}, 'spots': ['ward_staff', 'ward_staff_b', 'corridor_pair_a', 'corridor_pair_b'],
         'barks': ['Bed four is a Board renewal. Quiet, please.', 'Holdfast at six. Holdfast at six.', 'The match is good. The match is always good.', 'Don\'t read the charts, read the numbers.']},
    ],
    'ambience': {'indoor': True, 'fogColor': 'hex:0xe8eef4', 'fogDensity': 0.006, 'dust': 0.0, 'ambient': {'color': 'hex:0xeef6ff', 'intensity': 0.9}, 'grade': 0.15, 'mood': 'grim', 'sound': 'hum'},
}
check('hc_clinic', rows2, hc_clinic['legend'], props2, spawns2, npcs2, spots2)
OUT.append(hc_clinic)

# ================================================================ hc_board: the Board's floor and the hall
W3, H3 = 52, 36
b = grid(W3, H3, 'C')
fill(b, 1, 14, 8, 21, 't')                       # the lift lobby
fill(b, 9, 13, 24, 21, 't')                      # the gallery of portraits
building(b, 9, 2, 20, 12, 'C', 'w', [(14, 12)])            # Director Soto's office
building(b, 9, 22, 20, 33, 'C', 'w', [(14, 22)])           # the boardroom
fill(b, 25, 8, 50, 33, 't')                      # the hall, open to the gallery along its west side
building(b, 37, 1, 50, 7, 'C', 'w', [])                    # the Chair's room (through its door)
rows3 = [''.join(r) for r in b]
props3 = [
    P('terminal', 2, 15, 1, 'hc_lift_board'), P('planter', 7, 15), P('planter', 7, 20),
    P('sign', 12, 13, 2, 'hc_portraits'), P('sign', 18, 13, 2), P('sign', 22, 21, 0), P('planter', 23, 14),
    P('table', 14, 5), P('chair', 14, 4, 2), P('chair', 13, 7, 0), P('shelf', 10, 3, 1), P('shelf', 19, 3, 3), P('planter', 18, 10), P('terminal', 11, 9, 1),
    P('table', 13, 27), P('table', 14, 27), P('table', 15, 27), P('table', 13, 28), P('table', 14, 28), P('table', 15, 28),
    P('chair', 12, 27, 1), P('chair', 16, 28, 3), P('chair', 14, 26, 2), P('chair', 14, 29, 0), P('sign', 17, 31, 0, 'hc_boardtable'),
    P('counter', 36, 9, 0, 'hc_lectern'), P('planter', 27, 9), P('planter', 48, 9), P('planter', 27, 32), P('planter', 48, 32),
    P('table', 30, 18), P('chair', 31, 18, 3), P('table', 30, 24), P('chair', 29, 24, 1), P('table', 44, 18), P('chair', 45, 18, 3), P('table', 44, 24), P('chair', 43, 24, 1),
    P('table', 37, 28), P('chair', 38, 28, 3), P('counter', 47, 27, 3), P('counter', 47, 28, 3), P('lamp_post', 33, 12), P('lamp_post', 41, 12), P('lamp_post', 33, 30), P('lamp_post', 41, 30),
    P('sign', 43, 8, 0, 'hc_chairdoor'),
    P('sign', 43, 6, 2, 'hc_chairdoor_in'), P('terminal', 39, 3, 1, 'hc_controllers'), P('hound_dormant', 48, 3, 3), P('chair', 45, 3, 2), P('planter', 41, 5),
]
spots3 = {
    'soto': {'x': 14, 'y': 6}, 'chair': {'x': 37, 'y': 11}, 'chair_room': {'x': 45, 'y': 4}, 'wray': {'x': 30, 'y': 15}, 'benedetti': {'x': 44, 'y': 15}, 'quill': {'x': 46, 'y': 22},
    'hall_sit': {'x': 31, 'y': 19}, 'hall_sit_b': {'x': 45, 'y': 19}, 'hall_pair_a': {'x': 35, 'y': 21}, 'hall_pair_b': {'x': 36, 'y': 21}, 'hall_pair_c': {'x': 39, 'y': 25}, 'hall_pair_d': {'x': 40, 'y': 25},
    'hall_lean': {'x': 46, 'y': 29}, 'gallery_lean': {'x': 20, 'y': 17}, 'hall_guard': {'x': 26, 'y': 17}, 'lobby_guard': {'x': 6, 'y': 18},
}
npcs3 = [
    {'def': 'npc_hc_02', 'x': 14, 'y': 6, 'facing': 2},
    {'def': 'npc_hc_01', 'x': 37, 'y': 11, 'facing': 2, 'if': CHAIR_SITS},
    {'def': 'npc_hc_01', 'id': 'npc_hc_01_room', 'x': 45, 'y': 4, 'facing': 3, 'schedule': [], 'dialogue': 'd_hc_chair', 'if': CHAIR_SITS},
    {'def': 'npc_hc_17', 'x': 30, 'y': 15, 'facing': 1},
    {'def': 'npc_hc_18', 'x': 44, 'y': 15, 'facing': 3},
    {'def': 'npc_cr_11', 'id': 'npc_cr_11_hc', 'x': 46, 'y': 22, 'facing': 3, 'dialogue': 'd_hc_quill', 'schedule': [], 'if': {'flag': 'cr_concern'}},
    {'def': 'npc_hc_g7', 'x': 26, 'y': 17, 'facing': 1},
    {'def': 'npc_hc_g8', 'x': 6, 'y': 18, 'facing': 1},
]
spawns3 = [{'id': 'start', 'x': 4, 'y': 17, 'facing': 1}, {'id': 'lift', 'x': 4, 'y': 17, 'facing': 1}, {'id': 'hall', 'x': 43, 'y': 10, 'facing': 2}, {'id': 'chair_room', 'x': 43, 'y': 5, 'facing': 0}]
hc_board = {
    'id': 'hc_board', 'name': 'Halcyon — Board Floor', 'seed': 423, 'settlement': 'halcyon', 'interior': True,
    'layout': rows3,
    'legend': {'t': {'floor': 'tile'}, 'w': {'floor': 'wood'}, 'C': {'wall': 'concrete', 'floor': 'tile', 'wallHeight': 4.2}},
    'props': props3,
    'lights': [lamp(4, 17, 3.2, '0xfff8ec', 1.8, 8), lamp(16, 17, 3.4, '0xfff0d8', 2.0, 10), lamp(14, 7, 3.0, '0xfff4e0', 2.0, 8), lamp(14, 28, 3.0, '0xfff0d8', 1.8, 8),
               lamp(37, 12, 4.4, '0xfff2dc', 2.6, 16), lamp(37, 25, 4.4, '0xfff2dc', 2.6, 16), lamp(30, 20, 3.0, '0xffd8a8', 1.4, 8, 0.1), lamp(45, 20, 3.0, '0xffd8a8', 1.4, 8, 0.1),
               lamp(43, 4, 3.0, '0xffe8c8', 1.6, 8), lamp(48, 3, 1.2, '0xff4030', 0.8, 3)],
    'spawns': spawns3,
    'talk': {
        'hc_lift_board': {'dialogue': 'd_hc_lift', 'name': 'The lift'},
        'hc_portraits': {'dialogue': 'd_hc_portraits', 'name': 'The portraits'},
        'hc_boardtable': {'dialogue': 'd_hc_boardtable', 'name': 'The Board\'s table'},
        'hc_lectern': {'dialogue': 'd_hc_lectern', 'name': 'The lectern'},
        'hc_chairdoor': {'dialogue': 'd_hc_chairdoor', 'name': 'The Chair\'s door'},
        'hc_chairdoor_in': {'dialogue': 'd_hc_chairdoor_in', 'name': 'The door'},
        'hc_controllers': {'dialogue': 'd_hc_controllers', 'name': 'The console'},
    },
    'spots': spots3,
    'npcs': npcs3,
    'triggers': [
        {'id': 'floor', 'x': 1, 'y': 14, 'w': 8, 'h': 8, 'text': 'The Board\'s floor. Carpet that swallows your boots, wood on the walls that came from trees, and portraits down a gallery in gold frames. The lens over the lift turns to you and a voice from nowhere in particular says, warmly, "The designate. The Board is pleased."', 'effects': [{'learn': 'hc_board_seen'}]},
        {'id': 'hall', 'x': 25, 'y': 8, 'w': 26, 'h': 26, 'text': 'The hall: a ballroom under a ceiling of glass panes with the sky behind them, long tables, a lectern with the closed eye on it, and people in clean synthetics with lit seams at their cuffs and collars, laughing quietly. Every one of them has the skin of somebody of forty. One of them, by the lectern, has the eyes of somebody very much older.', 'effects': [{'learn': 'hc_hall_seen'}]},
    ],
    'extras': [
        {'count': 6, 'roles': ['gilded', 'gilded', 'corp'], 'life': 'pampered', 'faction': 'concern', 'ages': [36, 50], 'area': {'x': 26, 'y': 12, 'w': 24, 'h': 20}, 'spots': ['hall_sit', 'hall_sit_b', 'hall_pair_a', 'hall_pair_b', 'hall_pair_c', 'hall_pair_d', 'hall_lean'],
         'barks': ['Renewed last week. One feels thirty.', 'The designate. Do not stare; it is rude, and the designate is armed.', 'We were young at the old lodge. We are young here.', 'Soto wants to buy the future. The Chair would rather it were handed to him.', 'Nobody has to decide anything tonight.']},
    ],
    'ambience': {'indoor': True, 'fogColor': 'hex:0xf2ece2', 'fogDensity': 0.004, 'dust': 0.0, 'ambient': {'color': 'hex:0xfff4e4', 'intensity': 1.05}, 'grade': 0.12, 'mood': 'bright', 'sound': 'murmur'},
}
check('hc_board', rows3, hc_board['legend'], props3, spawns3, npcs3, spots3)
OUT.append(hc_board)

# ================================================================ hc_works: the chip line and the grid core
W4, H4 = 48, 32
k = grid(W4, H4, 'M')
fill(k, 1, 12, 8, 19, 'm')                       # the lift lobby
fill(k, 9, 12, 46, 19, 'm')                      # the line's viewing gallery
building(k, 9, 1, 46, 11, 'M', 'g', [])                    # the clean room behind the glass (no way in)
building(k, 9, 20, 46, 30, 'M', 'g', [])                   # the grid core (through its door)
rows4 = [''.join(r) for r in k]
props4 = [
    P('terminal', 2, 13, 1, 'hc_lift_works'), P('sign', 6, 13, 2),
    P('sign', 20, 12, 2, 'hc_line'), P('sign', 34, 12, 2), P('chair', 16, 15, 2), P('chair', 26, 15, 2), P('table', 40, 16), P('terminal', 42, 16, 3), P('shelf', 45, 18, 3),
    P('machine', 12, 4), P('machine', 16, 4), P('machine', 20, 4), P('machine', 24, 4), P('machine', 28, 4), P('machine', 32, 4), P('machine', 36, 4), P('machine', 40, 4), P('machine', 44, 4),
    P('machine', 12, 8), P('machine', 20, 8), P('machine', 28, 8), P('machine', 36, 8), P('machine', 44, 8),
    P('sign', 30, 19, 0, 'hc_coredoor'),
    P('sign', 30, 21, 2, 'hc_coredoor_in'),
]
for x in range(12, 39, 4):
    for y in (23, 28):
        props4.append(P('machine', x, y))
props4 += [P('bed', 41, 26, 3, 'hc_keeperchair'), P('machine', 41, 24, 0), P('machine', 41, 28, 2), P('machine', 44, 26, 3, 'hc_trunk')]
spots4 = {'lawal': {'x': 40, 'y': 26}, 'line_work': {'x': 18, 'y': 14}, 'line_work_b': {'x': 33, 'y': 14}, 'line_sit': {'x': 16, 'y': 16}, 'line_pair_a': {'x': 37, 'y': 17}, 'line_pair_b': {'x': 38, 'y': 17}, 'core_watch': {'x': 25, 'y': 25}, 'core_door': {'x': 30, 'y': 18}}
npcs4 = [
    {'def': 'npc_hc_12', 'x': 40, 'y': 26, 'facing': 1, 'if': {'not': {'flag': 'hc_lawal_free'}}},
    {'def': 'npc_hc_g9', 'x': 30, 'y': 18, 'facing': 2},
]
spawns4 = [{'id': 'start', 'x': 4, 'y': 15, 'facing': 1}, {'id': 'lift', 'x': 4, 'y': 15, 'facing': 1}, {'id': 'gallery', 'x': 30, 'y': 17, 'facing': 0}, {'id': 'core', 'x': 30, 'y': 22, 'facing': 2}]
hc_works = {
    'id': 'hc_works', 'name': 'Halcyon — Works', 'seed': 424, 'settlement': 'halcyon', 'interior': True,
    'layout': rows4,
    'legend': {'m': {'floor': 'metal'}, 'g': {'floor': 'grate'}, 'M': {'wall': 'metal', 'floor': 'metal', 'wallHeight': 3.8}},
    'props': props4,
    'lights': [lamp(4, 15, 3.0, '0xe8f0ff', 1.8, 8), lamp(20, 15, 3.2, '0xd8e8ff', 2.0, 12), lamp(36, 15, 3.2, '0xd8e8ff', 2.0, 12), lamp(26, 6, 3.4, '0xfff0b0', 2.4, 18),
               lamp(20, 25, 2.8, '0x80b0ff', 1.6, 12, 0.15), lamp(36, 25, 2.8, '0x80b0ff', 1.6, 12, 0.15), lamp(42, 26, 2.4, '0xa0d0ff', 1.8, 6, 0.3)],
    'spawns': spawns4,
    'talk': {
        'hc_lift_works': {'dialogue': 'd_hc_lift', 'name': 'The lift'},
        'hc_line': {'dialogue': 'd_hc_line', 'name': 'The line'},
        'hc_coredoor': {'dialogue': 'd_hc_coredoor', 'name': 'The core door'},
        'hc_coredoor_in': {'dialogue': 'd_hc_coredoor_in', 'name': 'The core door'},
        'hc_keeperchair': {'dialogue': 'd_hc_lawal', 'name': 'The keeper\'s chair'},
        'hc_trunk': {'dialogue': 'd_hc_trunk', 'name': 'The trunk'},
    },
    'spots': spots4,
    'npcs': npcs4,
    'triggers': [
        {'id': 'works', 'x': 1, 'y': 12, 'w': 8, 'h': 8, 'text': 'The works, under the gardens: a gallery of steel with a wall of glass along it, and behind the glass the chip line, still running ninety years on, in a light the colour of weak tea. People in white with their faces covered move very slowly among machines that move very fast.', 'effects': [{'learn': 'hc_works_seen'}]},
        {'id': 'core', 'x': 10, 'y': 21, 'w': 36, 'h': 9, 'text': 'The grid core: aisles of cabinets breathing warm air, cables thick as arms running along the floor to one place at the far end, where a man sits in a chair with the cables going into him.', 'effects': [{'learn': 'hc_core_seen'}, {'lead': 'l_hc_keeper'}]},
    ],
    'extras': [
        {'count': 4, 'roles': ['tech', 'tech', 'corp'], 'life': 'settled', 'faction': 'concern', 'ages': [22, 55], 'area': {'x': 10, 'y': 13, 'w': 36, 'h': 6}, 'spots': ['line_work', 'line_work_b', 'line_sit', 'line_pair_a', 'line_pair_b'],
         'barks': ['Yield on line three is down a point. Again.', 'Ninety years and she still holds a tolerance.', 'Don\'t go near the core door. Nobody goes near the core door.', 'The keeper\'s been in that chair since my mother was on the line.']},
    ],
    'ambience': {'indoor': True, 'fogColor': 'hex:0x1c2028', 'fogDensity': 0.02, 'dust': 0.05, 'ambient': {'color': 'hex:0x8090a8', 'intensity': 0.5}, 'grade': 0.3, 'mood': 'grim', 'sound': 'hum'},
}
check('hc_works', rows4, hc_works['legend'], props4, spawns4, npcs4, spots4)
OUT.append(hc_works)

for m in OUT:
    with open(os.path.join(ROOT, 'src', 'content', 'maps', f"{m['id']}.ts"), 'w') as f:
        f.write(f"{HEADER}export const {m['id']}: MapDef = {ts(m)};\n")
    print(m['id'], len(m['layout'][0]), 'x', len(m['layout']))
