"""Captured motion for Unity's Humanoid: CMU ASF/AMC trials -> one FBX per clip with a Mecanim-named skeleton.

    blender -b --python tools/unity/motion/cmu2fbx.py -- <cmu dir> <out dir> [clip,clip]

The CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu) is free for all uses; credit in CREDITS.md. Each
trial is read (ASF skeleton, AMC frames), gaits are cut to one stride by the legs' rhythm and loops are seam-blended
(the same rules as the web pipeline's tools/assets/motion/cmu.mjs), then written as BVH, imported into Blender,
the bones renamed to Mecanim names, and exported as FBX with the animation baked at 30 fps. Unity imports each as a
Humanoid clip that retargets to every person. Walks play in place (root travel removed); falls keep root motion.
"""
import bpy, math, os, sys
from mathutils import Quaternion, Vector, Euler
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'kits'))
import kitlib as K

args = sys.argv[sys.argv.index('--') + 1:]
CMU, OUT = args[0], args[1]
ONLY = set(args[2].split(',')) if len(args) > 2 else None
REL = 'Assets/SecondFace/Motion'
UNIT = 0.0254 / 0.45
SRC_FPS, OUT_FPS = 120, 30

CLIPS = [
    {'name': 'walk', 'src': '07_01', 'loop': 'gait'}, {'name': 'walk_b', 'src': '08_01', 'loop': 'gait'}, {'name': 'walk_slow', 'src': '07_04', 'loop': 'gait'},
    {'name': 'walk_brisk', 'src': '07_12', 'loop': 'gait'}, {'name': 'jog', 'src': '35_17', 'loop': 'gait'}, {'name': 'jog_b', 'src': '16_35', 'loop': 'gait'},
    {'name': 'run', 'src': '09_01', 'loop': 'gait'}, {'name': 'carry', 'src': '70_01', 'loop': 'gait'}, {'name': 'sneak', 'src': '136_09', 'loop': 'gait'},
    {'name': 'idle', 'src': '77_02', 'loop': 'seam', 'range': (0.5, 7.3), 'seam': 1.2}, {'name': 'idle_b', 'src': '82_08', 'loop': 'seam', 'range': (0.5, 6), 'seam': 1.2},
    {'name': 'idle_c', 'src': '111_28', 'loop': 'seam', 'range': (2, 10), 'seam': 1.2}, {'name': 'idle_d', 'src': '113_21', 'loop': 'seam', 'range': (2, 10), 'seam': 1.2},
    {'name': 'stretch', 'src': '141_13', 'loop': False, 'range': (0, 3)}, {'name': 'yawn', 'src': '111_32', 'loop': False, 'range': (0, 6.2)},
    {'name': 'yawn_b', 'src': '113_23', 'loop': False, 'range': (0, 8.4)}, {'name': 'sit', 'src': '114_05', 'loop': 'seam', 'range': (4, 14), 'seam': 1.2},
    {'name': 'sit_stool', 'src': '13_04', 'loop': 'seam', 'range': (3, 9), 'seam': 1.0}, {'name': 'sit_ground', 'src': '82_05', 'loop': 'seam', 'range': (4, 14), 'seam': 1.2},
    {'name': 'talk', 'src': '18_08', 'loop': 'seam', 'range': (2, 14), 'seam': 1.0}, {'name': 'talk_b', 'src': '19_08', 'loop': 'seam', 'range': (2, 14), 'seam': 1.0},
    {'name': 'argue', 'src': '18_10', 'loop': 'seam', 'range': (2, 12), 'seam': 1.0}, {'name': 'drink', 'src': '13_09', 'loop': False, 'range': (0, 8)},
    {'name': 'wave', 'src': '13_26', 'loop': False, 'range': (1, 6)}, {'name': 'sweep', 'src': '13_23', 'loop': 'seam', 'range': (2, 10), 'seam': 0.8},
    {'name': 'guard', 'src': '13_17', 'loop': 'seam', 'range': (2, 8), 'seam': 0.8}, {'name': 'fall', 'src': '90_16', 'loop': False, 'root': True},
    {'name': 'pickup', 'src': '26_09', 'loop': False, 'range': (0, 6)},
]

