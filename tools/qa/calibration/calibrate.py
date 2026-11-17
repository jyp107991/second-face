"""Calibrate the motion gate on real people (docs/MOTION_ROOT_CAUSE.md T1): run the gate's skeleton-readable measures on the
source captures, on the actors' own skeletons at their real frame rates, and report how real people score against each
limit, by sex and state. Writes docs/qa/motion_calibration.json (the numbers) and prints the tables for
docs/qa/motion_calibration.md. Changes no limit.

    python3 -I tools/qa/calibration/calibrate.py <cmu dir> <accad bvh dir> <out.json> [--old-cmu <dir>]

<cmu dir> holds <subject>/<subject>.asf and <subject>/<trial>.amc (mocap.cs.cmu.edu); <accad bvh dir> the ACCAD Open Motion
Project takes (Female1_*.bvh, Male1_*.bvh, Male2_*.bvh, accad.osu.edu). Each trial in TRIALS names its source person's sex
as the database records it (CMU records none except in a subject's title: 106 "Female General Subject", whose files are
byte for byte subject 141's; 111/113/114 a woman pregnant and after; 104 "neutral Male walk"), and the frame rate: the
listing's, except where gravity on the subject's own jumps says otherwise (141/106 and 143: listed 120, jumps fit 56-61).
"""
import json, os, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import skel
import measures as M

# (trial, state, sex, note); state: stand | look | walk | jog
TRIALS = [
    # standing: women
    ('cmu:113_21', 'stand', 'f', 'CMU 113 "Standing Still" (a woman after pregnancy)'),
    ('cmu:111_28', 'stand', 'f-preg', 'CMU 111 "Standing still" (a woman, pregnant)'),
    ('cmu:141_20', 'stand', 'f', 'CMU 141 "Waiting" (= 106 "Female General Subject"; 60 fps by its jumps)'),
    ('accad:Female1_A01_Stand', 'stand', 'f', 'ACCAD Female1 "Stand"'),
    ('accad:Female1_D2_Wait', 'stand', 'f', 'ACCAD Female1 "Wait"'),
    ('accad:Female1_A04_Look', 'look', 'f', 'ACCAD Female1 "Look"'),
    # standing: men
    ('accad:Male1_A1_Stand', 'stand', 'm', 'ACCAD Male1 "Stand"'),
    ('accad:Male2_A1_Stand', 'stand', 'm', 'ACCAD Male2 "Stand"'),
    ('accad:Male1_A2_Sway', 'stand', 'm', 'ACCAD Male1 "Sway"'),
    ('accad:Male2_A2_Sway', 'stand', 'm', 'ACCAD Male2 "Sway"'),
    ('accad:Male1_A4_LookAround', 'look', 'm', 'ACCAD Male1 "Look around"'),
    ('accad:Male2_A4_LookAround', 'look', 'm', 'ACCAD Male2 "Look around"'),
    ('accad:Female1_A02_Sway', 'stand', 'f', 'ACCAD Female1 "Sway"'),
    # standing: sex not recorded
    ('cmu:77_02', 'stand', 'u', 'CMU 77 "standing" (60 fps, listed)'),
    ('cmu:82_08', 'stand', 'u', 'CMU 82 "stand still; casual walk forward" (its standing part)'),
    ('cmu:140_06', 'stand', 'u', 'CMU 140 "Idle"'),
    ('cmu:40_10', 'stand', 'u', 'CMU 40 "wait for bus"'),
    ('cmu:137_28', 'stand', 'u', 'CMU 137 "Normal Wait" (an actor\'s styles)'),
    # walking: women
    ('accad:Female1_B01_StandToWalk', 'walk', 'f', 'ACCAD Female1 "Stand to walk" (steady part)'),
    ('accad:Female1_B02_WalkToStand', 'walk', 'f', 'ACCAD Female1 "Walk (more swing at the hips) to stand" (steady part)'),
    ('accad:Female1_B03_Walk1', 'walk', 'f', 'ACCAD Female1 "Walk with long steps (minimal sway at the hips)"'),
    ('cmu:113_25', 'walk', 'f', 'CMU 113 "Walk"'),
    ('cmu:141_19', 'walk', 'f', 'CMU 141 "Walk" (60 fps; a curved path)'),
    ('cmu:141_25', 'walk', 'f', 'CMU 141 "Walk" (60 fps; a curved path)'),
    ('cmu:111_34', 'walk', 'f-preg', 'CMU 111 "Walk" (pregnant)'),
    ('cmu:114_13', 'walk', 'f-preg', 'CMU 114 "Walk" (pregnant)'),
    # walking: men
    ('accad:Male1_B3_Walk', 'walk', 'm', 'ACCAD Male1 "Walk"'),
    ('accad:Male2_B3_Walk', 'walk', 'm', 'ACCAD Male2 "Walk"'),
    ('accad:Male1_B1_StandToWalk', 'walk', 'm', 'ACCAD Male1 "Stand to walk" (steady part)'),
    ('accad:Male2_B1_StandToWalk', 'walk', 'm', 'ACCAD Male2 "Stand to walk" (steady part)'),
    ('cmu:104_02', 'walk', 'm', 'CMU 104 "neutral Male walk"'),
    ('cmu:104_19', 'walk', 'm', 'CMU 104 "CasualWalk"'),
    ('cmu:104_35', 'walk', 'm', 'CMU 104 "SlowWalk"'),
    # walking: sex not recorded (the game's walk sources among them)
    *[('cmu:' + t, 'walk', 'u', 'CMU ' + t) for t in ('07_01', '07_02', '07_03', '07_04', '07_06', '07_12', '08_01', '08_02', '08_03', '08_04',
                                                     '35_01', '35_02', '35_03', '16_15', '16_16', '12_01', '69_01', '69_02', '02_01', '82_11', '82_13')],
    # jogging and running: women
    ('accad:Female1_C02_RunToStand', 'jog', 'f', 'ACCAD Female1 "Run to stand" (steady part)'),
    ('accad:Female1_C03_Run', 'jog', 'f', 'ACCAD Female1 "Run"'),
    ('accad:Female1_C05_WalkToRun', 'jog', 'f', 'ACCAD Female1 "Walk to run" (the run)'),
    ('cmu:141_01', 'jog', 'f', 'CMU 141 "Run" (60 fps)'),
    ('cmu:141_02', 'jog', 'f', 'CMU 141 "Run" (60 fps)'),
    ('cmu:141_03', 'jog', 'f', 'CMU 141 "Run" (60 fps)'),
    ('cmu:113_07', 'jog', 'f', 'CMU 113 "Run"'),
    # jogging and running: men
    ('accad:Male1_C03_Run', 'jog', 'm', 'ACCAD Male1 "Run"'),
    ('accad:Male2_C3_Run', 'jog', 'm', 'ACCAD Male2 "Run"'),
    ('accad:Male1_C02_RunToStand', 'jog', 'm', 'ACCAD Male1 "Run to stand" (steady part)'),
    ('accad:Male2_C2_RunToStand', 'jog', 'm', 'ACCAD Male2 "Run to stand" (steady part)'),
    ('cmu:104_01', 'jog', 'm', 'CMU 104 "JogThrough"'),
    ('cmu:104_37', 'jog', 'm', 'CMU 104 "RunThrough"'),
    # jogging and running: sex not recorded
    *[('cmu:' + t, 'jog', 'u', 'CMU ' + t) for t in ('09_01', '09_02', '09_03', '35_17', '35_18', '35_19', '35_20', '16_35', '16_36', '16_45', '16_46', '143_01')],
]

