import { itemIcon } from './icons';
import type { Game } from '../game';
import { addItem, itemValue, takeAt, type Inventory } from '../inventory/inventory';
import { itemDef } from '../inventory/items';

/** Loot / container transfer between the player's pack and another inventory. */
export class Transfer {
  private el?: HTMLElement;

  constructor(private game: Game) {
    game.on('openTransfer', ({ inv, name }) => this.open(inv, name));
    window.addEventListener('keydown', (e) => { if (e.code === 'Escape' && this.el) { e.stopImmediatePropagation(); this.close(); } }, true);
  }

  open(theirs: Inventory, name: string): void {
    this.close();
    this.el = document.createElement('div');
    this.el.className = 'wl';
    this.el.addEventListener('click', (e) => { if (e.target === this.el) this.close(); });
    document.body.appendChild(this.el);
    this.game.paused = true;
    this.render(theirs, name);
  }

  close(): void {
    if (!this.el) return;
    this.el.remove();
    this.el = undefined;
    this.game.paused = false;
    this.game.groundPilesChanged();
  }

  private render(theirs: Inventory, name: string): void {
    if (!this.el) return;
    const mine = this.game.state.pc.inventory;
    this.el.innerHTML = `<div class="dev-frame crt"><div class="wl-top"><span class="brand">${esc(name.toUpperCase())}</span>
      <button class="x" data-a="all">TAKE ALL</button><button class="x" data-a="close">✕</button></div>
      <div class="wl-body"><div class="col a"><h4>${esc(name)}${theirs.tolls ? ` · ${theirs.tolls} Tolls` : ''}</h4></div><div class="col b"><h4>Your pack · ${mine.tolls} Tolls</h4></div></div></div>`;
    this.el.querySelector('[data-a=close]')!.addEventListener('click', () => this.close());
    this.el.querySelector('[data-a=all]')!.addEventListener('click', () => {
      while (theirs.items.length) addItem(mine, takeAt(theirs, 0)!);
      mine.tolls += theirs.tolls; theirs.tolls = 0;
      this.close();
    });
    const list = (col: HTMLElement, from: Inventory, to: Inventory, verb: string) => {
      if (from.tolls && from !== mine) {
        const row = document.createElement('div');
        row.className = 'item';
        row.innerHTML = `<span>${from.tolls} Tolls</span><span></span><span class="w">${verb}</span>`;
        row.onclick = () => { to.tolls += from.tolls; from.tolls = 0; this.render(theirs, name); };
        col.append(row);
      }
      from.items.forEach((it, i) => {
        const d = itemDef(it.def);
        const row = document.createElement('div');
        row.className = 'item';
        row.innerHTML = `<span><img class="ico" src="${itemIcon(d)}" alt="">${esc(d.name)}${it.qty > 1 ? ` ×${it.qty}` : ''}</span><span class="w">${itemValue(it)}T</span><span class="w">${verb}</span>`;
        row.onclick = () => { addItem(to, takeAt(from, i)!); this.render(theirs, name); };
        col.append(row);
      });
      if (!from.items.length && !(from.tolls && from !== mine)) col.insertAdjacentHTML('beforeend', '<div class="desc">Nothing.</div>');
    };
    list(this.el.querySelector('.col.a') as HTMLElement, theirs, mine, 'take ›');
    list(this.el.querySelector('.col.b') as HTMLElement, mine, theirs, '‹ put');
  }
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
