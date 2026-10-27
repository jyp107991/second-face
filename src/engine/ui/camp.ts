import { LETTERS, NPCS } from '../../content';
import type { Game } from '../game';
import { dayOf } from '../core/state';
import { itemDef } from '../inventory/items';
import { EQUIP_SLOTS, addItem, makeItem, removeItem, repair, takeAt } from '../inventory/inventory';
import { derived } from '../stats/sheet';
import { availableLetters, sendLetter } from '../world/letters';
import { hunt, trapYield } from '../world/hunting';
import { countItem } from '../inventory/inventory';

/**
 * Camp (DESIGN §2f): rest, talk to companions, cook, mend, write letters. Resting passes time and heals;
 * it costs water and food, and the world keeps moving while you sleep.
 */
export class CampUi {
  private el?: HTMLElement;
  private view: 'main' | 'write' = 'main';

  constructor(private game: Game) {
    game.on('openCamp', () => this.open());
    window.addEventListener('keydown', (e) => { if (e.code === 'Escape' && this.el) { e.stopImmediatePropagation(); this.close(); } }, true);
  }

  open(): void {
    if (this.el || this.game.encounter.active) return;
    this.el = document.createElement('div');
    this.el.className = 'wl';
    this.el.addEventListener('click', (e) => { if (e.target === this.el) this.close(); });
    document.body.appendChild(this.el);
    this.game.paused = true;
    this.game.state.flags.at_camp = true;
    this.view = 'main';
    this.render();
  }

  close(): void {
    this.el?.remove();
    this.el = undefined;
    this.game.state.flags.at_camp = false;
    this.game.paused = false;
  }

  /** Hours of rest: heal, eat and drink, let the world move. */
  private rest(hours: number): void {
    const g = this.game.state, pc = g.pc, d = derived(pc.sheet);
    const water = removeItem(pc.inventory, 'c_water', 1) || removeItem(pc.inventory, 'c_dirtywater', 1);
    const foodIdx = pc.inventory.items.findIndex((i) => itemDef(i.def).consumable?.effects.some((e) => e.kind === 'food'));
    const food = hours >= 6 && foodIdx >= 0 ? (takeAt(pc.inventory, foodIdx, 1), true) : hours < 6;
    const k = (water ? 1 : 0.5) * (food ? 1 : 0.5);
    const heal = Math.round(d.healRate * hours * k);
    pc.sheet.hp = Math.min(d.maxHp, pc.sheet.hp + heal);
    for (const id of g.world.party) {
      const c = g.companions?.[id];
      if (c) c.sheet.hp = Math.min(derived(c.sheet).maxHp, c.sheet.hp + Math.round(derived(c.sheet).healRate * hours * k));
    }
    g.minutes += hours * 60;
    this.game.emit('message', { text: `You rest ${hours} hours${heal ? ` and recover ${heal} health` : ''}.${water ? '' : ' No water — a poor sleep.'}${hours >= 6 && !food ? ' Nothing to eat.' : ''}` });
    this.game.quests.update();
    this.render();
  }

