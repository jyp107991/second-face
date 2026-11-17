"""Captured combat clips (CMU ASF/AMC, ACCAD BVH) -> one FBX per clip for Unity's Humanoid, made by the motion converters'
own pipeline (cmu2fbx.py, accad2fbx.py): shortest-path slerp, one quaternion sign per joint, continuous Euler angles,
solver flips repaired, seam loops eased and closed (the last key the first), in-between bones straight in the bind and the
take, a true T-pose at frame 0, every trial read at its true capture rate.

    blender -b --factory-startup --python tools/unity/motion/combat2fbx.py -- <cmu dir[,dir]> <accad dir[,dir]> <out dir> [clip,clip]

What combat adds to the motion clips:
  * one-shots keep their horizontal travel from the first frame (a lunge or a stagger pinned in place slides its planted
    feet); `travel_m` says how far each goes and `root` is set when it travels more than 15 cm (COMBAT_ASSETS doubt 4);
  * the facing can be the strike's (the hand's furthest reach straight ahead), the travel's, or the first or last frame's;
  * `weapon` and `two_hands` (two-handed grips: clip_qa.py holds the hands' distance near constant);
  * the source person's sex, as the database records it or as the capture file itself labels its subject (the AMC's header
    names the ASF it was solved on), and the set the clip is for (`set`: m, f or both).
Rates: CMU's from each trial's C3D header (the capture's own rate: 60 for 77, 79, 80, 106, 141 and 143, the index listing
the last three at 120; 120 for the rest); ACCAD's from the BVH's frame time (30, Male2_A7_Crouch 120).
Licences: CMU (mocap.cs.cmu.edu) free for all uses; ACCAD Open Motion Project CC BY 3.0 (credit in CREDITS.md).
"""
import bpy, json, math, os, sys
from mathutils import Quaternion, Vector
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', 'kits'))
import cmu2fbx as C
import accad2fbx as A
import kitlib as K

RATE60 = {'77', '79', '80', '106', '141', '143'}
# the source person's sex: CMU's subject title, or the capture file's own label for its subject; others not recorded
CMU_SEX = {'113': ('f', 'CMU subject title: post pregnant woman'), '141': ('f', 'CMU subject title: female general subject'),
           '144': ('f', 'CMU subject title: punching female'),
           '76': ('f', "the take's own file labels its subject Female1 (E:\\madness\\...\\Female1.ASF)"),
           '91': ('f', "the take's own file labels its subject Female1 (E:\\emotionWalksFemale\\...\\Female1.ASF)")}
FLOOR = {'Female1': 0.055}   # her takes stand 5-6 cm higher than Male2's (toe and ankle joints, quiet standing): ground at 0
LIC_CMU = 'CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu): free for all uses, may not be resold as data'
LIC_ACCAD = 'ACCAD Open Motion Project (Ohio State University), CC BY 3.0'
R2 = 'rifle (two hands; mimed: the hands IK-placed on the weapon)'
CLUB = 'bat/sledge/axe (two hands)'

