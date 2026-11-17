#!/usr/bin/env python3
"""Generates src/content/maps/c9_mouth.ts: Knock, the hamlet on the slope above Cistern 9's sealed door (the opening,
owner's note 2026-10-29; design in story/STORY_PLAN_SECRET.md §18). The map keeps the old id (c9_mouth): the world
places it at Cistern 9 and every route and test that names the mouth still finds it.

The toll road comes down from the north past the toll stand; the lane winds south through some forty souls' houses
(Maud's post-house with its fire, Dace's shack, the goat pen, the wash lines, the hatch-day square) to the concrete apron
under the rock face where the Cistern's door has stood shut for ninety years, its drop-hatch and its speaking grille
beside it. West, through a gap in the rock: the Rib, a fallen relay mast in a rubble cut where wild dogs sleep. East, on
the rise: Corin's windpump and workshop; along the scrub below it, the snare line.
    python3 tools/maps/gen_knock.py
"""
import json, os, re

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
W, H = 56, 46

# Act 3 (B6f, Knock under the column): the conditions the Act 3 placements and triggers read, mirrored from
# src/content/world/a3_conds.ts (tests/b6f.test.ts checks each against the TS one on the fixture's states).
A3 = {'flag': 'a3_open'}
NOT_A3 = {'not': A3}
ORDER_READ = {'flag': 'a3_order_read'}
COLUMN_HERE = {'all': [A3, {'not': {'flag': 'a3_c9'}}]}
LOWE_DEAD = {'dead': 'npc_md_01'}
LIN_RAN = {'flag': 'kn_linnet_will_run'}
LIN_TO_SHALE = {'all': [{'flag': 'kn_linnet_to_shale'}, {'not': LIN_RAN}]}
LINNET_COLUMN = {'all': [LIN_RAN, {'not': {'flag': 'a3_linnet_down'}}]}
LINNET_DOGS = {'all': [LIN_TO_SHALE, {'flag': 'a3_ally_dogs'}]}
LINNET_KNOCK = {'any': [{'flag': 'a3_linnet_down'}, {'all': [{'not': LIN_RAN}, {'not': {'flag': 'kn_linnet_to_shale'}}]}]}
GUILD_IN_PLAY = {'any': [{'flag': 'ln_alliance', 'eq': 'guild'}, {'flag': 'hc_offer', 'eq': 'accepted'}, {'flag': 'hc_offer', 'eq': 'feigned'},
                         {'flag': 'rc_line', 'eq': 'guild'}, {'flag': 'nw_controllers', 'eq': 'guild'}]}
HOUNDS_IN_PLAY = {'all': [GUILD_IN_PLAY, {'any': [{'flag': 'nw_controllers', 'eq': 'guild'}, {'flag': 'ln_alliance', 'eq': 'guild'}, {'flag': 'an_reserve', 'eq': 'concern'}]}]}
GUILD_IN = {'flag': 'a3_guild_in'}
HOUNDS_IN = {'flag': 'a3_hounds_in'}
DACE_FREE = {'any': [{'flag': 'a3_dace', 'eq': 'square'}, {'flag': 'a3_dace', 'eq': 'quit'}]}
ORME_HERE = {'all': [{'not': {'dead': 'npc_kn_factor'}}, {'not': {'dead': 'npc_kn_factor_a3'}}]}
HALE_HERE = {'all': [{'not': {'dead': 'npc_kn_out_lead'}}, {'not': {'dead': 'npc_kn_out_lead_a3'}}, {'not': {'flag': 'a3_hale', 'eq': 'gone'}}, {'not': {'flag': 'a3_hale', 'eq': 'dead'}}]}
PETRA_DEAD = {'dead': 'npc_of_02'}
UNWRITTEN_HERE = {'all': [A3, {'hour': {'from': 21, 'to': 4}}, {'not': {'flag': 'a3_unwritten'}}]}


def ts(obj):
    s = json.dumps(obj, indent=2)
    s = re.sub(r'"([A-Za-z_][A-Za-z0-9_]*)":', r'\1:', s)
    s = re.sub(r'"hex:(0x[0-9a-fA-F]+)"', r'\1', s)
    return s


g = [['.'] * W for _ in range(H)]


def fill(x0, y0, x1, y1, ch):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            g[y][x] = ch


def building(x0, y0, x1, y1, wall, floor, doors):
    fill(x0, y0, x1, y1, wall)
    fill(x0 + 1, y0 + 1, x1 - 1, y1 - 1, floor)
    for (x, y) in doors:
        g[y][x] = floor


# the rim: rock west, east and south (the slope ends at the rock face); north is the road's open ground
fill(0, 0, 0, H - 1, 'R'); fill(W - 1, 0, W - 1, H - 1, 'R'); fill(0, H - 2, W - 1, H - 1, 'R')
fill(1, 0, 23, 0, 'R'); fill(32, 0, W - 2, 0, 'R')
# the Rib: a rubble cut behind a rock spur, one gap from the hamlet
fill(1, 1, 11, 13, 'r'); fill(12, 1, 12, 13, 'R'); fill(1, 14, 12, 14, 'R'); g[7][12] = 'r'; g[8][12] = 'r'
# the toll road and the lane
fill(24, 0, 31, 6, ','); fill(25, 7, 29, 36, ',')
fill(16, 20, 38, 25, 'r')                      # the hatch-day square (trodden rubble)
fill(14, 23, 24, 24, ',')                      # the path to Maud's door
# the apron under the rock face, the door in it
fill(18, 37, 38, 43, 'c'); fill(18, 43, 38, 43, 'C'); g[43][27] = 'c'; g[43][28] = 'c'
# the snare scrub and the rise
for (x0, y0, x1, y1) in [(48, 22, 53, 36), (40, 4, 46, 9)]:
    fill(x0, y0, x1, y1, 's')
