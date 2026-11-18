"""Stage combat set v4.4 (G13: the free states through their own recovery, the stand-ups from the crouched holds, the steps
v4.3 lacked) as a delta over v4.3, v4.2, v4.1 and v4: the clips that pass clip QA (fbx, .fbx.meta, json), MANIFEST.json,
clip_qa.json, the whole step library as the runtime reads it (`steps_library.json`: v4.3's and v4.4's, Unity's axes), the
selection rule's test table (`steps_cases.json`), the step audit of the pairs that fail G13 (`steps_audit.json`) and the
G13 table of every pair (`g13_table.json`, README §4). python3 -I, numpy.

    python3 -I tools/unity/motion/combat_v44_stage.py <build dir> <qa.json> <steps.json> <audit.json> <mapping.json> <stage dir>
"""
import json, os, shutil, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import stance_continuity as SC
import combat_v43_stage as V43
import combat_v44_jobs as V

RULE = dict(V43.RULE)
RULE['arms'] = ("a step's json `step_arms` ('lower': it lowers the fighting guard; 'raise': it takes the guard up; absent: "
                "'quiet') admits it only where the hands do the same: 'lower' only when the transition leaves a fighting guard "
                "(unarmed_idle, melee_idle), 'raise' only when it enters one; a quiet step anywhere")
RULE['data'] = V43.RULE['data'] + "; `arms` (quiet, lower, raise)"

IMPORT = {
    'root_basis take': "as v4.1-v4.3: Root Transform Rotation and Position XZ baked, based upon Original (each clip stands in its "
                       "chain's frame: the rises in their hold's, the women's duck in her guard's, each step in its own first key's)",
    'root_apply': "throw_rec_m_cmu, throw_rec_m_b_cmu, throw_rec_f_cmu apply their horizontal root motion as v4's throws did "
                  "(Core CombatMotion RootXZ.Apply: add the three names); their json says `root_apply`",
    'settle_in': "nothing at import: duck_f_built, rise_m_built, rise_f_built, rise_long_m_built and rise_long_f_built carry "
                 "their first key's feet on the hold's or guard's in the file (json `settle_in`: what moved, by how much)",
}

# what the pairs still failing or n/a lack (README §4): a capture that is not on disk
NO_CAPTURE = {
    'yield_enter': "hands up captured from a fighting guard (the women's guard-out steps bring it to 1.3-2.0 of G13's limits)",
    'cover_down': "a crouch-down captured from the ready stance it leaves (ACCAD Male2_A7 and Female1_A07 crouch from their own "
                  "stand); a crouch-down set on each ready's feet (settle_in, as the rises) would close it: not built",
    'hit_front': "a hit reaction captured on the ready stance's actor (the hits are built on another take's stance)",
    'throw': "a throw from a still stance to a still stance: so cut (143_20 from 5.85 s, 111_33 from 4.85 s) it runs 3.65-4.4 s, "
             "over G3's design 2.3 s (README §3); within the timing it starts mid wind-up, turned 30-40° from any ready",
    'unarmed_relax': "a relax captured by the men's guard's actor (CMU 143); ACCAD Male2_D4's starts from his own 56 cm guard",
    'melee_': "a blow captured on the men's one-handed guard's take (they stay v4's: ACCAD Male2's guard against blows built "
              "on other takes, v4.2)",
    'club2_strike': "a two-handed blow and recovery captured on her ready's take (v4.2)",
    'miss_left': "a slip by the men's guard's actor (CMU 143: only throws, punches and a run on disk); ACCAD Male2's stance is "
                 "56 cm wide against the guard's 27 cm, 11-16 cm apart after the best fit",
    'miss_duck': "a man's duck from a 27 cm guard (CMU 77_09, sex not recorded, stands 49 cm wide; ACCAD Male2_E21 travels 63 cm)",
    'cover_rise': "a rise that ends in the standing state's stance (the rises end on their hold's feet or the capture's own; "
                  "her rise ends with her crouch's toes 32-38° out, which two pivots reach to 1.03 of the limit)",
    'cover_leave': "crouch_to_run set on the hold's feet (settle_in, as the rises): not built",
}


def gap(pair):
    for k, v in NO_CAPTURE.items():
        if k in pair: return v
    return ''


def table(audit, steps):
    st = {(r['pair'], r['sex']): r for r in steps['pairs']}
    rows = []
    for r in audit:
        if r.get('missing'): continue
        e = dict(pair=r['pair'], sex=r['sex'], kind=r['kind'], clips=r['clips'],
                 before=[max(r['left_cm'], r['right_cm']), max(r['left_yaw_deg'], r['right_yaw_deg'])])
        if r['pass']: e.update(verdict='pass', how='G13 as staged')
        else:
            s = st.get((r['pair'], r['sex']))
            if s is None: e.update(verdict='fail', how='not in the step audit')
            elif s['verdict'] == 'pass': e.update(verdict='pass', how='with a step: ' + ' + '.join(x['clip'] for x in s['steps']), cost=s['cost'])
            elif s['verdict'] == 'n/a': e.update(verdict='n/a', how=s['why'], needs=gap(r['pair']))
            else: e.update(verdict='fail', how='no step lands within G13 (best cost %.2f)' % s.get('cost', 0), cost=s.get('cost'), needs=gap(r['pair']))
        rows.append(e)
    return rows


