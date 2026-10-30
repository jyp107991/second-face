"""How old and which sex the people look, by two networks trained on real photographs (Levi & Hassner's age and gender
networks on Adience, from the ONNX model zoo: age_googlenet.onnx, gender_googlenet.onnx), read the same way on FairFace's
real frontal adults (the gate's faces, fairface_stats.json's boxes) and on our portraits, so ours are compared with real
people read by the same instrument, never with the label itself (docs/PEOPLE_REALISM.md §10, §12). A diagnostic, not a
gate: the instrument is crude (it reads real people young and a third of real women as men), so only the gap between real
and ours means anything.
Usage: python3 -I apparent.py <models dir> <FairFace validation.parquet> <unity/test-results> [--pad 0.05]
(run with the gate's venv: onnxruntime, pyarrow, Pillow)"""
import io, json, os, sys
import numpy as np
from PIL import Image
import onnxruntime as ort
import pyarrow.parquet as pq

HERE = os.path.dirname(os.path.abspath(__file__))
MIDS = np.array([1, 5, 10, 17.5, 28.5, 40.5, 50.5, 70.0])          # the age network's eight bands
BAND = {3: 25, 4: 35, 5: 45, 6: 55, 7: 65, 8: 75}                   # FairFace's age classes from 20-29


def crop(img, box, pad):
    x0, y0, x1, y1 = box; s = max(x1 - x0, y1 - y0) * (1 + pad); cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    img = img.convert('RGB').crop((int(cx - s / 2), int(cy - s / 2), int(cx + s / 2), int(cy + s / 2)))
    a = np.asarray(img.resize((224, 224)), np.float32)[:, :, ::-1] - np.array([104, 117, 123], np.float32)
    return a.transpose(2, 0, 1)[None].copy()


def main(models, parquet, results, pad):
    age = ort.InferenceSession(os.path.join(models, 'age_googlenet.onnx'))
    sex = ort.InferenceSession(os.path.join(models, 'gender_googlenet.onnx'))
    read = lambda x: (float(age.run(None, {'input': x})[0][0] @ MIDS), float(sex.run(None, {'input': x})[0][0][1]))
    F = json.load(open(os.path.join(HERE, 'fairface_stats.json')))
    t = pq.read_table(parquet, columns=['image', 'age', 'gender'])
    ages, gens, imgs = t.column('age').to_pylist(), t.column('gender').to_pylist(), t.column('image')
    real = []
    for k in F['boxes']:
        i = int(k)
        if ages[i] < 3: continue
        a, pf = read(crop(Image.open(io.BytesIO(imgs[i].as_py()['bytes'])), F['boxes'][k], pad))
        real.append((BAND[ages[i]], 'f' if gens[i] == 1 else 'm', a, pf))
    faces = {f['Id']: f for f in json.load(open(os.path.join(results, 'people_faces2d.json')))}
    ours = []
    for p in json.load(open(os.path.join(results, 'people_measures.json'))):
        f = faces.get(p['Id'])
        if p['Age'] < 18 or not f or not f.get('box'): continue
        a, pf = read(crop(Image.open(os.path.join(results, 'portraits_look', p['Id'] + '.png')), f['box'], pad))
        ours.append((p['Age'], p['Sex'], a, pf, p['Id']))
    print(f'apparent age (crop pad {pad}), real FairFace against ours:')
    for lo, hi in ((18, 30), (30, 45), (45, 58), (58, 100)):
        r = [a for b, s, a, _ in real if lo <= b < hi]; o = [a for b, s, a, _, _ in ours if lo <= b < hi]
        print(f'  {lo}-{hi}: real {np.mean(r):.1f} (n {len(r)})  ours {np.mean(o):.1f} (n {len(o)})')
    print('read as the other sex (P(own sex) < 0.5):')
    for s in 'fm':
        own = lambda pf: pf if s == 'f' else 1 - pf
        r = [own(pf) for _, x, _, pf in real if x == s]; o = [own(pf) for _, x, _, pf, _ in ours if x == s]
        print(f'  {"women" if s == "f" else "men"}: real {np.mean(np.array(r) < 0.5):.0%} (n {len(r)})  ours {np.mean(np.array(o) < 0.5):.0%} (n {len(o)})')


if __name__ == '__main__':
    pad = float(sys.argv[sys.argv.index('--pad') + 1]) if '--pad' in sys.argv else 0.05
    main(sys.argv[1], sys.argv[2], sys.argv[3], pad)
