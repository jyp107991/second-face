"""A hairstyle moved from one person onto another (owner, 2026-11-01: "hair must be consistent with race: Black people
cannot have weirdly white straight hairstyles"; many people from each base by blending and variation). The target's own
scalp hair is taken off (Rocketbox: the opacity material's loose pieces away from the brows and lashes, which stay); the
donor's hair (VALID: its 'h_wig' mesh; Rocketbox: its opacity material's scalp pieces) is fitted to the target's skull: each
hair vertex keeps its height above the donor's scalp along the ray from the donor's skull centre and is put at that height
above the target's scalp along the same direction (both heads in their eyes' frames, so the hair sits where it sat:
hairline, crown and nape); where a ray finds no scalp (hair hanging below the skull), the vertex follows the skulls'
similarity. The hair is skinned to the target's head bone and keeps the donor's texture, retoned to the hair colour given.
Usage: blender -b --python hair_graft.py -- <target fbx> <donor fbx>[+<donor hair fbx>] <out fbx> [<hair colour hex, e.g. 16110d>]
  (the target's textures are linked beside the output by the caller; the donor's hair texture is written beside it.
  Our own hairstyles (hairgen.py, groom.py) are separate files on the player's body: <player fbx>+<hair fbx>;
  GRAFT_TEX: the hair's texture, when the FBX does not carry it)"""
import bpy, bmesh, sys, os, json, math
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

args = sys.argv[sys.argv.index('--') + 1:]
target_path, donor_path, out_path = args[:3]
hair_hex = int(args[3], 16) if len(args) > 3 else None
out_dir = os.path.dirname(os.path.abspath(out_path)); os.makedirs(out_dir, exist_ok=True)

EYE_L = ('Bip01 LEye', 'Bip02 LEye', 'LeftEye', 'eye.L'); EYE_R = ('Bip01 REye', 'Bip02 REye', 'RightEye', 'eye.R')
HEAD = ('Bip01 Head', 'Bip02 Head', 'Head', 'head')


def import_fbx(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=path)
    return [o for o in bpy.data.objects if o not in before]


def bone_pos(arm, names):
    for n in names:
        if n in arm.data.bones: return arm.matrix_world @ arm.data.bones[n].head_local
    return None


def eye_frame(arm, meshes):
    """Origin at the eyes' midpoint; x across (left eye), z up, y back (into the head). VALID's eye bones may be absent: its
    eye meshes are used instead."""
    eL, eR = bone_pos(arm, EYE_L), bone_pos(arm, EYE_R)
    if eL is None or eR is None:
        em = {o.name: o for o in meshes}
        if 'h_L_eye' in em and 'h_R_eye' in em:
            cen = lambda o: o.matrix_world @ (sum((v.co for v in o.data.vertices), Vector()) / len(o.data.vertices))
            eL, eR = cen(em['h_L_eye']), cen(em['h_R_eye'])
    hj = bone_pos(arm, HEAD)
    mid = (eL + eR) / 2
    x = (eL - eR).normalized(); z = Vector((0, 0, 1)); z = (z - x * z.dot(x)).normalized(); y = z.cross(x)
    d = hj - mid; d -= x * d.dot(x)
    if d.length > 1e-6 and d.dot(y) < 0: y = -y                 # y points back, towards the head's joint
    return mid, Matrix((x, y, z))                                 # rows: world -> frame is R @ (p - mid)


def surface_bvh(objs, keep=lambda o, mi: True):
    """A BVH of the given meshes' faces (world space), only the faces whose material passes keep."""
    verts, polys = [], []
    for o in objs:
        M = o.matrix_world; base = len(verts)
        verts += [M @ v.co for v in o.data.vertices]
        polys += [[base + i for i in p.vertices] for p in o.data.polygons if keep(o, p.material_index)]
    return BVHTree.FromPolygons(verts, polys)


def skull_centre(bvh, mid, R):
    """The skull's centre: halfway between the brow (just in front of the eyes) and the back of the head along the eyes'
    level, raised 30 mm (the cranium's centre lies above the eyes)."""
    back = R.transposed() @ Vector((0, 1, 0)); up = R.transposed() @ Vector((0, 0, 1))
    hit, n, i, dist = bvh.ray_cast(mid + up * 0.03, back)
    depth = dist if hit is not None else 0.18
    return mid + up * 0.03 + back * (depth / 2)


