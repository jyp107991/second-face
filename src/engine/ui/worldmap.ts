import { REGIONS, WORLD_MAP } from '../../content';
import { hourOf } from '../core/state';
import type { Game } from '../game';
import { planTrip, type Trip } from '../world/travel';

/**
 * The field map (DESIGN §13c): the places you know, the roads between them, and a trip planner. Travel is
 * overland on foot for now (networks come with the Line and the barges); time passes, the world moves, and
 * you arrive at the destination's map. Places are known when visited or when someone tells you of them
 * (knowledge `loc_<id>`).
 */
export class WorldMapUi {
  private el?: HTMLElement;
  private canvas?: HTMLCanvasElement;
  private selected?: string;
  private pts = new Map<string, { x: number; y: number }>();

  constructor(private game: Game) {
    game.on('openMap', () => this.open());
    window.addEventListener('keydown', (e) => { if (e.code === 'Escape' && this.el) { e.stopImmediatePropagation(); this.close(); } }, true);
  }

  /** World-map location the player is at (the one whose map is loaded), else where they last were. */
  here(): string {
    const id = this.game.state.locationId;
    const at = Object.values(WORLD_MAP.locations).find((l) => l.map === id)?.id;
    if (at) this.game.state.world.at = at;
    return this.game.state.world.at ?? 'cistern9';
  }

  known(id: string): boolean {
    const w = this.game.state.world;
    return !!w.knownLocations?.includes(id) || !!w.knowledge[`loc_${id}`];
  }

  open(): void {
    if (this.el || this.game.encounter.active || document.querySelector('.dlg')) return;
    this.selected = undefined;
    this.el = document.createElement('div');
    this.el.className = 'wl';
    this.el.addEventListener('click', (e) => { if (e.target === this.el) this.close(); });
    document.body.appendChild(this.el);
    this.game.paused = true;
    this.render();
  }

  close(): void {
    this.el?.remove();
    this.el = undefined;
    this.canvas = undefined;
    this.game.paused = false;
  }

  private trip(to: string): Trip | undefined {
    const from = this.here();
    if (from === to) return undefined;
    return planTrip(WORLD_MAP, from, to, { modes: [], networks: [], known: (id) => this.known(id), hour: hourOf(this.game.state.minutes) });
  }

  private async travel(to: string): Promise<void> {
    const trip = this.trip(to);
    const loc = WORLD_MAP.locations[to];
    if (!trip || !loc) return;
    const from = this.here();
    this.close();
    await this.game.travelTo(to, from, trip);
  }

  private render(): void {
    if (!this.el) return;
    const sel = this.selected ? WORLD_MAP.locations[this.selected] : undefined;
    const trip = this.selected ? this.trip(this.selected) : undefined;
    const here = this.here();
    const hours = trip ? trip.hours : 0;
    const arrive = (this.game.state.minutes + hours * 60);
    const arriveDay = Math.floor(arrive / 1440) + 1, arriveHour = Math.floor((arrive % 1440) / 60);
    const risk = trip ? Math.round(Math.max(...trip.legs.map((l) => l.risk), 0) * 100) : 0;
    const region = sel ? REGIONS[sel.region]?.name ?? sel.region : '';
    const side = sel
      ? `<h4>${esc(sel.name)}</h4><p class="dim">${esc(region)}${sel.settlement ? ' · settlement' : sel.kind === 'landmark' ? ' · landmark' : ''}</p>
         ${this.selected === here ? '<p>You are here.</p>' : this.game.loc?.map.interior
          ? '<p class="dim">You will have to get outside first.</p>' : trip
          ? `<p>On foot: <b>${fmtHours(hours)}</b>${hours >= 10 ? ' (with a night on the road)' : ''}.<br>Arrive day ${arriveDay}, about ${String(arriveHour).padStart(2, '0')}:00.<br>Trouble on the way: <b>${risk < 15 ? 'unlikely' : risk < 40 ? 'possible' : 'likely'}</b>.</p>
             <div class="acts"><button data-a="travel">Set out</button></div>`
          : '<p class="dim">No road you know leads there.</p>'}`
      : '<p class="dim">Tap a place you know. Roads you have walked or been told of are drawn; the rest of the Reach is blank until someone fills it in.</p>';
    this.el.innerHTML = `<div class="nb map"><div class="nb-top"><b>The Western Reach</b> <span class="dim">field map · day ${Math.floor(this.game.state.minutes / 1440) + 1}</span><button class="x" data-a="close" aria-label="Close">✕</button></div>
      <div class="nb-body map-body"><canvas class="map-canvas"></canvas><div class="col map-side">${side}</div></div>
      <div class="nb-foot"><button data-a="close">Close</button></div></div>`;
    this.el.querySelectorAll<HTMLElement>('[data-a=close]').forEach((b) => b.addEventListener('click', () => this.close()));
    this.el.querySelector("[data-a=travel]")?.addEventListener('click', () => { if (this.selected) void this.travel(this.selected); });
    this.canvas = this.el.querySelector('canvas')!;
    this.canvas.addEventListener('click', (e) => this.pick(e));
    requestAnimationFrame(() => this.draw());
  }

