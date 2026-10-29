#!/usr/bin/env python3
"""Fetches CC0 glTF models (Poly Haven) for the world: trees, scrub, rocks, debris — the photoscan sources that
tools/unity/models_bake.py bakes to phone budgets. They go outside the Unity project (2.2 GB that the editor would
otherwise import on every run): .scans/models at the repository root (gitignored), or $MODELS_DIR. Only the baked
results are committed.

    python3 tools/unity/models.py [--force] [--only a,b]
"""
import argparse, hashlib, io, json, os, sys, urllib.request, zipfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.environ.get('MODELS_DIR') or os.path.join(ROOT, '.scans', 'models')
API = 'https://api.polyhaven.com/files/'
RES = '2k'

# key: (polyhaven id, use, note)
LIBRARY = {
    # the Sallow and the Glass Flats: dry scrub, dead wood, boulders
    'quiver_tree_01': ('quiver_tree_01', 'tree', 'quiver tree (the Sallow)'),
    'quiver_tree_02': ('quiver_tree_02', 'tree', 'quiver tree (the Sallow)'),
    'dead_quiver_trunk': ('dead_quiver_trunk', 'tree', 'dead quiver trunk'),
    'dead_tree_trunk': ('dead_tree_trunk', 'tree', 'dead tree'),
    'dead_tree_trunk_02': ('dead_tree_trunk_02', 'tree', 'dead tree'),
    'tree_small_02': ('tree_small_02', 'tree', 'small tree (sheltered ground)'),
    'shrub_01': ('shrub_01', 'scrub', 'scrub'), 'shrub_02': ('shrub_02', 'scrub', 'scrub'), 'shrub_03': ('shrub_03', 'scrub', 'scrub'), 'shrub_04': ('shrub_04', 'scrub', 'scrub'),
    'wild_rooibos_bush': ('wild_rooibos_bush', 'scrub', 'dry bush'),
    'dry_branches_medium_01': ('dry_branches_medium_01', 'debris', 'dry branches'),
    'grass_medium_01': ('grass_medium_01', 'grass', 'grass clump (detail mesh)'),
    'grass_medium_02': ('grass_medium_02', 'grass', 'grass clump (detail mesh)'),
    'namaqualand_boulder_02': ('namaqualand_boulder_02', 'rock', 'boulder'),
    'namaqualand_boulder_03': ('namaqualand_boulder_03', 'rock', 'boulder'),
    'namaqualand_boulders_01': ('namaqualand_boulders_01', 'rock', 'boulder group'),
    'namaqualand_rocks_01': ('namaqualand_rocks_01', 'rock', 'rocks'),
    'namaqualand_stones_01': ('namaqualand_stones_01', 'rock', 'stones (scatter)'),
    'rock_07': ('rock_07', 'rock', 'rock'), 'rock_09': ('rock_09', 'rock', 'rock'),
    'boulder_01': ('boulder_01', 'rock', 'boulder'),
    # the Teeth and the Wet
    'pine_tree_01': ('pine_tree_01', 'tree', 'pine (the Teeth)'),
    'fir_tree_01': ('fir_tree_01', 'tree', 'fir (the Teeth)'),
    'pine_sapling_medium': ('pine_sapling_medium', 'tree', 'pine sapling'),
    'fir_sapling_medium': ('fir_sapling_medium', 'tree', 'fir sapling'),
    'tree_stump_01': ('tree_stump_01', 'debris', 'stump (logging)'),
    'fern_02': ('fern_02', 'scrub', 'fern (the Wet)'),
    'root_cluster_01': ('root_cluster_01', 'debris', 'roots'),
    # the Drowned Shore
    'coast_rocks_01': ('coast_rocks_01', 'rock', 'coast rocks'),
    'coast_land_rocks_02': ('coast_land_rocks_02', 'rock', 'coast rocks'),
}


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'second-face-unity-models/1.0'})
    with urllib.request.urlopen(req, timeout=300) as r:
        return r.read()


def guid_for(rel):
    return hashlib.md5(('second-face:' + rel).encode()).hexdigest()


def write_meta(path, text):
    with open(path + '.meta', 'w') as f:
        f.write(text)


def folder_meta(rel):
    return f'fileFormatVersion: 2\nguid: {guid_for(rel)}\nfolderAsset: yes\nDefaultImporter:\n  externalObjects: {{}}\n  userData: \n  assetBundleName: \n  assetBundleVariant: \n'


