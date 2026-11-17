"""Captured motion from ACCAD's Open Motion Project (BVH) -> one FBX per clip, as cmu2fbx.py makes them from CMU: the same
gait cutting (one stride, in place, its own surge and sway kept), seam loops, 30 fps keys, Mecanim bone names and a true
T-pose at frame 0. Used for the women's set (ACCAD Female1), which CMU lacks (docs/MOTION_ROOT_CAUSE.md R3, T2).

    blender -b --factory-startup --python tools/unity/motion/accad2fbx.py -- <accad bvh dir> <out dir> [clip,clip]

Gaits are ended (walks closed, jogs and runs open) and planted as cmu2fbx.py's (plant.py, motion v6).

ACCAD Female1's BVH rest pose is a world-aligned T-pose (Y up, facing +Z, arms along X), as CMU's ASF is, so its joint
rotations carry over unchanged. ACCAD Male1/Male2 keep MotionBuilder's local axes (their zero pose is not a T-pose): they
are re-solved onto a T-pose skeleton first (bvh_resolve.py; every joint stays where it was captured).

Licence: "Open Motion Project by ACCAD/The Ohio State University is licensed under a Creative Commons Attribution 3.0
Unported License" (CC BY 3.0): credit in CREDITS.md; used modified (cut, looped, resampled to 30 fps, retargeted).
"""
import bpy, json, math, os, sys
from mathutils import Quaternion, Vector, Matrix
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', 'kits'))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'qa', 'calibration'))
import cmu2fbx as C
import kitlib as K
import plant as PL
import skel

MECANIM = {'Hips': 'Hips', 'ToSpine': 'Spine', 'Spine': 'Chest', 'Spine1': 'UpperChest', 'Neck': 'Neck', 'Head': 'Head',
           'LeftShoulder': 'LeftShoulder', 'LeftArm': 'LeftUpperArm', 'LeftForeArm': 'LeftLowerArm', 'LeftHand': 'LeftHand',
           'RightShoulder': 'RightShoulder', 'RightArm': 'RightUpperArm', 'RightForeArm': 'RightLowerArm', 'RightHand': 'RightHand',
           'LeftUpLeg': 'LeftUpperLeg', 'LeftLeg': 'LeftLowerLeg', 'LeftFoot': 'LeftFoot', 'LeftToeBase': 'LeftToes',
           'RightUpLeg': 'RightUpperLeg', 'RightLeg': 'RightLowerLeg', 'RightFoot': 'RightFoot', 'RightToeBase': 'RightToes'}
UNIT = 0.01   # ACCAD's BVH are in centimetres
LICENCE = 'ACCAD Open Motion Project (Ohio State University), CC BY 3.0'

