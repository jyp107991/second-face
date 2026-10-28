# THE SECOND FACE — the Unity game (design)

Owner directive, 2026-10-28 (pass 7, binding; `CLAUDE.md` §2): the highest aesthetic and functional standard a modern
Android phone can run, with Divinity: Original Sin 2, Baldur's Gate 3 and Cyberpunk 2077 as the aspiration and Android
as the primary console; no anchoring on the web game; keep the narrative and thematic layer and redesign the game
with new assets. This document is that redesign. It is spoiler-free; story truth stays in `story/`.

**What it supersedes.** Where this document and `docs/DESIGN.md` conflict, this one wins: DESIGN §6 (combat), §10 (world
and locations), §5b (presentation), §14 (tech plan) are replaced here. DESIGN §1 (pillars), §2–§2h (the research
rules, frontier systems, chrome and cities, factions, side quests, activities, nonlinearity, quality of life), §3
(the character system), §4 (creation), §5 (economy), §7–§9 (people, dialogue, quests), §11–§13c (choice rules,
replayability, settlement types, world scale) stay, as the fiction and the rules the content is written against.
`docs/WORLD.md` is the world. `docs/PORT.md` §4 is the engine contract and the device targets; §4a the phases.

## 1. The experience

A lit, dense frontier and two megacities seen from a close isometric camera that turns, tilts and zooms with one
finger; places that look inhabited at any hour, with people who have somewhere to be; conversations played as scenes
with faces that react and companions standing in shot; tactical turn-based fights where height, cover, fire, oil,
water and current matter and bodies fall like bodies; a world that keeps moving while you cross it, by foot, mule,
bike, rail, barge or the Loop; a notebook and a map in your hands instead of a computer on your wrist. All of it
at a smooth frame rate on a phone, in landscape, full screen, with a thumb.

The three benchmarks, and what we take from each on a phone:
- **Divinity: Original Sin 2** — readable density: every screen full of things with a purpose, surfaces that
  interact, a camera that frames tactics, colour and light rather than grime as the default mood.
- **Baldur's Gate 3** — conversations as cinema (shots, faces, reactions, companions present), choice everywhere,
  verticality in places and in fights, the party as characters you can see thinking.
- **Cyberpunk 2077** — the megacity: vertical streets, neon and volume light, crowds, bionics as culture, wealth
  stacked on squalor, interiors that open straight off the street.

## 2. Camera and presentation

- **The rig** is Cinemachine. A perspective camera (not orthographic: the benchmarks are perspective and the
  parallax sells depth) at 35° field of view, pitched 50° by default, tiltable between 35° and 70°, distance 6–22 m
  by pinch, orbit by one-finger drag anywhere that is not a tap, two-finger pan, double-tap to recentre on the
  player, a compass that turns with the view. On a gamepad the right stick orbits and tilts; on a mouse the wheel
  zooms and middle drag orbits.
- **Occlusion** is solved, never fought: walls between the camera and the player dither to a cutaway, the roof of
  the room you are in lifts with its shadow, tall props fade. Interiors are part of the place, streamed with it
  and entered through the door with no transition; the lighting Volume blends over a second.
- **Combat framing**: the camera eases to fit the actors engaged, a tactical top-down toggle shows the field flat,
  the turn's actor is always in frame, and a double tap on any actor orbits to them.
- **Conversation** is a scene: the world stays, the camera cuts between an over-shoulder, a two-shot and inserts on
  whoever speaks, with shallow depth of field and the companions in shot reacting; the panel sits beside, with a
  live portrait rendered from the same face; every cut is skippable and the conversation can be read from the
  log. No black-screen close-ups. The shots are generated from a small grammar (who speaks, who listens, tone),
  not authored per line.
- **Light is the mood.** A realtime sun and sky by time of day, real lights after dark (fires, lanterns, neon,
  headlamps) with shadows, grading per region and mood from a Volume profile; bright and clear is the default,
  dust, haze, storm and gloom are events or choices for a place.
- **Photo mode**: pause, free camera within limits, time of day, expression, frame, save to the gallery. The story
  is about a photograph.

## 3. The world

- **One continuous world**, streamed, no loading screens (owner, non-negotiable). Scale: 1 unit = 1 m; places are
  built at 1:1 so a street feels like a street; the land between is compressed. The Western Reach of the fiction
  (700 × 500 km) becomes a playable world of about 24 × 16 km: eight regions as biomes with their own terrain
  layers, vegetation, weather and sky, joined by roads, rail, rivers and the coast. Walking everywhere is possible
  and rewarded (discoveries), and long legs are also played as montages (§5.7) while the destination streams.
