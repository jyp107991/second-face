"""People pipeline, candidate A (MakeHuman CC0 data through Blender to Unity Humanoid FBX).

    blender -b --python tools/unity/people/mh_build.py -- <mh data dir> <community packs dir> <out dir>
    (env BRIEF=<briefs/*.json> REL=<the out dir's Assets path> ONLY=<id,id>)

For each person spec below: the MakeHuman base body with the macro targets (gender, age, muscle, weight, height,
ancestry, breast) and the person's feature targets baked in; a game rig reduced from the default MakeHuman skeleton
to Mecanim-named bones (twist bones, face bones, toes and metacarpals merged into their parents); skin weights; face
feature and expression targets kept as blend shapes; eyes, eyebrows, eyelashes and hair fitted from their MakeHuman
proxies (mhclo) and skinned to the head. Exported as one Humanoid-ready FBX per person with textures beside it.
Material slot names tell the Unity importer which texture to use (skin:<file>, hair:<file>, ...).
"""
import bpy, bmesh, json, math, os, re, sys, hashlib, shutil
from mathutils import Vector
from mathutils.kdtree import KDTree
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'kits'))
import kitlib as K
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hairgen

args = sys.argv[sys.argv.index('--') + 1:]
MH, COMMUNITY, OUT = args[0], args[1], args[2]
REL = os.environ.get('REL', 'Assets/SecondFace/People/Bakeoff')   # where OUT lies in the Unity project (for the metas)
# hair of our own (hairgen.py, BUILD_PLAN §6.C): generated proxies, found by name like the packs' (sf_bun, sf_braid, ...)
GENERATED = os.environ.get('HAIRGEN_DIR', os.path.join(os.path.expanduser('~'), '.cache', 'second-face', 'hairgen'))
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
    # no Jaw: body clips carry no jaw motion and Humanoid retargeting then poses a mapped jaw open (every mouth gaped
    # once all the test people animated); the jaw merges into Head and speech uses the expression shapes
    'eye.L': 'LeftEye', 'eye.R': 'RightEye',
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
    # the uniforms of the dead (WORLD.md §7), ninety years faded: warden grey, dock-company orange, rail-crew hi-vis,
    # clinic whites; and a river green
    'warden_grey': (0.40, 0.41, 0.42), 'dock_orange': (0.66, 0.36, 0.17), 'hivis_faded': (0.70, 0.62, 0.24),
    'clinic_white': (0.78, 0.77, 0.72), 'river_green': (0.27, 0.33, 0.28),
}
def W(**look): return look

# Garments whose community texture carries a print, a logo, lettering or a fashion motif (wardrobe rule: none of
# those): the bake flattens their own texture at least this far towards plain grey, so only the dye, the weave noise
# and the wear show. Checked on a contact sheet of every garment the briefs use (P4.1).
PRINTED = {
    'drednicolson_asymmetric_tunic_and_sash': 0.95, 'toigo_harem_pants': 0.95, 'elvs_emt_uniform_jacket_female': 0.95,
    'elvs_emt_uniform_jacket_male': 0.95, 'elvs_racing_fire_suit_female1': 0.95, 'elvs_racing_fire_suit_male1': 0.95,
    'elvs_zombie_killer_sneakers': 0.95, 'punkduck_running_shoes_01': 0.95, 'elvs_covid_goggles1': 0.95,
    'punkduck_goggles': 0.9, 'mindfront_female_trousers_1': 0.85, 'mindfront_patrol_cap': 0.85, 'culturalibre_bandana_mask': 0.85,
    'punkduck_medieval_boots': 0.85, 'punkduck_wetsuit': 0.85, 'mindfront_lusekofta': 0.75, 'mindfront_sherpa_hat': 0.75,
    'elvs_male_logo_tshirt1': 0.95, 'drednicolson_short-tail_camo_tee': 0.95, 'punkduck_deathnote_t-shirt': 0.95,
}
# Garments that cover the body without deleting the skin under them (their mhclo has no delete_verts): the body's
# vertices they are fitted to are hidden, or the skin shows through. The `donitz_monk_robe_hood*` garments are the hood
# alone (fitted to the head and shoulders), worn over `donitz_monk_robe`: on their own they leave the wearer naked.
COVERS = {'donitz_monk_robe', 'donitz_monk_robe_hood', 'donitz_monk_robe_hood_down', 'donitz_monk_robe_hood_off', 'maciekg_wizard_robe'}

# Hair rule (owner, 2026-10-28, binding): gritty and functional — shaved or buzzed, cropped uneven, tied back, rough
# braids, long hair matted under a wrap or hood, balding; dull, dusty, sun-bleached or greying; never a styled cut,
# product, bob, bangs or salon shape (the megacity's rich keep it tidy: that is their costume). Card hair is re-coloured
# by bake_hair() to a dull natural colour with dust and grey; shaved and balding heads are stubble painted into the
# person's own skin texture by bake_skin() (a buzz cut is a texture, not a mesh), which also weathers the face:
# skin_look = W(sun, grime, lips (how chapped), beard (stubble density), beard_colour).
HAIR_COLOURS = {   # as seen (sRGB), already dulled
    'black': (0.075, 0.065, 0.06), 'black_brown': (0.12, 0.09, 0.075), 'dark_brown': (0.19, 0.13, 0.09),
    'brown': (0.28, 0.19, 0.13), 'dull_auburn': (0.36, 0.2, 0.12), 'ash_blonde': (0.5, 0.44, 0.35), 'grey': (0.56, 0.54, 0.51),
}

# The people themselves are briefs (tools/unity/people/briefs/*.json, P4.1): BRIEF names the file (the bake-off's by default)
BRIEF = os.environ.get('BRIEF', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'briefs', 'bakeoff.json'))
_brief = json.load(open(BRIEF))
PEOPLE = [{**_brief.get('defaults', {}), **p} for p in _brief['people']]

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

def copy_texture(src, name, kind='d', size=2048):
    """Copies a texture beside the people as <name>.png (resized to `size` at most) with a stable meta; normal maps
    are written without alpha (RGB)."""
    import numpy as np
    os.makedirs(TEXOUT, exist_ok=True)
    dst = os.path.join(TEXOUT, name + '.png')
    if not os.path.exists(dst):
        im = bpy.data.images.load(src)
        w, h = im.size
        if max(w, h) > size:
            f = size / max(w, h); im.scale(max(1, int(w * f)), max(1, int(h * f))); w, h = im.size
        if kind == 'n':
            px = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(px); bpy.data.images.remove(im)
            im = bpy.data.images.new('n_' + name, w, h, alpha=False); im.colorspace_settings.name = 'Non-Color'
            px = px.reshape(-1, 4); px[:, 3] = 1.0; im.pixels.foreach_set(px.ravel())
        im.filepath_raw = dst; im.file_format = 'PNG'
        if kind == 'n': im.alpha_mode = 'NONE'
        im.save()
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

