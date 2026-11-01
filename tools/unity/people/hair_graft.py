"""A hairstyle moved from one person onto another (owner, 2026-11-01: "hair must be consistent with race: Black people
cannot have weirdly white straight hairstyles"; many people from each base by blending and variation).
Rocketbox builds most of a hairstyle into the head's own mesh: a shell standing out from the skull, painted with hair in
the head's texture, plus a few loose cards (the opacity material) for wisps; there is no bare skull under it. So:
- the skull: a bald Rocketbox head (GRAFT_SKULL) in its eyes' frame, scaled to each head by the eyes' spacing, gives the
  scalp's distance from the skull's centre in every direction;
- the target's own hair comes off: its loose cards (not its brows and lashes) are deleted; the head's vertices that stand
  out from the skull, above the face and away from the ears, are pulled onto it, and those hanging far below it (long
  hair down the neck) are cut away; their texture is repainted as a close-cropped scalp in the hair colour (so a head
  with no hairstyle grafted on is buzzed, and a grafted one has a scalp of hair under it, not skin);
- the donor's hairstyle (Rocketbox: its shell and its cards, each with its own texture; VALID: its 'h_wig' mesh; ours,
  hairgen.py/groom.py: a hair file on the player's body) is fitted to the target: each vertex keeps its height above the
  donor's scalp along the ray from the donor's skull centre and is put at that height above the target's scalp along the
  same direction (both in their eyes' frames, so the hair sits where it sat), skinned to the head bone, its textures
  retoned to the hair colour with their own light and dark kept.
With no donor ('-'), only the scalp is rebuilt (a buzzed head).
Usage: blender -b --python hair_graft.py -- <target fbx> <donor fbx>[+<donor hair fbx>]|- <out fbx> <hair colour hex>
  Writes <out>_graft.json with the scalp's texture polygons, which scalp_paint.py repaints (Blender's Python has no PIL).
  Env: GRAFT_SKULL (the bald head's FBX), GRAFT_TEX (the donor hair's texture when its FBX does not carry it),
  GRAFT_KEEP_TEX (keep the donor's hair textures as they are: its hair is already the colour wanted), GRAFT_VOLUME (the
  hair's height above the scalp, scaled: 0.5 a short cut of the same hair, 1.3 a fuller one)."""
import bpy, bmesh, sys, os, json, math
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

args = sys.argv[sys.argv.index('--') + 1:]
target_path, donor_path, out_path = args[:3]
hair_hex = int(args[3], 16) if len(args) > 3 else 0x16110d
out_dir = os.path.dirname(os.path.abspath(out_path)); os.makedirs(out_dir, exist_ok=True)
VOLUME = float(os.environ.get('GRAFT_VOLUME', 1.0))     # the hair's height above the scalp, scaled (a short cut to a full one)
HAIR_RGB = np.array([(hair_hex >> 16) & 255, (hair_hex >> 8) & 255, hair_hex & 255], np.float32) / 255.0

EYE_L = ('Bip01 LEye', 'Bip02 LEye', 'LeftEye', 'eye.L'); EYE_R = ('Bip01 REye', 'Bip02 REye', 'RightEye', 'eye.R')
HEAD = ('Bip01 Head', 'Bip02 Head', 'Head', 'head')
UP = Vector((0, 0, 1))


def import_fbx(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=path)
    return [o for o in bpy.data.objects if o not in before]


def bone_pos(arm, names):
    for n in names:
        if n in arm.data.bones: return arm.matrix_world @ arm.data.bones[n].head_local
    return None