- **Terrain** is Unity Terrain per 1 km chunk generated from our heightfield and region data, with layers
  (sand, salt crust, glass, scrub soil, rubble, mud, snow, pine litter), holes where places cut cellars and
  cisterns into the ground, instanced grass and scrub, real trees with LODs, roads and rails as splines that
  flatten and texture the ground. Water is a surface with depth fog, flow and foam: the delta, the canals, the
  drowned coast, the Wet's rivers.
- **Places are 3D spaces** built from modular kits per settlement type (DESIGN §13b) and handcrafted on top: Cistern
  9's concrete rings, Shale's adobe and scrap around the well, the Rust Dogs' overpass decks, Tollhouse 9's wall
  across the road, Ninebridge's stalls up a broken bridge, Openfield's long halls and fields, the Sump's spoil
  heaps, and Meridian's districts: the Crown's domes and terraces, the Precinct's grey order, Old Market's dead
  mall, Lantern Row's canal and neon, the Stacks' megablocks, Bridgeward's chop-shops, the Sink's flooded
  underpasses. Verticality is designed in: decks, towers, bridges, floors, roofs, canals under roads. The web
  game's maps are layout notes for these; nothing of their geometry is reused.
- **Kits**: shelter concrete (rings, hatches, grates, pipes, hydroponics), frontier adobe and timber, scrap and
  container, toll-fort masonry and gate, bridge steel and stall, commune hall and shrine, salvage crane and cabin,
  stilt and hull, megacity curtain wall, neon, megablock corridor, canal and underpass. Each kit is a set of
  prefabs with LODs, colliders, nav markup and decals, built by our Blender scripts from CC0 sources or from
  scratch, with the material library (§8) on them.
- **Living places**: schedules for every named person and generated background people per place and hour,
  running on NavMesh with avoidance, work loops at spots (counters, benches, looms, cranes), sitters, leaners,
  pairs talking, vendors calling, children and animals later; lights come on at dusk; shutters close at night;
  weather empties the street and fills the saloon. Crowd density scales with the device tier.
- **The megacity** is the Cyberpunk benchmark: Meridian's districts at a density the phone carries through the
  GPU Resident Drawer and occlusion culling, interiors opening off the street without a load, the Loop as a fast
  travel network and a view, neon reflected in wet ground, crowds that part for wardens and close behind gangs.

## 4. People

- **The pipeline is chosen by a bake-off** (P2), not inherited: candidates are a MakeHuman CC0 base re-authored by
  our Blender scripts, MB-Lab bases, and UMA for modularity; judged at portrait distance (faces), in a crowd
  (cost), dressed (clothing at 2 K), moving (retargeted captures), with screenshots the owner reviews. Whatever
  wins: faces on blend shapes so the sculptor and the ageing photograph work, bodies that follow WORLD §7 (lean,
  weathered, clearly dimorphic, proportions varying independently of mass), ancestries as presets that mix,
  lifestyles that shape the body and the grime, hair as cards, skin at 2 K with weathering, scars and tattoos,
  clothing as salvage layered and re-dyed, visible chrome as segmented matte plating with a lit accent.
- **Wardrobe rule (owner, 2026-10-28, binding)**: every garment reads as this world's. The frontier wears salvage:
  canvas, wool and leather re-dyed in a muted found palette, patched with other cloth, grimed from the hem up,
  sun-faded, taped at the knee and cuff, carried in rigs and straps; hoods and scarves, never masks as a motif
  (DESIGN §"Masks are not a motif"). The megacity street adds reflective tape, cable and cheap synthetics; the rich
  wear clean synthetics and silk with lit trims. Nothing modern-fashion, printed, logoed, costume or uniform-as-such.
  Found meshes (MakeHuman community packs, CC0/CC-BY) are silhouettes only; their textures are never shipped —
  `tools/unity/people/mh_build.py` bakes a worn, re-dyed cloth onto each garment's UVs (`bake_cloth`) from a look
  (`tint`, `grime`, `wear`, `patch`, `tape`). Authored garments (coats, ponchos, rigs, plating) follow in P4.
- **Hair rule (owner, 2026-10-28, binding)**: hair is gritty and functional — shaved or buzzed scalps (stubble
  painted into the person's own skin texture, not cards), hair cropped short and uneven, tied back, rough buns and work braids, long
  hair matted and under a wrap, scarf or hood, balding and receding, unkempt beards; dull and dusty, bleached at
  the ends, greying in streaks. No styled modern cuts, no gel, no bobs, bangs or salon shapes. Faces carry sun,
  dirt in the creases, chapped lips and old scars. Only the megacity's rich are clean and tidy, as costume.
  Implementation and the allowed proxies: `docs/BUILD_PLAN_V1.md` §6.C.
- **Animation**: Humanoid Mecanim with captured motion (CMU and other free captures, converted by our pipeline),
  blend trees by speed and turn, idle loops for everyone standing, work loops, conversation gestures by tone,
  Animation Rigging for feet on the ground, heads that turn to whoever is near, hands on weapons and ledges;
  ragdolls on death and on going down; hit reactions by body part.
- **Companions** are visible people: they follow with their own pace and distance, sit at camp, stand in
  conversation, react on their faces, fight under direct control (BG3 style) and go down rather than die.
- **The player's face** is made in the sculptor at creation and aged by the game for the photograph (safe to
  say: the stranger carries a photo of the player, older).

