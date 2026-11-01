"""The scalp rebuilt by hair_graft.py, repainted (outside Blender): the texture polygons of the faces pulled onto the
skull take the hair colour, close-cropped: the texture's own fine pattern darkened to the colour, with a little grain,
feathered at the edge (so a head with no hairstyle grafted on is buzzed, and a grafted one has hair under it, not skin).
Usage: python3 scalp_paint.py <graft json> <texture dir: read the head texture from here> <out dir>"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def main(info_path, tex_dir, out_dir):
    J = json.load(open(info_path))
    h = int(J['hair'], 16); hair = np.array([(h >> 16) & 255, (h >> 8) & 255, h & 255], np.float32) / 255.0
    for mat, polys in J.get('paint', {}).items():
        src = os.path.join(tex_dir, f'{mat}_color.jpg')
        if not os.path.exists(src): continue
        im = Image.open(src).convert('RGB'); W, H = im.size
        mask = Image.new('L', (W, H), 0); g = ImageDraw.Draw(mask)
        for poly in polys: g.polygon([(u * W, (1 - v) * H) for u, v in poly], fill=255)
        mask = mask.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(4))
        a = np.asarray(im, np.float32) / 255.0
        lum = a @ np.array([0.2126, 0.7152, 0.0722], np.float32)
        mk = np.asarray(mask, np.float32)[..., None] / 255.0
        ref = float(np.median(lum[mk[..., 0] > 0.5])) if (mk > 0.5).any() else 0.5
        grain = np.random.default_rng(7).normal(1.0, 0.18, lum.shape).astype(np.float32)
        k = np.clip((0.6 + 0.4 * lum / max(ref, 1e-3)) * grain, 0.4, 1.8)[..., None]
        paint = np.clip(hair[None, None, :] * k * 1.15, 0, 1)
        out = os.path.join(out_dir, f'{mat}_color.jpg')
        img = Image.fromarray(((a * (1 - mk) + paint * mk) * 255).astype(np.uint8))
        if os.path.lexists(out): os.remove(out)
        img.save(out, quality=92)
        print('painted', mat, len(polys), 'faces')


if __name__ == '__main__':
    main(*sys.argv[1:4])
