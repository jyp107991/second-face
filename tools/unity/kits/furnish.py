"""The furnishing kit (BUILD_PLAN step 20): what the places' layouts put in rooms and yards beyond the frontier and
shelter kits — bar counters, tables, chairs, beds, cots, shelves, a stove, a generator, sandbags, a fire barrel, a hand
pump, tents, planters, a debris pile, a tyre pile, a stripped car, a campfire, a wagon, a blanket, a shelter's vault door. Sized to the 2 m
tile the layouts are drawn on; the front (where a person stands, sits or works) faces -y (the engine's -z at yaw 0).

    blender -b --python tools/unity/kits/furnish.py -- unity/Assets/SecondFace/Kits/Furnish
"""
import bpy, bmesh, math, os, sys
from mathutils import Matrix
sys.path.insert(0, os.path.dirname(__file__))
import kitlib as K

OUT = sys.argv[sys.argv.index('--') + 1]
REL = 'Assets/SecondFace/Kits/Furnish'


def rot(bm, verts, deg, axis='Z', cent=(0, 0, 0)):
    bmesh.ops.rotate(bm, cent=cent, matrix=Matrix.Rotation(math.radians(deg), 3, axis), verts=verts)


def piece(name, build, **kw):
    K.reset(); K._mats.clear()
    bm = bmesh.new()
    mats = build(bm)
    K.finish(bm); K.box_uv(bm)
    K.new_object(name, bm, [K.mat(m) for m in mats], **kw)
    path = os.path.join(OUT, name + '.fbx'); K.export_fbx(path); K.write_model_meta(path, REL + '/' + name + '.fbx')
    print('piece', name)


def ring(bm, r_in, r_out, height, z, mat_index, segments=16):
    return K.ring_segment(bm, r_in, r_out, height, 359.9, segments, z, mat_index)


# --- rooms -----------------------------------------------------------------------------------------------------------
def counter(bm):
    """A 2 m section of a bar or shop counter along x: worn top, boarded front, a shelf behind, a foot rail."""
    K.box(bm, (2.02, 0.66, 0.06), (0, 0.02, 1.05), 0)
    K.box(bm, (2.0, 0.05, 1.0), (0, -0.28, 0.5), 1)
    for x in (-0.99, 0.99): K.box(bm, (0.07, 0.6, 1.02), (x, 0, 0.51), 1)
    K.box(bm, (1.9, 0.5, 0.04), (0, 0.02, 0.35), 1)
    K.box(bm, (2.0, 0.08, 0.06), (0, -0.33, 0.95), 0)            # front lip under the top
    K.cylinder(bm, 0.025, 2.0, (0, -0.42, 0.22), 8, 2, axis='X')
    for x in (-0.7, 0.7): K.box(bm, (0.04, 0.14, 0.04), (x, -0.36, 0.22), 2)
    return ['wood_floor', 'planks', 'rust']


def table(bm):
    K.box(bm, (1.3, 0.85, 0.05), (0, 0, 0.74), 0)
    for x in (-0.58, 0.58):
        for y in (-0.36, 0.36): K.box(bm, (0.07, 0.07, 0.72), (x, y, 0.36), 1)
    K.box(bm, (1.1, 0.04, 0.06), (0, 0, 0.2), 1)
    K.cylinder(bm, 0.04, 0.1, (0.3, 0.1, 0.82), 10, 2)          # a tin cup
    K.cylinder(bm, 0.035, 0.24, (-0.25, -0.15, 0.89), 10, 2)    # a bottle
    return ['wood_floor', 'planks', 'steel']


def chair(bm):
    K.box(bm, (0.46, 0.44, 0.04), (0, 0, 0.46), 0)
    for x in (-0.2, 0.2):
        for y in (-0.19, 0.19): K.box(bm, (0.04, 0.04, 0.46), (x, y, 0.23), 0)
    for x in (-0.2, 0.2): K.box(bm, (0.04, 0.04, 0.48), (x, 0.19, 0.72), 0)
    for z in (0.66, 0.86): K.box(bm, (0.44, 0.03, 0.07), (0, 0.2, z), 0)
    K.box(bm, (0.4, 0.03, 0.03), (0, -0.19, 0.16), 0)
    return ['planks']


