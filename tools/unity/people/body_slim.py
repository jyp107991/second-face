"""The baked sleeves of the broad bases slimmed to a real garment's stand-off (docs/MOTION_ROOT_CAUSE.md §7, T5).

Rocketbox bakes each base's clothes into the body's own surface. On five broad men (docs/qa/body_geometry_audit.md) the
sleeves stand 7-9 cm round the upper arm's bone and 7-9 cm round the elbow; a real man's arm in a jacket is at most about
8.7 and 6.8 there (ANSUR II men 176-186 cm with a waist over 38 cm, p90: flexed biceps circumference 44.6 cm, flexed
forearm 36.4 cm, wrist 18.7 cm; plus a jacket's 1.6 cm radial ease, docs/PEOPLE_MOTION.md §2.6). A hanging arm had to
stand 14-17° out to clear the body, against about 11° for a real man in a jacket.

Each cross-section of each arm segment (upper arm, forearm) is scaled about the bone's axis so that its median radius is
no more than the real cap at that point, and then any of its vertices standing more than the jacket's ease beyond that
median is drawn halfway in (a hem or a fold that stands off further than cloth does): the section keeps its own shape,
its folds and its texture, only thinner. The shoulder (the upper arm's first fifth) and the cuff over the hand are left
as they are, with a smooth fade. Vertices weighted to several bones move by their weight on the segment.

    python3 -I tools/unity/people/body_slim.py <dump_dir> <out_dir> [id ...]

In use (2026-11-18, the coordinator on T5: garments and gear brought to real thickness on six broad bases, the sleeves and the flanks;
docs/qa/body_geometry_audit.md §6). Held before (2026-11-17): the A1 failures on these bases came from the old idles and the arm stack, not the sleeves
(docs/MOTION_ROOT_CAUSE.md §7). Ready for one case only: if the review at the game camera or the garment rule (§2.6 of
docs/PEOPLE_MOTION.md: never padded or rubbery) finds a padded sleeve or slab on a base. To use it: copy BodySlim.cs (beside
this file) into unity/Assets/SecondFace/Editor/Build/, run body_slim_patch_import.py (RocketboxImportPostprocessor applies
the slim before everything measured from the body's mesh), add both and People/Rocketbox/*/*_slim.bytes to the motion
gate's inputs, then: tools/unity/editor.sh run SecondFace.EditorTools.BodySlim.Dump (SLIM_DUMP, SLIM_OUT), this script,
tools/unity/editor.sh run SecondFace.EditorTools.BodySlim.Rebuild, and the gate.

<dump_dir> holds <id>.slimdump (Unity: SecondFace.EditorTools.BodySlim.Dump, SLIM_DUMP, SLIM_OUT): each person's meshes in
the bind pose as imported, less any slim. Writes <out_dir>/<id>_slim.bytes (the body mesh's own space: index, position
delta, normal delta) and prints, before and after, the audit's measures (tools/qa/calibration/body_geometry.py: sleeve
radius, chest depth, least hang) and the elbow's radius.
"""
import json, os, struct, sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'qa', 'calibration'))

# the bases slimmed: the five whose hanging arm must stand 14-17° out with their own sleeves and gear (the audit's §2 and
# item 6: Medical_Male_02 14°), and Male_Adult_05, cap_PM02m's own mesh (the coordinator's decision, 2026-11-18)
BASES = ['Construction_Male_02', 'cap_Police_Male_03n', 'cap_Military_Male_03n', 'cap_PM02m', 'Male_Adult_05', 'Medical_Male_02']
# a jacket sleeve over the arm: real fabric plus ease, about 1 cm radial (2026-11-18; 1.6 before, the most a jacket stands
# off, docs/PEOPLE_MOTION.md §2.6)
EASE = 0.010
# the real cap (m) along each segment (t from its joint), a broad man's arm at p90 plus the ease
UA_CAP = [(0.0, 0.081), (0.7, 0.081), (1.0, 0.062)]           # biceps r 7.1 cm; the elbow ~0.9 of the forearm's 5.8
FA_CAP = [(0.0, 0.062), (0.3, 0.068), (1.0, 0.040)]           # forearm r 5.8 cm at its widest; wrist r 3.0
# the flanks where the arms hang: gear standing out of the trunk's own side (a belt rig, side pouches, a carrier's edge) is
# drawn in to the side's own smooth line plus a thin layer, as real kit is worn clear of the flanks (pouches front and back)
FLANK_LAYER = 0.010     # what may stand on the flank's own line (a belt flat on the side), m
FLANK_KEEP = 0.25       # the share of the gear's excess kept (its shape, folds and texture, only flatter)
FLANK_BAND = (-0.12, 0.12)  # the band, m, about the hanging elbow's height (the forearm's top to the elbow's)
FLANK_FADE = 0.04
FADE = {'ua': (0.12, 0.25), 'fa_end': (0.85, 0.97)}           # left alone: the shoulder's cap, the cuff over the hand
OUTLIER = 0.5           # a vertex further than the ease past its section's median: this share of the excess kept


