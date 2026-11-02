"""One studio for people from different libraries (VALID against Rocketbox, owner 2026-11-01): each avatar rendered in
Blender (Cycles) with the same three lights, grey world and camera, framed on its own eyes (the eye bones), from the front
and at three-quarters, so the libraries' faces can be judged side by side on equal terms. Rocketbox's materials are bound
by name to the textures beside its FBX (<material>_color/_normal, the opacity texture's alpha cuts the hair and lashes);
VALID's come embedded in its FBX. Env: SF_SAMPLES (48), SF_THREADS, SF_SCALE (percent of 512 x 640), SF_VIEWS (front,three[,side]),
SF_VARIANTS (a JSON file of shape-key settings per avatar), SF_HIDE (gear to take off: helmet,mask,...).
Usage: blender -b --python studio_render.py -- <out dir> <fbx> [<fbx> ...]"""
import bpy, sys, os, math
import numpy as np
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
out_dir, paths = args[0], args[1:]
os.makedirs(out_dir, exist_ok=True)


def bind_rocketbox(mesh, folder):
    """Rocketbox: each material's textures by name beside the FBX (the importer leaves them unbound)."""
    for slot in mesh.material_slots:
        m = slot.material
        if m is None: continue
        def tex(suffix):
            for ext in ('.jpg', '.png'):
                p = os.path.join(folder, f'{m.name}_{suffix}{ext}')
                if os.path.exists(p): return bpy.data.images.load(p, check_existing=True)
        col = tex('color')
        if col is None: continue
        m.use_nodes = True; nt = m.node_tree
        bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
        ti = nt.nodes.new('ShaderNodeTexImage'); ti.image = col
        nt.links.new(ti.outputs['Color'], bsdf.inputs['Base Color'])
        if m.name.endswith('_opacity'):
            nt.links.new(ti.outputs['Alpha'], bsdf.inputs['Alpha'])
        nrm = tex('normal')
        nm = None
        if nrm is not None:
            nrm.colorspace_settings.name = 'Non-Color'
            tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = nrm
            nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(tn.outputs['Color'], nm.inputs['Color'])
            nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
        if m.name.endswith('_head') and os.environ.get('SF_HAIR_MATTE', '1') != '0':
            hair_matte(nt, bsdf, nm, col)


def hair_matte(nt, bsdf, nm, col):
    """Hair painted into a head's texture (a buzz cut, stubble, brows) is matte and its relief soft, not skin's sheen: lit
    with skin's roughness and full-strength normals a buzzed scalp reads as shiny grey plaster. The hair is told from the
    skin by its value against the skin's (texels far darker than the head's median skin), as a mask driving roughness,
    specular and the normal map's strength."""
    W, H = col.size
    px = np.empty(W * H * 4, np.float32); col.pixels.foreach_get(px); px = px.reshape(H, W, 4)
    V = px[..., :3].max(-1)
    nz = V[V > 0.01]                                       # (the atlas's empty black left out)
    skin = float(np.percentile(nz, 60)) if nz.size else 0.4  # most of a head's painted area is skin
    hm = np.clip((0.78 * skin - V) / (0.3 * skin), 0, 1)       # (lighter brown hair at the temples too, not only black)
    mi = bpy.data.images.new(col.name + '_hairmask', W, H, alpha=False, float_buffer=False)
    mi.colorspace_settings.name = 'Non-Color'
    out = np.ones((H, W, 4), np.float32); out[..., 0] = out[..., 1] = out[..., 2] = hm
    mi.pixels.foreach_set(out.ravel())
    tm = nt.nodes.new('ShaderNodeTexImage'); tm.image = mi
    def lerp(a, b):
        n = nt.nodes.new('ShaderNodeMath'); n.operation = 'MULTIPLY_ADD'
        nt.links.new(tm.outputs['Color'], n.inputs[0]); n.inputs[1].default_value = b - a; n.inputs[2].default_value = a
        return n.outputs[0]
    nt.links.new(lerp(0.55, 0.88), bsdf.inputs['Roughness'])
    if 'Specular IOR Level' in bsdf.inputs: nt.links.new(lerp(0.35, 0.12), bsdf.inputs['Specular IOR Level'])
    if nm is not None: nt.links.new(lerp(1.0, 0.35), nm.inputs['Strength'])


def skin_settings(mesh):
    """The same surface response for every library: modest roughness and a little subsurface on skin."""
    for slot in mesh.material_slots:
        m = slot.material
        if m is None or not m.use_nodes: continue
        bsdf = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if bsdf is None: continue
        bsdf.inputs['Roughness'].default_value = 0.55
        if 'Specular IOR Level' in bsdf.inputs: bsdf.inputs['Specular IOR Level'].default_value = 0.35
        if 'Subsurface Weight' in bsdf.inputs: bsdf.inputs['Subsurface Weight'].default_value = 0.08
        if 'Metallic' in bsdf.inputs: bsdf.inputs['Metallic'].default_value = 0.0


