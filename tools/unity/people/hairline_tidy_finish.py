"""The second half of hairline_tidy.py (outside Blender): the head's texture laid on the map round the head, the target
hairline drawn there from real hairline anatomy, hair and skin laid to it, and the result written back (owner, 2026-11-03:
"the hairline is just two perpendicular lines and it sits too high; look at real humans").
- The target: a curve through landmarks found on this head's own surface (the glabella at the brows' height; the trichion
  where the straight distance from it is 56 + LIFT mm; a nearly level front; a corner cut at about 45 degrees into the
  temple recession, which RECEDE moves up and back into a man's M; the temporal line down to the temporal point, the
  temple hair's forward tip about 2 cm behind the brow's tail; the sideburn dropping in front of the ear), joined by a
  centripetal Catmull-Rom curve on the map; every point's signed distance to it on the head (mm, hair positive).
- Within ~1.5 cm of the line (and as far in as the line asks for hair the photograph lacks): hair laid in ~1 cm patches cut
  from this head's own dense hair, in the local hair's tone; skin laid over stubble from the clean skin's tone round about
  with the forehead's grain; the normal map keeping its own broad shape there and taking only the grain; the edge
  following the coils (crisp at the hair's scale); light flecks on the skin by the line taken out.
- Written back to the texels on the map (colour and normal map alike), only where something changed.
- Then the scalp all round: light specks taken out, the hair's lighter zones gently darkened; and above the brows, where the
  colour is skin and nothing was laid, the normal map's hair relief flattened.
Method and sources: docs/PEOPLE_RESEARCH.md section 7, "The owner's fifth round".
Usage: python3 hairline_tidy_finish.py <map dir> <head colour jpg (in/out)>
Env: HT_DEBUG (a path: the map before and after, with the curve, and the normal map's); HT_LIFT, HT_RECEDE (override the
map's own, to try another line on a kept map)."""
import os, sys
import numpy as np
from PIL import Image, ImageFilter

mdir, col_jpg = sys.argv[1:3]
M = np.load(os.path.join(mdir, 'hairline_map.npz'))
H, W = (int(v) for v in M['size'])
PU, PV, PXYZ = M['PU'], M['PV'], M['PXYZ']
AZ0, EL0, STEP = (float(v) for v in M['map0'])
LIFT, RECEDE, SEED = (float(v) for v in M['params'])
LIFT, RECEDE = float(os.environ.get('HT_LIFT', LIFT)), float(os.environ.get('HT_RECEDE', RECEDE))   # (to try another line on a kept map)
valid = np.isfinite(PU)
X, Y, Z = (np.nan_to_num(PXYZ[..., k]) for k in range(3))
nE, nA = PU.shape
AZ = AZ0 + STEP * np.arange(nA)[None, :] + 0 * Z


def box(img, r):
    for ax in (0, 1):
        c = np.cumsum(np.pad(img, [(r + 1, r) if a == ax else (0, 0) for a in (0, 1)], mode='edge'), axis=ax)
        img = (np.take(c, range(2 * r + 1, c.shape[ax]), axis=ax) - np.take(c, range(0, c.shape[ax] - 2 * r - 1), axis=ax)) / (2 * r + 1)
    return img


def nblur(img, r, mask=None):
    """A blur (three boxes: near a Gaussian) that ignores what lies off the head."""
    m = valid.astype(np.float64) if mask is None else mask.astype(np.float64)
    a, b = np.nan_to_num(img) * m, m
    for _ in range(3): a, b = box(a, r), box(b, r)
    return a / np.maximum(b, 1e-6)


def bil(img, fy, fx):
    fy = np.clip(np.nan_to_num(fy), 0, img.shape[0] - 1.001); fx = np.clip(np.nan_to_num(fx), 0, img.shape[1] - 1.001)
    y0, x0 = fy.astype(int), fx.astype(int); ty, tx = fy - y0, fx - x0
    if img.ndim == 3: ty, tx = ty[..., None], tx[..., None]
    return img[y0, x0] * (1 - ty) * (1 - tx) + img[y0, x0 + 1] * (1 - ty) * tx + img[y0 + 1, x0] * ty * (1 - tx) + img[y0 + 1, x0 + 1] * ty * tx


