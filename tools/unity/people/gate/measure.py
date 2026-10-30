"""The 3D measures of the plausibility gate (docs/PEOPLE_REALISM.md §3.1), taken as ANSUR II took them on real people,
from the heads PeopleGateTests dumps (test-results/heads/<id>.bin: scale, eye centres, the skin from 30 cm under the eyes
up, its triangles; metres at the base's scale). Landmarks by their anthropometric definitions:
- euryon: the head's widest point, above the ears (the cranium 2.5-9 cm over the eyes)
- glabella / opisthocranion: the most forward point of the brow on the midline / the most backward point of the head
- zygion: the cheekbone arch's widest point, in front of the ear (the ear is cut off by its distance from the skull)
- sellion: the deepest point of the nose's root; menton: the chin's lowest point
- neck circumference: the girth just under the larynx (the body cut between the chin and the neck's base)
Usage: python3 measure.py <heads dir> [--plot id,id out.png] -> prints / returns {id: {measure: mm}}"""
import os, struct, sys
import numpy as np


def load(path):
    b = open(path, 'rb').read()
    scale, = struct.unpack_from('<f', b, 0)
    el = np.array(struct.unpack_from('<3f', b, 4)); er = np.array(struct.unpack_from('<3f', b, 16))
    n, = struct.unpack_from('<i', b, 28)
    V = np.frombuffer(b, '<f4', n * 3, 32).reshape(n, 3).astype(float)
    o = 32 + n * 12
    t, = struct.unpack_from('<i', b, o)
    T = np.frombuffer(b, '<i4', t * 3, o + 4).reshape(t, 3)
    return scale, el, er, V, T


def frame(el, er, V):
    """Coordinates with the eyes' middle at the origin: x across, y up, z forward (the face's side)."""
    c = (el + er) / 2
    P = V - c
    head = P[(P[:, 1] > -0.12) & (np.abs(P[:, 0]) < 0.15)]
    if np.mean(head[:, 2]) > 0: P[:, 2] *= -1   # the head's mass lies behind the eyes
    return P


def cut(P, T, y):
    """The points where the mesh crosses the plane at height y."""
    a, b = P[T[:, [0, 1, 2]]], P[T[:, [1, 2, 0]]]
    a, b = a.reshape(-1, 3), b.reshape(-1, 3)
    s = (a[:, 1] - y) * (b[:, 1] - y)
    m = (s < 0)
    f = (y - a[m, 1]) / (b[m, 1] - a[m, 1])
    return a[m] + (b[m] - a[m]) * f[:, None]


def hull_perimeter(Q):
    Q = np.unique(np.round(Q, 6), axis=0)
    if len(Q) < 3: return 0.0
    Q = Q[np.lexsort((Q[:, 1], Q[:, 0]))]
    def cross(o, a, b): return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, hi = [], []
    for p in Q:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    for p in Q[::-1]:
        while len(hi) >= 2 and cross(hi[-2], hi[-1], p) <= 0: hi.pop()
        hi.append(p)
    H = np.array(lo[:-1] + hi[:-1])
    return float(np.linalg.norm(H - np.roll(H, -1, 0), axis=1).sum())


