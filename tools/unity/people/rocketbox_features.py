"""Each major feature calibrated on its own (owner, 2026-10-31): measured in millimetres on every Rocketbox head's own mesh
(rocketbox_surface.py: exact triangles in the eyes' frame), never through a fit. The midline profile is the plane x = 0 cut
through the head; its turning points give the nose's root, tip and base, the upper lip, the mouth's line, the lower lip,
the fold under it, the chin's front and bottom. Widths come from horizontal cuts: the nose's wings where the wing's side
falls back into the cheek, the cheekbones and the jaw where the face is widest in front of the ears, the chin across its
front. Every landmark is a point on the surface (an interpolation of the mesh's vertices), so the same points can be
followed under a shape to measure what one unit of a slider does to its feature.
Per sex: the library's spread of each feature ([5, 95] % after outliers); each slider's millimetres per unit (median over
the heads that carry the sculptor's shapes); each face's limits: as far as the library reaches on that feature from where
this face is, never past one unit. Eye size and spacing do not vary in the library (every head of a sex shares the eye
sockets) and are calibrated from published norms instead; features the library varies less than real people do are
widened to published spreads (NORMS).
Usage: python3 rocketbox_features.py <meshes.npz> <sculpt_meshes.npz> <out.json> [--debug name]"""
import json, os, sys
import numpy as np

SLIDERS = {
    'chin-height': 'chin_length', 'chin-prominent': 'chin_projection', 'chin-width': 'chin_width', 'chin-bones': 'jaw_width',
    'chin-prognathism': 'chin_forward', 'mouth-trans': 'lips_forward', 'nose-volume': 'nose_width', 'nose-hump': 'dorsum',
    'cheek-volume': 'cheek_width', 'brow-ridge': 'brow_projection', 'eye-trans': 'eye_spacing', 'eye-scale': 'eye_size',
    'mouth-scale-horiz': 'mouth_width', 'mouth-upperlip-volume': 'upper_lip', 'mouth-lowerlip-volume': 'lower_lip',
    'nose-scale-horiz': 'nose_width', 'nose-nostrils-width': 'nose_width', 'nose-scale-vert': 'nose_length',
    'nose-scale-depth': 'nose_projection', 'cheek-bones': 'cheekbone_width',
}


class Pts:
    """Points on a mesh's surface as weights over up to four of its vertices (so they can be evaluated under a shape)."""
    def __init__(self, idx, w): self.idx, self.w = idx, w
    def at(self, V): return (V[self.idx] * self.w[..., None]).sum(-2)
    def take(self, k): return Pts(self.idx[k], self.w[k])


def section(V, T, axis, val, step=0.25):
    """The cut of the mesh by the plane V[:, axis] = val, sampled every `step` mm along each crossing triangle's segment."""
    d = V[:, axis] - val
    E = [(0, 1), (1, 2), (2, 0)]
    s = d[T] > 0
    cross = s.any(1) & ~s.all(1)
    Tc = T[cross]; dc = d[Tc]
    ends = []
    for a, b in E:
        da, db = dc[:, a], dc[:, b]
        ch = (da > 0) != (db > 0)
        t = np.where(ch, da / np.where(ch, da - db, 1), 0)
        ends.append((ch, Tc[:, a], Tc[:, b], t))
    # each crossing triangle has exactly two crossing edges: the first and the second found
    ch = np.stack([e[0] for e in ends], 1)
    first = np.argmax(ch, 1); second = 2 - np.argmax(ch[:, ::-1], 1)
    rows = np.arange(len(Tc))
    pick = lambda k, sel: np.stack([e[k] for e in ends], 1)[rows, sel]
    ia, ja, ta = pick(1, first), pick(2, first), pick(3, first)
    ib, jb, tb = pick(1, second), pick(2, second), pick(3, second)
    A = V[ia] * (1 - ta[:, None]) + V[ja] * ta[:, None]; B = V[ib] * (1 - tb[:, None]) + V[jb] * tb[:, None]
    n = np.maximum(1, np.ceil(np.linalg.norm(B - A, axis=1) / step).astype(int))
    rep = np.repeat(np.arange(len(n)), n + 1)
    u = np.concatenate([np.linspace(0, 1, k + 1) for k in n])
    idx = np.stack([ia[rep], ja[rep], ib[rep], jb[rep]], 1)
    w = np.stack([(1 - ta[rep]) * (1 - u), ta[rep] * (1 - u), (1 - tb[rep]) * u, tb[rep] * u], 1)
    return Pts(idx, w)


