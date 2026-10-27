#!/usr/bin/env python3
"""Fetches CC0 models (plants, trees, rocks) from Poly Haven and bakes them for the phone: decimated, textures at
512 px WebP, meshopt-compressed .glb.

    python3 tools/assets/models.py            # fetch and bake what is missing
    python3 tools/assets/models.py --force    # redo everything
    python3 tools/assets/models.py shrub_01   # one asset

Output: public/assets/world/models/<key>.glb, public/assets/world/models.json (the manifest the engine reads: key →
file, kind, footprint, height, biomes, whether it blocks walking), public/assets/world/MODEL_CREDITS.md.
Needs node (`npx @gltf-transform/cli`).
"""
import io, json, os, shutil, subprocess, sys, tempfile, urllib.request

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
OUT = os.path.join(ROOT, 'public', 'assets', 'world')
MODELS = os.path.join(OUT, 'models')
API = 'https://api.polyhaven.com/files/'

# key: (polyhaven id, kind, target triangles, scale, blocks walking?, biomes, note)
LIBRARY = {
    # dry country: the Sallow, the Glass Flats, the Ashlands
    'quiver_tree':     ('quiver_tree_01',          'tree',  1500, 1.3, True,  ['sallow', 'glass_flats'],              'quiver tree'),
    'quiver_tree_2':   ('quiver_tree_02',          'tree',  1500, 1.4, True,  ['sallow'],                              'quiver tree, younger'),
    'dead_quiver':     ('dead_quiver_trunk',       'tree',  1500, 1.3, True,  ['sallow', 'glass_flats', 'ashlands'],   'dead quiver trunk'),
    'dry_branches':    ('dry_branches_medium_01',  'shrub', 400, 1.1, False, ['sallow', 'glass_flats', 'ashlands'],   'dead scrub'),
    'shrub_dry_a':     ('shrub_02',                'shrub', 400, 0.9, False, ['sallow', 'rail_corridor'],             'dry shrub'),
    'shrub_dry_b':     ('shrub_03',                'shrub', 400, 1.2, False, ['sallow', 'glass_flats'],               'dry shrub'),
    'shrub_dry_c':     ('shrub_04',                'shrub', 400, 1.4, False, ['sallow', 'rail_corridor', 'ashlands'], 'dry shrub'),
    'stones':          ('namaqualand_stones_01',   'rock',   500, 3.0, False, ['sallow', 'glass_flats', 'teeth'],      'scattered stones'),
    'boulder_desert':  ('namaqualand_boulder_02',  'rock',  300, 1.5, True,  ['sallow', 'glass_flats', 'ashlands'],   'desert boulder'),
    'boulder':         ('namaqualand_boulder_03',  'rock',  400, 1.3, True,  ['teeth', 'rail_corridor', 'northern_wet'], 'boulder'),
    'rock_small':      ('rock_09',                 'rock',   300, 6.0, False, ['sallow', 'teeth', 'rail_corridor'],    'small rock'),
    'rock_ash':        ('moon_rock_01',            'rock',   300, 4.0, True,  ['ashlands'],                            'ash-black rock'),
    # grass country and the wet: the Rail Corridor, the Northern Wet, the Drowned Shore
    'grass':           ('grass_medium_02',         'grass',  150, 0.6, False, ['rail_corridor', 'northern_wet', 'drowned_shore', 'meridian'], 'grass clump'),
    'shrub_green':     ('shrub_01',                'shrub', 400, 1.3, False, ['rail_corridor', 'northern_wet', 'drowned_shore'], 'green shrub'),
    'fern':            ('fern_02',                 'grass',  150, 1.0, False, ['northern_wet'],                        'fern'),
    'nettle':          ('nettle_plant',            'grass',  150, 1.4, False, ['northern_wet', 'drowned_shore', 'meridian'], 'nettles'),
    'weed':            ('weed_plant_02',           'grass',  150, 1.2, False, ['rail_corridor', 'meridian', 'drowned_shore'], 'weeds'),
    'stump':           ('tree_stump_01',           'rock',  300, 1.0, True,  ['northern_wet', 'rail_corridor'],       'tree stump'),
    'dead_tree':       ('dead_tree_trunk_02',      'tree',  1500, 1.4, True,  ['rail_corridor', 'drowned_shore', 'ashlands', 'sallow'], 'dead tree'),
    'bush_tree':       ('othonna_cerarioides',     'tree',  1500, 1.7, True,  ['rail_corridor', 'glass_flats'],        'bushy tree'),
    'broadleaf':       ('searsia_lucida',          'tree',  2500, 1.9, True,  ['northern_wet', 'drowned_shore'],       'broadleaf tree'),
    'big_tree':        ('island_tree_02',          'tree',  2500, 2.2, True,  ['northern_wet'],                        'big broadleaf'),
    'rock_moss':       ('rock_moss_set_01',        'rock',  300, 1.0, True,  ['northern_wet', 'teeth'],               'mossy rocks'),
    'celandine':       ('celandine_01',            'grass',  150, 0.9, False, ['northern_wet'],                        'ground cover'),
    # the Teeth
    'fir':             ('fir_sapling',             'tree',  2500, 3.0, True,  ['teeth', 'northern_wet'],               'fir'),
    # props: things in places (the built box props they replace are named in src/engine/assets/propModels.ts)
    'p_barrel':        ('Barrel_01',               'prop',   500, 1.0, True,  [], 'steel drum'),
    'p_barrel_2':      ('Barrel_02',               'prop',   500, 1.0, True,  [], 'steel drum, dented'),
    'p_barrel_rust':   ('barrel_03',               'prop',   500, 1.0, True,  [], 'rusted drum'),
    'p_crate':         ('wooden_crate_02',         'prop',   400, 1.0, True,  [], 'wooden crate'),
    'p_box':           ('cardboard_box_01',        'prop',   300, 1.0, True,  [], 'cardboard box'),
    'p_chair':         ('plastic_monobloc_chair_01', 'prop', 500, 1.0, True,  [], 'plastic chair'),
    'p_chair_wood':    ('painted_wooden_chair_01', 'prop',   500, 1.0, True,  [], 'wooden chair'),
    'p_table':         ('WoodenTable_01',          'prop',   500, 1.0, True,  [], 'wooden table'),
    'p_picnic':        ('wooden_picnic_table',     'prop',   600, 1.0, True,  [], 'picnic table'),
    'p_shelf':         ('steel_frame_shelves_01',  'prop',   800, 1.0, True,  [], 'steel shelves'),
    'p_lamp':          ('street_lamp_01',          'prop',   600, 1.0, True,  [], 'street lamp'),
    'p_lamp_2':        ('street_lamp_02',          'prop',   600, 1.0, True,  [], 'street lamp, older'),
    'p_car':           ('covered_car',             'prop',  1200, 1.0, True,  [], 'car under a tarp'),
    'p_tyre':          ('old_tyre',                'prop',   300, 1.0, False, [], 'old tyre'),
    'p_firepit':       ('stone_fire_pit',          'prop',   400, 1.0, True,  [], 'stone fire pit'),
    'p_stove':         ('barrel_stove',            'prop',   500, 1.0, True,  [], 'barrel stove'),
    'p_machine':       ('power_box_01',            'prop',   800, 1.0, True,  [], 'power box'),
    'p_bin':           ('metal_trash_can',         'prop',   400, 1.0, True,  [], 'metal bin'),
    'p_toolchest':     ('metal_tool_chest',        'prop',   400, 1.0, True,  [], 'tool chest'),
    'p_bucket':        ('wooden_bucket_01',        'prop',   300, 1.0, False, [], 'wooden bucket'),
    'p_barrier':       ('concrete_road_barrier_02', 'prop',  300, 1.0, True,  [], 'concrete barrier'),
    'p_stool':         ('wooden_stool_02',         'prop',   300, 1.0, True,  [], 'wooden stool'),
}


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={'User-Agent': 'second-face-asset-fetch/1.0'})
    with urllib.request.urlopen(req, timeout=300) as r:
        return r.read()