class Head:
    """A head in its eyes' frame: origin at the eyes' midpoint; x across, y back (into the head), z up (rows of R)."""
    def __init__(self, objs, surface=None):
        self.arm = next(o for o in objs if o.type == 'ARMATURE')
        self.meshes = [o for o in objs if o.type == 'MESH']
        eL, eR = bone_pos(self.arm, EYE_L), bone_pos(self.arm, EYE_R)
        if eL is None or eR is None:
            em = {o.name: o for o in self.meshes}
            cen = lambda o: o.matrix_world @ (sum((v.co for v in o.data.vertices), Vector()) / len(o.data.vertices))
            eL, eR = cen(em['h_L_eye']), cen(em['h_R_eye'])
        hj = bone_pos(self.arm, HEAD)
        self.mid = (eL + eR) / 2; self.ipd = (eL - eR).length
        x = (eL - eR).normalized(); z = (UP - x * UP.dot(x)).normalized(); y = z.cross(x)
        d = hj - self.mid; d -= x * d.dot(x)
        if d.length > 1e-6 and d.dot(y) < 0: y = -y
        self.R = Matrix((x, y, z))
        self.bvh = surface_bvh(surface if surface is not None else self.meshes, None if surface is not None else is_head)
        self.full_bvh = surface_bvh(self.meshes)                   # every surface: skin, neck, clothes
        # the skull's centre: halfway from the eyes to the back of the head at 30 mm above them, as far up again
        o = self.mid + self.R.transposed() @ Vector((0, 0, 0.03))
        hit, n, i, dist = self.bvh.ray_cast(o, self.R.transposed() @ Vector((0, 1, 0)))
        self.c = o + self.R.transposed() @ Vector((0, (dist if hit is not None else 0.18) / 2, 0))

    def frame(self, p):                      # world -> frame from the skull centre
        return self.R @ (p - self.c)

    def world(self, q):
        return self.c + self.R.transposed() @ q

    def scalp(self, d):                      # distance along frame direction d to its own surface
        hit, n, i, dist = self.bvh.ray_cast(self.c, self.R.transposed() @ d)
        return dist


def is_head(o, mi):
    return mi < len(o.data.materials) and o.data.materials[mi] is not None and o.data.materials[mi].name.endswith('_head')


def is_cards(o, mi):
    return mi < len(o.data.materials) and o.data.materials[mi] is not None and o.data.materials[mi].name.endswith('_opacity')


def surface_bvh(objs, keep=None):
    verts, polys = [], []
    for o in objs:
        M = o.matrix_world; base = len(verts)
        verts += [M @ v.co for v in o.data.vertices]
        polys += [[base + i for i in p.vertices] for p in o.data.polygons if keep is None or keep(o, p.material_index)]
    return BVHTree.FromPolygons(verts, polys)


def islands(bm, faces_ok):
    seen = set()
    for f0 in bm.faces:
        if f0 in seen or not faces_ok(f0): continue
        part, stack = [], [f0]; seen.add(f0)
        while stack:
            f = stack.pop(); part.append(f)
            for v in f.verts:
                for g in v.link_faces:
                    if g not in seen and faces_ok(g): seen.add(g); stack.append(g)
        yield part


def brow_or_lash(P):
    """A loose piece of cards that is a brow or lashes (mm, eyes' frame, y back): small, in front of the eyes' centres,
    between just under the eyes and the brows' top. Long hair hanging at eye level is neither: it reaches back."""
    ext = P.max(0) - P.min(0)
    return ext.max() < 75 and P[:, 1].max() < 14 and P[:, 2].min() > -22 and P[:, 2].max() < 48 and np.abs(P[:, 0]).max() < 72


def protected(d, r=None, s=None, ears=True):
    """What stands out from a skull without being hair (d: unit direction from the skull centre, frame axes; elevation
    from z): the face (in front, below 18 degrees: the forehead's hairline lies about 20 degrees up), the ears (to the sides between 30 below and 12 above, standing out no
    more than 30 mm: hair beyond that is hair), and everything below 30 degrees under the centre (the neck, the jaw)."""
    el = math.degrees(math.asin(max(-1.0, min(1.0, d.z))))
    if el < -30: return True
    if d.y < -0.35 and el < 18: return True
    if ears and abs(d.x) > 0.7 and -30 < el < 22 and (r is None or s is None or r < s + 0.035): return True
    return False


