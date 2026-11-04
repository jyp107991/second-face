"""The realism gate's view of a head (Blender): the head seen straight on, as a camera sees it, but read in its own texture
(no light, no shading): a ray along the eyes' frame's depth for every 0.4 mm of width and height, from in front of the
face, its first hit on the head's skin and that point's place in the texture. Rays round a head from its centre (the
hairline's map) meet the mouth's inside before the chin; a face is judged the way it is seen.
Usage: blender -b --python qa_map.py -- <person fbx> <its head colour jpg> <out dir>
Writes <out>/qa_map.npz: size (texture), PU, PV (texture px), PXYZ (mm, eyes' frame), grid (x0, z0, step); the same for each
side, seen from the subject's left and right (PU_L, PV_L, PXYZ_L, PU_R, ...; sgrid: y0, z0, step)."""
import bpy, sys, os
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

head_path, col_path, out_dir = sys.argv[sys.argv.index('--') + 1:][:3]
os.makedirs(out_dir, exist_ok=True)
STEP, X0, X1, Z0, Z1 = 0.4, -80.0, 80.0, -150.0, 100.0
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=head_path)
objs = list(bpy.data.objects)
arm = next(o for o in objs if o.type == 'ARMATURE')
mesh = max((o for o in objs if o.type == 'MESH' and any(m and m.name.endswith('_head') for m in o.data.materials)), key=lambda o: len(o.data.vertices))
b = lambda n: np.array(arm.matrix_world @ arm.data.bones[n].head_local)
eL, eR = b('Bip01 LEye'), b('Bip01 REye')
mid = (eL + eR) / 2; xa = (eL - eR) / np.linalg.norm(eL - eR); za = np.array([0, 0, 1.0]); za -= xa * za.dot(xa); za /= np.linalg.norm(za)
ya = np.cross(za, xa); hd = mid - b('Bip01 Head'); hd -= xa * hd.dot(xa); hd[2] = 0
if hd.dot(-ya) < 0: ya = -ya
Bm = np.stack([xa, ya, za]); Mw = np.array(mesh.matrix_world)
a = np.zeros(len(mesh.data.vertices) * 3); mesh.data.vertices.foreach_get('co', a)
P = ((a.reshape(-1, 3) @ Mw[:3, :3].T + Mw[:3, 3]) - mid) @ Bm.T * 1000.0
hmi = {i for i, m in enumerate(mesh.data.materials) if m and m.name.endswith('_head')}
uvl = mesh.data.uv_layers.active.data
polys = [p for p in mesh.data.polygons if p.material_index in hmi]
by_edge, root = {}, {p.index: p.index for p in polys}
for p in polys:
    for ek in p.edge_keys: by_edge.setdefault(ek, []).append(p.index)
def find(i):
    while root[i] != i: root[i] = root[root[i]]; i = root[i]
    return i
for ps in by_edge.values():
    for q in ps[1:]:
        a_, b_ = find(ps[0]), find(q)
        if a_ != b_: root[a_] = b_
sizes = {}
for p in polys: sizes[find(p.index)] = sizes.get(find(p.index), 0) + 1
main = max(sizes, key=sizes.get)
TR, TUV = [], []
for p in polys:
    if find(p.index) != main: continue
    v = list(p.vertices); l = list(p.loop_indices)
    for k in range(1, len(v) - 1):
        TR.append((v[0], v[k], v[k + 1])); TUV.append((uvl[l[0]].uv[:], uvl[l[k]].uv[:], uvl[l[k + 1]].uv[:]))
TR, TUV = np.array(TR), np.array(TUV, np.float64)
img = bpy.data.images.load(col_path); W, H = img.size
bvh = BVHTree.FromPolygons([tuple(map(float, v)) for v in P], [tuple(map(int, f)) for f in TR])
xs = np.arange(X0, X1 + 1e-9, STEP); zs = np.arange(Z0, Z1 + 1e-9, STEP)
PU = np.full((len(zs), len(xs)), np.nan, np.float32); PV = PU.copy(); PXYZ = np.full((len(zs), len(xs), 3), np.nan, np.float32)
d = Vector((0.0, 1.0, 0.0))
for j, z in enumerate(zs):
    for i, x in enumerate(xs):
        loc, nrm, fi, dist = bvh.ray_cast(Vector((float(x), -300.0, float(z))), d, 600.0)
        if fi is None: continue
        a_, b_, c_ = (P[k] for k in TR[fi]); p = np.array(loc)
        v0, v1, v2 = b_ - a_, c_ - a_, p - a_
        d00, d01, d11, d20, d21 = v0 @ v0, v0 @ v1, v1 @ v1, v2 @ v0, v2 @ v1
        den = d00 * d11 - d01 * d01
        if abs(den) < 1e-12: continue
        wv = (d11 * d20 - d01 * d21) / den; ww = (d00 * d21 - d01 * d20) / den
        uv = np.array([1 - wv - ww, wv, ww]) @ TUV[fi]
        PU[j, i] = uv[0] * W - 0.5; PV[j, i] = (1 - uv[1]) * H - 0.5; PXYZ[j, i] = p
# and each side, seen straight on from the subject's left (+x) and right (-x): the temples, sideburns and the beard's
# join, which the front sees edge-on
Y0, Y1 = -70.0, 120.0
ys_ = np.arange(Y0, Y1 + 1e-9, STEP)
side = {}
for tag, sx in (('L', 1.0), ('R', -1.0)):
    SU = np.full((len(zs), len(ys_)), np.nan, np.float32); SV = SU.copy(); SP = np.full((len(zs), len(ys_), 3), np.nan, np.float32)
    dv = Vector((-sx, 0.0, 0.0))
    for j, z in enumerate(zs):
        for i, y in enumerate(ys_):
            loc, nrm, fi, dist = bvh.ray_cast(Vector((sx * 300.0, float(y), float(z))), dv, 600.0)
            if fi is None: continue
            a_, b_, c_ = (P[k] for k in TR[fi]); p = np.array(loc)
            v0, v1, v2 = b_ - a_, c_ - a_, p - a_
            d00, d01, d11, d20, d21 = v0 @ v0, v0 @ v1, v1 @ v1, v2 @ v0, v2 @ v1
            den = d00 * d11 - d01 * d01
            if abs(den) < 1e-12: continue
            wv = (d11 * d20 - d01 * d21) / den; ww = (d00 * d21 - d01 * d20) / den
            uv = np.array([1 - wv - ww, wv, ww]) @ TUV[fi]
            SU[j, i] = uv[0] * W - 0.5; SV[j, i] = (1 - uv[1]) * H - 0.5; SP[j, i] = p
    side[tag] = (SU, SV, SP)
np.savez_compressed(os.path.join(out_dir, 'qa_map.npz'), size=np.array([H, W]), PU=PU, PV=PV, PXYZ=PXYZ, grid=np.array([X0, Z0, STEP]),
                    PU_L=side['L'][0], PV_L=side['L'][1], PXYZ_L=side['L'][2], PU_R=side['R'][0], PV_R=side['R'][1], PXYZ_R=side['R'][2],
                    sgrid=np.array([Y0, Z0, STEP]))
print('qa map', PU.shape, int(np.isfinite(PU).sum()), 'hits; sides', side['L'][0].shape)
