"""Body geometry audit of the Rocketbox bases against real people (docs/MOTION_ROOT_CAUSE.md T5; docs/qa/body_geometry_audit.md).

Each base's bind mesh (Rocketbox's own FBX, its clothes baked in) is measured where the arms hang: the shoulder joint's
place (the UpperArm bone's head) against the trunk's breadth at the chest, at the waist at the hanging elbow's height and at
the omphalion, the chest's depth, the stature; and the same quantities of real people from ANSUR II (US Army 2012, public
domain) by sex. Read-only on unity/: the FBX are only imported.

    blender -b --factory-startup --python tools/qa/calibration/body_geometry.py -- dump <out_dir> <base.fbx> [...]
    python3 -I tools/qa/calibration/body_geometry.py audit <dump_dir> <ANSUR_II_MALE_Public.csv> <ANSUR_II_FEMALE_Public.csv> <out.json>
"""
import csv, json, os, sys

ARM = ('UpperArm', 'Forearm', 'Hand', 'Finger')
BONES = ['Bip01 Pelvis', 'Bip01 Spine2', 'Bip01 Neck', 'Bip01 Head', 'Bip01 L Clavicle', 'Bip01 R Clavicle', 'Bip01 L UpperArm', 'Bip01 R UpperArm',
         'Bip01 L Forearm', 'Bip01 R Forearm', 'Bip01 L Hand', 'Bip01 R Hand', 'Bip01 L Thigh', 'Bip01 R Thigh']


def dump(out_dir, paths):
    """Blender: each base's bind mesh (world, metres; Y up, +Z forward, +X the body's left) and bone heads to <base>.npz, with
    each vertex's weight on the arms (upper arm, forearm, hand, fingers)."""
    import bpy, numpy as np
    os.makedirs(out_dir, exist_ok=True)
    for path in paths:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.fbx(filepath=path)
        arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
        meshes = [o for o in bpy.data.objects if o.type == 'MESH']
        V, W, F = [], [], []
        for ob in meshes:
            names = {g.index: g.name for g in ob.vertex_groups}
            mw = ob.matrix_world
            base = len(V)
            for v in ob.data.vertices:
                co = mw @ v.co
                V.append((co.x, co.z, -co.y))          # Blender (x, y, z-up; forward -y) -> (x, up, forward)
                W.append(sum(g.weight for g in v.groups if any(k in names.get(g.group, '') for k in ARM)))
            for poly in ob.data.polygons:
                vs = list(poly.vertices)
                for k in range(1, len(vs) - 1): F.append((base + vs[0], base + vs[k], base + vs[k + 1]))
        bones = {}
        for b in BONES:
            if b in arm.data.bones:
                h = arm.matrix_world @ arm.data.bones[b].head_local
                bones[b] = (h.x, h.z, -h.y)
        name = os.path.splitext(os.path.basename(path))[0]
        np.savez_compressed(os.path.join(out_dir, name + '.npz'), V=np.array(V), W=np.array(W), F=np.array(F, dtype=np.int32),
                            bone_names=np.array(list(bones)), bone_pos=np.array(list(bones.values())))
        print('dumped', name, len(V), 'vertices')