smooth = lambda e0, e1, v: (lambda t: t * t * (3 - 2 * t))(np.clip((v - e0) / (e1 - e0), 0, 1))
col = np.asarray(Image.open(col_jpg).convert('RGB'), np.float32)
nrm_path = col_jpg.replace('_color.jpg', '_normal.jpg')
nrm = np.asarray(Image.open(nrm_path).convert('RGB'), np.float32) if os.path.exists(nrm_path) else None
gy = lambda a, h_: np.clip((np.asarray(a, np.float64) * h_ / H).astype(int), 0, h_ - 1)     # (texel rows to another size)
gx = lambda a, w_: np.clip((np.asarray(a, np.float64) * w_ / W).astype(int), 0, w_ - 1)     # (and columns)
vs = float(np.median(col[gy(M['ky'], col.shape[0]), gx(M['kx'], col.shape[1])].max(-1)))      # the forehead's skin

# --- the photograph on the map ------------------------------------------------------------------------------------------
Cc = np.where(valid[..., None], bil(col, PV, PU), 0.0)
V = Cc.max(-1)
dark = np.clip((0.62 * vs - V) / (0.25 * vs), 0, 1) * valid
Dn = nblur(dark, 1)
px_mm = 0.44                                                   # (a map pixel is about 0.44 mm up the forehead)
need = int(round(4.0 / px_mm))
# its line at the midline: the lowest height from which the hair stays dense for 4 mm
i0 = int(round((0 - AZ0) / STEP)); cD = Dn[:, i0 - 2:i0 + 3].mean(1); cZ = Z[:, i0 - 2:i0 + 3].mean(1)
H0 = None
for j in range(nE - need):
    if cZ[j] > 20 and np.all(cD[j:j + need] > 0.5): H0 = float(cZ[j]); break
if H0 is None: raise SystemExit('no hairline at the midline')
# its temporal line: on each side, row by row (a row is one height at the side), the depth y where the hair begins
pts = []
for side in (1, -1):
    for j in range(nE):
        if not (valid[j].any()): continue
        cols = np.arange(nA) if side > 0 else np.arange(nA)[::-1]
        cols = [i for i in cols if side * AZ[j, i] > np.radians(25) and side * AZ[j, i] < np.radians(100) and valid[j, i]]
        if len(cols) < need + 2: continue
        zr = float(np.median(Z[j, cols]))
        if zr < 0 or zr > H0 - 15: continue
        for k in range(len(cols) - need):
            if np.all(Dn[j, cols[k:k + need]] > 0.5):
                pts.append((zr, float(Y[j, cols[k]]), side)); break
pts = np.array(pts) if pts else np.zeros((0, 3))
a_t, b_t = 15.0, 0.0
if len(pts) > 10:
    zz, yy = pts[:, 0], pts[:, 1]; keep = np.ones(len(zz), bool)
    for _ in range(3):
        b_t, a_t = np.polyfit(zz[keep], yy[keep], 1)
        keep = np.abs(yy - (a_t + b_t * zz)) < 5.0
    b_t = float(np.clip(b_t, -0.6, 0.6))
print('photographed line: midline', round(H0, 1), 'mm above the eyes; temporal line y =', round(a_t, 1), '+', round(b_t, 2), 'z (', len(pts), 'rows )')

# --- the target line, from the anatomy of real hairlines ----------------------------------------------------------------
# Landmarks on this head (eyes' frame, mm), after hairline-design anatomy (Garg et al., J Cutan Aesthet Surg; the 5A5P
# method; Kenyan and African American facial norms: trichion to glabella 61 +/- 3 mm in adult men):
# - the glabella G: the brow ridge on the midline, between the brows;
# - the midfrontal point (trichion) B: up the midline from G until the straight distance from G is the forehead's height,
#   TRG = 56 + LIFT mm (a young man's line, below the population's mean, which counts receded men);
# - the front: dead level across the forehead, out to where it turns into the temple (0.73 of the eyes' span out);
# - the temple corner: there the line turns back and down (on the side of the head, never a kink on the forehead) into the
#   frontotemporal recession, whose deepest point N is about 16 mm behind the forehead's edge and 14 mm below the front
#   (RECEDE moves it up and back: the M of a receding man);
# - the temporal line: from N down and slightly forward to the temporal point D, the forward tip of the temple's hair,
#   about 28 mm above the eyes and 20 mm behind the brow's tail;
# - under D the line runs back and down to the sideburn, whose front edge falls almost straight down in front of the
#   ear, into the beard.
# The landmarks are found on the head's own surface (front points by x and height, temple points by depth and height),
# joined by a smooth curve on the map, and every point's signed distance to that curve (mm, hair positive) is the target.
from scipy.spatial import cKDTree
from matplotlib.path import Path as MPath
i0 = int(round((0 - AZ0) / STEP))
mcol = valid[:, i0]
# (the glabella taken at the brows' own height, 17 mm above the eyes' centres on these heads: the most forward point
# of the midline is no guide on a sloping forehead, whose bulge can stand further forward than the brow ridge)
jg = int(np.argmin(np.where(mcol, np.abs(Z[:, i0] - 17.0), 1e9))); G = PXYZ[jg, i0].astype(np.float64)
TRG = 56.0 + LIFT
jb = None
for j in range(jg, nE):
    if mcol[j] and np.linalg.norm(PXYZ[j, i0] - G) >= TRG: jb = j; break
