# Body geometry audit of the Rocketbox bases against real people (T5 measures, 2026-11-17)

Gate: **red, 55** (verdict 63a0e244). Track T5 of `docs/MOTION_ROOT_CAUSE.md`, measures only: each base's own mesh (its
Rocketbox FBX, clothes baked in, in its bind pose) measured where a hanging arm meets the body, against ANSUR II (US Army
2012, public domain; 4,082 men, 1,986 women) by sex, each real measure scaled to the base's stature. 79 bases (54 men, 25
women). Tool: `tools/qa/calibration/body_geometry.py` (Blender dump of the FBX, read-only on `unity/`; numpy audit).
Numbers for every base: `docs/qa/body_geometry_audit.json`. No base was changed or withdrawn.

## 1. How it is measured

- **Shoulder joint (sx)**: the UpperArm bone's head, its offset from the midline (the pelvis). Real: the glenohumeral
  joint centre taken as half the biacromial breadth less 2.0 cm (the acromion's edge lies lateral of the joint centre by
  about 1.5-2.5 cm: Meskers et al. 1998; Campbell et al. 2009).
- **Waist at the elbow**: the trunk's breadth (the mesh cut by a level plane; triangles with no vertex weighted over 0.5
  to an arm bone) at the height the elbow has when the arm hangs (the joint's height less the upper arm's length). Real:
  ANSUR waist breadth (at the omphalion, where a hanging elbow is).
- **Hips at the wrist**: the same cut at the hanging wrist's height (hips and thighs). Real: ANSUR hip breadth.
- **Chest depth**: the cut's front-to-back at ANSUR's chest height (by sex, as a share of stature). The chest's breadth is
  reported but not judged: in Rocketbox's A-pose the cut at the nipples takes in the armpit and the inner sleeve's skin,
  weighted to the trunk.
- **Upper arm with its sleeve**: the mean distance of the arm's own vertices from the bone's axis over its middle third.
  Real: ANSUR flexed biceps circumference / 2π (a tensed arm, so an upper bound) plus a jacket's radial ease (1.6 cm at
  most, `docs/PEOPLE_MOTION.md` §2.6).
- **Least hang**: the smallest upper-arm angle from vertical at which the arm clears the body: the elbow's inner side past
  the waist (an elbow radius of 3.5 cm for men and 3.0 for women; for the bases also with their own sleeve, 0.8 of its
  mid-arm thickness), and the straight arm's wrist (2.5 cm) past the hips. Real people from ANSUR the same way.

## 2. The bases asked for, and three typical men as controls

| Base | Stature cm | sx cm | Waist at the elbow cm (real p50; p98 at this stature) | Hips at the wrist cm | Joint outside the waist cm | Upper arm with sleeve cm | Chest depth cm (real p98) | Least hang °: nude elbow / with its sleeve / wrist |
|---|---|---|---|---|---|---|---|---|
| Construction_Male_02 | 184 | 21.0 | **41.5** (34.2; 42.1) | 39.8 | **0.3** | 7.5 | 29.5 (32.3) | 6 / **16** / 1 |
| cap_Police_Male_03n | 181 | 21.0 | **41.1** (33.7; 41.4) | 37.0 | **0.5** | **8.8** | 29.7 (31.8) | 6 / **17** / 0 |
| cap_Military_Male_03n | 180 | 21.0 | **39.9** (33.5; 41.2) | 43.1 | **1.1** | 7.3 | **39.6** (31.6) | 5 / **14** / 3 |
| Business_Male_06 | 181 | 21.0 | 35.6 (33.6; 41.3) | 36.2 | 3.2 | 6.6 | 25.9 (31.7) | 0 / 8 / 0 |
| cap_PM02m | 180 | 21.0 | **42.1** (33.4; 41.0) | 44.1 | **0.0** | 5.4 | 30.3 (31.5) | 7 / **14** / 4 |
| Male_Adult_05 | 181 | 21.0 | **42.1** (33.7; 41.4) | 44.1 | **0.0** | 5.4 | 29.9 (31.7) | 7 / **14** / 4 |
| Male_Adult_11 (control) | 180 | 21.0 | 32.5 (33.5; 41.2) | 35.4 | 4.8 | 5.6 | 25.6 (31.6) | −3 / 3 / −1 |
| Sports_Male_04 (control) | 180 | 21.0 | 32.1 (33.5; 41.2) | 34.7 | 5.0 | 5.9 | 25.8 (31.6) | −3 / 3 / −1 |
| Male_Adult_16 (control) | 181 | 21.0 | 32.4 (33.6; 41.3) | 37.0 | 4.8 | 6.3 | 26.3 (31.7) | −3 / 4 / 0 |

Real men (ANSUR, nude): the joint stands outside the waist by −0.9 / 2.5 / 5.6 cm (p2 / p50 / p98); the least hang is
−1.2 / 1.9 / **7.9°**; with a jacket's ease added at the elbow, about 11° at p98. Real women: 1.3 / 4.4 / 11.0°.

(cap_PM02m and Male_Adult_05 measure identically: the same mesh. So do rel_MA15s and cap_Military_Male_02n,
cap_Military_Male_05n and cap_DM01s, rel_MA21pk, cap_MA17k and Business_Male_05, rel_MA19k and Police_Male_07, rel_FA10k
and Business_Female_04, rel_FA06k and Medical_Female_02.)

## 3. Findings

