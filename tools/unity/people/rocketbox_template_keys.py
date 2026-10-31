"""Our sculptor's face shapes on the template's head vertices (the registration's idx), per base: their offsets in the
registration's frame (metres, facing -Y, Z up) for rocketbox_calibrate.py. Usage: blender -b --python
rocketbox_template_keys.py -- <player_f.fbx> <player_m.fbx> <registered.npz> <out.npz>"""
import bpy, sys, numpy as np
pf, pm, reg, out = sys.argv[sys.argv.index('--') + 1:][:4]
idx = np.load(reg)['idx']
res = {}
for sex, path in (('f', pf), ('m', pm)):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=path)
    body = bpy.data.objects['Body_LOD0']; M = np.array(body.matrix_world)
    def co(kb):
        a = np.zeros(len(kb.data) * 3); kb.data.foreach_get('co', a); a = a.reshape(-1, 3); return a @ M[:3, :3].T + M[:3, 3]
    kbs = body.data.shape_keys.key_blocks; base = co(kbs['Basis'])
    names, D = [], []
    for kb in kbs:
        if kb.name == 'Basis' or kb.name.startswith('body-'): continue
        d = (co(kb) - base)[idx]
        if np.abs(d).max() < 1e-5: continue
        names.append(kb.name); D.append(d)
    res[f'{sex}_names'] = np.array(names); res[f'{sex}_D'] = np.array(D, np.float32); res[f'{sex}_base'] = base[idx].astype(np.float32)
    print(sex, len(names))
np.savez_compressed(out, **res)
print('wrote', out)
