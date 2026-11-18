"""Combat set v4.2 (docs/COMBAT_ANIMATION_STANDARD.md G13): the chains v4.1 left unmatched, re-staged the same way (one take's
captured stance per chain, each chain in its take's frame, imported based upon Original: `root_basis: take`). A delta over v4.1.
numpy only (no bpy).

    python3 -I tools/unity/motion/combat_v42_jobs.py plan <plan.json> [<frames.json>]   # without frames: pass 1, the takes' raw frames
    python3 -I tools/unity/motion/combat_v42_jobs.py frames <pass-1 dump dir> <pass-1 json dir> <frames.json>
    python3 -I tools/unity/motion/combat_v42_jobs.py pins <pass-2 dump dir> <pass-2 json dir> <pins.json>   # then plan ... frames pins
    python3 -I tools/unity/motion/combat_v42_jobs.py mapping <mapping.json>             # v4.1's proposed mapping with v4.2's over it

Why v4's blows part from their guard (the audit): each ACCAD Male2 blow is its own take, its guard a fifth's (D4), and the
actor set his stance anew in every take (the stances' shapes differ by 2-30 cm and up to 50° after the best rigid fit); the
women's guard (CMU 144_13 0.9-2.25 s) was cut while she stepped her rear foot back into her stance (0.7-1.1 s), and every jab
of that take pumps her lead foot out 2-8 cm (the take never holds its guard still). So the blows here come from takes that
hold one stance between blows, each cut from the guard before it to the guard after it (the take's own recovery):
  guard_m  CMU 143_23 ("Punching", a man by his capture file's label): eight rising punches, left and right, the feet planted
           on one stance from 3.8 s to the end (and before, but for the hook's pivot), the guard held 0.4-0.7 s between blows.
  guard_f  CMU 144_21 ("Punch_Sequence001", subject 144, "punching female"): right punches every half second on planted
           feet; her guard holds still only once, 13.62-13.85 s, after the last punch (the guard idle, forward and back).
           No left punch of hers shares a take with a still guard: the women's jab stays unmatched. Her punches start with the
           rear foot still turned from the punch before: their first keys are set on her guard's feet (lead_in, built).
           (Her two-handed club and the men's blade blows were tried on these takes and fail clip QA: not staged.)
  cover_m, cover_f  ACCAD Male2_A7_Crouch, Female1_A07_Crouch: the crouch-down applies its root motion (as CombatMotion says:
           RootXZ.Apply), so the holds that follow it are written where its root stands at its cut: the frame's origin at the
           crouch-down's centre of mass at that key, +Z the body orientation at its first key (Unity bakes its turn there).
"""
import json, math, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import combat_v4_jobs as J
import combat_v41_jobs as V1

G143 = dict(db='cmu', src='143_23', range=(7.45, 8.10), loop='pingpong_ease', face='mean', set='m')
G144 = dict(db='cmu', src='144_21', range=(13.62, 13.85), loop='pingpong_ease', face='mean', set='f')
CHAINS = {
    'guard_m': dict(take='CMU 143_23', rule='anchor', ref='guard_m_built',
                    note="origin and +Z: guard_m_built's first-key centre of mass and body orientation"),
    'guard_f': dict(take='CMU 144_21', rule='anchor', ref='guard_f2_built',
                    note="origin and +Z: guard_f2_built's first-key centre of mass and body orientation"),
    'cover_m': dict(take='ACCAD Male2_A7_Crouch', rule='after', ref='crouch_down_accad', cut=0.92,
                    note="origin: crouch_down_accad's centre of mass at its cut (0.92), where its applied root motion leaves the root; "
                         "+Z: its first key's body orientation (its turn is baked there)"),
    'cover_f': dict(take='ACCAD Female1_A07_Crouch', rule='after', ref='crouch_down_f_accad', cut=0.92,
                    note="origin: crouch_down_f_accad's centre of mass at its cut (0.92); +Z: its first key's body orientation"),
}


