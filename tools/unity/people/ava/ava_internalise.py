"""An Ava-256 person made into a Rocketbox person (owner, 2026-11-02: "W5 6 7 internalise in consistent Rocketbox style;
M6 M8 M10 M11 internalise as harmoniously as you can, these look real"). The capture (ava_fetch.py: one frame's tracked
mesh and its photographed texture) gives the face: its real shape and its real skin. Rocketbox gives everything else,
as it ships: the eyeballs and the lids round them, the teeth, the scalp and hair, the ears, the neck and body, the rig and
every shape key.
Shape: the capture is put into the eyes' frame used for every Rocketbox head (its eyes found where the texture layout puts
them, the eyeballs' centres 12 mm behind the surface there), its landmarks found the same way as the Rocketbox head's
(rocketbox_features.Face), and fitted to it by a similarity and a near-interpolating thin-plate warp; each Rocketbox face
vertex finds its point on the warped capture and moves to that point on the capture as it really is (only the
similarity), faded out above the brow, behind the cheeks and below the chin, never on the eyeballs, the lids held round
them; applied to the mesh and every shape key.
Skin: each texel of the Rocketbox head's texture on the face (rasterised through its own triangles, on the moved head)
takes its nearest point on the capture and that point's place in the capture's texture, within 140 mm of the eyes, below
AVA_TOP mm above them (the hairline stays Rocketbox's), not within AVA_EYE_KEEP mm of an eye, with feathered edges.
Writes ffhq_map.npz and ffhq.json in ffhq_bake.py's form, so ffhq_bake_finish.py harmonises the skin to Rocketbox's
colour, shading and fine detail and retone.py composites it.
Usage: blender -b --python ava_internalise.py -- <person fbx> <capture dir> <topology obj> <out dir> <name>
Env: AVA_SHAPE (how much of the capture's shape, 1.0), AVA_TOP (40), AVA_EYE_KEEP (12), AVA_REF (a capture whose
landmarks are found and carried to this one by vertex), AVA_FRAMED (the source's vertices are already in the eyes' frame:
a Rocketbox face written out by rb_face_source.py)."""
import bpy, sys, os, json
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import rocketbox_features as rbf

person, cap, topo, out_dir, name = sys.argv[sys.argv.index('--') + 1:][:5]
os.makedirs(out_dir, exist_ok=True)
STRENGTH = float(os.environ.get('AVA_SHAPE', 1.0)); TOP = float(os.environ.get('AVA_TOP', 40.0))
EYE_KEEP = float(os.environ.get('AVA_EYE_KEEP', 12.0)); REACH = 140.0; EAR_X = 72.0; FEATHER = 8.0
EYE_UV = ((0.393, 0.680), (0.611, 0.679))          # the eyes in Ava-256's texture layout (the same for every capture)
smooth = lambda e0, e1, x: np.clip((x - e0) / (e1 - e0), 0, 1) ** 2 * (3 - 2 * np.clip((x - e0) / (e1 - e0), 0, 1))