def brow_or_lash(P):
    """A loose piece of hair cards that is a brow or lashes (mm, eyes' frame, y back): small, wholly in front of the eyes'
    centres, between just under the eyes and the brows' top. Long hair hanging at eye level is neither: it reaches back."""
    ext = P.max(0) - P.min(0)
    return ext.max() < 75 and P[:, 1].max() < 14 and P[:, 2].min() > -22 and P[:, 2].max() < 48 and np.abs(P[:, 0]).max() < 72


def scalp_radius(bvh, c, d):
    """Distance from the skull's centre to the scalp along d (the first surface met going out), or None."""
    hit, n, i, dist = bvh.ray_cast(c, d)
    return dist


# --- the target -----------------------------------------------------------------------------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)
tobjs = import_fbx(target_path)
tarm = next(o for o in tobjs if o.type == 'ARMATURE')
tmeshes = [o for o in tobjs if o.type == 'MESH']
tmid, tR = eye_frame(tarm, tmeshes)
head_mat = lambda o, mi: mi < len(o.data.materials) and o.data.materials[mi] is not None and o.data.materials[mi].name.endswith('_head')
tbvh = surface_bvh(tmeshes, head_mat)
tc = skull_centre(tbvh, tmid, tR)

# the target's own scalp hair off: loose pieces of the opacity material, except those around the brows and the eyes
removed = 0
for o in tmeshes:
    idx = {i for i, m in enumerate(o.data.materials) if m and m.name.endswith('_opacity')}
    if not idx: continue
    bm = bmesh.new(); bm.from_mesh(o.data); M = o.matrix_world
    seen, doomed = set(), []
    for f0 in bm.faces:
        if f0 in seen or f0.material_index not in idx: continue
        part, stack = [], [f0]; seen.add(f0)
        while stack:
            f = stack.pop(); part.append(f)
            for v in f.verts:
                for g in v.link_faces:
                    if g not in seen and g.material_index in idx: seen.add(g); stack.append(g)
        P = np.array([tuple(tR @ ((M @ v.co) - tmid)) for f in part for v in f.verts]) * 1000.0   # mm, eyes' frame
        if not brow_or_lash(P): doomed += part
    if doomed:
        removed += len(doomed)
        bmesh.ops.delete(bm, geom=list(set(doomed)), context='FACES'); bm.to_mesh(o.data)
    bm.free()

# --- the donor's hair -----------------------------------------------------------------------------------------------
donor_head, _, donor_hair = donor_path.partition('+')
dobjs = import_fbx(donor_head)
hobjs = import_fbx(donor_hair) if donor_hair else []
darm = next(o for o in dobjs if o.type == 'ARMATURE')
dmeshes = [o for o in dobjs if o.type == 'MESH']
dmid, dR = eye_frame(darm, dmeshes)
wig = next((o for o in dmeshes if o.name.lower().startswith('h_wig')), None)
if hobjs:                                                        # our own hairstyle: its own file on the player's body
    dbvh = surface_bvh(dmeshes)
    hm = [o for o in hobjs if o.type == 'MESH']
    hair = max(hm, key=lambda o: len(o.data.vertices))
    for o in hobjs:
        if o is not hair: bpy.data.objects.remove(o, do_unlink=True)
    dobjs = dobjs + [hair]
elif wig is not None:                                              # VALID: the wig is its own mesh; the skull is the head mesh
    dhead = [o for o in dmeshes if o.name.startswith('H_')]
    dbvh = surface_bvh(dhead)
    hair = wig
else:                                                            # Rocketbox: the opacity material's scalp pieces
    dbvh = surface_bvh(dmeshes, head_mat)
    hair = max((o for o in dmeshes if any(m and m.name.endswith('_opacity') for m in o.data.materials)), key=lambda o: len(o.data.vertices))
    bm = bmesh.new(); bm.from_mesh(hair.data); M = hair.matrix_world
    keep_idx = {i for i, m in enumerate(hair.data.materials) if m and m.name.endswith('_opacity')}
    gone = [f for f in bm.faces if f.material_index not in keep_idx]
    # (and the donor's brows and lashes: the same test as above)
    seen = set()
    for f0 in bm.faces:
        if f0 in seen or f0.material_index not in keep_idx: continue
        part, stack = [], [f0]; seen.add(f0)
        while stack:
            f = stack.pop(); part.append(f)
            for v in f.verts:
                for g in v.link_faces:
                    if g not in seen and g.material_index in keep_idx: seen.add(g); stack.append(g)
        P = np.array([tuple(dR @ ((M @ v.co) - dmid)) for f in part for v in f.verts]) * 1000.0
        if brow_or_lash(P): gone += part
    bmesh.ops.delete(bm, geom=list(set(gone)), context='FACES'); bm.to_mesh(hair.data); bm.free()
