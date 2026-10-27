import * as THREE from 'three';
import { MAPS, NPCS } from '../content';
import { cutawayUniforms, roofUniforms } from './assets/materials';
import { EventBus } from './core/events';
import { dayOf, hourOf, newGameState, type GameState, type Pronouns } from './core/state';
import type { Appearance } from './data/appearance';
import type { CharacterSheet } from './stats/sheet';
import { addItem, emptyInventory, equip, makeItem, removeItem, syncGear } from './inventory/inventory';
import { Input } from './input/input';
import { ensurePbr, setPbrDetail } from './assets/pbr';
import { portraitCached, portraitEnvironment, portraitLook, warmPortrait } from './render/portrait';
import { warmConversationView } from './ui/dialogue';
import { SURFACE_PBR_KEYS } from './assets/materials';
import { WorldScene, type LoadedSite } from './scene/stream';
import { sitePlacement, type SitePlacement } from './world/sites';
import { regionAt } from './world/terrain';
import { JOURNEY_CLOCK, wayPoints } from './world/ways';
import type { WorldGrid } from './world/worldGrid';
import { Life } from './render/life';
import { SCREEN_H } from './render/screen';
import { Atmosphere } from './render/atmosphere';
import { IsoCamera } from './render/camera';
import { PostFX } from './render/postfx';
import { QUALITY, detectQuality, type QualityLevel } from './render/quality';
import { Actor, setGroundHeight } from './scene/actor';
import { lookFrom, outfitProxyKeys, type Outfit } from './assets/humanoid';
import { BASE_OUTFIT, wardrobeKey, wardrobeOutfit, wearProxyKeys } from './inventory/wardrobe';
import { ensureProxies } from './assets/human/data';
import type { PortraitStage } from './render/portrait';
import { QuestEngine } from './quest/quest';
import { apply, runTimers, test, type Effect, type LogicHost } from './world/logic';
import { runWorldEvents, spreadNews } from './world/frontier';
import { discoveriesOnLeg, rollEncounter } from './world/roads';
import { makeExtras, spotIdle } from './npc/extras';
import { moodSound, weatherFor, type WeatherKind } from './world/weather';
import { placeMoving } from './world/travel';
import { inHours as inHoursOf } from './npc/schedule';
import { QUESTS, REGIONS, ROAD_ENCOUNTERS, SETTLEMENTS, WORLD_EVENTS, WORLD_MAP } from '../content';
import type { BuiltLocation } from './scene/location';
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
  openSurgery: { npc: NpcRuntime };
  /** The pointer is over something (name and verb) or over nothing (name absent). */
  hoverLabel: { x: number; y: number; name?: string; verb?: string };
  openCamp: Record<string, never>;
  openMap: Record<string, never>;
  openDust: { npc: NpcRuntime; stake: number; prize?: import('./world/logic').DustPrize };
  journal: { questId: string; title: string; line: string };
};

/** Cistern-issue coveralls and boots. */
/** The clothes everyone from the Cistern walks out in (worn armour and chrome change it: inventory/wardrobe.ts). */
export const PLAYER_OUTFIT = BASE_OUTFIT;

