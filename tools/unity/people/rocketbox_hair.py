"""Each Rocketbox person's hair colour as shipped (2026-11-01), for choosing bases: a base with blonde or light brown hair
is never used for a people whose hair is dark (people_recipes.base_ok), as part of that hair is painted on the scalp,
lighter than the skin, where retone.py cannot tell it from skin. Measured from the textures (rocketbox_textures.py): the
median colour of the hair cards (the opacity texture's opaque texels) where the person has them, else of the head
texture's top rows (the back of the scalp; on a bald head this reads as skin: a* above 15). Light hair: L* above 30,
yellow (b* above 14) and little red (a* below 12.5), on a person judged younger than 55 (older light hair is greying).
Writes data/rocketbox_hair.json.
Usage: python3 rocketbox_hair.py <library texture dir: one folder per person>"""
import json, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import retone as rt

HERE = os.path.dirname(os.path.abspath(__file__))


def hair_lab(folder):
    fs = os.listdir(folder)
    op = [f for f in fs if f.endswith('_opacity_color.png') and 'glasses' not in f]
    hd = [f for f in fs if f.endswith('_head_color.jpg')]
    if op:
        im = np.array(Image.open(os.path.join(folder, op[0])).convert('RGBA').resize((512, 512)), float); m = im[..., 3] > 128
        if m.any(): return 'cards', np.median(rt.srgb_to_lab(im[..., :3][m]), 0)
    if hd:
        im = np.array(Image.open(os.path.join(folder, hd[0])).convert('RGB').resize((512, 512)), float)
        top = rt.srgb_to_lab(im[:40]); m = top[..., 0] > 6
        if m.sum() > 100: return 'scalp', np.median(top[m], 0)
    return None, None


if __name__ == '__main__':
    lib = sys.argv[1]
    ages = json.load(open(os.path.join(HERE, 'data', 'rocketbox_ages.json'))).get('ages', {})
    out = {}
    for n in sorted(os.listdir(lib)):
        if not os.path.isdir(os.path.join(lib, n)): continue
        src, lab = hair_lab(os.path.join(lib, n))
        if lab is None: continue
        L, a, b = (float(x) for x in lab)
        light = L > 30 and a < 12.5 and b > 14 and ages.get(n, 0) < 55
        out[n] = {'from': src, 'lab': [round(L, 1), round(a, 1), round(b, 1)], 'light': light}
    json.dump({'_about': __doc__.split('\n')[0] + ' See rocketbox_hair.py.', 'hair': out},
              open(os.path.join(HERE, 'data', 'rocketbox_hair.json'), 'w'), indent=1)
    print(len(out), 'people;', sum(v['light'] for v in out.values()), 'with light hair:', [n for n, v in out.items() if v['light']])
