"""The Rocketbox library in one mesh layout (docs/PEOPLE_RESEARCH.md §7): our base head (MakeHuman topology, player_f/m
Body_LOD0) fitted onto each Rocketbox head (landmarks, similarity, thin-plate warp, then projected onto its skin and
smoothed), so every face is the same vertices and can be measured feature by feature and compared young against old.
Writes an .npz: names, sex, X (faces x head vertices x 3, metres, eyes' middle at the origin, facing -Y, Z up), UV (the
Rocketbox texture coordinates under each vertex), idx (the template's head vertices), fit (landmark residual, mean
projection distance). Usage: blender -b --python rocketbox_register.py -- <player_f.fbx> <player_m.fbx> <fbx dir> <out.npz>"""
import bpy, sys, os, glob, numpy as np, mathutils, bmesh
from mathutils.bvhtree import BVHTree
pf, pm, fbx_dir, out = sys.argv[sys.argv.index('--') + 1:][:4]
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def world(o, co): M = np.array(o.matrix_world); return co @ M[:3, :3].T + M[:3, 3]
def coords(o, key=None):
    src = key.data if key is not None else o.data.vertices
    a = np.zeros(len(src) * 3); src.foreach_get('co', a); return world(o, a.reshape(-1, 3))
def bone(arm, name): return np.array(arm.matrix_world @ arm.data.bones[name].head_local)

def landmarks(V, eL, eR):
    mid = (eL + eR) / 2; ipd = np.linalg.norm(eL - eR)
    up = np.array([0, 0, 1.0]); right = (eR - eL) / ipd
    fwd = np.array([0, -1.0, 0]); fwd -= up * fwd.dot(up); fwd -= right * fwd.dot(right); fwd /= np.linalg.norm(fwd)
    lat = (V - mid) @ right; z = (V - mid) @ up; f = (V - mid) @ fwd
    head = (np.abs(lat) < 1.6 * ipd) & (z > -2.4 * ipd) & (z < 2.6 * ipd) & (f > -3.5 * ipd)
    def best(mask, score):
        i = np.where(mask & head)[0]; return V[i[np.argmax(score[i])]]
    ml = np.abs(lat) < 0.15 * ipd
    # the face's own points only (a fringe, a bun or hair over the ears is modelled in some heads' own mesh)
    nose = best(ml & (z < -0.2 * ipd) & (z > -1.1 * ipd), f); fn = (nose - mid) @ fwd
    lips = best(ml & (z < -1.1 * ipd) & (z > -1.6 * ipd), f); fl = (lips - mid) @ fwd
    ala = (z < -0.55 * ipd) & (z > -0.95 * ipd) & (f > fn - 0.55 * ipd) & (np.abs(lat) < 0.6 * ipd)
    corner = (z < -1.1 * ipd) & (z > -1.5 * ipd) & (f > fl - 0.45 * ipd) & (np.abs(lat) < 0.85 * ipd)
    return {'eL': eL, 'eR': eR, 'nose': nose, 'lips': lips, 'chin': best(ml & (z < -1.6 * ipd) & (z > -2.2 * ipd), f),
            'alaL': best(ala & (lat < 0), -lat), 'alaR': best(ala & (lat > 0), lat),
            'mouthL': best(corner & (lat < 0), -lat), 'mouthR': best(corner & (lat > 0), lat)}, mid, ipd

def load_template(path):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=path)
    body = bpy.data.objects['Body_LOD0']; arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    V = coords(body, body.data.shape_keys.key_blocks['Basis'])
    bm = bmesh.new(); bm.from_mesh(body.data)
    edges = np.array([[e.verts[0].index, e.verts[1].index] for e in bm.edges]); bm.free()
    L, mid, ipd = landmarks(V, bone(arm, 'LeftEye'), bone(arm, 'RightEye'))
    z = V[:, 2] - mid[2]; lat = V[:, 0] - mid[0]
    region = (z > -2.9 * ipd) & (np.abs(lat) < 1.8 * ipd)
    return V, edges, L, mid, ipd, region

T = {'f': load_template(pf), 'm': load_template(pm)}
idx = np.where(T['f'][5] & T['m'][5])[0]

