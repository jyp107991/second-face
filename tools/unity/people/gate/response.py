"""The head and neck's response to the sculptor's shapes (docs/PEOPLE_REALISM.md §4.1): from the heads PeopleGateTests
.MeasureShapeResponses dumps (each base neutral, then each slider alone at +1 and, paired, -1), each measure's change per
unit of each shape side, per base. A person's measures are then predicted as the neutral base's plus the sum of their
shapes' responses, times their stature scale; checked against the people measured for real (people_measures.json).
Writes tools/unity/people/gate/response.json (read by Core Proportions through its generated table).
Usage: python3 response.py <unity/test-results>"""
import json, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from measure import measure

MEASURES = ['headbreadth', 'headlength', 'bizygomaticbreadth', 'mentonsellionlength', 'interpupillarybreadth', 'neckcircumference']


def responses(heads):
    out = {}
    for base in ('f', 'm'):
        neutral = measure(os.path.join(heads, f'resp_{base}_neutral.bin'))
        R = {}
        for f in sorted(os.listdir(heads)):
            if not f.startswith(f'resp_{base}_') or 'neutral' in f: continue
            tag = f[len(f'resp_{base}_'):-4]
            m = measure(os.path.join(heads, f))
            R[tag] = [m[k] - neutral[k] for k in MEASURES]
        out[base] = {'neutral': [neutral[k] for k in MEASURES], 'shapes': R}
    return out


def predict(model, sex, sliders, scale):
    b = model[sex]
    m = np.array(b['neutral'], float)
    for k, v in sliders.items():
        if v > 0 and f'{k}_p' in b['shapes']: m += v * np.array(b['shapes'][f'{k}_p'])
        elif v < 0 and f'{k}_n' in b['shapes']: m += -v * np.array(b['shapes'][f'{k}_n'])
    return m * scale


def main(results):
    model = responses(os.path.join(results, 'heads'))
    model['measures'] = MEASURES
    json.dump(model, open(os.path.join(HERE, 'response.json'), 'w'), indent=1)
    people = json.load(open(os.path.join(results, 'people_measures.json')))
    err = []
    for p in people:
        if p['Age'] < 18 or not p.get('Sliders'): continue
        actual = measure(os.path.join(results, 'heads', p['Id'] + '.bin'))
        pred = predict(model, p['Sex'], p['Sliders'], p['Scale'])
        err.append([pred[i] - actual[k] for i, k in enumerate(MEASURES)])
    E = np.array(err)
    print('people', len(E))
    for i, k in enumerate(MEASURES):
        print(f'  {k:24s} mean err {E[:, i].mean():6.1f} mm  rms {np.sqrt((E[:, i] ** 2).mean()):5.1f}  p95 |err| {np.percentile(np.abs(E[:, i]), 95):5.1f}')
    # the shapes that move each measure most (mm at full weight)
    for base in ('f', 'm'):
        print('base', base, 'neutral', [round(x) for x in model[base]['neutral']])
        for i, k in enumerate(MEASURES):
            top = sorted(model[base]['shapes'].items(), key=lambda kv: -abs(kv[1][i]))[:6]
            print(f'   {k:22s} ' + ', '.join(f'{t} {v[i]:+.1f}' for t, v in top))


if __name__ == '__main__':
    main(sys.argv[1])
