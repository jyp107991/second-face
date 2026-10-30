"""Facial contrast (R4 and the sexes' cues, docs/PEOPLE_REALISM.md §14): how much darker the eyes, the brows and the lips are
than the skin around them, and how much redder the lips. Women's faces have more of it than men's (Russell 2009, "A sex
difference in facial contrast and its exaggeration by cosmetics", Perception 38), and it falls with age and is read as
age (Porcheron, Mauger and Russell 2013, "Aspects of facial contrast decrease with age and are cues for age perception",
PLoS ONE 8). Measured the same way on FairFace's frontal faces at rest (the gate's real faces, fairface_shapes.json) and
on our portraits: MediaPipe's landmarks outline each feature and a ring of skin round it; CIELAB L* and a* are averaged
in each; contrast = (skin - feature) / (skin + feature) for L*, feature - skin for a*.
Usage: python -I contrast.py <face_landmarker.task> <FairFace validation.parquet> <unity/test-results>
(writes test-results/people_contrast.json and prints real against ours by sex and age class)"""
import io, json, os, sys
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from landmarks import Landmarker

# MediaPipe face-mesh contours
LIPS = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185]
EYE_R = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
EYE_L = [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466]
BROW_R = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46]
BROW_L = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276]
FEATURES = ('eyes', 'brows', 'lips')


def lab(rgb):
    """sRGB (uint8) to CIELAB L*, a*."""
    c = rgb.astype(float) / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ M.T / np.array([0.9505, 1.0, 1.089])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return 116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1])


def mask(shape, polys, grow=0.0):
    """A polygon mask; grown outwards from its centre by a share of its size."""
    im = Image.new('L', (shape[1], shape[0]), 0)
    d = ImageDraw.Draw(im)
    for q in polys:
        q = np.asarray(q, float)
        c = q.mean(0)
        d.polygon([tuple(c + (p - c) * (1 + grow)) for p in q], fill=1)
    return np.asarray(im, bool)


def measure(rgb, P):
    """The face's contrasts: per feature (eyes, brows, lips) the L* contrast with a ring of skin round it, and the lips'
    a* over the skin's."""
    L, A = lab(rgb)
    pts = lambda idx: P[idx, :2]
    feats = {'eyes': [pts(EYE_R), pts(EYE_L)], 'brows': [pts(BROW_R), pts(BROW_L)], 'lips': [pts(LIPS)]}
    # the eyes with their lash line: the lids' outline a little grown (Russell's eye region takes the lashes and lids in)
    grow_in = {'eyes': 0.25, 'brows': 0.0, 'lips': 0.0}
    grow_out = {'eyes': 0.9, 'brows': 0.6, 'lips': 0.5}
    every = mask(L.shape, [q for v in feats.values() for q in v], 0.2)
    out = {}
    for k, polys in feats.items():
        inner = mask(L.shape, polys, grow_in[k])
        ring = mask(L.shape, polys, grow_out[k]) & ~mask(L.shape, polys, grow_in[k] + 0.15) & ~every
        if inner.sum() < 8 or ring.sum() < 8: return None
        lf, ls = float(L[inner].mean()), float(L[ring].mean())
        out[k] = round((ls - lf) / (ls + lf), 4)
        if k == 'lips': out['lips_a'] = round(float(A[inner].mean() - A[ring].mean()), 3)
    return out


def main(model, parquet, results):
    import pyarrow.parquet as pq
    lm = Landmarker(model)
    real = [f for f in json.load(open(os.path.join(HERE, 'fairface_shapes.json')))['faces'] if f['gap'] < 0.035]
    t = pq.read_table(parquet, columns=['image'])
    rows = []
    for f in real:
        rgb = np.asarray(Image.open(io.BytesIO(t.column('image')[f['i']].as_py()['bytes'])).convert('RGB'))
        r = lm(rgb)
        if r is None: continue
        c = measure(rgb, r[0])
        if c: rows.append({'i': f['i'], 'sex': f['sex'], 'race': f['race'], 'cls': f['age'], **c})
    people = json.load(open(os.path.join(results, 'people_measures.json')))
    ours = []
    for p in people:
        if p['Age'] < 18: continue
        path = os.path.join(results, 'portraits_look', p['Id'] + '.png')
        if not os.path.exists(path): continue
        rgb = np.asarray(Image.open(path).convert('RGB'))
        r = lm(rgb)
        if r is None: continue
        c = measure(rgb, r[0])
        cls = 3 if p['Age'] < 30 else 4 if p['Age'] < 40 else 5 if p['Age'] < 50 else 6 if p['Age'] < 60 else 7 if p['Age'] < 70 else 8
        if c: ours.append({'id': p['Id'], 'sex': p['Sex'], 'heritage': p.get('Heritage'), 'cls': cls, **c})
    json.dump({'real': rows, 'ours': ours}, open(os.path.join(results, 'people_contrast.json'), 'w'))
    keys = list(FEATURES) + ['lips_a']
    def row(xs, k): return f"{np.mean([x[k] for x in xs]):+.3f}" if xs else '   -  '
    print(f"facial contrast, real FairFace ({len(rows)}) against ours ({len(ours)}): mean (eyes, brows, lips L*; lips a*)")
    for sex in 'fm':
        for lo, hi, name in ((3, 4, '20-39'), (5, 6, '40-59'), (7, 8, '60+')):
            r = [x for x in rows if x['sex'] == sex and lo <= x['cls'] <= hi]
            o = [x for x in ours if x['sex'] == sex and lo <= x['cls'] <= hi]
            print(f"  {sex} {name:6s} real n {len(r):3d}: " + ' '.join(row(r, k) for k in keys) + f"   ours n {len(o):3d}: " + ' '.join(row(o, k) for k in keys))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3])
