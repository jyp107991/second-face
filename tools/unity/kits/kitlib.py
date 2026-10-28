"""Shared helpers for the modular kit builders (Blender 4.5, headless): box-mapped UVs in metres, bevels, smooth
cylinders with edge split, material slots named mat_<library key>, FBX export for Unity (Y up, metres)."""
import bpy, bmesh, math, os, hashlib
from mathutils import Vector, Matrix

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system = 'METRIC'
    bpy.context.scene.unit_settings.scale_length = 1.0

_mats = {}
def mat(key):
    name = 'mat_' + key
    if name not in _mats:
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        _mats[name] = m
    return _mats[name]

def new_object(name, bm, materials, smooth=False, split_angle=None, bevel=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    for m in materials: me.materials.append(m)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    for p in me.polygons: p.use_smooth = smooth
    if smooth and split_angle is not None:
        es = ob.modifiers.new('split', 'EDGE_SPLIT'); es.split_angle = math.radians(split_angle); es.use_edge_sharp = True
    if bevel:
        bv = ob.modifiers.new('bevel', 'BEVEL'); bv.width = bevel; bv.segments = 2; bv.limit_method = 'ANGLE'; bv.angle_limit = math.radians(40)
    return ob

def box_uv(bm, scale=1.0, layer_name='UVMap'):
    """Box projection in metres: each face is mapped along its dominant normal axis so library textures tile per metre."""
    uv = bm.loops.layers.uv.get(layer_name) or bm.loops.layers.uv.new(layer_name)
    for f in bm.faces:
        n = f.normal
        ax = max(range(3), key=lambda i: abs(n[i]))
        for l in f.loops:
            c = l.vert.co
            if ax == 0: u, v = c.y, c.z
            elif ax == 1: u, v = c.x, c.z
            else: u, v = c.x, c.y
            l[uv].uv = (u * scale, v * scale)

def box(bm, size, at=(0, 0, 0), mat_index=0):
    sx, sy, sz = size
    r = bmesh.ops.create_cube(bm, size=1.0)
    verts = r['verts']
    bmesh.ops.scale(bm, vec=(sx, sy, sz), verts=verts)
    bmesh.ops.translate(bm, vec=at, verts=verts)
    faces = {f for v in verts for f in v.link_faces}
    for f in faces: f.material_index = mat_index
    return verts

def cylinder(bm, radius, depth, at=(0, 0, 0), segments=24, mat_index=0, axis='Z', cap=True):
    r = bmesh.ops.create_cone(bm, cap_ends=cap, cap_tris=False, segments=segments, radius1=radius, radius2=radius, depth=depth)
    verts = r['verts']
    if axis == 'X': bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'Y'), verts=verts)
    elif axis == 'Y': bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'X'), verts=verts)
    bmesh.ops.translate(bm, vec=at, verts=verts)
    faces = {f for v in verts for f in v.link_faces}
    for f in faces: f.material_index = mat_index
    return verts

def ring_segment(bm, r_in, r_out, height, angle_deg, segments=8, z=0.0, mat_index=0):
    """A curved wall piece: the slice of an annulus between r_in and r_out over angle_deg, extruded by height."""
    a0 = -math.radians(angle_deg) / 2
    da = math.radians(angle_deg) / segments
    bottom_in, bottom_out = [], []
    for i in range(segments + 1):
        a = a0 + da * i
        bottom_in.append(bm.verts.new((r_in * math.cos(a), r_in * math.sin(a), z)))
        bottom_out.append(bm.verts.new((r_out * math.cos(a), r_out * math.sin(a), z)))
    top_in = [bm.verts.new((v.co.x, v.co.y, z + height)) for v in bottom_in]
    top_out = [bm.verts.new((v.co.x, v.co.y, z + height)) for v in bottom_out]
    faces = []
    for i in range(segments):
        faces.append(bm.faces.new((bottom_in[i], bottom_out[i], bottom_out[i + 1], bottom_in[i + 1])))      # bottom
        faces.append(bm.faces.new((top_in[i + 1], top_out[i + 1], top_out[i], top_in[i])))                  # top
        faces.append(bm.faces.new((bottom_out[i], top_out[i], top_out[i + 1], bottom_out[i + 1])))          # outer
        faces.append(bm.faces.new((bottom_in[i + 1], top_in[i + 1], top_in[i], bottom_in[i])))              # inner
    faces.append(bm.faces.new((bottom_in[0], top_in[0], top_out[0], bottom_out[0])))
    faces.append(bm.faces.new((bottom_out[-1], top_out[-1], top_in[-1], bottom_in[-1])))
    for f in faces: f.material_index = mat_index
    bmesh.ops.recalc_face_normals(bm, faces=faces)
    return faces

def finish(bm):
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.normal_update()

