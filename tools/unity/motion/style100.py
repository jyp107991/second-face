"""100STYLE (Ian Mason; CC BY 4.0: "The 100STYLE Dataset - Ian Mason") BVH takes read for the motion tools: as a skel.Motion
(numpy, the gate's joint names, for clip_qa.py and the calibration) and as rows for the Blender converters (combat_v4.py).

The takes are Xsens captures at 60 fps, one actor (182 cm, sex not recorded), unedited, with a T-pose at both ends. The BVH
rest pose is a world-aligned T-pose (Y up, facing +Z, the actor's left +X; arms along X, palms down), as CMU's ASF and ACCAD
Female1's are, so the joint rotations carry over unchanged. Its spine has four joints (Chest, Chest2, Chest3, Chest4): for
Unity's Humanoid, Chest is the Spine, Chest2 the Chest, Chest4 the UpperChest (the shoulders and the neck hang from it), and
Chest3 an in-between bone held at its rest under convention D (cmu2fbx.straighten_inbetweens: its turn goes to the Chest,
aimed at the captured UpperChest joint, which keeps its world turn). The wrists are the hands (no twist bone, no fingers).

    m = load(path)            # skel.Motion: P[joint] (N,3) m, R[joint] (N,3,3), fps
"""
import os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'qa', 'calibration'))
import skel

LICENCE = 'The 100STYLE Dataset - Ian Mason, CC BY 4.0 (https://www.ianxmason.com/100style/)'
UNIT = 0.01        # centimetres
FPS = 60.0         # Xsens; the files' own frame time (0.016667 s)
# the BVH's names -> Mecanim names (the converters' FBX); Chest3 is kept under its own name as an in-between bone
MECANIM = {'Hips': 'Hips', 'Chest': 'Spine', 'Chest2': 'Chest', 'Chest3': 'Chest3', 'Chest4': 'UpperChest', 'Neck': 'Neck', 'Head': 'Head',
           'LeftCollar': 'LeftShoulder', 'LeftShoulder': 'LeftUpperArm', 'LeftElbow': 'LeftLowerArm', 'LeftWrist': 'LeftHand',
           'RightCollar': 'RightShoulder', 'RightShoulder': 'RightUpperArm', 'RightElbow': 'RightLowerArm', 'RightWrist': 'RightHand',
           'LeftHip': 'LeftUpperLeg', 'LeftKnee': 'LeftLowerLeg', 'LeftAnkle': 'LeftFoot', 'LeftToe': 'LeftToes',
           'RightHip': 'RightUpperLeg', 'RightKnee': 'RightLowerLeg', 'RightAnkle': 'RightFoot', 'RightToe': 'RightToes'}
# the BVH's names -> the gate's (skel.Motion: as ACCAD's in skel.BVH_MAP, the upper chest is 'Chest')
GATE = {'Hips': 'Hips', 'Chest': 'Spine0', 'Chest2': 'Spine', 'Chest4': 'Chest', 'Neck': 'Neck', 'Head': 'Head',
        'LeftCollar': 'LeftShoulder', 'LeftShoulder': 'LeftUpperArm', 'LeftElbow': 'LeftLowerArm', 'LeftWrist': 'LeftHand',
        'RightCollar': 'RightShoulder', 'RightShoulder': 'RightUpperArm', 'RightElbow': 'RightLowerArm', 'RightWrist': 'RightHand',
        'LeftHip': 'LeftUpperLeg', 'LeftKnee': 'LeftLowerLeg', 'LeftAnkle': 'LeftFoot', 'LeftToe': 'LeftToes',
        'RightHip': 'RightUpperLeg', 'RightKnee': 'RightLowerLeg', 'RightAnkle': 'RightFoot', 'RightToe': 'RightToes'}


def load(path, meta=None):
    """A 100STYLE take on its actor's skeleton (metres, Y up, the rest facing +Z) at its own 60 fps."""
    joints, order, data, dt = skel.parse_bvh(open(path).read())
    n = len(data); col = 0
    worldR, pos = {}, {}
    for j in order:
        J = joints[j]; ch = J['channels']
        vals = {c: data[:, col + k] for k, c in enumerate(ch)}; col += len(ch)
        R = np.tile(np.eye(3), (n, 1, 1))
        for c in ch:   # intrinsic in the listed order
            if c.endswith('rotation'): R = R @ skel._batch(c[0].lower(), np.radians(vals[c]))
        if J['parent'] is None:
            worldR[j] = R
            pos[j] = np.stack([vals.get('Xposition', np.zeros(n)), vals.get('Yposition', np.zeros(n)), vals.get('Zposition', np.zeros(n))], 1) * UNIT
        else:
            pr = worldR[J['parent']]
            worldR[j] = pr @ R
            pos[j] = pos[J['parent']] + pr @ (J['offset'] * UNIT)
        if J['end'] is not None: pos[j + '_End'] = pos[j] + worldR[j] @ (J['end'] * UNIT)
    P = {GATE[k]: v for k, v in pos.items() if k in GATE}
    P['LeftToeTip'], P['RightToeTip'], P['HeadTop'] = pos['LeftToe_End'], pos['RightToe_End'], pos['Head_End']
    R = {GATE[k]: v for k, v in worldR.items() if k in GATE and GATE[k] in ('Hips', 'Chest', 'Head', 'LeftFoot', 'RightFoot', 'LeftHand', 'RightHand')}
    m = dict(meta or {}); m['format'] = '100style bvh'; m['file_fps'] = round(1.0 / dt, 3)
    L = lambda a: float(np.linalg.norm(joints[a]['offset'])) * UNIT
    m['bone_m'] = {'lhumerus': round(L('LeftElbow'), 4), 'lradius': round(L('LeftWrist'), 4), 'lfemur': round(L('LeftKnee'), 4), 'ltibia': round(L('LeftAnkle'), 4)}
    leg = sum(abs(joints[x]['offset'][1]) for x in ('LeftHip', 'LeftKnee', 'LeftAnkle'))
    trunk = sum(abs(joints[x]['offset'][1]) for x in ('Chest', 'Chest2', 'Chest3', 'Chest4', 'Neck', 'Head'))
    m['rest_head_over_ankle'] = round((leg + trunk) * UNIT, 4)
    return skel._finish(skel.Motion(P, R, 1.0 / dt, m))