CLIPS = [
    # CMU (as staged 2026-11-17 by tools/amc2fbx.py, names and cuts kept)
    dict(name='rifle_raise_cmu', src='79_96', range=(1.6, 4.3), face='strike_L', kind='A3 raise a long gun from rest to the shoulder (aim)', weapon=R2, two_hands=True),
    dict(name='rifle_aim_cmu', src='79_96', range=(4.1, 6.9), loop='seam', seam=0.6, face='strike_L', kind='A3 aim hold, long gun (captured; one small shot-like jolt)', weapon=R2, two_hands=True),
    dict(name='rifle_lower_cmu', src='79_96', range=(6.7, 8.8), face='strike_L', kind='A3 lower a long gun from the shoulder to rest', weapon=R2, two_hands=True),
    dict(name='rifle_aim_b_cmu', src='80_03', range=(4.3, 6.6), loop='seam', seam=0.5, face='strike_L', kind='A3 aim hold, long gun (stiller take)', weapon=R2, two_hands=True),
    dict(name='club_overhead_cmu', src='79_01', range=(4.4, 6.6), face='mean', kind='A4 two-handed overhead strike (wind-up, chop, follow-through)', weapon=CLUB, two_hands=True),
    dict(name='club_overhead_b_cmu', src='79_01', range=(0.8, 3.0), face='mean', kind='A4 two-handed overhead strike (slower)', weapon=CLUB, two_hands=True),
    dict(name='throw_overhand_cmu', src='113_24', range=(1.9, 4.2), face='strike_R', kind='A7 overhand throw, right hand, with a step (woman)', weapon='grenade/bottle (right hand)'),
    dict(name='getup_front_cmu', src='140_01', face='last', kind='A8 get up from lying face down'),
    dict(name='getup_back_cmu', src='140_08', face='last', kind='A8 get up from lying on the back'),
    dict(name='getup_side_cmu', src='140_03', face='last', kind='A8 get up from lying on the side'),
    dict(name='duck_cmu', src='77_09', range=(3.4, 8.6), face='mean', kind='A5/A6 duck from something thrown, hold low, rise'),
    dict(name='cower_cmu', src='76_04', range=(0.6, 3.5), face='mean', kind='A5/A8 crouch and cover the head (cower; flinch)'),
    # (its solver turns a toe over and back at 1900°/s in the stumble: flips repaired above 1200°/s)
    dict(name='stagger_cmu', src='91_59', range=(0.0, 2.6), face='first', kind='A5 stagger: stumble and catch the balance', weapon='any', max_rate=1200.0),
    dict(name='stagger_fwd_cmu', src='22_12', face='travel', kind='A5 shoved from behind: stumble forward (travels)', weapon='any'),
    dict(name='ready_crouch_cmu', src='77_03', range=(4.5, 9.5), loop='seam', seam=0.8, face='mean', kind='A2 wary crouched ready stance (unarmed/knife)', weapon='none or knife'),
    # CMU women (new, 2026-11-17)
    dict(name='fist_jab_f_cmu', src='144_13', range=(1.1, 2.25), face='strike_L', kind='A4 jab (left), from the guard back to it (woman)'),
    dict(name='fist_cross_f_cmu', src='113_13', range=(0.9, 3.3), face='strike_R', kind='A4 cross (right), a committed punch from a relaxed stance (woman)'),
    dict(name='fist_combo_f_cmu', src='141_14', range=(1.0, 3.9), face='mean', kind='A4 punch combination: right, left, right (woman)'),
    dict(name='block_high_f_cmu', src='144_26', range=(0.6, 2.2), face='mean', kind='A4/A5 high block (right forearm) from a relaxed stance (woman)'),
    dict(name='getup_f_cmu', src='113_08', range=(9.6, 14.2), face='last', kind='A8 get up from lying to standing (woman)'),
    # ACCAD (as staged by tools/bvh2fbx.py + accad_clips.json, names and cuts kept); Male2 re-solved onto a T-pose
    dict(name='fist_guard_accad', db='accad', src='Male2_D4_ReadyToRelax', range=(0.0, 1.7), loop='seam', seam=0.5, face='mean', kind='A2 unarmed guard (fighting stance), held'),
    dict(name='fist_ready_accad', db='accad', src='Male2_D1_StandToReady', range=(0.3, 2.95), face='mean', kind='A2 from standing into the unarmed guard'),
    dict(name='fist_relax_accad', db='accad', src='Male2_D4_ReadyToRelax', range=(1.6, 4.1), face='first', kind='A2 out of the unarmed guard to standing'),
    dict(name='fist_jab_accad', db='accad', src='Male2_E1_JabLeft', range=(0.5, 2.2), face='mean', kind='A4 jab (lead left hand)'),
    dict(name='fist_cross_accad', db='accad', src='Male2_E4_CrossRight', range=(0.05, 1.7), face='mean', kind='A4 cross (rear right hand)'),
    dict(name='fist_hook_l_accad', db='accad', src='Male2_E5_HookLeft', range=(0.3, 2.0), face='mean', kind='A4 left hook'),
    dict(name='fist_hook_r_accad', db='accad', src='Male2_E6_HookRight', range=(0.4, 2.1), face='mean', kind='A4 right hook'),
    dict(name='fist_uppercut_r_accad', db='accad', src='Male2_E8_UppercutRight', range=(0.0, 1.6), face='mean', kind='A4 right uppercut'),
    dict(name='fist_uppercut_l_accad', db='accad', src='Male2_E7_UppercutLeft', range=(0.2, 1.9), face='mean', kind='A4 left uppercut'),
    dict(name='block_high_accad', db='accad', src='Male2_E13_BlockRightHigh', range=(0.0, 1.9), face='mean', kind='A4/A5 high block (right forearm)'),
    dict(name='dodge_l_accad', db='accad', src='Male2_E19_DodgeLeft', face='mean', kind='A5 slip/dodge to the left (a miss reaction)', weapon='any'),
    dict(name='dodge_r_accad', db='accad', src='Male2_E20_DodgeRight', face='mean', kind='A5 slip/dodge to the right (a miss reaction)', weapon='any'),
    dict(name='duck_accad', db='accad', src='Male2_E21_DuckLeft', face='mean', kind='A5 duck under a swing', weapon='any'),
    dict(name='crouch_down_accad', db='accad', src='Male2_A7_Crouch', range=(1.0, 3.6), face='mean', kind='A6 drop from standing into a crouch (into half cover)'),
    dict(name='crouch_down_f_accad', db='accad', src='Female1_A07_Crouch', range=(1.5, 5.1), face='mean', kind='A6 drop into a crouch (woman)'),
    dict(name='run_to_crouch_accad', db='accad', src='Male2_C26_RunToCrouch', face='travel', kind='A6 run in and drop into a crouch (step into cover); travels'),
    dict(name='run_to_crouch_f_accad', db='accad', src='Female1_C26_RunToCrouch', face='travel', kind='A6 run in and drop into a crouch (woman); travels'),
    dict(name='walk_to_crouch_f_accad', db='accad', src='Female1_B24_WalkToCrouch', range=(2.0, 7.1), face='travel', kind='A6 walk in and crouch (woman); travels'),
    dict(name='crouch_to_run_accad', db='accad', src='Male2_C27_CrouchToRun', face='travel', kind='A6 break from a crouch into a run (leave cover); travels'),
    dict(name='getup_to_crouch_accad', db='accad', src='Male2_A10_LieToCrouch', face='last', kind='A8 from lying to a crouch'),
    dict(name='getup_to_crouch_f_accad', db='accad', src='Female1_A10_LieToCrouch', face='last', kind='A8 from lying to a crouch (woman)'),
    # ACCAD new (2026-11-17): leaving cover by sex
    dict(name='crouch_to_run_f_accad', db='accad', src='Female1_C27_CrouchToRun1', face='travel', kind='A6 break from a crouch into a run (woman); travels'),
    dict(name='crouch_to_walk_f_accad', db='accad', src='Female1_B25_CrouchToWalk', face='travel', kind='A6 rise from a crouch and walk off (woman); travels'),
    dict(name='crouch_to_walk_accad', db='accad', src='Male2_B25_CrouchToWalk', face='travel', kind='A6 rise from a crouch and walk off; travels'),
]


