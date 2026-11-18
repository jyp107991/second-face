"""Stage combat set v4.3 (the re-stance steps, G13) as a delta over v4.2, v4.1 and v4: the step clips that pass clip QA (fbx,
.fbx.meta, json), MANIFEST.json, clip_qa.json, the step library as the runtime reads it (`steps_library.json`, Unity's axes),
the selection rule's test cases (`steps_cases.json`) and the step audit of the pairs that fail G13 (`steps_audit.json`).
python3 -I, numpy (the test cases are computed by stance_continuity.fit_step_feet).

    python3 -I tools/unity/motion/combat_v43_stage.py <build dir> <qa.json> <steps.json> <stage dir>
"""
import json, math, os, shutil, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import stance_continuity as SC

RULE = {
    'when': "a transition's leaving stance (the current state's feet at the key it is left) and entering stance (the next "
            "state's feet at the key it is entered), each as the game places that clip, differ by more than G13 (either ankle "
            "over 1.5 cm or either foot over 5°, at a 0.935 m hip height)",
    'choose': "the step (or two in a row) whose feet, each warped on its own within the limits, land nearest the next state's: "
              "cost = the worse foot's max(offset residual / 1.5 cm, turn residual / 5°); a step the sex may play (its own or "
              "of unrecorded sex); the lowest cost wins, a single step before a chain",
    'warp': "each foot's landing: its captured offset scaled 0.8-1.2 and turned within +/-15° about its start, its own turn "
            "within +/-15°; a foot the step leaves still (under 3 cm) stays; the clip's duration unchanged",
    'chain': "two steps when no single step lands within G13: the second's offsets in the frame the first leaves the body in "
             "(turned by the first's mean foot turn)",
    'fallback': "no step lands within G13 (cost over 1), or either stance is crouched (the hips under 0.70 m at the reference "
                "body): the transition plays as now (the crossfade, Fighter.Feet stepping the feet)",
    'play': "the step plays in place (root_basis take: its frame is its first key's centre of mass and body orientation, put on "
            "the body's root); each foot by leg IK from where it stands to its warped landing along the clip's own swing (lift "
            "and set: its json `events`), the planted foot held; then the next state from its own entry key",
    'data': "steps_library.json: per step, its name, set (m, f, both), seconds, and each foot's offset (x right, z forward, m "
            "at a 0.935 m hip height) and turn (degrees about up, + clockwise from above, Unity's) from its first key to its "
            "last; the body's offsets are scaled by its own hip height over 0.935",
}


def to_unity(d):
    """The library's foot offsets (the dumps' axes: x left, z forward, cm; yaw + toward left) in Unity's (x right, m, yaw +
    clockwise from above)."""
    return [round(-d[0] / 100.0, 4), round(d[1] / 100.0, 4), round(-d[2], 1)]


def cases(lib):
    """The selection function's table: synthetic stance pairs (the leaving stance a 30 cm stance, feet 8° out) and what the
    rule must answer, computed by stance_continuity.fit_step_feet on the library."""
    base = {'Left': [15.0, 0.0, 8.0], 'Right': [-15.0, 0.0, -8.0]}       # (dumps' axes: x left, cm; yaw + left)
    deltas = [
        ('same stance', 'm', {'Left': [0, 0, 0], 'Right': [0, 0, 0]}),
        ('within G13 (1 cm, 3°)', 'f', {'Left': [1.0, 0, 3], 'Right': [0, 0, 0]}),
        ('right foot 20 cm back (woman)', 'f', {'Left': [0, 0, 0], 'Right': [0.0, -20.0, -12.0]}),
        ('left foot 12 cm back (man)', 'm', {'Left': [7.0, -9.5, 8.0], 'Right': [0, 0, 0]}),
        ('right foot 15 cm forward (man)', 'm', {'Left': [0, 0, 0], 'Right': [9.0, 15.0, 30.0]}),
        ('turn right about 55° on the left foot (man)', 'm', {'Left': [3.0, 6.0, -52.0], 'Right': [0, 0, 0]}),
        ('turn left about 80° (man)', 'm', {'Left': [-20.0, 2.5, 80.0], 'Right': [22.0, 30.0, 75.0]}),
        ('both feet 15 cm left (man)', 'm', {'Left': [12.0, -9.0, -10.0], 'Right': [15.0, -5.0, -22.0]}),
        ('a 60 cm shift (no step reaches it)', 'm', {'Left': [60.0, 0, 0], 'Right': [60.0, 0, 0]}),
        ('a 90° turn for a woman (no captured woman\'s turn that far)', 'f', {'Left': [0, 0, 90.0], 'Right': [0, 0, 90.0]}),
    ]
    out = []
    for what, sex, dd in deltas:
        req = np.array([dd['Left'], dd['Right']], float)
        to = {s: [base[s][i] + dd[s][i] for i in range(3)] for s in ('Left', 'Right')}
        if np.linalg.norm(req[:, :2], axis=1).max() <= SC.LIMIT_CM and np.abs(req[:, 2]).max() <= SC.LIMIT_DEG:
            out.append(dict(case=what, sex=sex, expect='none: within G13'))
        else:
            c, plan = SC.fit_step_feet(req, lib, sex)
            out.append(dict(case=what, sex=sex, expect=(' + '.join(p[0] for p in plan) if c <= 1.0 else 'none: the current blend'),
                            cost=round(c, 2)))
        out[-1].update({'from': {s: to_unity(base[s]) for s in base}, 'to': {s: to_unity(to[s]) for s in to}})
    out.append(dict(case='a crouched stance at either end', sex='m', expect='none: the current blend (no standing step bridges a crouch)',
                    note='hips under 0.70 m at the reference body'))
    return out


