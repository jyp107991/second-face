"""Card trees (BUILD_PLAN §6.L): Blender's Sapling Tree Gen grows the trunk and the branches; the foliage is branch
cards rendered from the Poly Haven scans by cards.py (Kits/Trees/tex/card_<name>.png). A tree of a few thousand
triangles that reads as a scanned tree at the iso camera's distance, where the scan itself is millions.

    blender -b --python tools/unity/kits/trees.py -- [--only pine,fir] [--preview <dir>]

Writes unity/Assets/SecondFace/Kits/Trees/<species>_<seed>.fbx with three meshes, <name>_LOD0 (the tree), _LOD1 (the
trunk and every other card) and _LOD2 (a crossed pair of quads showing the tree's own unlit render,
tex/card_<species>_<seed>_crown.png): Unity builds the LODGroup from the _LODn names. Also trees.json, the manifest the
model library merges with the nature models (same schema). --preview renders each LOD0 lit and textured to <dir> for a
quick look before the engine captures, which are the real judgement (§6.N).
"""
import ast, bmesh, json, math, os, sys

import addon_utils
import bpy
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..'))
import kitlib as K  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OUT = os.path.join(ROOT, 'unity', 'Assets', 'SecondFace', 'Kits', 'Trees')
REL = 'Assets/SecondFace/Kits/Trees'
LIB = os.path.join(ROOT, 'unity', 'Assets', 'External', 'Textures')
SAPLING = 'bl_ext.user_default.sapling_tree_gen'
BUDGET = 3000          # triangles per tree at LOD0
BARK_TILE_M = 2.0      # the library tiles bark at 2 m (assets.py)
CROWN_PX = 1024        # the impostor's long side

# Species → Sapling preset, overrides, the branch card and the bark. The overrides keep two levels (trunk and branches)
# and let the cards be the twigs; bark resolution is spent on the trunk (resU 1: the branches are hidden by the cards).
# Heights are kept to about 9-13 m: taller pines filled the iso camera's view with canopy (captured 2026-10-28).
CONIFER = dict(levels=2, bevelRes=1, resU=1, curveRes=(10, 3, 3, 2), leafDist='6', leafShape='rect', leafDownAngle=25,
               leafRotate=137.5, horzLeaves=False, showLeaves=True)
SPECIES = {
    'pine': dict(preset='douglas_fir', card='pine_branch', bark='bark_pine', note='conifer of the Teeth',
                 over=dict(CONIFER, branches=(0, 40, 0, 0), scale=10, scaleV=2, leaves=18)),
    'fir': dict(preset='douglas_fir', card='fir_branch', bark='bark_pine', note='dense fir of the high ground and the Wet',
                over=dict(CONIFER, branches=(0, 48, 0, 0), scale=8, scaleV=1.5, leaves=22, baseSize=0.18, shape='0')),
    'broadleaf': dict(preset='small_maple', card='broadleaf_cluster', bark='bark_brown', note='sheltered broadleaf',
                      # the maple's forks (segSplits) are its character but cost bark: 0.25/0.15 keeps a few under budget
                      over=dict(levels=2, branches=(0, 22, 0, 0), segSplits=(0, 0.25, 0.15, 0), scale=6, scaleV=1.5, bevelRes=1,
                                resU=1, curveRes=(8, 4, 3, 1), leaves=12, leafDist='6', leafShape='rect', leafDownAngle=35,
                                leafRotate=137.5, horzLeaves=False, showLeaves=True)),
}
SEEDS = (1, 2, 3)


def preset(name):
    path = os.path.join(bpy.utils.user_resource('EXTENSIONS'), 'user_default', 'sapling_tree_gen', 'presets', name + '.py')
    src = open(path).read()
    return ast.literal_eval('\n'.join(l for l in src.splitlines() if not l.lstrip().startswith('#')))


def card(name):
    with open(os.path.join(OUT, 'tex', f'card_{name}.json')) as f:
        return json.load(f)


