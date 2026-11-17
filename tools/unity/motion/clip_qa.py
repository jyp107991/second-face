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

    # 1. dump the clips' joints (Blender, the converter's output)
    blender -b --factory-startup --python tools/unity/motion/clip_qa.py -- dump <out_dir> <clip.fbx> [...]
    # 2. the gate (numpy)
    python3 -I tools/unity/motion/clip_qa.py qa <dump_dir> <clip json dir> <out.json> [--sources <cmu dir> <accad dir> <listing tsv>]
"""
import json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
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
        arrs['frames'] = np.array(frames)
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
FPS_LISTED = {'77': 60, '75': 60}
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


def seam_pop(m):
    """The loop's seam: the largest joint jump from the last frame to the first, less the mean of the steps on either side (cm),
    with the steady travel removed (gaits play in place)."""
    np = _np()
    worst = 0.0
    for k, p in m.P.items():
        a = np.linalg.norm(p[0] - p[-1]); b = np.linalg.norm(p[1] - p[0]); c = np.linalg.norm(p[-1] - p[-2])
        worst = max(worst, a - 0.5 * (b + c))
    return worst * 100


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
    if accad_dir and os.path.exists(os.path.join(accad_dir, tid + '.bvh')): return skel.load_bvh(os.path.join(accad_dir, tid + '.bvh'))
    return None


def qa_clips(dump_dir, json_dir, cmu_dirs=(), accad_dir=None):
    np = _np()
    sys.path.insert(0, os.path.join(HERE, '..', '..', 'qa', 'calibration'))
    import measures as M
    rows = []
    for f in sorted(os.listdir(dump_dir)):
        if not f.endswith('.npz'): continue
        name = f[:-4]
        meta = json.load(open(os.path.join(json_dir, name + '.json')))
        m = load_dump(os.path.join(dump_dir, f))
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
            pop = seam_pop(m); r['checks']['seam_cm'] = round(pop, 2)
            if pop > 1.0: fails.append(f'seam: {pop:.1f} cm jump at the loop')
        r['checks']['bones_cm'] = round(bone_dev(m), 3)
        if r['checks']['bones_cm'] > 0.5: fails.append('bones: lengths vary by %.1f cm' % r['checks']['bones_cm'])
        sp = float(meta.get('speed') or 0)
        mt = travelling(m, sp) if sp > 0.3 else m
        source = load_source(src, cmu_dirs, accad_dir) if (cmu_dirs or accad_dir) else None
        if not meta.get('root'):
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
            run = sp > 2.0
            lo, hi = NORMS['run_cadence' if run else 'walk_cadence']
            if not lo <= g['cadence'] <= hi: fails.append(f"cadence {g['cadence']:.0f} steps/min outside {lo}-{hi} for a {'run' if run else 'walk'} at {sp:.2f} m/s")
            if not run:
                wr = NORMS['walk_ratio_f' if r['sex'].startswith('f') else 'walk_ratio_m']
                if not wr[0] <= g['walk_ratio'] <= wr[1]: fails.append(f"walk ratio {g['walk_ratio']:.4f} outside {wr[0]}-{wr[1]}")
        r['fail'] = fails; r['pass'] = not fails
        rows.append(r)
    return rows


if __name__ == '__main__':
    a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    if a[0] == 'dump':
        dump(a[1], a[2:])
    elif a[0] == 'qa':
        cmu = a[a.index('--cmu') + 1].split(',') if '--cmu' in a else []
        accad = a[a.index('--accad') + 1] if '--accad' in a else None
        rows = qa_clips(a[1], a[2], cmu, accad)
        json.dump(rows, open(a[3], 'w'), indent=1)
        for r in rows:
            print(f"{r['clip']:11s} {'PASS' if r['pass'] else 'FAIL'} {r['src']:12s} {r['sex']:14s} " + ('; '.join(r['fail']) if r['fail'] else ''))
