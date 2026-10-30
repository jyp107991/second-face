"""The face's whole shape, the same way for a photograph and a render (R3, docs/PEOPLE_REALISM.md §4.2): 69 of MediaPipe's
landmarks (the lower face's outline from cheekbone round the chin to cheekbone, the brows, the eyes, the nose's bridge,
tip and wings, the lips' outline; nothing at the hairline, which hair hides on our people and photographs crop), x and y
only, centred, turned so the eyes lie level and scaled to a unit spread: a vector in which faces of any size, position and
roll compare. FairFace's real faces measured so (fairface_shapes.py) make the shape space; ours are fitted in it."""
import numpy as np

OUTLINE = [234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 454]
BROWS = [70, 63, 105, 66, 107, 336, 296, 334, 293, 300]
EYES = [33, 160, 158, 133, 153, 144, 362, 385, 387, 263, 373, 380]
NOSE = [168, 6, 197, 195, 5, 4, 1, 2, 98, 327, 129, 358]
LIPS = [61, 40, 37, 0, 267, 270, 291, 321, 314, 17, 84, 91, 13, 14]
SHAPE_LM = OUTLINE + BROWS + EYES + NOSE + LIPS
R_EYE, L_EYE = [33, 133], [263, 362]


def shape(P):
    """The aligned shape vector (2 x 69) of landmark points P (n x 2+, image units)."""
    P = np.asarray(P, float)[:, :2]
    X = P[SHAPE_LM]
    c = X.mean(0)
    d = P[L_EYE].mean(0) - P[R_EYE].mean(0)
    a = -np.arctan2(d[1], d[0])
    R = np.array([[np.cos(a), -np.sin(a)], [np.sin(a), np.cos(a)]])
    X = (X - c) @ R.T
    X /= np.sqrt((X ** 2).sum(1).mean())
    return X.reshape(-1)


# each landmark's mirror image across the face's midline (MediaPipe's mesh is symmetric), in SHAPE_LM's order
MIRROR = {**{a: b for a, b in zip(OUTLINE, OUTLINE[::-1])},
          **dict(zip([70, 63, 105, 66, 107], [300, 293, 334, 296, 336])), **dict(zip([300, 293, 334, 296, 336], [70, 63, 105, 66, 107])),
          **dict(zip([33, 160, 158, 133, 153, 144], [263, 387, 385, 362, 380, 373])),
          **dict(zip([263, 387, 385, 362, 380, 373], [33, 160, 158, 133, 153, 144])),
          **{k: k for k in (168, 6, 197, 195, 5, 4, 1, 2, 0, 17, 13, 14)}, 98: 327, 327: 98, 129: 358, 358: 129,
          61: 291, 291: 61, 40: 270, 270: 40, 37: 267, 267: 37, 321: 91, 91: 321, 314: 84, 84: 314}
_PERM = [SHAPE_LM.index(MIRROR[k]) for k in SHAPE_LM]


def symmetric(v):
    """A shape vector made symmetric (its mean with its mirror image): what is left of a face's shape once a slight turn
    or tilt of the head (and the face's own small asymmetry) is taken out, so photographs and renders compare as shapes."""
    X = np.asarray(v, float).reshape(-1, 2)
    M = X[_PERM] * np.array([-1.0, 1.0])
    X = (X + M) / 2
    X -= X.mean(0)
    X /= np.sqrt((X ** 2).sum(1).mean())
    return X.reshape(-1)
