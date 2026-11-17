"""Re-solve a BVH whose joints keep MotionBuilder's local axes onto a T-pose skeleton (ACCAD Male1/Male2), so that its
zero pose is a T-pose (arms out along X, legs straight down, facing +Z, Y up) as cmu2fbx.py's and accad2fbx.py's clips
need (Unity builds the clip's Humanoid avatar from that pose). Pure numpy; used by accad2fbx.py inside Blender and testable
outside it.

The motion is not changed: every joint keeps its captured world rotation up to a constant change of its own axes,
W_j(t) = R_j(t) S_j, and each child's offset is re-expressed in those axes, r_c = S_j^T o_c, so every joint lands where it
was captured (the forward kinematics agree to rounding; `check()` measures it). S_j is chosen per joint, never fitted to
the motion: it maps the T-pose direction of the joint's bone (d: out along X for the shoulders and arms, down for the legs, the standing
foot's own slope for the feet) to the bone's own axis in the joint's local frame (a: the offset to its first child), and a
second T-pose axis s to the local axis b that points that way when the actor stands at rest (the legs' and feet's left; the
shoulders' up; each arm's outward side, which a hanging arm turns to the T-pose's up); the trunk and head take the frame
their own joint has standing at rest (its up and its left). Both averaged over a reference take of the same skeleton (the
subject's own "Stand").
"""
import numpy as np


def _rx(a):
    c, s = np.cos(a), np.sin(a); o, z = np.ones_like(a), np.zeros_like(a)
    return np.moveaxis(np.array([[o, z, z], [z, c, -s], [z, s, c]]), [0, 1], [-2, -1])


def _ry(a):
    c, s = np.cos(a), np.sin(a); o, z = np.ones_like(a), np.zeros_like(a)
    return np.moveaxis(np.array([[c, z, s], [z, o, z], [-s, z, c]]), [0, 1], [-2, -1])


def _rz(a):
    c, s = np.cos(a), np.sin(a); o, z = np.ones_like(a), np.zeros_like(a)
    return np.moveaxis(np.array([[c, -s, z], [s, c, z], [z, z, o]]), [0, 1], [-2, -1])


AX = {'X': _rx, 'Y': _ry, 'Z': _rz}


def fk(joints, order, data):
    """World rotations (N,3,3) and positions (N,3, file units) of every joint, and of each end site ('<joint>_End')."""
    n = len(data); col = 0; R, P = {}, {}
    for j in order:
        J = joints[j]; L = np.tile(np.eye(3), (n, 1, 1)); pos = np.zeros((n, 3))
        for k, c in enumerate(J['channels']):
            v = data[:, col + k]
            if c.endswith('rotation'): L = L @ AX[c[0]](np.radians(v))
            elif c == 'Xposition': pos[:, 0] = v
            elif c == 'Yposition': pos[:, 1] = v
            elif c == 'Zposition': pos[:, 2] = v
        col += len(J['channels'])
        if J['parent'] is None:
            R[j] = L; P[j] = pos
        else:
            p = J['parent']; R[j] = R[p] @ L; P[j] = P[p] + np.einsum('nij,j->ni', R[p], np.asarray(J['offset'], float))
        if J['end'] is not None: P[j + '_End'] = P[j] + np.einsum('nij,j->ni', R[j], np.asarray(J['end'], float))
    return R, P


def _unit(v):
    return v / max(np.linalg.norm(v), 1e-12)


def _frame(x, y):
    x = _unit(np.asarray(x, float)); y = np.asarray(y, float) - np.dot(y, x) * x; y = _unit(y)
    return np.stack([x, y, np.cross(x, y)], 1)


def _rotations24():
    out = []
    for perm in ((0, 1, 2), (0, 2, 1), (1, 0, 2), (1, 2, 0), (2, 0, 1), (2, 1, 0)):
        for sg in ((1, 1, 1), (1, 1, -1), (1, -1, 1), (1, -1, -1), (-1, 1, 1), (-1, 1, -1), (-1, -1, 1), (-1, -1, -1)):
            X = np.zeros((3, 3))
            for i, (j, g) in enumerate(zip(perm, sg)): X[j, i] = g
            if np.linalg.det(X) > 0: out.append(X)
    return out


def _primary(J):
    kids = J['children']
    for pref in ('ToSpine', 'Spine', 'Spine1', 'Neck', 'Head'):
        if pref in kids: return pref
    return kids[0] if kids else None


