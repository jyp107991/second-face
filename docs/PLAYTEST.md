# Playtest: Act 1 (test version)

A frozen build of Act 1 for road-testing, separate from the main build so the two never interfere.

## Where to play
- **Test version**: `https://jyp107991.github.io/second-face/act1/` — built from the newest git tag `act1-test-N`
  (currently `act1-test-1`, cut 2026-10-27). It changes only when a new tag is cut; the main build moves on underneath.
- **Main build** (moves with every push): `https://jyp107991.github.io/second-face/`.
- Saves are separate: the test version keeps its own slots (`sf.act1.save.*`), so playing one never touches the other.
- Works in a current Chrome, Edge, Firefox or Safari on desktop; on a phone, tap to move, tap a person or thing for
  the action menu, pinch to zoom, two-finger twist to rotate.

## Play it as an app (phone, recommended)
1. Open the test version link in **Chrome** on the phone.
2. Title screen → **Install App** (or Chrome **⋮ → Add to Home screen → Install**).
3. Launch **Second Face Act 1** from the home screen / app drawer: it opens fullscreen in landscape with no browser
   bar, has its own icon and task-switcher entry, and starts offline once played.
- Opened in a normal browser tab instead, the first tap goes fullscreen and turns the game sideways.
- If an older install still opens upright or with a URL bar, uninstall it and install again (Chrome reads the app
  settings only at install time).

## One-time setup (owner, once)
This session's GitHub tokens cannot write workflow files, so the deploy workflow is in the repository at
`tools/ci/pages.yml` and needs copying into place by hand:
1. On GitHub: **Add file → Create new file**, path `.github/workflows/pages.yml`, paste the contents of
   `tools/ci/pages.yml`, commit to `main`.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. The next push to `main` (or **Actions → pages → Run workflow**) deploys both builds. The first run takes ~5 min.

## What is in Act 1
- Character creation with a rolled start (Roll / Keep / Recall / Standard).
- Chapter One: the Cistern, the road to Shale, the overpass, the map.
- Act 1 in the Sallow: Tollhouse 9, Signal Hill, the month in Shale, the wilds (orchard, saltpan, windpumps, hunting
  and camps), Dry Wells, the Mender's table, the Wheel's camp (it moves), the escort, and the side lines in Shale.
- Three companions can join. Reputation is local and travels with people. No time limits of any kind.

## How to report
Short notes are best, one line each, in whatever order they happen:
- **Bug**: what you did, what happened, what you expected. The day/time from the top-left corner helps.
- **Feel**: anything that felt wrong, slow, confusing or flat (a place, a conversation, a fight, the camera).
- **Spoiler-safe**: you can name places and people; I will not explain what anything means.
- A screenshot is worth a paragraph. F12 → Console → any red text, copied, is worth two.

## Known gaps in this version
- Acts 2+ are not in; the world map shows places you cannot enter yet.
- Live AI dialogue is off (trees only).
- Performance: a desktop GPU is assumed; on a phone set Quality to low in the menu.
- Shale is a little over the mobile draw-call budget; the rest of the maps are inside it.
- Combat has no hover card yet (the target's odds show in the radial menu); crowds do not step aside for you.

## Dev console (if you want to poke)
Add `?dev` to the URL: `game` and `SF` are on the window. `game.state` is the save state; `game.devApply([...])` runs
dialogue effects (give/learn/set/quest). Saves are in your browser's local storage under `sf.act1.save.*`.
