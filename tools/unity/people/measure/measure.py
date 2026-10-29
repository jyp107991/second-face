"""Measure MakeHuman bodies without Blender (P4.11): the base mesh with a spec's targets (mh_build.py's own macro weighting
and body_mods) and its stature, deltoid, waist and hip breadth (torso told from arms by the skin weights' dominant bone),
in cm. A spec with "raw" takes its own mods only (no sex baseline, no shape): the bodies as they were.
usage: python3 -I measure.py <mh data dir> <mh_build.py> <specs.json>"""
import json, os, sys, re
import numpy as np
MH, BUILD, SPECS = (sys.argv + [None] * 4)[1:4]
src = open(BUILD).read()
ns = {}
# the build script's own macro and modifier weighting (pure python parts)
for name in ('tri', 'macro_targets', 'modifier_targets'):
    m = re.search(r'^def ' + name + r'\(.*?(?=^\S)', src, re.S | re.M)
    exec(m.group(0), ns)
m = re.search(r'^FOLDER = \{.*?\}\n', src, re.S | re.M); exec(m.group(0), ns)
for d in ('DIMORPH', 'SHAPES'):
    m = re.search(r'^' + d + r' = \{.*?^\}\n', src, re.S | re.M); exec(m.group(0), ns)
m = re.search(r'^def body_mods\(.*?(?=^\S)', src, re.S | re.M); exec(m.group(0), ns)
for extra in ('macro_extra', 'shape_targets'):
    m = re.search(r'^def ' + extra + r'\(.*?(?=^\S)', src, re.S | re.M)
    if m: exec(m.group(0), ns)

verts, groups, cur = [], {}, None
for line in open(os.path.join(MH, '3dobjs', 'base.obj')):
    if line.startswith('v '): verts.append([float(x) for x in line.split()[1:4]])
    elif line.startswith('g '): cur = line.split()[1]
    elif line.startswith('f ') and cur is not None:
        for t in line.split()[1:]: groups.setdefault(cur, set()).add(int(t.split('/')[0]) - 1)
base = np.array(verts)
body = np.array(sorted(groups['body']))
_tc = {}
def target(rel):
    if rel not in _tc:
        p = os.path.join(MH, 'targets', rel + '.target')
        if not os.path.exists(p): print('  missing', rel); _tc[rel] = None
        else:
            rows = [l.split() for l in open(p) if l.strip() and not l.startswith('#')]
            _tc[rel] = (np.array([int(r[0]) for r in rows], dtype=int), np.array([[float(x) for x in r[1:4]] for r in rows]).reshape(-1, 3))
    return _tc[rel]

def shape(spec):
    v = base.copy()
    tl = list(ns['macro_targets'](spec))
    if 'shape_targets' in ns: tl += ns['shape_targets'](spec)
    mods = ns['body_mods'](spec) if not spec.get('raw') else (spec.get('mods') or {})
    for mod, val in mods.items(): tl += ns['modifier_targets'](mod, val)
    for rel, w in tl:
        t = target(rel)
        if t is not None and w: v[t[0]] += t[1] * w
    return v

def jc(v, g): return v[sorted(groups[g])].mean(axis=0)

W = json.load(open(os.path.join(MH, 'rigs', 'default_weights.mhw')))['weights']
best = {}
for bone, wl in W.items():
    for i, w in wl:
        if w > best.get(i, ('', 0))[1]: best[i] = (bone, w)
def owned(prefixes):
    return np.array(sorted(i for i, (bn, w) in best.items() if any(bn.startswith(p) for p in prefixes) and i in body_set), dtype=int)
body_set = set(body.tolist())
TRUNK = owned(('spine', 'root', 'pelvis', 'breast', 'neck', 'clavicle', 'shoulder', 'special'))
DELT = owned(('spine', 'root', 'breast', 'clavicle', 'shoulder', 'upperarm01'))
HIPS = owned(('root', 'pelvis', 'upperleg01', 'spine05'))

def breadth(v, idx, y, half):
    b = v[idx]
    band = b[np.abs(b[:, 1] - y) < half]
    return (band[:, 0].max() - band[:, 0].min()) if len(band) else 0.0

def full_spec(s):
    return dict(dict(african=0.0, asian=0.0, caucasian=1.0, breastSize=0.5, breastFirmness=0.5), **s)

def measure(v):
    b = v[body]
    y0, y1 = b[:, 1].min(), b[:, 1].max()
    ls, rs = jc(v, 'joint-l-shoulder'), jc(v, 'joint-r-shoulder')
    pel = jc(v, 'joint-pelvis'); lu = jc(v, 'joint-l-upper-leg')
    shoulder = max(breadth(v, DELT, ls[1] + d, 0.15) for d in (-0.6, -0.4, -0.2, 0.0))
    hip = max(breadth(v, HIPS, y, 0.2) for y in np.linspace(lu[1] - 1.0, lu[1] + 0.4, 12))
    waist = min(breadth(v, TRUNK, y, 0.2) for y in np.linspace(pel[1] + 1.0, pel[1] + 2.4, 12))
    return dict(stature=(y1 - y0) * 10, shoulder=shoulder * 10, waist=waist * 10, hip=hip * 10,
                leg=(lu[1] - y0) * 10, biacromial=abs(ls[0] - rs[0]) * 10)

if __name__ == '__main__':
    specs = json.load(open(SPECS))
    for s in specs:
        full = dict(dict(african=0.0, asian=0.0, caucasian=1.0, breastSize=0.5, breastFirmness=0.5), **s)
        r = measure(shape(full))
        print(f"{s.get('id','?'):24s} stature {r['stature']:6.1f}  shoulders {r['shoulder']:5.1f}  waist {r['waist']:5.1f}  hips {r['hip']:5.1f}  "
              f"s/h {r['shoulder']/r['hip']:.2f}  w/h {r['waist']/r['hip']:.2f}  leg {r['leg']:5.1f} ({r['leg']/r['stature']:.2f})  biacromial {r['biacromial']:5.1f}")
