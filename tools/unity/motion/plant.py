"""Planted stance feet for the gait loops (motion set v6): each stance foot's contact point held still on the ground by leg IK
in the converter, and the stance measure the clip QA judges it by.

Why (editor, 2026-11-17): in set v5 a jog's stance foot reached the floor still moving 2-3 m/s and took several 30 fps keys
to stop (jog R: 2.79, 1.61, 0.60, 0.07 m/s from the key before touchdown); CMU 141's jogs crept through the whole stance
(median 0.46 m/s). The captures do the same on the actors' own skeletons: their joint centres roll over the heel, and 141's
solver creeps through stance. The game's FootPlant hid it with a lift-and-drop at touchdown; v6 plants the feet in the clip.

How (plant_loop, run on a gait's loop of 30 fps keys, open or closed):
- The loop as Unity plays it: its keys 0..N-2 with each joint's end-to-start mismatch spread over the clip by normalized
  time (Loop Pose, as clip_qa.py's dump emulates it; a closed loop, a walk's, has none), the body moving at the json speed.
- Each foot carries two rigid sole points (as measures.soles: the ball under the toe joint, the heel 4 cm behind and under
  the ankle, level in the foot's flat pose), each over its own floor. A stance runs from touchdown (the first key with a
  sole point within 2.5 cm of its floor and the slower point under 2 m/s over the ground) to toe-off (the last such key).
- The contact point: the heel until the ball is down (within 1 cm of its floor, or as low as the heel), then the ball, never
  back. The foot rolls on it without slipping: over each step the point in contact at its end stays where it is, so the
  ankle's way over the ground is the foot's captured turn about that point. The vertical is kept as captured.
- One travel speed per clip: the stance feet's own backward speed under the hips (the planted stride over the loop's
  time), fitted over every stance from the key after touchdown to toe-off, each key weighted by how still the capture's
  contact point stands there (a heel gliding in at 1 m/s counts a twentieth); each footprint where the capture puts the
  contact point on those keys, so weighted.
- Two-bone leg IK reaches each stance key's planted ankle: the knee bent in its own plane, then the leg swung about the hip
  by the least rotation; the hips' height and path, the foot's world turn and the toes as captured. On the ball with the
  heel up, where the leg cannot reach or would straighten its knee more than 8 deg from the capture, the heel rises a little
  more about the pinned ball instead (the sole to 60 deg at most). A key the leg cannot reach at a stance's end is left to
  the swing. The plant is run again with any key the stance measure finds on the ground that it left out.
- The swing: the toe-off's change eased out over its first 40 %, the next touchdown's eased in over its last 40 %, solved by
  IK with the knee changed no more than the eased change it comes from; the middle of the swing as captured.
- The keys are written back without the Loop Pose spread, so that Unity's spread brings them to the planted pose.

The numpy part (sole points, stances, the stance-speed measure) is shared by the converters and clip_qa.py; the mathutils
part (plant_loop) runs in Blender.
"""
import math
import numpy as np

STANCE_CM = 2.5     # the lower sole point within this of the foot's own floor: on the ground
TOUCH_MS = 2.0      # touchdown: the first such key whose slower sole point moves under this over the ground
DEBUG = False       # plant_loop prints each key's IK (SF_PLANT_DEBUG=1 in the converters)
LIMIT_MS = 0.10     # the clip QA's limit for the stance foot from the second key after touchdown to toe-off
ROLL_CM = 1.0       # the ball within this of its own floor is down; the heel this much higher over its floor than the ball is off
EXTEND_CM = 0.0     # the plant holds a stance while its lower sole point is within STANCE_CM + this (0: the measure's own rule)
STILL_MS = 0.25     # the fit's weight of a stance key halves where its captured contact point moves this fast over the ground
REACH_MARGIN = 0.002  # m: a planted ankle within this of the straight leg's reach counts as out of reach
MAX_PITCH_DEG = 20.0  # the most the foot is turned about its pinned contact point to come within the leg's reach
MAX_TOE_PITCH_DEG = 35.0  # with the heel up, the most the foot is turned about its ball (and to TOE_OFF_PITCH_DEG at most)
TOE_OFF_PITCH_DEG = 60.0  # the steepest the sole (heel over ball) stands to the floor when the plant turns it
SWING_EASE = 0.4      # a swing eases the toe-off's change out over its first share, the touchdown's in over its last
KNEE_KEEP_DEG = 8.0   # on the ball, heel up: the knee straightened at most this much from its captured bend (the heel rises instead)


# --- numpy: the sole points, the stances, the measure ------------------------------------------------------------------------
def _flat(v):
    v = np.array(v, dtype=float, copy=True); v[..., 1] = 0.0
    return v


