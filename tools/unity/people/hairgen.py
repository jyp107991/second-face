"""Hair of our own (BUILD_PLAN §6.C, P4 step 7): card hair generated on the MakeHuman base head for the hair rule's
forms (gritty and functional: rough buns, work braids, cropped uneven, long hair matted under a wrap), written as
ordinary MakeHuman proxies (<name>.mhclo / .obj / .mhmat / .png) so mh_build fits, skins, refits, thins and dyes them
like any other hair. Pure numpy; deterministic (seeded). MakeHuman units: decimetres, y up, z forward.

Each card is a ribbon along a path; a vertex is tied to its nearest base vertex with an offset (the proxy's reference),
so the hair follows the head's shape and the bones under it. The strand atlas has four columns: dense strands, clumped
strands with gaps, wisps, matted locks; bake_hair recolours it by luminance (colour, dust, grey)."""
import json, os
import numpy as np

STYLES = ('sf_crop', 'sf_bun', 'sf_braid', 'sf_matted', 'sf_coils', 'sf_cornrows')
VERSION = 17   # bump when the generator changes: mh_build regenerates into its cache by name + version
ATLAS = 1024
COLS = {'sheet': 0, 'clump': 1, 'wisp': 2, 'matted': 3}


# ------------------------------------------------------------------------------------------------------------------
# the head model shared with mh_build's painted scalp
# ------------------------------------------------------------------------------------------------------------------
def smoothstep(x):
    x = np.clip(x, 0, 1); return x * x * (3 - 2 * x)

def head_angles(P, top, eye):
    """Elevation and azimuth (degrees; 0 = straight ahead) of points P (MakeHuman units, y up, z forward) seen from a
    point inside the skull behind and above the eyes, plus their offsets from it. `top` is the crown's height."""
    c = np.array([0.0, eye[1] + 0.15 * (top - eye[1]), eye[2] - 0.75])
    d = P - c
    return np.degrees(np.arctan2(d[:, 1], np.hypot(d[:, 0], d[:, 2]))), np.abs(np.degrees(np.arctan2(d[:, 0], d[:, 2]))), d

def hair_weight(P, top, eye, mode, recede=0.0):
    """Stubble weight per head vertex from a hairline model around the skull: elevation above a threshold that falls
    from the forehead to the temples, the ear tops and the nape; 'bald' keeps the horseshoe on the sides and back
    only. Ears (outside the skull's silhouette) and the face get none. Tuned on the base mesh with a shaded preview
    from four sides (BUILD_PLAN §6.C.2)."""
    e, a, d = head_angles(P, top, eye)
    t = np.interp(a, [0, 40, 75, 100, 140, 180], [30 + recede, 24 + recede, 4, -10, -38, -58])
    w = smoothstep((e - (t - 2)) / 8.0)
    if mode == 'bald':
        w *= smoothstep((np.interp(a, [0, 60, 90, 130, 180], [-90, -90, 18, 26, 30]) - e) / 8.0)
    band = (a > 55) & (a < 125) & (e > -35) & (e < 25)
    rr = np.linalg.norm(d, axis=1)
    if band.any(): w[band & (rr > np.median(rr[band]) * 1.06)] = 0.0
    w[P[:, 2] > eye[2] + 0.1] = 0.0
    return w