def measure(npz):
    import numpy as np
    d = np.load(npz)
    V, W = d['V'], d['W']
    B = dict(zip([str(x) for x in d['bone_names']], d['bone_pos']))
    floor, top = V[:, 1].min(), V[:, 1].max()
    stature = top - floor
    mid = B['Bip01 Pelvis'][0]
    shL, shR = B['Bip01 L UpperArm'], B['Bip01 R UpperArm']
    sx = 0.5 * (abs(shL[0] - mid) + abs(shR[0] - mid))                     # the shoulder joint's offset from the midline
    upper = 0.5 * (np.linalg.norm(B['Bip01 L Forearm'] - shL) + np.linalg.norm(B['Bip01 R Forearm'] - shR))
    gh_h = 0.5 * (shL[1] + shR[1]) - floor
    F = d['F']
    tri = F[(W[F] < 0.5).all(axis=1)]          # the trunk's (and legs', head's) triangles: no arm vertex
    trunk = V[W < 0.5]

    def section(h):
        """The points where a level plane at height h (over the floor) cuts the trunk's triangles."""
        y = V[:, 1] - (floor + h)
        pts = []
        for a, b in ((0, 1), (1, 2), (2, 0)):
            ia, ib = tri[:, a], tri[:, b]
            ya, yb = y[ia], y[ib]
            cut = (ya * yb < 0)
            t = (ya[cut] / (ya[cut] - yb[cut]))[:, None]
            pts.append(V[ia[cut]] + t * (V[ib[cut]] - V[ia[cut]]))
        return np.concatenate(pts) if pts else np.zeros((0, 3))

    def breadth(h, depth=False):
        s = section(h)
        # the trunk only: within the hips' and shoulders' span of the midline (a hand or a thigh's far side is not the waist)
        s = s[np.abs(s[:, 0] - mid) < 0.30]
        if len(s) < 4: return None
        return float(np.ptp(s[:, 2] if depth else s[:, 0]))
    elbow_h = gh_h - upper                                                  # the elbow's height with the arm hanging
    fore = 0.5 * (np.linalg.norm(B['Bip01 L Hand'] - B['Bip01 L Forearm']) + np.linalg.norm(B['Bip01 R Hand'] - B['Bip01 R Forearm']))
    wrist_h = elbow_h - fore
    # the upper arm's own thickness (its sleeve included): the mesh's distance from the bone's axis over its middle third,
    # the arm's own vertices (arm weight over 0.9), median and 90th percentile (cm)
    radii = []
    for side in ('L', 'R'):
        a, b = B[f'Bip01 {side} UpperArm'], B[f'Bip01 {side} Forearm']
        ax = (b - a) / np.linalg.norm(b - a)
        rel = V - a; t = rel @ ax
        sel = (W > 0.6) & (t > 0.33 * upper) & (t < 0.67 * upper)
        d_ = np.linalg.norm(rel - np.outer(t, ax), axis=1)
        sel &= d_ < 0.12          # the arm's own sleeve, not the trunk beside it
        radii.append(d_[sel])
    rr = np.concatenate(radii)
    if len(rr) == 0: rr = np.array([np.nan])
    out = {'stature': stature, 'sx': sx, 'upper_arm': upper, 'gh_height': gh_h, 'elbow_height': elbow_h,
           'waist_at_elbow': breadth(elbow_h), 'mid': mid, 'forearm': fore, 'hip_at_wrist': breadth(wrist_h),
           'arm_r_med': float(np.median(rr)), 'arm_r_p90': float(np.percentile(rr, 90))}
    # ANSUR's landmark heights as shares of stature (by sex, set in audit()): chest (nipple) and omphalion
    out['_floor'] = floor
    out['_breadth'] = breadth
    # the shoulder top over the joint: the trunk's highest skin within 2 cm (across) of each shoulder joint
    tops = []
    for sh in (shL, shR):
        s = V[(np.abs(V[:, 0] - sh[0]) < 0.02) & (np.abs(V[:, 2] - sh[2]) < 0.04)]
        if len(s): tops.append(s[:, 1].max() - sh[1])
    out['skin_over_joint'] = float(np.mean(tops)) if tops else None
    # the shoulder's outer skin at the joints' height (all of the mesh: in the A-pose the arm leaves the shoulder below it),
    # beyond the joint (cm): with ANSUR's bideltoid breadth / 2 less the joint's offset as the real reference
    band = V[np.abs(V[:, 1] - (floor + gh_h)) < 0.015]
    out['deltoid_beyond_joint'] = float(0.5 * ((band[:, 0].max() - mid) + (mid - band[:, 0].min())) - sx) if len(band) else None
    # the arm's own section at 4 cm out from the joint along it: its centre against the joint (front-back), cm
    return out


