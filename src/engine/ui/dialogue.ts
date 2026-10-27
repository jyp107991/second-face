import type { Game } from '../game';
import { DIALOGUES, NPCS } from '../../content';
import { lookFrom } from '../assets/humanoid';
import { DialogueRunner, type NodeView } from '../dialogue/dialogue';
import type { NpcRuntime } from '../npc/spawn';
import { FigureView } from '../render/figureView';
import { GARMENTS } from '../data/garments';
import { dayOf } from '../core/state';
import { settings, tipOnce } from './settings';

/**
 * Conversation panel: the world stays in view, the camera eases to frame the two of you, and the speaker's lit
 * close-up sits beside the exchange (a small live view of its own). No black screen.
 * Options show their checks up front ([Speech 50], green when you meet it, red when you don't) and why
 * a difficulty changed. Number keys pick options; Escape leaves when an exit option exists.
 */
export class DialogueUi {
  private el?: HTMLElement;
  private runner?: DialogueRunner;
  private npc?: NpcRuntime;
  /** Speaker name for tree-only conversations (terminals, examined things). */
  private title = '';
  private history: { who: string; text: string; pc?: boolean }[] = [];
  private face?: FigureView;
  private framed = false;

  constructor(private game: Game) {
    game.on('openDialogue', ({ npc, tree, name }) => { if (npc) this.open(npc); else if (tree) this.openTree(tree, name ?? ''); });
    window.addEventListener('keydown', (e) => {
      if (!this.el) return;
      if (e.code === 'Escape') {
        const i = this.runner?.view()?.options.findIndex((o) => o.exit && !o.locked) ?? -1;
        if (i >= 0) { e.preventDefault(); e.stopImmediatePropagation(); this.pick(i); }
        return;
      }
      const n = Number(e.key);
      if (n >= 1 && n <= 9) { e.preventDefault(); this.pick(n - 1); }
    }, true);
  }

  /** A conversation with no face: a terminal, a sealed door, a body on a cot. */
  openTree(tree: string, name: string): void {
    const def = DIALOGUES[tree];
    if (!def) return;
    this.close();
    this.npc = undefined;
    this.title = name;
    this.history = [];
    this.runner = new DialogueRunner(def, this.game.state, { ...this.hostFns(), checkXp: 15 });
    if (this.runner.ended) { this.runner = undefined; return; }
    this.game.paused = true;
    this.game.talking = true;
    this.el = document.createElement('div');
    this.el.className = 'dlg noface';
    this.el.innerHTML = '<div class="dlg-panel"><div class="dlg-face"></div><div class="dlg-body"></div></div>';
    document.body.appendChild(this.el);
    this.render();
  }

  open(npc: NpcRuntime): void {
    const tree = npc.dialogue ?? npc.def.dialogue;
    const def = tree ? DIALOGUES[tree] : undefined;
    if (!def) return;
    this.close();
    this.npc = npc;
    this.title = npc.def.name;
    this.history = [];
    this.runner = new DialogueRunner(def, this.game.state, { ...this.hostFns(), checkXp: 15 });
    this.game.paused = true;
    this.game.talking = true;
    this.el = document.createElement('div');
    this.el.className = 'dlg';
    this.el.innerHTML = '<div class="dlg-panel"><div class="dlg-face"></div><div class="dlg-body"></div></div>';
    document.body.appendChild(this.el);
    // The speaker, lit, beside the panel; eyewear comes off so the face reads.
    const outfit = { ...npc.outfit, layers: (npc.outfit.layers ?? []).filter((l) => GARMENTS[l.name]?.slot !== 'eyes'), gear: (npc.outfit.gear ?? []).filter((g) => g.kind !== 'goggles') };
    this.face = new FigureView(this.el.querySelector('.dlg-face')!, 0, 0x1a1512);
    this.face.stage.offsetY = 0.02;
    this.face.stage.yaw = -0.22;
    this.face.setLook(lookFrom(npc.appearance, outfit));
    this.frameSpeakers(npc);
    this.render();
    this.remember(npc);
    const tip = tipOnce('dialogue', 'Checks like [Speech 50] are fixed thresholds — no dice. Green ✓ means you meet it; red ✗ still leads somewhere.');
    if (tip) this.game.emit('message', { text: tip });
  }

  /** Note the person in the notebook and sketch them from the close-up. */
  private remember(npc: NpcRuntime): void {
    const st = this.game.state, w = st.world;
    if (npc.def.minor) return;
    (w.met ??= {})[npc.def.id] ??= { name: npc.def.name, day: dayOf(st.minutes), where: this.game.locationName };
    if (st.sketches?.[npc.def.id]) return;
    window.setTimeout(() => {
      if (!this.el || !this.face) return;
      (st.sketches ??= {})[npc.def.id] = sketchify(this.face.snapshot(150, 190));
    }, 1200);
  }

