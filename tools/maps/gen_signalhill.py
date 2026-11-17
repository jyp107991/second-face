#!/usr/bin/env python3
"""Generates src/content/maps/signalhill.ts — Signal Hill: a dead relay station on a hill north of the highway, a
mast that still blinks, a track that climbs through rock terraces past a scavengers' camp, and a gully round it.
    python3 tools/maps/gen_signalhill.py
"""
import json, os, re

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
W, H = 48, 56


def ts(obj):
    s = json.dumps(obj, indent=2)
    s = re.sub(r'"([A-Za-z_][A-Za-z0-9_]*)":', r'\1:', s)
    s = re.sub(r'"hex:(0x[0-9a-fA-F]+)"', r'\1', s)
    return s


g = [['R'] * W for _ in range(H)]

# Act 3 (B6d, Every Dead Radio): the act open, and who keeps the mast once it is raised
A3 = {'flag': 'a3_open'}
GONE = {'flag': 'a3_hollow_gone'}


def KEPT(keeper):
    return {'all': [{'flag': 'a3_mast', 'eq': 'raised'}, {'flag': 'a3_mast_keeper', 'eq': keeper}]}


def ALIVE(npc):
    # dead in any of their placements on this hill (Act 1, Act 3, at the mast)
    return [{'not': {'dead': f'signalhill/{npc}'}}, {'not': {'dead': f'{npc}_a3'}}, {'not': {'dead': f'{npc}_mast'}}]


def fill(x0, y0, x1, y1, ch):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            g[y][x] = ch


def building(x0, y0, x1, y1, wall, floor, doors):
    fill(x0, y0, x1, y1, wall)
    fill(x0 + 1, y0 + 1, x1 - 1, y1 - 1, floor)
    for (x, y) in doors:
        g[y][x] = floor


# The foot of the hill: a flat of sand where the track leaves the highway.
fill(14, 46, 34, 54, '.')
fill(21, 55, 27, 55, ',')                  # the way back down to the highway (exit)
# First climb: a track bending east, then a terrace.
fill(22, 40, 26, 46, 'r')
fill(26, 38, 36, 41, 'r')
fill(30, 30, 36, 38, 'r')
# The middle terrace: the scavengers' camp.
fill(12, 26, 34, 32, ',')
fill(14, 27, 30, 31, 's')
# Second climb: a track up the west side to the top.
fill(12, 18, 16, 26, 'r')
fill(12, 14, 24, 18, 'r')
# The top: the plateau with the station and the mast.
fill(8, 3, 40, 14, '.')
fill(10, 4, 38, 13, 's')
# The gully: a crack up the far west side that bypasses the camp.
fill(4, 20, 6, 45, 'r')
fill(4, 45, 20, 47, 'r')                   # joins the foot
fill(4, 17, 8, 20, 'r')                    # joins the second climb at its top
fill(8, 14, 12, 17, 'r')
# The station: concrete, door south. The mast beside it: one tall column.
building(19, 5, 31, 12, 'C', 'c', [(25, 12)])
g[7][35] = 'M'
rows = [''.join(r) for r in g]

