"""Combat set v4.3 (docs/COMBAT_ANIMATION_STANDARD.md G13, "or have a captured step clip between them"): the re-stance steps.
Short captured steps from a still stance to a still stance (a half step forward, back, left or right, a turn in place,
widening or narrowing the stance), cut from the takes already on disk, each also mirrored. numpy only (no bpy).

    python3 -I tools/unity/motion/combat_v43_jobs.py mine <out.json>                        # every still-to-still step on disk
    python3 -I tools/unity/motion/combat_v43_jobs.py plan <plan.json> [<frames.json>]
    python3 -I tools/unity/motion/combat_v43_jobs.py frames <pass-1 dump dir> <pass-1 json dir> <frames.json>

The library (`STEPS`) was chosen from `mine` (2026-11-18: 205 takes, 342 still-to-still segments): standing (the hips over
0.65 m, within 15 cm of their height), quiet arms (both hands under 1.2 m/s against the chest), 0.25-1.4 s between the two
still stances, each foot moved at most 40 cm and turned at most 110°; per sex and kind the two shortest. Each clip is cut from
0.2 s before its first still stance ends to 0.25 s after its second begins (inside both), written in its own first key's frame
(origin at its centre of mass on the ground, +Z its body orientation: root_basis take) and carries `restance` in its json
(each foot's offset and turn from its first key to its last, the reference body's 0.935 m hip height), which is what the
runtime chooses it by (README §2 of the v4.3 stage).
"""
import glob, json, math, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import combat_v4_jobs as J

CMU_EXTRA = ['/home/user/second-face-staging/motion/raw/cmu']


def S(name, db, src, rng, sex, kind):
    return dict(name=name, db=db, src=src, range=rng, face='first', state='S24', gate='step', weapon=J.ANY, events='step',
                timing='restance', set={'m': 'm', 'f': 'f', 'u': 'both'}[sex], step_kind=kind,
                kind=f"re-stance step: {kind.replace('turnL', 'turn left ').replace('turnR', 'turn right ')} "
                     f"({ {'m': 'a man', 'f': 'a woman', 'u': 'sex not recorded'}[sex] })")


