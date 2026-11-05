"""The outfit bake's view of a Rocketbox body (Blender): for every texel of its body texture, where on the body it lies.
Rocketbox paints each person's clothes into the body's own photographed texture; to re-dye them, take their prints and
insignia off and wear them in the right places, each texel needs its place on the body (height, side, front or back),
which way it faces, which part of the body carries it (by the skin's bone weights) and which piece of the layout it is on.
Usage: blender -b --python rb_outfit_map.py -- <person fbx> <out npz> [size, default 1024]
Writes: POS (H, W, 3; metres, feet at z = 0, x to the person's left, y to the front; NaN off the body), NRM (H, W, 3),
REG (H, W; uint8 part, REGIONS below; 255 off the body), ISL (H, W; int32 piece of the layout, -1 off), height (m)."""
import bpy, bmesh, sys, os
import numpy as np

args = sys.argv[sys.argv.index('--') + 1:]
person, out = args[0], args[1]
N = int(args[2]) if len(args) > 2 else 1024
REGIONS = ['torso', 'neck', 'upperarm', 'forearm', 'hand', 'hip', 'thigh', 'calf', 'foot', 'head']


def region_of(bone):
    b = bone.lower()
    if 'head' in b or 'eye' in b or 'jaw' in b or 'lip' in b or 'brow' in b or 'cheek' in b or 'tongue' in b: return 9
    if 'neck' in b: return 1
    if 'finger' in b or 'hand' in b: return 4
    if 'forearm' in b: return 3
    if 'upperarm' in b or 'clavicle' in b: return 2
    if 'toe' in b or 'foot' in b: return 8
    if 'calf' in b: return 7
    if 'thigh' in b: return 6
    if 'pelvis' in b: return 5
    return 0


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=person)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
mesh = max((o for o in bpy.data.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
mats = [m.name if m else '' for m in mesh.data.materials]
bmi = {i for i, nm in enumerate(mats) if nm.endswith('_body')}
bone = lambda n: np.array(arm.matrix_world @ arm.data.bones[n].head_local)
# the body's frame: x from the right hip to the left, z up, y to the front (the toes' side)
hl, hr = bone('Bip01 L Thigh'), bone('Bip01 R Thigh')
xa = hl - hr; xa[2] = 0; xa /= np.linalg.norm(xa); za = np.array([0, 0, 1.0]); ya = np.cross(za, xa)
toe = bone('Bip01 L Toe0') if 'Bip01 L Toe0' in arm.data.bones else bone('Bip01 L Foot')
if (toe - bone('Bip01 L Foot')) @ ya < 0: ya = -ya; xa = -xa
Mw = np.array(mesh.matrix_world)
a = np.zeros(len(mesh.data.vertices) * 3); mesh.data.vertices.foreach_get('co', a)
Pw = a.reshape(-1, 3) @ Mw[:3, :3].T + Mw[:3, 3]
z0 = Pw[:, 2].min(); ctr = (hl + hr) / 2
P = np.stack([(Pw - ctr) @ xa, (Pw - ctr) @ ya, Pw[:, 2] - z0], 1)
height = float(P[:, 2].max())
# each vertex's share of each part, from its skin weights
gname = {g.index: g.name for g in mesh.vertex_groups}
greg = {i: region_of(n) for i, n in gname.items()}
RW = np.zeros((len(P), len(REGIONS)), np.float32)
for v in mesh.data.vertices:
    for g in v.groups:
        if g.group in greg: RW[v.index, greg[g.group]] += g.weight
RW /= np.maximum(RW.sum(1, keepdims=True), 1e-6)
bm = bmesh.new(); bm.from_mesh(mesh.data); bm.faces.ensure_lookup_table(); bm.normal_update()
uvk = bm.loops.layers.uv.active
VN = np.array([v.normal[:] for v in bm.verts]) @ Mw[:3, :3].T
VN = np.stack([VN @ xa, VN @ ya, VN[:, 2]], 1); VN /= np.maximum(np.linalg.norm(VN, axis=1, keepdims=True), 1e-9)
# pieces of the layout: faces joined across edges whose two sides share their texture coordinates
fi = [f for f in bm.faces if f.material_index in bmi]
root = {f.index: f.index for f in fi}
def find(i):
    while root[i] != i: root[i] = root[root[i]]; i = root[i]
    return i
for f in fi:
    for l in f.loops:
        e = l.edge
        for g in e.link_faces:
            if g.index == f.index or g.material_index not in bmi: continue
            # the edge is shared in the layout when both ends match on both faces
            la = [x for x in g.loops if x.vert in e.verts]
            lb = [x for x in f.loops if x.vert in e.verts]
            ok = all(any((x.vert == y.vert) and (abs(x[uvk].uv[0] - y[uvk].uv[0]) + abs(x[uvk].uv[1] - y[uvk].uv[1]) < 1e-5)
                         for y in la) for x in lb)
            if ok:
                ra, rb = find(f.index), find(g.index)
                if ra != rb: root[ra] = rb
POS = np.full((N, N, 3), np.nan, np.float32); NRM = np.zeros((N, N, 3), np.float32)
REG = np.full((N, N), 255, np.uint8); ISL = np.full((N, N), -1, np.int32)
isl_id = {}
for f in fi:
    ls = list(f.loops); r = find(f.index); iid = isl_id.setdefault(r, len(isl_id))
    for k in range(1, len(ls) - 1):
        tri = (ls[0], ls[k], ls[k + 1])
        uv = np.array([l[uvk].uv[:] for l in tri]); vi = [l.vert.index for l in tri]
        px = uv[:, 0] * N; py = (1 - uv[:, 1]) * N
        x0, x1 = int(max(px.min() - 1, 0)), int(min(px.max() + 2, N)); y0, y1 = int(max(py.min() - 1, 0)), int(min(py.max() + 2, N))
        if x1 <= x0 or y1 <= y0: continue
        d = (px[1] - px[0]) * (py[2] - py[0]) - (px[2] - px[0]) * (py[1] - py[0])
        if abs(d) < 1e-12: continue
        gx, gy = np.meshgrid(np.arange(x0, x1) + 0.5, np.arange(y0, y1) + 0.5)
        w1 = ((gx - px[0]) * (py[2] - py[0]) - (px[2] - px[0]) * (gy - py[0])) / d
        w2 = ((px[1] - px[0]) * (gy - py[0]) - (gx - px[0]) * (py[1] - py[0])) / d
        w0 = 1 - w1 - w2
        ins = (w0 >= -0.01) & (w1 >= -0.01) & (w2 >= -0.01)
        if not ins.any(): continue
        W3 = np.stack([w0[ins], w1[ins], w2[ins]], 1)
        yy, xx = gy[ins].astype(int), gx[ins].astype(int)
        POS[yy, xx] = W3 @ P[vi]
        n = W3 @ VN[vi]; NRM[yy, xx] = n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-9)
        REG[yy, xx] = np.argmax(W3 @ RW[vi], 1).astype(np.uint8)
        ISL[yy, xx] = iid
np.savez_compressed(out, POS=POS.astype(np.float16), NRM=(NRM * 127).astype(np.int8), REG=REG, ISL=ISL, height=height, regions=np.array(REGIONS),
                    body_mat=np.array([mats[i] for i in sorted(bmi)]))
print('outfit map', os.path.basename(person), N, 'px;', len(isl_id), 'pieces; height', round(height, 3), 'm;',
      'texels', int((REG != 255).sum()))
