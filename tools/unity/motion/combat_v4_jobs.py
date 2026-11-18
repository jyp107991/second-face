"""Combat set v4 (docs/COMBAT_ANIMATION_STANDARD.md §4): every clip as a job, and the plan the Blender converter
(combat_v4.py) and the clip QA (clip_qa.py --combat) read. numpy only (no bpy): runs in Blender's Python and as
`python3 -I` for the plan.

    python3 -I tools/unity/motion/combat_v4_jobs.py plan <out plan.json>

A job is a captured clip (G1: a real person's motion, cut, at its true rate, its weight-bearing feet planted, the weapon's
hands placed by IK where the state holds one) or a clip built on a captured body (the standard's gaps: the body is a capture,
the weapon's hands and the layers are placed by IK inside the evidence cited in `evidence`; never presented as captured).
Fields:
  name, db (cmu | accad | style), src (the trial), range (s; 'auto': the take's active stretch with its lead-in and settle),
  loop (None | 'seam' | 'gait'), seam (s), face (combat2fbx.facing_yaw), state (the standard's entry), gate (the gate state the
  standard proposes), kind, set (m | f | both), sex/sex_source (a capture file's own label where CMU's title records none),
  weapon (G10 class), plant (the weight-bearing feet held still; False where G4 exempts the clip: falls, get-ups, crawls),
  mirror (left and right swapped: a left-handed capture made right-handed), events (what beat the clip carries:
  'strike:R', 'block:L', 'throw:R', 'chop:R', 'dodge', 'fall', 'rise', 'lie'), timing (a key of TIMING), ik (how the hands hold
  the weapon), build (the layers of a built clip), replaces (staged clips it retires), root (travel applied).
Rates: CMU's from each trial's C3D header (60 fps for 33, 34, 77, 79, 80, 106, 141, 143; 120 for the rest); ACCAD's from the BVH
frame time; 100STYLE's 60 fps (Xsens, the files' frame time).
"""
import json, math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))

RAW = '/home/user/second-face-staging/combat/raw'
CMU_DIRS = [RAW + '/v4/cmu', RAW + '/cmu', RAW + '/cmu_v2', '/home/user/second-face-staging/motion/raw/cmu']
ACCAD_DIRS = [RAW + '/v4/accad', RAW + '/accad/x', RAW + '/accad/x2']
STYLE_DIR = RAW + '/v4/100style'
RATE60 = {'33', '34', '77', '79', '80', '106', '141', '143'}

# the sex a CMU capture file's own header labels its subject with (CMU's titles record sex for few subjects)
LABEL = {
    '143': ('m', "the take's own file names its subject Male1 (H:\\Male1\\...\\Male1.ASF); CMU's title records no sex"),
    '104': ('m', "CMU's title: neutral Male walk; the take's own file names its subject Male1 (...\\EmotionMaleHayes\\...\\Male1.ASF)"),
    '105': ('f', "the take's own file names its subject Female1 (E:\\emotionWalksFemale\\...\\Female1.ASF); CMU's title records no sex"),
    '136': ('m', "the take's own file names its subject male (G:\\JayActor3\\...\\male.ASF); CMU's title records no sex"),
    '111': ('f', 'CMU subject title: pregnant woman'), '114': ('f', 'CMU subject title: pregnant woman'),
    '113': ('f', 'CMU subject title: post pregnant woman'), '141': ('f', 'CMU subject title: female general subject'),
    '144': ('f', 'CMU subject title: punching female'),
    '76': ('f', "the take's own file labels its subject Female1 (E:\\madness\\...\\Female1.ASF)"),
    '91': ('f', "the take's own file labels its subject Female1 (E:\\emotionWalksFemale\\...\\Female1.ASF)"),
}

# Real timings the clips are held to (docs/COMBAT_ANIMATION_STANDARD.md §2; [R..] its references). Each a range [lo, hi] s of
# the measured span `what`; a clip passes within [0.85 lo, 1.15 hi] (the ±15 % of the brief). `design` marks the game's pace
# choices inside the evidence (not evidence).
# A study's mean +/- SD is held as the span real people cover, mean +/- 2 SD (the cited real timing is a distribution, not a
# point: a captured real jab of 0.2 s lies within it); the clip is judged within that span widened by 15 %.
TIMING = {
    'jab': dict(what='onset->impact (hand)', lo=0.105, hi=0.705, src='R1: jab delivery 405 +/- 150 ms (mean +/- SD; held as mean +/- 2 SD)'),
    'punch': dict(what='onset->impact (hand)', lo=0.105, hi=0.705, src='R1/R2: punch delivery 405 +/- 150 ms (mean +/- 2 SD); hooks deliver slower [R2] (no figure: held to the same span)'),
    'kendo': dict(what='onset->impact (hands)', lo=0.543, hi=0.988, src='R17: kendo step-in strikes 0.745 +/- 0.101 and 0.818 +/- 0.085 s from movement onset to impact (mean +/- 2 SD of either)'),
    'block': dict(what='onset->contact (forearm set)', lo=0.10, hi=0.40, src='R1/R2: a defender has about 0.4 s against a jab'),
    'mag': dict(what='whole reload', lo=2.0, hi=4.0, src='R12: a magazine change takes an ordinary shooter 2-4 s'),
    'reload_slow': dict(what='whole reload', lo=4.0, hi=6.0, src='design: revolvers, break actions and bolt actions are slower than a magazine (no source; standard S5)', design=True),
    'fall': dict(what='release->impact (hips)', lo=0.6, hi=0.8, src='R24: 0.6-0.8 s from release to impact in a forward fall'),
    'hit_onset': dict(what='impact->onset of the struck part', lo=0.0, hi=0.10, src='R21/R22: startle-driven neck activity within ~0.1 s, the startle reflex within 120 ms'),
    'hit_return': dict(what='impact->back at the stance', lo=0.4, hi=1.0, src='design inside R19 (back to the stance in 0.4-1.0 s)', design=True),
    'dodge': dict(what='onset->the step set', lo=0.3, hi=0.6, src='design: 0.3-0.6 s of the captured step (standard S9)', design=True),
    'throw': dict(what='whole throw', lo=1.0, hi=2.3, src='design 1-2 s whole; the staged woman\'s overhand runs 2.3 s with settling (standard S19)', design=True),
    'surrender': dict(what='to the hold', lo=1.0, hi=2.0, src='design 1-2 s to the hold (standard S20)', design=True),
    'rise': dict(what='whole get-up', lo=4.4, hi=8.5, src='[here] the staged captured get-ups run 4.4-8.5 s with their lead-ins (standard S15)'),
    'crouch': dict(what='down or up', lo=0.3, hi=3.6, src='design 0.3-0.8 s; captured crouch-downs 2.6-3.6 s with settling (standard S16)'),
    # (combat v4.3: the re-stance steps, G13)
    'restance': dict(what='whole step', lo=0.3, hi=1.6, design=True,
                     src="design: the captured re-stance steps' own 0.3-1.4 s between still stances (mined, combat_v43_jobs), a turn's "
                         "steps lengthening with its amplitude [R28]"),
}

L, R2, CLUB, BLADE, ANY, PISTOL = 'long', 'long', 'melee2', 'melee1', 'any', 'pistol'


def J(name, db, src, **kw):
    d = dict(name=name, db=db, src=src)
    d.update(kw)
    return d


