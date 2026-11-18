"""The combat standard's own clip checks (docs/COMBAT_ANIMATION_STANDARD.md §1: G3 real time, G4 contacts, WG1/WG2, C1 for the
weapon), run by clip_qa.py --combat on every clip whose json is combat set v4's (`source_kind`). numpy only.

  contacts  G4: each weight-bearing foot's contact point (the slower of its heel and ball points: a pivot turns the heel
            about a still ball, a roll lowers the ball onto a still heel) still over the ground (under plant.LIMIT_MS, 0.10 m/s) from the second key of each weight-bearing stance to its
            last (a stance: at least 3 keys on the ground with the contact point under 0.3 m/s; a foot gliding low and fast is
            stepping, G4); judged where the converter planted the feet, reported where G4 exempts the clip (falls,
            get-ups, crawls, lying: the json carries no `plant_record`)
  WG1, WG2  the main hand's palm on the weapon's grip_main within 1 cm, the off hand's on grip_off within 2 cm, on every key
            the sidecar's IK track says the hand holds its grip (`ik.keys[].w_main`, `w_off` = 1); the palm's centre is the
            converter's (the wrist joint, 7.5 cm along the fingers, 2 cm toward the palm, in the hand's turn from the T-pose)
  weapon C1 the weapon's line (the reference model's butt or pommel to its muzzle or tip) never inside the trunk (an
            elliptic cylinder from the hips to the neck, 15 cm across and 11 cm deep from the spine's line, in the chest's
            frame) or the head (a 9 cm sphere 9 cm over the head joint); a long gun's first 10 cm from the butt is left out
            (the butt sits in the shoulder pocket)
  T-pose    the FBX's default pose (Unity's avatar configuration source, MotionImportPostprocessor v11+) is the converters'
            shared T-pose within 0.5° per bone (the bones at their bind, the legs straight down)
  timing    G3 and each state's cited timing (combat_v4_jobs.TIMING): the span measured on the clip itself, at its own keys,
            within [0.85 lo, 1.15 hi] of the cited range (the brief's +/-15 %)
"""
import json, math, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import plant as PL
import combat_v4_jobs as J

WEAPONS = '/home/user/second-face-staging/combat/weapons'
PALM_F, PALM_N = 0.075, 0.02


def u2f(v): return np.array([-v[0], v[1], v[2]], float)      # Unity's axes -> the file's (dump) axes


def palm(m, side):
    w = side + 'WristTwist' if side + 'WristTwist' in m.P else side + 'Hand'
    if side + 'Hand' not in m.R: return None
    fb = np.array([1.0 if side == 'Left' else -1.0, 0.0, 0.0])
    off = fb * PALM_F + np.array([0.0, -1.0, 0.0]) * PALM_N
    return m.P[w] + np.einsum('nij,j->ni', m.R[side + 'Hand'], off)


STILL_CM, STILL_MS = 2.5, 0.30


def still_stances(heel, ball, fps, fl, min_keys=3):
    """combat_v4.still_stances (the same rule; numpy only): runs of keys on the ground and slower than STILL_MS."""
    h = np.minimum(heel[:, 1] - fl[0], ball[:, 1] - fl[1]) * 100
    lowball = (ball[:, 1] - fl[1]) < (heel[:, 1] - fl[0])
    v = np.zeros(len(h))
    for k in range(1, len(h)):
        p = ball if lowball[k] else heel
        v[k] = np.linalg.norm((p[k] - p[k - 1])[[0, 2]]) * fps
    v[0] = v[1] if len(v) > 1 else 0.0
    on = (h < STILL_CM) & (v < STILL_MS)
    out, i, n = [], 0, len(h)
    while i < n:
        if not on[i]: i += 1; continue
        j = i
        while j < n and on[j]: j += 1
        if j - i >= min_keys: out.append((i, j - 1))
        i = j
    return out


def contacts(m, meta):
    """G4 on the clip as dumped: per stance, the contact point's ground speed from the second key after touchdown to toe-off."""
    out = {}; worst = 0.0
    for s in ('Left', 'Right'):
        an, to, Rf = m.P[s + 'Foot'], m.P[s + 'Toes'], m.R[s + 'Foot']
        heel, ball, hl, bl = PL.sole_points(an, to, Rf, m.fps)
        fl = PL.sole_floors(heel, ball)
        rows = []
        for k0, k1 in still_stances(heel, ball, m.fps, fl):
            if k1 - k0 < 3: continue
            v = []
            for k in range(k0 + 2, k1 + 1):
                # the point bearing the weight: the slower of the heel and the ball (a pivot turns the heel about a still
                # ball, a roll lowers the ball onto a still heel)
                v.append(float(min(np.linalg.norm((heel[k] - heel[k - 1])[[0, 2]]), np.linalg.norm((ball[k] - ball[k - 1])[[0, 2]])) * m.fps))
            rows.append({'keys': [int(k0), int(k1)], 'max_mps': round(max(v), 3), 'median_mps': round(float(np.median(v)), 3)})
            worst = max(worst, max(v))
        out[s] = rows
    out['max_mps'] = round(worst, 3)
    return out


