import './engine/ui/style.css';
import { Game } from './engine/game';
import { Hud } from './engine/ui/hud';
import { DevOverlay } from './engine/dev/overlay';
import { Menu } from './engine/ui/menu';
import { PortraitStage } from './engine/render/portrait';
import { lookFrom } from './engine/assets/humanoid';
import { agedAppearance, defaultAppearance, randomAppearance } from './engine/data/appearance';

const app = document.getElementById('app')!;
const game = new Game(app);
const hud = new Hud(game);
const menu = new Menu(game);
hud.onMenu = () => menu.open('pause');
// New Game: character creation goes here (M1); for now start in the test yard.
menu.onNewGame = () => game.loadLocation('dev_yard', 'start');
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