# ---------------------------------------------------------------------------------------------------------------------------
# captured clips. The v3 captured clips are made again through this pipeline (the same names and cuts), with the new ones.
CAPTURED = [
    # S1c/S1e guard and footwork (men: ACCAD Male2; women: CMU 144's guard before her first jab; Female1's side steps)
    J('fist_guard_accad', 'accad', 'Male2_D4_ReadyToRelax', range=(0.0, 1.7), loop='seam', seam=0.5, face='mean', state='S1e', gate='guard', kind='unarmed guard (fighting stance), held', weapon='unarmed'),
    J('guard_f_cmu', 'cmu', '144_13', range=(0.9, 2.25), loop='seam', seam=0.5, face='mean', state='S1e', gate='guard', kind="unarmed guard, held (woman: CMU 144's guard before her first jab)", weapon='unarmed'),
    J('fist_ready_accad', 'accad', 'Male2_D1_StandToReady', range=(0.3, 2.95), face='mean', state='S23', gate='guard', kind='from standing into the unarmed guard', weapon='unarmed'),
    J('fist_relax_accad', 'accad', 'Male2_D4_ReadyToRelax', range=(1.6, 4.1), face='first', state='S23', gate='guard', kind='out of the unarmed guard to standing', weapon='unarmed'),
    J('guard_advance_accad', 'accad', 'Male2_E3_Advance', range=(0.3, 2.3), face='travel', state='S1e', gate='guard', kind='guard footwork: advance (two steps)', weapon='unarmed', root=True),
    J('guard_retreat_accad', 'accad', 'Male2_E5_Retreat', range=(1.3, 3.3), face='mean', state='S1e', gate='guard', kind='guard footwork: retreat (two steps back)', weapon='unarmed', root=True),
    J('guard_side_l_accad', 'accad', 'Male2_E9_SideStepLeft', range='auto', face='mean', state='S1e', gate='guard', kind='guard footwork: side step left', weapon='unarmed', root=True),
    J('guard_side_r_accad', 'accad', 'Male2_E10_SideStepRight', range='auto', face='mean', state='S1e', gate='guard', kind='guard footwork: side step right', weapon='unarmed', root=True),
    J('guard_switch_accad', 'accad', 'Male2_D15_SwitchStance', range=(0.0, 2.4), face='mean', state='S1e', gate='guard', kind='guard footwork: switch stance', weapon='unarmed'),
    # S7 unarmed strikes
    J('fist_jab_accad', 'accad', 'Male2_E1_JabLeft', range=(0.5, 2.2), face='mean', state='S7', gate='strike', kind='jab (lead left hand)', weapon='unarmed', events='strike:L', timing='jab'),
    J('fist_cross_accad', 'accad', 'Male2_E4_CrossRight', range=(0.05, 1.7), face='mean', state='S7', gate='strike', kind='cross (rear right hand)', weapon='unarmed', events='strike:R', timing='punch'),
    J('fist_hook_l_accad', 'accad', 'Male2_E5_HookLeft', range=(0.3, 2.0), face='mean', state='S7', gate='strike', kind='left hook', weapon='unarmed', events='strike:L', timing='punch'),
    J('fist_hook_r_accad', 'accad', 'Male2_E6_HookRight', range=(0.4, 2.1), face='mean', state='S7', gate='strike', kind='right hook', weapon='unarmed', events='strike:R', timing='punch'),
    J('fist_uppercut_r_accad', 'accad', 'Male2_E8_UppercutRight', range=(0.0, 1.6), face='mean', state='S7', gate='strike', kind='right uppercut', weapon='unarmed', events='strike:R', timing='punch'),
    J('fist_uppercut_l_accad', 'accad', 'Male2_E7_UppercutLeft', range=(0.2, 1.9), face='mean', state='S7', gate='strike', kind='left uppercut', weapon='unarmed', events='strike:L', timing='punch'),
    J('fist_body_hook_l_accad', 'accad', 'Male2_E9_BodyHookLeft', range='auto', face='mean', state='S7', gate='strike', kind='left body hook', weapon='unarmed', events='strike:L', timing='punch'),
    J('fist_body_hook_r_accad', 'accad', 'Male2_E10_BodyHookRight', range='auto', face='mean', state='S7', gate='strike', kind='right body hook', weapon='unarmed', events='strike:R', timing='punch'),
    J('fist_body_cross_l_accad', 'accad', 'Male2_E13_BodyCrossLeft', range='auto', face='mean', state='S7', gate='strike', kind='left body cross', weapon='unarmed', events='strike:L', timing='punch'),
    J('fist_body_cross_r_accad', 'accad', 'Male2_E14_BodyCrossRight', range='auto', face='mean', state='S7', gate='strike', kind='right body cross', weapon='unarmed', events='strike:R', timing='punch'),
    J('fist_body_jab_l_accad', 'accad', 'Male2_E16_BodyJabLeft', range='auto', face='mean', state='S7', gate='strike', kind='left body jab', weapon='unarmed', events='strike:L', timing='jab'),
    J('fist_body_jab_r_accad', 'accad', 'Male2_E15_BodyJabRight', range='auto', face='mean', state='S7', gate='strike', kind='right body jab', weapon='unarmed', events='strike:R', timing='jab'),
    J('fist_backfist_l_accad', 'accad', 'Male2_E11_BackfistLeft', range='auto', face='mean', state='S7', gate='strike', kind='left backfist', weapon='unarmed', events='strike:L', timing='punch'),
    J('fist_backfist_r_accad', 'accad', 'Male2_E12_BackfistRight', range='auto', face='mean', state='S7', gate='strike', kind='right backfist', weapon='unarmed', events='strike:R', timing='punch'),
    J('fist_uppercut_l_b_cmu', 'cmu', '143_23', range=(9.45, 10.55), face='strike_L', state='S7', gate='strike', kind='left rising punch (a second man, CMU 143)', weapon='unarmed', events='strike:L', timing='punch'),
    J('fist_uppercut_r_b_cmu', 'cmu', '143_23', range=(4.7, 5.8), face='strike_R', state='S7', gate='strike', kind='right rising punch (a second man, CMU 143)', weapon='unarmed', events='strike:R', timing='punch'),
    J('fist_jab_f_cmu', 'cmu', '144_13', range=(1.1, 2.25), face='strike_L', state='S7', gate='strike', kind='jab (left), from the guard back to it (woman)', weapon='unarmed', events='strike:L', timing='jab'),
    J('fist_jab_b_f_cmu', 'cmu', '144_13', range=(5.55, 6.2), face='strike_L', state='S7', gate='strike', kind='jab (left), a second take (woman)', weapon='unarmed', events='strike:L', timing='jab'),
    J('fist_cross_f_cmu', 'cmu', '113_13', range=(0.9, 3.3), face='strike_R', state='S7', gate='strike', kind='cross (right), a committed punch from a relaxed stance (woman)', weapon='unarmed', events='strike:R', timing='punch', root=True),
    J('fist_cross_b_f_cmu', 'cmu', '144_20', range=(1.15, 2.05), face='strike_R', state='S7', gate='strike', kind='cross (right) from the guard (woman, CMU 144)', weapon='unarmed', events='strike:R', timing='punch'),
    J('fist_body_cross_f_cmu', 'cmu', '144_20', range=(8.3, 9.0), face='strike_R', state='S7', gate='strike', kind='right body cross (woman)', weapon='unarmed', events='strike:R', timing='punch'),
    J('fist_combo_f_cmu', 'cmu', '141_14', range=(1.0, 3.9), face='mean', state='S7', gate='strike', kind='punch combination: right, left, right (woman)', weapon='unarmed', events='strike:R'),
    # S8 blocks (men: ACCAD Male2's eight; women: CMU 144's left and right blocks)
    J('block_high_accad', 'accad', 'Male2_E13_BlockRightHigh', range=(0.0, 1.9), face='mean', state='S8', gate='strike', kind='high block (right forearm)', weapon='unarmed', events='block:R', timing='block'),
    J('block_high_l_accad', 'accad', 'Male2_E11_BlockLeftHigh', range='auto', face='mean', state='S8', gate='strike', kind='high block (left forearm)', weapon='unarmed', events='block:L', timing='block'),
    J('block_low_l_accad', 'accad', 'Male2_E12_BlockLeftLow', range='auto', face='mean', state='S8', gate='strike', kind='low block (left forearm)', weapon='unarmed', events='block:L', timing='block'),
    J('block_low_r_accad', 'accad', 'Male2_E14_BlockRightLow', range='auto', face='mean', state='S8', gate='strike', kind='low block (right forearm)', weapon='unarmed', events='block:R', timing='block'),
    J('block_mid_l_accad', 'accad', 'Male2_E15_BlockLeftMiddle', range='auto', face='mean', state='S8', gate='strike', kind='middle block (left forearm)', weapon='unarmed', events='block:L', timing='block'),
    J('block_mid_r_accad', 'accad', 'Male2_E16_BlockRightMiddle', range='auto', face='mean', state='S8', gate='strike', kind='middle block (right forearm)', weapon='unarmed', events='block:R', timing='block'),
    J('block_mid_high_accad', 'accad', 'Male2_E17_BlockMiddleHigh', range='auto', face='mean', state='S8', gate='strike', kind='block in the middle, high (both forearms)', weapon='unarmed', events='block:R', timing='block'),
    J('block_mid_low_accad', 'accad', 'Male2_E18_BlockMiddleLow', range='auto', face='mean', state='S8', gate='strike', kind='block in the middle, low (both forearms)', weapon='unarmed', events='block:R', timing='block'),
    J('block_high_f_cmu', 'cmu', '144_26', range=(0.6, 2.2), face='mean', state='S8', gate='strike', kind='high block (right forearm) from a relaxed stance (woman)', weapon='unarmed', events='block:R', timing='block'),
    J('block_r_b_f_cmu', 'cmu', '144_27', range=(6.25, 7.35), face='mean', state='S8', gate='strike', kind='right block, a second take (woman)', weapon='unarmed', events='block:R', timing='block'),
    J('block_l_f_cmu', 'cmu', '144_07', range=(7.6, 8.7), face='mean', state='S8', gate='strike', kind='left block (woman)', weapon='unarmed', events='block:L', timing='block'),
    J('block_l_b_f_cmu', 'cmu', '144_08', range=(4.9, 5.95), face='mean', state='S8', gate='strike', kind='left block, a second take (woman)', weapon='unarmed', events='block:L', timing='block'),
    # S9 dodge
    J('dodge_l_accad', 'accad', 'Male2_E19_DodgeLeft', face='mean', state='S9', gate='dodge', kind='slip/dodge to the left (a miss reaction)', weapon=ANY, events='dodge', timing='dodge'),
    J('dodge_r_accad', 'accad', 'Male2_E20_DodgeRight', face='mean', state='S9', gate='dodge', kind='slip/dodge to the right (a miss reaction)', weapon=ANY, events='dodge', timing='dodge'),
    J('duck_accad', 'accad', 'Male2_E21_DuckLeft', face='mean', state='S9', gate='dodge', kind='duck under a swing (left)', weapon=ANY, events='dodge', root=True),
    J('duck_r_accad', 'accad', 'Male2_E22_DuckRight', range='auto', face='mean', state='S9', gate='dodge', kind='duck under a swing (right)', weapon=ANY, events='dodge'),
    J('duck_cmu', 'cmu', '77_09', range=(3.4, 8.6), face='mean', state='S9', gate='dodge', kind='duck from something thrown, hold low, rise', weapon=ANY, events='dodge'),
    J('sidestep_quick_l_accad', 'accad', 'Male2_C24_QuickSidestepLeft', range=(0.0, 1.4), face='first', state='S9', gate='dodge', kind='quick side step left (dodge, a man)', weapon=ANY, events='step', timing='dodge', root=True),
    J('sidestep_quick_r_accad', 'accad', 'Male2_C25_QuickSidestepRight', range=(0.0, 1.4), face='first', state='S9', gate='dodge', kind='quick side step right (dodge, a man)', weapon=ANY, events='step', timing='dodge', root=True),
    J('sidestep_quick_l_b_accad', 'accad', 'Male1_C24_QuickSideStepLeft', range='auto', face='first', state='S9', gate='dodge', kind='quick side step left (dodge, a second man)', weapon=ANY, events='step', timing='dodge', root=True),
    J('sidestep_quick_r_b_accad', 'accad', 'Male1_C25_QuickSideStepRight', range='auto', face='first', state='S9', gate='dodge', kind='quick side step right (dodge, a second man)', weapon=ANY, events='step', timing='dodge', root=True),
    J('sidestep_quick_l_f_accad', 'accad', 'Female1_C24_SideStepLeft', range=(0.3, 1.5), face='first', state='S9', gate='dodge', kind='quick side step left (dodge, woman)', weapon=ANY, events='step', timing='dodge', root=True),
    J('sidestep_quick_r_f_accad', 'accad', 'Female1_C25_SideStepRight', range=(0.3, 1.5), face='first', state='S9', gate='dodge', kind='quick side step right (dodge, woman)', weapon=ANY, events='step', timing='dodge', root=True),
    J('sidestep_l_f_accad', 'accad', 'Female1_B22_SideStepLeft', range=(1.0, 3.1), face='first', state='S9', gate='dodge', kind='side step left (woman; her footwork)', weapon=ANY, events='step', root=True),
    J('sidestep_r_f_accad', 'accad', 'Female1_B23_SideStepRight', range='auto1', face='first', state='S9', gate='dodge', kind='side step right (woman; her footwork)', weapon=ANY, events='step', root=True),
    # S11 stagger
    J('stagger_cmu', 'cmu', '91_59', range=(0.0, 2.6), face='first', state='S11', gate='hit', kind='stagger: stumble and catch the balance (woman)', weapon=ANY, max_rate=1200.0, root=True),
    J('stagger_fwd_cmu', 'cmu', '22_12', face='travel', state='S11', gate='hit', kind='shoved from behind: stumble forward (travels)', weapon=ANY, root=True),
    J('stagger_spin_f_cmu', 'cmu', '105_59', range='auto', face='first', state='S11', gate='hit', kind='a small stumble turning (woman)', weapon=ANY, root=True),
    J('stagger_walk_cmu', 'cmu', '104_13', range='auto', face='travel', state='S11', gate='hit', kind='stumbling steps (a man)', weapon=ANY, root=True),
    J('stagger_back_accad', 'accad', 'Male2_E6_QuickRetreat', range=(2.2, 3.6), face='mean', state='S11', gate='hit', kind='pushed back: quick retreat steps (a man)', weapon=ANY, root=True),
    # S12 knockdown and fall; S14 prone and crawl
    J('fall_fwd_cmu', 'cmu', '90_16', range='auto', face='travel', state='S12', gate='fall', kind='falls on the face (an acrobat: stylised, reviewed)', weapon=ANY, plant=False, events='fall', timing='fall', root=True),
    J('fall_back_cmu', 'cmu', '90_18', range='auto', face='first', state='S12', gate='fall', kind='rug pulled: falls backward (an acrobat: stylised, reviewed)', weapon=ANY, plant=False, events='fall', timing='fall', root=True),
    J('prone_down_accad', 'accad', 'Male2_A8_CrouchToLie', range=(0.9, 3.4), face='last', state='S14', gate='prone', kind='from a crouch down to lying prone', weapon=ANY, plant=False, events='lie', root=True),
    J('prone_down_b_accad', 'accad', 'Male1_A8_CrouchToLie', range='auto', face='last', state='S14', gate='prone', kind='from a crouch down to lying prone (a second man)', weapon=ANY, plant=False, events='lie', root=True),
    J('prone_down_f_accad', 'accad', 'Female1_A08_CrouchToLie', range=(1.2, 3.6), face='last', state='S14', gate='prone', kind='from a crouch down to lying prone (woman)', weapon=ANY, plant=False, events='lie', root=True),
    J('prone_hold_accad', 'accad', 'Male2_A9_Lie', range='hold', loop='seam', seam=0.6, face='mean', state='S14', gate='prone', kind='lying prone, held', weapon=ANY, plant=False),
    J('prone_hold_f_accad', 'accad', 'Female1_A09_LieT2', range=(4.0, 7.5), loop='seam', seam=0.6, face='mean', state='S14', gate='prone', kind='lying prone, held (woman)', weapon=ANY, plant=False),
    J('crawl_accad', 'accad', 'Male2_A11_Crawl', range=(2.6, 6.6), face='travel', state='S14', gate='prone', kind='crawl forward (elbows and knees)', weapon=ANY, plant=False, root=True),
    J('crawl_b_accad', 'accad', 'Male1_A11_CrawlForward', range='auto', face='travel', state='S14', gate='prone', kind='crawl forward (a second man)', weapon=ANY, plant=False, root=True),
    J('crawl_f_accad', 'accad', 'Female1_A11_CrawlForward', range='auto', face='travel', state='S14', gate='prone', kind='crawl forward (woman)', weapon=ANY, plant=False, root=True),
    J('crawl_back_accad', 'accad', 'Male2_A12_CrawlBackwards', range='auto', face='mean', state='S14', gate='prone', kind='crawl backward', weapon=ANY, plant=False, root=True),
    J('crawl_back_f_accad', 'accad', 'Female1_A12_CrawlBackwards', range='auto', face='mean', state='S14', gate='prone', kind='crawl backward (woman)', weapon=ANY, plant=False, root=True),
    # S15 rise
    J('getup_front_cmu', 'cmu', '140_01', face='last', state='S15', gate='rise', kind='get up from lying face down', weapon=ANY, plant=False, events='rise', timing='rise', root=True),
    J('getup_back_cmu', 'cmu', '140_08', face='last', state='S15', gate='rise', kind='get up from lying on the back', weapon=ANY, plant=False, events='rise', timing='rise', root=True),
    J('getup_side_cmu', 'cmu', '140_03', face='last', state='S15', gate='rise', kind='get up from lying on the side', weapon=ANY, plant=False, events='rise', timing='rise', root=True),
    J('getup_f_cmu', 'cmu', '113_08', range=(9.6, 14.2), face='last', state='S15', gate='rise', kind='get up from lying to standing (woman)', weapon=ANY, plant=False, events='rise', timing='rise', root=True),
    J('getup_b_f_cmu', 'cmu', '111_06', range='rise', face='last', state='S15', gate='rise', kind='get up from the floor (woman)', weapon=ANY, plant=False, events='rise', timing='rise', root=True),
    J('getup_c_f_cmu', 'cmu', '111_07', range='rise', face='last', state='S15', gate='rise', kind='get up from the floor, a second take (woman)', weapon=ANY, plant=False, events='rise', timing='rise', root=True),
    J('getup_d_f_cmu', 'cmu', '111_08', range='rise', face='last', state='S15', gate='rise', kind='get up from the floor, a third take (woman)', weapon=ANY, plant=False, events='rise', timing='rise', root=True),
    J('getup_e_f_cmu', 'cmu', '114_02', range='rise', face='last', state='S15', gate='rise', kind='get up from lying (woman, a second subject)', weapon=ANY, plant=False, events='rise', timing='rise', root=True),
    J('getup_ready_cmu', 'cmu', '77_16', range='rise', face='last', state='S15', gate='rise', kind='lie down, get up into a careful ready stance', weapon=ANY, plant=False, events='rise', timing='rise', root=True),
    J('getup_ready_back_cmu', 'cmu', '77_18', range='rise', face='last', state='S15', gate='rise', kind='lie down on the back, get up into a careful ready stance', weapon=ANY, plant=False, events='rise', timing='rise', root=True),
    J('getup_to_crouch_accad', 'accad', 'Male2_A10_LieToCrouch', face='last', state='S15', gate='rise', kind='from lying to a crouch', weapon=ANY, plant=False, events='rise', root=True),
    J('getup_to_crouch_f_accad', 'accad', 'Female1_A10_LieToCrouch', face='last', state='S15', gate='rise', kind='from lying to a crouch (woman)', weapon=ANY, plant=False, events='rise', root=True),
    # S16 crouch; S17 half cover
    J('crouch_down_accad', 'accad', 'Male2_A7_Crouch', range=(1.0, 3.6), face='mean', state='S16', gate='crouch', kind='drop from standing into a crouch (into half cover)', weapon=ANY, timing='crouch', root=True),
    J('crouch_down_f_accad', 'accad', 'Female1_A07_Crouch', range=(1.5, 5.1), face='mean', state='S16', gate='crouch', kind='drop into a crouch (woman)', weapon=ANY, timing='crouch', root=True),
    J('crouch_down_b_accad', 'accad', 'Male1_A7_Crouch', range='auto1', face='mean', state='S16', gate='crouch', kind='drop into a crouch (a second man)', weapon=ANY, timing='crouch', root=True),
    J('guard_to_crouch_accad', 'accad', 'Male2_D14_ReadyToCrouch', range=(0.6, 2.6), face='mean', state='S16', gate='crouch', kind='from the guard down into a crouch', weapon=ANY, timing='crouch'),
    J('crouch_to_guard_accad', 'accad', 'Male2_D13_CrouchToReady', range=(0.7, 3.1), face='mean', state='S17', gate='crouch', kind='up from a crouch into the guard (the half-cover rise to fire)', weapon=ANY, timing='crouch'),
    J('ready_crouch_cmu', 'cmu', '77_03', range=(4.5, 9.5), loop='seam', seam=0.8, face='mean', state='S16', gate='crouch', kind='wary crouched ready stance (unarmed/knife)', weapon='unarmed'),
    J('run_to_crouch_accad', 'accad', 'Male2_C26_RunToCrouch', face='travel', state='S17', gate='crouch', kind='run in and drop into a crouch (step into cover); travels', weapon=ANY, root=True),
    J('run_to_crouch_f_accad', 'accad', 'Female1_C26_RunToCrouch', face='travel', state='S17', gate='crouch', kind='run in and drop into a crouch (woman); travels', weapon=ANY, root=True),
    J('walk_to_crouch_accad', 'accad', 'Male2_B24_WalkToCrouch', range='auto', face='travel', state='S17', gate='crouch', kind='walk in and crouch; travels', weapon=ANY, root=True),
    J('walk_to_crouch_b_accad', 'accad', 'Male1_B24_WalkToCrouch', range='auto', face='travel', state='S17', gate='crouch', kind='walk in and crouch (a second man); travels', weapon=ANY, root=True),
    J('walk_to_crouch_f_accad', 'accad', 'Female1_B24_WalkToCrouch', range=(2.0, 7.1), face='travel', state='S17', gate='crouch', kind='walk in and crouch (woman); travels', weapon=ANY, root=True),
    J('crouch_to_run_accad', 'accad', 'Male2_C27_CrouchToRun', face='travel', state='S17', gate='crouch', kind='break from a crouch into a run (leave cover); travels', weapon=ANY, root=True),
    J('crouch_to_run_f_accad', 'accad', 'Female1_C27_CrouchToRun1', face='travel', state='S17', gate='crouch', kind='break from a crouch into a run (woman); travels', weapon=ANY, root=True),
    J('crouch_to_walk_accad', 'accad', 'Male2_B25_CrouchToWalk', face='travel', state='S17', gate='crouch', kind='rise from a crouch and walk off; travels', weapon=ANY, root=True),
    J('crouch_to_walk_f_accad', 'accad', 'Female1_B25_CrouchToWalk', face='travel', state='S17', gate='crouch', kind='rise from a crouch and walk off (woman); travels', weapon=ANY, root=True),
    # S16 crouched gait (men's captured: CMU 136, the take's own file labels him male; 100STYLE's of unrecorded sex)
    J('crouch_walk_cmu', 'cmu', '136_10', loop='gait', state='S16', gate='carry', kind='walk crouched (a man, by his capture file\'s label)', weapon=ANY),
    J('crouch_walk_100s', 'style', 'Crouched_FW', range=(10.5, 13.3), loop='gait', state='S16', gate='carry', kind='walk crouched (100STYLE Crouched; sex not recorded)', weapon=ANY),
    J('crouch_walk_back_cmu', 'cmu', '136_11', loop='gait', state='S16', gate='carry', kind='walk backwards crouched (a man)', weapon=ANY),
    # S18 full cover: the lean out and back (100STYLE, one actor of unrecorded sex)
    J('peek_lean_l_100s', 'style', 'LeanLeft_ID', range=(6.6, 10.0), face='first', state='S18', gate='peek', kind='full cover: lean the trunk out to the left and hold (peek start)', weapon=ANY),
    J('peek_lean_l_back_100s', 'style', 'LeanLeft_ID', range=(29.8, 32.2), face='first', state='S18', gate='peek', kind='full cover: back from the left lean (peek stop)', weapon=ANY),
    J('peek_lean_r_100s', 'style', 'LeanRight_ID', range=(4.7, 7.6), face='first', state='S18', gate='peek', kind='full cover: lean out to the right and hold (peek start)', weapon=ANY),
    J('peek_lean_r_back_100s', 'style', 'LeanRight_ID', range=(25.0, 27.2), face='first', state='S18', gate='peek', kind='full cover: back from the right lean (peek stop)', weapon=ANY),
    J('peek_lean_l_hold_100s', 'style', 'LeanLeft_ID', range=(10.5, 14.5), loop='seam', seam=0.8, face='mean', state='S18', gate='peek', kind='full cover: the left lean held', weapon=ANY),
    J('peek_lean_r_hold_100s', 'style', 'LeanRight_ID', range=(8.0, 12.0), loop='seam', seam=0.8, face='mean', state='S18', gate='peek', kind='full cover: the right lean held', weapon=ANY),
    # S2 aim, long gun (three actors: CMU 79, 80 and 100STYLE; the gun in the shoulder by IK)
    J('rifle_raise_cmu', 'cmu', '79_96', range=(1.6, 4.3), face='strike_L', state='S2', gate='aim', kind='raise a long gun from rest to the shoulder (aim)', weapon=L, ik=dict(mode='Shoulder', model='rifle_auto', from_s=1.2)),
    J('rifle_aim_cmu', 'cmu', '79_96', range=(4.1, 6.9), loop='seam', seam=0.6, face='strike_L', state='S2', gate='aim', kind='aim hold, long gun (captured; one small shot-like jolt)', weapon=L, ik=dict(mode='Shoulder', model='rifle_auto')),
    J('rifle_lower_cmu', 'cmu', '79_96', range=(6.7, 8.8), face='strike_L', state='S2', gate='aim', kind='lower a long gun from the shoulder to rest', weapon=L, ik=dict(mode='Shoulder', model='rifle_auto', to_s=1.0)),
    J('rifle_aim_b_cmu', 'cmu', '80_03', range=(4.3, 6.6), loop='seam', seam=0.5, face='strike_L', state='S2', gate='aim', kind='aim hold, long gun (stiller take, a second actor)', weapon=L, ik=dict(mode='Shoulder', model='rifle_auto')),
    J('rifle_aim_c_100s', 'style', 'Swat_ID', range=(9.0, 14.0), loop='seam', seam=1.0, face='mean', state='S2', gate='aim', kind='aim-ready hold, long gun at the shoulder (a third actor, 100STYLE Swat)', weapon=L, ik=dict(mode='Shoulder', model='rifle_auto')),
    J('rifle_raise_c_100s', 'style', 'Swat_ID', range=(4.9, 6.9), face='mean', state='S2', gate='aim', kind='raise to the aim-ready (100STYLE Swat)', weapon=L, ik=dict(mode='Shoulder', model='rifle_auto', from_s=0.6)),
    # S21 carry: the aim-walk and strafe with a shouldered gun (100STYLE Swat; gaits)
    J('rifle_walk_100s', 'style', 'Swat_FW', range=(11.2, 14.0), loop='gait', state='S21', gate='carry', kind='aim-walk forward, gun shouldered (100STYLE Swat)', weapon=L, ik=dict(mode='Shoulder', model='rifle_auto')),
    J('rifle_walk_back_100s', 'style', 'Swat_BW', range=(10.7, 13.4), loop='gait', state='S21', gate='carry', kind='aim-walk backward, gun shouldered (100STYLE Swat)', weapon=L, ik=dict(mode='Shoulder', model='rifle_auto')),
    # S6b strike, two-handed (captured; the off hand on the handle by IK)
    J('club_overhead_cmu', 'cmu', '79_01', range=(4.4, 6.6), face='mean', state='S6b', gate='strike', kind='two-handed overhead strike (wind-up, chop, follow-through)', weapon=CLUB, events='chop:R', timing='kendo', ik=dict(mode='OffHand', model='bat')),
    J('club_overhead_b_cmu', 'cmu', '79_01', range=(0.8, 3.0), face='mean', state='S6b', gate='strike', kind='two-handed overhead strike (slower)', weapon=CLUB, events='chop:R', timing='kendo', ik=dict(mode='OffHand', model='bat')),
    J('club_chop_cmu', 'cmu', '80_71', range=(7.6, 9.2), face='mean', state='S6b', gate='strike', kind='two-handed overhead chop (chopping wood; a second actor)', weapon=CLUB, events='chop:R', timing='kendo', ik=dict(mode='OffHand', model='bat')),
    J('club_swing_cmu', 'cmu', '124_07', range=(2.0, 4.3), face='mean', state='S6b', gate='strike', kind='two-handed horizontal swing (a baseball swing; a third actor)', weapon=CLUB, events='chop:R', timing='kendo', ik=dict(mode='OffHand', model='bat')),
    J('club_swing_b_cmu', 'cmu', '124_07', range=(7.7, 9.9), face='mean', state='S6b', gate='strike', kind='two-handed horizontal swing, a second take', weapon=CLUB, events='chop:R', timing='kendo', ik=dict(mode='OffHand', model='bat')),
    J('club_guard_cmu', 'cmu', '02_07', range=(1.0, 4.0), loop='seam', seam=0.8, face='mean', state='S1d', gate='ready', kind='two-handed guard, held (swordplay)', weapon=CLUB, ik=dict(mode='OffHand', model='bat')),
    # S19 throw (women's: CMU 113, 111; the men's: CMU 143, labelled Male1 by its own file, a left-handed throw mirrored to the
    # right; others of unrecorded sex: CMU 33, 34, 124)
    J('throw_overhand_cmu', 'cmu', '113_24', range=(1.9, 4.2), face='strike_R', state='S19', gate='throw', kind='overhand throw, right hand, with a step (woman)', weapon='thrown', events='throw:R', timing='throw', root=True),
    J('throw_overhand_b_f_cmu', 'cmu', '111_33', range=(5.9, 7.9), face='strike_R', state='S19', gate='throw', kind='overhand throw, right hand (woman, a second take)', weapon='thrown', events='throw:R', timing='throw', root=True),
    J('throw_overhand_m_cmu', 'cmu', '143_20', range=(7.4, 9.2), face='strike_R', state='S19', gate='throw', kind="overhand throw (a man, by his file's label): his left-handed throw mirrored to the right hand", weapon='thrown', events='throw:R', timing='throw', mirror=True, root=True),
    J('throw_overhand_m_b_cmu', 'cmu', '143_20', range=(2.5, 4.2), face='strike_R', state='S19', gate='throw', kind='overhand throw (a man), a second take, mirrored to the right hand', weapon='thrown', events='throw:R', timing='throw', mirror=True, root=True),
    J('throw_overhand_u_cmu', 'cmu', '33_01', range=(3.8, 5.6), face='strike_R', state='S19', gate='throw', kind='overhand throw (a football; sex not recorded)', weapon='thrown', events='throw:R', timing='throw', root=True),
    J('throw_overhand_u_b_cmu', 'cmu', '34_01', range=(5.9, 7.6), face='strike_R', state='S19', gate='throw', kind='overhand throw (a football; a second actor, sex not recorded)', weapon='thrown', events='throw:R', timing='throw', root=True),
    J('throw_pitch_u_cmu', 'cmu', '124_01', range=(2.2, 4.6), face='strike_R', state='S19', gate='throw', kind='hard overhand throw (a baseball pitch; sex not recorded)', weapon='thrown', events='throw:R', timing='throw', root=True),
    J('throw_underhand_u_cmu', 'cmu', '124_12', range=(0.6, 2.1), face='strike_R', state='S19', gate='throw', kind='underhand toss (a lob from cover; sex not recorded)', weapon='thrown', events='throw:R', timing='throw', root=True),
    # S20 surrender (captured arms raised: ACCAD Male2's victory takes)
    J('surrender_raise_accad', 'accad', 'Male2_D10_Victory2', range=(0.6, 2.9), face='mean', state='S20', gate='yield', kind='both arms raised (a man, captured)', weapon=ANY, timing='surrender'),
    # S22 turn
    J('turn_guard_r_accad', 'accad', 'Male2_E1_TurnAroundRight', range=(2.0, 3.6), face='first', state='S22', gate='turn', kind='turn round to the right in the guard (stepped)', weapon='unarmed'),
    J('turn_guard_l_accad', 'accad', 'Male2_E2_TurnAroundLeft', range='auto1', face='first', state='S22', gate='turn', kind='turn round to the left in the guard (stepped)', weapon='unarmed'),
    J('turn_l90_accad', 'accad', 'Male2_B9_WalkTurnLeft90', range='turn', face='first', state='S22', gate='turn', kind='walk turning 90° left', weapon=ANY, root=True),
    J('turn_r90_accad', 'accad', 'Male2_B12_WalkTurnRight90', range='turn', face='first', state='S22', gate='turn', kind='walk turning 90° right', weapon=ANY, root=True),
    J('turn_180_accad', 'accad', 'Male2_B15_WalkTurnAround', range='turn', face='first', state='S22', gate='turn', kind='walk turning round (180°)', weapon=ANY, root=True),
    J('turn_l90_b_accad', 'accad', 'Male1_B9_WalkToTurnLeft90', range='turn', face='first', state='S22', gate='turn', kind='walk turning 90° left (a second man)', weapon=ANY, root=True),
    J('turn_r90_b_accad', 'accad', 'Male1_B12_WalkTurnRight90', range='turn', face='first', state='S22', gate='turn', kind='walk turning 90° right (a second man)', weapon=ANY, root=True),
    J('turn_180_b_accad', 'accad', 'Male1_B15_WalkTurnAround', range='turn', face='first', state='S22', gate='turn', kind='walk turning round (a second man)', weapon=ANY, root=True),
    J('turn_l90_f_accad', 'accad', 'Female1_B09_WalkTurnLeft90', range='turn', face='first', state='S22', gate='turn', kind='walk turning 90° left (woman)', weapon=ANY, root=True),
    J('turn_r90_f_accad', 'accad', 'Female1_B12_WalkTurnRight90', range='turn', face='first', state='S22', gate='turn', kind='walk turning 90° right (woman)', weapon=ANY, root=True),
    J('turn_180_f_accad', 'accad', 'Female1_B15_WalkTurnAround180', range='turn', face='first', state='S22', gate='turn', kind='walk turning round (woman)', weapon=ANY, root=True),
    # the woman's cower (kept from v3)
    J('cower_cmu', 'cmu', '76_04', range=(0.6, 3.5), face='mean', state='S10', gate='hit', kind='crouch and cover the head (cower; flinch)', weapon=ANY, root=True),
]

