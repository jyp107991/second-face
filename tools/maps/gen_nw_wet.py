#!/usr/bin/env python3
"""Generates the Northern Wet's maps (B5c): src/content/maps/nw_sawtown.ts, nw_dam.ts, nw_gallery.ts, nw_landing.ts, nw_bank.ts.

Sawtown (`timber`): a logging town at the north-east arm of Ashby Water. The Ridge's ground climbs north behind the town,
full of stumps, with the Brandvold crew's bunkhouse and the foreman's house on it and the old cut where his son died; the
street of timber houses and the cookhouse below; the pre-war turbine sawmill on its race in the east; the boom (the sorting
pens out on the water on log walkways) and the boom-keeper's office on the shore; the Bottoms' skid camp along the west shore;
the barge landing; and the railhead of the north track from Yard Nine in the south-east.

Ashby Dam (`dam`): the Water to the north; the crest across the middle, a road from the lock at the west end to the gatehouse
on the east abutment; the gauge-well hut standing out over the upstream face; the dam's body and its spillway; the river
below; the lock-keeper's hut on the west bank; the keepers' houses and the tailrace on the east bank; the path to Low Landing
going south and the shore path east to Sawtown.

The gallery (a cell): the inspection gallery inside the dam, down the gatehouse stair: wet concrete, the drain, the crack
and its pins.

Low Landing (`riverdock`): the river along the west; the quay; the barges moored to it (the Patience, the guild's barge,
a hulk with a berth); the guild's winch house and barge office; the chandler; houses on posts above the flood line; the shells
of the old campus halls behind; the towpath north to the dam and the road south to the city.

The riverbank (a cell): the roadside map for the Wet's road and river encounters.
    python3 tools/maps/gen_nw_wet.py
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
    'a': {'floor': 'asphalt'}, 'g': {'floor': 'grate'}, 's': {'floor': 'sand'},
    'x': {'floor': 'water'}, 'X': {'floor': 'water', 'blocks': True},
    'R': {'wall': 'rock', 'floor': 'rubble', 'wallHeight': 6},
    'P': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 0.9},
    'D': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 9, 'roof': 'flat'},
    'H': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 7.5, 'roof': 'flat'},
    'G': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 7.5, 'roof': 'none'},
    'C': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 3.6, 'roof': 'flat'},
    'B': {'wall': 'brick', 'floor': 'wood', 'wallHeight': 4.0, 'roof': 'pitched'},
    'M': {'wall': 'metal', 'floor': 'metal', 'wallHeight': 3.0, 'roof': 'tin'},
    'W': {'wall': 'wood', 'floor': 'wood', 'wallHeight': 3.2, 'roof': 'pitched'},
    'S': {'wall': 'scrap', 'floor': 'wood', 'wallHeight': 2.6, 'roof': 'tin'},
    'F': {'wall': 'fence', 'floor': 'dirt', 'wallHeight': 1.4},
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

# ================================================================ Sawtown
W, H = 72, 52
g = grid(W, H, 'd')
border(g)
# Ashby Water: the lake's arm fills the south-west; shallows along the shore
fill(g, 1, 34, 46, 50, 'X'); fill(g, 1, 32, 46, 33, 'x')
# the boom: log walkways out over the water round the sorting pens
for y in (35, 40, 45):
    fill(g, 8, y, 36, y, 'w')
for x in (8, 15, 22, 29, 36):
    fill(g, x, 34, x, 45, 'w')
for (x0, x1) in ((9, 14), (16, 21), (23, 28), (30, 35)):
    fill(g, x0, 36, x1, 39, 'x'); fill(g, x0, 41, x1, 44, 'x')   # the pens: shallow, logs afloat in them
# the barge landing: a jetty and the barge tied to it
fill(g, 40, 33, 42, 41, 'w'); fill(g, 38, 42, 45, 46, 'w')
# the mill race from the north, under the mill and out to the Water
fill(g, 61, 1, 62, 33, 'x'); fill(g, 47, 32, 62, 33, 'x')
building(g, 46, 19, 59, 30, 'H', 'c', [(52, 30), (46, 24)])   # the sawmill
building(g, 11, 25, 18, 30, 'W', 'w', [(15, 30)])              # the boom-keeper's office
building(g, 28, 17, 37, 24, 'W', 'w', [(32, 24)])              # the cookhouse
building(g, 20, 17, 25, 22, 'W', 'w', [(22, 22)])              # a house
building(g, 39, 17, 43, 22, 'W', 'w', [(41, 22)])              # a house
building(g, 20, 10, 25, 14, 'W', 'w', [(22, 14)])              # a house up the slope
# the Ridge: the Brandvold crew's bunkhouse and the foreman's house on the slope
building(g, 40, 3, 51, 9, 'W', 'w', [(45, 9)])
building(g, 53, 3, 59, 9, 'W', 'w', [(56, 9)])
# the Bottoms: the Huaman crew's skid shed on the west shore
building(g, 2, 17, 8, 23, 'S', 'w', [(5, 23)])
# the railhead: the north track's rails in from the south-east, a loading stage
fill(g, 50, 40, 70, 41, 'g'); fill(g, 52, 37, 58, 39, 'c')
rows = [''.join(r) for r in g]
props = [
    # the boom: the notice, logs in the pens, the tally desk
    {'kind': 'sign', 'x': 19, 'y': 31, 'rot': 0, 'id': 'nw_st_notice'}, {'kind': 'pipe_h', 'x': 11, 'y': 37}, {'kind': 'pipe_h', 'x': 12, 'y': 38}, {'kind': 'pipe_h', 'x': 18, 'y': 37},
    {'kind': 'pipe_h', 'x': 25, 'y': 42}, {'kind': 'pipe_h', 'x': 32, 'y': 37}, {'kind': 'pipe_h', 'x': 33, 'y': 43}, {'kind': 'pipe_h', 'x': 19, 'y': 43},
    {'kind': 'debris', 'x': 31, 'y': 38, 'id': 'nw_st_pen'}, {'kind': 'lamp_post', 'x': 22, 'y': 34}, {'kind': 'lamp_post', 'x': 36, 'y': 34},
    {'kind': 'table', 'x': 13, 'y': 27}, {'kind': 'chair', 'x': 13, 'y': 28, 'rot': 0}, {'kind': 'shelf', 'x': 17, 'y': 26, 'rot': 3}, {'kind': 'sign', 'x': 16, 'y': 26, 'rot': 2, 'id': 'nw_st_tally'},
    {'kind': 'cot', 'x': 12, 'y': 29, 'rot': 1},
    # the landing and the barge
    {'kind': 'sign', 'x': 42, 'y': 32, 'rot': 0, 'id': 'nw_st_landing'}, {'kind': 'crate', 'x': 39, 'y': 44}, {'kind': 'crate', 'x': 40, 'y': 44}, {'kind': 'barrel', 'x': 44, 'y': 43}, {'kind': 'pipe_h', 'x': 42, 'y': 45},
    # the sawmill: the saw, the turbine, logs
    {'kind': 'machine', 'x': 51, 'y': 22, 'rot': 0, 'id': 'nw_st_saw'}, {'kind': 'machine', 'x': 57, 'y': 28, 'rot': 1}, {'kind': 'pipe_h', 'x': 48, 'y': 21}, {'kind': 'pipe_h', 'x': 48, 'y': 27},
    {'kind': 'crate', 'x': 55, 'y': 20}, {'kind': 'shelf', 'x': 58, 'y': 21, 'rot': 3}, {'kind': 'sign', 'x': 53, 'y': 31, 'rot': 0, 'id': 'nw_st_drive'},
    # the cookhouse: tables, the stove, the room
    {'kind': 'counter', 'x': 30, 'y': 19, 'rot': 0}, {'kind': 'counter', 'x': 31, 'y': 19, 'rot': 0}, {'kind': 'stove', 'x': 29, 'y': 18}, {'kind': 'table', 'x': 33, 'y': 21}, {'kind': 'chair', 'x': 34, 'y': 21, 'rot': 3},
    {'kind': 'table', 'x': 30, 'y': 22}, {'kind': 'chair', 'x': 29, 'y': 22, 'rot': 1}, {'kind': 'bed', 'x': 36, 'y': 18, 'rot': 3, 'id': 'nw_st_room'}, {'kind': 'locker', 'x': 36, 'y': 20, 'id': 'nw_st_room_locker'},
    {'kind': 'cot', 'x': 35, 'y': 23, 'rot': 3},
    # the houses
    {'kind': 'cot', 'x': 21, 'y': 18, 'rot': 1}, {'kind': 'stove', 'x': 24, 'y': 18}, {'kind': 'cot', 'x': 40, 'y': 18, 'rot': 1}, {'kind': 'cot', 'x': 21, 'y': 11, 'rot': 1},
    # the Ridge: the bunkhouse, the foreman's house, stumps, the old cut
    {'kind': 'cot', 'x': 41, 'y': 4, 'rot': 1}, {'kind': 'cot', 'x': 43, 'y': 4, 'rot': 1}, {'kind': 'cot', 'x': 48, 'y': 4, 'rot': 3}, {'kind': 'stove', 'x': 50, 'y': 7}, {'kind': 'table', 'x': 45, 'y': 6},
    {'kind': 'table', 'x': 55, 'y': 5}, {'kind': 'cot', 'x': 58, 'y': 4, 'rot': 3}, {'kind': 'shelf', 'x': 54, 'y': 8, 'rot': 1},
    {'kind': 'dead_tree', 'x': 30, 'y': 4}, {'kind': 'dead_tree', 'x': 34, 'y': 7}, {'kind': 'dead_tree', 'x': 26, 'y': 3}, {'kind': 'dead_tree', 'x': 64, 'y': 5}, {'kind': 'dead_tree', 'x': 67, 'y': 10},
    {'kind': 'rock_small', 'x': 31, 'y': 9}, {'kind': 'debris', 'x': 33, 'y': 3, 'id': 'nw_st_stump'}, {'kind': 'rock_small', 'x': 12, 'y': 6}, {'kind': 'dead_tree', 'x': 8, 'y': 4},
    # the Bottoms: the skid shed, tents, a fire
    {'kind': 'cot', 'x': 3, 'y': 18, 'rot': 1}, {'kind': 'cot', 'x': 3, 'y': 21, 'rot': 1}, {'kind': 'crate', 'x': 7, 'y': 18}, {'kind': 'tent', 'x': 4, 'y': 27}, {'kind': 'tent', 'x': 8, 'y': 27},
    {'kind': 'campfire', 'x': 6, 'y': 25}, {'kind': 'pipe_h', 'x': 2, 'y': 30}, {'kind': 'sign', 'x': 9, 'y': 24, 'rot': 1, 'id': 'nw_st_skid'},
    # the railhead
    {'kind': 'sign', 'x': 54, 'y': 38, 'rot': 0, 'id': 'nw_st_railhead'}, {'kind': 'pipe_h', 'x': 56, 'y': 37}, {'kind': 'pipe_h', 'x': 57, 'y': 37}, {'kind': 'crate', 'x': 52, 'y': 37},
    {'kind': 'lamp_post', 'x': 60, 'y': 38}, {'kind': 'lamp_post', 'x': 26, 'y': 16}, {'kind': 'lamp_post', 'x': 44, 'y': 16},
]
spots = {
    'berit': {'x': 14, 'y': 27}, 'berit_boom': {'x': 22, 'y': 35}, 'berit_sleep': {'x': 13, 'y': 29},
    'arvid': {'x': 56, 'y': 6}, 'arvid_cut': {'x': 33, 'y': 4}, 'arvid_sleep': {'x': 57, 'y': 5},
    'sigrun': {'x': 44, 'y': 7}, 'sigrun_boom': {'x': 29, 'y': 36}, 'sigrun_punt': {'x': 31, 'y': 39}, 'sigrun_sleep': {'x': 42, 'y': 5},
    'cillian': {'x': 46, 'y': 11}, 'cillian_sleep': {'x': 47, 'y': 5},
    'rufino': {'x': 6, 'y': 21}, 'rufino_fire': {'x': 7, 'y': 25}, 'rufino_sleep': {'x': 4, 'y': 19},
    'wayra': {'x': 33, 'y': 22}, 'wayra_sleep': {'x': 34, 'y': 23},
    'dorit': {'x': 31, 'y': 20}, 'dorit_sleep': {'x': 32, 'y': 18},
    'mill_work': {'x': 50, 'y': 25}, 'mill_work_b': {'x': 54, 'y': 26}, 'boom_work': {'x': 15, 'y': 40}, 'boom_work_b': {'x': 26, 'y': 45},
    'street_pair_a': {'x': 27, 'y': 26}, 'street_pair_b': {'x': 28, 'y': 26}, 'cook_sit': {'x': 33, 'y': 20}, 'cook_sit_b': {'x': 31, 'y': 23},
    'ridge_work': {'x': 36, 'y': 8}, 'ridge_pair_a': {'x': 47, 'y': 11}, 'ridge_pair_b': {'x': 48, 'y': 11}, 'skid_work': {'x': 9, 'y': 28}, 'skid_sit': {'x': 5, 'y': 26},
    'rail_work': {'x': 55, 'y': 39},
}
NIGHT_PUNT = {'all': [{'hour': {'from': 22, 'to': 3}}, {'not': {'flag': 'nw_feud'}}, {'not': {'flag': 'nw_sigrun_gone'}}]}
BOTTOMS_HERE = {'not': {'flag': 'nw_bottoms_gone'}}
npcs = [
    {'def': 'npc_nw_05', 'x': 14, 'y': 27, 'facing': 2},
    {'def': 'npc_nw_06', 'x': 56, 'y': 6, 'facing': 2, 'if': {'not': {'flag': 'nw_arvid_gone'}}},
    {'def': 'npc_nw_07', 'x': 44, 'y': 7, 'facing': 2, 'if': {'not': {'flag': 'nw_sigrun_gone'}}},
    {'def': 'npc_nw_07', 'id': 'npc_nw_07_punt', 'x': 31, 'y': 39, 'facing': 3, 'schedule': [], 'dialogue': 'd_nw_punt', 'if': NIGHT_PUNT},
    {'def': 'npc_nw_08', 'x': 46, 'y': 11, 'facing': 2},
    {'def': 'npc_nw_09', 'x': 6, 'y': 21, 'facing': 1, 'if': BOTTOMS_HERE},
    {'def': 'npc_nw_10', 'x': 33, 'y': 22, 'facing': 2, 'if': BOTTOMS_HERE},
    {'def': 'npc_nw_11', 'x': 31, 'y': 20, 'facing': 2},
]
spawns = [
    {'id': 'start', 'x': 26, 'y': 30, 'facing': 2}, {'id': 'landing', 'x': 41, 'y': 34, 'facing': 0}, {'id': 'from_depot', 'x': 69, 'y': 39, 'facing': 3},
    {'id': 'railhead', 'x': 55, 'y': 42, 'facing': 0}, {'id': 'from_dam', 'x': 1, 'y': 30, 'facing': 1}, {'id': 'room', 'x': 35, 'y': 19, 'facing': 2},
]
nw_sawtown = {
    'id': 'nw_sawtown', 'name': 'Sawtown', 'seed': 541, 'settlement': 'sawtown',
    'layout': rows, 'legend': legend_for(rows), 'props': props,
    'lights': [
        light(22, 34, 3.4, LAMP, 1.6, 9), light(36, 34, 3.4, LAMP, 1.6, 9), light(14, 27, 2.4, WARM, 1.2, 6), light(32, 20, 2.6, '0xffb070', 2.0, 9, 0.12),
        light(52, 24, 5.0, COLD, 1.4, 12), light(46, 6, 2.4, WARM, 1.2, 7), light(56, 6, 2.4, WARM, 1.0, 5), light(6, 25, 0.8, FIRE, 1.6, 6, 0.35),
        light(60, 38, 3.4, LAMP, 1.4, 8), light(26, 16, 3.4, LAMP, 1.4, 8), light(44, 16, 3.4, LAMP, 1.4, 8),
    ],
    'spawns': spawns,
    'talk': {
        'nw_st_notice': {'dialogue': 'd_nw_notice', 'name': 'The boom\'s notice'},
        'nw_st_pen': {'dialogue': 'd_nw_pen', 'name': 'The north pen'},
        'nw_st_tally': {'dialogue': 'd_nw_tally', 'name': 'The tally book'},
        'nw_st_landing': {'dialogue': 'd_nw_board_st', 'name': 'The landing'},
        'nw_st_saw': {'dialogue': 'd_nw_saw', 'name': 'The saw'},
        'nw_st_drive': {'dialogue': 'd_nw_drive', 'name': 'The drive'},
        'nw_st_room': {'dialogue': 'd_nw_room', 'name': 'The room'},
        'nw_st_stump': {'dialogue': 'd_nw_stump', 'name': 'An old stump'},
        'nw_st_skid': {'dialogue': 'd_nw_skid', 'name': 'The skid camp'},
        'nw_st_railhead': {'dialogue': 'd_nw_railhead', 'name': 'The railhead'},
    },
    'containers': {
        'nw_st_room_locker': {'name': 'Room Locker', 'items': [], 'yoursIf': {'flag': 'nw_room_rented'}},
    },
    'spots': spots, 'npcs': npcs,
    'triggers': [
        {'id': 'arrive', 'x': 1, 'y': 24, 'w': 46, 'h': 9, 'text': 'Sawtown: a street of timber houses under a hill of stumps, a sawmill the size of a church on a race of fast brown water, and out on the lake a grid of log walkways round pens full of floating trees, every one with a mark cut in its butt. It smells of resin and wet ash and frying. It has been raining since before you arrived and will be raining after you leave.', 'effects': [{'learn': 'seen_sawtown'}, {'learn': 'loc_timber'}, {'set': 'nw_open'}]},
        {'id': 'railhead', 'x': 50, 'y': 36, 'w': 21, 'h': 6, 'text': 'The north track ends here at a loading stage of old concrete, the rails running off south-east into the trees toward Yard Nine. Somebody keeps the last hundred yards of it oiled and bright, though the weeds own the rest.', 'effects': [{'learn': 'seen_sawtown'}, {'learn': 'loc_timber'}, {'set': 'nw_open'}, {'learn': 'nw_railhead_seen'}]},
        {'id': 'boom', 'x': 8, 'y': 34, 'w': 29, 'h': 2, 'text': 'On the walkways, sorters with pike poles walk the logs into their pens by the marks on their butts: a crow\'s foot to the north pens, a hook to the south. A woman at the head of the boom calls every mark aloud and a boy writes it down.', 'effects': [{'learn': 'nw_boom_seen'}, {'quest': 'q_nw_feud', 'start': True}]},
    ],
    'extras': [
        {'count': 5, 'roles': ['labourer', 'settler'], 'life': 'hard', 'ages': [15, 62], 'area': {'x': 8, 'y': 34, 'w': 29, 'h': 12}, 'spots': ['boom_work', 'boom_work_b', 'mill_work', 'mill_work_b'], 'hours': {'from': 6, 'to': 19},
         'barks': ['Crow\'s foot, north pen. Hook, south.', 'The boom pays what the mark says.', 'Mind the walkway. The Water\'s colder than it looks.', 'Rain. Of course rain.', 'Six marks short on the tally again. Somebody\'s cutting.']},
        {'count': 4, 'roles': ['settler', 'labourer', 'street'], 'life': 'hard', 'ages': [6, 72], 'area': {'x': 19, 'y': 15, 'w': 26, 'h': 12}, 'spots': ['street_pair_a', 'street_pair_b', 'cook_sit', 'cook_sit_b'],
         'barks': ['Dorit\'s stew. Don\'t ask what it was.', 'Ridge and Bottoms. Two years now. You\'d think it was a hundred.', 'Mikkel Brandvold. Nice boy. Shame.', 'The barge goes down at six. If the river\'s up.']},
        {'count': 3, 'roles': ['labourer'], 'life': 'hard', 'ages': [17, 55], 'area': {'x': 26, 'y': 2, 'w': 34, 'h': 10}, 'spots': ['ridge_work', 'ridge_pair_a', 'ridge_pair_b'], 'hours': {'from': 6, 'to': 18},
         'barks': ['Timber!', 'Watch your back-cut.', 'The Bottoms can keep the flats. Mud and money.']},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0x9aa4a4', 'fogDensity': 0.012, 'dust': 0.02, 'grade': 0.25, 'mood': 'haze', 'sound': 'birds'},
    'hunting': 0.6,
}
check('nw_sawtown', rows, nw_sawtown['legend'], props, spawns, npcs, spots, 'start')
OUT['nw_sawtown'] = nw_sawtown

# ================================================================ Ashby Dam
W, H = 64, 44
g = grid(W, H, 'd')
border(g)
fill(g, 1, 1, 52, 13, 'X'); fill(g, 1, 14, 52, 14, 'x')         # Ashby Water, its edge on the upstream face
fill(g, 1, 15, 62, 18, 'c')                                      # the crest: a road across the dam
fill(g, 1, 15, 62, 15, 'P'); fill(g, 14, 18, 42, 18, 'P')       # the parapets, upstream and downstream
g[15][30] = 'c'; g[15][57] = 'c'                                 # the steps out to the gauge-well hut and the gatehouse
building(g, 27, 11, 33, 14, 'M', 'm', [(30, 14)])               # the gauge-well hut, out over the face
fill(g, 14, 19, 42, 25, 'D')                                     # the dam's body
fill(g, 26, 19, 30, 25, 'X')                                     # the spillway, shut
fill(g, 3, 1, 5, 14, 'X')                                        # the lock's head
fill(g, 3, 19, 5, 43, 'X')                                       # the lock chamber and the cut below it
fill(g, 6, 26, 47, 43, 'X'); fill(g, 6, 26, 13, 43, 'x')         # the river below, and its shallows on the west
fill(g, 44, 26, 47, 43, 'x')
building(g, 6, 19, 12, 24, 'W', 'w', [(9, 19)])                  # the lock-keeper's hut on the west bank
building(g, 53, 7, 61, 14, 'C', 'c', [(57, 14)])                 # the gatehouse on the east abutment
building(g, 50, 26, 57, 32, 'W', 'w', [(53, 26)])                # the keeper's house
building(g, 56, 35, 62, 40, 'W', 'w', [(56, 37)])                # a house, shut
fill(g, 49, 41, 52, 43, 'k')                                     # the path down to Low Landing
rows = [''.join(r) for r in g]
props = [
    # the crest: the staff gauge painted on the upstream face, the lock board, lamps
    {'kind': 'sign', 'x': 21, 'y': 16, 'rot': 0, 'id': 'nw_dm_gauge'}, {'kind': 'sign', 'x': 7, 'y': 16, 'rot': 0, 'id': 'nw_dm_lock'},
    {'kind': 'machine', 'x': 2, 'y': 16, 'rot': 1}, {'kind': 'machine', 'x': 6, 'y': 17, 'rot': 3}, {'kind': 'lamp_post', 'x': 12, 'y': 17}, {'kind': 'lamp_post', 'x': 46, 'y': 17},
    {'kind': 'lamp_post', 'x': 34, 'y': 16}, {'kind': 'sign', 'x': 48, 'y': 16, 'rot': 0, 'id': 'nw_dm_notice'},
    # the gauge-well hut: the well
    {'kind': 'machine', 'x': 29, 'y': 12, 'rot': 0, 'id': 'nw_dm_well'},
    # the gatehouse: the controller, the keepers' log, the lease in its frame, the stair down to the gallery
    {'kind': 'terminal', 'x': 55, 'y': 8, 'rot': 2, 'id': 'nw_dm_controller'}, {'kind': 'terminal', 'x': 56, 'y': 8, 'rot': 2}, {'kind': 'sign', 'x': 60, 'y': 9, 'rot': 3, 'id': 'nw_dm_log'},
    {'kind': 'sign', 'x': 54, 'y': 12, 'rot': 1, 'id': 'nw_dm_lease'}, {'kind': 'sign', 'x': 60, 'y': 12, 'rot': 3, 'id': 'nw_dm_stair'}, {'kind': 'chair', 'x': 57, 'y': 9, 'rot': 2},
    # the lock-keeper's hut
    {'kind': 'cot', 'x': 7, 'y': 20, 'rot': 1}, {'kind': 'stove', 'x': 11, 'y': 23}, {'kind': 'table', 'x': 10, 'y': 21},
    # the keeper's house, the tailrace, the east bank
    {'kind': 'cot', 'x': 51, 'y': 27, 'rot': 1}, {'kind': 'stove', 'x': 56, 'y': 31}, {'kind': 'table', 'x': 54, 'y': 29}, {'kind': 'chair', 'x': 55, 'y': 29, 'rot': 3},
    {'kind': 'sign', 'x': 48, 'y': 30, 'rot': 3, 'id': 'nw_dm_tailrace'}, {'kind': 'rock', 'x': 49, 'y': 22}, {'kind': 'dead_tree', 'x': 60, 'y': 22}, {'kind': 'dead_tree', 'x': 59, 'y': 33},
    {'kind': 'pipe_h', 'x': 45, 'y': 21}, {'kind': 'rock_small', 'x': 52, 'y': 36},
]
spots = {
    'hedda': {'x': 57, 'y': 10}, 'hedda_crest': {'x': 31, 'y': 17}, 'hedda_sleep': {'x': 52, 'y': 27},
    'rhiannon': {'x': 9, 'y': 21}, 'rhiannon_lock': {'x': 8, 'y': 17}, 'rhiannon_sleep': {'x': 8, 'y': 20},
    'aurelio': {'x': 50, 'y': 17}, 'assessor': {'x': 56, 'y': 16}, 'warden_a': {'x': 54, 'y': 17}, 'warden_b': {'x': 59, 'y': 17},
    'crest_work': {'x': 24, 'y': 17}, 'bank_sit': {'x': 50, 'y': 34},
}
AUDIT_HERE = {'all': [{'flag': 'nw_audit'}, {'not': {'flag': 'nw_dam'}}]}
WARDENS_KEEP = {'flag': 'nw_dam', 'eq': 'exposed'}
npcs = [
    {'def': 'npc_nw_01', 'x': 57, 'y': 10, 'facing': 2, 'if': {'not': {'flag': 'nw_keepers', 'eq': 'taken'}}},
    {'def': 'npc_nw_02', 'x': 9, 'y': 21, 'facing': 2, 'if': {'not': {'flag': 'nw_keepers', 'eq': 'taken'}}},
    {'def': 'npc_nw_03', 'id': 'npc_nw_03_dam', 'x': 50, 'y': 17, 'facing': 3, 'schedule': [], 'if': AUDIT_HERE},
    {'def': 'npc_nw_04', 'x': 56, 'y': 16, 'facing': 3, 'schedule': [], 'if': AUDIT_HERE},
    {'def': 'npc_nw_g1', 'x': 54, 'y': 17, 'facing': 3, 'schedule': [], 'if': {'any': [AUDIT_HERE, WARDENS_KEEP]}},
    {'def': 'npc_nw_g2', 'x': 59, 'y': 17, 'facing': 3, 'schedule': [], 'if': {'any': [AUDIT_HERE, WARDENS_KEEP]}},
]
spawns = [
    {'id': 'start', 'x': 44, 'y': 17, 'facing': 3}, {'id': 'lock', 'x': 8, 'y': 16, 'facing': 1}, {'id': 'from_riverdock', 'x': 50, 'y': 42, 'facing': 0},
    {'id': 'from_timber', 'x': 62, 'y': 16, 'facing': 3}, {'id': 'gatehouse', 'x': 58, 'y': 12, 'facing': 2},
]
nw_dam = {
    'id': 'nw_dam', 'name': 'Ashby Dam', 'seed': 542, 'settlement': 'ashby',
    'layout': rows, 'legend': legend_for(rows), 'props': props,
    'lights': [light(12, 17, 3.6, LAMP, 1.6, 10), light(46, 17, 3.6, LAMP, 1.6, 10), light(34, 16, 3.6, LAMP, 1.4, 10), light(57, 10, 2.8, COLD, 1.4, 7),
               light(29, 12, 2.2, WARM, 0.8, 4), light(9, 21, 2.4, WARM, 1.0, 5), light(53, 29, 2.4, WARM, 1.2, 6)],
    'spawns': spawns,
    'talk': {
        'nw_dm_gauge': {'dialogue': 'd_nw_gauge', 'name': 'The gauge on the face'},
        'nw_dm_lock': {'dialogue': 'd_nw_board_dm', 'name': 'The lock'},
        'nw_dm_notice': {'dialogue': 'd_nw_dm_notice', 'name': 'A notice'},
        'nw_dm_well': {'dialogue': 'd_nw_well', 'name': 'The gauge well'},
        'nw_dm_controller': {'dialogue': 'd_nw_controller', 'name': 'The controller'},
        'nw_dm_log': {'dialogue': 'd_nw_log', 'name': 'The keepers\' log'},
        'nw_dm_lease': {'dialogue': 'd_nw_lease', 'name': 'A frame on the wall'},
        'nw_dm_stair': {'dialogue': 'd_nw_stair', 'name': 'The gallery stair'},
        'nw_dm_tailrace': {'dialogue': 'd_nw_tailrace', 'name': 'The tailrace'},
    },
    'spots': spots, 'npcs': npcs,
    'triggers': [
        {'id': 'arrive', 'x': 1, 'y': 15, 'w': 62, 'h': 4, 'text': 'Ashby Dam: a wall of pre-war concrete across a valley, a road along its top, grey water to the north as far as the rain lets you see and a river in a gorge to the south. ASHBY in letters as tall as a house on the downstream face, the paint ninety years gone and the letters still there in clean stripes where the moss will not grow. At the east end a gatehouse with one lit window. Under your feet, very faintly, the dam hums.', 'effects': [{'learn': 'seen_ashby'}, {'learn': 'loc_dam'}, {'set': 'nw_open'}]},
        {'id': 'south', 'x': 49, 'y': 36, 'w': 4, 'h': 7, 'text': 'The path up from Low Landing comes out of the gorge onto the east bank under the dam\'s face, where the tailrace boils white out of the turbine hall\'s mouth and an old woman\'s washing hangs on a line between two dead pines.', 'effects': [{'learn': 'seen_ashby'}, {'learn': 'loc_dam'}, {'set': 'nw_open'}]},
    ],
    'extras': [],
    'ambience': {'indoor': False, 'fogColor': 'hex:0x98a2a6', 'fogDensity': 0.013, 'dust': 0.02, 'grade': 0.3, 'mood': 'haze', 'sound': 'hum'},
    'hunting': 0.4,
}
check('nw_dam', rows, nw_dam['legend'], props, spawns, npcs, spots, 'start')
OUT['nw_dam'] = nw_dam

# ================================================================ the gallery inside the dam (a cell)
W, H = 44, 14
g = grid(W, H, 'H')
fill(g, 2, 5, 41, 8, 'c'); fill(g, 2, 9, 41, 9, 'x')            # the gallery and its drain
fill(g, 38, 2, 41, 4, 'c')                                       # the stair landing
rows = [''.join(r) for r in g]
props = [
    {'kind': 'sign', 'x': 40, 'y': 2, 'rot': 2, 'id': 'nw_gl_stair'}, {'kind': 'sign', 'x': 9, 'y': 5, 'rot': 0, 'id': 'nw_gl_pins'},
    {'kind': 'debris', 'x': 13, 'y': 8, 'id': 'nw_gl_joint'}, {'kind': 'pipe_h', 'x': 25, 'y': 5}, {'kind': 'pipe_h', 'x': 30, 'y': 5}, {'kind': 'lamp_post', 'x': 36, 'y': 5},
    {'kind': 'debris', 'x': 4, 'y': 7}, {'kind': 'barrel_rust', 'x': 20, 'y': 5},
]
spots = {'stair': {'x': 39, 'y': 3}, 'pins': {'x': 9, 'y': 6}}
spawns = [{'id': 'start', 'x': 39, 'y': 3, 'facing': 2}, {'id': 'stair', 'x': 39, 'y': 3, 'facing': 2}]
nw_gallery = {
    'id': 'nw_gallery', 'name': 'Ashby Gallery', 'seed': 543, 'settlement': 'ashby',
    'layout': rows, 'legend': legend_for(rows), 'props': props,
    'lights': [light(36, 5, 2.4, COLD, 1.0, 7), light(9, 6, 1.6, LAMP, 0.6, 4, 0.1)],
    'spawns': spawns,
    'talk': {
        'nw_gl_stair': {'dialogue': 'd_nw_gl_stair', 'name': 'The stair up'},
        'nw_gl_pins': {'dialogue': 'd_nw_pins', 'name': 'Pins in the wall'},
        'nw_gl_joint': {'dialogue': 'd_nw_joint', 'name': 'A weeping joint'},
    },
    'spots': spots, 'npcs': [],
    'triggers': [
        {'id': 'down', 'x': 37, 'y': 2, 'w': 5, 'h': 4, 'text': 'The inspection gallery: a concrete corridor running the length of the dam inside it, a man\'s height and a man\'s width, with a drain along its floor and the whole of Ashby Water on the other side of the left-hand wall. The wall sweats. Somewhere along it, water is running that should not be.', 'effects': [{'learn': 'nw_gallery_seen'}]},
    ],
    'ambience': {'indoor': True, 'fogColor': 'hex:0x10161a', 'fogDensity': 0.05, 'dust': 0.05, 'ambient': {'color': 'hex:0x2a3540', 'intensity': 0.3}, 'grade': 0.35, 'mood': 'grim', 'sound': 'drip'},
    'interior': True,
}
check('nw_gallery', rows, nw_gallery['legend'], props, spawns, [], spots, 'start')
OUT['nw_gallery'] = nw_gallery

# ================================================================ Low Landing
W, H = 72, 48
g = grid(W, H, 'd')
border(g)
fill(g, 1, 1, 22, 46, 'X'); fill(g, 23, 1, 24, 46, 'x')          # the river and its edge
fill(g, 25, 2, 34, 44, 'c')                                      # the quay
fill(g, 13, 9, 22, 15, 'w'); fill(g, 23, 12, 24, 12, 'w')        # the Patience, and her plank
fill(g, 13, 19, 22, 26, 'w'); fill(g, 23, 22, 24, 22, 'w')       # the guild's barge
fill(g, 11, 31, 22, 39, 'w'); fill(g, 23, 35, 24, 35, 'w')       # the hulk
building(g, 14, 32, 20, 37, 'S', 'w', [(20, 35)])                # the hulk's cabin: the berth
building(g, 36, 6, 45, 14, 'C', 'c', [(36, 10)])                 # the guild's winch house
building(g, 36, 17, 45, 24, 'B', 'w', [(36, 20)])                # the guild's barge office
building(g, 36, 28, 44, 34, 'W', 'w', [(36, 31)])                # the chandler
building(g, 50, 4, 56, 9, 'W', 'w', [(53, 9)])                   # houses on posts above the flood line
building(g, 59, 4, 65, 9, 'W', 'w', [(62, 9)])
building(g, 50, 13, 56, 18, 'W', 'w', [(53, 18)])
building(g, 59, 13, 65, 18, 'S', 'w', [(62, 18)])
building(g, 55, 26, 69, 44, 'G', 'c', [(55, 33)])                # the shell of a campus hall
fill(g, 46, 30, 49, 46, 'a')                                     # the road south to the city
fill(g, 26, 1, 28, 1, 'c')                                       # the towpath north to the dam
rows = [''.join(r) for r in g]
props = [
    # the quay: the barge board, the notice, bollards, lamps
    {'kind': 'sign', 'x': 30, 'y': 12, 'rot': 3, 'id': 'nw_ll_quay'}, {'kind': 'sign', 'x': 31, 'y': 26, 'rot': 3, 'id': 'nw_ll_notice'},
    {'kind': 'fence_post', 'x': 25, 'y': 8}, {'kind': 'fence_post', 'x': 25, 'y': 16}, {'kind': 'fence_post', 'x': 25, 'y': 28}, {'kind': 'fence_post', 'x': 25, 'y': 40},
    {'kind': 'lamp_post', 'x': 33, 'y': 6}, {'kind': 'lamp_post', 'x': 33, 'y': 18}, {'kind': 'lamp_post', 'x': 33, 'y': 30}, {'kind': 'lamp_post', 'x': 33, 'y': 42},
    {'kind': 'crate', 'x': 28, 'y': 20}, {'kind': 'crate', 'x': 29, 'y': 20}, {'kind': 'pipe_h', 'x': 28, 'y': 36}, {'kind': 'pipe_h', 'x': 29, 'y': 37}, {'kind': 'barrel', 'x': 31, 'y': 4},
    # the Patience
    {'kind': 'crate', 'x': 15, 'y': 10}, {'kind': 'crate', 'x': 16, 'y': 10}, {'kind': 'crate', 'x': 15, 'y': 11, 'id': 'nw_ll_crates'}, {'kind': 'pipe_h', 'x': 20, 'y': 14}, {'kind': 'sign', 'x': 21, 'y': 12, 'rot': 1, 'id': 'nw_ll_patience'},
    # the guild's barge
    {'kind': 'crate', 'x': 15, 'y': 21}, {'kind': 'crate', 'x': 16, 'y': 21}, {'kind': 'crate', 'x': 15, 'y': 24}, {'kind': 'pipe_h', 'x': 20, 'y': 25},
    # the hulk and its berth
    {'kind': 'bed', 'x': 15, 'y': 33, 'rot': 1, 'id': 'nw_ll_berth'}, {'kind': 'locker', 'x': 19, 'y': 33, 'id': 'nw_ll_berth_locker'}, {'kind': 'stove', 'x': 15, 'y': 36},
    {'kind': 'sign', 'x': 22, 'y': 37, 'rot': 1, 'id': 'nw_ll_berth_sign'},
    # the winch house: the winch, the pressed men's cots
    {'kind': 'machine', 'x': 40, 'y': 8, 'rot': 1, 'id': 'nw_ll_winch'}, {'kind': 'cot', 'x': 37, 'y': 12, 'rot': 1}, {'kind': 'cot', 'x': 39, 'y': 13, 'rot': 1}, {'kind': 'cot', 'x': 42, 'y': 13, 'rot': 1}, {'kind': 'cot', 'x': 44, 'y': 12, 'rot': 3},
    # the guild's barge office
    {'kind': 'table', 'x': 41, 'y': 19}, {'kind': 'chair', 'x': 41, 'y': 18, 'rot': 2}, {'kind': 'locker', 'x': 44, 'y': 18, 'id': 'nw_ll_pryce_box'}, {'kind': 'shelf', 'x': 44, 'y': 23, 'rot': 3},
    # the chandler
    {'kind': 'counter', 'x': 39, 'y': 30, 'rot': 1}, {'kind': 'counter', 'x': 39, 'y': 31, 'rot': 1}, {'kind': 'shelf', 'x': 43, 'y': 29, 'rot': 3}, {'kind': 'shelf', 'x': 43, 'y': 33, 'rot': 3}, {'kind': 'barrel', 'x': 41, 'y': 33},
    # houses, the hall's shell
    {'kind': 'cot', 'x': 51, 'y': 5, 'rot': 1}, {'kind': 'cot', 'x': 60, 'y': 5, 'rot': 1}, {'kind': 'cot', 'x': 51, 'y': 14, 'rot': 1}, {'kind': 'stove', 'x': 55, 'y': 17},
    {'kind': 'debris', 'x': 60, 'y': 30}, {'kind': 'debris', 'x': 64, 'y': 38}, {'kind': 'machine', 'x': 66, 'y': 28, 'rot': 0}, {'kind': 'dead_tree', 'x': 48, 'y': 22}, {'kind': 'dead_tree', 'x': 68, 'y': 22},
    {'kind': 'sign', 'x': 48, 'y': 28, 'rot': 0, 'id': 'nw_ll_road'},
]
spots = {
    'magda': {'x': 18, 'y': 12}, 'magda_quay': {'x': 27, 'y': 12}, 'magda_sleep': {'x': 18, 'y': 13},
    'pryce': {'x': 41, 'y': 20}, 'pryce_quay': {'x': 30, 'y': 22},
    'bao': {'x': 40, 'y': 31}, 'bao_sleep': {'x': 42, 'y': 32},
    'emeka': {'x': 41, 'y': 9}, 'emeka_sleep': {'x': 38, 'y': 12},
    'aurelio': {'x': 30, 'y': 27},
    'quay_work': {'x': 27, 'y': 18}, 'quay_work_b': {'x': 27, 'y': 32}, 'quay_pair_a': {'x': 30, 'y': 8}, 'quay_pair_b': {'x': 31, 'y': 8},
    'winch_work': {'x': 42, 'y': 10}, 'winch_work_b': {'x': 38, 'y': 9}, 'house_sit': {'x': 53, 'y': 11}, 'house_pair_a': {'x': 57, 'y': 11}, 'house_pair_b': {'x': 58, 'y': 11},
}
npcs = [
    {'def': 'npc_nw_12', 'x': 18, 'y': 12, 'facing': 3},
    {'def': 'npc_nw_13', 'x': 41, 'y': 20, 'facing': 3},
    {'def': 'npc_nw_14', 'x': 40, 'y': 31, 'facing': 3},
    {'def': 'npc_nw_15', 'x': 41, 'y': 9, 'facing': 2},
    {'def': 'npc_nw_03', 'x': 30, 'y': 27, 'facing': 3, 'if': {'not': {'flag': 'nw_dam'}}},
]
spawns = [
    {'id': 'start', 'x': 29, 'y': 14, 'facing': 3}, {'id': 'quay', 'x': 29, 'y': 14, 'facing': 3}, {'id': 'from_dam', 'x': 27, 'y': 1, 'facing': 2},
    {'id': 'from_meridian', 'x': 47, 'y': 46, 'facing': 0}, {'id': 'berth', 'x': 17, 'y': 34, 'facing': 2}, {'id': 'patience', 'x': 18, 'y': 11, 'facing': 1},
]
nw_landing = {
    'id': 'nw_landing', 'name': 'Low Landing', 'seed': 544, 'settlement': 'low_landing',
    'layout': rows, 'legend': legend_for(rows), 'props': props,
    'lights': [light(33, 6, 3.6, LAMP, 1.6, 9), light(33, 18, 3.6, LAMP, 1.6, 9), light(33, 30, 3.6, LAMP, 1.6, 9), light(33, 42, 3.6, LAMP, 1.6, 9),
               light(40, 10, 2.8, COLD, 1.4, 8), light(41, 20, 2.6, WARM, 1.4, 6), light(40, 31, 2.6, WARM, 1.2, 6), light(17, 12, 2.2, WARM, 1.0, 5),
               light(17, 34, 2.2, WARM, 1.0, 5), light(53, 7, 2.4, WARM, 1.0, 5)],
    'spawns': spawns,
    'talk': {
        'nw_ll_quay': {'dialogue': 'd_nw_board_ll', 'name': 'The quay'},
        'nw_ll_notice': {'dialogue': 'd_nw_ll_notice', 'name': 'The city\'s notice'},
        'nw_ll_crates': {'dialogue': 'd_nw_crates', 'name': 'The load'},
        'nw_ll_patience': {'dialogue': 'd_nw_patience', 'name': 'The Patience'},
        'nw_ll_berth': {'dialogue': 'd_nw_berth', 'name': 'The berth'},
        'nw_ll_berth_sign': {'dialogue': 'd_nw_berth', 'name': 'A berth to let'},
        'nw_ll_winch': {'dialogue': 'd_nw_winch', 'name': 'The winch'},
        'nw_ll_road': {'dialogue': 'd_nw_ll_road', 'name': 'The road south'},
    },
    'containers': {
        'nw_ll_pryce_box': {'name': 'Factor\'s Strongbox', 'items': [['c_bitters', 1]], 'tolls': 70, 'lock': 50},
        'nw_ll_berth_locker': {'name': 'Berth Locker', 'items': [], 'yoursIf': {'flag': 'nw_berth_rented'}},
    },
    'spots': spots, 'npcs': npcs,
    'triggers': [
        {'id': 'arrive', 'x': 25, 'y': 2, 'w': 10, 'h': 43, 'text': 'Low Landing: a quay of pre-war concrete a quarter of a mile long on a brown river, three barges and a hulk tied to it, a winch house with the guild\'s green on its door, and behind it all the grey shells of buildings so big the town looks like something that has crawled into the corner of them to keep dry. The high-water line is painted on every post at the height of your head. Nobody lives below it.', 'effects': [{'learn': 'seen_landing'}, {'learn': 'loc_riverdock'}, {'set': 'nw_open'}]},
        {'id': 'south', 'x': 46, 'y': 36, 'w': 4, 'h': 10, 'text': 'The road to the city runs south from the Landing on an embankment above the flood meadows, straight, with the river on its right hand all the way.', 'effects': [{'learn': 'seen_landing'}, {'learn': 'loc_riverdock'}, {'set': 'nw_open'}]},
    ],
    'extras': [
        {'count': 5, 'roles': ['labourer', 'trader', 'settler'], 'life': 'hard', 'ages': [14, 65], 'area': {'x': 25, 'y': 2, 'w': 10, 'h': 43}, 'spots': ['quay_work', 'quay_work_b', 'quay_pair_a', 'quay_pair_b'], 'hours': {'from': 5, 'to': 21},
         'barks': ['Barge down at six. If the dam lets her.', 'River\'s low. River\'s always low.', 'The guild\'s winch. The guild\'s men on it. The guild\'s river, they\'ll say next.', 'Half a load and a whole fare. That\'s the Wet.']},
        {'count': 3, 'roles': ['labourer'], 'life': 'starved', 'ages': [17, 50], 'faction': 'tollmen', 'area': {'x': 36, 'y': 6, 'w': 10, 'h': 9}, 'spots': ['winch_work', 'winch_work_b'], 'hours': {'from': 6, 'to': 20},
         'barks': ['Heave.', 'Two more months on my paper. Two.', 'Don\'t talk to me. He\'s watching.']},
        {'count': 3, 'roles': ['settler', 'street'], 'life': 'hard', 'ages': [5, 75], 'area': {'x': 48, 'y': 3, 'w': 20, 'h': 18}, 'spots': ['house_sit', 'house_pair_a', 'house_pair_b'],
         'barks': ['Above the line or not at all.', 'The dam\'ll go one spring. My gran said so. Her gran said so.', 'Fish? In that? Eels, maybe.']},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0x9ca4a2', 'fogDensity': 0.012, 'dust': 0.02, 'grade': 0.3, 'mood': 'bustling', 'sound': 'birds'},
    'hunting': 0.5,
}
check('nw_landing', rows, nw_landing['legend'], props, spawns, npcs, spots, 'start')
OUT['nw_landing'] = nw_landing

# ================================================================ the riverbank (roadside)
W, H = 40, 26
g = grid(W, H, 'd')
fill(g, 0, 0, W - 1, 3, 'R')
fill(g, 0, 18, W - 1, 25, 'X'); fill(g, 0, 16, W - 1, 17, 'x')
fill(g, 0, 10, W - 1, 13, 'k')
rows = [''.join(r) for r in g]
props = [
    {'kind': 'dead_tree', 'x': 5, 'y': 6}, {'kind': 'dead_tree', 'x': 29, 'y': 5}, {'kind': 'planter', 'x': 9, 'y': 15}, {'kind': 'planter', 'x': 10, 'y': 15}, {'kind': 'planter', 'x': 31, 'y': 15},
    {'kind': 'planter', 'x': 33, 'y': 14}, {'kind': 'campfire', 'x': 21, 'y': 15}, {'kind': 'rock_small', 'x': 17, 'y': 7}, {'kind': 'debris', 'x': 26, 'y': 12}, {'kind': 'wagon', 'x': 36, 'y': 8, 'rot': 1},
]
spots = {'here': {'x': 6, 'y': 11}, 'ahead': {'x': 13, 'y': 11}, 'ahead2': {'x': 14, 'y': 12}, 'side': {'x': 15, 'y': 15}, 'side2': {'x': 20, 'y': 14}, 'fire': {'x': 22, 'y': 14}, 'far': {'x': 24, 'y': 11},
         'boat': {'x': 19, 'y': 16}, 'boat2': {'x': 24, 'y': 17}}
spawns = [{'id': 'here', 'x': 6, 'y': 11, 'facing': 1}, {'id': 'start', 'x': 6, 'y': 11, 'facing': 1}]
nw_bank = {
    'id': 'nw_bank', 'name': 'Wet Riverbank', 'seed': 545,
    'layout': rows, 'legend': legend_for(rows), 'props': props,
    'lights': [light(21, 15, 0.6, FIRE, 1.6, 5, 0.35)],
    'spawns': spawns,
    'exits': [
        {'x': 0, 'y': 10, 'w': 1, 'h': 4, 'to': {'worldMap': True}, 'label': 'On along the bank'},
        {'x': W - 1, 'y': 10, 'w': 1, 'h': 4, 'to': {'worldMap': True}, 'label': 'On along the bank'},
    ],
    'spots': spots, 'npcs': [], 'triggers': [],
    'ambience': {'indoor': False, 'fogColor': 'hex:0x9aa4a4', 'fogDensity': 0.018, 'dust': 0.02, 'grade': 0.3, 'mood': 'haze', 'sound': 'birds'},
    'hunting': 0.6,
}
check('nw_bank', rows, nw_bank['legend'], props, spawns, [], spots, 'start')
OUT['nw_bank'] = nw_bank

HEADER = "import type { MapDef } from '../../engine/data/types';\n\n// Generated by tools/maps/gen_nw_wet.py — edit the generator, then re-run it.\n"
for mid, m in OUT.items():
    with open(os.path.join(ROOT, 'src', 'content', 'maps', f"{mid}.ts"), 'w') as f:
        f.write(f"{HEADER}export const {mid}: MapDef = {ts(m)};\n")
    print(mid, len(m['layout'][0]), 'x', len(m['layout']))
