import { ORIGINS, PERKS, TRAITS } from '../../content';
import { lookFrom } from '../assets/humanoid';
import { Rng } from '../core/rng';
import type { Pronouns } from '../core/state';
import {
  BROW_STYLES, EYE_COLORS, FACIAL_HAIR, HAIR_COLORS, HAIR_STYLES, SCARS, TATTOOS, defaultAppearance, randomAppearance, type Appearance,
} from '../data/appearance';
import { humanData } from '../assets/human/data';
import { PLAYER_OUTFIT } from '../game';
import type { Game } from '../game';
import { PortraitStage } from '../render/portrait';
import { ATTRIBUTES, ATTRIBUTE_INFO, ATTR_MAX, ATTR_MIN, SKILLS, SKILL_INFO, TAG_COUNT } from '../stats/rules';
import { attrs, creationPointsLeft, derived, emptySheet, skills, validateCreation, type CharacterSheet } from '../stats/sheet';

export interface CreatorResult { sheet: CharacterSheet; appearance: Appearance; pronouns: Pronouns; }

type Tab = 'identity' | 'face' | 'hair' | 'body' | 'attributes' | 'skills' | 'traits' | 'done';
const TABS: { id: Tab; label: string; framing: number }[] = [
  { id: 'identity', label: 'WHO', framing: 0.55 },
  { id: 'face', label: 'FACE', framing: 0 },
  { id: 'hair', label: 'HAIR & MARKS', framing: 0 },
  { id: 'body', label: 'BODY', framing: 1 },
  { id: 'attributes', label: 'ATTRIBUTES', framing: 0.55 },
  { id: 'skills', label: 'SKILLS', framing: 0.55 },
  { id: 'traits', label: 'TRAITS', framing: 0.55 },
  { id: 'done', label: 'BEGIN', framing: 0.3 },
];

const STYLE_NAMES: Record<string, string> = {
  short01: 'Cropped', short02: 'Short', short03: 'Tousled', short04: 'Swept', bob01: 'Bob', bob02: 'Long bob', long01: 'Long',
  ponytail01: 'Ponytail', braid01: 'Braid', afro01: 'Afro',
  none: 'None', stubble: 'Stubble', moustache: 'Moustache', goatee: 'Goatee', short_beard: 'Short beard', full_beard: 'Full beard', chops: 'Sideburns', long_beard: 'Long beard',
  brow_cut: 'Split brow', cheek_slash: 'Cheek slash', lip_split: 'Split lip', eye_scar: 'Eye scar', burn_left: 'Burn (left)', burn_right: 'Burn (right)', forehead_x: 'Cross brand', chin_nick: 'Chin nick',
  nine_neck: 'Cistern nine', tear: 'Teardrop', chin_lines: 'Chin lines', brow_dots: 'Brow dots', cheek_tribal: 'Cheek whorl', temple_spiral: 'Temple spiral', cheek_cross: 'Cheek cross', jaw_stripes: 'Jaw stripes', forehead_star: 'Brow star', eye_band: 'Eye band',
};

const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');

const GROUP_NAMES: Record<string, string> = {
  head: 'Head shape', forehead: 'Forehead', eyebrows: 'Brow', eyes: 'Eyes', nose: 'Nose', mouth: 'Mouth', cheek: 'Cheeks', chin: 'Chin & jaw',
  ears: 'Ears', neck: 'Neck', torso: 'Torso', hip: 'Hips', stomach: 'Stomach', buttocks: 'Buttocks', armslegs: 'Arms & legs',
};
const FACE_GROUP_PREFIXES = ['head', 'forehead', 'eyebrows', 'eye', 'nose', 'mouth', 'cheek', 'chin', 'ear', 'neck'];
const WORDS: Record<string, string> = { horiz: 'width', vert: 'height', depth: 'depth', trans: 'position', scale: '', decr: '', incr: '' };