  private render(): void {
    if (!this.el) return;
    const g = this.game, s = g.state, pc = s.pc, d = derived(pc.sheet);
    const companions = s.world.party.map((id) => g.npcs.get(id)).filter((n): n is NonNullable<typeof n> => !!n && !!n.def.dialogue);
    const cookable = pc.inventory.items.filter((i) => itemDef(i.def).cookTo);
    const kits = pc.inventory.items.filter((i) => i.def === 't_repair').reduce((t, i) => t + i.qty, 0);
    const worn = EQUIP_SLOTS.map((sl) => pc.inventory.equipped[sl]).filter((it) => it && it.cond !== undefined && it.cond < 1);
    const letters = availableLetters(s, LETTERS);
    const atTown = !!g.loc?.map.settlement;
    const until = 24 - ((s.minutes / 60) % 24) + 6;
    const abundance = g.loc?.map.hunting ?? 0;
    const mapId = g.loc?.map.id ?? '';
    const line = s.world.traps?.[mapId];
    const trapParts = countItem(pc.inventory, 'j_wiring') >= 1 && countItem(pc.inventory, 'j_scrap') >= 1;
    const huntBlock = abundance > 0
      ? `<div class="acts"><button data-a="hunt">Hunt (three hours)</button>${line ? '<button data-a="traps-check">Check the traps</button>' : trapParts ? '<button data-a="traps-set">Set traps (a wire, a scrap)</button>' : ''}</div><p class="dim">${abundance >= 0.5 ? 'Tracks everywhere; game comes to the water at dawn and dusk.' : 'Thin country. Dawn and dusk are the hours.'}${line ? ' Your traps are out; they take days.' : trapParts ? '' : ' Traps need a wire and a scrap.'}</p>`
      : '<p class="dim">Nothing lives here to hunt.</p>';
    const main = `
      <h4>Rest · ${pc.sheet.hp}/${d.maxHp} health</h4>
      <div class="acts"><button data-rest="1">An hour</button><button data-rest="4">Four hours</button><button data-rest="8">A night</button><button data-rest="${Math.round(until % 24) || 24}">Until morning</button></div>
      <p class="dim">Resting uses water and, for a long sleep, food. The world keeps moving.</p>
      <h4>Talk</h4>${companions.length ? `<div class="acts">${companions.map((n) => `<button data-talk="${n.id}">${esc(n.def.name)}</button>`).join('')}</div>` : '<p class="dim">Nobody here but you.</p>'}
      <h4>Hunt</h4>${huntBlock}
      <h4>Cook</h4>${cookable.length ? `<div class="acts"><button data-a="cook">Cook ${cookable.map((i) => `${esc(itemDef(i.def).name)}${i.qty > 1 ? ` ×${i.qty}` : ''}`).join(', ')}</button></div>` : '<p class="dim">Nothing raw to cook.</p>'}
      <h4>Mend</h4>${worn.length && kits ? `<div class="acts">${worn.map((it) => `<button data-mend="${it!.def}">${esc(itemDef(it!.def).name)} (${Math.round(it!.cond! * 100)}%)</button>`).join('')}</div><p class="dim">${kits} repair kit${kits === 1 ? '' : 's'}.</p>` : `<p class="dim">${kits ? 'Everything is as good as it gets.' : 'No repair kit.'}</p>`}
      <h4>Write</h4>${atTown ? (letters.length ? `<div class="acts"><button data-a="write">Write a letter</button></div>` : '<p class="dim">No one you\'d write to, or nothing to say yet.</p>') : '<p class="dim">Letters need a caravan. Write from a town.</p>'}`;
    const write = `<h4>Write to…</h4>${letters.map((l) => `<div class="row" data-letter="${l.id}"><b>${esc(NPCS[l.to]?.name ?? l.to)}</b> — ${esc(l.topic)}<div class="dim">${esc(l.text.slice(0, 120))}${l.text.length > 120 ? '…' : ''}</div></div>`).join('')}
      <div class="acts"><button data-a="back">Back</button></div>`;
    this.el.innerHTML = `<div class="nb camp"><div class="nb-top"><b>Camp</b> <span class="dim">${esc(g.locationName ?? '')} · day ${dayOf(s.minutes)}</span><button class="x" data-a="close" aria-label="Close">✕</button></div>
      <div class="nb-body one"><div class="col a">${this.view === 'main' ? main : write}</div></div>
      <div class="nb-foot"><button data-a="close">Break camp</button></div></div>`;
    const el = this.el;
    el.querySelectorAll<HTMLElement>('[data-a=close]').forEach((b) => b.addEventListener('click', () => this.close()));
    el.querySelectorAll<HTMLElement>('[data-rest]').forEach((b) => b.addEventListener('click', () => this.rest(Number(b.dataset.rest))));
    el.querySelectorAll<HTMLElement>('[data-talk]').forEach((b) => b.addEventListener('click', () => { const n = g.npcs.get(b.dataset.talk!); this.close(); if (n) g.emit('openDialogue', { npc: n }); }));
    el.querySelector('[data-a=cook]')?.addEventListener('click', () => {
      for (const it of [...cookable]) { const to = itemDef(it.def).cookTo!; const n = it.qty; removeItem(pc.inventory, it.def, n); addItem(pc.inventory, makeItem(to, n)); }
      s.minutes += 30;
      g.emit('message', { text: 'You cook what you have.' });
      this.render();
    });
    el.querySelectorAll<HTMLElement>('[data-mend]').forEach((b) => b.addEventListener('click', () => {
      const it = EQUIP_SLOTS.map((sl) => pc.inventory.equipped[sl]).find((x) => x?.def === b.dataset.mend);
      if (!it || !removeItem(pc.inventory, 't_repair', 1)) return;
      repair(it, 0.35);
      s.minutes += 60;
      g.emit('message', { text: `${itemDef(it.def).name} mended to ${Math.round(it.cond! * 100)}%.` });
      this.render();
    }));
    el.querySelector('[data-a=hunt]')?.addEventListener('click', () => {
      const r = hunt(pc.sheet, abundance, g.rng, (s.minutes / 60) % 24);
      s.minutes += r.hours * 60;
      if (r.meat) addItem(pc.inventory, makeItem('c_meat', r.meat));
      if (r.hides) addItem(pc.inventory, makeItem('j_hide', r.hides));
      g.emit('message', { text: r.text });
      g.quests.update();
      this.render();
    });
    el.querySelector('[data-a=traps-set]')?.addEventListener('click', () => {
      if (!removeItem(pc.inventory, 'j_wiring', 1) || !removeItem(pc.inventory, 'j_scrap', 1)) return;
      (s.world.traps ??= {})[mapId] = { mapId, setAt: s.minutes, count: 2 };
      s.minutes += 40;
      g.emit('message', { text: 'Two snares on the runs by the water. They will take what comes, in their own time.' });
      this.render();
    });
    el.querySelector('[data-a=traps-check]')?.addEventListener('click', () => {
      if (!line) return;
      const n = trapYield(line, s.minutes, abundance, pc.sheet);
      delete s.world.traps![mapId];
      if (n) addItem(pc.inventory, makeItem('c_meat', n));
      g.emit('message', { text: n ? `${n === 1 ? 'One' : n} in the snares, dressed where ${n === 1 ? 'it' : 'they'} hung.` : (s.minutes - line.setAt) / 60 < 8 ? 'Too soon; the snares are empty. You take them up.' : 'Empty snares and a fox\'s tracks round them. You take them up.' });
      this.render();
    });
    el.querySelector('[data-a=write]')?.addEventListener('click', () => { this.view = 'write'; this.render(); });
    el.querySelector('[data-a=back]')?.addEventListener('click', () => { this.view = 'main'; this.render(); });
    el.querySelectorAll<HTMLElement>('[data-letter]').forEach((r) => r.addEventListener('click', () => {
      const def = LETTERS[r.dataset.letter!];
      sendLetter(s, def, g.quests);
      g.emit('message', { text: `Your letter to ${NPCS[def.to]?.name ?? def.to} goes with the next caravan.` });
      this.view = 'main';
      this.render();
    }));
  }
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
