"""People pipeline, candidate A (MakeHuman CC0 data through Blender to Unity Humanoid FBX).

    blender -b --python tools/unity/people/mh_build.py -- <mh data dir> <community packs dir> <out dir>

For each person spec below: the MakeHuman base body with the macro targets (gender, age, muscle, weight, height,
ancestry, breast) and the person's feature targets baked in; a game rig reduced from the default MakeHuman skeleton
to Mecanim-named bones (twist bones, face bones, toes and metacarpals merged into their parents); skin weights; face
feature and expression targets kept as blend shapes; eyes, eyebrows, eyelashes and hair fitted from their MakeHuman
proxies (mhclo) and skinned to the head. Exported as one Humanoid-ready FBX per person with textures beside it.
Material slot names tell the Unity importer which texture to use (skin:<file>, hair:<file>, ...).
"""
import bpy, bmesh, json, math, os, re, sys, hashlib, shutil
from mathutils import Vector
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'kits'))
import kitlib as K

args = sys.argv[sys.argv.index('--') + 1:]
MH, COMMUNITY, OUT = args[0], args[1], args[2]
REL = 'Assets/SecondFace/People/Bakeoff'
TEXOUT = os.path.join(OUT, 'tex')
SCALE = 0.1   # MakeHuman decimetres -> metres

# ----------------------------------------------------------------------------------------------------------------
# MakeHuman data
# ----------------------------------------------------------------------------------------------------------------
def read_obj(path, keep_groups=None):
    verts, vts, faces, group = [], [], [], None
    for line in open(path):
        if line.startswith('v '):
            x, y, z = map(float, line.split()[1:4]); verts.append((x, y, z))
        elif line.startswith('vt '):
            u, v = map(float, line.split()[1:3]); vts.append((u, v))
        elif line.startswith('g '):
            group = line.split(None, 1)[1].strip()
        elif line.startswith('f '):
            if keep_groups is not None and group not in keep_groups: continue
            f = []
            for tok in line.split()[1:]:
                p = tok.split('/')
                f.append((int(p[0]) - 1, int(p[1]) - 1 if len(p) > 1 and p[1] else -1))
            faces.append(f)
    return verts, vts, faces

def read_target(path):
    out = []
    for line in open(path):
        if line.startswith('#') or not line.strip(): continue
        p = line.split()
        out.append((int(p[0]), float(p[1]), float(p[2]), float(p[3])))
    return out

def read_mhclo(path):
    meta, refs, deletes, section = {}, [], [], None
    for line in open(path):
        if line.startswith('#') or not line.strip(): continue
        p = line.strip().split()
        if p[0] == 'verts': section = 'verts'; continue
        if p[0] == 'delete_verts': section = 'delete'; continue
        if section == 'verts' and re.match(r'^-?\d', p[0]):
            if len(p) == 1: refs.append((int(p[0]), 0, 0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0))
            else: refs.append(tuple([int(p[0]), int(p[1]), int(p[2])] + [float(x) for x in p[3:9]]))
            continue
        if section == 'delete' and re.match(r'^\d', p[0]):
            i = 0
            while i < len(p):
                if i + 2 < len(p) and p[i + 1] == '-': deletes.extend(range(int(p[i]), int(p[i + 2]) + 1)); i += 3
                else: deletes.append(int(p[i])); i += 1
            continue
        meta[p[0]] = p[1:]
    return meta, refs, deletes

def read_mhmat(path):
    d = {}
    for line in open(path, errors='ignore'):
        if line.startswith('#') or line.startswith('//') or not line.strip(): continue
        p = line.split(None, 1)
        if len(p) == 2: d[p[0]] = p[1].strip()
    return d

def find_dir(name, *roots):
    for r in roots:
        for dp, dn, fn in os.walk(r):
            if os.path.basename(dp) == name and any(f.endswith('.mhclo') or f.endswith('.mhmat') for f in fn): return dp
    return None

# ----------------------------------------------------------------------------------------------------------------
# Macro weighting (port of src/engine/assets/human/shape.ts macroTargets)
# ----------------------------------------------------------------------------------------------------------------
def tri(v):
    v = max(0.0, min(1.0, v))
    return {'min': (0.5 - v) / 0.5, 'average': v / 0.5, 'max': 0.0} if v < 0.5 else {'min': 0.0, 'average': (1 - v) / 0.5, 'max': (v - 0.5) / 0.5}

