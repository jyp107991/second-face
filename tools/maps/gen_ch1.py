#!/usr/bin/env python3
"""Generates the Chapter One map layouts (src/content/maps/cistern9.ts, c9_mouth.ts).

Rooms are carved from solid wall; props, spots, lights and exits are authored here as data and written
out as typed TS. Re-run after changing a room; hand-edit the TS only for small tweaks (and mirror them here).
    python3 tools/maps/gen_ch1.py
"""
import json, os

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')


def grid(w, h, fill):
    return [[fill] * w for _ in range(h)]


def carve(g, x0, y0, x1, y1, ch):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            g[y][x] = ch


def rows(g):
    return [''.join(r) for r in g]


def ts(obj):
    """JSON → TS literal: unquoted keys; 'hex:0x..' strings become bare number literals."""
    import re
    s = json.dumps(obj, indent=2)
    s = re.sub(r'"([A-Za-z_][A-Za-z0-9_]*)":', r'\1:', s)
    s = re.sub(r'"hex:(0x[0-9a-fA-F]+)"', r'\1', s)
    return s


# ------------------------------------------------------------------------------------------------
# Cistern 9 — the shelter: a ring of rooms around two corridors, the great door at the north-west.
# ------------------------------------------------------------------------------------------------
W, H = 46, 31
g = grid(W, H, '#')
carve(g, 1, 1, 11, 7, '.')      # great-door hall
carve(g, 14, 1, 23, 7, 'm')     # machine room
carve(g, 26, 1, 44, 8, 't')     # hydroponics
carve(g, 1, 9, 44, 10, '.')     # upper ring corridor
carve(g, 12, 4, 13, 4, '.')     # hall → machine room
carve(g, 24, 4, 25, 4, 'm')     # machine room → hydroponics
carve(g, 1, 12, 10, 18, 't')    # clinic
carve(g, 15, 12, 22, 18, '.')   # council room
carve(g, 27, 12, 44, 19, '.')   # dormitory
carve(g, 12, 11, 13, 20, '.')   # west vertical corridor
carve(g, 24, 11, 25, 20, '.')   # east vertical corridor
carve(g, 5, 11, 5, 11, '.')     # clinic door
carve(g, 18, 11, 18, 11, '.')   # council door
carve(g, 30, 11, 30, 11, '.')   # dorm door (west)
carve(g, 40, 11, 40, 11, '.')   # dorm door (east)
carve(g, 14, 15, 14, 15, '.')   # council side door from the west corridor
carve(g, 1, 21, 44, 22, '.')    # lower ring corridor
carve(g, 1, 24, 21, 29, 't')    # commons / kitchen
carve(g, 24, 24, 29, 29, 'm')   # armoury
carve(g, 32, 24, 44, 29, 'g')   # maintenance / shaft room
carve(g, 10, 23, 10, 23, '.')   # commons door
carve(g, 26, 23, 26, 23, '.')   # armoury door
carve(g, 36, 23, 36, 23, '.')   # shaft room door
carve(g, 23, 15, 23, 15, 'A')   # the sealed Archive: a door tile in the council room's east wall
carve(g, 5, 0, 7, 0, 'D')       # the great door itself (in the north wall)

