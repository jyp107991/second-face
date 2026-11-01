"""A new person in Rocketbox's house style with an ancestry Rocketbox lacks (owner, 2026-11-01: "harmonise across the two:
take details from VALID that fill in archetype gaps and increase diversity across and within groups, while keeping the
house style of Rocketbox"). Everything seen stays Rocketbox's (its photographed head and skin detail, hair cards, body
and clothes); VALID gives one thing: the difference between two of its groups' mean faces (valid_groups.py), which keeps
what tells the groups apart and cancels what VALID's construction does to every face alike. That difference is carried
onto a real Rocketbox head of the source group: the head keeps its own individual form (so two people made from two
heads differ as real people do) and takes on the target group's typical one.
Fit: anatomical landmarks found the same way on both (rocketbox_features.Face); a similarity, then a
regularised thin-plate warp of VALID's source-group mean onto the Rocketbox head; each Rocketbox vertex bound to the
closest point of the warped mean; the difference carried across, rotated and scaled by the similarity. Kept to the face
(faded out below the chin, above the brow and behind the cheeks: VALID's skull carries its hairstyles' bulk), never on
the eyeballs, and with each eye's surroundings held so the lids stay centred on Rocketbox's eyeballs. Applied to the
mesh and to every shape key, so the calibrated sculptor still works on the new person.
Writes <out>/<name>.fbx and <out>/<name>.json (what retone.py needs: the cheeks' and eyeballs' texture coordinates).
Usage: blender -b --python harmonise.py -- <rocketbox fbx> <groups.npz> <sex f|m> <source group> <target spec> <out dir> <name>
  target spec: a VALID group (AIAN) or a mixture (AIAN:0.6+Hispanic:0.4)"""
import bpy, sys, os, json
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rocketbox_features as rbf

