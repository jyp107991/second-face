#!/usr/bin/env python3
"""Generates src/content/maps/md_docks.ts — Carrick, Meridian's docks across the dry river (WORLD §3.1: barges, fish,
smuggling, the Line terminus). B5b, the last piece: the Line's real Meridian stop and the tide boat's city landing.

West is the dry river: the old bed forty feet below the river wall, where four of the Hulls (pre-war ships stranded when the
river stopped) are lived in; the river stairs go down to them, the stump of the old bridge's far end stands on the bank with
House Vane's survey stakes on the bed below it, and a dead crane on the bank carries the cradle's cable over the bed to
Bridgeward's drop. The river road comes in at the north-west, round by the Wall from the Precinct's gate. North: the railhead,
the Line's terminus under a long brick freight shed, the turntable and the yard throat; the quay tram's stop to Clover. The
middle of the quay: the guild's floor (its warehouse) with the weighbridge in front, the Concern's Bond (a fenced, lit yard of
sealed boxes and its office), the Customs House where the Harbour Master sits and the Harbour court is held on the steps, the
Stand (where the call-on picks the day's gangs), and the box that fell from Crane Six. South along the Basin's edge: the
cranes, the barge quay, the fish steps, the water stairs where the tide boat calls, the fuel berth. East: the Boxes, stacked
containers where dockers live, with a cookshop and a bunk to let.
    python3 tools/maps/gen_md_docks.py
"""
import json, os, re, sys
from collections import deque

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')


def ts(obj):
    s = json.dumps(obj, indent=2)
    s = re.sub(r'"([A-Za-z_][A-Za-z0-9_]*)":', r'\1:', s)
    s = re.sub(r'"hex:(0x[0-9a-fA-F]+)"', r'\1', s)
    return s


# props that occupy their tile (engine/scene/grid.ts: everything but signs, debris and blankets)
SOLID = {'crate', 'barrel', 'barrel_rust', 'locker', 'table', 'chair', 'bed', 'terminal', 'pipe_h', 'lamp_post', 'car_wreck', 'rock',
         'rock_small', 'tire_pile', 'tank', 'vault_door', 'dead_tree', 'sandbags', 'shelf', 'stove', 'fire_barrel', 'campfire', 'cactus',
         'counter', 'planter', 'machine', 'cot', 'tent', 'fence_post', 'pump', 'wagon', 'horse', 'windpump', 'hound_dormant'}


def check(name, rows, legend, props, spawns, npcs, spots, start_spawn, talk_ids=(), exits=()):
    """Fail loudly on anything the validator would reject, and on places nobody can walk to."""
    H, W = len(rows), len(rows[0])
    for r in rows:
        assert len(r) == W, f'{name}: ragged row'
    solid = {(p['x'], p['y']) for p in props if p['kind'] in SOLID}
    errs = []
    inwall = lambda x, y: 'wall' in legend[rows[y][x]]
    blocked = lambda x, y: inwall(x, y) or legend[rows[y][x]].get('blocks')
    for p in props:
        if inwall(p['x'], p['y']):
            errs.append(f"prop {p['kind']} {p.get('id', '')} at {p['x']},{p['y']} is inside a wall")
    free = lambda x, y: 0 <= x < W and 0 <= y < H and not blocked(x, y) and (x, y) not in solid
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
    for n in npcs:
        if not free(n['x'], n['y']): errs.append(f"npc {n.get('id', n['def'])} at {n['x']},{n['y']} not free")
        elif (n['x'], n['y']) not in seen: errs.append(f"npc {n.get('id', n['def'])} unreachable")
    for k, v in spots.items():
        if not free(v['x'], v['y']): errs.append(f"spot {k} at {v['x']},{v['y']} not free")
        elif (v['x'], v['y']) not in seen: errs.append(f"spot {k} unreachable")
    for p in props:
        if p.get('id') and not any((p['x'] + dx, p['y'] + dy) in seen for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1))):
            errs.append(f"prop {p['id']} cannot be reached")
    for e in exits:
        if not any((x, y) in seen for y in range(e['y'], e['y'] + e.get('h', 1)) for x in range(e['x'], e['x'] + e.get('w', 1))):
            errs.append(f"exit {e['label']} cannot be reached")
    ids = {p.get('id') for p in props}
    for t in talk_ids:
        if t not in ids: errs.append(f"talk {t} has no prop")
    if errs:
        print(name, 'FAILED:\n  ' + '\n  '.join(errs))
        sys.exit(1)
    return seen


def grid(w, h, ch):
    return [[ch] * w for _ in range(h)]


def fill(g, x0, y0, x1, y1, ch):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            g[y][x] = ch


def building(g, x0, y0, x1, y1, wall, floor, doors):
    fill(g, x0, y0, x1, y1, wall)
    fill(g, x0 + 1, y0 + 1, x1 - 1, y1 - 1, floor)
    for (x, y) in doors:
        g[y][x] = floor


def ring(g, x0, y0, x1, y1, ch):
    for x in range(x0, x1 + 1):
        g[y0][x] = ch; g[y1][x] = ch
    for y in range(y0, y1 + 1):
        g[y][x0] = ch; g[y][x1] = ch


# conditions the placements read (the same as src/content/dialogue/md_docks.ts)
F = lambda f, v=None: {'flag': f} if v is None else {'flag': f, 'eq': v}
NOT = lambda c: {'not': c}
ALL = lambda *c: {'all': list(c)}
ANY = lambda *c: {'any': list(c)}
HOURS = lambda a, b: {'hour': {'from': a, 'to': b}}

W, H = 80, 60
g = grid(W, H, 'c')
# the rim; the river road comes in through it at the north-west
fill(g, 0, 0, W - 1, 0, 'R'); fill(g, 0, H - 1, W - 1, H - 1, 'R'); fill(g, 0, 0, 0, H - 1, 'R'); fill(g, W - 1, 0, W - 1, H - 1, 'R')
# the dry river: the old bed, broken concrete and silt, forty feet below the bank
fill(g, 1, 1, 16, H - 2, 'd')
for (x0, y0, x1, y1) in [(3, 13, 6, 14), (9, 45, 12, 46), (2, 26, 4, 27), (11, 57, 15, 58), (14, 1, 16, 2)]:
    fill(g, x0, y0, x1, y1, 'k')
# the river wall, and the river stairs down through it to the Hulls
fill(g, 17, 1, 18, H - 2, 'Q'); fill(g, 17, 29, 18, 31, 'c')
# the Hulls: four of the nine stranded ships on the bed, lived in, their doors toward the wall
building(g, 2, 3, 14, 11, 'H', 'h', [(14, 7)])
building(g, 3, 16, 13, 24, 'H', 'h', [(13, 20)])
building(g, 2, 35, 14, 44, 'H', 'h', [(14, 39)])
building(g, 4, 48, 13, 56, 'H', 'h', [(13, 52)])
# the old bridge's far end: a stump on the bank
fill(g, 19, 24, 21, 27, 'P')
# the river road, round by the Wall from the Precinct's gate, down to the quay
fill(g, 21, 0, 24, 14, 'a')
# the railhead: the yard, the long freight shed over the Line's last platform, the turntable, the quay tram's stop
fill(g, 25, 1, 78, 13, 'm')
building(g, 32, 2, 66, 12, 'B', 'm', [(32, 6), (32, 7), (66, 6), (66, 7), (40, 12), (58, 12)])
fill(g, 34, 9, 64, 10, 'c')
fill(g, 68, 2, 76, 9, 'g')
# the guild's floor (its warehouse) and the weighbridge in front of it, with the weigh hut
building(g, 25, 16, 40, 27, 'B', 'c', [(32, 16), (32, 27), (33, 27)])
fill(g, 27, 29, 36, 31, 'g')
building(g, 37, 29, 41, 33, 'M', 'c', [(37, 30)])
# the Bond: the Concern's fenced yard of sealed boxes, its gate south, its office
ring(g, 44, 16, 60, 33, 'F'); g[33][52] = 'c'; g[33][53] = 'c'
building(g, 54, 17, 59, 22, 'K', 'n', [(56, 22)])
for (x0, y0, x1, y1) in [(46, 18, 50, 19), (46, 22, 50, 23), (46, 26, 51, 27), (54, 25, 58, 26), (54, 29, 58, 30), (46, 30, 49, 31)]:
    fill(g, x0, y0, x1, y1, 'X')
