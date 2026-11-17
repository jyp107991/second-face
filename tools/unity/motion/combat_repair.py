"""Repairs for the hand-keyed combat clips that fail the clip QA (combat v3). Each op keeps what the clip shows (its poses,
their order, the clip's length) and changes only how a defect plays:

  retime  a joint turning more than 55° between two keys (a hand-keyed snap: the shortest path is already taken; 64-102° in a
          frame, 1900-3000°/s, past what a joint does). The snapping arm (shoulder to fingers) is re-timed around it: the same
          path, spread evenly over the snap's own frames, widened by at most 3 frames each side; the frames at the window's
          ends are the clip's own, and the legs keep their timing (a whole-body re-time moved the planted feet).
  plant   a planted foot held where it landed, by its ball (the toe joint): two-bone IK on the leg, the hips (and their height)
          as keyed, the foot's turn about the vertical held about the ball, its pitch and roll as keyed; in a gait played in
          place the ground moves back under it at the gait's speed; the hold eased out over 3 frames after the foot lifts. A
          frame whose held ankle is out of the leg's reach is left as keyed (counted in the report).
  cycle   a gait loop re-timed: the speed taken from its own stance feet (their backward speed in place), the cadence set so
          its walk ratio (step length / cadence) at the slow end of real walkers' (Bogen 2018: 0.0060 mean, 0.0046-0.0074).

    blender -b --factory-startup --python tools/unity/motion/combat_repair.py -- <in dir> <out dir> <clip:op+op>[,...]
"""
import bpy, json, math, os, sys
from mathutils import Matrix, Quaternion, Vector

FPS = 30
LIMIT = 55.0
UP = Vector((0.0, 0.0, 1.0))


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = FPS; sc.render.fps_base = 1.0
    return sc


def load(path, n):
    reset()
    bpy.ops.import_scene.fbx(filepath=path, automatic_bone_orientation=False)
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    sc = bpy.context.scene
    # the importer puts the take's first key at the action's first frame (one frame on from where it was exported)
    f0 = int(round(arm.animation_data.action.frame_range[0]))
    rows = []
    for f in range(f0, f0 + n):
        sc.frame_set(f)
        rows.append({pb.name: (pb.matrix_basis.to_translation(), pb.matrix_basis.to_quaternion().normalized()) for pb in arm.pose.bones})
    arm.animation_data.action = None
    return arm, rows


def pose(arm, row):
    for pb in arm.pose.bones:
        loc, q = row[pb.name]
        pb.matrix_basis = Matrix.Translation(loc) @ q.to_matrix().to_4x4()
    bpy.context.view_layer.update()


def slerp(a, b, t):
    if a.dot(b) < 0.0: b = -b
    return a.slerp(b, t)


def ang(a, b):
    t = a.rotation_difference(b).angle            # (0..360°: q and -q are one rotation, the shorter way is the turn)
    return math.degrees(min(t, 2.0 * math.pi - t))


# --- retime ---------------------------------------------------------------------------------------------------------
ARM = ('Shoulder', 'UpperArm', 'LowerArm', 'Hand', 'Thumb', 'Index', 'Middle', 'Ring', 'Little')