def macro_targets(p):
    g = {'female': 1 - p['gender'], 'male': p['gender']}
    old = max(0.0, min(1.0, (p['age'] - 25) / 65.0)); a = {'young': 1 - old, 'old': old}
    mu, we = tri(p['muscle']), tri(p['weight'])
    es = (p['african'] + p['asian'] + p['caucasian']) or 1.0
    eth = {'african': p['african'] / es, 'asian': p['asian'] / es, 'caucasian': p['caucasian'] / es}
    h = {'minheight': (0.5 - p['height']) / 0.5, 'maxheight': 0.0} if p['height'] < 0.5 else {'minheight': 0.0, 'maxheight': (p['height'] - 0.5) / 0.5}
    cup, firm = tri(p.get('breastSize', 0.5)), tri(p.get('breastFirmness', 0.5))
    out = []
    for gn, gw in g.items():
        if gw <= 0: continue
        for an, aw in a.items():
            if aw <= 0: continue
            for en, ew in eth.items():
                if ew > 0: out.append((f'macrodetails/{en}-{gn}-{an}', gw * aw * ew))
            for mn, mw in mu.items():
                if mw <= 0: continue
                for wn, ww in we.items():
                    if ww <= 0: continue
                    base = gw * aw * mw * ww
                    out.append((f'macrodetails/universal-{gn}-{an}-{mn}muscle-{wn}weight', base))
                    for hn, hw in h.items():
                        if hw > 0: out.append((f'macrodetails/height/{gn}-{an}-{mn}muscle-{wn}weight-{hn}', base * hw))
                    if gn == 'female':
                        for cn, cw in cup.items():
                            for fn, fw in firm.items():
                                if cw <= 0 or fw <= 0 or (cn == 'average' and fn == 'average'): continue
                                out.append((f'breast/female-{an}-{mn}muscle-{wn}weight-{cn}cup-{fn}firmness', base * cw * fw))
    return out

FOLDER = {'nose': 'nose', 'mouth': 'mouth', 'chin': 'chin', 'cheek': 'cheek', 'eye': 'eyes', 'eyebrows': 'eyebrows', 'forehead': 'forehead',
          'head': 'head', 'neck': 'neck', 'ear': 'ears', 'torso': 'torso', 'hip': 'hip', 'buttocks': 'buttocks', 'stomach': 'stomach',
          'upperarm': 'armslegs', 'lowerarm': 'armslegs', 'upperleg': 'armslegs', 'lowerleg': 'armslegs', 'upperlegs': 'armslegs',
          'lowerlegs': 'armslegs', 'hand': 'armslegs', 'foot': 'armslegs', 'pelvis': 'pelvis', 'breast': 'breast'}

def modifier_targets(mod, v):
    """Modifier id ('nose-scale-horiz|decr|incr', 'sym:cheek-bones|decr|incr', 'head-oval') + value -> [(target rel path, weight)]."""
    sym = mod.startswith('sym:')
    mod = mod[4:] if sym else mod
    parts = mod.split('|')
    base = parts[0]
    if len(parts) == 3:
        if abs(v) < 1e-4: return []
        name = f'{base}-{parts[2] if v > 0 else parts[1]}'; w = abs(v)
    else:
        name, w = base, v
    folder = FOLDER.get(base.split('-')[0], base.split('-')[0])
    if sym: return [(f'{folder}/l-{name}', w), (f'{folder}/r-{name}', w)]
    return [(f'{folder}/{name}', w)]

_tcache = {}
def target(rel):
    if rel not in _tcache:
        p = os.path.join(MH, 'targets', rel + '.target')
        _tcache[rel] = read_target(p) if os.path.exists(p) else None
        if _tcache[rel] is None: print('  missing target', rel)
    return _tcache[rel]

# ----------------------------------------------------------------------------------------------------------------
# The rig: MakeHuman default -> Mecanim game rig
# ----------------------------------------------------------------------------------------------------------------
RENAME = {
    'root': 'Hips', 'spine05': 'Spine', 'spine03': 'Chest', 'spine01': 'UpperChest', 'neck01': 'Neck', 'head': 'Head',
    'eye.L': 'LeftEye', 'eye.R': 'RightEye', 'jaw': 'Jaw',
    'clavicle.L': 'LeftShoulder', 'upperarm01.L': 'LeftUpperArm', 'lowerarm01.L': 'LeftLowerArm', 'wrist.L': 'LeftHand',
    'clavicle.R': 'RightShoulder', 'upperarm01.R': 'RightUpperArm', 'lowerarm01.R': 'RightLowerArm', 'wrist.R': 'RightHand',
    'upperleg01.L': 'LeftUpperLeg', 'lowerleg01.L': 'LeftLowerLeg', 'foot.L': 'LeftFoot', 'toe1-1.L': 'LeftToes',
    'upperleg01.R': 'RightUpperLeg', 'lowerleg01.R': 'RightLowerLeg', 'foot.R': 'RightFoot', 'toe1-1.R': 'RightToes',
}
FINGERS = {'1': 'Thumb', '2': 'Index', '3': 'Middle', '4': 'Ring', '5': 'Little'}
for side, S in (('L', 'Left'), ('R', 'Right')):
    for n, fname in FINGERS.items():
        for seg, sname in (('1', 'Proximal'), ('2', 'Intermediate'), ('3', 'Distal')):
            RENAME[f'finger{n}-{seg}.{side}'] = f'{S}{fname}{sname}'

def build_rig(skel, verts_mh):
    """Bone -> (name, parent, head, tail, plane normal) for kept bones; dropped bones map to their kept ancestor."""
    bones = skel['bones']; joints = skel['joints']; planes = skel.get('planes', {})
    def jpos(j):
        idx = joints[j]; return Vector([sum(verts_mh[i][k] for i in idx) / len(idx) for k in range(3)])
    kept = {}
    def kept_ancestor(b):
        while b is not None and b not in RENAME: b = bones[b]['parent']
        return b
    for b, d in bones.items():
        if b not in RENAME: continue
        head, tail = jpos(d['head']), jpos(d['tail'])
        normal = None
        pl = planes.get(d.get('rotation_plane'))
        if pl:
            try:
                p0, p1, p2 = (jpos(x) for x in pl); normal = (p1 - p0).cross(p2 - p0)
                if normal.length > 1e-6: normal.normalize()
                else: normal = None
            except KeyError: normal = None
        kept[b] = (RENAME[b], kept_ancestor(d['parent']), head, tail, normal)
    merge = {b: kept_ancestor(b) for b in bones if b not in RENAME}
    return kept, merge

