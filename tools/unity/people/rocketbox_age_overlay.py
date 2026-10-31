"""The skin's years (rocketbox_skin_years.py, per decade in the template's layout) baked into one Rocketbox face's own
texture layout as a detail texture (URP Lit's Detail Albedo x2: sRGB 128 is no change), for a number of decades. The face's
texels find their template coordinates through the registration (the template's triangles drawn in the face's own
texture coordinates). Usage: python3 rocketbox_age_overlay.py <head_map.npz (rocketbox_head_map.py)> <template_uv.npz> <skin_years.npz>
<decades> <out.png> [res]"""
import sys
import numpy as np
from PIL import Image
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from rocketbox_skin_years import texel_map


def main(headmap, tuvp, years, decades, out, res=1024):
    H = np.load(headmap); T = np.load(tuvp); Y = np.load(years)
    tuv = T['tuv'].astype(float); lo = tuv.reshape(-1, 2).min(0); side = (tuv.reshape(-1, 2).max(0) - lo).max(); g = int(Y['res'])
    detail = Y['detail']
    uv = H['uv'].astype(float); tm = H['tm'].astype(float)
    # (the face's own triangles: no seam of its own is crossed; a triangle whose corners fall on different islands of
    # the template's layout, or none, is left as it is)
    span = np.max(np.linalg.norm(tm[:, [0, 1, 2]] - tm[:, [1, 2, 0]], axis=2), 1)
    ok = np.isfinite(tm).all((1, 2)) & (span < 0.05)
    flip = np.stack([uv[ok][..., 0], 1 - uv[ok][..., 1]], -1)
    tri_of, W = texel_map(flip, np.zeros((len(flip), 3), int), res, lo=np.zeros(2), side=1.0)
    cov = tri_of >= 0
    tc = (tm[ok][tri_of[cov]] * W[cov][:, :, None]).sum(1)
    gx = np.clip(((tc - lo) / side * (g - 1)), 0, g - 1).astype(int)
    d = np.zeros((res, res)); d[cov] = detail[gx[:, 1], gx[:, 0]]
    m = np.exp(np.clip(d * float(decades), -1.2, 1.2))          # the luminance's factor
    lin = np.clip(m / 4.5947938, 0, 1)                          # Detail x2 in linear space: unity_ColorSpaceDouble
    srgb = np.where(lin <= 0.0031308, 12.92 * lin, 1.055 * lin ** (1 / 2.4) - 0.055)
    Image.fromarray(np.repeat((srgb * 255).astype(np.uint8)[:, :, None], 3, 2)).save(out)
    print('wrote', out, 'triangles', int(ok.sum()), 'of', len(ok), 'mean factor', float(m[cov].mean()))


if __name__ == '__main__':
    main(*sys.argv[1:6], *(int(a) for a in sys.argv[6:7]))
