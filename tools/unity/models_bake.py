#!/usr/bin/env python3
"""Bakes the fetched CC0 models (tools/unity/models.py → unity/Assets/External/Models) down to phone budgets and writes
the result to unity/Assets/SecondFace/Models/Nature/<key>.glb (committed): decimated to the triangle budget below,
textures at 1K as JPEG inside the .glb. The source models are photoscan-grade (a Poly Haven pine is 17M triangles);
the phone draws thousands of these through the GPU Resident Drawer, so the budget is per instance, LODs come in P3.

Runs under Blender's Python (4.5):

    blender -b --python tools/unity/models_bake.py -- [--only a,b] [--force]
"""
import json, os, sys, time

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import models as M  # noqa: E402  (the library and the meta helpers)

OUT = os.path.join(M.ROOT, 'unity', 'Assets', 'SecondFace', 'Models', 'Nature')
TEX = 1024

# Triangle budget per model (None = not baked: needle-geometry trees are rebuilt as card trees, see docs/PORT.md).
BUDGET = {
    'quiver_tree_01': 9000, 'quiver_tree_02': 9000, 'dead_quiver_trunk': 4000, 'dead_tree_trunk': 4500, 'dead_tree_trunk_02': 4500,
    'tree_small_02': 24000,
    'shrub_01': 7000, 'shrub_02': 6000, 'shrub_03': 5000, 'shrub_04': 6000, 'wild_rooibos_bush': 6000,
    'dry_branches_medium_01': 4000, 'grass_medium_01': 3000, 'grass_medium_02': 2500,
    'namaqualand_boulder_02': 2500, 'namaqualand_boulder_03': 2500, 'namaqualand_boulders_01': 4000,
    'namaqualand_rocks_01': 4000, 'namaqualand_stones_01': 3000, 'rock_07': 2000, 'rock_09': 2000, 'boulder_01': 2500,
    'pine_tree_01': None, 'fir_tree_01': None, 'pine_sapling_medium': None, 'fir_sapling_medium': None,
    'tree_stump_01': 3000, 'fern_02': 3000, 'root_cluster_01': 5000,
    'coast_rocks_01': 6000, 'coast_land_rocks_02': 7000,
}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def tri_count(ob):
    ob.data.calc_loop_triangles()
    return len(ob.data.loop_triangles)


def bake(key, src, out, budget):
    reset()
    bpy.ops.import_scene.gltf(filepath=src, merge_vertices=True)  # scans arrive unwelded; collapse needs shared vertices
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    before = sum(tri_count(o) for o in meshes)
    after = before
    # Collapse decimation stops short on scans with many shells or seams; pass again until the budget is met.
    for _ in range(4):
        if after <= budget * 1.1:
            break
        ratio = budget / after
        for o in meshes:
            bpy.context.view_layer.objects.active = o
            m = o.modifiers.new('bake', 'DECIMATE')
            m.decimate_type = 'COLLAPSE'; m.ratio = ratio; m.use_collapse_triangulate = True
            bpy.ops.object.modifier_apply(modifier=m.name)
        now = sum(tri_count(o) for o in meshes)
        if now >= after * 0.98:
            # stuck: the scan has near-coincident seams; weld within a millimetre and try once more
            for o in meshes:
                bpy.context.view_layer.objects.active = o; o.select_set(True)
                bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
                bpy.ops.mesh.remove_doubles(threshold=0.001); bpy.ops.object.mode_set(mode='OBJECT')
                o.select_set(False)
            welded = sum(tri_count(o) for o in meshes)
            if welded >= now * 0.999 and now >= after * 0.98:
                break
        after = now
    for img in bpy.data.images:
        if img.size[0] == 0:
            continue
        w, h = img.size
        if max(w, h) > TEX:
            s = TEX / max(w, h)
            img.scale(max(1, round(w * s)), max(1, round(h * s)))
        img.pack()
    kw = dict(filepath=out, export_format='GLB', export_image_format='JPEG', export_apply=True, export_yup=True,
              export_animations=False, export_skins=False, export_morph=False, export_lights=False, export_cameras=False)
    try:
        bpy.ops.export_scene.gltf(**kw, export_jpeg_quality=86)
    except TypeError:
        bpy.ops.export_scene.gltf(**kw)
    lo = [1e9] * 3; hi = [-1e9] * 3
    for o in meshes:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            for i in range(3): lo[i] = min(lo[i], w[i]); hi[i] = max(hi[i], w[i])
    size = [round(hi[0] - lo[0], 2), round(hi[2] - lo[2], 2), round(hi[1] - lo[1], 2)]  # x, up, depth (as glTF y-up)
    return before, after, size


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    only = None; force = False
    for i, a in enumerate(argv):
        if a == '--only': only = set(argv[i + 1].split(','))
        if a == '--force': force = True
    os.makedirs(OUT, exist_ok=True)
    M.write_meta(os.path.join(M.ROOT, 'unity', 'Assets', 'SecondFace', 'Models'), M.folder_meta('Assets/SecondFace/Models'))
    M.write_meta(OUT, M.folder_meta('Assets/SecondFace/Models/Nature'))
    manifest_path = os.path.join(OUT, 'models.json')
    manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {}
    for key, (phid, use, note) in M.LIBRARY.items():
        if only and key not in only:
            continue
        budget = BUDGET.get(key)
        if budget is None:
            print(f'{key:26s} skipped (card tree, see docs/PORT.md)'); manifest.pop(key, None); continue
        src = os.path.join(M.OUT, key, key + '.gltf')
        if not os.path.exists(src):
            src = os.path.join(M.OUT, key, key + '.glb')
        if not os.path.exists(src):
            print(f'{key:26s} not fetched'); continue
        out = os.path.join(OUT, key + '.glb')
        rel = f'Assets/SecondFace/Models/Nature/{key}.glb'
        if os.path.exists(out) and not force and key in manifest:
            print(f'{key:26s} kept'); continue
        t = time.time()
        try:
            before, after, size = bake(key, src, out, budget)
        except Exception as e:
            print(f'{key:26s} failed: {e}'); continue
        with open(out + '.meta', 'w') as f:  # minimal meta: Unity picks the glTFast importer and keeps the guid
            f.write(f'fileFormatVersion: 2\nguid: {M.guid_for(rel)}\n')
        foot = max(size[0], size[2])
        # a scan wider than 6 m is a ground patch (a rock bed, a stone field) placed deliberately, not a scatter prop
        manifest[key] = {'id': phid, 'use': use, 'note': note, 'path': rel, 'tris_src': before, 'tris': after, 'size': size,
                         'place': 'patch' if foot > 6.0 else 'scatter', 'licence': 'CC0 (Poly Haven)'}
        print(f'{key:26s} {before:>10,} -> {after:>7,} tris  {os.path.getsize(out) / 2**20:5.1f} MB  {time.time() - t:4.0f}s')
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=1, sort_keys=True)
    M.write_meta(manifest_path, f'fileFormatVersion: 2\nguid: {M.guid_for("Assets/SecondFace/Models/Nature/models.json")}\nTextScriptImporter:\n  externalObjects: {{}}\n  userData: \n  assetBundleName: \n  assetBundleVariant: \n')
    print(f'{len(manifest)} baked models in {OUT}')


if __name__ == '__main__':
    main()