RATE = {'F4', 'W1', 'W2', 'W6', 'F1', 'F2', 'F5', 'W1stance', 'W1swing'}   # measured at the game's rate (30 fps keys, 60 Hz): speeds and soles

# frame rates: CMU's listing, corrected where the subject's own jumps disagree (measures.gravity_fps)
FPS_FIX = {'141': (60, 'listed 120; gravity on 141/106 jumps 04-06 fits 56-60 fps, and its runs at 120 would be 335-354 steps/min'),
           '106': (60, 'files identical to 141'),
           '143': (60, 'listed 120; gravity on 143 jumps 05-06 fits 58-61 fps, and its run at 120 would be 335 steps/min')}


def cmu_fps(tid, listing):
    s = tid.split('_')[0]
    if s in FPS_FIX: return FPS_FIX[s][0], FPS_FIX[s][1]
    return listing.get(tid, 120), 'listed'


def load(src, cmu, accad, old_cmu, listing):
    kind, tid = src.split(':')
    if kind == 'cmu':
        s = tid.split('_')[0]
        base = os.path.join(cmu, s)
        if not os.path.exists(os.path.join(base, tid + '.amc')) and old_cmu: base = os.path.join(old_cmu, s)
        fps, why = cmu_fps(tid, listing)
        return skel.load_amc(os.path.join(base, s + '.asf'), os.path.join(base, tid + '.amc'), fps, {'fps_basis': why})
    m = skel.load_bvh(os.path.join(accad, tid + '.bvh'))
    m.meta['fps_basis'] = 'the file\'s frame time'
    return m


def leg_stature(m):
    b = m.meta['bone_m']
    return round((b['lfemur'] + b['ltibia']) / 0.491, 3)   # Drillis & Contini: hip joint 0.530 H, ankle 0.039 H


