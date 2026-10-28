# Unity redesign — local evidence (P2 bake-off)

Cycles sanity renders of the assets the pipelines produce, made in the session scratch from the same files the Unity
project imports (`unity/Assets/SecondFace/...`). They check geometry, fit, texture binding and the baked looks; the
engine's own captures (`Unity-screenshots` CI artifact, PlayMode `ScreenshotTests`) are the record of how Unity renders
them. Downscaled JPEGs; nothing here is story content.

| File | What it shows |
|---|---|
| `people_lineup.jpg` | The six bake-off people (`People/Bakeoff`, candidate A: MakeHuman base re-authored) dressed under the wardrobe rule: every garment re-baked by `bake_cloth` (re-dyed, grimed, faded, patched, taped). |
| `portrait_p1..p6.jpg` | Portrait distance: face targets (age, build, ancestry), skin at 2 K, fitted eyes, brows, lashes, hair. |
| `nature_close.jpg` | The baked CC0 nature models (`Models/Nature`, 2–9 K triangles each) at scatter scale. |
| `nature_grid.jpg` | The same set with the scanned ground patches (rock beds wider than 6 m, placed deliberately, not scattered). |
| `shelter_corridor.jpg`, `shelter_hatch.jpg`, `shelter_ring.jpg` | The shelter kit (`Kits/Shelter`, 20 pieces) assembled as the test place, library materials bound by slot. |

The outfits are bake-off silhouettes; authored garments (coats, ponchos, rigs, plating) follow in P4 under the same
rule (`docs/DESIGN_UNITY.md` §4).
- `people_hair_eyes_before_after.jpg` — **engine captures** (Unity, local editor, 2026-10-28): the six test people's
  portraits before and after the hair rule (crop, buzz and balding painted into the skin; a work braid; a tidy bun
  for the rich; long hair under a dust hood), the eye fix (cornea shell dropped, Blender's normals imported), the
  weathered skin (sun, dirt in the creases, chapped lips, stubble, matte where it should be) and the jaw fix.
