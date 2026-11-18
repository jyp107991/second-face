"""Combat set v4.1 (docs/COMBAT_ANIMATION_STANDARD.md G13, stance continuity): the chains the game blends re-staged so their
states stand on one take's captured stance, in that take's shared frame. A delta over v4: only the clips it changes or adds.
numpy only (no bpy).

    python3 -I tools/unity/motion/combat_v41_jobs.py plan <plan.json> [<frames.json>]   # without frames: pass 1, the take's raw frame
    python3 -I tools/unity/motion/combat_v41_jobs.py frames <pass-1 dump dir> <pass-1 json dir> <frames.json>
    python3 -I tools/unity/motion/combat_v41_jobs.py mapping <mapping.json>             # the states' clips v4.1 proposes

The chains (one take each; `chain`):
  long_u   the long gun on CMU 79_96 ("shooting a gun", sex not recorded: u, played on both sexes): its captured raise, aim
           and lower (one take, the actor standing on the same feet throughout, ankles within 1 cm), the ready and the
           reloads built on the same take's rest before the raise (as v4 built the ready on a stand). No woman's capture
           holds a long gun: women play this u chain, as v4's aim already did on them; it is not a woman's take.
  club_u   the men's two-handed club on CMU 79_01 (the long gun's actor, same session and marks; u): its captured chop, and a
           ready and a hands-up hold built on the still rest the chop comes back to. It shares long_u's frame.
  stand_m  ACCAD Male2_A1_Stand (a man): the pistol's ready, aim (new: the isosceles aim on his own stance, where v4's stood on
           CMU 80_03's long-gun hold), reloads and the hands up, all on the same frames.
  stand_f  ACCAD Female1_A01_Stand (a woman): the same set on her stance (v4's women's pistol aim already stood on it).
Each chain's frame: the origin at its reference clip's first-key centre of mass on the ground, +Z its facing (long_u: the
captured aim's gun line, so the game's learnt facing is nil and no turn steps the feet between ready and aim; stand_m,
stand_f: the ready's body orientation), so the reference clip stands exactly where Unity's own first-key anchoring put it.
"""
import json, math, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import combat_v4_jobs as J

R79 = dict(db='cmu', src='79_96', range=(0.05, 1.6), loop='pingpong', face='mean', set='both')   # the rest before the raise (forward and back)
R01 = dict(db='cmu', src='79_01', range=(6.3, 7.0), loop='pingpong', face='mean', set='both')   # the still rest the chop comes back to
CHAINS = {
    'long_u': dict(take='CMU 79_96', ref='rifle_ready_u_built', line='rifle_aim_cmu',
                   note="origin: rifle_ready_u_built's first-key centre of mass; +Z: rifle_aim_cmu's gun line"),
    # (CMU 79_01 is the long gun's actor in the same session, standing on the same marks: his feet within 0.5 cm of 79_96's in
    # the lab's frame, so the club's chain shares the long gun's frame and the club's ready meets the long gun's hands up)
    'club_u': dict(take='CMU 79_01', ref='rifle_ready_u_built', line='rifle_aim_cmu', same_as='long_u',
                   note="long_u's frame (the same actor, session and marks)"),
    'stand_m': dict(take='ACCAD Male2_A1_Stand', ref='pistol_ready_built', line=None,
                    note="origin and +Z: pistol_ready_built's first-key centre of mass and body orientation"),
    'stand_f': dict(take='ACCAD Female1_A01_Stand', ref='pistol_ready_f_built', line=None,
                    note="origin and +Z: pistol_ready_f_built's first-key centre of mass and body orientation"),
}


def _v4(name, **kw):
    d = dict(next(j for j in J.JOBS if j['name'] == name)); d.update(kw)
    return d


