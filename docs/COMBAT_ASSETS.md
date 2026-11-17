# Combat assets staged (2026-11-17) — for `docs/COMBAT.md` §A

Staged outside the repo in `/home/user/second-face-staging/combat/` (128 MB): `clips/` (69 FBX + sidecar json, the
project's motion conventions: Mecanim bone names, 30 fps, frame 0 a true T-pose, -Z forward/Y up), `weapons/<name>/`
(13 weapons: FBX in metres, origin at the main-hand grip, +Z forward, nulls `grip_main grip_off muzzle|tip butt mag`,
URP-ready BaseColor/Normal/Mask), `sheets/` (contact sheets per clip at the game camera and side, `weapons_sheet.png`,
`measures_summary.json`: offline gate-style measures on the source skeletons — not the game's gate), `raw/` (downloads +
`DOWNLOADS.sha256`), `tools/` (the converters: `ual2fbx.py`, `amc2fbx.py`, `bvh2fbx.py`, `author.py`, `weapons.py`,
`sheets.py`, `report_tables.py`; Blender `-b --factory-startup`). Nothing is in the Unity project yet.

## Sources and licences
| Source | Licence | Used |
|---|---|---|
| Quaternius Universal Animation Library 1 and 2 (Standard), opengameart.org | CC0 1.0 | pistol set, melee, punches, hits, crouch, throw, death, get-up (26 hand-keyed clips) |
| CMU Graphics Lab Motion Capture Database | free incl. commercial products; no resale of the data itself | 79_96, 80_03, 79_01, 113_24, 140_01/03/08, 77_03, 77_09, 76_04, 91_59, 22_12 |
| ACCAD Open Motion Project (Ohio State) | CC BY 3.0 (attribution) | Male2 D1, D4, E1, E4–E8, E13, E19–E21, A7, A10, C26, C27; Female1 A07, A10, B24, C26 |
| Poly Haven | CC0 | 10 weapon models |
| OpenGameArt: AKM (LonesomeDucky), Old Revolver (Lucian Pavel), Double Barrel Shotgun (Jean PFP) | CC0 | 3 weapon models |
Rejected: Bandai Namco motion dataset (CC BY-NC), LaFAN1 (CC BY-NC-ND), Mixamo/ActorCore/Rokoko/Sketchfab (accounts),
KayKit (chibi rig), Quaternius UAL Source tier (paid), SFU/NUS (non-commercial or unclear).

## Clips (69): 36 captured, 2 captured with added recoil, 26 hand-keyed (Quaternius), 5 built with IK
Idles: `fist_guard_accad`, `pistol_idle_ual`, `rifle_idle_ual`*, `melee_idle_ual`, `ready_crouch_cmu`. Rifle:
`rifle_raise_cmu` → `rifle_aim_b_cmu` (hold) → `rifle_fire_cmu` / `rifle_burst_cmu` (fire events) → `rifle_lower_cmu`;
`rifle_reload_ual`*. Pistol: `pistol_aim(_up/_down)_ual`, `pistol_fire_ual`, `pistol_reload_ual`. Unarmed (captured):
`fist_ready/relax_accad`, jab, cross, hooks, uppercuts, `block_high_accad`. Melee: `club_overhead_cmu`,
`melee_strike_ual`, `melee_slash_a/b/c_ual`, `melee_combo_ual`, `melee_block_ual`. Hits and misses: `hit_chest_ual`,
`hit_head_ual`, `hit_knockback(_rm)_ual`, `dodge_l/r_accad`, `duck_accad`, `duck_cmu`, `cower_cmu`, `stagger_cmu`,
`stagger_fwd_cmu`. Cover: `crouch_down(_f)_accad`, `run_to_crouch(_f)_accad`, `walk_to_crouch_f_accad`,
`crouch_to_run_accad`, `crouch_idle_ual`, `crouch_rifle_ual`*, `crouch_walk_ual`. Throw: `throw_overhand_cmu`,
`throw_overhand_ual`. Fall and rise: `death_ual`, `getup_front/back/side_cmu`, `getup_back_ual`,
`getup_to_crouch(_f)_accad`. Surrender: `surrender_enter/idle_ual`*. (* built with IK: need an animator's pass.)

## Weapons (13)
`rifle_auto` (AKM), `rifle_bolt` (rag-wrapped stock, scope), `pistol` (taped grip), `revolver`, `shotgun_sawn`,
`machete`, `knife`, `crowbar`, `pipe_wrench`, `bat` (taped), `hatchet`, `grenade_stick`, `bottle`. 600–5000 triangles,
1024 px base colour for long guns, 512 px otherwise. Still to do: the lore re-texture (paint out the wrench's and the
knife's lettering; salvage, tape, wear), a transparent glass material for the bottle.

## Doubts to settle when integrating (work package 2)
1. No free captured rifle reload or low-ready: the IK-built stopgaps need an animator's pass; the captured rifle
   takes are mimed (support hand needs IK to `grip_off`).
2. Hand-keyed Quaternius clips are stylized (deep lunges, travel 0.35–2.3 m, `hit_knockback_rm` flies 3 m, foot slide in
   `fist_hook_ual`, `melee_idle_ual` arms held out): prefer the captured alternatives.
3. The motion gate has no combat states: fighting stances bend both knees 14–42° (K1), turn the head 45–90° on the
   chest (H2), lift heels (F2). Combat-state limits must be set in `docs/PEOPLE_MOTION.md` from real fighters' measures
   before these clips can pass (never by loosening the quiet-standing limits).
4. Root motion: ~16 one-shots travel > 15 cm (get-ups, `run_to_crouch` 3.4–5.2 m, `stagger_fwd` 2 m, lunges);
   `MotionImportPostprocessor` drops XZ root motion for non-gaits and moves Y into root motion with `root: true`. It needs
   per-clip flags (apply root motion / bake XZ into the pose / keep Y as captured).
5. No free left/right/back hit reactions: add a procedural directional hit (additive) on top of the front hits.
6. **Existing pipeline bug**: `cmu2fbx.py` assumes 120 fps for every CMU trial; CMU lists subjects 75 and 77 at 60 fps
   (verified by fitting gravity to a jump). The game's `idle` (CMU 77_02) likely plays at double speed. Passed to the
   gate work (a re-export changes Motion/, gate-hashed).
7. `rifle_aim_cmu` pops 6.9 cm at its loop seam (use `rifle_aim_b_cmu`); `stagger_cmu` spins ~360°; `club_overhead_cmu`
   follows through to the ground (impact at ~1.0 s).

## Integration order (recommended)
Weapons in hands with sockets and per-weapon grip poses → rifle set with support-hand IK (idle as an upper-body layer
over the walk/jog) → pistol set → unarmed (captured) → hits and misses + procedural directional hit → melee (club
overhead; one-handed stopgaps) → cover enter/hold/leave (peek-and-fire as a crossfade to the aim hold) → throw → fall
and rise → surrender.

## Credits to add to `docs/CREDITS.md` on integration
- Quaternius — Universal Animation Library and Universal Animation Library 2 (Standard), CC0 1.0.
- ACCAD Open Motion Project — "Open Motion Project by ACCAD/The Ohio State University is licensed under a Creative
  Commons Attribution 3.0 Unported License." Takes listed above; used modified (retargeted, trimmed, resampled to 30 fps).
- CMU Graphics Lab Motion Capture Database (existing line) + the trials listed above.
- Poly Haven (CC0): bolt-action rifle 7.62, service pistol and fish knife by Mateusz Sadek; machete by Ulan Cabanilla;
  hatchet by Ulan Cabanilla and James Ray Cock; crowbar by Alexander Otterbeck; pipe wrench by Will Evarts; baseball bat
  by Enrique Martín; stick grenade by singaii; wine bottle by Rico Cilliers.
- OpenGameArt (CC0): "AKM" by LonesomeDucky, "Old Revolver" by Lucian Pavel, "Double Barrel Shotgun" by Jean PFP; used
  modified (reduced, re-oriented, re-textured).
