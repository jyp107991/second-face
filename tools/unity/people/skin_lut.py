"""The skin's pre-integrated subsurface scattering lookup (P4.15c; Penner and Borshukov, "Pre-Integrated Skin Shading",
GPU Pro 2, 2011): for a sphere of radius r lit at an angle theta, the light diffused through the skin around the ring,
D(theta, r) = int cos(theta + x) R(2 r sin(x / 2)) dx / int R(2 r sin(x / 2)) dx, with R the skin's diffusion profile as
a sum of Gaussians (d'Eon and Luebke, "Advanced Techniques for Realistic Real-Time Skin Rendering", GPU Gems 3, ch. 14).
u = cos(theta) * 0.5 + 0.5 (N.L), v = the curvature 1/r over 0 .. 0.5 per millimetre (flat at the bottom). Written as
an sRGB PNG, 256 x 128; the shader samples it with N.L and the curvature it measures by screen derivatives.
Usage: python3 skin_lut.py <out.png>"""
import sys
import numpy as np
from PIL import Image

# d'Eon and Luebke's six-Gaussian fit of the skin's profile: variances (mm^2) and RGB weights
VARS = np.array([0.0064, 0.0484, 0.187, 0.567, 1.99, 7.41])
WEIGHTS = np.array([
    [0.233, 0.455, 0.649],
    [0.100, 0.336, 0.344],
    [0.118, 0.198, 0.000],
    [0.113, 0.007, 0.007],
    [0.358, 0.004, 0.000],
    [0.078, 0.000, 0.000],
])

def profile(d):
    """R(d) per channel for distances d (mm), shape (..., 3)."""
    g = np.exp(-d[..., None] ** 2 / (2 * VARS)) / (2 * np.pi * VARS)
    return g @ WEIGHTS

def lut(w=256, h=128, steps=512):
    x = np.linspace(-np.pi, np.pi, steps)
    out = np.zeros((h, w, 3))
    for j in range(h):
        c = (j + 0.5) / h * 0.5            # curvature 1/mm
        r = 1.0 / max(c, 1e-4)
        R = profile(np.abs(2 * r * np.sin(x / 2)))           # (steps, 3)
        norm = R.sum(0)
        for i in range(w):
            ndl = (i + 0.5) / w * 2 - 1
            theta = np.arccos(np.clip(ndl, -1, 1))
            light = np.clip(np.cos(theta + x), 0, None)      # (steps,)
            out[j, i] = (light[:, None] * R).sum(0) / norm
    return out

if __name__ == '__main__':
    t = lut()
    srgb = np.where(t <= 0.0031308, 12.92 * t, 1.055 * np.power(np.clip(t, 0, 1), 1 / 2.4) - 0.055)
    img = Image.fromarray((np.clip(srgb, 0, 1) * 255 + 0.5).astype(np.uint8)[::-1], 'RGB')   # row 0 at the top: flat at the bottom
    img.save(sys.argv[1])
    print('wrote', sys.argv[1], t.shape)
