"""The frontier kit (Shale, Dry Wells and every well town): adobe and scrap walls, timber posts and beams, tin roofs,
plank doors and shutters, awnings, a well, a windpump, water tanks, barrels, crates, fences — on a 4 m grid.

    blender -b --python tools/unity/kits/frontier.py -- unity/Assets/SecondFace/Kits/Frontier
"""
import bpy, bmesh, math, os, sys
from mathutils import Matrix
sys.path.insert(0, os.path.dirname(__file__))
import kitlib as K

OUT = sys.argv[sys.argv.index('--') + 1]
REL = 'Assets/SecondFace/Kits/Frontier'
H = 2.9     # storey height
T = 0.4     # adobe wall thickness

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

# --- adobe walls (4 m): rounded parapet, timber lintels; windows and doors as separate pieces ---------------------
def adobe_wall(bm):
    K.box(bm, (4, T, H), (0, 0, H / 2), 0)
    K.box(bm, (4.04, T + 0.04, 0.18), (0, 0, H + 0.09), 0)       # parapet lip
    for x in (-1.6, 0.0, 1.6):                                      # vigas poking through below the roof
        K.cylinder(bm, 0.09, T + 0.5, (x, 0, H - 0.3), 10, 1, axis='Y')
    return ['adobe', 'planks']

def adobe_wall_window(bm):
    K.box(bm, (1.3, T, H), (-1.35, 0, H / 2), 0); K.box(bm, (1.3, T, H), (1.35, 0, H / 2), 0)
    K.box(bm, (1.4, T, 1.0), (0, 0, 0.5), 0); K.box(bm, (1.4, T, H - 2.0), (0, 0, 2.0 + (H - 2.0) / 2), 0)
    K.box(bm, (1.5, T + 0.08, 0.12), (0, 0, 2.06), 1)           # lintel
    K.box(bm, (1.5, T + 0.08, 0.08), (0, 0, 1.04), 1)           # sill
    K.box(bm, (0.06, 0.02, 0.9), (0, 0, 1.55), 1)               # mullion
    K.box(bm, (1.3, 0.02, 0.06), (0, 0, 1.55), 1)
    K.box(bm, (4.04, T + 0.04, 0.18), (0, 0, H + 0.09), 0)
    return ['adobe', 'planks']

def adobe_wall_door(bm):
    K.box(bm, (1.5, T, H), (-1.25, 0, H / 2), 0); K.box(bm, (1.5, T, H), (1.25, 0, H / 2), 0)
    K.box(bm, (1.0, T, H - 2.2), (0, 0, 2.2 + (H - 2.2) / 2), 0)
    K.box(bm, (1.2, T + 0.08, 0.14), (0, 0, 2.27), 1)           # lintel
    for x in (-0.55, 0.55): K.box(bm, (0.1, T + 0.04, 2.2), (x, 0, 1.1), 1)   # jambs
    K.box(bm, (4.04, T + 0.04, 0.18), (0, 0, H + 0.09), 0)
    return ['adobe', 'planks']

def plank_door(bm):
    for i in range(5): K.box(bm, (0.18, 0.04, 2.1), (-0.4 + i * 0.2, 0, 1.05), 0)
    K.box(bm, (0.95, 0.03, 0.12), (0, -0.035, 0.5), 0); K.box(bm, (0.95, 0.03, 0.12), (0, -0.035, 1.7), 0)
    K.box(bm, (0.06, 0.08, 0.3), (0.35, -0.06, 1.0), 1)         # latch
    return ['planks', 'rust']

def shutter(bm):
    for i in range(3): K.box(bm, (0.18, 0.03, 0.9), (-0.2 + i * 0.2, 0, 0.45), 0)
    K.box(bm, (0.6, 0.02, 0.08), (0, -0.025, 0.12), 0); K.box(bm, (0.6, 0.02, 0.08), (0, -0.025, 0.78), 0)
    return ['planks']

