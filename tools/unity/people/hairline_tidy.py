"""A man's hairline tidied and set at his own height, on his head's own photographed scalp (owner, 2026-11-02: "Black men's
hairlines still are messy"; "hairline adjustments for realism: height, tidying, removing face/hair seams").
Rocketbox's buzzed heads carry a real photographed hairline, but at close range it is a fuzzy band: stray dots of stubble
run several millimetres down the forehead, and moving the line by carrying another head's scalp across (scalp_photo.py)
made the band wider. Here the head's own texture is reworked in place, in its eyes' frame, around the skull's centre:
- the line is found from the texture (where the hair's density, blurred over a few millimetres, reaches one half), in
  2-degree slices round the front of the head, smoothed;
- the new line is the old one moved by HT_LIFT mm (positive: higher), plus HT_RECEDE mm more towards the temples (a man's
  receding corners); the rework fades out before the temples, where the line turns down to the sideburns;
- each texel near the line takes its colour from the same head along the same slice: the forehead's skin and the scalp's
  hair are stretched a little (piecewise linear between 18 mm below the line and 20 mm above it, so nothing jumps), and
  near the new line the hair comes from 6 mm further up (dense, no stray dots) and the skin from 8 mm further down
  (clean), by maps that keep their order (no strip repeated), joined by an edge about 2.5 mm wide that wanders by under a millimetre (a line, not a ruler); each source
  is an exact point of the surface (a ray from the skull's centre), sampled bilinearly.
Writes <out>/hairline_map.npz (target texels and their sources) for hairline_tidy_finish.py, which composites the colour
and normal textures.
Usage: blender -b --python hairline_tidy.py -- <head fbx> <its head colour jpg> <out dir>
Env: HT_LIFT (mm, 0), HT_RECEDE (mm at the temples, 0), HT_SEED (the edge's wander, 1)."""
import bpy, sys, os, math
import numpy as np
from mathutils import Vector

head_path, col_path, out_dir = sys.argv[sys.argv.index('--') + 1:][:3]
LIFT = float(os.environ.get('HT_LIFT', 0.0)); RECEDE = float(os.environ.get('HT_RECEDE', 0.0)); SEED = int(os.environ.get('HT_SEED', 1))
os.makedirs(out_dir, exist_ok=True)
C = np.array([0.0, 45.0, 10.0]); R = 95.0                    # the skull's centre in the eyes' frame (mm) and its radius
BIN = math.radians(2.0); AZ_MAX = math.radians(84.0)


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


def raster(P, TR, TUV, W, H, front=True):
    pts = np.full((H, W, 3), np.nan, np.float32)
    for tri, uv in zip(TR, TUV):
        q = P[list(tri)]
        m = q.mean(0) - C
        if front and (q[:, 2].max() < 5 or m[1] > 40 or np.linalg.norm(q.mean(0)) > 190): continue   # the front half above the eyes
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


def box(img, r):
    """A box blur of radius r (pixels) by cumulative sums, along both axes."""
    for ax in (0, 1):
        c = np.cumsum(np.pad(img, [(r + 1, r) if a == ax else (0, 0) for a in (0, 1)], mode='edge'), axis=ax)
        img = (np.take(c, range(2 * r + 1, c.shape[ax]), axis=ax) - np.take(c, range(0, c.shape[ax] - 2 * r - 1), axis=ax)) / (2 * r + 1)
    return img