cistern9 = {
    'id': 'cistern9', 'name': 'Cistern 9', 'seed': 9, 'settlement': 'cistern9',
    'layout': rows(g),
    'legend': {
        '#': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 2.8},
        '.': {'floor': 'concrete'}, 'm': {'floor': 'metal'}, 't': {'floor': 'tile'}, 'g': {'floor': 'grate'},
        'A': {'wall': 'metal', 'floor': 'metal', 'wallHeight': 2.8},
        'D': {'wall': 'metal', 'floor': 'metal', 'wallHeight': 2.8},
    },
    'props': [
        # great-door hall: the door's inner face, sandbags from a drill nobody remembers, a sign
        {'kind': 'vault_door', 'x': 6, 'y': 1, 'rot': 0, 'id': 'great_door'},
        {'kind': 'sign', 'x': 2, 'y': 1}, {'kind': 'sandbags', 'x': 10, 'y': 2}, {'kind': 'sandbags', 'x': 10, 'y': 3},
        {'kind': 'barrel', 'x': 1, 'y': 7}, {'kind': 'crate', 'x': 2, 'y': 7, 'id': 'hall_crate'}, {'kind': 'lamp_post', 'x': 9, 'y': 6},
        # machine room: MOTHER's cabinets and her terminal
        {'kind': 'machine', 'x': 15, 'y': 1}, {'kind': 'machine', 'x': 16, 'y': 1}, {'kind': 'machine', 'x': 21, 'y': 1}, {'kind': 'machine', 'x': 22, 'y': 1},
        {'kind': 'terminal', 'x': 18, 'y': 1, 'rot': 2, 'id': 'mother_term'},
        {'kind': 'pipe_h', 'x': 14, 'y': 7}, {'kind': 'pipe_h', 'x': 15, 'y': 7}, {'kind': 'pipe_h', 'x': 16, 'y': 7},
        {'kind': 'barrel_rust', 'x': 23, 'y': 7}, {'kind': 'shelf', 'x': 23, 'y': 2, 'rot': 3, 'id': 'parts_shelf'}, {'kind': 'table', 'x': 20, 'y': 6},
        # hydroponics: two long beds of planters under grow lights
        *[{'kind': 'planter', 'x': x, 'y': 2} for x in range(27, 44, 2)],
        *[{'kind': 'planter', 'x': x, 'y': 7} for x in range(27, 44, 2)],
        {'kind': 'tank', 'x': 44, 'y': 1}, {'kind': 'crate', 'x': 44, 'y': 8, 'id': 'hydro_crate'}, {'kind': 'table', 'x': 35, 'y': 5},
        # clinic: the stranger on a cot, Pell's table, a shelf of bandages
        {'kind': 'cot', 'x': 3, 'y': 13, 'id': 'stranger_cot'}, {'kind': 'cot', 'x': 3, 'y': 17}, {'kind': 'table', 'x': 7, 'y': 15},
        {'kind': 'shelf', 'x': 10, 'y': 13, 'rot': 3, 'id': 'clinic_shelf'}, {'kind': 'chair', 'x': 6, 'y': 15, 'rot': 1}, {'kind': 'locker', 'x': 1, 'y': 18},
        # council room: a table, chairs, the Archive door set into the east wall
        {'kind': 'table', 'x': 18, 'y': 15}, {'kind': 'chair', 'x': 17, 'y': 15, 'rot': 1}, {'kind': 'chair', 'x': 19, 'y': 15, 'rot': 3},
        {'kind': 'chair', 'x': 18, 'y': 14, 'rot': 2}, {'kind': 'shelf', 'x': 15, 'y': 12, 'rot': 1}, {'kind': 'shelf', 'x': 16, 'y': 12, 'rot': 1},
        {'kind': 'vault_door', 'x': 22, 'y': 15, 'rot': 1, 'id': 'archive_door'},
        # dormitory: bunks and lockers; the player's is the one by the east wall
        *[{'kind': 'bed', 'x': x, 'y': 13} for x in range(28, 44, 2)],
        *[{'kind': 'bed', 'x': x, 'y': 18} for x in range(28, 44, 2)],
        {'kind': 'locker', 'x': 44, 'y': 14, 'id': 'locker_pc'}, {'kind': 'locker', 'x': 44, 'y': 16}, {'kind': 'locker', 'x': 27, 'y': 15}, {'kind': 'locker', 'x': 27, 'y': 16},
        # commons: tables, the stove, the water counter
        {'kind': 'stove', 'x': 2, 'y': 24}, {'kind': 'counter', 'x': 3, 'y': 24}, {'kind': 'counter', 'x': 4, 'y': 24}, {'kind': 'shelf', 'x': 1, 'y': 25, 'rot': 1},
        *[{'kind': 'table', 'x': x, 'y': 27} for x in (6, 10, 14, 18)],
        *[{'kind': 'chair', 'x': x - 1, 'y': 27, 'rot': 1} for x in (6, 10, 14, 18)],
        *[{'kind': 'chair', 'x': x + 1, 'y': 27, 'rot': 3} for x in (6, 10, 14, 18)],
        {'kind': 'barrel', 'x': 21, 'y': 24}, {'kind': 'crate', 'x': 21, 'y': 25, 'id': 'kitchen_crate'},
        # armoury: eleven rifles nobody has fired in a generation, under lock
        {'kind': 'locker', 'x': 24, 'y': 24, 'id': 'armoury_locker'}, {'kind': 'locker', 'x': 25, 'y': 24, 'id': 'armoury_locker2'}, {'kind': 'shelf', 'x': 29, 'y': 25, 'rot': 3},
        {'kind': 'sandbags', 'x': 29, 'y': 29},
        # maintenance: the pump run, pipes, and the hatch to the surface
        *[{'kind': 'pipe_h', 'x': x, 'y': 24} for x in range(33, 44, 2)],
        {'kind': 'machine', 'x': 33, 'y': 29}, {'kind': 'machine', 'x': 34, 'y': 29}, {'kind': 'tank', 'x': 44, 'y': 24},
        {'kind': 'crate', 'x': 40, 'y': 26, 'id': 'shaft_crate'}, {'kind': 'barrel_rust', 'x': 38, 'y': 29},
        {'kind': 'vault_door', 'x': 44, 'y': 29, 'rot': 3, 'id': 'shaft_hatch'},
    ],
    'lights': [
        {'x': 6, 'y': 4, 'height': 2.6, 'color': 'hex:0xffd8a0', 'intensity': 2.5, 'range': 7, 'flicker': 0.1},
        {'x': 18, 'y': 3, 'height': 2.6, 'color': 'hex:0x9affc0', 'intensity': 3, 'range': 7},
        {'x': 31, 'y': 4, 'height': 2.6, 'color': 'hex:0xd8a0ff', 'intensity': 3, 'range': 8}, {'x': 40, 'y': 4, 'height': 2.6, 'color': 'hex:0xd8a0ff', 'intensity': 3, 'range': 8},
        {'x': 5, 'y': 15, 'height': 2.6, 'color': 'hex:0xe8f0ff', 'intensity': 3, 'range': 7},
        {'x': 18, 'y': 15, 'height': 2.6, 'color': 'hex:0xffe0b0', 'intensity': 2.5, 'range': 7, 'flicker': 0.15},
        {'x': 32, 'y': 15, 'height': 2.6, 'color': 'hex:0xffd8a0', 'intensity': 2, 'range': 8}, {'x': 41, 'y': 15, 'height': 2.6, 'color': 'hex:0xffd8a0', 'intensity': 2, 'range': 8},
        {'x': 10, 'y': 26, 'height': 2.6, 'color': 'hex:0xffd8a0', 'intensity': 2.5, 'range': 9, 'flicker': 0.1}, {'x': 4, 'y': 25, 'height': 2.6, 'color': 'hex:0xffc890', 'intensity': 2, 'range': 5, 'flicker': 0.3},
        {'x': 26, 'y': 26, 'height': 2.6, 'color': 'hex:0xffd8a0', 'intensity': 1.5, 'range': 5},
        {'x': 38, 'y': 26, 'height': 2.6, 'color': 'hex:0xffc890', 'intensity': 1.5, 'range': 7, 'flicker': 0.35},
        {'x': 22, 'y': 10, 'height': 2.6, 'color': 'hex:0xffd8a0', 'intensity': 1.5, 'range': 9}, {'x': 22, 'y': 21, 'height': 2.6, 'color': 'hex:0xffd8a0', 'intensity': 1.5, 'range': 9},
    ],
    'spawns': [
        {'id': 'start', 'x': 43, 'y': 15, 'facing': 3},
        {'id': 'from_outside', 'x': 6, 'y': 3, 'facing': 2},
        {'id': 'from_shaft', 'x': 42, 'y': 28, 'facing': 3},
    ],
    'exits': [
        {'x': 5, 'y': 1, 'w': 3, 'h': 1, 'to': {'location': 'c9_mouth', 'spawn': 'door'}, 'label': 'The great door',
         'if': {'flag': 'c9_door_open'}, 'effects': [{'set': 'c9_left'}]},
        {'x': 43, 'y': 29, 'to': {'location': 'c9_mouth', 'spawn': 'shaft'}, 'label': 'The pump run',
         'if': {'flag': 'c9_shaft_open'}, 'effects': [{'set': 'c9_left'}, {'set': 'c9_left_by_shaft'}]},
    ],
    'talk': {
        'mother_term': {'dialogue': 'd_c9_mother', 'name': 'MOTHER'},
        'archive_door': {'dialogue': 'd_c9_archive', 'name': 'The Archive door'},
        'shaft_hatch': {'dialogue': 'd_c9_shaft', 'name': 'The pump-run hatch'},
        'stranger_cot': {'dialogue': 'd_c9_body', 'name': 'The stranger'},
        'great_door': {'dialogue': 'd_c9_great_door', 'name': 'The great door'},
    },
    'containers': {
        'locker_pc': {'name': 'Your Locker', 'items': [['c_bandage', 1], ['j_cloth', 2], ['c_algae', 2]]},
        'clinic_shelf': {'name': 'Clinic Shelf', 'items': [['c_bandage', 2], ['c_splint', 1], ['c_iodine', 1]]},
        'hall_crate': {'name': 'Drill Crate', 'items': [['j_scrap', 2], ['c_water', 1]]},
        'parts_shelf': {'name': 'Parts Shelf', 'items': [['j_wiring', 2], ['j_electronics', 1], ['t_repair', 1]], 'lock': 20},
        'hydro_crate': {'name': 'Seed Crate', 'items': [['c_algae', 3], ['j_electronics', 1]]},
        'kitchen_crate': {'name': 'Ration Crate', 'items': [['c_algae', 4], ['c_water', 2], ['c_jerky', 1]]},
        'armoury_locker': {'name': 'Armoury Locker', 'items': [['w_zip38', 1], ['a_38', 14]], 'lock': 40},
        'armoury_locker2': {'name': 'Armoury Locker', 'items': [['w_pipe', 1], ['c_knitkit', 1]], 'lock': 25},
        'shaft_crate': {'name': 'Pump Spares', 'items': [['j_electronics', 1], ['j_wiring', 3], ['t_picks', 1]], 'lock': 25},
    },
    'spots': {
        'clinic': {'x': 5, 'y': 15}, 'clinic_bed': {'x': 4, 'y': 17},
        'council': {'x': 18, 'y': 16}, 'council_shelf': {'x': 16, 'y': 13},
        'machine': {'x': 18, 'y': 3}, 'machine_bench': {'x': 20, 'y': 5},
        'hydro': {'x': 34, 'y': 4}, 'hydro_b': {'x': 40, 'y': 5}, 'hydro_c': {'x': 29, 'y': 5},
        'commons_a': {'x': 7, 'y': 26}, 'commons_b': {'x': 11, 'y': 26}, 'commons_c': {'x': 15, 'y': 26}, 'commons_d': {'x': 19, 'y': 28}, 'kitchen': {'x': 3, 'y': 25},
        'bunk_ines': {'x': 28, 'y': 14}, 'bunk_pell': {'x': 30, 'y': 14}, 'bunk_tamsin': {'x': 32, 'y': 17}, 'bunk_bram': {'x': 34, 'y': 14},
        'bunk_r1': {'x': 36, 'y': 17}, 'bunk_r2': {'x': 38, 'y': 14}, 'bunk_r3': {'x': 40, 'y': 17}, 'bunk_r4': {'x': 36, 'y': 14},
        'hall': {'x': 6, 'y': 4}, 'corridor_e': {'x': 25, 'y': 15}, 'shaft': {'x': 36, 'y': 27},
    },
    'npcs': [
        {'def': 'npc_c9_02', 'x': 5, 'y': 15, 'facing': 1},
        {'def': 'npc_c9_01', 'x': 18, 'y': 16, 'facing': 0},
        {'def': 'npc_c9_03', 'x': 34, 'y': 4, 'facing': 2},
        {'def': 'npc_c9_04', 'x': 18, 'y': 3, 'facing': 0},
        {'def': 'npc_c9_06', 'x': 7, 'y': 26, 'facing': 1},
        {'def': 'npc_c9_r1', 'x': 40, 'y': 5, 'facing': 2},
        {'def': 'npc_c9_r2', 'x': 11, 'y': 26, 'facing': 3},
        {'def': 'npc_c9_r3', 'x': 3, 'y': 25, 'facing': 2},
        {'def': 'npc_c9_r4', 'x': 25, 'y': 15, 'facing': 0},
    ],
    'triggers': [
        {'id': 'hall_first', 'x': 1, 'y': 1, 'w': 11, 'h': 7, 'text': 'The great door. Ninety years of paint and nobody has ever seen it open.', 'effects': [{'learn': 'seen_great_door'}]},
    ],
    'ambience': {'indoor': True, 'fogColor': 'hex:0x0c0c0a', 'fogDensity': 0.012, 'dust': 0.4, 'grade': 0.6, 'ambient': {'color': 'hex:0x9a9488', 'intensity': 0.85}, 'sound': 'hum'},
}

