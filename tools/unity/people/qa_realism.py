"""The realism gate's measured half (docs/PEOPLE_QA.md): every made person's head texture read as the face is seen
(qa_map.py: the head straight on, 0.4 mm a pixel, each pixel a point on the head in the eyes' frame, mm) and measured for the faults the owner has had to point out by eye, each against the same measure on Rocketbox's
own heads as shipped (the house style and the realism bar: real photographed people), never against a number of our own.
Measures (all on clean skin unless said; L* is CIE lightness):
- tone_spread: the largest difference of median L* between the face's regions (forehead, temples, cheeks, nose, chin);
  side_diff: the largest left/right difference (temple to temple, cheek to cheek). Uneven skin, patches, a pale temple.
- blotch: the spread of L* between 4 and 25 mm (blotches a centimetre or two across, after the face's broad shading).
- seam: the longest run (mm) of a sharp step in tone (a 1-4 mm difference of Gaussians) on skin away from the face's own
  features (eyes, brows, lips, nostrils, hairline, ears): a graft's edge, a bake's border, a patch's square.
- detail: the skin's fine grain (L* above 1 mm): too little reads as plastic, too much as noise or dirt.
- specks: light specks on skin, per 10 cm^2 (flecks at a hairline or on a cheek).
- eye_ring: the L* step from a ring round each eye (9-15 mm) to the skin beyond it (15-22 mm): an eye zone pasted on.
- hairline (when the head has hair above the forehead): the trichion's straight distance from the glabella (mm), the
  front's straightness (largest departure of the hair's edge from a straight level line across the forehead, mm) and its
  left/right symmetry (mm).
- beard_edge_grad (when a beard is painted): how hard its boundary is (darkness per mm at the 99th percentile): a block's
  edge is a step; beard_high_frac: how much of the mid-cheek, under the cheekbone, is beard-dark (a patch where none grows).
Skin is told by its hue (32-85 degrees, chroma over 7): cloth, white, red patterns and lips never count as skin.
Usage: python3 qa_realism.py <qa_map dir> <head colour jpg> <out json> [<label>]"""
import json, os, sys
import numpy as np
from PIL import Image

mdir, col_jpg, out_json = sys.argv[1:4]
label = sys.argv[4] if len(sys.argv) > 4 else os.path.basename(col_jpg)
M = np.load(os.path.join(mdir, 'qa_map.npz'))
H, W = (int(v) for v in M['size'])
PU, PV, PXYZ = M['PU'], M['PV'], M['PXYZ']
GX0, GZ0, GSTEP = (float(v) for v in M['grid'])
valid = np.isfinite(PU)
X, Y, Z = (np.nan_to_num(PXYZ[..., k]).astype(np.float64) for k in range(3))
nE, nA = PU.shape


def box(img, r):
    for ax in (0, 1):
        c = np.cumsum(np.pad(img, [(r + 1, r) if a == ax else (0, 0) for a in (0, 1)], mode='edge'), axis=ax)
        img = (np.take(c, range(2 * r + 1, c.shape[ax]), axis=ax) - np.take(c, range(0, c.shape[ax] - 2 * r - 1), axis=ax)) / (2 * r + 1)
    return img


def blur(img, r, mask):
    """A blur (three boxes) over the mask only; r in map pixels (about 0.44 mm)."""
    if r < 1: return img
    m = mask.astype(np.float64); a, b = np.nan_to_num(img) * m, m
    for _ in range(3): a, b = box(a, r), box(b, r)
    return a / np.maximum(b, 1e-6)


def bil(img, fy, fx):
    fy = np.clip(np.nan_to_num(fy), 0, img.shape[0] - 1.001); fx = np.clip(np.nan_to_num(fx), 0, img.shape[1] - 1.001)
    y0, x0 = fy.astype(int), fx.astype(int); ty, tx = fy - y0, fx - x0
    if img.ndim == 3: ty, tx = ty[..., None], tx[..., None]
    return img[y0, x0] * (1 - ty) * (1 - tx) + img[y0, x0 + 1] * (1 - ty) * tx + img[y0 + 1, x0] * ty * (1 - tx) + img[y0 + 1, x0 + 1] * ty * tx


def lab(rgb):
    c = np.clip(rgb / 255.0, 0, 1); c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    xyz = c @ np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]]).T / np.array([0.9505, 1.0, 1.089])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