zB = float(Z[jb, i0]) if jb is not None else H0
ipd = 2 * 31.5
frontish = valid & (np.abs(AZ) < np.radians(75))
AZc = AZ0 + STEP * np.arange(nA)


def pick(z, x=None, y=None, side=1):
    """The map position (row, column) of the head's surface point at height z and, on the front, x across (x given) or,
    on the side, y back (y given)."""
    if x is not None:
        m = frontish & (side * X >= 0)
        cost = (X - side * x) ** 2 + (Z - z) ** 2
    else:
        m = valid & (side * AZ > np.radians(35)) & (side * AZ < np.radians(104))
        cost = (Y - y) ** 2 + (Z - z) ** 2
    k = np.argmin(np.where(m, cost, 1e18)); return np.unravel_index(k, cost.shape)


R_ = RECEDE
# (the front dead level, many points along it so the curve cannot wander, out to where the forehead turns into the temple;
# the turn down and back is on the side of the head, never a kink on the face of the forehead)
right = [('x', k * ipd, zB + (0.3 * R_ if k > 0.6 else 0.0)) for k in (0.12, 0.25, 0.38, 0.5, 0.62, 0.73)] + [   # the front
         ('y', 12.0 + 0.8 * R_, zB - 6.0 + 1.2 * R_),                                                       # the corner, turned
         ('y', 21.0 + 1.5 * R_, zB - 14.0 + 1.6 * R_),                                                      # the recession's deepest
         ('y', 16.0 + 0.8 * R_, 0.5 * (zB - 14.0 + 1.6 * R_ + 27.0)),                                       # the temporal line
         ('y', 9.0, 27.0), ('y', 12.0, 23.0),                                                               # the temporal point
         ('y', 20.0, 15.0), ('y', 27.0, 6.0), ('y', 31.0, -6.0), ('y', 33.0, -20.0), ('y', 34.0, -34.0)]      # the sideburn
ctrl = []
for side in (-1, 1):
    seq = right if side > 0 else right[::-1]
    for kind, v, z in seq:
        r_, c_ = pick(z, x=v, side=side) if kind == 'x' else pick(z, y=v, side=side)
        ctrl.append((float(r_), float(c_)))
    if side < 0: ctrl.append((float(jb if jb is not None else 0), float(i0)))
ctrl = np.array(ctrl)
P3 = lambda rc: np.stack([bil(PXYZ[..., k], rc[:, 0], rc[:, 1]) for k in range(3)], -1)


def catmull(pts, n=40):
    """A centripetal Catmull-Rom curve through the points (no loops, no overshoot at the corners), parameterised by the
    points' own distances on the head."""
    q = np.vstack([2 * pts[0] - pts[1], pts, 2 * pts[-1] - pts[-2]])
    q3 = np.vstack([2 * P3(pts[:1]) - P3(pts[1:2]), P3(pts), 2 * P3(pts[-1:]) - P3(pts[-2:-1])])
    out = []
    for i in range(1, len(q) - 2):
        p0, p1, p2, p3 = q[i - 1:i + 3]
        t0 = 0.0; t1 = t0 + np.linalg.norm(q3[i] - q3[i - 1]) ** 0.5 + 1e-6
        t2 = t1 + np.linalg.norm(q3[i + 1] - q3[i]) ** 0.5 + 1e-6; t3 = t2 + np.linalg.norm(q3[i + 2] - q3[i + 1]) ** 0.5 + 1e-6
        t = np.linspace(t1, t2, n, endpoint=False)[:, None]
        A1 = (t1 - t) / (t1 - t0) * p0 + (t - t0) / (t1 - t0) * p1
        A2 = (t2 - t) / (t2 - t1) * p1 + (t - t1) / (t2 - t1) * p2
        A3 = (t3 - t) / (t3 - t2) * p2 + (t - t2) / (t3 - t2) * p3
        B1 = (t2 - t) / (t2 - t0) * A1 + (t - t0) / (t2 - t0) * A2
        B2 = (t3 - t) / (t3 - t1) * A2 + (t - t1) / (t3 - t1) * A3
        out.append((t2 - t) / (t2 - t1) * B1 + (t - t1) / (t2 - t1) * B2)
    out.append(pts[-1:]); return np.vstack(out)