def read_dump(path):
    b = open(path, 'rb').read()
    o = 0

    def take(fmt):
        nonlocal o
        v = struct.unpack_from('<' + fmt, b, o)
        o += struct.calcsize('<' + fmt)
        return v

    def string():
        nonlocal o
        n = shift = 0
        while True:
            c = b[o]; o += 1
            n |= (c & 0x7F) << shift
            if c < 0x80: break
            shift += 7
        s = b[o:o + n].decode('utf-8'); o += n
        return s
    assert b[:4] == b'RBD1'; o = 4
    meshes = []
    (nm,) = take('i')
    for _ in range(nm):
        (is_body, nv) = take('ii')
        P = np.array(take(f'{3 * nv}f'), dtype=np.float64).reshape(nv, 3)
        N = np.array(take(f'{3 * nv}f'), dtype=np.float64).reshape(nv, 3)
        raw = struct.unpack_from('<' + 'iiiiffff' * nv, b, o); o += struct.calcsize('<' + 'iiiiffff' * nv)
        raw = np.array(raw, dtype=np.float64).reshape(nv, 8)
        idx, wts = raw[:, :4].astype(np.int64), raw[:, 4:]
        (nb,) = take('i')
        names = [string() for _ in range(nb)]
        (nt,) = take('i')
        T = np.array(take(f'{nt}i'), dtype=np.int64).reshape(-1, 3)
        w2m = np.array(take('16f')).reshape(4, 4, order='F')       # Unity's Matrix4x4 indexer is column-major
        meshes.append({'body': bool(is_body), 'P': P, 'N': N, 'idx': idx, 'w': wts, 'names': names, 'T': T, 'w2m': w2m})
    (nbones,) = take('i')
    bones = {}
    for _ in range(nbones):
        n = string(); bones[n] = np.array(take('fff'))
    return meshes, bones


def weight_on(m, keys):
    """Each vertex's weight on the bones whose names hold any of keys."""
    sel = np.array([any(k in n for k in keys) for n in m['names']] + [False])
    idx = np.where(m['idx'] < len(m['names']), m['idx'], len(m['names']))
    return (sel[idx] * m['w']).sum(axis=1)


def interp(prof, t):
    xs, ys = zip(*prof)
    return np.interp(t, xs, ys)


def smoothstep(a, b, x):
    u = np.clip((x - a) / (b - a), 0, 1)
    return u * u * (3 - 2 * u)


