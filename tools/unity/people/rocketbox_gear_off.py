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
CROWN_SMOOTH_MM = 55.0
CROWN_RAMP_MM = 15.0


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
    words = [w for w in words if w not in ('loose_above_brow', 'hood', 'loose_crown', 'loose_eyewear', 'visor', 'hair_cards') and not w.startswith('crown_smooth')]
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
    if 'hair_cards' in words_all and eye_z is not None:
        # a styled top of loose hair cards (the opacity material) over the head's own short photographed hair: gelled
        # spikes, never this world's grooming (owner: no gel or product), and at a close look a crown of flat triangles
        # (Male_Adult_05's). Every card whose centre lies 30 mm over the eyes comes off; the lashes and brows lie lower
        for o in meshes:
            omi = {i for i, m in enumerate(o.data.materials) if m and m.name.lower().endswith('_opacity')}
            if not omi: continue
            bm = bmesh.new(); bm.from_mesh(o.data); M = o.matrix_world
            # (and the short cards at the temples and over the ears, lower: every card above the cheekbones, 10 mm under the
            # eyes, and over 25 mm from both eyes, the lashes lying within 20; small dark stubs stayed over Business_Male_03's
            # ears with the first cut at 30 mm over the eyes)
            def card_off(f):
                c_ = M @ f.calc_center_median()
                if c_.z > eye_z + 0.030: return True
                if eye_pts is None or c_.z < eye_z - 0.010: return False
                return min(np.linalg.norm(np.array(tuple(c_)) - e) for e in eye_pts) > 0.025
            doomed = [f for f in bm.faces if f.material_index in omi and card_off(f)]
            bmesh.ops.delete(bm, geom=doomed, context='FACES'); bm.to_mesh(o.data); bm.free(); gone += len(doomed)
    cs_w = next((w for w in words_all if w.startswith('crown_smooth')), None)
    if cs_w is not None and eye_z is not None:
        # ('crown_smoothNN': the crown from NN mm over the eyes, for a head whose hairline sits high: Male_Adult_05's receding
        # temple corner lies above 55 mm and took a streak when rounded)
        cs_mm = float(cs_w[len('crown_smooth'):]) if cs_w[len('crown_smooth'):] else CROWN_SMOOTH_MM
        # the crown under a cap is modelled coarse, as the cap hid it (edges of 23 mm, against 14-18 on the forehead):
        # with the cap off its corners showed in the silhouette (Police_Male_01's bald crown, Pilot_Male_03's; owner:
        # "humans do not have random vertices"). Inside the crown (every face of the head's material wholly above the
        # forehead, 55 mm over the eyes: the temples are the head's own) each edge is cut twice, and every point inside it is set at the mean distance of its neighbours from
        # the crown's own best-fit sphere's centre (a few rounds), so the new points lie on the crown's curve and its old
        # corners round off; the crown's border stays where it is, with its own normals, so it meets the forehead with no
        # line (a smooth subdivision of the border too left a crease across the forehead and a lumpy outline, the first try)
        for o in meshes:
            hmi = {i for i, m in enumerate(o.data.materials) if m and m.name.lower().endswith('_head')}
            if not hmi: continue
            me = o.data; M = o.matrix_world; zc = eye_z + cs_mm / 1000.0
            cn = [tuple(c.vector) for c in me.corner_normals]
            old, pv = {}, {}
            for p in me.polygons:
                key = frozenset(p.vertices)
                for li, vi in zip(p.loop_indices, p.vertices):
                    old[(vi, key)] = cn[li]; pv.setdefault(vi, []).append(cn[li])
            nv0 = len(me.vertices)
            bm = bmesh.new(); bm.from_mesh(me)
            sel = {f for f in bm.faces if f.material_index in hmi and min((M @ v.co).z for v in f.verts) > zc}
            if not sel: bm.free(); continue
            inner = [e for e in {e for f in sel for e in f.edges} if len(e.link_faces) == 2 and all(g in sel for g in e.link_faces)]
            border = {v for f in sel for e in f.edges if e not in inner for v in e.verts}
            P = np.array([tuple(v.co) for v in {v for f in sel for v in f.verts}])
            A = np.c_[2 * P, np.ones(len(P))]; sol = np.linalg.lstsq(A, (P ** 2).sum(1), rcond=None)[0]; ctr = sol[:3]
            # (by index: Blender's Python handles to the vertices die with the subdivision; their order stays, the new
            # vertices come after the old)
            bm.verts.index_update(); n0 = len(bm.verts)
            s0 = {v.index for f in sel for v in f.verts}; bset = {v.index for v in border}
            # (each old point's own smooth normal, carried onto the new points by the subdivision, to ease the new surface's
            # normals in: the points barely moved near the border took their flat facets' normals, a crease at a receding
            # temple, Male_Adult_05's)
            lay = bm.verts.layers.float_vector.new('crown_n0'); bm.verts.ensure_lookup_table()
            for i in s0:
                a_ = np.mean(pv[i], 0); bm.verts[i][lay] = tuple(a_ / max(np.linalg.norm(a_), 1e-9))
            bmesh.ops.subdivide_edges(bm, edges=inner, cuts=2, smooth=0.0, use_grid_fill=True)
            bm.verts.ensure_lookup_table(); bm.verts.index_update()
            crown_v = [bm.verts[i] for i in sorted(s0 - bset)] + [bm.verts[i] for i in range(n0, len(bm.verts))]
            for _ in range(6):
                rr = {}
                for v in crown_v:
                    nb = [e.other_vert(v) for e in v.link_edges]
                    if not nb: continue
                    rr[v] = float(np.mean([np.linalg.norm(np.array(tuple(w.co)) - ctr) for w in nb]))
                for v, r in rr.items():
                    d = np.array(tuple(v.co)) - ctr; n = np.linalg.norm(d)
                    # (eased in over CROWN_RAMP_MM above the crown's border: moved in full there, the temples took a dent
                    # where the rounded crown met the head's own forehead, Police_Male_05's and Military_Male_02's)
                    wz = min(1.0, max(0.0, ((M @ v.co).z - zc) / (CROWN_RAMP_MM / 1000.0)))
                    if n > 1e-9: v.co = tuple(ctr + d / n * (n + (r - n) * wz))
            moved = {v.index for v in crown_v}
            bm.normal_update(); blend = {}
            for v in crown_v:
                wz = min(1.0, max(0.0, ((M @ v.co).z - zc) / (CROWN_RAMP_MM / 1000.0)))
                n_ = wz * np.array(tuple(v.normal)) + (1 - wz) * np.array(tuple(v[lay]))
                blend[v.index] = tuple(n_ / max(np.linalg.norm(n_), 1e-9))
            bm.to_mesh(me); bm.free(); me.update()
            new_n = []
            for p in me.polygons:
                key = frozenset(p.vertices)
                for vi in p.vertices:
                    if vi in blend and vi not in bset: n = blend[vi]
                    elif (vi, key) in old: n = old[(vi, key)]
                    else:
                        a = np.mean(pv[vi], 0); n = tuple(a / max(np.linalg.norm(a), 1e-9))
                    new_n.append(n)
            me.normals_split_custom_set(new_n)
            print('crown smoothed:', len(sel), 'faces,', len(me.vertices) - nv0, 'new vertices, sphere radius', round(float(np.sqrt(sol[3] + (ctr ** 2).sum())), 4))
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
