"""G13 stance continuity (docs/COMBAT_ANIMATION_STANDARD.md §1): the combat states the game blends between stand on the same
feet. numpy only; reads clip_qa.py's dumps (the clips as written) and their jsons.

    python3 -I tools/unity/motion/stance_continuity.py audit <dump dir>[,<dump dir>...] <json dir>[,<json dir>...] <out.json>
        [--mapping <mapping.json>]     (a proposed state -> clip table and routing: combat_v41_jobs.py mapping; default: STATES
                                        and PAIRS below, the game's as of combat v4)
        [--basis first|take]           (place every clip on one basis, whatever its json says: to show what an import does)

What the game does with a pair (Core CombatMotion, Game AnimatedUnitView): it crossfades from state A, at the key it leaves
(a one-shot's `cut`, any key of a loop), into state B at the key it enters (`from`, else B's first). Unity imports every combat
clip in place (CombatImportPostprocessor: Root Transform Position XZ and Rotation baked into the pose, based upon the centre of
mass and the body orientation) and Humanoid places each clip's pose against its own root, which is the clip's FIRST key's
centre of mass on the ground and its body orientation (Unity's: the mean of the lower and upper body's turn from the T-pose)
there. So a foot's place in the game is its place against that anchor, and the anchor is the clip's, not the take's: two
clips cut from one take still differ by what their first keys' centre of mass and orientation do (an aim's raised arms
carry the centre of mass forward). Measured here as the game measures it:
  - each clip's anchor: its first key's centre of mass on the ground (de Leva's segment masses) and its body yaw (the mean
    of the hips' and the shoulders' left-right lines);
  - each foot: its ankle on the ground, and its yaw (the ankle to the toe joint), in the anchor's frame;
  - scaled to the game's reference body (Fighter's 0.935 m hip height; Humanoid retargets every clip by its own size: the
    json's `hip`), so two actors of different sizes compare as on one body;
  - the pair passes when both feet stand within LIMIT_CM (1.5 cm) and turn within LIMIT_DEG (5°) between A's leaving key and
    B's entering key (below Fighter.Feet's re-plant, 2.5 cm: a planted foot then follows instead of stepping).
A loop left at any key is judged at its worst key against B's entering key; a clip whose root motion the game applies (APPLY)
stands at each key against that key's own centre of mass. Only one weapon class's chain ('same' pairs) is judged; a stance
change on purpose (into and out of a crouch, a guard to a standing surrender: verdict 'step') and states whose feet the fight
does not pin (hits, throws, slips: 'free') are reported with their offsets. Between different actors the figure is approximate
(Humanoid retargets each actor's own proportions); within one take it is exact.
"""
import json, math, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
LIMIT_CM, LIMIT_DEG = 1.5, 5.0
REF_HIP = 0.935     # Fighter.Feet's reference hip height (its thresholds are "m at a 0.935 m hip height")

# de Leva (1996) segment masses (share of the body) and centres (share of the way from the proximal joint), on the joints
# the dumps carry; the head's centre a third of the way from the head joint to the head's top
SEGMENTS = [   # (mass, proximal, distal, centre share)
    (0.1117, 'Hips', 'Spine', 0.5), (0.1633, 'Spine', 'UpperChest', 0.5), (0.1596, 'UpperChest', 'Neck', 0.5),
    (0.0694, 'Head', 'HeadTop', 0.33),
    (0.0271, 'LeftUpperArm', 'LeftLowerArm', 0.577), (0.0271, 'RightUpperArm', 'RightLowerArm', 0.577),
    (0.0162, 'LeftLowerArm', 'LeftHand', 0.457), (0.0162, 'RightLowerArm', 'RightHand', 0.457),
    (0.0061, 'LeftHand', 'LeftHand', 0.0), (0.0061, 'RightHand', 'RightHand', 0.0),
    (0.1416, 'LeftUpperLeg', 'LeftLowerLeg', 0.41), (0.1416, 'RightUpperLeg', 'RightLowerLeg', 0.41),
    (0.0433, 'LeftLowerLeg', 'LeftFoot', 0.44), (0.0433, 'RightLowerLeg', 'RightFoot', 0.44),
    (0.0137, 'LeftFoot', 'LeftToes', 0.44), (0.0137, 'RightFoot', 'RightToes', 0.44)]


def load(dump_dirs, name):
    sys.path.insert(0, HERE)
    import clip_qa as Q
    for d in dump_dirs:
        p = os.path.join(d, name + '.npz')
        if os.path.exists(p): return Q.load_dump(p)
    return None


def meta(json_dirs, name):
    for d in json_dirs:
        p = os.path.join(d, name + '.json')
        if os.path.exists(p): return json.load(open(p))
    return None


def com(m, k):
    """The centre of mass at key k (file axes: Y up)."""
    tot, acc = 0.0, np.zeros(3)
    for w, a, b, s in SEGMENTS:
        if a not in m.P: continue
        pa = m.P[a][k]; pb = m.P[b][k] if b in m.P else pa
        acc += w * (pa + (pb - pa) * s); tot += w
    return acc / tot


