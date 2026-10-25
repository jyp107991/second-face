#!/usr/bin/env python3
"""
Build web-ready human assets from the CC0 MakeHuman 1.2 data.

Usage:  python3 tools/mh/build_human.py <mh_data_dir> <out_dir>
        (mh_data_dir = .../data from tools/mh/fetch_makehuman.sh; out_dir = public/assets/human)

Only CC0 *assets* are read (mesh, targets, rigs, proxies, textures). The MakeHuman macro-weighting
rules are re-implemented at runtime in src/engine/assets/human/macros.ts.

Output:
  human.json  manifest (views into human.bin, target names, PCA projection, modifiers, skeleton, proxies)
  human.bin   packed binary data
  tex/*.webp  textures
"""
import json
import os
import re
import sys

import numpy as np
from PIL import Image

SRC, OUT = sys.argv[1], sys.argv[2]
# Optional: root of extracted MakeHuman community asset packs (CC0 / CC-BY), see tools/mh/fetch_community.sh
COMMUNITY = sys.argv[3] if len(sys.argv) > 3 else None
os.makedirs(os.path.join(OUT, 'tex'), exist_ok=True)

blob = bytearray()
views = {}


def put(name, arr):
    """Append a numpy array to the binary blob (4-byte aligned) and record a view."""
    global blob
    arr = np.ascontiguousarray(arr)
    while len(blob) % 4:
        blob.append(0)
    views[name] = {'offset': len(blob), 'length': int(arr.size), 'type': str(arr.dtype)}
    blob += arr.tobytes()


# ---------------------------------------------------------------------------------------------
# Base mesh
# ---------------------------------------------------------------------------------------------
def read_obj(path):
    v, vt, faces, group = [], [], [], None
    for line in open(path):
        if line.startswith('v '):
            v.append([float(x) for x in line.split()[1:4]])
        elif line.startswith('vt '):
            vt.append([float(x) for x in line.split()[1:3]])
        elif line.startswith('g '):
            group = line.split()[1]
        elif line.startswith('f '):
            idx = []
            for tok in line.split()[1:]:
                parts = tok.split('/')
                idx.append((int(parts[0]) - 1, int(parts[1]) - 1 if len(parts) > 1 and parts[1] else -1))
            faces.append((group, idx))
    return np.array(v, np.float32), np.array(vt, np.float32), faces


def uv_split(faces, keep=lambda g: True):
    """Unique (v, vt) pairs -> render vertices; triangulate quads."""
    key_to_r, r_v, r_vt, tris = {}, [], [], []
    for g, idx in faces:
        if not keep(g):
            continue
        rs = []
        for vi, ti in idx:
            k = (vi, ti)
            if k not in key_to_r:
                key_to_r[k] = len(r_v)
                r_v.append(vi)
                r_vt.append(ti)
            rs.append(key_to_r[k])
        for i in range(1, len(rs) - 1):
            tris.append((rs[0], rs[i], rs[i + 1]))
    return np.array(r_v, np.uint32), np.array(r_vt, np.int64), np.array(tris, np.uint32)


base_v, base_vt, base_faces = read_obj(os.path.join(SRC, '3dobjs/base.obj'))
NV = len(base_v)
r_v, r_vt, tris = uv_split(base_faces, lambda g: g == 'body')
print('base verts', NV, 'render verts', len(r_v), 'tris', len(tris))
put('base_pos', base_v.reshape(-1))
put('body_map', r_v.astype(np.uint16))
put('body_uv', base_vt[r_vt].reshape(-1).astype(np.float32))
put('body_index', tris.reshape(-1).astype(np.uint16 if len(r_v) < 65536 else np.uint32))


# ---------------------------------------------------------------------------------------------
# Targets
# ---------------------------------------------------------------------------------------------
def read_target(path):
    idx, d = [], []
    for line in open(path):
        if not line.strip() or line.startswith('#'):
            continue
        p = line.split()
        idx.append(int(p[0]))
        d.append([float(p[1]), float(p[2]), float(p[3])])
    return np.array(idx, np.int64), np.array(d, np.float32).reshape(-1, 3)


TG = os.path.join(SRC, 'targets')