# ----------------------------------------------------------------------------------------------------------------
# People specs for the bake-off (narrative-neutral examples spanning WORLD.md §7)
# ----------------------------------------------------------------------------------------------------------------
# Wardrobe rule (owner, 2026-10-28, binding): every garment must read as this world's — salvaged, re-dyed, patched,
# layered, taped; synthetic and clean only on the megacity rich. Community garment meshes are used for their
# silhouette alone (plain shirts, trousers, boots, coats, hoods, rigs); no prints, logos, modern fashion or costume.
# Their textures are never shipped as they come: each is re-baked by bake_cloth() with the look below.
PALETTE = {
    'canvas_faded': (0.52, 0.48, 0.40), 'olive_wax': (0.30, 0.31, 0.22), 'indigo_faded': (0.26, 0.30, 0.38),
    'rust_dye': (0.48, 0.26, 0.18), 'wool_undyed': (0.62, 0.57, 0.48), 'wool_brown': (0.33, 0.26, 0.20),
    'charcoal': (0.16, 0.16, 0.17), 'bone': (0.72, 0.68, 0.58), 'graphite_synth': (0.12, 0.12, 0.14),
    'wine': (0.30, 0.10, 0.14), 'ochre': (0.60, 0.42, 0.22), 'leather_dark': (0.22, 0.15, 0.11), 'leather_tan': (0.45, 0.32, 0.22),
}
def W(**look): return look

