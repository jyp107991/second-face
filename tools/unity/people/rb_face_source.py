"""A Rocketbox head written out as a face source for ava/ava_internalise.py (owner, 2026-11-02: "surely the men in hats
like the black army guy: you have enough face to go off of and finish"). Some of the library's faces sit on heads that
stop at the hood or the helmet (Male_Adult_18's head ends at its forehead: the hood was its crown), so taking the gear
off leaves no scalp. Their faces are carried instead onto a whole Rocketbox head of the same people (its skull, scalp,
hairline, ears and rig), exactly as an Ava-256 capture is: this writes the face's head mesh in the eyes' frame (mm, the
eyeballs' centres at the origin, x to the subject's left, y back, z up), its layout and its own photographed texture.
Only the head's largest piece is kept (not the eyeballs, teeth or loose gear).
Usage: blender -b --python rb_face_source.py -- <person fbx> <its texture dir (rblib)> <out dir>
Writes <out>/verts.npy, <out>/topology.obj (vt and f only), <out>/tex.png; ava_internalise.py reads them with
AVA_FRAMED=1 (the vertices are already in the eyes' frame)."""
import bpy, bmesh, sys, os, math
import numpy as np

person, tex_dir, out = sys.argv[sys.argv.index('--') + 1:][:3]
os.makedirs(out, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=person)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
mesh = max((o for o in bpy.data.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
bone = lambda n: np.array(arm.matrix_world @ arm.data.bones[n].head_local)
eL, eR = bone('Bip01 LEye'), bone('Bip01 REye')
mid = (eL + eR) / 2; xa = (eL - eR) / np.linalg.norm(eL - eR); za = np.array([0, 0, 1.0]); za -= xa * za.dot(xa); za /= np.linalg.norm(za)
ya = np.cross(za, xa); hd = mid - bone('Bip01 Head'); hd -= xa * hd.dot(xa); hd[2] = 0
if hd.dot(-ya) < 0: ya = -ya
Bm = np.stack([xa, ya, za]); Mw = np.array(mesh.matrix_world)
a = np.zeros(len(mesh.data.vertices) * 3); mesh.data.vertices.foreach_get('co', a)
P = ((a.reshape(-1, 3) @ Mw[:3, :3].T + Mw[:3, 3]) - mid) @ Bm.T * 1000.0
mats = [m.name if m else '' for m in mesh.data.materials]
hmi = next(i for i, nm in enumerate(mats) if nm.endswith('_head'))
bm = bmesh.new(); bm.from_mesh(mesh.data); bm.faces.ensure_lookup_table()
uvk = bm.loops.layers.uv.active
seen, parts = set(), []
for f0 in bm.faces:
    if f0.material_index != hmi or f0 in seen: continue
    st, part = [f0], []; seen.add(f0)
    while st:
        f = st.pop(); part.append(f)
        for e in f.edges:
            for g in e.link_faces:
                if g not in seen and g.material_index == hmi: seen.add(g); st.append(g)
    parts.append(part)
face = max(parts, key=len)
# (a head whose cloth is painted in its own texture, a hijab round the face: the cloth's faces are left out, told by colour
# (white, grey or black, with no skin's hue), so only the face's skin, brows and lips are carried)
img0 = bpy.data.images.load(os.path.join(tex_dir, mats[hmi] + '_color.jpg')); tw, th = img0.size
px = np.empty(tw * th * 4, np.float32); img0.pixels.foreach_get(px); px = px.reshape(th, tw, 4)[..., :3]
def lab_of(c):
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    xyz = c @ np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]]).T / np.array([0.9505, 1.0, 1.089])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return 116 * f[1] - 16, 500 * (f[0] - f[1]), 200 * (f[1] - f[2])
kept = []
for f in face:
    uv = np.mean([l[uvk].uv[:] for l in f.loops], axis=0)
    c = px[min(th - 1, max(0, int(uv[1] * th))), min(tw - 1, max(0, int(uv[0] * tw)))]
    L_, a_, b_ = lab_of(c.astype(np.float64)); ch = (a_ * a_ + b_ * b_) ** 0.5
    if ch < 5.0 and L_ > 35: continue                                    # (white and grey cloth)
    if os.environ.get('RBF_RIM'):
        # (a skullcap welded into the head and coloured like skin, Male_Adult_15's: the face is cut along the cap's rim, 42
        # mm above the eyes at the brow and down to 15 at the top of the ear; the carry fades out before that cut edge,
        # AVA_BORDER, so the rim's shadow pressed into the skin is not carried)
        cx = float(np.mean([P[v.index, 0] for v in f.verts])); cz = float(np.mean([P[v.index, 2] for v in f.verts]))
        rt, rs = float(os.environ.get('RBF_RIM_TOP', 42.0)), float(os.environ.get('RBF_RIM_SIDE', 15.0))   # (a beanie sits lower at the sides)
        lim = rt - (rt - rs) * min(1.0, abs(cx) / 65.0) ** 2
        if os.environ.get('RBF_RIM_EAR'):
            # (in front of the ear the cap's edge sits higher, over the ear's top: the sideburn under it is the face's own
            # and joins its beard to the new head's side hair; cut lower there, a bare gap of 15 mm was left between the
            # two, Delivery_Male_01's)
            cy = float(np.mean([P[v.index, 1] for v in f.verts]))
            if abs(cx) > 58.0 and cy > 20.0: lim = max(lim, float(os.environ['RBF_RIM_EAR']))
        if cz > lim: continue
    if os.environ.get('RBF_CAP'):
        # (a cap or beanie welded into the head, Delivery_Male_01's, Male_Adult_17's, the pilots': above the brows only skin
        # is carried, by its hue and chroma as the realism gate tells skin; the cap's cloth and the hair under its edge stay
        # the new head's own)
        zc = float(np.mean([P[v.index, 2] for v in f.verts]))
        hue = math.degrees(math.atan2(b_, a_))
        # (a peaked cap's brim, welded in front of the brows: its underside faces down, its top up; rays from the brows hit
        # it first and laid the brim's colour on them as blocks, the pilots'. The brows' and forehead's skin faces forward)
        if zc > 12.0:
            vs_ = [P[v.index] for v in f.verts]; nn = np.cross(vs_[1] - vs_[0], vs_[2] - vs_[0])
            if np.linalg.norm(nn) > 1e-9:
                nn = nn / np.linalg.norm(nn); cen = np.mean(vs_, 0)
                if nn @ (cen - np.array([0.0, 45.0, 10.0])) < 0: nn = -nn
                if nn[2] < -0.35 or (nn[2] > 0.75 and cen[1] < -30): continue
        # (above the brows, 35 mm over the eyes: the brows, dark and colourless, are the face's own; the caps begin at 43)
        if zc > float(os.environ.get('RBF_CAP_Z', 35.0)) and not (32.0 <= hue <= 85.0 and ch > 7.0 and 25.0 < L_ < 92.0): continue
    kept.append(f)
