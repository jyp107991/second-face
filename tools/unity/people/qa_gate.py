"""The realism gate's verdict (docs/PEOPLE_QA.md): a made person's measures (qa_realism.py) against the same measures on
Rocketbox's own heads as shipped (data/qa_reference.json, made by `python3 qa_gate.py reference <json>...`). A person
passes a measure when it is no worse than the library's own people: within the band the shipped heads span (their 95th
percentile, with a tenth more), the trichion within real men's and women's forehead heights, a beard's edge no harder
than the library's bearded men's. Nothing fails silently: every measure is printed with its band.
Usage: python3 qa_gate.py check <person qa json> [--sex m|f] [--short] [--own <the face's source as shipped, qa json>]
       [--base <the head it is built on as shipped, qa json>]
       (--short: a short hairline's straightness too; exit 1 on a failure)
       python3 qa_gate.py reference <shipped qa json>...         (writes data/qa_reference.json)"""
import json, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, 'data', 'qa_reference.json')
LOWER = ['tone_spread', 'side_diff', 'blotch', 'seam', 'side_seam', 'specks_per_10cm2', 'eye_ring', 'beard_edge_grad', 'beard_high_frac',
         # (the lips, owner 2026-11-04 "colour and symmetry off")
         'lip_lr_dE', 'lip_pale_frac', 'mouth_line_asym_mm', 'mouth_corner_asym_mm']
INFO = ['side_patchiness', 'side_islands_mm2']                       # (kept in the reference for the bands; judged against the base)
# (a short hairline's front, owner 2026-11-03: straight and level; absolute, the library's long hair and shells give no band)
ABS = {'hairline_wobble_mm': 2.5, 'hairline_tilt_mm': 2.5}
BAND = ['detail']
# (real forehead heights, trichion to glabella: Kenyan and African American norms, 61 +/- 3 mm for adult men, women about
# 3 mm less; young men's lines sit lower than the population's mean, which counts receded men)
TRG = {'m': (50.0, 66.0), 'f': (48.0, 64.0)}       # (about 3.5 standard deviations: a real person's own line can sit there; a drawn one sits 53-57)


def reference(paths):
    rows = [json.load(open(p)) for p in paths]
    out = {'_about': 'Rocketbox heads as shipped, measured by qa_realism.py: the realism gate\'s bands (p5, p50, p95).', 'n': len(rows), 'heads': [r['label'] for r in rows]}
    for k in LOWER + BAND + INFO:
        v = [r[k] for r in rows if r.get(k) is not None]
        if len(v) >= 3: out[k] = [round(float(np.percentile(v, q)), 3) for q in (5, 50, 95)]
    json.dump(out, open(REF, 'w'), indent=1)
    print(json.dumps(out, indent=1))