MECANIM = {
    'root': 'Hips', 'lowerback': 'Spine', 'upperback': 'Chest', 'thorax': 'UpperChest', 'lowerneck': 'Neck', 'upperneck': 'Neck2', 'head': 'Head',
    'lclavicle': 'LeftShoulder', 'lhumerus': 'LeftUpperArm', 'lradius': 'LeftLowerArm', 'lwrist': 'LeftWristTwist', 'lhand': 'LeftHand', 'lfingers': 'LeftIndexProximal', 'lthumb': 'LeftThumbProximal',
    'rclavicle': 'RightShoulder', 'rhumerus': 'RightUpperArm', 'rradius': 'RightLowerArm', 'rwrist': 'RightWristTwist', 'rhand': 'RightHand', 'rfingers': 'RightIndexProximal', 'rthumb': 'RightThumbProximal',
    'lhipjoint': 'LeftHipJoint', 'lfemur': 'LeftUpperLeg', 'ltibia': 'LeftLowerLeg', 'lfoot': 'LeftFoot', 'ltoes': 'LeftToes',
    'rhipjoint': 'RightHipJoint', 'rfemur': 'RightUpperLeg', 'rtibia': 'RightLowerLeg', 'rfoot': 'RightFoot', 'rtoes': 'RightToes',
}

# --- ASF / AMC (port of cmu.mjs) ------------------------------------------------------------------------------------
def q_euler(x, y, z):
    """ASF euler (degrees, static XYZ) -> quaternion."""
    return Quaternion((0, 0, 1), math.radians(z)) @ Quaternion((0, 1, 0), math.radians(y)) @ Quaternion((1, 0, 0), math.radians(x))

def parse_asf(text):
    lines = [l.strip() for l in text.splitlines()]
    lines = [l for l in lines if l and not l.startswith('#')]
    bones = {'root': {'name': 'root', 'direction': Vector((0, 0, 0)), 'length': 0.0, 'axis': (0, 0, 0), 'dof': ['tx', 'ty', 'tz', 'rx', 'ry', 'rz'], 'parent': None, 'children': []}}
    i, section = 0, ''
    while i < len(lines):
        l = lines[i]
        if l.startswith(':'): section = l.split()[0]; i += 1; continue
        if section == ':root':
            p = l.split()
            if p[0] == 'order': bones['root']['dof'] = [s.lower() for s in p[1:]]
            i += 1; continue
        if section == ':bonedata':
            if l == 'begin':
                b = {'direction': Vector((0, 0, 0)), 'length': 0.0, 'axis': (0, 0, 0), 'dof': [], 'children': [], 'parent': None}
                i += 1
                while lines[i] != 'end':
                    p = lines[i].split()
                    if p[0] == 'name': b['name'] = p[1]
                    elif p[0] == 'direction': b['direction'] = Vector([float(x) for x in p[1:4]])
                    elif p[0] == 'length': b['length'] = float(p[1])
                    elif p[0] == 'axis': b['axis'] = tuple(float(x) for x in p[1:4])
                    elif p[0] == 'dof': b['dof'] = [s.lower() for s in p[1:]]
                    i += 1
                bones[b['name']] = b
            i += 1; continue
        if section == ':hierarchy':
            if l not in ('begin', 'end'):
                p = l.split()
                for c in p[1:]: bones[c]['parent'] = p[0]; bones[p[0]]['children'].append(c)
            i += 1; continue
        i += 1
    for b in bones.values():
        b['C'] = q_euler(*b['axis']); b['Cinv'] = b['C'].inverted()
    return bones

def parse_amc(text):
    frames, cur = [], None
    for raw in text.splitlines():
        l = raw.strip()
        if not l or l.startswith('#') or l.startswith(':'): continue
        if l.isdigit(): cur = {}; frames.append(cur); continue
        p = l.split(); cur[p[0]] = [float(x) for x in p[1:]]
    return frames