# Macro targets. Universal/ethnic/breast shapes are stored exactly as sparse targets (they join the
# detail-target pool below under "macro/..." names). Height variations are exactly rank-16, so they
# are stored as a 16-component PCA basis. Child/baby targets (game is adults only) and the cosmetic
# "proportions" family are skipped.
detail = {}
macro_sparse, height_files = [], []
for root, _, files in os.walk(os.path.join(TG, 'macrodetails')):
    for f in sorted(files):
        if not f.endswith('.target') or 'baby' in f or 'child' in f or 'proportions' in root:
            continue
        rel = os.path.relpath(os.path.join(root, f), TG)
        (height_files if 'height' in root else macro_sparse).append(rel)
for f in sorted(os.listdir(os.path.join(TG, 'breast'))):
    if f.startswith('female-') and f.endswith('.target') and 'baby' not in f and 'child' not in f:
        macro_sparse.append('breast/' + f)
for rel in macro_sparse:
    detail['macro/' + rel[:-7]] = read_target(os.path.join(TG, rel))
height_files.sort()
M = np.zeros((len(height_files), NV * 3), np.float32)
for i, f in enumerate(height_files):
    idx, d = read_target(os.path.join(TG, f))
    full = np.zeros((NV, 3), np.float32)
    full[idx] = d
    M[i] = full.reshape(-1)
U, S, Vt = np.linalg.svd(M, full_matrices=False)
K = 16
err = np.sqrt((((U[:, :K] * S[:K]) @ Vt[:K] - M).reshape(len(M), NV, 3) ** 2).sum(-1)).max() * 100
print('macro sparse', len(macro_sparse), 'height', len(height_files), f'height PCA K={K} max error {err:.4f} mm')
proj = (U[:, :K] * S[:K]).astype(np.float32)
comps = Vt[:K].astype(np.float32)
comp_scale = np.abs(comps).max(axis=1) / 32767.0
put('pca', np.round(comps / comp_scale[:, None]).astype(np.int16).reshape(-1))
macro_files = height_files

# Detail targets (sparse, local) for the modeling modifiers.
modgroups = json.load(open(os.path.join(SRC, 'modifiers/modeling_modifiers.json')))
SKIP_GROUPS = {'macrodetails', 'macrodetails-universal', 'macrodetails-height', 'macrodetails-proportions', 'genitals', 'breast'}
modifiers = []
for g in modgroups:
    if g['group'] in SKIP_GROUPS:
        continue
    for m in g['modifiers']:
        if 'target' not in m:
            continue
        name = m['target']
        if 'min' in m:
            files = {'min': f"{name}-{m['min']}", 'max': f"{name}-{m['max']}"}
            label = f"{name}|{m['min']}|{m['max']}"
        else:
            files = {'max': name}
            label = name
        ok = True
        for k, fn in files.items():
            path = os.path.join(TG, g['group'], fn + '.target')
            if not os.path.exists(path):
                ok = False
                break
            if fn not in detail:
                detail[fn] = read_target(path)
        if ok:
            modifiers.append({'id': label, 'group': g['group'], **{k: v for k, v in files.items()}})
print('modifiers', len(modifiers), 'detail targets', len(detail))
d_idx, d_val, d_meta = [], [], {}
off = 0
for name, (idx, d) in sorted(detail.items()):
    if len(idx) == 0:
        continue
    scale = float(np.abs(d).max()) / 32767.0 or 1e-9
    d_idx.append(idx.astype(np.uint16))
    d_val.append(np.round(d / scale).astype(np.int16).reshape(-1))
    d_meta[name] = [off, len(idx), scale]
    off += len(idx)
put('detail_idx', np.concatenate(d_idx))
put('detail_val', np.concatenate(d_val))

# ---------------------------------------------------------------------------------------------
# Skeleton + weights
# ---------------------------------------------------------------------------------------------
skel = json.load(open(os.path.join(SRC, 'rigs/default.mhskel')))
bone_names = list(skel['bones'].keys())
bones = []
for n in bone_names:
    b = skel['bones'][n]
    bones.append({'name': n, 'parent': b['parent'], 'head': b['head'], 'tail': b['tail'], 'plane': skel['planes'].get(b.get('rotation_plane'), None) if 'planes' in skel and b.get('rotation_plane') else None})