def _retime_limb(rows, log):
    n = len(rows); every = list(rows[0].keys())
    # the snapping limb only (an arm and its hand): the legs, and the feet planted under them, keep their own timing
    worst = max(every, key=lambda k: max(ang(rows[i][k][1], rows[i + 1][k][1]) for i in range(n - 1)))
    side = 'Left' if worst.startswith('Left') else ('Right' if worst.startswith('Right') else None)
    names = [k for k in every if side and k.startswith(side) and any(a in k for a in ARM)] or every
    def steps(rs): return [max(ang(rs[i][k][1], rs[i + 1][k][1]) for k in names) for i in range(len(rs) - 1)]
    s = steps(rows)
    done = []
    f = max(range(n - 1), key=lambda i: s[i])
    guard = 0
    while s[f] > LIMIT and guard < 20:
        guard += 1
        a, b = f, f + 1
        while a > 0 and s[a - 1] > 25.0: a -= 1
        while b < n - 1 and s[b] > 25.0: b += 1
        a0, b0 = a, b
        while True:
            P = sum(s[a:b])
            if P / (b - a) <= LIMIT or (a0 - a >= 3 and b - b0 >= 3): break
            if a > 0 and a0 - a < 3: a -= 1
            if b < n - 1 and b - b0 < 3: b += 1
            if (a == 0 or a0 - a >= 3) and (b == n - 1 or b - b0 >= 3): P = sum(s[a:b]); break
        if P / (b - a) > LIMIT:
            log.append({'frames': [a + 1, b + 1], 'left': f'needs {P / LIMIT:.0f} frames for {P:.0f}° of turning; widening past 3 frames a side would change the timing'})
            break
        c = [0.0]
        for i in range(a, b): c.append(c[-1] + s[i])
        new = {}
        for i in range(a + 1, b):
            p = P * (i - a) / (b - a)
            j = max(k for k in range(len(c) - 1) if c[k] <= p + 1e-9)
            t = (p - c[j]) / max(c[j + 1] - c[j], 1e-9)
            A, B = rows[a + j], rows[a + j + 1]
            new[i] = dict(rows[i]); new[i].update({k: (A[k][0].lerp(B[k][0], t), slerp(A[k][1], B[k][1], t)) for k in names})
        before = max(s[a:b])
        for i, r in new.items(): rows[i] = r
        s = steps(rows)
        done.append({'frames': [a + 1, b + 1], 'limb': side or 'all', 'turn_deg': round(P, 1), 'step_max_deg': [round(before, 1), round(max(s[a:b]), 1)]})
        f = max(range(n - 1), key=lambda i: s[i])
    log.extend(done)
    return rows


def retime(rows, log):
    """Each snapping limb in turn, worst first, until no joint turns more than LIMIT between two keys."""
    every = list(rows[0].keys())
    for _ in range(4):
        worst = max(max(ang(rows[i][k][1], rows[i + 1][k][1]) for k in every) for i in range(len(rows) - 1))
        if worst <= LIMIT: break
        k0 = len(log); rows = _retime_limb(rows, log)
        if len(log) == k0 or any('left' in e for e in log[k0:]): break
    return rows