def gt(*args: str) -> None:
    subprocess.run(['npx', '--yes', '@gltf-transform/cli', *args], check=True, cwd=ROOT, stdout=subprocess.DEVNULL)


def count_tris(path: str) -> int:
    import re
    insp = subprocess.run(['npx', '--yes', '@gltf-transform/cli', 'inspect', path], cwd=ROOT, capture_output=True, text=True).stdout
    total = 0
    for line in re.sub(r'\x1b\[[0-9;]*m', '', insp).splitlines():
        if 'TRIANGLES' not in line: continue
        cells = [c.strip() for c in line.split('│') if c.strip()]
        try:
            i = cells.index('TRIANGLES'); total += int(cells[i + 2].replace(',', ''))
        except (ValueError, IndexError):
            pass
    return total


def apply_alpha(tmp: str, gltf_path: str, info: dict) -> int:
    """Poly Haven's glTF ships JPG textures, so leaf cut-outs lose their alpha; the alpha maps are separate files.
    Composite each `<name>_alpha` map into its `<name>_diff` base colour as RGBA PNG and mark the material MASK."""
    from PIL import Image
    urls = {}
    for k, v in info.items():
        if isinstance(v, dict) and '1k' in v and isinstance(v['1k'], dict):
            for fmt in ('png', 'jpg'):
                f = v['1k'].get(fmt)
                if f and 'url' in f: urls.setdefault(os.path.basename(f['url']), f['url'])
    g = json.load(open(gltf_path))
    fixed = 0
    for i, img in enumerate(g.get('images', [])):
        uri = img.get('uri')
        if not uri or '_diff_' not in uri: continue
        base = os.path.basename(uri)
        alpha_name = base.replace('_diff_', '_alpha_')
        url = urls.get(alpha_name) or urls.get(alpha_name.replace('.jpg', '.png'))
        if not url: continue
        diff = Image.open(os.path.join(tmp, uri)).convert('RGB')
        alpha = Image.open(io.BytesIO(fetch(url))).convert('L').resize(diff.size)
        rgba = diff.copy(); rgba.putalpha(alpha)
        out_rel = uri.rsplit('.', 1)[0] + '.png'
        rgba.save(os.path.join(tmp, out_rel))
        img['uri'] = out_rel; img['mimeType'] = 'image/png'
        for m in g.get('materials', []):
            t = (m.get('pbrMetallicRoughness') or {}).get('baseColorTexture')
            if t is None: continue
            src = g['textures'][t['index']].get('source')
            if src == i:
                m['alphaMode'] = 'MASK'; m['alphaCutoff'] = 0.5; m['doubleSided'] = True
        fixed += 1
    json.dump(g, open(gltf_path, 'w'))
    return fixed