# the Customs House: the long room where the Harbour Master sits, her office behind it, the steps where the court is held
building(g, 64, 15, 77, 27, 'E', 't', [(64, 21), (64, 22)])
building(g, 71, 16, 76, 20, 'C', 't', [(73, 20)])
# the box that fell from Crane Six, split on the quay
fill(g, 50, 40, 55, 41, 'X')
# the Boxes: stacked containers where the dockers live
building(g, 64, 30, 70, 34, 'X', 'f', [(67, 34)])
building(g, 72, 30, 78, 34, 'X', 'f', [(75, 34)])
building(g, 64, 37, 71, 42, 'X', 'f', [(67, 37)])
building(g, 73, 37, 78, 42, 'X', 'f', [(75, 37)])
# the quay's edge along the Basin, and the Basin
fill(g, 19, 47, 78, 47, 'P')
fill(g, 19, 48, 78, H - 2, 'W')
# the barge quay (timber staging), the fish steps, the water stairs, the fuel berth
fill(g, 22, 47, 36, 49, 'b')
fill(g, 44, 47, 50, 48, 'c'); fill(g, 44, 49, 50, 49, 'w')
fill(g, 61, 47, 66, 49, 'c'); fill(g, 61, 50, 66, 51, 'w')
fill(g, 70, 47, 76, 49, 'b')
rows = [''.join(r) for r in g]

