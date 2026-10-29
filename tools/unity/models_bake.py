#!/usr/bin/env python3
"""Bakes the fetched CC0 models (tools/unity/models.py → .scans/models) down to phone budgets and writes the result to
unity/Assets/SecondFace/Models/Nature (committed): decimated to the triangle budget below, split into one model per
variant (a scan file often holds several plants or rocks side by side), each re-centred on its own base and written as
<key>.fbx or <key>_v<n>.fbx with material slots mat_nature:<key>_<m>; textures beside them in tex/ (base colour 1K,
JPEG when opaque and PNG when it carries alpha; normal map 512 PNG), bound in Unity by MaterialLibrary like the kits'.
FBX, not glTF: glTFast draws with its own shaders, which ignore our materials and would have to ship (BUILD_PLAN §6.Q).
The source models are photoscan-grade (a Poly Haven pine is 17M triangles); the phone draws thousands of these
through the GPU Resident Drawer, so the budget is per instance, LODs come in P3.

Runs under Blender's Python (4.5):

    blender -b --python tools/unity/models_bake.py -- [--only a,b] [--force]
"""
import json, os, sys, time

import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, 'kits'))
import models as M  # noqa: E402  (the library and the meta helpers)
import assets as A  # noqa: E402  (texture metas)
import kitlib as K  # noqa: E402  (model metas)

OUT = os.path.join(M.ROOT, 'unity', 'Assets', 'SecondFace', 'Models', 'Nature')
REL = 'Assets/SecondFace/Models/Nature'
TEX = 1024
NORMAL_TEX = 512
PATCH = 6.0         # a scan wider than this is a ground patch (a rock bed, a stone field): never split, placed deliberately

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
    """Imports a scan and decimates it to the budget; returns (triangles before, after, mesh objects)."""
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
    return before, after, meshes


def image_into(sock):
    """The image node feeding a socket, through normal-map and separate/mix nodes."""
    if sock is None or not sock.is_linked: return None
    n = sock.links[0].from_node
    for _ in range(6):
        if n.type == 'TEX_IMAGE': return n.image
        linked = [i for i in n.inputs if i.is_linked]
        if not linked: return None
        n = linked[0].links[0].from_node
    return None


def save_texture(img, path, size, alpha):
    """A resized copy of `img` at `path` (JPEG when no alpha is needed, else PNG)."""
    import numpy as np
    w, h = img.size
    px = np.empty(w * h * 4, np.float32); img.pixels.foreach_get(px)
    cp = bpy.data.images.new('cp', w, h, alpha=alpha)
    cp.colorspace_settings.name = img.colorspace_settings.name
    cp.pixels.foreach_set(px)
    if max(w, h) > size:
        f = size / max(w, h); cp.scale(max(1, round(w * f)), max(1, round(h * f)))
    cp.filepath_raw = path; cp.file_format = 'PNG' if path.endswith('.png') else 'JPEG'
    if not alpha: cp.alpha_mode = 'NONE'
    cp.save(); bpy.data.images.remove(cp)


# Models whose base colour is replaced by Poly Haven's dried-out variant (the Sallow's grass is straw, not lawn).
DRY = {'grass_medium_01'}


def side_map(key, name):
    """A map models.py fetched beside the glTF (textures/<key>_<name>_2k.png|jpg), loaded into Blender, or None."""
    for ext in ('png', 'jpg'):
        p = os.path.join(M.OUT, key, 'textures', f'{key}_{name}_2k.{ext}')
        if os.path.exists(p):
            return bpy.data.images.load(p, check_existing=True)
    return None


def with_alpha(base, alpha, dry=None):
    """A copy of `base` whose alpha is `alpha`'s first channel (and whose colour is `dry`'s, when given)."""
    import numpy as np
    w, h = base.size
    px = np.empty(w * h * 4, np.float32); base.pixels.foreach_get(px)
    if dry is not None and tuple(dry.size) == (w, h):
        dp = np.empty(w * h * 4, np.float32); dry.pixels.foreach_get(dp); px[0::4] = dp[0::4]; px[1::4] = dp[1::4]; px[2::4] = dp[2::4]
    a = alpha
    if tuple(a.size) != (w, h):
        a = alpha.copy(); a.scale(w, h)
    ap = np.empty(w * h * 4, np.float32); a.pixels.foreach_get(ap)
    px[3::4] = ap[0::4]
    out = bpy.data.images.new(base.name + '_cut', w, h, alpha=True)
    out.colorspace_settings.name = base.colorspace_settings.name
    out.pixels.foreach_set(px)
    return out