def weapon_points(model):
    p = json.load(open(os.path.join(WEAPONS, model, model + '.json')))['points_unity']
    return {k: np.array(v, float) for k, v in p.items()}


def grips(m, meta):
    """WG1, WG2 per key against the sidecar's targets (cm)."""
    ik = meta.get('ik')
    if not ik or not ik.get('keys'): return None
    keys = ik['keys']; n = min(len(keys), m.n)
    pm, po = palm(m, 'Right'), palm(m, 'Left')
    wg1, wg2 = [], []
    for k in range(n):
        kk = keys[k]
        if kk.get('w_main', 0) >= 0.999 and pm is not None: wg1.append(float(np.linalg.norm(pm[k] - u2f(kk['grip_main']))) * 100)
        if kk.get('w_off', 0) >= 0.999 and po is not None and 'grip_off' in kk: wg2.append(float(np.linalg.norm(po[k] - u2f(kk['grip_off']))) * 100)
    r = {}
    if wg1: r['WG1_cm'] = {'max': round(max(wg1), 2), 'p98': round(float(np.percentile(wg1, 98)), 2), 'keys': len(wg1)}
    if wg2: r['WG2_cm'] = {'max': round(max(wg2), 2), 'p98': round(float(np.percentile(wg2, 98)), 2), 'keys': len(wg2)}
    return r


def clearance(m, meta):
    """The weapon's line against the trunk and the head (m; negative: inside)."""
    ik = meta.get('ik')
    if not ik or not ik.get('keys') or not ik.get('model'): return None
    pts = weapon_points(ik['model'])
    long = 'butt' in pts
    a = pts['butt'] if long else np.array([0.0, 0.0, -0.08])
    b = pts.get('muzzle', pts.get('tip', np.array([0.0, 0.0, 0.3])))
    L = float(np.linalg.norm(b - a)); worst = (1e9, None, None)
    keys = ik['keys']; n = min(len(keys), m.n)
    ch = m.R['UpperChest'] if 'UpperChest' in m.R else m.R['Chest']
    for k in range(n):
        kk = keys[k]
        o, f, u = u2f(kk['grip_main']), u2f(kk['fwd']), u2f(kk['up'])
        r = np.cross(f, u)            # the weapon's right in the file's (right-handed) axes: forward x up
        hip, nk = m.P['Hips'][k], m.P['Neck'][k]
        lat, fw = ch[k] @ np.array([1.0, 0, 0]), ch[k] @ np.array([0, 0, 1.0])
        hc = m.P['Head'][k] + np.array([0, 0.09, 0]); ax = nk - hip; al = float(ax @ ax)
        for s in np.linspace(0, 1, 16):
            p_w = a + (b - a) * s
            if long and s * L < 0.10: continue
            p = o + r * p_w[0] + u * p_w[1] + f * p_w[2]
            t = float((p - hip) @ ax) / al
            if 0.0 <= t <= 1.0:
                d = p - (hip + ax * t)
                e = math.sqrt((float(d @ lat) / 0.15) ** 2 + (float(d @ fw) / 0.11) ** 2)
                c = (e - 1.0) * 0.11
                if c < worst[0]: worst = (c, k, 'trunk')
            c = float(np.linalg.norm(p - hc)) - 0.09
            if c < worst[0]: worst = (c, k, 'head')
    return {'min_clearance_cm': round(worst[0] * 100, 1), 'key': worst[1], 'part': worst[2]}


def _motion_view(m):
    """The dump as combat_v4_jobs.events reads a source (its joints by the gate's names)."""
    return m