def front(P, coord, lo, hi, step=0.5, keep=None):
    """For bins of `coord` (an axis) from hi down to lo, the index of the front-most point (smallest y) in each (-1: none)."""
    keep = np.ones(len(P), bool) if keep is None else keep
    c = P[:, coord]; bins = np.arange(hi, lo, -step); out = np.full(len(bins), -1)
    k = np.floor((hi - c) / step).astype(int)
    ok = np.where(keep & (k >= 0) & (k < len(bins)))[0]
    ok = ok[np.argsort(P[ok, 1], kind='stable')]                 # front-most first: the first of each bin wins
    _, first = np.unique(k[ok], return_index=True)
    out[k[ok[first]]] = ok[first]
    return bins, out


class Face:
    """One head's landmarks: points on its surface (Pts), found once on its own shape."""
    def __init__(self, V, T):
        self.V, self.T = V, T
        L = {}
        S = section(V, T, 0, 0.0); P = S.at(V)
        zs, ix = front(P, 2, -170, 25, keep=P[:, 1] < 40)
        f = np.where(ix >= 0, -P[np.maximum(ix, 0), 1], np.nan)
        ok = ~np.isnan(f); f = np.interp(np.arange(len(f)), np.where(ok)[0], f[ok])
        win = lambda a, b: np.where((zs <= a) & (zs >= b) & (ix >= 0))[0]
        def turn(a, b, fn, name):
            m = win(a, b)
            if not len(m): raise ValueError(f'no profile for {name} in z {a:.0f}..{b:.0f}')
            k = m[fn(f[m])]; L[name] = (S.take(np.array([ix[k]])), zs[k]); return zs[k]
        zprn = turn(-10, -65, np.argmax, 'prn')
        turn(22, -12, np.argmin, 'n')
        # the nose's base: below the tip the profile runs back steeply (the columella's underside); the base is where
        # it turns down again (the slope per mm of height falls under 0.5)
        m = win(zprn, zprn - 25)
        slope = -np.diff(f[m]) / 0.5
        kmax = int(np.argmax(slope))
        after = np.where(slope[kmax:] < 0.5)[0]
        ksn = m[kmax + (after[0] if len(after) else len(slope) - 1 - kmax)]
        L['sn'] = (S.take(np.array([ix[ksn]])), zs[ksn]); zsn = zs[ksn]
        zls = turn(zsn - 2, zsn - 24, np.argmax, 'ls')
        # the mouth's line: the deepest notch between the lips (depth against the profile 1.5 mm above and below), not
        # the deepest point, which runs on down when the lower lip sits back
        m = win(zls - 2, zls - 15)
        notch = np.array([(f[max(k - 3, 0)] + f[min(k + 3, len(f) - 1)]) / 2 - f[k] for k in m])
        ksto = m[int(np.argmax(notch))]; L['sto'] = (S.take(np.array([ix[ksto]])), zs[ksto]); zsto = zs[ksto]
        zli = turn(zsto - 1, zsto - 16, np.argmax, 'li')
        zlm = turn(zli - 2, zli - 22, np.argmin, 'lm')
        zpog = turn(zlm - 2, zlm - 32, np.argmax, 'pog')
        kpog = int(np.where(zs == zpog)[0][0]); ypog = -f[kpog]
        # the chin's bottom: going down from its front, the last height at which the chin is still there (below it the
        # profile jumps back to the throat, or ends)
        kme = kpog
        while kme + 1 < len(zs) and ix[kme + 1] >= 0 and -P[ix[kme + 1], 1] > -ypog - 15: kme += 1
        L['me'] = (S.take(np.array([ix[kme]])), zs[kme])
        self.profile = (zs, f)
        # widths: the end points (followed under a shape where the slider moves them), and the heights and depths at
        # which they were found (where a width is measured again on a shaped face: the outline's change at a height)
        self.y_sn = L['sn'][0].at(V)[0, 1]; self.z = {'sn': zsn, 'sto': zsto, 'pog': zpog, 'me': zs[kme]}
        self.ypog, self.ysto = ypog, L['sto'][0].at(V)[0, 1]
        r = nose_wings(V, T, np.arange(zsn + 1, zsn + 10, 1.0), self.y_sn)
        if r: (L['alL'], L['alR']), self.z['al'] = r[0], r[1]
        self.levels = {
            # the cheekbones: the face's sides widen on back to the ears, so the width is taken across the cheeks'
            # front, a cut 15 mm behind the eyes' centres, where the cheekbones' prominence shows
            'cheekbone_width': (np.arange(-5, -50, -2.5), 14.25, 15.75),
            'jaw_width': (np.arange(zsto - 5, zsto - 25, -2.5), -1e9, 60),
            # the jaw's lower outline: the face's width a third of the way up from the chin's bottom to the mouth
            'jaw_low_width': (np.array([zs[kme] + 0.33 * (zsto - zs[kme])]), -1e9, 60),
            'chin_width': (np.array([zpog]), -1e9, ypog + 15),
            # the cheeks' fullness: the face's width between the nose's base and the mouth, 5 mm behind the eyes
            'cheek_width': (np.arange(zsn, zsto, -2.5), 4.25, 5.75),
        }
        self.eyes = eye_rims(V, T)
        for ft, (zz, ylo, yhi) in self.levels.items():
            r = widest(V, T, zz, ylo, yhi)
            if r: L[ft + 'L'], L[ft + 'R'] = r[0]
        r = mouth_corners(V, T, zsto, self.ysto)
        if r: L['chL'], L['chR'] = r
        self.L = {k: v[0] if isinstance(v, tuple) else v for k, v in L.items()}

    def measures(self, V=None):
        """The features in millimetres: on this face, or on it under a shape (V: the shaped vertices; the profile's
        points followed, the widths measured again at this face's heights)."""
        base = V is None
        V = self.V if base else V
        p = lambda k: self.L[k].at(V)[0] if k in self.L else np.full(3, np.nan)
        z = lambda k: p(k)[2]; fw = lambda k: -p(k)[1]
        w = lambda a, b: p(a)[0] - p(b)[0]
        m = {
            'nose_length': z('n') - z('sn'), 'nose_projection': fw('prn') - fw('sn'),
            'upper_lip': z('ls') - z('sto'), 'upper_lip_fwd': fw('ls') - fw('sn'),
            'lower_lip': z('sto') - z('li'), 'lower_lip_fwd': fw('li') - fw('lm'),
            'philtrum': z('sn') - z('ls'),
            'chin_length': z('sto') - z('me'), 'chin_projection': fw('pog') - fw('lm'),
            'lower_face': z('sn') - z('me'), 'face_height': z('n') - z('me'),
            'mouth_width': w('chL', 'chR'), 'nose_width': w('alL', 'alR'),
            'chin_forward': fw('pog') - fw('sn'), 'lips_forward': (fw('ls') + fw('li')) / 2 - (fw('sn') + fw('pog')) / 2,
        }
        m['dorsum'] = dorsum(V, self.T, p('n'), p('prn'))
        m['brow_projection'] = brow(V, self.T) - fw('n')
        if self.eyes is not None:
            (iL, iR) = self.eyes; cL, cR = V[iL].mean(0), V[iR].mean(0)
            m['eye_spacing'] = cL[0] - cR[0]
            m['eye_size'] = (np.ptp(V[iL][:, 0]) + np.ptp(V[iR][:, 0])) / 2
        else: m['eye_spacing'] = m['eye_size'] = np.nan
        for ft, (zz, ylo, yhi) in self.levels.items():
            if base: m[ft] = w(ft + 'L', ft + 'R')
            else:
                r = widest(V, self.T, zz, ylo, yhi)
                m[ft] = r[1] if r else np.nan
        if not base and 'al' in self.z:
            r = nose_wings(V, self.T, np.arange(self.z['al'] - 3, self.z['al'] + 4, 1.0), self.y_sn)
            m['nose_width'] = r[2] if r else np.nan
        if not base:
            r = mouth_corners(V, self.T, self.z['sto'], self.ysto)
            m['mouth_width'] = (r[0].at(V)[0, 0] - r[1].at(V)[0, 0]) if r else np.nan
        return m


