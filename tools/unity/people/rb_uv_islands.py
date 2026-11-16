"""The UV islands of each Rocketbox person's materials (play-ch1 T42: the outfit textures kept the photographed cloth's
original colour in the gutters round the UV islands, and filtering and mip-maps bled it across the seams as blue-grey
and white blotches). Writes, per person, <out>/<person>.npz with one array per material: its triangles in UV space
(T x 3 x 2, float32, v up as Blender keeps it), for rb_pad.py to rasterise and pad the textures out from.
Usage: blender -b --python rb_uv_islands.py -- <Rocketbox people dir> <out dir> [person ...]"""
import bpy, sys, os
import numpy as np

argv = sys.argv[sys.argv.index('--') + 1:]
src, out = argv[0], argv[1]
only = set(argv[2:])
os.makedirs(out, exist_ok=True)
for person in sorted(os.listdir(src)):
    fbx = os.path.join(src, person, person + '.fbx')
    if not os.path.isfile(fbx) or (only and person not in only): continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=fbx)
    tris = {}
    for ob in bpy.context.scene.objects:
        if ob.type != 'MESH' or not ob.data.uv_layers: continue
        me = ob.data; me.calc_loop_triangles()
        uv = np.empty(len(me.loops) * 2, np.float32); me.uv_layers.active.data.foreach_get('uv', uv); uv = uv.reshape(-1, 2)
        lt = np.empty(len(me.loop_triangles) * 3, np.int32); me.loop_triangles.foreach_get('loops', lt); lt = lt.reshape(-1, 3)
        mi = np.empty(len(me.loop_triangles), np.int32); me.loop_triangles.foreach_get('material_index', mi)
        for k, slot in enumerate(ob.material_slots):
            if slot.material is None: continue
            sel = lt[mi == k]
            if len(sel) == 0: continue
            name = slot.material.name.split('.')[0]
            tris.setdefault(name, []).append(uv[sel])
    np.savez_compressed(os.path.join(out, person + '.npz'), **{k: np.concatenate(v) for k, v in tris.items()})
    print(person, {k: sum(len(a) for a in v) for k, v in tris.items()})
