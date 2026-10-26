import type { Game } from '../game';
import type { NpcRuntime } from '../npc/spawn';
import { aiStep, bank, newDust, nerveFor, roll, type DustState } from '../minigames/dust';
import { apply, type DustPrize } from '../world/logic';

/** The Dust table: scores, your run, the dice, Roll / Bank, and the opponent's turn played out in front of you. */
export class DustUi {
  private el?: HTMLElement;
  private s?: DustState;
  private npc?: NpcRuntime;
  private busy = false;
  private prize?: DustPrize;

  constructor(private game: Game) {
    game.on('openDust', ({ npc, stake, prize }) => this.open(npc, stake, prize));
  }

  open(npc: NpcRuntime, stake: number, prize?: DustPrize): void {
    const g = this.game.state;
    if (this.el) return;
    this.prize = prize;
    if (!prize) {
      if (g.pc.inventory.tolls < stake) { this.game.emit('message', { text: `You need ${stake} Tolls to sit down.` }); return; }
      if (npc.combatant.inv.tolls < stake) { this.game.emit('message', { text: `${npc.def.name} can't cover the stake.` }); return; }
      g.pc.inventory.tolls -= stake;
      npc.combatant.inv.tolls -= stake;
    }
    this.npc = npc;
    this.s = newDust(g.pc.sheet.name || 'You', npc.def.name, nerveFor(npc.def.courage ?? 50, 50), stake);
    this.el = document.createElement('div');
    this.el.className = 'wl';
    document.body.appendChild(this.el);
    this.game.paused = true;
    this.render();
  }

  private close(): void {
    this.el?.remove();
    this.el = undefined;
    this.s = undefined;
    this.game.paused = false;
  }

  private finish(): void {
    const s = this.s!, g = this.game.state, pot = s.stake * 2;
    if (this.prize) {
      apply(s.winner === 0 ? this.prize.win : this.prize.lose, g, this.game.logicHost);
      this.game.emit('message', { text: s.winner === 0 ? `You win: ${this.prize.label}.` : `${this.npc!.def.name} wins: ${this.prize.label}.` });
      this.game.quests.update();
    } else if (s.winner === 0) { g.pc.inventory.tolls += pot; this.game.emit('message', { text: `You win ${pot} Tolls.` }); }
    else { this.npc!.combatant.inv.tolls += pot; this.game.emit('message', { text: `${this.npc!.def.name} takes the pot.` }); }
    (g.flags.dust_games as number | undefined) === undefined ? (g.flags.dust_games = 1) : ((g.flags.dust_games as number) += 1);
    if (s.winner === 0) g.flags.dust_wins = ((g.flags.dust_wins as number | undefined) ?? 0) + 1;
  }

  private async opponentTurn(): Promise<void> {
    const s = this.s!;
    this.busy = true;
    // Play the opponent's rolls one at a time so the table reads.
    while (aiStep(s, this.game.rng) !== 'none') {
      this.render();
      await new Promise((r) => setTimeout(r, 650));
    }
    this.busy = false;
    this.render();
  }

  private render(): void {
    if (!this.el || !this.s) return;
    const s = this.s, [you, them] = s.players;
    const faces = s.rolls.map((f) => `<span class="die">${'⚀⚁⚂⚃⚄⚅'[f - 1]}</span>`).join('');
    this.el.innerHTML = `<div class="nb dust"><div class="nb-top"><b>Dust</b> <span class="dim">first to ${s.target} · ${this.prize ? esc(this.prize.label) : `${s.stake * 2} Tolls`} on the table</span></div>
      <div class="nb-body one"><div class="col a">
        <div class="kv"><span>${esc(you.name)}</span><span>${you.score}</span><span></span><span>${esc(them.name)}</span><span>${them.score}</span><span></span></div>
        <h4>${s.winner !== undefined ? `${esc(s.players[s.winner].name)} wins` : s.turn === 0 ? 'Your run' : `${esc(them.name)}'s run`} · ${s.run}</h4>
        <div class="dice">${faces || '<span class="dim">—</span>'}</div>
        <div class="acts">${s.winner === undefined && s.turn === 0 && !this.busy ? `<button data-a="roll">Roll</button><button data-a="bank" ${s.run ? '' : 'disabled'}>Bank ${s.run || ''}</button>` : ''}
          ${s.winner !== undefined ? '<button data-a="done">Leave the table</button>' : ''}</div>
        <div class="log">${s.log.slice(-8).map((l) => `<p class="log">${esc(l)}</p>`).join('')}</div>
      </div></div></div>`;
    this.el.querySelector('[data-a=roll]')?.addEventListener('click', () => {
      roll(s, this.game.rng);
      this.render();
      if (s.turn === 1 && s.winner === undefined) void this.opponentTurn();
    });
    this.el.querySelector('[data-a=bank]')?.addEventListener('click', () => {
      bank(s);
      this.render();
      if (s.turn === 1 && s.winner === undefined) void this.opponentTurn();
    });
    this.el.querySelector('[data-a=done]')?.addEventListener('click', () => { this.finish(); this.close(); });
  }
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