# ------------------------------------------------------------------------------------------------
# The Cistern mouth — a concrete portal in a rock cut; the pump-run hatch comes up by the windpump.
# ------------------------------------------------------------------------------------------------
W2, H2 = 30, 24
m = grid(W2, H2, '.')
# rock walls: the cut's sides and the bunker face along the south
for y in range(H2):
    for x in range(W2):
        if y >= 18 and not (8 <= x <= 12 and y == 18):
            m[y][x] = 'R' if y > 19 else 'C'
        if (x <= 2 or x >= 27) and y > 4:
            m[y][x] = 'R'
# the portal: concrete face with the door opening at x 9..11, y 18 (walkable concrete)
for x in range(8, 13):
    m[18][x] = 'c'
for x in range(3, 27):
    m[19][x] = 'C'
m[19][9] = 'c'; m[19][10] = 'c'; m[19][11] = 'c'
m[20][10] = 'c'  # the door tile itself (spawn stands just north of it)
# a dirt track north, salt crust patches
for y in range(0, 18):
    for x in range(11, 14):
        m[y][x] = ','
for (x, y) in [(5, 8), (6, 8), (5, 9), (20, 6), (21, 6), (21, 7), (22, 7), (17, 13), (18, 13)]:
    m[y][x] = 's'
# the pump housing on the east shelf (the shaft comes up here)
for y in range(12, 15):
    for x in range(21, 25):
        m[y][x] = 'c'