# --- scrap walls: corrugated sheets on a timber frame, patched with plates ------------------------------------------
def scrap_wall(bm):
    for x in (-1.9, -0.63, 0.63, 1.9): K.box(bm, (0.1, 0.1, H), (x, 0.08, H / 2), 0)
    K.box(bm, (4, 0.1, 0.1), (0, 0.08, H - 0.05), 0); K.box(bm, (4, 0.1, 0.1), (0, 0.08, 0.05), 0)
    for i in range(4):
        x = -1.5 + i * 1.0
        K.box(bm, (1.0, 0.03, H - 0.1 - (0.15 if i % 2 else 0)), (x, -0.02, (H - 0.1) / 2 - (0.07 if i % 2 else 0)), 1)
    K.box(bm, (0.7, 0.025, 0.5), (-0.9, -0.05, 1.2), 2); K.box(bm, (0.5, 0.025, 0.7), (1.2, -0.05, 2.0), 2)   # patches
    return ['planks', 'tin', 'rust']

def scrap_wall_low(bm):
    for x in (-1.9, 0, 1.9): K.box(bm, (0.1, 0.1, 1.2), (x, 0.06, 0.6), 0)
    K.box(bm, (4, 0.03, 1.1), (0, -0.02, 0.55), 1)
    K.box(bm, (4, 0.08, 0.08), (0, 0.04, 1.2), 0)
    return ['planks', 'tin']

# --- roofs and floors ---------------------------------------------------------------------------------------------------
def tin_roof_flat(bm):
    K.box(bm, (4.2, 4.2, 0.04), (0, 0, H + 0.02), 0)
    for y in (-1.5, 0, 1.5): K.box(bm, (4.2, 0.12, 0.12), (0, y, H - 0.06), 1)
    for x in (-1.4, 0.0, 1.4): K.box(bm, (0.05, 4.2, 0.02), (x, 0, H + 0.05), 2)   # seams
    return ['tin', 'planks', 'rust']

def tin_roof_lean(bm):
    verts = K.box(bm, (4.4, 4.4, 0.04), (0, 0, 0), 0)
    rot(bm, verts, -12, 'X'); bmesh.ops.translate(bm, vec=(0, 0, H + 0.4), verts=verts)
    for x in (-1.6, 0, 1.6):
        v = K.box(bm, (0.1, 4.2, 0.1), (x, 0, -0.07), 1); rot(bm, v, -12, 'X'); bmesh.ops.translate(bm, vec=(0, 0, H + 0.4), verts=v)
    return ['tin', 'planks']

def plank_floor(bm):
    for i in range(16): K.box(bm, (0.24, 4, 0.04), (-1.875 + i * 0.25, 0, 0.14), 0)
    for y in (-1.6, 0, 1.6): K.box(bm, (4, 0.12, 0.12), (0, y, 0.06), 0)
    return ['wood_floor']

def porch(bm):
    for i in range(8): K.box(bm, (4, 0.24, 0.04), (0, -0.875 + i * 0.25, 0.3), 0)
    for x in (-1.9, 1.9): K.box(bm, (0.14, 0.14, H + 0.3), (x, -0.9, (H + 0.3) / 2), 1)
    K.box(bm, (4.2, 0.12, 0.1), (0, -0.9, H + 0.25), 1)
    v = K.box(bm, (4.4, 2.4, 0.03), (0, 0, 0), 2); rot(bm, v, -10, 'X'); bmesh.ops.translate(bm, vec=(0, -0.1, H + 0.5), verts=v)
    for x in (-1.3, 0, 1.3): K.box(bm, (0.12, 0.3, 0.04), (x, -1.9, 0.08), 1)   # step
    K.box(bm, (4, 0.3, 0.04), (0, -1.9, 0.14), 0)
    return ['wood_floor', 'planks', 'tin']

