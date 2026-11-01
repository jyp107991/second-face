"""Scan FFHQ-UV zips for dark-skinned faces: fetch each member by range, measure its skin tone, keep the dark ones
(extracted), punch the fetched range back out of the sparse zip. Usage: python3 scan.py <zip index> <start> <count> <ita max>"""
import os, sys, json, zipfile, io, subprocess
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lazyzip import open_zip, fetch
from tone import srgb_lab

S = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
k, start, count, ita_max = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3]), float(sys.argv[4])
D = f'{S}/ffhq'
sizes = {e['path'].split('/')[-1]: e['size'] for e in json.load(open(f'{D}/uv_tree.json'))}
name = f'{k:03d}.zip'; url = f'https://huggingface.co/datasets/csbhr/FFHQ-UV/resolve/main/dataset/ffhq-uv/uv-maps/{name}'
local = f'{D}/zips/{name}'
zf = open_zip(url, sizes[name], local)
names = sorted(n for n in zf.namelist() if n.endswith('.png'))[start:start + count]
mask = np.asarray(Image.open(f'{D}/center_face_mask.png').convert('L').resize((256, 256))) > 128
tp = f'{D}/tone.json'; tone = json.load(open(tp)) if os.path.exists(tp) else {}
os.makedirs(f'{D}/keep', exist_ok=True)
kept = 0
for n in names:
    info = zf.getinfo(n)
    s0 = info.header_offset; s1 = min(s0 + 30 + len(info.filename.encode()) + 2048 + info.compress_size + 64, sizes[name] - 1)
    try: fetch(url, local, s0, s1)
    except SystemExit as e: print('fetch failed', n, e); continue
    try:
        data = zf.read(n)
        im = Image.open(io.BytesIO(data)).convert('RGB').resize((256, 256))
    except Exception as e:
        print('bad member', n, e); subprocess.run(['fallocate', '-p', '-o', str(s0), '-l', str(s1 - s0 + 1), local]); continue
    lab = srgb_lab(np.asarray(im, np.float64) / 255.0)[mask]
    L, a, b = np.median(lab, 0); ita = float(np.degrees(np.arctan2(L - 50, b)))
    tone[n] = {'L': round(float(L), 1), 'a': round(float(a), 1), 'b': round(float(b), 1), 'ita': round(ita, 1)}
    if ita < ita_max:
        open(f'{D}/keep/{os.path.basename(n)}', 'wb').write(data); kept += 1
    subprocess.run(['fallocate', '-p', '-o', str(s0), '-l', str(s1 - s0 + 1), local])
    json.dump(tone, open(tp, 'w'))
print('scanned', len(names), 'kept', kept)
