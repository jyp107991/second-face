"""The sculptor's reach and the years, from the Rocketbox people themselves (owner, 2026-10-31: a slider moves a face only
as far as real faces differ; the young against the old say what the years do). Each registered Rocketbox face
(rocketbox_register.py) is expressed in the sculptor's shapes (rocketbox_template_keys.py) by a non-negative least squares
over each shape's two sides, on the face's front; per sex, each slider's spread across the library ([2.5, 97.5] %) is its
reach, each face's own place on it is kept, and each slider's change per year of age (both sexes pooled, a sex offset)
is the years' effect. Usage: python3 rocketbox_calibrate.py <registered.npz> <template_keys.npz> <ages.json> <Sculpt.cs> <out.json>"""
import json, re, sys
import numpy as np


def sliders(sculpt_cs):
    """The paired sliders (id, low side, high side) as Sculpt.cs lists them."""
    out = []
    for m in re.finditer(r'new\("([a-z0-9-]+)", "[^"]*", "[^"]*", "([a-z]+)", "([a-z]+)"\)', open(sculpt_cs).read()):
        out.append(m.groups())
    return out


def nnls(A, b, iters=600):
    """Non-negative least squares by projected gradient (A's columns scaled to unit norm by the caller)."""
    x = np.zeros(A.shape[1]); AtA = A.T @ A; Atb = A.T @ b
    L = np.linalg.eigvalsh(AtA).max()
    for _ in range(iters):
        x = np.maximum(0, x - (AtA @ x - Atb) / L)
    return x


def main(reg, keys, ages_path, sculpt_cs, out):
    R = np.load(reg); K = np.load(keys); ages = json.load(open(ages_path))['ages']
    names = list(R['names']); sex = R['sex']; X = R['X'].astype(np.float64)
    pairs = sliders(sculpt_cs)
    res = {'_about': __doc__.split('\n')[0], 'sexes': {}}
    coords = {}
    for s in ('f', 'm'):
        sel = [i for i in range(len(names)) if sex[i] == s]
        if len(sel) < 5: continue
        Xs = X[sel]; mu = Xs.mean(0)
        knames = list(K[f'{s}_names']); D = K[f'{s}_D'].astype(np.float64)
        # the face's front: ahead of the ears, from the brows to the chin (the sides and the back carry hair)
        w = ((mu[:, 1] < 0.02) & (mu[:, 2] > -0.14) & (mu[:, 2] < 0.05)).astype(float)
        cols, colname = [], []
        for sid, lo, hi in pairs:
            for side in (lo, hi):
                key = f'{sid}-{side}'
                if key in knames:
                    cols.append(D[knames.index(key)]); colname.append((sid, side == hi))
        A = np.stack([c[w > 0].ravel() for c in cols], 1); nrm = np.linalg.norm(A, axis=0)
        # (a shape that barely moves the face's front would take any amount to explain noise: left out, below a tenth of
        # the median shape's effect there)
        keep = nrm > 0.1 * np.median(nrm)
        cols = [c for c, k in zip(cols, keep) if k]; colname = [c for c, k in zip(colname, keep) if k]
        A = A[:, keep]; nrm = nrm[keep]; A /= np.maximum(nrm, 1e-9)
        # and a light ridge, so overlapping shapes share a difference rather than trade it to extremes
        lam = 0.02 * np.linalg.norm(A, 2) ** 2
        A = np.vstack([A, np.sqrt(lam) * np.eye(A.shape[1])])
        r2 = []
        C = np.zeros((len(sel), A.shape[1]))
        for j, x in enumerate(Xs):
            b0 = (x - mu)[w > 0].ravel(); b = np.concatenate([b0, np.zeros(A.shape[1])])
            c = nnls(A, b); C[j] = c / np.maximum(nrm, 1e-9)
            r2.append(1 - ((b0 - A[:len(b0)] @ c) ** 2).sum() / (b0 ** 2).sum())
        ids = sorted({sid for sid, _ in colname})
        val = {sid: np.zeros(len(sel)) for sid in ids}
        for k, (sid, high) in enumerate(colname): val[sid] += C[:, k] * (1 if high else -1)
        ag = np.array([ages.get(names[i], np.nan) for i in sel], float)
        res['sexes'][s] = {'faces': len(sel), 'explained': float(np.median(r2)), 'sliders': {}}
        for sid in ids:
            v = val[sid]
            res['sexes'][s]['sliders'][sid] = {'lo': float(np.percentile(v, 2.5)), 'hi': float(np.percentile(v, 97.5)), 'sd': float(v.std())}
        coords[s] = (sel, val, ag)
        res.setdefault('faces', {})
        for j, i in enumerate(sel):
            res['faces'][names[i]] = {'sex': s, 'age': None if np.isnan(ag[j]) else float(ag[j]),
                                      'at': {sid: round(float(val[sid][j]), 4) for sid in ids}}
    # the years: each slider's change per year, both sexes pooled with a sex offset
    years = {}
    allids = sorted(set().union(*[set(coords[s][1]) for s in coords]))
    for sid in allids:
        rows, ys = [], []
        for s, (sel, val, ag) in coords.items():
            if sid not in val: continue
            for j in range(len(sel)):
                if np.isnan(ag[j]): continue
                rows.append([1.0, 1.0 if s == 'm' else 0.0, ag[j] - 35.0]); ys.append(val[sid][j])
        A = np.array(rows); y = np.array(ys)
        beta, *_ = np.linalg.lstsq(A, y, rcond=None)
        resid = y - A @ beta; se = np.sqrt(resid.var() / max(1, ((A[:, 2] - A[:, 2].mean()) ** 2).sum()))
        years[sid] = {'per_year': float(beta[2]), 'se': float(se)}
    res['years'] = years
    json.dump(res, open(out, 'w'), indent=1)
    for s in res['sexes']:
        print(s, 'faces', res['sexes'][s]['faces'], 'explained (median R2)', round(res['sexes'][s]['explained'], 3))
    sig = sorted(((abs(v['per_year']) / max(v['se'], 1e-9), k, v['per_year']) for k, v in years.items()), reverse=True)[:12]
    print('the years, strongest (per decade):', ', '.join(f'{k} {10 * py:+.2f}' for _, k, py in sig))


if __name__ == '__main__':
    main(*sys.argv[1:6])
