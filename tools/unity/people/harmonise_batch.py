"""Many harmonised people at once, for QA (owner, 2026-11-01: "show me much more so I can QA your outputs and how your
edits affect other demographics"): for each of the game's ancestries and both sexes, people made from distinct Rocketbox
bases nearest the target (people_recipes.BASES), each with their own recipe draw (people_recipes.recipe); built
(harmonise.py), retoned (retone.py), rendered in the studio (studio_render.py) and then removed, keeping the renders and a
manifest of what each person is made of.
Usage: python3 harmonise_batch.py <plan|run> <manifest.json> [worker index] [workers]
  plan: writes the job list; run: does this worker's share of it."""
import json, os, random, subprocess, sys, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import people_recipes as pr
import retone as rt

HERE = os.path.dirname(os.path.abspath(__file__))
S = os.environ.get('SF_SCRATCH', '/tmp/claude-0/-home-user/891e7928-2458-548c-9e38-7a3ba8987a12/scratchpad')
BLENDER = f'{S}/blender/blender-4.5.9-linux-x64/blender'
PY = f'{S}/venv/bin/python'
PER = 6
NO_DRAW = {'eye-scale'}
PEOPLES = ['latin_american', 'indigenous_american', 'mediterranean', 'west_african', 'east_african', 'east_asian', 'southeast_asian', 'pacific']


def plan(manifest):
    anc = json.load(open(os.path.join(HERE, 'data', 'rocketbox_ancestry.json')))['ancestry']
    ages = json.load(open(os.path.join(HERE, 'data', 'rocketbox_ages.json')))
    out_skin, beards = set(ages.get('skin_out', [])), set(ages.get('beard', []))
    gear = json.load(open(os.path.join(HERE, 'data', 'rocketbox_gear.json')))['gear']
    rv = os.path.join(HERE, 'data', 'rocketbox_review.json')
    review = json.load(open(rv)) if os.path.exists(rv) else {}
    hair_of = json.load(open(os.path.join(HERE, 'data', 'rocketbox_hair.json')))['hair']
    # a face the library dresses more than once (rocketbox_identities.py) is one base: its uses are counted together,
    # and of its people the one whose face is bare as shipped is taken before one whose gear has to come off
    ident = {n: g[0] for g in review.get('identities', []) for n in g}
    used = {}                                              # face -> the peoples it already serves
    limits = json.load(open(os.path.join(HERE, 'data', 'rocketbox_features.json')))['faces']
    groups = __import__('numpy').load(f'{S}/valid/groups.npz')
    rng = random.Random(20261101)
    jobs = []
    # the bases are given out by nearness first: every people takes the faces of its own (by-eye) people before any
    # people takes another's as a fallback (so a Latin American face goes to Latin Americans before it serves as a
    # stand-in for anyone), then the next-nearest, and so on; within one step the scarcest peoples choose first (ORDER)
    ranks = max(len(v) for v in pr.BASES.values()) + 1
    made = {(a, sex): 0 for a in pr.ORDER for sex in 'fm'}
    for rank in range(ranks):
        for a in pr.ORDER:
            labs = [a] if rank == 0 else pr.BASES[a][rank - 1:rank]
            if not labs or (rank > 0 and labs[0] == a): continue
            lab = labs[0]
            for sex in 'fm':
                pool = [n for n, l in sorted(anc.items()) if l.rstrip('?') == lab and ('Female' in n) == (sex == 'f') and n not in out_skin
                        and os.path.exists(f'{S}/rbpop/fbx/{n}.fbx') and os.path.isdir(f'{S}/rblib/{n}') and pr.base_ok(n, a, gear, beards, review, hair_of)]
                pool.sort(key=lambda n: n in review.get('gear_off', []))
                faces = {}
                for n in pool: faces.setdefault(ident.get(n, n), n)
                pool = [n for f, n in sorted(faces.items())]
                rng.shuffle(pool)
                for base in pool:
                    if made[(a, sex)] >= PER: break
                    f = ident.get(base, base)
                    if len(used.get(f, [])) >= pr.MAX_USES or a in used.get(f, []) or not all(any(a in g and u in g for g in pr.RELATED) for u in used.get(f, [])): continue
                    spec, tone, und, hair, eyes, note = pr.recipe(a, rng)
                    if any((g.split(':')[0].replace('V.', 'V:', 1) if g.startswith('V.') else f'mean:{g.split(":")[0]}_{sex}') not in groups.files
                           for g in spec.split('+')): break
                    # a dark photograph is never lightened by more than a third
                    if rt.cheek_lab(tone, und)[0] / rt.cheek_lab(pr.TONE[lab], pr.UNDERTONE.get(lab, 0))[0] > 1.33: continue
                    name = f'{a}_{sex}_{made[(a, sex)] + 1}'; used.setdefault(f, []).append(a)
                    # this person's own draw of the calibrated sliders: up to half of each one's reach from this face
                    lim = limits.get(base, {}).get('limits', {})
                    sliders = {}
                    for sid, (lo, hi) in lim.items():
                        u = rng.uniform(lo, hi) * 0.5
                        # (not the eyes' size: it opens or closes the lids round an eyeball that keeps its size)
                        if sid in NO_DRAW: continue
                        if abs(u) < 0.05: continue
                        sides = pr.SIDES.get(sid, ('decr', 'incr'))
                        sliders[f'{sid}-{sides[1] if u > 0 else sides[0]}'] = round(abs(u), 3)
                    # the eyes: dark, or the base's own where it falls among the people's light-eyed share (retone.LIGHT_EYES)
                    eyes_draw = 'own' if rng.random() < rt.LIGHT_EYES.get(hair, 0.01) else 'dark'
                    jobs.append({'name': name, 'people': a, 'sex': sex, 'base': base, 'base_people': lab, 'source': pr.SOURCE[lab], 'sliders': sliders,
                                 'eyes': eyes_draw, 'iris_shift': round(rng.uniform(-0.3, 0.4), 2),
                                 'hide': ','.join(pr.GEAR_OFF) if base in review.get('gear_off', []) else '',
                                 'spec': spec, 'tone': round(tone, 3), 'undertone': round(und, 3), 'hair': hair, 'note': note})
                    made[(a, sex)] += 1
    for k, v in made.items(): print(*k, v)
    jobs.sort(key=lambda j: (pr.ORDER.index(j['people']), j['sex'], j['name']))
    json.dump({'jobs': jobs}, open(manifest, 'w'), indent=1)
    print(len(jobs), 'jobs')


