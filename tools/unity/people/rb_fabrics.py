"""Tileable cloth for the Rocketbox people's layers (the wardrobe rule: lore-bound, re-textured by our own pipeline).

Writes, for each cloth, a 512 x 512 albedo (neutral, light: the dye gives the colour) and a normal map, tileable both
ways, into unity/Assets/SecondFace/People/Rocketbox/Layers/Fabrics/<name>_{color,normal}.png:

  canvas   heavy plain weave (dusters, vests, capes)            twill   diagonal twill (work trousers, jackets)
  knit     rib knit (gaiters, base layers)                       leather grain with creases (boots, belts, guards)
  webbing  close-woven strap with selvedge lines (rigs, straps)

Every cloth carries wear in itself: slubs, uneven thread, pilling, scuffs, so a dyed garment reads used, never new.
Run: python3 tools/unity/people/rb_fabrics.py
"""
import math
import os

import numpy as np
from PIL import Image

N = 512
OUT = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'unity', 'Assets', 'SecondFace', 'People', 'Rocketbox', 'Layers', 'Fabrics')
rng = np.random.default_rng(20261106)
yy, xx = np.mgrid[0:N, 0:N].astype(np.float32) / N   # 0..1, tileable when every frequency is an integer


def noise(octaves=5, base=4, seed=0):
    """Tileable value noise: sums of integer-frequency smooth random grids."""
    r = np.random.default_rng(seed)
    out = np.zeros((N, N), np.float32)
    amp, total = 1.0, 0.0
    for o in range(octaves):
        f = base * 2 ** o
        g = r.random((f, f)).astype(np.float32)
        # bilinear, wrapping
        x = xx * f; y = yy * f
        x0 = np.floor(x).astype(int) % f; y0 = np.floor(y).astype(int) % f
        x1 = (x0 + 1) % f; y1 = (y0 + 1) % f
        tx = x - np.floor(x); ty = y - np.floor(y)
        tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty)
        v = (g[y0, x0] * (1 - tx) + g[y0, x1] * tx) * (1 - ty) + (g[y1, x0] * (1 - tx) + g[y1, x1] * tx) * ty
        out += v * amp; total += amp; amp *= 0.55
    return out / total