joints = skel['joints']
wfile = json.load(open(os.path.join(SRC, 'rigs/default_weights.mhw')))['weights']
inf = [[] for _ in range(NV)]
for bi, n in enumerate(bone_names):
    for vi, w in wfile.get(n, []):
        inf[vi].append((w, bi))
skin_idx = np.zeros((NV, 4), np.uint8)
skin_w = np.zeros((NV, 4), np.float32)
for vi, lst in enumerate(inf):
    lst.sort(reverse=True)
    lst = lst[:4]
    tot = sum(w for w, _ in lst) or 1
    for k, (w, bi) in enumerate(lst):
        skin_idx[vi, k] = bi
        skin_w[vi, k] = w / tot
put('skin_idx', skin_idx.reshape(-1))
put('skin_w', np.round(skin_w * 255).astype(np.uint8).reshape(-1))
print('bones', len(bones))


# ---------------------------------------------------------------------------------------------
# Textures
# ---------------------------------------------------------------------------------------------
def tex(src, name, size, quality=82):
    dst = os.path.join(OUT, 'tex', name + '.webp')
    if not os.path.exists(dst):
        im = Image.open(src)
        if im.mode not in ('RGB', 'RGBA'):
            im = im.convert('RGBA')
        if max(im.size) > size:
            im = im.resize((size, size), Image.LANCZOS)
        im.save(dst, 'WEBP', quality=quality, method=6)
    return 'tex/' + name + '.webp'


def read_mhmat(path):
    m = {}
    for line in open(path):
        if line.startswith('#') or not line.strip():
            continue
        p = line.split(None, 1)
        if len(p) == 2:
            m[p[0]] = p[1].strip()
    return m


skins = {}
for f in sorted(os.listdir(os.path.join(SRC, 'skins/textures'))):
    mt = re.match(r'(young|middleage|old)_(light|dark)skinned_(male|female)_diffuse(\d?)\.png', f)
    if mt:
        age, tone, sex, var = mt.groups()
        key = f"{age}_{tone}_{sex}{var}"
        skins[key] = tex(os.path.join(SRC, 'skins/textures', f), 'skin_' + key, 1024, 85)
        tex(os.path.join(SRC, 'skins/textures', f), 'skin_' + key + '_hi', 2048, 88)  # close-ups (loaded on demand)
print('skins', len(skins))


# ---------------------------------------------------------------------------------------------
# Proxies (eyes, brows, lashes, teeth, tongue, hair, clothes)
# ---------------------------------------------------------------------------------------------
def read_mhclo(path):
    meta, refs, deletes, section = {}, [], [], None
    for line in open(path):
        if line.startswith('#') or not line.strip():
            continue
        s = line.strip()
        p = s.split()
        if p[0] == 'verts':
            section = 'verts'
            continue
        if p[0] == 'delete_verts':
            section = 'delete'
            continue
        if section == 'verts' and re.match(r'^-?\d', p[0]):
            if len(p) == 1:
                refs.append((int(p[0]), 0, 0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0))
            else:
                refs.append((int(p[0]), int(p[1]), int(p[2]), float(p[3]), float(p[4]), float(p[5]), float(p[6]), float(p[7]), float(p[8])))
            continue
        if section == 'delete' and re.match(r'^\d', p[0]):
            i = 0
            while i < len(p):
                if i + 2 < len(p) and p[i + 1] == '-':
                    deletes.extend(range(int(p[i]), int(p[i + 2]) + 1))
                    i += 3
                else:
                    deletes.append(int(p[i]))
                    i += 1
            continue
        meta[p[0]] = p[1:]
    return meta, refs, deletes


proxies = {}


