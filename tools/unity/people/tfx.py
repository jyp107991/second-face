"""AMD TressFX hair files (.tfx, version 4: Unity's HDRP Defender character demo, the hairstyles in its "Hair Files"):
a 160-byte header (float version, uint strands, uint points per strand, uint offsets of positions, strand UVs, point
UVs, thickness, colour; reserved) and then every strand's points as float4 (x, y, z, w; w 0 at a fixed root). Read
here to turn a real groom into our hair (P4.16): its shape, its hairline, its flyaways.
Usage: python3 tfx.py <style dir> <out.png> renders the style's layers front and side."""
import os, struct, sys
import numpy as np

def read(path):
    """The strands of a .tfx file as an array (strands, points, 3), in the file's own units and axes."""
    b = open(path, 'rb').read()
    ver, ns, nv, off = struct.unpack_from('<fIII', b, 0)
    p = np.frombuffer(b, dtype='<f4', count=ns * nv * 4, offset=off).reshape(ns, nv, 4)
    return p[..., :3].astype(np.float64)

def layers(style_dir):
    """Every layer of a style (file stem -> strands)."""
    return {os.path.splitext(f)[0]: read(os.path.join(style_dir, f)) for f in sorted(os.listdir(style_dir)) if f.endswith('.tfx')}

def preview(style_dir, out, size=520):
    from PIL import Image, ImageDraw
    ls = layers(style_dir)
    allp = np.concatenate([s.reshape(-1, 3) for s in ls.values()])
    lo, hi = allp.min(0), allp.max(0)
    span = (hi - lo).max() * 1.1
    mid = (lo + hi) / 2
    img = Image.new('RGB', (size * 2, size + 30), (24, 24, 28))
    d = ImageDraw.Draw(img, 'RGBA')
    colours = [(240, 200, 150, 40), (150, 220, 255, 40), (255, 140, 140, 50), (180, 255, 160, 40), (230, 230, 230, 40)]
    for k, (name, s) in enumerate(ls.items()):
        c = colours[k % len(colours)]
        step = max(1, len(s) // 4000)
        for strand in s[::step]:
            for view, (a, b, flip) in enumerate(((0, 1, 1), (2, 1, 1))):
                pts = [(view * size + size / 2 + flip * (q[a] - mid[a]) / span * size, size / 2 - (q[b] - mid[b]) / span * size) for q in strand]
                d.line(pts, fill=c, width=1)
        d.text((8 + 160 * k, size + 8), f'{name} ({len(s)})', fill=c[:3] + (255,))
    img.save(out)
    return {n: s.shape for n, s in ls.items()}, lo, hi

if __name__ == '__main__':
    shapes, lo, hi = preview(sys.argv[1], sys.argv[2])
    print(sys.argv[1], shapes, 'bounds', np.round(lo, 2), np.round(hi, 2))