# Maud's post-house: wood, the post room at the front, two cots behind a partition
building(6, 15, 16, 22, 'W', 'w', [(12, 22)])
fill(7, 18, 10, 18, 'W'); g[18][9] = 'w'
# the toll stand: scrap, a counter facing the road
building(33, 2, 40, 8, 'S', 'c', [(33, 5)])
# Corin's workshop on the rise
building(42, 12, 50, 19, 'S', 'c', [(46, 19)])
# Dace's shack
building(33, 27, 38, 32, 'A', 'c', [(35, 27)])
# households
for (x0, y0) in [(4, 28), (17, 30), (43, 27), (4, 36)]:
    building(x0, y0, x0 + 5, y0 + 5, 'A', 'c', [(x0 + 2, y0)])
# the goat pen
fill(11, 34, 18, 34, 'F'); fill(11, 40, 18, 40, 'F'); fill(11, 35, 11, 39, 'F'); fill(18, 35, 18, 39, 'F'); g[34][15] = '.'

rows = [''.join(r) for r in g]

props = [
    # the door, the hatch and the grille under the rock face
    {'kind': 'vault_door', 'x': 27, 'y': 43, 'rot': 0, 'id': 'great_door'},
    {'kind': 'terminal', 'x': 23, 'y': 42, 'rot': 0, 'id': 'hatch'}, {'kind': 'crate', 'x': 22, 'y': 41}, {'kind': 'crate', 'x': 24, 'y': 40, 'id': 'hatch_tray'},
    {'kind': 'machine', 'x': 32, 'y': 42, 'rot': 0, 'id': 'grille'},
    {'kind': 'lamp_post', 'x': 28, 'y': 39, 'id': 'watch_lamp'}, {'kind': 'chair', 'x': 29, 'y': 39, 'rot': 2, 'id': 'watch_stool'},
    {'kind': 'sign', 'x': 20, 'y': 38}, {'kind': 'barrel', 'x': 36, 'y': 41}, {'kind': 'barrel', 'x': 37, 'y': 41}, {'kind': 'tank', 'x': 35, 'y': 39},
    # the hatch-day square
    {'kind': 'table', 'x': 22, 'y': 22, 'id': 'trade_table'}, {'kind': 'table', 'x': 31, 'y': 22}, {'kind': 'crate', 'x': 33, 'y': 23}, {'kind': 'barrel', 'x': 17, 'y': 21},
    {'kind': 'fire_barrel', 'x': 36, 'y': 21}, {'kind': 'lamp_post', 'x': 19, 'y': 25}, {'kind': 'tank', 'x': 30, 'y': 20, 'id': 'knock_tank'},
    # Maud's post-house: the post shelf, the cots, the fire outside
    {'kind': 'shelf', 'x': 7, 'y': 16, 'rot': 1, 'id': 'post_shelf'}, {'kind': 'table', 'x': 12, 'y': 17, 'id': 'post_table'}, {'kind': 'chair', 'x': 13, 'y': 17, 'rot': 3},
    {'kind': 'stove', 'x': 15, 'y': 16}, {'kind': 'cot', 'x': 8, 'y': 20, 'id': 'pc_bed'}, {'kind': 'cot', 'x': 8, 'y': 21, 'id': 'linnet_cot'}, {'kind': 'bed', 'x': 15, 'y': 21, 'id': 'maud_bed'},
    {'kind': 'locker', 'x': 10, 'y': 21, 'id': 'pc_locker'},
    {'kind': 'campfire', 'x': 13, 'y': 25, 'id': 'maud_fire'}, {'kind': 'chair', 'x': 12, 'y': 26, 'rot': 0}, {'kind': 'chair', 'x': 14, 'y': 26, 'rot': 0},
    # the toll stand
    *[{'kind': 'counter', 'x': x, 'y': 5} for x in range(35, 39)], {'kind': 'shelf', 'x': 39, 'y': 3, 'rot': 3}, {'kind': 'crate', 'x': 38, 'y': 7, 'id': 'toll_box'},
    {'kind': 'sign', 'x': 32, 'y': 1, 'id': 'toll_sign'}, {'kind': 'lamp_post', 'x': 31, 'y': 7}, {'kind': 'car_wreck', 'x': 20, 'y': 3, 'rot': 1},
    # Corin's windpump and workshop
    {'kind': 'machine', 'x': 44, 'y': 7, 'id': 'windpump'}, {'kind': 'pipe_h', 'x': 45, 'y': 8}, {'kind': 'tank', 'x': 43, 'y': 9},
    {'kind': 'table', 'x': 45, 'y': 14, 'id': 'corin_bench'}, {'kind': 'shelf', 'x': 43, 'y': 13, 'rot': 1, 'id': 'corin_shelf'}, {'kind': 'locker', 'x': 49, 'y': 13, 'id': 'corin_locker'},
    {'kind': 'cot', 'x': 49, 'y': 17}, {'kind': 'machine', 'x': 48, 'y': 15},
    # the snare line
    {'kind': 'debris', 'x': 49, 'y': 24, 'id': 'snare_a'}, {'kind': 'debris', 'x': 52, 'y': 29, 'id': 'snare_b'}, {'kind': 'debris', 'x': 50, 'y': 34, 'id': 'snare_c'},
    # Dace's shack
    {'kind': 'cot', 'x': 37, 'y': 31}, {'kind': 'table', 'x': 35, 'y': 29}, {'kind': 'crate', 'x': 34, 'y': 31, 'id': 'dace_crate'},
    # the Rib: the fallen mast, its boxes, the dogs' bed
    {'kind': 'machine', 'x': 4, 'y': 4, 'id': 'mast_head'}, {'kind': 'pipe_h', 'x': 5, 'y': 5}, {'kind': 'pipe_h', 'x': 6, 'y': 6}, {'kind': 'pipe_h', 'x': 7, 'y': 7},
    {'kind': 'locker', 'x': 2, 'y': 2, 'id': 'rib_locker'}, {'kind': 'crate', 'x': 9, 'y': 3, 'id': 'rib_crate'}, {'kind': 'terminal', 'x': 3, 'y': 11, 'id': 'rib_box'},
    {'kind': 'debris', 'x': 8, 'y': 10}, {'kind': 'debris', 'x': 6, 'y': 2}, {'kind': 'tire_pile', 'x': 10, 'y': 11}, {'kind': 'rock', 'x': 2, 'y': 7},
    # households and the pen
    *[{'kind': 'bed', 'x': x0 + 1, 'y': y0 + 1} for (x0, y0) in [(4, 28), (17, 30), (43, 27), (4, 36)]],
    {'kind': 'crate', 'x': 8, 'y': 32, 'id': 'home_crate'}, {'kind': 'planter', 'x': 23, 'y': 28}, {'kind': 'planter', 'x': 24, 'y': 28},
    {'kind': 'barrel', 'x': 13, 'y': 36}, {'kind': 'planter', 'x': 16, 'y': 38},
    # scatter
    {'kind': 'dead_tree', 'x': 21, 'y': 9}, {'kind': 'dead_tree', 'x': 52, 'y': 5}, {'kind': 'cactus', 'x': 18, 'y': 12}, {'kind': 'cactus', 'x': 40, 'y': 24},
    {'kind': 'rock', 'x': 52, 'y': 40}, {'kind': 'rock_small', 'x': 40, 'y': 35}, {'kind': 'rock_small', 'x': 22, 'y': 16}, {'kind': 'debris', 'x': 31, 'y': 33},
    {'kind': 'barrel_rust', 'x': 31, 'y': 28}, {'kind': 'lamp_post', 'x': 24, 'y': 33}, {'kind': 'tire_pile', 'x': 39, 'y': 10},
]