props = [
    # the river road: the chalk on the first bollard
    {'kind': 'sign', 'x': 25, 'y': 3, 'rot': 1, 'id': 'dk_road_sign'}, {'kind': 'lamp_post', 'x': 25, 'y': 14},
    # the cradle: the dead crane on the bank whose jib carries the cable over the bed, and the winch at its foot
    {'kind': 'windpump', 'x': 19, 'y': 4, 'id': 'dk_crane1'}, {'kind': 'machine', 'x': 19, 'y': 8, 'rot': 3, 'id': 'dk_cradle'}, {'kind': 'barrel', 'x': 20, 'y': 10},
    # the Hulls: their insides
    {'kind': 'cot', 'x': 4, 'y': 5, 'rot': 1}, {'kind': 'cot', 'x': 4, 'y': 9, 'rot': 1}, {'kind': 'stove', 'x': 8, 'y': 4}, {'kind': 'table', 'x': 10, 'y': 7, 'id': 'dk_crewbooks'}, {'kind': 'blanket', 'x': 12, 'y': 9},
    {'kind': 'cot', 'x': 5, 'y': 18, 'rot': 1}, {'kind': 'cot', 'x': 5, 'y': 22, 'rot': 1}, {'kind': 'stove', 'x': 9, 'y': 17}, {'kind': 'table', 'x': 9, 'y': 21}, {'kind': 'blanket', 'x': 11, 'y': 23},
    {'kind': 'counter', 'x': 6, 'y': 37, 'rot': 0}, {'kind': 'shelf', 'x': 3, 'y': 38, 'rot': 1}, {'kind': 'crate', 'x': 4, 'y': 42}, {'kind': 'crate', 'x': 5, 'y': 42}, {'kind': 'cot', 'x': 12, 'y': 42, 'rot': 1}, {'kind': 'locker', 'x': 3, 'y': 36, 'id': 'dk_nadia_box'},
    {'kind': 'cot', 'x': 6, 'y': 50, 'rot': 1}, {'kind': 'cot', 'x': 6, 'y': 54, 'rot': 1}, {'kind': 'stove', 'x': 10, 'y': 49}, {'kind': 'blanket', 'x': 9, 'y': 53},
    # the bed between the hulls: fires, washing, a cart track
    {'kind': 'fire_barrel', 'x': 15, 'y': 14}, {'kind': 'fire_barrel', 'x': 15, 'y': 46}, {'kind': 'debris', 'x': 8, 'y': 32}, {'kind': 'tire_pile', 'x': 15, 'y': 25},
    # House Vane's stakes on the bed below the stump, and the survey on the stump
    {'kind': 'fence_post', 'x': 4, 'y': 28}, {'kind': 'fence_post', 'x': 8, 'y': 28}, {'kind': 'fence_post', 'x': 12, 'y': 28}, {'kind': 'fence_post', 'x': 4, 'y': 32}, {'kind': 'fence_post', 'x': 12, 'y': 32},
    {'kind': 'sign', 'x': 15, 'y': 32, 'rot': 3, 'id': 'dk_stakes'}, {'kind': 'fence_post', 'x': 22, 'y': 24, 'id': 'dk_theodolite'},
    # the river stairs: the Harbour's notice, the survey plate set in the wall's top
    {'kind': 'sign', 'x': 19, 'y': 29, 'rot': 3, 'id': 'dk_hulls_notice'}, {'kind': 'sign', 'x': 19, 'y': 34, 'rot': 3, 'id': 'dk_plate'},
    # the railhead: the engine on the platform road, the ticket window, the water column, the buffer, the turntable
    {'kind': 'machine', 'x': 48, 'y': 6, 'rot': 1, 'id': 'dk_engine'}, {'kind': 'counter', 'x': 44, 'y': 11, 'rot': 0}, {'kind': 'sign', 'x': 43, 'y': 11, 'rot': 0, 'id': 'dk_line'},
    {'kind': 'chair', 'x': 52, 'y': 10, 'rot': 0}, {'kind': 'chair', 'x': 54, 'y': 10, 'rot': 0}, {'kind': 'lamp_post', 'x': 38, 'y': 10}, {'kind': 'lamp_post', 'x': 60, 'y': 10},
    {'kind': 'pump', 'x': 67, 'y': 10, 'id': 'dk_water_column'}, {'kind': 'sandbags', 'x': 26, 'y': 7}, {'kind': 'crate', 'x': 28, 'y': 3}, {'kind': 'crate', 'x': 29, 'y': 3}, {'kind': 'barrel_rust', 'x': 27, 'y': 11},
    # the quay tram's stop, and its tram
    {'kind': 'machine', 'x': 75, 'y': 12, 'rot': 1, 'id': 'dk_tram'}, {'kind': 'sign', 'x': 71, 'y': 13, 'rot': 0, 'id': 'dk_tram_sign'},
    # the guild's floor: racks, the counter, the notice on its door
    {'kind': 'shelf', 'x': 27, 'y': 18, 'rot': 2}, {'kind': 'shelf', 'x': 30, 'y': 18, 'rot': 2}, {'kind': 'shelf', 'x': 35, 'y': 18, 'rot': 2}, {'kind': 'shelf', 'x': 38, 'y': 18, 'rot': 2},
    {'kind': 'crate', 'x': 27, 'y': 22}, {'kind': 'crate', 'x': 28, 'y': 22}, {'kind': 'crate', 'x': 27, 'y': 23}, {'kind': 'crate', 'x': 37, 'y': 22}, {'kind': 'crate', 'x': 38, 'y': 23}, {'kind': 'barrel', 'x': 38, 'y': 25},
    {'kind': 'counter', 'x': 30, 'y': 25, 'rot': 0}, {'kind': 'locker', 'x': 26, 'y': 26, 'id': 'dk_floor_locker'}, {'kind': 'sign', 'x': 34, 'y': 28, 'rot': 0, 'id': 'dk_floor_notice'},
    # the weighbridge: the plate, the hut, the register
    {'kind': 'sign', 'x': 31, 'y': 32, 'rot': 0, 'id': 'dk_weighbridge'}, {'kind': 'table', 'x': 39, 'y': 31, 'id': 'dk_register'}, {'kind': 'chair', 'x': 40, 'y': 32, 'rot': 3},
    # the Bond: the gate sign, lit posts, the office desk
    {'kind': 'sign', 'x': 51, 'y': 34, 'rot': 0, 'id': 'dk_bond_sign'}, {'kind': 'lamp_post', 'x': 45, 'y': 17}, {'kind': 'lamp_post', 'x': 59, 'y': 32}, {'kind': 'lamp_post', 'x': 45, 'y': 32},
    {'kind': 'table', 'x': 57, 'y': 19, 'id': 'dk_bond_desk'}, {'kind': 'chair', 'x': 57, 'y': 20, 'rot': 0}, {'kind': 'terminal', 'x': 55, 'y': 18, 'rot': 0}, {'kind': 'shelf', 'x': 58, 'y': 18, 'rot': 3},
    # the Customs House: the framed Act, the court's table, benches, the Harbour Master's desk
    {'kind': 'sign', 'x': 66, 'y': 16, 'rot': 2, 'id': 'dk_act'}, {'kind': 'table', 'x': 68, 'y': 22}, {'kind': 'chair', 'x': 69, 'y': 22, 'rot': 3},
    {'kind': 'chair', 'x': 66, 'y': 25, 'rot': 0}, {'kind': 'chair', 'x': 68, 'y': 25, 'rot': 0}, {'kind': 'chair', 'x': 70, 'y': 25, 'rot': 0}, {'kind': 'shelf', 'x': 76, 'y': 24, 'rot': 3},
    {'kind': 'table', 'x': 74, 'y': 17, 'id': 'dk_dahl_desk'}, {'kind': 'chair', 'x': 74, 'y': 18, 'rot': 0}, {'kind': 'shelf', 'x': 72, 'y': 17, 'rot': 1}, {'kind': 'lamp_post', 'x': 62, 'y': 18},
    # the Stand: the tally board where the call-on posts the gangs
    {'kind': 'sign', 'x': 46, 'y': 35, 'rot': 0, 'id': 'dk_stand'}, {'kind': 'fire_barrel', 'x': 41, 'y': 36},
    # the fallen box and the tarp beside it
    {'kind': 'sign', 'x': 53, 'y': 42, 'rot': 0, 'id': 'dk_box'}, {'kind': 'blanket', 'x': 56, 'y': 42}, {'kind': 'debris', 'x': 49, 'y': 42},
    # the cranes along the Basin; Crane Six's ladder
    {'kind': 'windpump', 'x': 28, 'y': 44, 'id': 'dk_crane2'}, {'kind': 'windpump', 'x': 38, 'y': 44}, {'kind': 'windpump', 'x': 48, 'y': 44}, {'kind': 'windpump', 'x': 58, 'y': 44, 'id': 'dk_crane6'},
    {'kind': 'sign', 'x': 59, 'y': 45, 'rot': 0, 'id': 'dk_cab'}, {'kind': 'windpump', 'x': 69, 'y': 45},
    # the barge quay, the fish steps, the water stairs, the fuel berth
    {'kind': 'wagon', 'x': 28, 'y': 50, 'rot': 1, 'id': 'dk_barge'}, {'kind': 'sign', 'x': 24, 'y': 46, 'rot': 0, 'id': 'dk_barge_sign'}, {'kind': 'crate', 'x': 34, 'y': 46}, {'kind': 'crate', 'x': 35, 'y': 46},
    {'kind': 'counter', 'x': 46, 'y': 46, 'rot': 0}, {'kind': 'barrel', 'x': 43, 'y': 46}, {'kind': 'sign', 'x': 50, 'y': 46, 'rot': 0, 'id': 'dk_fish_sign'},
    {'kind': 'sign', 'x': 61, 'y': 46, 'rot': 0, 'id': 'dk_tide'}, {'kind': 'wagon', 'x': 64, 'y': 52, 'rot': 1, 'id': 'dk_tideboat'}, {'kind': 'lamp_post', 'x': 67, 'y': 46},
    {'kind': 'tank', 'x': 74, 'y': 45, 'id': 'dk_fuel'}, {'kind': 'pipe_h', 'x': 72, 'y': 46}, {'kind': 'barrel_rust', 'x': 77, 'y': 46},
    # the Boxes: Constance's, Oksana's, the cookshop, the bunk to let
    {'kind': 'cot', 'x': 65, 'y': 31, 'rot': 1}, {'kind': 'stove', 'x': 69, 'y': 31}, {'kind': 'table', 'x': 68, 'y': 32},
    {'kind': 'cot', 'x': 73, 'y': 31, 'rot': 1}, {'kind': 'cot', 'x': 77, 'y': 31, 'rot': 1}, {'kind': 'table', 'x': 75, 'y': 32, 'id': 'dk_tin_shelf'},
    {'kind': 'counter', 'x': 66, 'y': 39, 'rot': 0}, {'kind': 'stove', 'x': 65, 'y': 41}, {'kind': 'table', 'x': 69, 'y': 39}, {'kind': 'chair', 'x': 69, 'y': 40, 'rot': 0}, {'kind': 'sign', 'x': 68, 'y': 36, 'rot': 0, 'id': 'dk_cookshop'},
    {'kind': 'bed', 'x': 76, 'y': 40, 'rot': 1, 'id': 'dk_bunk_bed'}, {'kind': 'locker', 'x': 77, 'y': 38, 'id': 'dk_bunk_locker'}, {'kind': 'sign', 'x': 76, 'y': 36, 'rot': 0, 'id': 'dk_bunk'},
    # lamps along the quay
    {'kind': 'lamp_post', 'x': 23, 'y': 33}, {'kind': 'lamp_post', 'x': 42, 'y': 28}, {'kind': 'lamp_post', 'x': 62, 'y': 35}, {'kind': 'lamp_post', 'x': 33, 'y': 44}, {'kind': 'lamp_post', 'x': 53, 'y': 45},
]

