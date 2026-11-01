"""A people's made people reviewed against real people and against Rocketbox's other peoples (owner, 2026-11-01: "review
them against photos of real Black people AND against other races' Rocketbox models to test for verisimilitude and
photorealism and coherence with the overall Rocketbox aesthetic standard").
Three sheets, every face framed the same way (the face's landmark box grown a third, 4:5, as the gate's boards do):
- <people>_vs_real: ours (the bases as shipped, then each person made from them) above real people of the same people,
  sex and adult age bands (FairFace, Karkkainen and Joo 2021, CC BY 4.0: the neutral faces nearest each group's median,
  gate/fairface_stats.json), at the same size;
- <people>_vs_rocketbox: ours in a lineup with Rocketbox's own people of the other peoples as shipped, same studio;
- the numbers (a veto only, judged by eye first): each face's ten landmark proportions (gate/landmarks.py, MediaPipe)
  against the real group's 5th-95th percentiles; how far apart the people of one base are against how far apart real
  people of the group are (the same proportions, in the real group's standard deviations); and the apparent sex by
  Levi and Hassner's network (gate/apparent.py's crop and frame), real faces read the same way.
Run with the venv that has mediapipe and onnxruntime (gate/README.md), LD_LIBRARY_PATH at the EGL stubs.
Usage: python3 qa_review.py <people> <library renders> <made renders> <manifest> <FairFace val.parquet> <models dir> <out dir>"""
import io, json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'gate'))
from landmarks import Landmarker, ratios, RATIOS, frontal
from gate import FAIRFACE

FONT = ImageFont.load_default()
CW, CH = 160, 200


def face_crop(im, box):
    """The face's landmark box grown to the frame FairFace's boards use: a third again round the face, 4:5."""
    x0, y0, x1, y1 = box
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2 - (y1 - y0) * 0.06
    hw = (x1 - x0) * 0.68; hh = hw * CH / CW
    return im.crop((int(cx - hw), int(cy - hh), int(cx + hw), int(cy + hh))).resize((CW, CH))