def body_yaw(m, k):
    """Unity's body orientation about up: the mean of the lower (hips) and upper (shoulders) body's left-right lines, turned
    to their forward (the T-pose's left is +X and it faces +Z in the dumps' axes)."""
    acc = np.zeros(3)
    for l_, r_ in (('LeftUpperLeg', 'RightUpperLeg'), ('LeftUpperArm', 'RightUpperArm')):
        v = m.P[l_][k] - m.P[r_][k]; v[1] = 0.0
        acc += v / max(1e-9, np.linalg.norm(v))
    # forward = left x up (left +X, forward +Z): (x, 0, z) x (0, 1, 0) = (-z, 0, x); its yaw from +Z
    return math.atan2(-acc[2], acc[0])


def anchor(m):
    """The clip's root as Unity bakes it: the first key's centre of mass on the ground and its body yaw."""
    c = com(m, 0)
    return np.array([c[0], 0.0, c[2]]), body_yaw(m, 0)


def to_anchor(p, anc):
    o, yaw = anc
    d = p - o
    c, s = math.cos(-yaw), math.sin(-yaw)
    return np.array([c * d[0] + s * d[2], d[1], -s * d[0] + c * d[2]])


def feet(m, k, anc, scale):
    """Each foot at key k in the anchor's frame, scaled to the reference body: its ankle on the ground (x, z, cm) and its yaw
    (deg; the ankle to the toe joint)."""
    out = {}
    for s in ('Left', 'Right'):
        a = to_anchor(m.P[s + 'Foot'][k], anc) * scale
        t = to_anchor(m.P[s + 'Toes'][k], anc) * scale
        out[s] = (np.array([a[0], a[2]]) * 100.0, math.degrees(math.atan2(t[0] - a[0], t[2] - a[2])))
    return out


def width(f):
    return float(np.linalg.norm(f['Left'][0] - f['Right'][0]))


# combat v4.6: the front of a clip written in its take's frame (root_basis take). Imported based upon Original, Unity keeps the
# file's own root turn: the converters' FBX (axis_forward -Z, from the file's axes) and Unity's import put the file's +Z at
# Unity's -Z, so a take frame whose front is the file's +Z played with the body turned 180° from the root's front (found in
# Unity, 2026-11-18: fighters with their backs to the target). The take frames are written with their front on the file's -Z
# (frames_from: the reference's yaw turned half a turn more), which lands on Unity's +Z; this is that frame's front, as
# body_yaw measures it (0 = the file's +Z).
TAKE_FRONT = math.pi


def unity_original(v):
    """A direction in the file's (dumps') axes as Unity holds it in a clip imported based upon Original (+Z the root's front)."""
    return np.array([v[0], v[1], -v[2]], float)


def from_take_front(p):
    """A point in a frame whose front is +Z (an anchor's) into the take frame's file axes (front -Z: TAKE_FRONT)."""
    c, s = math.cos(TAKE_FRONT), math.sin(TAKE_FRONT)
    return np.array([c * p[0] + s * p[2], p[1], -s * p[0] + c * p[2]])


def clip_feet(dumps, jsons, name, basis=None):
    """A clip as the game places it: `basis` 'first' (Unity's import as CombatImportPostprocessor sets it: the first key's
    centre of mass and body orientation) or 'take' (Root Transform Rotation and Position XZ based upon Original: the file's
    own frame, which combat v4.1 writes as the chain's shared frame); None: the json's `root_basis`, else 'first'."""
    m = load(dumps, name); j = meta(jsons, name)
    if m is None or j is None: return None
    if j.get('loop') and m.n > 2: m = m.slice(0, (m.n - 1) / m.fps)    # a loop's last key is its first again
    hip = float(j.get('hip') or REF_HIP)
    basis = basis or j.get('root_basis') or 'first'
    anc = (np.zeros(3), TAKE_FRONT) if basis == 'take' else anchor(m)
    return m, j, anc, REF_HIP / hip


def key_at(m, t):
    return int(round(min(1.0, max(0.0, t)) * (m.n - 1)))


# clips whose horizontal root motion the game applies (Core CombatMotion: RootXZ.Apply): the body's root travels with its
# centre of mass, so the pose at a key stands against that key's own centre of mass (its turn stays baked from the first key)
APPLY = set('''fist_cross_f_cmu fist_ready_accad melee_thrust_f_built crouch_down_accad crouch_down_f_accad crouch_to_run_accad
crouch_to_run_f_accad stagger_cmu stagger_fwd_cmu throw_overhand_m_cmu throw_overhand_cmu getup_back_cmu getup_front_cmu getup_side_cmu
getup_f_cmu getup_to_crouch_accad getup_to_crouch_f_accad cower_cmu crawl_accad crawl_b_accad crawl_back_accad crawl_f_accad
crouch_down_b_accad crouch_to_walk_accad crouch_to_walk_f_accad duck_accad duck_r_accad getup_e_f_cmu getup_ready_back_cmu getup_ready_cmu
guard_advance_accad guard_retreat_accad guard_side_l_accad guard_side_r_accad melee_overhead_f_built prone_down_accad prone_down_f_accad
run_to_crouch_accad run_to_crouch_f_accad sidestep_l_f_accad sidestep_quick_l_accad sidestep_quick_l_b_accad sidestep_quick_l_f_accad
sidestep_quick_r_accad sidestep_quick_r_b_accad sidestep_quick_r_f_accad sidestep_r_f_accad stagger_back_accad stagger_spin_f_cmu
surrender_raise_accad throw_overhand_b_f_cmu throw_overhand_m_b_cmu throw_overhand_u_b_cmu throw_overhand_u_cmu throw_underhand_u_cmu
turn_180_b_accad turn_180_f_accad turn_guard_l_accad turn_l90_accad turn_l90_b_accad turn_l90_f_accad turn_r90_accad turn_r90_f_accad
walk_to_crouch_b_accad walk_to_crouch_f_accad'''.split())