/** "sym:eye-scale|decr|incr" → "Scale"; "nose-trans|down|up" → "Position (down–up)". */
function modLabel(id: string, group: string): string {
  const [name, min, max] = id.replace('sym:', '').split('|');
  let base = name.replace(new RegExp(`^(${group}|${group.replace(/s$/, '')})-`), '');
  base = base.split('-').map((w) => WORDS[w] ?? w).filter(Boolean).join(' ') || 'size';
  base = base.charAt(0).toUpperCase() + base.slice(1);
  return min && min !== 'decr' ? `${base} (${min}–${max})` : base;
}

/** Character creation screen with live 3D preview. */
export class Creator {
  private el: HTMLElement;
  private body!: HTMLElement;
  private tab: Tab = 'identity';
  private stage: PortraitStage;
  private sheet: CharacterSheet;
  private app: Appearance;
  private pronouns: Pronouns = 'they';
  private dirty = true;
  private offs: (() => void)[] = [];
  private raf = 0;

  constructor(private game: Game, private onDone: (r: CreatorResult) => void, private onCancel: () => void) {
    this.sheet = emptySheet('');
    this.app = defaultAppearance();
    this.applyOrigin(ORIGINS[0].id, false);
    this.stage = new PortraitStage(0x120f0b);
    this.layoutStage();
    game.portrait = this.stage;
    game.paused = true;

    this.el = document.createElement('div');
    this.el.className = 'creator';
    this.el.innerHTML = `<div class="title">CISTERN 9 · RESIDENT RECORD</div>
      <div class="hint">Drag to turn · pinch / wheel to zoom</div>
      <div class="panel crt"><div class="tabs"></div><div class="body"></div>
      <div class="foot"><button data-a="back">Back</button><button data-a="rand">Randomise look</button><button class="go" data-a="next">Next ›</button></div></div>`;
    document.body.appendChild(this.el);
    document.body.classList.add('fullscreen-ui');
    this.body = this.el.querySelector('.body')!;
    this.el.querySelector('.foot')!.addEventListener('click', (e) => this.onFoot((e.target as HTMLElement).dataset.a));
    this.renderTabs();
    this.renderBody();

    // Drag rotates the figure, pinch/wheel toggles framing.
    this.offs.push(game.input.on('pan', ({ dx }) => { this.stage.yaw += dx * 0.01; }));
    this.offs.push(game.input.on('zoom', ({ factor }) => {
      this.framingNow = Math.max(0, Math.min(1, this.framingNow + (factor - 1) * 2));
      this.stage.setFraming(this.framingNow);
    }));
    const onResize = () => this.layoutStage();
    window.addEventListener('resize', onResize);
    this.offs.push(() => window.removeEventListener('resize', onResize));
    const loop = () => {
      if (this.dirty) { this.dirty = false; this.stage.setLook(lookFrom(this.app, PLAYER_OUTFIT)); }
      this.raf = requestAnimationFrame(loop);
    };
    loop();
  }

  private framingNow = TABS[0].framing;

  private layoutStage(): void {
    const w = window.innerWidth, h = window.innerHeight;
    this.stage.setAspect(w / h);
    this.stage.offsetX = w > h ? -0.45 : 0;
    this.stage.offsetY = w > h ? 0 : 0.22;
  }

  private destroy(): void {
    cancelAnimationFrame(this.raf);
    for (const off of this.offs) off();
    this.el.remove();
    document.body.classList.remove('fullscreen-ui');
    if (this.game.portrait === this.stage) this.game.portrait = undefined;
  }

  private applyOrigin(id: string, keepLook = true): void {
    const o = ORIGINS.find((x) => x.id === id)!;
    const name = this.sheet.name;
    this.sheet = emptySheet(name);
    this.sheet.baseAttrs = { ...o.attrs };
    this.sheet.tagged = [...o.tagged];
    this.sheet.traits = [...o.traits];
    this.sheet.hp = derived(this.sheet).maxHp;
    if (!keepLook) this.app = randomAppearance(o.appearanceSeed, { frame: o.frame, age: 24 });
    this.dirty = true;
  }

