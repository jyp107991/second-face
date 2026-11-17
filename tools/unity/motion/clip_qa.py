"""Clip QA gate: every motion clip checked before the editor imports it (docs/MOTION_ROOT_CAUSE.md T2a).

Checks, per clip (the converter's FBX + json) and per source trial (CMU ASF/AMC, ACCAD BVH):
  rate      the frame rate: the database's listing, the subject's own jumps (gravity fitted to the pelvis in flight; a rate
            misread by 2x reads g as 39 or 2.5 m/s^2), and for gaits the cadence (a misread rate doubles or halves it)
  speed     gaits: speed, cadence, step length, walk ratio (step length / cadence) and step length over stature against
            published norms by sex (Bohannon & Williams Andrews 2011; Sekiya & Nagasaki 1998; Hollman et al. 2011)
  seam      loops: the jump at the loop's seam (cm, the largest joint jump less the mean of its neighbours' steps)
  slide     a planted foot's slide (cm/s): the in-place gaits against their own speed, the idles against zero
  bones     bone lengths constant (cm, largest deviation of any parent-child distance)
  sex       the source person's sex as the database records it, against the set the clip is used for
  flips     the largest rotation of any joint between two keys, from the FBX's own curves (fails above 60°)
  inbetween each in-between bone (between two Humanoid bones: Neck2, the wrists' twist bones, the hip joints) holds its rest
            rotation (the converter's record) in the bind and every frame (fails above 0.5°); the bind-vs-mean-take angle is
            reported only
  configuration  Unity's own in-between rule: each in-between bone in every frame against the avatar configuration the clip
            is imported with (the staged .meta's, or with --project the project's .meta: its stored humanDescription.skeleton;
            none stored, Unity builds it from the file's first frame); fails above 0.5° (Unity's "Rig Error: Avatar Rig
            Configuration mis-match"; reproduces Unity's figures to 1e-4°)
  stance    gaits: the planted foot as the editor measured it in game (2026-11-17): the loop as Loop Pose plays it, its travel
            added, each stance from the key before touchdown to toe-off, key by key, the ground speed of the slower of the
            ankle and the ball and of the contact point (the lower sole point); fails where the slowest of the three moves
            over 0.1 m/s from the second key after touchdown to toe-off (plant.py: stance_measure)

    # 1. dump the clips' joints (Blender, the converter's output)
    blender -b --factory-startup --python tools/unity/motion/clip_qa.py -- dump <out_dir> <clip.fbx> [...]
    # 2. the gate (numpy)
    python3 -I tools/unity/motion/clip_qa.py qa <dump_dir> <clip json dir> <out.json> [--cmu <dirs>] [--accad <dir>]
        [--project <the Unity project's Motion folder>: judge the configuration against the .meta files there]
    # 3. two sets' stance measures side by side (each a qa output)
    python3 -I tools/unity/motion/clip_qa.py compare <qa_a.json> <qa_b.json> [<out.json>]
"""
import json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
BONES = ['Hips', 'Spine', 'Chest', 'UpperChest', 'Neck', 'Head', 'LeftShoulder', 'LeftUpperArm', 'LeftLowerArm', 'LeftHand', 'RightShoulder',
         'RightUpperArm', 'RightLowerArm', 'RightHand', 'LeftUpperLeg', 'LeftLowerLeg', 'LeftFoot', 'LeftToes', 'RightUpperLeg', 'RightLowerLeg',
         'RightFoot', 'RightToes']
ROTS = ['Hips', 'Chest', 'UpperChest', 'Head', 'LeftFoot', 'RightFoot']


def dump(out_dir, paths):
    """Blender side: import each FBX and write its joints per frame (file axes: Y up, the clip's +Z forward) to <name>.npz."""
    import bpy, numpy as np
    from mathutils import Matrix
    os.makedirs(out_dir, exist_ok=True)
    # Blender's world from the FBX's (forward -Z, up Y): file (x, y, z) = blender (x, z, -y)
    B2F = Matrix(((1, 0, 0), (0, 0, 1), (0, -1, 0)))
    for path in paths:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.fbx(filepath=path, axis_forward='-Z', axis_up='Y', automatic_bone_orientation=False)
        arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
        act = arm.animation_data.action if arm.animation_data else None
        f0, f1 = (int(act.frame_range[0]), int(act.frame_range[1])) if act else (1, 1)
        sc = bpy.context.scene
        side = os.path.splitext(path)[0] + '.json'
        meta = json.load(open(side)) if os.path.exists(side) else {}
        blended = bool(act and meta.get('loop') and not meta.get('closed'))
        if blended:
            # an open loop as Unity's Loop Pose plays it: each curve's end-to-start mismatch spread over the clip (rotations by
            # slerp, locations linearly), so its last key meets its first (motion v5's loops end open, as v1's, jog_test)
            from mathutils import Quaternion
            n = f1 - f0
            for pb in arm.pose.bones:
                q = [act.fcurves.find(f'pose.bones["{pb.name}"].rotation_quaternion', index=i) for i in range(4)]
                l = [act.fcurves.find(f'pose.bones["{pb.name}"].location', index=i) for i in range(3)]
                if all(q):
                    Q = [Quaternion([c.evaluate(f) for c in q]) for f in range(f0, f1 + 1)]
                    D = Q[0] @ Q[-1].inverted()
                    if D.w < 0: D = -D
                    for k, f in enumerate(range(f0, f1 + 1)):
                        v = Quaternion().slerp(D, k / max(1, n)) @ Q[k]
                        for i, c in enumerate(q): c.keyframe_points.insert(f, v[i], options={'REPLACE', 'FAST'})
                if all(l):
                    L = [[c.evaluate(f) for c in l] for f in range(f0, f1 + 1)]
                    for k, f in enumerate(range(f0, f1 + 1)):
                        for i, c in enumerate(l): c.keyframe_points.insert(f, L[k][i] + (k / max(1, n)) * (L[0][i] - L[-1][i]), options={'REPLACE', 'FAST'})
            for c in act.fcurves: c.update()
        names = [b for b in BONES if b in arm.pose.bones]
        rest = {b: (arm.matrix_world @ arm.data.bones[b].matrix_local).to_3x3().normalized() for b in ROTS if b in arm.pose.bones}
        P = {b: [] for b in names}; R = {b: [] for b in rest}; tips = {'LeftToeTip': [], 'RightToeTip': [], 'HeadTop': []}
        frames = list(range(max(1, f0), f1 + 1))
        for f in frames:
            sc.frame_set(f)
            for b in names:
                m = arm.matrix_world @ arm.pose.bones[b].matrix
                P[b].append(list(B2F @ m.translation))
            for b in rest:
                m = (arm.matrix_world @ arm.pose.bones[b].matrix).to_3x3().normalized() @ rest[b].inverted()
                R[b].append([list(r) for r in (B2F @ m @ B2F.transposed())])
            for t, b in (('LeftToeTip', 'LeftToes'), ('RightToeTip', 'RightToes'), ('HeadTop', 'Head')):
                if b in arm.pose.bones:
                    tips[t].append(list(B2F @ (arm.matrix_world @ arm.pose.bones[b].tail)))
        name = os.path.splitext(os.path.basename(path))[0]
        arrs = {'P_' + k: np.array(v) for k, v in P.items()}
        arrs.update({'R_' + k: np.array(v) for k, v in R.items()})
        arrs.update({'P_' + k: np.array(v) for k, v in tips.items() if v})
        arrs['fps'] = np.array(sc.render.fps / sc.render.fps_base)
        arrs['frames'] = np.array(frames); arrs['loop_blended'] = np.array(int(blended))
        np.savez_compressed(os.path.join(out_dir, name + '.npz'), **arrs)
        print('dumped', name, len(frames), 'frames')


