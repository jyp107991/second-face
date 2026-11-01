"""VALID against Rocketbox (owner, 2026-11-01: "use VALID, compare consistency first"): the same features measured the
same way (rocketbox_features.Face on each head's exact mesh in its eyes' frame, rocketbox_surface.py) on VALID's heads,
set beside Rocketbox's spread for the same sex and beside the published adult norms (data/published_face_norms.json).
For each VALID head and feature: its value and where it falls (inside the Rocketbox [5, 95] %, inside the widened range,
or outside both); per sex the share of VALID values inside; per feature the median offset between the libraries (a
systematic offset means the two libraries' heads are not built the same way and would not sit together in one crowd).
Matched by ancestry too (VALID's validated groups against Rocketbox's faces of the same group judged by eye,
data/rocketbox_ancestry.json), since the two libraries hold different peoples and a pooled offset can be ancestry.
Usage: python3 valid_compare.py <valid meshes.npz> <rocketbox_features.json> <out.json>"""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rocketbox_features as rf


def main(valid, features, out):
    M = np.load(valid); R = json.load(open(features))
    names = sorted({k.split('#')[0] for k in M.files if k.endswith('#V')})
    sexof = lambda n: 'f' if '_F_' in n else 'm'
    res = {'_about': __doc__.split('\n')[0], 'heads': {}, 'features': {}}
    vals = {}
    for n in names:
        try: F = rf.Face(M[n + '#V'].astype(float), M[n + '#T'])
        except Exception as e: print('no landmarks on', n, e); continue
        vals[n] = {k: float(v) for k, v in F.measures().items()}
    feats = list(next(iter(vals.values())))
    for n, m in vals.items():
        s = sexof(n); dist = R['sexes'][s]['features']; row = {}
        for ft in feats:
            q = dist[ft]; v = m[ft]
            where = 'unmeasured' if not np.isfinite(v) else ('library' if q['p5'] <= v <= q['p95'] else ('widened' if q['lo'] <= v <= q['hi'] else ('below' if v < q['lo'] else 'above')))
            row[ft] = [round(v, 1), where]
        res['heads'][n] = row
    for ft in feats:
        by = {}
        for s in 'fm':
            q = R['sexes'][s]['features'][ft]
            v = np.array([vals[n][ft] for n in vals if sexof(n) == s]); v = v[np.isfinite(v)]
            if not len(v): continue
            inside = float(np.mean((v >= q['lo']) & (v <= q['hi'])))
            by[s] = {'valid_median': round(float(np.median(v)), 1), 'valid_p5_p95': [round(float(np.percentile(v, 5)), 1), round(float(np.percentile(v, 95)), 1)],
                     'rocketbox_median': round(q['p50'], 1), 'rocketbox_range': [round(q['lo'], 1), round(q['hi'], 1)],
                     'offset': round(float(np.median(v)) - q['p50'], 1), 'inside_share': round(inside, 2), 'n': int(len(v))}
        res['features'][ft] = by
    # matched by ancestry: VALID group -> the game's ancestry its Rocketbox counterparts were labelled with
    MATCH = {'White': 'north_european', 'Black': 'west_african', 'Asian': 'east_asian', 'Hispanic': 'latin_american', 'MENA': 'mediterranean'}
    anc = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'rocketbox_ancestry.json')))['ancestry']
    res['matched'] = {}
    for grp, a in MATCH.items():
        for s in 'fm':
            vv = [n for n in vals if n.startswith(grp + '_') and sexof(n) == s]
            rr = [n for n, l in anc.items() if l.rstrip('?') == a and ('Female' in n) == (s == 'f') and n in R['faces']]
            if not vv or not rr: continue
            row = {}
            for ft in feats:
                v = np.array([vals[n][ft] for n in vv]); r = np.array([R['faces'][n]['features'][ft] for n in rr], float)
                v, r = v[np.isfinite(v)], r[np.isfinite(r)]
                if len(v) and len(r): row[ft] = [round(float(np.median(v)), 1), round(float(np.median(r)), 1)]
            res['matched'][f'{grp}_{s}'] = {'valid': vv, 'rocketbox': rr, 'medians_valid_rocketbox': row}
    json.dump(res, open(out, 'w'), indent=1)
    print()
    keys = ['nose_width', 'nose_length', 'nose_projection', 'mouth_width', 'chin_length', 'face_height', 'cheekbone_width', 'cheek_width', 'jaw_width', 'jaw_low_width']
    print('matched by ancestry, medians VALID / Rocketbox (n)')
    print(f"{'group':12s} " + ' '.join(f'{k[:12]:>13s}' for k in keys))
    for g, m in res['matched'].items():
        row = m['medians_valid_rocketbox']
        print(f"{g:12s} " + ' '.join(f"{row[k][0]:6.1f}/{row[k][1]:<6.1f}" if k in row else ' ' * 13 for k in keys), f"({len(m['valid'])}/{len(m['rocketbox'])})")
    print(f"{'feature':16s} {'women: VALID median (RB median) in-range':44s} {'men: VALID median (RB median) in-range':40s}")
    for ft, by in res['features'].items():
        cell = lambda s: f"{by[s]['valid_median']:6.1f} ({by[s]['rocketbox_median']:6.1f}) off {by[s]['offset']:+5.1f}  in {by[s]['inside_share']:.0%}" if s in by else '-'
        print(f'{ft:16s} {cell("f"):44s} {cell("m"):40s}')


if __name__ == '__main__':
    main(*sys.argv[1:4])
