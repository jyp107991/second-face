"""Combat clip set v4 (docs/COMBAT_ANIMATION_STANDARD.md §4): every job of combat_v4_jobs.py made through the motion converters'
fixed pipeline, one FBX + .fbx.meta + json per clip, for Unity's Humanoid.

    blender -b --factory-startup --python tools/unity/motion/combat_v4.py -- <plan.json> <out dir> [name,name]

The pipeline, for every clip (captured or built):
  1. the source take at its true rate (CMU's C3D header rates, ACCAD's and 100STYLE's BVH frame times), each joint's
     quaternions given one sign, solver flips repaired (cmu2fbx.repair_flips), cut, turned to its facing, in place or with
     its travel (combat2fbx.build); gaits cut to one stride and planted (cmu2fbx / accad2fbx, plant.py);
  2. the weight-bearing feet planted (G4): each stance foot's contact point, the heel and then the ball once it is down,
     held still on the ground by two-bone leg IK, the foot's captured turn kept (a pivot on the ball turns about the held
     ball), the hold eased out over 3 keys after toe-off; clips G4 exempts (falls, get-ups, crawls, lying) are left as captured;
  3. the weapon's hands by IK where the state holds one (G4: WG1 the weapon on the main hand, WG2 the off hand on grip_off):
     the weapon's frame from the clip (the mimed hands' line, the shoulder pocket, a ready hold made for the actor's own
     arms as Core's CombatMotion.PlaceHold makes it for every body) and the reference weapon's points (staged weapon
     sidecars); both hands' palms put on their grips with the grips' palm frames (Core CombatMotion.Grip);
  4. a built clip's layers (reload hand paths, a directional hit's flinch, raised hands, a strike's blade line along the
     captured blow's own arc, a crouched gait lowered by leg IK), bounded by the evidence its json cites;
  5. a left-handed capture mirrored to the right hand where the job says so;
  6. the T-pose bind at frame 0 (cmu2fbx.t_pose_key), in-between bones under convention D (cmu2fbx.straighten_inbetweens:
     Neck2 and 100STYLE's Chest3 held at their rest bend, the wrist twist's turn put into the Hand), FBX at 30 fps, a
     .fbx.meta that stores no avatar configuration (kitlib.write_model_meta, as motion v6.1's), the json with the explicit
     Humanoid mapping (the Hand is LeftHand/RightHand, the twist bones in-between), the events, the IK targets per key and
     the runtime layers' parameters; the written FBX and .meta checked (cmu2fbx.verify_inbetweens).
Licences: CMU (free for all uses, may not be resold as data); ACCAD Open Motion Project (CC BY 3.0); 100STYLE (CC BY 4.0,
"The 100STYLE Dataset - Ian Mason"). Credits: the v4 README.
"""
import bpy, json, math, os, sys
from mathutils import Matrix, Quaternion, Vector
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', 'kits'))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'qa', 'calibration'))
import numpy as np
import cmu2fbx as C
import accad2fbx as A
import combat2fbx as CF
import plant as PL
import style100 as S
import kitlib as K
import combat_v4_jobs as J

REL = 'Assets/SecondFace/Combat/Motion'
WEAPONS = '/home/user/second-face-staging/combat/weapons'
UP, FWD, LEFT = Vector((0.0, 0.0, 1.0)), Vector((0.0, -1.0, 0.0)), Vector((1.0, 0.0, 0.0))   # Blender's world after the BVH import
# the front the build's world-fixed choices take (a knee's pole, the pistol's line): FWD, the file's +Z, for a clip Unity
# re-bases on its first key; for a clip written in its take's frame (combat v4.6), the frame's front, the file's -Z
# (stance_continuity.TAKE_FRONT: what Unity's Original basis puts on the root's +Z). Set per clip by make().
FRONT = FWD.copy()
RIGHT = -LEFT
NB, AB = Vector((0.0, 0.0, -1.0)), Vector((0.0, -1.0, 0.0))   # the palm's normal and across (little to index) at the T-pose bind
PALM_F, PALM_N = 0.075, 0.02     # the palm's centre from the wrist joint: along the fingers, toward the palm (m)
CF.RATE60 |= {'33', '34'}        # CMU 33/34: 60 fps by their C3D headers and the index
A.MECANIM['Chest3'] = 'Chest3'   # 100STYLE's third spine joint, an in-between bone (style100.py)
STYLE_RENAME = {'Chest': 'ToSpine', 'Chest2': 'Spine', 'Chest4': 'Spine1', 'LeftCollar': 'LeftShoulder', 'LeftShoulder': 'LeftArm',
                'LeftElbow': 'LeftForeArm', 'LeftWrist': 'LeftHand', 'LeftHip': 'LeftUpLeg', 'LeftKnee': 'LeftLeg', 'LeftAnkle': 'LeftFoot',
                'LeftToe': 'LeftToeBase', 'RightCollar': 'RightShoulder', 'RightShoulder': 'RightArm', 'RightElbow': 'RightForeArm',
                'RightWrist': 'RightHand', 'RightHip': 'RightUpLeg', 'RightKnee': 'RightLeg', 'RightAnkle': 'RightFoot', 'RightToe': 'RightToeBase'}
GRIPS = {   # Core CombatMotion.Grip: the palm's (across, normal) as directions of the weapon's frame (r right, u up, f forward)
    'PistolGrip': ('u', '-r'), 'HammerGrip': ('f', '-r'), 'ForeEnd': ('f', 'u'), 'OffHammer': ('f', 'r'), 'PistolSupport': ('u', 'r')}
LONG = ('rifle_auto', 'rifle_bolt', 'shotgun_sawn')
HOLDS = {   # Core CombatMotion's ready holds: (pitch°, across°, grip in shares of the main arm's reach: right, up, ahead)
    'LongGunReady': (40.0, 65.0, (-0.34, -0.36, 0.34)), 'LongGunCrouched': (25.0, 60.0, (-0.34, -0.30, 0.42)),
    'ClubReady': (-60.0, -20.0, (-0.25, -0.48, 0.40)),
    # the pistol at the compressed ready (S1b: two hands, the gun in at the chest, the muzzle a little down; elbows down)
    'PistolReady': (15.0, 0.0, (-0.26, -0.30, 0.36)),
    # a reload's hold: the gun brought up and in toward the eyes (S5)
    'LongGunReload': (10.0, 35.0, (-0.30, -0.26, 0.42)), 'PistolReload': (20.0, 12.0, (-0.26, -0.20, 0.34))}
PISTOL_SUPPORT_AT = (-0.032, -0.018, -0.012)   # Core CombatMotion.PistolSupportAt (weapon frame, m)


def weapon(model):
    j = json.load(open(os.path.join(WEAPONS, model, model + '.json')))
    return {k: tuple(v) for k, v in j['points_unity'].items()}


def main_grip(model): return 'PistolGrip' if model in ('pistol', 'revolver') or model in LONG else 'HammerGrip'


def off_grip(model): return 'ForeEnd' if model in LONG else ('PistolSupport' if model in ('pistol', 'revolver') else 'OffHammer')


# ------------------------------------------------------------------------------------------------------------------- sources
def load_style(path):
    """A 100STYLE BVH read as accad2fbx reads ACCAD's, its joints renamed to ACCAD's (Chest3 kept: an in-between bone)."""
    joints, order, frames, fps = A.load(path)
    ren = lambda n: STYLE_RENAME.get(n, n)
    J2 = {}
    for n, jd in joints.items():
        jd = dict(jd); jd['name'] = ren(n); jd['parent'] = ren(jd['parent']) if jd['parent'] else None
        jd['children'] = [ren(c) for c in jd['children']]; J2[ren(n)] = jd
    order = [ren(n) for n in order]
    for fr in frames: fr['loc'] = {ren(k): q for k, q in fr['loc'].items()}
    return J2, order, frames, fps


def style_take(d):
    path = os.path.join(J.STYLE_DIR, d['src'] + '.bvh')
    joints, order, frames, fps = load_style(path)
    frames = A._continuous(frames)
    C.repair_flips(frames, fps, d['_flips'])
    C.SRC_FPS = fps
    f0, f1 = CF._cut(len(frames), fps, d.get('range'))
    rows, pts = [], []
    for fr in frames[f0:f1]:
        W, P = A._fk(joints, order, fr)
        _, _, rq, key = A.world_feet(joints, order, fr)
        loc = dict(fr['loc']); loc['root'] = loc.pop('Hips')
        rows.append({'loc': loc, 'pos': fr['pos'].copy(), 'rootq': rq, 'key': key})
        pts.append({'L': P['LeftHand'], 'R': P['RightHand'], 'chest': P['Spine1']})
    hip = sum(abs(joints[x]['offset'][1]) for x in ('LeftUpLeg', 'LeftLeg', 'LeftFoot')) * A.UNIT
    meta = dict(src='100STYLE ' + d['src'], src_fps=round(fps, 2), sex='u', sex_source='not recorded (100STYLE: one actor, 182 cm)',
                licence=S.LICENCE, source='https://www.ianxmason.com/100style/ (' + d['src'] + '.bvh)', resolved=False)
    write = lambda p, rows_: A.write_bvh(p, joints, order, rows_)
    return rows, pts, fps, hip, 0.0, meta, write, len(frames)


def take(d):
    d['_flips'] = {}
    if d['db'] == 'cmu':
        t = CF.cmu_take(d, J.CMU_DIRS)
        subj = d['src'].split('_')[0]
        if t and d.get('sex'): t[5]['sex'], t[5]['sex_source'] = d['sex'], d.get('sex_source')
        elif t and subj in J.LABEL: t[5]['sex'], t[5]['sex_source'] = J.LABEL[subj]
        return t
    if d['db'] == 'accad':
        return CF.accad_take(d, J.ACCAD_DIRS)
    return style_take(d)


def gait_rows(d):
    """A gait's loop: cut to one stride, in place, planted (cmu2fbx.build_clip / accad2fbx.build); returns rows, speed, hip,
    meta and the BVH writer."""
    d['_flips'] = {}
    C.REFINE = d.get('cycle', 'near'); C.SEAM = float(d.get('seam_share', 0.12))
    if d['db'] == 'cmu':
        subj = d['src'].split('_')[0]
        asf, amc = J.find_cmu(d['src'])
        C.CMU = os.path.dirname(os.path.dirname(amc))
        if not os.path.exists(os.path.join(C.CMU, subj, subj + '.asf')):
            raise SystemExit(f'{d["name"]}: the ASF must sit beside the AMC ({asf})')
        C.SRC_FPS = J.cmu_fps(d['src'])
        dd = dict(d); dd.pop('range', None) if not d.get('range') else None
        bones, rows, speed, hip = C.build_clip(dd)
        d.update({k: v for k, v in dd.items() if k.startswith('_')})
        sex, why = J.LABEL.get(subj, ('u', 'not recorded'))
        meta = dict(src='CMU ' + d['src'], src_fps=C.SRC_FPS, sex=sex, sex_source=why, licence=CF.LIC_CMU,
                    source=f"http://mocap.cs.cmu.edu/search.php?subjectnumber={int(subj)} (trial {d['src']})")
        return rows, speed, hip, meta, (lambda p, r: C.write_bvh(p, bones, r)), C.SRC_FPS
    if d['db'] == 'accad':
        path = J.find_bvh(d['src']); subject = d['src'].split('_')[0]
        if subject.startswith('Male'):
            joints, order, frames, fps = A.load_resolved(path, J.find_bvh(subject + '_A1_Stand'))
        else:
            joints, order, frames, fps = A.load(path)
        meta = dict(src='ACCAD ' + d['src'], src_fps=round(fps, 2), sex='f' if subject.startswith('Female') else 'm',
                    sex_source='ACCAD names its subjects by sex (' + subject + ')', licence=CF.LIC_ACCAD,
                    source='https://accad.osu.edu/research/motion-lab/mocap-system-and-data (' + subject + '_bvh.zip: ' + d['src'] + '.bvh)')
    else:
        joints, order, frames, fps = load_style(os.path.join(J.STYLE_DIR, d['src'] + '.bvh'))
        meta = dict(src='100STYLE ' + d['src'], src_fps=round(fps, 2), sex='u', sex_source='not recorded (100STYLE: one actor, 182 cm)',
                    licence=S.LICENCE, source='https://www.ianxmason.com/100style/ (' + d['src'] + '.bvh)')
    frames = A._continuous(frames)
    C.repair_flips(frames, fps, d['_flips'])
    dd = dict(d)
    if not d.get('range'): dd.pop('range', None)
    rows, speed, hip = A.build(dd, joints, order, frames, fps)
    d.update({k: v for k, v in dd.items() if k.startswith('_')})
    return rows, speed, hip, meta, (lambda p, r: A.write_bvh(p, joints, order, r)), fps