def bake(key: str, force: bool) -> dict | None:
    pid, kind, tris, scale, blocks, biomes, note = LIBRARY[key]
    out = os.path.join(MODELS, f'{key}.glb')
    if os.path.exists(out) and not force:
        print(f'  {key}: have')
        return None
    print(f'  {key}: fetching {pid}')
    info = json.loads(fetch(API + pid))
    g = info['gltf']['1k']['gltf']
    tmp = tempfile.mkdtemp(prefix='sfmodel_')
    try:
        src = os.path.join(tmp, os.path.basename(g['url']))
        open(src, 'wb').write(fetch(g['url']))
        for rel, f in g.get('include', {}).items():
            p = os.path.join(tmp, rel)
            os.makedirs(os.path.dirname(p), exist_ok=True)
            open(p, 'wb').write(fetch(f['url']))
        # count triangles to pick the ratio
        cut = apply_alpha(tmp, src, info)
        if cut: print(f'    alpha maps folded in: {cut}')
        total = count_tris(src)
        a = os.path.join(tmp, 'a.glb'); b = os.path.join(tmp, 'b.glb'); c = os.path.join(tmp, 'c.glb')
        ratio = min(1.0, max(0.003, tris / total)) if total else 0.2
        print(f'    triangles {total} → ratio {ratio:.3f}')
        # The error bound: loose for rocks (the simplifier stops early otherwise), gentle for plants whose leaf cards
        # and thin trunks fall apart when vertices are let wander.
        err = os.environ.get('SF_SIMPLIFY_ERROR') or ('0.1' if kind == 'rock' else '0.03' if kind == 'prop' else '0.012')
        gt('simplify', src, a, '--ratio', f'{ratio:.4f}', '--error', err)
        gt('resize', a, b, '--width', '512', '--height', '512')
        gt('webp', b, c, '--quality', '80')
        gt('meshopt', c, out, '--level', 'medium')
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    size = os.path.getsize(out) // 1024
    print(f'    → {size} KB, {count_tris(out)} triangles')
    return {'file': f'models/{key}.glb', 'id': pid, 'kind': kind, 'scale': scale, 'blocks': blocks, 'biomes': biomes, 'note': note}


def main() -> None:
    force = '--force' in sys.argv
    only = [a for a in sys.argv[1:] if not a.startswith('--')]
    os.makedirs(MODELS, exist_ok=True)
    manifest_path = os.path.join(OUT, 'models.json')
    manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {'models': {}}
    for key in (only or LIBRARY):
        entry = bake(key, force)
        if entry: manifest['models'][key] = entry
        elif key not in manifest['models']:
            pid, kind, tris, scale, blocks, biomes, note = LIBRARY[key]
            manifest['models'][key] = {'file': f'models/{key}.glb', 'id': pid, 'kind': kind, 'scale': scale, 'blocks': blocks, 'biomes': biomes, 'note': note}
        json.dump(manifest, open(manifest_path, 'w'), indent=1)
    credits = ['# World model credits', '', 'All models below are CC0 from Poly Haven (https://polyhaven.com), fetched by `tools/assets/models.py`;',
               'decimated, textures at 512 px WebP, meshopt-compressed. No attribution is required; it is given anyway.', '', '| key | Poly Haven id | use |', '|---|---|---|']
    for key, (pid, kind, tris, scale, blocks, biomes, note) in LIBRARY.items():
        credits.append(f'| {key} | [{pid}](https://polyhaven.com/a/{pid}) | {note} |')
    open(os.path.join(OUT, 'MODEL_CREDITS.md'), 'w').write('\n'.join(credits) + '\n')
    print('done')


if __name__ == '__main__':
    main()
