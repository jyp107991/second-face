"""VALID's faces as shapes on its one shared mesh (owner, 2026-11-01: harmonise VALID into Rocketbox's house style): every
VALID person's body mesh (H_DDS_HighRes, the same 20,951 vertices for all) in its own eyes' frame (the middle of the
eye bones at the origin, x across to the left eye, y back, z up; millimetres), the shared triangles, and per validated
group and sex the mean shape. A difference of two groups' means (say Indigenous American women less White women) keeps
what tells the groups apart and cancels what VALID's construction does to every face alike (its averaging, its shallow
noses, its wide women's faces), so it is the one thing taken from VALID (harmonise.py).
Usage: blender -b --python valid_groups.py -- <out.npz> <labels.csv> <fbx> [<fbx> ...]"""
import bpy, sys, os, csv
import numpy as np

args = sys.argv[sys.argv.index('--') + 1:]
out, labels, paths = args[0], args[1], args[2:]
# the validated labels: a face counts for a group only where its group was confirmed by the study's participants of that
# group ("Ethnicity (Within)"); faces under X_Non-validated are left out
valid = {}
with open(labels, encoding='utf-8-sig') as f:
    for row in csv.DictReader(f):
        a = (row.get('Avatar') or '').strip()
        if a and not a.startswith('X_'): valid[a] = (row.get('Ethnicity (Within)') or '').strip()
res, tris = {}, None
for path in paths:
    name = os.path.basename(path)[:-4].replace('_Casual', '')
    if name not in valid: print('skip', name, 'not validated'); continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=path)
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    mesh = max((o for o in bpy.data.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
    b = lambda n: np.array(arm.matrix_world @ arm.data.bones[n].head_local)
    eL, eR = b('LeftEye'), b('RightEye')
    mid = (eL + eR) / 2; xa = (eL - eR) / np.linalg.norm(eL - eR); za = np.array([0, 0, 1.0]); za -= xa * za.dot(xa); za /= np.linalg.norm(za)
    ya = np.cross(za, xa)
    hd = mid - b('Head'); hd -= xa * hd.dot(xa); hd[2] = 0
    if hd.dot(-ya) < 0: ya = -ya          # (y back: the eyes are in front of the head's joint)
    a = np.zeros(len(mesh.data.vertices) * 3); mesh.data.vertices.foreach_get('co', a)
    M = np.array(mesh.matrix_world); W = a.reshape(-1, 3) @ M[:3, :3].T + M[:3, 3] - mid
    res[name] = (np.stack([W @ xa, W @ ya, W @ za], 1) * 1000.0).astype(np.float32)
    if tris is None:
        t = []
        for p in mesh.data.polygons:
            v = list(p.vertices); t += [(v[0], v[k], v[k + 1]) for k in range(1, len(v) - 1)]
        tris = np.array(t, np.int32)
    print('read', name, valid[name])
groups = {}
for name in res:
    grp, sex = name.split('_')[0], name.split('_')[1].lower()
    groups.setdefault(f'{grp}_{sex}', []).append(name)
out_d = {'T': tris, 'names': np.array(sorted(res)), 'labels': np.array([valid[n] for n in sorted(res)])}
for n, v in res.items(): out_d['V:' + n] = v
for g, ns in groups.items(): out_d['mean:' + g] = np.mean([res[n] for n in ns], 0).astype(np.float32); print('group', g, ns)
np.savez_compressed(out, **out_d)
print('wrote', out)