def smooth_noise(w, h, cells, rng):
    """Value noise in [0, 1] over a w×h image: a (cells+1)² random grid, smoothstep-interpolated."""
    import numpy as np
    g = rng.random((cells + 1, cells + 1))
    ys, xs = np.linspace(0, cells, h), np.linspace(0, cells, w)
    y0, x0 = np.minimum(ys.astype(int), cells - 1), np.minimum(xs.astype(int), cells - 1)
    ty, tx = (ys - y0)[:, None], (xs - x0)[None, :]
    ty, tx = ty * ty * (3 - 2 * ty), tx * tx * (3 - 2 * tx)
    return (g[y0][:, x0] * (1 - tx) * (1 - ty) + g[y0][:, x0 + 1] * tx * (1 - ty)
            + g[y0 + 1][:, x0] * (1 - tx) * ty + g[y0 + 1][:, x0 + 1] * tx * ty)

def bake_hair(src, name, look, size=1024):
    """Re-colours a hair card texture by the hair rule: the strands' own light and dark kept as detail under one dull
    natural colour, dust in large patches, greying in broad streaks by `grey`; alpha untouched."""
    import numpy as np
    os.makedirs(TEXOUT, exist_ok=True)
    dst = os.path.join(TEXOUT, name + '.png')
    im = bpy.data.images.load(src)
    w, h = im.size
    if max(w, h) > size:
        f = size / max(w, h); im.scale(max(1, int(w * f)), max(1, int(h * f))); w, h = im.size
    px = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(px); px = px.reshape(h, w, 4)
    rgb, a = px[..., :3], px[..., 3]
    lum = rgb @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    solid = a > 0.5
    mean = float(lum[solid].mean()) if solid.any() else float(lum.mean())
    detail = 1.0 + (np.clip(lum / max(mean, 1e-3), 0.3, 1.9) - 1.0) * 0.8
    out = detail[..., None] * np.array(HAIR_COLOURS[look.get('colour', 'brown')], np.float32)
    rng = np.random.default_rng(int(hashlib.md5(name.encode()).hexdigest()[:8], 16))
    dust = look.get('dust', 0.0) * smooth_noise(w, h, 6, rng) ** 1.5
    out = out * (1 - 0.55 * dust[..., None]) + np.array([0.5, 0.45, 0.37], np.float32) * (0.55 * dust[..., None])
    grey = look.get('grey', 0.0)
    if grey > 0:   # greying in broad streaks over the strands' own detail (per-pixel grey hairs read as sparkle)
        g = (grey * (0.45 + 0.55 * smooth_noise(w, h, 9, rng)))[..., None]
        out = out * (1 - g) + detail[..., None] * np.array(HAIR_COLOURS['grey'], np.float32) * g
    px[..., :3] = np.clip(out, 0, 1)
    im.pixels.foreach_set(px.ravel())
    im.filepath_raw = dst; im.file_format = 'PNG'; im.save()
    bpy.data.images.remove(im)
    write_tex_meta(dst, f'{REL}/tex/{name}.png', 'd')
    return name

# the head model (head_angles, smoothstep, hair_weight) lives in hairgen.py, shared with the generated hair
from hairgen import head_angles, smoothstep, hair_weight

def beard_weight(P, top, eye, lips):
    """Beard stubble weight: below a line from under the nose across the cheeks to the sideburns, fading down the
    neck, none behind the ears or on the lips. Tuned like hair_weight."""
    import numpy as np
    e, a, _ = head_angles(P, top, eye)
    w = smoothstep((np.interp(a, [0, 30, 60, 80, 90], [-28, -27, -16, 0, 2]) - e) / 6.0) * smoothstep((e + 72) / 8.0)
    w[a > 88] = 0.0
    return w * np.clip(1 - lips * 1.5, 0, 1)

