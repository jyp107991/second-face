"""Front silhouettes of every body (forearms left out), before (BEFORE=<dir> with an older cast.json and player.json,
drawn without the sex baseline) and after (the briefs now), at one scale, women in rust and men in slate, each sex
by stature. usage: [BEFORE=dir] python3 -I silhouettes.py <mh data> <mh_build.py> <out.png>"""
import json, os, sys, importlib.util
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[3]
sys.argv = [sys.argv[0], sys.argv[1], sys.argv[2], None]
spec = importlib.util.spec_from_file_location('measure', os.path.join(HERE, 'measure.py'))
M = importlib.util.module_from_spec(spec); spec.loader.exec_module(M)
faces = []
cur = None
for line in open(os.path.join(sys.argv[1], '3dobjs', 'base.obj')):
    if line.startswith('g '): cur = line.split()[1]
    elif line.startswith('f ') and cur == 'body':
        faces.append([int(t.split('/')[0]) - 1 for t in line.split()[1:]])
# the forearms and hands left out (the A pose spreads them wide): the shapes of shoulders, waist and hips are what show
ARM = ('lowerarm', 'wrist', 'finger', 'metacarpal', 'hand')
armv = {i for i, (bn, w) in M.best.items() if bn.startswith(ARM)}
faces = [f for f in faces if not any(i in armv for i in f)]
def people(path):
    d = json.load(open(path))
    return [p for p in d['people']]
BRIEFS = os.path.join(HERE, '..', 'briefs')
# before: the briefs as a git revision had them (BEFORE=<dir> holding cast.json and player.json), else the briefs now raw
BEFORE = os.environ.get('BEFORE')
after = people(os.path.join(BRIEFS, 'cast.json')) + people(os.path.join(BRIEFS, 'player.json'))
before = (people(os.path.join(BEFORE, 'cast.json')) + people(os.path.join(BEFORE, 'player.json'))) if BEFORE else after
# women first, then men, each by stature (after), so the spread reads
order = {}
for p in after:
    order[p['id']] = M.measure(M.shape(M.full_spec(p)))['stature']
ids = sorted(order, key=lambda i: (next(p for p in after if p['id'] == i)['gender'] >= 0.5, order[i]))
PX = 2.0          # pixels per cm
W, Hrow = 108, int(200 * PX) + 40
img = Image.new('RGB', (len(ids) * W + 40, 2 * Hrow + 30), (238, 230, 211))
d = ImageDraw.Draw(img)
def draw(p, cx, base_y, colour):
    v = M.shape(M.full_spec(p))
    ground = v[M.body][:, 1].min()
    pts = [(cx + x * 10 * PX, base_y - (y - ground) * 10 * PX) for x, y in v[:, :2]]
    for f in faces:
        d.polygon([pts[i] for i in f], fill=colour)
for row, (label, src, raw) in enumerate((('before', before, True), ('after', after, False))):
    base_y = 20 + row * Hrow + int(200 * PX)
    d.line([(20, base_y), (img.width - 20, base_y)], fill=(170, 160, 140), width=2)
    for h in (150, 160, 170, 180, 190):
        y = base_y - h * PX
        d.line([(20, y), (img.width - 20, y)], fill=(222, 214, 196), width=1)
        d.text((2, y - 6), str(h), fill=(140, 130, 115))
    d.text((24, base_y - int(200 * PX)), label, fill=(60, 52, 44))
    for k, pid in enumerate(ids):
        p = next(q for q in src if q['id'] == pid)
        if raw: p = {**p, 'raw': 1}
        colour = (161, 64, 42) if p['gender'] < 0.5 else (46, 74, 99)
        draw(p, 40 + k * W + W / 2, base_y, colour)
img.save(OUT)
print('saved', OUT, img.size)