def measure(path, keep=False):
    scale, el, er, V, T = load(path)
    P = frame(el, er, V)
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    mid = np.abs(x) < 0.01
    # glabella: the brow's most forward midline point (0-3 cm over the eyes); opisthocranion: the back of the head
    brow = mid & (y > 0.0) & (y < 0.035)
    glab = P[brow][np.argmax(z[brow])]
    back = mid & (y > -0.02) & (y < 0.09)
    opis = P[back][np.argmin(z[back])]
    # the skull's silhouette by height on the midline plane... the ears stand out of it: a point is skull, not ear, if it
    # is within the cranium's own breadth profile (the breadth at each height taken above the ears' tops)
    crown = (y > 0.025) & (y < 0.09) & (z < glab[2]) & (z > opis[2])
    breadth = x[crown].max() - x[crown].min()
    # zygion: the widest of the cheeks, from 0.5 to 3.5 cm under the eyes, in front of the ear (on the bases the ear's
    # front edge lies 6 cm behind the eyes; seen from above, the cheek's contour ends there and the ear begins)
    hl = glab[2] - opis[2]
    cheek = (y < -0.005) & (y > -0.035) & (z > -0.055)
    bizyg = x[cheek].max() - x[cheek].min()
    # sellion: the nose root's deepest midline point near the eyes; menton: the chin's lowest point in front of the throat
    root = mid & (y > -0.012) & (y < 0.02) & (z > glab[2] - 0.035)
    sell = P[root][np.argmin(z[root])]
    chin = mid & (y < -0.06) & (y > -0.18) & (z > glab[2] - 0.06)
    ment = P[chin][np.argmin(y[chin])]
    face_h = sell[1] - ment[1]
    # neck: the girth 2.5 cm under the menton (ANSUR takes it just under the larynx), the cut's hull within 9 cm of the
    # neck's middle. A fixed height on purpose: a woman's neck 7.6 cm wide there, or a man's shoulders rising to the jaw,
    # is what the gate must catch (the least girth lower down hid both)
    yn = ment[1] - 0.025
    Q = cut(P, T, yn)
    nz = np.median(Q[:, 2]) if len(Q) else 0
    Q = Q[(np.abs(Q[:, 0]) < 0.09) & (np.abs(Q[:, 2] - nz) < 0.09)]
    neck = hull_perimeter(Q[:, [0, 2]])
    stature = None
    s = 1000.0 * scale
    out = {'headbreadth': breadth * s, 'headlength': hl * s, 'bizygomaticbreadth': bizyg * s, 'mentonsellionlength': face_h * s,
           'interpupillarybreadth': float(np.linalg.norm(el - er)) * s, 'neckcircumference': neck * s}
    if keep: out['_lm'] = {'glab': glab, 'opis': opis, 'sell': sell, 'ment': ment, 'yn': yn, 'P': P, 'crown': crown, 'cheek': cheek, 'neck': Q}
    return out


def plot(heads, ids, out):
    from PIL import Image, ImageDraw
    W, H = 360, 420
    img = Image.new('RGB', (W * 2 * len(ids), H), (250, 250, 250))
    d = ImageDraw.Draw(img)
    for k, i in enumerate(ids):
        m = measure(os.path.join(heads, i + '.bin'), keep=True)
        L = m['_lm']; P = L['P']
        def to(px, py, ox): return (ox + W / 2 + px * 1400, H * 0.42 - py * 1400)
        for view in (0, 1):
            ox = (2 * k + view) * W
            a = 0 if view == 0 else 2
            for p, c in ((P, (170, 170, 170)), (P[L['crown']], (60, 120, 220)), (P[L['cheek']], (220, 120, 40))):
                for q in p[::3]: d.point(to(q[a] if view == 0 else q[2], q[1], ox), fill=c)
            for name in ('glab', 'opis', 'sell', 'ment'):
                q = L[name]; xy = to(q[0] if view == 0 else q[2], q[1], ox)
                d.ellipse([xy[0] - 3, xy[1] - 3, xy[0] + 3, xy[1] + 3], fill=(200, 0, 0))
            yy = to(0, L['yn'], ox)[1]; d.line([(ox, yy), (ox + W, yy)], fill=(0, 160, 0))
            d.text((ox + 6, 6), i if view == 0 else f"hb {m['headbreadth']:.0f} zy {m['bizygomaticbreadth']:.0f} fh {m['mentonsellionlength']:.0f} nk {m['neckcircumference']:.0f}", fill=(0, 0, 0))
    img.save(out)


if __name__ == '__main__':
    heads = sys.argv[1]
    if len(sys.argv) > 3 and sys.argv[2] == '--plot':
        plot(heads, sys.argv[3].split(','), sys.argv[4]); sys.exit(0)
    for f in sorted(os.listdir(heads))[:10]:
        print(f, {k: round(v) for k, v in measure(os.path.join(heads, f)).items() if not k.startswith('_')})