base_path, groups_path, sex, source, target, out_dir, name = sys.argv[sys.argv.index('--') + 1:][:7]
os.makedirs(out_dir, exist_ok=True)
G = np.load(groups_path)
Tv = G['T']
mix = [(t.split(':')[0], float(t.split(':')[1]) if ':' in t else 1.0) for t in target.split('+')]
wsum = sum(w for _, w in mix)
Vs = G[f'mean:{source}_{sex}'].astype(float)
Vt = sum(G[f'mean:{g}_{sex}'].astype(float) * (w / wsum) for g, w in mix)
D = Vt - Vs                                            # the groups' difference, VALID's eyes' frame, mm

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=base_path)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
mesh = max((o for o in bpy.data.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
bone = lambda n: np.array(arm.matrix_world @ arm.data.bones[n].head_local)
eL, eR = bone('Bip01 LEye'), bone('Bip01 REye')
mid = (eL + eR) / 2; xa = (eL - eR) / np.linalg.norm(eL - eR); za = np.array([0, 0, 1.0]); za -= xa * za.dot(xa); za /= np.linalg.norm(za)
ya = np.cross(za, xa)
hd = mid - bone('Bip01 Head'); hd -= xa * hd.dot(xa); hd[2] = 0
if hd.dot(-ya) < 0: ya = -ya
Bm = np.stack([xa, ya, za])
Mw = np.array(mesh.matrix_world)
def frame(W): return (W - mid) @ Bm.T * 1000.0
def coords(src):
    a = np.zeros(len(src) * 3); src.foreach_get('co', a); return a.reshape(-1, 3)
Vloc = coords(mesh.data.vertices)
P = frame(Vloc @ Mw[:3, :3].T + Mw[:3, 3])            # Rocketbox's vertices, its eyes' frame, mm

# landmarks on both, found the same way
mats = [m.name if m else '' for m in mesh.data.materials]
head_mi = {i for i, nm in enumerate(mats) if nm.endswith('_head')}
TR = []
for p in mesh.data.polygons:
    if p.material_index in head_mi:
        v = list(p.vertices); TR += [(v[0], v[k], v[k + 1]) for k in range(1, len(v) - 1)]
TR = np.array(TR)
FR = rbf.Face(P, TR)
near_v = (np.linalg.norm(Vs, axis=1) < 200) & (Vs[:, 2] > -180)
TV = Tv[near_v[Tv].all(1)]
FV = rbf.Face(Vs, TV)
keys = [k for k in FR.L if k in FV.L]
# the nose's wings only where both were found on the wing (a "nose" wider than 46 mm is the cheek's edge)
for F_, X_ in ((FR, P), (FV, Vs)):
    if 'alL' in F_.L and abs(F_.L['alL'].at(X_)[0, 0] - F_.L['alR'].at(X_)[0, 0]) > 46: keys = [k for k in keys if k not in ('alL', 'alR')]
A = np.array([FV.L[k].at(Vs)[0] for k in keys], float)                                  # VALID's source-group mean
ipd_r = np.linalg.norm(eL - eR) * 1000 / 2
B = np.array([FR.L[k].at(P)[0] for k in keys], float)                                   # the Rocketbox head
ma, mb = A.mean(0), B.mean(0)
U, Sg, Vt_ = np.linalg.svd((B - mb).T @ (A - ma)); Dg = np.eye(3); Dg[2, 2] = np.sign(np.linalg.det(U @ Vt_))
R = U @ Dg @ Vt_; s = (Sg * np.diag(Dg)).sum() / ((A - ma) ** 2).sum(); t = mb - s * R @ ma
sim = lambda X: s * X @ R.T + t
Ps = sim(A); W = B - Ps
n = len(Ps); lam = 0.5          # near-interpolating: the landmarks are the correspondence
K = np.linalg.norm(Ps[:, None] - Ps[None], axis=2)
Mtx = np.zeros((n + 4, n + 4)); Mtx[:n, :n] = K + lam * np.eye(n); Mtx[:n, n] = 1; Mtx[:n, n + 1:] = Ps; Mtx[n, :n] = 1; Mtx[n + 1:, :n] = Ps.T
coef = np.linalg.solve(Mtx, np.vstack([W, np.zeros((4, 3))]))
def warp(X):
    Y = sim(X); return Y + np.linalg.norm(Y[:, None] - Ps[None], axis=2) @ coef[:n] + coef[n] + Y @ coef[n + 1:]
res_before = np.linalg.norm(sim(A) - B, axis=1); res_after = np.linalg.norm(warp(A) - B, axis=1)
print('landmarks', len(keys), 'scale', round(s, 3), 'residual mm after similarity', res_before.round(1).tolist(), 'after warp', res_after.round(1).tolist())

# bind Rocketbox's vertices to the warped mean and carry the difference across
Vw = warp(Vs)
tree = BVHTree.FromPolygons([tuple(map(float, v)) for v in Vw], [tuple(map(int, f)) for f in TV])
region = (P[:, 2] > -200) & (np.linalg.norm(P, axis=1) < 230)
dP = np.zeros_like(P); bound = np.zeros(len(P), bool)
for i in np.where(region)[0]:
    loc, nrm, fi, dist = tree.find_nearest(Vector(P[i]))
    if fi is None or dist > 25: continue
    a, b, c = (Vw[j] for j in TV[fi])
    v0, v1, v2 = b - a, c - a, np.array(loc) - a
    d00, d01, d11, d20, d21 = v0 @ v0, v0 @ v1, v1 @ v1, v2 @ v0, v2 @ v1
    den = d00 * d11 - d01 * d01
    if abs(den) < 1e-12: continue
    wv = (d11 * d20 - d01 * d21) / den; ww = (d00 * d21 - d01 * d20) / den; wu = 1 - wv - ww
    dv = wu * D[TV[fi][0]] + wv * D[TV[fi][1]] + ww * D[TV[fi][2]]
    dP[i] = s * R @ dv; bound[i] = True
smooth = lambda e0, e1, x: np.clip((x - e0) / (e1 - e0), 0, 1) ** 2 * (3 - 2 * np.clip((x - e0) / (e1 - e0), 0, 1))
me_z = FR.L['me'].at(P)[0, 2]
w = smooth(me_z - 45, me_z - 8, P[:, 2]) * (1 - smooth(28, 58, P[:, 2])) * (1 - smooth(22, 55, P[:, 1]))
eyes = [np.array([ipd_r, 0, 0.0]), np.array([-ipd_r, 0, 0.0])]
# the eyeballs: the mesh's islands that lie wholly within 20 mm of an eye bone (Rocketbox's eyes are separate pieces of
# the head's mesh); never moved, and the lids around them held (below)
parent = list(range(len(P)))
def find(i):
    while parent[i] != i: parent[i] = parent[parent[i]]; i = parent[i]
    return i
for e_ in mesh.data.edges:
    a_, b_ = find(e_.vertices[0]), find(e_.vertices[1])
    if a_ != b_: parent[a_] = b_
roots = np.array([find(i) for i in range(len(P))])
ball = np.zeros(len(P), bool)
for e in eyes:
    d = np.linalg.norm(P - e, axis=1)
    for r in np.unique(roots[d < 20]):
        isl = roots == r
        if isl.sum() < 400 and (d[isl] < 20).all(): ball |= isl
w[ball] = 0
dP *= w[:, None]
pinned = []
for e in eyes:
    d = np.linalg.norm(P - e, axis=1)
    ring = (d > 13) & (d < 20) & (P[:, 1] < 10) & bound
    if ring.any():
        m = dP[ring].mean(0); pinned.append(m.round(2).tolist())
        dP -= (1 - smooth(18, 32, d))[:, None] * m[None]
mag = np.linalg.norm(dP, axis=1)
print('eyeball vertices', int(ball.sum()), '; moved', int((mag > 0.1).sum()), 'vertices; mean', round(float(mag[mag > 0.1].mean()), 2), 'max', round(float(mag.max()), 2), 'mm; eyes held by', pinned)

# into the mesh and every shape key
dW = (dP / 1000.0) @ Bm                                 # world
dL = dW @ np.linalg.inv(Mw[:3, :3]).T                  # the mesh's own space
if mesh.data.shape_keys:
    for kb in mesh.data.shape_keys.key_blocks:
        c = coords(kb.data) + dL; kb.data.foreach_set('co', c.ravel())
c = Vloc + dL; mesh.data.vertices.foreach_set('co', c.ravel()); mesh.data.update()

# what retone.py needs: the texture coordinates of the cheeks (to read the skin's colour) and of the eyeballs
uvl = mesh.data.uv_layers.active.data
vuv = {}
for p in mesh.data.polygons:
    for vi, li in zip(p.vertices, p.loop_indices): vuv.setdefault(vi, (mats[p.material_index], tuple(uvl[li].uv)))
front = P[:, 1] < -5
cheek = [vuv[i] for i in np.where((np.abs(P[:, 0]) > 28) & (np.abs(P[:, 0]) < 52) & (P[:, 2] < -15) & (P[:, 2] > -45) & front)[0] if i in vuv and vuv[i][0].endswith('_head')]
eyeballs = {}
for k, e in zip(('L', 'R'), eyes):
    ids = [i for i in np.where(ball & (np.linalg.norm(P - e, axis=1) < 20))[0] if i in vuv]
    if ids:
        mat = max(set(vuv[i][0] for i in ids), key=[vuv[i][0] for i in ids].count)
        uv = np.array([vuv[i][1] for i in ids if vuv[i][0] == mat])
        eyeballs[k] = {'material': mat, 'uv_min': uv.min(0).tolist(), 'uv_max': uv.max(0).tolist(), 'n': len(uv)}
json.dump({'base': os.path.basename(base_path), 'source': source, 'target': target, 'sex': sex,
           'cheek_uv': [list(u) for _, u in cheek], 'cheek_material': cheek[0][0] if cheek else None, 'eyeballs': eyeballs,
           'landmarks': keys, 'scale': s, 'moved_max_mm': float(mag.max())}, open(os.path.join(out_dir, name + '.json'), 'w'))
for o in [o for o in bpy.data.objects if o.type not in ('MESH', 'ARMATURE')]: bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.fbx(filepath=os.path.join(out_dir, name + '.fbx'), use_selection=True, add_leaf_bones=False, bake_anim=False,
                         use_mesh_modifiers=False, mesh_smooth_type='FACE', path_mode='STRIP')
print('wrote', os.path.join(out_dir, name + '.fbx'))