def export_fbx(path):
    # bake_space_transform writes the mesh Y-up with an identity root. Without it Blender keeps the data Z-up and adds a
    # compensating 90° rotation on the root, which every builder that sets a rotation overwrites (walls lay flat and
    # roofs stood on end in the engine captures until 2026-10-28; Unity's bakeAxisConversion cannot undo it, because the
    # file already declares Y-up).
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.fbx(filepath=path, use_selection=False, apply_scale_options='FBX_SCALE_ALL', axis_forward='-Z', axis_up='Y',
                             bake_space_transform=True, mesh_smooth_type='EDGE', use_mesh_modifiers=True, bake_anim=False,
                             add_leaf_bones=False, path_mode='STRIP', embed_textures=False)

def guid_for(rel):
    return hashlib.md5(('second-face:' + rel).encode()).hexdigest()

def write_model_meta(path, rel):
    """A stable-GUID ModelImporter meta; the KitImportPostprocessor sets the import options."""
    with open(path + '.meta', 'w') as f:
        f.write('fileFormatVersion: 2\nguid: %s\nModelImporter:\n  serializedVersion: 22200\n  internalIDToNameTable: []\n  externalObjects: {}\n  materials:\n    materialImportMode: 2\n    materialName: 0\n    materialSearch: 1\n    materialLocation: 0\n  animations:\n    legacyGenerateAnimations: 4\n    bakeSimulation: 0\n    resampleCurves: 1\n    optimizeGameObjects: 0\n    removeConstantScaleCurves: 1\n    motionNodeName: \n    animationImportErrors: \n    animationImportWarnings: \n    animationRetargetingWarnings: \n    animationDoRetargetingWarnings: 0\n    importAnimatedCustomProperties: 0\n    importConstraints: 0\n    animationCompression: 1\n    animationRotationError: 0.5\n    animationPositionError: 0.5\n    animationScaleError: 0.5\n    animationWrapMode: 0\n    extraExposedTransformPaths: []\n    extraUserProperties: []\n    clipAnimations: []\n    isReadable: 0\n  meshes:\n    lODScreenPercentages: []\n    globalScale: 1\n    meshCompression: 0\n    addColliders: 1\n    useSRGBMaterialColor: 1\n    sortHierarchyByName: 1\n    importPhysicalCameras: 1\n    importVisibility: 1\n    importBlendShapes: 0\n    importCameras: 0\n    importLights: 0\n    nodeNameCollisionStrategy: 1\n    fileIdsGeneration: 2\n    swapUVChannels: 0\n    generateSecondaryUV: 1\n    useFileUnits: 1\n    keepQuads: 0\n    weldVertices: 1\n    bakeAxisConversion: 1\n    preserveHierarchy: 0\n    skinWeightsMode: 0\n    maxBonesPerVertex: 4\n    minBoneWeight: 0.001\n    optimizeBones: 1\n    meshOptimizationFlags: -1\n    indexFormat: 0\n    secondaryUVAngleDistortion: 8\n    secondaryUVAreaDistortion: 15.000001\n    secondaryUVHardAngle: 88\n    secondaryUVMarginMethod: 1\n    secondaryUVMinLightmapResolution: 40\n    secondaryUVMinObjectScale: 1\n    secondaryUVPackMargin: 4\n    useFileScale: 1\n    strictVertexDataChecks: 0\n  tangentSpace:\n    normalSmoothAngle: 60\n    normalImportMode: 0\n    tangentImportMode: 3\n    normalCalculationMode: 4\n    legacyComputeAllNormalsFromSmoothingGroupsWhenMeshHasBlendShapes: 0\n    blendShapeNormalImportMode: 1\n    normalSmoothingSource: 0\n  referencedClips: []\n  importAnimation: 0\n  humanDescription:\n    serializedVersion: 3\n    human: []\n    skeleton: []\n    skeletonHasParents: 1\n    armTwist: 0.5\n    foreArmTwist: 0.5\n    upperLegTwist: 0.5\n    legTwist: 0.5\n    armStretch: 0.05\n    legStretch: 0.05\n    feetSpacing: 0\n    globalScale: 1\n    rootMotionBoneName: \n    hasTranslationDoF: 0\n    hasExtraRoot: 0\n    skeletonHasParents: 1\n  lastHumanDescriptionAvatarSource: {instanceID: 0}\n  autoGenerateAvatarMappingIfUnspecified: 1\n  animationType: 0\n  humanoidOversampling: 1\n  avatarSetup: 0\n  addHumanoidExtraRootOnlyWhenUsingAvatar: 1\n  importBlendShapeDeformPercent: 1\n  remapMaterialsIfMaterialImportModeIsNone: 0\n  additionalBone: 0\n  userData: \n  assetBundleName: \n  assetBundleVariant: \n' % guid_for(rel))

def write_folder_meta(path, rel):
    with open(path + '.meta', 'w') as f:
        f.write('fileFormatVersion: 2\nguid: %s\nfolderAsset: yes\nDefaultImporter:\n  externalObjects: {}\n  userData: \n  assetBundleName: \n  assetBundleVariant: \n' % guid_for(rel))
