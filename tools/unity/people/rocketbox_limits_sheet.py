"""A contact sheet of the sculptor's sliders at their calibrated limits on the Rocketbox heads (the probe's shots
rbs_<head>_<slider>_<lo|hi>_<view>.png beside rbs_<head>_base_<view>.png), one row per head: for each slider the lower
limit, then the upper, in the view that shows that feature best, each labelled with the limit in units.
Usage: python3 rocketbox_limits_sheet.py <probe dir> <rocketbox_features.json> <out.jpg> <title> slider:view [slider:view ...]"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

def main(probe, features, out, title, specs):
    d = json.load(open(features))
    heads = ['Female_Adult_03', 'Female_Adult_07', 'Male_Adult_05', 'Male_Adult_12']
    specs = [s.split(':') for s in specs]
    W, H = 200, 250                      # each tile: the head's middle of the 512 x 640 shot
    crops = {'front': (96, 60, 416, 460), 'three': (110, 60, 430, 460), 'side': (180, 90, 500, 490)}   # the face in each view
    font = ImageFont.load_default()
    cols = [('base', 'three')] + [(f'{sid}_{e}', view) for sid, view in specs for e in ('lo', 'hi')]
    top, left = 46, 0
    sheet = Image.new('RGB', (left + W * len(cols), top + H * len(heads)), (236, 234, 230))
    g = ImageDraw.Draw(sheet)
    g.text((8, 6), title, fill=(20, 20, 20), font=font)
    for c, (tag, view) in enumerate(cols):
        name = 'base' if tag == 'base' else tag.rsplit('_', 1)[0]
        g.text((left + c * W + 6, 22), f'{name} {"" if tag == "base" else tag.rsplit("_", 1)[1]}', fill=(40, 40, 40), font=font)
    for r, h in enumerate(heads):
        lim = d['faces'][h]['limits']
        for c, (tag, view) in enumerate(cols):
            p = os.path.join(probe, f'rbs_{h}_{tag}_{view}.png')
            x, y = left + c * W, top + r * H
            if os.path.exists(p):
                im = Image.open(p).convert('RGB').crop(crops[view]).resize((W, H))
                sheet.paste(im, (x, y))
            if tag != 'base':
                sid, e = tag.rsplit('_', 1)
                u = lim[sid][0 if e == 'lo' else 1]
                g.rectangle((x, y + H - 14, x + 70, y + H), fill=(255, 255, 255))
                g.text((x + 3, y + H - 13), f'{u:+.2f}', fill=(150, 20, 20) if abs(u) < 0.05 else (20, 20, 20), font=font)
            else:
                g.text((x + 3, y + 3), h.replace('_Adult_', ' '), fill=(255, 255, 255), font=font)
    sheet.save(out, quality=88)
    print('wrote', out, sheet.size)

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5:])
