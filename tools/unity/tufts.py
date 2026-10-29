#!/usr/bin/env python3
"""The terrain's detail cards (BUILD_PLAN step 19c), in unity/Assets/SecondFace/Textures/Detail (committed, with
deterministic metas):
- grass tufts: the Poly Haven grass_medium_01 atlas carries five whole tufts along its bottom edge (the rest is single
  blades). Four of them are cropped (boxes picked by eye) with their base on the bottom edge and written twice: dried
  out (the Sallow, the Ashlands; greyed a little, the scan's dry colour is straw-yellow) and green (the Wet, the shore),
  as tuft_<dry|green>_<n>.png;
- bush leaves: the tree kit's leaf-cluster and fir-branch cards (Kits/Trees/tex, made by kits/cards.py) graded to the
  grey-olive and grey-green of scrub-desert bushes, as bush_<leaf|needle>.png (DetailMeshes builds domes of them).
Every card has its colour bled into the transparent margin, so mip-mapped edges do not go dark.

    python3 tools/unity/models.py --only grass_medium_01   # the sources, if .scans/models is empty
    python3 tools/unity/tufts.py
"""
import os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import models as M  # noqa: E402
import assets as A  # noqa: E402

SRC = os.path.join(M.OUT, 'grass_medium_01', 'textures')
OUT = os.path.join(M.ROOT, 'unity', 'Assets', 'SecondFace', 'Textures', 'Detail')
REL = 'Assets/SecondFace/Textures/Detail'
SIZE = 256          # each card's height in pixels
# (x0, y0, x1, y1) in the 2048 px atlas
# bush cards: name -> (source card in Kits/Trees/tex, saturation, (r, g, b) multiplier, long side in pixels)
BUSHES = {
    'bush_leaf': ('card_broadleaf_cluster', 0.2, (1.04, 1.0, 0.8), 512),   # saltbush: small grey-olive leaves
    'bush_needle': ('card_fir_branch', 0.35, (1.0, 1.0, 0.84), 512),       # renosterbos: fine grey-green needles
}
TREES = os.path.join(M.ROOT, 'unity', 'Assets', 'SecondFace', 'Kits', 'Trees', 'tex')
BOXES = [(440, 1533, 973, 1801), (1213, 1547, 1640, 1761), (507, 1813, 1000, 2034), (1187, 1773, 1613, 2034)]   # bottoms trimmed: the atlas padding smears there


def bleed(rgba, steps=24):
    """Spreads opaque colours into transparent texels (alpha kept), so filtering never pulls in black."""
    a = rgba[..., 3] > 8
    rgb = rgba[..., :3].astype(np.float32)
    filled = a.copy()
    for _ in range(steps):
        acc = np.zeros_like(rgb); n = np.zeros(a.shape, np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sh = np.roll(np.roll(filled, dy, 0), dx, 1)
            acc += np.roll(np.roll(rgb, dy, 0), dx, 1) * sh[..., None]; n += sh
        grow = (~filled) & (n > 0)
        rgb[grow] = acc[grow] / n[grow][:, None]
        filled |= grow
        if filled.all(): break
    out = rgba.copy(); out[..., :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    return out


def grade(rgba, sat, mul, value=1.0):
    """Desaturates towards the luminance and multiplies by a colour (alpha kept)."""
    rgb = rgba[..., :3].astype(np.float32) / 255.0
    lum = (rgb * np.array([0.2126, 0.7152, 0.0722], np.float32)).sum(-1, keepdims=True)
    rgb = (lum + (rgb - lum) * sat) * np.array(mul, np.float32) * value
    out = rgba.copy(); out[..., :3] = np.clip(rgb * 255.0, 0, 255).astype(np.uint8)
    return out


def write(img, name):
    path = os.path.join(OUT, f'{name}.png')
    img.save(path, optimize=True)
    with open(path + '.meta', 'w') as f:
        f.write(A.meta(f'{REL}/{name}.png', 'd'))


def main():
    diff = Image.open(os.path.join(SRC, 'grass_medium_01_diff_2k.jpg')).convert('RGB')
    dry = Image.open(os.path.join(SRC, 'grass_medium_01_dry_diff_2k.png')).convert('RGB')
    alpha = Image.open(os.path.join(SRC, 'grass_medium_01_alpha_2k.png')).convert('L')
    w, h = alpha.size
    # the four whole tufts, as boxes in the 2 K atlas (picked by eye: found automatically, the tufts merged with the long
    # blades that cross above them)
    tufts = [tuple(round(v * w / 2048) for v in b) for b in BOXES]
    os.makedirs(OUT, exist_ok=True)
    M.write_meta(os.path.join(M.ROOT, 'unity', 'Assets', 'SecondFace', 'Textures'), M.folder_meta('Assets/SecondFace/Textures'))
    M.write_meta(OUT, M.folder_meta(REL))
    for i, (x0, y0, x1, y1) in enumerate(tufts[:4]):
        a = np.array(alpha.crop((x0, y0, x1, y1)))
        for name, src in (('dry', dry), ('green', diff)):
            rgb = np.array(src.crop((x0, y0, x1, y1)))
            rgba = np.dstack([rgb, a]).astype(np.uint8)
            if name == 'dry':
                rgba = grade(rgba, 0.6, (1.0, 0.98, 0.92), 0.88)
            img = Image.fromarray(bleed(rgba), 'RGBA')
            scale = SIZE / img.height
            img = img.resize((max(8, round(img.width * scale)), SIZE), Image.LANCZOS)
            write(img, f'tuft_{name}_{i + 1}')
        print(f'tuft {i + 1}: {x1 - x0}x{y1 - y0} px at {x0},{y0}')
    print(f'{len(tufts)} tufts in {OUT}')
    for name, (src, sat, mul, px) in BUSHES.items():
        rgba = np.array(Image.open(os.path.join(TREES, src + '.png')).convert('RGBA'))
        img = Image.fromarray(bleed(grade(rgba, sat, mul)), 'RGBA')
        scale = px / max(img.size)
        img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
        write(img, name)
        print(f'{name} from {src}: {img.width}x{img.height}')


if __name__ == '__main__':
    main()