STEPS = [   # (the mined segment: seconds between the two still stances; each foot's offset in cm, left +x, forward +z; turns)
    S('step_back_f_7604', 'cmu', '76_04', (2.158, 3.025), 'f', 'back'),           # 0.42 s, the right foot 22 cm back, 13° in
    S('step_back_f_76042', 'cmu', '76_04', (1.167, 2.308), 'f', 'back'),          # 0.69 s, the left foot 14 cm back
    S('step_left_f_11411', 'cmu', '114_11', (19.017, 19.817), 'f', 'left'),       # 0.35 s, the left foot out 10 cm, turned 42°
    S('step_narrow_f_14421', 'cmu', '144_21', (14.692, 15.5), 'f', 'narrow'),     # 0.40 s, the left foot 13 cm in
    S('step_right_f_11128', 'cmu', '111_28', (4.0, 4.908), 'f', 'right'),         # 0.46 s, the right foot out 22 cm
    S('step_turnL45_f_11411', 'cmu', '114_11', (19.683, 21.008), 'f', 'turnL45'),  # 0.98 s
    S('step_turnR45_f_11313', 'cmu', '113_13', (9.892, 10.8), 'f', 'turnR45'),    # 0.46 s, the right foot out and turned 56°
    S('step_turnR45_f_11133', 'cmu', '111_33', (7.6, 8.575), 'f', 'turnR45'),     # 0.53 s, the right foot back 36 cm, 64°
    S('step_widen_f_14426', 'cmu', '144_26', (22.308, 23.958), 'f', 'widen'),     # 1.20 s
    S('step_back_m_14320', 'cmu', '143_20', (4.283, 5.067), 'm', 'back'),         # 0.33 s, the left foot 12 cm back
    S('step_back_m_m2e2turnar', 'accad', 'Male2_E2_TurnAroundLeft', (8.267, 9.017), 'm', 'back'),
    S('step_fwd_m_m2e2turnar', 'accad', 'Male2_E2_TurnAroundLeft', (10.5, 11.233), 'm', 'fwd'),
    S('step_fwd_m_m2e2turnar2', 'accad', 'Male2_E2_TurnAroundLeft', (9.1, 9.833), 'm', 'fwd'),
    S('step_left_m_m2e2jabrig', 'accad', 'Male2_E2_JabRight', (1.1, 2.15), 'm', 'left'),   # 0.60 s, both feet 15 cm left
    S('step_narrow_m_14320', 'cmu', '143_20', (2.033, 2.7), 'm', 'narrow'),
    S('step_right_m_14320', 'cmu', '143_20', (2.517, 3.383), 'm', 'right'),
    S('step_turnL45_m_m2e2turnar', 'accad', 'Male2_E2_TurnAroundLeft', (7.7, 8.367), 'm', 'turnL45'),
    S('step_turnL45_m_m2e2turnar2', 'accad', 'Male2_E2_TurnAroundLeft', (9.733, 10.45), 'm', 'turnL45'),
    S('step_turnL90_m_m2e2turnar', 'accad', 'Male2_E2_TurnAroundLeft', (2.2, 3.367), 'm', 'turnL90'),
    S('step_turnL90_m_m2e2turnar2', 'accad', 'Male2_E2_TurnAroundLeft', (0.6, 1.983), 'm', 'turnL90'),
    S('step_turnR45_m_m2e1turnar', 'accad', 'Male2_E1_TurnAroundRight', (2.933, 3.533), 'm', 'turnR45'),
    S('step_turnR45_m_m2e1turnar2', 'accad', 'Male2_E1_TurnAroundRight', (4.633, 5.2), 'm', 'turnR45'),
    S('step_widen_m_m2e6quickr', 'accad', 'Male2_E6_QuickRetreat', (0.733, 1.75), 'm', 'widen'),
    S('step_back_u_3301', 'cmu', '33_01', (31.017, 32.133), 'u', 'back'),
    S('step_back_u_3401', 'cmu', '34_01', (26.733, 28.167), 'u', 'back'),
    S('step_fwd_u_7703', 'cmu', '77_03', (5.383, 6.15), 'u', 'fwd'),
    S('step_fwd_u_7717', 'cmu', '77_17', (9.567, 10.433), 'u', 'fwd'),
    S('step_left_u_3401', 'cmu', '34_01', (43.283, 44.0), 'u', 'left'),
    S('step_left_u_7709', 'cmu', '77_09', (15.3, 16.25), 'u', 'left'),
    S('step_narrow_u_7718', 'cmu', '77_18', (8.917, 9.783), 'u', 'narrow'),
    S('step_narrow_u_crouchedid', 'style', 'Crouched_ID', (4.05, 4.883), 'u', 'narrow'),
]
JOBS = []
for d in STEPS:
    JOBS.append(dict(d, chain=d['name']))
    # (mirrored: the left and right feet swapped through the body's mid-plane, as v4 mirrored CMU 143's throws)
    JOBS.append(dict(d, name=d['name'] + '_mir', chain=d['name'], mirror=True, kind=d['kind'] + ', mirrored',
                     step_kind={'left': 'right', 'right': 'left', 'turnL45': 'turnR45', 'turnR45': 'turnL45', 'turnL90': 'turnR90'}.get(d['step_kind'], d['step_kind'])))


def frames_from(dump_dir, json_dir):
    import stance_continuity as SC
    out = {}
    for d in STEPS:
        A = SC.clip_feet([dump_dir], [json_dir], d['name'], basis='first')
        if A is None: raise SystemExit(f"no pass-1 dump of {d['name']}")
        m, j, (o, yaw), _ = A
        out[d['name']] = dict(yaw=-yaw + SC.TAKE_FRONT, origin=[float(o[0]), float(o[2])], ref=d['name'], front={'by': 'body', 'clip': d['name']},
                              note="origin and +Z: the step's own first-key centre of mass and body orientation")
    return out


def plan(frames=None):
    J.CMU_DIRS[:] = list(dict.fromkeys(J.CMU_DIRS + CMU_EXTRA))
    res = []
    for d in JOBS:
        d = dict(d)
        d['frame'] = dict(frames[d['chain']]) if frames else dict(yaw=0.0, origin=[0.0, 0.0], ref="pass 1: the take's raw frame")
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


