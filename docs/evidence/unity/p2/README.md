# P2 bake-off — final engine captures (2026-10-29)

Downscaled to 1280 px wide (JPEG 85) from `unity/Screenshots` after the last full local run (95 EditMode + 13
PlayMode tests green). The verdict is in `docs/PORT.md` §5; each capture is judged against
`docs/BUILD_PLAN_V1.md` §6.N.

| Capture | What it shows | Verdict against §6.N |
|---|---|---|
| `materials_sheet` | every library surface on a sphere and a block | passes (PBR, lit, no black materials) |
| `terrain_wide` | the terrain test: layers, a pillar for scale | **fails "no visible tiling"**: the sand repeats; P3.2 (detail noise, height blend) |
| `place_shelter_ring`, `place_shelter_corridor` | the shelter kit assembled, lamps lit | passes as a kit test; decals and wear are P3.5 |
| `place_frontier_square`, `place_frontier_eye` | the frontier kit as a town, people in it | passes as a kit test; walls too clean (decals, P3.5) |
| `vegetation_iso`, `vegetation_teeth` | the Sallow's scatter; pines on the Teeth | trees pass; the Sallow's scatter is sparse (P3.4) |
| `trees_lineup` | the nine card trees | passes |
| `people_lineup`, `people_motion_0` | six people standing and walking | heights, builds, ages and skin vary; the walk holds the forearms forward (P4.4) |
| `portrait_p1`…`p6` | the six faces | faces pass; p2's braid sweeps across the brow like a fringe and p6's hood reads as a cap (P4 hair and garments); hair cards read as shells up close |
