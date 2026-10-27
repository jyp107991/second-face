import * as THREE from 'three';
import { MAPS, NPCS } from '../content';
import { cutawayUniforms } from './assets/materials';
import { EventBus } from './core/events';
import { dayOf, hourOf, newGameState, type GameState, type Pronouns } from './core/state';
import type { Appearance } from './data/appearance';
import type { CharacterSheet } from './stats/sheet';
import { addItem, emptyInventory, equip, makeItem, removeItem, syncGear } from './inventory/inventory';
import { Input } from './input/input';
import { Atmosphere } from './render/atmosphere';
import { IsoCamera } from './render/camera';
import { PostFX } from './render/postfx';
import { QUALITY, detectQuality, type QualityLevel } from './render/quality';
import { Actor } from './scene/actor';
import { lookFrom, outfitProxyKeys, type Outfit } from './assets/humanoid';
import { BASE_OUTFIT, wardrobeKey, wardrobeOutfit, wearProxyKeys } from './inventory/wardrobe';
import { ensureProxies } from './assets/human/data';
import type { PortraitStage } from './render/portrait';
import { QuestEngine } from './quest/quest';
import { apply, runTimers, test, type LogicHost } from './world/logic';
import { runWorldEvents, spreadNews } from './world/frontier';
import { discoveriesOnLeg, rollEncounter } from './world/roads';
import { QUESTS, ROAD_ENCOUNTERS, SETTLEMENTS, WORLD_EVENTS, WORLD_MAP } from '../content';
import { buildLocation, type BuiltLocation } from './scene/location';
import type { ExitDef, MapDef } from './data/types';
import type { NpcPlacement } from './npc/defs';
import { SaveManager, type SaveFile, type SlotId } from './save/saves';
import { createBackend } from './save/storage';
import { Encounter, type Unit } from './combat/encounter';
import { utilityAi } from './combat/ai';
import type { Combatant } from './combat/rules';
import { Rng } from './core/rng';
import { Fx } from './render/fx';
import { npcLook, spawnNpc, type NpcRuntime } from './npc/spawn';
import { followPath, freeTileNear, reviveDowned, shouldFollow } from './npc/party';
import { scheduleAt, scheduleTile } from './npc/schedule';
import { addXp, attr, derived } from './stats/sheet';
import { chromeDef, settleDrift, tickChromeUpkeep } from './stats/chrome';
import { skillCheck } from './stats/checks';
import { AudioEngine, stepSoundFor, type SfxId } from './audio/audio';
import { difficultyMods, keyAction, settings, tipOnce } from './ui/settings';
import { pacing } from './combat/encounter';

export type GameEvents = {
  locationChanged: { id: string; name: string };
  saved: { slot: SlotId };
  loaded: { slot?: SlotId };
  tick: { dt: number };
  message: { text: string };
  /** A chapter or location card. */
  title: { text: string };
  /** The player's body was rebuilt (clothes, weapon, chrome). */
  lookChanged: object;
  gameOver: Record<string, never>;
  openTransfer: { inv: import('./inventory/inventory').Inventory; name: string };
  /** A person, or a tree with a named speaker (terminal, sealed door, a body). */
  openDialogue: { npc?: NpcRuntime; tree?: string; name?: string };
  openBarter: { npc: NpcRuntime };
  openCamp: Record<string, never>;
  openMap: Record<string, never>;
  openDust: { npc: NpcRuntime; stake: number; prize?: import('./world/logic').DustPrize };
  journal: { questId: string; title: string; line: string };
};

/** Cistern-issue coveralls and boots. */
/** The clothes everyone from the Cistern walks out in (worn armour and chrome change it: inventory/wardrobe.ts). */
export const PLAYER_OUTFIT = BASE_OUTFIT;

/** Real seconds → game minutes. 1 real second = 1/3 game minute while exploring (24h ≈ 72 min). */
const GAME_MINUTES_PER_SEC = 1 / 3;

export class Game extends EventBus<GameEvents> {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly cam = new IsoCamera();
  readonly input: Input;
  atmosphere!: Atmosphere;
  post!: PostFX;
  quality: QualityLevel;
  state: GameState;
  loc?: BuiltLocation;
  player?: Actor;
  readonly actors = new Map<string, Actor>();
  private lastFrame = 0;
  private time = 0;
  private cursor: THREE.Mesh;
  private pathMarker: THREE.Mesh;
  private transitioning = false;
  private loadSeq = 0;
  /** Multiplier on the game clock (dev "skip time"). */
  timeScale = 1;
  /** When true the simulation is frozen (menus open); rendering continues. */
  paused = false;
  private questCache?: { g: GameState; e: QuestEngine };
  private questTick = 0;

  /** Narrative host: XP toasts and journal notifications for dialogue/quest effects. */
  readonly logicHost: LogicHost = {
    xp: (amount) => this.emit('message', { text: `+${amount} XP` }),
    event: (name, data) => {
      const d = (data ?? {}) as { tree?: string; name?: string; npc?: string };
      if (name === 'dialogue' && d.tree) { window.setTimeout(() => this.emit('openDialogue', { tree: d.tree, name: d.name ?? '' })); return; }
      if (name === 'talk') { const n = this.npcs.get(d.npc ?? ''); if (n) window.setTimeout(() => this.emit('openDialogue', { npc: n })); return; }
      if (name === 'combat') { const turned = this.refreshHostility(); if (turned.length && !this.encounter.active) this.startCombat(turned[0]); return; }
      if (name === 'title') { this.emit('title', { text: (d as { text?: string }).text ?? '' }); return; }
      this.emit('message', { text: name });
    },
    approval: (npc, by) => {
      const name = NPCS[npc]?.name ?? npc;
      const word = by >= 15 ? 'strongly approves' : by > 0 ? 'approves' : by <= -15 ? 'strongly disapproves' : 'disapproves';
      this.emit('message', { text: `${name} ${word}.` });
    },
  };

  /** Quest engine bound to the current game state (rebuilt after loading). */
  get quests(): QuestEngine {
    if (!this.questCache || this.questCache.g !== this.state) {
      const e = new QuestEngine(QUESTS, this.state, this.logicHost);
      e.onJournal = (questId, line) => this.emit('journal', { questId, title: QUESTS[questId]?.title ?? questId, line });
      e.onEnd = (questId, status) => this.emit('message', { text: `${status === 'done' ? 'Completed' : 'Failed'}: ${QUESTS[questId]?.title ?? questId}` });
      this.questCache = { g: this.state, e };
    }
    return this.questCache.e;
  }
  /** When set, this stage is rendered instead of the world (creator, dialogue close-ups). */
  portrait?: PortraitStage;
  saves?: SaveManager;
  private thumbWaiters: ((url: string) => void)[] = [];
  private captureWaiters: { crop: { x: number; y: number; w: number; h: number }; w: number; h: number; done: (c: HTMLCanvasElement) => void }[] = [];
  readonly npcs = new Map<string, NpcRuntime>();
  readonly fx: Fx;
  readonly encounter: Encounter;
  rng = new Rng(1);
  /** The player's combat view of state.pc (rebuilt on load). */
  pc!: Combatant;
  private reachMesh: THREE.InstancedMesh;
  private pathMesh: THREE.InstancedMesh;
  private hostilityTimer = 0;
  private pendingInteract?: { x: number; y: number; run: () => void };
  private pileGroup = new THREE.Group();
  readonly audio = new AudioEngine();
  fps = 0;
  private fpsAcc = 0;
  private fpsFrames = 0;
  /** Recent real frame times (ms) for the perf snapshot. */
  private frameMs: number[] = [];
  /** Set by main.ts: ms from page start to the first playable frame. */
  loadMs = 0;

