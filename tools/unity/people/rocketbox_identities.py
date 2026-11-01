"""Rocketbox people who share one face (2026-11-01): the library dresses some heads more than once (a woman's head as a
businesswoman, a pilot and a soldier; a man's as a builder and in his own clothes), with the same face and mostly the
same skin. Found by the measured features (data/rocketbox_features.json): two people whose every feature lies within
1.5 mm are one face (distinct faces of the library differ by 2 mm or more in at least one feature); confirmed by eye
on the library renders (docs/evidence/unity/p4/research/rocketbox_shared_heads.jpg). Writes the groups to
data/rocketbox_review.json ('identities') and lists the groups whose by-eye ancestry labels disagree.
Usage: python3 rocketbox_identities.py"""
import json, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SAME_MM = 1.5


def groups():
    F = json.load(open(os.path.join(HERE, 'data', 'rocketbox_features.json')))['faces']
    names = sorted(F); keys = sorted(F[names[0]]['features'])
    X = np.array([[F[n]['features'].get(k, np.nan) for k in keys] for n in names])
    D = np.nanmax(np.abs(X[:, None] - X[None]), -1)
    parent = list(range(len(names)))
    def find(i):
        while parent[i] != i: parent[i] = parent[parent[i]]; i = parent[i]
        return i
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            if D[i, j] <= SAME_MM: parent[find(i)] = find(j)
    out = {}
    for i, n in enumerate(names): out.setdefault(find(i), []).append(n)
    return sorted(sorted(g) for g in out.values() if len(g) > 1), len(out)


if __name__ == '__main__':
    gs, distinct = groups()
    rp = os.path.join(HERE, 'data', 'rocketbox_review.json')
    review = json.load(open(rp))
    review['identities'] = gs
    review['_identities'] = (f'people who share one face (rocketbox_identities.py: every measured feature within {SAME_MM} mm, '
                             'confirmed by eye); a face serves as a base once, whichever of its people is used')
    json.dump(review, open(rp, 'w'), indent=1)
    anc = json.load(open(os.path.join(HERE, 'data', 'rocketbox_ancestry.json')))['ancestry']
    print(sum(len(g) for g in gs), 'people share', len(gs), 'faces;', distinct, 'distinct adult faces')
    for g in gs:
        labs = {anc.get(n) for n in g}
        print(('LABELS DIFFER ' if len(labs) > 1 else '') + ', '.join(f'{n} ({anc.get(n)})' for n in g))