spots = {
    'road': {'x': 22, 'y': 4}, 'road_lean': {'x': 24, 'y': 11},
    'cradle': {'x': 20, 'y': 9}, 'cradle_b': {'x': 21, 'y': 7},
    'hull_a': {'x': 15, 'y': 7}, 'hull_a_in': {'x': 10, 'y': 5}, 'hull_b': {'x': 14, 'y': 20}, 'hull_b_in': {'x': 8, 'y': 19},
    'hull_c': {'x': 15, 'y': 39}, 'nadia': {'x': 7, 'y': 38}, 'hull_d': {'x': 14, 'y': 52}, 'hull_d_in': {'x': 8, 'y': 51},
    'bed_fire_sit': {'x': 15, 'y': 15}, 'bed_pair_a': {'x': 15, 'y': 33}, 'bed_pair_b': {'x': 16, 'y': 33}, 'bed_work': {'x': 10, 'y': 30}, 'bed_lean': {'x': 15, 'y': 45},
    'stairs_top': {'x': 20, 'y': 31}, 'imogen': {'x': 23, 'y': 25}, 'stump_lean': {'x': 23, 'y': 28},
    'platform': {'x': 50, 'y': 10}, 'femi': {'x': 44, 'y': 10}, 'platform_sit': {'x': 53, 'y': 9}, 'platform_pair_a': {'x': 57, 'y': 10}, 'platform_pair_b': {'x': 58, 'y': 10}, 'yard_work': {'x': 28, 'y': 9}, 'yard_b': {'x': 72, 'y': 5},
    'tram_wait': {'x': 73, 'y': 12},
    'floor_counter': {'x': 30, 'y': 24}, 'floor_work': {'x': 34, 'y': 21}, 'floor_b': {'x': 36, 'y': 25},
    'tomas': {'x': 39, 'y': 32}, 'weigh_lean': {'x': 30, 'y': 30},
    'roux': {'x': 56, 'y': 20}, 'bond_gate': {'x': 52, 'y': 35}, 'bond_in': {'x': 52, 'y': 24}, 'bond_work': {'x': 52, 'y': 20}, 'bond_b': {'x': 47, 'y': 28},
    'dahl': {'x': 74, 'y': 19}, 'court': {'x': 63, 'y': 21}, 'court_sit': {'x': 66, 'y': 24}, 'court_sit_b': {'x': 70, 'y': 24}, 'clerk': {'x': 69, 'y': 21}, 'steps_guard': {'x': 62, 'y': 23},
    'stand': {'x': 48, 'y': 37}, 'stand_a': {'x': 43, 'y': 37}, 'stand_b': {'x': 45, 'y': 38}, 'stand_c': {'x': 51, 'y': 37}, 'stand_d': {'x': 54, 'y': 38}, 'stand_fire_sit': {'x': 42, 'y': 37},
    'breaker_a': {'x': 44, 'y': 39}, 'breaker_b': {'x': 47, 'y': 39}, 'breaker_c': {'x': 50, 'y': 38},
    'platt': {'x': 56, 'y': 37}, 'platt_day': {'x': 34, 'y': 24},
    'crane2': {'x': 27, 'y': 45}, 'crane6': {'x': 57, 'y': 45}, 'box_lean': {'x': 48, 'y': 41}, 'quay_work': {'x': 40, 'y': 45}, 'quay_patrol': {'x': 44, 'y': 43},
    'barge_work': {'x': 30, 'y': 48}, 'barge_b': {'x': 25, 'y': 48}, 'barge_lean': {'x': 34, 'y': 48},
    'grigor': {'x': 47, 'y': 47}, 'fish_work': {'x': 45, 'y': 48}, 'oksana': {'x': 44, 'y': 47}, 'fish_sit': {'x': 49, 'y': 48},
    'stairs': {'x': 63, 'y': 48}, 'stairs_lean': {'x': 65, 'y': 48}, 'fuel_work': {'x': 72, 'y': 48},
    'connie': {'x': 67, 'y': 32}, 'connie_bed': {'x': 66, 'y': 32}, 'oksana_home': {'x': 75, 'y': 33}, 'oksana_bed': {'x': 74, 'y': 32},
    'espe': {'x': 66, 'y': 38}, 'mirela': {'x': 70, 'y': 41}, 'cook_sit': {'x': 68, 'y': 40}, 'bunk': {'x': 75, 'y': 39},
    'boxes_pair_a': {'x': 71, 'y': 35}, 'boxes_pair_b': {'x': 72, 'y': 35}, 'boxes_lean': {'x': 71, 'y': 29}, 'boxes_sit': {'x': 77, 'y': 35},
    'kwabena_day': {'x': 10, 'y': 21}, 'abena_day': {'x': 12, 'y': 19}, 'thorne': {'x': 70, 'y': 21},
}

DAHL, CONNIE, PLATT, OKSANA, ROUX, IMOGEN, KWABENA, ABENA, MIRELA = (f'npc_dk_{n:02d}' for n in range(1, 10))
npcs = [
    {'def': DAHL, 'x': 74, 'y': 19, 'facing': 2},
    {'def': CONNIE, 'x': 48, 'y': 37, 'facing': 2},
    # the night gang-master: put off the quay if the guild hangs the blame on him
    {'def': PLATT, 'x': 56, 'y': 37, 'facing': 3, 'if': NOT(F('dk_platt', 'off'))},
    {'def': OKSANA, 'x': 44, 'y': 47, 'facing': 2, 'if': NOT(F('dk_oksana', 'gone'))},
    {'def': ROUX, 'x': 56, 'y': 20, 'facing': 2, 'if': NOT(F('dk_roux', 'recalled'))},
    {'def': IMOGEN, 'x': 23, 'y': 25, 'facing': 3, 'if': NOT(F('dk_hulls'))},
    {'def': KWABENA, 'x': 20, 'y': 9, 'facing': 3, 'if': NOT(F('dk_hulls', 'cleared'))},
    {'def': ABENA, 'x': 21, 'y': 7, 'facing': 3, 'if': NOT(F('dk_hulls', 'cleared'))},
    # the girl off the through: at the back of the cookshop until she goes (returned east, or away down the delta or south)
    {'def': MIRELA, 'x': 70, 'y': 41, 'facing': 3, 'if': NOT(ANY(F('dk_girl', 'returned'), F('dk_girl', 'shore'), F('dk_girl', 'choir')))},
    {'def': 'npc_dk_10', 'x': 47, 'y': 47, 'facing': 2},
    {'def': 'npc_dk_11', 'x': 66, 'y': 38, 'facing': 3},
    {'def': 'npc_dk_12', 'x': 44, 'y': 10, 'facing': 2},
    {'def': 'npc_dk_13', 'x': 39, 'y': 32, 'facing': 3},
    {'def': 'npc_dk_14', 'x': 7, 'y': 38, 'facing': 2, 'if': NOT(F('dk_hulls', 'cleared'))},
    # the guild's guards on the Customs House steps and the quay; the Concern's at the Bond's gate and inside it
    {'def': 'npc_dk_g1', 'x': 62, 'y': 23, 'facing': 3}, {'def': 'npc_dk_g2', 'x': 44, 'y': 43, 'facing': 1},
    {'def': 'npc_dk_c1', 'x': 52, 'y': 35, 'facing': 2}, {'def': 'npc_dk_c2', 'x': 52, 'y': 24, 'facing': 2},
    # the hired men from the Ring the guild sends for when the Stand blacks the Bond: on the Stand at dawn until it is settled
    {'def': 'npc_dk_h1', 'x': 44, 'y': 39, 'facing': 0, 'schedule': [], 'if': ALL(F('dk_crane', 'black'), NOT(F('dk_black')), HOURS(4, 10))},
    {'def': 'npc_dk_h2', 'x': 47, 'y': 39, 'facing': 0, 'schedule': [], 'if': ALL(F('dk_crane', 'black'), NOT(F('dk_black')), HOURS(4, 10))},
    {'def': 'npc_dk_h3', 'x': 50, 'y': 38, 'facing': 0, 'schedule': [], 'if': ALL(F('dk_crane', 'black'), ANY(NOT(F('dk_black')), F('dk_breakers_fight')), HOURS(4, 10))},
    # a factor the shore put off: sent back to a desk under the Harbour Master (B5b, Oil on the Water)
    {'def': 'npc_ds_04', 'id': 'npc_ds_04_carrick', 'x': 70, 'y': 21, 'facing': 3, 'schedule': [], 'dialogue': 'd_dk_thorne', 'if': F('ds_thorne', 'fled')},
    # the Long Night (B5d): the city's warden car run straight through on the guild's green, at the buffer, waiting for the van
    {'def': 'npc_sh_05', 'id': 'ln_calla_dk', 'x': 61, 'y': 9, 'facing': 3, 'schedule': [], 'dialogue': 'd_ln_carrick', 'if': ALL(F('ln_car', 'carrick'), NOT(F('ln_calla')))},
    {'def': 'npc_ln_e1', 'x': 62, 'y': 10, 'facing': 3, 'if': ALL(F('ln_car', 'carrick'), NOT(F('ln_calla')))},
    {'def': 'npc_ln_e2', 'x': 64, 'y': 9, 'facing': 3, 'if': ALL(F('ln_car', 'carrick'), NOT(F('ln_calla')))},
    # Act 3 (B6b): Nine hidden from its recall in the forward hold of the north hull, the cradle's people keeping it, until fetched
    # (B6k: or until the Ledger's card has come, when it walks in to the Spire's close written off: B6l's NINE_WALKIN)
    {'def': 'npc_md_nine', 'id': 'npc_md_nine_hulls', 'x': 10, 'y': 5, 'facing': 1, 'schedule': [], 'dialogue': 'd_a3_nine_hid',
     'if': ALL(F('a3_nine_hid', 'hulls'), NOT({'inParty': 'npc_md_nine'}), NOT(F('a3_nine_fetched')), NOT(ANY(F('nine_left'), F('nine_gone'), F('nine_disposed'), F('a3_nine_struck'))), NOT(F('a3_summoned')))},
]

