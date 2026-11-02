"""A real photographed scalp and hairline for a man's head (owner, 2026-11-02: "men need hairline adjustments for realism:
height, tidying, removing face/hair seams"; the men in caps and hoods to be finished). The flat repaint of scalp_paint.py
read as a painted block; here the scalp, the hairline and the skin just under it come from a donor Rocketbox head's own
photograph (a buzzed man: Military_Male_01, or Male_Adult_12 for a receding line), carried across geometrically: each
texel of this head above SCALP_CUT mm over the eyes (with the sides down to the temples) goes to its point on the head,
to the donor's head point at the same place (both in their eyes' frames, the donor scaled to this head's eye spacing,
turned about the ear-to-ear axis so the donor's hairline lands SCALP_LIFT mm higher or lower), and takes that texel's
place in the donor's texture. Writes <out>/scalp_map.npz for scalp_photo_finish.py, which samples and composites.
Usage: blender -b --python scalp_photo.py -- <head fbx> <donor fbx> <out dir>
Env: SCALP_CUT (mm above the eyes' centres by which the donor has taken over: above the brows, 45), SCALP_LIFT (mm, 0), SCALP_FEATHER (12)."""
import bpy, sys, os, math
import numpy as np
from mathutils import Vector
from mathutils.kdtree import KDTree

head_path, donor_path, out_dir = sys.argv[sys.argv.index('--') + 1:][:3]
CUT = float(os.environ.get('SCALP_CUT', 45.0)); LIFT = float(os.environ.get('SCALP_LIFT', 0.0)); FEATHER = float(os.environ.get('SCALP_FEATHER', 12.0))
os.makedirs(out_dir, exist_ok=True)


def load(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=path)
    objs = [o for o in bpy.data.objects if o not in before]
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
    mats = [m.name if m else '' for m in mesh.data.materials]
    hmi = {i for i, nm in enumerate(mats) if nm.endswith('_head')}
    uvl = mesh.data.uv_layers.active.data
    # only the head itself: the largest piece of the head material joined by edges (not a cap, goggles or other gear
    # modelled in it, whose texels are camouflage or straps)
    polys = [p for p in mesh.data.polygons if p.material_index in hmi]
    by_edge = {}
    for p in polys:
        for ek in p.edge_keys: by_edge.setdefault(ek, []).append(p.index)
    root = {p.index: p.index for p in polys}
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
    return P, np.array(TR), np.array(TUV, np.float64), next(mats[i] for i in hmi), np.linalg.norm(eL - eR) * 1000.0


def raster(P, TR, TUV, W, H, keep):
    pts = np.full((H, W, 3), np.nan, np.float32)
    for tri, uv in zip(TR, TUV):
        q = P[list(tri)]
        if not keep(q.mean(0)): continue
        px = uv[:, 0] * W; py = (1 - uv[:, 1]) * H
        x0, x1 = int(max(px.min() - 1, 0)), int(min(px.max() + 2, W)); y0, y1 = int(max(py.min() - 1, 0)), int(min(py.max() + 2, H))
        if x1 <= x0 or y1 <= y0: continue
        gx, gy = np.meshgrid(np.arange(x0, x1) + 0.5, np.arange(y0, y1) + 0.5)
        d = (px[1] - px[0]) * (py[2] - py[0]) - (px[2] - px[0]) * (py[1] - py[0])
        if abs(d) < 1e-9: continue
        w1 = ((gx - px[0]) * (py[2] - py[0]) - (px[2] - px[0]) * (gy - py[0])) / d
        w2 = ((px[1] - px[0]) * (gy - py[0]) - (gx - px[0]) * (py[1] - py[0])) / d
        w0 = 1 - w1 - w2
        inside = (w0 >= -0.002) & (w1 >= -0.002) & (w2 >= -0.002)
        if not inside.any(): continue
        pt = w0[..., None] * q[0] + w1[..., None] * q[1] + w2[..., None] * q[2]
        blk = pts[y0:y1, x0:x1]; blk[inside] = pt[inside]
    ys, xs = np.where(~np.isnan(pts[..., 0]))
    return ys, xs, pts[ys, xs].astype(np.float64)


bpy.ops.wm.read_factory_settings(use_empty=True)
P, TR, TUV, hmat, ipd = load(head_path)
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
for m in list(bpy.data.materials): bpy.data.materials.remove(m)    # (the donor's names must not come back as '.001')
for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
Pd, TRd, TUVd, dmat, ipd_d = load(donor_path)
W = H = 2048
# the scalp and the skin just under it: above the cut less a feather, on the head's crown and sides, never the ears' level
# below the temples or the face
up = lambda q: q[2] > CUT - FEATHER - 14 and np.linalg.norm(q) < 190
ys, xs, Q = raster(P, TR, TUV, W, H, up)
ysd, xsd, Qd = raster(Pd, TRd, TUVd, W, H, lambda q: q[2] > CUT - FEATHER - 40 and np.linalg.norm(q) < 200)
Qd = Qd * (ipd / ipd_d)                                       # the donor at this head's size
# turn the donor about the ear-to-ear axis through the skull's centre so that its hairline lands LIFT mm higher here
c = np.array([0.0, 45.0, 10.0]); r = 95.0; ang = -LIFT / r     # (raise the line here = look lower on the donor)
Rx = np.array([[1, 0, 0], [0, math.cos(ang), -math.sin(ang)], [0, math.sin(ang), math.cos(ang)]])
Qq = (Q - c) @ Rx.T + c
kd = KDTree(len(Qd))
for i, q in enumerate(Qd): kd.insert(Vector(q), i)
kd.balance()
uvd = np.zeros((len(Q), 2), np.float32); dist = np.zeros(len(Q), np.float32)
for i, q in enumerate(Qq):
    co, j, d = kd.find(Vector(q))
    uvd[i] = ((xsd[j] + 0.5) / W, 1 - (ysd[j] + 0.5) / H); dist[i] = d
alpha = np.clip((Q[:, 2] - (CUT - FEATHER)) / FEATHER, 0, 1) * np.clip((20 - dist) / 8, 0, 1)
# the sides: below the temples only behind the ear's front (the sideburns stay this head's own)
ramp = lambda e0, e1, v: np.clip((v - e0) / (e1 - e0), 0, 1)
alpha *= 1 - ramp(48, 60, np.abs(Q[:, 0])) * ramp(CUT + 30, CUT + 15, Q[:, 2]) * ramp(30, 15, Q[:, 1])
np.savez_compressed(os.path.join(out_dir, 'scalp_map.npz'), ys=ys, xs=xs, uvd=uvd, alpha=alpha.astype(np.float32), z=Q[:, 2].astype(np.float32),
                    x=Q[:, 0].astype(np.float32), y=Q[:, 1].astype(np.float32), cut=np.array([CUT, FEATHER]), mat=np.array(hmat), dmat=np.array(dmat), size=np.array([H, W]))
print('scalp map', len(Q), 'texels;', int((alpha > 0.5).sum()), 'from the donor; mean distance', round(float(dist.mean()), 1), 'mm')
