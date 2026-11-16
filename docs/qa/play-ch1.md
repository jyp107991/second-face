# QA report — `play-ch1` (Chapter One on the phone)

Build: `play-ch1`, from `main` (the commit the tag names). Protocol: `docs/QA.md` (player pass, tester pass, critic pass;
no S1/S2 open at hand-over). Spoiler rule: story beats are named, never explained.

## 1. What the build contains

- Title, settings, saves, character creation (origins, the rolled start, the face sculptor, the body).
- **Knock**, the player's home (the new opening): hatch day's chores (each a system: barter at the hatch, the Rib's
  salvage, Corin's windpump, the snare line), Linnet's errand, supper, the night watch at the hatch lamp, the morning
  after and its choice (talk, lie, hide, or fight beside Corin), and the road out.
- **Shale** and **the overpass** (the Rust Dogs' camp), reached by the map: the stranger's trace and the paper.
- Turn-based combat in the open world (AP by distance, cover, the AI, allies, ragdolls), the HUD, notebook, map,
  pack, barter, camp, loot, sneaking, theft and witnesses, photo mode.
- The people: 79 Rocketbox people, re-dyed lore-bound (the owner's wardrobe rule), named and extras, by trade.

## 2. Pass two: tester (run first, so the player pass meets a build that holds)

### Automated
| Suite | What it proves | Result |
|---|---|---|
| Core (`dotnet test`, 230) | rules, dialogue, quests, saves, combat AI; `KnockFlowTests` plays the whole opening on the exported content for a character with no useful skills, and the fight's branch; `ChapterOneFlowTests` plays Shale's trace and three ways to the paper | green |
| Web content (`npm run check`, 249) | content validator, the opening's and Chapter One's routes | green |
| PlayMode `KnockTests` | a new game at home at seven, Maud's talk, the hatch, the watch, the stranger's scene on the apron, the outriders' fight to its end | see §2.3 |
| PlayMode `ChapterOneTests` | the road to Shale by the map, Shale reached, the sheriff talks; the overpass, Kessler talks, the paper ends the quest | see §2.3 |
| PlayMode suite (CI) | boot, saves, pause, every screen, camp, loot, sneaking, theft, people's hours | see §2.3 |
| PlayMode `HumanMotionGateTests` | the motion and posture gate (`docs/PEOPLE_MOTION.md`): every measure, every state, ten people as the game makes them; the clips loop as their sidecars say | see §2.3 |

### Findings (fixed before hand-over unless marked open)
| Id | Sev | What | Where | Status |
|---|---|---|---|---|
| T1 | S1 | Chapter One's "Reach Shale" and "Go to the overpass" could never complete: Unity never set the visited flags the web game set on entering a map | `Walkabout.Visit` | fixed |
| T2 | S1 | The stranger's scene never came if the player already stood on the apron when the watch began (a trigger counted as entered while its condition was false) | `Triggers` | fixed |
| T3 | S1 | A trigger's "someone comes to talk" was lost when that person had not yet been stood up | `Walkabout.Comes` | fixed |
| T4 | S1 | The outriders' fight took sides while the hamlet's people were being re-made: two of three outriders and no Corin; the player died alone and a second fight began at once | `PeopleService.Reconcile`, `Combat.Check` | fixed |
| T5 | S2 | Corin, on the rise above the square, was out of the fight's reach | `Combat.AllyReach` | fixed |
| T6 | S2 | Dye masks undyed all unworn cloth (grey-blue blotches on everyone) | `rb_install.py` | fixed |
| T7 | S2 | A lapelled blazer (office wear) stood for a hamlet's people (the wardrobe rule) | `rb_bodies.py` | fixed |
| T8 | S2 | Bodies were picked for trades their clothes are not (a weak preference) | `RbPeople.Pick` | fixed |
| T9 | S3 | One dye head to foot read as a suit | `RbPeople.Apart` | fixed |
| T10 | S2 | The dying man on the road stood as a woman (sex follows the frame; his was narrow) | content | fixed |
| T11 | S2 | Shale and the overpass still spoke as if the player came out of the shelter (the old origin) | content | fixed |
| T12 | S3 | The difficulty setting never reached a fight | `Combat.Difficulty` | fixed |
| T13 | S3 | Fight moves waited out an 8 s cap each (a townsperson's stopping distance never passed the arrival test) and were walked, not jogged | `Combat.MoveUnit` | fixed |
| T14 | S1 (CI) | The catalogue build failed on a checkout without the people installed | `RocketboxPeopleBuild` | fixed |
| T15 | S2 | None of the 28 captured clips looped: the clip settings were set where Unity has no clips yet, so every walk froze after one stride and was dragged along, and every idle froze after a few seconds (found by the motion gate, `docs/PEOPLE_MOTION.md`) | `MotionImportPostprocessor` | fixed |
| T16 | S2 | Hands curled into claws: the relaxed curl was added on top of Rocketbox's own bent fingers (A5 p98 69°) | `HandPose` | fixed |
| T17 | S2 | Heads turned up to 69° on still bodies when someone spoke from the side; the head carried a roll with it | `Gaze` | fixed |
| T18 | S2 | Feet floated about 3 cm; a foot the clip lifted was left hovering; stances up to 46 cm wide; feet slid when the body turned to talk (Unity's foot goals were missed by 4-7 cm: now a bone-level leg solve, exact; planted, flat, narrowed, stepping on turns) | `FootPlant`, `Walkabout.Face` | in progress: soles, width, flatness pass; a foot in the air too often while looking round, sliding in the turn |
| T19 | S2 | Hands sank 2-5 cm into the side of the thigh; some men's arms hung 8-14 cm off the body (no torso data on the Rocketbox people, so the arm clearance was off) | `ArmClearance`, `RocketboxPeopleBuild` | in progress: torsos and thighs (four widths a station, skirts included) measured; skin margins; still arms a little wide (A1, A4) and some fingers in |
| T20 | S2 | The conversation camera dropped to eye level with over-the-shoulder cuts, against the overhead rule | `ConversationCamera` | fixed |
| T21 | S3 | White marks painted on a balding man's scalp (`Male_Adult_03`) | outfit bake | open |
| T22 | S2 | idle_c (CMU 111_28) holds the hands up in front of the body; every person shared it | `LocomotionBuild.Idles` | fixed (out of the pool) |
| T23 | S2 | Palms turned forward and up in the walk's arm swing (a waiter's carry) | `HandPose` | fixed (A6 passes) |
| T24 | S2 | Walking: the planted heel and ball slide (W1 median 18 cm/s at 1.25 m/s; the sneak's short loop worse) | clips, `FootPlant` | open |
| T25 | S2 | The owner (2026-11-06): the outfits read "a stroll in California": Rocketbox's own tees, shorts, jeans and sneakers, only re-dyed | `RocketboxLayers`, Core `RbLayers`, `RbLayerSet` | in progress: ten layers cut from each body's skin and worn by trade (boots over the trousers, vests, capes, jackets, rigs, wraps; bare legs covered; `docs/evidence/unity/p4/layers/`). Still open: the shells are plain (no seams, pockets, buckles), jackets read padded on the low-poly bodies, a settler in a white tee with only a gaiter is still too clean, construction hard hats, colours too muted |
| T26 | S2 | Shadows in stair-stepped blocks (1024 px over 50 m, one cascade, hard) | URP assets | fixed (2048 px, two cascades, soft, 40 m) |
| T27 | S2 | Seen from behind and above, long jeans pooled over the shoes: legs read as stumps (the owner: "look at the feet") | wardrobe | fixed for frontier trades (boots over the trousers); the feet measured on the ground in every view (`FeetCloseUp`) |
| T28 | S1 (CI) | The leg solve was handed a value that is not a number on CI's slower frames; Unity's rotation asserted every frame after, failing 16 PlayMode tests by their log (seen locally in KnockTests too) | `FootPlant.Solve` | fixed (inputs checked; the first one logged by name to find its source) |
| T29 | S2 | Character creation: choosing a people kept the face already on the stage (every face of the player's sex is a choice), so "East Asian" showed North European women | `CreationScreen` | fixed |
| T30 | S3 | Character creation and conversation close-ups: the layers' edges (the vest's and jacket's neckline) are cut along whole triangles and show as stair-steps across the throat | `RocketboxLayers` | open (clip the border triangles along the layer's own line) |
| T31 | S3 | The belt, worn over the vest, lay 2 mm under it (G2) | `RocketboxLayers` | fixed |
| T32 | — (test) | The shelter test expected rooms under the mouth; the new opening seals that door and the content has no way down | `PlacePlayTests` | test follows the content |
| T33 | — (test) | Chapter One's trip from Knock was refused as busy while a trigger's talk was open (CI's timing): the walker stayed home | `ChapterOneTests` | the test reads the talk to its end first, then asserts the trip |
| T34 | — (test) | The slope test compared planted feet with the clip's unplanted feet on flat ground (3-6 cm up) | `PeopleMotionTests` | compared with the same person planted |
| T35 | S2 | The HUD named every place "Shale" (Knock's square included): the place was read once from Shale's map | `Bootstrap.UpdateHud` | fixed (the player's location's own map name; the world map calls the home Knock too) |
| T36 | S3 | The HUD's party portrait is a letter ("Y"), not the player's face | `Hud` | open |
| T37 | S1 | A journey to another place never arrived when the place being left had its people about: the streamer built a chunk only on a frame under 25 ms, every frame ran over it, and the ground at the other end never came (ChapterOneTests, CI) | `WorldStreamer` | fixed (a wanted chunk waits at most 0.25 s for a fast frame) |
| T38 | S2 | Losing the opening's fight sent the player back to the title (an hour of play gone), against the story plan (whatever is chosen, the outriders take their due); the playtest's fair, unskilled player lost it with no one down | `Combat.Finish`, content | fixed: losing forward (`beaten` on the outriders: the player left hurt, the notebook taken, the post-house burned, the story on) |
| T39 | S2 | The opening's people's legs went unsolved for good after a long frame (a step's lift was the quarter power of sin(pi), a hair under nought: not a number, kept in the planted place); seen on the walker and most of Knock | `FootPlant` | fixed (root cause and guards) |
| T40 | S2 (test) | BootTests expected the old garment wardrobe on the player; the player is a Rocketbox person in their re-dyed clothes | `BootTests` | test follows the game |
| T41 | S2 | The conversation panel's portrait of a townsperson (the sheriff) shows her jacket, not her face (the player's own portrait is right) | `Portraits`, `Walkabout` | fixed (with the gate's next batch, `Portraits.cs` is gate-hashed): the portrait frames the drawn head (the skinned body baked, the skull's top found) after the culled animator is brought up to date; PortraitTests passes over ten of Knock's people |
| T42 | S2 | Re-dyed clothes carry blue-grey and white blotches that read as damaged textures, not patches (the sheriff's jacket, the player's top) | outfit bake (`rb_outfit.py`), `SecondFace/Person` | fixed: the gutters round the UV islands kept the photographed cloth and bled across seams; colour, dye mask and normal map padded out from the islands (`rb_uv_islands.py`, `rb_pad.py`, 79 bodies) |
| T43 | S2 | Places read as empty lots at the game camera: Knock's square and its wide view, Shale's arrival, the overpass's arrival (bare ground, a table, a few barrels); arrival views do not show the place | places, spawns | partly fixed: 26 small scenes a place on open ground off the ways (`PlaceYards`, 49 CC0 props); arrivals that face the place still open |
| T44 | S2 | The fight bar covers the HUD's notebook and map buttons; its buttons are unstyled; no turn order, no health over heads, no hit chance on a target | `Combat` UI | fixed: `CombatHud` (turn order, health over heads, the turn's buttons in the action cluster's place, AP and the last lines on a plate clear of both); odds and cost on each attack |
| T45 | S3 | At night the stranger stands half under the page in the conversation's framing; the speaker's portrait is a letter | `ConversationCamera`, `DialoguePanel` | fixed: the view stands back as far as both heads need to fit beside the page; portraits per T41 |
| T46 | S1 | The story's time jumps never reached the world: a choice that moves the clock and ends the conversation ("I'll take the lamp", "Sleep until morning", the cot) left the clock where it was, so the watch began at seven in the morning and the night never passed (found by the new play-through, KnockPlaythroughTests) | `Walkabout.TimeFollows` | fixed (the clock read before a conversation, followed after each line and at its end, for people and talking things) |
| T47 | S2 | At the Rib the conversation camera framed bare ground: neither speaker in view | `ConversationCamera` | fixed: the one view eases after the pair when they move (it stayed where they had been) |
| T48 | S1 | Losing the outriders' fight started it again, and again: the losing-forward stood the player up at a quarter of their health beside riders still hostile (the fight's condition never read the loss), four fights in a row | `npcs/knock.ts`, `Combat.Finish` | fixed: the riders are hostile only until they have beaten the player; a fight that ends without a win is not taken up again by itself for two minutes |
| T49 | S3 | In close portraits several faces show a dark streak under the eyes and a dark mark at the mouth's corners (in the textures as shipped, not the padding) | head textures, `SecondFace/Person` | open |

## 3. Pass one: player

(minute by minute from a fresh install; written from the build's captures and the playthrough runs)

## 4. Pass three: critic

| Axis | Score | Why | The one change that would raise it most |
|---|---|---|---|

## 5. Known gaps (S3 and below, listed for the owner)