## 5. Play systems (the functional overhaul)

### 5.1 Exploration
- Tap to move with the path drawn, hold to run, tap a thing to act (radial menu on hold: talk, look, take, use,
  attack, steal, give), highlight interactables on a two-finger hold. Ladders, ledges and jumps are navigation
  links; water is waded or swum at a cost; doors open on approach or are locked, barred, trapped.
- Stealth mode (crouch): the light on the body is read from the real lighting, noise from the surface and pace,
  sight cones are shown; disguises (a warden's grey, a Choir robe) and papers get you through gates; crowds hide
  you; pickpocketing with a real risk.
- Discovery: landmarks reveal map, caches, leads, reveries, shortcuts; climbing a tower shows the region.

### 5.2 Combat (turn-based, redesigned to the DOS2/BG3 benchmark)
The kind the owner keeps; the depth is new. Rules stay on DESIGN §3's attributes, skills and perks; the formulas
grow the new terms and the tests follow.
- **Turns and AP**: initiative rounds; AP per turn from Reflex; movement costs AP by distance over the NavMesh
  (not tiles), with the reachable area shown; actions cost AP (shot, aimed shot, burst, melee, reload, item,
  ability); one free minor action per turn (swap weapon, drop prone, shout); unused AP banks as evasion.
- **Height and cover**: height gives range and hit chance and denies low cover; cover is real geometry (half or
  full by raycasts to the hit zones), destructible by heavy weapons and explosives, flanked by moving.
- **Surfaces and interactions**: fire spreads over oil and dry scrub, lit by sparks, muzzle flash at close range
  or a thrown lamp; oil slicks slow and burn; water douses fire and conducts shock; dust and smoke block sight;
  chem clouds choke and ignite; current from arc weapons and certain chrome runs through water and metal. Barrels,
  pipes, generators and vehicles explode; ledges are pushes waiting to happen.
- **Called shots** on real hit zones (head, eyes, torso, arms, legs, groin, weapon) with crippling effects (limp,
  drop, blind, stagger) and the critical table; Senses and range set the chance; a scope, a rest, a prone stance
  help.
- **Reactions**: overwatch (hold a shot for anyone who moves into view), interrupts from perks, a companion's
  cover fire; the Ledger's wardens fight by the book, raiders by nerve, machines by programme.
- **Bionic abilities** with Drift as the price: dash, overclock, scan through walls, a shock from the hand, a
  targeting link; each use raises Drift, Drift raises the chance of an episode.
- **Party control**: companions act under direct control (as in BG3), with a tactical camera, a turn bar, a combat
  log, and undo for a move that has not been seen. Combat can be avoided or ended by talking, surrender happens,
  and morale breaks.
- **Feedback**: tracers, impacts, decals, shell casings, ragdolls, knockback, blood as decals not gore, time of day
  and weather in every fight, the audio mix snapping to combat.

### 5.3 Conversation
The dialogue engine and its content stay; the delivery is the scene described in §2. The upgrade list U7 (topic
memory, exhaustion, state-aware greetings, interjections, no loops) is built into the new conversation UI from the
start, and companions in shot interject.

### 5.4 Inventory, wardrobe, barter, camp
- Inventory as a grid of drawn items with weight, condition, comparison and the live figure as the paper doll;
  equipping shows on the body at once (visible chrome too).
- Barter per DESIGN §5 with the merchant's face across the table; haggling as a check with a visible margin.
- Camp: rest, cook, mend, talk, write letters, with companions sitting round the fire in the light.
- Benches: repair, reload, craft from parts.

### 5.5 Chrome
Surgery as a scene with the Mender; installed pieces visible; abilities in combat (§5.2); Drift as a slow grade and
pulse on the screen at high values, never a filter over the whole game.

### 5.6 Travel and vehicles
Fast travel is a network you have access to (DESIGN §13c): rail, barge, caravan, Loop, runners between
safehouses; time passes; events can interrupt; vehicles are driven in montage (Timeline over the streamed road)
with encounters stepping out of the montage into play at the roadside. Walking stays worth it.

### 5.7 The living world
Schedules, reputation and news that travel with people, world events that wait for the player (no time limits),
weather by region, day and night that change who is where and what is lit, caravans and the Wheel moving on the
map, crowds that react to a drawn gun.

### 5.8 Quality of life (the BG3 baseline)
Undo move, take all, equip comparison, quest pins and a map with pins, a dialogue log, skip through heard lines,
text size and contrast, remappable controls, gamepad and keyboard, difficulty that touches enemy aim and damage
only, combat speed, autosave and quicksave with screenshots, a photo mode, one-time tips, settings persisted.

## 6. UI

UI Toolkit throughout (vector, themed with USS, data-bound, responsive to every phone aspect). The owner's rule: a
field notebook and a map, not a wrist computer. The notebook is the journal, the people, the letters, the
decisions, the leads, drawn as a book with real typography (no cursive); the map is the world map and the local
map; the HUD is minimal (health, AP in combat, the objective line, the compass, a thumb-reach action cluster); the
radial menu opens on hold; conversation and combat panels keep the scene visible; menus and settings are plain;
the sculptor is a full screen with the live face. Localization is wired from day one; English ships.

## 7. Audio

Audio Mixer with snapshots (outdoor, indoor, combat, conversation, menu); ambience by region, hour and weather;
footsteps by terrain layer; spatial sources on fires, machines, crowds, water; occlusion by raycast; reverb zones
for cisterns, halls and underpasses; a music bed per region and mood that reacts to combat and conversation.
Sources are CC0/CC-BY libraries mixed in-project; original music is an owner decision (§11).

## 8. Art direction

- **Palette**: lit, warm, clear by default; the Sallow is ochre and salt-white under a hard sky; the Glass Flats
  glitter; the Drowned Shore is grey-green water and rust; Meridian is sodium and neon over wet concrete; the Teeth
  are pine, snow and the arcology's clean white; the Ashlands are black glass. Gloom is a choice for a place.
- **Materials**: a library of 2 K PBR sets re-authored from CC0 sources (Poly Haven, ambientCG) with weathering
  masks, height blends and decals; everything shows ninety years of use except the Crown and Halcyon.
- **People**: WORLD §7 is the rule (salvage layered and re-dyed, protection first, uniforms of the dead, city style
  without cleanliness, practical hair, lean weathered bodies). Chrome is the future: segmented matte plating, seams,
  a lit accent line; never bolted scrap.
- **Names** feel found, not "the [noun]" (the naming bible, U6, is written in this phase of content).
- **Type**: two OFL typefaces, a readable grotesque for UI and a book face for the notebook; no cursive.

## 9. Technical architecture

- **Assemblies**: `SecondFace.Core` (the narrative core, pure C#, tested outside Unity), `SecondFace.Game` (world,
  people, camera, UI, audio, play systems), `SecondFace.Editor` (import and build pipelines), tests. Game code is
  organised by feature (World, People, Camera, UI, Combat, Travel, Audio), each a folder with its asmdef where
  compile times ask for it.
- **Data flow**: `src/content` → `npm run export` → `StreamingAssets/content/*.json` → `Registry`. Places, kits,
  people, clips, audio and materials are Addressables groups keyed by region and place; the world streams by
  distance with memory budgets per tier.
- **Saves**: JSON in `persistentDataPath`, versioned with migrations, a screenshot per slot, autosave on place
  entry and quicksave.
- **Quality tiers**: Flagship, Mid, Floor (PORT.md §4), chosen on first run from the device and adjustable;
  Adaptive Performance scales resolution and effects under thermal load; STP upscaling on Vulkan.
- **Verification**: Core tests locally; the Game assembly compile-checked locally; CI builds the APK and runs
  PlayMode tests under a virtual display that capture screenshots (`docs/evidence/unity/`) the owner judges; the
  profilers on device at the end of every phase.

## 10. Phases and the bake-off

`docs/PORT.md` §4a. P2's bake-off decides the people pipeline and proves the material library, a modular kit, a lit
place and terrain with vegetation at the standard, each as a screenshot set from CI. Nothing in P3–P7 starts on a
pipeline that has not passed its bake-off.

## 11. Decisions for the owner (spoiler-free)

1. Combat stays turn-based with the depth above (assumed from the earlier rule; say if the redesign should go
   further).
2. Asset licence exceptions: the repository is public, so committed assets are CC0/CC-BY or built by us; say if a
   paid or non-redistributable source may be used and kept out of the repository.
3. Original music: composed later (a commission or an owner choice) or library music under CC licences.
4. World scale: 24 × 16 km with places at 1:1 and compressed land between (assumed); the alternative is a smaller
   world with more montage.
