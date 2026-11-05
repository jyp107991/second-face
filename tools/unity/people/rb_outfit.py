"""The outfit bake (owner, 2026-11-05: the Rocketbox outfits are lore-inconsistent; wardrobe rule, CLAUDE.md §2): a
Rocketbox person's clothes, painted into its body's photographed texture, made ready to be re-dyed in the game, with
their prints, insignia, badges, stripes, logos and camouflage painted out and their wear drawn where cloth wears.

For each body (its texture and the map from rb_outfit_map.py: each texel's place on the body):
1. Skin: texels near the person's own skin colour (from the bare hands, or the face when the hands are gloved) are left
   as they were.
2. Garments: the cloth of the upper body, the legs and the feet is split by colour (k-means in CIELAB) into pieces. A
   piece large and whole is a garment (a dye group); small pieces are detail: dark leather and webbing (belts, pouches,
   straps, boots' soles) is kept; anything else (a print, a badge, a name tape, a reflective stripe, a logo) is painted
   out into the garment round it. Pieces broken into many interleaved blobs (camouflage, stripes, checks, argyle) are
   one patterned garment, its pattern taken off.
3. Neutral cloth: each garment is written as grey whose linear luminance is 0.184 (CIELAB L 50) times the texel's own
   luminance over the garment's median, so the game's shader dyes it by multiplying (albedo = dye * grey / 0.184): the
   folds and weave of the photograph stay, the colour becomes the dye. Painted-out texels take the garment's shading
   from round them (normalised convolution) with the garment's own weave.
4. Wear (0..1): knees, elbows, cuffs, hems, the seat, the shoulders' sun; patches sewn over a worn knee or elbow (the
   accent dye, a stitched edge). Grime rises from the feet in the shader (by height), not in the map.

Writes <out>/<body material>_color.jpg (skin as it was, garments neutral, kept detail desaturated), <out>/<body
material>_dye.png (R, G, B: the three dye groups' weights; A: wear), <out>/outfit.json (the groups: what part of the
body, the original colour, area, whether patterned; what was painted out), and with --preview <palette json or 'auto'>
a dyed copy <out>/preview/<body material>_color.jpg for judging renders.
Usage: python rb_outfit.py <map npz> <person dir (its textures)> <out dir> [--preview auto|<hex,hex,hex>] [--seed N]"""
import sys, os, json, math, argparse
import numpy as np
from PIL import Image
import cv2
from scipy import ndimage

ap = argparse.ArgumentParser()
ap.add_argument('map'); ap.add_argument('src'); ap.add_argument('out')
ap.add_argument('--preview', default=None); ap.add_argument('--seed', type=int, default=1)
ap.add_argument('--k', type=int, default=4)
A = ap.parse_args()
os.makedirs(A.out, exist_ok=True)
M = np.load(A.map)
REG, POS, ISL = M['REG'], M['POS'].astype(np.float32), M['ISL']
NRM = M['NRM'].astype(np.float32) / (127.0 if M['NRM'].dtype == np.int8 else 1.0)
N = REG.shape[0]
bmat = str(M['body_mat'][0])
tex_path = os.path.join(A.src, bmat + '_color.jpg')
head_path = os.path.join(A.src, bmat.replace('_body', '_head') + '_color.jpg')
TF = np.asarray(Image.open(tex_path).convert('RGB'), np.float32) / 255.0
F = TF.shape[0]
rng = np.random.default_rng(A.seed)
BAND_PATTERN = float(os.environ.get('RBO_BAND', 0.30))
PRINT_T = float(os.environ.get('RBO_PRINT', 2.2))
prints_px = [0]


def lin(c): return np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
def enc(c): c = np.clip(c, 0, 1); return np.where(c > 0.0031308, 1.055 * c ** (1 / 2.4) - 0.055, 12.92 * c)
MX = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
WP = np.array([0.9505, 1.0, 1.089])
def lab(c):
    xyz = lin(c) @ MX.T / WP
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)
def unlab(L):
    fy = (L[..., 0] + 16) / 116; fx = fy + L[..., 1] / 500; fz = fy - L[..., 2] / 200
    f = np.stack([fx, fy, fz], -1); xyz = np.where(f > 0.206893, f ** 3, (f - 16 / 116) / 7.787) * WP
    return enc(xyz @ np.linalg.inv(MX).T)
