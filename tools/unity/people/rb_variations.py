"""Variations off Rocketbox's own bases (owner, 2026-11-01, after the real-face bakes were rejected: "photo 3 [Business_Female_01
as shipped] is the only human-looking model; find the best way to adhere to photo 3 / Rocketbox style: make variations off
the Rocketbox / photo 3 base; do not make your own assets from scratch; leave other races alone").
Each person is one of the library's own people of the target people (data/rocketbox_ancestry.json; the gear off where it
comes off), keeping that person's own textures as photographed (skin, hair, brows, irises), and varied only in ways that
keep them Rocketbox's:
- the shape: their own draw of the calibrated sliders (half of each one's reach from that face; a woman's draw on the
  female side of the features that differ by sex, ffhq_plan.FEMALE_SIDE); and for half of them a share (0.3-0.55) of one
  VALID person's difference from their group's mean (harmonise.py spec 'V.Black_F_2:0.4+Black:0.6'), shape only, the face
  only, lids held: a real individual's proportions, not a face swap;
- the skin: the base's own, shifted a little in tone either way on its own photograph (retone.py 'own');
- the hair: the base's own (most), cropped (hair_graft.py '-'), or rarely Rocketbox's afro at a small volume (the owner:
  an uncommon cut, not to be overemphasised).
Writes a harmonise_batch.py manifest; qa_sheets.variations lays each person beside the base as shipped.
Usage: python3 rb_variations.py <people> <manifest out> [<per sex>] [<seed>]"""
import json, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import people_recipes as pr
import harmonise_batch as hb
from ffhq_plan import FEMALE_SIDE

HERE = os.path.dirname(os.path.abspath(__file__))
S = hb.S
# the VALID people of each people, by sex (shape targets); the library's own faces of the people come from the ancestry labels
VALID_PEOPLE = {'west_african': {'f': ['V.Black_F_1', 'V.Black_F_2', 'V.Black_F_3'], 'm': ['V.Black_M_1', 'V.Black_M_2', 'V.Black_M_3']}}
AFRO = 'Female_Party_02'


def draw_sliders(limits, sex, rng, reach=0.5):
    sliders = {}
    for sid, (lo, hi) in limits.items():
        if sid in hb.NO_DRAW: continue
        if sex == 'f' and sid in FEMALE_SIDE:
            fs = FEMALE_SIDE[sid]
            lo, hi = (lo, hi * fs) if fs < 1 else (lo * (2 - fs), hi)
        u = rng.uniform(lo, hi) * reach
        if abs(u) < 0.05: continue
        sides = pr.SIDES.get(sid, ('decr', 'incr'))
        sliders[f'{sid}-{sides[1] if u > 0 else sides[0]}'] = round(abs(u), 3)
    return sliders


def main(people, manifest, per=10, seed=20261101):
    anc = json.load(open(os.path.join(HERE, 'data', 'rocketbox_ancestry.json')))['ancestry']
    ages = json.load(open(os.path.join(HERE, 'data', 'rocketbox_ages.json')))
    out_skin = set(ages.get('skin_out', []))
    gear = json.load(open(os.path.join(HERE, 'data', 'rocketbox_gear.json')))['gear']
    review = json.load(open(os.path.join(HERE, 'data', 'rocketbox_review.json')))
    hair_of = json.load(open(os.path.join(HERE, 'data', 'rocketbox_hair.json')))['hair']
    limits = json.load(open(os.path.join(HERE, 'data', 'rocketbox_features.json')))['faces']
    ident = {n: g[0] for g in review.get('identities', []) for n in g}
    rng = random.Random(seed)
    jobs = []
    for sex in 'fm':
        # the library's own faces of this people (judged by eye, '?' included: the owner's photo 3 is one), one per face,
        # the one whose face is bare as shipped before one whose gear has to come off
        pool = [n for n, l in sorted(anc.items()) if l.rstrip('?') == people and ('Female' in n) == (sex == 'f') and 'Child' not in n
                and n not in out_skin and os.path.exists(f'{S}/rbpop/fbx/{n}.fbx') and os.path.isdir(f'{S}/rblib/{n}')
                and pr.base_ok(n, people, gear, set(ages.get('beard', [])), review, hair_of)]
        pool.sort(key=lambda n: n in review.get('gear_off', []))
        faces = {}
        for n in pool: faces.setdefault(ident.get(n, n), n)
        bases = sorted(faces.values())
        if not bases: print('no base for', people, sex); continue
        for i in range(per):
            base = bases[i % len(bases)]
            lab = anc.get(base, people).rstrip('?')
            lim = limits.get(base, {}).get('limits', {})
            sliders = draw_sliders(lim, sex, rng)
            # the shape: the sliders alone for every other person, else a share of one VALID person's difference
            if i % 2 == 0:
                spec, shape = 'Black' if pr.SOURCE[lab] == 'Black' else pr.SOURCE[lab], 'sliders only'
            else:
                v = rng.choice(VALID_PEOPLE[people][sex]); w = round(rng.uniform(0.3, 0.55), 2)
                spec, shape = f'{v}:{w}+{pr.SOURCE[lab]}:{round(1 - w, 2)}', f'{w} of {v}'
            shift = round(max(-0.12, min(0.10, rng.gauss(0, 0.06))), 3)
            r = rng.random()
            if sex == 'f': graft = None if r < 0.6 else ('-' if r < 0.85 else AFRO)
            else: graft = None if r < 0.6 else '-'
            j = {'name': f'rb_{people}_{sex}_{i + 1:02d}', 'people': people, 'sex': sex, 'base': base, 'base_people': lab, 'source': pr.SOURCE[lab],
                 'sliders': sliders, 'eyes': 'own', 'iris_shift': 0.0, 'hide': ','.join(pr.GEAR_OFF) if base in review.get('gear_off', []) else '',
                 'spec': spec, 'tone': 'own', 'tone_shift': shift, 'undertone': 'own', 'hair': people,
                 'note': f'shape {shape}; tone {shift:+.2f}; hair {"own" if not graft else ("cropped" if graft == "-" else "afro")}'}
            if graft: j['graft'] = graft; j['graft_keep_tex'] = graft != '-'; j['graft_volume'] = 0.5 if graft != '-' else None
            jobs.append(j)
    json.dump({'jobs': jobs}, open(manifest, 'w'), indent=1)
    print(len(jobs), 'jobs; bases', sorted({j['base'] for j in jobs}))


if __name__ == '__main__':
    a = sys.argv[1:]
    main(a[0], a[1], int(a[2]) if len(a) > 2 else 10, int(a[3]) if len(a) > 3 else 20261101)