def local_rotations(bones, frame):
    """Per bone: the rotation relative to its parent's frame (all rest frames are world-aligned in ASF), and the root position."""
    out, root_pos = {}, Vector((0, 0, 0))
    for name, b in bones.items():
        vals = frame.get(name, [])
        rx = ry = rz = tx = ty = tz = 0.0
        for k, d in enumerate(b['dof']):
            v = vals[k] if k < len(vals) else 0.0
            if d == 'rx': rx = v
            elif d == 'ry': ry = v
            elif d == 'rz': rz = v
            elif d == 'tx': tx = v
            elif d == 'ty': ty = v
            elif d == 'tz': tz = v
        out[name] = (b['C'] @ q_euler(rx, ry, rz) @ b['Cinv']).normalized()
        if name == 'root': root_pos = Vector((tx, ty, tz)) * UNIT
    return out, root_pos

def world_pose(bones, locals_, root_pos):
    """World rotation and tail position per bone."""
    out = {}
    def visit(name, parent_q, head):
        b = bones[name]
        q = (parent_q @ locals_[name]).normalized()
        d = q @ b['direction']
        tail = head + d * (b['length'] * UNIT)
        out[name] = (q, head, tail)
        for c in b['children']: visit(c, q, tail)
    visit('root', Quaternion(), root_pos)
    return out

def hip_height(bones):
    hj, fe, ti, fo = bones['lhipjoint'], bones['lfemur'], bones['ltibia'], bones['lfoot']
    return (-hj['direction'].y * hj['length'] + fe['length'] + ti['length'] + max(0.0, -fo['direction'].y * fo['length'])) * UNIT