# the hamlet lived in (QA play-ch1: the square read as bare ground): hatch day's stalls and goods on the square, the
# carts that brought them, water and gardens by the doors, the toll stand's sandbags; nothing on the lane or a doorway
DRESSING = [
    ('tent', 19, 21, 0), ('tent', 35, 22, 2), ('wagon', 38, 25, 1), ('blanket', 21, 21, 0), ('blanket', 23, 21, 1),
    ('crate', 32, 24, 0), ('crate', 17, 22, 0), ('barrel', 38, 21, 0), ('chair', 23, 22, 3), ('crate', 20, 20, 0),
    ('sandbags', 32, 9, 1), ('barrel', 32, 3, 0), ('wagon', 21, 6, 0),
    ('planter', 8, 27, 0), ('barrel', 9, 27, 0), ('planter', 21, 29, 0), ('planter', 47, 26, 0), ('barrel', 42, 26, 0),
    ('planter', 8, 35, 0), ('crate', 3, 35, 0), ('fire_barrel', 31, 30, 0), ('blanket', 12, 38, 0),
    ('rock_small', 46, 40, 0), ('cactus', 36, 13, 0), ('dead_tree', 8, 42, 0), ('rock_small', 42, 22, 0),
]
_taken = {(p_['x'], p_['y']) for p_ in props}
for (k, x, y, rot) in DRESSING:
    assert rows[y][x] in '.r', f'{k} at {x},{y} on {rows[y][x]!r}'
    assert (x, y) not in _taken, f'{k} at {x},{y} on another prop'
    _taken.add((x, y))
    props.append({'kind': k, 'x': x, 'y': y, 'rot': rot} if rot else {'kind': k, 'x': x, 'y': y})

# Act 3 (B6f): Knock under the column. The column camps on the flat west of the toll road, opposite the stand (its tents and
# its car are the runtime's to build: props have no conditions, so the camp is people, a trigger's description and the
# runtime's place build, B6 plan §9.5); the guild's party, when the guild is in play, on its own ground east of the stand;
# the Unwritten at the dark west end of the apron by night. Spots for later slices too: Tamsin in the door (B6j), the
# residents on the apron after an opened door (B6k).
A3_SPOTS = {
    'lowe_camp': {'x': 22, 'y': 5}, 'camp_tent_a': {'x': 16, 'y': 3}, 'camp_tent_b': {'x': 17, 'y': 6}, 'camp_tent_c': {'x': 15, 'y': 9},
    'ward_camp': {'x': 19, 'y': 4}, 'ward_stand': {'x': 31, 'y': 5}, 'ward_road': {'x': 24, 'y': 9}, 'ward_apron': {'x': 34, 'y': 40},
    'cadet_post': {'x': 21, 'y': 7}, 'linnet_hatch': {'x': 25, 'y': 39}, 'dace_boards': {'x': 17, 'y': 19},
    'guild_hale': {'x': 42, 'y': 2}, 'guild_hand_a': {'x': 45, 'y': 2}, 'guild_hand_b': {'x': 47, 'y': 3}, 'dace_guild': {'x': 43, 'y': 1},
    'corin_slope': {'x': 42, 'y': 9}, 'dogs_slope': {'x': 47, 'y': 33},
    'uw_lead': {'x': 19, 'y': 39}, 'uw_a': {'x': 18, 'y': 41}, 'uw_b': {'x': 20, 'y': 42},
    'tam_door': {'x': 27, 'y': 42}, 'apron_1': {'x': 25, 'y': 40}, 'apron_2': {'x': 30, 'y': 40}, 'apron_3': {'x': 26, 'y': 38}, 'apron_4': {'x': 31, 'y': 38},
}