def bake_skin(body, skin_src, name, look, weights):
    """The person's own skin texture (2K, RGBA: colour + smoothness in alpha), weathered by the hair rule's face rules
    (BUILD_PLAN §6.C.4-C.5): sun darkening and warming the exposed skin (more where it faces up), dirt in the creases
    (Cycles pointiness) and in large patches, chapped and desaturated lips, shaved or balding scalp stubble and beard
    stubble in the hair colour over darkened skin, all broken up by noise. The alpha is the smoothness URP reads:
    skin 0.42, matte where stubble or dirt is, a little drier on the lips. `weights` holds per-vertex 'scalp',
    'beard', 'lips', 'brow' and 'up' (0 facing down .. 1 facing up)."""
    import numpy as np
    os.makedirs(TEXOUT, exist_ok=True)
    dst = os.path.join(TEXOUT, name + '.png')
    for key, wl in weights.items():
        attr = body.data.color_attributes.new(key, 'FLOAT_COLOR', 'POINT')
        for k, wv in enumerate(wl): attr.data[k].color = (wv, wv, wv, 1.0)
    mat = bpy.data.materials.new('bake_' + name); mat.use_nodes = True
    nt = mat.node_tree; nt.nodes.clear(); N = nt.nodes; L = nt.links
    def mixrgb(fac, a, b, blend='MIX'):
        m = N.new('ShaderNodeMixRGB'); m.blend_type = blend
        if isinstance(fac, (int, float)): m.inputs['Fac'].default_value = float(fac)
        else: L.new(fac, m.inputs['Fac'])
        for sock, val in (('Color1', a), ('Color2', b)):
            if isinstance(val, tuple): m.inputs[sock].default_value = (*val, 1.0)
            else: L.new(val, m.inputs[sock])
        return m.outputs['Color']
    def math(op, a, b):
        m = N.new('ShaderNodeMath'); m.operation = op; m.use_clamp = True
        for i, val in enumerate((a, b)):
            if isinstance(val, (int, float)): m.inputs[i].default_value = float(val)
            else: L.new(val, m.inputs[i])
        return m.outputs[0]
    tc = N.new('ShaderNodeTexCoord')
    def noise(scale, detail=1.0):
        n = N.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = detail
        L.new(tc.outputs['Object'], n.inputs['Vector']); return n.outputs['Fac']
    def attr(key):
        at = N.new('ShaderNodeAttribute'); at.attribute_name = key; return at.outputs['Fac']
    lin = lambda c: tuple(x ** 2.2 for x in c)
    t = N.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(skin_src); col = t.outputs['Color']
    # tone: a deeper complexion from a lighter skin texture (the packs hold one dark skin), a melanin-brown multiply
    if look.get('tone', 0) > 0: col = mixrgb(look['tone'], col, mixrgb(1.0, col, lin((0.40, 0.27, 0.19)), 'MULTIPLY'))
    # sun: a warm darkening, stronger where the skin faces up, mottled
    sun = math('MULTIPLY', math('MULTIPLY', math('ADD', math('MULTIPLY', attr('up'), 0.55), 0.45),
                                math('ADD', math('MULTIPLY', noise(8.0, 2.0), 0.6), 0.7)), look.get('sun', 0.5) * 0.6)
    col = mixrgb(sun, col, mixrgb(1.0, col, lin((0.8, 0.66, 0.54)), 'MULTIPLY'))
    # dirt: in the creases (concave = pointiness under 0.5) and in large faint patches
    geo = N.new('ShaderNodeNewGeometry')
    crease = math('MULTIPLY', math('MULTIPLY', math('SUBTRACT', 0.5, geo.outputs['Pointiness']), 9.0), look.get('grime', 0.4))
    patch = math('MULTIPLY', math('POWER', noise(3.0, 2.0), 3.0), look.get('grime', 0.4) * 0.5)
    dirt = math('ADD', crease, patch)
    col = mixrgb(dirt, col, mixrgb(1.0, col, lin((0.55, 0.47, 0.4)), 'MULTIPLY'))
    # lips: chapped, flaking, a little desaturated, in the person's own colour: a fixed pale flake colour went lilac over
    # darker skin (P4.9); the lip is the skin a little deeper and redder, the flakes the same skin a shade lighter
    hsv = N.new('ShaderNodeHueSaturation'); hsv.inputs['Saturation'].default_value = 0.85; hsv.inputs['Value'].default_value = 1.0
    L.new(mixrgb(1.0, col, (0.7, 0.52, 0.5), 'MULTIPLY'), hsv.inputs['Color'])
    flakes = mixrgb(math('MULTIPLY', math('GREATER_THAN', noise(260.0), 0.6), 0.3), hsv.outputs['Color'], mixrgb(1.0, col, (1.12, 1.08, 1.06), 'MULTIPLY'))
    col = mixrgb(math('MULTIPLY', attr('lips'), look.get('lips', 0.7)), col, flakes)
    # stubble: scalp (shaved, buzzed, balding) and beard, ragged at the edges, stippled
    stip = math('ADD', math('MULTIPLY', math('GREATER_THAN', noise(900.0), 0.47), 0.45), 0.55)
    ragged = math('ADD', math('MULTIPLY', noise(60.0), 0.6), 0.7)
    scalp = look.get('scalp') or {}
    fs = math('MULTIPLY', math('MULTIPLY', math('MULTIPLY', attr('scalp'), ragged), stip), scalp.get('density', 0.0))
    fb = math('MULTIPLY', math('MULTIPLY', math('MULTIPLY', attr('beard'), ragged), stip), look.get('beard', 0.0))
    darkened = mixrgb(1.0, col, (0.5, 0.5, 0.5), 'MULTIPLY')
    age = float(look.get('age', 0.0))
    def hair(name, k=1.0):
        """A hair colour (sRGB, as seen), greyed with age, as linear for the shader."""
        c, g = HAIR_COLOURS[name], HAIR_COLOURS['grey']
        return lin(tuple((ci + (gi - ci) * min(1.0, age * 0.7)) * k for ci, gi in zip(c, g)))
    col = mixrgb(fs, col, mixrgb(0.55, darkened, hair(scalp.get('colour', 'dark_brown'))))
    col = mixrgb(fb, col, mixrgb(0.55, darkened, hair(look.get('beard_colour', 'dark_brown'))))
    # brows: hairs streaked along the brow (across the face, object X), ragged at the edges, in the hair's colour a
    # shade darker (P4.9)
    mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (8.0, 110.0, 110.0)
    L.new(tc.outputs['Object'], mp.inputs['Vector'])
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 6.0; nz.inputs['Detail'].default_value = 3.0
    L.new(mp.outputs['Vector'], nz.inputs['Vector'])
    hairs = math('ADD', math('MULTIPLY', math('GREATER_THAN', nz.outputs['Fac'], 0.48), 0.55), 0.45)
    fbr = math('MULTIPLY', math('MULTIPLY', math('MULTIPLY', attr('brow'), hairs), math('ADD', math('MULTIPLY', noise(40.0), 0.5), 0.75)), look.get('brows', 0.9))
    col = mixrgb(fbr, col, mixrgb(0.8, darkened, hair(look.get('brow_colour', 'dark_brown'), 0.8)))
    if age > 0:
        # the same face older, for the photograph (P4.9): the aged shape's own folds deepened (pointiness of the aged
        # mesh, whatever the grime), broken lines across the forehead, fine crow's feet at the eyes' outer corners, age
        # spots where the sun falls, the skin a little sallow
        folds = math('MULTIPLY', math('MULTIPLY', math('SUBTRACT', 0.5, geo.outputs['Pointiness']), 10.0), age)
        col = mixrgb(folds, col, mixrgb(1.0, col, lin((0.62, 0.52, 0.46)), 'MULTIPLY'))
        xyz = N.new('ShaderNodeSeparateXYZ'); L.new(tc.outputs['Object'], xyz.inputs[0])
        wave = math('SINE', math('ADD', math('MULTIPLY', xyz.outputs['Z'], 1000.0), math('MULTIPLY', noise(20.0), 4.0)), 0.0)
        lines = math('MULTIPLY', math('MULTIPLY', math('GREATER_THAN', wave, 0.86), math('GREATER_THAN', noise(45.0), 0.42)), attr('forehead'))
        mc = N.new('ShaderNodeMapping'); mc.inputs['Scale'].default_value = (60.0, 160.0, 25.0)
        L.new(tc.outputs['Object'], mc.inputs['Vector'])
        nc = N.new('ShaderNodeTexNoise'); nc.inputs['Scale'].default_value = 5.0; nc.inputs['Detail'].default_value = 2.0
        L.new(mc.outputs['Vector'], nc.inputs['Vector'])
        crows = math('MULTIPLY', math('GREATER_THAN', nc.outputs['Fac'], 0.52), attr('crows'))
        creases = math('MULTIPLY', math('ADD', math('MULTIPLY', lines, 0.75), math('MULTIPLY', crows, 0.65)), age)
        col = mixrgb(creases, col, mixrgb(1.0, col, lin((0.6, 0.5, 0.44)), 'MULTIPLY'))
        # tired, darker skin round the eyes
        col = mixrgb(math('MULTIPLY', attr('crows'), age * 0.35), col, mixrgb(1.0, col, lin((0.78, 0.7, 0.68)), 'MULTIPLY'))
        spots = math('MULTIPLY', math('MULTIPLY', math('GREATER_THAN', noise(28.0, 2.0), 0.7), attr('up')), age * 0.45)
        col = mixrgb(spots, col, mixrgb(1.0, col, lin((0.72, 0.58, 0.46)), 'MULTIPLY'))
        sallow = N.new('ShaderNodeHueSaturation'); sallow.inputs['Saturation'].default_value = 1.0 - 0.15 * age
        L.new(col, sallow.inputs['Color']); col = sallow.outputs['Color']
    # smoothness (written to alpha after a second bake)
    rough = math('ADD', math('ADD', math('ADD', math('MULTIPLY', fs, 0.3), math('MULTIPLY', fb, 0.25)), math('MULTIPLY', fbr, 0.25)), math('MULTIPLY', dirt, 0.12))
    smooth = math('SUBTRACT', math('SUBTRACT', 0.42, rough), math('MULTIPLY', attr('lips'), 0.06))
    out = N.new('ShaderNodeOutputMaterial'); em = N.new('ShaderNodeEmission'); L.new(em.outputs[0], out.inputs[0])
    tgt = N.new('ShaderNodeTexImage'); N.active = tgt
    keep = list(body.data.materials)
    body.data.materials.clear(); body.data.materials.append(mat)
    bpy.ops.object.select_all(action='DESELECT'); body.select_set(True); bpy.context.view_layer.objects.active = body
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = 1; sc.cycles.device = 'CPU'
    sc.render.bake.margin = 8; sc.render.bake.use_clear = True
    planes = []
    size = int(look.get('size', 2048))   # 2 K for the player and companions, 1 K for everyone else (BUILD_PLAN §6.B.6)
    for src, cs in ((col, 'sRGB'), (smooth, 'Non-Color')):
        img = bpy.data.images.new('bake_' + name + cs, size, size); img.colorspace_settings.name = cs; tgt.image = img
        for l in list(em.inputs['Color'].links): L.remove(l)
        L.new(src, em.inputs['Color'])
        bpy.ops.object.bake(type='EMIT')
        px = np.empty(size * size * 4, np.float32); img.pixels.foreach_get(px); planes.append(px.reshape(-1, 4))
        bpy.data.images.remove(img)
    rgba = planes[0].copy(); rgba[:, 3] = planes[1][:, 0]
    rgba[planes[1][:, 0] == 0, 3] = 0.42      # outside the islands (the bake's clear colour): ordinary skin
    out_img = bpy.data.images.new('skin_' + name, size, size, alpha=True)
    out_img.pixels.foreach_set(rgba.ravel())
    out_img.filepath_raw = dst; out_img.file_format = 'PNG'; out_img.save()
    bpy.data.images.remove(out_img)
    body.data.materials.clear()
    for m in keep: body.data.materials.append(m)
    for key in weights: body.data.color_attributes.remove(body.data.color_attributes[key])
    bpy.data.materials.remove(mat)
    write_tex_meta(dst, f'{REL}/tex/{name}.png', 'd')
    return name