def bed(bm):
    """A plank bed along x with a burlap mattress, a blanket and a pillow; the head at +x."""
    for y in (-0.46, 0.46): K.box(bm, (2.0, 0.06, 0.18), (0, y, 0.25), 0)
    for x in (-0.98, 0.98): K.box(bm, (0.06, 0.98, 0.3), (x, 0, 0.15), 0)
    K.box(bm, (0.08, 1.0, 0.75), (1.0, 0, 0.37), 0)              # headboard
    K.box(bm, (1.9, 0.86, 0.16), (0, 0, 0.38), 1)
    v = K.box(bm, (1.25, 0.94, 0.05), (-0.3, 0, 0.48), 2); rot(bm, v, 2, 'Y', (-0.3, 0, 0.48))
    K.box(bm, (0.42, 0.62, 0.12), (0.7, 0, 0.52), 1)
    return ['planks', 'burlap', 'canvas']


def cot(bm):
    """A folding camp cot along x: a steel tube frame, a sagging canvas bed."""
    for y in (-0.33, 0.33): K.cylinder(bm, 0.02, 1.9, (0, y, 0.4), 8, 0, axis='X')
    for x in (-0.9, 0.9): K.cylinder(bm, 0.02, 0.7, (x, 0, 0.4), 8, 0, axis='Y')
    for x in (-0.7, 0.7):
        for s in (-1, 1):
            v = K.cylinder(bm, 0.015, 0.55, (x, 0, 0.2), 6, 0); rot(bm, v, 35 * s, 'Y', (x, 0, 0.2))
    v = K.box(bm, (1.8, 0.64, 0.02), (0, 0, 0.37), 1)
    for vert in v:
        vert.co.z -= 0.04 * math.cos(vert.co.x / 0.9 * math.pi / 2)
    K.box(bm, (0.6, 0.5, 0.08), (0.5, 0, 0.42), 1)               # a rolled bedroll
    return ['rust', 'canvas']


def shelf(bm):
    """Open shelves against a wall (back at +y): tins, jars and sacks on four boards."""
    for x in (-0.78, 0.78): K.box(bm, (0.04, 0.4, 1.9), (x, 0, 0.95), 0)
    K.box(bm, (1.6, 0.02, 1.9), (0, 0.19, 0.95), 0)
    for z in (0.12, 0.6, 1.1, 1.6): K.box(bm, (1.56, 0.38, 0.03), (0, 0, z), 0)
    tins = [(-0.55, 0.65), (-0.42, 0.65), (0.3, 1.15), (0.42, 1.15), (0.54, 1.15), (-0.6, 1.65), (0.1, 0.65)]
    for i, (x, z) in enumerate(tins): K.cylinder(bm, 0.05 + 0.01 * (i % 2), 0.13 + 0.03 * (i % 3), (x, -0.02, z + 0.08), 10, 1)
    K.box(bm, (0.38, 0.3, 0.32), (0.45, 0, 0.3), 2); K.box(bm, (0.32, 0.28, 0.26), (-0.4, 0, 1.28), 2)
    K.box(bm, (0.4, 0.3, 0.22), (-0.1, 0, 1.72), 3)
    return ['planks', 'steel', 'burlap', 'tin']


def stove(bm):
    K.box(bm, (0.62, 0.5, 0.55), (0, 0, 0.45), 0)
    for x in (-0.27, 0.27):
        for y in (-0.21, 0.21): K.box(bm, (0.05, 0.05, 0.2), (x, y, 0.1), 0)
    K.box(bm, (0.3, 0.02, 0.22), (0, -0.26, 0.42), 1)            # the fire door
    K.cylinder(bm, 0.07, 1.9, (0.12, 0.12, 1.6), 12, 0)        # the flue
    K.cylinder(bm, 0.12, 0.08, (-0.12, 0.0, 0.76), 12, 1)       # a pot
    return ['rust', 'steel']


def machine(bm):
    """A salvaged generator on a skid: engine block, fuel drum, exhaust, cables."""
    for y in (-0.38, 0.38): K.box(bm, (1.5, 0.08, 0.12), (0, y, 0.06), 0)
    K.box(bm, (0.8, 0.6, 0.6), (-0.25, 0, 0.45), 1)
    K.box(bm, (0.5, 0.5, 0.45), (0.45, 0, 0.36), 2)
    K.cylinder(bm, 0.24, 0.55, (0.35, 0, 0.88), 16, 1, axis='X')
    K.cylinder(bm, 0.03, 0.7, (-0.5, 0.2, 1.0), 8, 0)
    K.box(bm, (0.3, 0.06, 0.2), (-0.25, -0.33, 0.55), 0)         # a control box
    return ['rust', 'steel_painted', 'steel']


