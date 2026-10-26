import type { Game } from '../game';
import { dayOf } from '../core/state';
import { itemDef } from '../inventory/items';
import { itemValue } from '../inventory/inventory';
import { buyPrice, dealTotals, executeDeal, merchantBuys, merchantState, saturation, sellPrice, type Deal, type PriceContext } from '../inventory/barter';
import { effectiveSkill } from '../stats/checks';
import { standing } from '../world/frontier';
import { factionDefs, factionPriceMul } from '../world/factions';
import type { NpcRuntime } from '../npc/spawn';
import { itemSummary } from './notebook';

/**
 * Barter screen: their stock on the left with what you'd pay, your pack on the right with what they'd
 * pay. Tap items into the deal; the balance shows who owes whom; Deal closes it. Prices explain
 * themselves (Barter skill, standing, membership, saturation) so the economy is readable.
 */
export class BarterUi {
  private el?: HTMLElement;
  private npc?: NpcRuntime;
  private deal: Deal = { buy: [], sell: [] };

  constructor(private game: Game) {
    game.on('openBarter', ({ npc }) => this.open(npc));
    window.addEventListener('keydown', (e) => { if (e.code === 'Escape' && this.el) { e.stopImmediatePropagation(); this.close(); } }, true);
  }

  private ctx(): PriceContext {
    const g = this.game.state, def = this.npc!.def;
    const place = def.settlement ?? this.game.loc?.map.settlement;
    return {
      barter: effectiveSkill(g.pc.sheet, g.pc.inventory, 'barter'),
      standing: place ? standing(g, place) : 0,
      factionMul: def.merchant?.faction ? factionPriceMul(g, factionDefs(), def.merchant.faction) : 1,
      markup: def.merchant?.markup ?? 1.5,
    };
  }

  open(npc: NpcRuntime): void {
    if (!npc.def.merchant) return;
    this.close();
    this.npc = npc;
    this.deal = { buy: [], sell: [] };
    merchantState((this.game.state.merchants ??= {}), npc.id, npc.def.merchant, dayOf(this.game.state.minutes));
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
    this.npc = undefined;
    this.game.paused = false;
  }

  private qtyIn(list: { index: number; qty: number }[], index: number): number { return list.find((d) => d.index === index)?.qty ?? 0; }
  private bump(list: { index: number; qty: number }[], index: number, max: number, by: number): void {
    const cur = list.find((d) => d.index === index);
    const q = Math.max(0, Math.min(max, (cur?.qty ?? 0) + by));
    if (cur) { if (q === 0) list.splice(list.indexOf(cur), 1); else cur.qty = q; }
    else if (q > 0) list.push({ index, qty: q });
  }

  private render(): void {
    if (!this.el || !this.npc) return;
    const g = this.game.state, def = this.npc.def, mdef = def.merchant!, ms = g.merchants![this.npc.id], c = this.ctx(), day = dayOf(g.minutes);
    const t = dealTotals(g.pc.inventory, ms, this.deal, c, day);
    const rows = (items: typeof ms.inv.items, side: 'buy' | 'sell') => items.map((it, i) => {
      const d = itemDef(it.def), unit = itemValue({ ...it, qty: 1 });
      const q = this.qtyIn(this.deal[side], i);
      const ok = side === 'buy' || merchantBuys(mdef, it.def);
      const price = side === 'buy' ? buyPrice(unit, c) : sellPrice(unit, c, saturation(ms, it.def, day));
      return `<div class="item ${q ? 'sel' : ''} ${ok ? '' : 'dim'}" data-s="${side}" data-i="${i}" title="${esc(itemSummary(it))}">
        <span>${esc(d.name)}${it.qty > 1 ? ` ×${it.qty}` : ''}${q ? ` <b>(${q})</b>` : ''}</span>
        <span class="w">${ok ? `${price}T` : 'won\'t buy'}</span>
        <span class="w">${ok ? `<button data-b="-1">−</button><button data-b="1">+</button>` : ''}</span></div>`;
    }).join('') || '<div class="desc">Nothing.</div>';
    const notes = [
      c.barter ? `Barter ${c.barter}` : '', c.standing ? `${c.standing > 0 ? 'liked' : 'disliked'} here` : '', c.factionMul < 1 ? 'member\'s rate' : '',
    ].filter(Boolean).join(' · ');
    this.el.innerHTML = `<div class="nb barter">
      <div class="nb-top"><b>${esc(def.name)}</b> <span class="dim">${esc(notes)}</span><button class="x" data-a="close" aria-label="Close">✕</button></div>
      <div class="nb-body"><div class="col a"><h4>Their stock · ${ms.cash} Tolls on hand</h4>${rows(ms.inv.items, 'buy')}</div>
      <div class="col b"><h4>Your pack · ${g.pc.inventory.tolls} Tolls</h4>${rows(g.pc.inventory.items, 'sell')}</div></div>
      <div class="nb-foot"><span>${t.net > 0 ? `You pay <b>${t.net}</b> Tolls` : t.net < 0 ? `They pay you <b>${-t.net}</b> Tolls` : 'Even'}</span>
        <button data-a="clear" ${this.deal.buy.length + this.deal.sell.length ? '' : 'disabled'}>Clear</button>
        <button data-a="deal" ${this.deal.buy.length + this.deal.sell.length ? '' : 'disabled'}>Deal</button></div></div>`;
    this.el.querySelector('[data-a=close]')!.addEventListener('click', () => this.close());
    this.el.querySelector('[data-a=clear]')!.addEventListener('click', () => { this.deal = { buy: [], sell: [] }; this.render(); });
    this.el.querySelector('[data-a=deal]')!.addEventListener('click', () => {
      const r = executeDeal(g.pc.inventory, ms, mdef, this.deal, c, day);
      this.game.emit('message', { text: r.ok ? 'Done.' : r.reason! });
      if (r.ok) this.deal = { buy: [], sell: [] };
      this.render();
    });
    this.el.querySelectorAll<HTMLElement>('.item[data-s]').forEach((row) => row.addEventListener('click', (e) => {
      const by = Number((e.target as HTMLElement).dataset.b ?? 1);
      const side = row.dataset.s as 'buy' | 'sell', i = Number(row.dataset.i);
      const list = side === 'buy' ? ms.inv.items : g.pc.inventory.items;
      if (side === 'sell' && !merchantBuys(mdef, list[i].def)) return;
      this.bump(this.deal[side], i, list[i].qty, by);
      this.render();
    }));
  }
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