def _v4(name, **kw):
    d = dict(next(j for j in J.JOBS if j['name'] == name)); d.update(kw)
    return d


def blow(name, src, rng, hand, kind, chain, sex):
    return J.J(name, 'cmu', src, range=rng, face='mean', state='S7', gate='strike', kind=kind, weapon='unarmed',
               events=f'strike:{hand}', timing='punch', chain=chain, set=sex)


JOBS = [
    # men: CMU 143_23, the guard and its blows, each from the guard before it to the guard after it
    # (built: the capture's still guard played forward and back, its time eased at the turns, so it no longer follows the
    # capture key by key)
    J.B('guard_m_built', G143, {}, state='S1e', gate='guard',
        kind="unarmed guard, held (a man; built on CMU 143_23's guard between its punches: forward and back, eased at the turns)", weapon='unarmed',
        chain='guard_m', replaces=['fist_guard_accad']),
    blow('fist_jab_m_cmu', '143_23', (0.45, 1.75), 'L', 'lead (left) punch, rising, from the guard back to it (a man, CMU 143_23)', 'guard_m', 'm'),
    blow('fist_cross_m_cmu', '143_23', (1.80, 2.95), 'R', 'rear (right) straight punch from the guard back to it (a man, CMU 143_23)', 'guard_m', 'm'),
    blow('fist_hook_l_m_cmu', '143_23', (3.00, 4.50), 'L', 'left hooking punch (the hand 26 cm across), the feet pivoting and back (a man, CMU 143_23)', 'guard_m', 'm'),
    _v4('fist_uppercut_r_b_cmu', range=(4.50, 6.05), chain='guard_m', set='m', kind='right rising punch from the guard back to it (a man, CMU 143_23)'),
    _v4('fist_uppercut_l_b_cmu', range=(9.25, 10.85), chain='guard_m', set='m', kind='left rising punch from the guard back to it (a man, CMU 143_23)'),
    # (the take's last right punch, 11.43 s, ends with the left foot pivoted 6° off the guard: the rising right at 8.35 s instead)
    blow('fist_cross_b_m_cmu', '143_23', (7.95, 9.30), 'R', 'rear (right) rising straight punch, a second take (a man, CMU 143_23)', 'guard_m', 'm'),
    # women: CMU 144_21, her one still guard and the punches on the same planted feet
    J.B('guard_f2_built', dict(G144, stretch=2.0), {}, state='S1e', gate='guard',
        kind="unarmed guard, held (woman; built on CMU 144_21's guard after her last punch, the only still guard of hers: 0.23 s, "
             "forward and back at half speed, eased at the turns)", weapon='unarmed', chain='guard_f', replaces=['guard_f_cmu']),
    # (her sequence's last cross: its recovery is the take's return into her guard; its first key is the sequence's, the rear
    # foot still turned from the punch before: set on her guard's feet and blended into the capture's by the impact, lead_in)
    J.B('fist_cross_c_f_built', dict(db='cmu', src='144_21', range=(13.18, 13.82), face='mean', set='f'), {}, state='S7', gate='strike',
        kind="cross (right) from her guard into it (woman; built on CMU 144_21's last cross: its first key's feet on her guard's)", weapon='unarmed',
        events='strike:R', timing='punch', chain='guard_f', lead='guard_f2_built', replaces=['fist_cross_f_cmu'])
    ,
    J.B('melee_forehand_f2_built', dict(db='cmu', src='144_21', range=(13.18, 13.82), face='mean', set='f'), dict(op='arc', model='machete', cut='slash'),
        state='S6a', gate='strike', kind="one-handed forehand slash (woman; built on CMU 144_21's cross, her guard's take)", weapon=J.BLADE,
        events='strike:R', timing='punch', chain='guard_f', lead='guard_f2_built', replaces=['melee_forehand_f_built']),
    J.B('melee_thrust_f2_built', dict(db='cmu', src='144_21', range=(13.18, 13.82), face='mean', set='f'), dict(op='arc', model='knife', cut='thrust'),
        state='S6a', gate='strike', kind="one-handed thrust (woman; built on CMU 144_21's last cross, her guard's take)", weapon=J.BLADE,
        events='strike:R', timing='punch', chain='guard_f', lead='guard_f2_built', replaces=['melee_thrust_f_built']),
    # (the women's two-handed club on this take was tried: its ready and thrust stand together within 0.7 cm and 2.7°, but the
    # thrust built on her sequence's cross loses its delivery in the two-handed fit, the haft's main hand 1.4 m/s at the
    # clip's first keys and its impact unreadable: timing fails, so it is not staged; the men's blade blows built on CMU
    # 143_23 put the pommel 3-7 cm into the chest at his boxer's guard: C1 fails; both stay v4's, unmatched)
    # cover: the crouch-down as v4 (its root motion applied), the holds written where its root stands at its cut
    _v4('crouch_down_accad', chain='cover_m', travel_into='crouch_rifle_built, crouch_hold_built'),
    _v4('crouch_down_f_accad', chain='cover_f', travel_into='crouch_rifle_f_built, crouch_hold_f_built'),
    _v4('crouch_rifle_built', chain='cover_m', after='crouch_down_accad'),
    _v4('crouch_rifle_f_built', chain='cover_f', after='crouch_down_f_accad'),
    # (built: the captured crouch of the same take with its ankles set where the crouch-down leaves them, pins_from)
    J.B('crouch_hold_built', J.CROUCH_M, {}, state='S16', gate='crouch', kind="crouched hold, wary (built on ACCAD Male2_A7_Crouch's own crouch after its crouch-down)",
        weapon='any', chain='cover_m', after='crouch_down_accad', replaces=['ready_crouch_cmu']),
    J.B('crouch_hold_f_built', J.CROUCH_F, {}, state='S16', gate='crouch', kind="crouched hold, wary (woman; built on Female1_A07_Crouch's own crouch after her crouch-down)",
        weapon='any', chain='cover_f', after='crouch_down_f_accad', replaces=['ready_crouch_cmu']),
]

