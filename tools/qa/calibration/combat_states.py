"""Combat states measured on real people (docs/qa/motion_calibration.md §7): what the motion gate's measures read on captured
fighters, per state, so the gate can hold combat clips to real people instead of to quiet standing (COMBAT_ASSETS doubt 3).

    python3 -I tools/qa/calibration/combat_states.py <cmu dir[,dir]> <accad dir[,dir]> <out.json>

States, found frame by frame in each trial (thresholds on the trial's own standing hip height h0, its p90):
  guard   unarmed fighting stance, held: hips >= 0.85 h0, both hands up (wrist within 30 cm under the head joint and 40 cm of it
          across), both hands slower than 1 m/s, both feet down
  strike  a punch or block on its way: hips >= 0.75 h0, one hand faster than 2 m/s, both feet down
  aim     a long gun held at the shoulder: the trials' aim-hold stretches (CMU 79_96 4.1-6.9 s, 80_03 4.3-6.6 s)
  crouch  low and holding: hips <= 0.70 h0, hips moving under 0.2 m/s, both feet down (cover, a wary crouch)
Measures (measures.py, as the gate defines them): K1 the straighter knee's flexion, Kmax the more bent knee's, H1 head pitch,
H2 head yaw on the chest, H3 head roll, F2h the heel's lift over the ball of the more lifted weight-bearing foot (cm),
F3w stance width (cm), A1 the upper arm from hanging, A2 the elbow's bend.
"""
import json, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import skel, measures as M

# (database, trial, rate, sex, what): rates from each trial's C3D header (CMU) or BVH frame time (ACCAD)
TRIALS = [
    ('accad', 'Male2_D1_StandToReady', None, 'm', 'into the guard'), ('accad', 'Male2_D2_WalkToReady', None, 'm', 'walk into the guard'),
    ('accad', 'Male2_D4_ReadyToRelax', None, 'm', 'guard, out of it'),
    ('accad', 'Male2_E1_JabLeft', None, 'm', 'jab'), ('accad', 'Male2_E2_JabRight', None, 'm', 'jab'), ('accad', 'Male2_E3_CrossLeft', None, 'm', 'cross'),
    ('accad', 'Male2_E4_CrossRight', None, 'm', 'cross'), ('accad', 'Male2_E5_HookLeft', None, 'm', 'hook'), ('accad', 'Male2_E6_HookRight', None, 'm', 'hook'),
    ('accad', 'Male2_E7_UppercutLeft', None, 'm', 'uppercut'), ('accad', 'Male2_E8_UppercutRight', None, 'm', 'uppercut'),
    ('accad', 'Male2_E13_BlockRightHigh', None, 'm', 'block'), ('accad', 'Male2_E19_DodgeLeft', None, 'm', 'dodge'),
    ('accad', 'Male2_E20_DodgeRight', None, 'm', 'dodge'), ('accad', 'Male2_E21_DuckLeft', None, 'm', 'duck'),
    ('accad', 'Male2_A7_Crouch', None, 'm', 'crouch'), ('accad', 'Male2_C26_RunToCrouch', None, 'm', 'run to crouch'),
    ('accad', 'Male2_C27_CrouchToRun', None, 'm', 'crouch to run'), ('accad', 'Male2_B25_CrouchToWalk', None, 'm', 'crouch to walk'),
    ('accad', 'Male2_A10_LieToCrouch', None, 'm', 'lie to crouch'),
    ('accad', 'Female1_A07_Crouch', None, 'f', 'crouch'), ('accad', 'Female1_B24_WalkToCrouch', None, 'f', 'walk to crouch'),
    ('accad', 'Female1_C26_RunToCrouch', None, 'f', 'run to crouch'), ('accad', 'Female1_C27_CrouchToRun1', None, 'f', 'crouch to run'),
    ('accad', 'Female1_B25_CrouchToWalk', None, 'f', 'crouch to walk'), ('accad', 'Female1_A10_LieToCrouch', None, 'f', 'lie to crouch'),
    ('cmu', '144_13', 120, 'f', 'left punches'), ('cmu', '144_20', 120, 'f', 'right punches'), ('cmu', '144_21', 120, 'f', 'right punches'),
    ('cmu', '144_07', 120, 'f', 'left blocks'), ('cmu', '144_26', 120, 'f', 'right blocks'), ('cmu', '141_14', 60, 'f', 'punch and kick'),
    ('cmu', '113_13', 120, 'f', 'punch and kick'), ('cmu', '13_17', 120, 'u', 'boxing'),
    ('cmu', '79_96', 60, 'u', 'shooting a gun'), ('cmu', '80_03', 60, 'u', 'shooting a gun'),
    ('cmu', '77_03', 60, 'u', 'ready stance (crouched)'), ('cmu', '77_09', 60, 'u', 'duck'),
]
AIM = {'79_96': (4.1, 6.9), '80_03': (4.3, 6.6)}
# CMU's head segment carries a per-subject offset (its quiet stance reads 20-26° down and 17-31° turned on the chest: 144,
# 141, 13, 113), so a CMU trial's head is taken relative to the actor's own relaxed stance at the take's start (these
# seconds; the head then reads level and square to the chest there). ACCAD's heads stand level (Male2 Stand: +4.7°) as they
# are. A CMU trial without such a stretch gives no head measures.
BASE = {'144_13': (0, 0.7), '144_20': (0, 0.9), '144_21': (0, 0.8), '144_07': (0, 0.6), '144_26': (0, 0.6), '141_14': (0, 1.0),
        '113_13': (0, 0.8), '79_96': (0, 1.5)}
