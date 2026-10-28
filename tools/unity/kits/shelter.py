"""The shelter kit (Cistern 9 and every sealed shelter): concrete rings and slabs, steel hatches and frames, pipes,
grates, bunks, hydroponic troughs — modular pieces on a 4 m grid, origin at the floor, +Y forward for walls.

    blender -b --python tools/unity/kits/shelter.py -- unity/Assets/SecondFace/Kits/Shelter

Each piece is its own FBX with material slots named mat_<library key> (KitImportPostprocessor binds them).
"""
import bpy, bmesh, math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
import kitlib as K

OUT = sys.argv[sys.argv.index('--') + 1]
REL = 'Assets/SecondFace/Kits/Shelter'
H = 3.2          # storey height
T = 0.35         # wall thickness

def piece(name, build, **kw):
    K.reset(); K._mats.clear()
    bm = bmesh.new()
    mats = build(bm)
    K.finish(bm)
    K.box_uv(bm)
    ob = K.new_object(name, bm, [K.mat(m) for m in mats], **kw)
    path = os.path.join(OUT, name + '.fbx')
    K.export_fbx(path)
    K.write_model_meta(path, REL + '/' + name + '.fbx')
    print('piece', name)

# --- floors and ceilings -------------------------------------------------------------------------------------
def floor_slab(bm):
    K.box(bm, (4, 4, 0.2), (0, 0, -0.1), 0)
    return ['concrete']

def ceiling_slab(bm):
    K.box(bm, (4, 4, 0.25), (0, 0, H + 0.125), 0)
    # a cable tray under it
    K.box(bm, (3.6, 0.3, 0.06), (0, 1.2, H - 0.05), 1)
    K.box(bm, (3.6, 0.02, 0.1), (0, 1.05, H - 0.05), 1)
    K.box(bm, (3.6, 0.02, 0.1), (0, 1.35, H - 0.05), 1)
    return ['concrete', 'metal_plate']

def grate_floor(bm):
    K.box(bm, (2, 2, 0.06), (0, 0, 0.03), 0)
    return ['grate']

# --- walls -----------------------------------------------------------------------------------------------------
def wall_straight(bm):
    K.box(bm, (4, T, H), (0, 0, H / 2), 0)
    # seam panels: two shallow recesses read as poured-concrete joints
    for x in (-1.0, 1.0):
        K.box(bm, (1.6, 0.03, 2.2), (x, -T / 2 - 0.015, 1.4), 0)
    # a steel skirting
    K.box(bm, (4, 0.04, 0.25), (0, -T / 2 - 0.02, 0.125), 1)
    return ['concrete_wall', 'metal_plate']

def wall_doorway(bm):
    # two piers and a lintel, with a steel frame round a 1.3 x 2.4 opening
    K.box(bm, (1.35, T, H), (-1.325, 0, H / 2), 0)
    K.box(bm, (1.35, T, H), (1.325, 0, H / 2), 0)
    K.box(bm, (1.3, T, H - 2.4), (0, 0, 2.4 + (H - 2.4) / 2), 0)
    K.box(bm, (0.12, T + 0.06, 2.45), (-0.71, 0, 1.225), 1)
    K.box(bm, (0.12, T + 0.06, 2.45), (0.71, 0, 1.225), 1)
    K.box(bm, (1.54, T + 0.06, 0.12), (0, 0, 2.46), 1)
    return ['concrete_wall', 'metal_plate']

def wall_ring(bm):
    # 22.5 degrees of a 12 m cistern ring: 16 pieces close the circle
    K.ring_segment(bm, 12.0 - T, 12.0, H, 22.5, segments=6, mat_index=0)
    return ['concrete_wall']

def wall_ring_low(bm):
    K.ring_segment(bm, 12.0 - T, 12.0, 1.1, 22.5, segments=6, mat_index=0)
    K.ring_segment(bm, 12.0 - T - 0.05, 12.0 + 0.05, 0.08, 22.5, segments=6, z=1.1, mat_index=1)
    return ['concrete_wall', 'metal_plate']

