#!/usr/bin/env python3
"""Branch cards from the Poly Haven scans (CC0): the needle conifers and the broadleaf are photoscan-grade geometry
(millions of triangles), unusable on a phone as meshes but ideal as the source of branch-cluster cards. A slab of one
scan is rendered unlit and orthographically with a transparent film into an RGBA card
(unity/Assets/SecondFace/Kits/Trees/tex/card_<name>.png, committed) that trees.py puts on Sapling trees.

Runs under Blender's Python after tools/unity/models.py has fetched the scans:

    blender -b --python tools/unity/kits/cards.py -- [--only pine_branch,fir_branch]
"""
import json, os, sys, time

import bpy
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
import models as M  # noqa: E402

OUT = os.path.join(M.ROOT, 'unity', 'Assets', 'SecondFace', 'Kits', 'Trees', 'tex')
REL = 'Assets/SecondFace/Kits/Trees/tex'

# name: scan, variant letter, the materials kept (substrings; everything else, dead wood above all, is deleted), the
# card's band height and slab depth in metres, the output's long side in pixels. Branch cards are cut from the scan
# along the crown's densest direction out of the trunk; the whole-crown card frames the full sapling.
CARDS = {
    'pine_branch': dict(model='pine_sapling_medium', variant='a', keep=('twig', 'bark'), drop=('dead',), band=1.3, depth=1.0, px=1024),
    'fir_branch': dict(model='fir_sapling_medium', variant='a', keep=('twigs', 'branches'), drop=('dead',), band=1.2, depth=1.0, px=1024),
    'broadleaf_cluster': dict(model='tree_small_02', variant=None, keep=('leaves', 'branches'), drop=('trunk',), band=1.2, depth=1.2, reach=1.5, px=1024),
    'pine_crown': dict(model='pine_sapling_medium', variant='a', keep=('twig', 'bark', 'dead'), whole=True, px=1024),
}
def unlit(mat):
    """Rewires a material to emit its base colour and keep its alpha: the card is albedo, lit in the engine."""
    if not mat.use_nodes:
        mat.use_nodes = True
    nt = mat.node_tree
    bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    out = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'), None)
    if bsdf is None or out is None:
        return
    em = nt.nodes.new('ShaderNodeEmission'); tr = nt.nodes.new('ShaderNodeBsdfTransparent'); mix = nt.nodes.new('ShaderNodeMixShader')
    col = bsdf.inputs['Base Color']
    if col.is_linked:
        nt.links.new(col.links[0].from_socket, em.inputs['Color'])
    else:
        em.inputs['Color'].default_value = col.default_value
    alpha = bsdf.inputs['Alpha']
    if alpha.is_linked:
        nt.links.new(alpha.links[0].from_socket, mix.inputs['Fac'])
    else:
        mix.inputs['Fac'].default_value = alpha.default_value
    nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(em.outputs[0], mix.inputs[2])
    for l in list(out.inputs['Surface'].links):
        nt.links.remove(l)
    nt.links.new(mix.outputs[0], out.inputs['Surface'])
    mat.blend_method = 'HASHED'


def face_data(ob):
    """World-space face centres and each face's material name, as numpy arrays."""
    n = len(ob.data.polygons)
    c = np.empty(n * 3, dtype=np.float32); ob.data.polygons.foreach_get('center', c)
    mi = np.empty(n, dtype=np.int32); ob.data.polygons.foreach_get('material_index', mi)
    mw = np.array(ob.matrix_world)
    names = np.array([m.name if m else '' for m in ob.data.materials])
    return c.reshape(n, 3) @ mw[:3, :3].T + mw[:3, 3], names[mi]


def keep_only(ob, keep, drop=()):
    """Deletes every face whose material matches none of the kept substrings or any dropped one (dead wood)."""
    _, mats = face_data(ob)
    drop = np.array([not any(k in m for k in keep) or any(d in m for d in drop) for m in mats])
    if not drop.any(): return
    bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_mode(type='FACE'); bpy.ops.mesh.select_all(action='DESELECT')
    bpy.ops.object.mode_set(mode='OBJECT')
    ob.data.polygons.foreach_set('select', drop)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.delete(type='FACE'); bpy.ops.object.mode_set(mode='OBJECT')


