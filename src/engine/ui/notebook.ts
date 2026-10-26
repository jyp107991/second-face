import { CONCLUSIONS, LEADS, LETTERS, NPCS, PERKS, SETTLEMENTS, TRAITS } from '../../content';
import { availableLetters, sendLetter } from '../world/letters';
import { keyAction } from './settings';
import { dayOf } from '../core/state';
import { standing, tryConclude } from '../world/frontier';
import { clockString } from '../core/state';
import type { Game } from '../game';
import {
  EQUIP_SLOTS, addItem, equip, itemValue, itemWeight, syncGear, takeAt, totalWeight, unequip,
  useConsumable, type EquipSlot, type Inventory, type ItemInst,
} from '../inventory/inventory';
import { itemDef } from '../inventory/items';
import { wardrobeKey, wardrobeOutfit } from '../inventory/wardrobe';
import { lookFrom, outfitProxyKeys } from '../assets/humanoid';
import { ensureProxies } from '../assets/human/data';
import { FigureView } from '../render/figureView';
import { itemIcon } from './icons';
import { CHROME_SLOTS, chromeDef, type ChromeSlot } from '../stats/chrome';
import { ATTRIBUTES, ATTRIBUTE_INFO, SKILLS, SKILL_INFO, xpForLevel } from '../stats/rules';
import { attrs, derived, perkAvailable, raiseCost, raiseSkill, skills, takePerk } from '../stats/sheet';

type Tab = 'journal' | 'people' | 'leads' | 'road' | 'status' | 'gear';

const TABS: [Tab, string][] = [['journal', 'Journal'], ['people', 'People'], ['leads', 'Leads'], ['road', 'Road'], ['status', 'Self'], ['gear', 'Pack']];

const CHROME_SLOT_NAMES: Record<ChromeSlot, string> = { eyes: 'Eyes', neural: 'Neural', armL: 'Left arm', armR: 'Right arm', legs: 'Legs', spine: 'Spine', skin: 'Skin', organs: 'Organs' };

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

/**
 * The field notebook: journal, people you've met (sketched), leads board, word on the road, yourself, your pack.
 */
export class Notebook {
  private el?: HTMLElement;
  private tab: Tab = 'journal';
  private leadSel = new Set<string>();
  private leadMsg = '';
  private sel?: number;
  onClose?: () => void;

