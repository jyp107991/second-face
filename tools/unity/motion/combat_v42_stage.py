"""Stage combat set v4.2 as a delta over v4.1 and v4 (docs/COMBAT_ANIMATION_STANDARD.md G13): only the clips it changes or
adds, each with its .fbx, .fbx.meta and .json; MANIFEST.json (replaced, added, the states' mapping changes over v4.1's proposal,
the routing, the root travel the cover holds are written after, the pairs still unmatched and those that would fail if
judged); clip_qa.json; the stance-continuity audits. python3 -I, no numpy.

    python3 -I tools/unity/motion/combat_v42_stage.py <build dir> <qa.json> <qa_stance.json> <v4.1 stance audit> <v4.1 stage dir>,<v4 stage dir> <stage dir>

A clip that fails clip QA (G13 included) is not staged and is listed under `do_not_import`.
"""
import json, os, shutil, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import combat_v42_jobs as V
import combat_v41_jobs as V1
import stance_continuity as SC

IMPORT = ("CombatImportPostprocessor, as v4.1's README §1.2 (root_basis: take, based upon Original); and for a clip whose json "
          "carries `root_travel` (the crouch-downs), its root motion applied as now (based upon the centre of mass), since the "
          "holds after it (`after`) are written where that root stands at its cut")


def pair_rows(rows):
    out = {}
    for r in rows:
        if r.get('missing'): continue
        out[(r['pair'], r['sex'])] = r
    return out


def brief(r):
    if r is None: return None
    return {'clips': r['clips'], 'takes': r.get('takes'), 'basis': r.get('basis'), 'feet_cm': [r['left_cm'], r['right_cm']],
            'yaw_deg': [r['left_yaw_deg'], r['right_yaw_deg']], 'verdict': r['verdict']}


def main():
    a = sys.argv[1:]
    build, qa, qa_stance, audit_before, overs, stage = a[:6]
    base = dict(SC.STATES); base.update({k: tuple(v) for k, v in V1.MAPPING.items()})
    stage_set(build, qa, qa_stance, audit_before, '-', overs, stage, V, base, 'combat v4.2', '2026-11-18',
              'combat v4.1 (../v4_1) over v4 (../v4): everything not listed here stays as they staged it', [IMPORT])


