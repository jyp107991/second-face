import { partName, type Unit } from '../combat/encounter';
import { weaponOf } from '../combat/rules';
import type { Game } from '../game';
import { activeWeapon, countItem } from '../inventory/inventory';
import { itemDef } from '../inventory/items';
import { BODY_PARTS, derived, type BodyPart } from '../stats/sheet';

const CONDITION = (frac: number) => frac > 0.9 ? 'unhurt' : frac > 0.6 ? 'wounded' : frac > 0.3 ? 'badly wounded' : frac > 0 ? 'near death' : 'dead';

/** Turn-based combat interface. */
export class CombatHud {
  private el: HTMLElement;
  private logLines: string[] = [];
  private aimOpen = false;
  onLoad?: () => void;
  onTitle?: () => void;

  constructor(private game: Game) {
    this.el = document.createElement('div');
    this.el.className = 'chud';
    this.el.innerHTML = `
      <div class="banner"></div>
      <div class="target crt"><div class="tn"><b class="nm"></b><span class="cond"></span></div>
        <div class="row tacts"></div><div class="aim"></div></div>
      <div class="log"></div>
      <div class="bar">
        <div class="vit"><div class="hpt"></div><div class="hpbar"><i></i></div><div class="pips"></div></div>
        <div class="wpn"></div>
        <div class="acts">
          <button data-a="swap" title="Swap weapon">⇄</button>
          <button data-a="reload" title="Reload">⟳</button>
          <button data-a="heal" title="Use Knit-Kit">✚</button>
          <button class="end" data-a="end">END TURN</button>
        </div>
      </div>`;
    document.body.appendChild(this.el);
    this.el.querySelector('.acts')!.addEventListener('click', (e) => this.onAct((e.target as HTMLElement).closest('button')?.dataset.a));
    const enc = game.encounter;
    enc.on('start', () => { this.logLines = []; this.el.classList.add('on'); document.body.classList.add('in-combat'); this.render(); });
    enc.on('turn', ({ unit }) => { this.aimOpen = false; this.render(); this.banner(unit); });
    enc.on('changed', () => this.render());
    enc.on('log', ({ text }) => { this.logLines.push(text); this.logLines = this.logLines.slice(-6); this.renderLog(); });
    enc.on('end', ({ outcome }) => {
      this.el.classList.remove('on');
      document.body.classList.remove('in-combat');
      if (outcome !== 'defeat') game.emit('message', { text: outcome === 'victory' ? 'Combat over.' : outcome === 'fled' ? 'They ran.' : 'Combat ended.' });
    });
    game.on('gameOver', () => this.gameOver());
  }

  private banner(u: Unit): void {
    const b = this.el.querySelector('.banner') as HTMLElement;
    b.textContent = u.c.isPlayer ? 'YOUR TURN' : `${u.c.name.toUpperCase()}`;
    b.classList.toggle('you', !!u.c.isPlayer);
  }

  private onAct(a?: string): void {
    const enc = this.game.encounter, p = enc.player;
    if (!p || !enc.isPlayerTurn) return;
    if (a === 'end') enc.endTurn();
    if (a === 'reload') enc.reloadUnit(p);
    if (a === 'swap') enc.swapWeapon(p);
    if (a === 'heal') enc.useItem(p, 'c_knitkit');
  }

  private renderLog(): void {
    (this.el.querySelector('.log') as HTMLElement).innerHTML = this.logLines.map((l) => `<div>${escape(l)}</div>`).join('');
  }

