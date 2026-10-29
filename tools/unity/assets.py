#!/usr/bin/env python3
"""Fetches the Unity game's external CC0 texture library from Poly Haven and prepares it for the engine.

    python3 tools/unity/assets.py             # fetch and process what is missing
    python3 tools/unity/assets.py --force     # redo everything
    python3 tools/unity/assets.py --only sand,rock

Writes unity/Assets/External/Textures/<key>/<key>_{d.jpg,n.png,mask.png,h.png} at 2 K plus deterministic .meta
files (GUID = md5 of the asset path, so materials and prefabs can reference them across machines and CI runs),
unity/Assets/External/library.json (the manifest the editor scripts read) and unity/Assets/External/CREDITS.md.
The folder is not committed (docs/PORT.md §4: assets are fetched by manifest); CI caches it by the hash of this file.

Maps: d = base colour (sRGB), n = normal (OpenGL +Y, what Unity expects), mask = R metallic, G occlusion, B height,
A smoothness (the Terrain layer mask layout; URP Lit reads metallic/smoothness from R/A and occlusion from G of the
same texture), h = height alone for parallax.
"""
import argparse, hashlib, io, json, os, sys, urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'unity', 'Assets', 'External')
TEX = os.path.join(OUT, 'Textures')
API = 'https://api.polyhaven.com/files/'
RES = '2k'
SIZE = 2048

# key: (polyhaven id, metres per tile, use, note). All CC0 (Poly Haven).
LIBRARY = {
    # terrain layers by region (docs/WORLD.md §2)
    'sand':        ('sandy_gravel_02',        4.0, 'terrain', 'the Sallow: desert sand and grit'),
    'scrub_soil':  ('dry_ground_01',          4.0, 'terrain', 'the Sallow: dry ground between scrub'),
    'salt':        ('dry_mud_field_001',      5.0, 'terrain', 'the Sallow: salt pan (tinted in the layer)'),
    'cracked':     ('cracked_red_ground',     4.0, 'terrain', 'the Glass Flats: cracked earth'),
    'glass':       ('aerial_rocks_02',        4.0, 'terrain', 'the Glass Flats: fused crust (dark rock base)'),
    'rubble':      ('concrete_debris',        3.0, 'terrain', 'ruins and the Dead Ring'),
    'asphalt':     ('asphalt_02',             4.0, 'terrain', 'roads'),
    'gravel':      ('gravel',                 3.0, 'terrain', 'rail beds and yards'),
    'mud':         ('brown_mud_02',           4.0, 'terrain', 'the Drowned Shore and the Wet'),
    'coast':       ('coast_sand_01',          4.0, 'terrain', 'the Drowned Shore: wet sand'),
    'grass':       ('aerial_grass_rock',      5.0, 'terrain', 'surviving green over rock'),
    'grass_dry':   ('grass_path_2',           4.0, 'terrain', 'dry grass'),
    'forest':      ('forest_floor',           4.0, 'terrain', 'the Teeth: pine litter'),
    'snow':        ('snow_03',                4.0, 'terrain', 'the Teeth: old granular snow on the heights'),
    'stony_ground': ('dry_ground_rocks',      4.0, 'terrain', 'the Teeth: stony mountain soil'),
    'burned':      ('burned_ground_01',       4.0, 'terrain', 'the Ashlands'),
    'rock':        ('cliff_side',             6.0, 'terrain', 'cliffs and steep slopes: layered sandstone'),
    'bark_pine':   ('pine_bark',              2.0, 'tree', 'conifer bark (the Teeth)'),
    'bark_brown':  ('bark_brown_02',          2.0, 'tree', 'broadleaf bark'),
    'bark_willow': ('bark_willow_02',         2.0, 'tree', 'wash trees'),
    # architecture (the kits, docs/DESIGN_UNITY.md §3)
    'concrete':    ('concrete_floor_worn_001', 2.0, 'surface', 'shelter floors'),
    'concrete_wall': ('concrete_wall_006',    2.0, 'surface', 'shelter and city walls'),
    'painted':     ('painted_concrete',       2.0, 'surface', 'painted concrete'),
    'metal_plate': ('metal_plate',            1.5, 'surface', 'diamond-plate steel (grates, treads, hatch rims)'),
    'steel':       ('metal_plate_02',         1.5, 'surface', 'plain steel plate (pipes, frames, doors)'),
    'steel_painted': ('painted_metal_shutter', 1.5, 'surface', 'painted steel (lockers, fixtures, terminals)'),
    'rust':        ('rusty_metal_02',         1.5, 'surface', 'rusted steel'),
    'scrap':       ('rusty_metal_sheet',      1.5, 'surface', 'scrap sheet'),
    'tin':         ('corrugated_iron_02',     1.0, 'surface', 'corrugated iron roofs'),
    'adobe':       ('clay_plaster',           2.0, 'surface', 'frontier adobe'),
    'brick':       ('brick_wall_02',          2.0, 'surface', 'brick'),
    'planks':      ('weathered_planks',       2.0, 'surface', 'weathered timber'),
    'wood_floor':  ('wood_floor_worn',        2.0, 'surface', 'worn wooden floors'),
    'tiles':       ('floor_tiles_06',         1.5, 'surface', 'tiled floors'),
    'grate':       ('rusty_metal_grid',       1.0, 'surface', 'grating'),
    'canvas':      ('denim_fabric_03',        1.0, 'surface', 'canvas and tarps'),
    'moss':        ('concrete_moss',          2.0, 'surface', 'overgrown concrete'),
}
MAPS = {'d': 'Diffuse', 'n': 'nor_gl', 'arm': 'arm', 'h': 'Displacement'}


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'second-face-unity-assets/1.0'})
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.read()


