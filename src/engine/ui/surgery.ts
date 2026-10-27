import type { Game } from '../game';
import { dayOf } from '../core/state';
import type { NpcRuntime } from '../npc/spawn';
import { CHROME_SLOTS, chromeDef, driftBaseline, type ChromeDef, type ChromeSlot } from '../stats/chrome';
import { attrs } from '../stats/sheet';
import { bodyLines, performRemoval, performRepair, performSurgery, repairFee, removeFee, surgeonMedicine, surgeryOffers, type SurgeryOffer } from '../world/surgery';
import { itemIcon } from './icons';
import { itemDef } from '../inventory/items';

const SLOT_NAMES: Record<ChromeSlot, string> = { eyes: 'Eyes', neural: 'Neural', armL: 'Left arm', armR: 'Right arm', legs: 'Legs', spine: 'Spine', skin: 'Skin', organs: 'Organs' };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/**
 * The surgeon's table: your body on the left (what is fitted, its condition, upkeep; repair or take out), what could
 * go in on the right (the surgeon's own pieces to buy and fit, boxed pieces from your pack to fit), each with its
 * price, the fee, the risk for you, the hours, the Drift it adds and what it gives. Fit rolls the dice.
 */
export class SurgeryUi {
  private el?: HTMLElement;
  private npc?: NpcRuntime;
  private note = '';

  constructor(private game: Game) {
    game.on('openSurgery', ({ npc }) => this.open(npc));
    window.addEventListener('keydown', (e) => { if (e.code === 'Escape' && this.el) { e.stopImmediatePropagation(); this.close(); } }, true);
  }

