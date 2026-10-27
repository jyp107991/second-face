import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { MOTION_BONES, clipDuration, installMotion, motionClip, motionReady, sampleClip, samplePos, type MotionClip } from '../src/engine/assets/human/motion';

function clip(name: string, frames: number, loop: boolean): MotionClip {
  const bones = 2;
  const q = new Int16Array(frames * bones * 4);
  const p = new Float32Array(frames * 3);
  for (let f = 0; f < frames; f++) {
    // Bone 0 turns about Y by f × 10°, bone 1 stays at rest; the pelvis rises with the frame.
    const r = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (f * 10 * Math.PI) / 180);
    q.set([r.x, r.y, r.z, r.w].map((v) => Math.round(v * 32767)), (f * bones) * 4);
    q.set([0, 0, 0, 32767], (f * bones + 1) * 4);
    p.set([0, f * 0.1, 0], f * 3);
  }
  return { name, fps: 10, frames, loop, speed: 0, root: false, hip: 0.9, dir: [new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)], q, p };
}

describe('motion clips', () => {
  installMotion(['root', 'head'], [clip('spin', 4, true), clip('once', 4, false)]);

  it('registers clips and their bones', () => {
    expect(motionReady()).toBe(true);
    expect(MOTION_BONES).toEqual(['root', 'head']);
    expect(clipDuration(motionClip('spin')!)).toBeCloseTo(0.4);
  });

  it('interpolates between frames and loops', () => {
    const c = motionClip('spin')!;
    const out = new THREE.Quaternion();
    const yaw = (t: number) => { sampleClip(c, t, 0, out); const e = new THREE.Euler().setFromQuaternion(out, 'YXZ'); return (e.y * 180) / Math.PI; };
    expect(yaw(0)).toBeCloseTo(0, 1);
    expect(yaw(0.1)).toBeCloseTo(10, 1);
    expect(yaw(0.15)).toBeCloseTo(15, 1);
    // The last frame (30°) wraps toward the first (0°).
    expect(yaw(0.35)).toBeCloseTo(15, 1);
    expect(yaw(0.4)).toBeCloseTo(0, 1);
    expect(yaw(-0.1)).toBeCloseTo(30, 1);
    sampleClip(c, 0.25, 1, out);
    expect(out.w).toBeCloseTo(1, 3);
  });

  it('clamps a one-shot at its ends', () => {
    const c = motionClip('once')!;
    const out = new THREE.Quaternion();
    const e = new THREE.Euler();
    sampleClip(c, 5, 0, out);
    expect((e.setFromQuaternion(out, 'YXZ').y * 180) / Math.PI).toBeCloseTo(30, 1);
    sampleClip(c, -5, 0, out);
    expect((e.setFromQuaternion(out, 'YXZ').y * 180) / Math.PI).toBeCloseTo(0, 1);
    const v = samplePos(c, 0.25, new THREE.Vector3());
    expect(v.y).toBeCloseTo(0.25, 5);
    expect(samplePos(c, 9, v).y).toBeCloseTo(0.3, 5);
  });
});
