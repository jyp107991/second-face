#!/usr/bin/env python3
"""Fetches the CC0 PBR material library from Poly Haven and writes it as WebP at 1024 and 512 px.

    python3 tools/assets/materials.py            # fetch what is missing
    python3 tools/assets/materials.py --force    # refetch everything

Output: public/assets/world/mat/<key>_{d,n,a}[_512].webp, public/assets/world/materials.json (the manifest the
engine reads: key → files, metres per tile, hardness, tint), public/assets/world/CREDITS.md (licences).
Every entry maps one of the engine's surface/terrain keys to a Poly Haven texture id (all CC0).
"""
import io, json, os, sys, urllib.request
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
OUT = os.path.join(ROOT, 'public', 'assets', 'world')
MAT = os.path.join(OUT, 'mat')
API = 'https://api.polyhaven.com/files/'

# key: (polyhaven id, metres per texture tile, hard-edged floor?, tint hex or None, note)
LIBRARY = {
    # the engine's surfaces (floors and walls)
    'sand':       ('aerial_sand',              3.0, False, None,     'desert sand'),
    'dirt':       ('dirt_aerial_02',           3.0, False, None,     'dry earth'),
    'rubble':     ('concrete_debris',          2.5, False, None,     'broken concrete and rubble'),
    'asphalt':    ('asphalt_02',               3.0, False, None,     'old road surface'),
    'concrete':   ('concrete_floor_worn_001',  2.0, True,  None,     'worn concrete floor'),
    'concrete_wall': ('concrete_wall_006',     2.0, True,  None,     'concrete wall'),
    'tile':       ('floor_tiles_06',           1.5, True,  None,     'floor tiles'),
    'metal':      ('metal_plate',              1.5, True,  None,     'steel plate'),
    'wood':       ('wood_floor_worn',          2.0, True,  None,     'worn wooden floor'),
    'planks':     ('weathered_planks',         2.0, True,  None,     'weathered planks (walls, fences)'),
    'grate':      ('rusty_metal_grid',         1.0, True,  None,     'metal grating'),
    'brick':      ('brick_wall_02',            2.0, True,  None,     'brick wall'),
    'rust':       ('rusty_metal_02',           1.5, True,  None,     'rusted steel'),
    'scrap':      ('rusty_metal_sheet',        1.5, True,  None,     'scrap sheet'),
    'adobe':      ('clay_plaster',             2.0, True,  None,     'clay plaster'),
    'tin':        ('corrugated_iron_02',       1.0, True,  None,     'corrugated iron'),
    'paint':      ('painted_concrete',         2.0, True,  None,     'painted concrete'),
    'fabric':     ('denim_fabric_03',          1.0, True,  None,     'canvas and tarps'),
    'rock':       ('aerial_rocks_02',          3.0, False, None,     'rock and cliff'),
    # terrain biomes (the open world)
    'grass':      ('aerial_grass_rock',        4.0, False, None,     'grass over rock'),
    'grass_dry':  ('grass_path_2',             3.0, False, None,     'dry grass and path'),
    'mud':        ('brown_mud_02',             3.0, False, None,     'wet mud'),
    'forest':     ('forest_floor',             3.0, False, None,     'forest floor'),
    'gravel':     ('gravel',                   2.0, False, None,     'gravel'),
    'snow':       ('snow_02',                  3.0, False, None,     'snow'),
    'burned':     ('burned_ground_01',         3.0, False, None,     'burned ground'),
    'salt':       ('dry_mud_field_001',        4.0, False, 'e8e4da', 'salt pan (tinted)'),
    'moss':       ('concrete_moss',            2.0, False, None,     'overgrown concrete'),
    'coast':      ('coast_sand_01',            3.0, False, None,     'wet coastal sand'),
    'cracked':    ('cracked_red_ground',       3.0, False, None,     'cracked earth'),
}
MAPS = {'d': 'Diffuse', 'n': 'nor_gl', 'a': 'arm'}


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={'User-Agent': 'second-face-asset-fetch/1.0'})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def main() -> None:
    force = '--force' in sys.argv
    os.makedirs(MAT, exist_ok=True)
    manifest_path = os.path.join(OUT, 'materials.json')
    manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) and not force else {'materials': {}}
    for key, (pid, scale, hard, tint, note) in LIBRARY.items():
        done = all(os.path.exists(os.path.join(MAT, f'{key}_{m}{suf}.webp')) for m in MAPS for suf in ('', '_512'))
        if done and key in manifest['materials'] and not force:
            continue
        print(f'{key:14s} ← {pid}', flush=True)
        files = json.loads(fetch(API + pid).decode())
        entry = {'id': pid, 'scale': scale, 'hard': hard, 'note': note, 'maps': {}}
        if tint: entry['tint'] = tint
        for m, k in MAPS.items():
            node = files.get(k)
            if not node:
                print(f'   (no {k} for {pid})'); continue
            url = node['1k']['jpg']['url']
            img = Image.open(io.BytesIO(fetch(url))).convert('RGB')
            for size, suf in ((1024, ''), (512, '_512')):
                im = img if img.size[0] == size else img.resize((size, size), Image.LANCZOS)
                im.save(os.path.join(MAT, f'{key}_{m}{suf}.webp'), 'WEBP', quality=82 if m == 'd' else 80, method=4)
            entry['maps'][m] = True
        manifest['materials'][key] = entry
        json.dump(manifest, open(manifest_path, 'w'), indent=1)
    credits = ['# World asset credits', '', 'All textures below are CC0 from Poly Haven (https://polyhaven.com), fetched by',
               '`tools/assets/materials.py`; converted to WebP at 1024/512 px. No attribution is required; it is given anyway.', '',
               '| key | Poly Haven id | use |', '|---|---|---|']
    for key, (pid, scale, hard, tint, note) in LIBRARY.items():
        credits.append(f'| {key} | [{pid}](https://polyhaven.com/a/{pid}) | {note} |')
    open(os.path.join(OUT, 'CREDITS.md'), 'w').write('\n'.join(credits) + '\n')
    total = sum(os.path.getsize(os.path.join(MAT, f)) for f in os.listdir(MAT))
    print(f'{len(manifest["materials"])} materials, {total / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