dc = skull_centre(dbvh, dmid, dR)

# fit: per vertex, its height above the donor's scalp along the ray from the donor's skull centre, put above the target's
s_sim = 1.0
dd = scalp_radius(dbvh, dc, dR.transposed() @ Vector((0, 0, 1))); td = scalp_radius(tbvh, tc, tR.transposed() @ Vector((0, 0, 1)))
if dd and td: s_sim = td / dd
Mw = hair.matrix_world.copy(); Mi = Mw.inverted()
missed = 0
new_co = []
for v in hair.data.vertices:
    p = Mw @ v.co
    local = dR @ (p - dc)                                         # donor's frame, from its skull centre
    r = local.length
    if r < 1e-6: new_co.append(v.co.copy()); continue
    dirf = local / r
    rd = scalp_radius(dbvh, dc, dR.transposed() @ dirf)
    rt = scalp_radius(tbvh, tc, tR.transposed() @ dirf)
    if rd is None or rt is None or rd < 0.04 or rt < 0.04:
        missed += 1
        q = tc + tR.transposed() @ (local * s_sim)
    else:
        q = tc + tR.transposed() @ (dirf * (rt + (r - rd)))
    new_co.append(Mi @ q)
for v, co in zip(hair.data.vertices, new_co): v.co = co
hair.data.update()

# into the target: parented and skinned to the head bone
hair.parent = None
hair.matrix_world = Mw
for mod in list(hair.modifiers): hair.modifiers.remove(mod)
hair.vertex_groups.clear()
hb = next(n for n in HEAD if n in tarm.data.bones)
vg = hair.vertex_groups.new(name=hb); vg.add(list(range(len(hair.data.vertices))), 1.0, 'REPLACE')
hair.parent = tarm; hair.matrix_parent_inverse = tarm.matrix_world.inverted()
am = hair.modifiers.new('Armature', 'ARMATURE'); am.object = tarm
hair.name = 'graft_hair'

# the donor's hair texture beside the output, retoned to the hair colour (its own light and dark kept)
tex_name = None
if not hair.data.materials: hair.data.materials.append(bpy.data.materials.new('graft_hair'))
for m in hair.data.materials:
    if m is None: continue
    m.use_nodes = True
    imgs = [n.image for n in m.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image is not None]
    if os.environ.get('GRAFT_TEX'): imgs = [bpy.data.images.load(os.environ['GRAFT_TEX'])]
    for img in imgs[:1]:
        if True:
            w, h = img.size
            px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
            if hair_hex is not None:
                col = np.array([(hair_hex >> 16) & 255, (hair_hex >> 8) & 255, hair_hex & 255], np.float32) / 255.0
                lum = px[..., :3] @ np.array([0.2126, 0.7152, 0.0722], np.float32)
                ref = float(np.median(lum[px[..., 3] > 0.5])) if (px[..., 3] > 0.5).any() else float(np.median(lum))
                k = np.clip(lum / max(ref, 1e-3), 0.35, 2.2)[..., None]
                px[..., :3] = np.clip(col[None, None, :] * k, 0, 1)
            # (named as Rocketbox names its hair, so the studio and the importer cut it by the texture's alpha)
            tex_name = 'graft_hair_opacity_color.png'
            out_img = bpy.data.images.new('graft_hair_opacity_color', w, h, alpha=True)
            out_img.pixels = px.ravel().tolist()
            out_img.filepath_raw = os.path.join(out_dir, tex_name); out_img.file_format = 'PNG'; out_img.save()
    m.name = 'graft_hair_opacity'
    break

# out: the target's objects and the grafted hair (the donor's rest removed)
for o in dobjs:
    if o is not hair and o.name in bpy.data.objects: bpy.data.objects.remove(o, do_unlink=True)
for o in [o for o in bpy.data.objects if o.type not in ('MESH', 'ARMATURE')]: bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.fbx(filepath=out_path, use_selection=True, add_leaf_bones=False, bake_anim=False,
                         use_mesh_modifiers=False, mesh_smooth_type='FACE', path_mode='STRIP')
json.dump({'target': os.path.basename(target_path), 'donor': os.path.basename(donor_path), 'removed_faces': removed,
           'hair_vertices': len(hair.data.vertices), 'missed_rays': missed, 'scale': round(s_sim, 3), 'texture': tex_name},
          open(out_path[:-4] + '_graft.json', 'w'))
print('grafted', len(hair.data.vertices), 'hair vertices; own hair faces removed', removed, '; rays missed', missed, '; scale', round(s_sim, 3))