def at_key(C, k):
    """The anchor a clip's pose stands against at key k: its first key's (baked), or for a clip whose root motion the game
    applies, key k's own centre of mass (the turn still the first key's)."""
    m, j, anc, sc = C
    if (j.get('name') in APPLY or j.get('root_apply')) and j.get('root_basis') != 'take':
        c = com(m, k); return (np.array([c[0], 0.0, c[2]]), anc[1])
    return anc


def compare(A, tA, B, tB):
    """A left at normalized tA (None: a loop left at any key: its worst), B entered at tB. Returns the offsets."""
    mA, jA, aA, sA = A; mB, jB, aB, sB = B
    kb = key_at(mB, tB)
    fB = feet(mB, kb, at_key(B, kb), sB)
    keys = range(mA.n) if tA is None else [key_at(mA, tA)]
    worst = None
    for k in keys:
        fA = feet(mA, k, at_key(A, k), sA)
        d = {s: float(np.linalg.norm(fA[s][0] - fB[s][0])) for s in fA}
        y = {s: abs((fA[s][1] - fB[s][1] + 180.0) % 360.0 - 180.0) for s in fA}
        row = dict(key_a=k, key_b=key_at(mB, tB), left_cm=round(d['Left'], 2), right_cm=round(d['Right'], 2),
                   left_yaw_deg=round(y['Left'], 1), right_yaw_deg=round(y['Right'], 1),
                   width_a_cm=round(width(fA), 1), width_b_cm=round(width(fB), 1))
        score = max(d.values()) + max(y.values()) / 10.0
        if worst is None or score > worst[0]: worst = (score, row)
    r = worst[1]
    r['pass'] = max(r['left_cm'], r['right_cm']) <= LIMIT_CM and max(r['left_yaw_deg'], r['right_yaw_deg']) <= LIMIT_DEG
    return r


# ---------------------------------------------------------------------------------------------------------------------------
# the game's states (Core CombatMotion.States as of combat v4: state -> men's clip, women's clip, from, cut, loop) and the
# pairs it blends (Game AnimatedUnitView: what follows what)
STATES = {
    'unarmed_idle': ('fist_guard_accad', 'guard_f_cmu', 0.0, 1.0, True),
    'pistol_idle': ('pistol_ready_built', 'pistol_ready_f_built', 0.0, 1.0, True),
    'rifle_idle': ('rifle_ready_built', 'rifle_ready_f_built', 0.0, 1.0, True),
    'melee_idle': ('fist_guard_accad', 'guard_f_cmu', 0.0, 1.0, True),
    'club2_idle': ('club_ready_built', 'club_ready_f_built', 0.0, 1.0, True),
    'rifle_raise': ('rifle_raise_cmu', 'rifle_raise_cmu', 0.42, 0.95, False),
    'rifle_aim': ('rifle_aim_b_cmu', 'rifle_aim_b_cmu', 0.0, 1.0, True),
    'rifle_lower': ('rifle_ready_built', 'rifle_ready_f_built', 0.0, 0.15, False),
    'rifle_reload': ('reload_rifle_built', 'reload_rifle_f_built', 0.0, 0.95, False),
    'pistol_aim': ('pistol_aim_built', 'pistol_aim_c_built', 0.0, 1.0, True),
    'pistol_reload': ('reload_pistol_built', 'reload_pistol_f_built', 0.0, 0.95, False),
    'unarmed_jab': ('fist_jab_accad', 'fist_jab_f_cmu', 0.0, 0.9, False),
    'unarmed_cross': ('fist_cross_accad', 'fist_cross_f_cmu', 0.0, 0.9, False),
    'unarmed_hook_l': ('fist_hook_l_accad', None, 0.0, 0.9, False),
    'unarmed_hook_r': ('fist_hook_r_accad', None, 0.0, 0.9, False),
    'unarmed_uppercut_l': ('fist_uppercut_l_accad', None, 0.0, 0.9, False),
    'unarmed_uppercut_r': ('fist_uppercut_r_accad', None, 0.0, 0.9, False),
    'unarmed_combo': (None, 'fist_combo_f_cmu', 0.0, 0.92, False),
    'unarmed_block': ('block_mid_r_accad', None, 0.0, 0.9, False),
    'unarmed_relax': ('fist_relax_accad', None, 0.0, 0.8, False),
    'melee_strike': ('melee_thrust_built', 'melee_thrust_f_built', 0.0, 0.92, False),
    'melee_slash': ('melee_forehand_built', 'melee_forehand_f_built', 0.0, 0.9, False),
    'melee_block': ('block_mid_r_accad', None, 0.0, 0.9, False),
    'club2_strike': ('club_overhead_cmu', 'club_thrust_f_built', 0.0, 0.9, False),
    'throw': ('throw_overhand_m_cmu', 'throw_overhand_cmu', 0.0, 0.9, False),
    'cover_down': ('crouch_down_accad', 'crouch_down_f_accad', 0.0, 0.92, False),
    'cover_hold': ('ready_crouch_cmu', 'ready_crouch_cmu', 0.0, 1.0, True),
    'cover_hold_long': ('crouch_rifle_built', 'crouch_rifle_f_built', 0.0, 1.0, True),
    'cover_leave': ('crouch_to_run_accad', 'crouch_to_run_f_accad', 0.0, 0.3, False),
    'hit_front': ('hit_front_torso_built', 'hit_front_torso_f_built', 0.0, 0.9, False),
    'hit_head': ('hit_front_head_built', 'hit_front_head_f_built', 0.0, 0.9, False),
    'miss_left': ('dodge_l_accad', None, 0.0, 0.85, False),
    'miss_right': ('dodge_r_accad', None, 0.0, 0.85, False),
    'miss_duck': ('duck_cmu', 'duck_cmu', 0.0, 0.3, False),
    'yield_enter': ('surrender_enter_built', 'surrender_enter_f_built', 0.0, 0.95, False),
    'yield_hold': ('surrender_hold_built', 'surrender_hold_f_built', 0.0, 1.0, True),
}