PEOPLE = [
    {'id': 'p1_labourer_m', 'gender': 1.0, 'age': 34, 'muscle': 0.72, 'weight': 0.42, 'height': 0.6, 'african': 0.9, 'asian': 0.0, 'caucasian': 0.1,
     'mods': {'sym:cheek-bones|decr|incr': 0.4, 'chin-width|decr|incr': 0.3, 'nose-scale-horiz|decr|incr': 0.3, 'head-age|decr|incr': 0.2, 'torso-vshape|decr|incr': 0.35, 'sym:upperarm-muscle|decr|incr': 0.4},
     'skin': 'mindfront_skin_male_african_middleage', 'hair': 'culturalibre_hair_05', 'brows': 'mindfront_eyebrows_04', 'eyes': 'brown',
     'clothes': [('elvs_male_shirt_untucked_bd1', W(tint='rust_dye', grime=.5, wear=.6, patch=.3, sat=.2)),
                 ('cortu_cargo_pants', W(tint='canvas_faded', grime=.9, wear=.5, patch=.5, sat=.3)),
                 ('culturalibre_male_boots', W(tint='leather_dark', grime=.7, wear=.3, sat=.6, flat=.2)),
                 ('mindfront_tactical_vest_male', W(tint='olive_wax', grime=.5, wear=.4, sat=.3))]},
    {'id': 'p2_settler_f', 'gender': 0.0, 'age': 26, 'muscle': 0.5, 'weight': 0.38, 'height': 0.42, 'african': 0.08, 'asian': 0.04, 'caucasian': 0.88,
     'mods': {'mouth-upperlip-volume|decr|incr': 0.25, 'nose-hump|decr|incr': 0.2, 'sym:cheek-bones|decr|incr': 0.2, 'hip-scale-horiz|decr|incr': 0.3, 'sym:eye-scale|decr|incr': 0.15},
     'breastSize': 0.5, 'breastFirmness': 0.6, 'skin': 'toigo_light_skin_female_ginger_2', 'hair': 'toigo_inverted_bob', 'brows': 'mindfront_eyebrows_03', 'eyes': 'green',
     'clothes': [('toigo_fisherman_sweater', W(tint='wool_undyed', grime=.3, wear=.3, patch=.3, sat=.2)),
                 ('toigo_wool_pants', W(tint='wool_brown', grime=.6, wear=.4, patch=.2, sat=.2)),
                 ('toigo_ankle_boots_female', W(tint='leather_dark', grime=.6, wear=.3, sat=.6, flat=.2))]},
    {'id': 'p3_drifter_m', 'gender': 1.0, 'age': 61, 'muscle': 0.35, 'weight': 0.12, 'height': 0.5, 'african': 0.0, 'asian': 0.0, 'caucasian': 1.0,
     'mods': {'head-age|decr|incr': 0.5, 'sym:cheek-volume|decr|incr': -0.6, 'sym:eye-bag|decr|incr': 0.4, 'chin-bones|decr|incr': 0.35, 'head-fat|decr|incr': -0.35, 'stomach-tone|decr|incr': -0.3, 'torso-scale-horiz|decr|incr': -0.3},
     'skin': 'jartur69_old_slavic_male_with_genitals_and_beard', 'hair': None, 'brows': 'mindfront_eyebrows_11', 'eyes': 'grey',
     'clothes': [('elvs_male_shirt_untucked_bd1', W(tint='bone', grime=.5, wear=.5, patch=.2, sat=.1)),
                 ('elvs_male_trouser', W(tint='charcoal', grime=.7, wear=.4, patch=.4, sat=.1)),
                 ('mindfront_cardigan_long_open_front', W(tint='olive_wax', grime=.7, wear=.5, patch=.3, sat=.1)),
                 ('maciekg_leather_boots', W(tint='leather_dark', grime=.7, wear=.3, sat=.6, flat=.2)),
                 ('culturalibre_hero-heroine_hood_1', W(tint='olive_wax', grime=.4, wear=.5, patch=.2, sat=.1))]},
    {'id': 'p4_gilded_f', 'gender': 0.0, 'age': 44, 'muscle': 0.42, 'weight': 0.55, 'height': 0.55, 'african': 0.0, 'asian': 0.95, 'caucasian': 0.05,
     'mods': {'sym:eye-epicanthus|in|out': 0.35, 'sym:eye-eyefold-angle|down|up': 0.25, 'nose-hump|decr|incr': -0.2, 'sym:cheek-bones|decr|incr': 0.25, 'head-round': 0.2, 'stomach-tone|decr|incr': -0.2},
     'breastSize': 0.55, 'breastFirmness': 0.45, 'skin': 'onlytheghosts_middle_aged_eurasian_female', 'hair': 'toigo_blunt_bob_with_bangs', 'brows': 'mindfront_eyebrows_10', 'eyes': 'brown',
     'clothes': [('matcreator_mc-skinsuit_2022', W(tint='graphite_synth', grime=0, wear=0, patch=0, sat=.4, flat=.3)),
                 ('mindfront_cardigan_long_open_front', W(tint='wine', grime=0, wear=0, patch=0, sat=.1, tape=[0.62, 1.3], tape_col=(0.55, 0.85, 0.95))),
                 ('toigo_ankle_boots_female', W(tint='charcoal', grime=.1, wear=0, patch=0, sat=.5, flat=.2)),
                 ('spamrakuen_tbm_glasses_frames_01', None)]},
    {'id': 'p5_street_m', 'gender': 1.0, 'age': 21, 'muscle': 0.55, 'weight': 0.3, 'height': 0.48, 'african': 0.12, 'asian': 0.3, 'caucasian': 0.58,
     'mods': {'sym:cheek-bones|decr|incr': 0.3, 'nose-scale-vert|decr|incr': 0.15, 'mouth-scale-horiz|decr|incr': 0.2, 'sym:upperarm-muscle|decr|incr': 0.2},
     'skin': 'toigo_light_skin_male_bronze', 'hair': 'elvs_double_mh_braid', 'brows': 'mindfront_eyebrows_13', 'eyes': 'brown',
     'clothes': [('elvs_hooded_sweat_jacket1', W(tint='charcoal', grime=.4, wear=.5, patch=.2, sat=.1, tape=[0.98], tape_col=(0.82, 0.8, 0.7))),
                 ('cortu_cargo_pants', W(tint='indigo_faded', grime=.7, wear=.5, patch=.3, sat=.2, tape=[0.5, 0.12], tape_col=(0.82, 0.8, 0.7))),
                 ('culturalibre_sneakers', W(tint='charcoal', grime=.5, wear=.3, patch=0, sat=.4, flat=.3))]},
    {'id': 'p6_nomad_f', 'gender': 0.0, 'age': 68, 'muscle': 0.5, 'weight': 0.3, 'height': 0.45, 'african': 0.03, 'asian': 0.6, 'caucasian': 0.37,
     'mods': {'head-age|decr|incr': 0.6, 'sym:cheek-bones|decr|incr': 0.45, 'nose-scale-vert|decr|incr': 0.2, 'nose-hump|decr|incr': 0.25, 'sym:cheek-volume|decr|incr': -0.4, 'chin-width|decr|incr': 0.2, 'sym:eye-bag|decr|incr': 0.3},
     'breastSize': 0.4, 'breastFirmness': 0.2, 'skin': 'darthfurby_caucasian_female', 'hair': 'sonntag78_junglebook_hair', 'brows': 'mindfront_eyebrows_14', 'eyes': 'brownlight',
     'clothes': [('rehmanpolanski_viking_tunic', W(tint='ochre', grime=.5, wear=.7, patch=.5, sat=.2)),
                 ('toigo_wool_pants', W(tint='indigo_faded', grime=.7, wear=.6, patch=.3, sat=.2)),
                 ('punkduck_winter_boots', W(tint='leather_tan', grime=.6, wear=.3, patch=0, sat=.5, flat=.2))]},
]

# Blend shapes kept on every exported body: a face sculptor set (incr/decr pairs) and expression units.
FACE_SHAPES = [
    'nose-scale-horiz|decr|incr', 'nose-scale-vert|decr|incr', 'nose-hump|decr|incr', 'nose-nostrils-width|decr|incr', 'nose-point-width|decr|incr',
    'nose-volume|decr|incr', 'mouth-scale-horiz|decr|incr', 'mouth-upperlip-volume|decr|incr', 'mouth-lowerlip-volume|decr|incr', 'mouth-angles|down|up',
    'chin-prominent|decr|incr', 'chin-width|decr|incr', 'chin-height|decr|incr', 'chin-bones|decr|incr', 'chin-cleft|decr|incr',
    'sym:cheek-bones|decr|incr', 'sym:cheek-volume|decr|incr', 'sym:eye-scale|decr|incr', 'sym:eye-trans|in|out', 'sym:eye-epicanthus|in|out',
    'sym:eye-bag|decr|incr', 'eyebrows-trans|down|up', 'eyebrows-angle|down|up', 'sym:ear-scale|decr|incr', 'forehead-scale-vert|decr|incr',
    'head-scale-horiz|decr|incr', 'head-fat|decr|incr', 'head-age|decr|incr', 'neck-scale-horiz|decr|incr',
    'head-oval', 'head-round', 'head-square', 'head-rectangular', 'head-triangular', 'head-diamond',
]