KEYS = ('K1', 'Kmax', 'H1', 'H2', 'H3', 'F2h', 'F3w', 'A1', 'A2')


def _find(dirs, *parts):
    for d in dirs:
        p = os.path.join(d, *parts)
        if os.path.exists(p): return p
    return None


def load(db, tid, fps, cmu, accad):
    if db == 'cmu':
        s = tid.split('_')[0]
        a, b = _find(cmu, s, s + '.asf'), _find(cmu, s, tid + '.amc')
        return skel.load_amc(a, b, fps) if a and b else None
    p = _find(accad, tid + '.bvh')
    return skel.load_bvh(p) if p else None


def per_frame(m, base=None, cmu=False):
    """Every measure per frame (n,), and the state of each frame."""
    fwd = M.body_front(m, 'stand')
    a = M.arms(m); lg = M.legs(m, fwd)
    if base is not None:
        ch = m.R['UpperChest'] if 'UpperChest' in m.R else m.R['Chest']
        rel = np.einsum('nji,njk->nik', ch, m.R['Head'])
        b0, b1 = (int(round(t * m.fps)) for t in base)
        U, _, Vt = np.linalg.svd(rel[b0:b1].sum(0)); B = U @ Vt
        m.R['Head'] = np.einsum('nij,njk,lk->nil', ch, rel, B)
    pitch, yaw, roll = M.head(m)
    if cmu and base is None: pitch = yaw = roll = np.full(m.n, np.nan)
    so, _ = M.soles(m)
    down = {s: np.minimum(so[s]['hh'], so[s]['bh']) < 3.0 for s in ('Left', 'Right')}
    lift = np.full(m.n, -np.inf)
    for s in ('Left', 'Right'):
        lift = np.where(down[s], np.maximum(lift, so[s]['hh'] - so[s]['bh']), lift)
    # the head's yaw on the chest is undefined while the face points near straight down or up (a crouch looking at the floor)
    chf = (m.R['UpperChest'] if 'UpperChest' in m.R else m.R['Chest']) @ np.array([0, 0, 1.0])
    yaw = np.where((np.abs(pitch) > 60.0) | (np.abs(chf[:, 1]) > 0.87), np.nan, yaw)   # ... or the chest bowed past 60°
    v = {'K1': lg['K1'], 'Kmax': np.maximum(lg['flexL'], lg['flexR']), 'H1': pitch, 'H2': yaw, 'H3': roll, 'F2h': lift, 'F3w': lg['F3w'],
         'A1': np.maximum(a['Left']['A1'], a['Right']['A1']), 'A2': np.maximum(a['Left']['A2'], a['Right']['A2'])}
    both = down['Left'] & down['Right']
    hip = m.P['Hips'][:, 1]; h0 = np.percentile(hip, 90)
    hv = np.abs(np.gradient(hip)) * m.fps
    sp = {s: np.linalg.norm(np.gradient(m.P[s + 'Hand'], axis=0), axis=1) * m.fps for s in ('Left', 'Right')}
    head = m.P['Head']
    up = {s: (m.P[s + 'Hand'][:, 1] >= head[:, 1] - 0.30) & (np.linalg.norm((m.P[s + 'Hand'] - head)[:, [0, 2]], axis=1) <= 0.40) for s in ('Left', 'Right')}
    st = {'guard': (hip >= 0.85 * h0) & up['Left'] & up['Right'] & (sp['Left'] < 1.0) & (sp['Right'] < 1.0) & both,
          'strike': (hip >= 0.75 * h0) & ((sp['Left'] > 2.0) | (sp['Right'] > 2.0)) & both,
          'crouch': (hip <= 0.70 * h0) & (hv < 0.2) & both}
    return v, st