def slim(m, bones):
    """Position deltas (world) for the body mesh m."""
    P = m['P']; D = np.zeros_like(P)
    for side in 'LR':
        J, E, H = bones[f'Bip01 {side} UpperArm'], bones[f'Bip01 {side} Forearm'], bones[f'Bip01 {side} Hand']
        for seg, (a, c), keys, cap in (('ua', (J, E), [f'{side} UpperArm', f'{side} UpArmTwist'], UA_CAP),
                                       ('fa', (E, H), [f'{side} Forearm', f'{side} ForeTwist'], FA_CAP)):
            w = weight_on(m, keys)
            L = np.linalg.norm(c - a); ax = (c - a) / L
            rel = P - a; s = rel @ ax; t = s / L
            rad = rel - np.outer(s, ax); r = np.linalg.norm(rad, axis=1)
            own = (w > 0.6) & (r < 0.12) & (t > -0.05) & (t < 1.05)
            # the section's median radius, by tenths of the segment, smoothed
            bins = np.linspace(0, 1, 11); mids = 0.5 * (bins[1:] + bins[:-1]); med = np.full(10, np.nan)
            for k in range(10):
                sel = own & (t >= bins[k]) & (t < bins[k + 1])
                if sel.sum() >= 4: med[k] = np.median(r[sel])
            ok = ~np.isnan(med)
            if ok.sum() < 3: continue
            med = np.interp(mids, mids[ok], med[ok])
            med = np.convolve(np.pad(med, 1, mode='edge'), np.ones(3) / 3, mode='valid')
            mt = np.interp(t, mids, med)
            target = np.minimum(mt, interp(cap, np.clip(t, 0, 1)))
            k_scale = target / np.maximum(mt, 1e-4)
            r1 = r * k_scale
            # a hem or fold past the jacket's ease beyond the section's median: drawn halfway in
            edge = target + EASE
            r2 = np.where(r1 > edge, edge + (r1 - edge) * OUTLIER, r1)
            fade = np.ones_like(t)
            if seg == 'ua': fade *= smoothstep(*FADE['ua'], t)
            else: fade *= 1 - smoothstep(*FADE['fa_end'], t)
            fade *= (t > -0.05) & (t < 1.05) & (r < 0.14)
            move = w * fade * (r2 - r)
            unit = rad / np.maximum(r, 1e-6)[:, None]
            D += unit * move[:, None]
    return D


def section(P, T, keep, h):
    """The points where a level plane at height h cuts the triangles kept (the audit's own cut)."""
    y = P[:, 1] - h; tri = T[keep]; pts = []
    for a, b in ((0, 1), (1, 2), (2, 0)):
        ia, ib = tri[:, a], tri[:, b]; ya, yb = y[ia], y[ib]; cut = ya * yb < 0
        t = (ya[cut] / (ya[cut] - yb[cut]))[:, None]
        pts.append(P[ia[cut]] + t * (P[ib[cut]] - P[ia[cut]]))
    return np.concatenate(pts) if pts else np.zeros((0, 3))


def flanks(m, bones, D):
    """Position deltas (world) drawing gear on the trunk's flanks where the arms hang in to the flank's own line.
    The line: each side's lateral extent, the mesh cut every centimetre from the pelvis to the chest (the audit's cut, so a
    coarse mesh's sparse vertices do not read as a narrow trunk), fitted by a quadratic in height; slices standing out of
    that fit by more than 5 mm (a pouch, a belt rig's side, a carrier's edge) are left out and the fit made again. Gear is
    what stands more than FLANK_LAYER over the line within FLANK_BAND of the hanging elbow's height; a smooth trunk, however
    broad, is left as it is."""
    P = m['P'] + D; T = m['T']
    arm = weight_on(m, ['UpperArm', 'UpArmTwist', 'Forearm', 'ForeTwist', 'Hand', 'Finger'])
    keep_t = (arm[T] < 0.5).all(axis=1)
    pel = bones['Bip01 Pelvis']; ch = bones.get('Bip01 Spine2', pel + np.array([0, 0.35, 0]))
    ua_len = np.linalg.norm(bones['Bip01 L Forearm'] - bones['Bip01 L UpperArm'])
    elbow_y = 0.5 * (bones['Bip01 L UpperArm'][1] + bones['Bip01 R UpperArm'][1]) - ua_len
    mid = pel[0]
    hs = np.arange(pel[1], ch[1] + 0.001, 0.01)
    secs = [section(P, T, keep_t, h) for h in hs]
    secs = [s_[np.abs(s_[:, 0] - mid) < 0.30] for s_ in secs]
    trunk_v = (arm < 0.2) & (P[:, 1] > pel[1] - 0.02) & (P[:, 1] < ch[1] + 0.02) & (np.abs(P[:, 0] - mid) < 0.32)
    band = smoothstep(elbow_y + FLANK_BAND[0] - FLANK_FADE, elbow_y + FLANK_BAND[0], P[:, 1]) * (1 - smoothstep(elbow_y + FLANK_BAND[1], elbow_y + FLANK_BAND[1] + FLANK_FADE, P[:, 1]))
    out = np.zeros_like(P); report = {}
    for sgn, name in ((1, '+x'), (-1, '-x')):
        ys, ws = [], []
        for h, s_ in zip(hs, secs):
            l = sgn * (s_[:, 0] - mid)
            if len(l) >= 4 and (l > 0).any(): ys.append(h); ws.append(l.max())
        ys, ws = np.array(ys), np.array(ws)
        if len(ys) < 10: continue
        c = np.polyfit(ys, ws, 2)
        ok = ws - np.polyval(c, ys) < 0.005
        if ok.sum() >= 10: c = np.polyfit(ys[ok], ws[ok], 2)
        lat = sgn * (P[:, 0] - mid)
        edge = np.polyval(c, P[:, 1]) + FLANK_LAYER
        over = trunk_v & (lat > edge)
        new_lat = np.where(over, edge + (lat - edge) * FLANK_KEEP, lat)
        move = (new_lat - lat) * band * (1 - arm)
        out[:, 0] += sgn * move
        inb = (ys > elbow_y + FLANK_BAND[0]) & (ys < elbow_y + FLANK_BAND[1])
        report[name] = {'gear_cm_max': round(float(np.max(ws[inb] - np.polyval(c, ys[inb]))) * 100, 2) if inb.any() else 0.0,
                        'moved_cm_max': round(float(np.max(np.abs(move))) * 100, 2)}
    return out, report