# ------------------------------------------------------------------------------------------------------------- the armature
class Rig:
    """The imported armature, posed key by key from rows of matrix_basis (the action detached), in Blender's world."""

    def __init__(self, arm):
        self.arm = arm; self.M = arm.matrix_world.copy(); self.Mi = self.M.inverted()
        self.pb = arm.pose.bones
        self.bind = {b.name: (self.M @ b.matrix_local).to_quaternion() for b in arm.data.bones}
        self.order = [b.name for b in arm.data.bones]   # parents before children

    def has(self, n): return n in self.pb

    def update(self): bpy.context.view_layer.update()

    def pose(self, row):
        for pb in self.pb:
            loc, q = row[pb.name]
            pb.matrix_basis = Matrix.Translation(loc) @ q.to_matrix().to_4x4()
        self.update()

    def capture(self):
        return {pb.name: (pb.matrix_basis.to_translation(), pb.matrix_basis.to_quaternion().normalized()) for pb in self.pb}

    def head(self, n): return self.M @ self.pb[n].head
    def wrot(self, n): return (self.M @ self.pb[n].matrix).to_quaternion()
    def rel(self, n): return self.wrot(n) @ self.bind[n].inverted()

    def turn(self, n, q, pivot):
        pb = self.pb[n]; W = self.M @ pb.matrix
        pb.matrix = self.Mi @ (Matrix.Translation(pivot) @ q.to_matrix().to_4x4() @ Matrix.Translation(-pivot) @ W)
        self.update()

    def set_wrot(self, n, R):
        pb = self.pb[n]; h = self.M @ pb.head
        pb.matrix = self.Mi @ (Matrix.Translation(h) @ R.to_matrix().to_4x4())
        self.update()

    def wrist(self, side): return side + 'WristTwist' if self.has(side + 'WristTwist') else side + 'Hand'

    def palm(self, side):
        fb = Vector((1.0, 0.0, 0.0)) if side == 'Left' else Vector((-1.0, 0.0, 0.0))
        return self.head(self.wrist(side)) + self.rel(side + 'Hand') @ (fb * PALM_F + NB * PALM_N)

    def palm_frame(self, side):
        R = self.rel(side + 'Hand'); return R @ NB, R @ AB

    def reach(self, side):
        a = (self.head(side + 'LowerArm') - self.head(side + 'UpperArm')).length
        b = (self.head(self.wrist(side)) - self.head(side + 'LowerArm')).length
        return a + b + PALM_F

    def two_bone(self, up, lo, end, T, pole=None):
        """Put joint `end` at T: `up` swung so the middle joint lies in the plane of the pole (default: where it is), then
        `lo` turned onto T. Returns how far T lies beyond reach (m, 0 when reached)."""
        S_, E, W = self.head(up), self.head(lo), self.head(end)
        a, b = (E - S_).length, (W - E).length
        d0 = (T - S_).length
        d = min(max(d0, abs(a - b) + 1e-4), a + b - 1e-4)
        u = (T - S_).normalized()
        pv = (pole if pole is not None else (E - S_))
        w = pv - u * pv.dot(u)
        if w.length < 1e-6: w = (E - S_) - u * (E - S_).dot(u)
        if w.length < 1e-6: w = u.orthogonal()
        v = w.normalized()
        ca = max(-1.0, min(1.0, (a * a + d * d - b * b) / (2 * a * d)))
        E2 = S_ + a * (ca * u + math.sqrt(max(0.0, 1 - ca * ca)) * v)
        self.turn(up, (E - S_).rotation_difference(E2 - S_), S_)
        E, W = self.head(lo), self.head(end)
        self.turn(lo, (W - E).rotation_difference(S_ + u * d - E), E)
        return max(0.0, d0 - (a + b))

    def hand_rot(self, side, n, a):
        """The Hand bone's world rotation that gives its palm the normal n and the across a."""
        n = n.normalized(); a = (a - n * a.dot(n)).normalized()
        Mt = Matrix((n, a, n.cross(a))).transposed(); Mb = Matrix((NB, AB, NB.cross(AB))).transposed()
        return (Mt @ Mb.transposed()).to_quaternion() @ self.bind[side + 'Hand']

    def wrist_for(self, side, P, n, a):
        """Where the wrist joint must be for the palm's centre on P with the palm frame (n, a)."""
        Rrel = self.hand_rot(side, n, a) @ self.bind[side + 'Hand'].inverted()
        fb = Vector((1.0, 0.0, 0.0)) if side == 'Left' else Vector((-1.0, 0.0, 0.0))
        return P - Rrel @ (fb * PALM_F + NB * PALM_N)

    def arm_len(self, side):
        return (self.head(side + 'LowerArm') - self.head(side + 'UpperArm')).length + (self.head(self.wrist(side)) - self.head(side + 'LowerArm')).length

    def put_palm(self, side, P, n, a, pole=None, w=1.0, warm=False):
        """The palm's centre on P with the palm frame (n, a), by the arm (two-bone IK) and the hand; w < 1 blends from the pose.
        warm: an arm the IK drives wholly starts from its own solution at the key before (the minimal turns then stay small
        from key to key: started from a hanging arm each key, a forearm that had to turn round 155° twisted either way)."""
        if not hasattr(self, 'warm'): self.warm = {}
        if warm and side in self.warm:
            for bn, mb in self.warm[side].items(): self.pb[bn].matrix_basis = mb
            self.update()
        R = self.hand_rot(side, n, a)
        Rrel = R @ self.bind[side + 'Hand'].inverted()
        fb = Vector((1.0, 0.0, 0.0)) if side == 'Left' else Vector((-1.0, 0.0, 0.0))
        if w < 1.0:
            P = self.palm(side).lerp(P, w)
            R = self.wrot(side + 'Hand').slerp(R, w) if self.wrot(side + 'Hand').dot(R) >= 0 else self.wrot(side + 'Hand').slerp(-R, w)
            Rrel = R @ self.bind[side + 'Hand'].inverted()
        T = P - Rrel @ (fb * PALM_F + NB * PALM_N)
        miss = self.two_bone(side + 'UpperArm', side + 'LowerArm', self.wrist(side), T, pole)
        self.set_wrot(side + 'Hand', R)
        if warm: self.warm[side] = {bn: self.pb[bn].matrix_basis.copy() for bn in (side + 'UpperArm', side + 'LowerArm')}
        return miss

    def put_palm_local(self, side, P, local, pole=None, passes=3):
        """The palm on P with the hand held at `local` (its rotation relative to the forearm's, from the bind): the wrist
        kept as the forearm carries it, re-solved as the forearm moves."""
        miss = 0.0
        for _ in range(passes):
            R = (self.rel(side + 'LowerArm') @ local) @ self.bind[side + 'Hand']
            Rrel = R @ self.bind[side + 'Hand'].inverted()
            miss = self.put_palm(side, P, Rrel @ NB, Rrel @ AB, pole, warm=True)
        return miss

    def hand_local(self, side, R=None):
        """The hand's rotation relative to the forearm's (both from the bind): its world rotation R (default: as posed)."""
        R = R if R is not None else self.wrot(side + 'Hand')
        return self.rel(side + 'LowerArm').inverted() @ (R @ self.bind[side + 'Hand'].inverted())

    def body_frame(self):
        """The shoulders' frame (Core CombatMotion.ReadyHold): origin the main (right) shoulder joint, right along the
        shoulders to the main side, up, ahead (Blender's world vectors)."""
        sr, sl = self.head('RightUpperArm'), self.head('LeftUpperArm')
        right = sr - sl; right = (right - UP * right.dot(UP)).normalized()
        ahead = UP.cross(right).normalized()
        return sr, sl, right, UP.copy(), ahead


def wvec(frame, v):
    """A (right, up, ahead) triple of components to Blender's world, in a frame (origin, right, up, ahead)."""
    o, r, u, a = frame
    return r * v[0] + u * v[1] + a * v[2]


def hold_turn(pitch, across, v):
    """Core CombatMotion.HoldTurn: a weapon-frame direction (right, up, ahead) turned into the shoulders' frame."""
    p, a = math.radians(pitch), -math.radians(across)
    y1 = math.cos(p) * v[1] - math.sin(p) * v[2]; z1 = math.sin(p) * v[1] + math.cos(p) * v[2]
    return (math.cos(a) * v[0] + math.sin(a) * z1, y1, -math.sin(a) * v[0] + math.cos(a) * z1)


def wpoint(W, p):
    """A weapon point (Unity weapon frame: right, up, forward) to the world, W = (origin, f, u)."""
    o, f, u = W; r = f.cross(u)
    return o + r * p[0] + u * p[1] + f * p[2]


def grip_frame(W, grip):
    o, f, u = W; r = f.cross(u)
    d = {'f': f, 'u': u, 'r': r, '-r': -r}
    a, n = GRIPS[grip]
    return d[n], d[a]


# ----------------------------------------------------------------------------------------------------------------- the ops
def sample(arm, n):
    sc = bpy.context.scene; rows = []
    for f in range(1, n + 1):
        sc.frame_set(f)
        rows.append({pb.name: (pb.matrix_basis.to_translation(), pb.matrix_basis.to_quaternion().normalized()) for pb in arm.pose.bones})
    arm.animation_data.action = None
    return rows


def write_action(arm, rows, name):
    act = bpy.data.actions.new(name); arm.animation_data_create(); arm.animation_data.action = act
    for pb in arm.pose.bones: pb.rotation_mode = 'QUATERNION'
    prev = {}
    for i, r in enumerate(rows):
        for pb in arm.pose.bones:
            loc, q = r[pb.name]
            if pb.name in prev and prev[pb.name].dot(q) < 0: q = -q
            prev[pb.name] = q
            pb.location = loc; pb.rotation_quaternion = q
            pb.keyframe_insert('location', frame=i + 1); pb.keyframe_insert('rotation_quaternion', frame=i + 1)
    for fc in act.fcurves:
        for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'


def to_file(v): return np.array([v.x, v.z, -v.y])
def from_file(a): return Vector((float(a[0]), float(-a[2]), float(a[1])))
def rot_file(q):
    B2F = np.array([[1, 0, 0], [0, 0, 1], [0, -1, 0]], float)
    return B2F @ np.array(q.to_matrix(), float) @ B2F.T


STILL_CM, STILL_MS = 2.5, 0.30   # a weight-bearing key: the lower sole point within 2.5 cm of its floor and the contact point slower than 0.3 m/s


def still_stances(heel, ball, fps, fl, min_keys=3):
    """A one-shot's weight-bearing stances: runs of at least `min_keys` keys whose lower sole point is on the ground (within
    STILL_CM of its floor) and whose contact point (the lower of heel and ball) moves under STILL_MS over the ground. A foot
    gliding low and fast (a boxer's step-in, a slide into a crouch) is stepping, not bearing weight (G4: a stance change
    steps); gaits keep plant.stances (their feet reach the floor still moving)."""
    h = np.minimum(heel[:, 1] - fl[0], ball[:, 1] - fl[1]) * 100
    lowball = (ball[:, 1] - fl[1]) < (heel[:, 1] - fl[0])
    v = np.zeros(len(h))
    for k in range(1, len(h)):
        p = ball if lowball[k] else heel
        v[k] = np.linalg.norm((p[k] - p[k - 1])[[0, 2]]) * fps
    v[0] = v[1] if len(v) > 1 else 0.0
    on = (h < STILL_CM) & (v < STILL_MS)
    out, i, n = [], 0, len(h)
    while i < n:
        if not on[i]: i += 1; continue
        j = i
        while j < n and on[j]: j += 1
        if j - i >= min_keys: out.append((i, j - 1))
        i = j
    return out