def stats(x):
    x = x[np.isfinite(x)]
    if len(x) < 5: return None
    return [round(float(np.percentile(x, q)), 1) for q in (2, 50, 98)] + [round(float(x.min()), 1), round(float(x.max()), 1)]   # p2 p50 p98 min max


def main():
    cmu, accad, out = sys.argv[1].split(','), sys.argv[2].split(','), sys.argv[3]
    pool = {}   # (state, sex) -> {key: [arrays]}
    rows = []
    for db, tid, fps, sex, what in TRIALS:
        m = load(db, tid, fps, cmu, accad)
        if m is None: rows.append({'trial': tid, 'missing': True}); continue
        v, st = per_frame(m, BASE.get(tid) if db == 'cmu' else None, db == 'cmu')
        if tid in AIM:
            a, b = (int(round(t * m.fps)) for t in AIM[tid]); mask = np.zeros(m.n, bool); mask[a:b] = True
            st = {'aim': mask}
        # each trial counts only for the states it was captured for (a run into a crouch swings its hands past 2 m/s too)
        keep = {'crouch'} if ('crouch' in what or 'lie' in what or 'duck' == what) else ({'aim'} if tid in AIM else {'guard', 'strike'})
        st = {k: v_ for k, v_ in st.items() if k in keep}
        r = {'trial': f'{db.upper()} {tid}', 'sex': sex, 'what': what, 'fps': round(m.fps, 1), 'frames': {}}
        for s, mask in st.items():
            k = int(mask.sum()); r['frames'][s] = k
            if k < max(5, int(0.1 * m.fps)): continue
            for key in KEYS: pool.setdefault((s, sex), {}).setdefault(key, []).append(v[key][mask])
            pool.setdefault((s, 'all'), {})
            for key in KEYS: pool[(s, 'all')].setdefault(key, []).append(v[key][mask])
            pool[(s, sex)].setdefault('_trials', []).append(tid); pool[(s, 'all')].setdefault('_trials', []).append(tid)
        rows.append(r)
    res = {}
    for (s, sex), d in sorted(pool.items()):
        e = {'trials': sorted(set(d['_trials'])), 'seconds': None}
        for key in KEYS: e[key] = stats(np.concatenate(d[key]))
        res[f'{s}/{sex}'] = e
    json.dump({'trials': rows, 'states': res}, open(out, 'w'), indent=1)
    print(f"{'state/sex':14s} trials  " + '  '.join(f'{k:>16s}' for k in KEYS))
    for k, e in res.items():
        print(f"{k:14s} {len(e['trials']):3d}  " + '  '.join(f"{('%s' % e[key]) if e[key] else '-':>16s}" for key in KEYS))


if __name__ == '__main__':
    main()