def _find(dirs, *parts):
    for d in dirs:
        p = os.path.join(d, *parts)
        if os.path.exists(p): return p
    return None


def _cut(n, fps, rng):
    f0 = min(n - 2, round(rng[0] * fps)) if rng else 0
    f1 = min(n, round(rng[1] * fps)) if rng else n
    return f0, f1


def cmu_take(d, dirs):
    subj = d['src'].split('_')[0]
    asf, amc = _find(dirs, subj, subj + '.asf'), _find(dirs, subj, d['src'] + '.amc')
    if not (asf and amc): return None
    bones = C.parse_asf(open(asf).read()); frames = C.parse_amc(open(amc).read())
    fps = 60 if subj in RATE60 else 120
    C.SRC_FPS = fps
    f0, f1 = _cut(len(frames), fps, d.get('range'))
    rows = C.repair_flips(C.continuous(C.build_rows(bones, frames, f0, f1)), fps, d['_flips'], d.get('max_rate', C.MAX_RATE))
    pts = []
    for r in rows:
        wp = C.world_pose(bones, r['loc'], r['pos'])
        r['rootq'] = wp['root'][0]
        pts.append({'L': wp['lhand'][2], 'R': wp['rhand'][2], 'chest': wp['thorax'][1]})
    sex, why = CMU_SEX.get(subj, ('u', 'not recorded (CMU records sex only in a subject title)'))
    meta = dict(src='CMU ' + d['src'], src_fps=fps, sex=sex, sex_source=why, licence=LIC_CMU,
                source=f"http://mocap.cs.cmu.edu/search.php?subjectnumber={int(subj)} (trial {d['src']})")
    write = lambda path, rows_: C.write_bvh(path, bones, rows_)
    return rows, pts, fps, C.hip_height(bones), 0.0, meta, write, len(frames)