# --- town furniture ---------------------------------------------------------------------------------------------------
def well(bm):
    K.cylinder(bm, 1.1, 0.9, (0, 0, 0.45), 24, 0)
    K.cylinder(bm, 0.85, 0.95, (0, 0, 0.5), 24, 0, cap=False)   # inner rim (hollow look)
    for x in (-0.9, 0.9): K.box(bm, (0.14, 0.14, 2.2), (x, 0, 1.1), 1)
    K.box(bm, (2.2, 0.14, 0.14), (0, 0, 2.2), 1)
    K.cylinder(bm, 0.1, 1.6, (0, 0, 1.75), 12, 2, axis='X')     # windlass
    K.cylinder(bm, 0.06, 0.6, (1.0, 0, 1.75), 8, 2, axis='X'); K.box(bm, (0.5, 0.05, 0.05), (1.4, 0, 1.55), 2)
    v = K.box(bm, (2.4, 2.4, 0.03), (0, 0, 0), 3); rot(bm, v, 12, 'X'); bmesh.ops.translate(bm, vec=(0, 0, 2.5), verts=v)
    return ['adobe', 'planks', 'rust', 'tin']

def windpump(bm):
    for sx, sy in ((-0.9, -0.9), (0.9, -0.9), (0.9, 0.9), (-0.9, 0.9)):
        v = K.box(bm, (0.08, 0.08, 7.0), (0, 0, 3.5), 0)
        bmesh.ops.translate(bm, vec=(sx * 0.5, sy * 0.5, 0), verts=v)
        rot(bm, v, 6 if sx < 0 else -6, 'Y'); rot(bm, v, -6 if sy < 0 else 6, 'X')
        bmesh.ops.translate(bm, vec=(sx * 0.6, sy * 0.6, 0), verts=v)
    for z in (1.6, 3.4, 5.2):
        s = 1.9 - z * 0.14
        for side in range(4):
            v = K.box(bm, (s, 0.05, 0.05), (0, -s / 2, z), 0); rot(bm, v, side * 90, 'Z')
    K.box(bm, (0.3, 0.3, 0.4), (0, 0, 7.1), 1)
    K.cylinder(bm, 0.08, 0.6, (0, 0, 7.2), 10, 1, axis='Y')
    for i in range(12):
        v = K.box(bm, (0.32, 0.02, 1.2), (0, -0.45, 7.95), 2); rot(bm, v, 8, 'Z', (0, -0.45, 7.95)); rot(bm, v, i * 30, 'Y', (0, -0.45, 7.2))
    v = K.box(bm, (0.6, 1.2, 0.03), (0, 0.9, 7.2), 2); K.box(bm, (0.04, 1.3, 0.04), (0, 0.65, 7.2), 1)
    K.cylinder(bm, 0.05, 6.8, (0, 0, 3.6), 8, 1)                # pump rod
    return ['planks', 'rust', 'tin']

def water_tank(bm):
    K.cylinder(bm, 1.2, 1.8, (0, 0, 2.4), 24, 0)
    for z in (1.7, 2.4, 3.1): K.cylinder(bm, 1.23, 0.05, (0, 0, z), 24, 1, cap=False)
    for a in range(6):
        v = K.box(bm, (0.12, 0.12, 1.5), (0.95, 0, 0.75), 2); rot(bm, v, a * 60, 'Z')
    K.box(bm, (2.2, 2.2, 0.1), (0, 0, 1.5), 2)
    K.cylinder(bm, 0.05, 1.6, (1.2, 0, 0.8), 8, 1)             # tap pipe
    return ['tin', 'rust', 'planks']

def crate_stack(bm):
    for (x, y, z) in ((0, 0, 0.4), (0.85, 0.1, 0.4), (0.4, 0.05, 1.2)):
        K.box(bm, (0.8, 0.8, 0.8), (x, y, z), 0); K.box(bm, (0.84, 0.84, 0.05), (x, y, z - 0.32), 1); K.box(bm, (0.84, 0.84, 0.05), (x, y, z + 0.32), 1)
    return ['planks', 'steel']

def barrel_rust(bm):
    K.cylinder(bm, 0.3, 0.9, (0, 0, 0.45), 20, 0)
    for z in (0.2, 0.7): K.cylinder(bm, 0.315, 0.04, (0, 0, z), 20, 1, cap=False)
    return ['rust', 'steel']