def normals_after(m, D):
    """The normals turned by the deformation: each vertex's neighbourhood (its triangles) refit before and after."""
    P0, P1, T = m['P'], m['P'] + D, m['T']
    def face_normals(P):
        n = np.cross(P[T[:, 1]] - P[T[:, 0]], P[T[:, 2]] - P[T[:, 0]])
        acc = np.zeros_like(P)
        for k in range(3): np.add.at(acc, T[:, k], n)
        return acc / np.maximum(np.linalg.norm(acc, axis=1), 1e-12)[:, None]
    n0, n1 = face_normals(P0), face_normals(P1)
    moved = np.linalg.norm(D, axis=1) > 1e-5
    # the authored normal turned by the rotation that takes the geometric normal before to the one after
    out = m['N'].copy()
    for i in np.where(moved)[0]:
        a, b = n0[i], n1[i]
        v = np.cross(a, b); c = float(a @ b)
        if np.linalg.norm(v) < 1e-9: continue
        vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
        R = np.eye(3) + vx + vx @ vx / (1 + c)
        out[i] = R @ out[i]
    return out


def audit_npz(meshes, bones, D, path):
    """The audit's input (tools/qa/calibration/body_geometry.py dump): every mesh, arm weight, triangles, the bones."""
    from body_geometry import ARM, BONES
    V, W, F = [], [], []
    for m in meshes:
        base = sum(len(x) for x in V)
        P = m['P'] + (D if m['body'] and D is not None else 0)
        V.append(P); W.append(weight_on(m, list(ARM))); F.append(m['T'] + base)
    names = [b for b in BONES if b in bones]
    np.savez_compressed(path, V=np.concatenate(V), W=np.concatenate(W), F=np.concatenate(F).astype(np.int32),
                        bone_names=np.array(names), bone_pos=np.array([bones[b] for b in names]))


def elbow_radius(meshes, bones, D):
    m = next(x for x in meshes if x['body']); P = m['P'] + (D if D is not None else 0)
    out = []
    for side in 'LR':
        J, E = bones[f'Bip01 {side} UpperArm'], bones[f'Bip01 {side} Forearm']
        w = weight_on(m, [f'{side} UpperArm', f'{side} UpArmTwist', f'{side} Forearm', f'{side} ForeTwist'])
        L = np.linalg.norm(E - J); ax = (E - J) / L; rel = P - J; s = rel @ ax
        r = np.linalg.norm(rel - np.outer(s, ax), axis=1)
        sel = (w > 0.6) & (s / L > 0.8) & (s / L < 1.0) & (r < 0.12)
        out.append(r[sel])
    rr = np.concatenate(out)
    return float(np.median(rr)) * 100, float(np.percentile(rr, 90)) * 100


