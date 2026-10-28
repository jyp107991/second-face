# Credits & third-party assets

## Human models — MakeHuman assets (CC0 1.0)
Base mesh, morph targets, skeleton and skin weights, skin textures, eyes, eyebrows, eyelashes, hair, teeth,
clothing and facial expressions come from the **MakeHuman 1.2.0** asset set, released under
**CC0 1.0 Universal** by the MakeHuman team (Data Collection AB, Joel Palmius, Jonas Hauquier; original
work by Manuel Bastioni and contributors). http://www.makehumancommunity.org

Only the assets are used; they are converted for the web by `tools/mh/build_human.py` into
`public/assets/human/`. No MakeHuman program code (AGPL) is used or distributed.

## MakeHuman community assets
Fetched by `tools/mh/fetch_community.sh` from the MakeHuman community asset packs
(http://www.makehumancommunity.org, files.makehumancommunity.org/asset_packs/).

CC0 1.0 (no attribution required, credited with thanks): skin detail maps by Mindfront (skins02), eyebrows and
eyelashes by Mindfront, hairstyles from hair01 (culturalibre, toigo, rehmanpolanski, elvs, faydaen, sonntag78),
beards/moustaches from bodyparts05 (grinsegold "Beard Sigmund", rehmanpolanski "Moustache Viking").

**CC BY 4.0 — attribution required:**
- "Long scruffy beard" (`elvs_scruffy_beard1`) by **Elvaerwyn**
- "Full beard" (`grinsegold_full_beard`) by **grinsegold**
- "Moustache" (`grinsegold_moustache`) by **grinsegold**

These are used modified (refit to the game's body, recoloured, resampled textures).
License: https://creativecommons.org/licenses/by/4.0/

## Clothing — MakeHuman community asset packs
Garments from the shirts, pants, skirts, dress, shoes, hats, gloves, glasses, masks, suits and equipment packs,
fetched by `tools/mh/fetch_community.sh` and refit, recoloured and resampled by `tools/mh/build_human.py`.

CC0 1.0 (credited with thanks): aethelraed, cortu, culturalibre, donitz, elvs, frankyaye, grinsegold, joachip, joepal, jujube, kwnet, learning, matcreator, mindfront, namuhekam, rehmanpolanski, scailman, spamrakuen, thegreatengineer, toigo.

**CC BY 4.0 — attribution required** (author handle as published on the MakeHuman community site; asset ids in brackets):
- **culturalibre**: `culturalibre_sneakers`, `culturalibre_cl_bowler_hat`, `culturalibre_cl_don_quixote_hat`, `culturalibre_bandana_mask`
- **drednicolson**: `drednicolson_asymmetric_tunic_and_sash`, `drednicolson_short-tail_camo_tee`
- **dressupdoc**: `dressupdoc_sandals1`
- **Elvaerwyn**: `elvs_hooded_sweat_jacket1`, `elvs_male_shirt_tie_tucked1`, `elvs_male_shirt_untucked_bd1`, `elvs_male_boho_top1`, `elvs_lara_tank1`, `elvs_male_muscle_shirt1`, `elvs_male_tankshirt1`, `elvs_ruffle_sleeve_peasant_blouse_1`, `elvs_jeans_bootcut`, `elvs_jeans_straight_leg`, `elvs_male_trouser`, `elvs_slouchy_beanie1`, `elvs_male_flat_cap1`, `elvs_tophat1`, `elvs_charity_veil1`, `elvs_covid_goggles1`, `elvs_ladies_sunglass1`, `elvs_covid_mask`, `elvs_plague_doctor_mask`, `elvs_male_coveralls_1`, `elvs_emt_uniform_pants_male`, `elvs_emt_uniform_pants_female`, `elvs_racing_fire_suit_male1`, `elvs_racing_fire_suit_female1`, `elvs_halter_style_pantsuit1`, `elvs_sporty_tracksuit_hoodie_dress1`
- **ews**: `ews_striped_shirt`
- **gredal**: `gredal_gas_mask`
- **janexx**: `janexx_old_female_sweater`
- **maciekg**: `maciekg_leather_boots`
- **madmanny**: `madmanny_tight_leather_boots`
- **mindfront**: `mindfront_cardigan_long_open_front`, `mindfront_knitted_sweater_01`, `mindfront_knitted_sweater_02`, `mindfront_tank_top_01`, `mindfront_female_trousers_1`, `mindfront_male_trousers_1`, `mindfront_male_trousers_2`, `mindfront_shoes_oxford_male`, `mindfront_shoes_oxford_female`, `mindfront_shoes_biker_boots_male`, `mindfront_shoes_biker_boots_female`, `mindfront_knitted_hat_01`, `mindfront_patrol_cap`, `mindfront_fishing_hat_01`, `mindfront_sherpa_hat`, `mindfront_m_suit_01`, `mindfront_f_ninja`, `mindfront_tactical_vest_male`, `mindfront_tactical_vest_female`
- **punkduck**: `punkduck_lace_up_blouse`, `punkduck_high_neck_crop_top`, `punkduck_sleeveless_shirt`, `punkduck_v_neck_top`, `punkduck_retro_top`, `punkduck_sleeveless_crop_top`, `punkduck_female_tight_jeans`, `punkduck_male_classic_jeans`, `punkduck_running_shoes_01`, `punkduck_tennis_shoes`, `punkduck_comfortable_sneakers`, `punkduck_winter_boots`, `punkduck_female_half-boots`, `punkduck_riding_boots`, `punkduck_medieval_boots`, `punkduck_sun_visor_sports_visor`, `punkduck_goggles`, `punkduck_sport-sunglasses`, `punkduck_glasses_modern_form`, `punkduck_wetsuit`, `punkduck_diver_suit`, `punkduck_wireless_headset`, `punkduck_stethoscope`
- **scailman**: `scailman_low-heeled_boots`

Used modified (refit to the game's bodies, re-dyed, weathered, resampled textures). License: https://creativecommons.org/licenses/by/4.0/

## Libraries
- three.js (MIT)

## The Unity game (redesign, 2026-10-28 on)
- **Textures**: Poly Haven (https://polyhaven.com), CC0, fetched by `tools/unity/assets.py`; the list with ids is
  written to `unity/Assets/External/CREDITS.md` at fetch time.
- **Nature models** (rocks, dead wood, scrub, grass): Poly Haven, CC0, fetched by `tools/unity/models.py` and baked to
  phone budgets by `tools/unity/models_bake.py` into `unity/Assets/SecondFace/Models/Nature/` (ids in `models.json`).
- **Bake-off people** (`unity/Assets/SecondFace/People/Bakeoff/`): MakeHuman 1.x base, targets, rig and community
  skins/hair/brows/lashes as above (CC0). Garment meshes used for their silhouette, re-textured by `bake_cloth`:
  CC0 — cortu (`cortu_cargo_pants`), toigo (`toigo_fisherman_sweater`, `toigo_wool_pants`, `toigo_ankle_boots_female`),
  culturalibre (`culturalibre_male_boots`, `culturalibre_hero-heroine_hood_1`), matcreator (`matcreator_mc-skinsuit_2022`),
  rehmanpolanski (`rehmanpolanski_viking_tunic`), spamrakuen (`spamrakuen_tbm_glasses_frames_01`);
  CC BY 4.0 — Elvaerwyn (`elvs_male_shirt_untucked_bd1`, `elvs_male_trouser`, `elvs_hooded_sweat_jacket1`), mindfront
  (`mindfront_tactical_vest_male`, `mindfront_cardigan_long_open_front`), maciekg (`maciekg_leather_boots`),
  culturalibre (`culturalibre_sneakers`), punkduck (`punkduck_winter_boots`). Used modified (refit, re-baked textures).
- **People**: the MakeHuman 1.x base mesh, targets, rig and proxies (CC0, makehumancommunity.org) and the MakeHuman
  community asset packs skins01/02, hair01, eyebrows01, eyelashes01 (CC0; authors named in each pack's files),
  rebuilt by `tools/unity/people/mh_build.py`. No MakeHuman program code is used.
- **Motion**: the CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu; free for all uses; "The data used in
  this project was obtained from mocap.cs.cmu.edu. The database was created with funding from NSF EIA-0196217."),
  converted by `tools/unity/motion/cmu2fbx.py` (trials listed in that file).
- **Kits**: built from scratch by `tools/unity/kits/*.py` in Blender (GPL program; its output is ours).