P, TR, TUV = load(head_path)
img = bpy.data.images.load(col_path); W, H = img.size
px = np.empty(W * H * 4, np.float32); img.pixels.foreach_get(px); col = px.reshape(H, W, 4)[::-1, :, :3]   # rows from the top
ys, xs, Q = raster(P, TR, TUV, W, H)
D = Q - C; rr = np.linalg.norm(D, axis=1); D /= rr[:, None]
az = np.arctan2(D[:, 0], -D[:, 1]); el = np.arcsin(np.clip(D[:, 2], -1, 1))
# hair's density: the texel far darker than the forehead's skin (its value against the skin's), blurred over ~3 mm
V = col[..., :3].max(-1)
fore = (np.abs(az) < math.radians(20)) & (Q[:, 2] > 22) & (Q[:, 2] < 34)
v_skin = float(np.median(V[ys[fore], xs[fore]]))
dens = np.clip((0.62 * v_skin - V) / (0.25 * v_skin), 0, 1)
dens_b = box(box(dens, 6), 6)
db = dens_b[ys, xs]
# the line: per 2-degree slice, the lowest height from which the density stays above one half for 4 mm
el_h = np.full(int(2 * AZ_MAX / BIN) + 1, np.nan)
centres = -AZ_MAX + BIN * np.arange(len(el_h))
step = math.radians(0.5)
for i, a in enumerate(centres):
    s = np.abs(az - a) < BIN / 2
    s &= (Q[:, 2] > 20)
    if s.sum() < 50: continue
    e, dd = el[s], db[s]
    grid = np.arange(e.min(), e.max(), step)
    if len(grid) < 10: continue
    idx = np.clip(((e - e.min()) / step).astype(int), 0, len(grid) - 1)
    tot = np.bincount(idx, dd, len(grid)); cnt = np.bincount(idx, None, len(grid))
    prof = np.where(cnt > 0, tot / np.maximum(cnt, 1), np.nan)
    need = max(2, int(round((4.0 / R) / step)))                                   # 4 mm, in steps
    for k in range(len(grid) - need):
        win = prof[k:k + need]
        if np.all(np.nan_to_num(win) > 0.5): el_h[i] = grid[k]; break
ok = ~np.isnan(el_h)
if ok.sum() < 10: raise SystemExit('no hairline found')
el_h = np.interp(centres, centres[ok], el_h[ok])
el_h = np.convolve(np.pad(el_h, 3, mode='edge'), np.ones(7) / 7, mode='valid')
# a hairline is a smooth curve (a painted one can be ragged: a scalloped line read as false): across the front it is fitted
# by a low-order curve, the found line kept only beyond, where nothing is reworked
fr = np.abs(centres) < math.radians(66)
fit = np.polyval(np.polyfit(centres[fr], el_h[fr], 4), centres)
el_h = np.where(fr, fit, el_h)
# the new line: lifted, the temples receding more; the rework fades out before the temples (FRONT), where the line turns
# down to the sideburns and "above" and "below" it stop meaning hair and skin: there the head stays as photographed
FRONT = math.radians(60.0)
t = np.abs(centres)
# (receding corners peak at the temples' points, about 40 degrees round; the whole move tapers to nothing by FRONT, so the
# line comes down to the photographed temple smoothly, not in a notch)
recede = np.exp(-((t - math.radians(40)) / math.radians(14)) ** 2)
tp = np.clip((FRONT - t) / math.radians(16), 0, 1); tp = tp * tp * (3 - 2 * tp)
el_n = el_h + (LIFT + RECEDE * recede) * tp / R
rng = np.random.default_rng(SEED)
noise = np.convolve(rng.normal(0, 1, len(centres) + 6), np.ones(4) / 4, mode='valid')[:len(centres)]
noise = noise / max(np.abs(noise).max(), 1e-6) * 0.6                                  # mm
# each texel near the line: its slice's old and new line, its height's source (piecewise linear), its hair and skin sources
sel = (np.abs(az) < FRONT + math.radians(4)) & (Q[:, 2] > 15)
ft = np.clip((FRONT - np.abs(az)) / math.radians(16), 0, 1); ft = ft * ft * (3 - 2 * ft)
a_i = np.clip(np.interp(az, centres, np.arange(len(centres))), 0, len(centres) - 1)
eh = np.interp(a_i, np.arange(len(centres)), el_h); en = np.interp(a_i, np.arange(len(centres)), el_n)
nz = np.interp(a_i, np.arange(len(centres)), noise)
lo, hi = eh - 18.0 / R, eh + 20.0 / R
src = np.where(el <= en, lo + (el - lo) * (eh - lo) / np.maximum(en - lo, 1e-6), eh + (el - en) * (hi - eh) / np.maximum(hi - en, 1e-6))
src = np.where((el < lo) | (el > hi), el, src)
src = el + (src - el) * ft
d = (el - en) * R                                                                       # mm from the new line, + above
# hair from further up and skin from further down near the line, by maps that keep their order (a source that turns back
# on itself repeats a strip of texture: a row of dashes): x mm from the line takes hair from 6 + x/2 mm (up to 12 mm,
# where it meets itself) and skin from -8 + x/2 mm (down to -16 mm)
x = (src - eh) * R
gh = np.where(x < 12.0, 6.0 + x * 0.5, x); gs = np.where(x > -16.0, -8.0 + x * 0.5, x)
src_h = el + (eh + gh / R - el) * ft; src_s = el + (eh + gs / R - el) * ft
k = ft * (np.abs(d) < 18)
w = np.clip((d - nz + 1.2) / 2.4, 0, 1); w = w * w * (3 - 2 * w)
band = sel & (np.abs(d) < 25) & ((np.abs(src - el) * R > 0.02) | (k > 0.001))
# the sources as exact points of the surface: the ray from the skull's centre at (azimuth, source height) to the head,
# and the texture place there (barycentric in its triangle), sampled bilinearly by the finish: never snapped to the
# nearest texel, whose repeats read as streaks
from mathutils.bvhtree import BVHTree
bvh = BVHTree.FromPolygons([tuple(map(float, v)) for v in P], [tuple(map(int, f)) for f in TR])
def surface_uv(az_, el_):
    out = np.full((len(az_), 2), np.nan, np.float64)
    for n in range(len(az_)):
        dv = Vector((math.sin(az_[n]) * math.cos(el_[n]), -math.cos(az_[n]) * math.cos(el_[n]), math.sin(el_[n])))
        loc, nrm, fi, dist = bvh.ray_cast(Vector(tuple(C)), dv, 400.0)
        if fi is None: continue
        a_, b_, c_ = (P[j] for j in TR[fi])
        v0, v1, v2 = b_ - a_, c_ - a_, np.array(loc) - a_
        d00, d01, d11, d20, d21 = v0 @ v0, v0 @ v1, v1 @ v1, v2 @ v0, v2 @ v1
        den = d00 * d11 - d01 * d01
        if abs(den) < 1e-12: continue
        wv = (d11 * d20 - d01 * d21) / den; ww = (d00 * d21 - d01 * d20) / den
        uv = np.array([1 - wv - ww, wv, ww]) @ TUV[fi]
        out[n] = (uv[0] * W - 0.5, (1 - uv[1]) * H - 0.5)
    return out