def islands(bm):
    """Connected parts of a mesh (Sapling's splines are separate tubes): a list of face lists."""
    parent = {v.index: v.index for v in bm.verts}

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]; i = parent[i]
        return i
    for e in bm.edges:
        a, b = find(e.verts[0].index), find(e.verts[1].index)
        if a != b: parent[a] = b
    groups = {}
    for f in bm.faces:
        groups.setdefault(find(f.verts[0].index), []).append(f)
    return list(groups.values())


def bark_uvs(ob):
    """Sapling's generated UVs run 0..1 around and 0..1 along every branch. Rescale per branch so v is metres along it
    and one wrap around is a whole number of bark tiles (no seam), then UV units are metres as the library expects."""
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bm.verts.index_update()
    uv = bm.loops.layers.uv.active
    for faces in islands(bm):
        su, sv = [], []
        for f in faces:
            for l in f.loops:
                a, b = l, l.link_loop_next
                d = (a.vert.co - b.vert.co).length
                du, dv = abs(a[uv].uv.x - b[uv].uv.x), abs(a[uv].uv.y - b[uv].uv.y)
                if dv < 1e-6 and du > 1e-6: su.append(d / du)
                elif du < 1e-6 and dv > 1e-6: sv.append(d / dv)
        if not su or not sv: continue
        around = float(np.median(su))            # metres per unit u: the circumference
        along = float(np.median(sv))             # metres per unit v: the branch length
        wraps = max(1, round(around / BARK_TILE_M))
        for f in faces:
            for l in f.loops:
                l[uv].uv = (l[uv].uv.x * wraps * BARK_TILE_M, l[uv].uv.y * along)
    bm.to_mesh(ob.data); bm.free()


def trunk_only(ob):
    """LOD1's wood: the largest connected part (the trunk); the branches are hidden by the cards at that distance."""
    bm = bmesh.new(); bm.from_mesh(ob.data); bm.verts.index_update()
    parts = islands(bm)
    keep = set(max(parts, key=len))
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f not in keep], context='FACES')
    bm.to_mesh(ob.data); bm.free()


def every_other_card(ob):
    """LOD1's foliage: every other card (each Sapling leaf is one quad)."""
    bm = bmesh.new(); bm.from_mesh(ob.data); bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index % 2], context='FACES')
    bm.to_mesh(ob.data); bm.free()


def card_uvs_and_normals(leaves, centre_axis):
    """The cards: Sapling's rect leaf maps u 0.125..0.875, so u is stretched to the card's full width; v runs from the
    stem (0) to the tip (1), as the cards were rendered root-down. Normals are bent outwards from the trunk and a little
    up, so the crown has a sunlit and a shaded side instead of shading as a heap of flat sheets."""
    me = leaves.data
    uv = me.uv_layers[0]
    us = np.array([d.uv.x for d in uv.data]); lo, hi = us.min(), us.max()
    for d in uv.data:
        d.uv.x = (d.uv.x - lo) / max(1e-6, hi - lo)
    normals = []
    for loop in me.loops:
        co = me.vertices[loop.vertex_index].co
        out = Vector((co.x - centre_axis.x, co.y - centre_axis.y, 0.0))
        out = out.normalized() if out.length > 1e-4 else Vector((0, 0, 1))
        normals.append((out + Vector((0, 0, 0.35))).normalized())   # mostly outwards: a sunlit side and a shaded side
    me.normals_split_custom_set(normals)


def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = ob.data.name = name
    return ob


def duplicate(ob):
    c = ob.copy(); c.data = ob.data.copy(); bpy.context.scene.collection.objects.link(c)
    return c


def tris(ob):
    ob.data.calc_loop_triangles()
    return len(ob.data.loop_triangles)


