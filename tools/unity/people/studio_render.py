"""One studio for people from different libraries (VALID against Rocketbox, owner 2026-11-01): each avatar rendered in
Blender (Cycles) with the same three lights, grey world and camera, framed on its own eyes (the eye bones), from the front
and at three-quarters, so the libraries' faces can be judged side by side on equal terms. Rocketbox's materials are bound
by name to the textures beside its FBX (<material>_color/_normal, the opacity texture's alpha cuts the hair and lashes);
VALID's come embedded in its FBX. Usage: blender -b --python studio_render.py -- <out dir> <fbx> [<fbx> ...]"""
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
        if nrm is not None:
            nrm.colorspace_settings.name = 'Non-Color'
            tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = nrm
            nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(tn.outputs['Color'], nm.inputs['Color'])
            nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])


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
    rocketbox = any(b.name.startswith('Bip01') for b in arm.data.bones)
    for o in meshes:
        if rocketbox: bind_rocketbox(o, os.path.dirname(path))
        skin_settings(o)
    def bone(names):
        for nm in names:
            if nm in arm.data.bones: return arm.matrix_world @ arm.data.bones[nm].head_local
    eL, eR = bone(('Bip01 LEye', 'LeftEye')), bone(('Bip01 REye', 'RightEye'))
    eye = (eL + eR) / 2
    across = (eL - eR).normalized(); fwd = Vector((0, 0, 1)).cross(across).normalized()
    # the facing: from the head's joint (behind the eyes, at the top of the neck) to the eyes, level
    hj = bone(('Bip01 Head', 'Head'))
    d = eye - hj; d -= across * d.dot(across); d.z = 0
    if d.length > 1e-6 and d.normalized().dot(fwd) < 0: fwd = -fwd
    studio(eye, fwd)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 48; sc.cycles.use_denoising = True; sc.cycles.device = 'CPU'
    sc.render.resolution_x, sc.render.resolution_y = 512, 640
    sc.view_settings.view_transform = 'AgX'
    cam_d = bpy.data.cameras.new('cam'); cam_d.lens = 85; cam = bpy.data.objects.new('cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam
    target = eye - Vector((0, 0, 0.045))
    for view, yaw in (('front', 0.0), ('three', 35.0)):
        a = math.radians(yaw); d = fwd * math.cos(a) + fwd.cross(Vector((0, 0, 1))) * math.sin(a)
        cam.location = target + d * 0.95 + Vector((0, 0, 0.01))
        cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(out_dir, f'{name}_{view}.png')
        bpy.ops.render.render(write_still=True)
        print('rendered', sc.render.filepath)