def timing(m, meta):
    t = meta.get('timing')
    if not t: return None
    ref = t.get('ref'); T = J.TIMING[ref]; dur = (m.n - 1) / m.fps
    # a design timing is the game's pace choice inside the evidence (the standard §0): it holds a built clip, and is reported
    # for a captured one (a real person's own timing is the evidence)
    judged = not (T.get('design') and meta.get('source_kind') == 'captured')
    lo, hi = T['lo'] * 0.85, T['hi'] * 1.15
    what = None
    if ref in ('mag', 'reload_slow', 'throw', 'rise', 'crouch', 'restance'):
        what = dur
    elif ref in ('hit_onset', 'hit_return'):
        dev = np.zeros(m.n)
        for b in ('Head', 'UpperChest', 'Hips', 'LeftHand', 'RightHand'):
            if b not in m.R: continue
            R0 = m.R[b][0]
            ang = np.degrees(np.arccos(np.clip((np.einsum('nij,ij->n', m.R[b], R0) - 1) / 2, -1, 1)))
            dev = np.maximum(dev, ang)
        on = np.where(dev > 2.0)[0]
        if len(on):
            onset, back = on[0] / m.fps, on[-1] / m.fps
            res = {'onset_s': round(onset, 3), 'back_s': round(back, 3), 'peak_deg': round(float(dev.max()), 1)}
            ok = onset <= J.TIMING['hit_onset']['hi'] * 1.15 and J.TIMING['hit_return']['lo'] * 0.85 <= back <= J.TIMING['hit_return']['hi'] * 1.15
            return dict(res, ref=ref, range=[J.TIMING['hit_onset']['lo'], J.TIMING['hit_onset']['hi']], return_range=[J.TIMING['hit_return']['lo'], J.TIMING['hit_return']['hi']], ok=bool(ok))
        return {'ref': ref, 'ok': False, 'why': 'no flinch over 2 deg'}
    elif ref == 'throw_release':
        # (v4.5) from the clip's start to the release (the action resolves there); the recovery after it is not judged
        ev, tm = J.events(m, meta.get('events_kind') or 'throw:R', (0.0, dur))
        what = tm.get('beat_s')
    elif ref == 'surrender':
        # to the hold: both palms within 3 cm of where they rest at the clip's end, relative to the head
        pl, pr = palm(m, 'Left') - m.P['Head'], palm(m, 'Right') - m.P['Head']
        near = (np.linalg.norm(pl - pl[-1], axis=1) < 0.03) & (np.linalg.norm(pr - pr[-1], axis=1) < 0.03)
        k = m.n - 1
        while k > 0 and near[k - 1]: k -= 1
        what = k / m.fps
    else:
        kind = (meta.get('events_kind') or '')
        ev, tm = J.events(m, kind, (0.0, dur)) if kind else ({}, {})
        what = tm.get('span_s')
    if what is None: return {'ref': ref, 'ok': False, 'why': 'not measurable on the clip'}
    return {'ref': ref, 'measured_s': round(float(what), 3), 'range': [T['lo'], T['hi']], 'judged': [round(lo, 3), round(hi, 3)] if judged else 'reported (design; captured)',
            'ok': bool(lo <= what <= hi) or not judged, 'src': T['src']}


HUMAN = ['Hips', 'Spine', 'Chest', 'UpperChest', 'Neck', 'Head'] + [x + y for x in ('Left', 'Right') for y in
         ('Shoulder', 'UpperArm', 'LowerArm', 'Hand', 'UpperLeg', 'LowerLeg', 'Foot', 'Toes')]


