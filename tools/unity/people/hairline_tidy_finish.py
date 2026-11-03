"""The second half of hairline_tidy.py (outside Blender): the head's texture laid on the map round the head, the target
hairline built there from the anatomy of a man's hairline, hair and skin moved to it, and the result written back.
- On the map: the photographed hair's density (each point's value against the forehead's skin); the photographed line's
  height at the midline (H0) and its temporal line (the depth y where the hair begins, height by height, on each side,
  fitted by a straight line and averaged over the two sides, so the head is symmetric).
- The target: the front z = H - 3 (x/45)^2 (+ an M-shaped recession of RECEDE mm peaking 40 mm out), H = H0 + LIFT; the
  temporal line y = a + b z (pushed 0.8 RECEDE back at the top); hair where either says so (above the front, behind the
  temporal line), joined by a smooth maximum (a rounded corner, 3 mm); its edge ~3 mm soft, wandering under a millimetre.
- Within 15 mm of the target line: where the target is hair and the photograph is not dense, hair is taken from the
  photographed hair further in, and where the target is skin and the photograph has hair or stubble, skin is taken from
  the clean skin further out, both along the line's own normal, by a smooth shift (the texture moved, not stretched).
- Written back to the texels on the map (colour and normal map alike), only where something changed.
- Then the scalp all round: light specks (the photograph's sheen on the coils: white flecks at close range) taken out, the
  hair's lighter zones gently darkened; and above the brows, where the colour is skin, the normal map's hair relief
  flattened.
Usage: python3 hairline_tidy_finish.py <map dir> <head colour jpg (in/out)>"""
import os, sys
import numpy as np
from PIL import Image, ImageFilter

mdir, col_jpg = sys.argv[1:3]
M = np.load(os.path.join(mdir, 'hairline_map.npz'))
H, W = (int(v) for v in M['size'])
PU, PV, PXYZ = M['PU'], M['PV'], M['PXYZ']
AZ0, EL0, STEP = (float(v) for v in M['map0'])
LIFT, RECEDE, SEED = (float(v) for v in M['params'])
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

# --- the target line ----------------------------------------------------------------------------------------------------
Hh = H0 + LIFT
ax_ = np.abs(X)
zt = Hh - 3.0 * (ax_ / 45.0) ** 2 + RECEDE * np.exp(-((ax_ - 40.0) / 9.0) ** 2)
yt = a_t + b_t * Z + 0.8 * RECEDE * smooth(Hh - 30, Hh - 5, Z)
s1, s2 = Z - zt, Y - yt
k = 3.0
d = k * np.logaddexp(s1 / k, s2 / k)                           # (hair where either holds; the corner rounded)
rng = np.random.default_rng(int(SEED))
n1 = box(box(rng.normal(0, 1, (nE, nA)), 8), 8); n2 = box(rng.normal(0, 1, (nE, nA)), 3)
d = d + n1 / max(np.abs(n1).max(), 1e-6) * 0.8 + n2 / max(np.abs(n2).max(), 1e-6) * 0.4
T = smooth(-1.6, 1.6, d)
band = valid * smooth(-15, -12, -np.abs(d)) * smooth(-22, -14, Z) * (np.abs(AZ) < np.radians(100))
# (on the skin side, above the brows, as far as a receded or raised line left hair behind: never the brows themselves)
band = np.maximum(band, valid * smooth(-40, -34, d) * (d < 0) * smooth(30, 36, Z) * (np.abs(AZ) < np.radians(100)))

# --- hair and skin moved to it ------------------------------------------------------------------------------------------
gyd, gxd = np.gradient(d)
gn = np.hypot(gyd, gxd); gn = np.where(gn < 1e-6, 1.0, gn)
dy_, dx_ = gyd / gn, gxd / gn                                   # (in map pixels, into the target's hair)
jj, ii = np.mgrid[0:nE, 0:nA].astype(np.float64)


def shift(sel, sign, test):
    """Per selected pixel, how far along the line's normal (sign: into the hair or out to the skin) the photograph first
    passes `test`, plus 2.5 mm; smoothed into a field so the texture moves, not stretches."""
    idx = np.where(sel)
    py, pxx = jj[idx], ii[idx]; sy, sx = dy_[idx] * sign, dx_[idx] * sign
    t = np.full(len(py), np.nan)
    for step in range(1, 160):
        qy, qx = py + sy * step, pxx + sx * step
        inb = (qy >= 0) & (qy <= nE - 1) & (qx >= 0) & (qx <= nA - 1)
        hit = np.isnan(t) & inb
        if not hit.any(): continue
        ok = np.zeros(len(py), bool)
        ok[hit] = test(Dn[np.round(qy[hit]).astype(int), np.round(qx[hit]).astype(int)])
        t[ok & np.isnan(t)] = step
    A = np.full((nE, nA), np.nan); A[idx] = t + 2.5 / px_mm
    m = np.isfinite(A)
    As = nblur(np.where(m, A, 0), 5, mask=m) if m.any() else A
    As[~np.isfinite(A) & ~sel] = np.nan
    return np.where(sel & np.isfinite(As), As, np.nan)


HF = (band > 0) & (T > 0.02) & (Dn < 0.85)
SF = (band > 0) & (T < 0.98) & (Dn > 0.07)
Ah = shift(HF, 1.0, lambda v: v > 0.88)
As_ = shift(SF, -1.0, lambda v: v < 0.05)
hy, hx = jj + dy_ * np.nan_to_num(Ah), ii + dx_ * np.nan_to_num(Ah)
sy_, sx_ = jj - dy_ * np.nan_to_num(As_), ii - dx_ * np.nan_to_num(As_)
hair_ok = np.where(np.isfinite(Ah), smooth(0.72, 0.9, Dn), 1.0)[..., None]
skin_ok = np.where(np.isfinite(As_), 1 - smooth(0.04, 0.12, Dn), 1.0)[..., None]
Tt, Bw = T[..., None], band[..., None]


def compose(img):
    Hc = img * hair_ok + bil(img, hy, hx) * (1 - hair_ok)
    Sc = img * skin_ok + bil(img, sy_, sx_) * (1 - skin_ok)
    return img * (1 - Bw) + (Tt * Hc + (1 - Tt) * Sc) * Bw


out_c = compose(Cc)
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
    out_n = compose(Nc)
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
    f = (0.8 * (1 - dens) * M['fw'])[:, None]
    ny_, nx_ = gy(M['fy'], hN), gx(M['fx'], wN)
    nrm[ny_, nx_] = nrm[ny_, nx_] * (1 - f) + np.array([128.0, 128.0, 255.0]) * f
    if os.path.islink(nrm_path): os.remove(nrm_path)
    Image.fromarray(np.clip(nrm, 0, 255).astype(np.uint8)).save(nrm_path, quality=93)
if os.path.islink(col_jpg): os.remove(col_jpg)
Image.fromarray(np.clip(col, 0, 255).astype(np.uint8)).save(col_jpg, quality=93)