def segments(m, state):
    """The frames a state holds: standing, the hips nearly still (smoothed speed < 0.15 m/s) in windows of 8 s; moving, the
    span between the first and last heel strike where the speed is within 25 % of the trial's steady speed."""
    hip = M.flat(m.P['Hips'])
    v = np.linalg.norm(M.moving_avg(np.gradient(hip, axis=0) * m.fps, 0.5 * m.fps), axis=-1)
    if state in ('stand', 'look'):
        still = v < 0.15
        segs, i = [], 0
        while i < m.n:
            if still[i]:
                j = i
                while j < m.n and still[j]: j += 1
                if (j - i) / m.fps >= 2.0:
                    w = int(8 * m.fps)
                    for a in range(i, j, w):
                        b = min(j, a + w)
                        if (b - a) / m.fps >= 2.0: segs.append((a, b))
                i = j
            else: i += 1
        return segs
    g = M.gait_params(m)
    if 't0' not in g: return []
    a, b = int(g['t0'] * m.fps), int(g['t1'] * m.fps)
    steady = np.median(v[a:b])
    ok = np.where(np.abs(v - steady) <= 0.25 * steady)[0]
    ok = ok[(ok >= a) & (ok <= b)]
    if len(ok) < m.fps * 0.5: return []
    return [(int(ok[0]), int(ok[-1]) + 1)]


def game_rate(m):
    """What the game would sample: the converter's 30 fps keys, played and measured at 60 Hz."""
    return m.resample(30.0).resample(60.0) if m.fps > 30.5 else m.resample(60.0)


def run(cmu, accad, out, old_cmu=None, listing_path=None):
    listing = {}
    if listing_path and os.path.exists(listing_path):
        for l in open(listing_path):
            p = l.rstrip('\n').split('\t')
            s, t = p[0].split('_'); listing['%02d_%02d' % (int(s), int(t)) if int(s) < 100 else '%d_%02d' % (int(s), int(t))] = float(p[2])
    rows = []
    for src, state, sex, note in TRIALS:
        try: m = load(src, cmu, accad, old_cmu, listing)
        except FileNotFoundError as e:
            print('  missing', src, e); continue
        segs = segments(m, state)
        if not segs:
            print('  no', state, 'segment in', src); continue
        for k, (a, b) in enumerate(segs):
            seg = m.slice(a / m.fps, b / m.fps)
            if seg.n < 10: continue
            gm = game_rate(seg)
            if state in ('stand', 'look'):
                nat = M.stand_measures(seg); gam = M.stand_measures(gm); lim = M.STAND
                gp = None
            else:
                nat = M.gait_measures(seg); gam = M.gait_measures(gm); lim = M.JOG if state == 'jog' else M.WALK
                gp = M.gait_params(seg)
                if 'speed' not in gp: gp = M.gait_params(m)
            # posture measures do not depend on the rate: the native frames; speeds and soles: the game's rate too
            r_nat = M.judge(nat, lim); r_gam = M.judge(gam, lim)
            # quiet standing: both wrists below the hip joints (+5 cm) in 95 % of the frames (arms hanging, not folded, on the
            # hips, at the face or busy): the rest pose the gate's standing limits are written for
            hipy = 0.5 * (seg.P['LeftUpperLeg'][:, 1] + seg.P['RightUpperLeg'][:, 1]) + 0.05
            down = (seg.P['LeftHand'][:, 1] < hipy) & (seg.P['RightHand'][:, 1] < hipy)
            quiet = bool(np.mean(down) >= 0.95)
            rows.append({'quiet': quiet, 'src': src, 'note': note, 'state': state, 'sex': sex, 'seg': [round(a / m.fps, 2), round(b / m.fps, 2)],
                         'fps': m.fps, 'fps_basis': m.meta.get('fps_basis'), 'stature_est': leg_stature(m), 'native': r_nat, 'game': r_gam,
                         'gait': {k2: (round(v2, 3) if isinstance(v2, float) else v2) for k2, v2 in (gp or {}).items()},
                         'frames': {k2: np.round(np.asarray(v2, float), 2).tolist() for k2, v2 in nat.items()},
                         'frames_game': {k2: np.round(np.asarray(v2, float), 2).tolist() for k2, v2 in gam.items() if k2 in RATE}})
        print(f'  {src:34s} {state:5s} {sex:6s} {len(segs)} segment(s) {m.fps:.0f} fps')
    json.dump(rows, open(out, 'w'))
    return rows


if __name__ == '__main__' and '--summary' not in sys.argv:
    a = sys.argv[1:]
    old = a[a.index('--old-cmu') + 1] if '--old-cmu' in a else None
    lst = a[a.index('--listing') + 1] if '--listing' in a else None
    run(a[0], a[1], a[2], old, lst)