def over_skin(head, p, eyes_mm=26.0):
    """A layer of hair lying over skin or clothes (long hair down the neck and shoulders, strands beside the face, a
    fringe): from the vertex towards the neck's axis at its own height there is another surface, at least 6 mm in. Never near the
    eyes (the lids lie over the eyeballs) nor on the face below the brows (the mouth's inside lies behind it)."""
    q = head.frame(p)
    el = math.degrees(math.atan2(q.z, math.hypot(q.x, q.y)))
    e = head.R @ (head.mid - head.c)                             # the eyes' midpoint from the skull centre
    for sx in (-1, 1):
        ex = Vector((e.x + sx * head.ipd / 2, e.y, e.z))
        if (q - ex).length < eyes_mm / 1000.0: return False
    if q.y < -0.04 and abs(q.x) < 0.045 and el < 15: return False
    a = Vector((0.0, 0.01, q.z))
    to = a - q; dist = to.length
    if dist < 0.02: return False
    dw = head.R.transposed() @ (to / dist)
    hit, n, i, t = head.full_bvh.ray_cast(p + dw * 0.004, dw, dist - 0.012)
    return hit is not None and t > 0.002


def hanging(q):
    """Long hair hanging below the skull, well clear of the neck (q: offset from the skull centre in the frame, metres, y
    back): below the ear lobes (25 degrees under the centre), not in front (the face and jaw lie 60 mm and more ahead of
    the centre), and more than 75 mm from the neck's axis, which runs down from the centre."""
    el = math.degrees(math.atan2(q.z, math.hypot(q.x, q.y)))
    return el < -25 and q.y > -0.04 and math.hypot(q.x, q.y - 0.01) > 0.075


def srgb_lab(c):
    """sRGB (0..1, ... x 3) to CIE L*a*b* (D65)."""
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    xyz = c @ np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]]).T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 216 / 24389, np.cbrt(xyz), (24389 / 27 * xyz + 16) / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def hair_coloured(o, bm, head, tex_dir):
    """Which of the head's vertices are painted as hair, not skin: their texel lies more than 13 in L*a*b* from the
    head's own cheek, or 18 darker (the ears, the face and the neck are skin: whatever their shape, they stay)."""
    uvl = bm.loops.layers.uv.active
    mats = {i: m.name for i, m in enumerate(o.data.materials) if m}
    out = {}
    M = o.matrix_world
    for mi, name in mats.items():
        if not name.endswith('_head'): continue
        path = os.path.join(tex_dir, f'{name}_color.jpg')
        if not os.path.exists(path): continue
        img = bpy.data.images.load(path); w, h = img.size
        px = np.empty(w * h * 4, np.float32); img.pixels.foreach_get(px); px = px.reshape(h, w, 4)[..., :3]
        verts = [v for v in bm.verts if v.link_loops and any(l.face.material_index == mi for l in v.link_loops)]
        uv = np.array([tuple(next(l for l in v.link_loops if l.face.material_index == mi)[uvl].uv) for v in verts])
        col = px[np.clip((uv[:, 1] * h).astype(int), 0, h - 1), np.clip((uv[:, 0] * w).astype(int), 0, w - 1)]
        lab = srgb_lab(col.astype(np.float64))
        P = np.array([tuple(head.R @ ((M @ v.co) - head.mid)) for v in verts]) * 1000.0
        cheek = (np.abs(P[:, 0]) > 30) & (np.abs(P[:, 0]) < 55) & (P[:, 2] < -15) & (P[:, 2] > -45) & (P[:, 1] < 0)
        ref = np.median(lab[cheek], 0) if cheek.sum() > 5 else np.median(lab, 0)
        de = np.linalg.norm(lab - ref, axis=1)
        for v, e, L in zip(verts, de, lab[:, 0]): out[v] = (e > 13) or (L < ref[0] - 18)
        bpy.data.images.remove(img)
    return out


# --- the skull --------------------------------------------------------------------------------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)
sobjs = import_fbx(os.environ['GRAFT_SKULL'])
SK = Head(sobjs)


def face_width(head):
    """The face's width at the cheekbones (metres): the widest head-material vertices in front of the eyes' centres, 10 to
    30 mm below them. Skin on every head, whatever the hair (a fringe hides the forehead)."""
    w = 0.0
    for o in head.meshes:
        M = o.matrix_world
        mi = {i for i, m in enumerate(o.data.materials) if m and m.name.endswith('_head')}
        if not mi: continue
        on = set()
        for p in o.data.polygons:
            if p.material_index in mi: on.update(p.vertices)
        for i in on:
            q = head.R @ ((M @ o.data.vertices[i].co) - head.mid)
            if q.y < -0.005 and -0.03 < q.z < -0.01: w = max(w, abs(q.x))
    return 2 * w


