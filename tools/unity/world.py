#!/usr/bin/env python3
"""The world's control data (BUILD_PLAN §6.A.1–A.2): the 700 × 500 km map of the fiction becomes the 24 × 16 km world,
32 m to the km, origin at the south-west corner, x east, z north. Reads the content export
(unity/Assets/StreamingAssets/content: regions, world_map, sites, maps) and writes to
unity/Assets/StreamingAssets/world/:

- control.bin   the runtime control map: 'SFCM', version, width, height, metres per texel (int32 LE), then
                width × height × RGBA uint16 LE, rows south to north. R base height (0..65535 → 0..600 m above the
                world floor, which lies 50 m below sea level), G roughness (0..1), B biome index × 4096, A water (0..1).
- control.png   the same data as a 16-bit RGBA PNG (rows north to south, as images run), to look at and to edit.
- roads.json    roads and tracks between places, the rail line, the rivers: polylines in world metres with widths.
- places.json   every location of the world map: footprint, elevation, entry yaw, region, the map it is built from.

    python3 tools/unity/world.py [--preview <png>]
"""
import json, math, os, struct, sys, zlib

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CONTENT = os.path.join(ROOT, 'unity', 'Assets', 'StreamingAssets', 'content')
OUT = os.path.join(ROOT, 'unity', 'Assets', 'StreamingAssets', 'world')