JOBS = [
    # the long gun, one take (u)
    J.B('rifle_ready_u_built', R79, dict(op='hold', hold='LongGunReady', model='rifle_auto'), state='S1a', gate='ready',
        kind="long gun at the low ready (built on CMU 79_96's own rest before its raise: the take whose raise, aim and lower the game plays)",
        weapon=J.L, chain='long_u', replaces=['rifle_ready_built', 'rifle_ready_f_built']),
    _v4('rifle_raise_cmu', chain='long_u'),
    _v4('rifle_aim_cmu', chain='long_u'),
    # the lower: the gun comes off the shoulder as the take's hands drop (from 7.5 s), not at 7.7 s when v4's mount still held
    # it in the shoulder pocket on hands already lowered (C1: the gun 1.3 cm into the trunk, v4). Earlier the off hand's IK
    # turned over (to_s 0.35 s: the forearm 121° in a key; 0.5 s: 81°; 0.6 s: 40°); 0.8 s: the largest forearm step 15°
    # and the gun 4.9 cm clear of the trunk
    _v4('rifle_lower_cmu', chain='long_u', ik=dict(mode='Shoulder', model='rifle_auto', to_s=0.8)),
    J.B('reload_rifle_u_built', dict(R79, loop=None), dict(op='reload', mech='magazine', model='rifle_auto', hold='LongGunReady', seconds=3.0),
        state='S5', gate='reload', kind='reload, rifle magazine (built on CMU 79_96\'s rest, the long gun\'s ready)', weapon=J.L, timing='mag',
        chain='long_u', replaces=['reload_rifle_built', 'reload_rifle_f_built']),
    J.B('reload_break_u_built', dict(R79, loop=None), dict(op='reload', mech='break', model='shotgun_sawn', hold='LongGunReady', seconds=4.5),
        state='S5', gate='reload', kind='reload, break-action shotgun (built on CMU 79_96\'s rest)', weapon=J.L, timing='reload_slow',
        chain='long_u', replaces=['reload_break_built', 'reload_break_f_built']),
    J.B('reload_bolt_u_built', dict(R79, loop=None), dict(op='reload', mech='bolt', model='rifle_bolt', hold='LongGunReady', seconds=4.6),
        state='S5', gate='reload', kind='reload, bolt action (built on CMU 79_96\'s rest)', weapon=J.L, timing='reload_slow',
        chain='long_u', replaces=['reload_bolt_built', 'reload_bolt_f_built']),
    # hands up from the long gun (the weapon dropped where the long gun's ready stands: a hold for the long gun's class)
    J.B('surrender_enter_u_built', dict(R79, loop=None), dict(op='hands_up', enter=1.4), state='S20', gate='yield',
        kind="raising the hands into the hold (built on CMU 79_96's rest, the long gun's ready)", weapon=J.ANY, timing='surrender', chain='long_u'),
    J.B('surrender_hold_u_built', R79, dict(op='hands_up'), state='S20', gate='yield',
        kind="hands up, open, palms forward, held (built on CMU 79_96's rest)", weapon=J.ANY, chain='long_u'),
    # the two-handed club, men: its captured chop (CMU 79_01, the long gun's actor) and a ready built on the rest the chop
    # comes back to, one take
    J.B('club_ready_u_built', R01, dict(op='hold', hold='ClubReady', model='bat'), state='S1d', gate='ready',
        kind="two-handed club at the ready (built on CMU 79_01's rest after its chop: the take the strike is cut from)", weapon=J.CLUB,
        chain='club_u', replaces=['club_ready_built']),
    _v4('club_overhead_cmu', chain='club_u'),
    # hands up from the club (men): on the same rest (79_01's feet stand turned 7-8° from 79_96's: its own hold)
    J.B('surrender_enter_club_u_built', dict(R01, loop=None), dict(op='hands_up', enter=1.4), state='S20', gate='yield',
        kind="raising the hands into the hold (built on CMU 79_01's rest, the club's ready)", weapon=J.ANY, timing='surrender', chain='club_u'),
    J.B('surrender_hold_club_u_built', R01, dict(op='hands_up'), state='S20', gate='yield',
        kind="hands up, open, palms forward, held (built on CMU 79_01's rest)", weapon=J.ANY, chain='club_u'),
    # a man's stance: the pistol, the club's ready, hands up
    _v4('pistol_ready_built', chain='stand_m'),
    J.B('pistol_aim_m_built', J.STAND_M, dict(op='pistol_aim', model='pistol'), state='S3', gate='aim_pistol',
        kind='pistol aim, isosceles (man; built on his captured stance, the stance of his pistol ready)', weapon=J.PISTOL,
        chain='stand_m', replaces=['pistol_aim_built']),
    _v4('reload_pistol_built', chain='stand_m'), _v4('reload_revolver_built', chain='stand_m'),
    _v4('surrender_enter_built', chain='stand_m'), _v4('surrender_hold_built', chain='stand_m'),
    # a woman's stance: the same
    _v4('pistol_ready_f_built', chain='stand_f'), _v4('pistol_aim_c_built', chain='stand_f'),
    _v4('reload_pistol_f_built', chain='stand_f'), _v4('reload_revolver_f_built', chain='stand_f'),
    _v4('surrender_enter_f_built', chain='stand_f'), _v4('surrender_hold_f_built', chain='stand_f'),
]

