import { REGIONS } from '../../content';
import { WORLD_SCALE } from '../../content/world/sites';
import { heightAt, normalAt, WATER_LEVEL } from '../world/height';
import { regionAt } from '../world/terrain';

/**
 * The field map's picture of the land: the heightfield sampled over the whole world (3 km to a pixel), coloured
 * by region, lit from the north-west, the sea and the drowned ground in water. Built in idle slices so the map
 * screen never waits; drawn as far as it has got.
 */
export const KM_PER_PX = 3;

const PALETTE: Record<string, [number, number, number]> = {
  sallow: [206, 184, 142],
  glass_flats: [214, 206, 188],
  rail_corridor: [176, 170, 112],
  drowned_shore: [150, 150, 122],
  meridian: [150, 146, 140],
  teeth: [142, 130, 116],
  ashlands: [120, 112, 104],
  northern_wet: [120, 138, 92],
};

export class MapImage {
  readonly width: number;
  readonly height: number;
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private data: ImageData;
  private row = 0;
  private scheduled = false;

  constructor() {
    // The world map is 700 × 500 km (the regions' bounds); the cell area east of it is not land.
    let w = 0, h = 0;
    for (const r of Object.values(REGIONS)) { w = Math.max(w, r.bounds[2]); h = Math.max(h, r.bounds[3]); }
    this.width = Math.ceil(w / KM_PER_PX); this.height = Math.ceil(h / KM_PER_PX);
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width; this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d')!;
    this.data = this.ctx.createImageData(this.width, this.height);
  }

  get done(): boolean { return this.row >= this.height; }
  /** Fraction of the picture drawn. */
  get progress(): number { return this.row / this.height; }

  /** Keep working in idle time until the picture is complete. */
  warm(): void {
    if (this.done || this.scheduled) return;
    this.scheduled = true;
    const run = () => { this.scheduled = false; this.step(10); this.warm(); };
    if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 200 }); else setTimeout(run, 16);
  }

  /** Draw rows for up to `budgetMs`. */
  step(budgetMs: number): void {
    const t0 = performance.now();
    const d = this.data.data;
    const light = [-0.55, 0.62, -0.56];
    while (this.row < this.height && performance.now() - t0 < budgetMs) {
      const y = this.row;
      for (let x = 0; x < this.width; x++) {
        const kx = (x + 0.5) * KM_PER_PX, ky = (y + 0.5) * KM_PER_PX;
        const wx = kx * WORLD_SCALE, wz = ky * WORLD_SCALE;
        const h = heightAt(wx, wz);
        const i = (y * this.width + x) * 4;
        if (h < WATER_LEVEL) {
          const deep = Math.min(1, -h / 6);
          d[i] = 96 - 30 * deep; d[i + 1] = 126 - 30 * deep; d[i + 2] = 134 - 24 * deep; d[i + 3] = 255;
          continue;
        }
        const base = PALETTE[regionAt(wx, wz)] ?? PALETTE.sallow;
        const n = normalAt(wx, wz);
        const shade = 0.72 + 0.55 * Math.max(0, n[0] * light[0] + n[1] * light[1] + n[2] * light[2]);
        // High ground pales toward rock and snow.
        const snow = Math.max(0, Math.min(1, (h - 60) / 40));
        d[i] = Math.min(255, (base[0] * (1 - snow) + 226 * snow) * shade);
        d[i + 1] = Math.min(255, (base[1] * (1 - snow) + 226 * snow) * shade);
        d[i + 2] = Math.min(255, (base[2] * (1 - snow) + 230 * snow) * shade);
        d[i + 3] = 255;
      }
      this.row++;
    }
    this.ctx.putImageData(this.data, 0, 0);
  }
}

let shared: MapImage | undefined;
/** The one picture of the land (built lazily, warmed in idle time). */
export function mapImage(): MapImage {
  if (!shared) { shared = new MapImage(); shared.warm(); }
  return shared;
}