def run(manifest, k, n):
    jobs = json.load(open(manifest))['jobs'][k::n]
    rdir = f'{S}/hq/render'; os.makedirs(rdir, exist_ok=True)
    env = dict(os.environ, SF_SCALE='75', SF_SAMPLES='24', SF_THREADS=str(max(1, 4 // n)))
    for j in jobs:
        sig = f'{rdir}/{j["name"]}.job.json'               # a person is made again only when their recipe changed
        if os.path.exists(f'{rdir}/{j["name"]}_three.png') and os.path.exists(sig) and json.load(open(sig)) == j: continue
        out = f'{S}/hq/{j["name"]}'
        sculpt = f'{S}/rblib/{j["base"]}/{j["base"]}_sculpt.fbx'
        if not os.path.exists(sculpt):
            player = f'{HERE}/../../../unity/Assets/SecondFace/People/Player/player_{"f" if j["sex"] == "f" else "m"}.fbx'
            subprocess.run([BLENDER, '-b', '--python', f'{HERE}/rocketbox_sculpt.py', '--', player, f'{S}/rbpop/fbx/{j["base"]}.fbx', sculpt], capture_output=True, text=True)
        henv = dict(os.environ, HARM_SLIDERS=json.dumps(j.get('sliders', {})), HARM_HIDE=j.get('hide', ''))
        r = subprocess.run([BLENDER, '-b', '--python', f'{HERE}/harmonise.py', '--', sculpt if os.path.exists(sculpt) else f'{S}/rbpop/fbx/{j["base"]}.fbx',
                            f'{S}/valid/groups.npz', j['sex'], j['source'], j['spec'], out, j['name']], capture_output=True, text=True, env=henv)
        if not os.path.exists(f'{out}/{j["name"]}.fbx'): print('harmonise failed', j['name'], r.stdout[-400:], r.stderr[-400:]); continue
        # a real photographed face (ffhq_bake.py): baked into this head's layout, harmonised, and the tone that puts the
        # rest of the skin at the face's colour; retone.py composites it (RT_BAKE)
        renv = dict(os.environ); tone, und = str(j['tone']), str(j['undertone'])
        if j.get('ffhq'):
            fenv = dict(os.environ, FFHQ_TOPO=f'{S}/ffhq/topo', FFHQ_MASKS=f'{S}/ffhq')
            r = subprocess.run([BLENDER, '-b', '--python', f'{HERE}/ffhq_bake.py', '--', f'{out}/{j["name"]}.fbx', f'{S}/rblib/{j["base"]}', j['ffhq'], out],
                               capture_output=True, text=True, env=fenv)
            if not os.path.exists(f'{out}/ffhq_map.npz'): print('bake failed', j['name'], r.stdout[-300:], r.stderr[-300:]); continue
            head_tex = next(f'{S}/rblib/{j["base"]}/{f}' for f in os.listdir(f'{S}/rblib/{j["base"]}') if f.endswith('_head_color.jpg'))
            r = subprocess.run([PY, f'{HERE}/ffhq_bake_finish.py', out, j['ffhq'], head_tex], capture_output=True, text=True)
            fj = json.load(open(f'{out}/ffhq.json')); tone, und = str(fj['tone']), str(fj['undertone']); renv['RT_BAKE'] = out
            print(j['name'], 'ffhq', os.path.basename(j['ffhq']), 'baked', fj.get('baked'), 'cheek', fj.get('cheek_lab'))
            os.remove(f'{out}/ffhq_map.npz')
        r = subprocess.run([PY, f'{HERE}/retone.py', f'{S}/rblib/{j["base"]}', f'{out}/{j["name"]}.json', out, j['hair'], '0', tone, und,
                            j.get('eyes', 'dark'), str(j.get('iris_shift', 0.0))], capture_output=True, text=True, env=renv)
        print(j['name'], r.stdout.strip().split('\n')[0][:160])
        # the hairstyle (hair_graft.py): the scalp rebuilt and a donor's hair put on ('-': buzzed), the scalp repainted
        if j.get('graft'):
            g = j['graft']
            donor = '-' if g == '-' else (g if g.endswith('.fbx') or '+' in g else f'{S}/rblib/{g}/{g}.fbx')
            genv = dict(os.environ, GRAFT_SKULL=f'{S}/rblib/Business_Male_04/Business_Male_04.fbx')
            if j.get('graft_keep_tex'): genv['GRAFT_KEEP_TEX'] = '1'
            if j.get('graft_volume'): genv['GRAFT_VOLUME'] = str(j['graft_volume'])
            r = subprocess.run([BLENDER, '-b', '--python', f'{HERE}/hair_graft.py', '--', f'{out}/{j["name"]}.fbx', donor, f'{out}/{j["name"]}.fbx',
                                j.get('hair_hex', '16110d')], capture_output=True, text=True, env=genv)
            if not os.path.exists(f'{out}/{j["name"]}_graft.json'): print('graft failed', j['name'], r.stdout[-300:], r.stderr[-300:])
            else: subprocess.run([PY, f'{HERE}/scalp_paint.py', f'{out}/{j["name"]}_graft.json', out, out], capture_output=True, text=True)
        subprocess.run([BLENDER, '-b', '--python', f'{HERE}/studio_render.py', '--', rdir, f'{out}/{j["name"]}.fbx'], capture_output=True, text=True, env=env)
        shutil.copy(f'{out}/{j["name"]}.json', f'{rdir}/{j["name"]}.json')
        if os.path.exists(f'{rdir}/{j["name"]}_three.png'): json.dump(j, open(sig, 'w'))
        shutil.rmtree(out, ignore_errors=True)


if __name__ == '__main__':
    if sys.argv[1] == 'plan': plan(sys.argv[2])
    else: run(sys.argv[2], int(sys.argv[3]), int(sys.argv[4]))