def expression_units():
    out = []
    root = os.path.join(MH, 'targets', 'expression', 'units', 'caucasian')
    if not os.path.isdir(root): root = os.path.join(MH, 'targets', 'expression', 'units')
    wanted = ('eye-left-closure', 'eye-right-closure', 'mouth-open', 'mouth-smile', 'mouth-frown', 'brow-left-up', 'brow-right-up', 'brow-down',
              'lips-part', 'eye-left-opened-up', 'eye-right-opened-up', 'nose-wrinkle', 'mouth-pucker', 'jaw-drop')
    if os.path.isdir(root):
        for f in sorted(os.listdir(root)):
            if f.endswith('.target') and any(f.startswith(w) for w in wanted): out.append(('expression/units/' + os.path.basename(root) + '/' + f[:-7], 'expr_' + f[:-7]))
    return out

# ----------------------------------------------------------------------------------------------------------------
# Build
# ----------------------------------------------------------------------------------------------------------------
def guid(rel): return hashlib.md5(('second-face:' + rel).encode()).hexdigest()

def write_tex_meta(path, rel, kind):
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
    import assets as A
    with open(path + '.meta', 'w') as f: f.write(A.meta(rel, kind))

def copy_texture(src, name, kind='d'):
    """Copies a texture beside the people as <name>.png (resized to 2048 at most) with a stable meta."""
    os.makedirs(TEXOUT, exist_ok=True)
    dst = os.path.join(TEXOUT, name + '.png')
    if not os.path.exists(dst):
        im = bpy.data.images.load(src)
        w, h = im.size
        if max(w, h) > 2048:
            f = 2048 / max(w, h); im.scale(max(1, int(w * f)), max(1, int(h * f)))
        im.filepath_raw = dst; im.file_format = 'PNG'; im.save()
        bpy.data.images.remove(im)
    write_tex_meta(dst, f'{REL}/tex/{name}.png', kind)
    return name