# --- plant ----------------------------------------------------------------------------------------------------------
def plant(arm, rows, log, vg=None):
    """Each foot held by its ball (the toe joint) while the ball is down and still against the ground (vg: the ground's
    velocity in a gait played in place; zero for a one-shot): the leg's two bones solved so the ankle follows the held ball,
    the foot's turn about the vertical held about the ball, its pitch and roll as keyed (the heel rises and falls as keyed)."""
    M = arm.matrix_world; Mi = M.inverted()
    n = len(rows); vg = vg or Vector((0.0, 0.0, 0.0))
    W = lambda pb: M @ pb.matrix
    ball = {s: [] for s in ('Left', 'Right')}
    for r in rows:
        pose(arm, r)
        for s in ball: ball[s].append((M @ arm.pose.bones[s + 'Toes'].head).copy())
    unreached, held = 0, 0
    plans = {s: [None] * n for s in ball}
    for s, p in ball.items():
        low = min(v.z for v in p)
        rel = [((p[min(n - 1, i + 1)] - p[max(0, i - 1)]) * (FPS / max(1, min(n - 1, i + 1) - max(0, i - 1)))) - vg for i in range(n)]
        on = [p[i].z <= low + 0.025 and Vector((rel[i].x, rel[i].y)).length < 1.0 for i in range(n)]
        i = 0
        while i < n:
            if not on[i]: i += 1; continue
            j = i
            while j + 1 < n and on[j + 1]: j += 1
            if j - i >= 1:
                for k in range(i, j + 1): plans[s][k] = ('hold', i)
                end = p[i] + vg * ((j - i) / FPS)
                off = Vector((end.x - p[j].x, end.y - p[j].y, 0.0))
                for e in range(1, 4):
                    if j + e < n and plans[s][j + e] is None: plans[s][j + e] = ('ease', off * (1.0 - e / 4.0))
            i = j + 1
    yaw0 = {}
    for f in range(n):
        pose(arm, rows[f])
        for s in ball:
            pl = plans[s][f]
            if pl is None: continue
            th, sh, ft, to = (arm.pose.bones[s + x] for x in ('UpperLeg', 'LowerLeg', 'Foot', 'Toes'))
            Wft = W(ft).to_3x3().normalized(); R = Wft.to_quaternion()
            A = M @ ft.head; B = M @ to.head
            y = Wft @ Vector((0.0, 1.0, 0.0)); yaw = math.atan2(y.y, y.x)
            if pl[0] == 'hold':
                if pl[1] == f: yaw0[s] = yaw
                Q_ = Quaternion(UP, -(yaw - yaw0[s]))
                A = B + Q_ @ (A - B); R = Q_ @ R
                hold = ball[s][pl[1]] + vg * ((f - pl[1]) / FPS)
                T = A + Vector((hold.x - B.x, hold.y - B.y, 0.0))
            else:
                T = A + pl[1]
            H = M @ th.head; K = M @ sh.head; A0 = M @ ft.head
            l1, l2 = (K - H).length, (A0 - K).length
            d = (T - H).length
            if d > l1 + l2 - 1e-4: unreached += 1; continue
            d = max(d, abs(l1 - l2) + 1e-4)
            u = (T - H).normalized(); w = (K - H) - u * (K - H).dot(u)
            if w.length < 1e-6: continue
            v = w.normalized()
            ca = max(-1.0, min(1.0, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)))
            K2 = H + l1 * (ca * u + math.sqrt(1 - ca * ca) * v)
            def turn(pb, head_w, frm, to_):
                q = frm.rotation_difference(to_)
                pb.matrix = Mi @ (Matrix.Translation(head_w) @ q.to_matrix().to_4x4() @ Matrix.Translation(-head_w) @ W(pb))
                bpy.context.view_layer.update()
            turn(th, H, K - H, K2 - H)
            turn(sh, K2, (M @ ft.head) - K2, T - K2)
            hw = M @ ft.head; sc_ = M.to_scale()
            ft.matrix = Mi @ (Matrix.Translation(hw) @ R.to_matrix().to_4x4() @ Matrix.Diagonal((sc_.x, sc_.y, sc_.z, 1.0)))
            bpy.context.view_layer.update()
            held += 1
            for pb in (th, sh, ft):
                rows[f][pb.name] = (pb.matrix_basis.to_translation(), pb.matrix_basis.to_quaternion().normalized())
    log.append({'frames_held': held, 'frames_out_of_reach': unreached})
    return rows