/** The idle loop a body runs for each scheduled activity. */
const IDLE_BY_ACTIVITY: Record<string, import('./assets/humanoid').IdleKind> = { work: 'work', idle: 'stand', drink: 'drink', patrol: 'alert', pray: 'pray', trade: 'stand', sleep: 'sleep', away: 'stand' };

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
  /** The streamed world: sites round the player, ground between them, or the cell you are in. */
  readonly world: WorldScene;
  /** The walkable world; every actor paths on it. */
  get grid(): WorldGrid { return this.world.grid; }
  /** The site the player stands in (undefined in open country). */
  get loc(): BuiltLocation | undefined { return this.siteHere()?.built; }
  siteHere(): LoadedSite | undefined {
    const p = this.player;
    if (!p) return this.world.cell ? this.world.site(this.world.cell) : undefined;
    return this.world.siteAt(p.tx, p.ty);
  }
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
  /** A conversation is open: the world holds still for play, but people keep breathing and the camera moves. */
  talking = false;
  /** A pit bout in progress: who you are fighting and what the stake pays either way (nobody dies). */
  pitBout?: { npc: NpcRuntime; win?: Effect[]; lose?: Effect[] };
  private reverieOn = false;
  private postBase?: { vignette: number; grain: number; bloom: number };
  /** Inside a recorded memory: the picture goes cold, washed and grainy until the reverie ends. */
  get reverie(): boolean { return this.reverieOn; }
  set reverie(v: boolean) {
    if (v === this.reverieOn) return;
    this.reverieOn = v;
    const s = this.post?.settings;
    if (!s) return;
    if (v) this.postBase = { vignette: s.vignette, grain: s.grain, bloom: s.bloom };
    else if (this.postBase) { s.vignette = this.postBase.vignette; s.grain = this.postBase.grain; s.bloom = this.postBase.bloom; this.postBase = undefined; }
  }
  private questCache?: { g: GameState; e: QuestEngine };
  private questTick = 0;

  /** Narrative host: XP toasts and journal notifications for dialogue/quest effects. */
  readonly logicHost: LogicHost = {
    xp: (amount) => this.emit('message', { text: `+${amount} XP` }),
    // Quest effects from road encounters, timers and dev runs reach the quest book too.
    questStart: (id: string) => this.quests.questStart(id),
    questStage: (id: string, s: string) => this.quests.questStage(id, s),
    questEnd: (id: string, st: 'done' | 'failed') => this.quests.questEnd(id, st),
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
  /** Birds and dust devils: the open country is never quite still. */
  private life?: Life;
  readonly encounter: Encounter;
  rng = new Rng(1);
  /** The player's combat view of state.pc (rebuilt on load). */
  pc!: Combatant;
  private reachMesh: THREE.InstancedMesh;
  private pathMesh: THREE.InstancedMesh;
  private hostilityTimer = 0;
  private pendingInteract?: { x: number; y: number; run: () => void };
  /** Where the player is walking to (tap or interaction); kept so a walk blocked by someone crossing re-paths instead of stopping. */
  private walkGoal?: { x: number; y: number; adjacentOk: boolean; tries: number; legs: number };
  /** Seconds until the blocked walk is retried. */
  private walkRetry?: number;
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
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Several passes per frame (scene + post); stats are reset once per frame in frame().
    this.renderer.info.autoReset = false;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.className = 'game-canvas';
    this.input = new Input(this.renderer.domElement);
    this.applyQuality(this.quality);
    // A neutral environment gives metal and wet surfaces something to reflect; the atmosphere scales it by the hour.
    this.scene.environment = portraitEnvironment(this.renderer);
    this.scene.environmentIntensity = 0.3;

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
    setGroundHeight((x, z) => this.world.heightAt(x, z));
    this.world = new WorldScene(this.scene, {
      prepare: (place) => this.prepareSite(place),
      loaded: (site) => this.onSiteLoaded(site),
      unloading: (site) => this.onSiteUnloading(site),
      changed: () => this.atmosphere.setSites([...this.world.sites.values()]),
    });
    const game = this;
    this.encounter = new Encounter({
      get grid() { return game.grid; },
      get rng() { return game.rng; },
      fx: this.fx,
      shake: (a) => this.cam.addShake(a),
      hurt: () => { this.post.hurt = 1; this.cam.addShake(0.3); },
      context: (x, y) => ({ indoor: !!this.world.siteAt(x, y)?.built.map.ambience.indoor, night: hourOf(this.state.minutes) < 6 || hourOf(this.state.minutes) > 20, darkness: 1 - this.atmosphere.lightAt(x + 0.5, y + 0.5) }),
      previewPath: (p, ap) => this.showPath(p, ap),
      showReach: (t) => this.showReach(t),
      now: () => this.state.minutes,
      sound: (id, at) => this.soundAt(id, at),
    });
    this.encounter.ai = utilityAi;
    this.encounter.on('end', ({ outcome }) => {
      if (this.pitBout) {
        // A pit bout: both fighters get back up, the loser hurt; the stake pays out through the dialogue's effects.
        const b = this.pitBout;
        this.pitBout = undefined;
        const won = outcome === 'victory';
        const standUp = (sheet: CharacterSheet, actor: Actor) => { if (sheet.hp <= 0) { sheet.hp = Math.max(1, Math.round(derived(sheet).maxHp * 0.3)); actor.revive(); } };
        standUp(b.npc.combatant.sheet, b.npc.actor);
        b.npc.hostile = false;
        if (this.player) standUp(this.pc.sheet, this.player);
        if (outcome === 'victory' || outcome === 'defeat') apply(won ? b.win : b.lose, this.state, this.logicHost);
        this.quests.update();
        this.syncNpcState();
        this.emit('message', { text: won ? 'The pit is yours.' : outcome === 'defeat' ? 'You wake on the pit floor.' : 'The bout is called off.' });
        return;
      }
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

  /** A walk across the land from the map: the way's points in turn, the clock running fast, a leg's chances rolled as it starts. */
  private journey?: { to: string; from: string; pts: { x: number; y: number; leg: number }[]; i: number; legs: import('./world/travel').TripLeg[]; legDone: number; misses: number };
  get journeying(): boolean { return !!this.journey; }

  /**
   * Set out on foot from the map: the player walks the ways from here to a place, point by point, with one real
   * second a game minute. A tap, a fight or an arrival ends it. Each leg rolls its discoveries and its one chance
   * of trouble as it begins; trouble with a map of its own stops the walk there (the road goes on from it).
   */
  /** Dev/QA: a walk from the map arrives at once (the old overland travel), for smokes that cannot wait. */
  instantJourney = false;

  startJourney(to: string, from: string, trip: import('./world/travel').Trip): void {
    if (!this.player || this.transitioning || this.encounter.active) return;
    if (this.instantJourney) { void this.travelTo(to, from, trip); return; }
    const pts: { x: number; y: number; leg: number }[] = [];
    trip.legs.forEach((leg, li) => {
      const way = wayPoints(leg.from, leg.to);
      for (const [wx, wz] of way) {
        const p = { x: Math.floor(wx), y: Math.floor(wz), leg: li };
        const last = pts[pts.length - 1];
        if (!last || Math.max(Math.abs(last.x - p.x), Math.abs(last.y - p.y)) >= 10) pts.push(p);
      }
    });
    // No way to walk (the nearest place, from the open country): straight to it.
    if (!pts.length) { const l = WORLD_MAP.locations[to]; if (l) pts.push({ x: Math.floor(l.x * 12), y: Math.floor(l.y * 12), leg: 0 }); }
    if (!pts.length) return;
    // Join the way where you are: from the open country between places the walk starts at the nearest point of
    // the first leg, not back at its beginning.
    let start = 0, best = Infinity;
    for (let k = 0; k < pts.length && pts[k].leg === 0; k++) { const d = Math.hypot(pts[k].x - this.player.tx, pts[k].y - this.player.ty); if (d < best) { best = d; start = k; } }
    this.cancelJourney();
    this.journey = { to, from, pts, i: start - 1, legs: trip.legs, legDone: -1, misses: 0 };
    this.timeScale = JOURNEY_CLOCK;
    this.emit('message', { text: `You set out for ${WORLD_MAP.locations[to]?.name ?? to}. Tap anywhere to stop.` });
    this.journeyNext();
  }

  cancelJourney(quiet = true): void {
    if (!this.journey) return;
    this.journey = undefined;
    this.timeScale = 1;
    if (!quiet) this.emit('message', { text: 'You stop walking.' });
  }

  private journeyNext(): void {
    const j = this.journey, p = this.player;
    if (!j || !p) return;
    const dest = WORLD_MAP.locations[j.to];
    if (dest?.map && this.state.locationId === dest.map) { this.finishJourney(); return; }
    while (true) {
      j.i++;
      if (j.i >= j.pts.length) { this.finishJourney(); return; }
      const pt = j.pts[j.i];
      if (pt.leg !== j.legDone) { j.legDone = pt.leg; const leg = j.legs[pt.leg]; if (leg && this.journeyLeg(leg)) return; }
      if (Math.max(Math.abs(pt.x - p.tx), Math.abs(pt.y - p.ty)) <= 1) continue;
      if (this.walkTo(pt.x, pt.y)) { j.misses = 0; this.pathMarker.visible = false; return; }
      if (++j.misses > 4) { this.cancelJourney(); this.emit('message', { text: 'No way on from here: the walk ends.' }); return; }
    }
  }

  /** A leg begins: what is noticed from the way, and whether trouble finds you. Returns true when the walk stops here. */
  private journeyLeg(leg: import('./world/travel').TripLeg): boolean {
    const j = this.journey!;
    const notes: string[] = [];
    const isKnown = (id: string) => (this.state.world.knownLocations ?? []).includes(id) || !!this.state.world.knowledge[`loc_${id}`];
    for (const d of discoveriesOnLeg(this.state, WORLD_MAP, leg, isKnown)) {
      this.state.world.knowledge[`loc_${d.id}`] = true;
      notes.push(`From the way you make out ${d.name}, ${d.km} km off. It is on your map now.`);
    }
    const forced = this.forceEncounter ? ROAD_ENCOUNTERS[this.forceEncounter] : undefined;
    this.forceEncounter = undefined;
    const enc = forced ?? (this.quietRoads ? undefined : rollEncounter(this.state, WORLD_MAP, leg, ROAD_ENCOUNTERS, this.rng));
    if (enc) {
      (this.state.world.roadSeen ??= {})[enc.id] = true;
      if (!enc.map) {
        apply(enc.effects, this.state, this.logicHost);
        if (enc.text) notes.push(enc.text);
      } else {
        // Trouble with a place of its own: the walk stops; the roadside map's exit carries the trip on.
        const hoursLeft = j.legs.slice(j.legs.indexOf(leg)).reduce((t, l) => t + l.hours, 0) / 2;
        const roadside = MAPS[enc.map];
        const npcs = (enc.npcs ?? []).map((n) => { const sp = roadside.spots?.[n.spot] ?? roadside.spawns[0]; return { def: n.def, id: n.id, x: sp.x, y: sp.y, facing: n.facing, dialogue: n.dialogue, schedule: [] }; });
        this.state.world.trip = { to: j.to, from: j.from, hoursLeft, map: enc.map, encounter: enc.id, npcs };
        this.cancelJourney();
        this.tellNotes(notes);
        void (async () => {
          this.transitioning = true;
          await fade(1, 180);
          await this.loadLocation(enc.map!, 'here');
          this.quests.update();
          await fade(0, 220);
          this.transitioning = false;
          if (enc.dialogue) window.setTimeout(() => this.emit('openDialogue', { tree: enc.dialogue!, name: '' }), 500);
        })();
        return true;
      }
    }
    this.tellNotes(notes);
    return false;
  }

  private finishJourney(): void {
    const j = this.journey;
    if (!j) return;
    this.journey = undefined;
    this.timeScale = 1;
    const loc = WORLD_MAP.locations[j.to];
    this.state.world.at = j.to;
    const known = (this.state.world.knownLocations ??= []);
    if (!known.includes(j.to)) known.push(j.to);
    this.state.flags[`visited_${j.to}`] = true;
    this.emit('message', { text: loc ? `${loc.name}.` : 'You arrive.' });
    this.quests.update();
    void this.save('auto');
  }
  get canUndo(): boolean { return !!this.lastStand && performance.now() < this.lastStand.until && !this.encounter.active; }
  undoMove(): void {
    const p = this.player, ls = this.lastStand;
    if (!p || !ls || !this.loc || !this.canUndo) return;
    const path = this.loc.grid.findPath(p.tx, p.ty, ls.x, ls.y, { ignore: p.id });
    this.lastStand = undefined;
    this.pendingInteract = undefined;
    if (path) { this.walkGoal = { x: ls.x, y: ls.y, adjacentOk: false, tries: 0, legs: 0 }; this.walkRetry = undefined; p.setPath(path); this.pathMarker.visible = false; }
  }

  /** Make camp here (outdoors, or at a campfire). */
  /**
   * Overland travel between world-map places: the clock runs for the trip, the world moves, and you arrive
   * at the destination's map (by the spawn named for where you came from, else its first spawn).
   */
  async travelTo(to: string, from: string, trip: import('./world/travel').Trip): Promise<void> {
    const loc = WORLD_MAP.locations[to];
    if (!loc || this.transitioning) return;
    if (trip.fare > 0) {
      if (this.state.pc.inventory.tolls < trip.fare) { this.emit('message', { text: 'You cannot pay the fare.' }); return; }
      this.state.pc.inventory.tolls -= trip.fare;
    }
    this.cancelJourney();
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
      const enc = forced ?? (this.quietRoads ? undefined : rollEncounter(this.state, WORLD_MAP, leg, ROAD_ENCOUNTERS, this.rng));
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

  /** Today's weather where the player is. */
  /** Camps that move (the Wheel) stand where the day puts them; `flags.<id>_near` names the settlement they are by. */
  placeCamps(): void {
    const near = placeMoving(WORLD_MAP, dayOf(this.state.minutes), this.state.world.at);
    for (const [id, n] of Object.entries(near)) this.state.flags[`${id}_near`] = n;
  }

  /** Dev/QA: run content effects against the live state (what a dialogue option would do). */
  devApply(effects: import('./world/logic').Effect[]): void {
    apply(effects, this.state, this.logicHost);
    this.quests.update();
  }

  /** Dev/QA: force a weather kind regardless of the day. */
  weatherOverride?: WeatherKind;
  /** Dev/QA: roll no road encounters (forced ones still happen), so a scripted journey arrives where it set out for. */
  quietRoads = false;
  weatherNow(): WeatherKind {
    if (this.weatherOverride) return this.weatherOverride;
    const region = this.player && this.world.mode === 'open' ? regionAt(this.player.tx, this.player.ty) : WORLD_MAP.locations[this.state.world.at ?? '']?.region ?? 'sallow';
    return weatherFor(region, dayOf(this.state.minutes), this.state.rngState % 97);
  }

  private soundBed?: string;
  /** The ambient sound follows the map's mood, the hour and the weather. */
  private updateSoundBed(): void {
    // A place's own ambience, or the open country's where the player stands.
    const a = this.loc?.map.ambience ?? (this.player ? this.world.ambienceAt(this.player.tx, this.player.ty) : undefined);
    if (!a) return;
    const id = a.indoor ? a.sound : moodSound(a.mood, this.atmosphere.weather, hourOf(this.state.minutes), a.sound);
    if (id !== this.soundBed) { this.soundBed = id; this.audio.setAmbience(id); }
  }

  /** Dev and smoke hook: the next trip meets this encounter instead of rolling. */
  forceEncounter?: string;

  /** What happened on the way, told one thing at a time once the road is behind you. */
  private tellNotes(notes: string[]): void {
    notes.forEach((text, i) => window.setTimeout(() => this.emit('message', { text }), 300 + i * 5000));
  }

  /** Rest, cook, mend, write. `force`: a bed of your own (a safehouse) lets you camp indoors without a fire. */
  openCamp(force = false): void {
    if (this.encounter.active || !this.player) return;
    if (!force && this.loc?.map.ambience.indoor && !this.nearCampfire()) { this.emit('message', { text: 'Not here. Find a fire or open sky.' }); return; }
    this.emit('openCamp', {});
  }
  private nearCampfire(): boolean {
    const p = this.player;
    const site = this.siteHere();
    if (!p || !site) return false;
    const lx = p.tx - site.place.x, ly = p.ty - site.place.z;
    return !!site.built.map.props?.some((pr) => (pr.kind === 'campfire' || pr.kind === 'fire_barrel') && Math.max(Math.abs(pr.x - lx), Math.abs(pr.y - ly)) <= 1);
  }

  applyQuality(level: QualityLevel): void {
    setPbrDetail(level === 'high' ? 'high' : 'medium');
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
    if (this.world) {
      this.atmosphere.setSites([...this.world.sites.values()]);
      if (this.player) this.atmosphere.setAmbience(this.world.ambienceAt(this.player.tx, this.player.ty));
    }
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
    SCREEN_H.value = Math.floor(h * pr);
    this.cam.setAspect(w / h);
    this.portrait?.setAspect(w / h);
    // Phones in portrait see less width; zoom out a bit.
    this.cam.maxView = w < h ? 34 : 30;
  }

  /** Load a location and place the player at a spawn point (or explicit tile). Fetches the clothing worn there first. */
  /** Arrive at a site: by a named spawn, at a world tile, or where the player was. Open sites stream round it; a cell replaces the open world. */
  async loadLocation(id: string, spawn?: string | { x: number; y: number }): Promise<void> {
    // `wild:<region>`: open ground between places (a save made on the road); the tile must be given.
    const wild = id.startsWith('wild:');
    const place = wild ? undefined : sitePlacement(id);
    if (!wild && !place) throw new Error(`Unknown location ${id}`);
    if (wild && typeof spawn !== 'object') throw new Error(`No tile to stand on in ${id}`);
    const map = place?.map;
    const seq = ++this.loadSeq;
    const outfit = this.playerOutfit();
    this.lookKey = wardrobeKey(this.state.pc);
    await ensureProxies([...outfitProxyKeys(outfit), ...wearProxyKeys()]).catch((e) => console.warn(e));
    await ensurePbr(SURFACE_PBR_KEYS).catch(() => undefined);
    // A newer load started while things were fetching: let it win.
    if (seq !== this.loadSeq) return;
    this.syncNpcState();
    if (this.player) { this.scene.remove(this.player.object); this.player.body.dispose(); this.actors.delete('player'); this.grid.occupied.delete(this.grid.index(this.player.tx, this.player.ty)); this.player = undefined; }
    this.fx.clearDecals();
    let site: LoadedSite | undefined;
    if (place?.kind === 'cell') site = await this.world.enterCell(id);
    else { this.world.leaveCell(); if (place) site = await this.world.ensureSite(place); }
    if (seq !== this.loadSeq) return;
    if (place && !site) throw new Error(`Could not build ${id}`);
    let sx: number, sy: number;
    if (spawn === undefined && id !== this.state.locationId) spawn = map?.spawns[0].id;
    if (typeof spawn === 'string' && place && map) {
      const sp = map.spawns.find((q) => q.id === spawn) ?? map.spawns[0];
      sx = place.x + sp.x; sy = place.z + sp.y;
    } else if (typeof spawn === 'object') { sx = spawn.x; sy = spawn.y; }
    else { sx = this.state.player.x; sy = this.state.player.y; }
    this.state.locationId = id;
    this.state.player.x = sx; this.state.player.y = sy;
    this.player = new Actor({
      id: 'player', x: sx, y: sy, facing: this.state.player.facing,
      look: lookFrom(this.state.pc.appearance, outfit),
    }, this.grid);
    this.player.onArriveTile = (x, y) => this.onPlayerTile(x, y);
    this.walkGoal = undefined; this.walkRetry = undefined;
    this.player.onPathDone = (blocked) => {
      const g = this.walkGoal, p = this.player;
      if (blocked && g && !this.encounter.active && g.tries < 5) {
        // Someone stepped into the way: wait a moment for them to pass, then path round them.
        g.tries++;
        this.walkRetry = 0.35;
        return;
      }
      // A long walk is made in legs: this one ended short of the goal, so path the next.
      if (!blocked && g && p && !this.encounter.active && Math.max(Math.abs(g.x - p.tx), Math.abs(g.y - p.ty)) > 1 && g.legs < 60) {
        g.legs++;
        this.walkRetry = 0.02;
        return;
      }
      this.walkGoal = undefined; this.walkRetry = undefined;
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
    this.spawnParty(sx, sy);
    this.groundPilesChanged();
    this.cam.target.copy(this.player.object.position);
    this.cam.recentre();
    this.cam.snapToTarget();
    this.state.flags[`visited_${id}`] = true;
    const known = (this.state.world.knownLocations ??= []);
    for (const l of Object.values(WORLD_MAP.locations)) if (l.map === id) { if (!known.includes(l.id)) known.push(l.id); this.state.world.at = l.id; }
    this.atmosphere.setAmbience(this.world.ambienceAt(sx, sy));
    this.soundBed = undefined;
    this.updateSoundBed();
    this.emit('locationChanged', { id, name: this.locationName ?? '' });
    this.quests.update();
    // The ground round the arrival is built before the fade lifts, so the player never stands on nothing.
    await this.world.fill(sx, sy);
  }

  /** Map-local tile of a world tile in the current location (world tiles stay as they are in the wild). */
  toLocal(x: number, y: number, id = this.state.locationId): { x: number; y: number } {
    const p = id.startsWith('wild:') ? undefined : sitePlacement(id);
    return p ? { x: x - p.x, y: y - p.z } : { x, y };
  }

  /** World tile of a map-local tile in the current location. */
  toWorld(x: number, y: number, id = this.state.locationId): { x: number; y: number } {
    const p = id.startsWith('wild:') ? undefined : sitePlacement(id);
    return p ? { x: x + p.x, y: y + p.z } : { x, y };
  }

  /** Dev/QA: act in the current place's own tile coordinates. */
  placeLocal(x: number, y: number): void { const w = this.toWorld(x, y); this.player?.place(w.x, w.y); this.state.player.x = w.x; this.state.player.y = w.y; }
  walkLocal(x: number, y: number): void { const w = this.toWorld(x, y); this.walkTo(w.x, w.y); }
  interactLocal(x: number, y: number): void { const w = this.toWorld(x, y); this.tryInteract(w.x, w.y); }
  findPathLocal(fx: number, fy: number, tx: number, ty: number, opts?: Parameters<WorldGrid['findPath']>[4]): ReturnType<WorldGrid['findPath']> { const a = this.toWorld(fx, fy), b = this.toWorld(tx, ty); return this.grid.findPath(a.x, a.y, b.x, b.y, opts); }

  /** The world-map location the player is at or nearest to (for the map, trips and news). */
  nearestLocation(): string | undefined {
    const here = this.state.locationId;
    const direct = Object.values(WORLD_MAP.locations).find((l) => l.map === here);
    if (direct) return direct.id;
    // Inside a cell (a cistern, a tower floor) the open world is parked: you are where you went in.
    if (this.world.mode === 'cell' || !this.player) return this.state.world.at;
    const km = { x: this.player.tx / 12, y: this.player.ty / 12 };
    let best: string | undefined, bestD = Infinity;
    for (const l of Object.values(WORLD_MAP.locations)) {
      const d = (l.x - km.x) ** 2 + (l.y - km.y) ** 2;
      if (d < bestD) { bestD = d; best = l.id; }
    }
    return best;
  }

  // --- streaming hooks --------------------------------------------------------------------------------------

  /** Fetch what a site's people wear before it is built. */
  private async prepareSite(place: SitePlacement): Promise<void> {
    const map = place.map;
    const outfits = this.placements(map).flatMap((p) => (NPCS[p.def] ? [npcLook(NPCS[p.def]).outfit] : []));
    for (const [index, def] of (map.extras ?? []).entries()) for (const d of makeExtras(map.id, map.seed ?? 1, index, def)) outfits.push(npcLook(d).outfit);
    await ensureProxies(outfitProxyKeys(...outfits)).catch((e) => console.warn(e));
  }

  /** A site has been built: its people appear, and companions dismissed there are where they were left. */
  private onSiteLoaded(site: LoadedSite): void {
    for (const p of this.placements(site.place.map)) if (test(p.if, this.state)) this.spawn(p, site);
    this.spawnExtras(site);
    const saved = (this.state.companions ??= {});
    for (const [id, c] of Object.entries(saved)) {
      if (this.state.world.party.includes(id) || c.waitingAt?.location !== site.place.id || this.npcs.has(id)) continue;
      const wx = site.place.x + c.waitingAt.x, wz = site.place.z + c.waitingAt.y;
      const at = freeTileNear(this.grid, wx, wz) ?? { x: wx, y: wz };
      const rt = spawnNpc({ def: id, x: at.x, y: at.y }, this.grid, c);
      rt.site = site.place.id;
      this.npcs.set(rt.id, rt);
      this.addActor(rt.actor);
    }
  }

  /** A site is going: its people's state is kept; companions stay with the player. */
  private onSiteUnloading(site: LoadedSite): void {
    this.syncNpcState();
    for (const n of [...this.npcs.values()]) {
      if (n.site !== site.place.id) continue;
      if (n.companion) { n.site = undefined; continue; }
      this.removeNpc(n);
    }
  }

  private removeNpc(n: NpcRuntime): void {
    this.npcs.delete(n.id);
    this.actors.delete(n.actor.id);
    this.scene.remove(n.actor.object);
    n.actor.body.dispose();
    const i = this.grid.index(n.actor.tx, n.actor.ty);
    if (this.grid.occupied.get(i) === n.id) this.grid.occupied.delete(i);
  }

  /** Spawn an NPC placement on a site (placement and saved positions are local to it), applying persisted state. */
  spawn(p: import('./npc/defs').NpcPlacement, site: LoadedSite | undefined = this.siteHere()): NpcRuntime | undefined {
    if (!site) return;
    const key = `${site.place.id}/${p.id ?? p.def}`;
    const saved = this.state.npcs[key];
    const lx = saved?.x ?? p.x, ly = saved?.y ?? p.y;
    const pos = { ...p, x: site.place.x + lx, y: site.place.z + ly };
    if (!this.grid.passable(pos.x, pos.y)) return;
    const rt = spawnNpc(pos, this.grid);
    rt.site = site.place.id;
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
      const site = n.site ? this.world.sites.get(n.site) : undefined;
      const dead = n.combatant.sheet.hp <= 0;
      if (site) this.state.npcs[`${site.place.id}/${n.id}`] = { dead, hp: n.combatant.sheet.hp, x: n.actor.tx - site.place.x, y: n.actor.ty - site.place.z, hostile: n.hostile, inventory: n.combatant.inv };
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
    const saved = (this.state.companions ??= {});
    for (const id of this.state.world.party) {
      const def = NPCS[id];
      if (!def) continue;
      let rt = this.npcs.get(id);
      if (!rt) {
        const at = freeTileNear(this.grid, px, py, 'player') ?? { x: px, y: py };
        rt = spawnNpc({ def: id, x: at.x, y: at.y, facing: this.state.player.facing }, this.grid, saved[id]);
        this.npcs.set(rt.id, rt);
        this.addActor(rt.actor);
      } else {
        if (saved[id]) { rt.combatant.sheet = saved[id].sheet; rt.combatant.inv = saved[id].inv; }
        // Arrived somewhere else: they come along.
        if (Math.max(Math.abs(rt.actor.tx - px), Math.abs(rt.actor.ty - py)) > 12) { const at = freeTileNear(this.grid, px, py, 'player') ?? { x: px, y: py }; rt.actor.place(at.x, at.y); }
      }
      rt.companion = true;
      rt.hostile = false;
      rt.site = undefined;
      delete saved[id]?.waitingAt;
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
  /** Background people: generated from the map's `extras`, placed on free tiles where they belong, hours permitting. */
  private spawnExtras(site: LoadedSite): void {
    const map = site.place.map;
    if (!map.extras?.length) return;
    const ox = site.place.x, oz = site.place.z, grid = this.grid, hour = hourOf(this.state.minutes);
    map.extras.forEach((def, index) => {
      const defs = makeExtras(map.id, map.seed ?? 1, index, def);
      const rng = new Rng((map.seed ?? 1) * 31 + index);
      const spots = def.spots ?? [];
      const inHours = !def.hours || inHoursOf(def.hours, hour);
      const area = def.area ? { x: ox + def.area.x, y: oz + def.area.y, w: def.area.w, h: def.area.h } : { x: ox + 1, y: oz + 1, w: site.place.w - 2, h: site.place.h - 2 };
      defs.forEach((d, k) => {
        // Named spots are taken in order (pairs face each other); the rest wander the area.
        const spot = k < spots.length ? spots[k] : undefined;
        const at = spot ? map.spots?.[spot] : undefined;
        const tile = at ? freeTileNear(grid, ox + at.x, oz + at.y, undefined, 2) : this.randomAreaTile(area, rng, 12);
        if (!tile) return;
        const rt = this.spawn({ def: d.id, x: tile.x - ox, y: tile.y - oz, facing: rng.range(0, Math.PI * 2), schedule: [] }, site);
        if (!rt) return;
        rt.extra = { area, spots, hours: def.hours, wait: rng.range(2, 20), fixed: !!spot };
        rt.actor.idle = spotIdle(spot);
        const partner = spot && /_pair_[ab]$/.test(spot) ? map.spots?.[spot.endsWith('_a') ? spot.replace(/_a$/, '_b') : spot.replace(/_b$/, '_a')] : undefined;
        if (partner) rt.actor.faceTowards(ox + partner.x + 0.5, oz + partner.y + 0.5);
        if (!inHours) { rt.away = true; rt.actor.object.visible = false; grid.occupied.delete(grid.index(rt.actor.tx, rt.actor.ty)); }
      });
    });
  }

  private randomAreaTile(a: { x: number; y: number; w: number; h: number }, rng: Rng, tries: number): { x: number; y: number } | undefined {
    for (let i = 0; i < tries; i++) {
      const x = a.x + rng.int(0, Math.max(0, a.w - 1)), y = a.y + rng.int(0, Math.max(0, a.h - 1));
      if (this.grid.passable(x, y)) return { x, y };
    }
    return undefined;
  }

  /** Background people drift: stand a while, walk somewhere else in their patch, stand again. */
  private wanderExtras(hour: number): void {
    const grid = this.grid;
    for (const n of this.npcs.values()) {
      const x = n.extra;
      if (!x || !x.area || n.hostile || n.actor.isDead || n.talking) continue;
      const inHours = !x.hours || inHoursOf(x.hours, hour);
      if (inHours === !!n.away) {
        n.away = !inHours;
        n.actor.object.visible = inHours;
        if (!inHours) grid.occupied.delete(grid.index(n.actor.tx, n.actor.ty));
        else { const at = freeTileNear(grid, n.actor.tx, n.actor.ty) ?? { x: n.actor.tx, y: n.actor.ty }; n.actor.place(at.x, at.y); }
      }
      if (n.away || x.fixed || n.actor.moving) continue;
      x.wait -= 2;
      if (x.wait > 0) continue;
      x.wait = this.rng.range(6, 28);
      if (this.rng.chance(0.45)) continue;
      const goal = this.randomAreaTile(x.area, this.rng, 8);
      if (!goal) continue;
      const path = grid.findPath(n.actor.tx, n.actor.ty, goal.x, goal.y, { ignore: n.id, maxCost: 80 });
      if (path && path.length) { n.actor.setPath(path); n.actor.idle = 'stand'; }
    }
  }

  /** A map's placements, plus the people a road encounter put on it. */
  private placements(map: MapDef): NpcPlacement[] {
    const trip = this.state.world.trip;
    return [...(map.npcs ?? []), ...(trip && trip.map === map.id ? trip.npcs : [])];
  }

  syncPlacements(): void {
    if (this.encounter.active) return;
    const grid = this.grid;
    for (const site of this.world.sites.values()) for (const p of this.placements(site.place.map)) {
      if (!p.if) continue;
      const id = p.id ?? p.def;
      const n = this.npcs.get(id);
      // Companions travel with the player: their placement conditions no longer apply.
      if (this.state.world.party.includes(id)) continue;
      const want = test(p.if, this.state);
      if (want && !n) this.spawn(p, site);
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
    if (this.encounter.active || !this.player || this.paused) return;
    this.scheduleTick += dt;
    if (this.scheduleTick < 2) return;
    this.scheduleTick = 0;
    const hour = hourOf(this.state.minutes), grid = this.grid;
    this.wanderExtras(hour);
    for (const n of this.npcs.values()) {
      if (n.extra) continue;
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
      if (away || !e) continue;
      if (!n.talking) n.actor.idle = IDLE_BY_ACTIVITY[e.activity] ?? 'stand';
      if (n.actor.moving) continue;
      const home = n.site ? this.world.sites.get(n.site) : undefined;
      const lt = scheduleTile(e, home?.built.map.spots);
      if (!lt) continue;
      const t = { x: lt.x + (home?.place.x ?? 0), y: lt.y + (home?.place.z ?? 0) };
      if (t.x === n.actor.tx && t.y === n.actor.ty) continue;
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

  /** Open a surgeon's table (from dialogue). */
  openSurgery(npc: NpcRuntime): void {
    if (!npc.def.surgeon) return;
    this.emit('openSurgery', { npc });
  }

  private followTick = 0;
  /** Companions trail the player outside combat. */
  private updateFollowers(dt: number): void {
    if (this.encounter.active || !this.player || this.paused) return;
    this.followTick += dt;
    if (this.followTick < 0.3) return;
    this.followTick = 0;
    const p = this.player;
    for (const n of this.npcs.values()) {
      if (!n.companion || n.actor.isDead || n.actor.moving) continue;
      const dist = Math.max(Math.abs(n.actor.tx - p.tx), Math.abs(n.actor.ty - p.ty));
      if (!shouldFollow(dist, p.moving)) continue;
      const path = followPath(this.grid, { id: n.id, x: n.actor.tx, y: n.actor.ty }, { x: p.tx, y: p.ty, facing: p.facing });
      if (path && path.length) { n.actor.running = p.running || dist > 5; n.actor.setPath(path); }
    }
  }

  startCombat(target?: NpcRuntime, pit?: { win?: Effect[]; lose?: Effect[] }): void {
    this.cancelJourney();
    if (this.encounter.active || !this.player) return;
    this.player.stop();
    this.pathMarker.visible = false;
    this.pc.x = this.player.tx; this.pc.y = this.player.ty;
    const units: Unit[] = [{ c: this.pc, actor: this.player, hostile: false }];
    if (pit && target) {
      // A pit bout: you and the other fighter, nobody else, fists and blades only, nobody dies.
      target.hostile = true;
      target.combatant.x = target.actor.tx; target.combatant.y = target.actor.ty;
      units.push({ c: target.combatant, actor: target.actor, hostile: true });
      this.pitBout = { npc: target, win: pit.win, lose: pit.lose };
      this.encounter.start(units, { pit: true });
      this.encounter.target = units[1];
      return;
    }
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
    for (let i = 0; i < this.reachMesh.count; i++) this.reachMesh.setMatrixAt(i, m.makeTranslation(list[i].x + 0.5, this.world.heightAt(list[i].x + 0.5, list[i].y + 0.5) + 0.015, list[i].y + 0.5));
    this.reachMesh.instanceMatrix.needsUpdate = true;
  }

  private showPath(path: { x: number; y: number }[] | null, affordable: number): void {
    const m = new THREE.Matrix4();
    const list = (path ?? []).slice(0, 64);
    this.pathMesh.count = list.length;
    const c = new THREE.Color();
    for (let i = 0; i < list.length; i++) {
      this.pathMesh.setMatrixAt(i, m.makeTranslation(list[i].x + 0.5, this.world.heightAt(list[i].x + 0.5, list[i].y + 0.5) + 0.025, list[i].y + 0.5));
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
      if (d <= derived(n.combatant.sheet).sightRange && this.grid.lineOfSight(n.actor.tx, n.actor.ty, this.player.tx, this.player.ty)) {
        this.emit('message', { text: `${n.def.name} spots you!` });
        this.startCombat();
        return;
      }
    }
  }

  /** Corpse, container or ground pile at a tile → walk over and open it. Returns true if handled. */
  tryInteract(x: number, y: number): boolean {
    const target = this.interactableAt(x, y);
    if (!target || !this.player) return false;
    const run = target;
    const p = this.player;
    if (Math.max(Math.abs(x - p.tx), Math.abs(y - p.ty)) <= 1) { p.faceTowards(x + 0.5, y + 0.5); run(); return true; }
    const path = this.pathToward(p, { x, y }, true, p.id);
    if (!path) return false;
    this.pendingInteract = { x, y, run };
    this.walkGoal = { x, y, adjacentOk: true, tries: 0, legs: 0 }; this.walkRetry = undefined;
    p.setPath(path);
    return true;
  }

  /** Walk to a tile (what a tap on open ground does). Returns false when there is no way there. */
  walkTo(x: number, y: number): boolean {
    const p = this.player;
    if (!p) return false;
    this.pendingInteract = undefined;
    const path = this.pathToward(p, { x, y }, true, p.id);
    if (!path || !path.length) return false;
    this.lastStand = { x: p.tx, y: p.ty, until: performance.now() + 8000 + path.length * 400 };
    this.walkGoal = { x, y, adjacentOk: true, tries: 0, legs: 0 }; this.walkRetry = undefined;
    p.setPath(path);
    this.pathMarker.position.set(x + 0.5, this.world.heightAt(x + 0.5, y + 0.5) + 0.03, y + 0.5);
    this.pathMarker.visible = true;
    return true;
  }

  /** A path to a goal: the whole way when it is near; across open country, the next leg toward it. */
  private pathToward(from: { tx: number; ty: number }, goal: { x: number; y: number }, adjacentOk: boolean, ignore: string): { x: number; y: number }[] | null {
    const LEG = 120;
    const dx = goal.x - from.tx, dy = goal.y - from.ty, d = Math.max(Math.abs(dx), Math.abs(dy));
    if (d <= LEG) return this.grid.findPath(from.tx, from.ty, goal.x, goal.y, { ignore, adjacentOk });
    const t = LEG / d;
    const mx = Math.round(from.tx + dx * t), my = Math.round(from.ty + dy * t);
    return this.grid.findPath(from.tx, from.ty, mx, my, { ignore, adjacentOk: true, budget: 30000 }) ?? this.grid.findPath(from.tx, from.ty, goal.x, goal.y, { ignore, adjacentOk });
  }

  /** A blocked walk, retried: path round whoever stepped in; give up quietly when there is no way. */
  private resumeWalk(): void {
    const g = this.walkGoal, p = this.player;
    if (!g || !p || p.moving) return;
    const path = this.pathToward(p, g, g.adjacentOk, p.id);
    if (path && path.length) p.setPath(path);
    else if (path) p.onPathDone?.();
    else if (g.tries < 5) { g.tries++; this.walkRetry = 0.35; }
    else { this.walkGoal = undefined; this.pathMarker.visible = false; this.pendingInteract = undefined; }
  }

  /** Where the mouse last was over the scene; the hover is re-read from here while the world moves under it. */
  private lastPointer?: { x: number; y: number };
  private hoverTick = 0;

  /** The tile cursor and the label follow what is under the pointer (people and things get a brighter, larger ring). */
  private updateHover(x: number, y: number): void {
    const t = this.pickTile(x, y);
    const what = t && !this.transitioning ? this.describeAt(t.x, t.y) : undefined;
    this.cursor.visible = !!t && (!!what || !!this.grid.get(t.x, t.y)?.walkable);
    if (t) this.cursor.position.set(t.x + 0.5, this.world.heightAt(t.x + 0.5, t.y + 0.5) + 0.02, t.y + 0.5);
    (this.cursor.material as THREE.MeshBasicMaterial).color.setHex(what ? 0xffe8a0 : 0xe8c070);
    (this.cursor.material as THREE.MeshBasicMaterial).opacity = what ? 0.85 : 0.5;
    this.cursor.scale.setScalar(what ? 1.25 : 1);
    this.emit('hoverLabel', what ? { x, y, name: what.name, verb: what.verb } : { x, y });
    if (t && this.encounter.active) this.encounter.hoverTile(t.x, t.y);
  }

  /** What is at a tile and what a tap would do there, for the hover label: a person, a thing with a verb, a way out. */
  describeAt(x: number, y: number): { name: string; verb: string } | undefined {
    if (!this.player) return undefined;
    for (const n of this.npcs.values()) {
      if (n.actor.tx !== x || n.actor.ty !== y || n.away) continue;
      if (n.combatant.sheet.hp <= 0) return { name: n.def.name, verb: 'Search' };
      if (n.hostile) return { name: n.def.name, verb: this.encounter.active ? 'Attack' : 'Hostile' };
      if (this.encounter.active) return { name: n.def.name, verb: '' };
      if (n.dialogue ?? n.def.dialogue) return { name: n.def.name, verb: 'Talk' };
      if (n.def.merchant) return { name: n.def.name, verb: 'Trade' };
      return { name: n.def.name, verb: '' };
    }
    const pile = this.state.containers[this.pileKey(x, y)];
    if (pile && (pile.items.length || pile.tolls)) return { name: 'Dropped things', verb: 'Take' };
    const site = this.world.siteAt(x, y);
    if (!site) return undefined;
    const map = site.place.map, lx = x - site.place.x, ly = y - site.place.z;
    const prop = map.props?.find((p) => p.x === lx && p.y === ly);
    if (prop) {
      if (prop.kind === 'campfire' || prop.kind === 'fire_barrel') return { name: 'Fire', verb: 'Camp' };
      if (prop.id && map.talk?.[prop.id]) return { name: map.talk[prop.id].name, verb: 'Look' };
      if (prop.id && map.containers?.[prop.id]) return { name: map.containers[prop.id].name, verb: map.containers[prop.id].lock ? 'Open (locked)' : 'Open' };
    }
    const exit = map.exits?.find((e) => lx >= e.x && lx < e.x + (e.w ?? 1) && ly >= e.y && ly < e.y + (e.h ?? 1) && test(e.if, this.state) && this.exitApplies(e));
    if (exit) return { name: exit.label ?? 'Out', verb: 'Leave' };
    return undefined;
  }

  /** Which drawn exits still mean anything: doors to and from cells. Walking out of an open site needs none. */
  private exitApplies(e: ExitDef): boolean {
    if (this.world.mode === 'cell') return true;
    return 'location' in e.to && sitePlacement(e.to.location)?.kind === 'cell';
  }

  private interactableAt(x: number, y: number): (() => void) | undefined {
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
    const pileKey = this.pileKey(x, y);
    if (this.state.containers[pileKey] && (this.state.containers[pileKey].items.length || this.state.containers[pileKey].tolls)) {
      return () => this.emit('openTransfer', { inv: this.state.containers[pileKey], name: 'Ground' });
    }
    const site = this.world.siteAt(x, y);
    if (!site) return undefined;
    const map = site.place.map, lx = x - site.place.x, ly = y - site.place.z;
    const fire = map.props?.find((p) => p.x === lx && p.y === ly && (p.kind === 'campfire' || p.kind === 'fire_barrel'));
    if (fire) return () => this.emit('openCamp', {});
    const talker = map.props?.find((p) => p.x === lx && p.y === ly && p.id && map.talk?.[p.id]);
    if (talker) { const t = map.talk![talker.id!]; return () => this.emit('openDialogue', { tree: t.dialogue, name: t.name }); }
    const prop = map.props?.find((p) => p.x === lx && p.y === ly && p.id && map.containers?.[p.id]);
    if (prop) {
      const def = map.containers![prop.id!];
      const key = `${site.place.id}/${prop.id}`;
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

  /** Container key for things dropped on a world tile: site-local inside a place, world tiles in the wild. */
  pileKey(x: number, y: number): string {
    const site = this.world.siteAt(x, y);
    return site ? `${site.place.id}/ground_${x - site.place.x}_${y - site.place.z}` : `wild:${regionAt(x, y)}/ground_${x}_${y}`;
  }

  /** World tile of a pile key, if its place is loaded (or it lies in the wild). */
  private pileTile(key: string): { x: number; y: number } | undefined {
    const m = /^(.*)\/ground_(-?\d+)_(-?\d+)$/.exec(key);
    if (!m) return undefined;
    const x = Number(m[2]), y = Number(m[3]);
    if (m[1].startsWith('wild:')) return { x, y };
    const site = this.world.sites.get(m[1]);
    return site ? { x: site.place.x + x, y: site.place.z + y } : undefined;
  }

  /** Rebuild the little sack meshes for dropped items near the player. */
  groundPilesChanged(): void {
    this.pileGroup.clear();
    const px = this.player?.tx ?? 0, py = this.player?.ty ?? 0;
    for (const [k, inv] of Object.entries(this.state.containers)) {
      if (!k.includes('/ground_') || (!inv.items.length && !inv.tolls)) continue;
      const t = this.pileTile(k);
      if (!t || Math.abs(t.x - px) > 260 || Math.abs(t.y - py) > 260) continue;
      const { x, y } = t;
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18, 0).scale(1, 0.7, 1), new THREE.MeshStandardMaterial({ color: 0x8a7a5a, flatShading: true }));
      m.position.set(x + 0.5, this.world.heightAt(x + 0.5, y + 0.5) + 0.12, y + 0.5);
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
      const t = this.grid.get(x, y);
      this.soundAt(stepSoundFor(t?.def.floor ?? 'sand'), a.object.position, a.id === 'player' ? 0.6 : 0.35);
    };
    this.actors.set(a.id, a);
    this.scene.add(a.object);
  }

  private onPlayerTile(x: number, y: number): void {
    this.state.player.x = x;
    this.state.player.y = y;
    const site = this.world.siteAt(x, y);
    // Crossing into a place, or out of one: the location changes under your feet, no screen between.
    const id = site ? site.place.id : `wild:${regionAt(x, y)}`;
    if (id !== this.state.locationId) {
      this.state.locationId = id;
      this.state.flags[`visited_${id}`] = true;
      // A walk from the map ends the moment its place is underfoot.
      if (this.journey && site && WORLD_MAP.locations[this.journey.to]?.map === id) this.finishJourney();
      if (site) {
        const known = (this.state.world.knownLocations ??= []);
        for (const l of Object.values(WORLD_MAP.locations)) if (l.map === id && !known.includes(l.id)) { known.push(l.id); this.state.world.at = l.id; }
      }
      this.emit('locationChanged', { id, name: this.locationName ?? '' });
      this.quests.update();
    }
    if (!site) return;
    const map = site.place.map, lx = x - site.place.x, ly = y - site.place.z;
    for (const t of map.triggers ?? []) {
      if (!inExit(t, lx, ly) || !test(t.if, this.state)) continue;
      const key = `trigger:${map.id}/${t.id}`;
      if (t.once !== false && this.state.flags[key]) continue;
      this.state.flags[key] = true;
      if (t.text) this.emit('message', { text: t.text });
      apply(t.effects, this.state, this.logicHost);
      this.quests.update();
    }
    const exit = map.exits?.find((e) => inExit(e, lx, ly) && test(e.if, this.state) && this.exitApplies(e));
    if (exit && !this.transitioning) this.useExit(exit);
  }

  private warmTimer = 0;
  private warming = false;
  private streamTick = 0;
  /** Build the conversation portrait of the nearest person who has none yet, in an idle moment, so talking opens at once. */
  private warmPortraits(): void {
    if (this.warming || this.talking || this.paused || !this.player || this.encounter.active) return;
    const pp = this.player.object.position;
    let best: NpcRuntime | undefined, bestD = 12 * 12;
    for (const n of this.npcs.values()) {
      if (n.def.minor || n.away || n.hostile || !(n.dialogue ?? n.def.dialogue)) continue;
      const d = n.actor.object.position.distanceToSquared(pp);
      if (d < bestD && !portraitCached(portraitLook(n.appearance, n.outfit))) { best = n; bestD = d; }
    }
    if (!best) return;
    const look = portraitLook(best.appearance, best.outfit);
    this.warming = true;
    const run = () => { try { warmPortrait(look); warmConversationView(look); } catch (e) { console.warn('portrait', e); } this.warming = false; };
    if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 1500 }); else window.setTimeout(run, 0);
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
      if (trip && this.world.cell === trip.map) {
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
    // A door: through it at once (a short fade, never a loading screen; the place is built in memory).
    await fade(1, 180);
    await this.loadLocation(to.location, to.spawn);
    await fade(0, 220);
    this.transitioning = false;
    void this.save('auto');
  }

  /** Screen → tile under pointer (ground plane). */
  pickTile(sx: number, sy: number): { x: number; y: number } | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2((sx / rect.width) * 2 - 1, -(sy / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.cam.camera);
    // The ground is not flat: the tap lands on the terrain or a place's floor; failing that, on the player's level.
    const hits = ray.intersectObjects(this.world.groundMeshes(), false);
    const hit = new THREE.Vector3();
    if (hits.length) hit.copy(hits[0].point);
    else if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -(this.player?.object.position.y ?? 0)), hit)) return null;
    const x = Math.floor(hit.x), y = Math.floor(hit.z);
    return this.grid.inBounds(x, y) ? { x, y } : null;
  }

  private bindInput(): void {
    const i = this.input;
    i.on('tap', ({ x, y, mouse }) => {
      const t = this.pickTile(x, y);
      if (!t || !this.player || this.transitioning || this.paused) return;
      if (this.journey) { this.cancelJourney(false); return; }
      if (this.encounter.active) { this.encounter.tapTile(t.x, t.y, mouse); return; }
      const npc = this.npcAt(t.x, t.y);
      if (npc && npc.hostile) { this.startCombat(npc); return; }
      if (this.tryInteract(t.x, t.y)) return;
      if (this.walkTo(t.x, t.y)) {
        const tip = tipOnce('move', 'Tapped the wrong place? Undo (↶) walks you back for a few seconds.');
        if (tip) this.emit('message', { text: tip });
        this.cam.recentre();
      }
    });
    i.on('hover', ({ x, y }) => { this.lastPointer = { x, y }; this.updateHover(x, y); });
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
    if (!this.saves || !this.player) return;
    if (this.encounter.active) { this.emit('message', { text: 'Cannot save during combat' }); return; }
    this.syncNpcState();
    const thumb = await this.captureThumb();
    await this.saves.write(slot, {
      label: label ?? (slot === 'auto' ? 'Autosave' : slot === 'quick' ? 'Quicksave' : this.locationName ?? ''),
      locationId: this.state.locationId,
      locationName: this.locationName ?? '',
      minutes: this.state.minutes,
      playtimeSec: this.state.playtimeSec,
      thumb,
    }, { ...this.state, player: { ...this.state.player, ...this.toLocal(this.state.player.x, this.state.player.y) } });
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
    // Saves keep the player map-local (so places may move in the world between versions); the world tile is derived.
    await this.loadLocation(this.state.locationId, this.toWorld(this.state.player.x, this.state.player.y));
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

  /** Display name of where the player is: the site, or the region of open country. */
  get locationName(): string | undefined {
    const site = this.siteHere();
    if (site) return site.place.map.name;
    return this.player ? REGIONS[regionAt(this.player.tx, this.player.ty)]?.name : undefined;
  }

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
      this.placeCamps();
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
    this.warmTimer += dt;
    if (this.warmTimer > 0.7) { this.warmTimer = 0; this.warmPortraits(); }

    // Keyboard camera pan
    const held = this.input.held, panSpeed = 600 * dt;
    if (held.has('KeyW') || held.has('ArrowUp')) this.cam.panScreen(0, panSpeed, 800);
    if (held.has('KeyS') || held.has('ArrowDown')) this.cam.panScreen(0, -panSpeed, 800);
    if (held.has('KeyA') || held.has('ArrowLeft')) this.cam.panScreen(panSpeed, 0, 800);
    if (held.has('KeyD') || held.has('ArrowRight')) this.cam.panScreen(-panSpeed, 0, 800);

    // Heads turn to the player when they are close and standing; the player looks at whoever they talk to.
    if (this.player) {
      const pp = this.player.object.position;
      for (const n of this.npcs.values()) {
        if (n.away || n.combatant.sheet.hp <= 0) { n.actor.lookAt = undefined; continue; }
        const d = n.actor.object.position.distanceTo(pp);
        n.actor.lookAt = d < 3.2 && d > 0.4 && !n.actor.moving && !n.hostile ? pp : undefined;
      }
    }
    for (const a of this.actors.values()) a.update(this.talking ? dt : simDt);
    if (this.walkRetry !== undefined && simDt > 0 && !this.encounter.active) {
      this.walkRetry -= simDt;
      if (this.walkRetry <= 0) { this.walkRetry = undefined; this.resumeWalk(); }
    }
    if (this.journey && this.player && !this.player.moving && !this.walkGoal && this.walkRetry === undefined && !this.encounter.active && !this.talking && !this.transitioning && !this.paused) this.journeyNext();
    const cur = this.encounter.active ? this.encounter.current : undefined;
    if (cur && !cur.c.isPlayer) this.cam.target.copy(cur.actor.object.position);
    else if (this.player) {
      this.cam.target.copy(this.player.object.position);
      this.state.player.facing = this.player.facing;
    }
    this.cam.update(dt);

    // Cutaway centred on the player (chest height); the roof of the building the player is in is lifted.
    if (this.player) cutawayUniforms.uCutCenter.value.copy(this.player.object.position).setY(1.0);
    this.cam.forward(cutawayUniforms.uCamDir.value);
    const here = this.siteHere();
    if (here && this.player) {
      const b = here.built, lx = this.player.tx - here.place.x, ly = this.player.ty - here.place.z;
      const id = b.grid.inBounds(lx, ly) ? b.buildings.at[b.grid.index(lx, ly)] : -1;
      roofUniforms.uHideBld.value = id >= 0 ? b.bldBase + id : -1;
    } else roofUniforms.uHideBld.value = -1;
    if (this.player) {
      this.atmosphere.setAmbience(this.world.ambienceAt(this.player.tx, this.player.ty));
      // Streaming runs on the clock, not the simulation: slow frames must not starve the ground.
      const now = performance.now();
      if (now - this.streamTick > 250) { this.streamTick = now; void this.world.update(this.player.tx, this.player.ty); }
    }

    this.world.tick(this.time, this.cam.yaw);
    this.atmosphere.hour = hourOf(this.state.minutes);
    this.atmosphere.weather = this.weatherNow();
    this.atmosphere.focusDistance = this.cam.distance;
    this.updateSoundBed();
    this.atmosphere.update(dt, this.time, this.cam.focus, this.post.settings);
    if (this.player) {
      this.life ??= new Life(this.scene);
      const region = regionAt(this.player.tx, this.player.ty);
      this.life.update(simDt, this.time, this.cam.focus, region, this.atmosphere.weather, this.world.mode === 'open' && !this.paused, hourOf(this.state.minutes), (x, z) => this.world.heightAt(x, z));
    }
    if (this.reverieOn) {
      // A recorded memory: cold, washed, grainy, the edges closing in.
      const s = this.post.settings;
      s.grade = 0.95; s.exposure = 1.18; s.tint.setRGB(0.82, 0.96, 1.14); s.vignette = 1.05; s.grain = 0.2; s.bloom = 0.9;
    }
    this.cursor.rotation.y += dt;
    this.hoverTick += dt;
    if (this.hoverTick > 0.25 && this.lastPointer && !this.paused) { this.hoverTick = 0; this.updateHover(this.lastPointer.x, this.lastPointer.y); }
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
      s.grain = 0.03; s.vignette = 0.5; s.bloom = 0.45; s.exposure = 1;
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