curve = catmull(ctrl, 60)
cur3 = P3(curve)
tree = cKDTree(cur3)
vi = np.where(valid)
dist = np.full((nE, nA), 60.0)
dist[vi] = tree.query(PXYZ[vi].astype(np.float64), distance_upper_bound=60.0)[0]
dist = np.minimum(dist, 60.0)
# hair is the side of the curve the crown is on: the curve closed round the top of the map
poly = np.vstack([curve[:, ::-1], [[nA + 50, curve[-1, 0]], [nA + 50, nE + 50], [-50, nE + 50], [-50, curve[0, 0]]]])
jj_, ii_ = np.mgrid[0:nE, 0:nA]
inside = MPath(poly).contains_points(np.stack([ii_.ravel(), jj_.ravel()], -1).astype(np.float64)).reshape(nE, nA)
d = np.where(inside, dist, -dist)
rng = np.random.default_rng(int(SEED))
n1 = box(box(rng.normal(0, 1, (nE, nA)), 8), 8); n2 = box(rng.normal(0, 1, (nE, nA)), 3)
d = d + n1 / max(np.abs(n1).max(), 1e-6) * 0.2 + n2 / max(np.abs(n2).max(), 1e-6) * 0.2      # (straight: only the coils roughen it)
T = smooth(-1.2, 1.2, d)
print('target line: glabella', np.round(G, 1).tolist(), 'trichion', round(zB, 1), 'mm above the eyes (', round(TRG, 1), 'mm from the glabella),',
      'temporal point', np.round(P3(ctrl[[len(right) + 1 + 9]])[0], 1).tolist())
az_ok = smooth(np.radians(101), np.radians(84), np.abs(AZ))
band = valid * smooth(-15, -12, -np.abs(d)) * smooth(-22, -14, Z) * az_ok
# (on the skin side, above the brows, as far as a raised line left hair behind: never the brows themselves)
band = np.maximum(band, valid * smooth(-40, -34, d) * (d < 0) * smooth(30, 36, Z) * az_ok)
# (on the hair side, as far in as a lowered or forward line asks for hair the photograph lacks: never the ear)
band = np.maximum(band, valid * (d > 0) * smooth(-42, -22, -d) * smooth(-22, -14, Z) * az_ok * np.where(Z < 18, smooth(54, 46, Y), 1.0))
Hh = zB

# --- hair and skin where the target wants them: this head's own hair and skin, quilted ----------------------------------
# (Moving the photograph along the line's normal stretched it into fans wherever the line bends: at the corners and the
# temporal point. Instead, where the target wants hair the photograph lacks, the hair is laid in patches cut from this
# head's own dense hair, and where it wants skin over stubble, the skin's own tone round about with its grain in patches
# cut from the clean forehead; the patches are about a centimetre, overlap by a few millimetres, and are blended so the
# grain keeps its contrast (a variance-preserving blend), all measured in millimetres on the head, never in map pixels.)
P_ = np.nan_to_num(PXYZ.astype(np.float64))


def steps(axis):
    s_ = np.linalg.norm(np.diff(P_, axis=axis), axis=-1)
    ok = (valid[1:, :] & valid[:-1, :]) if axis == 0 else (valid[:, 1:] & valid[:, :-1])
    med = float(np.median(s_[ok])); s_ = np.where(ok & (s_ < 4 * med), s_, np.nan)
    fill = np.nanmedian(np.where(np.isfinite(s_), s_, np.nan), axis=1 - axis, keepdims=True)
    s_ = np.where(np.isfinite(s_), s_, np.where(np.isfinite(fill), fill, med))
    return s_


