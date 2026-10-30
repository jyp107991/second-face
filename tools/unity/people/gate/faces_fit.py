"""Faces from real faces (R3, docs/PEOPLE_REALISM.md §4.2): FairFace's real frontal faces (fairface_shapes.json) as whole
shapes (shapes.py) in a shape space per sex (principal components, whitened by the real faces' spread); the sculptor's
sliders' response in that space (the one-slider portraits of PeopleGateTests.MeasureShapeResponses, refitted on the
people rendered for real, as response2d.py does); then every real face solved in our basis, each slider inside its sex's
range, held lightly to zero: the sliders that give our base that real face's shape, and the residual our basis cannot
reach (the base's limits, per group). Core draws each person from a real face of their people, sex and age so
(gen_core.py). Writes tools/unity/people/gate/faces_fit.json.
Usage: python3 faces_fit.py <unity/test-results> [--lam 0.5]"""
import json, os, re, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from response import refit
from shapes import symmetric

# the body's macros Bodies sets for every person, which move the face too: each real face fitted with the ancestry mix
# its people get (Bodies.Ancestry of the cluster FairFace's race stands for) and the body's age its years give, so the
# sliders carry only the person's own shape (not the ancestry twice)
MIX = {'black': (0.95, 0, 0.05), 'white': (0, 0, 1), 'middle_eastern': (0.05, 0.05, 0.9), 'latino': (0.15, 0.35, 0.5),
       'indian': (0.15, 0.25, 0.6), 'east_asian': (0, 1, 0), 'southeast_asian': (0.1, 0.85, 0.05)}
AGE_MID = {3: 25, 4: 35, 5: 45, 6: 55, 7: 65, 8: 75}


def macros(race, age):
    af, as_, ca = MIX[race]
    return {'body-african': af, 'body-asian': as_, 'body-caucasian': ca, 'body-age': min(1.0, max(0.0, (AGE_MID[age] - 24) / 46.0))}


# the sliders that act in depth (the head's length, the forehead's slope, the brow ridge, the bridge's hump, the nose's
# projection, the mouth and chin forward, the neck's depth): a frontal photograph cannot measure them, so the real faces
# never set them (fitted, they took up other sliders' share of a frontal shape) and they keep their peoples' rules
PROFILE = {'head-scale-depth', 'head-back-scale-depth', 'forehead-trans', 'brow-ridge', 'nose-hump', 'nose-scale-depth',
           'mouth-trans', 'chin-prominent', 'chin-prognathism', 'neck-scale-depth'}
CLOSED = 0.035   # lips apart under this share of the face's height: a face at rest (an open mouth drops the chin)

SCULPT = os.path.join(HERE, '..', '..', '..', '..', 'unity', 'Assets', 'SecondFace', 'Core', 'Npc', 'Sculpt.cs')
GROUPS = 'head|brows|eyes|nose|cheeks|mouth|chin|ears|neck'


def slider_ranges(male, full=False):
    """Each face slider's range for a sex, as Core Sculpt.Range and HeadCap give it; with full, each slider's whole range
    (the real faces decide: R3 found the hand-written women's ranges too narrow for most real women)."""
    s = open(SCULPT).read()
    out = {}
    for sid, group, low in re.findall(r'new\("([a-z0-9-]+)", "(%s)", "[^"]*", (null|"[^"]*"), "[^"]*"\)' % GROUPS, s):
        if low == 'null':
            cap = (0.55 if sid in ('head-round', 'head-oval', 'head-invertedtriangular') else 0.85) if male else \
                  (0.3 if sid in ('head-square', 'head-rectangular') else 0.25 if sid == 'head-triangular' else 0.85)
            out[sid] = (False, 0.0, cap)
        else:
            out[sid] = (True, -1.0, 1.0)
    for sid, flo, fhi, mlo, mhi in re.findall(r'\["([a-z0-9-]+)"\] = \(\((-?[\d.]+)f, (-?[\d.]+)f\), \((-?[\d.]+)f, (-?[\d.]+)f\)\)', s):
        if sid in out and not full: out[sid] = (True, float(mlo if male else flo), float(mhi if male else fhi))
    if full:
        # each slider's whole reach (Sculpt.Extended: the shapes taken past MakeHuman's end where real faces need it)
        ext = {k: float(v) for k, v in re.findall(r'\["([a-z0-9-]+)"\] = ([\d.]+)f', s[s.index('Dictionary<string, float> Extended'):s.index('Reach(string id)')])}
        out = {k: (paired, lo * ext.get(k, 1.0), ext.get(k, 1.0)) for k, (paired, lo, hi) in out.items()}
    return out


