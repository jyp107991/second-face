"""The second half of ffhq_bake.py, outside Blender (colour-safe): the texel map it wrote (each face texel of the
Rocketbox head's texture: its place in the FFHQ-UV texture and its weight) is sampled from the photograph's texture
and written in Rocketbox's layout, with its mask; the face's cheek colour is measured and turned into the Core tone and
undertone that put Rocketbox's skin outside the face at that colour (retone.py's texture scale).
Usage: python3 ffhq_bake_finish.py <out dir of ffhq_bake.py> <ffhq texture png> <base head texture jpg>"""
import json, math, os, sys
import numpy as np
from PIL import Image, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from retone import srgb_to_lab

out_dir, ffhq_png, base_jpg = sys.argv[1:4]
DETAIL = float(os.environ.get('FFHQ_DETAIL', 0.8))          # how much of Rocketbox's fine skin detail goes over the face
M = np.load(os.path.join(out_dir, 'ffhq_map.npz'))
ys, xs, uv, mask, cheek = M['ys'], M['xs'], M['uv'], M['mask'], M['cheek']
H, W = (int(v) for v in M['size'])
J = json.load(open(os.path.join(out_dir, 'ffhq.json')))
tex = np.asarray(Image.open(ffhq_png).convert('RGB'), np.float32) / 255.0
base = np.asarray(Image.open(base_jpg).convert('RGB').resize((W, H)), np.float32) / 255.0


def sample(img, uv):
    x = np.clip(uv[:, 0] * (img.shape[1] - 1), 0, img.shape[1] - 1.001); y = np.clip((1 - uv[:, 1]) * (img.shape[0] - 1), 0, img.shape[0] - 1.001)
    x0 = x.astype(int); y0 = y.astype(int); fx = (x - x0)[:, None]; fy = (y - y0)[:, None]
    return img[y0, x0] * (1 - fx) * (1 - fy) + img[y0, x0 + 1] * fx * (1 - fy) + img[y0 + 1, x0] * (1 - fx) * fy + img[y0 + 1, x0 + 1] * fx * fy


on = mask > 0
rgb = np.zeros((len(ys), 3), np.float32); rgb[on] = sample(tex, uv[on])
# a photograph with parted lips shows teeth between them, which the carrier's closed lips put on the lips: pale, low-chroma
# texels in the mouth's zone keep Rocketbox's own lips (the mask there goes to 0, feathered by the blur below)
if 'mouth' in M:
    ml = srgb_to_lab(rgb * 255.0); mC = np.hypot(ml[:, 1], ml[:, 2])
    ref_L = float(np.median(ml[on & cheek][:, 0])) if (on & cheek).sum() > 20 else 45.0
    teeth = on & M['mouth'] & (ml[:, 0] > ref_L + 12) & (mC < 14)
    mask = np.where(teeth, 0.0, mask); on = mask > 0
    print('teeth texels kept from the base', int(teeth.sum()))
