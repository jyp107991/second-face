"""Card trees (BUILD_PLAN §6.L): Blender's Sapling Tree Gen grows the trunk and the branches; the foliage is branch
cards rendered from the Poly Haven scans by cards.py (Kits/Trees/tex/card_<name>.png). A conifer of a few thousand
triangles that reads as a scanned tree at the iso camera's distance, where the scan itself is millions.

    blender -b --python tools/unity/kits/trees.py -- [--only pine] [--preview <dir>]

Writes unity/Assets/SecondFace/Kits/Trees/<species>_<seed>_lod0.fbx (+ stable metas) and trees.json, the manifest
the model library merges with the nature models (same schema). --preview renders each tree lit and textured to <dir>
for a quick look before the engine captures, which are the real judgement (§6.N).
"""
import ast, bmesh, json, math, os, sys

import addon_utils
import bpy
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import kitlib as K  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OUT = os.path.join(ROOT, 'unity', 'Assets', 'SecondFace', 'Kits', 'Trees')
REL = 'Assets/SecondFace/Kits/Trees'
SAPLING = 'bl_ext.user_default.sapling_tree_gen'
BUDGET = 3000          # triangles per tree at LOD0
BARK_TILE_M = 2.0      # the library tiles bark at 2 m (assets.py)

# Species → Sapling preset, overrides, the branch card and the bark. The overrides keep two levels (trunk and branches)
# and let the cards be the twigs; bark resolution is spent on the trunk (resU 1: the branches are hidden by the cards).
# Heights are kept to about 9-13 m: taller pines filled the iso camera's view with canopy (captured 2026-10-28).
SPECIES = {
    'pine': dict(preset='douglas_fir', card='pine_branch', bark='bark_pine', note='conifer of the Teeth',
                 over=dict(levels=2, branches=(0, 40, 0, 0), scale=10, scaleV=2, bevelRes=1, resU=1, curveRes=(10, 3, 3, 2),
                           leaves=18, leafDist='6', leafShape='rect', leafDownAngle=25, leafRotate=137.5, horzLeaves=False,
                           showLeaves=True)),
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


def card_uvs_and_normals(leaves, centre_axis):
    """The cards: Sapling's rect leaf maps u 0.125..0.875, so u is stretched to the card's full width; v runs from the
    stem (0) to the tip (1), as the cards were rendered root-down. Normals are bent outwards from the trunk and up, so
    the crown shades as a volume in the sun instead of as a heap of flat sheets."""
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


def grow(species, seed):
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
    bark_uvs(tree)
    card_uvs_and_normals(leaves, Vector((0, 0, 0)))
    for ob in (tree, leaves):
        ob.data.uv_layers[0].name = 'UVMap'
        ob.data.materials.clear()
    tree.data.materials.append(K.mat(spec['bark']))
    leaves.data.materials.append(K.mat('card:' + spec['card']))
    for p in tree.data.polygons: p.use_smooth = True
    leaves.parent = None
    bpy.ops.object.select_all(action='DESELECT')
    leaves.select_set(True); tree.select_set(True); bpy.context.view_layer.objects.active = tree
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = ob.data.name = f'{species}_{seed}_lod0'
    for o in list(bpy.context.scene.objects):
        if o is not ob: bpy.data.objects.remove(o, do_unlink=True)
    ob.data.calc_loop_triangles()
    return ob, len(ob.data.loop_triangles)


def preview(ob, species, path):
    """A textured, sunlit Cycles render from the iso camera's elevation and from the side."""
    spec = SPECIES[species]
    tex = os.path.join(ROOT, 'unity', 'Assets', 'External', 'Textures', spec['bark'], spec['bark'] + '_d.jpg')
    for m in ob.data.materials:
        nt = m.node_tree; bsdf = nt.nodes['Principled BSDF']
        img = nt.nodes.new('ShaderNodeTexImage')
        if m.name.startswith('mat_card'):
            img.image = bpy.data.images.load(os.path.join(OUT, 'tex', f'card_{spec["card"]}.png'))
            nt.links.new(img.outputs['Alpha'], bsdf.inputs['Alpha'])
            m.blend_method = 'CLIP' if hasattr(m, 'blend_method') else None
        else:
            img.image = bpy.data.images.load(tex)
            mp = nt.nodes.new('ShaderNodeMapping'); tc = nt.nodes.new('ShaderNodeTexCoord')
            mp.inputs['Scale'].default_value = (1 / BARK_TILE_M, 1 / BARK_TILE_M, 1)
            nt.links.new(tc.outputs['UV'], mp.inputs['Vector']); nt.links.new(mp.outputs[0], img.inputs['Vector'])
        nt.links.new(img.outputs['Color'], bsdf.inputs['Base Color'])
        bsdf.inputs['Roughness'].default_value = 0.85
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 32; sc.cycles.device = 'CPU'; sc.cycles.use_denoising = False
    sc.render.resolution_x, sc.render.resolution_y = 1200, 800
    sc.view_settings.view_transform = 'Standard'
    world = bpy.data.worlds.new('w'); sc.world = world; world.use_nodes = True
    bg = world.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.55, 0.66, 0.9, 1); bg.inputs[1].default_value = 0.6
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
        direction = Vector((0, 0, h * 0.45)) - cam.location
        cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = f'{path}_{tag}.png'
        bpy.ops.render.render(write_still=True)


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
            ob, tris = grow(species, seed)
            name = ob.name
            path = os.path.join(OUT, name + '.fbx')
            K.export_fbx(path); K.write_model_meta(path, f'{REL}/{name}.fbx')
            dims = ob.dimensions
            variants.append({'path': f'{REL}/{name}.fbx', 'size': [round(dims.x, 2), round(dims.z, 2), round(dims.y, 2)], 'tris': tris})
            flag = '' if tris <= BUDGET else f'  OVER BUDGET ({BUDGET})'
            print(f'tree {name:16s} {tris:5d} tris  {dims.x:.1f} x {dims.z:.1f} m{flag}')
            if prev:
                os.makedirs(prev, exist_ok=True)
                preview(ob, species, os.path.join(prev, name))
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
