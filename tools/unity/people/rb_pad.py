"""Pads a Rocketbox person's textures out from their UV islands (play-ch1 T42): every texel outside the islands takes the
colour of the island texels nearest it, grown ring by ring, so filtering and mip-maps at a seam blend the cloth with
itself, never with the photographed original left in the gutter (it read as blue-grey and white blotches on the re-dyed
clothes). The colour, the dye mask (its weights and wear) and the normal map are padded alike; the islands' own texels
are kept as they are. Islands come from rb_uv_islands.py.
Usage: python3 rb_pad.py <islands dir> <Rocketbox people dir> <out dir> [person ...]
Writes <out>/<person>/<file> for each texture it padded (copy them over the person's own)."""
import sys, os
import numpy as np
from PIL import Image, ImageDraw

isl, src, out = sys.argv[1], sys.argv[2], sys.argv[3]
only = set(sys.argv[4:])
RINGS = 96


def island_mask(tris, w, h):
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    for t in tris:
        pts = [(float(u) * w, (1.0 - float(v)) * h) for u, v in t]
        d.polygon(pts, fill=1, outline=1)
    return np.asarray(m, bool)


def pad(img, mask):
    """img H x W x C float32; texels outside mask take their filled neighbours' mean, ring by ring."""
    img = img.copy(); filled = mask.copy()
    img[~filled] = 0
    H, W = filled.shape
    for _ in range(RINGS):
        if filled.all(): break
        fp = np.pad(filled, 1); ip = np.pad(img * filled[..., None], ((1, 1), (1, 1), (0, 0)))
        s = np.zeros_like(img); c = np.zeros((H, W), np.float32)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy == 0 and dx == 0: continue
                f = fp[1 + dy:1 + dy + H, 1 + dx:1 + dx + W]
                s += ip[1 + dy:1 + dy + H, 1 + dx:1 + dx + W]; c += f
        new = (~filled) & (c > 0)
        img[new] = s[new] / c[new][:, None]
        filled |= new
    if not filled.all():
        img[~filled] = img[mask].mean(0) if mask.any() else 0
    return img


done = 0
for f in sorted(os.listdir(isl)):
    person = f[:-4]
    if not f.endswith('.npz') or (only and person not in only): continue
    tris = np.load(os.path.join(isl, f))
    pdir = os.path.join(src, person)
    for mat in tris.files:
        for kind, ext in (('color', 'jpg'), ('normal', 'jpg'), ('dye', 'png')):
            p = os.path.join(pdir, f'{mat}_{kind}.{ext}')
            if not os.path.exists(p): continue
            im = Image.open(p)
            mode = 'RGBA' if kind == 'dye' else 'RGB'
            a = np.asarray(im.convert(mode), np.float32)
            mask = island_mask(tris[mat], a.shape[1], a.shape[0])
            cover = mask.mean()
            # the texels on an island's edge straddle the gutter (half its colour): taken in from the island too
            for _ in range(max(1, a.shape[0] // 512)):
                m = np.pad(mask, 1)
                mask = mask & m[:-2, 1:-1] & m[2:, 1:-1] & m[1:-1, :-2] & m[1:-1, 2:]
            if cover > 0.995: continue   # (nothing to pad)
            r = pad(a, mask)
            od = os.path.join(out, person); os.makedirs(od, exist_ok=True)
            o = Image.fromarray(np.clip(r + 0.5, 0, 255).astype(np.uint8), mode)
            if ext == 'jpg': o.save(os.path.join(od, os.path.basename(p)), quality=95)
            else: o.save(os.path.join(od, os.path.basename(p)), optimize=True)
            done += 1
            print(f'{person:28s} {mat}_{kind}: islands {cover * 100:.0f}% of the texture, the rest padded')
print(done, 'textures padded')