# Ranges in seconds of the take; sex as ACCAD records it in the take's name. `cycle` and `seam_share`: the loop cut each gait
# keeps (cmu2fbx.REFINE, SEAM: the choice whose loop passed clip_qa.py best; SF_REFINE / SF_SEAM override them for trials). Female1's BVH rest pose is a world-aligned
# T-pose; Male1/Male2's are not and are re-solved onto one (`resolve`: the subject's own Stand as the reference,
# bvh_resolve.py). Female1 has no steady jog (her runs speed up or slow down throughout; a cycle cut from them popped 7 cm)
# and no brisk walk (her fastest steady walking is 1.1-1.27 m/s): the women's jogs come from CMU 141 (cmu2fbx.py).
CLIPS = [
    # women (ACCAD Female1)
    {'name': 'walk_f', 'src': 'Female1_B02_WalkToStand', 'loop': 'gait', 'range': (0.0, 3.6), 'cycle': 'near', 'seam_share': 0.25},      # "walk (more swing at the hips) to stand": 0.96 m/s
    {'name': 'walk_f_b', 'src': 'Female1_B13_WalkTurnRight45', 'loop': 'gait', 'range': (5.4, 8.3), 'cycle': 'wide', 'seam_share': 0.12},  # the walk after the turn: ~1.13 m/s
    {'name': 'walk_f_n', 'src': 'Female1_B21_PutDownBoxToWalk', 'loop': 'gait', 'range': (7.4, 9.5)},  # the walk away from the box: ~1.22 m/s
    {'name': 'walk_f_long', 'src': 'Female1_B03_Walk1', 'loop': 'gait', 'cycle': 'off', 'seam_share': 0.25},                             # "walk with long steps (minimal sway at the hips)"
    # "run": 1.2 s, too short for a stride with a clean seam: its best half stride and that half's mirror image
    {'name': 'run_f', 'src': 'Female1_C03_Run', 'loop': 'gait', 'mirror': True},
    # her one quiet stretch with straight knees and a level head (K1 p98 7.1, H1 -4..+6): D2 "Wait" 34.5-38.5 s
    # every standing idle takes the knee-solve correction (straighten_knees: the straighter knee's p98 to 5°)
    {'name': 'idle_f', 'src': 'Female1_D2_Wait', 'loop': 'seam', 'range': (34.4, 38.6), 'seam': 1.0, 'knees': 5.0},
    # and "Stand" (K1 p98 7.3-7.7, H1 -3..-1), 3 s
    {'name': 'idle_f_c', 'src': 'Female1_A01_Stand', 'loop': 'seam', 'range': (0.1, 3.0), 'seam': 0.8, 'knees': 5.0},
    # men (ACCAD Male1, Male2: re-solved onto a T-pose)
    {'name': 'idle_m', 'src': 'Male2_A1_Stand', 'loop': 'seam', 'range': (0.2, 3.8), 'seam': 1.0, 'resolve': 'Male2_A1_Stand', 'knees': 5.0},
    {'name': 'idle_m_b', 'src': 'Male1_A1_Stand', 'loop': 'seam', 'range': (0.2, 4.9), 'seam': 1.0, 'resolve': 'Male1_A1_Stand', 'knees': 5.0},
    {'name': 'walk_d', 'src': 'Male1_B3_Walk', 'loop': 'gait', 'range': (0.4, 6.1), 'resolve': 'Male1_A1_Stand', 'cycle': 'off', 'seam_share': 0.12},       # 1.30 m/s
    {'name': 'walk_brisk_b', 'src': 'Male2_B3_Walk', 'loop': 'gait', 'resolve': 'Male2_A1_Stand', 'cycle': 'near', 'seam_share': 0.25},                      # 1.65 m/s
    {'name': 'run_c', 'src': 'Male2_C3_Run', 'loop': 'gait', 'resolve': 'Male2_A1_Stand', 'cycle': 'off', 'seam_share': 0.12},                              # ~3.7 m/s
]


def load_resolved(path, ref_path):
    """A take re-solved onto a T-pose skeleton (bvh_resolve.py), with the change of axes taken from the subject's own
    reference take when it has the same skeleton (else from the take itself)."""
    import numpy as np
    import bvh_resolve as BR
    joints, order, data, dt = skel.parse_bvh(open(path).read())
    rj, ro, rd, _ = skel.parse_bvh(open(ref_path).read())
    same = ro == order and all(np.allclose(np.asarray(rj[j]['offset'], float), np.asarray(joints[j]['offset'], float), atol=1e-3) for j in order if joints[j]['parent'])
    S = BR.axes_for(rj, ro, rd) if same else BR.axes_for(joints, order, data)
    new, local, root, _ = BR.resolve(joints, order, data, S)
    err = BR.check(joints, order, data, new, local, root)
    print(f'  re-solved {os.path.basename(path)} onto a T-pose ({"the reference" if same else "its own"} axes): joints within {err:.4f} cm of the capture')
    frames = []
    for f in range(len(data)):
        loc = {j: Matrix([list(r) for r in local[j][f]]).to_quaternion() for j in order}
        p = root[f]
        frames.append({'loc': loc, 'pos': Vector((p[0] * UNIT, p[1] * UNIT, p[2] * UNIT))})
    return new, order, frames, 1.0 / dt


def load(path):
    joints, order, data, dt = skel.parse_bvh(open(path).read())
    fps = 1.0 / dt
    frames = []
    col = 0
    cols = {}
    for j in order:
        cols[j] = (col, joints[j]['channels']); col += len(joints[j]['channels'])
    for row in data:
        loc, pos = {}, Vector((0, 0, 0))
        for j in order:
            c0, ch = cols[j]
            q = Quaternion()
            for k, c in enumerate(ch):
                v = row[c0 + k]
                if c.endswith('rotation'):
                    axis = {'X': (1, 0, 0), 'Y': (0, 1, 0), 'Z': (0, 0, 1)}[c[0]]
                    q = q @ Quaternion(axis, math.radians(v))     # intrinsic in the listed order
                elif c == 'Xposition': pos.x = v * UNIT
                elif c == 'Yposition': pos.y = v * UNIT
                elif c == 'Zposition': pos.z = v * UNIT
            loc[j] = q
        frames.append({'loc': loc, 'pos': pos})
    return joints, order, frames, fps