# the states v4.2 proposes over v4.1 (stance_continuity.STATES' form) and the routing (the strike pools: Core CombatMotion.Strike)
MAPPING = {
    'unarmed_idle': ['guard_m_built', 'guard_f2_built', 0.0, 1.0, True],
    'melee_idle': ['fist_guard_accad', 'guard_f2_built', 0.0, 1.0, True],     # (men's one-handed weapons stay v4's)
    'unarmed_jab': ['fist_jab_m_cmu', None, 0.0, 0.9, False],          # (men only now: no woman's jab shares a still guard's take)
    'unarmed_cross': ['fist_cross_m_cmu', 'fist_cross_c_f_built', 0.0, 0.9, False],
    'unarmed_cross_b': ['fist_cross_b_m_cmu', None, 0.0, 0.9, False],   # proposed: a second right (men; G2)
    'unarmed_hook_l': ['fist_hook_l_m_cmu', None, 0.0, 0.9, False],
    'unarmed_uppercut_l': ['fist_uppercut_l_b_cmu', None, 0.0, 0.9, False],
    'unarmed_uppercut_r': ['fist_uppercut_r_b_cmu', None, 0.0, 0.9, False],
    'melee_slash': ['melee_forehand_built', 'melee_forehand_f2_built', 0.0, 0.9, False],
    'melee_strike': ['melee_thrust_built', 'melee_thrust_f2_built', 0.0, 0.92, False],
    'cover_hold': ['crouch_hold_built', 'crouch_hold_f_built', 0.0, 1.0, True],
    'cover_hold_long': ['crouch_rifle_built', 'crouch_rifle_f_built', 0.0, 1.0, True],
}
# the pools (CombatMotion.MenBlows, WomenBlows) the game draws blows from: men jab, cross, cross_b, hook_l, uppercut_l, uppercut_r
# (unarmed_hook_r leaves the pool: CMU 143_23 throws no right hook; the state stays v4's ACCAD hook, unmatched); women cross
# (unarmed_jab leaves the women's pool). CombatMotion.Miss: a man's unarmed miss slips (no block shares 143_23's take: the block
# stays ACCAD Male2's, played with one-handed weapons, whose guard stays v4's)
ROUTED = {
    'remove': [('unarmed_idle', 'unarmed_hook_r'), ('unarmed_hook_r', 'unarmed_idle'), ('unarmed_idle', 'unarmed_combo'), ('unarmed_combo', 'unarmed_idle'),
               ('unarmed_idle', 'unarmed_block'), ('unarmed_block', 'unarmed_idle')],
    'remove_sex': [('unarmed_idle', 'unarmed_jab', 'f'), ('unarmed_jab', 'unarmed_idle', 'f')],
    'add': [('unarmed_idle', 'unarmed_cross_b', 'same', 'OnStrike (the proposed second right, men)', 'm'),
            ('unarmed_cross_b', 'unarmed_idle', 'same', "the blow's recovery (men)", 'm'),
            ],
}


