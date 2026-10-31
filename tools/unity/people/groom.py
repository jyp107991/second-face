"""Real grooms made into our hair (P4.16, the owner: the hairline looked awful; use the best hair there is). The grooms are
the hairstyles of Unity's HDRP Defender character demo (github.com/UnityTechnologies/HDRP-Defender-Character-Demo,
"Hair Files": AMD TressFX strands; the character package is for educational and non-commercial use with attribution to
Unity, the owner's game is for personal use; docs/CREDITS.md). A strand groom is far too heavy for a phone's crowd, so
it is turned into cards that follow it: the strands aligned onto the MakeHuman base head (one scale and offset for all
the demo's grooms, fitted by their roots to the skull), their roots set on the skin and nothing left inside the head,
then clustered into clumps, each clump a card along its mean strand, as wide as the clump; the fine layers (the baby
hairs round the hairline, the front wisps) as narrow cards of the wisp column. Where the groom grows hair, the scalp
under it is covered by a lifted layer (hairgen's shell) whose edge is the groom's own hairline, not a model of one.
SF_GROOMS: the demo's "Hair Files" directory (without it the styles that need it are skipped)."""
import os
import numpy as np

import tfx
import hairgen
from hairgen import Mesh, outward, spindle, taper, COLS

GROOMS = os.environ.get('SF_GROOMS')

# the demo's grooms are all on one head: every root of these layers fits the transform once
FIT_LAYERS = {'Loose': None, 'Blonde': None}


def resample(strands, k):
    """Strands (n, m, 3) to k points each, evenly by length; and their lengths."""
    seg = np.linalg.norm(np.diff(strands, axis=1), axis=2)
    cum = np.concatenate([np.zeros((len(strands), 1)), np.cumsum(seg, 1)], 1)
    L = cum[:, -1]
    out = np.empty((len(strands), k, 3))
    t = np.linspace(0, 1, k)
    for i in range(len(strands)):
        tt = t * L[i]
        for a in range(3): out[i, :, a] = np.interp(tt, cum[i], strands[i, :, a])
    return out, L


def smooth(strands, passes=2):
    """A strand's course without its finest waves and coils (the card's texture draws those)."""
    s = strands.copy()
    for _ in range(passes):
        s[:, 1:-1] = 0.25 * s[:, :-2] + 0.5 * s[:, 1:-1] + 0.25 * s[:, 2:]
    return s


def skull(B, P):
    """The skull's radius from the head's centre in the direction of each point (hairgen.Base.surf, vectorised), and the
    unit directions."""
    U = P - B.c
    U /= np.maximum(np.linalg.norm(U, axis=1, keepdims=True), 1e-9)
    R = np.empty(len(P))
    for i in range(0, len(P), 4096):
        dots = U[i:i + 4096] @ B.hdir.T
        near = np.argpartition(-dots, 8, axis=1)[:, :8]
        d = np.take_along_axis(dots, near, 1)
        w = np.exp((d - d.max(1, keepdims=True)) / 0.0015)
        R[i:i + 4096] = (w * B.hrad[near]).sum(1) / w.sum(1)
    return R, U


class Fit:
    """The demo's head (centimetres, y up, z forward) onto the MakeHuman base (decimetres): a uniform scale and an
    offset, fitted by iterated closest points from the grooms' roots to the base's skull (no rotation: a skull is near a
    sphere and a rotation slid round it)."""

    def __init__(self, B, roots_cm):
        P = B.V[B.head]
        face = (P[:, 2] > B.eye[2] - 0.25) & (P[:, 1] < B.eye[1] + 0.45)
        low = P[:, 1] < B.eye[1] - 1.0
        tgt = P[~face & ~low]
        rng = np.random.default_rng(3)
        src = roots_cm[rng.choice(len(roots_cm), size=min(5000, len(roots_cm)), replace=False)]
        s = 0.1
        t = np.array([tgt[:, 0].mean() - s * src[:, 0].mean(), tgt[:, 1].max() - s * src[:, 1].max(), tgt[:, 2].mean() - s * src[:, 2].mean()])
        for _ in range(40):
            p = s * src + t
            nn = np.empty_like(p)
            for i in range(0, len(p), 1024):
                d = ((p[i:i + 1024, None, :] - tgt[None, :, :]) ** 2).sum(-1)
                nn[i:i + 1024] = tgt[d.argmin(1)]
            ms, mn = src.mean(0), nn.mean(0)
            a, b = src - ms, nn - mn
            s = float((a * b).sum() / (a * a).sum())
            t = mn - s * ms
        self.s, self.t = s, t
        p = s * src + t
        R, _ = skull(B, p)
        self.residual = float(np.median(np.abs(np.linalg.norm(p - B.c, axis=1) - R)))

    def __call__(self, strands_cm):
        return strands_cm * self.s + self.t


