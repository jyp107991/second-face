"""The fight's facing on real fighters (docs/PEOPLE_MOTION.md §2.7 FY1/FY2; docs/qa/motion_calibration.md §11): the pelvis's
and the chest's yaw against the target, per state, on the actors of §8, so the motion gate can hold a fighter to face
what they fight (a gate hole: the take-frame clips of combat set v4.1 played with the body 180° from its target and no
measure saw it, docs/COMBAT_ROOT_CAUSE.md §11). numpy only.

    python3 -I tools/qa/calibration/facing.py <out.json>

The target, which no capture records, is read from the action itself:
  aim     the gun line: the main (right) hand to the off (left) hand, flat (a long gun held at the shoulder);
  ready   the same take's later aim's median gun line, over the take's frames before the gun comes up (the off hand
          still within 10 cm of its height at the take's start): CMU 79_96 and 80_03 stand at the ready before their aim
          (100STYLE's actor walks and turns into his: no ready, left out);
  strike  each blow's own line: the upper chest to the striking hand where it reaches furthest from it, over that blow's
          frames (a hand over 2 m/s, the hips up, both feet down: combat_states' strike frames, one run of them a blow).
Facing: the pelvis's (the hip joints' line) and the chest's (the shoulder joints' line) front, flat. Yaw: degrees from the
target's line to the facing, + clockwise seen from above (to the fighter's right: Unity's sign). Right-handed fighters, as
the game's are.
"""
import json, math, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', '..', 'unity', 'motion'))
import combat_states as CS
import combat_v4_jobs as J

AIM = [('cmu', '79_96', (4.1, 6.9)), ('cmu', '80_03', (4.3, 6.6)), ('style', 'Swat_ID', (9.0, 14.0))]
STRIKE = [('accad', t, None) for t in ('Male2_E1_JabLeft', 'Male2_E4_CrossRight', 'Male2_E5_HookLeft', 'Male2_E6_HookRight',
                                         'Male2_E9_BodyHookLeft', 'Male2_E12_BackfistRight', 'Male2_E14_BodyCrossRight')] + \
         [('cmu', '143_23', (0.5, 12.2)), ('cmu', '144_13', (0.5, 14.0)), ('cmu', '144_20', (0.5, 12.0)), ('cmu', '141_14', (1.0, 3.9)), ('cmu', '113_13', (0.9, 3.3))]


def flat_yaw(v):
    """The heading of flat vectors in the captures' axes (x left, z forward), radians, counter-clockwise from above."""
    return np.arctan2(v[..., 0], v[..., 2])


def facing(m):
    """The pelvis's and the chest's front headings per frame (left x up = forward: (x, 0, z) x (0, 1, 0) = (-z, 0, x))."""
    out = {}
    for k, (l, r) in {'pelvis': ('LeftUpperLeg', 'RightUpperLeg'), 'chest': ('LeftUpperArm', 'RightUpperArm')}.items():
        v = m.P[l] - m.P[r]
        out[k] = np.arctan2(-v[:, 2], v[:, 0])
    return out


def cw(target, heading):
    """Degrees from the target's heading to the facing, + clockwise from above (the captures' axes turn counter-clockwise)."""
    return -np.degrees((heading - target + np.pi) % (2 * np.pi) - np.pi)


def gun_line(m):
    return flat_yaw(m.P['LeftHand'] - m.P['RightHand'])


def runs(mask):
    """The runs of True in a mask: (start, end) index pairs."""
    out, i, n = [], 0, len(mask)
    while i < n:
        if mask[i]:
            j = i
            while j < n and mask[j]: j += 1
            out.append((i, j)); i = j
        else: i += 1
    return out


def stats(x):
    x = np.asarray(x, float); x = x[np.isfinite(x)]
    if len(x) < 5: return None
    return [round(float(np.percentile(x, q)), 1) for q in (2, 50, 98)] + [round(float(x.min()), 1), round(float(x.max()), 1)]


