import { PERKS, TRAITS } from '../../content';
import { clockString } from '../core/state';
import type { Game } from '../game';
import {
  EQUIP_SLOTS, addItem, equip, itemValue, itemWeight, syncGear, takeAt, totalWeight, unequip,
  useConsumable, type EquipSlot, type Inventory, type ItemInst,
} from '../inventory/inventory';
import { itemDef } from '../inventory/items';
import { ATTRIBUTES, ATTRIBUTE_INFO, SKILLS, SKILL_INFO, xpForLevel } from '../stats/rules';
import { attrs, derived, perkAvailable, raiseCost, raiseSkill, skills, takePerk } from '../stats/sheet';

type Tab = 'status' | 'gear';

const SLOT_NAMES: Record<EquipSlot, string> = { primary: 'Hand 1', secondary: 'Hand 2', body: 'Body', head: 'Head' };

export function itemSummary(it: ItemInst): string {
  const d = itemDef(it.def);
  const bits: string[] = [];
  if (d.weapon) {
    const w = d.weapon;
    bits.push(`${w.dmg[0]}–${w.dmg[1]} ${w.dmgType}`, `${w.ap} AP`, w.range > 1 ? `range ${w.range}` : 'melee');
    if (w.magazine) bits.push(`${it.loaded ?? 0}/${w.magazine} ${w.ammo}`);
    if (w.burst) bits.push(`burst ${w.burst.rounds}`);
    if (w.minBrawn) bits.push(`Brawn ${w.minBrawn}`);
    bits.push(SKILL_INFO[w.skill].name);
  }
  if (d.armor) bits.push(`DT ${d.armor.dt}`, `DR ${d.armor.dr}%`, ...(d.armor.radResist ? [`Rad ${d.armor.radResist}%`] : []), ...(d.armor.stealth ? [`Stealth −${d.armor.stealth}`] : []));
  if (d.ammo) bits.push(`dmg ×${d.ammo.dmgMult}`, d.ammo.dtPen ? `pierce ${d.ammo.dtPen}` : '');
  if (it.cond !== undefined) bits.push(`condition ${Math.round(it.cond * 100)}%`);
  return bits.filter(Boolean).join(' · ');
}

/** The wrist computer: character status and gear. */
export class Wristlog {
  private el?: HTMLElement;
  private tab: Tab = 'status';
  private sel?: number;
  onClose?: () => void;