def dorsum(V, T, n, prn):
    """The nose's bridge: how far the profile between the nose's root and tip stands out of the straight line between
    them at most (mm; a hump positive, a dip negative)."""
    P = section(V, T, 0, 0.0).at(V)
    sel = P[(P[:, 2] < n[2] - 3) & (P[:, 2] > prn[2] + 3) & (P[:, 1] < 0)]
    if not len(sel): return np.nan
    zs, ix = front(sel, 2, prn[2] + 3, n[2] - 3)
    q = sel[ix[ix >= 0]]
    t = (q[:, 2] - n[2]) / (prn[2] - n[2]); line_y = n[1] + t * (prn[1] - n[1])
    dev = line_y - q[:, 1]
    return float(dev[np.argmax(np.abs(dev))])


def brow(V, T):
    """How far forward the brow stands over each eye's middle (the front-most point 5 to 20 mm above the eyes in the cut
    through the eye's middle, both sides averaged; mm forward)."""
    out = []
    for x in (30.0, -30.0):
        P = section(V, T, 0, x).at(V)
        c = P[(P[:, 2] > 5) & (P[:, 2] < 20) & (P[:, 1] < 10)]
        if len(c): out.append(-c[:, 1].min())
    return float(np.mean(out)) if len(out) == 2 else np.nan


