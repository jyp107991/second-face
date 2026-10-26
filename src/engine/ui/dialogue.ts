import type { Game } from '../game';
import { DIALOGUES } from '../../content';
import { lookFrom } from '../assets/humanoid';
import { DialogueRunner, type NodeView } from '../dialogue/dialogue';
import type { NpcRuntime } from '../npc/spawn';
import { PortraitStage } from '../render/portrait';

/**
 * Conversation screen: the speaker in a lit close-up (portrait stage) with the exchange below.
 * Options show their checks up front ([Speech 50], green when you meet it, red when you don't) and why
 * a difficulty changed. Number keys pick options; Escape leaves when an exit option exists.
 */
export class DialogueUi {
  private el?: HTMLElement;
  private runner?: DialogueRunner;
  private npc?: NpcRuntime;
  private history: { who: string; text: string; pc?: boolean }[] = [];

  constructor(private game: Game) {
    game.on('openDialogue', ({ npc }) => this.open(npc));
    window.addEventListener('keydown', (e) => {
      if (!this.el) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 9) { e.preventDefault(); this.pick(n - 1); }
    }, true);
  }

  open(npc: NpcRuntime): void {
    const def = npc.def.dialogue ? DIALOGUES[npc.def.dialogue] : undefined;
    if (!def) return;
    this.close();
    this.npc = npc;
    this.history = [];
    this.runner = new DialogueRunner(def, this.game.state, { ...this.hostFns(), checkXp: 15 });
    const stage = new PortraitStage(0x0f0c09);
    stage.setLook(lookFrom(npc.appearance, npc.def.outfit));
    stage.setFraming(0, true);
    stage.offsetY = 0.22;
    stage.yaw = -0.25;
    this.game.portrait = stage;
    this.game.paused = true;
    this.el = document.createElement('div');
    this.el.className = 'dlg';
    document.body.appendChild(this.el);
    this.game.resize();
    this.render();
  }

  private hostFns() {
    const q = this.game.quests;
    return {
      questStart: (id: string) => q.questStart(id),
      questStage: (id: string, s: string) => q.questStage(id, s),
      questEnd: (id: string, st: 'done' | 'failed') => q.questEnd(id, st),
      xp: (amount: number, levels: number) => this.game.logicHost.xp?.(amount, levels),
      event: (name: string, data?: unknown) => this.game.logicHost.event?.(name, data),
    };
  }

  close(): void {
    if (!this.el) return;
    this.el.remove();
    this.el = undefined;
    this.runner = undefined;
    this.game.portrait = undefined;
    this.game.paused = false;
    this.game.quests.update();
  }

  private pick(i: number): void {
    const r = this.runner, v = r?.view();
    if (!r || !v || !v.options[i] || v.options[i].locked) return;
    const o = v.options[i];
    this.history.push({ who: this.game.state.pc.sheet.name || 'You', text: o.text, pc: true });
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
    this.el.innerHTML = `
      <div class="dlg-panel">
        <div class="dlg-hist">${this.history.slice(-8, -1).map((h) => `<p class="${h.pc ? 'pc' : h.who ? '' : 'sys'}">${h.who ? `<b>${esc(h.who)}:</b> ` : ''}${esc(h.text)}</p>`).join('')}</div>
        <div class="dlg-name">${esc(name)}</div>
        <div class="dlg-text">${esc(v.text)}</div>
        ${v.passives.map((p) => `<div class="dlg-passive"><b>${esc(p.label)}</b> — ${esc(p.text)}</div>`).join('')}
        <ol class="dlg-opts">${v.options.map((o, i) => `
          <li class="${o.locked ? 'locked' : ''} ${o.seen ? 'seen' : ''}" data-i="${i}">
            <span class="n">${i + 1}.</span>
            ${o.checkLabel ? `<span class="chk ${o.checkMet ? 'ok' : 'bad'}">[${esc(o.checkLabel)}]</span> ` : ''}${esc(o.text)}
            ${o.checkNotes.length ? `<span class="why">${o.checkNotes.map(esc).join(' · ')}</span>` : ''}
          </li>`).join('')}</ol>
      </div>`;
    this.el.querySelectorAll<HTMLElement>('.dlg-opts li').forEach((li) => li.addEventListener('click', () => this.pick(Number(li.dataset.i))));
  }

  private lastText = '';
  private pushLine(v: NodeView): void {
    if (v.text === this.lastText) return;
    this.lastText = v.text;
    this.history.push({ who: this.speakerName(v.speaker), text: v.text });
  }

  private speakerName(id: string): string {
    if (id === 'narrator') return '';
    if (id === 'pc') return this.game.state.pc.sheet.name || 'You';
    return this.npc && (id === this.npc.def.id || id === this.npc.id) ? this.npc.def.name : id;
  }
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}
