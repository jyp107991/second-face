"""W6 on real people: each captured clip on its own actor's skeleton, in place, with its travel added back at its own speed
(its sidecar json), and the gate's W6 rule applied to the sole points (the ankle and ball joints, each over its own lowest
height, its contact height): the stance foot's height while it bears weight, by the stillness test alone (under 0.5 m/s
across the ground), with the sole's vertical speed under W6_VY m/s as well (default 0.2), and that for 3 samples running.
(docs/PEOPLE_MOTION.md W6, 2026-11-17)

    blender -b --factory-startup --python tools/qa/w6_source.py -- <clip.fbx> [...]      (each beside its <clip>.json)
"""
import bpy, sys, json, os
from mathutils import Vector
args = sys.argv[sys.argv.index('--') + 1:]
out = {}
for path in args:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=path)
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    side = json.load(open(path[:-4] + '.json'))
    speed = side['speed']; fps = side.get('fps', 30)
    act = arm.animation_data.action
    f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
    names = {b.name: b for b in arm.pose.bones}
    def pick(*keys):
        for k in keys:
            for n in names:
                if n.endswith(k) or n == k: return names[n]
    pts = {'L': (pick('LeftFoot', 'lfoot'), pick('LeftToes', 'LeftToeBase', 'ltoes')), 'R': (pick('RightFoot', 'rfoot'), pick('RightToes', 'RightToeBase', 'rtoes'))}
    sc = bpy.context.scene
    rows = []
    # three loops, skipping frame 0 (the T-pose)
    frames = [f for f in range(f0 + 1, f1 + 1)]
    seq = frames * 3
    for i, f in enumerate(seq):
        sc.frame_set(f)
        t = i / fps
        r = {}
        for s, (a, b) in pts.items():
            for k, bone in (('a', a), ('b', b)):
                p = arm.matrix_world @ bone.head
                # Blender z up, -y forward (FBX import): travel added along the actor's forward, found below
                r[s + k] = (p.x, p.y, p.z, t)
        rows.append(r)
    # forward: the direction the stance foot runs back (in place): the mean of the ankle's horizontal motion is ~0, so use
    # the axis of the largest horizontal spread of the ankles
    import math
    xs = [r['La'][0] for r in rows]; ys = [r['La'][1] for r in rows]
    sx = max(xs) - min(xs); sy = max(ys) - min(ys)
    ax = (1, 0) if sx > sy else (0, 1)
    # the stance foot moves back along that axis: the travel goes the other way
    lo = {k: min(r[k][2] for r in rows) for k in ('La', 'Lb', 'Ra', 'Rb')}
    def world(r, k, sign):
        x, y, z, t = r[k]
        return (x + sign * ax[0] * speed * t, y + sign * ax[1] * speed * t, z - lo[k])
    best = None
    for sign in (1, -1):
        # the right sign makes the lowest ankle nearly still
        v = []
        for i in range(1, len(rows)):
            for k in ('La', 'Ra'):
                a = world(rows[i - 1], k, sign); b = world(rows[i], k, sign)
                if b[2] < 0.01: v.append(math.hypot(b[0] - a[0], b[1] - a[1]) * fps)
        m = sorted(v)[len(v) // 2] if v else 9
        if best is None or m < best[0]: best = (m, sign)
    sign = best[1]
    w6 = []; w6v = []; w6v3 = []; run = {'L': 0, 'R': 0}
    VMAX = float(os.environ.get('W6_VY', '0.2'))
    for i in range(1, len(rows)):
        lows = {}; still = {}; vy = {}
        for s in 'LR':
            pa = world(rows[i], s + 'a', sign); pb = world(rows[i], s + 'b', sign)
            qa = world(rows[i - 1], s + 'a', sign); qb = world(rows[i - 1], s + 'b', sign)
            lows[s] = min(pa[2], pb[2])
            still[s] = min(math.hypot(pa[0] - qa[0], pa[1] - qa[1]), math.hypot(pb[0] - qb[0], pb[1] - qb[1])) * fps
            vy[s] = (min(pa[2], pb[2]) - min(qa[2], qb[2])) * fps
            run[s] = run[s] + 1 if (still[s] < 0.5 and abs(vy[s]) < VMAX) else 0
        s = 'L' if lows['L'] < lows['R'] else 'R'
        if still[s] < 0.5:
            w6.append(lows[s] * 100)
            if abs(vy[s]) < VMAX: w6v.append(lows[s] * 100)
            if run[s] >= 3: w6v3.append(lows[s] * 100)
    def stat(a):
        a = sorted(a); n = len(a)
        return {'n': n, 'p98': round(a[int(0.98 * (n - 1))], 2) if n else None, 'max': round(a[-1], 2) if n else None}
    print('W6RULES', os.path.basename(path), 'still<0.5:', stat(w6), '+|vy|<%.2f:' % VMAX, stat(w6v), '+3 frames:', stat(w6v3))
    w6.sort()
    n = len(w6)
    p98 = w6[int(0.98 * (n - 1))] if n else None
    out[os.path.basename(path)] = {'speed': speed, 'samples': n, 'p50': w6[n // 2] if n else None, 'p98': p98, 'max': w6[-1] if n else None,
                                   'over_2.5': sum(1 for x in w6 if x > 2.5), 'over_4': sum(1 for x in w6 if x > 4), 'stance_still_median_mps': round(best[0], 3)}
    print('W6SRC', os.path.basename(path), json.dumps(out[os.path.basename(path)]))
json.dump(out, open(os.environ.get('W6_OUT', '/dev/null'), 'w'), indent=1)
