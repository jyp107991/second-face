"""Gear taken off a Rocketbox person (inside Blender), for studio_render.py and harmonise.py: the faces of every
material whose name holds one of the given words are deleted (helmet, hat, mask, flashlight, tools, equipment), and
with the word 'loose_above_brow', every loose piece of the mesh that lies wholly above the brow (higher than the eyes
by more than BROW_MM) and is not hair: goggles pushed up on a helmet are modelled in the head's own material, as a part
of their own, and would float once the helmet is gone (data/rocketbox_review.json, 'gear_off')."""
import bmesh
import numpy as np

BROW_MM = 30.0
HOOD_MM = 95.0
CROWN_MM = 95.0


def take_off(meshes, words, eye_z=None, eye_pts=None):
    """meshes: Blender mesh objects; words: list of material-name words (and 'loose_above_brow'); eye_z: the eyes'
    height in world space (metres), needed for 'loose_above_brow'. Returns the number of faces deleted."""
    gone = 0
    loose = 'loose_above_brow' in words and eye_z is not None
    # 'loose_crown': a cap modelled as a loose part of the head's own material over a whole scalp (Military_Male_06):
    # every loose piece (not hair) that reaches higher than the eyes by CROWN_MM
    crown = 'loose_crown' in words and eye_z is not None
    # 'hood': a hood modelled into the clothes (no material of its own): every non-head face lying wholly above the
    # chin (higher than the eyes less HOOD_MM), around the head
    hood = 'hood' in words and eye_z is not None
    words_all = list(words)
    words = [w for w in words if w not in ('loose_above_brow', 'hood', 'loose_crown', 'loose_eyewear', 'visor')]
    if crown:
        # pieces joined by edges within the head's material (the head and body share vertices, so joining through any
        # vertex would take the whole person); never the largest piece, which is the head itself
        for o in meshes:
            hmi = {i for i, m in enumerate(o.data.materials) if m and m.name.lower().endswith('_head')}
            if not hmi: continue
            bm = bmesh.new(); bm.from_mesh(o.data); M = o.matrix_world
            seen, parts = set(), []
            for f0 in bm.faces:
                if f0.material_index not in hmi or f0 in seen: continue
                part, stack = [], [f0]; seen.add(f0)
                while stack:
                    f = stack.pop(); part.append(f)
                    for e in f.edges:
                        for g in e.link_faces:
                            if g not in seen and g.material_index in hmi: seen.add(g); stack.append(g)
                parts.append(part)
            parts.sort(key=len, reverse=True)
            doomed = [f for part in parts[1:] if max((M @ v.co).z for f in part for v in f.verts) > eye_z + CROWN_MM / 1000.0 for f in part]
            # (and the cap's loose band and badge, lower than its crown: Police_Male_05's, Pilot_Male_03's and Police_Male_03's
            # band stayed round the head; every loose piece wholly above the eyes by 10 mm and reaching 40 mm above them)
            band = [f for part in parts[1:] if min((M @ v.co).z for f in part for v in f.verts) > eye_z + 0.010
                    and max((M @ v.co).z for f in part for v in f.verts) > eye_z + 0.040 for f in part]
            doomed = list(set(doomed) | set(band))
            bmesh.ops.delete(bm, geom=doomed, context='FACES'); bm.to_mesh(o.data); bm.free(); gone += len(doomed)
    if 'loose_eyewear' in words_all and eye_z is not None:
        # glasses modelled in the head's own material (Military_Male_03's): every loose piece of it lying within 35 mm of
        # the eyes' height that is not an eyeball (a round piece; the eye bones sit off the eyeballs' centres)
        for o in meshes:
            hmi = {i for i, m in enumerate(o.data.materials) if m and m.name.lower().endswith('_head')}
            if not hmi: continue
            bm = bmesh.new(); bm.from_mesh(o.data); M = o.matrix_world
            seen, parts = set(), []
            for f0 in bm.faces:
                if f0.material_index not in hmi or f0 in seen: continue
                part, stack = [], [f0]; seen.add(f0)
                while stack:
                    f = stack.pop(); part.append(f)
                    for e in f.edges:
                        for g in e.link_faces:
                            if g not in seen and g.material_index in hmi: seen.add(g); stack.append(g)
                parts.append(part)
            parts.sort(key=len, reverse=True)
            doomed = []
            for part in parts[1:]:
                pts = np.array([tuple(M @ v.co) for f in part for v in f.verts])
                if pts[:, 2].min() < eye_z - 0.035 or pts[:, 2].max() > eye_z + 0.035: continue
                # (an eye piece, the eyeball with its cornea, spans at most 40 mm, Rocketbox's 35 x 17 x 36; a lens of
                # Military_Male_03's glasses spans 53 mm, their frame 174)
                ext = pts.max(0) - pts.min(0)
                if ext.max() < 0.040: continue
                doomed += part
            bmesh.ops.delete(bm, geom=doomed, context='FACES'); bm.to_mesh(o.data); bm.free(); gone += len(doomed)
    if 'visor' in words_all and eye_pts is not None:
        # a breathing mask's clear visor, modelled in the opacity material with the lashes (Fire_Female_03, Fire_Male_07):
        # every face of it farther than 25 mm from both eyes (the lashes lie within 20 mm of an eye's centre)
        for o in meshes:
            omi = {i for i, m in enumerate(o.data.materials) if m and m.name.lower().endswith('_opacity')}
            if not omi: continue
            bm = bmesh.new(); bm.from_mesh(o.data); M = o.matrix_world
            doomed = [f for f in bm.faces if f.material_index in omi and
                      min(np.linalg.norm(np.array(tuple(M @ f.calc_center_median())) - e) for e in eye_pts) > 0.025]
            bmesh.ops.delete(bm, geom=doomed, context='FACES'); bm.to_mesh(o.data); bm.free(); gone += len(doomed)
    if hood:
        for o in meshes:
            head_mi = {i for i, m in enumerate(o.data.materials) if m and (m.name.lower().endswith('_head') or m.name.lower().endswith('_opacity'))}
            bm = bmesh.new(); bm.from_mesh(o.data); M = o.matrix_world
            doomed = [f for f in bm.faces if f.material_index not in head_mi and min((M @ v.co).z for v in f.verts) > eye_z - HOOD_MM / 1000.0]
            bmesh.ops.delete(bm, geom=doomed, context='FACES'); bm.to_mesh(o.data); bm.free(); gone += len(doomed)
    for o in meshes:
        idx = {i for i, m in enumerate(o.data.materials) if m and any(w in m.name.lower() for w in words)}
        hair = {i for i, m in enumerate(o.data.materials) if m and m.name.lower().endswith('_opacity')}
        if not idx and not loose: continue
        bm = bmesh.new(); bm.from_mesh(o.data)
        doomed = {f for f in bm.faces if f.material_index in idx}
        if loose:
            M = o.matrix_world
            bm.verts.ensure_lookup_table()
            z = np.array([(M @ v.co).z for v in bm.verts])
            seen = set()
            for f0 in bm.faces:
                if f0 in seen or f0 in doomed or f0.material_index in hair: continue
                part, stack = [], [f0]; seen.add(f0)
                while stack:                                       # the loose piece: faces joined through shared vertices
                    f = stack.pop(); part.append(f)
                    for v in f.verts:
                        for g in v.link_faces:
                            if g not in seen and g not in doomed: seen.add(g); stack.append(g)
                vs = {v.index for f in part for v in f.verts}
                if len(vs) < 5000 and min(z[i] for i in vs) > eye_z + BROW_MM / 1000.0:
                    doomed.update(part)
        if doomed:
            gone += len(doomed)
            bmesh.ops.delete(bm, geom=list(doomed), context='FACES')
            bm.to_mesh(o.data)
        bm.free()
    return gone
