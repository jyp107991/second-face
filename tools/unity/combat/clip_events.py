"""The frames a combat clip's beats fall on, read off the FBX's own curves (no Blender needed): a strike's impact (the
striking hand at its fastest; a combination's each blow), a throw's release (the throwing hand at its fastest). Frames are
0-based within the clip as Unity plays it (the take's first key, frame 1 of the file, is the clip's frame 0; frame 0 of the
file is the T-pose bind, outside the take).

A minimal FBX binary reader: the node tree, the Models (bones) with their Lcl transforms and pre/post rotations, the
animation curves wired to them, forward kinematics per frame (Euler XYZ, FBX's default order).

    python3 -I tools/unity/combat/clip_events.py <clip.fbx> [...]      # prints each clip's hand peaks
"""
import json, math, os, struct, sys, zlib

TICKS = 46186158000.0


def _read_props(data, pos, n):
    props = []
    for _ in range(n):
        t = chr(data[pos]); pos += 1
        if t == 'Y': props.append(struct.unpack_from('<h', data, pos)[0]); pos += 2
        elif t == 'C': props.append(bool(data[pos])); pos += 1
        elif t == 'I': props.append(struct.unpack_from('<i', data, pos)[0]); pos += 4
        elif t == 'F': props.append(struct.unpack_from('<f', data, pos)[0]); pos += 4
        elif t == 'D': props.append(struct.unpack_from('<d', data, pos)[0]); pos += 8
        elif t == 'L': props.append(struct.unpack_from('<q', data, pos)[0]); pos += 8
        elif t in 'fdlib':
            length, enc, clen = struct.unpack_from('<III', data, pos); pos += 12
            raw = data[pos:pos + clen]; pos += clen
            if enc == 1: raw = zlib.decompress(raw)
            fmt = {'f': 'f', 'd': 'd', 'l': 'q', 'i': 'i', 'b': 'B'}[t]
            props.append(list(struct.unpack_from('<%d%s' % (length, fmt), raw, 0)))
        elif t in 'SR':
            length = struct.unpack_from('<I', data, pos)[0]; pos += 4
            raw = data[pos:pos + length]; pos += length
            props.append(raw.decode('utf-8', 'replace') if t == 'S' else raw)
        else:
            raise ValueError('unknown FBX property type %r' % t)
    return props, pos


def _read_node(data, pos, wide):
    if wide:
        end, n, plen = struct.unpack_from('<QQQ', data, pos); pos += 24
    else:
        end, n, plen = struct.unpack_from('<III', data, pos); pos += 12
    nlen = data[pos]; pos += 1
    if end == 0: return None, pos
    name = data[pos:pos + nlen].decode('ascii', 'replace'); pos += nlen
    props, pos = _read_props(data, pos, n)
    children = []
    null = 25 if wide else 13
    while pos < end - null + 1 and pos < end:
        child, pos2 = _read_node(data, pos, wide)
        if child is None: pos = pos2; break
        children.append(child); pos = pos2
    return (name, props, children), end


def read(path):
    data = open(path, 'rb').read()
    if not data.startswith(b'Kaydara FBX Binary'): raise ValueError(path + ': not a binary FBX')
    version = struct.unpack_from('<I', data, 23)[0]
    wide = version >= 7500
    pos, nodes = 27, []
    while pos < len(data):
        node, pos2 = _read_node(data, pos, wide)
        if node is None: break
        nodes.append(node); pos = pos2
    return nodes


def child(node, name):
    for c in node[2]:
        if c[0] == name: return c
    return None


def props70(node):
    out = {}
    p = child(node, 'Properties70')
    if p is None: return out
    for rec in p[2]:
        if rec[0] == 'P' and len(rec[1]) >= 4: out[rec[1][0]] = rec[1][4:]
    return out


def _rot(rx, ry, rz):
    """Euler XYZ (degrees; FBX's eXYZ: X applied first) as a 3x3 row-major matrix acting on column vectors."""
    cx, sx = math.cos(math.radians(rx)), math.sin(math.radians(rx))
    cy, sy = math.cos(math.radians(ry)), math.sin(math.radians(ry))
    cz, sz = math.cos(math.radians(rz)), math.sin(math.radians(rz))
    X = [[1, 0, 0], [0, cx, -sx], [0, sx, cx]]
    Y = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]]
    Z = [[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]]
    return mm(Z, mm(Y, X))


def mm(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3)] for i in range(3)]


def mv(a, v):
    return [sum(a[i][k] * v[k] for k in range(3)) for i in range(3)]


def transpose(a):
    return [[a[j][i] for j in range(3)] for i in range(3)]