col = np.asarray(Image.open(col_jpg).convert('RGB'), np.float64)
hh, ww = col.shape[:2]
Cc = np.where(valid[..., None], bil(col, PV * hh / H, PU * ww / W), 0.0)
LAB = lab(Cc); L = LAB[..., 0]
r_mm = lambda mm: max(1, int(round(mm / GSTEP / 1.7)))     # (three boxes of radius r: a Gaussian of about 1.7 r pixels)
eyes = [np.array([31.5, 0, 0]), np.array([-31.5, 0, 0])]
de = np.minimum(*(np.linalg.norm(np.stack([X, Y, Z], -1) - e, axis=-1) for e in eyes))
front = valid & (Y < 30) & (np.abs(X) < 75) & (Z > -110) & (Z < 75)
# the face's own skin: lighter than the head's dark hair and brows, away from the eyes, lips, nostrils and ears
Lmed = float(np.median(L[front & (Z > 20) & (Z < 45) & (np.abs(X) < 20)])) if (front & (Z > 20) & (Z < 45) & (np.abs(X) < 20)).any() else float(np.median(L[front]))
Lloc = blur(L, r_mm(6), front)
hue = np.degrees(np.arctan2(LAB[..., 2], LAB[..., 1])); chroma = np.hypot(LAB[..., 1], LAB[..., 2])
skinlike = (hue > 32) & (hue < 85) & (chroma > 7)                         # (skin's own hues: never cloth, white or red)
skin = front & skinlike & (L > Lloc - 12) & (L > 0.55 * Lmed)
skin &= blur(valid.astype(np.float64), r_mm(4), np.ones_like(valid)) > 0.995  # (never the mesh's own border: a head that ends at its gear)
skin &= de > 16                                                             # eyes and lids
skin &= ~((np.abs(X) < 30) & (Z > -80) & (Z < -50))                         # lips
skin &= ~((np.abs(X) < 20) & (Z > -46) & (Z < -30) & (Y < -25))             # nostrils
skin &= ~((Z > 8) & (Z < 30) & (np.abs(X) > 8) & (np.abs(X) < 60) & (L < Lloc - 6))   # brows
skin &= np.abs(X) < 64                                                      # ears
skin = blur(skin.astype(np.float64), 2, valid) > 0.95                      # (a margin round every excluded part)

regions = {'forehead': (np.abs(X) < 25) & (Z > 28) & (Z < 50), 'temple_L': (X > 45) & (X < 62) & (Z > 8) & (Z < 35),
           'temple_R': (X < -45) & (X > -62) & (Z > 8) & (Z < 35), 'cheek_L': (X > 25) & (X < 50) & (Z > -40) & (Z < -12),
           'cheek_R': (X < -25) & (X > -50) & (Z > -40) & (Z < -12), 'nose': (np.abs(X) < 7) & (Z > -25) & (Z < 0),
           'chin': (np.abs(X) < 16) & (Z < -78) & (Z > -100)}
med = {}
for k, m in regions.items():
    s = m & skin
    med[k] = round(float(np.median(L[s])), 2) if s.sum() > 200 else None
have = [v for v in med.values() if v is not None]
res = {'label': label, 'region_L': med, 'skin_px': int(skin.sum())}
res['tone_spread'] = round(max(have) - min(have), 2) if len(have) > 2 else None
sd = [abs(med[a] - med[b]) for a, b in (('temple_L', 'temple_R'), ('cheek_L', 'cheek_R')) if med[a] is not None and med[b] is not None]
res['side_diff'] = round(max(sd), 2) if sd else None
# blotches: L* between 4 and 25 mm
b4, b25 = blur(L, r_mm(4), skin), blur(L, r_mm(25), skin)
core = skin & (blur(skin.astype(np.float64), r_mm(6), valid) > 0.98)
res['blotch'] = round(float(np.std((b4 - b25)[core])), 3) if core.sum() > 500 else None
# seams: a sharp step in tone, away from the face's own features, as the longest connected run
d1, d4 = blur(L, r_mm(1.2), skin), blur(L, r_mm(4), skin)
dog = np.abs(d1 - d4)
far = core.copy()
strong = far & (dog > 3.0)
lab_img = np.zeros(strong.shape, np.int32); runs = []
try:
    from scipy import ndimage
    lab_img, n = ndimage.label(strong)
    if n:
        sl = ndimage.find_objects(lab_img)
        for i, s in enumerate(sl):
            pts = np.stack([X[s][lab_img[s] == i + 1], Z[s][lab_img[s] == i + 1]], -1)
            if len(pts) < 8: continue
            ext = float(np.linalg.norm(pts.max(0) - pts.min(0)))
            runs.append(ext)
except ImportError:
    pass
res['seam'] = round(max(runs), 1) if runs else 0.0
res['seam_runs_over_12mm'] = int(sum(1 for r in runs if r > 12))
# detail: fine grain above about 1 mm
res['detail'] = round(float(np.std((L - blur(L, r_mm(1.0), skin))[core])), 3) if core.sum() > 500 else None
# specks: light points standing above the skin round them
loc = blur(L, 3, skin)
sp = core & (L > loc + 8) & (L > loc * 1.12)
area_cm2 = core.sum() * GSTEP * GSTEP / 100.0
res['specks_per_10cm2'] = round(float(sp.sum()) / max(area_cm2, 1e-6) * 10, 2) if area_cm2 > 1 else None
# the eyes' zones against the skin round them, as seen from the front (the eye's opening is a hole in the head here)
er = []
for e in eyes:
    dd = np.hypot(X - e[0], Z - e[2])
    ok = front & (L > 0.55 * Lmed) & ~((Z > 6) & (L < Lloc - 6))
    ring = ok & (dd > 13) & (dd < 19)
    out_ = ok & (dd > 20) & (dd < 27) & (Z > -30)
    if os.environ.get('QA_DEBUG'): print('eye ring px', int(ring.sum()), int(out_.sum()))
    if ring.sum() > 100 and out_.sum() > 100: er.append(abs(float(np.median(L[ring])) - float(np.median(L[out_]))))
