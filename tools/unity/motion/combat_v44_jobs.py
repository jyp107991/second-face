"""Combat set v4.4 (docs/COMBAT_ANIMATION_STANDARD.md G13): the free states cut through their own recovery, the stand-ups
from each crouched hold. A delta over v4.3. numpy only (no bpy).

    python3 -I tools/unity/motion/combat_v44_jobs.py plan <plan.json> [<frames.json>]   # without frames: pass 1, the takes' raw frames
    python3 -I tools/unity/motion/combat_v44_jobs.py frames <pass-1 dump> <pass-1 json> <v4.2 build dump> <v4.2 build json> <frames.json>
    python3 -I tools/unity/motion/combat_v44_jobs.py mapping <v4.2 mapping.json> <out mapping.json>

(1) The throws, through their own recovery to a still stance (2026-11-18, still stances found where both feet stay under
    0.12 m/s for 0.12 s):
      men   CMU 143_20, his second throw (mirrored to the right hand as v4): the take's last still stance, 10.07-10.82 s, is
            his ready again (4° from the throw's first key's body orientation; v4's cut, 9.2 s, ended 13° turned in a
            0.13 s pause); cut 7.65-10.25 s. His first throw, 2.45-4.95 s, ends in the ready he holds 4.82-6.03 s.
      women CMU 113_24 (v4's) never comes back: after each throw she holds the follow-through, the right foot 29-38 cm ahead
            (3.71-5.47, 8.12-9.20 s), and throws again; CMU 111_33 (v4's second take) comes back to a still stance,
            8.32-13.98 s (the feet 26 cm apart, the right 18 cm ahead): cut 5.95-8.50 s.
    The slips: ACCAD Male2_E19 (dodge left) holds one stance through the whole take (its feet never move: there is no
    recovery to cut, the take is 2.57 s and v4 plays all of it); Male2_E20 (dodge right) ends in its still stance
    (1.63-2.80 s) as v4 cut it. What parts them from the men's guard is the actor's stance (ACCAD Male2's, 56 cm wide)
    against CMU 143_23's guard (v4.2), not a cut. The duck: CMU 77_09 (sex not recorded) is down by 4.1 s and up and still
    again by 8.30 s; v4's clip runs 3.4-8.6 s, but the state left it at 0.3 (still crouched, hips 0.51 m): the state now
    plays it to 0.95 (8.34 s, standing). The men's own duck, ACCAD Male2_E21 (v4's duck_accad), is down and up again in
    1.1 s, still at both ends (0-0.77, 1.90-2.73 s), and is set on the men's guard (settle_in below). The women's: CMU
    144_20 and 144_21 (subject 144, the women's guard's actor) bob down to hips 0.48-0.58 m from her guard and back.
(2) The stand-ups, from each crouched hold (a rise 'fit' onto its hold: the clip's frame chosen so its first key's feet lie
    on the hold's, the rest by settle_in):
      men   ACCAD Male2_D13_CrouchToReady (the cover holds' actor, Male2): crouched and still 0-0.83 s, up 1.23-2.37 s,
            still 2.77-3.73 s.
      women every take on disk was mined (combat_v44_jobs history: 205 takes; a still crouch or kneel, hips under 0.70 of
            the take's standing height, then a still standing stance within 4 s): women's rises in CMU 114_05 (two, from
            a squat, the feet planted throughout), 114_11 and 114_02 (up from the floor through a kneel), 144_20/144_21
            (from a deep bob in her guard). ACCAD Female1's takes have none (A07 ends crouched; B25 and C27 rise into a
            walk or a run). The rise is cut from 114_05: a woman's (CMU subject 114, "pregnant woman").
    A long gun's rise is the same capture with the gun held by IK, its hold carried from LongGunCrouched to LongGunReady.
"""
import json, math, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import combat_v4_jobs as J
import combat_v42_jobs as V2

CMU_EXTRA = ['/home/user/second-face-staging/motion/raw/cmu']


def _v4(base, **kw):
    d = dict(next(j for j in J.JOBS if j['name'] == base)); d.update(kw)
    return d