class Clip:
    """The bones of one FBX and their world positions per frame."""

    def __init__(self, path, fps=30):
        nodes = read(path)
        objects = next(n for n in nodes if n[0] == 'Objects')
        conns = next(n for n in nodes if n[0] == 'Connections')
        self.fps = fps
        self.models, curvenodes, curves = {}, {}, {}
        for o in objects[2]:
            if o[0] == 'Model':
                oid, name = o[1][0], o[1][1].split('\x00')[0]
                p = props70(o)
                self.models[oid] = {
                    'name': name, 't': list(p.get('Lcl Translation', [0, 0, 0])), 'r': list(p.get('Lcl Rotation', [0, 0, 0])),
                    'pre': list(p.get('PreRotation', [0, 0, 0])), 'post': list(p.get('PostRotation', [0, 0, 0])),
                    'parent': None, 'anim': {},
                }
            elif o[0] == 'AnimationCurveNode':
                curvenodes[o[1][0]] = {'kind': o[1][1].split('\x00')[0], 'target': None, 'prop': None, 'ch': {}}
            elif o[0] == 'AnimationCurve':
                kt = child(o, 'KeyTime'); kv = child(o, 'KeyValueFloat')
                curves[o[1][0]] = ([t / TICKS for t in kt[1][0]] if kt else [], kv[1][0] if kv else [])
        for c in conns[2]:
            if c[0] != 'C': continue
            kind, a, b = c[1][0], c[1][1], c[1][2]
            if kind == 'OO' and a in self.models and b in self.models: self.models[a]['parent'] = b
            elif kind == 'OP' and a in curvenodes and b in self.models:
                curvenodes[a]['target'] = b; curvenodes[a]['prop'] = c[1][3]
            elif kind == 'OP' and a in curves and b in curvenodes:
                curvenodes[b]['ch'][c[1][3]] = curves[a]
        for cn in curvenodes.values():
            if cn['target'] is None: continue
            prop = {'Lcl Translation': 't', 'Lcl Rotation': 'r'}.get(cn['prop'])
            if prop: self.models[cn['target']]['anim'][prop] = cn['ch']
        self.by_name = {m['name']: k for k, m in self.models.items()}
        times = [t for m in self.models.values() for ch in m['anim'].values() for (ts, _) in ch.values() for t in ts]
        self.t0, self.t1 = (min(times), max(times)) if times else (0.0, 0.0)

    @staticmethod
    def _sample(ch, axis, default, t):
        c = ch.get('d|' + axis)
        if not c or not c[0]: return default
        ts, vs = c
        if t <= ts[0]: return vs[0]
        if t >= ts[-1]: return vs[-1]
        lo, hi = 0, len(ts) - 1
        while hi - lo > 1:
            mid = (lo + hi) // 2
            if ts[mid] <= t: lo = mid
            else: hi = mid
        u = (t - ts[lo]) / max(1e-9, ts[hi] - ts[lo])
        return vs[lo] + (vs[hi] - vs[lo]) * u

    def world(self, name, t):
        """A bone's world position at time t (file units)."""
        chain, k = [], self.by_name[name]
        while k is not None:
            chain.append(k); k = self.models[k]['parent']
        R = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; P = [0.0, 0.0, 0.0]
        for k in reversed(chain):
            m = self.models[k]
            tr = [self._sample(m['anim'].get('t', {}), ax, m['t'][i], t) for i, ax in enumerate('XYZ')]
            rr = [self._sample(m['anim'].get('r', {}), ax, m['r'][i], t) for i, ax in enumerate('XYZ')]
            local = mm(mm(_rot(*m['pre']), _rot(*rr)), transpose(_rot(*m['post'])))
            P = [P[i] + v for i, v in enumerate(mv(R, tr))]
            R = mm(R, local)
        return P

    def frames(self):
        """The take's frame times (file frame 1 .. last: the clip as Unity plays it)."""
        n0 = int(round(self.t0 * self.fps)); n1 = int(round(self.t1 * self.fps))
        start = max(n0, 1)
        return [f / self.fps for f in range(start, n1 + 1)]


def speeds(clip, bone):
    ts = clip.frames()
    ps = [clip.world(bone, t) for t in ts]
    out = []
    for i in range(len(ps)):
        a, b = ps[max(0, i - 1)], ps[min(len(ps) - 1, i + 1)]
        dt = (min(len(ps) - 1, i + 1) - max(0, i - 1)) / clip.fps
        out.append(math.dist(a, b) / max(1e-9, dt))
    return out


def peaks(v, share=0.6, gap=6):
    """Local maxima above share of the largest, at least gap frames apart (the largest first kept)."""
    top = max(v) if v else 0
    cand = [i for i in range(1, len(v) - 1) if v[i] >= v[i - 1] and v[i] >= v[i + 1] and v[i] >= share * top]
    cand.sort(key=lambda i: -v[i])
    kept = []
    for i in cand:
        if all(abs(i - j) >= gap for j in kept): kept.append(i)
    return sorted(kept)


def hand_bones(clip):
    def find(*names):
        for n in names:
            if n in clip.by_name: return n
        for k in clip.by_name:
            low = k.lower()
            if all(p in low for p in names[0].lower().split('|')): return k
        return None
    return find('RightHand', 'mixamorig:RightHand', 'hand_r', 'Hand_R'), find('LeftHand', 'mixamorig:LeftHand', 'hand_l', 'Hand_L')


def events_for(path, name, side):
    """The beats a clip's sidecar should carry: {'impact': [...]} for a strike, {'release': [...]} for a throw."""
    kind = (side.get('kind') or '')
    strike = kind.startswith('A4 ') or 'strike' in kind or 'punch' in kind or 'slash' in kind or 'combo' in kind
    throw = kind.startswith('A7')
    if not (strike or throw): return {}
    if kind.startswith('A4/A5'): return {}   # (a block: no blow lands)
    clip = Clip(path, int(side.get('fps', 30)))
    right, left = hand_bones(clip)
    if right is None or left is None: return {}
    vr, vl = speeds(clip, right), speeds(clip, left)
    if throw:
        return {'release': [max(range(len(vr)), key=lambda i: vr[i])]}
    combo = 'combo' in kind or 'combination' in kind
    if combo:
        both = [max(a, b) for a, b in zip(vr, vl)]
        return {'impact': peaks(both, 0.7, 8)}
    v = vr if max(vr) >= max(vl) else vl
    return {'impact': [max(range(len(v)), key=lambda i: v[i])]}


if __name__ == '__main__':
    for p in sys.argv[1:]:
        c = Clip(p)
        r, l = hand_bones(c)
        vr, vl = speeds(c, r), speeds(c, l)
        n = os.path.splitext(os.path.basename(p))[0]
        print(f'{n}: {len(vr)} frames; R peak {max(range(len(vr)), key=lambda i: vr[i])}; L peak {max(range(len(vl)), key=lambda i: vl[i])}')