# ---------------------------------------------------------------------------------------------------------------------------
# built clips: a captured body (the base job's cut) with the hands placed by IK on the weapon and the layers of `build`
STAND_M = dict(db='accad', src='Male2_A1_Stand', range=(0.2, 3.8), loop='seam', seam=1.0, face='mean', set='m')
STAND_F = dict(db='accad', src='Female1_A01_Stand', range=(0.1, 3.0), loop='seam', seam=0.8, face='mean', set='f')
STAND_M1 = dict(db='accad', src='Male1_A1_Stand', range=(0.2, 4.9), loop='seam', seam=1.0, face='mean', set='m')
CROUCH_M = dict(db='accad', src='Male2_A7_Crouch', range='crouch_hold', loop='seam', seam=0.5, face='mean', set='m')
CROUCH_F = dict(db='accad', src='Female1_A07_Crouch', range='crouch_hold', loop='seam', seam=0.5, face='mean', set='f')


def B(name, base, build, **kw):
    d = dict(base); d.update(name=name, build=build, built=True); d.update(kw)
    return d


BUILT = [
    # S1a long gun at the low ready, S1b pistol at the compressed ready (captured standing bodies; both hands by IK)
    B('rifle_ready_built', STAND_M, dict(op='hold', hold='LongGunReady', model='rifle_auto'), state='S1a', gate='ready', kind='long gun at the low ready (built: a captured stance, both hands by IK on the gun)', weapon=L, replaces=['rifle_idle_ual']),
    B('rifle_ready_b_built', STAND_M1, dict(op='hold', hold='LongGunReady', model='rifle_auto'), state='S1a', gate='ready', kind='long gun at the low ready, a second man (built)', weapon=L),
    B('rifle_ready_f_built', STAND_F, dict(op='hold', hold='LongGunReady', model='rifle_auto'), state='S1a', gate='ready', kind='long gun at the low ready (woman; built)', weapon=L, replaces=['rifle_idle_ual']),
    B('pistol_ready_built', STAND_M, dict(op='hold', hold='PistolReady', model='pistol'), state='S1b', gate='ready', kind='pistol at the compressed ready, two hands (built)', weapon=PISTOL, replaces=['pistol_idle_ual']),
    B('pistol_ready_f_built', STAND_F, dict(op='hold', hold='PistolReady', model='pistol'), state='S1b', gate='ready', kind='pistol at the compressed ready (woman; built)', weapon=PISTOL, replaces=['pistol_idle_ual']),
    B('club_ready_built', STAND_M, dict(op='hold', hold='ClubReady', model='bat'), state='S1d', gate='ready', kind='two-handed club at the ready (built)', weapon=CLUB),
    B('club_ready_f_built', STAND_F, dict(op='hold', hold='ClubReady', model='bat'), state='S1d', gate='ready', kind='two-handed club at the ready (woman; built)', weapon=CLUB),
    # S16/S17 the long gun crouched in half cover, and the kneeling aim over it (the peek)
    B('crouch_rifle_built', CROUCH_M, dict(op='hold', hold='LongGunCrouched', model='rifle_auto'), state='S16', gate='crouch', kind='crouched with the long gun (half cover hold; built)', weapon=L, replaces=['crouch_rifle_ual', 'crouch_idle_ual']),
    B('crouch_rifle_f_built', CROUCH_F, dict(op='hold', hold='LongGunCrouched', model='rifle_auto'), state='S16', gate='crouch', kind='crouched with the long gun (woman; built)', weapon=L, replaces=['crouch_rifle_ual', 'crouch_idle_ual']),
    B('crouch_aim_built', CROUCH_M, dict(op='aim', model='rifle_auto'), state='S17', gate='peek', kind='half cover: aiming from the crouch (built: the gun in the shoulder by IK)', weapon=L),
    B('crouch_aim_f_built', CROUCH_F, dict(op='aim', model='rifle_auto'), state='S17', gate='peek', kind='half cover: aiming from the crouch (woman; built)', weapon=L),
    # S18 aiming out of the full-cover lean (100STYLE's held lean, the gun shouldered by IK)
    B('peek_aim_l_built', dict(db='style', src='LeanLeft_ID', range=(10.5, 14.5), loop='seam', seam=0.8, face='mean', set='both'), dict(op='aim', model='rifle_auto'), state='S18', gate='peek', kind='full cover: aiming out of the left lean (built)', weapon=L),
    B('peek_aim_r_built', dict(db='style', src='LeanRight_ID', range=(8.0, 12.0), loop='seam', seam=0.8, face='mean', set='both'), dict(op='aim', model='rifle_auto'), state='S18', gate='peek', kind='full cover: aiming out of the right lean (built)', weapon=L),
    # S3 pistol aim, isosceles, on the captured aim bodies
    B('pistol_aim_built', dict(db='cmu', src='80_03', range=(4.3, 6.6), loop='seam', seam=0.5, face='strike_L', set='both'), dict(op='pistol_aim', model='pistol'), state='S3', gate='aim_pistol', kind='pistol aim, isosceles, two hands (built on the captured long-gun hold of CMU 80_03)', weapon=PISTOL, replaces=['pistol_aim_ual', 'pistol_aim_up_ual', 'pistol_aim_down_ual']),
    B('pistol_aim_b_built', dict(db='style', src='Swat_ID', range=(9.0, 14.0), loop='seam', seam=1.0, face='mean', set='both'), dict(op='pistol_aim', model='pistol'), state='S3', gate='aim_pistol', kind='pistol aim, isosceles (built on 100STYLE Swat)', weapon=PISTOL),
    B('pistol_aim_c_built', STAND_F, dict(op='pistol_aim', model='pistol'), state='S3', gate='aim_pistol', kind='pistol aim, isosceles (woman; built on her captured stance)', weapon=PISTOL),
    # S5 reloads (the gun at the ready on a captured stance; the hand paths timed inside the evidence)
    B('reload_rifle_built', STAND_M, dict(op='reload', mech='magazine', model='rifle_auto', hold='LongGunReady', seconds=3.0), state='S5', gate='reload', kind='reload, rifle magazine (built)', weapon=L, timing='mag', loop=None, replaces=['rifle_reload_ual']),
    B('reload_rifle_f_built', STAND_F, dict(op='reload', mech='magazine', model='rifle_auto', hold='LongGunReady', seconds=3.0), state='S5', gate='reload', kind='reload, rifle magazine (woman; built)', weapon=L, timing='mag', loop=None, replaces=['rifle_reload_ual']),
    B('reload_pistol_built', STAND_M, dict(op='reload', mech='pistol', model='pistol', hold='PistolReady', seconds=2.4), state='S5', gate='reload', kind='reload, pistol magazine (built)', weapon=PISTOL, timing='mag', loop=None, replaces=['pistol_reload_ual']),
    B('reload_pistol_f_built', STAND_F, dict(op='reload', mech='pistol', model='pistol', hold='PistolReady', seconds=2.4), state='S5', gate='reload', kind='reload, pistol magazine (woman; built)', weapon=PISTOL, timing='mag', loop=None, replaces=['pistol_reload_ual']),
    B('reload_revolver_built', STAND_M, dict(op='reload', mech='revolver', model='revolver', hold='PistolReady', seconds=4.4), state='S5', gate='reload', kind='reload, revolver (open, eject, speed-load, close; built)', weapon=PISTOL, timing='reload_slow', loop=None),
    B('reload_revolver_f_built', STAND_F, dict(op='reload', mech='revolver', model='revolver', hold='PistolReady', seconds=4.4), state='S5', gate='reload', kind='reload, revolver (woman; built)', weapon=PISTOL, timing='reload_slow', loop=None),
    B('reload_break_built', STAND_M, dict(op='reload', mech='break', model='shotgun_sawn', hold='LongGunReady', seconds=4.5), state='S5', gate='reload', kind='reload, break-action shotgun (open, extract, two shells, close; built)', weapon=L, timing='reload_slow', loop=None),
    B('reload_break_f_built', STAND_F, dict(op='reload', mech='break', model='shotgun_sawn', hold='LongGunReady', seconds=4.5), state='S5', gate='reload', kind='reload, break-action shotgun (woman; built)', weapon=L, timing='reload_slow', loop=None),
    B('reload_bolt_built', STAND_M, dict(op='reload', mech='bolt', model='rifle_bolt', hold='LongGunReady', seconds=4.6), state='S5', gate='reload', kind='reload, bolt action (two rounds through the open bolt; built)', weapon=L, timing='reload_slow', loop=None),
    B('reload_bolt_f_built', STAND_F, dict(op='reload', mech='bolt', model='rifle_bolt', hold='LongGunReady', seconds=4.6), state='S5', gate='reload', kind='reload, bolt action (woman; built)', weapon=L, timing='reload_slow', loop=None),
    # S6a one-handed strikes on captured blows (the weapon hand's grip and the blade's line along the blow's own arc)
    B('melee_forehand_built', dict(db='accad', src='Male2_E6_HookRight', range=(0.4, 2.1), face='mean', set='m'), dict(op='arc', model='machete', cut='slash'), state='S6a', gate='strike', kind='one-handed forehand slash (built on the captured right hook)', weapon=BLADE, events='strike:R', timing='punch', replaces=['melee_slash_a_ual', 'melee_slash_b_ual', 'melee_slash_c_ual', 'melee_combo_ual']),
    B('melee_backhand_built', dict(db='accad', src='Male2_E12_BackfistRight', range='auto', face='mean', set='m'), dict(op='arc', model='machete', cut='slash'), state='S6a', gate='strike', kind='one-handed backhand slash (built on the captured right backfist)', weapon=BLADE, events='strike:R', timing='punch'),
    B('melee_thrust_built', dict(db='accad', src='Male2_E4_CrossRight', range=(0.05, 1.7), face='mean', set='m'), dict(op='arc', model='knife', cut='thrust'), state='S6a', gate='strike', kind='one-handed thrust (built on the captured cross)', weapon=BLADE, events='strike:R', timing='punch', replaces=['melee_strike_ual']),
    B('melee_overhead_built', dict(db='cmu', src='79_01', range=(4.4, 6.6), face='mean', set='both'), dict(op='arc', model='hatchet', cut='chop', release_off=True), state='S6a', gate='strike', kind='one-handed overhead chop (built on the captured two-handed chop, the off hand released)', weapon=BLADE, events='chop:R', timing='kendo'),
    B('melee_forehand_f_built', dict(db='cmu', src='144_20', range=(1.15, 2.05), face='strike_R', set='f'), dict(op='arc', model='machete', cut='slash'), state='S6a', gate='strike', kind='one-handed forehand slash (woman; built on her captured cross)', weapon=BLADE, events='strike:R', timing='punch'),
    B('melee_thrust_f_built', dict(db='cmu', src='113_13', range=(0.9, 3.3), face='strike_R', set='f', root=True), dict(op='arc', model='knife', cut='thrust'), state='S6a', gate='strike', kind='one-handed thrust (woman; built on her captured cross)', weapon=BLADE, events='strike:R', timing='punch'),
    B('melee_overhead_f_built', dict(db='cmu', src='113_24', range=(1.9, 4.2), face='strike_R', set='f', root=True), dict(op='arc', model='hatchet', cut='chop'), state='S6a', gate='strike', kind='one-handed overhead chop (woman; built on her captured overhand throw)', weapon=BLADE, events='chop:R', timing='kendo'),
    # S8 weapon blocks on captured blocks (the weapon across the line of the blow)
    B('melee_block_built', dict(db='accad', src='Male2_E13_BlockRightHigh', range=(0.0, 1.9), face='mean', set='m'), dict(op='arc', model='machete', cut='block'), state='S8', gate='strike', kind='one-handed weapon block, high (built on the captured high block)', weapon=BLADE, events='block:R', timing='block', replaces=['melee_block_ual']),
    B('melee_block_f_built', dict(db='cmu', src='144_26', range=(0.6, 2.2), face='mean', set='f'), dict(op='arc', model='machete', cut='block'), state='S8', gate='strike', kind='one-handed weapon block (woman; built on her captured block)', weapon=BLADE, events='block:R', timing='block', replaces=['melee_block_ual']),
    # S6b women's two-handed strikes (no woman's capture with a two-handed weapon: built on her overhand throws)
    B('club_thrust_f_built', dict(db='cmu', src='144_20', range=(1.15, 2.05), face='strike_R', set='f'), dict(op='club2', model='bat', cut='thrust'), state='S6b', gate='strike', kind='two-handed thrust with a haft (woman; built on her captured cross, both hands on the haft)', weapon=CLUB, events='strike:R', timing='punch'),
    B('club_thrust_b_f_built', dict(db='cmu', src='113_13', range=(0.9, 3.3), face='strike_R', set='f', root=True), dict(op='club2', model='bat', cut='thrust'), state='S6b', gate='strike', kind='two-handed thrust with a haft, stepping in (woman; built on her captured committed cross)', weapon=CLUB, events='strike:R', timing='punch'),
    # S16 the woman's crouched gait (no capture of a woman walking crouched: her captured walk, lowered by IK)
    B('crouch_walk_f_built', dict(db='accad', src='Female1_B13_WalkTurnRight45', range=(5.4, 8.3), loop='gait', set='f', cycle='wide', seam_share=0.12), dict(op='crouch_gait', drop=0.22, lean=22.0, stride=0.78), state='S16', gate='carry', kind="walk crouched (woman; built: her captured walk, hips lowered and the steps shortened by leg IK)", weapon=ANY, replaces=['crouch_walk_ual']),
    # S20 surrender: hands up and open, palms forward (the man's raise is captured; the hold and the woman's are built)
    B('surrender_hold_built', STAND_M, dict(op='hands_up'), state='S20', gate='yield', kind='hands up, open, palms forward, held (built)', weapon=ANY, replaces=['surrender_idle_ual']),
    B('surrender_hold_f_built', STAND_F, dict(op='hands_up'), state='S20', gate='yield', kind='hands up, held (woman; built)', weapon=ANY, replaces=['surrender_idle_ual']),
    B('surrender_enter_built', dict(STAND_M, loop=None), dict(op='hands_up', enter=1.4), state='S20', gate='yield', kind='raising the hands into the hold (built)', weapon=ANY, timing='surrender', replaces=['surrender_enter_ual']),
    B('surrender_enter_f_built', dict(STAND_F, loop=None), dict(op='hands_up', enter=1.4), state='S20', gate='yield', kind='raising the hands into the hold (woman; built)', weapon=ANY, timing='surrender', replaces=['surrender_enter_ual']),
]

