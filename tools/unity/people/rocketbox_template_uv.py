"""The template head's texture layout and triangles on the registration's vertices (for resampling the Rocketbox faces'
textures into one layout). Usage: blender -b --python rocketbox_template_uv.py -- <player_f.fbx> <registered.npz> <out.npz>"""
import bpy, sys, numpy as np, bmesh
pf, reg, out = sys.argv[sys.argv.index('--') + 1:][:3]
idx = np.load(reg)['idx']; pos = {int(v): j for j, v in enumerate(idx)}
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=pf)
body = bpy.data.objects['Body_LOD0']
bm = bmesh.new(); bm.from_mesh(body.data); bmesh.ops.triangulate(bm, faces=bm.faces)
uvl = bm.loops.layers.uv.active
tris, tuv = [], []
for f in bm.faces:
    vs = [l.vert.index for l in f.loops]
    if all(v in pos for v in vs):
        tris.append([pos[v] for v in vs]); tuv.append([list(l[uvl].uv) for l in f.loops])
np.savez_compressed(out, tris=np.array(tris), tuv=np.array(tuv, np.float32))
print('tris', len(tris))