def label(g, x, y, text, w, col=(20, 20, 20), bg=(250, 250, 248)):
    g.rectangle((x, y, x + w - 1, y + 11), fill=bg); g.text((x + 2, y), text[: w // 6], fill=col, font=FONT)


def main(people, lib, made, manifest, parquet, models, out):
    import pyarrow.parquet as pq, onnxruntime as ort
    from apparent import crop as net_crop, frame_of, framed
    os.makedirs(out, exist_ok=True)
    F = json.load(open(os.path.join(HERE, 'gate', 'fairface_stats.json')))
    anc = json.load(open(os.path.join(HERE, 'data', 'rocketbox_ancestry.json')))['ancestry']
    ages = json.load(open(os.path.join(HERE, 'data', 'rocketbox_ages.json')))
    gear = json.load(open(os.path.join(HERE, 'data', 'rocketbox_gear.json')))['gear']
    review = json.load(open(os.path.join(HERE, 'data', 'rocketbox_review.json')))
    ident = {n: g[0] for g in review.get('identities', []) for n in g}
    jobs = [j for j in json.load(open(manifest))['jobs'] if j['people'] == people and os.path.exists(os.path.join(made, f'{j["name"]}_front.png'))]
    lm = Landmarker(os.path.join(models, 'face_landmarker.task'))
    age_net = ort.InferenceSession(os.path.join(models, 'age_googlenet.onnx'))
    sex_net = ort.InferenceSession(os.path.join(models, 'gender_googlenet.onnx'))
    fr = frame_of(F['boxes'].values())
    MIDS = np.array([1, 5, 10, 17.5, 28.5, 40.5, 50.5, 70.0])

    def read(im, box, ours):
        x = net_crop(framed(im, box, fr) if ours else im, box, 0.6)
        return float(age_net.run(None, {'input': x})[0][0] @ MIDS), float(sex_net.run(None, {'input': x})[0][0][1])

    def measure(path, sex, ours=True):
        im = Image.open(path).convert('RGB'); r = lm(np.asarray(im))
        if r is None: return None
        P, ang = r
        box = [float(v) for v in (*P[:, :2].min(0), *P[:, :2].max(0))]
        a, pf = read(im, box, ours)
        return {'img': face_crop(im, box), 'ratios': ratios(P), 'pose': ang, 'frontal': frontal(ang), 'age': a, 'p_female': pf, 'sex': sex}

    # ours: the bases as shipped, then the people made from them
    bases = sorted({j['base'] for j in jobs}, key=lambda b: ('Female' not in b, b))
    ours = []
    for b in bases:
        m = measure(os.path.join(lib, f'{b}_front.png'), 'f' if 'Female' in b else 'm')
        if m: m.update(name=b, kind='base', base=b); ours.append(m)
    for j in sorted(jobs, key=lambda j: (j['sex'] != 'f', j['name'])):
        m = measure(os.path.join(made, f'{j["name"]}_front.png'), j['sex'])
        if m: m.update(name=j['name'], kind='made', base=j['base'], note=j.get('note', '')); ours.append(m)
    # Rocketbox's own people of the other peoples, as shipped: adults 20-49 with bare faces, one per face, spread over peoples
    others = {'f': [], 'm': []}
    for sex in 'fm':
        by = {}
        for n, l in sorted(anc.items()):
            l = l.rstrip('?')
            if l in ('west_african', 'east_african', 'unsure', 'unseen', 'masked') or 'Child' in n or ('Female' in n) != (sex == 'f'): continue
            if not 20 <= ages['ages'].get(n, 0) < 50 or n in ages.get('skin_out', []) or any(g in gear.get(n, []) for g in ('helmet', 'hat', 'mask')): continue
            if review.get('people', {}).get(n, {}).get('headwear') or ident.get(n, n) != n: continue
            if os.path.exists(os.path.join(lib, f'{n}_front.png')): by.setdefault(l, []).append(n)
        pick = []
        while len(pick) < 8 and any(by.values()):
            for l in ('north_european', 'mediterranean', 'latin_american', 'east_asian', 'southeast_asian'):
                if by.get(l) and len(pick) < 8: pick.append((l, by[l].pop(len(by[l]) // 2)))
        for l, n in pick:
            m = measure(os.path.join(lib, f'{n}_front.png'), sex)
            if m: m.update(name=n, kind='rocketbox', people=l); others[sex].append(m)
    # real people of the people (FairFace's neutral faces nearest each band's median), and of the other peoples
    t = pq.read_table(parquet, columns=['image'])
    race = FAIRFACE[people]
    real = {'f': [], 'm': []}
    for sex in 'fm':
        idx = []
        for band in ('20-29', '30-39', '40-49'):
            g = F['groups'].get(f'{race}/{sex}/{band}')
            if g: idx += g['board'][:8]
        for i in idx:
            im = Image.open(io.BytesIO(t.column('image')[i].as_py()['bytes'])).convert('RGB')
            box = F['boxes'].get(str(i))
            if not box: continue
            r = lm(np.asarray(im)); a, pf = read(im, box, False)
            real[sex].append({'img': face_crop(im, box), 'ratios': ratios(r[0]) if r else None, 'age': a, 'p_female': pf, 'i': i})

    # the numbers
    rep = {'people': people, 'ours': [], 'others': [], 'real': {}}
    for sex in 'fm':
        g = F['groups'][f'{race}/{sex}/all']
        p5, p50, p95 = (np.array(g[k]) for k in ('p5', 'p50', 'p95'))
        sd = (p95 - p5) / 3.29                                     # the 5th-95th span of a normal is 3.29 sd
        def outside(m):
            # (each named with its side: '-' below the 5th percentile, '+' above the 95th)
            v = np.array([m['ratios'][k] for k in RATIOS])
            return [RATIOS[k] + ('-' if v[k] < p5[k] else '+') for k in range(len(RATIOS)) if v[k] < p5[k] or v[k] > p95[k]]
        def spread(ms):
            V = np.array([[m['ratios'][k] for k in RATIOS] for m in ms if m.get('ratios')]) / sd
            if len(V) < 2: return None
            d = np.linalg.norm(V[:, None] - V[None], axis=2); return round(float(d[np.triu_indices(len(V), 1)].mean()), 2)
        own_sex = lambda m: m['p_female'] if sex == 'f' else 1 - m['p_female']
        for m in [m for m in ours if m['sex'] == sex]:
            m['out'] = outside(m)
            rep['ours'].append({'name': m['name'], 'kind': m['kind'], 'base': m['base'], 'sex': sex, 'outside_real_p5_p95': m['out'],
                                'p_own_sex': round(own_sex(m), 2), 'apparent_age': round(m['age'], 1), 'frontal': bool(m['frontal']),
                                'ratios': {k: round(float(m['ratios'][k]), 4) for k in RATIOS}})
        for m in others[sex]:
            orace = FAIRFACE.get(m['people'], 'white'); og = F['groups'].get(f'{orace}/{sex}/all')
            o5, o95 = np.array(og['p5']), np.array(og['p95']); v = np.array([m['ratios'][k] for k in RATIOS])
            m['out'] = [RATIOS[k] + ('-' if v[k] < o5[k] else '+') for k in range(len(RATIOS)) if v[k] < o5[k] or v[k] > o95[k]]
            rep['others'].append({'name': m['name'], 'people': m['people'], 'sex': sex, 'outside_real_p5_p95': m['out'], 'p_own_sex': round(own_sex(m), 2)})
        rs = [m for m in real[sex] if m['ratios']]
        per_base = {b: spread([m for m in ours if m['base'] == b and m['sex'] == sex]) for b in bases if ('Female' in b) == (sex == 'f')}
        rep['real'][sex] = {'n': len(rs), 'outside_real_p5_p95_mean': round(float(np.mean([len(outside(m)) for m in rs])), 2),
                            'read_as_own_sex': round(float(np.mean([own_sex(m) >= 0.5 for m in rs])), 2),
                            'mean_pairwise_distance_sd': spread(rs), 'ours_per_base_mean_pairwise_distance_sd': per_base,
                            'ours_outside_mean': round(float(np.mean([len(m['out']) for m in ours if m['sex'] == sex])), 2) if any(m['sex'] == sex for m in ours) else None,
                            'ours_read_as_own_sex': round(float(np.mean([own_sex(m) >= 0.5 for m in ours if m['sex'] == sex])), 2) if any(m['sex'] == sex for m in ours) else None,
                            'rocketbox_others_outside_mean': round(float(np.mean([len(m['out']) for m in others[sex]])), 2) if others[sex] else None,
                            'rocketbox_others_read_as_own_sex': round(float(np.mean([own_sex(m) >= 0.5 for m in others[sex]])), 2) if others[sex] else None}
    json.dump(rep, open(os.path.join(out, f'qa_{people}_review.json'), 'w'), indent=1)
    print(json.dumps(rep['real'], indent=1))

    # the sheets
    # (the apparent sex is left off the sheets: the network reads half of FairFace's real Black women as men, so it says
    # nothing about ours; it stays in the numbers)
    def tag(m):
        if m.get('out') is None: return ''
        short = lambda k: k.replace('_face', '').replace('nose_icd', 'nose w').replace('face_hw', 'face h/w').replace('lower', 'lower face')
        return f"{len(m['out'])}/10 out" + (f": {' '.join(short(k) for k in m['out'])}" if m['out'] else '')
    def block(g, s, y, title, ms, cols, kind_col=True):
        g.text((6, y + 2), title, fill=(20, 20, 20), font=FONT); y += 16
        for k, m in enumerate(ms):
            x = (k % cols) * CW; yy = y + (k // cols) * (CH + 26)
            s.paste(m['img'], (x, yy + 13))
            bg = (255, 236, 160) if m.get('kind') == 'base' else (250, 250, 248)
            nm = m.get('name', f"FairFace {m.get('i', '')}").replace('rb_west_african_', '').replace('rb_', '').replace('_Adult', '')
            label(g, x, yy, (f"{m.get('people', '').replace('_european', ' eur').replace('_american', ' am').replace('mediterranean', 'medit').replace('east_asian', 'e asian').replace('southeast_asian', 'se asian')} " if m.get('people') else '') + nm, CW, bg=bg)
            label(g, x, yy + CH + 13, tag(m), CW)
        return y + ((len(ms) + cols - 1) // cols) * (CH + 26) + 6
    for sheet in ('vs_real', 'vs_rocketbox'):
        cols = 8; rows_h = 0; parts = []
        for sex in 'fm':
            mine = [m for m in ours if m['sex'] == sex]
            if not mine: continue
            if sheet == 'vs_real':
                parts.append((f"{'Women' if sex == 'f' else 'Men'}: OURS (yellow = Rocketbox base as shipped; the rest made from it)", mine))
                parts.append((f"{'Women' if sex == 'f' else 'Men'}: REAL Black {'women' if sex == 'f' else 'men'} 20-49 (FairFace, CC BY 4.0: the neutral faces nearest each age band's median, not chosen by us)", real[sex]))
            else:
                mix = []
                o = others[sex]; k = 0
                for i, m in enumerate(mine):
                    mix.append(m)
                    if i % 2 == 1 and k < len(o): mix.append(o[k]); k += 1
                mix += o[k:]
                parts.append((f"{'Women' if sex == 'f' else 'Men'}: ours (Black) in a lineup with Rocketbox's own people of other peoples as shipped (labelled by people), same studio", mix))
        H = 22 + sum(16 + ((len(ms) + cols - 1) // cols) * (CH + 26) + 6 for _, ms in parts)
        s = Image.new('RGB', (cols * CW, H), (236, 234, 230)); g = ImageDraw.Draw(s)
        g.text((6, 5), f"{people.replace('_', ' ')}: {sheet.replace('_', ' ')}. Same framing on every face. Under ours and Rocketbox's: how many of 10 face proportions fall outside real people of that people and sex (FairFace 5-95th pct; - below, + above).", fill=(20, 20, 20), font=FONT)
        y = 22
        for title, ms in parts: y = block(g, s, y, title, ms, cols)
        p = os.path.join(out, f'qa_{people}_{sheet}.jpg'); s.save(p, quality=88); print('wrote', p, s.size)


if __name__ == '__main__':
    main(*sys.argv[1:8])