# Act 3 (B6k): Sixty at the Buffer. The reserve carried west in the wardens' car (the word, forced, or its own vote) is received by
# Precinct Supply at the Line's buffer under the freight shed, on the designate's word; the column holds the car there until the
# designate comes (the car itself is the runtime's to build: props have no conditions). Then where they went: the Boxes (the
# Harbour court, the Stand) or the Star in the Hulls (the cradle's night). Mirrors src/content/world/a3_conds.ts (B6k block).
CARRIED_WEST = ALL(F('a3_c9', 'relocated'), ANY(F('a3_c9_how', 'order'), F('a3_c9_how', 'forced'), F('a3_c9_how', 'consent')))
PLATFORM_OPEN = ALL(CARRIED_WEST, NOT(F('a3_c9_after')))
WALKED = ALL(CARRIED_WEST, F('a3_c9_after', 'walked'))
BY_CRADLE = F('a3_buffer_how', 'cradle')
LED_BY_LOWE = NOT({'dead': 'npc_md_01'})
LED_BY_REYES = ALL({'dead': 'npc_md_01'}, NOT({'dead': 'npc_md_12'}))
WARDEN_UP = lambda i: NOT(ANY({'dead': i}, {'dead': i + '_apron'}))
TAM_STOOD = ALL(F('tam_left', 'door'), NOT(F('a3_tamsin_dead')))
B6K_NPCS = [
    # the column's lead at the tailboard (Lowe, or Reyes; Kress leads when both are dead, and is always at the car), a warden
    {'def': 'npc_md_01', 'id': 'npc_md_01_buffer', 'x': 59, 'y': 8, 'facing': 3, 'schedule': [], 'dialogue': 'd_a3_platform', 'if': ALL(PLATFORM_OPEN, LED_BY_LOWE)},
    {'def': 'npc_md_12', 'id': 'npc_md_12_buffer', 'x': 59, 'y': 8, 'facing': 3, 'schedule': [], 'dialogue': 'd_a3_platform', 'if': ALL(PLATFORM_OPEN, LED_BY_REYES)},
    {'def': 'npc_a3_g3', 'id': 'npc_a3_g3_buffer', 'x': 61, 'y': 8, 'facing': 3, 'schedule': [], 'dialogue': 'd_a3_platform', 'if': ALL(PLATFORM_OPEN, WARDEN_UP('npc_a3_g3'))},
    {'def': 'npc_a3_g4', 'id': 'npc_a3_g4_buffer', 'x': 57, 'y': 8, 'facing': 3, 'schedule': [], 'if': ALL(PLATFORM_OPEN, WARDEN_UP('npc_a3_g4'))},
    # through the slats (or on the platform's edge, by their own vote): Ines and Effie
    {'def': 'npc_c9_01', 'id': 'npc_c9_01_buffer', 'x': 62, 'y': 6, 'facing': 2, 'schedule': [], 'dialogue': 'd_a3_platform', 'if': PLATFORM_OPEN},
    {'def': 'npc_c9_r4', 'id': 'npc_c9_r4_buffer', 'x': 64, 'y': 6, 'facing': 2, 'schedule': [], 'dialogue': 'd_a3_platform', 'if': PLATFORM_OPEN},
    # Tamsin, who walked behind the car from Knock, against its wheel
    {'def': 'npc_c9_03', 'id': 'npc_c9_03_buffer', 'x': 63, 'y': 10, 'facing': 0, 'schedule': [], 'dialogue': 'd_a3_tam_after', 'if': ALL(TAM_STOOD, PLATFORM_OPEN)},
    # walked: in front of the Boxes (the court, the Stand), or aboard the Benguela Star by its crew books (the cradle)
    {'def': 'npc_c9_01', 'id': 'npc_c9_01_carrick', 'x': 66, 'y': 35, 'facing': 2, 'schedule': [], 'dialogue': 'd_a3_ck_ines', 'if': ALL(WALKED, NOT(BY_CRADLE))},
    {'def': 'npc_c9_r4', 'id': 'npc_c9_r4_carrick', 'x': 48, 'y': 47, 'facing': 2, 'schedule': [], 'dialogue': 'd_a3_ck_effie', 'if': ALL(WALKED, NOT(BY_CRADLE))},
    {'def': 'npc_c9_03', 'id': 'npc_c9_03_carrick', 'x': 68, 'y': 35, 'facing': 2, 'schedule': [], 'dialogue': 'd_a3_tam_after', 'if': ALL(TAM_STOOD, WALKED, NOT(BY_CRADLE))},
    {'def': 'npc_c9_01', 'id': 'npc_c9_01_hulls', 'x': 9, 'y': 7, 'facing': 1, 'schedule': [], 'dialogue': 'd_a3_ck_ines', 'if': ALL(WALKED, BY_CRADLE)},
    {'def': 'npc_c9_r4', 'id': 'npc_c9_r4_hulls', 'x': 13, 'y': 4, 'facing': 2, 'schedule': [], 'dialogue': 'd_a3_ck_effie', 'if': ALL(WALKED, BY_CRADLE)},
    {'def': 'npc_c9_03', 'id': 'npc_c9_03_hulls', 'x': 11, 'y': 9, 'facing': 0, 'schedule': [], 'dialogue': 'd_a3_tam_after', 'if': ALL(TAM_STOOD, WALKED, BY_CRADLE)},
]
npcs += B6K_NPCS