# ------------------------------------------------------------------------------------------------------------------
# the base mesh
# ------------------------------------------------------------------------------------------------------------------
class Base:
    def __init__(self, mh):
        V, groups, F, g = [], {}, [], None
        for line in open(os.path.join(mh, '3dobjs', 'base.obj')):
            if line.startswith('v '): V.append(tuple(map(float, line.split()[1:4])))
            elif line.startswith('g '): g = line.split(None, 1)[1].strip()
            elif line.startswith('f '):
                ix = [int(t.split('/')[0]) - 1 for t in line.split()[1:]]
                groups.setdefault(g, set()).update(ix)
                if g == 'body': F.append(ix)
        self.V = np.array(V)
        body = sorted({i for f in F for i in f})
        self.body = np.array(body)
        # vertex normals from the body's faces
        N = np.zeros_like(self.V)
        for f in F:
            p = self.V[f]
            n = np.cross(p[1] - p[0], p[2] - p[0])
            N[f] += n
        self.N = N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-9)
        self.F = F
        w = json.load(open(os.path.join(mh, 'rigs', 'default_weights.mhw')))['weights']
        # the head's skin only: the rig's head weights also cover the base's helper geometry (joint cubes, the hair and
        # clothing helpers), which pulled the scalp's shell in and out where a helper vertex was nearest (v7)
        self.head = np.array(sorted({i for i, x in w['head'] if x > 0.5} & set(body)))
        self.eye = np.mean([self.V[sorted(groups[k])].mean(0) for k in ('joint-l-eye', 'joint-r-eye')], axis=0)
        self.top = self.V[self.head, 1].max()
        self.c = np.array([0.0, self.eye[1] + 0.15 * (self.top - self.eye[1]), self.eye[2] - 0.75])
        P = self.V[self.head]
        hw = hair_weight(P, self.top, self.eye, 'buzz')
        self.hw = dict(zip(self.head.tolist(), hw.tolist()))
        self.scalp = self.head[hw > 0.5]
        # drawn-back hair grows from the hairline: the locks over the layer root mostly just inside it (the layer's own
        # soft edge is the hairline; a lock rooted on the edge showed its square start there), a few further in
        edge = 1.0 - hw[hw > 0.5]
        self.root_p = np.where(hw[hw > 0.5] > 0.62, (edge / max(edge.max(), 1e-6)) ** 1.5 + 0.12, 0.0)
        self.root_p /= self.root_p.sum()
        # the skull the hair lies on: the head's skin without the ears (outside the skull's silhouette), so hair passing
        # an ear goes behind it instead of jumping out over it
        e, a, d = head_angles(P, self.top, self.eye)
        rr = np.linalg.norm(d, axis=1)
        band = (a > 55) & (a < 125) & (e > -35) & (e < 25)
        ear = band & (rr > np.median(rr[band]) * 1.06)
        self.hdir = d[~ear] / rr[~ear, None]
        self.hrad = rr[~ear]
        # the scalp once subdivided, for the shell: the base's scalp quads are 1.4 cm, too coarse for a hairline to
        # follow its contour or fade over (v10)
        self.fine_scalp()
        # the reference pool: everything from the shoulders up (a braid reaches the upper back)
        self.pool = self.body[self.V[self.body, 1] > 3.6]
        # the back's profile at the middle for hanging hair: the rearmost z of the body by height, |x| < 0.35
        mid = self.body[np.abs(self.V[self.body, 0]) < 0.35]
        self.back_y = np.linspace(3.6, 7.0, 69)
        self.back_z = np.array([self.V[mid[(np.abs(self.V[mid, 1] - y) < 0.06)], 2].min()
                                if np.any(np.abs(self.V[mid, 1] - y) < 0.06) else 0.0 for y in self.back_y])

    def fine_scalp(self):
        """FV, FN, Fhw, FF: the head skin's faces where any corner carries hair weight, split each in four (edge
        midpoints and a centre; positions, normals and hair weights averaged: the weight measured again at the new
        points took its ear rule's median from a different crowd and cut bays into the layer above the ears, v14)."""
        faces = [f for f in self.F if all(i in self.hw for i in f) and max(self.hw[i] for i in f) > 0.05]
        pts, nrm, hws, at = [], [], [], {}
        def point(key, members):
            if key not in at:
                at[key] = len(pts)
                pts.append(self.V[list(members)].mean(0))
                n = self.N[list(members)].sum(0); nrm.append(n / max(np.linalg.norm(n), 1e-9))
                hws.append(float(np.mean([self.hw[i] for i in members])))
            return at[key]
        FF = []
        for f in faces:
            k = len(f)
            c = [point(('v', i), (i,)) for i in f]
            mids = [point(('e', min(f[j], f[(j + 1) % k]), max(f[j], f[(j + 1) % k])), (f[j], f[(j + 1) % k])) for j in range(k)]
            o = point(('f',) + tuple(sorted(f)), tuple(f))
            for j in range(k): FF.append((c[j], mids[j], o, mids[j - 1]))
        self.FV = np.array(pts); self.FN = np.array(nrm); self.FF = FF; self.Fhw = np.array(hws)

    def surf(self, p, lift):
        """A point on the scalp's shell in the direction of p from the head's centre, `lift` above the skin: the skull's
        radius there blended from the nearest directions (one vertex's radius stepped from vertex to vertex, which a
        card along the scalp showed as a saw edge)."""
        u = p - self.c
        u = u / max(np.linalg.norm(u), 1e-9)
        dots = self.hdir @ u
        near = np.argpartition(-dots, 8)[:8]
        wts = np.exp((dots[near] - dots[near].max()) / 0.0015)
        return self.c + u * (float(wts @ self.hrad[near]) / wts.sum() + lift)

    def back(self, y):
        return float(np.interp(y, self.back_y, self.back_z))