def plant(rig, rows, fps, skip=None):
    """G4: each weight-bearing foot's contact point held still (module docstring, step 2). Returns the record."""
    n = len(rows)
    an = {s: [] for s in ('Left', 'Right')}; ba = {s: [] for s in an}; Rf = {s: [] for s in an}
    for r in rows:
        rig.pose(r)
        for s in an:
            an[s].append(to_file(rig.head(s + 'Foot'))); ba[s].append(to_file(rig.head(s + 'Toes'))); Rf[s].append(rot_file(rig.wrot(s + 'Foot')))
    tgt = {s: [None] * n for s in an}; piv = {s: [None] * n for s in an}
    rec = {'stances': {}, 'held_keys': 0, 'max_shift_cm': 0.0, 'out_of_reach_keys': 0, 'foot_pitched_keys': 0, 'foot_pitched_max_deg': 0.0}
    for s in an:
        A_, B_, R_ = np.array(an[s]), np.array(ba[s]), np.array(Rf[s])
        heel, ball, hl, bl = PL.sole_points(A_, B_, R_, fps)
        fl = PL.sole_floors(heel, ball)
        st = still_stances(heel, ball, fps, fl)
        rec['stances'][s] = [list(map(int, x)) for x in st]
        # key by key, the foot's horizontal offset from its capture carried through (no jump at a stance's end): in a stance
        # the contact point held where the foot stands (captured place plus the carried offset), then between stances the
        # offset let go, at most 6 cm/s while the foot stays on the ground (a slide a real foot does not make) and quickly
        # once it lifts (the swing takes it up)
        stance_of = {}
        for k0, k1 in st:
            if k1 - k0 >= 2:
                for k in range(k0, k1 + 1): stance_of[k] = (k0, k1)
        off = np.zeros(3); held, mode, cur = None, None, None
        hgt = np.minimum(heel[:, 1] - fl[0], ball[:, 1] - fl[1]) * 100
        for k in range(n):
            if k in stance_of and not (skip and k in skip):
                if stance_of[k] != cur: cur = stance_of[k]; held, mode = None, None
                bdown = (ball[k, 1] - fl[1]) * 100 < PL.ROLL_CM or (ball[k, 1] - fl[1]) <= (heel[k, 1] - fl[0])
                if mode is None: mode = 'ball' if bdown else 'heel'
                if mode == 'heel' and bdown:
                    held = (held + R_[k] @ (bl - hl)) if held is not None else None
                    mode = 'ball'
                if held is None: held = (heel[k] if mode == 'heel' else ball[k]) + off
                tgt[s][k] = held - R_[k] @ (hl if mode == 'heel' else bl); piv[s][k] = (held.copy(), mode)
                off = tgt[s][k] - A_[k]; off[1] = 0.0
            else:
                cur = None
                step = (0.06 if hgt[k] < STILL_CM else 1.5) / fps
                mag = float(np.linalg.norm(off))
                if mag > 1e-5:
                    off = off * (max(0.0, mag - step) / mag)
                    tgt[s][k] = A_[k] + off
    for k in range(n):
        if tgt['Left'][k] is None and tgt['Right'][k] is None: continue
        rig.pose(rows[k])
        for s in ('Left', 'Right'):
            if tgt[s][k] is None: continue
            R0 = rig.wrot(s + 'Foot'); T = from_file(tgt[s][k])
            shift = (T - rig.head(s + 'Foot')).length
            rec['max_shift_cm'] = max(rec['max_shift_cm'], round(shift * 100, 2))
            H = rig.head(s + 'UpperLeg')
            L = ((rig.head(s + 'LowerLeg') - H).length + (rig.head(s + 'Foot') - rig.head(s + 'LowerLeg')).length) * 0.998
            if (T - H).length > L and piv[s][k] is not None:
                # out of the leg's reach (a lunge, a strike's drive): the foot turned about its held point, the heel rising
                # off a held ball (to 35°) or the toes off a held heel (to 20°), just enough to bring the ankle in (plant.py's
                # pitch, as a real foot rolls)
                P = from_file(piv[s][k][0]); lim = 35.0 if piv[s][k][1] == 'ball' else 20.0
                axis = (T - P).cross(H - P)
                if axis.length > 1e-8:
                    axis.normalize(); lo_, hi_ = 0.0, math.radians(lim)
                    if (Quaternion(axis, hi_) @ (T - P) + P - H).length <= L:
                        for _ in range(24):
                            mid = 0.5 * (lo_ + hi_)
                            if (Quaternion(axis, mid) @ (T - P) + P - H).length <= L: hi_ = mid
                            else: lo_ = mid
                    q = Quaternion(axis, hi_); T = q @ (T - P) + P; R0 = q @ R0
                    rec['foot_pitched_keys'] += 1; rec['foot_pitched_max_deg'] = max(rec['foot_pitched_max_deg'], round(math.degrees(hi_), 1))
            miss = rig.two_bone(s + 'UpperLeg', s + 'LowerLeg', s + 'Foot', T, rig.head(s + 'LowerLeg') - rig.head(s + 'UpperLeg') + FRONT * 0.05)
            if miss > 0.002: rec['out_of_reach_keys'] += 1
            rig.set_wrot(s + 'Foot', R0)
            rec['held_keys'] += 1
        rows[k] = rig.capture()
    return rec


def velocity(P, fps):
    V = []
    for i in range(len(P)):
        a, b = P[max(0, i - 1)], P[min(len(P) - 1, i + 1)]
        V.append((b - a) * (fps / max(1, min(len(P) - 1, i + 1) - max(0, i - 1))))
    return V


class Track:
    """The weapon and the hands' targets per key, for the json (Unity axes, the clip's own space and the chest's frame)."""

    def __init__(self, model, mode, main, off):
        self.model, self.mode, self.main, self.off = model, mode, main, off
        self.keys = []

    def add(self, rig, W, w_main, w_off, off_target=None):
        o, f, u = W
        cq = rig.rel('UpperChest'); ch = rig.head('UpperChest'); ci = cq.inverted()
        U = lambda v: [round(-v.x, 4), round(v.z, 4), round(-v.y, 4)]          # Blender world -> Unity's axes
        k = {'grip_main': U(o), 'fwd': U(f), 'up': U(u), 'w_main': round(w_main, 3), 'w_off': round(w_off, 3),
             'grip_main_chest': U(ci @ (o - ch)), 'fwd_chest': U(ci @ f), 'up_chest': U(ci @ u)}
        if off_target is not None: k['grip_off'] = U(off_target); k['grip_off_chest'] = U(ci @ (off_target - ch))
        self.keys.append(k)

    def json(self):
        return {'mode': self.mode, 'model': self.model, 'main_grip': self.main, 'off_grip': self.off, 'keys': self.keys,
                'axes': "Unity's (+X the body's right, +Y up, +Z the clip's forward), metres; *_chest: in the UpperChest's frame "
                        "(its rotation from the T-pose bind), from its joint; w_main / w_off: the hand on its grip (1) or free (0)"}


def weapon_frame_from_hands(rig, model, u_prev=None, f_prev=None):
    """A two-handed weapon's frame from the clip's own hands: its line from the main palm to the off palm (the mimed grip),
    rolled as the main hand's grip says at the first key and carried from key to key after it (the roll transported along
    the line: a roll read afresh from a mimed hand each key flipped the grip over in a fast swing); None where the hands are
    under 4 cm apart."""
    pm, po = rig.palm('Right'), rig.palm('Left')
    n, a = rig.palm_frame('Right')
    if (po - pm).length < 0.06:
        # the hands together (a batter's): the line kept from the key before, or the main hand's own across
        if f_prev is None: return None
        f = f_prev.copy()
    else:
        f = (po - pm).normalized()
    u0 = u_prev if u_prev is not None else (a.cross(n) if main_grip(model) == 'HammerGrip' else a)
    u = u0 - f * u0.dot(f)
    if u.length < 1e-3: u = UP - f * UP.dot(f)
    return (pm, f, u.normalized())


def shoulder_frame(rig, model, aim_dir=None):
    """A long gun mounted in the main shoulder's pocket (S2): the butt in the pocket (the joint, a quarter of the way in toward
    the upper chest, 4 cm ahead, 2 cm down), the line toward the mimed off palm (or `aim_dir`), the top up."""
    pts = weapon(model)
    sr = rig.head('RightUpperArm'); ch = rig.head('UpperChest')
    _, _, right, up, ahead = rig.body_frame()
    pocket = sr + (ch - sr) * 0.25 + ahead * 0.04 - UP * 0.02
    if aim_dir is None:
        po = rig.palm('Left'); aim_dir = (po - pocket)
    f = aim_dir.normalized()
    u = (UP - f * UP.dot(f)).normalized()
    b = pts.get('butt', (0.0, 0.05, -0.29))
    r = f.cross(u)
    o = pocket - (r * b[0] + u * b[1] + f * b[2])
    return (o, f, u)


def fit_reach(rig, W, model, most=0.985):
    """A two-handed weapon whose grip_off lies beyond `most` of the off arm's reach (an actor's short arms, a long fore-end):
    the gun slid back along its line (the butt deeper into the pocket, the main hand with it) by up to 5 cm, then its line
    turned in toward the off shoulder by up to 8°, as a shooter with short arms blades and tucks the gun."""
    go = weapon(model).get('grip_off')
    if go is None: return W
    sl, reach = rig.head('LeftUpperArm'), most * rig.arm_len('Left')
    dist = lambda W_: (rig.wrist_for('Left', wpoint(W_, go), *grip_frame(W_, off_grip(model))) - sl).length
    o, f, u = W
    d = dist(W) - reach
    if d <= 0: return W
    o = o - f * min(0.08, d + 0.003); W = (o, f, u)
    if dist(W) <= reach: return W
    best = W
    # turned in toward the off side (to 15°), dropped (to 15°), canted (to 30°): the first, then the least, that brings it in
    # reach (a shooter leaning out of cover cants and drops the gun toward the off hand)
    for axis, top in ((UP.copy(), 15), (f.cross(UP).normalized() if f.cross(UP).length > 1e-6 else LEFT.copy(), 15), (f.copy(), 30)):
        for deg in range(1, top + 1):
            for sgn in (1.0, -1.0):
                q = Quaternion(axis, sgn * math.radians(deg)); f2 = (q @ best[1]).normalized(); u2 = (q @ best[2]).normalized()
                W2 = (o, f2, u2)
                if dist(W2) <= reach: return W2
        cand = [(o, (Quaternion(axis, sg * math.radians(top)) @ best[1]).normalized(), (Quaternion(axis, sg * math.radians(top)) @ best[2]).normalized()) for sg in (1.0, -1.0)]
        c = min(cand, key=dist)
        if dist(c) < dist(best): best = c
    return best


def hold_frame(rig, hold, model, reload_w=0.0, pitch_add=0.0):
    """Core CombatMotion.PlaceHold for this actor: the grip in shares of the main arm's reach in the shoulders' frame, the
    weapon's line turned by the hold, turned further across (5° at a time, to 15°) and then moved just enough to bring
    grip_off within 0.95 of the off arm's reach. reload_w blends toward the reload hold."""
    pitch, across, g = HOLDS[hold]
    if reload_w > 0:
        rp, ra, rg = HOLDS['PistolReload' if model in ('pistol', 'revolver') else 'LongGunReload']
        pitch += (rp - pitch) * reload_w; across += (ra - across) * reload_w; g = tuple(x + (y - x) * reload_w for x, y in zip(g, rg))
    pitch += pitch_add
    sr, sl, right, up, ahead = rig.body_frame()
    fr = (sr, right, up, ahead)
    reach, oreach = rig.reach('Right'), rig.reach('Left')
    grip = sr + wvec(fr, [x * reach for x in g])
    pts = weapon(model)
    go = pts.get('grip_off')
    if go is None and model in ('pistol', 'revolver'): go = PISTOL_SUPPORT_AT
    line = across
    most = 0.93 * rig.arm_len('Left')
    wr = lambda g_, f_, u_: rig.wrist_for('Left', wpoint((g_, f_, u_), go), *grip_frame((g_, f_.normalized(), u_.normalized()), off_grip(model)))
    for extra in (0, 5, 10, 15):
        line = across + extra
        f = wvec(fr, hold_turn(pitch, line, (0, 0, 1))); u = wvec(fr, hold_turn(pitch, line, (0, 1, 0)))
        if go is None or (wr(grip, f, u) - sl).length <= most: break
    if go is not None:
        gap = wr(grip, f, u) - sl
        if gap.length > most: grip = grip + gap * ((most - gap.length) / gap.length)
    return (grip, f.normalized(), u.normalized())


def hold_hands(rig, W, model, w_off=1.0, off_target=None, off_rot=None, pole_main=None, pole_off=None, warm=False):
    """Both hands on the weapon frame W: the main palm on grip_main, the off palm on grip_off (or the pistol's support)."""
    sr, sl, right, up, ahead = rig.body_frame()
    n, a = grip_frame(W, main_grip(model))
    miss_m = rig.put_palm('Right', W[0], n, a, pole_main if pole_main is not None else (-UP * 0.3 + right * 0.15 - ahead * 0.1), warm=warm)
    # the weapon rides the main hand (as the game attaches it to the palm): where the grip lay beyond the arm's reach, the
    # weapon is where the palm got to (the shortfall is recorded), and the off hand goes to grip_off from there
    if miss_m > 0.0: W = (rig.palm('Right'), W[1], W[2])
    hold_hands.last_W = W
    pts = weapon(model)
    go = pts.get('grip_off') or (PISTOL_SUPPORT_AT if model in ('pistol', 'revolver') else None)
    tgt = off_target if off_target is not None else (wpoint(W, go) if go is not None else None)
    miss_o = 0.0
    if tgt is not None and w_off > 0:
        on, oa = off_rot if off_rot is not None else grip_frame(W, off_grip(model))
        miss_o = rig.put_palm('Left', tgt, on, oa, pole_off if pole_off is not None else (-UP * 0.3 - right * 0.15), w_off, warm=warm)
    return tgt, miss_m, miss_o


def smooth(t):
    t = max(0.0, min(1.0, t)); return t * t * (3.0 - 2.0 * t)


def op_grip(rig, rows, d, fps):
    """Captured two-handed clips: the weapon on the mimed hands (OffHand), or mounted in the shoulder (Shoulder: S2)."""
    ik = d['ik']; model = ik['model']; n = len(rows)
    tr = Track(model, ik['mode'], main_grip(model), off_grip(model)); miss = []; moved = []; u_prev = None; f_prev = None
    for k in range(n):
        rig.pose(rows[k]); t = k / fps
        Wh = weapon_frame_from_hands(rig, model, u_prev, f_prev)
        if ik['mode'] == 'Shoulder':
            Ws = shoulder_frame(rig, model)
            w = 1.0
            if ik.get('from_s') is not None: w = smooth((t - (ik['from_s'] - 0.3)) / 0.3)
            if ik.get('to_s') is not None: w = 1.0 - smooth((t - ik['to_s']) / 0.3)
            if Wh is None or ik.get('from_s') is not None or ik.get('to_s') is not None:
                Wh = hold_frame(rig, 'LongGunReady', model)     # a raise from (a lower to) the low ready, not the mimed hands
            if w >= 1.0: W = Ws
            elif w <= 0.0: W = clear_body(rig, Wh, model)
            else:
                f = Wh[1].slerp(Ws[1], w) if hasattr(Wh[1], 'slerp') else (Wh[1].lerp(Ws[1], w)).normalized()
                f = f.normalized(); u = Wh[2].lerp(Ws[2], w); u = (u - f * u.dot(f)).normalized()
                W = clear_body(rig, (Wh[0].lerp(Ws[0], w), f, u), model)
        else:
            # the captured two-handed swing: the haft on the actor's own two hands (grip_off lies between them, always in
            # reach); nothing moved to clear the body: a capture whose line passes through it fails the clip QA
            W = Wh if Wh is not None else hold_frame(rig, 'ClubReady', model)
        if ik['mode'] != 'OffHand':
            W = fit_reach(rig, W, model)
            W, _ = fit_two_hands(rig, W, model, most=0.985)     # the last resort: the gun moved just into both arms' reach
        u_prev = W[2].copy(); f_prev = W[1].copy()
        for _try in range(3):
            tgt, mm, mo = hold_hands(rig, W, model, pole_main=rig.head('RightLowerArm') - rig.head('RightUpperArm'),
                                     pole_off=rig.head('LeftLowerArm') - rig.head('LeftUpperArm'), warm=(ik['mode'] == 'Shoulder'))
            W = hold_hands.last_W
            if ik['mode'] == 'OffHand' or (trunk_gap(rig, W[0], W[1], model, W[2]) >= 0.005 and head_gap(rig, W[0], W[1], model, W[2]) >= 0.005): break
            W = clear_body(rig, W, model)       # the hands' placing moved the gun into the body: turned out again (C1)
        miss.append(max(mm, mo))
        tr.add(rig, W, 1.0, 1.0, tgt)
        rows[k] = rig.capture()
    return tr, {'beyond_reach_cm_max': round(max(miss) * 100, 2) if miss else 0.0,
                'main_grip_moved_cm_max': round(max(moved) * 100, 2) if moved else 0.0}