def bake_cloth(po, src, name, look):
    """Bakes a worn, re-dyed cloth onto the garment's UVs (1K): its own weave desaturated under a palette tint, grime
    rising from the hem, sun-fade, patches of other cloth, and tape bands (reflective tape on the street, a lit trim on
    the rich). The source texture is never shipped; this is what makes a community mesh this world's garment."""
    os.makedirs(TEXOUT, exist_ok=True)
    dst = os.path.join(TEXOUT, name + '.png')
    # palette and look colours are written as seen (sRGB); the node tree works in linear, the bake saves sRGB
    lin = lambda c: tuple(x ** 2.2 for x in c)
    tint = lin(PALETTE[look.get('tint', 'canvas_faded')])
    zs = [vtx.co.z for vtx in po.data.vertices]
    zmin, zmax = (min(zs), max(zs)) if zs else (0.0, 1.0)
    if zmax - zmin < 0.05: zmax = zmin + 0.05
    img = bpy.data.images.new('bake_' + name, 1024, 1024)
    mat = bpy.data.materials.new('bake_' + name); mat.use_nodes = True
    nt = mat.node_tree; nt.nodes.clear(); N = nt.nodes; L = nt.links
    def mixrgb(blend, fac, a, b):
        m = N.new('ShaderNodeMixRGB'); m.blend_type = blend
        if isinstance(fac, (int, float)): m.inputs['Fac'].default_value = float(fac)
        else: L.new(fac, m.inputs['Fac'])
        for sock, val in (('Color1', a), ('Color2', b)):
            if isinstance(val, tuple): m.inputs[sock].default_value = (*val, 1.0)
            else: L.new(val, m.inputs[sock])
        return m.outputs['Color']
    def math(op, a, b=None):
        m = N.new('ShaderNodeMath'); m.operation = op
        for i, val in enumerate((a, b)):
            if val is None: continue
            if isinstance(val, (int, float)): m.inputs[i].default_value = float(val)
            else: L.new(val, m.inputs[i])
        return m.outputs[0]
    def noise(scale, detail=2.0):
        n = N.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = detail
        L.new(tc.outputs['Object'], n.inputs['Vector']); return n.outputs['Fac']
    tc = N.new('ShaderNodeTexCoord')
    sep = N.new('ShaderNodeSeparateXYZ'); L.new(tc.outputs['Object'], sep.inputs[0]); z = sep.outputs['Z']
    out = N.new('ShaderNodeOutputMaterial'); em = N.new('ShaderNodeEmission'); L.new(em.outputs[0], out.inputs[0])
    # base: the garment's own weave, desaturated and flattened towards grey, under the tint
    if src:
        t = N.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(src)
        hsv = N.new('ShaderNodeHueSaturation'); hsv.inputs['Saturation'].default_value = look.get('sat', 0.3)
        L.new(t.outputs['Color'], hsv.inputs['Color'])
        base = mixrgb('MIX', look.get('flat', 0.5), hsv.outputs['Color'], (0.4, 0.4, 0.4))
    else:
        base = mixrgb('MIX', 1.0, (0.4, 0.4, 0.4), (0.4, 0.4, 0.4))
    col = mixrgb('MULTIPLY', 1.0, base, tuple(min(1.0, c / 0.4) for c in tint))
    # weave: fine noise, 0.85..1.15
    fine = math('ADD', math('MULTIPLY', noise(70.0, 3.0), 0.3), 0.85)
    cxyz = N.new('ShaderNodeCombineXYZ')
    for i in range(3): L.new(fine, cxyz.inputs[i])
    col = mixrgb('MULTIPLY', 1.0, col, cxyz.outputs[0])
    big = noise(2.5)
    # patches of other cloth (noise cells above a threshold)
    patch = look.get('patch', 0.0)
    if patch > 0:
        mask = math('GREATER_THAN', noise(1.8, 1.0), 1.0 - 0.35 * patch)
        pcol = tuple(min(1.0, c * 0.75 + 0.06) for c in (tint[2], tint[1], tint[0]))
        col = mixrgb('MIX', mask, col, lin(pcol))
    # sun-fade towards bone where the big noise is high
    wear = look.get('wear', 0.0)
    if wear > 0: col = mixrgb('MIX', math('MULTIPLY', math('MULTIPLY', big, big), wear * 0.7), col, lin((0.78, 0.75, 0.68)))
    # grime rising from the hem
    grime = look.get('grime', 0.0)
    if grime > 0:
        mr = N.new('ShaderNodeMapRange'); L.new(z, mr.inputs['Value'])
        mr.inputs['From Min'].default_value = zmin; mr.inputs['From Max'].default_value = zmax
        mr.inputs['To Min'].default_value = 1.0; mr.inputs['To Max'].default_value = 0.0
        hem = math('POWER', mr.outputs['Result'], 2.2)
        gf = math('MULTIPLY', math('MULTIPLY', hem, math('ADD', math('MULTIPLY', big, 0.6), 0.4)), grime * 0.8)
        col = mixrgb('MIX', gf, col, lin((0.20, 0.17, 0.13)))
    # tape bands at given heights (metres from the ground)
    for zb in look.get('tape', []):
        band = math('LESS_THAN', math('ABSOLUTE', math('SUBTRACT', z, zb)), 0.014)
        col = mixrgb('MIX', band, col, lin(look.get('tape_col', (0.8, 0.8, 0.75))))
    L.new(col, em.inputs['Color'])
    tgt = N.new('ShaderNodeTexImage'); tgt.image = img; N.active = tgt
    po.data.materials.clear(); po.data.materials.append(mat)
    bpy.ops.object.select_all(action='DESELECT'); po.select_set(True); bpy.context.view_layer.objects.active = po
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = 1; sc.cycles.device = 'CPU'
    sc.render.bake.margin = 6; sc.render.bake.use_clear = True
    bpy.ops.object.bake(type='EMIT')
    img.filepath_raw = dst; img.file_format = 'PNG'; img.save()
    po.data.materials.clear()
    bpy.data.images.remove(img); bpy.data.materials.remove(mat)
    write_tex_meta(dst, f'{REL}/tex/{name}.png', 'd')
    return name

skel = json.load(open(os.path.join(MH, 'rigs', 'default.mhskel')))
weights_mh = json.load(open(os.path.join(MH, 'rigs', 'default_weights.mhw')))['weights']
base_verts, base_vts, body_faces = read_obj(os.path.join(MH, '3dobjs', 'base.obj'), keep_groups={'body'})
NV = len(base_verts)
print('base', NV, 'verts;', len(body_faces), 'body faces')