def sched(*entries):
    return [{'from': a, 'to': b, 'spot': s, 'activity': act} for (a, b, s, act) in entries]


A3_NPCS = [
    # Knock's people in Act 3: Maud at the hatch she can't open, Linnet by her fate, Dace (the guild's guide if it came),
    # Corin on the slope (or down, if asked), Orme at her stand, Knock's others
    {'def': 'npc_kn_maud', 'id': 'npc_kn_maud_a3', 'x': 24, 'y': 39, 'facing': 0, 'dialogue': 'd_a3_maud',
     'schedule': sched((6, 12, 'maud_hatch', 'idle'), (12, 18, 'maud_post', 'work'), (18, 22, 'maud_fire', 'idle'), (22, 6, 'maud_bed', 'sleep')), 'if': A3},
    {'def': 'npc_kn_linnet', 'id': 'npc_kn_linnet_a3', 'x': 25, 'y': 39, 'facing': 0, 'dialogue': 'd_a3_linnet',
     'schedule': sched((6, 12, 'linnet_hatch', 'work'), (12, 18, 'linnet_square', 'work'), (18, 22, 'linnet_fire', 'idle'), (22, 6, 'linnet_cot', 'sleep')), 'if': {'all': [A3, LINNET_KNOCK]}},
    {'def': 'npc_kn_linnet', 'id': 'npc_kn_linnet_column', 'x': 21, 'y': 7, 'facing': 1, 'dialogue': 'd_a3_linnet',
     'schedule': sched((6, 22, 'cadet_post', 'work'), (22, 6, 'camp_tent_c', 'sleep')), 'if': {'all': [COLUMN_HERE, LINNET_COLUMN]}},
    {'def': 'npc_kn_linnet', 'id': 'npc_kn_linnet_dogs', 'x': 47, 'y': 33, 'facing': 3, 'dialogue': 'd_a3_linnet', 'schedule': [], 'if': {'all': [A3, LINNET_DOGS]}},
    {'def': 'npc_kn_dace', 'id': 'npc_kn_dace_a3', 'x': 17, 'y': 19, 'facing': 3, 'dialogue': 'd_a3_dace',
     'schedule': sched((7, 14, 'dace_boards', 'work'), (14, 19, 'dace_square', 'idle'), (19, 23, 'dace_shack', 'idle'), (23, 7, 'dace_shack', 'sleep')),
     'if': {'all': [A3, {'not': {'all': [GUILD_IN, {'not': DACE_FREE}]}}]}},
    {'def': 'npc_kn_dace', 'id': 'npc_kn_dace_guild', 'x': 43, 'y': 1, 'facing': 2, 'dialogue': 'd_a3_dace', 'schedule': [], 'if': {'all': [A3, GUILD_IN, {'not': DACE_FREE}]}},
    {'def': 'npc_kn_corin', 'id': 'npc_kn_corin_a3', 'x': 42, 'y': 9, 'facing': 3, 'dialogue': 'd_a3_corin',
     'schedule': sched((5, 21, 'corin_slope', 'work'), (21, 5, 'corin_bed', 'sleep')), 'if': {'all': [A3, {'not': {'flag': 'a3_corin', 'eq': 'down'}}]}},
    {'def': 'npc_kn_corin', 'id': 'npc_kn_corin_down', 'x': 45, 'y': 15, 'facing': 2, 'dialogue': 'd_a3_corin', 'if': {'all': [A3, {'flag': 'a3_corin', 'eq': 'down'}]}},
    {'def': 'npc_kn_factor', 'id': 'npc_kn_factor_a3', 'x': 36, 'y': 4, 'facing': 2, 'dialogue': 'd_a3_orme', 'if': {'all': [A3, ORME_HERE]}},
    {'def': 'npc_kn_r1', 'id': 'npc_kn_r1_a3', 'x': 14, 'y': 37, 'facing': 0, 'dialogue': 'd_a3_kn_r1', 'if': A3},
    {'def': 'npc_kn_r2', 'id': 'npc_kn_r2_a3', 'x': 24, 'y': 30, 'facing': 2, 'dialogue': 'd_a3_kn_r2', 'if': A3},
    {'def': 'npc_kn_r3', 'id': 'npc_kn_r3_a3', 'x': 20, 'y': 21, 'facing': 1, 'dialogue': 'd_a3_kn_r3', 'if': A3},
    {'def': 'npc_kn_r4', 'id': 'npc_kn_r4_a3', 'x': 45, 'y': 29, 'facing': 3, 'dialogue': 'd_a3_kn_r4', 'if': A3},
    # the column: Captain Lowe (or Sergeant Reyes if he is dead) and four wardens, until the door is settled
    {'def': 'npc_md_01', 'x': 22, 'y': 5, 'facing': 1, 'dialogue': 'd_a3_lowe', 'schedule': sched((6, 22, 'lowe_camp', 'work'), (22, 6, 'camp_tent_a', 'sleep')),
     'if': {'all': [COLUMN_HERE, {'not': LOWE_DEAD}]}},
    {'def': 'npc_md_12', 'x': 22, 'y': 5, 'facing': 1, 'dialogue': 'd_a3_lowe', 'schedule': sched((6, 22, 'lowe_camp', 'work'), (22, 6, 'camp_tent_a', 'sleep')),
     'if': {'all': [COLUMN_HERE, LOWE_DEAD, {'not': {'dead': 'npc_md_12'}}]}},
    {'def': 'npc_a3_g3', 'x': 19, 'y': 4, 'facing': 1, 'schedule': sched((6, 22, 'ward_camp', 'work'), (22, 6, 'camp_tent_b', 'sleep')), 'if': COLUMN_HERE},
    {'def': 'npc_a3_g4', 'x': 31, 'y': 5, 'facing': 3, 'schedule': sched((6, 22, 'ward_stand', 'work'), (22, 6, 'camp_tent_b', 'sleep')), 'if': COLUMN_HERE},
    {'def': 'npc_a3_g5', 'x': 24, 'y': 9, 'facing': 2, 'schedule': sched((6, 22, 'ward_road', 'patrol'), (22, 6, 'camp_tent_c', 'sleep')), 'if': COLUMN_HERE},
    {'def': 'npc_a3_g6', 'x': 34, 'y': 40, 'facing': 0, 'schedule': sched((6, 22, 'ward_apron', 'work'), (22, 6, 'camp_tent_a', 'sleep')), 'if': COLUMN_HERE},
    # the guild's party when the guild is in play: Hale if he lives, the handlers when it brought hounds (the hounds are the
    # runtime's stand-ins until a live hound exists)
    {'def': 'npc_kn_out_lead', 'id': 'npc_kn_out_lead_a3', 'x': 42, 'y': 2, 'facing': 2, 'dialogue': 'd_a3_hale', 'schedule': [], 'if': {'all': [A3, GUILD_IN, HALE_HERE]}},
    {'def': 'npc_a3_g11', 'x': 45, 'y': 2, 'facing': 2, 'schedule': [], 'if': {'all': [A3, HOUNDS_IN]}},
    {'def': 'npc_a3_g12', 'x': 47, 'y': 3, 'facing': 3, 'schedule': [], 'if': {'all': [A3, HOUNDS_IN]}},
    # the Unwritten by night: Petra, or the first of them if she is dead, and two more (B6g: what they came for)
    {'def': 'npc_of_02', 'x': 19, 'y': 39, 'facing': 1, 'dialogue': 'd_a3_petra', 'schedule': [], 'if': {'all': [UNWRITTEN_HERE, {'not': PETRA_DEAD}]}},
    {'def': 'npc_a3_u1', 'x': 19, 'y': 39, 'facing': 1, 'schedule': [], 'if': {'all': [UNWRITTEN_HERE, PETRA_DEAD]}},
    {'def': 'npc_a3_u2', 'x': 18, 'y': 41, 'facing': 1, 'schedule': [], 'if': UNWRITTEN_HERE},
    {'def': 'npc_a3_u3', 'x': 20, 'y': 42, 'facing': 1, 'schedule': [], 'if': UNWRITTEN_HERE},
]