M_PER_KM = 32.0
WORLD_W, WORLD_D = 24000.0, 16000.0
X0 = (WORLD_W - 700 * M_PER_KM) / 2          # the 22.4 km of map centred in the 24 km of world
TEXEL = 64                                    # metres per control texel
CW, CH = int(WORLD_W // TEXEL) + 1, int(WORLD_D // TEXEL) + 1   # 376 × 251: texel centres on the grid points, edges included
FLOOR = -50.0                                 # the world floor, below the sea bed
SPAN = 600.0                                  # R = 0..1 → FLOOR..FLOOR+SPAN
SEA = 0.0

BIOMES = ['sallow', 'glass_flats', 'rail_corridor', 'drowned_shore', 'meridian', 'teeth', 'ashlands', 'northern_wet']
# Per region: the base height of its land (m above the sea) and its roughness (0..1, scales the runtime relief).
LAND = {
    'sallow': (38, 0.12), 'glass_flats': (24, 0.03), 'rail_corridor': (52, 0.08), 'drowned_shore': (4, 0.04),
    'meridian': (8, 0.02), 'teeth': (190, 0.85), 'ashlands': (44, 0.25), 'northern_wet': (62, 0.3),
}
BLEND = 1600.0           # metres over which neighbouring regions' land blends at a border
TEETH_RISE = (260.0, 5000.0)   # the Teeth climb this much more over this distance in from their edge
ROAD_WIDTH = {'road': 8.0, 'track': 5.0, 'rough': 3.0, 'glass': 5.0, 'marsh': 4.0, 'mountain': 5.0}
FOOTPRINT = {'major': 160.0, 'minor': 96.0, 'landmark': 48.0}   # metres, for locations without a built map yet
OFFSHORE = {'rigs'}      # places that stand in the sea on their own legs: no ground is stamped for them
TILE_M = 2.0             # a web map tile becomes this many metres of place (provisional until PlaceBuilder, P3.5)


def load(name):
    with open(os.path.join(CONTENT, name + '.json')) as f:
        return json.load(f)


def km_to_world(xk, yk):
    """Map km (x east, y south) → world metres (x east, z north)."""
    return X0 + xk * M_PER_KM, (500.0 - yk) * M_PER_KM


def smooth(t):
    t = min(1.0, max(0.0, t))
    return t * t * (3 - 2 * t)


def region_rects(regions):
    out = {}
    for rid, r in regions.items():
        x0, y0, x1, y1 = r['bounds']
        ax, az = km_to_world(x0, y1)
        bx, bz = km_to_world(x1, y0)
        out[rid] = (ax, az, bx, bz)
    return out


def region_at(rects, x, z):
    """The most specific region containing a point (the smallest; Meridian lies inside the Shore), else the nearest."""
    inside = [(abs((r[2] - r[0]) * (r[3] - r[1])), rid) for rid, r in rects.items() if r[0] <= x < r[2] and r[1] <= z < r[3]]
    if inside:
        return min(inside)[1]
    return min(rects, key=lambda rid: dist_out(rects[rid], x, z))


def dist_out(r, x, z):
    dx = max(r[0] - x, 0.0, x - r[2]); dz = max(r[1] - z, 0.0, z - r[3])
    return math.hypot(dx, dz)


def dist_in(r, x, z):
    return min(x - r[0], r[2] - x, z - r[1], r[3] - z)


def warp(x, z):
    """Region borders wander by up to ~1 km instead of running straight along the map's rectangles."""
    return (x + 700 * math.sin(z / 1900 + 1.1) + 320 * math.sin(z / 650 + 0.4),
            z + 700 * math.sin(x / 2300 + 0.3) + 320 * math.sin(x / 780 + 2.0))


def coast_x(z):
    """The sea's edge along the west, in world metres: a ragged coastline 0.5–1.4 km in."""
    yk = 500.0 - z / M_PER_KM
    xk = 18 + 12 * math.sin(yk / 37.0) + 8 * math.sin(yk / 13.0 + 1.3)
    return X0 + xk * M_PER_KM


def seg_dist(px, pz, ax, az, bx, bz):
    vx, vz = bx - ax, bz - az
    L2 = vx * vx + vz * vz
    t = 0.0 if L2 == 0 else max(0.0, min(1.0, ((px - ax) * vx + (pz - az) * vz) / L2))
    return math.hypot(px - (ax + t * vx), pz - (az + t * vz))


def poly_dist(px, pz, pts):
    return min(seg_dist(px, pz, *pts[i], *pts[i + 1]) for i in range(len(pts) - 1))


def meander(a, b, seed, amp=0.06, step=420.0):
    """A deterministic winding polyline from a to b: points every ~step metres, pushed sideways by smooth noise up to
    amp × the length (never at the ends)."""
    (ax, az), (bx, bz) = a, b
    L = math.hypot(bx - ax, bz - az)
    n = max(2, int(L // step) + 1)
    nx, nz = (-(bz - az) / L, (bx - ax) / L) if L else (0, 0)
    pts = []
    for i in range(n + 1):
        t = i / n
        off = math.sin(t * math.pi) * (math.sin(t * 5.1 + seed * 1.7) * 0.6 + math.sin(t * 11.3 + seed * 0.9) * 0.4) * amp * L
        pts.append((round(ax + (bx - ax) * t + nx * off, 1), round(az + (bz - az) * t + nz * off, 1)))
    return pts


def build():
    regions = load('regions'); wm = load('world_map'); sites = load('sites'); maps = load('maps')
    rects = region_rects(regions)
    locs = wm['locations']

    # --- places ------------------------------------------------------------------------------------------------
    places = {}
    for lid, l in locs.items():
        xk, yk = l['x'], l['y']
        if l.get('moves'):
            xk, yk = l['moves']['route'][0]['x'], l['moves']['route'][0]['y']
        cx, cz = km_to_world(xk, yk)
        map_id = l.get('map')
        if map_id and map_id in maps and not maps[map_id].get('interior'):
            lay = maps[map_id]['layout']
            w, d = len(lay[0]) * TILE_M, len(lay) * TILE_M
        else:
            w = d = FOOTPRINT[l.get('kind', 'minor')]
        places[lid] = {'id': lid, 'name': l['name'], 'kind': l.get('kind', 'minor'), 'region': l['region'], 'map': map_id,
                       'hidden': bool(l.get('hidden')), 'offshore': lid in OFFSHORE, 'centre': [round(cx, 1), round(cz, 1)], 'size': [w, d]}
    # Meridian's districts stand side by side inside the Wall, from the precinct outwards (sites.json "beside").
    district = {}
    for sid, s in sites.items():
        if s.get('kind') == 'open' and s.get('at') and sites[sid].get('at') in places and maps.get(sid):
            district[sid] = places[s['at']]
    changed = True
    while changed:
        changed = False
        for sid, s in sites.items():
            b = s.get('beside')
            if s.get('kind') != 'open' or not b or sid in district or b['site'] not in district or sid not in maps: continue
            base = district[b['site']]; lay = maps[sid]['layout']
            w, d = len(lay[0]) * TILE_M, len(lay) * TILE_M
            bx, bz = base['centre']; bw, bd = base['size']
            off = {'e': (bw / 2 + w / 2, 0), 'w': (-(bw / 2 + w / 2), 0), 'n': (0, bd / 2 + d / 2), 's': (0, -(bd / 2 + d / 2))}[b['side']]
            pid = 'site_' + sid
            places[pid] = {'id': pid, 'name': maps[sid].get('name', sid), 'kind': 'district', 'region': base['region'], 'map': sid,
                           'hidden': False, 'offshore': False, 'centre': [round(bx + off[0], 1), round(bz + off[1], 1)], 'size': [w, d]}
            district[sid] = places[pid]
            changed = True

    # --- roads, rail, rivers -----------------------------------------------------------------------------------
    roads = []
    for i, r in enumerate(wm['routes']):
        if r['a'] not in places or r['b'] not in places: continue
        if locs[r['a']].get('moves') or locs[r['b']].get('moves'): continue   # the Wheel's tracks follow it
        a, b = places[r['a']]['centre'], places[r['b']]['centre']
        roads.append({'id': f"{r['a']}-{r['b']}", 'kind': r['terrain'], 'width': ROAD_WIDTH.get(r['terrain'], 5.0),
                      'points': meander(a, b, i + 1)})
    rails = []
    for nid, n in wm['networks'].items():
        if n['kind'] != 'rail': continue
        pts = []
        for j in range(len(n['stops']) - 1):
            seg = meander(places[n['stops'][j]]['centre'], places[n['stops'][j + 1]]['centre'], 100 + j, amp=0.03, step=600.0)
            pts.extend(seg if not pts else seg[1:])
        rails.append({'id': nid, 'kind': 'rail', 'width': 6.0, 'points': pts})
    # The Wet's river: past the timber town and the dam to the river landing, then along the city's north side (the
    # barges' docks; the districts stay dry) out to the sea.
    mx, mz = places['meridian']['centre']
    bank = lambda pid: (places[pid]['centre'][0] - 260, places[pid]['centre'][1])   # the towns stand on the east bank
    river_pts = [bank('timber'), bank('dam'), bank('riverdock'), (mx + 300, mz + 900)]
    river = []
    for j in range(len(river_pts) - 1):
        seg = meander(river_pts[j], river_pts[j + 1], 200 + j, amp=0.09, step=300.0)
        river.extend(seg if not river else seg[1:])
    river.append((round(coast_x(mz + 900) - 400, 1), round(mz + 900, 1)))
    rivers = [{'id': 'river_wet', 'kind': 'river', 'width': 110.0, 'points': river}]

    # --- the control map ---------------------------------------------------------------------------------------
    centres = [p['centre'] for p in places.values()]
    rp = rivers[0]['points']
    rbox = (min(p[0] for p in rp) - 200, min(p[1] for p in rp) - 200, max(p[0] for p in rp) + 200, max(p[1] for p in rp) + 200)
    data = bytearray()
    raw = []      # (r, g, b, a) floats per texel, rows south → north
    for j in range(CH):
        z = j * TEXEL
        row = []
        for i in range(CW):
            x = i * TEXEL
            # no wander near a place: a town stands on its own region's ground
            near = min(math.hypot(x - c[0], z - c[1]) for c in centres)
            k = smooth((near - 700) / 1600)
            ux, uz = warp(x, z)
            wx, wz = x + (ux - x) * k, z + (uz - z) * k
            hsum = rsum = wsum = 0.0
            for rid, r in rects.items():
                d = dist_out(r, wx, wz)
                if d >= BLEND: continue
                w = smooth(1 - d / BLEND)
                if d == 0:   # inside: smaller regions (the city in the Shore) win near their middle
                    w *= 1 + smooth(dist_in(r, wx, wz) / BLEND) * (4 if rid == 'meridian' else 1)
                base, rough = LAND[rid]
                if rid == 'teeth':
                    base += TEETH_RISE[0] * smooth(max(0.0, dist_in(r, wx, wz)) / TEETH_RISE[1])
                hsum += w * base; rsum += w * rough; wsum += w
            h = hsum / wsum if wsum else LAND['sallow'][0]
            rough = rsum / wsum if wsum else LAND['sallow'][1]
            water = 0.0
            cxw = coast_x(z)
            if x < cxw + 300:     # the shore slopes into the sea over 300 m
                t = smooth((cxw + 300 - x) / 600)
                h = h * (1 - t) + (-12.0) * t
                water = smooth((cxw - x) / 128 + 0.5)
                rough *= 1 - t
            dr = poly_dist(x, z, rivers[0]['points']) if rbox[0] <= x <= rbox[2] and rbox[1] <= z <= rbox[3] else 1e9
            if dr < 200:
                water = max(water, smooth((rivers[0]['width'] / 2 + 32 - dr) / 64))
                h = min(h, h - 6 * smooth((200 - dr) / 140))
            biome = BIOMES.index(region_at(rects, wx, wz))
            row.append((h, rough, biome, water))
        raw.append(row)
    for row in raw:
        for h, rough, biome, water in row:
            r16 = int(round(max(0.0, min(1.0, (h - FLOOR) / SPAN)) * 65535))
            data += struct.pack('<HHHH', r16, int(round(rough * 65535)), biome * 4096, int(round(water * 65535)))

    for p in places.values():   # elevation: the base ground under the centre, a little proud of it, always dry
        i, j = int(round(p['centre'][0] / TEXEL)), int(round(p['centre'][1] / TEXEL))
        i, j = max(0, min(CW - 1, i)), max(0, min(CH - 1, j))
        p['elevation'] = round(max(SEA + 1.0, raw[j][i][0] + 0.5), 2)
        p['biome'] = BIOMES[raw[j][i][2]]
    for p in places.values():   # entry yaw: facing the first road that leaves it (degrees from north, clockwise)
        road = next((r for r in roads if r['id'].split('-')[0] == p['id'] or r['id'].split('-')[1] == p['id']), None)
        yaw = 0.0
        if road:
            pts = road['points'] if road['id'].split('-')[0] == p['id'] else road['points'][::-1]
            dx, dz = pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]
            yaw = round(math.degrees(math.atan2(dx, dz)) % 360, 1)
        p['entryYaw'] = yaw
    return data, raw, places, {'roads': roads, 'rails': rails, 'rivers': rivers}


def write_png16(path, raw):
    """16-bit RGBA PNG, rows north to south (image order)."""
    rows = []
    for row in reversed(raw):
        line = bytearray(b'\x00')
        for h, rough, biome, water in row:
            r16 = int(round(max(0.0, min(1.0, (h - FLOOR) / SPAN)) * 65535))
            line += struct.pack('>HHHH', r16, int(round(rough * 65535)), biome * 4096, int(round(water * 65535)))
        rows.append(bytes(line))
    def chunk(t, d):
        c = struct.pack('>I', len(d)) + t + d
        return c + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    w, h = len(raw[0]), len(raw)
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 16, 6, 0, 0, 0)) + \
        chunk(b'IDAT', zlib.compress(b''.join(rows), 9)) + chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)