# ---------------------------------------------------------------------------------------------------------------------------------
# the gate (numpy)
# Published gait norms used (comfortable speed unless said):
#   speed by sex and decade, 20-59 y: men 1.36-1.43 m/s, women 1.31-1.39 m/s (Bohannon & Williams Andrews 2011, meta-analysis);
#   cadence 100-125 steps/min at comfortable speed; women ~5-8 steps/min faster with shorter steps at the same speed (Hollman
#   et al. 2011; Frimenko et al. 2015, meta-analysis: men take longer steps, women a higher cadence); the walk ratio (step
#   length m / cadence steps/min) below.
#   Running/jogging 2.2-4.5 m/s: 150-190 steps/min (Cavanagh & Kram 1989; Heiderscheit et al. 2011).
# the walk ratio at preferred speed 0.60 +/- 0.07 cm/(steps/min), invariant from preferred to fast walking and between the
# sexes but for fast walking (women 0.56, men 0.61) (Bogen et al. 2018): held to its mean +/- 2 sd
NORMS = {'walk_cadence': (80, 135), 'walk_ratio_m': (0.0046, 0.0074), 'walk_ratio_f': (0.0046, 0.0074), 'run_cadence': (145, 200)}
SEX = {  # the database's own record of the source person's sex (CMU records none but in a subject's title)
    '111': 'f (pregnant)', '113': 'f (after pregnancy)', '114': 'f (pregnant)', '106': 'f', '141': 'f (= 106, "Female General Subject")',
    '104': 'm', '144': 'f'}
FPS_LISTED = {'77': 60, '75': 60, '79': 60, '80': 60}   # the index; every CMU trial used confirmed by its C3D header
FPS_TRUE = {'141': 60, '106': 60, '143': 60}   # listed 120; their own jumps fit 56-61 (docs/qa/motion_calibration.md)


def _np():
    import numpy as np
    return np


def load_dump(path):
    np = _np()
    sys.path.insert(0, os.path.join(HERE, '..', '..', 'qa', 'calibration'))
    import skel
    d = np.load(path)
    P = {k[2:]: d[k] for k in d.files if k.startswith('P_')}
    R = {k[2:]: d[k] for k in d.files if k.startswith('R_')}
    return skel.Motion(P, R, float(d['fps']), {'src': os.path.basename(path)})


def _fbx_tree(path):
    """A small reader of binary FBX 7.x (nodes, properties, zlib arrays): the Objects and Connections sections."""
    import struct, zlib
    np = _np()
    b = open(path, 'rb').read()
    big = struct.unpack('<I', b[23:27])[0] >= 7500

    def prop(o):
        t = chr(b[o]); o += 1
        if t in 'YCILFD':
            fmt = {'Y': '<h', 'C': '<?', 'I': '<i', 'L': '<q', 'F': '<f', 'D': '<d'}[t]; n = struct.calcsize(fmt)
            return struct.unpack(fmt, b[o:o + n])[0], o + n
        if t in 'fdlib':
            ln, enc, cl = struct.unpack('<III', b[o:o + 12]); o += 12
            raw = b[o:o + cl]; o += cl
            if enc: raw = zlib.decompress(raw)
            return np.frombuffer(raw, dtype='<' + {'f': 'f', 'd': 'd', 'l': 'q', 'i': 'i', 'b': '?'}[t], count=ln), o
        if t in 'SR':
            ln = struct.unpack('<I', b[o:o + 4])[0]; o += 4
            v = b[o:o + ln]; o += ln
            return (v.decode('utf-8', 'replace') if t == 'S' else v), o
        raise ValueError(t)

    def node(o):
        if big: end, n_, _ = struct.unpack('<QQQ', b[o:o + 24]); o += 24
        else: end, n_, _ = struct.unpack('<III', b[o:o + 12]); o += 12
        nl = b[o]; o += 1
        name = b[o:o + nl].decode(); o += nl
        if end == 0: return None, o
        props = []
        for _ in range(n_):
            v, o = prop(o); props.append(v)
        kids = []
        while o < end:
            k, o2 = node(o)
            if k is None: o = o2; break
            kids.append(k); o = o2
        return (name, props, kids), end
    o, top = 27, []
    while o < len(b) - 200:
        n, o2 = node(o)
        if n is None: break
        top.append(n); o = o2
    objs = [n for n in top if n[0] == 'Objects'][0][2]; conns = [n for n in top if n[0] == 'Connections'][0][2]
    return objs, conns


def fbx_rotation_curves(path):
    """Every node's local rotation curves as the FBX file stores them (what Unity reads): {name: (N, 3) Euler degrees}
    (AnimationCurve -> AnimationCurveNode 'Lcl Rotation' -> Model connections)."""
    np = _np()
    objs, conns = _fbx_tree(path)
    models = {n[1][0]: n[1][1].split('\x00')[0] for n in objs if n[0] == 'Model'}
    curves = {n[1][0]: n for n in objs if n[0] == 'AnimationCurve'}
    cnodes = {n[1][0] for n in objs if n[0] == 'AnimationCurveNode'}
    c2 = [(c[1][1], c[1][2], c[1][3] if len(c[1]) > 3 else None) for c in conns]
    out = {}
    for cn in cnodes:
        tgt = [(d, p) for s_, d, p in c2 if s_ == cn and d in models]
        if not tgt or tgt[0][1] != 'Lcl Rotation': continue
        ax = {}
        for s_, d, p in c2:
            if d == cn and s_ in curves: ax[p] = [k for k in curves[s_][2] if k[0] == 'KeyValueFloat'][0][1][0]
        if all(k in ax for k in ('d|X', 'd|Y', 'd|Z')) and len(set(len(ax[k]) for k in ax)) == 1:
            out[models[tgt[0][0]]] = np.stack([ax['d|X'], ax['d|Y'], ax['d|Z']], 1).astype(float)
    return out


def _euler_R(E):
    """FBX Euler XYZ (degrees, R = Rz Ry Rx) -> rotation matrices (N, 3, 3)."""
    np = _np()
    E = np.radians(np.atleast_2d(np.asarray(E, float))); x, y, z = E[:, 0], E[:, 1], E[:, 2]
    cx, sx, cy, sy, cz, sz = np.cos(x), np.sin(x), np.cos(y), np.sin(y), np.cos(z), np.sin(z)
    return np.stack([np.stack([cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx], 1),
                     np.stack([sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx], 1),
                     np.stack([-sy, cy * sx, cy * cx], 1)], 1)


