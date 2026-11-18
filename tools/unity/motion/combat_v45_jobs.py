"""Combat set v4.5 (docs/COMBAT_ANIMATION_STANDARD.md G13, S19, S17): a small delta over v4.4. numpy only (no bpy).

    python3 -I tools/unity/motion/combat_v45_jobs.py plan <plan.json> [<frames.json>]   # without frames: pass 1, the takes' raw frames
    python3 -I tools/unity/motion/combat_v45_jobs.py frames <pass-1 dump> <pass-1 json> <v4.2 build dump> <v4.2 build json> <frames.json>
    python3 -I tools/unity/motion/combat_v45_jobs.py mapping <v4.4 mapping.json> <out mapping.json>

(1) The throws from a still stance to a still stance (the decision of 2026-11-18: a real throw from a ready takes that long;
    G3's 2.3 s is a pacing number): men CMU 143_20 5.85-10.25 s (his ready, 4.82-6.03 s, through the wind-up, the throw
    and his recovery to his ready again, 10.07 s; mirrored to the right hand as v4), women CMU 111_33 4.85-8.50 s (her
    stance 3.83-5.02 s to her still stance from 8.32 s). Each resolves at its release (`resolve_at: release`: CombatMotion
    resolves the throw there and the next turn may start; the recovery plays on, and the next order may blend it out),
    so the design pace holds the start to the release (timing 'throw_release') and the recovery is the capture's own.
(2) The break from the crouched hold into a run (cover_leave) set on the hold's feet, as v4.4's rises: ACCAD Male2_C27 and
    Female1_C27 (the holds' actors), each written in its hold's frame (fit) with its first key's feet set on the hold's
    until each foot first steps (settle_in, built); root motion applied as v4's.
"""
import json, math, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import combat_v4_jobs as J
import combat_v44_jobs as V4

CMU_EXTRA = ['/home/user/second-face-staging/motion/raw/cmu']


def _v4(base, **kw):
    d = dict(next(j for j in J.JOBS if j['name'] == base)); d.update(kw)
    return d


JOBS = [
    _v4('throw_overhand_m_cmu', name='throw_full_m_cmu', range=(5.85, 10.25), root_apply=True, timing='throw_release', resolve_at='release',
        replaces=['throw_overhand_m_cmu', 'throw_rec_m_cmu'],
        kind="overhand throw from his ready to his ready (a man, CMU 143_20: his left-handed throw mirrored to the right): "
             "wind-up, release, recovery"),
    _v4('throw_overhand_b_f_cmu', name='throw_full_f_cmu', range=(4.85, 8.5), root_apply=True, timing='throw_release', resolve_at='release',
        replaces=['throw_overhand_cmu', 'throw_overhand_b_f_cmu', 'throw_rec_f_cmu'],
        kind="overhand throw, right hand, from a still stance to a still stance (woman, CMU 111_33): wind-up, release, recovery"),
    J.B('cover_leave_m_built', dict(db='accad', src='Male2_C27_CrouchToRun', face='travel', set='m'), {}, state='S17', gate='crouch',
        weapon=J.ANY, root=True, root_apply=True, fit='crouch_rifle_built', chain='cover_m', replaces=['crouch_to_run_accad'],
        kind="break from the crouched hold into a run (a man; built on ACCAD Male2_C27, the holds' actor: its first key's feet set on the hold's); travels"),
    J.B('cover_leave_f_built', dict(db='accad', src='Female1_C27_CrouchToRun1', face='travel', set='f'), {}, state='S17', gate='crouch',
        weapon=J.ANY, root=True, root_apply=True, fit='crouch_rifle_f_built', chain='cover_f', replaces=['crouch_to_run_f_accad'],
        kind="break from the crouched hold into a run (woman; built on ACCAD Female1_C27: her first key's feet set on the hold's); travels"),
]


def frames_from(p1_dump, p1_json, ref_dump, ref_json):
    """As combat_v44_jobs.frames_from, for this set's fitted clips."""
    keep = V4.JOBS
    try:
        V4.JOBS = [d for d in JOBS if d.get('fit')]
        return V4.frames_from(p1_dump, p1_json, ref_dump, ref_json)
    finally:
        V4.JOBS = keep


def plan(frames=None):
    J.CMU_DIRS[:] = list(dict.fromkeys(J.CMU_DIRS + CMU_EXTRA))
    res = []
    for d in JOBS:
        d = dict(d)
        if d.get('fit'):
            if frames:
                f = dict(frames[d['name']]); d['settle_in'] = dict(f.pop('settle_in'), swing='carry'); d['frame'] = f
            else:
                d['frame'] = dict(yaw=0.0, origin=[0.0, 0.0], ref="pass 1: the take's raw frame")
        m = J.load(d['db'], d['src'])
        if m is None: d['missing'] = True; res.append(d); continue
        r = d.get('range') or (0.0, round((m.n - 1) / m.fps, 3))
        d['range'] = [float(r[0]), float(r[1])]
        if d['db'] == 'cmu':
            subj = d['src'].split('_')[0]
            if subj in J.LABEL and 'sex' not in d: d['sex'], d['sex_source'] = J.LABEL[subj]
        ev, tm = J.events(m, d.get('events'), d['range'], d.get('mirror'))
        if ev: d['events_frames'] = ev
        if tm: d['timing_measured'] = tm
        d['src_fps'] = round(m.fps, 3); d['stature_est_m'] = m.meta.get('stature_est')
        res.append(d)
    return res


MAPPING = {
    'throw': ['throw_full_m_cmu', 'throw_full_f_cmu', 0.0, 0.97, False],      # (left in the still stance; resolved at the release)
    'cover_leave': ['cover_leave_m_built', 'cover_leave_f_built', 0.0, 0.3, False],
}


def mapping(prev):
    st = dict(prev['states']); st.update(MAPPING)
    return {'states': st, 'routed': prev['routed']}


if __name__ == '__main__':
    a = sys.argv[1:]
    if a[0] == 'plan':
        fr = json.load(open(a[2])) if len(a) > 2 else None
        p = plan(fr); json.dump(p, open(a[1], 'w'), indent=1)
        print(f"{len(p)} jobs, {'final frames' if fr else 'pass 1 (raw frames)'}; missing: {[d['name'] for d in p if d.get('missing')]}")
    elif a[0] == 'frames':
        fr = frames_from(a[1], a[2], a[3], a[4]); json.dump(fr, open(a[5], 'w'), indent=1)
        for k, v in fr.items(): print(k, f"yaw {math.degrees(v['yaw']):.1f}°", 'fit residual cm (L ankle, L toe, R ankle, R toe)', v.get('fit_residual_cm'))
    elif a[0] == 'mapping':
        mp = mapping(json.load(open(a[1]))); json.dump(mp, open(a[2], 'w'), indent=1); print('mapping written:', len(mp['states']), 'states')