def file_url(files, kind):
    entry = files.get(kind, {}).get(RES, {})
    for ext in ('jpg', 'png'):
        if ext in entry:
            return entry[ext]['url']
    return None


def guid_for(rel):
    return hashlib.md5(('second-face:' + rel).encode()).hexdigest()


def meta(rel, kind):
    """A TextureImporter meta with a stable GUID; the Editor post-processor completes the platform settings."""
    normal = kind == 'n'
    linear = kind in ('n', 'mask', 'h')
    return (
        'fileFormatVersion: 2\n'
        f'guid: {guid_for(rel)}\n'
        'TextureImporter:\n'
        '  internalIDToNameTable: []\n'
        '  externalObjects: {}\n'
        '  serializedVersion: 13\n'
        '  mipmaps:\n'
        '    mipMapMode: 0\n'
        '    enableMipMap: 1\n'
        '    sRGBTexture: ' + ('0' if linear else '1') + '\n'
        '    linearTexture: 0\n'
        '    fadeOut: 0\n'
        '    borderMipMap: 0\n'
        '    mipMapsPreserveCoverage: 0\n'
        '    alphaTestReferenceValue: 0.5\n'
        '    mipMapFadeDistanceStart: 1\n'
        '    mipMapFadeDistanceEnd: 3\n'
        '  bumpmap:\n'
        '    convertToNormalMap: 0\n'
        '    externalNormalMap: 0\n'
        '    heightScale: 0.25\n'
        '    normalMapFilter: 0\n'
        '    flipGreenChannel: 0\n'
        '  isReadable: 0\n'
        '  streamingMipmaps: 1\n'
        '  streamingMipmapsPriority: 0\n'
        '  vTOnly: 0\n'
        '  ignoreMipmapLimit: 0\n'
        '  grayScaleToAlpha: 0\n'
        '  generateCubemap: 6\n'
        '  cubemapConvolution: 0\n'
        '  seamlessCubemap: 0\n'
        '  textureFormat: 1\n'
        '  maxTextureSize: 2048\n'
        '  textureSettings:\n'
        '    serializedVersion: 2\n'
        '    filterMode: 2\n'
        '    aniso: 4\n'
        '    mipBias: 0\n'
        '    wrapU: 0\n'
        '    wrapV: 0\n'
        '    wrapW: 0\n'
        '  nPOTScale: 1\n'
        '  lightmap: 0\n'
        '  compressionQuality: 50\n'
        '  spriteMode: 0\n'
        '  spriteExtrude: 1\n'
        '  spriteMeshType: 1\n'
        '  alignment: 0\n'
        '  spritePivot: {x: 0.5, y: 0.5}\n'
        '  spritePixelsToUnits: 100\n'
        '  spriteBorder: {x: 0, y: 0, z: 0, w: 0}\n'
        '  spriteGenerateFallbackPhysicsShape: 1\n'
        '  alphaUsage: ' + ('1' if kind == 'mask' else '0') + '\n'
        '  alphaIsTransparency: 0\n'
        '  spriteTessellationDetail: -1\n'
        '  textureType: ' + ('1' if normal else '0') + '\n'
        '  textureShape: 1\n'
        '  singleChannelComponent: 0\n'
        '  flipbookRows: 1\n'
        '  flipbookColumns: 1\n'
        '  maxTextureSizeSet: 0\n'
        '  compressionQualitySet: 0\n'
        '  textureFormatSet: 0\n'
        '  ignorePngGamma: 0\n'
        '  applyGammaDecoding: 0\n'
        '  swizzle: 50462976\n'
        '  cookieLightType: 0\n'
        '  platformSettings:\n'
        '  - serializedVersion: 4\n'
        '    buildTarget: DefaultTexturePlatform\n'
        '    maxTextureSize: 2048\n'
        '    resizeAlgorithm: 0\n'
        '    textureFormat: -1\n'
        '    textureCompression: 1\n'
        '    compressionQuality: 50\n'
        '    crunchedCompression: 0\n'
        '    allowsAlphaSplitting: 0\n'
        '    overridden: 0\n'
        '    ignorePlatformSupport: 0\n'
        '    androidETC2FallbackOverride: 0\n'
        '    forceMaximumCompressionQuality_BC6H_BC7: 0\n'
        '  - serializedVersion: 4\n'
        '    buildTarget: Android\n'
        '    maxTextureSize: 2048\n'
        '    resizeAlgorithm: 0\n'
        '    textureFormat: ' + ('51' if kind == 'mask' else '50') + '\n'   # ASTC 6x6 (51 with alpha is the same block size)
        '    textureCompression: 1\n'
        '    compressionQuality: 50\n'
        '    crunchedCompression: 0\n'
        '    allowsAlphaSplitting: 0\n'
        '    overridden: 1\n'
        '    ignorePlatformSupport: 0\n'
        '    androidETC2FallbackOverride: 0\n'
        '    forceMaximumCompressionQuality_BC6H_BC7: 0\n'
        '  spriteSheet:\n'
        '    serializedVersion: 2\n'
        '    sprites: []\n'
        '    outline: []\n'
        '    customData: \n'
        '    physicsShape: []\n'
        '    bones: []\n'
        '    spriteID: \n'
        '    internalID: 0\n'
        '    vertices: []\n'
        '    indices: \n'
        '    edges: []\n'
        '    weights: []\n'
        '    secondaryTextures: []\n'
        '    spriteCustomMetadata:\n'
        '      entries: []\n'
        '    nameFileIdTable: {}\n'
        '  mipmapLimitGroupName: \n'
        '  pSDRemoveMatte: 0\n'
        '  userData: \n'
        '  assetBundleName: \n'
        '  assetBundleVariant: \n'
    )