spawns = [
    {'id': 'start', 'x': 22, 'y': 2, 'facing': 2}, {'id': 'from_precinct', 'x': 22, 'y': 2, 'facing': 2},
    {'id': 'platform', 'x': 50, 'y': 10, 'facing': 2}, {'id': 'yard', 'x': 72, 'y': 6, 'facing': 3},
    {'id': 'stairs', 'x': 63, 'y': 48, 'facing': 0}, {'id': 'barge', 'x': 29, 'y': 47, 'facing': 0},
    {'id': 'tram', 'x': 72, 'y': 12, 'facing': 3}, {'id': 'hulls', 'x': 16, 'y': 30, 'facing': 3}, {'id': 'cradle', 'x': 21, 'y': 10, 'facing': 3},
    {'id': 'bunk', 'x': 75, 'y': 39, 'facing': 0}, {'id': 'court', 'x': 63, 'y': 21, 'facing': 1},
]

exits = [
    {'x': 21, 'y': 0, 'w': 4, 'h': 1, 'to': {'location': 'md_precinct', 'spawn': 'from_docks'}, 'label': 'The river road, round by the Wall to the Precinct\'s gate', 'effects': [{'time': 60}]},
]

TALK = {
    'dk_road_sign': ('d_dk_road_sign', 'Chalk on a bollard'), 'dk_crane1': ('d_dk_cradle', 'The dead crane'), 'dk_cradle': ('d_dk_cradle', 'The cradle\'s winch'),
    'dk_crewbooks': ('d_dk_crewbooks', 'The crew books'), 'dk_stakes': ('d_dk_stakes', 'The blue stakes'), 'dk_theodolite': ('d_dk_stakes', 'The survey'),
    'dk_hulls_notice': ('d_dk_hulls_notice', 'A Harbour notice'), 'dk_plate': ('d_dk_plate', 'A brass plate'),
    'dk_engine': ('d_dk_engine', 'The engine'), 'dk_line': ('d_dk_line', 'The Line — Carrick'), 'dk_water_column': ('d_dk_engine', 'The water column'),
    'dk_tram': ('d_dk_tram', 'The quay tram'), 'dk_tram_sign': ('d_dk_tram', 'The quay tram\'s stop'),
    'dk_floor_notice': ('d_dk_floor_notice', 'Notices on the floor\'s door'), 'dk_weighbridge': ('d_dk_weighbridge', 'The weighbridge'), 'dk_register': ('d_dk_weighbridge', 'The register'),
    'dk_bond_sign': ('d_dk_bond_sign', 'The Bond'), 'dk_bond_desk': ('d_dk_bond_desk', 'The bond officer\'s desk'),
    'dk_act': ('d_dk_act', 'The Harbour Act'), 'dk_dahl_desk': ('d_dk_act', 'The Harbour Master\'s desk'),
    'dk_stand': ('d_dk_stand', 'The tally board'), 'dk_box': ('d_dk_box', 'The fallen box'), 'dk_crane6': ('d_dk_cab', 'Crane Six'), 'dk_cab': ('d_dk_cab', 'Crane Six\'s ladder'),
    'dk_crane2': ('d_dk_crane2', 'Crane Two'), 'dk_barge': ('d_dk_barge', 'A barge'), 'dk_barge_sign': ('d_dk_barge', 'The barge quay'), 'dk_fish_sign': ('d_dk_fish', 'The fish steps'),
    'dk_tide': ('d_dk_tide', 'The water stairs'), 'dk_tideboat': ('d_dk_tide', 'The tide boat'), 'dk_fuel': ('d_dk_fuel', 'The fuel berth'),
    'dk_tin_shelf': ('d_dk_tin', 'A shelf in the box'), 'dk_cookshop': ('d_dk_cookshop', 'Espe\'s'), 'dk_bunk': ('d_dk_bunk', 'A bunk to let'), 'dk_bunk_bed': ('d_dk_bunk', 'The bunk'),
}

