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


def distinct(report, A, F, people):
    """No two people of one place alike (docs/PEOPLE_REALISM.md §3: closer in face and head shape than real people of a
    group that size come): each adult's measures and face proportions whitened by their own group's covariance (ANSUR
    II, FairFace), so a real group's are standard normal; a pair of one sex and one people from one place closer than the
    5th percentile of the nearest pair among as many real people (simulated) fails, both of them."""
    import numpy as np
    by = {p['Id']: p for p in people}
    rng = np.random.default_rng(0)
    groups = {}
    for o in report:
        if not o.get('r2d') or 'r3d' not in o: continue
        place = o['source'].split('_')[0]
        if place == 'sample': continue
        # (people of one sex and one people: who could pass for each other; skin, hair and features tell the rest apart)
        groups.setdefault((place, o['sex'], o['heritage']), []).append(o)
    def white(mean, cov, x):
        L = np.linalg.cholesky(np.array(cov) + 1e-9 * np.eye(len(mean)))
        return np.linalg.solve(L, np.array(x) - np.array(mean))
    for (place, sex, _), os_ in groups.items():
        if len(os_) < 2: continue
        Z = []
        for o in os_:
            g = A['groups'][f"{ANSUR.get(o['heritage'], 'white')}/{sex}"]['measures']
            keep = [i for i, k in enumerate(A['measures']) if k != 'stature']
            m = by[o['id']]['Mm']
            z3 = white([g['mean'][i] for i in keep], [[g['cov'][i][j] for j in keep] for i in keep], [m[A['measures'][i]] for i in keep])
            fg = F['groups'].get(f"{FAIRFACE.get(o['heritage'], 'white')}/{sex}/all")
            # (nose length and lower face over face height add up to one: one of them)
            k2 = [i for i, k in enumerate(F['ratios']) if k != 'nose_len']
            z2 = white([fg['mean'][i] for i in k2], [[fg['cov'][i][j] for j in k2] for i in k2], [o['r2d'][F['ratios'][i]] for i in k2])
            Z.append(np.concatenate([z3, z2]))
        Z = np.array(Z); n, d = Z.shape
        # (real people inside the gate's own ranges: ANSUR's 3rd-97th percentiles, FairFace's 5th-95th)
        lim = np.array([1.88] * len(z3) + [1.645] * len(z2))
        sims = []
        for _ in range(400):
            X = rng.standard_normal((n * 3, d))
            X = X[(np.abs(X) <= lim).all(1)][:n]
            if len(X) < n: continue
            D = np.linalg.norm(X[:, None] - X[None], axis=-1) + np.eye(n) * 1e9
            sims.append(D.min())
        floor = float(np.percentile(sims, 5))
        D = np.linalg.norm(Z[:, None] - Z[None], axis=-1)
        for i in range(n):
            for j in range(i + 1, n):
                if D[i, j] < floor:
                    for a, b in ((i, j), (j, i)):
                        os_[a]['fails'].append(('3d.distinct', round(float(D[a, b]), 2), round(floor, 2), os_[b]['name']))


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
                # (stature is the person's own, from their people's real statures (Core Peoples), not the US Army's,
                # whose enlistment standards cut both tails)
                if k == 'stature': continue
                lo, hi = g['measures']['p3'][v], g['measures']['p97'][v]
                x = m.get(k)
                if x is not None and not (lo <= x <= hi): out['fails'].append((f'3d.{k}', round(x, 1), round(lo, 1), round(hi, 1)))
            r = ratios3d(m)
            si = A['measures'].index('stature')
            beyond = not (g['measures']['p3'][si] <= m['stature'] <= g['measures']['p97'][si])
            for v, k in enumerate(A['ratios']):
                # a proportion to stature is held only within the survey's statures (beyond them heads do not scale with it)
                if beyond and k.endswith('_stature'): continue
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
    distinct(report, A, F, people)
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