def eye_rims(V, T):
    """The rims of the eye openings: the mesh's open edges around each eye (vertex indices, left and right)."""
    e = np.sort(np.concatenate([T[:, [0, 1]], T[:, [1, 2]], T[:, [2, 0]]]), 1)
    u, c = np.unique(e, axis=0, return_counts=True); bv = np.unique(u[c == 1])
    out = []
    for x in (30.0, -30.0):
        d = np.hypot(V[bv, 0] - x, V[bv, 2])
        sel = bv[(d < 22) & (V[bv, 1] < 5)]
        if len(sel) < 6: return None
        out.append(sel)
    return tuple(out)


def widest(V, T, zz, ylo, yhi):
    """The widest pair of points (one each side) over the cuts at heights zz, between depths ylo and yhi:
    ((left Pts, right Pts), width)."""
    best = None
    for z in zz:
        Sz = section(V, T, 2, z); Q = Sz.at(V); r = []
        for sgn in (1, -1):
            c = np.where((sgn * Q[:, 0] > 0) & (Q[:, 1] < yhi) & (Q[:, 1] >= ylo))[0]
            if not len(c): break
            k = c[np.argmax(sgn * Q[c, 0])]; r.append((Sz.take(np.array([k])), abs(Q[k, 0])))
        if len(r) == 2 and (best is None or r[0][1] + r[1][1] > best[1]): best = ((r[0][0], r[1][0]), r[0][1] + r[1][1])
    return best


def nose_wings(V, T, zz, y_sn):
    """The nose's wings: in each cut at heights zz, each side's point where the front falls back most steeply as it
    leaves the wing for the cheek; the widest pair: ((left, right), z, width)."""
    best = None
    for z in zz:
        Sz = section(V, T, 2, z); Q = Sz.at(V); res = []
        for sgn in (1, -1):
            keep = (sgn * Q[:, 0] >= 0) & (Q[:, 1] < y_sn + 30)
            xs, jx = front(np.stack([np.abs(Q[:, 0]), Q[:, 1], Q[:, 2]], 1), 0, 0, 30, keep=keep)
            xs, jx = xs[::-1], jx[::-1]                     # |x| rising
            g = np.where(jx >= 0, Q[np.maximum(jx, 0), 1], np.nan)
            good = np.where(~np.isnan(g) & (xs >= 8) & (xs <= 26))[0]
            if len(good) < 4: break
            kk = int(np.argmax(np.diff(g[good])))
            res.append((Sz.take(np.array([jx[good[kk]]])), xs[good[kk]]))
        if len(res) == 2 and (best is None or res[0][1] + res[1][1] > best[2]):
            best = ((res[0][0], res[1][0]), z, res[0][1] + res[1][1])
    return best