def folder_meta(rel):
    return f'fileFormatVersion: 2\nguid: {guid_for(rel)}\nfolderAsset: yes\nDefaultImporter:\n  externalObjects: {{}}\n  userData: \n  assetBundleName: \n  assetBundleVariant: \n'


def write_meta(path, text):
    with open(path + '.meta', 'w') as f:
        f.write(text)


# Colour grades for terrain albedos, applied after flattening (in linear light): saturation, value, tint. The palette
# is harmonised by eye in contact sheets (step 17): the Sallow is pale and straw-coloured, not orange; colour contrast
# between neighbouring layers stays small, so the layers read as one ground that varies, not as camouflage.
GRADE = {
    'sand': (0.35, 1.1, (1.06, 1.0, 0.8)),
    'cracked': (0.5, 1.05, (1.04, 0.96, 0.86)),
    'stony_ground': (0.45, 1.05, (1.04, 1.0, 0.86)),
    'rock': (0.7, 1.0, (1.0, 1.0, 1.0)),
    'grass_dry': (0.9, 1.0, (1.0, 1.0, 1.0)),
    'coast': (0.8, 1.0, (1.0, 1.0, 1.0)),
}


def grade(img, sat, val, tint):
    import numpy as np
    from PIL import Image
    a = np.asarray(img, dtype=np.float32) / 255.0
    lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
    luma = (lin * np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)).sum(-1, keepdims=True)
    out = np.clip((luma + (lin - luma) * sat) * val * np.array(tint, dtype=np.float32), 0, 1)
    srgb = np.where(out <= 0.0031308, out * 12.92, 1.055 * out ** (1 / 2.4) - 0.055)
    return Image.fromarray((srgb * 255 + 0.5).astype(np.uint8))