# --- clip cutting (gait cycle, seam loops) ----------------------------------------------------------------------------
def gait_cycle(feet_z):
    n = len(feet_z); mean = sum(feet_z) / n; s = [v - mean for v in feet_z]
    lag0, lag1 = round(0.5 * SRC_FPS), min(n - 1, round(2.2 * SRC_FPS))
    corr = []
    for lag in range(lag0, lag1 + 1):
        c = m = 0
        for i in range(n - lag): c += s[i] * s[i + lag]; m += 1
        corr.append(c / max(1, m))
    best = max(corr); P = lag0 + corr.index(best)
    for k in range(1, len(corr) - 1):
        if corr[k] > corr[k - 1] and corr[k] >= corr[k + 1] and corr[k] > best * 0.55: P = lag0 + k; break
    seam = round(P * 0.12)
    margin = max(0, min(round(0.4 * SRC_FPS), (n - P - seam - 1) // 2))
    start, top = margin, -1e9
    for i in range(margin, n - margin - P - seam):
        if s[i] > top: top = s[i]; start = i
    if start + P + seam >= n: raise SystemExit(f'trial too short for a cycle: {n} frames, period {P}')
    return P, start, seam

def slerp(a, b, t):
    return a.slerp(b, t)

def build_rows(bones, frames, f0, f1):
    rows = []
    for f in range(f0, f1):
        loc, rp = local_rotations(bones, frames[f])
        wp = world_pose(bones, loc, rp)
        rows.append({'loc': loc, 'pos': rp, 'feet': (wp['lfoot'][2], wp['rfoot'][2]), 'rootq': wp['root'][0]})
    return rows

def canonical(rows, travel):
    """Turn the subject to face +Z (travel direction for gaits, mean facing otherwise); positions relative to the first frame."""
    if travel:
        a, b = rows[0]['pos'], rows[-1]['pos']; vx, vz = b.x - a.x, b.z - a.z
    else:
        vx = vz = 0.0
        for r in rows:
            f = r['rootq'] @ Vector((0, 0, 1)); vx += f.x; vz += f.z
    yaw = -math.atan2(vx, vz)
    Y = Quaternion((0, 1, 0), yaw)
    o = rows[0]['pos']
    for r in rows:
        p = Y @ Vector((r['pos'].x - o.x, 0, r['pos'].z - o.z))
        r['pos'] = Vector((p.x, r['pos'].y, p.z))
        r['loc']['root'] = (Y @ r['loc']['root']).normalized()
    return rows

def cut_loop(rows, start, P, seam):
    out = []
    for i in range(P):
        a = rows[start + i]
        if i < seam:
            b = rows[start + P + i]; t = (i + 1) / (seam + 1)
            out.append({'loc': {k: slerp(b['loc'][k], a['loc'][k], t) for k in a['loc']}, 'pos': b['pos'].lerp(a['pos'], t)})
        else:
            out.append({'loc': a['loc'], 'pos': a['pos']})
    return out

def resample(rows, fps):
    step = SRC_FPS / fps; out = []; t = 0.0
    while t < len(rows) - 1e-6:
        i = int(t); f = t - i; a = rows[i]; b = rows[min(len(rows) - 1, i + 1)]
        out.append({'loc': {k: slerp(a['loc'][k], b['loc'][k], f) for k in a['loc']}, 'pos': a['pos'].lerp(b['pos'], f)})
        t += step
    return out

def build_clip(d):
    subj = d['src'].split('_')[0]
    bones = parse_asf(open(os.path.join(CMU, subj, subj + '.asf')).read())
    frames = parse_amc(open(os.path.join(CMU, subj, d['src'] + '.amc')).read())
    n = len(frames)
    f0 = min(n - 2, round(d['range'][0] * SRC_FPS)) if d.get('range') else 0
    f1 = min(n, round(d['range'][1] * SRC_FPS)) if d.get('range') else n
    rows = build_rows(bones, frames, f0, f1)
    rows = canonical(rows, d.get('loop') == 'gait' or d.get('root'))
    hip = hip_height(bones)
    speed = 0.0
    if d.get('loop') == 'gait':
        feet_z = [r['feet'][0].z - r['feet'][1].z for r in rows]
        P, start, seam = gait_cycle(feet_z)
        a, b = rows[start]['pos'], rows[start + P]['pos']
        speed = (b.z - a.z) / (P / SRC_FPS)
        cyc = cut_loop(rows, start, P, seam)
        mx = sum(r['pos'].x for r in cyc) / len(cyc)
        for r in cyc: r['pos'] = Vector((r['pos'].x - mx, r['pos'].y, 0.0))
        out = resample(cyc, OUT_FPS)
    elif d.get('loop') == 'seam':
        seam = round(d.get('seam', 1.0) * SRC_FPS); P = len(rows) - seam
        cyc = cut_loop(rows, 0, P, seam)
        mx = sum(r['pos'].x for r in cyc) / len(cyc); mz = sum(r['pos'].z for r in cyc) / len(cyc)
        for r in cyc: r['pos'] = Vector((r['pos'].x - mx, r['pos'].y, r['pos'].z - mz))
        out = resample(cyc, OUT_FPS)
    else:
        if not d.get('root'):
            for r in rows: r['pos'] = Vector((0, r['pos'].y, 0))
        out = resample(rows, OUT_FPS)
    return bones, out, speed, hip

# --- BVH out, Blender in, FBX out ---------------------------------------------------------------------------------
def write_bvh(path, bones, rows):
    lines = ['HIERARCHY']
    def joint(name, depth, is_root):
        b = bones[name]; ind = '  ' * depth
        parent = bones[b['parent']] if b['parent'] else None
        off = (parent['direction'] * parent['length'] * UNIT) if parent else Vector((0, 0, 0))
        lines.append(f'{ind}{"ROOT" if is_root else "JOINT"} {MECANIM.get(name, name)}')
        lines.append(f'{ind}{{')
        lines.append(f'{ind}  OFFSET {off.x:.6f} {off.y:.6f} {off.z:.6f}')
        lines.append(f'{ind}  CHANNELS {"6 Xposition Yposition Zposition " if is_root else "3 "}Zrotation Xrotation Yrotation')
        if b['children']:
            for c in b['children']: joint(c, depth + 1, False)
        else:
            end = b['direction'] * b['length'] * UNIT
            lines.append(f'{ind}  End Site'); lines.append(f'{ind}  {{'); lines.append(f'{ind}    OFFSET {end.x:.6f} {end.y:.6f} {end.z:.6f}'); lines.append(f'{ind}  }}')
        lines.append(f'{ind}}}')
    joint('root', 0, True)
    order = []
    def visit(n):
        order.append(n)
        for c in bones[n]['children']: visit(c)
    visit('root')
    lines.append('MOTION'); lines.append(f'Frames: {len(rows)}'); lines.append(f'Frame Time: {1.0 / OUT_FPS:.6f}')
    for r in rows:
        vals = [f'{r["pos"].x:.5f} {r["pos"].y:.5f} {r["pos"].z:.5f}']
        for n in order:
            e = r['loc'][n].to_euler('ZXY')   # intrinsic ZXY: BVH channel order Z X Y
            vals.append(f'{math.degrees(e.z):.4f} {math.degrees(e.x):.4f} {math.degrees(e.y):.4f}')
        lines.append(' '.join(vals))
    with open(path, 'w') as f: f.write('\n'.join(lines) + '\n')

def export_clip(d, bones, rows, speed, hip):
    K.reset()
    bvh = os.path.join(OUT, '_tmp', d['name'] + '.bvh'); os.makedirs(os.path.dirname(bvh), exist_ok=True)
    write_bvh(bvh, bones, rows)
    bpy.ops.import_anim.bvh(filepath=bvh, axis_forward='-Z', axis_up='Y', global_scale=1.0, frame_start=1, use_fps_scale=False, update_scene_fps=False, update_scene_duration=True, rotate_mode='QUATERNION')
    sc = bpy.context.scene
    sc.render.fps = OUT_FPS; sc.render.fps_base = 1.0
    sc.frame_start = 1; sc.frame_end = len(rows)     # the FBX exporter bakes the scene range
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    arm.name = d['name']
    if arm.animation_data and arm.animation_data.action: arm.animation_data.action.name = d['name']
    path = os.path.join(OUT, d['name'] + '.fbx')
    bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); bpy.context.view_layer.objects.active = arm
    bpy.ops.export_scene.fbx(filepath=path, use_selection=True, apply_scale_options='FBX_SCALE_ALL', axis_forward='-Z', axis_up='Y', object_types={'ARMATURE'},
                             add_leaf_bones=False, bake_anim=True, bake_anim_use_all_bones=True, bake_anim_use_nla_strips=False, bake_anim_use_all_actions=False,
                             bake_anim_force_startend_keying=True, bake_anim_step=1.0, bake_anim_simplify_factor=0.0, path_mode='STRIP')
    K.write_model_meta(path, f'{REL}/{d["name"]}.fbx')
    with open(os.path.join(OUT, d['name'] + '.json'), 'w') as f:
        import json; json.dump({'name': d['name'], 'src': 'CMU ' + d['src'], 'loop': bool(d.get('loop')), 'speed': round(speed, 3), 'root': bool(d.get('root')), 'hip': round(hip, 4), 'fps': OUT_FPS, 'frames': len(rows)}, f)
    print(f'clip {d["name"]}: {len(rows)} frames, speed {speed:.2f} m/s')

os.makedirs(OUT, exist_ok=True); K.write_folder_meta(OUT, REL)
for d in CLIPS:
    if ONLY and d['name'] not in ONLY: continue
    subj = d['src'].split('_')[0]
    if not os.path.exists(os.path.join(CMU, subj, d['src'] + '.amc')): print('  skip', d['name'], '(no amc)'); continue
    bones, rows, speed, hip = build_clip(d)
    export_clip(d, bones, rows, speed, hip)
print('motion: done')
