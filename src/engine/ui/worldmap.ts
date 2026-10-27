import { REGIONS, WORLD_MAP } from '../../content';
import { WORLD_SCALE } from '../../content/world/sites';
import { hourOf } from '../core/state';
import type { Game } from '../game';
import { worldToKm } from '../world/sites';
import { fastTravel, planTrip, type Trip } from '../world/travel';
import { journeyHours, ways } from '../world/ways';
import { KM_PER_PX, mapImage } from './mapImage';

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
  private redraw?: number;

  constructor(private game: Game) {
    game.on('openMap', () => this.open());
    // The picture of the land is built in idle time from the start, so the map is ready when first opened.
    mapImage();
    window.addEventListener('keydown', (e) => { if (e.code === 'Escape' && this.el) { e.stopImmediatePropagation(); this.close(); } }, true);
  }

  /** World-map location the player is at (the one whose map is loaded), else where they last were. */
  here(): string {
    const at = this.game.nearestLocation();
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
    if (this.redraw) { clearTimeout(this.redraw); this.redraw = undefined; }
    this.game.paused = false;
  }

  /** The place the player is actually in (none in the open country). */
  private atPlace(): string | undefined {
    const id = this.game.state.locationId;
    return Object.values(WORLD_MAP.locations).find((l) => l.map === id)?.id;
  }

  /** Where the player stands, in km: their tile in the open world; the place they are in when inside. */
  private me(): { x: number; y: number } {
    const g = this.game;
    if (g.world.mode === 'open' && g.player) return worldToKm(g.player.tx + 0.5, g.player.ty + 0.5);
    const l = WORLD_MAP.locations[this.here()];
    return l ? { x: l.x, y: l.y } : { x: 0, y: 0 };
  }

  private trip(to: string): Trip | undefined {
    const from = this.here();
    if (to === this.atPlace()) return undefined;
    // The nearest place, from the open country: a straight walk to it.
    if (from === to) return { legs: [], hours: 0, fare: 0, fast: false };
    return planTrip(WORLD_MAP, from, to, { modes: [], networks: [], known: (id) => this.known(id), hour: hourOf(this.game.state.minutes) });
  }

  /** Vehicles that would carry the player from here to a place: the networks with a stop here, each with its own trip. */
  private rides(to: string): { id: string; name: string; trip: Trip }[] {
    const from = this.here();
    const out: { id: string; name: string; trip: Trip }[] = [];
    for (const n of Object.values(WORLD_MAP.networks)) {
      if (!n.stops.includes(from) || !n.stops.includes(to) || from === to) continue;
      const trip = fastTravel(WORLD_MAP, from, to, { modes: [], networks: [n.id], known: (id) => this.known(id), hour: hourOf(this.game.state.minutes) });
      if (trip) out.push({ id: n.id, name: n.name, trip });
    }
    return out;
  }

  /** On foot: the player walks the ways there, the clock running fast. */
  private walk(to: string): void {
    const trip = this.trip(to);
    if (!trip) return;
    const from = this.here();
    this.close();
    this.game.startJourney(to, from, trip);
  }

  /** By vehicle: time passes, the fare is paid, you arrive. */
  private async ride(to: string, network: string): Promise<void> {
    const r = this.rides(to).find((x) => x.id === network);
    if (!r) return;
    const from = this.here();
    this.close();
    await this.game.travelTo(to, from, r.trip);
  }

  private render(): void {
    if (!this.el) return;
    const sel = this.selected ? WORLD_MAP.locations[this.selected] : undefined;
    const trip = this.selected ? this.trip(this.selected) : undefined;
    const at = this.atPlace();
    const direct = sel ? Math.hypot(sel.x - this.me().x, sel.y - this.me().y) * WORLD_SCALE / 210 : 0;
    const hours = trip ? (trip.legs.length ? journeyHours(trip.legs) : Math.round(direct * 10) / 10) : 0;
    const arrive = (this.game.state.minutes + hours * 60);
    const arriveDay = Math.floor(arrive / 1440) + 1, arriveHour = Math.floor((arrive % 1440) / 60);
    const risk = trip ? Math.round(Math.max(...trip.legs.map((l) => l.risk), 0) * 100) : 0;
    const region = sel ? REGIONS[sel.region]?.name ?? sel.region : '';
    const rides = this.selected ? this.rides(this.selected) : [];
    const tolls = this.game.state.pc.inventory.tolls;
    const rideRows = rides.map((r) => { const a = this.game.state.minutes + r.trip.hours * 60; return `<p>${esc(r.name)}: <b>${fmtHours(r.trip.hours)}</b>, fare <b>${r.trip.fare}</b> Tolls. Arrive day ${Math.floor(a / 1440) + 1}, about ${String(Math.floor((a % 1440) / 60)).padStart(2, '0')}:00.</p>
      <div class="acts"><button data-a="ride" data-n="${r.id}" ${tolls < r.trip.fare ? 'disabled' : ''}>${tolls < r.trip.fare ? 'Cannot pay' : 'Board'}</button></div>`; }).join('');
    const side = sel
      ? `<h4>${esc(sel.name)}</h4><p class="dim">${esc(region)}${sel.settlement ? ' · settlement' : sel.kind === 'landmark' ? ' · landmark' : ''}</p>
         ${this.selected === at ? '<p>You are here.</p>' : this.game.loc?.map.interior
          ? '<p class="dim">You will have to get outside first.</p>' : trip
          ? `<p>On foot: <b>${fmtHours(hours)}</b> of walking.<br>Arrive day ${arriveDay}, about ${String(arriveHour).padStart(2, '0')}:00.<br>Trouble on the way: <b>${risk < 15 ? 'unlikely' : risk < 40 ? 'possible' : 'likely'}</b>.</p>
             <div class="acts"><button data-a="travel">Walk there</button></div>${rideRows}`
          : rideRows || '<p class="dim">No road you know leads there.</p>'}`
      : '<p class="dim">Tap a place you know. Roads you have walked or been told of are drawn; the rest of the Reach is blank until someone fills it in.</p>';
    this.el.innerHTML = `<div class="nb map"><div class="nb-top"><b>The Western Reach</b> <span class="dim">field map · day ${Math.floor(this.game.state.minutes / 1440) + 1}</span><button class="x" data-a="close" aria-label="Close">✕</button></div>
      <div class="nb-body map-body"><canvas class="map-canvas"></canvas><div class="col map-side">${side}</div></div>
      <div class="nb-foot"><button data-a="close">Close</button></div></div>`;
    this.el.querySelectorAll<HTMLElement>('[data-a=close]').forEach((b) => b.addEventListener('click', () => this.close()));
    this.el.querySelector("[data-a=travel]")?.addEventListener('click', () => { if (this.selected) this.walk(this.selected); });
    this.el.querySelectorAll<HTMLElement>("[data-a=ride]").forEach((b) => b.addEventListener('click', () => { if (this.selected) void this.ride(this.selected, b.dataset.n ?? ''); }));
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
    const at = this.atPlace();
    const me = this.me();
    // Fit the known places and where you stand, with a margin; never zoom closer than ~120 km across.
    const xs = [...known.map((l) => l.x), me.x], ys = [...known.map((l) => l.y), me.y];
    let x0 = Math.min(...xs) - 40, x1 = Math.max(...xs) + 40;
    let y0 = Math.min(...ys) - 40, y1 = Math.max(...ys) + 40;
    if (x1 - x0 < 120) { const m = (x0 + x1) / 2; x0 = m - 60; x1 = m + 60; }
    if (y1 - y0 < 120) { const m = (y0 + y1) / 2; y0 = m - 60; y1 = m + 60; }
    const sx = W / (x1 - x0), sy = H / (y1 - y0), s = Math.min(sx, sy);
    const ox = (W - (x1 - x0) * s) / 2, oy = (H - (y1 - y0) * s) / 2;
    const P = (x: number, y: number) => ({ x: ox + (x - x0) * s, y: oy + (y - y0) * s });
    // Paper, and on it the land as the surveyors drew it: relief, the sea, the drowned ground.
    g.fillStyle = '#d9c9a3'; g.fillRect(0, 0, W, H);
    const img = mapImage();
    g.imageSmoothingEnabled = true;
    g.drawImage(img.canvas, 0, 0, img.width, img.height, ox - x0 * s, oy - y0 * s, img.width * KM_PER_PX * s, img.height * KM_PER_PX * s);
    g.fillStyle = 'rgba(217,201,163,0.42)'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(90,70,40,${0.03 + (i % 7) * 0.004})`; g.fillRect((i * 7919) % W, (i * 104729) % H, 2 + (i % 5), 1 + (i % 3)); }
    // While the map is open the picture is finished in earnest, a slice a tick, and redrawn as it grows.
    if (!img.done) { this.redraw = window.setTimeout(() => { this.redraw = undefined; img.step(40); this.draw(); }, 60); }
    // The river and the Line are drawn as the land is: everyone knows where they run.
    const km = (p: [number, number]) => P(p[0] / WORLD_SCALE, p[1] / WORLD_SCALE);
    const polyline = (pts: [number, number][]) => { g.beginPath(); pts.forEach((p, i) => { const q = km(p); if (i) g.lineTo(q.x, q.y); else g.moveTo(q.x, q.y); }); g.stroke(); };
    for (const w of ways()) {
      if (w.kind === 'river') { g.strokeStyle = 'rgba(70,100,110,.85)'; g.lineWidth = 2.2; g.setLineDash([]); polyline(w.pts); }
      else if (w.kind === 'rail') { g.strokeStyle = 'rgba(40,34,28,.7)'; g.lineWidth = 1.4; g.setLineDash([3, 2]); polyline(w.pts); }
    }
    g.setLineDash([]);
    // Regions (faint) and their names
    g.font = '600 12px "Barlow Condensed", sans-serif'; g.textAlign = 'center';
    for (const r of Object.values(REGIONS)) {
      const a = P(r.bounds[0], r.bounds[1]), b = P(r.bounds[2], r.bounds[3]);
      if (b.x < 0 || a.x > W || b.y < 0 || a.y > H) continue;
      g.fillStyle = 'rgba(80,60,30,.55)';
      g.fillText(r.name.toUpperCase(), Math.max(50, Math.min(W - 50, (a.x + b.x) / 2)), Math.max(16, Math.min(H - 8, a.y + 18)));
    }
    // Roads and tracks between known places, as they wander.
    for (const w of ways()) {
      if (!w.a || !w.b || !this.known(w.a) || !this.known(w.b)) continue;
      g.strokeStyle = 'rgba(70,50,25,.8)'; g.lineWidth = w.kind === 'road' ? 2 : 1.4; g.setLineDash(w.kind === 'road' ? [] : w.kind === 'track' ? [6, 4] : [2, 4]);
      polyline(w.pts);
    }
    // Routes without a way drawn (to the moving camp): a faint line.
    g.strokeStyle = 'rgba(70,50,25,.45)'; g.lineWidth = 1; g.setLineDash([2, 5]);
    for (const r of WORLD_MAP.routes) {
      if ((r.a !== 'wheel' && r.b !== 'wheel') || !this.known(r.a) || !this.known(r.b)) continue;
      const a = WORLD_MAP.locations[r.a], b = WORLD_MAP.locations[r.b];
      const pa = P(a.x, a.y), pb = P(b.x, b.y);
      g.beginPath(); g.moveTo(pa.x, pa.y); g.lineTo(pb.x, pb.y); g.stroke();
    }
    g.setLineDash([]);
    // Places
    this.pts.clear();
    g.font = '600 14px "Barlow Condensed", sans-serif';
    for (const l of known) {
      const p = P(l.x, l.y);
      this.pts.set(l.id, p);
      const major = l.kind === 'major';
      g.fillStyle = l.id === this.selected ? '#8a2a1a' : '#2a1d10';
      g.beginPath(); g.arc(p.x, p.y, major ? 5 : 3.5, 0, Math.PI * 2); g.fill();
      if (l.kind === 'landmark') { g.strokeStyle = '#2a1d10'; g.lineWidth = 1; g.beginPath(); g.arc(p.x, p.y, 7, 0, Math.PI * 2); g.stroke(); }
      if (l.id === at) { g.strokeStyle = '#8a2a1a'; g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, 10, 0, Math.PI * 2); g.stroke(); }
      g.fillStyle = '#2a1d10'; g.textAlign = 'left';
      g.fillText(l.name, p.x + 9, p.y + 5);
    }
    // You: where you stand, to the kilometre.
    const mp = P(me.x, me.y);
    g.strokeStyle = '#8a2a1a'; g.lineWidth = 2; g.beginPath(); g.arc(mp.x, mp.y, 6, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#8a2a1a'; g.beginPath(); g.arc(mp.x, mp.y, 2.2, 0, Math.PI * 2); g.fill();
    // Scale bar: 20 km
    const bar = 20 * s;
    g.strokeStyle = '#2a1d10'; g.lineWidth = 2; g.beginPath(); g.moveTo(16, H - 14); g.lineTo(16 + bar, H - 14); g.stroke();
    g.font = '11px "IBM Plex Mono", monospace'; g.textAlign = 'left'; g.fillText('20 km', 16, H - 18);
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