def accad_take(d, dirs):
    path = _find(dirs, d['src'] + '.bvh')
    if not path: return None
    subject = d['src'].split('_')[0]
    if subject.startswith('Male'):
        ref = _find(dirs, subject + '_A1_Stand.bvh')
        joints, order, frames, fps = A.load_resolved(path, ref)
    else:
        joints, order, frames, fps = A.load(path)
    frames = A._continuous(frames)
    C.repair_flips(frames, fps, d['_flips'])
    C.SRC_FPS = fps
    f0, f1 = _cut(len(frames), fps, d.get('range'))
    rows, pts = [], []
    for fr in frames[f0:f1]:
        W, P = A._fk(joints, order, fr)
        _, _, rq, key = A.world_feet(joints, order, fr)
        loc = dict(fr['loc']); loc['root'] = loc.pop('Hips')
        rows.append({'loc': loc, 'pos': fr['pos'].copy(), 'rootq': rq, 'key': key})
        pts.append({'L': P['LeftHand'], 'R': P['RightHand'], 'chest': P['Spine1']})
    hip = (abs(joints['LeftUpLeg']['offset'][1]) + abs(joints['LeftLeg']['offset'][1]) + abs(joints['LeftFoot']['offset'][1])) * A.UNIT
    sex = 'f' if subject.startswith('Female') else 'm'
    meta = dict(src='ACCAD ' + d['src'], src_fps=round(fps, 2), sex=sex, sex_source='ACCAD names its subjects by sex (' + subject + ')',
                licence=LIC_ACCAD, source='https://accad.osu.edu/research/motion-lab/mocap-system-and-data (' + subject + '_bvh.zip: ' + d['src'] + '.bvh)',
                resolved=subject.startswith('Male'))
    write = lambda p, rows_: A.write_bvh(p, joints, order, rows_)
    return rows, pts, fps, hip, FLOOR.get(subject, 0.0), meta, write, len(frames)


def facing_yaw(rows, pts, how):
    """The yaw (about +Y) that turns the chosen front to +Z: the mean, first or last facing of the root, the travel, or the
    strike's (the punching or throwing hand's furthest horizontal reach from the chest)."""
    if how in ('mean', 'first', 'last'):
        sel = rows if how == 'mean' else ([rows[0]] if how == 'first' else [rows[-1]])
        f = Vector((0.0, 0.0, 0.0))
        for r in sel: f += r['rootq'] @ Vector((0.0, 0.0, 1.0))
        vx, vz = f.x, f.z
    elif how == 'travel':
        a, b = rows[0]['pos'], rows[-1]['pos']; vx, vz = b.x - a.x, b.z - a.z
    else:
        hand = 'R' if how.endswith('R') else 'L'; best, vx, vz = -1.0, 0.0, 1.0
        for p in pts:
            v = p[hand] - p['chest']; l = math.hypot(v.x, v.z)
            if l > best: best, vx, vz = l, v.x, v.z
    return -math.atan2(vx, vz)


def build(d, take):
    rows, pts, fps, hip, floor, meta, write, n = take
    yaw = facing_yaw(rows, pts, d.get('face', 'mean'))
    Y = Quaternion((0.0, 1.0, 0.0), yaw); o = rows[0]['pos'].copy()
    for r in rows:
        p = Y @ Vector((r['pos'].x - o.x, 0.0, r['pos'].z - o.z))
        r['pos'] = Vector((p.x, r['pos'].y - floor, p.z))
        r['loc']['root'] = (Y @ r['loc']['root']).normalized()
    if d.get('loop') == 'seam':
        seam = round(d.get('seam', 1.0) * fps); P = len(rows) - seam
        P = C.refine_seam([r['key'] for r in rows], P, seam, round(0.5 * fps))
        cyc = C.cut_loop(rows, 0, P, seam)
        mx = sum(r['pos'].x for r in cyc) / len(cyc); mz = sum(r['pos'].z for r in cyc) / len(cyc)
        for r in cyc: r['pos'] = Vector((r['pos'].x - mx, r['pos'].y, r['pos'].z - mz))
        out = C.resample_loop(cyc, C.OUT_FPS)
    else:
        out = C.resample([{'loc': r['loc'], 'pos': r['pos']} for r in rows], C.OUT_FPS)
    a, b = out[0]['pos'], out[-1]['pos']
    return out, (b.x - a.x, b.z - a.z), hip, meta, write, fps, n, floor