  constructor(private game: Game) {
    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.code === 'KeyI' || e.code === 'Tab') { e.preventDefault(); this.toggle(e.code === 'KeyI' ? 'gear' : undefined); }
      if (e.code === 'KeyC') this.toggle('status');
      if (e.code === 'Escape' && this.el) { e.stopImmediatePropagation(); this.close(); }
    }, true);
  }

  get isOpen(): boolean { return !!this.el; }

  toggle(tab?: Tab): void {
    if (this.el && (!tab || tab === this.tab)) this.close();
    else this.open(tab);
  }

  open(tab: Tab = this.tab): void {
    if (document.querySelector('.creator') || document.querySelector('.overlay:not(.hidden)')) return;
    this.tab = tab;
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.className = 'wl';
      this.el.addEventListener('click', (e) => { if (e.target === this.el) this.close(); });
      document.body.appendChild(this.el);
      if (!this.game.encounter.active) this.game.paused = true;
    }
    this.render();
  }

  close(): void {
    this.el?.remove();
    this.el = undefined;
    this.sel = undefined;
    if (!this.game.encounter.active) this.game.paused = false;
    this.onClose?.();
  }

  private get inCombat(): boolean { return this.game.encounter.active; }

  render(): void {
    if (!this.el) return;
    const g = this.game, pc = g.state.pc;
    this.el.innerHTML = `<div class="dev-frame crt">
      <div class="wl-top"><span class="brand">WRISTLOG · C9</span>
        <button data-t="status" class="${this.tab === 'status' ? 'on' : ''}">STATUS</button>
        <button data-t="gear" class="${this.tab === 'gear' ? 'on' : ''}">GEAR</button>
        <button class="x" data-t="close" aria-label="Close">✕</button></div>
      <div class="wl-body"><div class="col a"></div><div class="col b"></div></div></div>`;
    this.el.querySelector('.wl-top')!.addEventListener('click', (e) => {
      const t = (e.target as HTMLElement).dataset.t;
      if (t === 'close') this.close();
      else if (t) { this.tab = t as Tab; this.sel = undefined; this.render(); }
    });
    const a = this.el.querySelector('.col.a') as HTMLElement, b = this.el.querySelector('.col.b') as HTMLElement;
    if (this.tab === 'status') this.status(a, b);
    else this.gear(a, b, pc.inventory);
  }

  private status(a: HTMLElement, b: HTMLElement): void {
    const s = this.game.state.pc.sheet;
    const d = derived(s), at = attrs(s), sk = skills(s);
    const next = xpForLevel(s.level + 1), prev = xpForLevel(s.level);
    a.innerHTML = `<h4>${esc(s.name || 'You')} · Level ${s.level}</h4>
      <div class="desc">XP ${s.xp} / ${next} · ${clockString(this.game.state.minutes)}</div>
      <div class="xpbar"><i style="width:${Math.min(100, ((s.xp - prev) / (next - prev)) * 100)}%"></i></div>
      <div class="kv"><span>Health</span><span>${s.hp}/${d.maxHp}</span><span></span>
      <span>Radiation</span><span class="${s.rads >= 200 ? 'warn' : ''}">${s.rads}</span><span></span>
      <span>Action points</span><span>${d.ap}</span><span></span>
      <span>Damage threshold / resist</span><span>${d.dt} / ${d.dr}%</span><span></span>
      <span>Carry</span><span>${totalWeight(this.game.state.pc.inventory)} / ${d.carry} kg</span><span></span>
      <span>Initiative · Crit</span><span>${d.initiative} · ${d.crit}%</span><span></span></div>
      <h4>Attributes</h4><div class="kv">${ATTRIBUTES.map((x) => `<span>${ATTRIBUTE_INFO[x].name}</span><span>${at[x]}</span><span></span>`).join('')}</div>
      <h4>Condition</h4><div class="desc">${[
        ...Object.keys(s.crippled).filter((k) => s.crippled[k as keyof typeof s.crippled]).map((k) => `<span class="warn">Crippled: ${k}</span>`),
        ...s.effects.map((e) => `${esc(e.name)}${e.until !== undefined ? ` (${Math.max(0, Math.round(e.until - this.game.state.minutes))} min)` : ''}`),
      ].join('<br>') || 'Nothing unusual.'}</div>
      <h4>Traits</h4><div class="desc">${s.traits.map((t) => `<b>${TRAITS[t]?.name}</b> — ${TRAITS[t]?.desc}`).join('<br>') || 'None'}</div>`;
    b.innerHTML = `<h4>Skills ${s.unspentSkill ? `· <span class="warn">${s.unspentSkill} points to spend</span>` : ''}</h4>`;
    const kv = document.createElement('div');
    kv.className = 'kv';
    for (const k of SKILLS) {
      const tag = s.tagged.includes(k) ? ' ◆' : '';
      const cost = raiseCost(s, k);
      kv.insertAdjacentHTML('beforeend', `<span>${SKILL_INFO[k].name}${tag}</span><span>${sk[k]}%</span>`);
      const btn = document.createElement('button');
      btn.className = 'plus';
      btn.textContent = '+';
      btn.title = `${cost.cost} point(s) for +${cost.gain}%`;
      btn.style.visibility = s.unspentSkill >= cost.cost ? 'visible' : 'hidden';
      btn.onclick = () => { raiseSkill(s, k); this.render(); };
      kv.append(btn);
    }
    b.append(kv);
    const perks = Object.entries(s.perks);
    b.insertAdjacentHTML('beforeend', `<h4>Perks ${s.pendingPerks ? `· <span class="warn">${s.pendingPerks} to choose</span>` : ''}</h4>
      <div class="desc">${perks.map(([p, r]) => `<b>${PERKS[p]?.name}</b>${r > 1 ? ` ×${r}` : ''} — ${PERKS[p]?.desc}`).join('<br>') || 'None yet. A new perk every 3 levels.'}</div>`);
    if (s.pendingPerks > 0) {
      for (const p of Object.values(PERKS).filter((p) => perkAvailable(s, p.id))) {
        const div = document.createElement('div');
        div.className = 'perk';
        div.innerHTML = `<b>${p.name}</b><div class="desc">${p.desc}</div>`;
        const btn = document.createElement('button');
        btn.textContent = 'Choose';
        btn.onclick = () => { takePerk(s, p.id); syncGear(s, this.game.state.pc.inventory); this.render(); };
        div.append(btn);
        b.append(div);
      }
    }
  }

  private gear(a: HTMLElement, b: HTMLElement, inv: Inventory): void {
    const s = this.game.state.pc.sheet;
    const carry = derived(s).carry, w = totalWeight(inv);
    a.innerHTML = `<h4>Equipped</h4>`;
    for (const slot of EQUIP_SLOTS) {
      const it = inv.equipped[slot];
      const row = document.createElement('div');
      row.className = 'slot2';
      row.innerHTML = `<span class="desc">${SLOT_NAMES[slot]}${(slot === 'primary' || slot === 'secondary') && inv.active === slot ? ' ●' : ''}</span>
        <span>${it ? esc(itemDef(it.def).name) : '—'}<div class="desc">${it ? itemSummary(it) : ''}</div></span>`;
      if (it) {
        const btn = document.createElement('button');
        btn.className = 'plus';
        btn.textContent = '✕';
        btn.title = 'Unequip';
        btn.style.cssText = 'font-family:var(--font);min-width:36px;min-height:36px;color:var(--crt);background:#0e2216;border:1px solid var(--crt-dim)';
        btn.onclick = () => { if (this.spendAp(1)) { unequip(inv, slot); syncGear(s, inv); this.render(); } };
        row.append(btn);
      }
      a.append(row);
    }
    a.insertAdjacentHTML('beforeend', `<h4>Pack · ${w}/${carry} kg${w > carry ? ' <span class="warn">OVERLOADED</span>' : ''} · ${inv.tolls} Tolls</h4>`);
    const order = ['weapon', 'armor', 'ammo', 'consumable', 'tool', 'junk', 'key', 'note', 'misc'];
    const sorted = inv.items.map((it, i) => ({ it, i })).sort((x, y) => order.indexOf(itemDef(x.it.def).category) - order.indexOf(itemDef(y.it.def).category) || itemDef(x.it.def).name.localeCompare(itemDef(y.it.def).name));
    for (const { it, i } of sorted) {
      const d = itemDef(it.def);
      const row = document.createElement('div');
      row.className = 'item' + (this.sel === i ? ' sel' : '');
      row.innerHTML = `<span>${esc(d.name)}${it.qty > 1 ? ` ×${it.qty}` : ''}${it.cond !== undefined ? ` <span class="w">${Math.round(it.cond * 100)}%</span>` : ''}</span><span class="w">${itemWeight(it).toFixed(1)}kg</span><span class="w">${itemValue(it)}T</span>`;
      row.onclick = () => { this.sel = i; this.render(); };
      a.append(row);
    }
    if (!inv.items.length) a.insertAdjacentHTML('beforeend', '<div class="desc">Empty.</div>');

    const it = this.sel !== undefined ? inv.items[this.sel] : undefined;
    if (!it) { b.innerHTML = `<div class="desc">Select an item.</div>`; return; }
    const d = itemDef(it.def);
    b.innerHTML = `<h4>${esc(d.name)}</h4><div class="desc">${esc(d.desc)}</div><p>${itemSummary(it)}</p>
      <div class="desc">Weight ${d.weight} kg · Value ${d.value} Tolls${it.qty > 1 ? ` each` : ''}</div><div class="acts"></div>`;
    const acts = b.querySelector('.acts')!;
    const btn = (label: string, fn: () => void) => { const x = document.createElement('button'); x.textContent = label; x.onclick = fn; acts.append(x); };
    if (d.weapon) {
      btn('Equip Hand 1', () => { if (this.spendAp(2)) { equip(inv, this.sel!, 'primary'); inv.active = 'primary'; syncGear(s, inv); this.sel = undefined; this.render(); } });
      btn('Equip Hand 2', () => { if (this.spendAp(2)) { equip(inv, this.sel!, 'secondary'); syncGear(s, inv); this.sel = undefined; this.render(); } });
    }
    if (d.armor) btn('Wear', () => { if (this.inCombat) return this.toast('Not during combat'); equip(inv, this.sel!); syncGear(s, inv); this.sel = undefined; this.render(); });
    if (d.consumable) btn('Use', () => {
      const enc = this.game.encounter;
      if (enc.active) {
        const p = enc.player;
        if (!p || !enc.isPlayerTurn) return this.toast('Not your turn');
        enc.useItem(p, it.def);
      } else {
        const r = useConsumable(inv, this.sel!, s, this.game.state.minutes);
        this.toast(r.message);
      }
      this.sel = undefined;
      this.render();
    });
    btn('Drop 1', () => { this.drop(inv, it, 1); });
    if (it.qty > 1) btn('Drop all', () => { this.drop(inv, it, it.qty); });
  }

  private drop(inv: Inventory, it: ItemInst, n: number): void {
    // Dropped items go into a per-map ground pile so they can be picked up again.
    const g = this.game;
    const key = `${g.state.locationId}/ground_${g.state.player.x}_${g.state.player.y}`;
    const pile = (g.state.containers[key] ??= { items: [], equipped: {}, active: 'primary', tolls: 0 });
    const idx = inv.items.indexOf(it);
    const taken = takeAt(inv, idx, n);
    if (taken) addItem(pile, taken);
    g.groundPilesChanged();
    this.sel = undefined;
    this.render();
  }

  /** In combat, inventory actions cost AP on the player's turn. */
  private spendAp(n: number): boolean {
    const enc = this.game.encounter;
    if (!enc.active) return true;
    const p = enc.player;
    if (!p || !enc.isPlayerTurn) { this.toast('Not your turn'); return false; }
    if (p.c.ap < n) { this.toast(`Needs ${n} AP`); return false; }
    p.c.ap -= n;
    enc.emit('changed', {});
    return true;
  }

  private toast(text: string): void {
    this.game.emit('message', { text });
  }
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
