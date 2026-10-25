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
import { Encounter, type Unit } from './combat/encounter';
import { utilityAi } from './combat/ai';
import type { Combatant } from './combat/rules';
import { Rng } from './core/rng';
import { Fx } from './render/fx';
import { spawnNpc, type NpcRuntime } from './npc/spawn';
import { addXp, derived } from './stats/sheet';
import { skillCheck } from './stats/checks';
import { AudioEngine, stepSoundFor, type SfxId } from './audio/audio';

export type GameEvents = {
  locationChanged: { id: string; name: string };
  saved: { slot: SlotId };
  loaded: { slot?: SlotId };
  tick: { dt: number };
  message: { text: string };
  gameOver: Record<string, never>;
  openTransfer: { inv: import('./inventory/inventory').Inventory; name: string };
};

/** Cistern-issue coveralls and boots. */
export const PLAYER_OUTFIT = { suit: 'male_worksuit01', suitTint: 0xa8b0a0, shoes: 'shoes06', shoeTint: 0x8a8070 };

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
      this.syncNpcState();
    });

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
      look: lookFrom(this.state.pc.appearance, PLAYER_OUTFIT),
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
    for (const p of map.npcs ?? []) this.spawn(p);
    this.groundPilesChanged();
    this.cam.target.copy(this.player.object.position);
    this.cam.recentre();
    this.cam.snapToTarget();
    this.emit('locationChanged', { id, name: map.name });
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
    if (saved?.inventory) rt.combatant.inv = saved.inventory;
    this.npcs.set(rt.id, rt);
    this.addActor(rt.actor);
    if (saved?.dead) { rt.combatant.sheet.hp = 0; rt.actor.kill(true); }
    return rt;
  }

  /** Persist NPC positions/health/inventories for the current map. */
  syncNpcState(): void {
    for (const n of this.npcs.values()) {
      const key = `${this.state.locationId}/${n.id}`;
      const dead = n.combatant.sheet.hp <= 0;
      this.state.npcs[key] = { dead, hp: n.combatant.sheet.hp, x: n.actor.tx, y: n.actor.ty, hostile: n.hostile, inventory: n.combatant.inv };
    }
    this.state.rngState = this.rng.state;
  }

  startCombat(target?: NpcRuntime): void {
    if (this.encounter.active || !this.player || !this.loc) return;
    this.player.stop();
    this.pathMarker.visible = false;
    this.pc.x = this.player.tx; this.pc.y = this.player.ty;
    const units: Unit[] = [{ c: this.pc, actor: this.player, hostile: false }];
    for (const n of this.npcs.values()) {
      if (n.combatant.sheet.hp <= 0) continue;
      if (Math.max(Math.abs(n.actor.tx - this.player.tx), Math.abs(n.actor.ty - this.player.ty)) > 24 && !n.hostile) continue;
      if (!n.hostile && n !== target) continue;
      if (n === target) n.hostile = true;
      units.push({ c: n.combatant, actor: n.actor, hostile: n.hostile, leader: n.def.leader });
    }
    if (units.length < 2) return;
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
      if (!n.hostile || n.combatant.sheet.hp <= 0) continue;
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
      if (n.combatant.sheet.hp > 0 || n.actor.tx !== x || n.actor.ty !== y) continue;
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
    const prop = this.loc?.map.props?.find((p) => p.x === x && p.y === y && p.id && this.loc!.map.containers?.[p.id]);
    if (prop) {
      const def = this.loc!.map.containers![prop.id!];
      const key = `${loc}/${prop.id}`;
      return () => {
        const unlockedFlag = `unlocked:${key}`;
        if (def.lock && !this.state.flags[unlockedFlag]) {
          const r = skillCheck(this.state.pc.sheet, this.state.pc.inventory, 'locks', def.lock, this.rng);
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
      if (code === 'F5') void this.save('quick');
      if (code === 'F9') void this.loadSlot('quick');
      if (code === 'Space') this.cam.recentre();
      if (code === 'KeyR' && this.player && !this.encounter.active) this.player.running = !this.player.running;
      if (this.encounter.active && (code === 'Enter' || code === 'KeyT')) this.encounter.endTurn();
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
    if (!this.encounter.active) this.state.minutes += simDt * GAME_MINUTES_PER_SEC * this.timeScale;
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