def export(d, out_dir, out, travel, hip, meta, write, fps, n, floor):
    K.reset()
    tmp = os.path.join(out_dir, '_tmp'); os.makedirs(tmp, exist_ok=True)
    bvh = os.path.join(tmp, d['name'] + '.bvh')
    write(bvh, out)
    bpy.ops.import_anim.bvh(filepath=bvh, axis_forward='-Z', axis_up='Y', global_scale=1.0, frame_start=1, use_fps_scale=False,
                            update_scene_fps=False, update_scene_duration=True, rotate_mode='QUATERNION')
    os.remove(bvh)
    sc = bpy.context.scene
    sc.render.fps = C.OUT_FPS; sc.render.fps_base = 1.0
    sc.frame_start = 1; sc.frame_end = len(out)
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    arm.name = d['name']
    if arm.animation_data and arm.animation_data.action: arm.animation_data.action.name = d['name']
    C.t_pose_key(arm, sc)
    ib = C.straighten_inbetweens(arm, len(out))
    path = os.path.join(out_dir, d['name'] + '.fbx')
    bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); bpy.context.view_layer.objects.active = arm
    bpy.ops.export_scene.fbx(filepath=path, use_selection=True, apply_scale_options='FBX_SCALE_ALL', axis_forward='-Z', axis_up='Y', object_types={'ARMATURE'},
                             add_leaf_bones=False, bake_anim=True, bake_anim_use_all_bones=True, bake_anim_use_nla_strips=False, bake_anim_use_all_actions=False,
                             bake_anim_force_startend_keying=True, bake_anim_step=1.0, bake_anim_simplify_factor=0.0, path_mode='STRIP')
    tl = math.hypot(*travel)
    loop = bool(d.get('loop'))
    root = (not loop) and tl > 0.15
    sex = meta['sex']
    side = dict(name=d['name'], src=meta['src'], loop=loop, speed=0.0, root=bool(root), hip=round(hip, 4), fps=C.OUT_FPS, frames=len(out),
                src_fps=meta['src_fps'], sex=sex, sex_source=meta['sex_source'], set=d.get('set', {'f': 'f', 'm': 'm'}.get(sex, 'both')),
                licence=meta['licence'], source=meta['source'], kind=d.get('kind', ''), weapon=d.get('weapon', 'none'), two_hands=bool(d.get('two_hands')),
                authoring='captured (optical mocap, no fingers)', range=list(d['range']) if d.get('range') else [0, round((n - 1) / fps, 2)],
                facing=d.get('face', 'mean'), travel_m=[round(travel[0], 3), round(travel[1], 3)],
                root_note=('travels %.2f m: apply as root motion, or bake into the pose' % tl) if root else 'in place',
                closed=loop, cycle=C.REFINE if loop else None, flips_repaired=d.get('_flips') or None, inbetween=ib or None,
                resolved=bool(meta.get('resolved')), floor_shift_m=-floor if floor else 0.0)
    with open(os.path.join(out_dir, d['name'] + '.json'), 'w') as f: json.dump(side, f, indent=1)
    print(f"clip {d['name']}: {len(out)} frames @30 from {fps:.0f} fps, travel {tl:.2f} m, sex {sex}")


def main():
    args = sys.argv[sys.argv.index('--') + 1:]
    cmu, accad, out_dir = args[0].split(','), args[1].split(','), args[2]
    only = set(args[3].split(',')) if len(args) > 3 else None
    os.makedirs(out_dir, exist_ok=True)
    for d in CLIPS:
        if only and d['name'] not in only: continue
        d['_flips'] = {}
        take = accad_take(d, accad) if d.get('db') == 'accad' else cmu_take(d, cmu)
        if take is None: print('  skip', d['name'], '(no source)'); continue
        if d['_flips']: print(f"  {d['name']}: solver flips repaired: {d['_flips']}")
        export(d, out_dir, *build(d, take))
    print('combat: done')


if __name__ == '__main__':
    main()