def settle(B, strands, lift=0.02, hold=0.6):
    """Roots onto the skin (each strand moved by its root's error, less towards the tip by `hold`), and every point at
    least `lift` (dm) off the skull where the skull is (hair hanging below the head is left to the back's profile)."""
    n, k, _ = strands.shape
    R, U = skull(B, strands[:, 0])
    d = B.c + U * R[:, None] - strands[:, 0]
    w = 1.0 - hold * np.linspace(0, 1, k)
    s = strands + d[:, None, :] * w[None, :, None]
    flat = s.reshape(-1, 3)
    R, U = skull(B, flat)
    r = np.linalg.norm(flat - B.c, axis=1)
    elev = np.degrees(np.arcsin(np.clip(U[:, 1], -1, 1)))
    head = elev > -40
    inside = head & (r < R + lift)
    flat[inside] = B.c + U[inside] * (R[inside] + lift)[:, None]
    # long hair down the back stays behind it
    y, z, x = flat[:, 1], flat[:, 2], flat[:, 0]
    body = (y > B.back_y[0]) & (y < B.back_y[-1]) & (np.abs(x) < 0.45) & ~head
    if body.any():
        bz = np.interp(y[body], B.back_y, B.back_z)
        flat[body, 2] = np.minimum(z[body], bz - 0.04)
    return flat.reshape(n, k, 3)


def kmeans(X, k, rng, iters=14):
    k = min(k, len(X))
    C = X[rng.choice(len(X), size=k, replace=False)].copy()
    lab = np.zeros(len(X), int)
    for _ in range(iters):
        for i in range(0, len(X), 4096):
            lab[i:i + 4096] = ((X[i:i + 4096, None, :] - C[None]) ** 2).sum(-1).argmin(1)
        for j in range(k):
            m = lab == j
            if m.any(): C[j] = X[m].mean(0)
    return lab