def pillar(bm):
    K.box(bm, (0.5, 0.5, H), (0, 0, H / 2), 0)
    K.box(bm, (0.7, 0.7, 0.15), (0, 0, 0.075), 0)
    K.box(bm, (0.7, 0.7, 0.15), (0, 0, H - 0.075), 0)
    return ['concrete']

# --- steel -----------------------------------------------------------------------------------------------------
def hatch_door(bm):
    # a round shelter door 2.4 m across in a frame: rim, dish, spokes, a wheel
    K.cylinder(bm, 1.3, 0.25, (0, 0, 1.35), 40, 0, axis='Y')
    K.cylinder(bm, 1.15, 0.32, (0, -0.02, 1.35), 40, 1, axis='Y')
    for i in range(6):
        a = math.radians(i * 30)
        verts = K.box(bm, (2.1, 0.08, 0.1), (0, -0.2, 1.35), 1)
        bmesh.ops.rotate(bm, cent=(0, -0.2, 1.35), matrix=__import__('mathutils').Matrix.Rotation(a, 3, 'Y'), verts=verts)
    K.cylinder(bm, 0.42, 0.06, (0, -0.26, 1.35), 24, 1, axis='Y')
    K.cylinder(bm, 0.38, 0.08, (0, -0.26, 1.35), 24, 1, axis='Y', cap=False)
    K.cylinder(bm, 0.06, 0.4, (0, -0.3, 1.35), 12, 1, axis='Y')
    return ['metal_plate', 'rust']

def pipe_straight(bm):
    K.cylinder(bm, 0.15, 4.0, (0, 0, 0), 16, 0, axis='X')
    K.cylinder(bm, 0.19, 0.12, (-1.9, 0, 0), 16, 1, axis='X')
    K.cylinder(bm, 0.19, 0.12, (1.9, 0, 0), 16, 1, axis='X')
    return ['metal_plate', 'rust']

def pipe_elbow(bm):
    K.cylinder(bm, 0.15, 0.6, (-0.3, 0, 0), 16, 0, axis='X')
    K.cylinder(bm, 0.15, 0.6, (0, 0.3, 0), 16, 0, axis='Y')
    r = bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=8, radius=0.15)
    for f in {f for v in r['verts'] for f in v.link_faces}: f.material_index = 0
    K.cylinder(bm, 0.19, 0.12, (-0.55, 0, 0), 16, 1, axis='X')
    K.cylinder(bm, 0.19, 0.12, (0, 0.55, 0), 16, 1, axis='Y')
    return ['metal_plate', 'rust']

def railing(bm):
    for x in (-0.95, 0.95):
        K.cylinder(bm, 0.025, 1.05, (x, 0, 0.525), 10, 0)
    K.cylinder(bm, 0.03, 2.0, (0, 0, 1.05), 10, 0, axis='X')
    K.cylinder(bm, 0.02, 2.0, (0, 0, 0.55), 10, 0, axis='X')
    return ['metal_plate']

def stair(bm):
    # 12 risers over 3.2 m, 1.2 m wide, treads as plates, stringers as boxes
    n = 12; rise = H / n; run = 0.28
    for i in range(n):
        K.box(bm, (1.2, run, 0.05), (0, i * run + run / 2, (i + 1) * rise - 0.025), 0)
        K.box(bm, (1.2, 0.03, rise), (0, i * run + 0.015, i * rise + rise / 2), 1)
    for x in (-0.58, 0.58):
        verts = K.box(bm, (0.04, n * run + 0.3, 0.3), (x, (n * run) / 2, H / 2), 1)
        bmesh.ops.rotate(bm, cent=(x, (n * run) / 2, H / 2), matrix=__import__('mathutils').Matrix.Rotation(-math.atan2(H, n * run), 3, 'X'), verts=verts)
    return ['grate', 'metal_plate']

# --- furniture ---------------------------------------------------------------------------------------------------
def bunk(bm):
    for z in (0.45, 1.45):
        K.box(bm, (0.9, 2.0, 0.08), (0, 0, z), 0)
        K.box(bm, (0.86, 1.94, 0.12), (0, 0, z + 0.1), 1)
    for x in (-0.43, 0.43):
        for y in (-0.97, 0.97):
            K.box(bm, (0.04, 0.04, 2.0), (x, y, 1.0), 0)
    return ['metal_plate', 'canvas']

