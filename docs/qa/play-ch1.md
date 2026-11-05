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

## 3. Pass one: player

(minute by minute from a fresh install; written from the build's captures and the playthrough runs)

## 4. Pass three: critic

| Axis | Score | Why | The one change that would raise it most |
|---|---|---|---|

## 5. Known gaps (S3 and below, listed for the owner)
