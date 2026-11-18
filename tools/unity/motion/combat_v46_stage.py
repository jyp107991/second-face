"""Stage combat set v4.6: v4.1 to v4.5 as one corrected set over v4 (docs/COMBAT_ANIMATION_STANDARD.md G13). The clips are the
ones those five deltas staged, under the same names and with the same jsons, rebuilt by the same jobs with their take frames'
front on the file's -Z: imported based upon Original (root_basis take), Unity puts it on the root's +Z
(stance_continuity.TAKE_FRONT). Before, every take-basis clip played turned 178-180° from the root's front. clip_qa's
`facing` check models that basis. python3 -I, numpy.

    python3 -I tools/unity/motion/combat_v46_stage.py <union build dir> <qa.json> <steps.json> <audit.json> <mapping.json> <stage dir>

The union build dir holds the five rebuilds (v4.1 to v4.5, a later set's clip over an earlier one's of the same name). The
staged names are read from ../v4_1 to ../v4_5. A clip that fails clip QA is not staged and is listed under `do_not_import`.
"""
import glob, json, os, shutil, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import combat_v43_stage as V43
import combat_v44_stage as V44S
import combat_v45_stage as V45S

SETS = ['v4_1', 'v4_2', 'v4_3', 'v4_4', 'v4_5']
FRONT = ("Every clip whose json says root_basis take (Root Transform Rotation and Position XZ based upon Original) is written "
         "in a frame whose front is the file's -Z. The converters' FBX (axis_forward -Z) and Unity's import put that on Unity's "
         "+Z, the root's front. v4.1-v4.5 wrote it on the file's +Z, and played turned 178-180° from the root (fighters with "
         "their backs to the target). The positions and the rotations of every key turn together: a frame change, the same "
         "clips otherwise. clip_qa's `facing` checks it under that basis: the clip that sets its chain's front within 10° of "
         "Unity's +Z (body orientation, or the aim's gun line), every take-basis clip within 90° (hips, chest, body, gun).")


