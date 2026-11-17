"""Source skeletons for the motion gate's calibration (docs/qa/motion_calibration.md): CMU ASF/AMC and BVH (ACCAD) read
into world joint positions and rotations per frame, in metres, Y up, on the actor's own skeleton at the trial's real
frame rate. Pure numpy; no Blender. Joint names are Unity Humanoid's (the gate's `HumanBodyBones`).

    m = load_amc(asf, amc, fps)      # CMU: fps from the database's listing (77 and others were captured at 60)
    m = load_bvh(bvh)                # ACCAD: the file's own frame time
    m.P['LeftUpperArm']              # (N, 3) world positions
    m.R['Head']                      # (N, 3, 3) world rotations (rest = identity: the rest pose faces +Z, left is +X)
"""
import math
import numpy as np

UNIT_CMU = 0.0254 / 0.45     # CMU's FAQ: ASF/AMC lengths times (1/0.45)*2.54/100 are metres


def rot_x(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])


def rot_y(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def rot_z(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


def _batch(axis, a):
    """(N,) radians -> (N,3,3) rotations about one axis."""
    c, s = np.cos(a), np.sin(a)
    o, z = np.ones_like(a), np.zeros_like(a)
    if axis == 'x': m = [[o, z, z], [z, c, -s], [z, s, c]]
    elif axis == 'y': m = [[c, z, s], [z, o, z], [-s, z, c]]
    else: m = [[c, -s, z], [s, c, z], [z, z, o]]
    return np.moveaxis(np.array(m), [0, 1], [-2, -1])


class Motion:
    """A trial on its actor's skeleton: P[joint] (N,3) m, R[joint] (N,3,3), fps, and the actor's facts."""
    def __init__(self, P, R, fps, meta):
        self.P, self.R, self.fps, self.meta = P, R, float(fps), dict(meta)
        self.n = len(next(iter(P.values())))

    def slice(self, t0=None, t1=None):
        a = 0 if t0 is None else max(0, int(round(t0 * self.fps)))
        b = self.n if t1 is None else min(self.n, int(round(t1 * self.fps)))
        return Motion({k: v[a:b] for k, v in self.P.items()}, {k: v[a:b] for k, v in self.R.items()}, self.fps, self.meta)

    def resample(self, fps):
        """Linear in positions, nearest-sample rotations re-orthonormalised by a polar step: what a 30 fps clip played at 60 Hz
        carries (the converter's keys, Unity's interpolation between them)."""
        T = (self.n - 1) / self.fps
        t = np.arange(0.0, T + 1e-9, 1.0 / fps)
        x = t * self.fps
        i0 = np.clip(np.floor(x).astype(int), 0, self.n - 1); i1 = np.clip(i0 + 1, 0, self.n - 1); f = (x - i0)[:, None]
        P = {k: v[i0] * (1 - f) + v[i1] * f for k, v in self.P.items()}
        R = {}
        for k, v in self.R.items():
            M = v[i0] * (1 - f[:, :, None]) + v[i1] * f[:, :, None]
            u, _, vt = np.linalg.svd(M)
            R[k] = u @ vt
        return Motion(P, R, fps, self.meta)

    def stature(self):
        """The actor's standing height estimated from the skeleton (m): the head joint's height over the ankle in the rest
        pose, plus the ankle's height over the sole and the head joint to the vertex (Drillis & Contini's segment ratios: the
        ankle 0.039 H, the head from C1 to the vertex 0.130 H less the neck part, taken as 0.11 H). An estimate (+/- 4 cm)."""
        return self.meta.get('stature_est')


# --- CMU ASF/AMC ---------------------------------------------------------------------------------------------------------------
CMU_JOINT = {   # Humanoid joint -> (CMU bone, 'head' | 'tail') whose end is that joint
    'Hips': ('root', 'head'), 'Spine': ('lowerback', 'head'), 'Chest': ('upperback', 'head'), 'UpperChest': ('thorax', 'head'),
    'Neck': ('lowerneck', 'head'), 'Head': ('head', 'head'), 'HeadTop': ('head', 'tail'),
    'LeftShoulder': ('lclavicle', 'head'), 'LeftUpperArm': ('lhumerus', 'head'), 'LeftLowerArm': ('lradius', 'head'), 'LeftHand': ('lradius', 'tail'),
    'RightShoulder': ('rclavicle', 'head'), 'RightUpperArm': ('rhumerus', 'head'), 'RightLowerArm': ('rradius', 'head'), 'RightHand': ('rradius', 'tail'),
    'LeftUpperLeg': ('lfemur', 'head'), 'LeftLowerLeg': ('ltibia', 'head'), 'LeftFoot': ('lfoot', 'head'), 'LeftToes': ('ltoes', 'head'), 'LeftToeTip': ('ltoes', 'tail'),
    'RightUpperLeg': ('rfemur', 'head'), 'RightLowerLeg': ('rtibia', 'head'), 'RightFoot': ('rfoot', 'head'), 'RightToes': ('rtoes', 'head'), 'RightToeTip': ('rtoes', 'tail'),
}
CMU_ROT = {'Hips': 'root', 'Chest': 'upperback', 'UpperChest': 'thorax', 'Head': 'head', 'LeftFoot': 'lfoot', 'RightFoot': 'rfoot',
           'LeftHand': 'lhand', 'RightHand': 'rhand'}


def euler_xyz(x, y, z):
    """ASF/AMC euler (radians, applied X then Y then Z about fixed axes): Rz Ry Rx (batched when arrays)."""
    if np.ndim(x) == 0: return rot_z(z) @ rot_y(y) @ rot_x(x)
    return _batch('z', z) @ _batch('y', y) @ _batch('x', x)


def parse_asf(text):
    lines = [l.strip() for l in text.splitlines()]
    lines = [l for l in lines if l and not l.startswith('#')]
    bones = {'root': {'name': 'root', 'direction': np.zeros(3), 'length': 0.0, 'axis': (0, 0, 0), 'dof': ['tx', 'ty', 'tz', 'rx', 'ry', 'rz'], 'parent': None, 'children': []}}
    i, section = 0, ''
    while i < len(lines):
        l = lines[i]
        if l.startswith(':'):
            section = l.split()[0]; i += 1; continue
        if section == ':root':
            p = l.split()
            if p[0] == 'order': bones['root']['dof'] = [s.lower() for s in p[1:]]
            if p[0] == 'axis' and len(p) > 1: bones['root']['axis_order'] = p[1]
            i += 1; continue
        if section == ':bonedata':
            if l == 'begin':
                b = {'direction': np.zeros(3), 'length': 0.0, 'axis': (0, 0, 0), 'dof': [], 'children': [], 'parent': None}
                i += 1
                while lines[i] != 'end':
                    p = lines[i].split()
                    if p[0] == 'name': b['name'] = p[1]
                    elif p[0] == 'direction': b['direction'] = np.array([float(x) for x in p[1:4]])
                    elif p[0] == 'length': b['length'] = float(p[1])
                    elif p[0] == 'axis': b['axis'] = tuple(math.radians(float(x)) for x in p[1:4])
                    elif p[0] == 'dof': b['dof'] = [s.lower() for s in p[1:]]
                    i += 1
                bones[b['name']] = b
            i += 1; continue
        if section == ':hierarchy':
            if l not in ('begin', 'end'):
                p = l.split()
                for c in p[1:]:
                    bones[c]['parent'] = p[0]; bones[p[0]]['children'].append(c)
            i += 1; continue
        i += 1
    for b in bones.values():
        b['C'] = euler_xyz(*b['axis']); b['Cinv'] = b['C'].T
    return bones


def parse_amc(text):
    frames, cur = [], None
    for raw in text.splitlines():
        l = raw.strip()
        if not l or l.startswith('#') or l.startswith(':'): continue
        if l.isdigit():
            cur = {}; frames.append(cur); continue
        p = l.split(); cur[p[0]] = [float(x) for x in p[1:]]
    return frames


def load_amc(asf_path, amc_path, fps, meta=None):
    bones = parse_asf(open(asf_path).read())
    frames = parse_amc(open(amc_path).read())
    n = len(frames)
    # per bone, its dof values per frame
    local = {}
    root_pos = np.zeros((n, 3))
    for name, b in bones.items():
        vals = {d: np.zeros(n) for d in ('rx', 'ry', 'rz', 'tx', 'ty', 'tz')}
        for f, fr in enumerate(frames):
            v = fr.get(name)
            if v is None: continue
            for k, d in enumerate(b['dof']):
                if k < len(v): vals[d][f] = v[k]
        R = euler_xyz(np.radians(vals['rx']), np.radians(vals['ry']), np.radians(vals['rz']))
        local[name] = b['C'][None] @ R @ b['Cinv'][None]
        if name == 'root': root_pos = np.stack([vals['tx'], vals['ty'], vals['tz']], 1) * UNIT_CMU
    worldR, head, tail = {}, {}, {}

    def visit(name, parentR, h):
        b = bones[name]
        Rw = local[name] if parentR is None else parentR @ local[name]
        worldR[name] = Rw
        t = h + (Rw @ (b['direction'] * b['length'] * UNIT_CMU))
        head[name], tail[name] = h, t
        for c in b['children']: visit(c, Rw, t)
    visit('root', None, root_pos)
    P = {j: (head if e == 'head' else tail)[b] for j, (b, e) in CMU_JOINT.items() if b in head}
    R = {j: worldR[b] for j, b in CMU_ROT.items() if b in worldR}
    # rest-pose geometry for the stature estimate: the head joint over the ankle, legs straight
    def chain(names): return sum(bones[x]['length'] * UNIT_CMU * abs(bones[x]['direction'][1]) for x in names)
    leg = chain(['lhipjoint', 'lfemur', 'ltibia'])
    trunk = chain(['lowerback', 'upperback', 'thorax', 'lowerneck', 'upperneck'])
    m = dict(meta or {})
    m.setdefault('format', 'cmu')
    m['bone_m'] = {k: round(bones[k]['length'] * UNIT_CMU, 4) for k in ('lhumerus', 'lradius', 'lfemur', 'ltibia', 'lclavicle', 'lhipjoint')}
    m['rest_head_over_ankle'] = round(leg + trunk, 4)
    return _finish(Motion(P, R, fps, m))


# --- BVH -----------------------------------------------------------------------------------------------------------------------
BVH_MAP = {   # ACCAD (MotionBuilder) names -> Humanoid
    'Hips': 'Hips', 'ToSpine': 'Spine0', 'Spine': 'Spine', 'Spine1': 'Chest', 'Neck': 'Neck', 'Head': 'Head',
    'LeftShoulder': 'LeftShoulder', 'LeftArm': 'LeftUpperArm', 'LeftForeArm': 'LeftLowerArm', 'LeftHand': 'LeftHand',
    'RightShoulder': 'RightShoulder', 'RightArm': 'RightUpperArm', 'RightForeArm': 'RightLowerArm', 'RightHand': 'RightHand',
    'LeftUpLeg': 'LeftUpperLeg', 'LeftLeg': 'LeftLowerLeg', 'LeftFoot': 'LeftFoot', 'LeftToeBase': 'LeftToes',
    'RightUpLeg': 'RightUpperLeg', 'RightLeg': 'RightLowerLeg', 'RightFoot': 'RightFoot', 'RightToeBase': 'RightToes',
}


def parse_bvh(text):
    tok = text.split()
    i = 0
    joints, stack, order = {}, [], []
    cur = None
    while tok[i] != 'MOTION':
        t = tok[i]
        if t in ('ROOT', 'JOINT'):
            name = tok[i + 1]
            joints[name] = {'name': name, 'parent': stack[-1] if stack else None, 'children': [], 'offset': None, 'channels': [], 'end': None}
            if stack: joints[stack[-1]]['children'].append(name)
            cur = name; order.append(name); i += 2; continue
        if t == 'End':
            cur = ('end', stack[-1]); i += 2; continue
        if t == '{':
            stack.append(cur if isinstance(cur, str) else '__end__'); i += 1; continue
        if t == '}':
            stack.pop(); i += 1; continue
        if t == 'OFFSET':
            off = np.array([float(x) for x in tok[i + 1:i + 4]])
            top = stack[-1]
            if top == '__end__': joints[stack[-2]]['end'] = off
            else: joints[top]['offset'] = off
            i += 4; continue
        if t == 'CHANNELS':
            k = int(tok[i + 1]); joints[stack[-1]]['channels'] = tok[i + 2:i + 2 + k]; i += 2 + k; continue
        i += 1
    i += 1
    assert tok[i] == 'Frames:'; n = int(tok[i + 1]); i += 2
    assert tok[i] == 'Frame' and tok[i + 1] == 'Time:'; dt = float(tok[i + 2]); i += 3
    nch = sum(len(joints[j]['channels']) for j in order)
    data = np.array(tok[i:i + n * nch], dtype=float).reshape(n, nch)
    return joints, order, data, dt


def load_bvh(path, meta=None, unit=0.01, fps=None):
    joints, order, data, dt = parse_bvh(open(path).read())
    n = len(data)
    col = 0
    worldR, pos = {}, {}
    for j in order:
        J = joints[j]
        ch = J['channels']
        vals = {c: data[:, col + k] for k, c in enumerate(ch)}
        col += len(ch)
        R = np.tile(np.eye(3), (n, 1, 1))
        for c in ch:   # intrinsic in the listed order: R = R1 R2 R3
            if c.endswith('rotation'): R = R @ _batch(c[0].lower(), np.radians(vals[c]))
        if J['parent'] is None:
            p = np.stack([vals.get('Xposition', np.zeros(n)), vals.get('Yposition', np.zeros(n)), vals.get('Zposition', np.zeros(n))], 1) * unit
            worldR[j] = R; pos[j] = p
        else:
            pr = worldR[J['parent']]
            worldR[j] = pr @ R
            pos[j] = pos[J['parent']] + (pr @ (J['offset'] * unit))
        if J['end'] is not None:
            pos[j + '_End'] = pos[j] + (worldR[j] @ (J['end'] * unit))
    P = {BVH_MAP[k]: v for k, v in pos.items() if k in BVH_MAP}
    if 'LeftToeBase_End' in pos: P['LeftToeTip'] = pos['LeftToeBase_End']
    if 'RightToeBase_End' in pos: P['RightToeTip'] = pos['RightToeBase_End']
    if 'Head_End' in pos: P['HeadTop'] = pos['Head_End']
    R = {BVH_MAP[k]: v for k, v in worldR.items() if k in BVH_MAP and BVH_MAP[k] in ('Hips', 'Chest', 'Head', 'LeftFoot', 'RightFoot', 'LeftHand', 'RightHand')}
    R = {k: v @ _axes(v, P)[None] for k, v in R.items()}
    m = dict(meta or {})
    m.setdefault('format', 'bvh')
    m['file_fps'] = round(1.0 / dt, 3)
    L = lambda a: float(np.linalg.norm(joints[a]['offset'])) * unit
    m['bone_m'] = {'lhumerus': round(L('LeftForeArm'), 4), 'lradius': round(L('LeftHand'), 4), 'lfemur': round(L('LeftLeg'), 4), 'ltibia': round(L('LeftFoot'), 4)}
    leg = abs(joints['LeftUpLeg']['offset'][1]) + abs(joints['LeftLeg']['offset'][1]) + abs(joints['LeftFoot']['offset'][1])
    trunk = sum(abs(joints[x]['offset'][1]) for x in ('Spine', 'Spine1', 'Neck', 'Head') if x in joints)
    trunk += abs(joints['ToSpine']['offset'][1]) if 'ToSpine' in joints else 0
    m['rest_head_over_ankle'] = round((leg + trunk) * unit, 4)
    return _finish(Motion(P, R, fps or 1.0 / dt, m))


def _rotations24():
    out = []
    for perm in ((0, 1, 2), (0, 2, 1), (1, 0, 2), (1, 2, 0), (2, 0, 1), (2, 1, 0)):
        for sg in ((1, 1, 1), (1, 1, -1), (1, -1, 1), (1, -1, -1), (-1, 1, 1), (-1, 1, -1), (-1, -1, 1), (-1, -1, -1)):
            S = np.zeros((3, 3))
            for i, (j, g) in enumerate(zip(perm, sg)): S[j, i] = g
            if np.linalg.det(S) > 0: out.append(S)
    return out


def _axes(R, P):
    """A BVH whose joints keep MotionBuilder's local axes (ACCAD Male1/Male2: the spine along local X) has no world-aligned
    rest pose, so a joint's rotation does not say where its front is. The joint's own axes are relabelled (one of the 24
    axis permutations, never a fitted angle, so every real tilt is kept) to the frame that best matches, over the whole
    take, the body's: left (+X at rest), up (+Y) and forward (+Z, where the feet point). ACCAD Female1 and CMU need none."""
    fw = (P['LeftToes'] - P['LeftFoot']) + (P['RightToes'] - P['RightFoot'])
    fw[:, 1] = 0; fw /= np.maximum(np.linalg.norm(fw, axis=1, keepdims=True), 1e-9)
    up = np.tile([0.0, 1.0, 0.0], (len(fw), 1))
    lt = np.cross(up, fw)
    T = np.stack([lt, up, fw], axis=2)               # columns: left, up, forward
    A = np.einsum('nji,njk->ik', R, T)              # sum over frames of R^T T
    return max(_rotations24(), key=lambda S: np.trace(S.T @ A))


def _finish(m):
    """The stature estimate (Drillis & Contini 1966 segment ratios: ankle height 0.039 H; the head joint (C1) to the vertex
    ~0.11 H): H = (head joint over the ankle) / (1 - 0.039 - 0.11)."""
    m.meta['stature_est'] = round(m.meta['rest_head_over_ankle'] / (1 - 0.039 - 0.11), 3)
    return m
