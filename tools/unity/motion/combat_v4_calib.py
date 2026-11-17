"""Combat v4 calibration: the gate's measures on real actors for the combat states the standard asks the gate to hold
(docs/COMBAT_ANIMATION_STANDARD.md §5; docs/qa/motion_calibration.md §8, as proposals: none applied). numpy only.

    python3 -I tools/unity/motion/combat_v4_calib.py <out.json>

Per state, at least three real actors where the free captures hold them (the trials below, at their true rates; the cuts
are the v4 jobs'): aim (long gun: CMU 79 and 80, 100STYLE's actor), strike per weapon class (unarmed: ACCAD Male2, CMU 144,
141, 113, 143; two-handed: CMU 79, 80, 124; one-handed weapon: none captured), guard (ACCAD Male2 and its footwork, CMU 144,
CMU 13), dodge (ACCAD Male2, Male1, Female1, CMU 77), peek and full cover (100STYLE's leans: one actor; the standing holds
of ACCAD Male1, Male2, Female1), prone and crawl (ACCAD Male1, Male2, Female1), turn (ACCAD Male1, Male2, Female1), fall
(CMU 90: one actor, an acrobat; the deliberate drops to prone of ACCAD Male1, Male2, Female1), rise (CMU 140, 77, 111, 113,
114; ACCAD Male2, Female1). The measures are combat_states.per_frame's (the gate's own definitions: K1, Kmax, H1, H2, H3, F2h,
F3w, A1, A2) and, where a state needs them, the trunk's lean from the vertical (TL, deg), the hips' height (Hy, cm), the
head's lead over the pelvis in a turn (HL, deg), the turn's rate (TR, deg/s), the release-to-impact time of a fall (FT, s).
"""
import json, math, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', '..', 'qa', 'calibration'))
import combat_states as CS
import combat_v4_jobs as J