def mine():
    """Every still-to-still step in the takes on disk: both feet (ankles and toe joints) slower than 0.12 m/s for 0.12 s, then
    0.2-1.6 s of motion, then still again; each foot's offset and turn in the first stance's frame (the feet's midpoint, the
    body orientation); the hips' height and travel; the hands' fastest against the chest."""
    J.CMU_DIRS[:] = list(dict.fromkeys(J.CMU_DIRS + CMU_EXTRA))
    def stills(m, vmax=0.12, dur=0.12):
        v = np.zeros(m.n)
        for s in ('Left', 'Right'):
            for b in ('Foot', 'Toes'):
                v = np.maximum(v, np.linalg.norm(np.gradient(m.P[s + b][:, [0, 2]], axis=0), axis=1) * m.fps)
        on = v < vmax; res = []; i = 0
        while i < m.n:
            if on[i]:
                j = i
                while j < m.n and on[j]: j += 1
                if (j - i) / m.fps >= dur: res.append((i, j - 1))
                i = j
            else: i += 1
        return res
    def frame(m, k):
        h = m.P['LeftUpperLeg'][k] - m.P['RightUpperLeg'][k]; s = m.P['LeftUpperArm'][k] - m.P['RightUpperArm'][k]; h[1] = s[1] = 0
        v = h / np.linalg.norm(h) + s / np.linalg.norm(s); c = 0.5 * (m.P['LeftFoot'][k] + m.P['RightFoot'][k])
        return np.array([c[0], 0, c[2]]), math.atan2(-v[2], v[0])
    def loc(p, fr):
        o, y = fr; d = p - o; c, s = math.cos(-y), math.sin(-y); return np.array([c * d[0] + s * d[2], -s * d[0] + c * d[2]])
    def fyaw(m, k, side):
        t = m.P[side + 'Toes'][k] - m.P[side + 'Foot'][k]; return math.degrees(math.atan2(t[0], t[2]))
    takes = [('accad', os.path.basename(f)[:-4]) for d in J.ACCAD_DIRS for f in sorted(glob.glob(d + '/*.bvh'))]
    takes += [('cmu', os.path.basename(f)[:-4]) for d in J.CMU_DIRS for f in sorted(glob.glob(d + '/*/*.amc'))]
    takes += [('style', os.path.basename(f)[:-4]) for f in sorted(glob.glob(J.STYLE_DIR + '/*.bvh'))]
    out = []
    for db, src in dict.fromkeys(takes):
        m = J.load(db, src)
        if m is None or m.n < 10: continue
        P = stills(m)
        for (a0, a1), (b0, b1) in zip(P, P[1:]):
            dt = (b0 - a1) / m.fps
            if not 0.2 <= dt <= 1.6: continue
            fa = frame(m, a1)
            dL = loc(m.P['LeftFoot'][b0], fa) - loc(m.P['LeftFoot'][a1], fa); dR = loc(m.P['RightFoot'][b0], fa) - loc(m.P['RightFoot'][a1], fa)
            yL = (fyaw(m, b0, 'Left') - fyaw(m, a1, 'Left') + 180) % 360 - 180; yR = (fyaw(m, b0, 'Right') - fyaw(m, a1, 'Right') + 180) % 360 - 180
            hip = np.linalg.norm((m.P['Hips'][b0] - m.P['Hips'][a1])[[0, 2]]); hy = m.P['Hips'][a1:b0 + 1, 1]
            if max(np.linalg.norm(dL), np.linalg.norm(dR)) < 0.04 and max(abs(yL), abs(yR)) < 8 or hip > 0.7: continue
            ch = m.P['UpperChest'] if 'UpperChest' in m.P else m.P['Chest']
            arm = max(float((np.linalg.norm(np.gradient(m.P[x + 'Hand'][a1:b0 + 1] - ch[a1:b0 + 1], axis=0), axis=1) * m.fps).max())
                      for x in ('Left', 'Right')) if b0 - a1 > 2 else 0.0
            wa = np.linalg.norm(loc(m.P['LeftFoot'][a1], fa) - loc(m.P['RightFoot'][a1], fa)); wb = np.linalg.norm(loc(m.P['LeftFoot'][b0], fa) - loc(m.P['RightFoot'][b0], fa))
            out.append(dict(db=db, src=src, a=[round(a0 / m.fps, 3), round(a1 / m.fps, 3)], b=[round(b0 / m.fps, 3), round(b1 / m.fps, 3)], dt=round(dt, 3),
                            dL=[round(float(x) * 100, 1) for x in dL], dR=[round(float(x) * 100, 1) for x in dR], yL=round(yL, 1), yR=round(yR, 1),
                            w=[round(wa * 100, 1), round(wb * 100, 1)], hip_cm=round(hip * 100, 1), hipY=[round(float(hy.min()), 2), round(float(hy.max()), 2)],
                            arm_mps=round(arm, 2)))
    return out


if __name__ == '__main__':
    a = sys.argv[1:]
    if a[0] == 'mine':
        r = mine(); json.dump(r, open(a[1], 'w'), indent=1); print(len(r), 'still-to-still segments')
    elif a[0] == 'plan':
        fr = json.load(open(a[2])) if len(a) > 2 else None
        p = plan(fr); json.dump(p, open(a[1], 'w'), indent=1)
        print(f"{len(p)} jobs, {'final frames' if fr else 'pass 1 (raw frames)'}; missing: {[d['name'] for d in p if d.get('missing')]}")
    elif a[0] == 'frames':
        fr = frames_from(a[1], a[2]); json.dump(fr, open(a[3], 'w'), indent=1); print(len(fr), 'frames')