def mouth_corners(V, T, zsto, ysto):
    """The mouth's corners: the mouth's line is a notch between the lips in every cut along the face (x = c); going out
    from the middle, each corner is where that notch ends. (left Pts, right Pts)."""
    out = []
    for sgn in (1, -1):
        last = None
        for c in np.arange(4.0, 40.0, 1.0):
            Sx = section(V, T, 0, sgn * c); P = Sx.at(V)
            keep = (np.abs(P[:, 2] - zsto) < 9) & (P[:, 1] < ysto + 30)
            zs, ix = front(P, 2, zsto - 9, zsto + 9, keep=keep)
            okb = ix >= 0
            if okb.sum() < 20: break
            f = np.interp(np.arange(len(zs)), np.where(okb)[0], -P[ix[okb], 1])
            m = np.where(np.abs(zs - zsto) <= 5)[0]
            depth = np.array([(f[max(k - 4, 0)] + f[min(k + 4, len(f) - 1)]) / 2 - f[k] for k in m])
            k = int(np.argmax(depth))
            if depth[k] < 0.3: break
            last = Sx.take(np.array([ix[m[k]]])); zsto = zs[m[k]]
        if last is None: return None
        out.append(last)
    return tuple(out)


# each slider's two ends, as its shapes are named (Sculpt.cs): decr/incr unless named otherwise
SIDES = {'eye-trans': ('in', 'out'), 'brow-ridge': ('backward', 'forward'), 'mouth-trans': ('backward', 'forward')}
# Published adult spreads (tools/unity/people/data/published_face_norms.json, with sources and the landmark definitions
# that make each one the same measurement as ours): a feature's range is widened to them where the library is narrower,
# centred on the library's median; what the library holds fixed (the eyes) moves 1.645 published sd from each face.
NORMS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'published_face_norms.json')


def widen(dist, norms, sex):
    """Each feature's range [lo, hi]: the library's [5, 95] %, each end widened where a published measurement with the
    same landmarks spreads wider, as far as both readings of it agree: out to the nearer of (library median +- 1.645 sd)
    and (published mean +- 1.645 sd), never inward of the library's own ends. Records where each end came from."""
    for ft, q in dist.items():
        q['lo'], q['hi'], q['from'] = q['p5'], q['p95'], 'library'
        n = norms.get(ft)
        if not n: continue
        sd = n['sd'][sex]
        if q['p95'] - q['p5'] < 1.0: q['fixed'] = True; q['sd'] = sd; q['from'] = 'published sd from each face (library fixed)'; continue
        centred = (q['p50'] - 1.645 * sd, q['p50'] + 1.645 * sd)
        absolute = (n['mean'][sex] - 1.645 * sd, n['mean'][sex] + 1.645 * sd) if 'mean' in n else centred
        lo, hi = min(q['p5'], max(centred[0], absolute[0])), max(q['p95'], min(centred[1], absolute[1]))
        if lo < q['lo'] or hi > q['hi']:
            q['from'] = 'widened: ' + ('low' if lo < q['lo'] else '') + (' and ' if lo < q['lo'] and hi > q['hi'] else '') + ('high' if hi > q['hi'] else '')
            q['lo'], q['hi'] = lo, hi


SLIDER_FEATURES = {'mouth-upperlip-volume': ('upper_lip', 'upper_lip_fwd'), 'mouth-lowerlip-volume': ('lower_lip', 'lower_lip_fwd'),
                   'chin-bones': ('jaw_width', 'jaw_low_width'), 'chin-prominent': ('chin_projection', 'chin_forward'),
                   'nose-volume': ('nose_width', 'nose_length', 'nose_projection'), 'mouth-trans': ('lips_forward',)}


def stats(v):
    g = np.asarray(v, float); g = g[np.isfinite(g)]
    med = np.median(g); mad = np.median(np.abs(g - med)) * 1.4826 + 1e-9
    keep = g[np.abs(g - med) < 3.5 * mad]
    return {'p5': float(np.percentile(keep, 5)), 'p50': float(med), 'p95': float(np.percentile(keep, 95)), 'n': int(len(keep)), 'dropped': int(len(g) - len(keep))}


