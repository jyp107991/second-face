"""An Ava-256 capture (ava_fetch.py: one neutral frame's tracked mesh and its photographed texture) rendered in the same
studio as every other person (studio_render.py: the same three area lights, grey world, 85 mm camera 0.95 m away, AgX at
-1.5), from the front and at three-quarters, framed on the eyes. The capture has no rig, no eyeballs of its own and no
back of the head: it is shown as captured, for judging the face. The facing comes from the texture's own layout (u runs
across the face, v up it: the directions in which they grow over the mesh), the eyes from the point textured where the
layout puts the eyes' midpoint.
Usage: blender -b --python ava_render.py -- <topology obj> <out dir> <capture dir> [<capture dir> ...]"""
import bpy, sys, os, math
import numpy as np
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
topo, out_dir, caps = args[0], args[1], args[2:]
os.makedirs(out_dir, exist_ok=True)
V0, VT, F, FT = [], [], [], []
for l in open(topo):
    if l.startswith('v '): V0.append([float(x) for x in l.split()[1:4]])
    elif l.startswith('vt '): VT.append([float(x) for x in l.split()[1:3]])
    elif l.startswith('f '):
        p = [t.split('/') for t in l.split()[1:]]
        F.append([int(a[0]) - 1 for a in p]); FT.append([int(a[1]) - 1 for a in p])
VT = np.array(VT); F = np.array(F); FT = np.array(FT)
# each vertex's texture coordinate (the first corner that uses it)
vuv = np.zeros((len(V0), 2)); seen = np.zeros(len(V0), bool)
for f, ft in zip(F.ravel(), FT.ravel()):
    if not seen[f]: vuv[f] = VT[ft]; seen[f] = True
EYES_UV = (0.5, 0.615)          # the eyes' midpoint in the layout (measured on the textures: 0.385 from the top)


def studio(eye, fwd):
    side = fwd.cross(Vector((0, 0, 1))).normalized(); up = Vector((0, 0, 1))
    world = bpy.data.worlds.new('w'); world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.18, 0.18, 0.18, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6
    bpy.context.scene.world = world
    for name, pos, energy, size in (('key', eye + fwd * 1.2 + side * 0.8 + up * 0.6, 160, 1.0),
                                    ('fill', eye + fwd * 1.3 - side * 1.0 + up * 0.1, 55, 1.4),
                                    ('rim', eye - fwd * 0.9 - side * 0.5 + up * 0.7, 80, 0.8)):
        ld = bpy.data.lights.new(name, 'AREA'); ld.energy = energy; ld.size = size
        lo = bpy.data.objects.new(name, ld); bpy.context.scene.collection.objects.link(lo)
        lo.location = pos; lo.rotation_euler = (eye - pos).to_track_quat('-Z', 'Y').to_euler()


for cap in caps:
    name = 'ava_' + os.path.basename(cap.rstrip('/')).split('--')[-1]
    P = np.load(os.path.join(cap, 'verts.npy')) / 1000.0
    # the face's frame from its texture layout: u grows across it (to the subject's left), v up it
    ok = seen & (vuv[:, 0] > 0.2) & (vuv[:, 0] < 0.8) & (vuv[:, 1] > 0.3) & (vuv[:, 1] < 0.85)
    X = np.c_[P[ok] - P[ok].mean(0)]
    gu = np.linalg.lstsq(X, vuv[ok, 0] - vuv[ok, 0].mean(), rcond=None)[0]
    gv = np.linalg.lstsq(X, vuv[ok, 1] - vuv[ok, 1].mean(), rcond=None)[0]
    across = gu / np.linalg.norm(gu); up = gv - across * gv.dot(across); up /= np.linalg.norm(up)
    fwd = np.cross(up, across)          # (right-handed: across x up points out of the face or into it)
    T = F[:, :3]; nrm = np.cross(P[T[:, 1]] - P[T[:, 0]], P[T[:, 2]] - P[T[:, 0]]).sum(0)
    if fwd.dot(nrm) < 0: fwd = -fwd
    # into the studio's frame: up is +z, the face looks along -y
    R = np.stack([np.cross(-fwd, up) * -1, fwd * -1, up])  # rows: x (across), y (back), z (up) ... recomputed below
    xa = np.cross(up, -fwd); xa /= np.linalg.norm(xa)
    R = np.stack([xa, -fwd, up])
    Q = (P - P.mean(0)) @ R.T
    d = np.linalg.norm(vuv - np.array(EYES_UV), axis=1); d[~seen] = 9
    eye_pt = Q[int(np.argmin(d))] + np.array([0, 0.012, 0])   # (the eyes sit 12 mm behind the skin between them)
    Q = Q - eye_pt + np.array([0, 0, 1.6])
    bpy.ops.wm.read_factory_settings(use_empty=True)
    me = bpy.data.meshes.new(name); me.from_pydata([tuple(map(float, q)) for q in Q], [], [tuple(map(int, f)) for f in F])
    uvl = me.uv_layers.new(name='uv')
    loops = np.zeros((len(me.loops), 2))
    for poly, ft in zip(me.polygons, FT):
        for li, t in zip(poly.loop_indices, ft): loops[li] = VT[t]
    uvl.data.foreach_set('uv', loops.ravel())
    me.polygons.foreach_set('use_smooth', [True] * len(me.polygons)); me.update()
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    mat = bpy.data.materials.new(name); mat.use_nodes = True; nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    ti = nt.nodes.new('ShaderNodeTexImage'); ti.image = bpy.data.images.load(os.path.join(cap, 'tex.png'))
    nt.links.new(ti.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.55
    for k in ('Subsurface Weight', 'Subsurface'):
        if k in bsdf.inputs: bsdf.inputs[k].default_value = 0.08
    ob.data.materials.append(mat)
    eye = Vector((0, 0, 1.6)); fv = Vector((0, -1, 0))
    studio(eye, fv)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = int(os.environ.get('SF_SAMPLES', 32)); sc.cycles.use_denoising = True; sc.cycles.device = 'CPU'
    sc.render.resolution_x, sc.render.resolution_y = 512, 640; sc.render.resolution_percentage = int(os.environ.get('SF_SCALE', 75))
    sc.view_settings.view_transform = 'AgX'; sc.view_settings.exposure = -1.5
    cam_d = bpy.data.cameras.new('cam'); cam_d.lens = 85; cam = bpy.data.objects.new('cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam
    target = eye - Vector((0, 0, 0.045))
    for view, yaw in (('front', 0.0), ('three', 35.0)):
        a = math.radians(yaw); dv = fv * math.cos(a) + fv.cross(Vector((0, 0, 1))) * math.sin(a)
        cam.location = target + dv * 0.95 + Vector((0, 0, 0.01))
        cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(out_dir, f'{name}_{view}.png')
        bpy.ops.render.render(write_still=True)
    print('rendered', name)