# Unity's Humanoid bones by their Mecanim names (cmu2fbx.HUMAN): a node between two of them is an in-between bone
HUMAN = {'Hips', 'Spine', 'Chest', 'UpperChest', 'Neck', 'Head', 'Jaw', 'LeftEye', 'RightEye'} | {
    s + b for s in ('Left', 'Right') for b in ('Shoulder', 'UpperArm', 'LowerArm', 'Hand', 'UpperLeg', 'LowerLeg', 'Foot', 'Toes')} | {
    s + f + p for s in ('Left', 'Right') for f in ('Thumb', 'Index', 'Middle', 'Ring', 'Little') for p in ('Proximal', 'Intermediate', 'Distal')}


def inbetween_errors(path, human=None):
    """Unity's in-between check, read from the FBX: for each in-between bone (a node between two Humanoid bones, which the
    avatar holds at its bind rotation), the angle between its bind rotation (the Model's default Lcl Rotation, with any
    Pre/PostRotation: the pose Unity builds the avatar from) and the take's mean rotation (the chordal mean of its curve),
    and the largest over the take's frames. {bone: (mean_deg, max_deg)}. Unity's own figure is computed its own way
    (walk_slow_b v3: Unity 24.5°, this 32.0°): this is the plain angle, and 0 when bind and take agree."""
    np = _np()
    objs, conns = _fbx_tree(path)
    props, names = {}, {}
    for n in objs:
        if n[0] != 'Model': continue
        nm = n[1][1].split('\x00')[0]; names[n[1][0]] = nm; P = {}
        for k in n[2]:
            if k[0] == 'Properties70':
                for p in k[2]:
                    if p[0] == 'P' and p[1][0] in ('Lcl Rotation', 'PreRotation', 'PostRotation'): P[p[1][0]] = [float(v) for v in p[1][4:7]]
        props[nm] = P
    parent = {}
    for c in conns:
        if c[1][0] == 'OO' and c[1][1] in names and c[1][2] in names: parent[names[c[1][1]]] = names[c[1][2]]
    kids = {}
    for ch, pa in parent.items(): kids.setdefault(pa, []).append(ch)
    H = human or HUMAN
    def has_human_below(n):
        return any(k in H or has_human_below(k) for k in kids.get(n, []))
    def has_human_above(n):
        while n in parent:
            n = parent[n]
            if n in H: return True
        return False
    curves = fbx_rotation_curves(path)
    out = {}
    for nm, P in props.items():
        if nm in H or not has_human_above(nm) or not has_human_below(nm): continue
        pre = _euler_R(P.get('PreRotation', [0, 0, 0]))[0]; post = _euler_R(P.get('PostRotation', [0, 0, 0]))[0]
        bind = pre @ _euler_R(P.get('Lcl Rotation', [0, 0, 0]))[0] @ post.T
        take = np.einsum('ij,njk,kl->nil', pre, _euler_R(curves[nm]), post.T) if nm in curves else bind[None]
        U, _, Vt = np.linalg.svd(take.sum(0)); D = np.eye(3); D[2, 2] = np.sign(np.linalg.det(U @ Vt)); mean = U @ D @ Vt
        def ang(A, B): return np.degrees(np.arccos(np.clip((np.einsum('...ij,...ij->...', A, B) - 1) / 2, -1, 1)))
        out[nm] = (float(ang(bind, mean)), float(ang(bind[None], take).max()))
    return out