  /** Performance snapshot for the dev overlay and tools/qa/bench.cjs. Memory figures are estimates from the scene. */
  perf(): { fps: number; frameAvgMs: number; frameP95Ms: number; draws: number; tris: number; textures: number; textureMB: number; geometries: number; geometryMB: number; heapMB: number; loadMs: number; npcs: number } {
    const ms = this.frameMs.slice().sort((a, b) => a - b);
    const avg = ms.length ? ms.reduce((t, v) => t + v, 0) / ms.length : 0;
    const p95 = ms.length ? ms[Math.min(ms.length - 1, Math.floor(ms.length * 0.95))] : 0;
    const texSeen = new Set<THREE.Texture>(); let texBytes = 0;
    const geoSeen = new Set<THREE.BufferGeometry>(); let geoBytes = 0;
    const scan = (root: THREE.Object3D) => root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry && !geoSeen.has(m.geometry)) {
        geoSeen.add(m.geometry);
        for (const a of Object.values(m.geometry.attributes)) geoBytes += (a as THREE.BufferAttribute).array.byteLength;
        if (m.geometry.index) geoBytes += m.geometry.index.array.byteLength;
      }
      for (const mat of [m.material].flat()) {
        if (!mat) continue;
        for (const v of Object.values(mat as unknown as Record<string, unknown>)) {
          const t = v as THREE.Texture;
          if (t && (t as THREE.Texture).isTexture && !texSeen.has(t)) {
            texSeen.add(t);
            const img = t.image as { width?: number; height?: number } | undefined;
            if (img?.width && img?.height) texBytes += img.width * img.height * 4 * 1.33;
          }
        }
      }
    });
    scan(this.scene);
    if (this.portrait) scan(this.portrait.scene);
    const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
    const info = this.renderer.info;
    return {
      fps: Math.round(this.fps), frameAvgMs: Math.round(avg * 100) / 100, frameP95Ms: Math.round(p95 * 100) / 100,
      draws: info.render.calls, tris: info.render.triangles, textures: info.memory.textures, textureMB: Math.round(texBytes / 1048576),
      geometries: info.memory.geometries, geometryMB: Math.round(geoBytes / 1048576 * 10) / 10, heapMB: mem ? Math.round(mem.usedJSHeapSize / 1048576) : -1,
      loadMs: Math.round(this.loadMs), npcs: this.npcs.size,
    };
  }

  constructor(private container: HTMLElement) {
    super();
    this.quality = (localStorage.getItem('sf.quality') as QualityLevel) || detectQuality();
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Several passes per frame (scene + post); stats are reset once per frame in frame().
    this.renderer.info.autoReset = false;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.className = 'game-canvas';
    this.input = new Input(this.renderer.domElement);
    this.applyQuality(this.quality);

    // Tile cursor + path destination marker.
    const ring = new THREE.RingGeometry(0.36, 0.46, 24).rotateX(-Math.PI / 2);
    this.cursor = new THREE.Mesh(ring, new THREE.MeshBasicMaterial({ color: 0xe8c070, transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false }));
    this.cursor.position.y = 0.02;
    this.pathMarker = new THREE.Mesh(ring, new THREE.MeshBasicMaterial({ color: 0x80ffa0, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false }));
    this.pathMarker.position.y = 0.03;
    this.pathMarker.visible = false;
    this.scene.add(this.cursor, this.pathMarker);

    // Combat overlays: reachable tiles and the AP path preview.
    const tileGeo = new THREE.PlaneGeometry(0.92, 0.92).rotateX(-Math.PI / 2);
    this.reachMesh = new THREE.InstancedMesh(tileGeo, new THREE.MeshBasicMaterial({ color: 0x60c080, transparent: true, opacity: 0.16, depthWrite: false, toneMapped: false }), 600);
    this.reachMesh.count = 0;
    this.reachMesh.frustumCulled = false;
    const dotGeo = new THREE.CircleGeometry(0.14, 10).rotateX(-Math.PI / 2);
    this.pathMesh = new THREE.InstancedMesh(dotGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false }), 64);
    this.pathMesh.count = 0;
    this.pathMesh.frustumCulled = false;
    this.scene.add(this.reachMesh, this.pathMesh, this.pileGroup);
    this.fx = new Fx(this.scene, () => this.cam.camera);
    const game = this;
    this.encounter = new Encounter({
      get grid() { return game.loc!.grid; },
      get rng() { return game.rng; },
      fx: this.fx,
      shake: (a) => this.cam.addShake(a),
      context: (x, y) => ({ indoor: !!this.loc?.map.ambience.indoor, night: hourOf(this.state.minutes) < 6 || hourOf(this.state.minutes) > 20, darkness: 1 - this.atmosphere.lightAt(x + 0.5, y + 0.5) }),
      previewPath: (p, ap) => this.showPath(p, ap),
      showReach: (t) => this.showReach(t),
      now: () => this.state.minutes,
      sound: (id, at) => this.soundAt(id, at),
    });
    this.encounter.ai = utilityAi;
    this.encounter.on('end', ({ outcome }) => {
      if (outcome === 'defeat') this.emit('gameOver', {});
      // Companions who went down get back up, wounded.
      for (const n of this.npcs.values()) {
        if (n.companion && reviveDowned(n.combatant.sheet, this.state.minutes)) { n.actor.revive(); this.emit('message', { text: `${n.def.name} gets back up.` }); }
      }
      this.syncNpcState();
    });

    this.state = newGameState('dev_yard', 15, 9);
    this.syncPacing();
    createBackend().then((b) => (this.saves = new SaveManager(b)));
    this.bindInput();
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  /** Combat speed and difficulty from settings (call after the settings screen changes them). */
  syncPacing(): void {
    pacing.speed = settings().combatSpeed;
    pacing.enemy = difficultyMods();
  }

  /** Where the player stood before the last tap-to-walk, for a quick undo. */
  private lastStand?: { x: number; y: number; until: number };
  get canUndo(): boolean { return !!this.lastStand && performance.now() < this.lastStand.until && !this.encounter.active; }
  undoMove(): void {
    const p = this.player, ls = this.lastStand;
    if (!p || !ls || !this.loc || !this.canUndo) return;
    const path = this.loc.grid.findPath(p.tx, p.ty, ls.x, ls.y, { ignore: p.id });
    this.lastStand = undefined;
    this.pendingInteract = undefined;
    if (path) { p.setPath(path); this.pathMarker.visible = false; }
  }

  /** Make camp here (outdoors, or at a campfire). */
  /**
   * Overland travel between world-map places: the clock runs for the trip, the world moves, and you arrive
   * at the destination's map (by the spawn named for where you came from, else its first spawn).
   */
  async travelTo(to: string, from: string, trip: import('./world/travel').Trip): Promise<void> {
    const loc = WORLD_MAP.locations[to];
    if (!loc || this.transitioning) return;
    this.transitioning = true;
    await fade(1);
    // On the way: hidden places noticed from the track, passing things, or an encounter that stops the trip on a
    // roadside map (its exit continues the trip).
    const notes: string[] = [];
    const isKnown = (id: string) => (this.state.world.knownLocations ?? []).includes(id) || !!this.state.world.knowledge[`loc_${id}`];
    let spent = 0;
    for (const leg of trip.legs) {
      for (const d of discoveriesOnLeg(this.state, WORLD_MAP, leg, isKnown)) {
        this.state.world.knowledge[`loc_${d.id}`] = true;
        notes.push(`From the way you make out ${d.name}, ${d.km} km off. It is on your map now.`);
      }
      const forced = this.forceEncounter ? ROAD_ENCOUNTERS[this.forceEncounter] : undefined;
      this.forceEncounter = undefined;
      const enc = forced ?? rollEncounter(this.state, WORLD_MAP, leg, ROAD_ENCOUNTERS, this.rng);
      if (!enc) { spent += leg.hours; continue; }
      (this.state.world.roadSeen ??= {})[enc.id] = true;
      if (!enc.map) {
        spent += leg.hours;
        apply(enc.effects, this.state, this.logicHost);
        if (enc.text) notes.push(enc.text);
        continue;
      }
      const half = leg.hours / 2;
      this.state.minutes += Math.round((spent + half) * 60);
      runTimers(this.state, this.quests);
      runWorldEvents(this.state, WORLD_EVENTS, this.quests);
      spreadNews(this.state, SETTLEMENTS);
      this.dailyBody();
      const roadside = MAPS[enc.map];
      const npcs = (enc.npcs ?? []).map((n) => { const sp = roadside.spots?.[n.spot] ?? roadside.spawns[0]; return { def: n.def, id: n.id, x: sp.x, y: sp.y, facing: n.facing, dialogue: n.dialogue, schedule: [] }; });
      this.state.world.trip = { to, from, hoursLeft: Math.max(0, trip.hours - spent - half), map: enc.map, encounter: enc.id, npcs };
      await this.loadLocation(enc.map, 'here');
      this.quests.update();
      await fade(0);
      this.transitioning = false;
      this.tellNotes(notes);
      if (enc.dialogue) window.setTimeout(() => this.emit('openDialogue', { tree: enc.dialogue!, name: '' }), 500);
      return;
    }
    this.state.minutes += Math.round(trip.hours * 60);
    runTimers(this.state, this.quests);
    runWorldEvents(this.state, WORLD_EVENTS, this.quests);
    spreadNews(this.state, SETTLEMENTS);
    this.dailyBody();
    this.state.world.at = to;
    const known = (this.state.world.knownLocations ??= []);
    if (!known.includes(to)) known.push(to);
    this.state.flags[`visited_${to}`] = true;
    if (loc.map && MAPS[loc.map]) {
      const spawn = MAPS[loc.map].spawns.some((sp) => sp.id === `from_${from}`) ? `from_${from}` : undefined;
      await this.loadLocation(loc.map, spawn);
    } else {
      this.emit('message', { text: `${loc.name}: nothing here yet but the road.` });
    }
    this.quests.update();
    await fade(0);
    this.transitioning = false;
    this.tellNotes(notes);
    void this.save('auto');
  }

  /** Dev and smoke hook: the next trip meets this encounter instead of rolling. */
  forceEncounter?: string;

  /** What happened on the way, told one thing at a time once the road is behind you. */
  private tellNotes(notes: string[]): void {
    notes.forEach((text, i) => window.setTimeout(() => this.emit('message', { text }), 300 + i * 5000));
  }

  openCamp(): void {
    if (this.encounter.active || !this.loc) return;
    if (this.loc.map.ambience.indoor && !this.nearCampfire()) { this.emit('message', { text: 'Not here. Find a fire or open sky.' }); return; }
    this.emit('openCamp', {});
  }
  private nearCampfire(): boolean {
    const p = this.player;
    return !!p && !!this.loc?.map.props?.some((pr) => (pr.kind === 'campfire' || pr.kind === 'fire_barrel') && Math.max(Math.abs(pr.x - p.tx), Math.abs(pr.y - p.ty)) <= 1);
  }

  applyQuality(level: QualityLevel): void {
    this.quality = level;
    localStorage.setItem('sf.quality', level);
    const q = QUALITY[level];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, q.pixelRatio));
    this.renderer.shadowMap.enabled = q.shadowSize > 0;
    // Rebuild light rig and post pipeline for the new preset.
    if (this.atmosphere) {
      this.scene.remove(this.atmosphere.sun, this.atmosphere.sun.target, this.atmosphere.hemi);
      this.scene.children.filter((c) => (c as THREE.PointLight).isPointLight).forEach((c) => this.scene.remove(c));
    }
    this.atmosphere = new Atmosphere(this.scene, q);
    this.post = new PostFX(this.renderer, q.msaa);
    this.post.bloomEnabled = q.bloom;
    if (this.loc) this.atmosphere.load(this.loc);
    // Materials must recompile for changed light counts / shadows.
    this.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (m) m.needsUpdate = true;
    });
    this.resize();
  }

  resize(): void {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    const pr = this.renderer.getPixelRatio();
    this.post?.setSize(Math.floor(w * pr), Math.floor(h * pr));
    this.cam.setAspect(w / h);
    this.portrait?.setAspect(w / h);
    // Phones in portrait see less width; zoom out a bit.
    this.cam.maxView = w < h ? 34 : 30;
  }

  /** Load a location and place the player at a spawn point (or explicit tile). Fetches the clothing worn there first. */
  async loadLocation(id: string, spawn?: string | { x: number; y: number }): Promise<void> {
    const map = MAPS[id];
    if (!map) throw new Error(`Unknown location ${id}`);
    const outfits = this.placements(map).flatMap((p) => (NPCS[p.def] ? [npcLook(NPCS[p.def]).outfit] : []));
    const seq = ++this.loadSeq;
    const outfit = this.playerOutfit();
    this.lookKey = wardrobeKey(this.state.pc);
    await ensureProxies([...outfitProxyKeys(outfit, ...outfits), ...wearProxyKeys()]).catch((e) => console.warn(e));
    // A newer load started while the clothing was fetching: let it win.
    if (seq !== this.loadSeq) return;
    if (this.loc) {
      this.scene.remove(this.loc.root);
      this.loc.root.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    }
    if (this.loc) this.syncNpcState();
    for (const a of this.actors.values()) { this.scene.remove(a.object); a.body.dispose(); }
    this.actors.clear();
    this.npcs.clear();
    this.fx.clearDecals();

    this.loc = buildLocation(map);
    this.scene.add(this.loc.root);
    this.atmosphere.load(this.loc);
    this.audio.setAmbience(map.ambience.sound);

    let sx = this.state.player.x, sy = this.state.player.y;
    // Changing map without an explicit spawn → use the map's first spawn point.
    if (spawn === undefined && id !== this.state.locationId) spawn = map.spawns[0].id;
    if (typeof spawn === 'string') {
      const s = map.spawns.find((p) => p.id === spawn) ?? map.spawns[0];
      sx = s.x; sy = s.y;
    } else if (spawn) {
      sx = spawn.x; sy = spawn.y;
    }
    this.state.locationId = id;
    this.player = new Actor({
      id: 'player', x: sx, y: sy, facing: this.state.player.facing,
      look: lookFrom(this.state.pc.appearance, outfit),
    }, this.loc.grid);
    this.player.onArriveTile = (x, y) => this.onPlayerTile(x, y);
    this.player.onPathDone = () => {
      this.pathMarker.visible = false;
      const pi = this.pendingInteract;
      if (pi && this.player && Math.max(Math.abs(pi.x - this.player.tx), Math.abs(pi.y - this.player.ty)) <= 1) {
        this.pendingInteract = undefined;
        this.player.faceTowards(pi.x + 0.5, pi.y + 0.5);
        pi.run();
      }
    };
    this.addActor(this.player);
    this.rng.state = this.state.rngState;
    this.pc = { id: 'player', name: this.state.pc.sheet.name || 'You', team: 'player', sheet: this.state.pc.sheet, inv: this.state.pc.inventory, x: sx, y: sy, ap: 0, morale: 100, evasion: 0, isPlayer: true };
    for (const p of this.placements(map)) if (test(p.if, this.state)) this.spawn(p);
    this.spawnParty(sx, sy);
    this.groundPilesChanged();
    this.cam.target.copy(this.player.object.position);
    this.cam.recentre();
    this.cam.snapToTarget();
    this.state.flags[`visited_${id}`] = true;
    const known = (this.state.world.knownLocations ??= []);
    for (const l of Object.values(WORLD_MAP.locations)) if (l.map === id && !known.includes(l.id)) known.push(l.id);
    this.emit('locationChanged', { id, name: map.name });
    this.quests.update();
  }

  /** Spawn an NPC placement on the current map, applying persisted state. */
  spawn(p: import('./npc/defs').NpcPlacement): NpcRuntime | undefined {
    if (!this.loc) return;
    const key = `${this.state.locationId}/${p.id ?? p.def}`;
    const saved = this.state.npcs[key];
    const pos = saved?.x !== undefined ? { ...p, x: saved.x, y: saved.y! } : p;
    if (!this.loc.grid.passable(pos.x, pos.y)) return;
    const rt = spawnNpc(pos, this.loc.grid);
    if (saved?.hp !== undefined) rt.combatant.sheet.hp = saved.hp;
    if (saved?.hostile !== undefined) rt.hostile = saved.hostile;
    if (rt.def.hostileIf && test(rt.def.hostileIf, this.state)) rt.hostile = true;
    if (saved?.inventory) rt.combatant.inv = saved.inventory;
    this.npcs.set(rt.id, rt);
    this.addActor(rt.actor);
    if (saved?.dead) { rt.combatant.sheet.hp = 0; rt.actor.kill(true); }
    return rt;
  }

  /** A healer's work: the player and any companions back to full, wounds cleared. */
  healParty(): void {
    const pc = this.state.pc.sheet;
    pc.hp = derived(pc).maxHp;
    pc.crippled = {};
    for (const id of this.state.world.party) {
      const c = this.state.companions?.[id];
      if (c) { c.sheet.hp = derived(c.sheet).maxHp; c.sheet.crippled = {}; }
      const n = this.npcs.get(id);
      if (n) { n.combatant.sheet.hp = derived(n.combatant.sheet).maxHp; n.combatant.sheet.crippled = {}; }
    }
    this.emit('message', { text: 'You are patched up.' });
  }

  /** Once per game day: chrome draws its upkeep from the pack (or degrades) and Drift settles. */
  private dailyBody(): void {
    const w = this.state.world, pc = this.state.pc, today = dayOf(this.state.minutes);
    if (w.bodyDay === undefined) { w.bodyDay = today; return; }
    for (let day = w.bodyDay + 1; day <= today; day++) {
      if (!pc.sheet.chrome) continue;
      const missed = tickChromeUpkeep(pc.sheet, day, (item) => removeItem(pc.inventory, item, 1) > 0);
      for (const slot of missed) this.emit('message', { text: `Your ${chromeDef(pc.sheet.chrome[slot]!.id)?.name ?? 'chrome'} needs upkeep.` });
      settleDrift(pc.sheet, attr(pc.sheet, 'grit'));
    }
    w.bodyDay = today;
  }

  /** Persist NPC positions/health/inventories for the current map; companions' sheets and packs globally. */
  syncNpcState(): void {
    for (const n of this.npcs.values()) {
      const key = `${this.state.locationId}/${n.id}`;
      const dead = n.combatant.sheet.hp <= 0;
      this.state.npcs[key] = { dead, hp: n.combatant.sheet.hp, x: n.actor.tx, y: n.actor.ty, hostile: n.hostile, inventory: n.combatant.inv };
      if (n.companion || this.state.companions?.[n.id]) {
        const c = ((this.state.companions ??= {})[n.id] ??= { sheet: n.combatant.sheet, inv: n.combatant.inv });
        c.sheet = n.combatant.sheet; c.inv = n.combatant.inv;
      }
    }
    this.state.rngState = this.rng.state;
  }

  /**
   * Put the party on the map: members already placed here are adopted; the rest appear beside the player.
   * Dismissed companions waiting at this location are spawned where they were left.
   */
  private spawnParty(px: number, py: number): void {
    if (!this.loc) return;
    const saved = (this.state.companions ??= {});
    for (const id of this.state.world.party) {
      const def = NPCS[id];
      if (!def) continue;
      let rt = this.npcs.get(id);
      if (!rt) {
        const at = freeTileNear(this.loc.grid, px, py, 'player') ?? { x: px, y: py };
        rt = spawnNpc({ def: id, x: at.x, y: at.y, facing: this.state.player.facing }, this.loc.grid, saved[id]);
        this.npcs.set(rt.id, rt);
        this.addActor(rt.actor);
      } else if (saved[id]) { rt.combatant.sheet = saved[id].sheet; rt.combatant.inv = saved[id].inv; }
      rt.companion = true;
      rt.hostile = false;
      delete saved[id]?.waitingAt;
    }
    for (const [id, c] of Object.entries(saved)) {
      if (this.state.world.party.includes(id) || c.waitingAt?.location !== this.state.locationId || this.npcs.has(id)) continue;
      const at = freeTileNear(this.loc.grid, c.waitingAt.x, c.waitingAt.y) ?? c.waitingAt;
      const rt = spawnNpc({ def: id, x: at.x, y: at.y }, this.loc.grid, c);
      this.npcs.set(rt.id, rt);
      this.addActor(rt.actor);
    }
  }

  /** Reconcile party membership changed by dialogue (join/leave) with the actors on the map. */
  /** Mark party members as companions (and release the ones who left); safe to call any time. */
  syncParty(): void {
    for (const n of this.npcs.values()) {
      const inParty = this.state.world.party.includes(n.id);
      if (inParty && !n.companion) { n.companion = true; n.hostile = false; (this.state.companions ??= {})[n.id] = { sheet: n.combatant.sheet, inv: n.combatant.inv }; }
      else if (!inParty && n.companion) {
        n.companion = false;
        const c = (this.state.companions ??= {})[n.id] ??= { sheet: n.combatant.sheet, inv: n.combatant.inv };
        c.waitingAt = { location: this.state.locationId, x: n.actor.tx, y: n.actor.ty };
      }
    }
  }

  private scheduleTick = 0;
  private barkTick = 0;
  /** Conditional placements on the current map appear or leave as the world changes (an event fired, a flag set). */
  /** A map's placements, plus the people a road encounter put on it. */
  private placements(map: MapDef): NpcPlacement[] {
    const trip = this.state.world.trip;
    return [...(map.npcs ?? []), ...(trip && trip.map === map.id ? trip.npcs : [])];
  }

  syncPlacements(): void {
    const map = this.loc?.map;
    if (!map || this.encounter.active) return;
    const grid = this.loc!.grid;
    for (const p of this.placements(map)) {
      if (!p.if) continue;
      const id = p.id ?? p.def;
      const n = this.npcs.get(id);
      // Companions travel with the player: their placement conditions no longer apply.
      if (this.state.world.party.includes(id)) continue;
      const want = test(p.if, this.state);
      if (want && !n) this.spawn(p);
      else if (want && n?.away && !n.companion) { n.away = false; n.actor.object.visible = true; grid.occupied.set(grid.index(n.actor.tx, n.actor.ty), n.id); }
      else if (!want && n && !n.away && !n.companion && n.combatant.sheet.hp > 0) { n.away = true; n.actor.object.visible = false; grid.occupied.delete(grid.index(n.actor.tx, n.actor.ty)); }
    }
  }

  /** The player's outfit as the inventory and chrome currently have it. */
  playerOutfit(): Outfit {
    return wardrobeOutfit(this.state.pc);
  }

  private lookKey = '';

  /** Rebuild the player's body when something worn, held or installed changed. */
  async refreshPlayerLook(): Promise<void> {
    const key = wardrobeKey(this.state.pc);
    this.lookKey = key;
    const outfit = this.playerOutfit();
    await ensureProxies(outfitProxyKeys(outfit)).catch((e) => console.warn(e));
    // Changed again while the clothes were loading: the next tick picks that up.
    if (!this.player || wardrobeKey(this.state.pc) !== key) return;
    this.player.setLook(lookFrom(this.state.pc.appearance, outfit));
    this.emit('lookChanged', {});
  }

  /** Walk NPCs to where their routine says they should be; take 'away' NPCs off the map. */
  private updateSchedules(dt: number): void {
    if (this.encounter.active || !this.loc || this.paused) return;
    this.scheduleTick += dt;
    if (this.scheduleTick < 2) return;
    this.scheduleTick = 0;
    const hour = hourOf(this.state.minutes), grid = this.loc.grid;
    for (const n of this.npcs.values()) {
      const sched = n.schedule ?? n.def.schedule;
      if (!sched || n.companion || n.hostile || n.actor.isDead) continue;
      const e = scheduleAt(sched, hour);
      const away = e?.activity === 'away';
      if (away !== !!n.away) {
        n.away = away;
        n.actor.object.visible = !away;
        if (away) grid.occupied.delete(grid.index(n.actor.tx, n.actor.ty));
        else { const at = freeTileNear(grid, n.actor.tx, n.actor.ty) ?? { x: n.actor.tx, y: n.actor.ty }; n.actor.place(at.x, at.y); }
      }
      if (away || !e || n.actor.moving) continue;
      const t = scheduleTile(e, this.loc.map.spots);
      if (!t || (t.x === n.actor.tx && t.y === n.actor.ty)) continue;
      const goal = grid.passable(t.x, t.y, n.id) ? t : freeTileNear(grid, t.x, t.y, n.id);
      if (!goal) continue;
      const path = grid.findPath(n.actor.tx, n.actor.ty, goal.x, goal.y, { ignore: n.id, maxCost: 120 });
      if (path && path.length) n.actor.setPath(path);
    }
  }

  /** Idle lines from people near the player. */
  private updateBarks(dt: number): void {
    if (this.encounter.active || !this.player || this.paused) return;
    this.barkTick += dt;
    if (this.barkTick < 4) return;
    this.barkTick = 0;
    for (const n of this.npcs.values()) {
      if (!n.def.barks?.length || n.away || n.actor.isDead || n.hostile) continue;
      if (Math.max(Math.abs(n.actor.tx - this.player.tx), Math.abs(n.actor.ty - this.player.ty)) > 7 || !this.rng.chance(0.08)) continue;
      this.fx.floatText(n.actor.object.position.clone().setY(2.1), this.rng.pick(n.def.barks), '#e8d8b0');
    }
  }

  /** Open trade with a merchant NPC (from dialogue or a tap). */
  openBarter(npc: NpcRuntime): void {
    if (!npc.def.merchant) return;
    this.emit('openBarter', { npc });
  }

  private followTick = 0;
  /** Companions trail the player outside combat. */
  private updateFollowers(dt: number): void {
    if (this.encounter.active || !this.player || !this.loc || this.paused) return;
    this.followTick += dt;
    if (this.followTick < 0.3) return;
    this.followTick = 0;
    const p = this.player;
    for (const n of this.npcs.values()) {
      if (!n.companion || n.actor.isDead || n.actor.moving) continue;
      const dist = Math.max(Math.abs(n.actor.tx - p.tx), Math.abs(n.actor.ty - p.ty));
      if (!shouldFollow(dist, p.moving)) continue;
      const path = followPath(this.loc.grid, { id: n.id, x: n.actor.tx, y: n.actor.ty }, { x: p.tx, y: p.ty, facing: p.facing });
      if (path && path.length) { n.actor.running = p.running || dist > 5; n.actor.setPath(path); }
    }
  }

  startCombat(target?: NpcRuntime): void {
    if (this.encounter.active || !this.player || !this.loc) return;
    this.player.stop();
    this.pathMarker.visible = false;
    this.pc.x = this.player.tx; this.pc.y = this.player.ty;
    const units: Unit[] = [{ c: this.pc, actor: this.player, hostile: false }];
    for (const n of this.npcs.values()) {
      if (n.combatant.sheet.hp <= 0 || n.away) continue;
      n.combatant.x = n.actor.tx; n.combatant.y = n.actor.ty;
      if (n.companion) { units.push({ c: n.combatant, actor: n.actor, hostile: false }); continue; }
      const near = Math.max(Math.abs(n.actor.tx - this.player.tx), Math.abs(n.actor.ty - this.player.ty)) <= 24;
      if (!near && !n.hostile) continue;
      if (!n.hostile && n !== target) {
        // A town's militia (or anyone whose `ally` condition holds) fights beside you.
        if (n.def.ally && test(n.def.ally, this.state)) units.push({ c: n.combatant, actor: n.actor, hostile: false });
        continue;
      }
      if (n === target) n.hostile = true;
      units.push({ c: n.combatant, actor: n.actor, hostile: n.hostile, leader: n.def.leader });
    }
    if (units.length < 2) return;
    const tip = tipOnce('combat', 'Turn-based: move costs 1 AP a tile, shooting 4–5. Aim at body parts to cripple. End turn with T.');
    if (tip) this.emit('message', { text: tip });
    this.encounter.start(units);
    if (target) this.encounter.target = units.find((u) => u.c.id === target.id);
  }

  private showReach(tiles: { x: number; y: number }[] | null): void {
    const m = new THREE.Matrix4();
    const list = tiles ?? [];
    this.reachMesh.count = Math.min(list.length, 600);
    for (let i = 0; i < this.reachMesh.count; i++) this.reachMesh.setMatrixAt(i, m.makeTranslation(list[i].x + 0.5, 0.015, list[i].y + 0.5));
    this.reachMesh.instanceMatrix.needsUpdate = true;
  }

  private showPath(path: { x: number; y: number }[] | null, affordable: number): void {
    const m = new THREE.Matrix4();
    const list = (path ?? []).slice(0, 64);
    this.pathMesh.count = list.length;
    const c = new THREE.Color();
    for (let i = 0; i < list.length; i++) {
      this.pathMesh.setMatrixAt(i, m.makeTranslation(list[i].x + 0.5, 0.025, list[i].y + 0.5));
      this.pathMesh.setColorAt(i, c.setHex(i < affordable ? 0x80ffa0 : 0xff6050));
    }
    this.pathMesh.instanceMatrix.needsUpdate = true;
    if (this.pathMesh.instanceColor) this.pathMesh.instanceColor.needsUpdate = true;
  }

  /** Hostile NPCs that can see the player start combat. */
  private checkHostility(): void {
    if (this.encounter.active || !this.player || this.transitioning) return;
    for (const n of this.npcs.values()) {
      if (!n.hostile || n.combatant.sheet.hp <= 0 || n.away) continue;
      const d = Math.max(Math.abs(n.actor.tx - this.player.tx), Math.abs(n.actor.ty - this.player.ty));
      if (d <= derived(n.combatant.sheet).sightRange && this.loc!.grid.lineOfSight(n.actor.tx, n.actor.ty, this.player.tx, this.player.ty)) {
        this.emit('message', { text: `${n.def.name} spots you!` });
        this.startCombat();
        return;
      }
    }
  }

  /** Corpse, container or ground pile at a tile → walk over and open it. Returns true if handled. */
  tryInteract(x: number, y: number): boolean {
    const target = this.interactableAt(x, y);
    if (!target || !this.player || !this.loc) return false;
    const run = target;
    const p = this.player;
    if (Math.max(Math.abs(x - p.tx), Math.abs(y - p.ty)) <= 1) { p.faceTowards(x + 0.5, y + 0.5); run(); return true; }
    const path = this.loc.grid.findPath(p.tx, p.ty, x, y, { ignore: p.id, adjacentOk: true });
    if (!path) return false;
    this.pendingInteract = { x, y, run };
    p.setPath(path);
    return true;
  }

  private interactableAt(x: number, y: number): (() => void) | undefined {
    const loc = this.state.locationId;
    for (const n of this.npcs.values()) {
      if (n.actor.tx !== x || n.actor.ty !== y || n.away) continue;
      if (n.combatant.sheet.hp > 0) {
        if (n.hostile || this.encounter.active) continue;
        if (n.dialogue ?? n.def.dialogue) return () => this.emit('openDialogue', { npc: n });
        if (n.def.merchant) return () => this.openBarter(n);
        continue;
      }
      return () => {
        const inv = n.combatant.inv;
        for (const slot of ['primary', 'secondary', 'body', 'head'] as const) { const e = inv.equipped[slot]; if (e) { delete inv.equipped[slot]; inv.items.push(e); } }
        this.emit('openTransfer', { inv, name: `${n.def.name} (dead)` });
      };
    }
    const pileKey = `${loc}/ground_${x}_${y}`;
    if (this.state.containers[pileKey] && (this.state.containers[pileKey].items.length || this.state.containers[pileKey].tolls)) {
      return () => this.emit('openTransfer', { inv: this.state.containers[pileKey], name: 'Ground' });
    }
    const fire = this.loc?.map.props?.find((p) => p.x === x && p.y === y && (p.kind === 'campfire' || p.kind === 'fire_barrel'));
    if (fire) return () => this.emit('openCamp', {});
    const talker = this.loc?.map.props?.find((p) => p.x === x && p.y === y && p.id && this.loc!.map.talk?.[p.id]);
    if (talker) { const t = this.loc!.map.talk![talker.id!]; return () => this.emit('openDialogue', { tree: t.dialogue, name: t.name }); }
    const prop = this.loc?.map.props?.find((p) => p.x === x && p.y === y && p.id && this.loc!.map.containers?.[p.id]);
    if (prop) {
      const def = this.loc!.map.containers![prop.id!];
      const key = `${loc}/${prop.id}`;
      return () => {
        const unlockedFlag = `unlocked:${key}`;
        if (def.lock && !this.state.flags[unlockedFlag]) {
          const r = skillCheck(this.state.pc.sheet, this.state.pc.inventory, 'security', def.lock, this.rng);
          this.state.minutes += 2;
          if (!r.success) { this.emit('message', { text: `Locked. Your Locks ${r.value}% isn't enough (needs ${r.dc}).` }); return; }
          this.state.flags[unlockedFlag] = true;
          const xp = 10 + Math.round(def.lock / 2);
          addXp(this.state.pc.sheet, xp);
          this.emit('message', { text: `Lock picked. +${xp} XP` });
        }
        if (!this.state.containers[key]) {
          const inv = emptyInventory();
          for (const [id, n] of def.items) addItem(inv, makeItem(id, n));
          inv.tolls = def.tolls ?? 0;
          this.state.containers[key] = inv;
        }
        this.emit('openTransfer', { inv: this.state.containers[key], name: def.name });
      };
    }
  }

  /** Rebuild the little sack meshes for dropped items on this map. */
  groundPilesChanged(): void {
    this.pileGroup.clear();
    const prefix = `${this.state.locationId}/ground_`;
    for (const [k, inv] of Object.entries(this.state.containers)) {
      if (!k.startsWith(prefix) || (!inv.items.length && !inv.tolls)) continue;
      const [x, y] = k.slice(prefix.length).split('_').map(Number);
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18, 0).scale(1, 0.7, 1), new THREE.MeshStandardMaterial({ color: 0x8a7a5a, flatShading: true }));
      m.position.set(x + 0.5, 0.12, y + 0.5);
      m.castShadow = true;
      this.pileGroup.add(m);
    }
  }

  npcAt(x: number, y: number): NpcRuntime | undefined {
    for (const n of this.npcs.values()) if (n.actor.tx === x && n.actor.ty === y && n.combatant.sheet.hp > 0) return n;
  }

  /** Play a sound at a world position: panned by screen position, attenuated by distance from view. */
  soundAt(id: SfxId, at?: THREE.Vector3, gain = 1): void {
    if (!at) { this.audio.play(id, 0, gain); return; }
    const v = at.clone().project(this.cam.camera);
    const d = Math.hypot(at.x - this.cam.focus.x, at.z - this.cam.focus.z);
    const g = gain * Math.max(0, Math.min(1, 1 - (d - 8) / 22));
    this.audio.play(id, v.x * 0.8, g);
  }

  addActor(a: Actor): void {
    a.onStep = (x, y) => {
      const t = this.loc?.grid.get(x, y);
      this.soundAt(stepSoundFor(t?.def.floor ?? (this.loc?.map.ambience.indoor ? 'concrete' : 'sand')), a.object.position, a.id === 'player' ? 0.6 : 0.35);
    };
    this.actors.set(a.id, a);
    this.scene.add(a.object);
  }

  private onPlayerTile(x: number, y: number): void {
    this.state.player.x = x;
    this.state.player.y = y;
    const map = this.loc?.map;
    if (!map) return;
    for (const t of map.triggers ?? []) {
      if (!inExit(t, x, y) || !test(t.if, this.state)) continue;
      const key = `trigger:${map.id}/${t.id}`;
      if (t.once !== false && this.state.flags[key]) continue;
      this.state.flags[key] = true;
      if (t.text) this.emit('message', { text: t.text });
      apply(t.effects, this.state, this.logicHost);
      this.quests.update();
    }
    const exit = map.exits?.find((e) => inExit(e, x, y) && test(e.if, this.state));
    if (exit && !this.transitioning) this.useExit(exit);
  }

  /** Re-evaluate conditional hostility (after conversations and flag changes). Returns NPCs that just turned. */
  refreshHostility(): NpcRuntime[] {
    const turned: NpcRuntime[] = [];
    for (const n of this.npcs.values()) {
      if (n.hostile || !n.def.hostileIf || n.combatant.sheet.hp <= 0) continue;
      if (test(n.def.hostileIf, this.state)) { n.hostile = true; turned.push(n); }
    }
    return turned;
  }

  private async useExit(exit: ExitDef): Promise<void> {
    apply(exit.effects, this.state, this.logicHost);
    this.quests.update();
    if (!('location' in exit.to)) {
      const trip = this.state.world.trip;
      if (trip && this.loc?.map.id === trip.map) {
        // Back on the road: the rest of the trip, time already half spent.
        this.state.world.trip = undefined;
        void this.travelTo(trip.to, trip.from, { legs: [], hours: trip.hoursLeft, fare: 0, fast: false });
        return;
      }
      this.emit('openMap', {});
      return;
    }
    this.transitioning = true;
    const to = exit.to;
    await fade(1);
    await this.loadLocation(to.location, to.spawn);
    await fade(0);
    this.transitioning = false;
    void this.save('auto');
  }

  /** Screen → tile under pointer (ground plane). */
  pickTile(sx: number, sy: number): { x: number; y: number } | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2((sx / rect.width) * 2 - 1, -(sy / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.cam.camera);
    const hit = new THREE.Vector3();
    if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) return null;
    const x = Math.floor(hit.x), y = Math.floor(hit.z);
    return this.loc?.grid.inBounds(x, y) ? { x, y } : null;
  }

  private bindInput(): void {
    const i = this.input;
    i.on('tap', ({ x, y, mouse }) => {
      const t = this.pickTile(x, y);
      if (!t || !this.player || !this.loc || this.transitioning || this.paused) return;
      if (this.encounter.active) { this.encounter.tapTile(t.x, t.y, mouse); return; }
      const npc = this.npcAt(t.x, t.y);
      if (npc && npc.hostile) { this.startCombat(npc); return; }
      if (this.tryInteract(t.x, t.y)) return;
      this.pendingInteract = undefined;
      const p = this.player;
      const path = this.loc.grid.findPath(p.tx, p.ty, t.x, t.y, { ignore: p.id, adjacentOk: true });
      if (path && path.length) {
        this.lastStand = { x: p.tx, y: p.ty, until: performance.now() + 8000 + path.length * 400 };
        const tip = tipOnce('move', 'Tapped the wrong place? Undo (↶) walks you back for a few seconds.');
        if (tip) this.emit('message', { text: tip });
        p.setPath(path);
        const end = path[path.length - 1];
        this.pathMarker.position.set(end.x + 0.5, 0.03, end.y + 0.5);
        this.pathMarker.visible = true;
        this.cam.recentre();
      }
    });
    i.on('hover', ({ x, y }) => {
      const t = this.pickTile(x, y);
      this.cursor.visible = !!t && !!this.loc?.grid.get(t.x, t.y)?.walkable;
      if (t) this.cursor.position.set(t.x + 0.5, 0.02, t.y + 0.5);
      if (t && this.encounter.active) this.encounter.hoverTile(t.x, t.y);
    });
    i.on('pan', ({ dx, dy }) => this.cam.panScreen(dx, dy, this.renderer.domElement.clientHeight));
    i.on('zoom', ({ factor }) => this.cam.zoomBy(factor));
    i.on('rotate', ({ rad }) => this.cam.rotateBy(rad));
    i.on('rotateStep', ({ dir }) => this.cam.rotateStep(dir));
    i.on('key', ({ code }) => {
      const a = keyAction(code);
      if (a === 'quicksave') void this.save('quick');
      if (a === 'quickload') void this.loadSlot('quick');
      if (a === 'centre') this.cam.recentre();
      if (a === 'rotateL') this.cam.rotateStep(-1);
      if (a === 'rotateR') this.cam.rotateStep(1);
      if (a === 'run' && this.player && !this.encounter.active) this.player.running = !this.player.running;
      if (a === 'undo') this.undoMove();
      if (a === 'camp') this.openCamp();
      if (a === 'map' && !this.encounter.active) this.emit('openMap', {});
      if (this.encounter.active && (code === 'Enter' || a === 'endTurn')) this.encounter.endTurn();
    });
  }

  /** Start a fresh game with a newly created character. */
  newGame(sheet: CharacterSheet, appearance: Appearance, pronouns: Pronouns, origin?: string): void {
    const inventory = emptyInventory();
    // Starting kit (Cistern issue). Kept deliberately thin: scarcity starts at the door.
    for (const [id, n] of [['r_jumpsuit', 1], ['w_shiv', 1], ['c_knitkit', 1], ['c_algae', 3], ['c_water', 2]] as const) addItem(inventory, makeItem(id, n));
    equip(inventory, inventory.items.findIndex((i) => i.def === 'r_jumpsuit'));
    equip(inventory, inventory.items.findIndex((i) => i.def === 'w_shiv'));
    inventory.tolls = 0;
    syncGear(sheet, inventory);
    const start = MAPS.cistern9 ? 'cistern9' : 'dev_yard';
    this.state = newGameState(start, 15, 9, { sheet, appearance, pronouns, inventory });
    this.state.origin = origin;
    this.paused = false;
    if (QUESTS.q_ch1_door) this.quests.questStart('q_ch1_door');
    // The Cistern's atlases know the nearest town.
    this.state.world.knownLocations = ['cistern9', 'shale'];
    this.state.world.at = 'cistern9';
    void this.loadLocation(start, 'start').then(() => this.save('auto'));
  }

  // --- Save / load ---------------------------------------------------------

  async save(slot: SlotId, label?: string): Promise<void> {
    if (!this.saves || !this.loc) return;
    if (this.encounter.active) { this.emit('message', { text: 'Cannot save during combat' }); return; }
    this.syncNpcState();
    const thumb = await this.captureThumb();
    await this.saves.write(slot, {
      label: label ?? (slot === 'auto' ? 'Autosave' : slot === 'quick' ? 'Quicksave' : this.loc.map.name),
      locationId: this.state.locationId,
      locationName: this.loc.map.name,
      minutes: this.state.minutes,
      playtimeSec: this.state.playtimeSec,
      thumb,
    }, this.state);
    this.emit('saved', { slot });
    if (slot !== 'auto') this.emit('message', { text: 'Game saved' });
  }

  async loadSlot(slot: SlotId): Promise<boolean> {
    const f = await this.saves?.read(slot);
    if (!f) { this.emit('message', { text: 'No save in that slot' }); return false; }
    await this.loadFile(f, slot);
    return true;
  }

  async loadFile(f: SaveFile, slot?: SlotId): Promise<void> {
    await fade(1, 200);
    this.state = structuredClone(f.state);
    await this.loadLocation(this.state.locationId, { x: this.state.player.x, y: this.state.player.y });
    this.emit('loaded', { slot });
    await fade(0, 300);
  }

  /** Small JPEG of the current frame, captured right after the next render. */
  captureThumb(): Promise<string> {
    return new Promise((r) => this.thumbWaiters.push(r));
  }

  private resolveThumbs(): void {
    const src = this.renderer.domElement;
    const c = document.createElement('canvas');
    c.width = 192; c.height = 108;
    const ctx = c.getContext('2d')!;
    const sw = src.width, sh = src.height, ar = 16 / 9;
    const cw = Math.min(sw, sh * ar), ch = cw / ar;
    ctx.drawImage(src, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, c.width, c.height);
    const url = c.toDataURL('image/jpeg', 0.6);
    for (const w of this.thumbWaiters.splice(0)) w(url);
  }

  /** Display name of the current location. */
  get locationName(): string | undefined { return this.loc?.map.name; }

  /** Grab part of the next rendered frame (crop in 0..1 of the canvas) into a w×h canvas. */
  captureFrame(crop: { x: number; y: number; w: number; h: number }, w: number, h: number): Promise<HTMLCanvasElement> {
    return new Promise((done) => this.captureWaiters.push({ crop, w, h, done }));
  }

  private resolveCaptures(): void {
    const src = this.renderer.domElement;
    for (const c of this.captureWaiters.splice(0)) {
      const out = document.createElement('canvas');
      out.width = c.w; out.height = c.h;
      out.getContext('2d')!.drawImage(src, c.crop.x * src.width, c.crop.y * src.height, c.crop.w * src.width, c.crop.h * src.height, 0, 0, c.w, c.h);
      c.done(out);
    }
  }

  start(): void {
    this.renderer.setAnimationLoop((t) => this.frame(t));
  }

  private frame(now: number): void {
    const realDt = this.lastFrame ? Math.max(0, (now - this.lastFrame) / 1000) : 0;
    if (this.lastFrame) { this.frameMs.push(realDt * 1000); if (this.frameMs.length > 180) this.frameMs.shift(); }
    const dt = Math.min(0.05, realDt);
    this.lastFrame = now;
    this.renderer.info.reset();
    this.time += dt;
    const simDt = this.paused ? 0 : dt;
    this.state.playtimeSec += simDt;
    if (!this.encounter.active) this.state.minutes += simDt * GAME_MINUTES_PER_SEC * this.timeScale;
    this.questTick += dt;
    if (this.questTick > 0.5) {
      this.questTick = 0;
      runTimers(this.state, this.quests);
      const fired = runWorldEvents(this.state, WORLD_EVENTS, this.quests);
      spreadNews(this.state, SETTLEMENTS);
      this.dailyBody();
      this.quests.update();
      this.syncParty();
      if (fired.length) this.syncPlacements();
    }
    if (this.player && wardrobeKey(this.state.pc) !== this.lookKey) void this.refreshPlayerLook();
    this.updateFollowers(simDt);
    this.updateSchedules(simDt);
    this.updateBarks(simDt);
    this.hostilityTimer += simDt;
    if (this.hostilityTimer > 0.3) { this.hostilityTimer = 0; this.checkHostility(); }

    // Keyboard camera pan
    const held = this.input.held, panSpeed = 600 * dt;
    if (held.has('KeyW') || held.has('ArrowUp')) this.cam.panScreen(0, panSpeed, 800);
    if (held.has('KeyS') || held.has('ArrowDown')) this.cam.panScreen(0, -panSpeed, 800);
    if (held.has('KeyA') || held.has('ArrowLeft')) this.cam.panScreen(panSpeed, 0, 800);
    if (held.has('KeyD') || held.has('ArrowRight')) this.cam.panScreen(-panSpeed, 0, 800);

    for (const a of this.actors.values()) a.update(simDt);
    const cur = this.encounter.active ? this.encounter.current : undefined;
    if (cur && !cur.c.isPlayer) this.cam.target.copy(cur.actor.object.position);
    else if (this.player) {
      this.cam.target.copy(this.player.object.position);
      this.state.player.facing = this.player.facing;
    }
    this.cam.update(dt);

    // Cutaway centred on the player (chest height).
    if (this.player) cutawayUniforms.uCutCenter.value.copy(this.player.object.position).setY(1.0);
    this.cam.forward(cutawayUniforms.uCamDir.value);

    this.atmosphere.hour = hourOf(this.state.minutes);
    this.atmosphere.focusDistance = this.cam.distance;
    this.atmosphere.update(dt, this.time, this.cam.focus, this.post.settings);
    this.cursor.rotation.y += dt;
    this.fx.update(dt);
    if (this.portrait) {
      // Close-ups: softer grade so skin tones read naturally; shadows always on.
      const s = this.post.settings;
      s.grade = 0.22; s.grain = 0.025; s.vignette = 0.55; s.bloom = 0.15; s.exposure = 0.85;
      this.renderer.shadowMap.enabled = true;
      if (!this.portrait.scene.environment) this.portrait.useEnvironment(this.renderer);
      this.portrait.update(dt);
      this.post.render(this.portrait.scene, this.portrait.camera, this.time);
    } else {
      const s = this.post.settings;
      s.grain = 0.06; s.vignette = 0.75; s.bloom = 0.6; s.exposure = 1;
      this.renderer.shadowMap.enabled = QUALITY[this.quality].shadowSize > 0;
      this.post.render(this.scene, this.cam.camera, this.time);
    }
    if (this.thumbWaiters.length) this.resolveThumbs();
    if (this.captureWaiters.length) this.resolveCaptures();

    this.fpsAcc += realDt; this.fpsFrames++;
    if (this.fpsAcc >= 0.5) { this.fps = this.fpsFrames / this.fpsAcc; this.fpsAcc = 0; this.fpsFrames = 0; }
    this.emit('tick', { dt });
  }
}

function inExit(e: { x: number; y: number; w?: number; h?: number }, x: number, y: number): boolean {
  return x >= e.x && y >= e.y && x < e.x + (e.w ?? 1) && y < e.y + (e.h ?? 1);
}

/** Full-screen fade used for transitions. */
export function fade(to: 0 | 1, ms = 350): Promise<void> {
  let el = document.getElementById('fade');
  if (!el) {
    el = document.createElement('div');
    el.id = 'fade';
    document.body.appendChild(el);
  }
  el.style.transition = `opacity ${ms}ms ease`;
  el.style.opacity = String(to);
  return new Promise((r) => setTimeout(r, ms));
}