# --- the summary (docs/qa/motion_calibration.md) -------------------------------------------------------------------------------
GROUPS = [('f', ('f',)), ('m', ('m',)), ('u', ('u',)), ('all', ('f', 'm', 'u')), ('f-preg', ('f-preg',))]


def summarize(rows):
    out = {}
    for state in ('quiet', 'stand', 'look', 'walk', 'jog'):
        lim = M.STAND if state in ('quiet', 'stand', 'look') else (M.JOG if state == 'jog' else M.WALK)
        for gname, sexes in GROUPS:
            R = [r for r in rows if (r['state'] == state or (state == 'quiet' and r['state'] == 'stand' and r.get('quiet'))) and r['sex'] in sexes]
            if not R: continue
            for meas in lim:
                per, frames, fails, whys = [], [], 0, []
                for r in R:
                    res = (r['game'] if meas in RATE else r['native']).get(meas)
                    if not res: continue
                    per.append(res)
                    frames.append(np.asarray((r['frames_game'] if meas in RATE else r['frames'])[meas], float))
                    if not res['pass']: fails += 1; whys.append(f"{r['src']}: {res['why']}")
                if not per: continue
                F = np.concatenate(frames)
                key = f'{state}/{gname}/{meas}'
                out[key] = {'segments': len(per), 'subjects': len({r['src'].split(':')[1].split('_')[0] for r in R}), 'fail': fails, 'why': whys,
                            'limit': lim[meas] if isinstance(lim[meas], dict) else list(lim[meas]),
                            'pooled': {'p2': M.pct(F, 0.02), 'p50': M.pct(F, 0.5), 'p98': M.pct(F, 0.98), 'max': float(F.max()), 'min': float(F.min()), 'mean': float(F.mean())},
                            'segment_p98': [min(p['p98'] for p in per), float(np.median([p['p98'] for p in per])), max(p['p98'] for p in per)],
                            'segment_p2': [min(p['p2'] for p in per), float(np.median([p['p2'] for p in per])), max(p['p2'] for p in per)],
                            'segment_mean': [min(p['mean'] for p in per), float(np.median([p['mean'] for p in per])), max(p['mean'] for p in per)]}
    return out


def table(summary, state):
    lines = ['| measure | group | segs | pooled p2 / p50 / p98 / max | per-segment p98 (min / med / max) | limit | segments failing |', '|---|---|---|---|---|---|---|']
    for key, s in summary.items():
        st, g, meas = key.split('/')
        if st != state: continue
        p = s['pooled']; q = s['segment_p98']
        lim = s['limit']
        ltxt = (f"p98 ≤ {lim[1]}" + (f", p2 ≥ {lim[0]}" if lim[0] != -M.INF else '') + f" (cap {'' if lim[2] == -M.INF else str(lim[2]) + '…'}{lim[3]})") if isinstance(lim, list) else \
            (f"mean ≤ {lim['mean']}" + (f", ≤ {lim['frac'] * 100:.0f}% over {lim['over']}" if 'over' in lim else ''))
        lines.append(f"| {meas} | {g} | {s['segments']} | {p['p2']:.1f} / {p['p50']:.1f} / {p['p98']:.1f} / {p['max']:.1f} | {q[0]:.1f} / {q[1]:.1f} / {q[2]:.1f} | {ltxt} | {s['fail']} |")
    return '\n'.join(lines)


if __name__ == '__main__' and '--summary' in sys.argv:
    rows = json.load(open(sys.argv[sys.argv.index('--summary') + 1]))
    S = summarize(rows)
    for st in ('quiet', 'stand', 'look', 'walk', 'jog'):
        print(f'\n### {st}\n'); print(table(S, st))
    if len(sys.argv) > sys.argv.index('--summary') + 2:
        # the committed record (docs/qa/motion_calibration.json): every segment's verdict per measure and its gait, no frames
        segs = [{k: v for k, v in r.items() if k not in ('frames', 'frames_game')} for r in rows]
        for r in segs:
            for side in ('native', 'game'):
                r[side] = {k: {q: (round(x, 2) if isinstance(x, float) else x) for q, x in v.items()} for k, v in r[side].items()}
        def rnd(o):
            if isinstance(o, float): return round(o, 2)
            if isinstance(o, dict): return {k: rnd(v) for k, v in o.items()}
            if isinstance(o, list): return [rnd(v) for v in o]
            return o
        json.dump({'about': 'The motion gate\'s skeleton-readable measures on real people\'s captures, on their own skeletons at their real '
                            'frame rates (docs/qa/motion_calibration.md; tools/qa/calibration/calibrate.py). Posture measures at the '
                            'capture\'s rate (native); speeds and soles at the game\'s (game: 30 fps keys sampled at 60 Hz).',
                   'summary': rnd(S), 'segments': rnd(segs)}, open(sys.argv[sys.argv.index('--summary') + 2], 'w'), indent=0)