# ------------------------------------------------------------------------------------------------------------------
# cards
# ------------------------------------------------------------------------------------------------------------------
class Mesh:
    def __init__(self):
        self.v, self.vt, self.f = [], [], []

    def ribbon(self, pts, out, width, col, rng, twist=0.0, u_jitter=True):
        """A card along `pts` (k x 3), its face turned to `out` (k x 3, away from the head), `width` per point (k),
        textured from atlas column `col` (u across a random strip of it, v root to tip)."""
        pts = np.asarray(pts); out = np.asarray(out); k = len(pts)
        if k < 2: return
        t = np.gradient(pts, axis=0)
        t /= np.maximum(np.linalg.norm(t, axis=1, keepdims=True), 1e-9)
        side = np.cross(t, out)
        side /= np.maximum(np.linalg.norm(side, axis=1, keepdims=True), 1e-9)
        if twist:
            ang = np.linspace(0, twist, k)
            o2 = np.cross(side, t)
            side = side * np.cos(ang)[:, None] + o2 * np.sin(ang)[:, None]
        cw = 0.25
        u0 = COLS[col] * cw + (rng.uniform(0, cw * 0.5) if u_jitter else 0.0)
        u1 = u0 + cw * 0.5
        base = len(self.v)
        for j in range(k):
            h = side[j] * width[j] * 0.5
            self.v += [tuple(pts[j] - h), tuple(pts[j] + h)]
            v = j / (k - 1)
            self.vt += [(u0, 1 - v), (u1, 1 - v)]
        for j in range(k - 1):
            a = base + 2 * j
            self.f.append((a, a + 1, a + 3, a + 2))


def taper(k, w0, w1):
    return np.linspace(w0, w1, k)

def spindle(k, w, root=0.25, tip=0.1, at=0.3):
    """Widths along a card narrow at the root, full at `at` of its length, narrow at the tip (fractions of w): no
    square ends to read as cut-out strips."""
    x = np.linspace(0, 1, k)
    return w * np.interp(x, [0.0, at, 1.0], [root, 1.0, tip])

def scalp_path(B, root, goal, lift, step, rng, max_steps=40, wander=0.06):
    """From a root over the scalp toward a goal point, staying `lift` above the skin."""
    p = B.surf(B.V[root] + rng.normal(0, 0.05, 3), lift)
    pts = [p]
    for _ in range(max_steps):
        d = goal - p
        dist = np.linalg.norm(d)
        if dist < step * 1.2: break
        d = d / dist + rng.normal(0, wander, 3)
        p = B.surf(p + d * step, lift)
        pts.append(p)
    return np.array(pts)

def outward(B, pts):
    o = pts - B.c
    return o / np.maximum(np.linalg.norm(o, axis=1, keepdims=True), 1e-9)


def knot(m, centre, axis, locks, ring, tube, col, rng):
    """Locks wound round a lumpy ring standing out along `axis` at `centre` (a bun, a gathered nape). Returns the
    ring's two in-plane axes."""
    e1 = np.cross(axis, [0.0, 1.0, 0.0]); e1 /= np.linalg.norm(e1)
    e2 = np.cross(axis, e1)
    for lock in range(locks):
        a0 = rng.uniform(0, 2 * np.pi)
        turns = rng.uniform(0.6, 1.2)
        R1 = rng.uniform(*ring); r1 = rng.uniform(*tube)
        k = 26
        ts = np.linspace(0, 1, k)
        th = a0 + ts * 2 * np.pi * turns
        ph = rng.uniform(0, 2 * np.pi) + ts * 2 * np.pi * rng.uniform(0.8, 1.6)
        lump = 1 + 0.18 * np.sin(3 * th + lock)
        rim = (np.cos(th)[:, None] * e1 + np.sin(th)[:, None] * e2)
        pts = centre + rim * (R1 * lump)[:, None] + (np.cos(ph)[:, None] * rim + np.sin(ph)[:, None] * axis) * r1
        out = pts - centre
        out /= np.maximum(np.linalg.norm(out, axis=1, keepdims=True), 1e-9)
        m.ribbon(pts, out, taper(k, R1 * 0.6, R1 * 0.3), col, rng, twist=rng.normal(0, 0.6))
    return e1, e2


def border_distance(V, faces):
    """Per vertex of a patch of faces over the points V: the distance along its surface to the patch's edge."""
    import heapq
    count, adj = {}, {}
    for f in faces:
        for j in range(len(f)):
            a, b = f[j], f[(j + 1) % len(f)]
            count[(min(a, b), max(a, b))] = count.get((min(a, b), max(a, b)), 0) + 1
            adj.setdefault(a, set()).add(b); adj.setdefault(b, set()).add(a)
    dist = {i: 0.0 for e, n in count.items() if n == 1 for i in e}
    heap = [(0.0, i) for i in dist]
    heapq.heapify(heap)
    while heap:
        d, i = heapq.heappop(heap)
        if d > dist[i]: continue
        for j in adj[i]:
            nd = d + float(np.linalg.norm(V[i] - V[j]))
            if nd < dist.get(j, np.inf): dist[j] = nd; heapq.heappush(heap, (nd, j))
    return dist


