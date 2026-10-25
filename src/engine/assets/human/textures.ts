import * as THREE from 'three';
import { humanData } from './data';

/** Image/texture cache for human assets (images are needed for CPU skin compositing). */
const images = new Map<string, Promise<HTMLImageElement>>();
const textures = new Map<string, THREE.Texture>();

export function loadImage(rel: string): Promise<HTMLImageElement> {
  let p = images.get(rel);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load ${rel}`));
      img.src = humanData().url(rel);
    });
    images.set(rel, p);
  }
  return p;
}

/** Shared GPU texture for a human asset (hair, eyes, clothes...). */
export function humanTexture(rel: string, srgb = true): THREE.Texture {
  let t = textures.get(rel);
  if (!t) {
    t = new THREE.Texture();
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 4;
    const tex = t;
    void loadImage(rel).then((img) => { tex.image = img; tex.needsUpdate = true; });
    textures.set(rel, t);
  }
  return t;
}

/** Preload the textures every figure needs (skins, eyes) so figures appear fully dressed. */
export async function preloadHumanTextures(): Promise<void> {
  const d = humanData();
  await Promise.all([...Object.values(d.m.skins), ...Object.values(d.m.eyes)].map((r) => loadImage(r).catch(() => undefined)));
}