su_, sv_ = steps(1), steps(0)                                    # (mm per map column and per map row)
U = np.zeros((nE, nA)); U[:, 1:] = np.cumsum(su_, axis=1); U -= U[:, i0:i0 + 1]
V = np.zeros((nE, nA)); V[1:, :] = np.cumsum(sv_, axis=0)
SU = np.zeros((nE, nA)); SU[:, :-1] = su_; SU[:, -1] = su_[:, -1]
SV = np.zeros((nE, nA)); SV[:-1, :] = sv_; SV[-1, :] = sv_[-1, :]
Lc, fe = 10.0, 2.5                                               # (a patch's core and its feather, mm)


def box2(img, ry, rx):
    for ax, r in ((0, ry), (1, rx)):
        c = np.cumsum(np.pad(img, [(r + 1, r) if a_ == ax else (0, 0) for a_ in (0, 1)], mode='edge'), axis=ax)
        img = (np.take(c, range(2 * r + 1, c.shape[ax]), axis=ax) - np.take(c, range(0, c.shape[ax] - 2 * r - 1), axis=ax)) / (2 * r + 1)
    return img


def sources(sel):
    """Map pixels round which a whole patch lies in `sel` (with a margin), as candidate patch centres: only where the
    map is near true to the head (a map column and row about as long as each other, and well below the crown, where the
    columns crowd together), so a patch cut there is the shape it will be laid."""
    R = Lc / 2 + fe + 1.5
    sel = sel & (SU / SV > 0.6) & (SU / SV < 1.6) & (np.abs(EL0 + STEP * np.arange(nE))[:, None] < np.radians(62))
    if not sel.any(): return np.zeros(0, int), np.zeros(0, int)
    ry = int(np.ceil(R / float(np.percentile(SV[sel], 5)))); rx = int(np.ceil(R / float(np.percentile(SU[sel], 5))))
    full = box2(sel.astype(np.float64), ry, rx) > 0.999
    ys, xs = np.where(full & sel)
    return ys, xs


def quilt_plan(sel, seed):
    ys, xs = sources(sel)
    if len(ys) < 20: return None
    r = np.random.default_rng(seed)
    table = r.integers(0, len(ys), (128, 128))
    cu0, cv0 = np.floor(U / Lc).astype(int), np.floor(V / Lc).astype(int)
    tu, tv = U / Lc - cu0, V / Lc - cv0
    plan = []
    for nu in (0, 1):
        for nv in (0, 1):
            cu = cu0 + (0 if nu == 0 else np.where(tu < 0.5, -1, 1)); cv = cv0 + (0 if nv == 0 else np.where(tv < 0.5, -1, 1))
            dU = U - (cu + 0.5) * Lc; dV = V - (cv + 0.5) * Lc
            w = np.clip((Lc / 2 + fe - np.abs(dU)) / (2 * fe), 0, 1) * np.clip((Lc / 2 + fe - np.abs(dV)) / (2 * fe), 0, 1)
            k = table[cu % 128, cv % 128]; rs, cs = ys[k], xs[k]
            plan.append((rs + dV / SV[rs, cs], cs + dU / SU[rs, cs], w))
    tot = sum(p_[2] for p_ in plan); tot = np.where(tot < 1e-6, 1.0, tot)
    plan = [(a_, b_, w_ / tot) for a_, b_, w_ in plan]
    norm = np.sqrt(sum(p_[2] ** 2 for p_ in plan))
    return plan, np.where(norm < 1e-6, 1.0, norm), (ys, xs)


def quilt(img, qp):
    plan, norm, (ys, xs) = qp
    mu = img[ys, xs].reshape(-1, img.shape[-1]).mean(0)
    acc = sum(w_[..., None] * (bil(img, ry_, rx_) - mu) for ry_, rx_, w_ in plan)
    return mu + acc / norm[..., None]


dense = valid & (Dn > 0.7) & ((Z > 30) | (Y > 30))
clean = valid & (Dn < 0.03) & (Z > 22) & (Z < H0 - 6) & (np.abs(AZ) < np.radians(45))
qh = quilt_plan(dense, int(SEED) * 7 + 1)
qs = quilt_plan(clean, int(SEED) * 7 + 2)
skinm = valid & (Dn < 0.05)
print('quilting: hair patches from', 0 if qh is None else len(qh[2][0]), 'places; skin grain from', 0 if qs is None else len(qs[2][0]))
hairm = valid & (Dn > 0.8)
# (near the line the hair is all laid: the photograph's own edge zone, finer and lighter hair, would otherwise stay as a
# stripe above a lowered line; the band's feather hands over to the photograph's hair further in)
hair_ok = np.zeros((nE, nA, 1)) if qh is not None else np.ones((nE, nA, 1))
skin_ok = (1 - smooth(0.04, 0.12, Dn))[..., None] if qs is not None else np.ones((nE, nA, 1))