def solve(z, n, P, N, ranges, ids, lam, iters=8):
    """The slider values v (by ids) whose response best gives shape z (whitened), each in its range, ridge lam to 0. The
    response is piecewise linear (a slider's two sides differ): solved linear, each slider's slope taken from the side its
    value lies on, and again until the sides settle."""
    k = len(ids)
    v = np.zeros(k)
    lo = np.array([ranges[i][1] for i in ids]); hi = np.array([ranges[i][2] for i in ids])
    dz = z - n
    for _ in range(iters):
        A = np.stack([P[j] if v[j] > 1e-6 else (-N[j] if v[j] < -1e-6 else (P[j] - N[j]) / 2) for j in range(k)], 1)
        v = np.linalg.solve(A.T @ A + lam * np.eye(k), A.T @ dz)
        v = np.clip(v, lo, hi)
    A = np.stack([P[j] if v[j] > 0 else -N[j] for j in range(k)], 1)
    return v, float(np.linalg.norm(A @ v - dz)), float(np.linalg.norm(dz))


def main(results, lam):
    FF = json.load(open(os.path.join(HERE, 'fairface_shapes.json')))['faces']
    ours = {f['Id']: f for f in json.load(open(os.path.join(results, 'people_faces2d.json'))) if f.get('shape')}
    people = json.load(open(os.path.join(results, 'people_measures.json')))
    out = {'lam': lam, 'space': {}, 'response': {}, 'faces': []}
    for sex in ('f', 'm'):
        real = [f for f in FF if f['sex'] == sex and f['gap'] < CLOSED]
        Y = np.array([symmetric(f['shape']) for f in real])
        mu = Y.mean(0)
        _, S, Vt = np.linalg.svd(Y - mu, full_matrices=False)
        var = S ** 2 / (len(Y) - 1)
        K = int(min(30, np.searchsorted(np.cumsum(var) / var.sum(), 0.97) + 1))
        comps, sd = Vt[:K], np.sqrt(var[:K])
        proj = lambda y: comps @ (symmetric(y) - mu) / sd
        out['space'][sex] = {'K': K, 'mean': mu.round(5).tolist(), 'comps': comps.round(5).tolist(), 'sd': sd.round(6).tolist()}
        print(f'{sex}: {len(Y)} real faces at rest, {K} components hold 97 % of the shapes\' variance')
        # the sliders' response in the space
        n0 = proj(ours[f'resp_{sex}_neutral']['shape'])
        shapes = {}
        for fid, f in ours.items():
            if not fid.startswith(f'resp_{sex}_') or fid.endswith('neutral'): continue
            if f['pose'] and max(abs(a) for a in f['pose'][:2]) > 12: continue
            shapes[fid[len(f'resp_{sex}_'):]] = (proj(f['shape']) - n0).tolist()
        model = {sex: {'neutral': n0.tolist(), 'shapes': shapes}}
        rows = [(p['Sliders'], proj(ours[p['Id']]['shape'])) for p in people
                if p['Sex'] == sex and p['Age'] >= 18 and p.get('Sliders') and p['Id'] in ours]
        def rms():
            b = model[sex]; tags = sorted(b['shapes'])
            from response import features
            E = [np.array(b['neutral']) + features(tags, s) @ np.array([b['shapes'][t] for t in tags]) - y for s, y in rows]
            return float(np.sqrt(np.mean(np.square(E))))
        r1 = rms(); refit(model, sex, rows); r2 = rms()
        print(f'   response: {len(shapes)} shape sides; on {len(rows)} rendered people rms {r1:.2f} (one-slider) -> {r2:.2f} (refitted), in real sds')
        out['response'][sex] = model[sex]
        # every real face in our basis
        ranges = slider_ranges(sex == 'm', full=True)
        b = model[sex]
        ids = [i for i in sorted(ranges) if i not in PROFILE and (f'{i}_p' in b['shapes'] or f'{i}_n' in b['shapes'])]
        zero = np.zeros(K)
        P = [np.array(b['shapes'].get(f'{i}_p', zero)) for i in ids]
        N = [np.array(b['shapes'].get(f'{i}_n', zero)) for i in ids]
        n = np.array(b['neutral'])
        res = {}
        for f in real:
            off = sum(val * np.array(b['shapes'].get(f'{k}_p', zero)) for k, val in macros(f['race'], f['age']).items())
            v, r, d = solve(proj(f['shape']), n + off, P, N, ranges, ids, lam)
            out['faces'].append({'i': f['i'], 'race': f['race'], 'sex': sex, 'age': f['age'], 'gap': f['gap'],
                                 'sliders': {i: round(float(x), 3) for i, x in zip(ids, v) if abs(x) >= 0.005},
                                 'resid': round(r, 3), 'dist': round(d, 3)})
            res.setdefault(f['race'], []).append((r, d))
        for race, rd in sorted(res.items()):
            rd = np.array(rd)
            print(f'   {race:16s} n {len(rd):3d}  distance from our neutral {rd[:,1].mean():.2f}  left unreached {rd[:,0].mean():.2f}  ({(1 - (rd[:,0]**2).sum() / (rd[:,1]**2).sum()):.0%} of the shape reached)')
    json.dump(out, open(os.path.join(HERE, 'faces_fit.json'), 'w'))


if __name__ == '__main__':
    main(sys.argv[1], float(sys.argv[sys.argv.index('--lam') + 1]) if '--lam' in sys.argv else 0.5)
