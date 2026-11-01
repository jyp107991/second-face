"""Each Rocketbox head's own surface, exactly (for measuring its features without any fitting): the triangles of its head
material (or, for a library with one material for the whole person such as VALID, the triangles within 0.2 m of
the eyes and above the shoulders), their vertices in its eyes' frame (the middle of the eye bones at the origin, x across to the left eye, y back,
z up; millimetres), each vertex's texture coordinate, and the artist-placed face bones (mouth corners, lips, jaw, nose,
brows, lids) in the same frame. For a *_sculpt.fbx, the vertices again under each shape at full weight (same triangles),
so a shape's movement of a feature is measured on the same surface points.
Writes <name>#V, #T, #UV, #B (bones, in BONES order; NaN where a head lacks one) and <name>|<shape> (vertices).
Usage: blender -b --python rocketbox_surface.py -- <out.npz> [--keys all|key1,key2,...] <fbx> [<fbx> ...]"""
import bpy, sys, os, numpy as np

BONES = ['LEye', 'REye', 'LMouthCorner', 'RMouthCorner', 'MUpperLip', 'MBottomLip', 'LMouthBottom', 'RMouthBottom', 'MJaw',
         'MNose', 'LInnerEyebrow', 'RInnerEyebrow', 'MMiddleEyebrow', 'LOuterEyebrow', 'ROuterEyebrow', 'LEyeBlinkTop',
         'REyeBlinkTop', 'LEyeBlinkBottom', 'REyeBlinkBottom', 'Head']

if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:]
    out = args[0]; rest = args[1:]
    keys = []
    if rest and rest[0] == '--keys': keys = rest[1].split(','); rest = rest[2:]
    res = {}
    for path in rest:
        name = os.path.basename(path)[:-4]
        bpy.ops.wm.read_factory_settings(use_empty=True)
        try: bpy.ops.import_scene.fbx(filepath=path)
        except Exception as e: print('skip', name, e); continue
        meshes = [o for o in bpy.data.objects if o.type == 'MESH']
        mesh = next((o for o in meshes if 'hipoly' in o.name.lower()), None) or max(meshes, key=lambda o: len(o.data.vertices))
        arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
        # bone names: Rocketbox's 3ds Max biped (Bip01 LEye), or HumanIK's (LeftEye) as VALID's
        alias = {'LEye': 'LeftEye', 'REye': 'RightEye', 'Head': 'Head'}
        def bone(b):
            for nm in ('Bip01 ' + b, alias.get(b, '')):
                if nm and nm in arm.data.bones: return np.array(arm.matrix_world @ arm.data.bones[nm].head_local)
            return None
        if bone('LEye') is None: print('skip', name, 'no eyes'); continue
        eL, eR = bone('LEye'), bone('REye')
        mid = (eL + eR) / 2; xa = (eL - eR) / np.linalg.norm(eL - eR); za = np.array([0, 0, 1.0]); za -= xa * za.dot(xa); za /= np.linalg.norm(za); ya = np.cross(za, xa)
        if ya[1] < 0: ya = -ya          # (y back: the face is at -y)
        frame = lambda w: np.stack([(w - mid) @ xa, (w - mid) @ ya, (w - mid) @ za], -1) * 1000.0
        Mw = np.array(mesh.matrix_world)
        mats = [m.name if m else '' for m in mesh.data.materials]
        hi = {i for i, nme in enumerate(mats) if nme.endswith('_head')}
        tris, uvv = [], {}
        uvl = mesh.data.uv_layers.active.data if mesh.data.uv_layers.active else None
        for p in mesh.data.polygons:
            if p.material_index not in hi: continue
            v = list(p.vertices); li = list(p.loop_indices)
            if uvl is not None:
                for vi, l in zip(v, li): uvv.setdefault(vi, tuple(uvl[l].uv))
            for k in range(1, len(v) - 1): tris.append((v[0], v[k], v[k + 1]))
        tris = np.array(tris).reshape(-1, 3)
        if not len(tris) and len(mats) <= 2:
            # one material for the whole person: the head is what lies near the eyes
            a = np.zeros(len(mesh.data.vertices) * 3); mesh.data.vertices.foreach_get('co', a)
            Wv = a.reshape(-1, 3) @ Mw[:3, :3].T + Mw[:3, 3]; Fv = frame(Wv)
            near = (np.linalg.norm(Fv, axis=1) < 200) & (Fv[:, 2] > -180)
            tris = []
            for p in mesh.data.polygons:
                v = list(p.vertices)
                if not near[v].all(): continue
                li = list(p.loop_indices)
                if uvl is not None:
                    for vi, l in zip(v, li): uvv.setdefault(vi, tuple(uvl[l].uv))
                for k in range(1, len(v) - 1): tris.append((v[0], v[k], v[k + 1]))
            tris = np.array(tris).reshape(-1, 3)
        if not len(tris): print('skip', name, 'no head material'); continue
        used = np.unique(tris); remap = np.full(len(mesh.data.vertices), -1); remap[used] = np.arange(len(used))
        def co(kb=None):
            src = kb.data if kb is not None else mesh.data.vertices
            a = np.zeros(len(src) * 3); src.foreach_get('co', a); a = a.reshape(-1, 3)
            return frame(a @ Mw[:3, :3].T + Mw[:3, 3])[used].astype(np.float32)
        sk = mesh.data.shape_keys
        res[name + '#V'] = co(sk.reference_key if sk else None)
        res[name + '#T'] = remap[tris].astype(np.int32)
        res[name + '#UV'] = np.array([uvv.get(int(u), (np.nan, np.nan)) for u in used], np.float32)
        res[name + '#B'] = np.array([frame(bone(b)) if bone(b) is not None else [np.nan] * 3 for b in BONES], np.float32)
        if sk:
            for kb in sk.key_blocks:
                if kb == sk.reference_key: continue
                if keys == ['all'] or kb.name in keys: res[name + '|' + kb.name] = co(kb)
        print('read', name, len(tris), 'triangles', len(used), 'vertices')
    np.savez_compressed(out, **res)
    print('wrote', out, len(res))
