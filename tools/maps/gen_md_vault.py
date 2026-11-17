#!/usr/bin/env python3
"""Generates src/content/maps/md_vault.ts — the Vault of Accounts under the Archive Spire's foot (Act 3, B6q): the city's
forecasting core, air-gapped by Meridian's founders and fed ninety years by couriers and sealed drops.

  the stair      forty-odd concrete steps down from the steel door in the Spire's foot (md_spire's `ar_vault`), cut through
                 rock; the way back up is its top
  the drop room  where the couriers' drop comes down the Spire's spine into a brass hopper, the trays the paper falls into,
                 and the shaft's iron rungs going up to the couriers' slot at the Spire's foot
  the hall       racks of grey cabinets in two banks either side of one aisle, humming one note: the core; a cable trench
                 along the north wall to the trunk, which comes out of the rock with its two couplings
  the desk       an oak reading desk on a wooden dais at the hall's east end, under one lamp: the chair's desk, the pen, the
                 teleprinter and its relay key

Spots: `door` (the stair's foot of the steel door), `drop`, `core` (the aisle among the racks), `desk`. Nobody is placed here
but the Spire's stair wardens, and only when the player draws on them after the core is brought down (B6r): the Ledger is a voice. The vault is a cell entered instantly from the close (world/sites.ts). The map is checked for walkability
and for reachability from every spawn, as gen_hc_halcyon.py checks its cells.
    python3 tools/maps/gen_md_vault.py
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


def check(name, rows, legend, props, spawns, npcs, spots, exits):
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
    for e in exits:
        tiles = [(x, y) for y in range(e['y'], e['y'] + e.get('h', 1)) for x in range(e['x'], e['x'] + e.get('w', 1))]
        if not any(t in seen for t in tiles): errs.append(f"exit at {e['x']},{e['y']} cannot be reached")
    if errs:
        print(name, 'FAILED:\n  ' + '\n  '.join(errs))
        sys.exit(1)


def grid(W, H, ch):
    return [[ch] * W for _ in range(H)]


def fill(g, x0, y0, x1, y1, ch):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            g[y][x] = ch


def lamp(x, y, h=3.0, c='0xf4f8ff', i=2.0, r=10, f=None):
    d = {'x': x, 'y': y, 'height': h, 'color': f'hex:{c}', 'intensity': i, 'range': r}
    if f: d['flicker'] = f
    return d


def P(kind, x, y, rot=None, id=None):
    d = {'kind': kind, 'x': x, 'y': y}
    if rot is not None: d['rot'] = rot
    if id: d['id'] = id
    return d


# Mirrors src/content/world/a3_conds.ts: AT_VAULT = the steps done (a3_pnr ∧ a3_sash); the choice made sets a3_end.
def F(flag, eq=None):
    return {'flag': flag} if eq is None else {'flag': flag, 'eq': eq}
def ALL(*c):
    return {'all': list(c)}
def NOT(c):
    return {'not': c}
def ANY(*c):
    return {'any': list(c)}
AT_VAULT = ALL(F('a3_pnr'), F('a3_sash'))

W, H = 48, 32
g = grid(W, H, '#')
fill(g, 2, 0, 6, 12, 'X')          # the rock the stair is cut through
fill(g, 3, 1, 5, 12, 's')          # the stair down from the steel door
fill(g, 1, 13, 12, 20, 'v')        # the drop room
fill(g, 1, 15, 1, 17, 'g')         # the drop's foot: a grate over the shaft's sump
fill(g, 13, 15, 14, 16, 'v')       # the doorway into the hall (no door: nothing down here was ever meant to be shut out)
fill(g, 15, 2, 46, 29, 'm')        # the hall of racks
fill(g, 15, 2, 46, 2, 'g')         # the cable trench along the north wall, to the trunk
fill(g, 15, 15, 37, 16, 'g')       # the aisle's floor plates, worn bright down the middle
fill(g, 38, 11, 46, 20, 'd')       # the desk's dais, oak boards
rows = [''.join(r) for r in g]

props = [
    # the stair: a handrail's posts, a lamp cage at the turn
    P('fence_post', 3, 4), P('fence_post', 3, 8),
    # the drop room: the hopper under the shaft, the trays, the sorting tables nobody sits at, the shaft's plate
    P('machine', 1, 16, 1, 'a3_vault_drop'), P('shelf', 1, 13, 1), P('shelf', 1, 19, 1), P('shelf', 12, 13, 3), P('shelf', 12, 19, 3),
    P('table', 5, 17), P('table', 8, 17), P('crate', 10, 20), P('sign', 2, 14, 1, 'a3_vault_shaft'),
]
# the core: two banks of racks either side of the aisle, the cabinets in rows north to south with walks between them
for x in range(18, 35, 3):
    for y in (4, 6, 8, 10, 12):
        props.append(P('machine', x, y, 0))
    for y in (19, 21, 23, 25, 27):
        props.append(P('machine', x, y, 2))
props[props.index(P('machine', 27, 12, 0))] = P('machine', 27, 12, 0, 'a3_vault_core')
props += [
    # the trunk out of the rock at the north-east, its run along the trench, its two couplings
    P('pipe_h', 39, 3), P('pipe_h', 40, 3), P('pipe_h', 41, 3), P('pipe_h', 42, 3), P('machine', 44, 3, 3, 'a3_vault_trunk'),
    # the desk: oak, the chair behind it facing the racks, the teleprinter and its relay key, a lamp
    P('table', 42, 15, 0, 'a3_vault_desk'), P('chair', 43, 15, 3), P('terminal', 42, 13, 3, 'a3_vault_relay'), P('shelf', 46, 12, 3), P('shelf', 46, 18, 3),
    P('lamp_post', 44, 17),
]

spawns = [{'id': 'start', 'x': 4, 'y': 2, 'facing': 2}, {'id': 'door', 'x': 4, 'y': 2, 'facing': 2}]
spots = {'door': {'x': 4, 'y': 3}, 'drop': {'x': 2, 'y': 16}, 'core': {'x': 27, 'y': 15}, 'desk': {'x': 41, 'y': 15}}
exits = [
    # the stair's top: back up through the steel door to the close (md_spire spawn `from_vault`, beside the door)
    {'x': 3, 'y': 1, 'w': 3, 'h': 1, 'to': {'location': 'md_spire', 'spawn': 'from_vault'}, 'label': 'Up the stair, to the steel door'},
]
# Act 3 (B6r): the Spire's stair wardens, placed only once the player has drawn on them after the core is brought down (their clause:
# the stair, then the pumps), until the climax settles how the player got out. Mirrors a3_conds.ts (B6r block: VAULT_WARDENS,
# VAULT_FIGHTING, VAULT_WARDENS_DOWN); tests/b6r.test.ts checks the mirror.
VAULT_FIGHTING = ALL(F('a3_vault_fight'), NOT(F('a3_vault_out')))
VAULT_WARDENS = [('npc_a3_g19', 4, 12, 2), ('npc_a3_g20', 4, 14, 0), ('npc_a3_g21', 6, 13, 3), ('npc_a3_g22', 8, 14, 3)]
npcs = [{'def': d, 'x': x, 'y': y, 'facing': f, 'schedule': [], 'if': VAULT_FIGHTING} for d, x, y, f in VAULT_WARDENS]

md_vault = {
    'id': 'md_vault', 'name': 'Meridian — Archive Spire, Hall of Accounts', 'seed': 109, 'settlement': 'meridian', 'interior': True,
    'layout': rows,
    'legend': {
        '#': {'wall': 'concrete', 'floor': 'concrete', 'wallHeight': 3.0},
        'X': {'wall': 'rock', 'floor': 'concrete', 'wallHeight': 3.2},
        's': {'floor': 'concrete'}, 'v': {'floor': 'tile'}, 'm': {'floor': 'metal'}, 'g': {'floor': 'grate'}, 'd': {'floor': 'wood'},
    },
    'props': props,
    'lights': [
        lamp(4, 6, 2.6, '0xffd8a0', 1.0, 6, 0.08),
        lamp(2, 16, 2.4, '0xff8a50', 1.0, 5, 0.12), lamp(7, 17, 2.8, '0xf0f0e8', 1.4, 8),
        lamp(21, 8, 3.6, '0x7fd8c8', 1.2, 10), lamp(30, 8, 3.6, '0x7fd8c8', 1.2, 10), lamp(21, 23, 3.6, '0x7fd8c8', 1.2, 10), lamp(30, 23, 3.6, '0x7fd8c8', 1.2, 10),
        lamp(27, 15, 3.8, '0xe8f0ff', 1.6, 14),
        lamp(42, 15, 2.2, '0xffe0a8', 2.4, 8), lamp(44, 3, 2.0, '0xffa060', 1.0, 5, 0.05),
    ],
    'spawns': spawns,
    'exits': exits,
    'talk': {
        'a3_vault_desk': {'dialogue': 'd_a3_ledger', 'name': 'The reading desk'},
        'a3_vault_relay': {'dialogue': 'd_a3_ledger', 'name': 'The reading desk'},
        'a3_vault_core': {'dialogue': 'd_a3_ledger', 'name': 'The racks'},
        'a3_vault_drop': {'dialogue': 'd_a3_vault_drop', 'name': 'The couriers\' drop'},
        'a3_vault_shaft': {'dialogue': 'd_a3_vault_drop', 'name': 'The couriers\' drop'},
        'a3_vault_trunk': {'dialogue': 'd_a3_vault_trunk', 'name': 'The trunk'},
    },
    'spots': spots,
    'npcs': npcs,
    'triggers': [
        {'id': 'a3_vault_stair', 'x': 3, 'y': 2, 'w': 3, 'h': 9, 'text': 'The stair goes down through the rock under the Spire, forty-odd steps of poured concrete with a handrail polished by nobody\'s hands, warmer with every step. The note comes up it to meet you. At the bottom, a square of tile and a light the colour of old paper.', 'effects': [{'learn': 'a3_vault_stair'}]},
        # the first step into the hall opens the last conversation (the racks and the desk reopen it)
        {'id': 'a3_vault_hall', 'x': 13, 'y': 13, 'w': 4, 'h': 6, 'if': ALL(AT_VAULT, NOT(F('a3_end')), NOT(F('a3_vault_met'))),
         'effects': [{'event': 'dialogue', 'data': {'tree': 'd_a3_ledger', 'name': 'Ledger'}}]},
        # B6r: the wardens drawn on under the dark Spire, all down (or the player beaten on the stair): the climax goes on
        {'id': 'a3_vault_after', 'x': 1, 'y': 1, 'w': 46, 'h': 29,
         'if': ALL(VAULT_FIGHTING, ANY(ALL(*[{'dead': d} for d, *_ in VAULT_WARDENS]), F('a3_vault_beaten'))),
         'effects': [{'event': 'dialogue', 'data': {'tree': 'd_a3_end_unwritten', 'name': 'The core'}}]},
    ],
    'ambience': {'indoor': True, 'fogColor': 'hex:0x161a1e', 'fogDensity': 0.016, 'dust': 0.14, 'ambient': {'color': 'hex:0xa8bccc', 'intensity': 0.75}, 'grade': 0.28, 'mood': 'grim', 'sound': 'hum'},
}
check('md_vault', rows, md_vault['legend'], props, spawns, npcs, spots, exits)

HEADER = "import type { MapDef } from '../../engine/data/types';\n\n// Generated by tools/maps/gen_md_vault.py — edit the generator, then re-run it.\n"
with open(os.path.join(ROOT, 'src', 'content', 'maps', 'md_vault.ts'), 'w') as f:
    f.write(f"{HEADER}export const md_vault: MapDef = {ts(md_vault)};\n")
print('md_vault', W, 'x', H)