props = [
    # the foot
    {'kind': 'sign', 'x': 20, 'y': 52, 'rot': 1}, {'kind': 'car_wreck', 'x': 30, 'y': 50, 'rot': 2}, {'kind': 'rock', 'x': 16, 'y': 48}, {'kind': 'dead_tree', 'x': 32, 'y': 47},
    {'kind': 'debris', 'x': 24, 'y': 44}, {'kind': 'rock_small', 'x': 24, 'y': 42},
    # the camp
    {'kind': 'tent', 'x': 16, 'y': 28, 'rot': 1}, {'kind': 'tent', 'x': 16, 'y': 31, 'rot': 1}, {'kind': 'campfire', 'x': 21, 'y': 29},
    {'kind': 'crate', 'x': 26, 'y': 28, 'id': 'hollow_crate'}, {'kind': 'tire_pile', 'x': 28, 'y': 31}, {'kind': 'debris', 'x': 24, 'y': 31}, {'kind': 'barrel_rust', 'x': 27, 'y': 29},
    {'kind': 'pipe_h', 'x': 19, 'y': 31}, {'kind': 'pipe_h', 'x': 22, 'y': 31},
    # the second climb
    {'kind': 'rock_small', 'x': 14, 'y': 22}, {'kind': 'debris', 'x': 18, 'y': 16},
    # the gully
    {'kind': 'rock_small', 'x': 5, 'y': 38}, {'kind': 'debris', 'x': 5, 'y': 27}, {'kind': 'rock_small', 'x': 6, 'y': 22},
    # the mast's crown, let down the crack by the city long ago (B6d: the top section the Act 3 mast needs)
    {'kind': 'debris', 'x': 5, 'y': 32, 'id': 'mast_crown'},
    # the top
    {'kind': 'sandbags', 'x': 23, 'y': 13}, {'kind': 'sandbags', 'x': 27, 'y': 13}, {'kind': 'barrel_rust', 'x': 33, 'y': 10}, {'kind': 'barrel_rust', 'x': 34, 'y': 11},
    {'kind': 'pipe_h', 'x': 33, 'y': 6}, {'kind': 'pipe_h', 'x': 36, 'y': 9}, {'kind': 'machine', 'x': 37, 'y': 6, 'rot': 3, 'id': 'mast_base'}, {'kind': 'debris', 'x': 12, 'y': 8}, {'kind': 'rock', 'x': 11, 'y': 12},
    {'kind': 'dead_tree', 'x': 14, 'y': 5}, {'kind': 'lamp_post', 'x': 17, 'y': 11},
    # inside the station: the relay rack, the terminal, the speaker, a cot someone used
    {'kind': 'machine', 'x': 20, 'y': 6, 'rot': 1, 'id': 'relay_rack'}, {'kind': 'machine', 'x': 20, 'y': 8, 'rot': 1}, {'kind': 'terminal', 'x': 23, 'y': 6, 'rot': 2, 'id': 'relay_term'},
    {'kind': 'machine', 'x': 29, 'y': 6, 'rot': 3, 'id': 'speaker'}, {'kind': 'shelf', 'x': 30, 'y': 9, 'rot': 3}, {'kind': 'cot', 'x': 22, 'y': 10, 'rot': 0, 'id': 'station_cot'},
    {'kind': 'table', 'x': 26, 'y': 9}, {'kind': 'chair', 'x': 27, 'y': 9, 'rot': 3}, {'kind': 'locker', 'x': 30, 'y': 11, 'id': 'station_locker'}, {'kind': 'debris', 'x': 24, 'y': 10},
]

