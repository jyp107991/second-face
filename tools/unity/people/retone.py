"""The skin, hair and eyes of a harmonised Rocketbox person (harmonise.py) brought to the target people's measured colours,
keeping every texel of Rocketbox's photographed detail. The skin goes to the target people's measured cheek (Core SkinColour.Lab at the
people's tone and undertone, Bodies.Tone/Undertone, sources in SkinColour.cs) put on Rocketbox's own texture scale (a
line per channel fitted on the library's faces of the peoples it has, data/rocketbox_cheeks.json), keeping half the
head's own difference from its people: lightness by the ratio (so contrast scales with the skin, as on real darker
skin), chroma by the ratio, hue by the difference; each texel by how much it is skin (its distance in Lab from the head's own cheeks),
so lips follow the skin partly and the eyes' whites, the painted hair and the clothes stay. The hair cards (the opacity
texture: hair, brows and lashes) and the painted hair on the head (brows, hairline, stubble) go to the target's hair
colour (Core Looks.HairColours) with their own light and dark kept; the irises (the eyeballs' texture area, from
harmonise.py) to a dark brown where the people's eyes are dark. Writes the textures under Rocketbox's names in <out dir>.
Usage: python3 retone.py <base texture dir> <harmonise json> <out dir> <target cluster> [<tone shift>] [<tone> <undertone>] [<eyes dark|own> <iris shift>]
  (an explicit tone and undertone, as for a mixed people, replace the cluster's own; eyes: this person's draw, dark or
  their base's own; iris shift: the brown iris's lightness, a fraction either way)"""
import json, math, os, shutil, sys
import numpy as np
from PIL import Image

# Core: Bodies.Tone / Bodies.Undertone by cluster, Looks.HairColours, Bodies.LightEyes (kept in step by hand: cite)
TONE = {'north_european': -0.35, 'mediterranean': -0.18, 'east_asian': -0.23, 'southeast_asian': -0.12, 'south_asian': 0.08,
        'latin_american': -0.07, 'indigenous_american': 0.08, 'east_african': 0.77, 'west_african': 0.81}
UNDERTONE = {'east_asian': 0.35, 'southeast_asian': 0.35, 'south_asian': 0.15, 'latin_american': 0.15, 'indigenous_american': 0.15,
             'north_european': -0.3, 'mediterranean': -0.05}
HAIR = {'black': 0x16110d, 'dark_brown': 0x2b1d14}
HAIR_OF = {'mediterranean': 'dark_brown', 'latin_american': 'dark_brown'}  # (CANDELA: 57-95 % brown/black hair, Table 1)
LIGHT_EYES = {'north_european': 0.7, 'mediterranean': 0.25, 'latin_american': 0.08, 'south_asian': 0.04}
IRIS_BROWN = (14.0, 9.5, 11.5)     # a dark brown iris: the library's brown irises (Business_Female_01, Male_Adult_04/12, Female_Adult_11, Military_Male_01: medians L* 12-27, a* 8-11, b* 8-14), towards their darker end
CHEEKS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'rocketbox_cheeks.json')


def cheek_lab(tone, undertone):
    """Core SkinColour.Lab."""
    t = max(-1.0, min(1.0, tone)); L = 54 - 20 * t - 4 * t * t
    u = max(-1.0, min(1.0, undertone)); hue = math.radians(53 + 7 * u)
    chroma = (19 - 0.28 * max(0, 55 - L)) * (1 + 0.06 * u)
    return np.array([L, chroma * math.cos(hue), chroma * math.sin(hue)])


def srgb_to_lab(rgb):
    c = rgb / 255.0; c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ M.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 216 / 24389, np.cbrt(xyz), (24389 / 27 * xyz + 16) / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def lab_to_srgb(lab):
    fy = (lab[..., 0] + 16) / 116; fx = fy + lab[..., 1] / 500; fz = fy - lab[..., 2] / 200
    f = np.stack([fx, fy, fz], -1)
    xyz = np.where(f ** 3 > 216 / 24389, f ** 3, (116 * f - 16) / (24389 / 27)) * np.array([0.95047, 1.0, 1.08883])
    M = np.array([[3.2406, -1.5372, -0.4986], [-0.9689, 1.8758, 0.0415], [0.0557, -0.2040, 1.0570]])
    c = np.clip(xyz @ M.T, 0, 1); c = np.where(c <= 0.0031308, 12.92 * c, 1.055 * c ** (1 / 2.4) - 0.055)
    return np.clip(c * 255 + 0.5, 0, 255).astype(np.uint8)


def to_lch(lab): return lab[..., 0], np.hypot(lab[..., 1], lab[..., 2]), np.arctan2(lab[..., 2], lab[..., 1])
def from_lch(L, C, h): return np.stack([L, C * np.cos(h), C * np.sin(h)], -1)


