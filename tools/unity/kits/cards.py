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

# name: scan, variant letter, the material names that are foliage, the slab (metres, Blender z up): x from the trunk
# outwards, z band height, y depth; the output size.
CARDS = {
    'pine_branch': dict(model='pine_sapling_medium', variant='c', foliage=('twig',), x=(0.12, 1.95), band=1.25, depth=1.1, res=(1024, 768), rotate=True),
    'fir_branch': dict(model='fir_sapling_medium', variant='c', foliage=('twigs',), x=(0.12, 2.1), band=1.2, depth=1.1, res=(1024, 768), rotate=True),
    'broadleaf_cluster': dict(model='tree_small_02', variant=None, foliage=('leaves',), x=(0.3, 1.65), band=1.3, depth=1.2, res=(1024, 1024), rotate=True),
    'pine_crown': dict(model='pine_sapling_medium', variant='c', foliage=('twig', 'bark'), whole=True, res=(768, 1024)),
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


def verts_of(ob):
    n = len(ob.data.vertices)
    co = np.empty(n * 3, dtype=np.float32); ob.data.vertices.foreach_get('co', co)
    co = co.reshape(n, 3)
    mw = np.array(ob.matrix_world)
    return co @ mw[:3, :3].T + mw[:3, 3]


def bake(name, spec):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    src = os.path.join(M.OUT, spec['model'], spec['model'] + '.gltf')
    bpy.ops.import_scene.gltf(filepath=src)
    objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    v = spec.get('variant')
    if v:
        for o in objs:
            if f'_{v}_' not in o.name and not o.name.endswith(f'_{v}'):
                bpy.data.objects.remove(o, do_unlink=True)
        objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    # only the foliage (and what the card lists) stays
    keep = []
    for o in objs:
        mats = [m.name for m in o.data.materials if m]
        if any(any(f in mn for f in spec['foliage']) for mn in mats):
            keep.append(o)
        else:
            bpy.data.objects.remove(o, do_unlink=True)
    for m in bpy.data.materials:
        unlit(m)
    pts = np.concatenate([verts_of(o) for o in keep])
    lo, hi = pts.min(axis=0), pts.max(axis=0)
    if spec.get('whole'):
        x0, x1 = lo[0], hi[0]; z0, z1 = lo[2], hi[2]; y0, y1 = lo[1], hi[1]
    else:
        # the densest horizontal band of the crown (by 0.2 m bins, away from the top and the bottom) is the card's band
        z = pts[:, 2]
        hist, edges = np.histogram(z, bins=int((hi[2] - lo[2]) / 0.2) + 1, range=(lo[2], hi[2]))
        n = len(hist); lo_i, hi_i = int(n * 0.3), max(int(n * 0.3) + 1, int(n * 0.75))
        k = lo_i + int(np.argmax(hist[lo_i:hi_i]))
        zc = (edges[k] + edges[k + 1]) / 2
        z0, z1 = zc - spec['band'] / 2, zc + spec['band'] / 2
        # the scan's variants sit side by side in the file: the slab is relative to this crown's centre (the trunk)
        cx, cy = float(np.median(pts[:, 0])), float(np.median(pts[:, 1]))
        x0, x1 = cx + spec['x'][0], cx + spec['x'][1]; y0, y1 = cy - spec['depth'] / 2, cy + spec['depth'] / 2
    w, h = x1 - x0, z1 - z0
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 48; sc.cycles.device = 'CPU'; sc.cycles.use_denoising = False
    sc.render.film_transparent = True
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    sc.render.resolution_x, sc.render.resolution_y = spec['res']
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'; sc.render.image_settings.color_depth = '8'
    world = bpy.data.worlds.new('w'); sc.world = world; world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[1].default_value = 0.0
    cam_d = bpy.data.cameras.new('c'); cam_d.type = 'ORTHO'
    aspect = spec['res'][0] / spec['res'][1]
    cam_d.ortho_scale = max(w, h * aspect)
    cam = bpy.data.objects.new('c', cam_d); sc.collection.objects.link(cam); sc.camera = cam
    dist = 50.0
    cam.location = ((x0 + x1) / 2, y0 - dist, (z0 + z1) / 2)
    cam.rotation_euler = (np.pi / 2, 0, 0)   # looking along +y
    cam_d.clip_start = dist - 0.01; cam_d.clip_end = dist + (y1 - y0) + 0.01
    os.makedirs(OUT, exist_ok=True)
    out = os.path.join(OUT, f'card_{name}.png')
    sc.render.filepath = out
    t = time.time()
    bpy.ops.render.render(write_still=True)
    if spec.get('rotate'):
        # the branch grows left to right in the frame; the leaf cards want the root at the bottom (v = 0), tip at the top
        img = bpy.data.images.load(out); w_px, h_px = img.size
        px = np.array(img.pixels[:], dtype=np.float32).reshape(h_px, w_px, 4)
        rot = np.ascontiguousarray(np.rot90(px, k=1))   # counter-clockwise: +x becomes +y
        res = bpy.data.images.new('rot', rot.shape[1], rot.shape[0], alpha=True)
        res.pixels = rot.ravel().tolist(); res.filepath_raw = out; res.file_format = 'PNG'; res.save()
        fw_rot = True
    # the card's extent in metres as framed (the ortho frame may be wider than the slab on one axis)
    fw = cam_d.ortho_scale; fh = fw / aspect
    if spec.get('rotate'):
        fw, fh = fh, fw   # after the rotation the card's width is the branch's thickness, its height the branch's length
    side = {'name': name, 'model': spec['model'], 'width_m': round(float(fw), 3), 'height_m': round(float(fh), 3),
            'root': 'bottom' if spec.get('rotate') else ('centre' if spec.get('whole') else 'left'), 'licence': 'CC0 (Poly Haven scan, rendered)'}
    with open(os.path.join(OUT, f'card_{name}.json'), 'w') as f:
        json.dump(side, f, indent=1)
    sys.path.insert(0, os.path.join(HERE, '..'))
    import assets as A
    with open(out + '.meta', 'w') as f:
        f.write(A.meta(f'{REL}/card_{name}.png', 'd'))
    with open(os.path.join(OUT, f'card_{name}.json.meta'), 'w') as f:
        f.write(f'fileFormatVersion: 2\nguid: {M.guid_for(f"{REL}/card_{name}.json")}\nTextScriptImporter:\n  externalObjects: {{}}\n  userData: \n  assetBundleName: \n  assetBundleVariant: \n')
    print(f'{name:20s} {fw:.2f} x {fh:.2f} m  band z {z0:.2f}..{z1:.2f}  {time.time() - t:4.0f}s  -> {out}')


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
