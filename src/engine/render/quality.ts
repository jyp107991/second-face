export type QualityLevel = 'low' | 'medium' | 'high';

export interface QualityPreset {
  pixelRatio: number;
  shadowSize: number;
  bloom: boolean;
  msaa: number;
  pointLights: number;
  dust: number;
}

export const QUALITY: Record<QualityLevel, QualityPreset> = {
  low: { pixelRatio: 1, shadowSize: 0, bloom: false, msaa: 0, pointLights: 2, dust: 150 },
  medium: { pixelRatio: 1.5, shadowSize: 1024, bloom: true, msaa: 0, pointLights: 4, dust: 400 },
  high: { pixelRatio: 2, shadowSize: 2048, bloom: true, msaa: 4, pointLights: 6, dust: 900 },
};

/** Pick a sensible default from the device. */
export function detectQuality(): QualityLevel {
  const touch = matchMedia('(pointer: coarse)').matches;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 4;
  if (touch) return mem >= 6 && cores >= 8 ? 'medium' : 'low';
  return mem >= 4 ? 'high' : 'medium';
}