  open(npc: NpcRuntime): void {
    if (!npc.def.surgeon) return;
    this.close();
    this.npc = npc;
    this.note = '';
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

  private gives(def: ChromeDef): string {
    const bits: string[] = [];
    for (const m of def.mods ?? []) {
      const t = m.target.replace(/^(skill|attr|derived):/, '').replace(/_/g, ' ');
      if ('add' in m && typeof m.add === 'number') bits.push(`${t} ${m.add > 0 ? '+' : ''}${m.add}`);
      else if ('mul' in m && typeof m.mul === 'number') bits.push(`${t} ×${m.mul}`);
    }
    for (const a of def.abilities ?? []) bits.push(a.replace(/^chrome_/, '').replace(/_/g, ' '));
    return bits.join(' · ');
  }

  private render(): void {
    if (!this.el || !this.npc) return;
    const g = this.game.state, def = this.npc.def, a = attrs(g.pc.sheet), day = dayOf(g.minutes);
    const med = surgeonMedicine(def);
    const body = bodyLines(g);
    const drift = driftBaseline(g.pc.sheet, a.grit);
    const slotRows = CHROME_SLOTS.map((slot) => {
      const b = body.find((x) => x.slot === slot);
      if (!b) return `<div class="item dim"><span><b>${SLOT_NAMES[slot]}</b> <span class="dim">— nothing fitted</span></span><span class="w"></span><span class="w"></span></div>`;
      const cond = Math.round(b.condition * 100);
      const upkeep = b.def.upkeep ? ` · ${itemDef(b.def.upkeep.item).name} ${b.upkeepDue !== undefined ? (b.upkeepDue <= day ? 'due' : `in ${b.upkeepDue - day} d`) : ''}` : '';
      return `<div class="item"><span><b>${SLOT_NAMES[slot]}</b> ${esc(b.def.name)} <span class="dim">${b.def.grade} · ${cond}%${upkeep}</span></span>
        <span class="w">${cond < 100 ? `<button data-rep="${slot}" title="Repair">Repair ${repairFee(def, b.condition)}T</button>` : ''}</span>
        <span class="w"><button data-rem="${slot}" title="Take it out">Out ${removeFee(def)}T</button></span></div>`;
    }).join('');
    const offers = surgeryOffers(g, this.npc.id, def);
    const offerRows = offers.map((o, i) => {
      const risk = Math.round(o.risk * 100);
      const boxed = itemDef(`ci_${o.def.id}`);
      return `<div class="item" data-o="${i}">
        <span><img class="ico" src="${itemIcon(boxed)}" alt=""><b>${esc(o.def.name)}</b> <span class="dim">${o.def.grade} · ${SLOT_NAMES[o.def.slot]}${o.replaces ? ` · replaces ${esc(o.replaces.name)}` : ''} · ${o.source === 'stock' ? 'theirs' : 'yours'}</span>
          <div class="desc">${esc(o.def.desc)}</div>
          <div class="desc">${esc(this.gives(o.def))}${o.def.upkeep ? ` · needs ${esc(itemDef(o.def.upkeep.item).name)} every ${o.def.upkeep.everyDays} d` : ''} · Drift +${o.def.drift}</div>
          <div class="desc">${o.hours} h on the table · risk <b>${risk}%</b>${o.source === 'stock' ? ` · piece ${o.price}T` : ''} · fee ${o.fee}T</div></span>
        <span class="w"><b>${o.total}T</b></span>
        <span class="w"><button data-fit="${i}" ${g.pc.inventory.tolls < o.total ? 'disabled' : ''}>Fit</button></span></div>`;
    }).join('') || '<div class="desc">Nothing on the table. Bring a boxed piece, or ask what they have.</div>';
    this.el.innerHTML = `<div class="nb barter surgery">
      <div class="nb-top"><b>${esc(def.name)}</b> <span class="dim">Medicine ${med} · your Grit ${a.grit} · Drift ${Math.round(drift)}</span><button class="x" data-a="close" aria-label="Close">✕</button></div>
      <div class="nb-body"><div class="col a"><h4>Your body</h4>${slotRows}${this.note ? `<div class="desc note">${esc(this.note)}</div>` : ''}</div>
      <div class="col b"><h4>On the table · ${g.pc.inventory.tolls} Tolls</h4>${offerRows}</div></div>
      <div class="nb-foot"><span class="dim">Risk: the body may refuse a piece (fee spent, piece kept) or take it badly (it goes in at 60%). Grit helps; a better surgeon helps more.</span>
        <button data-a="close">Done</button></div></div>`;
    this.el.querySelectorAll('[data-a=close]').forEach((b) => b.addEventListener('click', () => this.close()));
    this.el.querySelectorAll<HTMLElement>('[data-fit]').forEach((b) => b.addEventListener('click', () => {
      const o: SurgeryOffer | undefined = offers[Number(b.dataset.fit)];
      if (!o) return;
      const r = performSurgery(g, this.npc!.id, def, o, day, this.game.rng.next());
      if (r.hours) g.minutes += r.hours * 60;
      this.note = r.text;
      this.game.emit('message', { text: r.outcome === 'clean' ? `${o.def.name}: fitted.` : r.outcome === 'complication' ? `${o.def.name}: fitted, with a complication.` : r.outcome === 'rejected' ? `${o.def.name}: rejected.` : r.text });
      if (r.outcome === 'clean' || r.outcome === 'complication') this.game.emit('journal', { questId: 'chrome', title: 'Chrome', line: `${def.name} fitted the ${o.def.name}${r.outcome === 'complication' ? ', not cleanly' : ''}.` });
      this.render();
    }));
    this.el.querySelectorAll<HTMLElement>('[data-rep]').forEach((b) => b.addEventListener('click', () => {
      const r = performRepair(g, def, b.dataset.rep as ChromeSlot);
      this.note = r.text; if (r.ok) g.minutes += 60;
      this.render();
    }));
    this.el.querySelectorAll<HTMLElement>('[data-rem]').forEach((b) => b.addEventListener('click', () => {
      const r = performRemoval(g, def, b.dataset.rem as ChromeSlot);
      this.note = r.text; if (r.ok) g.minutes += 120;
      this.render();
    }));
    void chromeDef;
  }
}