def mapping():
    """v4.1's proposal with v4.2's over it, in stance_continuity.with_mapping's form."""
    st = dict(V1.MAPPING); st.update(MAPPING)
    rm = list(V1.ROUTED['remove']) + list(ROUTED['remove'])
    add = list(V1.ROUTED['add']) + list(ROUTED['add'])
    return {'states': st, 'routed': {'remove': rm, 'add': add, 'remove_sex': ROUTED['remove_sex']}}


def frames_from(dump_dir, json_dir):
    import stance_continuity as SC
    out = {}
    for ch, c in CHAINS.items():
        A = SC.clip_feet([dump_dir], [json_dir], c['ref'], basis='first')
        if A is None: raise SystemExit(f'{ch}: no pass-1 dump of {c["ref"]}')
        m, j, (o, yaw), _ = A
        fr = dict(ref=c['ref'], note=c['note'], take=c['take'])
        if c['rule'] == 'after':
            k = int(round(c['cut'] * (m.n - 1))); cm = SC.com(m, k)
            o = np.array([cm[0], 0.0, cm[2]])
            # where the root stands at the cut, in the crouch-down's own root frame (Unity: its first key's centre of mass and turn)
            o0, y0 = SC.anchor(m); d = SC.to_anchor(o, (o0, y0))
            fr.update(cut=c['cut'], key=k, root_at_cut_m=[round(float(d[0]), 4), round(float(d[2]), 4)],
                      root_after_end_m=[round(float(x), 4) for x in SC.to_anchor(np.array([SC.com(m, m.n - 1)[0], 0.0, SC.com(m, m.n - 1)[2]]), (o0, y0))[[0, 2]]])
        fr.update(yaw=-yaw, origin=[float(o[0]), float(o[2])])
        out[ch] = fr
    return out


def pins_from(dump_dir, json_dir):
    """Each cover hold's ankles where its crouch-down leaves them at its cut, in the hold's frame (the crouch-down's root at
    that key): the crouch-down and the hold, one take, stand within 1 cm of each other there as captured, but each clip's
    own planting held its contact points from its own first key (1.5-6 cm apart, pass 2)."""
    import stance_continuity as SC
    out = {}
    for d in JOBS:
        if not d.get('after'): continue
        c = CHAINS[d['chain']]
        A = SC.clip_feet([dump_dir], [json_dir], d['after'])
        m = A[0]; k = SC.key_at(m, c['cut']); anc = SC.at_key(A, k)
        pin = {s: [float(v) for v in SC.to_anchor(m.P[s + 'Foot'][k], anc)] for s in ('Left', 'Right')}
        pin['from'] = f"{d['after']} at its cut ({c['cut']}, key {k})"
        out[d['name']] = pin
    return out


def leads_from(dump_dir, json_dir):
    """Each lead-in's targets: the guard's first-key ankles and toe joints in the shared frame (both clips root_basis: take)."""
    import stance_continuity as SC
    out = {}
    for d in JOBS:
        if not d.get('lead'): continue
        m = SC.load([dump_dir], d['lead'])
        pin = {s: {'ankle': [float(v) for v in m.P[s + 'Foot'][0]], 'toe': [float(v) for v in m.P[s + 'Toes'][0]]} for s in ('Left', 'Right')}
        pin['from'] = d['lead']
        out[d['name']] = pin
    return out


