"""Skin tone of FFHQ-UV textures, read from the lazy zip: median L*a*b* in the centre-face mask, ITA angle.
Usage: python3 tone.py <zip> <center_face_mask.png> <out json> [names...]"""
import sys, json, zipfile, io
import numpy as np
from PIL import Image


def srgb_lab(c):
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    xyz = c @ np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]]).T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 216 / 24389, np.cbrt(xyz), (24389 / 27 * xyz + 16) / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)



if __name__ == '__main__':
    zp, maskp, outp = sys.argv[1:4]    ; names = sys.argv[4:]
    mask = np.asarray(Image.open(maskp).convert('L').resize((256, 256))) > 128
    zf = zipfile.ZipFile(zp)
    out = json.load(open(outp)) if __import__('os').path.exists(outp) else {}
    for n in names:
        im = Image.open(io.BytesIO(zf.read(n))).convert('RGB').resize((256, 256))
        lab = srgb_lab(np.asarray(im, np.float64) / 255.0)[mask]
        L, a, b = np.median(lab, 0)
        ita = np.degrees(np.arctan2(L - 50, b))
        out[n] = {'L': round(float(L), 1), 'a': round(float(a), 1), 'b': round(float(b), 1), 'ita': round(float(ita), 1)}
    json.dump(out, open(outp, 'w'), indent=0)
    dark = sorted((v['ita'], k) for k, v in out.items() if v['ita'] < 10)
    print(len(out), 'measured;', len(dark), 'with ITA < 10:', dark[:40])
