"""The plausibility gate (docs/PEOPLE_REALISM.md §3): each person the game makes held to the real people of their sex and
ancestry. 3D: their measures (PeopleGateTests -> test-results/people_measures.json) and the proportions between them
against ANSUR II (ansur_stats.json), each within the group's 3rd-97th percentile. 2D: the landmark proportions of their
portrait (faces2d.py -> test-results/people_faces2d.json) against FairFace (fairface_stats.json), each within the
group's 5th-95th percentile. Prints the failures per person and per measure and writes test-results/people_gate.json;
exits 1 if anyone fails.
Usage: python3 gate.py [unity/test-results]"""
import json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
# our peoples (Core Bodies.Clusters) to the reference groups: ANSUR II's races, FairFace's
ANSUR = {'west_african': 'black', 'east_african': 'black', 'north_european': 'white', 'mediterranean': 'white', 'latin_american': 'hispanic',
         'indigenous_american': 'hispanic', 'east_asian': 'asian', 'southeast_asian': 'asian', 'south_asian': 'asian'}
FAIRFACE = {'west_african': 'black', 'east_african': 'black', 'north_european': 'white', 'mediterranean': 'white', 'latin_american': 'latino',
            'indigenous_american': 'latino', 'east_asian': 'east_asian', 'southeast_asian': 'southeast_asian', 'south_asian': 'indian'}


def band(age):
    return '20-29' if age < 30 else '30-39' if age < 40 else '40-49' if age < 50 else '50-59' if age < 60 else '60+'


def ratios3d(m):
    sys.path.insert(0, HERE)
    from ansur_stats import ratios
    return ratios(m)


def main(results):
    A = json.load(open(os.path.join(HERE, 'ansur_stats.json')))
    F = json.load(open(os.path.join(HERE, 'fairface_stats.json')))
    people = json.load(open(os.path.join(results, 'people_measures.json')))
    heads = os.path.join(results, 'heads')
    if os.path.isdir(heads):
        # the measures by measure.py from the dumped heads (its landmark rules, checked on plots), stature from Unity
        sys.path.insert(0, HERE)
        from measure import measure
        for p in people:
            f = os.path.join(heads, p['Id'] + '.bin')
            if os.path.exists(f): p['Mm'].update({k: v for k, v in measure(f).items() if not k.startswith('_')})
    faces = {}
    p2 = os.path.join(results, 'people_faces2d.json')
    if os.path.exists(p2): faces = {f['Id']: f for f in json.load(open(p2))}
    report, fails_by = [], {}
    for p in people:
        if p['Age'] < 18: continue   # adults only: ANSUR II and the FairFace bands used are adults (children: a later gate)
        sex = p['Sex']; her = p.get('Heritage') or 'north_european'
        out = {'id': p['Id'], 'name': p['Name'], 'sex': sex, 'age': p['Age'], 'heritage': her, 'source': p['Source'], 'fails': []}
        g = A['groups'].get(f"{ANSUR.get(her, 'white')}/{sex}")
        m = p['Mm']
        if g:
            for k, v in zip(A['measures'], range(len(A['measures']))):
                lo, hi = g['measures']['p3'][v], g['measures']['p97'][v]
                x = m.get(k)
                if x is not None and not (lo <= x <= hi): out['fails'].append((f'3d.{k}', round(x, 1), round(lo, 1), round(hi, 1)))
            r = ratios3d(m)
            for v, k in enumerate(A['ratios']):
                lo, hi = g['ratios']['p3'][v], g['ratios']['p97'][v]
                if not (lo <= r[k] <= hi): out['fails'].append((f'3d.{k}', round(r[k], 3), round(lo, 3), round(hi, 3)))
            out['r3d'] = {k: round(v, 3) for k, v in r.items()}
        f2 = faces.get(p['Id'])
        if f2 and f2.get('ratios'):
            race = FAIRFACE.get(her, 'white')
            fg = F['groups'].get(f"{race}/{sex}/{band(p['Age'])}") or F['groups'].get(f'{race}/{sex}/all')
            if fg and fg['n'] >= 25: pass
            else: fg = F['groups'].get(f'{race}/{sex}/all')
            for v, k in enumerate(F['ratios']):
                lo, hi = fg['p5'][v], fg['p95'][v]
                x = f2['ratios'][k]
                if not (lo <= x <= hi): out['fails'].append((f'2d.{k}', round(x, 3), round(lo, 3), round(hi, 3)))
            out['r2d'] = {k: round(v, 3) for k, v in f2['ratios'].items()}
        elif p['Id'] in faces: out['fails'].append(('2d.face_not_found', 0, 0, 0))
        for f in out['fails']: fails_by[f[0]] = fails_by.get(f[0], 0) + 1
        report.append(out)
    passed = sum(1 for o in report if not o['fails'])
    print(f'people {len(report)}: {passed} pass, {len(report) - passed} fail')
    for k, n in sorted(fails_by.items(), key=lambda kv: -kv[1]): print(f'  {k:28s} {n:4d} fail')
    for o in report:
        if o['fails'] and o['source'].startswith('shale'):
            print(f"  {o['name'][:22]:22s} {o['sex']} {o['age']:.0f} {o['heritage']:20s} " + '; '.join(f'{k.split(".")[1]} {x} [{lo}-{hi}]' for k, x, lo, hi in o['fails']))
    json.dump({'passed': passed, 'total': len(report), 'fails_by': fails_by, 'people': report}, open(os.path.join(results, 'people_gate.json'), 'w'), indent=1)
    return 0 if passed == len(report) else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', '..', '..', '..', 'unity', 'test-results')))
