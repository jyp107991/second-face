"""The plausibility gate's 2D half (docs/PEOPLE_REALISM.md §3.2): the landmark proportions of every portrait
PeopleGateTests renders (test-results/portraits/<id>.png: 85 mm at 1.6 m, as photographs are taken), measured by the same
landmarker and ratios as FairFace's real faces (fairface_stats.py). Writes test-results/people_faces2d.json.
Usage: python faces2d.py <unity/test-results> <face_landmarker.task>   (a Python with mediapipe; see README.md)"""
import json, os, sys
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from landmarks import Landmarker, ratios


def main(results, model):
    lm = Landmarker(model)
    d = os.path.join(results, 'portraits')
    out = []
    for f in sorted(os.listdir(d)):
        if not f.endswith('.png'): continue
        r = lm(np.asarray(Image.open(os.path.join(d, f)).convert('RGB')))
        box = [round(float(v), 1) for v in (*r[0][:, :2].min(0), *r[0][:, :2].max(0))] if r else None
        out.append({'Id': f[:-4], 'ratios': ratios(r[0]) if r else None, 'pose': [round(a, 1) for a in r[1]] if r else None, 'box': box})
    json.dump(out, open(os.path.join(results, 'people_faces2d.json'), 'w'), indent=1)
    print('portraits', len(out), 'faces found', sum(1 for o in out if o['ratios']))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
