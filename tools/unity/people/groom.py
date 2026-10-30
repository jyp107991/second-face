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
from hairgen import Mesh, outward, spindle, COLS

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


def cards(B, m, strands, count, k, width, col, rng, wmin=0.012, spread=2.2, lift=0.0):
    """`count` cards from `strands` (n, m, 3, settled): clustered by their courses (the root weighed double), each card
    along its clump's mean course, as wide as the clump (`spread` times its spread, within [wmin, width] dm), narrow at
    the root and the tip; atlas column `col`."""
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
        w *= spindle(k, 1.0, 0.45, 0.2, 0.25)
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
    hairgen.shell(B, m, meet, 0.014, rng, reach=0.2)
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


def dressed(gen):
    """A style of hairgen's with the groom's hairline over its own edge (P4.16)."""
    def g(B, rng):
        m = gen(B, rng)
        hairline(B, m, rng)
        return m
    return g


def generators():
    """The styles the grooms make or finish (hairgen.generate takes these over its own when SF_GROOMS is there):
    sf_braid becomes the crown braids, and the drawn-back and cropped styles get the real hairline."""
    if not GROOMS or not os.path.isdir(GROOMS): return {}
    return {'sf_braid': gen_crown_braid, 'sf_bun': dressed(hairgen.gen_bun), 'sf_matted': dressed(hairgen.gen_matted),
            'sf_crop': dressed(hairgen.gen_crop)}