  private setTab(t: Tab): void {
    this.tab = t;
    const f = TABS.find((x) => x.id === t)!.framing;
    this.framingNow = f;
    this.stage.setFraming(f);
    this.renderTabs();
    this.renderBody();
    this.body.scrollTop = 0;
  }

  private onFoot(a?: string): void {
    const i = TABS.findIndex((x) => x.id === this.tab);
    if (a === 'back') { if (i > 0) this.setTab(TABS[i - 1].id); else { this.destroy(); this.onCancel(); } }
    if (a === 'next') {
      if (this.tab === 'done') this.finish();
      else this.setTab(TABS[i + 1].id);
    }
    if (a === 'rand') {
      const seed = (Math.random() * 1e9) | 0;
      const frame = new Rng(seed).chance(0.5) ? 'broad' : 'narrow';
      this.app = randomAppearance(seed, { frame, age: this.app.shape.age });
      this.dirty = true;
      this.renderBody();
    }
  }

  private finish(): void {
    const errs = validateCreation(this.sheet);
    if (errs.length) { this.renderBody(); return; }
    this.sheet.hp = derived(this.sheet).maxHp;
    this.destroy();
    this.onDone({ sheet: this.sheet, appearance: this.app, pronouns: this.pronouns });
  }

  private renderTabs(): void {
    const t = this.el.querySelector('.tabs')!;
    t.innerHTML = TABS.map((x) => `<button class="${x.id === this.tab ? 'on' : ''}" data-t="${x.id}">${x.label}</button>`).join('');
    t.querySelectorAll('button').forEach((b) => (b.onclick = () => this.setTab(b.dataset.t as Tab)));
    const next = this.el.querySelector('.go') as HTMLElement;
    next.textContent = this.tab === 'done' ? 'Step outside ›' : 'Next ›';
  }

  // ---------------------------------------------------------------------------------------------

  private renderBody(): void {
    const b = this.body;
    b.innerHTML = '';
    switch (this.tab) {
      case 'identity': return this.identityTab(b);
      case 'face': return this.faceTab(b);
      case 'hair': return this.hairTab(b);
      case 'body': return this.bodyTab(b);
      case 'attributes': return this.attrTab(b);
      case 'skills': return this.skillTab(b);
      case 'traits': return this.traitTab(b);
      case 'done': return this.doneTab(b);
    }
  }

  private h(b: HTMLElement, text: string): void {
    const h = document.createElement('h4'); h.textContent = text; b.append(h);
  }

  private slider(b: HTMLElement, label: string, value: number, min: number, max: number, step: number, set: (v: number) => void): void {
    const row = document.createElement('label');
    row.className = 'sl';
    row.innerHTML = `<span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${value}">`;
    const input = row.querySelector('input')!;
    input.oninput = () => { set(Number(input.value)); this.dirty = true; };
    b.append(row);
  }

  private chips<T extends string>(b: HTMLElement, options: readonly T[], isOn: (v: T) => boolean, toggle: (v: T) => void): void {
    const c = document.createElement('div');
    c.className = 'chips';
    for (const o of options) {
      const btn = document.createElement('button');
      btn.className = 'chip' + (isOn(o) ? ' on' : '');
      btn.textContent = STYLE_NAMES[o] ?? o;
      btn.onclick = () => { toggle(o); this.dirty = true; this.renderBody(); };
      c.append(btn);
    }
    b.append(c);
  }

  private swatches(b: HTMLElement, colors: readonly number[], current: number, set: (c: number) => void): void {
    const c = document.createElement('div');
    c.className = 'chips';
    for (const col of colors) {
      const s = document.createElement('button');
      s.className = 'sw' + (col === current ? ' on' : '');
      s.style.background = hex(col);
      s.setAttribute('aria-label', hex(col));
      s.onclick = () => { set(col); this.dirty = true; this.renderBody(); };
      c.append(s);
    }
    b.append(c);
  }

