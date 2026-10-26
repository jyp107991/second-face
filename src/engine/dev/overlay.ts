import { MAPS } from '../../content';
import { cutawayUniforms } from '../assets/materials';
import { clockString } from '../core/state';
import type { Game } from '../game';
import type { QualityLevel } from '../render/quality';
import { addItem, equip, makeItem, reload } from '../inventory/inventory';
import { derived } from '../stats/sheet';

/**
 * Developer overlay: stats, teleport, location jump, time skip, flags, quality.
 * Toggle with the backquote key or the DEV button. Enabled in dev builds or with ?dev in the URL.
 */
export class DevOverlay {
  private el: HTMLElement;
  private stats: HTMLElement;
  private teleportMode = false;
  private visible = false;

  constructor(private game: Game) {
    const toggle = document.createElement('button');
    toggle.className = 'btn dev-toggle';
    toggle.textContent = 'DEV';
    toggle.style.cssText = 'position:fixed;left:calc(10px + var(--safe-l));bottom:calc(10px + var(--safe-b));z-index:41;min-width:40px;min-height:40px;font-size:11px';
    toggle.onclick = () => this.toggle();
    document.body.appendChild(toggle);

    this.el = document.createElement('div');
    this.el.className = 'dev crt';
    this.el.style.display = 'none';
    const opts = Object.keys(MAPS).map((id) => `<option value="${id}">${id}</option>`).join('');
    this.el.innerHTML = `
      <h3>DEV CONSOLE</h3>
      <pre class="stats"></pre>
      <div class="row"><select class="loc">${opts}</select><button data-a="go">Go</button><button data-a="tp">Teleport (tap)</button></div>
      <div class="row">Time: <button data-a="t1">+1h</button><button data-a="t6">+6h</button><button data-a="t24">+1d</button>
        <button data-a="fast">x60</button></div>
      <div class="row">Flag: <input class="fk" placeholder="key" size="10"><input class="fv" placeholder="value" size="6"><button data-a="flag">Set</button></div>
      <div class="row">Quality: <select class="q"><option>low</option><option>medium</option><option>high</option></select>
        <button data-a="cut">Cutaway</button></div>
      <div class="row">Combat: <button data-a="raiders">Spawn raiders</button><button data-a="heal">Heal</button><button data-a="guns">Give guns</button></div>`;
    document.body.appendChild(this.el);
    this.stats = this.el.querySelector('.stats')!;
    (this.el.querySelector('.q') as HTMLSelectElement).value = game.quality;
    (this.el.querySelector('.q') as HTMLSelectElement).onchange = (e) => game.applyQuality((e.target as HTMLSelectElement).value as QualityLevel);
    this.el.addEventListener('click', (e) => this.onClick((e.target as HTMLElement).dataset.a));
    window.addEventListener('keydown', (e) => { if (e.code === 'Backquote') this.toggle(); });

    game.input.on('tap', ({ x, y }) => {
      if (!this.teleportMode || !game.player) return;
      const t = game.pickTile(x, y);
      if (t && game.loc?.grid.passable(t.x, t.y)) {
        game.player.place(t.x, t.y);
        game.state.player.x = t.x; game.state.player.y = t.y;
      }
      this.teleportMode = false;
    });

    let acc = 0;
    game.on('tick', ({ dt }) => {
      acc += dt;
      if (!this.visible || acc < 0.5) return;
      acc = 0;
      const info = game.renderer.info;
      const p = game.player;
      const pf = game.perf();
      this.stats.textContent =
        `FPS ${game.fps.toFixed(0)} (${pf.frameAvgMs}ms avg, ${pf.frameP95Ms}ms p95)  draws ${info.render.calls}  tris ${(info.render.triangles / 1000).toFixed(1)}k\n` +
        `geo ${info.memory.geometries} (${pf.geometryMB}MB)  tex ${info.memory.textures} (~${pf.textureMB}MB)  heap ${pf.heapMB}MB  load ${pf.loadMs}ms  q=${game.quality}\n` +
        `loc ${game.state.locationId}  tile ${p?.tx},${p?.ty}\n` +
        `${clockString(game.state.minutes)}  x${game.timeScale}\n` +
        `flags ${JSON.stringify(game.state.flags)}`;
    });
  }

  private toggle(): void {
    this.visible = !this.visible;
    this.el.style.display = this.visible ? 'block' : 'none';
  }

  private onClick(a?: string): void {
    const g = this.game;
    switch (a) {
      case 'go': void g.loadLocation((this.el.querySelector('.loc') as HTMLSelectElement).value); break;
      case 'tp': this.teleportMode = true; g.emit('message', { text: 'Tap a tile to teleport' }); break;
      case 't1': g.state.minutes += 60; break;
      case 't6': g.state.minutes += 360; break;
      case 't24': g.state.minutes += 1440; break;
      case 'fast': g.timeScale = g.timeScale === 1 ? 60 : 1; break;
      case 'raiders': {
        const p = g.player!;
        const spots = [[6, -4], [7, -2], [5, -6]];
        ['dev_raider_boss', 'dev_raider', 'dev_raider_knife'].forEach((def, i) => {
          for (let r = 0; r < 6; r++) {
            const x = p.tx + spots[i][0] + r, y = p.ty + spots[i][1];
            if (g.loc?.grid.passable(x, y)) { g.spawn({ def, x, y, id: `${def}_${Date.now() % 10000}` }); break; }
          }
        });
        break;
      }
      case 'heal': g.state.pc.sheet.hp = derived(g.state.pc.sheet).maxHp; g.state.pc.sheet.crippled = {}; break;
      case 'guns': {
        const inv = g.state.pc.inventory;
        for (const [id, n] of [['w_pistol9', 1], ['a_9mm', 60], ['w_smg9', 1], ['w_frag', 3], ['c_knitkit', 5]] as const) addItem(inv, makeItem(id, n));
        equip(inv, inv.items.findIndex((i) => i.def === 'w_pistol9'), 'primary');
        reload(inv, 'primary');
        g.emit('message', { text: 'Pistol equipped + supplies' });
        break;
      }
      case 'cut': cutawayUniforms.uCutEnabled.value = 1 - cutawayUniforms.uCutEnabled.value; break;
      case 'flag': {
        const k = (this.el.querySelector('.fk') as HTMLInputElement).value.trim();
        const raw = (this.el.querySelector('.fv') as HTMLInputElement).value.trim();
        if (!k) return;
        const v = raw === 'true' ? true : raw === 'false' ? false : isNaN(Number(raw)) ? raw : Number(raw);
        g.state.flags[k] = v;
        break;
      }
    }
  }
}
