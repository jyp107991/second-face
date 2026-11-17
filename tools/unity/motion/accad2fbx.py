"""Captured motion from ACCAD's Open Motion Project (BVH) -> one FBX per clip, as cmu2fbx.py makes them from CMU: the same
gait cutting (one stride, in place, its own surge and sway kept), seam loops, 30 fps keys, Mecanim bone names and a true
T-pose at frame 0. Used for the women's set (ACCAD Female1), which CMU lacks (docs/MOTION_ROOT_CAUSE.md R3, T2).

    blender -b --factory-startup --python tools/unity/motion/accad2fbx.py -- <accad bvh dir> <out dir> [clip,clip]

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
import skel

MECANIM = {'Hips': 'Hips', 'ToSpine': 'Spine', 'Spine': 'Chest', 'Spine1': 'UpperChest', 'Neck': 'Neck', 'Head': 'Head',
           'LeftShoulder': 'LeftShoulder', 'LeftArm': 'LeftUpperArm', 'LeftForeArm': 'LeftLowerArm', 'LeftHand': 'LeftHand',
           'RightShoulder': 'RightShoulder', 'RightArm': 'RightUpperArm', 'RightForeArm': 'RightLowerArm', 'RightHand': 'RightHand',
           'LeftUpLeg': 'LeftUpperLeg', 'LeftLeg': 'LeftLowerLeg', 'LeftFoot': 'LeftFoot', 'LeftToeBase': 'LeftToes',
           'RightUpLeg': 'RightUpperLeg', 'RightLeg': 'RightLowerLeg', 'RightFoot': 'RightFoot', 'RightToeBase': 'RightToes'}
UNIT = 0.01   # ACCAD's BVH are in centimetres
LICENCE = 'ACCAD Open Motion Project (Ohio State University), CC BY 3.0'

# Ranges in seconds of the take; sex as ACCAD records it in the take's name. Female1's BVH rest pose is a world-aligned
# T-pose; Male1/Male2's are not and are re-solved onto one (`resolve`: the subject's own Stand as the reference,
# bvh_resolve.py). Female1 has no steady jog (her runs speed up or slow down throughout; a cycle cut from them popped 7 cm)
# and no brisk walk (her fastest steady walking is 1.1-1.27 m/s): the women's jogs come from CMU 141 (cmu2fbx.py).
CLIPS = [
    # women (ACCAD Female1)
    {'name': 'walk_f', 'src': 'Female1_B02_WalkToStand', 'loop': 'gait', 'range': (0.0, 3.6)},      # "walk (more swing at the hips) to stand": 0.96 m/s
    {'name': 'walk_f_b', 'src': 'Female1_B13_WalkTurnRight45', 'loop': 'gait', 'range': (5.4, 8.3)},  # the walk after the turn: ~1.13 m/s
    {'name': 'walk_f_n', 'src': 'Female1_B21_PutDownBoxToWalk', 'loop': 'gait', 'range': (7.4, 9.5)},  # the walk away from the box: ~1.22 m/s
    {'name': 'walk_f_long', 'src': 'Female1_B03_Walk1', 'loop': 'gait'},                             # "walk with long steps (minimal sway at the hips)"
    {'name': 'run_f', 'src': 'Female1_C03_Run', 'loop': 'gait'},                                     # "run" (1.2 s: one stride and its seam)
    # her one quiet stretch with straight knees and a level head (K1 p98 7.1, H1 -4..+6): D2 "Wait" 34.5-38.5 s
    {'name': 'idle_f', 'src': 'Female1_D2_Wait', 'loop': 'seam', 'range': (34.4, 38.6), 'seam': 1.0},
    # and "Stand" (K1 p98 7.3-7.7, H1 -3..-1), 3 s
    {'name': 'idle_f_c', 'src': 'Female1_A01_Stand', 'loop': 'seam', 'range': (0.1, 3.0), 'seam': 0.8},
    # men (ACCAD Male1, Male2: re-solved onto a T-pose)
    {'name': 'idle_m', 'src': 'Male2_A1_Stand', 'loop': 'seam', 'range': (0.2, 3.8), 'seam': 1.0, 'resolve': 'Male2_A1_Stand'},
    {'name': 'walk_d', 'src': 'Male1_B3_Walk', 'loop': 'gait', 'range': (0.4, 6.1), 'resolve': 'Male1_A1_Stand'},       # 1.30 m/s
    {'name': 'walk_brisk_b', 'src': 'Male2_B3_Walk', 'loop': 'gait', 'resolve': 'Male2_A1_Stand'},                      # 1.65 m/s
    {'name': 'run_c', 'src': 'Male2_C3_Run', 'loop': 'gait', 'resolve': 'Male2_A1_Stand'},                              # ~3.7 m/s
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
        out = C.resample_loop(cyc, C.OUT_FPS)
        speed = dv.length / (len(out) / C.OUT_FPS)     # the pace at which the loop as played lays one stride
        print(f'  {d["name"]}: stride {dv.length:.2f} m over {P / fps:.3f} s ({120 / (P / fps):.0f} steps/min; {len(out)} frames), off the trial line by {math.degrees(math.atan2(dv.x, dv.z)):.1f} deg')
    elif d.get('loop') == 'seam':
        seam = round(d.get('seam', 1.0) * fps); P = len(rows) - seam
        P = C.refine_seam([r['key'] for r in rows], P, seam, round(0.5 * fps))
        cyc = C.cut_loop(rows, 0, P, seam)
        mx = sum(r['pos'].x for r in cyc) / len(cyc); mz = sum(r['pos'].z for r in cyc) / len(cyc)
        for r in cyc: r['pos'] = Vector((r['pos'].x - mx, r['pos'].y, r['pos'].z - mz))
        out = C.resample_loop(cyc, C.OUT_FPS)
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
    for r in rows:
        vals = [f'{r["pos"].x:.5f} {r["pos"].y:.5f} {r["pos"].z:.5f}']
        for j in order:
            q = r['loc']['root' if j == order[0] else j]
            e = q.to_euler('YXZ')   # BVH "Z X Y" intrinsic = Blender's extrinsic 'YXZ' (cmu2fbx.write_bvh)
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
                   'seam_share': C.SEAM if d.get('loop') == 'gait' else None, 'range': list(d['range']) if d.get('range') else None}, f)
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
        joints, order, frames, fps = load_resolved(path, os.path.join(src, d['resolve'] + '.bvh')) if d.get('resolve') else load(path)
        rows, speed, hip = build(d, joints, order, frames, fps)
        export(d, joints, order, rows, speed, hip, out, fps)
    print('accad motion: done')


if __name__ == '__main__':
    main()
