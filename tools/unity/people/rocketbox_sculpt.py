"""RB2: our sculptor's face shapes (MakeHuman targets on player_f/m Body_LOD0) transferred onto a Rocketbox head.
Fit: landmarks on both heads (eyes from the eye bones, nose tip, lips, chin, ears, crown, back), a similarity, then a
thin-plate warp of our head onto theirs; each Rocketbox vertex of the head bound to the closest point of the warped
head; each shape's offsets carried across by that binding. Usage: blender -b --python transfer.py -- <ours.fbx> <rb.fbx> <out.fbx>"""
import bpy, sys, numpy as np, mathutils
from mathutils.bvhtree import BVHTree
ours_path, rb_path, out_path = sys.argv[sys.argv.index('--') + 1:][:3]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=ours_path)
ours_objs = set(bpy.data.objects)
bpy.ops.import_scene.fbx(filepath=rb_path)
rb_objs = set(bpy.data.objects) - ours_objs
body = bpy.data.objects['Body_LOD0']
ours_arm = next(o for o in ours_objs if o.type == 'ARMATURE')
rb_mesh = next(o for o in rb_objs if o.type == 'MESH')
rb_arm = next(o for o in rb_objs if o.type == 'ARMATURE')

def world(o, co): M = np.array(o.matrix_world); return co @ M[:3, :3].T + M[:3, 3]
def coords(o, key=None):
    src = key.data if key is not None else o.data.vertices
    a = np.zeros(len(src) * 3); src.foreach_get('co', a); return world(o, a.reshape(-1, 3))
def bone(arm, name): return np.array(arm.matrix_world @ arm.data.bones[name].head_local)

def landmarks(V, eL, eR):
    mid = (eL + eR) / 2; ipd = np.linalg.norm(eL - eR)
    up = np.array([0, 0, 1.0]); right = (eR - eL) / ipd
    near = V[np.linalg.norm(V - mid, axis=1) < 2.2 * ipd]
    fwd = mid - near.mean(0); fwd -= up * fwd.dot(up); fwd -= right * fwd.dot(right); fwd /= np.linalg.norm(fwd)
    lat = (V - mid) @ right; z = (V - mid) @ up; f = (V - mid) @ fwd
    head = (np.abs(lat) < 1.6 * ipd) & (z > -2.4 * ipd) & (z < 2.6 * ipd) & (f > -3.5 * ipd)
    def best(mask, score):
        i = np.where(mask & head)[0]; return V[i[np.argmax(score[i])]]
    mid_line = np.abs(lat) < 0.15 * ipd
    L = {'eL': eL, 'eR': eR,
         'nose': best(mid_line & (z < -0.2 * ipd) & (z > -1.1 * ipd), f),
         'lips': best(mid_line & (z < -1.1 * ipd) & (z > -1.6 * ipd), f),
         'chin': best(mid_line & (z < -1.6 * ipd) & (z > -2.2 * ipd), f),
         'earL': best((z > -0.9 * ipd) & (z < 0.0) & (lat < 0), -lat),
         'earR': best((z > -0.9 * ipd) & (z < 0.0) & (lat > 0), lat),
         'top': best(mid_line & (f > -1.5 * ipd), z),
         'back': best(mid_line & (z > 0.2 * ipd) & (z < 1.2 * ipd), -f)}
    return L, mid, ipd, fwd

V0 = coords(body, body.data.shape_keys.key_blocks['Basis'])
VR = coords(rb_mesh)
# Rocketbox: the skin's head material only for the landmarks (not the hair cards)
mats = [m.name for m in rb_mesh.data.materials]
poly_mat = np.zeros(len(rb_mesh.data.polygons), int); rb_mesh.data.polygons.foreach_get('material_index', poly_mat)
head_idx = [i for i, n in enumerate(mats) if n.endswith('_head')]
vmask = np.zeros(len(VR), bool)
for p, mi in zip(rb_mesh.data.polygons, poly_mat):
    if mi in head_idx: vmask[list(p.vertices)] = True