def add_proxy(kind, folder, name, mat_override=None, tex_size=512, root=None):
    d = os.path.join(root or SRC, folder, name)
    meta, refs, deletes = read_mhclo(os.path.join(d, name + '.mhclo'))
    pv, pvt, pf = read_obj(os.path.join(d, meta['obj_file'][0]))
    rv, rvt, rtris = uv_split(pf)
    refs = np.array(refs, np.float32)
    assert len(refs) == len(pv), (name, len(refs), len(pv))
    r = refs[rv]
    key = f'{kind}_{name}'
    put(key + '_ref', r[:, :3].astype(np.uint16).reshape(-1))
    put(key + '_w', r[:, 3:6].astype(np.float32).reshape(-1))
    put(key + '_off', r[:, 6:9].astype(np.float32).reshape(-1))
    put(key + '_uv', (pvt[rvt] if len(pvt) else np.zeros((len(rv), 2))).astype(np.float32).reshape(-1))
    put(key + '_index', rtris.reshape(-1).astype(np.uint16))
    scale = {}
    for ax in ('x_scale', 'y_scale', 'z_scale'):
        if ax in meta:
            scale[ax[0]] = [int(meta[ax][0]), int(meta[ax][1]), float(meta[ax][2])]
    mat_path = os.path.join(d, mat_override or meta.get('material', [name + '.mhmat'])[0])
    mat = read_mhmat(mat_path) if os.path.exists(mat_path) else {}
    texture = None
    if 'diffuseTexture' in mat:
        tp = os.path.join(os.path.dirname(mat_path), mat['diffuseTexture'])
        if os.path.exists(tp):
            texture = tex(tp, key, tex_size)
    normal = None
    for nk in ('normalmapTexture', 'bumpTexture'):
        if nk in mat and not normal:
            tp = os.path.join(os.path.dirname(mat_path), mat[nk])
            if os.path.exists(tp):
                normal = tex(tp, key + '_n', tex_size, 90)
    if deletes:
        put(key + '_delete', np.array(deletes, np.uint16))
    proxies[key] = {'kind': kind, 'name': name, 'verts': int(len(rv)), 'scale': scale, 'texture': texture, 'normal': normal,
                    'transparent': mat.get('transparent', 'False') == 'True', 'zDepth': int(meta.get('z_depth', [0])[0]),
                    'delete': bool(deletes)}


add_proxy('eyes', 'eyes', 'high-poly', mat_override='../materials/brown.mhmat')
eye_tex = {}
for f in sorted(os.listdir(os.path.join(SRC, 'eyes/materials'))):
    if f.endswith('_eye.png'):
        eye_tex[f[:-8]] = tex(os.path.join(SRC, 'eyes/materials', f), 'eye_' + f[:-8], 256)
for n in sorted(os.listdir(os.path.join(SRC, 'eyebrows'))):
    if os.path.isdir(os.path.join(SRC, 'eyebrows', n)):
        add_proxy('brows', 'eyebrows', n, tex_size=256)
for n in sorted(os.listdir(os.path.join(SRC, 'eyelashes'))):
    if os.path.isdir(os.path.join(SRC, 'eyelashes', n)):
        add_proxy('lashes', 'eyelashes', n, tex_size=256)
add_proxy('teeth', 'teeth', 'teeth_base', mat_override='../materials/teeth.mhmat', tex_size=256)
add_proxy('tongue', 'tongue', 'tongue01', tex_size=256)
for n in sorted(os.listdir(os.path.join(SRC, 'hair'))):
    if os.path.isdir(os.path.join(SRC, 'hair', n)):
        add_proxy('hair', 'hair', n, tex_size=1024)
for n in ['male_worksuit01', 'male_casualsuit01', 'male_casualsuit02', 'male_casualsuit03', 'male_casualsuit04', 'male_casualsuit05',
          'male_casualsuit06', 'female_casualsuit01', 'female_casualsuit02', 'female_sportsuit01', 'shoes01', 'shoes02', 'shoes03',
          'shoes04', 'shoes05', 'shoes06']:
    add_proxy('clothes', 'clothes', n, tex_size=1024)