1. **One skeleton for every man, another for every woman.** All 54 male bases put the shoulder joints 21.0 cm from the
   midline with a 28.6 cm upper arm; all 25 women 17.2 cm. Real men's joint offset is 16.9 / 18.8 / 20.9 cm (p2 / p50 / p98;
   17.6-21.2 at Rocketbox's 180-185 cm statures): the male skeleton sits at real men's 98th percentile, the women's (real
   14.5 / 16.2 / 18.2) near their 85th. **The skeleton fit does not put the shoulder too far in**; it is wide, and the same
   for the slim and the broad. Real people barely differ there either: in ANSUR, at a given stature, a man's joint offset
   rises only 0.08 cm per cm of waist breadth (women 0.03; correlation 0.40 and 0.25), so a real man with a 41 cm waist
   has his shoulder joints under 1 cm further out than a slim one.
2. **The A1 bases are the broadest trunks at the elbow**: Construction_Male_02 41.5, cap_Police_Male_03n 41.1,
   cap_Military_Male_03n 39.9, cap_PM02m and Male_Adult_05 42.1 cm, at or past real men's 98th percentile for their stature
   (41.0-42.1), against 32-33 for the controls. Their joints stand 0.0-1.1 cm outside the waist (controls 4.8-5.0; real
   median 2.5). Their baked gear adds to it: belts and pouches at the waist (Police, Military), a vest (Construction).
3. **Bare, these trunks are inside real men's range; with their sleeves they are not.** A bare elbow clears their waists at
   5-7° (real men at most 7.9°). With their own sleeves the arm must stand 14-17° out: Construction_Male_02 16°,
   cap_Police_Male_03n 17°, cap_PM02m and Male_Adult_05 14°, cap_Military_Male_03n 14°; a real man in a jacket at most
   about 11°; the controls 3-4°. Against the gate's A1 at ≤ 20° (p98), with the arm's own rest angle and sway on top, these
   bodies leave a hanging arm 3-6° of room where a real man has 9-18°. That is the geometric root of the 21 A1 failures on
   three of these men: broad waists at real men's edge, plus sleeves and gear no real garment would stack on them; their
   motion is not the cause.
4. **Thick sleeves**: cap_Police_Male_03n's upper arm with its sleeve is 8.8 cm round the bone, past a real tensed arm in a
   jacket (8.5); Business_Male_03, Medical_Male_02 and cap_Fire_Male_07n are at 8.1-8.5.
5. **Baked gear deeper than any chest**: cap_Military_Male_03n 39.6 cm and cap_Military_Male_02n / rel_MA15s 36.7 cm chest
   depth (real men p98 ~31.6), cap_Fire_Male_07n 41.7: the gear (a pack or plate carrier), not a body.
6. **Other bases a hanging arm must stand 10° or more out for** (men; real p98 7.9): Medical_Male_02 14, Police_Male_06 13,
   Construction_Male_07 12, Construction_Male_08 12, cap_DM01s / cap_Military_Male_05n 12, cap_Police_Male_05n 12,
   Gardener_Male_01 12, cap_Fire_Male_07n 12, Male_Adult_04 11, Business_Male_07 11, Construction_Male_05 11,
   cap_Police_Male_01n 11, cap_Security_Male_01n 11, cap_Military_Male_02n 10. Women (real p98 11.0): Medical_Female_03 12.
7. **Slim women narrower than real women at the waist**: Female_Adult_01/03/07/08/11/13/17, Sports_Female_02,
   Business_Female_04 (23.4-26.0 cm against a real p2 of about 25-26 at their statures) — not a motion problem, a note for
   the plausibility gate.

## 4. What this means for T3-T5 (for the main session)

- The broad bases' bare trunks are inside real men's range (just), so a skeleton refit is not what the measures call for:
  moving their shoulder joints out would make them wider than real men of that build (ANSUR: +0.08 cm of joint per cm of
  waist). What is outside real people is the cloth and gear: sleeves 7.3-8.8 cm round the bone and belts, pouches or a
  carrier at the waist. Reducing them to real garments' thickness (a jacket stands 1.0-1.6 cm off the body, §2.6 of
  `docs/PEOPLE_MOTION.md`) brings the least hang from 14-17° towards real men's ≤ 11°. Withdrawing a base because it fails
  the motion gate is ruled out (`docs/MOTION_ROOT_CAUSE.md` T5).
- T4 (flesh and cloth that give): a real arm resting on a real waist presses 1-2 cm in; at 0-1 cm of joint margin these
  bases need it more than any.
- The limits stay: A1's ≤ 20° is at real people's top in quiet standing (`docs/qa/motion_calibration.md` §3.1).

## 5. Limits of this audit

- Bind meshes, before the game's Proportions (its calibrated sliders scale bodies at runtime) and its garment layers:
  a person the game makes from a base differs from these numbers by those.
- ANSUR measures minimally clothed soldiers (enlistment standards cut its tails); the bases wear their clothes.
- The shoulder's outer skin beyond the joint was measured (the json's "shoulder skin beyond the joint"), but in the A-pose
  the cut at the joint's height catches the shoulder's cap, not the deltoid's widest point that ANSUR's bideltoid breadth
  takes with the arms hanging, so it reads 1-3 cm short for most men and is not judged; padded shoulders (cap_DM01s,
  cap_Military_Male_02n/05n, rel_MA15s) read 10 cm, past real people's 9.3.
- The joint centre from the biacromial breadth (−2.0 cm each side) is an estimate (±0.5-1 cm).

Sources: ANSUR II public data (Gordon et al. 2014, US Army Natick; `tools/unity/people/gate/README.md`); Meskers CGM et al.
(1998) In vivo estimation of the glenohumeral joint rotation center from scapular bony landmarks by linear regression, J
Biomech 31:93-96; Campbell AC et al. (2009) Validation of a new method for estimating the glenohumeral joint centre.
