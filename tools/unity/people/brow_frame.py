"""The brow styles measured in the skin shader's head frame (WardrobeBuild.RestMap: eyes at (+-0.36, 0.1, 0.88) head
radii from the centre; y up, z the face's way): per style, the brow's inner and outer x, and along it the centre height and
the thickness, from the strands as fitted on the MakeHuman base (mhclo references). Also the hairline model's centre."""
import os, sys, re, json, numpy as np
MH, BROWS = sys.argv[1], sys.argv[2]
V, groups, g = [], {}, None
for l in open(os.path.join(MH, '3dobjs', 'base.obj')):
    if l.startswith('v '): V.append([float(x) for x in l.split()[1:4]])
    elif l.startswith('g '): g = l.split(None, 1)[1].strip()
    elif l.startswith('f ') and g in ('joint-l-eye', 'joint-r-eye'):
        groups.setdefault(g, set()).update(int(t.split('/')[0]) - 1 for t in l.split()[1:])
V = np.array(V)
l_eye = V[sorted(groups['joint-l-eye'])].mean(0); r_eye = V[sorted(groups['joint-r-eye'])].mean(0)
mid = (l_eye + r_eye) / 2; rad = np.linalg.norm(l_eye - r_eye) / (2 * 0.36)
centre = mid - np.array([0, 0.1 * rad, 0.88 * rad])
def frame(P): return (P - centre) / rad   # MakeHuman: x side, y up, z forward, as the frame
def read_mhclo(path):
    refs, sec = [], None
    for line in open(path):
        p = line.split()
        if not p or p[0].startswith('#'): continue
        if p[0] == 'verts': sec = 'v'; continue
        if p[0] == 'delete_verts': sec = 'd'; continue
        if sec == 'v' and re.match(r'^-?\d', p[0]):
            if len(p) == 1: refs.append((int(p[0]), 0, 0, 1, 0, 0, 0, 0, 0))
            else: refs.append(tuple([int(p[0]), int(p[1]), int(p[2])] + [float(x) for x in p[3:9]]))
    return refs
out = {'rad_dm': rad, 'eye_frame': frame(l_eye).tolist()}
for n in sys.argv[3:]:
    refs = read_mhclo(os.path.join(BROWS, n, n + '.mhclo'))
    P = np.array([w0 * V[a] + w1 * V[b] + w2 * V[c] + np.array([ox, oy, oz]) for a, b, c, w0, w1, w2, ox, oy, oz in refs])
    F = frame(P)
    side = F[:, 0] > 0   # one brow (mirror)
    Q = F[side]
    x0, x1 = np.percentile(Q[:, 0], 2), np.percentile(Q[:, 0], 98)
    rows = []
    for t in np.linspace(0, 1, 9):
        x = x0 + (x1 - x0) * t
        m = np.abs(Q[:, 0] - x) < (x1 - x0) / 16
        if m.sum() < 3: rows.append(None); continue
        lo, hi = np.percentile(Q[m, 1], 5), np.percentile(Q[m, 1], 95)
        rows.append((round(float((lo + hi) / 2), 3), round(float(hi - lo), 3)))
    out[n] = {'x0': round(float(x0), 3), 'x1': round(float(x1), 3), 'z': round(float(np.median(Q[:, 2])), 3), 'rows': rows, 'n': int(len(Q))}
    print(n, out[n])
print('eye (frame)', out['eye_frame'], 'rad dm', rad)
