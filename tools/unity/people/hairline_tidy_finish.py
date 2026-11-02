"""The second half of hairline_tidy.py (outside Blender): each reworked texel of the head's colour and normal textures
becomes its hair source and skin source blended by the edge's weight (beyond the edge's reach both are the same texel,
moved with the line). Usage: python3 hairline_tidy_finish.py <map dir> <head colour jpg (in/out)>
The normal map beside it (<head>_normal.jpg) is reworked the same way, written over a link as a file of its own."""
import os, sys
import numpy as np
from PIL import Image

mdir, col_jpg = sys.argv[1:3]
M = np.load(os.path.join(mdir, 'hairline_map.npz'))
H, W = (int(v) for v in M['size'])
ys, xs, hy, hx, sy, sx, w = M['ys'], M['xs'], M['hy'], M['hx'], M['sy'], M['sx'], M['w'][:, None]
for path in (col_jpg, col_jpg.replace('_color.jpg', '_normal.jpg')):
    if not os.path.exists(path): continue
    im = np.asarray(Image.open(path).convert('RGB'), np.float32)
    h, wd = im.shape[:2]
    gy = lambda a: np.clip((a * h / H).astype(int), 0, h - 1); gx = lambda a: np.clip((a * wd / W).astype(int), 0, wd - 1)
    def bilinear(fy, fx):                                  # (the sources are exact places, not texels)
        fy = np.clip((fy + 0.5) * h / H - 0.5, 0, h - 1.001); fx = np.clip((fx + 0.5) * wd / W - 0.5, 0, wd - 1.001)
        y0, x0 = fy.astype(int), fx.astype(int); ty, tx = (fy - y0)[:, None], (fx - x0)[:, None]
        return (im[y0, x0] * (1 - ty) * (1 - tx) + im[y0, x0 + 1] * (1 - ty) * tx + im[y0 + 1, x0] * ty * (1 - tx) + im[y0 + 1, x0 + 1] * ty * tx)
    out = im.copy()
    out[gy(ys), gx(xs)] = w * bilinear(hy, hx) + (1 - w) * bilinear(sy, sx)
    if path == col_jpg: col_out = out
    elif 'fy' in M.files:
        # the normal map: no hair relief on skin above the brows (its colour says skin: Rocketbox's bumps run on down the
        # temples and glint there as grey speckle)
        cy = np.clip((M['fy'] * col_out.shape[0] / H).astype(int), 0, col_out.shape[0] - 1)
        cx = np.clip((M['fx'] * col_out.shape[1] / W).astype(int), 0, col_out.shape[1] - 1)
        ky = np.clip((M['ky'] * col_out.shape[0] / H).astype(int), 0, col_out.shape[0] - 1)
        kx = np.clip((M['kx'] * col_out.shape[1] / W).astype(int), 0, col_out.shape[1] - 1)
        V = col_out[cy, cx].max(-1); vs = float(np.median(col_out[ky, kx].max(-1)))       # (the forehead's skin)
        dens = np.clip((0.62 * vs - V) / (0.25 * vs), 0, 1)
        f = (0.8 * (1 - dens) * M['fw'])[:, None]
        ny, nx = gy(M['fy']), gx(M['fx'])
        out[ny, nx] = out[ny, nx] * (1 - f) + np.array([128.0, 128.0, 255.0]) * f
    if os.path.islink(path): os.remove(path)
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(path, quality=93)
    print('hairline reworked in', os.path.basename(path), len(ys), 'texels')