  private pick(e: MouseEvent): void {
    const c = this.canvas; if (!c) return;
    const r = c.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    let best: string | undefined, bd = 22;
    for (const [id, p] of this.pts) { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = id; } }
    if (best) { this.selected = best; this.render(); }
  }

  private draw(): void {
    const c = this.canvas; if (!c) return;
    const W = c.clientWidth, H = c.clientHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = W * dpr; c.height = H * dpr;
    const g = c.getContext('2d')!;
    g.scale(dpr, dpr);
    const known = Object.values(WORLD_MAP.locations).filter((l) => this.known(l.id));
    const here = this.here();
    // Fit the known places with a margin; never zoom closer than ~120 km across.
    let x0 = Math.min(...known.map((l) => l.x)) - 40, x1 = Math.max(...known.map((l) => l.x)) + 40;
    let y0 = Math.min(...known.map((l) => l.y)) - 40, y1 = Math.max(...known.map((l) => l.y)) + 40;
    if (x1 - x0 < 120) { const m = (x0 + x1) / 2; x0 = m - 60; x1 = m + 60; }
    if (y1 - y0 < 120) { const m = (y0 + y1) / 2; y0 = m - 60; y1 = m + 60; }
    const sx = W / (x1 - x0), sy = H / (y1 - y0), s = Math.min(sx, sy);
    const ox = (W - (x1 - x0) * s) / 2, oy = (H - (y1 - y0) * s) / 2;
    const P = (x: number, y: number) => ({ x: ox + (x - x0) * s, y: oy + (y - y0) * s });
    // Paper
    g.fillStyle = '#d9c9a3'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(90,70,40,${0.03 + (i % 7) * 0.004})`; g.fillRect((i * 7919) % W, (i * 104729) % H, 2 + (i % 5), 1 + (i % 3)); }
    // Regions (faint) and their names
    g.font = '600 13px "Caveat", cursive'; g.textAlign = 'center';
    for (const r of Object.values(REGIONS)) {
      const a = P(r.bounds[0], r.bounds[1]), b = P(r.bounds[2], r.bounds[3]);
      if (b.x < 0 || a.x > W || b.y < 0 || a.y > H) continue;
      g.fillStyle = 'rgba(80,60,30,.55)';
      g.fillText(r.name.toUpperCase(), Math.max(50, Math.min(W - 50, (a.x + b.x) / 2)), Math.max(16, Math.min(H - 8, a.y + 18)));
    }
    // Roads between known places
    g.strokeStyle = 'rgba(70,50,25,.75)'; g.lineWidth = 1.5; g.setLineDash([6, 4]);
    for (const r of WORLD_MAP.routes) {
      if (!this.known(r.a) || !this.known(r.b)) continue;
      const a = WORLD_MAP.locations[r.a], b = WORLD_MAP.locations[r.b];
      const pa = P(a.x, a.y), pb = P(b.x, b.y);
      g.beginPath(); g.moveTo(pa.x, pa.y); g.lineTo(pb.x, pb.y); g.stroke();
    }
    g.setLineDash([]);
    // Places
    this.pts.clear();
    g.font = '15px "Caveat", cursive';
    for (const l of known) {
      const p = P(l.x, l.y);
      this.pts.set(l.id, p);
      const major = l.kind === 'major';
      g.fillStyle = l.id === this.selected ? '#8a2a1a' : '#2a1d10';
      g.beginPath(); g.arc(p.x, p.y, major ? 5 : 3.5, 0, Math.PI * 2); g.fill();
      if (l.kind === 'landmark') { g.strokeStyle = '#2a1d10'; g.lineWidth = 1; g.beginPath(); g.arc(p.x, p.y, 7, 0, Math.PI * 2); g.stroke(); }
      if (l.id === here) { g.strokeStyle = '#8a2a1a'; g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, 10, 0, Math.PI * 2); g.stroke(); }
      g.fillStyle = '#2a1d10'; g.textAlign = 'left';
      g.fillText(l.name, p.x + 9, p.y + 5);
    }
    // Scale bar: 20 km
    const bar = 20 * s;
    g.strokeStyle = '#2a1d10'; g.lineWidth = 2; g.beginPath(); g.moveTo(16, H - 14); g.lineTo(16 + bar, H - 14); g.stroke();
    g.font = '12px "Caveat", cursive'; g.textAlign = 'left'; g.fillText('20 km', 16, H - 18);
  }
}

function fmtHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} min`;
  const d = Math.floor(h / 24), r = h - d * 24;
  return `${d ? `${d} day${d > 1 ? 's' : ''} ` : ''}${Math.round(r)} h`;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