# --- cycle ----------------------------------------------------------------------------------------------------------
def cycle(arm, rows, side, log):
    n = len(rows); M = arm.matrix_world
    feet = {s: [] for s in ('Left', 'Right')}
    for r in rows:
        pose(arm, r)
        for s in feet: feet[s].append((M @ arm.pose.bones[s + 'Foot'].head).copy())
    v = []
    for s, p in feet.items():
        low = min(q.z for q in p)
        for i in range(n):
            if p[i].z <= low + 0.02:
                d = p[(i + 1) % n] - p[i - 1]; v.append(Vector((d.x, d.y)).length * FPS / 2.0)
    v.sort(); speed = v[len(v) // 2]
    T = n / FPS; step = speed * T / 2.0
    # (the keys' step is long for a crouch, 0.71 m, and re-timing cannot shorten it: the cadence is set at the walk ratio
    # 0.0070, the slow end of real walkers' 0.0046-0.0074, not the mean, which would make it a 1.4 m/s crouch-run)
    cad = step / 0.0070
    N = max(8, round(120.0 / cad * FPS))
    out = []
    for k in range(N):
        t = k * n / N; i = int(t) % n; f = t - int(t); A, B = rows[i], rows[(i + 1) % n]
        out.append({b: (A[b][0].lerp(B[b][0], f), slerp(A[b][1], B[b][1], f)) for b in A})
    new_speed = 2.0 * step / (N / FPS)
    # the ground's velocity in place (backward along the stance feet's mean way), for a following 'plant'
    mv = Vector((0.0, 0.0, 0.0)); cnt = 0
    for s, p in feet.items():
        low = min(q.z for q in p)
        for i in range(n):
            if p[i].z <= low + 0.02: mv += (p[(i + 1) % n] - p[i - 1]); cnt += 1
    mv.z = 0.0
    side['_vg'] = mv.normalized() * new_speed if mv.length > 1e-6 else None
    log.append({'stance_speed_in_keys_mps': round(speed, 3), 'step_m': round(step, 3), 'cadence_before': round(120.0 / T, 1),
                'cadence_after': round(120.0 / (N / FPS), 1), 'frames': [n, N], 'speed_mps': [side.get('speed'), round(new_speed, 3)]})
    side['speed'] = round(new_speed, 3)
    return out


def write(arm, rows, name, out_dir):
    sc = bpy.context.scene
    act = bpy.data.actions.new(name); arm.animation_data_create(); arm.animation_data.action = act
    for pb in arm.pose.bones:
        pb.rotation_mode = 'QUATERNION'
        pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0)
        pb.keyframe_insert('location', frame=0); pb.keyframe_insert('rotation_quaternion', frame=0)
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
    arm.name = name
    sc.frame_start = 1; sc.frame_end = len(rows); sc.frame_set(0)
    for o in list(bpy.data.objects):
        if o is not arm: bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); bpy.context.view_layer.objects.active = arm
    bpy.ops.export_scene.fbx(filepath=os.path.join(out_dir, name + '.fbx'), use_selection=True, apply_scale_options='FBX_SCALE_ALL', axis_forward='-Z', axis_up='Y',
                             object_types={'ARMATURE'}, add_leaf_bones=False, bake_anim=True, bake_anim_use_all_bones=True, bake_anim_use_nla_strips=False,
                             bake_anim_use_all_actions=False, bake_anim_force_startend_keying=True, bake_anim_step=1.0, bake_anim_simplify_factor=0.0, path_mode='STRIP')


def main():
    a = sys.argv[sys.argv.index('--') + 1:]
    src, out_dir, jobs = a[0], a[1], [j.split(':') for j in a[2].split(',')]
    os.makedirs(out_dir, exist_ok=True)
    for name, ops in jobs:
        side = json.load(open(os.path.join(src, name + '.json')))
        arm, rows = load(os.path.join(src, name + '.fbx'), side['frames'])
        rep = {}
        for op in ops.split('+'):
            log = []
            if op == 'retime': rows = retime(rows, log)
            elif op == 'plant': rows = plant(arm, rows, log, side.pop('_vg', None))
            elif op == 'cycle': rows = cycle(arm, rows, side, log)
            elif op == 'noop': pass
            rep[op] = log
        write(arm, rows, name, out_dir)
        side.pop('_vg', None); side['frames'] = len(rows)
        side['repairs'] = rep
        side['authoring'] = side.get('authoring', '') + '; repaired offline (tools/unity/motion/combat_repair.py: ' + ', '.join(rep) + ')'
        json.dump(side, open(os.path.join(out_dir, name + '.json'), 'w'), indent=1)
        print('clip', name, json.dumps(rep)[:400])
    print('repair: done')


if __name__ == '__main__':
    main()