def normal_from(height, strength):
    """A tangent-space normal map (OpenGL style, as Unity reads) from a tileable height field."""
    dx = (np.roll(height, -1, 1) - np.roll(height, 1, 1)) * 0.5 * strength
    dy = (np.roll(height, -1, 0) - np.roll(height, 1, 0)) * 0.5 * strength
    n = np.stack([-dx, dy, np.ones_like(height)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return ((n * 0.5 + 0.5) * 255).astype(np.uint8)


def weave(threads_u, threads_v, twill=0):
    """Height of a woven cloth: warp and weft threads crossing over and under (twill shifts the crossing each row)."""
    u = xx * threads_u; v = yy * threads_v
    iu = np.floor(u); iv = np.floor(v)
    fu = u - iu; fv = v - iv
    warp = np.sin(fu * math.pi) ** 0.7          # a round thread across its width
    weft = np.sin(fv * math.pi) ** 0.7
    over = ((iu + iv * (1 if twill == 0 else 1) + (iv * twill)) % (2 if twill == 0 else 3)) < 1
    # where the warp is over, the warp's crown shows (running along v), else the weft's
    crown_warp = warp * (0.6 + 0.4 * np.sin(fv * math.pi))
    crown_weft = weft * (0.6 + 0.4 * np.sin(fu * math.pi))
    return np.where(over, crown_warp, crown_weft), over


def save(name, albedo, height, strength):
    """The Cloth shader dyes by the texture's luminance over 0.3 (SecondFace/Cloth, _Dyed): the cloth is kept round 0.25 so
    its weave, slubs and scuffs survive the dye instead of clipping to a flat colour."""
    os.makedirs(OUT, exist_ok=True)
    a = np.clip(albedo * (0.25 / max(1e-3, float(np.mean(albedo)))), 0, 1)
    Image.fromarray((a * 255).astype(np.uint8), 'RGB' if a.ndim == 3 else 'L').convert('RGB').save(os.path.join(OUT, f'{name}_color.png'))
    Image.fromarray(normal_from(height, strength), 'RGB').save(os.path.join(OUT, f'{name}_normal.png'))
    print(f'  {name}: mean {a.mean():.2f}')


def main():
    slub = noise(4, 8, 1)          # thicker and thinner runs of yarn
    blotch = noise(5, 2, 2)        # uneven fading and grime ground in
    fine = noise(3, 64, 3)
    stain = np.clip((noise(4, 3, 11) - 0.6) * 3.0, 0, 1)      # water marks and ground-in dirt
    fold = noise(3, 2, 12) * 0.6                               # soft creases where cloth bends

    # canvas: heavy plain weave, 96 threads a tile (a tile is ~30 cm on the garment: ~3 threads a cm)
    h, over = weave(192, 192)
    h = h * (0.85 + 0.3 * slub)
    alb = 0.70 + 0.035 * (h - 0.5) - 0.16 * (blotch - 0.5) - 0.05 * fine - 0.06 * stain
    save('canvas', np.stack([alb, alb * 0.98, alb * 0.95], -1), h * 0.5 + fold, 1.6)

    # twill: 3/1 diagonal, finer
    h, over = weave(256, 256, twill=1)
    h = h * (0.9 + 0.2 * slub)
    alb = 0.66 + 0.04 * (h - 0.5) - 0.16 * (blotch - 0.5) - 0.04 * fine - 0.06 * stain
    save('twill', np.stack([alb, alb, alb * 0.97], -1), h * 0.5 + fold, 1.4)

    # knit: columns of V stitches (rib), soft
    u = xx * 128; v = yy * 192
    col = np.abs(np.sin(u * math.pi))
    stitch = np.abs(np.sin((v + np.where((np.floor(u) % 2) < 1, 0.0, 0.5)) * math.pi * 1.0))
    h = 0.6 * col + 0.4 * stitch * col
    pill = (noise(2, 128, 4) > 0.72).astype(np.float32) * 0.15
    alb = 0.72 + 0.05 * (h - 0.5) - 0.12 * (blotch - 0.5) + pill * 0.2
    save('knit', np.stack([alb, alb * 0.98, alb * 0.96], -1), h * 0.5 + pill + fold, 1.6)

    # leather: a cellular grain, creases, scuffs paler
    cells = noise(2, 48, 5)
    grain = np.abs(np.sin(cells * 40.0))
    crease = np.clip(1 - np.abs(noise(3, 6, 6) - 0.5) * 60, 0, 1) * 0.6
    scuff = np.clip((noise(4, 6, 7) - 0.62) * 4, 0, 1)
    h = 0.7 * grain + 0.3 * noise(3, 24, 8) - 0.5 * crease
    alb = 0.52 + 0.05 * (grain - 0.5) - 0.05 * crease + 0.10 * scuff - 0.10 * (blotch - 0.5)
    save('leather', np.stack([alb, alb * 0.96, alb * 0.92], -1), h, 1.6)

    # webbing: a close twill strap with two selvedge lines a strap (straps 4 cm: 8 a tile)
    h, _ = weave(220, 220, twill=1)
    band = (yy * 8) % 1.0
    selvedge = ((np.abs(band - 0.06) < 0.025) | (np.abs(band - 0.94) < 0.025)).astype(np.float32)
    h = h * 0.6 + selvedge * 0.6
    alb = 0.5 + 0.08 * (h - 0.5) - 0.1 * (blotch - 0.5) - 0.1 * selvedge
    save('webbing', np.stack([alb, alb, alb], -1), h, 2.0)


if __name__ == '__main__':
    main()