c9_mouth = {
    'id': 'c9_mouth', 'name': 'The Cistern Mouth', 'seed': 91, 'settlement': 'cistern9',
    'layout': rows(m),
    'legend': {
        '.': {'floor': 'sand'}, ',': {'floor': 'dirt'}, 's': {'floor': 'rubble'}, 'c': {'floor': 'concrete'},
        'R': {'wall': 'rock', 'floor': 'sand', 'wallHeight': 3.2},
        'C': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 3},
    },
    'props': [
        {'kind': 'vault_door', 'x': 10, 'y': 20, 'rot': 2, 'id': 'outer_door'},
        {'kind': 'sign', 'x': 7, 'y': 17}, {'kind': 'sandbags', 'x': 13, 'y': 17}, {'kind': 'barrel_rust', 'x': 14, 'y': 17},
        {'kind': 'machine', 'x': 22, 'y': 12}, {'kind': 'pipe_h', 'x': 23, 'y': 14}, {'kind': 'tank', 'x': 24, 'y': 12},
        {'kind': 'vault_door', 'x': 21, 'y': 14, 'rot': 1, 'id': 'hatch_outer'},
        {'kind': 'dead_tree', 'x': 5, 'y': 12}, {'kind': 'dead_tree', 'x': 25, 'y': 4}, {'kind': 'cactus', 'x': 7, 'y': 3}, {'kind': 'cactus', 'x': 18, 'y': 9},
        {'kind': 'rock', 'x': 4, 'y': 15}, {'kind': 'rock_small', 'x': 16, 'y': 4}, {'kind': 'rock_small', 'x': 24, 'y': 16}, {'kind': 'rock', 'x': 26, 'y': 8},
        {'kind': 'debris', 'x': 9, 'y': 10}, {'kind': 'car_wreck', 'x': 18, 'y': 2, 'rot': 1}, {'kind': 'tire_pile', 'x': 15, 'y': 15},
        {'kind': 'campfire', 'x': 6, 'y': 14},
    ],
    'lights': [],
    'spawns': [
        {'id': 'door', 'x': 10, 'y': 17, 'facing': 0},
        {'id': 'shaft', 'x': 22, 'y': 13, 'facing': 3},
        {'id': 'road', 'x': 12, 'y': 1, 'facing': 2},
        {'id': 'from_shale', 'x': 12, 'y': 2, 'facing': 2},
    ],
    'exits': [
        {'x': 11, 'y': 0, 'w': 3, 'h': 1, 'to': {'worldMap': True}, 'label': 'The track north'},
        {'x': 9, 'y': 19, 'w': 3, 'h': 1, 'to': {'location': 'cistern9', 'spawn': 'from_outside'}, 'label': 'Cistern 9', 'if': {'flag': 'c9_door_open'}},
        {'x': 21, 'y': 13, 'to': {'location': 'cistern9', 'spawn': 'from_shaft'}, 'label': 'The pump run', 'if': {'flag': 'c9_shaft_open'}},
    ],
    'triggers': [
        {'id': 'first_sky', 'x': 3, 'y': 5, 'w': 24, 'h': 13, 'text': 'No ceiling. The light is white and comes from everywhere, and the ground goes on until it stops being ground.', 'effects': [{'learn': 'seen_sky'}, {'xp': 25}]},
        {'id': 'track_north', 'x': 11, 'y': 1, 'w': 3, 'h': 2, 'text': 'Wheel ruts, old but used. Somebody comes this way — not often.', 'effects': [{'learn': 'track_ruts'}]},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0xd8c4a0', 'fogDensity': 0.02, 'dust': 0.9, 'grade': 0.7, 'sound': 'wind'},
}

HEADER = "import type { MapDef } from '../../engine/data/types';\n\n// Generated by tools/maps/gen_ch1.py — edit the generator, then re-run it.\n"
for name, data in (('cistern9', cistern9), ('c9_mouth', c9_mouth)):
    body = ts(data)
    out = f"{HEADER}export const {name}: MapDef = {body};\n"
    with open(os.path.join(ROOT, 'src', 'content', 'maps', f'{name}.ts'), 'w') as f:
        f.write(out)
    print(name, len(data['layout'][0]), 'x', len(data['layout']))