  /** Turn the two of you to face each other and ease the camera to frame you both above the panel. */
  private frameSpeakers(npc: NpcRuntime): void {
    const g = this.game, p = g.player;
    if (!p) return;
    const a = p.object.position, b = npc.actor.object.position;
    npc.actor.faceTowards(a.x, a.z);
    p.faceTowards(b.x, b.z);
    npc.talking = true;
    npc.actor.idle = 'talk';
    p.idle = 'talk';
    g.cam.pan.set((b.x - a.x) / 2, 0, (b.z - a.z) / 2);
    g.cam.panScreen(0, -window.innerHeight * 0.1, window.innerHeight);
    g.cam.zoomBy(0.78);
    this.framed = true;
  }

  private hostFns() {
    const q = this.game.quests;
    return {
      questStart: (id: string) => q.questStart(id),
      questStage: (id: string, s: string) => q.questStage(id, s),
      questEnd: (id: string, st: 'done' | 'failed') => q.questEnd(id, st),
      xp: (amount: number, levels: number) => this.game.logicHost.xp?.(amount, levels),
      event: (name: string, data?: unknown) => {
        if (name === 'barter' && this.npc) { const npc = this.npc; window.setTimeout(() => { this.close(); this.game.openBarter(npc); }); return; }
        if (name === 'surgery' && this.npc) { const npc = this.npc; window.setTimeout(() => { this.close(); this.game.openSurgery(npc); }); return; }
        if (name === 'dust' && this.npc) { const npc = this.npc, d = (data ?? {}) as { stake?: number; prize?: import('../world/logic').DustPrize }; window.setTimeout(() => { this.close(); this.game.emit('openDust', { npc, stake: Number(d.stake ?? 5), prize: d.prize }); }); return; }
        if (name === 'camp') { window.setTimeout(() => { this.close(); this.game.openCamp(true); }); return; }
        // A fight with the person you are talking to; `{ pit: { win, lose } }` makes it a pit bout (nobody dies; the stake pays by effects).
        if (name === 'fight' && this.npc) { const npc = this.npc, d = (data ?? {}) as { pit?: { win?: import('../world/logic').Effect[]; lose?: import('../world/logic').Effect[] } }; window.setTimeout(() => { this.close(); if (d.pit) { this.game.startCombat(npc, d.pit); return; } npc.hostile = true; this.game.refreshHostility(); this.game.startCombat(npc); }); return; }
        // A recorded memory: close this conversation, turn the picture cold, and play the memory's tree.
        if (name === 'reverie') { const d = (data ?? {}) as { tree: string; name?: string }; window.setTimeout(() => { this.close(); this.game.reverie = true; this.openTree(d.tree, d.name ?? 'Reverie'); }); return; }
        if (name === 'map') { window.setTimeout(() => { this.close(); this.game.emit('openMap', {}); }); return; }
        // District transit and other scripted moves between maps of the same place: { location, spawn?, minutes? }.
        if (name === 'goto') { const d = (data ?? {}) as { location: string; spawn?: string; minutes?: number }; window.setTimeout(() => { this.close(); if (d.minutes) this.game.state.minutes += d.minutes; void this.game.loadLocation(d.location, d.spawn); }); return; }
        if (name === 'heal') { this.game.healParty(); return; }
        this.game.logicHost.event?.(name, data);
      },
    };
  }

  close(): void {
    if (!this.el) return;
    this.el.remove();
    this.el = undefined;
    this.runner = undefined;
    this.face?.dispose();
    this.face = undefined;
    if (this.npc) { this.npc.talking = false; this.npc.actor.idle = 'stand'; }
    if (this.game.player) this.game.player.idle = 'stand';
    if (this.framed) { this.game.cam.zoomBy(1 / 0.78); this.game.cam.recentre(); this.framed = false; }
    this.game.talking = false;
    this.game.reverie = false;
    this.game.paused = false;
    this.game.quests.update();
    this.game.syncParty();
    this.game.syncPlacements();
    // A conversation can turn a camp hostile ("get out before I change my mind").
    const turned = this.game.refreshHostility();
    if (turned.length && !this.game.encounter.active) this.game.startCombat(turned[0]);
  }

  private pick(i: number): void {
    const r = this.runner, v = r?.view();
    if (!r || !v || !v.options[i] || v.options[i].locked) return;
    const o = v.options[i];
    this.history.push({ who: this.game.state.pc.sheet.name || 'You', text: o.text, pc: true });
    this.log(this.game.state.pc.sheet.name || 'You', o.text);
    const passed = r.choose(o.id);
    if (o.checkLabel) this.history.push({ who: '', text: passed ? `[${o.checkLabel} — passed]` : `[${o.checkLabel} — failed]` });
    this.game.quests.update();
    if (r.ended) { this.close(); return; }
    this.render();
  }