  private identityTab(b: HTMLElement): void {
    this.h(b, 'Name');
    const name = document.createElement('input');
    name.type = 'text'; name.maxLength = 24; name.value = this.sheet.name; name.placeholder = 'Your name';
    name.oninput = () => (this.sheet.name = name.value);
    b.append(name);
    this.h(b, 'Pronouns');
    this.chips(b, ['he', 'she', 'they'] as Pronouns[], (p) => p === this.pronouns, (p) => (this.pronouns = p));
    this.h(b, 'Background (sets stats; you can change everything)');
    for (const o of ORIGINS) {
      const d = document.createElement('div');
      d.className = 'trait';
      d.innerHTML = `<b>${o.name}</b><div class="desc">${o.blurb}</div>`;
      d.onclick = () => { this.applyOrigin(o.id, false); this.renderBody(); };
      b.append(d);
    }
  }

  /** Modifier sliders for the given groups; left/right pairs are merged into one "sym:" slider. */
  private modifierSliders(b: HTMLElement, groups: string[], filter?: (id: string) => boolean): void {
    const mods = humanData().m.modifiers;
    const mv = this.app.shape.modifiers;
    for (const g of groups) {
      const seen = new Set<string>();
      let header = false;
      for (const m of mods) {
        if (m.group !== g) continue;
        const side = m.id.startsWith('l-') || m.id.startsWith('r-');
        const id = side ? 'sym:' + m.id.slice(2) : m.id;
        if (seen.has(id) || (filter && !filter(id))) continue;
        seen.add(id);
        if (!header) { this.h(b, GROUP_NAMES[g] ?? g); header = true; }
        this.slider(b, modLabel(id, g), mv[id] ?? 0, m.min ? -1 : 0, 1, 0.05, (v) => { if (v === 0) delete mv[id]; else mv[id] = v; });
      }
    }
  }

  private faceTab(b: HTMLElement): void {
    const reset = document.createElement('button');
    reset.className = 'b'; reset.textContent = 'Reset face';
    reset.onclick = () => {
      for (const k of Object.keys(this.app.shape.modifiers)) if (FACE_GROUP_PREFIXES.some((p) => k.replace('sym:', '').startsWith(p))) delete this.app.shape.modifiers[k];
      this.dirty = true; this.renderBody();
    };
    b.append(reset);
    this.modifierSliders(b, ['head', 'forehead', 'eyebrows', 'eyes', 'nose', 'mouth', 'cheek', 'chin', 'ears', 'neck']);
  }

  private hairTab(b: HTMLElement): void {
    this.h(b, 'Hair');
    this.chips(b, HAIR_STYLES, (s) => s === this.app.hair.style, (s) => (this.app.hair.style = s));
    this.h(b, 'Hair colour');
    this.swatches(b, HAIR_COLORS, this.app.hair.color, (c) => (this.app.hair.color = c));
    this.h(b, 'Eyebrows');
    this.chips(b, BROW_STYLES, (s) => s === this.app.brows, (s) => (this.app.brows = s));
    this.h(b, 'Eyes');
    this.chips(b, EYE_COLORS, (s) => s === this.app.eyes, (s) => (this.app.eyes = s));
    this.h(b, 'Facial hair');
    this.chips(b, FACIAL_HAIR, (s) => s === this.app.facialHair, (s) => (this.app.facialHair = s));
    this.h(b, 'Skin');
    this.slider(b, 'Freckles', this.app.freckles, 0, 1, 0.05, (v) => (this.app.freckles = v));
    this.h(b, 'Scars (up to 3)');
    this.chips(b, SCARS, (s) => this.app.scars.includes(s), (s) => {
      this.app.scars = this.app.scars.includes(s) ? this.app.scars.filter((x) => x !== s) : [...this.app.scars, s].slice(-3);
    });
    this.h(b, 'Tattoos (up to 3)');
    this.chips(b, TATTOOS, (s) => this.app.tattoos.includes(s), (s) => {
      this.app.tattoos = this.app.tattoos.includes(s) ? this.app.tattoos.filter((x) => x !== s) : [...this.app.tattoos, s].slice(-3);
    });
    this.h(b, 'Ink');
    this.swatches(b, [0x2a3a4a, 0x1a1a1a, 0x5a2a2a, 0x2a4a3a, 0x6a5a2a], this.app.tattooColor, (c) => (this.app.tattooColor = c));
  }