def default_meta(rel):
    return f'fileFormatVersion: 2\nguid: {guid_for(rel)}\nDefaultImporter:\n  externalObjects: {{}}\n  userData: \n  assetBundleName: \n  assetBundleVariant: \n'


def process(key, phid, force):
    d = os.path.join(OUT, key)
    rel_dir = f'Assets/External/Models/{key}'
    os.makedirs(d, exist_ok=True)
    write_meta(d, folder_meta(rel_dir))
    glb = os.path.join(d, key + '.glb')
    if force or not os.path.exists(glb):
        files = json.loads(fetch(API + phid))
        entry = files.get('gltf', {}).get(RES, {}).get('gltf')
        if not entry:
            return 'no gltf'
        # Poly Haven's gltf entry is a .gltf with separate textures/bin listed under "include"; the .glb isn't always
        # offered, so we take the .gltf and its includes and keep them beside each other.
        url = entry['url']
        data = fetch(url)
        if url.endswith('.glb'):
            open(glb, 'wb').write(data)
        else:
            gltf = os.path.join(d, key + '.gltf')
            open(gltf, 'wb').write(data)
            for rel, inc in entry.get('include', {}).items():
                p = os.path.join(d, rel)
                os.makedirs(os.path.dirname(p), exist_ok=True)
                if not os.path.exists(p):
                    open(p, 'wb').write(fetch(inc['url']))
        # maps the glTF leaves out: the cut-out mask (the glTF's JPEG base colour has no alpha, so grass and leaves
        # would bake opaque on black) and, for grass, the dried-out colour the arid regions use
        for name, out in (('Alpha', 'alpha'), ('dry_diff', 'dry_diff')):
            m = files.get(name, {}).get(RES, {})
            pick = m.get('png') or m.get('jpg')
            if not pick:
                continue
            ext = 'png' if 'png' in m else 'jpg'
            p = os.path.join(d, 'textures', f'{key}_{out}_{RES}.{ext}')
            os.makedirs(os.path.dirname(p), exist_ok=True)
            if not os.path.exists(p):
                open(p, 'wb').write(fetch(pick['url']))
    # stable metas for everything in the folder (glTFast importer settings come from its defaults)
    for root, dirs, fns in os.walk(d):
        for sub in dirs:
            p = os.path.join(root, sub); write_meta(p, folder_meta(os.path.relpath(p, os.path.join(ROOT, 'unity'))))
        for fn in fns:
            if fn.endswith('.meta'):
                continue
            p = os.path.join(root, fn)
            rel = os.path.relpath(p, os.path.join(ROOT, 'unity'))
            if fn.endswith(('.png', '.jpg')):
                sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
                import assets as A
                kind = 'n' if ('nor' in fn.lower() or 'normal' in fn.lower()) else ('mask' if any(k in fn.lower() for k in ('arm', 'rough', 'metal')) else 'd')
                write_meta(p, A.meta(rel, kind))
            else:
                write_meta(p, default_meta(rel))
    return 'ok'


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--force', action='store_true'); ap.add_argument('--only', default='')
    a = ap.parse_args()
    only = set(a.only.split(',')) if a.only else None
    os.makedirs(OUT, exist_ok=True)
    write_meta(os.path.join(ROOT, 'unity', 'Assets', 'External'), folder_meta('Assets/External'))
    write_meta(OUT, folder_meta('Assets/External/Models'))
    manifest = {}
    for key, (phid, use, note) in LIBRARY.items():
        if only and key not in only:
            continue
        try:
            status = process(key, phid, a.force)
        except Exception as e:  # keep going; a missing model is reported, not fatal
            status = f'failed: {e}'
        print(f'{key:26s} {status}')
        if status == 'ok':
            manifest[key] = {'id': phid, 'use': use, 'note': note, 'dir': f'Assets/External/Models/{key}'}
    with open(os.path.join(OUT, 'models.json'), 'w') as f:
        json.dump(manifest, f, indent=1)
    write_meta(os.path.join(OUT, 'models.json'), f'fileFormatVersion: 2\nguid: {guid_for("Assets/External/Models/models.json")}\nTextScriptImporter:\n  externalObjects: {{}}\n  userData: \n  assetBundleName: \n  assetBundleVariant: \n')
    print(f'{len(manifest)} models in {OUT}')


if __name__ == '__main__':
    main()