# (from, to, kind, where in the game): kind 'same' = G13 holds them to one stance (the chain's states); 'change' = a stance
# change on purpose (into and out of a crouch): G13 asks for a captured step clip, so it is judged on that clip's own ends
# (its standing end against the standing state); 'free' = a state whose feet the fight does not pin (a hit thrown about, a
# throw's stride, a slip's step: Fighter.Pins), reported only
PAIRS = [
    # the long gun standing
    ('rifle_idle', 'rifle_raise', 'same', 'OnAim: to the shoulder'),
    ('rifle_raise', 'rifle_aim', 'same', 'OnAim: the raise into the hold'),
    ('rifle_idle', 'rifle_aim', 'same', 'OnHold (overwatch): the hold straight from the ready'),
    ('rifle_aim', 'rifle_lower', 'same', 'Lower: a lapsed aim comes down'),
    ('rifle_lower', 'rifle_idle', 'same', 'the lower into the ready'),
    ('rifle_idle', 'rifle_reload', 'same', 'OnReload from the ready'),
    ('rifle_aim', 'rifle_reload', 'same', 'OnReload from the hold'),
    ('rifle_reload', 'rifle_idle', 'same', 'the reload back to the ready'),
    ('rifle_idle', 'yield_enter', 'same', 'OnYield'),
    ('rifle_aim', 'yield_enter', 'same', 'OnYield from the hold'),
    ('yield_enter', 'yield_hold', 'same', 'hands up into the hold'),
    ('rifle_idle', 'cover_down', 'change', 'OnStance crouch (cover entry)'),
    ('rifle_aim', 'cover_down', 'change', 'OnStance crouch from the hold'),
    ('cover_down', 'cover_hold_long', 'same', 'down into the crouched hold'),
    ('cover_hold_long', 'rifle_aim', 'change', 'OnAim from a crouch (cover exit to fire)'),
    ('cover_hold_long', 'rifle_idle', 'change', 'OnStance stand (cover exit)'),
    ('cover_hold_long', 'cover_leave', 'change', 'OnMove out of cover'),
    ('rifle_idle', 'hit_front', 'free', 'OnHit crit'), ('hit_front', 'rifle_idle', 'free', 'the hit back to the ready'),
    ('rifle_idle', 'throw', 'free', 'OnThrow'), ('throw', 'rifle_idle', 'free', 'the throw back to the ready'),
    # the pistol
    ('pistol_idle', 'pistol_aim', 'same', 'OnAim / OnHold'),
    ('pistol_aim', 'pistol_idle', 'same', 'Lower'),
    ('pistol_idle', 'pistol_reload', 'same', 'OnReload from the ready'),
    ('pistol_aim', 'pistol_reload', 'same', 'OnReload from the aim'),
    ('pistol_reload', 'pistol_idle', 'same', 'the reload back to the ready'),
    ('pistol_idle', 'yield_enter', 'same', 'OnYield'),
    ('pistol_idle', 'cover_down', 'change', 'OnStance crouch'),
    ('cover_down', 'cover_hold', 'same', 'down into the wary crouch'),
    ('cover_hold', 'pistol_aim', 'change', 'OnAim from a crouch'),
    ('cover_hold', 'pistol_idle', 'change', 'OnStance stand'),
    # fists and one-handed weapons: the guard, the blows and their recoveries, the block, the slip
    ('unarmed_idle', 'unarmed_jab', 'same', 'OnStrike'), ('unarmed_jab', 'unarmed_idle', 'same', 'the blow\'s recovery'),
    ('unarmed_idle', 'unarmed_cross', 'same', 'OnStrike'), ('unarmed_cross', 'unarmed_idle', 'same', 'the blow\'s recovery'),
    ('unarmed_idle', 'unarmed_hook_l', 'same', 'OnStrike'), ('unarmed_hook_l', 'unarmed_idle', 'same', 'the blow\'s recovery'),
    ('unarmed_idle', 'unarmed_hook_r', 'same', 'OnStrike'), ('unarmed_hook_r', 'unarmed_idle', 'same', 'the blow\'s recovery'),
    ('unarmed_idle', 'unarmed_uppercut_l', 'same', 'OnStrike'), ('unarmed_uppercut_l', 'unarmed_idle', 'same', 'the blow\'s recovery'),
    ('unarmed_idle', 'unarmed_uppercut_r', 'same', 'OnStrike'), ('unarmed_uppercut_r', 'unarmed_idle', 'same', 'the blow\'s recovery'),
    ('unarmed_idle', 'unarmed_combo', 'same', 'OnStrike'), ('unarmed_combo', 'unarmed_idle', 'same', 'the blow\'s recovery'),
    ('unarmed_idle', 'unarmed_block', 'same', 'OnMiss: a block'), ('unarmed_block', 'unarmed_idle', 'same', 'the block\'s recovery'),
    ('unarmed_idle', 'unarmed_relax', 'change', 'the end: out of the guard, the feet stepping to a standing stance'),
    ('melee_idle', 'melee_slash', 'same', 'OnStrike'), ('melee_slash', 'melee_idle', 'same', 'the blow\'s recovery'),
    ('melee_idle', 'melee_strike', 'same', 'OnStrike'), ('melee_strike', 'melee_idle', 'same', 'the blow\'s recovery'),
    ('melee_idle', 'melee_block', 'same', 'OnMiss: a block'), ('melee_block', 'melee_idle', 'same', 'the block\'s recovery'),
    ('club2_idle', 'club2_strike', 'same', 'OnStrike'), ('club2_strike', 'club2_idle', 'same', 'the blow\'s recovery'),
    ('unarmed_idle', 'miss_left', 'free', 'OnMiss: a slip'), ('miss_left', 'unarmed_idle', 'free', 'the slip back'),
    ('unarmed_idle', 'miss_duck', 'free', 'OnMiss: a duck'), ('miss_duck', 'unarmed_idle', 'free', 'the duck back'),
    ('unarmed_idle', 'cover_down', 'change', 'OnStance crouch'), ('cover_hold', 'unarmed_idle', 'change', 'OnStance stand'),
    # hands up from the other classes (OnYield: the weapon dropped, then the hands up on the sex's stand); from a fighting
    # guard it is a stance change (the guard's feet to a standing stance)
    ('club2_idle', 'yield_enter', 'same', 'OnYield with a two-handed club'),
    ('unarmed_idle', 'yield_enter', 'change', 'OnYield from the guard'), ('melee_idle', 'yield_enter', 'change', 'OnYield from the guard'),
]


