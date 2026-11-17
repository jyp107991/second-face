"""W3 split in the game: from a gate trace (motion_gate_pick_<person>_trace.csv), per walking state, the upper arm's angle
from down (a1), its sagittal swing (fwd: forward +) and its abduction (out: + out to the side), both arms pooled."""
import csv, sys
import numpy as np
rows = list(csv.DictReader(open(sys.argv[1])))
states = sorted({r['state'] for r in rows if r['state'].startswith(('walk:', 'bend:'))})
p = lambda x, q: float(np.percentile(x, q))
print(f"{'state':22s}  n   | W3 p98 max | sag p2 p98 |sag|p98 | abd p2 p50 p98 max")
for s in states:
    R = [r for r in rows if r['state'] == s]
    def col(k):
        out = []
        for r in R:
            try: out.append(float(r[k]))
            except (ValueError, KeyError): pass
        return np.array(out)
    a1 = np.concatenate([col('a1L'), col('a1R')]); sag = np.concatenate([col('fwdL'), col('fwdR')]); abd = np.concatenate([col('outL'), col('outR')])
    if len(a1) == 0: continue
    print(f"{s:22s} {len(R):4d} | {p(a1,98):5.1f} {a1.max():5.1f} | {p(sag,2):6.1f} {p(sag,98):5.1f} {p(np.abs(sag),98):6.1f} | {p(abd,2):5.1f} {p(abd,50):5.1f} {p(abd,98):5.1f} {abd.max():5.1f}")
