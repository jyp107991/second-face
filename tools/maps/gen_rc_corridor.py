#!/usr/bin/env python3
"""Generates the Rail Corridor's maps (B5a): src/content/maps/rc_fourways.ts, rc_halt_w.ts, rc_halt_e.ts, rc_yard.ts, rc_kettle.ts.

Four Ways (the Junction): the Line runs east-west through the middle on two roads of track. North of it the station: the
guild's ticket hall and the factor's office, the stationmaster's office under the clock tower, Batista's in the old
refreshment room; the north platform with the clock, the guild's posters and the timetable law; the signal box at the east
end and the water tower. North of the station the street, Four Ways' watch house and houses. South: the island platform,
the Canopy (a market under the old canopy's ironwork), the dead siding with three sleeper cars (Batista's berths), the old
south branch where the handcars race, the road south to Tollhouse 9 on the branch's bed, and the turntable.

West Halt and East Halt: a platform, a keeper's house, a watch house (West) or a tool shed (East), a water tower, houses
going empty, a handcar shed (West), the track south to Openfield (West), the east length (East).

Yard Nine: the depot. The engine shed (Dorcas dead on her pit, Sixty's bay), the fitting shop, the yard office, the still,
fuel tanks, the main line and three sidings full of dead cars, a rod rider's fire.

Kettle Cut: a cutting through red clay between Yard Nine and West Halt: the rails and the old service road side by side,
a stripped sealed car and a stock car in the ditch, the watch's blind on the north bank, a guard's grave.
    python3 tools/maps/gen_rc_corridor.py
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


def border(g, ch='R', gaps=()):
    H, W = len(g), len(g[0])
    fill(g, 0, 0, W - 1, 0, ch); fill(g, 0, H - 1, W - 1, H - 1, ch); fill(g, 0, 0, 0, H - 1, ch); fill(g, W - 1, 0, W - 1, H - 1, ch)
    for (x, y) in gaps:
        g[y][x] = 'd'


LEGEND = {
    'd': {'floor': 'dirt'}, 'k': {'floor': 'rubble'}, 'a': {'floor': 'asphalt'}, 'c': {'floor': 'concrete'}, 'm': {'floor': 'metal'},
    't': {'floor': 'tile'}, 'g': {'floor': 'grate'}, 'w': {'floor': 'wood'}, 'x': {'floor': 'water'}, 's': {'floor': 'sand'},
    'R': {'wall': 'rock', 'floor': 'rubble', 'wallHeight': 6},
    'B': {'wall': 'brick', 'floor': 'tile', 'wallHeight': 4.2, 'roof': 'pitched'},
    'T': {'wall': 'brick', 'floor': 'concrete', 'wallHeight': 11, 'roof': 'flat'},
    'Q': {'wall': 'brick', 'floor': 'wood', 'wallHeight': 5.6, 'roof': 'flat'},
    'C': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 3.6, 'roof': 'flat'},
    'H': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 7.5, 'roof': 'flat'},
    'M': {'wall': 'metal', 'floor': 'metal', 'wallHeight': 3.0, 'roof': 'flat'},
    'W': {'wall': 'wood', 'floor': 'wood', 'wallHeight': 3.2, 'roof': 'pitched'},
    'S': {'wall': 'scrap', 'floor': 'wood', 'wallHeight': 2.6, 'roof': 'tin'},
    'F': {'wall': 'fence', 'floor': 'dirt', 'wallHeight': 1.8},
    'P': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 0.9},
    'K': {'wall': 'rock', 'floor': 'rubble', 'wallHeight': 3.5},
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

# ================================================================ Four Ways (the Junction)
W, H = 80, 60
g = grid(W, H, 'd')
border(g)
# north street and houses
fill(g, 1, 1, 78, 10, 'd')
building(g, 3, 2, 9, 7, 'W', 'w', [(6, 7)])          # a house
building(g, 11, 2, 17, 7, 'M', 'm', [(14, 7)])       # a container house
building(g, 56, 2, 66, 8, 'C', 'c', [(61, 8)])       # Four Ways' watch house
building(g, 69, 2, 76, 7, 'W', 'w', [(72, 7)])       # a house
# the station: ticket hall and the factor's office (west), the stationmaster's office under the clock (middle), Batista's (east)
building(g, 22, 11, 54, 22, 'B', 't', [(34, 11), (34, 22), (50, 11), (50, 22), (42, 22)])
fill(g, 30, 12, 30, 17, 'B'); fill(g, 23, 17, 29, 17, 'B'); g[17][26] = 't'     # the factor's office walls, door
fill(g, 38, 12, 38, 18, 'B'); fill(g, 39, 18, 45, 18, 'B'); g[18][42] = 't'     # the stationmaster's office walls, door
fill(g, 46, 12, 46, 21, 'B'); g[16][46] = 't'                                    # Batista's wall, door from the hall
fill(g, 37, 6, 41, 10, 'T')                                                      # the clock tower
# the north platform, the tracks, the island platform
fill(g, 2, 23, 77, 26, 'c')
fill(g, 1, 27, 78, 28, 'g'); fill(g, 1, 29, 78, 29, 'k'); fill(g, 1, 30, 78, 31, 'g')
fill(g, 8, 32, 64, 34, 'c')
# the signal box at the east end of the north platform
building(g, 63, 16, 70, 22, 'Q', 'w', [(67, 22)])
# the Canopy: a market under the old canopy's ironwork
fill(g, 38, 35, 58, 44, 'c')
# the dead siding and Batista's berths: three sleeper cars
fill(g, 12, 35, 13, 52, 'g')
building(g, 3, 36, 11, 40, 'M', 'w', [(11, 38)])
building(g, 3, 42, 11, 46, 'M', 'w', [(11, 44)])
building(g, 3, 48, 11, 52, 'M', 'w', [(11, 50)])
# the old south branch: the handcar course, and the old south platform for the crowd
fill(g, 18, 50, 36, 52, 'c'); fill(g, 16, 54, 72, 55, 'g')
# the road south to Tollhouse 9 on the branch's bed
fill(g, 59, 35, 62, 58, 'a'); g[59][60] = 'a'; g[59][61] = 'a'
# the turntable: a low ring round its pit, the bridge across it
fill(g, 66, 36, 76, 46, 'P'); fill(g, 67, 37, 75, 45, 'k'); fill(g, 67, 41, 75, 41, 'g'); g[36][71] = 'g'
rows = [''.join(r) for r in g]

props = [
    # the north street
    {'kind': 'planter', 'x': 19, 'y': 4}, {'kind': 'barrel', 'x': 10, 'y': 9}, {'kind': 'lamp_post', 'x': 21, 'y': 9}, {'kind': 'lamp_post', 'x': 52, 'y': 9},
    {'kind': 'sign', 'x': 60, 'y': 9, 'rot': 0, 'id': 'rc_fw_watch'}, {'kind': 'table', 'x': 58, 'y': 4}, {'kind': 'chair', 'x': 59, 'y': 4, 'rot': 3},
    {'kind': 'locker', 'x': 65, 'y': 3}, {'kind': 'cot', 'x': 63, 'y': 6, 'rot': 1}, {'kind': 'crate', 'x': 76, 'y': 9}, {'kind': 'fire_barrel', 'x': 45, 'y': 5},
    # the factor's office: the desk, the strongbox
    {'kind': 'table', 'x': 25, 'y': 13}, {'kind': 'chair', 'x': 25, 'y': 14, 'rot': 0}, {'kind': 'shelf', 'x': 23, 'y': 12, 'rot': 1}, {'kind': 'locker', 'x': 29, 'y': 12, 'id': 'rc_kask_box'},
    # the ticket hall: the window, benches, the guild's notice
    {'kind': 'counter', 'x': 32, 'y': 14, 'rot': 0}, {'kind': 'counter', 'x': 33, 'y': 14, 'rot': 0, 'id': 'rc_fw_window'}, {'kind': 'counter', 'x': 34, 'y': 14, 'rot': 0},
    {'kind': 'shelf', 'x': 31, 'y': 12, 'rot': 2}, {'kind': 'chair', 'x': 24, 'y': 20, 'rot': 0}, {'kind': 'chair', 'x': 26, 'y': 20, 'rot': 0}, {'kind': 'chair', 'x': 36, 'y': 19, 'rot': 3},
    # the stationmaster's office: the desk, the wire, his locker
    {'kind': 'table', 'x': 41, 'y': 14}, {'kind': 'chair', 'x': 41, 'y': 13, 'rot': 2}, {'kind': 'terminal', 'x': 44, 'y': 13, 'rot': 3}, {'kind': 'locker', 'x': 39, 'y': 13, 'id': 'rc_brodsky_box'},
    # Batista's: the counter, tables, the stove
    {'kind': 'counter', 'x': 48, 'y': 14, 'rot': 0}, {'kind': 'counter', 'x': 49, 'y': 14, 'rot': 0}, {'kind': 'counter', 'x': 50, 'y': 14, 'rot': 0}, {'kind': 'shelf', 'x': 49, 'y': 12, 'rot': 2},
    {'kind': 'stove', 'x': 53, 'y': 12}, {'kind': 'table', 'x': 48, 'y': 18}, {'kind': 'chair', 'x': 47, 'y': 18, 'rot': 1}, {'kind': 'table', 'x': 52, 'y': 18}, {'kind': 'chair', 'x': 52, 'y': 19, 'rot': 0}, {'kind': 'chair', 'x': 53, 'y': 17, 'rot': 3},
    # the north platform: the clock, the reward, the timetable law, benches, lamps, the water tower
    {'kind': 'sign', 'x': 39, 'y': 23, 'rot': 0, 'id': 'rc_fw_clock'}, {'kind': 'sign', 'x': 28, 'y': 23, 'rot': 0, 'id': 'rc_fw_poster'}, {'kind': 'sign', 'x': 46, 'y': 23, 'rot': 0, 'id': 'rc_fw_law'},
    {'kind': 'chair', 'x': 20, 'y': 23, 'rot': 0}, {'kind': 'chair', 'x': 56, 'y': 23, 'rot': 0}, {'kind': 'lamp_post', 'x': 10, 'y': 23}, {'kind': 'lamp_post', 'x': 30, 'y': 26}, {'kind': 'lamp_post', 'x': 52, 'y': 26},
    {'kind': 'tank', 'x': 74, 'y': 23}, {'kind': 'pipe_h', 'x': 74, 'y': 26}, {'kind': 'crate', 'x': 5, 'y': 24}, {'kind': 'crate', 'x': 6, 'y': 24},
    # the signal box: the instruments, the register, Halina's cot and stove
    {'kind': 'terminal', 'x': 64, 'y': 17, 'rot': 1, 'id': 'rc_fw_instrument'}, {'kind': 'terminal', 'x': 65, 'y': 17, 'rot': 2}, {'kind': 'sign', 'x': 69, 'y': 17, 'rot': 3, 'id': 'rc_fw_register'},
    {'kind': 'cot', 'x': 69, 'y': 21, 'rot': 3}, {'kind': 'stove', 'x': 64, 'y': 21},
    # the island platform: the request board for the eastbound, benches
    {'kind': 'chair', 'x': 18, 'y': 33, 'rot': 0}, {'kind': 'chair', 'x': 44, 'y': 33, 'rot': 0}, {'kind': 'lamp_post', 'x': 25, 'y': 34}, {'kind': 'lamp_post', 'x': 50, 'y': 34},
    # the Canopy: stalls
    {'kind': 'table', 'x': 40, 'y': 37}, {'kind': 'table', 'x': 44, 'y': 37}, {'kind': 'table', 'x': 48, 'y': 37}, {'kind': 'counter', 'x': 52, 'y': 37, 'rot': 0}, {'kind': 'counter', 'x': 56, 'y': 37, 'rot': 0},
    {'kind': 'table', 'x': 40, 'y': 41}, {'kind': 'crate', 'x': 44, 'y': 42}, {'kind': 'crate', 'x': 45, 'y': 42}, {'kind': 'table', 'x': 50, 'y': 41}, {'kind': 'lamp_post', 'x': 38, 'y': 44}, {'kind': 'lamp_post', 'x': 58, 'y': 44}, {'kind': 'fire_barrel', 'x': 47, 'y': 44},
    # Batista's berths: the sleeper cars (the far one is to let)
    {'kind': 'cot', 'x': 4, 'y': 37, 'rot': 1}, {'kind': 'cot', 'x': 7, 'y': 37, 'rot': 1}, {'kind': 'cot', 'x': 4, 'y': 43, 'rot': 1}, {'kind': 'cot', 'x': 7, 'y': 45, 'rot': 1},
    {'kind': 'bed', 'x': 4, 'y': 49, 'rot': 1, 'id': 'rc_fw_berth'}, {'kind': 'locker', 'x': 9, 'y': 49, 'id': 'rc_fw_berth_locker'}, {'kind': 'sign', 'x': 14, 'y': 50, 'rot': 3, 'id': 'rc_fw_berth_sign'},
    # the old south branch: the handcars, the slate
    {'kind': 'machine', 'x': 17, 'y': 54, 'rot': 1, 'id': 'rc_fw_handcar'}, {'kind': 'sign', 'x': 20, 'y': 52, 'rot': 0, 'id': 'rc_fw_sprint'}, {'kind': 'tire_pile', 'x': 33, 'y': 52}, {'kind': 'fire_barrel', 'x': 26, 'y': 50},
    # the road south, the turntable
    {'kind': 'sign', 'x': 63, 'y': 50, 'rot': 3, 'id': 'rc_fw_road'}, {'kind': 'machine', 'x': 71, 'y': 41, 'rot': 0}, {'kind': 'barrel_rust', 'x': 77, 'y': 38}, {'kind': 'debris', 'x': 68, 'y': 44},
]

spots = {
    'brodsky': {'x': 42, 'y': 15}, 'brodsky_platform': {'x': 40, 'y': 24}, 'brodsky_sleep': {'x': 43, 'y': 16},
    'kask': {'x': 26, 'y': 14}, 'kask_hall': {'x': 28, 'y': 19},
    'ticket': {'x': 33, 'y': 13},
    'halina': {'x': 66, 'y': 18}, 'halina_sleep': {'x': 68, 'y': 21},
    'nuno': {'x': 49, 'y': 13},
    'guard_a': {'x': 36, 'y': 25}, 'guard_b': {'x': 55, 'y': 25}, 'guard_sleep': {'x': 62, 'y': 5},
    'watch_a': {'x': 60, 'y': 10}, 'watch_b': {'x': 24, 'y': 9},
    'platform_sit': {'x': 21, 'y': 24}, 'platform_lean': {'x': 57, 'y': 24}, 'platform_pair_a': {'x': 14, 'y': 25}, 'platform_pair_b': {'x': 15, 'y': 25},
    'island_sit': {'x': 19, 'y': 33}, 'island_lean': {'x': 45, 'y': 32},
    'canopy_a': {'x': 41, 'y': 38}, 'canopy_b': {'x': 45, 'y': 38}, 'canopy_c': {'x': 49, 'y': 38}, 'canopy_pair_a': {'x': 52, 'y': 40}, 'canopy_pair_b': {'x': 53, 'y': 40}, 'canopy_sit': {'x': 41, 'y': 42},
    'bar_sit': {'x': 48, 'y': 19}, 'bar_sit_b': {'x': 51, 'y': 19}, 'bar_pair_a': {'x': 50, 'y': 16}, 'bar_pair_b': {'x': 51, 'y': 16},
    'street_work': {'x': 19, 'y': 6}, 'street_pair_a': {'x': 30, 'y': 8}, 'street_pair_b': {'x': 31, 'y': 8},
    'sprint_line': {'x': 19, 'y': 53}, 'sprint_sit': {'x': 24, 'y': 51}, 'sprint_pair_a': {'x': 30, 'y': 51}, 'sprint_pair_b': {'x': 31, 'y': 51},
    'berth': {'x': 6, 'y': 50},
}

npcs = [
    {'def': 'npc_rc_01', 'x': 42, 'y': 15, 'facing': 2},
    {'def': 'npc_rc_04', 'x': 26, 'y': 14, 'facing': 2},
    {'def': 'npc_rc_05', 'x': 66, 'y': 18, 'facing': 3},
    {'def': 'npc_rc_06', 'x': 33, 'y': 13, 'facing': 2},
    {'def': 'npc_rc_07', 'x': 49, 'y': 13, 'facing': 2},
    {'def': 'npc_rc_g1', 'x': 36, 'y': 25, 'facing': 2},
    {'def': 'npc_rc_g2', 'x': 55, 'y': 25, 'facing': 2},
    # after the guild's riders come (exposed): Chela in the stocks on the platform, put off the Line at the next train
    {'def': 'npc_rc_02', 'id': 'npc_rc_02_stocks', 'x': 47, 'y': 24, 'facing': 2, 'schedule': [], 'dialogue': 'd_rc_chela_off', 'if': {'flag': 'rc_chela', 'eq': 'stocks'}},
]

spawns = [
    {'id': 'start', 'x': 40, 'y': 25, 'facing': 2}, {'id': 'platform', 'x': 40, 'y': 25, 'facing': 2},
    {'id': 'from_tollhouse', 'x': 60, 'y': 57, 'facing': 0}, {'id': 'from_depot', 'x': 2, 'y': 5, 'facing': 1}, {'id': 'from_halt_e', 'x': 77, 'y': 25, 'facing': 3},
    {'id': 'berth', 'x': 6, 'y': 50, 'facing': 1}, {'id': 'box', 'x': 67, 'y': 20, 'facing': 0},
]

rc_fourways = {
    'id': 'rc_fourways', 'name': 'Four Ways', 'seed': 512, 'settlement': 'fourways',
    'layout': rows, 'legend': legend_for(rows), 'props': props,
    'lights': [
        light(39, 22, 3.4, WARM, 2.2, 10), light(21, 9, 3.6, LAMP, 1.8, 9), light(52, 9, 3.6, LAMP, 1.8, 9), light(45, 5, 0.8, FIRE, 1.4, 6, 0.35),
        light(28, 15, 3.0, WARM, 1.8, 8), light(42, 15, 3.0, WARM, 1.6, 7), light(50, 17, 2.8, '0xffb070', 2.0, 9, 0.12),
        light(10, 23, 3.6, LAMP, 2.0, 10), light(30, 26, 3.6, LAMP, 2.0, 10), light(52, 26, 3.6, LAMP, 2.0, 10), light(67, 19, 4.6, '0xfff0d0', 1.8, 7),
        light(25, 34, 3.6, LAMP, 1.8, 9), light(50, 34, 3.6, LAMP, 1.8, 9), light(38, 44, 3.6, LAMP, 1.8, 9), light(58, 44, 3.6, LAMP, 1.8, 9), light(47, 44, 0.8, FIRE, 1.4, 6, 0.35),
        light(7, 44, 2.2, '0xffe0b0', 1.2, 6), light(26, 50, 0.8, FIRE, 1.4, 6, 0.35), light(63, 50, 3.0, LAMP, 1.4, 8),
    ],
    'spawns': spawns,
    'talk': {
        'rc_fw_window': {'dialogue': 'd_rc_board_fw', 'name': 'The ticket window'},
        'rc_fw_clock': {'dialogue': 'd_rc_clock', 'name': 'The station clock'},
        'rc_fw_poster': {'dialogue': 'd_rc_poster', 'name': 'The guild\'s reward'},
        'rc_fw_law': {'dialogue': 'd_rc_law', 'name': 'The timetable law'},
        'rc_fw_instrument': {'dialogue': 'd_rc_instrument', 'name': 'The token instrument'},
        'rc_fw_register': {'dialogue': 'd_rc_register', 'name': 'The register'},
        'rc_fw_watch': {'dialogue': 'd_rc_fw_watch', 'name': 'The watch house'},
        'rc_fw_berth': {'dialogue': 'd_rc_berth', 'name': 'The berth'},
        'rc_fw_berth_sign': {'dialogue': 'd_rc_berth', 'name': 'Berths to let'},
        'rc_fw_handcar': {'dialogue': 'd_rc_sprint', 'name': 'The handcars'},
        'rc_fw_sprint': {'dialogue': 'd_rc_sprint', 'name': 'The sprint slate'},
        'rc_fw_road': {'dialogue': 'd_rc_road_sign', 'name': 'The road south'},
    },
    'containers': {
        'rc_kask_box': {'name': 'Factor\'s Strongbox', 'items': [['k_rc_through', 1]], 'tolls': 90, 'lock': 55},
        'rc_brodsky_box': {'name': 'Stationmaster\'s Locker', 'items': [['k_rc_wires', 1], ['c_bitters', 1]], 'tolls': 30, 'lock': 50},
        'rc_fw_berth_locker': {'name': 'Berth Locker', 'items': [], 'yoursIf': {'flag': 'rc_berth_rented'}},
    },
    'spots': spots, 'npcs': npcs,
    'triggers': [
        {'id': 'arrive', 'x': 2, 'y': 23, 'w': 76, 'h': 12, 'text': 'Four Ways: a brick station under a clock tower, two roads of track, an island platform, and a town that keeps the station\'s hours. The clock is right. Everyone you can see has looked at it in the last minute, and most of them have looked at their own wrists after.', 'effects': [{'learn': 'seen_fourways'}, {'learn': 'loc_junction'}, {'set': 'rc_open'}]},
        {'id': 'south', 'x': 59, 'y': 47, 'w': 4, 'h': 11, 'text': 'The road south runs on the bed of a railway that is not there any more: you can see where the sleepers lay, a stripe of darker earth every yard, all the way to the horizon and Tollhouse 9.', 'effects': [{'learn': 'loc_junction'}, {'learn': 'seen_fourways'}, {'set': 'rc_open'}]},
        {'id': 'north', 'x': 1, 'y': 1, 'w': 20, 'h': 9, 'text': 'Four Ways\' street: houses of timber and container steel, a watch house with a bell, and everything facing the station like chairs facing a stage.', 'effects': [{'learn': 'seen_fourways'}, {'learn': 'loc_junction'}, {'set': 'rc_open'}]},
        {'id': 'box', 'x': 63, 'y': 23, 'w': 8, 'h': 2, 'text': 'The signal box stands on brick legs at the platform\'s end, glass on three sides, levers in a row like the teeth of a comb. Inside somebody is writing in a book by a lamp.', 'effects': [{'learn': 'rc_box_seen'}]},
        {'id': 'canopy', 'x': 38, 'y': 35, 'w': 21, 'h': 3, 'text': 'The Canopy: a market under ironwork that once held a roof, now holding tarps, lamps and washing. Water by the cup, bread by the slice, bolts by the pound. A boy goes round the stalls calling the next train like a hymn.', 'effects': [{'learn': 'rc_canopy_seen'}]},
        {'id': 'sprint', 'x': 18, 'y': 50, 'w': 19, 'h': 3, 'text': 'The old south branch: a straight half-mile of rail with a chalk line across it, two handcars on the stop-block, and a slate on a post with names and times.', 'effects': [{'learn': 'rc_sprint_seen'}]},
    ],
    'extras': [
        {'count': 6, 'roles': ['trader', 'labourer', 'settler', 'tech'], 'life': 'hard', 'area': {'x': 38, 'y': 35, 'w': 21, 'h': 10}, 'spots': ['canopy_a', 'canopy_b', 'canopy_c', 'canopy_pair_a', 'canopy_pair_b', 'canopy_sit'], 'hours': {'from': 6, 'to': 21},
         'barks': ['Water by the cup. Clean cup, clean water.', 'Seven o\'clock for Yard Nine and the west. Seven o\'clock.', 'Clock says ten past. Clock\'s right.', 'Bolts by the pound. Rust is extra.', 'The through went by again at two. Didn\'t even blow for us.']},
        {'count': 4, 'roles': ['trader', 'drifter', 'labourer'], 'life': 'hard', 'area': {'x': 2, 'y': 23, 'w': 60, 'h': 4}, 'spots': ['platform_sit', 'platform_lean', 'platform_pair_a', 'platform_pair_b', 'island_sit', 'island_lean'],
         'barks': ['Twenty-five a leg. Robbery, and they call the others robbers.', 'Don\'t step on the track. The watch counts it.', 'I\'ve waited three days for a wagon to Tollhouse. The Line\'s faster when it runs.']},
        {'count': 3, 'roles': ['guard', 'labourer'], 'life': 'hard', 'faction': 'tollmen', 'area': {'x': 47, 'y': 15, 'w': 6, 'h': 6}, 'spots': ['bar_sit', 'bar_sit_b', 'bar_pair_a', 'bar_pair_b'], 'hours': {'from': 17, 'to': 1},
         'barks': ['Batista\'s pour. Watch the clock.', 'Gorse? Good guard. Bad luck. Kettle\'s bad luck.', 'Through-running. Means through your pocket.']},
        {'count': 3, 'roles': ['guard', 'settler'], 'life': 'hard', 'area': {'x': 18, 'y': 50, 'w': 19, 'h': 3}, 'spots': ['sprint_sit', 'sprint_pair_a', 'sprint_pair_b'], 'hours': {'from': 17, 'to': 22},
         'barks': ['Pump, don\'t pray.', 'Two Tolls on the left car.', 'Mind the points at the far end. They bite.']},
        {'count': 3, 'roles': ['settler', 'labourer', 'street'], 'life': 'hard', 'ages': [6, 70], 'area': {'x': 1, 'y': 1, 'w': 54, 'h': 9}, 'spots': ['street_work', 'street_pair_a', 'street_pair_b'],
         'barks': ['Bell\'s for the watch. Clock\'s for everybody.', 'My grandmother kept the down line. Before the guild had the tickets.', 'Out of timetable on the track and the watch shoots. Everyone knows that.']},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0xb8b0a0', 'fogDensity': 0.006, 'dust': 0.15, 'grade': 0.2, 'mood': 'bustling', 'sound': 'wind'},
}
check('rc_fourways', rows, rc_fourways['legend'], props, spawns, npcs, spots, 'start')
OUT['rc_fourways'] = rc_fourways

# ================================================================ West Halt
W, H = 48, 36
g = grid(W, H, 'd')
border(g)
fill(g, 1, 17, 46, 18, 'g')                           # the Line
fill(g, 8, 13, 40, 16, 'c')                           # the platform
building(g, 9, 4, 17, 10, 'W', 'w', [(13, 10)])       # the keeper's house
building(g, 20, 5, 27, 10, 'W', 'w', [(23, 10)])      # the watch house
building(g, 31, 2, 37, 10, 'H', 'm', [])             # the water tower (padlocked)
building(g, 40, 4, 45, 9, 'W', 'w', [(42, 9)])        # a house going empty
building(g, 4, 22, 10, 27, 'S', 'w', [(7, 22)])       # shacks south of the Line
building(g, 13, 22, 19, 27, 'S', 'w', [(16, 22)])
building(g, 36, 21, 44, 27, 'W', 'w', [(40, 21)])     # the handcar shed
fill(g, 34, 19, 46, 19, 'g')                          # its spur
fill(g, 24, 19, 25, 34, 'd')                          # the track south to Openfield
g[35][24] = 'd'; g[35][25] = 'd'
rows = [''.join(r) for r in g]
props = [
    {'kind': 'sign', 'x': 20, 'y': 13, 'rot': 0, 'id': 'rc_hw_flag'}, {'kind': 'chair', 'x': 30, 'y': 13, 'rot': 0}, {'kind': 'lamp_post', 'x': 9, 'y': 16}, {'kind': 'lamp_post', 'x': 39, 'y': 16},
    {'kind': 'table', 'x': 27, 'y': 14, 'id': 'rc_hw_stall'}, {'kind': 'crate', 'x': 28, 'y': 14},
    {'kind': 'table', 'x': 11, 'y': 6}, {'kind': 'chair', 'x': 12, 'y': 6, 'rot': 3}, {'kind': 'cot', 'x': 16, 'y': 5, 'rot': 3}, {'kind': 'stove', 'x': 10, 'y': 9}, {'kind': 'shelf', 'x': 16, 'y': 9, 'rot': 3},
    {'kind': 'sign', 'x': 21, 'y': 6, 'rot': 1, 'id': 'rc_hw_tagboard'}, {'kind': 'table', 'x': 24, 'y': 7}, {'kind': 'locker', 'x': 26, 'y': 6}, {'kind': 'cot', 'x': 26, 'y': 9, 'rot': 3},
    {'kind': 'sign', 'x': 34, 'y': 11, 'rot': 0, 'id': 'rc_hw_tower'}, {'kind': 'sign', 'x': 30, 'y': 11, 'rot': 0, 'id': 'rc_hw_chalk'}, {'kind': 'pipe_h', 'x': 38, 'y': 6},
    {'kind': 'cot', 'x': 44, 'y': 5, 'rot': 3},
    {'kind': 'cot', 'x': 5, 'y': 26, 'rot': 1}, {'kind': 'stove', 'x': 9, 'y': 26}, {'kind': 'cot', 'x': 14, 'y': 26, 'rot': 1}, {'kind': 'planter', 'x': 12, 'y': 29}, {'kind': 'planter', 'x': 20, 'y': 29},
    {'kind': 'machine', 'x': 40, 'y': 24, 'rot': 1, 'id': 'rc_hw_handcar'}, {'kind': 'shelf', 'x': 37, 'y': 22, 'rot': 1}, {'kind': 'crate', 'x': 43, 'y': 26},
    {'kind': 'sign', 'x': 26, 'y': 31, 'rot': 1, 'id': 'rc_hw_south'}, {'kind': 'fire_barrel', 'x': 22, 'y': 20}, {'kind': 'dead_tree', 'x': 30, 'y': 30}, {'kind': 'rock', 'x': 6, 'y': 32},
]
spots = {
    'socorro': {'x': 13, 'y': 7}, 'socorro_platform': {'x': 21, 'y': 14}, 'socorro_sleep': {'x': 15, 'y': 6},
    'chela': {'x': 24, 'y': 8}, 'chela_platform': {'x': 32, 'y': 15}, 'chela_sleep': {'x': 25, 'y': 9},
    'abe': {'x': 22, 'y': 9}, 'abe_sit': {'x': 21, 'y': 21},
    'eamon': {'x': 40, 'y': 23}, 'eamon_tower': {'x': 33, 'y': 11}, 'eamon_sleep': {'x': 41, 'y': 26},
    'platform_sit': {'x': 31, 'y': 14}, 'platform_lean': {'x': 15, 'y': 15}, 'south_work': {'x': 23, 'y': 29}, 'south_pair_a': {'x': 11, 'y': 21}, 'south_pair_b': {'x': 12, 'y': 21},
    'yaw': {'x': 35, 'y': 15}, 'joaquin': {'x': 22, 'y': 15},
}
CHELA_HERE = {'all': [{'not': {'dead': 'npc_rc_02'}}, {'not': {'flag': 'rc_chela', 'eq': 'off'}}, {'not': {'flag': 'rc_chela', 'eq': 'stocks'}}, {'not': {'flag': 'rc_chela', 'eq': 'dead'}}]}
ABE_HERE = {'all': [{'not': {'dead': 'npc_rc_03'}}, {'not': {'flag': 'rc_abe'}}]}
FREED = {'any': [{'flag': 'rc_stock', 'eq': 'bought'}, {'flag': 'rc_stock', 'eq': 'forged'}]}
npcs = [
    {'def': 'npc_rc_09', 'x': 13, 'y': 7, 'facing': 2},
    {'def': 'npc_rc_02', 'x': 24, 'y': 8, 'facing': 2, 'if': CHELA_HERE},
    {'def': 'npc_rc_03', 'x': 22, 'y': 9, 'facing': 2, 'if': ABE_HERE},
    {'def': 'npc_rc_10', 'x': 40, 'y': 23, 'facing': 0},
    {'def': 'npc_rc_11', 'x': 35, 'y': 15, 'facing': 2, 'schedule': [], 'if': FREED},
    {'def': 'npc_rc_12', 'x': 22, 'y': 15, 'facing': 2, 'schedule': [], 'if': {'any': [FREED, {'flag': 'rc_joaquin', 'eq': 'home'}]}},
    # the Long Night (B5d): the city's warden car with the order's first name in it, held at the platform road
    {'def': 'npc_sh_05', 'id': 'ln_calla_wh', 'x': 12, 'y': 14, 'facing': 2, 'schedule': [], 'dialogue': 'd_ln_car', 'if': {'all': [{'flag': 'ln_car', 'eq': 'west_halt'}, {'not': {'flag': 'ln_calla'}}]}},
    {'def': 'npc_ln_e1', 'x': 11, 'y': 15, 'facing': 1, 'if': {'all': [{'flag': 'ln_car', 'eq': 'west_halt'}, {'not': {'flag': 'ln_calla'}}]}},
    {'def': 'npc_ln_e2', 'x': 14, 'y': 14, 'facing': 3, 'if': {'all': [{'flag': 'ln_car', 'eq': 'west_halt'}, {'not': {'flag': 'ln_calla'}}]}},
]
spawns = [
    {'id': 'start', 'x': 24, 'y': 15, 'facing': 2}, {'id': 'platform', 'x': 24, 'y': 15, 'facing': 2},
    {'id': 'from_meridian', 'x': 2, 'y': 14, 'facing': 1}, {'id': 'from_depot', 'x': 45, 'y': 14, 'facing': 3}, {'id': 'from_lm_rc_kettle', 'x': 45, 'y': 13, 'facing': 3},
    {'id': 'from_openfield', 'x': 24, 'y': 33, 'facing': 0}, {'id': 'handcar', 'x': 41, 'y': 20, 'facing': 2},
]
rc_halt_w = {
    'id': 'rc_halt_w', 'name': 'West Halt', 'seed': 513, 'settlement': 'west_halt',
    'layout': rows, 'legend': legend_for(rows), 'props': props,
    'lights': [light(9, 16, 3.4, LAMP, 1.8, 9), light(39, 16, 3.4, LAMP, 1.8, 9), light(13, 7, 2.6, WARM, 1.4, 6), light(24, 7, 2.6, WARM, 1.4, 6), light(22, 20, 0.8, FIRE, 1.4, 6, 0.35), light(40, 24, 2.6, WARM, 1.2, 6),
               light(34, 6, 6.0, '0xffe8c0', 0.6, 5, 0.2)],
    'spawns': spawns,
    'talk': {
        'rc_hw_flag': {'dialogue': 'd_rc_board_hw', 'name': 'The request flag'},
        'rc_hw_stall': {'dialogue': 'd_rc_stall_w', 'name': 'A stall'},
        'rc_hw_tagboard': {'dialogue': 'd_rc_tagboard', 'name': 'The watch board'},
        'rc_hw_tower': {'dialogue': 'd_rc_tower', 'name': 'The water tower'},
        'rc_hw_chalk': {'dialogue': 'd_rc_chalk', 'name': 'Chalk on the tower'},
        'rc_hw_handcar': {'dialogue': 'd_rc_handcar', 'name': 'The handcar'},
        'rc_hw_south': {'dialogue': 'd_rc_south', 'name': 'The track south'},
    },
    'spots': spots, 'npcs': npcs,
    'triggers': [
        {'id': 'arrive', 'x': 1, 'y': 11, 'w': 46, 'h': 9, 'text': 'West Halt: a platform, a water tower, a keeper\'s house and a handful of others, half of them with their doors nailed. A board on the platform once said TRAINS STOP ON REQUEST. Somebody has painted THROUGH over it in guild green, and somebody else has scratched the green half off again.', 'effects': [{'learn': 'seen_halt_w'}, {'learn': 'loc_halt_w'}, {'set': 'rc_open'}]},
        {'id': 'ln_car', 'x': 1, 'y': 11, 'w': 46, 'h': 9, 'if': {'all': [{'flag': 'ln_car', 'eq': 'west_halt'}, {'not': {'flag': 'ln_calla'}}]}, 'text': 'On the platform road west of the halt, a warden car: plated windows, a chained door, two wardens in the Precinct\'s grey beside it, and through the slot in its door a woman in a grey scarf sitting with her hands in her lap.', 'effects': [{'learn': 'ln_car_seen'}, {'quest': 'q_ln_calla', 'start': True}]},
        {'id': 'tower', 'x': 29, 'y': 11, 'w': 10, 'h': 2, 'text': 'The water tower\'s ladder has been pulled up and its hatch padlocked with a new lock. From inside, once, somebody coughs, and somebody else hushes them.', 'effects': [{'learn': 'rc_tower_cough'}, {'quest': 'q_rc_stock', 'start': True}]},
    ],
    'extras': [
        {'count': 3, 'roles': ['labourer', 'settler'], 'life': 'starved', 'ages': [8, 70], 'area': {'x': 2, 'y': 19, 'w': 20, 'h': 12}, 'spots': ['south_work', 'south_pair_a', 'south_pair_b'],
         'barks': ['The through doesn\'t stop. Didn\'t blow, even.', 'Length money. Ask the guild where it went.', 'Bread\'s dear this week. Everything\'s dear.']},
        {'count': 2, 'roles': ['labourer', 'drifter'], 'life': 'hard', 'area': {'x': 8, 'y': 13, 'w': 32, 'h': 4}, 'spots': ['platform_sit', 'platform_lean'],
         'barks': ['Flag\'s up if you want the seven o\'clock.', 'Openfield\'s a day south. They feed you if you dig.']},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0xb4b0a0', 'fogDensity': 0.006, 'dust': 0.2, 'grade': 0.25, 'mood': 'haze', 'sound': 'wind'},
}
check('rc_halt_w', rows, rc_halt_w['legend'], props, spawns, npcs, spots, 'start')
OUT['rc_halt_w'] = rc_halt_w

# ================================================================ East Halt
g = grid(W, H, 'd')
border(g)
fill(g, 1, 17, 46, 18, 'g')                           # the Line
fill(g, 6, 13, 36, 16, 'c')                           # the platform
building(g, 7, 4, 15, 10, 'W', 'w', [(11, 10)])       # the keeper's house
building(g, 18, 5, 23, 10, 'W', 'w', [(20, 10)])      # Gerrit's house
building(g, 26, 5, 31, 10, 'W', 'w', [(28, 10)])      # the tool shed
building(g, 36, 3, 43, 9, 'S', 'w', [])              # houses shut
building(g, 4, 22, 10, 27, 'S', 'w', [])
building(g, 13, 22, 19, 27, 'S', 'w', [(16, 22)])
fill(g, 38, 19, 46, 33, 'k')                          # the cutting east, the track to the mines
fill(g, 40, 19, 41, 33, 'd'); g[35][40] = 'd'; g[35][41] = 'd'; fill(g, 40, 34, 41, 34, 'd')
rows = [''.join(r) for r in g]
props = [
    {'kind': 'sign', 'x': 18, 'y': 13, 'rot': 0, 'id': 'rc_he_flag'}, {'kind': 'lamp_post', 'x': 7, 'y': 16}, {'kind': 'lamp_post', 'x': 35, 'y': 16}, {'kind': 'chair', 'x': 30, 'y': 13, 'rot': 0},
    {'kind': 'table', 'x': 24, 'y': 14, 'id': 'rc_he_stall'}, {'kind': 'crate', 'x': 23, 'y': 14},
    {'kind': 'table', 'x': 9, 'y': 6, 'id': 'rc_he_accounts'}, {'kind': 'chair', 'x': 10, 'y': 6, 'rot': 3}, {'kind': 'cot', 'x': 14, 'y': 5, 'rot': 3}, {'kind': 'stove', 'x': 8, 'y': 9},
    {'kind': 'cot', 'x': 22, 'y': 6, 'rot': 3}, {'kind': 'chair', 'x': 19, 'y': 7, 'rot': 1},
    {'kind': 'locker', 'x': 30, 'y': 6, 'id': 'rc_he_shed'}, {'kind': 'shelf', 'x': 27, 'y': 6, 'rot': 1}, {'kind': 'crate', 'x': 27, 'y': 9},
    {'kind': 'tank', 'x': 33, 'y': 6}, {'kind': 'pipe_h', 'x': 34, 'y': 10},
    {'kind': 'debris', 'x': 44, 'y': 18, 'id': 'rc_he_joint'}, {'kind': 'sign', 'x': 43, 'y': 21, 'rot': 3, 'id': 'rc_he_cutting'},
    {'kind': 'cot', 'x': 14, 'y': 26, 'rot': 1}, {'kind': 'planter', 'x': 22, 'y': 29}, {'kind': 'dead_tree', 'x': 30, 'y': 28}, {'kind': 'rock', 'x': 6, 'y': 31}, {'kind': 'fire_barrel', 'x': 21, 'y': 20},
    # B5c: the foot of Number Four's bucket line, in the cutting
    {'kind': 'sign', 'x': 44, 'y': 30, 'rot': 3, 'id': 'rc_he_bucket'},
]
spots = {
    'imani': {'x': 11, 'y': 7}, 'imani_platform': {'x': 17, 'y': 14}, 'imani_sleep': {'x': 13, 'y': 5},
    'gerrit': {'x': 20, 'y': 8}, 'gerrit_length': {'x': 42, 'y': 20}, 'gerrit_sleep': {'x': 21, 'y': 6},
    'kofi': {'x': 25, 'y': 15}, 'kofi_sleep': {'x': 16, 'y': 24},
    'platform_sit': {'x': 31, 'y': 14}, 'south_work': {'x': 21, 'y': 21}, 'south_sit': {'x': 15, 'y': 29},
}
npcs = [
    {'def': 'npc_rc_13', 'x': 11, 'y': 7, 'facing': 2, 'if': {'not': {'any': [{'flag': 'rc_east', 'eq': 'told'}, {'flag': 'rc_imani', 'eq': 'gone'}]}}},
    {'def': 'npc_rc_14', 'x': 20, 'y': 8, 'facing': 2},
    {'def': 'npc_rc_15', 'x': 25, 'y': 15, 'facing': 2},
]
spawns = [
    {'id': 'start', 'x': 20, 'y': 15, 'facing': 2}, {'id': 'platform', 'x': 20, 'y': 15, 'facing': 2},
    {'id': 'from_junction', 'x': 2, 'y': 15, 'facing': 1}, {'id': 'from_skirts', 'x': 45, 'y': 15, 'facing': 3}, {'id': 'from_mine_teeth', 'x': 40, 'y': 34, 'facing': 0},
]
rc_halt_e = {
    'id': 'rc_halt_e', 'name': 'East Halt', 'seed': 514, 'settlement': 'east_halt',
    'layout': rows, 'legend': legend_for(rows), 'props': props,
    'lights': [light(7, 16, 3.4, LAMP, 1.6, 9), light(35, 16, 3.4, LAMP, 1.6, 9), light(11, 7, 2.6, WARM, 1.2, 6), light(21, 20, 0.8, FIRE, 1.2, 5, 0.35)],
    'spawns': spawns,
    'talk': {
        'rc_he_flag': {'dialogue': 'd_rc_board_he', 'name': 'The request flag'},
        'rc_he_stall': {'dialogue': 'd_rc_kofi', 'name': 'Kofi\'s stall'},
        'rc_he_accounts': {'dialogue': 'd_rc_accounts', 'name': 'The halt\'s accounts'},
        'rc_he_shed': {'dialogue': 'd_rc_shed', 'name': 'The tool shed'},
        'rc_he_joint': {'dialogue': 'd_rc_joint', 'name': 'The east length'},
        'rc_he_cutting': {'dialogue': 'd_rc_cutting', 'name': 'The cutting east'},
        'rc_he_bucket': {'dialogue': 'd_tm_bucket_foot', 'name': 'The bucket line'},
    },
    'spots': spots, 'npcs': npcs,
    'triggers': [
        {'id': 'arrive', 'x': 1, 'y': 11, 'w': 46, 'h': 9, 'text': 'East Halt: a platform built for a town, and the town gone. Fourteen people live here now, a water tower with a cracked tank, and a row of houses with their doors nailed and the names of the people who left chalked on the boards. East, the Line goes into a cutting toward the Teeth.', 'effects': [{'learn': 'seen_halt_e'}, {'learn': 'loc_halt_e'}, {'set': 'rc_open'}]},
    ],
    'extras': [
        {'count': 2, 'roles': ['settler', 'labourer'], 'life': 'starved', 'ages': [6, 75], 'area': {'x': 2, 'y': 19, 'w': 30, 'h': 12}, 'spots': ['south_work', 'south_sit', 'platform_sit'],
         'barks': ['Forty-five of us when the stops were stops.', 'The through goes by at two. You can set your teeth by it.', 'Nobody buys water from a halt nobody stops at.']},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0xa8a89c', 'fogDensity': 0.007, 'dust': 0.25, 'grade': 0.3, 'mood': 'grim', 'sound': 'wind'},
}
check('rc_halt_e', rows, rc_halt_e['legend'], props, spawns, npcs, spots, 'start')
OUT['rc_halt_e'] = rc_halt_e

# ================================================================ Yard Nine (the depot)
W, H = 64, 44
g = grid(W, H, 'd')
border(g)
building(g, 7, 3, 30, 16, 'H', 'c', [(12, 16), (24, 16)])   # the engine shed
fill(g, 12, 4, 12, 15, 'g'); fill(g, 24, 4, 24, 15, 'g')    # its two roads
fill(g, 12, 17, 12, 29, 'g'); fill(g, 24, 17, 24, 29, 'g')
building(g, 33, 3, 42, 12, 'C', 'c', [(37, 12)])            # the fitting shop
building(g, 45, 3, 52, 10, 'W', 'w', [(48, 10)])            # the yard office
building(g, 54, 3, 62, 12, 'M', 'm', [(58, 12)])            # the still house
fill(g, 1, 30, 62, 31, 'g')                                 # the main line
fill(g, 6, 34, 58, 34, 'g'); fill(g, 6, 37, 58, 37, 'g'); fill(g, 6, 40, 58, 40, 'g')   # the sidings
fill(g, 31, 17, 33, 29, 'd'); fill(g, 31, 1, 33, 2, 'd')    # the track north to Sawtown
rows = [''.join(r) for r in g]
props = [
    # the engine shed: Dorcas on her pit, Sixty's bay, Ida's slate
    {'kind': 'machine', 'x': 12, 'y': 8, 'rot': 0, 'id': 'rc_yd_dorcas'}, {'kind': 'machine', 'x': 24, 'y': 8, 'rot': 0, 'id': 'rc_yd_sixty'}, {'kind': 'sign', 'x': 9, 'y': 5, 'rot': 1, 'id': 'rc_yd_slate'},
    {'kind': 'crate', 'x': 16, 'y': 4}, {'kind': 'barrel', 'x': 17, 'y': 4}, {'kind': 'shelf', 'x': 29, 'y': 6, 'rot': 3}, {'kind': 'pipe_h', 'x': 18, 'y': 12}, {'kind': 'barrel_rust', 'x': 8, 'y': 14},
    # the fitting shop
    {'kind': 'table', 'x': 36, 'y': 6}, {'kind': 'counter', 'x': 38, 'y': 9, 'rot': 0}, {'kind': 'counter', 'x': 39, 'y': 9, 'rot': 0}, {'kind': 'shelf', 'x': 41, 'y': 5, 'rot': 3}, {'kind': 'machine', 'x': 34, 'y': 4, 'rot': 1},
    # the yard office: Whitlock's desk, the board
    {'kind': 'table', 'x': 48, 'y': 5}, {'kind': 'chair', 'x': 48, 'y': 6, 'rot': 0}, {'kind': 'terminal', 'x': 51, 'y': 4, 'rot': 3}, {'kind': 'sign', 'x': 46, 'y': 11, 'rot': 0, 'id': 'rc_yd_board'},
    # the still
    {'kind': 'tank', 'x': 55, 'y': 5}, {'kind': 'tank', 'x': 61, 'y': 5}, {'kind': 'counter', 'x': 57, 'y': 8, 'rot': 0}, {'kind': 'counter', 'x': 58, 'y': 8, 'rot': 0}, {'kind': 'pipe_h', 'x': 59, 'y': 5},
    {'kind': 'tank', 'x': 56, 'y': 16}, {'kind': 'tank', 'x': 59, 'y': 16},
    # the water column, the dead cars, Ferris's fire
    {'kind': 'pump', 'x': 35, 'y': 28}, {'kind': 'car_wreck', 'x': 10, 'y': 34}, {'kind': 'car_wreck', 'x': 20, 'y': 37}, {'kind': 'car_wreck', 'x': 34, 'y': 40}, {'kind': 'car_wreck', 'x': 46, 'y': 34}, {'kind': 'car_wreck', 'x': 52, 'y': 37},
    {'kind': 'campfire', 'x': 10, 'y': 42}, {'kind': 'blanket', 'x': 8, 'y': 41}, {'kind': 'sign', 'x': 3, 'y': 29, 'rot': 1, 'id': 'rc_yd_curve'},
    {'kind': 'lamp_post', 'x': 29, 'y': 18}, {'kind': 'lamp_post', 'x': 44, 'y': 28}, {'kind': 'lamp_post', 'x': 52, 'y': 18},
    # B5c: the north track's foot, where the timber train for Sawtown leaves when Dorcas runs
    {'kind': 'sign', 'x': 33, 'y': 18, 'rot': 0, 'id': 'rc_yd_north'},
]
spots = {
    'ida': {'x': 37, 'y': 7}, 'ida_shed': {'x': 13, 'y': 10}, 'ida_sleep': {'x': 40, 'y': 10},
    'willem': {'x': 22, 'y': 10}, 'willem_platform': {'x': 30, 'y': 32}, 'willem_sleep': {'x': 27, 'y': 5},
    'jide': {'x': 58, 'y': 7}, 'jide_sleep': {'x': 61, 'y': 10},
    'whitlock': {'x': 49, 'y': 6},
    'ferris': {'x': 12, 'y': 42}, 'ferris_curve': {'x': 4, 'y': 32},
    'yard_work': {'x': 18, 'y': 20}, 'yard_work_b': {'x': 40, 'y': 33}, 'yard_pair_a': {'x': 36, 'y': 14}, 'yard_pair_b': {'x': 37, 'y': 14}, 'yard_sit': {'x': 57, 'y': 14},
}
npcs = [
    {'def': 'npc_rc_16', 'x': 37, 'y': 7, 'facing': 2},
    {'def': 'npc_rc_17', 'x': 22, 'y': 10, 'facing': 3, 'if': {'not': {'flag': 'rc_willem_dead'}}},
    {'def': 'npc_rc_18', 'x': 58, 'y': 7, 'facing': 2},
    {'def': 'npc_rc_19', 'x': 49, 'y': 6, 'facing': 2, 'if': {'not': {'flag': 'rc_whitlock_gone'}}},
    {'def': 'npc_rc_08', 'x': 12, 'y': 42, 'facing': 1},
]
spawns = [
    {'id': 'start', 'x': 32, 'y': 32, 'facing': 0}, {'id': 'platform', 'x': 32, 'y': 32, 'facing': 0},
    {'id': 'from_junction', 'x': 62, 'y': 29, 'facing': 3}, {'id': 'from_lm_rc_kettle', 'x': 1, 'y': 29, 'facing': 1}, {'id': 'from_halt_w', 'x': 1, 'y': 32, 'facing': 1},
    {'id': 'from_timber', 'x': 32, 'y': 1, 'facing': 2}, {'id': 'footplate', 'x': 24, 'y': 20, 'facing': 2},
]
rc_yard = {
    'id': 'rc_yard', 'name': 'Yard Nine', 'seed': 515, 'settlement': 'yard_nine',
    'layout': rows, 'legend': legend_for(rows), 'props': props,
    'lights': [light(18, 9, 6.5, '0xfff0d8', 1.8, 14), light(37, 7, 3.0, COLD, 1.6, 8), light(48, 6, 2.8, WARM, 1.4, 6), light(58, 8, 2.6, '0xffb070', 1.6, 7, 0.15),
               light(29, 18, 3.6, LAMP, 1.8, 10), light(44, 28, 3.6, LAMP, 1.8, 10), light(52, 18, 3.6, LAMP, 1.8, 10), light(10, 42, 0.8, FIRE, 1.6, 6, 0.4)],
    'spawns': spawns,
    'talk': {
        'rc_yd_dorcas': {'dialogue': 'd_rc_dorcas', 'name': 'Dorcas'},
        'rc_yd_sixty': {'dialogue': 'd_rc_sixty', 'name': 'Sixty'},
        'rc_yd_slate': {'dialogue': 'd_rc_slate', 'name': 'Ida\'s slate'},
        'rc_yd_board': {'dialogue': 'd_rc_board_yd', 'name': 'The yard board'},
        'rc_yd_curve': {'dialogue': 'd_rc_curve', 'name': 'The curve'},
        'rc_yd_north': {'dialogue': 'd_nw_north_track', 'name': 'The north track'},
    },
    'spots': spots, 'npcs': npcs,
    'triggers': [
        {'id': 'arrive', 'x': 1, 'y': 28, 'w': 62, 'h': 6, 'text': 'Yard Nine: a depot in a bowl of dead cars, three sidings of them rusting into the grass, an engine shed big enough to sleep a village, and a still house that smells of bread gone wrong. The main line runs through it all and out the other side.', 'effects': [{'learn': 'seen_depot'}, {'learn': 'loc_depot'}, {'set': 'rc_open'}]},
        {'id': 'shed', 'x': 8, 'y': 4, 'w': 22, 'h': 12, 'text': 'In the engine shed, on the left road, an engine stands cold over its pit: long, square-nosed, armoured over the cab with plate somebody riveted on by hand. DORCAS, in paint, on the nose. On the right road, the bay where the other one stands when it is in is empty and black with oil.', 'effects': [{'learn': 'rc_dorcas_seen'}, {'quest': 'q_rc_engine', 'start': True}]},
    ],
    'extras': [
        {'count': 4, 'roles': ['tech', 'labourer'], 'life': 'hard', 'faction': 'tollmen', 'area': {'x': 8, 'y': 17, 'w': 50, 'h': 12}, 'spots': ['yard_work', 'yard_work_b', 'yard_pair_a', 'yard_pair_b', 'yard_sit'], 'hours': {'from': 6, 'to': 20},
         'barks': ['One engine and the through gets every path. You do the sums.', 'Dorcas\'ll go again. Ida says.', 'Grain from Openfield, alcohol from the still, miles from the alcohol. That\'s the Line.']},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0xa49c90', 'fogDensity': 0.008, 'dust': 0.2, 'grade': 0.3, 'mood': 'haze', 'sound': 'wind'},
}
check('rc_yard', rows, rc_yard['legend'], props, spawns, npcs, spots, 'start')
OUT['rc_yard'] = rc_yard

# ================================================================ Kettle Cut
W, H = 48, 28
g = grid(W, H, 'R')
fill(g, 0, 8, 47, 19, 'd')                            # the cut's floor
fill(g, 0, 11, 47, 12, 'g')                           # the Line
fill(g, 0, 16, 47, 18, 'd')                           # the old service road
fill(g, 30, 9, 33, 9, 'x')                            # standing water in the ditch
fill(g, 34, 4, 37, 7, 'k'); fill(g, 37, 7, 37, 7, 'k')  # the blind cut into the north bank
for x in range(5, 47, 7):
    g[7][x] = 'k'                                      # the bank's broken edge
for x in range(3, 47, 6):
    g[20][x] = 'k'
rows = [''.join(r) for r in g]
props = [
    {'kind': 'car_wreck', 'x': 20, 'y': 9, 'rot': 0, 'id': 'rc_kt_car'}, {'kind': 'crate', 'x': 22, 'y': 9}, {'kind': 'crate', 'x': 18, 'y': 10}, {'kind': 'debris', 'x': 23, 'y': 10},
    {'kind': 'car_wreck', 'x': 27, 'y': 9, 'rot': 0, 'id': 'rc_kt_stock'},
    {'kind': 'debris', 'x': 31, 'y': 12, 'id': 'rc_kt_rails'}, {'kind': 'debris', 'x': 14, 'y': 10, 'id': 'rc_kt_cases'},
    {'kind': 'sandbags', 'x': 35, 'y': 5, 'id': 'rc_kt_blind'}, {'kind': 'sign', 'x': 8, 'y': 15, 'rot': 0, 'id': 'rc_kt_grave'},
    {'kind': 'tank', 'x': 42, 'y': 9}, {'kind': 'rock', 'x': 3, 'y': 9}, {'kind': 'rock_small', 'x': 38, 'y': 19}, {'kind': 'dead_tree', 'x': 26, 'y': 19},
]
spots = {'blind': {'x': 36, 'y': 6}, 'chela': {'x': 24, 'y': 13}, 'abe': {'x': 19, 'y': 13}, 'watch_a': {'x': 28, 'y': 13}, 'handcar': {'x': 34, 'y': 13}}
NIGHT_RUN = {'all': [{'hour': {'from': 0, 'to': 4}}, {'not': {'flag': 'rc_bandits'}}, {'flag': 'rc_kettle_run'}]}
npcs = [
    {'def': 'npc_rc_02', 'id': 'npc_rc_02_kettle', 'x': 24, 'y': 13, 'facing': 1, 'schedule': [], 'dialogue': 'd_rc_kettle_night', 'if': {'all': [NIGHT_RUN, {'not': {'dead': 'npc_rc_02'}}]}},
    {'def': 'npc_rc_03', 'id': 'npc_rc_03_kettle', 'x': 19, 'y': 13, 'facing': 1, 'schedule': [], 'dialogue': 'd_rc_kettle_night', 'if': {'all': [NIGHT_RUN, {'not': {'dead': 'npc_rc_03'}}]}},
    {'def': 'npc_rc_g3', 'x': 28, 'y': 13, 'facing': 1, 'schedule': [], 'dialogue': 'd_rc_kettle_night', 'if': NIGHT_RUN},
    {'def': 'npc_rc_g4', 'x': 34, 'y': 13, 'facing': 3, 'schedule': [], 'dialogue': 'd_rc_kettle_night', 'if': NIGHT_RUN},
]
spawns = [
    {'id': 'start', 'x': 24, 'y': 17, 'facing': 0}, {'id': 'from_halt_w', 'x': 1, 'y': 17, 'facing': 1}, {'id': 'from_depot', 'x': 46, 'y': 17, 'facing': 3},
    {'id': 'blind', 'x': 36, 'y': 6, 'facing': 2},
]
rc_kettle = {
    'id': 'rc_kettle', 'name': 'Kettle Cut', 'seed': 516,
    'layout': rows, 'legend': legend_for(rows), 'props': props,
    'lights': [light(42, 9, 1.2, '0xd0c0a0', 0.4, 6)],
    'spawns': spawns,
    'talk': {
        'rc_kt_car': {'dialogue': 'd_rc_kt_car', 'name': 'The sealed car'},
        'rc_kt_stock': {'dialogue': 'd_rc_kt_stock', 'name': 'The stock car'},
        'rc_kt_rails': {'dialogue': 'd_rc_kt_rails', 'name': 'The rails'},
        'rc_kt_cases': {'dialogue': 'd_rc_kt_cases', 'name': 'Brass in the ballast'},
        'rc_kt_blind': {'dialogue': 'd_rc_kt_blind', 'name': 'The blind'},
        'rc_kt_grave': {'dialogue': 'd_rc_kt_grave', 'name': 'A grave'},
    },
    'spots': spots, 'npcs': npcs,
    'triggers': [
        {'id': 'arrive', 'x': 0, 'y': 8, 'w': 48, 'h': 12, 'text': 'Kettle Cut: the Line and the old road go through a notch in red clay banks twenty feet high, side by side, with no room for anything else. In the ditch lie two cars on their sides, opened like tins. At the far end a pre-war boiler, the kettle, rusts in the reeds.', 'effects': [{'learn': 'rc_kettle_seen'}, {'learn': 'loc_lm_rc_kettle'}, {'quest': 'q_rc_kettle', 'start': True}]},
        {'id': 'night', 'x': 0, 'y': 8, 'w': 48, 'h': 12, 'if': NIGHT_RUN, 'text': 'A lamp, hooded green, coming down the rails from the west with no engine behind it: a handcar, four people pumping, and the sound of it carried a long way in the cut. It stops by the wrecks. Somebody lays a sleeper across the rails. Somebody lights a cigarette and puts it out again.', 'effects': [{'learn': 'rc_saw_run'}, {'event': 'dialogue', 'data': {'tree': 'd_rc_kettle_night', 'name': 'Kettle Cut'}}]},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0x9c8a78', 'fogDensity': 0.01, 'dust': 0.3, 'grade': 0.3, 'mood': 'grim', 'sound': 'wind'},
}
check('rc_kettle', rows, rc_kettle['legend'], props, spawns, npcs, spots, 'start')
OUT['rc_kettle'] = rc_kettle

HEADER = "import type { MapDef } from '../../engine/data/types';\n\n// Generated by tools/maps/gen_rc_corridor.py — edit the generator, then re-run it.\n"
for mid, m in OUT.items():
    with open(os.path.join(ROOT, 'src', 'content', 'maps', f"{mid}.ts"), 'w') as f:
        f.write(f"{HEADER}export const {mid}: MapDef = {ts(m)};\n")
    print(mid, len(m['layout'][0]), 'x', len(m['layout']))