def inbetween_rest(path, meta):
    """Each in-between bone's largest angle (bind and every frame) from the rest rotation the converter recorded for it."""
    np = _np()
    names = list(inbetween_errors(path).keys())
    objs, _ = _fbx_tree(path); bind = {}
    for n in objs:
        if n[0] != 'Model': continue
        nm = n[1][1].split('\x00')[0]
        for k in n[2]:
            if k[0] == 'Properties70':
                for p in k[2]:
                    if p[0] == 'P' and p[1][0] == 'Lcl Rotation': bind[nm] = [float(v) for v in p[1][4:7]]
    curves = fbx_rotation_curves(path); rec = (meta.get('inbetween') or {}); out = {}
    for nm in names:
        q = (rec.get(nm) or {}).get('rest_lcl_quat')
        if not q: out[nm] = None; continue
        w, x, y, z = q
        R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                      [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
        Rs = np.concatenate([_euler_R(bind.get(nm, [0, 0, 0])), _euler_R(curves[nm]) if nm in curves else np.zeros((0, 3, 3))])
        out[nm] = float(np.degrees(np.arccos(np.clip((np.einsum('ij,nij->n', R, Rs) - 1) / 2, -1, 1))).max())
    return out


def _quat_unity(R):
    """FBX local rotations (N, 3, 3) -> quaternions (N, 4: x y z w) on Unity's axes as its importer stores them for these
    files (Blender's export, forward -Z, up Y: the z axis mirrored, (x, y, z, w) -> (-x, -y, z, w)). Checked against the
    configurations Unity stored for the CMU clips: the hip joints, which no take turns, agree to 0.00°."""
    np = _np()
    R = R if R.ndim == 3 else R[None]
    t = np.einsum('nii->n', R)
    q = np.zeros((len(R), 4))
    for i, m in enumerate(R):
        if t[i] > 0:
            s = math.sqrt(t[i] + 1.0) * 2; q[i] = [(m[2, 1] - m[1, 2]) / s, (m[0, 2] - m[2, 0]) / s, (m[1, 0] - m[0, 1]) / s, 0.25 * s]
        elif m[0, 0] > m[1, 1] and m[0, 0] > m[2, 2]:
            s = math.sqrt(1.0 + m[0, 0] - m[1, 1] - m[2, 2]) * 2; q[i] = [0.25 * s, (m[0, 1] + m[1, 0]) / s, (m[0, 2] + m[2, 0]) / s, (m[2, 1] - m[1, 2]) / s]
        elif m[1, 1] > m[2, 2]:
            s = math.sqrt(1.0 + m[1, 1] - m[0, 0] - m[2, 2]) * 2; q[i] = [(m[0, 1] + m[1, 0]) / s, 0.25 * s, (m[1, 2] + m[2, 1]) / s, (m[0, 2] - m[2, 0]) / s]
        else:
            s = math.sqrt(1.0 + m[2, 2] - m[0, 0] - m[1, 1]) * 2; q[i] = [(m[0, 2] + m[2, 0]) / s, (m[1, 2] + m[2, 1]) / s, 0.25 * s, (m[1, 0] - m[0, 1]) / s]
    return q * np.array([-1.0, -1.0, 1.0, 1.0])


def meta_configuration(meta_path):
    """The avatar configuration a ModelImporter .meta stores (humanDescription.skeleton): {transform: local rotation, x y z w
    on Unity's axes}; {} when the meta stores none (`skeleton: []`, as the converters write it), and Unity builds the
    configuration from the file itself on import. Once Unity has built one it writes it into the .meta and keeps it on every
    later import of a changed file (Avatar setup 'Create From This Model' re-uses a stored description): the project's
    clips imported every set since against the configuration of their first import (2026-10-29 for the old names)."""
    return meta_avatar(meta_path)[1]


def meta_avatar(meta_path):
    """(human, skeleton) stored in a ModelImporter .meta: the transforms mapped to Humanoid bones (humanDescription.human's
    boneName: the CMU clips' stored mappings make the wrist twist bone the Hand), and meta_configuration's skeleton. Both
    empty when the meta stores none."""
    import re
    if not meta_path or not os.path.exists(meta_path): return set(), {}
    txt = open(meta_path).read()
    human = set(re.findall(r'- boneName: (\S+)\n\s+humanName: ', txt.split('\n    skeleton:', 1)[0])) if '\n    human:' in txt else set()
    if '\n    skeleton:' not in txt: return human, {}
    part = txt.split('\n    skeleton:', 1)[1].split('\n    skeletonHasParents', 1)[0]
    ents = re.findall(r'- name: (\S+)\n\s+parentName: ?(\S*)\n\s+position: \{[^}]*\}\n\s+rotation: \{x: (\S+), y: (\S+), z: (\S+), w: (\S+)\}', part)
    return human, {e[0]: [float(v) for v in e[2:6]] for e in ents}


def inbetween_configuration(path, meta_path):
    """Unity's own in-between rule, computed as Unity computes it ("Rig Error: Avatar Rig Configuration mis-match. Inbetween
    bone rotation in configuration does not match rotation in animation file: 'Neck2' : rotation error = N deg"): for each
    in-between bone, the largest angle over the take's frames between its local rotation in the file and its rotation in the
    avatar configuration the clip is imported against. That configuration is the one stored in the .meta it is imported with
    (humanDescription.skeleton); a meta that stores none makes Unity build it from the file as imported, the take's first
    frame (the stored configurations match their takes' first frames: talk's spine and legs within 0.05°, run_c's chest,
    neck and head within 0.03°), so a bone held in every frame reads 0. Measured on motion set v6 imported over the project's
    metas: Unity's twelve figures reproduced to 1e-4° (jog 14.2743, jog_f 39.7747, walk_f_c 45.2163, ...; 2026-11-17).
    The in-between bones are the stored mapping's (Unity's), or the Mecanim names' when none is stored.
    {bone: (deg or None when the stored configuration lacks the bone, 'stored' | 'file')}."""
    np = _np()
    human, conf = meta_avatar(meta_path)
    # the in-between bones by the meta's stored mapping (Unity's), else by the Mecanim names (a fresh mapping; Unity's own
    # auto-mapping made the CMU clips' wrist twist bone the Hand every time it ran, so it may judge fewer bones than this)
    names = list(inbetween_errors(path, human or None).keys())
    if not names: return {}
    curves = fbx_rotation_curves(path)
    objs, _ = _fbx_tree(path); bind = {}
    for n in objs:
        if n[0] != 'Model': continue
        nm = n[1][1].split('\x00')[0]
        for k in n[2]:
            if k[0] == 'Properties70':
                for p in k[2]:
                    if p[0] == 'P' and p[1][0] == 'Lcl Rotation': bind[nm] = [float(v) for v in p[1][4:7]]
    out = {}
    for nm in names:
        q = _quat_unity(_euler_R(curves[nm]) if nm in curves else _euler_R(bind.get(nm, [0, 0, 0])))
        if conf:
            if nm not in conf: out[nm] = (None, 'stored'); continue
            ref, src = np.array(conf[nm]), 'stored'
        else:
            ref, src = q[0], 'file'
        ref = ref / np.linalg.norm(ref)
        out[nm] = (float(np.degrees(2 * np.arccos(np.clip(np.abs(q @ ref), 0, 1))).max()), src)
    return out


def rotation_steps(path):
    """Each node's largest rotation from one key to the next (deg) and its largest Euler-angle step, read from the FBX's
    own curves (FBX Euler XYZ: R = Rz Ry Rx). A flip (a joint turned over between two frames) shows as a step near 180°."""
    np = _np()
    worst = {}
    for name, E in fbx_rotation_curves(path).items():
        x, y, z = [np.radians(E[:, i]) for i in range(3)]
        cx, sx, cy, sy, cz, sz = np.cos(x), np.sin(x), np.cos(y), np.sin(y), np.cos(z), np.sin(z)
        # R = Rz Ry Rx, row by row
        R = np.stack([np.stack([cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx], 1),
                      np.stack([sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx], 1),
                      np.stack([-sy, cy * sx, cy * cx], 1)], 1)
        tr = np.einsum('nji,nji->n', R[:-1], R[1:])
        ang = np.degrees(np.arccos(np.clip((tr - 1) / 2, -1, 1)))
        worst[name] = (float(ang.max()) if len(ang) else 0.0, float(np.abs(np.diff(E, axis=0)).max()) if len(E) > 1 else 0.0)
    return worst


def seam_pop(m):
    """The loop's seam: the largest joint jump from the last frame to the first, less the mean of the steps on either side (cm),
    with the steady travel removed (gaits play in place)."""
    np = _np()
    worst = 0.0
    for k, p in m.P.items():
        a = np.linalg.norm(p[0] - p[-1]); b = np.linalg.norm(p[1] - p[0]); c = np.linalg.norm(p[-1] - p[-2])
        worst = max(worst, a - 0.5 * (b + c))
    return worst * 100


def seam_jerk(m, skip=()):
    """The loop's seam as a jerk (cm): the largest second difference of any joint across the seam (frames N-2, N-1, 0 and
    N-1, 0, 1) beyond that joint's own 99th percentile inside the clip. A natural acceleration through the seam reads 0;
    a pop reads its size. (seam_pop's first difference counts a hand speeding up through the seam as a pop.) A left or right
    joint is held to the larger of its own 99th percentile and its mirror's: a gait's loop starts at the left foot's
    touchdown, and once the feet are planted (motion v6) the left foot's stop falls on the seam while the right foot's same
    stop falls inside the clip (sneak: 5.8 cm, the right foot's own touchdown 5.4). `skip`: joints left out (a planted
    foot touching down at the seam: its stop there is an arrival, not a pop; the caller reports it apart)."""
    np = _np()
    worst = 0.0
    def own(p):
        d2 = np.linalg.norm(p[2:] - 2 * p[1:-1] + p[:-2], axis=1)
        return float(np.percentile(d2, 99)) if len(d2) >= 4 else None
    for k, p in m.P.items():
        ref = own(p)
        if ref is None or k in skip: continue
        mk = k.replace('Left', '#').replace('Right', 'Left').replace('#', 'Right')
        if mk != k and mk in m.P: ref = max(ref, own(m.P[mk]) or 0.0)
        s1 = np.linalg.norm(p[0] - 2 * p[-1] + p[-2]); s2 = np.linalg.norm(p[1] - 2 * p[0] + p[-1])
        worst = max(worst, max(s1, s2) - ref)
    return worst * 100


def stand_checks(m):
    """An idle on its own actor's skeleton, read as the gate reads a standing person (calibration/measures.py): the straighter
    knee (K1 p98 <= 8: Kendall's straight standing knee; docs/MOTION_ROOT_CAUSE.md §7) and the head's pitch (H1 p2 >= -15,
    p98 <= +8), and the arms (A1 p98 <= 20)."""
    import measures as M
    v = M.stand_measures(m)
    r = M.judge(v, {k: M.STAND[k] for k in ('K1', 'H1', 'A1', 'H2', 'H3')})
    return {k: {q: round(r[k][q], 1) for q in ('p2', 'p50', 'p98')} for k in r}, [f"{k}: {r[k]['why']}" for k in r if not r[k]['pass']]


def bone_dev(m):
    np = _np()
    pairs = [('Hips', 'Spine'), ('LeftUpperArm', 'LeftLowerArm'), ('LeftLowerArm', 'LeftHand'), ('RightUpperArm', 'RightLowerArm'), ('RightLowerArm', 'RightHand'),
             ('LeftUpperLeg', 'LeftLowerLeg'), ('LeftLowerLeg', 'LeftFoot'), ('RightUpperLeg', 'RightLowerLeg'), ('RightLowerLeg', 'RightFoot'), ('LeftFoot', 'LeftToes')]
    w = 0.0
    for a, b in pairs:
        if a in m.P and b in m.P:
            L = np.linalg.norm(m.P[a] - m.P[b], axis=1); w = max(w, float(L.max() - L.min()))
    return w * 100


def travelling(m, speed, loops=3):
    """An in-place gait loop played `loops` times with its travel put back (+Z at the clip's speed): the walk the game makes
    of it when it moves the body at that speed, measured like a capture."""
    np = _np()
    sys.path.insert(0, os.path.join(HERE, '..', '..', 'qa', 'calibration'))
    import skel
    n = m.n
    t = np.arange(n * loops) / m.fps
    off = np.stack([np.zeros_like(t), np.zeros_like(t), speed * t], 1)
    P = {k: np.concatenate([v] * loops) + off for k, v in m.P.items()}
    R = {k: np.concatenate([v] * loops) for k, v in m.R.items()}
    return skel.Motion(P, R, m.fps, m.meta)


def foot_slide(m):
    """Planted feet's slide (cm/s): each foot's heel and ball points (calibration/measures.soles) while that foot is in contact
    (its lower sole point within 2.5 cm of the floor, the ankle under 1 m/s, measures.contacts), their horizontal speed."""
    np = _np()
    import measures as M
    so, _ = M.soles(m)
    c = M.contacts(m, so)
    v = []
    for s in ('Left', 'Right'):
        for a, b in c[s]:
            for pt in ('heel', 'ball'):
                p = so[s][pt][a:b]
                if len(p) > 1:
                    d = np.diff(p, axis=0); d[:, 1] = 0
                    v.append(np.linalg.norm(d, axis=1) * m.fps)
    if not v: return {'mean': 0.0, 'p98': 0.0, 'over10': 0.0}
    v = np.concatenate(v) * 100
    return {'mean': float(v.mean()), 'p98': float(np.percentile(v, 98)), 'over10': float(np.mean(v > 10))}


def gait_cycle_params(m, speed, sex):
    """An in-place gait loop: one stride (the converter cuts one), its time, cadence, step length and walk ratio."""
    stride_t = m.n / m.fps
    cad = 120.0 / stride_t
    step = speed * stride_t / 2
    return {'stride_s': round(stride_t, 3), 'cadence': round(cad, 1), 'step_m': round(step, 3), 'walk_ratio': round(step / cad, 5) if cad else None}


def load_source(src, cmu_dirs, accad_dir, fps=None):
    """The capture a clip came from ('CMU 07_01', 'ACCAD Female1_B03_Walk1'), at its true rate."""
    sys.path.insert(0, os.path.join(HERE, '..', '..', 'qa', 'calibration'))
    import skel
    kind, tid = src.split()[0], src.split()[1]
    if kind == 'CMU':
        s = tid.split('_')[0]
        for d in cmu_dirs:
            if os.path.exists(os.path.join(d, s, tid + '.amc')):
                return skel.load_amc(os.path.join(d, s, s + '.asf'), os.path.join(d, s, tid + '.amc'), fps or FPS_TRUE.get(s, FPS_LISTED.get(s, 120)))
        return None
    for d in ([accad_dir] if isinstance(accad_dir, str) else (accad_dir or [])):
        if os.path.exists(os.path.join(d, tid + '.bvh')): return skel.load_bvh(os.path.join(d, tid + '.bvh'))
    return None


def w6_stance(m):
    """W6 on the clip's own skeleton (tools/qa/w6_source.py's rule; docs/PEOPLE_MOTION.md W6): the clip with its travel added,
    each foot's sole points (the ankle and ball joints, each over its own lowest height); the lower foot's height while it is
    still both ways (under 0.5 m/s across the ground and 0.2 m/s up or down) for 3 samples running (cm)."""
    np = _np()
    pts = {s: (m.P[s + 'Foot'], m.P[s + 'Toes']) for s in ('Left', 'Right')}
    lo = {s: (a[:, 1].min(), b[:, 1].min()) for s, (a, b) in pts.items()}
    run = {'Left': 0, 'Right': 0}; out = []
    for i in range(1, m.n):
        h, ok = {}, {}
        for s, (a, b) in pts.items():
            low = np.minimum(a[i, 1] - lo[s][0], b[i, 1] - lo[s][1]); low0 = np.minimum(a[i - 1, 1] - lo[s][0], b[i - 1, 1] - lo[s][1])
            still = min(np.linalg.norm(a[i, [0, 2]] - a[i - 1, [0, 2]]), np.linalg.norm(b[i, [0, 2]] - b[i - 1, [0, 2]])) * m.fps
            vy = abs(low - low0) * m.fps
            run[s] = run[s] + 1 if (still < 0.5 and vy < 0.2) else 0
            h[s] = low
        s = 'Left' if h['Left'] < h['Right'] else 'Right'
        if run[s] >= 3: out.append(float(h[s]) * 100)
    if not out: return None
    out = np.sort(out)
    return {'n': len(out), 'p98': round(float(out[int(0.98 * (len(out) - 1))]), 2), 'max': round(float(out[-1]), 2)}


def combat_checks(m, meta, r, fails, source):
    """The combat set's own checks (COMBAT_ASSETS: doubts 2-4; the combat brief's integration order)."""
    np = _np()
    import measures as M
    # planted feet: a combat one-shot keeps its travel in the pose, so its planted feet must stand still in the clip; held to
    # the capture it came from (+3 cm/s), a hand-keyed clip to the gate's F4 mean (3 cm/s)
    sl = foot_slide(m); r['checks']['slide'] = {k: round(v, 2) for k, v in sl.items()}
    if source is not None:
        ss = foot_slide(source.resample(30.0).resample(60.0) if source.fps > 30.5 else source.resample(60.0))
        r['checks']['slide_source'] = {k: round(v, 2) for k, v in ss.items()}
        if sl['mean'] > ss['mean'] + 3.0:
            fails.append(f"slide: planted feet slide {sl['mean']:.1f} cm/s on average, {sl['mean'] - ss['mean']:.1f} more than the capture's {ss['mean']:.1f}")
    elif sl['mean'] > 3.0:
        fails.append(f"slide: planted feet slide {sl['mean']:.1f} cm/s on average (F4: 3)")
    # the root's travel (doubt 4): the hips' horizontal way from the first frame to the last, the farthest they get, and their
    # height's range; a one-shot that travels over 15 cm must say so (root: true), or the importer bakes it into the pose
    h = m.P['Hips']; d = h[:, [0, 2]] - h[0, [0, 2]]
    end, far = float(np.linalg.norm(d[-1])), float(np.linalg.norm(d, axis=1).max())
    r['checks']['travel_m'] = {'end': round(end, 3), 'farthest': round(far, 3), 'hips_y': [round(float(h[:, 1].min()), 3), round(float(h[:, 1].max()), 3)]}
    if not meta.get('loop') and end > 0.15 and not meta.get('root'):
        fails.append(f'travel: travels {end:.2f} m with root off (baked into the pose, the body leaves its place)')
    if meta.get('loop') and end > 0.03 and not float(meta.get('speed') or 0) > 0.3:   # (a gait travels by its speed)
        fails.append(f'travel: a loop that ends {end * 100:.0f} cm from where it began')
    # two-handed grips: both hands on one rigid weapon keep their distance; a mimed take's hands drift apart and need IK
    # (a reload takes the support hand off the weapon by design)
    if (meta.get('two_hands') or 'two hand' in str(meta.get('weapon', ''))) and 'reload' not in str(meta.get('kind', '')):
        dh = np.linalg.norm(m.P['LeftHand'] - m.P['RightHand'], axis=1) * 100
        spread = float(np.percentile(dh, 98) - np.percentile(dh, 2))
        r['checks']['hands_cm'] = {'mean': round(float(dh.mean()), 1), 'spread_p2_p98': round(spread, 1), 'min': round(float(dh.min()), 1), 'max': round(float(dh.max()), 1)}
        if spread > 2.0:
            fails.append(f'two hands: the hands\' distance varies {spread:.1f} cm (p2-p98; {dh.min():.0f}-{dh.max():.0f} cm): the grip needs IK onto the weapon')
    # the set against the source's sex: women fight with women's captures where they exist
    use, sex = meta.get('set', 'both'), str(r['sex'])
    if use == 'f' and not sex.startswith('f'): fails.append(f"sex: a take of {sex} sex in the women's set")
    if use == 'm' and sex.startswith('f'): fails.append("sex: a woman's take in the men's set")
    # the stance as the gate measures it (for the combat-state limits proposed in docs/qa/motion_calibration.md §7; not judged)
    try:
        v = M.stand_measures(m)
        r['stance'] = {k: [round(float(np.nanpercentile(v[k], q)), 1) for q in (2, 50, 98)] for k in ('K1', 'H1', 'H2', 'H3', 'F2', 'F3w', 'A1', 'A2') if len(v[k])}
    except Exception as e:
        r['stance'] = {'error': str(e)[:80]}


def qa_clips(dump_dir, json_dir, cmu_dirs=(), accad_dir=None, combat=False, project=None):
    """combat: the combat set's checks besides (every clip's planted feet, each one-shot's travel against its root flag, a
    two-handed grip's hands at a near-constant distance, the clip's set against its source's sex, the stance measures).
    project: a folder of the .meta files the clips will be imported over (the Unity project's Assets/SecondFace/Motion); the
    in-between configuration is then judged against the configuration each of those stores, not the staged meta's."""
    np = _np()
    sys.path.insert(0, os.path.join(HERE, '..', '..', 'qa', 'calibration'))
    import measures as M
    rows = []
    for f in sorted(os.listdir(dump_dir)):
        if not f.endswith('.npz'): continue
        name = f[:-4]
        meta = json.load(open(os.path.join(json_dir, name + '.json')))
        m = load_dump(os.path.join(dump_dir, f))
        _z = _np().load(os.path.join(dump_dir, f)); blended = 'loop_blended' in _z.files and bool(_z['loop_blended'])
        if meta.get('loop') and (meta.get('closed') or blended) and m.n > 2:
            # a closed (or loop-blended) loop's last key is its first again: the loop's own frames are all but the last
            m = m.slice(0, (m.n - 1) / m.fps)
        src = meta.get('src', '')
        subj = src.split()[-1].split('_')[0] if src.startswith('CMU') else src
        r = {'clip': name, 'src': src, 'frames': m.n, 'fps': m.fps, 'loop': meta.get('loop'), 'speed': meta.get('speed'), 'checks': {}}
        listed = FPS_LISTED.get(subj, 120)
        true = FPS_TRUE.get(subj, listed)
        if src.startswith('ACCAD'): listed = true = meta.get('src_fps', 30)   # the BVH's own frame time (ACCAD exports at 30)
        assumed = meta.get('src_fps') or (60 if subj == '77' and meta.get('frames', 0) > 400 else 120)
        r['sex'] = {'u': 'not recorded', 'm': 'm', 'f': 'f'}.get(meta.get('sex'), meta.get('sex')) if meta.get('sex') else SEX.get(subj, 'not recorded')
        r['set'] = meta.get('set', 'both (all clips play on everyone before 2026-11-17)')
        r['rate'] = {'listed': listed, 'evidence': true, 'converter_read': meta.get('src_fps', 'unknown (120 before 2026-11-17)')}
        fails = []
        if meta.get('src_fps') and meta['src_fps'] != true: fails.append(f"rate: read at {meta['src_fps']} fps, the subject's evidence says {true}")
        if not meta.get('src_fps') and true != 120: fails.append(f'rate: read at 120 fps (the converter before 2026-11-17), the subject was captured at {true}: plays {120 / true:.0f}x fast')
        if meta.get('loop'):
            # a planted foot (motion v6) that touches down on the seam (a gait's loop starts at the left foot's touchdown)
            # stops there from its arrival speed in one key: that foot's joints are judged by the stance check, not here
            skip = set()
            if float(meta.get('speed') or 0) > 0.3:
                import plant as PL
                st0 = PL.stance_measure(travelling(m, float(meta['speed'])).P, travelling(m, float(meta['speed'])).R, m.fps, m.n)
                for side in ('Left', 'Right'):
                    if any(x['touchdown'] % m.n in (0, 1, m.n - 1) for x in st0[side]):
                        skip |= {side + 'Foot', side + 'Toes', side + 'ToeTip'}
            pop = seam_pop(m); jerk = seam_jerk(m, skip)
            r['checks']['seam_cm'] = round(pop, 2); r['checks']['seam_jerk_cm'] = round(jerk, 2)
            if skip:
                r['checks']['seam_jerk_touchdown'] = {'joints': sorted(skip), 'jerk_cm_with_them': round(seam_jerk(m), 2)}
            # the pop is the jerk (a discontinuity); the step (seam_cm) also counts a fast hand or foot speeding up through
            # the seam, natural motion, and is reported, not judged
            if jerk > 0.5: fails.append(f'seam: a {jerk:.1f} cm jerk at the loop past the clip\'s own')
        if meta.get('joins'):
            # a stride built from a half and its mirror image: each join judged as the seam is, against the clip's own
            # second differences away from the joins
            np_ = _np(); worst = 0.0; n_ = m.n
            near = set((j + k) % n_ for j in meta['joins'] for k in (-2, -1, 0, 1, 2))
            for k_, p in m.P.items():
                d2 = np_.array([np_.linalg.norm(p[(i + 1) % n_] - 2 * p[i] + p[i - 1]) for i in range(n_)])
                ref = float(np_.percentile([d2[i] for i in range(n_) if i not in near], 99))
                for j in meta['joins']:
                    for i in ((j - 1) % n_, j % n_):
                        worst = max(worst, float(d2[i]) - ref)
            r['checks']['joins_jerk_cm'] = round(worst * 100, 2)
            if worst * 100 > 0.5: fails.append(f'joins: a {worst * 100:.1f} cm jerk at a mirrored half\'s join past the clip\'s own')
        if name.startswith('idle'):
            vals, why = stand_checks(m); r['stand'] = vals
            fails += [f'standing {w}' for w in why]
        r['checks']['bones_cm'] = round(bone_dev(m), 3)
        fbx = os.path.join(json_dir, name + '.fbx')
        if os.path.exists(fbx):
            # flips: the largest rotation of any joint from one key to the next, read from the FBX's own curves (a joint
            # turned over in a frame; Unity reported one as an in-between error, 2026-11-17); a voluntary joint turns
            # under ~1500°/s, 50° a frame at 30 fps
            st = rotation_steps(fbx)
            bone, (step, estep) = max(st.items(), key=lambda kv: kv[1][0]) if st else ('', (0.0, 0.0))
            ebone, (_, emax) = max(st.items(), key=lambda kv: kv[1][1]) if st else ('', (0.0, 0.0))
            r['checks']['rot_step_deg'] = {'max': round(step, 1), 'bone': bone, 'euler_max': round(emax, 1), 'euler_bone': ebone}
            if step > 60.0: fails.append(f'flip: {bone} turns {step:.0f}° between two frames')
            # in-between bones (Neck2, the wrists' twist): Unity's Humanoid holds them at the bind rotation, and a take
            # that turns them away from it loses the turn ("Inbetween bone rotation in configuration does not match
            # rotation in animation file", 2026-11-17)
            # Unity's rule as the editor measured it (neck_test, 2026-11-17): an in-between bone must hold its rest rotation in
            # the bind and in every frame (held there, Unity imports it with no Rig Error and discards nothing; straightened, v4
            # read 16-22°; turning, its turn is discarded). The rest is the converter's record (`inbetween.<bone>.rest_lcl_quat`)
            rest = inbetween_rest(fbx, meta)
            r['checks']['inbetween_rest_deg'] = {k: round(v, 2) if v is not None else None for k, v in sorted(rest.items())}
            for k, v in sorted(rest.items()):
                if v is None: fails.append(f'in-between: {k} has no recorded rest rotation (re-export: cmu2fbx.py records it)')
                elif v > 0.5: fails.append(f'in-between: {k} leaves its rest rotation by up to {v:.1f}° (bind or a frame)')
            # Unity's own rule (motion v6.1, 2026-11-17): the take's in-between bones against the avatar configuration the clip
            # is imported with, read from that .meta (humanDescription.skeleton; none stored: Unity builds it from the file).
            # v6 passed inbetween_rest (the files hold Neck2 at its rest, 0.00°) yet Unity reported a Neck2 Rig Error on 12
            # gaits: they were imported over the project's metas, whose stored configurations date from each clip's first
            # import (2026-10-29 for the old names). The figures below reproduce Unity's to 1e-4°.
            cmeta = os.path.join(project, name + '.fbx.meta') if project else fbx + '.meta'
            cfg = inbetween_configuration(fbx, cmeta)
            r['checks']['inbetween_config_deg'] = {k: round(v[0], 4) if v[0] is not None else None for k, v in sorted(cfg.items())}
            r['checks']['inbetween_config_from'] = {k: (f'stored in {cmeta}' if v[1] == 'stored' else f'built from the file ({os.path.basename(cmeta)} stores none)') for k, v in sorted(cfg.items())}
            for k, (v, frm) in sorted(cfg.items()):
                where = 'the configuration stored in ' + os.path.relpath(cmeta) if frm == 'stored' else 'the configuration Unity builds from the file'
                if v is None: fails.append(f'configuration: {k} is missing from {where}')
                elif v > 0.5: fails.append(f"configuration: {k} is {v:.1f}° from {where} (Unity's Rig Error; import the staged .meta, which stores none)")
            ib = inbetween_errors(fbx)
            r['checks']['inbetween_deg'] = {k: {'mean': round(v[0], 2), 'max': round(v[1], 2)} for k, v in sorted(ib.items())}
            # (the bind-vs-mean-take angle is reported, not judged: it read 0 on v4, which Unity rejected, 2026-11-17)
            if emax > 90.0 and emax > 2 * step + 30: fails.append(f'euler: {ebone}\'s angles jump {emax:.0f}° between keys (near gimbal lock)')
        if r['checks']['bones_cm'] > 0.5: fails.append('bones: lengths vary by %.1f cm' % r['checks']['bones_cm'])
        sp = float(meta.get('speed') or 0)
        mt = travelling(m, sp) if sp > 0.3 else m
        source = load_source(src, cmu_dirs, accad_dir) if (cmu_dirs or accad_dir) else None
        if source is not None and meta.get('range') and not sp > 0.3:
            # a gesture or an idle against the stretch of its capture it was cut from (not the whole take)
            source = source.slice(meta['range'][0], meta['range'][1])
        if combat:
            combat_checks(mt, meta, r, fails, source)
        elif not meta.get('root'):
            # a fixed heel or ball point of a rolling real foot moves too (and capture noise): the clip is held to its own
            # capture at the game's rate (30 fps keys, 60 Hz), not to zero
            sl = foot_slide(mt); r['checks']['slide'] = {k: round(v, 2) for k, v in sl.items()}
            if source is not None:
                if sp > 0.3:   # a gait against its capture's steady stretch (not the start or stop of a take)
                    import calibrate
                    seg = calibrate.segments(source, 'walk')
                    if seg: source = source.slice(seg[0][0] / source.fps, seg[0][1] / source.fps)
                ss = foot_slide(source.resample(30.0).resample(60.0) if source.fps > 30.5 else source.resample(60.0))
                r['checks']['slide_source'] = {k: round(v, 2) for k, v in ss.items()}
                if sl['mean'] > ss['mean'] + 3.0:
                    fails.append(f"slide: planted feet slide {sl['mean']:.1f} cm/s on average, {sl['mean'] - ss['mean']:.1f} more than the capture's {ss['mean']:.1f}")
        if source is not None and sp > 0.3:
            gs = M.gait_params(source)
            r['source_gait'] = {k: round(v, 3) for k, v in gs.items() if isinstance(v, float)}
        use = meta.get('set', meta.get('use', 'both'))
        if use in ('both', 'f') and sp > 0.3 and not r['sex'].startswith('f'):
            fails.append(f"sex: a gait from a person whose sex is {r['sex']} plays on women")
        if use in ('both', 'm') and r['sex'].startswith('f'):
            fails.append(f"sex: a woman's capture ({r['sex']}) plays on men")
        if sp > 0.3:
            g = gait_cycle_params(m, sp, r['sex'])
            gp = M.gait_params(mt)
            g.update({k: round(gp[k], 3) for k in ('cadence', 'duty', 'flight', 'step_width', 'pelvis_rot', 'pelvis_obl', 'pelvis_vert', 'arm_swing') if gp.get(k) is not None and k != 'cadence'})
            g['cadence_contacts'] = round(gp['cadence'], 1) if gp.get('cadence') else None
            r['gait'] = g
            # W6: the stance foot down while it is still both ways (in game v3's jogs lifted it 4-9 cm, 2026-11-17; on the
            # actors' own skeletons they read 0.2-1.4 cm, so this catches a cut that lifts it, not a lift made in retargeting)
            # the planted foot (motion v6): from the second key after touchdown to toe-off the stance foot stands still on
            # the ground (under 0.1 m/s), as the editor measured it key by key in game
            import plant as PL
            st = PL.stance_measure(mt.P, mt.R, m.fps, m.n)
            r['checks']['stance'] = st
            # judged on the slowest of the ankle, the ball and the contact point (a walk's foot still turns down onto its
            # planted heel at the 2nd key: the heel stands, the ankle and the ball move); the slower of ankle and ball
            # (`max_slow`, the editor's own reading) reported beside it
            if not (st['Left'] and st['Right']): fails.append('stance: a foot with no stance found (no touchdown under 2 m/s within 2.5 cm of its floor)')
            elif st['max_foot'] > PL.LIMIT_MS:
                fails.append(f"stance: the stance foot moves {st['max_foot']:.2f} m/s over the ground (slowest of ankle, ball and contact point) from the 2nd key after touchdown to toe-off (limit {PL.LIMIT_MS})")
            w6 = w6_stance(mt); r['checks']['w6_cm'] = w6
            if w6 is None: fails.append('W6: no stance foot holds still both ways for 3 samples at the clip\'s speed (its stance foot slides against its pace)')
            elif w6['p98'] > 2.5 or w6['max'] > 4.0: fails.append(f"W6: the still stance foot stands {w6['p98']:.1f} cm up (p98; {w6['max']:.1f} at most; limit 2.5, cap 4)")
            run = sp > 2.0
            lo, hi = NORMS['run_cadence' if run else 'walk_cadence']
            if not lo <= g['cadence'] <= hi: fails.append(f"cadence {g['cadence']:.0f} steps/min outside {lo}-{hi} for a {'run' if run else 'walk'} at {sp:.2f} m/s")
            if not run:
                wr = NORMS['walk_ratio_f' if r['sex'].startswith('f') else 'walk_ratio_m']
                if not wr[0] <= g['walk_ratio'] <= wr[1]: fails.append(f"walk ratio {g['walk_ratio']:.4f} outside {wr[0]}-{wr[1]}")
        r['fail'] = fails; r['pass'] = not fails
        rows.append(r)
    return rows


def compare(qa_a, qa_b):
    """Two sets' gaits side by side: speed, the stance foot's worst and median ground speed (slower of ankle and ball) from
    the second key after touchdown to toe-off, and each foot's first stance key by key from the key before touchdown."""
    A = {r['clip']: r for r in json.load(open(qa_a))}; B = {r['clip']: r for r in json.load(open(qa_b))}
    out = []
    for name in sorted(set(A) | set(B)):
        ra, rb = A.get(name), B.get(name)
        sa = (ra or {}).get('checks', {}).get('stance'); sb = (rb or {}).get('checks', {}).get('stance')
        if not (sa or sb): continue
        row = {'clip': name, 'speed': [ra and ra.get('speed'), rb and rb.get('speed')],
               'max_slow': [sa and sa['max_slow'], sb and sb['max_slow']], 'max_foot': [sa and sa['max_foot'], sb and sb['max_foot']],
               'pass': [ra and ra['pass'], rb and rb['pass']], 'feet': {}}
        for side in ('Left', 'Right'):
            row['feet'][side] = []
            for st in (sa, sb):
                x = (st or {}).get(side) or []
                row['feet'][side].append({'median': x[0]['median_slow'], 'from_key_before': x[0]['slow'][:7]} if x else None)
        out.append(row)
    return out


if __name__ == '__main__':
    a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    if a[0] == 'compare':
        rows = compare(a[1], a[2])
        if len(a) > 3: json.dump(rows, open(a[3], 'w'), indent=1)
        print(f"{'gait':13s} {'speed m/s':>15s}   {'stance max (slower of ankle, ball)':>34s}   first stance from the key before touchdown")
        for r in rows:
            f = lambda v: '-' if v is None else f'{v:.3f}'
            print(f"{r['clip']:13s} {f(r['speed'][0]):>7s} {f(r['speed'][1]):>7s}   {f(r['max_slow'][0]):>16s} {f(r['max_slow'][1]):>17s}   " +
                  '  '.join(f"{s[0]}: " + ' / '.join(','.join(f'{v:.2f}' for v in (x or {}).get('from_key_before', [])) for x in r['feet'][s]) for s in ('Left', 'Right')))
        sys.exit(0)
    if a[0] == 'dump':
        dump(a[1], a[2:])
    elif a[0] == 'qa':
        cmu = a[a.index('--cmu') + 1].split(',') if '--cmu' in a else []
        accad = a[a.index('--accad') + 1].split(',') if '--accad' in a else None
        rows = qa_clips(a[1], a[2], cmu, accad, combat='--combat' in a, project=a[a.index('--project') + 1] if '--project' in a else None)
        json.dump(rows, open(a[3], 'w'), indent=1)
        for r in rows:
            print(f"{r['clip']:11s} {'PASS' if r['pass'] else 'FAIL'} {r['src']:12s} {r['sex']:14s} " + ('; '.join(r['fail']) if r['fail'] else ''))