# Act 3's triggers on the north half of the hamlet (the toll road in, the camp, the stand, the square): the guild and its
# hounds seen, then home (whatever brought the player: a ride's own scene, or their own feet; B6c's `a3_home` sees a player
# who never walks in), then the camp's description
NORTH = {'x': 1, 'y': 1, 'w': 54, 'h': 26}
A3_TRIGGERS = [
    {'id': 'a3_guild', **NORTH, 'if': {'all': [ORDER_READ, GUILD_IN_PLAY]}, 'effects': [{'set': 'a3_guild_in'}]},
    {'id': 'a3_hounds', **NORTH, 'if': {'all': [ORDER_READ, HOUNDS_IN_PLAY]}, 'effects': [{'set': 'a3_hounds_in'}]},
    {'id': 'a3_arrive', **NORTH, 'if': ORDER_READ,
     'effects': [{'set': 'a3_at_knock'}, {'set': 'a3_in_sallow'}, {'learn': 'loc_cistern9'}, {'event': 'dialogue', 'data': {'tree': 'd_a3_home', 'name': 'Knock'}}]},
    {'id': 'a3_camp', 'x': 13, 'y': 1, 'w': 11, 'h': 12, 'if': COLUMN_HERE,
     'text': 'The column\'s camp: grey tents in a row, pegged square to the wind; a table under a canvas fly with a lamp on it and the order under a stone; water barrels stencilled PRECINCT SUPPLY under a tarp, more than four wardens could drink in a month. Nobody is cleaning a rifle. That is the first thing you notice, and the thing you keep noticing.',
     'effects': [{'learn': 'a3_column_seen'}]},
]