def textured(mat_name, image_path, emit, tile=None):
    """A Blender material showing a texture, emitting it unlit (impostor renders) or lit (previews)."""
    m = bpy.data.materials.new(mat_name + ('_emit' if emit else '_lit')); m.use_nodes = True
    nt = m.node_tree; bsdf = nt.nodes['Principled BSDF']; out = nt.nodes['Material Output']
    img = nt.nodes.new('ShaderNodeTexImage'); img.image = bpy.data.images.load(image_path, check_existing=True)
    if tile:
        mp = nt.nodes.new('ShaderNodeMapping'); tc = nt.nodes.new('ShaderNodeTexCoord')
        mp.inputs['Scale'].default_value = (1 / tile, 1 / tile, 1)
        nt.links.new(tc.outputs['UV'], mp.inputs['Vector']); nt.links.new(mp.outputs[0], img.inputs['Vector'])
    alpha = None if tile else img.outputs['Alpha']
    if emit:
        em = nt.nodes.new('ShaderNodeEmission'); nt.links.new(img.outputs['Color'], em.inputs['Color'])
        if alpha is not None:
            tr = nt.nodes.new('ShaderNodeBsdfTransparent'); mix = nt.nodes.new('ShaderNodeMixShader')
            nt.links.new(alpha, mix.inputs['Fac']); nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(em.outputs[0], mix.inputs[2])
            nt.links.new(mix.outputs[0], out.inputs['Surface'])
        else:
            nt.links.new(em.outputs[0], out.inputs['Surface'])
    else:
        nt.links.new(img.outputs['Color'], bsdf.inputs['Base Color']); bsdf.inputs['Roughness'].default_value = 0.85
        if alpha is not None: nt.links.new(alpha, bsdf.inputs['Alpha'])
    return m


def show_textures(ob, species, emit):
    """Swaps the slot-only materials of a copy of the tree for textured ones (the exported tree keeps the slots)."""
    spec = SPECIES[species]
    mats = []
    for m in ob.data.materials:
        if m.name.startswith('mat_card'):
            mats.append(textured(m.name, os.path.join(OUT, 'tex', f'card_{spec["card"]}.png'), emit))
        else:
            mats.append(textured(m.name, os.path.join(LIB, spec['bark'], spec['bark'] + '_d.jpg'), emit, tile=BARK_TILE_M))
    for i, m in enumerate(mats): ob.data.materials[i] = m


def render_scene(name):
    sc = bpy.data.scenes.new(name)
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 32; sc.cycles.device = 'CPU'; sc.cycles.use_denoising = False
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'; sc.render.image_settings.color_depth = '8'
    return sc


def impostor(lod0, species, seed):
    """Renders the tree unlit from the side into its crown card and returns the LOD2 mesh: two crossed quads on the
    trunk, as wide as the crown's widest reach either side, as tall as the tree, showing that render."""
    name = f'{species}_{seed}_crown'
    xs = [v.co.x for v in lod0.data.vertices]; ys = [v.co.y for v in lod0.data.vertices]; zs = [v.co.z for v in lod0.data.vertices]
    half = max(abs(min(xs)), max(xs), abs(min(ys)), max(ys)); top = max(zs); bottom = min(0.0, min(zs))
    w, h = 2 * half, top - bottom
    sc = render_scene('imp'); sc.render.film_transparent = True
    sc.world = bpy.data.worlds.new('w0'); sc.world.use_nodes = True; sc.world.node_tree.nodes['Background'].inputs[1].default_value = 0
    copy = lod0.copy(); copy.data = lod0.data.copy(); sc.collection.objects.link(copy)
    show_textures(copy, species, emit=True)
    if h >= w: sc.render.resolution_x, sc.render.resolution_y = max(64, int(CROWN_PX * w / h)), CROWN_PX
    else: sc.render.resolution_x, sc.render.resolution_y = CROWN_PX, max(64, int(CROWN_PX * h / w))
    cam = bpy.data.objects.new('impcam', bpy.data.cameras.new('impcam')); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = max(w, h)
    cam.location = (0, -50, (top + bottom) / 2); cam.rotation_euler = (math.pi / 2, 0, 0)
    cam.data.clip_start = 50 - half - 0.1; cam.data.clip_end = 50 + half + 0.1
    path = os.path.join(OUT, 'tex', f'card_{name}.png')
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True, scene=sc.name)
    dilate(path)
    import assets as A
    if not os.path.exists(path + '.meta'):
        with open(path + '.meta', 'w') as f: f.write(A.meta(f'{REL}/tex/card_{name}.png', 'd'))
    bpy.data.objects.remove(copy, do_unlink=True); bpy.data.scenes.remove(sc)
    # the cross: two quads through the trunk, normals mostly up so both faces of each quad light alike
    bm = bmesh.new(); uv = bm.loops.layers.uv.new('UVMap')
    for ax in ((1, 0), (0, 1)):
        vs = [bm.verts.new((ax[0] * x, ax[1] * x, z)) for x, z in ((-half, bottom), (half, bottom), (half, top), (-half, top))]
        f = bm.faces.new(vs)
        for l, (u, v) in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))): l[uv].uv = (u, v)
    me = bpy.data.meshes.new(f'{species}_{seed}_LOD2'); bm.to_mesh(me); bm.free()
    me.materials.append(K.mat('card:' + name))
    me.normals_split_custom_set([(0.0, 0.0, 1.0)] * len(me.loops))
    ob = bpy.data.objects.new(me.name, me); bpy.context.scene.collection.objects.link(ob)
    return ob


