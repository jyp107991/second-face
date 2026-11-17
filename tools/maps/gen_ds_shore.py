#!/usr/bin/env python3
"""Generates the Drowned Shore's maps (B5b): src/content/maps/ds_stilts.ts, ds_rigs.ts, ds_rig_leg.ts, ds_terminal.ts and
ds_wade.ts.

ds_stilts — Gull Stilts: a fishing village on stilts over the drowned streets of a pre-war ferry town. North is the land:
mud, reeds and the shore road in from Meridian at the north-east, where the Landing's jetty takes the tide boat. Down the
middle the Gut, the main boardwalk, to the Ebb Steps (the old town hall's steps, where the dead go out on the ebb). West,
the Greta (a grounded car ferry: the Stilt Court on her car deck) with the guild's tide post moored at her stern, and the
Netlofts along Low Row's west end. East, stilt houses, the loft to rent, and Coker's dive stage at the south-east. South-west
the Jesty, a drowned hotel's roof, with the guild's salt barge broken on it. The old sea wall runs east toward Blackcap.
ds_rigs — the Rigs: Hum (the platform that still pumps: turbine hall, the board, the stills, the crew's containers, the mess,
the north-east leg's moonpool hatch, the flare, the landing stage), Lean to the west along a catwalk (the shore's light), and
Stump to the south (legs only: the deep dive).
ds_rig_leg — inside Hum's north-east leg, below the hatch (a cell): the riser deck, the flooded section, the pump room in an
air pocket, and the export valve's chamber.
ds_terminal — Blackcap: the drowned terminal's last tank, its roof standing out of black water; the guild's pump and hose on
the rim, a jetty, the guild's barge, the end of the old sea wall and a skiff.
ds_wade — the roadside map for the shore's road and water encounters: a dike road across the drowned delta (a cell).
    python3 tools/maps/gen_ds_shore.py
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


def check(name, rows, legend, props, spawns, npcs, spots, start_spawn, talk_ids=()):
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
    ids = {p.get('id') for p in props}
    for t in talk_ids:
        if t not in ids: errs.append(f"talk {t} has no prop")
    if errs:
        print(name, 'FAILED:\n  ' + '\n  '.join(errs))
        sys.exit(1)


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


HEADER = "import type { MapDef } from '../../engine/data/types';\n\n// Generated by tools/maps/gen_ds_shore.py — edit the generator, then re-run it.\n"


def write(m):
    with open(os.path.join(ROOT, 'src', 'content', 'maps', f"{m['id']}.ts"), 'w') as f:
        f.write(f"{HEADER}export const {m['id']}: MapDef = {ts(m)};\n")
    print(m['id'], len(m['layout'][0]), 'x', len(m['layout']))


# conditions the placements read (the same as src/content/dialogue/ds_stilts.ts)
DAY = {'hour': {'from': 6, 'to': 21}}
NIGHT = {'hour': {'from': 21, 'to': 6}}
F = lambda f, v=None: {'flag': f} if v is None else {'flag': f, 'eq': v}
NOT = lambda c: {'not': c}
ALL = lambda *c: {'all': list(c)}
ANY = lambda *c: {'any': list(c)}

# ================================================================ Gull Stilts
W, H = 80, 60
g = grid(W, H, 'W')
# the land: mud and reeds along the north, a shallow fringe, the shore road in at the north-east
fill(g, 0, 0, W - 1, 4, 'm'); fill(g, 0, 0, 20, 2, 'r'); fill(g, 52, 0, 58, 1, 'r'); fill(g, 0, 5, W - 1, 6, 'w')
fill(g, 70, 0, 79, 4, 'a')
# the Landing: the jetty and its platform
fill(g, 63, 5, 65, 8, 'b'); fill(g, 58, 9, 70, 12, 'b')
# the Gut, and the walks across it (A along the north, Low Row's grate in the middle, C along the south)
fill(g, 38, 9, 40, 53, 'b')
fill(g, 41, 10, 57, 11, 'b')
fill(g, 8, 15, 72, 16, 'b')
fill(g, 4, 29, 76, 30, 'g')
fill(g, 10, 42, 68, 43, 'b')
# the smokehouse on the mud, its door onto the north walk
building(g, 44, 3, 52, 8, 'K', 'k', [(48, 8)]); fill(g, 48, 9, 50, 9, 'b')
# the Greta (the grounded car ferry; the court on her car deck), the tide post moored at her stern
building(g, 10, 18, 30, 26, 'H', 'h', [(20, 18), (30, 22)]); g[17][20] = 'b'
building(g, 31, 20, 36, 24, 'C', 'n', [(31, 22), (34, 24)]); fill(g, 34, 25, 35, 28, 'b')
# the Netlofts along Low Row's west end, and the Curlew's finger jetty
for (x0, x1, door) in [(4, 10, 7), (12, 18, 15), (20, 25, 22)]:
    building(g, x0, 32, x1, 37, 'L', 'f', [(door, 32)]); g[31][door] = 'b'
fill(g, 27, 31, 27, 37, 'b')
# Low Row's stilt houses north of the grate, and Mele's at the end
for (x0, x1, door) in [(44, 49, 46), (51, 56, 53), (58, 63, 60), (65, 70, 67)]:
    building(g, x0, 22, x1, 27, 'S', 'f', [(door, 27)]); g[28][door] = 'b'
# south of the grate: the cabin to rent (a trawler's hull turned keel-up on the stilts), Coker's house
building(g, 52, 33, 56, 37, 'U', 'f', [(54, 33)]); fill(g, 54, 31, 54, 32, 'b')
building(g, 60, 33, 66, 38, 'S', 'f', [(63, 33)]); fill(g, 63, 31, 63, 32, 'b')
# Coker's dive stage off the south walk
fill(g, 60, 44, 60, 44, 'b'); fill(g, 54, 45, 66, 50, 'g')
# the Ebb Steps at the Gut's foot, going down into the water
fill(g, 35, 52, 43, 55, 'c'); fill(g, 35, 56, 43, 57, 'w')
# the Jesty: the drowned hotel's roof with its parapet, the plank up from the south walk; the salt barge broken against it
fill(g, 6, 45, 20, 55, 'c'); ring(g, 6, 45, 20, 55, 'J'); g[45][15] = 'c'; fill(g, 15, 44, 15, 44, 'b')
building(g, 21, 47, 28, 55, 'H', 'h', []); g[51][20] = 'c'; g[51][21] = 'h'
# the old sea wall, east toward Blackcap
fill(g, 72, 31, 72, 32, 'g'); fill(g, 70, 33, 79, 34, 'c')
rows = [''.join(r) for r in g]

props = [
    # the Landing: the tide table, the tide boat at the jetty, crates of salt and twine
    {'kind': 'sign', 'x': 59, 'y': 9, 'rot': 0, 'id': 'ds_tides'}, {'kind': 'wagon', 'x': 67, 'y': 13, 'rot': 1, 'id': 'ds_tideboat'},
    {'kind': 'crate', 'x': 69, 'y': 9}, {'kind': 'crate', 'x': 70, 'y': 9}, {'kind': 'barrel', 'x': 58, 'y': 12}, {'kind': 'lamp_post', 'x': 62, 'y': 9},
    {'kind': 'fence_post', 'x': 63, 'y': 5}, {'kind': 'fence_post', 'x': 65, 'y': 5},
    # the smokehouse: racks, the fire, Hassan's counter; the hands-wanted board at its door
    {'kind': 'shelf', 'x': 45, 'y': 4, 'rot': 2}, {'kind': 'shelf', 'x': 47, 'y': 4, 'rot': 2}, {'kind': 'shelf', 'x': 49, 'y': 4, 'rot': 2}, {'kind': 'stove', 'x': 51, 'y': 4},
    {'kind': 'counter', 'x': 46, 'y': 6, 'rot': 0}, {'kind': 'barrel', 'x': 51, 'y': 7}, {'kind': 'sign', 'x': 50, 'y': 9, 'rot': 0, 'id': 'ds_nets'},
    # the Greta: the chart table and the Book, the court's benches, lamps; her rail
    {'kind': 'sign', 'x': 15, 'y': 22, 'rot': 1, 'id': 'ds_book'}, {'kind': 'table', 'x': 14, 'y': 22},
    {'kind': 'chair', 'x': 18, 'y': 20, 'rot': 3}, {'kind': 'chair', 'x': 18, 'y': 22, 'rot': 3}, {'kind': 'chair', 'x': 18, 'y': 24, 'rot': 3},
    {'kind': 'chair', 'x': 22, 'y': 20, 'rot': 3}, {'kind': 'chair', 'x': 22, 'y': 24, 'rot': 3}, {'kind': 'chair', 'x': 26, 'y': 20, 'rot': 3}, {'kind': 'chair', 'x': 26, 'y': 24, 'rot': 3},
    {'kind': 'lamp_post', 'x': 12, 'y': 19}, {'kind': 'lamp_post', 'x': 12, 'y': 25}, {'kind': 'barrel', 'x': 28, 'y': 19}, {'kind': 'blanket', 'x': 24, 'y': 22},
    # the tide post: the counter, the salt, the factor's box, the notice outside
    {'kind': 'counter', 'x': 33, 'y': 22, 'rot': 1}, {'kind': 'locker', 'x': 35, 'y': 21, 'id': 'ds_post_box'}, {'kind': 'crate', 'x': 35, 'y': 23}, {'kind': 'sign', 'x': 35, 'y': 26, 'rot': 0, 'id': 'ds_notice'},
    # the Netlofts: Lua's (the nets, a cot, a small cot nobody sleeps in), Paz's (a crib), the empty net store; the Curlew
    {'kind': 'blanket', 'x': 6, 'y': 34}, {'kind': 'cot', 'x': 5, 'y': 36, 'rot': 1}, {'kind': 'cot', 'x': 9, 'y': 36, 'rot': 1}, {'kind': 'table', 'x': 8, 'y': 34}, {'kind': 'sign', 'x': 9, 'y': 33, 'rot': 3, 'id': 'ds_kai'},
    {'kind': 'cot', 'x': 13, 'y': 36, 'rot': 1}, {'kind': 'cot', 'x': 17, 'y': 36, 'rot': 1}, {'kind': 'table', 'x': 16, 'y': 34}, {'kind': 'blanket', 'x': 14, 'y': 34},
    {'kind': 'crate', 'x': 21, 'y': 35}, {'kind': 'crate', 'x': 24, 'y': 35}, {'kind': 'blanket', 'x': 23, 'y': 34},
    {'kind': 'wagon', 'x': 28, 'y': 35, 'rot': 0, 'id': 'ds_curlew'}, {'kind': 'fence_post', 'x': 26, 'y': 37},
    # Low Row: houses' stoves, washing, a lamp
    {'kind': 'stove', 'x': 45, 'y': 23}, {'kind': 'cot', 'x': 48, 'y': 25, 'rot': 1}, {'kind': 'stove', 'x': 52, 'y': 23}, {'kind': 'cot', 'x': 55, 'y': 25, 'rot': 1},
    {'kind': 'cot', 'x': 59, 'y': 23, 'rot': 1}, {'kind': 'table', 'x': 62, 'y': 25}, {'kind': 'stove', 'x': 69, 'y': 23}, {'kind': 'cot', 'x': 66, 'y': 25, 'rot': 1},
    {'kind': 'lamp_post', 'x': 42, 'y': 30}, {'kind': 'lamp_post', 'x': 58, 'y': 29}, {'kind': 'lamp_post', 'x': 20, 'y': 29}, {'kind': 'blanket', 'x': 50, 'y': 30}, {'kind': 'barrel', 'x': 74, 'y': 30},
    # the loft to rent, Coker's house and her store
    {'kind': 'bed', 'x': 53, 'y': 35, 'rot': 1, 'id': 'ds_loft_bed'}, {'kind': 'locker', 'x': 55, 'y': 36, 'id': 'ds_loft_locker'}, {'kind': 'sign', 'x': 55, 'y': 31, 'rot': 0, 'id': 'ds_loft'},
    {'kind': 'cot', 'x': 61, 'y': 35, 'rot': 1}, {'kind': 'cot', 'x': 61, 'y': 37, 'rot': 1}, {'kind': 'table', 'x': 64, 'y': 35}, {'kind': 'locker', 'x': 65, 'y': 37, 'id': 'ds_coker_store'},
    # Coker's dive stage: the air pump, the hoses, the ladder, the Sow
    {'kind': 'machine', 'x': 56, 'y': 46, 'rot': 0}, {'kind': 'pipe_h', 'x': 57, 'y': 46}, {'kind': 'pipe_h', 'x': 58, 'y': 46}, {'kind': 'sign', 'x': 62, 'y': 49, 'rot': 2, 'id': 'ds_dive_stage'},
    {'kind': 'crate', 'x': 65, 'y': 45}, {'kind': 'barrel', 'x': 65, 'y': 47}, {'kind': 'wagon', 'x': 60, 'y': 51, 'rot': 1, 'id': 'ds_sow'}, {'kind': 'lamp_post', 'x': 54, 'y': 45},
    # the Ebb Steps
    {'kind': 'sign', 'x': 39, 'y': 54, 'rot': 2, 'id': 'ds_ebb'}, {'kind': 'debris', 'x': 36, 'y': 53}, {'kind': 'lamp_post', 'x': 42, 'y': 52},
    # the Jesty: the lantern hook on the parapet, the wreck's broken hold
    {'kind': 'sign', 'x': 8, 'y': 47, 'rot': 1, 'id': 'ds_jesty'}, {'kind': 'debris', 'x': 10, 'y': 50}, {'kind': 'debris', 'x': 14, 'y': 53}, {'kind': 'crate', 'x': 18, 'y': 48},
    {'kind': 'sign', 'x': 24, 'y': 50, 'rot': 3, 'id': 'ds_wreck'}, {'kind': 'crate', 'x': 26, 'y': 49}, {'kind': 'barrel_rust', 'x': 26, 'y': 53}, {'kind': 'debris', 'x': 23, 'y': 53},
    # the sea wall
    {'kind': 'sign', 'x': 78, 'y': 33, 'rot': 1, 'id': 'ds_seawall'}, {'kind': 'debris', 'x': 75, 'y': 34},
]

spots = {
    'landing': {'x': 66, 'y': 11}, 'landing_b': {'x': 61, 'y': 11}, 'landing_lean': {'x': 60, 'y': 12}, 'landing_pair_a': {'x': 68, 'y': 11}, 'landing_pair_b': {'x': 69, 'y': 11},
    'hassan': {'x': 47, 'y': 7}, 'smoke_work': {'x': 49, 'y': 6}, 'smoke_sit': {'x': 45, 'y': 7},
    'oona': {'x': 16, 'y': 22}, 'court_sit': {'x': 19, 'y': 21}, 'court_sit_b': {'x': 23, 'y': 23}, 'court_pair_a': {'x': 25, 'y': 21}, 'court_pair_b': {'x': 25, 'y': 22}, 'court_lua': {'x': 20, 'y': 22},
    'thorne': {'x': 34, 'y': 22}, 'post_door': {'x': 34, 'y': 27},
    'lua': {'x': 7, 'y': 34}, 'lua_bed': {'x': 6, 'y': 36}, 'paz': {'x': 15, 'y': 34}, 'paz_bed': {'x': 14, 'y': 36}, 'rui': {'x': 16, 'y': 35}, 'rui_bed': {'x': 16, 'y': 36},
    'curlew': {'x': 27, 'y': 34}, 'netstore': {'x': 22, 'y': 34},
    'mele': {'x': 61, 'y': 24}, 'mele_bed': {'x': 60, 'y': 25},
    'yewande': {'x': 59, 'y': 47}, 'yewande_bed': {'x': 62, 'y': 36}, 'amara': {'x': 63, 'y': 47}, 'amara_bed': {'x': 62, 'y': 37}, 'ade': {'x': 57, 'y': 48},
    'stage_work': {'x': 61, 'y': 46}, 'stage_sit': {'x': 64, 'y': 49},
    'ebb': {'x': 39, 'y': 53}, 'ebb_sit': {'x': 37, 'y': 54}, 'ebb_pair_a': {'x': 41, 'y': 54}, 'ebb_pair_b': {'x': 42, 'y': 54},
    'jesty_work': {'x': 12, 'y': 50}, 'wreck_work': {'x': 25, 'y': 52}, 'wreck_work_b': {'x': 23, 'y': 49},
    'gut_a': {'x': 39, 'y': 20}, 'gut_b': {'x': 39, 'y': 36}, 'gut_lean': {'x': 40, 'y': 46}, 'row_pair_a': {'x': 50, 'y': 29}, 'row_pair_b': {'x': 51, 'y': 29}, 'row_work': {'x': 30, 'y': 30},
    'loft': {'x': 54, 'y': 35}, 'press_boy': {'x': 22, 'y': 33}, 'seawall': {'x': 76, 'y': 33},
}

LUA, YEW, THORNE, MATEO = 'npc_ds_02', 'npc_ds_03', 'npc_ds_04', 'npc_ds_05'
npcs = [
    {'def': 'npc_ds_01', 'x': 16, 'y': 22, 'facing': 1},
    # Lua at the Ebb Steps on the day her boy goes out; after, at her loft, until she leaves the shore
    {'def': LUA, 'id': 'npc_ds_02_ebb', 'x': 39, 'y': 53, 'facing': 2, 'schedule': [], 'if': NOT(F('ds_lua_met'))},
    {'def': LUA, 'x': 7, 'y': 34, 'facing': 2, 'if': ALL(F('ds_lua_met'), NOT(F('ds_lua_gone')))},
    {'def': YEW, 'x': 59, 'y': 47, 'facing': 2, 'if': NOT(ANY(F('ds_coker_dead'), F('ds_coker_off')))},
    {'def': THORNE, 'x': 34, 'y': 22, 'facing': 3, 'if': ALL(NOT(F('ds_post', 'gone')), NOT(F('ds_thorne', 'fled')))},
    {'def': MATEO, 'x': 61, 'y': 11, 'facing': 2, 'schedule': [], 'if': ALL(F('ds_mateo_here'), NOT(F('ds_court')))},
    {'def': MATEO, 'id': 'npc_ds_05_curlew', 'x': 27, 'y': 34, 'facing': 1, 'schedule': [], 'if': ANY(F('ds_court', 'living'), F('ds_court', 'sold'))},
    {'def': 'npc_ds_06', 'x': 15, 'y': 34, 'facing': 2},
    {'def': 'npc_ds_07', 'x': 16, 'y': 35, 'facing': 2, 'if': NOT(F('ds_rui', 'put_off'))},
    {'def': 'npc_ds_08', 'x': 66, 'y': 11, 'facing': 2},
    {'def': 'npc_ds_09', 'x': 47, 'y': 7, 'facing': 2},
    {'def': 'npc_ds_14', 'x': 63, 'y': 47, 'facing': 2, 'if': NOT(ANY(F('ds_coker_dead'), F('ds_coker_off')))},
    {'def': 'npc_ds_14', 'id': 'npc_ds_14_alone', 'x': 64, 'y': 49, 'facing': 2, 'schedule': [], 'if': F('ds_coker_dead')},
    {'def': 'npc_ds_15', 'x': 57, 'y': 48, 'facing': 1},
    # the guild's diver comes in with the barge by day and drinks under the post's awning
    {'def': 'npc_ds_g2', 'id': 'npc_ds_g2_post', 'x': 35, 'y': 27, 'facing': 2, 'schedule': [], 'if': ALL(DAY, NOT(F('ds_barge')), NOT(F('ds_marek_gone')))},
    # the boy off the press, if he was freed on the dike
    {'def': 'npc_ds_w_boy', 'id': 'npc_ds_w_boy_lofts', 'x': 22, 'y': 33, 'facing': 2, 'schedule': [], 'if': F('ds_press_boy', 'freed')},
]

spawns = [
    {'id': 'start', 'x': 76, 'y': 1, 'facing': 2}, {'id': 'from_meridian', 'x': 76, 'y': 1, 'facing': 2},
    {'id': 'from_rigs', 'x': 64, 'y': 10, 'facing': 2}, {'id': 'jetty', 'x': 64, 'y': 10, 'facing': 2},
    {'id': 'from_lm_shore_01', 'x': 77, 'y': 33, 'facing': 3}, {'id': 'seawall', 'x': 77, 'y': 33, 'facing': 3},
    {'id': 'loft', 'x': 54, 'y': 34, 'facing': 2}, {'id': 'stage', 'x': 60, 'y': 45, 'facing': 2}, {'id': 'greta', 'x': 20, 'y': 19, 'facing': 2},
]

TALK = {
    'ds_tides': ('d_ds_tides', 'The tide table'), 'ds_tideboat': ('d_ds_tideboat', 'The tide boat'), 'ds_nets': ('d_ds_nets', 'Hands wanted'),
    'ds_book': ('d_ds_book', 'The Book of Water'), 'ds_notice': ('d_ds_notice', 'The tide post\'s notice'), 'ds_kai': ('d_ds_kai', 'A small cot'),
    'ds_curlew': ('d_ds_curlew', 'The Curlew'), 'ds_loft': ('d_ds_loft', 'A cabin to let'), 'ds_loft_bed': ('d_ds_loft', 'The cabin'),
    'ds_dive_stage': ('d_ds_dive', 'The dive ladder'), 'ds_sow': ('d_ds_dive', 'The Sow'), 'ds_ebb': ('d_ds_ebb', 'The Ebb Steps'),
    'ds_jesty': ('d_ds_jesty', 'The parapet'), 'ds_wreck': ('d_ds_wreck', 'The salt barge'), 'ds_seawall': ('d_ds_seawall', 'The sea wall'),
}

ds_stilts = {
    'id': 'ds_stilts', 'name': 'Gull Stilts', 'seed': 521, 'settlement': 'hamlet_shore',
    'layout': rows,
    'legend': {
        'W': {'floor': 'water', 'blocks': True}, 'w': {'floor': 'water'}, 'm': {'floor': 'dirt'}, 'r': {'floor': 'sand'}, 'a': {'floor': 'rubble'},
        'b': {'floor': 'wood'}, 'g': {'floor': 'grate'}, 'c': {'floor': 'concrete'}, 'k': {'floor': 'concrete'}, 'h': {'floor': 'metal'}, 'n': {'floor': 'metal'}, 'f': {'floor': 'wood'},
        'K': {'wall': 'brick', 'floor': 'concrete', 'wallHeight': 3.0, 'roof': 'tin'},
        'H': {'wall': 'metal', 'floor': 'metal', 'wallHeight': 3.4, 'roof': 'none'},
        'C': {'wall': 'metal', 'floor': 'metal', 'wallHeight': 2.6, 'roof': 'flat'},
        'L': {'wall': 'wood', 'floor': 'wood', 'wallHeight': 3.0, 'roof': 'pitched'},
        'U': {'wall': 'wood', 'floor': 'wood', 'wallHeight': 2.6, 'roof': 'pitched'},
        'S': {'wall': 'scrap', 'floor': 'wood', 'wallHeight': 2.6, 'roof': 'tin'},
        'J': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 1.0},
    },
    'props': props,
    'lights': [
        {'x': 62, 'y': 9, 'height': 3.4, 'color': 'hex:0xffd8a0', 'intensity': 2.0, 'range': 10}, {'x': 51, 'y': 4, 'height': 0.8, 'color': 'hex:0xff9a40', 'intensity': 1.6, 'range': 6, 'flicker': 0.35},
        {'x': 12, 'y': 19, 'height': 3.0, 'color': 'hex:0xffc890', 'intensity': 1.8, 'range': 9, 'flicker': 0.15}, {'x': 12, 'y': 25, 'height': 3.0, 'color': 'hex:0xffc890', 'intensity': 1.8, 'range': 9, 'flicker': 0.15},
        {'x': 34, 'y': 22, 'height': 2.4, 'color': 'hex:0xf4f0e0', 'intensity': 1.6, 'range': 6},
        {'x': 42, 'y': 30, 'height': 3.2, 'color': 'hex:0xffd090', 'intensity': 1.8, 'range': 9, 'flicker': 0.2}, {'x': 58, 'y': 29, 'height': 3.2, 'color': 'hex:0xffd090', 'intensity': 1.8, 'range': 9, 'flicker': 0.2}, {'x': 20, 'y': 29, 'height': 3.2, 'color': 'hex:0xffd090', 'intensity': 1.8, 'range': 9, 'flicker': 0.2},
        {'x': 54, 'y': 45, 'height': 3.2, 'color': 'hex:0xfff0d0', 'intensity': 2.0, 'range': 9}, {'x': 42, 'y': 52, 'height': 3.0, 'color': 'hex:0xffb070', 'intensity': 1.6, 'range': 8, 'flicker': 0.25},
        {'x': 7, 'y': 35, 'height': 2.2, 'color': 'hex:0xffb070', 'intensity': 1.2, 'range': 5, 'flicker': 0.2}, {'x': 63, 'y': 36, 'height': 2.2, 'color': 'hex:0xffb070', 'intensity': 1.2, 'range': 5, 'flicker': 0.2},
        # Lean's light on the horizon, out west over the water
        {'x': 1, 'y': 24, 'height': 14, 'color': 'hex:0xff8a30', 'intensity': 1.4, 'range': 16, 'flicker': 0.3},
    ],
    'spawns': spawns,
    'talk': {k: {'dialogue': v[0], 'name': v[1]} for k, v in TALK.items()},
    'containers': {
        'ds_post_box': {'name': 'Tide Post Box', 'items': [['k_ds_tally', 1]], 'tolls': 90, 'lock': 45},
        'ds_coker_store': {'name': 'Coker\'s Store', 'items': [['k_ds_salt', 1], ['j_cloth', 3]], 'lock': 30},
        'ds_loft_locker': {'name': 'Cabin Locker', 'items': [], 'yoursIf': {'flag': 'ds_loft_rented'}},
    },
    'spots': spots,
    'npcs': npcs,
    'triggers': [
        {'id': 'arrive', 'x': 56, 'y': 0, 'w': 24, 'h': 13, 'text': 'Gull Stilts: a village on legs, standing in the sea. Houses of tin and pallet and car doors on posts driven into a drowned town\'s streets, boardwalks for streets, boats for carts, and under the boards, a yard down in green water, the tops of street lamps. The water has a skin on it like a bruise, purple and gold where the light catches it, and the smell of the village is fish, smoke and something under both that belongs in an engine.', 'effects': [{'learn': 'seen_stilts'}, {'set': 'ds_open'}, {'lead': 'l_ds_sheen'}, {'quest': 'q_ds_sheen', 'start': True}]},
        {'id': 'ebb', 'x': 35, 'y': 50, 'w': 9, 'h': 6, 'if': NOT(F('ds_lua_met')), 'text': 'The Ebb Steps: the broad steps of some drowned hall going down into the water, and half the village on them. A small shape in a weighted net lies on the bottom step with the tide going out over its feet. A woman kneels by it with her hands flat on the net, not crying. Nobody speaks. A man begins to say a name and stops when she looks at him.', 'effects': [{'learn': 'ds_burial_seen'}]},
        {'id': 'greta', 'x': 11, 'y': 19, 'w': 19, 'h': 7, 'text': 'The Greta: a car ferry from before the Burn, run aground in the middle of the village and never refloated, her car deck open to the sky. Benches where the cars stood. At the bow end, under two lamps, a chart table with a book on it as thick as a brick, and an old woman who looks up from it as if she knew you were coming aboard.', 'effects': [{'learn': 'ds_greta_seen'}]},
        {'id': 'post', 'x': 34, 'y': 25, 'w': 2, 'h': 3, 'text': 'A steel container on a pontoon, lashed to the Greta\'s stern, painted in the guild\'s colours under the rust: the tide post. SALT — TWINE — MEDICINE — FISH BOUGHT. A man in a good coat behind the counter, writing.', 'effects': [{'learn': 'ds_post_seen'}]},
        {'id': 'jesty', 'x': 7, 'y': 46, 'w': 13, 'h': 9, 'text': 'The Jesty: a drowned hotel\'s roof, the only thing in the bay taller than the stilts, with its parapet a hand above the water at high tide. Against its south edge a guild barge lies broken-backed where it struck, her hold open, divers going in and out of it like gulls at a gutted fish.', 'effects': [{'learn': 'ds_jesty_seen'}, {'quest': 'q_ds_light', 'start': True}]},
        {'id': 'stage', 'x': 54, 'y': 45, 'w': 13, 'h': 6, 'text': 'Coker\'s dive stage: a grate platform with a hand-cranked air pump on it, a coil of hose as thick as a wrist, ladders going down into the green, and a woman counting under her breath with her eyes on a line in the water.', 'effects': [{'learn': 'ds_stage_seen'}]},
    ],
    'extras': [
        {'count': 6, 'roles': ['fisher', 'fisher', 'settler', 'trader'], 'life': 'hard', 'area': {'x': 38, 'y': 9, 'w': 3, 'h': 44}, 'spots': ['gut_a', 'gut_b', 'gut_lean', 'row_pair_a', 'row_pair_b', 'row_work'], 'hours': {'from': 5, 'to': 21}, 'talk': 'd_ds_x_fisher',
         'barks': ['Mind the boards by the Greta. Rotten since the spring.', 'Mackerel tastes of the rig. Eat it anyway.', 'Slack at four. The city\'s table says.', 'Somebody fell off the Gut last week. Somebody always does.']},
        {'count': 4, 'roles': ['fisher', 'settler'], 'life': 'hard', 'ages': [16, 70], 'area': {'x': 4, 'y': 29, 'w': 24, 'h': 2}, 'spots': ['netstore', 'row_work'], 'hours': {'from': 6, 'to': 20}, 'talk': 'd_ds_x_fisher',
         'barks': ['Twine\'s dearer than the fish now.', 'Lua hasn\'t mended a net since. Who would.', 'Hold the end. No, the end.']},
        {'count': 4, 'roles': ['fisher', 'labourer'], 'life': 'hard', 'area': {'x': 21, 'y': 47, 'w': 8, 'h': 9}, 'spots': ['wreck_work', 'wreck_work_b', 'jesty_work'], 'hours': {'from': 7, 'to': 18}, 'talk': 'd_ds_x_fisher',
         'barks': ['What the water wrecks, the water gives. That\'s the Book.', 'Salt. Sacks of it. Dry, some of it.', 'Two of the barge crew drowned. Guild men. Still men.']},
        {'count': 4, 'roles': ['settler', 'fisher', 'drifter'], 'life': 'hard', 'ages': [6, 75], 'area': {'x': 35, 'y': 50, 'w': 9, 'h': 6}, 'spots': ['ebb_sit', 'ebb_pair_a', 'ebb_pair_b'], 'hours': {'from': 8, 'to': 20}, 'talk': 'd_ds_x_fisher',
         'barks': ['Out on the ebb. Same as my mother.', 'You can see the lamp posts from here at low water.', 'Don\'t swim under the Gut. Not now.']},
        {'count': 4, 'roles': ['fisher', 'settler', 'trader'], 'life': 'hard', 'area': {'x': 11, 'y': 19, 'w': 19, 'h': 7}, 'spots': ['court_sit', 'court_sit_b', 'court_pair_a', 'court_pair_b'], 'hours': {'from': 17, 'to': 24}, 'talk': 'd_ds_x_fisher',
         'barks': ['Oona\'s got the Book open. Somebody\'s in trouble.', 'Page nine. Always page nine with her.', 'The guild pays the anchorage. The widows eat. Don\'t say it louder.']},
        {'count': 3, 'roles': ['fisher', 'trader'], 'life': 'hard', 'area': {'x': 58, 'y': 9, 'w': 13, 'h': 4}, 'spots': ['landing_b', 'landing_lean', 'landing_pair_a', 'landing_pair_b'], 'hours': {'from': 5, 'to': 20}, 'talk': 'd_ds_x_fisher',
         'barks': ['Tide boat\'s at six, if Mele\'s sober. She\'s always sober.', 'Salt up from the city again. Dearer.', 'Rigs folk in on the launch. Smell them before you see them.']},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0x9aa8b2', 'fogDensity': 0.015, 'dust': 0.04, 'grade': 0.25, 'mood': 'haze', 'sound': 'birds'},
}
check('ds_stilts', rows, ds_stilts['legend'], props, spawns, npcs, spots, 'start', TALK.keys())

# ================================================================ the Rigs
W, H = 64, 48
g = grid(W, H, 'W')
# Hum: the main deck
fill(g, 24, 8, 52, 34, 'm')
building(g, 26, 9, 37, 16, 'C', 'm', [(31, 16)])          # the turbine hall
building(g, 40, 9, 50, 15, 'C', 'n', [(45, 15)])          # the control room (the board)
building(g, 40, 19, 45, 24, 'C', 'f', [(42, 24)])         # crew container
building(g, 47, 19, 51, 24, 'C', 'f', [(49, 24)])         # crew container
fill(g, 47, 28, 51, 33, 'g')                               # the north-east leg's moonpool grate
fill(g, 53, 30, 58, 34, 'g')                               # the landing stage
# the catwalk west to Lean, and Lean itself, listing
fill(g, 10, 20, 23, 21, 'g'); fill(g, 3, 14, 12, 26, 'm')
building(g, 4, 15, 9, 19, 'C', 'n', [(7, 19)])
# the catwalk south to Stump, and Stump's legs
fill(g, 30, 35, 31, 40, 'g'); fill(g, 26, 41, 36, 45, 'g')
rows = [''.join(r) for r in g]

props = [
    # the turbine hall
    {'kind': 'machine', 'x': 28, 'y': 11, 'rot': 0}, {'kind': 'machine', 'x': 31, 'y': 11, 'rot': 0}, {'kind': 'machine', 'x': 34, 'y': 11, 'rot': 0},
    {'kind': 'pipe_h', 'x': 29, 'y': 14}, {'kind': 'pipe_h', 'x': 30, 'y': 14}, {'kind': 'pipe_h', 'x': 33, 'y': 14}, {'kind': 'barrel', 'x': 36, 'y': 15},
    # the board
    {'kind': 'terminal', 'x': 45, 'y': 10, 'rot': 0, 'id': 'ds_board'}, {'kind': 'terminal', 'x': 42, 'y': 10, 'rot': 0}, {'kind': 'chair', 'x': 45, 'y': 11, 'rot': 2}, {'kind': 'table', 'x': 48, 'y': 13}, {'kind': 'shelf', 'x': 49, 'y': 10, 'rot': 3},
    # the stills on the open deck
    {'kind': 'tank', 'x': 27, 'y': 20}, {'kind': 'tank', 'x': 30, 'y': 20}, {'kind': 'tank', 'x': 33, 'y': 20}, {'kind': 'pipe_h', 'x': 28, 'y': 22}, {'kind': 'pipe_h', 'x': 31, 'y': 22},
    {'kind': 'fire_barrel', 'x': 29, 'y': 24}, {'kind': 'barrel', 'x': 35, 'y': 23}, {'kind': 'barrel', 'x': 36, 'y': 23}, {'kind': 'barrel_rust', 'x': 26, 'y': 25},
    # the crew's containers and their store
    {'kind': 'cot', 'x': 41, 'y': 20, 'rot': 1}, {'kind': 'cot', 'x': 44, 'y': 20, 'rot': 1}, {'kind': 'cot', 'x': 48, 'y': 20, 'rot': 1}, {'kind': 'locker', 'x': 50, 'y': 20, 'id': 'ds_rig_store'},
    # the mess
    {'kind': 'table', 'x': 37, 'y': 28}, {'kind': 'table', 'x': 38, 'y': 28}, {'kind': 'table', 'x': 41, 'y': 30}, {'kind': 'chair', 'x': 37, 'y': 29, 'rot': 0}, {'kind': 'chair', 'x': 41, 'y': 31, 'rot': 0}, {'kind': 'stove', 'x': 44, 'y': 27},
    # the moonpool hatch, the flare, the crane, the launch
    {'kind': 'sign', 'x': 49, 'y': 31, 'rot': 0, 'id': 'ds_leg_hatch'}, {'kind': 'lamp_post', 'x': 25, 'y': 33}, {'kind': 'machine', 'x': 25, 'y': 27, 'rot': 1},
    {'kind': 'wagon', 'x': 59, 'y': 32, 'rot': 1, 'id': 'ds_launch'}, {'kind': 'crate', 'x': 56, 'y': 30}, {'kind': 'crate', 'x': 57, 'y': 30},
    # Lean: the lamp room and the derrick
    {'kind': 'sign', 'x': 6, 'y': 16, 'rot': 2, 'id': 'ds_lean_lamp'}, {'kind': 'cot', 'x': 5, 'y': 18, 'rot': 1}, {'kind': 'machine', 'x': 10, 'y': 24, 'rot': 0}, {'kind': 'debris', 'x': 4, 'y': 23},
    # Stump: the deep hatch
    {'kind': 'sign', 'x': 31, 'y': 43, 'rot': 2, 'id': 'ds_stump_dive'}, {'kind': 'machine', 'x': 34, 'y': 42, 'rot': 0}, {'kind': 'pipe_h', 'x': 35, 'y': 44},
]

spots = {
    'hamid': {'x': 44, 'y': 12}, 'hamid_mess': {'x': 38, 'y': 29}, 'hamid_bed': {'x': 42, 'y': 21},
    'leila': {'x': 31, 'y': 13}, 'leila_bed': {'x': 48, 'y': 21}, 'ewan': {'x': 7, 'y': 17}, 'ewan_bed': {'x': 6, 'y': 18},
    'sunhee': {'x': 29, 'y': 43}, 'sunhee_bed': {'x': 43, 'y': 22},
    'still_work': {'x': 31, 'y': 24}, 'still_work_b': {'x': 34, 'y': 25}, 'mess_sit': {'x': 38, 'y': 30}, 'mess_pair_a': {'x': 40, 'y': 32}, 'mess_pair_b': {'x': 41, 'y': 32},
    'deck_lean': {'x': 52, 'y': 28}, 'landing': {'x': 54, 'y': 32}, 'hatch': {'x': 48, 'y': 30}, 'stump_work': {'x': 33, 'y': 44},
}

npcs = [
    {'def': 'npc_ds_10', 'x': 44, 'y': 12, 'facing': 2, 'if': ALL(NOT(F('ds_hamid', 'left')), NOT(F('ds_hamid', 'dead')))},
    {'def': 'npc_ds_11', 'x': 31, 'y': 13, 'facing': 2, 'if': NOT(F('ds_hamid', 'left'))},
    {'def': 'npc_ds_12', 'x': 7, 'y': 17, 'facing': 2, 'if': NOT(F('ds_ewan_dead'))},
    {'def': 'npc_ds_13', 'x': 29, 'y': 43, 'facing': 0, 'if': NOT(F('ds_hamid', 'left'))},
    # Mateo off the court, if the Book was kept as written: Hum takes anyone who can carry
    {'def': 'npc_ds_05', 'id': 'npc_ds_05_rig', 'x': 34, 'y': 25, 'facing': 2, 'schedule': [], 'if': F('ds_court', 'written')},
]

spawns = [
    {'id': 'start', 'x': 54, 'y': 32, 'facing': 3}, {'id': 'landing', 'x': 54, 'y': 32, 'facing': 3},
    {'id': 'from_hamlet_shore', 'x': 54, 'y': 32, 'facing': 3}, {'id': 'from_meridian', 'x': 54, 'y': 32, 'facing': 3},
    {'id': 'hatch', 'x': 48, 'y': 30, 'facing': 3},
]

TALK = {
    'ds_board': ('d_ds_board', 'Hum\'s board'), 'ds_leg_hatch': ('d_ds_leg_hatch', 'The moonpool hatch'), 'ds_launch': ('d_ds_launch', 'The crew\'s launch'),
    'ds_lean_lamp': ('d_ds_lean_lamp', 'Lean\'s lamp'), 'ds_stump_dive': ('d_ds_stump', 'The hatch on Stump'),
}

ds_rigs = {
    'id': 'ds_rigs', 'name': 'Rigs — Hum', 'seed': 522, 'settlement': 'rigs',
    'layout': rows,
    'legend': {
        'W': {'floor': 'water', 'blocks': True}, 'm': {'floor': 'metal'}, 'n': {'floor': 'metal'}, 'g': {'floor': 'grate'}, 'f': {'floor': 'wood'},
        'C': {'wall': 'metal', 'floor': 'metal', 'wallHeight': 3.0, 'roof': 'flat'},
    },
    'props': props,
    'lights': [
        {'x': 25, 'y': 33, 'height': 14, 'color': 'hex:0xff8a30', 'intensity': 3.2, 'range': 22, 'flicker': 0.35},
        {'x': 31, 'y': 12, 'height': 2.8, 'color': 'hex:0xffd8a0', 'intensity': 1.8, 'range': 9}, {'x': 45, 'y': 12, 'height': 2.6, 'color': 'hex:0xd8e8ff', 'intensity': 1.6, 'range': 7},
        {'x': 29, 'y': 24, 'height': 0.8, 'color': 'hex:0xff9a40', 'intensity': 1.6, 'range': 6, 'flicker': 0.35}, {'x': 40, 'y': 29, 'height': 2.8, 'color': 'hex:0xffd090', 'intensity': 1.6, 'range': 8},
        {'x': 49, 'y': 30, 'height': 3.0, 'color': 'hex:0xf0f4ff', 'intensity': 1.6, 'range': 7}, {'x': 56, 'y': 32, 'height': 3.0, 'color': 'hex:0xffd8a0', 'intensity': 1.6, 'range': 8},
        {'x': 7, 'y': 16, 'height': 9, 'color': 'hex:0xffb050', 'intensity': 2.4, 'range': 14, 'flicker': 0.25}, {'x': 31, 'y': 43, 'height': 2.6, 'color': 'hex:0xffd090', 'intensity': 1.2, 'range': 6},
    ],
    'spawns': spawns,
    'talk': {k: {'dialogue': v[0], 'name': v[1]} for k, v in TALK.items()},
    'containers': {
        'ds_rig_store': {'name': 'Crew Store', 'items': [['j_fuel', 2], ['c_smoked_fish', 2]], 'lock': 40},
    },
    'spots': spots,
    'npcs': npcs,
    'triggers': [
        {'id': 'arrive', 'x': 53, 'y': 30, 'w': 6, 'h': 5, 'text': 'Hum: a steel island on four legs, rust-red and salt-white, with a flame on a stack at its western corner that has not gone out in ninety years. Under your boots the whole platform trembles, steady as a held note. That is the turbine, burning the gas Hum lifts out of the sea floor to lift the oil. Forty people live up here on nothing that grows.', 'effects': [{'learn': 'ds_rigs_seen'}, {'learn': 'loc_rigs'}]},
        {'id': 'turbine', 'x': 27, 'y': 10, 'w': 10, 'h': 6, 'text': 'The turbine hall: the noise is a wall you walk into. Three machines the size of trucks, two dead, one alive and shaking its housing with something like contentment. Somebody has chalked on its casing, in a careful hand that has been gone over every year: DON\'T LET HER STOP.', 'effects': [{'learn': 'ds_turbine_seen'}]},
        {'id': 'catwalk', 'x': 10, 'y': 20, 'w': 14, 'h': 2, 'text': 'A catwalk over open water to Lean, the dead platform, which lists to the south as if it were listening to something under the sea. A lamp burns in a glass room on its derrick: the shore\'s light, fed by a hose of Hum\'s gas.', 'effects': [{'learn': 'ds_lean_seen'}]},
    ],
    'extras': [
        {'count': 4, 'roles': ['labourer', 'tech', 'labourer'], 'life': 'hard', 'area': {'x': 26, 'y': 18, 'w': 12, 'h': 9}, 'spots': ['still_work', 'still_work_b'], 'hours': {'from': 6, 'to': 20}, 'talk': 'd_ds_x_crew',
         'barks': ['Don\'t let her stop.', 'Lamp oil, rig diesel, and tar for the Stilts\' hulls. That\'s Hum\'s whole catalogue.', 'Pressure\'s down again. Hamid says she\'s tired.']},
        {'count': 3, 'roles': ['labourer', 'settler', 'tech'], 'life': 'hard', 'area': {'x': 36, 'y': 27, 'w': 9, 'h': 6}, 'spots': ['mess_sit', 'mess_pair_a', 'mess_pair_b', 'deck_lean'], 'hours': {'from': 17, 'to': 23}, 'talk': 'd_ds_x_crew',
         'barks': ['Fish again. Fish from the Stilts. They hate us and they sell us fish.', 'One tanker a month. One. And the guild wants two.', 'My grandfather climbed up a leg with a knife in his teeth. Now look at us. Accountants.']},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0x8e9aa4', 'fogDensity': 0.013, 'dust': 0.04, 'grade': 0.3, 'mood': 'haze', 'sound': 'hum'},
}
check('ds_rigs', rows, ds_rigs['legend'], props, spawns, npcs, spots, 'start', TALK.keys())

# ================================================================ Hum's north-east leg
W, H = 40, 30
g = grid(W, H, 'X')
fill(g, 3, 3, 7, 6, 'g')                                   # under the hatch
fill(g, 6, 7, 8, 12, 'g')                                  # the stair down
fill(g, 4, 13, 20, 17, 'g')                                # the riser deck
fill(g, 21, 13, 21, 14, 'g'); fill(g, 22, 8, 30, 14, 'm')  # the pump room, in an air pocket
fill(g, 10, 18, 30, 24, 'w'); fill(g, 14, 21, 18, 24, 'D')  # the flooded section; a shaft of deep water in it
fill(g, 31, 17, 37, 26, 'w'); fill(g, 35, 25, 37, 26, 'D')  # the valve chamber
rows = [''.join(r) for r in g]
props = [
    {'kind': 'sign', 'x': 5, 'y': 3, 'rot': 2, 'id': 'ds_leg_ladder'}, {'kind': 'pipe_h', 'x': 3, 'y': 6},
    {'kind': 'pipe_h', 'x': 8, 'y': 14}, {'kind': 'pipe_h', 'x': 9, 'y': 14}, {'kind': 'pipe_h', 'x': 12, 'y': 16}, {'kind': 'pipe_h', 'x': 13, 'y': 16}, {'kind': 'debris', 'x': 17, 'y': 15},
    {'kind': 'terminal', 'x': 25, 'y': 9, 'rot': 0, 'id': 'ds_leg_gauge'}, {'kind': 'locker', 'x': 29, 'y': 9, 'id': 'ds_leg_locker'}, {'kind': 'machine', 'x': 23, 'y': 11, 'rot': 1}, {'kind': 'crate', 'x': 28, 'y': 13},
    {'kind': 'debris', 'x': 12, 'y': 19}, {'kind': 'debris', 'x': 26, 'y': 22},
    {'kind': 'pump', 'x': 34, 'y': 21, 'rot': 3, 'id': 'ds_leg_valve'}, {'kind': 'pipe_h', 'x': 35, 'y': 21}, {'kind': 'pipe_h', 'x': 36, 'y': 21},
]
spots = {'hatch': {'x': 5, 'y': 4}, 'riser': {'x': 12, 'y': 15}, 'pocket': {'x': 26, 'y': 11}, 'valve': {'x': 33, 'y': 21}}
spawns = [{'id': 'start', 'x': 5, 'y': 4, 'facing': 2}, {'id': 'hatch', 'x': 5, 'y': 4, 'facing': 2}]
TALK = {'ds_leg_ladder': ('d_ds_leg_ladder', 'The ladder up'), 'ds_leg_gauge': ('d_ds_leg_gauge', 'The gauges'), 'ds_leg_valve': ('d_ds_valve', 'The export valve')}
ds_rig_leg = {
    'id': 'ds_rig_leg', 'name': 'Hum — North-east Leg', 'seed': 523, 'settlement': 'rigs', 'interior': True,
    'layout': rows,
    'legend': {
        'g': {'floor': 'grate'}, 'm': {'floor': 'metal'}, 'w': {'floor': 'water'}, 'D': {'floor': 'water', 'blocks': True},
        'X': {'wall': 'metal', 'floor': 'metal', 'wallHeight': 3.2},
    },
    'props': props,
    'lights': [
        {'x': 5, 'y': 4, 'height': 2.6, 'color': 'hex:0xd8e8ff', 'intensity': 1.4, 'range': 6}, {'x': 12, 'y': 15, 'height': 2.4, 'color': 'hex:0xa8c8e0', 'intensity': 1.0, 'range': 6, 'flicker': 0.2},
        {'x': 26, 'y': 11, 'height': 2.4, 'color': 'hex:0xffd090', 'intensity': 1.2, 'range': 6, 'flicker': 0.15}, {'x': 33, 'y': 21, 'height': 1.2, 'color': 'hex:0x80b0c8', 'intensity': 1.0, 'range': 6},
    ],
    'spawns': spawns,
    'talk': {k: {'dialogue': v[0], 'name': v[1]} for k, v in TALK.items()},
    'containers': {'ds_leg_locker': {'name': 'Diver\'s Locker', 'items': [['t_rebreather', 1], ['j_electronics', 2], ['u_powercell', 1]], 'lock': 35}},
    'spots': spots,
    'npcs': [],
    'triggers': [
        {'id': 'down', 'x': 3, 'y': 3, 'w': 5, 'h': 4, 'text': 'Down the moonpool ladder, rung by rung, out of the hum and into the cold. The leg is a steel well thirty yards across, ribbed like a throat, with the sea breathing in and out of its bottom. Your lamp finds pipes as thick as a man going down into the dark, and a stair.', 'effects': [{'learn': 'ds_leg_down'}]},
        {'id': 'waterline', 'x': 10, 'y': 18, 'w': 21, 'h': 2, 'text': 'The stair ends in water. Below the waterline the cold closes on your chest like a hand; the sea is in the leg to your waist and black where it is deeper. A hose of bubbles comes up from something far below and breaks under your chin with a smell of rotten eggs.', 'effects': [{'learn': 'ds_leg_flooded'}]},
        {'id': 'chamber', 'x': 31, 'y': 17, 'w': 4, 'h': 10, 'text': 'The valve chamber: a manifold of pipes going down through the floor of the leg and out along the sea bed, toward the shore. One great wheel, its spindle bright where somebody has turned it, recently, and turned it a long way.', 'effects': [{'learn': 'ds_valve_chamber'}]},
    ],
    'ambience': {'indoor': True, 'fogColor': 'hex:0x0e1418', 'fogDensity': 0.05, 'dust': 0.2, 'ambient': {'color': 'hex:0x203040', 'intensity': 0.25}, 'grade': 0.4, 'mood': 'grim', 'sound': 'drip'},
}
check('ds_rig_leg', rows, ds_rig_leg['legend'], props, spawns, [], spots, 'start', TALK.keys())

# ================================================================ Blackcap
W, H = 48, 36
g = grid(W, H, 'W')
# the tank's roof standing out of the water: a round cap (an octagon of rim), a low parapet with a stair gap on the south
fill(g, 17, 7, 31, 23, 'm')
ring(g, 16, 6, 32, 24, 'T')
for (x, y) in [(16, 6), (17, 6), (16, 7), (32, 6), (31, 6), (32, 7), (16, 24), (17, 24), (16, 23), (32, 24), (31, 24), (32, 23)]:
    g[y][x] = 'W'
g[7][17] = 'T'; g[7][31] = 'T'; g[23][17] = 'T'; g[23][31] = 'T'; g[6][18] = 'T'; g[6][30] = 'T'; g[24][18] = 'T'; g[24][30] = 'T'
g[24][24] = 'm'
# the stair down and the jetty to the barge; the barge; the sea wall's end; the mud
fill(g, 24, 25, 24, 29, 'b'); fill(g, 18, 30, 32, 32, 'b')
building(g, 33, 26, 45, 33, 'H', 'h', [(33, 30)])
fill(g, 0, 31, 17, 32, 'c'); fill(g, 0, 33, 12, 35, 'w')
rows = [''.join(r) for r in g]
props = [
    {'kind': 'pump', 'x': 24, 'y': 8, 'rot': 0}, {'kind': 'pipe_h', 'x': 23, 'y': 8}, {'kind': 'sign', 'x': 25, 'y': 8, 'rot': 2, 'id': 'ds_hose'},
    {'kind': 'sign', 'x': 24, 'y': 16, 'rot': 0, 'id': 'ds_cap'}, {'kind': 'debris', 'x': 20, 'y': 12}, {'kind': 'debris', 'x': 28, 'y': 20}, {'kind': 'barrel_rust', 'x': 30, 'y': 11},
    {'kind': 'lamp_post', 'x': 19, 'y': 30}, {'kind': 'crate', 'x': 31, 'y': 30}, {'kind': 'barrel', 'x': 31, 'y': 32},
    {'kind': 'sign', 'x': 40, 'y': 27, 'rot': 2, 'id': 'ds_barge'}, {'kind': 'locker', 'x': 44, 'y': 28, 'id': 'ds_barge_box'}, {'kind': 'tank', 'x': 37, 'y': 28}, {'kind': 'tank', 'x': 42, 'y': 31}, {'kind': 'pipe_h', 'x': 35, 'y': 27},
    {'kind': 'sign', 'x': 1, 'y': 31, 'rot': 3, 'id': 'ds_wall_end'}, {'kind': 'wagon', 'x': 20, 'y': 33, 'rot': 0, 'id': 'ds_skiff'}, {'kind': 'fence_post', 'x': 8, 'y': 34},
]
spots = {'silas': {'x': 38, 'y': 30}, 'marek': {'x': 36, 'y': 31}, 'hand': {'x': 41, 'y': 29}, 'watch': {'x': 39, 'y': 31}, 'hose': {'x': 25, 'y': 9}, 'cap': {'x': 24, 'y': 15}, 'jetty': {'x': 21, 'y': 31}}
NIGHT_LOAD = ALL(NIGHT, NOT(F('ds_barge')))
npcs = [
    {'def': 'npc_ds_g1', 'x': 38, 'y': 30, 'facing': 3, 'schedule': [], 'if': NIGHT_LOAD},
    {'def': 'npc_ds_g2', 'x': 36, 'y': 31, 'facing': 3, 'schedule': [], 'if': ALL(NIGHT_LOAD, NOT(F('ds_marek_gone')))},
    {'def': 'npc_ds_g3', 'x': 41, 'y': 29, 'facing': 3, 'schedule': [], 'if': NIGHT_LOAD},
    {'def': 'npc_ds_g3', 'id': 'npc_ds_g3_watch', 'x': 39, 'y': 31, 'facing': 3, 'schedule': [], 'if': ALL(DAY, NOT(F('ds_barge')))},
]
spawns = [
    {'id': 'start', 'x': 2, 'y': 31, 'facing': 1}, {'id': 'seawall', 'x': 2, 'y': 31, 'facing': 1}, {'id': 'from_hamlet_shore', 'x': 2, 'y': 31, 'facing': 1},
    {'id': 'jetty', 'x': 21, 'y': 31, 'facing': 0},
]
TALK = {'ds_hose': ('d_ds_hose', 'The guild\'s pump'), 'ds_cap': ('d_ds_cap', 'The tank\'s hatch'), 'ds_barge': ('d_ds_barge', 'The barge'),
        'ds_wall_end': ('d_ds_wall_end', 'The sea wall'), 'ds_skiff': ('d_ds_skiff', 'A skiff')}
ds_terminal = {
    'id': 'ds_terminal', 'name': 'Blackcap', 'seed': 524, 'settlement': 'hamlet_shore',
    'layout': rows,
    'legend': {
        'W': {'floor': 'water', 'blocks': True}, 'w': {'floor': 'water'}, 'm': {'floor': 'metal'}, 'b': {'floor': 'wood'}, 'c': {'floor': 'concrete'}, 'h': {'floor': 'metal'},
        'T': {'wall': 'metal', 'floor': 'metal', 'wallHeight': 1.0},
        'H': {'wall': 'metal', 'floor': 'metal', 'wallHeight': 2.2, 'roof': 'none'},
    },
    'props': props,
    'lights': [
        {'x': 19, 'y': 30, 'height': 3.0, 'color': 'hex:0xffd8a0', 'intensity': 1.4, 'range': 8, 'flicker': 0.2},
        {'x': 24, 'y': 9, 'height': 2.0, 'color': 'hex:0xffb070', 'intensity': 1.0, 'range': 6, 'flicker': 0.3},
    ],
    'spawns': spawns,
    'talk': {k: {'dialogue': v[0], 'name': v[1]} for k, v in TALK.items()},
    'containers': {'ds_barge_box': {'name': 'Barge Box', 'items': [['k_ds_manifest', 1]], 'tolls': 60, 'lock': 40}},
    'spots': spots,
    'npcs': npcs,
    'triggers': [
        {'id': 'arrive', 'x': 0, 'y': 30, 'w': 7, 'h': 4, 'text': 'Blackcap: the last tank of a drowned oil terminal, standing out of the bay like the cap of something buried to the eyebrows. The water round it is not water-coloured. It moves slowly, like syrup, and gives back the sky in purple and gold. The smell gets into your teeth.', 'effects': [{'learn': 'ds_blackcap_seen'}, {'learn': 'loc_lm_shore_01'}, {'learn': 'ds_sheen_source'}, {'lead': 'l_ds_blackcap'}]},
        {'id': 'roof', 'x': 18, 'y': 9, 'w': 13, 'h': 14, 'text': 'The tank\'s roof, black and warm underfoot. A pump on the north rim that is not ninety years old: new hose, new clamps, a guild padlock, and the guild\'s mark stencilled on its housing. The hose goes over the rim and down into the tank.', 'effects': [{'learn': 'ds_guild_pump'}]},
    ],
    'extras': [],
    'ambience': {'indoor': False, 'fogColor': 'hex:0x8a9098', 'fogDensity': 0.017, 'dust': 0.05, 'grade': 0.4, 'mood': 'haze', 'sound': 'wind'},
}
check('ds_terminal', rows, ds_terminal['legend'], props, spawns, npcs, spots, 'start', TALK.keys())

# ================================================================ the dike road (roadside)
W, H = 40, 26
g = grid(W, H, 'W')
fill(g, 0, 3, W - 1, 22, 'w')
fill(g, 0, 6, W - 1, 9, 'r'); fill(g, 0, 15, W - 1, 20, 'r')
fill(g, 0, 10, W - 1, 14, 'a')
rows = [''.join(r) for r in g]
props = [
    {'kind': 'car_wreck', 'x': 27, 'y': 18, 'rot': 1}, {'kind': 'wagon', 'x': 10, 'y': 17, 'rot': 0}, {'kind': 'fence_post', 'x': 30, 'y': 5}, {'kind': 'fence_post', 'x': 32, 'y': 5}, {'kind': 'fence_post', 'x': 34, 'y': 5},
    {'kind': 'debris', 'x': 18, 'y': 12}, {'kind': 'rock_small', 'x': 5, 'y': 8}, {'kind': 'campfire', 'x': 21, 'y': 17},
]
spots = {'here': {'x': 6, 'y': 12}, 'ahead': {'x': 13, 'y': 12}, 'ahead2': {'x': 14, 'y': 13}, 'side': {'x': 15, 'y': 16}, 'side2': {'x': 20, 'y': 18}, 'fire': {'x': 22, 'y': 16}, 'far': {'x': 24, 'y': 12}}
spawns = [{'id': 'here', 'x': 6, 'y': 12, 'facing': 1}, {'id': 'start', 'x': 6, 'y': 12, 'facing': 1}]
ds_wade = {
    'id': 'ds_wade', 'name': 'Delta Dike', 'seed': 525,
    'layout': rows,
    'legend': {'W': {'floor': 'water', 'blocks': True}, 'w': {'floor': 'water'}, 'r': {'floor': 'sand'}, 'a': {'floor': 'asphalt'}},
    'props': props,
    'lights': [{'x': 21, 'y': 16, 'height': 0.6, 'color': 'hex:0xff9a40', 'intensity': 1.6, 'range': 5, 'flicker': 0.35}],
    'spawns': spawns,
    'exits': [
        {'x': 0, 'y': 10, 'w': 1, 'h': 5, 'to': {'worldMap': True}, 'label': 'On along the dike'},
        {'x': W - 1, 'y': 10, 'w': 1, 'h': 5, 'to': {'worldMap': True}, 'label': 'On along the dike'},
    ],
    'spots': spots,
    'npcs': [],
    'triggers': [],
    'ambience': {'indoor': False, 'fogColor': 'hex:0xa0aab0', 'fogDensity': 0.02, 'dust': 0.03, 'grade': 0.3, 'mood': 'haze', 'sound': 'birds'},
    'hunting': 0.45,
}
check('ds_wade', rows, ds_wade['legend'], props, spawns, [], spots, 'start')

for m in (ds_stilts, ds_rigs, ds_rig_leg, ds_terminal, ds_wade):
    write(m)
