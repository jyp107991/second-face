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
    # (and the dark line between parted lips, which a closed mouth lays on its lower lip as a smudge)
    # (only for a photograph with parted lips, FFHQ_LIP_GAP=1: on a closed mouth that is the mouth's own line, and keeping
    # the base's there left one side of a carried lip pale and the mouth askew, owner 2026-11-04)
    gap = on & M['mouth'] & (ml[:, 0] < ref_L - 28) & (os.environ.get('FFHQ_LIP_GAP') == '1')
    mask = np.where(gap, 0.0, mask); on = mask > 0
    print('lip-gap texels kept from the base', int(gap.sum()))
# a face's own hair above its cheek line (sideburns, temple hair, a hairline the source reached) is never carried onto
# the new head's bare temple or forehead (owner: "facial hair like blocks misplaced on faces"): the new head's own skin
# and hair stay there. Its brows and lids are kept, and its beard, which lies below the cheek line.
def sideburn_zone(q_):
    # (in front of each ear, within about 22 mm of its front and below the ear's top: a sideburn; never the temple beside
    # the eye, where a source's long side hair under its cap read as dark bars, owner's MA15. A weight, 0..1: the sideburn
    # fades into the new head's own hair above over 16 mm, never stopping at a line, MA15's second try)
    if 'ear_y' in M:
        ey = np.where(q_[:, 0] > 0, M['ear_y'][0], M['ear_y'][1])
        sm = lambda a, b, v: np.clip((v - a) / (b - a), 0, 1)
        return sm(46, 54, np.abs(q_[:, 0])) * sm(-28, -18, q_[:, 1] - ey) * (1 - sm(-12, 4, q_[:, 2]))
    return np.zeros(len(q_), np.float32)