knock = {
    'id': 'c9_mouth', 'name': 'Knock', 'seed': 91, 'settlement': 'cistern9',
    'layout': rows,
    'legend': {
        '.': {'floor': 'sand'}, ',': {'floor': 'dirt'}, 'r': {'floor': 'rubble'}, 's': {'floor': 'rubble'}, 'c': {'floor': 'concrete'}, 'w': {'floor': 'wood'},
        'R': {'wall': 'rock', 'floor': 'sand', 'wallHeight': 3.2},
        'C': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 3},
        'A': {'wall': 'adobe', 'floor': 'dirt', 'wallHeight': 2.5},
        'W': {'wall': 'wood', 'floor': 'wood', 'wallHeight': 2.7},
        'S': {'wall': 'scrap', 'floor': 'dirt', 'wallHeight': 2.4},
        'F': {'wall': 'fence', 'floor': 'dirt', 'wallHeight': 1.2},
    },
    'props': props,
    'lights': [
        {'x': 28, 'y': 39, 'height': 2.4, 'color': 'hex:0xffc890', 'intensity': 2.2, 'range': 8, 'flicker': 0.2},
        {'x': 13, 'y': 25, 'height': 0.8, 'color': 'hex:0xffb070', 'intensity': 2.5, 'range': 7, 'flicker': 0.35},
        {'x': 12, 'y': 18, 'height': 2.2, 'color': 'hex:0xffd8a0', 'intensity': 1.6, 'range': 6, 'flicker': 0.15},
        {'x': 31, 'y': 7, 'height': 2.4, 'color': 'hex:0xffe0b0', 'intensity': 1.8, 'range': 7},
        {'x': 45, 'y': 15, 'height': 2.2, 'color': 'hex:0xfff0d0', 'intensity': 1.6, 'range': 6},
        {'x': 36, 'y': 21, 'height': 1.0, 'color': 'hex:0xffa060', 'intensity': 1.8, 'range': 6, 'flicker': 0.3},
    ],
    'spawns': [
        {'id': 'home', 'x': 9, 'y': 20, 'facing': 1},
        {'id': 'door', 'x': 28, 'y': 40, 'facing': 0},
        {'id': 'road', 'x': 27, 'y': 2, 'facing': 2},
        {'id': 'from_shale', 'x': 27, 'y': 2, 'facing': 2},
        {'id': 'watch', 'x': 29, 'y': 40, 'facing': 0},
        {'id': 'fire', 'x': 13, 'y': 27, 'facing': 0},
        {'id': 'shaft', 'x': 22, 'y': 39, 'facing': 0},
    ],
    'exits': [
        {'x': 24, 'y': 0, 'w': 8, 'h': 1, 'to': {'worldMap': True}, 'label': 'The toll road', 'if': {'flag': 'kn_free_to_leave'}},
    ],
    'talk': {
        'hatch': {'dialogue': 'd_kn_hatch', 'name': 'The drop-hatch'},
        'grille': {'dialogue': 'd_kn_grille', 'name': 'The Grille'},
        'great_door': {'dialogue': 'd_kn_door', 'name': 'The Cistern door'},
        'windpump': {'dialogue': 'd_kn_windpump', 'name': 'The windpump'},
        'snare_a': {'dialogue': 'd_kn_snare', 'name': 'A snare'},
        'snare_b': {'dialogue': 'd_kn_snare', 'name': 'A snare'},
        'snare_c': {'dialogue': 'd_kn_snare', 'name': 'A snare'},
        'mast_head': {'dialogue': 'd_kn_mast', 'name': 'The mast head'},
        'post_table': {'dialogue': 'd_kn_postbook', 'name': 'The post-book'},
        'pc_bed': {'dialogue': 'd_kn_bed', 'name': 'Your cot'},
        'watch_stool': {'dialogue': 'd_kn_watch', 'name': 'The watch stool'},
        'toll_sign': {'dialogue': 'd_kn_tollsign', 'name': 'The toll board'},
    },
    'containers': {
        'post_shelf': {'name': 'Post Shelf', 'items': [['j_cloth', 1], ['c_bandage', 1]]},
        'pc_locker': {'name': 'Your Locker', 'items': [['c_water', 1], ['c_jerky', 1], ['j_cloth', 1]]},
        'hatch_tray': {'name': 'Hatch Tray', 'items': []},
        'toll_box': {'name': 'Toll Box', 'items': [['a_38', 6], ['c_tin', 1]], 'lock': 40},
        'corin_shelf': {'name': 'Corin\'s Shelf', 'items': [['j_wiring', 1], ['t_repair', 1], ['j_scrap', 2]], 'lock': 25},
        'corin_locker': {'name': 'Corin\'s Locker', 'items': [['a_308', 4], ['c_bandage', 1]], 'lock': 55},
        'dace_crate': {'name': 'Dace\'s Crate', 'items': [['j_scrap', 1], ['c_dirtywater', 1]], 'lock': 20},
        'rib_locker': {'name': 'Relay Locker', 'items': [['j_electronics', 1], ['j_wiring', 2]], 'lock': 20},
        'rib_crate': {'name': 'Relay Crate', 'items': [['j_scrap', 3], ['j_glass', 1], ['c_tin', 1]]},
        'rib_box': {'name': 'Relay Box', 'items': [['j_electronics', 2], ['j_fuel', 1]], 'lock': 35},
        'home_crate': {'name': 'Household Crate', 'items': [['c_dirtywater', 1], ['j_hide', 1]]},
    },
    'spots': {
        'maud_hatch': {'x': 24, 'y': 39}, 'maud_post': {'x': 12, 'y': 18}, 'maud_fire': {'x': 12, 'y': 26}, 'maud_bed': {'x': 14, 'y': 21}, 'maud_square': {'x': 22, 'y': 23},
        'linnet_cot': {'x': 9, 'y': 21}, 'linnet_square': {'x': 26, 'y': 21}, 'linnet_post': {'x': 34, 'y': 6}, 'linnet_fire': {'x': 14, 'y': 26},
        'dace_gate': {'x': 13, 'y': 8}, 'dace_shack': {'x': 36, 'y': 29}, 'dace_square': {'x': 33, 'y': 22}, 'dace_rib': {'x': 9, 'y': 8},
        'corin_pump': {'x': 44, 'y': 8}, 'corin_bench': {'x': 45, 'y': 15}, 'corin_bed': {'x': 48, 'y': 17}, 'corin_square': {'x': 37, 'y': 23},
        'factor_counter': {'x': 36, 'y': 4}, 'factor_road': {'x': 30, 'y': 4},
        'pen': {'x': 14, 'y': 37}, 'wash': {'x': 24, 'y': 30}, 'square_a': {'x': 20, 'y': 21}, 'square_b': {'x': 34, 'y': 24}, 'lane_n': {'x': 27, 'y': 12}, 'lane_s': {'x': 27, 'y': 34},
        'home_a': {'x': 6, 'y': 30}, 'home_b': {'x': 19, 'y': 32}, 'home_c': {'x': 45, 'y': 29}, 'home_d': {'x': 6, 'y': 38},
        'body': {'x': 27, 'y': 41}, 'out_lead': {'x': 27, 'y': 18}, 'out_a': {'x': 24, 'y': 17}, 'out_b': {'x': 30, 'y': 17},
    },
    'npcs': [
        # Maud and the household
        # (the night the stranger comes she comes down in her nightdress, by the door, until the player goes to bed)
        {'def': 'npc_kn_maud', 'x': 12, 'y': 18, 'facing': 2, 'if': {'not': {'all': [{'flag': 'kn_stranger_dead'}, {'not': {'flag': 'kn_outriders'}}]}}},
        {'def': 'npc_kn_maud', 'id': 'maud_night', 'x': 24, 'y': 38, 'facing': 0, 'schedule': [], 'if': {'all': [{'flag': 'kn_stranger_dead'}, {'not': {'flag': 'kn_outriders'}}]}},
        {'def': 'npc_kn_linnet', 'x': 9, 'y': 21, 'facing': 1, 'if': {'any': [{'not': {'flag': 'kn_linnet_away'}}, {'flag': 'kn_linnet_home'}]}},
        {'def': 'npc_kn_linnet', 'id': 'linnet_post', 'x': 34, 'y': 6, 'facing': 1, 'schedule': [], 'if': {'all': [{'flag': 'kn_linnet_away'}, {'not': {'flag': 'kn_linnet_home'}}]}},
        {'def': 'npc_kn_dace', 'x': 13, 'y': 8, 'facing': 3, 'if': {'not': {'all': [{'flag': 'kn_rib_open'}, {'not': {'flag': 'kn_rib_done'}}]}}},
        {'def': 'npc_kn_dace', 'id': 'dace_rib', 'x': 9, 'y': 8, 'facing': 3, 'schedule': [], 'if': {'all': [{'flag': 'kn_rib_open'}, {'not': {'flag': 'kn_rib_done'}}]}},
        {'def': 'npc_kn_corin', 'x': 44, 'y': 8, 'facing': 2},
        {'def': 'npc_kn_factor', 'x': 36, 'y': 4, 'facing': 2},
        {'def': 'npc_kn_buyer', 'x': 32, 'y': 6, 'facing': 3, 'if': {'all': [{'flag': 'kn_linnet_away'}, {'not': {'flag': 'kn_linnet_settled'}}]}},
        # Knock's people
        {'def': 'npc_kn_r1', 'x': 14, 'y': 37, 'facing': 0}, {'def': 'npc_kn_r2', 'x': 24, 'y': 30, 'facing': 2}, {'def': 'npc_kn_r3', 'x': 20, 'y': 21, 'facing': 1},
        {'def': 'npc_kn_r4', 'x': 45, 'y': 29, 'facing': 3},
        # the Rib's strippers, at the mast until they are dealt with
        {'def': 'npc_kn_rib_a', 'x': 6, 'y': 5, 'facing': 2, 'schedule': [], 'if': {'not': {'any': [{'flag': 'kn_rib_shared'}, {'flag': 'kn_rib_scared'}, {'flag': 'kn_rib_done'}]}}},
        {'def': 'npc_kn_rib_b', 'x': 4, 'y': 6, 'facing': 1, 'schedule': [], 'if': {'not': {'any': [{'flag': 'kn_rib_shared'}, {'flag': 'kn_rib_scared'}, {'flag': 'kn_rib_done'}]}}},
        # the night: the stranger at the door
        {'def': 'npc_kn_stranger', 'x': 27, 'y': 41, 'facing': 0, 'if': {'all': [{'flag': 'kn_night'}, {'not': {'flag': 'kn_stranger_dead'}}]}},
        # day two: the outriders in the square
        {'def': 'npc_kn_out_lead', 'x': 27, 'y': 18, 'facing': 2, 'if': {'all': [{'flag': 'kn_outriders'}, {'not': {'flag': 'kn_outriders_gone'}}]}},
        {'def': 'npc_kn_out_a', 'x': 24, 'y': 17, 'facing': 2, 'if': {'all': [{'flag': 'kn_outriders'}, {'not': {'flag': 'kn_outriders_gone'}}]}},
        {'def': 'npc_kn_out_b', 'x': 30, 'y': 17, 'facing': 2, 'if': {'all': [{'flag': 'kn_outriders'}, {'not': {'flag': 'kn_outriders_gone'}}]}},
    ],
    'triggers': [
        {'id': 'rib_mouth', 'x': 11, 'y': 6, 'w': 2, 'h': 4, 'text': 'The Rib. The mast came down before you were born and took the cut with it. Somebody is in there: the scrape of a bar on steel, a woman laughing.', 'effects': [{'learn': 'kn_rib_rusks'}]},
        {'id': 'rib_rusks', 'x': 3, 'y': 3, 'w': 8, 'h': 8, 'once': True, 'if': {'all': [{'flag': 'kn_rib_open'}, {'not': {'any': [{'flag': 'kn_rib_clear'}, {'flag': 'kn_rib_fight'}, {'flag': 'kn_rib_done'}]}}]}, 'effects': [{'event': 'talk', 'data': {'npc': 'npc_kn_rib_a'}}]},
        {'id': 'road_leave', 'x': 24, 'y': 0, 'w': 8, 'h': 2, 'if': {'all': [{'flag': 'kn_free_to_leave'}, {'not': {'flag': 'c9_left'}}]}, 'text': 'You walk up past the stand. You look back once, at the black frame of the post-house and the door in the rock, and then you don\'t.', 'effects': [{'set': 'c9_left'}]},
        {'id': 'apron', 'x': 18, 'y': 37, 'w': 21, 'h': 3, 'text': 'The door is the colour of the rock and as old. Nobody in Knock has ever seen it move. Beside it, the hatch and the Grille, the only two mouths it has.', 'effects': [{'learn': 'kn_seen_door'}]},
        {'id': 'road_top', 'x': 24, 'y': 1, 'w': 8, 'h': 2, 'text': 'The toll road. North to Shale in a day, if your water holds. Nobody from Knock walks it without a reason.', 'effects': [{'learn': 'kn_road'}], 'if': {'not': {'flag': 'kn_free_to_leave'}}},
        {'id': 'stranger_seen', 'x': 22, 'y': 36, 'w': 13, 'h': 7, 'once': True, 'if': {'all': [{'flag': 'kn_night'}, {'not': {'flag': 'kn_stranger_dead'}}]}, 'effects': [{'event': 'talk', 'data': {'npc': 'npc_kn_stranger'}}]},
        {'id': 'outriders_seen', 'x': 18, 'y': 12, 'w': 20, 'h': 14, 'once': True, 'if': {'all': [{'flag': 'kn_outriders'}, {'not': {'flag': 'kn_outriders_met'}}]}, 'effects': [{'event': 'talk', 'data': {'npc': 'npc_kn_out_lead'}}]},
    ],
    'extras': [
        {'count': 5, 'roles': ['settler', 'settler', 'labourer', 'drifter'], 'life': 'hard', 'area': {'x': 17, 'y': 19, 'w': 20, 'h': 8}, 'hours': {'from': 7, 'to': 18}, 'barks': ['Wool for water. Same as my mother did, and hers.', 'MOTHER says thank you. MOTHER always says thank you.', 'Get your goats off the apron, Afua!']},
        {'count': 2, 'roles': ['settler'], 'ages': [8, 13], 'area': {'x': 12, 'y': 26, 'w': 16, 'h': 10}, 'hours': {'from': 8, 'to': 18}, 'barks': ['I put my ear to the door. It hums.', 'Linnet says she\'s going to the city.', 'Race you to the tank!']},
    ],
    'ambience': {'indoor': False, 'fogColor': 'hex:0xcdb48c', 'fogDensity': 0.012, 'dust': 0.6, 'grade': 0.75, 'mood': 'peaceful', 'sound': 'wind'},
}

