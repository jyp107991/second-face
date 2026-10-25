import './engine/ui/style.css';
import { Game } from './engine/game';
import { Hud } from './engine/ui/hud';
import { DevOverlay } from './engine/dev/overlay';
import { Menu } from './engine/ui/menu';
import { Creator } from './engine/ui/creator';
import { CombatHud } from './engine/ui/combatHud';
import { Wristlog } from './engine/ui/wristlog';
import { Transfer } from './engine/ui/transfer';
import { PortraitStage } from './engine/render/portrait';
import { lookFrom } from './engine/assets/humanoid';
import { agedAppearance, defaultAppearance, randomAppearance } from './engine/data/appearance';

const app = document.getElementById('app')!;
const game = new Game(app);
const hud = new Hud(game);
const menu = new Menu(game);
hud.onMenu = () => menu.open('pause');
const wrist = new Wristlog(game);
hud.onWrist = () => wrist.toggle();
new Transfer(game);
const chud = new CombatHud(game);
chud.onLoad = async () => { const l = await game.saves?.latest(); if (l) await game.loadSlot(l.slot); else menu.open('title'); };
chud.onTitle = () => menu.open('title');
menu.onNewGame = () => {
  new Creator(game, (r) => {
    game.newGame(r.sheet, r.appearance, r.pronouns);
  }, () => menu.open('title'));
};
const dev = import.meta.env.DEV || new URLSearchParams(location.search).has('dev');
if (dev) {
  new DevOverlay(game);
  // Dev helpers for the browser console / automated screenshots.
  (window as unknown as Record<string, unknown>).SF = { PortraitStage, lookFrom, randomAppearance, agedAppearance, defaultAppearance };
}
game.loadLocation(game.state.locationId, 'start');
game.start();
menu.open('title');

// Expose for debugging in the browser console.
(window as unknown as { game: Game }).game = game;