def flatten(img, cells=64, sigma=4.0, strength=0.9):
    """Takes the light and dark blotches larger than about a quarter of the tile out of a terrain albedo (in linear
    light, wrapping round the tile's edges), keeping the fine detail and the mean colour. A blotch half a tile wide
    repeats every tile and reads as a grid of spots across a field (step 17's sand); the world's own large-scale
    variation comes from the terrain shader's macro noise instead."""
    import numpy as np
    from PIL import Image
    a = np.asarray(img, dtype=np.float32) / 255.0
    lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
    n = lin.shape[0]
    low = lin.reshape(cells, n // cells, cells, n // cells, 3).mean(axis=(1, 3))
    f = np.fft.fftfreq(cells)
    g = np.exp(-2 * (np.pi * sigma) ** 2 * (f[:, None] ** 2 + f[None, :] ** 2))
    low = np.real(np.fft.ifft2(np.fft.fft2(low, axes=(0, 1)) * g[:, :, None], axes=(0, 1)))
    # back to full size, bilinear and wrapping
    u = (np.arange(n) + 0.5) * cells / n - 0.5
    i0 = np.floor(u).astype(int); t = (u - i0).astype(np.float32); i0 %= cells; i1 = (i0 + 1) % cells
    rows = low[i0] * (1 - t)[:, None, None] + low[i1] * t[:, None, None]
    full = rows[:, i0] * (1 - t)[None, :, None] + rows[:, i1] * t[None, :, None]
    mean = lin.reshape(-1, 3).mean(axis=0)
    out = np.clip(lin * (mean / np.maximum(full, 1e-4)) ** strength, 0, 1)
    srgb = np.where(out <= 0.0031308, out * 12.92, 1.055 * out ** (1 / 2.4) - 0.055)
    return Image.fromarray((srgb * 255 + 0.5).astype(np.uint8))


def process(key, phid, force):
    from PIL import Image
    d = os.path.join(TEX, key)
    os.makedirs(d, exist_ok=True)
    rel_dir = os.path.relpath(d, os.path.join(ROOT, 'unity'))
    write_meta(d, folder_meta(rel_dir))
    outs = {k: os.path.join(d, f'{key}_{k}.{"jpg" if k == "d" else "png"}') for k in ('d', 'n', 'mask', 'h')}
    if not force and all(os.path.exists(p) for p in outs.values()):
        for k, p in outs.items():
            write_meta(p, meta(os.path.relpath(p, os.path.join(ROOT, 'unity')), k))
        return 'kept'
    files = json.loads(fetch(API + phid))
    imgs = {}
    for k, kind in MAPS.items():
        url = file_url(files, kind)
        if not url:
            if k == 'h':
                continue
            raise SystemExit(f'{phid}: no {kind} at {RES}')
        imgs[k] = Image.open(io.BytesIO(fetch(url)))
    base = imgs['d'].convert('RGB').resize((SIZE, SIZE), Image.LANCZOS)
    if LIBRARY[key][2] == 'terrain':
        base = flatten(base)
        if key in GRADE:
            base = grade(base, *GRADE[key])
    base.save(outs['d'], 'JPEG', quality=90, subsampling=0)
    nor = imgs['n'].convert('RGB').resize((SIZE, SIZE), Image.LANCZOS)
    nor.save(outs['n'], 'PNG', optimize=True)
    arm = imgs['arm'].convert('RGB').resize((SIZE, SIZE), Image.LANCZOS)   # R ao, G roughness, B metallic
    ao, rough, metal = arm.split()
    smooth = rough.point(lambda v: 255 - v)
    if 'h' in imgs:
        height = imgs['h'].convert('L').resize((SIZE, SIZE), Image.LANCZOS)
    else:
        height = Image.new('L', (SIZE, SIZE), 128)
    Image.merge('RGBA', (metal, ao, height, smooth)).save(outs['mask'], 'PNG', optimize=True)
    height.save(outs['h'], 'PNG', optimize=True)
    for k, p in outs.items():
        write_meta(p, meta(os.path.relpath(p, os.path.join(ROOT, 'unity')), k))
    return 'fetched'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--only', default='')
    a = ap.parse_args()
    only = set(a.only.split(',')) if a.only else None
    os.makedirs(TEX, exist_ok=True)
    write_meta(OUT, folder_meta('Assets/External'))
    write_meta(TEX, folder_meta('Assets/External/Textures'))
    manifest = {}
    credits = ['# External textures (Unity game)\n', 'All textures below are CC0 from Poly Haven (https://polyhaven.com), fetched by `tools/unity/assets.py`.\n', '\n| key | Poly Haven id | use | metres per tile | note |\n|---|---|---|---|---|\n']
    for key, (phid, metres, use, note) in LIBRARY.items():
        if only and key not in only:
            # --only fetches a subset, but the manifest still lists everything already on disk (a partial fetch once
            # rewrote it to three entries and three test scenes silently lost their terrain)
            if not any(os.path.exists(os.path.join(TEX, key, f'{key}_d.{ext}')) for ext in ('png', 'jpg')):
                continue
        else:
            status = process(key, phid, a.force)
            print(f'{key:14s} {phid:26s} {status}')
        manifest[key] = {'id': phid, 'metres': metres, 'use': use, 'note': note, 'dir': f'Assets/External/Textures/{key}'}
        credits.append(f'| {key} | {phid} | {use} | {metres} | {note} |\n')
    with open(os.path.join(OUT, 'library.json'), 'w') as f:
        json.dump(manifest, f, indent=1)
    write_meta(os.path.join(OUT, 'library.json'), f'fileFormatVersion: 2\nguid: {guid_for("Assets/External/library.json")}\nTextScriptImporter:\n  externalObjects: {{}}\n  userData: \n  assetBundleName: \n  assetBundleVariant: \n')
    with open(os.path.join(OUT, 'CREDITS.md'), 'w') as f:
        f.writelines(credits)
    write_meta(os.path.join(OUT, 'CREDITS.md'), f'fileFormatVersion: 2\nguid: {guid_for("Assets/External/CREDITS.md")}\nTextScriptImporter:\n  externalObjects: {{}}\n  userData: \n  assetBundleName: \n  assetBundleVariant: \n')
    print(f'{len(manifest)} materials in {OUT}')


if __name__ == '__main__':
    main()
