"""The real faces' proportions per group (the plausibility gate, docs/PEOPLE_REALISM.md §2-3): every frontal face of
FairFace's validation split (Kärkkäinen and Joo 2021, CC BY 4.0) measured by landmarks.py, then per race x sex x age
band: the count, mean, 5th / 50th / 95th percentiles and covariance of each ratio, and the ids of the faces nearest the
group's median (the reference boards). Writes tools/unity/people/gate/fairface_stats.json.
Usage: python fairface_stats.py <validation.parquet> <face_landmarker.task> [out.json]"""
import io, json, os, sys
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from landmarks import Landmarker, ratios, frontal, RATIOS

AGES = ['0-2', '3-9', '10-19', '20-29', '30-39', '40-49', '50-59', '60-69', '70+']
SEXES = ['m', 'f']
RACES = ['east_asian', 'indian', 'black', 'white', 'middle_eastern', 'latino', 'southeast_asian']
BANDS = {'20-29': (3,), '30-39': (4,), '40-49': (5,), '50-59': (6,), '60+': (7, 8)}


def main(parquet, model, out):
    import pyarrow.parquet as pq
    t = pq.read_table(parquet)
    cols = t.to_pydict()
    lm = Landmarker(model)
    faces = []
    for i in range(t.num_rows):
        if cols['age'][i] < 3: continue   # adults only
        rgb = np.asarray(Image.open(io.BytesIO(cols['image'][i]['bytes'])).convert('RGB'))
        r = lm(rgb)
        if r is None: continue
        P, ang = r
        if not frontal(ang): continue
        r = ratios(P)
        gap = float(np.linalg.norm(P[13][:2] - P[14][:2]) / np.linalg.norm(P[168][:2] - P[152][:2]))   # lips apart over face height
        x0, y0 = P[:, :2].min(0); x1, y1 = P[:, :2].max(0)
        faces.append({'i': i, 'race': RACES[cols['race'][i]], 'sex': SEXES[cols['gender'][i]], 'age': cols['age'][i],
                      'r': r, 'gap': round(gap, 4), 'box': [round(float(v), 1) for v in (x0, y0, x1, y1)], 'pose': [round(a, 1) for a in ang]})
        if len(faces) % 500 == 0: print(len(faces), 'frontal of', i + 1, flush=True)
    groups = {}
    def stats(fs):
        X = np.array([[f['r'][k] for k in RATIOS] for f in fs])
        med = np.median(X, 0)
        sd = X.std(0) + 1e-9
        # the board: neutral faces (lips together, no broad smile) nearest the group's median proportions
        neutral = np.array([f['gap'] < 0.02 and f['r']['mouth_face'] <= med[RATIOS.index('mouth_face')] for f in fs])
        d2 = (((X - med) / sd) ** 2).sum(1) + np.where(neutral, 0, 1e6)
        near = np.argsort(d2)[:16]
        return {'n': len(fs), 'mean': X.mean(0).round(4).tolist(), 'p5': np.percentile(X, 5, 0).round(4).tolist(),
                'p50': med.round(4).tolist(), 'p95': np.percentile(X, 95, 0).round(4).tolist(),
                'cov': np.cov(X.T).round(6).tolist(), 'board': [int(fs[j]['i']) for j in near]}
    for race in RACES:
        for sex in SEXES:
            fs = [f for f in faces if f['race'] == race and f['sex'] == sex]
            if len(fs) >= 12: groups[f'{race}/{sex}/all'] = stats(fs)
            for band, ages in BANDS.items():
                fb = [f for f in fs if f['age'] in ages]
                if len(fb) >= 12: groups[f'{race}/{sex}/{band}'] = stats(fb)
    json.dump({'source': 'FairFace validation (0.25 padding), CC BY 4.0; MediaPipe Face Landmarker; frontal |yaw|<=8, |pitch|<=10',
               'ratios': RATIOS, 'groups': groups,
               'boxes': {str(f['i']): f['box'] for f in faces}}, open(out, 'w'), indent=1)
    print('frontal adult faces', len(faces), 'groups', len(groups))


if __name__ == '__main__':
    out = sys.argv[3] if len(sys.argv) > 3 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fairface_stats.json')
    main(sys.argv[1], sys.argv[2], out)
