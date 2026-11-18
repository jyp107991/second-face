# Do broad or heavy people hold their arms further out? Evidence for a build-dependent A1 / W3 (2026-11-18)

Gate: **red** (6460 measures past their limits; the verdict is stale). This is research only: it changes no limit and no
file the gate hashes. It asks whether real people with broad trunks or a high BMI hang and swing their arms with more
abduction, and if so by how much per centimetre of a body dimension the game can measure.

## 1. What the evidence says

- **No peer-reviewed gait study reports shoulder abduction for obese against normal-weight adults.** The classic obese-gait
  papers (Spyropoulos 1991; Lai 2008) and the mechanical-work study (Fernández Menéndez 2020) report only the lower body or
  the work done. A wider search (Europe PMC, the web) found nothing more. The Consensus search tool could not be used
  because its monthly quota was used up.
- **Rest, seated (peer-reviewed, small):** Cau et al. 2017 measured the arm's lowest angle (LE-MIN, from the lab
  vertical, arms along the body). In obese women it was **22.6°** (median; IQR 5.4) against **13.1°** (IQR 6.4) in
  normal-weight women, p < 0.05. That is **+9.5°** for BMI 42 against 21, or about 0.46° per BMI unit. ANSUR II puts
  waist breadth at 0.75 cm per BMI unit, so this is about **0.6° per cm of waist breadth**.
- **Walking, men (a PhD thesis, not peer-reviewed):** Shewhorak 2018 motion-captured 28 men (21 with measurements;
  BMI 19-34, 45-115 kg). He fitted mean arm abduction = −31.42 + 39.97 × chest circumference (m), r² = 0.486, so
  **0.40° per cm of chest** (95% CI about 0.20-0.60, my calculation from r² with n = 21). In ANSUR II men of the same
  stature, chest rises 2.15 cm per cm of waist breadth, which gives **0.86° per cm of waist breadth (0.43-1.29)**. His
  sagittal swing against body fat (r² = 0.089) is not significant (p ≈ 0.19).
- **Mechanism (peer-reviewed):** Park et al. 2010 studied 20 obese and 20 non-obese men. Obese men lost shoulder
  *adduction* range, by up to 38.9%, from "mechanical interposition" of fat. The full text is paywalled, so I could not
  check the angles. Cerfoglio 2023 and Cau 2017 found that obese people's lateral-raise range shrinks, partly because the
  arm's lowest angle is higher.
