import { openSites, sitePlacement } from './engine/world/sites';
import { ways } from './engine/world/ways';
import { heightAt } from './engine/world/height';
import { addItem, equip, makeItem, unequip } from './engine/inventory/inventory';
import { wardrobeOutfit } from './engine/inventory/wardrobe';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/special-elite/400.css';
import './engine/ui/style.css';
import { Game } from './engine/game';
import { Hud } from './engine/ui/hud';
import { DevOverlay } from './engine/dev/overlay';
import { Menu } from './engine/ui/menu';
import { Creator } from './engine/ui/creator';
import { MAPS, WORLD_MAP } from './content';
import { CombatHud } from './engine/ui/combatHud';
import { Notebook } from './engine/ui/notebook';
import { Transfer } from './engine/ui/transfer';
import { PortraitStage } from './engine/render/portrait';
import { DialogueUi } from './engine/ui/dialogue';
import { BarterUi } from './engine/ui/barter';
import { SurgeryUi } from './engine/ui/surgery';
import { CampUi } from './engine/ui/camp';
import { DustUi } from './engine/ui/dust';
import { WorldMapUi } from './engine/ui/worldmap';
import { applySettings } from './engine/ui/settings';
import { Humanoid, lookFrom, outfitProxyKeys } from './engine/assets/humanoid';
import { skinSamples } from './engine/assets/human/skin';
import { skinAlbedo } from './engine/data/ancestry';
import { agedAppearance, defaultAppearance, randomAppearance } from './engine/data/appearance';
import { loadHumanData } from './engine/assets/human/data';
import { loadMotion, motionReady, motionClipNames, motionClip } from './engine/assets/human/motion';
import { preloadHumanTextures } from './engine/assets/human/textures';
import { PLAYER_OUTFIT } from './engine/game';
import { HumanFigure } from './engine/assets/human/figure';
import { evaluateShape } from './engine/assets/human/shape';
import { humanData, ensureProxies } from './engine/assets/human/data';
import { dressFor, roleLook } from './engine/data/outfits';
import * as THREE from 'three';

const t0 = performance.now();
const app = document.getElementById('app')!;
// Human assets (~8 MB) must be loaded before any character is built.
const loading = document.createElement('div');
loading.className = 'loading';
loading.textContent = 'LOADING…';
document.body.appendChild(loading);
await loadHumanData();
await preloadHumanTextures();
// Captured motion arrives behind the figures; they move procedurally until it does.
void loadMotion().catch((e) => console.warn(e));
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
new SurgeryUi(game);
new CampUi(game);
new DustUi(game);
new WorldMapUi(game);
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
  (window as unknown as Record<string, unknown>).SF = { PortraitStage, lookFrom, randomAppearance, agedAppearance, defaultAppearance, PLAYER_OUTFIT, HumanFigure, Humanoid, THREE, evaluateShape, humanData, ensureProxies, outfitProxyKeys, dressFor, roleLook, skinSamples, skinAlbedo, addItem, makeItem, equip, unequip, wardrobeOutfit , WORLD_MAP, MAPS, sitePlacement, openSites, ways, heightAt, motionReady, motionClipNames, motionClip };
}
await game.loadLocation(game.state.locationId, 'start');
game.loadMs = performance.now() - t0;
game.start();
menu.open('title');

// Expose for debugging in the browser console.
(window as unknown as { game: Game }).game = game;
