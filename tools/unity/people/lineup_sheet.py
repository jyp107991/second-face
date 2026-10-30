"""Lineup sheets from unity/Screenshots/lineup_* (ScreenshotTests.PeoplesLineup): one per sex (rows: the peoples; columns: 25 front/side, 60 front/side),
and a strip of the balding stages and the brow styles. Usage: python3 lineup_sheet.py unity/Screenshots <out dir>"""
import os, sys
from PIL import Image, ImageDraw
SHOTS, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
PEOPLES = ['north_european', 'mediterranean', 'west_african', 'east_african', 'east_asian', 'southeast_asian', 'south_asian', 'latin_american', 'indigenous_american']
W, H, LW = 240, 300, 150
def load(name):
    p = os.path.join(SHOTS, name + '.png')
    if not os.path.exists(p): return Image.new('RGB', (W, H), (60, 20, 20))
    return Image.open(p).convert('RGB').resize((W, H), Image.LANCZOS)
for sex, word in (('f', 'women'), ('m', 'men')):
    cols = [(25, 'front'), (25, 'side'), (60, 'front'), (60, 'side')]
    sheet = Image.new('RGB', (LW + W * len(cols), 28 + H * len(PEOPLES)), (24, 24, 26))
    d = ImageDraw.Draw(sheet)
    for c, (age, view) in enumerate(cols): d.text((LW + c * W + 8, 8), f'{age}, {view}', fill=(230, 230, 230))
    for r, p in enumerate(PEOPLES):
        d.text((8, 28 + r * H + H // 2 - 6), p.replace('_', ' '), fill=(230, 230, 230))
        for c, (age, view) in enumerate(cols): sheet.paste(load(f'lineup_{p}_{sex}_{age}_{view}'), (LW + c * W, 28 + r * H))
    sheet.save(os.path.join(OUT, f'lineup_{word}.jpg'), quality=86)
strip = ['lineup_bald_0.0', 'lineup_bald_0.3', 'lineup_bald_0.6', 'lineup_bald_1.0', 'lineup_brows_f0', 'lineup_brows_f1', 'lineup_brows_f2', 'lineup_brows_m0', 'lineup_brows_m1', 'lineup_brows_m2']
sheet = Image.new('RGB', (W * 5, 2 * (2 * H) + 56), (24, 24, 26)); d = ImageDraw.Draw(sheet)
for i, n in enumerate(strip[:4]):
    sheet.paste(load(n + '_front'), (i * W, 28)); sheet.paste(load(n + '_side'), (i * W, 28 + H)); d.text((i * W + 8, 8), n.replace('lineup_', ''), fill=(230, 230, 230))
for i, n in enumerate(strip[4:]):
    x, y = (i % 3) * W + (W if i >= 3 else 0) * 0, 56 + 2 * H + (i // 3) * H
    sheet.paste(load(n + '_front'), ((i % 3) * W + (2 * W if False else 0), y - 28)); d.text(((i % 3) * W + 8, y - 24), n.replace('lineup_', ''), fill=(230, 230, 230))
sheet.save(os.path.join(OUT, 'lineup_hair_brows.jpg'), quality=86)
print('sheets in', OUT)
