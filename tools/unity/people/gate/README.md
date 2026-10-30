# The plausibility gate (docs/PEOPLE_REALISM.md)

Every person the game makes is held to real people of their sex, ancestry and age.

Data (fetched, not shipped):
- ANSUR II (US Army 2012, public domain): `ANSUR_II_MALE_Public.csv`, `ANSUR_II_FEMALE_Public.csv` from
  https://tools.openlab.psu.edu/publicData/ -> `ansur_stats.py` -> `ansur_stats.json` (committed).
- FairFace (Kärkkäinen and Joo 2021, CC BY 4.0): HuggingFaceM4/FairFace `0.25/validation-*.parquet` ->
  `fairface_stats.py` -> `fairface_stats.json` (committed; per group the ratios' percentiles, covariance and the
  neutral faces nearest the median for the reference boards).

Landmarks: MediaPipe Face Landmarker (Apache 2.0) in a venv (`pip install mediapipe pyarrow`; the model
`face_landmarker.task` from storage.googleapis.com/mediapipe-models). In a container without EGL, build stub
`libEGL.so.1` / `libGLESv2.so.2` exporting the symbols `libmediapipe.so` imports (all returning 0; the CPU path never
calls them) and run with `LD_LIBRARY_PATH` pointing at them.

Run:
1. `tools/unity/editor.sh test playmode "SecondFace.Tests.PeopleGateTests"`: measures every person (test-results/
   people_measures.json, heads/*.bin, portraits/*.png) and the sculptor shapes' responses (heads/resp_*.bin).
2. `faces2d.py <unity/test-results> <face_landmarker.task>`: the portraits' landmark proportions.
3. `gate.py <unity/test-results>`: the verdict (people_gate.json; exit 1 if anyone fails). Joint checks calibrated on
   real people (docs/PEOPLE_REALISM.md §13): 3D, the head and neck measures given the stature within the distance that
   holds 97.5 % of the ANSUR group; 2D, the proportions, the whole shape and (after step 8) the apparent age at one
   coverage that 97.5 % of FairFace's faces at rest pass; it prints the real pass rates it was calibrated to. Single
   measures outside the real percentiles are notes.
4. `board.py <unity/test-results> <validation.parquet> <out.jpg> [ids]`: the reference boards for the owner.
5. `response.py <unity/test-results>`: the response of each measure to each shape (`response.json`).
6. `response2d.py <unity/test-results>`: the face proportions' response (`response2d.json`). Both response scripts refit
   on the rendered people (`--extra dir,dir` adds earlier rounds, each laid out as test-results).
7. `gen_core.py`: writes Core's table `Core/Npc/ProportionsData.cs` from `response*.json`, `ansur_stats.json` and
   `fairface_stats.json`. Core `Proportions` then solves every adult to real measures (docs/PEOPLE_REALISM.md §8).
8. `apparent.py <models dir> <validation.parquet> <unity/test-results> [--pad 0.05|0.6]` (venv, `python -I`): apparent age
   and sex by Levi & Hassner's Adience networks (ONNX model zoo `age_googlenet.onnx`, `gender_googlenet.onnx`), real
   FairFace against ours (docs/PEOPLE_REALISM.md §12); writes people_apparent.json (ours and every real face's reading),
   which the gate's age rule reads: run it before step 3.
10. `contrast.py <face_landmarker.task> <validation.parquet> <unity/test-results>` (venv, `python -P -E`: `-I` drops the user
   site mediapipe's drawing utilities import from): facial contrast, how much darker the eyes, brows and lips are than the
   skin round them and how much redder the lips, on FairFace's faces at rest and on ours, by sex and age (Russell 2009;
   Porcheron, Mauger and Russell 2013; docs/PEOPLE_REALISM.md §14); writes people_contrast.json.
9. `PeopleGateTests.HairCloseups` (`SF_HAIR_IDS=cluster_sex_age_k,...`; `SF_HAIR_PARTS=1`; `SF_HAIR_GREY`): heads at
   0.95 m from three sides into test-results/hair, for judging hair and beards up close.

Measures (`measure.py`): head breadth and length, cheek width, face height (sellion to menton, menton found on the midline
section, not at the throat), eye spacing, neck girth 3.5 cm under the menton, tragion to top of head, vertex to
suprasternale; stature from Unity. The gate does not hold stature itself (the people's own, from their peoples' real
statures; ANSUR's tails are cut by enlistment standards), nor proportions to stature beyond ANSUR's statures.

Real faces (R3, docs/PEOPLE_REALISM.md §13): `fairface_shapes.py <validation.parquet> <face_landmarker.task>` measures
FairFace's frontal adults' whole shapes (`shapes.py`: 69 landmarks, aligned) -> `fairface_shapes.json`; `faces_fit.py
<unity/test-results> --lam 0.1` (after a run with the one-slider response portraits) fits each face at rest in our
sculptor's basis -> `faces_fit.json`; `gen_core.py` then also writes Core's `FacesData.cs` (the fitted faces, the
sliders' real ranges, the 2D gate's model), from which Core `RealFaces` draws every adult's face.