def cases(lib):
    out = V43.cases(lib)
    base = {'Left': [15.0, 0.0, 8.0], 'Right': [-15.0, 0.0, -8.0]}
    extra = [('out of her guard: the right foot 37 cm in, 12 cm over (woman, leaving her guard)', 'f',
              {'Left': [0, 0, 0], 'Right': [12.4, 36.7, 0.0]}, ('quiet', 'lower')),
             ('the same feet, not leaving a guard (a lowering step is not admitted)', 'f',
              {'Left': [0, 0, 0], 'Right': [12.4, 36.7, 0.0]}, ('quiet',)),
             ('the right foot turned 25° in place (a pivot)', 'f', {'Left': [0, 0, 0], 'Right': [0.0, 0.0, -25.0]}, ('quiet',)),
             ("a 90° turn in place for a woman (two of her 45° steps turn one foot each, at most 79° with the warp)", 'f',
              {'Left': [-15.0, 15.0, 90.0], 'Right': [15.0, -15.0, 90.0]}, ('quiet',))]
    for what, sex, dd, arms in extra:
        req = np.array([dd['Left'], dd['Right']], float)
        to = {s: [base[s][i] + dd[s][i] for i in range(3)] for s in ('Left', 'Right')}
        c, plan = SC.fit_step_feet(req, lib, sex, arms=arms)
        out.append(dict(case=what, sex=sex, arms=list(arms), expect=(' + '.join(p[0] for p in plan) if c <= 1.0 else 'none: the current blend'),
                        cost=round(c, 2), **{'from': {s: V43.to_unity(base[s]) for s in base}, 'to': {s: V43.to_unity(to[s]) for s in to}}))
    return out


def main():
    build, qa, steps, audit, mapping, stage = sys.argv[1:7]
    os.makedirs(stage, exist_ok=True)
    rows = {r['clip']: r for r in json.load(open(qa))}
    S = json.load(open(steps)); lib = S['library']; A = json.load(open(audit)); mp = json.load(open(mapping))
    man = {'set': 'combat v4.4', 'over': 'combat v4.3 (../v4_3), v4.2 (../v4_2), v4.1 (../v4_1) and v4 (../v4)', 'date': '2026-11-18',
           'rule': 'docs/COMBAT_ANIMATION_STANDARD.md G13 and S24; S17 (the rise), S19 (the throw), S9 (the duck)',
           'requires': ['v4, v4.1, v4.2 and v4.3 as their READMEs say', 'import: ' + json.dumps(IMPORT),
                        'CombatMotion: the states and routing below (cover_rise, cover_rise_long), the step rule with `arms` (README §2)'],
           'added': {}, 'do_not_import': {}, 'states': V.MAPPING, 'routed': V.ROUTED, 'runtime_rule': RULE}
    for name, r in sorted(rows.items()):
        side = json.load(open(os.path.join(build, name + '.json')))
        e = {k: side.get(k) for k in ('src', 'range', 'sex', 'set', 'kind', 'source_kind', 'mirrored', 'frames', 'events', 'chain',
                                      'root_basis', 'root_apply', 'settle_in', 'step_arms', 'replaces') if side.get(k) is not None}
        e['qa'] = 'pass' if r['pass'] else 'fail'
        if r['pass']:
            for ext in ('.fbx', '.fbx.meta', '.json'): shutil.copy2(os.path.join(build, name + ext), os.path.join(stage, name + ext))
            man['added'][name] = e
        else:
            e['fail'] = r['fail']; man['do_not_import'][name] = e
    staged = set(man['added'])
    old = [e for e in lib if e['name'] not in {d['name'] for d in V.JOBS}]       # v4.3's steps, as staged there
    use = old + [e for e in lib if e['name'] in staged]
    libu = [dict(name=e['name'], set=e['set'], seconds=e['seconds'], arms=e.get('arms', 'quiet'), left=V43.to_unity(e['d']['Left']),
                 right=V43.to_unity(e['d']['Right']), kind=e['kind'], stage='v4_4' if e['name'] in staged else 'v4_3') for e in use]
    json.dump({'axes': "Unity's: x right, z forward (m at a 0.935 m hip height), turn degrees about up, + clockwise from above",
               'steps': libu}, open(os.path.join(stage, 'steps_library.json'), 'w'), indent=1)
    json.dump(cases(use), open(os.path.join(stage, 'steps_cases.json'), 'w'), indent=1)
    T = table(A, S)
    json.dump(T, open(os.path.join(stage, 'g13_table.json'), 'w'), indent=1)
    v = [t['verdict'] for t in T]
    man['g13'] = {'pairs': len(T), 'pass': v.count('pass'), 'pass_as_staged': sum(t['how'] == 'G13 as staged' for t in T),
                  'pass_with_step': sum(t['how'].startswith('with a step') for t in T), 'n/a': v.count('n/a'), 'fail': v.count('fail')}
    json.dump(man, open(os.path.join(stage, 'MANIFEST.json'), 'w'), indent=1)
    shutil.copy2(qa, os.path.join(stage, 'clip_qa.json')); shutil.copy2(steps, os.path.join(stage, 'steps_audit.json'))
    with open(os.path.join(stage, 'g13_table.md'), 'w') as f:
        f.write('| pair | sex | kind | before (cm, °) | verdict | how / what it lacks |\n|---|---|---|---|---|---|\n')
        for t in T:
            f.write(f"| {t['pair']} | {t['sex']} | {t['kind']} | {t['before'][0]:.1f}, {t['before'][1]:.1f} | {t['verdict']} | "
                    f"{t['how']}{(' — needs ' + t['needs']) if t.get('needs') else ''} |\n")
    print(f"staged {len(staged)} clips; do not import {len(man['do_not_import'])}; library {len(libu)} steps; G13: {man['g13']}")


if __name__ == '__main__':
    main()
