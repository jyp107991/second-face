"""QA contact sheets at scale (owner, 2026-11-01: "show me much more so I can QA your outputs and how your edits affect
other demographics"), from studio_render.py's renders:
- library: every Rocketbox person (front), grouped by ancestry as judged by eye (data/rocketbox_ancestry.json, '?' unsure),
  then by age (data/rocketbox_ages.json): women, men and children on their own sheets;
- harmonised: every harmonised person (harmonise_batch.py) beside the Rocketbox person it was made from, with its recipe
  (people, base, VALID mixture, the country draw for Latin Americans, skin tone): one sheet per two peoples;
- sliders: each of the slider QA people at the calibrated limits (front for widths, side for profiles).
Usage: python3 qa_sheets.py <library renders> <harmonised renders> <slider renders> <manifest.json> <slider variants.json> <out dir>"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = ImageFont.load_default()
CROP = {'front': (42, 15, 342, 390), 'three': (42, 15, 342, 390), 'side': (90, 30, 384, 397)}   # (75 % renders, 384 x 480)


def tile(path, view, w, h):
    if not os.path.exists(path): return Image.new('RGB', (w, h), (80, 80, 80))
    im = Image.open(path).convert('RGB')
    sx = im.width / 384.0
    c = tuple(int(v * sx) for v in CROP[view])
    return im.crop(c).resize((w, h))


def label(g, x, y, text, w):
    g.rectangle((x, y, x + w, y + 12), fill=(250, 250, 248)); g.text((x + 2, y), text[: w // 6], fill=(20, 20, 20), font=FONT)


def library(lib, out):
    anc = json.load(open(os.path.join(HERE, 'data', 'rocketbox_ancestry.json')))['ancestry']
    ages = json.load(open(os.path.join(HERE, 'data', 'rocketbox_ages.json')))['ages']
    names = sorted(f[:-10] for f in os.listdir(lib) if f.endswith('_front.png'))
    # people who share one face (rocketbox_identities.py) carry the same mark, =1, =2, ...
    rv = json.load(open(os.path.join(HERE, 'data', 'rocketbox_review.json')))
    same = {n: i + 1 for i, g in enumerate(rv.get('identities', [])) for n in g}
    order = ['north_european', 'mediterranean', 'latin_american', 'east_asian', 'southeast_asian', 'west_african', 'unsure', 'unseen', 'masked']
    for who, test in (('women', lambda n: 'Female' in n and 'Child' not in n), ('men', lambda n: 'Male' in n and 'Child' not in n), ('children', lambda n: 'Child' in n)):
        ns = [n for n in names if test(n)]
        ns.sort(key=lambda n: (order.index(anc.get(n, 'unsure').rstrip('?')) if anc.get(n, 'unsure').rstrip('?') in order else 99, anc.get(n, '').endswith('?'), ages.get(n, 0)))
        cols, w, h = 10, 150, 188
        rows = (len(ns) + cols - 1) // cols
        s = Image.new('RGB', (cols * w, 22 + rows * (h + 14)), (236, 234, 230)); g = ImageDraw.Draw(s)
        faces = len({same.get(n, n) for n in ns})
        g.text((6, 5), f'Rocketbox {who}, as they ship ({len(ns)} people, {faces} distinct faces: =n marks people who share one face), same studio: grouped by ancestry judged by eye (? = unsure), then age judged by eye', fill=(20, 20, 20), font=FONT)
        for i, n in enumerate(ns):
            x, y = (i % cols) * w, 22 + (i // cols) * (h + 14)
            s.paste(tile(os.path.join(lib, f'{n}_front.png'), 'front', w, h), (x, y + 12))
            label(g, x, y, f'{anc.get(n, "?").replace("_european", " eur").replace("_american", " am").replace("_african", " afr").replace("mediterranean", "medit").replace("southeast_asian", "se asian").replace("east_asian", "e asian")} {ages.get(n, "")} {n.split("_")[0][:4]}{n.split("_")[-1]}{" =" + str(same[n]) if n in same else ""}', w)
        p = os.path.join(out, f'qa_library_{who}.jpg'); s.save(p, quality=84); print('wrote', p, s.size)


def harmonised(lib, hq, manifest, out):
    jobs = json.load(open(manifest))['jobs']
    peoples = []
    for j in jobs:
        if j['people'] not in peoples: peoples.append(j['people'])
    for k in range(0, len(peoples), 2):
        pair = peoples[k:k + 2]
        sel = [j for j in jobs if j['people'] in pair and os.path.exists(os.path.join(hq, f'{j["name"]}_front.png'))]
        sel.sort(key=lambda j: (pair.index(j['people']), j['sex'], j['name']))
        if not sel: continue
        w, h = 150, 188; per = 3; cols = 3                       # each person: base | result front | result three
        rows = (len(sel) + cols - 1) // cols
        s = Image.new('RGB', (cols * per * w, 22 + rows * (h + 26)), (236, 234, 230)); g = ImageDraw.Draw(s)
        g.text((6, 5), f'Harmonised {" and ".join(p.replace("_", " ") for p in pair)}: each person beside the Rocketbox person made into them (left, as shipped). Same studio.', fill=(20, 20, 20), font=FONT)
        for i, j in enumerate(sel):
            x, y = (i % cols) * per * w, 22 + (i // cols) * (h + 26)
            s.paste(tile(os.path.join(lib, f'{j["base"]}_front.png'), 'front', w, h), (x, y + 24))
            s.paste(tile(os.path.join(hq, f'{j["name"]}_front.png'), 'front', w, h), (x + w, y + 24))
            s.paste(tile(os.path.join(hq, f'{j["name"]}_three.png'), 'three', w, h), (x + 2 * w, y + 24))
            mix = j['spec'].replace('+', ' ').replace(':', ' ')
            label(g, x, y, f'{j["name"].replace("_american", "").replace("_african", "")} <- {j["base"].replace("_Adult", "")}', per * w)
            label(g, x, y + 12, f'{j["note"] or mix}  tone {j["tone"]:+.2f}  eyes {j.get("eyes", "dark")}{"  gear off" if j.get("hide") else ""}', per * w)
        p = os.path.join(out, f'qa_harmonised_{"_".join(pair)}.jpg'); s.save(p, quality=84); print('wrote', p, s.size)


def real(lib, hq, manifest, faces_dir, out, name='qa_real_faces'):
    """People with real photographed faces (ffhq_bake.py): the Rocketbox base as shipped | the photograph's texture
    (FFHQ-UV, the face's centre) | the person from the front | at three-quarters."""
    jobs = [j for j in json.load(open(manifest))['jobs'] if j.get('ffhq') and os.path.exists(os.path.join(hq, f'{j["name"]}_front.png'))]
    if not jobs: return
    w, h = 150, 188; per = 4; cols = 3
    rows = (len(jobs) + cols - 1) // cols
    s = Image.new('RGB', (cols * per * w, 22 + rows * (h + 26)), (236, 234, 230)); g = ImageDraw.Draw(s)
    g.text((6, 5), f'Real faces ({len(jobs)}): Rocketbox base as shipped | the photograph (FFHQ-UV texture) | the person, front | three-quarters. Same studio.', fill=(20, 20, 20), font=FONT)
    for i, j in enumerate(jobs):
        x, y = (i % cols) * per * w, 22 + (i // cols) * (h + 26)
        s.paste(tile(os.path.join(lib, f'{j["base"]}_front.png'), 'front', w, h), (x, y + 24))
        ph = Image.open(os.path.join(faces_dir, os.path.basename(j['ffhq']))).convert('RGB').crop((290, 210, 734, 766)).resize((w, h))
        s.paste(ph, (x + w, y + 24))
        s.paste(tile(os.path.join(hq, f'{j["name"]}_front.png'), 'front', w, h), (x + 2 * w, y + 24))
        s.paste(tile(os.path.join(hq, f'{j["name"]}_three.png'), 'three', w, h), (x + 3 * w, y + 24))
        label(g, x, y, f'{j["name"]} <- {j["base"].replace("_Adult", "")}  shape {j["spec"]}', per * w)
        label(g, x, y + 12, f'{j["note"]}  hair {j.get("graft", "own")} {j.get("graft_volume", "")}', per * w)
    p = os.path.join(out, f'{name}.jpg'); s.save(p, quality=86); print('wrote', p, s.size)


def variations(lib, hq, manifest, out, name='qa_variations'):
    """Variations off Rocketbox's own bases (rb_variations.py): each base as it ships (front and three-quarters) at the
    head of its rows, then each person made from it: front | three-quarters, with what was varied."""
    jobs = [j for j in json.load(open(manifest))['jobs'] if os.path.exists(os.path.join(hq, f'{j["name"]}_front.png'))]
    if not jobs: return
    w, h = 150, 188; cols = 5                                    # a base, then four people a row (two tiles each)
    rows = []
    for base in sorted({j['base'] for j in jobs}, key=lambda b: ('Female' not in b, b)):
        js = [j for j in jobs if j['base'] == base]
        for k in range(0, len(js), cols - 1): rows.append((base, js[k:k + cols - 1]))
    s = Image.new('RGB', (cols * 2 * w, 22 + len(rows) * (h + 26)), (236, 234, 230)); g = ImageDraw.Draw(s)
    g.text((6, 5), f'Variations off Rocketbox\'s own bases ({len(jobs)} people): the base as it ships (left pair), then the people made from it, front | three-quarters, own textures kept. Same studio.', fill=(20, 20, 20), font=FONT)
    for r, (base, js) in enumerate(rows):
        y = 22 + r * (h + 26)
        s.paste(tile(os.path.join(lib, f'{base}_front.png'), 'front', w, h), (0, y + 24))
        s.paste(tile(os.path.join(lib, f'{base}_three.png'), 'three', w, h), (w, y + 24))
        label(g, 0, y, f'{base} as shipped', 2 * w)
        for i, j in enumerate(js):
            x = (i + 1) * 2 * w
            s.paste(tile(os.path.join(hq, f'{j["name"]}_front.png'), 'front', w, h), (x, y + 24))
            s.paste(tile(os.path.join(hq, f'{j["name"]}_three.png'), 'three', w, h), (x + w, y + 24))
            label(g, x, y, j['name'].replace('rb_', '').replace('_african', ''), 2 * w)
            label(g, x, y + 12, j['note'], 2 * w)
    p = os.path.join(out, f'{name}.jpg'); s.save(p, quality=86); print('wrote', p, s.size)


def sliders(slr, variants, out):
    V = json.load(open(variants))
    view_of = lambda tag: 'side' if tag.split('_')[0] in ('chin-height', 'chin-prominent', 'mouth-lowerlip-volume') else 'front'
    rv = json.load(open(os.path.join(HERE, 'data', 'rocketbox_review.json')))
    same = {n: g[0] for g in rv.get('identities', []) for n in g}
    for who, test in (('women', lambda n: 'Female' in n), ('men', lambda n: 'Male' in n)):
        heads, seen = [], set()
        for n in V:                                       # one row per face (rocketbox_identities.py)
            f = same.get(n.replace('_sculpt', ''), n)
            if test(n) and f not in seen and os.path.exists(os.path.join(slr, f'{n}_base_front.png')): seen.add(f); heads.append(n)
        if not heads: continue
        tags = list(V[heads[0]])
        cols = [('base', 'front'), ('base', 'side')] + [(t, view_of(t)) for t in tags if t != 'base']
        w, h = 120, 150
        s = Image.new('RGB', (len(cols) * w, 34 + len(heads) * (h + 2)), (236, 234, 230)); g = ImageDraw.Draw(s)
        g.text((6, 4), f'Sliders at their calibrated limits on more {who} (each slider alone; the number = units): chin and lower lip in profile, widths from the front', fill=(20, 20, 20), font=FONT)
        for c, (t, v) in enumerate(cols): g.text((c * w + 3, 20), t.replace('-volume', '').replace('-scale-horiz', ' width'), fill=(40, 40, 40), font=FONT)
        for r, n in enumerate(heads):
            y = 34 + r * (h + 2)
            for c, (t, v) in enumerate(cols):
                p = os.path.join(slr, f'{n}_{t}_{v}.png')
                s.paste(tile(p, v, w, h), (c * w, y))
                if t != 'base':
                    u = list(V[n][t].values())[0]
                    label(g, c * w, y + h - 12, f'{"-" if t.endswith("_lo") else "+"}{abs(u):.2f}', 40)
                elif c == 0: label(g, 0, y, n.replace('_sculpt', '').replace('_Adult', ''), w)
        p = os.path.join(out, f'qa_sliders_{who}.jpg'); s.save(p, quality=84); print('wrote', p, s.size)


if __name__ == '__main__':
    lib, hq, slr, manifest, variants, out = sys.argv[1:7]
    os.makedirs(out, exist_ok=True)
    if os.path.isdir(lib): library(lib, out)
    if os.path.isdir(hq): harmonised(lib, hq, manifest, out)
    if os.path.isdir(slr): sliders(slr, variants, out)
