"""Install the game's Rocketbox people into the Unity project (L3): for every usable person of data/rb_bodies.json, its FBX
and textures into unity/Assets/SecondFace/People/Rocketbox/<id>/, named by the FBX's material slots: the head and hair as
photographed (or as opened, people_final), the body's colour as the outfit bake left it (neutral cloth) with its normal
map and dye mask (rb_outfit.py), all at 1024 (the phone's budget: a person is about 2 MB on disk, the textures ASTC in the
build). Then Second Face/Build Rocketbox people makes the prefabs and the catalogue.
Usage: python rb_install.py <scratch dir (rblib/, people_final/)> <outfit bake dir> [--only id,id] [--dry]"""
import argparse, json, os, shutil, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
DEST = os.path.join(ROOT, 'unity', 'Assets', 'SecondFace', 'People', 'Rocketbox')
ap = argparse.ArgumentParser()
ap.add_argument('scratch'); ap.add_argument('bake'); ap.add_argument('--only', default=None); ap.add_argument('--dry', action='store_true')
ap.add_argument('--size', type=int, default=1024)
A = ap.parse_args()
cat = json.load(open(os.path.join(HERE, 'data', 'rb_bodies.json')))
only = set(A.only.split(',')) if A.only else None


def put_image(src, dst, size, keep_alpha=False, png=False):
    im = Image.open(src)
    im = im.convert('RGBA' if keep_alpha else 'RGB')
    if max(im.size) > size: im = im.resize((size, size), Image.LANCZOS)
    if png: im.save(dst, optimize=True)
    else: im.save(dst, quality=90)


n = 0; total = 0
for p in cat['people']:
    if p.get('out') or not p.get('roles') or not p.get('body_mat'): continue
    if only and p['id'] not in only: continue
    src = os.path.join(A.scratch, p['source'])
    name = os.path.basename(p['source'])
    fbx = os.path.join(src, name + '.fbx')
    bake = os.path.join(A.bake, p['id'])
    if not os.path.exists(fbx) or not os.path.exists(os.path.join(bake, 'outfit.json')):
        print('skip', p['id'], '(no fbx or no bake)'); continue
    bm = p['body_mat']; hm = bm.replace('_body', '_head'); om = bm.replace('_body', '_opacity')
    d = os.path.join(DEST, p['id'])
    if A.dry: print('would install', p['id'], 'from', src); continue
    os.makedirs(d, exist_ok=True)
    shutil.copyfile(os.path.realpath(fbx), os.path.join(d, p['id'] + '.fbx'))
    put_image(os.path.join(src, hm + '_color.jpg'), os.path.join(d, hm + '_color.jpg'), A.size)
    if os.path.exists(os.path.join(src, hm + '_normal.jpg')):
        put_image(os.path.join(src, hm + '_normal.jpg'), os.path.join(d, hm + '_normal.jpg'), A.size)
    put_image(os.path.join(bake, bm + '_color.jpg'), os.path.join(d, bm + '_color.jpg'), A.size)
    put_image(os.path.join(src, bm + '_normal.jpg'), os.path.join(d, bm + '_normal.jpg'), A.size)
    put_image(os.path.join(bake, bm + '_dye.png'), os.path.join(d, bm + '_dye.png'), A.size, keep_alpha=True, png=True)
    op = os.path.join(src, om + '_color.png')
    if os.path.exists(op): put_image(op, os.path.join(d, om + '_color.png'), A.size, keep_alpha=True, png=True)
    sz = sum(os.path.getsize(os.path.join(d, f)) for f in os.listdir(d) if not f.endswith('.meta'))
    total += sz; n += 1
print('installed', n, 'people,', round(total / 1e6, 1), 'MB')
