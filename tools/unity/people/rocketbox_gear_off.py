"""Gear taken off a Rocketbox person (inside Blender), for studio_render.py and harmonise.py: the faces of every
material whose name holds one of the given words are deleted (helmet, hat, mask, flashlight, tools, equipment), and
with the word 'loose_above_brow', every loose piece of the mesh that lies wholly above the brow (higher than the eyes
by more than BROW_MM) and is not hair: goggles pushed up on a helmet are modelled in the head's own material, as a part
of their own, and would float once the helmet is gone (data/rocketbox_review.json, 'gear_off')."""
import bmesh
import numpy as np

BROW_MM = 30.0


def take_off(meshes, words, eye_z=None):
    """meshes: Blender mesh objects; words: list of material-name words (and 'loose_above_brow'); eye_z: the eyes'
    height in world space (metres), needed for 'loose_above_brow'. Returns the number of faces deleted."""
    gone = 0
    loose = 'loose_above_brow' in words and eye_z is not None
    words = [w for w in words if w != 'loose_above_brow']
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
