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
PEOPLES = ['latin_american', 'indigenous_american', 'mediterranean', 'west_african', 'east_african', 'east_asian', 'southeast_asian', 'pacific']


def plan(manifest):
    anc = json.load(open(os.path.join(HERE, 'data', 'rocketbox_ancestry.json')))['ancestry']
    ages = json.load(open(os.path.join(HERE, 'data', 'rocketbox_ages.json')))
    out_skin, beards = set(ages.get('skin_out', [])), set(ages.get('beard', []))
    gear = json.load(open(os.path.join(HERE, 'data', 'rocketbox_gear.json')))['gear']
    groups = __import__('numpy').load(f'{S}/valid/groups.npz')
    rng = random.Random(20261101)
    jobs = []
    for a in PEOPLES:
        for sex in 'fm':
            cands = []
            for lab in pr.BASES[a]:
                pool = [n for n, l in sorted(anc.items()) if l.rstrip('?') == lab and ('Female' in n) == (sex == 'f') and n not in out_skin
                        and os.path.exists(f'{S}/rbpop/fbx/{n}.fbx') and os.path.isdir(f'{S}/rblib/{n}') and pr.base_ok(n, a, gear, beards)]
                rng.shuffle(pool); cands += [(n, lab) for n in pool]
            made = 0
            for base, lab in cands:
                if made >= PER: break
                spec, tone, und, hair, eyes, note = pr.recipe(a, rng)
                if any(f'mean:{g.split(":")[0]}_{sex}' not in groups.files for g in spec.split('+')): break
                # a dark photograph is never lightened by more than a third
                if rt.cheek_lab(tone, und)[0] / rt.cheek_lab(pr.TONE[lab], pr.UNDERTONE.get(lab, 0))[0] > 1.33: continue
                name = f'{a}_{sex}_{made + 1}'
                jobs.append({'name': name, 'people': a, 'sex': sex, 'base': base, 'base_people': lab, 'source': pr.SOURCE[lab],
                             'spec': spec, 'tone': round(tone, 3), 'undertone': round(und, 3), 'hair': hair, 'note': note})
                made += 1
            print(a, sex, made, 'of', len(cands), 'bases')
    json.dump({'jobs': jobs}, open(manifest, 'w'), indent=1)
    print(len(jobs), 'jobs')


def run(manifest, k, n):
    jobs = json.load(open(manifest))['jobs'][k::n]
    rdir = f'{S}/hq/render'; os.makedirs(rdir, exist_ok=True)
    env = dict(os.environ, SF_SCALE='75', SF_SAMPLES='24', SF_THREADS=str(max(1, 4 // n)))
    for j in jobs:
        if os.path.exists(f'{rdir}/{j["name"]}_three.png'): continue
        out = f'{S}/hq/{j["name"]}'
        r = subprocess.run([BLENDER, '-b', '--python', f'{HERE}/harmonise.py', '--', f'{S}/rbpop/fbx/{j["base"]}.fbx', f'{S}/valid/groups.npz',
                            j['sex'], j['source'], j['spec'], out, j['name']], capture_output=True, text=True)
        if not os.path.exists(f'{out}/{j["name"]}.fbx'): print('harmonise failed', j['name'], r.stdout[-400:], r.stderr[-400:]); continue
        r = subprocess.run([PY, f'{HERE}/retone.py', f'{S}/rblib/{j["base"]}', f'{out}/{j["name"]}.json', out, j['hair'], '0', str(j['tone']), str(j['undertone'])], capture_output=True, text=True)
        print(j['name'], r.stdout.strip().split('\n')[0][:160])
        subprocess.run([BLENDER, '-b', '--python', f'{HERE}/studio_render.py', '--', rdir, f'{out}/{j["name"]}.fbx'], capture_output=True, text=True, env=env)
        shutil.copy(f'{out}/{j["name"]}.json', f'{rdir}/{j["name"]}.json')
        shutil.rmtree(out, ignore_errors=True)


if __name__ == '__main__':
    if sys.argv[1] == 'plan': plan(sys.argv[2])
    else: run(sys.argv[2], int(sys.argv[3]), int(sys.argv[4]))