# --- yards -----------------------------------------------------------------------------------------------------------
def sandbags(bm):
    """A 2 m run of sandbags along x, five courses, staggered."""
    for c in range(5):
        n = 4 if c % 2 == 0 else 3
        for i in range(n):
            x = -0.75 + i * 0.5 + (0.25 if c % 2 else 0)
            v = K.box(bm, (0.5, 0.32, 0.15), (x, 0.02 * ((i + c) % 2), 0.08 + c * 0.14), 0)
            rot(bm, v, ((i * 7 + c * 3) % 9) - 4, 'Z', (x, 0, 0))
    return ['burlap']


def fire_barrel(bm):
    K.cylinder(bm, 0.3, 0.88, (0, 0, 0.44), 20, 0, cap=False)
    K.cylinder(bm, 0.28, 0.04, (0, 0, 0.7), 20, 1)              # ash and coals near the rim
    for z in (0.2, 0.68): K.cylinder(bm, 0.315, 0.04, (0, 0, z), 20, 2, cap=False)
    for a in (0, 70, 150):
        v = K.cylinder(bm, 0.03, 0.5, (0.05, 0, 0.82), 6, 3, axis='X'); rot(bm, v, a, 'Z'); rot(bm, v, 20, 'Y', (0, 0, 0.82))
    return ['rust', 'burned', 'steel', 'bark_brown']


def hand_pump(bm):
    """The town pump: a cast-iron body on a concrete pad, spout, lever, and a trough in front."""
    K.box(bm, (1.2, 1.4, 0.15), (0, 0.1, 0.075), 0)
    K.cylinder(bm, 0.1, 0.95, (0, 0.3, 0.6), 14, 1)
    K.cylinder(bm, 0.13, 0.12, (0, 0.3, 1.1), 14, 1)
    v = K.cylinder(bm, 0.035, 0.32, (0, 0.14, 0.92), 8, 1, axis='Y'); rot(bm, v, -15, 'X', (0, 0.3, 0.92))
    v = K.box(bm, (0.04, 0.9, 0.04), (0, 0.65, 1.2), 1); rot(bm, v, 18, 'X', (0, 0.3, 1.15))
    K.box(bm, (1.0, 0.45, 0.06), (0, -0.35, 0.2), 2)            # trough
    for y in (-0.56, -0.14): K.box(bm, (1.0, 0.05, 0.3), (0, y, 0.3), 2)
    for x in (-0.5, 0.5): K.box(bm, (0.05, 0.47, 0.3), (x, -0.35, 0.3), 2)
    return ['concrete', 'rust', 'planks']


def slab(bm, a, b, c, d, thickness, mat_index):
    """A thin panel on the quad a-b-c-d (a b along one edge, c d along the other), thickened along its normal."""
    from mathutils import Vector
    a, b, c, d = Vector(a), Vector(b), Vector(c), Vector(d)
    n = (b - a).cross(c - a).normalized() * (thickness / 2)
    vs = [bm.verts.new(p) for p in (a - n, b - n, d - n, c - n, a + n, b + n, d + n, c + n)]
    for f in ((0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)):
        bm.faces.new([vs[i] for i in f]).material_index = mat_index
    return vs


def tent(bm):
    """A ridge tent along x, 2.4 m long: two canvas sides from the ridge to the ground, the back closed, the front
    flap rolled up on one side, a pole at each end."""
    L, W, H = 2.4, 1.9, 1.35
    for s in (-1, 1):
        slab(bm, (-L / 2, 0, H), (L / 2, 0, H), (-L / 2, s * W / 2, 0.02), (L / 2, s * W / 2, 0.02), 0.02, 0)
    for dx in (0.0, 0.01):                                       # the back wall, a face each way
        a = bm.verts.new((L / 2 + dx, -W / 2, 0.02)); b = bm.verts.new((L / 2 + dx, W / 2, 0.02)); c = bm.verts.new((L / 2 + dx, 0, H))
        bm.faces.new((a, b, c) if dx else (c, b, a)).material_index = 0
    for x in (-L / 2 - 0.05, L / 2 + 0.05): K.box(bm, (0.04, 0.04, H + 0.15), (x, 0, (H + 0.15) / 2), 1)
    K.cylinder(bm, 0.08, 0.8, (-L / 2 - 0.02, -0.42, 0.65), 10, 0, axis='Y')
    return ['canvas', 'planks']