# S10 directional hit reactions (four quadrants as XCOM 2 [src], zones head and torso, legs and arms), on captured stances
HIT_DIRS = ('front', 'back', 'left', 'right')
for sx, base in (('', STAND_M), ('_f', STAND_F)):
    for d_ in HIT_DIRS:
        for z in ('head', 'torso'):
            BUILT.append(B(f'hit_{d_}_{z}{sx}_built', dict(base, loop=None), dict(op='hit', dir=d_, zone=z), state='S10', gate='hit',
                           kind=f'hit from the {d_}, {z} (built: a flinch layered on a captured stance)', weapon=ANY, timing='hit_onset',
                           replaces=['hit_chest_ual', 'hit_head_ual'], events='hit'))
    for z in ('leg_l', 'leg_r', 'arm_l', 'arm_r'):
        BUILT.append(B(f'hit_{z}{sx}_built', dict(base, loop=None), dict(op='hit', dir='front', zone=z), state='S10', gate='hit',
                       kind=f'hit on the {z.replace("_l", " (left)").replace("_r", " (right)")} (built)', weapon=ANY, timing='hit_onset',
                       replaces=['hit_chest_ual', 'hit_head_ual'], events='hit'))

JOBS = CAPTURED + BUILT

# hand-keyed stopgaps and v3 clips this set retires (the MANIFEST's `retired`), with what replaces each
RETIRED = {
    'rifle_idle_ual': 'rifle_ready_built, rifle_ready_b_built, rifle_ready_f_built (captured stances, both hands by IK on the gun)',
    'crouch_rifle_ual': 'crouch_rifle_built, crouch_rifle_f_built',
    'crouch_idle_ual': 'crouch_rifle_built, crouch_rifle_f_built; ready_crouch_cmu (unarmed)',
    'crouch_walk_ual': 'crouch_walk_cmu, crouch_walk_back_cmu (a man, captured); crouch_walk_f_built (woman)',
    'death_ual': 'physics collapse from the current pose (standard S13: no clip; the sidecar parameters in MANIFEST `plan`)',
    'hit_chest_ual': 'hit_<dir>_<zone>(_f)_built (16 directional reactions per sex) and the runtime hit layer (`layer_hit`)',
    'hit_head_ual': 'hit_<dir>_head(_f)_built',
    'hit_knockback_ual': 'stagger_* (captured) and physics (S12)',
    'hit_knockback_rm_ual': 'stagger_* (captured) and physics (S12)',
    'melee_block_ual': 'melee_block_built, melee_block_f_built (captured blocks, the weapon by IK)',
    'melee_strike_ual': 'melee_thrust_built, melee_thrust_f_built',
    'melee_slash_a_ual': 'melee_forehand_built, melee_forehand_f_built', 'melee_slash_b_ual': 'melee_backhand_built',
    'melee_slash_c_ual': 'melee_forehand_built', 'melee_combo_ual': 'melee_forehand_built + melee_backhand_built in sequence',
    'melee_idle_ual': 'fist_guard_accad / guard_f_cmu with the weapon in the hand (standard S1c)',
    'rifle_reload_ual': 'reload_rifle_built, reload_rifle_f_built', 'pistol_reload_ual': 'reload_pistol_built, reload_pistol_f_built',
    'pistol_idle_ual': 'pistol_ready_built, pistol_ready_f_built',
    'pistol_aim_ual': 'pistol_aim_built, pistol_aim_b_built, pistol_aim_c_built', 'pistol_aim_up_ual': 'pistol_aim_built (aim height by IK)',
    'pistol_aim_down_ual': 'pistol_aim_built (aim height by IK)', 'pistol_fire_ual': 'the runtime recoil layer on the pistol aim (`layer_recoil`)',
    'surrender_enter_ual': 'surrender_raise_accad (a man, captured); surrender_enter_built, surrender_enter_f_built',
    'surrender_idle_ual': 'surrender_hold_built, surrender_hold_f_built',
    'throw_overhand_ual': 'throw_overhand_m_cmu, throw_overhand_m_b_cmu (a man, captured, mirrored); the women\'s and unrecorded-sex throws',
    'fist_ready_ual': 'fist_ready_accad (captured)',
    'rifle_fire_cmu': 'the runtime recoil layer on the captured hold (`layer_recoil`; standard S4)',
    'rifle_burst_cmu': 'the runtime recoil layer on the captured hold (`layer_recoil`; standard S4)',
    'fist_cross_ual': 'fist_cross_accad, fist_cross_f_cmu, fist_cross_b_f_cmu', 'fist_hook_ual': 'fist_hook_l/r_accad, fist_body_hook_l/r_accad',
    'fist_jab_ual': 'fist_jab_accad, fist_jab_f_cmu, fist_jab_b_f_cmu', 'getup_back_ual': 'getup_back_cmu and the captured get-ups',
}