def cards(B, m, strands, count, k, width, col, rng, wmin=0.012, spread=2.2, lift=0.0, root=0.45):
    """`count` cards from `strands` (n, m, 3, settled): clustered by their courses (the root weighed double), each card
    along its clump's mean course, as wide as the clump (`spread` times its spread, within [wmin, width] dm), narrow at
    the root (`root` of its width) and the tip; atlas column `col`."""
    if len(strands) == 0: return 0
    S, L = resample(smooth(strands), k)
    feats = np.concatenate([S[:, 0] * 2.0, S[:, k // 3], S[:, (2 * k) // 3], S[:, -1]], 1)
    lab = kmeans(feats, count, rng)
    made = 0
    for j in np.unique(lab):
        mem = S[lab == j]
        g = mem.mean(0)
        if len(mem) > 1:
            t = np.gradient(g, axis=0)
            t /= np.maximum(np.linalg.norm(t, axis=1, keepdims=True), 1e-9)
            off = mem - g[None]
            off -= (off * t[None]).sum(-1, keepdims=True) * t[None]
            w = np.clip(spread * np.sqrt((off ** 2).sum(-1).mean(0)), wmin, width)
        else:
            w = np.full(k, wmin)
        w = np.convolve(np.pad(w, 1, mode='edge'), [0.25, 0.5, 0.25], mode='valid')
        w *= spindle(k, 1.0, root, 0.2, 0.25)
        if lift: g = g + outward(B, g) * lift
        m.ribbon(g, outward(B, g), w, col, rng, twist=rng.normal(0, 0.15))
        made += 1
    return made


def tubes(B, m, strands, count, k, rng, rmin=0.02, rmax=0.09, sides=6, col='clump'):
    """Braids and locks as tubes rather than cards (a card along a braid read as a string): the strands clustered into
    `count` plaits, each a tube along its mean course as thick as the plait's spread, the strands' texture round it."""
    if len(strands) == 0: return 0
    S, L = resample(strands, k)
    feats = np.concatenate([S[:, 0] * 2.0, S[:, k // 3], S[:, (2 * k) // 3], S[:, -1]], 1)
    lab = kmeans(feats, count, rng)
    for j in np.unique(lab):
        mem = S[lab == j]
        g = mem.mean(0)
        t = np.gradient(g, axis=0); t /= np.maximum(np.linalg.norm(t, axis=1, keepdims=True), 1e-9)
        off = mem - g[None]
        off -= (off * t[None]).sum(-1, keepdims=True) * t[None]
        r = np.clip(1.3 * np.sqrt((off ** 2).sum(-1).mean(0)), rmin, rmax) * spindle(k, 1.0, 0.7, 0.45, 0.2)
        a = np.cross(t, [0.0, 1.0, 0.0]); bad = np.linalg.norm(a, axis=1) < 1e-3; a[bad] = np.cross(t[bad], [1.0, 0.0, 0.0])
        a /= np.linalg.norm(a, axis=1, keepdims=True); b = np.cross(t, a)
        base = len(m.v)
        u0 = COLS[col] * 0.25
        for i in range(k):
            for q in range(sides + 1):
                ang = 2 * np.pi * q / sides
                m.v.append(tuple(g[i] + (a[i] * np.cos(ang) + b[i] * np.sin(ang)) * r[i]))
                m.vt.append((u0 + 0.24 * q / sides, 1 - i / (k - 1)))
        for i in range(k - 1):
            for q in range(sides):
                c0 = base + i * (sides + 1) + q
                m.f.append((c0, c0 + 1, c0 + sides + 2, c0 + sides + 1))
    return len(np.unique(lab))


_cache = {}

def demo(B):
    """The demo's grooms fitted to the base (cached per base): {style: {layer: settled strands}} and the fit."""
    if 'fit' in _cache: return _cache['styles'], _cache['fit']
    if not GROOMS or not os.path.isdir(GROOMS): raise FileNotFoundError('SF_GROOMS: the Defender demo\'s "Hair Files"')
    raw = {s: tfx.layers(os.path.join(GROOMS, s)) for s in ('Loose', 'Blonde', 'Afro', 'BuzzCut')}
    roots = np.concatenate([a[:, 0] for s in FIT_LAYERS for a in raw[s].values()])
    fit = Fit(B, roots)
    styles = {s: {n: settle(B, fit(a)) for n, a in ls.items()} for s, ls in raw.items()}
    _cache.update(styles=styles, fit=fit)
    return styles, fit


def hairline(B, m, rng, front_only=False):
    """The groom's hairline on any style: its baby hairs all round (Loose's SmallHairs) and the front's wisps (Blonde's
    borders), as fine narrow cards over the shell's soft edge."""
    g, _ = demo(B)
    small = g['Loose']['SmallHairs']
    if front_only: small = small[small[:, 0, 2] > B.eye[2] - 0.9]
    cards(B, m, small, 160, 4, 0.03, 'wisp', rng, wmin=0.01, spread=1.6, lift=0.004)
    cards(B, m, g['Blonde']['Wavy_Borders'], 70, 5, 0.035, 'wisp', rng, wmin=0.01, spread=1.6, lift=0.004)


def gen_crown_braid(B, rng):
    """Work braids from the demo's loose style: two braids round the crown from the temples, the top drawn back into
    them, and all the hair below plaited from where they meet over the back of the head and down the back (the demo
    leaves it loose; no loose fall, no bangs: the hair rule)."""
    g, _ = demo(B)
    L = g['Loose']
    m = Mesh()
    meet = L['Braid_Back'][:, 0].mean(0)
    hairgen.shell(B, m, meet, 0.014, rng)
    cards(B, m, L['Top'], 300, 10, 0.1, 'clump', rng, wmin=0.04, spread=2.0, lift=-0.004)
    cards(B, m, L['Top_Flyaways'], 40, 8, 0.03, 'wisp', rng, wmin=0.01)
    for n in ('BraidL', 'BraidR'):
        tubes(B, m, L[n], 3, 24, rng, rmin=0.03, rmax=0.07)
    # the hair below the crown braids drawn up into the plait (the demo's loose fall, gathered): locks over the layer
    # from the nape and behind the ears to where the braids meet
    low = B.scalp[(B.V[B.scalp, 2] < B.c[2] - 0.2) & (B.V[B.scalp, 1] < meet[1] - 0.25)]
    for r in rng.choice(low, size=90, replace=True):
        pts = hairgen.scalp_path(B, r, meet, rng.uniform(0.02, 0.03), 0.14, rng, wander=0.03)
        if len(pts) < 3: continue
        m.ribbon(pts, outward(B, pts), spindle(len(pts), rng.uniform(0.05, 0.08)), 'clump', rng, twist=rng.normal(0, 0.1))
    hairgen.plait(B, m, B.surf(meet, 0.05), rng, length=3.1, girth=1.15)
    hairline(B, m, rng)
    return m


def combed(B, m, G, rng, rho=0.24, count=700, k=12, front=0.035, gather=0.1, width=0.07, roughness=1.0, flyaways=40):
    """Hair drawn back to a gather point G (a knot's base, a plait's start) from the groom's own roots (round 39: a
    printed layer under cards read as a thin striped cap whatever its numbers). Every root of the Loose groom's scalp
    layers is combed over the skull along its great circle to G, stopping at the gather's rim (`rho`, radians from G); the
    hair stacks as real drawn-back hair does: each strand lies on the ones rooted between it and G (the front's over the
    crown's), so the head of hair stands off the skull by its own volume, `front` (dm) just past the hairline growing to
    `gather` at the rim, and comes down onto the skin at every root (no edge standing off the hairline); rough as hair drawn back by hand
    (`roughness`: sections shifted and lofted together) with `flyaways` slipped strands. Then cards along the clumps' mean
    courses, as `cards` makes them. Returns the number of cards."""
    g, _ = demo(B)
    L = g['Loose']
    roots = np.concatenate([L[n][:, 0] for n in ('Top', 'Bottom', 'Braid_Back', 'BraidL', 'BraidR', 'Bangs')])
    uG = (G - B.c) / np.linalg.norm(G - B.c)
    U = (roots - B.c) / np.linalg.norm(roots - B.c, axis=1, keepdims=True)
    Th = np.arccos(np.clip(U @ uG, -1, 1))
    keep = Th > rho + 0.05                        # roots under the knot are hidden by it
    U, Th = U[keep], Th[keep]
    # the azimuth round G: the hairline's distance from G that way (the farthest roots), for each strand's place in the stack
    e1 = np.cross(uG, [0.0, 1.0, 0.0]); e1 /= np.linalg.norm(e1); e2 = np.cross(uG, e1)
    az = np.arctan2(U @ e2, U @ e1)
    bins = ((az + np.pi) / (2 * np.pi) * 36).astype(int) % 36
    far = np.array([np.percentile(Th[bins == b], 97) if (bins == b).sum() > 4 else Th.max() for b in range(36)])
    far = np.maximum(far, np.convolve(np.pad(far, 1, mode='wrap'), [1 / 3] * 3, mode='valid'))
    Tmax = far[bins]
    # along each root's great circle to G's direction, from the root to the gather's rim (all strands at once)
    th = Th[:, None] + (rho - Th[:, None]) * np.linspace(0, 1, k)[None, :]
    t = (Th[:, None] - th) / Th[:, None]
    s0 = np.sin(Th)[:, None]
    d = (np.sin((1 - t) * Th[:, None]) / s0)[..., None] * U[:, None, :] + (np.sin(t * Th[:, None]) / s0)[..., None] * uG
    d /= np.linalg.norm(d, axis=2, keepdims=True)
    rank = np.clip((Th[:, None] - th) / np.maximum(Tmax[:, None] - th, 1e-6), 0, 1)
    rise = np.clip((Th[:, None] - th) / 0.18, 0, 1)
    # the head of hair's thickness from the hairline (`front`) to the gather's rim (`gather`): more hair passes nearer G, and
    # drawn-back hair is not packed flat (its loft; a packed cross-section alone gave 1-2 mm over the crown, a cap again)
    p = np.clip((Tmax[:, None] - th) / np.maximum(Tmax[:, None] - rho, 1e-6), 0, 1)
    thick = front + (gather - front) * p ** 0.7
    # over the gap-filling layer (0.3 mm at its edge to 1.2 mm inside it: cards under it left a low tie's top as the bare
    # layer), down to it at the root (a card standing 1.4 mm off the hairline cut a hard contour)
    ease = rise * rise * (3 - 2 * rise)
    lift = 0.003 + 0.011 * ease + thick * rank ** 0.8 * ease
    # rough, not slicked: hair drawn back by hand lies in sections, shifted a few millimetres sideways and lofted unevenly
    # together (a field over the head's directions, so neighbouring strands move as one), most at mid-course
    mid = np.sin(np.pi * np.clip(t, 0, 1)) * rise
    side = np.cross(d, np.gradient(d, axis=1))
    side /= np.maximum(np.linalg.norm(side, axis=2, keepdims=True), 1e-9)
    flat = d.reshape(-1, 3) + B.c
    shift = hairgen.wobble(B, flat, rng, scale=(6.0, 14.0), waves=5).reshape(len(U), k)
    loft = hairgen.wobble(B, flat, rng, scale=(8.0, 18.0), waves=5).reshape(len(U), k)
    lift = lift * (1 + roughness * 0.35 * loft * mid)
    R, _ = skull(B, flat)
    S = B.c + d * (R.reshape(len(U), k) + lift)[..., None] + side * (roughness * 0.035 * shift * mid)[..., None]
    made = cards(B, m, S, count, k, width, 'clump', rng, wmin=0.02, spread=1.8)
    # flyaways: strands slipped from the drawn-back hair over the front and the crown, standing off it and ending loose
    fr = np.flatnonzero(U @ np.array([0.0, 0.3, 1.0]) > 0.2)
    for i in rng.choice(fr, size=min(flyaways, len(fr)), replace=False):
        j0, j1 = int(rng.integers(1, k // 3)), int(rng.integers(k // 2, k - 1))
        pts = S[i, j0:j1 + 1] + d[i, j0:j1 + 1] * (rng.uniform(0.01, 0.04) * np.sin(np.linspace(0, np.pi, j1 - j0 + 1)))[:, None]
        m.ribbon(pts, d[i, j0:j1 + 1], spindle(len(pts), rng.uniform(0.012, 0.025)), 'wisp', rng, twist=rng.normal(0, 0.3))
    return made


def coil(B, m, G, axis, rng, turns=1.8, r0=0.3, r1=0.05, rope=0.17, plies=4, k=64):
    """A knot as hair is wound into one (round 39: locks wound round a ring as flat cards stood up as spikes seen edge on):
    the gathered hair twisted into a rope and coiled flat against the head at G, `turns` times from `r0` to `r1` (dm) round
    the axis, the rope `rope` thick and made of `plies` twisted tubes with the strands' texture round them, thinning to its
    end tucked in at the middle."""
    e1 = np.cross(axis, [0.0, 1.0, 0.0]); e1 /= np.linalg.norm(e1); e2 = np.cross(axis, e1)
    t = np.linspace(0, 1, k)
    th = rng.uniform(0, 2 * np.pi) + t * 2 * np.pi * turns
    rad = r0 + (r1 - r0) * t
    thick = rope * (1.0 - 0.45 * t)
    # the coil's centre line: round the axis, standing off the head by the rope's own thickness, the inner turns on top
    # (a dome: a bun stands 3-5 cm off the head)
    centre = G[None] + (np.cos(th)[:, None] * e1 + np.sin(th)[:, None] * e2) * rad[:, None] + axis[None] * (0.5 * thick + 1.3 * rope * t ** 0.8)[:, None]
    tg = np.gradient(centre, axis=0); tg /= np.linalg.norm(tg, axis=1, keepdims=True)
    a = np.cross(tg, axis); a /= np.maximum(np.linalg.norm(a, axis=1, keepdims=True), 1e-9); b = np.cross(tg, a)
    for p in range(plies):
        ph = 2 * np.pi * p / plies + t * 2 * np.pi * turns * 2.2      # the plies twist round the rope
        off = (np.cos(ph)[:, None] * a + np.sin(ph)[:, None] * b) * (0.28 * thick)[:, None]
        g = centre + off
        r = 0.62 * thick * (1 + 0.12 * np.sin(7 * t + p))
        sides = 6
        base = len(m.v)
        u0 = hairgen.COLS['clump'] * 0.25
        tt = np.gradient(g, axis=0); tt /= np.linalg.norm(tt, axis=1, keepdims=True)
        aa = np.cross(tt, axis); aa /= np.maximum(np.linalg.norm(aa, axis=1, keepdims=True), 1e-9); bb = np.cross(tt, aa)
        for i in range(k):
            for q in range(sides + 1):
                ang = 2 * np.pi * q / sides
                m.v.append(tuple(g[i] + (aa[i] * np.cos(ang) + bb[i] * np.sin(ang)) * r[i] * 0.5))
                m.vt.append((u0 + 0.24 * q / sides, (i / (k - 1)) * 3 % 1.0))
        for i in range(k - 1):
            for q in range(sides):
                c0 = base + i * (sides + 1) + q
                m.f.append((c0, c0 + 1, c0 + sides + 2, c0 + sides + 1))
    # a few loose ends at the coil's edge (rough, not pinned neat)
    for s in range(8):
        i = int(rng.integers(0, k // 2))
        d = centre[i] - G; d -= axis * (d @ axis); d /= max(np.linalg.norm(d), 1e-9)
        pts = np.array([centre[i] + (d * 0.6 + axis * 0.2 + rng.normal(0, 0.2, 3)) * 0.08 * j for j in range(4)])
        m.ribbon(pts, np.repeat(axis[None], 4, 0), taper(4, 0.03, 0.01), 'wisp', rng)


def gen_bun_groom(B, rng):
    """A rough bun from the groom (round 39): the hair combed back from its real roots to a knot high at the back of the
    head, with its own volume over the crown and the ears, a thin layer under it only to close the gaps between the cards,
    the knot a rope coiled flat on the head (`coil`), the groom's hairline over the edge."""
    m = Mesh()
    G = B.surf(B.c + np.array([0.0, 0.42, -0.9]), 0.0)
    hairgen.shell(B, m, G, 0.0, rng)
    combed(B, m, G, rng)
    axis = (G - B.c) / np.linalg.norm(G - B.c)
    coil(B, m, G, axis, rng)
    hairline(B, m, rng)
    return m


def gen_braid_groom(B, rng):
    """A work braid from the groom (round 39): the hair combed back from its real roots to the nape with its own volume,
    gathered in a small knot there and plaited down the back."""
    m = Mesh()
    Nk = B.surf(B.c + np.array([0.0, -0.5, -0.9]), 0.0)
    hairgen.shell(B, m, Nk, 0.0, rng)
    combed(B, m, Nk, rng, rho=0.16, gather=0.07, count=900)
    axis = (Nk - B.c) / np.linalg.norm(Nk - B.c)
    hairgen.knot(m, Nk + axis * 0.1, axis, 18, (0.09, 0.13), (0.05, 0.08), 'clump', rng)
    hairgen.plait(B, m, B.surf(Nk, 0.06), rng)
    hairline(B, m, rng)
    return m


def dressed(gen):
    """A style of hairgen's with the groom's hairline over its own edge (P4.16)."""
    def g(B, rng):
        m = gen(B, rng)
        hairline(B, m, rng)
        return m
    return g


def generators():
    """The styles the grooms make or finish (hairgen.generate takes these over its own when SF_GROOMS is there): the
    bun and the work braid combed from the groom's roots (round 39; the crown braids, `gen_crown_braid`, read as feathers
    over a cap, round 36), and the matted and cropped styles get the real hairline."""
    if not GROOMS or not os.path.isdir(GROOMS): return {}
    return {'sf_braid': gen_braid_groom, 'sf_bun': gen_bun_groom, 'sf_matted': dressed(hairgen.gen_matted),
            'sf_crop': dressed(hairgen.gen_crop)}