def shell(B, m, goal, lift, rng, reach=0.25, segments=10, fade=0.12, col='sheet'):
    """Hair lying on the scalp as one continuous layer `lift` above the skin (no shingles of separate cards): the
    scalp's own faces (subdivided once, `Base.fine_scalp`) lifted, the strands of the atlas's sheet column running from the hairline toward `goal` (v along
    the flow, u round the flow's axis in mirrored segments so the strands stay fine), the hairline soft: over `fade` (dm)
    in from the layer's edge, measured along the scalp, the sheet's strands start one by one (a fade by the hair weight
    alone was ~5 mm wide and cut a hard contour, v9). `reach`: how far down the hair weight the layer goes (lower:
    further over the temples and the nape)."""
    V, N = B.FV, B.FN
    faces = [f for f in B.FF if all(B.Fhw[i] > reach for i in f)]
    a = (goal - B.c) / np.linalg.norm(goal - B.c)
    e1 = np.cross(a, [0.0, 1.0, 0.0]); e1 /= np.linalg.norm(e1)
    e2 = np.cross(a, e1)
    verts = sorted({i for f in faces for i in f})
    dirs = {i: (V[i] - B.c) / np.linalg.norm(V[i] - B.c) for i in verts}
    ang = {i: float(np.arccos(np.clip(dirs[i] @ a, -1, 1))) for i in verts}
    amax = max(ang.values())
    border = border_distance(V, faces)
    pos, uv = {}, {}
    for i in verts:
        edge = smoothstep(border.get(i, 0.0) / fade)                    # 0 at the layer's edge: the hairline
        flow = 1.0 - ang[i] / amax                                      # 0 far from the goal, 1 at it
        v = edge * (0.34 + 0.64 * flow)                                 # the sheet's strand starts lie in v < 0.36
        phi = np.arctan2(dirs[i] @ e2, dirs[i] @ e1)
        sseg = (phi + np.pi) / (2 * np.pi) * segments
        tri = 1 - abs(2 * (sseg - np.floor(sseg)) - 1)
        # a little uneven (hair, not a helmet), down onto the skin at the hairline (no step there, nor its shadow)
        pos[i] = V[i] + N[i] * ((lift + rng.uniform(0, 0.012)) * (0.25 + 0.75 * edge))
        uv[i] = (COLS[col] * 0.25 + tri * 0.24 + 0.005, v)
    index = {}
    for i in verts:
        index[i] = len(m.v); m.v.append(tuple(pos[i])); m.vt.append(uv[i])
    for f in faces: m.f.append(tuple(index[i] for i in f))


def gen_crop(B, rng):
    """Cropped uneven: a short layer combed back and down over the scalp, and short cards for the uneven ends, none
    over the forehead (no fringe)."""
    m = Mesh()
    # a crisp hairline (short hair), and no more cards than the hair's budget keeps whole (mh_build thinned 1300 to 60 %
    # at random, and the layer's hairline showed through the gaps as bald patches)
    shell(B, m, B.surf(B.c + np.array([0.0, -0.6, -0.8]), 0.0), 0.012, rng, reach=0.35, fade=0.06)
    for r in rng.choice(B.scalp, size=700, replace=True):
        p0 = B.surf(B.V[r] + rng.normal(0, 0.05, 3), 0.0)   # roots scattered between the scalp's vertices
        # combed: from the front to the crown backwards, on the sides and back downwards; a cut's uneven lengths
        comb = np.array([0.0, -0.35, -1.0]) if p0[2] > B.c[2] else np.array([np.sign(p0[0]) * 0.25, -1.0, -0.3])
        comb = comb / np.linalg.norm(comb) + rng.normal(0, 0.18, 3)
        length = rng.uniform(0.1, 0.3) * (0.6 if p0[2] > B.eye[2] - 0.35 else 1.0)   # shorter at the front
        k = 4
        lift = rng.uniform(0.008, 0.02)
        pts = [B.surf(p0, lift)]
        for j in range(1, k):
            pts.append(B.surf(pts[-1] + comb / np.linalg.norm(comb) * length / (k - 1), lift + 0.004 * j))
        pts = np.array(pts)
        m.ribbon(pts, outward(B, pts), spindle(k, rng.uniform(0.08, 0.14), 0.4, 0.15, 0.35), 'clump', rng, twist=rng.normal(0, 0.2))
    return m


