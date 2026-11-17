"""The motion gate's skeleton-readable measures (docs/PEOPLE_MOTION.md §2.1, §2.4; Tests/PlayMode/MotionProbe.cs), copied
definition for definition, run on a source capture on its actor's own skeleton (skel.Motion).

Standing: A1 A2 A3 (each arm), H1 H2 H3, F3w F3a F3s, K1 K2 K3 K4 K5, F4, and the soles' proxies F1 F2 F5.
Walking and jogging: W3 (A1 while moving), W4 W5, and the soles' proxies W1 W2 W6.

What differs from the game, and why (each said again in docs/qa/motion_calibration.md):
- The game's root (the person's GameObject) faces where the game turns it; a capture has no such root. Standing, the body's
  front is the pelvis's forward averaged over 3 s (the converter turns an idle to its mean facing, so the game's root is
  that mean); moving, it is the direction of travel over one stride (the game faces a walker along its path).
- The face's frame is the head bone's rest frame (CMU's ASF and ACCAD's BVH rest poses face +Z, level): as in the game,
  where the face's frame is the head's at the avatar's neutral muscle pose, which a converted clip's T-pose maps to.
- The soles (F1 F2 F5 W1 W6) are measured on the mesh in the game. Here each foot carries two rigid points, the ball under
  the toe joint and the heel 4 cm behind and under the ankle, set level with each other in the foot's own flat pose (its
  median pitch while still), and heights are over the trial's floor, the median of the lower point while the foot is still.
  They measure how far a real, planted foot's sole strays from its own contact height (capture and skin noise), not the
  floor's physics.
"""
import numpy as np

UP = np.array([0.0, 1.0, 0.0])


def flat(v):
    v = np.array(v, dtype=float, copy=True)
    v[..., 1] = 0.0
    return v


def unit(v):
    n = np.linalg.norm(v, axis=-1, keepdims=True)
    return v / np.maximum(n, 1e-9)


def ang(a, b):
    """Unsigned angle (deg) between vectors, row-wise."""
    c = np.sum(unit(a) * unit(b), -1)
    return np.degrees(np.arccos(np.clip(c, -1, 1)))