def planter(bm):
    K.box(bm, (0.9, 0.9, 0.06), (0, 0, 0.03), 0)
    for s in (-1, 1):
        K.box(bm, (0.9, 0.05, 0.5), (0, s * 0.43, 0.25), 0); K.box(bm, (0.05, 0.9, 0.5), (s * 0.43, 0, 0.25), 0)
    K.box(bm, (0.82, 0.82, 0.04), (0, 0, 0.44), 1)
    for i in range(7):
        x, y = -0.25 + (i % 3) * 0.25, -0.25 + (i // 3) * 0.25
        v = K.box(bm, (0.05, 0.03, 0.28), (x, y, 0.58), 2); rot(bm, v, i * 47, 'Z', (x, y, 0))
    return ['planks', 'scrub_soil', 'grass_dry']


def debris(bm):
    """A heap of salvage: boards, a bent sheet, a broken crate, concrete lumps."""
    for i, (x, y, a, t) in enumerate(((-0.4, 0.1, 20, 8), (0.1, -0.2, -35, 12), (0.3, 0.3, 60, -6), (-0.1, 0.0, 95, 15))):
        v = K.box(bm, (1.4, 0.18, 0.03), (x, y, 0.06 + i * 0.05), 0); rot(bm, v, a, 'Z', (x, y, 0)); rot(bm, v, t, 'Y', (x, y, 0.1))
    v = K.box(bm, (1.1, 0.8, 0.02), (0.2, -0.1, 0.3), 1); rot(bm, v, 25, 'Y', (0.2, -0.1, 0.3)); rot(bm, v, 15, 'Z')
    v = K.box(bm, (0.6, 0.6, 0.45), (-0.55, -0.4, 0.2), 0); rot(bm, v, 30, 'Z', (-0.55, -0.4, 0)); rot(bm, v, 10, 'X', (-0.55, -0.4, 0))
    for (x, y, s) in ((0.6, -0.5, 0.35), (0.75, 0.2, 0.25), (-0.3, 0.55, 0.3)):
        v = K.box(bm, (s, s * 0.8, s * 0.6), (x, y, s * 0.25), 2); rot(bm, v, x * 90, 'Z', (x, y, 0))
    return ['planks', 'scrap', 'concrete']


def tire_pile(bm):
    for i, (x, y) in enumerate(((0, 0), (0, 0), (0, 0), (0.75, 0.1))):
        if i < 3:
            ring(bm, 0.2, 0.38, 0.2, 0.0 + i * 0.2, 0)
        else:
            v = ring(bm, 0.2, 0.38, 0.2, 0, 0)
            vs = list({vv for f in v for vv in f.verts})
            rot(bm, vs, 70, 'Y'); bmesh.ops.translate(bm, vec=(x, y, 0.36), verts=vs)
    return ['burned']


def car_wreck(bm):
    """A stripped car hulk along x, sat on its hubs: body, cabin pillars and roof, no glass, no wheels."""
    v = K.box(bm, (4.2, 1.75, 0.55), (0, 0, 0.5), 0)
    for vert in v:                                               # the bonnet and boot fall away at the ends
        if abs(vert.co.x) > 2.0 and vert.co.z > 0.6: vert.co.z -= 0.12
    K.box(bm, (4.24, 1.79, 0.1), (0, 0, 0.3), 1)                # the sill line, rust-black
    for x in (-0.55, 0.85):
        for y in (-0.78, 0.78): K.box(bm, (0.1, 0.08, 0.55), (x + (0.2 if x > 0 else -0.15), y, 1.04), 0)
    v = K.box(bm, (1.9, 1.6, 0.06), (0.1, 0, 1.33), 0)
    K.box(bm, (2.2, 1.65, 0.05), (0.1, 0, 0.79), 2)              # the gutted floor seen through the windows
    for x in (-1.35, 1.35):
        for y in (-0.82, 0.82): K.cylinder(bm, 0.36, 0.14, (x, y, 0.32), 16, 1, axis='Y', cap=False)   # empty arches
    return ['rust', 'scrap', 'burned']


def campfire(bm):
    for i in range(9):
        a = i / 9 * math.tau
        v = K.box(bm, (0.24, 0.18, 0.14), (math.cos(a) * 0.55, math.sin(a) * 0.55, 0.07), 0); rot(bm, v, math.degrees(a), 'Z', (math.cos(a) * 0.55, math.sin(a) * 0.55, 0))
    K.cylinder(bm, 0.45, 0.03, (0, 0, 0.015), 16, 1)
    for a in (0, 60, 120):
        v = K.cylinder(bm, 0.05, 0.8, (0, 0, 0.12), 8, 2, axis='X'); rot(bm, v, a, 'Z'); rot(bm, v, 12, 'Y', (0, 0, 0.1))
    return ['rock', 'burned', 'bark_brown']


def wagon(bm):
    """A two-wheeled cart along x: plank bed with sides, wheels of planks, shafts forward (-x)."""
    K.box(bm, (2.6, 1.5, 0.08), (0.2, 0, 0.75), 0)
    for y in (-0.73, 0.73): K.box(bm, (2.6, 0.05, 0.4), (0.2, y, 0.97), 0)
    K.box(bm, (0.05, 1.5, 0.4), (1.5, 0, 0.97), 0)
    for y in (-0.88, 0.88):
        ring(bm, 0.56, 0.64, 0.08, -0.04, 0)
        vs = [vv for vv in bm.verts if abs(vv.co.z) < 0.06 and math.hypot(vv.co.x, vv.co.y) > 0.5 and math.hypot(vv.co.x, vv.co.y) < 0.7 and not vv.tag]
        for vv in vs: vv.tag = True
        rot(bm, vs, 90, 'X'); bmesh.ops.translate(bm, vec=(0.3, y, 0.64), verts=vs)
        for k in range(6):
            v = K.box(bm, (0.04, 0.04, 1.2), (0.3, y, 0.64), 0); rot(bm, v, k * 30, 'Y', (0.3, y, 0.64))
    K.cylinder(bm, 0.04, 1.9, (0.3, 0, 0.64), 8, 1, axis='Y')    # axle
    for y in (-0.5, 0.5): K.box(bm, (2.0, 0.07, 0.07), (-1.8, y, 0.62), 0)
    for v in bm.verts: v.tag = False
    return ['planks', 'rust']


def vault_door(bm):
    """A shelter's vault door, rolled open: a 4 m steel disc on edge beside the doorway (+x), its locking bolts,
    the hinge arm reaching back to the frame at x = 0."""
    v = K.cylinder(bm, 2.0, 0.55, (0, 0, 0), 40, 0, axis='Y')
    bmesh.ops.translate(bm, vec=(3.3, 0.6, 2.05), verts=v)
    v = K.cylinder(bm, 1.55, 0.6, (0, 0, 0), 40, 1, axis='Y')                      # the inner face, a darker plate
    bmesh.ops.translate(bm, vec=(3.3, 0.62, 2.05), verts=v)
    for k in range(12):                                                             # bolts round the rim
        a = k / 12 * math.tau
        v = K.cylinder(bm, 0.09, 0.9, (0, 0, 0), 10, 2, axis='Y')
        bmesh.ops.translate(bm, vec=(3.3 + math.cos(a) * 1.75, 0.6, 2.05 + math.sin(a) * 1.75), verts=v)
    K.box(bm, (1.6, 0.3, 0.35), (1.6, 0.6, 2.05), 2)                               # the hinge arm
    K.cylinder(bm, 0.22, 2.4, (0.75, 0.6, 2.05), 16, 2)                            # the hinge pin
    K.box(bm, (0.5, 0.25, 0.2), (3.3, 0.25, 2.05), 2)                              # the wheel's hub
    for a in (0, 60, 120):
        v = K.box(bm, (1.2, 0.08, 0.08), (0, 0, 0), 2); rot(bm, v, a, 'Y'); bmesh.ops.translate(bm, vec=(3.3, 0.18, 2.05), verts=v)
    return ['steel_painted', 'rust', 'steel']


def blanket(bm):
    v = K.box(bm, (1.8, 1.2, 0.03), (0, 0, 0.02), 0)
    K.box(bm, (0.5, 1.2, 0.1), (0.75, 0, 0.06), 0)               # the rolled end
    return ['canvas']


PIECES = {
    'counter': (counter, {'bevel': 0.008}), 'table': (table, {'bevel': 0.008}), 'chair': (chair, {}), 'bed': (bed, {'bevel': 0.01}),
    'cot': (cot, {'smooth': True, 'split_angle': 40}), 'shelf': (shelf, {}), 'stove': (stove, {'smooth': True, 'split_angle': 40}),
    'machine': (machine, {'bevel': 0.01}), 'sandbags': (sandbags, {'bevel': 0.05}), 'fire_barrel': (fire_barrel, {'smooth': True, 'split_angle': 40}),
    'hand_pump': (hand_pump, {'smooth': True, 'split_angle': 40}), 'tent': (tent, {}), 'planter': (planter, {}),
    'debris': (debris, {}), 'tire_pile': (tire_pile, {'smooth': True, 'split_angle': 50}), 'car_wreck': (car_wreck, {'bevel': 0.03}),
    'campfire': (campfire, {'bevel': 0.02}), 'wagon': (wagon, {}), 'blanket': (blanket, {'bevel': 0.01}),
    'vault_door': (vault_door, {'smooth': True, 'split_angle': 35}),
}
os.makedirs(OUT, exist_ok=True); K.write_folder_meta(OUT, REL)
for name, (fn, kw) in PIECES.items(): piece(name, fn, **kw)
print('furnish kit:', len(PIECES), 'pieces ->', OUT)