def dilate(path, steps=32):
    """Spreads the colour of the opaque texels into the transparent ones, so mipmaps fade to foliage, not to black."""
    img = bpy.data.images.load(path, check_existing=False); w, h = img.size
    a = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
    filled = a[..., 3] > 0.5
    rgb = a[..., :3] * filled[..., None]
    for _ in range(steps):
        acc = np.zeros_like(rgb); cnt = np.zeros(filled.shape, dtype=np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            acc += np.roll(rgb, (dy, dx), axis=(0, 1)); cnt += np.roll(filled, (dy, dx), axis=(0, 1))
        grow = (~filled) & (cnt > 0)
        if not grow.any(): break
        rgb[grow] = acc[grow] / cnt[grow][:, None]; filled = filled | grow
    a[..., :3] = np.where((a[..., 3] > 0.5)[..., None], a[..., :3], rgb)
    img.pixels = a.ravel().tolist(); img.filepath_raw = path; img.file_format = 'PNG'; img.save()
    bpy.data.images.remove(img)


def grow(species, seed):
    """The tree's three LOD objects, materials as slot names only."""
    spec = SPECIES[species]
    K.reset(); K._mats.clear()
    addon_utils.enable(SAPLING, default_set=True)
    params = preset(spec['preset'])
    allowed = {p.identifier for p in bpy.ops.curve.tree_add.get_rna_type().properties}
    params = {k: v for k, v in params.items() if k in allowed}
    c = card(spec['card'])
    params.update(spec['over'])
    params.update(seed=seed, leafScale=c['height_m'], leafScaleX=c['width_m'] / c['height_m'])
    bpy.ops.curve.tree_add(**params)
    tree, leaves = bpy.data.objects['tree'], bpy.data.objects['leaves']
    bpy.ops.object.select_all(action='DESELECT'); tree.select_set(True); bpy.context.view_layer.objects.active = tree
    bpy.ops.object.convert(target='MESH')
    tree = bpy.context.view_layer.objects.active
    leaves.parent = None
    bark_uvs(tree)
    card_uvs_and_normals(leaves, Vector((0, 0, 0)))
    for ob in (tree, leaves):
        ob.data.uv_layers[0].name = 'UVMap'
        ob.data.materials.clear()
    tree.data.materials.append(K.mat(spec['bark']))
    leaves.data.materials.append(K.mat('card:' + spec['card']))
    for p in tree.data.polygons: p.use_smooth = True
    trunk, half = duplicate(tree), duplicate(leaves)
    trunk_only(trunk); every_other_card(half)
    lod0 = join([tree, leaves], f'{species}_{seed}_LOD0')
    lod1 = join([trunk, half], f'{species}_{seed}_LOD1')
    lod2 = impostor(lod0, species, seed)
    for o in list(bpy.context.scene.objects):
        if o not in (lod0, lod1, lod2): bpy.data.objects.remove(o, do_unlink=True)
    return lod0, lod1, lod2


def preview(ob, species, path):
    """A textured, sunlit Cycles render of LOD0 from the iso camera's elevation and from the side."""
    sc = render_scene('prev')
    sc.render.resolution_x, sc.render.resolution_y = 1200, 800
    world = bpy.data.worlds.new('w'); sc.world = world; world.use_nodes = True
    bg = world.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.55, 0.66, 0.9, 1); bg.inputs[1].default_value = 0.6
    copy = ob.copy(); copy.data = ob.data.copy(); sc.collection.objects.link(copy)
    show_textures(copy, species, emit=False)
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
    sun.data.energy = 4.0; sun.rotation_euler = (math.radians(52), 0, math.radians(60))
    ground = bpy.data.meshes.new('g'); bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=30); bm.to_mesh(ground); bm.free()
    g = bpy.data.objects.new('g', ground); sc.collection.objects.link(g)
    gm = bpy.data.materials.new('gm'); gm.use_nodes = True; gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.32, 0.27, 0.2, 1)
    ground.materials.append(gm)
    h = ob.dimensions.z
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.lens = 50
    for tag, elev, dist in (('iso', 40, 2.6), ('side', 6, 2.0)):
        d = h * dist; e = math.radians(elev); az = math.radians(-35)
        cam.location = (d * math.cos(e) * math.sin(az), -d * math.cos(e) * math.cos(az), h * 0.45 + d * math.sin(e))
        cam.rotation_euler = (Vector((0, 0, h * 0.45)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = f'{path}_{tag}.png'
        bpy.ops.render.render(write_still=True, scene=sc.name)
    bpy.data.scenes.remove(sc)


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    only, prev = None, None
    for i, a in enumerate(argv):
        if a == '--only': only = set(argv[i + 1].split(','))
        if a == '--preview': prev = argv[i + 1]
    os.makedirs(OUT, exist_ok=True)
    if not os.path.exists(OUT + '.meta'): K.write_folder_meta(OUT, REL)   # cards.py made the folder first
    manifest_path = os.path.join(OUT, 'trees.json')
    manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {}
    for species, spec in SPECIES.items():
        if only and species not in only: continue
        variants = []
        for seed in SEEDS:
            lod0, lod1, lod2 = grow(species, seed)
            name = f'{species}_{seed}'
            for old in (f'{name}_lod0.fbx', f'{name}_lod0.fbx.meta'):   # the single-LOD files of the first pine pass
                if os.path.exists(os.path.join(OUT, old)): os.remove(os.path.join(OUT, old))
            path = os.path.join(OUT, name + '.fbx')
            K.export_fbx(path); K.write_model_meta(path, f'{REL}/{name}.fbx', readable=False)
            dims = lod0.dimensions
            t = [tris(o) for o in (lod0, lod1, lod2)]
            variants.append({'path': f'{REL}/{name}.fbx', 'size': [round(dims.x, 2), round(dims.z, 2), round(dims.y, 2)], 'tris': t[0], 'lod_tris': t})
            flag = '' if t[0] <= BUDGET else f'  OVER BUDGET ({BUDGET})'
            print(f'tree {name:14s} LOD0 {t[0]:5d}  LOD1 {t[1]:5d}  LOD2 {t[2]:2d} tris  {dims.x:.1f} x {dims.z:.1f} m{flag}')
            if prev:
                os.makedirs(prev, exist_ok=True)
                preview(lod0, species, os.path.join(prev, name))
        big = max(variants, key=lambda v: v['tris'])
        manifest[species] = {'id': species, 'use': 'tree', 'note': spec['note'], 'licence': 'ours (Sapling) + CC0 cards',
                             'path': variants[0]['path'], 'place': 'scatter', 'size': variants[0]['size'], 'tris': big['tris'],
                             'variants': variants}
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=1, sort_keys=True)
    with open(manifest_path + '.meta', 'w') as f:
        f.write(f'fileFormatVersion: 2\nguid: {K.guid_for(REL + "/trees.json")}\nTextScriptImporter:\n  externalObjects: {{}}\n  userData: \n  assetBundleName: \n  assetBundleVariant: \n')


if __name__ == '__main__':
    main()