# the states' clips v4.1 proposes (Core CombatMotion; men's, women's, from, cut, loop: stance_continuity.STATES' form), and
# the routing it needs (Game AnimatedUnitView): a standing long gun reaches its aim through the captured raise and leaves it
# through the captured lower (the take's actor pivots his feet 5-10° as he blades into the aim: a crossfade straight from
# the ready would turn the planted feet), and reloads from the ready
MAPPING = {
    'rifle_idle': ['rifle_ready_u_built', 'rifle_ready_u_built', 0.0, 1.0, True],
    'rifle_raise': ['rifle_raise_cmu', 'rifle_raise_cmu', 0.42, 0.95, False],
    'rifle_aim': ['rifle_aim_cmu', 'rifle_aim_cmu', 0.0, 1.0, True],
    'rifle_lower': ['rifle_lower_cmu', 'rifle_lower_cmu', 0.0, 0.92, False],
    'rifle_reload': ['reload_rifle_u_built', 'reload_rifle_u_built', 0.0, 0.95, False],
    'pistol_aim': ['pistol_aim_m_built', 'pistol_aim_c_built', 0.0, 1.0, True],
    'club2_idle': ['club_ready_u_built', 'club_ready_f_built', 0.0, 1.0, True],
    # proposed states (CombatMotion.Yield(arms), as Idle(arms)): the long gun's hands up on its own ready's stance
    'yield_enter_long': ['surrender_enter_u_built', 'surrender_enter_u_built', 0.0, 0.95, False],
    'yield_hold_long': ['surrender_hold_u_built', 'surrender_hold_u_built', 0.0, 1.0, True],
    'yield_enter_club': ['surrender_enter_club_u_built', None, 0.0, 0.95, False],     # (men; women's club yields on her stand)
    'yield_hold_club': ['surrender_hold_club_u_built', None, 0.0, 1.0, True],
}
ROUTED = {   # pairs the routing removes (the game no longer blends them) and the ones it adds
    'remove': [('rifle_idle', 'rifle_aim'), ('rifle_aim', 'rifle_reload'), ('rifle_idle', 'yield_enter'), ('rifle_aim', 'yield_enter'),
               ('club2_idle', 'yield_enter')],
    'add': [('rifle_lower', 'rifle_reload', 'same', 'OnReload from the hold: through the lower'),
            ('rifle_idle', 'yield_enter_long', 'same', 'OnYield with a long gun (CombatMotion.Yield(arms))'),
            ('rifle_lower', 'yield_enter_long', 'same', 'OnYield from the hold: through the lower'),
            ('yield_enter_long', 'yield_hold_long', 'same', 'hands up into the hold'),
            ('club2_idle', 'yield_enter_club', 'same', "OnYield with a two-handed club (men: on the club's own rest)", 'm'),
            ('yield_enter_club', 'yield_hold_club', 'same', 'hands up into the hold', 'm'),
            ('club2_idle', 'yield_enter', 'same', 'OnYield with a two-handed club (women: her stand)', 'f')],
}