def world_feet(joints, order, fr):
    W, P = {}, {}
    for j in order:
        J = joints[j]
        if J['parent'] is None:
            W[j] = fr['loc'][j]; P[j] = fr['pos'].copy()
        else:
            pw = W[J['parent']]
            P[j] = P[J['parent']] + pw @ (Vector(J['offset']) * UNIT)
            W[j] = pw @ fr['loc'][j]
    # the feet's ends (toe joints) and hands and head, for matching moments (cmu2fbx.pose_key)
    key = C.pose_key(P['Hips'], [P['LeftToeBase'], P['RightToeBase'], P['LeftHand'], P['RightHand'], P['Head']])
    return P['LeftFoot'], P['RightFoot'], W['Hips'], key


def _fk(joints, order, fr):
    """World rotations and positions (metres) of every joint in one frame."""
    W, P = {}, {}
    for j in order:
        J = joints[j]
        if J['parent'] is None:
            W[j] = fr['loc'][j]; P[j] = fr['pos'].copy()
        else:
            pw = W[J['parent']]
            P[j] = P[J['parent']] + pw @ (Vector(J['offset']) * UNIT)
            W[j] = (pw @ fr['loc'][j]).normalized()
    return W, P


def _flexions(joints, order, frames):
    """Each frame's knee flexion (deg, the angle between thigh and shin) for both legs."""
    out = []
    for fr in frames:
        _, P = _fk(joints, order, fr)
        f = []
        for s in ('Left', 'Right'):
            t = P[s + 'Leg'] - P[s + 'UpLeg']; k = P[s + 'Foot'] - P[s + 'Leg']
            f.append(math.degrees(t.angle(k)) if t.length > 1e-6 and k.length > 1e-6 else 0.0)
        out.append(f)
    return out


def _p98(v):
    v = sorted(v); return v[min(len(v) - 1, max(0, round(0.98 * (len(v) - 1))))]


