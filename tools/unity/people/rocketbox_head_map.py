"""For one Rocketbox head: its own skin triangles with their texture coordinates and, at each corner, the template
layout's coordinate there (each Rocketbox vertex bound to the closest point of our template head fitted onto it, as
rocketbox_sculpt.py binds them), for baking template-layout maps (the skin's years) into the face's own layout without
crossing its seams. Usage: blender -b --python rocketbox_head_map.py -- <player_f|m.fbx> <rb.fbx> <out.npz>"""
import bpy, sys, os, numpy as np, mathutils, bmesh
from mathutils.bvhtree import BVHTree
ours_path, rb_path, out = sys.argv[sys.argv.index('--') + 1:][:3]
sys.argv = [sys.argv[0], '--', ours_path, rb_path, os.devnull]
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'rocketbox_sculpt.py')).read()
# the fit and binding of rocketbox_sculpt.py, stopping before its shapes are carried across
exec(src[:src.index('# each face shape across')])
tuvl = None
bm = bmesh.new(); bm.from_mesh(body.data); bmesh.ops.triangulate(bm, faces=bm.faces)
uvl = bm.loops.layers.uv.active
# the template's coordinate of each of its triangles' corners, by triangle (the tree's polygons are in this order)
tri_uv = np.array([[list(l[uvl].uv) for l in f.loops] for f in bm.faces]); bm.free()
# each Rocketbox head vertex: its template coordinate (barycentric on the closest template triangle)
vt = np.full((len(VR), 2), np.nan)
for i in np.where(region)[0]:
    loc, nrm, fi, d = tree.find_nearest(mathutils.Vector(VR[i]))
    if fi is None or d > 0.04: continue
    a, b, c = VW[tris[fi]]
    w = mathutils.geometry.barycentric_transform(loc, mathutils.Vector(a), mathutils.Vector(b), mathutils.Vector(c),
                                                 mathutils.Vector((1, 0, 0)), mathutils.Vector((0, 1, 0)), mathutils.Vector((0, 0, 1)))
    vt[i] = np.array(w) @ tri_uv[fi]
# the Rocketbox head's own triangles (its head material), their texture coordinates and their corners' template ones
ruv = rb_mesh.data.uv_layers.active.data
T_uv, T_tm = [], []
for p in rb_mesh.data.polygons:
    if p.material_index not in head_idx: continue
    vs = list(p.vertices); ls = list(p.loop_indices)
    for k in range(1, len(vs) - 1):
        c = [0, k, k + 1]
        T_uv.append([ruv[ls[j]].uv[:] for j in c]); T_tm.append([vt[vs[j]] for j in c])
np.savez_compressed(out, uv=np.array(T_uv, np.float32), tm=np.array(T_tm, np.float32))
print('head map', out, len(T_uv))
