"""The 3D measures of the plausibility gate (docs/PEOPLE_REALISM.md §3.1), taken as ANSUR II took them on real people,
from the heads PeopleGateTests dumps (test-results/heads/<id>.bin: scale, eye centres, the skin from 30 cm under the eyes
up, its triangles; metres at the base's scale). Landmarks by their anthropometric definitions:
- euryon: the head's widest point, above the ears (the cranium 2.5-9 cm over the eyes)
- glabella / opisthocranion: the most forward point of the brow on the midline / the most backward point of the head
- zygion: the cheekbone arch's widest point, in front of the ear (the ear is cut off by its distance from the skull)
- sellion: the deepest point of the nose's root; menton: the chin's lowest point (behind its lower front corner)
- neck circumference: the girth just under the larynx (the body cut 3.5 cm under the menton)
- tragion to top of head: the vault's height over the ear canal; vertex to suprasternale: the head and neck's height over
  the notch above the breastbone (a head too tall, or a neck too short, shows in these two)
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


def cut(P, T, y, axis=1):
    """The points where the mesh crosses the plane at y along the axis (1: a height; 0: across, the midline at 0)."""
    a, b = P[T[:, [0, 1, 2]]], P[T[:, [1, 2, 0]]]
    a, b = a.reshape(-1, 3), b.reshape(-1, 3)
    s = (a[:, axis] - y) * (b[:, axis] - y)
    m = (s < 0)
    f = (y - a[m, axis]) / (b[m, axis] - a[m, axis])
    return a[m] + (b[m] - a[m]) * f[:, None]


def section(P, T, v, axis=0, step=0.001):
    """The mesh's section by the plane at v along the axis, as points every step along its segments (each triangle the
    plane crosses gives one segment; the mesh is coarse, ~4 mm between vertices, so the section is filled in)."""
    A = P[T]                                           # triangles x 3 corners x 3
    s = A[:, :, axis] - v
    out = []
    crosses = []
    for i, j in ((0, 1), (1, 2), (2, 0)):
        m = s[:, i] * s[:, j] < 0
        f = np.where(m, s[:, i] / np.where(m, s[:, i] - s[:, j], 1), 0)
        crosses.append((m, A[:, i] + (A[:, j] - A[:, i]) * f[:, None]))
    for (m1, q1), (m2, q2) in ((crosses[0], crosses[1]), (crosses[1], crosses[2]), (crosses[2], crosses[0])):
        k = m1 & m2
        a, b = q1[k], q2[k]
        n = np.maximum(1, np.ceil(np.linalg.norm(b - a, axis=1) / step)).astype(int)
        for t in range(int(n.max()) + 1 if len(n) else 0):
            f = np.minimum(t / n, 1.0)
            out.append(a + (b - a) * f[:, None])
    return np.concatenate(out) if out else np.zeros((0, 3))


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


def menton(P, T, sell):
    """The chin's lowest point on the midline. The chin's underside runs back and down to the throat, so the lowest point
    in front of the throat is the throat's top, not the chin (R2 found every face measured that way, the face up to 2 cm
    long). On the midline section's front contour: the throat, the deepest point of the neck's front 13-21 cm under the
    nose's root; the chin's underside, the first place under the mouth where the contour falls back by 1.5 cm within 1 cm
    and stays back;
    pogonion, the first bulge upwards from the throat over the underside (the chin, before the fold under the lower lip), no
    higher than 3 cm over it; menton, the lowest point of the chin in front of 70 % of the way from the throat to pogonion
    (its lower front corner, where the bony chin's lowest point lies under the skin). (R3: without the underside, a thick or
    long neck's larynx was taken for the chin, and a retruded chin's contour ran on to the lips.)"""
    S = section(P, T, 0.0007)   # (just off the midline: its vertices lie on it, and a cut through a vertex is lost)
    S = S[(S[:, 1] < sell[1] - 0.04) & (S[:, 1] > sell[1] - 0.24) & (S[:, 2] > sell[2] - 0.12)]
    ys = np.arange(sell[1] - 0.05, sell[1] - 0.24, -0.002)
    front = np.full(len(ys), np.nan)
    for i, a in enumerate(ys):
        k = (S[:, 1] <= a) & (S[:, 1] > a - 0.002)
        if k.any(): front[i] = S[k, 2].max()
    def lowest(ip, it):
        zp, zc = front[ip], front[it]
        box = (S[:, 1] <= ys[ip]) & (S[:, 1] >= ys[it]) & (S[:, 2] > zc + 0.7 * (zp - zc))
        return S[box][int(np.argmin(S[box][:, 1]))]
    # the chin's underside: the first place from 8 cm under the nose's root where the contour falls back 1.5 cm within 1 cm
    # and stays back for the next 2 cm (under a full lower lip it falls back too, but the chin comes forward again)
    drop = None
    start = int(np.searchsorted(-ys, -(sell[1] - 0.08)))
    for i in range(start, len(ys) - 15):
        ahead = front[i + 5:i + 15]
        if not np.isnan(front[i]) and not np.isnan(ahead).all() and front[i] - np.nanmax(ahead) > 0.015: drop = i; break
    neck = (ys < sell[1] - 0.13) & (ys > sell[1] - 0.21) & ~np.isnan(front)
    it = int(np.flatnonzero(neck)[np.argmin(front[neck])])
    # upwards from the throat to the first bulge over the chin's underside (a bulge under it is the larynx), no higher than
    # 3 cm over it (a retruded chin's contour runs on to the lips)
    top = max(0, drop - 15) if drop is not None else 0
    ip, best = it, front[it]
    for i in range(it - 1, top - 1, -1):
        if np.isnan(front[i]): continue
        if front[i] > best: ip, best = i, front[i]
        elif front[i] < best - 0.0015 and (drop is None or i <= drop + 2): break
    return lowest(ip, it)


def suprasternale(P, T, ment):
    """The notch above the breastbone on the midline: on the section's front contour from 2 to 18 cm under the menton,
    the point deepest behind the line from the throat (2.5 cm under the menton) to the chest's front (the most forward
    point 10-18 cm under it)."""
    S = section(P, T, 0.0007)
    S = S[(S[:, 1] < ment[1] - 0.015) & (S[:, 1] > ment[1] - 0.20) & (S[:, 2] > ment[2] - 0.12)]
    ys = np.arange(ment[1] - 0.02, ment[1] - 0.19, -0.002)
    front = np.full(len(ys), np.nan)
    for i, a in enumerate(ys):
        k = (S[:, 1] <= a) & (S[:, 1] > a - 0.002)
        if k.any(): front[i] = S[k, 2].max()
    ok = ~np.isnan(front)
    it = int(np.flatnonzero(ok & (ys <= ment[1] - 0.025))[0])
    low = ok & (ys < ment[1] - 0.10)
    ic = int(np.flatnonzero(low)[np.argmax(front[low])])
    a, b = np.array([front[it], ys[it]]), np.array([front[ic], ys[ic]])
    u = (b - a) / np.linalg.norm(b - a)
    n = np.array([-u[1], u[0]])
    if n[0] > 0: n = -n                                # into the body (backwards)
    best, at = -1, None
    for i in range(it, ic + 1):
        if not ok[i]: continue
        q = np.array([front[i], ys[i]])
        dep = (q - a) @ n
        if dep > best: best, at = dep, q
    return np.array([0.0, at[1], at[0]])


def tragion(P):
    """The ear canal's height (tragion), both ears: the ear is the head's outermost 12 mm 4-12 cm behind the eyes and from
    6 cm under them to 3 cm over; the canal lies 45 % of the way up from the lobe to the ear's top."""
    x, y, z = np.abs(P[:, 0]), P[:, 1], P[:, 2]
    hs = []
    for side in (P[:, 0] > 0, P[:, 0] < 0):
        band = side & (y > -0.06) & (y < 0.03) & (z > -0.12) & (z < -0.04)
        if not band.any(): continue
        ear = band & (x > x[band].max() - 0.012)
        lo, hi = y[ear].min(), y[ear].max()
        hs.append(lo + 0.45 * (hi - lo))
    return float(np.mean(hs))


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
    ment = menton(P, T, sell)
    face_h = sell[1] - ment[1]
    # neck: the girth 3.5 cm under the menton (ANSUR takes it just under the larynx), the cut's hull within 9 cm of the
    # neck's middle. A fixed height on purpose: a woman's neck 7.6 cm wide there, or a man's shoulders rising to the jaw,
    # is what the gate must catch (the least girth lower down hid both)
    yn = ment[1] - 0.035
    Q = cut(P, T, yn)
    nz = np.median(Q[:, 2]) if len(Q) else 0
    Q = Q[(np.abs(Q[:, 0]) < 0.09) & (np.abs(Q[:, 2] - nz) < 0.09)]
    neck = hull_perimeter(Q[:, [0, 2]])
    sst = suprasternale(P, T, ment)
    vertex = P[:, 1].max()
    s = 1000.0 * scale
    out = {'headbreadth': breadth * s, 'headlength': hl * s, 'bizygomaticbreadth': bizyg * s, 'mentonsellionlength': face_h * s,
           'interpupillarybreadth': float(np.linalg.norm(el - er)) * s, 'neckcircumference': neck * s,
           'tragiontopofhead': (vertex - tragion(P)) * s, 'vertexsuprasternale': (vertex - sst[1]) * s}
    if keep: out['_lm'] = {'glab': glab, 'opis': opis, 'sell': sell, 'ment': ment, 'sst': sst, 'yn': yn, 'P': P, 'crown': crown, 'cheek': cheek, 'neck': Q}
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
