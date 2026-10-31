"""The soft tissue's descent with the years as a shape (R4d, docs/PEOPLE_REALISM.md §16 round 38): what makes a face read
its age at a speaking distance is its form under the light (real faces keep their years with everything but the face
black and lose them with the face blurred), not its fine lines; MakeHuman's own ageing shape barely moves it. Authored in
the head frame of the web game's skin painter (the eyes at (±0.36, 0.1) head radii; the mouth's line from the base's
`joint-mouth`), each change at its full extent for a face of about seventy-five, displaced along the skin's normal
(decimetres; negative is in):

- the temples hollow (the temporal fat pad thins)
- under the cheekbones hollow (the buccal and deep malar fat thin)
- the nasolabial fold deepens: a groove from the nose's wing past the mouth's corner, the malar fat sagging over it above
- marionette lines from the mouth's corners toward the jaw, and jowls over the jawline beside the chin
- the lower lid's bag (orbital fat bulging) over the tear trough's groove
- the brow's tail and the upper lid's skin descend (hooding)
- the front of the neck loosens

Sizes from the ageing literature's orders (up to about 5 mm of volume loss and descent between thirty and seventy-five:
Coleman and Grover 2006, the ageing face's volume; Shaw and Kahn 2007, the skeleton and soft tissue), tuned on renders of the base (at half these sizes the change
barely showed) so that nothing reads as a caricature. Usage from mh_build: `deltas(v, normals, eyes, mouth, body_idx)`."""
import math


def _seg_dist(px, py, ax, ay, bx, by):
    """Distance from (px, py) to the segment a-b, and where along it (0..1)."""
    vx, vy = bx - ax, by - ay
    L2 = vx * vx + vy * vy or 1e-9
    t = max(0.0, min(1.0, ((px - ax) * vx + (py - ay) * vy) / L2))
    dx, dy = px - (ax + t * vx), py - (ay + t * vy)
    return math.sqrt(dx * dx + dy * dy), t


def _blob(x, y, cx, cy, rx, ry):
    return math.exp(-(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2))


def field(X, Y, Z, ym):
    """The displacement along the normal (head radii) and the extra downward pull (head radii) at a point of the head frame,
    for a mouth's line at `ym`. Symmetric in X."""
    ax = abs(X)
    front = min(1.0, max(0.0, (Z - 0.35) / 0.3))          # the face's front, not the sides of the skull
    side = min(1.0, max(0.0, (Z + 0.1) / 0.4))             # the temples and the cheeks' sides too
    n = 0.0
    down = 0.0
    # the temples hollow
    n -= 0.060 * _blob(ax, Y, 0.66, 0.28, 0.16, 0.14) * side
    # under the cheekbones
    n -= 0.068 * _blob(ax, Y, 0.47, (ym - 0.42) / 2 - 0.2, 0.15, 0.13) * side
    # the nasolabial fold: a groove from the nose's wing past the mouth's corner, the cheek's fat sagging over it
    d, t = _seg_dist(ax, Y, 0.21, -0.47, 0.30, ym - 0.10)
    n -= 0.036 * math.exp(-(d / 0.035) ** 2) * front
    # (the fold's cheek side: above and outside the groove)
    d2, t2 = _seg_dist(ax, Y, 0.27, -0.44, 0.36, ym - 0.05)
    n += 0.032 * math.exp(-(d2 / 0.06) ** 2) * front * (1 - 0.5 * t2)
    down += 0.024 * math.exp(-(d2 / 0.08) ** 2) * front
    # marionette lines: from the mouth's corner toward the jaw
    d, t = _seg_dist(ax, Y, 0.27, ym - 0.04, 0.31, ym - 0.24)
    n -= 0.020 * math.exp(-(d / 0.03) ** 2) * front
    # jowls: over the jawline outside the marionette lines
    n += 0.040 * _blob(ax, Y, 0.43, ym - 0.22, 0.10, 0.08) * side
    down += 0.030 * _blob(ax, Y, 0.43, ym - 0.18, 0.12, 0.10) * side
    # the lower lid's bag over the tear trough
    n += 0.028 * _blob(ax, Y, 0.37, -0.03, 0.12, 0.035) * front
    n -= 0.020 * _blob(ax, Y, 0.33, -0.12, 0.13, 0.03) * front
    # the brow's tail and the upper lid's skin descend
    down += 0.032 * _blob(ax, Y, 0.47, 0.24, 0.12, 0.07) * front
    down += 0.016 * _blob(ax, Y, 0.42, 0.16, 0.10, 0.04) * front
    # the front of the neck loosens
    neck = min(1.0, max(0.0, (-1.0 - Y) / 0.12)) * min(1.0, max(0.0, (Y + 1.45) / 0.12)) * min(1.0, max(0.0, (0.35 - ax) / 0.15))
    n += 0.024 * neck * min(1.0, max(0.0, Z / 0.4))
    return n, down


def deltas(v, normals, eyes, mouth, body_idx):
    """(i, dx, dy, dz) over the head and neck for the shape at its full years, MakeHuman space (y up, z the face's way).
    `eyes`: the two eye joints' centres; `mouth`: the mouth joint's centre."""
    el, er = eyes
    mid = [(el[k] + er[k]) / 2 for k in range(3)]
    rad = math.dist(el, er) / (2 * 0.36)
    zc = mid[2] - 0.88 * rad
    ym = (mouth[1] - mid[1]) / rad + 0.1
    out = []
    for i in body_idx:
        x, y, z = v[i]
        X, Y, Z = (x - mid[0]) / rad, (y - mid[1]) / rad + 0.1, (z - zc) / rad
        if Y < -1.5 or Y > 0.8 or abs(X) > 1.0 or Z < -0.2: continue
        n, down = field(X, Y, Z, ym)
        if abs(n) < 1e-4 and down < 1e-4: continue
        nx, ny, nz = normals[i]
        out.append((i, n * rad * nx, n * rad * ny - down * rad, n * rad * nz))
    return out