def preview(path, raw, places, lines):
    """An 8-bit picture of the world for a person: biomes tinted, shaded by height, water blue, roads and places."""
    from PIL import Image, ImageDraw
    tint = [(196, 170, 120), (214, 200, 168), (150, 160, 100), (120, 140, 120), (130, 130, 136), (120, 130, 110), (110, 96, 88), (90, 120, 90)]
    S = 4
    im = Image.new('RGB', (CW * S, CH * S))
    px = im.load()
    for j, row in enumerate(raw):
        for i, (h, rough, biome, water) in enumerate(row):
            c = tint[biome]; k = 0.6 + 0.4 * min(1.0, max(0.0, (h + 20) / 450))
            col = tuple(int(v * k) for v in c)
            if water > 0.5: col = (60, 90, 130)
            for a in range(S):
                for b in range(S):
                    px[i * S + a, (CH - 1 - j) * S + b] = col
    d = ImageDraw.Draw(im)
    def p2(x, z): return (x / TEXEL * S, (CH - 1 - z / TEXEL) * S)
    for group, colour in (('roads', (240, 230, 200)), ('rails', (40, 40, 40)), ('rivers', (70, 110, 170))):
        for l in lines[group]:
            d.line([p2(*q) for q in l['points']], fill=colour, width=2 if group != 'rivers' else 4)
    for p in places.values():
        x, z = p['centre']; w, dd = p['size']
        a, b = p2(x - w / 2, z + dd / 2), p2(x + w / 2, z - dd / 2)
        d.rectangle([a[0] - 1, a[1] - 1, b[0] + 1, b[1] + 1], outline=(200, 30, 30))
    im.save(path)


def main():
    argv = sys.argv[1:]
    data, raw, places, lines = build()
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, 'control.bin'), 'wb') as f:
        f.write(b'SFCM' + struct.pack('<iiii', 1, CW, CH, TEXEL) + bytes(data))
    write_png16(os.path.join(OUT, 'control.png'), raw)
    with open(os.path.join(OUT, 'places.json'), 'w') as f:
        json.dump({'world': {'width': WORLD_W, 'depth': WORLD_D, 'floor': FLOOR, 'span': SPAN, 'sea': SEA, 'metresPerKm': M_PER_KM,
                             'biomes': BIOMES}, 'places': places}, f, indent=1, sort_keys=True)
    with open(os.path.join(OUT, 'roads.json'), 'w') as f:
        json.dump(lines, f, indent=1)
    if '--preview' in argv:
        preview(argv[argv.index('--preview') + 1], raw, places, lines)
    print(f'control {CW}x{CH} @ {TEXEL} m, {len(places)} places, {len(lines["roads"])} roads, {len(lines["rails"])} rail, {len(lines["rivers"])} river')


if __name__ == '__main__':
    main()