# ---------------------------------------------------------------------------------------------------------------------------
# numpy: the sources, auto ranges and events
def _sk():
    sys.path.insert(0, os.path.join(HERE, '..', '..', 'qa', 'calibration'))
    sys.path.insert(0, HERE)
    import skel, style100
    return skel, style100


def find_cmu(trial):
    s = trial.split('_')[0]
    amc = asf = None
    for d in CMU_DIRS:
        if amc is None and os.path.exists(os.path.join(d, s, trial + '.amc')): amc = os.path.join(d, s, trial + '.amc')
        if asf is None and os.path.exists(os.path.join(d, s, s + '.asf')): asf = os.path.join(d, s, s + '.asf')
    return asf, amc


def find_bvh(trial):
    for d in ACCAD_DIRS:
        p = os.path.join(d, trial + '.bvh')
        if os.path.exists(p): return p
    return None


def cmu_fps(trial):
    return 60 if trial.split('_')[0] in RATE60 else 120


def load(db, trial):
    """The source take on its actor's skeleton (skel.Motion) at its true rate."""
    skel, style100 = _sk()
    if db == 'cmu':
        asf, amc = find_cmu(trial)
        return skel.load_amc(asf, amc, cmu_fps(trial)) if asf and amc else None
    if db == 'accad':
        p = find_bvh(trial)
        return skel.load_bvh(p) if p else None
    p = os.path.join(STYLE_DIR, trial + '.bvh')
    return style100.load(p) if os.path.exists(p) else None


