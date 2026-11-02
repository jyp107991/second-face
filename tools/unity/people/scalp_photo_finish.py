"""The second half of scalp_photo.py (outside Blender, colour-safe): the donor's scalp, hairline and forehead skin sampled
at the mapped places and composited over this head's texture; the donor's skin (lighter than its hair) brought to this
head's own forehead colour, its hair (stubble and the line) kept as photographed, with a little of this head's own
texture's fine grain. Usage: python3 scalp_photo_finish.py <scalp_map dir> <head texture in/out jpg> <donor texture jpg>"""
import os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from retone import srgb_to_lab, lab_to_srgb

mdir, head_jpg, donor_jpg = sys.argv[1:4]
M = np.load(os.path.join(mdir, 'scalp_map.npz'))
ys, xs, uvd, alpha, z, x, y = M['ys'], M['xs'], M['uvd'], M['alpha'], M['z'], M['x'], M['y']
CUT, FEATHER = (float(v) for v in M['cut'])
head = np.asarray(Image.open(head_jpg).convert('RGB'), np.float32)
H, W = head.shape[:2]
don = np.asarray(Image.open(donor_jpg).convert('RGB').resize((W, H)), np.float32)
px = np.clip((uvd[:, 0] * W).astype(int), 0, W - 1); py = np.clip(((1 - uvd[:, 1]) * H).astype(int), 0, H - 1)
d_lab = srgb_to_lab(don[py, px]); h_lab = srgb_to_lab(head[ys, xs])
# foreheads: this head's own skin just below the blend (above the brows, at the front), and the donor's at the same place
fh = (np.abs(x) < 30) & (y < 20) & (z > CUT - FEATHER - 12) & (z < CUT - FEATHER)
tf = np.median(h_lab[fh], 0) if fh.sum() > 50 else np.median(h_lab, 0)
df = np.median(d_lab[fh], 0) if fh.sum() > 50 else np.median(d_lab, 0)
# the donor's skin (its hair is darker): only texels about as light as its forehead are skin; its stubble's dots stay
# hair, black as photographed (half-weighted dots, shifted to a lighter skin, read as red-brown)
# (hair: at least 8 darker than the forehead; the forehead's own darker skin, its creases and shading, stays skin, or it
# greys into a band under the hairline)
skin = np.clip((d_lab[:, 0] - (df[0] - 14)) / 6, 0, 1)[:, None]
new = d_lab + skin * (tf - df)
new[:, 1:] = new[:, 1:] * (0.4 + 0.6 * skin)                               # hair: towards neutral, never reddened
out = head.copy()
a = alpha[:, None]
out[ys, xs] = lab_to_srgb(h_lab * (1 - a) + new * a).astype(np.float32)
Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(head_jpg, quality=92)
# the donor's normal map with it (its stubble's relief; both heads share Rocketbox's head layout, so the tangent frames
# agree): <head>_normal.jpg beside the colour, written over a link as a file of its own
hn, dn = head_jpg.replace('_color.jpg', '_normal.jpg'), donor_jpg.replace('_color.jpg', '_normal.jpg')
if os.path.exists(hn) and os.path.exists(dn):
    hnorm = np.asarray(Image.open(hn).convert('RGB'), np.float32)
    dnorm = np.asarray(Image.open(dn).convert('RGB').resize((hnorm.shape[1], hnorm.shape[0])), np.float32)
    Hn, Wn = hnorm.shape[:2]
    pxn = np.clip((uvd[:, 0] * Wn).astype(int), 0, Wn - 1); pyn = np.clip(((1 - uvd[:, 1]) * Hn).astype(int), 0, Hn - 1)
    ysn = np.clip((ys * Hn / H).astype(int), 0, Hn - 1); xsn = np.clip((xs * Wn / W).astype(int), 0, Wn - 1)
    on_ = hnorm.copy(); on_[ysn, xsn] = hnorm[ysn, xsn] * (1 - a) + dnorm[pyn, pxn] * a
    if os.path.islink(hn): os.remove(hn)
    Image.fromarray(np.clip(on_, 0, 255).astype(np.uint8)).save(hn, quality=92)
    print('normal map from the donor too')
print('scalp from the donor:', int((alpha > 0.5).sum()), 'texels; forehead', tf.round(1), 'donor', df.round(1))
