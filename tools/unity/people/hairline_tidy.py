"""A man's hairline drawn the way hair grows, on his head's own photographed scalp (owner, 2026-11-02/03: "Black men's
hairlines are messy"; "what is this semicircle hairline from ear to ear? that is not how human hair grows").
A man's hairline is not one arc round the head: across the forehead it is nearly flat, at each temple it turns a corner (the
frontotemporal angle, receding into an M with age), and from there the temporal line runs almost straight down, in front of
the ear, to the sideburn. The first version moved the photographed line as one smoothed curve, which can only be an arc.
Here the target is built from that anatomy, in the head's eyes' frame (mm; x across, y back, z up, from the eyes' centres):
- the front: z = H - 3 (x / 45)^2, H the photographed line's own height at the midline plus HT_LIFT, with an M-shaped
  recession of HT_RECEDE mm peaking 40 mm out (receding corners);
- the temporal line: the photographed temple's own boundary, found as the depth y where the hair begins at each height
  on each side and fitted by a straight line (the average of the two sides), pushed HT_RECEDE * 0.8 mm back at the top;
- the two joined by a rounded corner (a smooth maximum of the two signed distances, radius 3 mm), the edge ~3 mm soft and
  wandering under a millimetre.
The texture is reworked on a map laid round the head (azimuth and elevation from the skull's centre, a quarter of a
degree a pixel, every point a ray to the head's own surface: seam-free, unlike the texture's layout), in the finish.
This half (Blender) writes the map's geometry and the texels' places on it: <out>/hairline_map.npz.
Usage: blender -b --python hairline_tidy.py -- <head fbx> <its head colour jpg> <out dir>
Env: HT_LIFT (mm, 0), HT_RECEDE (mm, 0), HT_SEED (the edge's wander, 1)."""
import bpy, sys, os, math
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

head_path, col_path, out_dir = sys.argv[sys.argv.index('--') + 1:][:3]
LIFT = float(os.environ.get('HT_LIFT', 0.0)); RECEDE = float(os.environ.get('HT_RECEDE', 0.0)); SEED = int(os.environ.get('HT_SEED', 1))
os.makedirs(out_dir, exist_ok=True)
C = np.array([0.0, 45.0, 10.0])                              # the skull's centre in the eyes' frame (mm)
STEP = math.radians(0.25); AZ0, AZ1 = math.radians(-105), math.radians(105); EL0, EL1 = math.radians(-40), math.radians(86)


def load(path):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=path)
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
    # only the head itself (its largest piece joined by edges), never gear modelled in its material
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
    return P, np.array(TR), np.array(TUV, np.float64)


def raster(P, TR, TUV, W, H):
    pts = np.full((H, W, 3), np.nan, np.float32)
    for tri, uv in zip(TR, TUV):
        q = P[list(tri)]
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


P, TR, TUV = load(head_path)
img = bpy.data.images.load(col_path); W, H = img.size
# the map: a ray from the skull's centre for every pixel, its point on the head and that point's place in the texture
bvh = BVHTree.FromPolygons([tuple(map(float, v)) for v in P], [tuple(map(int, f)) for f in TR])
azs = np.arange(AZ0, AZ1 + 1e-9, STEP); els = np.arange(EL0, EL1 + 1e-9, STEP)
nA, nE = len(azs), len(els)
PU = np.full((nE, nA), np.nan, np.float32); PV = np.full((nE, nA), np.nan, np.float32)
PXYZ = np.full((nE, nA, 3), np.nan, np.float32); HD = np.full((nE, nA), np.nan, np.float32)
c0 = Vector(tuple(C))
for j, e in enumerate(els):
    ce, se = math.cos(e), math.sin(e)
    for i, a in enumerate(azs):
        loc, nrm, fi, dist = bvh.ray_cast(c0, Vector((math.sin(a) * ce, -math.cos(a) * ce, se)), 400.0)
        if fi is None: continue
        a_, b_, c_ = (P[k] for k in TR[fi])
        p = np.array(loc)
        v0, v1, v2 = b_ - a_, c_ - a_, p - a_
        d00, d01, d11, d20, d21 = v0 @ v0, v0 @ v1, v1 @ v1, v2 @ v0, v2 @ v1
        den = d00 * d11 - d01 * d01
        if abs(den) < 1e-12: continue
        wv = (d11 * d20 - d01 * d21) / den; ww = (d00 * d21 - d01 * d20) / den
        uv = np.array([1 - wv - ww, wv, ww]) @ TUV[fi]
        PU[j, i] = uv[0] * W - 0.5; PV[j, i] = (1 - uv[1]) * H - 0.5; PXYZ[j, i] = p; HD[j, i] = dist
# every texel of the head on the map (for writing back), never one standing off the skull's ray surface (an ear's rim)
ys, xs, Q = raster(P, TR, TUV, W, H)
Dq = Q - C; rq = np.linalg.norm(Dq, axis=1); Dq /= rq[:, None]
taz = np.arctan2(Dq[:, 0], -Dq[:, 1]); tel = np.arcsin(np.clip(Dq[:, 2], -1, 1))
ca = (taz - AZ0) / STEP; ce_ = (tel - EL0) / STEP
inmap = (ca >= 0) & (ca <= nA - 1) & (ce_ >= 0) & (ce_ <= nE - 1)
hd_at = np.full(len(Q), np.nan); hd_at[inmap] = HD[np.round(ce_[inmap]).astype(int), np.round(ca[inmap]).astype(int)]
on = inmap & np.isfinite(hd_at) & (rq < hd_at + 4.0)
# the forehead's skin (for the skin's value), the scalp all round (the finish's despeckle and tone: above the brows, or
# behind the ears down to the nape, never the brows, beard or face), the skin above the brows (the normal map's relief)
fore = (np.abs(taz) < math.radians(20)) & (Q[:, 2] > 22) & (Q[:, 2] < 34) & (Q[:, 1] < 20)
scalp = (Q[:, 2] > 30) | ((Q[:, 1] > 30) & (Q[:, 2] > -30))
reg = (Q[:, 2] > 22) & (np.abs(taz) < math.radians(100)) & (Q[:, 1] < 60)
np.savez_compressed(os.path.join(out_dir, 'hairline_map.npz'), size=np.array([H, W]),
                    PU=PU, PV=PV, PXYZ=PXYZ, map0=np.array([AZ0, EL0, STEP]),
                    wy=ys[on].astype(np.int16), wx=xs[on].astype(np.int16), wca=ca[on].astype(np.float32), wce=ce_[on].astype(np.float32),
                    ky=ys[fore].astype(np.int16), kx=xs[fore].astype(np.int16),
                    scy=ys[scalp].astype(np.int16), scx=xs[scalp].astype(np.int16),
                    fy=ys[reg].astype(np.int16), fx=xs[reg].astype(np.int16), fw=np.clip((Q[reg, 2] - 22) / 10, 0, 1).astype(np.float32),
                    params=np.array([LIFT, RECEDE, SEED], np.float64))
print('hairline: map', nE, 'x', nA, 'rays,', int(np.isfinite(PU).sum()), 'on the head;', int(on.sum()), 'texels on it')