def axes_for(joints, order, data):
    """The constant change of axes S_j of every joint, from a reference take of the skeleton (the actor standing)."""
    R, P = fk(joints, order, data)
    hipL, hipR, shL, shR = P['LeftUpLeg'], P['RightUpLeg'], P['LeftArm'], P['RightArm']
    def flat_unit(v):
        v = v.copy(); v[:, 1] = 0; return v / np.maximum(np.linalg.norm(v, axis=1, keepdims=True), 1e-9)
    left_low, left_up = flat_unit(hipL - hipR), flat_unit(shL - shR)
    up = np.tile([0.0, 1.0, 0.0], (len(data), 1))
    # the feet's own slope when standing (ankle to toe, toe to its end): the T-pose keeps it
    def slope(a, b):
        v = P[b] - P[a]; return float(np.median(np.degrees(np.arctan2(-v[:, 1], np.hypot(v[:, 0], v[:, 2])))))
    S = {}
    for j in order:
        J = joints[j]
        c = _primary(J)
        a = _unit(np.asarray(joints[c]['offset'] if c else J['end'], float))
        side = 1.0 if j.startswith('Left') else (-1.0 if j.startswith('Right') else 0.0)
        name = j.replace('Left', '').replace('Right', '')
        if name in ('Shoulder',):
            d, s, w = np.array([side, 0, 0.0]), np.array([0, 1, 0.0]), up
        elif name in ('Arm', 'ForeArm', 'Hand'):
            d, s, w = np.array([side, 0, 0.0]), np.array([0, 1, 0.0]), left_up * side      # a hanging arm's outward side -> the T-pose's up
        elif name in ('UpLeg', 'Leg'):
            d, s, w = np.array([0, -1, 0.0]), np.array([1, 0, 0.0]), left_low
        elif name in ('Foot', 'ToeBase'):
            nxt = (c if c else j + '_End')
            ph = np.radians(slope(j, nxt))
            d, s, w = np.array([0, -np.sin(ph), np.cos(ph)]), np.array([1, 0, 0.0]), left_low
        elif name == 'Head':
            # the head keeps its own joint's axes, relabelled to the nearest of the 24 axis permutations (as the calibration
            # reads it, tools/qa/calibration/skel.py): the head's level is the capture's, not the take's average
            fw = np.cross(left_up, up)
            T = np.stack([left_up, up, fw], axis=2)
            A = np.einsum('nji,njk->ik', R[j], T)
            S[j] = max(_rotations24(), key=lambda X: np.trace(X.T @ A))
            continue
        else:
            # the trunk (Hips, ToSpine, Spine, Spine1, Neck, Head): the frame the actor's own joint has standing at
            # rest, its up and its left (not its bone: ACCAD's lumbar joint sits behind the hips, its bone points back), so
            # the T-pose keeps the trunk's own standing shape, as CMU's rest pose does
            lw = left_low if j in ('Hips', 'ToSpine', 'Spine') else left_up
            u = np.mean(np.einsum('nji,nj->ni', R[j], up), 0); l = np.mean(np.einsum('nji,nj->ni', R[j], lw), 0)
            S[j] = _frame(u, l) @ _frame(np.array([0, 1, 0.0]), np.array([1, 0, 0.0])).T
            continue
        b = np.mean(np.einsum('nji,nj->ni', R[j], w), 0)     # the local axis that points along w at rest
        S[j] = _frame(a, b) @ _frame(d, s).T
    return S


def resolve(joints, order, data, S):
    """The take on the T-pose skeleton: new joint offsets (file units) and per-frame local rotations (N,3,3), root positions."""
    R, P = fk(joints, order, data)
    W = {j: R[j] @ S[j] for j in order}
    new = {}
    for j in order:
        J = joints[j]
        nj = dict(J)
        if J['parent'] is not None: nj['offset'] = S[J['parent']].T @ np.asarray(J['offset'], float)
        if J['end'] is not None: nj['end'] = S[j].T @ np.asarray(J['end'], float)
        new[j] = nj
    local = {}
    for j in order:
        p = joints[j]['parent']
        local[j] = W[j] if p is None else np.einsum('nji,njk->nik', W[p], W[j])
    return new, local, P[order[0]], (R, P, W)


def check(joints, order, data, new, local, root):
    """The largest distance (file units) between a joint as captured and as the re-solved skeleton puts it, over the take."""
    _, P0 = fk(joints, order, data)
    n = len(data); W, P = {}, {}
    for j in order:
        p = new[j]['parent']
        if p is None: W[j] = local[j]; P[j] = root
        else: W[j] = W[p] @ local[j]; P[j] = P[p] + np.einsum('nij,j->ni', W[p], new[j]['offset'])
    return max(float(np.abs(P[j] - P0[j]).max()) for j in order)


def tpose(new, order):
    """Joint positions of the re-solved skeleton at zero rotation (its T-pose), for a look."""
    P = {}
    for j in order:
        p = new[j]['parent']
        P[j] = np.zeros(3) if p is None else P[p] + new[j]['offset']
    return P