def lf_skin(img):
    """The clean skin's own tone round about (its grain left out), reaching across stubble from the skin beside it."""
    a1 = nblur(img[..., 0] * 0 + 1, 10, mask=skinm)
    out_ = []
    for c in range(img.shape[-1]):
        l1 = nblur(img[..., c], 10, mask=skinm); l2 = nblur(img[..., c], 36, mask=skinm)
        k_ = smooth(0.05, 0.3, nblur(skinm.astype(np.float64), 10))
        out_.append(l1 * k_ + l2 * (1 - k_))
    return np.stack(out_, -1)


def lf_hair(img):
    """The photographed hair's own tone round about (its sheen and sparseness), for the laid hair to take."""
    return np.stack([nblur(img[..., c], 40, mask=hairm) for c in range(img.shape[-1])], -1)


def compose(img, normal=False):
    # (a normal map keeps its own broad shape where it is, the head's form at that spot: only the grain is laid. Taking
    # the forehead's broad tilt to the temple lit the laid skin as a pale bump)
    lf_n = np.stack([nblur(img[..., c], 10) for c in range(img.shape[-1])], -1) if normal else None
    # (under laid skin the bake's own curvature is kept, its hair relief blurred out: these heads are coarse above the
    # brow, about 15 mm a facet, and the normal map is what rounds them)
    lf_n4 = np.stack([nblur(img[..., c], 4) for c in range(img.shape[-1])], -1) if normal else None
    if qh is not None:
        mu = img[qh[2]].reshape(-1, img.shape[-1]).mean(0)
        Hc = img * hair_ok + ((lf_n if normal else lf_hair(img)) + quilt(img, qh) - mu) * (1 - hair_ok)
    else: Hc = img
    if qs is not None:
        hp = img - np.stack([nblur(img[..., c], 4, mask=skinm) for c in range(img.shape[-1])], -1)
        # (laid skin takes the tilt of the skin beside it, never the hair's, and its grain at full strength: a smooth
        # patch on a temple catches the light as a pale sheen)
        Sc = img * skin_ok + ((lf_n4 if normal else lf_skin(img)) + quilt(hp, qs)) * (1 - skin_ok)
    else: Sc = img
    return img * (1 - Bw) + (Tt * Hc + (1 - Tt) * Sc) * Bw


# the edge follows the coils: a dark coil at the line stands a little proud of it, a light gap sits back (a lined-up
# hairline is crisp, but crisp at the scale of the hair, never a ruled line)
if qh is not None:
    mu_c = Cc[qh[2]].reshape(-1, 3).mean(0)
    lum = (Cc * hair_ok + (lf_hair(Cc) + quilt(Cc, qh) - mu_c) * (1 - hair_ok)).mean(-1)
    hf = lum - nblur(lum, 2); sd = float(np.std(hf[valid & (np.abs(d) < 6)])) + 1e-6
    T = smooth(-1.2, 1.2, d - 0.5 * np.clip(hf / sd, -2.5, 2.5))