def finish_card(path, spec):
    """Crops the render to its alpha, turns it root-down (the branch grows up the card, v = 0 at the stem), and spreads
    the colour of the opaque texels into the transparent ones so mipmaps fade to foliage colour, not to black."""
    img = bpy.data.images.load(path); w, h = img.size
    a = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1]   # Blender rows run bottom-up; work top-down
    ys, xs = np.nonzero(a[..., 3] > 0.02)
    m = 4
    y0, y1 = max(0, ys.min() - m), min(h, ys.max() + m + 1); x0, x1 = max(0, xs.min() - m), min(w, xs.max() + m + 1)
    a = a[y0:y1, x0:x1].copy()
    if not spec.get('whole'):
        a = np.ascontiguousarray(np.rot90(a, k=1))   # counter-clockwise in top-down rows: the trunk side (left) goes down
    filled = a[..., 3] > 0.5
    rgb = a[..., :3] * filled[..., None]
    for _ in range(32):
        acc = np.zeros_like(rgb); cnt = np.zeros(filled.shape, dtype=np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            acc += np.roll(rgb, (dy, dx), axis=(0, 1)); cnt += np.roll(filled, (dy, dx), axis=(0, 1))
        grow = (~filled) & (cnt > 0)
        if not grow.any(): break
        rgb[grow] = acc[grow] / cnt[grow][:, None]; filled = filled | grow
    a[..., :3] = np.where((a[..., 3] > 0.5)[..., None], a[..., :3], rgb)
    out = bpy.data.images.new('card', a.shape[1], a.shape[0], alpha=True)
    out.pixels = a[::-1].ravel().tolist(); out.filepath_raw = path; out.file_format = 'PNG'; out.save()
    return (x1 - x0) / w, (y1 - y0) / h


def bake(name, spec):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    src = os.path.join(M.OUT, spec['model'], spec['model'] + '.gltf')
    bpy.ops.import_scene.gltf(filepath=src)
    objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    v = spec.get('variant')
    for o in objs:
        if v and f'_{v}_' not in o.name and not o.name.endswith(f'_{v}'):
            bpy.data.objects.remove(o, do_unlink=True)
    keep = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    for o in keep:
        keep_only(o, spec['keep'], spec.get('drop', ()))
    for m in bpy.data.materials:
        unlit(m)
    fc, fm = zip(*(face_data(o) for o in keep)); fc = np.concatenate(fc); fm = np.concatenate(fm)
    lo, hi = fc.min(axis=0), fc.max(axis=0)
    foliage = np.array([any(k in mm for k in spec['keep'][:1]) for mm in fm])
    if spec.get('whole'):
        right, fwd = np.array([1.0, 0, 0]), np.array([0, 1.0, 0])
        centre = (lo + hi) / 2; w, hgt, depth = hi[0] - lo[0], hi[2] - lo[2], hi[1] - lo[1]
        mid = centre
    else:
        # the trunk: the densest column of wood faces in the crown's middle third
        z = fc[:, 2]; zr = lo[2] + (hi[2] - lo[2]) * np.array([0.3, 0.7])
        wood = (~foliage) & (z > zr[0]) & (z < zr[1])
        hx, xe, ye = np.histogram2d(fc[wood, 0], fc[wood, 1], bins=(int((hi[0] - lo[0]) / 0.1) + 1, int((hi[1] - lo[1]) / 0.1) + 1))
        i, j = np.unravel_index(np.argmax(hx), hx.shape)
        trunk = np.array([(xe[i] + xe[i + 1]) / 2, (ye[j] + ye[j + 1]) / 2])
        # the band: the densest 0.2 m slice of foliage between 30 % and 75 % of the height
        f = fc[foliage]; fz = f[:, 2]
        hist, edges = np.histogram(fz, bins=int((hi[2] - lo[2]) / 0.2) + 1, range=(lo[2], hi[2]))
        n = len(hist); lo_i, hi_i = int(n * 0.3), max(int(n * 0.3) + 1, int(n * 0.75))
        k = lo_i + int(np.argmax(hist[lo_i:hi_i])); zc = (edges[k] + edges[k + 1]) / 2
        inband = np.abs(fz - zc) < spec['band'] / 2
        d = f[inband, :2] - trunk; r = np.hypot(d[:, 0], d[:, 1]); ang = np.arctan2(d[:, 1], d[:, 0])
        sel = (r > 0.2) & (r < 3.0)
        hist_a, ea = np.histogram(ang[sel], bins=24, range=(-np.pi, np.pi))
        sm = hist_a + np.roll(hist_a, 1) + np.roll(hist_a, -1)
        a0 = (ea[np.argmax(sm)] + ea[np.argmax(sm) + 1]) / 2
        right = np.array([np.cos(a0), np.sin(a0), 0.0]); fwd = np.array([-np.sin(a0), np.cos(a0), 0.0])
        along = d[:, 0] * right[0] + d[:, 1] * right[1]; across = d[:, 0] * fwd[0] + d[:, 1] * fwd[1]
        sector = sel & (np.abs(across) < spec['depth'] / 2) & (along > 0)
        reach = min(float(np.quantile(along[sector], 0.97)), spec.get('reach', 99.0))   # a cap keeps a sparse crown's card dense
        x0, x1 = 0.1, reach + 0.05
        w, hgt, depth = x1 - x0, spec['band'], spec['depth']
        mid = np.array([trunk[0], trunk[1], zc]) + right * (x0 + x1) / 2
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 48; sc.cycles.device = 'CPU'; sc.cycles.use_denoising = False
    sc.render.film_transparent = True
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    aspect = w / hgt
    px = spec['px']
    sc.render.resolution_x, sc.render.resolution_y = (px, max(64, int(px / aspect))) if aspect >= 1 else (max(64, int(px * aspect)), px)
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'; sc.render.image_settings.color_depth = '8'
    world = bpy.data.worlds.new('w'); sc.world = world; world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[1].default_value = 0.0
    cam_d = bpy.data.cameras.new('c'); cam_d.type = 'ORTHO'
    cam_d.ortho_scale = max(w, hgt)
    cam = bpy.data.objects.new('c', cam_d); sc.collection.objects.link(cam); sc.camera = cam
    dist = 50.0
    cam.location = Vector(mid - fwd * dist)
    cam.rotation_euler = Vector(fwd).to_track_quat('-Z', 'Y').to_euler()   # looking along fwd, z up, the branch to the right
    cam_d.clip_start = dist - depth / 2; cam_d.clip_end = dist + depth / 2
    os.makedirs(OUT, exist_ok=True)
    out = os.path.join(OUT, f'card_{name}.png')
    sc.render.filepath = out
    t = time.time()
    bpy.ops.render.render(write_still=True)
    fx, fy = finish_card(out, spec)
    fw, fh = cam_d.ortho_scale * (sc.render.resolution_x / max(sc.render.resolution_x, sc.render.resolution_y)) * fx, \
        cam_d.ortho_scale * (sc.render.resolution_y / max(sc.render.resolution_x, sc.render.resolution_y)) * fy
    if not spec.get('whole'):
        fw, fh = fh, fw   # turned: the card's width is the branch's thickness, its height the branch's length
    side = {'name': name, 'model': spec['model'], 'width_m': round(float(fw), 3), 'height_m': round(float(fh), 3),
            'root': 'centre' if spec.get('whole') else 'bottom', 'licence': 'CC0 (Poly Haven scan, rendered)'}
    with open(os.path.join(OUT, f'card_{name}.json'), 'w') as f:
        json.dump(side, f, indent=1)
    import assets as A
    if not os.path.exists(out + '.meta'):   # the editor rewrites an existing meta's import settings; keep its version
        with open(out + '.meta', 'w') as f:
            f.write(A.meta(f'{REL}/card_{name}.png', 'd'))
    with open(os.path.join(OUT, f'card_{name}.json.meta'), 'w') as f:
        f.write(f'fileFormatVersion: 2\nguid: {M.guid_for(f"{REL}/card_{name}.json")}\nTextScriptImporter:\n  externalObjects: {{}}\n  userData: \n  assetBundleName: \n  assetBundleVariant: \n')
    print(f'{name:20s} {fw:.2f} x {fh:.2f} m  {time.time() - t:4.0f}s  -> {out}')


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    only = None
    for i, a in enumerate(argv):
        if a == '--only': only = set(argv[i + 1].split(','))
    os.makedirs(OUT, exist_ok=True)
    M.write_meta(os.path.join(M.ROOT, 'unity', 'Assets', 'SecondFace', 'Kits', 'Trees'), M.folder_meta('Assets/SecondFace/Kits/Trees'))
    M.write_meta(OUT, M.folder_meta(REL))
    for name, spec in CARDS.items():
        if only and name not in only:
            continue
        try:
            bake(name, spec)
        except Exception as e:
            print(f'{name:20s} failed: {e}')


if __name__ == '__main__':
    main()