def straighten_knees(joints, order, frames, target=5.0):
    """The knee-solve correction for standing idles (docs/MOTION_ROOT_CAUSE.md §7, coordinator 2026-11-17): the captures'
    straighter knee reads 7-23° standing (calibration), where anatomy has 0-5° (Kendall 2005); the bend is the solve's (marker
    joint centres), not the actor's. (Straighter legs are longer, so with the feet kept the pelvis rises, by millimetres.) One correction for every standing idle: both knees' flexion scaled by one factor s (the
    knee's local rotation slerped towards straight) so the straighter knee's p98 is at most `target`; the feet kept where they
    were captured (each ankle's position and the foot's world rotation); the pelvis moved by the least distance that lets the
    straightened legs reach them (leg IK: each thigh swung by the shortest arc onto its ankle); nothing above the pelvis moves
    relative to it; the pelvis moves straight up by what the legs need, each knee's scale refined so its leg reaches its own
    ankle exactly. Returns the frames and the record of what was removed."""
    flex0 = _flexions(joints, order, frames)
    k1 = [min(a, b) for a, b in flex0]
    before = _p98(k1)
    if before <= target:
        return frames, {'applied': False, 'K1_p98_before': round(before, 2)}
    sides = ('Left', 'Right')

    def apply(sc):
        res, drops = [], []
        for fr in frames:
            W, P = _fk(joints, order, fr)
            loc = dict(fr['loc'])
            A = {sd: P[sd + 'Foot'].copy() for sd in sides}
            WF = {sd: W[sd + 'Foot'].copy() for sd in sides}
            qk = {sd: C.slerp(Quaternion(), fr['loc'][sd + 'Leg'], sc) for sd in sides}
            # the hip-to-ankle vector in the thigh's own frame, with the knee straightened
            vloc = {sd: Vector(joints[sd + 'Leg']['offset']) * UNIT + qk[sd] @ (Vector(joints[sd + 'Foot']['offset']) * UNIT) for sd in sides}
            # the pelvis moved straight up (or down) by the mean of what each straightened leg needs, then each knee's
            # scale refined so its own leg reaches its own ankle exactly (the knees stay within a hair of the common
            # scale; a pelvis moved by the least-norm step between two near-parallel legs slid sideways by centimetres)
            H = {sd: P[sd + 'UpLeg'] for sd in sides}
            need = []
            for sd in sides:
                v = H[sd] - A[sd]; dd = vloc[sd].length; hz = v.x * v.x + v.z * v.z
                need.append(math.sqrt(max(dd * dd - hz, 0.0)) - v.y)
            dp = Vector((0.0, sum(need) / 2.0, 0.0))
            for sd in sides:
                D = (H[sd] + dp - A[sd]).length
                lo, hi = 0.0, 1.0
                for _ in range(30):   # the knee's scale (0: straight, 1: as captured) that makes the leg exactly D long
                    mid = 0.5 * (lo + hi)
                    q = C.slerp(Quaternion(), fr['loc'][sd + 'Leg'], mid)
                    L = (Vector(joints[sd + 'Leg']['offset']) * UNIT + q @ (Vector(joints[sd + 'Foot']['offset']) * UNIT)).length
                    if L > D: lo = mid
                    else: hi = mid
                qk[sd] = C.slerp(Quaternion(), fr['loc'][sd + 'Leg'], 0.5 * (lo + hi))
                vloc[sd] = Vector(joints[sd + 'Leg']['offset']) * UNIT + qk[sd] @ (Vector(joints[sd + 'Foot']['offset']) * UNIT)
            Wh = W['Hips']
            for sd in sides:
                Wt = W[sd + 'UpLeg']
                cur = (Wt @ vloc[sd]); want = A[sd] - (H[sd] + dp)
                Wt2 = (cur.rotation_difference(want) @ Wt).normalized()
                parent = W[joints[sd + 'UpLeg']['parent']]
                loc[sd + 'UpLeg'] = (parent.inverted() @ Wt2).normalized()
                loc[sd + 'Leg'] = qk[sd]
                Ws2 = (Wt2 @ qk[sd]).normalized()
                loc[sd + 'Foot'] = (Ws2.inverted() @ WF[sd]).normalized()
            res.append({'loc': loc, 'pos': fr['pos'] + dp})
            drops.append(dp)
        return res, drops

    sc = min(1.0, target / before)
    for _ in range(6):
        out, drops = apply(sc)
        after = _p98([min(a, b) for a, b in _flexions(joints, order, out)])
        if after <= target + 1e-3: break
        sc *= (target - 0.05) / after
    flex1 = _flexions(joints, order, out)
    removed = [a0 - a1 for f0, f1 in zip(flex0, flex1) for a0, a1 in zip(f0, f1)]
    # the feet as captured (a check: the ankles' largest move, mm)
    moved = 0.0
    for fr0, fr1 in zip(frames, out):
        _, P0 = _fk(joints, order, fr0); _, P1 = _fk(joints, order, fr1)
        moved = max(moved, max((P0[sd + 'Foot'] - P1[sd + 'Foot']).length for sd in sides))
    rec = {'applied': True, 'method': 'both knees\' flexion scaled by s (local rotation slerped to straight); ankles and feet kept '
           'where captured; the pelvis moved by the least distance the straightened legs need (leg IK); nothing above it moves',
           'target_K1_p98_deg': target, 's': round(sc, 3), 'K1_p98_before': round(before, 2), 'K1_p98_after': round(after, 2),
           'removed_mean_deg': round(sum(removed) / len(removed), 2), 'removed_max_deg': round(max(removed), 2),
           'pelvis_moved_mean_cm': round(100 * sum(d.length for d in drops) / len(drops), 2),
           'pelvis_moved_max_cm': round(100 * max(d.length for d in drops), 2),
           'pelvis_raised_mean_cm': round(100 * sum(d.y for d in drops) / len(drops), 2),
           'ankles_moved_max_mm': round(1000 * moved, 3)}
    print(f"  knees: s {rec['s']}, K1 p98 {rec['K1_p98_before']} -> {rec['K1_p98_after']}, removed mean {rec['removed_mean_deg']} max {rec['removed_max_deg']} deg, "
          f"pelvis raised {rec['pelvis_raised_mean_cm']} cm (moved at most {rec['pelvis_moved_max_cm']}), ankles kept within {rec['ankles_moved_max_mm']} mm")
    if rec['pelvis_moved_max_cm'] > 3.0:
        raise SystemExit(f"knee correction: the pelvis had to move {rec['pelvis_moved_max_cm']} cm in a frame: the range holds more than standing")
    return out, rec


def _mirror_q(q):
    """A rotation reflected through the body's mid-plane (x -> -x): M R M."""
    return Quaternion((q.w, q.x, -q.y, -q.z))


def _swap(name):
    return name.replace('Left', '#').replace('Right', 'Left').replace('#', 'Right')


