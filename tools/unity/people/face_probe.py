"""What the MakeHuman face targets move, and how MakeHuman's own ancestry, sex and age macros project on them (P4.15,
the archetypes of Core Faces). Two parts:
  python3 face_probe.py targets <makehuman data> <target rel> ...   # region, size and mean motion of each target
  python3 face_probe.py macros <makehuman data>                     # each face slider's local cosine with the macros
The second removes each target region's mean motion first (the macros move the whole head), then compares directions:
a positive cosine for african-caucasian on nose-flaring means MakeHuman's own African macro flares the nose.
"""
import sys
mode = sys.argv.pop(1) if len(sys.argv) > 1 and sys.argv[1] in ('targets', 'macros') else 'targets'
if mode == 'targets':
    import os, sys, numpy as np
    MH = sys.argv[1]
    V = []
    for line in open(os.path.join(MH, '3dobjs', 'base.obj')):
        if line.startswith('v '): V.append([float(x) for x in line.split()[1:4]])
    V = np.array(V)
    def tgt(rel):
        p = os.path.join(MH, 'targets', rel + '.target')
        if not os.path.exists(p): return None
        a = [l.split() for l in open(p) if l.strip() and not l.startswith('#')]
        idx = np.array([int(x[0]) for x in a]); d = np.array([[float(y) for y in x[1:4]] for x in a])
        return idx, d
    names = sys.argv[2:]
    for n in names:
        t = tgt(n)
        if t is None: print(f'{n:40s} MISSING'); continue
        idx, d = t
        m = np.linalg.norm(d, axis=1); w = m / m.sum()
        c = (V[idx] * w[:, None]).sum(0)
        # mean signed motion of verts on the character's left half (x>0) to read symmetric effects
        side = V[idx, 0] > 0.05
        md = d[side].mean(0) if side.any() else d.mean(0)
        print(f'{n:40s} n={len(idx):5d} max={m.max()*10:5.2f}cm centre=({c[0]:+.2f},{c[1]:+.2f},{c[2]:+.2f}) leftmean=({md[0]*10:+.2f},{md[1]*10:+.2f},{md[2]*10:+.2f})mm*')