def hex_lab(h): return srgb_to_lab(np.array([(h >> 16) & 255, (h >> 8) & 255, h & 255], float))


def main(src, info, out, cluster, shift=0.0, tone=None, undertone=None, eyes=None, iris_shift=0.0):
    J = json.load(open(info)); os.makedirs(out, exist_ok=True)
    base_cluster = {'White': 'north_european', 'Black': 'west_african', 'Asian': 'east_asian', 'Hispanic': 'latin_american', 'MENA': 'mediterranean'}[J['source']]
    s_lab = cheek_lab(TONE[base_cluster], UNDERTONE.get(base_cluster, 0))
    t_lab = cheek_lab(TONE[cluster] + shift if tone is None else tone, UNDERTONE.get(cluster, 0) if undertone is None else undertone)
    hmat = J['cheek_material']; prefix = hmat[:-len('_head')]
    head = np.array(Image.open(os.path.join(src, f'{hmat}_color.jpg')).convert('RGB'), float)
    H, W = head.shape[:2]
    lab = srgb_to_lab(head)
    uv = np.array(J['cheek_uv']); px = np.clip((uv[:, 0] * W).astype(int), 0, W - 1); py = np.clip(((1 - uv[:, 1]) * H).astype(int), 0, H - 1)
    patch = np.concatenate([lab[max(y - 6, 0):y + 7, max(x - 6, 0):x + 7].reshape(-1, 3) for x, y in zip(px, py)])
    own = np.median(patch, 0)                               # this head's cheek, in its own texture
    # Rocketbox's textures have their own scale (photographs, lit and balanced): the measured peoples' cheeks are put on
    # it by a straight line per channel fitted where the library holds faces of a people (data/rocketbox_cheeks.json),
    # and the head keeps half its own difference from its people's texture mean (its individual tone)
    cal = json.load(open(CHEEKS))['fit']
    tex = lambda lab: np.array([cal[c][0] + cal[c][1] * lab[i] for i, c in enumerate('Lab')])
    new_cheek = tex(t_lab) + (own - tex(s_lab)) * 0.5
    oL, oC, oh = to_lch(own); nL, nC, nh = to_lch(new_cheek)
    kL, kC, dh = nL / oL, nC / max(oC, 1e-6), nh - oh
    hair_lab = hex_lab(HAIR[HAIR_OF.get(cluster, 'black')])
    # this head's own hair cards (the opacity texture: hair, brows, lashes): their colour sets how light the painted
    # hair is against them (a grey brow under dark hair stays lighter than the hair), and grey cards stay grey (age)
    op = os.path.join(src, f'{prefix}_opacity_color.png')
    cards = None
    if os.path.exists(op):
        _im = np.array(Image.open(op).convert('RGBA'), float); _m = _im[..., 3] > 128
        if _m.any(): cards = np.median(srgb_to_lab(_im[..., :3][_m]), 0)
    # (grey, not blonde: a light, colourless hair is grey only on a base judged 55 or older, the owner's rule for grey
    # hair, data/rocketbox_ages.json; a younger base's light hair is blonde and takes the people's colour)
    ages = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'rocketbox_ages.json'))).get('ages', {})
    base_name = os.path.basename(J.get('base', '')).replace('_sculpt.fbx', '').replace('.fbx', '')
    grey_cards = (cards is not None and float(np.hypot(cards[1], cards[2])) < 9 and cards[0] > 30
                  and ages.get(base_name, 0) >= 55)
    ref_hair = cards[0] if cards is not None else own[0] - 20
    # the lids (J['lids']: texture boxes of the skin around each eye): their creases and lash lines are shading, not hair
    lids = np.zeros((H, W), float)
    for b in J.get('lids', []):
        if b['material'] != hmat: continue
        x0, x1 = int(b['uv_min'][0] * W) - 6, int(b['uv_max'][0] * W) + 6; y0, y1 = int((1 - b['uv_max'][1]) * H) - 6, int((1 - b['uv_min'][1]) * H) + 6
        lids[max(y0, 0):y1, max(x0, 0):x1] = 1.0
    if lids.any():
        from PIL import ImageFilter
        lids = np.array(Image.fromarray((lids * 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(6)), float) / 255.0
    print('cheek in texture', own.round(1), '->', new_cheek.round(1), '(measured', s_lab.round(1), '->', t_lab.round(1), ') k', round(float(kL), 3), round(float(kC), 3), 'hue', round(math.degrees(float(dh)), 1))

    def retone_skin(lab, eyes_box=None, painted_hair=True, lid_mask=None, ab=11.0, lips=True):
        # (ab: how far in a* and b* a texel may lie from the cheek and still be skin: wider on the head, whose orbits and
        # lids are greyer than its cheeks and whose non-skin, the eyes and the hair, is kept apart by other means)
        d = np.sqrt(((lab[..., 0] - own[0]) / 22) ** 2 + ((lab[..., 1] - own[1]) / ab) ** 2 + ((lab[..., 2] - own[2]) / ab) ** 2)
        w = np.clip(1.6 - d, 0, 1)
        if lid_mask is not None: w = w + (1 - w) * lid_mask     # the lids are skin through and through
        L, C, h = to_lch(lab)
        # going darker, the skin's own variations of hue (a light skin's yellower orbits, pinker nose) shrink towards its
        # cheek's (melanin evens them out), and the lids darken a little (periorbital hyperpigmentation is more common in
        # darker skin: Sarkar et al. 2016, J Clin Aesthet Dermatol 9:49)
        dk = float(np.clip(1 - kL, 0, 0.6))
        oh = float(np.arctan2(own[2], own[1]))
        hdev = np.angle(np.exp(1j * (h - oh)))
        Lk = L * kL * (1 - 0.12 * dk * lid_mask) if lid_mask is not None else L * kL
        sk = from_lch(Lk, C * kC, oh + hdev * (1 - 0.6 * dk) + dh)
        # the lips (redder than the skin, as light or darker): their pigment follows the skin's, so they take the skin's
        # lightness and chroma change in full, keeping their own redness against it
        wl = np.clip((lab[..., 1] - own[1] - 3) / 6, 0, 1) * np.clip((own[0] + 8 - L) / 8, 0, 1) * (1 - w)
        if lid_mask is not None: wl = wl * (1 - lid_mask)
        if not lips: wl = np.zeros_like(wl)                # (the body's texture has no lips, only clothes)
        w = w + wl
        # the painted hair (brows, hairline, stubble): darker than the skin, not of it
        wh = np.clip((own[0] - 14 - L) / 12, 0, 1) * (1 - w) * np.clip((own[1] + 3 - lab[..., 1]) / 4, 0, 1) * 0.7 if painted_hair and not grey_cards else np.zeros_like(w)
        if lid_mask is not None: wh = wh * (1 - lid_mask)
        # (not the lips: redder than the skin; and at most most of the way, the lash lines and brows keep some of their own);
        # as light against the new hair as it was against the head's own hair cards, and never lighter than it was
        hL = np.minimum(hair_lab[0] * np.clip(L / max(ref_hair, 8), 0.3, 4.0), L)
        hr = np.stack([hL, hair_lab[1] + (lab[..., 1] - own[1]) * 0.15, hair_lab[2] + (lab[..., 2] - own[2]) * 0.15], -1)
        new = lab * (1 - w - wh)[..., None] + sk * w[..., None] + hr * wh[..., None]
        if eyes_box is not None: new[eyes_box] = lab[eyes_box]
        return new

    # the eyeballs' area keeps its own colours here (retoned below as irises)
    eyes_box = np.zeros((H, W), bool)
    for e in J['eyeballs'].values():
        if e['material'] != hmat: continue
        x0, x1 = int(e['uv_min'][0] * W) - 4, int(e['uv_max'][0] * W) + 4; y0, y1 = int((1 - e['uv_max'][1]) * H) - 4, int((1 - e['uv_min'][1]) * H) + 4
        eyes_box[max(y0, 0):y1, max(x0, 0):x1] = True
    new = retone_skin(lab, eyes_box, lid_mask=lids, ab=16.0)
    # the irises: every Rocketbox eye shares one texture layout (the eyeball's island, J['eyeballs']): the pupil within
    # 0.09 of the island's half-width from its centre, the iris out to 0.30 (its dark limbal ring at 0.27), the sclera
    # beyond (measured on the library's textures, light and dark eyes alike). Where this person's eyes are dark, the iris
    # takes the library's own brown irises' colour (median of its brown-eyed heads, L* 12-27, a* 8-11, b* 8-14), keeping
    # its own pattern of light and dark and its painted catchlights.
    dark_eyes = (LIGHT_EYES.get(cluster, 0.01) < 0.3) if eyes is None else (eyes == 'dark')
    if dark_eyes:
        for box in {(round(e['uv_min'][0], 3), round(e['uv_min'][1], 3), round(e['uv_max'][0], 3), round(e['uv_max'][1], 3))
                    for e in J['eyeballs'].values() if e['material'] == hmat}:
            x0, x1 = box[0] * W, box[2] * W; y0, y1 = (1 - box[3]) * H, (1 - box[1]) * H
            cx, cy, R = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2
            ys, xs = np.mgrid[int(y0):int(y1) + 1, int(x0):int(x1) + 1]
            ys, xs = np.clip(ys, 0, H - 1), np.clip(xs, 0, W - 1)
            rr = np.hypot(xs - cx, ys - cy) / R
            e_lab = lab[ys, xs]; L, C, h = to_lch(e_lab)
            zone = (rr > 0.075) & (rr < 0.305)
            if not zone.any(): continue
            fade = np.clip((rr - 0.075) / 0.02, 0, 1) * np.clip((0.305 - rr) / 0.02, 0, 1)
            catch = (L > 70) & (C < 10)                       # painted catchlights stay
            mL, ma, mb = np.median(e_lab[zone], 0)
            irisL = IRIS_BROWN[0] * (1 + iris_shift)
            tgt = np.stack([irisL * np.clip(L / max(mL, 1), 0.3, 2.5), IRIS_BROWN[1] + (e_lab[..., 1] - ma) * 0.3,
                            IRIS_BROWN[2] + (e_lab[..., 2] - mb) * 0.3], -1)
            wgt = (fade * ~catch)[..., None]
            new[ys, xs] = e_lab * (1 - wgt) + tgt * wgt
    # the whites of the eyes on darker skin: a little dimmer and warmer (pigment in the conjunctiva is common in darkly
    # pigmented people: complexion-associated, or racial, melanosis), in step with how much the skin was darkened
    dk = float(np.clip(1 - kL, 0, 0.6))
    if dk > 0.05:
        for box in {(round(e['uv_min'][0], 3), round(e['uv_min'][1], 3), round(e['uv_max'][0], 3), round(e['uv_max'][1], 3))
                    for e in J['eyeballs'].values() if e['material'] == hmat}:
            x0, x1 = box[0] * W, box[2] * W; y0, y1 = (1 - box[3]) * H, (1 - box[1]) * H
            cx, cy, R = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2
            ys, xs = np.mgrid[int(y0):int(y1) + 1, int(x0):int(x1) + 1]
            ys, xs = np.clip(ys, 0, H - 1), np.clip(xs, 0, W - 1)
            rr = np.hypot(xs - cx, ys - cy) / R
            sc = (np.clip((rr - 0.30) / 0.03, 0, 1))[..., None]
            e = new[ys, xs]; t = e.copy()
            t[..., 0] *= 1 - 0.18 * dk; t[..., 1] += 2.5 * dk; t[..., 2] += 6 * dk
            new[ys, xs] = e * (1 - sc) + t * sc
    Image.fromarray(lab_to_srgb(new)).save(os.path.join(out, f'{hmat}_color.jpg'), quality=92)
    body_p = os.path.join(src, f'{prefix}_body_color.jpg')
    if os.path.exists(body_p):
        b = srgb_to_lab(np.array(Image.open(body_p).convert('RGB'), float))
        Image.fromarray(lab_to_srgb(retone_skin(b, painted_hair=False, lips=False))).save(os.path.join(out, f'{prefix}_body_color.jpg'), quality=92)
    if os.path.exists(op) and not grey_cards:
        im = np.array(Image.open(op).convert('RGBA'), float); a = im[..., 3]
        l = srgb_to_lab(im[..., :3]); m = a > 128
        ref = np.median(l[m][:, 0]) if m.any() else 50
        nl = np.stack([hair_lab[0] * np.clip(l[..., 0] / max(ref, 1), 0.35, 1.8), hair_lab[1] + (l[..., 1] - np.median(l[m][:, 1])) * 0.2, hair_lab[2] + (l[..., 2] - np.median(l[m][:, 2])) * 0.2], -1)
        rgb = lab_to_srgb(nl)
        Image.fromarray(np.dstack([rgb, im[..., 3].astype(np.uint8)]), 'RGBA').save(os.path.join(out, f'{prefix}_opacity_color.png'))
    for f in os.listdir(src):                                # the rest as they are (normals, specular, gear): linked, not copied
        if f.endswith(('.jpg', '.png')) and f.startswith(prefix) and not os.path.exists(os.path.join(out, f)):
            dst = os.path.join(out, f)
            if os.path.lexists(dst): os.remove(dst)
            os.symlink(os.path.abspath(os.path.join(src, f)), dst)
    print('wrote', out)


if __name__ == '__main__':
    a = sys.argv[1:]
    main(a[0], a[1], a[2], a[3], float(a[4]) if len(a) > 4 else 0.0, float(a[5]) if len(a) > 5 else None, float(a[6]) if len(a) > 6 else None,
         a[7] if len(a) > 7 else None, float(a[8]) if len(a) > 8 else 0.0)