def op_hold(rig, rows, d, fps):
    b = d['build']; model = b['model']; n = len(rows)
    tr = Track(model, 'Hold', main_grip(model), off_grip(model)); miss = []
    for k in range(n):
        rig.pose(rows[k])
        hold = b['hold']
        if b.get('hold_to'):
            # (v4.4) a rise: the hold carried from one to the other between two shares of the clip (`blend`), smoothstep
            w = smooth((k / max(1, n - 1) - b['blend'][0]) / max(1e-6, b['blend'][1] - b['blend'][0]))
            (p0, a0, g0), (p1, a1, g1) = HOLDS[b['hold']], HOLDS[b['hold_to']]
            HOLDS['_mix'] = (p0 + (p1 - p0) * w, a0 + (a1 - a0) * w, tuple(x + (y - x) * w for x, y in zip(g0, g1))); hold = '_mix'
        W = hold_frame(rig, hold, model)
        tgt, mm, mo = hold_hands(rig, W, model, warm=True)
        W = hold_hands.last_W
        miss.append(max(mm, mo)); tr.add(rig, W, 1.0, 1.0, tgt)
        rows[k] = rig.capture()
    HOLDS.pop('_mix', None)
    info = {'hold': b['hold'], 'hold_values': HOLDS[b['hold']], 'beyond_reach_cm_max': round(max(miss) * 100, 2)}
    if b.get('hold_to'): info.update(hold_to=b['hold_to'], hold_to_values=HOLDS[b['hold_to']], blend=list(b['blend']))
    return tr, info


def op_aim(rig, rows, d, fps):
    """A long gun aimed from a captured body that holds none (a crouch, a lean): mounted in the shoulder, the line level
    along the body's facing at the eye's height."""
    b = d['build']; model = b['model']; n = len(rows)
    tr = Track(model, 'Shoulder', main_grip(model), off_grip(model)); miss = []
    for k in range(n):
        rig.pose(rows[k])
        cf = rig.rel('UpperChest') @ FWD; cf = Vector((cf.x, cf.y, 0.0)).normalized()     # the chest's facing, level
        W = fit_reach(rig, shoulder_frame(rig, model, aim_dir=cf), model)
        W, _ = fit_two_hands(rig, W, model, most=0.985)
        W = clear_body(rig, W, model)
        for _try in range(3):
            tgt, mm, mo = hold_hands(rig, W, model, warm=True)
            W = hold_hands.last_W
            if trunk_gap(rig, W[0], W[1], model, W[2]) >= 0.005 and head_gap(rig, W[0], W[1], model, W[2]) >= 0.005: break
            W = clear_body(rig, W, model)
        miss.append(max(mm, mo)); tr.add(rig, W, 1.0, 1.0, tgt)
        rows[k] = rig.capture()
    return tr, {'line': 'level along the facing', 'beyond_reach_cm_max': round(max(miss) * 100, 2)}


def op_pistol_aim(rig, rows, d, fps):
    """S3: isosceles: the pistol on the line from the dominant eye along the facing, at 0.96 of the main arm's reach (both
    elbows near straight [R8]), its sights at the eye; both hands by IK (the support hand wrapping the grip)."""
    b = d['build']; model = b['model']; n = len(rows)
    pts = weapon(model); sight = 0.075
    tr = Track(model, 'PistolAim', 'PistolGrip', 'PistolSupport'); miss = []
    for k in range(n):
        rig.pose(rows[k])
        sr, sl, right, up, ahead = rig.body_frame()
        hq = rig.rel('Head'); eye = rig.head('Head') + hq @ Vector((0.0, -0.09, 0.07)) + right * 0.03
        f = FRONT.copy(); u = UP.copy()     # (the clip's front: v4.6, a take frame's is the file's -Z)
        L = 0.96 * rig.reach('Right'); e = eye - u * sight - sr
        ef = e.dot(f); disc = ef * ef - (e.dot(e) - L * L)
        D = -ef + math.sqrt(max(0.0, disc))
        W = (eye - u * sight + f * D, f, u)
        tgt, mm, mo = hold_hands(rig, W, model, pole_main=-UP * 0.4 + right * 0.2, pole_off=-UP * 0.4 - right * 0.2, warm=True)
        W = hold_hands.last_W
        miss.append(max(mm, mo)); tr.add(rig, W, 1.0, 1.0, tgt)
        rows[k] = rig.capture()
    return tr, {'stance': 'isosceles', 'reach_share': 0.96, 'beyond_reach_cm_max': round(max(miss) * 100, 2)}


# a reload's off-hand path: (time s, where, point, grip) — where: 'grip' (its grip on the weapon), 'weapon' (a weapon point,
# m), 'hips' (right, up, ahead of the hips' joint, m); the events at their times; the weapon's pitch added (deg) by time
RELOADS = {
    'magazine': dict(path=[(0.0, 'grip', None), (0.40, 'weapon', 'mag-3'), (0.60, 'weapon', 'mag-14'), (1.05, 'hips', (-0.13, 0.05, 0.13)),
                           (1.35, 'hips', (-0.13, 0.03, 0.13)), (1.85, 'weapon', 'mag-12'), (2.05, 'weapon', 'mag-2'), (2.35, 'weapon', (0.035, 0.06, 0.10)),
                           (2.45, 'weapon', (0.035, 0.06, 0.02)), (3.0, 'grip', None)],
                     events={'mag_out': 0.55, 'mag_in': 2.05, 'charge': 2.42}, pitch=[]),
    'pistol': dict(path=[(0.0, 'grip', None), (0.30, 'weapon', 'mag-4'), (0.75, 'hips', (-0.10, 0.06, 0.12)), (1.00, 'hips', (-0.10, 0.04, 0.12)),
                         (1.45, 'weapon', 'mag-10'), (1.60, 'weapon', 'mag-1'), (1.90, 'weapon', (0.0, 0.055, -0.02)), (2.00, 'weapon', (0.0, 0.055, -0.07)),
                         (2.4, 'grip', None)], events={'mag_out': 0.30, 'mag_in': 1.60, 'slide': 1.95}, pitch=[]),
    'revolver': dict(path=[(0.0, 'grip', None), (0.40, 'weapon', (-0.03, 0.05, 0.04)), (0.90, 'weapon', (0.0, 0.06, 0.14)), (1.40, 'hips', (-0.11, 0.05, 0.13)),
                           (1.80, 'hips', (-0.11, 0.03, 0.13)), (2.50, 'weapon', (-0.03, 0.05, 0.04)), (3.10, 'weapon', (-0.03, 0.05, 0.04)),
                           (3.70, 'grip', None), (4.4, 'grip', None)],
                     events={'open': 0.45, 'eject': 1.05, 'load': 2.6, 'close': 3.2}, pitch=[(0.0, 0.0), (0.7, -55.0), (1.3, -55.0), (1.7, 40.0), (3.0, 40.0), (3.5, 0.0)]),
    'break': dict(path=[(0.0, 'grip', None), (0.50, 'grip', None), (0.95, 'weapon', (0.0, 0.03, 0.10)), (1.40, 'hips', (-0.10, 0.04, 0.14)),
                        (1.70, 'hips', (-0.10, 0.03, 0.14)), (2.20, 'weapon', (0.0, 0.03, 0.10)), (2.65, 'hips', (-0.10, 0.04, 0.14)),
                        (2.95, 'hips', (-0.10, 0.03, 0.14)), (3.45, 'weapon', (0.0, 0.03, 0.10)), (3.95, 'grip', None), (4.5, 'grip', None)],
                  events={'open': 0.55, 'extract': 1.0, 'load': 2.25, 'load_2': 3.5, 'close': 4.0}, pitch=[(0.0, 0.0), (0.5, 45.0), (3.8, 45.0), (4.1, 0.0)]),
    'bolt': dict(path=[(0.0, 'grip', None), (0.45, 'weapon', (0.045, 0.02, 0.06)), (0.70, 'weapon', (0.045, 0.04, -0.03)), (1.20, 'hips', (-0.12, 0.05, 0.13)),
                       (1.50, 'hips', (-0.12, 0.03, 0.13)), (2.00, 'weapon', (0.0, 0.06, 0.05)), (2.45, 'hips', (-0.12, 0.05, 0.13)),
                       (2.75, 'hips', (-0.12, 0.03, 0.13)), (3.25, 'weapon', (0.0, 0.06, 0.05)), (3.65, 'weapon', (0.045, 0.04, -0.03)),
                       (3.90, 'weapon', (0.045, 0.02, 0.06)), (4.6, 'grip', None)],
                 events={'bolt_open': 0.55, 'round': 2.05, 'round_2': 3.3, 'bolt_close': 3.9}, pitch=[]),
}


def op_reload(rig, rows, d, fps):
    """S5: the gun held at the ready on the captured stance, brought up and in toward the eyes, the main hand on its grip,
    the off hand along the mechanism's path (RELOADS), timed inside the evidence (`timing`)."""
    b = d['build']; model = b['model']; spec = RELOADS[b['mech']]; T = float(b['seconds'])
    n = int(round(T * fps)) + 1
    base = rows
    while len(base) < n: base = base + rows[::-1]     # the stance's loop played back and forth to the reload's length
    rows[:] = base[:n]
    pts = weapon(model)
    go = pts.get('grip_off') or (PISTOL_SUPPORT_AT if model in ('pistol', 'revolver') else None)
    tr = Track(model, 'Free', main_grip(model), off_grip(model)); miss = []

    def pitch_at(t):
        P = spec['pitch']
        if not P: return 0.0
        for (t0, p0), (t1, p1) in zip(P, P[1:]):
            if t0 <= t <= t1: return p0 + (p1 - p0) * smooth((t - t0) / max(1e-6, t1 - t0))
        return P[-1][1] if t > P[-1][0] else P[0][1]

    def point(W, where, p, hips):
        if where == 'grip': return wpoint(W, go)
        if where == 'weapon':
            if isinstance(p, str):    # 'mag-<cm>': the magazine point, so many cm below it
                return wpoint(W, pts['mag']) - W[2] * (float(p.split('-')[1]) / 100.0)
            return wpoint(W, p)
        o, r, u, a = hips
        return o + r * p[0] + u * p[1] + a * p[2]

    neutral = Quaternion()     # the hand straight on its forearm, as at the bind
    for k in range(n):
        rig.pose(rows[k]); t = k / fps
        wr = smooth(t / 0.35) * (1.0 - smooth((t - (T - 0.45)) / 0.45))
        W = hold_frame(rig, b['hold'], model, reload_w=wr, pitch_add=pitch_at(t))
        sr, sl, right, up, ahead = rig.body_frame()
        hips = (rig.head('Hips'), right, UP, ahead)
        path = spec['path']
        i = max(j for j in range(len(path)) if path[j][0] <= t + 1e-9)
        j = min(i + 1, len(path) - 1)
        t0, w0, p0 = path[i]; t1, w1, p1 = path[j]
        s_ = smooth((t - t0) / max(1e-6, t1 - t0)) if j != i else 0.0
        P = point(W, w0, p0, hips).lerp(point(W, w1, p1, hips), s_)
        # the palm's frame: its grip's on the weapon; reaching (the magazine, the pouch, the bolt) palm in and fingers down
        gn, ga = grip_frame(W, off_grip(model))
        on_grip = lambda w: 1.0 if w == 'grip' else 0.0
        g = on_grip(w0) + (on_grip(w1) - on_grip(w0)) * s_
        # reaching (the magazine, the pouch, the bolt): the wrist straight, the hand in line with the forearm as it points
        # at the place (no wrist bent to a palm frame: a hand turned against its forearm read 94° Euler jumps)
        _, mm, _ = hold_hands(rig, W, model, w_off=0.0, warm=True)
        W = hold_hands.last_W
        gl = rig.hand_local('Left', rig.hand_rot('Left', gn, ga))
        if gl.dot(neutral) < 0: gl = -gl
        mo = rig.put_palm_local('Left', P, neutral.slerp(gl, g), -UP * 0.3 - right * 0.15)
        miss.append(max(mm, mo))
        tr.add(rig, W, 1.0, g, P)
        rows[k] = rig.capture()
    ev = {k: [int(round(v * fps))] for k, v in spec['events'].items()}
    return tr, {'mechanism': b['mech'], 'seconds': T, 'path': [[p[0], p[1], p[2]] for p in spec['path']], 'pitch_added': spec['pitch'],
                'beyond_reach_cm_max': round(max(miss) * 100, 2), '_events': ev}


