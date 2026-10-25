import './engine/ui/style.css';
import { Game } from './engine/game';
import { Hud } from './engine/ui/hud';
import { DevOverlay } from './engine/dev/overlay';

const app = document.getElementById('app')!;
const game = new Game(app);
new Hud(game);
const dev = import.meta.env.DEV || new URLSearchParams(location.search).has('dev');
if (dev) new DevOverlay(game);
game.loadLocation(game.state.locationId, 'start');
game.start();

// Expose for debugging in the browser console.
(window as unknown as { game: Game }).game = game;
