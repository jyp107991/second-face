"""Real head, face and neck measures per sex and race from ANSUR II (US Army anthropometric survey 2012, public domain;
https://www.openlab.psu.edu/ansur2/): for each group the count, mean, sd, 3rd / 50th / 97th percentiles and covariance
of the measures the gate uses, and of their ratios. Writes tools/unity/people/gate/ansur_stats.json.
Usage: python3 ansur_stats.py <ANSUR_II_MALE_Public.csv> <ANSUR_II_FEMALE_Public.csv> [out.json]"""
import csv, json, math, os, sys
import numpy as np

MEASURES = ['headbreadth', 'headlength', 'bizygomaticbreadth', 'mentonsellionlength', 'interpupillarybreadth', 'neckcircumference', 'stature']
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
    }

RATIOS = list(ratios({k: 1.0 for k in MEASURES}).keys())


def main(male, female, out):
    groups = {}
    for path, sex in ((male, 'm'), (female, 'f')):
        rows = list(csv.DictReader(open(path, encoding='latin-1')))
        for code, race in RACES.items():
            R = [r for r in rows if r['DODRace'] == code]
            if len(R) < 30: continue
            # ANSUR II records interpupillary breadth in tenths of a millimetre, the rest in millimetres
            X = np.array([[float(r[k]) / (10.0 if k == 'interpupillarybreadth' else 1.0) for k in MEASURES] for r in R])
            Q = np.array([[v for v in ratios(dict(zip(MEASURES, x))).values()] for x in X])
            ages = np.array([float(r['Age']) for r in R])
            def block(A):
                return {'mean': A.mean(0).round(4).tolist(), 'sd': A.std(0).round(5).tolist(), 'p3': np.percentile(A, 3, 0).round(4).tolist(),
                        'p50': np.percentile(A, 50, 0).round(4).tolist(), 'p97': np.percentile(A, 97, 0).round(4).tolist(), 'cov': np.cov(A.T).round(6).tolist()}
            groups[f'{race}/{sex}'] = {'n': len(R), 'age': [float(ages.min()), float(np.median(ages)), float(ages.max())], 'measures': block(X), 'ratios': block(Q)}
    json.dump({'source': 'ANSUR II public data (US Army, 2012; public domain), www.openlab.psu.edu/ansur2', 'measures': MEASURES,
               'ratios': RATIOS, 'groups': groups}, open(out, 'w'), indent=1)
    print('groups', {g: v['n'] for g, v in groups.items()})


if __name__ == '__main__':
    out = sys.argv[3] if len(sys.argv) > 3 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ansur_stats.json')
    main(sys.argv[1], sys.argv[2], out)