def rise(name, db, src, rng, sex, ref, chain, kind, **kw):
    return J.J(name, db, src, range=rng, face='mean', state='S17', gate='crouch', timing='crouch', weapon=J.ANY, set=sex, fit=ref,
               chain=chain, kind=kind, **kw)


RISE_M = dict(db='accad', src='Male2_D13_CrouchToReady', range=(0.45, 3.2), face='mean', set='m')
RISE_F = dict(db='cmu', src='114_05', range=(12.9, 14.45), face='mean', set='f')
LONG = dict(op='hold', hold='LongGunCrouched', hold_to='LongGunReady', model='rifle_auto', blend=(0.15, 0.85))

JOBS = [
    # (1) the throws through their own recovery (root motion applied, as v4's)
    _v4('throw_overhand_m_cmu', name='throw_rec_m_cmu', range=(7.65, 10.25), root_apply=True, replaces=['throw_overhand_m_cmu'],
        kind="overhand throw (a man, CMU 143_20: his left-handed throw mirrored to the right), through his recovery to his ready"),
    _v4('throw_overhand_m_b_cmu', name='throw_rec_m_b_cmu', range=(2.45, 4.95), root_apply=True, replaces=['throw_overhand_m_b_cmu'],
        kind="overhand throw, a second take (a man, CMU 143_20, mirrored), through his recovery to his ready"),
    _v4('throw_overhand_b_f_cmu', name='throw_rec_f_cmu', range=(5.95, 8.5), root_apply=True, replaces=['throw_overhand_cmu', 'throw_overhand_b_f_cmu'],
        kind="overhand throw, right hand (woman, CMU 111_33), through her recovery to a still stance"),
    # the ducks, each set on its guard's feet (settle_in)
    J.J('duck_m_accad', 'accad', 'Male2_E21_DuckLeft', range=(0.0, 2.733), face='mean', state='S9', gate='dodge', weapon=J.ANY, events='dodge',
        set='m', fit='guard_m_built', chain='guard_m', replaces=['duck_cmu'],
        kind="duck under a swing and up again to a still stance (a man, ACCAD Male2), its feet set on the men's guard"),
    J.J('duck_f_cmu', 'cmu', '144_20', range=(7.7, 11.4), face='mean', state='S9', gate='dodge', weapon=J.ANY, events='dodge',
        set='f', fit='guard_f2_built', chain='guard_f', replaces=['duck_cmu'],
        kind="bob down under a swing and up again (woman, CMU 144_20: the guard's actor), her feet set on her guard's"),
    J.J('duck_f_b_cmu', 'cmu', '144_21', range=(8.6, 11.95), face='mean', state='S9', gate='dodge', weapon=J.ANY, events='dodge',
        set='f', fit='guard_f2_built', chain='guard_f', replaces=['duck_cmu'],
        kind="bob down and up again (woman, CMU 144_21: her guard's own take), her feet set on her guard's"),
    # (2) the stand-ups from each crouched hold
    rise('rise_m_accad', 'accad', 'Male2_D13_CrouchToReady', (0.45, 3.2), 'm', 'crouch_hold_built', 'cover_m',
         "up from the crouched hold to standing (a man, ACCAD Male2_D13: the holds' actor), its feet set on the hold's",
         replaces=['crouch_to_guard_accad']),
    rise('rise_f_cmu', 'cmu', '114_05', (12.9, 14.45), 'f', 'crouch_hold_f_built', 'cover_f',
         "up from a squat to standing, the feet planted (woman, CMU 114_05), set on the crouched hold's feet"),
    rise('rise_f_b_cmu', 'cmu', '114_05', (18.95, 20.1), 'f', 'crouch_hold_f_built', 'cover_f',
         "up from a squat to standing, a second rise (woman, CMU 114_05), set on the crouched hold's feet"),
    rise('rise_f_c_cmu', 'cmu', '114_11', (17.9, 19.85), 'f', 'crouch_hold_f_built', 'cover_f',
         "up from a kneel to standing (woman, CMU 114_11), set on the crouched hold's feet"),
    J.B('rise_long_m_built', RISE_M, LONG, state='S17', gate='crouch', timing='crouch', weapon='long', fit='crouch_rifle_built', chain='cover_m',
        kind="up from the crouched hold with the long gun (a man; built on ACCAD Male2_D13's rise: the gun held by IK, crouched to the low ready)"),
    J.B('rise_long_f_built', RISE_F, LONG, state='S17', gate='crouch', timing='crouch', weapon='long', fit='crouch_rifle_f_built', chain='cover_f',
        kind="up from the crouched hold with the long gun (woman; built on CMU 114_05's rise: the gun held by IK, crouched to the low ready)"),
]