def moving_avg(x, w):
    """Centred moving average over w samples (edges shrink), along axis 0."""
    w = max(1, int(w))
    if w == 1: return x.copy()
    c = np.cumsum(np.concatenate([np.zeros((1,) + x.shape[1:]), x]), 0)
    n = len(x); out = np.empty_like(x, dtype=float)
    for i in range(n):
        a = max(0, i - w // 2); b = min(n, i + w // 2 + 1)
        out[i] = (c[b] - c[a]) / (b - a)
    return out


def body_front(m, kind):
    """The body's front per frame (unit, level): the pelvis's forward over 3 s standing, the travel over a stride moving."""
    pf = unit(flat(m.R['Hips'] @ np.array([0, 0, 1.0])))
    if kind == 'stand':
        return unit(flat(moving_avg(pf, 3.0 * m.fps)))
    h = flat(m.P['Hips'])
    v = np.gradient(h, axis=0) * m.fps
    v = moving_avg(v, 1.1 * m.fps)
    sp = np.linalg.norm(v, axis=-1, keepdims=True)
    f = np.where(sp > 0.2, unit(v), pf)
    return unit(flat(f))


def left_of(fwd):
    """The body's left, level (the captures' frame is right-handed with +X left at rest: up x forward = left)."""
    return unit(np.cross(UP, fwd))


def arms(m):
    out = {}
    for s in ('Left', 'Right'):
        u, e, h = m.P[s + 'UpperArm'], m.P[s + 'LowerArm'], m.P[s + 'Hand']
        out[s] = {'A1': ang(e - u, -UP), 'A2': ang(e - u, h - e), 'A3': ang(h - e, -UP)}
    return out


def head(m):
    Rh = m.R['Head']
    f = Rh @ np.array([0, 0, 1.0]); r = Rh @ np.array([1.0, 0, 0])
    chest = m.R['UpperChest'] if 'UpperChest' in m.R else m.R['Chest']
    cf = unit(flat(chest @ np.array([0, 0, 1.0])))
    pitch = np.degrees(np.arcsin(np.clip(f[:, 1], -1, 1)))
    yaw = ang(flat(f), cf)
    roll = np.degrees(np.arcsin(np.clip(r[:, 1], -1, 1)))
    return pitch, yaw, np.abs(roll)


def legs(m, fwd):
    lt = left_of(fwd)
    P = m.P
    hipL, hipR, kneeL, kneeR = P['LeftUpperLeg'], P['RightUpperLeg'], P['LeftLowerLeg'], P['RightLowerLeg']
    ankL, ankR, toeL, toeR = P['LeftFoot'], P['RightFoot'], P['LeftToes'], P['RightToes']
    o = {}
    d = ankL - ankR
    o['F3w'] = np.abs(np.sum(d * lt, -1)) * 100
    o['F3a'] = np.abs(np.sum(d * fwd, -1)) * 100
    o['F3sL'] = ang(flat(toeL - ankL), fwd); o['F3sR'] = ang(flat(toeR - ankR), fwd)
    flexL = ang(kneeL - hipL, ankL - kneeL); flexR = ang(kneeR - hipR, ankR - kneeR)
    o['flexL'], o['flexR'] = flexL, flexR
    o['K1'] = np.minimum(flexL, flexR)

    def valgus(hip, knee, ank, side):
        # seen from the front: the shank's turn out from the thigh's line (+: the knee inside the hip-ankle line)
        lat = lt * side   # the leg's own outside
        t, k = knee - hip, ank - knee
        th_t = np.degrees(np.arctan2(np.sum(t * lat, -1), -t[:, 1])); th_k = np.degrees(np.arctan2(np.sum(k * lat, -1), -k[:, 1]))
        return th_k - th_t
    o['K2L'] = valgus(hipL, kneeL, ankL, 1.0); o['K2R'] = valgus(hipR, kneeR, ankR, -1.0)

    def track(hip, knee, ank, toe, side):
        # seen from above: where the knee points (from the middle of hip and ankle) against the foot's line (+ in)
        kd = flat(knee - 0.5 * (hip + ank)); fd = flat(toe - ank)
        cr = np.cross(fd, kd)[:, 1]; dt = np.sum(fd * kd, -1)
        a = np.degrees(np.arctan2(cr, dt))     # + turning from the foot's line towards +X (the left)
        small = (np.linalg.norm(kd, axis=-1) < 1e-2) | (np.linalg.norm(fd, axis=-1) < 1e-3)
        return np.where(small, 0.0, -a * side)   # left leg: inward is towards -X
    o['K5L'] = track(hipL, kneeL, ankL, toeL, 1.0); o['K5R'] = track(hipR, kneeR, ankR, toeR, -1.0)
    across = hipR - hipL
    o['K3'] = np.abs(np.degrees(np.arcsin(np.clip(across[:, 1] / np.maximum(np.linalg.norm(across, axis=-1), 1e-4), -1, 1))))
    mid = 0.5 * (ankL + ankR); half = 0.5 * np.abs(np.sum(d * lt, -1))
    o['K4'] = (np.abs(np.sum((0.5 * (hipL + hipR) - mid) * lt, -1)) - half) * 100
    return o


def soles(m):
    """Each foot's heel and ball points (rigid on the foot), level in the foot's own flat pose; heights over the floor."""
    out = {}
    lows = []
    for s in ('Left', 'Right'):
        an, to, Rf = m.P[s + 'Foot'], m.P[s + 'Toes'], m.R[s + 'Foot']
        v = np.linalg.norm(np.gradient(flat(an), axis=0), axis=-1) * m.fps
        still = v < 0.10
        if still.sum() < 5: still = v <= np.percentile(v, 20)
        pitch = np.degrees(np.arctan2((to - an)[:, 1], np.linalg.norm(flat(to - an), axis=-1)))
        idx = np.where(still)[0]
        ref = idx[np.argsort(pitch[idx])[len(idx) // 2]]
        fw = unit(flat(to[ref] - an[ref]))
        heel_w = np.array([an[ref][0], to[ref][1], an[ref][2]]) - 0.04 * fw
        ball_w = to[ref].copy()
        hl = Rf[ref].T @ (heel_w - an[ref]); bl = Rf[ref].T @ (ball_w - an[ref])
        heel = an + np.einsum('nij,j->ni', Rf, hl); ball = an + np.einsum('nij,j->ni', Rf, bl)
        out[s] = {'heel': heel, 'ball': ball, 'still': still, 'ankle_speed': v}
        lows.append(np.minimum(heel[:, 1], ball[:, 1])[still])
    floor = float(np.median(np.concatenate(lows)))
    for s in out:
        out[s]['hh'] = (out[s]['heel'][:, 1] - floor) * 100
        out[s]['bh'] = (out[s]['ball'][:, 1] - floor) * 100
    return out, floor


def stand_measures(m):
    """Per-frame values of every standing measure, both sides pooled as the gate pools them."""
    fwd = body_front(m, 'stand')
    a = arms(m)
    vals = {k: np.concatenate([a['Left'][k], a['Right'][k]]) for k in ('A1', 'A2', 'A3')}
    pitch, yaw, roll = head(m)
    vals['H1'], vals['H2'], vals['H3'] = pitch, yaw, roll
    lg = legs(m, fwd)
    vals['F3w'], vals['F3a'] = lg['F3w'], lg['F3a']
    vals['F3s'] = np.concatenate([lg['F3sL'], lg['F3sR']])
    vals['K1'], vals['K3'], vals['K4'] = lg['K1'], lg['K3'], lg['K4']
    vals['K2'] = np.concatenate([lg['K2L'][lg['flexL'] < 10], lg['K2R'][lg['flexR'] < 10]])
    vals['K5'] = np.concatenate([lg['K5L'][lg['flexL'] >= 10], lg['K5R'][lg['flexR'] >= 10]])
    # F4: an ankle within 2 cm of the lowest it has been in the state: its horizontal speed (cm/s)
    f4 = []
    for s in ('Left', 'Right'):
        an = m.P[s + 'Foot']
        h = an[:, 1]
        v = np.linalg.norm(np.diff(flat(an), axis=0), axis=-1) * m.fps * 100
        down = h[1:] <= h.min() + 0.02
        f4.append(v[down])
    vals['F4'] = np.concatenate(f4)
    so, floor = soles(m)
    f1, f2, f5 = [], [], []
    for s in ('Left', 'Right'):
        hh, bh = so[s]['hh'], so[s]['bh']
        up = np.minimum(hh, bh) >= 3.0
        f5.append(up.astype(float))
        f1 += [hh[~up], bh[~up]]; f2.append((hh - bh)[~up])
    vals['F1'] = np.concatenate(f1); vals['F2'] = np.concatenate(f2); vals['F5'] = np.concatenate(f5)
    return vals


def gait_measures(m):
    fwd = body_front(m, 'walk')
    a = arms(m)
    vals = {'W3': np.concatenate([a['Left']['A1'], a['Right']['A1']])}
    pitch, yaw, _ = head(m)
    vals['W4'], vals['W5'] = pitch, yaw
    so, floor = soles(m)
    dt = 1.0 / m.fps
    hip = flat(m.P['Hips'])
    body = np.linalg.norm(moving_avg(np.gradient(hip, axis=0) * m.fps, 1.1 * m.fps), axis=-1)
    w1, w2 = [], []
    w1s, w1w = [], []
    still = []
    for s in ('Left', 'Right'):
        sp = []
        for pt, hkey in (('heel', 'hh'), ('ball', 'bh')):
            p = so[s][pt]; h = so[s][hkey]
            v = np.linalg.norm(np.diff(flat(p), axis=0), axis=-1) / dt
            sp.append(np.concatenate([[v[0]], v]))
            down = (h[1:] < 2.5) & (h[:-1] < 2.5)
            w1.append(v[down] * 100)
            # diagnostic: the same samples split by the ankle's own speed (a swing foot passes the floor fast: real people's
            # toes clear it by 1-2 cm in mid-swing, inside the gate's 2.5 cm)
            ank = so[s]['ankle_speed'][1:]
            w1s.append(v[down & (ank < 1.0)] * 100); w1w.append(v[down & (ank >= 1.0)] * 100)
            ok = down & (body[1:] > 0.3)
            w2.append(v[ok] / body[1:][ok])
        still.append(np.minimum(sp[0], sp[1]))
    vals['W1'] = np.concatenate(w1); vals['W2'] = np.concatenate(w2)
    vals['W1stance'] = np.concatenate(w1s); vals['W1swing'] = np.concatenate(w1w)
    lowL = np.minimum(so['Left']['hh'], so['Left']['bh']); lowR = np.minimum(so['Right']['hh'], so['Right']['bh'])
    lower_is_L = lowL <= lowR
    lowest = np.where(lower_is_L, lowL, lowR)
    st = np.where(lower_is_L, still[0], still[1])
    vals['W6'] = lowest[st < 0.5]
    return vals


# --- the gate's verdict on one state (HumanMotionGateTests: p2 >= Lo, p98 <= Hi, min/max within the caps, mean, share over)
INF = float('inf')
STAND = {'A1': (-INF, 20, -INF, 28), 'A2': (5, 35, 0, 50), 'A3': (-INF, 30, -INF, 40), 'H1': (-15, 8, -25, 12), 'H2': (-INF, 30, -INF, 45),
         'H3': (-INF, 10, -INF, 15), 'F1': (-1.5, 2.5, -3, 4), 'F2': (-2, 2, -4, 4), 'F3w': (8, 32, 5, 40), 'F3a': (-INF, 28, -INF, 35),
         'F3s': (-INF, 25, -INF, 35), 'K1': (-INF, 8, -INF, 12), 'K2': (-INF, 6, -INF, 10), 'K3': (-INF, 5, -INF, 8), 'K4': (-INF, 2, -INF, 4),
         'K5': (-INF, 15, -INF, 25), 'F4': {'mean': 3, 'over': 10, 'frac': 0.02}, 'F5': {'mean': 0.12}}
WALK = {'W1': {'mean': 8, 'over': 15, 'frac': 0.05}, 'W1stance': {'mean': 8, 'over': 15, 'frac': 0.05}, 'W2': {'mean': 0.10}, 'W6': (-1.5, 2.5, -3, 4), 'W3': (-INF, 35, -INF, 45),
        'W4': (-20, 8, -25, 12), 'W5': (-INF, 25, -INF, 35)}
JOG = dict(WALK, W3=(-INF, 45, -INF, 55))


def pct(v, q):
    """The gate's percentile: the sorted sample at round(q (n-1))."""
    s = np.sort(v)
    return float(s[int(np.clip(round(q * (len(s) - 1)), 0, len(s) - 1))])


def judge(vals, limits):
    rows = {}
    for k, lim in limits.items():
        v = vals.get(k)
        if v is None or len(v) == 0: continue
        v = np.asarray(v, float)
        r = {'n': int(len(v)), 'p2': pct(v, 0.02), 'p50': pct(v, 0.5), 'p98': pct(v, 0.98), 'min': float(v.min()), 'max': float(v.max()), 'mean': float(v.mean())}
        why = []
        if isinstance(lim, tuple):
            lo, hi, clo, chi = lim
            if r['p98'] > hi: why.append(f"p98 {r['p98']:.1f} > {hi}")
            if r['p2'] < lo: why.append(f"p2 {r['p2']:.1f} < {lo}")
            if r['max'] > chi: why.append(f"max {r['max']:.1f} > cap {chi}")
            if r['min'] < clo: why.append(f"min {r['min']:.1f} < cap {clo}")
        else:
            if r['mean'] > lim['mean']: why.append(f"mean {r['mean']:.2f} > {lim['mean']}")
            if 'over' in lim:
                r['over'] = float(np.mean(v > lim['over']))
                if r['over'] > lim['frac']: why.append(f"{r['over'] * 100:.0f}% over {lim['over']}")
        r['pass'] = not why; r['why'] = '; '.join(why)
        rows[k] = r
    return rows


# --- timing: the steps themselves (T6's offline measures; docs/qa/motion_calibration.md §timing) --------------------------------
def contacts(m, so=None):
    """Each foot's stance spans (start, end frame): the lower sole point within 2.5 cm of the floor and the foot slow
    (ankle under 1 m/s), held 3 frames; and the heel strikes (each span's first frame)."""
    if so is None: so, _ = soles(m)
    out = {}
    k = max(1, int(round(0.025 * m.fps)))
    for s in ('Left', 'Right'):
        low = np.minimum(so[s]['hh'], so[s]['bh'])
        on = (low < 2.5) & (so[s]['ankle_speed'] < 1.0)
        # close single-frame gaps and drop blips
        spans, i, n = [], 0, len(on)
        while i < n:
            if on[i]:
                j = i
                while j < n and on[j]: j += 1
                spans.append([i, j]); i = j
            else: i += 1
        merged = []
        for a, b in spans:
            if merged and a - merged[-1][1] <= k: merged[-1][1] = b
            else: merged.append([a, b])
        out[s] = [(a, b) for a, b in merged if b - a >= 3]
    return out


def gait_params(m):
    """Speed (m/s), cadence (steps/min), step length (m), stride time (s), duty factor (stance share of a stride), flight
    share, step width (cm, the feet's mid-stance points across the travel), pelvic rotation and obliquity ranges (deg, per
    stride), the pelvis's vertical excursion (cm) and the arm swing (sagittal range of the upper arm, deg)."""
    so, floor = soles(m)
    c = contacts(m, so)
    fps = m.fps
    strikes = sorted([(a, s) for s in c for a, b in c[s]])
    # interior strikes only (a span cut by the trial's start is not a strike)
    strikes = [(a, s) for a, s in strikes if a > 0]
    alt = [strikes[0]] if strikes else []
    for a, s in strikes[1:]:
        if s != alt[-1][1]: alt.append((a, s))
    res = {'steps': len(alt)}
    if len(alt) < 3: return res
    t0, t1 = alt[0][0], alt[-1][0]
    nsteps = len(alt) - 1
    dur = (t1 - t0) / fps
    hip = flat(m.P['Hips'])
    path = np.sum(np.linalg.norm(np.diff(hip[t0:t1 + 1], axis=0), axis=-1))
    disp = np.linalg.norm(hip[t1] - hip[t0])
    res.update({'speed': disp / dur, 'path_speed': path / dur, 'cadence': 60.0 * nsteps / dur, 'step_len': disp / nsteps,
                'stride_t': 2 * dur / nsteps, 'straight': disp / max(path, 1e-6)})
    duty = []
    for s in c:
        for a, b in c[s]:
            if a > t0 and b < t1: duty.append((b - a) / fps / res['stride_t'])
    res['duty'] = float(np.median(duty)) if duty else None
    both_up = []
    for i in range(t0, t1):
        inL = any(a <= i < b for a, b in c['Left']); inR = any(a <= i < b for a, b in c['Right'])
        both_up.append(not inL and not inR)
    res['flight'] = float(np.mean(both_up))
    # step width: each stance's mid-point, across the line of travel
    fwd = body_front(m, 'walk'); lt = left_of(fwd)
    mids = []
    for s in c:
        for a, b in c[s]:
            if a > t0 and b < t1:
                i = (a + b) // 2; mids.append((i, s, 0.5 * (so[s]['heel'][i] + so[s]['ball'][i])))
    mids.sort()
    widths = [abs(np.dot(p2 - p1, lt[i2])) * 100 for (i1, s1, p1), (i2, s2, p2) in zip(mids, mids[1:]) if s1 != s2]
    res['step_width'] = float(np.median(widths)) if widths else None
    # the pelvis in one stride: rotation (yaw about the travel), obliquity, vertical excursion
    Rh = m.R['Hips'][t0:t1]
    pf = unit(flat(Rh @ np.array([0, 0, 1.0])))
    yaw = np.degrees(np.arctan2(np.cross(fwd[t0:t1], pf)[:, 1], np.sum(fwd[t0:t1] * pf, -1)))
    hipL, hipR = m.P['LeftUpperLeg'][t0:t1], m.P['RightUpperLeg'][t0:t1]
    obl = np.degrees(np.arcsin(np.clip((hipL - hipR)[:, 1] / np.linalg.norm(hipL - hipR, axis=-1), -1, 1)))
    n_st = max(1, int(round(res['stride_t'] * fps)))
    def stride_range(x):
        r = [np.ptp(x[i:i + n_st]) for i in range(0, max(1, len(x) - n_st + 1), max(1, n_st // 2))]
        return float(np.median(r))
    res['pelvis_rot'] = stride_range(yaw); res['pelvis_obl'] = stride_range(obl)
    res['pelvis_vert'] = stride_range(m.P['Hips'][t0:t1, 1]) * 100
    sw = []
    for s in ('Left', 'Right'):
        u, e = m.P[s + 'UpperArm'][t0:t1], m.P[s + 'LowerArm'][t0:t1]
        d = unit(e - u)
        sag = np.degrees(np.unwrap(np.arctan2(np.sum(d * fwd[t0:t1], -1), -d[:, 1])))
        sw.append(stride_range(sag))
    res['arm_swing'] = float(np.mean(sw))
    res['t0'], res['t1'] = t0 / fps, t1 / fps
    return res


def gravity_fps(m, listed_fps, lift=0.06):
    """The frame rate a trial's flight phases imply. A flight: both ankles and both toe tips higher than their own 10th
    percentile in the trial by `lift` (6 cm), for 0.05 s or more at the listed rate; the pelvis's height in each flight
    (less its first and last frame, take-off and landing) fitted by a parabola. Gravity measured at the listed rate is a,
    the true rate listed * sqrt(9.81 / -a). The pelvis is not the centre of mass (the legs swing, the trunk bends), so a run
    reads 5-15 % high (CMU's 120 fps runs: 121-138); it tells 60 from 120, not 110 from 120."""
    keys = ('LeftFoot', 'RightFoot', 'LeftToeTip', 'RightToeTip')
    lo = {k: np.percentile(m.P[k][:, 1], 10) for k in keys}
    up = np.all([m.P[k][:, 1] > lo[k] + lift for k in keys], axis=0)
    minlen = max(4, int(round(0.05 * listed_fps)))
    out, i = [], 0
    while i < m.n:
        if up[i]:
            j = i
            while j < m.n and up[j]: j += 1
            if j - i >= minlen and i > 0 and j < m.n:
                t = np.arange(i, j) / m.fps; y = m.P['Hips'][i:j, 1]
                a = np.polyfit(t[1:-1], y[1:-1], 2)[0] * 2 if j - i >= 6 else np.polyfit(t, y, 2)[0] * 2
                if a < 0: out.append((int(i), int(j), float(a)))
            i = j
        else: i += 1
    if not out: return None
    tot = sum(j - i for i, j, _ in out)
    g = sum(a * (j - i) for i, j, a in out) / tot
    return {'flights': len(out), 'frames': tot, 'g': round(g, 2), 'fps': round(listed_fps * float(np.sqrt(9.81 / -g)), 1)}
