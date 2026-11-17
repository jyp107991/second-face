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

<dump_dir> holds <id>.slimdump (Unity: SecondFace.EditorTools.BodySlim.Dump, SLIM_DUMP, SLIM_OUT): each person's meshes in
the bind pose as imported, less any slim. Writes <out_dir>/<id>_slim.bytes (the body mesh's own space: index, position
delta, normal delta) and prints, before and after, the audit's measures (tools/qa/calibration/body_geometry.py: sleeve
radius, chest depth, least hang) and the elbow's radius.
"""
import json, os, struct, sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'qa', 'calibration'))

# the bases slimmed (the five whose hanging arm must stand 14-17° out with their own sleeves; the audit's §2)
BASES = ['Construction_Male_02', 'cap_Police_Male_03n', 'cap_Military_Male_03n', 'cap_PM02m', 'Male_Adult_05']
EASE = 0.016            # a jacket's radial ease at most (m)
# the real cap (m) along each segment (t from its joint), a broad man's arm at p90 plus the ease
UA_CAP = [(0.0, 0.087), (0.7, 0.087), (1.0, 0.068)]           # biceps r 7.1 cm; the elbow ~0.9 of the forearm's 5.8
FA_CAP = [(0.0, 0.068), (0.3, 0.074), (1.0, 0.046)]           # forearm r 5.8 cm at its widest; wrist r 3.0
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
        rows.append({'base': id_, 'before': before, 'after': after, 'moved_vertices': moved,
                     'move_cm_p50_max': [round(float(np.median(mv[mv > 0.01])), 2) if (mv > 0.01).any() else 0, round(float(mv.max()), 2)]})
        b, a = before, after
        print(f"{id_:22s} sleeve r {b['arm_r_med_cm']:.1f}/{b['arm_r_p90_cm']:.1f} -> {a['arm_r_med_cm']:.1f}/{a['arm_r_p90_cm']:.1f}  "
              f"elbow r {b['elbow_r_cm']:.1f}/{b['elbow_r_p90_cm']:.1f} -> {a['elbow_r_cm']:.1f}/{a['elbow_r_p90_cm']:.1f}  "
              f"chest depth {b['chest_depth_cm']:.1f} -> {a['chest_depth_cm']:.1f}  hang {b['least_hang_sleeve_deg']:.1f} -> {a['least_hang_sleeve_deg']:.1f}  "
              f"moved {moved} (cm p50 {rows[-1]['move_cm_p50_max'][0]}, max {rows[-1]['move_cm_p50_max'][1]})")
    json.dump(rows, open(os.path.join(out_dir, 'body_slim.json'), 'w'), indent=1)


if __name__ == '__main__':
    a = sys.argv[1:]
    main(a[0], a[1], a[2:])
