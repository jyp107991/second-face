#!/usr/bin/env python3
"""Generates the Ashlands' maps (B5d): src/content/maps/an_spindle.ts, an_kelso.ts, an_hall.ts, an_pemberton.ts,
an_saddleback.ts, an_glass.ts.

Spindle (`spindle`): the pickers' camp at the plateau's western edge, in the service yard of a pre-war wind farm whose
one standing tower has lost its blades (the spindle). The school's shell (STALLARD PRIMARY on the arch: the weigher's
table and the board in its hall, bunks in the west room, a room to let and the Concern's man in the east), a laager of
dead convoy trucks, the doctor's shack, the hound-keeper's yard with a tame hound, the well and its still, the tower
with the kite flag on its pole, the road west to Dry Wells and the road east onto the glass.

Kelso (`lm_ash_01`): the army's forward depot and airfield on the March, cratered by the Burn: the gate, the apron, the
control tower, a hangar, the motor pool where the patrol's three hounds lie in the shade by day, the engine shed of the
old military spur with its shunter, and the blockhouse over the hardened hall's stair.

The hall (a cell under the apron): the stair, the gallery of empty cradles, the board store, and the command unit in its
rack at the far end.

Pemberton (`lm_ash_02`): a pre-war solar farm on the glass whose array still feeds the kites' perches; the inverter
house; a dead picker's camp. (Panel rows are `counter` stand-ins, perches `machine`, as Carrick's cranes are `windpump`.)

Saddleback (`lm_ash_03`): the ridge over the valley where the reserve sleeps; a spotter's hide; the view.

The glass (a cell): the roadside map for the Ashlands' encounters.
    python3 tools/maps/gen_an_ashlands.py
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
         'counter', 'planter', 'machine', 'cot', 'tent', 'fence_post', 'pump', 'wagon', 'horse', 'hound_dormant', 'windpump'}


def check(name, rows, legend, props, spawns, npcs, spots, start_spawn):
    """Fail loudly on anything the validator would reject, and on places nobody can walk to."""
    H, W = len(rows), len(rows[0])
    assert all(len(r) == W for r in rows), f'{name}: ragged rows'
    solid = {(p['x'], p['y']) for p in props if p['kind'] in SOLID}
    errs = []
    wall = lambda x, y: 'wall' in legend[rows[y][x]] or legend[rows[y][x]].get('blocks')
    seen_props = set()
    for p in props:
        if wall(p['x'], p['y']):
            errs.append(f"prop {p['kind']} {p.get('id', '')} at {p['x']},{p['y']} is inside a wall")
        if (p['x'], p['y']) in seen_props:
            errs.append(f"prop {p['kind']} {p.get('id', '')} at {p['x']},{p['y']} stacked on another")
        seen_props.add((p['x'], p['y']))
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


def crater(g, cx, cy, r, rim='k', water=None):
    """A strike crater: a rubble ring, and standing water (glassy, blocking) in the deep of it."""
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            if 0 < y < len(g) - 1 and 0 < x < len(g[0]) - 1:
                d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
                if d <= r:
                    g[y][x] = water if (water and d <= r - 2) else rim


LEGEND = {
    'd': {'floor': 'dirt'}, 'k': {'floor': 'rubble'}, 'c': {'floor': 'concrete'}, 'm': {'floor': 'metal'}, 'w': {'floor': 'wood'},
    'a': {'floor': 'asphalt'}, 's': {'floor': 'sand'},
    'X': {'floor': 'water', 'blocks': True},
    'R': {'wall': 'rock', 'floor': 'rubble', 'wallHeight': 4},
    'Q': {'wall': 'rock', 'floor': 'rubble', 'wallHeight': 8},
    'C': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 3.6, 'roof': 'flat'},
    'B': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 3.2, 'roof': 'flat'},
    'M': {'wall': 'metal', 'floor': 'metal', 'wallHeight': 6, 'roof': 'tin'},
    'T': {'wall': 'metal', 'floor': 'metal', 'wallHeight': 16, 'roof': 'none'},
    'S': {'wall': 'scrap', 'floor': 'wood', 'wallHeight': 2.6, 'roof': 'tin'},
    'F': {'wall': 'fence', 'floor': 'concrete', 'wallHeight': 1.0},
}


def legend_for(rows):
    used = set(''.join(rows))
    return {k: v for k, v in LEGEND.items() if k in used}


def light(x, y, h, c, i, r, f=None):
    d = {'x': x, 'y': y, 'height': h, 'color': f'hex:{c}', 'intensity': i, 'range': r}
    if f: d['flicker'] = f
    return d


WARM, LAMP, FIRE, COLD, GREEN = '0xffd8a0', '0xffc890', '0xff9a40', '0xe8f0ff', '0x80ffa0'
OUT = {}

# The kite flag is up (a kite day: Spindle stays indoors) while the boy is out at Pemberton and nobody has brought him in.
KITE_DAY = {'all': [{'flag': 'an_kite_day'}, {'not': {'flag': 'an_kite'}}]}
SORLIE_HERE = {'not': {'flag': 'an_sorlie'}}

# ================================================================ Spindle (the pickers' camp)
W, H = 64, 48
g = grid(W, H, 'k')
border(g)
fill(g, 1, 20, 62, 27, 'a')                       # the old wind-farm road, west to east, its asphalt in pieces
fill(g, 0, 22, 0, 25, 'a'); fill(g, W - 1, 22, W - 1, 25, 'a')
fill(g, 4, 28, 36, 44, 'd')                        # the camp's yard
fill(g, 34, 3, 58, 18, 'd')                        # the tower's pad
building(g, 6, 5, 30, 17, 'C', 'c', [(18, 17)])   # the school
fill(g, 14, 6, 14, 16, 'C'); g[12][14] = 'c'      # the west room's wall and door
fill(g, 24, 6, 24, 16, 'C'); g[12][24] = 'c'      # the east rooms' wall and door
fill(g, 25, 11, 29, 11, 'C'); g[11][27] = 'c'     # Sorlie's room (north) and the room to let (south)
fill(g, 44, 8, 46, 10, 'T')                        # the turbine tower, bladeless
building(g, 46, 34, 54, 41, 'S', 'w', [(50, 34)])  # the doctor's shack
fill(g, 8, 30, 20, 30, 'F'); fill(g, 8, 30, 8, 38, 'F'); fill(g, 20, 30, 20, 38, 'F'); fill(g, 8, 38, 20, 38, 'F')
g[34][20] = 'd'                                     # the hound-keeper's yard: a fence with a gate east
fill(g, 9, 31, 19, 37, 'd')
rows = [''.join(r) for r in g]

props = [
    # the school: the hall (the weigher's table, the board, the stove), the west room (bunks), the east rooms
    {'kind': 'table', 'x': 19, 'y': 9, 'id': 'an_table'}, {'kind': 'chair', 'x': 19, 'y': 8, 'rot': 2}, {'kind': 'counter', 'x': 17, 'y': 9},
    {'kind': 'sign', 'x': 16, 'y': 6, 'rot': 2, 'id': 'an_board'}, {'kind': 'stove', 'x': 22, 'y': 7}, {'kind': 'shelf', 'x': 23, 'y': 15, 'rot': 3},
    {'kind': 'crate', 'x': 16, 'y': 15}, {'kind': 'barrel', 'x': 22, 'y': 15},
    {'kind': 'cot', 'x': 7, 'y': 6, 'rot': 1}, {'kind': 'cot', 'x': 7, 'y': 9, 'rot': 1}, {'kind': 'cot', 'x': 7, 'y': 12, 'rot': 1}, {'kind': 'cot', 'x': 7, 'y': 15, 'rot': 1},
    {'kind': 'cot', 'x': 13, 'y': 6, 'rot': 3}, {'kind': 'cot', 'x': 13, 'y': 9, 'rot': 3, 'id': 'an_kwesi_cot'}, {'kind': 'cot', 'x': 13, 'y': 15, 'rot': 3},
    {'kind': 'table', 'x': 27, 'y': 7, 'id': 'an_sorlie_desk'}, {'kind': 'cot', 'x': 29, 'y': 6, 'rot': 3}, {'kind': 'locker', 'x': 25, 'y': 6, 'id': 'an_sorlie_case'},
    {'kind': 'bed', 'x': 28, 'y': 15, 'rot': 3, 'id': 'an_bunk'}, {'kind': 'locker', 'x': 29, 'y': 13, 'id': 'an_bunk_locker'}, {'kind': 'sign', 'x': 18, 'y': 19, 'rot': 0, 'id': 'an_school_arch'},
    # the tower and its flag pole
    {'kind': 'sign', 'x': 45, 'y': 11, 'rot': 0, 'id': 'an_tower'}, {'kind': 'lamp_post', 'x': 48, 'y': 9, 'id': 'an_flag'},
    {'kind': 'crate', 'x': 40, 'y': 14}, {'kind': 'barrel_rust', 'x': 52, 'y': 6}, {'kind': 'debris', 'x': 54, 'y': 12}, {'kind': 'debris', 'x': 37, 'y': 5},
    # the laager of dead convoy trucks round the yard's east end
    {'kind': 'car_wreck', 'x': 38, 'y': 29, 'rot': 1}, {'kind': 'car_wreck', 'x': 42, 'y': 31, 'rot': 2}, {'kind': 'car_wreck', 'x': 38, 'y': 36, 'rot': 1},
    {'kind': 'car_wreck', 'x': 41, 'y': 41, 'rot': 0}, {'kind': 'tire_pile', 'x': 44, 'y': 29}, {'kind': 'crate', 'x': 34, 'y': 40}, {'kind': 'sandbags', 'x': 36, 'y': 43},
    # the well and the still; the fire
    {'kind': 'pump', 'x': 28, 'y': 32, 'id': 'an_well'}, {'kind': 'tank', 'x': 30, 'y': 32}, {'kind': 'pipe_h', 'x': 31, 'y': 33}, {'kind': 'barrel', 'x': 29, 'y': 34},
    {'kind': 'fire_barrel', 'x': 25, 'y': 37}, {'kind': 'campfire', 'x': 30, 'y': 40}, {'kind': 'blanket', 'x': 28, 'y': 41},
    # the hound-keeper's yard: the tame hound, his tent, a board of tack
    {'kind': 'hound_dormant', 'x': 13, 'y': 34, 'rot': 1, 'id': 'an_pidge'}, {'kind': 'tent', 'x': 17, 'y': 32, 'rot': 3}, {'kind': 'crate', 'x': 10, 'y': 36}, {'kind': 'fence_post', 'x': 21, 'y': 33},
    # the doctor's shack
    {'kind': 'table', 'x': 50, 'y': 37, 'id': 'an_doc_table'}, {'kind': 'cot', 'x': 47, 'y': 35, 'rot': 1}, {'kind': 'cot', 'x': 47, 'y': 39, 'rot': 1}, {'kind': 'shelf', 'x': 53, 'y': 35, 'rot': 3}, {'kind': 'stove', 'x': 53, 'y': 40},
    # the road signs
    {'kind': 'sign', 'x': 3, 'y': 21, 'rot': 1, 'id': 'an_sign_w'}, {'kind': 'sign', 'x': 60, 'y': 21, 'rot': 3, 'id': 'an_sign_e'},
    {'kind': 'rock', 'x': 58, 'y': 31}, {'kind': 'rock_small', 'x': 5, 'y': 45}, {'kind': 'rock', 'x': 60, 'y': 44}, {'kind': 'debris', 'x': 56, 'y': 29},
    {'kind': 'dead_tree', 'x': 3, 'y': 30}, {'kind': 'cactus', 'x': 57, 'y': 40},
]
spots = {
    'hester': {'x': 19, 'y': 10}, 'hester_board': {'x': 17, 'y': 7}, 'hester_sleep': {'x': 8, 'y': 7},
    'ingmar': {'x': 45, 'y': 12}, 'ingmar_sleep': {'x': 8, 'y': 10},
    'delphine': {'x': 50, 'y': 38}, 'delphine_sleep': {'x': 48, 'y': 39},
    'radu': {'x': 14, 'y': 34}, 'radu_sleep': {'x': 16, 'y': 32},
    'parveen': {'x': 27, 'y': 38}, 'parveen_sleep': {'x': 8, 'y': 13},
    'kwesi': {'x': 12, 'y': 10}, 'kwesi_sleep': {'x': 12, 'y': 9},
    'sorlie': {'x': 26, 'y': 7}, 'sorlie_sleep': {'x': 28, 'y': 6}, 'sorlie_g': {'x': 26, 'y': 9}, 'sorlie_g2': {'x': 23, 'y': 13},
    'fire_a': {'x': 29, 'y': 39}, 'fire_b': {'x': 31, 'y': 39}, 'yard_work': {'x': 33, 'y': 35}, 'yard_work_b': {'x': 24, 'y': 42},
    'laager': {'x': 40, 'y': 33}, 'well': {'x': 27, 'y': 33}, 'hall_sit': {'x': 21, 'y': 13}, 'road': {'x': 50, 'y': 24},
}
npcs = [
    {'def': 'npc_an_01', 'x': 19, 'y': 10, 'facing': 2},
    {'def': 'npc_an_02', 'x': 12, 'y': 10, 'facing': 1, 'if': {'all': [{'not': {'flag': 'an_kwesi_dead'}}, {'any': [{'not': {'flag': 'an_kite_day'}}, {'flag': 'an_kite'}]}]}},
    {'def': 'npc_an_03', 'x': 45, 'y': 12, 'facing': 2},
    {'def': 'npc_an_04', 'x': 50, 'y': 38, 'facing': 3},
    {'def': 'npc_an_05', 'x': 14, 'y': 34, 'facing': 1},
    {'def': 'npc_an_06', 'x': 27, 'y': 38, 'facing': 0},
    # the Concern's man in the school's east room, until he is put out, has what he came for, or is dead
    {'def': 'npc_an_07', 'x': 26, 'y': 7, 'facing': 2, 'if': SORLIE_HERE},
    {'def': 'npc_an_g1', 'x': 26, 'y': 9, 'facing': 2, 'schedule': [], 'if': SORLIE_HERE},
]
spawns = [
    {'id': 'start', 'x': 2, 'y': 23, 'facing': 1}, {'id': 'from_drywells', 'x': 2, 'y': 24, 'facing': 1},
    {'id': 'from_kelso', 'x': 61, 'y': 23, 'facing': 3}, {'id': 'from_pemberton', 'x': 61, 'y': 24, 'facing': 3},
    {'id': 'bunk', 'x': 27, 'y': 15, 'facing': 2}, {'id': 'yard', 'x': 26, 'y': 30, 'facing': 2},
]
an_spindle = {
    'id': 'an_spindle', 'name': 'Spindle', 'seed': 581, 'settlement': 'spindle',
    'layout': rows, 'legend': legend_for(rows), 'props': props,
    'lights': [
        light(22, 8, 2.6, WARM, 1.6, 8), light(19, 10, 2.4, LAMP, 1.4, 6), light(10, 10, 2.4, WARM, 1.0, 6), light(27, 8, 2.4, COLD, 1.0, 5),
        light(25, 37, 0.8, FIRE, 1.4, 6, 0.35), light(30, 40, 0.6, FIRE, 1.8, 7, 0.35), light(50, 38, 2.4, '0xfff0e0', 1.4, 6),
        light(45, 9, 15.0, '0xff4030', 0.8, 10, 0.5), light(16, 33, 1.6, LAMP, 0.9, 5),
    ],
    'spawns': spawns,
    'exits': [
        {'x': 0, 'y': 22, 'w': 1, 'h': 4, 'to': {'worldMap': True}, 'label': 'The road west, to Dry Wells'},
        {'x': W - 1, 'y': 22, 'w': 1, 'h': 4, 'to': {'worldMap': True}, 'label': 'The glass, east'},
    ],
    'talk': {
        'an_table': {'dialogue': 'd_an_table', 'name': 'The weigher\'s table'},
        'an_board': {'dialogue': 'd_an_board', 'name': 'The board'},
        'an_kwesi_cot': {'dialogue': 'd_an_kwesi_cot', 'name': 'A cot'},
        'an_sorlie_desk': {'dialogue': 'd_an_sorlie_desk', 'name': 'A clean desk'},
        'an_bunk': {'dialogue': 'd_an_bunk', 'name': 'The room to let'},
        'an_school_arch': {'dialogue': 'd_an_arch', 'name': 'The arch'},
        'an_tower': {'dialogue': 'd_an_tower', 'name': 'The tower'},
        'an_flag': {'dialogue': 'd_an_flag', 'name': 'The flag pole'},
        'an_well': {'dialogue': 'd_an_well', 'name': 'The well'},
        'an_pidge': {'dialogue': 'd_an_pidge', 'name': 'The tame hound'},
        'an_sign_w': {'dialogue': 'd_an_sign_w', 'name': 'A sign'},
        'an_sign_e': {'dialogue': 'd_an_sign_e', 'name': 'A sign'},
    },
    'containers': {
        'an_sorlie_case': {'name': 'Field Case', 'items': [['k_an_order', 1], ['k_an_card', 1], ['tolls', 1]], 'tolls': 60, 'lock': 40},
        'an_bunk_locker': {'name': 'Bunk Locker', 'items': [], 'yoursIf': {'flag': 'an_bunk_rented'}},
    },
    'spots': spots, 'npcs': npcs,
    'triggers': [
        {'id': 'arrive', 'x': 1, 'y': 19, 'w': 8, 'h': 10, 'text': 'Spindle: one wind turbine left standing on the plateau\'s edge with no blades on it, a grey pin a hundred feet high, and at its foot a pre-war school with its windows bricked to slits, a ring of dead convoy trucks, smoke from a still. East of it the ground goes from scrub to glass in the space of a field, and keeps going. Somebody has painted on the school\'s arch, under the old letters, in white: NAMES ON THE BOARD BEFORE YOU GO.', 'effects': [{'learn': 'seen_spindle'}, {'learn': 'loc_spindle'}, {'set': 'an_open'}]},
        {'id': 'arrive_e', 'x': 55, 'y': 19, 'w': 8, 'h': 10, 'text': 'Off the glass and onto the old wind-farm road: Spindle\'s tower ahead, and the school, and a woman at the fire who stands up to count you, and sits down when she has.', 'effects': [{'learn': 'seen_spindle'}, {'learn': 'loc_spindle'}, {'set': 'an_open'}]},
        {'id': 'kite_day', 'x': 1, 'y': 19, 'w': 62, 'h': 26, 'once': False, 'if': {'all': [KITE_DAY, {'not': {'flag': 'an_kite_seen_flag'}}]}, 'text': 'The flag is up on the tower: a black square on the pole, snapping. The yard is empty. Faces at the school\'s slits. Somebody hisses at you from a truck\'s cab: "Inside. Kite day. Inside."', 'effects': [{'set': 'an_kite_seen_flag'}, {'quest': 'q_an_kite', 'start': True}]},
    ],
    'extras': [
        {'count': 4, 'roles': ['drifter', 'labourer', 'nomad'], 'life': 'hard', 'ages': [16, 58], 'area': {'x': 22, 'y': 29, 'w': 14, 'h': 14}, 'spots': ['fire_a', 'fire_b', 'yard_work', 'yard_work_b', 'laager', 'well'], 'hours': {'from': 6, 'to': 21},
         'barks': ['Names on the board before you go.', 'Glass cuts boots. Glass cuts everything.', 'If the flag goes up, you go in. No arguing with a kite.', 'Hester weighs fair. Hester weighs everything.', 'Iodine first, then the glass. Not the other way.']},
        {'count': 2, 'roles': ['drifter', 'settler'], 'life': 'hard', 'ages': [8, 66], 'area': {'x': 15, 'y': 6, 'w': 9, 'h': 10}, 'spots': ['hall_sit', 'hester_board'],
         'barks': ['Four names not ticked. Four.', 'Don\'t touch his hound. It doesn\'t like hands.', 'Kelso\'s shut. Hester says.']},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0xc8bfae', 'fogDensity': 0.01, 'dust': 0.25, 'grade': 0.35, 'mood': 'haze', 'sound': 'wind'},
    'hunting': 0.2,
}
check('an_spindle', rows, an_spindle['legend'], props, spawns, npcs, spots, 'start')
OUT['an_spindle'] = an_spindle

# ================================================================ Kelso (the dead base)
W, H = 72, 52
g = grid(W, H, 'k')
border(g)
fill(g, 1, 18, 70, 34, 'c')                        # the apron
fill(g, 0, 24, 0, 27, 'a'); fill(g, 1, 24, 6, 27, 'a')      # the gate road
fill(g, 66, 38, 70, 42, 'k'); fill(g, W - 1, 38, W - 1, 42, 'k')  # the track east to Saddleback
fill(g, 34, 46, 38, 50, 'k'); fill(g, 34, H - 1, 38, H - 1, 'k')  # the track south to Pemberton
crater(g, 26, 40, 6, 'k', 'X'); crater(g, 52, 42, 5, 'k', 'X'); crater(g, 12, 46, 4, 'k'); crater(g, 58, 25, 4, 'k', 'X'); crater(g, 18, 28, 3, 'k')
building(g, 4, 4, 22, 15, 'M', 'm', [(13, 15)])    # the hangar, its door blown in
building(g, 30, 3, 37, 10, 'C', 'c', [(33, 10)])   # the control tower's foot
building(g, 4, 36, 18, 44, 'M', 'm', [(11, 36)])   # the spur's engine shed
fill(g, 11, 31, 11, 35, 'c')                        # the shed road
building(g, 32, 21, 38, 27, 'B', 'c', [(35, 27)])  # the blockhouse over the hall's stair
fill(g, 44, 4, 64, 4, 'F'); fill(g, 44, 4, 44, 16, 'F'); fill(g, 64, 4, 64, 16, 'F'); fill(g, 44, 16, 64, 16, 'F')
g[16][54] = 'c'; fill(g, 45, 5, 63, 15, 'c')        # the motor pool behind its fence, a gap where the gate was
rows = [''.join(r) for r in g]

PATROL_DAY = {'any': [{'hour': {'from': 6, 'to': 19}}, {'flag': 'an_kelso_quiet'}]}
props = [
    # the gate
    {'kind': 'sign', 'x': 3, 'y': 23, 'rot': 1, 'id': 'an_gate'}, {'kind': 'sandbags', 'x': 5, 'y': 23}, {'kind': 'sandbags', 'x': 5, 'y': 28}, {'kind': 'car_wreck', 'x': 8, 'y': 22, 'rot': 1},
    # the hangar: a kite's carcass on its trolley, debris
    {'kind': 'machine', 'x': 13, 'y': 9, 'rot': 0, 'id': 'an_hangar_kite'}, {'kind': 'debris', 'x': 8, 'y': 7}, {'kind': 'debris', 'x': 18, 'y': 12}, {'kind': 'barrel_rust', 'x': 6, 'y': 13}, {'kind': 'crate', 'x': 20, 'y': 6},
    # the control tower: the log terminal
    {'kind': 'terminal', 'x': 33, 'y': 5, 'rot': 2, 'id': 'an_tower_log'}, {'kind': 'chair', 'x': 33, 'y': 6, 'rot': 0}, {'kind': 'shelf', 'x': 36, 'y': 4, 'rot': 3}, {'kind': 'debris', 'x': 31, 'y': 8},
    # the motor pool: dead hounds in rows, and the patrol's three in the shade of the far wall
    {'kind': 'hound_dormant', 'x': 47, 'y': 7}, {'kind': 'hound_dormant', 'x': 50, 'y': 7}, {'kind': 'hound_dormant', 'x': 53, 'y': 7}, {'kind': 'hound_dormant', 'x': 56, 'y': 7},
    {'kind': 'hound_dormant', 'x': 47, 'y': 10}, {'kind': 'hound_dormant', 'x': 50, 'y': 10}, {'kind': 'car_wreck', 'x': 58, 'y': 11, 'rot': 1},
    {'kind': 'hound_dormant', 'x': 61, 'y': 13, 'rot': 3, 'id': 'an_patrol'}, {'kind': 'hound_dormant', 'x': 61, 'y': 6, 'rot': 3}, {'kind': 'hound_dormant', 'x': 62, 'y': 9, 'rot': 3},
    # the pickers who did not come back, on the apron where they fell
    {'kind': 'debris', 'x': 48, 'y': 20, 'id': 'an_dead'}, {'kind': 'debris', 'x': 51, 'y': 22}, {'kind': 'debris', 'x': 45, 'y': 23},
    # the blockhouse and the hall's door
    {'kind': 'vault_door', 'x': 35, 'y': 23, 'rot': 2, 'id': 'an_hall_door'}, {'kind': 'sign', 'x': 36, 'y': 28, 'rot': 0, 'id': 'an_blockhouse'},
    # the engine shed: the shunter, the old spur's rails
    {'kind': 'machine', 'x': 9, 'y': 40, 'rot': 1, 'id': 'an_shunter'}, {'kind': 'debris', 'x': 13, 'y': 40}, {'kind': 'shelf', 'x': 17, 'y': 37, 'rot': 3}, {'kind': 'crate', 'x': 16, 'y': 43}, {'kind': 'locker', 'x': 5, 'y': 43, 'id': 'an_shed_locker'},
    {'kind': 'debris', 'x': 11, 'y': 33}, {'kind': 'sign', 'x': 12, 'y': 35, 'rot': 0, 'id': 'an_shed_sign'},
    # the apron's wreckage
    {'kind': 'car_wreck', 'x': 24, 'y': 20, 'rot': 0}, {'kind': 'car_wreck', 'x': 44, 'y': 31, 'rot': 2}, {'kind': 'tire_pile', 'x': 28, 'y': 32}, {'kind': 'barrel_rust', 'x': 40, 'y': 19},
    {'kind': 'rock', 'x': 64, 'y': 30}, {'kind': 'rock', 'x': 60, 'y': 46}, {'kind': 'rock_small', 'x': 20, 'y': 48}, {'kind': 'debris', 'x': 46, 'y': 44},
    {'kind': 'sign', 'x': 68, 'y': 37, 'rot': 3, 'id': 'an_track_e'}, {'kind': 'sign', 'x': 39, 'y': 47, 'rot': 0, 'id': 'an_track_s'},
]
spots = {'gate': {'x': 4, 'y': 25}, 'gate_b': {'x': 4, 'y': 26}, 'door': {'x': 35, 'y': 28}, 'tower': {'x': 33, 'y': 7}, 'shed': {'x': 10, 'y': 41}, 'dead': {'x': 47, 'y': 21}, 'apron': {'x': 30, 'y': 25}}
npcs = [
    # the Concern's man, camped at the gate once Spindle has put him out
    {'def': 'npc_an_07', 'id': 'an_sorlie_gate', 'x': 4, 'y': 25, 'facing': 1, 'schedule': [], 'if': {'flag': 'an_sorlie', 'eq': 'out'}},
    {'def': 'npc_an_g2', 'id': 'an_guard_gate', 'x': 4, 'y': 26, 'facing': 1, 'schedule': [], 'if': {'flag': 'an_sorlie', 'eq': 'out'}},
]
spawns = [
    {'id': 'start', 'x': 2, 'y': 25, 'facing': 1}, {'id': 'from_spindle', 'x': 2, 'y': 26, 'facing': 1}, {'id': 'hall', 'x': 35, 'y': 29, 'facing': 2},
    {'id': 'from_saddleback', 'x': 69, 'y': 40, 'facing': 3}, {'id': 'from_pemberton', 'x': 36, 'y': 49, 'facing': 0},
]
an_kelso = {
    'id': 'an_kelso', 'name': 'Kelso', 'seed': 582,
    'layout': rows, 'legend': legend_for(rows), 'props': props,
    'lights': [light(33, 6, 3.0, COLD, 0.6, 6, 0.6), light(35, 25, 2.8, GREEN, 0.5, 4, 0.5), light(61, 10, 0.6, '0xff6040', 0.4, 4, 0.7), light(9, 40, 2.0, COLD, 0.4, 5)],
    'spawns': spawns,
    'exits': [
        {'x': 0, 'y': 24, 'w': 1, 'h': 4, 'to': {'worldMap': True}, 'label': 'Back through the gate'},
        {'x': W - 1, 'y': 38, 'w': 1, 'h': 5, 'to': {'worldMap': True}, 'label': 'The track east, to the ridge'},
        {'x': 34, 'y': H - 1, 'w': 5, 'h': 1, 'to': {'worldMap': True}, 'label': 'The track south, to the panels'},
    ],
    'talk': {
        'an_gate': {'dialogue': 'd_an_gate', 'name': 'The gate'},
        'an_hangar_kite': {'dialogue': 'd_an_hangar_kite', 'name': 'A kite on a trolley'},
        'an_tower_log': {'dialogue': 'd_an_tower_log', 'name': 'The tower\'s log'},
        'an_patrol': {'dialogue': 'd_an_patrol', 'name': 'The patrol'},
        'an_dead': {'dialogue': 'd_an_dead', 'name': 'The pickers'},
        'an_hall_door': {'dialogue': 'd_an_hall_door', 'name': 'The blast door'},
        'an_blockhouse': {'dialogue': 'd_an_hall_door', 'name': 'The blockhouse'},
        'an_shunter': {'dialogue': 'd_an_shunter', 'name': 'The shunter'},
        'an_shed_sign': {'dialogue': 'd_an_shunter', 'name': 'The engine shed'},
        'an_track_e': {'dialogue': 'd_an_track_e', 'name': 'The track east'},
        'an_track_s': {'dialogue': 'd_an_track_s', 'name': 'The track south'},
    },
    'containers': {'an_shed_locker': {'name': 'Fitter\'s Locker', 'items': [['t_repair', 1], ['j_wiring', 2]], 'lock': 30}},
    'spots': spots, 'npcs': npcs,
    'triggers': [
        {'id': 'arrive', 'x': 1, 'y': 20, 'w': 8, 'h': 12, 'text': 'Kelso: a gate between two concrete posts with a sign still bolted to one, an apron of grey concrete a mile across pitted with craters that have glass in their bottoms and water on the glass, a hangar with its door blown in, a control tower with its windows gone, and a fenced yard where machines lie in rows like cattle in the heat. Nothing moves. The wind moves. And far across the apron, in the shade of the yard\'s far wall, three of the machines are not lying in rows.', 'effects': [{'learn': 'seen_kelso'}, {'learn': 'loc_lm_ash_01'}, {'quest': 'q_an_kelso', 'start': True}]},
        {'id': 'apron_night', 'x': 20, 'y': 17, 'w': 50, 'h': 18, 'once': False, 'if': {'not': PATROL_DAY}, 'text': 'Something stands up in the motor pool. Then two more. Three lenses come round in the dark, one after another, like lamps being lit, and the sound of plates sliding on plates comes across the concrete toward you, unhurried. You go back the way you came, fast, and they do not follow past the craters. They do not need to.', 'effects': [{'set': 'an_kelso_turned'}, {'learn': 'an_patrol_seen'}, {'lead': 'l_an_patrol'}, {'time': 30}, {'event': 'goto', 'data': {'location': 'an_kelso', 'spawn': 'start'}}]},
        {'id': 'apron', 'x': 23, 'y': 1, 'w': 2, 'h': 50, 'once': False, 'if': {'all': [{'hour': {'from': 6, 'to': 19}}, {'not': {'flag': 'an_apron_ok'}}, {'not': {'flag': 'an_kelso_quiet'}}]}, 'effects': [{'event': 'dialogue', 'data': {'tree': 'd_an_apron', 'name': 'The apron'}}]},
        {'id': 'dead', 'x': 44, 'y': 19, 'w': 9, 'h': 5, 'text': 'On the apron where it meets the motor pool\'s fence, what is left of four people, a season old: a sled, a lamp, boots, bones the glass-flies have cleaned. One of them had a card in his hand. It is still in his hand.', 'effects': [{'learn': 'an_dead_seen'}, {'quest': 'q_an_kelso', 'start': True}]},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0xd0c6b4', 'fogDensity': 0.008, 'dust': 0.3, 'grade': 0.4, 'mood': 'haze', 'sound': 'wind'},
}
check('an_kelso', rows, an_kelso['legend'], props, spawns, npcs, spots, 'start')
OUT['an_kelso'] = an_kelso

# ================================================================ the hall (a cell under the apron)
W, H = 40, 24
g = grid(W, H, 'Q')
fill(g, 16, 1, 20, 4, 'c')                         # the stair's foot
fill(g, 4, 5, 35, 19, 'c')                         # the gallery
fill(g, 30, 8, 35, 16, 'm')                        # the rack bay
fill(g, 4, 20, 10, 22, 'c')                        # the board store
rows = [''.join(r) for r in g]
props = [
    {'kind': 'sign', 'x': 18, 'y': 1, 'rot': 2, 'id': 'an_hall_stair'},
    {'kind': 'machine', 'x': 34, 'y': 12, 'rot': 3, 'id': 'an_lt'}, {'kind': 'terminal', 'x': 31, 'y': 9, 'rot': 2, 'id': 'an_hall_terminal'}, {'kind': 'pipe_h', 'x': 33, 'y': 15},
    {'kind': 'locker', 'x': 5, 'y': 21, 'id': 'an_hall_locker'}, {'kind': 'shelf', 'x': 8, 'y': 21, 'rot': 0}, {'kind': 'crate', 'x': 9, 'y': 22},
]
for x in range(6, 28, 3):                           # the cradles where the depot's hounds slept, empty
    props.append({'kind': 'cot', 'x': x, 'y': 7, 'rot': 2})
    props.append({'kind': 'cot', 'x': x, 'y': 17, 'rot': 0})
spots = {'stair': {'x': 18, 'y': 3}, 'rack': {'x': 32, 'y': 12}, 'sorlie': {'x': 17, 'y': 4}, 'guard': {'x': 19, 'y': 4}}
npcs = [
    {'def': 'npc_an_07', 'id': 'an_sorlie_hall', 'x': 17, 'y': 4, 'facing': 2, 'schedule': [], 'dialogue': 'd_an_sorlie_hall', 'if': {'all': [{'flag': 'an_guiding'}, {'not': {'flag': 'an_kelso'}}]}},
    {'def': 'npc_an_g1', 'id': 'an_guard_hall', 'x': 19, 'y': 4, 'facing': 2, 'schedule': [], 'if': {'all': [{'flag': 'an_guiding'}, {'not': {'flag': 'an_kelso'}}]}},
]
spawns = [{'id': 'start', 'x': 18, 'y': 3, 'facing': 2}, {'id': 'stair', 'x': 18, 'y': 3, 'facing': 2}]
an_hall = {
    'id': 'an_hall', 'name': 'Kelso Hall', 'seed': 583,
    'layout': rows, 'legend': legend_for(rows), 'props': props,
    'lights': [light(18, 2, 2.4, COLD, 0.8, 5), light(34, 12, 1.4, GREEN, 0.9, 6, 0.4), light(31, 9, 1.2, COLD, 0.6, 4)],
    'spawns': spawns,
    'talk': {
        'an_hall_stair': {'dialogue': 'd_an_hall_stair', 'name': 'The stair'},
        'an_lt': {'dialogue': 'd_an_lt', 'name': 'The rack'},
        'an_hall_terminal': {'dialogue': 'd_an_hall_terminal', 'name': 'A screen'},
    },
    'containers': {'an_hall_locker': {'name': 'Board Store', 'items': [['j_controller', 1], ['j_electronics', 2], ['u_powercell', 1]], 'lock': 45}},
    'spots': spots, 'npcs': npcs,
    'triggers': [
        {'id': 'down', 'x': 15, 'y': 1, 'w': 7, 'h': 5, 'text': 'Down the stair into air that has not moved in ninety years: a gallery under the apron, concrete ribs overhead, and along both walls the cradles where the depot\'s hounds slept between patrols, empty, their cables hanging. At the far end, in a bay of steel, something in a rack has one green lamp lit, and the lamp is turning, very slowly, to face the stair.', 'effects': [{'learn': 'an_hall_seen'}, {'quest': 'q_an_kelso', 'start': True}]},
    ],
    'ambience': {'indoor': True, 'fogColor': 'hex:0x101418', 'fogDensity': 0.05, 'dust': 0.15, 'ambient': {'color': 'hex:0x2a3440', 'intensity': 0.3}, 'grade': 0.4, 'mood': 'grim', 'sound': 'hum'},
    'interior': True,
}
check('an_hall', rows, an_hall['legend'], props, spawns, npcs, spots, 'start')
OUT['an_hall'] = an_hall

# ================================================================ Pemberton (the solar farm and the kites' perches)
W, H = 56, 40
g = grid(W, H, 's')
border(g)
fill(g, 0, 18, 0, 22, 's'); fill(g, W - 1, 18, W - 1, 22, 's')
fill(g, 1, 19, 54, 21, 'k')                        # the service track through the array
building(g, 24, 13, 32, 18, 'C', 'c', [(28, 18)])  # the inverter house
rows = [''.join(r) for r in g]
props = []
for y in (4, 7, 10, 25, 28, 31, 34):               # the panel rows (counter stand-ins), a gap every eight for the walkways
    for x in range(4, 52):
        if x % 9 != 0 and not (22 <= x <= 34 and y in (10,)):
            props.append({'kind': 'counter', 'x': x, 'y': y})
props += [
    # perches at the rows' ends where the kites sit to charge
    {'kind': 'machine', 'x': 52, 'y': 4, 'rot': 3, 'id': 'an_perch'}, {'kind': 'machine', 'x': 52, 'y': 25, 'rot': 3}, {'kind': 'machine', 'x': 3, 'y': 28, 'rot': 1}, {'kind': 'machine', 'x': 3, 'y': 7, 'rot': 1},
    # the inverter house
    {'kind': 'terminal', 'x': 26, 'y': 14, 'rot': 2, 'id': 'an_inverter'}, {'kind': 'machine', 'x': 30, 'y': 14, 'rot': 2}, {'kind': 'pipe_h', 'x': 31, 'y': 16}, {'kind': 'crate', 'x': 25, 'y': 17},
    # the dead picker's camp in the lee of a row
    {'kind': 'tent', 'x': 40, 'y': 37, 'rot': 0}, {'kind': 'debris', 'x': 43, 'y': 36, 'id': 'an_notebook'}, {'kind': 'crate', 'x': 38, 'y': 37}, {'kind': 'rock_small', 'x': 45, 'y': 37},
    {'kind': 'sign', 'x': 2, 'y': 17, 'rot': 1, 'id': 'an_pem_sign'}, {'kind': 'rock', 'x': 14, 'y': 37}, {'kind': 'debris', 'x': 18, 'y': 14},
]
spots = {'kwesi': {'x': 27, 'y': 16}, 'door': {'x': 28, 'y': 19}, 'camp': {'x': 41, 'y': 36}}
npcs = [
    # the weigher's grandson, pinned in the inverter house while the kites are up
    {'def': 'npc_an_02', 'id': 'an_kwesi_pem', 'x': 27, 'y': 16, 'facing': 2, 'schedule': [], 'dialogue': 'd_an_kwesi_pem', 'if': KITE_DAY},
]
spawns = [{'id': 'start', 'x': 2, 'y': 20, 'facing': 1}, {'id': 'from_spindle', 'x': 2, 'y': 19, 'facing': 1}, {'id': 'from_kelso', 'x': 54, 'y': 20, 'facing': 3}]
an_pemberton = {
    'id': 'an_pemberton', 'name': 'Pemberton', 'seed': 584,
    'layout': rows, 'legend': legend_for(rows), 'props': props,
    'lights': [light(26, 15, 2.4, COLD, 0.7, 5, 0.3), light(52, 4, 1.5, '0xff5030', 0.5, 4, 0.6), light(52, 25, 1.5, '0xff5030', 0.5, 4, 0.6)],
    'spawns': spawns,
    'exits': [
        {'x': 0, 'y': 18, 'w': 1, 'h': 5, 'to': {'worldMap': True}, 'label': 'Back west across the glass'},
        {'x': W - 1, 'y': 18, 'w': 1, 'h': 5, 'to': {'worldMap': True}, 'label': 'North-east, to Kelso'},
    ],
    'talk': {
        'an_perch': {'dialogue': 'd_an_perch', 'name': 'A perch'},
        'an_inverter': {'dialogue': 'd_an_inverter', 'name': 'The inverter'},
        'an_notebook': {'dialogue': 'd_an_notebook', 'name': 'A picker\'s camp'},
        'an_pem_sign': {'dialogue': 'd_an_pem_sign', 'name': 'A sign'},
    },
    'spots': spots, 'npcs': npcs,
    'triggers': [
        {'id': 'arrive', 'x': 1, 'y': 15, 'w': 6, 'h': 10, 'text': 'Pemberton: rows of black glass panels on the white glass of the ground, mile on mile of them, tilted at the sky and dusted grey, and in the middle a concrete hut humming to itself. At the ends of the rows, on poles, things like great dead birds sit with their wings folded, and do not look dead.', 'effects': [{'learn': 'seen_pemberton'}, {'learn': 'loc_lm_ash_02'}]},
        {'id': 'kites_up', 'x': 1, 'y': 12, 'w': 54, 'h': 14, 'once': False, 'if': {'all': [KITE_DAY, {'hour': {'from': 7, 'to': 19}}, {'not': {'flag': 'an_kites'}}]}, 'text': 'Overhead, a shadow crosses the panels, then another, turning. Two kites are up, high, slow, quartering the array the way a kestrel works a verge. One of them tips a wing toward the hut. You keep very still against a panel row until it goes over.', 'effects': [{'learn': 'an_kites_up_seen'}, {'lead': 'l_an_kites'}]},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0xe0dccd', 'fogDensity': 0.006, 'dust': 0.3, 'grade': 0.3, 'mood': 'bright', 'sound': 'wind'},
}
check('an_pemberton', rows, an_pemberton['legend'], props, spawns, npcs, spots, 'start')
OUT['an_pemberton'] = an_pemberton

# ================================================================ Saddleback (the ridge over the reserve)
W, H = 44, 28
g = grid(W, H, 'k')
border(g)
fill(g, 0, 9, 0, 12, 'k')
fill(g, 1, 18, 42, 26, 'Q')                        # the drop to the valley, south
fill(g, 16, 14, 22, 17, 'k')
building(g, 30, 4, 36, 9, 'S', 'w', [(33, 9)])     # the spotter's hide
rows = [''.join(r) for r in g]
props = [
    {'kind': 'sign', 'x': 19, 'y': 17, 'rot': 0, 'id': 'an_view'}, {'kind': 'rock', 'x': 15, 'y': 16}, {'kind': 'rock', 'x': 23, 'y': 16},
    {'kind': 'cot', 'x': 31, 'y': 5, 'rot': 1}, {'kind': 'table', 'x': 34, 'y': 6, 'id': 'an_hide_table'}, {'kind': 'crate', 'x': 35, 'y': 8},
    {'kind': 'rock', 'x': 8, 'y': 5}, {'kind': 'rock_small', 'x': 26, 'y': 13}, {'kind': 'dead_tree', 'x': 40, 'y': 12}, {'kind': 'rock_small', 'x': 4, 'y': 15},
]
spots = {'view': {'x': 19, 'y': 15}, 'hide': {'x': 33, 'y': 7}}
spawns = [{'id': 'start', 'x': 2, 'y': 10, 'facing': 1}, {'id': 'from_kelso', 'x': 2, 'y': 11, 'facing': 1}]
an_saddleback = {
    'id': 'an_saddleback', 'name': 'Saddleback', 'seed': 585,
    'layout': rows, 'legend': legend_for(rows), 'props': props,
    'lights': [light(33, 6, 2.0, FIRE, 0.6, 4, 0.3)],
    'spawns': spawns,
    'exits': [{'x': 0, 'y': 9, 'w': 1, 'h': 4, 'to': {'worldMap': True}, 'label': 'Back down the ridge'}],
    'talk': {
        'an_view': {'dialogue': 'd_an_view', 'name': 'The edge'},
        'an_hide_table': {'dialogue': 'd_an_hide', 'name': 'The spotter\'s hide'},
    },
    'spots': spots, 'npcs': [],
    'triggers': [
        {'id': 'arrive', 'x': 1, 'y': 8, 'w': 6, 'h': 6, 'text': 'Saddleback: a ridge of black rock with the wind going over it like water over a weir, and a scrap hut with a slit facing south. The ground stops ahead of you at an edge.', 'effects': [{'learn': 'seen_saddleback'}, {'learn': 'loc_lm_ash_03'}]},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0xc8c2b6', 'fogDensity': 0.01, 'dust': 0.2, 'grade': 0.35, 'mood': 'grim', 'sound': 'wind'},
}
check('an_saddleback', rows, an_saddleback['legend'], props, spawns, [], spots, 'start')
OUT['an_saddleback'] = an_saddleback

# ================================================================ the glass (roadside)
W, H = 40, 26
g = grid(W, H, 's')
fill(g, 0, 0, W - 1, 4, 'R'); fill(g, 0, 21, W - 1, H - 1, 'R')
fill(g, 0, 10, W - 1, 13, 'k')
crater(g, 26, 17, 3, 'k')
rows = [''.join(r) for r in g]
props = [
    {'kind': 'rock', 'x': 6, 'y': 7}, {'kind': 'car_wreck', 'x': 18, 'y': 7, 'rot': 1}, {'kind': 'rock_small', 'x': 33, 'y': 8}, {'kind': 'debris', 'x': 12, 'y': 16},
    {'kind': 'campfire', 'x': 21, 'y': 15}, {'kind': 'rock', 'x': 36, 'y': 17}, {'kind': 'debris', 'x': 4, 'y': 18},
]
spots = {'here': {'x': 6, 'y': 11}, 'ahead': {'x': 14, 'y': 11}, 'ahead2': {'x': 15, 'y': 12}, 'side': {'x': 16, 'y': 15}, 'side2': {'x': 20, 'y': 17}, 'fire': {'x': 22, 'y': 15}, 'far': {'x': 30, 'y': 11}}
spawns = [{'id': 'here', 'x': 6, 'y': 11, 'facing': 1}, {'id': 'start', 'x': 6, 'y': 12, 'facing': 1}]
an_glass = {
    'id': 'an_glass', 'name': 'Ash Glass', 'seed': 586,
    'layout': rows, 'legend': legend_for(rows), 'props': props,
    'lights': [light(21, 15, 0.6, FIRE, 1.4, 5, 0.35)],
    'spawns': spawns,
    'exits': [
        {'x': 0, 'y': 10, 'w': 1, 'h': 4, 'to': {'worldMap': True}, 'label': 'On across the glass'},
        {'x': W - 1, 'y': 10, 'w': 1, 'h': 4, 'to': {'worldMap': True}, 'label': 'On across the glass'},
    ],
    'spots': spots, 'npcs': [], 'triggers': [],
    'ambience': {'indoor': False, 'fogColor': 'hex:0xd8d0c0', 'fogDensity': 0.012, 'dust': 0.35, 'grade': 0.35, 'mood': 'haze', 'sound': 'wind'},
}
check('an_glass', rows, an_glass['legend'], props, spawns, [], spots, 'start')
OUT['an_glass'] = an_glass

HEADER = "import type { MapDef } from '../../engine/data/types';\n\n// Generated by tools/maps/gen_an_ashlands.py — edit the generator, then re-run it.\n"
for mid, m in OUT.items():
    with open(os.path.join(ROOT, 'src', 'content', 'maps', f"{mid}.ts"), 'w') as f:
        f.write(f"{HEADER}export const {mid}: MapDef = {ts(m)};\n")
    print(mid, len(m['layout'][0]), 'x', len(m['layout']))