def actor(j):
    """The take a clip's stance comes from (its capture, or the capture a built clip stands on)."""
    return j.get('src', '?') + (f" {j['range'][0]:g}-{j['range'][1]:g}s" if j.get('range') else '')


def with_mapping(mp):
    """The states and pairs with a proposed mapping applied ({'states': {state: [men's, women's, from, cut, loop]},
    'routed': {'remove': [[a, b]], 'add': [[a, b, kind, where]]}}: combat_v41_jobs.MAPPING, ROUTED)."""
    states = dict(STATES); states.update({k: tuple(v) for k, v in (mp.get('states') or {}).items()})
    rm = {tuple(x) for x in (mp.get('routed') or {}).get('remove', [])}
    rms = {tuple(x) for x in (mp.get('routed') or {}).get('remove_sex', [])}     # (a, b, sex): a pair no longer played for one sex
    pairs = [p for p in PAIRS if (p[0], p[1]) not in rm] + [tuple(x) for x in (mp.get('routed') or {}).get('add', [])]
    out = []
    for p in pairs:
        gone = {x[2] for x in rms if (x[0], x[1]) == (p[0], p[1])}
        if len(p) > 4:
            if p[4] not in gone: out.append(p)
            continue
        if not gone: out.append(p); continue
        for sx in ('m', 'f'):
            if sx not in gone: out.append(tuple(p[:4]) + (sx,))
    return states, out


