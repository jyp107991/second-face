"""Every frontal adult face of FairFace's validation split (Kärkkäinen and Joo 2021, CC BY 4.0) as a whole shape
(shapes.py) with its race, sex, age band, ratios, lip gap and box: the real faces our people are drawn from and held to
(R3, docs/PEOPLE_REALISM.md §4.2). Writes tools/unity/people/gate/fairface_shapes.json.
Usage: python fairface_shapes.py <validation.parquet> <face_landmarker.task>   (the gate's venv)"""
import io, json, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from landmarks import Landmarker, ratios, frontal
from shapes import shape

SEXES = ['m', 'f']
RACES = ['east_asian', 'indian', 'black', 'white', 'middle_eastern', 'latino', 'southeast_asian']


def main(parquet, model):
    import pyarrow.parquet as pq
    t = pq.read_table(parquet, columns=['image', 'age', 'gender', 'race'])
    ages, gens, races, imgs = (t.column(c).to_pylist() for c in ('age', 'gender', 'race')), None, None, t.column('image')
    ages, gens, races = t.column('age').to_pylist(), t.column('gender').to_pylist(), t.column('race').to_pylist()
    lm = Landmarker(model)
    faces = []
    for i in range(t.num_rows):
        if ages[i] < 3: continue
        r = lm(np.asarray(Image.open(io.BytesIO(imgs[i].as_py()['bytes'])).convert('RGB')))
        if r is None or not frontal(r[1]): continue
        P = r[0]
        gap = float(np.linalg.norm(P[13][:2] - P[14][:2]) / np.linalg.norm(P[168][:2] - P[152][:2]))
        x0, y0 = P[:, :2].min(0); x1, y1 = P[:, :2].max(0)
        faces.append({'i': i, 'race': RACES[races[i]], 'sex': SEXES[gens[i]], 'age': ages[i], 'gap': round(gap, 4),
                      'shape': shape(P).round(5).tolist(), 'r': {k: round(v, 5) for k, v in ratios(P).items()},
                      'box': [round(float(v), 1) for v in (x0, y0, x1, y1)]})
        if len(faces) % 500 == 0: print(len(faces), 'frontal of', i + 1, flush=True)
    json.dump({'source': 'FairFace validation (CC BY 4.0); MediaPipe Face Landmarker; frontal |yaw|<=8, |pitch|<=10, |roll|<=10',
               'faces': faces}, open(os.path.join(HERE, 'fairface_shapes.json'), 'w'))
    print('frontal adult faces', len(faces))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