def _fit2d(q, h, w):
    """yaw (rad, about +Y as combat_v4.build_framed turns: x' = x cos + z sin, z' = -x sin + z cos) and origin (x, z) with
    Y(yaw) (q - origin) ~ h, weighted least squares (q, h: (k, 2) ground points)."""
    w = np.asarray(w, float)[:, None]
    qc = (q * w).sum(0) / w.sum(); hc = (h * w).sum(0) / w.sum()
    best = None
    for a in np.radians(np.arange(-180.0, 180.0, 0.05)):
        c, s = math.cos(a), math.sin(a)
        Rq = np.stack([q[:, 0] * c + q[:, 1] * s, -q[:, 0] * s + q[:, 1] * c], 1)
        Rqc = np.array([qc[0] * c + qc[1] * s, -qc[0] * s + qc[1] * c])
        t = hc - Rqc; e = float((w[:, 0] * ((Rq + t - h) ** 2).sum(1)).sum())
        if best is None or e < best[0]: best = (e, a, t)
    _, a, t = best; c, s = math.cos(a), math.sin(a)
    o = -np.array([t[0] * c - t[1] * s, t[0] * s + t[1] * c])      # o = -Y^-1 t
    return a, o


def frames_from(p1_dump, p1_json, ref_dump, ref_json):
    """Each fitted clip's frame (its first key's ankles and toe joints onto its hold's or guard's first key, the ankles
    weighted twice the toes) and its settle_in targets (the hold's feet in that frame)."""
    import stance_continuity as SC
    out = {}
    for d in JOBS:
        if not d.get('fit'): continue
        m = SC.load([p1_dump], d['name']); r = SC.load([ref_dump], d['fit'])
        if m is None or r is None: raise SystemExit(f"{d['name']}: no pass-1 dump or no dump of {d['fit']}")
        q = np.array([m.P[s + b][0][[0, 2]] for s in ('Left', 'Right') for b in ('Foot', 'Toes')])
        h = np.array([r.P[s + b][0][[0, 2]] for s in ('Left', 'Right') for b in ('Foot', 'Toes')])
        a, o = _fit2d(q, h, [2, 1, 2, 1])
        c, s_ = math.cos(a), math.sin(a)
        res = [float(np.linalg.norm(np.array([(p[0] - o[0]) * c + (p[1] - o[1]) * s_, -(p[0] - o[0]) * s_ + (p[1] - o[1]) * c]) - hh)) for p, hh in zip(q, h)]
        pin = {s: {'ankle': [float(v) for v in r.P[s + 'Foot'][0]], 'toe': [float(v) for v in r.P[s + 'Toes'][0]]} for s in ('Left', 'Right')}
        pin['from'] = d['fit']
        out[d['name']] = dict(yaw=float(a), origin=[float(o[0]), float(o[1])], ref=d['fit'], fit_residual_cm=[round(x * 100, 1) for x in res],
                              note=f"chosen so its first key's feet lie on {d['fit']}'s first key's (chain {d['chain']}), the rest by settle_in",
                              settle_in=pin)
    return out


