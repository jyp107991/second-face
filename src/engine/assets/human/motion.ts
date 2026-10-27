import * as THREE from 'three';

/**
 * Captured motion clips for the human rig (public/assets/human/anim, built by tools/assets/motion/cmu.mjs).
 * A clip holds, per frame and per animated bone, the bone's rotation relative to the capture's rest pose in a
 * canonical frame (Y up, the subject facing +Z), plus the rest direction of each source bone and the pelvis's
 * position. A figure plays a clip by aligning each of its own bones' rest directions to the source's and applying
 * the captured rotation, so bones point where the captured ones pointed whatever the figure's build.
 */
export interface MotionClip {
  name: string;
  fps: number;
  frames: number;
  loop: boolean;
  /** Travel speed of a gait (m/s); 0 for motion on the spot. */
  speed: number;
  /** The pelvis travels (falls, getting up); otherwise the clip plays in place. */
  root: boolean;
  /** The capture subject's standing hip height (m): root heights are relative to it. */
  hip: number;
  /** Rest direction of each source bone (per MOTION_BONES). */
  dir: THREE.Vector3[];
  /** frames × bones × 4, int16 quaternions (x, y, z, w). */
  q: Int16Array;
  /** frames × 3: lateral offset (m), height relative to the hip height (fraction), forward offset (m). */
  p: Float32Array;
}

interface ClipIndex {
  name: string; fps: number; frames: number; loop: boolean; speed: number; root: boolean; hip: number; src: string;
  dir: number[][]; q: number; p: number;
}

/** Bone order within every clip (the rig's names). */
export const MOTION_BONES: string[] = [];
const clips = new Map<string, MotionClip>();
let cached: Promise<void> | undefined;
let ready = false;

export function motionReady(): boolean { return ready; }
export function motionClip(name: string): MotionClip | undefined { return clips.get(name); }
export function motionClipNames(): string[] { return [...clips.keys()]; }
export function clipDuration(c: MotionClip): number { return c.frames / c.fps; }

export function loadMotion(baseUrl = import.meta.env.BASE_URL + 'assets/human/anim/'): Promise<void> {
  cached ??= (async () => {
    const [iRes, bRes] = await Promise.all([fetch(baseUrl + 'clips.json'), fetch(baseUrl + 'clips.bin')]);
    if (!iRes.ok || !bRes.ok) throw new Error('Failed to load motion clips');
    const index = (await iRes.json()) as { bones: string[]; clips: ClipIndex[] };
    const buf = await bRes.arrayBuffer();
    MOTION_BONES.splice(0, MOTION_BONES.length, ...index.bones);
    const nb = index.bones.length;
    for (const c of index.clips) {
      clips.set(c.name, {
        name: c.name, fps: c.fps, frames: c.frames, loop: c.loop, speed: c.speed, root: c.root, hip: c.hip,
        dir: c.dir.map((d) => new THREE.Vector3(d[0], d[1], d[2])),
        q: new Int16Array(buf, c.q, c.frames * nb * 4),
        p: new Float32Array(buf, c.p, c.frames * 3),
      });
    }
    ready = true;
  })();
  return cached;
}

/** Install clips directly (tests, tools). */
export function installMotion(bones: string[], list: MotionClip[]): void {
  MOTION_BONES.splice(0, MOTION_BONES.length, ...bones);
  clips.clear();
  for (const c of list) clips.set(c.name, c);
  ready = true;
}

const frameAt = (c: MotionClip, time: number): [number, number, number] => {
  let f = time * c.fps;
  if (c.loop) f = ((f % c.frames) + c.frames) % c.frames;
  else f = Math.max(0, Math.min(c.frames - 1, f));
  const i0 = Math.floor(f);
  const i1 = c.loop ? (i0 + 1) % c.frames : Math.min(c.frames - 1, i0 + 1);
  return [i0, i1, f - i0];
};

const qb = new THREE.Quaternion();
const Q = 1 / 32767;

/** The captured rotation of bone `bone` (index into MOTION_BONES) at `time` seconds, looping or clamped. */
export function sampleClip(c: MotionClip, time: number, bone: number, out: THREE.Quaternion): THREE.Quaternion {
  const nb = MOTION_BONES.length;
  const [i0, i1, t] = frameAt(c, time);
  const k0 = (i0 * nb + bone) * 4;
  out.set(c.q[k0] * Q, c.q[k0 + 1] * Q, c.q[k0 + 2] * Q, c.q[k0 + 3] * Q);
  if (t > 0.001 && i1 !== i0) {
    const k1 = (i1 * nb + bone) * 4;
    qb.set(c.q[k1] * Q, c.q[k1 + 1] * Q, c.q[k1 + 2] * Q, c.q[k1 + 3] * Q);
    out.slerp(qb, t);
  }
  return out;
}

/** The pelvis offset at `time` (x lateral m, y relative height, z forward m). */
export function samplePos(c: MotionClip, time: number, out: THREE.Vector3): THREE.Vector3 {
  const [i0, i1, t] = frameAt(c, time);
  const a = i0 * 3, b = i1 * 3;
  return out.set(c.p[a] + (c.p[b] - c.p[a]) * t, c.p[a + 1] + (c.p[b + 1] - c.p[a + 1]) * t, c.p[a + 2] + (c.p[b + 2] - c.p[a + 2]) * t);
}
