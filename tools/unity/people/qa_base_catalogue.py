"""Every base face the game has, one tile per distinct face (Rocketbox dresses some faces more than once:
rocketbox_identities.py), grouped by ancestry (judged by eye, data/rocketbox_ancestry.json) and sex, ordered by age, each
marked with what it can be used for: ok (a base as it ships), gear off (its helmet or mask comes off cleanly), beard (a
bearded man), long hair (loose hair below the ears: not for a Black person), blonde, soot (its skin is dirtied in the
texture), religious (hijab, skullcap or keffiyeh: never a base until a scalp and hair are rebuilt), masked or unseen (no
face to use), and the new Black people built from scans and fixes (data/black_picks_v1.json).
Usage: python3 qa_base_catalogue.py <library renders> <made renders> <out dir>"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 150, 188
CROP = (42, 15, 342, 390)
try: FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 11); BIG = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15)
except Exception: FONT = BIG = ImageFont.load_default()
ORDER = ['west_african', 'east_african', 'north_european', 'mediterranean', 'latin_american', 'east_asian', 'southeast_asian', 'unsure', 'masked', 'unseen']
NAMES = {'west_african': 'Black (West African)', 'north_european': 'North European', 'mediterranean': 'Mediterranean / Middle Eastern',
         'latin_american': 'Latin American', 'east_asian': 'East Asian', 'southeast_asian': 'Southeast Asian', 'unsure': 'Unsure',
         'masked': 'Masked (no face)', 'unseen': 'Unseen (no face)'}


def tile(p):
    im = Image.open(p).convert('RGB'); k = im.width / 384.0
    return im.crop(tuple(int(v * k) for v in CROP)).resize((W, H))


def main(lib, made, out):
    anc = json.load(open(os.path.join(HERE, 'data', 'rocketbox_ancestry.json')))['ancestry']
    ag = json.load(open(os.path.join(HERE, 'data', 'rocketbox_ages.json')))
    rv = json.load(open(os.path.join(HERE, 'data', 'rocketbox_review.json')))
    hair = json.load(open(os.path.join(HERE, 'data', 'rocketbox_hair.json')))['hair']
    gear = json.load(open(os.path.join(HERE, 'data', 'rocketbox_gear.json')))['gear']
    groups = {}
    for g in rv.get('identities', []): groups[g[0]] = g
    seen, faces = set(), []
    for n in sorted(anc):
        if 'Child' in n: continue
        g = next((v for v in groups.values() if n in v), [n])
        if g[0] in seen: continue
        seen.add(g[0])
        # the face as it is best seen: bare as it ships before one whose gear comes off, clean skin before soot
        hw = lambda m: any(x in gear.get(m, []) for x in ('helmet', 'hat', 'mask')) or rv.get('people', {}).get(m, {}).get('headwear') in ('hat', 'cap', 'hood', 'helmet')
        g = sorted(g, key=lambda m: (hw(m) and m not in rv.get('gear_off', []), m in ag.get('skin_out', []), m in rv.get('gear_off', []), not os.path.exists(os.path.join(lib, f'{m}_front.png'))))
        faces.append((g[0], g))
    flags = {}
    for f, g in faces:
        r = rv.get('people', {}).get(f, {}); fl = []
        lab = anc[f].rstrip('?')
        if lab in ('masked', 'unseen'): fl.append(lab)
        if r.get('headwear') in ('hijab', 'skullcap', 'keffiyeh'): fl.append('religious')
        elif f in rv.get('gear_off', []): fl.append('gear off')
        elif any(x in gear.get(f, []) for x in ('helmet', 'hat', 'mask')) or r.get('headwear') in ('hat', 'cap', 'hood', 'helmet'):
            fl.append(f"headgear ({r.get('headwear') or 'helmet/mask'})")
        if f == 'Chef_Female_01': fl.append('no texture fetched')
        if f in ag.get('beard', []) or r.get('beard'): fl.append('beard')
        if f in rv.get('hair_long', []): fl.append('long hair')
        if hair.get(f, {}).get('light'): fl.append('blonde')
        if f in ag.get('skin_out', []): fl.append('soot')
        if len(g) > 1: fl.append(f'x{len(g)} outfits')
        flags[f] = fl
    picks = json.load(open(os.path.join(HERE, 'data', 'black_picks_v1.json')))['jobs']
    for sex, word in (('f', 'women'), ('m', 'men')):
        mine = [(f, g) for f, g in faces if ('Female' in f) == (sex == 'f')]
        bands = []
        BAD = ('religious', 'masked', 'unseen', 'headgear', 'no texture')
        usable = lambda f: not any(w in x for x in flags[f] for w in BAD)
        for lab in ORDER:
            fs = sorted([f for f, g in mine if anc[f].rstrip('?') == lab and usable(f)], key=lambda f: ag['ages'].get(f, 0))
            if fs: bands.append((f'{NAMES.get(lab, lab)}: {len(fs)} face{"s" if len(fs) > 1 else ""}', [(f, os.path.join(lib, f'{f}_front.png'), f'{ag["ages"].get(f, "?")}  ' + ', '.join(flags[f])) for f in fs]))
            if lab == 'west_african':
                ps = [j for j in picks if j['sex'] == sex]
                if ps: bands.append((f'NEW Black {word}, from scans and fixes (your verdict pending): {len(ps)}', [(j['name'].replace('pick_', ''), os.path.join(made, f'{j["name"]}_front.png'), j['note'][:40]) for j in ps]))
        bad = sorted([f for f, g in mine if not usable(f)], key=lambda f: ORDER.index(anc[f].rstrip('?')) if anc[f].rstrip('?') in ORDER else 99)
        if bad: bands.append((f'NOT USABLE as they ship ({len(bad)}): religious dress, a mask or headgear that does not come off, no face', [(f, os.path.join(lib, f'{f}_front.png'), f'{NAMES.get(anc[f].rstrip("?"), "")[:10]} ' + ', '.join(flags[f])) for f in bad]))
        cols = 10
        rows = sum(1 + (len(p) + cols - 1) // cols for _, p in bands)
        s = Image.new('RGB', (cols * W, 30 + rows * (H + 30)), (236, 234, 230)); g = ImageDraw.Draw(s)
        g.text((8, 7), f'Every base face for {word} ({sum(len(p) for _, p in bands)}): one tile per distinct face, by ancestry, then age', fill=(10, 10, 10), font=BIG)
        y = 30
        for title, ppl in bands:
            g.rectangle((0, y, cols * W, y + 22), fill=(205, 200, 190)); g.text((8, y + 3), title, fill=(10, 10, 10), font=BIG); y += 24
            for k, (name, p, note) in enumerate(ppl):
                if k and k % cols == 0: y += H + 30
                x = (k % cols) * W
                if os.path.exists(p): s.paste(tile(p), (x, y + 13))
                g.rectangle((x, y, x + W - 1, y + 12), fill=(250, 250, 248)); g.text((x + 2, y), name.replace('_Adult', '').replace('Female', 'F').replace('Male', 'M')[:24], fill=(10, 10, 10), font=FONT)
                g.rectangle((x, y + H + 13, x + W - 1, y + H + 26), fill=(250, 250, 248)); g.text((x + 2, y + H + 13), note[:26], fill=(90, 30, 20) if any(w in note for w in ('religious', 'masked', 'unseen', 'headgear', 'soot')) else (10, 10, 10), font=FONT)
            y += H + 30
        s = s.crop((0, 0, s.width, y)); p = os.path.join(out, f'base_faces_{word}.jpg'); s.save(p, quality=84); print('wrote', p, s.size)


if __name__ == '__main__':
    main(*sys.argv[1:4])