def plan(frames=None):
    J.CMU_DIRS[:] = list(dict.fromkeys(J.CMU_DIRS + CMU_EXTRA))
    res = []
    for d in JOBS:
        d = dict(d)
        if d.get('fit'):
            if frames:
                f = dict(frames[d['name']]); d['settle_in'] = f.pop('settle_in'); d['frame'] = f
            else:
                d['frame'] = dict(yaw=0.0, origin=[0.0, 0.0], ref="pass 1: the take's raw frame")
        m = J.load(d['db'], d['src'])
        if m is None: d['missing'] = True; res.append(d); continue
        d['range'] = [float(d['range'][0]), float(d['range'][1])]
        if d['db'] == 'cmu':
            subj = d['src'].split('_')[0]
            if subj in J.LABEL and 'sex' not in d: d['sex'], d['sex_source'] = J.LABEL[subj]
        ev, tm = J.events(m, d.get('events'), d['range'], d.get('mirror'))
        if ev: d['events_frames'] = ev
        if tm: d['timing_measured'] = tm
        d['src_fps'] = round(m.fps, 3); d['stature_est_m'] = m.meta.get('stature_est')
        res.append(d)
    return res


# the states v4.4 proposes over v4.2's mapping (stance_continuity.STATES' form: men's clip, women's, from, cut, loop) and the
# routing: a stand from a crouched hold plays the rise first (cover_rise, cover_rise_long), the rise's standing end then
# meets the standing state (a stance change: the re-stance step, v4.3)
MAPPING = {
    'throw': ['throw_rec_m_cmu', 'throw_rec_f_cmu', 0.0, 0.97, False],
    'miss_duck': ['duck_m_accad', 'duck_f_cmu', 0.0, 0.95, False],
    'cover_rise': ['rise_m_accad', 'rise_f_cmu', 0.0, 0.97, False],
    'cover_rise_long': ['rise_long_m_built', 'rise_long_f_built', 0.0, 0.97, False],
    'miss_left': ['dodge_l_accad', None, 0.0, 1.0, False],
}
ROUTED = {
    'remove': [('cover_hold_long', 'rifle_aim'), ('cover_hold_long', 'rifle_idle'), ('cover_hold', 'pistol_aim'), ('cover_hold', 'pistol_idle'),
               ('cover_hold', 'unarmed_idle')],
    'add': [('cover_hold', 'cover_rise', 'same', 'OnStance stand: the rise from the crouched hold'),
            ('cover_rise', 'pistol_idle', 'change', 'the rise into the pistol ready'),
            ('cover_rise', 'pistol_aim', 'change', 'the rise into the pistol aim'),
            ('cover_rise', 'unarmed_idle', 'change', 'the rise into the guard'),
            ('cover_hold_long', 'cover_rise_long', 'same', 'OnStance stand with the long gun: the rise'),
            ('cover_rise_long', 'rifle_idle', 'change', 'the rise into the low ready'),
            ('cover_rise_long', 'rifle_aim', 'change', 'the rise into the aim')],
}


def mapping(prev):
    st = dict(prev['states']); st.update(MAPPING)
    rt = prev['routed']
    return {'states': st, 'routed': {'remove': list(rt['remove']) + [list(x) for x in ROUTED['remove']],
                                     'add': list(rt['add']) + [list(x) for x in ROUTED['add']], 'remove_sex': rt.get('remove_sex', [])}}


if __name__ == '__main__':
    a = sys.argv[1:]
    if a[0] == 'plan':
        fr = json.load(open(a[2])) if len(a) > 2 else None
        p = plan(fr); json.dump(p, open(a[1], 'w'), indent=1)
        print(f"{len(p)} jobs, {'final frames' if fr else 'pass 1 (raw frames)'}; missing: {[d['name'] for d in p if d.get('missing')]}")
    elif a[0] == 'frames':
        fr = frames_from(a[1], a[2], a[3], a[4]); json.dump(fr, open(a[5], 'w'), indent=1)
        for k, v in fr.items(): print(k, f"yaw {math.degrees(v['yaw']):.1f}°", 'fit residual cm (L ankle, L toe, R ankle, R toe)', v['fit_residual_cm'])
    elif a[0] == 'mapping':
        mp = mapping(json.load(open(a[1]))); json.dump(mp, open(a[2], 'w'), indent=1); print('mapping written:', len(mp['states']), 'states')