if 'eo' in M and os.environ.get('FFHQ_HAIR_ABOVE', '0') != '1':
    eo = M['eo']; hl = srgb_to_lab(rgb * 255.0)
    ref_L = float(np.median(hl[on & cheek][:, 0])) if (on & cheek).sum() > 20 else 50.0
    brow = (eo[:, 2] > 4) & (eo[:, 2] < 30) & (np.abs(eo[:, 0]) < 26)
    lids = np.linalg.norm(eo, axis=1) < 15
    # (a weight: as dark as hair, from 18 L* under the cheek's over 8, and above the cheek line, by 6 mm; skin in a hijab's
    # or a keffiyeh's shadow is not hair, it keeps its skin's hue: FA10's and MA19's shaded temples were taken for hair and
    # left as pale bands. Feathered in the texture below, so no carried edge is a line)
    hC = np.hypot(hl[:, 1], hl[:, 2]); refC = float(np.median(hC[on & cheek])) if (on & cheek).sum() > 20 else 20.0
    hairlike = np.clip((ref_L - 18 - hl[:, 0]) / 8, 0, 1) * np.clip((0.85 * refC - hC) / (0.3 * refC) + (ref_L - 32 - hl[:, 0]) / 8, 0, 1)
    hair_above = on * np.clip((eo[:, 2] + 15) / 6, 0, 1) * (~brow) * (~lids) * hairlike
    # (and a head cloth's light edge above the brows, carried in faces whose centre was skin: light and colourless, as no
    # skin is; MA19's keffiyeh left a pale line across his forehead)
    cloth = on * np.clip((eo[:, 2] - 8) / 6, 0, 1) * np.clip((hl[:, 0] - ref_L - 4) / 6, 0, 1) * np.clip((0.6 * refC - hC) / (0.2 * refC), 0, 1)
    hair_above = np.maximum(hair_above, cloth)
    if os.environ.get('FFHQ_BEARD') == '1' and 'q' in M:
        # (a bearded man's sideburn, on the side in front of the ear and below its top, joins his beard to his hair: it is
        # his own and comes with the beard, never left as a bare gap between the two)
        q_ = M['q']; hair_above = hair_above * (1 - sideburn_zone(q_))
    hi = np.zeros((H, W), np.float32); hi[ys, xs] = hair_above
    hb = np.asarray(Image.fromarray((np.clip(hi, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.005 * W)), np.float32)[ys, xs] / 255.0
    mask = mask * (1 - np.clip(np.maximum(hair_above, hb) * 1.2, 0, 1)); on = mask > 0
    print('hair above the cheek line kept from the new head', int((hair_above > 0.5).sum()))
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
# FFHQ_LF_BASE (0..1): the skin's broad colour from the Rocketbox base's own photograph (owner, 2026-11-02: the new
# people's skin was uneven, leathery and grafted on, not organic like Rocketbox's). The face keeps its own detail finer
# than about FFHQ_LF_RADIUS (features, lines, pores: its identity), scaled by FFHQ_HF_GAIN; everything broader (the
# capture's uneven light, blotches, casts) is replaced by the base's own variation at this face's cheek colour, so the
# skin varies as a photographed Rocketbox face does and meets the rest of the head without an edge (the base's shading
# comes with it, so the shading step is skipped)
LFB = float(os.environ.get('FFHQ_LF_BASE', 0.0)); HFG = float(os.environ.get('FFHQ_HF_GAIN', 1.0))
orbit_w = 0.0                                              # (where the orbits' detail is already the base's, FFHQ_ORBIT)
if LFB > 0:
    rad = float(os.environ.get('FFHQ_LF_RADIUS', 0.014)) * W
    def blur3(img, wmask):
        out_ = np.zeros_like(img)
        wb = np.asarray(Image.fromarray((wmask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(rad)), np.float32) / 255.0
        for c, (off, k) in enumerate(((0.0, 2.55), (128.0, 1.0), (128.0, 1.0))):
            ch = np.clip((img[..., c] * k + off) * wmask, 0, 255)
            bl = np.asarray(Image.fromarray(ch.astype(np.uint8)).filter(ImageFilter.GaussianBlur(rad)), np.float32)
            out_[..., c] = (bl / np.maximum(wb, 1e-3) - off) / k
        return out_
    Fimg = np.zeros((H, W, 3), np.float32); wm = np.zeros((H, W), np.float32)
    Fimg[ys[on], xs[on]] = lab; wm[ys[on], xs[on]] = 1.0
    F_lf = blur3(Fimg, wm)[ys[on], xs[on]]
    Bl = srgb_to_lab(base * 255.0).astype(np.float32)
    B_lf = blur3(Bl, np.ones((H, W), np.float32))[ys[on], xs[on]]
    B_hf = Bl[ys[on], xs[on]] - B_lf
    cb = np.median(Bl[ys[on & cheek], xs[on & cheek]], 0) if (on & cheek).sum() > 20 else np.median(Bl[ys[on], xs[on]], 0)
    cf = np.median(lab[cheek_on], 0) if cheek_on.sum() > 20 else np.median(lab, 0)
    cbC, cfC = float(np.hypot(cb[1], cb[2])), float(np.hypot(cf[1], cf[2]))
    hf = (lab - F_lf) * HFG
    # FFHQ_ORBIT: round each eye, up to the brow's lower edge, the fine detail (the lid's folds and creases, the pores) is
    # the base's own, which lies where its lids and eyes are: the face's own folds there, photographed round eyes of
    # another shape, doubled the base's and read as eyes pasted on (owner, 2026-11-02). Full within an ellipse 18 mm to
    # the side, 12 mm up and 15 mm down from the eye's centre, gone by a third further out.
    if 'eo' in M and float(os.environ.get('FFHQ_ORBIT', 1.0)) > 0:
        eo_ = M['eo'][on]
        rho = np.sqrt((eo_[:, 0] / 18.0) ** 2 + (eo_[:, 2] / np.where(eo_[:, 2] > 0, 12.0, 15.0)) ** 2)
        ow = np.clip((1.35 - rho) / 0.35, 0, 1); ow = ow * ow * (3 - 2 * ow) * float(os.environ.get('FFHQ_ORBIT', 1.0))
        # never the brows: this person's brows stay theirs, and the base's (at its own height, often thinner and lighter)
        # never come in; a brow is hair well darker than its own face's cheek, above the eye, slightly widened and softened
        def brows(Lmap):
            img = Image.fromarray((np.clip(Lmap, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(3))
            return np.asarray(img, np.float32)[ys[on], xs[on]] / 255.0
        above = (eo_[:, 2] > 9).astype(np.float32)          # (not the lash line, lower)
        La = np.zeros((H, W), np.float32); La[ys[on], xs[on]] = np.clip((cf[0] - 10 - lab[:, 0]) / 8, 0, 1) * above
        Lb = np.zeros((H, W), np.float32); Lb[ys[on], xs[on]] = np.clip((cb[0] - 10 - Bl[ys[on], xs[on], 0]) / 8, 0, 1) * above
        ow = (ow * (1 - np.maximum(brows(La), brows(Lb))))[:, None]
        bhf = B_hf * np.array([cf[0] / max(cb[0], 1.0), cfC / max(cbC, 1.0), cfC / max(cbC, 1.0)], np.float32)
        hf = hf * (1 - ow) + bhf * ow
        orbit_w = ow[:, 0]
        print('orbits: the base\'s own fine detail on', int((ow > 0.5).sum()), 'texels')
    new = np.stack([cf[0] * B_lf[:, 0] / max(cb[0], 1.0), cf[1] + (B_lf[:, 1] - cb[1]) * cfC / max(cbC, 1.0),
                    cf[2] + (B_lf[:, 2] - cb[2]) * cfC / max(cbC, 1.0)], -1) + hf
    lfb = (LFB + (1 - LFB) * orbit_w)[:, None] if np.ndim(orbit_w) else LFB     # (the orbits wholly: none of the face's own folds)
    # near the carried face's edges (the temples, the jaw's angle, the neck) its broad colour is wholly the base's: a
    # source shaded by its hijab or cap left a faint band where its last 15 % met the base's own skin (FA10's side, owner
    # 2026-11-04 "a seam across the side of the face"); the face's own broad colour stays only well inside its area
    if os.environ.get('FFHQ_EDGE', '1') != '0':
        mt = np.zeros((H, W), np.float32); mt[ys, xs] = mask
        mb = np.asarray(Image.fromarray((np.clip(mt, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.012 * W)), np.float32)[ys[on], xs[on]] / 255.0
        ew = np.clip((0.92 - mb) / 0.3, 0, 1)
        lfb = np.broadcast_to(lfb, (len(lab), 1)) if np.ndim(lfb) else np.full((len(lab), 1), float(lfb))
        lfb = lfb + (1 - lfb) * ew[:, None]
        print('edges: the base\'s broad colour on', int((ew > 0.5).sum()), 'texels')
    if os.environ.get('FFHQ_BEARD') == '1' and 'eo' in M:
        # (a beard is broad and dark: under the base's broad colour it was lost, owner's MA19; it keeps its own, its density
        # and its natural edge, wherever the face's own broad lightness is well under its cheek's below the cheek line)
        # (the lips and nostrils too keep their own: under the base's broad colour the beard round the mouth was lost in a
        # pale block, MA15, and a zone left out under the nose cut a moustache with a straight step, Delivery_Male_01)
        eo_b = M['eo'][on]
        bw = np.clip((cf[0] - 5 - F_lf[:, 0]) / 8, 0, 1) * np.clip((-6 - eo_b[:, 2]) / 8, 0, 1)
        if 'q' in M:
            q_b = M['q'][on]; bw = np.maximum(bw, np.clip((cf[0] - 5 - F_lf[:, 0]) / 8, 0, 1) * sideburn_zone(q_b))
        lfb = (np.broadcast_to(lfb, (len(lab), 1)) if np.ndim(lfb) else np.full((len(lab), 1), lfb)) * (1 - bw[:, None])
        print('beard keeps its own broad colour on', int((bw > 0.5).sum()), 'texels')
    lab = lab * (1 - lfb) + new * lfb
    print('broad colour from the base: strength', LFB, 'radius', round(rad, 1), 'px; detail gain', HFG)
else:
    lab[:, 0] = lab[:, 0] * np.clip(shade / max(ref, 1e-3), 0.6, 1.25) ** 0.7
# (3) Detail: the photograph's texture holds the face at about 400 texels across, blurred by its normalisation, where
# Rocketbox's holds it at about 700 with the photograph's pores and fine lines; so the base texture's fine detail (its
# lightness above a 2.5-texel blur, which at this scale is pores and fine lines, not the person's features) is laid over
# the real face, scaled to the face's lightness, so the face is as crisp as the heads beside it.
fine = baseL - np.asarray(Image.fromarray(np.clip(baseL * 2.55, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2.5)), np.float32) / 2.55
fine = np.clip(fine, -12, 12)[ys[on], xs[on]]
lab[:, 0] = np.clip(lab[:, 0] + fine * DETAIL * (1 - orbit_w) * np.clip(lab[:, 0] / max(float(np.median(lab[:, 0])), 1.0), 0.5, 1.5), 2, 98)
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
# FFHQ_SURROUND (with the broad colour from the base, on by default): the rest of the head's skin (the temples where the
# photograph had hair, the ears, the jaw's underside and the neck) takes the same transform as the face's broad colour,
# the base's own photograph scaled to this face's cheek, instead of retone.py's general tone: a band at the temple or a
# step at the jaw was where the two transforms met (owner, 2026-11-02: "a seam where her face joins hair")
if LFB > 0 and os.environ.get('FFHQ_SURROUND', '1') != '0':
    bl = srgb_to_lab(base * 255.0)
    sel_c = on & cheek
    cb = np.median(bl[ys[sel_c], xs[sel_c]], 0) if sel_c.sum() > 20 else np.median(bl[ys, xs], 0)
    cf = np.median(srgb_to_lab(out[ys[sel_c], xs[sel_c]] * 255.0), 0)
    cbC, cfC = float(np.hypot(cb[1], cb[2])), float(np.hypot(cf[1], cf[2]))
    ns = np.stack([bl[..., 0] * cf[0] / max(cb[0], 1.0), cf[1] + (bl[..., 1] - cb[1]) * cfC / max(cbC, 1.0),
                   cf[2] + (bl[..., 2] - cb[2]) * cfC / max(cbC, 1.0)], -1)
    # how far each of the base's texels is skin (its hair, eyes, teeth and gums are not): as retone.py tells skin
    ws = np.clip(1.6 - np.sqrt(((bl[..., 0] - cb[0]) / 22) ** 2 + ((bl[..., 1] - cb[1]) / 16) ** 2 + ((bl[..., 2] - cb[2]) / 16) ** 2), 0, 1).astype(np.float32)
    ns_rgb = lab_to_srgb(ns).astype(np.float32) / 255.0
    out = out * m[..., None] + ns_rgb * (1 - m[..., None])
    m = m + (1 - m) * ws
    print('the surrounding skin in the same broad colour:', int((ws > 0.5).sum()), 'texels')
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