def audit(dumps, jsons, states=None, pairs=None, basis=None):
    """Every pair, per sex: the clips, their takes, the feet's offsets as the game places each clip (its json's
    `root_basis`, else Unity's first-key anchoring; `basis` forces one for every clip), and the verdict."""
    states = states or STATES; pairs = pairs or PAIRS
    rows = []
    for pr in pairs:
        a, b, kind, where = pr[:4]
        for sex in ('m', 'f'):
            if len(pr) > 4 and pr[4] != sex: continue     # a pair the game plays for one sex only
            sa, sb = states.get(a), states.get(b)
            if not sa or not sb: continue
            # a state with no clip for a sex is not played for it (CombatMotion's `only`; every state both sexes play names
            # its clip for each)
            ca = sa[1] if sex == 'f' else sa[0]; cb = sb[1] if sex == 'f' else sb[0]
            if ca is None or cb is None: continue
            A = clip_feet(dumps, jsons, ca, basis); B = clip_feet(dumps, jsons, cb, basis)
            if A is None or B is None:
                rows.append(dict(pair=f'{a} -> {b}', sex=sex, clips=[ca, cb], kind=kind, where=where, missing=True)); continue
            tA = None if sa[4] else sa[3]
            r = compare(A, tA, B, sb[2])
            r.update(pair=f'{a} -> {b}', sex=sex, clips=[ca, cb], takes=[actor(A[1]), actor(B[1])], kind=kind, where=where,
                     basis=[basis or A[1].get('root_basis') or 'first', basis or B[1].get('root_basis') or 'first'],
                     one_take=(A[1].get('src') == B[1].get('src')))
            r['verdict'] = ('pass' if r['pass'] else 'FAIL') if kind == 'same' else ('step' if kind == 'change' else 'free')
            rows.append(r)
    return rows


def table(rows):
    out = []
    for r in rows:
        if r.get('missing'): out.append(f"{r['pair']:34s} {r['sex']}  missing {r['clips']}"); continue
        out.append(f"{r['pair']:34s} {r['sex']}  {r['verdict']:5s} L {r['left_cm']:5.1f} R {r['right_cm']:5.1f} cm  yaw {r['left_yaw_deg']:4.1f}/{r['right_yaw_deg']:4.1f}  "
                   f"{r['clips'][0]} ({r['takes'][0]}) -> {r['clips'][1]} ({r['takes'][1]})")
    return '\n'.join(out)


# ---------------------------------------------------------------------------------------------------------------------------
# combat v4.3: the re-stance step between two states whose stances differ (G13: "or have a captured step clip between them")
WARP_SCALE, WARP_TURN = 0.20, 15.0      # the runtime warps a step's foot offsets by at most +/-20 % and its turn by +/-15°


def step_library(dumps, jsons):
    """Every re-stance step clip (json `restance` or gate 'step'): each foot's offset (cm at the reference body, the step's
    own start frame: x left, z forward) and turn (deg) from its first key to its last; its set (m, f, both)."""
    lib = []
    names = set()
    for d in jsons:
        for f in sorted(os.listdir(d)):
            if not f.endswith('.json') or f in ('MANIFEST.json',): continue
            try: j = json.load(open(os.path.join(d, f)))
            except Exception: continue
            if not isinstance(j, dict) or j.get('gate') != 'step' or j.get('name') in names: continue
            C = clip_feet(dumps, jsons, j['name'])
            if C is None: continue
            m, j, anc, sc = C
            if j.get('loop'): continue
            a, b = feet(m, 0, anc, sc), feet(m, m.n - 1, anc, sc)
            names.add(j['name'])
            lib.append(dict(name=j['name'], set=j.get('set', 'both'), kind=j.get('kind'), seconds=round((m.n - 1) / m.fps, 3), arms=j.get('step_arms', 'quiet'),
                            d={s: [float(b[s][0][0] - a[s][0][0]), float(b[s][0][1] - a[s][0][1]),
                                   float((b[s][1] - a[s][1] + 180.0) % 360.0 - 180.0)] for s in ('Left', 'Right')}))
    return lib


def _rot(v, deg):
    """A foot offset (x left, z forward) turned by `deg` the way a foot's yaw turns (atan2(x, z) grows by deg)."""
    t = np.radians(deg); c, s = np.cos(t), np.sin(t)
    return np.stack([v[..., 0] * c + v[..., 1] * s, v[..., 1] * c - v[..., 0] * s], axis=-1)


def _warped(lib):
    """Every library step at every warp on the grid: (entries, 2 feet, x z yaw), and what each entry is."""
    S = np.linspace(1.0 - WARP_SCALE, 1.0 + WARP_SCALE, 9); T = np.arange(-WARP_TURN, WARP_TURN + 0.01, 2.5)
    W, meta = [], []
    for i, e in enumerate(lib):
        D = np.array([e['d']['Left'], e['d']['Right']])
        for s in S:
            for t in T:
                p = _rot(D[:, :2] * s, t); W.append(np.concatenate([p, (D[:, 2:] + t)], axis=1)); meta.append((i, float(s), float(t)))
    return np.array(W), meta


