"""The cast's bodies (P4.11): shape, build, legs and torso, and a stature each, solved into the height macro.
usage: python3 -I design.py <mh data> <mh_build.py> <cast.json> [write]"""
import json, sys
sys.argv = [sys.argv[0], sys.argv[1], sys.argv[2], None] + sys.argv[3:]
import importlib.util
import os
spec = importlib.util.spec_from_file_location('measure', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'measure.py'))
M = importlib.util.module_from_spec(spec); spec.loader.exec_module(M)
CAST, WRITE = sys.argv[4], len(sys.argv) > 5 and sys.argv[5] == 'write'
# id: (shape, weight, muscle, stature cm, legs, torso)
D = {
 'cast_sal_01': (('trapezoid', 0.6), 0.30, 0.72, 176, 0, 0),
 'cast_sal_02': (('column', 0.6), 0.20, 0.50, 163, 0, 0),
 'cast_sal_03': (('column', 0.7), 0.12, 0.60, 178, 0.3, 0),
 'cast_sal_04': (('rectangle', 0.7), 0.38, 0.55, 168, 0, 0),
 'cast_sal_05': (('column', 0.6), 0.10, 0.30, 167, 0, 0),
 'cast_sal_06': (('wedge', 0.6), 0.20, 0.60, 170, 0.3, 0),
 'cast_rail_01': (('wedge', 0.7), 0.38, 0.80, 184, 0, 0),
 'cast_rail_02': (('rectangle', 0.6), 0.35, 0.60, 165, 0, 0),
 'cast_rail_03': (('apple', 0.7), 0.62, 0.35, 170, 0, 0),
 'cast_gls_01': (('pear', 0.7), 0.25, 0.40, 158, 0, 0),
 'cast_gls_02': (('column', 0.8), 0.12, 0.50, 186, 0.4, 0),
 'cast_gls_03': (('rectangle', 0.5), 0.15, 0.28, 163, 0, -0.2),
 'cast_shr_01': (('rectangle', 0.7), 0.45, 0.65, 172, -0.3, 0),
 'cast_shr_02': (('full', 0.6), 0.45, 0.40, 161, 0, 0),
 'cast_shr_03': (('column', 0.7), 0.08, 0.40, 167, 0.5, 0),
 'cast_wet_01': (('trapezoid', 0.8), 0.45, 0.85, 189, 0, 0),
 'cast_wet_02': (('diamond', 0.5), 0.45, 0.55, 160, 0, 0),
 'cast_wet_03': (('wedge', 0.6), 0.25, 0.65, 174, 0, 0),
 'cast_tth_01': (('rectangle', 0.7), 0.40, 0.80, 162, -0.5, 0),
 'cast_tth_02': (('hourglass', 0.6), 0.22, 0.45, 164, 0, 0),
 'cast_ash_01': (('column', 0.8), 0.05, 0.45, 177, 0, 0),
 'cast_ash_02': (('column', 0.8), 0.08, 0.40, 157, 0, 0),
 'cast_toll_01': (('trapezoid', 0.6), 0.40, 0.75, 181, 0, 0),
 'cast_toll_02': (('pear', 0.7), 0.55, 0.30, 162, 0, 0),
 'cast_chr_01': (('rectangle', 0.5), 0.20, 0.35, 159, 0, 0),
 'cast_chr_02': (('pear', 0.5), 0.35, 0.30, 171, 0, 0),
 'cast_mnd_01': (('apple', 0.6), 0.45, 0.35, 155, 0, 0.2),
 'cast_mer_01': (('wedge', 0.7), 0.28, 0.65, 176, 0, 0),
 'cast_mer_02': (('column', 0.6), 0.10, 0.45, 166, 0, 0),
 'cast_mer_03': (('column', 0.6), 0.12, 0.40, 151, 0, 0),
 'cast_mer_04': (('apple', 0.8), 0.75, 0.30, 178, 0, 0),
 'cast_whl_01': (('wedge', 0.5), 0.18, 0.60, 175, 0.2, 0),
}

def solve(p, stature):
    lo, hi = 0.0, 1.0
    for _ in range(14):
        mid = (lo + hi) / 2
        st = M.measure(M.shape(M.full_spec({**p, 'height': mid})))['stature']
        if st < stature: lo = mid
        else: hi = mid
    return round((lo + hi) / 2, 3)

def apply(p, d):
    (shape, w), weight, muscle, stature, legs, torso = d
    q = dict(p)
    q.update(shape=[shape, w], weight=weight, muscle=muscle)
    q.pop('legs', None); q.pop('torso', None)
    if legs: q['legs'] = legs
    if torso: q['torso'] = torso
    if q['gender'] < 0.5 and 'breastSize' in q:
        q['breastSize'] = round(min(0.75, max(0.25, q['breastSize'] + (weight - 0.3) * 0.5)), 2)
    q['height'] = solve(q, stature)
    return q

if __name__ == '__main__':
    cast = json.load(open(CAST))
    rows = []
    for i, p in enumerate(cast['people']):
        if p['id'] not in D: continue
        q = apply(p, D[p['id']])
        r = M.measure(M.shape(M.full_spec(q)))
        before = M.measure(M.shape(M.full_spec({**p, 'raw': 1})))
        rows.append((p['id'], 'm' if q['gender'] >= 0.5 else 'f', r, before, q))
        cast['people'][i] = q
    for pid, sex, r, b, q in rows:
        print(f"{pid:14s} {sex} {q['shape'][0]:9s} st {b['stature']:5.1f}->{r['stature']:5.1f}  s/h {b['shoulder']/b['hip']:.2f}->{r['shoulder']/r['hip']:.2f}  "
              f"w/h {b['waist']/b['hip']:.2f}->{r['waist']/r['hip']:.2f}  hips {b['hip']:4.1f}->{r['hip']:4.1f}  h={q['height']} wt={q['weight']} mu={q['muscle']}")
    import statistics as st
    for sex in 'mf':
        rs = [r for _, s, r, _, _ in rows if s == sex]
        print(sex, 'stature mean', round(st.mean(x['stature'] for x in rs), 1), 'sd', round(st.pstdev(x['stature'] for x in rs), 1),
              ' s/h mean', round(st.mean(x['shoulder'] / x['hip'] for x in rs), 2), ' hips mean', round(st.mean(x['hip'] for x in rs), 1))
    if WRITE:
        # edit the brief's own lines (its compact layout kept): the body numbers after the id, the shape after them
        import re
        text = open(CAST).read()
        for pid, sex, r, b, q in rows:
            start = text.index(f'"id": "{pid}"')
            end = text.find('{"id": "', start + 10)
            end = len(text) if end < 0 else end
            block = text[start:end]
            extra = f', "shape": ["{q["shape"][0]}", {q["shape"][1]}]'
            if q.get('legs'): extra += f', "legs": {q["legs"]}'
            if q.get('torso'): extra += f', "torso": {q["torso"]}'
            block = re.sub(r'"muscle": [0-9.]+, "weight": [0-9.]+, "height": [0-9.]+',
                           f'"muscle": {q["muscle"]}, "weight": {q["weight"]}, "height": {q["height"]}{extra}', block, count=1)
            if 'breastSize' in q:
                block = re.sub(r'"breastSize": [0-9.]+', f'"breastSize": {q["breastSize"]}', block, count=1)
            text = text[:start] + block + text[end:]
        open(CAST, 'w').write(text)
        json.loads(text)
        print('written', CAST)