# --- the Rocketbox head in its eyes' frame (as harmonise.py) -------------------------------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=person)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
mesh = max((o for o in bpy.data.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
bone = lambda n: np.array(arm.matrix_world @ arm.data.bones[n].head_local)
eL, eR = bone('Bip01 LEye'), bone('Bip01 REye')
mid = (eL + eR) / 2; xa = (eL - eR) / np.linalg.norm(eL - eR); za = np.array([0, 0, 1.0]); za -= xa * za.dot(xa); za /= np.linalg.norm(za)
ya = np.cross(za, xa)
hd = mid - bone('Bip01 Head'); hd -= xa * hd.dot(xa); hd[2] = 0
if hd.dot(-ya) < 0: ya = -ya
Bm = np.stack([xa, ya, za]); Mw = np.array(mesh.matrix_world)
def coords(src):
    a = np.zeros(len(src) * 3); src.foreach_get('co', a); return a.reshape(-1, 3)
Vloc = coords(mesh.data.vertices)
P = ((Vloc @ Mw[:3, :3].T + Mw[:3, 3]) - mid) @ Bm.T * 1000.0
ipd = np.linalg.norm(eL - eR) * 1000.0
mats = [m.name if m else '' for m in mesh.data.materials]
head_mi = {i for i, nm in enumerate(mats) if nm.endswith('_head')}
hmat = next(mats[i] for i in head_mi)
uvl = mesh.data.uv_layers.active.data
TR, TUV = [], []
for p in mesh.data.polygons:
    if p.material_index not in head_mi: continue
    v = list(p.vertices); l = list(p.loop_indices)
    for k in range(1, len(v) - 1):
        TR.append((v[0], v[k], v[k + 1])); TUV.append((uvl[l[0]].uv[:], uvl[l[k]].uv[:], uvl[l[k + 1]].uv[:]))
TR = np.array(TR); TUV = np.array(TUV, np.float64)
FR = rbf.Face(P, TR)

# --- the capture in the same frame ----------------------------------------------------------------------------------
VT, F, FT = [], [], []
for l in open(topo):
    if l.startswith('vt '): VT.append([float(x) for x in l.split()[1:3]])
    elif l.startswith('f '):
        t = [x.split('/') for x in l.split()[1:4]]; F.append([int(x[0]) - 1 for x in t]); FT.append([int(x[1]) - 1 for x in t])
VT = np.array(VT); F = np.array(F); FT = np.array(FT)
vuv = np.full((int(F.max()) + 1, 2), 9.0)
for f, ft in zip(F.ravel(), FT.ravel()):
    if vuv[f, 0] > 8: vuv[f] = VT[ft]


def eyes_frame(V):
    ok = (vuv[:, 0] > 0.2) & (vuv[:, 0] < 0.8) & (vuv[:, 1] > 0.3) & (vuv[:, 1] < 0.85)
    X = V[ok] - V[ok].mean(0)
    gv = np.linalg.lstsq(X, vuv[ok, 1] - vuv[ok, 1].mean(), rcond=None)[0]
    s0, s1 = (V[int(np.argmin(np.linalg.norm(vuv - np.array(e), axis=1)))] for e in EYE_UV)
    cx = (s1 - s0) / np.linalg.norm(s1 - s0); cz = gv - cx * gv.dot(cx); cz /= np.linalg.norm(cz); cy = np.cross(cz, cx)
    Q = (V - (s0 + s1) / 2) @ np.stack([cx, cy, cz]).T
    if Q.mean(0)[1] < 0: Q[:, 1] *= -1; Q[:, 0] *= -1        # +y is back, x then runs to the subject's left
    Q[:, 1] -= 12.0                                           # the eyeballs' centres lie 12 mm behind the surface
    return Q


V = np.load(os.path.join(cap, 'verts.npy')).astype(np.float64)
# (a Rocketbox face as the source, rb_face_source.py: already in the eyes' frame)
Q = V if os.environ.get('AVA_FRAMED') else eyes_frame(V)
near = (np.linalg.norm(Q, axis=1) < 200)
TV = F[near[F].all(1)]; TVT = FT[near[F].all(1)]
# the landmarks: every capture shares one registered mesh (a vertex is the same point of the face on everyone), so they
# are found once, on a reference capture whose profile reads cleanly (AVA_REF), and taken on this one at the same
# vertices; found on each capture's own profile they fail where a head is tipped or a beard fills the chin
ref = os.environ.get('AVA_REF')
if ref and os.path.abspath(ref) != os.path.abspath(cap):
    Qr = eyes_frame(np.load(os.path.join(ref, 'verts.npy')).astype(np.float64))
    nr = np.linalg.norm(Qr, axis=1) < 200
    FV = rbf.Face(Qr, F[nr[F].all(1)])
else:
    FV = rbf.Face(Q, TV)
keys = [k for k in FR.L if k in FV.L]
for F_, X_ in ((FR, P), (FV, Q)):
    if 'alL' in F_.L and abs(F_.L['alL'].at(X_)[0, 0] - F_.L['alR'].at(X_)[0, 0]) > 46: keys = [k for k in keys if k not in ('alL', 'alR')]
A = np.array([FV.L[k].at(Q)[0] for k in keys], float); B = np.array([FR.L[k].at(P)[0] for k in keys], float)
ma, mb = A.mean(0), B.mean(0)
U, Sg, Vt_ = np.linalg.svd((B - mb).T @ (A - ma)); Dg = np.eye(3); Dg[2, 2] = np.sign(np.linalg.det(U @ Vt_))
R = U @ Dg @ Vt_; s = (Sg * np.diag(Dg)).sum() / ((A - ma) ** 2).sum(); t = mb - s * R @ ma
sim = lambda Y: s * Y @ R.T + t
Ps = sim(A); W = B - Ps; n = len(Ps); lam = 0.5
K = np.linalg.norm(Ps[:, None] - Ps[None], axis=2)
Mtx = np.zeros((n + 4, n + 4)); Mtx[:n, :n] = K + lam * np.eye(n); Mtx[:n, n] = 1; Mtx[:n, n + 1:] = Ps; Mtx[n, :n] = 1; Mtx[n + 1:, :n] = Ps.T
coef = np.linalg.solve(Mtx, np.vstack([W, np.zeros((4, 3))]))
def warp(Y):
    Z = sim(Y); return Z + np.linalg.norm(Z[:, None] - Ps[None], axis=2) @ coef[:n] + coef[n] + Z @ coef[n + 1:]
res0 = np.linalg.norm(sim(A) - B, axis=1); res = np.linalg.norm(warp(A) - B, axis=1)
print('landmarks', len(keys), 'scale', round(s, 3), 'after similarity mm', res0.round(1).tolist(), 'after warp', res.round(1).tolist())
Vsim, Vw = sim(Q), warp(Q)


def bary_on(tree, Vx, tris, pt, maxd):
    loc, nrm, fi, dist = tree.find_nearest(Vector(pt))
    if fi is None or dist > maxd: return None
    a_, b_, c_ = (Vx[j] for j in tris[fi])
    v0, v1, v2 = b_ - a_, c_ - a_, np.array(loc) - a_
    d00, d01, d11, d20, d21 = v0 @ v0, v0 @ v1, v1 @ v1, v2 @ v0, v2 @ v1
    den = d00 * d11 - d01 * d01
    if abs(den) < 1e-12: return None
    wv = (d11 * d20 - d01 * d21) / den; ww = (d00 * d21 - d01 * d20) / den
    return fi, np.array([1 - wv - ww, wv, ww]), dist


# --- shape: the Rocketbox face onto the capture's -------------------------------------------------------------------
treeW = BVHTree.FromPolygons([tuple(map(float, v)) for v in Vw], [tuple(map(int, f)) for f in TV])
region = (P[:, 2] > -200) & (np.linalg.norm(P, axis=1) < 230)
VN = np.zeros(len(P) * 3); mesh.data.vertices.foreach_get('normal', VN)
VN = (VN.reshape(-1, 3) @ Mw[:3, :3].T) @ Bm.T; VN /= np.maximum(np.linalg.norm(VN, axis=1), 1e-9)[:, None]
def onto(tree, Vx, pt, n, reach):
    # the capture's surface along this point's normal (out, then in), its face turned the same way: never across the
    # lips' gap to the other lip or into the mouth
    for o, dv in ((pt + n * reach, -n), (pt - n * reach, n)):
        loc, hn, fi, dd = tree.ray_cast(Vector(o), Vector(dv), 2 * reach)
        if fi is not None and np.dot(np.array(hn), n) > 0.3:
            a_, b_, c_ = (Vx[j] for j in TV[fi])
            v0, v1, v2 = b_ - a_, c_ - a_, np.array(loc) - a_
            d00, d01, d11, d20, d21 = v0 @ v0, v0 @ v1, v1 @ v1, v2 @ v0, v2 @ v1
            den = d00 * d11 - d01 * d01
            if abs(den) < 1e-12: return None
            wv = (d11 * d20 - d01 * d21) / den; ww = (d00 * d21 - d01 * d20) / den
            return fi, np.array([1 - wv - ww, wv, ww])
    return None
dP = np.zeros_like(P); bound = np.zeros(len(P), bool)
for i in np.where(region)[0]:
    r = onto(treeW, Vw, P[i], VN[i], 10.0)
    if r is None: continue
    fi, b = r
    dP[i] = b @ Vsim[TV[fi]] - b @ Vw[TV[fi]] + (b @ Vw[TV[fi]] - P[i]) * 1.0
    bound[i] = True
# no spikes: at most 15 mm, and the field smoothed over the mesh's edges (a vertex that found no surface takes its
# neighbours' movement)
nb = [[] for _ in range(len(P))]
for e_ in mesh.data.edges:
    a_, b_ = e_.vertices; nb[a_].append(b_); nb[b_].append(a_)
mag0 = np.linalg.norm(dP, axis=1); dP *= np.minimum(1.0, 15.0 / np.maximum(mag0, 1e-9))[:, None]
idx = np.where(region)[0]
for it in range(4):
    nd = dP.copy()
    for i in idx:
        if nb[i]:
            m_ = dP[nb[i]].mean(0)
            nd[i] = m_ if not bound[i] else 0.5 * dP[i] + 0.5 * m_
    dP = nd
me_z = FR.L['me'].at(P)[0, 2]
w = smooth(me_z - 45, me_z - 8, P[:, 2]) * (1 - smooth(28, 58, P[:, 2])) * (1 - smooth(22, 55, P[:, 1]))
eyes = [np.array([ipd / 2, 0, 0.0]), np.array([-ipd / 2, 0, 0.0])]
parent = list(range(len(P)))
def find(i):
    while parent[i] != i: parent[i] = parent[parent[i]]; i = parent[i]
    return i
for e_ in mesh.data.edges:
    a_, b_ = find(e_.vertices[0]), find(e_.vertices[1])
    if a_ != b_: parent[a_] = b_
roots = np.array([find(i) for i in range(len(P))])
ball = np.zeros(len(P), bool)
for e in eyes:
    d = np.linalg.norm(P - e, axis=1)
    for r_ in np.unique(roots[d < 20]):
        isl = roots == r_
        if isl.sum() < 400 and np.linalg.norm(P[isl].mean(0) - e) < 12: ball |= isl
w[ball] = 0
raw = dP.copy()
for e in eyes: w *= smooth(15, 26, np.linalg.norm(P - e, axis=1))
dP *= (w * STRENGTH)[:, None]
# the eyes go with their sockets: where the capture's eyes sit deeper (or further forward) than Rocketbox's, the
# eyeballs, the lids round them and the eye's bone move with the orbit's own rim (its mean movement 22-34 mm from the
# eye, at most 6 mm), so a deep-set eye stays deep-set instead of bulging out of a face that moved back round it
eye_shift = []
for e in eyes:
    d = np.linalg.norm(P - e, axis=1); rim = (d > 22) & (d < 34) & (P[:, 1] < 15) & (np.linalg.norm(raw, axis=1) > 0)
    off = raw[rim].mean(0) * STRENGTH if rim.any() else np.zeros(3)
    off[0] = 0.0; off *= min(1.0, 6.0 / max(np.linalg.norm(off), 1e-9))
    near_e = 1 - smooth(16, 30, d)
    isl = ball & (d < 20)
    dP += near_e[:, None] * (off[None] - dP) * (~isl)[:, None]
    dP[isl] = off
    eye_shift.append(off)
print('eyes moved with their sockets by', [o.round(1).tolist() for o in eye_shift], 'mm')
mag = np.linalg.norm(dP, axis=1)
print('moved', int((mag > 0.1).sum()), 'vertices; mean', round(float(mag[mag > 0.1].mean()), 2), 'max', round(float(mag.max()), 2), 'mm')
dL = ((dP / 1000.0) @ Bm) @ np.linalg.inv(Mw[:3, :3]).T
if mesh.data.shape_keys:
    for kb in mesh.data.shape_keys.key_blocks: kb.data.foreach_set('co', (coords(kb.data) + dL).ravel())
mesh.data.vertices.foreach_set('co', (Vloc + dL).ravel()); mesh.data.update()
# the eye bones follow their eyeballs (the rig turns each eye about its own centre)
bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='EDIT')
for bn, off in (('Bip01 LEye', eye_shift[0]), ('Bip01 REye', eye_shift[1])):
    eb = arm.data.edit_bones.get(bn)
    if eb is None: continue
    dw = (off / 1000.0) @ Bm                                        # world
    dl = Vector(tuple(np.linalg.inv(np.array(arm.matrix_world)[:3, :3]) @ dw))
    eb.head += dl; eb.tail += dl
bpy.ops.object.mode_set(mode='OBJECT')
P2 = P + dP

# --- skin: the Rocketbox texture's face texels to the capture's texture --------------------------------------------
tex_dir = os.path.dirname(person)
cands = [os.path.join(d, f'{hmat}_color.jpg') for d in (tex_dir, os.environ.get('AVA_TEX', ''))]
tp = next(p for p in cands if p and os.path.exists(p))
_img = bpy.data.images.load(tp); Wd, H = _img.size; bpy.data.images.remove(_img)
pts = np.full((H, Wd, 3), np.nan, np.float32); nrm = np.zeros((H, Wd, 3), np.float32)
centre = np.array([0.0, 45.0, -15.0])                  # inside the head, behind the eyes
for tri, uv in zip(TR, TUV):
    q = P2[list(tri)]
    n_ = np.cross(q[1] - q[0], q[2] - q[0]); n_ /= max(np.linalg.norm(n_), 1e-9)
    if n_.dot(q.mean(0) - centre) < 0: n_ = -n_       # outward
    if np.linalg.norm(q.mean(0)) > REACH + 30 or q[:, 2].min() < -150: continue
    px = uv[:, 0] * Wd; py = (1 - uv[:, 1]) * H
    x0, x1 = int(max(px.min() - 1, 0)), int(min(px.max() + 2, Wd)); y0, y1 = int(max(py.min() - 1, 0)), int(min(py.max() + 2, H))
    if x1 <= x0 or y1 <= y0: continue
    gx, gy = np.meshgrid(np.arange(x0, x1) + 0.5, np.arange(y0, y1) + 0.5)
    d = (px[1] - px[0]) * (py[2] - py[0]) - (px[2] - px[0]) * (py[1] - py[0])
    if abs(d) < 1e-9: continue
    w1 = ((gx - px[0]) * (py[2] - py[0]) - (px[2] - px[0]) * (gy - py[0])) / d
    w2 = ((px[1] - px[0]) * (gy - py[0]) - (gx - px[0]) * (py[1] - py[0])) / d
    w0 = 1 - w1 - w2
    inside = (w0 >= -0.002) & (w1 >= -0.002) & (w2 >= -0.002)
    if not inside.any(): continue
    pt = w0[..., None] * q[0] + w1[..., None] * q[1] + w2[..., None] * q[2]
    blk = pts[y0:y1, x0:x1]; blk[inside] = pt[inside]
    nb = nrm[y0:y1, x0:x1]; nb[inside] = n_
ys, xs = np.where(~np.isnan(pts[..., 0]))
Qt = pts[ys, xs].astype(np.float64); Nt = nrm[ys, xs].astype(np.float64)
keep = (np.linalg.norm(Qt, axis=1) < REACH) & (np.abs(Qt[:, 0]) < EAR_X)
ys, xs, Qt, Nt = ys[keep], xs[keep], Qt[keep], Nt[keep]
treeS = BVHTree.FromPolygons([tuple(map(float, v)) for v in Vsim], [tuple(map(int, f)) for f in TV])
UV = np.zeros((len(Qt), 2), np.float32); mask = np.zeros(len(Qt), np.float32)
z_ls = FR.L['ls'].at(P2)[0, 2] if 'ls' in FR.L else -38.0; z_lm = FR.L['lm'].at(P2)[0, 2] if 'lm' in FR.L else -72.0
mouth = (np.abs(Qt[:, 0]) < 34) & (Qt[:, 2] < z_ls + 3) & (Qt[:, 2] > z_lm - 3) & (Qt[:, 1] < -15)
def project(pt, n):
    # the capture's outer skin straight out from (or in under) this texel, along the Rocketbox surface's normal: never
    # the inside of the lips or the mouth, which a nearest point can jump to at the lips' corners
    for o, dvec in ((pt + n * 10.0, -n), (pt - n * 10.0, n)):
        loc, hn, fi, dd = treeS.ray_cast(Vector(o), Vector(dvec), 22.0)
        if fi is not None and np.dot(np.array(hn), n) > 0.2:
            a_, b_, c_ = (Vsim[j] for j in TV[fi])
            v0, v1, v2 = b_ - a_, c_ - a_, np.array(loc) - a_
            d00, d01, d11, d20, d21 = v0 @ v0, v0 @ v1, v1 @ v1, v2 @ v0, v2 @ v1
            den = d00 * d11 - d01 * d01
            if abs(den) < 1e-12: continue
            wv = (d11 * d20 - d01 * d21) / den; ww = (d00 * d21 - d01 * d20) / den
            return fi, np.array([1 - wv - ww, wv, ww]), float(np.linalg.norm(np.array(loc) - pt))
    return None
for i in range(len(Qt)):
    r = project(Qt[i], Nt[i])
    if r is None: continue
    fi, b, dist = r
    UV[i] = b @ VT[TVT[fi]]
    rr = np.linalg.norm(Qt[i]); e = min(np.linalg.norm(Qt[i] - eyes[0]), np.linalg.norm(Qt[i] - eyes[1]))
    m = min(1.0, (REACH - rr) / FEATHER) * min(1.0, max(0.0, (e - EYE_KEEP) / FEATHER)) * min(1.0, (EAR_X - abs(Qt[i, 0])) / FEATHER) \
        * min(1.0, (12 - dist) / 4) * min(1.0, max(0.0, (TOP - Qt[i, 2]) / 15.0))
    mask[i] = max(0.0, m)
cheek = (np.abs(Qt[:, 0]) > 28) & (np.abs(Qt[:, 0]) < 52) & (Qt[:, 2] < -15) & (Qt[:, 2] > -45)
np.savez_compressed(os.path.join(out_dir, 'ffhq_map.npz'), ys=ys, xs=xs, uv=UV, mask=mask, cheek=cheek, scalp=np.zeros(len(Qt), bool),
                    mouth=mouth, size=np.array([H, Wd]))
json.dump({'ffhq': 'ava:' + os.path.basename(cap.rstrip('/')), 'material': hmat, 'texels': int(len(Qt)), 'baked': int((mask > 0.5).sum()),
           'landmarks': keys, 'residual_mm': res.round(1).tolist(), 'scale': round(float(s), 3)}, open(os.path.join(out_dir, 'ffhq.json'), 'w'))
print('mapped', int((mask > 0.5).sum()), 'texels of', len(Qt))
for o in [o for o in bpy.data.objects if o.type not in ('MESH', 'ARMATURE')]: bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.fbx(filepath=os.path.join(out_dir, name + '.fbx'), use_selection=True, add_leaf_bones=False, bake_anim=False,
                         use_mesh_modifiers=False, mesh_smooth_type='FACE', path_mode='STRIP')
print('wrote', os.path.join(out_dir, name + '.fbx'))