def gen_bun(B, rng):
    """A rough bun: the hair drawn back over the scalp to a knot high at the back, the knot wound from uneven locks,
    strays escaping the knot and the hairline."""
    m = Mesh()
    G = B.surf(B.c + np.array([0.0, 0.42, -0.9]), 0.05)
    axis = (G - B.c) / np.linalg.norm(G - B.c)
    shell(B, m, G, 0.018, rng)
    # locks over the layer: the drawn-back hair's texture (fewer and thinner than a card head of hair)
    for r in rng.choice(B.scalp, size=70, replace=True, p=B.root_p):
        pts = scalp_path(B, r, G, rng.uniform(0.022, 0.032), 0.16, rng, wander=0.03)
        if len(pts) < 3: continue
        m.ribbon(pts, outward(B, pts), spindle(len(pts), rng.uniform(0.05, 0.08)), 'clump', rng, twist=rng.normal(0, 0.1))
    # the knot: locks wound round a lumpy ring standing out from the head
    centre = G + axis * 0.14
    e1, e2 = knot(m, centre, axis, 46, (0.2, 0.3), (0.08, 0.15), 'clump', rng)
    # strays: out of the knot and at the hairline (rough, not tidy)
    for s in range(12):
        th = rng.uniform(0, 2 * np.pi)
        p0 = centre + (np.cos(th) * e1 + np.sin(th) * e2) * 0.28
        d = (np.cos(th) * e1 + np.sin(th) * e2) * 0.7 + axis * 0.3 + rng.normal(0, 0.3, 3) + np.array([0, -0.6, 0])
        d /= np.linalg.norm(d)
        L = rng.uniform(0.15, 0.4)
        pts = np.array([p0 + d * L * j / 4 + np.array([0, -0.15, 0]) * (j / 4) ** 2 * L for j in range(5)])
        m.ribbon(pts, np.repeat(axis[None], 5, 0), taper(5, 0.05, 0.02), 'wisp', rng)
    return m


def gen_braid(B, rng):
    """A work braid: the hair drawn back over the scalp to the nape and plaited down the back in three strands, the
    tail left loose under a tie."""
    m = Mesh()
    Nk = B.surf(B.c + np.array([0.0, -0.5, -0.9]), 0.06)
    shell(B, m, Nk, 0.018, rng)
    # locks over the layer: the drawn-back hair's texture (fewer and thinner than a card head of hair)
    for r in rng.choice(B.scalp, size=70, replace=True, p=B.root_p):
        pts = scalp_path(B, r, Nk, rng.uniform(0.022, 0.032), 0.16, rng, wander=0.03)
        if len(pts) < 3: continue
        m.ribbon(pts, outward(B, pts), spindle(len(pts), rng.uniform(0.05, 0.08)), 'clump', rng, twist=rng.normal(0, 0.1))
    # a small knot at the nape where the drawn-back hair is gathered (it hides the cards' ends)
    axis = (Nk - B.c) / np.linalg.norm(Nk - B.c)
    knot(m, Nk + axis * 0.05, axis, 18, (0.09, 0.13), (0.05, 0.08), 'clump', rng)
    # the plait: three strands round a centre line down the back, 0.1 dm off the skin
    length, k = 2.7, 34
    ys = Nk[1] - np.linspace(0, length, k)
    cz = np.array([max(B.back(y) - 0.13, -9) for y in ys])
    cz[0] = min(cz[0], Nk[2])
    centre = np.stack([np.zeros(k), ys, cz], axis=1)
    centre[:, 2] = np.minimum(centre[:, 2], Nk[2] - 0.02 * np.arange(k) / k)
    lat = np.array([1.0, 0, 0]); dep = np.array([0, 0, -1.0])
    wave = 2 * np.pi * np.linspace(0, length / 0.32, k)
    thin = np.linspace(1.0, 0.55, k)
    for s in range(3):
        ph = wave + s * 2 * np.pi / 3
        pts = centre + (np.sin(ph) * 0.12 * thin)[:, None] * lat + (np.cos(ph) * 0.06 * thin)[:, None] * dep
        for crossed in (0, 1):   # two crossed cards per strand: a round strand from every side
            out = np.repeat((dep if crossed == 0 else lat)[None], k, 0)
            m.ribbon(pts, out, 0.24 * thin, 'clump', rng, twist=0.0)
    # the tail below the tie, splayed
    tip = centre[-1]
    for t in range(12):
        d = np.array([rng.normal(0, 0.25), -1.0, rng.normal(0, 0.15)]); d /= np.linalg.norm(d)
        L = rng.uniform(0.2, 0.38)
        pts = np.array([tip + d * L * j / 4 for j in range(5)])
        m.ribbon(pts, np.repeat(dep[None], 5, 0), taper(5, 0.09, 0.03), 'clump', rng)
    return m