def tpose(fbx):
    """The FBX's default pose (its nodes' default Lcl values: what Unity's avatar configuration is built from, MotionImport-
    Postprocessor v11+) against the converters' shared T-pose (cmu2fbx.t_pose_key): every Humanoid bone at its bind turn
    (the capture's T-pose: arms out along X, palms down, facing +Z), but the legs, aimed straight down (the thigh and the shin
    each within 0.5° of the vertical). Per bone: the angle of its default world turn from its bind turn (the BindPose's
    matrices) for the bones held at the bind, the angle of its segment from straight down for the legs; the first key's
    distance from the default is reported (a default that equals the first key of a moving take is the bug fixed in v11)."""
    import clip_qa as Q
    objs, conns = Q._fbx_tree(fbx)
    ids, props = {}, {}
    for n in objs:
        if n[0] != 'Model': continue
        nm = n[1][1].split('\x00')[0]; ids[n[1][0]] = nm; P = {}
        for k in n[2]:
            if k[0] == 'Properties70':
                for p_ in k[2]:
                    if p_[0] == 'P' and p_[1][0] in ('Lcl Rotation', 'Lcl Translation', 'PreRotation', 'PostRotation'): P[p_[1][0]] = [float(v) for v in p_[1][4:7]]
        props[nm] = P
    parent = {}
    for c in conns:
        if c[1][0] == 'OO' and c[1][1] in ids and c[1][2] in ids: parent[ids[c[1][1]]] = ids[c[1][2]]
    bind = {}
    for n in objs:
        if n[0] == 'Pose':
            for pn in n[2]:
                if pn[0] != 'PoseNode': continue
                nid = [k[1][0] for k in pn[2] if k[0] == 'Node'][0]; mtx = [k[1][0] for k in pn[2] if k[0] == 'Matrix'][0]
                if nid in ids:
                    M = np.array(mtx, float).reshape(4, 4).T
                    R = M[:3, :3] / np.linalg.norm(M[:3, :3], axis=0)
                    bind[ids[nid]] = (R, M[:3, 3])
    E = lambda v: Q._euler_R(np.array([v], float))[0]
    Wr, Wp = {}, {}

    def world(nm):
        if nm in Wr: return Wr[nm], Wp[nm]
        P = props.get(nm, {})
        L = E(P.get('PreRotation', [0, 0, 0])) @ E(P.get('Lcl Rotation', [0, 0, 0])) @ E(P.get('PostRotation', [0, 0, 0])).T
        t = np.array(P.get('Lcl Translation', [0, 0, 0]), float)
        if nm in parent:
            pr, pp = world(parent[nm]); Wr[nm] = pr @ L; Wp[nm] = pp + pr @ t
        else:
            Wr[nm] = L; Wp[nm] = t
        return Wr[nm], Wp[nm]
    out, worst = {}, 0.0
    for nm in HUMAN:
        if nm not in props: continue
        Rd, pd = world(nm)
        if nm.endswith(('UpperLeg', 'LowerLeg')):
            kid = nm.replace('UpperLeg', 'LowerLeg') if nm.endswith('UpperLeg') else nm.replace('LowerLeg', 'Foot')
            if kid not in props: continue
            seg = world(kid)[1] - pd
            a = float(np.degrees(np.arccos(np.clip(-seg[1] / max(np.linalg.norm(seg), 1e-9), -1, 1))))
            out[nm] = round(a, 3); worst = max(worst, a); continue
        if nm not in bind: continue
        D = Rd @ bind[nm][0].T
        a = float(np.degrees(np.arccos(np.clip((np.trace(D) - 1) / 2, -1, 1))))
        out[nm] = round(a, 3); worst = max(worst, a)
    first = None
    try:
        W1 = Q.fbx_world_rotations(fbx, [b for b in HUMAN if b in props])
        diffs = [float(np.degrees(np.arccos(np.clip((np.trace(W1[b][0] @ world(b)[0].T) - 1) / 2, -1, 1)))) for b in W1]
        first = round(max(diffs), 2) if diffs else None
    except Exception:
        pass
    return {'max_deg': round(worst, 3), 'per_bone': out, 'first_key_from_default_deg': first}


def checks(m, meta, r, fails, fbx=None):
    """The v4 checks into r['checks'] and fails."""
    if fbx and os.path.exists(fbx):
        tp = tpose(fbx); r['checks']['tpose'] = tp
        if tp['max_deg'] > 0.5:
            b_ = max(tp['per_bone'], key=lambda k: tp['per_bone'][k])
            fails.append(f"T-pose: the FBX's default pose leaves the shared T-pose by {tp['max_deg']:.2f}° ({b_}; limit 0.5): Unity's avatar configuration (v11+) is built from it")
    planted = bool(meta.get('plant_record')) or (meta.get('loop') and meta.get('speed', 0) > 0.3)
    c = contacts(m, meta); r['checks']['contacts'] = c
    if planted and not meta.get('loop') and c['max_mps'] > PL.LIMIT_MS:
        fails.append(f"contacts: a weight-bearing foot's contact point moves {c['max_mps']:.2f} m/s over the ground (G4; limit {PL.LIMIT_MS})")
    g = grips(m, meta)
    if g:
        r['checks']['grips'] = g
        if g.get('WG1_cm', {}).get('max', 0) > 1.0: fails.append(f"WG1: the main hand's palm {g['WG1_cm']['max']:.1f} cm from grip_main (limit 1)")
        if g.get('WG2_cm', {}).get('max', 0) > 2.0: fails.append(f"WG2: the off hand's palm {g['WG2_cm']['max']:.1f} cm from grip_off (limit 2)")
    cl = clearance(m, meta)
    if cl:
        r['checks']['weapon_clearance'] = cl
        if cl['min_clearance_cm'] < 0: fails.append(f"weapon C1: the weapon passes {-cl['min_clearance_cm']:.1f} cm into the {cl['part']} (key {cl['key']})")
    tm = timing(m, meta)
    if tm:
        r['checks']['timing'] = tm
        if not tm.get('ok'):
            fails.append(f"timing: {tm.get('measured_s', tm.get('onset_s'))} s against {tm.get('range')} ({tm['ref']}; judged within +/-15 %)" + (f": {tm['why']}" if tm.get('why') else ''))