def read_groups(path, names):
    out, group = {n: set() for n in names}, None
    for line in open(path):
        if line.startswith('g '): group = line.split(None, 1)[1].strip()
        elif line.startswith('f ') and group in out: out[group].update(int(t.split('/')[0]) - 1 for t in line.split()[1:])
    return out

skel = json.load(open(os.path.join(MH, 'rigs', 'default.mhskel')))
weights_mh = json.load(open(os.path.join(MH, 'rigs', 'default_weights.mhw')))['weights']
base_verts, base_vts, body_faces = read_obj(os.path.join(MH, '3dobjs', 'base.obj'), keep_groups={'body'})
NV = len(base_verts)
print('base', NV, 'verts;', len(body_faces), 'body faces')
EYE_GROUPS = read_groups(os.path.join(MH, '3dobjs', 'base.obj'), ('joint-l-eye', 'joint-r-eye'))

# the body's vertex graph (base indices), for closing holes in what a garment hides
BODY_NEIGHBOURS = {}
for _f in body_faces:
    _ix = [i for i, _ in _f]
    for _a in _ix:
        BODY_NEIGHBOURS.setdefault(_a, set()).update(b for b in _ix if b != _a)

def close_holes(hidden, rounds=4, share=0.6):
    """A garment's hidden body vertices with the small islands inside them filled: a vertex whose neighbours are at
    least `share` hidden is hidden too (nipples and knuckles stood through a sweater the garment's own list skipped).
    The garment's edges barely move: a vertex there has about half its neighbours hidden."""
    hidden = set(hidden)
    for _ in range(rounds):
        add = {v for v, ns in BODY_NEIGHBOURS.items()
               if v not in hidden and ns and sum(1 for n in ns if n in hidden) >= share * len(ns)}
        if not add: break
        hidden |= add
    return hidden

def slot(key):
    """A material slot named mat_<key>. Blender silently cuts datablock names at 63 characters, and the slot name is
    how Unity finds the texture, so a longer one is an error here rather than an untextured person in the engine."""
    if len('mat_' + key) > 63: raise ValueError(f'material slot name over 63 characters: mat_{key}')
    return K.mat(key)

# ----------------------------------------------------------------------------------------------------------------
# Levels of detail
# ----------------------------------------------------------------------------------------------------------------
# LOD0 is the close-up (conversation, portrait): the body keeps its face shapes and full topology, the rest is capped
# (strand brows and lashes ran to 30-40 K and 17 K triangles, a tactical vest to 37 K). LOD1 is the game camera's person
# (13-44 % of the screen's height at 8-26 m), ~6 K; LOD2 the far one, ~2 K. Per-part budgets in triangles; None drops
# the part at that level. Unity groups the objects by their _LOD<n> suffix into one LODGroup on import.
LOD0_CAP = {'Brows': 3000, 'Lashes': 1500, 'Hair': 6000, 'Cloth': 4000}
LOD_BUDGET = [
    {'Body': 3000, 'Cloth': 2400, 'Hair': 600, 'Eyes': 200, 'Brows': 500, 'Lashes': None},
    {'Body': 1000, 'Cloth': 800, 'Hair': 150, 'Eyes': None, 'Brows': None, 'Lashes': None},
]

def tris(o): return sum(len(p.vertices) - 2 for p in o.data.polygons)

def part(o):
    for k in ('Body', 'Cloth', 'Hair', 'Eyes', 'Brows', 'Lashes'):
        if o.name.startswith(k): return k
    return 'Cloth'

# strands and cards are many small islands that collapse cannot merge: they are thinned instead, whole islands kept
# evenly through the mesh until the budget is met
STRANDS = ('Brows', 'Lashes', 'Hair')