  private bodyTab(b: HTMLElement): void {
    const sh = this.app.shape;
    this.h(b, 'Build');
    this.slider(b, 'Feminine ↔ Masculine', sh.gender, 0, 1, 0.01, (v) => (sh.gender = v));
    const ageRow = document.createElement('div');
    ageRow.className = 'desc';
    ageRow.textContent = `Age ${sh.age}`;
    this.slider(b, 'Age', sh.age, 18, 40, 1, (v) => { sh.age = v; ageRow.textContent = `Age ${v}`; });
    b.append(ageRow);
    this.slider(b, 'Height', sh.height, 0, 1, 0.01, (v) => (sh.height = v));
    this.slider(b, 'Weight', sh.weight, 0, 1, 0.01, (v) => (sh.weight = v));
    this.slider(b, 'Muscle', sh.muscle, 0, 1, 0.01, (v) => (sh.muscle = v));
    this.slider(b, 'Bust size', sh.breastSize, 0, 1, 0.01, (v) => (sh.breastSize = v));
    this.slider(b, 'Bust firmness', sh.breastFirmness, 0, 1, 0.01, (v) => (sh.breastFirmness = v));
    this.h(b, 'Ancestry (blend)');
    this.slider(b, 'African', sh.african, 0, 1, 0.01, (v) => (sh.african = v));
    this.slider(b, 'East Asian', sh.asian, 0, 1, 0.01, (v) => (sh.asian = v));
    this.slider(b, 'European', sh.caucasian, 0, 1, 0.01, (v) => (sh.caucasian = v));
    this.h(b, 'Skin');
    this.slider(b, 'Skin tone', this.app.skinTone, 0, 1, 0.01, (v) => (this.app.skinTone = v));
    this.chips(b, ['0', '1', '2'] as const, (s) => Number(s) === this.app.skinVariant, (s) => (this.app.skinVariant = Number(s)));
    this.modifierSliders(b, ['torso', 'hip', 'stomach', 'buttocks', 'armslegs'], (id) => !/fingers|trans|valgus|pregnant|navel/.test(id));
  }

  private attrTab(b: HTMLElement): void {
    const left = creationPointsLeft(this.sheet.baseAttrs);
    const pts = document.createElement('div');
    pts.className = 'pts';
    pts.textContent = `Points remaining: ${left}`;
    b.append(pts);
    for (const a of ATTRIBUTES) {
      const info = ATTRIBUTE_INFO[a];
      const row = document.createElement('div');
      row.className = 'row2';
      row.innerHTML = `<div><b>${info.name}</b><div class="desc">${info.desc}</div></div>
        <button class="pm" data-d="-1">−</button><div class="v">${this.sheet.baseAttrs[a]}</div><button class="pm" data-d="1">+</button>`;
      row.querySelectorAll('button').forEach((btn) => (btn.onclick = () => {
        const d = Number(btn.dataset.d);
        const v = this.sheet.baseAttrs[a] + d;
        if (v < ATTR_MIN || v > ATTR_MAX || (d > 0 && creationPointsLeft(this.sheet.baseAttrs) <= 0)) return;
        this.sheet.baseAttrs[a] = v;
        this.renderBody();
      }));
      b.append(row);
    }
    const d = derived(this.sheet);
    const dv = document.createElement('div');
    dv.className = 'derived';
    dv.innerHTML = `<span>Health</span><span>${d.maxHp}</span><span>Action points</span><span>${d.ap}</span><span>Carry</span><span>${d.carry} kg</span>
      <span>Initiative</span><span>${d.initiative}</span><span>Critical chance</span><span>${d.crit}%</span><span>Skill pts / level</span><span>${d.skillPointsPerLevel}</span>
      <span>Companions</span><span>${d.companions}</span><span>Rad resist</span><span>${d.radResist}%</span>`;
    b.append(dv);
  }