def export_materials(key, meshes):
    """Renames every material to its slot (mat_nature:<key>_<m>) and writes its textures to tex/."""
    os.makedirs(os.path.join(OUT, 'tex'), exist_ok=True)
    K.write_folder_meta(os.path.join(OUT, 'tex'), REL + '/tex')
    mats = []
    for o in meshes:
        for m in o.data.materials:
            if m is not None and m not in mats: mats.append(m)
    for i, m in enumerate(mats):
        stem = f'{key}_{i}'
        bsdf = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None) if m.use_nodes else None
        base = image_into(bsdf.inputs['Base Color']) if bsdf else None
        nrm = image_into(bsdf.inputs['Normal']) if bsdf else None
        # cut-out only where the base colour really has transparent texels: scans flag solid leaves (a quiver tree's
        # succulent ones) as blended too, and a JPEG has no alpha to cut with
        cut = False
        mask = side_map(key, 'alpha') if bsdf and bsdf.inputs['Alpha'].is_linked else None
        if mask is not None and base is not None and base.size[0]:
            # the scan's alpha lives in its own map (models.py fetches it): put it in the base colour's alpha
            base = with_alpha(base, mask, side_map(key, 'dry_diff') if key in DRY else None)
            cut = True
        elif bsdf and bsdf.inputs['Alpha'].is_linked and base is not None and base.size[0] and base.channels == 4:
            import numpy as np
            px = np.empty(base.size[0] * base.size[1] * 4, np.float32); base.pixels.foreach_get(px)
            cut = bool((px[3::4] < 0.5).mean() > 0.01)
        for old in ('_d.jpg', '_d.png', '_n.png'):
            p = os.path.join(OUT, 'tex', stem + old)
            if os.path.exists(p): os.remove(p); os.path.exists(p + '.meta') and os.remove(p + '.meta')
        if base is not None and base.size[0]:
            dst = os.path.join(OUT, 'tex', stem + ('_d.png' if cut else '_d.jpg'))
            save_texture(base, dst, TEX, cut)
            with open(dst + '.meta', 'w') as f: f.write(A.meta(f'{REL}/tex/{os.path.basename(dst)}', 'd'))
        if nrm is not None and nrm.size[0]:
            dst = os.path.join(OUT, 'tex', stem + '_n.png')
            save_texture(nrm, dst, NORMAL_TEX, False)
            with open(dst + '.meta', 'w') as f: f.write(A.meta(f'{REL}/tex/{os.path.basename(dst)}', 'n'))
        m.name = 'mat_nature:' + stem
        assert len(m.name) <= 63, m.name


def split_variants(meshes):
    """One object per variant. Poly Haven ships a scan's variants as separate objects (<key>_a, _b, ... or small_a,
    tall_b ...), so several objects are several variants. A single long, thin object is a row of plants or stones
    (shrub_01: nine seedlings in one mesh): it is cut where the vertices along its length leave an empty stretch, and
    slivers under a quarter of the largest piece join their neighbour. Anything else stays whole (a rock bed, a tree).
    Distance grouping was tried and fails: neighbouring shrubs' branches come within centimetres."""
    import numpy as np
    for o in bpy.context.scene.objects: o.select_set(False)
    for o in meshes:
        o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        o.select_set(False)
    if len(meshes) > 1: return meshes
    ob = meshes[0]; me = ob.data
    co = np.empty(len(me.vertices) * 3, np.float32); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    ext = co.max(0) - co.min(0)
    axis = 0 if ext[0] >= ext[1] else 1
    if ext[axis] < 3 * max(ext[1 - axis], 1e-3): return [ob]
    t = co[:, axis]; lo = t.min()
    nb = 400; width = (t.max() - lo) / nb
    hist = np.bincount(np.minimum(((t - lo) / width).astype(int), nb - 1), minlength=nb)
    cuts, run = [], 0
    for i, c in enumerate(hist):   # the middle of every empty stretch of at least two bins
        if c == 0: run += 1
        else:
            if run >= 2: cuts.append(lo + (i - run / 2) * width)
            run = 0
    if not cuts: return [ob]
    bounds = [lo] + cuts + [float(t.max())]
    while len(bounds) > 2:   # fold the shortest piece into its shorter neighbour until none is a sliver
        lens = [bounds[i + 1] - bounds[i] for i in range(len(bounds) - 1)]
        i = min(range(len(lens)), key=lambda k: lens[k])
        if lens[i] >= 0.25 * max(lens): break
        if i == 0: del bounds[1]
        elif i == len(lens) - 1: del bounds[-2]
        elif lens[i - 1] < lens[i + 1]: del bounds[i]
        else: del bounds[i + 1]
    if len(bounds) == 2: return [ob]
    merged = [None] + bounds[1:-1] + [None]
    centre = np.array([sum(co[v][axis] for v in poly.vertices) / len(poly.vertices) for poly in me.polygons])
    seg = np.searchsorted(np.array(merged[1:-1]), centre).astype(np.int32)
    attr = me.attributes.new('variant', 'INT', 'FACE'); attr.data.foreach_set('value', seg.tolist())
    variants = []
    bpy.context.tool_settings.mesh_select_mode = (False, False, True)   # face selection survives entering edit mode
    for n in range(1, len(merged) - 1):   # peel each piece off; piece 0 stays in `ob` (faces reorder: read the attribute)
        cur = [0] * len(ob.data.polygons); ob.data.attributes['variant'].data.foreach_get('value', cur)
        if n not in cur: continue
        for v in ob.data.vertices: v.select = False
        for e in ob.data.edges: e.select = False
        for poly in ob.data.polygons:
            poly.select = cur[poly.index] == n
            if poly.select:
                for vi in poly.vertices: ob.data.vertices[vi].select = True
        for o in bpy.context.scene.objects: o.select_set(False)
        ob.select_set(True); bpy.context.view_layer.objects.active = ob
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.separate(type='SELECTED'); bpy.ops.object.mode_set(mode='OBJECT')
        variants.append(next(o for o in bpy.context.selected_objects if o != ob))
    out = [o for o in [ob] + variants if len(o.data.vertices)]
    for o in out:
        if 'variant' in o.data.attributes: o.data.attributes.remove(o.data.attributes['variant'])
    return out