LO, midO, ipdO, fO = landmarks(V0, bone(ours_arm, 'LeftEye'), bone(ours_arm, 'RightEye'))
LR, midR, ipdR, fR = landmarks(VR[vmask], bone(rb_arm, 'Bip01 LEye'), bone(rb_arm, 'Bip01 REye'))
# (the eyes' sides by the facing: whichever is on the right of the facing)
names = list(LO)
A = np.array([LO[k] for k in names]); B = np.array([LR[k] for k in names])
print('ipd ours', ipdO, 'rb', ipdR)
for k in names: print(' ', k, np.round(LO[k], 3), np.round(LR[k], 3))
# similarity (Umeyama): ours to theirs
ma, mb = A.mean(0), B.mean(0); Ac, Bc = A - ma, B - mb
U, Sg, Vt = np.linalg.svd(Bc.T @ Ac); D = np.eye(3); D[2, 2] = np.sign(np.linalg.det(U @ Vt))
R = U @ D @ Vt; s = (Sg * np.diag(D)).sum() / (Ac ** 2).sum(); t = mb - s * R @ ma
sim = lambda X: s * X @ R.T + t
print('scale', s, 'residual after similarity (mm)', np.round(np.linalg.norm(sim(A) - B, axis=1) * 1000, 1))
# thin-plate warp of the landmarks' residuals
P = sim(A); W = B - P
def tps(X):
    r = np.linalg.norm(X[:, None, :] - P[None, :, :], axis=2); return r  # r^1 kernel in 3D
K = tps(P); n = len(P)
M = np.zeros((n + 4, n + 4)); M[:n, :n] = K + 1e-6 * np.eye(n); M[:n, n] = 1; M[:n, n + 1:] = P; M[n, :n] = 1; M[n + 1:, :n] = P.T
coef = np.linalg.solve(M, np.vstack([W, np.zeros((4, 3))]))
def warp(X): Y = sim(X); return Y + tps(Y) @ coef[:n] + coef[n] + Y @ coef[n + 1:]
print('residual after warp (mm)', np.round(np.linalg.norm(warp(A) - B, axis=1) * 1000, 2))
VW = warp(V0)
# our warped head as a triangle tree
import bmesh
bm = bmesh.new(); bm.from_mesh(body.data); bmesh.ops.triangulate(bm, faces=bm.faces)
tris = np.array([[v.index for v in f.verts] for f in bm.faces]); bm.free()
tree = BVHTree.FromPolygons([tuple(map(float, v)) for v in VW], [tuple(map(int, t)) for t in tris])
# the Rocketbox vertices of the head (skin and hair) bound to the closest point of ours
z_rb = (VR - midR) @ np.array([0, 0, 1.0])
region = z_rb > -2.9 * ipdR
bind = {}
for i in np.where(region)[0]:
    loc, nrm, fi, d = tree.find_nearest(mathutils.Vector(VR[i]))
    if fi is None or d > 0.04: continue
    a, b, c = VW[tris[fi]]
    w = mathutils.geometry.barycentric_transform(loc, mathutils.Vector(a), mathutils.Vector(b), mathutils.Vector(c),
                                                 mathutils.Vector((1, 0, 0)), mathutils.Vector((0, 1, 0)), mathutils.Vector((0, 0, 1)))
    fall = np.clip((z_rb[i] + 2.9 * ipdR) / (0.5 * ipdR), 0, 1)
    bind[i] = (tris[fi], np.array(w), fall)
print('bound', len(bind), 'of', region.sum(), 'head-region vertices')
# each face shape across
skip = ('body-', 'Basis')
if not rb_mesh.data.shape_keys: rb_mesh.shape_key_add(name='Basis')
Minv = np.linalg.inv(np.array(rb_mesh.matrix_world)[:3, :3])
base_local = np.zeros(len(VR) * 3); rb_mesh.data.vertices.foreach_get('co', base_local); base_local = base_local.reshape(-1, 3)
ids = np.array(list(bind)); tri = np.array([bind[i][0] for i in ids]); bw = np.array([bind[i][1] for i in ids]); fall = np.array([bind[i][2] for i in ids])
made = 0
for kb in body.data.shape_keys.key_blocks:
    if kb.name.startswith(skip): continue
    d = coords(body, kb) - V0
    if np.abs(d).max() < 1e-5: continue
    dw = (d @ R.T) * s   # into theirs (the warp's own rotation is small)
    dv = (dw[tri] * bw[:, :, None]).sum(1) * fall[:, None]
    key = rb_mesh.shape_key_add(name=kb.name, from_mix=False)
    co = base_local.copy(); co[ids] += dv @ Minv.T
    key.data.foreach_set('co', co.ravel()); made += 1
print('shapes made', made)
for o in list(ours_objs): bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.object.select_all(action='DESELECT'); rb_mesh.select_set(True); rb_arm.select_set(True)
bpy.ops.export_scene.fbx(filepath=out_path, use_selection=True, add_leaf_bones=False, bake_anim=False, use_mesh_modifiers=False,
                         mesh_smooth_type='FACE', path_mode='STRIP')
print('wrote', out_path)