def cock_profile(cut, t, t_on, t_imp, t_end):
    """The blade's lag behind the arm's line (deg; positive: trailing the blow): cocked through the wind-up, snapping
    through at the impact, a short follow-through, back toward the ready."""
    cw, ci, cf, cr = {'slash': (70.0, -10.0, -25.0, 35.0), 'chop': (95.0, -5.0, -20.0, 35.0), 'thrust': (15.0, 0.0, 0.0, 10.0)}[cut]
    if t <= t_on: return cr + (cw - cr) * smooth(t / max(1e-6, t_on))
    if t <= t_imp: return cw + (ci - cw) * smooth((t - t_on) / max(1e-6, t_imp - t_on))
    if t <= t_imp + 0.15: return ci + (cf - ci) * smooth((t - t_imp) / 0.15)
    return cf + (cr - cf) * smooth((t - t_imp - 0.15) / max(1e-6, t_end - t_imp - 0.15))


def weapon_line(model):
    """The weapon's line as the clip QA samples it (combat_v4_qa.clearance): from its butt (a long gun's first 10 cm left out:
    the butt sits in the pocket) or a pommel 8 cm behind the grip, to its muzzle or tip, in its own frame (right, up, forward)."""
    pts = weapon(model); long = 'butt' in pts
    a = Vector(pts['butt']) if long else Vector((0.0, 0.0, -0.08))
    b = Vector(pts.get('muzzle', pts.get('tip', (0.0, 0.0, 0.3)))); L = (b - a).length
    return [a + (b - a) * (i / 15.0) for i in range(16) if not (long and (i / 15.0) * L < 0.10)]


def _wpts(o, f, u, model):
    r = f.cross(u)
    return [o + r * p.x + u * p.y + f * p.z for p in weapon_line(model)]


def trunk_gap(rig, o, f, model, u=None):
    """The least gap (m) between the weapon's line and the trunk (an elliptic cylinder from the hips to the neck, 15 cm across,
    11 cm deep: combat_v4_qa.clearance's)."""
    if u is None: u = (UP - f * UP.dot(f)).normalized()
    hip, nk = rig.head('Hips'), rig.head('Neck'); ax = nk - hip; al = ax.dot(ax)
    R = rig.rel('UpperChest'); lat, fw = R @ Vector((1.0, 0, 0)), R @ FWD
    best = 9.0
    for p in _wpts(o, f, u, model):
        t = (p - hip).dot(ax) / al
        if 0.0 <= t <= 1.0:
            dv = p - (hip + ax * t)
            e = math.sqrt((dv.dot(lat) / 0.15) ** 2 + (dv.dot(fw) / 0.11) ** 2)
            best = min(best, (e - 1.0) * 0.11)
    return best


def head_gap(rig, o, f, model, u=None):
    """The least gap (m) between the weapon's line and the head (a 9 cm sphere 9 cm over the head joint)."""
    if u is None: u = (UP - f * UP.dot(f)).normalized()
    c = rig.head('Head') + UP * 0.09
    return min((p - c).length - 0.09 for p in _wpts(o, f, u, model))


def clear_body(rig, W, model, nrm=None, need=0.02, top=45):
    """A weapon whose line would pass into the trunk or the head turned out of them about its grip, 3° at a time up to `top`
    (45°; a v4.2 blade held at a boxer's chin up to 90°), about the swing's normal (or the axis across the line and the
    vertical), whichever way clears both first (C1)."""
    o, f, u = W
    ok = lambda f_, u_=None: trunk_gap(rig, o, f_, model, u_) >= need and head_gap(rig, o, f_, model, u_) >= need
    if ok(f, u): return W
    axes = [a_ for a_ in (nrm, f.cross(UP), f.cross(FWD)) if a_ is not None and a_.length > 1e-6]
    for deg in range(3, int(top) + 1, 3):
        for ax_ in axes:
            for sg in (1.0, -1.0):
                q = Quaternion(ax_.normalized(), math.radians(sg * deg)); f2 = (q @ f).normalized(); u2 = (q @ u).normalized()
                if ok(f2, u2): return (o, f2, u2)
    return W


def fit_two_hands(rig, W, model, most=0.97):
    """A two-handed weapon brought within both arms' reach: its grip moved (the line kept) by alternating projections of
    the main grip onto the main arm's reach and grip_off onto the off arm's; returns the frame and how far it moved (m)."""
    go = weapon(model).get('grip_off')
    if go is None: return W, 0.0
    o, f, u = W; o0 = o.copy()
    sr, sl = rig.head('RightUpperArm'), rig.head('LeftUpperArm')
    mr, ml = most * rig.arm_len('Right'), most * rig.arm_len('Left')
    gn, ga = grip_frame(W, main_grip(model)); on, oa = grip_frame(W, off_grip(model))
    for _ in range(8):
        wl = rig.wrist_for('Left', wpoint((o, f, u), go), on, oa)
        if (wl - sl).length > ml: o = o + (wl - sl) * ((ml - (wl - sl).length) / (wl - sl).length)
        wr_ = rig.wrist_for('Right', o, gn, ga)
        if (wr_ - sr).length > mr: o = o + (wr_ - sr) * ((mr - (wr_ - sr).length) / (wr_ - sr).length)
    return (o, f, u), (o - o0).length


