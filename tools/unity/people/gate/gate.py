"""The plausibility gate (docs/PEOPLE_REALISM.md §3, §13): each person the game makes held to the real people of their sex
and ancestry, failing only where nearly no real person of their group lies. 3D: their head and neck measures
(PeopleGateTests -> test-results/people_measures.json) given their stature, against ANSUR II's group (ansur_stats.json):
the whitened distance from the group's conditional mean, within the distance that holds 97.5 % of the group's real people
(held out). 2D: their portrait's landmark proportions (faces2d.py -> test-results/people_faces2d.json), the face's whole
shape (shapes.py) and its apparent age (apparent.py -> people_apparent.json, when run), against the real faces at rest of
their people and sex (fairface_shapes.json) and real people of their age class, with one coverage for the three chosen so
that 97.5 % of the real faces pass all three. So about 95 % of real people would pass the gate; ours must too, each of
them. Single measures outside the real 3rd-97th (ANSUR) or 5th-95th (FairFace) percentiles are kept as notes (R3: held one
by one they failed half of the real people). And as groups: each age class's mean apparent age against real people's. Prints the failures per person and per check, the real pass rates, and
writes test-results/people_gate.json; exits 1 if anyone fails.
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
        # (real people the gate passes: each block within the distance that holds COVER of them)
        d3 = len(z3)
        r3, r2 = (float(np.quantile(np.linalg.norm(rng.standard_normal((20000, k)), axis=1), COVER)) for k in (d3, d - d3))
        sims = []
        for _ in range(400):
            X = rng.standard_normal((n * 3, d))
            X = X[(np.linalg.norm(X[:, :d3], axis=1) <= r3) & (np.linalg.norm(X[:, d3:], axis=1) <= r2)][:n]
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


SHAPE_RACES = {'mediterranean': ('white', 'middle_eastern')}
COVER = 0.975   # the share of real people of a group each part of the gate (3D, 2D) passes


def cond_dist(g, m):
    """The person's head and neck measures given their stature, whitened, from their ANSUR group's conditional mean
    (ansur_stats.cond_dist)."""
    from ansur_stats import cond_dist as cd, MEASURES
    return cd(g['measures']['mean'], g['measures']['cov'], [m[k] for k in MEASURES])


def face_model(real, space, keys, apparent=None):
    """The 2D gate's model of real faces at rest (fairface_shapes.json, lips together), per sex: each people's mean of the
    proportions and of the whole shape (shapes.py, in the sex's whitened shape space, faces_fit.json), the spread within a
    people pooled over the peoples (one covariance per sex: a people has only 34-91 such faces), each real face's distance
    from its people's mean held out of that mean; with apparent.py's readings, each age class's real apparent ages. One
    coverage q for the three checks, found so that COVER of the real faces with all three pass all three."""
    import numpy as np
    from shapes import symmetric
    ages = {}
    if apparent and apparent.get('faces'):
        for i, (b, a) in apparent['faces'].items(): ages.setdefault(3 + (int(b) - 25) // 10, []).append(a)
        ages = {c: np.sort(v) for c, v in ages.items()}
    model = {'ages': ages}
    for sex in 'mf':
        sp = space[sex]
        mu, C, sd = np.array(sp['mean']), np.array(sp['comps']), np.array(sp['sd'])
        fs = [f for f in real if f['sex'] == sex]
        R = np.array([[f['r'][k] for k in keys] for f in fs])
        Z = np.array([C @ (symmetric(f['shape']) - mu) / sd for f in fs])
        race = np.array([f['race'] for f in fs])
        dR, dZ, means = np.zeros_like(R), np.zeros_like(Z), {}
        for r in sorted(set(race)):
            k = race == r; n = int(k.sum())
            means[r] = (R[k].mean(0), Z[k].mean(0), n)
            dR[k] = R[k] - means[r][0]; dZ[k] = Z[k] - means[r][1]
        dof = len(fs) - len(means)
        covR = dR.T @ dR / dof
        sZ = np.sqrt((dZ ** 2).sum(0) / dof)
        L = np.linalg.cholesky(covR)
        held = np.array([means[r][2] / (means[r][2] - 1) for r in race])
        DR = np.linalg.norm(np.linalg.solve(L, (dR * held[:, None]).T), axis=0)
        DS = np.linalg.norm(dZ * held[:, None] / sZ, axis=1)
        # each real face's age reading as a share of its class's (two-sided: 0 at the middle, 1 at the ends)
        cls = [min(f['age'], 8) for f in fs]
        A = np.full(len(fs), np.nan)
        if ages:
            for j, f in enumerate(fs):
                a = apparent['faces'].get(str(f['i']))
                v = ages.get(cls[j])
                if a is not None and v is not None: A[j] = abs(2 * np.searchsorted(v, a[1]) / len(v) - 1)
        has = ~np.isnan(A) if ages else np.ones(len(fs), bool)
        def passes(q):
            ok = (DR <= np.quantile(DR, q)) & (DS <= np.quantile(DS, q))
            if ages: ok &= A <= q
            return ok[has].mean()
        lo, hi = COVER, 1.0
        for _ in range(30):
            q = (lo + hi) / 2
            if passes(q) < COVER: lo = q
            else: hi = q
        q = hi
        model[sex] = {'mu': mu, 'C': C, 'sd': sd, 'means': means, 'L': L, 'sZ': sZ, 'q': q,
                      'lim_r': float(np.quantile(DR, q)), 'lim_s': float(np.quantile(DS, q)), 'real_pass': float(passes(q)), 'n': int(has.sum())}
    return model


def face_check(out, f2, her, sex, model, keys):
    """The face's proportions and its whole shape against the real faces at rest of its people and sex (face_model)."""
    import numpy as np
    from shapes import symmetric
    M = model[sex]
    races = [r for r in SHAPE_RACES.get(her, (FAIRFACE.get(her, 'white'),)) if r in M['means']]
    if not races: return
    w = np.array([M['means'][r][2] for r in races], float)
    mR = sum(M['means'][r][0] * n for r, n in zip(races, w)) / w.sum()
    mZ = sum(M['means'][r][1] * n for r, n in zip(races, w)) / w.sum()
    d_r = float(np.linalg.norm(np.linalg.solve(M['L'], np.array([f2['ratios'][k] for k in keys]) - mR)))
    out['joint2d'] = round(d_r, 2)
    if d_r > M['lim_r']: out['fails'].append(('2d.proportions', round(d_r, 2), 0, round(M['lim_r'], 2)))
    if f2.get('shape'):
        z = M['C'] @ (symmetric(f2['shape']) - M['mu']) / M['sd']
        d_s = float(np.linalg.norm((z - mZ) / M['sZ']))
        out['shape'] = round(d_s, 2)
        if d_s > M['lim_s']: out['fails'].append(('2d.shape', round(d_s, 2), 0, round(M['lim_s'], 2)))


def age_check(out, ap, model):
    """The face's apparent age (apparent.py: a network trained on real photographs, read the same way on FairFace) within
    the spread of real people of the person's age class read so, at the 2D gate's coverage (docs/PEOPLE_REALISM.md §3:
    age coherence)."""
    import numpy as np
    a = ap['people'].get(out['id'])
    cls = 3 if out['age'] < 30 else 4 if out['age'] < 40 else 5 if out['age'] < 50 else 6 if out['age'] < 60 else 7 if out['age'] < 70 else 8
    v = model['ages'].get(cls)
    if a is None or v is None: return
    q = model[out['sex']]['q']
    lo, hi = float(np.quantile(v, (1 - q) / 2)), float(np.quantile(v, (1 + q) / 2))
    out['apparent'] = round(a, 1)
    if not (lo <= a <= hi): out['fails'].append(('2d.age', round(a, 1), round(lo, 1), round(hi, 1)))


def population(report, model):
    """What one person cannot show: our people of an age class against real people of it as groups. Each one's apparent age
    may lie within the real spread while the class as a whole reads years young (§12); a class whose mean reading differs
    from the real mean by more than 2.5 standard errors of the difference fails the gate."""
    import numpy as np
    out = []
    by = {}
    for o in report:
        if 'apparent' not in o: continue
        cls = 3 if o['age'] < 30 else 4 if o['age'] < 40 else 5 if o['age'] < 50 else 6 if o['age'] < 60 else 7 if o['age'] < 70 else 8
        by.setdefault(cls, []).append(o['apparent'])
    names = {3: '20-29', 4: '30-39', 5: '40-49', 6: '50-59', 7: '60-69', 8: '70+'}
    for cls, ours in sorted(by.items()):
        real = model['ages'].get(cls)
        if real is None or len(ours) < 8: continue
        ours = np.array(ours)
        se = float(np.sqrt(ours.var(ddof=1) / len(ours) + real.var(ddof=1) / len(real)))
        d = float(ours.mean() - real.mean())
        out.append({'what': f'apparent age, {names[cls]}', 'ours': float(ours.mean()), 'real': float(real.mean()), 'n': len(ours),
                    'tol': 2.5 * se, 'fail': abs(d) > 2.5 * se})
    return out


def main(results):
    A = json.load(open(os.path.join(HERE, 'ansur_stats.json')))
    F = json.load(open(os.path.join(HERE, 'fairface_stats.json')))
    people = json.load(open(os.path.join(results, 'people_measures.json')))
    sys.path.insert(0, HERE)
    heads = os.path.join(results, 'heads')
    if os.path.isdir(heads):
        # the measures by measure.py from the dumped heads (its landmark rules, checked on plots), stature from Unity
        from measure import measure
        for p in people:
            f = os.path.join(heads, p['Id'] + '.bin')
            if os.path.exists(f): p['Mm'].update({k: v for k, v in measure(f).items() if not k.startswith('_')})
    faces = {}
    p2 = os.path.join(results, 'people_faces2d.json')
    if os.path.exists(p2): faces = {f['Id']: f for f in json.load(open(p2))}
    report, fails_by, notes_by = [], {}, {}
    ap_p = os.path.join(results, 'people_apparent.json')
    ap = json.load(open(ap_p)) if os.path.exists(ap_p) else None
    # (nose length and lower face over face height add up to one: one of them)
    keys = [k for k in F['ratios'] if k != 'nose_len']
    real = [f for f in json.load(open(os.path.join(HERE, 'fairface_shapes.json')))['faces'] if f['gap'] < 0.035]
    model = face_model(real, json.load(open(os.path.join(HERE, 'faces_fit.json')))['space'], keys, ap)
    for p in people:
        if p['Age'] < 18: continue   # adults only: ANSUR II and the FairFace bands used are adults (children: a later gate)
        sex = p['Sex']; her = p.get('Heritage') or 'north_european'
        out = {'id': p['Id'], 'name': p['Name'], 'sex': sex, 'age': p['Age'], 'heritage': her, 'source': p['Source'], 'fails': [], 'notes': []}
        g = A['groups'].get(f"{ANSUR.get(her, 'white')}/{sex}")
        m = p['Mm']
        if g:
            d = cond_dist(g, m)
            out['joint3d'] = round(d, 2)
            if d > g['joint']['p975']: out['fails'].append(('3d.head_and_neck', round(d, 2), 0, g['joint']['p975']))
            # the single measures and proportions outside the group's 3rd-97th percentiles: notes, not failures
            for v, k in enumerate(A['measures']):
                # (stature is the person's own, from their people's real statures (Core Peoples), not the US Army's,
                # whose enlistment standards cut both tails)
                if k == 'stature': continue
                lo, hi = g['measures']['p3'][v], g['measures']['p97'][v]
                x = m.get(k)
                if x is not None and not (lo <= x <= hi): out['notes'].append((f'3d.{k}', round(x, 1), round(lo, 1), round(hi, 1)))
            r = ratios3d(m)
            si = A['measures'].index('stature')
            beyond = not (g['measures']['p3'][si] <= m['stature'] <= g['measures']['p97'][si])
            for v, k in enumerate(A['ratios']):
                if beyond and k.endswith('_stature'): continue
                lo, hi = g['ratios']['p3'][v], g['ratios']['p97'][v]
                if not (lo <= r[k] <= hi): out['notes'].append((f'3d.{k}', round(r[k], 3), round(lo, 3), round(hi, 3)))
            out['r3d'] = {k: round(v, 3) for k, v in r.items()}
        f2 = faces.get(p['Id'])
        if f2 and f2.get('ratios'):
            face_check(out, f2, her, sex, model, keys)
            race = FAIRFACE.get(her, 'white')
            fg = F['groups'].get(f"{race}/{sex}/{band(p['Age'])}")
            if not fg or fg['n'] < 25: fg = F['groups'].get(f'{race}/{sex}/all')
            for v, k in enumerate(F['ratios']):
                lo, hi = fg['p5'][v], fg['p95'][v]
                x = f2['ratios'][k]
                if not (lo <= x <= hi): out['notes'].append((f'2d.{k}', round(x, 3), round(lo, 3), round(hi, 3)))
            out['r2d'] = {k: round(v, 3) for k, v in f2['ratios'].items()}
        elif p['Id'] in faces: out['fails'].append(('2d.face_not_found', 0, 0, 0))
        if ap: age_check(out, ap, model)
        for f in out['fails']: fails_by[f[0]] = fails_by.get(f[0], 0) + 1
        for f in out['notes']: notes_by[f[0]] = notes_by.get(f[0], 0) + 1
        report.append(out)
    distinct(report, A, F, people)
    groups = population(report, model) if ap else []
    for o in report:
        for f in o['fails']:
            if f[0] == '3d.distinct': fails_by[f[0]] = fails_by.get(f[0], 0) + 1
    passed = sum(1 for o in report if not o['fails'])
    print('real people passing (held out): 3D 97.5 % of each ANSUR group; 2D ' +
          ', '.join(f"{'men' if s == 'm' else 'women'} {model[s]['real_pass']:.1%} of {model[s]['n']} (coverage {model[s]['q']:.3f})" for s in 'mf') +
          ('' if ap else ' (no apparent ages: age rule not held)'))
    print(f'people {len(report)}: {passed} pass, {len(report) - passed} fail')
    for k, n in sorted(fails_by.items(), key=lambda kv: -kv[1]): print(f'  {k:28s} {n:4d} fail')
    print('  notes (single measures outside the real 3rd-97th / 5th-95th: real people have these too): ' +
          ', '.join(f'{k.split(".")[1]} {n}' for k, n in sorted(notes_by.items(), key=lambda kv: -kv[1])[:8]))
    for g in groups: print(f"  population: {g['what']}: ours {g['ours']:.1f}, real {g['real']:.1f} (n {g['n']}; within {g['tol']:.1f})" + ('  FAIL' if g['fail'] else ''))
    for o in report:
        if o['fails'] and o['source'].startswith('shale'):
            print(f"  {o['name'][:22]:22s} {o['sex']} {o['age']:.0f} {o['heritage']:20s} " + '; '.join(f'{k.split(".")[1]} {x} [{lo}-{hi}]' for k, x, lo, hi in o['fails']))
    json.dump({'passed': passed, 'total': len(report), 'fails_by': fails_by, 'notes_by': notes_by, 'population': groups,
               'real_pass': {s: model[s]['real_pass'] for s in 'mf'}, 'people': report}, open(os.path.join(results, 'people_gate.json'), 'w'), indent=1)
    return 0 if passed == len(report) and not any(g['fail'] for g in groups) else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', '..', '..', '..', 'unity', 'test-results')))
