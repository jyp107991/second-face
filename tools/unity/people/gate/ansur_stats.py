"""Real head, face and neck measures per sex and race from ANSUR II (US Army anthropometric survey 2012, public domain;
https://www.openlab.psu.edu/ansur2/): for each group the count, mean, sd, 3rd / 50th / 97th percentiles and covariance
of the measures the gate uses, and of their ratios. Writes tools/unity/people/gate/ansur_stats.json.
Usage: python3 ansur_stats.py <ANSUR_II_MALE_Public.csv> <ANSUR_II_FEMALE_Public.csv> [out.json]"""
import csv, json, math, os, sys
import numpy as np

MEASURES = ['headbreadth', 'headlength', 'bizygomaticbreadth', 'mentonsellionlength', 'interpupillarybreadth', 'neckcircumference', 'stature',
            'tragiontopofhead', 'vertexsuprasternale']
RACES = {'1': 'white', '2': 'black', '3': 'hispanic', '4': 'asian', '5': 'native_american'}


def ratios(m):
    """The proportions that read in a picture: each a ratio of two measures (mm)."""
    neck_d = m['neckcircumference'] / math.pi
    return {
        'head_neck': m['headbreadth'] / neck_d,                          # head breadth over the neck's diameter
        'face_hw': m['mentonsellionlength'] / m['bizygomaticbreadth'],   # face height over cheek width
        'zyg_head': m['bizygomaticbreadth'] / m['headbreadth'],          # cheek width over head breadth
        'cephalic': m['headbreadth'] / m['headlength'],                  # head breadth over length
        'head_stature': m['headbreadth'] / m['stature'],                 # head breadth over stature
        'face_stature': m['mentonsellionlength'] / m['stature'],
        'ipd_zyg': m['interpupillarybreadth'] / m['bizygomaticbreadth'], # eye spacing over cheek width
        'headneck_stature': m['vertexsuprasternale'] / m['stature'],     # the head and neck's height over stature
    }

RATIOS = list(ratios({k: 1.0 for k in MEASURES}).keys())
STATURE = MEASURES.index('stature')


def cond_dist(mean, cov, x):
    """A person's head and neck measures given their stature: the whitened distance from the group's conditional mean
    (the stature clamped to 2.5 sd of the group's)."""
    mean, cov, x = np.asarray(mean, float), np.asarray(cov, float), np.asarray(x, float)
    k = [i for i in range(len(mean)) if i != STATURE]
    css = cov[STATURE, STATURE]
    s = np.clip(x[STATURE], mean[STATURE] - 2.5 * np.sqrt(css), mean[STATURE] + 2.5 * np.sqrt(css))
    cks = cov[k, STATURE]
    mu = mean[k] + cks / css * (s - mean[STATURE])
    C = cov[np.ix_(k, k)] - np.outer(cks, cks) / css
    return float(np.linalg.norm(np.linalg.solve(np.linalg.cholesky(C), x[k] - mu)))


def main(male, female, out):
    groups = {}
    for path, sex in ((male, 'm'), (female, 'f')):
        rows = list(csv.DictReader(open(path, encoding='latin-1')))
        for code, race in RACES.items():
            R = [r for r in rows if r['DODRace'] == code]
            if len(R) < 30: continue
            # ANSUR II records interpupillary breadth in tenths of a millimetre, the rest in millimetres
            # (vertex to suprasternale: stature less the notch's height)
            def get(r, k):
                if k == 'vertexsuprasternale': return float(r['stature']) - float(r['suprasternaleheight'])
                return float(r[k]) / (10.0 if k == 'interpupillarybreadth' else 1.0)
            X = np.array([[get(r, k) for k in MEASURES] for r in R])
            Q = np.array([[v for v in ratios(dict(zip(MEASURES, x))).values()] for x in X])
            ages = np.array([float(r['Age']) for r in R])
            def block(A):
                return {'mean': A.mean(0).round(4).tolist(), 'sd': A.std(0).round(5).tolist(), 'p3': np.percentile(A, 3, 0).round(4).tolist(),
                        'p50': np.percentile(A, 50, 0).round(4).tolist(), 'p97': np.percentile(A, 97, 0).round(4).tolist(), 'cov': np.cov(A.T).round(6).tolist()}
            # the joint check (R3: one check per measure at the 3rd-97th percentile failed nearly half of the real people,
            # so a person is held only to the region that holds 97.5 % of them): the head and neck measures given the
            # person's stature (the group's conditional Gaussian, the stature taken within 2.5 sd of the group's as
            # Proportions.Target takes it), whitened, and the distance under which 97.5 % of the group's real people lie,
            # each held out of the mean and covariance it is measured against (the small groups' in-sample distances run short)
            D = np.array([cond_dist(np.delete(X, i, 0).mean(0), np.cov(np.delete(X, i, 0).T), X[i]) for i in range(len(X))])
            # the body's mass in the head and neck (a heavy or muscled body's thicker neck and fuller face): each measure's
            # covariance, given the stature, with the body mass index given the stature in sds (mm per sd; 0 for the stature)
            bmi = np.array([float(r['weightkg']) / 10.0 / (float(r['stature']) / 1000.0) ** 2 for r in R])
            S = X[:, STATURE]
            def resid(y): return y - np.polyval(np.polyfit(S, y, 1), S)
            b = resid(bmi); b /= b.std()
            per_bmi = [0.0 if j == STATURE else float(np.mean(resid(X[:, j]) * b)) for j in range(len(MEASURES))]
            groups[f'{race}/{sex}'] = {'n': len(R), 'age': [float(ages.min()), float(np.median(ages)), float(ages.max())], 'measures': block(X), 'ratios': block(Q),
                                       'joint': {'p975': round(float(np.percentile(D, 97.5)), 4), 'p99': round(float(np.percentile(D, 99)), 4)},
                                       'bmi': [round(v, 3) for v in per_bmi]}
    json.dump({'source': 'ANSUR II public data (US Army, 2012; public domain), www.openlab.psu.edu/ansur2', 'measures': MEASURES,
               'ratios': RATIOS, 'groups': groups}, open(out, 'w'), indent=1)
    print('groups', {g: v['n'] for g, v in groups.items()})


if __name__ == '__main__':
    out = sys.argv[3] if len(sys.argv) > 3 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ansur_stats.json')
    main(sys.argv[1], sys.argv[2], out)