signalhill = {
    'id': 'signalhill', 'name': 'Signal Hill', 'seed': 41,
    'layout': rows,
    'legend': {
        '.': {'floor': 'sand'}, ',': {'floor': 'dirt'}, 'r': {'floor': 'rubble'}, 's': {'floor': 'rubble'}, 'c': {'floor': 'concrete'},
        'R': {'wall': 'rock', 'floor': 'sand', 'wallHeight': 3.2},
        'C': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 2.8},
        'M': {'wall': 'scrap', 'floor': 'rubble', 'wallHeight': 9},
    },
    'props': props,
    'lights': [
        {'x': 35, 'y': 7, 'height': 9.2, 'color': 'hex:0xff3a2a', 'intensity': 4, 'range': 14, 'flicker': 0.6},
        {'x': 21, 'y': 29, 'height': 0.6, 'color': 'hex:0xff9a40', 'intensity': 2.2, 'range': 6, 'flicker': 0.35},
        {'x': 25, 'y': 8, 'height': 2.4, 'color': 'hex:0x9ab8c0', 'intensity': 1.4, 'range': 6, 'flicker': 0.2},
        {'x': 17, 'y': 11, 'height': 3.0, 'color': 'hex:0xffd8a0', 'intensity': 1.2, 'range': 6, 'flicker': 0.1},
    ],
    'spawns': [
        {'id': 'start', 'x': 24, 'y': 53, 'facing': 0}, {'id': 'from_tollhouse', 'x': 24, 'y': 54, 'facing': 0},
        {'id': 'top', 'x': 25, 'y': 14, 'facing': 0},
    ],
    'exits': [
        {'x': 21, 'y': 55, 'w': 7, 'h': 1, 'to': {'worldMap': True}, 'label': 'Down to the highway'},
    ],
    'talk': {
        'relay_term': {'dialogue': 'd_sg_relay', 'name': 'The relay'},
        'speaker': {'dialogue': 'd_a3_station', 'name': 'The speaker'},
        'mast_base': {'dialogue': 'd_a3_mast', 'name': 'The mast'},
        'mast_crown': {'dialogue': 'd_a3_aerial', 'name': 'Old lattice'},
        'station_cot': {'dialogue': 'd_sg_cot', 'name': 'The cot'},
    },
    'containers': {
        'hollow_crate': {'name': 'Scavengers\' Crate', 'items': [['j_wiring', 4], ['j_scrap', 3], ['c_dirtywater', 2]], 'lock': 25},
        'station_locker': {'name': 'Station Locker', 'items': [['j_electronics', 2], ['t_lamp', 1], ['c_tin', 1]], 'lock': 35},
    },
    'spots': {
        'camp_fire': {'x': 20, 'y': 30}, 'camp_watch': {'x': 31, 'y': 33}, 'camp_pipes': {'x': 20, 'y': 32}, 'camp_tent_a': {'x': 17, 'y': 28}, 'camp_tent_b': {'x': 17, 'y': 31},
        # Act 3: the keepers' places once the mast is raised
        'hill_watch': {'x': 20, 'y': 15}, 'mast_feed': {'x': 36, 'y': 7}, 'station_bed': {'x': 23, 'y': 10},
    },
    'npcs': [
        {'def': 'npc_sg_01', 'x': 22, 'y': 30, 'facing': 2, 'if': {'all': [{'not': {'dead': 'signalhill/npc_sg_01'}}, {'not': A3}]}},
        {'def': 'npc_sg_02', 'x': 31, 'y': 33, 'facing': 2, 'if': {'all': [{'not': {'dead': 'signalhill/npc_sg_02'}}, {'not': A3}]}},
        {'def': 'npc_sg_03', 'x': 19, 'y': 32, 'facing': 1, 'if': {'all': [{'not': {'dead': 'signalhill/npc_sg_03'}}, {'not': A3}]}},
        # Act 3 (B6d): the Hollow with Tally's Act 3 tree; once the mast is theirs Brick watches the track and Thanh sits at the
        # switch (outside: he does not go in the station); the hill given to Knock, they walk west; given to the Wheel, Sefa's
        # son keeps the station from the day after
        {'def': 'npc_sg_01', 'id': 'npc_sg_01_a3', 'x': 22, 'y': 30, 'facing': 2, 'dialogue': 'd_a3_hollow', 'if': {'all': [A3, *ALIVE('npc_sg_01'), {'not': GONE}]}},
        {'def': 'npc_sg_02', 'id': 'npc_sg_02_a3', 'x': 31, 'y': 33, 'facing': 2, 'if': {'all': [A3, *ALIVE('npc_sg_02'), {'not': GONE}, {'not': KEPT('hollow')}]}},
        {'def': 'npc_sg_03', 'id': 'npc_sg_03_a3', 'x': 19, 'y': 32, 'facing': 1, 'if': {'all': [A3, *ALIVE('npc_sg_03'), {'not': GONE}, {'not': KEPT('hollow')}]}},
        {'def': 'npc_sg_02', 'id': 'npc_sg_02_mast', 'x': 20, 'y': 15, 'facing': 2, 'schedule': [{'from': 6, 'to': 22, 'spot': 'hill_watch', 'activity': 'patrol'}, {'from': 22, 'to': 6, 'spot': 'camp_tent_b', 'activity': 'sleep'}],
         'if': {'all': [KEPT('hollow'), *ALIVE('npc_sg_02'), {'not': GONE}]}},
        {'def': 'npc_sg_03', 'id': 'npc_sg_03_mast', 'x': 36, 'y': 7, 'facing': 2, 'schedule': [{'from': 7, 'to': 22, 'spot': 'mast_feed', 'activity': 'work'}, {'from': 22, 'to': 7, 'spot': 'camp_tent_b', 'activity': 'sleep'}],
         'if': {'all': [KEPT('hollow'), *ALIVE('npc_sg_03'), {'not': GONE}]}},
        {'def': 'npc_wh_02', 'id': 'npc_wh_02_sg', 'x': 36, 'y': 7, 'facing': 2, 'dialogue': 'd_a3_keeper', 'schedule': [{'from': 6, 'to': 21, 'spot': 'mast_feed', 'activity': 'idle'}, {'from': 21, 'to': 6, 'spot': 'station_bed', 'activity': 'sleep'}],
         'if': {'all': [KEPT('wheel'), {'flag': 'a3_wheel_up'}, {'not': {'dead': 'npc_wh_02'}}, {'not': {'dead': 'npc_wh_02_sg'}}]}},
    ],
    'triggers': [
        {'id': 'arrive', 'x': 14, 'y': 48, 'w': 21, 'h': 7, 'text': 'Signal Hill. A mast on the skyline with a red light that still blinks, slow as a pulse, and a track that goes up to it in switchbacks cut by somebody who meant them to last.', 'effects': [{'learn': 'seen_signalhill'}]},
        {'id': 'camp', 'x': 30, 'y': 34, 'w': 7, 'h': 4, 'once': False, 'if': {'not': {'flag': 'sg_camp_passed'}}, 'effects': [{'event': 'dialogue', 'data': {'tree': 'd_sg_camp', 'name': 'The camp'}}]},
        {'id': 'gully', 'x': 4, 'y': 42, 'w': 3, 'h': 4, 'once': False, 'if': {'not': {'flag': 'sg_camp_passed'}}, 'effects': [{'event': 'dialogue', 'data': {'tree': 'd_sg_gully', 'name': 'The gully'}}]},
        {'id': 'a3_arrive', 'x': 14, 'y': 48, 'w': 21, 'h': 7, 'if': A3, 'text': 'Signal Hill again. The red lamp on the skyline still blinks, slow as a pulse, and on the wind from the top, very faint, a voice is reading something.', 'effects': [{'quest': 'q_a3_mast', 'start': True}]},
        {'id': 'top', 'x': 8, 'y': 3, 'w': 33, 'h': 12, 'text': 'The top of Signal Hill. The Sallow lies under you like a map of itself: the highway, the salt pans, a line of dead windpumps to the south-east, and far west a grey smear that is Shale.', 'effects': [{'set': 'sg_station'}, {'learn': 'loc_lm_sallow_02'}, {'learn': 'loc_drywells'}, {'lead': 'l_windpumps'}]},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0xb0a090', 'fogDensity': 0.016, 'dust': 0.5, 'grade': 0.7, 'mood': 'haze', 'sound': 'wind'},
}

HEADER = "import type { MapDef } from '../../engine/data/types';\n\n// Generated by tools/maps/gen_signalhill.py — edit the generator, then re-run it.\n"
with open(os.path.join(ROOT, 'src', 'content', 'maps', 'signalhill.ts'), 'w') as f:
    f.write(f"{HEADER}export const signalhill: MapDef = {ts(signalhill)};\n")
print('signalhill', W, 'x', H)
