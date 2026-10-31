"""How old and which sex the people look, by two networks trained on real photographs (Levi & Hassner's age and gender
networks on Adience, from the ONNX model zoo: age_googlenet.onnx, gender_googlenet.onnx), read the same way on FairFace's
real frontal adults (the gate's faces, fairface_stats.json's boxes) and on our portraits, so ours are compared with real
people read by the same instrument, never with the label itself (docs/PEOPLE_REALISM.md §10, §12). The instrument is
crude (it reads real people young and a third of real women as men), so only the gap between real and ours means
anything: the gate's age rule (gate.py) holds a person's reading to the spread of real people's readings of their age
class; the sex reading stays a diagnostic.
Usage: python3 -I apparent.py <models dir> <FairFace validation.parquet> <unity/test-results> [--pad 0.6] [--no-frame]
(writes test-results/people_apparent.json for the gate's age rule; pad 0.6 frames the head as a portrait is seen; ours are
framed as FairFace's photographs frame their faces, black past their edges, as the crop shows the real ones)
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


def frame_of(boxes, size=224):
    """Where FairFace's photographs end round each face: the image's edges in units of the face's box side from its centre
    (the median over the real faces; every one is 224 px). The crop reaches past them, and the network sees a real face
    framed in black there."""
    f = []
    for x0, y0, x1, y1 in boxes:
        s = max(x1 - x0, y1 - y0); cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        f.append(((0 - cx) / s, (0 - cy) / s, (size - cx) / s, (size - cy) / s))
    return np.median(np.array(f), axis=0)


def framed(img, box, frame):
    """Our portrait as a photograph of FairFace's frames it: black past the frame's edges round the face (R4d: read
    through the 0.6 crop, real faces had black borders and ours the studio, its clothes and hats; ours read 15 years young
    at 60 for it, and women as men twice as often)."""
    x0, y0, x1, y1 = box; s = max(x1 - x0, y1 - y0); cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    img = img.convert('RGB')
    keep = tuple(int(round(v)) for v in (cx + frame[0] * s, cy + frame[1] * s, cx + frame[2] * s, cy + frame[3] * s))
    out = Image.new('RGB', img.size, (0, 0, 0))
    out.paste(img.crop(keep), keep[:2])
    return out


def main(models, parquet, results, pad, frame=True):
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
        real.append((BAND[ages[i]], 'f' if gens[i] == 1 else 'm', a, pf, i))
    faces = {f['Id']: f for f in json.load(open(os.path.join(results, 'people_faces2d.json')))}
    fr = frame_of(F['boxes'].values())
    print(f"the photographs' frame round a face (box sides from its centre): {', '.join(f'{v:+.2f}' for v in fr)}"
          + ('' if frame else ' (not applied: --no-frame)'))
    ours = []
    for p in json.load(open(os.path.join(results, 'people_measures.json'))):
        f = faces.get(p['Id'])
        if p['Age'] < 18 or not f or not f.get('box'): continue
        im = Image.open(os.path.join(results, 'portraits_look', p['Id'] + '.png'))
        if frame: im = framed(im, f['box'], fr)
        a, pf = read(crop(im, f['box'], pad))
        ours.append((p['Age'], p['Sex'], a, pf, p['Id']))
    print(f'apparent age (crop pad {pad}), real FairFace against ours:')
    for lo, hi in ((18, 30), (30, 45), (45, 58), (58, 100)):
        r = [a for b, s, a, *_ in real if lo <= b < hi]; o = [a for b, s, a, _, _ in ours if lo <= b < hi]
        print(f'  {lo}-{hi}: real {np.mean(r):.1f} (n {len(r)})  ours {np.mean(o):.1f} (n {len(o)})')
    # for the gate's age rule (gate.py): each person's apparent age, and each real face's (FairFace index: its age class
    # by the band's middle, its apparent age), from which the gate takes each class's spread
    json.dump({'pad': pad, 'people': {i: a for _, _, a, _, i in ours},
               'faces': {str(i): [b, round(a, 2)] for b, _, a, _, i in real}},
              open(os.path.join(results, 'people_apparent.json'), 'w'), indent=1)
    print('read as the other sex (P(own sex) < 0.5):')
    for s in 'fm':
        own = lambda pf: pf if s == 'f' else 1 - pf
        r = [own(pf) for _, x, _, pf, _ in real if x == s]; o = [own(pf) for _, x, _, pf, _ in ours if x == s]
        print(f'  {"women" if s == "f" else "men"}: real {np.mean(np.array(r) < 0.5):.0%} (n {len(r)})  ours {np.mean(np.array(o) < 0.5):.0%} (n {len(o)})')
    # a diagnostic, not the gate's: the photograph's own frame (no border on either), where the network reads the skin's fine
    # detail; at the gate's crop the face is small and it reads the head's coarse shape, the soft tissue and the hair (R4d:
    # ours read their years here and young there)
    fine = lambda im, box: read(crop(im, box, float(fr[2] - fr[0]) - 1.0))
    rt = [(BAND[ages[int(k)]], fine(Image.open(io.BytesIO(imgs[int(k)].as_py()['bytes'])), F['boxes'][k])[0])
          for k in F['boxes'] if ages[int(k)] >= 3]
    ot = []
    for p in json.load(open(os.path.join(results, 'people_measures.json'))):
        f = faces.get(p['Id'])
        if p['Age'] < 18 or not f or not f.get('box'): continue
        ot.append((p['Age'], fine(Image.open(os.path.join(results, 'portraits_look', p['Id'] + '.png')), f['box'])[0]))
    print("apparent age in the photograph's own frame (the skin's detail; a diagnostic):")
    for lo, hi in ((18, 30), (30, 45), (45, 58), (58, 100)):
        print(f'  {lo}-{hi}: real {np.mean([a for b, a in rt if lo <= b < hi]):.1f}  ours {np.mean([a for b, a in ot if lo <= b < hi]):.1f}')


if __name__ == '__main__':
    pad = float(sys.argv[sys.argv.index('--pad') + 1]) if '--pad' in sys.argv else 0.6
    main(sys.argv[1], sys.argv[2], sys.argv[3], pad, '--no-frame' not in sys.argv)
