import type { Game } from '../game';
import { clockString } from '../core/state';

/** Minimal exploration HUD: location, clock, touch camera buttons. */
export class Hud {
  readonly el: HTMLElement;
  private info: HTMLElement;
  private toastEl: HTMLElement;
  private toastTimer?: number;
  onMenu?: () => void;

  constructor(game: Game) {
    this.el = document.createElement('div');
    this.el.className = 'hud';
    this.el.innerHTML = `
      <div class="hud-top"><div class="loc"></div><div class="clock"></div></div>
      <div class="toast" style="opacity:0"></div>
      <div class="hud-buttons">
        <button class="btn" data-a="rotL" aria-label="Rotate left">⟲</button>
        <button class="btn" data-a="centre" aria-label="Centre camera">◎</button>
        <button class="btn" data-a="rotR" aria-label="Rotate right">⟳</button>
        <button class="btn" data-a="run" aria-label="Toggle run">RUN</button>
        <button class="btn" data-a="menu" aria-label="Menu">☰</button>
      </div>`;
    document.body.appendChild(this.el);
    this.info = this.el.querySelector('.hud-top')!;
    this.toastEl = this.el.querySelector('.toast')!;
    this.el.querySelector('.hud-buttons')!.addEventListener('click', (e) => {
      const a = (e.target as HTMLElement).closest('button')?.dataset.a;
      if (a === 'rotL') game.cam.rotateStep(-1);
      if (a === 'rotR') game.cam.rotateStep(1);
      if (a === 'centre') game.cam.recentre();
      if (a === 'menu') this.onMenu?.();
      if (a === 'run' && game.player) {
        game.player.running = !game.player.running;
        (e.target as HTMLElement).classList.toggle('on', game.player.running);
      }
    });
    game.on('locationChanged', ({ name }) => { (this.info.querySelector('.loc') as HTMLElement).textContent = name; });
    game.on('message', ({ text }) => this.toast(text));
    let acc = 0;
    game.on('tick', ({ dt }) => {
      acc += dt;
      if (acc < 0.25) return;
      acc = 0;
      (this.info.querySelector('.clock') as HTMLElement).textContent = clockString(game.state.minutes);
    });
  }

  toast(text: string, ms = 2500): void {
    this.toastEl.textContent = text;
    this.toastEl.style.opacity = '1';
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => (this.toastEl.style.opacity = '0'), ms);
  }
}