def main():
    build, qa, steps, stage = sys.argv[1:5]
    os.makedirs(stage, exist_ok=True)
    rows = {r['clip']: r for r in json.load(open(qa))}
    S = json.load(open(steps)); lib = S['library']
    man = {'set': 'combat v4.3', 'over': 'combat v4.2 (../v4_2), v4.1 (../v4_1) and v4 (../v4)', 'date': '2026-11-18',
           'rule': 'docs/COMBAT_ANIMATION_STANDARD.md G13 ("or have a captured step clip between them") and S24 (the re-stance step)',
           'requires': ["v4, v4.1 and v4.2 as their READMEs say; these clips are root_basis take (based upon Original)",
                        'CombatMotion: the step library as data and one selection function (README §2), with its Core test table'],
           'added': {}, 'do_not_import': {}, 'runtime_rule': RULE, 'steps_audit': {}}
    for name, r in sorted(rows.items()):
        side = json.load(open(os.path.join(build, name + '.json')))
        e = {'source': side.get('src'), 'range_s': side.get('range'), 'sex': side.get('sex'), 'set': side.get('set'), 'kind': side.get('kind'),
             'mirrored': side.get('mirrored'), 'frames': side.get('frames'), 'events': side.get('events'), 'qa': 'pass' if r['pass'] else 'fail'}
        if r['pass']:
            for ext in ('.fbx', '.fbx.meta', '.json'): shutil.copy2(os.path.join(build, name + ext), os.path.join(stage, name + ext))
            man['added'][name] = e
        else:
            e['fail'] = r['fail']; man['do_not_import'][name] = e
    staged = set(man['added'])
    libu = [dict(name=e['name'], set=e['set'], seconds=e['seconds'], left=to_unity(e['d']['Left']), right=to_unity(e['d']['Right']),
                 kind=e['kind']) for e in lib if e['name'] in staged]
    json.dump({'axes': "Unity's: x right, z forward (m at a 0.935 m hip height), turn degrees about up, + clockwise from above",
               'steps': libu}, open(os.path.join(stage, 'steps_library.json'), 'w'), indent=1)
    json.dump(cases([e for e in lib if e['name'] in staged]), open(os.path.join(stage, 'steps_cases.json'), 'w'), indent=1)
    for r in S['pairs']:
        man['steps_audit'][f"{r['pair']} ({r['sex']})"] = {k: r.get(k) for k in ('kind', 'takes', 'before', 'required', 'verdict', 'cost', 'steps', 'why', 'strict')}
    json.dump(man, open(os.path.join(stage, 'MANIFEST.json'), 'w'), indent=1)
    shutil.copy2(qa, os.path.join(stage, 'clip_qa.json')); shutil.copy2(steps, os.path.join(stage, 'steps_audit.json'))
    v = [r['verdict'] for r in S['pairs']]
    print(f"staged {len(staged)} steps; do not import {len(man['do_not_import'])}; audit: {v.count('pass')} pass, {v.count('fail')} fail, {v.count('n/a')} n/a")


if __name__ == '__main__':
    main()