def build_mirrored(d, joints, order, frames, fps):
    """A full stride from a take too short to hold one with a clean seam (Female1 C03 Run, 1.2 s): the half stride whose end
    best matches the mirror image of its start (feet, hands, head relative to the root), followed by its own mirror image
    (left and right swapped, reflected through the mid-plane) and looped. The two joins are recorded (`joins`) and judged by
    the clip QA as the seam is. ACCAD Female1's skeleton is symmetric and its rest pose world-aligned, so a mirrored local
    rotation is M R M."""
    C.SRC_FPS = fps
    rows = []
    for fr in frames:
        lf, rf, rq, key = world_feet(joints, order, fr)
        loc = dict(fr['loc']); loc['root'] = loc.pop('Hips')
        rows.append({'loc': loc, 'pos': fr['pos'].copy(), 'feet': (lf, rf), 'rootq': rq, 'key': key})
    rows = C.canonical(rows, True)
    # at 30 fps a half stride of a run lands up to half a frame off its true length, and a foot in swing moves 15 cm in that
    # half frame: the take is first resampled to 120 fps (slerped) so the half is found to a quarter frame
    if fps < 100:
        k = 4; C.SRC_FPS = fps
        rows = [dict(r) for r in C.resample(rows, fps * k)]
        fps = fps * k; C.SRC_FPS = fps
    n = len(rows)
    # the mirror of a frame's key: feet, hands and head relative to the root, x negated, left and right swapped
    def mkey(k):
        v = [Vector(k[i:i + 3]) for i in range(0, len(k), 3)]
        v = [Vector((-p.x, p.y, p.z)) for p in v]
        return [c for p in (v[1], v[0], v[3], v[2], v[4]) for c in p]
    # keys were taken in the capture's heading; recompute them in the canonical one
    for r in rows:
        W, P = _fk(joints, order, {'loc': dict(r['loc'], Hips=r['loc']['root']), 'pos': r['pos']})
        r['key'] = C.pose_key(P['Hips'], [P['LeftToeBase'], P['RightToeBase'], P['LeftHand'], P['RightHand'], P['Head']])
    best = None
    for h in range(max(4, round(0.3 * fps)), round(0.6 * fps) + 1):
        for a in range(0, n - h - 1):
            k0 = mkey(rows[a]['key']); k1 = rows[a + h]['key']
            d0 = sum((x - y) ** 2 for x, y in zip(k0, k1))
            # and the velocities: the mirror of the start's velocity against the end's
            v0 = [x - y for x, y in zip(mkey(rows[a + 1]['key']), k0)]; v1 = [x - y for x, y in zip(rows[a + h + 1]['key'], k1)]
            c = d0 + sum((x - y) ** 2 for x, y in zip(v0, v1))
            if best is None or c < best[0]: best = (c, a, h)
    _, a, h = best
    half = rows[a:a + h]
    adv = half[-1]['pos'] - half[0]['pos'] + (rows[a + h]['pos'] - rows[a + h - 1]['pos'])   # the half stride's advance
    adv = Vector((0.0, 0.0, adv.z))
    mir = []
    for r in half:
        loc = {(_swap(k) if k != 'root' else k): _mirror_q(q) for k, q in r['loc'].items()}
        p = r['pos'] - half[0]['pos']
        mir.append({'loc': loc, 'pos': half[0]['pos'] + Vector((-p.x, p.y, p.z)) + adv})
    cyc = [{'loc': r['loc'], 'pos': r['pos'].copy()} for r in half] + mir
    P = len(cyc)
    stride = 2 * adv.z
    speed_src = stride / (P / fps)
    for j, r in enumerate(cyc):
        r['pos'] = Vector((r['pos'].x - half[0]['pos'].x, r['pos'].y, r['pos'].z - half[0]['pos'].z - speed_src * j / fps))
    mx = sum(r['pos'].x for r in cyc) / P; mz = sum(r['pos'].z for r in cyc) / P
    for r in cyc: r['pos'] = Vector((r['pos'].x - mx, r['pos'].y, r['pos'].z - mz))
    out = C.resample_loop(cyc, C.OUT_FPS)
    speed = stride / ((len(out) - 1) / C.OUT_FPS)
    d['_joins'] = [0, round(h * (len(out) - 1) / P)]
    print(f'  {d["name"]}: half stride frames {a}..{a + h - 1} of {n} mirrored into a stride of {stride:.2f} m over {P / fps:.3f} s ({len(out)} frames), join cost {best[0]:.4f}')
    hip = (abs(joints['LeftUpLeg']['offset'][1]) + abs(joints['LeftLeg']['offset'][1]) + abs(joints['LeftFoot']['offset'][1])) * UNIT
    return out, speed, hip