def skull_scale(head, skin=None):
    """How much larger head's skull is than the bald head's. From the head's own skin round the scalp where it shows (the
    forehead, the temples, behind the ears and the nape: texels painted as skin, 10 to 40 degrees up, or behind), the
    median of their distances from the skull centre against the bald head's in the same directions; where hair hides
    them all (a fringe and a bob), the sex's typical size from the eyes' spacing (Rocketbox: one spacing per sex), a
    little under, so that hair is never left standing inside a skull too large for it."""
    if getattr(head, 'k', None) is None:
        k0 = head.ipd / SK.ipd
        ratios = []
        for p in (skin or []):
            q = head.frame(p); r = q.length
            if r < 1e-6: continue
            d = q / r
            el = math.degrees(math.asin(max(-1.0, min(1.0, d.z))))
            front = d.y < -0.6 and 10 < el < 40
            temple = abs(d.x) > 0.6 and 10 < el < 40
            nape = d.y > 0.5 and -10 < el < 30
            if not (front or temple or nape): continue
            rs = SK.scalp(d)
            if rs: ratios.append(r / rs)
        head.k = float(np.median(ratios)) if len(ratios) >= 20 else 0.97 * k0
        head.k_from = 'skin' if len(ratios) >= 20 else 'eyes'
    return head.k


def skull_r(head, d):
    """The scalp's distance from head's skull centre along frame direction d: the bald head's, scaled to head."""
    r = SK.scalp(d)
    return None if r is None else r * skull_scale(head)


# --- the target: its own hair off, the scalp rebuilt ----------------------------------------------------------------
tobjs = import_fbx(target_path)
T = Head(tobjs)
removed_cards = pulled = cut = 0
paint_faces = []                                          # (head material image name, UV polygon) to repaint as scalp
for o in T.meshes:
    bm = bmesh.new(); bm.from_mesh(o.data); M = o.matrix_world
    uvl = bm.loops.layers.uv.active
    doomed = set()
    # cards that are not brows or lashes
    for part in islands(bm, lambda f: is_cards(o, f.material_index)):
        P = np.array([tuple(T.R @ ((M @ v.co) - T.mid)) for f in part for v in f.verts]) * 1000.0
        if not brow_or_lash(P): doomed.update(part)
    removed_cards += len(doomed)
    # the head's shell: pulled onto the skull, or cut where it hangs far below it
    Mi = M.inverted()
    move, hang = {}, set()
    head_verts = {v for f in bm.faces if is_head(o, f.material_index) for v in f.verts}
    painted = hair_coloured(o, bm, T, os.path.dirname(os.path.abspath(target_path)))
    skull_scale(T, [M @ v.co for v in head_verts if painted.get(v) is not None and not painted[v]])
    for v in head_verts:
        if not bool(painted.get(v, True)): continue                # painted as skin: never hair, whatever its shape
        q = T.frame(M @ v.co); r = q.length
        if r < 1e-6: continue
        d = q / r
        if over_skin(T, M @ v.co): hang.add(v); continue          # a layer of hair over skin: cut away
        s = skull_r(T, d)
        if protected(d, r, s, ears=False): continue
        if s is None or r <= s + 0.003: continue
        move[v] = Mi @ T.world(d * (s + 0.001))
    for f in bm.faces:
        if not is_head(o, f.material_index): continue
        vs = list(f.verts)
        if all(v in hang for v in vs): doomed.add(f); cut += 1
        elif any(v in move or v in hang for v in vs):
            img = o.data.materials[f.material_index].name
            paint_faces.append((img, [tuple(l[uvl].uv) for l in f.loops]))
    for v, co in move.items(): v.co = co
    pulled += len(move)
    if doomed: bmesh.ops.delete(bm, geom=list(doomed), context='FACES')
    bm.to_mesh(o.data); bm.free()

# the rebuilt scalp to repaint (scalp_paint.py, outside Blender): the faces' texture polygons per material
tdir = os.path.dirname(os.path.abspath(target_path))
paint = {}
for m_, poly in paint_faces: paint.setdefault(m_, []).append([[round(u, 5), round(v, 5)] for u, v in poly])