def main():
    pool = {s: {'pelvis': [], 'chest': []} for s in ('aim', 'ready', 'strike')}
    trials = []
    for db, tid, rng in AIM:
        m = J.load(db, tid)
        if m is None: trials.append({'trial': tid, 'missing': True}); continue
        f = facing(m); g = gun_line(m)
        a, b = int(round(rng[0] * m.fps)), min(m.n, int(round(rng[1] * m.fps)))
        row = {'state': 'aim', 'trial': f'{db.upper()} {tid}', 'frames': b - a}
        for k in ('pelvis', 'chest'):
            y = cw(g[a:b], f[k][a:b]); pool['aim'][k].append(y); row[k] = stats(y)
        trials.append(row)
        # the ready before it: the off hand still near its height at the take's start, against the aim's median gun line
        line = float(np.angle(np.mean(np.exp(1j * g[a:b]))))
        h0 = m.P['LeftHand'][0, 1]
        up = np.nonzero(m.P['LeftHand'][:, 1] > h0 + 0.10)[0]
        e = int(up[0]) if len(up) else 0
        # (100STYLE's actor walks and turns into his aim, 81° off its line: no ready stance before it, left out)
        if e >= 5 and db != 'style':
            row = {'state': 'ready', 'trial': f'{db.upper()} {tid}', 'frames': e, 'until_s': round(e / m.fps, 2)}
            for k in ('pelvis', 'chest'):
                y = cw(np.full(e, line), f[k][:e]); pool['ready'][k].append(y); row[k] = stats(y)
            trials.append(row)
    for db, tid, rng in STRIKE:
        m = J.load(db, tid)
        if m is None: trials.append({'trial': tid, 'missing': True}); continue
        _, st = CS.per_frame(m, None, db in ('cmu', 'style'))
        mask = st['strike']
        if rng:
            a_, b_ = int(round(rng[0] * m.fps)), min(m.n, int(round(rng[1] * m.fps)))
            keep = np.zeros(m.n, bool); keep[a_:b_] = True; mask = mask & keep
        f = facing(m)
        ch = m.P['UpperChest'] if 'UpperChest' in m.P else m.P['Chest']
        sp = {s: np.linalg.norm(np.gradient(m.P[s + 'Hand'], axis=0), axis=1) * m.fps for s in ('Left', 'Right')}
        ys = {'pelvis': [], 'chest': []}; blows = 0
        for i, j in runs(mask):
            if j - i < 2: continue
            hand = 'Left' if sp['Left'][i:j].max() > sp['Right'][i:j].max() else 'Right'
            reach = np.linalg.norm((m.P[hand + 'Hand'] - ch)[i:j][:, [0, 2]], axis=1)
            k_ = i + int(np.argmax(reach))
            t = float(flat_yaw((m.P[hand + 'Hand'] - ch)[k_]))
            for k in ('pelvis', 'chest'): ys[k].append(cw(np.full(j - i, t), f[k][i:j]))
            blows += 1
        row = {'state': 'strike', 'trial': f'{db.upper()} {tid}', 'blows': blows}
        for k in ('pelvis', 'chest'):
            if ys[k]: y = np.concatenate(ys[k]); pool['strike'][k].append(y); row[k] = stats(y)
        trials.append(row)
    states = {}
    for s, d in pool.items():
        states[s] = {('FY1' if k == 'pelvis' else 'FY2'): stats(np.concatenate(v)) if v else None for k, v in d.items()}
        states[s]['actors'] = sorted({r['trial'] for r in trials if r.get('state') == s and r.get('pelvis')})
    json.dump({'about': __doc__.strip().split('\n')[0], 'trials': trials, 'states': states}, open(sys.argv[1], 'w'), indent=1)
    for s, v in states.items(): print(s, v)
    for r in trials: print(r)


if __name__ == '__main__':
    main()