def _speeds(m):
    import numpy as np
    sp = {s: np.linalg.norm(np.gradient(m.P[s + 'Hand'], axis=0), axis=1) * m.fps for s in ('Left', 'Right')}
    hip = np.linalg.norm(np.gradient(m.P['Hips'], axis=0), axis=1) * m.fps
    return sp, hip


def auto_range(m, how='auto'):
    """'auto': the take's active stretch (a hand or the hips over 0.6 m/s) with 0.25 s before and 0.35 s after; 'auto1': its
    first burst of activity only; 'hold': a still stretch of 3.5 s from the take's quietest part; 'crouch_hold': the lowest
    still stretch (hips at their lowest, under 0.2 m/s)."""
    import numpy as np
    sp, hip = _speeds(m)
    act = np.maximum(np.maximum(sp['Left'], sp['Right']), hip)
    dur = (m.n - 1) / m.fps
    if how in ('auto', 'auto1'):
        on = np.where(act > 0.6)[0]
        if not len(on): return (0.0, round(dur, 3))
        a, b = on[0], on[-1]
        if how == 'auto1':
            gap = int(0.6 * m.fps); k = a
            while k < len(act) - 1 and not (act[k:k + gap] < 0.6).all(): k += 1
            b = k
        return (round(max(0.0, a / m.fps - 0.25), 3), round(min(dur, b / m.fps + 0.35), 3))
    if how == 'hold':
        w = int(3.5 * m.fps); best = None
        for i in range(0, max(1, m.n - w), max(1, int(0.1 * m.fps))):
            c = float(act[i:i + w].mean())
            if best is None or c < best[0]: best = (c, i)
        return (round(best[1] / m.fps, 3), round(min(dur, (best[1] + w) / m.fps), 3))
    if how == 'turn':
        # a walking turn: from 0.8 s before the hips' heading leaves its first value by 10 deg to 0.8 s after it comes within
        # 10 deg of its last
        l = m.P['LeftUpperLeg'] - m.P['RightUpperLeg']
        yaw = np.unwrap(np.arctan2(l[:, 0], l[:, 2]))
        y0, y1 = np.median(yaw[:int(0.5 * m.fps)]), np.median(yaw[-int(0.5 * m.fps):])
        a = int(np.argmax(np.abs(yaw - y0) > np.radians(10)))
        b = m.n - 1 - int(np.argmax(np.abs(yaw[::-1] - y1) > np.radians(10)))
        return (round(max(0.0, a / m.fps - 0.8), 3), round(min(dur, b / m.fps + 0.8), 3))
    if how == 'rise':
        # a get-up: from 1 s before the hips leave the floor (1.3 times their lowest height) to 1 s after they stand (0.9 of
        # the take's standing height)
        y = m.P['Hips'][:, 1]; lo_i = int(np.argmin(y)); lo = float(y[lo_i]); top = float(np.percentile(y, 95))
        a = lo_i
        while a > 0 and y[a] < 1.3 * lo: a -= 1
        a = lo_i
        while a < m.n - 1 and y[a] < 1.3 * lo: a += 1
        b = a
        while b < m.n - 1 and y[b] < 0.9 * top: b += 1
        st = a
        while st > 0 and y[st - 1] <= y[st] + 1e-4 and y[st] > lo: st -= 1
        return (round(max(0.0, st / m.fps - 1.0), 3), round(min(dur, b / m.fps + 1.0), 3))
    if how == 'crouch_hold':
        y = m.P['Hips'][:, 1]; low = y <= np.percentile(y, 25) + 0.03
        still = low & (np.abs(np.gradient(y)) * m.fps < 0.2) & (act < 0.8)
        best, i = (0, 0, 0), 0
        while i < m.n:
            if still[i]:
                j = i
                while j < m.n and still[j]: j += 1
                if j - i > best[0]: best = (j - i, i, j)
                i = j
            else: i += 1
        a, b = best[1] / m.fps, best[2] / m.fps
        return (round(a, 3), round(min(b, a + 3.0), 3))
    raise ValueError(how)