# harmonised to Rocketbox's house style, two ways. (1) Colour: FFHQ-UV's normalisation dulls the skin (a dark face's
# cheek at chroma 13 where Rocketbox's photographed dark faces sit at 27-38, hue 49-64 degrees: Male_Adult_12,
# Military_Male_01, Business_Female_01), so the face's chroma is brought to Rocketbox's for its lightness and its hue
# halfway to Rocketbox's typical, keeping its own lightness and its own variation. (2) Shading: Rocketbox's textures
# carry the photograph's soft shading (under the brows, beside the nose), FFHQ-UV's are even-lit, so the base head's own
# low-frequency shading (its lightness blurred, against its face's mean) is laid over the real face.
from retone import to_lch, from_lch, lab_to_srgb
lab = srgb_to_lab(rgb[on] * 255.0)
L, C, h = to_lch(lab)
cheek_on = cheek[on] & (mask[on] > 0.5)
Lc, Cc, hc = [(np.median(v[cheek_on]) if cheek_on.sum() > 20 else np.median(v)) for v in (L, C, h)]
C_target = 26.7 + max(0.0, Lc - 35.0) * 0.4
kC = float(np.clip(C_target / max(Cc, 1e-3), 1.0, 3.0))
h_typ = math.radians(56.0); dh = 0.5 * float(np.angle(np.exp(1j * (h_typ - hc))))
h_new = float(np.angle(np.exp(1j * (hc + dh))))
dh += float(np.clip(h_new, math.radians(47.0), math.radians(66.0))) - h_new     # within Rocketbox's dark faces' hues
# (the skin only: hair, a beard's stubble and the darkest creases, much darker than the cheek, keep their own chroma and
# hue, or they turn purple)
sk = np.clip((L - (Lc - 22)) / 12, 0, 1)
lab = from_lch(L, np.clip(C * (1 + (kC - 1) * sk), 0, 60), h + dh * sk)
# a woman's lips a little more saturated and her skin smoother, as Rocketbox's own women are photographed (lightly made
# up, softly lit): the lips (redder than the cheek) by 12 % in chroma
if os.environ.get('FFHQ_SEX') == 'f':
    L2, C2, h2 = to_lch(lab)
    lip = np.clip((lab[:, 1] - np.median(lab[:, 1]) - 4) / 6, 0, 1)
    lab = from_lch(L2, C2 * (1 + 0.12 * lip), h2)
baseL = srgb_to_lab(base * 255.0)[..., 0]
blur = np.asarray(Image.fromarray(np.clip(baseL * 2.55, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(14)), np.float32) / 2.55
shade = blur[ys[on], xs[on]]
ref = float(np.median(shade[cheek_on])) if cheek_on.sum() > 20 else float(np.median(shade))
# FFHQ_EVEN (0..1): the photograph's broad blotches (uneven light left in it, patchy skin) evened out: its lightness's
# deviation from the face's median, blurred over about a centimetre, taken away by this share (fine detail, brows and
# lips stay, being narrower than the blur)
EVEN = float(os.environ.get('FFHQ_EVEN', 0.0))
if EVEN > 0:
    Lim = np.full((H, W), np.nan, np.float32); Lim[ys[on], xs[on]] = lab[:, 0]
    med = float(np.nanmedian(Lim)); fill = np.where(np.isnan(Lim), med, Lim)
    big = np.asarray(Image.fromarray(np.clip(fill * 2.55, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(18)), np.float32) / 2.55
    lab[:, 0] = lab[:, 0] - EVEN * (big[ys[on], xs[on]] - med)
lab[:, 0] = lab[:, 0] * np.clip(shade / max(ref, 1e-3), 0.6, 1.25) ** 0.7
# (3) Detail: the photograph's texture holds the face at about 400 texels across, blurred by its normalisation, where
# Rocketbox's holds it at about 700 with the photograph's pores and fine lines; so the base texture's fine detail (its
# lightness above a 2.5-texel blur, which at this scale is pores and fine lines, not the person's features) is laid over
# the real face, scaled to the face's lightness, so the face is as crisp as the heads beside it.
fine = baseL - np.asarray(Image.fromarray(np.clip(baseL * 2.55, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2.5)), np.float32) / 2.55
fine = np.clip(fine, -12, 12)[ys[on], xs[on]]
lab[:, 0] = np.clip(lab[:, 0] + fine * DETAIL * np.clip(lab[:, 0] / max(float(np.median(lab[:, 0])), 1.0), 0.5, 1.5), 2, 98)
rgb[on] = lab_to_srgb(lab).astype(np.float32) / 255.0
out = base.copy(); out[ys[on], xs[on]] = rgb[on]
print('harmonised: cheek chroma', round(float(Cc), 1), '->', round(float(Cc * kC), 1), 'hue', round(math.degrees(float(hc)), 1), '->', round(math.degrees(float(hc + dh)), 1))
m = np.zeros((H, W), np.float32); m[ys, xs] = mask
m = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3)), np.float32) / 255.0
# FFHQ_KEEP_LIPS: the base's own lips (Rocketbox's, photographed: their shape, lines and gloss), carried to this face's
# skin: their lightness by the ratio of this face's cheek to the base's, their colour kept as far from the cheek as the
# base's lips are from its own (a darker skin's lips darker, as they are)
if os.environ.get('FFHQ_KEEP_LIPS') and 'mouth' in M:
    bl = srgb_to_lab(base * 255.0)
    sel_c = on & cheek
    cb = np.median(bl[ys[sel_c], xs[sel_c]], 0) if sel_c.sum() > 20 else np.median(bl[ys, xs], 0)
    lips = M['mouth'] & (bl[ys, xs, 1] > cb[1] + 5)
    cf = np.median(srgb_to_lab(out[ys[sel_c], xs[sel_c]] * 255.0), 0)      # this face's cheek, as baked
    lb = bl[ys[lips], xs[lips]]
    nl = np.stack([lb[:, 0] * cf[0] / max(cb[0], 1) * 0.97, cf[1] + (lb[:, 1] - cb[1]) * 0.85, cf[2] + (lb[:, 2] - cb[2]) * 0.85], -1)
    mm = np.zeros((H, W), np.uint8); mm[ys[lips], xs[lips]] = 255
    mm = np.asarray(Image.fromarray(mm).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(2)), np.float32)[..., None] / 255.0
    lipimg = out.copy(); lipimg[ys[lips], xs[lips]] = lab_to_srgb(nl).astype(np.float32) / 255.0
    out = out * (1 - mm) + lipimg * mm
    print('lips kept from the base, carried to this skin:', int(lips.sum()), 'texels')
Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).save(os.path.join(out_dir, f"{J['material']}_ffhq_color.jpg"), quality=94)
Image.fromarray((np.clip(m, 0, 1) * 255).astype(np.uint8)).save(os.path.join(out_dir, f"{J['material']}_ffhq_mask.png"))

