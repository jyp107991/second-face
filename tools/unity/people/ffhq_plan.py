"""A batch of people with real photographed faces (ffhq_bake.py), one per FFHQ-UV face chosen by eye: each face put on a
Rocketbox base of its sex (a usable face: no headgear, no religious dress; for a Black people, none whose loose hair
falls below the ears, so its hair can be changed), with a VALID person of the people as the shape target, its own slider
draw, and hair true to the people (the base's own short, tied-back or bun hair in the people's colour; else a short
natural crop, hair_graft.py; an afro rarely and small: the owner, it is an uncommon cut). Writes a harmonise_batch.py manifest.
Usage: python3 ffhq_plan.py <faces json: {id: {gender, age, ...}}> <faces dir> <people> <manifest out> [<max people>]"""
import json, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import people_recipes as pr
import harmonise_batch as hb

HERE = os.path.dirname(os.path.abspath(__file__))
S = hb.S


# the female side of each dimorphic slider: below 1, the upper (male) end is cut to that share; above 1, the lower end
FEMALE_SIDE = {'chin-bones': 0.2, 'chin-height': 0.3, 'chin-prominent': 0.3, 'chin-width': 0.3, 'brow-ridge': 0.1,
               'nose-scale-horiz': 0.4, 'nose-volume': 0.4, 'nose-nostrils-width': 0.4, 'nose-scale-depth': 0.5,
               'mouth-upperlip-volume': 1.7, 'mouth-lowerlip-volume': 1.7, 'cheek-volume': 1.6}


def main(faces_json, faces_dir, people, manifest, limit=None):
    faces = json.load(open(faces_json))
    anc = json.load(open(os.path.join(HERE, 'data', 'rocketbox_ancestry.json')))['ancestry']
    ages = json.load(open(os.path.join(HERE, 'data', 'rocketbox_ages.json')))
    out_skin, beards = set(ages.get('skin_out', [])), set(ages.get('beard', []))
    gear = json.load(open(os.path.join(HERE, 'data', 'rocketbox_gear.json')))['gear']
    review = json.load(open(os.path.join(HERE, 'data', 'rocketbox_review.json')))
    hair_of = json.load(open(os.path.join(HERE, 'data', 'rocketbox_hair.json')))['hair']
    limits = json.load(open(os.path.join(HERE, 'data', 'rocketbox_features.json')))['faces']
    ident = {n: g[0] for g in review.get('identities', []) for n in g}
    rng = random.Random(20261102)
    valid_people = {'west_african': {'f': ['V.Black_F_1', 'V.Black_F_2', 'V.Black_F_3'], 'm': ['V.Black_M_1', 'V.Black_M_2', 'V.Black_M_3']}}
    bases = {}
    for sex in 'fm':
        pool = [n for n, l in sorted(anc.items()) if ('Female' in n) == (sex == 'f') and 'Child' not in n and n not in out_skin
                and l.rstrip('?') not in ('masked', 'unseen') and os.path.exists(f'{S}/rbpop/fbx/{n}.fbx') and os.path.isdir(f'{S}/rblib/{n}')
                and pr.base_ok(n, people, gear, beards, review, hair_of)
                # (a man's base never bearded: the photograph decides the facial hair, and a painted beard would show
                # under the jaw)
                and not (sex == 'm' and (n in beards or review.get('people', {}).get(n, {}).get('beard')))]
        faces_seen, uniq = set(), []
        for n in pool:
            f = ident.get(n, n)
            if f not in faces_seen: faces_seen.add(f); uniq.append(n)
        rng.shuffle(uniq); bases[sex] = uniq
    jobs = []; use = {'f': 0, 'm': 0}
    ids = sorted(faces, key=lambda k: (faces[k]['gender'], k))
    if limit: ids = ids[:limit]
    for k in ids:
        sex = 'm' if faces[k]['gender'] == 1 else 'f'
        base = bases[sex][use[sex] % len(bases[sex])]; use[sex] += 1
        lab = anc.get(base, 'north_european').rstrip('?')
        spec = rng.choice(valid_people[people][sex])
        lim = limits.get(base, {}).get('limits', {}); sliders = {}
        for sid, (lo, hi) in lim.items():
            if sid in hb.NO_DRAW: continue
            # a woman's draw keeps to the female side of the features that differ by sex (3D Facial Norms, adults: women's
            # mandible and chin narrower and shorter, brow ridge flatter, nose narrower, lips fuller for the face; the
            # owner, 2026-11-01: clear, realistic dimorphism, Rocketbox's own women as the style)
            if sex == 'f' and sid in FEMALE_SIDE:
                fs = FEMALE_SIDE[sid]
                lo, hi = (lo, hi * fs) if fs < 1 else (lo * (2 - fs), hi)
            u = rng.uniform(lo, hi) * 0.5
            if abs(u) < 0.05: continue
            sides = pr.SIDES.get(sid, ('decr', 'incr'))
            sliders[f'{sid}-{sides[1] if u > 0 else sides[0]}'] = round(abs(u), 3)
        # hair (owner, 2026-11-01: afros are an uncommon cut, not to be overemphasised): the base's own hair where it is
        # short, tied back or a bun (its cards and painted hair take the people's colour), else the scalp rebuilt as a
        # short natural crop; an afro rarely, and small
        r = rng.random()
        if sex == 'f':
            graft = None if r < 0.85 else ('-' if r < 0.95 else 'Female_Party_02')
        else:
            graft = None if r < 0.55 else '-'
        j = {'name': f'{people}_{sex}_{k}', 'people': people, 'sex': sex, 'base': base, 'base_people': lab, 'source': pr.SOURCE.get(lab, 'White'),
             'sliders': sliders, 'eyes': 'dark', 'iris_shift': round(rng.uniform(-0.3, 0.3), 2),
             'hide': ','.join(pr.GEAR_OFF) if base in review.get('gear_off', []) else '',
             'spec': spec, 'tone': 0.7, 'undertone': 0.0, 'hair': people, 'note': f'face FFHQ-UV {k}, age {int(faces[k].get("age") or 0)}',
             'ffhq': os.path.join(faces_dir, f'{k}.png')}
        if graft: j['graft'] = graft; j['graft_keep_tex'] = graft != '-'; j['graft_volume'] = round(rng.choice([0.5, 0.6, 0.75]), 2)
        jobs.append(j)
    json.dump({'jobs': jobs}, open(manifest, 'w'), indent=1)
    print(len(jobs), 'jobs;', 'bases', {s: len(bases[s]) for s in 'fm'})


if __name__ == '__main__':
    a = sys.argv[1:]
    main(a[0], a[1], a[2], a[3], int(a[4]) if len(a) > 4 else None)