def export_variant(ob, path, rel):
    """Re-centres a variant on its base (median x/y, lowest z) and writes it as FBX with a stable meta."""
    for o in bpy.context.scene.objects: o.select_set(False)
    ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.delete_loose(use_verts=True, use_edges=True, use_faces=False)   # strays a separate leaves behind
    bpy.ops.object.mode_set(mode='OBJECT')
    vs = [v.co for v in ob.data.vertices]
    xs = sorted(v.x for v in vs); ys = sorted(v.y for v in vs)
    origin = Vector((xs[len(xs) // 2], ys[len(ys) // 2], min(v.z for v in vs)))
    ob.data.transform(Matrix.Translation(-origin)); ob.location = (0, 0, 0)
    for o in bpy.context.scene.objects: o.select_set(False)
    ob.select_set(True); bpy.context.view_layer.objects.active = ob
    ob.name = os.path.splitext(os.path.basename(path))[0]
    # Y-up mesh data with an identity root (see kitlib.export_fbx: a compensating root rotation is lost to any builder)
    bpy.ops.export_scene.fbx(filepath=path, use_selection=True, apply_scale_options='FBX_SCALE_ALL', axis_forward='-Z', axis_up='Y',
                             bake_space_transform=True, mesh_smooth_type='FACE', use_mesh_modifiers=True, bake_anim=False,
                             add_leaf_bones=False, path_mode='STRIP', embed_textures=False)
    K.write_model_meta(path, rel)
    lo = [min(v.co[i] for v in ob.data.vertices) for i in range(3)]; hi = [max(v.co[i] for v in ob.data.vertices) for i in range(3)]
    return [round(hi[0] - lo[0], 2), round(hi[2] - lo[2], 2), round(hi[1] - lo[1], 2)], tri_count(ob)   # x, up, depth


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
        done = manifest.get(key, {}).get('variants')
        if done and not force and all(os.path.exists(os.path.join(M.ROOT, 'unity', v['path'])) for v in done):
            print(f'{key:26s} kept'); continue
        for f in os.listdir(OUT):   # this key's earlier outputs (.glb of the old pipeline, earlier variants)
            if f.startswith(key + '.') or (f.startswith(key + '_v') and f[len(key) + 2:len(key) + 3].isdigit()):
                os.remove(os.path.join(OUT, f))
        t = time.time()
        try:
            before, after, meshes = bake(key, src, None, budget)
            export_materials(key, meshes)
            variants = split_variants(meshes)
            out = []
            for n, ob in enumerate(variants):
                name = key if len(variants) == 1 else f'{key}_v{n + 1}'
                rel = f'{REL}/{name}.fbx'
                size, tris = export_variant(ob, os.path.join(OUT, name + '.fbx'), rel)
                out.append({'path': rel, 'size': size, 'tris': tris})
            footprint = max(max(v['size'][0], v['size'][2]) for v in out)
        except Exception as e:
            import traceback; traceback.print_exc()
            print(f'{key:26s} failed: {e}'); continue
        manifest[key] = {'id': phid, 'use': use, 'note': note, 'path': out[0]['path'], 'tris_src': before, 'tris': after,
                         'size': out[0]['size'], 'variants': out, 'place': 'patch' if footprint > PATCH else 'scatter',
                         'licence': 'CC0 (Poly Haven)'}
        print(f'{key:26s} {before:>10,} -> {after:>7,} tris, {len(out)} variant(s)  {time.time() - t:4.0f}s')
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=1, sort_keys=True)
    M.write_meta(manifest_path, f'fileFormatVersion: 2\nguid: {M.guid_for("Assets/SecondFace/Models/Nature/models.json")}\nTextScriptImporter:\n  externalObjects: {{}}\n  userData: \n  assetBundleName: \n  assetBundleVariant: \n')
    print(f'{len(manifest)} baked models in {OUT}')


if __name__ == '__main__':
    main()