# Act 3 (B6f): the opening's placements step aside once Act 3 is open, and their Act 3 selves take their places; the Grille
# opens its lockdown scenes (d_a3_grille carries the opening's Grille whole, so nothing before Act 3 changes)
for p_ in knock['npcs']:
    p_['if'] = {'all': [p_['if'], NOT_A3]} if 'if' in p_ else NOT_A3
knock['npcs'] += A3_NPCS
knock['triggers'] += A3_TRIGGERS
knock['spots'].update(A3_SPOTS)
knock['talk']['grille'] = {'dialogue': 'd_a3_grille', 'name': 'The Grille'}
for sid, sp in A3_SPOTS.items():
    assert rows[sp['y']][sp['x']] in '.,rsc', f'spot {sid} at {sp} on {rows[sp["y"]][sp["x"]]!r}'
    assert (sp['x'], sp['y']) not in _taken, f'spot {sid} at {sp} on a prop'

HEADER ="import type { MapDef } from '../../engine/data/types';\n\n// Generated by tools/maps/gen_knock.py — edit the generator, then re-run it.\n"
with open(os.path.join(ROOT, 'src', 'content', 'maps', 'c9_mouth.ts'), 'w') as f:
    f.write(f"{HEADER}export const c9_mouth: MapDef = {ts(knock)};\n")
print('knock', W, 'x', H)