def main():
    build, qa, steps, audit, mapping, stage = sys.argv[1:7]
    top = os.path.dirname(os.path.abspath(stage))
    os.makedirs(stage, exist_ok=True)
    rows = {r['clip']: r for r in json.load(open(qa))}
    S = json.load(open(steps)); A = json.load(open(audit)); mp = json.load(open(mapping))
    origin, prov = {}, {}
    for st in SETS:
        man = json.load(open(os.path.join(top, st, 'MANIFEST.json')))
        for f in sorted(glob.glob(os.path.join(top, st, '*.fbx'))):
            n = os.path.basename(f)[:-4]; origin[n] = st
        for sec in ('replaced', 'added'):
            for n, e in (man.get(sec) or {}).items():
                if isinstance(e, dict): prov[n] = dict(e, set=st, section=sec)
    out = {'set': 'combat v4.6', 'over': 'combat v4 (../v4)', 'date': '2026-11-18',
           'replaces_sets': {s: f'../{s}: every clip it staged, here under the same name, its take frame turned to Unity\'s front' for s in SETS},
           'front': FRONT,
           'requires': ["import as v4.1-v4.5's READMEs say (root_basis take: based upon Original; root_apply clips: their root motion "
                        "applied; the rest as v4); import this set in place of v4.1-v4.5, not with them",
                        'CombatMotion: the states and routing (`states`, `routed`), the re-stance step rule with `arms`, resolve_at'],
           'states': mp['states'], 'routed': mp['routed'],
           'runtime_rule': V44S.RULE, 'resolve_at': V45S.RESOLVE, 'added': {}, 'do_not_import': {}}
    facing = {'take_basis': 0, 'sets_front': 0, 'pass': 0, 'fail': []}
    for name in sorted(origin):
        r = rows.get(name)
        side = json.load(open(os.path.join(build, name + '.json')))
        if side.get('resolve_at') and isinstance(side.get('timing'), dict):
            side['timing']['g3'] = (f"captured: {side['timing'].get('measured', {}).get('beat_s')} s from the start to the release "
                                    f"(the design {side['timing']['lo']}-{side['timing']['hi']} s, +/-15 %), then "
                                    f"{side['resolve_at']['recovery_s']} s of the capture's own recovery: design timing waived")
        e = {'from_set': origin[name], 'src': side.get('src'), 'range': side.get('range'), 'sex': side.get('sex'), 'kind': side.get('kind'),
             'source_kind': side.get('source_kind'), 'root_basis': side.get('root_basis'), 'chain': side.get('chain')}
        fc = (r or {}).get('checks', {}).get('facing')
        if fc:
            facing['take_basis'] += 1; facing['sets_front'] += bool(fc.get('sets_front'))
            if fc['ok']: facing['pass'] += 1
            else: facing['fail'].append(name)
            e['facing'] = fc
        if r and r['pass']:
            for ext in ('.fbx', '.fbx.meta'): shutil.copy2(os.path.join(build, name + ext), os.path.join(stage, name + ext))
            json.dump(side, open(os.path.join(stage, name + '.json'), 'w'), indent=1)
            out['added'][name] = e
        else:
            e['fail'] = (r or {}).get('fail', ['not built']); out['do_not_import'][name] = e
    out['facing'] = facing
    lib = S['library']; staged = set(out['added'])
    use = [e for e in lib if e['name'] in staged]
    libu = [dict(name=e['name'], set=e['set'], seconds=e['seconds'], arms=e.get('arms', 'quiet'), left=V43.to_unity(e['d']['Left']),
                 right=V43.to_unity(e['d']['Right']), kind=e['kind']) for e in use]
    json.dump({'axes': "Unity's: x right, z forward (m at a 0.935 m hip height), turn degrees about up, + clockwise from above",
               'steps': libu}, open(os.path.join(stage, 'steps_library.json'), 'w'), indent=1)
    json.dump(V44S.cases(use), open(os.path.join(stage, 'steps_cases.json'), 'w'), indent=1)
    json.dump(V45S.cases(build), open(os.path.join(stage, 'resolve_cases.json'), 'w'), indent=1)
    V44S.NO_CAPTURE['throw'] = ("a ready captured on the thrower's own take that the rifle ready shares (the throws start and end in "
                                "their actors' still stances, 9-11 cm and 12-17° off the rifle ready's actor's)")
    V44S.NO_CAPTURE.pop('cover_leave', None)
    T = V44S.table(A, S)
    json.dump(T, open(os.path.join(stage, 'g13_table.json'), 'w'), indent=1)
    v = [t['verdict'] for t in T]
    out['g13'] = {'pairs': len(T), 'pass': v.count('pass'), 'pass_as_staged': sum(t['how'] == 'G13 as staged' for t in T),
                  'pass_with_step': sum(t['how'].startswith('with a step') for t in T), 'n/a': v.count('n/a'), 'fail': v.count('fail'),
                  'fail_on': 'the blend fallback (the current crossfade, Fighter.Feet stepping the feet)'}
    json.dump(out, open(os.path.join(stage, 'MANIFEST.json'), 'w'), indent=1)
    shutil.copy2(qa, os.path.join(stage, 'clip_qa.json')); shutil.copy2(steps, os.path.join(stage, 'steps_audit.json'))
    with open(os.path.join(stage, 'g13_table.md'), 'w') as f:
        f.write('| pair | sex | kind | before (cm, °) | verdict | how / what it lacks |\n|---|---|---|---|---|---|\n')
        for t in T:
            f.write(f"| {t['pair']} | {t['sex']} | {t['kind']} | {t['before'][0]:.1f}, {t['before'][1]:.1f} | {t['verdict']} | "
                    f"{t['how']}{(' — needs ' + t['needs']) if t.get('needs') else ''} |\n")
    print(f"staged {len(out['added'])} of {len(origin)} clips; do not import {len(out['do_not_import'])}; library {len(libu)} steps; "
          f"facing: {facing['pass']} of {facing['take_basis']} take-basis clips pass ({facing['sets_front']} set a front), fail {facing['fail']}; "
          f"G13: {out['g13']}")


if __name__ == '__main__':
    main()