# ---------------------------------------------------------------------------------------------
# Community assets (CC0 unless noted; CC-BY authors credited in docs/CREDITS.md)
# ---------------------------------------------------------------------------------------------
skin_detail = {}
if COMMUNITY:
    C = COMMUNITY
    beards = [
        ('bodyparts05_cc0', 'wdg_scruffy_beard'), ('bodyparts05_cc0', 'rehmanpolanski_beard_viking'),
        ('bodyparts05_cc0', 'rehmanpolanski_moustache_viking'), ('bodyparts05_cc0', 'grinsegold_beard_sigmund_wip'),
        ('bodyparts06_cc-by', 'grinsegold_full_beard'), ('bodyparts06_cc-by', 'grinsegold_moustache'),
        ('bodyparts06_cc-by', 'elvs_scruffy_beard1'),
    ]
    for pack, n in beards:
        add_proxy('beard', 'clothes', n, root=os.path.join(C, pack), tex_size=1024)
    for i in range(1, 15):
        add_proxy('brows', 'eyebrows', f'mindfront_eyebrows_{i:02d}', root=os.path.join(C, 'eyebrows01_cc0'), tex_size=512)
    for i in range(1, 6):
        add_proxy('lashes', 'eyelashes', f'mindfront_eyelashes_{i:02d}', root=os.path.join(C, 'eyelashes01_cc0'), tex_size=256)
    for n in ['cortu_short_messy_hair', 'culturalibre_hair_01', 'culturalibre_hair_02', 'culturalibre_hair_05', 'culturalibre_hair_06',
              'o4saken_long01', 'toigo_inverted_bob', 'toigo_blunt_bob', 'rehmanpolanski_hair_bun_brown', 'elvs_unkempt_french_braid',
              'elvs_french_braid_variation', 'faydaen_hair_1', 'sonntag78_junglebook_hair']:
        p = os.path.join(C, 'hair01_cc0', 'hair', n)
        if os.path.isdir(p):
            add_proxy('hair', 'hair', n, root=os.path.join(C, 'hair01_cc0'), tex_size=1024)
    # Shared skin detail maps (all MakeHuman skins share one UV layout): pores, creases, oiliness.
    md = os.path.join(C, 'skins02_cc0', 'skins')
    skin_detail = {
        'normal_m': tex(os.path.join(md, 'mindfront_aksel_skin', 'Aksel_Skin_NRM.png'), 'skin_detail_normal_m', 2048, 92),
        'spec_m': tex(os.path.join(md, 'mindfront_aksel_skin', 'Aksel_Skin_SPEC.png'), 'skin_detail_spec_m', 1024, 85),
        'normal_old': tex(os.path.join(md, 'mindfront_skin_male_african_middleage', 'skin_male_african_middleage_NRM.png'), 'skin_detail_normal_old', 2048, 92),
        'spec_old': tex(os.path.join(md, 'mindfront_skin_male_african_middleage', 'skin_male_african_middleage_SPEC.png'), 'skin_detail_spec_old', 1024, 85),
    }

print('proxies', len(proxies))

# ---------------------------------------------------------------------------------------------
# Expressions (face pose units) — kept as raw data for the dialogue close-ups (M2).
# ---------------------------------------------------------------------------------------------
expressions = {}
for f in sorted(os.listdir(os.path.join(SRC, 'expressions'))):
    if f.endswith('.mhpose'):
        e = json.load(open(os.path.join(SRC, 'expressions', f)))
        expressions[f[:-7]] = e.get('unit_poses', {})

manifest = {
    'version': 1,
    'source': 'MakeHuman 1.2.0 assets (CC0 1.0) — converted by tools/mh/build_human.py',
    'unitScale': 0.1,
    'vertexCount': NV,
    'views': views,
    'heightTargets': [f[:-7] for f in height_files],
    'pca': {'k': K, 'scale': comp_scale.tolist(), 'proj': proj.round(6).tolist()},
    'detail': d_meta,
    'modifiers': modifiers,
    'bones': bones,
    'joints': joints,
    'skins': skins,
    'skinDetail': skin_detail,
    'eyes': eye_tex,
    'proxies': proxies,
    'expressions': expressions,
}
open(os.path.join(OUT, 'human.bin'), 'wb').write(bytes(blob))
json.dump(manifest, open(os.path.join(OUT, 'human.json'), 'w'), separators=(',', ':'))
print('bin', round(len(blob) / 1e6, 2), 'MB; json', round(os.path.getsize(os.path.join(OUT, 'human.json')) / 1e6, 2), 'MB')