Tt, Bw = T[..., None], band[..., None]
out_c = compose(Cc)
# (light specks on the skin by the line, the photograph's own flecks: taken out as on the scalp)
medc = np.asarray(Image.fromarray(np.clip(out_c, 0, 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(9)), np.float64)
Vo, Vmd = out_c.max(-1), medc.max(-1)
spk = (Vo > 1.08 * Vmd) & (Vo > Vmd + 7) & ((1 - T) * band > 0.25)
out_c[spk] = medc[spk]
if os.environ.get('HT_DEBUG'):                                  # (the map before and after, the curve and its landmarks drawn)
    from PIL import ImageDraw
    dbg = Image.fromarray(np.vstack([np.clip(Cc, 0, 255).astype(np.uint8)[::-1], np.clip(out_c, 0, 255).astype(np.uint8)[::-1]]))
    dr = ImageDraw.Draw(dbg)
    for off in (0, nE):
        dr.line([(float(c), float(off + nE - 1 - r)) for r, c in curve], fill=(0, 255, 120), width=1)
        for r, c in ctrl: dr.ellipse([c - 3, off + nE - 1 - r - 3, c + 3, off + nE - 1 - r + 3], outline=(255, 220, 0))
    dbg.save(os.environ['HT_DEBUG'])
chg = np.clip(np.abs(out_c - Cc).max(-1) / 6.0, 0, 1) * band
chg = nblur(chg, 2)
wca, wce = M['wca'].astype(np.float64), M['wce'].astype(np.float64)
wy, wx = M['wy'].astype(np.int64), M['wx'].astype(np.int64)
ww = bil(chg, wce, wca)[:, None]
col = col.copy()
col[wy, wx] = col[wy, wx] * (1 - ww) + bil(out_c, wce, wca) * ww
print('hairline drawn: front at', round(Hh, 1), 'mm, recession', RECEDE, 'mm;', int((ww[:, 0] > 0.5).sum()), 'texels changed')
if nrm is not None:
    hN, wN = nrm.shape[:2]
    Nc = np.where(valid[..., None], bil(nrm, PV * hN / H, PU * wN / W), 0.0)
    out_n = compose(Nc, normal=True)
    if os.environ.get('HT_DEBUG'):
        Image.fromarray(np.vstack([np.clip(Nc, 0, 255).astype(np.uint8)[::-1], np.clip(out_n, 0, 255).astype(np.uint8)[::-1]])).save(os.environ['HT_DEBUG'].replace('.jpg', '_n.jpg'))
    nrm = nrm.copy()
    ny_, nx_ = gy(wy, hN), gx(wx, wN)
    nrm[ny_, nx_] = nrm[ny_, nx_] * (1 - ww) + bil(out_n, wce, wca) * ww

# --- the scalp all round, and the skin above the brows ----------------------------------------------------------------------
h, wd = col.shape[:2]
scal = np.zeros((h, wd), np.float32); scal[gy(M['scy'], h), gx(M['scx'], wd)] = 1.0
scal = np.asarray(Image.fromarray((scal * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(4)), np.float32) / 255.0
med = np.asarray(Image.fromarray(np.clip(col, 0, 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(9)), np.float32)
Vt, Vm = col.max(-1), med.max(-1)
sp = (Vt > 1.25 * Vm) & (Vt > Vm + 12) & (Vm < 0.7 * vs) & (scal > 0.5)
col[sp] = med[sp]
hm = np.clip((0.7 * vs - Vm) / (0.2 * vs), 0, 1) * scal
Vt = col.max(-1)
Vb = np.asarray(Image.fromarray(np.clip(Vt, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(12)), np.float32)
target = float(np.percentile(Vt[hm > 0.8], 50)) if (hm > 0.8).any() else 40.0
gain = np.clip(target / np.maximum(Vb, 1.0), 0.82, 1.0)
col = col * (1 - hm + hm * gain)[..., None]
print('scalp: light specks taken out', int(sp.sum()), '; tone evened gently towards', round(target, 1))
if nrm is not None:
    hN, wN = nrm.shape[:2]
    fy, fx = gy(M['fy'], h), gx(M['fx'], wd)
    V2 = col[fy, fx].max(-1)
    dens = np.clip((0.62 * vs - V2) / (0.25 * vs), 0, 1)
    # (not where the line was just drawn: the laid skin there carries its own grain, and flattening it leaves a smooth,
    # shiny patch)
    chgimg = np.zeros((h, wd), np.float32); chgimg[gy(wy, h), gx(wx, wd)] = ww[:, 0]
    f = (0.8 * (1 - dens) * M['fw'] * (1 - chgimg[fy, fx]))[:, None]
    ny_, nx_ = gy(M['fy'], hN), gx(M['fx'], wN)
    nrm[ny_, nx_] = nrm[ny_, nx_] * (1 - f) + np.array([128.0, 128.0, 255.0]) * f
    if os.path.islink(nrm_path): os.remove(nrm_path)
    Image.fromarray(np.clip(nrm, 0, 255).astype(np.uint8)).save(nrm_path, quality=93)
if os.path.islink(col_jpg): os.remove(col_jpg)
Image.fromarray(np.clip(col, 0, 255).astype(np.uint8)).save(col_jpg, quality=93)
