"""A real photographed face baked into a Rocketbox head's own texture (owner, 2026-11-01: "represent real human faces").
The face comes from FFHQ-UV (Bai et al., CVPR 2023, MIT: 54,165 facial texture maps made from the FFHQ photographs of
real people, normalised to even light and a neutral expression), laid out on the HiFi3D++ head topology. That head (a
carrier: any HiFi3D++ head, here the demo's) is put into the same eyes' frame as the Rocketbox head, its anatomical
landmarks found the same way as the Rocketbox head's (rocketbox_features.Face), and fitted onto it by a similarity and a
thin-plate warp; then each texel of the Rocketbox head's texture that lies on the face is taken to its point on the
head, to the nearest point of the fitted carrier, and to that point's place in the FFHQ texture. Baked where the carrier
holds real skin (outside FFHQ-UV's painted hair, inside 140 mm of the eyes, not the ears), with a feathered edge, and
not within 12 mm of either eye (the photographs' eyes are closed; Rocketbox's lids and lashes stay). Writes
<out>/<head material>_ffhq_color.jpg (the bake, Rocketbox's layout), <out>/<head material>_ffhq_mask.png (where it
holds) and <out>/ffhq.json (the face's cheek colour, and the tone and undertone that put Rocketbox's skin outside the
face at that colour, for retone.py, which composites the two).
Usage: blender -b --python ffhq_bake.py -- <person fbx> <base texture dir> <ffhq texture png> <out dir>
Env: FFHQ_TOPO (the carrier head 'hifi3dpp_head.obj' and 'eye_indices.py'), FFHQ_MASKS (FFHQ-UV's topo_assets masks)."""
import bpy, sys, os, json, math
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rocketbox_features as rbf

person_path, tex_dir, ffhq_png, out_dir = sys.argv[sys.argv.index('--') + 1:][:4]
TOPO = os.environ['FFHQ_TOPO']; MASKS = os.environ.get('FFHQ_MASKS', os.path.dirname(TOPO))
os.makedirs(out_dir, exist_ok=True)
EYE_KEEP = float(os.environ.get('FFHQ_EYE_KEEP', 12.0)); REACH = 140.0; EAR_X = 72.0; FEATHER = 8.0   # mm (the reach covers the whole jaw and chin: a base's painted beard must not show through; the eye zone 16 for women: Rocketbox's lids and lashes read as a woman's)


def load_png(path):
    img = bpy.data.images.load(path); w, h = img.size
    px = np.empty(w * h * img.channels, np.float32); img.pixels.foreach_get(px)
    a = px.reshape(h, w, img.channels)[::-1]                        # row 0 at the top, as PIL reads it
    bpy.data.images.remove(img); return a


def save_img(path, rgb, alpha=None):
    h, w = rgb.shape[:2]
    img = bpy.data.images.new(os.path.basename(path), w, h, alpha=alpha is not None)
    a = np.ones((h, w, 4), np.float32); a[..., :3] = rgb
    if alpha is not None: a[..., 3] = alpha
    img.pixels.foreach_set(a[::-1].ravel()); img.filepath_raw = path
    img.file_format = 'PNG' if path.endswith('.png') else 'JPEG'; img.save(); bpy.data.images.remove(img)