def studio(eye, fwd):
    """Three area lights and a grey world, placed from the eyes and the facing."""
    up = Vector((0, 0, 1)); side = fwd.cross(up)
    world = bpy.data.worlds.new('studio'); world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.32, 0.33, 0.35, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6
    bpy.context.scene.world = world
    for name, pos, energy, size in (('key', eye + fwd * 1.2 + side * 0.8 + up * 0.6, 160, 1.0),
                                    ('fill', eye + fwd * 1.3 - side * 1.0 + up * 0.1, 55, 1.4),
                                    ('rim', eye - fwd * 0.9 - side * 0.5 + up * 0.7, 80, 0.8)):
        ld = bpy.data.lights.new(name, 'AREA'); ld.energy = energy; ld.size = size
        lo = bpy.data.objects.new(name, ld); bpy.context.scene.collection.objects.link(lo)
        lo.location = pos; lo.rotation_euler = (eye - pos).to_track_quat('-Z', 'Y').to_euler()


for path in paths:
    name = os.path.basename(path)[:-4]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=path)
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    # SF_HIDE: gear taken off (rocketbox_gear_off.py: the faces of materials whose names hold any of these words, and
    # with 'loose_above_brow' the loose pieces wholly above the brow)
    hide = [w for w in os.environ.get('SF_HIDE', '').split(',') if w]
    if hide:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import rocketbox_gear_off
        eb = next((arm.data.bones[n] for n in ('Bip01 LEye', 'Bip02 LEye', 'LeftEye') if n in arm.data.bones), None)
        rocketbox_gear_off.take_off(meshes, hide, (arm.matrix_world @ eb.head_local).z if eb else None)
    rocketbox = any(b.name.startswith(('Bip01', 'Bip02')) for b in arm.data.bones)
    for o in meshes:
        if rocketbox: bind_rocketbox(o, os.path.dirname(path))
        skin_settings(o)
    def bone(names):
        for nm in names:
            if nm in arm.data.bones: return arm.matrix_world @ arm.data.bones[nm].head_local
    eL, eR = bone(('Bip01 LEye', 'Bip02 LEye', 'LeftEye')), bone(('Bip01 REye', 'Bip02 REye', 'RightEye'))
    hj = bone(('Bip01 Head', 'Bip02 Head', 'Head')) or bone(tuple(b.name for b in arm.data.bones if 'head' in b.name.lower()))
    if hj is None: print('skip', name, 'no head bone'); continue
    if eL is None or eR is None:
        # no eye bones (the library's children): the eyes put where they sit on its adults, from the head's joint,
        # scaled by the head's height, and the face taken to look along -y as every Rocketbox avatar does
        top = max((o.matrix_world @ Vector(c)).z for o in meshes for c in o.bound_box)
        k = (top - hj.z) / 0.205
        eye = hj + Vector((0, -0.085 * k, 0.09 * k)); across = Vector((1, 0, 0)); fwd = Vector((0, -1, 0))
    else:
        eye = (eL + eR) / 2
        across = (eL - eR).normalized(); fwd = Vector((0, 0, 1)).cross(across).normalized()
        # the facing: from the head's joint (behind the eyes, at the top of the neck) to the eyes, level
        d = eye - hj; d -= across * d.dot(across); d.z = 0
        if d.length > 1e-6 and d.normalized().dot(fwd) < 0: fwd = -fwd
    studio(eye, fwd)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = int(os.environ.get('SF_SAMPLES', 48)); sc.cycles.use_denoising = True; sc.cycles.device = 'CPU'
    if os.environ.get('SF_THREADS'): sc.render.threads_mode = 'FIXED'; sc.render.threads = int(os.environ['SF_THREADS'])
    sc.render.resolution_x, sc.render.resolution_y = 512, 640
    sc.render.resolution_percentage = int(os.environ.get('SF_SCALE', 100))     # (QA sheets: 75)
    sc.view_settings.view_transform = 'AgX'; sc.view_settings.exposure = -1.5     # a fair cheek at about L* 70, as photographed
    cam_d = bpy.data.cameras.new('cam'); cam_d.lens = 85; cam = bpy.data.objects.new('cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam
    target = eye - Vector((0, 0, 0.045))
    # SF_VARIANTS: a JSON file {avatar name: {tag: {shape key: weight 0..1}}}: each variant rendered as <name>_<tag>_<view>
    variants = {'': {}}
    if os.environ.get('SF_VARIANTS'):
        import json
        variants = json.load(open(os.environ['SF_VARIANTS'])).get(name, {'': {}})
    keyed = [o for o in meshes if o.data.shape_keys]
    views = [v for v in (('front', 0.0), ('three', 35.0), ('side', 85.0)) if v[0] in os.environ.get('SF_VIEWS', 'front,three')]
    for tag, setting in variants.items():
        for o in keyed:
            for kb in o.data.shape_keys.key_blocks[1:]: kb.value = float(setting.get(kb.name, 0.0))
        for view, yaw in views:
            a = math.radians(yaw); d = fwd * math.cos(a) + fwd.cross(Vector((0, 0, 1))) * math.sin(a)
            cam.location = target + d * 0.95 + Vector((0, 0, 0.01))
            cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
            sc.render.filepath = os.path.join(out_dir, f'{name}_{tag + "_" if tag else ""}{view}.png')
            bpy.ops.render.render(write_still=True)
            print('rendered', sc.render.filepath)