  constructor(private game: Game) {
    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const a = keyAction(e.code);
      if (e.code === 'KeyI' || a === 'notebook') { e.preventDefault(); this.toggle(e.code === 'KeyI' ? 'gear' : undefined); }
      if (a === 'self') this.toggle('status');
      if (a === 'journal') this.toggle('journal');
      if (a === 'leads') this.toggle('leads');
      if (a === 'people') this.toggle('people');
      if (e.code === 'Escape' && this.el) { e.stopImmediatePropagation(); this.close(); }
    }, true);
  }

  get isOpen(): boolean { return !!this.el; }

  toggle(tab?: Tab): void {
    if (this.el && (!tab || tab === this.tab)) this.close();
    else this.open(tab);
  }

  open(tab: Tab = this.tab): void {
    if (document.querySelector('.creator') || document.querySelector('.overlay:not(.hidden)') || document.querySelector('.dlg')) return;
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
    this.fig?.dispose();
    this.fig = undefined;
    this.figKey = '';
    this.el?.remove();
    this.el = undefined;
    this.sel = undefined;
    if (!this.game.encounter.active) this.game.paused = false;
    this.onClose?.();
  }

  private get inCombat(): boolean { return this.game.encounter.active; }

  /** The live figure beside the pack and the self sheet (one renderer, kept across re-renders). */
  private fig?: FigureView;
  private figKey = '';

  private mountFigure(): void {
    const col = this.el?.querySelector('.col.fig') as HTMLElement | null;
    if (!col) { this.fig?.dispose(); this.fig = undefined; this.figKey = ''; return; }
    if (!this.fig) this.fig = new FigureView(col);
    else col.append(this.fig.canvas);
    const pc = this.game.state.pc;
    const held = pc.inventory.equipped[pc.inventory.active];
    col.insertAdjacentHTML('beforeend', `<div class="cap">${this.tab === 'status' ? 'Drag to turn. Chrome shows where it was fitted.' : held ? `In hand: ${esc(itemDef(held.def).name)}. Drag to turn.` : 'Empty-handed. Drag to turn.'}</div>`);
    const key = wardrobeKey(pc);
    if (key !== this.figKey) {
      this.figKey = key;
      const outfit = wardrobeOutfit(pc);
      void ensureProxies(outfitProxyKeys(outfit)).catch(() => undefined).then(() => { if (this.fig && this.figKey === key) this.fig.setLook(lookFrom(pc.appearance, outfit)); });
    }
    this.fig.resize();
  }

  render(): void {
    if (!this.el) return;
    const g = this.game, pc = g.state.pc;
    this.el.innerHTML = `<div class="nb">
      <div class="nb-top">${TABS.map(([t, label]) => `<button data-t="${t}" class="${this.tab === t ? 'on' : ''}">${label}</button>`).join('')}
        <button class="x" data-t="close" aria-label="Close">✕</button></div>
      <div class="nb-body${this.tab === 'gear' || this.tab === 'status' ? ' with-figure' : ''}">${this.tab === 'gear' || this.tab === 'status' ? '<div class="col fig"></div>' : ''}<div class="col a"></div><div class="col b"></div></div></div>`;
    this.el.querySelector('.nb-top')!.addEventListener('click', (e) => {
      const t = (e.target as HTMLElement).dataset.t;
      if (t === 'close') this.close();
      else if (t) { this.tab = t as Tab; this.sel = undefined; this.leadMsg = ''; this.render(); }
    });
    const a = this.el.querySelector('.col.a') as HTMLElement, b = this.el.querySelector('.col.b') as HTMLElement;
    if (this.tab === 'status') this.status(a, b);
    else if (this.tab === 'journal') this.journal(a, b);
    else if (this.tab === 'people') this.people(a, b);
    else if (this.tab === 'leads') this.leads(a, b);
    else if (this.tab === 'road') this.road(a, b);
    else this.gear(a, b, pc.inventory);
    this.mountFigure();
  }

  /** Everyone you've spoken to, with a sketch and where you stand with them. */
  private people(a: HTMLElement, b: HTMLElement): void {
    const w = this.game.state.world, met = Object.entries(w.met ?? {});
    const sel = met[this.sel ?? 0];
    a.innerHTML = `<h4>People</h4>` + (met.length ? met.map(([, m], i) => `<div class="row ${i === (this.sel ?? 0) ? 'sel' : ''}" data-p="${i}">${esc(m.name)}</div>`).join('') : '<p class="dim">You haven\'t met anyone worth writing down.</p>');
    a.querySelectorAll<HTMLElement>('[data-p]').forEach((el) => el.addEventListener('click', () => { this.sel = Number(el.dataset.p); this.render(); }));
    if (!sel) { b.innerHTML = ''; return; }
    const [id, m] = sel;
    const r = w.relations[id] ?? { trust: 0, affection: 0 };
    const feel = (v: number, pos: string, neg: string) => v >= 40 ? `very ${pos}` : v >= 10 ? pos : v <= -40 ? `very ${neg}` : v <= -10 ? neg : 'unsure of you';
    const sketch = this.game.state.sketches?.[id];
    const approval = w.approval[id];
    b.innerHTML = `${sketch ? `<img class="sketch" src="${sketch}" alt="">` : '<div class="sketch empty">no sketch</div>'}
      <h4>${esc(m.name)}</h4>
      <p class="log">Met on day ${m.day}${m.where ? ` at ${esc(m.where)}` : ''}.</p>
      <p class="log">Trust: ${feel(r.trust, 'trusting', 'wary')}. Warmth: ${feel(r.affection, 'fond', 'cold')}.</p>
      ${approval !== undefined ? `<p class="log">As a companion: ${feel(approval, 'approving', 'disapproving')}.</p>` : ''}
      ${w.party.includes(id) ? '<p class="log"><b>Travelling with you.</b></p>' : ''}
      ${NPCS[id]?.faction ? `<p class="dim">${esc(NPCS[id]!.faction!)}</p>` : ''}`;
  }

  /** Clues pinned to the board; pick two or three and try to connect them. */
  private leads(a: HTMLElement, b: HTMLElement): void {
    const w = this.game.state.world;
    const have = Object.keys(w.leads).filter((l) => LEADS[l]);
    a.innerHTML = `<h4>Leads</h4><p class="dim">Pick clues that belong together, then connect them.</p>` + (have.length ? `<div class="leads">${have.map((l) => `<button class="lead ${this.leadSel.has(l) ? 'on' : ''}" data-l="${l}"><b>${esc(LEADS[l].label)}</b><span>${esc(LEADS[l].text)}</span></button>`).join('')}</div>` : '<p class="dim">Nothing pinned yet.</p>');
    a.querySelectorAll<HTMLElement>('[data-l]').forEach((el) => el.addEventListener('click', () => {
      const l = el.dataset.l!;
      if (this.leadSel.has(l)) this.leadSel.delete(l); else if (this.leadSel.size < 4) this.leadSel.add(l);
      this.leadMsg = '';
      this.render();
    }));
    const done = Object.keys(w.conclusions).filter((c) => CONCLUSIONS[c]);
    b.innerHTML = `<h4>Connect</h4>
      <div class="acts"><button data-a="link" ${this.leadSel.size >= 2 ? '' : 'disabled'}>Connect ${this.leadSel.size || ''} clue${this.leadSel.size === 1 ? '' : 's'}</button>${this.leadSel.size ? '<button data-a="clear">Clear</button>' : ''}</div>
      ${this.leadMsg ? `<p class="log">${this.leadMsg}</p>` : ''}
      <h4>Conclusions</h4>${done.length ? done.map((c) => `<p class="log">✓ ${esc(CONCLUSIONS[c].text)}</p>`).join('') : '<p class="dim">None yet.</p>'}`;
    b.querySelector('[data-a=link]')?.addEventListener('click', () => {
      const c = tryConclude(this.game.state, [...this.leadSel], CONCLUSIONS, this.game.quests);
      this.leadMsg = c ? `<b>It fits.</b> ${esc(c.text)}` : 'You turn it over for a while. It doesn\'t fit together — not like that.';
      if (c) this.leadSel.clear();
      this.game.quests.update();
      this.render();
    });
    b.querySelector('[data-a=clear]')?.addEventListener('click', () => { this.leadSel.clear(); this.render(); });
  }

  /** Word on the road: what each place has heard about you. */
  private road(a: HTMLElement, b: HTMLElement): void {
    const g = this.game.state, places = Object.values(SETTLEMENTS);
    const word = (v: number) => v >= 50 ? 'speaks well of you' : v >= 15 ? 'has heard good things' : v <= -50 ? 'wants you gone' : v <= -15 ? 'has heard bad things' : 'doesn\'t know your name';
    const sel = places[this.sel ?? 0];
    a.innerHTML = `<h4>Word on the road</h4>` + places.map((p, i) => `<div class="row ${i === (this.sel ?? 0) ? 'sel' : ''}" data-r="${i}">${esc(p.name)} <span class="dim">— ${word(standing(g, p.id))}</span></div>`).join('');
    a.querySelectorAll<HTMLElement>('[data-r]').forEach((el) => el.addEventListener('click', () => { this.sel = Number(el.dataset.r); this.render(); }));
    if (!sel) { b.innerHTML = ''; return; }
    const stories = g.world.news.filter((n) => n.heard[sel.id]);
    b.innerHTML = `<h4>${esc(sel.name)}</h4>` + (stories.length ? stories.map((n) => {
      const h = n.heard[sel.id];
      const who = n.about === 'masked' ? 'a masked stranger' : 'you';
      const told = h.distortion > 0.3 ? ' (the story has grown in the telling)' : '';
      return `<p class="log">${esc((n.text ?? n.tag.replace(/_/g, ' ')).replace('{who}', who))}${told} <span class="dim">— heard day ${h.day}${dayOf(g.minutes) - h.day > 0 ? `, ${dayOf(g.minutes) - h.day} days ago` : ''}</span></p>`;
    }).join('') : '<p class="dim">Nothing about you has reached them.</p>');
  }

  private journalView: 'quests' | 'letters' | 'log' = 'quests';
  /** Quests (active first) with objectives and history; decisions; letters; the conversation log. */
  private journal(a: HTMLElement, b: HTMLElement): void {
    const g = this.game, w = g.state.world;
    const all = g.quests.journal();
    const order = { active: 0, done: 1, failed: 2 } as Record<string, number>;
    all.sort((x, y) => order[x.status] - order[y.status]);
    const sel = all[this.sel ?? 0];
    const unread = (w.post ?? []).filter((p) => !p.read).length;
    const sub = `<div class="acts sub"><button data-v="quests" class="${this.journalView === 'quests' ? 'on' : ''}">Quests</button><button data-v="letters" class="${this.journalView === 'letters' ? 'on' : ''}">Letters${unread ? ` (${unread})` : ''}</button><button data-v="log" class="${this.journalView === 'log' ? 'on' : ''}">Log</button></div>`;
    if (this.journalView === 'letters') {
      const post = (w.post ?? []).slice().reverse(), sent = (w.letters ?? []).slice().reverse();
      const can = g.loc?.map.settlement ? availableLetters(g.state, LETTERS) : [];
      a.innerHTML = sub + `<h4>Received</h4>` + (post.length ? post.map((p) => `<div class="row"><b>${esc(NPCS[p.from]?.name ?? p.from)}</b> <span class="dim">day ${p.day}${p.read ? '' : ' · new'}</span><p class="log">${esc(p.text)}</p></div>`).join('') : '<p class="dim">No letters yet.</p>');
      for (const p of w.post ?? []) p.read = true;
      b.innerHTML = `<h4>Sent</h4>` + (sent.length ? sent.map((l) => `<p class="log">To ${esc(NPCS[l.to]?.name ?? l.to)}, day ${l.day}${l.arrives > dayOf(g.state.minutes) ? ` — reply expected about day ${l.arrives}` : ''}: ${esc(LETTERS[l.id]?.text ?? '')}</p>`).join('') : '<p class="dim">Nothing sent.</p>')
        + `<h4>Write</h4>` + (g.loc?.map.settlement ? (can.length ? can.map((l) => `<div class="row" data-letter="${l.id}"><b>${esc(NPCS[l.to]?.name ?? l.to)}</b> — ${esc(l.topic)}</div>`).join('') : '<p class="dim">No one to write to, or nothing to say yet.</p>') : '<p class="dim">Letters leave with caravans: write from a town.</p>');
      b.querySelectorAll<HTMLElement>('[data-letter]').forEach((el) => el.addEventListener('click', () => { const def = LETTERS[el.dataset.letter!]; sendLetter(g.state, def, g.quests); g.emit('message', { text: `Your letter to ${NPCS[def.to]?.name ?? def.to} goes with the next caravan.` }); this.render(); }));
    } else if (this.journalView === 'log') {
      const lines = (w.log ?? []).slice(-80).reverse();
      a.innerHTML = sub + `<h4>Said lately</h4>` + (lines.length ? lines.map((l) => `<p class="log"><b>${esc(l.who)}:</b> ${esc(l.text)}</p>`).join('') : '<p class="dim">Nothing yet.</p>');
      b.innerHTML = '';
    } else {
      a.innerHTML = sub + `<h4>Quests</h4>` + (all.length ? all.map((q, i) => `<div class="row ${i === (this.sel ?? 0) ? 'sel' : ''} ${q.status}" data-q="${i}">${q.status === 'done' ? '✓ ' : q.status === 'failed' ? '✗ ' : w.pinned === q.id ? '📌 ' : '▸ '}${esc(q.title)}</div>`).join('') : '<p class="dim">Nothing yet.</p>');
      a.querySelectorAll<HTMLElement>('[data-q]').forEach((el) => el.addEventListener('click', () => { this.sel = Number(el.dataset.q); this.render(); }));
      const dec = w.decisions;
      b.innerHTML = (sel ? `<h4>${esc(sel.title)}${sel.status === 'active' ? ` <button class="plus" data-pin="${sel.id}" title="Pin to the screen">${w.pinned === sel.id ? 'unpin' : 'pin'}</button>` : ''}</h4>
        ${sel.objectives.map((o) => `<div class="obj ${o.done ? 'done' : ''}">${o.done ? '☑' : '☐'} ${esc(o.text)}${o.optional ? ' (optional)' : ''}</div>`).join('')}
        ${sel.log.slice().reverse().map((l) => `<p class="log">${esc(l)}</p>`).join('')}` : '')
        + (dec.length ? `<h4>Decisions</h4>${dec.map((d) => `<p class="log">${esc(d.text)}</p>`).join('')}` : '');
      b.querySelector('[data-pin]')?.addEventListener('click', (e) => { const id = (e.target as HTMLElement).dataset.pin!; w.pinned = w.pinned === id ? undefined : id; this.render(); });
    }
    a.querySelectorAll<HTMLElement>('[data-v]').forEach((el) => el.addEventListener('click', () => { this.journalView = el.dataset.v as typeof this.journalView; this.render(); }));
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
      <h4>Chrome</h4><div class="chrome">${CHROME_SLOTS.map((slot) => { const c = s.chrome?.[slot], d = c && chromeDef(c.id); return `<span class="desc">${CHROME_SLOT_NAMES[slot]}</span><span>${d ? `<b>${esc(d.name)}</b> <span class="w">${d.grade} · ${Math.round(c.condition * 100)}%${d.visible ? '' : ' · hidden'}</span>` : '<span class="none">—</span>'}</span>`; }).join('')}</div>
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
      <div class="desc">${perks.map(([p, r]) => `<b>${PERKS[p]?.name}</b>${r > 1 ? ` ×${r}` : ''} — ${PERKS[p]?.desc}`).join('<br>') || 'None yet. A new perk every 2 levels.'}</div>`);
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
        <span>${it ? `<img class="ico" src="${itemIcon(itemDef(it.def))}" alt="">${esc(itemDef(it.def).name)}` : '—'}<div class="desc">${it ? itemSummary(it) : ''}</div></span>`;
      if (it) {
        const btn = document.createElement('button');
        btn.className = 'plus';
        btn.textContent = '✕';
        btn.title = 'Unequip';
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
      row.innerHTML = `<span><img class="ico" src="${itemIcon(d)}" alt="">${esc(d.name)}${it.qty > 1 ? ` ×${it.qty}` : ''}${it.cond !== undefined ? ` <span class="w">${Math.round(it.cond * 100)}%</span>` : ''}</span><span class="w">${itemWeight(it).toFixed(1)}kg</span><span class="w">${itemValue(it)}T</span>`;
      row.onclick = () => { this.sel = i; this.render(); };
      a.append(row);
    }
    if (!inv.items.length) a.insertAdjacentHTML('beforeend', '<div class="desc">Empty.</div>');

    const it = this.sel !== undefined ? inv.items[this.sel] : undefined;
    if (!it) { b.innerHTML = `<div class="desc">Select an item.</div>`; return; }
    const d = itemDef(it.def);
    // Compare with what is equipped in the slot this would take.
    let compare = '';
    const cur = d.weapon ? inv.equipped[inv.active] : d.armor ? inv.equipped[d.armor.slot] : undefined;
    if (cur && cur.def !== it.def) {
      const cd = itemDef(cur.def);
      if (d.weapon && cd.weapon) { const a = (d.weapon.dmg[0] + d.weapon.dmg[1]) / 2, c = (cd.weapon.dmg[0] + cd.weapon.dmg[1]) / 2; compare = `vs ${esc(cd.name)}: damage ${a >= c ? '+' : ''}${(a - c).toFixed(1)} · AP ${d.weapon.ap - cd.weapon.ap >= 0 ? '+' : ''}${d.weapon.ap - cd.weapon.ap} · range ${d.weapon.range - cd.weapon.range >= 0 ? '+' : ''}${d.weapon.range - cd.weapon.range}`; }
      if (d.armor && cd.armor) compare = `vs ${esc(cd.name)}: DT ${d.armor.dt - cd.armor.dt >= 0 ? '+' : ''}${d.armor.dt - cd.armor.dt} · DR ${d.armor.dr - cd.armor.dr >= 0 ? '+' : ''}${d.armor.dr - cd.armor.dr}%`;
    }
    b.innerHTML = `<img class="ico big" src="${itemIcon(d, 64)}" alt=""><h4>${esc(d.name)}</h4><div class="desc">${esc(d.desc)}</div><p>${itemSummary(it)}</p>${compare ? `<p class="dim">${compare}</p>` : ''}
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
    if (d.read) btn('Read', () => { const tree = d.read!, name = d.name; this.close(); window.setTimeout(() => this.game.emit('openDialogue', { tree, name })); });
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