def check(path, sex, short=False, own=None, base=None):
    """own: the same measures on the real person the face comes from, as shipped: a real face's own unevenness, freckles or
    stubble is no fault; a made person is held to the worse of the library's band and that face's own value."""
    ref = json.load(open(REF)); r = json.load(open(path)); fails = []
    o = json.load(open(own)) if own else {}
    b = json.load(open(base)) if base else {}
    for k in LOWER:
        if r.get(k) is None or k not in ref: continue
        lim = max(ref[k][2], o.get(k) or 0.0) * 1.1
        ok = r[k] <= lim
        print(f'{"ok  " if ok else "FAIL"} {k:20s} {r[k]:8.2f}   (shipped heads up to {ref[k][2]:.2f}' + (f', the face as shipped {o[k]:.2f}' if o.get(k) is not None else '') + f'; limit {lim:.2f})')
        if not ok: fails.append(k)
    for k in BAND:
        if r.get(k) is None or k not in ref: continue
        lo, hi = ref[k][0] * 0.9, ref[k][2] * 1.1
        ok = lo <= r[k] <= hi
        print(f'{"ok  " if ok else "FAIL"} {k:20s} {r[k]:8.2f}   (shipped heads {ref[k][0]:.2f}-{ref[k][2]:.2f}; band {lo:.2f}-{hi:.2f})')
        if not ok: fails.append(k)
    if r.get('hairline_trg_mm') is not None and sex in TRG:
        lo, hi = TRG[sex]; ok = lo <= r['hairline_trg_mm'] <= hi
        print(f'{"ok  " if ok else "FAIL"} {"hairline_trg_mm":20s} {r["hairline_trg_mm"]:8.2f}   (real foreheads {lo}-{hi} mm)')
        if not ok: fails.append('hairline_trg_mm')
    for k, lim in ABS.items():
        if r.get(k) is None or not short: continue
        ok = r[k] <= lim
        print(f'{"ok  " if ok else "FAIL"} {k:20s} {r[k]:8.2f}   (straight and level: limit {lim:.2f})')
        if not ok: fails.append(k)
    # (dark patches at the temples or cheekbones that the head as shipped does not have: carried hair, a misplaced block)
    for k, v in (r.get('zone_dark') or {}).items():
        bv = (b.get('zone_dark') or {}).get(k)
        if v is None or bv is None: continue
        ok = v - bv <= 0.08
        print(f'{"ok  " if ok else "FAIL"} {"dark " + k:20s} {v:8.2f}   (the head as shipped {bv:.2f}; at most 0.08 more)')
        if not ok: fails.append('dark ' + k)
    # (the lips in profile, owner 2026-11-04 "lips sink into face weirdly": each lip's distance in front of the
    # subnasale-pogonion line within 1.5 mm of the real face's own; with no source, never behind the line)
    for k in ('lip_upper_mm', 'lip_lower_mm'):
        if r.get(k) is None: continue
        if o.get(k) is not None:
            ok = abs(r[k] - o[k]) <= 1.5
            print(f'{"ok  " if ok else "FAIL"} {k:20s} {r[k]:8.2f}   (the face as shipped {o[k]:.2f}; within 1.5)')
        else:
            ok = r[k] >= (0.0 if k == 'lip_upper_mm' else -1.5)
            print(f'{"ok  " if ok else "FAIL"} {k:20s} {r[k]:8.2f}   (not behind the line)')
        if not ok: fails.append(k)
    # (each side, owner 2026-11-04 "hair on side is all patchy and uneven and not aligned": against the head it is built on,
    # the same geometry and light, so the reading's own errors cancel)
    if b:
        for k, add in (('side_islands_mm2', 50.0), ('side_patchiness', 0.0)):
            if r.get(k) is None or b.get(k) is None: continue
            lim = max(b[k], ref.get(k, [0, 0, 0])[2] if k == 'side_patchiness' else 0.0) * 1.1 + add
            ok = r[k] <= lim
            print(f'{"ok  " if ok else "FAIL"} {k:20s} {r[k]:8.2f}   (the head as shipped {b[k]:.2f}; limit {lim:.2f})')
            if not ok: fails.append(k)
        if r.get('sideburn_gap_mm') is not None and sex == 'm':
            lim = max(4.0, (b.get('sideburn_gap_mm') or 0.0) + 2.0); ok = r['sideburn_gap_mm'] <= lim
            print(f'{"ok  " if ok else "FAIL"} {"sideburn_gap_mm":20s} {r["sideburn_gap_mm"]:8.2f}   (sideburn into beard: limit {lim:.1f})')
            if not ok: fails.append('sideburn_gap_mm')
    print('GATE', 'PASS' if not fails else 'FAIL ' + ', '.join(fails))
    return not fails


if __name__ == '__main__':
    if sys.argv[1] == 'reference': reference(sys.argv[2:])
    else:
        sex = sys.argv[sys.argv.index('--sex') + 1] if '--sex' in sys.argv else ''
        own = sys.argv[sys.argv.index('--own') + 1] if '--own' in sys.argv else None
        base = sys.argv[sys.argv.index('--base') + 1] if '--base' in sys.argv else None
        sys.exit(0 if check(sys.argv[2], sex, '--short' in sys.argv, own, base) else 1)