if len(kept) < len(face): print('face source: cloth left out,', len(face) - len(kept), 'faces')
face = kept
VT, FL = [], []
for f in face:
    ls = list(f.loops)
    for k in range(1, len(ls) - 1):
        tri = (ls[0], ls[k], ls[k + 1]); idx = []
        for l in tri: VT.append(l[uvk].uv[:]); idx.append((l.vert.index + 1, len(VT)))
        FL.append(idx)
np.save(os.path.join(out, 'verts.npy'), P.astype(np.float32))
ipd = float(np.linalg.norm(eL - eR) * 1000.0)                  # its eyeballs' centres (the subject's left, +x, first)
np.save(os.path.join(out, 'eyes.npy'), np.array([[ipd / 2, 0, 0], [-ipd / 2, 0, 0]], np.float32))
with open(os.path.join(out, 'topology.obj'), 'w') as fo:
    for u, v in VT: fo.write(f'vt {u:.6f} {v:.6f}\n')
    for idx in FL: fo.write('f ' + ' '.join(f'{vi}/{ti}' for vi, ti in idx) + '\n')
img = bpy.data.images.load(os.path.join(tex_dir, mats[hmi] + '_color.jpg'))
_ = img.pixels[0]                                       # (loaded lazily: read before saving it again)
img.filepath_raw = os.path.join(out, 'tex.png'); img.file_format = 'PNG'; img.save()
print('face source', len(face), 'faces of', sum(len(p) for p in parts), 'in the head;', len(P), 'vertices; top',
      round(float(P[[v.index for f in face for v in f.verts], 2].max()), 1), 'mm above the eyes')