# (state, db, trial, (t0, t1) or None, sex, which frames: 'all' | 'strike' | 'guard' | 'lie' | 'turn' | 'fall')
TRIALS = [
    ('aim', 'cmu', '79_96', (4.1, 6.9), 'u', 'all'), ('aim', 'cmu', '80_03', (4.3, 6.6), 'u', 'all'), ('aim', 'style', 'Swat_ID', (9.0, 14.0), 'u', 'all'),
    ('strike_2h', 'cmu', '79_01', (0.8, 6.6), 'u', 'strike'), ('strike_2h', 'cmu', '80_71', (1.0, 15.0), 'u', 'strike'), ('strike_2h', 'cmu', '124_07', (2.0, 9.9), 'u', 'strike'),
    ('strike_unarmed', 'accad', 'Male2_E1_JabLeft', None, 'm', 'strike'), ('strike_unarmed', 'accad', 'Male2_E4_CrossRight', None, 'm', 'strike'),
    ('strike_unarmed', 'accad', 'Male2_E5_HookLeft', None, 'm', 'strike'), ('strike_unarmed', 'accad', 'Male2_E6_HookRight', None, 'm', 'strike'),
    ('strike_unarmed', 'accad', 'Male2_E9_BodyHookLeft', None, 'm', 'strike'), ('strike_unarmed', 'accad', 'Male2_E12_BackfistRight', None, 'm', 'strike'),
    ('strike_unarmed', 'accad', 'Male2_E14_BodyCrossRight', None, 'm', 'strike'), ('strike_unarmed', 'cmu', '143_23', (0.5, 12.2), 'm', 'strike'),
    ('strike_unarmed', 'cmu', '144_13', (0.5, 14.0), 'f', 'strike'), ('strike_unarmed', 'cmu', '144_20', (0.5, 12.0), 'f', 'strike'),
    ('strike_unarmed', 'cmu', '141_14', (1.0, 3.9), 'f', 'strike'), ('strike_unarmed', 'cmu', '113_13', (0.9, 3.3), 'f', 'strike'),
    ('guard', 'accad', 'Male2_D1_StandToReady', None, 'm', 'guard'), ('guard', 'accad', 'Male2_D2_WalkToReady', None, 'm', 'guard'),
    ('guard', 'accad', 'Male2_D4_ReadyToRelax', None, 'm', 'guard'), ('guard', 'accad', 'Male2_E3_Advance', None, 'm', 'guard'),
    ('guard', 'accad', 'Male2_E5_Retreat', None, 'm', 'guard'), ('guard', 'accad', 'Male2_E9_SideStepLeft', None, 'm', 'guard'),
    ('guard', 'accad', 'Male2_E10_SideStepRight', None, 'm', 'guard'), ('guard', 'accad', 'Male2_D15_SwitchStance', None, 'm', 'guard'),
    ('guard', 'accad', 'Male2_E1_JabLeft', None, 'm', 'guard'), ('guard', 'accad', 'Male2_E2_JabRight', None, 'm', 'guard'),
    ('guard', 'accad', 'Male2_E3_CrossLeft', None, 'm', 'guard'), ('guard', 'accad', 'Male2_E5_HookLeft', None, 'm', 'guard'),
    ('guard', 'accad', 'Male2_E7_UppercutLeft', None, 'm', 'guard'), ('guard', 'accad', 'Male2_E8_UppercutRight', None, 'm', 'guard'),
    ('guard', 'cmu', '144_13', (0.5, 14.0), 'f', 'guard'), ('guard', 'cmu', '144_20', (0.5, 14.0), 'f', 'guard'), ('guard', 'cmu', '13_17', None, 'u', 'guard'),
    ('dodge', 'accad', 'Male2_E19_DodgeLeft', None, 'm', 'all'), ('dodge', 'accad', 'Male2_E20_DodgeRight', None, 'm', 'all'),
    ('dodge', 'accad', 'Male2_E21_DuckLeft', None, 'm', 'all'), ('dodge', 'accad', 'Male2_E22_DuckRight', None, 'm', 'all'),
    ('dodge', 'accad', 'Male2_C24_QuickSidestepLeft', (0.0, 1.4), 'm', 'all'), ('dodge', 'accad', 'Male1_C24_QuickSideStepLeft', None, 'm', 'all'),
    ('dodge', 'accad', 'Male1_C25_QuickSideStepRight', None, 'm', 'all'), ('dodge', 'accad', 'Female1_C24_SideStepLeft', (0.3, 1.5), 'f', 'all'),
    ('dodge', 'accad', 'Female1_C25_SideStepRight', (0.3, 1.5), 'f', 'all'), ('dodge', 'accad', 'Female1_B22_SideStepLeft', (1.0, 3.1), 'f', 'all'),
    ('dodge', 'cmu', '77_09', (3.4, 8.6), 'u', 'all'),
    ('peek', 'style', 'LeanLeft_ID', (10.5, 14.5), 'u', 'all'), ('peek', 'style', 'LeanRight_ID', (8.0, 12.0), 'u', 'all'),
    ('cover_full', 'accad', 'Male2_A1_Stand', (0.2, 3.8), 'm', 'all'), ('cover_full', 'accad', 'Male1_A1_Stand', (0.2, 4.9), 'm', 'all'),
    ('cover_full', 'accad', 'Female1_A01_Stand', (0.1, 3.0), 'f', 'all'),
    ('prone', 'accad', 'Male2_A9_Lie', None, 'm', 'lie'), ('prone', 'accad', 'Male1_A9_LieDown', None, 'm', 'lie'), ('prone', 'accad', 'Female1_A09_LieT2', None, 'f', 'lie'),
    ('crawl', 'accad', 'Male2_A11_Crawl', None, 'm', 'lie'), ('crawl', 'accad', 'Male1_A11_CrawlForward', None, 'm', 'lie'), ('crawl', 'accad', 'Female1_A11_CrawlForward', None, 'f', 'lie'),
    ('turn', 'accad', 'Male2_E1_TurnAroundRight', None, 'm', 'turn'), ('turn', 'accad', 'Male2_E2_TurnAroundLeft', None, 'm', 'turn'),
    ('turn', 'accad', 'Male2_B9_WalkTurnLeft90', None, 'm', 'turn'), ('turn', 'accad', 'Male2_B15_WalkTurnAround', None, 'm', 'turn'),
    ('turn', 'accad', 'Male1_B9_WalkToTurnLeft90', None, 'm', 'turn'), ('turn', 'accad', 'Male1_B15_WalkTurnAround', None, 'm', 'turn'),
    ('turn', 'accad', 'Female1_B09_WalkTurnLeft90', None, 'f', 'turn'), ('turn', 'accad', 'Female1_B15_WalkTurnAround180', None, 'f', 'turn'),
    ('fall', 'cmu', '90_16', None, 'u', 'fall'), ('fall', 'cmu', '90_18', None, 'u', 'fall'),
    ('fall', 'accad', 'Male2_A8_CrouchToLie', None, 'm', 'fall'), ('fall', 'accad', 'Male1_A8_CrouchToLie', None, 'm', 'fall'), ('fall', 'accad', 'Female1_A08_CrouchToLie', None, 'f', 'fall'),
    ('rise', 'cmu', '140_01', None, 'u', 'all'), ('rise', 'cmu', '140_08', None, 'u', 'all'), ('rise', 'cmu', '77_16', 'rise', 'u', 'all'),
    ('rise', 'cmu', '111_06', 'rise', 'f', 'all'), ('rise', 'cmu', '113_08', (9.6, 14.2), 'f', 'all'), ('rise', 'cmu', '114_02', 'rise', 'f', 'all'),
    ('rise', 'accad', 'Male2_A10_LieToCrouch', None, 'm', 'all'), ('rise', 'accad', 'Female1_A10_LieToCrouch', None, 'f', 'all'),
]
KEYS = ('K1', 'Kmax', 'H1', 'H2', 'H3', 'F2h', 'F3w', 'A1', 'A2', 'TL', 'Hy')
# 100STYLE's actor standing relaxed before each take's action (s): his head's own offset is taken out against it
STYLE_BASE = {'Swat_ID': (4.0, 4.8), 'LeanLeft_ID': (4.2, 5.0), 'LeanRight_ID': (31.3, 32.4)}