def events(m, kind, rng, mirror=False):
    """The clip's beats as frames of the 30 fps clip (from its first frame) and the timing measured on the capture:
    strike (impact: the hand's farthest reach from its shoulder within 0.12 s of its speed peak; onset: the last frame before
    the peak under 0.4 m/s), chop (impact: the hand's speed peak), block (contact: the forearm set, the first frame after the
    peak under 0.8 m/s), throw (release: the speed peak), dodge (the head farthest off its start), fall (impact: the hips stop
    falling after their fastest drop), lie (down: the hips under 0.25 m), rise (stand: the hips at 0.9 of their final height)."""
    import numpy as np
    if not kind or kind == 'hit': return {}, {}
    a, b = (int(round(rng[0] * m.fps)), min(m.n, int(round(rng[1] * m.fps))))
    f = m.fps; to30 = lambda i: int(round((i - a) * 30.0 / f))
    sp, hip = _speeds(m)
    k, _, side = kind.partition(':')
    if side and mirror: side = {'L': 'R', 'R': 'L'}[side]
    S = {'L': 'Left', 'R': 'Right'}.get(side, '')
    out, tm = {}, {}
    if k in ('strike', 'chop', 'block', 'throw'):
        v = sp[S][a:b]; pk = a + int(np.argmax(v))
        on = pk
        while on > a and sp[S][on] > 0.4: on -= 1
        if k in ('chop', 'throw'):
            # a swing's movement onset (R17: from movement onset to impact) is the start of its backswing: from the turn at
            # the top (the hand's slowest moment 0.1-0.6 s before its peak), back to the slowest moment before it (within
            # 1 s); a take of repeated swings has no rest between them
            w0, w1 = max(a, pk - int(0.6 * f)), max(a + 1, pk - int(0.1 * f))
            top = w0 + int(np.argmin(sp[S][w0:w1]))
            w0 = max(a, top - int(1.0 * f)); w1 = max(w0 + 1, top - int(0.1 * f))
            on = w0 + int(np.argmin(sp[S][w0:w1])) if w1 > w0 + 1 else top
        if k == 'strike':
            reach = np.linalg.norm(m.P[S + 'Hand'] - m.P[S + 'UpperArm'], axis=1)
            w0, w1 = max(a, pk - int(0.12 * f)), min(b, pk + int(0.12 * f) + 1)
            imp = w0 + int(np.argmax(reach[w0:w1]))
            out['impact'] = [to30(imp)]; tm = {'onset_s': round((on - a) / f, 3), 'beat_s': round((imp - a) / f, 3), 'span_s': round((imp - on) / f, 3)}
        elif k == 'chop':
            out['impact'] = [to30(pk)]; tm = {'onset_s': round((on - a) / f, 3), 'beat_s': round((pk - a) / f, 3), 'span_s': round((pk - on) / f, 3)}
        elif k == 'block':
            c = pk
            while c < b - 1 and sp[S][c] > 0.8: c += 1
            out['contact'] = [to30(c)]; tm = {'onset_s': round((on - a) / f, 3), 'beat_s': round((c - a) / f, 3), 'span_s': round((c - on) / f, 3)}
        else:
            out['release'] = [to30(pk)]; tm = {'onset_s': round((on - a) / f, 3), 'beat_s': round((pk - a) / f, 3), 'span_s': round((b - a) / f, 3)}
        tm['peak_mps'] = round(float(sp[S][pk]), 2)
    elif k == 'step':
        # a side step: the first foot to lift (its toe over 2.5 cm above its own floor) to its touchdown
        best = None
        for s_ in ('Left', 'Right'):
            y = np.minimum(m.P[s_ + 'Foot'][:, 1], m.P[s_ + 'Toes'][:, 1]); fl = float(np.percentile(y[a:b], 10))
            up = np.where(y[a:b] - fl > 0.025)[0]
            if not len(up): continue
            i0 = a + int(up[0]); i1 = i0
            while i1 < b - 1 and y[i1] - fl > 0.025: i1 += 1
            if best is None or i0 < best[0]: best = (i0, i1)
        if best:
            out['lift'] = [to30(best[0])]; out['set'] = [to30(best[1])]
            tm = {'onset_s': round((best[0] - a) / f, 3), 'beat_s': round((best[1] - a) / f, 3), 'span_s': round((best[1] - best[0]) / f, 3)}
    elif k == 'dodge':
        hd = m.P['Head'][a:b] - m.P['Head'][a]; d = np.linalg.norm(hd[:, [0, 2]], axis=1) + np.abs(hd[:, 1])
        i = a + int(np.argmax(d))
        mv = np.linalg.norm(np.gradient(m.P['Head'], axis=0), axis=1) * f
        on = a
        while on < i and mv[on] < 0.3: on += 1
        out['clear'] = [to30(i)]; tm = {'onset_s': round((on - a) / f, 3), 'beat_s': round((i - a) / f, 3), 'span_s': round((i - on) / f, 3)}
    elif k == 'fall':
        y = m.P['Hips'][:, 1]; vy = np.gradient(y) * f
        i0 = a + int(np.argmin(vy[a:b])); i = i0
        while i < b - 1 and vy[i] < -0.3: i += 1
        rel = a
        while rel < i0 and vy[rel] > -0.3: rel += 1
        # release: the last frame the hips stood near their start height
        out['impact'] = [to30(i)]; tm = {'onset_s': round((rel - a) / f, 3), 'beat_s': round((i - a) / f, 3), 'span_s': round((i - rel) / f, 3)}
    elif k == 'lie':
        y = m.P['Hips'][a:b, 1]; i = a + int(np.argmax(y < 0.25)) if (y < 0.25).any() else b - 1
        out['down'] = [to30(i)]; tm = {'beat_s': round((i - a) / f, 3), 'span_s': round((b - a) / f, 3)}
    elif k == 'rise':
        y = m.P['Hips'][a:b, 1]; top = float(np.percentile(y[-max(3, int(0.3 * f)):], 50))
        i = a + int(np.argmax(y >= 0.9 * top))
        out['stand'] = [to30(i)]; tm = {'beat_s': round((i - a) / f, 3), 'span_s': round((b - a) / f, 3)}
    return out, tm


