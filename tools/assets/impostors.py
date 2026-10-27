#!/usr/bin/env python3
"""Bakes tree impostors: each tree rendered from 8 directions at the game camera's pitch into one atlas, from the
full-detail Poly Haven model (fetched to a temp folder the dev server can see), by Playwright + three.js.

    python3 tools/assets/impostors.py            # bake what is missing (the dev server must be up on :5173)
    python3 tools/assets/impostors.py --force
    python3 tools/assets/impostors.py big_tree   # one

Output: public/assets/world/impostors/<key>.webp and the manifest public/assets/world/impostors.json (key → file,
cells, span (half-size of the quad in metres), baseFrac (where the base sits in a cell), height, radius, blocks,
biomes).
"""
import base64, io, json, os, shutil, subprocess, sys, urllib.request
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
OUT = os.path.join(ROOT, 'public', 'assets', 'world')
IMP = os.path.join(OUT, 'impostors')
TMP = os.path.join(ROOT, 'public', 'tmp_impostor')
API = 'https://api.polyhaven.com/files/'

# key: (polyhaven id, scale, blocks walking?, biomes, note)
LIBRARY = {
    'big_tree':   ('island_tree_02',     2.2, True, ['northern_wet'], 'big broadleaf'),
    'broadleaf':  ('searsia_lucida',     1.9, True, ['northern_wet', 'drowned_shore'], 'broadleaf tree'),
    'bush_tree':  ('othonna_cerarioides', 1.7, True, ['rail_corridor', 'glass_flats'], 'bushy tree'),
    'quiver_tree': ('quiver_tree_01',    1.3, True, ['sallow', 'glass_flats'], 'quiver tree'),
    'quiver_tree_2': ('quiver_tree_02',  1.4, True, ['sallow'], 'quiver tree, younger'),
    'fir':        ('fir_sapling',        9.0, True, ['teeth', 'northern_wet'], 'fir'),
    'tree_small': ('tree_small_02',      1.6, True, ['rail_corridor', 'northern_wet', 'drowned_shore'], 'small tree'),
    'thorn_tree': ('searsia_burchellii', 1.15, True, ['sallow', 'glass_flats', 'rail_corridor'], 'thorn tree'),
}


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={'User-Agent': 'second-face-asset-fetch/1.0'})
    with urllib.request.urlopen(req, timeout=600) as r:
        return r.read()


def download(pid: str) -> str:
    d = os.path.join(TMP, pid)
    gltf = os.path.join(d, f'{pid}_1k.gltf')
    if os.path.exists(gltf): return gltf
    info = json.loads(fetch(API + pid))
    g = info['gltf']['1k']['gltf']
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, os.path.basename(g['url'])), 'wb').write(fetch(g['url']))
    for rel, f in g.get('include', {}).items():
        p = os.path.join(d, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, 'wb').write(fetch(f['url']))
    # fold the alpha maps into the leaf textures (as models.py does) so the leaves are cut out
    sys.path.insert(0, os.path.dirname(__file__))
    from models import apply_alpha
    apply_alpha(d, gltf, info)
    return gltf


BAKE_JS = r"""
const { chromium } = require('playwright');
(async () => {
  const [url, key, cell] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 600, height: 600 } });
  page.on('pageerror', (e) => console.error('PAGEERROR', e.message));
  await page.goto('http://127.0.0.1:5173/tools/assets/bake/impostor.html');
  await page.waitForFunction(() => window.ready, null, { timeout: 60000 });
  const r = await page.evaluate(async ([url, cell]) => { const r = await window.bake(url, { cell: Number(cell) }); return r; }, [url, cell]);
  process.stdout.write(JSON.stringify(r));
  await browser.close();
})();
"""


def bake(key: str, force: bool, cell: int) -> dict | None:
    pid, scale, blocks, biomes, note = LIBRARY[key]
    out = os.path.join(IMP, f'{key}.webp')
    if os.path.exists(out) and not force:
        print(f'  {key}: have'); return None
    print(f'  {key}: fetching {pid}')
    gltf = download(pid)
    url = '/tmp_impostor/' + os.path.relpath(gltf, TMP).replace(os.sep, '/')
    js = os.path.join(TMP, 'bake.cjs'); open(js, 'w').write(BAKE_JS)
    print(f'  {key}: rendering')
    res = subprocess.run(['node', js, url, key, str(cell)], cwd=ROOT, capture_output=True, text=True, timeout=1800)
    if res.returncode != 0 or not res.stdout.strip().startswith('{'):
        print('    FAILED', res.stderr[-800:]); return None
    r = json.loads(res.stdout)
    png = base64.b64decode(r['png'].split(',', 1)[1])
    im = Image.open(io.BytesIO(png)).convert('RGBA')
    os.makedirs(IMP, exist_ok=True)
    im.save(out, 'WEBP', quality=86, method=6)
    print(f'    → {os.path.getsize(out) // 1024} KB ({im.width}×{im.height}), {r["spanW"] * 2 * scale:.1f} × {r["spanH"] * 2 * scale:.1f} m, height {r["height"] * scale:.1f} m')
    return {'file': f'impostors/{key}.webp', 'id': pid, 'cells': r['cells'], 'spanW': r['spanW'] * scale, 'spanH': r['spanH'] * scale, 'baseFrac': r['baseFrac'], 'height': r['height'] * scale, 'radius': r['radius'] * scale, 'blocks': blocks, 'biomes': biomes, 'note': note}


def main() -> None:
    force = '--force' in sys.argv
    only = [a for a in sys.argv[1:] if not a.startswith('--')]
    cell = 384
    manifest_path = os.path.join(OUT, 'impostors.json')
    manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {'impostors': {}}
    for key in (only or LIBRARY):
        entry = bake(key, force, cell)
        if entry: manifest['impostors'][key] = entry
        json.dump(manifest, open(manifest_path, 'w'), indent=1)
    credits = ['# Tree impostor credits', '', 'Baked by `tools/assets/impostors.py` from CC0 Poly Haven models (https://polyhaven.com): eight views each.', '', '| key | Poly Haven id | use |', '|---|---|---|']
    for key, (pid, scale, blocks, biomes, note) in LIBRARY.items():
        credits.append(f'| {key} | [{pid}](https://polyhaven.com/a/{pid}) | {note} |')
    open(os.path.join(OUT, 'IMPOSTOR_CREDITS.md'), 'w').write('\n'.join(credits) + '\n')
    print('done')


if __name__ == '__main__':
    main()