def ansur(path, sex):
    import numpy as np
    rows = list(csv.DictReader(open(path, encoding='latin-1')))
    f = lambda k: np.array([float(r[k]) for r in rows]) / 1000.0
    st = f('stature')
    A = {'stature': st, 'biacromial': f('biacromialbreadth'), 'bideltoid': f('bideltoidbreadth'), 'chestbreadth': f('chestbreadth'), 'chestdepth': f('chestdepth'),
         'waistbreadth': f('waistbreadth'), 'waistdepth': f('waistdepth'), 'hipbreadth': f('hipbreadth'), 'chestheight': f('chestheight'),
         'waistheight': f('waistheightomphalion'), 'acromialheight': f('acromialheight'), 'shoulderelbow': f('shoulderelbowlength'),
         'forearm': f('radialestylionlength'), 'biceps': f('bicepscircumferenceflexed')}
    # the glenohumeral joint centre lies inside the acromion's lateral edge: its offset from the midline taken as half the
    # biacromial breadth less 2.0 cm (acromion to joint centre, lateral component: Meskers et al. 1998, Campbell et al. 2009,
    # ~1.5-2.5 cm); the elbow hangs one shoulder-elbow length (acromion to olecranon) less ~4 cm (the acromion over the joint) below it
    A['sx_est'] = A['biacromial'] / 2 - 0.020
    A['margin_waist'] = A['sx_est'] - A['waistbreadth'] / 2      # how far the joint stands outside the waist (m)
    A['margin_chest'] = A['sx_est'] - A['chestbreadth'] / 2
    A['deltoid_beyond'] = A['bideltoid'] / 2 - A['sx_est']        # the deltoid's skin beyond the joint centre (m)
    return A


def pct(a, q):
    import numpy as np
    return float(np.percentile(a, q))