def hydro_trough(bm):
    K.box(bm, (3.0, 0.9, 0.9), (0, 0, 0.45), 0)
    K.box(bm, (2.8, 0.7, 0.4), (0, 0, 0.9), 1)       # the water/soil fill (dark)
    K.box(bm, (3.1, 1.0, 0.05), (0, 0, 0.925), 0)
    K.box(bm, (0.06, 0.06, 1.9), (-1.4, -0.4, 0.95), 0)
    K.box(bm, (0.06, 0.06, 1.9), (1.4, -0.4, 0.95), 0)
    K.box(bm, (3.0, 0.3, 0.05), (0, -0.4, 1.9), 0)    # the lamp bar
    return ['metal_plate', 'moss']

def crate(bm):
    K.box(bm, (0.8, 0.8, 0.8), (0, 0, 0.4), 0)
    for z in (0.08, 0.72):
        K.box(bm, (0.84, 0.84, 0.05), (0, 0, z), 1)
    return ['planks', 'metal_plate']

def barrel(bm):
    K.cylinder(bm, 0.3, 0.9, (0, 0, 0.45), 20, 0)
    for z in (0.2, 0.7):
        K.cylinder(bm, 0.315, 0.04, (0, 0, z), 20, 1, cap=False)
    return ['rust', 'metal_plate']

def locker(bm):
    K.box(bm, (0.5, 0.5, 1.9), (0, 0, 0.95), 0)
    K.box(bm, (0.44, 0.02, 1.7), (0, -0.26, 0.95), 1)
    return ['painted', 'metal_plate']

def terminal(bm):
    K.box(bm, (0.8, 0.6, 0.9), (0, 0, 0.45), 0)
    verts = K.box(bm, (0.7, 0.4, 0.5), (0, -0.05, 1.1), 0)
    bmesh.ops.rotate(bm, cent=(0, -0.05, 1.1), matrix=__import__('mathutils').Matrix.Rotation(math.radians(-20), 3, 'X'), verts=verts)
    K.box(bm, (0.5, 0.02, 0.3), (0, -0.27, 1.12), 1)
    return ['painted', 'metal_plate']

def light_fixture(bm):
    K.box(bm, (1.2, 0.15, 0.08), (0, 0, H - 0.04), 0)
    K.box(bm, (1.1, 0.1, 0.02), (0, 0, H - 0.09), 1)
    return ['metal_plate', 'painted']

PIECES = {
    'floor_slab': (floor_slab, {}), 'ceiling_slab': (ceiling_slab, {}), 'grate_floor': (grate_floor, {}),
    'wall_straight': (wall_straight, {'bevel': 0.01}), 'wall_doorway': (wall_doorway, {'bevel': 0.01}), 'wall_ring': (wall_ring, {}), 'wall_ring_low': (wall_ring_low, {}),
    'pillar': (pillar, {'bevel': 0.015}), 'hatch_door': (hatch_door, {'smooth': True, 'split_angle': 40}),
    'pipe_straight': (pipe_straight, {'smooth': True, 'split_angle': 40}), 'pipe_elbow': (pipe_elbow, {'smooth': True, 'split_angle': 40}),
    'railing': (railing, {'smooth': True, 'split_angle': 40}), 'stair': (stair, {}), 'bunk': (bunk, {}), 'hydro_trough': (hydro_trough, {}),
    'crate': (crate, {'bevel': 0.01}), 'barrel': (barrel, {'smooth': True, 'split_angle': 40}), 'locker': (locker, {'bevel': 0.008}),
    'terminal': (terminal, {'bevel': 0.008}), 'light_fixture': (light_fixture, {}),
}

os.makedirs(OUT, exist_ok=True)
K.write_folder_meta(OUT, REL)
for name, (fn, kw) in PIECES.items():
    piece(name, fn, **kw)
print('shelter kit:', len(PIECES), 'pieces ->', OUT)
