"""Contact sheets of ScreenshotTests.ShaleResidentsAsTheyAre: unity/Screenshots/shale_resident_NN.png, labelled from the
log's rows `shale_resident NN|id|name|role|sex|age|stature|note|wearing`, thirteen to a sheet; and the faces
(shale_face_NN.png) eight to a row, twenty-four to a sheet.
Usage: python3 shale_sheet.py <playmode.log> unity/Screenshots <out dir> <prefix>"""
import os, sys
from PIL import Image, ImageDraw

LOG, SHOTS, OUT, PREFIX = sys.argv[1:5]
os.makedirs(OUT, exist_ok=True)
rows = []
for line in open(LOG, errors='ignore'):
    if line.startswith('shale_resident '):
        f = line.strip()[len('shale_resident '):].split('|')
        if len(f) >= 8: rows.append(f)
W, H, PER = 320, 480, 13
for s in range(0, len(rows), PER):
    part = rows[s:s + PER]
    cols = 7
    sheet = Image.new('RGB', (W * cols, (H + 54) * ((len(part) + cols - 1) // cols)), (22, 22, 24))
    d = ImageDraw.Draw(sheet)
    for i, f in enumerate(part):
        n, pid, name, role, sex, age, stature = f[:7]
        p = os.path.join(SHOTS, f'shale_resident_{n}.png')
        im = Image.open(p).convert('RGB').resize((W, H), Image.LANCZOS) if os.path.exists(p) else Image.new('RGB', (W, H), (60, 20, 20))
        x, y = (i % cols) * W, (i // cols) * (H + 54)
        sheet.paste(im, (x, y))
        d.text((x + 6, y + H + 4), f'{name} ({role})', fill=(235, 235, 235))
        d.text((x + 6, y + H + 20), f'{sex} {age}, {stature} cm', fill=(190, 190, 190))
    out = os.path.join(OUT, f'{PREFIX}_{s // PER + 1}.jpg')
    sheet.save(out, quality=85)
    print(out)

FW, FH, FPER, FCOLS = 240, 300, 24, 8
faces = [f for f in rows if os.path.exists(os.path.join(SHOTS, f'shale_face_{f[0]}.png'))]
for s in range(0, len(faces), FPER):
    part = faces[s:s + FPER]
    sheet = Image.new('RGB', (FW * FCOLS, (FH + 40) * ((len(part) + FCOLS - 1) // FCOLS)), (22, 22, 24))
    d = ImageDraw.Draw(sheet)
    for i, f in enumerate(part):
        n, pid, name, role, sex, age = f[:6]
        im = Image.open(os.path.join(SHOTS, f'shale_face_{n}.png')).convert('RGB').resize((FW, FH), Image.LANCZOS)
        x, y = (i % FCOLS) * FW, (i // FCOLS) * (FH + 40)
        sheet.paste(im, (x, y))
        d.text((x + 6, y + FH + 4), name[:30], fill=(235, 235, 235))
        d.text((x + 6, y + FH + 20), f'{sex} {age}, {role}', fill=(190, 190, 190))
    out = os.path.join(OUT, f'{PREFIX}_faces_{s // FPER + 1}.jpg')
    sheet.save(out, quality=88)
    print(out)