def fit_step(req, lib, sex, chain=True):
    """The nearest step (or two) for a required re-stance `req` ((2 feet, x z yaw): B's start against A's end, cm, deg), from
    the steps a sex may play (its own and of unrecorded sex), warped within the limits. Returns (cost, plan): cost <= 1 passes
    G13 (both ankles within LIMIT_CM, both feet within LIMIT_DEG of B's start once the step has played)."""
    use = [i for i, e in enumerate(lib) if e['set'] in ('both', sex)]
    if not use: return None
    sub = [lib[i] for i in use]
    W, meta = _warped(sub)
    def cost(R):          # R: (..., 2, 3) residual
        return np.maximum(np.linalg.norm(R[..., :2], axis=-1).max(-1) / LIMIT_CM, np.abs(R[..., 2]).max(-1) / LIMIT_DEG)
    c1 = cost(req[None] - W); i1 = int(np.argmin(c1))
    best = (float(c1[i1]), [(sub[meta[i1][0]]['name'], meta[i1][1], meta[i1][2])])
    if chain and best[0] > 1.0:
        # two steps: the second in the frame the first leaves the body in (turned by the first's mean turn)
        turn1 = W[:, :, 2].mean(1)
        for lo in range(0, len(W), 400):
            Wa = W[lo:lo + 400]
            rem = req[None] - Wa                                        # (a, 2, 3)
            rp = _rot(rem[:, :, :2], -turn1[lo:lo + 400][:, None])       # into the second step's frame
            R = np.concatenate([rp, rem[:, :, 2:]], axis=2)[:, None] - W[None]   # (a, b, 2, 3)
            c = cost(R); k = np.unravel_index(int(np.argmin(c)), c.shape)
            if c[k] < best[0]:
                ia, ib = lo + k[0], k[1]
                best = (float(c[k]), [(sub[meta[ia][0]]['name'], meta[ia][1], meta[ia][2]), (sub[meta[ib][0]]['name'], meta[ib][1], meta[ib][2])])
    return best


def _foot_warps(c, n=9, m=13):
    """Every landing a foot of a step can be warped to (the runtime's warp, per foot): its captured offset `c` (x z yaw)
    scaled within +/-WARP_SCALE and turned within +/-WARP_TURN about its start, its own turn within +/-WARP_TURN; a foot the
    step leaves still (under 3 cm) is not moved. `n`, `m`: the grid's scales and turns. Returns (k, 3)."""
    S = np.linspace(1.0 - WARP_SCALE, 1.0 + WARP_SCALE, n); T = np.linspace(-WARP_TURN, WARP_TURN, m)
    moving = math.hypot(c[0], c[1]) >= 3.0
    out = []
    for s_ in (S if moving else [1.0]):
        for t in (T if moving else [0.0]):
            p = _rot(np.array([c[0] * s_, c[1] * s_]), t)
            for tt in T: out.append([float(p[0]), float(p[1]), c[2] + tt])
    return np.array(out)


def fit_step_feet(req, lib, sex, chain=True, arms=('quiet',)):
    """As fit_step, each foot's landing warped on its own (the runtime warps the stepping foot onto its target, as leading
    games do: within +/-WARP_SCALE of its captured length and +/-WARP_TURN of its captured direction and turn). Returns
    (cost, plan) with the worse foot's residual against G13. `arms`: the steps' hand sets the transition admits (v4.4: a
    step that lowers the guard only out of a guard, one that raises it only into one)."""
    use = [e for e in lib if e['set'] in ('both', sex) and e.get('arms', 'quiet') in arms]
    if not use: return None
    def fcost(R): return np.maximum(np.linalg.norm(R[..., :2], axis=-1) / LIMIT_CM, np.abs(R[..., 2]) / LIMIT_DEG)
    best = (1e9, None)
    for e in use:
        c = max(float(fcost(req[k] - _foot_warps(e['d'][side])).min()) for k, side in enumerate(('Left', 'Right')))
        if c < best[0]: best = (c, [(e['name'], 'per foot', 0.0)])
    if chain and best[0] > 1.0:
        # two steps: their landings add, the second's offsets in the frame the first leaves (turned by its mean turn); a coarser
        # grid of warps (5 scales, 5 turns each way)
        F = {side: [_foot_warps(e['d'][side], 5, 5) for e in use] for side in ('Left', 'Right')}
        for i, e1 in enumerate(use):
            t1 = float(np.mean([e1['d']['Left'][2], e1['d']['Right'][2]]))
            cs = np.zeros(len(use))
            for k, side in enumerate(('Left', 'Right')):
                A_ = F[side][i]
                for j in range(len(use)):
                    if cs[j] >= best[0]: continue
                    B_ = F[side][j]; Bp = np.concatenate([_rot(B_[:, :2], t1), B_[:, 2:]], axis=1)
                    R = req[k][None, None] - (A_[:, None] + Bp[None])
                    cs[j] = max(cs[j], float(fcost(R).min()))
            j = int(np.argmin(cs))
            if cs[j] < best[0]: best = (float(cs[j]), [(e1['name'], 'per foot', 0.0), (use[j]['name'], 'per foot', 0.0)])
    return best


def pair_feet(A, tA, B, tB):
    """A's feet at the key it is left (a loop: the key the audit found worst) and B's at the key it is entered, as the game
    places each clip; with the hips' height there (m, reference body), to tell a standing stance from a crouch."""
    mA, jA, aA, sA = A; mB, jB, aB, sB = B
    kb = key_at(mB, tB); fB = feet(mB, kb, at_key(B, kb), sB)
    r = compare(A, tA, B, tB); ka = r['key_a']; fA = feet(mA, ka, at_key(A, ka), sA)
    hA = float(mA.P['Hips'][ka][1] * sA); hB = float(mB.P['Hips'][kb][1] * sB)
    return fA, fB, hA, hB, r


