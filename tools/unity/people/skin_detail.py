"""The skin's micro detail (P4.15c): a tileable tangent-space normal map of pores and fine creases, laid over the baked
skin at a fine tiling so a close-up's highlights break up as on real skin instead of sliding over plastic. Pores are
shallow dimples about 0.05-0.2 mm across at roughly 0.5 mm spacing (denser and deeper on the nose and cheeks, which the
shader weights by the head's own frame); the creases are a faint cross-hatch of the skin's surface lines. Height is
built on a torus (wrapped distances and periodic noise), so the tile repeats without a seam, then turned into normals
by central differences. Written as a linear PNG (Unity: a normal map, so not sRGB).
Usage: python3 skin_detail.py <out.png> [size=256] [seed=7]"""
import sys
import numpy as np
from PIL import Image

def periodic_noise(n, cells, rng):
    """Smooth value noise that tiles over an n x n image with `cells` lattice cells."""
    lat = rng.random((cells, cells))
    x = np.arange(n) * cells / n
    i0 = np.floor(x).astype(int) % cells
    i1 = (i0 + 1) % cells
    f = x - np.floor(x)
    f = f * f * (3 - 2 * f)
    a = lat[i0][:, i0] * (1 - f)[None, :] + lat[i0][:, i1] * f[None, :]
    b = lat[i1][:, i0] * (1 - f)[None, :] + lat[i1][:, i1] * f[None, :]
    return a * (1 - f)[:, None] + b * f[:, None]

def height(n, rng):
    h = np.zeros((n, n))
    yy, xx = np.mgrid[0:n, 0:n]
    # pores: dimples at jittered points (about 260 to the tile), each a soft Gaussian well of its own size and depth
    for _ in range(260):
        cx, cy = rng.random(2) * n
        r = rng.uniform(0.7, 1.9) * n / 256
        dx = (xx - cx + n / 2) % n - n / 2
        dy = (yy - cy + n / 2) % n - n / 2
        h -= rng.uniform(0.5, 1.0) * np.exp(-(dx * dx + dy * dy) / (2 * r * r))
    # the surface lines: three faint families of ridges across each other, wavering; whole-number wave vectors so
    # each family repeats exactly across the tile
    warp = periodic_noise(n, 8, rng) * 5
    for kx, ky in ((17, 8), (-6, 19), (12, -13)):
        h += 0.07 * np.sin(2 * np.pi * (kx * xx + ky * yy) / n + warp)
    h += 0.25 * periodic_noise(n, 32, rng) + 0.12 * periodic_noise(n, 64, rng)
    return h

def normals(h, strength):
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5
    nx, ny, nz = -dx * strength, -dy * strength, np.ones_like(h)
    l = np.sqrt(nx * nx + ny * ny + nz * nz)
    return np.stack([nx / l, ny / l, nz / l], -1)

if __name__ == '__main__':
    out = sys.argv[1]
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 256
    rng = np.random.default_rng(int(sys.argv[3]) if len(sys.argv) > 3 else 7)
    nm = normals(height(n, rng), 2.2)
    img = ((nm * 0.5 + 0.5) * 255 + 0.5).clip(0, 255).astype(np.uint8)
    Image.fromarray(img, 'RGB').save(out)
    print('wrote', out, img.shape, 'mean z', round(float(nm[..., 2].mean()), 3))