bi = np.where(band)[0]
hp, sp = surface_uv(az[bi], src_h[bi]), surface_uv(az[bi], src_s[bi])
good = ~(np.isnan(hp[:, 0]) | np.isnan(sp[:, 0])); bi, hp, sp = bi[good], hp[good], sp[good]
# the skin above the brows and round the temples, for the normal map: Rocketbox paints the hair's bumps further down the
# temples than its colour shows hair, so skin-coloured texels there glint as grey speckle with a hard edge where the bumps
# stop; the finish flattens the relief wherever the (reworked) colour is skin
reg = (Q[:, 2] > 22) & (np.abs(az) < math.radians(100))
# the scalp all round (for the finish's despeckle and tone: never the brows, the beard or the face): above the brows, or
# behind the ears down to the nape
ys2, xs2, Q2 = raster(P, TR, TUV, W, H, front=False)
scalp = (Q2[:, 2] > 30) | ((Q2[:, 1] > 30) & (Q2[:, 2] > -30))
np.savez_compressed(os.path.join(out_dir, 'hairline_map.npz'), ys=ys[bi], xs=xs[bi], hy=hp[:, 1], hx=hp[:, 0], sy=sp[:, 1], sx=sp[:, 0],
                    w=w[bi].astype(np.float32), size=np.array([H, W]), fy=ys[reg], fx=xs[reg],
                    fw=np.clip((Q[reg, 2] - 22) / 10, 0, 1).astype(np.float32), ky=ys[fore], kx=xs[fore],
                    scy=ys2[scalp].astype(np.int16), scx=xs2[scalp].astype(np.int16))
lift_mm = (el_n - el_h) * R
print('hairline: line found in', int(ok.sum()), 'of', len(centres), 'slices; at the middle', round(float(np.interp(0, centres, el_h) * R), 1),
      'mm round the skull; moved', round(float(lift_mm.min()), 1), 'to', round(float(lift_mm.max()), 1), 'mm;', len(bi), 'texels reworked')