def thin(me, target):
    bm = bmesh.new(); bm.from_mesh(me)
    bm.faces.ensure_lookup_table()
    seen, islands = set(), []
    for f in bm.faces:
        if f.index in seen: continue
        stack, isl = [f], []
        seen.add(f.index)
        while stack:
            g = stack.pop(); isl.append(g)
            for e in g.edges:
                for h in e.link_faces:
                    if h.index not in seen: seen.add(h.index); stack.append(h)
        islands.append(isl)
    tri = lambda isl: sum(len(f.verts) - 2 for f in isl)
    total = sum(tri(isl) for isl in islands)
    if total > target and len(islands) > 1:
        # a mesh of mixed islands (generated hair: a plait's strands and a bun's locks among many scalp cards) keeps
        # its big islands first, up to 70 % of the budget; the rest (and uniform strands, brows) are thinned evenly
        sizes = sorted(tri(isl) for isl in islands)
        median = sizes[len(sizes) // 2]
        big, rest, kept = [], [], 0
        for isl in islands:
            n = tri(isl)
            if sizes[-1] >= 3 * median and n >= 2 * median and kept + n <= 0.7 * target: big.append(isl); kept += n
            else: rest.append(isl)
        left = max(1, target - kept)
        rest_total = sum(tri(isl) for isl in rest) or 1
        keep_every = max(1.0, rest_total / left)
        acc, drop = 0.0, []
        for isl in rest:
            acc += 1.0
            if acc >= keep_every: acc -= keep_every
            else: drop.extend(isl)
        bmesh.ops.delete(bm, geom=list({id(f): f for f in drop}.values()), context='FACES')
    bm.to_mesh(me); bm.free()

def decimated(src, target, name, rig):
    """A copy of a skinned mesh decimated (collapse) to about `target` triangles, at rest, without its shape keys, with
    its vertex groups, materials and armature; strands and cards thinned by whole islands first."""
    strands = part(src) in STRANDS
    if strands:
        dg = bpy.context.evaluated_depsgraph_get()
        arms = [m for m in src.modifiers if m.type == 'ARMATURE']
        for m in arms: m.show_viewport = False
        me = bpy.data.meshes.new_from_object(src.evaluated_get(bpy.context.evaluated_depsgraph_get()), preserve_all_data_layers=True, depsgraph=bpy.context.evaluated_depsgraph_get())
        for m in arms: m.show_viewport = True
        thin(me, target)
        me.name = name
        o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
        for vg in src.vertex_groups: o.vertex_groups.new(name=vg.name)
        o.parent = rig
        a = o.modifiers.new('Armature', 'ARMATURE'); a.object = rig
        return o
    ratio = max(0.002, min(1.0, target / max(1, tris(src))))
    arms = [m for m in src.modifiers if m.type == 'ARMATURE']
    for m in arms: m.show_viewport = False
    dec = src.modifiers.new('LODDecimate', 'DECIMATE'); dec.ratio = ratio; dec.use_collapse_triangulate = True
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(src.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    src.modifiers.remove(dec)
    for m in arms: m.show_viewport = True
    me.name = name
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    for vg in src.vertex_groups: o.vertex_groups.new(name=vg.name)
    o.parent = rig
    a = o.modifiers.new('Armature', 'ARMATURE'); a.object = rig
    return o

def transfer_shapes(src, dst):
    """Gives `dst` the shape keys of `src` by nearest vertex at rest (a decimated or thinned copy of the same part)."""
    keys = src.data.shape_keys
    if not keys or len(keys.key_blocks) < 2: return
    basis = keys.key_blocks[0].data
    kd = KDTree(len(basis))
    for i, p in enumerate(basis): kd.insert(p.co, i)
    kd.balance()
    near = [kd.find(v.co)[1] for v in dst.data.vertices]
    if not dst.data.shape_keys: dst.shape_key_add(name='Basis', from_mix=False)
    for kb in keys.key_blocks[1:]:
        d = [kb.data[i].co - basis[i].co for i in near]
        if max(x.length for x in d) < 1e-6: continue
        sk = dst.shape_key_add(name=kb.name, from_mix=False)
        for k, dv in enumerate(d): sk.data[k].co = sk.data[k].co + dv

def copy_base_index(src, dst):
    """The decimated body's base indices from the nearest source vertex (decimation blends the channel into nonsense)."""
    if 'BaseIndex' not in src.data.uv_layers or 'BaseIndex' not in dst.data.uv_layers: return
    s = src.data.uv_layers['BaseIndex'].data
    per_vertex = {loop.vertex_index: tuple(s[loop.index].uv) for loop in src.data.loops}
    kd = KDTree(len(src.data.vertices))
    for i, p in enumerate(src.data.vertices): kd.insert(p.co, i)
    kd.balance()
    near = [kd.find(v.co)[1] for v in dst.data.vertices]
    d = dst.data.uv_layers['BaseIndex'].data
    for loop in dst.data.loops: d[loop.index].uv = per_vertex.get(near[loop.vertex_index], (0.0, 0.0))

# a whole outfit's LOD0 cloth triangles: a wardrobe garment exported alone takes its share of the LOD budget by this
OUTFIT_TRIS = 12000

def lod_chain(rig, keep_shapes=False, parts=None, cloth_total=None):
    parts = parts if parts is not None else [o for o in rig.children if o.type == 'MESH']
    report = []
    # LOD0 caps on everything but the body (which keeps its face shapes whole); a capped part takes its shapes back
    for o in parts:
        cap = LOD0_CAP.get(part(o))
        if cap and part(o) != 'Body' and tris(o) > cap:
            before = tris(o)
            c = decimated(o, cap, o.name + '_capped', rig)
            transfer_shapes(o, c)
            old = o.data; o.data = c.data; bpy.data.objects.remove(c); bpy.data.meshes.remove(old)
            report.append(f'{o.name} {before}->{tris(o)}')
    totals = [sum(tris(o) for o in parts)]
    cloth = [o for o in parts if part(o) == 'Cloth']
    cloth_tris = cloth_total or sum(tris(o) for o in cloth) or 1
    for level, budget in enumerate(LOD_BUDGET, start=1):
        made = []
        for o in parts:
            b = budget.get(part(o))
            if b is None: continue
            if part(o) == 'Cloth': b = max(60, b * tris(o) / cloth_tris)   # the clothes share their budget by size
            made.append(decimated(o, min(b, tris(o)), f'{o.name}_LOD{level}', rig))
            if part(o) == 'Body': copy_base_index(o, made[-1])
            # the player's sculpted face shows at the game camera too (their LOD1); nobody's LOD2 has shapes
            if keep_shapes and level == 1: transfer_shapes(o, made[-1])
        totals.append(sum(tris(o) for o in made))
    for o in parts: o.name = o.name + '_LOD0'; o.data.name = o.name
    print(f'  LOD triangles {totals}' + (f'; capped {", ".join(report)}' if report else ''))

def macro_sum(p):
    """The macro targets' summed deltas for a spec, by base vertex (MakeHuman space)."""
    acc = {}
    for rel, w in macro_targets(p):
        t = target(rel)
        if not t: continue
        for i, dx, dy, dz in t:
            a = acc.setdefault(i, [0.0, 0.0, 0.0]); a[0] += dx * w; a[1] += dy * w; a[2] += dz * w
    return acc

def macro_delta(spec, key, to):
    """The whole body as one macro moves to another value (the creation's body sliders, P5.3i): deltas over base
    vertices, MakeHuman space."""
    now, there = macro_sum(spec), macro_sum({**spec, key: to})
    out = []
    for i in set(now) | set(there):
        a, b = now.get(i, (0.0, 0.0, 0.0)), there.get(i, (0.0, 0.0, 0.0))
        d = (b[0] - a[0], b[1] - a[1], b[2] - a[2])
        if abs(d[0]) + abs(d[1]) + abs(d[2]) > 1e-7: out.append((i, d[0], d[1], d[2]))
    return out

def aged_head(spec, v, body_idx):
    """The same head older, for the photograph (BUILD_PLAN §6.B.5): the age macros' difference between the person's age
    and spec['aged'], on the head and neck only (fading out down the neck) and less the head's mean shift, so the older
    head sits on the body as it is. Deltas over base vertices, MakeHuman space."""
    now, old = macro_sum(spec), macro_sum({**spec, 'age': spec['aged']})
    ys = [v[i][1] for i in body_idx]; top, ground = max(ys), min(ys); h = top - ground
    lo, hi = top - 0.21 * h, top - 0.16 * h   # from the neck's base to under the jaw
    out, full = [], []
    for i in set(now) | set(old):
        y = v[i][1]
        m = 0.0 if y <= lo else 1.0 if y >= hi else (y - lo) / (hi - lo)
        if m <= 0: continue
        m = m * m * (3 - 2 * m)
        a, b = now.get(i, (0.0, 0.0, 0.0)), old.get(i, (0.0, 0.0, 0.0))
        d = [b[k] - a[k] for k in range(3)]
        out.append((i, d, m))
        if m >= 1: full.append(d)
    mean = [sum(d[k] for d in full) / max(1, len(full)) for k in range(3)]
    return [(i, (d[0] - mean[0]) * m, (d[1] - mean[1]) * m, (d[2] - mean[2]) * m) for i, d, m in out]

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
    for g, look in spec.get('clothes', []):
        d = find_dir(g, COMMUNITY, os.path.join(MH, 'clothes'))
        if d is None: print('  no garment', g); continue
        _, refs, dels = read_mhclo(os.path.join(d, g + '.mhclo'))
        hidden.update(dels)
        if g in COVERS or (look or {}).get('hide'):
            hidden.update(i for r in refs for i in r[:3])
    hidden = close_holes(hidden)
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
    if spec.get('wardrobe'):
        # each vertex's MakeHuman base index as (i % 128, i // 128), exact in half floats on a phone: the wardrobe hides
        # the body under worn garments by these indices (a 128 x 128 mask the skin shader reads, BUILD_PLAN §6.D)
        bi = me.uv_layers.new(name='BaseIndex')
        for loop in me.loops:
            k = used[loop.vertex_index]; bi.data[loop.index].uv = (k % 128, k // 128)
    for p in me.polygons: p.use_smooth = True
    body = bpy.data.objects.new('Body', me); bpy.context.scene.collection.objects.link(body)
    body.data.materials.append(slot('skin:' + spec['id'] + '__skin_d'))   # the person's own skin, baked below

    # --- blend shapes relative to the baked body
    body.shape_key_add(name='Basis', from_mix=False)
    # every shape's deltas over all base vertices (hidden and helper ones too), MakeHuman space: the proxies are refitted
    # with them so hair, brows, lashes, eyes and hats follow the face (proxy() below)
    shapes = []
    def add_shape(name, deltas, w=1.0):
        sk = body.shape_key_add(name=name, from_mix=False)
        acc = {}
        for i, dx, dy, dz in deltas:
            a = acc.setdefault(i, [0.0, 0.0, 0.0]); a[0] += dx * w; a[1] += dy * w; a[2] += dz * w
            if i in remap:
                k = remap[i]; d = to_bl_dir((dx * w, dy * w, dz * w)); sk.data[k].co = sk.data[k].co + d
        shapes.append((name, acc))
    nshapes = 0
    # The sculptor's shapes only on the player (spec 'sculpt'); NPCs have their face baked and keep the expressions.
    for mod in (FACE_SHAPES if spec.get('sculpt') else []):
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
    if spec.get('sculpt') and spec.get('aged'):
        add_shape('aged', aged_head(spec, v, body_idx)); nshapes += 1
    if spec.get('sculpt'):
        # the body sliders (P5.3i, Core Sculpt "body-weight", "body-muscle"): the macro a step either way over the whole
        # body; every proxy (the garments, the hair) is refitted to them as to the face's shapes. Further up than down:
        # the bases are lean (weight 0.3), and MakeHuman's heavy and muscled targets only start at 0.5 (+0.3 barely
        # showed through the clothes)
        for key in ('weight', 'muscle'):
            at = spec.get(key, 0.5)
            for label, to in (('decr', max(0.0, at - 0.3)), ('incr', min(1.0, at + 0.5))):
                d = macro_delta(spec, key, to)
                if d: add_shape(f'body-{key}-{label}', d); nshapes += 1
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
    def proxy(kind, folder_name, name, mat_name, tex_name=None, mat_override=None, skin_to=None, look=None, hair_look=None,
              drop_clear=False):
        d = find_dir(name, os.path.join(MH, folder_name), COMMUNITY, GENERATED)
        if d is None: print('  no proxy', name); return None
        meta, refs, deletes = read_mhclo(os.path.join(d, name + '.mhclo'))
        pv, pvt, pf = read_obj(os.path.join(d, meta['obj_file'][0]))
        if drop_clear:
            # The high-poly eye is an eyeball under a cornea shell whose UVs all fall on the texture's small transparent
            # patch; the engine's mip levels blur that patch opaque and the shell hides the iris (BUILD_PLAN §6.B.3).
            # Drop every face whose UV centre is transparent, and the vertices only those faces used.
            mp = os.path.join(d, mat_override or meta.get('material', [name + '.mhmat'])[0])
            im = bpy.data.images.load(os.path.join(os.path.dirname(mp), read_mhmat(mp)['diffuseTexture']))
            iw, ih = im.size; alpha = im.pixels[:][3::4]; bpy.data.images.remove(im)
            def clear(f):
                us = [pvt[t] for _, t in f if 0 <= t < len(pvt)]
                if not us: return False
                u, w = sum(x for x, _ in us) / len(us), sum(y for _, y in us) / len(us)
                return alpha[min(ih - 1, int(w * ih)) * iw + min(iw - 1, int(u * iw))] < 0.5   # Blender rows run bottom-up, as v does
            kept_f = [f for f in pf if not clear(f)]
            keep = sorted({i for f in kept_f for i, _ in f})
            km = {i: k for k, i in enumerate(keep)}
            print(f'  {kind}: dropped {len(pf) - len(kept_f)} transparent faces of {len(pf)}')
            pf = [[(km[i], t) for i, t in f] for f in kept_f]
            refs = [refs[i] for i in keep]
        scale_refs = []
        for ax in ('x_scale', 'y_scale', 'z_scale'):
            if ax in meta:
                # MakeHuman proxy.py TMatrix.getScale: the third value is the reference distance the offsets were authored at
                scale_refs.append((ax[0], int(meta[ax][0]), int(meta[ax][1]), float(meta[ax][2])))
        def fit(at, scale_at=None):
            sa = scale_at or at
            scale = {ax: abs(sa(a)['xyz'.index(ax)] - sa(b)['xyz'.index(ax)]) / (den or 1.0) for ax, a, b, den in scale_refs}
            sx, sy, sz = scale.get('x', 1.0), scale.get('y', 1.0), scale.get('z', 1.0)
            out = []
            for r in refs:
                i0, i1, i2, w0, w1, w2, ox, oy, oz = r
                p0, p1, p2 = at(i0), at(i1), at(i2)
                p = [w0 * p0[k] + w1 * p1[k] + w2 * p2[k] for k in range(3)]
                p[0] += ox * sx; p[1] += oy * sy; p[2] += oz * sz
                out.append(p)
            return out
        fitted = fit(lambda i: v[i])
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
        if mm or look is not None or hair_look is not None:
            src_d = None
            if 'diffuseTexture' in mm:
                tp = os.path.join(os.path.dirname(mat_path), mm['diffuseTexture'])
                if os.path.exists(tp): src_d = tp
            if look is not None:
                if name in PRINTED: look = {**look, 'flat': max(look.get('flat', 0.5), PRINTED[name])}
                tex = bake_cloth(po, src_d, (tex_name or name) + '_d', look)
            elif hair_look is not None and src_d: tex = bake_hair(src_d, (tex_name or name) + '_d', hair_look)
            elif src_d: tex = copy_texture(src_d, (tex_name or name) + '_d')
            # hair cards ship without normal maps (BUILD_PLAN §6.B.6; some packs' are object-space, wrong in Unity). A
            # garment's normal map does not change with its dye: one shared 1K copy per garment (<garment>_n), which
            # Unity finds from the person's <id>__<garment>_d.
            if tex and hair_look is None and 'normalmapTexture' in mm:
                tp = os.path.join(os.path.dirname(mat_path), mm['normalmapTexture'])
                if os.path.exists(tp):
                    if look is not None: copy_texture(tp, name + '_n', 'n', size=1024)
                    else: copy_texture(tp, (tex_name or name) + '_n', 'n')
        po.data.materials.append(slot(f'{mat_name}:{tex or "none"}'))
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
        # the body's shapes, refitted: a proxy moves with the vertices it is fitted to (only shapes that touch it). The
        # garment's scale stays the rest one: its scale vertices can be anywhere (a head vertex sizes boots), and a face
        # slider must not resize the boots.
        if shapes and len(pm.vertices) == len(fitted):
            touched_any = {i for r in refs for i in r[:3]}
            for sname, d in shapes:
                if touched_any.isdisjoint(d): continue
                moved = fit(lambda i: [v[i][k] + d[i][k] for k in range(3)] if i in d else v[i], scale_at=lambda i: v[i])
                deltas = [to_bl_dir([m_[k] - f_[k] for k in range(3)]) for m_, f_ in zip(moved, fitted)]
                if max(dl.length for dl in deltas) < 1e-4: continue   # under a tenth of a millimetre: not this part's shape
                if not pm.shape_keys: po.shape_key_add(name='Basis', from_mix=False)
                sk = po.shape_key_add(name=sname, from_mix=False)
                for k, dl in enumerate(deltas): sk.data[k].co = sk.data[k].co + dl
        return po
    # The MakeHuman data ships one eye texture (brown); other colours are tints applied by the material in Unity.
    proxy('Eyes', 'eyes', 'high-poly', 'eyes', tex_name='eye_brown', mat_override='../materials/brown.mhmat', skin_to='Head', drop_clear=True)
    if spec.get('brows'): proxy('Brows', 'eyebrows', spec['brows'], 'brows')
    proxy('Lashes', 'eyelashes', 'mindfront_eyelashes_01', 'lashes')
    if spec.get('hair'):
        hl = spec.get('hair_look')
        proxy('Hair', 'hair', spec['hair'], 'hair', hair_look=hl, tex_name=(spec['id'] + '__' + spec['hair']) if hl is not None else None)
        if hl is not None and spec.get('sculpt') and spec.get('aged'):
            # the same hair greyed, for the photograph (P4.9): FaceSculpt puts it on with the aged face
            hd = find_dir(spec['hair'], os.path.join(MH, 'hair'), COMMUNITY, GENERATED)
            hm = read_mhmat(os.path.join(hd, spec['hair'] + '.mhmat')) if hd and os.path.exists(os.path.join(hd, spec['hair'] + '.mhmat')) else {}
            if 'diffuseTexture' in hm:
                bake_hair(os.path.join(hd, hm['diffuseTexture']), spec['id'] + '__' + spec['hair'] + '_aged_d', {**hl, 'grey': 0.85})
    # baked cloth is per person (the same mesh is dyed differently on different people), so the texture carries the id
    for g, look in spec.get('clothes', []): proxy('Cloth_' + g, 'clothes', g, 'cloth', look=look, tex_name=(spec['id'] + '__' + g) if look is not None else None)

    # --- skin textures beside the model
    sd = find_dir(spec['skin'], COMMUNITY, os.path.join(MH, 'skins'))
    if sd:
        mm = read_mhmat(os.path.join(sd, spec['skin'] + '.mhmat'))
        for key, suffix, kind in (('diffuseTexture', '_d', 'd'), ('normalmapTexture', '_n', 'n'), ('bumpmapTexture', '_n', 'n')):
            if key in mm:
                tp = os.path.join(sd, mm[key])
                if not os.path.exists(tp): continue
                if key != 'diffuseTexture':
                    copy_texture(tp, spec['id'] + '__skin' + suffix, kind, size=1024)   # beside the person's own diffuse
                    continue
                # the person's own skin, <id>__skin_d (a longer name would pass Blender's 63-character limit)
                import numpy as np
                P = np.array([v[i] for i in used])
                head = {i for i, x in weights_mh['head'] if x > 0.5}
                neck = {i for b in ('neck01', 'neck02', 'neck03') for i, x in weights_mh.get(b, []) if x > 0.3}
                in_head = np.array([i in head for i in used]); in_face = in_head | np.array([i in neck for i in used])
                eye = np.mean([np.mean([v[i] for i in EYE_GROUPS[g]], axis=0) for g in EYE_GROUPS], axis=0)
                top = P[in_head, 1].max() if in_head.any() else P[:, 1].max()   # a full head wrap hides the whole head
                mag = np.zeros(len(used))
                for t in ('mouth/mouth-upperlip-volume-incr', 'mouth/mouth-lowerlip-volume-incr'):
                    for i, dx, dy, dz in target(t) or []:
                        if i in remap: mag[remap[i]] = max(mag[remap[i]], (dx * dx + dy * dy + dz * dz) ** 0.5)
                lips = np.clip(mag / (0.35 * mag.max()), 0, 1) if mag.max() > 0 else mag
                scalp = np.zeros(len(used)); beard = np.zeros(len(used))
                if spec.get('scalp') and in_head.any():
                    scalp[in_head] = hair_weight(P[in_head], top, eye, spec['scalp'].get('mode', 'buzz'), spec['scalp'].get('recede', 0.0))
                if in_face.any(): beard[in_face] = beard_weight(P[in_face], top, eye, lips[in_face])
                # the brows painted under the strand brows (thinned to the LOD budget, strands alone read as dots): where
                # the brow proxy is tied to the skin, softened over 3.5 mm (P4.9)
                brow = np.zeros(len(used))
                bd = find_dir(spec['brows'], os.path.join(MH, 'eyebrows'), COMMUNITY, GENERATED) if spec.get('brows') else None
                if bd and in_face.any():
                    _, brefs, _ = read_mhclo(os.path.join(bd, spec['brows'] + '.mhclo'))
                    tied = [remap[i] for r in brefs for i, w in zip(r[:3], r[3:6]) if w > 0.05 and i in remap]
                    if tied:
                        Q = P[sorted(set(tied))]
                        F = np.flatnonzero(in_face)
                        dist = np.sqrt(((P[F][:, None, :] - Q[None, :, :]) ** 2).sum(-1)).min(1)
                        brow[F] = smoothstep(1.0 - dist / 0.035)
                up = np.array([(vx.normal.z + 1) / 2 for vx in body.data.vertices])
                look = dict(spec.get('skin_look', {})); look['scalp'] = spec.get('scalp')
                look['size'] = spec.get('skin_size', 2048)
                look.setdefault('brow_colour', (spec.get('hair_look') or {}).get('colour') or (spec.get('scalp') or {}).get('colour') or 'dark_brown')
                own = bake_skin(body, tp, spec['id'] + '__skin_d', look, {'scalp': scalp, 'beard': beard, 'lips': lips, 'up': up, 'brow': brow})
                if spec.get('sculpt') and spec.get('aged'):
                    # the aged skin for the photograph (P4.9): baked on the aged shape (its folds become creases), the
                    # Skin shader blends to it as FaceSculpt.Aged rises. Masks: the forehead between the brows and the
                    # hairline, the crow's feet beside each eye's outer corner (MakeHuman units)
                    e_, a_, _ = head_angles(P, top, eye)
                    front = np.clip(1.0 - (a_ - 35.0) / 15.0, 0.0, 1.0)
                    forehead = np.where(in_head, smoothstep((e_ - 9.0) / 5.0) * (1.0 - smoothstep((e_ - 22.0) / 5.0)) * front, 0.0)
                    crows = np.zeros(len(used))
                    for g in EYE_GROUPS:
                        ec = np.mean([v[i] for i in EYE_GROUPS[g]], axis=0)
                        side = 1.0 if ec[0] > 0 else -1.0
                        corner = np.array([ec[0] + side * 0.17, ec[1] - 0.02, ec[2] - 0.08])
                        crows = np.maximum(crows, smoothstep(1.0 - np.linalg.norm(P - corner, axis=1) / 0.22))
                    crows[~in_head] = 0.0
                    kb = body.data.shape_keys.key_blocks.get('aged') if body.data.shape_keys else None
                    if kb is not None: kb.value = 1.0
                    old_look = dict(look)
                    old_look['age'] = float(np.clip((spec['aged'] - spec.get('age', 30)) / 40.0, 0.2, 1.0))
                    old_look['sun'] = min(1.0, look.get('sun', 0.5) + 0.3 * old_look['age'])
                    bake_skin(body, tp, spec['id'] + '__skin_aged_d', old_look,
                              {'scalp': scalp, 'beard': beard, 'lips': lips, 'up': up, 'brow': brow, 'forehead': forehead, 'crows': crows})
                    if kb is not None: kb.value = 0.0
                body.data.materials.clear(); body.data.materials.append(slot('skin:' + own))
    else:
        print('  no skin', spec['skin'])

    # --- levels of detail (P4.1, BUILD_PLAN §6.B): caps on LOD0, decimated LOD1 and LOD2 named for Unity's LODGroup
    lod_chain(rig, keep_shapes=bool(spec.get('sculpt')))

    # --- export
    path = os.path.join(OUT, spec['id'] + '.fbx')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.fbx(filepath=path, use_selection=True, apply_scale_options='FBX_SCALE_ALL', axis_forward='-Z', axis_up='Y',
                             mesh_smooth_type='FACE', use_mesh_modifiers=False, add_leaf_bones=False, bake_anim=False, path_mode='STRIP',
                             embed_textures=False, use_armature_deform_only=False, primary_bone_axis='Y', secondary_bone_axis='X')
    K.write_model_meta(path, f'{REL}/{spec["id"]}.fbx')
    print('  wrote', path)

    # --- the wardrobe (the player, BUILD_PLAN §6.D): each garment alone on the same rig as <id>__<garment>.fbx, with its
    # shapes and levels of detail, and in <id>.wardrobe.json its slot and the base vertices it hides
    if spec.get('wardrobe'):
        manifest = {'base': spec['id'], 'outfit': spec.get('outfit', []), 'garments': []}
        for w in spec['wardrobe']:
            g, look = w['g'], w.get('look')
            before = set(bpy.data.objects)
            po = proxy('Cloth_' + g, 'clothes', g, 'cloth', look=look, tex_name=spec['id'] + '__' + g)
            if po is None: continue
            lod_chain(rig, keep_shapes=bool(spec.get('sculpt')), parts=[po], cloth_total=OUTFIT_TRIS)
            made = [o for o in bpy.data.objects if o not in before]
            bpy.ops.object.select_all(action='DESELECT')
            rig.select_set(True)
            for o in made: o.select_set(True)
            name = f'{spec["id"]}__{g}'
            gpath = os.path.join(OUT, name + '.fbx')
            bpy.ops.export_scene.fbx(filepath=gpath, use_selection=True, apply_scale_options='FBX_SCALE_ALL', axis_forward='-Z', axis_up='Y',
                                     mesh_smooth_type='FACE', use_mesh_modifiers=False, add_leaf_bones=False, bake_anim=False, path_mode='STRIP',
                                     embed_textures=False, use_armature_deform_only=False, primary_bone_axis='Y', secondary_bone_axis='X')
            K.write_model_meta(gpath, f'{REL}/{name}.fbx')
            _, refs, dels = read_mhclo(os.path.join(find_dir(g, COMMUNITY, os.path.join(MH, 'clothes')), g + '.mhclo'))
            hides = set(dels)
            if g in COVERS or (look or {}).get('hide'): hides.update(i for r in refs for i in r[:3])
            hides = close_holes(hides)
            manifest['garments'].append({'id': g, 'slot': w['slot'], 'model': name, 'hidesHair': bool(w.get('hides_hair')),
                                         'hides': sorted(hides)})
            for o in made: bpy.data.objects.remove(o, do_unlink=True)
            print(f'  wardrobe: {name} ({w["slot"]}, hides {len(hides)} body vertices)')
        # the hair to choose at creation (P5.3i): each form of hair of our own alone on the rig, in a 'hair' slot (the
        # base's own hair goes while one is worn; none at all leaves the painted buzz)
        for h in spec.get('hairs', []):
            before = set(bpy.data.objects)
            hl = spec.get('hair_look') or {}
            po = proxy('Hair_' + h, 'hair', h, 'hair', hair_look=hl, tex_name=spec['id'] + '__' + h)
            if po is None: continue
            lod_chain(rig, keep_shapes=bool(spec.get('sculpt')), parts=[po])
            made = [o for o in bpy.data.objects if o not in before]
            bpy.ops.object.select_all(action='DESELECT')
            rig.select_set(True)
            for o in made: o.select_set(True)
            name = f'{spec["id"]}__hair_{h}'
            gpath = os.path.join(OUT, name + '.fbx')
            bpy.ops.export_scene.fbx(filepath=gpath, use_selection=True, apply_scale_options='FBX_SCALE_ALL', axis_forward='-Z', axis_up='Y',
                                     mesh_smooth_type='FACE', use_mesh_modifiers=False, add_leaf_bones=False, bake_anim=False, path_mode='STRIP',
                                     embed_textures=False, use_armature_deform_only=False, primary_bone_axis='Y', secondary_bone_axis='X')
            K.write_model_meta(gpath, f'{REL}/{name}.fbx')
            manifest['garments'].append({'id': h, 'slot': 'hair', 'model': name, 'hidesHair': False, 'hides': []})
            for o in made: bpy.data.objects.remove(o, do_unlink=True)
            print(f'  wardrobe: {name} (hair)')
        with open(os.path.join(OUT, spec['id'] + '.wardrobe.json'), 'w') as f: json.dump(manifest, f, indent=1)

os.makedirs(OUT, exist_ok=True)
made = hairgen.generate(MH, GENERATED)
if made: print('hair of our own generated:', made)
K.write_folder_meta(OUT, REL)
os.makedirs(TEXOUT, exist_ok=True); K.write_folder_meta(TEXOUT, REL + '/tex')
only = os.environ.get('ONLY')
for spec in PEOPLE:
    if only and spec['id'] not in only.split(','): continue
    build_person(spec)
print('people bake-off: done')