def extra(m):
    """The trunk's lean from the vertical (deg) and the hips' height (cm) per frame."""
    ch = m.R['Chest'] if 'Chest' in m.R else m.R['UpperChest']
    up = ch @ np.array([0, 1.0, 0])
    tl = np.degrees(np.arccos(np.clip(up[:, 1], -1, 1)))
    hy = (m.P['Hips'][:, 1] - min(m.P['LeftToes'][:, 1].min(), m.P['RightToes'][:, 1].min())) * 100
    return tl, hy


def turn_measures(m):
    """A turn's rate (deg/s, the pelvis's yaw at its fastest over 0.3 s) and the head's lead over the pelvis (deg, the head's
    yaw ahead of the pelvis's in the turn's direction, p98)."""
    l = m.P['LeftUpperLeg'] - m.P['RightUpperLeg']; py = np.unwrap(np.arctan2(l[:, 0], l[:, 2]))
    hf = m.R['Head'] @ np.array([0, 0, 1.0]); hy = np.unwrap(np.arctan2(hf[:, 0], hf[:, 2]))
    hy = hy - np.median(hy[:int(0.3 * m.fps)] - py[:int(0.3 * m.fps)])
    w = max(2, int(0.3 * m.fps))
    rate = np.abs(py[w:] - py[:-w]) / (w / m.fps)
    sgn = np.sign(py[-1] - py[0]) or 1.0
    lead = np.degrees((hy - py) * sgn)
    return float(np.degrees(rate.max())), float(np.percentile(lead, 98)), float(np.degrees(abs(py[-1] - py[0])))


def fall_measures(m):
    """A fall's release to impact (s: the hips leaving their standing or crouching height at 0.3 m/s down to their stop) and
    the elbows' bend at the impact (deg; R24's conscious falls land at about 129° of extension, i.e. bent 51°)."""
    y = m.P['Hips'][:, 1]; vy = np.gradient(y) * m.fps
    i0 = int(np.argmin(vy)); i = i0
    while i < m.n - 1 and vy[i] < -0.3: i += 1
    r = i0
    while r > 0 and vy[r] < -0.3: r -= 1
    import measures as M
    a = M.arms(m)
    return (i - r) / m.fps, float(max(a['Left']['A2'][i], a['Right']['A2'][i])), float(-vy[i0])