- **Geometry (ANSUR II, primary data; method of `body_geometry_audit.md`):** this is the smallest upper-arm angle at
  which a bare elbow clears the waist, for men 176-186 cm tall.

  | Men 176-186 cm | Waist breadth | BMI | Chest circumference | Smallest angle that clears the waist (p50 / p98) |
  |---|---|---|---|---|
  | Typical (n = 533) | 31-34 cm | 26.6 | 105 cm | 1.3° / 4.5° |
  | Broad (n = 56; like the game's five) | 39.5-42.5 cm | 35.5 (33-39) | 121 cm | 6.8° / 10.1° |

  Across all men this angle rises **0.75° per cm of waist breadth**.
- **How a shift reaches the gate (measured on the project's own real captures):** I pushed each upper arm out by Δ in
  the frontal plane and kept the sagittal swing. Quiet-standing **A1 p98 rises by 0.87 Δ** (median of 9 segments). Walking
  **W3 p98 rises by only 0.28 Δ** (median of 11 segments; range −0.17 to 0.67), because W3's p98 comes from the
  forward and back peaks of the swing. Script: `/tmp/claude-0/-home-user/891e7928-2458-548c-9e38-7a3ba8987a12/scratchpad/scripts/shift_transfer.py`.

## 2. Answers

**(a) Is there a case for a build-dependent limit?**
- **A1: yes, with moderate-to-weak evidence.** Three independent lines agree on the direction and roughly on the size,
  0.6-0.9° of outward arm per cm of waist breadth past the median: one small seated study of women, one men's walking
  thesis, and the clearance geometry. No study has measured quiet standing in heavy men.
- **W3: only through its frontal part.** Nothing shows that heavy people swing further forward or back. They walk more
  slowly, which shrinks the swing. Applied to W3's p98, the shift is small.

**(b) Proposed limits**
- Definitions:
  - *e* = max(0, trunk breadth at the hanging elbow − ANSUR men's median at that stature), in cm. The median is
    33.4-34.2 cm at 180-184 cm.
  - *k* = 0.75° per cm. This is the centre of 0.61 (Cau), 0.75 (geometry) and 0.86 (Shewhorak). Its range is 0.43-1.29,
    the only formal confidence interval (Shewhorak's).
- Formulas:
  - **A1 ≤ 20 + 0.87·k·e = 20 + 0.65 e** (conservative, at the lower end of *k*: 20 + 0.37 e).
  - **W3 ≤ 35 + 0.28·k·e = 35 + 0.21 e** (conservative 0.12 e; generous 0.36 e).
- Validity: only up to the edge of the data, *e* ≤ about 9 cm (BMI ≤ about 39). Women's limits would need their own
  reference.

**(c) The five broad men** (*e* = 6.4 Military_03n, 7.3 Construction_02, 7.4 Police_03n, 8.4 Male_Adult_05, 8.7 PM02m)

| Limit | Central | Conservative | Measured | Verdict |
|---|---|---|---|---|
| A1 | 24.2-25.7 | 22.4-23.2 | 20.0-22.6 | **Pass** at the central value. At the conservative value all pass unless the 22.6 belongs to the Military man (limit 22.4). |
| W3 | 36.3-36.8 | 35.8-36.0 | 36.0-37.2 | **Not reliably.** 36.0 passes; **37.2 fails under any pairing at the central value**. All pass only at the generous end of *k* (37.3-38.1), or with the base limit taken as 36. |

- Consistency: the game's push raises A1 from the slim actor's 16.4° (left) to 20.0-22.6°, a rise of 3.6-6.2°. The rise
  predicted for a real man this broad is 4.2-5.7°. On A1, the broad men behave like real broad men.
- On W3, the overshoot sits in the frontal component. cap_Police_Male_03n's walking abduction is p50 16-17°. Real
  walkers sit at p50 6.7°; adding the build shift (+6.3°, 3.2-9.5) predicts about 13.0° (9.9-16.2). His arm is held out at
  or past the top of what real broad men show.
- An honest W3 limit therefore needs this: judge the abduction component against real walkers plus 0.75 e, and leave the
  sagittal swing as it is. It should not be a looser W3.

## Sources

| # | Source | Population | Measure, with the numbers | Body dimension | Peer-reviewed |
|---|---|---|---|---|---|
| 1 | Cau N, Cimolin V, et al. 2017, *Med Lav* 108:455-465, [doi:10.23749/mdl.v108i6.6339](https://doi.org/10.23749/mdl.v108i6.6339) ([PDF](https://www.mattioli1885journals.com/index.php/lamedicinadellavoro/article/download/6339/4686)) | 15 obese women (BMI 42.1 ± 9.1, 108 kg) vs 13 normal-weight women (21.4 ± 2.8), seated | Lowest frontal arm angle: 22.56° (IQR 5.4) vs 13.05° (6.44)\*. Highest angle 152.7 vs 157.4\*. Frontal-elevation lowest angle 12.2 vs 9.1\* | BMI, weight | Yes |
| 2 | Shewhorak S. 2018, PhD thesis, Teesside Univ., [record](https://research.tees.ac.uk/en/studentTheses/a-data-driven-approach-to-motion-diversification-over-increases-i/); numbers from the 2022 slides, [Zenodo 8069057](https://zenodo.org/records/8069057) | 28 men walking (21 listed; BMI 19-34, 45-115 kg, 1.56-1.96 m) | Mean arm abduction in walking = −31.42 + 39.97 × chest circumference (m), r² 0.486. Swing = 18.76 + 0.29 × body fat %, r² 0.089 | Chest circumference, body fat %, waist-to-hip ratio | **No** (a thesis; the angle's definition is not seen) |
| 3 | Park W, et al. 2010, *Ergonomics* 53:102-108, [doi:10.1080/00140130903311617](https://doi.org/10.1080/00140130903311617) | 20 obese vs 20 non-obese men | Shoulder adduction and extension range reduced, by up to 38.9% (left adduction), from fat interposition. Angles not seen (paywalled) | Obese / non-obese | Yes |
| 4 | Cerfoglio S, et al. 2023, *Sensors* 23:9264, [doi:10.3390/s23229264](https://doi.org/10.3390/s23229264) | 23 obese (BMI 41.6) vs 30 healthy-weight (22.3), seated | Lateral-raise range 99.9 ± 25.5° vs 119.4 ± 21.3° (motion capture). Start angle not reported | BMI | Yes |
| 5 | Matuszewska A, Syczewska M. 2023, *Gait Posture*, [doi:10.1016/j.gaitpost.2022.12.004](https://doi.org/10.1016/j.gaitpost.2022.12.004) | 50 healthy walkers, 5 speeds | Names obesity as a factor in arm swing. No BMI numbers in the abstract; full text not reached | BMI | Yes (weak for this question) |
| 6 | Lai PP, et al. 2008, *Clin Biomech* 23 S1:S2-6, [doi:10.1016/j.clinbiomech.2008.02.004](https://doi.org/10.1016/j.clinbiomech.2008.02.004); Spyropoulos P, et al. 1991, *Arch Phys Med Rehabil* 72:1065-1070, [record](https://www.semanticscholar.org/paper/06ce7fc39166677f84cb8092e09d77568d9bafb0) | 14 + 14 adults (BMI 33.1 vs 21.3); 12 obese men vs controls | Lower body only; **no arm data** | BMI | Yes |
| 7 | Fernández Menéndez A, et al. 2020, *J Appl Physiol* 129:194-203, [doi:10.1152/japplphysiol.00837.2019](https://doi.org/10.1152/japplphysiol.00837.2019) | 11 class-III obese (BMI 43) vs 13 lean adults | Internal work per kg is the same; **no arm angles** | BMI | Yes |
| 8 | ANSUR II (US Army 2012, public domain), [openlab.psu.edu/ansur2](https://www.openlab.psu.edu/ansur2/) | 4,082 men | Waist breadth, chest circumference, biacromial breadth, shoulder-elbow length, BMI: the geometry and conversions above | Waist breadth, chest circumference | Survey data |

\* p < 0.05 (Mann-Whitney). Medians (IQR) in source 1; mean ± SD elsewhere.