GUARDS = {'unarmed_idle', 'melee_idle'}     # the fighting guards (a step that lowers or raises the hands plays only out of or into one)


def steps_audit(dumps, jsons, lib, states, pairs, only=None, standing=0.70):
    """The pairs that fail G13 (or `only` those), each with the step the runtime would insert: the required re-stance, the
    nearest single step or chain of two within the warp limits, and the verdict (pass, fail, or n/a: a crouched stance at
    either end, which a standing step cannot bridge)."""
    rows = audit(dumps, jsons, states, pairs)
    out = []
    for r in rows:
        if r.get('missing') or r['pass']: continue
        if only and r['pair'] not in only: continue
        a, b = r['pair'].split(' -> ')
        sa, sb = states[a], states[b]
        A = clip_feet(dumps, jsons, r['clips'][0]); B = clip_feet(dumps, jsons, r['clips'][1])
        fA, fB, hA, hB, _ = pair_feet(A, None if sa[4] else sa[3], B, sb[2])
        req = np.array([[fB[s][0][0] - fA[s][0][0], fB[s][0][1] - fA[s][0][1], (fB[s][1] - fA[s][1] + 180.0) % 360.0 - 180.0] for s in ('Left', 'Right')])
        e = dict(pair=r['pair'], sex=r['sex'], kind=r['kind'], takes=r['takes'], before=[max(r['left_cm'], r['right_cm']), max(r['left_yaw_deg'], r['right_yaw_deg'])],
                 required={'Left': [round(float(x), 1) for x in req[0]], 'Right': [round(float(x), 1) for x in req[1]]}, hips_m=[round(hA, 2), round(hB, 2)])
        if min(hA, hB) < standing:
            e.update(verdict='n/a', why=f"a crouched stance at the {'start' if hA < standing else 'end'} (hips {min(hA, hB):.2f} m): no standing step bridges it")
        else:
            arms = ('quiet',) + (('lower',) if a in GUARDS else ()) + (('raise',) if b in GUARDS else ())
            f = fit_step(req, [e for e in lib if e.get('arms', 'quiet') in arms], r['sex']); g = fit_step_feet(req, lib, r['sex'], arms=arms)
            if f is None: e.update(verdict='fail', why='no step for this sex')
            else:
                c, plan = f
                e.update(strict={'verdict': 'pass' if c <= 1.0 else 'fail', 'cost': round(c, 2),
                                 'steps': [{'clip': n, 'scale': round(s_, 2), 'turn_deg': t} for n, s_, t in plan]})
                c, plan = g
                e.update(verdict='pass' if c <= 1.0 else 'fail', cost=round(c, 2), steps=[{'clip': n, 'warp': w} for n, w, _ in plan])
        out.append(e)
    return out


def _main_steps(a):
    dumps, jsons, out = a[1].split(','), a[2].split(','), a[3]
    states, pairs = with_mapping(json.load(open(a[a.index('--mapping') + 1]))) if '--mapping' in a else (STATES, PAIRS)
    lib = step_library(dumps, jsons)
    rows = steps_audit(dumps, jsons, lib, states, pairs)
    json.dump({'library': lib, 'pairs': rows}, open(out, 'w'), indent=1)
    for r in rows:
        print(f"{r['pair']:34s} {r['sex']} {r['kind']:6s} before {r['before'][0]:5.1f} cm {r['before'][1]:5.1f}° -> {r['verdict']:4s} "
              + (f"cost {r['cost']:.2f} (uniform warp {r['strict']['verdict']} {r['strict']['cost']:.2f}) " + ' + '.join(x['clip'] for x in r['steps']) if 'steps' in r else r.get('why', '')))
    print(f"\nwith a step (each foot warped): {sum(r['verdict'] == 'pass' for r in rows)} of {len(rows)} failing pairs pass; "
          f"(one warp for the whole step: {sum(r.get('strict', {}).get('verdict') == 'pass' for r in rows)}); "
          f"{sum(r['verdict'] == 'n/a' for r in rows)} n/a (crouched); library {len(lib)} steps")


if __name__ == '__main__':
    a = sys.argv[1:]
    if a and a[0] == 'steps':
        _main_steps(a); sys.exit(0)
    if a and a[0] == 'audit':
        dumps, jsons, out = a[1].split(','), a[2].split(','), a[3]
        states, pairs = None, None
        if '--mapping' in a:
            states, pairs = with_mapping(json.load(open(a[a.index('--mapping') + 1])))
        basis = a[a.index('--basis') + 1] if '--basis' in a else None
        rows = audit(dumps, jsons, states, pairs, basis)
        json.dump(rows, open(out, 'w'), indent=1)
        print(table(rows))
        same = [r for r in rows if r.get('kind') == 'same' and not r.get('missing')]
        print(f"\nG13: {sum(r['pass'] for r in same)} of {len(same)} 'same' pairs pass (feet within {LIMIT_CM} cm, yaw within {LIMIT_DEG}°)")