def stats(x):
    x = np.asarray(x, float); x = x[np.isfinite(x)]
    if len(x) < 5: return None
    return [round(float(np.percentile(x, q)), 1) for q in (2, 50, 98)] + [round(float(x.min()), 1), round(float(x.max()), 1)]


def main():
    out = sys.argv[1]
    pool, trials = {}, []
    for state, db, tid, rng, sex, which in TRIALS:
        m = J.load(db, tid)
        if m is None: trials.append({'trial': tid, 'missing': True}); continue
        if rng == 'rise': rng = J.auto_range(m, 'rise')
        # the head against the actor's own relaxed stance (CMU's and 100STYLE's head segments carry a per-actor offset:
        # combat_states.BASE), measured on the whole take and then cut
        base = CS.BASE.get(tid) if db == 'cmu' else STYLE_BASE.get(tid)
        v, st = CS.per_frame(m, base, db in ('cmu', 'style'))
        tl, hy = extra(m); v['TL'], v['Hy'] = tl, hy
        if rng:
            a_, b_ = int(round(rng[0] * m.fps)), min(m.n, int(round(rng[1] * m.fps)))
            v = {k: np.asarray(x)[a_:b_] for k, x in v.items()}; st = {k: x[a_:b_] for k, x in st.items()}
            m = m.slice(*rng)
        if which == 'all': mask = np.ones(m.n, bool)
        elif which in ('strike', 'guard'): mask = st[which]
        elif which == 'lie': mask = hy < 35.0
        elif which == 'turn': mask = np.ones(m.n, bool)
        else: mask = np.ones(m.n, bool)
        row = {'state': state, 'trial': f'{db.upper()} {tid}', 'sex': sex, 'range': list(rng) if rng else None, 'fps': round(m.fps, 1), 'frames': int(mask.sum())}
        if which == 'turn':
            tr, hl, amp = turn_measures(m); row.update(turn_rate_dps=round(tr, 1), head_lead_deg=round(hl, 1), amplitude_deg=round(amp, 1))
            for k, val in (('TR', tr), ('HL', hl)): pool.setdefault(state, {}).setdefault(k, []).append(np.array([val] * 5))
        if which == 'fall':
            ft, el, vmax = fall_measures(m); row.update(release_to_impact_s=round(ft, 3), elbow_bend_at_impact_deg=round(el, 1), hips_drop_peak_mps=round(vmax, 2))
            for k, val in (('FT', ft), ('EL', el)): pool.setdefault(state, {}).setdefault(k, []).append(np.array([val] * 5))
        if mask.sum() >= 3:
            row['p50_p98'] = {k: [round(float(np.nanpercentile(np.asarray(v[k])[mask], q)), 1) for q in (50, 98)] for k in KEYS
                              if np.isfinite(np.asarray(v[k])[mask]).sum() >= 3}
        trials.append(row)
        if mask.sum() < 3: continue
        for k in KEYS:
            pool.setdefault(state, {}).setdefault(k, []).append(np.asarray(v[k])[mask])
            pool.setdefault(state + '/' + sex, {}).setdefault(k, []).append(np.asarray(v[k])[mask])
        pool[state].setdefault('_actors', set()).add(tid.split('_')[0] if db != 'style' else '100STYLE')
    res = {}
    for s, d in sorted(pool.items()):
        e = {k: stats(np.concatenate(d[k])) for k in d if not k.startswith('_')}
        if '_actors' in d: e['actors'] = sorted(d['_actors'])
        res[s] = e
    json.dump({'trials': trials, 'states': res}, open(out, 'w'), indent=1)
    for s, e in res.items():
        if '/' in s: continue
        print(f"{s:15s} actors {e.get('actors')}")
        for k in KEYS + ('TR', 'HL', 'FT', 'EL'):
            if e.get(k): print(f"   {k:5s} p2/p50/p98 {e[k][:3]}  min/max {e[k][3:]}")


if __name__ == '__main__':
    main()
