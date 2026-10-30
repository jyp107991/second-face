"""The face's landmark proportions' response to the sculptor's shapes (docs/PEOPLE_REALISM.md §4.2): from the portraits
PeopleGateTests.MeasureShapeResponses renders (each base neutral, then each slider alone at +1 and, paired, -1) as
faces2d.py measured them, each ratio's change per unit of each shape side, per base. A person's ratios are then predicted
as the neutral base's plus the sum of their shapes' responses; then refitted on the people rendered for real
(people_faces2d.json, people_measures.json), each coefficient fitted to the people and to its one-slider sample (as
response.py does, for the same reason: shapes combine nonlinearly). Writes tools/unity/people/gate/response2d.json (read by
Core Proportions through its generated table).
Usage: python3 response2d.py <unity/test-results> [--single] [--extra dir,dir]"""
import json, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from response import features, refit, extras


def main(results, single=False, extra=()):
    F = json.load(open(os.path.join(HERE, 'fairface_stats.json')))
    names = F['ratios']
    faces = {f['Id']: f for f in json.load(open(os.path.join(results, 'people_faces2d.json')))}
    model = {'ratios': names}
    for base in ('f', 'm'):
        n0 = faces.get(f'resp_{base}_neutral')
        if not n0 or not n0['ratios']: raise SystemExit(f'no neutral portrait for base {base}')
        neutral = np.array([n0['ratios'][k] for k in names])
        shapes, lost = {}, []
        for fid, f in faces.items():
            if not fid.startswith(f'resp_{base}_') or fid.endswith('_neutral'): continue
            tag = fid[len(f'resp_{base}_'):]
            if not f['ratios'] or not f['pose'] or max(abs(a) for a in f['pose'][:2]) > 12: lost.append(tag); continue
            shapes[tag] = (np.array([f['ratios'][k] for k in names]) - neutral).round(5).tolist()
        model[base] = {'neutral': neutral.round(5).tolist(), 'shapes': shapes}
        print(f'base {base}: {len(shapes)} shapes, landmarks lost on {len(lost)}: {", ".join(sorted(lost)[:12])}')
        for i, k in enumerate(names):
            top = sorted(shapes.items(), key=lambda kv: -abs(kv[1][i]))[:5]
            print(f'   {k:12s} {neutral[i]:.3f}  ' + ', '.join(f'{t} {v[i]:+.3f}' for t, v in top))
    # the model against the people rendered for real, then refitted on them
    people = []
    for d in [results] + list(extra):
        pm = os.path.join(d, 'people_measures.json')
        if not os.path.exists(pm): continue
        fd = faces if d == results else {f['Id']: f for f in json.load(open(os.path.join(d, 'people_faces2d.json')))}
        for p in json.load(open(pm)):
            f = fd.get(p['Id'])
            if p['Age'] < 18 or not p.get('Sliders') or not f or not f['ratios']: continue
            people.append((p, np.array([f['ratios'][k] for k in names])))
    sd = np.sqrt(np.diag(np.array(F['groups']['white/m/all']['cov'])))

    def report(label):
        E = []
        for p, a in people:
            b = model[p['Sex']]
            E.append(np.array(b['neutral']) + features(sorted(b['shapes']), p['Sliders']) @ np.array([b['shapes'][t] for t in sorted(b['shapes'])]) - a)
        E = np.array(E)
        print(label, 'people', len(E))
        for i, k in enumerate(names):
            print(f'  {k:12s} mean err {E[:, i].mean():+.4f}  rms {np.sqrt((E[:, i] ** 2).mean()):.4f}  ({np.sqrt((E[:, i] ** 2).mean()) / sd[i]:.2f} of a real sd)')
    if people:
        report('one-slider model:')
        if not single:
            for base in ('f', 'm'):
                refit(model, base, [(p['Sliders'], a) for p, a in people if p['Sex'] == base])
            report('refitted on the people (in sample):')
    json.dump(model, open(os.path.join(HERE, 'response2d.json'), 'w'), indent=1)


if __name__ == '__main__':
    main(sys.argv[1], '--single' in sys.argv, extras(sys.argv))
