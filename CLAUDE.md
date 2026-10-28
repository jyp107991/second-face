# THE SECOND FACE — instructions for Claude sessions

Original isometric turn-based post-apocalyptic RPG. Being ported to Unity 6 (URP, C#) from the TypeScript + three.js original (see `docs/PORT.md`).
The full brief is `docs/BRIEF.md`. Design: `docs/DESIGN.md`. Milestones: `docs/ROADMAP.md`.

## 0. RESUME FIRST (usage-limit safety)
Sessions can be cut off at any moment by usage limits. Work is structured so nothing is lost:

1. **On session start, read `docs/PROGRESS.md` before anything else.** It names the current
   milestone, the step in progress, what is done, and the exact next action. Then `docs/PORT.md` (the Unity port:
   plan, conventions, how to build and verify) and `docs/UPGRADE.md` (the owner's visual directive, still binding
   for the port's targets).
2. Work in **small steps** (≤ ~1 hour of work each). After each step:
   - run `npm run check` (typecheck + validate content + tests) when code exists,
   - update `docs/PROGRESS.md` (tick the step, write the next action),
   - `git commit` and `git push origin main` immediately.
3. If a step is large, commit **WIP checkpoints** (`wip: <area> — <what works so far>`) as you go,
   and note in PROGRESS.md what is half-done and how to continue. A WIP commit must still build
   (stub unfinished parts rather than leaving broken code).
4. Never keep important plans only in chat — write them into PROGRESS.md / DESIGN.md / story files.
5. Push retries on network failure: 2s, 4s, 8s, 16s.

## 1. SPOILER RULE (absolute)
The owner wants to play unspoiled.
- Story truth lives ONLY in `story/` (`STORY_SECRET.md` = owner's original; `STORY_PLAN_SECRET.md` =
  working plan) and in content data under `src/content/`.
- Never reveal plot twists, hidden truths, endings, secret identities, or the contents of those files
  in chat, commit messages, filenames, PROGRESS.md, DESIGN.md, ROADMAP.md, or engine code comments.
- Report story work vaguely ("added the Act 2 archive location and its quest").
- Content files get neutral IDs (`npc_shale_07`, not names that reveal roles/twists).
- Story-sensitive TODOs go in `story/STORY_PLAN_SECRET.md`, never in PROGRESS.md.
- If a decision touching story is needed from the owner, ask it in a spoiler-free way.
- Safe to discuss (owner knows): the Burn (90 years ago), Cistern 9, MOTHER the caretaker computer, the
  dying masked stranger with a photo of the player older in a ruined city dated 41 years ago, the town of
  Shale, Rust Dogs raiders, Tollmen merchant guild, Choir of the Open Sky (gentle-seeming religious
  community), the Ledger (pre-war city AI enforcing old laws). Chapter One ends when the player gets the
  stranger's map.

## 2. Owner decisions (binding)
- Fully original: no Fallout names/IP. Genre conventions only. Add best-practice fun from leading RPGs.
- **No time limits** (owner): no day limits or deadlines of any kind. Nothing fails, expires or resolves behind the
  player's back because days passed. Scheduled events wait for the player (`WorldEventDef.at: { hour, where }`),
  keystone outcomes resolve on story milestones, and only durations are allowed (drills take days, cooldowns, travel).
- **60+ hours = one single playthrough** (not completionist).
- Touch: tap-to-act (tap move, tap target → radial menu, pinch zoom); the camera turns with ONE finger (see the upgrade directive).
- Character creation: **fuller face sculptor** + several aesthetic options (body, skin, hair, scars,
  tattoos, clothing colours, voice-less). The photo in the story uses the player's own face, aged.
- Romance: full, following genre best practice (opt-in, consent-forward, companion-specific, can fail).
- Text only (no voice). No ironman mode, no permanent-companion-death mode toggles.
- Mature themes: full realism, no filter, as long as coherent with a real post-apocalyptic world.
- Economy: rewarding progression, scarcity early — no flood of resources (see DESIGN §Economy).
- Plot is road-tested against common traits of critically lauded RPGs; owner allows changes to the
  original story where it improves it (track them in STORY_PLAN_SECRET.md).
- Live AI dialogue (later): Claude API with the player's own key, browser-side, optional; dialogue trees
  must always work offline.
- Deploy: GitHub Pages via GitHub Actions on push to `main`.
- **Not a Fallout clone in mechanics** (owner, design pass 2): keep the post-apocalyptic, lawless frontier vibe, but
  prefer creative, coherent modern features over Fallout conventions. Avoid trite "who am I really / chosen one"
  story cores. Keep: XP levels + perks, classic turn-based combat. UI: field notebook & map (not a wrist computer).
  No global karma — reputation is local and travels with people.
- **Cyberpunk integration** (owner, design pass 3): fuse cyberpunk themes/tech into the post-apocalypse to be
  distinct from both Fallout and Cyberpunk — rare superhuman bionics (scarcity), a couple of deep surviving
  megacities (Night City-like bastions with lawlessness/corruption and extreme inequality: decadent ultra-rich vs
  destitute), coherent world history first, expansive content-dense map rewarding nonlinear exploration, clever
  transport + fast travel. NPCs need strong visual variance; settlement types must vary. Quality/depth over size.

- **The upgrade directive** (owner, pass 5, 2026-10-27; plan in `docs/UPGRADE.md`, binding): ONE OPEN WORLD, no
  loading screens between places (streamed, one continuous terrain; interiors open instantly) — non-negotiable; the
  visual bar is a modern isometric RPG on a 2026 phone (DOS2 as the aspiration): PBR, real terrain with many surfaces
  and surviving greenery, lit palette (not dark/dusty by default), dense living places; humans that look and move like
  humans (captured motion); no cursive, no farmer's dungarees; names that feel found, not "the [noun]"; conversations
  that progress and never loop; one-finger camera turn on touch; rerolls with real variance; portraits without a wait;
  characters with distinct, rational motives and deep relationships. Content building pauses until U1–U5 are in.
- **Installable app, not a web page** (owner, pass 6, 2026-10-27): the release is an installable app that runs full
  screen (no browser bar) in landscape. Performance is a first-class goal: wherever the game can run faster without
  losing aesthetic or experience, it must, in line with modern mobile best practice.
- **Unity port** (owner decision, 2026-10-28): the game is ported to **Unity 6 LTS (6000.3) with URP**, Android
  first (APK built by CI; iOS when a Mac and Apple account exist). The plan and conventions are in `docs/PORT.md`
  and override the content roadmap until the port reaches parity. The TS/three.js game in `src/` is frozen as the
  reference implementation and the content validator; content data (`src/content/`) stays the source of truth and
  is exported to the Unity project by a tool. No new web features.
- **No anchoring on the web game's graphics** (owner, 2026-10-28): the Unity port maximises graphical quality within
  what a 2026 Android phone runs at a smooth frame rate. The three.js look is not a reference for visuals; where
  assets or textures must be remade or replaced to reach that quality, remake them. The U1–U4 evidence is a floor
  for behaviour and a record of what exists, never a ceiling for how it should look.
- **Redesign on Unity — exhaust the engine** (owner, 2026-10-28, pass 7, binding): "You must exhaust the benefits of
  Unity engine given the amount of effort it takes. We are now aiming for a much higher, overhauled standard in
  aesthetic, but also functionality. IT MUST BE the highest aesthetic + functionality standard possible (DOS2 / BG3 /
  Cyberpunk are aspirational benchmarks — obviously full achievement of the aspiration is not possible on mobile),
  subject to the constraint that it must run on a modern Android phone, and Android is the primary console
  targeted. Do not anchor on the web game, because that will waste the potential of Unity. Keep only the
  narrative/thematic elements and redesign a new game with new textures and assets (created or existing, whichever
  is best for our design)." What is kept and what is redesigned is set out in `docs/PORT.md` §1; the standard and
  the asset strategy in §4. The web game is neither a visual nor a design reference any more; its rules live on only
  where the narrative content depends on them (checks, flags, quests), and even those are open to redesign.
- **Wardrobe is lore-bound** (owner, 2026-10-28, binding): every clothing asset must be consistent with this world —
  post-apocalyptic, cyberpunk, anarchistic: salvaged, re-dyed, patched, layered, taped and rigged; clean synthetics and
  lit trims only on the megacity rich; no prints, logos, modern fashion, costume or uniform-as-such. Found garment
  meshes may be used for their silhouette alone and are always re-textured by our pipeline (`docs/DESIGN_UNITY.md` §4).
- Visual style (superseded where the upgrade directive says otherwise): orthographic iso camera, rotatable/zoomable.

## 3. Engineering conventions
- Engine code in `src/engine/**`, game content in `src/content/**` (typed TS data modules).
  Adding content must not require engine changes.
- `npm run dev` / `npm run build` / `npm run check` / `npm run validate`.
- Keep mobile budgets: ≤ ~150 draw calls per scene, merged/instanced geometry, texture atlases.
- Save format is versioned with migrations in `src/engine/save/migrations.ts`.