# --- the Rocketbox head --------------------------------------------------------------------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=person_path)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
mesh = max((o for o in bpy.data.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
bone = lambda n: np.array(arm.matrix_world @ arm.data.bones[n].head_local)
eL, eR = bone('Bip01 LEye'), bone('Bip01 REye')
mid = (eL + eR) / 2; xa = (eL - eR) / np.linalg.norm(eL - eR); za = np.array([0, 0, 1.0]); za -= xa * za.dot(xa); za /= np.linalg.norm(za)
ya = np.cross(za, xa)
hd = mid - bone('Bip01 Head'); hd -= xa * hd.dot(xa); hd[2] = 0
if hd.dot(-ya) < 0: ya = -ya
Bm = np.stack([xa, ya, za])
Mw = np.array(mesh.matrix_world)
frame = lambda W: (W - mid) @ Bm.T * 1000.0
a = np.zeros(len(mesh.data.vertices) * 3); mesh.data.vertices.foreach_get('co', a); Vloc = a.reshape(-1, 3)
P = frame(Vloc @ Mw[:3, :3].T + Mw[:3, 3])
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

# --- the carrier: a HiFi3D++ head in its eyes' frame, at the Rocketbox head's eye spacing ----------------------------
V, VT, F, FT = [], [], [], []
for line in open(os.path.join(TOPO, 'hifi3dpp_head.obj')):
    if line.startswith('v '): V.append([float(x) for x in line.split()[1:4]])
    elif line.startswith('vt '): VT.append([float(x) for x in line.split()[1:3]])
    elif line.startswith('f '):
        t = [x.split('/') for x in line.split()[1:4]]
        F.append([int(x[0]) - 1 for x in t]); FT.append([int(x[1]) - 1 for x in t])
V = np.array(V); VT = np.array(VT); F = np.array(F); FT = np.array(FT)
ns = {}; exec(open(os.path.join(TOPO, 'eye_indices.py')).read(), ns)
cL = V[ns['eye_contour_vtx_idxL']].mean(0); cR = V[ns['eye_contour_vtx_idxR']].mean(0)
if cL[0] < cR[0]: cL, cR = cR, cL                                  # the subject's left eye lies at +x
cx = (cL - cR) / np.linalg.norm(cL - cR); cz = np.array([0, 1.0, 0]); cz -= cx * cz.dot(cx); cz /= np.linalg.norm(cz)
cy = np.cross(cz, cx)
nose = V[np.argmax(V @ (-cy))] if (V @ -cy).max() > (V @ cy).max() else V[np.argmax(V @ cy)]
cmid = (cL + cR) / 2
Cm = np.stack([cx, cy, cz])
Vs = (V - cmid) @ Cm.T
# +y is back: the head's bulk lies behind the eyes
if Vs.mean(0)[1] < 0: Vs[:, 1] *= -1; Vs[:, 0] *= -1
Vs *= ipd / np.linalg.norm(cL - cR)
Vs[:, 1] -= 12.0                                                    # the eyes' centres lie 12 mm behind the lids' contour
near = (np.linalg.norm(Vs, axis=1) < 160) & (Vs[:, 2] > -130)       # the head alone: the carrier carries a neck and shoulders
TV = F[near[F].all(1)]; TVT = FT[near[F].all(1)]
FV = rbf.Face(Vs, TV)
bake_v = (np.linalg.norm(Vs, axis=1) < 190) & (Vs[:, 2] > -165)   # the bake reaches under the jaw
TV = F[bake_v[F].all(1)]; TVT = FT[bake_v[F].all(1)]
keys = [k for k in FR.L if k in FV.L]
for F_, X_ in ((FR, P), (FV, Vs)):
    if 'alL' in F_.L and abs(F_.L['alL'].at(X_)[0, 0] - F_.L['alR'].at(X_)[0, 0]) > 46: keys = [k for k in keys if k not in ('alL', 'alR')]
A = np.array([FV.L[k].at(Vs)[0] for k in keys], float); B = np.array([FR.L[k].at(P)[0] for k in keys], float)
ma, mb = A.mean(0), B.mean(0)
U, Sg, Vt_ = np.linalg.svd((B - mb).T @ (A - ma)); Dg = np.eye(3); Dg[2, 2] = np.sign(np.linalg.det(U @ Vt_))
R = U @ Dg @ Vt_; s = (Sg * np.diag(Dg)).sum() / ((A - ma) ** 2).sum(); t = mb - s * R @ ma
sim = lambda X: s * X @ R.T + t
Ps = sim(A); W = B - Ps; n = len(Ps); lam = 0.5
K = np.linalg.norm(Ps[:, None] - Ps[None], axis=2)
Mtx = np.zeros((n + 4, n + 4)); Mtx[:n, :n] = K + lam * np.eye(n); Mtx[:n, n] = 1; Mtx[:n, n + 1:] = Ps; Mtx[n, :n] = 1; Mtx[n + 1:, :n] = Ps.T
coef = np.linalg.solve(Mtx, np.vstack([W, np.zeros((4, 3))]))
def warp(X):
    Y = sim(X); return Y + np.linalg.norm(Y[:, None] - Ps[None], axis=2) @ coef[:n] + coef[n] + Y @ coef[n + 1:]
res = np.linalg.norm(warp(A) - B, axis=1)
print('landmarks', len(keys), 'scale', round(s, 3), 'residual mm', res.round(1).tolist())
Vw = warp(Vs)
tree = BVHTree.FromPolygons([tuple(map(float, v)) for v in Vw], [tuple(map(int, f)) for f in TV])

hair = load_png(os.path.join(MASKS, 'hair_mask.png'))[..., 0] > 0.5
def sample(img, uv):
    x = np.clip(uv[:, 0] * (img.shape[1] - 1), 0, img.shape[1] - 1.001); y = np.clip((1 - uv[:, 1]) * (img.shape[0] - 1), 0, img.shape[0] - 1.001)
    x0 = x.astype(int); y0 = y.astype(int); fx = (x - x0); fy = (y - y0)
    return img[y0, x0] * (1 - fx) * (1 - fy) + img[y0, x0 + 1] * fx * (1 - fy) + img[y0 + 1, x0] * (1 - fx) * fy + img[y0 + 1, x0 + 1] * fx * fy

# --- the Rocketbox texture rasterised: each texel's point on the head -----------------------------------------------
_img = bpy.data.images.load(os.path.join(tex_dir, f'{hmat}_color.jpg')); Wd, H = _img.size; bpy.data.images.remove(_img)
pts = np.full((H, Wd, 3), np.nan, np.float32)
for tri, uv in zip(TR, TUV):
    q = P[list(tri)]
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
cov = ~np.isnan(pts[..., 0])
eyes = [np.array([ipd / 2, 0, 0.0]), np.array([-ipd / 2, 0, 0.0])]
ys, xs = np.where(cov)
Q = pts[ys, xs].astype(np.float64)
keep = (np.linalg.norm(Q, axis=1) < REACH) & (np.abs(Q[:, 0]) < EAR_X)
ys, xs, Q = ys[keep], xs[keep], Q[keep]
print('texels on the face', len(Q))
UV = np.zeros((len(Q), 2), np.float32); mask = np.zeros(len(Q), np.float32); scalp = np.zeros(len(Q), bool)
for i in range(len(Q)):
    loc, nrm, fi, dist = tree.find_nearest(Vector(Q[i]))
    if fi is None or dist > 12: continue
    a_, b_, c_ = (Vw[j] for j in TV[fi])
    v0, v1, v2 = b_ - a_, c_ - a_, np.array(loc) - a_
    d00, d01, d11, d20, d21 = v0 @ v0, v0 @ v1, v1 @ v1, v2 @ v0, v2 @ v1
    den = d00 * d11 - d01 * d01
    if abs(den) < 1e-12: continue
    wv = (d11 * d20 - d01 * d21) / den; ww = (d00 * d21 - d01 * d20) / den; wu = 1 - wv - ww
    uv = wu * VT[TVT[fi][0]] + wv * VT[TVT[fi][1]] + ww * VT[TVT[fi][2]]
    if sample(hair.astype(np.float32), uv[None])[0] > 0.5:
        # above the hairline (never the eyes: FFHQ-UV's hair mask covers the closed eyes too): scalp, painted as hair
        e = min(np.linalg.norm(Q[i] - eyes[0]), np.linalg.norm(Q[i] - eyes[1]))
        scalp[i] = (Q[i, 2] > 25 or Q[i, 1] > 30) and e > 1.6 * EYE_KEEP
        continue
    UV[i] = uv
    r = np.linalg.norm(Q[i]); e = min(np.linalg.norm(Q[i] - eyes[0]), np.linalg.norm(Q[i] - eyes[1]))
    m = min(1.0, (REACH - r) / FEATHER) * min(1.0, max(0.0, (e - EYE_KEEP) / FEATHER)) * min(1.0, (EAR_X - abs(Q[i, 0])) / FEATHER) * min(1.0, (12 - dist) / 4)
    mask[i] = max(0.0, m)
cheek = (np.abs(Q[:, 0]) > 28) & (np.abs(Q[:, 0]) < 52) & (Q[:, 2] < -15) & (Q[:, 2] > -45)
np.savez_compressed(os.path.join(out_dir, 'ffhq_map.npz'), ys=ys, xs=xs, uv=UV, mask=mask, cheek=cheek, scalp=scalp, size=np.array([H, Wd]))
json.dump({'ffhq': os.path.basename(ffhq_png), 'material': hmat, 'texels': int(len(Q)), 'baked': int((mask > 0.5).sum()),
           'landmarks': keys, 'residual_mm': res.round(1).tolist(), 'scale': round(float(s), 3)}, open(os.path.join(out_dir, 'ffhq.json'), 'w'))
print('mapped', int((mask > 0.5).sum()), 'texels of', len(Q))
