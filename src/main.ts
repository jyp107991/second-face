import '@fontsource/caveat/400.css';
import '@fontsource/caveat/600.css';
import './engine/ui/style.css';
import { Game } from './engine/game';
import { Hud } from './engine/ui/hud';
import { DevOverlay } from './engine/dev/overlay';
import { Menu } from './engine/ui/menu';
import { Creator } from './engine/ui/creator';
import { CombatHud } from './engine/ui/combatHud';
import { Notebook } from './engine/ui/notebook';
import { Transfer } from './engine/ui/transfer';
import { PortraitStage } from './engine/render/portrait';
import { DialogueUi } from './engine/ui/dialogue';
import { BarterUi } from './engine/ui/barter';
import { CampUi } from './engine/ui/camp';
import { DustUi } from './engine/ui/dust';
import { applySettings } from './engine/ui/settings';
import { lookFrom, outfitProxyKeys } from './engine/assets/humanoid';
import { agedAppearance, defaultAppearance, randomAppearance } from './engine/data/appearance';
import { loadHumanData } from './engine/assets/human/data';
import { preloadHumanTextures } from './engine/assets/human/textures';
import { PLAYER_OUTFIT } from './engine/game';
import { HumanFigure } from './engine/assets/human/figure';
import { evaluateShape } from './engine/assets/human/shape';
import { humanData, ensureProxies } from './engine/assets/human/data';
import { dressFor, roleLook } from './engine/data/outfits';
import * as THREE from 'three';

const app = document.getElementById('app')!;
// Human assets (~8 MB) must be loaded before any character is built.
const loading = document.createElement('div');
loading.className = 'loading';
loading.textContent = 'LOADING…';
document.body.appendChild(loading);
await loadHumanData();
await preloadHumanTextures();
loading.remove();

const game = new Game(app);
const hud = new Hud(game);
const menu = new Menu(game);
hud.onMenu = () => menu.open('pause');
const wrist = new Notebook(game);
hud.onWrist = () => wrist.toggle();
new Transfer(game);
new DialogueUi(game);
new BarterUi(game);
new CampUi(game);
new DustUi(game);
applySettings();
const chud = new CombatHud(game);
chud.onLoad = async () => { const l = await game.saves?.latest(); if (l) await game.loadSlot(l.slot); else menu.open('title'); };
chud.onTitle = () => menu.open('title');
menu.onNewGame = () => {
  new Creator(game, (r) => {
    game.newGame(r.sheet, r.appearance, r.pronouns, r.origin);
  }, () => menu.open('title'));
};
const dev = import.meta.env.DEV || new URLSearchParams(location.search).has('dev');
if (dev) {
  new DevOverlay(game);
  // Dev helpers for the browser console / automated screenshots.
  (window as unknown as Record<string, unknown>).SF = { PortraitStage, lookFrom, randomAppearance, agedAppearance, defaultAppearance, PLAYER_OUTFIT, HumanFigure, THREE, evaluateShape, humanData, ensureProxies, outfitProxyKeys, dressFor, roleLook };
}
await game.loadLocation(game.state.locationId, 'start');
game.start();
menu.open('title');

// Expose for debugging in the browser console.
(window as unknown as { game: Game }).game = game;