def gen_matted(B, rng):
    """Long hair matted: pushed back loose from the hairline over the scalp, heavy matted locks from the crown and from
    the back and sides of the head hanging over the shoulders and down the back, uneven. Under a wrap or a hood only
    the locks below it show (v16: the locks alone, made for under a wrap, left a bare crown when worn without one)."""
    m = Mesh()
    Nk = B.surf(B.c + np.array([0.0, -0.45, -0.9]), 0.05)
    shell(B, m, Nk, 0.022, rng)

    def hang(p, L, k, lift0=0.05):
        """From p down: off the head while near it, behind the back below."""
        pts = [p]; step = L / (k - 1)
        for j in range(1, k):
            q = pts[-1] + np.array([rng.normal(0, 0.03), -step, 0])
            if q[1] > B.c[1] - 0.6: q = B.surf(q, lift0 + 0.01 * j)
            else: q[2] = min(q[2], B.back(q[1]) - 0.06) if abs(q[0]) < 0.5 else q[2]
            pts.append(q)
        return np.array(pts)

    def lay(pts, w0, w1, twist):
        # on the head a lock lies on it (facing out of it); hanging, it faces away level (a lock on the crown faced
        # level stood up off the scalp like a fin)
        o = outward(B, pts)
        f = o.copy(); f[:, 1] = 0
        f /= np.maximum(np.linalg.norm(f, axis=1, keepdims=True), 1e-9)
        t = smoothstep((B.c[1] - pts[:, 1]) / 0.6)[:, None]
        out = o * (1 - t) + f * t
        out /= np.maximum(np.linalg.norm(out, axis=1, keepdims=True), 1e-9)
        m.ribbon(pts, out, taper(len(pts), w0, w1), 'matted', rng, twist=twist)

    # from the crown and the top: pushed back over the scalp to behind the head, then hanging
    for r in rng.choice(B.scalp, size=34, replace=False, p=B.root_p):
        path = scalp_path(B, r, Nk, rng.uniform(0.03, 0.045), 0.18, rng, wander=0.05)
        if len(path) < 2: continue
        tail = hang(path[-1], rng.uniform(1.2, 2.4), 8, lift0=0.06)
        lay(np.concatenate([path, tail[1:]]), rng.uniform(0.18, 0.26), 0.07, rng.normal(0, 0.3))
    # from the back and the sides, low
    P = B.V[B.scalp]
    e, a, _ = head_angles(P, B.top, B.eye)
    band = B.scalp[(a > 70) & (e < 5)]
    for r in rng.choice(band, size=min(64, len(band)), replace=False):
        lay(hang(B.surf(B.V[r], 0.04), rng.uniform(1.6, 3.0), 11), rng.uniform(0.2, 0.32), 0.08, rng.normal(0, 0.8))
    return m


def gen_coils(B, rng):
    """Coily hair cropped close (P4.15, the hair's form by people: tightly curled hair grows out, not down): a layer of
    the matted strands a centimetre off the scalp, its hairline soft and rounded, and small tight coils standing out of
    it all over, so the silhouette is a short fuzzed cap and not a combed shell (no fringe, no shaping)."""
    m = Mesh()
    goal = B.surf(B.c + np.array([0.0, 1.0, -0.15]), 0.0)   # the crown: coily hair stands out from the scalp, it does not flow
    shell(B, m, goal, 0.1, rng, reach=0.32, fade=0.05, col='matted')
    for r in rng.choice(B.scalp, size=900, replace=True):
        p0 = B.surf(B.V[r] + rng.normal(0, 0.04, 3), 0.05)
        n = (p0 - B.c) / np.linalg.norm(p0 - B.c)
        e1 = np.cross(n, rng.normal(0, 1, 3)); e1 /= max(np.linalg.norm(e1), 1e-9)
        e2 = np.cross(n, e1)
        k, L = 4, rng.uniform(0.06, 0.11)
        ts = np.linspace(0, 1, k)
        ph = rng.uniform(0, 2 * np.pi) + ts * 3 * np.pi
        pts = p0 + n[None] * (ts * L)[:, None] + (np.cos(ph)[:, None] * e1 + np.sin(ph)[:, None] * e2) * 0.012
        m.ribbon(pts, np.repeat(e1[None], k, 0), spindle(k, rng.uniform(0.04, 0.06), 0.6, 0.35, 0.4), 'matted', rng, twist=rng.normal(0, 0.8))
    return m


