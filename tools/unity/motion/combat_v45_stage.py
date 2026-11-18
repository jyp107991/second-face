"""Stage combat set v4.5 (the throws from a still stance to a still stance, resolved at their release; the break into a run
set on the crouched hold's feet) as a small delta over v4.4: the clips that pass clip QA (fbx, .fbx.meta, json),
MANIFEST.json, clip_qa.json, the step audit (`steps_audit.json`), the G13 table of every pair (`g13_table.json`, `.md`) and
the Core test table of the `resolve_at` rule (`resolve_cases.json`). The step library is v4.4's (`../v4_4/steps_library.json`).
python3 -I, numpy.

    python3 -I tools/unity/motion/combat_v45_stage.py <build dir> <qa.json> <steps.json> <audit.json> <stage dir>
"""
import json, os, shutil, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import combat_v44_stage as V44S
import combat_v45_jobs as V

RESOLVE = {
    'what': "`resolve_at` in a clip's json ({event, frame, s, recovery_s}): the key at which CombatMotion resolves the action "
            "the clip shows. For a throw it is the release: the projectile leaves the hand, its flight and outcome resolve, the "
            "unit's action ends and the next unit's turn may start, the camera free to cut away",
    'recovery': "the rest of the clip (recovery_s) plays on, under whatever comes next: the thrower stays in the throw state "
                "until its cut (0.97, the still stance) or until a new order for that unit",
    'orders': "an order for the thrower that arrives before the release waits for it; one that arrives after it starts at once, "
              "its state crossfading over the recovery as any transition does (mid-recovery the feet are mid-step: G13 does "
              "not hold and the blend fallback, Fighter.Feet, steps them)",
    'without': "a clip without `resolve_at` resolves as it does now (unchanged)",
    'timing': "G3: the throw's own captured time, judged to the release (timing 'throw_release': the design 1-2.3 s, +/-15 %); "
              "the recovery after the release is captured and waived from the design pace",
}


def cases(build):
    out = []
    for n in ('throw_full_m_cmu', 'throw_full_f_cmu'):
        j = json.load(open(os.path.join(build, n + '.json'))); r = j['resolve_at']
        dur = (j['frames'] - 1) / j['fps']; cut = round(0.97 * dur, 3); rel = r['s']
        out += [
            dict(case=f'{n}: the throw resolves at its release', clip=n, given={'played_from_s': 0.0},
                 expect={'resolved_at_s': rel, 'resolved_at_frame': r['frame'], 'action_ends_at_s': rel, 'next_turn_may_start_at_s': rel}),
            dict(case=f'{n}: an order for the thrower before the release waits for it', clip=n, given={'order_at_s': round(rel * 0.5, 3)},
                 expect={'next_state_starts_at_s': rel}),
            dict(case=f'{n}: an order after the release blends the recovery out', clip=n, given={'order_at_s': round(rel + 0.5, 3)},
                 expect={'next_state_starts_at_s': round(rel + 0.5, 3), 'throw_reaches_its_cut': False, 'feet': 'blend fallback'}),
            dict(case=f'{n}: no order: the recovery plays to the still stance', clip=n, given={'order_at_s': None},
                 expect={'throw_state_left_at_s': cut, 'then': 'rifle_idle through the step rule'}),
        ]
    out.append(dict(case='a clip without resolve_at resolves as now', clip='fist_cross_m_cmu', given={}, expect={'unchanged': True}))
    return out