# the scalp above the photograph's hairline (where FFHQ-UV paints hair), for scalp_paint.py: cropped hair, not skin
if 'scalp' in M:
    sc = np.zeros((H, W), np.uint8); sc[ys[M['scalp']], xs[M['scalp']]] = 255
    sc = Image.fromarray(sc).filter(ImageFilter.MaxFilter(5))
    sc.save(os.path.join(out_dir, f"{J['material']}_scalp_mask.png"))
sel = on & cheek & (mask > 0.5)
lab = np.median(srgb_to_lab(rgb[sel] * 255.0), 0) if sel.sum() > 20 else np.median(srgb_to_lab(rgb[on] * 255.0), 0)
cal = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'rocketbox_cheeks.json')))['fit']
Lm = (lab[0] - cal['L'][0]) / cal['L'][1]                          # the measured L* that maps to this texture L*
disc = 400 - 16 * (Lm - 54)                                        # L = 54 - 20 t - 4 t^2
tone = max(-1.0, min(1.0, (-20 + math.sqrt(max(disc, 0))) / 8 if disc >= 0 else 1.0))
am = (lab[1] - cal['a'][0]) / cal['a'][1]; bm = (lab[2] - cal['b'][0]) / cal['b'][1]
und = max(-1.0, min(1.0, (math.degrees(math.atan2(bm, am)) - 53) / 7))
J.update({'cheek_lab': [round(float(v), 1) for v in lab], 'tone': round(tone, 3), 'undertone': round(und, 3)})
json.dump(J, open(os.path.join(out_dir, 'ffhq.json'), 'w'))
print('baked', int((mask > 0.5).sum()), 'texels; cheek', J['cheek_lab'], 'tone', J['tone'], 'undertone', J['undertone'])