def gen_cornrows(B, rng):
    """Cornrows (P4.15: the work braid of coily hair, kept for weeks): the hair braided flat to the scalp in rows from the
    hairline over the top to the nape, the scalp showing between them, short tails below the nape."""
    m = Mesh()
    rows = 13
    for x0 in np.linspace(-1.55, 1.55, rows) + rng.normal(0, 0.03, rows):
        # the row's centre line: from above the forehead over the top and down the back, a little towards the middle
        centre = []
        for t in np.linspace(0.0, 1.0, 30):
            pitch = np.radians(22 + 200 * t)
            d = np.array([x0 * (1.0 - 0.35 * t), np.sin(pitch), np.cos(pitch)])
            q = B.surf(B.c + d, 0.035)
            w = hair_weight(q[None], B.top, B.eye, 'buzz')[0]
            if w < 0.3 and len(centre) < 2: continue    # start at the hairline
            if w < 0.2 and len(centre) >= 2: break        # end at the nape's
            centre.append(q)
        if len(centre) < 4: continue
        centre = np.array(centre); k = len(centre)
        t_ = np.gradient(centre, axis=0); t_ /= np.maximum(np.linalg.norm(t_, axis=1, keepdims=True), 1e-9)
        out = outward(B, centre)
        side = np.cross(t_, out); side /= np.maximum(np.linalg.norm(side, axis=1, keepdims=True), 1e-9)
        arc = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(centre, axis=0), axis=1))])
        wave = 2 * np.pi * arc / 0.16
        for strand in range(3):
            ph = wave + strand * 2 * np.pi / 3
            pts = centre + side * (np.sin(ph) * 0.035)[:, None] + out * ((np.cos(ph) + 1) * 0.012)[:, None]
            m.ribbon(pts, out, np.full(k, 0.09), 'clump', rng, twist=0.0)
        # the tail below the last stitch
        tip = centre[-1]; down = np.array([0.0, -1.0, -0.15]); down /= np.linalg.norm(down)
        tail = np.array([tip + down * 0.35 * j / 4 + out[-1] * 0.02 * j for j in range(5)])
        m.ribbon(tail, np.repeat(out[-1][None], 5, 0), taper(5, 0.09, 0.04), 'clump', rng)
    return m


GENERATORS = {'sf_crop': gen_crop, 'sf_bun': gen_bun, 'sf_braid': gen_braid, 'sf_matted': gen_matted, 'sf_coils': gen_coils,
              'sf_cornrows': gen_cornrows}


# ------------------------------------------------------------------------------------------------------------------
# the atlas and the proxy files
# ------------------------------------------------------------------------------------------------------------------
def atlas(rng, size=ATLAS):
    """RGBA strands: four columns (dense, clump, wisp, matted), v from root (bottom) to tip (top). Grey luminance
    with darker roots; alpha thins toward the tips (wisps most)."""
    img = np.zeros((size, size, 4), np.float32)
    cw = size // 4
    yy = np.linspace(0, 1, size)[:, None]   # 0 root .. 1 tip (rows bottom-up in the file's flipped order below)
    for c, (n, wmin, wmax, tipfade, gaps, under) in enumerate([(520, 2, 4, 0.0, 0.0, -1.0), (300, 2, 5, 0.3, 0.2, 0.7),
                                                                 (60, 1, 2, 0.7, 0.6, 0.0), (180, 2, 6, 0.2, 0.1, 0.6)]):
        col = np.zeros((size, cw, 4), np.float32)
        if under < 0:
            # the sheet: opaque strands all over; at the root (the shell's hairline) each strand starts at its own
            # height, so the hairline breaks into hairs instead of a cut contour following the mesh (v8)
            # (in clumps a few millimetres wide at the hairline's scale, with single strands among them: strand-wide
            # starts alone averaged out to a smooth cut)
            xs = np.arange(cw)
            start = np.zeros(cw)
            for _ in range(14):
                x0 = rng.uniform(0, cw); w = rng.uniform(12, 40)
                start = np.maximum(start, smoothstep(1 - np.abs(xs - x0) / w) * rng.uniform(0.1, 0.3))
            for _ in range(60):
                x0 = rng.uniform(0, cw); w = rng.uniform(1.5, 4)
                start = np.maximum(start, np.clip(1 - np.abs(xs - x0) / w, 0, 1) * rng.uniform(0.0, 0.3))
            col[..., 3] = smoothstep((yy - start[None, :]) / 0.06)
            col[..., :3] = 0.42
        elif under:
            # a sheet under the strands down the middle of the card: it reads as a lock of hair, ragged only at its
            # sides and its tip, not as loose strands with the scalp between them
            x = np.linspace(-1, 1, cw)[None, :]
            sheet = under * (1 - smoothstep((np.abs(x) - 0.45) / 0.4)) * (1 - smoothstep((yy - 0.75) / 0.2)) * smoothstep(yy / 0.18 + 0.15)
            col[..., 3] = sheet
            col[..., :3] = (sheet * 0.42)[..., None]
        for _ in range(n):
            x = rng.uniform(0, cw); w = rng.uniform(wmin, wmax)
            xs = np.arange(cw)[None, :]
            prof = np.clip(1 - np.abs(xs - x) / w, 0, 1)
            end = rng.uniform(1 - tipfade, 1.0)
            along = (yy < end) * (1 - smoothstep((yy - end + 0.15) / 0.15)) * smoothstep(yy / 0.18 + 0.15)   # soft at the root
            if gaps and rng.random() < gaps: along = along * (yy > rng.uniform(0, 0.4))
            a = prof * along
            lum = rng.uniform(0.38, 0.62) * (0.75 + 0.25 * yy)   # darker at the root
            col[..., 3] = np.maximum(col[..., 3], a)
            col[..., :3] += (a * lum)[..., None] * (1 - col[..., 3:4] * 0.5)
        col[..., :3] = np.clip(col[..., :3], 0, 1)
        img[:, c * cw:(c + 1) * cw] = col
    img[..., :3] = np.where(img[..., 3:4] > 0.01, img[..., :3] / np.maximum(img[..., 3:4], 0.3), 0.45)
    return np.clip(img[::-1], 0, 1)   # v = 0 at the bottom row of the image: roots at the bottom