def frames_from(dump_dir, json_dir):
    """Each chain's frame from its pass-1 clips (built in the take's raw frame): the reference clip's first-key centre of
    mass on the ground; +Z the line clip's mean gun line (long_u) or the reference's body orientation."""
    import stance_continuity as SC
    out = {}
    for ch, c in CHAINS.items():
        if c.get('same_as'): continue
        A = SC.clip_feet([dump_dir], [json_dir], c['ref'], basis='first')
        if A is None: raise SystemExit(f'{ch}: no pass-1 dump of {c["ref"]}')
        m, j, (o, yaw), _ = A
        if c['line']:
            lj = json.load(open(os.path.join(json_dir, c['line'] + '.json')))
            f = np.mean([[-k['fwd'][0], k['fwd'][1], k['fwd'][2]] for k in lj['ik']['keys']], axis=0)   # Unity's axes -> the file's
            yaw = math.atan2(f[0], f[2])
        # p' = R(-yaw)(p - o): combat_v4.build_framed's yaw is -yaw, its origin o (the take's raw frame: pass 1 had none)
        out[ch] = dict(yaw=-yaw, origin=[float(o[0]), float(o[2])], ref=c['ref'], note=c['note'], take=c['take'])
    for ch, c in CHAINS.items():
        if c.get('same_as'): out[ch] = dict(out[c['same_as']], note=c['note'], take=c['take'])
    return out


def plan(frames=None):
    res = []
    for d in JOBS:
        d = dict(d)
        ch = d['chain']
        d['frame'] = dict(frames[ch]) if frames else dict(yaw=0.0, origin=[0.0, 0.0], ref='pass 1: the take\'s raw frame')
        m = J.load(d['db'], d['src'])
        if m is None: d['missing'] = True; res.append(d); continue
        r = d.get('range')
        if r is None: r = (0.0, round((m.n - 1) / m.fps, 3))
        elif isinstance(r, str): r = J.auto_range(m, r)
        d['range'] = [float(r[0]), float(r[1])]
        if d['db'] == 'cmu':
            subj = d['src'].split('_')[0]
            if subj in J.LABEL and 'sex' not in d: d['sex'], d['sex_source'] = J.LABEL[subj]
        ev, tm = J.events(m, d.get('events'), d['range'], d.get('mirror'))
        if ev: d['events_frames'] = ev
        if tm: d['timing_measured'] = tm
        d['src_fps'] = round(m.fps, 3); d['stature_est_m'] = m.meta.get('stature_est')
        res.append(d)
    return res


if __name__ == '__main__':
    a = sys.argv[1:]
    if a[0] == 'plan':
        fr = json.load(open(a[2])) if len(a) > 2 else None
        p = plan(fr)
        json.dump(p, open(a[1], 'w'), indent=1)
        print(f"{len(p)} jobs, {'final frames' if fr else 'pass 1 (raw frames)'}; missing: {[d['name'] for d in p if d.get('missing')]}")
    elif a[0] == 'frames':
        fr = frames_from(a[1], a[2])
        json.dump(fr, open(a[3], 'w'), indent=1)
        for k, v in fr.items(): print(k, f"yaw {math.degrees(v['yaw']):.2f}°", 'origin', [round(x, 4) for x in v['origin']])
    elif a[0] == 'mapping':
        json.dump({'states': MAPPING, 'routed': ROUTED}, open(a[1], 'w'), indent=1)
        print('mapping written:', ', '.join(MAPPING))