# --- the donor's hairstyle ------------------------------------------------------------------------------------------
grafted = 0; missed = 0; textures = []
if donor_path != '-':
    donor_head, _, donor_hair = donor_path.partition('+')
    dobjs = import_fbx(donor_head)
    hobjs = import_fbx(donor_hair) if donor_hair else []
    dmeshes = [o for o in dobjs if o.type == 'MESH']
    wig = next((o for o in dmeshes if o.name.lower().startswith('h_wig')), None)
    pieces = []                                            # (object, texture path, kind)
    if hobjs:                                              # ours: a hair file on the player's (bald) body
        D = Head(dobjs, surface=dmeshes)
        hm = [o for o in hobjs if o.type == 'MESH']
        hair = max(hm, key=lambda o: len(o.data.vertices))
        for o in hobjs:
            if o is not hair: bpy.data.objects.remove(o, do_unlink=True)
        pieces.append((hair, os.environ.get('GRAFT_TEX'), 'cards'))
        own_scalp = True
    elif wig is not None:                                  # VALID: the wig on its bald head
        D = Head(dobjs, surface=[o for o in dmeshes if o.name.startswith('H_')])
        pieces.append((wig, None, 'shell'))
        own_scalp = True
    else:                                                  # Rocketbox: its shell and its cards
        D = Head(dobjs); own_scalp = False
        src_dir = os.path.dirname(os.path.abspath(donor_head))
        body = max((o for o in dmeshes), key=lambda o: len(o.data.vertices))
        for kind in ('shell', 'cards'):
            ob = body.copy(); ob.data = body.data.copy(); bpy.context.scene.collection.objects.link(ob)
            bm = bmesh.new(); bm.from_mesh(ob.data); M = ob.matrix_world
            keep = set()
            if kind == 'cards':
                for part in islands(bm, lambda f: is_cards(ob, f.material_index)):
                    P = np.array([tuple(D.R @ ((M @ v.co) - D.mid)) for f in part for v in f.verts]) * 1000.0
                    if not brow_or_lash(P): keep.update(part)
                mname = next(m.name for m in ob.data.materials if m and m.name.endswith('_opacity'))
            else:
                out_v = set()
                painted_d = hair_coloured(ob, bm, D, src_dir)
                skull_scale(D, [M @ v.co for v in painted_d if not bool(painted_d[v])])
                for v in {v for f in bm.faces if is_head(ob, f.material_index) for v in f.verts}:
                    if not bool(painted_d.get(v, True)): continue  # the donor's skin never comes with its hair
                    q = D.frame(M @ v.co); r = q.length
                    if r < 1e-6: continue
                    d = q / r
                    s = skull_r(D, d)
                    if over_skin(D, M @ v.co): out_v.add(v); continue
                    if protected(d, r, s): continue
                    if s is not None and r > s + 0.003: out_v.add(v)
                keep = {f for f in bm.faces if is_head(ob, f.material_index) and all(v in out_v for v in f.verts)}
                mname = next(m.name for m in ob.data.materials if m and m.name.endswith('_head'))
            bmesh.ops.delete(bm, geom=[f for f in bm.faces if f not in keep], context='FACES')
            bm.to_mesh(ob.data); bm.free()
            if len(ob.data.polygons) == 0: bpy.data.objects.remove(ob, do_unlink=True); continue
            ob.data.materials.clear(); ob.data.materials.append(bpy.data.materials.new(f'graft_{kind}'))
            for p in ob.data.polygons: p.material_index = 0
            ext = '.png' if kind == 'cards' else '.jpg'
            pieces.append((ob, os.path.join(src_dir, f'{mname}_color{ext}'), kind))
    # fit every piece: its height above the donor's scalp, above the target's
    for ob, tex, kind in pieces:
        Mw = ob.matrix_world.copy(); Mi = Mw.inverted()
        new = []
        for v in ob.data.vertices:
            q = D.frame(Mw @ v.co); r = q.length
            if r < 1e-6: new.append(v.co.copy()); continue
            d = q / r
            rd = D.scalp(d) if own_scalp else skull_r(D, d)
            rt = skull_r(T, d)
            if rd is None or rt is None or rd < 0.04:
                missed += 1; new.append(Mi @ T.world(q * (T.ipd / D.ipd)))
            else:
                new.append(Mi @ T.world(d * (rt + (r - rd) * VOLUME)))
        for v, co in zip(ob.data.vertices, new): v.co = co
        ob.data.update()
        ob.parent = None; ob.matrix_world = Mw
        for mod in list(ob.modifiers): ob.modifiers.remove(mod)
        ob.vertex_groups.clear()
        hb = next(n for n in HEAD if n in T.arm.data.bones)
        vg = ob.vertex_groups.new(name=hb); vg.add(list(range(len(ob.data.vertices))), 1.0, 'REPLACE')
        ob.parent = T.arm; ob.matrix_parent_inverse = T.arm.matrix_world.inverted()
        am = ob.modifiers.new('Armature', 'ARMATURE'); am.object = T.arm
        ob.name = f'graft_{kind}'
        grafted += len(ob.data.vertices)
        # its texture, retoned to the hair colour (light and dark kept), named as Rocketbox names its hair so the studio
        # and the importer cut the cards by the texture's alpha
        if not ob.data.materials: ob.data.materials.append(bpy.data.materials.new(f'graft_{kind}'))
        img = None
        if tex and os.path.exists(tex): img = bpy.data.images.load(tex)
        else:
            mm = ob.data.materials[0]
            if mm.use_nodes: img = next((n.image for n in mm.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image), None)
        name = f'graft_{kind}_opacity' if kind == 'cards' else f'graft_{kind}_head'
        ob.data.materials[0].name = name
        if img is not None and os.environ.get('GRAFT_KEEP_TEX') and tex and os.path.exists(tex):
            fn = name + ('_color.png' if kind == 'cards' else '_color.jpg')
            dst = os.path.join(out_dir, fn)
            if os.path.lexists(dst): os.remove(dst)
            os.symlink(os.path.abspath(tex), dst); textures.append(fn)
        elif img is not None:
            w, h = img.size
            px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
            lum = px[..., :3] @ np.array([0.2126, 0.7152, 0.0722], np.float32)
            sel = px[..., 3] > 0.5
            ref = float(np.median(lum[sel])) if sel.any() else float(np.median(lum))
            k = np.clip(lum / max(ref, 1e-3), 0.35, 2.2)[..., None]
            px[..., :3] = np.clip(HAIR_RGB[None, None, :] * k, 0, 1)
            if kind != 'cards': px[..., 3] = 1.0
            out_img = bpy.data.images.new(name + '_color', w, h, alpha=True)
            out_img.pixels = px.ravel().tolist()
            fn = name + ('_color.png' if kind == 'cards' else '_color.jpg')
            out_img.filepath_raw = os.path.join(out_dir, fn); out_img.file_format = 'PNG' if kind == 'cards' else 'JPEG'
            out_img.save(); textures.append(fn)
    keep_objs = {p[0] for p in pieces}
    for o in dobjs + hobjs:
        if o.name in bpy.data.objects and o not in keep_objs: bpy.data.objects.remove(o, do_unlink=True)

# out: the target with its rebuilt scalp and the grafted hair (the skull's head removed)
for o in sobjs:
    if o.name in bpy.data.objects: bpy.data.objects.remove(o, do_unlink=True)
for o in [o for o in bpy.data.objects if o.type not in ('MESH', 'ARMATURE')]: bpy.data.objects.remove(o, do_unlink=True)
for o in [o for o in bpy.data.objects if o.type == 'ARMATURE' and o is not T.arm]: bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.fbx(filepath=out_path, use_selection=True, add_leaf_bones=False, bake_anim=False,
                         use_mesh_modifiers=False, mesh_smooth_type='FACE', path_mode='STRIP')
info = {'target': os.path.basename(target_path), 'target_dir': tdir, 'skull_scale': round(T.k, 3), 'skull_from': T.k_from, 'hair': f'{hair_hex:06x}', 'paint': paint,
        'donor': os.path.basename(donor_path), 'cards_removed': removed_cards,
        'scalp_pulled': pulled, 'hanging_cut': cut, 'grafted_vertices': grafted, 'missed_rays': missed, 'textures': textures}
json.dump(info, open(out_path[:-4] + '_graft.json', 'w'))
print('graft', {k: v for k, v in info.items() if k != 'paint'})