class Legs:
    """The legs of an ACCAD skeleton for plant.py (cmu2fbx.Legs): a joint's world rotation places its child joint."""
    SIDES = ('Left', 'Right')
    JOINTS = ('LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot')
    CHAIN = {'Left': ('LeftUpLeg', 'LeftLeg', 'LeftFoot'), 'Right': ('RightUpLeg', 'RightLeg', 'RightFoot')}

    def __init__(self, joints, order): self.joints, self.order = joints, order

    def fk(self, row):
        loc = dict(row['loc']); loc[self.order[0]] = loc['root']
        W, P = _fk(self.joints, self.order, {'loc': loc, 'pos': row['pos']})
        out = {}
        for s in self.SIDES:
            par = self.joints[s + 'UpLeg']['parent']
            out[s] = {'H': P[s + 'UpLeg'], 'K': P[s + 'Leg'], 'A': P[s + 'Foot'], 'B': P[s + 'ToeBase'], 'Wp': W[par],
                      'Wt': W[s + 'UpLeg'], 'Ws': W[s + 'Leg'], 'Wf': W[s + 'Foot']}
        return out

    def set(self, row, s, Wt, Ws, Wf, Wp):
        row['loc'][s + 'UpLeg'] = (Wp.inverted() @ Wt).normalized()
        row['loc'][s + 'Leg'] = (Wt.inverted() @ Ws).normalized()
        row['loc'][s + 'Foot'] = (Ws.inverted() @ Wf).normalized()


def _continuous(frames):
    prev = {}
    for fr in frames:
        for k, q in fr['loc'].items():
            p = prev.get(k)
            if p is not None and p.dot(q) < 0.0:
                q = Quaternion((-q.w, -q.x, -q.y, -q.z)); fr['loc'][k] = q
            prev[k] = q
    return frames


def build(d, joints, order, frames, fps):
    C.SRC_FPS = fps
    n = len(frames)
    f0 = min(n - 2, round(d['range'][0] * fps)) if d.get('range') else 0
    f1 = min(n, round(d['range'][1] * fps)) if d.get('range') else n
    rows = []
    for f in range(f0, f1):
        fr = frames[f]
        lf, rf, rq, key = world_feet(joints, order, fr)
        loc = dict(fr['loc']); loc['root'] = loc.pop('Hips')
        rows.append({'loc': loc, 'pos': fr['pos'].copy(), 'feet': (lf, rf), 'rootq': rq, 'key': key})
    a0, b0 = rows[0]['pos'], rows[-1]['pos']
    travel = Vector((b0.x - a0.x, 0.0, b0.z - a0.z))
    travel = travel.normalized() if travel.length > 1e-6 else Vector((0.0, 0.0, 1.0))
    rows = C.canonical(rows, d.get('loop') == 'gait')
    speed = 0.0
    if d.get('loop') == 'gait':
        # as cmu2fbx.build_clip: one stride along its own heading, in place with its surge and sway kept
        feet_z = [(r['feet'][0] - r['feet'][1]).dot(travel) for r in rows]
        P, start, seam = C.gait_cycle(feet_z)
        P, start = C.refine_cycle([r['key'] for r in rows], P, start, seam)
        a, b = rows[start]['pos'].copy(), rows[start + P]['pos'].copy()
        dv = Vector((b.x - a.x, 0.0, b.z - a.z))
        speed = dv.length / (P / fps)
        Y2 = Quaternion((0, 1, 0), -math.atan2(dv.x, dv.z))
        for r in rows:
            p = Y2 @ Vector((r['pos'].x - a.x, 0.0, r['pos'].z - a.z))
            r['pos'] = Vector((p.x, r['pos'].y, p.z))
            r['loc']['root'] = (Y2 @ r['loc']['root']).normalized()
        for j, r in enumerate(rows):
            r['pos'] = Vector((r['pos'].x, r['pos'].y, r['pos'].z - speed * (j - start) / fps))
        cyc = C.cut_loop(rows, start, P, seam)
        mx = sum(r['pos'].x for r in cyc) / len(cyc); mz = sum(r['pos'].z for r in cyc) / len(cyc)
        for r in cyc: r['pos'] = Vector((r['pos'].x - mx, r['pos'].y, r['pos'].z - mz))
        if not C.closed_loop(d, dv.length / (P / fps)):   # open loop (motion v5, a jog or a run): fixed-step keys, the speed the stance foot runs back at
            out = C.resample(cyc, C.OUT_FPS); speed = dv.length / (P / fps); d['_open'] = True
        else:   # (a walk, v4: cmu2fbx.closed_loop) the stride resampled to whole keys, closed
            out = C.resample_loop(cyc, C.OUT_FPS)
            speed = dv.length / ((len(out) - 1) / C.OUT_FPS)     # the pace at which the loop as played lays one stride (closed loop)
        if C.PLANT:   # motion v6: the stance feet planted, the speed from the planted stride (plant.py)
            d['_speed_root'] = speed
            out, speed, d['_plant'] = PL.plant_loop(out, Legs(joints, order), speed, C.OUT_FPS, P / fps, d['name'])
        print(f'  {d["name"]}: stride {dv.length:.2f} m over {P / fps:.3f} s ({120 / (P / fps):.0f} steps/min; {len(out)} frames), off the trial line by {math.degrees(math.atan2(dv.x, dv.z)):.1f} deg')
    elif d.get('loop') == 'seam':
        seam = round(d.get('seam', 1.0) * fps); P = len(rows) - seam
        P = C.refine_seam([r['key'] for r in rows], P, seam, round(0.5 * fps))
        cyc = C.cut_loop(rows, 0, P, seam)
        mx = sum(r['pos'].x for r in cyc) / len(cyc); mz = sum(r['pos'].z for r in cyc) / len(cyc)
        for r in cyc: r['pos'] = Vector((r['pos'].x - mx, r['pos'].y, r['pos'].z - mz))
        out = C.resample(cyc, C.OUT_FPS) if C.OPEN else C.resample_loop(cyc, C.OUT_FPS)
    else:
        mx = sum(r['pos'].x for r in rows) / len(rows); mz = sum(r['pos'].z for r in rows) / len(rows)
        for r in rows: r['pos'] = Vector((r['pos'].x - mx, r['pos'].y, r['pos'].z - mz))
        out = C.resample(rows, C.OUT_FPS)
    hip = (abs(joints['LeftUpLeg']['offset'][1]) + abs(joints['LeftLeg']['offset'][1]) + abs(joints['LeftFoot']['offset'][1])) * UNIT
    return out, speed, hip


