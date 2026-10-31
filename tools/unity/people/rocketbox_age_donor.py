"""The years on a face from a real older face of the library (owner, 2026-10-31: the young against the old say what the
years do; an average of the old washes their lines out, each line being in its own place): the donor's fine skin
detail (its log luminance less its blur, independent of the skin's tone) resampled into the template's layout through the
registration, then into the target face's own layout through its head map, and written as a URP Detail Albedo x2
texture: the target keeps its own skin and gains the donor's lines, by `amount` (1: as deep as the donor's).
Usage: python3 rocketbox_age_donor.py <registered.npz> <template_uv.npz> <donor head texture> <donor name>
<target head_map.npz> <amount> <out.png> [res]"""
import sys, os
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rocketbox_skin_years import texel_map, sample


def main(reg, tuvp, donor_tex, donor, headmap, amount, out, res=1024):
    import cv2
    R = np.load(reg); T = np.load(tuvp); H = np.load(headmap)
    tris = T['tris']; tuv = T['tuv'].astype(float)
    lo = tuv.reshape(-1, 2).min(0); side = (tuv.reshape(-1, 2).max(0) - lo).max()
    g = res
    tri_of, W = texel_map(tuv, tris, g)
    cov = tri_of >= 0
    n = list(R['names']).index(donor); uvd = R['UV'][n].astype(float)
    uv = (uvd[tris[tri_of[cov]]] * W[cov][:, :, None]).sum(1)
    img = np.asarray(Image.open(donor_tex).convert('RGB'), np.float32) / 255.0
    good = np.isfinite(uv).all(1)
    lum = np.zeros((g, g), np.float32); m = np.zeros((g, g), np.float32)
    vals = sample(img, np.nan_to_num(uv, nan=0.5)).mean(1)
    yy, xx = np.where(cov)
    lum[yy[good], xx[good]] = np.log(np.maximum(vals[good], 1e-3)); m[yy[good], xx[good]] = 1
    sig = g / 128.0
    blur = cv2.GaussianBlur(lum * m, (0, 0), sig) / np.maximum(cv2.GaussianBlur(m, (0, 0), sig), 1e-4)
    detail = (lum - blur) * m
    # into the target's layout (its own triangles; none that falls across the template's islands)
    huv = H['uv'].astype(float); tm = H['tm'].astype(float)
    span = np.max(np.linalg.norm(tm[:, [0, 1, 2]] - tm[:, [1, 2, 0]], axis=2), 1)
    ok = np.isfinite(tm).all((1, 2)) & (span < 0.05)
    flip = np.stack([huv[ok][..., 0], 1 - huv[ok][..., 1]], -1)
    t_of, Wt = texel_map(flip, np.zeros((len(flip), 3), int), res, lo=np.zeros(2), side=1.0)
    tc_mask = t_of >= 0
    tc = (tm[ok][t_of[tc_mask]] * Wt[tc_mask][:, :, None]).sum(1)
    gx = np.clip(((tc - lo) / side * (g - 1)), 0, g - 1).astype(int)
    d = np.zeros((res, res), np.float32); d[tc_mask] = detail[gx[:, 1], gx[:, 0]]
    # (the edge of the mapped region faded in, so no seam of the factor shows)
    edge = cv2.GaussianBlur(tc_mask.astype(np.float32), (0, 0), res / 200.0)
    fac = np.exp(np.clip(d * float(amount), -1.0, 1.0) * edge)
    lin = np.clip(fac / 4.5947938, 0, 1)
    srgb = np.where(lin <= 0.0031308, 12.92 * lin, 1.055 * lin ** (1 / 2.4) - 0.055)
    Image.fromarray(np.repeat((srgb * 255).astype(np.uint8)[:, :, None], 3, 2)).save(out)
    print('wrote', out, 'detail rms in the face', float(np.sqrt((d[tc_mask] ** 2).mean())))


if __name__ == '__main__':
    main(*sys.argv[1:8], *(int(a) for a in sys.argv[8:9]))