  private skillTab(b: HTMLElement): void {
    const pts = document.createElement('div');
    pts.className = 'pts';
    pts.textContent = `Tag ${TAG_COUNT} skills (+20%, grow twice as fast): ${this.sheet.tagged.length}/${TAG_COUNT}`;
    b.append(pts);
    const vals = skills(this.sheet);
    let group = '';
    for (const k of SKILLS) {
      const info = SKILL_INFO[k];
      if (info.group !== group) { group = info.group; this.h(b, group === 'combat' ? 'Combat' : group === 'active' ? 'Active' : 'Social & world'); }
      const row = document.createElement('div');
      row.className = 'skill' + (this.sheet.tagged.includes(k) ? ' on' : '');
      row.innerHTML = `<div><b>${info.name}</b><div class="desc">${info.desc}</div></div><div>${vals[k]}%</div>`;
      row.onclick = () => {
        const t = this.sheet.tagged;
        if (t.includes(k)) this.sheet.tagged = t.filter((x) => x !== k);
        else if (t.length < TAG_COUNT) t.push(k);
        this.renderBody();
      };
      b.append(row);
    }
  }

  private traitTab(b: HTMLElement): void {
    const pts = document.createElement('div');
    pts.className = 'pts';
    pts.textContent = `Optional: choose up to 2 traits (${this.sheet.traits.length}/2). Each has a cost.`;
    b.append(pts);
    for (const t of Object.values(TRAITS)) {
      const d = document.createElement('div');
      d.className = 'trait' + (this.sheet.traits.includes(t.id) ? ' on' : '');
      d.innerHTML = `<b>${t.name}</b><div class="desc">${t.desc}</div>`;
      d.onclick = () => {
        const tr = this.sheet.traits;
        if (tr.includes(t.id)) this.sheet.traits = tr.filter((x) => x !== t.id);
        else if (tr.length < 2) tr.push(t.id);
        this.renderBody();
      };
      b.append(d);
    }
  }

  private doneTab(b: HTMLElement): void {
    const a = attrs(this.sheet), d = derived(this.sheet), k = skills(this.sheet);
    const errs = validateCreation(this.sheet);
    b.innerHTML = `<h4>${this.sheet.name ? escapeHtml(this.sheet.name) : '(unnamed)'} · ${this.pronouns}/${this.pronouns === 'he' ? 'him' : this.pronouns === 'she' ? 'her' : 'them'}</h4>
      <div class="derived">${ATTRIBUTES.map((x) => `<span>${ATTRIBUTE_INFO[x].name}</span><span>${a[x]}</span>`).join('')}</div>
      <h4>Tagged</h4><div>${this.sheet.tagged.map((t) => `${SKILL_INFO[t].name} ${k[t]}%`).join(' · ') || '—'}</div>
      <h4>Traits</h4><div>${this.sheet.traits.map((t) => TRAITS[t].name).join(' · ') || 'None'}</div>
      <h4>Condition</h4><div>Health ${d.maxHp} · AP ${d.ap} · Carry ${d.carry} kg</div>
      <div class="desc" style="margin-top:12px">${Object.keys(PERKS).length} perks become available as you level.</div>
      ${errs.length ? `<div class="err">${errs.join('<br>')}</div>` : ''}`;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