def main():
    build, qa, steps, audit, stage = sys.argv[1:6]
    os.makedirs(stage, exist_ok=True)
    rows = {r['clip']: r for r in json.load(open(qa))}
    S = json.load(open(steps)); A = json.load(open(audit))
    man = {'set': 'combat v4.5', 'over': 'combat v4.4 (../v4_4), v4.3, v4.2, v4.1 and v4', 'date': '2026-11-18',
           'rule': 'docs/COMBAT_ANIMATION_STANDARD.md G13, S19 (the throw: resolve_at release), S17 (cover leave)',
           'requires': ['v4-v4.4 as their READMEs say (the editor imports v4.2-v4.5 together)',
                        'import: throw_full_m_cmu, throw_full_f_cmu as v4\'s throws (first-key basis, horizontal root motion '
                        'applied: CombatMotion RootXZ.Apply; json root_apply); cover_leave_m_built, cover_leave_f_built '
                        'root_basis take (Rotation and Position XZ based upon Original) with their horizontal root motion '
                        'applied as v4\'s crouch_to_run (json root, root_apply): Position XZ not baked',
                        'CombatMotion: resolve_at (README §2, resolve_cases.json)'],
           'added': {}, 'do_not_import': {}, 'states': V.MAPPING, 'resolve_at': RESOLVE}
    for name, r in sorted(rows.items()):
        side = json.load(open(os.path.join(build, name + '.json')))
        if side.get('resolve_at') and isinstance(side.get('timing'), dict):
            # G3: the throw's own time is the evidence; the design pace is held to the release only
            side['timing']['g3'] = (f"captured: {side['timing'].get('measured', {}).get('beat_s')} s from the start to the release "
                                    f"(the design {side['timing']['lo']}-{side['timing']['hi']} s, +/-15 %), then "
                                    f"{side['resolve_at']['recovery_s']} s of the capture's own recovery: design timing waived")
        e = {k: side.get(k) for k in ('src', 'range', 'sex', 'set', 'kind', 'source_kind', 'frames', 'events', 'chain', 'root',
                                      'root_basis', 'root_apply', 'settle_in', 'resolve_at', 'timing', 'replaces') if side.get(k) is not None}
        e['qa'] = 'pass' if r['pass'] else 'fail'
        if r['pass']:
            for ext in ('.fbx', '.fbx.meta'): shutil.copy2(os.path.join(build, name + ext), os.path.join(stage, name + ext))
            json.dump(side, open(os.path.join(stage, name + '.json'), 'w'), indent=1)
            man['added'][name] = e
        else:
            e['fail'] = r['fail']; man['do_not_import'][name] = e
    V44S.NO_CAPTURE['throw'] = ("a ready captured on the thrower's own take that the rifle ready shares (the throws now start and end "
                                "in their actors' still stances, 9-11 cm and 12-17° off the rifle ready's actor's)")
    V44S.NO_CAPTURE.pop('cover_leave', None)
    T = V44S.table(A, S)
    json.dump(T, open(os.path.join(stage, 'g13_table.json'), 'w'), indent=1)
    v = [t['verdict'] for t in T]
    man['g13'] = {'pairs': len(T), 'pass': v.count('pass'), 'pass_as_staged': sum(t['how'] == 'G13 as staged' for t in T),
                  'pass_with_step': sum(t['how'].startswith('with a step') for t in T), 'n/a': v.count('n/a'), 'fail': v.count('fail'),
                  'fail_on': 'the blend fallback (the current crossfade, Fighter.Feet stepping the feet)'}
    json.dump(man, open(os.path.join(stage, 'MANIFEST.json'), 'w'), indent=1)
    json.dump(cases(build), open(os.path.join(stage, 'resolve_cases.json'), 'w'), indent=1)
    shutil.copy2(qa, os.path.join(stage, 'clip_qa.json')); shutil.copy2(steps, os.path.join(stage, 'steps_audit.json'))
    with open(os.path.join(stage, 'g13_table.md'), 'w') as f:
        f.write('| pair | sex | kind | before (cm, °) | verdict | how / what it lacks |\n|---|---|---|---|---|---|\n')
        for t in T:
            f.write(f"| {t['pair']} | {t['sex']} | {t['kind']} | {t['before'][0]:.1f}, {t['before'][1]:.1f} | {t['verdict']} | "
                    f"{t['how']}{(' — needs ' + t['needs']) if t.get('needs') else ''} |\n")
    print(f"staged {len(man['added'])} clips; do not import {len(man['do_not_import'])}; G13: {man['g13']}")


if __name__ == '__main__':
    main()