def plan():
    """Every job's range (auto ones resolved), its events and measured timings, from its source."""
    res = []
    for d in JOBS:
        d = dict(d)
        m = load(d['db'], d['src'])
        if m is None:
            d['missing'] = True; res.append(d); continue
        r = d.get('range')
        if r is None: r = (0.0, round((m.n - 1) / m.fps, 3))
        elif isinstance(r, str): r = auto_range(m, r)
        d['range'] = [float(r[0]), float(r[1])]
        if d['db'] == 'cmu':
            subj = d['src'].split('_')[0]
            if subj in LABEL and 'sex' not in d: d['sex'], d['sex_source'] = LABEL[subj]
        ev, tm = events(m, d.get('events'), d['range'], d.get('mirror'))
        if ev: d['events_frames'] = ev
        if tm: d['timing_measured'] = tm
        d['src_fps'] = round(m.fps, 3)
        d['stature_est_m'] = m.meta.get('stature_est')
        res.append(d)
    return res


if __name__ == '__main__':
    a = sys.argv[1:]
    if a and a[0] == 'plan':
        p = plan()
        json.dump(p, open(a[1], 'w'), indent=1)
        miss = [d['name'] for d in p if d.get('missing')]
        print(f'{len(p)} jobs ({sum(1 for d in p if d.get("built"))} built), missing sources: {miss}')
        for d in p:
            if d.get('events_frames') or d.get('timing_measured'):
                print(f"  {d['name']:28s} {d['range']} {d.get('events_frames')} {d.get('timing_measured')}")