def audit(dump_dir, male_csv, female_csv, out):
    import numpy as np
    REF = {'m': ansur(male_csv, 'm'), 'f': ansur(female_csv, 'f')}
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    REAL_HANG, REAL_ARM_R = {}, {}
    for s_, A in REF.items():
        rad = 0.035 if s_ == 'm' else 0.030
        ang = np.degrees(np.arcsin(np.clip((A['waistbreadth'] / 2 + rad - A['sx_est']) / (A['shoulderelbow'] - 0.04), -1, 1)))
        arm_len = A['shoulderelbow'] - 0.04 + A['forearm']
        ang3 = np.degrees(np.arcsin(np.clip((A['hipbreadth'] / 2 + 0.025 - A['sx_est']) / arm_len, -1, 1)))
        REAL_HANG[s_] = float(np.percentile(np.maximum(ang, ang3), 98))
        # the flexed biceps circumference / 2 pi: a tensed arm's radius, so an upper bound for a relaxed one
        REAL_ARM_R[s_] = float(np.percentile(A['biceps'] / (2 * np.pi), 98)) * 100
    rows = []
    for fn in sorted(os.listdir(dump_dir)):
        if not fn.endswith('.npz'): continue
        name = fn[:-4]
        sex = 'f' if ('Female' in name or '_FA' in name) else 'm'
        A = REF[sex]
        m = measure(os.path.join(dump_dir, fn))
        st = m['stature']
        chest_h = float(np.median(A['chestheight'] / A['stature'])) * st
        waist_h = float(np.median(A['waistheight'] / A['stature'])) * st
        br = m['_breadth']
        r = {'base': name, 'sex': sex, 'stature_cm': st * 100, 'sx_cm': m['sx'] * 100, 'upper_arm_cm': m['upper_arm'] * 100,
             'elbow_height_cm': m['elbow_height'] * 100, 'waist_at_elbow_cm': (m['waist_at_elbow'] or 0) * 100,
             'waist_omphalion_cm': (br(waist_h) or 0) * 100, 'chest_breadth_cm': (br(chest_h) or 0) * 100,
             'chest_depth_cm': (br(chest_h, depth=True) or 0) * 100, 'skin_over_joint_cm': (m['skin_over_joint'] or 0) * 100}
        r['hip_at_wrist_cm'] = (m['hip_at_wrist'] or 0) * 100; r['forearm_cm'] = m['forearm'] * 100
        r['upper_arm_radius_cm'] = round(m['arm_r_med'] * 100, 1); r['upper_arm_radius_p90_cm'] = round(m['arm_r_p90'] * 100, 1)
        r['deltoid_beyond_joint_cm'] = round((m['deltoid_beyond_joint'] or 0) * 100, 1)
        r['margin_waist_cm'] = r['sx_cm'] - r['waist_at_elbow_cm'] / 2
        r['margin_chest_cm'] = r['sx_cm'] - r['chest_breadth_cm'] / 2
        # each against real people of the sex, scaled to this base's stature (ANSUR's share of stature, p2-p98)
        def band(key, val_cm, scale=True):
            a = A[key] / A['stature'] * st if scale else A[key]
            lo, med, hi = pct(a, 2) * 100, pct(a, 50) * 100, pct(a, 98) * 100
            z = float((val_cm / 100 - a.mean()) / a.std())
            return {'value': round(val_cm, 1), 'real_p2': round(lo, 1), 'real_p50': round(med, 1), 'real_p98': round(hi, 1), 'z': round(z, 2),
                    'out': bool(val_cm < lo or val_cm > hi)}
        r['vs'] = {'sx (GH offset)': band('sx_est', r['sx_cm']), 'waist breadth (omphalion)': band('waistbreadth', r['waist_omphalion_cm']),
                   'waist breadth at the elbow': band('waistbreadth', r['waist_at_elbow_cm']), 'chest breadth': band('chestbreadth', r['chest_breadth_cm']),
                   'chest depth': band('chestdepth', r['chest_depth_cm']),
                   'joint outside the waist': band('margin_waist', r['margin_waist_cm'], scale=False),
                   'shoulder skin beyond the joint': band('deltoid_beyond', r['deltoid_beyond_joint_cm'], scale=False),
                   'joint outside the chest': band('margin_chest', r['margin_chest_cm'], scale=False)}
        # the least upper-arm angle from vertical at which the elbow's inner side clears the waist (the arm's radius at the
        # elbow ~3.5 cm men, 3.0 cm women: ANSUR's flexed-forearm circumference / 2 pi less soft tissue)
        rad = 3.5 if sex == 'm' else 3.0
        need = (r['waist_at_elbow_cm'] / 2 + rad - r['sx_cm']) / max(1.0, r['upper_arm_cm'])
        r['least_hang_deg'] = round(float(np.degrees(np.arcsin(np.clip(need, -1, 1)))), 1)
        # with the arm's own measured thickness at the elbow (its sleeve; ~0.8 of the mid-arm radius), and the straight arm's
        # wrist (radius 2.5 cm) past the hips at the wrist's height
        need2 = (r['waist_at_elbow_cm'] / 2 + 0.8 * r['upper_arm_radius_p90_cm'] - r['sx_cm']) / max(1.0, r['upper_arm_cm'])
        r['least_hang_sleeve_deg'] = round(float(np.degrees(np.arcsin(np.clip(need2, -1, 1)))), 1)
        need3 = (r['hip_at_wrist_cm'] / 2 + 2.5 - r['sx_cm']) / max(1.0, r['upper_arm_cm'] + r['forearm_cm'])
        r['least_hang_wrist_deg'] = round(float(np.degrees(np.arcsin(np.clip(need3, -1, 1)))), 1)
        flags = []
        if r['vs']['joint outside the waist']['value'] < r['vs']['joint outside the waist']['real_p2']: flags.append('waist stands out towards or past the shoulder joint (beyond real people)')
        # (the chest's breadth is not flagged: in Rocketbox's A-pose bind the slice at the nipples' height takes in the skin of
        # the armpit and the inner sleeve, weighted to the trunk, so it reads 5-10 cm over the trunk's own breadth)
        if r['vs']['waist breadth at the elbow']['out']: flags.append('waist breadth at the elbow outside real people')
        if r['vs']['shoulder skin beyond the joint']['value'] > r['vs']['shoulder skin beyond the joint']['real_p98']: flags.append('the shoulder joint sits too far in for its mesh (skin beyond it past real people)')
        if r['vs']['sx (GH offset)']['out']: flags.append('shoulder joints\' spacing outside real people')
        if r['vs']['chest depth']['out']: flags.append('chest depth outside real people')
        hang = max(r['least_hang_deg'], r['least_hang_sleeve_deg'], r['least_hang_wrist_deg'])
        if hang > REAL_HANG[sex]: flags.append(f"a hanging arm must stand {hang:.0f} deg out to clear the waist or hips (real people of the sex: at most {REAL_HANG[sex]:.0f}, p98)")
        # the sleeved arm's mean radius against a real arm's (flexed biceps / 2 pi, p98: over a relaxed arm) plus a jacket's
        # radial ease (1.6 cm at most, docs/PEOPLE_MOTION.md §2.6)
        if r['upper_arm_radius_cm'] > REAL_ARM_R[sex] + 1.6: flags.append(f"upper arm with its sleeve {r['upper_arm_radius_cm']:.1f} cm round the bone, a real arm in a jacket at most {REAL_ARM_R[sex] + 1.6:.1f}")
        r['flags'] = flags
        rows.append(r)
    ref = {s: {k: [round(pct(v, 2) * 100, 1), round(pct(v, 50) * 100, 1), round(pct(v, 98) * 100, 1)] for k, v in A.items()} for s, A in REF.items()}
    real_hang = {}
    for s, A in REF.items():
        rad = 0.035 if s == 'm' else 0.030
        upper = A['shoulderelbow'] - 0.04
        ang = np.degrees(np.arcsin(np.clip((A['waistbreadth'] / 2 + rad - A['sx_est']) / upper, -1, 1)))
        ang3 = np.degrees(np.arcsin(np.clip((A['hipbreadth'] / 2 + 0.025 - A['sx_est']) / (upper + A['forearm']), -1, 1)))
        both = np.maximum(ang, ang3)
        real_hang[s] = {'elbow_past_waist': [round(pct(ang, 2), 1), round(pct(ang, 50), 1), round(pct(ang, 98), 1)],
                        'wrist_past_hips': [round(pct(ang3, 2), 1), round(pct(ang3, 50), 1), round(pct(ang3, 98), 1)],
                        'either': [round(pct(both, 2), 1), round(pct(both, 50), 1), round(pct(both, 98), 1)],
                        'arm_radius_flexed_cm': [round(pct(A['biceps'] / (2 * np.pi), 2) * 100, 1), round(pct(A['biceps'] / (2 * np.pi), 50) * 100, 1), round(pct(A['biceps'] / (2 * np.pi), 98) * 100, 1)]}
    json.dump({'bases': rows, 'ansur_cm_p2_p50_p98': ref, 'real_least_hang_deg_p2_p50_p98': real_hang}, open(out, 'w'), indent=1)
    return rows, ref, real_hang


if __name__ == '__main__':
    a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    if a[0] == 'dump': dump(a[1], a[2:])
    elif a[0] == 'audit':
        rows, ref, hang = audit(a[1], a[2], a[3], a[4])
        print('real people, least hang to clear the waist (deg, p2/p50/p98):', hang)
        for r in rows:
            print(f"{r['base']:22s} {r['sex']} H {r['stature_cm']:.0f} sx {r['sx_cm']:.1f} waist@elb {r['waist_at_elbow_cm']:.1f} hip@wr {r['hip_at_wrist_cm']:.1f} chest {r['chest_breadth_cm']:.1f}x{r['chest_depth_cm']:.1f} "
                  f"arm r {r['upper_arm_radius_cm']:.1f}/{r['upper_arm_radius_p90_cm']:.1f} mW {r['margin_waist_cm']:.1f} mC {r['margin_chest_cm']:.1f} hang {r['least_hang_deg']:.0f}/{r['least_hang_sleeve_deg']:.0f}/{r['least_hang_wrist_deg']:.0f} | {'; '.join(r['flags'])}")
