"""Face proportions from a photograph or a render, the same way for both (the plausibility gate, docs/PEOPLE_REALISM.md
§3.2): MediaPipe's Face Landmarker (Apache 2.0; 478 points) finds the face, its head pose says whether it is frontal
enough to measure, and a handful of scale-free ratios between anthropometric landmarks describe its proportions.
Run with a Python that has mediapipe (tools/unity/people/gate/README.md)."""
import math
import numpy as np

# MediaPipe face-mesh indices of the landmarks used (canonical face model)
LM = {
    'zy_r': 234, 'zy_l': 454,          # the face's widest points at the cheekbones (bizygomatic)
    'go_r': 172, 'go_l': 397,          # the jaw's angles (bigonial)
    'n': 168,                          # nasion, between the eyes at the nose's root
    'sn': 2,                           # subnasale, under the nose
    'me': 152,                         # menton, the chin's lowest point
    'en_r': 133, 'en_l': 362,          # inner eye corners
    'ex_r': 33, 'ex_l': 263,           # outer eye corners
    'al_r': 129, 'al_l': 358,          # the nose's wings
    'ch_r': 61, 'ch_l': 291,           # the mouth's corners
    'ls': 0, 'sto_u': 13, 'sto_l': 14, 'li': 17,   # upper lip top, the lips' meeting (upper, lower), lower lip bottom
    'br_r': 105, 'br_l': 334,          # the brows' middle
    'ps_r': 159, 'ps_l': 386,          # the upper lids' middle
}

RATIOS = ['face_hw', 'jaw_face', 'icd_face', 'eye_face', 'nose_icd', 'mouth_face', 'lower_face', 'nose_len', 'lips_face', 'brow_eye']


def ratios(P):
    """Scale-free proportions from landmark points P (n x 2 or 3, image units; only x, y used)."""
    p = lambda k: np.asarray(P[LM[k]][:2], float)
    d = lambda a, b: float(np.linalg.norm(p(a) - p(b)))
    face_w = d('zy_r', 'zy_l')
    face_h = d('n', 'me')
    icd = d('en_r', 'en_l')
    return {
        'face_hw': face_h / face_w,                                    # face height (nasion-menton) over width
        'jaw_face': d('go_r', 'go_l') / face_w,                         # jaw width over cheek width
        'icd_face': icd / face_w,                                       # inner eye spacing over face width
        'eye_face': (d('en_r', 'ex_r') + d('en_l', 'ex_l')) / 2 / face_w,   # eye fissure length over face width
        'nose_icd': d('al_r', 'al_l') / icd,                            # nose width over inner eye spacing
        'mouth_face': d('ch_r', 'ch_l') / face_w,                       # mouth width over face width
        'lower_face': d('sn', 'me') / face_h,                           # lower face over face height
        'nose_len': d('n', 'sn') / face_h,                              # nose length over face height
        'lips_face': (d('ls', 'sto_u') + d('sto_l', 'li')) / face_h,    # lip heights over face height
        'brow_eye': (d('br_r', 'ps_r') + d('br_l', 'ps_l')) / 2 / face_h,   # brow to upper lid over face height
    }


def pose(matrix):
    """Yaw, pitch, roll in degrees from MediaPipe's facial transformation matrix (4 x 4)."""
    R = np.asarray(matrix, float)[:3, :3]
    sy = math.hypot(R[0, 0], R[1, 0])
    pitch = math.degrees(math.atan2(R[2, 1], R[2, 2]))
    yaw = math.degrees(math.atan2(-R[2, 0], sy))
    roll = math.degrees(math.atan2(R[1, 0], R[0, 0]))
    return yaw, pitch, roll


class Landmarker:
    """MediaPipe's face landmarker over RGB images (numpy uint8 h x w x 3)."""

    def __init__(self, model_path):
        import mediapipe as mp
        from mediapipe.tasks.python import vision, BaseOptions
        self.mp = mp
        opts = vision.FaceLandmarkerOptions(base_options=BaseOptions(model_asset_path=model_path),
                                            output_facial_transformation_matrixes=True, num_faces=1)
        self.det = vision.FaceLandmarker.create_from_options(opts)

    def __call__(self, rgb):
        """(points in pixels n x 3, (yaw, pitch, roll)) or None when no face is found."""
        h, w = rgb.shape[:2]
        img = self.mp.Image(image_format=self.mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb))
        r = self.det.detect(img)
        if not r.face_landmarks: return None
        P = np.array([[q.x * w, q.y * h, q.z * w] for q in r.face_landmarks[0]])
        ang = pose(r.facial_transformation_matrixes[0]) if r.facial_transformation_matrixes else (0.0, 0.0, 0.0)
        return P, ang


def frontal(ang, yaw=8.0, pitch=10.0, roll=10.0):
    return abs(ang[0]) <= yaw and abs(ang[1]) <= pitch and abs(ang[2]) <= roll