def op_arc(rig, rows, d, fps, club=False):
    """S6a (and S6b for women): the captured blow's own hand path kept; the blade or club's line the arm's line (shoulder to
    palm) cocked behind the blow through the wind-up and snapping through at the impact (cock_profile), its edge (or face)
    leading along the blow; the main hand's grip turned to it; club: the off hand on the haft's grip_off by IK; a block: the
    blade across the line of the blow, edge out, at the block's contact."""
    b = d['build']; model = b['model']; cut = b.get('cut', 'slash'); n = len(rows)
    ev = d.get('events_frames') or {}
    imp = (ev.get('impact') or ev.get('release') or ev.get('contact') or [n // 2])[0]
    imp = max(1, min(n - 2, imp))
    tm = d.get('timing_measured') or {}
    t_imp = imp / fps; t_on = max(0.05, min(t_imp - 0.12, float(tm.get('onset_s', t_imp - 0.3))))
    S_, P_ = [], []
    for r in rows:
        rig.pose(r); S_.append(rig.head('RightUpperArm')); P_.append(rig.palm('Right'))
    V = velocity(P_, fps)
    vi = V[imp]; fi = (P_[imp] - S_[imp]).normalized()
    nrm = fi.cross(vi)
    if nrm.length < 1e-6: nrm = fi.cross(UP)
    nrm.normalize()
    test = Quaternion(nrm, math.radians(10.0)) @ fi
    sgn = 1.0 if test.dot(vi) < fi.dot(vi) else -1.0
    esg = 1.0 if nrm.cross(fi).dot(vi) > 0 else -1.0    # the edge leads: along nrm x f, toward the blow at the impact
    tr = Track(model, 'Arc' if not club else 'OffHand', 'HammerGrip', 'OffHammer' if club else None); miss = []; u_blk = None
    for k in range(n):
        rig.pose(rows[k]); t = k / fps
        sr, sl, right, up, ahead = rig.body_frame()
        arm = (rig.palm('Right') - rig.head('RightUpperArm')).normalized()
        if cut == 'block':
            # the blade across the line of the blow at the contact (horizontal, before the face, edge out and up), from the
            # arm's own line before it and after
            fb = (LEFT * 0.85 + UP * 0.15).normalized(); ub = (ahead * 0.7 + UP * 0.3); ub = (ub - fb * ub.dot(fb)).normalized()
            w = smooth((t - (t_imp - 0.25)) / 0.25) * (1.0 - smooth((t - (t_imp + 0.35)) / 0.3))
            f0 = (Quaternion(nrm, sgn * math.radians(35.0)) @ arm).normalized()
            u0 = (u_blk - f0 * u_blk.dot(f0)) if u_blk is not None else (UP - f0 * UP.dot(f0))
            u0 = u0.normalized() if u0.length > 1e-6 else (UP - f0 * UP.dot(f0)).normalized(); u_blk = u0.copy()
            # the blade's frame turned from the arm's line to across the blow by the shortest turn (frames, not vectors,
            # blended: a lerp of the edge's direction flipped it over)
            q0 = Matrix((f0, u0, f0.cross(u0))).transposed().to_quaternion(); q1 = Matrix((fb, ub, fb.cross(ub))).transposed().to_quaternion()
            if q0.dot(q1) < 0: q1 = -q1
            qw = q0.slerp(q1, w).to_matrix()
            f, u = qw.col[0].normalized(), qw.col[1].normalized()
        else:
            c = cock_profile('chop' if (club and cut != 'thrust') else cut, t, t_on, t_imp, (n - 1) / fps)
            f = (Quaternion(nrm, sgn * math.radians(c)) @ arm).normalized()
            u = -esg * nrm.cross(f)           # the spine trails, the edge (or the club's face) leads in the swing's plane
            if u.length < 1e-4: u = UP - f * UP.dot(f)
            u.normalize()
            if cut == 'thrust':
                u = UP - f * UP.dot(f); u = u.normalized() if u.length > 1e-4 else ahead.copy()
        if cut != 'block':
            f, u = clear_body(rig, (rig.palm('Right'), f, u), model, nrm, top=b.get('clear_to', 45))[1:]
        gn, ga = (u.cross(f), f)                                     # HammerGrip: across f, palm normal -r = u x f
        rig.set_wrot('RightHand', rig.hand_rot('Right', gn, ga))
        W = (rig.palm('Right'), f, u)
        tgt = None
        if club:
            # both hands on the haft: where the off arm cannot reach grip_off, the haft (and the main hand on it) comes in
            # toward the off shoulder just far enough (the throw's body cocks the hand behind the head, past a woman's reach
            # across): the main hand then follows by IK
            go = weapon(model)['grip_off']; on, oa = grip_frame(W, 'OffHammer')
            W, mv = fit_two_hands(rig, W, model)
            for _ in range(2):
                W = clear_body(rig, W, model, nrm); W, _ = fit_two_hands(rig, W, model)
            f, u = W[1], W[2]; gn, ga = grip_frame(W, 'HammerGrip'); on, oa = grip_frame(W, 'OffHammer'); tgt = wpoint(W, go)
            mm = rig.put_palm('Right', W[0], gn, ga, rig.head('RightLowerArm') - rig.head('RightUpperArm'), warm=True)
            if mm > 0: W = (rig.palm('Right'), f, u); tgt = wpoint(W, go)        # the haft rides the main hand
            miss.append(rig.put_palm('Left', tgt, on, oa, rig.head('LeftLowerArm') - rig.head('LeftUpperArm'), warm=True))
        elif b.get('release_off'):
            # the off hand off the haft: up in a guard before the chest (a fist, palm in)
            g = sl + ahead * 0.30 - UP * 0.16 + right * 0.08
            miss.append(rig.put_palm('Left', g, right.copy(), UP.copy(), -UP * 0.3 - right * 0.1))
        tr.add(rig, W, 1.0, 1.0 if club else 0.0, tgt)
        rows[k] = rig.capture()
    return tr, {'cut': cut, 'impact_frame': imp, 'onset_s': round(t_on, 3), 'swing_plane_normal_unity': [round(-nrm.x, 3), round(nrm.z, 3), round(-nrm.y, 3)],
                'cock_deg': {'slash': [70, -10, -25, 35], 'chop': [95, -5, -20, 35], 'thrust': [15, 0, 0, 10], 'block': 'across the line at contact'}['chop' if club else cut],
                'beyond_reach_cm_max': round(max(miss) * 100, 2) if miss else 0.0}


def op_hands_up(rig, rows, d, fps):
    """S20: both hands up and open, palms forward, a little above the head and out from it, elbows bent; `enter`: raised
    from the stance's own hang over that many seconds."""
    b = d['build']; n = len(rows); enter = b.get('enter')
    if enter:
        m = int(round((enter + 0.6) * fps)) + 1
        base = rows
        while len(base) < m: base = base + rows[::-1]
        rows[:] = base[:m]; n = m
    miss = []; tr = Track(None, 'Free', None, None)
    rig.pose(rows[0]); sr0, sl0, _, _, _ = rig.body_frame()
    start = {x: (rig.palm(x) - (sr0 if x == 'Right' else sl0), rig.wrot(x + 'Hand')) for x in ('Left', 'Right')}
    start_local = {x: rig.hand_local(x) for x in ('Left', 'Right')}; hold_local = {}
    if enter:
        # the hold's own hand turn on its forearm, from the hold itself (the last key, the hands up)
        rig.pose(rows[-1]); sr1, sl1, right1, _, ahead1 = rig.body_frame()
        for side, sh, out in (('Right', sr1, right1), ('Left', sl1, -right1)):
            rig.put_palm(side, sh + UP * 0.28 + out * 0.12 + ahead1 * 0.06, ahead1.copy(), -out, -UP * 0.3 + out * 0.35)
            hold_local[side] = rig.hand_local(side)
        rig.warm = {}
    for k in range(n):
        rig.pose(rows[k]); t = k / fps
        w = smooth(t / enter) if enter else 1.0
        sr, sl, right, up, ahead = rig.body_frame()
        for side, sh, out in (('Right', sr, right), ('Left', sl, -right)):
            P = sh + UP * 0.28 + out * 0.12 + ahead * 0.06
            a = -out    # the index toward the midline
            if w < 1.0:
                # from the stance's own hang at the clip's start, up and forward along an arc before the chest (a quadratic
                # path through a point 35 cm before the shoulder at its height) into the hold; the hand turned through the
                # arm's raise as a raised arm turns it (fingers forward, palm to the midline, at half way), so no turn of
                # the hand is ever near a half turn (a single slerp from the hang flipped over)
                P0 = sh + start[side][0]; C_ = sh + ahead * 0.35 + out * 0.05
                Pw = P0 * ((1 - w) ** 2) + C_ * (2 * w * (1 - w)) + P * (w * w)
                R0 = start[side][1]; Rm = rig.hand_rot(side, -out, UP.copy()); R1 = rig.hand_rot(side, ahead.copy(), a)
                if R0.dot(Rm) < 0: Rm = -Rm
                if Rm.dot(R1) < 0: R1 = -R1
                Rw = R0.slerp(Rm, min(1.0, 2 * w)) if w < 0.5 else Rm.slerp(R1, 2 * w - 1)
                Rrel = Rw @ rig.bind[side + 'Hand'].inverted()
                miss.append(rig.put_palm(side, Pw, Rrel @ NB, Rrel @ AB, -UP * 0.3 + out * 0.35, 1.0, warm=True))
            else:
                miss.append(rig.put_palm(side, P, ahead.copy(), a, -UP * 0.3 + out * 0.35, 1.0, warm=True))
        rows[k] = rig.capture()
    return None, {'hands': 'up, open, palms forward', 'enter_s': enter, 'beyond_reach_cm_max': round(max(miss) * 100, 2)}


HIT = {   # amplitudes (deg) and times (s) of the built flinch: onset, peak, back by
    'head': dict(head=20.0, neck=8.0, chest=5.0, spine=2.0, yaw=0.0, t_on=0.05, t_pk=0.13, t_end=0.62),
    'torso': dict(head=-4.0, neck=-2.0, chest=9.0, spine=5.0, yaw=6.0, t_on=0.05, t_pk=0.19, t_end=0.70),
    'leg': dict(drop=0.045, roll=6.0, chest=3.0, t_on=0.04, t_pk=0.15, t_end=0.75),
    'arm': dict(arm=24.0, fore=12.0, yaw=7.0, chest=2.0, t_on=0.05, t_pk=0.17, t_end=0.65),
}


def op_hit(rig, rows, d, fps):
    """S10: a flinch layered on a captured stance: the struck part moves away first (the head snaps for the head, the chest
    caves for the torso, a knee buckles for a leg, the arm swings back for an arm), the trunk follows, the head comes back;
    onset at 0.05 s (startle-driven neck activity within ~0.1 s [R21][R22]), back by 0.62-0.75 s (design in 0.4-1.0 s); the
    feet stay planted (step 2 runs after); no flight (G9)."""
    b = d['build']; zone = b['zone']; z = zone.split('_')[0]; side = {'l': 'Left', 'r': 'Right'}.get(zone.split('_')[-1]) if '_' in zone else None
    p = HIT[z]; n = int(round(0.9 * fps)) + 1
    rows[:] = rows[:n]
    push = {'front': -FWD, 'back': FWD, 'left': RIGHT, 'right': LEFT}[b['dir']]
    if side: push = -FWD
    axis = UP.cross(push).normalized()

    def prof(t, t_on, t_pk, t_end):
        if t < t_on: return 0.0
        if t < t_pk: return smooth((t - t_on) / (t_pk - t_on))
        return 1.0 - smooth((t - t_pk) / (t_end - t_pk))

    for k in range(n):
        rig.pose(rows[k]); t = k / fps
        feet = {x: (rig.head(x + 'Foot'), rig.wrot(x + 'Foot')) for x in ('Left', 'Right')}
        fast = prof(t, p['t_on'], p['t_pk'], p['t_end']); slow = prof(t, p['t_on'] + 0.03, p['t_pk'] + 0.05, p['t_end'])
        if z in ('head', 'torso'):
            for bone, amp, pr in (('Spine', p['spine'], slow), ('Chest', p['chest'] * 0.5, fast if z == 'torso' else slow), ('UpperChest', p['chest'] * 0.5, fast if z == 'torso' else slow),
                                  ('Neck', p['neck'], fast if z == 'head' else slow), ('Head', p['head'], fast if z == 'head' else slow)):
                if rig.has(bone) and amp: rig.turn(bone, Quaternion(axis, math.radians(amp * pr)), rig.head(bone))
            if p['yaw'] and b['dir'] in ('left', 'right'):
                s_ = 1.0 if b['dir'] == 'left' else -1.0
                rig.turn('UpperChest', Quaternion(UP, math.radians(s_ * p['yaw'] * fast)), rig.head('UpperChest'))
        elif z == 'leg':
            # the struck leg gives: the hips drop and roll toward it; the trunk leans with it a little
            s_ = 1.0 if side == 'Left' else -1.0
            hb = rig.pb['Hips']; loc, q = rows[k]['Hips']
            M = rig.M @ hb.matrix
            hb.matrix = rig.Mi @ (Matrix.Translation(-UP * p['drop'] * fast) @ M); rig.update()
            rig.turn('Hips', Quaternion(-FWD, math.radians(s_ * p['roll'] * fast)), rig.head('Hips'))
            rig.turn('UpperChest', Quaternion(-FWD, math.radians(s_ * p['chest'] * slow)), rig.head('UpperChest'))
        elif z == 'arm':
            # the struck arm swings back and out, the forearm drops; the chest turns that shoulder back
            s_ = 1.0 if side == 'Left' else -1.0
            sh = rig.head(side + 'UpperArm')
            rig.turn('UpperChest', Quaternion(UP, math.radians(s_ * p['yaw'] * fast)), rig.head('UpperChest'))
            rig.turn(side + 'UpperArm', Quaternion(LEFT, math.radians(p['arm'] * fast)), rig.head(side + 'UpperArm'))
            rig.turn(side + 'LowerArm', Quaternion(LEFT, math.radians(p['fore'] * fast)), rig.head(side + 'LowerArm'))
        for x, (A_, R0) in feet.items():      # the feet where they stood
            rig.two_bone(x + 'UpperLeg', x + 'LowerLeg', x + 'Foot', A_, rig.head(x + 'LowerLeg') - rig.head(x + 'UpperLeg') + FWD * 0.05)
            rig.set_wrot(x + 'Foot', R0)
        rows[k] = rig.capture()
    layer = dict(zone=zone, dir=b['dir'], push_unity=[round(-push.x, 3), round(push.z, 3), round(-push.y, 3)], **{k: v for k, v in p.items()})
    return None, {'layer_hit': layer, '_events': {'impact': [0], 'recovered': [int(round(p['t_end'] * fps))]}}


def op_crouch_gait(rig, rows, d, fps):
    """S16 for women: her captured walk lowered into a crouched gait: the hips dropped by `drop` of the leg's height, the
    trunk bent forward by `lean` (the head kept level), the steps shortened to `stride` of her own at her own cadence. The
    shortening keeps each planted foot still: every key's foot is moved along the travel by (stride - 1) times the
    along-travel place of a ground point that stands still under it (its stance's footprint, which the in-place loop carries
    back at the walk's speed), and through a swing from the last footprint's to the next's; the foot's turn and height as
    captured; the legs by IK. The loop's speed becomes stride times its own."""
    b = d['build']; n = len(rows); N = n - 1 if d.get('_closed_rows', True) else n
    rig.pose(rows[0]); leg = (rig.head('LeftUpperLeg') - rig.head('LeftFoot')).length
    drop = b['drop'] * leg; lean = b['lean']; s = b['stride']
    v = float(d.get('_speed_gait') or 0.0)
    A = {x: [] for x in ('Left', 'Right')}; Rf = {x: [] for x in A}
    for r in rows:
        rig.pose(r)
        for x in A: A[x].append(rig.head(x + 'Foot')); Rf[x].append(rig.wrot(x + 'Foot'))
    along = lambda p: p.dot(FWD)
    # each foot's along-travel place per key: in its stance (plant.py's planted keys, from two keys before them) the
    # captured place moved by (stride - 1) times the footprint's (a ground point the in-place loop carries back at v), so
    # the planted foot stays planted at the new speed stride * v, rolling as captured; the swing between two footprints
    # follows the captured swing's own progress over the ground, arriving two keys early (the foot comes down onto its
    # footprint, as the captured one does onto its own)
    D = {x: [0.0] * n for x in A}; Tov = {x: [None] * n for x in A}
    for x in A:
        st = [tuple(z['planted']) for z in (d.get('_plant') or {}).get('stances', {}).get(x, [])]
        an = np.array([to_file(p) for p in A[x]]); Rfl = np.array([rot_file(q) for q in Rf[x]])
        bal = []
        for r in rows:
            rig.pose(r); bal.append(to_file(rig.head(x + 'Toes')))
        _, _, hl, _ = PL.sole_points(an, np.array(bal), Rfl, fps)
        off_heel = lambda k: from_file(Rfl[k % N] @ hl) - Vector((0.0, 0.0, 0.0)) if False else Vector((float((Rfl[k % N] @ hl)[0]), float(-(Rfl[k % N] @ hl)[2]), float((Rfl[k % N] @ hl)[1])))
        Aal = [along(p) for p in A[x]]
        if not st or N < 4:
            for k in range(n): D[x][k] = (s - 1.0) * Aal[k]
            continue
        k0, k1 = st[0]
        if k1 < k0: k1 += N
        Ac = lambda k: Aal[k % N]
        q = lambda k, kk0: Ac(kk0) - v * (k - kk0) / fps
        stance_val = lambda k, kk0: Ac(k) + (s - 1.0) * q(k, kk0)
        G = lambda k, val: val + s * v * k / fps
        gc = lambda k: Ac(k) + v * k / fps
        T = [None] * N
        for k in range(k0 - 2, k1 + 1):
            val = stance_val(k0, k0) + s * v * (k0 - k) / fps if k < k0 else stance_val(k, k0)
            T[k % N] = val
        a_, b_ = k1, k0 + N - 2
        Ga = G(a_, stance_val(a_, k0)); Gb = G(b_, stance_val(k0 + N, k0 + N) + s * v * 2 / fps)
        full = gc(k0 + N) - gc(a_); pe = (gc(b_) - gc(a_)) / full if abs(full) > 1e-6 else 1.0
        for k in range(a_ + 1, b_):
            ph = max(0.0, min(1.0, ((gc(k) - gc(a_)) / full) / pe)) if abs(full) > 1e-6 and pe > 1e-6 else (k - a_) / (b_ - a_)
            T[k % N] = Ga + (Gb - Ga) * ph - s * v * k / fps
        for k in range(n):
            t_ = T[k % N] if T[k % N] is not None else Aal[k] * s
            D[x][k] = t_ - Aal[k]
        # the two keys before the footprint: the heel set down where it will stand (its place over the ground held, the
        # foot turning about it as captured, its height as captured)
        H0 = A[x][k0 % N] + FWD * D[x][k0 % N] + off_heel(k0)
        for k in (k0 - 2, k0 - 1):
            Hk = H0 + FWD * (s * v * (k0 - k) / fps)
            Ak = Hk - off_heel(k)
            Tov[x][k % N] = Vector((Ak.x, Ak.y, A[x][k % N].z))
        if Tov[x][0] is not None and n > N: Tov[x][N] = Tov[x][0]
    ax = UP.cross(FWD).normalized()
    for k in range(n):
        rig.pose(rows[k])
        hb = rig.pb['Hips']; M = rig.M @ hb.matrix
        hb.matrix = rig.Mi @ (Matrix.Translation(-UP * drop) @ M); rig.update()
        rig.turn('Spine', Quaternion(ax, math.radians(lean * 0.5)), rig.head('Spine'))
        rig.turn('Chest', Quaternion(ax, math.radians(lean * 0.5)), rig.head('Chest'))
        if rig.has('Neck'): rig.turn('Neck', Quaternion(ax, math.radians(-lean * 0.7)), rig.head('Neck'))
        for x in ('Left', 'Right'):
            T = Tov[x][k] if Tov[x][k] is not None else A[x][k] + FWD * D[x][k]
            rig.two_bone(x + 'UpperLeg', x + 'LowerLeg', x + 'Foot', T, FWD * 0.3)
            rig.set_wrot(x + 'Foot', Rf[x][k])
        rows[k] = rig.capture()
    return None, {'drop_m': round(drop, 3), 'lean_deg': lean, 'stride_share': s, 'speed_before': round(v, 3)}


def mirror_rows(rig, rows):
    """Left and right swapped and the body reflected through its mid-plane (a left-handed capture made right-handed): each
    bone takes its mirror twin's turn from the bind, reflected (x -> -x in the clip's frame)."""
    Mx = Matrix(((-1, 0, 0), (0, 1, 0), (0, 0, 1)))
    sw = lambda nm: nm.replace('Left', '#').replace('Right', 'Left').replace('#', 'Right')
    for k, r in enumerate(rows):
        rig.pose(r)
        rel = {nm: rig.rel(nm).to_matrix() for nm in rig.order}
        hips = rig.head('Hips')
        for nm in rig.order:
            src = sw(nm) if sw(nm) in rel else nm
            R = (Mx @ rel[src] @ Mx).to_quaternion() @ rig.bind[nm]
            if nm == 'Hips':
                pb = rig.pb[nm]
                pb.matrix = rig.Mi @ (Matrix.Translation(Vector((-hips.x, hips.y, hips.z))) @ R.to_matrix().to_4x4()); rig.update()
            else:
                rig.set_wrot(nm, R)
        rows[k] = rig.capture()


# ----------------------------------------------------------------------------------------------------------------- the clips
HUMAN_ORDER = ['Hips', 'Spine', 'Chest', 'UpperChest', 'Neck', 'Head'] + [s + b for s in ('Left', 'Right') for b in
              ('Shoulder', 'UpperArm', 'LowerArm', 'Hand', 'UpperLeg', 'LowerLeg', 'Foot', 'Toes')]


def humanoid(arm):
    names = {b.name for b in arm.data.bones}
    mp = {h: h for h in HUMAN_ORDER if h in names}
    ib = sorted(n for n in names if n not in C.HUMAN)
    return {'mapping': mp, 'inbetween': ib,
            'rule': 'explicit: each Humanoid bone is the bone of its own name (LeftHand/RightHand are the hands); every other '
                    'bone is in-between (the wrist twist bones, Neck2, the hip joints, 100STYLE\'s Chest3), held at its rest '
                    'under convention D (docs/MOTION_ROOT_CAUSE.md §7, motion v6.1)'}


def evidence_for(d):
    ev = {'S1a': ['R31', 'R9', 'R10', 'cal'], 'S1b': ['R7', 'R8'], 'S1d': ['R17', 'R18', 'here: CMU 02_07 hands 9-27 cm apart'],
          'S2': ['R5', 'R6', 'R7', 'R8'], 'S3': ['R8'], 'S5': ['R12', 'R13'], 'S6a': ['R1', 'R2', 'R17'], 'S6b': ['R17', 'R18'],
          'S8': ['R1', 'R2'], 'S10': ['R19', 'R20', 'R21', 'R22', 'B11', 'B12', 'src B1 (XCOM 2 HurtFront/Back/Left/Right)'],
          'S16': ['cal', 'here: CMU 136_10 (a man), 100STYLE Crouched'], 'S17': ['cal'], 'S18': ['here: 100STYLE LeanLeft_ID'],
          'S20': ['design'], 'S21': ['R9', 'R10', 'R11']}
    return ev.get(d.get('state'), [])


def pin_feet(rig, rows, pin):
    """combat v4.2 (G13): a held stance's ankles set, every key, where the clip it follows leaves them (`pin`: Left/Right
    ankle positions in this clip's file frame, metres; `from`: that clip). For a hold cut from the same take as the clip
    before it, whose two plantings differ (the crouch-down's held contact points against the hold's own): the legs by
    two-bone IK, each foot's turn kept as captured. Returns the record (the largest move)."""
    worst = 0.0
    for k in range(len(rows)):
        rig.pose(rows[k])
        for s in ('Left', 'Right'):
            T = from_file(pin[s]); R0 = rig.wrot(s + 'Foot')
            worst = max(worst, (T - rig.head(s + 'Foot')).length)
            rig.two_bone(s + 'UpperLeg', s + 'LowerLeg', s + 'Foot', T, rig.head(s + 'LowerLeg') - rig.head(s + 'UpperLeg') + FRONT * 0.05)
            rig.set_wrot(s + 'Foot', R0)
        rows[k] = rig.capture()
    return {'from': pin['from'], 'max_move_cm': round(worst * 100, 2)}


def lead_in(rig, rows, pin, fps):
    """combat v4.2 (G13): a blow cut from the middle of a captured sequence starts where the sequence left the feet, not
    where the guard sets them (CMU 144_21's punches every half second: the rear foot still turned 5-8° from the punch
    before). Its first key's feet are set on the guard's (`pin`: each foot's ankle and toe joint in the shared frame, the
    guard's first key), blending into the capture's own footwork by `until_s` (the blow's cut: the rear foot pivots through
    it anyway, and the shift stays a slow one): the ankle by two-bone IK, the foot turned about up toward the guard's line.
    Returns the record."""
    T_end = float(pin['until_s']); worst, wturn = 0.0, 0.0
    for k in range(len(rows)):
        t = k / fps; w = 1.0 - smooth(t / max(1e-6, T_end))
        if w <= 0.0: break
        rig.pose(rows[k])
        for s in ('Left', 'Right'):
            A = rig.head(s + 'Foot'); To = rig.head(s + 'Toes')
            tA, tT = from_file(pin[s]['ankle']), from_file(pin[s]['toe'])
            cur = Vector((To.x - A.x, To.y - A.y, 0.0)); tgt = Vector((tT.x - tA.x, tT.y - tA.y, 0.0))
            ang = math.atan2(cur.x * tgt.y - cur.y * tgt.x, cur.dot(tgt))     # from the foot's line to the guard's, about up
            R0 = Quaternion(UP, ang * w) @ rig.wrot(s + 'Foot')
            T = A.lerp(tA, w)
            worst = max(worst, (T - A).length); wturn = max(wturn, abs(math.degrees(ang * w)))
            rig.two_bone(s + 'UpperLeg', s + 'LowerLeg', s + 'Foot', T, rig.head(s + 'LowerLeg') - rig.head(s + 'UpperLeg') + FRONT * 0.05)
            rig.set_wrot(s + 'Foot', R0)
        rows[k] = rig.capture()
    return {'from': pin['from'], 'until_s': T_end, 'max_move_cm': round(worst * 100, 2), 'max_turn_deg': round(wturn, 1)}


def settle_in(rig, rows, pin, fps):
    """combat v4.4 (G13): a clip from another take that follows a hold (a rise from a crouched hold, a duck from a guard)
    starts on the hold's feet. Each foot is set where the hold has it (`pin`: each foot's ankle and toe joint in the shared
    frame, the hold's first key): the ankle by two-bone IK, the foot turned about up onto the hold's line, the captured
    motion kept relative to it, through the foot's first weight-bearing stance (still_stances, G4's rule); between that
    stance's end and the next one's start (the swing) it is carried onto the capture's own landing (smoothstep), so no
    planted foot slides. A foot that never leaves its first stance keeps the hold's place to the clip's end (its stance then
    the hold's). Run before planting (which then holds every stance's contact point). Returns the record."""
    n = len(rows); cap = {s: [] for s in ('Left', 'Right')}; an = {s: [] for s in cap}; ba = {s: [] for s in cap}; Rf = {s: [] for s in cap}
    for k in range(n):
        rig.pose(rows[k])
        for s in cap:
            cap[s].append((rig.head(s + 'Foot').copy(), rig.head(s + 'Toes').copy()))
            an[s].append(to_file(rig.head(s + 'Foot'))); ba[s].append(to_file(rig.head(s + 'Toes'))); Rf[s].append(rot_file(rig.wrot(s + 'Foot')))
    rec = {'from': pin['from']}; W = {}; K0 = {}
    carry = pin.get('swing') == 'carry'
    for s in cap:
        heel, ball, hl, bl = PL.sole_points(np.array(an[s]), np.array(ba[s]), np.array(Rf[s]), fps)
        st = still_stances(heel, ball, fps, PL.sole_floors(heel, ball))
        first = next((x for x in st if x[0] <= 2), None)
        k0 = first[1] if first else 0
        nxt = next((x for x in st if x[0] > k0), None)
        k1 = nxt[0] if nxt else n - 1
        if first and first[1] >= n - 1: k0 = k1 = None                  # never leaves its first stance
        if carry and k0 is not None: k1 = min(k1, k0 + int(round(0.4 * fps)))   # (v4.5: a run's strides: within its first swing)
        K0[s] = k0
        W[s] = [1.0 if k0 is None or k <= k0 else (0.0 if k >= k1 else 1.0 - smooth((k - k0) / max(1, k1 - k0))) for k in range(n)]
        rec[s] = {'stance_ends_s': round(k0 / fps, 3) if k0 is not None else None, 'next_stance_s': round(k1 / fps, 3) if k1 is not None else None}
    worst, wturn = 0.0, 0.0
    for k in range(n):
        rig.pose(rows[k])
        for s in ('Left', 'Right'):
            w = W[s][k]
            if w <= 0.0: continue
            A0, T0 = cap[s][0]; tA, tT = from_file(pin[s]['ankle']), from_file(pin[s]['toe'])
            cur = Vector((T0.x - A0.x, T0.y - A0.y, 0.0)); tgt = Vector((tT.x - tA.x, tT.y - tA.y, 0.0))
            ang = math.atan2(cur.x * tgt.y - cur.y * tgt.x, cur.dot(tgt))
            A = rig.head(s + 'Foot'); off = Vector((tA.x - A0.x, tA.y - A0.y, 0.0))
            if carry and K0[s] is not None and k > K0[s]:
                # (v4.5, `swing: carry`: a clip that travels) past its first stance the foot carries the shift it had at that
                # stance's end, let go over the swing, its captured path not turned (a turned path swings wide over a stride)
                Ak = cap[s][K0[s]][0]; rk = Quaternion(UP, ang) @ Vector((Ak.x - A0.x, Ak.y - A0.y, 0.0))
                D = Vector((A0.x + rk.x + off.x - Ak.x, A0.y + rk.y + off.y - Ak.y, 0.0))
                T = Vector((A.x + D.x * w, A.y + D.y * w, A.z))
            else:
                # the captured motion about the ankle's first place, turned with the foot onto the hold's line
                rel = Quaternion(UP, ang * w) @ Vector((A.x - A0.x, A.y - A0.y, 0.0))
                T = Vector((A0.x + rel.x + off.x * w, A0.y + rel.y + off.y * w, A.z))
            R0 = Quaternion(UP, ang * w) @ rig.wrot(s + 'Foot')
            worst = max(worst, (T - A).length); wturn = max(wturn, abs(math.degrees(ang * w)))
            rig.two_bone(s + 'UpperLeg', s + 'LowerLeg', s + 'Foot', T, rig.head(s + 'LowerLeg') - rig.head(s + 'UpperLeg') + FRONT * 0.05)
            rig.set_wrot(s + 'Foot', R0)
        rows[k] = rig.capture()
    rec.update(max_move_cm=round(worst * 100, 2), max_turn_deg=round(wturn, 1))
    return rec


def build_framed(d, take):
    """combat2fbx.build in a chain's shared frame (combat v4.1, docs/COMBAT_ANIMATION_STANDARD.md G13): every clip of one
    take's chain turned by the same yaw about the same origin (`frame`: yaw in radians about +Y, origin x, z in the take's
    own coordinates), never re-centred per clip (a seamed loop keeps the take's place), so the clips stand where the take
    stood them against each other. Imported based upon Original (the json's `root_basis: take`), the game places each clip
    in that frame; based upon the first key's centre of mass and body orientation (Unity's default as the importer sets
    it) each clip would stand where its own first key puts it, which a raise or an aim moves (G13)."""
    rows, pts, fps, hip, floor, meta, write, n = take
    fr = d['frame']
    Y = Quaternion((0.0, 1.0, 0.0), float(fr['yaw'])); o = Vector((float(fr['origin'][0]), 0.0, float(fr['origin'][1])))
    for r in rows:
        p = Y @ Vector((r['pos'].x - o.x, 0.0, r['pos'].z - o.z))
        r['pos'] = Vector((p.x, r['pos'].y - floor, p.z))
        r['loc']['root'] = (Y @ r['loc']['root']).normalized()
    if d.get('loop') == 'seam':
        seam = round(d.get('seam', 1.0) * fps); P = len(rows) - seam
        P = C.refine_seam([r['key'] for r in rows], P, seam, round(0.5 * fps)) if all('key' in r for r in rows) else P
        cyc = C.cut_loop(rows, 0, P, seam)
        out = C.resample_loop(cyc, C.OUT_FPS)
    elif d.get('loop') == 'pingpong':
        # a still stretch too short to loop on its own seam (CMU 79_96 stands 1.6 s before its raise: a seam loop chose a
        # 0.55 s cycle, under a breath): played forward and back, a closed loop of twice its length whose turns, on a stance
        # that barely moves, are under the capture's own sway
        out = C.resample_loop([{'loc': r['loc'], 'pos': r['pos']} for r in rows + rows[-2:0:-1]], C.OUT_FPS)
    elif d.get('loop') == 'pingpong_ease':
        # (v4.2) a guard held still between blows (0.2-0.7 s) whose hands still drift: forward and back as above, its time eased
        # at both turns (smoothstep) so it turns at rest, not with a jerk (the plain turn read 2-7 cm against the 0.5 limit)
        # (`stretch`: a window too short to turn at rest in its own time, 0.23 s, played that many times slower: a held guard)
        n = len(rows); fwd = []; N = max(2, int(round(n * float(d.get('stretch', 1.0)))))
        for i in range(N):
            t = (n - 1) * (lambda x: x * x * (3.0 - 2.0 * x))(i / max(1, N - 1)); a_ = int(min(n - 2, t)); f_ = t - a_
            ra, rb = rows[a_], rows[a_ + 1]
            fwd.append({'loc': {k: C.slerp(ra['loc'][k], rb['loc'][k], f_) for k in ra['loc']}, 'pos': ra['pos'].lerp(rb['pos'], f_)})
        out = C.resample_loop(fwd + fwd[-2:0:-1], C.OUT_FPS)
    else:
        out = C.resample([{'loc': r['loc'], 'pos': r['pos']} for r in rows], C.OUT_FPS)
    a, b = out[0]['pos'], out[-1]['pos']
    return out, (b.x - a.x, b.z - a.z), hip, meta, write, fps, n, floor


def make(d, out_dir):
    global FRONT
    name = d['name']; built = bool(d.get('built')); fps = C.OUT_FPS
    d = dict(d)
    fr_ = d.get('frame')
    FRONT = -FWD if fr_ and not str(fr_.get('ref', '')).startswith('pass 1') else FWD.copy()
    if d.get('mirror'): d['face'] = {'strike_R': 'strike_L', 'strike_L': 'strike_R'}.get(d.get('face'), d.get('face'))
    K.reset()
    tmp = os.path.join(out_dir, '_tmp'); os.makedirs(tmp, exist_ok=True)
    bvh = os.path.join(tmp, name + '.bvh')
    speed = 0.0; travel = (0.0, 0.0); floor = 0.0
    if d.get('loop') == 'gait':
        out, speed, hip, meta, write, src_fps = gait_rows(d)
        n_src = None; d['_speed_gait'] = speed
    else:
        if d['db'] == 'cmu' and d.get('range'): d['range'] = tuple(d['range'])
        t = take(d)
        if t is None: print('  skip', name, '(no source)'); return None
        out, travel, hip, meta, write, src_fps, n_src, floor = build_framed(d, t) if d.get('frame') else CF.build(d, t)
    write(bvh, out)
    bpy.ops.import_anim.bvh(filepath=bvh, axis_forward='-Z', axis_up='Y', global_scale=1.0, frame_start=1, use_fps_scale=False,
                            update_scene_fps=False, update_scene_duration=True, rotate_mode='QUATERNION')
    os.remove(bvh)
    sc = bpy.context.scene; sc.render.fps = fps; sc.render.fps_base = 1.0
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); arm.name = name
    rows = sample(arm, len(out))
    rig = Rig(arm)
    side = {}; track = None; ops = []
    if d.get('mirror'): mirror_rows(rig, rows); ops.append('mirror')
    b = d.get('build') or {}
    if b.get('op') == 'hit':
        _, info = op_hit(rig, rows, d, fps); side.update(info); ops.append('hit layer')
    if b.get('op') == 'crouch_gait':
        _, info = op_crouch_gait(rig, rows, d, fps); side['crouch_gait'] = info; speed *= b['stride']; ops.append('crouch gait by leg IK')
    if d.get('settle_in'):
        side['settle_in'] = settle_in(rig, rows, d['settle_in'], fps); ops.append("feet set on " + d['settle_in']['from'] + "'s, each carried to the capture's landing in its first swing")
    if d.get('plant', True) and d.get('loop') != 'gait' and not os.environ.get('SF_NO_PLANT'):   # (SF_NO_PLANT=1: unplanted, for comparison)
        side['plant_record'] = plant(rig, rows, fps)
        side['plant_record']['second_pass'] = plant(rig, rows, fps)     # the stances the planted clip shows, held too
        side['plant_record']['third_pass'] = plant(rig, rows, fps)
        ops.append('feet planted')
    if d.get('pin_feet'):
        side['pin_feet'] = pin_feet(rig, rows, d['pin_feet']); ops.append('ankles set where ' + d['pin_feet']['from'] + ' leaves them')
    if d.get('lead_in'):
        side['lead_in'] = lead_in(rig, rows, d['lead_in'], fps); ops.append('first key\'s feet on ' + d['lead_in']['from'] + "'s, into the capture's by its cut")
    op = b.get('op')
    info = None
    if d.get('ik'): track, info = op_grip(rig, rows, d, fps); ops.append('weapon hands by IK (' + d['ik']['mode'] + ')')
    elif op == 'hold': track, info = op_hold(rig, rows, d, fps); ops.append('ready hold by IK')
    elif op == 'aim': track, info = op_aim(rig, rows, d, fps); ops.append('shoulder aim by IK')
    elif op == 'pistol_aim': track, info = op_pistol_aim(rig, rows, d, fps); ops.append('pistol aim by IK')
    elif op == 'reload': track, info = op_reload(rig, rows, d, fps); ops.append('reload hand path by IK')
    elif op == 'arc': track, info = op_arc(rig, rows, d, fps); ops.append('blade line on the captured blow')
    elif op == 'club2': track, info = op_arc(rig, rows, d, fps, club=True); ops.append('two-handed haft on the captured blow')
    elif op == 'hands_up': track, info = op_hands_up(rig, rows, d, fps); ops.append('hands up by IK')
    if info:
        ev = info.pop('_events', None)
        if ev: side['_events'] = ev
        side['ik_record'] = info
    if op == 'hit' and side.get('_events') is None: pass
    if op in ('reload', 'hands_up') and d.get('plant', True):
        side['plant_record'] = plant(rig, rows, fps); side['plant_record']['second_pass'] = plant(rig, rows, fps)
        side['plant_record']['third_pass'] = plant(rig, rows, fps)
        ops.append('feet planted (after the stance was lengthened)')
    write_action(arm, rows, name)
    sc.frame_start = 1; sc.frame_end = len(rows)      # the FBX exporter bakes the scene's range
    C.t_pose_key(arm, sc)
    ib = C.straighten_inbetweens(arm, len(rows))
    path = os.path.join(out_dir, name + '.fbx')
    bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); bpy.context.view_layer.objects.active = arm
    bpy.ops.export_scene.fbx(filepath=path, use_selection=True, apply_scale_options='FBX_SCALE_ALL', axis_forward='-Z', axis_up='Y', object_types={'ARMATURE'},
                             add_leaf_bones=False, bake_anim=True, bake_anim_use_all_bones=True, bake_anim_use_nla_strips=False, bake_anim_use_all_actions=False,
                             bake_anim_force_startend_keying=True, bake_anim_step=1.0, bake_anim_simplify_factor=0.0, path_mode='STRIP')
    K.write_model_meta(path, f'{REL}/{name}.fbx')
    loop = bool(d.get('loop'))
    tl = math.hypot(*travel)
    root = bool(d.get('root')) or ((not loop) and tl > 0.15)
    sex = d.get('sex') or meta['sex']
    events = dict(d.get('events_frames') or {}); events.update(side.pop('_events', {}) or {})
    timing = None
    if d.get('timing'):
        timing = dict(J.TIMING[d['timing']]); timing['ref'] = d['timing']
        if d.get('timing_measured'): timing['measured'] = d['timing_measured']
    js = dict(name=name, src=meta['src'], loop=loop, speed=round(float(speed), 3), root=bool(root), hip=round(float(hip), 4), fps=fps, frames=len(rows),
              src_fps=meta['src_fps'], sex=sex, sex_source=d.get('sex_source') or meta.get('sex_source'), set=d.get('set', {'f': 'f', 'm': 'm'}.get(sex, 'both')),
              licence=meta['licence'], source=meta['source'], state=d.get('state'), gate=d.get('gate'), kind=d.get('kind', ''), weapon=d.get('weapon', 'any'),
              two_hands=bool(track and track.off and any(k['w_off'] > 0 for k in track.keys)),
              source_kind='built' if built else 'captured',
              authoring=(f"built on capture {meta['src']} (" + '; '.join(ops) + ')') if built else ('captured (' + ('; '.join(ops) or 'as captured') + ')'),
              evidence=evidence_for(d) if built else None, range=list(d['range']) if d.get('range') else None, facing=d.get('face', 'mean'),
              travel_m=[round(travel[0], 3), round(travel[1], 3)], root_note=('travels %.2f m: apply as root motion' % tl) if root else 'in place',
              closed=(d.get('loop') == 'gait' and not d.get('_open')), cycle=C.REFINE if d.get('loop') == 'gait' else None, flips_repaired=d.get('_flips') or None,
              inbetween=ib or None, resolved=bool(meta.get('resolved')), floor_shift_m=-floor if floor else 0.0, mirrored=bool(d.get('mirror')),
              events=events or None, events_kind=d.get('events'), timing=timing, humanoid=humanoid(arm), replaces=d.get('replaces'), stature_est_m=d.get('stature_est_m'),
              speed_root=round(d['_speed_root'], 3) if d.get('_speed_root') else None, plant=PL.summary(d.get('_plant')) if d.get('_plant') else None)
    if d.get('frame'):
        # combat v4.1 (G13): the clip stands in its chain's shared frame; the importer places it there (Root Transform
        # Rotation and Position XZ baked, based upon Original) instead of at its own first key's centre of mass
        js['root_basis'] = 'take'
        js['chain'] = d.get('chain')
        js['frame'] = {'yaw_deg': round(math.degrees(float(d['frame']['yaw'])), 3), 'origin_m': [round(float(v), 4) for v in d['frame']['origin']],
                       'ref': d['frame'].get('ref'), 'note': d['frame'].get('note')}
        if d['frame'].get('front'): js['frame']['front'] = d['frame']['front']     # (v4.6: what sets the frame's front)
    if d.get('root_travel'):
        # combat v4.2 (G13): a clip whose root motion the game applies, and where its root stands at the cut the next state
        # is written (that state's `after`)
        js['root_travel'] = d['root_travel']
    if d.get('resolve_at') and events and events.get(d['resolve_at']):
        # combat v4.5: the key at which CombatMotion resolves the action (the projectile leaves, the next turn may start); the
        # rest of the clip is its recovery, which plays on and which the next order may blend out (README of the v4.5 stage)
        k = int(events[d['resolve_at']][0])
        js['resolve_at'] = {'event': d['resolve_at'], 'frame': k, 's': round(k / fps, 3), 'recovery_s': round((len(rows) - 1 - k) / fps, 3)}
    if d.get('step_arms'):
        # combat v4.4: a re-stance step whose hands leave or take up the fighting guard ('lower', 'raise'); the runtime picks
        # it only out of or into a guard (README of the v4.4 stage)
        js['step_arms'] = d['step_arms']
    if d.get('root_apply'):
        # combat v4.4: a clip whose horizontal root motion the game applies (Core CombatMotion: RootXZ.Apply), named here so the
        # stance audit places its pose against each key's own centre of mass
        js['root_apply'] = True
    if d.get('after'):
        js['after'] = {'clip': d['after'], 'note': "written with its origin where that clip's applied root motion leaves the root at its cut, "
                                                  "+Z that clip's first-key body orientation (root_basis: take)"}
    if d.get('loop') == 'gait':
        # the body's facing against its travel (+Z): 0 walking forward, 180 backward, +/-90 sideways (the editor turns the root)
        rig.pose(rows[len(rows) // 2]); acc = Vector((0.0, 0.0, 0.0))
        for r in rows[::3]:
            rig.pose(r); l = rig.head('LeftUpperLeg') - rig.head('RightUpperLeg'); acc += l.cross(UP)
        js['travel_vs_facing_deg'] = round(math.degrees(math.atan2(acc.x * FWD.y - acc.y * FWD.x, acc.x * FWD.x + acc.y * FWD.y)), 1)
    js.update(side)
    if track: js['ik'] = track.json()
    if d.get('weapon') in ('long', 'pistol') and d.get('state') in ('S1a', 'S1b', 'S2', 'S3', 'S17', 'S18', 'S21'):
        js['layer_recoil'] = RECOIL['pistol' if d['weapon'] == 'pistol' else 'long']
    js = {k: v for k, v in js.items() if v is not None}
    with open(os.path.join(out_dir, name + '.json'), 'w') as f: json.dump(js, f, indent=1)
    C.verify_inbetweens(path)
    print(f"clip {name}: {len(rows)} frames @30 from {meta['src_fps']} fps, {'built' if built else 'captured'}, sex {sex}, ops: {', '.join(ops) or '-'}")
    return js


RECOIL = {   # the runtime recoil layer (S4; Fighter.Recoil): a kick that peaks within tens of milliseconds and settles in 0.1-0.3 s
    'long': dict(kick_chest_pitch_deg=2.6, shoulder_push_cm=1.5, rise_s=0.03, settle_tau_s=0.10, burst_climb_deg=0.6,
                 shotgun=dict(kick_chest_pitch_deg=5.0, shoulder_push_cm=3.0, settle_tau_s=0.25),
                 bolt_cycle=dict(main_hand_to_bolt_s=0.8, path='grip -> bolt handle up and back -> forward and down -> grip (design)'),
                 evidence=['R6 (bracing before a live round)', 'R26 (recoil momentum = the projectile\'s and the gas\'s)', 'design: settles as exp(-t/0.1 s), Fighter.Recoil']),
    'pistol': dict(muzzle_flip_deg=7.0, wrist_share=0.6, elbow_share=0.4, rise_s=0.025, settle_tau_s=0.12,
                   evidence=['R26', 'design: the wrists and elbows take the kick (standard S4)']),
}


def main():
    a = sys.argv[sys.argv.index('--') + 1:]
    plan, out_dir = json.load(open(a[0])), a[1]
    only = set(a[2].split(',')) if len(a) > 2 else None
    os.makedirs(out_dir, exist_ok=True)
    done, failed = [], []
    for d in plan:
        if only and d['name'] not in only: continue
        if d.get('missing'): failed.append((d['name'], 'missing source')); continue
        try:
            if make(d, out_dir): done.append(d['name'])
        except SystemExit as e:
            failed.append((d['name'], str(e))); print('FAILED', d['name'], e)
    tmp = os.path.join(out_dir, '_tmp')
    if os.path.isdir(tmp) and not os.listdir(tmp): os.rmdir(tmp)
    print(f'combat v4: {len(done)} clips; failed: {failed}')


if __name__ == '__main__':
    main()