def build_person(spec):
    K.reset(); K._mats.clear()
    v = [list(p) for p in base_verts]
    # macro + feature targets baked into the rest shape
    applied = 0
    for rel, w in macro_targets(spec):
        t = target(rel)
        if not t: continue
        for i, dx, dy, dz in t: v[i][0] += dx * w; v[i][1] += dy * w; v[i][2] += dz * w
        applied += 1
    for mod, val in spec.get('mods', {}).items():
        for rel, w in modifier_targets(mod, val):
            t = target(rel)
            if not t: continue
            for i, dx, dy, dz in t: v[i][0] += dx * w; v[i][1] += dy * w; v[i][2] += dz * w
            applied += 1
    print(f'{spec["id"]}: {applied} targets baked')
    body_idx = sorted({i for f in body_faces for i, _ in f})
    ground = min(v[i][1] for i in body_idx)
    to_bl = lambda p: Vector((p[0] * SCALE, -p[2] * SCALE, (p[1] - ground) * SCALE))
    to_bl_dir = lambda p: Vector((p[0] * SCALE, -p[2] * SCALE, p[1] * SCALE))

    # --- body mesh (body group only, minus the vertices the clothes hide), uv from vt
    hidden = set()
    for g, _ in spec.get('clothes', []):
        d = find_dir(g, COMMUNITY, os.path.join(MH, 'clothes'))
        if d is None: print('  no garment', g); continue
        _, _, dels = read_mhclo(os.path.join(d, g + '.mhclo'))
        hidden.update(dels)
    faces_kept = [f for f in body_faces if not all(i in hidden for i, _ in f)]
    used = sorted({i for f in faces_kept for i, _ in f})
    remap = {i: k for k, i in enumerate(used)}
    me = bpy.data.meshes.new('Body')
    me.from_pydata([to_bl(v[i]) for i in used], [], [[remap[i] for i, _ in f] for f in faces_kept])
    uv = me.uv_layers.new(name='UVMap')
    li = 0
    for f in faces_kept:
        for _, vt in f:
            uv.data[li].uv = base_vts[vt] if vt >= 0 else (0, 0); li += 1
    me.validate(); me.update()
    for p in me.polygons: p.use_smooth = True
    body = bpy.data.objects.new('Body', me); bpy.context.scene.collection.objects.link(body)
    body.data.materials.append(K.mat('skin:' + spec['skin'] + '_d'))

    # --- blend shapes relative to the baked body
    body.shape_key_add(name='Basis', from_mix=False)
    def add_shape(name, deltas, w=1.0):
        sk = body.shape_key_add(name=name, from_mix=False)
        for i, dx, dy, dz in deltas:
            if i in remap:
                k = remap[i]; d = to_bl_dir((dx * w, dy * w, dz * w)); sk.data[k].co = sk.data[k].co + d
    nshapes = 0
    for mod in FACE_SHAPES:
        parts = mod[4:].split('|') if mod.startswith('sym:') else mod.split('|')
        if len(parts) == 3:
            for sign, label in ((1.0, parts[2]), (-1.0, parts[1])):
                ds = []
                for rel, w in modifier_targets(mod, sign):
                    t = target(rel)
                    if t: ds.extend(t)
                if ds: add_shape(f'{parts[0]}-{label}', ds); nshapes += 1
        else:
            ds = []
            for rel, w in modifier_targets(mod, 1.0):
                t = target(rel)
                if t: ds.extend(t)
            if ds: add_shape(parts[0], ds); nshapes += 1
    for rel, name in expression_units():
        t = target(rel)
        if t: add_shape(name, t); nshapes += 1
    print(f'  {nshapes} blend shapes')

    # --- armature
    kept, merge = build_rig(skel, v)
    arm = bpy.data.armatures.new('Rig'); rig = bpy.data.objects.new(spec['id'], arm); bpy.context.scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')
    eb = {}
    order = []
    def visit(b):
        for c, d in kept.items():
            if d[1] == b: order.append(c); visit(c)
    roots = [b for b, d in kept.items() if d[1] is None]
    for r in roots: order.append(r); visit(r)
    for b in order:
        name, parent, head, tail, normal = kept[b]
        e = arm.edit_bones.new(name); e.head = to_bl(head); e.tail = to_bl(tail)
        if (e.tail - e.head).length < 0.005: e.tail = e.head + Vector((0, 0, 0.02))
        if normal is not None: e.align_roll(to_bl_dir(normal))
        if parent: e.parent = eb[parent]; e.use_connect = False
        eb[b] = e
    bpy.ops.object.mode_set(mode='OBJECT')

    # --- skin weights (merged into kept bones)
    groups = {}
    for b, wl in weights_mh.items():
        kb = b if b in kept else merge.get(b)
        if kb is None: continue
        g = groups.setdefault(kept[kb][0], {})
        for i, w in wl:
            if i in remap: g[remap[i]] = g.get(remap[i], 0.0) + w
    for name, g in groups.items():
        vg = body.vertex_groups.new(name=name)
        for k, w in g.items(): vg.add([k], min(1.0, w), 'REPLACE')
    # proxies take their weights from the base vertices they reference, hidden or helper vertices included: a garment
    # sits exactly where the body beneath it is deleted, so the kept-vertex map above must not be used for them
    inv_all = {}
    for b, wl in weights_mh.items():
        kb = b if b in kept else merge.get(b)
        if kb is None: continue
        for i, w in wl: inv_all.setdefault(i, []).append((kept[kb][0], w))
    mod = body.modifiers.new('Armature', 'ARMATURE'); mod.object = rig
    body.parent = rig

    # --- proxies: eyes, brows, lashes, hair fitted by mhclo
    def proxy(kind, folder_name, name, mat_name, tex_name=None, mat_override=None, skin_to=None, look=None):
        d = find_dir(name, os.path.join(MH, folder_name), COMMUNITY)
        if d is None: print('  no proxy', name); return None
        meta, refs, deletes = read_mhclo(os.path.join(d, name + '.mhclo'))
        pv, pvt, pf = read_obj(os.path.join(d, meta['obj_file'][0]))
        scale = {}
        for ax in ('x_scale', 'y_scale', 'z_scale'):
            if ax in meta:
                # MakeHuman proxy.py TMatrix.getScale: the third value is the reference distance the offsets were authored at
                a, b, den = int(meta[ax][0]), int(meta[ax][1]), float(meta[ax][2])
                scale[ax[0]] = abs(v[a][('xyz'.index(ax[0]))] - v[b][('xyz'.index(ax[0]))]) / (den or 1.0)
        sx, sy, sz = scale.get('x', 1.0), scale.get('y', 1.0), scale.get('z', 1.0)
        fitted = []
        for r in refs:
            i0, i1, i2, w0, w1, w2, ox, oy, oz = r
            p = [w0 * v[i0][k] + w1 * v[i1][k] + w2 * v[i2][k] for k in range(3)]
            p[0] += ox * sx; p[1] += oy * sy; p[2] += oz * sz
            fitted.append(p)
        pm = bpy.data.meshes.new(kind)
        pm.from_pydata([to_bl(p) for p in fitted], [], [[i for i, _ in f] for f in pf])
        puv = pm.uv_layers.new(name='UVMap'); li = 0
        for f in pf:
            for _, vt in f: puv.data[li].uv = pvt[vt] if vt >= 0 and vt < len(pvt) else (0, 0); li += 1
        pm.validate(); pm.update()
        for p in pm.polygons: p.use_smooth = True
        po = bpy.data.objects.new(kind, pm); bpy.context.scene.collection.objects.link(po)
        # material and texture
        mat_path = os.path.join(d, mat_override or meta.get('material', [name + '.mhmat'])[0])
        tex = None
        mm = read_mhmat(mat_path) if os.path.exists(mat_path) else {}
        if mm or look is not None:
            src_d = None
            if 'diffuseTexture' in mm:
                tp = os.path.join(os.path.dirname(mat_path), mm['diffuseTexture'])
                if os.path.exists(tp): src_d = tp
            if look is not None: tex = bake_cloth(po, src_d, (tex_name or name) + '_d', look)
            elif src_d: tex = copy_texture(src_d, (tex_name or name) + '_d')
            if tex and 'normalmapTexture' in mm:
                tp = os.path.join(os.path.dirname(mat_path), mm['normalmapTexture'])
                if os.path.exists(tp): copy_texture(tp, (tex_name or name) + '_n', 'n')
        po.data.materials.append(K.mat(f'{mat_name}:{tex or "none"}'))
        # skinning: weights of the first reference vertex (eyes to the eye bones)
        if skin_to:
            vg = po.vertex_groups.new(name=skin_to); vg.add(list(range(len(fitted))), 1.0, 'REPLACE')
        else:
            vgs = {}
            for pi, r in enumerate(refs):
                acc = {}
                for k in range(3):
                    for name_g, w in inv_all.get(r[k], []): acc[name_g] = acc.get(name_g, 0.0) + w * r[3 + k]
                tot = sum(acc.values()) or 1.0
                for name_g, w in acc.items(): vgs.setdefault(name_g, []).append((pi, w / tot))
            for name_g, lst in vgs.items():
                vg = po.vertex_groups.new(name=name_g)
                for pi, w in lst: vg.add([pi], min(1.0, w), 'REPLACE')
        m = po.modifiers.new('Armature', 'ARMATURE'); m.object = rig
        po.parent = rig
        return po
    # The MakeHuman data ships one eye texture (brown); other colours are tints applied by the material in Unity.
    proxy('Eyes', 'eyes', 'high-poly', 'eyes', tex_name='eye_brown', mat_override='../materials/brown.mhmat', skin_to='Head')
    if spec.get('brows'): proxy('Brows', 'eyebrows', spec['brows'], 'brows')
    proxy('Lashes', 'eyelashes', 'mindfront_eyelashes_01', 'lashes')
    if spec.get('hair'): proxy('Hair', 'hair', spec['hair'], 'hair')
    # baked cloth is per person (the same mesh is dyed differently on different people), so the texture carries the id
    for g, look in spec.get('clothes', []): proxy('Cloth_' + g, 'clothes', g, 'cloth', look=look, tex_name=(spec['id'] + '__' + g) if look is not None else None)

    # --- skin textures beside the model
    sd = find_dir(spec['skin'], COMMUNITY, os.path.join(MH, 'skins'))
    if sd:
        mm = read_mhmat(os.path.join(sd, spec['skin'] + '.mhmat'))
        for key, suffix, kind in (('diffuseTexture', '_d', 'd'), ('normalmapTexture', '_n', 'n'), ('bumpmapTexture', '_n', 'n')):
            if key in mm:
                tp = os.path.join(sd, mm[key])
                if os.path.exists(tp): copy_texture(tp, spec['skin'] + suffix, kind)
    else:
        print('  no skin', spec['skin'])

    # --- export
    path = os.path.join(OUT, spec['id'] + '.fbx')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.fbx(filepath=path, use_selection=True, apply_scale_options='FBX_SCALE_ALL', axis_forward='-Z', axis_up='Y',
                             mesh_smooth_type='FACE', use_mesh_modifiers=False, add_leaf_bones=False, bake_anim=False, path_mode='STRIP',
                             embed_textures=False, use_armature_deform_only=False, primary_bone_axis='Y', secondary_bone_axis='X')
    K.write_model_meta(path, f'{REL}/{spec["id"]}.fbx')
    print('  wrote', path)

os.makedirs(OUT, exist_ok=True)
K.write_folder_meta(OUT, REL)
os.makedirs(TEXOUT, exist_ok=True); K.write_folder_meta(TEXOUT, REL + '/tex')
only = os.environ.get('ONLY')
for spec in PEOPLE:
    if only and spec['id'] not in only.split(','): continue
    build_person(spec)
print('people bake-off: done')