names, sexes, Xs, UVs, fits = [], [], [], [], []
def one(path, name, sex):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=path)
    mesh = next((o for o in bpy.data.objects if o.type == 'MESH' and 'hipoly' in o.name.lower()), None) or next((o for o in bpy.data.objects if o.type == 'MESH'), None)
    arm = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)
    if mesh is None or arm is None or 'Bip01 LEye' not in arm.data.bones: raise RuntimeError('no mesh or eyes')
    VR = coords(mesh)
    mats = [m.name if m else '' for m in mesh.data.materials]
    pm_ = np.zeros(len(mesh.data.polygons), int); mesh.data.polygons.foreach_get('material_index', pm_)
    head_mats = [i for i, n in enumerate(mats) if n.endswith('_head')]
    tris_r, uv_r = [], []
    uvl = mesh.data.uv_layers.active.data
    vmask = np.zeros(len(VR), bool)
    for p, mi in zip(mesh.data.polygons, pm_):
        if mi not in head_mats: continue
        vs = list(p.vertices); ls = list(p.loop_indices); vmask[vs] = True
        for k in range(1, len(vs) - 1):
            tris_r.append((vs[0], vs[k], vs[k + 1])); uv_r.append((uvl[ls[0]].uv[:], uvl[ls[k]].uv[:], uvl[ls[k + 1]].uv[:]))
    tris_r = np.array(tris_r); uv_r = np.array(uv_r)
    V0, edges, LO, midO, ipdO, _ = T[sex]
    LR, midR, ipdR = landmarks(VR[vmask], bone(arm, 'Bip01 LEye'), bone(arm, 'Bip01 REye'))
    A = np.array([LO[k] for k in LO]); B = np.array([LR[k] for k in LO])
    ma, mb = A.mean(0), B.mean(0); U, Sg, Vt = np.linalg.svd((B - mb).T @ (A - ma)); D = np.eye(3); D[2, 2] = np.sign(np.linalg.det(U @ Vt))
    R = U @ D @ Vt; s = (Sg * np.diag(D)).sum() / ((A - ma) ** 2).sum(); t = mb - s * R @ ma
    P = s * A @ R.T + t; W = B - P; n = len(P)
    K = np.linalg.norm(P[:, None] - P[None], axis=2)
    M = np.zeros((n + 4, n + 4)); M[:n, :n] = K + 1e-6 * np.eye(n); M[:n, n] = 1; M[:n, n + 1:] = P; M[n, :n] = 1; M[n + 1:, :n] = P.T
    coef = np.linalg.solve(M, np.vstack([W, np.zeros((4, 3))]))
    Y = s * V0 @ R.T + t; X = Y + np.linalg.norm(Y[:, None] - P[None], axis=2) @ coef[:n] + coef[n] + Y @ coef[n + 1:]
    resid = np.linalg.norm(s * A @ R.T + t - B, axis=1).max()
    # onto their skin: the closest point, the offset smoothed over our mesh's edges, three rounds
    tree = BVHTree.FromPolygons([tuple(map(float, v)) for v in VR], [tuple(map(int, tr)) for tr in tris_r])
    sel = np.zeros(len(V0), bool); sel[idx] = True
    nb = [[] for _ in range(len(V0))]
    for a, b in edges:
        if sel[a] and sel[b]: nb[a].append(b); nb[b].append(a)
    for it in range(3):
        off = np.zeros_like(X); hit = np.zeros(len(X), bool)
        for i in idx:
            loc, nrm, fi, d = tree.find_nearest(mathutils.Vector(X[i]))
            if fi is not None and d < 0.03: off[i] = np.array(loc) - X[i]; hit[i] = True
        sm = off.copy()
        for _ in range(4):
            sm = np.array([sm[i] if not nb[i] else 0.5 * sm[i] + 0.5 * sm[nb[i]].mean(0) for i in range(len(sm))])
        X[idx] += sm[idx] * (1.0 if it < 2 else 1.0)
    # the texture under each vertex
    uv = np.zeros((len(idx), 2)); dist = []
    for j, i in enumerate(idx):
        loc, nrm, fi, d = tree.find_nearest(mathutils.Vector(X[i])); dist.append(d)
        a, b, c = VR[tris_r[fi]]
        w = mathutils.geometry.barycentric_transform(loc, mathutils.Vector(a), mathutils.Vector(b), mathutils.Vector(c),
                                                     mathutils.Vector((1, 0, 0)), mathutils.Vector((0, 1, 0)), mathutils.Vector((0, 0, 1)))
        uv[j] = np.array(w) @ uv_r[fi]
    names.append(name); sexes.append(sex); Xs.append(X[idx] - midR); UVs.append(uv); fits.append((resid, float(np.mean(dist))))
    print(f'{name}: {sex} landmarks {resid * 1000:.1f} mm, surface {np.mean(dist) * 1000:.2f} mm')


for path in sorted(glob.glob(os.path.join(fbx_dir, '*.fbx'))):
    name = os.path.basename(path)[:-4]
    sex = 'f' if 'Female' in name else 'm'
    try:
        one(path, name, sex)
    except Exception as e:
        print('skip', name, repr(e))
np.savez_compressed(out, names=np.array(names), sex=np.array(sexes), X=np.array(Xs, np.float32), UV=np.array(UVs, np.float32), idx=idx, fit=np.array(fits))
print('wrote', out, len(names))
