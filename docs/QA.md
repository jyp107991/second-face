# QA — how every build is reviewed before it reaches the owner

Owner, 2026-11-05 (binding): "make sure you review output before you give to me - play as a player and as a game
reviewer using best practice on game reviewing/testing." No build goes to the owner until it has passed the three
passes below, its findings are written in the build's report (`docs/qa/<build>.md`), and every S1/S2 finding is fixed.

## 1. Pass one: play it as a player (first-time experience)

Play from a fresh install (the title, a new game, character creation) without debug tools, as someone who has never
seen the game, and write what happens minute by minute for the first 30 minutes, then every 15 minutes:

- **Onboarding**: do I know what I am, where I am, what I want and what I can do, within the first five minutes,
  without a wall of text? Is each mechanic taught by doing, once, when it is first needed?
- **Goals**: at every moment, can I say what I am trying to do next and roughly where (the notebook, the HUD's pinned
  objective)? Note every moment of "what now?" with its time.
- **Feedback**: does every tap answer at once (a sound, a highlight, a movement)? Is every check's result and its
  reason shown? Do I understand why I won or lost a fight?
- **Flow and pacing**: where did I get bored, lost, or stuck? Where did the game drag (walking with nothing to see,
  repeated lines, long menus)?
- **Agency**: did my choices visibly change something? Did the world react (people, news, reputation)?
- **Fiction**: did anything break the world (a modern logo, a uniform, a clean face in the dirt, a name that reads
  "the [noun]", a line repeated, a spoiler in the notebook)?
- **Feel**: the camera, the one-finger turn, tap-to-move, pinch zoom, the radial menu: do they do what my finger means?

## 2. Pass two: test it as a tester (break it)

Each build's test plan lists its features; for each, the tester runs:

- **Smoke**: boots, title, new game, save, quit, load, continue; every screen opens and closes; no error in the log.
- **Critical path**: the build's main line end to end by the headless playtest scripts (every branch of every quest
  in it) and once by hand.
- **Edge cases**: refuse every offer, pick every option, walk away mid-conversation, save mid-combat and mid-dialogue,
  load an old save, fill the pack, spend to zero, fail every check, lose a fight, die, go out of bounds, rotate and
  background the app, change the language and text size, run at the lowest quality tier.
- **Softlocks**: any state with no way forward (a door that never opens, a quest that cannot finish, a conversation
  with no exit, a companion who never comes back) is S1.
- **Humans gate** (CLAUDE.md §2, `docs/PEOPLE_MOTION.md`): the motion and posture gate passes on the full set of
  people (`HumanMotionGateTests`, all categories), and every capture with people in it is reviewed at the game's own
  cameras against §3 of that document, item by item, in writing, in the build's report. Any failure is S2.
- **Overhead**: every in-game view (exploring, combat, conversations) is the overhead camera; a capture from any other
  view is not evidence for the build (photo mode, character creation and portraits aside).
- **Persistence**: what the player changed survives a save, a quit and a load (containers, people, flags, the clock).
- **Performance**: frame time on the device tier (Mid ≥ 30 fps, Flagship 60), memory, load times, battery drain over
  30 minutes; no hitch over 100 ms when walking into a place.

Severity: **S1** crash, softlock, save loss, spoiler leak; **S2** blocks or badly misleads progress, a broken rule of
the owner's (CLAUDE.md §2), a failed humans gate or an item of its checklist failed in review; **S3** a feature works wrongly but can be worked round; **S4** minor (a typo, a clipping
garment in one pose); **S5** cosmetic polish. A build ships to the owner with no S1/S2 open; S3s are listed.

## 3. Pass three: review it as a critic

Write the review a respected critic would write (Eurogamer, PC Gamer, RPS style), scoring each 1–10 with the reasons
and the single change that would raise it most:

| Axis | What is judged |
|---|---|
| Story and writing | the hook, stakes, characters' motives, dialogue that progresses and never loops, prose quality, no clichés of the genre |
| Characters | companions' and major characters' depth, distinctness, arcs, relationships that respond |
| Gameplay | the core loop (explore, talk, check, fight, loot, travel), combat depth and fairness, meaningful choices, reactivity |
| World | density of the content, reasons to explore, lore coherence, places that feel lived in |
| Presentation | visuals against the standard (DESIGN_UNITY.md), the people's faces (PEOPLE_QA.md) and how they stand and move (PEOPLE_MOTION.md), the overhead camera, the wardrobe rule, UI clarity, audio |
| Technical | frame rate, loading (none after the title), stability, saves |
| Mobile fit | touch controls, readability on a phone, session length, battery, offline |

The benchmark is the owner's: DOS2 / BG3 / Cyberpunk 2077 as the aspiration, a 2026 phone as the limit. A score under 6
on any axis is a finding to fix before the build is called done.

## 4. The build report

`docs/qa/<build>.md`: the build, what it contains, the three passes' notes, the findings table (id, severity, what,
where, steps, status), the humans gate's table (each measure's worst person and state against its limit) and its
written capture review, the scores, and what was fixed before hand-over. The owner's playtest notes go in the same file
when they come.
