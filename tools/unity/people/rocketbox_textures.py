"""Rocketbox textures into the project's form (docs/PEOPLE_RESEARCH.md §7): colour 2048 JPEG, the head's normal 2048 and
the rest 1024 JPEG, the hair/brow/lash opacity texture as a 256-colour PNG with its alpha, its colour pulled out into the
transparent texels first (a cut-out edge samples the texels next to it: unfilled, the long hair's edges went blue-black).
Usage: python3 rocketbox_textures.py <src avatar dir with Textures/*.tga|png> <dst dir>"""
import glob, os, sys
import numpy as np
from PIL import Image


def fill(rgba):
    """Pull-push: the colour of the opaque texels spread into the transparent ones, coarse to fine."""
    a = rgba[..., 3:4].astype(np.float64) / 255.0
    c = rgba[..., :3].astype(np.float64) * a
    levels = [(c, a)]
    while levels[-1][0].shape[0] > 4:
        c0, a0 = levels[-1]
        h, w = c0.shape[0] // 2 * 2, c0.shape[1] // 2 * 2
        c1 = c0[:h, :w].reshape(h // 2, 2, w // 2, 2, 3).sum((1, 3)); a1 = a0[:h, :w].reshape(h // 2, 2, w // 2, 2, 1).sum((1, 3))
        levels.append((c1, a1))
    col = levels[-1][0] / np.maximum(levels[-1][1], 1e-6)
    for c0, a0 in reversed(levels[:-1]):
        up = np.repeat(np.repeat(col, 2, 0), 2, 1)
        up = np.pad(up, ((0, c0.shape[0] - up.shape[0]), (0, c0.shape[1] - up.shape[1]), (0, 0)), mode='edge')
        own = c0 / np.maximum(a0, 1e-6)
        k = np.clip(a0, 0, 1)
        col = own * k + up * (1 - k)
    out = rgba.copy(); out[..., :3] = np.clip(col, 0, 255).astype(np.uint8)
    return out


def main(src, dst):
    os.makedirs(dst, exist_ok=True)
    for f in sorted(glob.glob(os.path.join(src, '**', '*.tga'), recursive=True) + glob.glob(os.path.join(src, '*.png'))):
        name = os.path.splitext(os.path.basename(f))[0]
        im = Image.open(f)
        if 'opacity' in name:
            arr = np.array(im.convert('RGBA'))
            Image.fromarray(fill(arr)).quantize(colors=256, method=Image.Quantize.FASTOCTREE).save(os.path.join(dst, name + '.png'), optimize=True)
        elif name.endswith(('_color', '_normal', '_specular', '_wrinkle')):
            size = 2048 if (name.endswith('_color') or name.endswith('head_normal')) else 1024
            rgb = im.convert('RGB')
            if rgb.size[0] > size: rgb = rgb.resize((size, size), Image.LANCZOS)
            rgb.save(os.path.join(dst, name + '.jpg'), quality=95 if 'normal' in name else 90)
        print(name)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