def write_bvh(path, joints, order, rows):
    lines = ['HIERARCHY']

    def joint(j, depth):
        J = joints[j]; ind = '  ' * depth
        off = Vector(J['offset']) * UNIT if J['parent'] else Vector((0, 0, 0))
        lines.append(f'{ind}{"ROOT" if J["parent"] is None else "JOINT"} {MECANIM[j]}')
        lines.append(f'{ind}{{')
        lines.append(f'{ind}  OFFSET {off.x:.6f} {off.y:.6f} {off.z:.6f}')
        lines.append(f'{ind}  CHANNELS {"6 Xposition Yposition Zposition " if J["parent"] is None else "3 "}Zrotation Xrotation Yrotation')
        if J['children']:
            for c in J['children']: joint(c, depth + 1)
        else:
            e = Vector(J['end'] if J['end'] is not None else (0, 0, 0)) * UNIT
            lines.append(f'{ind}  End Site'); lines.append(f'{ind}  {{'); lines.append(f'{ind}    OFFSET {e.x:.6f} {e.y:.6f} {e.z:.6f}'); lines.append(f'{ind}  }}')
        lines.append(f'{ind}}}')
    joint(order[0], 0)
    lines.append('MOTION'); lines.append(f'Frames: {len(rows)}'); lines.append(f'Frame Time: {1.0 / C.OUT_FPS:.6f}')
    prev = {}
    for r in rows:
        vals = [f'{r["pos"].x:.5f} {r["pos"].y:.5f} {r["pos"].z:.5f}']
        for j in order:
            q = r['loc']['root' if j == order[0] else j]
            # BVH "Z X Y" intrinsic = Blender's extrinsic 'YXZ' (cmu2fbx.write_bvh); the angles nearest the last frame's
            e = q.to_euler('YXZ', prev[j]) if j in prev else q.to_euler('YXZ')
            prev[j] = e
            vals.append(f'{math.degrees(e.z):.4f} {math.degrees(e.x):.4f} {math.degrees(e.y):.4f}')
        lines.append(' '.join(vals))
    with open(path, 'w') as f: f.write('\n'.join(lines) + '\n')