def main(meshes, sculpt_meshes, out, debug=None):
    M = np.load(meshes); C = np.load(sculpt_meshes)
    names = sorted({k.split('#')[0] for k in M.files if k.endswith('#V')})
    sexof = lambda n: 'f' if 'Female' in n else 'm'
    if debug:
        F = Face(M[debug + '#V'].astype(float), M[debug + '#T'])
        for k, v in F.L.items(): print(k, v.at(F.V)[0].round(1))
        print({k: round(float(v), 1) for k, v in F.measures().items()}); return
    norms = json.load(open(NORMS))['features']
    res = {'_about': __doc__.split('\n')[0], 'sliders': SLIDERS, 'norms': os.path.relpath(NORMS, os.path.dirname(os.path.abspath(__file__))), 'sexes': {}, 'faces': {}}
    # each slider's millimetres per unit on its feature(s): the median over every head carrying the sculptor's shapes
    # (the shapes are the same targets carried onto each head; the four heads agree within a few tenths of a mm on most)
    heads = sorted({k.split('#')[0] for k in C.files if k.endswith('#V')})
    SF = {h: Face(C[h + '#V'].astype(float), C[h + '#T']) for h in heads}
    EFF, PER_HEAD = {}, {}
    for sid, ft in SLIDERS.items():
        fts = SLIDER_FEATURES.get(sid, (ft,))
        lo_name, hi_name = SIDES.get(sid, ('decr', 'incr'))
        EFF[sid], PER_HEAD[sid] = {}, {}
        for side, nm in (('decr', lo_name), ('incr', hi_name)):
            vals = {f_: [] for f_ in fts}
            for h in heads:
                key = f'{h}|{sid}-{nm}'
                if key not in C.files: continue
                b, k = SF[h].measures(), SF[h].measures(C[key].astype(float))
                for f_ in fts:
                    if np.isfinite(b[f_]) and np.isfinite(k[f_]): vals[f_].append(k[f_] - b[f_])
            EFF[sid][side] = {f_: float(np.median(v)) for f_, v in vals.items() if v}
            PER_HEAD[sid][side] = {f_: [round(x, 1) for x in v] for f_, v in vals.items()}
    res['mm_per_unit'] = EFF; res['mm_per_unit_by_head'] = {'heads': heads, 'values': PER_HEAD}
    faces = {}
    for n in names:
        try: faces[n] = Face(M[n + '#V'].astype(float), M[n + '#T'])
        except Exception as e: print('no landmarks on', n, e)
    for s in ('f', 'm'):
        sel = [n for n in names if sexof(n) == s and n in faces]
        Ms = {n: faces[n].measures() for n in sel}
        feats = list(next(iter(Ms.values())))
        dist = {ft: stats([Ms[n][ft] for n in sel]) for ft in feats}
        widen(dist, norms, s)
        eff = EFF
        res['sexes'][s] = {'features': dist, 'heads': len(sel)}
        for n in sel:
            own = Ms[n]; lim = {}
            for sid in SLIDERS:
                rng = [-1.0, 1.0]
                for side, by in eff[sid].items():
                    units = 1.0
                    for f_, mm in by.items():
                        if abs(mm) < 0.4 or not np.isfinite(own[f_]): continue
                        lo, hi = dist[f_]['lo'], dist[f_]['hi']
                        if dist[f_].get('fixed'): lo, hi = own[f_] - 1.645 * dist[f_]['sd'], own[f_] + 1.645 * dist[f_]['sd']
                        room = (hi - own[f_]) if mm > 0 else (lo - own[f_])
                        units = min(units, float(np.clip(room / mm, 0, 1)))
                    if side == 'incr': rng[1] = units
                    else: rng[0] = -units
                lim[sid] = [round(rng[0], 3), round(rng[1], 3)]
            res['faces'][n] = {'sex': s, 'features': {k: round(float(v), 1) for k, v in own.items()}, 'limits': lim}
    json.dump(res, open(out, 'w'), indent=1)
    for s, d in res['sexes'].items():
        print(s, d['heads'], 'heads')
        for ft, q in d['features'].items():
            print(f'  {ft:16s} p5 {q["p5"]:6.1f}  median {q["p50"]:6.1f}  p95 {q["p95"]:6.1f}  range {q["lo"]:6.1f}..{q["hi"]:6.1f} mm ({q["from"]}; n {q["n"]}, out {q["dropped"]})')
    for sid, by in res['mm_per_unit'].items():
        print(f'{sid:24s}', {side: {f_: round(v, 1) for f_, v in fv.items()} for side, fv in by.items()}, ' by head', res['mm_per_unit_by_head']['values'][sid])


if __name__ == '__main__':
    a = sys.argv[1:]
    dbg = a[a.index('--debug') + 1] if '--debug' in a else None
    main(*a[:3], debug=dbg)
