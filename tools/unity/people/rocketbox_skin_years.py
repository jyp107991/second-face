"""What the years do to the skin, from the Rocketbox library's young and old (owner, 2026-10-31). Each face's texture is
resampled into the template's layout through the registration (the same skin point at the same texel for everyone);
the fine detail (the log luminance less its blur: lines, creases, texture, independent of the skin's tone) and the
colour are regressed on the age, the sexes pooled with an offset, the soot-, paint- or mask-covered faces left out.
Writes the per-decade change of the detail and of the colour in the template's layout, and a sheet of the young's mean,
the old's mean and the change. Usage: python3 rocketbox_skin_years.py <registered.npz> <template_uv.npz> <head textures dir>
<ages.json> <out.npz> <sheet.jpg> [res]"""
import json, os, sys
import numpy as np
from PIL import Image, ImageFilter


def texel_map(tuv, tris, res):
    """Each texel of the template layout's face box: its triangle and barycentric weights (-1 where none)."""
    lo = tuv.reshape(-1, 2).min(0); hi = tuv.reshape(-1, 2).max(0); side = (hi - lo).max()
    P = (tuv - lo) / side * (res - 1)
    tri_of = -np.ones((res, res), int); W = np.zeros((res, res, 3))
    for t in range(len(tris)):
        a, b, c = P[t]
        x0, y0 = np.floor(np.minimum(np.minimum(a, b), c)).astype(int); x1, y1 = np.ceil(np.maximum(np.maximum(a, b), c)).astype(int)
        xs, ys = np.meshgrid(np.arange(max(x0, 0), min(x1, res - 1) + 1), np.arange(max(y0, 0), min(y1, res - 1) + 1))
        p = np.stack([xs.ravel(), ys.ravel()], 1).astype(float)
        m = np.array([[b[0] - a[0], c[0] - a[0]], [b[1] - a[1], c[1] - a[1]]])
        if abs(np.linalg.det(m)) < 1e-9: continue
        uv = np.linalg.solve(m, (p - a).T).T; w = np.stack([1 - uv.sum(1), uv[:, 0], uv[:, 1]], 1)
        inside = (w >= -1e-6).all(1)
        for (x, y), ww in zip(p[inside].astype(int), w[inside]):
            tri_of[y, x] = t; W[y, x] = ww
    return tri_of, W


def sample(img, uv):
    """Bilinear lookup of texture coordinates (0-1, V up as Blender's) in an image array."""
    h, w = img.shape[:2]
    x = np.clip(uv[:, 0] * (w - 1), 0, w - 1); y = np.clip((1 - uv[:, 1]) * (h - 1), 0, h - 1)
    x0 = np.floor(x).astype(int); y0 = np.floor(y).astype(int); x1 = np.minimum(x0 + 1, w - 1); y1 = np.minimum(y0 + 1, h - 1)
    fx = (x - x0)[:, None]; fy = (y - y0)[:, None]
    return (img[y0, x0] * (1 - fx) * (1 - fy) + img[y0, x1] * fx * (1 - fy) + img[y1, x0] * (1 - fx) * fy + img[y1, x1] * fx * fy)


def main(reg, tuvp, heads, ages_path, out, sheet, res=384):
    R = np.load(reg); T = np.load(tuvp); A = json.load(open(ages_path))
    tris = T['tris']; tuv = T['tuv']; tri_of, W = texel_map(tuv, tris, res)
    cov = tri_of >= 0
    tt = tri_of[cov]; ww = W[cov]
    faces, ages, sexes = [], [], []
    for n, name in enumerate(R['names']):
        p = os.path.join(heads, name + '.jpg')
        if name in A['skin_out'] or name not in A['ages'] or not os.path.exists(p): continue
        img = np.asarray(Image.open(p).convert('RGB'), np.float32) / 255.0
        uvf = R['UV'][n]
        uv = (uvf[tris[tt]] * ww[:, :, None]).sum(1)
        bad = ~np.isfinite(uv).all(1)
        val = sample(img, np.nan_to_num(uv, nan=0.5)); val[bad] = np.nan
        out_img = np.full((res, res, 3), np.nan, np.float32); out_img[cov] = val
        faces.append(out_img); ages.append(A['ages'][name]); sexes.append(1.0 if R['sex'][n] == 'm' else 0.0)
    F = np.array(faces); ag = np.array(ages, float); sx = np.array(sexes)
    # (a texel a face's registration left undefined takes the others' mean there)
    fill = np.nanmean(F, 0); fill = np.nan_to_num(fill, nan=0.5)
    F = np.where(np.isnan(F), fill[None], F)
    print('faces', len(F), 'ages', ag.min(), ag.max(), 'past 50:', int((ag >= 50).sum()))
    lum = np.log(np.maximum(F.mean(3), 1e-3))
    def blur(a, r):
        import cv2
        return cv2.GaussianBlur(a.astype(np.float32), (0, 0), r)
    m = cov.astype(np.float32)
    def mblur(a, r): return blur(a * m, r) / np.maximum(blur(m, r), 1e-4)   # inside the face only
    detail = np.array([(l - mblur(l, 6)) * m for l in lum])
    # the regression per texel: value = a + b sex + c (age - 35)
    X = np.stack([np.ones_like(ag), sx, ag - 35.0], 1); P = np.linalg.pinv(X)
    def fit(Y):
        B = np.tensordot(P, Y, axes=([1], [0])); return B[2]
    d_detail = fit(detail) * 10.0            # per decade
    d_colour = fit(F) * 10.0
    np.savez_compressed(out, detail=d_detail.astype(np.float32), colour=d_colour.astype(np.float32), cov=cov,
                        mean=F.mean(0).astype(np.float32), res=res)
    young = detail[ag <= 30].mean(0); old = detail[ag >= 50].mean(0)
    # the sheet: the head's part of the layout, upright; young's colour, old's colour, young's detail, old's detail,
    # their difference
    ys, xs = np.where(cov); box = (xs.min(), ys.min(), xs.max(), ys.max())
    def show(a, k): return Image.fromarray(np.clip(128 + a * k, 0, 255).astype(np.uint8)).convert('RGB')
    def col(a): return Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8))
    tiles = [col(F[ag <= 30].mean(0)), col(F[ag >= 50].mean(0)), show(young, 600), show(old, 600), show(old - young, 900)]
    tiles = [t.crop(box).rotate(90, expand=True) for t in tiles]
    w, h = tiles[0].size
    S = Image.new('RGB', (w * 5, h), (20, 20, 20))
    for k, t in enumerate(tiles): S.paste(t, (k * w, 0))
    S.save(sheet, quality=90)
    print('detail change per decade: mean |.|', float(np.abs(d_detail[cov]).mean()), 'colour per decade (RGB mean)', d_colour[cov].mean(0))


if __name__ == '__main__':
    main(*sys.argv[1:7], *(int(a) for a in sys.argv[7:8]))
