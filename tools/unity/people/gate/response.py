"""The head and neck's response to the sculptor's shapes (docs/PEOPLE_REALISM.md §4.1): from the heads PeopleGateTests
.MeasureShapeResponses dumps (each base neutral, then each slider alone at +1 and, paired, -1), each measure's change per
unit of each shape side, per base, and the whole body's height (resp_statures.json: a longer neck or head makes a taller
body, so the stature's scale must allow for it). Then refitted on the people measured for real (people_measures.json,
heads/<id>.bin): shapes combine nonlinearly (the neck most: its girth is taken under a chin the shapes move), so each
coefficient is fitted to the people as well as to its own one-slider sample (ridge towards it), which makes the model true
where the people are. A person's measures are predicted as the neutral base's plus the sum of their shapes' responses,
times their stature scale. Writes tools/unity/people/gate/response.json (read by Core Proportions through its table).
Usage: python3 response.py <unity/test-results> [--single] [--extra dir,dir]   (--single: the one-slider samples alone,
no refit; --extra: earlier rounds' people, each dir laid out as test-results)"""
import json, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from measure import measure

MEASURES = ['headbreadth', 'headlength', 'bizygomaticbreadth', 'mentonsellionlength', 'interpupillarybreadth', 'neckcircumference', 'stature',
            'tragiontopofhead', 'vertexsuprasternale']


def responses(heads):
    st = json.load(open(os.path.join(heads, 'resp_statures.json')))
    def m_of(base, tag):
        m = measure(os.path.join(heads, f'resp_{base}_{tag}.bin'))
        m['stature'] = st[f'resp_{base}_{tag}']
        return m
    out = {}
    for base in ('f', 'm'):
        neutral = m_of(base, 'neutral')
        R = {}
        for f in sorted(os.listdir(heads)):
            if not f.startswith(f'resp_{base}_') or not f.endswith('.bin') or 'neutral' in f: continue
            tag = f[len(f'resp_{base}_'):-4]
            # (a sample a later MeasureShapeResponses no longer takes is left behind, without its stature: not measured)
            if f'resp_{base}_{tag}' not in st:
                print(f'  {f}: not in resp_statures.json (left by an earlier run), skipped')
                continue
            m = m_of(base, tag)
            R[tag] = [m[k] - neutral[k] for k in MEASURES]
        out[base] = {'neutral': [neutral[k] for k in MEASURES], 'shapes': R}
    return out


def features(tags, sliders):
    """A person's shape sides as the model's inputs: each side's weight (a paired slider's low side by its size)."""
    idx = {t: i for i, t in enumerate(tags)}
    x = np.zeros(len(tags))
    for k, v in sliders.items():
        if v > 0 and f'{k}_p' in idx: x[idx[f'{k}_p']] = v
        elif v < 0 and f'{k}_n' in idx: x[idx[f'{k}_n']] = -v
    return x


PRIOR = 5.0   # each one-slider sample counts as this many people: the slopes stay near what each shape measurably does


def refit(model, base, rows):
    """The model fitted to the people (rows: their sliders and measures at the base's scale): an offset of the neutral (what
    the people share that the one-slider samples miss: their brows, lips and skin as drawn) fitted freely, and each shape's
    response held near its one-slider sample (PRIOR), so the solver cannot exploit coefficients the people's correlated
    shapes leave loose (R2: a neck model with -170 mm a unit drove every woman's neck to its thinnest)."""
    b = model[base]
    tags = sorted(b['shapes'])
    prior = np.array([b['shapes'][t] for t in tags])
    X = np.array([features(tags, s) for s, _ in rows])
    Y = np.array([y for _, y in rows]) - np.array(b['neutral'])
    one = np.ones((len(X), 1))
    w = np.sqrt(PRIOR)
    A = np.vstack([np.hstack([one, X]), np.hstack([np.zeros((len(tags), 1)), w * np.eye(len(tags))])])
    B = np.vstack([Y, w * prior])
    C = np.linalg.lstsq(A, B, rcond=None)[0]
    b['neutral'] = (np.array(b['neutral']) + C[0]).round(4).tolist()
    b['shapes'] = {t: C[i + 1].round(4).tolist() for i, t in enumerate(tags)}


def predict(model, sex, sliders, scale):
    b = model[sex]
    m = np.array(b['neutral'], float)
    for k, v in sliders.items():
        if v > 0 and f'{k}_p' in b['shapes']: m += v * np.array(b['shapes'][f'{k}_p'])
        elif v < 0 and f'{k}_n' in b['shapes']: m += -v * np.array(b['shapes'][f'{k}_n'])
    return m * scale


def main(results, single=False, extra=()):
    extra = list(extra)
    model = responses(os.path.join(results, 'heads'))
    model['measures'] = MEASURES
    people = []
    for d in [results] + extra:
        for p in json.load(open(os.path.join(d, 'people_measures.json'))):
            f = os.path.join(d, 'heads', p['Id'] + '.bin')
            if p['Age'] < 18 or not p.get('Sliders') or not os.path.exists(f): continue
            m = measure(f)
            m['stature'] = p['Mm']['stature']
            people.append((p, np.array([m[k] for k in MEASURES])))

    def report(label):
        E = np.array([predict(model, p['Sex'], p['Sliders'], p['Scale']) - a for p, a in people])
        print(label, 'people', len(E))
        for i, k in enumerate(MEASURES):
            print(f'  {k:24s} mean err {E[:, i].mean():6.1f} mm  rms {np.sqrt((E[:, i] ** 2).mean()):5.1f}  p95 |err| {np.percentile(np.abs(E[:, i]), 95):5.1f}')
    if people: report('one-slider model:')
    if people and not single:
        for base in ('f', 'm'):
            refit(model, base, [(p['Sliders'], a / p['Scale']) for p, a in people if p['Sex'] == base])
        report('refitted on the people (in sample):')
    json.dump(model, open(os.path.join(HERE, 'response.json'), 'w'), indent=1)
    # the shapes that move each measure most (mm at full weight)
    for base in ('f', 'm'):
        print('base', base, 'neutral', [round(x) for x in model[base]['neutral']])
        for i, k in enumerate(MEASURES):
            top = sorted(model[base]['shapes'].items(), key=lambda kv: -abs(kv[1][i]))[:6]
            print(f'   {k:22s} ' + ', '.join(f'{t} {v[i]:+.1f}' for t, v in top))


def extras(argv):
    """Earlier rounds' people (--extra dir,dir: each laid out as test-results is), so the refit learns from every round."""
    return argv[argv.index('--extra') + 1].split(',') if '--extra' in argv else []


if __name__ == '__main__':
    main(sys.argv[1], '--single' in sys.argv, extras(sys.argv))