def hexlab(h): return lab(np.array([((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255]))


# the analysis at the map's size (texture area-averaged down)
T = cv2.resize(TF, (N, N), interpolation=cv2.INTER_AREA)
LAB = lab(T)
on = REG != 255
L_, a_, b_ = LAB[..., 0], LAB[..., 1], LAB[..., 2]
ch = np.hypot(a_, b_); hue = np.degrees(np.arctan2(b_, a_))
# 1. skin
cand = on & (hue > 8) & (hue < 82) & (ch > 8) & (ch < 58) & (L_ > 10) & (L_ < 95)
hand = on & (REG == 4)
if (cand & hand).sum() > 0.35 * max(hand.sum(), 1):
    ref = np.median(LAB[cand & hand], 0); ref_src = 'hands'
else:
    H_ = lab(np.asarray(Image.open(head_path).convert('RGB').resize((512, 512)), np.float32) / 255.0)
    hc = np.hypot(H_[..., 1], H_[..., 2]); hh = np.degrees(np.arctan2(H_[..., 2], H_[..., 1]))
    ref = np.median(H_[(hc > 8) & (hh > 10) & (hh < 80) & (H_[..., 0] > 15)], 0); ref_src = 'face'
dE = np.sqrt((0.35 * (L_ - ref[0])) ** 2 + (a_ - ref[1]) ** 2 + (b_ - ref[2]) ** 2)
tol = np.where(np.isin(REG, [4, 1, 3, 9]), 13.0, 9.5)          # (hands, neck, forearms, head: often bare)
skin = cand & (dE < tol)
if ref_src == 'face': skin &= np.isin(REG, [1, 9])          # (gloved hands: a suit covers the rest)
skin = ndimage.binary_opening(skin, iterations=1)
lbl, n = ndimage.label(skin); sizes = ndimage.sum(skin, lbl, range(1, n + 1))
trunk = np.array([ndimage.mean(np.isin(REG, [0, 5]), lbl, i) for i in range(1, n + 1)]) if n else np.zeros(0)
skin = np.isin(lbl, 1 + np.where((sizes >= 150) & ~((trunk > 0.5) & (sizes < 2500)))[0])
skin = ndimage.binary_closing(skin, iterations=2) & on
cloth = on & ~skin
# 2. garments by part of the body
PARTS = {'top': [0, 1, 2, 3, 9, 4], 'legs': [5, 6, 7], 'feet': [8]}
PART_OF = np.full(256, -1, np.int32)
for pi_, (pn_, rs_) in enumerate(PARTS.items()):
    for r_ in rs_: PART_OF[r_] = pi_
PT = PART_OF[REG]
# (a jacket's hem moves with the hips and a trouser's waist with the spine: each piece of the layout belongs to the part
# that holds most of its cloth, so a garment is not cut in two by the bones)
for il in np.unique(ISL[cloth]):
    im_ = cloth & (ISL == il)
    cnt = np.bincount(PT[im_][PT[im_] >= 0], minlength=3)
    if cnt.sum() and cnt.max() > 0.6 * cnt.sum() and cnt.argmax() != 2:
        sel_ = im_ & (PT != 2)
        PT[sel_] = cnt.argmax()
LABk = np.stack([0.6 * L_, a_, b_], -1)
LABs = cv2.GaussianBlur(LAB.astype(np.float32), (0, 0), 1.0)
G = np.full((N, N), -1, np.int32)            # garment id per texel (-1: skin / off; detail texels get their garment's id)
KEEP = np.zeros((N, N), bool); OUT = np.zeros((N, N), bool)
groups = []
for pi_, (part, regs) in enumerate(PARTS.items()):
    m = cloth & (PT == pi_)
    if m.sum() < 400: continue
    X = LABk[m].astype(np.float32)
    k = min(A.k, max(1, int(m.sum() // 3000)))
    samp = X[rng.choice(len(X), min(len(X), 60000), replace=False)]
    _, _, C = cv2.kmeans(samp, k, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 50, 0.2), 4, cv2.KMEANS_PP_CENTERS)
    # merge near centres
    C = list(C)
    merged = True
    while merged and len(C) > 1:
        merged = False
        for i in range(len(C)):
            for j in range(i + 1, len(C)):
                if np.linalg.norm(C[i] - C[j]) < 9.0:
                    C[i] = (C[i] + C[j]) / 2; C.pop(j); merged = True; break
            if merged: break
    C = np.array(C)
    lab_m = np.argmin(((X[:, None, :] - C[None]) ** 2).sum(-1), 1)
    LM = np.full((N, N), -1, np.int32); LM[m] = lab_m
    LM = ndimage.median_filter(np.where(m, LM, -1), size=3); LM[~m] = -1
    # clusters that meet along a soft boundary are one cloth in light and shade (shading splits a black trouser into
    # three clusters; a garment's edge or a print's is sharp)
    par = list(range(len(C)))
    def fnd(i):
        while par[i] != i: par[i] = par[par[i]]; i = par[i]
        return i
    for _ in range(3):
        for ax in (0, 1):
            A0 = LM[:-1, :] if ax == 0 else LM[:, :-1]; A1 = LM[1:, :] if ax == 0 else LM[:, 1:]
            S0 = LABs[:-1, :] if ax == 0 else LABs[:, :-1]; S1 = LABs[1:, :] if ax == 0 else LABs[:, 1:]
            diff = (A0 != A1) & (A0 >= 0) & (A1 >= 0)
            if not diff.any(): continue
            dd = np.sqrt((((S0 - S1) * [0.6, 1, 1]) ** 2).sum(-1))[diff]
            pa, pb = A0[diff], A1[diff]
            for i in range(len(C)):
                for j in range(i + 1, len(C)):
                    sel = ((pa == i) & (pb == j)) | ((pa == j) & (pb == i))
                    if sel.sum() < 60: continue
                    if np.median(dd[sel]) < 2.2 and fnd(i) != fnd(j): par[fnd(i)] = fnd(j)
    roots = sorted({fnd(i) for i in range(len(C))})
    remap = {i: roots.index(fnd(i)) for i in range(len(C))}
    LM = np.where(LM >= 0, np.vectorize(remap.get)(np.maximum(LM, 0)), -1)
    C = np.array([np.median(LABk[LM == r], 0) if (LM == r).any() else np.zeros(3) for r in range(len(roots))])
    tot = m.sum()
    info = []
    for c in range(len(C)):
        cm = LM == c; area = int(cm.sum())
        if area == 0: continue
        er = ndimage.binary_erosion(cm)
        frag = float((cm & ~er).sum()) / area
        bl_, nl = ndimage.label(cm)
        bs_ = ndimage.sum(cm, bl_, range(1, nl + 1)) if nl else np.zeros(0)
        Lc = np.median(LAB[cm], 0)
        dt_ = ndimage.distance_transform_edt(cm)
        thick = float(2 * np.percentile(dt_[cm], 90))
        ring = ndimage.binary_dilation(cm, iterations=2) & ~cm
        encl = float((ring & m).sum()) / max(ring.sum(), 1)
        info.append(dict(c=c, area=area / tot, frag=frag, blobs=int((bs_ > 150).sum()), lab=Lc, thick=thick, encl=encl))
    if os.environ.get('RBO_DEBUG'):
        for d in info: print('  ', part, d['c'], 'area %.3f frag %.2f blobs %d thick %.1f encl %.2f' % (d['area'], d['frag'], d['blobs'], d['thick'], d['encl']), np.round(d['lab'], 1))
    # patterned: two or more broken pieces that together cover much of the part
    broken = [d for d in info if d['frag'] > 0.30 and d['area'] > 0.06]
    pattern_ids = set()
    if len(broken) >= 2 and sum(d['area'] for d in broken) > 0.35:
        pattern_ids = {d['c'] for d in broken}
    garments = []
    if pattern_ids:
        garments.append(dict(ids=sorted(pattern_ids), pattern=True))
    motif_ids = set()
    for d in sorted(info, key=lambda d: -d['area']):
        if d['c'] in pattern_ids: continue
        # (a motif: many pieces held inside another cloth, argyle's diamonds; a stripe: a thin band held inside it, a
        # paramedic's reflective tape)
        motif = d['blobs'] >= 5 and d['encl'] > 0.75 and d['area'] < 0.45
        stripe = d['thick'] < 14.0 and d['encl'] > 0.6
        if motif or stripe: motif_ids.add(d['c'])
        if d['area'] >= 0.10 and d['frag'] < 0.30 and not motif and not stripe:
            garments.append(dict(ids=[d['c']], pattern=False))
    if not garments:
        garments.append(dict(ids=[max(info, key=lambda d: d['area'])['c']], pattern=False))
    Yk = lin(T) @ MX[1]
    def band_of(gm):
        w_ = gm.astype(np.float32); inner = ndimage.binary_erosion(gm, iterations=14)
        if inner.sum() < 500: return 0.0
        nb = lambda s_: cv2.GaussianBlur(Yk * w_, (0, 0), s_) / np.maximum(cv2.GaussianBlur(w_, (0, 0), s_), 1e-6)
        return float(np.log(np.maximum(nb(1.5), 1e-4) / np.maximum(nb(12.0), 1e-4))[inner].std())
    for g in garments:
        g['band'] = band_of(np.isin(LM, g['ids']))
        if g['band'] > BAND_PATTERN: g['pattern'] = True
        if os.environ.get('RBO_DEBUG'): print('   garment', part, g['ids'], 'band %.3f' % g['band'], 'P' if g['pattern'] else '')
    gid0 = len(groups)
    if part in ('feet', 'hands'):
        KEEP |= m; continue
    for g in garments:
        gm = np.isin(LM, g['ids'])
        groups.append(dict(part=part, pattern=g['pattern'], band=round(g.get('band', 0.0), 3), area=float(gm.sum() / (N * N)),
                           lab=[round(float(v), 1) for v in np.median(LAB[gm], 0)]))
        G[gm] = len(groups) - 1
    # a garment's small islands inside another garment are detail (a name tape's letters in the shirt's white)
    for gi_ in range(gid0, len(groups)):
        gl_, nn_ = ndimage.label(G == gi_)
        if nn_ == 0: continue
        sz_ = ndimage.sum(np.ones_like(gl_), gl_, range(1, nn_ + 1))
        small = np.isin(gl_, 1 + np.where(sz_ < 1500)[0])
        G[small] = -1
    # detail: kept when dark leather or webbing, otherwise painted out into the garment round it
    det = m & (G < 0)
    # detail the colour of the garment round it is that garment in shadow (a black trouser's folds)
    if det.any() and (G >= gid0).any():
        own_ = G >= gid0
        _, (iy_, ix_) = ndimage.distance_transform_edt((~own_).astype(np.uint8), return_indices=True)
        ng = G[iy_, ix_]
        gmed = {gi_: np.median(LABk[G == gi_], 0) for gi_ in range(gid0, len(groups))}
        GM = np.zeros((N, N, 3), np.float32)
        for gi_, v_ in gmed.items(): GM[ng == gi_] = v_
        close = det & (np.linalg.norm(LABk - GM, axis=-1) < 14.0)
        G[close] = ng[close]; det &= ~close
    dark = det & (L_ < 32) & (ch < 14)
    KEEP |= dark
    OUT |= det & ~dark
    # a motif's or a stripe's pieces are painted out however dark (argyle's black diamonds are not leather)
    mot = m & np.isin(LM, sorted(motif_ids)) & (G < 0)
    OUT |= mot; KEEP &= ~mot
    # prints: compact blobs of sharp local contrast inside a garment (a t-shirt's graphic, a logo, an emblem); folds are
    # thin lines (taken off by an opening) and shading is broad (in the background)
    for gi_ in range(gid0, len(groups)):
        if groups[gi_]['pattern'] or groups[gi_]['part'] != 'top' or groups[gi_].get('band', 0) > 0.22: continue
        gm_ = G == gi_
        if gm_.sum() < 2000: continue
        # (the fine edges of a print: a graphic's lines are sharp where a fold's shading is soft; compact on the trunk,
        # where a seam or a fold's crease is long and thin)
        w_ = gm_.astype(np.float32); nbw = lambda a_, s_: cv2.GaussianBlur((a_ * w_).astype(np.float32), (0, 0), s_) / np.maximum(cv2.GaussianBlur(w_, (0, 0), s_), 1e-6)
        hp_ = np.abs(np.log(np.maximum(Yk, 1e-4) / np.maximum(nbw(Yk, 1.2), 1e-4)))
        E_ = nbw(hp_, 4.0); inner_ = ndimage.binary_erosion(gm_, iterations=6)
        if inner_.sum() < 500: continue
        pr = gm_ & (E_ > PRINT_T * np.median(E_[inner_])) & np.isin(REG, [0, 2])
        pr = ndimage.binary_opening(pr, iterations=2)
        pl, pn = ndimage.label(pr)
        if pn:
            ps = ndimage.sum(pr, pl, range(1, pn + 1))
            sl = ndimage.find_objects(pl)
            fill_ = np.array([ps[i] / max(1, (s_[0].stop - s_[0].start) * (s_[1].stop - s_[1].start)) for i, s_ in enumerate(sl)])
            ext_ = np.array([max(s_[0].stop - s_[0].start, s_[1].stop - s_[1].start) / max(1, min(s_[0].stop - s_[0].start, s_[1].stop - s_[1].start)) for s_ in sl])
            pr = np.isin(pl, 1 + np.where((ps >= 120) & (ps <= 15000) & (fill_ > 0.3) & (ext_ < 3.0))[0])
            pr = ndimage.binary_fill_holes(ndimage.binary_closing(pr, iterations=4)) & gm_
            OUT |= pr; prints_px[0] += int(pr.sum())
# hands' cloth (gloves) is kept as it is (leather, rubber)
gl = cloth & (REG == 4)
KEEP |= gl & (G < 0)
# painted-out texels take the nearest garment of their own part
out_m = OUT & (G < 0)
INK = np.zeros((N, N), bool)                 # painted-out texels that fall inside kept detail (letters on a black tape)
if out_m.any():
    src_ = (G >= 0) | (KEEP & ~OUT)
    _, (iy, ix) = ndimage.distance_transform_edt((~src_).astype(np.uint8), return_indices=True)
    tg = G[iy[out_m], ix[out_m]]
    G[out_m] = tg
    INK[out_m] = tg < 0
    KEEP |= INK
if os.environ.get('RBO_DEBUG'):
    dbg = np.zeros((N, N, 3), np.uint8); dbg[on] = (40, 40, 40)
    cols_ = [(200, 60, 60), (60, 160, 220), (90, 200, 90), (200, 160, 60), (160, 90, 200), (60, 200, 200)]
    for i_ in range(len(groups)): dbg[G == i_] = cols_[i_ % len(cols_)]
    dbg[KEEP] = (240, 230, 80); dbg[OUT] = (255, 0, 255); dbg[skin] = (255, 190, 170)
    Image.fromarray(dbg).save(os.path.join(A.out, 'classes.png'))
# 3. neutral cloth at full size
up = lambda a: cv2.resize(a.astype(np.float32), (F, F), interpolation=cv2.INTER_NEAREST)
GF = up(G).astype(np.int32); OUTF = cv2.resize(OUT.astype(np.uint8), (F, F), interpolation=cv2.INTER_NEAREST) > 0
OUTF = ndimage.binary_dilation(OUTF, iterations=3)
KEEPF = cv2.resize(KEEP.astype(np.uint8), (F, F), interpolation=cv2.INTER_NEAREST) > 0
Y = lin(TF) @ MX[1]
res = TF.copy()
gauss = lambda a, s: cv2.GaussianBlur(a, (0, 0), s)
for i, g in enumerate(groups):
    gm = GF == i
    if not gm.any(): continue
    own = gm & ~OUTF
    ymed = float(np.median(Y[own])) if own.sum() > 100 else float(np.median(Y[gm]))
    r = Y / max(ymed, 1e-4)
    if g['pattern']:
        # (the pattern's blobs come off: only the weave and the broad shading stay)
        w = gm.astype(np.float32)
        lo = gauss(Y * w, 3.0) / np.maximum(gauss(w, 3.0), 1e-4)
        fine = np.clip(Y / np.maximum(lo, 1e-4), 0.82, 1.18)
        broad = gauss(Y * w, 60.0) / np.maximum(gauss(w, 60.0), 1e-4) / max(ymed, 1e-4)
        r = fine * np.clip(broad, 0.75, 1.25) ** 0.5
    else:
        # (painted-out texels: the garment's shading from round them, at the smallest scale that reaches, and its weave)
        w = own.astype(np.float32); rr = np.where(own, r, 0).astype(np.float32)
        fill = np.zeros_like(rr); got = np.zeros_like(rr)
        for s in (4.0, 12.0, 36.0, 100.0):
            nw = gauss(w, s); nv = gauss(rr, s) / np.maximum(nw, 1e-6)
            take = (got == 0) & (nw > 0.15)
            fill[take] = nv[take]; got[take] = 1
        fill[got == 0] = 1.0
        hole = gm & OUTF
        # the weave and the small folds across a hole: mirrored from the garment's own cloth across the hole's edge
        hp = np.clip(r / np.maximum(gauss(np.where(own, r, fill), 3.0), 1e-4), 0.8, 1.25)
        if hole.any():
            _, (by, bx) = ndimage.distance_transform_edt(hole, return_indices=True)
            hy, hx = np.where(hole)
            my = np.clip(2 * by[hy, hx] - hy, 0, F - 1); mx = np.clip(2 * bx[hy, hx] - hx, 0, F - 1)
            okm = own[my, mx]
            wv = np.where(okm, hp[my, mx], np.clip(Y[hy, hx] / np.maximum(gauss(Y, 2.0)[hy, hx], 1e-4), 0.92, 1.08))
            r = r.copy(); r[hy, hx] = fill[hy, hx] * wv
    r = np.clip(r, 0.05, 3.0)
    grey = enc(0.184 * r)
    res[gm] = np.repeat(grey[gm][:, None], 3, 1)
# painted-out texels inside kept detail take the detail's own colour from round them
INKF = ndimage.binary_dilation(cv2.resize(INK.astype(np.uint8), (F, F), interpolation=cv2.INTER_NEAREST) > 0, iterations=3)
if INKF.any():
    w = (KEEPF & ~INKF & ~OUTF).astype(np.float32)
    for s_ in (3.0, 10.0, 30.0):
        nw = gauss(w, s_); fillc = np.stack([gauss(TF[..., c] * w, s_) for c in range(3)], -1) / np.maximum(nw, 1e-6)[..., None]
        take = INKF & (nw > 0.2)
        res[take] = fillc[take]; INKF &= ~take
# kept detail: desaturated a little (salvaged leather and webbing are not crisp)
kk = KEEPF & (GF < 0) | (GF == -2)
LB = lab(res[kk]); LB[:, 1:] *= 0.6; res[kk] = unlab(LB)
# 4. wear
from scipy.spatial import cKDTree
Hh = float(M['height'])
P = POS.reshape(-1, 3); R = REG.reshape(-1); ok = ~np.isnan(P[:, 0])
def near(ra, rb, d):
    """texels of region(s) ra within d metres of region(s) rb"""
    ma = ok & np.isin(R, ra); mb = ok & np.isin(R, rb); out = np.zeros(len(R), np.float32)
    if ma.sum() == 0 or mb.sum() == 0: return out.reshape(N, N)
    t = cKDTree(P[mb][::4]); dd, _ = t.query(P[ma], distance_upper_bound=d * 2)
    out[ma] = np.clip(1 - dd / d, 0, 1); return out.reshape(N, N)
Nn = NRM
front = np.clip(Nn[..., 1], 0, 1); back = np.clip(-Nn[..., 1], 0, 1); upw = np.clip(Nn[..., 2], 0, 1)
kz = 0.285 * Hh
zz = np.nan_to_num(POS[..., 2])
knee = np.exp(-((zz - kz) / (0.05 * Hh)) ** 2) * np.isin(REG, [6, 7]) * front ** 0.7
elbow = (near([2, 3], [3], 0.07) * near([2, 3], [2], 0.07)) ** 0.5 * (0.4 + 0.6 * np.clip(-Nn[..., 1] + 0.2, 0, 1))
cuff = near([3], [4], 0.06)
hem = near([7], [8], 0.10)
seat = (REG == 5) * back * np.exp(-((zz - 0.47 * Hh) / (0.06 * Hh)) ** 2)
sun = np.isin(REG, [0, 2]) * upw ** 2
noise = gauss(rng.random((N, N)).astype(np.float32), 10.0); noise = (noise - noise.mean()) / (noise.std() + 1e-6)
wear = np.clip(0.85 * knee + 0.8 * elbow + 0.7 * cuff + 0.9 * hem + 0.6 * seat + 0.45 * sun + 0.06 * noise + 0.06, 0, 1)
wear = np.where(on, wear, 0).astype(np.float32)
# patches over a worn knee or elbow (in the accent group), with a stitched edge
patches = []
PATCH = np.zeros((N, N), bool)
for nm, src in (('knee', knee), ('elbow', elbow)):
    for side in (1, -1):
        if rng.random() > 0.45: continue
        sel = (src > 0.55) & (np.sign(np.nan_to_num(POS[..., 0])) == side) & (G >= 0)
        if sel.sum() < 30: continue
        ys, xs = np.where(sel); cy, cx = int(np.median(ys)), int(np.median(xs))
        hw, hh = int(rng.integers(9, 16)), int(rng.integers(8, 14)); ang = math.radians(rng.uniform(-14, 14))
        yy, xx = np.mgrid[0:N, 0:N]; u = (xx - cx) * math.cos(ang) + (yy - cy) * math.sin(ang); v = -(xx - cx) * math.sin(ang) + (yy - cy) * math.cos(ang)
        pm = (np.abs(u) < hw) & (np.abs(v) < hh) & (ISL == ISL[cy, cx]) & (G >= 0)
        PATCH |= pm; patches.append(dict(at=nm, side=side, uv=[cx / N, cy / N]))
# 5. the dye masks: the three largest garments by area (most people: top, legs, a second top piece); the rest takes the
# nearest of those by part; patches take the third
order = sorted(range(len(groups)), key=lambda i: -groups[i]['area'])
legs = [i for i in order if groups[i]['part'] == 'legs']; top = [i for i in order if groups[i]['part'] == 'top']
feet = [i for i in order if groups[i]['part'] == 'feet']
ch_of = {}
if top: ch_of[top[0]] = 0
if legs: ch_of[legs[0]] = 1
rest = [i for i in order if i not in ch_of and groups[i]['part'] != 'hands']
if rest: ch_of[rest[0]] = 2
for i in rest[1:]:
    ch_of[i] = 2 if groups[i]['part'] != 'legs' else 1
for i, g in enumerate(groups): g['channel'] = ch_of.get(i, -1)
MASK = np.zeros((N, N, 4), np.float32)
for i, c in ch_of.items():
    MASK[..., c][G == i] = 1.0
MASK[PATCH, :3] = 0; MASK[PATCH, 2] = 1.0
MASK[..., 3] = np.where(PATCH, 0.25, wear)
MF = cv2.resize(MASK, (F, F), interpolation=cv2.INTER_LINEAR)
# patches in the neutral texture: flat cloth with its weave, a darker stitched edge
PF = cv2.resize(PATCH.astype(np.uint8), (F, F), interpolation=cv2.INTER_NEAREST) > 0
if PF.any():
    edge = PF & ~ndimage.binary_erosion(PF, iterations=3)
    yy, xx = np.mgrid[0:F, 0:F]; dash = ((xx + yy) // 4) % 2 == 0
    weave = np.clip(Y / np.maximum(gauss(Y, 2.0), 1e-4), 0.85, 1.15)
    g2 = enc(0.184 * 0.95 * weave); res[PF] = np.repeat(g2[PF][:, None], 3, 1)
    st = edge & dash; res[st] = res[st] * 0.55
    MF[..., 3][PF] = 0.2
Image.fromarray((np.clip(res, 0, 1) * 255 + 0.5).astype(np.uint8)).save(os.path.join(A.out, bmat + '_color.jpg'), quality=92)
Image.fromarray((np.clip(MF, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').save(os.path.join(A.out, bmat + '_dye.png'), optimize=True)
info = dict(body_mat=bmat, skin_ref=[round(float(v), 1) for v in ref], skin_ref_from=ref_src, groups=groups,
            painted_out=float(OUT.sum() / max(cloth.sum(), 1)), kept=float(KEEP.sum() / max(cloth.sum(), 1)),
            skin=float(skin.sum() / max(on.sum(), 1)), patches=patches)
json.dump(info, open(os.path.join(A.out, 'outfit.json'), 'w'), indent=1)
print(os.path.basename(A.src), 'groups', [(g['part'], g['channel'], 'P' if g['pattern'] else '', round(g['area'], 3)) for g in groups],
      'out %.3f keep %.3f skin %.3f (%s)' % (info['painted_out'], info['kept'], info['skin'], ref_src), 'patches', len(patches))
# preview: dyed as the game's shader will
if A.preview:
    if A.preview == 'auto':
        PAL = [0x8a3b1e, 0x2f4a73, 0xb8862b, 0x5c6b2f, 0x7a2e2e, 0x2f6f6a, 0xc46a2a, 0xc9bda4, 0x5a2d4f, 0x6f8fb0, 0x4a6a3a]
        LEGS = [0x2f3d55, 0x3a3833, 0x4a4a3a, 0x5c5340, 0x3b4d5c, 0x6b5a44, 0x2c2a28, 0x46503a]
        ACC = [0xc9bda4, 0x2c2a28, 0x8a3b1e, 0x5c6b2f, 0xb8862b, 0x3b4d5c, 0x7a6a55]
        dyes = [int(rng.choice(PAL)), int(rng.choice(LEGS)), int(rng.choice(ACC))]
    else:
        dyes = [int(h, 16) for h in A.preview.split(',')]
    age = float(rng.uniform(0.35, 0.8))           # the cloth's age: how far the dyes have faded and greyed
    def faded_dye(h):
        c = lab(np.array([((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255]))
        c = c * [1, 1 - 0.45 * age, 1 - 0.45 * age] + [6 * age, 0.8 * age, 2.5 * age]
        return lin(unlab(c))
    D = [faded_dye(h) for h in dyes]
    base = lin(res)
    out = base.copy()
    wsum = MF[..., :3].sum(-1, keepdims=True)
    dye = sum(MF[..., c:c + 1] * D[c] for c in range(3)) / np.maximum(wsum, 1e-6)
    grey = base.mean(-1, keepdims=True) / 0.184
    dyed = dye * grey
    wr = MF[..., 3:4]
    # wear: the dye fades towards its own pale (sun, abrasion)
    faded = dyed * (1 - 0.45 * wr) + 0.45 * wr * (grey * 0.32)
    a = np.clip(wsum, 0, 1)
    out = base * (1 - a) + faded * a
    # grime from the feet (the shader's by height): dust on the lower legs
    zf = cv2.resize(np.nan_to_num(POS[..., 2]).astype(np.float32), (F, F), interpolation=cv2.INTER_LINEAR) / Hh
    gr = np.clip(1 - zf / 0.33, 0, 1)[..., None] ** 1.5 * 0.55 * (cv2.resize(on.astype(np.float32), (F, F)) > 0)[..., None]
    dust = lin(np.array([0.55, 0.47, 0.38]))
    out = out * (1 - gr) + gr * dust * grey.clip(0.3, 1.5)
    os.makedirs(os.path.join(A.out, 'preview'), exist_ok=True)
    Image.fromarray((enc(out) * 255 + 0.5).astype(np.uint8)).save(os.path.join(A.out, 'preview', bmat + '_color.jpg'), quality=90)
    print('preview dyes', ['%06x' % d for d in dyes])
