import * as THREE from 'three';
import { Humanoid, type HumanoidLook } from '../assets/humanoid';
import type { Grid } from './grid';

export interface ActorOpts {
  id: string;
  look: HumanoidLook;
  x: number;
  y: number;
  facing?: number;
}

/** A character placed on the grid with smooth movement between tiles. */
export class Actor {
  readonly id: string;
  readonly body: Humanoid;
  readonly object: THREE.Group;
  tx: number;
  ty: number;
  /** Facing angle (radians, 0 = +z/south). */
  facing: number;
  private path: { x: number; y: number }[] = [];
  /** Walk speed in tiles/sec. */
  speed = 3.2;
  running = false;
  private velocity = 0;
  onArriveTile?: (x: number, y: number) => void;
  /** Footstep hook (audio). */
  onStep?: (x: number, y: number) => void;
  onPathDone?: () => void;

  constructor(opts: ActorOpts, private grid: Grid) {
    this.id = opts.id;
    this.tx = opts.x;
    this.ty = opts.y;
    this.facing = opts.facing ?? 0;
    this.body = new Humanoid(opts.look);
    this.object = this.body.root;
    this.object.position.set(opts.x + 0.5, 0, opts.y + 0.5);
    this.object.userData.actorId = opts.id;
    grid.occupied.set(grid.index(opts.x, opts.y), opts.id);
  }

  get moving(): boolean {
    return this.path.length > 0;
  }

  setPath(path: { x: number; y: number }[]): void {
    this.path = path.slice();
  }

  /** Walk a path and resolve when finished (or blocked). */
  walk(path: { x: number; y: number }[]): Promise<void> {
    return new Promise((resolve) => {
      if (!path.length) return resolve();
      const prev = this.onPathDone;
      this.onPathDone = () => { this.onPathDone = prev; prev?.(); resolve(); };
      this.setPath(path);
    });
  }

  stop(): void {
    this.path.length = Math.min(this.path.length, 1);
  }

  /** Dead: play the fall and stop blocking the tile (corpse stays). */
  kill(instant = false): void {
    this.path = [];
    this.grid.occupied.delete(this.grid.index(this.tx, this.ty));
    this.dying = instant ? 1 : 0.0001;
    if (instant) this.body.dead = 1;
  }
  private dying = 0;
  get isDead(): boolean { return this.dying > 0; }

  /** Teleport (no animation). */
  place(x: number, y: number): void {
    this.grid.occupied.delete(this.grid.index(this.tx, this.ty));
    this.tx = x; this.ty = y;
    this.grid.occupied.set(this.grid.index(x, y), this.id);
    this.object.position.set(x + 0.5, 0, y + 0.5);
    this.path = [];
  }

  faceTowards(wx: number, wz: number): void {
    this.facing = Math.atan2(wx - this.object.position.x, wz - this.object.position.z);
  }

  update(dt: number): void {
    const pos = this.object.position;
    let speedNow = 0;
    if (this.path.length) {
      const next = this.path[0];
      // Claim the next tile; if someone else took it, stop and let the caller re-path.
      const ni = this.grid.index(next.x, next.y);
      const occ = this.grid.occupied.get(ni);
      if (occ !== undefined && occ !== this.id) {
        this.path = [];
        this.onPathDone?.();
      } else {
        if (occ === undefined) {
          this.grid.occupied.delete(this.grid.index(this.tx, this.ty));
          this.grid.occupied.set(ni, this.id);
          this.tx = next.x; this.ty = next.y;
        }
        const goalX = next.x + 0.5, goalZ = next.y + 0.5;
        const dx = goalX - pos.x, dz = goalZ - pos.z;
        const dist = Math.hypot(dx, dz);
        const maxV = this.speed * (this.running ? 1.8 : 1);
        this.velocity = Math.min(maxV, this.velocity + dt * 12);
        const step = this.velocity * dt;
        if (dist > 0.001) this.facing = turnTowards(this.facing, Math.atan2(dx, dz), dt * 12);
        if (step >= dist) {
          pos.x = goalX; pos.z = goalZ;
          this.path.shift();
          this.onStep?.(next.x, next.y);
          this.onArriveTile?.(next.x, next.y);
          if (!this.path.length) { this.velocity = 0; this.onPathDone?.(); }
        } else {
          pos.x += (dx / dist) * step;
          pos.z += (dz / dist) * step;
        }
        speedNow = this.velocity;
      }
    }
    this.object.rotation.y = this.facing;
    if (this.dying > 0 && this.dying < 1) { this.dying = Math.min(1, this.dying + dt * 1.6); this.body.dead = this.dying; }
    this.body.animate(dt, speedNow);
  }
}

function turnTowards(cur: number, goal: number, maxStep: number): number {
  let d = goal - cur;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return cur + Math.max(-maxStep, Math.min(maxStep, d));
}