md_docks = {
    'id': 'md_docks', 'name': 'Meridian — Carrick', 'seed': 91, 'settlement': 'meridian',
    'layout': rows,
    'legend': {
        'c': {'floor': 'concrete'}, 'a': {'floor': 'asphalt'}, 'm': {'floor': 'metal'}, 'g': {'floor': 'grate'}, 'd': {'floor': 'dirt'}, 'k': {'floor': 'rubble'},
        'b': {'floor': 'wood'}, 't': {'floor': 'tile'}, 'n': {'floor': 'tile'}, 'h': {'floor': 'metal'}, 'f': {'floor': 'wood'},
        'w': {'floor': 'water'}, 'W': {'floor': 'water', 'blocks': True},
        'R': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 4},
        'Q': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 5.5},
        'P': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 1.0},
        'H': {'wall': 'metal', 'floor': 'metal', 'wallHeight': 4.2, 'roof': 'none'},
        'B': {'wall': 'brick', 'floor': 'metal', 'wallHeight': 5, 'roof': 'pitched'},
        'M': {'wall': 'metal', 'floor': 'concrete', 'wallHeight': 2.6, 'roof': 'tin'},
        'F': {'wall': 'fence', 'floor': 'concrete', 'wallHeight': 2.6},
        'K': {'wall': 'metal', 'floor': 'tile', 'wallHeight': 2.8, 'roof': 'flat'},
        'E': {'wall': 'brick', 'floor': 'tile', 'wallHeight': 4.5, 'roof': 'flat'},
        'C': {'wall': 'concrete', 'floor': 'tile', 'wallHeight': 3.2},
        'X': {'wall': 'metal', 'floor': 'wood', 'wallHeight': 2.6, 'roof': 'flat'},
    },
    'props': props,
    'lights': [
        # the railhead: work lamps under the shed roof, the yard throat
        {'x': 38, 'y': 10, 'height': 4.4, 'color': 'hex:0xffd8a0', 'intensity': 2.4, 'range': 11}, {'x': 60, 'y': 10, 'height': 4.4, 'color': 'hex:0xffd8a0', 'intensity': 2.4, 'range': 11},
        {'x': 44, 'y': 11, 'height': 2.4, 'color': 'hex:0xffe4b8', 'intensity': 1.6, 'range': 6}, {'x': 72, 'y': 6, 'height': 4.0, 'color': 'hex:0xffc070', 'intensity': 2.0, 'range': 10, 'flicker': 0.15},
        {'x': 75, 'y': 12, 'height': 2.6, 'color': 'hex:0xa8e0ff', 'intensity': 1.6, 'range': 7}, {'x': 25, 'y': 14, 'height': 3.6, 'color': 'hex:0xffb060', 'intensity': 2.0, 'range': 10, 'flicker': 0.2},
        # the guild's floor and the weighbridge
        {'x': 32, 'y': 22, 'height': 4.0, 'color': 'hex:0xffe0b0', 'intensity': 2.0, 'range': 10}, {'x': 39, 'y': 31, 'height': 2.2, 'color': 'hex:0xffd090', 'intensity': 1.4, 'range': 5}, {'x': 42, 'y': 28, 'height': 3.6, 'color': 'hex:0xffb060', 'intensity': 2.0, 'range': 10},
        # the Bond: the Concern's clean white, and the trim along its fence
        {'x': 45, 'y': 17, 'height': 4.2, 'color': 'hex:0xf0f6ff', 'intensity': 3.0, 'range': 13}, {'x': 59, 'y': 32, 'height': 4.2, 'color': 'hex:0xf0f6ff', 'intensity': 3.0, 'range': 13}, {'x': 45, 'y': 32, 'height': 4.2, 'color': 'hex:0xf0f6ff', 'intensity': 3.0, 'range': 13},
        {'x': 52, 'y': 33, 'height': 1.2, 'color': 'hex:0x60e8ff', 'intensity': 1.6, 'range': 5}, {'x': 57, 'y': 19, 'height': 2.4, 'color': 'hex:0xe8f4ff', 'intensity': 1.8, 'range': 6},
        # the Customs House
        {'x': 62, 'y': 18, 'height': 3.6, 'color': 'hex:0xffe4c0', 'intensity': 2.2, 'range': 10}, {'x': 68, 'y': 22, 'height': 3.4, 'color': 'hex:0xffe4c0', 'intensity': 1.8, 'range': 8}, {'x': 74, 'y': 18, 'height': 2.6, 'color': 'hex:0xffd8a0', 'intensity': 1.4, 'range': 5},
        # the Stand's fire, the quay lamps, Crane Six's cab light
        {'x': 41, 'y': 36, 'height': 0.8, 'color': 'hex:0xff9a40', 'intensity': 1.6, 'range': 6, 'flicker': 0.35}, {'x': 62, 'y': 35, 'height': 3.6, 'color': 'hex:0xffb060', 'intensity': 2.0, 'range': 10, 'flicker': 0.15},
        {'x': 33, 'y': 44, 'height': 3.6, 'color': 'hex:0xffb060', 'intensity': 2.0, 'range': 10}, {'x': 53, 'y': 45, 'height': 3.6, 'color': 'hex:0xffb060', 'intensity': 2.0, 'range': 10},
        {'x': 58, 'y': 44, 'height': 9.0, 'color': 'hex:0xff6040', 'intensity': 1.6, 'range': 12, 'flicker': 0.2},
        # the water stairs, the fish steps, the fuel berth
        {'x': 67, 'y': 46, 'height': 3.4, 'color': 'hex:0xffd090', 'intensity': 1.8, 'range': 9}, {'x': 46, 'y': 46, 'height': 2.0, 'color': 'hex:0xffc080', 'intensity': 1.2, 'range': 5, 'flicker': 0.2}, {'x': 74, 'y': 46, 'height': 2.6, 'color': 'hex:0xffa050', 'intensity': 1.2, 'range': 6},
        # the Boxes: lamps in doorways, the cookshop's stove
        {'x': 67, 'y': 35, 'height': 2.4, 'color': 'hex:0xffb070', 'intensity': 1.4, 'range': 6, 'flicker': 0.25}, {'x': 65, 'y': 40, 'height': 1.2, 'color': 'hex:0xff9040', 'intensity': 1.4, 'range': 5, 'flicker': 0.3},
        {'x': 75, 'y': 35, 'height': 2.4, 'color': 'hex:0xffb070', 'intensity': 1.2, 'range': 5, 'flicker': 0.25},
        # the Hulls: fires on the bed, the cradle's lamp on the bank, and Bridgeward's lamps across the river
        {'x': 15, 'y': 14, 'height': 0.8, 'color': 'hex:0xff9a40', 'intensity': 1.6, 'range': 6, 'flicker': 0.35}, {'x': 15, 'y': 46, 'height': 0.8, 'color': 'hex:0xff9a40', 'intensity': 1.6, 'range': 6, 'flicker': 0.35},
        {'x': 8, 'y': 7, 'height': 2.6, 'color': 'hex:0xffb070', 'intensity': 1.2, 'range': 6, 'flicker': 0.2}, {'x': 8, 'y': 38, 'height': 2.6, 'color': 'hex:0xffb070', 'intensity': 1.2, 'range': 6, 'flicker': 0.2},
        {'x': 20, 'y': 8, 'height': 3.0, 'color': 'hex:0x90ff90', 'intensity': 1.2, 'range': 6, 'flicker': 0.3}, {'x': 1, 'y': 26, 'height': 9.0, 'color': 'hex:0xffb060', 'intensity': 1.4, 'range': 14, 'flicker': 0.2},
    ],
    'spawns': spawns,
    'exits': exits,
    'talk': {k: {'dialogue': v[0], 'name': v[1]} for k, v in TALK.items()},
    'containers': {
        'dk_floor_locker': {'name': 'Floor Locker', 'items': [['t_repair', 1], ['j_wiring', 3], ['c_water', 2]], 'tolls': 25, 'lock': 45},
        'dk_nadia_box': {'name': 'Nadia\'s Box', 'items': [['j_electronics', 2], ['a_9mm', 10], ['c_bandage', 2]], 'tolls': 30, 'lock': 40},
        'dk_bunk_locker': {'name': 'Bunk Locker', 'items': [], 'yoursIf': {'flag': 'dk_bunk_rented'}},
    },
    'spots': spots,
    'npcs': npcs,
    'triggers': [
        {'id': 'arrive', 'x': 21, 'y': 1, 'w': 4, 'h': 6, 'text': 'Carrick: the Docks. The river road comes off the Wall\'s shoulder and down onto a quay as wide as a field, and the city you just left is behind you across a river with no water in it. Cranes along the far side of everything, three storeys high, most of them dead and one of them moving. A freight shed with a train under its roof. A fenced yard lit white in the middle of the day. Boxes stacked into a town. The smell of salt, fish, diesel and bodies working.', 'effects': [{'learn': 'seen_docks'}, {'set': 'dk_open'}]},
        {'id': 'arrive_line', 'x': 34, 'y': 8, 'w': 31, 'h': 4, 'text': 'The end of the Line: a brick freight shed as long as a street, its roof glass gone to frames, a platform down one side, a buffer stop at the far end with a lamp on it, and steam from the engine standing in the light. Beyond the shed\'s mouth, cranes, and a quay that smells of the sea. The guard calls it from the step: CARRICK. ALL CHANGE. NOWHERE TO CHANGE TO.', 'effects': [{'learn': 'seen_docks'}, {'set': 'dk_open'}]},
        {'id': 'arrive_water', 'x': 61, 'y': 46, 'w': 6, 'h': 4, 'text': 'The water stairs: worn granite going down into the Basin, green to the third step, with iron rings in the wall for boats. Above them, the quay: cranes, a fenced yard lit white, a stone building with a flag, and a town of stacked boxes. The city is across a river with no water in it, close enough to hear its bells.', 'effects': [{'learn': 'seen_docks'}, {'set': 'dk_open'}]},
        {'id': 'box', 'x': 47, 'y': 39, 'w': 11, 'h': 5, 'if': NOT(F('dk_crane')), 'text': 'Under Crane Six a forty-foot box lies split on the quay where it fell in the night, one end crushed into the concrete. Beside it a tarp over something the shape of a man, with a pair of boots out from under it. Dockers walk round the tarp without looking at it, the way you walk round a hole you know is there. Nobody has moved the box. Nobody has moved him.', 'effects': [{'learn': 'dk_box_seen'}, {'quest': 'q_dk_crane', 'start': True}]},
        {'id': 'stand', 'x': 40, 'y': 35, 'w': 18, 'h': 4, 'if': NOT(F('dk_crane')), 'text': 'The Stand: a white line painted along the quay, worn to a ghost by boots, where the dockers stand at dawn for the call-on and the gang-masters walk down it choosing. A tally board on a post. Gang Nine\'s names on it have a chalk line through them.', 'effects': [{'learn': 'dk_stand_seen'}]},
        {'id': 'bond', 'x': 49, 'y': 34, 'w': 7, 'h': 3, 'text': 'The Bond: a yard fenced in good mesh with a light on every post, white light, even at noon. Sealed boxes stacked inside with the closed eye stencilled on their doors, a clean office at the back, and two guards at the gate in grey that has never been near a crane. The Concern\'s, by the Harbour Act: inside the fence the Harbour Master\'s word stops.', 'effects': [{'learn': 'dk_bond_seen'}]},
        {'id': 'hulls', 'x': 15, 'y': 28, 'w': 6, 'h': 6, 'if': NOT(F('dk_hulls')), 'text': 'The river stairs go down through the wall onto the bed of a river that stopped ninety years ago. Down there, ships: real ones, long as streets, sitting on the dry bed where the water left them, rust to the rails, with washing on their rails and smoke from their funnels and ladders down their sides. Children on a gangway. Blue stakes driven in among them in a line, new.', 'effects': [{'learn': 'dk_hulls_seen'}, {'quest': 'q_dk_far', 'start': True}]},
        {'id': 'customs', 'x': 61, 'y': 19, 'w': 3, 'h': 5, 'text': 'The Customs House: stone, four storeys of it, the only building on the quay with every window glazed. CUSTOMS on the lintel in letters cut for a thousand years, and under it, painted for ninety: HARBOUR MASTER — BY THE ACT. The steps are worn hollow in the middle. A guild guard sits on them with a shotgun across his knees as if the steps were a chair he had been given.', 'effects': [{'learn': 'dk_customs_seen'}]},
        # the hired men the guild sends for when the Stand blacks the Bond: they wait on the Stand at dawn until it is settled
        {'id': 'breakers', 'x': 40, 'y': 35, 'w': 18, 'h': 6, 'once': False, 'if': ALL(F('dk_crane', 'black'), NOT(F('dk_black')), HOURS(4, 10)), 'effects': [{'event': 'dialogue', 'data': {'tree': 'd_dk_breakers', 'name': 'The Stand'}}]},
        # B6k: the first step onto the platform's end with the relocation car at the buffer opens its scene
        {'id': 'a3_buffer', 'x': 55, 'y': 5, 'w': 11, 'h': 6, 'if': PLATFORM_OPEN, 'effects': [{'quest': 'q_a3_platform', 'start': True}, {'event': 'dialogue', 'data': {'tree': 'd_a3_platform', 'name': 'The buffer'}}]},
    ],
    'extras': [
        {'count': 8, 'roles': ['labourer', 'labourer', 'labourer', 'street', 'trader'], 'life': 'hard', 'area': {'x': 20, 'y': 34, 'w': 44, 'h': 12}, 'spots': ['stand_a', 'stand_b', 'stand_c', 'stand_d', 'stand_fire_sit', 'quay_work', 'box_lean'], 'hours': {'from': 4, 'to': 22}, 'talk': 'd_dk_x_docker',
         'barks': ['Gang Nine stood down. No tally, no funeral. That\'s the guild.', 'Six lifts heavy and Six lifts at night. Ask why.', 'Platt calls you or he doesn\'t. Don\'t look at him.', 'The Bond lights never go off. What do they need to see?', 'Dmytro never dropped a box. Never.']},
        {'count': 4, 'roles': ['labourer', 'trader', 'guard'], 'life': 'hard', 'area': {'x': 25, 'y': 2, 'w': 50, 'h': 11}, 'spots': ['platform_sit', 'platform_pair_a', 'platform_pair_b', 'yard_work', 'yard_b'], 'hours': {'from': 6, 'to': 20}, 'talk': 'd_dk_x_docker',
         'barks': ['Seven o\'clock\'s in at five. Never before.', 'Through comes in at the throat and the Bond takes it. Nobody gets a look.', 'Water for the engine, coal for nobody. Sixty drinks.']},
        {'count': 3, 'roles': ['fisher', 'fisher', 'trader'], 'life': 'hard', 'area': {'x': 40, 'y': 45, 'w': 12, 'h': 4}, 'spots': ['fish_work', 'fish_sit'], 'hours': {'from': 4, 'to': 14}, 'talk': 'd_dk_x_docker',
         'barks': ['Mullet off the wall. Small, but they\'re here.', 'Grigor\'s steps, Grigor\'s fish. Ask him nice.', 'The tide boat\'s in on the flood. Salt from the delta.']},
        {'count': 5, 'roles': ['drifter', 'settler', 'street', 'labourer'], 'life': 'starved', 'ages': [5, 72], 'area': {'x': 1, 'y': 12, 'w': 16, 'h': 34}, 'spots': ['bed_fire_sit', 'bed_pair_a', 'bed_pair_b', 'bed_work', 'bed_lean', 'hull_b'], 'hours': {'from': 6, 'to': 22}, 'talk': 'd_dk_x_hulls',
         'barks': ['Blue stakes. Somebody\'s building something over us.', 'My grandmother was born on the Star. So was I.', 'Cradle\'s five a head. Ask Kobby. Ask at night.', 'The river stopped and we didn\'t.']},
        {'count': 4, 'roles': ['settler', 'labourer', 'street'], 'life': 'hard', 'ages': [6, 70], 'area': {'x': 63, 'y': 28, 'w': 16, 'h': 16}, 'spots': ['boxes_pair_a', 'boxes_pair_b', 'boxes_lean', 'boxes_sit', 'cook_sit'], 'hours': {'from': 5, 'to': 23}, 'talk': 'd_dk_x_docker',
         'barks': ['Espe\'s soup is mostly hot. That\'s the best thing about it.', 'Four to a box. Five if you\'re friendly.', 'Oksana\'s girl coughs all night. You get used to it. You don\'t.']},
        {'count': 2, 'roles': ['corp', 'tech'], 'life': 'soft', 'area': {'x': 45, 'y': 17, 'w': 15, 'h': 16}, 'spots': ['bond_work', 'bond_b'], 'hours': {'from': 6, 'to': 20}, 'talk': 'd_dk_x_bond',
         'barks': ['Please stay outside the line.', 'Everything in the yard is under bond.', 'The seal is the manifest. The manifest is the seal.']},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0xa4aeb4', 'fogDensity': 0.013, 'dust': 0.05, 'grade': 0.22, 'mood': 'bustling', 'sound': 'murmur'},
}
check('md_docks', rows, md_docks['legend'], props, spawns, npcs, spots, 'start', TALK.keys(), exits)

HEADER = "import type { MapDef } from '../../engine/data/types';\n\n// Generated by tools/maps/gen_md_docks.py — edit the generator, then re-run it.\n"
with open(os.path.join(ROOT, 'src', 'content', 'maps', 'md_docks.ts'), 'w') as f:
    f.write(f"{HEADER}export const md_docks: MapDef = {ts(md_docks)};\n")
print('md_docks', W, 'x', H)