def fence_post(bm):
    K.box(bm, (0.12, 0.12, 1.3), (0, 0, 0.65), 0)
    return ['planks']

def fence_wire(bm):
    K.box(bm, (0.12, 0.12, 1.3), (-1.0, 0, 0.65), 0); K.box(bm, (0.12, 0.12, 1.3), (1.0, 0, 0.65), 0)
    for z in (0.4, 0.8, 1.2): K.cylinder(bm, 0.008, 2.0, (0, 0, z), 6, 1, axis='X')
    return ['planks', 'rust']

def awning(bm):
    for x in (-1.4, 1.4): K.box(bm, (0.08, 0.08, 2.4), (x, -2.2, 1.2), 0)
    v = K.box(bm, (3.2, 2.6, 0.02), (0, -1.1, 0), 1); rot(bm, v, -8, 'X'); bmesh.ops.translate(bm, vec=(0, 0, 2.5), verts=v)
    K.box(bm, (3.2, 0.06, 0.06), (0, -2.3, 2.3), 0)
    return ['planks', 'canvas']

def market_bench(bm):
    K.box(bm, (2.4, 0.9, 0.06), (0, 0, 0.9), 0)
    for x in (-1.1, 1.1):
        for y in (-0.35, 0.35): K.box(bm, (0.08, 0.08, 0.9), (x, y, 0.45), 0)
    K.box(bm, (2.2, 0.7, 0.3), (0, 0, 1.05), 1)                  # goods bundle
    return ['planks', 'canvas']

def sign_post(bm):
    K.box(bm, (0.1, 0.1, 2.4), (0, 0, 1.2), 0)
    K.box(bm, (0.9, 0.03, 0.3), (0.3, 0, 2.1), 1); K.box(bm, (0.7, 0.03, 0.3), (-0.2, 0, 1.75), 1)
    return ['planks', 'steel_painted']

def lamp_post(bm):
    K.cylinder(bm, 0.05, 3.2, (0, 0, 1.6), 10, 0)
    K.box(bm, (0.5, 0.05, 0.05), (0.25, 0, 3.1), 0)
    K.box(bm, (0.22, 0.22, 0.3), (0.45, 0, 2.95), 1)
    return ['rust', 'steel_painted']

PIECES = {
    'adobe_wall': (adobe_wall, {'bevel': 0.02, 'smooth': True, 'split_angle': 60}), 'adobe_wall_window': (adobe_wall_window, {'bevel': 0.02}),
    'adobe_wall_door': (adobe_wall_door, {'bevel': 0.02}), 'plank_door': (plank_door, {}), 'shutter': (shutter, {}),
    'scrap_wall': (scrap_wall, {}), 'scrap_wall_low': (scrap_wall_low, {}),
    'tin_roof_flat': (tin_roof_flat, {}), 'tin_roof_lean': (tin_roof_lean, {}), 'plank_floor': (plank_floor, {}), 'porch': (porch, {}),
    'well': (well, {'smooth': True, 'split_angle': 40}), 'windpump': (windpump, {'smooth': True, 'split_angle': 40}),
    'water_tank': (water_tank, {'smooth': True, 'split_angle': 40}), 'crate_stack': (crate_stack, {'bevel': 0.01}),
    'barrel_rust': (barrel_rust, {'smooth': True, 'split_angle': 40}), 'fence_post': (fence_post, {}), 'fence_wire': (fence_wire, {'smooth': True, 'split_angle': 40}),
    'awning': (awning, {}), 'market_bench': (market_bench, {}), 'sign_post': (sign_post, {}), 'lamp_post': (lamp_post, {'smooth': True, 'split_angle': 40}),
}
os.makedirs(OUT, exist_ok=True); K.write_folder_meta(OUT, REL)
for name, (fn, kw) in PIECES.items(): piece(name, fn, **kw)
print('frontier kit:', len(PIECES), 'pieces ->', OUT)