  private render(): void {
    const v = this.runner?.view();
    if (!this.el || !v) { this.close(); return; }
    this.pushLine(v);
    const name = this.speakerName(v.speaker);
    const body = this.el.querySelector('.dlg-body')!;
    body.innerHTML = `
        <div class="dlg-hist">${this.history.slice(-8, -1).map((h) => `<p class="${h.pc ? 'pc' : h.who ? '' : 'sys'}">${h.who ? `<b>${esc(h.who)}:</b> ` : ''}${esc(h.text)}</p>`).join('')}</div>
        <div class="dlg-name">${esc(name)}${v.seen && settings().skipSeen && v.options.length === 1 && !v.options[0].checkLabel ? ' <button class="skip" data-skip="1">skip ▸▸</button>' : ''}</div>
        <div class="dlg-text">${esc(v.text)}</div>
        ${v.passives.map((p) => `<div class="dlg-passive"><b>${esc(p.label)}</b> — ${esc(p.text)}</div>`).join('')}
        <ol class="dlg-opts">${v.options.map((o, i) => `
          <li class="${o.locked ? 'locked' : ''} ${o.seen ? 'seen' : ''}" data-i="${i}">
            <span class="n">${i + 1}.</span>
            ${o.checkLabel ? `<span class="chk ${o.checkMet ? 'ok' : 'bad'}">[${esc(o.checkLabel)} ${o.checkMet ? '✓' : '✗'}]</span> ` : ''}${esc(o.text)}
            ${o.checkNotes.length ? `<span class="why">${o.checkNotes.map(esc).join(' · ')}</span>` : ''}
          </li>`).join('')}</ol>`;
    this.el.querySelectorAll<HTMLElement>('.dlg-opts li').forEach((li) => li.addEventListener('click', () => this.pick(Number(li.dataset.i))));
    this.el.querySelector('[data-skip]')?.addEventListener('click', () => this.skip());
  }

  /** Run through lines already heard: single uncheck options, until a real choice or new text. */
  private skip(): void {
    for (let guard = 0; guard < 12; guard++) {
      const v = this.runner?.view();
      if (!v || !v.seen || v.options.length !== 1 || v.options[0].checkLabel || v.options[0].locked) break;
      this.pick(0);
      if (!this.el) return;
    }
    this.render();
  }

  private log(who: string, text: string): void {
    const w = this.game.state.world;
    (w.log ??= []).push({ who, text, minutes: this.game.state.minutes });
    if (w.log.length > 300) w.log.splice(0, w.log.length - 300);
  }

  private lastText = '';
  private pushLine(v: NodeView): void {
    if (v.text === this.lastText) return;
    this.lastText = v.text;
    this.history.push({ who: this.speakerName(v.speaker), text: v.text });
    this.log(this.speakerName(v.speaker), v.text);
  }

  private speakerName(id: string): string {
    if (id === 'narrator') return '';
    if (id === 'pc') return this.game.state.pc.sheet.name || 'You';
    if (this.npc && (id === this.npc.def.id || id === this.npc.id)) return this.npc.def.name;
    return NPCS[id]?.name ?? (id === this.runner?.def.owner ? this.title : id);
  }
}

/** Turn a portrait grab into a pencil sketch: soft graphite tone plus darkened edges, on warm paper. */
export function sketchify(c: HTMLCanvasElement): string {
  const ctx = c.getContext('2d')!;
  const { width: w, height: h } = c;
  const img = ctx.getImageData(0, 0, w, h), px = img.data;
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) lum[i] = (0.3 * px[i * 4] + 0.59 * px[i * 4 + 1] + 0.11 * px[i * 4 + 2]) / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const l = (dx: number, dy: number) => lum[Math.min(h - 1, Math.max(0, y + dy)) * w + Math.min(w - 1, Math.max(0, x + dx))];
    const gx = l(1, 0) - l(-1, 0) + 0.5 * (l(1, 1) - l(-1, 1) + l(1, -1) - l(-1, -1));
    const gy = l(0, 1) - l(0, -1) + 0.5 * (l(1, 1) - l(1, -1) + l(-1, 1) - l(-1, -1));
    const edge = Math.min(1, Math.hypot(gx, gy) * 3);
    // Light tonal wash (lifted shadows) under the edge strokes; dark background fades to paper.
    const tone = Math.min(1, 0.55 + lum[i] * 0.9);
    let v = Math.max(0, tone - edge * 0.75);
    // The dark studio background becomes blank paper.
    const bg = Math.max(0, Math.min(1, (0.16 - lum[i]) / 0.08));
    v = v * (1 - bg) + bg;
    const paper = [233, 223, 199];
    px[i * 4] = paper[0] * v; px[i * 4 + 1] = paper[1] * v; px[i * 4 + 2] = paper[2] * v * 0.97;
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL('image/jpeg', 0.7);
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}
