import * as THREE from 'three';
import { MAPS } from '../content';
import { cutawayUniforms } from './assets/materials';
import { EventBus } from './core/events';
import { hourOf, newGameState, type GameState, type Pronouns } from './core/state';
import type { Appearance } from './data/appearance';
import type { CharacterSheet } from './stats/sheet';
import { addItem, emptyInventory, equip, makeItem, syncGear } from './inventory/inventory';
import { Input } from './input/input';
import { Atmosphere } from './render/atmosphere';
import { IsoCamera } from './render/camera';
import { PostFX } from './render/postfx';
import { QUALITY, detectQuality, type QualityLevel } from './render/quality';
import { Actor } from './scene/actor';
import { lookFrom } from './assets/humanoid';
import type { PortraitStage } from './render/portrait';
import { buildLocation, type BuiltLocation } from './scene/location';
import type { ExitDef } from './data/types';
import { SaveManager, type SaveFile, type SlotId } from './save/saves';
import { createBackend } from './save/storage';

export type GameEvents = {
  locationChanged: { id: string; name: string };
  saved: { slot: SlotId };
  loaded: { slot?: SlotId };
  tick: { dt: number };
  message: { text: string };
};

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
  /** Multiplier on the game clock (dev "skip time"). */
  timeScale = 1;
  /** When true the simulation is frozen (menus open); rendering continues. */
  paused = false;
  /** When set, this stage is rendered instead of the world (creator, dialogue close-ups). */
  portrait?: PortraitStage;
  saves?: SaveManager;
  private thumbWaiters: ((url: string) => void)[] = [];
  fps = 0;
  private fpsAcc = 0;
  private fpsFrames = 0;

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

    this.state = newGameState('dev_yard', 15, 9);
    createBackend().then((b) => (this.saves = new SaveManager(b)));
    this.bindInput();
    window.addEventListener('resize', () => this.resize());
    this.resize();
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

  private resize(): void {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    const pr = this.renderer.getPixelRatio();
    this.post?.setSize(Math.floor(w * pr), Math.floor(h * pr));
    this.cam.setAspect(w / h);
    this.portrait?.setAspect(w / h);
    // Phones in portrait see less width; zoom out a bit.
    this.cam.maxView = w < h ? 34 : 30;
  }

  /** Load a location and place the player at a spawn point (or explicit tile). */
  loadLocation(id: string, spawn?: string | { x: number; y: number }): void {
    const map = MAPS[id];
    if (!map) throw new Error(`Unknown location ${id}`);
    if (this.loc) {
      this.scene.remove(this.loc.root);
      this.loc.root.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    }
    for (const a of this.actors.values()) this.scene.remove(a.object);
    this.actors.clear();

    this.loc = buildLocation(map);
    this.scene.add(this.loc.root);
    this.atmosphere.load(this.loc);

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
      look: lookFrom(this.state.pc.appearance, { shirt: 0x5a6a62, pants: 0x4a4a40, boots: 0x2a221a }),
    }, this.loc.grid);
    this.player.onArriveTile = (x, y) => this.onPlayerTile(x, y);
    this.player.onPathDone = () => { this.pathMarker.visible = false; };
    this.addActor(this.player);
    this.cam.target.copy(this.player.object.position);
    this.cam.recentre();
    this.cam.snapToTarget();
    this.emit('locationChanged', { id, name: map.name });
  }

  addActor(a: Actor): void {
    this.actors.set(a.id, a);
    this.scene.add(a.object);
  }

  private onPlayerTile(x: number, y: number): void {
    this.state.player.x = x;
    this.state.player.y = y;
    const exit = this.loc?.map.exits?.find((e) => inExit(e, x, y));
    if (exit && !this.transitioning) this.useExit(exit);
  }

  private async useExit(exit: ExitDef): Promise<void> {
    if (!('location' in exit.to)) {
      this.emit('message', { text: 'The world map is not built yet.' });
      return;
    }
    this.transitioning = true;
    const to = exit.to;
    await fade(1);
    this.loadLocation(to.location, to.spawn);
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
    i.on('tap', ({ x, y }) => {
      const t = this.pickTile(x, y);
      if (!t || !this.player || !this.loc || this.transitioning || this.paused) return;
      const p = this.player;
      const path = this.loc.grid.findPath(p.tx, p.ty, t.x, t.y, { ignore: p.id, adjacentOk: true });
      if (path && path.length) {
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
    });
    i.on('pan', ({ dx, dy }) => this.cam.panScreen(dx, dy, this.renderer.domElement.clientHeight));
    i.on('zoom', ({ factor }) => this.cam.zoomBy(factor));
    i.on('rotate', ({ rad }) => this.cam.rotateBy(rad));
    i.on('rotateStep', ({ dir }) => this.cam.rotateStep(dir));
    i.on('key', ({ code }) => {
      if (code === 'F5') void this.save('quick');
      if (code === 'F9') void this.loadSlot('quick');
      if (code === 'Space') this.cam.recentre();
      if (code === 'KeyR' && this.player) this.player.running = !this.player.running;
    });
  }

  /** Start a fresh game with a newly created character. */
  newGame(sheet: CharacterSheet, appearance: Appearance, pronouns: Pronouns): void {
    const inventory = emptyInventory();
    // Starting kit (Cistern issue). Kept deliberately thin: scarcity starts at the door.
    for (const [id, n] of [['r_jumpsuit', 1], ['w_shiv', 1], ['c_knitkit', 1], ['c_algae', 3], ['c_water', 2]] as const) addItem(inventory, makeItem(id, n));
    equip(inventory, inventory.items.findIndex((i) => i.def === 'r_jumpsuit'));
    equip(inventory, inventory.items.findIndex((i) => i.def === 'w_shiv'));
    inventory.tolls = 0;
    syncGear(sheet, inventory);
    this.state = newGameState('dev_yard', 15, 9, { sheet, appearance, pronouns, inventory });
    this.paused = false;
    this.loadLocation('dev_yard', 'start');
    void this.save('auto');
  }

  // --- Save / load ---------------------------------------------------------

  async save(slot: SlotId, label?: string): Promise<void> {
    if (!this.saves || !this.loc) return;
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
    this.loadLocation(this.state.locationId, { x: this.state.player.x, y: this.state.player.y });
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

  start(): void {
    this.renderer.setAnimationLoop((t) => this.frame(t));
  }

  private frame(now: number): void {
    const realDt = this.lastFrame ? Math.max(0, (now - this.lastFrame) / 1000) : 0;
    const dt = Math.min(0.05, realDt);
    this.lastFrame = now;
    this.renderer.info.reset();
    this.time += dt;
    const simDt = this.paused ? 0 : dt;
    this.state.playtimeSec += simDt;
    this.state.minutes += simDt * GAME_MINUTES_PER_SEC * this.timeScale;

    // Keyboard camera pan
    const held = this.input.held, panSpeed = 600 * dt;
    if (held.has('KeyW') || held.has('ArrowUp')) this.cam.panScreen(0, panSpeed, 800);
    if (held.has('KeyS') || held.has('ArrowDown')) this.cam.panScreen(0, -panSpeed, 800);
    if (held.has('KeyA') || held.has('ArrowLeft')) this.cam.panScreen(panSpeed, 0, 800);
    if (held.has('KeyD') || held.has('ArrowRight')) this.cam.panScreen(-panSpeed, 0, 800);

    for (const a of this.actors.values()) a.update(simDt);
    if (this.player) {
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
    if (this.portrait) {
      this.portrait.update(dt);
      this.post.render(this.portrait.scene, this.portrait.camera, this.time);
    } else this.post.render(this.scene, this.cam.camera, this.time);
    if (this.thumbWaiters.length) this.resolveThumbs();

    this.fpsAcc += realDt; this.fpsFrames++;
    if (this.fpsAcc >= 0.5) { this.fps = this.fpsFrames / this.fpsAcc; this.fpsAcc = 0; this.fpsFrames = 0; }
    this.emit('tick', { dt });
  }
}

function inExit(e: ExitDef, x: number, y: number): boolean {
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
