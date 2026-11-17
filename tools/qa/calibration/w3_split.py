"""W3 split on real walkers (docs/MOTION_ROOT_CAUSE.md §7; python3 -I tools/qa/calibration/w3_split.py walk): the upper arm's angle from down (W3) split into its sagittal swing (forward + / back -,
in the plane of the body's front and up) and its abduction (out to the side +, in the plane of the body's side and up),
each from down, on the calibration's walking trials at their native rate. Prints per trial and pooled p2/p50/p98."""
import json, os, sys
import numpy as np
sys.path.insert(0, '/home/user/second-face/tools/qa/calibration')
import calibrate as C
import measures as M

RAW = '/home/user/second-face-staging/motion/raw'
rows = []
for src, state, sex, note in C.TRIALS:
    if state != (sys.argv[1] if len(sys.argv) > 1 else 'walk'): continue
    try: m = C.load(src, RAW + '/cmu', RAW + '/accad', None, {})
    except (FileNotFoundError, OSError): continue
    segs = C.segments(m, state)
    for a, b in segs:
        seg = m.slice(a / m.fps, b / m.fps)
        if seg.n < 10: continue
        fwd = M.body_front(seg, 'walk'); left = M.left_of(fwd)
        out = {}
        for s in ('Left', 'Right'):
            u, e = seg.P[s + 'UpperArm'], seg.P[s + 'LowerArm']
            d = M.unit(e - u)
            down = -d[:, 1]
            side = left if s == 'Left' else -left
            sag = np.degrees(np.arctan2(np.sum(d * fwd, -1), np.maximum(1e-4, down)))
            abd = np.degrees(np.arctan2(np.sum(d * side, -1), np.maximum(1e-4, down)))
            tot = M.ang(e - u, -M.UP)
            out[s] = (tot, sag, abd)
        tot = np.concatenate([out['Left'][0], out['Right'][0]]); sag = np.concatenate([out['Left'][1], out['Right'][1]]); abd = np.concatenate([out['Left'][2], out['Right'][2]])
        g = M.gait_params(seg)
        rows.append({'src': src, 'sex': sex, 'speed': g.get('speed'), 'tot': tot, 'sag': sag, 'abd': abd})
p = lambda x, q: float(np.percentile(x, q))
print(f"{'trial':34s} sex speed |  W3 p98 | sag p2 p98 |sag|p98 | abd p2 p50 p98")
for r in rows:
    print(f"{r['src']:34s} {r['sex']:6s} {r['speed'] or 0:4.2f} | {p(r['tot'],98):6.1f} | {p(r['sag'],2):6.1f} {p(r['sag'],98):5.1f} {p(np.abs(r['sag']),98):6.1f} | {p(r['abd'],2):5.1f} {p(r['abd'],50):5.1f} {p(r['abd'],98):5.1f}")
for grp in ('f', 'm', 'u', 'all'):
    R = [r for r in rows if grp == 'all' and r['sex'] in ('f', 'm', 'u') or r['sex'] == grp]
    if not R: continue
    T = np.concatenate([r['tot'] for r in R]); S = np.concatenate([r['sag'] for r in R]); A = np.concatenate([r['abd'] for r in R])
    seg98 = [p(r['abd'], 98) for r in R]; segs98 = [p(np.abs(r['sag']), 98) for r in R]
    print(f"POOLED {grp:4s} n={len(R):2d}: W3 p98 {p(T,98):.1f}; sagittal p2 {p(S,2):.1f} p98 {p(S,98):.1f} |p98| {p(np.abs(S),98):.1f} (segments' |sag| p98 {min(segs98):.1f}-{max(segs98):.1f}, median {np.median(segs98):.1f}); abduction p2 {p(A,2):.1f} p50 {p(A,50):.1f} p98 {p(A,98):.1f} (segments' p98 {min(seg98):.1f}-{max(seg98):.1f}, median {np.median(seg98):.1f})")