res['eye_ring'] = round(max(er), 2) if er else None
# the hairline: hair above the forehead, where the skin ends going up the midline and across
dark = (L < 0.62 * Lmed) & valid
i0 = int(round(-GX0 / GSTEP))
col_ = dark[:, i0 - 2:i0 + 3].mean(1) > 0.6
zc = Z[:, i0]; yc = Y[:, i0]
jg = int(np.argmin(np.where(valid[:, i0], np.abs(zc - 17.0), 1e9)))
G = np.array([0.0, yc[jg], zc[jg]])
jt = next((j for j in range(jg + 10, nE - 8) if valid[j, i0] and zc[j] > 35 and col_[j:j + 8].all()), None)
if jt is not None:
    res['hairline_trg_mm'] = round(float(np.linalg.norm(np.array([0, yc[jt], zc[jt]]) - G)), 1)
    edge = []
    for xs in np.linspace(-0.6 * 63, 0.6 * 63, 25):
        sel = front & (np.abs(X - xs) < 1.0) & (Z > 30) & (Z < 110)
        if not sel.any(): continue
        zs = np.sort(Z[sel & dark])
        zs = [z for z in zs if (sel & dark & (np.abs(Z - z) < 3)).sum() > 3]
        if zs: edge.append((xs, zs[0]))
    if len(edge) > 10:
        e = np.array(edge); fit = np.polyfit(e[:, 0], e[:, 1], 1)
        res['hairline_wobble_mm'] = round(float(np.abs(e[:, 1] - np.polyval(fit, e[:, 0])).max()), 2)
        res['hairline_tilt_mm'] = round(float(abs(np.polyval(fit, 0.6 * 63) - np.polyval(fit, -0.6 * 63))), 2)
# a painted beard: how hard its boundary is (a block's edge is a step; a real beard thins out over millimetres), and
# whether any of it sits where no beard grows (high on the cheek, on the nose)
bz = front & (Z < -15) & (Z > -110) & (np.abs(X) < 62) & ~((np.abs(X) < 30) & (Z > -80) & (Z < -50))
dk = np.clip((0.85 * Lmed - blur(L, r_mm(1.2), front)) / (0.35 * Lmed), 0, 1)      # (0 skin, 1 dense dark hair)
if (bz & (dk > 0.5)).sum() * GSTEP * GSTEP > 400:                          # (4 cm^2 of beard or more)
    gy_, gx_ = np.gradient(dk)
    g = np.hypot(gy_, gx_) / GSTEP                                          # (darkness per mm)
    edge = bz & (dk > 0.15) & (dk < 0.85)
    res['beard_edge_grad'] = round(float(np.percentile(g[edge], 99)), 3) if edge.sum() > 200 else None
    high = front & skinlike & (np.abs(X) > 28) & (np.abs(X) < 42) & (Z > -28) & (Z < -18)     # (mid-cheek, under the cheekbone)
    res['beard_high_frac'] = round(float((dk[high] > 0.5).mean()), 3) if high.sum() > 200 else None
# dark patches where the head as shipped has none: hair carried onto a bare temple or forehead (a misplaced block)
zd = {'temple_L': front & (X > 46) & (X < 64) & (Z > -5) & (Z < 32), 'temple_R': front & (X < -46) & (X > -64) & (Z > -5) & (Z < 32),
      'cheekbone_L': front & (X > 30) & (X < 50) & (Z > -18) & (Z < -6), 'cheekbone_R': front & (X < -30) & (X > -50) & (Z > -18) & (Z < -6)}
res['zone_dark'] = {k: round(float((L[m] < 0.62 * Lmed).mean()), 3) if m.sum() > 200 else None for k, m in zd.items()}
if os.environ.get('QA_DEBUG'):                                  # (the map with the skin read, the regions and the steps found)
    im = np.clip(Cc, 0, 255).astype(np.uint8).copy()
    im[~skin] = (im[~skin] * 0.35).astype(np.uint8)
    for k, m in regions.items(): im[m & skin & ((np.arange(nA)[None, :] + np.arange(nE)[:, None]) % 6 == 0)] = (0, 255, 255)
    im[strong] = (255, 0, 0); im[sp] = (255, 255, 0)
    Image.fromarray(im[::-1]).save(os.environ['QA_DEBUG'])
json.dump(res, open(out_json, 'w'), indent=1)
print(json.dumps(res))