def stage_set(build, qa, qa_stance, audit_before, audit_first, over_dirs, stage, V, base_states, set_name, date, over, extra_requires):
    """Stage a delta set: `over_dirs` the stage dirs it is staged over (comma-separated, nearest first), `base_states` the
    states as they stand before it (stance_continuity.STATES' form), `V` its jobs module (CHAINS, MAPPING, ROUTED)."""
    v4 = over_dirs.split(',')[-1]
    os.makedirs(stage, exist_ok=True)
    rows = {r['clip']: r for r in json.load(open(qa))}
    v4man = json.load(open(os.path.join(v4, 'MANIFEST.json')))
    v4clips = set(v4man['clips']) | set(v4man['do_not_import'])
    for od in over_dirs.split(',')[:-1]:
        om = json.load(open(os.path.join(od, 'MANIFEST.json'))); v4clips |= set(om.get('replaced', {})) | set(om.get('added', {}))
    after, before, first = (pair_rows(json.load(open(p))) if p and p != '-' else {} for p in (qa_stance, audit_before, audit_first))
    man = {'set': set_name, 'over': over, 'date': date,
           'rule': 'docs/COMBAT_ANIMATION_STANDARD.md G13 (stance continuity) and its QA measure (tools/unity/motion/stance_continuity.py)',
           'requires': v4man['requires'] + list(extra_requires) + [
                       'the mapping changes and the routing below (Core CombatMotion, Game AnimatedUnitView: the editor owner\'s code)'],
           'chains': {k: dict(c, frame=None) for k, c in V.CHAINS.items()},
           'replaced': {}, 'added': {}, 'do_not_import': {}, 'mapping_changes': {}, 'proposed_states': {}, 'routing': V.ROUTED,
           'no_longer_mapped': {}, 'stance_continuity': {}, 'unmatched': {}}
    for name, r in sorted(rows.items()):
        side = json.load(open(os.path.join(build, name + '.json')))
        e = {'state': side.get('state'), 'gate': side.get('gate'), 'source': side.get('src'), 'range_s': side.get('range'), 'sex': side.get('sex'),
             'set': side.get('set'), 'kind': side.get('source_kind'), 'chain': side.get('chain'), 'root_basis': side.get('root_basis'),
             'frame': side.get('frame'), 'authoring': side.get('authoring'), 'qa': 'pass' if r['pass'] else 'fail', 'loop': side.get('loop'),
             'frames': side.get('frames'), 'replaces': side.get('replaces'), 'root_travel': side.get('root_travel'), 'after': side.get('after'),
             'pin_feet': side.get('pin_feet'), 'lead_in': side.get('lead_in'),
             'pairs': [{k: x[k] for k in ('pair', 'sex', 'kind', 'verdict', 'left_cm', 'right_cm', 'left_yaw_deg', 'right_yaw_deg')}
                       for x in r['checks'].get('stance_continuity', [])]}
        if not r['pass']:
            e['fail'] = r['fail']; man['do_not_import'][name] = e; continue
        for ext in ('.fbx', '.fbx.meta', '.json'): shutil.copy2(os.path.join(build, name + ext), os.path.join(stage, name + ext))
        (man['replaced'] if name in v4clips else man['added'])[name] = e
    for ch in man['chains']:
        man['chains'][ch]['frame'] = next((x['frame'] for x in list(man['replaced'].values()) + list(man['added'].values()) if x['chain'] == ch), None)
    # the states: what v4's table (as Core CombatMotion has it) plays, and what v4.1 proposes
    for st, new in V.MAPPING.items():
        old = base_states.get(st)
        if old is None:
            man['proposed_states'][st] = {'men': new[0], 'women': new[1], 'from': new[2], 'cut': new[3], 'loop': new[4]}
            continue
        if tuple(old) == tuple(new): continue
        man['mapping_changes'][st] = {'before': {'men': old[0], 'women': old[1], 'from': old[2], 'cut': old[3]},
                                      'now': {'men': new[0], 'women': new[1], 'from': new[2], 'cut': new[3]}}
    used = {c for v in base_states.values() for c in v[:2] if c}
    now = {c for k, v in base_states.items() for c in (V.MAPPING.get(k, v))[:2] if c} | {c for v in V.MAPPING.values() for c in v[:2] if c}
    for c in sorted(used - now):
        man['no_longer_mapped'][c] = 'stays staged where it is (an alternative take); not in any chain this set matches'
    # the audit, pair by pair: v4 as staged (Unity's first-key anchoring), v4.1 as proposed
    for (p, sx), r in sorted(after.items()):
        b = before.get((p, sx)); f = first.get((p, sx))
        man['stance_continuity'][f'{p} ({sx})'] = {'kind': r['kind'], 'where': r['where'], 'before': brief(b), 'now': brief(r),
                                                   'now_without_the_import_basis': brief(f) if f and any(x in rows for x in r['clips']) else None}
        if r['kind'] == 'same' and not r['pass']:
            man['unmatched'][f'{p} ({sx})'] = {'clips': r['clips'], 'takes': r['takes'], 'feet_cm': [r['left_cm'], r['right_cm']],
                                               'yaw_deg': [r['left_yaw_deg'], r['right_yaw_deg']]}
        if r['kind'] != 'same' and not r['pass']:
            man.setdefault('would_fail_if_judged', {})[f'{p} ({sx})'] = {'kind': r['kind'], 'takes': r['takes'], 'feet_cm': [r['left_cm'], r['right_cm']],
                                                                         'yaw_deg': [r['left_yaw_deg'], r['right_yaw_deg']]}
    json.dump(man, open(os.path.join(stage, 'MANIFEST.json'), 'w'), indent=1)
    shutil.copy2(qa, os.path.join(stage, 'clip_qa.json'))
    shutil.copy2(qa_stance, os.path.join(stage, 'stance_continuity.json'))
    if audit_before and audit_before != '-': shutil.copy2(audit_before, os.path.join(stage, 'stance_continuity_before.json'))
    if audit_first and audit_first != '-': shutil.copy2(audit_first, os.path.join(stage, 'stance_continuity_first_basis.json'))
    same = [x for x in after.values() if x['kind'] == 'same']
    print(f"staged {len(man['replaced'])} replaced + {len(man['added'])} added; do not import: {sorted(man['do_not_import'])}; "
          f"G13 one-class pairs passing {sum(x['pass'] for x in same)} of {len(same)} (before: "
          f"{sum(x['pass'] for x in before.values() if x['kind'] == 'same')} of {sum(1 for x in before.values() if x['kind'] == 'same')})")


if __name__ == '__main__':
    main()