def export(d, joints, order, rows, speed, hip, out_dir, src_fps):
    K.reset()
    bvh = os.path.join(out_dir, '_tmp', d['name'] + '.bvh'); os.makedirs(os.path.dirname(bvh), exist_ok=True)
    write_bvh(bvh, joints, order, rows)
    bpy.ops.import_anim.bvh(filepath=bvh, axis_forward='-Z', axis_up='Y', global_scale=1.0, frame_start=1, use_fps_scale=False, update_scene_fps=False, update_scene_duration=True, rotate_mode='QUATERNION')
    sc = bpy.context.scene
    sc.render.fps = C.OUT_FPS; sc.render.fps_base = 1.0
    sc.frame_start = 1; sc.frame_end = len(rows)
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    arm.name = d['name']
    if arm.animation_data and arm.animation_data.action: arm.animation_data.action.name = d['name']
    C.t_pose_key(arm, sc)
    d['_inbetween'] = C.straighten_inbetweens(arm, len(rows))
    path = os.path.join(out_dir, d['name'] + '.fbx')
    bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); bpy.context.view_layer.objects.active = arm
    bpy.ops.export_scene.fbx(filepath=path, use_selection=True, apply_scale_options='FBX_SCALE_ALL', axis_forward='-Z', axis_up='Y', object_types={'ARMATURE'},
                             add_leaf_bones=False, bake_anim=True, bake_anim_use_all_bones=True, bake_anim_use_nla_strips=False, bake_anim_use_all_actions=False,
                             bake_anim_force_startend_keying=True, bake_anim_step=1.0, bake_anim_simplify_factor=0.0, path_mode='STRIP')
    K.write_model_meta(path, f'{C.REL}/{d["name"]}.fbx')
    with open(os.path.join(out_dir, d['name'] + '.json'), 'w') as f:
        json.dump({'name': d['name'], 'src': 'ACCAD ' + d['src'], 'loop': bool(d.get('loop')), 'speed': round(speed, 3), 'root': False, 'hip': round(hip, 4),
                   'fps': C.OUT_FPS, 'frames': len(rows), 'src_fps': round(src_fps, 2), 'sex': 'f' if d['src'].startswith('Female') else 'm',
                   'set': d.get('set', 'f' if d['src'].startswith('Female') else 'm'), 'licence': LICENCE,
                   'resolved': bool(d.get('resolve')), 'cycle': C.REFINE,
                   'seam_share': C.SEAM if d.get('loop') == 'gait' and not d.get('mirror') else None, 'range': list(d['range']) if d.get('range') else None,
                   'knee_correction': d.get('_knees'), 'mirrored': bool(d.get('mirror')), 'joins': d.get('_joins'),
                   'closed': bool(d.get('loop')) and not (d.get('_open') if d.get('loop') == 'gait' and not d.get('mirror') else C.OPEN),
                   'flips_repaired': d.get('_flips') or None, 'inbetween': d.get('_inbetween') or None,
                   'speed_root': round(d['_speed_root'], 3) if d.get('_speed_root') else None, 'plant': PL.summary(d.get('_plant'))}, f)
    C.verify_inbetweens(path)
    print(f'clip {d["name"]}: {len(rows)} frames, speed {speed:.2f} m/s')


def main():
    args = sys.argv[sys.argv.index('--') + 1:]
    src, out = args[0], args[1]
    only = set(args[2].split(',')) if len(args) > 2 else None
    os.makedirs(out, exist_ok=True)
    for d in CLIPS:
        if only and d['name'] not in only: continue
        path = os.path.join(src, d['src'] + '.bvh')
        if not os.path.exists(path): print('  skip', d['name'], '(no bvh)'); continue
        C.REFINE = os.environ.get('SF_REFINE') or d.get('cycle', 'near')
        C.SEAM = float(os.environ.get('SF_SEAM') or d.get('seam_share', 0.12))
        joints, order, frames, fps = load_resolved(path, os.path.join(src, d['resolve'] + '.bvh')) if d.get('resolve') else load(path)
        frames = _continuous(frames)
        d['_flips'] = {}
        C.repair_flips(frames, fps, d['_flips'])
        if d['_flips']: print(f"  {d['name']}: solver flips repaired: {d['_flips']}")
        if d.get('knees'):
            f0 = min(len(frames) - 2, round(d['range'][0] * fps)) if d.get('range') else 0
            f1 = min(len(frames), round(d['range'][1] * fps)) if d.get('range') else len(frames)
            fixed, d['_knees'] = straighten_knees(joints, order, frames[f0:f1], d['knees'])
            frames = frames[:f0] + fixed + frames[f1:]
        rows, speed, hip = build_mirrored(d, joints, order, frames, fps) if d.get('mirror') else build(d, joints, order, frames, fps)
        export(d, joints, order, rows, speed, hip, out, fps)
    print('accad motion: done')


if __name__ == '__main__':
    main()
