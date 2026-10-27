import type { Game } from '../game';
import { clockString } from '../core/state';
import { SLOTS, exportSave, pickSaveFile, type SlotId } from '../save/saves';
import type { QualityLevel } from '../render/quality';
import { DEFAULT_KEYS, KEY_ACTION_NAMES, keyLabel, settings, updateSettings, type Difficulty, type KeyAction } from './settings';

import { canInstall, onInstallChange, promptInstall } from './app';

type Screen = 'title' | 'pause' | 'save' | 'load' | 'settings';

const SLOT_NAMES: Record<SlotId, string> = { auto: 'Autosave', quick: 'Quicksave', slot1: 'Slot 1', slot2: 'Slot 2', slot3: 'Slot 3' };

function fmtPlaytime(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/** Title screen, pause menu, save/load and settings. Pure DOM, CRT-styled. */
export class Menu {
  private root: HTMLElement;
  private stack: Screen[] = [];
  onNewGame?: () => void;

  constructor(private game: Game) {
    this.root = document.createElement('div');
    this.root.className = 'overlay hidden';
    document.body.appendChild(this.root);
    // The browser's install offer usually arrives after the title is up; refresh it so "Install App" appears.
    onInstallChange(() => { if (this.stack[this.stack.length - 1] === 'title') void this.render(); });
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'Escape') return;
      if (!this.stack.length) this.open('pause');
      else if (this.stack[this.stack.length - 1] !== 'title') this.back();
    });
  }

  get isOpen(): boolean { return this.stack.length > 0; }

  open(s: Screen): void {
    this.stack.push(s);
    this.game.paused = true;
    void this.render();
  }

  back(): void {
    this.stack.pop();
    if (!this.stack.length) this.close();
    else void this.render();
  }

  close(): void {
    this.stack = [];
    this.root.classList.add('hidden');
    this.game.paused = false;
  }

  private async render(): Promise<void> {
    const s = this.stack[this.stack.length - 1];
    this.root.classList.remove('hidden');
    const panel = document.createElement('div');
    panel.className = 'menu crt';
    this.root.replaceChildren(panel);
    const item = (label: string, fn: () => void, disabled = false) => {
      const b = document.createElement('button');
      b.className = 'item'; b.textContent = label; b.disabled = disabled; b.onclick = fn;
      return b;
    };
    const items = document.createElement('div');
    items.className = 'items';

    if (s === 'title') {
      panel.innerHTML = `<h1>THE SECOND FACE</h1><div class="sub">CISTERN 9 · YEAR 90 AFTER THE BURN</div>`;
      const latest = await this.game.saves?.latest();
      items.append(
        item('Continue', async () => { if (latest) { this.close(); await this.game.loadSlot(latest.slot); } }, !latest),
        item('New Game', () => { this.close(); this.onNewGame?.(); }),
        item('Load Game', () => this.open('load')),
        item('Settings', () => this.open('settings')),
      );
      if (canInstall()) items.append(item('Install App', async () => { await promptInstall(); void this.render(); }));
      panel.append(items);
    } else if (s === 'pause') {
      panel.innerHTML = `<h2>Paused</h2>`;
      items.append(
        item('Resume', () => this.close()),
        item('Save Game', () => this.open('save')),
        item('Load Game', () => this.open('load')),
        item('Settings', () => this.open('settings')),
        item('Quit to Title', () => { this.stack = []; this.open('title'); }),
      );
      panel.append(items);
    } else if (s === 'save' || s === 'load') {
      panel.innerHTML = `<h2>${s === 'save' ? 'Save Game' : 'Load Game'}</h2>`;
      const metas = (await this.game.saves?.list()) ?? {};
      const slots = s === 'save' ? SLOTS.filter((x) => x !== 'auto') : SLOTS;
      for (const slot of slots) {
        const m = metas[slot];
        const el = document.createElement('div');
        el.className = 'slot';
        el.innerHTML = `${m?.thumb ? `<img alt="" src="${m.thumb}">` : '<div class="noimg"></div>'}
          <div><div class="t">${SLOT_NAMES[slot]}${m ? ' — ' + escapeHtml(m.locationName) : ' — empty'}</div>
          <div class="d">${m ? `${clockString(m.minutes)} · played ${fmtPlaytime(m.playtimeSec)}<br>${new Date(m.timestamp).toLocaleString()}` : ''}</div></div>
          <div class="acts"></div>`;
        const acts = el.querySelector('.acts')!;
        const btn = (label: string, fn: () => void) => { const b = document.createElement('button'); b.textContent = label; b.onclick = fn; acts.append(b); };
        if (s === 'save') btn(m ? 'Overwrite' : 'Save here', async () => { this.close(); await this.game.save(slot); });
        if (s === 'load' && m) btn('Load', async () => { this.close(); await this.game.loadSlot(slot); });
        if (m) btn('Export', async () => { const f = await this.game.saves?.read(slot); if (f) exportSave(f); });
        if (m && slot !== 'auto') btn('Delete', async () => { if (confirm(`Delete ${SLOT_NAMES[slot]}?`)) { await this.game.saves?.remove(slot); void this.render(); } });
        panel.append(el);
      }
      const row = document.createElement('div');
      row.className = 'row';
      const imp = document.createElement('button');
      imp.textContent = 'Import save file…';
      imp.onclick = async () => {
        try { const f = await pickSaveFile(); this.close(); await this.game.loadFile(f); }
        catch (e) { alert((e as Error).message); }
      };
      const back = document.createElement('button');
      back.textContent = 'Back';
      back.onclick = () => this.back();
      row.append(imp, back);
      panel.append(row);
    } else if (s === 'settings') {
      panel.innerHTML = `<h2>Settings</h2>
        <label class="opt">Graphics quality <select class="q"><option value="low">Low (phones)</option><option value="medium">Medium</option><option value="high">High</option></select></label>`;
      const sel = panel.querySelector('.q') as HTMLSelectElement;
      sel.value = this.game.quality;
      sel.onchange = () => this.game.applyQuality(sel.value as QualityLevel);
      for (const [k, label] of [['master', 'Master volume'], ['music', 'Music'], ['ambience', 'Ambience'], ['sfx', 'Effects']] as const) {
        const l = document.createElement('label');
        l.className = 'opt';
        l.innerHTML = `${label} <input type="range" min="0" max="1" step="0.05" value="${this.game.audio.vol[k]}" style="width:50%;accent-color:#5aff9a">`;
        const inp = l.querySelector('input')!;
        inp.oninput = () => this.game.audio.setVolumes({ [k]: Number(inp.value) });
        panel.append(l);
      }
      const st = settings();
      const sel2 = (label: string, opts: [string, string][], value: string, on: (v: string) => void) => {
        const l = document.createElement('label'); l.className = 'opt';
        l.innerHTML = `${label} <select>${opts.map(([v, t]) => `<option value="${v}" ${v === value ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
        const se = l.querySelector('select')!; se.onchange = () => on(se.value); panel.append(l);
      };
      const tog = (label: string, value: boolean, on: (v: boolean) => void) => {
        const l = document.createElement('label'); l.className = 'opt';
        l.innerHTML = `${label} <input type="checkbox" ${value ? 'checked' : ''} style="width:24px;height:24px;accent-color:#5aff9a">`;
        const inp = l.querySelector('input')!; inp.onchange = () => on(inp.checked); panel.append(l);
      };
      panel.insertAdjacentHTML('beforeend', '<h2 style="margin-top:14px">Play</h2>');
      sel2('Difficulty (enemy aim and damage only)', [['story', 'Story'], ['normal', 'Normal'], ['hard', 'Hard']], st.difficulty, (v) => { updateSettings({ difficulty: v as Difficulty }); this.game.syncPacing(); });
      sel2('Combat speed', [['1', 'Normal'], ['1.5', 'Fast'], ['2.5', 'Very fast']], String(st.combatSpeed), (v) => { updateSettings({ combatSpeed: Number(v) }); this.game.syncPacing(); });
      tog('Skip button through lines already heard', st.skipSeen, (v) => updateSettings({ skipSeen: v }));
      tog('Show tips', st.tips, (v) => updateSettings({ tips: v }));
      panel.insertAdjacentHTML('beforeend', '<h2 style="margin-top:14px">Display</h2>');
      sel2('Text size', [['1', 'Normal'], ['1.15', 'Large'], ['1.3', 'Larger']], String(st.textScale), (v) => updateSettings({ textScale: Number(v) }));
      tog('High contrast', st.highContrast, (v) => updateSettings({ highContrast: v }));
      panel.insertAdjacentHTML('beforeend', '<h2 style="margin-top:14px">Keys</h2><p class="sub" style="text-align:left">Click a key, then press the new one.</p>');
      for (const a of Object.keys(KEY_ACTION_NAMES) as KeyAction[]) {
        const l = document.createElement('label'); l.className = 'opt';
        l.innerHTML = `${KEY_ACTION_NAMES[a]} <button class="key">${keyLabel(st.keys[a])}</button>`;
        const b = l.querySelector('button')!;
        b.onclick = () => {
          b.textContent = '…';
          const once = (e: KeyboardEvent) => { e.preventDefault(); e.stopImmediatePropagation(); window.removeEventListener('keydown', once, true); if (e.code !== 'Escape') updateSettings({ keys: { ...settings().keys, [a]: e.code } }); b.textContent = keyLabel(settings().keys[a]); };
          window.addEventListener('keydown', once, true);
        };
        panel.append(l);
      }
      const row = document.createElement('div');
      row.className = 'row';
      const reset = document.createElement('button');
      reset.textContent = 'Reset keys'; reset.onclick = () => { updateSettings({ keys: { ...DEFAULT_KEYS } }); void this.render(); };
      const back = document.createElement('button');
      back.textContent = 'Back'; back.onclick = () => this.back();
      row.append(reset, back);
      panel.append(row);
    }
    (panel.querySelector('button:not([disabled])') as HTMLElement | null)?.focus({ preventScroll: true });
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