def write_png(path, img):
    """RGBA PNG without PIL (Blender's Python has none)."""
    import struct, zlib
    a = (np.clip(img, 0, 1) * 255).astype(np.uint8)
    h, w = a.shape[:2]
    raw = b''.join(b'\x00' + a[y].tobytes() for y in range(h))
    def chunk(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
                + chunk(b'IDAT', zlib.compress(raw, 6)) + chunk(b'IEND', b''))


def references(B, v):
    """Each vertex tied to the base as MakeHuman's own proxies are: the triangle of the base's skin under it (among
    those round its nearest vertex of the pool), barycentric weights of its foot on that triangle, and the offset from
    there. A single nearest vertex plus an offset did not follow a reshaped head between vertices: points of the
    subdivided shell sank under the skin of a fuller head (holes, v11)."""
    tris = {}
    for f in B.F:
        for t in ((f[0], f[1], f[2]), (f[0], f[2], f[3])) if len(f) == 4 else ((f[0], f[1], f[2]),):
            for i in t: tris.setdefault(i, []).append(t)
    pool = B.V[B.pool]
    near = np.empty(len(v), int)
    for i in range(0, len(v), 2048):
        chunk = v[i:i + 2048]
        near[i:i + 2048] = B.pool[np.argmin(((chunk[:, None, :] - pool[None, :, :]) ** 2).sum(-1), axis=1)]
    refs = []
    for p, n in zip(v, near):
        best, best_w = None, None
        for t in tris.get(int(n), ()):
            a, b, c = B.V[list(t)]
            e0, e1, e2 = b - a, c - a, p - a
            d00, d01, d11, d20, d21 = e0 @ e0, e0 @ e1, e1 @ e1, e2 @ e0, e2 @ e1
            den = d00 * d11 - d01 * d01
            if den < 1e-12: continue
            wb = (d11 * d20 - d01 * d21) / den; wc = (d00 * d21 - d01 * d20) / den
            w = np.array([1 - wb - wc, wb, wc])
            if best is None or w.min() > best_w.min(): best, best_w = t, w
        if best is None:
            refs.append((int(n), int(n), int(n), 1.0, 0.0, 0.0, *(p - B.V[n]))); continue
        w = np.clip(best_w, 0, None); w /= w.sum()
        foot = w @ B.V[list(best)]
        refs.append((*map(int, best), *w.tolist(), *(p - foot)))
    return refs


def write(B, name, mesh, out_dir, tex):
    d = os.path.join(out_dir, 'hair', name)
    os.makedirs(d, exist_ok=True)
    v = np.array(mesh.v)
    refs = references(B, v)
    with open(os.path.join(d, name + '.obj'), 'w') as f:
        for p in v: f.write('v %.5f %.5f %.5f\n' % tuple(p))
        for t in mesh.vt: f.write('vt %.5f %.5f\n' % t)
        for face in mesh.f: f.write('f ' + ' '.join(f'{i + 1}/{i + 1}' for i in face) + '\n')
    with open(os.path.join(d, name + '.mhclo'), 'w') as f:
        f.write(f'# generated by tools/unity/people/hairgen.py v{VERSION}\nname {name}\nobj_file {name}.obj\nmaterial {name}.mhmat\nverts 0\n')
        for a, b, c, wa, wb, wc, ox, oy, oz in refs:
            f.write(f'{a} {b} {c} {wa:.5f} {wb:.5f} {wc:.5f} {ox:.5f} {oy:.5f} {oz:.5f}\n')
    with open(os.path.join(d, name + '.mhmat'), 'w') as f:
        f.write(f'name {name}\ndiffuseTexture {name}.png\ntransparent True\n')
    write_png(os.path.join(d, name + '.png'), tex)
    return len(mesh.f)


def generate(mh, out_dir):
    """Writes every style under out_dir/hair/<name>/ unless this version is there already. Returns {name: quads}."""
    stamp = os.path.join(out_dir, 'hair', f'.v{VERSION}')
    if os.path.exists(stamp): return {}
    B = Base(mh)
    tex = atlas(np.random.default_rng(7))
    made = {}
    for i, name in enumerate(STYLES):
        made[name] = write(B, name, GENERATORS[name](B, np.random.default_rng(100 + i)), out_dir, tex)
    open(stamp, 'w').close()
    return made


if __name__ == '__main__':
    import sys
    print(generate(sys.argv[1], sys.argv[2]))