def plan(frames=None, pins=None):
    res = []
    for d in JOBS:
        d = dict(d); ch = d['chain']
        if pins and d['name'] in pins: d['pin_feet'] = pins[d['name']]
        if pins and d['name'] in pins.get('_leads', {}): d['lead_in'] = dict(pins['_leads'][d['name']])
        framed = not d.get('travel_into')     # the crouch-downs keep Unity's own placement (their root motion applied)
        if framed or not frames:
            d['frame'] = dict(frames[ch]) if frames else dict(yaw=0.0, origin=[0.0, 0.0], ref="pass 1: the take's raw frame")
        if d.get('travel_into') and frames:
            f = frames[ch]
            d['root_travel'] = {'applied': True, 'basis': 'centre of mass and body orientation at the first key (as imported now)',
                                'cut': f['cut'], 'root_at_cut_m': f['root_at_cut_m'], 'root_at_end_m': f['root_after_end_m'],
                                'then': d['travel_into'],
                                'note': "the holds that follow are written with their origin where this clip's root stands at its cut "
                                        "(root_basis: take): import this clip as now (root motion applied), the holds based upon Original"}
        m = J.load(d['db'], d['src'])
        if m is None: d['missing'] = True; res.append(d); continue
        r = d.get('range')
        if r is None: r = (0.0, round((m.n - 1) / m.fps, 3))
        elif isinstance(r, str): r = J.auto_range(m, r)
        d['range'] = [float(r[0]), float(r[1])]
        if d['db'] == 'cmu':
            subj = d['src'].split('_')[0]
            if subj in J.LABEL and 'sex' not in d: d['sex'], d['sex_source'] = J.LABEL[subj]
        ev, tm = J.events(m, d.get('events'), d['range'], d.get('mirror'))
        if ev: d['events_frames'] = ev
        if tm: d['timing_measured'] = tm
        # (blended over the blow to its cut, 0.9: within its impact the shift is a planted foot's 0.15 m/s, over the blow 0.06)
        if d.get('lead_in'): d['lead_in']['until_s'] = round(0.9 * (d['range'][1] - d['range'][0]), 3)
        d['src_fps'] = round(m.fps, 3); d['stature_est_m'] = m.meta.get('stature_est')
        res.append(d)
    return res


if __name__ == '__main__':
    a = sys.argv[1:]
    if a[0] == 'plan':
        fr = json.load(open(a[2])) if len(a) > 2 else None
        pins = json.load(open(a[3])) if len(a) > 3 else None
        p = plan(fr, pins)
        json.dump(p, open(a[1], 'w'), indent=1)
        print(f"{len(p)} jobs, {'final frames' if fr else 'pass 1 (raw frames)'}; missing: {[d['name'] for d in p if d.get('missing')]}")
    elif a[0] == 'frames':
        fr = frames_from(a[1], a[2])
        json.dump(fr, open(a[3], 'w'), indent=1)
        for k, v in fr.items(): print(k, f"yaw {math.degrees(v['yaw']):.2f}°", 'origin', [round(x, 4) for x in v['origin']], v.get('root_at_cut_m', ''))
    elif a[0] == 'pins':
        pn = pins_from(a[1], a[2]); pn['_leads'] = leads_from(a[1], a[2])
        json.dump(pn, open(a[3], 'w'), indent=1)
        for k, v in pn.items():
            if k != '_leads': print(k, v['from'], {s: [round(x, 3) for x in v[s]] for s in ('Left', 'Right')})
        print('lead-ins:', sorted(pn['_leads']))
    elif a[0] == 'mapping':
        json.dump(mapping(), open(a[1], 'w'), indent=1)
        print('mapping written:', len(mapping()['states']), 'states')