def sole_points(an, to, Rf, fps):
    """The heel and ball points of one foot, rigid on it (as measures.soles): the ball under the toe joint, the heel 4 cm
    behind and under the ankle, level with the ball in the foot's flat pose. The flat pose is the median pitch over the keys
    where the ankle is in its lowest 30 % (the foot on the ground), not over the still keys as measures.soles takes it: a
    creeping stance foot has none, and the plant and the measure must find the same points before and after it.
    an, to: (n, 3) ankle and toe joints; Rf: (n, 3, 3) the foot's world rotation (any fixed offset). Returns heel, ball (n, 3)
    and the two points in the foot's frame."""
    low = an[:, 1] <= np.percentile(an[:, 1], 30)
    pitch = np.degrees(np.arctan2((to - an)[:, 1], np.linalg.norm(_flat(to - an), axis=-1)))
    idx = np.where(low)[0]
    ref = idx[np.argsort(pitch[idx])[len(idx) // 2]]
    fw = _flat(to[ref] - an[ref]); fw /= max(np.linalg.norm(fw), 1e-9)
    heel_w = np.array([an[ref][0], to[ref][1], an[ref][2]]) - 0.04 * fw
    hl = Rf[ref].T @ (heel_w - an[ref]); bl = Rf[ref].T @ (to[ref] - an[ref])
    return an + np.einsum('nij,j->ni', Rf, hl), an + np.einsum('nij,j->ni', Rf, bl), hl, bl


def sole_floors(heel, ball):
    """Each sole point's own floor (m): the median of its lowest 15 % of heights (an actor's two feet, and a foot's heel and
    ball, can stand at different heights in the capture: CMU 141's feet by 3-4 cm, ACCAD Female1's right heel 2 cm over
    its ball)."""
    def fl(y):
        q = np.sort(y)[:max(2, int(round(0.15 * len(y))))]
        return float(np.median(q))
    return fl(heel[:, 1]), fl(ball[:, 1])


def sole_height(heel, ball, floors):
    """The lower sole point's height over its own floor (cm), key by key."""
    return np.minimum(heel[:, 1] - floors[0], ball[:, 1] - floors[1]) * 100


def ground_speed(p, fps):
    """Each key's speed over the ground (m/s) from the key before (the first: nan)."""
    d = np.linalg.norm(np.diff(p[:, [0, 2]], axis=0), axis=1) * fps
    return np.r_[np.nan, d]


def stances(heel, ball, fps, floors=None, extend_cm=0.0):
    """A foot's stances as (touchdown, toe-off) key pairs: runs of keys with a sole point within STANCE_CM of its own
    floor; each starts at the run's first key whose slower point moves under TOUCH_MS (a heel skimming the floor at
    swing speed is not down yet) and ends at the run's last key. `extend_cm` lets the run go on while the lower point is that
    much higher (the plant holds the foot a little past the measure's own toe-off, which moves by a key once the foot is
    planted)."""
    h = sole_height(heel, ball, floors or sole_floors(heel, ball))
    v = np.fmin(ground_speed(heel, fps), ground_speed(ball, fps))
    on = h < STANCE_CM + extend_cm
    out, i, n = [], 0, len(h)
    while i < n:
        if not on[i]: i += 1; continue
        j = i
        while j < n and on[j]: j += 1
        k0 = next((k for k in range(i, j) if v[k] < TOUCH_MS and h[k] < STANCE_CM), None)
        if k0 is not None and j - 1 - k0 >= 1: out.append((k0, j - 1))
        i = j
    return out


def stance_measure(P, R, fps, n, loops=3):
    """The editor's measure of a planted foot (2026-11-17), on a gait loop played `loops` times with its travel added: P, R
    the joints (n*loops keys: 'LeftFoot', 'LeftToes', ... and the feet's rotations). Per stance whose touchdown falls in the
    middle loop: the ground speed key by key of the ankle, the ball and the contact point (the lower of the two sole points,
    the same material point from the key before), from the key before touchdown to toe-off. The judged figure, `slow`, is
    the slower of the ankle and the ball; `foot` the slowest of the ankle, the ball and the contact point."""
    res = {}
    worst = {'slow': 0.0, 'foot': 0.0}
    for s in ('Left', 'Right'):
        an, to, Rf = P[s + 'Foot'], P[s + 'Toes'], R[s + 'Foot']
        heel, ball, hl, bl = sole_points(an, to, Rf, fps)
        fl = sole_floors(heel, ball); hgt = sole_height(heel, ball, fl)
        va, vb = ground_speed(an, fps), ground_speed(ball, fps)
        # the contact point: the lower of heel and ball at the key, followed from the key before
        lowball = (ball[:, 1] - fl[1]) < (heel[:, 1] - fl[0])
        vc = np.full(len(an), np.nan)
        for k in range(1, len(an)):
            p = ball if lowball[k] else heel
            vc[k] = np.linalg.norm((p[k] - p[k - 1])[[0, 2]]) * fps
        rows = []
        for k0, k1 in stances(heel, ball, fps, fl):
            if not n <= k0 < 2 * n: continue
            ks = list(range(k0 - 1, k1 + 1))
            slow = [float(min(va[k], vb[k])) for k in ks]
            foot = [float(min(va[k], vb[k], vc[k])) for k in ks]
            win = slice(3, None)    # from the second key after touchdown (ks[0] is the key before touchdown)
            r = {'touchdown': k0 - n, 'toe_off': k1 - n, 'keys': len(ks) - 1,
                 'ankle': [round(float(va[k]), 3) for k in ks], 'ball': [round(float(vb[k]), 3) for k in ks],
                 'contact': [round(float(vc[k]), 3) for k in ks], 'slow': [round(x, 3) for x in slow],
                 'height_cm': [round(float(hgt[k]), 2) for k in ks]}
            w_slow, w_foot = slow[win], foot[win]
            r['max_slow'] = round(max(w_slow), 3) if w_slow else None
            r['median_slow'] = round(float(np.median(w_slow)), 3) if w_slow else None
            r['max_foot'] = round(max(w_foot), 3) if w_foot else None
            if w_slow: worst['slow'] = max(worst['slow'], max(w_slow)); worst['foot'] = max(worst['foot'], max(w_foot))
            rows.append(r)
        res[s] = rows
    res['max_slow'] = round(worst['slow'], 3); res['max_foot'] = round(worst['foot'], 3)
    return res


# --- mathutils (Blender): the plant -----------------------------------------------------------------------------------------
def _smooth(t):
    t = min(1.0, max(0.0, t)); return t * t * (3.0 - 2.0 * t)


def _sl(a, b, t):
    """The shortest-path slerp (cmu2fbx.slerp)."""
    from mathutils import Quaternion
    if a.dot(b) < 0.0: b = Quaternion((-b.w, -b.x, -b.y, -b.z))
    return a.slerp(b, t)


def _np3(v): return np.array([v.x, v.y, v.z], float)


def _mat(q): return np.array(q.to_matrix(), float)


def played(rows):
    """An open loop as Unity's Loop Pose plays it (clip_qa.dump's emulation): each joint's local rotation turned by its
    end-to-start mismatch times k/(N-1), the root's position likewise; the keys 0..N-2 (key N-1 is key 0 again). Returns the
    keys and the mismatches (to write the planted keys back)."""
    from mathutils import Quaternion
    N = len(rows); M = N - 1
    D = {}
    for j, q in rows[0]['loc'].items():
        d = (q @ rows[-1]['loc'][j].inverted()).normalized()
        D[j] = d if d.w >= 0 else Quaternion((-d.w, -d.x, -d.y, -d.z))
    Dp = rows[0]['pos'] - rows[-1]['pos']
    out = []
    for k in range(M):
        t = k / M
        out.append({'loc': {j: (_sl(Quaternion(), D[j], t) @ q).normalized() for j, q in rows[k]['loc'].items()},
                    'pos': rows[k]['pos'] + Dp * t})
    return out, D, Dp


def unplayed(keys, rows, D, Dp, joints):
    """The stored keys whose Loop Pose playback is `keys` (the inverse of played): `joints` written back from the planted
    keys, every other joint as it was; the last key is the first planted key less the whole mismatch."""
    from mathutils import Quaternion
    M = len(keys); out = []
    for k in range(M):
        t = k / M
        loc = dict(rows[k]['loc'])
        for j in joints: loc[j] = (_sl(Quaternion(), D[j], t).inverted() @ keys[k]['loc'][j]).normalized()
        out.append({'loc': loc, 'pos': rows[k]['pos'].copy()})
    loc = dict(rows[M]['loc'])
    for j in joints: loc[j] = (D[j].inverted() @ keys[0]['loc'][j]).normalized()
    out.append({'loc': loc, 'pos': rows[M]['pos'].copy()})
    return out


def _arrays(keys, legs, fps, v, loops=3):
    """FK of every key, the loop unrolled `loops` times with the travel v added (+Z): per side the ankle, ball, foot rotation."""
    M = len(keys)
    F = [legs.fk(r) for r in keys]
    A = {}
    for s in legs.SIDES:
        an = np.array([_np3(F[k % M][s]['A']) for k in range(M * loops)])
        ba = np.array([_np3(F[k % M][s]['B']) for k in range(M * loops)])
        Rf = np.array([_mat(F[k % M][s]['Wf']) for k in range(M * loops)])
        tr = np.zeros_like(an); tr[:, 2] = v * np.arange(M * loops) / fps
        A[s] = {'an': an + tr, 'ba': ba + tr, 'Rf': Rf, 'an0': an}
    return F, A


def _ik(f, target, hinge):
    """Two-bone IK: the thigh and shin world rotations that put the ankle at `target` (Vector), the hip where it is. The knee
    is bent in its own plane (the hinge axis `hinge` in the thigh's frame when the leg is nearly straight), then the leg is
    swung about the hip by the least rotation. Returns (Wt, Ws, reached ankle)."""
    from mathutils import Quaternion
    H, K, A, Wt, Ws = f['H'], f['K'], f['A'], f['Wt'], f['Ws']
    t, s = K - H, A - K
    a, b = t.length, s.length
    d = (target - H).length
    dmax = math.sqrt(a * a + b * b + 2 * a * b * math.cos(math.radians(0.5)))   # the knee no straighter than 0.5 deg
    dmin = abs(a - b) + 1e-4
    dd = min(max(d, dmin), dmax)
    th = t.angle(s) if a > 1e-9 and b > 1e-9 else 0.0
    th1 = math.acos(max(-1.0, min(1.0, (dd * dd - a * a - b * b) / (2 * a * b))))
    n = t.cross(s)
    if n.length < math.sin(math.radians(3.0)) * a * b: n = Wt @ hinge
    n.normalize()
    R1 = Quaternion(n, th1 - th)
    A1 = K + R1 @ s
    S = (A1 - H).rotation_difference(target - H)
    Wt2 = (S @ Wt).normalized(); Ws2 = (S @ R1 @ Ws).normalized()
    return Wt2, Ws2, H + S @ (A1 - H)


def _flex(g):
    """The knee's bend (deg) of a leg as fk gives it."""
    return math.degrees((g['K'] - g['H']).angle(g['A'] - g['K']))


def _flex_after(g, Wt, Ws):
    """The knee's bend (deg) once the thigh and shin turn to Wt, Ws."""
    return math.degrees((Wt @ (g['Wt'].inverted() @ (g['K'] - g['H']))).angle(Ws @ (g['Ws'].inverted() @ (g['A'] - g['K']))))


def _reach(g):
    """The farthest the leg reaches from the hip (m): thigh and shin with the knee 0.5 deg short of straight."""
    a, b = (g['K'] - g['H']).length, (g['A'] - g['K']).length
    return math.sqrt(a * a + b * b + 2 * a * b * math.cos(math.radians(0.5)))


def _pitch(g, tgt, piv, D=None, max_deg=None):
    """A planted ankle `tgt` out of the leg's reach (or farther than `D` from the hip): the foot turned about its pinned
    contact point `piv` (the heel early in stance, the ball late), toward the hip, by the least angle that brings the ankle
    within reach (the heel rises off a ball the leg cannot reach back to; the toes stay up on a heel it cannot reach forward
    to). Returns (rotation, ankle) or None when it would take more than MAX_PITCH_DEG."""
    from mathutils import Quaternion
    if D is None: D = _reach(g) - REACH_MARGIN
    p, q = piv - g['H'], tgt - piv
    if (tgt - g['H']).length <= D: return Quaternion(), tgt
    r, P = q.length, p.length
    n = q.cross(-p)
    if r < 1e-6 or n.length < 1e-9: return None
    c = (P * P + r * r - D * D) / (2 * P * r)
    if c > 1.0: return None
    phi = q.angle(-p) - math.acos(c)
    if phi > math.radians(MAX_PITCH_DEG if max_deg is None else max_deg): return None
    R = Quaternion(n.normalized(), max(0.0, phi) + 1e-4)
    return R, piv + R @ q


def plant_loop(rows, legs, speed, fps, cycle_s=None, name=''):
    """Plant the stance feet of an open gait loop (rows: N keys at `fps`, {'loc': {joint: Quaternion}, 'pos': Vector}, the
    travel taken out at `speed`, +Z forward). `legs` reads and writes the legs (fk(row) -> {side: H, K, A, B, Wp, Wt, Ws, Wf};
    set(row, side, Wt, Ws, Wf, Wp); SIDES; JOINTS). Returns the stored keys, the new speed and the record."""
    from mathutils import Vector, Quaternion
    N = len(rows); M = N - 1
    keys, D, Dp = played(rows)
    F, A = _arrays(keys, legs, fps, speed)
    rec = {'method': 'each stance foot\'s contact point (the heel, then the ball once down) held still on the ground by two-bone '
                     'leg IK on the loop as Unity plays it, the hips\' height and path, the foot\'s turn and the toes as captured '
                     '(plant.py); the speed the planted stride over the loop\'s time', 'speed_root': round(speed, 4)}
    sole = {}
    for s in legs.SIDES:
        heel, ball, hl, bl = sole_points(A[s]['an'], A[s]['ba'], A[s]['Rf'], fps)
        sole[s] = (hl, bl)
    # the knee's hinge in each thigh's frame (its mean plane where the knee bends over 10 deg)
    hinge = {}
    for s in legs.SIDES:
        acc = Vector((0, 0, 0))
        for f in F:
            g = f[s]; t, sh = g['K'] - g['H'], g['A'] - g['K']
            if t.angle(sh) > math.radians(10): acc += g['Wt'].inverted() @ t.cross(sh).normalized()
        hinge[s] = acc.normalized() if acc.length > 1e-6 else Vector((1, 0, 0))

    def find(v, need):
        """Stances (in the middle loop, unrolled indices) and, for each, its rolling ankle way and contact positions. `need`:
        per side, keys the measure found on the ground after a first plant, which the stance next to them takes in."""
        _, Av = _arrays(keys, legs, fps, v)
        out = {}
        for s in legs.SIDES:
            hl, bl = sole[s]
            an, Rf = Av[s]['an'], Av[s]['Rf']
            heel = an + np.einsum('nij,j->ni', Rf, hl); ball = an + np.einsum('nij,j->ni', Rf, bl)
            fl = sole_floors(heel, ball)
            st = []
            for k0, k1 in stances(heel, ball, fps, fl, EXTEND_CM):
                if not M <= k0 < 2 * M or k1 - k0 >= M: continue
                while (k1 + 1) % M in need[s] and k1 + 1 - k0 < M - 2: k1 += 1
                while (k0 - 1) % M in need[s] and k1 - k0 + 1 < M - 2: k0 -= 1
                ks = list(range(k0, k1 + 1))
                # the contact point: the heel until the ball is down (within ROLL_CM of its own floor, or as low over it as
                # the heel over its own: the foot flat), then the ball (the heel rising off it), never back
                w, ws = 0.0, []
                for k in ks:
                    if (ball[k, 1] - fl[1]) * 100 <= ROLL_CM or ball[k, 1] - fl[1] <= heel[k, 1] - fl[0]: w = 1.0
                    ws.append(w)
                c = [(1 - x) * hl + x * bl for x in ws]
                heel_up = [((heel[k, 1] - fl[0]) - (ball[k, 1] - fl[1])) * 100 > ROLL_CM for k in ks]
                # the ankle's way when the foot rolls on the contact point without slipping (relative to touchdown): over each
                # step the point in contact at its end (the ball from the step the foot comes flat)
                roll = [np.zeros(3)]
                for i in range(len(ks) - 1):
                    roll.append(roll[-1] + (Rf[ks[i]] - Rf[ks[i + 1]]) @ c[i + 1])
                roll = np.array(roll)
                cap = A[s]['an0'][[k % M for k in ks]]          # the captured ankle, in place
                st.append({'k0': k0 - M, 'k1': k1 - M, 'ks': [k - M for k in ks], 'w': ws, 'heel_up': heel_up, 'roll': roll, 'cap': cap,
                           'u': cap - roll, 't': np.array([(k - M) / fps for k in ks])})
            out[s] = st
        return out

    def weights(x, v):
        """Each stance key's weight in the fit: how still the captured contact point stands over the ground at travel v
        (1 / (1 + (speed / STILL_MS)^2): a foot gliding in on its heel at 1 m/s counts a twentieth of one at rest); the
        touchdown key not at all (its contact is still arriving)."""
        c = x['u'] + np.outer(x['t'], [0, 0, v])
        d = np.linalg.norm(np.diff(c[:, [0, 2]], axis=0), axis=1) * fps
        spd = np.r_[d[:1], d] if len(d) else np.zeros(1)
        w = 1.0 / (1.0 + (spd / STILL_MS) ** 2)
        if len(w) > 2: w[0] = 0.0
        return w, c

    def fit(st, v):
        """The travel at which the stance feet's contact points stand still: the weighted slope of their in-place way over
        time, pooled over the stances."""
        num = den = 0.0
        for s in st:
            for x in st[s]:
                w, _ = weights(x, v)
                if w.sum() <= 0: continue
                t, uz = x['t'], x['u'][:, 2]
                tm, um = (w * t).sum() / w.sum(), (w * uz).sum() / w.sum()
                num += float((w * (t - tm) * (uz - um)).sum()); den += float((w * (t - tm) ** 2).sum())
        return -num / den if den > 0 else v

    def attempt(need):
        """One plant: the speed, the footprints, the IK; the stored keys measured as clip_qa.py measures them."""
        v = speed
        for _ in range(6):
            st = find(v, need)
            if not any(st[s] for s in st): break
            v2 = fit(st, v)
            if abs(v2 - v) < 1e-4: v = v2; break
            v = v2
        st = find(v, need)
        rec['speed'] = round(v, 4)
        if cycle_s: rec['stride_m'] = round(v * cycle_s, 4); rec['cycle_s'] = round(cycle_s, 4)
        rec['played_stride_m'] = round(v * M / fps, 4)
        # each stance key's planted ankle: the footprint plus the rolling way less the travel, the vertical as captured. A
        # stance key whose planted ankle the leg cannot reach at its ends (the knee straight) is left to the swing: the foot
        # lands where the leg reaches
        off = {s: [None] * M for s in legs.SIDES}
        piv = {s: [None] * M for s in legs.SIDES}
        late = {s: [False] * M for s in legs.SIDES}
        ball_on = {s: [False] * M for s in legs.SIDES}
        rec['stances'] = {}
        for s in legs.SIDES:
            rs = []
            for x in st[s]:
                w, c = weights(x, v)
                T = (w[:, None] * c).sum(0) / w.sum() if w.sum() > 0 else c.mean(0)
                hl, bl = sole[s]
                x['piv'] = [(1 - q) * hl + q * bl for q in x['w']]

                def place(T):
                    pl = T + x['roll'] - np.outer(x['t'], [0, 0, v])
                    o = pl - x['cap']; o[:, 1] = 0.0
                    ok = []
                    for i, k in enumerate(x['ks']):
                        g = F[k % M][s]
                        tgt = g['A'] + Vector((float(o[i][0]), 0.0, float(o[i][2])))
                        if x['w'][i] >= 1.0: ok.append(_pitch(g, tgt, tgt + g['Wf'] @ Vector(x['piv'][i].tolist())) is not None)
                        else: ok.append((tgt - g['H']).length <= _reach(g) - REACH_MARGIN)   # (on the heel: no turn)
                    return o, ok
                o, ok = place(T)
                # keys the measure needs planted (after a first plant) that the leg cannot reach from this footprint: the
                # footprint moved along the travel by the least that lets the leg reach them all (up to 12 cm), if any does
                needed = [i for i, k in enumerate(x['ks']) if k % M in need[s]]
                if any(not ok[i] for i in needed):
                    for dz in sorted(np.arange(-0.12, 0.1201, 0.005), key=abs):
                        o2, ok2 = place(T + np.array([0.0, 0.0, dz]))
                        if all(ok2[i] for i in needed):
                            o, ok = o2, ok2; x['footprint_moved_cm'] = round(float(dz) * 100, 1); break
                i0 = next((i for i in range(len(ok)) if ok[i]), None)
                i1 = next((i for i in range(len(ok) - 1, -1, -1) if ok[i]), None)
                if i0 is None or i1 - i0 < 1:
                    rs.append({'touchdown': x['k0'], 'toe_off': x['k1'], 'planted': None, 'why': 'the leg reaches the footprint on fewer than 2 keys'})
                    x['skip'] = True
                    continue
                x['p0'], x['p1'], x['off'] = i0, i1, o
                for i in range(i0, i1 + 1):
                    off[s][x['ks'][i] % M] = o[i]; piv[s][x['ks'][i] % M] = x['piv'][i]
                    late[s][x['ks'][i] % M] = x['w'][i] >= 1.0 and x['heel_up'][i]
                    ball_on[s][x['ks'][i] % M] = x['w'][i] >= 1.0
                rs.append({'touchdown': x['k0'], 'toe_off': x['k1'], 'planted': [x['ks'][i0], x['ks'][i1]],
                           'contact_heel_to_ball': [round(q, 2) for q in x['w']], 'fit_weight': [round(float(q), 2) for q in w],
                           'ankle_moved_cm': round(float(np.linalg.norm(o[i0:i1 + 1], axis=1).max() * 100), 2),
                           **({'footprint_moved_cm': x['footprint_moved_cm']} if 'footprint_moved_cm' in x else {})})
            rec['stances'][s] = rs
            st[s] = [x for x in st[s] if not x.get('skip')]
            if not st[s]: rec.setdefault('unplanted', []).append(s)
        # the IK, stance keys only: the planted ankle reached by the leg, the foot's world turn as captured (but on the
        # ball, out of reach or straightening the knee past KNEE_KEEP_DEG with the heel up: the heel rises a little more
        # about the pinned ball instead). Each joint's change from the capture is kept as a rotation (delta)
        worst = {'residual_cm': 0.0, 'unreachable_keys': 0, 'foot_turned_keys': 0, 'foot_turned_max_deg': 0.0}
        new = [{'loc': dict(keys[k]['loc']), 'pos': keys[k]['pos'].copy()} for k in range(M)]
        delta = {s: [None] * M for s in legs.SIDES}
        for k in range(M):
            for s in legs.SIDES:
                if piv[s][k] is None: continue
                o = off[s][k]; g = F[k][s]
                tgt = g['A'] + Vector((float(o[0]), 0.0, float(o[2])))
                Wf = g['Wf']
                if ball_on[s][k]:
                    a_, b_ = (g['K'] - g['H']).length, (g['A'] - g['K']).length
                    keep = math.sqrt(a_ * a_ + b_ * b_ + 2 * a_ * b_ * math.cos(math.radians(
                        max(0.5, math.degrees((g['K'] - g['H']).angle(g['A'] - g['K'])) - KNEE_KEEP_DEG))))
                    Dl = min(_reach(g) - REACH_MARGIN, keep) if late[s][k] else _reach(g) - REACH_MARGIN
                    if (tgt - g['H']).length > Dl:
                        pv = tgt + Wf @ Vector(piv[s][k].tolist())
                        # (with the heel up the foot may turn further, to TOE_OFF_PITCH_DEG over the floor at most: a
                        # walker's foot leaves the ground at 50-60 deg)
                        hl_, bl_ = sole[s]
                        sv = Wf @ Vector((bl_ - hl_).tolist())
                        p0 = math.degrees(math.atan2(-sv.y, math.hypot(sv.x, sv.z)))
                        mx = max(MAX_PITCH_DEG, min(MAX_TOE_PITCH_DEG, TOE_OFF_PITCH_DEG - p0)) if late[s][k] else MAX_PITCH_DEG
                        pr = _pitch(g, tgt, pv, Dl, mx) or _pitch(g, tgt, pv, None, mx)
                        if pr is not None:
                            Rp, tgt = pr; Wf = (Rp @ Wf).normalized()
                            worst['foot_turned_keys'] += 1
                            worst['foot_turned_max_deg'] = max(worst['foot_turned_max_deg'], math.degrees(Rp.angle))
                Wt, Ws, got = _ik(g, tgt, hinge[s])
                res = (got - tgt).length
                if res > 1e-4: worst['unreachable_keys'] += 1
                worst['residual_cm'] = max(worst['residual_cm'], res * 100)
                legs.set(new[k], s, Wt, Ws, Wf, g['Wp'])
                # what the stance key changed: the ankle (it may have risen with the heel), the knee's bend, the foot's turn
                delta[s][k] = {'ankle': got - g['A'], 'knee': _flex_after(g, Wt, Ws) - _flex(g),
                               'foot': (Wf @ g['Wf'].inverted()).normalized()}
        # the swing: the toe-off's change eased out over the swing's first SWING_EASE, the next touchdown's eased in over its
        # last, the middle of the swing as captured (its knee bend, its foot's clearance). Each swing key is the captured
        # ankle moved by the eased change (the foot rises as captured) and reached by IK, its knee changed from the capture
        # no more than the eased change of the stance key it comes from or goes to (so nothing snaps: a run's leg leaves the
        # ground straight), its foot turned by the eased turn
        for s in legs.SIDES:
            pk = [k for k in range(M) if delta[s][k] is not None]
            if not pk: continue
            for i, a in enumerate(pk):
                b = pk[(i + 1) % len(pk)] + (M if i + 1 == len(pk) else 0)
                for k in range(a + 1, b):
                    u = (k - a) / (b - a)
                    src = delta[s][a] if u < 0.5 else delta[s][b % M]
                    e = _smooth(1.0 - u / SWING_EASE) if u < 0.5 else _smooth((u - 1.0 + SWING_EASE) / SWING_EASE)
                    if e <= 1e-4: continue
                    g = F[k % M][s]
                    cap_knee = abs(src['knee']) * e + 1.0
                    def solve(lam):
                        Wt, Ws, _ = _ik(g, g['A'] + src['ankle'] * (e * lam), hinge[s])
                        return (Wt, Ws) if abs(_flex_after(g, Wt, Ws) - _flex(g)) <= cap_knee else None
                    sol = solve(1.0)
                    if sol is None:     # the largest share of the change the knee's cap allows (none: as captured)
                        lo, hi = 0.0, 1.0
                        for _ in range(12):
                            mid = 0.5 * (lo + hi); t_ = solve(mid)
                            if t_ is not None: lo, sol = mid, t_
                            else: hi = mid
                    if sol is None: continue
                    Wf = (_sl(Quaternion(), src['foot'], e) @ g['Wf']).normalized()
                    legs.set(new[k % M], s, sol[0], sol[1], Wf, g['Wp'])
        # what the legs became (key by key, against the capture): the knee's change and its step from key to key
        knee_change = knee_step = 0.0
        knee_phase = {'stance': 0.0, 'swing': 0.0}
        prev = {}
        for k in range(M + 1):
            fn = legs.fk(new[k % M])
            for s in legs.SIDES:
                g0, g1 = F[k % M][s], fn[s]
                f0 = math.degrees((g0['K'] - g0['H']).angle(g0['A'] - g0['K'])); f1 = math.degrees((g1['K'] - g1['H']).angle(g1['A'] - g1['K']))
                knee_change = max(knee_change, abs(f1 - f0))
                ph = 'stance' if piv[s][k % M] is not None else 'swing'
                knee_phase[ph] = max(knee_phase[ph], abs(f1 - f0))
                if s in prev: knee_step = max(knee_step, abs((f1 - f0) - prev[s]))
                prev[s] = f1 - f0
                if DEBUG and k < M:
                    print(f"    {s[0]} key {k:2d} {'st' if piv[s][k] is not None else 'sw'} knee {f0:5.1f} -> {f1:5.1f}  ankle moved "
                          f"{(g1['A'] - g0['A']).length * 100:5.1f} cm")
        worst['knee_change_deg'] = knee_change; worst['knee_change_step_deg'] = knee_step
        worst['knee_change_stance_deg'] = knee_phase['stance']; worst['knee_change_swing_deg'] = knee_phase['swing']
        rec['ik'] = {k_: round(v_, 3) if isinstance(v_, float) else v_ for k_, v_ in worst.items()}
        stored = unplayed(new, rows, D, Dp, legs.JOINTS)
        # check: the stored keys played again (Loop Pose), measured as clip_qa.py measures them
        rec['check'] = measure_rows(stored, legs, fps, v)
        planted = {s: {k for k in range(M) if piv[s][k] is not None} for s in legs.SIDES}
        return stored, v, planted, worst

    need = {s: set() for s in legs.SIDES}
    for _ in range(4):
        stored, v, planted, worst = attempt(need)
        # the measure's own stances on the planted keys: any key it judges (the second after touchdown to toe-off, each a
        # step from the key before) that the plant left to the swing is taken into the stance next to it, and the plant run
        # again
        more = False
        for s in legs.SIDES:
            for x in rec['check']['stances'][s]:
                for k in range(x['touchdown'] + 1, x['toe_off'] + 1):
                    if k % M not in planted[s] and k % M not in need[s]: need[s].add(k % M); more = True
        if not more: break
    rec['extended_keys'] = {s: sorted(need[s]) for s in legs.SIDES}
    rec['before'] = measure_rows(rows, legs, fps, speed)
    print(f"  {name}: planted at {v:.3f} m/s (root travel {speed:.3f}); stance foot from the 2nd key after touchdown to toe-off: "
          f"{rec['before']['max_slow']:.2f} -> {rec['check']['max_slow']:.3f} m/s (contact point {rec['check']['max_foot']:.3f}); IK residual {worst['residual_cm']:.2f} cm "
          f"({worst['unreachable_keys']} keys unreachable), knee changed up to {worst['knee_change_deg']:.1f} deg")
    return stored, v, rec


def measure_rows(rows, legs, fps, v):
    """stance_measure on stored keys as Unity plays them (Loop Pose), three loops with the travel v."""
    keys, _, _ = played(rows)
    M = len(keys)
    _, A = _arrays(keys, legs, fps, v)
    P, R = {}, {}
    for s in legs.SIDES:
        P[s + 'Foot'] = A[s]['an']; P[s + 'Toes'] = A[s]['ba']; R[s + 'Foot'] = A[s]['Rf']
    m = stance_measure(P, R, fps, M)
    return {'max_slow': m['max_slow'], 'max_foot': m['max_foot'],
            'stances': {s: [{k: x[k] for k in ('touchdown', 'toe_off', 'slow', 'max_slow')} for x in m[s]] for s in legs.SIDES}}


def summary(rec):
    """The plant's record as a clip's json keeps it (the key-by-key figures stay in clip_qa.json)."""
    if not rec: return None
    out = {k: rec[k] for k in ('method', 'speed_root', 'speed', 'stride_m', 'cycle_s', 'played_stride_m', 'ik', 'unplanted', 'extended_keys') if k in rec}
    out['stances'] = rec.get('stances')
    # the stance foot's ground speed from the 2nd key after touchdown to toe-off, worst key: the slower of ankle and ball, and
    # the slowest of ankle, ball and contact point (clip_qa.py judges the latter)
    out['stance_max_ms'] = {'ankle_ball': [rec['before']['max_slow'], rec['check']['max_slow']],
                            'with_contact_point': [rec['before']['max_foot'], rec['check']['max_foot']], 'order': 'unplanted, planted'}
    return out