  render(): void {
    const enc = this.game.encounter, p = enc.player;
    if (!p) return;
    const s = p.c.sheet, max = derived(s).maxHp;
    (this.el.querySelector('.hpt') as HTMLElement).textContent = `HP ${s.hp}/${max}   AP ${p.c.ap}`;
    (this.el.querySelector('.hpbar i') as HTMLElement).style.width = `${Math.max(0, (s.hp / max) * 100)}%`;
    const maxAp = Math.max(p.c.ap, derived(s).ap);
    const t = enc.target && enc.alive(enc.target) ? enc.target : undefined;
    const cost = t ? enc.preview(p, t).ap : 0;
    (this.el.querySelector('.pips') as HTMLElement).innerHTML = Array.from({ length: maxAp }, (_, i) =>
      `<i class="${i < p.c.ap ? (t && i >= p.c.ap - cost && enc.isPlayerTurn ? 'cost' : 'on') : ''}"></i>`).join('');
    const w = activeWeapon(p.c.inv);
    const wd = weaponOf(p.c).def;
    const ammoLine = wd.magazine && w ? `${w.loaded ?? 0}/${wd.magazine}  (${p.c.inv.items.filter((i) => itemDef(i.def).ammo?.type === wd.ammo).reduce((n, i) => n + i.qty, 0)} spare)` : wd.consumable && w ? `x${w.qty}` : '';
    (this.el.querySelector('.wpn') as HTMLElement).innerHTML = `<b>${w ? itemDef(w.def).name : 'Fists'}</b> ${w?.cond !== undefined ? `<span style="opacity:.6">${Math.round(w.cond * 100)}%</span>` : ''}<br>${wd.dmg[0]}–${wd.dmg[1]} dmg · ${wd.ap} AP ${ammoLine ? '· ' + ammoLine : ''}`;
    const heal = this.el.querySelector('[data-a=heal]') as HTMLButtonElement;
    heal.textContent = `✚${countItem(p.c.inv, 'c_knitkit')}`;
    const mine = enc.isPlayerTurn;
    this.el.querySelectorAll('.acts button').forEach((b) => ((b as HTMLButtonElement).disabled = !mine));
    if (mine && !countItem(p.c.inv, 'c_knitkit')) heal.disabled = true;
    this.renderTarget(p, t);
  }

  private renderTarget(p: Unit, t?: Unit): void {
    const enc = this.game.encounter;
    const box = this.el.querySelector('.target') as HTMLElement;
    box.classList.toggle('on', !!t);
    if (!t) return;
    const max = derived(t.c.sheet).maxHp;
    (box.querySelector('.nm') as HTMLElement).textContent = t.c.name;
    (box.querySelector('.cond') as HTMLElement).textContent = CONDITION(t.c.sheet.hp / max);
    const acts = box.querySelector('.tacts') as HTMLElement;
    acts.innerHTML = '';
    const mk = (label: string, fn: () => void, enabled: boolean) => {
      const b = document.createElement('button'); b.textContent = label; b.disabled = !enabled || !enc.isPlayerTurn; b.onclick = fn; acts.append(b);
    };
    const n = enc.preview(p, t);
    mk(n.ok ? `Attack ${n.chance}% · ${n.ap}AP` : n.reason ?? 'Attack', () => void enc.attack(p, t), n.ok);
    const aimPv = enc.preview(p, t, { aimed: 'torso' });
    mk(`Aim ▸ ${aimPv.ap}AP`, () => { this.aimOpen = !this.aimOpen; this.render(); }, aimPv.ok || aimPv.reason?.startsWith('Needs') === false);
    const wd = weaponOf(p.c).def;
    if (wd.burst) {
      const b = enc.preview(p, t, { burst: true });
      mk(b.ok ? `Burst ${b.chance}% · ${b.ap}AP` : b.reason ?? 'Burst', () => void enc.attack(p, t, { burst: true }), b.ok);
    }
    const aim = box.querySelector('.aim') as HTMLElement;
    aim.classList.toggle('on', this.aimOpen);
    if (this.aimOpen) {
      aim.innerHTML = '';
      for (const part of BODY_PARTS as readonly BodyPart[]) {
        const pv = enc.preview(p, t, { aimed: part });
        const b = document.createElement('button');
        b.textContent = `${partName(part)} ${pv.ok ? pv.chance + '%' : '–'}`;
        b.disabled = !pv.ok || !enc.isPlayerTurn;
        b.onclick = () => { this.aimOpen = false; void enc.attack(p, t, { aimed: part }); };
        aim.append(b);
      }
    }
  }

  private gameOver(): void {
    const d = document.createElement('div');
    d.className = 'gameover';
    d.innerHTML = `<div class="box crt"><h1>YOU DIED</h1><p>The wasteland keeps what it takes.</p>
      <div class="row" style="display:flex;gap:8px;justify-content:center"><button class="btn" data-a="load">Load last save</button><button class="btn" data-a="title">Title</button></div></div>`;
    d.addEventListener('click', (e) => {
      const a = (e.target as HTMLElement).dataset.a;
      if (!a) return;
      d.remove();
      this.el.classList.remove('on');
      document.body.classList.remove('in-combat');
      if (a === 'load') this.onLoad?.();
      else this.onTitle?.();
    });
    document.body.appendChild(d);
  }
}

function escape(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
}
