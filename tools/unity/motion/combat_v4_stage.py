"""Stage combat set v4: the converted clips that pass the clip QA, their metas and jsons, the QA, and MANIFEST.json (per state:
clip, source, sex, captured or built, QA, retired). numpy-free, python3 -I.

    python3 -I tools/unity/motion/combat_v4_stage.py <build dir> <qa.json> <calib.json> <stage dir> [--project <Combat/Motion>]

Every clip that passes goes to the stage dir (fbx, .fbx.meta, json); one that fails is listed with its reasons under
`do_not_import` and not copied (G1: a clip that fails clip QA is not imported, whatever its source).
"""
import json, os, shutil, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import combat_v4_jobs as J

STATES = {
    'S1a': 'ready, long gun', 'S1b': 'ready, pistol', 'S1c': 'ready, one-handed melee', 'S1d': 'ready, two-handed melee', 'S1e': 'guard, unarmed (and footwork)',
    'S2': 'aim, long gun', 'S3': 'aim, pistol', 'S4': 'fire (recoil layer)', 'S5': 'reload', 'S6a': 'strike, one-handed', 'S6b': 'strike, two-handed',
    'S7': 'strike, unarmed', 'S8': 'guard and block', 'S9': 'dodge', 'S10': 'hit reactions', 'S11': 'stagger', 'S12': 'knockdown and fall',
    'S13': 'death', 'S14': 'prone and crawl', 'S15': 'rise', 'S16': 'crouch (and crouched gait)', 'S17': 'cover, half', 'S18': 'cover, full',
    'S19': 'throw', 'S20': 'surrender', 'S21': 'carry', 'S22': 'turn', 'S23': 'draw, holster'}


def main():
    a = sys.argv[1:]
    build, qa, calib, stage = a[0], a[1], a[2], a[3]
    project = a[a.index('--project') + 1] if '--project' in a else None
    os.makedirs(stage, exist_ok=True)
    rows = {r['clip']: r for r in json.load(open(qa))}
    jobs = {d['name']: d for d in J.JOBS}
    man = {'set': 'combat v4', 'date': '2026-11-17',
           'requires': ['MotionImportPostprocessor v11+ (each clip\'s avatar configuration built from the FBX\'s default values: the '
                        'converters\' shared T-pose, checked by clip_qa\'s T-pose check)',
                        'each clip\'s staged .fbx.meta (stores no configuration and no mapping) and the explicit Humanoid mapping in its '
                        'json (`humanoid.mapping`: LeftHand/RightHand are the hands; `humanoid.inbetween`: the wrist twist bones, Neck2, '
                        'the hip joints and 100STYLE\'s Chest3, held at rest)'],
           'states': {}, 'clips': {}, 'do_not_import': {}, 'retired': J.RETIRED, 'project_metas_to_replace': [], 'gaps': [], 'plan': {}}
    staged = 0
    for name, r in sorted(rows.items()):
        d = jobs.get(name, {}); side = json.load(open(os.path.join(build, name + '.json')))
        e = {'state': side.get('state'), 'gate': side.get('gate'), 'source': side.get('src'), 'sex': side.get('sex'), 'set': side.get('set'),
             'kind': side.get('source_kind'), 'authoring': side.get('authoring'), 'qa': 'pass' if r['pass'] else 'fail',
             'root': side.get('root'), 'loop': side.get('loop'), 'frames': side.get('frames'), 'events': side.get('events'),
             'replaces': side.get('replaces'), 'flags': r.get('flags')}
        if side.get('evidence'): e['evidence'] = side['evidence']
        if r['pass']:
            for ext in ('.fbx', '.fbx.meta', '.json'): shutil.copy2(os.path.join(build, name + ext), os.path.join(stage, name + ext))
            staged += 1
            man['clips'][name] = e
        else:
            e['fail'] = r['fail']; man['do_not_import'][name] = e
        st = side.get('state') or '-'
        man['states'].setdefault(f'{st} {STATES.get(st, "")}'.strip(), []).append(
            {'clip': name, 'source': side.get('src'), 'sex': side.get('sex'), 'set': side.get('set'), 'kind': side.get('source_kind'),
             'qa': 'pass' if r['pass'] else 'fail: ' + '; '.join(r['fail'])[:300]})
    if project:
        import clip_qa as Q
        for f in sorted(os.listdir(project)):
            if not f.endswith('.fbx.meta'): continue
            nm = f[:-9]; h = Q.stored_hands(os.path.join(project, f))
            bad = any(b != k for k, b in h.items())
            if nm in man['clips']: what = 'replaced by v4 (copy the staged .fbx, .fbx.meta and .json over it)'
            elif nm in J.RETIRED: what = 'retired (delete the .fbx, its .meta and .json)'
            elif nm in man['do_not_import']: what = 'v4 re-make fails the clip QA: delete it (no state may play it)'
            else: what = 'kept as it is'
            man['project_metas_to_replace'].append({'clip': nm, 'stored_hand_mapping_wrong': bad, 'action': what})
    json.dump(man, open(os.path.join(stage, 'MANIFEST.json'), 'w'), indent=1)
    shutil.copy2(qa, os.path.join(stage, 'clip_qa.json'))
    shutil.copy2(calib, os.path.join(stage, 'calibration_v4.json'))
    print(f'staged {staged} of {len(rows)}; do not import: {sorted(man["do_not_import"])}')


if __name__ == '__main__':
    main()