def least_hangs(npz):
    from body_geometry import measure
    m = measure(npz)
    st = m['stature']
    br = m['_breadth']
    waist = (m['waist_at_elbow'] or 0) * 100
    sx = m['sx'] * 100; ua = m['upper_arm'] * 100
    p90 = m['arm_r_p90'] * 100
    hang_sleeve = float(np.degrees(np.arcsin(np.clip((waist / 2 + 0.8 * p90 - sx) / ua, -1, 1))))
    chest_h = 0.734 * st     # ANSUR II men's chest height over stature (median 128.9 / 175.5), as the audit takes it
    return {'stature_cm': st * 100, 'waist_at_elbow_cm': waist, 'arm_r_med_cm': m['arm_r_med'] * 100, 'arm_r_p90_cm': p90,
            'chest_depth_cm': (br(chest_h, depth=True) or 0) * 100, 'least_hang_sleeve_deg': hang_sleeve}


def write_bytes(path, m, D, Nafter):
    w2m = m['w2m'][:3, :3]
    dp = D @ w2m.T
    dn = (Nafter - m['N']) @ w2m.T
    moved = np.where(np.linalg.norm(D, axis=1) > 1e-6)[0]
    with open(path, 'wb') as f:
        f.write(b'RBS1'); f.write(struct.pack('<i', len(m['P'])))
        f.write(struct.pack('<i', len(moved)))
        for i in moved:
            f.write(struct.pack('<i6f', int(i), *dp[i], *dn[i]))
    return len(moved)


def main(dump_dir, out_dir, ids):
    os.makedirs(out_dir, exist_ok=True)
    rows = []
    for id_ in ids or BASES:
        meshes, bones = read_dump(os.path.join(dump_dir, id_ + '.slimdump'))
        body = next(m for m in meshes if m['body'])
        D = slim(body, bones) if id_ in BASES else np.zeros_like(body['P'])
        flank = {}
        if id_ in BASES:
            Df, flank = flanks(body, bones, D)
            D = D + Df
        tmp = os.path.join(out_dir, '_audit'); os.makedirs(tmp, exist_ok=True)
        audit_npz(meshes, bones, None, os.path.join(tmp, id_ + '_before.npz'))
        audit_npz(meshes, bones, D, os.path.join(tmp, id_ + '_after.npz'))
        before = least_hangs(os.path.join(tmp, id_ + '_before.npz')); after = least_hangs(os.path.join(tmp, id_ + '_after.npz'))
        before['elbow_r_cm'], before['elbow_r_p90_cm'] = elbow_radius(meshes, bones, None)
        after['elbow_r_cm'], after['elbow_r_p90_cm'] = elbow_radius(meshes, bones, D)
        moved = 0
        if id_ in BASES:
            Nafter = normals_after(body, D)
            moved = write_bytes(os.path.join(out_dir, id_ + '_slim.bytes'), body, D, Nafter)
        mv = np.linalg.norm(D, axis=1) * 100
        rows.append({'base': id_, 'before': before, 'after': after, 'moved_vertices': moved, 'flanks': flank,
                     'move_cm_p50_max': [round(float(np.median(mv[mv > 0.01])), 2) if (mv > 0.01).any() else 0, round(float(mv.max()), 2)]})
        b, a = before, after
        print(f"{id_:22s} sleeve r {b['arm_r_med_cm']:.1f}/{b['arm_r_p90_cm']:.1f} -> {a['arm_r_med_cm']:.1f}/{a['arm_r_p90_cm']:.1f}  "
              f"elbow r {b['elbow_r_cm']:.1f}/{b['elbow_r_p90_cm']:.1f} -> {a['elbow_r_cm']:.1f}/{a['elbow_r_p90_cm']:.1f}  "
              f"chest depth {b['chest_depth_cm']:.1f} -> {a['chest_depth_cm']:.1f}  hang {b['least_hang_sleeve_deg']:.1f} -> {a['least_hang_sleeve_deg']:.1f}  "
              f"moved {moved} (cm p50 {rows[-1]['move_cm_p50_max'][0]}, max {rows[-1]['move_cm_p50_max'][1]})  waist at elbow "
              f"{b['waist_at_elbow_cm']:.1f} -> {a['waist_at_elbow_cm']:.1f}  flanks {flank}")
    json.dump(rows, open(os.path.join(out_dir, 'body_slim.json'), 'w'), indent=1)


if __name__ == '__main__':
    a = sys.argv[1:]
    main(a[0], a[1], a[2:])