else:
    import os, sys, numpy as np
    MH = sys.argv[1]
    NV = sum(1 for l in open(os.path.join(MH, '3dobjs', 'base.obj')) if l.startswith('v '))
    def full(rel):
        p = os.path.join(MH, 'targets', rel + '.target')
        out = np.zeros((NV, 3))
        if not os.path.exists(p): return None
        for l in open(p):
            if l.strip() and not l.startswith('#'):
                a = l.split(); out[int(a[0])] = [float(x) for x in a[1:4]]
        return out
    def pair(base, lo, hi, sym=False, folder=None):
        folder = folder or base.split('-')[0]
        fold = {'eye':'eyes','ear':'ears','eyebrows':'eyebrows'}.get(folder, folder)
        names = [f'l-{base}', f'r-{base}'] if sym else [base]
        d = np.zeros((NV, 3))
        for n in names:
            a, b = full(f'{fold}/{n}-{hi}'), full(f'{fold}/{n}-{lo}')
            if a is not None: d += a
            if b is not None: d -= b
        return d / 2   # incr minus decr over two: one unit of slider
    FEATS = [('nose-scale-horiz','decr','incr'),('nose-scale-vert','decr','incr'),('nose-hump','decr','incr'),('nose-nostrils-width','decr','incr'),
     ('nose-point-width','decr','incr'),('nose-volume','decr','incr'),('nose-flaring','decr','incr'),('nose-scale-depth','decr','incr'),('nose-width1','decr','incr'),
     ('nose-point','down','up'),('nose-curve','concave','convex'),('mouth-scale-horiz','decr','incr'),('mouth-upperlip-volume','decr','incr'),
     ('mouth-lowerlip-volume','decr','incr'),('mouth-trans','backward','forward'),('mouth-lowerlip-height','decr','incr'),('mouth-cupidsbow','decr','incr'),
     ('chin-prominent','decr','incr'),('chin-width','decr','incr'),('chin-height','decr','incr'),('chin-bones','decr','incr'),('chin-prognathism','decr','incr'),
     ('cheek-bones','decr','incr',True),('cheek-volume','decr','incr',True),('cheek-inner','decr','incr',True),('cheek-trans','down','up',True),
     ('eye-scale','decr','incr',True),('eye-trans','in','out',True),('eye-epicanthus','in','out',True),('eye-height2','decr','incr',True),('eye-corner1','down','up',True),
     ('eye-eyefold','down','up',True),('eyebrows-trans','down','up'),('eyebrows-trans','backward','forward'),('eyebrows-angle','down','up'),
     ('forehead-trans','backward','forward'),('forehead-temple','decr','incr'),('forehead-scale-vert','decr','incr'),('head-scale-horiz','decr','incr'),('head-fat','decr','incr'),('neck-scale-horiz','decr','incr')]
    T = {}
    for f in FEATS:
        T[f[0]+':'+f[2]] = pair(f[0], f[1], f[2], len(f) > 3)
    def macro(e, g, a='young'): return full(f'macrodetails/{e}-{g}-{a}')
    for g in ('female', 'male'):
        A, S_, C = macro('african', g), macro('asian', g), macro('caucasian', g)
        for lab, diff in (('af-ca', A - C), ('as-ca', S_ - C), ('af-as', A - S_)):
            row = []
            for k, t in T.items():
                m = np.linalg.norm(t, axis=1) > 1e-6
                if not m.any(): continue
                beta = (diff[m] * t[m]).sum() / (t[m] * t[m]).sum()
                row.append((k, beta))
            print(g, lab, '  '.join(f'{k}={b:+.2f}' for k, b in row))
        # sex in MakeHuman's own macro (male - female) for the caucasian young
    for e in ('african', 'asian', 'caucasian'):
        diff = macro(e, 'male') - macro(e, 'female')
        row = []
        for k, t in T.items():
            m = np.linalg.norm(t, axis=1) > 1e-6
            beta = (diff[m] * t[m]).sum() / (t[m] * t[m]).sum(); row.append((k, beta))
        print('sex m-f', e, '  '.join(f'{k}={b:+.2f}' for k, b in row))
    
    print('\n--- local (mean motion removed), cosine x 100 ---')
    def local(diff, t):
        m = np.linalg.norm(t, axis=1) > 1e-6
        w = np.linalg.norm(t[m], axis=1)
        d = diff[m] - (diff[m] * w[:, None]).sum(0) / w.sum()
        tt = t[m] - (t[m] * w[:, None]).sum(0) / w.sum()
        return 100 * (d * tt).sum() / (np.linalg.norm(d) * np.linalg.norm(tt) + 1e-12), np.linalg.norm(d) / (np.linalg.norm(tt) + 1e-12)
    for lab, (a, b) in {'af-ca': ('african', 'caucasian'), 'as-ca': ('asian', 'caucasian'), 'af-as': ('african', 'asian')}.items():
        diff = (macro(a, 'female') + macro(a, 'male') - macro(b, 'female') - macro(b, 'male')) / 2
        print(lab, '  '.join(f'{k}={c:+.0f}' for k, (c, r) in ((k, local(diff, t)) for k, t in T.items())))
    diff = sum(macro(e, 'male') - macro(e, 'female') for e in ('african', 'asian', 'caucasian')) / 3
    print('m-f', '  '.join(f'{k}={c:+.0f}' for k, (c, r) in ((k, local(diff, t)) for k, t in T.items())))
    diff = sum(full(f'macrodetails/{e}-female-old') - macro(e, 'female') for e in ('african', 'asian', 'caucasian')) / 3
    print('old-young f', '  '.join(f'{k}={c:+.0f}' for k, (c, r) in ((k, local(diff, t)) for k, t in T.items())))
